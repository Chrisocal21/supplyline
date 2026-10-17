// Scenery for the opening flythrough only: ships and boats on the water, and a few things to find if you look closely.
// None of it is part of the game world or the save. Ships are scenery until sea transport is built.
import * as THREE from 'three';
import { basisMatrix } from './geo';
import { Parts } from './parts';
import { signPostGeometry, signTexture } from './eggs';

const STEEL = 0x22303c;
const RED = 0x9a2f28;
const WHITE = 0xe9eaeb;
const YELLOW_C = 0xd7a21f;
const BOX = [0xb23a30, 0x2f5f8a, 0xd7a21f, 0x3f7a55, 0xe6e2d6, 0xcf7a2b, 0x7a4a9a];

/** A hull built in steps, so the bow narrows to a point. The waterline is y 0; the keel sits below it. */
function hull(p: Parts, w: number, len: number, deck: number, top: number, bottom: number): void {
  const bowLen = len * 0.2;
  const body = len - bowLen;
  p.box(w, deck + 0.08, body, top, { y: -0.08, z: -bowLen / 2 });
  p.box(w + 0.01, 0.1, body, bottom, { y: -0.08, z: -bowLen / 2 });
  for (let i = 0; i < 4; i++) {
    const k = 1 - (i + 1) / 5;
    const z = body / 2 - bowLen / 2 + (i + 0.5) * (bowLen / 4);
    p.box(w * k, deck + 0.08, bowLen / 4 + 0.005, top, { y: -0.08, z });
    p.box(w * k + 0.01, 0.1, bowLen / 4 + 0.005, bottom, { y: -0.08, z });
  }
  // The white of the bow wave.
  p.box(w * 1.12, 0.02, len * 0.5, 0xf2f6f8, { y: -0.03, z: len * 0.22 });
}

export function cargoShipGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  hull(p, 0.5, 2.5, 0.2, STEEL, RED);
  p.tex = 0;
  // Superstructure aft with a bridge and funnel.
  p.box(0.42, 0.42, 0.5, WHITE, { y: 0.2, z: -0.95 });
  p.box(0.44, 0.1, 0.26, 0x5f8aa3, { y: 0.5, z: -0.86 });
  p.box(0.46, 0.03, 0.3, 0x4f545c, { y: 0.62, z: -0.86 });
  p.cyl(0.07, 0.08, 0.28, RED, { y: 0.62, z: -1.08 }, 10);
  p.cyl(0.075, 0.075, 0.06, 0x1f2124, { y: 0.9, z: -1.08 }, 10);
  p.cyl(0.01, 0.01, 0.3, 0x555a60, { y: 0.65, z: -0.8 }, 6);
  // Stacked containers over the hold, with a gantry crane forward.
  for (let r = 0; r < 6; r++) {
    for (let c = -1; c <= 1; c++) {
      const high = 1 + ((r + c + 3) % 3 === 0 ? 1 : 0) + (r % 2);
      for (let h = 0; h < high; h++) p.box(0.14, 0.1, 0.34, BOX[(r * 3 + c + 5 + h * 2) % BOX.length], { x: c * 0.15, y: 0.2 + h * 0.1, z: -0.4 + r * 0.36 });
    }
  }
  for (const x of [-0.22, 0.22]) p.box(0.03, 0.62, 0.03, 0xd7a21f, { x, y: 0.2, z: 1.0 });
  p.box(0.5, 0.04, 0.05, 0xd7a21f, { y: 0.8, z: 1.0 });
  return p.build();
}

