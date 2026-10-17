// Models for the island specialties and the sea: a port at three sizes, a coffee plantation, a mango grove and an oil well.
// Units as in models.ts: one tile is about 3.3 units, a building about 2.5 across. The front (+z) of a port faces the water.
import * as THREE from 'three';
import { Parts } from './parts';

const CONCRETE = 0xb4b2ab;
const CONCRETE_DARK = 0x8a8a86;
const METAL = 0x8a9aa7;
const METAL_DARK = 0x65727e;
const YELLOW = 0xd7a21f;
const BLUE = 0x2f5f8a;
const BOX = [0xb23a30, 0x2f5f8a, 0xd7a21f, 0x3f7a55, 0xe6e2d6, 0xcf7a2b, 0x7a4a9a];

function container(p: Parts, x: number, y: number, z: number, c: number, along = true): void {
  p.tex = 5;
  p.box(along ? 0.18 : 0.42, 0.12, along ? 0.42 : 0.18, c, { x, y, z });
  p.tex = 0;
}

function lamp(p: Parts, x: number, z: number, h = 1.2): void {
  p.cyl(0.02, 0.025, h, 0x555a60, { x, y: 0.04, z }, 6);
  p.box(0.14, 0.05, 0.08, 0xf6efc8, { x, y: 0.04 + h, z });
}

/** A gantry crane on rails along the quay, its boom reaching out over the water. */
function gantry(p: Parts, x: number, z: number, size: number, color = YELLOW): void {
  for (const dx of [-0.34, 0.34]) for (const dz of [-0.18, 0.18]) p.box(0.05 * size, 0.9 * size, 0.05 * size, color, { x: x + dx * size, y: 0.04, z: z + dz * size });
  p.box(0.82 * size, 0.06 * size, 0.5 * size, color, { x, y: 0.94 * size, z });
  p.box(0.12 * size, 0.1 * size, 1.5 * size, METAL_DARK, { x, y: 1.0 * size, z: z + 0.5 * size });
  p.box(0.1 * size, 0.1 * size, 0.1 * size, 0x2a2e33, { x, y: 0.86 * size, z: z + 0.8 * size });
  p.box(0.012, 0.3 * size, 0.012, 0x1d1f22, { x, y: 0.56 * size, z: z + 0.8 * size });
  p.box(0.16 * size, 0.1 * size, 0.1 * size, 0xcf7a2b, { x, y: 0.46 * size, z: z + 0.8 * size });
  p.box(0.2 * size, 0.2 * size, 0.2 * size, 0x4f545c, { x, y: 1.06 * size, z: z - 0.1 * size });
}

