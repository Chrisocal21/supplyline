// Paints the globe's colour texture: shorelines, biomes, mountains and snow, ice caps, resource-node patches
// and town ground. The 3D lighting does the shading; this supplies realistic, muted albedo.
import { SEA_LEVEL } from '../sim/defs';
import type { World } from '../sim/world';
import { CAP_ROWS, LAT_SPAN, textureRows } from './geo';

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

type RGB = [number, number, number];

const PAL = {
  grassA: [88, 120, 62] as RGB,
  grassB: [126, 150, 84] as RGB,
  dry: [166, 156, 96] as RGB,
  tundra: [128, 138, 112] as RGB,
  forestA: [48, 76, 46] as RGB,
  forestB: [60, 90, 54] as RGB,
  rockA: [98, 92, 86] as RGB,
  rockB: [158, 148, 134] as RGB,
  snow: [238, 242, 246] as RGB,
  sand: [198, 186, 148] as RGB,
  wetSand: [170, 158, 124] as RGB,
  shallow: [92, 178, 184] as RGB,
  deep: [24, 78, 128] as RGB,
  foam: [226, 238, 238] as RGB,
  ice: [230, 238, 245] as RGB,
  iceB: [196, 214, 230] as RGB,
  soil: [122, 98, 70] as RGB,
  plow: [104, 80, 56] as RGB,
  crop: [132, 140, 66] as RGB,
  gravel: [150, 142, 128] as RGB,
  town: [128, 124, 114] as RGB,
  townCore: [104, 102, 98] as RGB,
};

const N = 512;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (t: number): number => t * t * (3 - 2 * t);
const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Tileable value noise: a random lattice of `period` cells, bilinearly smoothed over an N x N table. */
function latticeTable(period: number, seed: number): Float32Array {
  const rand = mulberry32(seed);
  const lattice = new Float32Array(period * period);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
  const out = new Float32Array(N * N);
  const cell = N / period;
  for (let j = 0; j < N; j++) {
    const fy = j / cell;
    const y0 = Math.floor(fy);
    const ty = smooth(fy - y0);
    const ya = y0 % period;
    const yb = (y0 + 1) % period;
    for (let i = 0; i < N; i++) {
      const fx = i / cell;
      const x0 = Math.floor(fx);
      const tx = smooth(fx - x0);
      const xa = x0 % period;
      const xb = (x0 + 1) % period;
      const top = lattice[ya * period + xa] * (1 - tx) + lattice[ya * period + xb] * tx;
      const bot = lattice[yb * period + xa] * (1 - tx) + lattice[yb * period + xb] * tx;
      out[j * N + i] = top * (1 - ty) + bot * ty;
    }
  }
  return out;
}

let cache: { grain: Float32Array; patch: Float32Array; warp: Float32Array; broad: Float32Array } | null = null;
function noise() {
  if (!cache) {
    const rand = mulberry32(1234);
    const grain = new Float32Array(N * N);
    for (let i = 0; i < grain.length; i++) grain[i] = rand();
    cache = { grain, patch: latticeTable(40, 77), warp: latticeTable(14, 991), broad: latticeTable(6, 313) };
  }
  return cache;
}

interface Fields {
  rows: number;
  water: Float32Array;
  forest: Float32Array;
  mountain: Float32Array;
  ice: Float32Array;
  /** Elevation relief above sea level, 0..1 (0 over water). */
  relief: Float32Array;
  /** Tiles from the nearest land, 0 on land. */
  dist: Float32Array;
  /** Absolute latitude as a fraction of the playable span, per padded row. */
  lat: Float32Array;
}

