// Procedural models for the newer buildings. Most processing plants share one parametric factory; the production
// sites each get a small hand-built scene. Units: one tile is about 3.3 world units, a building about 2.5 across.
import * as THREE from 'three';
import { coffeeFarmGeometry, mangoGroveGeometry, oilWellGeometry } from './specialty';
import type { SiteKind } from '../sim/defs';
import { Parts } from './parts';
import { addTree } from './vegetation';
import { framedWindow, loadingBay } from './architecture';
import { addCow } from './livestock';
import { newSiteGeometry } from './newsites';

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
    for (let i = 0; i < n; i++) {
      const x = -0.2 - hw / 2 + (hw / n) * (i + 0.5);
      p.gable(hw / n, 0.24, hd + 0.04, l.roof, { x, y: 0.04 + hh, z: -0.4 });
      framedWindow(p, x, hh + 0.065, -0.4 + hd / 2 + 0.028, hw / n * 0.65, 0.11);
    }
  } else if (l.flat) {
    p.box(hw + 0.08, 0.06, hd + 0.08, l.roof, { x: -0.2, y: 0.04 + hh, z: -0.4 });
    for (const side of [-1, 1]) {
      p.box(hw + 0.08, 0.1, 0.04, METAL_DARK, { x: -0.2, y: 0.1 + hh, z: -0.4 + side * hd / 2, t: 5 });
    }
    for (let i = 0; i < 3; i++) {
      p.box(hw * 0.22, 0.035, hd * 0.5, 0x304c60, { x: -0.2 + (i - 1) * hw * 0.29, y: 0.16 + hh, z: -0.4, rx: 0.12, t: 8 });
    }
  } else {
    p.gable(hw + 0.12, 0.3, hd + 0.1, l.roof, { x: -0.2, y: 0.04 + hh, z: -0.4 });
  }
  // Facade: accent band, door, windows.
  const fz = -0.4 + hd / 2 + 0.01;
  p.box(hw, 0.08, 0.02, l.accent, { x: -0.2, y: 0.04 + hh * 0.72, z: fz });
  loadingBay(p, -0.65, 0.04, fz, 0.4, hh * 0.52);
  const wins = l.glassy ? 5 : 2;
  for (let i = 0; i < wins; i++) {
    const wx = l.glassy ? -0.2 + (i - 2) * 0.22 : 0.05 + i * 0.45;
    framedWindow(p, wx, 0.04 + hh * 0.3, fz + 0.01, l.glassy ? 0.18 : 0.34, hh * 0.3);
  }
  for (const side of [-1, 1]) {
    const x = -0.2 + side * hw / 2;
    p.cyl(0.018, 0.018, hh, METAL_DARK, { x, y: 0.04, z: fz, t: 5 }, 6);
    framedWindow(p, x + side * 0.014, hh * 0.45, -0.4, hd * 0.55, hh * 0.25, side * Math.PI / 2);
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
      for (let band = 1; band <= 3; band++) {
        p.cyl(0.245, 0.245, 0.024, METAL_DARK, {
          x: 0.78 + (i % 2) * 0.5, y: 0.04 + h * band / 4,
          z: -0.55 + Math.floor(i / 2) * 0.55, t: 0,
        }, 16);
      }
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
    p.box(0.18, 0.12, 0.16, METAL_DARK, { x: -0.1, y: 0.81, z: 0.65, t: 5 });
    p.cyl(0.012, 0.012, 0.32, METAL_DARK, { x: -0.1, y: 0.49, z: 0.65 }, 5);
    for (const x of [-0.85, 0.65]) {
      p.box(0.2, 0.035, 0.2, METAL_DARK, { x, y: 0.04, z: 0.65, t: 5 });
    }
  }
  (l.yard ?? []).forEach((c, i) => {
    p.box(0.4, 0.14, 0.28, c, { x: -0.05 + (i % 3) * 0.46, y: 0.04 + Math.floor(i / 3) * 0.15, z: 0.72 });
  });
  return p.build();
}

