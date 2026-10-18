// The road network drawn on the globe. Every route's tiles are merged into one network, so overlapping roads are
// drawn once and crossings become proper junctions. Bridges span water; tunnels burrow through mountains.
import * as THREE from 'three';
import { tileLonLat } from '../sim/mapgen';
import type { RouteMode } from '../sim/defs';
import { placeAt, plotTiles, townStreets, wrapDx, type Tile, type World } from '../sim/world';
import { HeightField, R, basisMatrix, lonLatToVec } from './geo';
import { Parts } from './parts';
import { roadSurfaces } from './surfaces';
import { STREET } from '../scale';
import { TrackDistance } from './trainMotion';

const LIFT = 0.07;
const DECK = 0.55;
const ROAD_HALF = STREET.lane;
const ROAD_SHOULDER = STREET.lane + STREET.shoulder;
const RAIL_HALF = 0.2;
const RAIL_SHOULDER = 0.3;
/** A four-lane highway is nearly twice as wide as a street. */
export const HW_HALF = STREET.lane * 2;
const HW_SHOULDER = HW_HALF + STREET.shoulder;
const DASH = 1.6;
/** Share of the road texture's width that is the road itself; the rest is plain asphalt for junction pads. */
/** Corner-cutting passes for smooth runs: three turns a quarter-turn into a gentle bend and a staircase into a diagonal. */
const SMOOTH_PASSES = 3;
const ROAD_U = 0.8;
/** How far right of the centre line a vehicle drives. */
const LANE = STREET.lane / 2;

export type Structure = 'road' | 'bridge' | 'tunnel';

