// Trees, boulders and resource-node markers, placed on the terrain as instanced meshes.
import { corridorTiles } from '../sim/corridors';
import * as THREE from 'three';
import type { NodeKind } from '../sim/defs';
import { tileLonLat } from '../sim/mapgen';
import { plotTiles, reservedGround, townGates, townGround, type World } from '../sim/world';
import { HeightField, LAT_SPAN, R, basisMatrix, lonLatToVec } from './geo';
import { Parts } from './parts';
import { specialtyNodeProps } from './specialty';
import { addCropRows, addTree, treeGeometry, treeLodGeometry } from './vegetation';
import { addCow } from './livestock';

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
      addCropRows(p, 0, -0.35, 2.2, 1.5, 12, 20);
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
      [[-0.6, 0.25], [0.15, -0.35], [0.6, 0.35], [-0.55, -0.5], [0.1, 0.55], [0.6, -0.4]].forEach(([x, z], i) =>
        addCow(p, x, 0.03, z, i, i * 0.8));
      break;
    }
    case 'orchard':
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 5; c++) {
          const x = -0.95 + c * 0.475;
          const z = -0.8 + r * 0.5;
          addTree(p, 'orchard', x, 0.04, z, 0.65, r * 5 + c);
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
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
        if (row === 2 && col === 1) continue;
        addTree(p, col % 2 ? 'oak' : 'pine', -0.85 + col * 0.85, 0.025, -0.85 + row * 0.7, 0.95 + ((row + col) % 3) * 0.17, row * 3 + col);
      }
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

function rockGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(0.5, 0);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) * 0.7);
  g.computeVertexNormals();
  return g;
}

/** A low bush: a few overlapping lumps of leaf, in vertex colours so each one can be tinted. */
function bushGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.sphere(0.34, 0x4f6f3a, { x: 0, y: 0.2, z: 0 }, 1);
  p.sphere(0.26, 0x5d7e45, { x: 0.28, y: 0.15, z: 0.1 }, 1);
  p.sphere(0.24, 0x466a38, { x: -0.22, y: 0.14, z: -0.14 }, 1);
  return p.build();
}

/** One tree, bush or boulder: where it stands and how it is turned and sized. */
interface Spot {
  tile: number;
  lon: number;
  lat: number;
  kind: 'pine' | 'round' | 'birch' | 'rock' | 'bush';
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
/** Trees are batched in square blocks of this many tiles. */
const CHUNK = 6;

/** One block of trees of one kind: the full model, the distant stand-in sharing its instances, and where it sits. */
interface TreeChunk {
  near: THREE.InstancedMesh;
  far: THREE.InstancedMesh | null;
  center: THREE.Vector3;
  radius: number;
}

export class Scenery {
  readonly group = new THREE.Group();
  private readonly slots = new Map<number, Slot[]>();
  private readonly chunks: TreeChunk[] = [];
  /** Blocks of trees closer to the camera than this draw the full model and cast shadows. */
  treeDetailDistance = 30;
  private readonly markers = new Map<number, { mesh: THREE.Group; kind: NodeKind; id: number }>();

