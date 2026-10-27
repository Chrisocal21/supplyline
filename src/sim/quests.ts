// Tier quests: how far along each one is, paying them out, and what the next tier unlocks.
// Progress is read straight from the world, so a quest can never fall out of step with what has really been built.
import {
  BUILD_LUMBER,
  LOGS_PER_LUMBER,
  BUILD_ORDER,
  FREE_FROM_TIER,
  GOOD_LIST,
  HIGHWAY_TIER,
  MAX_LEVEL,
  PATHS,
  PATH_ORDER,
  PATH_QUESTS,
  RAIL_TIER,
  SEA_TIER,
  AIR_TIER,
  SITE_DEFS,
  spanLimit,
  levelNeedsTier,
  TIERS,
  VEHICLE_DEFS,
  VEHICLE_ORDER,
  type Quest,
  type QuestGoal,
  type PathId,
  type TierDef,
} from './defs';
import { builtDistricts, pathsInUse } from './town';
import { LINES_BY_ID, ROUTE_LINES, type RouteLine } from './lines';
import { checkSide } from './side';
import { sellTargets, type World } from './world';

export interface Progress {
  have: number;
  need: number;
  done: boolean;
  /** Set when the goal is waiting on something the player must do, in a few words (the yard store is full and needs a truck). */
  waiting?: string;
  /** A second figure shown beside the count, such as the lumber that is only in the yard's store and not yet at the Market site. */
  detail?: string;
}

function soldTotal(world: World): number {
  return GOOD_LIST.reduce((n, g) => n + (world.delivered[g] ?? 0), 0);
}

/** Where the current tier began; set the first time it is looked at if the tier was reached some other way. */
function tierBase(world: World): { tier: number; earned: number; sold: number } {
  if (!world.tierBase || world.tierBase.tier !== world.tier) world.tierBase = { tier: world.tier, earned: world.earned, sold: soldTotal(world) };
  return world.tierBase;
}

