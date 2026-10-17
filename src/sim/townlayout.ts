// How a town is laid out on the tiles: not a square grid but a strip along one main street, the way real towns grow
// along the road between them. The main street leaves the centre toward the nearest towns, bending a little to aim at
// them, and grows a few tiles longer with each town level, so neighbours reach toward each other. A short cross street
// makes the centre, side lanes branch off now and then, and lots and homes line both sides. Pure and deterministic:
// the same land and the same towns always give the same layout, so it is never saved.
import type { Terrain } from './defs';
import type { Place, Tile } from './features';

export interface LayoutEnv {
  width: number;
  height: number;
  terrain: Terrain[];
  elev?: number[];
  places: Place[];
}

/** Offsets from the town centre (x not wrapped). */
export interface LayoutStreet extends Tile {
  /** Town level at which this stretch is built. */
  level: number;
  /** Part of the main street through town. */
  main: boolean;
}
export interface LayoutPlot extends Tile {
  /** The street tile its drive meets. */
  entry: Tile;
}
export interface LayoutHome extends Tile {
  level: number;
}
/** A lot held for a district building (see DISTRICTS): a tile beside a street, entered from its door like a plot. */
export interface LayoutCivic extends LayoutPlot {
  /** Town level at which its street is built. */
  level: number;
}
export interface TownLayout {
  streets: LayoutStreet[];
  plots: LayoutPlot[];
  /** Lots for district buildings. Until a district takes one, it is homes like the rest. */
  civic: LayoutCivic[];
  homes: LayoutHome[];
  /** The main street runs mostly east-west ('h') or north-south ('v'). */
  axis: 'h' | 'v';
}

export const TOWN_PLOTS = 12;
export const CITY_PLOTS = 28;
/** District lots a town sets aside beside its streets, nearest the centre first. */
export const CIVIC_LOTS = 22;
export const CITY_CIVIC_LOTS = 26;
const MAX_TOWN_LEVEL = 5;
/** The main street may wander this far off its axis: about one tile sideways every three along. */
const MAX_SLOPE = 0.34;
/** Ground this much higher or lower than the centre stops the street. */
const MAX_RISE = 48;

export function plotCount(radius: number): number {
  return radius > 3 ? CITY_PLOTS : TOWN_PLOTS;
}

/** How far the main street runs each way from the centre at a town level. */
export function streetReach(radius: number, level: number): number {
  return radius + (Math.max(1, Math.min(MAX_TOWN_LEVEL, level)) - 1);
}