  constructor(
    private readonly world: World,
    private readonly hf: HeightField,
  ) {
    this.buildTrees();
    this.buildMarkers();
    this.buildPlotMarkers();
    this.buildGates();
    this.buildStakes();
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

    // A mostly-land world has far more ground to plant than a sea-dotted one, so each tile is planted a little thinner: about
    // the same number of trees to draw, however much land there is.
    let landTiles = 0;
    for (const t of w.terrain) if (t !== 'water' && t !== 'ice') landTiles += 1;
    const thin = Math.min(1, 26000 / landTiles);
    const some = (n: number): number => {
      const c = n * thin;
      return Math.floor(c) + (r() < c - Math.floor(c) ? 1 : 0);
    };

    // Trees keep off the ground a town covers now. The land it will grow over stays as it is, a little thinner, and is
    // cleared as the town grows into it.
    const town = new Set<number>();
    const later = new Set<number>();
    for (const p of w.places) {
      for (const t of townGround(w, p)) town.add(this.tileIndex(t.x, t.y));
      for (const t of reservedGround(w, p)) if (!town.has(this.tileIndex(t.x, t.y))) later.add(this.tileIndex(t.x, t.y));
    }
    // Reserved ground looks like the country around it: in a wooded region it is wooded, elsewhere it keeps the usual
    // groves and open meadow. Towns were cut out of the forest when the map was made, so the woods are read from the
    // land around the town.
    const woodedAround = (x: number, y: number): boolean => {
      let wood = 0;
      let land = 0;
      for (let dy = -7; dy <= 7; dy += 2) {
        for (let dx = -7; dx <= 7; dx += 2) {
          const ny = y + dy;
          if (ny < 0 || ny >= w.height) continue;
          const k = this.tileIndex(x + dx, ny);
          if (town.has(k) || later.has(k)) continue;
          const tt = w.terrain[k];
          if (tt === 'water' || tt === 'ice') continue;
          land += 1;
          if (tt === 'forest') wood += 1;
        }
      }
      return land > 0 && wood / land > 0.35;
    };
    // And off the natural routes between towns, so a road laid along one fells nothing.
    const corridor = corridorTiles(w);

    for (let y = 0; y < w.height; y++) {
      for (let x = 0; x < w.width; x++) {
        let t = w.terrain[this.tileIndex(x, y)];
        if (t !== 'forest' && t !== 'grass' && t !== 'mountain') continue;
        if (t === 'grass' && later.has(this.tileIndex(x, y)) && woodedAround(x, y)) t = 'forest';
        const { lon, lat } = tileLonLat(w.width, w.height, x, y);
        // Forests thicken and thin, and grassland has groves and open meadow instead of an even sprinkle.
        const gv = grove(w.seed, x * 0.33, y * 0.33);
        const count = t === 'forest' ? 16 + Math.round(gv * 10) : t === 'mountain' ? 4 : r() < 0.12 + 0.8 * Math.max(0, gv - 0.35) ? 6 + Math.round(gv * 4) : 0;
        const trees = some(count);
        for (let k = 0; k < trees; k++) {
          const jx = r();
          const jy = r();
          if (t === 'forest' && nearNode(x, y, jx, jy)) continue;
          if (nearQuarry(x, y)) continue;
          if (town.has(this.tileIndex(x, y))) continue;
          if (later.has(this.tileIndex(x, y)) && r() < 0.25) continue;
          if (t !== 'mountain' && corridor.has(this.tileIndex(x, y))) continue;
          spots.push({
            tile: this.tileIndex(x, y),
            lon: lon + (jx - 0.5) * dLon * 0.92,
            lat: lat + (jy - 0.5) * dLat * 0.92,
            kind: t === 'mountain' ? 'rock' : t === 'grass' || r() < 0.28 ? (k % 3 === 0 ? 'birch' : 'round') : 'pine',
            scale: t === 'mountain' ? 0.22 + r() * 0.5 : t === 'grass' ? 0.55 + r() * 0.35 : 0.85 + r() * 0.6,
            yaw: r() * Math.PI * 2,
            shade: r(),
          });
        }
        // Undergrowth and loose stone fill in between the trees, so the land looks lived in and not planted: bushes thicken
        // with the groves, forest floors get a ragged edge of shrubs, and small rocks lie about the fields and woods.
        if ((t === 'forest' || t === 'grass') && !town.has(this.tileIndex(x, y)) && !corridor.has(this.tileIndex(x, y)) && !nearQuarry(x, y)) {
          const bushes = some(t === 'forest' ? 2 + Math.round(gv * 3) : gv > 0.3 ? 1 + Math.round(gv * 3) : r() < 0.18 ? 1 : 0);
          for (let k = 0; k < bushes; k++) {
            const jx = r();
            const jy = r();
            if (t === 'forest' && nearNode(x, y, jx, jy)) continue;
            if (later.has(this.tileIndex(x, y)) && r() < 0.25) continue;
            spots.push({
              tile: this.tileIndex(x, y),
              lon: lon + (jx - 0.5) * dLon * 0.94,
              lat: lat + (jy - 0.5) * dLat * 0.94,
              kind: 'bush',
              scale: 0.55 + r() * 0.6,
              yaw: r() * Math.PI * 2,
              shade: r(),
            });
          }
          if (r() < (t === 'forest' ? 0.09 : 0.08)) {
            spots.push({
              tile: this.tileIndex(x, y),
              lon: lon + (r() - 0.5) * dLon * 0.9,
              lat: lat + (r() - 0.5) * dLat * 0.9,
              kind: 'rock',
              scale: 0.12 + r() * 0.26,
              yaw: r() * Math.PI * 2,
              shade: r(),
            });
          }
        }
      }
    }

    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8f8d88, roughness: 1, flatShading: true });
    const shapes: Record<Spot['kind'], { geo: THREE.BufferGeometry; lod: THREE.BufferGeometry | null; mat: THREE.Material }> = {
      pine: { geo: treeGeometry('pine'), lod: treeLodGeometry('pine'), mat: treeMat },
      round: { geo: treeGeometry('oak'), lod: treeLodGeometry('oak'), mat: treeMat },
      birch: { geo: treeGeometry('birch', 1), lod: treeLodGeometry('birch'), mat: treeMat },
      rock: { geo: rockGeometry(), lod: null, mat: rockMat },
      bush: { geo: bushGeometry(), lod: null, mat: treeMat },
    };

