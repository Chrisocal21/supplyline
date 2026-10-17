// Mapping between the sim's tile grid and the 3D globe, and the terrain height field.
import * as THREE from 'three';
import { SEA_LEVEL } from '../sim/defs';
import { LAT_SPAN_DEG, fbm3, tileLonLat } from '../sim/mapgen';
import { townTiles, type Tile, type World } from '../sim/world';

/** Globe radius in world units. One tile is about 3.3 units wide at the equator. */
export let R = 100;
/** Terrain relief: how far the highest peak stands above sea level. */
export const MAX_RELIEF = 6.5;
/** Rows of polar cap texture beyond the playable grid, on each side. */
export let CAP_ROWS = 16;

/** Size the globe for a world: tiles stay the same size on the ground, so a wider world is a bigger planet. */
export function setGlobeSize(world: World): void {
  R = (100 * world.width) / 192;
  CAP_ROWS = Math.round(world.height / 4);
}
/** Terrain mesh vertices per tile, in each direction. */
export const MESH_SUB = 3;
export const LAT_SPAN = (LAT_SPAN_DEG * Math.PI) / 180;

/** Texture rows: the playable grid plus polar caps, covering pole to pole. */
export const textureRows = (world: World): number => world.height + 2 * CAP_ROWS;

export function lonLatToVec(lon: number, lat: number, r: number, out = new THREE.Vector3()): THREE.Vector3 {
  const c = Math.cos(lat);
  return out.set(r * c * Math.sin(lon), r * Math.sin(lat), r * c * Math.cos(lon));
}

export function vecToLonLat(v: THREE.Vector3): { lon: number; lat: number } {
  const r = v.length();
  return { lon: Math.atan2(v.x, v.z), lat: Math.asin(THREE.MathUtils.clamp(v.y / r, -1, 1)) };
}

/** East, up (surface normal) and north directions at a point on the globe. */
export function surfaceFrame(lon: number, lat: number): { east: THREE.Vector3; up: THREE.Vector3; north: THREE.Vector3 } {
  const up = lonLatToVec(lon, lat, 1);
  const east = new THREE.Vector3(Math.cos(lon), 0, -Math.sin(lon)).normalize();
  const north = new THREE.Vector3().crossVectors(up, east).normalize();
  return { east, up, north };
}

/** Normalised displacement of land above sea level, 0 at the coast and 1 at the highest peak. */
const elevToRelief = (e: number): number => {
  if (e < SEA_LEVEL) return 0;
  const t = (e - SEA_LEVEL) / (255 - SEA_LEVEL);
  return 0.04 + Math.pow(t, 1.45) * MAX_RELIEF;
};

/** A levelled patch of ground: towns sit on flat plateaus and quarries are dug down into the foot of a mountain. */
interface Pad {
  x: number;
  y: number;
  height: number;
  /** Fully levelled out to this radius (in tiles), blending back to the natural ground by `outer`. */
  core: number;
  outer: number;
}

/** How a graded stretch ends: not at all, blending out all round, or cut off square at a tunnel mouth. */
type Cap = 0 | 1 | 2;
const CAP_NONE: Cap = 0;
const CAP_ROUND: Cap = 1;
const CAP_SHARP: Cap = 2;

/** A stretch of graded ground along a road, cut or filled so the road sits level on it. Tile units. */
interface Cut {
  ax: number;
  ay: number;
  dx: number;
  dy: number;
  len: number;
  ha: number;
  hb: number;
  capA: Cap;
  capB: Cap;
}

/** A road bed is fully level this far from its centre line (in tiles), blending back to the natural ground by GRADE_OUTER. */
const GRADE_CORE = 0.4;
const GRADE_OUTER = 1.0;
/** The terrain mesh has three rows of vertices per tile; tunnel mouths stand on those rows. */
const ROW = 1 / 3;
/** A hill must stand this far above the road before the road tunnels under it. Lower ground is cut through instead. */
const TUNNEL_COVER = 1.5;
/** The hillside must also stand this high half a tile either side of the road, so a mouth is set into a slope and not left standing free. */
const TUNNEL_FLANK = 0.7;
/** Vehicles are hidden this far inside a tunnel mouth, when the hill above cannot be trusted to hide them. */
const HIDE_INSET = 0.37;