export function questProgress(world: World, goal: QuestGoal): Progress {
  let have = 0;
  let need = 1;
  let waiting: string | undefined;
  let detail: string | undefined;
  switch (goal.kind) {
    case 'build':
      have = world.sites.filter((s) => s.kind === goal.site).length;
      need = goal.count;
      break;
    case 'route':
      // Roads the player laid, including ones that run from road to road: the free street links inside a town have no grade and do not count.
      have = world.routes.filter((r) => r.mode === goal.mode && (r.mode !== 'road' || r.grade !== undefined) && (!goal.grade || r.grade === goal.grade)).length;
      need = goal.count;
      break;
    case 'depot':
      have = world.sites.filter((q) => SITE_DEFS[q.kind].railyard).length;
      need = goal.count;
      break;
    case 'vehicle':
      have = world.vehicles.filter((v) => v.kind === goal.vehicle).length;
      need = goal.count;
      break;
    case 'fleet':
      have = world.vehicles.length;
      need = goal.count;
      break;
    case 'yardfleet':
      have = world.vehicles.filter((v) => world.sites.find((s) => s.id === v.homeId)?.kind === 'freight').length;
      need = goal.count;
      break;
    case 'making':
      have = world.sites.filter((s) => s.making).length;
      need = goal.count;
      break;
    case 'selling':
      have = world.sites.filter((s) => sellTargets(world, s).some((t) => t.on)).length;
      need = goal.count;
      break;
    case 'townbuilt':
      // One town is built when this reaches the full amount; until then show the lumber of the furthest-along town.
      if (world.places.some((p) => (p.stage ?? 2) >= goal.stage)) {
        have = need = BUILD_LUMBER[goal.stage - 1] * (world.tier < 1 ? LOGS_PER_LUMBER : 1);
      } else {
        const k = world.tier < 1 ? LOGS_PER_LUMBER : 1;
        need = BUILD_LUMBER[goal.stage - 1] * k;
        let best = -1;
        for (const p of world.places) {
          const stage = p.stage ?? 2;
          // What counts is what has reached the site: the yard's store is lumber on its way, shown beside it and not added to it.
          const got = stage === goal.stage - 1 ? (p.build ?? 0) * k : 0;
          let stored = 0;
          let yard: (typeof world.sites)[number] | undefined;
          if (goal.stage === 2 && stage === 1) {
            yard = world.sites.find((s) => s.placeId === p.id && SITE_DEFS[s.kind].dock === 'freight');
            stored = Math.floor((yard?.depot?.lumber ?? 0) + (yard?.depot?.logs ?? 0));
          }
          const score = Math.min(got, need - 1) + stored / 1000;
          if (score > best) {
            best = score;
            have = Math.min(got, need - 1);
            detail = stored > 0 ? `${stored} in yard` : undefined;
            waiting = undefined;
            // The yard store holds all the lumber the Market still needs: only a Supply Yard truck can carry it over.
            if (stage === 1 && yard && stored > 0 && got + stored >= need) {
              const trucks = world.vehicles.filter((v) => v.homeId === yard!.id).length;
              waiting = trucks === 0 ? 'Buy a yard truck' : 'Truck on its way';
            }
          }
        }
      }
      break;
    case 'deliver':
      have = world.delivered[goal.good] ?? 0;
      need = goal.amount;
      break;
    case 'sold':
      have = soldTotal(world) - (goal.tier === undefined ? 0 : goal.tier === world.tier ? tierBase(world).sold : soldTotal(world));
      need = goal.amount;
      break;
    case 'variety':
      have = GOOD_LIST.filter((g) => (world.delivered[g] ?? 0) > 0).length;
      need = goal.count;
      break;
    case 'make':
      have = world.produced[goal.good] ?? 0;
      need = goal.amount;
      break;
    case 'earn':
      have = world.earned - (goal.tier === undefined ? 0 : goal.tier === world.tier ? tierBase(world).earned : world.earned);
      need = goal.amount;
      break;
    case 'town':
      have = world.places.filter((p) => p.level >= goal.level).length;
      need = goal.count;
      break;
    case 'upgrade':
      have = world.sites.filter((s) => !SITE_DEFS[s.kind].dock && s.level >= goal.level).length;
      need = goal.count;
      break;
    case 'district':
      have = world.places.reduce((n, p) => n + builtDistricts(p).filter((d) => d.level >= goal.level).length, 0);
      need = goal.count;
      break;
    case 'path':
      have = world.places.filter((p) => p.path).length;
      need = goal.count;
      break;
    case 'mechanic':
      have = (world.mechanics ?? []).length;
      need = goal.count;
      break;
    case 'paths':
      have = pathsInUse(world).size;
      need = goal.count;
      break;
    case 'capstone':
      have = world.places.reduce((n, p) => n + builtDistricts(p).filter((d) => d.def.capstone).length, 0);
      need = goal.count;
      break;
    case 'pathtown':
      have = world.places.some((p) => p.path === goal.path && p.level >= goal.level) ? 1 : 0;
      break;
    case 'pathgoods': {
      const own = PATHS[goal.path].goods;
      const list = own.length ? own : GOOD_LIST;
      have = world.places.filter((p) => p.path === goal.path).reduce((n, p) => n + list.reduce((m, g) => m + (p.delivered[g] ?? 0), 0), 0);
      need = goal.amount;
      break;
    }
    case 'pathdistricts':
      have = world.places.filter((p) => p.path === goal.path).reduce((n, p) => n + builtDistricts(p).length, 0);
      need = goal.count;
      break;
    case 'pathcapstone':
      have = world.places.some((p) => p.path === goal.path && builtDistricts(p).some((d) => d.def.capstone)) ? 1 : 0;
      break;
  }
  return { have: Math.min(Math.floor(have), need), need, done: have >= need, ...(waiting ? { waiting } : {}), ...(detail ? { detail } : {}) };
}

/** Whether every quest on a path is done: the path is mastered. */
export function pathMastered(world: World, path: PathId): boolean {
  return PATH_QUESTS[path].every((q) => (world.pathDone ?? []).includes(q.id));
}

/** A path quest's state: finished ones stay finished. */
export function pathQuestState(world: World, q: Quest): Progress {
  if ((world.pathDone ?? []).includes(q.id)) {
    const need = questProgress(world, q.goal).need;
    return { have: need, need, done: true };
  }
  return questProgress(world, q.goal);
}

