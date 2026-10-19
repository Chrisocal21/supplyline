// Company skills: points earned by growing the company, spent on lasting perks. The way a trucking game lets you pick what
// your firm is good at. Each perk has three levels and costs a point a level.
import type { World } from './world';

export type PerkId = 'haggler' | 'thrift' | 'tough';

export interface PerkDef {
  id: PerkId;
  label: string;
  /** What one level gives, as a fraction. */
  per: number;
  /** One line for a level, for the skills panel. */
  blurb: string;
}

export const PERK_MAX = 3;

export const PERKS: PerkDef[] = [
  { id: 'haggler', label: 'Haggler', per: 0.04, blurb: 'Buyers pay 4% more for every sale' },
  { id: 'thrift', label: 'Thrifty fleet', per: 0.15, blurb: 'Vehicle upkeep costs 15% less' },
  { id: 'tough', label: 'Tough parts', per: 0.2, blurb: 'Vehicles wear 20% slower' },
];

export const perkLevel = (world: Pick<World, 'perks'>, id: PerkId): number => world.perks?.[id] ?? 0;

/** Points earned: one for each tier of the company reached, and one for every three quests done. */
export function skillPoints(world: Pick<World, 'tier' | 'questsDone'>): number {
  return world.tier + Math.floor((world.questsDone?.length ?? 0) / 3);
}

export function pointsSpent(world: Pick<World, 'perks'>): number {
  return Object.values(world.perks ?? {}).reduce((n, v) => n + v, 0);
}

export const pointsLeft = (world: Pick<World, 'perks' | 'tier' | 'questsDone'>): number => skillPoints(world) - pointsSpent(world);

export function perkError(world: World, id: PerkId): string | null {
  if (perkLevel(world, id) >= PERK_MAX) return 'Fully trained';
  return pointsLeft(world) < 1 ? 'No skill points left. Reach a new tier or finish quests' : null;
}

export function buyPerk(world: World, id: PerkId): string | null {
  const err = perkError(world, id);
  if (err) return err;
  world.perks = { ...(world.perks ?? {}), [id]: perkLevel(world, id) + 1 };
  return null;
}

const def = (id: PerkId): PerkDef => PERKS.find((p) => p.id === id)!;
/** What sales are multiplied by. */
export const saleMult = (world: Pick<World, 'perks'>): number => 1 + def('haggler').per * perkLevel(world, 'haggler');
/** What vehicle upkeep is multiplied by. */
export const upkeepMult = (world: Pick<World, 'perks'>): number => 1 - def('thrift').per * perkLevel(world, 'thrift');
/** What vehicle wear is multiplied by. */
export const wearMult = (world: Pick<World, 'perks'>): number => 1 - def('tough').per * perkLevel(world, 'tough');
