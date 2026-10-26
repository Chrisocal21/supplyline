// Paints the globe's colour texture: shorelines, biomes, mountains and snow, ice caps, resource-node patches
// and town ground. Broad painted colour shapes supply the albedo; 3D lighting supplies the shading.
import { corridorTiles } from '../sim/corridors';
import { SEA_LEVEL, isSoftNode } from '../sim/defs';
import { isDesert } from '../sim/desert';
import { townGround, townTiles, type World } from '../sim/world';
import { CAP_ROWS, LAT_SPAN, textureRows } from './geo';

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

type RGB = [number, number, number];

const PAL = {
  grassA: [53, 119, 83] as RGB,
  grassB: [155, 180, 94] as RGB,
  dry: [193, 168, 112] as RGB,
  tundra: [122, 142, 116] as RGB,
  duneA: [196, 164, 108] as RGB,
  duneB: [222, 192, 134] as RGB,
  duneDark: [168, 134, 88] as RGB,
  forestA: [42, 91, 76] as RGB,
  forestB: [88, 129, 83] as RGB,
  rockA: [88, 105, 112] as RGB,
  rockB: [181, 168, 145] as RGB,
  snow: [238, 242, 246] as RGB,
  sand: [213, 190, 143] as RGB,
  wetSand: [176, 151, 111] as RGB,
  shallow: [96, 208, 202] as RGB,
  mid: [40, 150, 188] as RGB,
  deep: [16, 66, 126] as RGB,
  foam: [238, 246, 242] as RGB,
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
  /** 1 on desert ground (Map 3 on), else 0. */
  desert: Float32Array;
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
  const desert = new Float32Array(W * rows);
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
      desert[i] = isDesert(world, x, y) ? 1 : 0;
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
  return { rows, water, forest, mountain, ice, desert, relief, dist, lat };
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
  const { grassA, grassB, dry, tundra, duneA, duneB, duneDark, forestA, forestB, rockA, rockB, snow, sand, wetSand, shallow, mid, deep, foam, ice, iceB } = PAL;

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
        // Bright turquoise shallows hugging the shore, easing through clear blue to deep navy further out.
        const d = dv + (p - 0.5) * 0.35 + (g - 0.5) * 0.1;
        const t1 = smoothstep(0.5, 3.2, d);
        const t2 = smoothstep(3.0, 8.0, d);
        r = shallow[0] + (mid[0] - shallow[0]) * t1 + (deep[0] - mid[0]) * t2;
        gr = shallow[1] + (mid[1] - shallow[1]) * t1 + (deep[1] - mid[1]) * t2;
        bl = shallow[2] + (mid[2] - shallow[2]) * t1 + (deep[2] - mid[2]) * t2;
        // Foam: a thin broken pale line where the water meets the beach.
        const edge = 1 - smoothstep(0.5, 0.78, dv + (p - 0.5) * 0.45 + (w - 0.5) * 0.3);

        const fa = Math.min(1, edge * 0.8);
        r += (foam[0] - r) * fa;
        gr += (foam[1] - gr) * fa;
        bl += (foam[2] - bl) * fa;
      } else {
        const h = bilinear(f.relief, W, rows, u, v);
        const mt = bilinear(f.mountain, W, rows, u, v) + (p - 0.5) * 0.35;
        const mA = smoothstep(0.30, 0.68, mt);
        const hillA = smoothstep(0.3, 0.58, h) * 0.6 * (0.6 + p * 0.8);
        const rock = Math.max(mA, hillA);

        const fv = bilinear(f.forest, W, rows, u, v) + (p - 0.5) * 0.45 + (w - 0.5) * 0.2;
        const fa = smoothstep(0.30, 0.70, fv);
        // Broad, gently edged painted masses. Existing fields supply all the detail at texture-bake time.
        const meadow = smoothstep(0.28, 0.72, b * 0.55 + w * 0.30 + p * 0.15);
        const gr0 = grassA[0] + (grassB[0] - grassA[0]) * meadow;
        const gr1 = grassA[1] + (grassB[1] - grassA[1]) * meadow;
        const gr2 = grassA[2] + (grassB[2] - grassA[2]) * meadow;
        // Dry steppe patches, and a cooler tundra tint toward the poles.
        // Keep golden grass as an accent instead of turning most bright meadow patches brown.
        const dr = smoothstep(0.62, 0.84, b + (p - 0.5) * 0.08) * 0.42;
        const tu = smoothstep(0.55, 1.0, rowLat) * 0.7;
        let lr = gr0 + (dry[0] - gr0) * dr;
        let lg = gr1 + (dry[1] - gr1) * dr;
        let lb = gr2 + (dry[2] - gr2) * dr;
        lr += (tundra[0] - lr) * tu;
        lg += (tundra[1] - lg) * tu;
        lb += (tundra[2] - lb) * tu;
        const floor = b * 0.65 + p * 0.35;
        const fo0 = forestA[0] + (forestB[0] - forestA[0]) * floor;
        const fo1 = forestA[1] + (forestB[1] - forestA[1]) * floor;
        const fo2 = forestA[2] + (forestB[2] - forestA[2]) * floor;
        r = lr + (fo0 - lr) * fa;
        gr = lg + (fo1 - lg) * fa;
        bl = lb + (fo2 - lb) * fa;
        // Desert: pale sand in long soft ripples with darker drifts, over whatever grew there.
        const dv = bilinear(f.desert, W, rows, u, v) + (p - 0.5) * 0.3 + (w - 0.5) * 0.2;
        const da = smoothstep(0.4, 0.6, dv);
        if (da > 0) {
          const ripple = 0.5 + 0.5 * Math.sin((px + b * 140 + w * 60) * 0.045 + (py + p * 40) * 0.02);
          const k = p * 0.55 + ripple * 0.3 + g * 0.15;
          const dk = smoothstep(0.62, 0.9, b + (g - 0.5) * 0.1) * 0.5;
          const d0 = duneA[0] + (duneB[0] - duneA[0]) * k + (duneDark[0] - duneA[0]) * dk;
          const d1 = duneA[1] + (duneB[1] - duneA[1]) * k + (duneDark[1] - duneA[1]) * dk;
          const d2 = duneA[2] + (duneB[2] - duneA[2]) * k + (duneDark[2] - duneA[2]) * dk;
          r += (d0 - r) * da;
          gr += (d1 - gr) * da;
          bl += (d2 - bl) * da;
        }

        if (rock > 0) {
          // Broad stone strata and painted faces, baked into the existing colour map.
          // Warp the altitude bands so they follow irregular rock rather than drawing ruler-straight rings.
          const strataHeight = h + (w - 0.5) * 0.16 + (b - 0.5) * 0.08;
          const strata = smoothstep(0.20, 0.30, strataHeight) * 0.32
            + smoothstep(0.44, 0.56, strataHeight) * 0.38
            + smoothstep(0.70, 0.82, strataHeight) * 0.30;
          const face = smoothstep(0.28, 0.72, p * 0.55 + w * 0.45);
          const k = strata * 0.60 + face * 0.40;
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
        const sa = smoothstep(0.08, 0.32, wv) * (1 - rock);
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

      // Keep water unchanged; land gets soft painted variation instead of high-frequency speckle.
      const shade = wv > 0.5 ? 0.96 + g * 0.08 : 0.97 + p * 0.05 + g * 0.01;
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

  // Towns: worn ground along the strip they cover. Each tile paints its own square, and the edge of the strip fades out
  // into the grass with a ragged margin.
  for (const pl of world.places) {
    const tiles = townGround(world, pl);
    const has = new Set(tiles.map((t) => t.x + ',' + t.y));
    const wrapT = (x: number): number => ((x % world.width) + world.width) % world.width;
    for (const t of tiles) {
      stamp(data, width, height, ppt, t.x + 0.5, t.y + CAP_ROWS + 0.5, 1.6, (dx, dy, px, py) => {
        const ox = Math.round(dx);
        const oy = Math.round(dy);
        if ((ox !== 0 || oy !== 0) && has.has(wrapT(t.x + ox) + ',' + (t.y + oy))) return null;
        const n = noiseAt(px, py);
        const out = Math.max(0, Math.max(Math.abs(dx), Math.abs(dy)) - 0.5) * (1 + (n - 0.5) * 0.6);
        const a = 1 - smoothstep(0, 0.9, out);
        if (a <= 0) return null;
        return out === 0 ? [PAL.townCore[0], PAL.townCore[1], PAL.townCore[2], 0.42] : [PAL.town[0], PAL.town[1], PAL.town[2], 0.3 * a];
      });
    }
  }

  // The natural routes between towns (the lanes kept clear of trees) are worn into dirt tracks, so a gap in a wood reads as a
  // way through and not a bald strip. A road laid along one will take it over.
  const inTown = new Set<number>();
  for (const pl of world.places) for (const t of townTiles(world, pl)) inTown.add(t.y * world.width + t.x);
  // Each track is one continuous strip: every tile joins the neighbour tiles on the route with a band, and the bands are
  // merged in a mask first so the joins do not show.
  const route = corridorTiles(world);
  const W = world.width;
  const wornAt = (x: number, y: number): boolean => {
    const k = y * W + ((x % W) + W) % W;
    const terr = world.terrain[k];
    return route.has(k) && (terr === 'grass' || terr === 'forest') && !inTown.has(k);
  };
  const mask = new Float32Array(width * height);
  const SEGS: [number, number][] = [[1, 0], [0, 1], [1, 1], [-1, 1]];
  for (const k of route) {
    const tx = k % W;
    const ty = (k - tx) / W;
    if (!wornAt(tx, ty)) continue;
    const links = SEGS.filter(([ox, oy]) => wornAt(tx + ox, ty + oy));
    const cx = tx + 0.5;
    const cy = ty + CAP_ROWS + 0.5;
    const x0 = Math.floor((cx - 1.5) * ppt);
    const x1 = Math.ceil((cx + 1.5) * ppt);
    const y0 = Math.max(0, Math.floor((cy - 1.5) * ppt));
    const y1 = Math.min(height - 1, Math.ceil((cy + 1.5) * ppt));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dx = (px + 0.5) / ppt - cx;
        const dy = (py + 0.5) / ppt - cy;
        let d = Math.hypot(dx, dy);
        for (const [ox, oy] of links) {
          const t = Math.max(0, Math.min(1, (dx * ox + dy * oy) / (ox * ox + oy * oy)));
          d = Math.min(d, Math.hypot(dx - t * ox, dy - t * oy));
        }
        if (d > 0.45) continue;
        const wx = ((px % width) + width) % width;
        const n = noiseAt(wx, py);
        const cover = 1 - smoothstep(0.16, 0.28, d * (1 + (n - 0.5) * 0.45));
        const o = py * width + wx;
        if (cover > mask[o]) mask[o] = cover;
      }
    }
  }
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const cover = mask[py * width + px];
      if (cover <= 0) continue;
      const n = noiseAt(px, py);
      const rut = noiseAt(px * 2.3, py * 2.3) > 0.55 ? 8 : 0;
      const o = (py * width + px) * 4;
      const al = 0.78 * cover;
      data[o] += (PAL.soil[0] + 22 + n * 14 + rut - data[o]) * al;
      data[o + 1] += (PAL.soil[1] + 16 + n * 12 + rut - data[o + 1]) * al;
      data[o + 2] += (PAL.soil[2] + 8 + n * 8 - data[o + 2]) * al;
    }
  }

  // Resource nodes, each with its own look: a clearing, a patchwork field, a meadow, an orchard, a wet clay bank, a quarry
  // pit or a scree slope. Edges are ragged and fields are turned to their own angle, so nothing reads as a stamped shape.
  for (const nd of world.nodes) {
    // Fields, pastures and orchards come with the farm that is built, not with the map.
    if (isSoftNode(nd.kind)) continue;
    const cx = nd.x + 0.5;
    const cy = nd.y + CAP_ROWS + 0.5;
    // Fields lie square to the compass, as the farm buildings do, so the farmstead sits in line with its crops.
    const ang = nd.kind === 'farmland' ? (nd.id % 4) * (Math.PI / 2) : (nd.id * 2.399) % (Math.PI * 2);
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
        // The farmyard in the middle, where the road comes in and the farm buildings stand: packed earth and gravel,
        // with a track running out through the crops to either end of the field.
        const yard = Math.max(Math.abs(lx) - 0.58, Math.abs(ly) - 0.56) + (n - 0.5) * 0.08;
        const track = Math.abs(ly) < 0.07 + (n - 0.5) * 0.02;
        if (yard < 0 || track) return [146 + n * 22, 128 + n * 18, 98 + n * 14, 0.95 * a];
        if (yard < 0.08) return [72, 104, 58, 0.92 * a];
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

/** Packed terrain data: red = mountain coverage, green = roughness (Three.js), blue = soft halo round mountains. */
export function paintRoughness(world: World, ppt = 4): Pixels {
  const W = world.width;
  const f = buildFields(world);
  // How near each tile is to a mountain, fading out over three tiles, so grass beside rock can dry toward earth well before the wall.
  const halo = new Float32Array(W * f.rows);
  for (let r = 0; r < f.rows; r++) {
    for (let x = 0; x < W; x++) {
      let best = 0;
      for (let dy = -3; dy <= 3; dy++) {
        const nr = r + dy;
        if (nr < 0 || nr >= f.rows) continue;
        for (let dx = -3; dx <= 3; dx++) {
          if (f.mountain[nr * W + ((x + dx + W) % W)] > 0.5) best = Math.max(best, 1 - Math.max(Math.abs(dx), Math.abs(dy)) / 3.6);
        }
      }
      halo[r * W + x] = best;
    }
  }
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
      data[o] = smoothstep(0.25, 0.75, bilinear(f.mountain, W, rows, u, v)) * (1 - wv) * (1 - iv) * 255;
      data[o + 1] = rough * 255;
      // Blue: a wide, soft halo around mountains, so the shader can tint the grass beside rock toward dry earth.
      data[o + 2] = bilinear(halo, W, rows, u, v) * (1 - wv) * (1 - iv) * 255;
      data[o + 3] = 255;
    }
  }
  return { data, width, height };
}