/** The lowest rung: a small coaster with two hatches and a derrick. */
export function coasterGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  hull(p, 0.36, 1.5, 0.14, 0x34505e, 0x7a2a26);
  p.tex = 0;
  p.box(0.3, 0.3, 0.34, WHITE, { y: 0.14, z: -0.5 });
  p.box(0.32, 0.07, 0.18, 0x5f8aa3, { y: 0.34, z: -0.45 });
  p.cyl(0.05, 0.055, 0.2, 0xb23a30, { y: 0.44, z: -0.58 }, 8);
  for (let i = 0; i < 2; i++) p.box(0.26, 0.05, 0.3, 0x5a5f66, { y: 0.14, z: -0.02 + i * 0.4 });
  for (let i = 0; i < 3; i++) p.box(0.12, 0.09, 0.16, BOX[(i * 2 + 1) % BOX.length], { x: i * 0.12 - 0.12, y: 0.19, z: 0.02 });
  p.box(0.025, 0.4, 0.025, YELLOW_C, { y: 0.14, z: 0.55 });
  p.box(0.025, 0.025, 0.36, YELLOW_C, { y: 0.52, z: 0.4, rx: 0.4 });
  return p.build();
}

/** The top rung: a long hull with containers stacked five high in rows, and a tall bridge at the stern. */
export function containerShipGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  hull(p, 0.62, 3.6, 0.22, 0x1f2a34, 0x8a2a24);
  p.tex = 0;
  p.box(0.5, 0.7, 0.45, WHITE, { y: 0.22, z: -1.4 });
  for (let i = 0; i < 3; i++) p.box(0.52, 0.06, 0.3, 0x5f8aa3, { y: 0.45 + i * 0.12, z: -1.34 });
  p.box(0.54, 0.04, 0.34, 0x4f545c, { y: 0.92, z: -1.34 });
  p.cyl(0.08, 0.09, 0.3, 0x2f5f8a, { y: 0.9, z: -1.62 }, 10);
  p.cyl(0.085, 0.085, 0.06, 0x1f2124, { y: 1.2, z: -1.62 }, 10);
  p.cyl(0.012, 0.012, 0.4, 0x555a60, { y: 0.96, z: -1.3 }, 6);
  for (let r = 0; r < 9; r++) {
    for (let c = -2; c <= 2; c++) {
      const high = 2 + ((r * 3 + c + 6) % 3) + (r % 2);
      for (let h = 0; h < high; h++) p.box(0.1, 0.1, 0.34, BOX[(r * 2 + c + 6 + h * 3) % BOX.length], { x: c * 0.11, y: 0.22 + h * 0.1, z: -0.85 + r * 0.38 });
    }
  }
  return p.build();
}

export function tankerGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  hull(p, 0.42, 2.2, 0.12, 0x2b2f35, 0x7a2a26);
  p.tex = 0;
  p.box(0.36, 0.34, 0.42, WHITE, { y: 0.12, z: -0.85 });
  p.box(0.38, 0.08, 0.2, 0x5f8aa3, { y: 0.36, z: -0.78 });
  p.cyl(0.06, 0.07, 0.24, 0x2f5f8a, { y: 0.46, z: -1.0 }, 10);
  for (let i = 0; i < 6; i++) p.cyl(0.13, 0.13, 0.06, 0x9aa3a9, { x: 0, y: 0.12, z: -0.4 + i * 0.3 }, 12);
  p.box(0.04, 0.04, 1.8, 0x4f545c, { y: 0.2, z: 0.15 });
  return p.build();
}

export function tugGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  hull(p, 0.3, 0.8, 0.1, 0x2d3640, 0xb23a30);
  p.tex = 0;
  p.box(0.26, 0.2, 0.3, WHITE, { y: 0.1, z: -0.05 });
  p.box(0.28, 0.07, 0.2, 0x5f8aa3, { y: 0.24, z: -0.02 });
  p.box(0.3, 0.02, 0.24, 0xb23a30, { y: 0.31, z: -0.02 });
  p.cyl(0.04, 0.045, 0.2, 0xb23a30, { y: 0.31, z: -0.14 }, 8);
  for (const x of [-0.16, 0.16]) p.cyl(0.04, 0.04, 0.05, 0x1f2124, { x, y: 0.02, z: 0.3 }, 8);
  return p.build();
}

