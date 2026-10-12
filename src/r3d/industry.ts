// Procedural models for the newer buildings. Most processing plants share one parametric factory; the production
// sites each get a small hand-built scene. Units: one tile is about 3.3 world units, a building about 2.5 across.
import * as THREE from 'three';
import type { SiteKind } from '../sim/defs';
import { Parts } from './parts';

const GLASS = 0x6f93ad;
const DARK = 0x24272b;
const PAD = 0x8a8a86;
const BRICK = 0x8a5646;
const METAL = 0x8a9aa7;
const METAL_DARK = 0x65727e;
const YELLOW = 0xd7a21f;

interface Look {
  wall: number;
  roof: number;
  accent: number;
  /** Wall surface pattern (default corrugated metal). */
  wallTex?: number;
  /** Sawtooth roof lights instead of a plain gable. */
  saw?: number;
  /** A flat roof with a parapet. */
  flat?: boolean;
  chimneys?: number;
  silos?: { n: number; color: number; tall?: number };
  /** A horizontal tank or kiln. */
  tank?: number;
  /** A tall furnace or tower. */
  tower?: number;
  /** Goods stacked in the yard. */
  yard?: number[];
  /** A glazed front. */
  glassy?: boolean;
  /** A gantry crane over the yard. */
  crane?: boolean;
  /** A conveyor from the hall to the yard. */
  conveyor?: boolean;
  /** A heap of material beside the hall. */
  heap?: number;
  big?: boolean;
}

function factory(l: Look): THREE.BufferGeometry {
  const p = new Parts();
  const s = l.big ? 1.12 : 1;
  p.slab(2.5 * s, 2.0 * s, PAD);
  p.tex = l.wallTex ?? 5;
  const hw = 1.7 * s;
  const hh = (l.big ? 0.8 : 0.64) * s;
  const hd = 0.9 * s;
  p.box(hw, hh, hd, l.wall, { x: -0.2, y: 0.04, z: -0.4 });
  if (l.saw) {
    const n = l.saw;
    for (let i = 0; i < n; i++) p.gable(hw / n, 0.24, hd + 0.04, l.roof, { x: -0.2 - hw / 2 + (hw / n) * (i + 0.5), y: 0.04 + hh, z: -0.4 });
  } else if (l.flat) {
    p.box(hw + 0.08, 0.06, hd + 0.08, l.roof, { x: -0.2, y: 0.04 + hh, z: -0.4 });
  } else {
    p.gable(hw + 0.12, 0.3, hd + 0.1, l.roof, { x: -0.2, y: 0.04 + hh, z: -0.4 });
  }
  // Facade: accent band, door, windows.
  const fz = -0.4 + hd / 2 + 0.01;
  p.box(hw, 0.08, 0.02, l.accent, { x: -0.2, y: 0.04 + hh * 0.72, z: fz });
  p.box(0.4, hh * 0.52, 0.02, DARK, { x: -0.65, y: 0.04, z: fz });
  const wins = l.glassy ? 5 : 2;
  for (let i = 0; i < wins; i++) {
    const wx = l.glassy ? -0.2 + (i - 2) * 0.22 : 0.05 + i * 0.45;
    p.box(l.glassy ? 0.18 : 0.34, hh * 0.3, 0.02, GLASS, { x: wx, y: 0.04 + hh * 0.3, z: fz });
  }
  p.tex = 1;
  for (let i = 0; i < (l.chimneys ?? 0); i++) {
    p.cyl(0.09, 0.12, 1.15 + i * 0.25, BRICK, { x: 0.35 + i * 0.28, y: 0.04, z: -0.75 });
    p.cyl(0.11, 0.1, 0.07, DARK, { x: 0.35 + i * 0.28, y: 1.19 + i * 0.25, z: -0.75 });
  }
  p.tex = 5;
  if (l.silos) {
    for (let i = 0; i < l.silos.n; i++) {
      const h = l.silos.tall ?? 1.3;
      p.cyl(0.24, 0.24, h, l.silos.color, { x: 0.78 + (i % 2) * 0.5, y: 0.04, z: -0.55 + Math.floor(i / 2) * 0.55 });
      p.dome(0.24, METAL_DARK, { x: 0.78 + (i % 2) * 0.5, y: 0.04 + h, z: -0.55 + Math.floor(i / 2) * 0.55 });
    }
  }
  if (l.tank) p.cyl(0.26, 0.26, 1.2 * l.tank, 0xb9bec2, { x: -0.2, y: 0.34, z: 0.1, rz: Math.PI / 2 }, 14);
  if (l.tower) {
    p.cyl(0.26, 0.34, 1.7 * l.tower, 0x56606a, { x: 0.8, y: 0.04, z: -0.6 });
    p.cyl(0.3, 0.26, 0.12, 0xe08a3a, { x: 0.8, y: 0.04 + 1.7 * l.tower, z: -0.6 });
    p.box(0.7, 0.05, 0.05, METAL_DARK, { x: 0.45, y: 0.9, z: -0.6, rz: -0.5 });
  }
  p.tex = 0;
  if (l.heap) p.cone(0.42, 0.42, l.heap, { x: -1.0, y: 0.04, z: 0.62 }, 9);
  if (l.conveyor) {
    p.box(1.0, 0.06, 0.14, METAL_DARK, { x: 0.5, y: 0.4, z: 0.15, rz: 0.2 });
    p.box(0.05, 0.38, 0.05, METAL_DARK, { x: 0.05, y: 0.04, z: 0.15 });
  }
  if (l.crane) {
    for (const x of [-0.85, 0.65]) p.box(0.06, 0.9, 0.06, YELLOW, { x, y: 0.04, z: 0.65 });
    p.box(1.6, 0.07, 0.1, YELLOW, { x: -0.1, y: 0.94, z: 0.65 });
  }
  (l.yard ?? []).forEach((c, i) => {
    p.box(0.4, 0.14, 0.28, c, { x: -0.05 + (i % 3) * 0.46, y: 0.04 + Math.floor(i / 3) * 0.15, z: 0.72 });
  });
  return p.build();
}