    // One mesh per kind per block of tiles, so blocks off screen or over the horizon are culled and distant blocks
    // swap to the cheap stand-in tree.
    const groups = new Map<string, Spot[]>();
    for (const s of spots) {
      const tx = s.tile % w.width;
      const ty = Math.floor(s.tile / w.width);
      const key = `${s.kind}:${Math.floor(tx / CHUNK)}:${Math.floor(ty / CHUNK)}`;
      const list = groups.get(key);
      if (list) list.push(s);
      else groups.set(key, [s]);
    }

    const col = new THREE.Color();
    for (const list of groups.values()) {
      const kind = list[0].kind;
      const shape = shapes[kind];
      const mesh = new THREE.InstancedMesh(shape.geo, shape.mat, list.length);
      mesh.castShadow = kind !== 'rock' && kind !== 'bush';
      mesh.receiveShadow = true;
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
      let far: THREE.InstancedMesh | null = null;
      if (shape.lod) {
        far = new THREE.InstancedMesh(shape.lod, shape.mat, list.length);
        far.instanceMatrix = mesh.instanceMatrix;
        far.instanceColor = mesh.instanceColor;
        far.castShadow = false;
        far.receiveShadow = true;
        far.visible = false;
        far.computeBoundingSphere();
        this.group.add(far);
      }
      const sphere = mesh.boundingSphere ?? new THREE.Sphere();
      this.chunks.push({ near: mesh, far, center: sphere.center.clone(), radius: sphere.radius });
    }
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

  private reserveShade: THREE.Mesh | null = null;

  /**
   * A soft amber wash over ground that is set aside for a town or a district, shown while a building or road tool is active so
   * the player can see where they cannot build. It is made the first time it is wanted.
   */
  showReserved(active: boolean): void {
    if (active && !this.reserveShade) this.reserveShade = this.buildReserveShade();
    if (this.reserveShade) this.reserveShade.visible = active;
  }

