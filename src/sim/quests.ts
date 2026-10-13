// Tier quests: how far along each one is, paying them out, and what the next tier unlocks.
// Progress is read straight from the world, so a quest can never fall out of step with what has really been built.
import {
  BUILD_ORDER,
  GOOD_LIST,
  HIGHWAY_TIER,
  MAX_LEVEL,
  RAIL_TIER,
  SITE_DEFS,
  SPAN_LIMIT,
  TIERS,
  VEHICLE_DEFS,
  VEHICLE_ORDER,
  type Quest,
  type QuestGoal,
  type TierDef,
} from './defs';
import { builtDistricts, pathsInUse } from './town';
import type { World } from './world';

export interface Progress {
  have: number;
  need: number;
  done: boolean;
}

export function questProgress(world: World, goal: QuestGoal): Progress {
  let have = 0;
  let need = 1;
  switch (goal.kind) {
    case 'build':
      have = world.sites.filter((s) => s.kind === goal.site).length;
      need = goal.count;
      break;
    case 'route':
      // Roads the player laid: the free street links inside a town have no grade and do not count.
      have = world.routes.filter((r) => r.mode === goal.mode && (r.mode !== 'road' || r.grade !== undefined) && (!goal.grade || r.grade === goal.grade)).length;
      need = goal.count;
      break;
    case 'vehicle':
      have = world.vehicles.filter((v) => v.kind === goal.vehicle).length;
      need = goal.count;
      break;
    case 'deliver':
      have = world.delivered[goal.good] ?? 0;
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
      have = world.earned;
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
    case 'paths':
      have = pathsInUse(world).size;
      need = goal.count;
      break;
    case 'capstone':
      have = world.places.reduce((n, p) => n + builtDistricts(p).filter((d) => d.def.capstone).length, 0);
      need = goal.count;
      break;
  }
  return { have: Math.min(Math.floor(have), need), need, done: have >= need };
}

/** Where a quest stands: finished ones stay finished, even if what earned them is later torn down. */
export function questState(world: World, tier: TierDef, q: Quest): Progress {
  if (tier.tier < world.tier || world.questsDone.includes(q.id)) {
    const need = questProgress(world, q.goal).need;
    return { have: need, need, done: true };
  }
  return questProgress(world, q.goal);
}

/** The first unfinished quest of the current tier, or null when every quest in the game is done. */
export function nextQuest(world: World): { quest: Quest; progress: Progress } | null {
  const tier = TIERS[world.tier];
  if (!tier) return null;
  for (const quest of tier.quests) {
    const progress = questState(world, tier, quest);
    if (!progress.done) return { quest, progress };
  }
  return null;
}

/** Pay out finished quests, and move up a tier once the current tier's list is complete. */
export function checkQuests(world: World, log: (text: string) => void): void {
  world.questsDone ??= [];
  for (;;) {
    const tier = TIERS[world.tier];
    if (!tier) return;
    let all = true;
    for (const q of tier.quests) {
      if (world.questsDone.includes(q.id)) continue;
      if (!questProgress(world, q.goal).done) {
        all = false;
        continue;
      }
      world.questsDone.push(q.id);
      world.money += q.reward;
      log(`Quest complete: ${q.label}${q.reward > 0 ? `  +$${q.reward.toLocaleString('en-US')}` : ''}`);
    }
    const next = TIERS[world.tier + 1];
    if (!all || !next) return;
    world.tier = next.tier;
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
  if (tier >= 1 && tier + 1 <= MAX_LEVEL) out.push(`Building level ${tier + 1}`);
  if (tier >= 1 && tier < SPAN_LIMIT.length) out.push(`Bridges and tunnels up to ${SPAN_LIMIT[tier]} tiles`);
  return out;
}