const LOOKS: Partial<Record<SiteKind, Look>> = {
  dairy: { wallTex: 3, wall: 0xf2f0e8, roof: 0x4f7aa8, accent: 0xe8c04a, silos: { n: 1, color: 0xdfe3e6, tall: 1.1 }, yard: [0xf4f6f8, 0xe8c04a, 0xf4f6f8] },
  jamfactory: { wallTex: 1, wall: 0xb0405a, roof: 0x6b3b3b, accent: 0xf2d9c0, chimneys: 1, yard: [0x9a2f4a, 0xc8453b, 0x9a2f4a, 0xc8453b] },
  spinmill: { wallTex: 3, wall: 0xe6dfd2, roof: 0xd9a0b0, accent: 0xd9a0b0, saw: 4, yard: [0xf0eee6, 0xf0eee6, 0xe6dfd2, 0xf0eee6] },
  weavery: { wallTex: 1, wall: 0x8aa0c4, roof: 0x5f7aa6, accent: 0xe6dfd2, saw: 5, yard: [0x7f9fc8, 0xd9a0b0, 0x7f9fc8] },
  tailor: { wallTex: 7, wall: 0x6e8f84, roof: 0x3e5a52, accent: 0xf0eee6, flat: true, glassy: true, yard: [0x4f7f6f, 0xe6dfd2, 0x4f7f6f] },
  stonecutter: { wallTex: 6, wall: 0xb8b5ac, roof: 0x7a7a76, accent: 0x7a7a76, crane: true, heap: 0x9d9a92, yard: [0xc4c1b8, 0xb9b6ad, 0xcac7be, 0xc4c1b8] },
  cementworks: { wallTex: 6, wall: 0x9a9a96, roof: 0x6e6e6a, accent: 0xd7a21f, silos: { n: 3, color: 0xc7c7c3, tall: 1.5 }, tank: 1, chimneys: 1 },
  concrete: { wallTex: 6, wall: 0xb2b2ae, roof: 0x6e6e6a, accent: 0xd7a21f, silos: { n: 2, color: 0xd0d0cc, tall: 1.3 }, tank: 0.7, yard: [0xa8a8a4, 0xb6b6b2, 0xa8a8a4] },
  glassworks: { wallTex: 7, wall: 0x7fb0c4, roof: 0x4f7f96, accent: 0xe9f3f6, saw: 3, chimneys: 1, glassy: true, yard: [0x9fd0e0, 0xb6dce8, 0x9fd0e0] },
  smelter: { wall: 0x5a5f66, roof: 0x30343a, accent: 0xe08a3a, tower: 1, chimneys: 2, big: true, yard: [0x6f7a86, 0x7c8792, 0x6f7a86] },
  toolworks: { wallTex: 1, wall: 0x7a8590, roof: 0x3e4650, accent: 0xd08a2e, chimneys: 1, yard: [0x6a7480, 0x8a949f, 0x6a7480] },
  steelworks: { wall: 0x4e5a68, roof: 0x2a2f36, accent: 0xe08a3a, tower: 1.15, chimneys: 3, big: true, crane: true },
  slagcrusher: { wall: 0x58545a, roof: 0x3a3840, accent: 0xc07a30, conveyor: true, heap: 0x3a3840, yard: [0x9d9a92, 0x58545a, 0x9d9a92] },
  machinery: { wall: 0x8a949f, roof: 0x4a525c, accent: 0xd08a2e, crane: true, big: true, chimneys: 1, yard: [0xd08a2e, 0xd7a21f, 0xd08a2e, 0x6a7480] },
};

