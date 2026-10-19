// Seasons: crop and orchard sites follow the year the way a farming game does: plant in spring, grow in summer, bring the
// harvest in autumn, and little happens in winter. The year starts in summer so a new game opens at an even pace.
import type { SiteKind } from './defs';

export const SEASON_TICKS = 2400;

export interface Season {
  id: 'spring' | 'summer' | 'autumn' | 'winter';
  label: string;
  /** What the crop sites do in it, in a word. */
  job: string;
  mult: number;
}

export const SEASONS: Season[] = [
  { id: 'summer', label: 'Summer', job: 'growing', mult: 1 },
  { id: 'autumn', label: 'Autumn', job: 'harvest', mult: 1.4 },
  { id: 'winter', label: 'Winter', job: 'fallow', mult: 0.6 },
  { id: 'spring', label: 'Spring', job: 'planting', mult: 0.85 },
];

/** The sites whose output follows the seasons. */
export const SEASONAL: SiteKind[] = ['farm', 'cottonfarm', 'orchard'];

export const seasonIndex = (tick: number): number => Math.floor(tick / SEASON_TICKS) % SEASONS.length;
export const seasonOf = (tick: number): Season => SEASONS[seasonIndex(tick)];
/** How far through the season it is, 0 to 1. */
export const seasonProgress = (tick: number): number => (tick % SEASON_TICKS) / SEASON_TICKS;
export const seasonMult = (kind: SiteKind, tick: number): number => (SEASONAL.includes(kind) ? seasonOf(tick).mult : 1);

const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
const MONTH_TICKS = SEASON_TICKS / 3;

/** The date: the game starts on 1 June of year 1, and each season is three months of thirty days. */
export function calendar(tick: number): { year: number; month: string; day: number; text: string } {
  const year = Math.floor(tick / (SEASON_TICKS * 4)) + 1;
  const inYear = tick % (SEASON_TICKS * 4);
  const month = MONTHS[Math.floor(inYear / MONTH_TICKS)];
  const day = Math.floor(((inYear % MONTH_TICKS) / MONTH_TICKS) * 30) + 1;
  return { year, month, day, text: `${month} ${day}` };
}