/** A harbour: a quay with a pier and cranes in front, sheds and container stacks behind. Bigger at each level. */
export function portGeometry(level: number): THREE.BufferGeometry {
  const L = Math.max(1, Math.min(3, level));
  const p = new Parts();
  const half = [0, 1.5, 1.8, 2.15][L];
  p.slab(half * 2, half * 2, 0x82858a);
  p.tex = 0;
  // The quay edge, with bollards and fenders, and a pier reaching out.
  p.box(half * 2, 0.1, 0.12, CONCRETE, { y: 0.04, z: half - 0.06 });
  for (let i = -3; i <= 3; i++) p.cyl(0.04, 0.05, 0.08, 0x2a2e33, { x: i * (half / 3.4), y: 0.14, z: half - 0.2 }, 8);
  const pier = 0.9 + 0.2 * L;
  p.box(0.34 + 0.06 * L, 0.1, pier, CONCRETE_DARK, { x: half * 0.45, y: -0.05, z: half + pier / 2 - 0.05 });
  for (let i = 0; i < 3 + L; i++) for (const dx of [-1, 1]) p.cyl(0.03, 0.03, 0.4, 0x4a3b2a, { x: half * 0.45 + dx * (0.17 + 0.03 * L), y: -0.35, z: half + 0.15 + i * (pier / (3 + L)) }, 6);
  // Cranes along the quay.
  gantry(p, -half * 0.4, half - 0.5, 1.0 + 0.15 * L);
  if (L >= 2) gantry(p, -half * 0.05, half - 0.5, 1.15 + 0.15 * L, 0xcf7a2b);
  if (L >= 3) gantry(p, half * 0.3, half - 0.5, 1.35, BLUE);
  // Sheds and the harbour office at the back.
  p.tex = 5;
  p.box(half * 1.3, 0.5, 0.7, 0xaab2b9, { x: -half * 0.3, y: 0.04, z: -half + 0.55 });
  p.gable(half * 1.36, 0.22, 0.78, 0x58606a, { x: -half * 0.3, y: 0.54, z: -half + 0.55, ry: Math.PI / 2 });
  p.tex = 3;
  p.box(0.6, 0.5, 0.5, 0xe9e6dc, { x: half * 0.62, y: 0.04, z: -half + 0.5 });
  p.tex = 0;
  p.box(0.66, 0.05, 0.56, 0x4f545c, { x: half * 0.62, y: 0.54, z: -half + 0.5 });
  p.box(0.4, 0.1, 0.02, 0x5f8aa3, { x: half * 0.62, y: 0.3, z: -half + 0.76 });
  p.cyl(0.02, 0.02, 0.5, 0xdcdcd6, { x: half * 0.62, y: 0.59, z: -half + 0.5 }, 6);
  p.box(0.2, 0.12, 0.012, 0xb23a30, { x: half * 0.62 + 0.1, y: 1.0, z: -half + 0.5 });
  if (L >= 2) {
    p.tex = 5;
    p.box(half * 1.0, 0.4, 0.55, 0xb9b4a8, { x: -half * 0.35, y: 0.04, z: -half + 1.35 });
    p.tex = 0;
    p.box(half * 1.04, 0.05, 0.6, 0x5a6068, { x: -half * 0.35, y: 0.44, z: -half + 1.35 });
  }
  // Container stacks.
  const rows = 2 + L;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 3 + L; c++) {
      const high = 1 + ((r * 5 + c * 3) % 3);
      for (let h = 0; h < Math.min(high, L + 1); h++) container(p, half * 0.35 + c * 0.2 - 0.3, 0.04 + h * 0.12, -0.35 + r * 0.46, BOX[(r * 3 + c + h * 2) % BOX.length]);
    }
  }
  // Trucks and a forklift.
  for (let i = 0; i < L; i++) {
    p.box(0.2, 0.14, 0.34, [0xe9eaeb, 0x2f7a6a, 0xd7a21f][i], { x: -half + 0.4 + i * 0.3, y: 0.06, z: 0.35 });
    p.box(0.16, 0.12, 0.12, [0x2f7a6a, 0xb23a30, 0x2f5f8a][i], { x: -half + 0.4 + i * 0.3, y: 0.06, z: 0.58 });
  }
  p.box(0.1, 0.1, 0.14, YELLOW, { x: half * 0.1, y: 0.04, z: half - 1.0 });
  lamp(p, -half + 0.12, half - 0.15, 1.1);
  lamp(p, half - 0.12, half - 0.15, 1.1);
  lamp(p, half - 0.12, -half + 0.2, 1.1);
  if (L >= 3) {
    p.cyl(0.18, 0.18, 0.6, 0xe6e6e1, { x: -half + 0.35, y: 0.04, z: -half + 0.35 }, 14);
    p.cyl(0.18, 0.18, 0.5, 0xd7d2c4, { x: -half + 0.75, y: 0.04, z: -half + 0.35 }, 14);
  }
  return p.build();
}

/** Terraced coffee on a highland slope, with a drying patio, a sorting shed and a farmhouse. */
export function coffeeFarmGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(2.6, 0.03, 2.4, 0x6f8a4a);
  p.box(2.55, 1.5, 2.35, 0x5a7340, { y: -1.5 });
  // Three terraces stepping up toward the back, each a row of coffee bushes dotted with red cherries.
  for (let t = 0; t < 3; t++) {
    const z = -0.9 + t * 0.5;
    p.box(2.2, 0.1 + (2 - t) * 0.07, 0.34, 0x7a5a3c, { y: 0.03, z: z - 0.17 });
    for (let i = 0; i < 8; i++) {
      const x = -0.95 + i * 0.27;
      p.sphere(0.13, t % 2 ? 0x3f6a36 : 0x2f5a30, { x, y: 0.25 + (2 - t) * 0.07, z }, 1);
      p.sphere(0.03, 0xc0392b, { x: x + 0.08, y: 0.28 + (2 - t) * 0.07, z: z + 0.08 }, 0);
      p.sphere(0.03, 0xc0392b, { x: x - 0.07, y: 0.22 + (2 - t) * 0.07, z: z + 0.1 }, 0);
    }
  }
  // Shade trees between the terraces.
  for (const [x, z] of [[-1.15, -0.4], [1.15, 0.0], [-1.15, 0.2]]) {
    p.cyl(0.04, 0.05, 0.5, 0x6a4a30, { x, y: 0.03, z }, 6);
    p.sphere(0.28, 0x3f7a45, { x, y: 0.72, z }, 1);
  }
  // Drying patio of beans, a sorting shed with a tin roof, and a house with a red roof.
  p.box(0.9, 0.025, 0.55, 0xb08a60, { x: -0.5, y: 0.03, z: 0.75 });
  for (let i = 0; i < 4; i++) p.box(0.9, 0.01, 0.06, 0x6b4426, { x: -0.5, y: 0.055, z: 0.55 + i * 0.13 });
  p.tex = 5;
  p.box(0.7, 0.42, 0.5, 0xaab2b9, { x: 0.65, y: 0.03, z: 0.8 });
  p.gable(0.78, 0.2, 0.58, 0x6a5a48, { x: 0.65, y: 0.45, z: 0.8, ry: Math.PI / 2 });
  p.tex = 3;
  p.box(0.62, 0.4, 0.5, 0xe9d9a8, { x: 0.75, y: 0.03, z: -0.15 });
  p.gable(0.72, 0.28, 0.6, 0x9a3a30, { x: 0.75, y: 0.43, z: -0.15 });
  p.tex = 0;
  p.box(0.16, 0.24, 0.02, 0x5a3b2a, { x: 0.75, y: 0.03, z: 0.11 });
  for (let i = 0; i < 4; i++) p.box(0.16, 0.12, 0.12, 0xc8b078, { x: 1.05 + (i % 2) * 0.18, y: 0.03 + Math.floor(i / 2) * 0.12, z: 0.85 });
  return p.build();
}

