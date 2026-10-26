// Trees, boulders and resource-node markers, placed on the terrain as instanced meshes.
import { isDesert } from '../sim/desert';
import { corridorTiles } from '../sim/corridors';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { isSoftNode, type NodeKind } from '../sim/defs';
import { tileLonLat } from '../sim/mapgen';
import { parcelState, parcelsOf } from '../sim/land';
import { seasonLook } from './season';
import { LAND_PREFIX } from '../sim/land';
import { placeError, plannedTownAt, plotTiles, reservedGround, siteAt, terrainAt, townBlocks, townGates, townGround, wrapX, type Rot, type World } from '../sim/world';
import type { SiteKind } from '../sim/defs';
import { HeightField, LAT_SPAN, R, basisMatrix, lonLatToVec } from './geo';
import { Parts } from './parts';
import { specialtyNodeProps } from './specialty';
import { addBush, addCropRows, addTree, treeGeometry, treeLodGeometry } from './vegetation';
import { stoneLump } from './stones';
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

/**
 * Heaps of resource stone, one pattern per variant: [x, z, radius, flatten, seed, yaw]. The stones overlap, so each heap reads as one
 * tumbled mass with a big slab, leaning stones and loose ones round the foot. The near scene and the far pin share them, so a node
 * looks the same from a distance as it does up close. Each node picks a variant from its id.
 */
const HEAPS: [number, number, number, number, number, number][][] = [
  [[0, 0, 1.15, 0.8, 3, 0], [0.95, 0.3, 0.7, 0.75, 7, 0.2], [-0.8, -0.45, 0.65, 0.75, 11, 0.5], [0.3, 0.95, 0.32, 0.7, 19, 0.9], [-0.55, 0.8, 0.26, 0.7, 23, 0.3], [1.45, -0.4, 0.26, 0.7, 29, 0.7]],
  [[-0.7, 0, 0.85, 0.8, 31, 0.4], [0.1, 0.15, 0.95, 0.9, 37, 1.2], [0.95, -0.1, 0.7, 0.75, 41, 0.1], [0.2, 0.9, 0.4, 0.7, 43, 0.6], [-0.3, -0.75, 0.4, 0.7, 47, 0.2], [1.5, 0.5, 0.24, 0.7, 53, 0]],
  [[0, -0.2, 0.9, 1.15, 59, 0.3], [0.2, 0.7, 0.8, 0.55, 61, 0.8], [-0.95, 0.2, 0.5, 0.8, 67, 0.5], [1.0, -0.4, 0.5, 0.8, 71, 0.1], [-0.5, 1.0, 0.28, 0.7, 73, 0.2], [0.9, 1.0, 0.24, 0.7, 79, 0.6]],
  [[0, 0, 0.6, 0.85, 83, 0.2], [0.85, 0.2, 0.7, 0.8, 89, 0.7], [-0.7, 0.5, 0.65, 0.8, 97, 0.1], [-0.1, -0.85, 0.7, 0.8, 101, 0.9], [0.6, -0.8, 0.45, 0.75, 103, 0.4], [-1.3, -0.3, 0.3, 0.7, 107, 0.6]],
];

/** What each stone node is made of. */
const HEAP_COLOR: Partial<Record<NodeKind, number>> = { quarry: 0xb9ab95, mine: 0x9a6a52, coal: 0x58575f, clay: 0xc8784f };

/** Small scenes that mark an unused resource node, so each kind is recognisable and none looks like a quarry. */
function nodeProps(kind: NodeKind, variant = 0): THREE.BufferGeometry {
  const p = new Parts();
  const heapColor = HEAP_COLOR[kind];
  if (heapColor !== undefined) {
    // Each stone a touch lighter or darker than the last, so the heap is not one flat tone.
    const tint = new THREE.Color();
    HEAPS[variant % HEAPS.length].forEach(([x, z, r, flatten, seed, yaw], i) => {
      tint.setHex(heapColor).multiplyScalar(0.9 + (i % 3) * 0.08);
      p.stone(r, flatten, seed, tint.getHex(), { x, z, ry: yaw });
    });
    return p.build();
  }
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
    case 'quarry':
    case 'mine':
    case 'coal':
      break;
    case 'forest':
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
        if (row === 2 && col === 1) continue;
        addTree(p, col % 2 ? 'oak' : 'pine', -0.85 + col * 0.85, 0.025, -0.85 + row * 0.7, 0.95 + ((row + col) % 3) * 0.17, row * 3 + col);
      }
      p.cyl(0.1, 0.12, 0.12, 0x7a5a3c, { x: -0.6, y: 0.02, z: 0.5 }, 8);
      p.cyl(0.09, 0.11, 0.1, 0x7a5a3c, { x: 0.9, y: 0.02, z: -0.3 }, 8);
      for (const [x, y, z] of [[0.3, 0.02, 0.8], [0.3, 0.02, 1.0], [0.3, 0.17, 0.9]]) p.cyl(0.08, 0.08, 0.7, 0xc7a068, { x, y, z, rz: Math.PI / 2 }, 8);
      addBush(p, -1.15, 0.02, 0.2, 0.7);
      addBush(p, 0.2, 0.02, 0.55, 0.6);
      break;
    case 'coffee':
    case 'mango':
    case 'oil':
      specialtyNodeProps(p, kind);
      break;
  }
  return p.build();
}