/** How a road runs along one tile edge that touches a mountain. `t` goes from the first tile to the second. */
export interface EdgeProfile {
  /** Height of the road bed at each end. */
  la: number;
  lb: number;
  /** Stretches underground. */
  covered: [number, number][];
  /** Stretches where vehicles should not be drawn. */
  hidden: [number, number][];
  /** Tunnel mouths: where the face stands, which way the tunnel runs (+1 toward the second tile) and how deep the frame may go, in tiles. */
  portals: { t: number; into: 1 | -1; depth: number }[];
}

interface Run {
  tiles: Tile[];
  startLand: boolean;
  endLand: boolean;
  high: boolean[];
  merged: boolean[];
  level: (s: number) => number;
}

/** Bilinear terrain height over the globe, matching what the terrain mesh shows. */
export class HeightField {
  private readonly relief: Float32Array;
  private readonly seed: number;
  private readonly pads: Pad[] = [];
  /** Per tile: index of the pad that levels it, or -1. */
  private readonly padOf: Int16Array;
  /** Graded road beds, bucketed by the tiles they reach. */
  private cuts = new Map<number, Cut[]>();
  /** How roads run along the tile edges that touch mountains, keyed by the two tiles in order. */
  private profiles = new Map<string, EdgeProfile>();
  /** Road level under each mountain tile a road passes through. */
  private levels = new Map<number, number>();

