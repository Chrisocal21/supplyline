// A scripted player, used to measure pacing and to prove every quest can be finished. It plays the real simulation:
// it builds the production chains the quests ask for, joins them with roads, upgrades, buys districts and picks paths.
// It is competent but not clever, and it acts instantly, so a human takes longer. Used by pacing.test.ts and tools.
import {
  DISTRICTS,
  DISTRICT_ORDER,
  MARKET_DEMAND,
  GOOD_LIST,
  PATH_ORDER,
  SITE_DEFS,
  TIERS,
  VEHICLE_DEFS,
  VEHICLE_ORDER,
  VEHICLE_REACH,
  DRIVER_REACH,
  type Good,
  type PathId,
  type QuestGoal,
  type SiteKind,
} from './defs';
import { questState } from './quests';
import { serviceError, serviceVehicle } from './drivers';
import { buildDistrict, choosePath, districtCost, districtError, districtLevel, districtSatisfaction, pathError } from './town';
import {
  buyOptions,
  buyVehicle,
  growTown,
  matsNeeded,
  readyToGrow,
  createAirRoute,
  createRoute,
  createWorld,
  findPath,
  placeError,
  placeSite,
  isRailHub,
  needsNode,
  yardSpot,
  plotTiles,
  produces,
  setMaking,
  setSendTo,
  sellTargets,
  siteById,
  step,
  supplies,
  upgradeError,
  upgradeSite,
  upgradeVehicle,
  upgradeVehicleError,
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

/**
 * The chores a player does by hand once a chain is built: switch every factory on, switch on every sale a road allows,
 * and buy a truck (or train, or plane) at the supplying end of any route that has none. Returns what it did.
 */
/** The smallest road vehicle the building can buy now whose rookie driver can still run a route this long. */
function roadKindFor(w: World, siteId: number, r: { path: { x: number; y: number }[]; grade?: string }): 'boxtruck' | 'bigtruck' | 'rig' | 'convoy' | null {
  const span = r.path.length * (r.grade === 'highway' ? 0.5 : 1);
  for (const k of ['boxtruck', 'bigtruck', 'rig', 'convoy'] as const) {
    if ((VEHICLE_REACH[k] ?? 0) * DRIVER_REACH[0] >= span && buyOptions(w, siteId).includes(k) && VEHICLE_DEFS[k].tier <= w.tier && (siteById(w, siteId)?.level ?? 1) >= VEHICLE_DEFS[k].needLevel) return k;
  }
  return null;
}

export function runChores(w: World): string[] {
  const did: string[] = [];
  for (const p of w.places) if (readyToGrow(p) && growTown(w, p.id) === null) did.push(`grew ${p.name}`);
  for (const site of w.sites) {
    if (SITE_DEFS[site.kind].recipe && !site.making) {
      setMaking(w, site.id, true);
      did.push(`switched on ${site.name}`);
    }
    for (const t of sellTargets(w, site)) {
      if (t.on) continue;
      setSendTo(w, site.id, t.site.id, true);
      did.push(`${site.name} sells to ${t.site.name}`);
    }
  }
  for (const r of w.routes) {
    if (r.free || w.vehicles.some((v) => v.routeId === r.id)) continue;
    const a = siteById(w, r.fromSiteId)!;
    const b = siteById(w, r.toSiteId)!;
    if (!supplies(w, a, b) && !supplies(w, b, a)) continue;
    const home = supplies(w, a, b) || !supplies(w, b, a) ? a : b;
    const kind = r.mode === 'rail' ? 'train' : r.mode === 'air' ? 'plane' : r.mode === 'road' ? roadKindFor(w, home.id, r) : 'boxtruck';
    if (!kind) continue;
    // One vehicle per building and mode to start with, like a careful player; more come from the full-store rule.
    if (w.vehicles.some((v) => v.homeId === home.id && VEHICLE_DEFS[v.kind].mode === r.mode)) continue;
    if (buyVehicle(w, home.id, kind) === null) did.push(`bought a ${VEHICLE_DEFS[kind].label} at ${home.name}`);
  }
  return did;
}

export type BotStyle = 'quest' | 'skilled';

export function playBot(seed: number, ticks: number, onNote?: (n: BotNote) => void, style: BotStyle = 'quest', start?: World): BotResult {
  const w = start ?? createWorld(seed);
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
    for (const t of plotTiles(w, town)) {
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
    if (needsNode(def)) return nodeFor(kind, town);
    return openFor(kind, town);
  };

  const inTownOf = (s: Site, town: Place): boolean => plotTiles(w, town).some((t) => wrapX(w, t.x) === s.x && t.y === s.y);
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
  const siteFor = (g: Good, town: Place, skip?: (s: Site) => boolean): Site | undefined =>
    // A site that makes the good as its main product is the source, before one that has it only as a by-product (a Coal Mine's stone).
    w.sites
      .filter((s) => produces(s).includes(g) && !SITE_DEFS[s.kind].hub && !SITE_DEFS[s.kind].dock && !SITE_DEFS[s.kind].station && !skip?.(s))
      .sort((a, b) => Number(produces(a)[0] !== g) - Number(produces(b)[0] !== g) || d2(a, town) - d2(b, town))[0];

  /** Sources with no usable road to a factory: the bot builds another source for it instead of trying again. */
  const badSrc = new Set<string>();
  /** One step towards a complete chain for `g` serving `town`. */
  const chainStep = (g: Good, town: Place): 'done' | 'built' | 'wait' | 'fail' => {
    let site = siteFor(g, town, (c) => badSrc.has(`${c.id}:${g}`));
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
      // Factories no longer have to stand on a town lot: a full town sends them to open ground beside it.
      if (!spot) spot = openFor(kind, town);
      if (!spot) return 'fail';
      if (w.money < def.cost + 60) return 'wait';
      if (placeSite(w, kind, spot.x, spot.y)) return 'fail';
      note(`built ${def.label}`);
      return 'built';
    }
    for (const i of Object.keys(SITE_DEFS[site.kind].recipe?.inputs ?? {}) as Good[]) {
      const src = siteFor(i, town, (c) => badSrc.has(`${c.id}:${i}`));
      if (!src) {
        // The factory stands but one of its inputs is not made yet (it was built for another chain): make it now.
        const r = chainStep(i, town);
        return r === 'done' ? 'built' : r;
      }
      if (w.places.some((p) => inTownOf(src, p) && inTownOf(site!, p))) continue;
      if (routeBetween(src, site)) continue;
      const path = findPath(w, src, site, 120000, 'road');
      // No road, or none a truck could run (too long): a player would build another source closer, so this one is set aside.
      if (!path || !roadKindFor(w, src.id, { path })) {
        badSrc.add(`${src.id}:${i}`);
        return 'fail';
      }
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
        // Not noted: giving up is not an action, and must not use up the turn.
        failed.add(key);
      }
    }
    return r === 'done';
  };

  /** One step towards getting a building material to a town's Supply Yard: make it, then a road from its maker to the yard. */
  const matFail = new Map<string, number>();
  const supplyYard = (g: Good, town: Place): void => {
    // Materials are worth another try after a while: a town gains lots and money as it grows.
    const key = `${g}@${town.id}`;
    if (w.tick - (matFail.get(key) ?? -Infinity) < 6000) return;
    const r = chainStep(g, town);
    if (r === 'fail') matFail.set(key, w.tick);
    if (r !== 'done') return;
    const yard = w.sites.find((x) => x.kind === 'freight' && x.placeId === town.id);
    const maker = siteFor(g, town);
    if (!yard || !maker) return;
    // A by-product has its own line: it needs a truck of its own once the road is there.
    if (produces(maker)[0] !== g && routeBetween(maker, yard) && !w.vehicles.some((v) => v.homeId === maker.id && v.line === 'by')) {
      if (buyVehicle(w, maker.id, 'boxtruck', 'by') === null) note(`bought a by-product truck at ${maker.name}`);
      return;
    }
    if (routeBetween(maker, yard)) return;
    if (w.places.some((p) => inTownOf(maker, p) && inTownOf(yard, p))) return;
    const path = findPath(w, maker, yard, 120000, 'road');
    if (!path || !roadKindFor(w, maker.id, { path }) || w.money < 400 + path.length * 8) return;
    if (createRoute(w, path, 'road', 'street') === null) note(`road ${maker.name} to ${yard.name}`);
  };

  /** A raw or finished good made outside a town needs a road to the town's Market (or Supply Yard) before anyone can sell it. */
  const roadToTown = (g: Good, town: Place, dockKind: 'market' | 'freight'): 'ok' | 'built' | 'wait' | 'fail' => {
    const dock = w.sites.find((x) => x.kind === dockKind && x.placeId === town.id);
    const maker = siteFor(g, town);
    if (!dock || !maker) return 'fail';
    if (routeBetween(maker, dock)) return 'ok';
    if (w.places.some((p) => inTownOf(maker, p) && inTownOf(dock, p))) return 'ok';
    const path = findPath(w, maker, dock, 120000, 'road');
    if (!path || !roadKindFor(w, maker.id, { path })) return 'fail';
    if (w.money < 400 + path.length * 8) return 'wait';
    return createRoute(w, path, 'road', 'street') === null ? 'built' : 'fail';
  };

  /**
   * A careful player: one home town at a time. Open its Supply Yard and Market, then make exactly what that Market buys and
   * road it in, build the level materials, grow, and only then turn to the next town. Money is kept in reserve, buildings are
   * upgraded only when they are selling, and trucks are only added where goods pile up.
   */
  const skilledTurn = (idle: () => boolean): void => {
    const reserve = Math.min(800, 150 + w.sites.length * 15);
    // A careful player keeps the fleet in repair: a worn truck is slow and carries less.
    for (const v of w.vehicles) if ((v.wear ?? 0) > 0.55 && serviceError(w, v.id) === null) serviceVehicle(w, v.id);
    const focus = w.places.filter((_p, i) => i === 0 || (w.places[i - 1].level >= 2 && (w.places[i - 1].stage ?? 2) >= 2)).slice(0, 4);
    for (const town of focus) {
      if (!idle()) return;
      if ((town.stage ?? 2) < 2) {
        supplyYard('lumber', town);
        // Nothing sells until the Market stands and a level 2 building needs Tier 1, so the starting money goes into more lumber:
        // a second and third Forestry Camp, each with its road to the mill. One camp feeds less than a third of a Sawmill.
        if (idle() && home === town) {
          const mill = w.sites.find((x) => x.kind === 'sawmill');
          const camps = w.sites.filter((x) => x.kind === 'forestry');
          if (mill && camps.length < 4 && w.money > reserve + 700) {
            const spot = nodeFor('forestry', town);
            if (spot && placeSite(w, 'forestry', spot.x, spot.y) === null) note('built Forestry Camp');
          }
          for (const c of camps) {
            if (!idle() || !mill || routeBetween(c, mill)) continue;
            const path = findPath(w, c, mill, 120000, 'road');
            if (path && roadKindFor(w, c.id, { path }) && w.money > 400 + path.length * 8 && createRoute(w, path, 'road', 'street') === null) note(`road ${c.name} to ${mill.name}`);
          }
        }
        continue;
      }
      // What this town's Market pays for, cheapest chains first.
      const wanted = [...(MARKET_DEMAND[town.level - 1] ?? [])].filter((g) => (SITE_DEFS[producerKind(g) ?? 'farm'].tier <= w.tier));
      wanted.sort((a, b) => (SITE_DEFS[producerKind(a)!]?.cost ?? 9e9) - (SITE_DEFS[producerKind(b)!]?.cost ?? 9e9));
      let working = 0;
      for (const g of wanted) {
        if (!idle()) return;
        if (w.money < reserve + 200) break;
        const maker = siteFor(g, town);
        if (maker && (maker.stall === 'input' || maker.stall === 'room') && (maker.run ?? 0) < 0.2 && w.tick - maker.id > 0 && working >= 3) continue;
        if (!chain(g, town)) continue;
        const r = roadToTown(g, town, 'market');
        if (r === 'built') {
          note(`road ${g} to ${town.name} Market`);
          return;
        }
        if (r === 'ok') working += 1;
      }
      for (const [g] of matsNeeded(town)) if (idle() && SITE_DEFS[producerKind(g) ?? 'farm'].tier <= w.tier) {
        supplyYard(g, town);
      }
      // Growth waits for materials; money goes into the town meanwhile.
      if (idle() && w.money > reserve + 600) districtSomething(reserve + 300);
    }
    if (idle()) pickPaths();
    if (idle() && w.money > reserve + 1200) {
      // Only a building that is selling and has its shelves full is worth a bigger model.
      const cands = w.sites.filter((x) => !SITE_DEFS[x.kind].dock && !SITE_DEFS[x.kind].station && (x.run ?? 0) > 0.7 && upgradeError(w, x.id) === null);
      const c = cands.sort((a, b) => SITE_DEFS[a.kind].cost * a.level - SITE_DEFS[b.kind].cost * b.level)[0];
      if (c && upgradeSite(w, c.id) === null) note(`upgraded ${c.name} to level ${c.level}`);
    }
    if (idle() && w.money > reserve + 600) {
      for (const r of w.routes) {
        const from = w.sites.find((x) => x.id === r.fromSiteId);
        if (!from || r.free) continue;
        const main = produces(from)[0];
        const full = !!main && (from.stock[main] ?? 0) > SITE_DEFS[from.kind].cap * 0.8;
        const kind = r.mode === 'road' ? roadKindFor(w, from.id, r) : r.mode === 'rail' ? 'train' : 'plane';
        if (kind && full && w.vehicles.filter((v) => v.routeId === r.id).length < 3 && buyVehicle(w, from.id, kind) === null) {
          note(`added a ${kind}`);
          break;
        }
      }
    }
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
    const pressure = (siteId: number): number => {
      const site = siteById(w, siteId)!;
      let m = 0;
      for (const g of produces(site)) m = Math.max(m, (site.stock[g] ?? 0) / SITE_DEFS[site.kind].cap);
      return m;
    };
    const v = w.vehicles.find((x) => pressure(x.homeId) > 0.6 && upgradeVehicleError(w, x.id) === null);
    if (v && upgradeVehicle(w, v.id) === null) {
      note('upgraded a vehicle');
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
      case 'depot': {
        const town = w.places[0];
        const spot = town ? yardSpot(w, town) : null;
        if (spot && placeSite(w, 'railyard', spot.x, spot.y) === null) note('built a Rail Yard');
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
          const depot = w.sites.find((s) => isRailHub(s));
          const src = w.sites.find((s) => s.kind === 'farm');
          if (depot && src && !routeBetween(src, depot, 'rail')) {
            const path = w.money > 4000 ? findPath(w, src, depot, 120000, 'rail') : null;
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
        if (def.tier > w.tier || w.vehicles.some((v) => v.kind === goal.vehicle)) break;
        // Walk the ladder up from a smaller vehicle of the same mode, or buy the entry class where the line starts.
        const lower = w.vehicles.filter((v) => VEHICLE_DEFS[v.kind].mode === def.mode && VEHICLE_ORDER.indexOf(v.kind) < VEHICLE_ORDER.indexOf(goal.vehicle));
        const up = lower.find((v) => upgradeVehicleError(w, v.id) === null);
        if (up) {
          if (upgradeVehicle(w, up.id) === null) note('upgraded a vehicle');
        } else if (lower.length === 0) {
          const entry = def.mode === 'rail' ? 'train' : def.mode === 'air' ? 'plane' : 'boxtruck';
          const at = w.sites.find((x) => buyOptions(w, x.id).includes(entry) && w.routes.some((r) => r.mode === def.mode && !r.free && (r.fromSiteId === x.id || r.toSiteId === x.id)));
          if (at && w.money > VEHICLE_DEFS[entry].cost * 2 && buyVehicle(w, at.id, entry) === null) note(`bought a ${VEHICLE_DEFS[entry].label}`);
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
    // Chores are routine and do not count as the one action of this turn.
    for (const t of runChores(w)) note(t);
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
    if (style === 'skilled') {
      skilledTurn(idle);
      decideMs += performance.now() - d0;
      continue;
    }
    // Three towns are developed side by side: the base chains everywhere first, then each extra good in turn.
    const towns = [home, ...w.places.slice(1, 3)];
    for (const g of baseGoods) for (const town of towns) if (idle()) chain(g, town);
    for (const g of extraGoods) {
      if (!(SITE_DEFS[producerKind(g)!]?.tier <= w.tier)) continue;
      for (const town of towns) if (idle()) chain(g, town);
    }
    // Each town's next level asks for building materials at its Supply Yard.
    for (const town of towns) {
      if ((town.stage ?? 2) < 2) continue;
      for (const [g] of matsNeeded(town)) if (idle() && SITE_DEFS[producerKind(g) ?? 'farm'].tier <= w.tier) supplyYard(g, town);
    }
    if (idle()) pickPaths();
    if (idle()) districtSomething(400);
    if (idle() && w.money > 1500) upgradeSomething();
    if (idle() && w.money > 3000) vehicleSomething();
    if (idle() && w.money > 800) {
      for (const r of w.routes) {
        const from = w.sites.find((s) => s.id === r.fromSiteId);
        if (!from) continue;
        // Only the main good: by-products have their own line and trucks, and pile up harmlessly without them.
        const main = produces(from)[0];
        const full = !!main && (from.stock[main] ?? 0) > SITE_DEFS[from.kind].cap * 0.8;
        const kind = r.mode === 'road' ? roadKindFor(w, from.id, r) : r.mode === 'rail' ? 'train' : 'plane';
        if (kind && full && !r.free && w.vehicles.filter((v) => v.routeId === r.id).length < 4 && buyVehicle(w, from.id, kind) === null) {
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