function rockGeometry(): THREE.BufferGeometry {
  return stoneLump(0.5, 0.74, 17);
}

/** A low bush: a few overlapping lumps of leaf, in vertex colours so each one can be tinted. */
function bushGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  addBush(p, 0, 0, 0);
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
  /** How many trees the block holds; far away only a share of them (a random share: the list is shuffled) is drawn. */
  total: number;
}

/** Blocks of tree blocks: a whole region is skipped at once when it is over the horizon or too far to draw. */
interface TreeRegion {
  group: THREE.Group;
  chunks: TreeChunk[];
  center: THREE.Vector3;
  radius: number;
}

/** A region is this many tree blocks wide. */
const REGION = 8;

export class Scenery {
  readonly group = new THREE.Group();
  private readonly slots = new Map<number, Slot[]>();
  private readonly regions: TreeRegion[] = [];
  private lodFrame = 2;
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
    const geos = new Map<string, THREE.BufferGeometry>();
    const marks: { id: number; kind: NodeKind; matrix: THREE.Matrix4 }[] = [];
    for (const n of w.nodes) {
      if (isSoftNode(n.kind)) continue;
      const variant = n.id % HEAPS.length;
      const key = n.kind + ':' + (HEAP_COLOR[n.kind] === undefined ? 0 : variant);
      let g = geos.get(key);
      if (!g) {
        g = nodeProps(n.kind, variant);
        geos.set(key, g);
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
      // Far until the camera comes near: the pin stands in for the scene at a distance, and only one of the two shows.
      m.userData.far = true;
      m.userData.grow = HEAP_COLOR[n.kind] !== undefined ? 6 : 2.2;
      m.visible = false;
      this.group.add(m);
      this.props.set(n.id, m);
      marks.push({ id: n.id, kind: n.kind, matrix: m.matrix });
    }
    this.buildFarMarks(marks);
  }

  /**
   * A small marker on every free fixed resource node, shown at any distance until something is built on it, shaped for what the
   * node holds: rocks for stone, ore, coal and clay, a dark pool for oil, young pines for forest, round bushes for the island
   * coffee and mango groves. Fields, meadows and orchards go anywhere, so they have no marker. One instanced mesh per shape.
   */
  private farMarks: THREE.InstancedMesh[] = [];
  private readonly farIndex = new Map<number, { mesh: THREE.InstancedMesh; i: number; matrix: THREE.Matrix4 }>();
  private static readonly MARK_COLOR: Partial<Record<NodeKind, number>> = {
    forest: 0xffffff,
    quarry: HEAP_COLOR.quarry,
    mine: HEAP_COLOR.mine,
    coal: HEAP_COLOR.coal,
    clay: HEAP_COLOR.clay,
    oil: 0x101014,
    coffee: 0x3d5e2a,
    mango: 0x4f8a30,
  };

  private static markShape(kind: NodeKind): 'rock' | 'oil' | 'pine' | 'bush' {
    if (kind === 'oil') return 'oil';
    if (kind === 'forest') return 'pine';
    if (kind === 'coffee' || kind === 'mango') return 'bush';
    return 'rock';
  }

