// Named world features: regions, towns and resource nodes. Pure, seeded.
import { FREIGHT_DEMAND, MARKET_DEMAND, STYLE_TASTE, TOWN_STYLES, type DistrictId, type NodeKind, type PathId, type Stock, type Terrain, type TownStyle } from './defs';
import { makeNamer } from './names';
import { footprint, plotCount, townLayout } from './townlayout';

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
  /** Its path is mastered (every path quest done): it pays a little more for the path's goods. */
  mastered?: boolean;
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
  /** The specialisation this town committed to, if any. */
  path?: PathId | null;
  /** Districts built in the town, by id, with their level. */
  districts?: Partial<Record<DistrictId, number>>;
  /** Which of the town's district lots (see TownLayout.civic) each district stands on. */
  districtLots?: Partial<Record<DistrictId, number>>;
  /** The level at which "ready to grow" was last announced, so it is said once. */
  readyAt?: number;
  /** The ground kept clear for this town's airport (its middle and facing), until the town has one. */
  airportPad?: { x: number; y: number; rot: 0 | 1 | 2 | 3 } | null;
}

export const TOWN_RADIUS = 3;
/** Resource nodes sit on low, level ground: no steeper than this step to a neighbour, and no higher than this. */
const NODE_SLOPE = 9;
const NODE_MAX_ELEV = 160;
/** Nodes keep this many tiles apart (so NODE_GAP - 1 clear tiles between them). */
const NODE_GAP = 3;
/** No node within this many tiles of water, so its yard (and a quarry's pit) never reaches the shore. */
const NODE_DRY = 2;
/** Nodes are only placed where a road from a town can get to: across at most this much open water. */
const REACH_BRIDGE = 4;
/** Nodes this close to a town are preferred. */
const NODE_TOWN_REACH = 22;
export const CITY_RADIUS = 5;
/** Towns stand at least this many tiles beyond their own radii apart, so a world is spread out, not packed. */
const TOWN_SPREAD = 8;
/** About one town for this many tiles of the globe (land permitting). */
const TILES_PER_TOWN = 1100;
/** Clear tiles kept between one town's fully grown footprint and the next, so towns never grow into each other. */
const TOWN_GAP = 1;
/** Resource nodes keep this many tiles from any town's fully grown footprint: the outskirts, clear of growth. */
const NODE_TOWN_BUFFER = 3;

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

/** A town or city placed by hand on a made map. The first one listed is where the game starts. */
export interface FixedPlace {
  name: string;
  x: number;
  y: number;
  radius: number;
  style?: TownStyle;
}