/** A grove of mango trees in rows, with crates of fruit and a thatched packing shed. */
export function mangoGroveGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(2.6, 0.03, 2.3, 0x7ba04e);
  p.box(2.55, 1.5, 2.25, 0x5f7f40, { y: -1.5 });
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const x = -0.9 + c * 0.6 + (r % 2) * 0.15;
      const z = -0.7 + r * 0.55;
      p.cyl(0.05, 0.06, 0.34, 0x5a3f28, { x, y: 0.03, z }, 6);
      p.sphere(0.3, 0x2f6a35, { x, y: 0.52, z }, 1);
      p.sphere(0.2, 0x3f7f40, { x: x + 0.1, y: 0.7, z: z - 0.05 }, 1);
      for (const [dx, dy, dz] of [[0.15, 0.42, 0.2], [-0.16, 0.5, 0.15], [0.05, 0.62, 0.22]]) p.sphere(0.045, 0xf0a630, { x: x + dx, y: dy, z: z + dz }, 0);
    }
  }
  // Palms at the edge.
  for (const [x, z] of [[-1.15, 0.8], [1.2, -0.9]]) {
    p.cyl(0.035, 0.05, 0.9, 0x8a6a48, { x, y: 0.03, z, rz: 0.08 }, 6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      p.box(0.5, 0.025, 0.08, 0x3f8a40, { x: x + Math.cos(a) * 0.2, y: 0.9, z: z + Math.sin(a) * 0.2, ry: -a, rz: -0.25 });
    }
  }
  // Packing shed with a thatched roof, and crates of mangoes.
  p.tex = 2;
  p.box(0.8, 0.36, 0.55, 0xc9a86c, { x: 0.6, y: 0.03, z: 0.85 });
  p.tex = 0;
  p.gable(0.95, 0.3, 0.68, 0xb89a4a, { x: 0.6, y: 0.39, z: 0.85, ry: Math.PI / 2 });
  for (let i = 0; i < 6; i++) {
    p.box(0.2, 0.1, 0.14, 0xc7a068, { x: -0.5 + (i % 3) * 0.24, y: 0.03 + Math.floor(i / 3) * 0.1, z: 0.85 });
    p.box(0.17, 0.03, 0.11, 0xf0a630, { x: -0.5 + (i % 3) * 0.24, y: 0.13 + Math.floor(i / 3) * 0.1, z: 0.85 });
  }
  return p.build();
}

