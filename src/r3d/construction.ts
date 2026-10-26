// Building work you can watch: when a building goes up or is upgraded, scaffolding rises around it, a crane swings
// overhead, dust drifts up, and the new building grows out of the ground before the scaffolding comes down.
import * as THREE from 'three';
import { basisMatrix } from './geo';
import { Parts } from './parts';

/** How long the work takes on screen, in milliseconds. */
export const BUILD_MS = 9000;

const POLE = 0x9aa4ad;
const PLANK = 0xc7a068;
const YELLOW = 0xd7a21f;
const DARK = 0x2b2e33;

function scaffoldGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  const xs = [-1.45, -0.48, 0.48, 1.45];
  const zs = [-1.25, -0.42, 0.42, 1.25];
  const h = 1.9;
  // Poles round the outside.
  for (const x of xs) for (const z of [zs[0], zs[3]]) p.box(0.05, h, 0.05, POLE, { x, y: 0, z });
  for (const z of [zs[1], zs[2]]) for (const x of [xs[0], xs[3]]) p.box(0.05, h, 0.05, POLE, { x, y: 0, z });
  // Walkways at three heights, and a cross brace on each face.
  for (const y of [0.62, 1.24, 1.86]) {
    p.box(2.95, 0.04, 0.16, PLANK, { y, z: zs[0] });
    p.box(2.95, 0.04, 0.16, PLANK, { y, z: zs[3] });
    p.box(0.16, 0.04, 2.55, PLANK, { x: xs[0], y });
    p.box(0.16, 0.04, 2.55, PLANK, { x: xs[3], y });
  }
  for (const z of [zs[0], zs[3]]) p.box(2.4, 0.03, 0.03, POLE, { y: 0.95, z, rz: 0.5 });
  for (const x of [xs[0], xs[3]]) p.box(0.03, 0.03, 2.1, POLE, { x, y: 0.95, rx: 0.5 });
  // A materials pile and a site hut by the front.
  p.box(0.5, 0.12, 0.3, PLANK, { x: 1.2, y: 0, z: 1.5 });
  p.box(0.5, 0.12, 0.3, PLANK, { x: 1.2, y: 0.12, z: 1.5 });
  p.box(0.55, 0.32, 0.36, 0xcf7a2b, { x: -1.2, y: 0, z: 1.52 });
  return p.build();
}

/** A tower crane, standing at its own origin, the jib pointing along +x. */
function craneGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  const h = 2.9;
  p.box(0.6, 0.12, 0.6, DARK, { y: 0 });
  for (const [x, z] of [[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]]) p.box(0.035, h, 0.035, YELLOW, { x, y: 0.12, z });
  for (let y = 0.4; y < h; y += 0.4) p.box(0.17, 0.025, 0.17, YELLOW, { y });
  p.box(0.24, 0.2, 0.22, YELLOW, { y: h + 0.12 });
  p.box(0.1, 0.1, 0.1, 0x9fc3d6, { x: 0.13, y: h + 0.17 });
  p.box(2.4, 0.07, 0.09, YELLOW, { x: 0.75, y: h + 0.32 });
  p.box(0.36, 0.22, 0.24, DARK, { x: -0.38, y: h + 0.14 });
  p.box(0.02, 0.9, 0.02, DARK, { x: 1.55, y: h - 0.58 });
  p.box(0.32, 0.12, 0.2, PLANK, { x: 1.55, y: h - 0.7 });
  return p.build();
}

/** A flatbed lorry with a load of building materials, facing -z (it drives in toward the building). */
function lorryGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(0.42, 0.22, 0.34, 0xcf7a2b, { y: 0.12, z: -0.55 });
  p.box(0.36, 0.1, 0.02, 0x9fc3d6, { y: 0.22, z: -0.72 });
  p.box(0.44, 0.06, 0.95, DARK, { y: 0.1, z: 0.1 });
  for (const [x, z] of [[-0.2, -0.55], [0.2, -0.55], [-0.2, 0.3], [0.2, 0.3], [-0.2, 0.5], [0.2, 0.5]]) p.cyl(0.08, 0.08, 0.06, 0x1f2124, { x, y: 0.08, z, rz: Math.PI / 2 }, 10);
  return p.build();
}