function hash(a: number, b: number, c: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const cache = new WeakMap<Place, { env: LayoutEnv; n: number; layout: TownLayout }>();

export function townLayout(env: LayoutEnv, place: Place): TownLayout {
  const hit = cache.get(place);
  if (hit && hit.env === env && hit.n === env.places.length) return hit.layout;
  const layout = build(env, place);
  cache.set(place, { env, n: env.places.length, layout });
  return layout;
}

function build(env: LayoutEnv, place: Place): TownLayout {
  const { width: W, height: H } = env;
  const R = place.radius ?? 3;
  const city = R > 3;
  const wdx = (d: number): number => d - Math.round(d / W) * W;
  const elev0 = env.elev ? env.elev[place.y * W + place.x] : 0;
  const others = env.places.filter((p) => p !== place && !(p.x === place.x && p.y === place.y));
  const rnd = (k: number): number => hash(place.x, place.y, k);

  const buildable = (dx: number, dy: number): boolean => {
    const y = place.y + dy;
    if (y < 3 || y >= H - 3) return false;
    const i = y * W + ((((place.x + dx) % W) + W) % W);
    const t = env.terrain[i];
    if (t !== 'grass' && t !== 'forest') return false;
    if (env.elev && Math.abs(env.elev[i] - elev0) > MAX_RISE) return false;
    // Keep clear of another town's centre: the two may meet along the road, but never run into each other's middle.
    return !others.some((p) => Math.abs(wdx(p.x - (place.x + dx))) <= (p.radius ?? 3) - 1 && Math.abs(p.y - y) <= (p.radius ?? 3) - 1);
  };

  // Which way the main street runs: toward the nearest town, then on the far side toward the nearest one that way.
  const toward = others
    .map((p) => ({ dx: wdx(p.x - place.x), dy: p.y - place.y }))
    .map((v) => ({ ...v, d: Math.hypot(v.dx, v.dy) }))
    .filter((v) => v.d > 0)
    .sort((a, b) => a.d - b.d);
  const first = toward[0];
  const axis: 'h' | 'v' = first ? (Math.abs(first.dx) >= Math.abs(first.dy) ? 'h' : 'v') : 'h';
  const maxReach = streetReach(R, MAX_TOWN_LEVEL);
  /** Along and across the axis, for each direction. */
  const aim = (sign: number): { slope: number; limit: number } => {
    const along = (v: { dx: number; dy: number }): number => (axis === 'h' ? v.dx : v.dy) * sign;
    const across = (v: { dx: number; dy: number }): number => (axis === 'h' ? v.dy : v.dx);
    const target = toward.find((v) => along(v) > 0 && Math.abs(across(v)) <= along(v) * 1.6);
    if (!target) return { slope: 0, limit: maxReach };
    const slope = Math.max(-MAX_SLOPE, Math.min(MAX_SLOPE, across(target) / along(target)));
    // Stop short of halfway, so the two towns' streets reach toward each other and leave the last link to the player.
    return { slope, limit: Math.max(2, Math.min(maxReach, Math.floor(target.d / 2) - 1)) };
  };
  const off = (along: number, across: number): Tile => (axis === 'h' ? { x: along, y: across } : { x: across, y: along });
  const levelAt = (k: number): number => {
    for (let l = 1; l <= MAX_TOWN_LEVEL; l++) if (streetReach(R, l) >= k) return l;
    return MAX_TOWN_LEVEL;
  };

  const streets = new Map<string, LayoutStreet>();
  const key = (t: Tile): string => t.x + ',' + t.y;
  const add = (t: Tile, level: number, main: boolean): void => {
    if (!streets.has(key(t))) streets.set(key(t), { x: t.x, y: t.y, level, main });
  };
  add({ x: 0, y: 0 }, 1, true);
  /** Spine tiles that run straight (not a jog), by signed distance along: where side lanes may branch. */
  const straight: { k: number; t: Tile }[] = [];
  for (const sign of [1, -1]) {
    const { slope, limit } = aim(sign);
    let across = 0;
    let prevAlong = 0;
    for (let k = 1; k <= limit; k++) {
      const want = Math.trunc(slope * k);
      const level = levelAt(k);
      let blocked = false;
      while (across !== want) {
        across += Math.sign(want - across);
        const jog = off(prevAlong, across);
        if (!buildable(jog.x, jog.y)) {
          blocked = true;
          break;
        }
        add(jog, level, true);
      }
      if (blocked) break;
      const t = off(k * sign, across);
      if (!buildable(t.x, t.y)) break;
      add(t, level, true);
      if (want === Math.trunc(slope * (k + 1))) straight.push({ k: k * sign, t });
      prevAlong = k * sign;
    }
  }

  const neighbours = (t: Tile): Tile[] => [
    { x: t.x + 1, y: t.y },
    { x: t.x - 1, y: t.y },
    { x: t.x, y: t.y + 1 },
    { x: t.x, y: t.y - 1 },
  ];
  /** Run a lane out from a spine tile, square to the axis, stopping before it would crowd another street. */
  const lane = (from: Tile, dir: number, len: number, level: number): void => {
    let prev = from;
    for (let i = 1; i <= len; i++) {
      const a = axis === 'h' ? from.x : from.y;
      const c = (axis === 'h' ? from.y : from.x) + dir * i;
      const t = off(a, c);
      if (!buildable(t.x, t.y) || streets.has(key(t))) return;
      if (neighbours(t).some((n) => streets.has(key(n)) && key(n) !== key(prev))) return;
      // A lane grows outward a tile at a time as the town does.
      add(t, Math.min(MAX_TOWN_LEVEL, level + Math.floor((i - 1) / 2)), false);
      prev = t;
    }
  };
  // The cross street at the centre.
  for (const dir of [1, -1]) lane({ x: 0, y: 0 }, dir, city ? 3 : 2, 1);
  // Lanes off the main street every other tile, of uneven length and not always on both sides, so the homes behind the
  // main street have streets of their own.
  for (const { k, t } of straight) {
    if (Math.abs(k) < 2 || Math.abs(k) % 2 !== 0) continue;
    for (const dir of [1, -1]) {
      if (rnd(k * 3 + dir) < (city ? 0.15 : 0.3)) continue;
      lane(t, dir, (city ? 3 : 2) + Math.floor(rnd(k * 5 + dir) * (city ? 3 : 2)), levelAt(Math.abs(k)));
    }
  }

  // Lots and homes: the tiles beside the streets. The lots come first, beside the main street nearest the centre.
  const list = [...streets.values()];
  const taken = new Set(streets.keys());
  interface Cand extends Tile {
    entry: LayoutStreet;
  }
  const cands = new Map<string, Cand>();
  for (const s of list) {
    for (const n of neighbours(s)) {
      if (taken.has(key(n)) || !buildable(n.x, n.y)) continue;
      // Straight on past the end of a street stays open, so a road can carry it on out of town.
      if (streets.has(key({ x: 2 * s.x - n.x, y: 2 * s.y - n.y })) && !neighbours(s).some((m) => key(m) !== key(n) && streets.has(key(m)) && (m.x - s.x) * (n.x - s.x) + (m.y - s.y) * (n.y - s.y) === 0)) continue;
      const have = cands.get(key(n));
      const better = !have || (s.main && !have.entry.main) || (s.main === have.entry.main && s.level < have.entry.level);
      if (better) cands.set(key(n), { x: n.x, y: n.y, entry: s });
    }
  }
  const rank = (c: Cand): number => c.entry.level * 100 + (c.entry.main ? 0 : 3) + Math.hypot(c.x, c.y) + Math.atan2(c.y, c.x) * 0.001;
  const ordered = [...cands.values()].sort((a, b) => rank(a) - rank(b));
  const plots: LayoutPlot[] = [];
  // The Market and the Freight Yard face each other across the main street, one each side of the centre.
  for (const [along, across] of [[1, -1], [-1, 1]]) {
    const want = off(along, across);
    const alt = off(along, -across);
    const c = cands.get(key(want)) ?? cands.get(key(alt)) ?? ordered.find((o) => !plots.some((p) => key(p) === key(o)));
    if (c && !plots.some((p) => key(p) === key(c))) plots.push({ x: c.x, y: c.y, entry: { x: c.entry.x, y: c.entry.y } });
  }
  for (const c of ordered) {
    if (plots.length >= plotCount(R)) break;
    if (plots.some((p) => key(p) === key(c))) continue;
    plots.push({ x: c.x, y: c.y, entry: { x: c.entry.x, y: c.entry.y } });
  }
  const plotKeys = new Set(plots.map(key));
  // The next lots in the same order are for districts, so they keep their place as the town grows.
  const civic: LayoutCivic[] = [];
  for (const c of ordered) {
    if (civic.length >= (city ? CITY_CIVIC_LOTS : CIVIC_LOTS)) break;
    if (plotKeys.has(key(c))) continue;
    civic.push({ x: c.x, y: c.y, entry: { x: c.entry.x, y: c.entry.y }, level: c.entry.level });
  }
  const civicKeys = new Set(civic.map(key));
  const homes: LayoutHome[] = ordered.filter((c) => !plotKeys.has(key(c)) && !civicKeys.has(key(c))).map((c) => ({ x: c.x, y: c.y, level: c.entry.level }));
  return { streets: list, plots, civic, homes, axis };
}

/** Every tile the town covers at a level: its streets and homes so far, and all its lots. Offsets from the centre. */
export function footprint(layout: TownLayout, level: number): Tile[] {
  return [
    ...layout.streets.filter((s) => s.level <= level),
    ...layout.plots,
    ...layout.civic.filter((c) => c.level <= level),
    ...layout.homes.filter((h) => h.level <= level),
  ];
}
