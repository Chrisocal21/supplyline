// Named world features: regions, towns and resource nodes. Pure, seeded.
import { FREIGHT_DEMAND, MARKET_DEMAND, STYLE_TASTE, TOWN_STYLES, type NodeKind, type Stock, type Terrain, type TownStyle } from './defs';
import { makeNamer } from './names';

export type RegionKind = 'ocean' | 'sea' | 'lake' | 'forest' | 'mountain' | 'land' | 'ice';

export interface Region {
  id: number;
  name: string;
  kind: RegionKind;
  /** Centroid in tile coordinates (x is a circular mean, so it can sit near the seam). */
  x: number;
  y: number;
  size: number;
}

export interface Tile {
  x: number;
  y: number;
}

/** A town. Its centre 3x3 is built over; the two docks sit just outside. */
export interface Place {
  id: number;
  name: string;
  x: number;
  y: number;
  level: number;
  /** Growth points earned by deliveries. */
  growth: number;
  /** Units delivered to this town, by good. Level ups need variety. */
  delivered: Stock;
  marketTile: Tile;
  freightTile: Tile;
  /** How the town looks: set by where it is in the world. */
  style: TownStyle;
  /** How much this particular town wants each good: a price and need multiplier. */
  taste: Stock;
  /** Streets run this many tiles each way from the centre: 3 for a town, 5 for a major city. */
  radius: number;
  /** Plots (by index) that are already homes along the street, not for sale. */
  homePlots: number[];
}

export const TOWN_RADIUS = 3;
export const CITY_RADIUS = 5;

/**
 * A town's district plots: the tiles beside its two main streets. The first two are the Market and the Freight Yard,
 * then the four nearest corners, then outward. A town (radius 3) has twelve plots; a major city (radius 5) has 28.
 */
export function plotTiles(x: number, y: number, radius = TOWN_RADIUS): Tile[] {
  const first: Tile[] = [
    { x: x + 1, y: y - 1 },
    { x: x - 1, y: y + 1 },
    { x: x - 1, y: y - 1 },
    { x: x + 1, y: y + 1 },
  ];
  const rest: { t: Tile; d: number }[] = [];
  for (let dy = -(radius - 1); dy <= radius - 1; dy++) {
    for (let dx = -(radius - 1); dx <= radius - 1; dx++) {
      if (dx === 0 || dy === 0 || (Math.abs(dx) === 1 && Math.abs(dy) === 1)) continue;
      const alongH = Math.abs(dy) === 1;
      const alongV = Math.abs(dx) === 1;
      if (alongH || alongV) rest.push({ t: { x: x + dx, y: y + dy }, d: Math.hypot(dx, dy) });
    }
  }
  // Stable: nearest first, ties in scan order after a fixed rotation so plots alternate sides.
  rest.sort((a, b) => a.d - b.d || Math.atan2(a.t.y - y, a.t.x - x) - Math.atan2(b.t.y - y, b.t.x - x));
  if (radius === TOWN_RADIUS) {
    // Keep the hand-picked order of the original twelve.
    return [
      ...first,
      { x: x + 2, y: y - 1 },
      { x: x - 2, y: y + 1 },
      { x: x + 2, y: y + 1 },
      { x: x - 2, y: y - 1 },
      { x: x + 1, y: y - 2 },
      { x: x - 1, y: y + 2 },
      { x: x - 1, y: y - 2 },
      { x: x + 1, y: y + 2 },
    ];
  }
  return [...first, ...rest.map((r) => r.t)];
}

/** The street tile a plot's driveway meets, as an offset from the town centre. */
export function plotEntry(dx: number, dy: number): Tile {
  return Math.abs(dy) === 1 ? { x: dx, y: 0 } : { x: 0, y: dy };
}

/** Which way a building on this plot (offset dx, dy from the town centre) faces: toward the street it fronts. */
export function plotFacing(dx: number, dy: number): 'N' | 'S' | 'E' | 'W' {
  if (Math.abs(dy) === 1) return dy < 0 ? 'S' : 'N';
  return dx > 0 ? 'W' : 'E';
}