  constructor(private readonly world: World) {
    this.seed = world.seed + 7;
    this.relief = new Float32Array(world.width * world.height);
    for (let i = 0; i < this.relief.length; i++) this.relief[i] = elevToRelief(world.elev[i]);
    this.padOf = new Int16Array(world.width * world.height).fill(-1);
    // A town is one flat model, so the ground along its whole strip is levelled to the height of its centre.
    for (const p of world.places) {
      const height = this.relief[p.y * world.width + p.x];
      for (const t of townTiles(world, p)) this.addPad({ x: t.x + 0.5, y: t.y + 0.5, height, core: 0.9, outer: 2.2 });
    }
    for (const n of world.nodes) {
      const here = this.relief[n.y * world.width + n.x];
      if (n.kind !== 'quarry' && n.kind !== 'mine' && n.kind !== 'coal') {
        // Farms, camps, pits and pastures stand on a level yard at the height of the ground round them, blended back
        // into the land, so the buildings and the slab under them never perch on a slope.
        let sum = 0;
        let cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const y = Math.min(world.height - 1, Math.max(0, n.y + dy));
            const x = (((n.x + dx) % world.width) + world.width) % world.width;
            const r = this.relief[y * world.width + x];
            if (r <= 0) continue;
            sum += r;
            cnt += 1;
          }
        }
        this.addPad({ x: n.x + 0.5, y: n.y + 0.5, height: cnt ? Math.max(0.06, Math.min(here, sum / cnt)) : here, core: 1.0, outer: 2.2 });
        continue;
      }
      if (n.kind === 'quarry') {
        // Dig down below the surrounding ground: a flat floor with sloped walls on the mountain side.
        this.addPad({ x: n.x + 0.5, y: n.y + 0.5, height: Math.max(0.12, here - 0.8), core: 0.95, outer: 2.3 });
      } else {
        // Mines and coal seams stand on a small level yard at the foot of the hill, not in a pit.
        this.addPad({ x: n.x + 0.5, y: n.y + 0.5, height: here, core: 0.9, outer: 1.7 });
      }
    }
  }

  private addPad(pad: Pad): void {
    const wrapTiles = (w: number, dx: number): number => dx - Math.round(dx / w) * w;
    const { width: W, height: H } = this.world;
    const idx = this.pads.push(pad) - 1;
    const r = Math.ceil(pad.outer) + 1;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const y = Math.floor(pad.y) + dy;
        if (y < 0 || y >= H) continue;
        const x = (((Math.floor(pad.x) + dx) % W) + W) % W;
        const cur = this.padOf[y * W + x];
        const d = Math.hypot(dx + 0.5 - (pad.x % 1), dy + 0.5 - (pad.y % 1));
        if (d > pad.outer + 1) continue;
        if (cur >= 0) {
          const o = this.pads[cur];
          const od = Math.hypot(wrapTiles(W, x + 0.5 - o.x), y + 0.5 - o.y);
          // Ground already levelled flat (a town's streets, say) stays as it is; otherwise the nearer pad wins.
          if ((od <= o.core && d > pad.core) || od < d) continue;
        }
        this.padOf[y * W + x] = idx;
      }
    }
  }

  /**
   * Terraform for the current routes. Beside a road the ground is cut down or built up so the road runs level. Where a
   * road meets a mountain the real shape of the hill decides what happens: low ground is cut through, and the road only
   * tunnels where the hill stands well above it, with a mouth at each end of that stretch.
   * Returns the tiles whose height changed (old and new road beds), for refreshing the mesh.
   */
  setRoads(): Set<number> {
    const { width: W, height: H } = this.world;
    const touched = new Set<number>(this.cuts.keys());
    const wrap = (x: number): number => ((x % W) + W) % W;
    const terr = (t: Tile): string => this.world.terrain[t.y * W + wrap(t.x)];
    const land = (t: Tile): boolean => terr(t) === 'grass' || terr(t) === 'forest';
    const key = (t: Tile): number => t.y * W + wrap(t.x);
    const step = (a: Tile, b: Tile): { dx: number; dy: number } => {
      let dx = b.x - a.x;
      if (dx > W / 2) dx -= W;
      if (dx < -W / 2) dx += W;
      return { dx, dy: b.y - a.y };
    };
    // Tile coordinates: a tile centre is a whole number.
    const lonLat = (u: number, v: number): { lon: number; lat: number } => ({ lon: ((u + 0.5) / W) * Math.PI * 2 - Math.PI, lat: (0.5 - (v + 0.5) / H) * 2 * LAT_SPAN });
    const naturalAt = (u: number, v: number): number => {
      const p = lonLat(u, v);
      return this.natural(p.lon, p.lat);
    };
    const groundAt = (u: number, v: number): number => {
      const p = lonLat(u, v);
      return this.at(p.lon, p.lat);
    };
    const note = <K, V>(m: Map<K, V[]>, k: K, v: V): void => {
      const l = m.get(k);
      if (l) l.push(v);
      else m.set(k, [v]);
    };

    // Sort every route into plain stretches on open land and runs through mountain tiles.
    const plain = new Map<string, [Tile, Tile]>();
    const runs: Run[] = [];
    const levels = new Map<number, number>();
    for (const r of this.world.routes) {
      if (r.mode === 'air') continue;
      const p = r.path;
      for (let i = 1; i < p.length; i++) {
        if (!land(p[i - 1]) || !land(p[i])) continue;
        const ka = key(p[i - 1]);
        const kb = key(p[i]);
        plain.set(ka < kb ? `${ka}-${kb}` : `${kb}-${ka}`, [p[i - 1], p[i]]);
      }
      for (let i = 0; i < p.length; i++) {
        if (terr(p[i]) !== 'mountain') continue;
        let j = i;
        while (j + 1 < p.length && terr(p[j + 1]) === 'mountain') j++;
        const startLand = i > 0 && land(p[i - 1]);
        const endLand = j + 1 < p.length && land(p[j + 1]);
        const tiles = p.slice(startLand ? i - 1 : i, endLand ? j + 2 : j + 1);
        i = j;
        const n = tiles.length - 1;
        if (n < 1) continue;
        // The road runs at an even grade under the mountain, from the ground on one side to the ground on the other.
        const anchors: [number, number][] = [];
        tiles.forEach((t, s) => {
          const lv = (s === 0 && startLand) || (s === n && endLand) ? naturalAt(t.x, t.y) : levels.get(key(t));
          if (lv !== undefined) anchors.push([s, lv]);
        });
        if (anchors.length === 0) continue;
        const level = (s: number): number => {
          if (s <= anchors[0][0]) return anchors[0][1];
          for (let q = 1; q < anchors.length; q++) {
            if (s > anchors[q][0]) continue;
            const [s0, l0] = anchors[q - 1];
            const [s1, l1] = anchors[q];
            return l0 + ((l1 - l0) * (s - s0)) / (s1 - s0);
          }
          return anchors[anchors.length - 1][1];
        };
        tiles.forEach((t, s) => {
          if (terr(t) === 'mountain' && !levels.has(key(t))) levels.set(key(t), level(s));
        });
        runs.push({ tiles, startLand, endLand, level, high: new Array<boolean>(n * 3).fill(false), merged: new Array<boolean>(n * 3).fill(false) });
      }
    }

    // Rows of terrain vertices cross each run three to a tile. A row is "high" when the hill there clears the road.
    const rowS = (k: number): number => ROW / 2 + k * ROW;
    const rowHigh = (run: Run, k: number, sample: (u: number, v: number) => number, slack: number): boolean => {
      const n = run.tiles.length - 1;
      const s = rowS(k);
      const e = Math.min(n - 1, Math.floor(s));
      const a = run.tiles[e];
      const d = step(a, run.tiles[e + 1]);
      const u = a.x + d.dx * (s - e);
      const v = a.y + d.dy * (s - e);
      const lv = run.level(s);
      const inner = Math.min(sample(u - d.dy / 6, v + d.dx / 6), sample(u + d.dy / 6, v - d.dx / 6));
      const outer = Math.min(sample(u - d.dy / 2, v + d.dx / 2), sample(u + d.dy / 2, v - d.dx / 2));
      return inner >= lv + TUNNEL_COVER - slack && outer >= lv + TUNNEL_FLANK - slack;
    };
    const settle = (run: Run): void => {
      const n = run.tiles.length - 1;
      const last = n * 3 - 1;
      // A tunnel mouth cannot stand on a corner: the rows either side of a bend open or close together.
      for (let j = 1; j < n; j++) {
        const d0 = step(run.tiles[j - 1], run.tiles[j]);
        const d1 = step(run.tiles[j], run.tiles[j + 1]);
        if (d0.dx === d1.dx && d0.dy === d1.dy) continue;
        const k = 3 * j;
        if (run.high[k - 1] !== run.high[k] && !run.merged[k - 1] && !run.merged[k]) run.high[k - 1] = run.high[k] = false;
      }
      // A dip too short to be worth daylight stays inside the tunnel.
      for (let k = 0; k <= last; k++) {
        if (run.high[k]) continue;
        let m = k;
        while (m + 1 <= last && !run.high[m + 1]) m++;
        if (k > 0 && m < last && m - k + 1 < 3) for (let q = k; q <= m; q++) run.high[q] = run.merged[q] = true;
        k = m;
      }
      // A single high row is a thin ridge: too short for a tunnel, so it is cut through like any other low ground.
      for (let k = 0; k <= last; k++) {
        if (run.high[k] && !run.high[k - 1] && !run.high[k + 1]) run.high[k] = false;
      }
    };
    for (const run of runs) {
      const last = (run.tiles.length - 1) * 3 - 1;
      for (let k = 0; k <= last; k++) {
        const overLand = (k === 0 && run.startLand) || (k === last && run.endLand);
        run.high[k] = !overLand && rowHigh(run, k, naturalAt, 0);
      }
      settle(run);
    }

    const flip = (p: EdgeProfile): EdgeProfile => ({
      la: p.lb,
      lb: p.la,
      covered: p.covered.map(([a, b]) => [1 - b, 1 - a] as [number, number]).reverse(),
      hidden: p.hidden.map(([a, b]) => [1 - b, 1 - a] as [number, number]).reverse(),
      portals: p.portals.map((q) => ({ t: 1 - q.t, into: q.into === 1 ? -1 : 1, depth: q.depth })),
    });

    const build = (): { map: Map<number, Cut[]>; profiles: Map<string, EdgeProfile> } => {
      const cuts: Cut[] = [];
      // Which graded stretches end at each tile centre, and which of them lead straight to a tunnel mouth.
      const ends = new Map<number, { cut: Cut; end: 'A' | 'B' }[]>();
      const lead = new Map<number, Cut[]>();
      const profiles = new Map<string, EdgeProfile>();
      const add = (a: Tile, d: { dx: number; dy: number }, t0: number, t1: number, h0: number, h1: number, capA: Cap, capB: Cap): Cut => {
        const cut: Cut = { ax: a.x + d.dx * t0, ay: a.y + d.dy * t0, dx: d.dx * (t1 - t0), dy: d.dy * (t1 - t0), len: t1 - t0, ha: h0, hb: h1, capA, capB };
        cuts.push(cut);
        return cut;
      };
      for (const [a, b] of plain.values()) {
        const cut = add(a, step(a, b), 0, 1, naturalAt(a.x, a.y), naturalAt(b.x, b.y), CAP_ROUND, CAP_ROUND);
        note(ends, key(a), { cut, end: 'A' as const });
        note(ends, key(b), { cut, end: 'B' as const });
      }
      for (const run of runs) {
        const n = run.tiles.length - 1;
        const last = n * 3 - 1;
        const sections: { s0: number; s1: number; mouth0: boolean; mouth1: boolean; solid: boolean }[] = [];
        for (let k = 0; k <= last; k++) {
          if (!run.high[k]) continue;
          let m = k;
          let solid = !run.merged[k];
          while (m + 1 <= last && run.high[m + 1]) {
            m++;
            if (run.merged[m]) solid = false;
          }
          sections.push({ s0: k > 0 ? rowS(k - 1) : 0, s1: m < last ? rowS(m + 1) : n, mouth0: k > 0, mouth1: m < last, solid });
          k = m;
        }
        for (let e = 0; e < n; e++) {
          const a = run.tiles[e];
          const b = run.tiles[e + 1];
          const pk = `${key(a)}>${key(b)}`;
          if (profiles.has(pk)) continue;
          const d = step(a, b);
          const prof: EdgeProfile = { la: run.level(e), lb: run.level(e + 1), covered: [], hidden: [], portals: [] };
          for (const sec of sections) {
            const c0 = Math.max(0, sec.s0 - e);
            const c1 = Math.min(1, sec.s1 - e);
            if (c1 - c0 > 1e-6) prof.covered.push([c0, c1]);
            if (!sec.solid) {
              const h0 = Math.max(0, sec.s0 + (sec.mouth0 ? HIDE_INSET : 0) - e);
              const h1 = Math.min(1, sec.s1 - (sec.mouth1 ? HIDE_INSET : 0) - e);
              if (h1 - h0 > 1e-6) prof.hidden.push([h0, h1]);
            }
            const depth = Math.min(0.46, (sec.s1 - sec.s0) / 2);
            if (sec.mouth0 && sec.s0 > e && sec.s0 < e + 1) prof.portals.push({ t: sec.s0 - e, into: 1, depth });
            if (sec.mouth1 && sec.s1 > e && sec.s1 < e + 1) prof.portals.push({ t: sec.s1 - e, into: -1, depth });
          }
          // Grade the ground along the stretches in daylight. At a tunnel mouth the grading stops square.
          let t = 0;
          const open: [number, number][] = [];
          for (const [c0, c1] of prof.covered) {
            if (c0 - t > 1e-6) open.push([t, c0]);
            t = c1;
          }
          if (1 - t > 1e-6) open.push([t, 1]);
          for (const [t0, t1] of open) {
            const sharpA = t0 > 1e-6;
            const sharpB = t1 < 1 - 1e-6;
            const cut = add(a, d, t0, t1, run.level(e + t0), run.level(e + t1), sharpA ? CAP_SHARP : CAP_ROUND, sharpB ? CAP_SHARP : CAP_ROUND);
            if (!sharpA) note(ends, key(a), { cut, end: 'A' as const });
            if (!sharpB) note(ends, key(b), { cut, end: 'B' as const });
            if (sharpB && !sharpA) note(lead, key(a), cut);
            if (sharpA && !sharpB) note(lead, key(b), cut);
          }
          profiles.set(pk, prof);
          profiles.set(`${key(b)}>${key(a)}`, flip(prof));
        }
      }
      // Next to a tunnel mouth only the stretch leading into it may round off its end, or the hill behind the mouth would be dug away.
      for (const [k, leaders] of lead) {
        for (const { cut, end } of ends.get(k) ?? []) {
          if (leaders.length === 1 && leaders[0] === cut) continue;
          if (end === 'A') cut.capA = CAP_NONE;
          else cut.capB = CAP_NONE;
        }
      }
      const map = new Map<number, Cut[]>();
      const reach = GRADE_OUTER + 0.05;
      for (const c of cuts) {
        const u0 = Math.round(Math.min(c.ax, c.ax + c.dx) - reach);
        const u1 = Math.round(Math.max(c.ax, c.ax + c.dx) + reach);
        const v0 = Math.max(0, Math.round(Math.min(c.ay, c.ay + c.dy) - reach));
        const v1 = Math.min(H - 1, Math.round(Math.max(c.ay, c.ay + c.dy) + reach));
        for (let y = v0; y <= v1; y++) for (let x = u0; x <= u1; x++) note(map, y * W + wrap(x), c);
      }
      return { map, profiles };
    };

    // Grading changes the ground, which can leave a hill too low to tunnel under. Check against the real result and repeat.
    let result = build();
    for (let pass = 0; pass < 6; pass++) {
      this.cuts = result.map;
      let changed = false;
      for (const run of runs) {
        let hit = false;
        for (let k = 0; k < run.high.length; k++) {
          if (!run.high[k] || run.merged[k] || rowHigh(run, k, groundAt, 0.05)) continue;
          run.high[k] = false;
          hit = true;
        }
        if (hit) settle(run);
        changed = changed || hit;
      }
      if (!changed) break;
      result = build();
    }
    this.cuts = result.map;
    this.profiles = result.profiles;
    this.levels = levels;
    for (const k of result.map.keys()) touched.add(k);
    return touched;
  }

  /** How the road runs along a tile edge that touches a mountain, if a route uses it. */
  edgeProfile(a: Tile, b: Tile): EdgeProfile | undefined {
    const W = this.world.width;
    return this.profiles.get(`${a.y * W + a.x}>${b.y * W + b.x}`);
  }

  /** Road level under a mountain tile that a route passes through. */
  tunnelLevel(tile: Tile): number | undefined {
    return this.levels.get(tile.y * this.world.width + tile.x);
  }

  /** Height above the sea surface at a lon/lat, including graded road beds. */
  at(lon: number, lat: number): number {
    const h = this.natural(lon, lat);
    if (this.cuts.size === 0 || h < 0.03) return h;
    const { width: W, height: H } = this.world;
    const u = ((lon + Math.PI) / (Math.PI * 2)) * W - 0.5;
    const v = (0.5 - lat / (2 * LAT_SPAN)) * H - 0.5;
    const list = this.cuts.get(Math.min(H - 1, Math.max(0, Math.round(v))) * W + (((Math.round(u) % W) + W) % W));
    if (!list) return h;
    const grade = (d: number): number => 1 - THREE.MathUtils.smoothstep(d, GRADE_CORE, GRADE_OUTER);
    let kMax = 0;
    let wSum = 0;
    let tSum = 0;
    for (const c of list) {
      let du = u - c.ax;
      if (du > W / 2) du -= W;
      if (du < -W / 2) du += W;
      const dv = v - c.ay;
      const along = (du * c.dx + dv * c.dy) / c.len;
      const side = Math.abs(du * c.dy - dv * c.dx) / c.len;
      const past = along < 0 ? -along : along - c.len;
      let k: number;
      let target: number;
      if (past > 0) {
        const cap = along < 0 ? c.capA : c.capB;
        if (cap === CAP_NONE) continue;
        k = cap === CAP_ROUND ? grade(Math.hypot(past, side)) : grade(side) * (1 - THREE.MathUtils.smoothstep(past, 0.02, 0.3));
        target = along < 0 ? c.ha : c.hb;
      } else {
        k = grade(side);
        target = c.ha + ((c.hb - c.ha) * along) / c.len;
      }
      if (k <= 0) continue;
      kMax = Math.max(kMax, k);
      wSum += k;
      tSum += k * target;
    }
    return kMax > 0 ? h + (tSum / wSum - h) * kMax : h;
  }

  /**
   * Height of the terrain as it is drawn: the mesh is flat triangles between its vertices, so on rough ground it differs
   * a little from the smooth height. Anything that must touch the ground stands on this.
   */
  surface(lon: number, lat: number): number {
    const cols = this.world.width * MESH_SUB;
    const rows = textureRows(this.world) * MESH_SUB;
    const gi = ((lon + Math.PI) / (Math.PI * 2)) * cols;
    const gj = ((Math.PI / 2 - lat) / Math.PI) * rows;
    const i0 = Math.floor(gi);
    const j0 = Math.floor(gj);
    const fx = gi - i0;
    const fy = gj - j0;
    const h = (i: number, j: number): number => this.at(-Math.PI + (Math.PI * 2 * i) / cols, Math.PI / 2 - (Math.PI * j) / rows);
    // Each mesh cell is split along the diagonal from its north-east to its south-west corner.
    if (fx + fy <= 1) {
      const a = h(i0, j0);
      return a + (h(i0 + 1, j0) - a) * fx + (h(i0, j0 + 1) - a) * fy;
    }
    const d = h(i0 + 1, j0 + 1);
    return d + (h(i0, j0 + 1) - d) * (1 - fx) + (h(i0 + 1, j0) - d) * (1 - fy);
  }

  /** Natural height above the sea surface at a lon/lat, before any road beds. */
  natural(lon: number, lat: number): number {
    const { width: W, height: H } = this.world;
    const u = ((lon + Math.PI) / (Math.PI * 2)) * W - 0.5;
    const v = (0.5 - lat / (2 * LAT_SPAN)) * H - 0.5;
    if (v < -0.5 || v > H - 0.5) return 0;
    const x0 = Math.floor(u);
    const y0 = Math.floor(v);
    const fx = u - x0;
    const fy = v - y0;
    const xa = ((x0 % W) + W) % W;
    const xb = (xa + 1) % W;
    const ya = Math.min(H - 1, Math.max(0, y0));
    const yb = Math.min(H - 1, Math.max(0, y0 + 1));
    const r = this.relief;
    const top = r[ya * W + xa] * (1 - fx) + r[ya * W + xb] * fx;
    const bot = r[yb * W + xa] * (1 - fx) + r[yb * W + xb] * fx;
    let h = top * (1 - fy) + bot * fy;
    let flat = 0;
    const pi = this.padOf[Math.min(H - 1, Math.max(0, Math.round(v))) * W + (((Math.round(u) % W) + W) % W)];
    if (pi >= 0) {
      const pad = this.pads[pi];
      let dx = u + 0.5 - pad.x;
      if (dx > W / 2) dx -= W;
      if (dx < -W / 2) dx += W;
      const d = Math.hypot(dx, v + 0.5 - pad.y);
      const k = 1 - THREE.MathUtils.smoothstep(d, pad.core, pad.outer);
      if (k > 0 && h > 0.03) {
        h += (pad.height - h) * k;
        flat = k;
      }
    }
    if (h < 0.5) return h;
    // Rugged detail on high ground only, so coasts and plains stay calm.
    const p = lonLatToVec(lon, lat, 1);
    const rough = (fbm3(this.seed, p.x * 46, p.y * 46, p.z * 46, 3) - 0.5) * 1.4;
    return h + rough * THREE.MathUtils.smoothstep(h, 1.2, 4.5) * (1 - flat);
  }

  /** Distance from the globe centre to the ground at a lon/lat. */
  radius(lon: number, lat: number): number {
    return R + this.at(lon, lat);
  }

  /** Ground height at the centre of a tile, as drawn. */
  tileHeight(x: number, y: number): number {
    const { lon, lat } = tileLonLat(this.world.width, this.world.height, x, y);
    return this.surface(lon, lat);
  }
}

