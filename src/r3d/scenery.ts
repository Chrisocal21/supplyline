// Trees, boulders and resource-node markers, placed on the terrain as instanced meshes.
import * as THREE from 'three';
import type { NodeKind } from '../sim/defs';
import { tileLonLat } from '../sim/mapgen';
import { plotTiles, townTiles, type World } from '../sim/world';
import { HeightField, LAT_SPAN, R, basisMatrix, lonLatToVec } from './geo';
import { Parts } from './parts';
import { specialtyNodeProps } from './specialty';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise in 0..1, for groves and glades. */
function grove(seed: number, x: number, y: number): number {
  const h = (ix: number, iy: number): number => {
    let a = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + seed) >>> 0;
    a = Math.imul(a ^ (a >>> 13), 1274126177) >>> 0;
    return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx;
  const bot = h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx;
  return top * (1 - sy) + bot * sy;
}

/** Small scenes that mark an unused resource node, so each kind is recognisable and none looks like a quarry. */
function nodeProps(kind: NodeKind): THREE.BufferGeometry {
  const p = new Parts();
  const GREEN = 0x4a7a3c;
  switch (kind) {
    case 'farmland':
      // Hay bales at the field corner, a hedge along one side and a tractor parked at the gate.
      for (const [x, z] of [[0.7, 0.62], [0.98, 0.7], [0.82, 0.9]]) p.cyl(0.16, 0.16, 0.3, 0xd0b050, { x, y: 0.16, z, rz: Math.PI / 2 }, 10);
      for (let i = 0; i < 7; i++) p.sphere(0.13 + (i % 2) * 0.03, i % 3 ? 0x3f6a38 : GREEN, { x: -1.0 + i * 0.32, y: 0.12, z: -1.75 }, 0);
      p.box(0.34, 0.16, 0.22, 0x4a7a4a, { x: -0.75, y: 0.1, z: 1.05 });
      p.box(0.14, 0.16, 0.18, 0x4a7a4a, { x: -0.6, y: 0.2, z: 1.05 });
      for (const [x, z] of [[-0.9, 0.97], [-0.9, 1.13], [-0.62, 0.97], [-0.62, 1.13]]) p.cyl(0.07, 0.07, 0.05, 0x1f2124, { x, y: 0.07, z, rx: Math.PI / 2 }, 8);
      break;
    case 'pasture': {
      // A post-and-rail fence round the meadow with a gap at the front, and a small herd.
      const hx = 1.15;
      const hz = 0.95;
      for (let i = -4; i <= 4; i++) {
        const t = i / 4;
        for (const z of [-hz, hz]) if (!(z > 0 && Math.abs(t) < 0.3)) p.box(0.05, 0.3, 0.05, 0x7a5a3c, { x: t * hx, y: 0.05, z });
        if (Math.abs(i) < 4) {
          for (const z of [-hz, hz]) if (!(z > 0 && Math.abs(t) < 0.4)) {
            p.box(hx / 4, 0.03, 0.03, 0x8a6a48, { x: (t + 0.125) * hx, y: 0.17, z });
            p.box(hx / 4, 0.03, 0.03, 0x8a6a48, { x: (t + 0.125) * hx, y: 0.27, z });
          }
        }
      }
      for (let i = -3; i <= 3; i++) {
        const t = i / 3;
        for (const x of [-hx, hx]) {
          p.box(0.05, 0.3, 0.05, 0x7a5a3c, { x, y: 0.05, z: t * hz });
        }
      }
      for (const [x, z, c] of [[-0.4, 0.1, 0xf2f0ea], [0.25, -0.3, 0x6b4a32], [0.55, 0.25, 0xe6dfd0], [-0.2, -0.45, 0x8a6a48]]) {
        p.box(0.34, 0.2, 0.16, c, { x, y: 0.12, z });
        p.box(0.12, 0.12, 0.12, c, { x: x + 0.22, y: 0.2, z });
        for (const [lx, lz] of [[-0.12, -0.05], [0.12, -0.05], [-0.12, 0.05], [0.12, 0.05]]) p.box(0.04, 0.12, 0.04, 0x3a3a3a, { x: x + lx, y: 0.02, z: z + lz });
      }
      break;
    }
    case 'orchard':
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const x = -0.7 + c * 0.7;
          const z = -0.55 + r * 0.55;
          p.cyl(0.04, 0.05, 0.28, 0x5b4630, { x, y: 0.04, z }, 6);
          p.sphere(0.27, 0x5f8a45, { x, y: 0.42, z }, 1);
          p.sphere(0.04, 0xc8453b, { x: x + 0.12, y: 0.5, z: z + 0.16 }, 0);
          p.sphere(0.04, 0xd9a02a, { x: x - 0.14, y: 0.4, z: z + 0.14 }, 0);
        }
      }
      break;
    case 'clay':
      // A small pond in the clay bank with reeds, and a stack of dug clay.
      p.cyl(0.46, 0.46, 0.03, 0x4f7f96, { x: -0.25, y: 0.02, z: -0.1 }, 16);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        p.cone(0.03, 0.4, 0x7a8f4a, { x: -0.25 + Math.cos(a) * 0.52, y: 0.03, z: -0.1 + Math.sin(a) * 0.46 }, 5);
      }
      for (const [x, z, w] of [[0.6, 0.4, 0.34], [0.9, 0.5, 0.28], [0.72, 0.7, 0.3]]) p.box(w, 0.16, 0.22, 0xb0603f, { x, y: 0.03, z });
      break;
    case 'forest':
      p.cyl(0.1, 0.12, 0.12, 0x6a4a30, { x: -0.6, y: 0.02, z: 0.5 }, 8);
      p.cyl(0.09, 0.11, 0.1, 0x6a4a30, { x: 0.9, y: 0.02, z: -0.3 }, 8);
      for (const [x, y, z] of [[0.3, 0.02, 0.8], [0.3, 0.02, 1.0], [0.3, 0.17, 0.9]]) p.cyl(0.08, 0.08, 0.7, 0xc7a068, { x, y, z, rz: Math.PI / 2 }, 8);
      break;
    case 'quarry':
      for (const [x, z, r] of [[-0.6, 0.5, 0.26], [0.7, -0.5, 0.3], [0.9, 0.4, 0.2], [-0.8, -0.4, 0.22]]) p.sphere(r, 0x9a9ea3, { x, y: 0.12, z }, 0);
      for (const [x, y, z] of [[0.2, 0.02, 0.9], [0.55, 0.02, 0.95], [0.38, 0.18, 0.92]]) p.box(0.34, 0.16, 0.24, 0xc4c1b8, { x, y, z });
      for (const x of [-0.3, 0.3]) {
        p.cyl(0.03, 0.03, 0.5, 0xe6e2d6, { x, y: 0.02, z: 1.15 }, 6);
        p.box(0.05, 0.1, 0.05, 0xcf4a30, { x, y: 0.42, z: 1.15 });
      }
      break;
    case 'mine': {
      // A timbered adit mouth set in a spoil bank, with an ore cart on its rails.
      p.cone(0.8, 0.7, 0x6b5a50, { x: 0, y: 0.02, z: -0.5 }, 9);
      p.box(0.07, 0.62, 0.07, 0x7a5a3c, { x: -0.32, y: 0.02, z: 0.0 });
      p.box(0.07, 0.62, 0.07, 0x7a5a3c, { x: 0.32, y: 0.02, z: 0.0 });
      p.box(0.78, 0.09, 0.1, 0x7a5a3c, { x: 0, y: 0.62, z: 0.0 });
      p.box(0.54, 0.54, 0.04, 0x1d1b1a, { x: 0, y: 0.04, z: -0.04 });
      p.box(0.34, 0.2, 0.26, 0x8a5a4a, { x: 0.15, y: 0.07, z: 0.7 });
      for (const [x, z] of [[0.02, 0.6], [0.28, 0.6], [0.02, 0.8], [0.28, 0.8]]) p.cyl(0.06, 0.06, 0.04, 0x1f2124, { x, y: 0.04, z, rz: Math.PI / 2 }, 8);
      break;
    }
    case 'coffee':
    case 'mango':
    case 'oil':
      specialtyNodeProps(p, kind);
      break;
    case 'coal':
      p.cone(0.6, 0.55, 0x2b2d31, { x: -0.1, y: 0.02, z: -0.3 }, 9);
      p.cone(0.36, 0.34, 0x33353a, { x: 0.55, y: 0.02, z: 0.1 }, 8);
      p.cone(0.28, 0.26, 0x2b2d31, { x: -0.7, y: 0.02, z: 0.45 }, 8);
      p.box(0.34, 0.2, 0.26, 0x3a3d40, { x: 0.15, y: 0.07, z: 0.85 });
      for (const [x, z] of [[0.02, 0.76], [0.28, 0.76], [0.02, 0.94], [0.28, 0.94]]) p.cyl(0.06, 0.06, 0.04, 0x1f2124, { x, y: 0.04, z, rz: Math.PI / 2 }, 8);
      break;
  }
  return p.build();
}

function pineGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(0.04, 0.06, 0.32, 0x5b4630, {}, 6);
  p.cone(0.46, 0.85, 0x3d6a46, { y: 0.2 }, 8);
  p.cone(0.36, 0.72, 0x44744d, { y: 0.55 }, 8);
  p.cone(0.25, 0.6, 0x4c7f55, { y: 0.88 }, 8);
  return p.build();
}

function broadleafGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(0.05, 0.07, 0.55, 0x5b4630, {}, 6);
  p.sphere(0.42, 0x4f7a3d, { y: 0.85 }, 1);
  p.sphere(0.3, 0x5d8c47, { x: 0.18, y: 1.02, z: 0.06 }, 1);
  return p.build();
}

function rockGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(0.5, 0);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) * 0.7);
  g.computeVertexNormals();
  return g;
}

/** One tree or boulder: where it stands and how it is turned and sized. */
interface Spot {
  tile: number;
  lon: number;
  lat: number;
  kind: 'pine' | 'round' | 'rock';
  scale: number;
  yaw: number;
  shade: number;
}

interface Slot {
  mesh: THREE.InstancedMesh;
  i: number;
  spot: Spot;
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const QUALITY_COLOR = [0xb08a60, 0xe0b040, 0x5fd3a0];

export class Scenery {
  readonly group = new THREE.Group();
  private readonly slots = new Map<number, Slot[]>();
  private readonly markers = new Map<number, { mesh: THREE.Group; kind: NodeKind; id: number }>();