/** The tiles around the plots where a town's homes stand: everything inside the square that is not a street or a plot. */
export function homeTiles(x: number, y: number, radius = TOWN_RADIUS): Tile[] {
  const plots = new Set(plotTiles(0, 0, radius).map((t) => t.x + ',' + t.y));
  const out: Tile[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 || dy === 0 || plots.has(dx + ',' + dy)) continue;
      out.push({ x: x + dx, y: y + dy });
    }
  }
  return out;
}

export interface ResourceNode {
  id: number;
  kind: NodeKind;
  x: number;
  y: number;
  /** 0 impure, 1 normal, 2 pure. */
  quality: number;
  regionId: number;
}

export interface Features {
  regions: Region[];
  /** Per tile: region id, or 0 for none. */
  regionMap: number[];
  places: Place[];
  nodes: ResourceNode[];
}

const ICE_ROWS = 2;
const MIN_WATER = 10;
const MIN_FOREST = 14;
const MIN_MOUNTAIN = 4;
const OCEAN_SIZE = 250;
const SEA_SIZE = 40;
const LAND_REGION_TILES = 260;
/** Largest elevation spread allowed under a town and its surroundings. */
const TOWN_FLATNESS = 62;
const CITY_FLATNESS = 90;

function wrapDelta(a: number, b: number, width: number): number {
  let d = b - a;
  if (d > width / 2) d -= width;
  if (d < -width / 2) d += width;
  return d;
}

/** Circular mean of x columns so a feature straddling the seam is centred correctly. */
function circularMeanX(xs: number[], width: number): number {
  let sx = 0;
  let sy = 0;
  for (const x of xs) {
    const a = ((x + 0.5) / width) * Math.PI * 2;
    sx += Math.cos(a);
    sy += Math.sin(a);
  }
  const a = Math.atan2(sy, sx);
  return ((((a / (Math.PI * 2)) % 1) + 1) % 1) * width;
}