  private static markGeometry(shape: 'rock' | 'oil' | 'pine' | 'bush', variant = 0): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [];
    if (shape === 'rock') {
      // The same heap as the near scene.
      for (const [x, z, r, flatten, seed, yaw] of HEAPS[variant % HEAPS.length]) {
        const g = stoneLump(r, flatten, seed);
        g.rotateY(yaw);
        g.translate(x, r * flatten * 0.2, z);
        parts.push(g);
      }
    } else if (shape === 'oil') {
      // A dark pool with a lip of stained ground.
      parts.push(new THREE.CylinderGeometry(1.4, 1.5, 0.12, 12).translate(0, 0.06, 0));
      parts.push(new THREE.CylinderGeometry(0.7, 0.8, 0.2, 10).translate(0.6, 0.1, -0.4));
    } else if (shape === 'pine') {
      // Three painted pines, as the pin for a wood.
      const p = new Parts();
      p.foliage = { base: 0, height: 2.4 };
      for (const [x, z, s] of [[0, 0, 1.7], [0.9, 0.5, 1.2], [-0.8, 0.4, 1.35]]) {
        p.cyl(0.03 * s, 0.07 * s, 0.4 * s, 0x77593f, { x, z, t: 2 }, 4);
        p.cone(0.42 * s, 0.8 * s, 0x2f6c48, { x, y: 0.25 * s, z, t: 0 }, 6);
        p.cone(0.3 * s, 0.85 * s, 0x3a7a4c, { x, y: 0.72 * s, z, t: 0 }, 6);
      }
      return p.build();
    } else {
      for (const [x, z, r] of [[0, 0, 0.8], [0.9, 0.3, 0.55], [-0.7, 0.5, 0.6]]) parts.push(new THREE.IcosahedronGeometry(r, 0).translate(x, r * 0.9, z));
    }
    const geo = mergeGeometries(parts.map((g) => g.toNonIndexed()))!;
    geo.computeVertexNormals();
    return geo;
  }

  private buildFarMarks(marks: { id: number; kind: NodeKind; matrix: THREE.Matrix4 }[]): void {
    if (marks.length === 0) return;
    const col = new THREE.Color();
    const kinds: { shape: 'rock' | 'oil' | 'pine' | 'bush'; variant: number }[] = [];
    for (const shape of ['rock', 'oil', 'pine', 'bush'] as const) {
      if (shape === 'rock') for (let v = 0; v < HEAPS.length; v++) kinds.push({ shape, variant: v });
      else kinds.push({ shape, variant: 0 });
    }
    for (const { shape, variant } of kinds) {
      const mine = marks.filter((m) => Scenery.markShape(m.kind) === shape && (shape !== 'rock' || m.id % HEAPS.length === variant));
      if (mine.length === 0) continue;
      const mat = new THREE.MeshStandardMaterial({ roughness: shape === 'oil' ? 0.25 : 0.95, metalness: shape === 'oil' ? 0.3 : 0, flatShading: true, vertexColors: shape === 'rock' || shape === 'pine' });
      const mesh = new THREE.InstancedMesh(Scenery.markGeometry(shape, variant), mat, mine.length);
      mine.forEach((m, i) => {
        mesh.setMatrixAt(i, ZERO);
        col.setHex(Scenery.MARK_COLOR[m.kind] ?? 0xffffff);
        mesh.setColorAt(i, col);
        this.farIndex.set(m.id, { mesh, i, matrix: m.matrix });
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.farMarks.push(mesh);
    }
  }

  /** Show or hide one node's marker: shown while nothing has been built on it. */
  private setFarMark(id: number, on: boolean, scale = 1): void {
    const f = this.farIndex.get(id);
    if (!f) return;
    f.mesh.setMatrixAt(f.i, on ? this.pinMatrix.copy(f.matrix).multiply(this.pinScale.makeScale(scale, scale, scale)) : ZERO);
    f.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Hide the scene on nodes that have a building on them. */
  setNodesUsed(used: Set<number>): void {
    this.propUsed = new Set(used);
    for (const [id, m] of this.props) {
      m.visible = !used.has(id) && m.userData.far !== true;
      this.setFarMark(id, !used.has(id) && m.userData.far === true);
    }
  }
  private propUsed = new Set<number>();
  private readonly pinMatrix = new THREE.Matrix4();
  private readonly pinScale = new THREE.Matrix4();

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
        return !isSoftNode(n.kind) && dx <= 1 && Math.abs(n.y - y) <= 1;
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
        // Desert has no trees: a lone scrub bush here and there, and stones.
        const sand = isDesert(w, x, y);
        const count = sand ? 0 : t === 'forest' ? 16 + Math.round(gv * 10) : t === 'mountain' ? 4 : r() < 0.12 + 0.8 * Math.max(0, gv - 0.35) ? 6 + Math.round(gv * 4) : 0;
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
          const bushes = some(sand ? (r() < 0.05 ? 1 : 0) : t === 'forest' ? 2 + Math.round(gv * 3) : gv > 0.3 ? 1 + Math.round(gv * 3) : r() < 0.18 ? 1 : 0);
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

    // The foot of a mountain: shrubs, a few trees and loose stones gather on the gentle ground within two tiles of the rock, thickest
    // against it, so the grass runs up into the mountain instead of stopping at its wall.
    for (let y = 0; y < w.height; y++) {
      for (let x = 0; x < w.width; x++) {
        const tt = w.terrain[this.tileIndex(x, y)];
        if (tt !== 'forest' && tt !== 'grass' && tt !== 'mountain') continue;
        const ti = this.tileIndex(x, y);
        if (town.has(ti) || corridor.has(ti) || nearQuarry(x, y) || isDesert(w, x, y)) continue;
        let closest = tt === 'mountain' ? 0 : 9;
        for (let dy = -2; dy <= 2; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= w.height) continue;
          for (let dx = -2; dx <= 2; dx++) if (w.terrain[this.tileIndex(x + dx, ny)] === 'mountain') closest = Math.min(closest, Math.max(Math.abs(dx), Math.abs(dy)));
        }
        if (closest > 2) continue;
        // On the mountain itself only the low, gentle ground between the slabs takes plants (the slope and treeline filter below).
        // Many candidate spots on every tile here; the slope and treeline filter below keeps only the gentle ground, so the green
        // pockets between slabs fill with shrubs and scattered trees and no straight grass edge is left bare.
        const candidates = tt === 'mountain' ? 9 : closest <= 1 ? 7 : 3;
        const { lon, lat } = tileLonLat(w.width, w.height, x, y);
        for (let k = 0; k < candidates; k++) {
          const roll = r();
          const kind: Spot['kind'] | null = roll < 0.42 ? 'bush' : roll < 0.64 ? 'rock' : roll < 0.84 ? (r() < 0.55 ? 'pine' : r() < 0.5 ? 'birch' : 'round') : null;
          if (!kind) continue;
          const scale = kind === 'bush' ? 0.5 + r() * 0.7 : kind === 'rock' ? 0.1 + r() * 0.3 : 0.7 + r() * 0.6;
          spots.push({ tile: ti, lon: lon + (r() - 0.5) * dLon * 0.96, lat: lat + (r() - 0.5) * dLat * 0.96, kind, scale, yaw: r() * Math.PI * 2, shade: r() });
        }
      }
    }

    // Nothing grows or lies on a cliff face. Trees and bushes need gentle ground; stones may lie on a moderate slope, so they gather as
    // scree at the foot of a cliff and not stuck to its wall. Slope is rise over run, measured on the ground as drawn.
    const step = 0.45;
    const slopeAt = (sp: Spot): number => {
      const cl = Math.max(0.2, Math.cos(sp.lat));
      const h0 = this.hf.surface(sp.lon, sp.lat);
      const dl = step / (R * cl);
      const da = step / R;
      return Math.max(
        Math.abs(this.hf.surface(sp.lon + dl, sp.lat) - h0),
        Math.abs(this.hf.surface(sp.lon - dl, sp.lat) - h0),
        Math.abs(this.hf.surface(sp.lon, sp.lat + da) - h0),
        Math.abs(this.hf.surface(sp.lon, sp.lat - da) - h0),
      ) / step;
    };
    const kept = spots.filter((sp) => {
      const slope = slopeAt(sp);
      if (sp.kind === 'rock') return slope < (sp.scale > 0.4 ? 0.9 : 0.6);
      // A treeline: nothing grows on the high rock.
      return slope < (sp.kind === 'bush' ? 0.85 : 0.7) && this.hf.surface(sp.lon, sp.lat) < 7.5;
    });
    spots.length = 0;
    spots.push(...kept);

    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    // The leaves change with the season: the colour is the one the game eases (see season.ts).
    treeMat.color = seasonLook.leaf;
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, vertexColors: true });
    // Stones lie in the colour of the ground round them: warm sandstone beside a mountain, grey-brown elsewhere.
    const nearMountain = (tile: number): boolean => {
      const tx = tile % w.width;
      const ty = Math.floor(tile / w.width);
      for (let dy = -2; dy <= 2; dy++) {
        const ny = ty + dy;
        if (ny < 0 || ny >= w.height) continue;
        for (let dx = -2; dx <= 2; dx++) if (w.terrain[this.tileIndex(wrapX(w, tx + dx), ny)] === 'mountain') return true;
      }
      return false;
    };
    const stoneGrey = new THREE.Color(0xa09a90);
    const stoneSand = new THREE.Color(0xb39a7c);
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
    const byRegion = new Map<string, TreeRegion>();
    for (const list of groups.values()) {
      // A fixed shuffle, so drawing only the first part of a block thins it evenly instead of cutting one side away.
      let seed = list.length * 2654435761 + list[0].tile;
      for (let i = list.length - 1; i > 0; i--) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const j = seed % (i + 1);
        [list[i], list[j]] = [list[j], list[i]];
      }
      const kind = list[0].kind;
      const tx0 = list[0].tile % w.width;
      const ty0 = Math.floor(list[0].tile / w.width);
      const shape = shapes[kind];
      const mesh = new THREE.InstancedMesh(shape.geo, shape.mat, list.length);
      mesh.castShadow = kind !== 'rock' && kind !== 'bush';
      mesh.receiveShadow = true;
      list.forEach((s, i) => {
        mesh.setMatrixAt(i, this.seat(s));
        if (kind === 'rock') mesh.setColorAt(i, col.copy(nearMountain(s.tile) ? stoneSand : stoneGrey).multiplyScalar(0.78 + s.shade * 0.4));
        else mesh.setColorAt(i, col.setScalar(0.8 + s.shade * 0.4));
        const arr = this.slots.get(s.tile) ?? [];
        arr.push({ mesh, i, spot: s });
        this.slots.set(s.tile, arr);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      const rkey = `${Math.floor(tx0 / (CHUNK * REGION))}:${Math.floor(ty0 / (CHUNK * REGION))}`;
      let region = byRegion.get(rkey);
      if (!region) {
        region = { group: new THREE.Group(), chunks: [], center: new THREE.Vector3(), radius: 0 };
        byRegion.set(rkey, region);
        this.regions.push(region);
        this.group.add(region.group);
      }
      region.group.add(mesh);
      let far: THREE.InstancedMesh | null = null;
      if (shape.lod) {
        far = new THREE.InstancedMesh(shape.lod, shape.mat, list.length);
        far.instanceMatrix = mesh.instanceMatrix;
        far.instanceColor = mesh.instanceColor;
        far.castShadow = false;
        far.receiveShadow = true;
        far.visible = false;
        far.computeBoundingSphere();
        region.group.add(far);
      }
      const sphere = mesh.boundingSphere ?? new THREE.Sphere();
      region.chunks.push({ near: mesh, far, center: sphere.center.clone(), radius: sphere.radius, total: list.length });
    }
    for (const r of this.regions) {
      for (const c of r.chunks) r.center.add(c.center);
      r.center.divideScalar(r.chunks.length);
      for (const c of r.chunks) r.radius = Math.max(r.radius, r.center.distanceTo(c.center) + c.radius);
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
      if (isSoftNode(n.kind)) continue;
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

  private parcelGroup: THREE.Group | null = null;
  private parcelSig = '';

  /**
   * The land plots, shown while a building tool is active as faint outlines. Remade when a plot is bought.
   */
  setParcels(active: boolean, sig: string): void {
    const w = this.world;
    if (!w.landRules) return;
    if (active && sig !== this.parcelSig) {
      this.parcelSig = sig;
      if (this.parcelGroup) {
        this.group.remove(this.parcelGroup);
        this.parcelGroup.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) (m.material as THREE.Material).dispose();
        });
      }
      this.parcelGroup = this.buildParcels();
    }
    if (this.parcelGroup) this.parcelGroup.visible = active;
  }

  private buildParcels(): THREE.Group {
    const w = this.world;
    const group = new THREE.Group();
    const dLon = (Math.PI * 2) / w.width;
    const a = tileLonLat(w.width, w.height, 0, 0);
    const b = tileLonLat(w.width, w.height, 0, 1);
    const dLat = b.lat - a.lat;
    const v = new THREE.Vector3();
    const at = (u: number, t: number, lift: number, out: number[]): void => {
      const lon = a.lon + (u - 0.5) * dLon;
      const lat = a.lat + (t - 0.5) * dLat;
      lonLatToVec(lon, lat, R + this.hf.surface(lon, lat) + lift, v);
      out.push(v.x, v.y, v.z);
    };
    const open: number[] = [];
    const locked: number[] = [];
    for (const p of parcelsOf(w).parcels) {
      const state = parcelState(w, p);
      if (state !== 'sale' && state !== 'owned' && state !== 'free') continue;
      const isOpen = state !== 'sale';
      const out = isOpen ? open : locked;
      // A plot's outline stops where the town's ground begins: that ground is held for the town and is never part of a plot for sale.
      const mine = (x: number, y: number): boolean => !plannedTownAt(w, wrapX(w, x), y);
      for (let i = 0; i < p.w; i++) {
        if (mine(p.x + i, p.y)) {
          at(p.x + i, p.y, 0.11, out);
          at(p.x + i + 1, p.y, 0.11, out);
        }
        if (mine(p.x + i, p.y + p.h - 1)) {
          at(p.x + i, p.y + p.h, 0.11, out);
          at(p.x + i + 1, p.y + p.h, 0.11, out);
        }
      }
      for (let j = 0; j < p.h; j++) {
        if (mine(p.x, p.y + j)) {
          at(p.x, p.y + j, 0.11, out);
          at(p.x, p.y + j + 1, 0.11, out);
        }
        if (mine(p.x + p.w - 1, p.y + j)) {
          at(p.x + p.w, p.y + j, 0.11, out);
          at(p.x + p.w, p.y + j + 1, 0.11, out);
        }
      }
    }
    const lines = (pos: number[], color: number, opacity: number): THREE.LineSegments => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false }));
      l.frustumCulled = false;
      return l;
    };
    // Faint outlines only: the green and orange wash of where a building can stand comes from the site zones, as with roads.
    group.add(lines(locked, 0xf2e6c8, 0.22));
    group.add(lines(open, 0xf2e6c8, 0.22));
    this.group.add(group);
    return group;
  }

  /** Overlays that are drawn blended over the ground are left out of the ambient-occlusion pass, which would read them as solid. */
  hideOverlays(hide: boolean): void {
    if (this.zoneGroup && hide) this.zoneGroup.visible = false;
    if (this.siteZoneGroup && hide) this.siteZoneGroup.visible = false;
    if (this.parcelGroup) this.parcelGroup.children.forEach((c) => ((c as THREE.Mesh).isMesh ? (c.visible = !hide) : undefined));
  }

  /** One blended quad per tile, lying on the ground. */
  private tileQuads(tiles: { x: number; y: number }[], color: number, opacity: number, lift: number): THREE.Mesh {
  const w = this.world;
    const dLon = (Math.PI * 2) / w.width;
    const dLat = (2 * LAT_SPAN) / w.height;
    const pos: number[] = [];
    const idx: number[] = [];
    const v = new THREE.Vector3();
    for (const t of tiles) {
      const { lon, lat } = tileLonLat(w.width, w.height, ((t.x % w.width) + w.width) % w.width, t.y);
      const base = pos.length / 3;
      for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
        const lo = lon + a * dLon;
        const la = lat + b * dLat;
        lonLatToVec(lo, la, R + this.hf.surface(lo, la) + lift, v);
        pos.push(v.x, v.y, v.z);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 4;
    return mesh;
  }

  /** A thin bright line round the outside of a set of tiles, so a blocked area reads as one clean shape instead of a patchwork. */
  private zoneEdge(tiles: { x: number; y: number }[], color: number, lift: number, contains?: (x: number, y: number) => boolean): THREE.LineSegments {
    const w = this.world;
    const dLon = (Math.PI * 2) / w.width;
    const dLat = (2 * LAT_SPAN) / w.height;
    const has = new Set(tiles.map((t) => t.y * w.width + t.x));
    const pos: number[] = [];
    const v = new THREE.Vector3();
    const corner = (lon: number, lat: number): void => {
      lonLatToVec(lon, lat, R + this.hf.surface(lon, lat) + lift, v);
      pos.push(v.x, v.y, v.z);
    };
    for (const t of tiles) {
      const { lon, lat } = tileLonLat(w.width, w.height, t.x, t.y);
      const sides: [number, number, [number, number], [number, number]][] = [
        [-1, 0, [-0.5, -0.5], [-0.5, 0.5]],
        [1, 0, [0.5, -0.5], [0.5, 0.5]],
        [0, -1, [-0.5, -0.5], [0.5, -0.5]],
        [0, 1, [-0.5, 0.5], [0.5, 0.5]],
      ];
      for (const [dx, dy, a, b] of sides) {
        const nx = (((t.x + dx) % w.width) + w.width) % w.width;
        if (has.has((t.y + dy) * w.width + nx) || contains?.(nx, t.y + dy)) continue;
        corner(lon + a[0] * dLon, lat + a[1] * dLat);
        corner(lon + b[0] * dLon, lat + b[1] * dLat);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
    line.frustumCulled = false;
    line.renderOrder = 5;
    return line;
  }

  private zoneGroup: THREE.Group | null = null;
  private zoneSig = '';
  private zoneTodo: { x: number; y: number }[] = [];
  private zoneFocus = '';

  /**
   * While a road or track tool is active, the land is washed green where one can be laid and red-orange where it cannot (a
   * building, a town's own ground, ice). Build one small chunk per frame, nearest the view first, so opening the tool
   * does not classify and upload the entire world at once. Completed chunks are reused when the tool is reopened.
   */
  setRoadZones(mode: 'road' | 'rail' | null, sig: string, cx = 0, cy = 0): void {
    const w = this.world;
    if (mode === null) {
      if (this.zoneGroup) this.zoneGroup.visible = false;
      return;
    }
    const key = `${mode}|${sig}`;
    const chunkSize = 16;
    if (key !== this.zoneSig) {
      this.zoneSig = key;
      if (this.zoneGroup) {
        this.group.remove(this.zoneGroup);
        this.zoneGroup.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) (m.material as THREE.Material).dispose();
        });
      }
      this.zoneGroup = new THREE.Group();
      this.group.add(this.zoneGroup);
      this.zoneTodo = [];
      this.zoneFocus = '';
      for (let y = 0; y < w.height; y += chunkSize) {
        for (let x = 0; x < w.width; x += chunkSize) this.zoneTodo.push({ x, y });
      }
    }
    const focusX = ((cx % w.width) + w.width) % w.width;
    const focus = `${Math.floor(focusX / chunkSize)},${Math.floor(cy / chunkSize)}`;
    if (this.zoneTodo.length && focus !== this.zoneFocus) {
      this.zoneFocus = focus;
      const distance = (tile: { x: number; y: number }): number => {
        const centerX = (tile.x + Math.min(w.width, tile.x + chunkSize)) / 2;
        const centerY = (tile.y + Math.min(w.height, tile.y + chunkSize)) / 2;
        const dx = Math.abs(centerX - focusX);
        return Math.min(dx, w.width - dx) ** 2 + (centerY - cy) ** 2;
      };
      this.zoneTodo.sort((a, b) => distance(b) - distance(a));
    }
    const next = this.zoneTodo.pop();
    if (next) {
      const blocked = (x: number, y: number): boolean => {
        const terrain = terrainAt(w, x, y);
        return terrain !== null && terrain !== 'water' &&
          (terrain === 'ice' || !!siteAt(w, x, y) || townBlocks(w, x, y, mode));
      };
      const ok: { x: number; y: number }[] = [];
      const no: { x: number; y: number }[] = [];
      for (let y = next.y; y < Math.min(w.height, next.y + chunkSize); y++) {
        for (let x = next.x; x < Math.min(w.width, next.x + chunkSize); x++) {
          const terrain = terrainAt(w, x, y);
          if (terrain === null || terrain === 'water') continue;
          (blocked(x, y) ? no : ok).push({ x, y });
        }
      }
      const meshes: (THREE.Mesh | THREE.LineSegments)[] = [];
      if (ok.length) meshes.push(this.tileQuads(ok, 0xa6ebc4, 0.32, 0.13));
      if (no.length) meshes.push(this.tileQuads(no, 0xff8a45, 0.44, 0.15), this.zoneEdge(no, 0xffc27a, 0.17, blocked));
      for (const mesh of meshes) {
        mesh.geometry.computeBoundingSphere();
        mesh.frustumCulled = true;
        this.zoneGroup!.add(mesh);
      }
    }
    if (this.zoneGroup) this.zoneGroup.visible = true;
  }

  private siteZoneGroup: THREE.Group | null = null;
  private siteZoneKey = '';
  private siteZoneCell = '';
  /** Whether a building of the current kind can stand on a tile, worked out a few tiles a frame (checking one is slow). */
  private siteOk = new Map<number, boolean>();
  private siteOkOld = new Map<number, boolean>();
  private siteTodo: number[] = [];
  private siteBuiltAt = 0;
  private siteDirty = false;

  /**
   * While a building (not a resource spot) is being placed, the ground round the view is washed green where it can stand and
   * red-orange where it cannot (reserved for a town, another building, steep, someone else's land). Each tile is checked a few at
   * a time, nearest the view first, so panning never stalls; when something is built the old picture stays until the new one fills in.
   */
  setSiteZones(kind: SiteKind | null, rot: Rot | null, cx: number, cy: number, sig: string, now: number): void {
    if (kind === null) {
      if (this.siteZoneGroup) this.siteZoneGroup.visible = false;
      return;
    }
    const w = this.world;
    const key = `${kind}|${rot ?? ''}|${sig}`;
    if (key !== this.siteZoneKey) {
      // A different building (or turn) starts from nothing; only a change in what is built keeps the old picture until the new one fills in.
      const same = this.siteZoneKey.split('|').slice(0, 2).join('|') === key.split('|').slice(0, 2).join('|');
      this.siteZoneKey = key;
      this.siteOkOld = same ? new Map([...this.siteOkOld, ...this.siteOk]) : new Map();
      this.siteOk = new Map();
      this.siteZoneCell = '';
    }
    const reach = 30;
    const gx = Math.round(cx / 5) * 5;
    const gy = Math.round(cy / 5) * 5;
    const cell = `${gx},${gy}`;
    if (cell !== this.siteZoneCell) {
      this.siteZoneCell = cell;
      const todo: { i: number; d: number }[] = [];
      for (let y = Math.max(0, gy - reach); y <= Math.min(w.height - 1, gy + reach); y++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const x = (((gx + dx) % w.width) + w.width) % w.width;
          const i = y * w.width + x;
          if (!this.siteOk.has(i)) todo.push({ i, d: dx * dx + (y - gy) * (y - gy) });
        }
      }
      todo.sort((a, b) => b.d - a.d);
      this.siteTodo = todo.map((t) => t.i);
    }
    // A few tiles a frame, from the nearest.
    for (let n = 0; n < 60 && this.siteTodo.length > 0; n++) {
      const i = this.siteTodo.pop()!;
      const x = i % w.width;
      const y = (i - x) / w.width;
      const t = terrainAt(w, x, y);
      if (t === null || t === 'water' || t === 'ice') continue;
      const err = placeError(w, kind, x, y, rot ?? undefined);
      // Land that is only for sale counts as open: placing there buys the plot first.
      this.siteOk.set(i, err === null || err.startsWith('Need $') || err.startsWith(LAND_PREFIX));
      this.siteDirty = true;
    }
    if (this.siteDirty && (this.siteTodo.length === 0 || now - this.siteBuiltAt > 250)) {
      this.siteDirty = false;
      this.siteBuiltAt = now;
      if (this.siteZoneGroup) {
        this.group.remove(this.siteZoneGroup);
        this.siteZoneGroup.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) (m.material as THREE.Material).dispose();
        });
      }
      const ok: { x: number; y: number }[] = [];
      const no: { x: number; y: number }[] = [];
      const near = (i: number): boolean => {
        const x = i % w.width;
        const y = (i - x) / w.width;
        let dx = Math.abs(x - gx);
        dx = Math.min(dx, w.width - dx);
        return dx <= reach && Math.abs(y - gy) <= reach;
      };
      const all = new Set<number>([...this.siteOkOld.keys(), ...this.siteOk.keys()]);
      for (const i of all) {
        if (!near(i)) continue;
        const good = this.siteOk.get(i) ?? this.siteOkOld.get(i);
        const x = i % w.width;
        (good ? ok : no).push({ x, y: (i - x) / w.width });
      }
      const group = new THREE.Group();
      group.add(this.tileQuads(ok, 0x8ff0b4, 0.34, 0.13));
      group.add(this.tileQuads(no, 0xff8a45, 0.4, 0.15));
      group.add(this.zoneEdge(no, 0xffc27a, 0.17));
      this.group.add(group);
      this.siteZoneGroup = group;
    }
    if (this.siteZoneGroup) this.siteZoneGroup.visible = true;
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

  /** The groups that hold the tree blocks, so a readout can tell trees from everything else the scenery draws. */
  treeRegionGroups(): Set<THREE.Object3D> {
    return new Set(this.regions.map((r) => r.group));
  }

  /**
   * Hide tree blocks over the horizon or too far to see, and draw the nearer ones with the cheap model and no shadow. Bushes and
   * boulders have no cheap model, so they show only close up. A whole region goes at once, and the blocks are only looked at
   * every few frames: a big world has tens of thousands of them.
   */
  private updateTreeLod(eye: THREE.Vector3): void {
    this.lodFrame = (this.lodFrame + 1) % 3;
    if (this.lodFrame !== 0) return;
    const toEye = new THREE.Vector3();
    const up = new THREE.Vector3();
    // Close to the camera every tree stands; further out a smaller share of them draw, the cheap model from twice the detail
    // distance, until none do at six times it (the ground picture shows the woods from there).
    const detail = this.treeDetailDistance;
    const farLimit = detail * 6;
    const thin = (dist: number, from: number, to: number): number => (dist <= from ? 1 : Math.max(0.1, 1 - (0.9 * (dist - from)) / (to - from)));
    // The little scene on each resource node (a clump of trees, a field) is detailed: only those near the camera draw.
    const propLimit = (this.treeDetailDistance * 4) ** 2;
    for (const [id, m] of this.props) {
      const e = m.matrix.elements;
      const d2 = (e[12] - eye.x) ** 2 + (e[13] - eye.y) ** 2 + (e[14] - eye.z) ** 2;
      const far = d2 > propLimit;
      if (far !== (m.userData.far === true)) {
        m.userData.far = far;
        m.visible = !far && !this.propUsed.has(id);
      }
      // Resource nodes must read from a distance: the pin grows with the distance past where the near scene stops, so a heap is
      // still a clear shape on the globe, and is its own size where the two swap.
      if (far) {
        m.userData.pin = true;
        this.setFarMark(id, !this.propUsed.has(id), Math.min(m.userData.grow as number, 1 + 2 * (Math.sqrt(d2 / propLimit) - 1)));
      } else if (m.userData.pin !== false) {
        m.userData.pin = false;
        this.setFarMark(id, false);
      }
    }
    // The pins show out to the same distance as the town models.
    for (const m of this.farMarks) m.visible = eye.length() - R < 450;
    for (const r of this.regions) {
      toEye.subVectors(eye, r.center);
      up.copy(r.center).normalize();
      const seen = toEye.dot(up) > -r.radius && toEye.length() - r.radius < farLimit;
      r.group.visible = seen;
      if (!seen) continue;
      for (const c of r.chunks) {
        toEye.subVectors(eye, c.center);
        up.copy(c.center).normalize();
        const dist = toEye.length() - c.radius;
        const visible = toEye.dot(up) > -c.radius && dist < farLimit;
        if (c.far) {
          const near = visible && dist < detail;
          c.near.visible = near;
          c.far.visible = visible && !near;
          if (near) c.near.count = c.total;
          else if (visible) c.far.count = Math.max(1, Math.ceil(c.total * thin(dist, detail * 2, farLimit)));
        } else {
          // Bushes and boulders have no cheap model: they thin out and stop at three times the detail distance.
          const lim = detail * 3;
          const show = visible && dist < lim;
          c.near.visible = show;
          if (show) c.near.count = Math.max(1, Math.ceil(c.total * thin(dist, detail, lim)));
        }
      }
    }
  }
}