/** What a lorry carries: a stack of planks and a pallet of blocks. Lifted off as one piece. */
function loadGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(0.36, 0.1, 0.7, PLANK, { y: 0 });
  p.box(0.36, 0.1, 0.7, 0xb08850, { y: 0.1 });
  p.box(0.3, 0.12, 0.26, 0x9a9a96, { y: 0.2, z: 0.15 });
  return p.build();
}

/** A road roller, facing +z like the other vehicles. */
function rollerGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(0.16, 0.16, 0.42, 0x8a9aa7, { y: 0.16, z: 0.32, rz: Math.PI / 2 }, 14);
  p.box(0.46, 0.04, 0.08, YELLOW, { y: 0.34, z: 0.32 });
  p.box(0.4, 0.22, 0.46, YELLOW, { y: 0.06, z: -0.08 });
  p.box(0.3, 0.26, 0.24, YELLOW, { y: 0.28, z: -0.12 });
  p.box(0.32, 0.03, 0.28, DARK, { y: 0.55, z: -0.12 });
  p.box(0.26, 0.12, 0.02, 0x9fc3d6, { y: 0.38, z: 0.0 });
  for (const x of [-0.2, 0.2]) p.cyl(0.11, 0.11, 0.06, 0x1f2124, { x, y: 0.11, z: -0.24, rz: Math.PI / 2 }, 10);
  p.box(0.06, 0.06, 0.06, 0xe08a3a, { y: 0.58, z: -0.12 });
  return p.build();
}

interface Job {
  start: number;
  scaffold: THREE.Mesh;
  crane: THREE.Mesh;
  lorries: THREE.Mesh[];
  loads: THREE.Mesh[];
  /** The building as it was (null for a new one) and as it will be. */
  oldGeo: THREE.BufferGeometry | null;
  newGeo: THREE.BufferGeometry;
  /** Said when the work is done. */
  done: string;
  /** Waiting for materials: held at the point where the scaffolding stands and the lorries have unloaded, until released. */
  hold?: boolean;
}

/** How far through its work a building waiting for materials is held: scaffolding up, nothing built yet. */
const HOLD_AT = 0.3;

interface RoadJob {
  start: number;
  ms: number;
  path: { x: number; y: number }[];
  mode: 'road' | 'rail';
  mesh: THREE.Mesh;
}

/** A point along a laid route, as the road and rail networks report it. */
export type Along = (path: { x: number; y: number }[], f: number, mode: 'road' | 'rail') => { pos: THREE.Vector3; up: THREE.Vector3; forward: THREE.Vector3 };

