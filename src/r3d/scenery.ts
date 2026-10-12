// Trees, boulders and resource-node markers, placed on the terrain as instanced meshes.
import * as THREE from 'three';
import type { NodeKind } from '../sim/defs';
import { tileLonLat } from '../sim/mapgen';
import { plotTiles, radiusOf, type World } from '../sim/world';
import { HeightField, LAT_SPAN, R, basisMatrix, lonLatToVec } from './geo';
import { Parts } from './parts';

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

    const nearQuarry = (x: number, y: number): boolean =>
      w.nodes.some((n) => {
        if (n.kind !== 'quarry' && n.kind !== 'mine' && n.kind !== 'coal') return false;
        let dx = Math.abs(n.x - x);
        dx = Math.min(dx, w.width - dx);
        return dx <= 1 && Math.abs(n.y - y) <= 1;
      });

    for (let y = 0; y < w.height; y++) {
      for (let x = 0; x < w.width; x++) {
        const t = w.terrain[this.tileIndex(x, y)];
        if (t !== 'forest' && t !== 'grass' && t !== 'mountain') continue;
        const { lon, lat } = tileLonLat(w.width, w.height, x, y);
        const count = t === 'forest' ? 5 : t === 'mountain' ? 2 : r() < 0.09 ? 1 : 0;
        for (let k = 0; k < count; k++) {
          const jx = r();
          const jy = r();
          if (t === 'forest' && nearNode(x, y, jx, jy)) continue;
          if (nearQuarry(x, y)) continue;
          if (w.places.some((p) => Math.abs(p.x - x) <= radiusOf(p) + 1 && Math.abs(p.y - y) <= radiusOf(p) + 1)) continue;
          spots.push({
            tile: this.tileIndex(x, y),
            lon: lon + (jx - 0.5) * dLon * 0.92,
            lat: lat + (jy - 0.5) * dLat * 0.92,
            kind: t === 'mountain' ? 'rock' : t === 'grass' || r() < 0.28 ? 'round' : 'pine',
            scale: t === 'mountain' ? 0.22 + r() * 0.5 : 0.85 + r() * 0.6,
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
      plotTiles(pl.x, pl.y, radiusOf(pl)).forEach((t, index) => {
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
