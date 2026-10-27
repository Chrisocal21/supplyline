// Achievements: one-off lifetime badges. They pay nothing and never gate a tier; they are a record of what the player has done.
// Each is measured from the world, so it can never fall out of step with what has really happened.
import { GOODS, GOOD_LIST, SITE_DEFS, type Good } from './defs';
import { ROUTE_LINES } from './lines';
import { lineSteps } from './quests';
import type { World } from './world';

export interface Achievement {
  id: string;
  group: string;
  label: string;
  hint: string;
  /** Where the player stands, and what finishes it. */
  measure: (w: World) => number;
  target: number;
}

const sum = (_w: World, o: Record<string, number | undefined>): number => GOOD_LIST.reduce((n, g) => n + (o[g] ?? 0), 0);
const sold = (w: World): number => sum(w, w.delivered);
const kinds = (w: World): number => GOOD_LIST.filter((g) => (w.delivered[g] ?? 0) > 0).length;
const maxTown = (w: World): number => w.places.reduce((m, p) => Math.max(m, p.level), 1);
const built = (w: World): number => w.sites.filter((s) => !SITE_DEFS[s.kind].dock && !SITE_DEFS[s.kind].station).length;
const routes = (w: World, mode: string): number => w.routes.filter((r) => r.mode === mode).length;
const fmt = (n: number): string => n.toLocaleString('en-US');

function series(id: string, group: string, label: (n: number) => string, hint: string, measure: (w: World) => number, targets: number[]): Achievement[] {
  return targets.map((t) => ({ id: `${id}-${t}`, group, label: label(t), hint, measure, target: t }));
}

const made = (good: Good, n: number): Achievement => ({
  id: `made-${good}-${n}`,
  group: 'Making',
  label: `Make ${fmt(n)} ${GOODS[good].label.toLowerCase()}`,
  hint: `Total ${GOODS[good].label.toLowerCase()} made in this world.`,
  measure: (w) => w.produced[good] ?? 0,
  target: n,
});

export const ACHIEVEMENTS: Achievement[] = [
  ...series('earn', 'Money', (n) => `Earn $${fmt(n)}`, 'Total money earned from sales.', (w) => w.earned, [1000, 10000, 100000, 1000000, 10000000, 100000000]),
  ...series('sold', 'Trade', (n) => `Sell ${fmt(n)} goods`, 'Units of any goods delivered to towns.', sold, [100, 1000, 10000, 100000, 1000000]),
  ...series('kinds', 'Trade', (n) => `Sell ${n} kinds of goods`, 'Different goods a town has bought from you.', kinds, [5, 15, 30, 50]),
  ...series('town', 'Towns', (n) => `Grow a town to level ${n}`, 'The biggest town you have.', maxTown, [2, 3, 4, 5]),
  ...series('towns', 'Towns', (n) => `Serve ${n} towns`, 'Towns that have had goods from you.', (w) => w.places.filter((p) => sum(w, p.delivered) > 0).length, [2, 4, 8]),
  ...series('built', 'Building', (n) => `Have ${n} buildings`, 'Factories and farms standing at once, not counting town buildings.', built, [5, 15, 40, 100]),
  ...series('level', 'Building', (n) => `Take a building to level ${n}`, 'The highest building level you have.', (w) => w.sites.reduce((m, s) => (SITE_DEFS[s.kind].dock ? m : Math.max(m, s.level)), 1), [3, 5, 8, 10]),
  ...series('fleet', 'Fleet', (n) => `Run ${n} vehicles`, 'Trucks, trains, boats and planes together.', (w) => w.vehicles.length, [1, 5, 20, 60]),
  ...series('tier', 'Progress', (n) => `Reach tier ${n}`, 'The tier you are on.', (w) => w.tier, [3, 6, 9, 12, 15, 18, 21, 25]),
  ...series('routes', 'Progress', (n) => `Finish ${n} route${n > 1 ? 's' : ''}`, 'Routes on the Objectives sheet taken to the end.', (w) => ROUTE_LINES.filter((l) => (w.lines ?? []).includes(l.id) && !lineSteps(w, l).next).length, [1, 5, 12, ROUTE_LINES.length]),
  ...series('side', 'Progress', (n) => `Answer ${n} town request${n > 1 ? 's' : ''}`, 'Side objectives: what a town asked for and you sent.', (w) => w.sideDone ?? 0, [1, 5, 15, 40]),
  { id: 'rail-1', group: 'Logistics', label: 'Lay a rail line', hint: 'Join two rail yards with track.', measure: (w) => routes(w, 'rail'), target: 1 },
  { id: 'sea-1', group: 'Logistics', label: 'Open a sea route', hint: 'Join two ports across the water.', measure: (w) => routes(w, 'sea'), target: 1 },
  { id: 'air-1', group: 'Logistics', label: 'Open an air route', hint: 'Join two airports.', measure: (w) => routes(w, 'air'), target: 1 },
  { id: 'road-50', group: 'Logistics', label: 'Lay 50 roads', hint: 'Roads you have drawn.', measure: (w) => routes(w, 'road'), target: 50 },
  ...[['bread', 500], ['lumber', 2000], ['bricks', 500], ['ingots', 300], ['steel', 200], ['beer', 300], ['cloth', 300], ['chocolate', 100], ['machinery', 50], ['fuel', 200]].map(([g, n]) => made(g as Good, n as number)),
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function achievementProgress(w: World, a: Achievement): { have: number; need: number; done: boolean } {
  const have = a.measure(w);
  return { have: Math.min(Math.floor(have), a.target), need: a.target, done: (w.achievements ?? []).includes(a.id) || have >= a.target };
}

/** Record the badges earned since the last check. */
export function checkAchievements(w: World, log: (text: string) => void): void {
  w.achievements ??= [];
  for (const a of ACHIEVEMENTS) {
    if (w.achievements.includes(a.id) || a.measure(w) < a.target) continue;
    w.achievements.push(a.id);
    log(`Achievement: ${a.label}`);
  }
}