const easeOut = (t: number): number => 1 - (1 - t) ** 3;
const easeIn = (t: number): number => t ** 3;
/** Ends a little past 1 and settles, so the finished building lands with a small bounce. */
const easeBack = (t: number): number => {
  const c = 1.6;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
/** Where 0..1 falls inside [a, b], clamped. */
const span = (t: number, a: number, b: number): number => Math.max(0, Math.min(1, (t - a) / (b - a)));

// The timeline of a job, as shares of BUILD_MS.
const ARRIVE = [0, 0.14];
const UNLOAD = [0.14, 0.24];
const SCAFFOLD_UP = [0.22, 0.32];
const SINK = [0.32, 0.42];
const RISE = [0.42, 0.8];
const SCAFFOLD_DOWN = [0.82, 0.9];
const LEAVE = [0.88, 1];

export class Construction {
  readonly group = new THREE.Group();
  private readonly jobs = new Map<number, Job>();
  private readonly roads: RoadJob[] = [];
  private geo: Record<'scaffold' | 'crane' | 'lorry' | 'load' | 'roller', THREE.BufferGeometry> | null = null;

  /** For screenshots: hold every job at this point of its work (0 to 1). */
  debugT: number | null = null;

  constructor(private readonly material: THREE.Material) {}

  private mesh(g: THREE.BufferGeometry): THREE.Mesh {
    const m = new THREE.Mesh(g, this.material);
    m.castShadow = true;
    m.matrixAutoUpdate = false;
    m.visible = false;
    this.group.add(m);
    return m;
  }

  private geometry(): Record<'scaffold' | 'crane' | 'lorry' | 'load' | 'roller', THREE.BufferGeometry> {
    return (this.geo ??= { scaffold: scaffoldGeometry(), crane: craneGeometry(), lorry: lorryGeometry(), load: loadGeometry(), roller: rollerGeometry() });
  }

  /** Start work on a building: `oldGeo` is how it looked before (null if it is new). */
  start(siteId: number, now: number, done: string, oldGeo: THREE.BufferGeometry | null, newGeo: THREE.BufferGeometry): void {
    const g = this.geometry();
    this.stop(siteId);
    this.jobs.set(siteId, {
      start: now,
      scaffold: this.mesh(g.scaffold),
      crane: this.mesh(g.crane),
      lorries: [this.mesh(g.lorry), this.mesh(g.lorry)],
      loads: [this.mesh(g.load), this.mesh(g.load)],
      oldGeo,
      newGeo,
      done,
    });
  }

  /** A building waiting for materials stands as a scaffolded site until they arrive. */
  hold(siteId: number, now: number, newGeo: THREE.BufferGeometry): void {
    if (this.jobs.has(siteId)) return;
    this.start(siteId, now, '', null, newGeo);
    this.jobs.get(siteId)!.hold = true;
  }

  /** The materials have come: the held work carries on from where it stood. */
  release(siteId: number, now: number): void {
    const j = this.jobs.get(siteId);
    if (!j?.hold) return;
    j.hold = false;
    j.start = now - HOLD_AT * BUILD_MS;
  }

  /** A roller drives the length of a newly laid road or track. */
  startRoad(path: { x: number; y: number }[], mode: 'road' | 'rail', now: number): void {
    if (path.length < 2) return;
    this.roads.push({ start: now, ms: Math.max(1600, Math.min(6000, path.length * 160)), path, mode, mesh: this.mesh(this.geometry().roller) });
  }

  busy(siteId: number): boolean {
    return this.jobs.has(siteId);
  }

  private stop(siteId: number): void {
    const j = this.jobs.get(siteId);
    if (!j) return;
    this.group.remove(j.scaffold, j.crane, ...j.lorries, ...j.loads);
    this.jobs.delete(siteId);
  }

  clear(): void {
    for (const id of [...this.jobs.keys()]) this.stop(id);
    for (const r of this.roads) this.group.remove(r.mesh);
    this.roads.length = 0;
  }

  /**
   * Move every job on. `meshOf` gives a building's mesh, whose `userData.base` is its resting matrix. Returns the
   * spots where dust should rise this frame, and calls `finished` with each job's message as it ends.
   */
  update(now: number, meshOf: (id: number) => THREE.Mesh | undefined, along: Along, finished: (text: string) => void): Map<number, { pos: THREE.Vector3; up: THREE.Vector3; every: number }> {
    const dust = new Map<number, { pos: THREE.Vector3; up: THREE.Vector3; every: number }>();
    const s = new THREE.Matrix4();
    const tr = new THREE.Matrix4();
    const puff = (key: number, base: THREE.Matrix4, x: number, z: number, every: number): void => {
      const pos = new THREE.Vector3(x, 0.25, z).applyMatrix4(base);
      dust.set(key, { pos, up: pos.clone().normalize(), every });
    };
    for (const [id, j] of this.jobs) {
      const m = meshOf(id);
      const base = m?.userData.base as THREE.Matrix4 | undefined;
      const t = this.debugT ?? (j.hold ? HOLD_AT : (now - j.start) / BUILD_MS);
      if (!m || !base || t >= 1) {
        if (m && base) {
          m.matrix.copy(base);
          m.geometry = j.newGeo;
        }
        this.stop(id);
        if (t >= 1) finished(j.done);
        continue;
      }
      // The building: the old one stands until the scaffolding is up, sinks away, then the new one rises.
      let sy: number;
      if (t < RISE[0]) {
        m.geometry = j.oldGeo ?? j.newGeo;
        sy = j.oldGeo ? 1 - 0.96 * easeIn(span(t, SINK[0], SINK[1])) : 0.04;
      } else {
        m.geometry = j.newGeo;
        sy = 0.04 + 0.96 * easeBack(span(t, RISE[0], RISE[1]));
      }
      m.matrix.copy(base).multiply(s.makeScale(1, Math.max(0.04, sy), 1));
      m.matrixWorldNeedsUpdate = true;

      // Scaffolding and crane.
      const frame = t < SCAFFOLD_DOWN[0] ? easeOut(span(t, SCAFFOLD_UP[0], SCAFFOLD_UP[1])) : 1 - easeOut(span(t, SCAFFOLD_DOWN[0], SCAFFOLD_DOWN[1]));
      for (const part of [j.scaffold, j.crane]) part.visible = frame > 0.02;
      j.scaffold.matrix.copy(base).multiply(s.makeScale(1, Math.max(0.01, frame), 1));
      j.scaffold.matrixWorldNeedsUpdate = true;
      const swing = Math.sin(t * Math.PI * 3) * 1.3 + 0.6;
      j.crane.matrix.copy(base).multiply(tr.makeTranslation(-1.75, 0, -1.55)).multiply(new THREE.Matrix4().makeRotationY(swing)).multiply(s.makeScale(1, Math.max(0.01, frame), 1));
      j.crane.matrixWorldNeedsUpdate = true;

      // Two lorries drive in from the road side, their loads are lifted off onto the lot, and they back out at the end.
      j.lorries.forEach((lorry, i) => {
        const x = i === 0 ? -0.55 : 0.55;
        const delay = i * 0.03;
        const arrive = easeOut(span(t, ARRIVE[0] + delay, ARRIVE[1] + delay));
        const leave = easeIn(span(t, LEAVE[0], LEAVE[1]));
        const z = 5.2 - 3.3 * arrive + 3.3 * leave;
        lorry.visible = t < LEAVE[1] - 0.005 && (arrive > 0.01 || t > ARRIVE[0]);
        lorry.matrix.copy(base).multiply(tr.makeTranslation(x, 0, z));
        lorry.matrixWorldNeedsUpdate = true;
        // The load: on the bed, then swung off in an arc to the pile beside the lorry, and gone once building starts.
        const lift = span(t, UNLOAD[0] + delay, UNLOAD[1] + delay);
        const lx = x + (i === 0 ? -0.75 : 0.75) * easeOut(lift);
        const ly = 0.13 + Math.sin(lift * Math.PI) * 0.6 - 0.13 * lift;
        const lz = z + 0.1;
        const load = j.loads[i];
        load.visible = lorry.visible && t < RISE[1];
        load.matrix.copy(base).multiply(tr.makeTranslation(lift > 0 ? lx : x, lift > 0 ? ly : 0.13, lift > 0 ? 1.9 + 0.1 : lz));
        load.matrixWorldNeedsUpdate = true;
        if (arrive > 0.05 && arrive < 0.98) puff(-(id * 10 + i + 1), base, x, z + 0.5, 0.18);
      });
      if (t > SCAFFOLD_UP[0] && t < SCAFFOLD_DOWN[1]) {
        puff(-id * 10, base, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, t > SINK[0] && t < SINK[1] ? 0.05 : 0.12);
      }
    }
    for (let i = this.roads.length - 1; i >= 0; i--) {
      const r = this.roads[i];
      const t = this.debugT ?? (now - r.start) / r.ms;
      if (t >= 1) {
        this.group.remove(r.mesh);
        this.roads.splice(i, 1);
        continue;
      }
      const pt = along(r.path, t * (r.path.length - 1), r.mode);
      r.mesh.visible = true;
      r.mesh.matrix.copy(basisMatrix(pt.pos, pt.up, pt.forward)).multiply(s.makeScale(1.05, 1.05, 1.05));
      r.mesh.matrixWorldNeedsUpdate = true;
      const back = pt.pos.clone().addScaledVector(pt.forward, -0.4).addScaledVector(pt.up, 0.2);
      dust.set(-1e6 - i, { pos: back, up: pt.up.clone(), every: 0.09 });
    }
    return dust;
  }
}