/** Pay out path quests for paths a town has taken, and mark a mastered path's towns. */
function checkPathQuests(world: World, log: (text: string) => void): void {
  world.pathDone ??= [];
  for (const path of PATH_ORDER) {
    if (!world.places.some((p) => p.path === path)) continue;
    for (const q of PATH_QUESTS[path]) {
      if (world.pathDone.includes(q.id) || !questProgress(world, q.goal).done) continue;
      world.pathDone.push(q.id);
      world.money += q.reward;
      log(`${PATHS[path].label} quest complete: ${q.label}  +$${q.reward.toLocaleString('en-US')}`);
      if (pathMastered(world, path)) log(`${PATHS[path].label} mastered: its towns pay 10% more for its goods`);
    }
    if (pathMastered(world, path)) for (const p of world.places) if (p.path === path) p.mastered = true;
  }
}

/** Where a quest stands: finished ones stay finished, even if what earned them is later torn down. */
export function questState(world: World, tier: TierDef, q: Quest): Progress {
  if (tier.tier < world.tier || world.questsDone.includes(q.id)) {
    const need = questProgress(world, q.goal).need;
    return { have: need, need, done: true };
  }
  return questProgress(world, q.goal);
}

/** How many of a tier's quests finish it: all of them in the guided tiers, a few of a menu after that. */
export function tierNeed(tier: TierDef): number {
  return Math.min(tier.quests.length, tier.need ?? tier.quests.length);
}


/** A route line's state: the lines the player started, the steps done, and the step it waits on. */
export function lineSteps(world: World, line: RouteLine): { done: number; next: Quest | null } {
  const done = world.questsDone ?? [];
  const next = line.steps.find((q) => !done.includes(q.id)) ?? null;
  return { done: line.steps.filter((q) => done.includes(q.id)).length, next };
}

/** The started lines, oldest first, with the finished ones last. */
export function startedLines(world: World): RouteLine[] {
  const out = (world.lines ?? []).map((id) => LINES_BY_ID[id]).filter((l): l is RouteLine => !!l);
  return [...out.filter((l) => lineSteps(world, l).next), ...out.filter((l) => !lineSteps(world, l).next)];
}

/** The started routes as a tree, like a research tree: a route sits under the one that opened it. */
export function routeTree(world: World): { line: RouteLine; depth: number }[] {
  const started = startedLines(world);
  const ids = new Set(started.map((l) => l.id));
  const out: { line: RouteLine; depth: number }[] = [];
  const seen = new Set<string>();
  const add = (l: RouteLine, depth: number): void => {
    if (seen.has(l.id)) return;
    seen.add(l.id);
    out.push({ line: l, depth });
    for (const id of l.opens ?? []) if (ids.has(id)) add(LINES_BY_ID[id], depth + 1);
  };
  const child = new Set(started.flatMap((l) => l.opens ?? []));
  for (const l of started) if (!child.has(l.id)) add(l, 0);
  for (const l of started) add(l, 0);
  return out;
}

/** The line the quest pill follows: the one the player picked, or else the oldest one still going. */
export function focusLine(world: World): RouteLine | null {
  const lines = startedLines(world).filter((l) => lineSteps(world, l).next);
  return lines.find((l) => l.id === world.focusLine) ?? lines[0] ?? null;
}

/** Whether a line step is waiting on a building that is not open yet, and the tier it opens at. */
export function stepOpensAt(world: World, q: Quest): number | null {
  if (q.goal.kind !== 'build') return null;
  const t = SITE_DEFS[q.goal.site].tier;
  return t > world.tier ? t : null;
}

