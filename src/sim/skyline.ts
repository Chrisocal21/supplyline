// How tall a town or city is allowed to grow. Each town has a skyline: whether it stays low (and fills out instead), builds
// mid-rise, or climbs to towers. The choice is fixed by where the town stands and its style, so it never changes and is never
// saved. Heights are real metres (see docs/scale.md); the town model turns them into storeys.
import type { TownStyle } from './defs';
import { BUILDING_HEIGHT } from '../scale';

export type Skyline = 'low' | 'mid' | 'tall';

/** The tallest a building in the town's core may be at each town level (1 to 5), in metres. */
export const SKYLINE_CAP: Record<Skyline, number[]> = {
  /** A town that stays low: terraces and shopfront rows, and it fills out instead of rising. */
  low: [BUILDING_HEIGHT.cottage, 10, BUILDING_HEIGHT.terrace, 16, 20],
  /** Mid-rise: blocks of flats over shops, never a tower. */
  mid: [BUILDING_HEIGHT.cottage, BUILDING_HEIGHT.terrace, BUILDING_HEIGHT.lowBlock, 40, BUILDING_HEIGHT.midRise],
  /** A city with a skyline: mid-rise at level 4, towers at level 5. */
  tall: [BUILDING_HEIGHT.cottage, BUILDING_HEIGHT.terrace, BUILDING_HEIGHT.lowBlock, 70, BUILDING_HEIGHT.coreCap],
};

/** Share of major cities that build a real skyline, by style: the rest stay mid-rise. */
const TALL_SHARE: Record<TownStyle, number> = { temperate: 0.8, nordic: 0.5, mediterranean: 0.4, tropical: 0.6, arid: 0.5 };
/** Share of ordinary towns that build mid-rise: the rest stay low. */
const MID_SHARE = 0.25;

function roll(x: number, y: number): number {
  let h = (Math.imul(x + 31, 374761393) + Math.imul(y + 17, 668265263) + Math.imul(77, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Which skyline a town builds. A major city (radius over 3) is never low. */
export function skylineOf(place: { x: number; y: number; radius?: number; style: TownStyle }): Skyline {
  const r = roll(place.x, place.y);
  if ((place.radius ?? 3) <= 3) return r < MID_SHARE ? 'mid' : 'low';
  return r < TALL_SHARE[place.style] ? 'tall' : 'mid';
}

/** The tallest building (metres) a skyline allows in the core at a town level. */
export function skylineCap(sky: Skyline, level: number): number {
  const table = SKYLINE_CAP[sky];
  return table[Math.max(0, Math.min(table.length - 1, level - 1))];
}