function buildFields(world: World): Fields {
  const { width: W, height: H, terrain, elev } = world;
  const rows = textureRows(world);
  const water = new Float32Array(W * rows);
  const forest = new Float32Array(W * rows);
  const mountain = new Float32Array(W * rows);
  const ice = new Float32Array(W * rows);
  const relief = new Float32Array(W * rows);
  const dist = new Float32Array(W * rows).fill(-1);
  const lat = new Float32Array(rows);
  for (let r = 0; r < rows; r++) lat[r] = Math.abs(((0.5 - (r + 0.5) / rows) * Math.PI) / LAT_SPAN);

  const queue: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let x = 0; x < W; x++) {
      const i = r * W + x;
      const y = r - CAP_ROWS;
      if (y < 0 || y >= H) {
        ice[i] = 1;
        dist[i] = 6;
        continue;
      }
      const t = terrain[y * W + x];
      water[i] = t === 'water' ? 1 : 0;
      forest[i] = t === 'forest' ? 1 : 0;
      mountain[i] = t === 'mountain' ? 1 : 0;
      ice[i] = t === 'ice' ? 1 : 0;
      relief[i] = Math.max(0, (elev[y * W + x] - SEA_LEVEL) / (255 - SEA_LEVEL));
      if (t !== 'water') {
        dist[i] = 0;
        queue.push(i);
      }
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    const x = i % W;
    const r = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dy;
      if (nr < 0 || nr >= rows) continue;
      const j = nr * W + ((x + dx + W) % W);
      if (dist[j] < 0) {
        dist[j] = dist[i] + 1;
        queue.push(j);
      }
    }
  }
  for (let i = 0; i < dist.length; i++) if (dist[i] < 0) dist[i] = 8;
  return { rows, water, forest, mountain, ice, relief, dist, lat };
}

function bilinear(f: Float32Array, W: number, H: number, u: number, v: number): number {
  const x0 = Math.floor(u);
  const y0 = Math.floor(v);
  const fx = u - x0;
  const fy = v - y0;
  const xa = ((x0 % W) + W) % W;
  const xb = (xa + 1) % W;
  const ya = y0 < 0 ? 0 : y0 >= H ? H - 1 : y0;
  const yb = y0 + 1 < 0 ? 0 : y0 + 1 >= H ? H - 1 : y0 + 1;
  const top = f[ya * W + xa] * (1 - fx) + f[ya * W + xb] * fx;
  const bot = f[yb * W + xa] * (1 - fx) + f[yb * W + xb] * fx;
  return top * (1 - fy) + bot * fy;
}