const LOOKS: Partial<Record<SiteKind, Look>> = {
  woodyard: { wallTex: 2, wall: 0x9a6a3a, roof: 0x4a3a2a, accent: 0xd7a21f, saw: 2, heap: 0xb08850, yard: [0x8a5a33, 0x9a6a3a, 0x8a5a33, 0x9a6a3a] },
  creamery: { wallTex: 3, wall: 0xf6efd2, roof: 0xc8a030, accent: 0xf0d870, silos: { n: 1, color: 0xf0e6b0, tall: 0.9 }, yard: [0xf0d870, 0xf6efd2, 0xf0d870] },
  juicepress: { wallTex: 1, wall: 0xf0a040, roof: 0x8a4a20, accent: 0xe89030, tank: 0.8, yard: [0xe89030, 0xf0b050, 0xe89030, 0xf0b050] },
  sugarrefinery: { wallTex: 3, wall: 0xf0eeee, roof: 0x8a8a92, accent: 0xc8b0a0, silos: { n: 2, color: 0xf6f4f4, tall: 1.2 }, chimneys: 1, yard: [0xc8b0a0, 0xf4f0f0, 0xc8b0a0] },
  oilpress: { wallTex: 5, wall: 0xd8c040, roof: 0x6a5a20, accent: 0xe0b020, tank: 1, silos: { n: 1, color: 0xe8d870, tall: 1 }, yard: [0xe0b020, 0xc8a020, 0xe0b020] },
  pastrykitchen: { wallTex: 1, wall: 0xe8c898, roof: 0xa05a3a, accent: 0xf6e6c8, chimneys: 1, glassy: true, yard: [0xd8a060, 0xf0d0a0, 0xd8a060] },
  noodlemaker: { wallTex: 3, wall: 0xf0e0a8, roof: 0x8a6a3a, accent: 0xe8d090, saw: 2, yard: [0xe8d090, 0xf0e8c0, 0xe8d090] },
  pizzeria: { wallTex: 1, wall: 0xc8503a, roof: 0x5a2a20, accent: 0xf6e6c8, chimneys: 2, glassy: true, yard: [0xd86a3a, 0xf0d070, 0xd86a3a] },
  cannery: { wallTex: 5, wall: 0xa8b0b0, roof: 0x5a6a78, accent: 0xd7a21f, saw: 3, yard: [0xc8ccd0, 0xa0a8a0, 0xc8ccd0, 0xa0a8a0] },
  butcher: { wallTex: 6, wall: 0xe8d8d0, roof: 0x8a3a3a, accent: 0xc05050, flat: true, yard: [0xc05050, 0xd88a8a, 0xc05050] },
  brewery: { wallTex: 1, wall: 0xb88a4a, roof: 0x4a3a2a, accent: 0xd8a020, tank: 1.2, chimneys: 1, silos: { n: 2, color: 0xc8a050, tall: 1.2 }, yard: [0xd8a020, 0x8a6a3a, 0xd8a020] },
  sodaplant: { wallTex: 7, wall: 0x6ab8d8, roof: 0x3a6a8a, accent: 0xe9f3f6, glassy: true, tank: 0.8, yard: [0x48a8c8, 0xe8f0f4, 0x48a8c8] },
  woolmill: { wallTex: 3, wall: 0xe8e2d4, roof: 0x8a8a7a, accent: 0xf0eee6, saw: 3, yard: [0xf0eee6, 0xe8e0d0, 0xf0eee6] },
  compostyard: { wallTex: 2, wall: 0x6a5a3a, roof: 0x3a3a2a, accent: 0x7a8a4a, heap: 0x6b4a2e, yard: [0x6b4a2e, 0x7a5a3a, 0x6b4a2e, 0x5a4a2a] },
  silage: { wallTex: 5, wall: 0xb8a860, roof: 0x5a5a3a, accent: 0x8a7a40, silos: { n: 3, color: 0xc8b870, tall: 1.4 }, yard: [0xb7a35a, 0xc8b870, 0xb7a35a] },
  winery: { wallTex: 6, wall: 0xc8a888, roof: 0x7a3a3a, accent: 0x7a2038, tank: 1, chimneys: 1, yard: [0x7a2038, 0x9a4a5a, 0x7a2038] },
  distillery: { wallTex: 6, wall: 0x8a7a68, roof: 0x3a3a3a, accent: 0xc8a870, tower: 0.9, chimneys: 2, yard: [0xc8a870, 0x8a6a3a, 0xc8a870] },
  icecreamplant: { wallTex: 7, wall: 0xf8d8e0, roof: 0x7aa8d8, accent: 0xffffff, flat: true, glassy: true, yard: [0xf0d0d8, 0xf8f0e8, 0xf0d0d8] },
  crispfryer: { wallTex: 1, wall: 0xe8c850, roof: 0xa05a20, accent: 0xd8403a, chimneys: 2, yard: [0xe0b840, 0xf0d870, 0xe0b840] },
  sausagemaker: { wallTex: 6, wall: 0xb85a48, roof: 0x5a2a20, accent: 0xe8d8c8, chimneys: 1, yard: [0xa04838, 0xc86a58, 0xa04838] },
  chocolatier: { wallTex: 1, wall: 0x6a3a28, roof: 0x3a2018, accent: 0xe8c898, chimneys: 1, glassy: true, yard: [0x4a2a1a, 0x6a3a28, 0x4a2a1a] },
  candlemaker: { wallTex: 3, wall: 0xf0e4b8, roof: 0x9a7a4a, accent: 0xf8f0d0, chimneys: 1, yard: [0xf0e0b0, 0xf8f0d0, 0xf0e0b0] },
  pillowmaker: { wallTex: 3, wall: 0xe0d8f0, roof: 0x8a7ab0, accent: 0xf6f4fc, saw: 2, yard: [0xe0d8f0, 0xf6f4fc, 0xe0d8f0] },
  granitecutter: { wallTex: 6, wall: 0xa89fa4, roof: 0x5a5458, accent: 0xd7a21f, crane: true, heap: 0x9a8f94, yard: [0xb0a8ae, 0x9a8f94, 0xb0a8ae, 0x9a8f94] },
  refinery: { wall: 0x7a6a64, roof: 0x30302e, accent: 0xe05a2a, tower: 1.2, tank: 1.4, chimneys: 3, big: true, yard: [0xc04a2a, 0x7a6a64, 0xc04a2a] },
  smokehouse: { wallTex: 2, wall: 0x8a6a48, roof: 0x3a2a20, accent: 0xc08848, chimneys: 2, yard: [0xc08848, 0x8a5a33, 0xc08848] },
  fishcannery: { wallTex: 5, wall: 0x7aa0b8, roof: 0x3a5a78, accent: 0xe9f3f6, saw: 3, yard: [0x8aa0b8, 0xc8ccd0, 0x8aa0b8] },
  fishmeal: { wallTex: 5, wall: 0xa8b0b8, roof: 0x58606a, accent: 0xd7a21f, silos: { n: 2, color: 0xc8ccd0, tall: 1.1 }, conveyor: true, yard: [0xa8b0b8, 0xb7a35a, 0xa8b0b8] },
  gardensupply: { wallTex: 2, wall: 0x7a9a5a, roof: 0x4a5a3a, accent: 0xa8c070, glassy: true, heap: 0x6b4a2e, yard: [0x6b4a2e, 0x7a8a4a, 0x6b4a2e] },
  scrapyard: { wallTex: 5, wall: 0x7d8a6a, roof: 0x4a5040, accent: 0xd7a21f, crane: true, heap: 0x8a8a7a, yard: [0x6a6a60, 0x8a7a5a, 0x6a6a60, 0x8a8a7a] },
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
  p.box(1.1, 0.7, 0.8, 0x795046, { x: -0.5, y: 0.03, z: -0.6, t: 2 });
  p.gable(1.2, 0.4, 0.9, 0xa2a99e, { x: -0.5, y: 0.73, z: -0.6, t: 5 });
  loadingBay(p, -0.5, 0.03, -0.19, 0.32, 0.32);
  for (const x of [-1.02, 0.02]) p.box(0.024, 0.7, 0.025, 0xb9bba9, { x, y: 0.03, z: -0.19, t: 5 });
  for (const z of [-0.96, -0.24]) {
    p.box(1.14, 0.025, 0.025, METAL_DARK, { x: -0.5, y: 0.73, z, t: 5 });
  }
  p.cyl(0.2, 0.2, 1.1, 0xc7c9cb, { x: 0.45, y: 0.03, z: -0.7 });
  p.dome(0.2, METAL_DARK, { x: 0.45, y: 1.13, z: -0.7 });
  // Paddock fence and cows.
  for (let i = 0; i <= 6; i++) {
    p.box(0.014, 0.14, 0.014, 0x7a5a3c, { x: -1.1 + i * 0.37, y: 0.03, z: 0.95, t: 2 });
    p.box(0.014, 0.14, 0.014, 0x7a5a3c, { x: -1.1 + i * 0.37, y: 0.03, z: 0.12, t: 2 });
  }
  for (const y of [0.09, 0.15]) {
    for (const z of [0.12, 0.95]) p.box(2.23, 0.012, 0.012, 0x9a7a52, { x: 0.01, y, z, t: 2 });
    for (const x of [-1.1, 1.12]) p.box(0.012, 0.012, 0.83, 0x9a7a52, { x, y, z: 0.535, t: 2 });
  }
  [[-0.65, 0.35], [-0.15, 0.4], [0.42, 0.32], [-0.55, 0.75], [0.05, 0.7], [0.64, 0.74]].forEach(([x, z], i) =>
    addCow(p, x, 0.03, z, i, i % 2 ? Math.PI - 0.25 : 0.2));
  p.cyl(0.075, 0.075, 0.12, 0xb4a16d, { x: 1.0, y: 0.105, z: 0.55, rz: Math.PI / 2 }, 16);
  return p.build();
}