export function sailboatGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  hull(p, 0.2, 0.7, 0.06, 0xf1f1ec, 0x2f5f8a);
  p.tex = 0;
  p.cyl(0.012, 0.012, 0.8, 0xdcdcd6, { y: 0.05, z: 0.05 }, 6);
  p.box(0.012, 0.55, 0.34, 0xf6f4ee, { y: 0.12, z: -0.14 });
  p.box(0.012, 0.4, 0.2, 0xd8453a, { y: 0.14, z: 0.2, rx: 0.1 });
  return p.build();
}

/** The showroom turntable: a wide low plinth with a lighter top and a ring of lamps. */
export function turntableGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(2.7, 2.8, 0.14, 0x4a4f56, { y: 0.0 }, 36);
  p.cyl(2.5, 2.5, 0.05, 0xd9d4c6, { y: 0.14 }, 36);
  p.cyl(2.25, 2.25, 0.02, 0x2f5f8a, { y: 0.19 }, 36);
  p.cyl(2.1, 2.1, 0.02, 0xe9e6dc, { y: 0.21 }, 36);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.sphere(0.06, i % 2 ? 0xf6efc8 : 0xe8a23a, { x: Math.cos(a) * 2.6, y: 0.2, z: Math.sin(a) * 2.6 }, 1);
  }
  return p.build();
}

/** A rubber duck as big as a house. */
export function duckGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.sphere(0.26, 0xf5c542, { y: 0.06, z: -0.05 }, 2);
  p.sphere(0.17, 0xf5c542, { y: 0.34, z: 0.14 }, 2);
  p.box(0.12, 0.05, 0.12, 0xe8742a, { y: 0.33, z: 0.3 });
  p.sphere(0.03, 0x1f2124, { x: -0.07, y: 0.4, z: 0.26 }, 1);
  p.sphere(0.03, 0x1f2124, { x: 0.07, y: 0.4, z: 0.26 }, 1);
  p.box(0.05, 0.14, 0.2, 0xe9b834, { y: 0.14, z: -0.3, rx: 0.4 });
  return p.build();
}

/** The humps and head of a lake monster, which comes up for a look now and then. */
export function monsterGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  const green = 0x3f6b4e;
  p.sphere(0.22, green, { y: 0.0, z: 0.0 }, 2);
  p.sphere(0.2, 0x4a7a58, { y: 0.0, z: -0.5 }, 2);
  p.sphere(0.16, green, { y: 0.0, z: -0.95 }, 2);
  p.cyl(0.07, 0.1, 0.55, green, { y: 0.05, z: 0.55 }, 8);
  p.sphere(0.1, 0x4a7a58, { y: 0.6, z: 0.62 }, 2);
  p.box(0.07, 0.05, 0.12, 0x4a7a58, { y: 0.58, z: 0.74 });
  p.sphere(0.02, 0xf1f1ec, { x: -0.06, y: 0.65, z: 0.7 }, 1);
  p.sphere(0.02, 0xf1f1ec, { x: 0.06, y: 0.65, z: 0.7 }, 1);
  return p.build();
}

/** A hot air balloon in stripes. */
export function balloonGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  const bands = [0xb23a30, 0xf0efe8, 0x2f5f8a, 0xf0efe8, 0xd7a21f, 0xf0efe8];
  const radii = [0.1, 0.28, 0.4, 0.44, 0.38, 0.22, 0.1];
  bands.forEach((c, i) => p.cyl(radii[i + 1], radii[i], 0.18, c, { y: 0.55 + i * 0.18 }, 12));
  p.box(0.16, 0.12, 0.16, 0x8a5e3f, { y: 0.0 });
  for (const [x, z] of [[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]]) p.box(0.01, 0.5, 0.01, 0x4a3b2a, { x, y: 0.12, z });
  return p.build();
}