/** Render the whole globe, pole to pole, at `ppt` pixels per tile. */
export function paintGlobe(world: World, ppt: number): Pixels {
  const W = world.width;
  const f = buildFields(world);
  const rows = f.rows;
  const width = W * ppt;
  const height = rows * ppt;
  const data = new Uint8ClampedArray(width * height * 4);
  const { grain, patch, warp, broad } = noise();
  const s = 16 / ppt;
  const { grassA, grassB, dry, tundra, forestA, forestB, rockA, rockB, snow, sand, wetSand, shallow, deep, foam, ice, iceB } = PAL;

  for (let py = 0; py < height; py++) {
    const v = (py + 0.5) / ppt - 0.5;
    const ny = Math.floor(py * s) & (N - 1);
    const rowLat = f.lat[Math.min(rows - 1, Math.floor((py + 0.5) / ppt))];
    for (let px = 0; px < width; px++) {
      const u = (px + 0.5) / ppt - 0.5;
      const ni = ny * N + (Math.floor(px * s) & (N - 1));
      const g = grain[ni];
      const p = patch[ni];
      const w = warp[ni];
      const b = broad[ni];

      const wv = bilinear(f.water, W, rows, u, v) + (w - 0.5) * 0.34;
      let r: number;
      let gr: number;
      let bl: number;

      if (wv > 0.5) {
        const dv = bilinear(f.dist, W, rows, u, v);
        const t = Math.pow(Math.min(1, Math.max(0, (dv - 0.5) / 4.5)), 0.75) + (p - 0.5) * 0.08;
        r = shallow[0] + (deep[0] - shallow[0]) * t;
        gr = shallow[1] + (deep[1] - shallow[1]) * t;
        bl = shallow[2] + (deep[2] - shallow[2]) * t;
        const edge = wv - 0.5;
        if (edge < 0.05) {
          const k = (1 - edge / 0.05) * 0.5;
          r += (foam[0] - r) * k;
          gr += (foam[1] - gr) * k;
          bl += (foam[2] - bl) * k;
        }
      } else {
        const h = bilinear(f.relief, W, rows, u, v);
        const mt = bilinear(f.mountain, W, rows, u, v) + (p - 0.5) * 0.35;
        const mA = smoothstep(0.38, 0.62, mt);
        const hillA = smoothstep(0.3, 0.58, h) * 0.6 * (0.6 + p * 0.8);
        const rock = Math.max(mA, hillA);

        const fv = bilinear(f.forest, W, rows, u, v) + (p - 0.5) * 0.45 + (w - 0.5) * 0.2;
        const fa = smoothstep(0.42, 0.58, fv);
        const gr0 = grassA[0] + (grassB[0] - grassA[0]) * p;
        const gr1 = grassA[1] + (grassB[1] - grassA[1]) * p;
        const gr2 = grassA[2] + (grassB[2] - grassA[2]) * p;
        // Dry steppe patches, and a cooler tundra tint toward the poles.
        const dr = smoothstep(0.5, 0.74, b + (g - 0.5) * 0.04) * 0.7;
        const tu = smoothstep(0.55, 1.0, rowLat) * 0.7;
        let lr = gr0 + (dry[0] - gr0) * dr;
        let lg = gr1 + (dry[1] - gr1) * dr;
        let lb = gr2 + (dry[2] - gr2) * dr;
        lr += (tundra[0] - lr) * tu;
        lg += (tundra[1] - lg) * tu;
        lb += (tundra[2] - lb) * tu;
        const fo0 = forestA[0] + (forestB[0] - forestA[0]) * p;
        const fo1 = forestA[1] + (forestB[1] - forestA[1]) * p;
        const fo2 = forestA[2] + (forestB[2] - forestA[2]) * p;
        r = lr + (fo0 - lr) * fa;
        gr = lg + (fo1 - lg) * fa;
        bl = lb + (fo2 - lb) * fa;

        if (rock > 0) {
          const k = p * 0.8 + g * 0.2;
          const ro = rockA[0] + (rockB[0] - rockA[0]) * k;
          const rg = rockA[1] + (rockB[1] - rockA[1]) * k;
          const rb = rockA[2] + (rockB[2] - rockA[2]) * k;
          r += (ro - r) * rock;
          gr += (rg - gr) * rock;
          bl += (rb - bl) * rock;
        }
        const sn = smoothstep(0.7, 0.84, h + (p - 0.5) * 0.16 + (g - 0.5) * 0.03);
        if (sn > 0) {
          r += (snow[0] - r) * sn;
          gr += (snow[1] - gr) * sn;
          bl += (snow[2] - bl) * sn;
        }
        const sa = smoothstep(0.16, 0.25, wv) * (1 - rock);
        if (sa > 0) {
          const wet = smoothstep(0.4, 0.5, wv);
          r += (sand[0] + (wetSand[0] - sand[0]) * wet - r) * sa;
          gr += (sand[1] + (wetSand[1] - sand[1]) * wet - gr) * sa;
          bl += (sand[2] + (wetSand[2] - sand[2]) * wet - bl) * sa;
        }
      }

      const iv = bilinear(f.ice, W, rows, u, v) + (w - 0.5) * 0.3;
      const ia = smoothstep(0.42, 0.56, iv);
      if (ia > 0) {
        r += (ice[0] + (iceB[0] - ice[0]) * p - r) * ia;
        gr += (ice[1] + (iceB[1] - ice[1]) * p - gr) * ia;
        bl += (ice[2] + (iceB[2] - ice[2]) * p - bl) * ia;
      }

      const shade = 0.96 + g * 0.08;
      const o = (py * width + px) * 4;
      data[o] = r * shade;
      data[o + 1] = gr * shade;
      data[o + 2] = bl * shade;
      data[o + 3] = 255;
    }
  }

  overlays(world, data, width, height, ppt, patch);
  return { data, width, height };
}

/** Blend a soft-edged patch into the image. `shape(dx, dy)` returns coverage 0..1 in tile units from the centre. */
function stamp(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  ppt: number,
  cx: number,
  cy: number,
  reach: number,
  shape: (dx: number, dy: number, px: number, py: number) => [number, number, number, number] | null,
): void {
  const x0 = Math.floor((cx - reach) * ppt);
  const x1 = Math.ceil((cx + reach) * ppt);
  const y0 = Math.max(0, Math.floor((cy - reach) * ppt));
  const y1 = Math.min(height - 1, Math.ceil((cy + reach) * ppt));
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const wx = ((px % width) + width) % width;
      const res = shape((px + 0.5) / ppt - cx, (py + 0.5) / ppt - cy, wx, py);
      if (!res || res[3] <= 0) continue;
      const o = (py * width + wx) * 4;
      data[o] += (res[0] - data[o]) * res[3];
      data[o + 1] += (res[1] - data[o + 1]) * res[3];
      data[o + 2] += (res[2] - data[o + 2]) * res[3];
    }
  }
}

