// A scripted player, used to measure pacing and to prove every quest can be finished. It plays the real simulation:
// it builds the production chains the quests ask for, joins them with roads, upgrades, buys districts and picks paths.
// It is competent but not clever, and it acts instantly, so a human takes longer. Used by pacing.test.ts and tools.
import {
  DISTRICTS,
  DISTRICT_ORDER,
  GOOD_LIST,
  PATH_ORDER,
  SITE_DEFS,
  TIERS,
  VEHICLE_DEFS,
  VEHICLE_ORDER,
  type Good,
  type PathId,
  type QuestGoal,
  type SiteKind,
} from './defs';
import { questState } from './quests';
import { buildDistrict, choosePath, districtCost, districtError, districtLevel, districtSatisfaction, pathError } from './town';
import {
  addVehicle,
  createAirRoute,
  createRoute,
  createWorld,
  ensureStations,
  findPath,
  placeError,
  placeSite,
  plotTiles,
  produces,
  step,
  tradeUp,
  tradeUpError,
  upgradeError,
  upgradeSite,
  wrapDx,
  wrapX,
  type Place,
  type Site,
  type World,
} from './world';

export interface BotNote {
  tick: number;
  text: string;
}

export interface BotResult {
  world: World;
  notes: BotNote[];
  /** Tick at which each tier was reached, and each town level first reached by any town. */
  tierAt: number[];
  levelAt: number[];
  seed: number;
  /** Milliseconds spent stepping the sim and deciding what to do, for finding slow spots. */
  stepMs: number;
  decideMs: number;
}

const DECIDE_EVERY = 100;