/** A flying saucer, and the cow it has taken a fancy to. */
export function ufoGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(0.6, 0.18, 0.12, 0x9aa3a9, { y: 0.0 }, 24);
  p.cyl(0.28, 0.6, 0.1, 0xb4bcc2, { y: 0.12 }, 24);
  p.dome(0.28, 0x7fd6c8, { y: 0.22 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.sphere(0.035, i % 2 ? 0xf2d36b : 0xe8553a, { x: Math.cos(a) * 0.5, y: 0.1, z: Math.sin(a) * 0.5 }, 1);
  }
  return p.build();
}

export function cowGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(0.12, 0.08, 0.22, 0xf1f1ec, { y: 0.07 });
  p.box(0.05, 0.05, 0.05, 0xf1f1ec, { y: 0.1, z: 0.14 });
  p.box(0.07, 0.04, 0.07, 0x2a2d31, { y: 0.1, z: 0.04 });
  p.box(0.05, 0.04, 0.08, 0x2a2d31, { x: 0.04, y: 0.12, z: -0.07 });
  for (const [x, z] of [[-0.04, 0.08], [0.04, 0.08], [-0.04, -0.08], [0.04, -0.08]]) p.box(0.02, 0.07, 0.02, 0xf1f1ec, { x, y: 0.0, z });
  return p.build();
}

type Point = { pos: THREE.Vector3; up: THREE.Vector3; forward: THREE.Vector3 };
type Tile = { x: number; y: number };

interface Mover {
  mesh: THREE.Mesh;
  path: Tile[];
  /** Tiles per second. */
  speed: number;
  scale: number;
  phase: number;
  /** How far above the surface it sits: 0 for boats, more for things in the air. */
  alt: number;
  bob: number;
  /** For things that rise and sink: seconds per cycle (0 for none). */
  dive: number;
  /** Seconds added to the clock for the dive cycle, to time the surfacing. */
  divePhase: number;
}

/** The things that move about in the opening: they follow tile paths, bobbing, and are set each frame. */
export class OpeningProps {
  private readonly group = new THREE.Group();
  private readonly movers: Mover[] = [];
  private readonly extra: { mesh: THREE.Mesh; tick: (t: number) => void }[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly material: THREE.Material,
    private readonly pointOn: (path: Tile[], f: number) => Point,
  ) {
    scene.add(this.group);
  }

  /** Something that moves back and forth along a line of tiles. */
  addMover(geo: THREE.BufferGeometry, path: Tile[], speed: number, scale: number, opts: { alt?: number; bob?: number; dive?: number; phase?: number; divePhase?: number } = {}): void {
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = true;
    this.group.add(mesh);
    this.movers.push({ mesh, path, speed, scale, phase: opts.phase ?? 0, alt: opts.alt ?? 0, bob: opts.bob ?? 0.04, dive: opts.dive ?? 0, divePhase: opts.divePhase ?? 0 });
  }

  /** A mesh the caller moves itself each frame. */
  addCustom(geo: THREE.BufferGeometry | null, material: THREE.Material | null, tick: (t: number, mesh: THREE.Mesh) => void): THREE.Mesh {
    const mesh = new THREE.Mesh(geo ?? new THREE.BufferGeometry(), material ?? this.material);
    mesh.matrixAutoUpdate = false;
    this.group.add(mesh);
    this.extra.push({ mesh, tick: (t) => tick(t, mesh) });
    return mesh;
  }

  private readonly disposables: { dispose(): void }[] = [];

  /** Where something stands on a tile: turned about its up axis, scaled, and lifted. */
  placeMatrix(tile: Tile, yaw: number, scale: number, lift = 0): THREE.Matrix4 {
    const pt = this.pointOn([tile, { x: tile.x, y: tile.y + 1 }], 0);
    const pos = pt.pos.clone().addScaledVector(pt.up, lift);
    return basisMatrix(pos, pt.up, pt.forward).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
  }