/** A pumpjack nodding over a well, a derrick, storage tanks and a flare stack. */
export function oilWellGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(1.3, 1.34, 0.05, 0x5a5650);
  p.cyl(1.27, 1.27, 1.5, 0x4a4742, { y: -1.5 });
  // Dark ground round the well.
  p.cyl(0.9, 0.95, 0.02, 0x2b2b2e, { y: 0.05 }, 16);
  // Pumpjack: base, a-frame and the motor; the beam with its horse head and counterweight rocks (see anims.ts).
  p.box(0.9, 0.12, 0.4, METAL_DARK, { x: -0.1, y: 0.05, z: -0.1 });
  p.box(0.07, 0.8, 0.07, METAL, { x: -0.3, y: 0.15, z: -0.1, rz: 0.28 });
  p.box(0.07, 0.8, 0.07, METAL, { x: 0.1, y: 0.15, z: -0.1, rz: -0.28 });
  p.box(0.3, 0.2, 0.26, 0xcf4a30, { x: -0.55, y: 0.05, z: 0.25 });
  // A derrick tower.
  for (const [dx, dz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) p.box(0.03, 1.4, 0.03, METAL_DARK, { x: 0.8 + dx * 0.6, y: 0.05, z: -0.55 + dz * 0.6, rx: dz * 0.18, rz: -dx * 0.18 });
  for (let i = 0; i < 4; i++) p.box(0.34 - i * 0.05, 0.02, 0.34 - i * 0.05, METAL, { x: 0.8, y: 0.3 + i * 0.3, z: -0.55 });
  p.box(0.2, 0.08, 0.2, 0xcf4a30, { x: 0.8, y: 1.46, z: -0.55 });
  // Storage tanks with a ladder, drums, a pipe run and a tanker truck.
  for (const [x, z, h] of [[-0.8, 0.8, 0.5], [-0.35, 0.95, 0.42], [0.1, 0.85, 0.5]]) {
    p.cyl(0.2, 0.2, h, 0xd9d9d2, { x, y: 0.05, z }, 14);
    p.cyl(0.21, 0.21, 0.03, 0x8a9096, { x, y: 0.05 + h, z }, 14);
    p.box(0.02, h, 0.03, METAL_DARK, { x: x + 0.2, y: 0.05, z });
  }
  p.box(1.1, 0.04, 0.04, METAL_DARK, { x: -0.3, y: 0.18, z: 0.6 });
  for (let i = 0; i < 4; i++) p.cyl(0.05, 0.05, 0.12, [0xb23a30, 0x2f5f8a][i % 2], { x: 0.8 + (i % 2) * 0.12, y: 0.05, z: 0.5 + Math.floor(i / 2) * 0.12 }, 8);
  p.box(0.5, 0.18, 0.2, 0xe9eaeb, { x: 0.65, y: 0.1, z: 1.1 });
  p.cyl(0.1, 0.1, 0.4, 0xc7c9cb, { x: 0.6, y: 0.2, z: 1.1, rz: Math.PI / 2 }, 12);
  p.box(0.16, 0.16, 0.2, 0x2f5f8a, { x: 0.95, y: 0.1, z: 1.1 });
  // Flare stack with a flame.
  p.cyl(0.02, 0.03, 1.1, 0x555a60, { x: 1.05, y: 0.05, z: 0.3 }, 6);
  p.cone(0.07, 0.22, 0xe8762a, { x: 1.05, y: 1.15, z: 0.3 }, 8);
  p.cone(0.04, 0.14, 0xf6d25a, { x: 1.05, y: 1.18, z: 0.3 }, 8);
  return p.build();
}

/** Ground props for a resource node of an island specialty. */
export function specialtyNodeProps(p: Parts, kind: 'coffee' | 'mango' | 'oil'): void {
  if (kind === 'coffee') {
    for (let t = 0; t < 3; t++) {
      for (let i = 0; i < 5; i++) {
        const x = -0.9 + i * 0.45;
        const z = -0.8 + t * 0.7;
        p.sphere(0.14, 0x2f5a30, { x, y: 0.16, z }, 1);
        p.sphere(0.03, 0xc0392b, { x: x + 0.08, y: 0.2, z: z + 0.08 }, 0);
      }
    }
    for (const [x, z] of [[-1.1, 0.9], [1.1, -0.9]]) {
      p.cyl(0.04, 0.05, 0.5, 0x6a4a30, { x, y: 0.02, z }, 6);
      p.sphere(0.26, 0x3f7a45, { x, y: 0.7, z }, 1);
    }
  } else if (kind === 'mango') {
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const x = -0.8 + c * 0.8;
        const z = -0.5 + r * 0.9;
        p.cyl(0.05, 0.06, 0.3, 0x5a3f28, { x, y: 0.02, z }, 6);
        p.sphere(0.3, 0x2f6a35, { x, y: 0.5, z }, 1);
        p.sphere(0.045, 0xf0a630, { x: x + 0.15, y: 0.46, z: z + 0.2 }, 0);
        p.sphere(0.045, 0xf0a630, { x: x - 0.16, y: 0.55, z: z + 0.14 }, 0);
      }
    }
  } else {
    // A bare wellhead with a christmas tree of valves, a stain of crude round it and a few drums.
    p.cyl(0.5, 0.55, 0.02, 0x232326, { x: 0, y: 0.02, z: 0 }, 14);
    p.cyl(0.05, 0.06, 0.4, 0xcf4a30, { x: 0, y: 0.02, z: 0 }, 8);
    p.box(0.24, 0.05, 0.05, 0xcf4a30, { x: 0, y: 0.2, z: 0 });
    p.box(0.05, 0.05, 0.24, 0xcf4a30, { x: 0, y: 0.3, z: 0 });
    for (const [x, z] of [[0.7, 0.4], [0.84, 0.4], [0.77, 0.56]]) p.cyl(0.06, 0.06, 0.14, 0x2f5f8a, { x, y: 0.02, z }, 8);
    p.box(1.4, 0.04, 0.04, 0x65727e, { x: -0.9, y: 0.03, z: -0.1 });
  }
}