  private buildReserveShade(): THREE.Mesh {
    const w = this.world;
    const dLon = (Math.PI * 2) / w.width;
    const dLat = (2 * LAT_SPAN) / w.height;
    const pos: number[] = [];
    const idx: number[] = [];
    const v = new THREE.Vector3();
    for (const p of w.places) {
      for (const t of reservedGround(w, p)) {
        const { lon, lat } = tileLonLat(w.width, w.height, ((t.x % w.width) + w.width) % w.width, t.y);
        const base = pos.length / 3;
        for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
          const lo = lon + a * dLon;
          const la = lat + b * dLat;
          lonLatToVec(lo, la, R + this.hf.surface(lo, la) + 0.07, v);
          pos.push(v.x, v.y, v.z);
        }
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe0883a, transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    this.group.add(mesh);
    return mesh;
  }

  private readonly gateMarkers: THREE.Group[] = [];

  /** Gold markers at the four gates of every town, shown while a road tool is active. */
  private buildGates(): void {
    const w = this.world;
    const ring = new THREE.TorusGeometry(1.1, 0.09, 6, 36);
    ring.rotateX(Math.PI / 2);
    const beam = new THREE.CylinderGeometry(0.12, 0.12, 4.5, 6, 1, true);
    beam.translate(0, 2.25, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf2b04c, transparent: true, opacity: 0.95, depthWrite: false });
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xf2b04c, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    for (const pl of w.places) {
      for (const t of townGates(w, pl)) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(ring, mat));
        g.add(new THREE.Mesh(beam, beamMat));
        const { lon, lat } = tileLonLat(w.width, w.height, ((t.x % w.width) + w.width) % w.width, t.y);
        const pos = lonLatToVec(lon, lat, R + this.hf.surface(lon, lat) + 0.14);
        const up = pos.clone().normalize();
        g.matrix.copy(basisMatrix(pos, up, new THREE.Vector3(0, 1, 0).cross(up).normalize()));
        g.matrixAutoUpdate = false;
        g.visible = false;
        this.group.add(g);
        this.gateMarkers.push(g);
      }
    }
  }

  showGates(active: boolean): void {
    for (const g of this.gateMarkers) g.visible = active;
  }

  /** Survey stakes at the corners of the ground each town is set to grow over, until it has grown to fill it. */
  private buildStakes(): void {
    const w = this.world;
    const post = new THREE.CylinderGeometry(0.05, 0.07, 1.5, 5);
    post.translate(0, 0.75, 0);
    const tip = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 5);
    tip.translate(0, 1.35, 0);
    const spots: THREE.Matrix4[] = [];
    for (const pl of w.places) {
      if (pl.level >= 5) continue;
      const full = [...townGround(w, pl), ...reservedGround(w, pl)];
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (const t of full) {
        const dx = ((t.x - pl.x + w.width * 1.5) % w.width) - w.width / 2;
        x0 = Math.min(x0, dx);
        x1 = Math.max(x1, dx);
        y0 = Math.min(y0, t.y - pl.y);
        y1 = Math.max(y1, t.y - pl.y);
      }
      for (const [cx, cy] of [[x0 - 0.5, y0 - 0.5], [x1 + 1.5, y0 - 0.5], [x0 - 0.5, y1 + 1.5], [x1 + 1.5, y1 + 1.5]]) {
        const tx = Math.floor(pl.x + cx);
        const ty = Math.floor(pl.y + cy);
        const { lon, lat } = tileLonLat(w.width, w.height, ((tx % w.width) + w.width) % w.width, ty);
        const pos = lonLatToVec(lon, lat, R + this.hf.surface(lon, lat) - 0.05);
        const up = pos.clone().normalize();
        spots.push(basisMatrix(pos, up, new THREE.Vector3(0, 1, 0).cross(up).normalize()));
      }
    }
    if (spots.length === 0) return;
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3e, roughness: 0.9 });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xe0a23a, roughness: 0.7 });
    const posts = new THREE.InstancedMesh(post, woodMat, spots.length);
    const tips = new THREE.InstancedMesh(tip, tipMat, spots.length);
    spots.forEach((m, i) => {
      posts.setMatrixAt(i, m);
      tips.setMatrixAt(i, m);
    });
    posts.castShadow = true;
    this.group.add(posts, tips);
  }

  /** Show the open, empty district plots while an industry tool is active. */
  showPlots(active: boolean, isFree: (placeId: number, index: number) => boolean): void {
    for (const m of this.plotMarkers) m.mesh.visible = active && isFree(m.placeId, m.index);
  }

  /** Show markers for free nodes of one kind (while a matching building tool is active). */
  showMarkers(kind: NodeKind | null, used: Set<number>): void {
    for (const m of this.markers.values()) m.mesh.visible = kind !== null && m.kind === kind && !used.has(m.id);
  }

  update(time: number, camera?: THREE.Camera): void {
    const s = 1 + Math.sin(time * 3) * 0.06;
    for (const m of this.markers.values()) {
      if (!m.mesh.visible) continue;
      m.mesh.children[0].scale.set(s, 1, s);
    }
    for (const m of this.plotMarkers) if (m.mesh.visible) m.mesh.children[0].scale.set(s, 1, s);
    if (camera) this.updateTreeLod(camera.position);
  }

  /** Hide tree blocks over the horizon, and draw distant ones with the cheap model and no shadow. */
  private updateTreeLod(eye: THREE.Vector3): void {
    const toEye = new THREE.Vector3();
    const up = new THREE.Vector3();
    for (const c of this.chunks) {
      toEye.subVectors(eye, c.center);
      up.copy(c.center).normalize();
      const visible = toEye.dot(up) > -c.radius;
      const near = visible && toEye.length() - c.radius < this.treeDetailDistance;
      c.near.visible = visible && (near || !c.far);
      if (c.far) c.far.visible = visible && !near;
    }
  }
}