  /** Something that stands still: a figure, a compound, a crop circle. */
  addStatic(geo: THREE.BufferGeometry, tile: Tile, yaw: number, scale: number): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = true;
    mesh.matrix.copy(this.placeMatrix(tile, yaw, scale));
    mesh.matrixWorldNeedsUpdate = true;
    this.group.add(mesh);
    this.disposables.push(geo);
    return mesh;
  }

  /** Something that turns on the spot, like a radar dish. */
  addSpinner(geo: THREE.BufferGeometry, tile: Tile, scale: number, speed: number, lift = 0): THREE.Mesh {
    const base = this.placeMatrix(tile, 0, scale, lift);
    const mesh = this.addCustom(geo, null, (t, m) => {
      m.matrix.copy(base).multiply(new THREE.Matrix4().makeRotationY(t * speed));
      m.matrixWorldNeedsUpdate = true;
    });
    mesh.castShadow = true;
    this.disposables.push(geo);
    return mesh;
  }

  /** A sign on a post with its own words. */
  addSign(lines: string[], tile: Tile, yaw: number, w: number, bg: string, fg: string): void {
    const h = w / 2;
    const top = h + 0.7;
    const tex = signTexture(lines, bg, fg);
    const group = new THREE.Group();
    group.matrixAutoUpdate = false;
    group.matrix.copy(this.placeMatrix(tile, yaw, 1));
    group.matrixWorldNeedsUpdate = true;
    group.userData.tile = tile;
    const postGeo = signPostGeometry(w, h, top);
    const post = new THREE.Mesh(postGeo, this.material);
    post.castShadow = true;
    const panelMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const panelGeo = new THREE.PlaneGeometry(w, h);
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, top - h / 2 - 0.03, 0.03);
    group.add(post, panel);
    this.group.add(group);
    this.disposables.push(postGeo, panelGeo, panelMat, tex);
  }

  /** The tile a mover is over now, for the camera to follow. */
  tileOf(i: number): Tile | null {
    const m = this.movers[i];
    if (!m) return null;
    const last = m.path.length - 1;
    const cycle = (this.last * m.speed + m.phase) % (2 * last);
    const f = cycle <= last ? cycle : 2 * last - cycle;
    const a = m.path[Math.min(last, Math.floor(f))];
    const b = m.path[Math.min(last, Math.floor(f) + 1)];
    const k = f - Math.floor(f);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  private last = 0;

  private at(m: Mover, t: number): Point {
    const last = m.path.length - 1;
    // Ping-pong along the path, turning round at each end.
    const cycle = (t * m.speed + m.phase) % (2 * last);
    const f = cycle <= last ? cycle : 2 * last - cycle;
    const dir = cycle <= last ? 1 : -1;
    const pt = this.pointOn(m.path, f);
    const forward = dir === 1 ? pt.forward : pt.forward.clone().negate();
    return { pos: pt.pos, up: pt.up, forward };
  }

  update(t: number): void {
    this.last = t;
    for (const m of this.movers) {
      const pt = this.at(m, t);
      const bob = m.bob * Math.sin(t * 1.3 + m.phase * 3);
      let lift = m.alt + bob;
      if (m.dive > 0) lift += -0.85 + 1.25 * Math.max(0, Math.sin(((t + m.divePhase) / m.dive) * Math.PI * 2));
      const pos = pt.pos.clone().addScaledVector(pt.up, lift);
      m.mesh.matrix.copy(basisMatrix(pos, pt.up, pt.forward)).multiply(new THREE.Matrix4().makeScale(m.scale, m.scale, m.scale));
      m.mesh.matrixWorldNeedsUpdate = true;
    }
    for (const e of this.extra) e.tick(t);
  }

  dispose(): void {
    this.scene.remove(this.group);
    for (const m of this.movers) m.mesh.geometry.dispose();
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    this.movers.length = 0;
    this.extra.length = 0;
  }
}