function overlays(world: World, data: Uint8ClampedArray, width: number, height: number, ppt: number, patch: Float32Array): void {
  const noiseAt = (px: number, py: number): number => patch[((Math.floor(py * (16 / ppt)) & (N - 1)) * N) + (Math.floor(px * (16 / ppt)) & (N - 1))];

  // Towns: worn ground under the buildings.
  for (const pl of world.places) {
    const cx = pl.x + 0.5;
    const cy = pl.y + CAP_ROWS + 0.5;
    const rr = (pl.radius ?? 3) / 3;
    stamp(data, width, height, ppt, cx, cy, 5.6 * rr + 1, (dx, dy, px, py) => {
      const n = noiseAt(px, py);
      const d = (Math.hypot(dx, dy) * (1 + (n - 0.5) * 0.3)) / rr;
      const core = 1 - smoothstep(2.4, 3.6, d);
      const outer = 1 - smoothstep(3.0, 5.4, d);
      if (core > 0) return [PAL.townCore[0], PAL.townCore[1], PAL.townCore[2], 0.5 * core];
      return outer > 0 ? [PAL.town[0], PAL.town[1], PAL.town[2], 0.3 * outer] : null;
    });
  }

  // Resource nodes, each with its own look: a clearing, a patchwork field, a meadow, an orchard, a wet clay bank, a quarry
  // pit or a scree slope. Edges are ragged and fields are turned to their own angle, so nothing reads as a stamped shape.
  for (const nd of world.nodes) {
    const cx = nd.x + 0.5;
    const cy = nd.y + CAP_ROWS + 0.5;
    const ang = (nd.id * 2.399) % (Math.PI * 2);
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    if (nd.kind === 'forest') {
      stamp(data, width, height, ppt, cx, cy, 1.6, (dx, dy, px, py) => {
        const n = noiseAt(px, py);
        const d = Math.hypot(dx, dy) * (1 + (n - 0.5) * 0.6);
        const a = 1 - smoothstep(0.6, 1.1, d);
        const fleck = noiseAt(px * 3.1, py * 3.1) > 0.62 ? 10 : 0;
        return a > 0 ? [PAL.soil[0] + n * 14 + fleck, PAL.soil[1] + n * 12 + fleck, PAL.soil[2] + n * 10, 0.8 * a] : null;
      });
    } else if (nd.kind === 'clay') {
      stamp(data, width, height, ppt, cx, cy, 1.9, (dx, dy, px, py) => {
        const n = noiseAt(px, py);
        const d = Math.hypot(dx * 1.15, dy) * (1 + (n - 0.5) * 0.55);
        const bank = 1 - smoothstep(0.75, 1.3, d);
        if (bank <= 0) return null;
        const wet = 1 - smoothstep(0.18, 0.55, d);
        const r = 176 + n * 20;
        const g = 108 + n * 14;
        const bl = 76 + n * 10;
        return [r * (1 - wet) + 112 * wet, g * (1 - wet) + 98 * wet, bl * (1 - wet) + 96 * wet, 0.88 * bank];
      });
    } else if (nd.kind === 'pasture') {
      stamp(data, width, height, ppt, cx, cy, 2.4, (dx, dy, px, py) => {
        const n = noiseAt(px, py);
        const d = Math.hypot(dx, dy * 1.1) * (1 + (n - 0.5) * 0.5);
        const a = 1 - smoothstep(1.0, 1.55, d);
        if (a <= 0) return null;
        const patch = noiseAt(px * 1.7, py * 1.7);
        return [112 + patch * 26, 158 + patch * 18, 80 + patch * 12, 0.82 * a];
      });
    } else if (nd.kind === 'orchard') {
      stamp(data, width, height, ppt, cx, cy, 2.3, (dx, dy, px, py) => {
        const n = noiseAt(px, py);
        const lx = dx * ca + dy * sa;
        const ly = -dx * sa + dy * ca;
        const ex = Math.abs(lx) - 1.05 + (n - 0.5) * 0.3;
        const ey = Math.abs(ly) - 0.85 + (n - 0.5) * 0.3;
        const a = 1 - smoothstep(0, 0.16, Math.max(ex, ey));
        if (a <= 0) return null;
        const dot = Math.sin(lx * 10) * Math.sin(ly * 10) > 0.55 ? 1 : 0;
        return [dot ? 70 : 100, dot ? 114 : 142, dot ? 58 : 74, 0.88 * a];
      });
    } else if (nd.kind === 'farmland') {
      // A patchwork of strips in different crops, edged with a hedge, turned to its own angle.
      const crops = [PAL.crop, PAL.plow, [188, 164, 84] as [number, number, number]];
      stamp(data, width, height, ppt, cx, cy, 2.4, (dx, dy, px, py) => {
        const n = noiseAt(px, py);
        const lx = dx * ca + dy * sa;
        const ly = -dx * sa + dy * ca;
        const ex = Math.abs(lx) - 1.2 + (n - 0.5) * 0.34;
        const ey = Math.abs(ly) - 0.95 + (n - 0.5) * 0.34;
        const edge = Math.max(ex, ey);
        const a = 1 - smoothstep(0, 0.14, edge);
        if (a <= 0) return null;
        if (edge > -0.1) return [60, 94, 52, 0.92 * a];
        const strip = Math.max(0, Math.min(2, Math.floor((lx + 1.2) / 0.8)));
        const base = crops[(nd.id + strip) % 3];
        const row = Math.sin(ly * 30 + strip) > 0 ? 1 : 0;
        const k = row ? 1 : 0.86;
        return [base[0] * k, base[1] * k, base[2] * k, 0.92 * a];
      });
    } else if (nd.kind === 'quarry') {
      // A pit: a pale floor ringed by darker terraced rock walls.
      stamp(data, width, height, ppt, cx, cy, 2.3, (dx, dy, px, py) => {
        const n = noiseAt(px, py);
        const d = Math.hypot(dx, dy) * (1 + (n - 0.5) * 0.4);
        const floor = 1 - smoothstep(0.8, 1.0, d);
        if (floor > 0) return [PAL.gravel[0] + 22 + n * 16, PAL.gravel[1] + 20 + n * 14, PAL.gravel[2] + 16 + n * 12, 0.95 * floor];
        const wall = 1 - smoothstep(1.3, 2.0, d);
        if (wall <= 0) return null;
        const band = 0.84 + 0.16 * Math.sin(d * 15);
        return [(PAL.gravel[0] - 14) * band + n * 12, (PAL.gravel[1] - 14) * band + n * 10, (PAL.gravel[2] - 12) * band + n * 8, 0.8 * wall];
      });
    } else {
      // Ore and coal lie in a scree slope under the hill, not in a pit: rubble in a ragged patch.
      const coal = nd.kind === 'coal';
      stamp(data, width, height, ppt, cx, cy, 1.9, (dx, dy, px, py) => {
        const n = noiseAt(px, py);
        const d = Math.hypot(dx, dy * 0.9) * (1 + (n - 0.5) * 0.7);
        const a = 1 - smoothstep(0.7, 1.35, d);
        if (a <= 0) return null;
        const speck = noiseAt(px * 4.3, py * 4.3) > 0.64 ? 0.78 : 1;
        return coal ? [(54 + n * 26) * speck, (54 + n * 26) * speck, (58 + n * 26) * speck, 0.9 * a] : [(126 + n * 30) * speck, (92 + n * 24) * speck, (80 + n * 22) * speck, 0.9 * a];
      });
    }
  }
}

/** Per-texel roughness for the globe: smooth, glossy water and matte land. Green channel is what Three.js reads. */
export function paintRoughness(world: World, ppt = 4): Pixels {
  const W = world.width;
  const f = buildFields(world);
  const rows = f.rows;
  const width = W * ppt;
  const height = rows * ppt;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let py = 0; py < height; py++) {
    const v = (py + 0.5) / ppt - 0.5;
    for (let px = 0; px < width; px++) {
      const u = (px + 0.5) / ppt - 0.5;
      const wv = bilinear(f.water, W, rows, u, v);
      const iv = bilinear(f.ice, W, rows, u, v);
      const rough = wv > 0.5 && iv < 0.5 ? 0.42 : iv > 0.5 ? 0.6 : 0.93;
      const o = (py * width + px) * 4;
      data[o] = data[o + 1] = data[o + 2] = rough * 255;
      data[o + 3] = 255;
    }
  }
  return { data, width, height };
}