function pitSite(color: number, equipment: (p: Parts) => void): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(1.3, 1.34, 0.05, 0x8b877d);
  p.cyl(1.27, 1.27, 1.5, 0x6d6b66, { y: -1.5 });
  p.cyl(0.9, 0.95, 0.03, color, { y: 0.05, x: -0.2, z: 0.15 }, 14);
  equipment(p);
  return p.build();
}

function mine(coal: boolean): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(1.3, 1.34, 0.05, 0x7d7a72);
  p.cyl(1.27, 1.27, 1.5, 0x6d6b66, { y: -1.5 });
  const rock = coal ? 0x2b2d31 : 0x8a5a4a;
  // Headframe: two legs and a winding wheel over the shaft.
  p.box(0.07, 1.4, 0.07, METAL_DARK, { x: -0.35, y: 0.05, z: -0.2, rz: 0.22 });
  p.box(0.07, 1.4, 0.07, METAL_DARK, { x: 0.35, y: 0.05, z: -0.2, rz: -0.22 });
  p.box(0.07, 1.4, 0.07, METAL_DARK, { x: -0.35, y: 0.05, z: 0.2, rz: 0.22 });
  p.box(0.07, 1.4, 0.07, METAL_DARK, { x: 0.35, y: 0.05, z: 0.2, rz: -0.22 });
  p.cyl(0.22, 0.22, 0.08, 0xc9a02a, { x: 0, y: 1.38, z: 0, rz: Math.PI / 2 }, 14);
  p.box(0.9, 0.5, 0.7, 0x6a6258, { x: -0.1, y: 0.05, z: -0.9 });
  p.gable(1.0, 0.22, 0.8, 0x3e3a34, { x: -0.1, y: 0.55, z: -0.9 });
  if (coal) {
    p.box(1.1, 0.06, 0.14, METAL_DARK, { x: 0.75, y: 0.4, z: 0.4, rz: 0.25 });
    p.cone(0.5, 0.5, rock, { x: 1.0, y: 0.05, z: 0.65 }, 9);
  } else {
    p.cone(0.46, 0.46, rock, { x: 0.95, y: 0.05, z: 0.55 }, 9);
  }
  p.cone(0.3, 0.3, rock, { x: 0.55, y: 0.05, z: 0.8 }, 9);
  // Ore cart on rails.
  p.box(0.8, 0.03, 0.04, METAL_DARK, { x: -0.7, y: 0.05, z: 0.7 });
  p.box(0.8, 0.03, 0.04, METAL_DARK, { x: -0.7, y: 0.05, z: 0.86 });
  p.box(0.34, 0.2, 0.26, 0x6a4a3a, { x: -0.8, y: 0.1, z: 0.78 });
  return p.build();
}

function ranch(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(2.5, 0.03, 2.1, 0x7aa05a);
  p.box(2.45, 1.5, 2.05, 0x5f7a46, { y: -1.5 });
  p.box(1.1, 0.7, 0.8, 0xa83a30, { x: -0.5, y: 0.03, z: -0.6 });
  p.gable(1.2, 0.4, 0.9, 0xe9e6dc, { x: -0.5, y: 0.73, z: -0.6 });
  p.box(0.4, 0.5, 0.02, 0xe9e6dc, { x: -0.5, y: 0.03, z: -0.19 });
  p.cyl(0.2, 0.2, 1.1, 0xc7c9cb, { x: 0.45, y: 0.03, z: -0.7 });
  p.dome(0.2, METAL_DARK, { x: 0.45, y: 1.13, z: -0.7 });
  // Paddock fence and cows.
  for (let i = 0; i <= 6; i++) {
    p.box(0.05, 0.22, 0.05, 0x7a5a3c, { x: -1.1 + i * 0.37, y: 0.03, z: 0.95 });
    p.box(0.05, 0.22, 0.05, 0x7a5a3c, { x: -1.1 + i * 0.37, y: 0.03, z: 0.12 });
  }
  for (const z of [0.12, 0.95]) p.box(2.3, 0.04, 0.03, 0x9a7a52, { x: 0.0, y: 0.16, z });
  for (const [x, z] of [[-0.6, 0.45], [0.1, 0.7], [0.6, 0.4]]) {
    p.box(0.3, 0.16, 0.14, 0xf2f0ec, { x, y: 0.1, z });
    p.box(0.08, 0.08, 0.08, 0x2a2a2a, { x: x + 0.18, y: 0.2, z });
    p.box(0.1, 0.05, 0.1, 0x2a2a2a, { x: x - 0.05, y: 0.26, z });
    for (const [dx, dz] of [[-0.1, -0.05], [0.1, -0.05], [-0.1, 0.05], [0.1, 0.05]]) p.box(0.03, 0.1, 0.03, 0x2a2a2a, { x: x + dx, y: 0.0, z: z + dz });
  }
  p.cyl(0.16, 0.16, 0.22, 0xd0b050, { x: 1.0, y: 0.03, z: 0.55, rz: Math.PI / 2 }, 12);
  return p.build();
}

