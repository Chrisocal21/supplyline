// Moving parts on buildings: a pumpjack that nods, a radar dish that turns, a crane trolley that lifts a box across the quay,
// a windmill. They are separate meshes riding on the building's own, so the building stays one draw call.
import * as THREE from 'three';
import type { SiteKind } from '../sim/defs';
import { Parts } from './parts';

export interface AnimPart {
  geo: THREE.BufferGeometry;
  /** Where it sits on the building. */
  base: THREE.Matrix4;
  /** Set its matrix for time t (seconds), starting from base. */
  tick: (t: number, out: THREE.Matrix4, base: THREE.Matrix4) => void;
}

const at = (x: number, y: number, z: number): THREE.Matrix4 => new THREE.Matrix4().makeTranslation(x, y, z);
const rotZ = (a: number): THREE.Matrix4 => new THREE.Matrix4().makeRotationZ(a);
const rotY = (a: number): THREE.Matrix4 => new THREE.Matrix4().makeRotationY(a);

/** The rocking beam of a pumpjack, with its horse head and counterweight, centred on its pivot. */
function beamGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(1.2, 0.09, 0.14, 0xd7a21f, { x: 0, y: -0.045, z: 0 });
  p.box(0.2, 0.3, 0.12, 0xd7a21f, { x: 0.62, y: -0.26, z: 0 });
  p.box(0.26, 0.2, 0.1, 0x3a3d40, { x: -0.6, y: -0.2, z: 0 });
  p.cyl(0.015, 0.015, 0.7, 0x1d1f22, { x: 0.62, y: -0.9, z: 0 }, 6);
  return p.build();
}

/** A radar dish on a short mast, turning. */
function radarGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(0.02, 0.03, 0.14, 0x8a9096, { y: 0 }, 6);
  p.cyl(0.14, 0.03, 0.05, 0xe6e6e1, { y: 0.14, rz: 0.45 }, 14);
  p.box(0.012, 0.09, 0.012, 0x555a60, { x: 0.05, y: 0.15, rz: 0.45 });
  return p.build();
}

/** A crane trolley with a box hanging from it. */
function trolleyGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(0.16, 0.1, 0.12, 0x2a2e33, { y: 0 });
  p.box(0.012, 1, 0.012, 0x1d1f22, { y: -1.0, x: 0.05 });
  p.box(0.012, 1, 0.012, 0x1d1f22, { y: -1.0, x: -0.05 });
  return p.build();
}

function boxGeometry(color: number): THREE.BufferGeometry {
  const p = new Parts();
  p.tex = 5;
  p.box(0.18, 0.12, 0.42, color, { y: -0.12 });
  return p.build();
}

/** The sails of a windmill: four blades on a hub. */
function bladesGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(0.05, 0.05, 0.1, 0x6a4a30, { rx: Math.PI / 2, z: -0.02 }, 8);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    p.box(0.12, 0.55, 0.02, 0xf0efe6, { x: -Math.sin(a) * 0.3, y: Math.cos(a) * 0.3, z: 0.03, rz: a });
  }
  return p.build();
}

function windmillTower(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(0.1, 0.17, 1.0, 0xd8d2c4, { y: 0 }, 8);
  p.cone(0.14, 0.2, 0x7a3f35, { y: 1.0 }, 8);
  return p.build();
}

const cache = new Map<string, THREE.BufferGeometry>();
const geo = (key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry => {
  let g = cache.get(key);
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g;
};

/** What moves on a building of this kind at this level. */
export function siteAnimParts(kind: SiteKind, level: number): AnimPart[] {
  const L = Math.max(1, Math.min(3, level));
  const out: AnimPart[] = [];
  if (kind === 'oilwell') {
    out.push({
      geo: geo('beam', beamGeometry),
      base: at(-0.1, 0.92, -0.1),
      tick: (t, o, b) => o.copy(b).multiply(rotZ(0.14 * Math.sin(t * 2.3) + 0.04)),
    });
  } else if (kind === 'airport') {
    const mast = [null, [-1.2, 0.93, -0.1], [-1.6, 1.38, 0.2], [-2.0, 1.92, 0.0]][L] as [number, number, number];
    out.push({ geo: geo('radar', radarGeometry), base: at(mast[0], mast[1], mast[2]), tick: (t, o, b) => o.copy(b).multiply(rotY(t * 2.6)) });
  } else if (kind === 'port') {
    const half = [0, 1.5, 1.8, 2.15][L];
    const cranes: [number, number][] = [[-half * 0.4, 1.0 + 0.15 * L], [-half * 0.05, 1.15 + 0.15 * L], [half * 0.3, 1.35]];
    const colors = [0xb23a30, 0x2f5f8a, 0xd7a21f];
    cranes.slice(0, L).forEach(([cx, size], i) => {
      const z0 = half - 0.5 + 0.2 * size;
      const span = 0.65 * size;
      out.push({
        geo: geo('trolley', trolleyGeometry),
        base: at(cx, 1.0 * size, 0),
        tick: (t, o, b) => {
          const u = 0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7);
          const hang = 0.55 * size * (1 - 0.6 * (0.5 + 0.5 * Math.sin(t * 1.4 + i)));
          o.copy(b).multiply(at(0, 0, z0 + u * span)).multiply(new THREE.Matrix4().makeScale(1, hang, 1));
        },
      });
      out.push({
        geo: geo('box' + i, () => boxGeometry(colors[i % colors.length])),
        base: at(cx, 1.0 * size, 0),
        tick: (t, o, b) => {
          const u = 0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7);
          const hang = 0.55 * size * (1 - 0.6 * (0.5 + 0.5 * Math.sin(t * 1.4 + i)));
          o.copy(b).multiply(at(0, -hang, z0 + u * span));
        },
      });
    });
  } else if (kind === 'farm' || kind === 'cottonfarm') {
    out.push({ geo: geo('mill', windmillTower), base: at(-1.15, 0, -1.0), tick: (_t, o, b) => o.copy(b) });
    out.push({ geo: geo('blades', bladesGeometry), base: at(-1.15, 1.0, -0.88), tick: (t, o, b) => o.copy(b).multiply(new THREE.Matrix4().makeRotationZ(t * 1.2)) });
  }
  return out;
}