function orchard(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(2.6, 0.03, 2.2, 0x6f9a52);
  p.box(2.55, 1.5, 2.15, 0x587a42, { y: -1.5 });
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 4; j++) {
      const x = -0.95 + i * 0.475;
      const z = -0.85 + j * 0.45;
      addTree(p, 'orchard', x, 0.03, z, 0.64, i * 4 + j);
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
  for (let i = 0; i < 6; i++) {
    const z = -0.85 + i * 0.22;
    p.box(1.5, 0.018, 0.12, 0x857650, { x: -0.3, y: 0.03, z });
    for (let j = 0; j < 10; j++) {
      const x = -0.98 + j * 0.15;
      p.cyl(0.003, 0.005, 0.1, 0x6e7048, { x, y: 0.045, z }, 5);
      p.ellipsoid(0.06, 0.055, 0.05, 0x637249, { x, y: 0.105, z }, 0);
      for (const dx of [-0.017, 0.018]) p.sphere(0.016, 0xdedbcf, { x: x + dx, y: 0.14 + dx * 0.25, z: z + dx }, 1);
    }
  }
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
    case 'coffeefarm':
      return coffeeFarmGeometry();
    case 'mangogrove':
      return mangoGroveGeometry();
    case 'oilwell':
      return oilWellGeometry();
    default:
      return newSiteGeometry(kind) ?? factory({ wall: 0xb8b8b8, roof: 0x666666, accent: 0xcccccc });
  }
}