export function generateFeatures(terrain: Terrain[], width: number, height: number, seed: number, elev?: number[]): Features {
  const namer = makeNamer(seed);
  const regions: Region[] = [];
  const regionMap = new Array<number>(width * height).fill(0);
  const idx = (x: number, y: number) => y * width + ((x % width) + width) % width;
  const dist2 = (a: number, b: number): number => {
    const dx = wrapDelta(a % width, b % width, width);
    const dy = Math.floor(b / width) - Math.floor(a / width);
    return dx * dx + dy * dy;
  };

  // Polar ice caps.
  const ice = (name: string, y: number, rows: number[]): void => {
    const id = regions.length + 1;
    regions.push({ id, name, kind: 'ice', x: width / 2, y, size: rows.length * width });
    for (const r of rows) for (let x = 0; x < width; x++) regionMap[r * width + x] = id;
  };
  ice('Northern Ice Cap', 0, [0, 1]);
  ice('Southern Ice Cap', height, [height - 2, height - 1]);

  // Connected components of water, forest and mountain, wrapping east-west.
  const component = (seen: Uint8Array, sx: number, sy: number, kind: Terrain): number[] => {
    const tiles: number[] = [];
    const stack = [idx(sx, sy)];
    seen[stack[0]] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      tiles.push(i);
      const x = i % width;
      const y = (i - x) / width;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ny = y + dy;
        if (ny < ICE_ROWS || ny >= height - ICE_ROWS) continue;
        const j = idx(x + dx, ny);
        if (!seen[j] && terrain[j] === kind) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    return tiles;
  };

  const addRegion = (tiles: number[], kind: RegionKind, name: string): Region => {
    const id = regions.length + 1;
    const xs = tiles.map((t) => t % width);
    const cy = tiles.reduce((s, t) => s + Math.floor(t / width), 0) / tiles.length;
    const r: Region = { id, name, kind, x: circularMeanX(xs, width), y: cy + 0.5, size: tiles.length };
    regions.push(r);
    for (const t of tiles) regionMap[t] = id;
    return r;
  };

  const forestTiles = new Map<number, number[]>();
  const mountainTiles = new Map<number, number[]>();
  for (const [kind, min] of [['water', MIN_WATER], ['forest', MIN_FOREST], ['mountain', MIN_MOUNTAIN]] as [Terrain, number][]) {
    const seen = new Uint8Array(width * height);
    for (let y = ICE_ROWS; y < height - ICE_ROWS; y++) {
      for (let x = 0; x < width; x++) {
        const i = idx(x, y);
        if (seen[i] || terrain[i] !== kind) continue;
        const tiles = component(seen, x, y, kind);
        if (tiles.length < min) continue;
        if (kind === 'water') {
          const name = tiles.length >= OCEAN_SIZE ? namer.ocean() : tiles.length >= SEA_SIZE ? namer.sea() : namer.lake();
          addRegion(tiles, tiles.length >= OCEAN_SIZE ? 'ocean' : tiles.length >= SEA_SIZE ? 'sea' : 'lake', name);
        } else if (kind === 'forest') {
          const r = addRegion(tiles, 'forest', namer.forest());
          forestTiles.set(r.id, tiles);
        } else {
          const r = addRegion(tiles, 'mountain', namer.mountain());
          mountainTiles.set(r.id, tiles);
        }
      }
    }
  }

  // Land regions: farthest-point seeds over grass, then each grass tile joins its nearest seed.
  const grass: number[] = [];
  for (let i = 0; i < terrain.length; i++) if (terrain[i] === 'grass') grass.push(i);
  const landRegionTiles = new Map<number, number[]>();
  if (grass.length > 0) {
    const count = Math.max(3, Math.min(14, Math.round(grass.length / LAND_REGION_TILES)));
    const seeds = [grass[Math.floor(namer.rand() * grass.length)]];
    while (seeds.length < count) {
      let best = seeds[0];
      let bestD = -1;
      for (let k = 0; k < grass.length; k += 4) {
        const g = grass[k];
        let d = Infinity;
        for (const s of seeds) d = Math.min(d, dist2(s, g));
        if (d > bestD) {
          bestD = d;
          best = g;
        }
      }
      seeds.push(best);
    }
    const groups: number[][] = seeds.map(() => []);
    for (const g of grass) {
      let bi = 0;
      let bd = Infinity;
      for (let s = 0; s < seeds.length; s++) {
        const d = dist2(seeds[s], g);
        if (d < bd) {
          bd = d;
          bi = s;
        }
      }
      groups[bi].push(g);
    }
    for (const tiles of groups) {
      if (tiles.length === 0) continue;
      const r = addRegion(tiles, 'land', namer.land());
      landRegionTiles.set(r.id, tiles);
    }
  }

  // Settlements: a flat 3x3 of grass with the streets and plots around it clear of water and rock. Major cities are
  // the same on a bigger scale. The first town is nearest the map centre, so the game starts small.
  const findCandidates = (R: number, flatness: number, clear: number): { c: number; ring: number[] }[] => {
    const out: { c: number; ring: number[] }[] = [];
    for (let y = ICE_ROWS + R; y < height - ICE_ROWS - R; y++) {
      for (let x = 0; x < width; x++) {
        let ok = true;
        const ring: number[] = [];
        if (elev) {
          let lo = 255;
          let hi = 0;
          for (let dy = -clear - 1; dy <= clear + 1; dy++) for (let dx = -clear - 1; dx <= clear + 1; dx++) {
            const e = elev[idx(x + dx, y + dy)];
            lo = Math.min(lo, e);
            hi = Math.max(hi, e);
          }
          if (hi - lo > flatness) continue;
        }
        for (let dy = -clear; dy <= clear && ok; dy++) {
          for (let dx = -clear; dx <= clear && ok; dx++) {
            const t = terrain[idx(x + dx, y + dy)];
            if (Math.max(Math.abs(dx), Math.abs(dy)) <= 1) ok = t === 'grass';
            else {
              if (t === 'water' || t === 'mountain' || t === 'ice') ok = false;
              else if (t === 'grass') ring.push(idx(x + dx, y + dy));
            }
          }
        }
        if (ok && ring.length >= 4) out.push({ c: idx(x, y), ring });
      }
    }
    return out;
  };
  const shuffle = <T,>(list: T[]): T[] => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(namer.rand() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const centre = idx(Math.floor(width / 2), Math.floor(height / 2));
  const wrapTile = (t: Tile): Tile => ({ x: ((t.x % width) + width) % width, y: t.y });
  const made: Place[] = [];
  const tooClose = (c: number, R: number): boolean =>
    made.some((p) => dist2(p.y * width + p.x, c) < (p.radius + R + 4) * (p.radius + R + 4));
  const makePlace = (c: number, R: number): Place => {
    const x = c % width;
    const y = Math.floor(c / width);
    const lat = Math.abs((0.5 - (y + 0.5) / height) * 120);
    const roll = namer.rand();
    const style: TownStyle =
      lat > 46 ? (roll < 0.75 ? 'nordic' : 'temperate')
      : lat > 32 ? (roll < 0.55 ? 'temperate' : roll < 0.85 ? 'mediterranean' : 'nordic')
      : lat > 16 ? (roll < 0.4 ? 'mediterranean' : roll < 0.7 ? 'arid' : roll < 0.9 ? 'tropical' : 'temperate')
      : (roll < 0.55 ? 'tropical' : roll < 0.85 ? 'arid' : 'mediterranean');
    void TOWN_STYLES;
    const taste: Stock = {};
    for (const g of new Set([...MARKET_DEMAND[MARKET_DEMAND.length - 1], ...FREIGHT_DEMAND[FREIGHT_DEMAND.length - 1]])) {
      taste[g] = Math.round((0.75 + namer.rand() * 0.7) * (STYLE_TASTE[style][g] ?? 1) * 100) / 100;
    }
    const plots = plotTiles(x, y, R);
    // Some plots along the street are already homes, so the street has houses on it and not only empty lots.
    const homePlots: number[] = [];
    for (let i = 4; i < plots.length; i++) if (namer.rand() < (R === CITY_RADIUS ? 0.3 : 0.35)) homePlots.push(i);
    const city = R === CITY_RADIUS;
    return {
      style,
      taste,
      radius: R,
      homePlots,
      id: 0,
      name: namer.town(),
      x,
      y,
      level: city ? 2 : 1,
      growth: city ? 250 : 0,
      delivered: {},
      marketTile: wrapTile(plots[0]),
      freightTile: wrapTile(plots[1]),
    };
  };

  // Major cities first, while there is still room for them.
  const cityTarget = Math.max(2, Math.min(3, Math.round((width * height) / 3600)));
  for (const cand of shuffle(findCandidates(CITY_RADIUS, CITY_FLATNESS, 3))) {
    if (made.filter((p) => p.radius === CITY_RADIUS).length >= cityTarget) break;
    if (tooClose(cand.c, CITY_RADIUS) || made.some((p) => dist2(p.y * width + p.x, cand.c) < 20 * 20)) continue;
    made.push(makePlace(cand.c, CITY_RADIUS));
  }
  const cities = made.slice();
  const townCandidates = findCandidates(TOWN_RADIUS, TOWN_FLATNESS, 2);
  townCandidates.sort((a, b) => dist2(centre, a.c) - dist2(centre, b.c));
  const firstTown = townCandidates.shift();
  const ordered = firstTown ? [firstTown, ...shuffle(townCandidates)] : [];
  const target = Math.max(6, Math.round((width * height) / 480));
  const towns: Place[] = [];
  for (const cand of ordered) {
    if (towns.length >= target) break;
    if (tooClose(cand.c, TOWN_RADIUS)) continue;
    const p = makePlace(cand.c, TOWN_RADIUS);
    made.push(p);
    towns.push(p);
  }
  const places: Place[] = [...towns, ...cities];
  places.forEach((p, i) => (p.id = i + 1));

  // Resource nodes: spread out within each region, never inside or beside a town.
  const nodes: ResourceNode[] = [];
  const nearTown = (t: number, r: number): boolean =>
    places.some((p) => Math.abs(wrapDelta(p.x, t % width, width)) <= r + p.radius - 3 && Math.abs(p.y - Math.floor(t / width)) <= r + p.radius - 3);
  const quality = (): number => {
    const r = namer.rand();
    return r < 0.25 ? 2 : r < 0.75 ? 1 : 0;
  };
  const spread = (tiles: number[], count: number, minGap: number, kind: NodeKind, regionId: number): void => {
    const pool = tiles.filter(
      (t) => !nearTown(t, 4) && !nodes.some((n) => Math.abs(wrapDelta(n.x, t % width, width)) <= 1 && Math.abs(n.y - Math.floor(t / width)) <= 1),
    );
    if (pool.length === 0) return;
    const chosen: number[] = [pool[Math.floor(namer.rand() * pool.length)]];
    while (chosen.length < count) {
      let best = -1;
      let bestD = minGap * minGap - 1;
      for (let k = 0; k < pool.length; k += 2) {
        let d = Infinity;
        for (const c of chosen) d = Math.min(d, dist2(c, pool[k]));
        if (d > bestD) {
          bestD = d;
          best = pool[k];
        }
      }
      if (best < 0) break;
      chosen.push(best);
    }
    for (const t of chosen) {
      nodes.push({ id: nodes.length + 1, kind, x: t % width, y: Math.floor(t / width), quality: quality(), regionId });
    }
  };

  for (const [id, tiles] of forestTiles) spread(tiles, Math.max(2, Math.min(7, Math.floor(tiles.length / 10))), 3, 'forest', id);
  for (const [id, tiles] of landRegionTiles) {
    const open = tiles.filter((t) => {
      const x = t % width;
      const y = Math.floor(t / width);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = terrain[idx(x + dx, y + dy)];
        if (n === 'water' || n === 'mountain' || n === 'ice') return false;
      }
      return true;
    });
    spread(open, Math.max(2, Math.min(5, Math.round(tiles.length / 90))), 4, 'farmland', id);
    spread(open, Math.max(1, Math.min(3, Math.round(tiles.length / 110))), 4, 'pasture', id);
    spread(open, Math.max(1, Math.min(2, Math.round(tiles.length / 150))), 4, 'orchard', id);
    // Clay lies along the water.
    const shore = tiles.filter((t) => {
      const x = t % width;
      const y = Math.floor(t / width);
      return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => terrain[idx(x + dx, y + dy)] === 'water');
    });
    if (shore.length > 0) spread(shore, Math.max(1, Math.min(2, Math.round(tiles.length / 160))), 3, 'clay', id);
  }
  for (const [id, tiles] of mountainTiles) {
    // Quarries, mines and coal seams sit at the foot of a mountain: a grass tile beside the rock, so a road reaches them on the flat.
    const foot = new Set<number>();
    for (const t of tiles) {
      const x = t % width;
      const y = Math.floor(t / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const j = idx(x + dx, y + dy);
        if (terrain[j] === 'grass' && y + dy >= ICE_ROWS + 1 && y + dy < height - ICE_ROWS - 1) foot.add(j);
      }
    }
    const pool = [...foot];
    spread(pool, Math.max(1, Math.min(2, Math.floor(tiles.length / 10))), 3, 'quarry', id);
    spread(pool, Math.max(1, Math.min(2, Math.floor(tiles.length / 12))), 3, 'mine', id);
    if (tiles.length >= 8) spread(pool, 1, 3, 'coal', id);
  }

  return { regions, regionMap, places, nodes };
}