export function playBot(seed: number, ticks: number, onNote?: (n: BotNote) => void): BotResult {
  const w = createWorld(seed);
  const notes: BotNote[] = [];
  const note = (text: string): void => {
    const n = { tick: w.tick, text };
    notes.push(n);
    onNote?.(n);
  };
  const tierAt: number[] = [0];
  const levelAt: number[] = [0, 0];
  const d2 = (a: { x: number; y: number }, b: { x: number; y: number }): number => wrapDx(w, a.x, b.x) ** 2 + (a.y - b.y) ** 2;
  const home: Place = w.places[0];
  const failed = new Set<string>();
  const tried = new Map<string, number>();

  // ---- finding places ----
  const lotFor = (kind: SiteKind, town: Place): { x: number; y: number } | null => {
    for (const t of plotTiles(town.x, town.y, town.radius ?? 3)) {
      const x = wrapX(w, t.x);
      if (placeError(w, kind, x, t.y) === null) return { x, y: t.y };
    }
    return null;
  };
  const nodeFor = (kind: SiteKind, near: Place): { x: number; y: number } | null => {
    const nk = SITE_DEFS[kind].node;
    const nodes = w.nodes.filter((n) => n.kind === nk).sort((a, b) => d2(a, near) - d2(b, near));
    for (const n of nodes) if (placeError(w, kind, n.x, n.y) === null) return { x: n.x, y: n.y };
    return null;
  };
  const openFor = (kind: SiteKind, near: Place): { x: number; y: number } | null => {
    for (let r = 5; r < 14; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = wrapX(w, near.x + dx);
          const y = near.y + dy;
          if (placeError(w, kind, x, y) === null) return { x, y };
        }
      }
    }
    return null;
  };
  const spotFor = (kind: SiteKind, town: Place): { x: number; y: number } | null => {
    const def = SITE_DEFS[kind];
    if (def.inTown) return lotFor(kind, town);
    if (def.node) return nodeFor(kind, town);
    return openFor(kind, town);
  };

  const inTownOf = (s: Site, town: Place): boolean => plotTiles(town.x, town.y, town.radius ?? 3).some((t) => wrapX(w, t.x) === s.x && t.y === s.y);
  const routeBetween = (a: Site, b: Site, mode = 'road'): boolean =>
    w.routes.some((r) => r.mode === mode && ((r.fromSiteId === a.id && r.toSiteId === b.id) || (r.fromSiteId === b.id && r.toSiteId === a.id)));

  // ---- chains: build whatever makes a good, and what that needs ----
  const producerKind = (g: Good): SiteKind | null => {
    const kinds = (Object.keys(SITE_DEFS) as SiteKind[]).filter((k) => !SITE_DEFS[k].dock && !SITE_DEFS[k].station);
    return (
      kinds.find((k) => SITE_DEFS[k].produce?.good === g) ??
      kinds.find((k) => Object.keys(SITE_DEFS[k].recipe?.outputs ?? {})[0] === g) ??
      kinds.find((k) => g in (SITE_DEFS[k].recipe?.outputs ?? {})) ??
      null
    );
  };
  const siteFor = (g: Good, town: Place): Site | undefined =>
    w.sites.filter((s) => produces(s).includes(g) && !SITE_DEFS[s.kind].hub && !SITE_DEFS[s.kind].dock && !SITE_DEFS[s.kind].station).sort((a, b) => d2(a, town) - d2(b, town))[0];

  /** One step towards a complete chain for `g` serving `town`. */
  const chainStep = (g: Good, town: Place): 'done' | 'built' | 'wait' | 'fail' => {
    let site = siteFor(g, town);
    const kind = producerKind(g);
    if (!kind) return 'fail';
    const def = SITE_DEFS[kind];
    // A town's own factories stand in that town or one right beside it. Raw producers are shared: any existing one will do.
    if (def.inTown) site = w.sites.find((s) => s.kind === kind && d2(s, town) <= 14 * 14);
    if (!site) {
      const inputs = Object.keys(def.recipe?.inputs ?? {}) as Good[];
      for (const i of inputs) {
        const r = chainStep(i, town);
        if (r !== 'done') return r;
      }
      if (def.tier > w.tier) return 'wait';
      // A full town sends the factory to a neighbour.
      let spot = spotFor(kind, town);
      if (!spot && def.inTown) {
        for (const other of [...w.places].sort((a, b) => d2(a, town) - d2(b, town)).slice(1, 4)) {
          if (d2(other, town) > 14 * 14) break;
          spot = lotFor(kind, other);
          if (spot) break;
        }
      }
      if (!spot) return 'fail';
      if (w.money < def.cost + 60) return 'wait';
      if (placeSite(w, kind, spot.x, spot.y)) return 'fail';
      note(`built ${def.label}`);
      return 'built';
    }
    for (const i of Object.keys(SITE_DEFS[site.kind].recipe?.inputs ?? {}) as Good[]) {
      const src = siteFor(i, town);
      if (!src) return 'fail';
      if (w.places.some((p) => inTownOf(src, p) && inTownOf(site!, p))) continue;
      if (routeBetween(src, site)) continue;
      const path = findPath(w, src, site, 120000, 'road');
      if (!path) return 'fail';
      const cost = 400 + path.length * 8;
      if (w.money < cost) return 'wait';
      const err = createRoute(w, path, 'road', 'street');
      if (err) return err.startsWith('Need') ? 'wait' : 'fail';
      note(`road ${src.name} to ${site.name}`);
      return 'built';
    }
    return 'done';
  };

  /** Run a chain to completion for a town. Returns whether it is complete. */
  const chain = (g: Good, town: Place): boolean => {
    const key = `${g}@${town.id}`;
    if (failed.has(key)) return false;
    const r = chainStep(g, town);
    if (r === 'fail') {
      const n = (tried.get(key) ?? 0) + 1;
      tried.set(key, n);
      if (n > 6) {
        failed.add(key);
        note(`gave up on ${g} for ${town.name}`);
      }
    }
    return r === 'done';
  };

  // ---- spending the surplus ----
  const upgradeSomething = (): boolean => {
    const cands = w.sites.filter((s) => !SITE_DEFS[s.kind].dock && !SITE_DEFS[s.kind].station && upgradeError(w, s.id) === null);
    cands.sort((a, b) => SITE_DEFS[a.kind].cost * a.level - SITE_DEFS[b.kind].cost * b.level);
    for (const s of cands) {
      if (s.stock && Object.values(s.stock).every((n) => (n ?? 0) < 1) && !SITE_DEFS[s.kind].produce) continue;
      if (upgradeSite(w, s.id) === null) {
        note(`upgraded ${s.name} to level ${s.level}`);
        return true;
      }
    }
    return false;
  };

  const districtSomething = (reserve: number): boolean => {
    let best: { place: Place; id: (typeof DISTRICT_ORDER)[number]; score: number } | null = null;
    for (const p of w.places) {
      for (const id of DISTRICT_ORDER) {
        if (districtError(w, p, id) !== null) continue;
        const def = DISTRICTS[id];
        if (def.path && def.path !== p.path) continue;
        const cost = districtCost(p, id);
        if (w.money - cost < reserve) continue;
        const sat = def.goods.length === 0 ? 0.5 : districtSatisfaction(w, p, id);
        // Revenue per dollar, and a taste for districts that match what the town is already stocked with.
        const score = ((def.revenue * (0.3 + sat) * (def.affinity === p.path ? 1.5 : 1)) + 4) / cost;
        if (!best || score > best.score) best = { place: p, id, score };
      }
    }
    if (!best) return false;
    if (buildDistrict(w, best.place, best.id) === null) {
      note(`${best.place.name}: ${DISTRICTS[best.id].label} level ${districtLevel(best.place, best.id)}`);
      return true;
    }
    return false;
  };

  const pickPaths = (): void => {
    const used = new Set(w.places.map((p) => p.path).filter(Boolean) as PathId[]);
    for (const p of [...w.places].sort((a, b) => b.level - a.level)) {
      if (p.path || pathError(w, p, 'forge') !== null) continue;
      const free = PATH_ORDER.filter((x) => !used.has(x));
      const path = (free.length ? free : PATH_ORDER)[0];
      if (choosePath(w, p, path) === null) {
        used.add(path);
        note(`${p.name} became ${path}`);
      }
    }
  };

  const vehicleSomething = (): boolean => {
    // Like a player, only trade up where goods are piling up waiting for a bigger vehicle.
    const pressure = (r: (typeof w.routes)[number]): number => {
      let m = 0;
      for (const id of [r.fromSiteId, r.toSiteId]) {
        const site = w.sites.find((x) => x.id === id)!;
        for (const g of produces(site)) m = Math.max(m, (site.stock[g] ?? 0) / SITE_DEFS[site.kind].cap);
      }
      return m;
    };
    const route = w.routes.find((r) => pressure(r) > 0.6 && tradeUpError(w, r.id) === null);
    if (route && tradeUp(w, route.id) === null) {
      note('traded a vehicle up');
      return true;
    }
    return false;
  };

  // ---- quests that ask for something specific ----
  const doQuest = (goal: QuestGoal): void => {
    switch (goal.kind) {
      case 'build': {
        const def = SITE_DEFS[goal.site];
        const s = spotFor(goal.site, home);
        if (s && w.money >= def.cost + 100 && def.tier <= w.tier && placeSite(w, goal.site, s.x, s.y) === null) note(`built ${def.label}`);
        break;
      }
      case 'route': {
        if (goal.mode === 'road') {
          const camp = siteFor('logs', home);
          const mill = w.sites.find((s) => s.kind === 'sawmill');
          if (camp && mill) {
            const path = w.money > 1500 ? findPath(w, camp, mill, 120000, 'road') : null;
            if (path && createRoute(w, path, 'road', goal.grade ?? 'street') === null) note(`built a ${goal.grade ?? 'street'} route`);
          }
        } else if (goal.mode === 'rail') {
          ensureStations(w);
          const station = w.sites.find((s) => s.kind === 'station' && s.placeId === home.id);
          const src = w.sites.find((s) => s.kind === 'farm');
          if (station && src && !routeBetween(src, station, 'rail')) {
            const path = w.money > 4000 ? findPath(w, src, station, 120000, 'rail') : null;
            if (path && createRoute(w, path, 'rail') === null) note('laid a rail line');
          }
        } else {
          const airports = w.sites.filter((s) => s.kind === 'airport');
          for (const t of [home, w.places[1], w.places[2]]) {
            if (airports.length >= 2 || !t) continue;
            const spot = openFor('airport', t);
            if (spot && w.money > 4500) placeSite(w, 'airport', spot.x, spot.y);
          }
          const now = w.sites.filter((s) => s.kind === 'airport');
          if (now.length >= 2 && w.money > 12000 && createAirRoute(w, now[0].id, now[1].id) === null) note('opened an air route');
        }
        break;
      }
      case 'vehicle': {
        const def = VEHICLE_DEFS[goal.vehicle];
        // Walk the ladder up to the wanted class on some route of the right mode.
        const route = w.routes.find((r) => r.mode === def.mode && (r.mode !== 'road' || r.grade !== undefined));
        if (route && def.tier <= w.tier) {
          if (w.vehicles.some((v) => v.routeId === route.id && v.kind === goal.vehicle)) break;
          if (tradeUp(w, route.id) === null) note('traded a vehicle up');
          else if (w.money > def.cost * 2 && addVehicle(w, route.id, goal.vehicle) === null) note(`bought a ${def.label}`);
        }
        break;
      }
      case 'deliver':
      case 'make':
        chain(goal.good, home);
        break;
      case 'variety':
        for (const g of ['lumber', 'bread', 'cheese', 'jam'] as Good[]) chain(g, home);
        break;
      case 'upgrade':
        upgradeSomething();
        break;
      default:
        break;
    }
  };

  // ---- the decision loop ----
  const baseGoods: Good[] = ['lumber', 'bread', 'cheese'];
  const extraGoods: Good[] = ['jam', 'pellets', 'furniture', 'bricks', 'paper', 'tools', 'clothes', 'glass', 'books'];
  let lastTier = 0;
  let stepMs = 0;
  let decideMs = 0;
  for (let t = 0; t < ticks; t++) {
    const s0 = performance.now();
    step(w);
    stepMs += performance.now() - s0;
    if (w.tier !== lastTier) {
      tierAt[w.tier] = w.tick;
      lastTier = w.tier;
      note(`TIER ${w.tier}`);
    }
    const top = Math.max(...w.places.map((p) => p.level));
    for (let l = 2; l <= top; l++) if (levelAt[l] === undefined || levelAt[l] === 0) levelAt[l] = w.tick;
    if (w.tick % DECIDE_EVERY !== 0) continue;
    const d0 = performance.now();

    // One action per decision: about a casual human's pace. Quests first, then the base chains, then spending.
    const n0 = notes.length;
    const idle = (): boolean => notes.length === n0;
    const tier = TIERS[w.tier];
    if (tier) {
      for (const q of tier.quests) {
        if (!idle()) break;
        if (questState(w, tier, q).done) continue;
        doQuest(q.goal);
      }
    }
    // Three towns are developed side by side: the base chains everywhere first, then each extra good in turn.
    const towns = [home, ...w.places.slice(1, 3)];
    for (const g of baseGoods) for (const town of towns) if (idle()) chain(g, town);
    for (const g of extraGoods) {
      if (!(SITE_DEFS[producerKind(g)!]?.tier <= w.tier)) continue;
      for (const town of towns) if (idle()) chain(g, town);
    }
    if (idle()) pickPaths();
    if (idle()) districtSomething(400);
    if (idle() && w.money > 1500) upgradeSomething();
    if (idle() && w.money > 3000) vehicleSomething();
    if (idle() && w.money > 800) {
      for (const r of w.routes) {
        const from = w.sites.find((s) => s.id === r.fromSiteId)!;
        const full = Object.values(from.stock).some((n) => (n ?? 0) > SITE_DEFS[from.kind].cap * 0.8);
        const kind = r.mode === 'road' ? 'boxtruck' : r.mode === 'rail' ? 'train' : 'plane';
        if (full && r.grade !== undefined && w.vehicles.filter((v) => v.routeId === r.id).length < 4 && addVehicle(w, r.id, kind) === null) {
          note(`added a ${kind}`);
          break;
        }
      }
    }
    decideMs += performance.now() - d0;
  }
  void GOOD_LIST;
  void VEHICLE_ORDER;
  return { world: w, notes, tierAt, levelAt, seed, stepMs, decideMs };
}