class Acc {
  pos: number[] = [];
  uv: number[] = [];
  idx: number[] = [];
  nrm: number[] = [];
  get n(): number {
    return this.pos.length / 3;
  }
  vertex(p: THREE.Vector3, up: THREE.Vector3, u: number, v: number): void {
    this.pos.push(p.x, p.y, p.z);
    this.nrm.push(up.x, up.y, up.z);
    this.uv.push(u, v);
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

export interface PathPoint {
  pos: THREE.Vector3;
  up: THREE.Vector3;
  forward: THREE.Vector3;
  /** True while a vehicle is inside a tunnel and should not be drawn. */
  hidden: boolean;
}

export function makeRoadTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.scale(4, 4);
  ctx.fillStyle = '#54565b';
  ctx.fillRect(0, 0, 128, 128);
  // Asphalt grain.
  for (let i = 0; i < 1400; i++) {
    const g = 70 + Math.random() * 28;
    ctx.fillStyle = `rgba(${g},${g},${g + 2},0.35)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const road = 128 * ROAD_U;
  // Edge lines and a dashed centre line.
  ctx.fillStyle = 'rgba(214,214,206,0.85)';
  ctx.fillRect(road * 0.06, 0, 3, 128);
  ctx.fillRect(road * 0.94 - 3, 0, 3, 128);
  ctx.fillStyle = 'rgba(214,176,70,0.95)';
  ctx.fillRect(road * 0.5 - 1.5, 0, 3, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Four lanes: white edge lines, dashed lane lines and a double yellow median. */
export function makeHighwayTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.scale(4, 4);
  ctx.fillStyle = '#505257';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) {
    const g = 74 + Math.random() * 28;
    ctx.fillStyle = `rgba(${g},${g},${g + 2},0.35)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const road = 128 * ROAD_U;
  ctx.fillStyle = 'rgba(224,224,216,0.9)';
  ctx.fillRect(road * 0.04, 0, 3, 128);
  ctx.fillRect(road * 0.96 - 3, 0, 3, 128);
  for (const f of [0.27, 0.73]) ctx.fillRect(road * f - 1.5, 0, 3, 56);
  ctx.fillStyle = 'rgba(224,178,66,0.95)';
  ctx.fillRect(road * 0.5 - 5, 0, 3, 128);
  ctx.fillRect(road * 0.5 + 2, 0, 3, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Sleepers and two steel rails on a transparent background; the ballast is a separate layer underneath. */
export function makeRailTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  for (let i = 0; i < 4; i++) {
    const y = i * 32 + 9;
    ctx.fillStyle = '#4a3a2c';
    ctx.fillRect(6, y, 116, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(6, y + 11, 116, 3);
  }
  for (const x of [34, 88]) {
    ctx.fillStyle = '#2b2d30';
    ctx.fillRect(x - 3, 0, 8, 128);
    ctx.fillStyle = '#b7bcc2';
    ctx.fillRect(x - 1, 0, 4, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export class RoadNet {
  readonly group = new THREE.Group();
  /** Tiles that carry a road. Trees are cleared from these. */
  readonly tiles = new Set<number>();
  /** Tiles a highway runs through, so a level crossing there is built for the wider road. */
  readonly wideTiles = new Set<number>();
  private readonly roadMat: THREE.MeshStandardMaterial;
  private readonly shoulderMat = new THREE.MeshStandardMaterial({ color: 0x3d3e42, roughness: 1 });
  private readonly structMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  /** Edges drawn as highway, and the nodes where a highway narrows into a street. Rebuilt with the network. */
  private readonly hwEdges = new Set<string>();
  private readonly narrow = new Set<number>();

  private readonly highwayMat: THREE.MeshStandardMaterial;
  private readonly half: number;
  private readonly shoulder: number;

  constructor(
    private readonly world: World,
    private readonly hf: HeightField,
    roadTexture: THREE.Texture,
    private readonly mode: RouteMode = 'road',
    highwayTexture?: THREE.Texture,
  ) {
    this.highwayMat = new THREE.MeshStandardMaterial({ map: highwayTexture ?? roadTexture, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const rail = mode === 'rail';
    this.half = rail ? RAIL_HALF : ROAD_HALF;
    this.shoulder = rail ? RAIL_SHOULDER : ROAD_SHOULDER;
    this.roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: rail ? 0.6 : 0.95,
      metalness: rail ? 0.25 : 0,
      alphaTest: rail ? 0.4 : 0,
      polygonOffset: true,
      polygonOffsetFactor: rail ? -3 : -2,
      polygonOffsetUnits: rail ? -3 : -2,
    });
    if (!rail) {
      roadSurfaces(this.roadMat, ROAD_HALF * 2 / ROAD_U, DASH);
      roadSurfaces(this.highwayMat, HW_HALF * 2 / ROAD_U, DASH);
    }
    if (rail) this.shoulderMat.color.set(0x77706a);
    this.shoulderMat.polygonOffset = true;
    this.shoulderMat.polygonOffsetFactor = rail ? -0.6 : -1;
    this.shoulderMat.polygonOffsetUnits = rail ? -0.6 : -1;
  }

  private terrain(t: Tile): string {
    return this.world.terrain[t.y * this.world.width + t.x];
  }

  private edgeKey(a: Tile, b: Tile): string {
    const W = this.world.width;
    const ka = a.y * W + a.x;
    const kb = b.y * W + b.x;
    return ka < kb ? `${ka}-${kb}` : `${kb}-${ka}`;
  }

  /**
   * What carries the road between two tiles. A stretch through a mountain tile only counts as a tunnel where the hill
   * really covers it: low ground is cut through and drawn as plain road.
   */
  structure(a: Tile, b: Tile): Structure {
    const ta = this.terrain(a);
    const tb = this.terrain(b);
    if (ta === 'water' || tb === 'water') return 'bridge';
    if (ta === 'mountain' || tb === 'mountain') {
      const prof = this.hf.edgeProfile(a, b);
      return prof && prof.covered.length === 0 ? 'road' : 'tunnel';
    }
    return 'road';
  }

  /** Road height where a bridge lands on a tile. */
  private landing(t: Tile): number {
    if (this.terrain(t) === 'water') return DECK;
    const under = this.terrain(t) === 'mountain' ? this.hf.tunnelLevel(t) : undefined;
    return (under ?? this.hf.tileHeight(t.x, t.y)) + LIFT;
  }

  /** A point t (0..1) along the edge between two adjacent tile centres, on the road surface. */
  sampleEdge(a: Tile, b: Tile, t: number): { p: THREE.Vector3; n: THREE.Vector3 } {
    const { width: W, height: H } = this.world;
    const la = tileLonLat(W, H, a.x, a.y);
    const lb = tileLonLat(W, H, b.x, b.y);
    let dlon = lb.lon - la.lon;
    if (dlon > Math.PI) dlon -= Math.PI * 2;
    if (dlon < -Math.PI) dlon += Math.PI * 2;
    const lon = la.lon + dlon * t;
    const lat = la.lat + (lb.lat - la.lat) * t;
    const ground = this.hf.surface(lon, lat);
    let h = ground + LIFT;
    const s = this.structure(a, b);
    if (s === 'bridge') {
      const dA = this.landing(a);
      const dB = this.landing(b);
      const k = t * t * (3 - 2 * t);
      h = Math.max(dA + (dB - dA) * k, ground + LIFT);
    } else if (s === 'tunnel') {
      // Under a hill the road keeps its own even grade, whatever the ground above does. In daylight it lies on the
      // ground like any road, which has been graded to that same line.
      const prof = this.hf.edgeProfile(a, b);
      if (prof?.covered.some(([c0, c1]) => t >= c0 - 1e-6 && t <= c1 + 1e-6)) h = prof.la + (prof.lb - prof.la) * t + LIFT;
    }
    const p = lonLatToVec(lon, lat, R + h);
    return { p, n: p.clone().normalize() };
  }

  /** How far the road is from full highway width at t along an edge: 1 on a highway, 0 on a street, in between where one narrows into the other. */
  private wide(a: Tile, b: Tile, t: number): number {
    if (!this.hwEdges.has(this.edgeKey(a, b))) return 0;
    const W = this.world.width;
    let k = 1;
    if (this.narrow.has(a.y * W + a.x)) k = Math.min(k, THREE.MathUtils.smoothstep(t, 0.5, 0.95));
    if (this.narrow.has(b.y * W + b.x)) k = Math.min(k, THREE.MathUtils.smoothstep(1 - t, 0.5, 0.95));
    return k;
  }

  /** True when a, c, b turn a corner on plain road, so the corner is drawn and driven as a curve. */
  isCorner(a: Tile, c: Tile, b: Tile): boolean {
    const w = this.world;
    const d1x = wrapDx(w, a.x, c.x);
    const d1y = c.y - a.y;
    const d2x = wrapDx(w, c.x, b.x);
    const d2y = b.y - c.y;
    if (d1x === d2x && d1y === d2y) return false;
    return this.structure(a, c) === 'road' && this.structure(c, b) === 'road';
  }

  /**
   * Tiles where a smoothed run of road must pass exactly through the tile centre: junctions, dead ends, and where plain
   * road meets a bridge, tunnel or highway. Everything between two pins is drawn, and driven, as one smooth curve.
   */
  private pins = new Set<number>();
  /** Bumped on every rebuild, so cached vehicle paths are smoothed again against the new pins. */
  private gen = 0;
  private readonly distanceCache = new WeakMap<Tile[], { gen: number; track: TrackDistance }>();

  trackDistance(path: Tile[]): TrackDistance {
    const hit = this.distanceCache.get(path);
    if (hit?.gen === this.gen) return hit.track;
    const track = new TrackDistance(path.length - 1, (f, dir) => this.pointOnPath(path, f, dir, 0));
    this.distanceCache.set(path, { gen: this.gen, track });
    return track;
  }
  private readonly smoothCache = new WeakMap<Tile[], { gen: number; runs: { i0: number; i1: number; pts: [number, number][]; cum: number[] }[] }>();

  /** An edge drawn as part of a smooth run: road, highway or track on the ground, not a bridge or tunnel. */
  private plain(a: Tile, b: Tile): boolean {
    return this.structure(a, b) === 'road';
  }

  /** Tile centres as continuous tile coordinates, unwrapped across the date line, then rounded off (corners kept to the ends). */
  private smoothTiles(tiles: Tile[]): [number, number][] {
    let pts: [number, number][] = [[tiles[0].x, tiles[0].y]];
    for (let i = 1; i < tiles.length; i++) pts.push([pts[i - 1][0] + wrapDx(this.world, tiles[i - 1].x, tiles[i].x), tiles[i].y]);
    for (let it = 0; it < SMOOTH_PASSES && pts.length > 2; it++) {
      const out: [number, number][] = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
      }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    return pts;
  }

  /** The road surface at continuous tile coordinates. */
  private surfaceAt(u: number, v: number, lift = LIFT): { p: THREE.Vector3; n: THREE.Vector3 } {
    const { width: W, height: H } = this.world;
    const { lon, lat } = tileLonLat(W, H, u, v);
    const p = lonLatToVec(lon, lat, R + this.hf.surface(lon, lat) + lift);
    return { p, n: p.clone().normalize() };
  }

  /** A route's smooth runs, worked out once per rebuild. */
  private smoothRuns(path: Tile[]): { i0: number; i1: number; pts: [number, number][]; cum: number[] }[] {
    const hit = this.smoothCache.get(path);
    if (hit && hit.gen === this.gen) return hit.runs;
    const W = this.world.width;
    const runs: { i0: number; i1: number; pts: [number, number][]; cum: number[] }[] = [];
    let i0 = 0;
    for (let i = 1; i <= path.length - 1; i++) {
      const plain = this.plain(path[i - 1], path[i]);
      const end = i === path.length - 1 || !plain || this.pins.has(path[i].y * W + path[i].x) || !this.plain(path[i], path[i + 1]);
      if (!plain) {
        i0 = i;
        continue;
      }
      if (end) {
        if (i - i0 >= 2) {
          const pts = this.smoothTiles(path.slice(i0, i + 1));
          const cum = [0];
          for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
          runs.push({ i0, i1: i, pts, cum });
        }
        i0 = i;
      }
    }
    this.smoothCache.set(path, { gen: this.gen, runs });
    return runs;
  }

  /** Surface point at fractional index f along a path, following the same smooth curves the road is drawn with. */
  private pathPoint(path: Tile[], f: number): { p: THREE.Vector3; n: THREE.Vector3 } {
    for (const run of this.smoothRuns(path)) {
      if (f < run.i0 || f > run.i1) continue;
      const total = run.cum[run.cum.length - 1];
      const d = ((f - run.i0) / (run.i1 - run.i0)) * total;
      let k = 1;
      while (k < run.cum.length - 1 && run.cum[k] < d) k++;
      const seg = run.cum[k] - run.cum[k - 1] || 1;
      const t = Math.min(1, Math.max(0, (d - run.cum[k - 1]) / seg));
      const [ax, ay] = run.pts[k - 1];
      const [bx, by] = run.pts[k];
      return this.surfaceAt(ax + (bx - ax) * t, ay + (by - ay) * t);
    }
    const i = Math.min(path.length - 2, Math.max(0, Math.floor(f)));
    return this.sampleEdge(path[i], path[i + 1], Math.min(1, Math.max(0, f - i)));
  }

  /** Position, heading and lane offset for something travelling along a path at fractional index `f`. */
  pointOnPath(path: Tile[], f: number, dir: 1 | -1, lane?: number): PathPoint {
    const last = path.length - 1;
    const fc = Math.min(last, Math.max(0, f));
    const i = Math.min(last - 1, Math.floor(fc));
    const t = fc - i;
    const a = path[i];
    const b = path[i + 1];
    const here = this.pathPoint(path, fc);
    const p0 = this.pathPoint(path, Math.max(0, fc - 0.04)).p;
    const p1 = this.pathPoint(path, Math.min(last, fc + 0.04)).p;
    const forward = p1.sub(p0).normalize();
    if (dir < 0) forward.negate();
    const right = new THREE.Vector3().crossVectors(here.n, forward).normalize();
    // Keep to the right-hand lane: further out on a highway, which has two lanes each way.
    const off = lane ?? LANE * (1 + 2 * this.wide(a, b, t));
    const pos = here.p.clone().addScaledVector(right, off);
    // Inside a tunnel the hill hides the vehicle. It is only switched off where the ground above dips too low to do that.
    const hidden = this.structure(a, b) === 'tunnel' && (this.hf.edgeProfile(a, b)?.hidden.some(([h0, h1]) => t > h0 && t < h1) ?? false);
    return { pos, up: here.n, forward, hidden };
  }

  /** Ribbon geometry along a tile path, used for the live route preview. */
  ribbonGeometry(path: Tile[], half: number, lift: number): THREE.BufferGeometry {
    const acc = new Acc();
    const samples: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
    const last = path.length - 1;
    for (let f = 0; f <= last + 1e-6; f += 1 / 6) samples.push(this.pathPoint(path, Math.min(last, f)));
    this.ribbon(acc, samples, half, lift, 0, 0, ROAD_U);
    return acc.build();
  }

  /** Where along an edge the ribbon gets vertices: its ends, plus the terrain mesh's own rows so road and ground bend in the same places. */
  private edgeStops(t0: number, t1: number): number[] {
    return [t0, ...[1 / 6, 1 / 3, 1 / 2, 2 / 3, 5 / 6].filter((t) => t > t0 + 0.02 && t < t1 - 0.02), t1];
  }

  private edgeSamples(a: Tile, b: Tile, t0: number, t1: number): { p: THREE.Vector3; n: THREE.Vector3 }[] {
    return this.edgeStops(t0, t1).map((t) => this.sampleEdge(a, b, t));
  }

  private edgeRibbon(acc: Acc, a: Tile, b: Tile, half: number | ((t: number) => number), lift: number, v0: number, u0: number, u1: number, t0 = 0, t1 = 1): number {
    const widths = typeof half === 'number' ? half : this.edgeStops(t0, t1).map(half);
    return this.ribbon(acc, this.edgeSamples(a, b, t0, t1), widths, lift, v0, u0, u1);
  }

  private ribbon(acc: Acc, samples: { p: THREE.Vector3; n: THREE.Vector3 }[], width: number | number[], lift: number, v0: number, u0: number, u1: number): number {
    const base = acc.n;
    const segs = samples.length - 1;
    let dist = 0;
    let prev: THREE.Vector3 | null = null;
    for (let k = 0; k <= segs; k++) {
      const s = samples[k];
      const half = typeof width === 'number' ? width : width[k];
      const tan = samples[Math.min(segs, k + 1)].p.clone().sub(samples[Math.max(0, k - 1)].p).normalize();
      const right = new THREE.Vector3().crossVectors(s.n, tan).normalize();
      const c = s.p.clone().addScaledVector(s.n, lift);
      if (prev) dist += c.distanceTo(prev);
      prev = c;
      const v = v0 + dist / DASH;
      acc.vertex(c.clone().addScaledVector(right, -half), s.n, u0, v);
      acc.vertex(c.clone().addScaledVector(right, half), s.n, u1, v);
    }
    for (let k = 0; k < segs; k++) {
      const l0 = base + k * 2;
      const r0 = l0 + 1;
      const l1 = l0 + 2;
      const r1 = l0 + 3;
      acc.idx.push(l0, l1, r0, r0, l1, r1);
    }
    return v0 + dist / DASH;
  }

  private disc(acc: Acc, tile: Tile, radius: number, lift: number, u: number, v: number): void {
    const { width: W, height: H } = this.world;
    const { lon, lat } = tileLonLat(W, H, tile.x, tile.y);
    const centre = lonLatToVec(lon, lat, R + this.hf.surface(lon, lat) + lift);
    const up = centre.clone().normalize();
    const ref = Math.abs(up.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const e1 = new THREE.Vector3().crossVectors(up, ref).normalize();
    const e2 = new THREE.Vector3().crossVectors(up, e1).normalize();
    const base = acc.n;
    acc.vertex(centre, up, u, v);
    const seg = 14;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const p = centre.clone().addScaledVector(e1, Math.cos(a) * radius).addScaledVector(e2, Math.sin(a) * radius);
      const ll = this.lonLat(p);
      p.setLength(R + this.hf.surface(ll.lon, ll.lat) + lift);
      acc.vertex(p, up, u, v);
    }
    for (let i = 0; i < seg; i++) acc.idx.push(base, base + 1 + ((i + 1) % seg), base + 1 + i);
  }

  private lonLat(p: THREE.Vector3): { lon: number; lat: number } {
    return { lon: Math.atan2(p.x, p.z), lat: Math.asin(THREE.MathUtils.clamp(p.y / p.length(), -1, 1)) };
  }

  clear(): void {
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      (c as THREE.Mesh).geometry?.dispose();
    }
    this.tiles.clear();
  }

  rebuild(crossWith?: Set<number>, wideTiles?: Set<number>): void {
    this.clear();
    this.wideTiles.clear();
    const { width: W } = this.world;
    const key = (t: Tile) => t.y * W + t.x;
    const nodes = new Map<number, { tile: Tile; nbrs: Tile[] }>();
    const edges = new Map<string, [Tile, Tile]>();

    // Every town has its main street and lanes, which are part of the road network from the start.
    const paths: Tile[][] = this.world.routes.filter((r) => r.mode === this.mode).map((r) => r.path);
    if (this.mode === 'road') {
      for (const pl of this.world.places) {
        const streets = townStreets(this.world, pl);
        for (const s of streets) {
          const t = { x: s % W, y: Math.floor(s / W) };
          for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const n = { x: (((t.x + dx) % W) + W) % W, y: t.y + dy };
            if (streets.has(n.y * W + n.x)) paths.push([t, n]);
          }
        }
      }
    }

    for (const r of paths.map((path) => ({ path }))) {
      r.path.forEach((t, i) => {
        const k = key(t);
        this.tiles.add(k);
        if (!nodes.has(k)) nodes.set(k, { tile: t, nbrs: [] });
        if (i > 0) {
          const p = r.path[i - 1];
          const ek = key(p) < k ? `${key(p)}-${k}` : `${k}-${key(p)}`;
          if (!edges.has(ek)) {
            edges.set(ek, [p, t]);
            const pn = nodes.get(key(p))!;
            if (!pn.nbrs.some((n) => key(n) === k)) pn.nbrs.push(t);
            const cn = nodes.get(k)!;
            if (!cn.nbrs.some((n) => key(n) === key(p))) cn.nbrs.push(p);
          }
        }
      });
    }
    if (edges.size === 0) return;

    // Highway edges (outside towns) are drawn wide, with their own lane markings.
    const ekey = (a: Tile, b: Tile): string => this.edgeKey(a, b);
    this.hwEdges.clear();
    this.narrow.clear();
    const hwCount = new Map<number, number>();
    if (this.mode === 'road') {
      for (const rt of this.world.routes) {
        if (rt.mode !== 'road' || rt.grade !== 'highway') continue;
        for (let i = 1; i < rt.path.length; i++) {
          const a = rt.path[i - 1];
          const b = rt.path[i];
          if (placeAt(this.world, a.x, a.y) || placeAt(this.world, b.x, b.y)) continue;
          const ek = ekey(a, b);
          if (this.hwEdges.has(ek)) continue;
          this.hwEdges.add(ek);
          hwCount.set(key(a), (hwCount.get(key(a)) ?? 0) + 1);
          hwCount.set(key(b), (hwCount.get(key(b)) ?? 0) + 1);
        }
      }
      for (const k of hwCount.keys()) this.wideTiles.add(k);
      // Where a single highway runs on as a street it narrows into it, instead of stopping dead at full width.
      for (const [k, n] of hwCount) if (n === 1 && nodes.get(k)!.nbrs.length > 1) this.narrow.add(k);
    }
    const hwNode = (k: number): boolean => (hwCount.get(k) ?? 0) > 0 && !this.narrow.has(k);
    const hwRoad = new Acc();
    const road = new Acc();
    const shoulder = new Acc();
    const parts = new Parts();
    const rail = this.mode === 'rail';

    // Plain road (or track) between pins is drawn as one smooth run: staircases become diagonals, corners become bends.
    this.gen += 1;
    const pdeg = new Map<number, number>();
    for (const [a, b] of edges.values()) {
      if (!this.plain(a, b)) continue;
      pdeg.set(key(a), (pdeg.get(key(a)) ?? 0) + 1);
      pdeg.set(key(b), (pdeg.get(key(b)) ?? 0) + 1);
    }
    this.pins = new Set<number>();
    for (const [k, n] of nodes) if ((pdeg.get(k) ?? 0) !== 2 || n.nbrs.length !== 2) this.pins.add(k);
    const usedEdges = new Set<string>();
    const walk = (from: Tile, to: Tile): Tile[] => {
      const out = [to];
      let prev = from;
      let cur = to;
      usedEdges.add(ekey(from, to));
      while (!this.pins.has(key(cur))) {
        const next = nodes.get(key(cur))!.nbrs.find((n) => key(n) !== key(prev) && !usedEdges.has(ekey(cur, n)) && this.plain(cur, n));
        if (!next) break;
        usedEdges.add(ekey(cur, next));
        out.push(next);
        prev = cur;
        cur = next;
      }
      return out;
    };
    const runs: Tile[][] = [];
    for (const [ek, [a, b]] of edges) {
      if (usedEdges.has(ek) || !this.plain(a, b)) continue;
      const ahead = walk(a, b);
      const behind = this.pins.has(key(a)) ? [a] : walk(b, a).reverse();
      runs.push([...behind, ...ahead]);
    }

    /** Road and shoulder along part of an edge, at whatever width the road has there. */
    const strip = (a: Tile, b: Tile, t0: number, t1: number, bridge = false): void => {
      const hw = this.hwEdges.has(ekey(a, b));
      const taper = hw && (this.narrow.has(key(a)) || this.narrow.has(key(b)));
      const halfAt = (t: number): number => this.half + (HW_HALF - this.half) * this.wide(a, b, t);
      const shAt = (t: number): number => this.shoulder + (HW_SHOULDER - this.shoulder) * this.wide(a, b, t) + (bridge ? 0.05 : 0);
      this.edgeRibbon(shoulder, a, b, taper ? shAt : shAt(0.5), bridge ? 0 : rail ? -0.02 : -0.015, 0, 0, 1, t0, t1);
      this.edgeRibbon(hw ? hwRoad : road, a, b, taper ? halfAt : halfAt(0.5), bridge ? 0.002 : rail ? 0.004 : 0, 0, 0, rail ? 1 : ROAD_U, t0, t1);
    };

    for (const run of runs) {
      const pts = this.smoothTiles(run);
      const samples = pts.map(([u, v]) => this.surfaceAt(u, v, 0));
      const hwAt = run.slice(1).map((t, i) => this.hwEdges.has(ekey(run[i], t)));
      if (!hwAt.some(Boolean)) {
        this.ribbon(shoulder, samples, this.shoulder, rail ? -0.02 : -0.015, 0, 0, 1);
        this.ribbon(road, samples, this.half, rail ? 0.004 : 0, 0, 0, rail ? 1 : ROAD_U);
        continue;
      }
      // Highway and street in one run (a highway turning into a street, say) share one curve. The highway narrows to
      // street width over the half tile before it hands over, and each part takes its own markings, so the join is seamless.
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const total = cum[cum.length - 1] || 1;
      const last = run.length - 1;
      const fAt = cum.map((d) => (d / total) * last);
      const changes: number[] = [];
      for (let i = 1; i < last; i++) if (hwAt[i - 1] !== hwAt[i]) changes.push(i);
      if (hwAt[0] && this.narrow.has(key(run[0]))) changes.push(0);
      if (hwAt[last - 1] && this.narrow.has(key(run[last]))) changes.push(last);
      const edgeOf = (f: number): number => Math.min(last - 1, Math.max(0, Math.floor(f)));
      const wideAt = fAt.map((f, i) => {
        const onHw = hwAt[edgeOf(i > 0 && i < fAt.length - 1 ? f : i === 0 ? 0 : last - 1)];
        if (!onHw) return 0;
        return Math.min(1, ...changes.map((c) => THREE.MathUtils.smoothstep(Math.abs(f - c), 0.05, 0.5)));
      });
      // Split where the grade changes, with the boundary point in both parts.
      let from = 0;
      const flush = (to: number, hw: boolean): void => {
        if (to - from < 1) return;
        const part = samples.slice(from, to + 1);
        const k = wideAt.slice(from, to + 1);
        this.ribbon(shoulder, part, k.map((f) => this.shoulder + (HW_SHOULDER - this.shoulder) * f), -0.015, 0, 0, 1);
        this.ribbon(hw ? hwRoad : road, part, k.map((f) => this.half + (HW_HALF - this.half) * f), 0, 0, 0, ROAD_U);
      };
      let grade = hwAt[0];
      for (let i = 1; i < pts.length; i++) {
        const g = hwAt[edgeOf((fAt[i - 1] + fAt[i]) / 2)];
        if (g !== grade) {
          flush(i - 1, grade);
          from = i - 1;
          grade = g;
        }
      }
      flush(pts.length - 1, grade);
    }

    for (const [a, b] of edges.values()) {
      if (this.plain(a, b)) continue;
      const s = this.structure(a, b);
      if (s === 'tunnel') {
        const prof = this.hf.edgeProfile(a, b);
        if (!prof) {
          strip(a, b, 0, 1);
          continue;
        }
        // Draw the stretches in daylight; the hill hides the rest. A mouth stands wherever the road goes under.
        let t = 0;
        for (const [c0, c1] of prof.covered) {
          if (c0 - t > 1e-4) strip(a, b, t, c0);
          t = c1;
        }
        if (1 - t > 1e-4) strip(a, b, t, 1);
        for (const p of prof.portals) this.portal(parts, a, b, p.t, p.into, p.depth, this.hwEdges.has(ekey(a, b)) ? HW_HALF : this.half);
        continue;
      }
      strip(a, b, 0, 1, s === 'bridge');
      if (s === 'bridge') this.bridge(parts, a, b, this.hwEdges.has(ekey(a, b)) ? HW_HALF : this.half);
    }

    // Junction pads: ends, T-junctions and crossings. Smooth runs need none along their length.
    for (const [k, { tile, nbrs }] of nodes) {
      if (!this.pins.has(k)) continue;
      const terr = this.terrain(tile);
      if (terr === 'water') continue;
      // Nothing to draw where the roads meet underground.
      if (terr === 'mountain' && nbrs.some((nb) => this.hf.edgeProfile(tile, nb)?.covered.some(([c0]) => c0 < 1e-4) ?? true)) continue;
      const straight =
        nbrs.length === 2 &&
        ((nbrs[0].x === nbrs[1].x && nbrs[0].x === tile.x) || (nbrs[0].y === nbrs[1].y && nbrs[0].y === tile.y));
      if (straight) continue;
      const big = hwNode(k);
      this.disc(shoulder, tile, (big ? HW_SHOULDER : this.shoulder) + 0.02, rail ? -0.019 : -0.014, 0.9, 0.5);
      if (!rail) this.disc(road, tile, (big ? HW_HALF : this.half) + 0.03, 0.001, 0.9, 0.5);
    }

    if (this.mode === 'rail' && crossWith) {
      for (const [k, { tile, nbrs }] of nodes) {
        if (!crossWith.has(k) || nbrs.length !== 2) continue;
        this.crossing(parts, tile, nbrs[0], !!wideTiles?.has(k));
      }
    }

    // Town plots count as served by the road network (each lot draws its own drive).
    if (this.mode === 'road') {
      for (const pl of this.world.places) {
        for (const pt of plotTiles(this.world, pl)) {
          const plot = { x: ((pt.x % W) + W) % W, y: pt.y };
          const terr = this.terrain(plot);
          if (terr === 'grass' || terr === 'forest') this.tiles.add(key(plot));
        }
      }
    }

    const add = (acc: Acc, mat: THREE.Material, shadow: boolean) => {
      if (acc.n === 0) return;
      const m = new THREE.Mesh(acc.build(), mat);
      m.receiveShadow = shadow;
      m.frustumCulled = false;
      this.group.add(m);
    };
    add(shoulder, this.shoulderMat, true);
    add(road, this.roadMat, true);
    add(hwRoad, this.highwayMat, true);
    if (parts.count > 0) {
      const m = new THREE.Mesh(parts.build(), this.structMat);
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      this.group.add(m);
    }
  }

  /** Warning signs and lights either side of the road where the track crosses it. */
  private crossing(parts: Parts, tile: Tile, nbr: Tile, wide = false): void {
    const here = this.sampleEdge(tile, nbr, 0);
    const along = this.sampleEdge(tile, nbr, 0.2).p.sub(here.p).normalize();
    const up = here.n;
    const side = new THREE.Vector3().crossVectors(up, along).normalize();
    // Gates stand clear of the whole road, however wide it is.
    const reach = (wide ? HW_HALF : ROAD_HALF) + 0.18;
    for (const sign of [1, -1]) {
      const base = here.p.clone().addScaledVector(along, sign * reach).addScaledVector(side, sign * 0.3);
      const m = basisMatrix(base, up, side);
      parts.boxM(0.035, 0.46, 0.035, 0xdcdedf, m);
      const arm = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.44, 0));
      parts.boxM(0.3, 0.05, 0.02, 0xf2f2ee, arm.clone().multiply(new THREE.Matrix4().makeRotationZ(0.62)));
      parts.boxM(0.3, 0.05, 0.02, 0xf2f2ee, arm.clone().multiply(new THREE.Matrix4().makeRotationZ(-0.62)));
      parts.boxM(0.07, 0.07, 0.05, 0xc02c26, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.26, 0.03)));
    }
  }

  private bridge(parts: Parts, a: Tile, b: Tile, half = this.half): void {
    const segs = 3;
    for (let k = 0; k < segs; k++) {
      const s0 = this.sampleEdge(a, b, k / segs);
      const s1 = this.sampleEdge(a, b, (k + 1) / segs);
      const mid = s0.p.clone().add(s1.p).multiplyScalar(0.5);
      const up = mid.clone().normalize();
      const fwd = s1.p.clone().sub(s0.p);
      const len = fwd.length();
      const m = basisMatrix(mid.clone().addScaledVector(up, -0.15), up, fwd.normalize());
      parts.boxM(half * 2 + 0.16, 0.14, len + 0.03, 0x8d8f91, m);
      for (const side of [-1, 1]) {
        const mp = m.clone().multiply(new THREE.Matrix4().makeTranslation(side * (half + 0.07), 0.14, 0));
        parts.boxM(0.05, 0.12, len + 0.03, 0xa3a5a7, mp);
      }
    }
    // Piers stand in the water at each water tile.
    for (const t of [a, b]) {
      if (this.terrain(t) !== 'water') continue;
      const { width: W, height: H } = this.world;
      const { lon, lat } = tileLonLat(W, H, t.x, t.y);
      const top = DECK - 0.15;
      const depth = 0.9;
      const base = lonLatToVec(lon, lat, R - depth);
      const up = base.clone().normalize();
      const m = basisMatrix(base, up, new THREE.Vector3(0, 1, 0).cross(up).normalize());
      parts.cylM(0.11, 0.14, top + depth, 0x9a9c9e, m, 8);
    }
  }

  /** A concrete tunnel mouth at t along an edge: two piers and a lintel round a dark bore, running back into the hill. */
  private portal(parts: Parts, a: Tile, b: Tile, t: number, into: 1 | -1, depth: number, half: number): void {
    const face = this.sampleEdge(a, b, t);
    const run = this.sampleEdge(a, b, t + into * depth).p.sub(face.p);
    const f = run.clone().normalize();
    const right = new THREE.Vector3().crossVectors(face.n, f).normalize();
    const up = new THREE.Vector3().crossVectors(f, right).normalize();
    // The face stands a little out from the hill, so the slope starts behind it.
    const lead = 0.13;
    const len = run.length() + lead;
    // Local frame: x across the road, y up, z into the hill, with the origin on the road under the face.
    const m = new THREE.Matrix4().makeBasis(right, up, f).setPosition(face.p.clone().addScaledVector(f, -lead));
    const at = (x: number, y: number, z: number): THREE.Matrix4 => m.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
    const bore = Math.max(half + 0.14, 0.42);
    const pier = 0.2;
    const clear = 0.86;
    const lintel = 0.22;
    const sunk = 0.5;
    for (const side of [-1, 1]) parts.boxM(pier, clear + lintel + sunk, len, 0xa7a59e, at(side * (bore + pier / 2), -sunk, len / 2));
    parts.boxM(bore * 2, lintel, len, 0xa7a59e, at(0, clear, len / 2));
    parts.boxM((bore + pier) * 2 + 0.14, 0.08, 0.3, 0xbdbbb3, at(0, clear + lintel, 0.11));
    parts.boxM(bore * 2, clear + 0.06, len - 0.08, 0x08090a, at(0, -0.06, len / 2 + 0.04));
  }
}