/** Position on the globe of a tile centre, `lift` above the ground. */
export function tilePosition(world: World, hf: HeightField, x: number, y: number, lift = 0, out = new THREE.Vector3()): THREE.Vector3 {
  const { lon, lat } = tileLonLat(world.width, world.height, x, y);
  return lonLatToVec(lon, lat, hf.radius(lon, lat) + lift, out);
}

/** Tile under a lon/lat, or null over the polar caps. */
export function lonLatToTile(world: World, lon: number, lat: number): { x: number; y: number } | null {
  const u = (lon + Math.PI) / (Math.PI * 2);
  const v = 0.5 - lat / (2 * LAT_SPAN);
  const y = Math.floor(v * world.height);
  if (y < 0 || y >= world.height) return null;
  return { x: ((Math.floor(u * world.width) % world.width) + world.width) % world.width, y };
}

/** Orientation with local +Y along `up` and local +Z along `forward` (flattened onto the surface). */
export function basisMatrix(pos: THREE.Vector3, up: THREE.Vector3, forward: THREE.Vector3): THREE.Matrix4 {
  const f = forward.clone().addScaledVector(up, -forward.dot(up)).normalize();
  const right = new THREE.Vector3().crossVectors(up, f).normalize();
  // Columns: X = right, Y = up, Z = forward. (right = up x forward keeps the basis right-handed.)
  return new THREE.Matrix4().makeBasis(right, up, f).setPosition(pos);
}