/** Start a line when the first building of its chain stands, and pay each step as it is done. Lines wait for the free tiers. */
function checkLines(world: World, log: (text: string) => void): void {
  if (world.tier < FREE_FROM_TIER) return;
  world.lines ??= [];
  for (const line of ROUTE_LINES) {
    if (world.lines.includes(line.id) || !world.sites.some((s) => line.starts.includes(s.kind))) continue;
    world.lines.push(line.id);
    world.focusLine ??= line.id;
  }
  for (const line of startedLines(world)) {
    for (const q of line.steps) {
      if (world.questsDone.includes(q.id)) continue;
      if (!questProgress(world, q.goal).done) break;
      world.questsDone.push(q.id);
      world.money += q.reward;
      log(`${line.name}: ${q.label}  +${q.reward.toLocaleString('en-US')}`);
    }
    // A finished route opens its branches: the next lines of the story, started for the player.
    if (!lineSteps(world, line).next) {
      for (const id of line.opens ?? []) {
        if (world.lines.includes(id) || !LINES_BY_ID[id]) continue;
        world.lines.push(id);
      }
    }
  }
}

/** The first unfinished quest of the current tier, or null when every quest in the game is done. */
export function nextQuest(world: World): { quest: Quest; progress: Progress } | null {
  const tier = TIERS[world.tier];
  if (!tier) return null;
  // From the free tiers, the pill follows the route the player has taken; with none started, it points at the tier menu.
  const line = focusLine(world);
  const step = line ? lineSteps(world, line).next : null;
  if (step) {
    const opens = stepOpensAt(world, step);
    const progress = questProgress(world, step.goal);
    return { quest: step, progress: opens === null ? progress : { ...progress, waiting: `Opens at tier ${opens}` } };
  }
  for (const quest of tier.quests) {
    const progress = questState(world, tier, quest);
    if (!progress.done) return { quest, progress };
  }
  return null;
}

/** Pay out finished quests, and move up a tier once the current tier's list is complete. */
export function checkQuests(world: World, log: (text: string) => void): void {
  world.questsDone ??= [];
  checkPathQuests(world, log);
  checkLines(world, log);
  if (world.tier >= FREE_FROM_TIER) checkSide(world, log);
  for (;;) {
    const tier = TIERS[world.tier];
    if (!tier) return;
    let finished = 0;
    for (const q of tier.quests) {
      if (world.questsDone.includes(q.id)) {
        finished++;
        continue;
      }
      if (!questProgress(world, q.goal).done) continue;
      finished++;
      world.questsDone.push(q.id);
      world.money += q.reward;
      log(`Quest complete: ${q.label}${q.reward > 0 ? `  +$${q.reward.toLocaleString('en-US')}` : ''}`);
    }
    const next = TIERS[world.tier + 1];
    if (finished < tierNeed(tier) || !next) return;
    world.tier = next.tier;
    world.tierBase = { tier: next.tier, earned: world.earned, sold: soldTotal(world) };
    // From Tier 1 a closed town builds from lumber: logs already in a yard's store are sawn into it, so nothing is stranded.
    if (next.tier === 1) for (const s of world.sites) if (s.depot?.logs) {
      s.depot.lumber = (s.depot.lumber ?? 0) + s.depot.logs / LOGS_PER_LUMBER;
      delete s.depot.logs;
    }
    log(`Tier ${next.tier} unlocked: ${next.name}`);
  }
}

/** What reaching a tier unlocks, as short names for the quest sheet. */
export function tierUnlocks(tier: number): string[] {
  const out: string[] = [];
  for (const k of BUILD_ORDER) if (SITE_DEFS[k].tier === tier) out.push(SITE_DEFS[k].label);
  for (const k of VEHICLE_ORDER) if (VEHICLE_DEFS[k].tier === tier && VEHICLE_DEFS[k].implemented) out.push(VEHICLE_DEFS[k].label);
  if (tier === HIGHWAY_TIER) out.push('Highways');
  if (tier === RAIL_TIER) out.push('Rail lines');
  if (tier === SEA_TIER) out.push('Sea routes');
  if (tier === AIR_TIER) out.push('Air routes');
  for (let lv = 2; lv <= MAX_LEVEL; lv++) if (levelNeedsTier(lv - 1) === tier) out.push(`Building level ${lv}`);
  if (tier >= 1 && spanLimit(tier) > spanLimit(tier - 1)) out.push(`Bridges and tunnels up to ${spanLimit(tier)} tiles`);
  return out;
}
