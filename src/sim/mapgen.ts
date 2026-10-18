// Seeded terrain generation on a sphere. Pure functions, no graphics.
import { MOUNTAIN_ELEV, SEA_LEVEL, type Terrain } from './defs';

/** A map a third as tall as it is wide covers this latitude on each side of the equator; beyond it are the polar caps. Taller maps cover more. */
export const LAT_SPAN_DEG = 60;
export const LAND_FRACTION = 0.36;
/** Share of land that is mountain range and forest. Thresholds come from percentiles of the noise, so these hold for any seed. */
const MOUNTAIN_SHARE = 0.17;
const FOREST_SHARE = 0.3;
const ICE_ROWS = 2;

function hash3(seed: number, x: number, y: number, z: number): number {
  let t = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);
const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** 3D value noise in [0, 1]. Sampling it with points on a sphere gives terrain with no seams or pole pinching. */
export function noise3(seed: number, x: number, y: number, z: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const fz = smooth(z - z0);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(seed, x0 + dx, y0 + dy, z0 + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), fx), lerp(c(0, 1, 0), c(1, 1, 0), fx), fy),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), fx), lerp(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  );
}

export function fbm3(seed: number, x: number, y: number, z: number, octaves = 4): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise3(seed + o * 101, x * f, y * f, z * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

/** Longitude and latitude (radians) of a tile centre. Row 0 is the north edge of the grid. */
export function tileLonLat(width: number, height: number, x: number, y: number): { lon: number; lat: number } {
  return {
    lon: ((x + 0.5) / width) * Math.PI * 2 - Math.PI,
    // A tile spans the same angle north-south as east-west.
    lat: (0.5 - (y + 0.5) / height) * ((2 * Math.PI * height) / width),
  };
}

export interface Land {
  terrain: Terrain[];
  /** 0..255. Below SEA_LEVEL is sea floor. */
  elev: number[];
}

export function generateLand(width: number, height: number, seed: number): Land {
  const n = width * height;
  const raw = new Float32Array(n);
  const ridge = new Float32Array(n);
  const wet = new Float32Array(n);
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const pz = new Float32Array(n);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { lon, lat } = tileLonLat(width, height, x, y);
      const i = y * width + x;
      const X = Math.cos(lat) * Math.sin(lon);
      const Y = Math.sin(lat);
      const Z = Math.cos(lat) * Math.cos(lon);
      px[i] = X;
      py[i] = Y;
      pz[i] = Z;
      // Domain warp for organic coastlines, then blend continent-scale and regional noise.
      const wx = (noise3(seed + 11, X * 1.7, Y * 1.7, Z * 1.7) - 0.5) * 0.9;
      const wy = (noise3(seed + 12, X * 1.7, Y * 1.7, Z * 1.7) - 0.5) * 0.9;
      const wz = (noise3(seed + 13, X * 1.7, Y * 1.7, Z * 1.7) - 0.5) * 0.9;
      const cont = fbm3(seed + 20, X * 1.15 + wx, Y * 1.15 + wy, Z * 1.15 + wz, 4);
      const reg = fbm3(seed + 30, X * 3.4 + wx, Y * 3.4 + wy, Z * 3.4 + wz, 4);
      raw[i] = cont * 0.7 + reg * 0.3;
      ridge[i] = 1 - Math.abs(2 * fbm3(seed + 40, X * 4.4, Y * 4.4, Z * 4.4, 3) - 1);
      wet[i] = fbm3(seed + 50, X * 3.2, Y * 3.2, Z * 3.2, 4);
    }
  }

  const sorted = Array.from(raw).sort((a, b) => a - b);
  const sea = sorted[Math.floor(n * (1 - LAND_FRACTION))];
  const lo = sorted[0];
  const hi = sorted[n - 1];

  const landIdx: number[] = [];
  for (let i = 0; i < n; i++) {
    const y = Math.floor(i / width);
    if (y >= ICE_ROWS && y < height - ICE_ROWS && raw[i] > sea) landIdx.push(i);
  }
  const percentile = (values: Float32Array, q: number): number => {
    const v = landIdx.map((i) => values[i]).sort((a, b) => a - b);
    return v[Math.min(v.length - 1, Math.floor(v.length * q))];
  };
  const ridgeLo = percentile(ridge, 1 - MOUNTAIN_SHARE * 1.6);
  const ridgeHi = percentile(ridge, 0.995);
  const wetCut = percentile(wet, 1 - FOREST_SHARE);

  const terrain = new Array<Terrain>(n);
  const elev = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const y = Math.floor(i / width);
    if (y < ICE_ROWS || y >= height - ICE_ROWS) {
      terrain[i] = 'ice';
      elev[i] = SEA_LEVEL + 4;
      continue;
    }
    if (raw[i] <= sea) {
      const depth = Math.min(1, (sea - raw[i]) / (sea - lo + 1e-6));
      terrain[i] = 'water';
      elev[i] = Math.round(SEA_LEVEL - 4 - depth * (SEA_LEVEL - 14));
      continue;
    }
    const h01 = Math.min(1, (raw[i] - sea) / (hi - sea + 1e-6));
    // Mountain ranges grow where ridged noise is high, a little inland from the coast.
    const range = smoothstep(ridgeLo, ridgeHi, ridge[i]) * smoothstep(0.04, 0.22, h01);
    const h = Math.min(1, Math.pow(h01, 1.5) * 0.3 + range * 0.85);
    const e = Math.round(SEA_LEVEL + 2 + h * (255 - SEA_LEVEL - 2));
    elev[i] = e;
    if (e >= MOUNTAIN_ELEV) terrain[i] = 'mountain';
    else if (wet[i] > wetCut && e < MOUNTAIN_ELEV - 14) terrain[i] = 'forest';
    else terrain[i] = 'grass';
  }
  carveRivers(terrain, elev, width, height, seed);
  return { terrain, elev };
}