  constructor(
    private readonly world: World,
    private readonly hf: HeightField,
  ) {
    this.buildTrees();
    this.buildMarkers();
    this.buildPlotMarkers();
    this.buildNodeProps();
  }

  private readonly props = new Map<number, THREE.Object3D>();

  /** A small scene on every resource node, shown until a building takes the node over. */
  private buildNodeProps(): void {
    const w = this.world;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const geos = new Map<NodeKind, THREE.BufferGeometry>();
    for (const n of w.nodes) {
      let g = geos.get(n.kind);
      if (!g) {
        g = nodeProps(n.kind);
        geos.set(n.kind, g);
      }
      const m = new THREE.Mesh(g, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      const { lon, lat } = tileLonLat(w.width, w.height, n.x, n.y);
      const pos = lonLatToVec(lon, lat, R + this.hf.surface(lon, lat) - 0.02);
      const up = pos.clone().normalize();
      const east = new THREE.Vector3(0, 1, 0).cross(up).normalize();
      // Fields and orchards turn to their own angle; the rest face the front.
      const yaw = n.kind === 'farmland' ? (n.id % 4) * (Math.PI / 2) : n.kind === 'orchard' ? ((n.id * 2.399) % (Math.PI * 2)) : n.kind === 'forest' ? n.id * 1.3 : 0;
      m.matrix.copy(basisMatrix(pos, up, east)).multiply(new THREE.Matrix4().makeRotationY(yaw));
      m.matrixWorldNeedsUpdate = true;
      this.group.add(m);
      this.props.set(n.id, m);
    }
  }

  /** Hide the scene on nodes that have a building on them. */
  setNodesUsed(used: Set<number>): void {
    for (const [id, m] of this.props) m.visible = !used.has(id);
  }

  private tileIndex(x: number, y: number): number {
    return y * this.world.width + x;
  }

  private buildTrees(): void {
    const w = this.world;
    const r = rng(w.seed ^ 0x51ed);
    const dLon = (Math.PI * 2) / w.width;
    const dLat = (2 * LAT_SPAN) / w.height;

    const spots: Spot[] = [];
    const nearNode = (x: number, y: number, jx: number, jy: number): boolean =>
      w.nodes.some((n) => {
        let dx = Math.abs(n.x - x);
        dx = Math.min(dx, w.width - dx);
        return n.kind === 'forest' && Math.hypot(dx + (jx - 0.5), Math.abs(n.y - y) + (jy - 0.5)) < 1.2 && dx <= 2 && Math.abs(n.y - y) <= 2;
      });

    // Trees keep clear of every node that is not a forest: fields, meadows, pits and yards need their space.
    const nearQuarry = (x: number, y: number): boolean =>
      w.nodes.some((n) => {
        if (n.kind === 'forest') return false;
        let dx = Math.abs(n.x - x);
        dx = Math.min(dx, w.width - dx);
        const r = n.kind === 'farmland' || n.kind === 'pasture' || n.kind === 'orchard' ? 1 : 1;
        return dx <= r && Math.abs(n.y - y) <= r;
      });

    // Trees keep off the land a town will grow over.
    const town = new Set<number>();
    for (const p of w.places) for (const t of townTiles(w, p)) town.add(this.tileIndex(t.x, t.y));

    for (let y = 0; y < w.height; y++) {
      for (let x = 0; x < w.width; x++) {
        const t = w.terrain[this.tileIndex(x, y)];
        if (t !== 'forest' && t !== 'grass' && t !== 'mountain') continue;
        const { lon, lat } = tileLonLat(w.width, w.height, x, y);
        // Forests thicken and thin, and grassland has groves and open meadow instead of an even sprinkle.
        const gv = grove(w.seed, x * 0.33, y * 0.33);
        const count = t === 'forest' ? 3 + Math.round(gv * 3) : t === 'mountain' ? 2 : r() < 0.015 + 0.2 * Math.max(0, gv - 0.58) * 2 ? 1 + (gv > 0.72 ? 1 : 0) : 0;
        for (let k = 0; k < count; k++) {
          const jx = r();
          const jy = r();
          if (t === 'forest' && nearNode(x, y, jx, jy)) continue;
          if (nearQuarry(x, y)) continue;
          if (town.has(this.tileIndex(x, y))) continue;
          spots.push({
            tile: this.tileIndex(x, y),
            lon: lon + (jx - 0.5) * dLon * 0.92,
            lat: lat + (jy - 0.5) * dLat * 0.92,
            kind: t === 'mountain' ? 'rock' : t === 'grass' || r() < 0.28 ? 'round' : 'pine',
            scale: t === 'mountain' ? 0.22 + r() * 0.5 : t === 'grass' ? 0.55 + r() * 0.35 : 0.85 + r() * 0.6,
            yaw: r() * Math.PI * 2,
            shade: r(),
          });
        }
      }
    }

    const make = (kind: Spot['kind'], geo: THREE.BufferGeometry, mat: THREE.Material): void => {
      const list = spots.filter((s) => s.kind === kind);
      if (list.length === 0) return;
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      mesh.castShadow = kind !== 'rock';
      mesh.receiveShadow = true;
      const col = new THREE.Color();
      list.forEach((s, i) => {
        mesh.setMatrixAt(i, this.seat(s));
        const base = kind === 'rock' ? 0.55 + s.shade * 0.35 : 0.8 + s.shade * 0.4;
        mesh.setColorAt(i, col.setScalar(base));
        const arr = this.slots.get(s.tile) ?? [];
        arr.push({ mesh, i, spot: s });
        this.slots.set(s.tile, arr);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    };

    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    make('pine', pineGeometry(), treeMat);
    make('round', broadleafGeometry(), treeMat);
    make('rock', rockGeometry(), new THREE.MeshStandardMaterial({ color: 0x8f8d88, roughness: 1, flatShading: true }));
  }

  /** Where a tree or boulder stands, on the ground as it is now. Boulders sit bedded into the slope. */
  private seat(s: Spot): THREE.Matrix4 {
    const pos = lonLatToVec(s.lon, s.lat, R + this.hf.surface(s.lon, s.lat) - (s.kind === 'rock' ? 0.12 * s.scale : 0.04));
    const up = pos.clone().normalize();
    const east = new THREE.Vector3(0, 1, 0).cross(up).normalize();
    return basisMatrix(pos, up, east)
      .multiply(new THREE.Matrix4().makeRotationY(s.yaw))
      .multiply(new THREE.Matrix4().makeScale(s.scale, s.scale * (0.9 + s.shade * 0.3), s.scale));
  }

  /** Stand the trees and rocks on these tiles back on the ground, after a road has regraded it. */
  reseat(tiles: Iterable<number>): void {
    const touched = new Set<THREE.InstancedMesh>();
    for (const t of tiles) {
      for (const s of this.slots.get(t) ?? []) {
        s.mesh.setMatrixAt(s.i, this.seat(s.spot));
        touched.add(s.mesh);
      }
    }
    for (const m of touched) m.instanceMatrix.needsUpdate = true;
  }

  /** Remove the trees and rocks standing on these tiles, for roads and buildings. */
  clearTiles(tiles: Iterable<number>): void {
    const touched = new Set<THREE.InstancedMesh>();
    for (const t of tiles) {
      const list = this.slots.get(t);
      if (!list) continue;
      for (const s of list) {
        s.mesh.setMatrixAt(s.i, ZERO);
        touched.add(s.mesh);
      }
      this.slots.delete(t);
    }
    for (const m of touched) m.instanceMatrix.needsUpdate = true;
  }

  private buildMarkers(): void {
    const w = this.world;
    const ring = new THREE.TorusGeometry(1.35, 0.07, 6, 40);
    ring.rotateX(Math.PI / 2);
    const beam = new THREE.CylinderGeometry(0.1, 0.1, 5, 6, 1, true);
    beam.translate(0, 2.5, 0);
    for (const n of w.nodes) {
      const color = QUALITY_COLOR[n.quality];
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
      const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
      const g = new THREE.Group();
      g.add(new THREE.Mesh(ring, mat));
      g.add(new THREE.Mesh(beam, beamMat));
      const { lon, lat } = tileLonLat(w.width, w.height, n.x, n.y);
      const pos = lonLatToVec(lon, lat, R + this.hf.surface(lon, lat) + 0.12);
      const up = pos.clone().normalize();
      g.matrix.copy(basisMatrix(pos, up, new THREE.Vector3(0, 1, 0).cross(up).normalize()));
      g.matrixAutoUpdate = false;
      g.visible = false;
      this.group.add(g);
      this.markers.set(n.id, { mesh: g, kind: n.kind, id: n.id });
    }
  }

  private readonly plotMarkers: { mesh: THREE.Group; placeId: number; index: number }[] = [];

  private buildPlotMarkers(): void {
    const w = this.world;
    const ring = new THREE.TorusGeometry(1.3, 0.07, 6, 40);
    ring.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x5ad1c6, transparent: true, opacity: 0.9, depthWrite: false });
    for (const pl of w.places) {
      plotTiles(w, pl).forEach((t, index) => {
        if (index < 2) return;
        const g = new THREE.Group();
        g.add(new THREE.Mesh(ring, mat));
        const { lon, lat } = tileLonLat(w.width, w.height, ((t.x % w.width) + w.width) % w.width, t.y);
        const pos = lonLatToVec(lon, lat, R + this.hf.surface(lon, lat) + 0.12);
        const up = pos.clone().normalize();
        g.matrix.copy(basisMatrix(pos, up, new THREE.Vector3(0, 1, 0).cross(up).normalize()));
        g.matrixAutoUpdate = false;
        g.visible = false;
        this.group.add(g);
        this.plotMarkers.push({ mesh: g, placeId: pl.id, index });
      });
    }
  }

  /** Show the open, empty district plots while an industry tool is active. */
  showPlots(active: boolean, isFree: (placeId: number, index: number) => boolean): void {
    for (const m of this.plotMarkers) m.mesh.visible = active && isFree(m.placeId, m.index);
  }

  /** Show markers for free nodes of one kind (while a matching building tool is active). */
  showMarkers(kind: NodeKind | null, used: Set<number>): void {
    for (const m of this.markers.values()) m.mesh.visible = kind !== null && m.kind === kind && !used.has(m.id);
  }

  update(time: number): void {
    const s = 1 + Math.sin(time * 3) * 0.06;
    for (const m of this.markers.values()) {
      if (!m.mesh.visible) continue;
      m.mesh.children[0].scale.set(s, 1, s);
    }
    for (const m of this.plotMarkers) if (m.mesh.visible) m.mesh.children[0].scale.set(s, 1, s);
  }
}