function orchard(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(2.6, 0.03, 2.2, 0x6f9a52);
  p.box(2.55, 1.5, 2.15, 0x587a42, { y: -1.5 });
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      const x = -0.95 + i * 0.62;
      const z = -0.6 + j * 0.62;
      p.cyl(0.04, 0.05, 0.22, 0x6a4a30, { x, y: 0.03, z }, 6);
      p.sphere(0.26, 0x4f8a3f, { x, y: 0.4, z }, 1);
      p.sphere(0.04, 0xc8453b, { x: x + 0.14, y: 0.42, z: z + 0.15 }, 0);
      p.sphere(0.04, 0xc8453b, { x: x - 0.12, y: 0.5, z: z + 0.12 }, 0);
    }
  }
  p.box(0.5, 0.36, 0.4, 0xd8c7a5, { x: 0.9, y: 0.03, z: 0.85 });
  p.gable(0.6, 0.2, 0.5, 0x7a3f35, { x: 0.9, y: 0.39, z: 0.85 });
  for (let i = 0; i < 3; i++) p.box(0.3, 0.12, 0.22, 0xb0583f, { x: -0.7 + i * 0.34, y: 0.03, z: 1.0 });
  return p.build();
}

function cottonFarm(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(2.5, 0.03, 2.1, 0xb9b58a);
  p.box(2.45, 1.5, 2.05, 0x948f6a, { y: -1.5 });
  for (let i = 0; i < 6; i++) p.box(1.5, 0.12, 0.1, 0xf4f2ea, { x: -0.3, y: 0.03, z: -0.85 + i * 0.22 });
  p.box(0.7, 0.45, 0.6, 0xe9e6dc, { x: 0.8, y: 0.03, z: 0.4 });
  p.gable(0.8, 0.28, 0.7, 0x6a4a3a, { x: 0.8, y: 0.48, z: 0.4 });
  for (let i = 0; i < 4; i++) p.box(0.3, 0.18, 0.22, 0xf8f6ee, { x: -0.9 + (i % 2) * 0.34, y: 0.03 + Math.floor(i / 2) * 0.18, z: 0.8 });
  p.box(0.3, 0.2, 0.2, 0x3f7a55, { x: 0.0, y: 0.1, z: 0.85 });
  p.box(0.16, 0.16, 0.18, 0x3f7a55, { x: 0.22, y: 0.12, z: 0.85 });
  return p.build();
}

export function industryGeometry(kind: SiteKind): THREE.BufferGeometry {
  const look = LOOKS[kind];
  if (look) return factory(look);
  switch (kind) {
    case 'oremine':
      return mine(false);
    case 'coalmine':
      return mine(true);
    case 'claypit':
      return pitSite(0xa8603f, (p) => {
        p.box(0.5, 0.18, 0.4, 0x3a3d40, { x: -0.5, y: 0.05, z: 0.2 });
        p.box(0.34, 0.26, 0.3, YELLOW, { x: -0.5, y: 0.23, z: 0.2 });
        p.box(0.74, 0.07, 0.09, YELLOW, { x: -0.9, y: 0.5, z: 0.2, rz: 0.55 });
        p.cone(0.34, 0.34, 0xb86f4a, { x: 0.85, y: 0.05, z: 0.1 }, 9);
        p.cone(0.26, 0.28, 0xa8603f, { x: 0.55, y: 0.05, z: 0.45 }, 9);
        for (let i = 0; i < 3; i++) p.box(0.36, 0.14, 0.24, 0xc07a52, { x: 0.3 + i * 0.4, y: 0.05, z: -0.65 });
      });
    case 'sandpit':
      return pitSite(0xe0cd96, (p) => {
        p.box(0.9, 0.06, 0.14, METAL_DARK, { x: -0.2, y: 0.34, z: 0.2, rz: 0.3 });
        p.box(0.34, 0.2, 0.3, METAL, { x: -0.7, y: 0.05, z: 0.2 });
        p.cone(0.5, 0.5, 0xe0cd96, { x: 0.8, y: 0.05, z: 0.15 }, 9);
        p.cone(0.3, 0.3, 0xd2bf88, { x: 0.45, y: 0.05, z: 0.55 }, 9);
        p.cyl(0.18, 0.18, 0.7, 0xc7c9cb, { x: 0.3, y: 0.05, z: -0.7 });
      });
    case 'ranch':
      return ranch();
    case 'orchard':
      return orchard();
    case 'cottonfarm':
      return cottonFarm();
    default:
      return factory({ wall: 0xb8b8b8, roof: 0x666666, accent: 0xcccccc });
  }
}