export function generateFeatures(terrain: Terrain[], width: number, height: number, seed: number, elev?: number[], fixedPlaces?: FixedPlace[]): Features {
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
  // The small world has little room, so its towns stand closer; bigger ones spread out.
  const townSpread = width > 200 ? TOWN_SPREAD : 5;
  const tooClose = (c: number, R: number): boolean =>
    made.some((p) => dist2(p.y * width + p.x, c) < (p.radius + R + townSpread) * (p.radius + R + townSpread));
  const makePlace = (c: number, R: number, fixed?: FixedPlace): Place => {
    const x = c % width;
    const y = Math.floor(c / width);
    const lat = Math.abs((0.5 - (y + 0.5) / height) * 120);
    const roll = namer.rand();
    const style: TownStyle = fixed?.style ??
      (lat > 46 ? (roll < 0.75 ? 'nordic' : 'temperate')
      : lat > 32 ? (roll < 0.55 ? 'temperate' : roll < 0.85 ? 'mediterranean' : 'nordic')
      : lat > 16 ? (roll < 0.4 ? 'mediterranean' : roll < 0.7 ? 'arid' : roll < 0.9 ? 'tropical' : 'temperate')
      : (roll < 0.55 ? 'tropical' : roll < 0.85 ? 'arid' : 'mediterranean'));
    void TOWN_STYLES;
    const taste: Stock = {};
    // The island goods take their taste from the spot, not from the random stream, so adding them left every other town as it was.
    const EXTRA = ['coffee', 'mango', 'oil'];
    for (const g of new Set([...MARKET_DEMAND[MARKET_DEMAND.length - 1], ...FREIGHT_DEMAND[FREIGHT_DEMAND.length - 1]])) {
      if (EXTRA.includes(g)) continue;
      taste[g] = Math.round((0.75 + namer.rand() * 0.7) * (STYLE_TASTE[style][g] ?? 1) * 100) / 100;
    }
    for (const g of EXTRA) {
      const h = (Math.imul(x * 73856093 + y * 19349663, 2654435761) + g.length * 40503) >>> 0;
      taste[g as keyof typeof taste] = Math.round((0.75 + ((h % 1000) / 1000) * 0.7) * 100) / 100;
    }
    // Many plots along the street start as homes, so the street has houses on it and not only empty lots. As the town
    // grows, the homes nearest the centre make way for building lots (see homesNow in world.ts). The plots themselves
    // are laid out once every town is known (see townLayout), since a town's main street reaches toward its neighbours.
    const homePlots: number[] = [];
    for (let i = 4; i < plotCount(R); i++) if (namer.rand() < (R === CITY_RADIUS ? 0.5 : 0.6)) homePlots.push(i);
    return {
      style,
      taste,
      radius: R,
      homePlots,
      id: 0,
      name: fixed?.name ?? namer.town(),
      x,
      y,
      level: 1,
      growth: 0,
      delivered: {},
      marketTile: wrapTile({ x: x + 1, y: y - 1 }),
      freightTile: wrapTile({ x: x - 1, y: y + 1 }),
    };
  };

  // Lay the towns out along their main streets and report which ones crowd a neighbour. A town's fully grown footprint
  // is its claim: no other town may touch it (TOWN_GAP clear tiles between), so growth never runs into a neighbour.
  // Layouts are tried on a list of towns before they are accepted, since a street aims at the towns around it.
  let townTiles = new Set<number>();
  const settle = (list: Place[]): Place[] => {
    list.forEach((p, i) => (p.id = i + 1));
    const env = { width, height, terrain, elev, places: list };
    const owner = new Map<number, Place>();
    const crowded: Place[] = [];
    const tiles = new Set<number>();
    for (const p of list) {
      const layout = townLayout(env, p);
      if (layout.plots[0]) p.marketTile = wrapTile({ x: p.x + layout.plots[0].x, y: p.y + layout.plots[0].y });
      if (layout.plots[1]) p.freightTile = wrapTile({ x: p.x + layout.plots[1].x, y: p.y + layout.plots[1].y });
      for (const t of footprint(layout, 5)) {
        const k = idx(p.x + t.x, p.y + t.y);
        tiles.add(k);
        const other = owner.get(k);
        if (other && other !== p && !crowded.includes(p)) crowded.push(p);
        owner.set(k, p);
      }
    }
    if (!fixedPlaces) {
      for (const p of list) {
        if (crowded.includes(p)) continue;
        let hit = false;
        for (const t of footprint(townLayout(env, p), 5)) {
          for (let dy = -TOWN_GAP; dy <= TOWN_GAP && !hit; dy++) {
            for (let dx = -TOWN_GAP; dx <= TOWN_GAP && !hit; dx++) {
              const other = owner.get(idx(p.x + t.x + dx, p.y + t.y + dy));
              if (other && other !== p) hit = true;
            }
          }
          if (hit) break;
        }
        if (hit) crowded.push(p);
      }
    }
    townTiles = tiles;
    return crowded;
  };

  let places: Place[];
  if (fixedPlaces) {
    places = fixedPlaces.map((fp) => makePlace(idx(fp.x, fp.y), fp.radius, fp));
    settle(places);
  } else {
    // Major cities first, while there is still room for them. A town is only kept if the whole set still has room to grow.
    places = [];
    const cityTarget = Math.max(3, Math.min(6, Math.round((width * height) / 8000)));
    for (const cand of shuffle(findCandidates(CITY_RADIUS, CITY_FLATNESS, 3))) {
      if (places.length >= cityTarget) break;
      if (tooClose(cand.c, CITY_RADIUS) || made.some((p) => dist2(p.y * width + p.x, cand.c) < 20 * 20)) continue;
      const p = makePlace(cand.c, CITY_RADIUS);
      if (settle([...places, p]).length > 0) continue;
      made.push(p);
      places.push(p);
    }
    const cities = places.slice();
    const townCandidates = findCandidates(TOWN_RADIUS, TOWN_FLATNESS, 2);
    townCandidates.sort((a, b) => dist2(centre, a.c) - dist2(centre, b.c));
    const firstTown = townCandidates.shift();
    const ordered = firstTown ? [firstTown, ...shuffle(townCandidates)] : [];
    const target = Math.max(6, Math.round((width * height) / TILES_PER_TOWN));
    const towns: Place[] = [];
    for (const cand of ordered) {
      if (towns.length >= target) break;
      if (tooClose(cand.c, TOWN_RADIUS)) continue;
      const p = makePlace(cand.c, TOWN_RADIUS);
      if (settle([...towns, p, ...cities]).length > 0) continue;
      made.push(p);
      towns.push(p);
    }
    places = [...towns, ...cities];
    settle(places);
  }

  // Resource nodes: spread out within each region, never inside or beside a town, always on low, level ground.
  const nodes: ResourceNode[] = [];
  // The ground within NODE_TOWN_BUFFER of any town's fully grown footprint is kept for the town.
  const blocked = new Uint8Array(width * height);
  for (const k of townTiles) {
    const kx = k % width;
    const ky = (k - kx) / width;
    for (let dy = -NODE_TOWN_BUFFER; dy <= NODE_TOWN_BUFFER; dy++) {
      const ny = ky + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -NODE_TOWN_BUFFER; dx <= NODE_TOWN_BUFFER; dx++) blocked[idx(kx + dx, ny)] = 1;
    }
  }
  const nearTown = (t: number, r: number): boolean =>
    blocked[t] === 1 || townTiles.has(t) || places.some((p) => Math.abs(wrapDelta(p.x, t % width, width)) <= r + p.radius - 3 && Math.abs(p.y - Math.floor(t / width)) <= r + p.radius - 3);
  /** Steepest step to a neighbouring tile. */
  const slopeOf = (t: number): number => {
    if (!elev) return 0;
    const x = t % width;
    const y = Math.floor(t / width);
    let s = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) s = Math.max(s, Math.abs(elev[idx(x + dx, y + dy)] - elev[t]));
    return s;
  };
  /** Low and level enough for a farm or a camp: not a hilltop, not a hillside. */
  const level = (t: number, maxSlope = NODE_SLOPE): boolean => !elev || maxSlope === Infinity || (slopeOf(t) <= maxSlope && elev[t] <= NODE_MAX_ELEV);
  /** At least NODE_GAP - 1 clear tiles to every other node, so their yards do not run into each other. */
  const clear = (t: number): boolean => !nodes.some((n) => Math.abs(wrapDelta(n.x, t % width, width)) < NODE_GAP && Math.abs(n.y - Math.floor(t / width)) < NODE_GAP);
  /** Nearest open water, in tiles (Chebyshev), looking no further than `max`. */
  const waterWithin = (t: number, max: number): number => {
    const x = t % width;
    const y = Math.floor(t / width);
    for (let r = 1; r <= max; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          if (terrain[idx(x + dx, ny)] === 'water') return r;
        }
      }
    }
    return Infinity;
  };
  /** Hard rule: a node and its levelled yard stay on dry land, NODE_DRY tiles clear of the sea and lakes. */
  const dry = (t: number): boolean => waterWithin(t, NODE_DRY) > NODE_DRY;
  /** Within reach of a town, where a player will want them. */
  const townDist = (t: number): number => Math.min(...places.map((p) => Math.hypot(wrapDelta(p.x, t % width, width), p.y - Math.floor(t / width))));
  const quality = (): number => {
    const r = namer.rand();
    return r < 0.25 ? 2 : r < 0.75 ? 1 : 0;
  };
  const spread = (tiles: number[], count: number, minGap: number, kind: NodeKind, regionId: number, maxSlope = NODE_SLOPE): void => {
    const ok = tiles.filter((t) => !nearTown(t, 4) && clear(t) && dry(t) && level(t, maxSlope));
    // Prefer land a town can reach; fall back to the whole region when there is too little of it.
    const handy = ok.filter((t) => townDist(t) <= NODE_TOWN_REACH);
    const pool = handy.length >= count * 4 ? handy : ok;
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
      if (!clear(t)) continue;
      nodes.push({ id: nodes.length + 1, kind, x: t % width, y: Math.floor(t / width), quality: quality(), regionId });
    }
  };

  for (const [id, tiles] of forestTiles) spread(tiles, Math.max(2, Math.min(7, Math.floor(tiles.length / 10))), 4, 'forest', id);
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
    // Farming land clusters into belts on the flattest ground, with pasture and orchards beside the fields, the way a
    // real district grows up, instead of being scattered evenly over the whole region.
    const slope = (t: number): number => {
      if (!elev) return 0;
      const x = t % width;
      const y = Math.floor(t / width);
      let s = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s = Math.max(s, Math.abs(elev[idx(x + dx, y + dy)] - elev[t]));
      return s;
    };
    const flat = open.filter((t) => dry(t)).sort((a, b) => slope(a) - slope(b) || a - b);
    const anchors: number[] = [];
    const wantAnchors = Math.max(1, Math.min(3, Math.round(tiles.length / 160)));
    for (const t of flat.slice(0, Math.max(12, Math.floor(flat.length / 3)))) {
      if (anchors.length >= wantAnchors) break;
      if (anchors.every((a) => dist2(a, t) >= 81)) anchors.push(t);
    }
    const belt = anchors.length ? open.filter((t) => anchors.some((a) => dist2(a, t) <= 36)) : open;
    const farmPool = belt.length >= 6 ? belt : open;
    spread(farmPool, Math.max(2, Math.min(5, Math.round(tiles.length / 90))), 4, 'farmland', id);
    spread(open, Math.max(1, Math.min(3, Math.round(tiles.length / 110))), 4, 'pasture', id);
    spread(open, Math.max(1, Math.min(2, Math.round(tiles.length / 150))), 4, 'orchard', id);
    // Clay lies near the water: just back from the shore, on dry ground.
    const shore = tiles.filter((t) => waterWithin(t, NODE_DRY + 2) <= NODE_DRY + 2);
    if (shore.length > 0) spread(shore, Math.max(1, Math.min(2, Math.round(tiles.length / 160))), 4, 'clay', id);
  }
  for (const [id, tiles] of mountainTiles) {
    // Quarries, mines and coal seams sit at the foot of a mountain: grass within two tiles of the rock, so a road reaches them on the flat.
    const foot = new Set<number>();
    for (const t of tiles) {
      const x = t % width;
      const y = Math.floor(t / width);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const j = idx(x + dx, y + dy);
        if (terrain[j] === 'grass' && y + dy >= ICE_ROWS + 1 && y + dy < height - ICE_ROWS - 1) foot.add(j);
      }
    }
    // Only the lowest half of the foot: down on the plain where the rock meets it, not up the mountain's flank.
    const byHeight = [...foot].sort((a, b) => (elev ? elev[a] - elev[b] : 0));
    const pool = byHeight.slice(0, Math.max(4, Math.ceil(byHeight.length / 2)));
    // The foot has room for only a few, so which kind picks first turns from one mountain to the next.
    const digs: [NodeKind, number][] = [
      ['quarry', Math.max(1, Math.min(2, Math.floor(tiles.length / 10)))],
      ['mine', Math.max(1, Math.min(2, Math.floor(tiles.length / 12)))],
      ['coal', tiles.length >= 8 ? 1 : 0],
    ];
    for (let k = 0; k < digs.length; k++) {
      const [kind, count] = digs[(k + id) % digs.length];
      if (count > 0) spread(pool, count, 4, kind, id, Infinity);
    }
  }

  // Every town has a forest, farmland and pasture within reach, so a first game never starts far from its first chain.
  const reach = 16;
  const near = (p: Place, t: number): number => Math.hypot(wrapDelta(p.x, t % width, width), p.y - Math.floor(t / width));
  const openAny: number[] = [];
  for (let t = 0; t < width * height; t++) {
    const y = Math.floor(t / width);
    if (terrain[t] !== 'grass' || y < ICE_ROWS + 1 || y >= height - ICE_ROWS - 1) continue;
    const x = t % width;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ['water', 'mountain', 'ice'].includes(terrain[idx(x + dx, y + dy)]))) continue;
    openAny.push(t);
  }
  const forestAny = terrain.map((tt, t) => (tt === 'forest' ? t : -1)).filter((t) => t >= 0);
  for (const p of places) {
    for (const [kind, pool] of [['forest', forestAny], ['farmland', openAny], ['pasture', openAny]] as [NodeKind, number[]][]) {
      if (nodes.some((n) => n.kind === kind && near(p, n.y * width + n.x) <= reach)) continue;
      const free = pool
        .filter((t) => near(p, t) <= reach && near(p, t) >= 5 + p.radius - 3 && !nearTown(t, 4) && clear(t) && dry(t) && level(t))
        .sort((a, b) => near(p, a) - near(p, b));
      if (free.length === 0) continue;
      const t = free[Math.min(free.length - 1, 2)];
      nodes.push({ id: nodes.length + 1, kind, x: t % width, y: Math.floor(t / width), quality: quality(), regionId: regionMap[t] });
    }
  }

  // Only keep nodes a town can reach by road: the same land, or across a short bridge. An island with no town on it is
  // scenery until there is a way to ship to it.
  const reachable = new Uint8Array(width * height);
  const queue: number[] = [];
  const land = (t: number): boolean => terrain[t] !== 'water' && terrain[t] !== 'ice';
  for (const p of places) {
    const t = idx(p.x, p.y);
    if (!reachable[t]) {
      reachable[t] = 1;
      queue.push(t);
    }
  }
  for (let qi = 0; qi < queue.length; qi++) {
    const t = queue[qi];
    const x = t % width;
    const y = Math.floor(t / width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      // Step onto land next door, or straight across up to REACH_BRIDGE tiles of water to land on the far side.
      for (let k = 1; k <= REACH_BRIDGE + 1; k++) {
        const ny = y + dy * k;
        if (ny < 0 || ny >= height) break;
        const n = idx(x + dx * k, ny);
        if (land(n)) {
          if (!reachable[n]) {
            reachable[n] = 1;
            queue.push(n);
          }
          break;
        }
        if (terrain[n] !== 'water') break;
      }
    }
  }
  const usable = nodes.filter((n) => reachable[idx(n.x, n.y)]);
  usable.forEach((n, i) => (n.id = i + 1));
  return { regions, regionMap, places, nodes: usable };
}