/** Rivers only run through lowland: ground no more than this far above the sea. Higher ground would need a deep gorge. */
const RIVER_RISE = 22;

/**
 * Rivers and lakes. Each river starts at the coast and runs inland through the lowland, wandering, until the ground rises
 * or it has gone far enough, and ends in a small lake. They are one tile wide, so a road crosses them by a bridge, and they
 * are cut before any town or resource is placed, so everything else is laid out around them.
 */
function carveRivers(terrain: Terrain[], elev: number[], width: number, height: number, seed: number): void {
  const idx = (x: number, y: number): number => y * width + ((x % width) + width) % width;
  const rnd = (a: number, b: number): number => hash3(seed + 77, a, b, 5);
  const land = (t: number): boolean => terrain[t] === 'grass' || terrain[t] === 'forest';
  const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const starts: number[] = [];
  let landCount = 0;
  for (let y = ICE_ROWS + 4; y < height - ICE_ROWS - 4; y++) {
    for (let x = 0; x < width; x++) {
      const t = idx(x, y);
      if (!land(t)) continue;
      landCount++;
      if (elev[t] > SEA_LEVEL + 8) continue;
      if (DIRS.some(([dx, dy]) => terrain[idx(x + dx, y + dy)] === 'water')) starts.push(t);
    }
  }
  const want = Math.max(2, Math.round(landCount / 1100));
  const used = new Set<number>();
  let made = 0;
  for (let k = 0; k < starts.length * 3 && made < want; k++) {
    const mouth = starts[Math.floor(rnd(k, 1) * starts.length)];
    if (used.has(mouth)) continue;
    // Rivers keep apart: no second mouth within a few tiles of another.
    const mx = mouth % width;
    const my = Math.floor(mouth / width);
    let near = false;
    for (const u of used) if (Math.abs(((u % width) - mx + width * 1.5) % width - width / 2) < 8 && Math.abs(Math.floor(u / width) - my) < 8) near = true;
    if (near) continue;
    const length = 8 + Math.floor(rnd(k, 2) * 14);
    const path: number[] = [mouth];
    const seen = new Set<number>([mouth]);
    const waterAt = (t: number): boolean => terrain[t] === 'water';
    let cur = mouth;
    let heading = DIRS.findIndex(([dx, dy]) => waterAt(idx((cur % width) + dx, Math.floor(cur / width) + dy)));
    // Inland is away from the water the mouth touches.
    heading = heading ^ 1;
    for (let step = 0; step < length; step++) {
      const x = cur % width;
      const y = Math.floor(cur / width);
      // Mostly straight on, sometimes turning, never back; the gentlest rise wins.
      const options = DIRS.map(([dx, dy], d) => ({ d, t: idx(x + dx, y + dy), turn: d === heading ? 0 : d === (heading ^ 1) ? 9 : 1 }))
        .filter((o) => o.turn < 9 && land(o.t) && !seen.has(o.t) && elev[o.t] <= SEA_LEVEL + RIVER_RISE && Math.floor(o.t / width) > ICE_ROWS + 3 && Math.floor(o.t / width) < height - ICE_ROWS - 4)
        // No braiding: the next tile touches no water but the river itself.
        .filter((o) => DIRS.every(([dx, dy]) => { const n = idx((o.t % width) + dx, Math.floor(o.t / width) + dy); return n === cur || !waterAt(n) && !path.includes(n) || n === cur; }))
        .map((o) => ({ ...o, score: o.turn * 0.9 + Math.max(0, elev[o.t] - elev[cur]) * 0.15 + rnd(cur, step + o.d * 13) * 1.4 }))
        .sort((a, b) => a.score - b.score);
      if (options.length === 0) break;
      cur = options[0].t;
      heading = options[0].d;
      path.push(cur);
      seen.add(cur);
    }
    if (path.length < 6) continue;
    for (const t of path) {
      terrain[t] = 'water';
      elev[t] = SEA_LEVEL - 3;
      used.add(t);
    }
    // The river rises in a small lake.
    const head = path[path.length - 1];
    const hx = head % width;
    const hy = Math.floor(head / width);
    const r = 1 + Math.floor(rnd(k, 3) * 2);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r + 1) continue;
        const t = idx(hx + dx, hy + dy);
        if (!land(t) || elev[t] > SEA_LEVEL + RIVER_RISE || Math.floor(t / width) <= ICE_ROWS + 3 || Math.floor(t / width) >= height - ICE_ROWS - 4) continue;
        terrain[t] = 'water';
        elev[t] = SEA_LEVEL - 3;
      }
    }
    made++;
  }
}
