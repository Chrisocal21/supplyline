// Procedural 3D models: industry, logistics, towns and vehicles. Muted, realistic colours.
// Units: one tile is about 3.3 world units wide, so a building is roughly 2.5 units across.
import * as THREE from 'three';
import type { SiteKind, VehicleKind } from '../sim/defs';
import { industryGeometry } from './industry';
import { Parts } from './parts';

const C = {
  concrete: 0xb4b2ab,
  concreteDark: 0x8a8a86,
  asphalt: 0x3b3d41,
  roofDark: 0x4f545c,
  roofRed: 0x7a3f35,
  timber: 0x7a5a3c,
  timberDark: 0x54402b,
  brick: 0x8a5646,
  metal: 0x8a9aa7,
  metalDark: 0x65727e,
  white: 0xe6e6e1,
  glass: 0x5d7d96,
  yellow: 0xd7a21f,
  orange: 0xcf7a2b,
  blue: 0x2f5f8a,
  green: 0x3f7a55,
  red: 0x9a3a32,
  soil: 0x6a5a44,
  stone: 0x9a9ea3,
  wood: 0xc7a068,
  black: 0x1f2124,
};

function log(p: Parts, x: number, y: number, z: number, len = 1.0): void {
  p.cyl(0.09, 0.09, len, C.wood, { x, y: y + 0.09, z, rz: Math.PI / 2 }, 10);
}

function wheel(p: Parts, x: number, y: number, z: number, r = 0.09): void {
  p.cyl(r, r, 0.07, C.black, { x, y: y, z, rz: Math.PI / 2 }, 10);
}

function forestry(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(1.35, 1.4, 0.05, C.soil);
  p.cyl(1.32, 1.32, 1.5, 0x5a4c3a, { y: -1.5 });
  p.tex = 2;
  // Cabin
  p.box(1.2, 0.5, 0.8, C.timber, { x: -0.45, y: 0.05, z: -0.25 });
  p.gable(1.36, 0.32, 0.96, C.roofDark, { x: -0.45, y: 0.55, z: -0.25 });
  p.box(0.12, 0.4, 0.12, C.concreteDark, { x: -0.1, y: 0.7, z: -0.45 });
  p.box(0.22, 0.34, 0.02, C.timberDark, { x: -0.45, y: 0.05, z: 0.16 });
  p.box(0.22, 0.2, 0.02, 0xcfd8dc, { x: -0.8, y: 0.2, z: 0.16 });
  // Log pile
  log(p, 0.55, 0.05, 0.45);
  log(p, 0.55, 0.05, 0.66);
  log(p, 0.55, 0.23, 0.555);
  log(p, 0.2, 0.05, 0.8, 0.8);
  // Skidder
  p.box(0.6, 0.26, 0.38, C.yellow, { x: 0.45, y: 0.13, z: -0.5 });
  p.box(0.26, 0.24, 0.3, C.yellow, { x: 0.6, y: 0.39, z: -0.5 });
  p.box(0.2, 0.14, 0.02, 0x9fc3d6, { x: 0.6, y: 0.5, z: -0.34 });
  for (const [x, z] of [[0.25, -0.3], [0.65, -0.3], [0.25, -0.7], [0.65, -0.7]]) wheel(p, x, 0.02, z, 0.13);
  // Stumps and a couple of standing trees behind
  p.cyl(0.07, 0.08, 0.1, C.timberDark, { x: -1.0, y: 0.04, z: 0.55 }, 8);
  p.cyl(0.06, 0.07, 0.08, C.timberDark, { x: 1.0, y: 0.04, z: 0.1 }, 8);
  for (const [x, z, h] of [[-1.1, -0.95, 1.2], [1.0, -0.95, 1.0]]) {
    p.cyl(0.04, 0.06, 0.3, C.timberDark, { x, y: 0.05, z }, 6);
    p.cone(0.34, h, 0x2c4a33, { x, y: 0.3, z }, 8);
  }
  return p.build();
}

function farm(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(2.5, 1.5, 2.2, 0x6a5a3a, { y: -1.5 });
  p.tex = 2;
  p.box(1.3, 0.7, 0.9, 0x7a3a2e, { x: -0.5, y: 0, z: -0.3 });
  p.gable(1.46, 0.45, 1.04, C.roofDark, { x: -0.5, y: 0.7, z: -0.3 });
  p.box(0.42, 0.46, 0.02, 0xe6e2d6, { x: -0.5, y: 0, z: 0.16 });
  p.box(0.5, 0.1, 0.02, 0xe6e2d6, { x: -0.5, y: 0.55, z: 0.16 });
  // Silos
  p.cyl(0.22, 0.22, 1.3, 0xc9cdcf, { x: 0.35, y: 0, z: -0.55 });
  p.dome(0.22, 0x9aa1a6, { x: 0.35, y: 1.3, z: -0.55 });
  p.cyl(0.18, 0.18, 1.0, 0xc9cdcf, { x: 0.78, y: 0, z: -0.45 });
  p.dome(0.18, 0x9aa1a6, { x: 0.78, y: 1.0, z: -0.45 });
  // Farmhouse
  p.box(0.6, 0.4, 0.5, 0xe9e6dc, { x: 0.55, y: 0, z: 0.5 });
  p.gable(0.72, 0.28, 0.62, C.roofRed, { x: 0.55, y: 0.4, z: 0.5 });
  // Hay bales and a trailer
  for (const [x, z] of [[-0.2, 0.7], [0.05, 0.72], [-0.07, 0.95]]) p.cyl(0.16, 0.16, 0.24, 0xd0b050, { x, y: 0.16, z, rz: Math.PI / 2 }, 12);
  p.box(0.5, 0.14, 0.3, C.green, { x: -1.0, y: 0.08, z: 0.6 });
  return p.build();
}

function quarry(): THREE.BufferGeometry {
  const p = new Parts();
  // Gravel floor at the bottom of the pit; the terrain around it is dug out, so the walls come from the ground itself.
  p.cyl(1.3, 1.34, 0.05, 0x8b877d);
  p.cyl(1.27, 1.27, 1.5, 0x6d6b66, { y: -1.5 });
  p.cyl(0.9, 0.95, 0.03, 0x9c988d, { y: 0.05, x: -0.2, z: 0.15 }, 14);
  // Excavator working the face
  p.box(0.52, 0.18, 0.4, 0x3a3d40, { x: -0.55, y: 0.05, z: 0.2 });
  p.box(0.34, 0.26, 0.3, C.yellow, { x: -0.55, y: 0.23, z: 0.2 });
  p.box(0.74, 0.07, 0.09, C.yellow, { x: -0.95, y: 0.5, z: 0.2, rz: 0.55 });
  p.box(0.22, 0.12, 0.2, C.metalDark, { x: -1.22, y: 0.62, z: 0.2 });
  // Crusher, hopper and conveyor
  p.box(0.62, 0.55, 0.5, C.metal, { x: 0.5, y: 0.05, z: -0.5 });
  p.cone(0.36, 0.26, C.metalDark, { x: 0.5, y: 0.6, z: -0.5 }, 4);
  p.box(1.0, 0.06, 0.16, C.metalDark, { x: 0.05, y: 0.34, z: -0.5, rz: 0.2 });
  p.box(0.06, 0.34, 0.06, C.metalDark, { x: -0.4, y: 0.05, z: -0.5 });
  p.box(0.06, 0.2, 0.06, C.metalDark, { x: 0.2, y: 0.05, z: -0.5 });
  // Sorted stone piles and cut blocks
  p.cone(0.34, 0.36, C.stone, { x: 1.0, y: 0.05, z: 0.1 }, 9);
  p.cone(0.26, 0.28, 0xb0b3b6, { x: 0.72, y: 0.05, z: 0.4 }, 9);
  p.box(0.28, 0.16, 0.2, 0xc4c1b8, { x: 0.35, y: 0.05, z: 0.75 });
  p.box(0.28, 0.16, 0.2, 0xb9b6ad, { x: 0.66, y: 0.05, z: 0.85 });
  p.box(0.28, 0.16, 0.2, 0xcac7be, { x: 0.5, y: 0.21, z: 0.8 });
  // Haul truck
  p.box(0.5, 0.2, 0.3, 0xe08a2e, { x: -0.3, y: 0.1, z: 0.85 });
  p.box(0.18, 0.2, 0.28, 0xe08a2e, { x: -0.62, y: 0.14, z: 0.85 });
  return p.build();
}

function sawmill(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.3, 1.8, C.concreteDark);
  p.tex = 5;
  p.box(1.7, 0.62, 0.85, C.metal, { x: -0.2, y: 0.04, z: -0.35 });
  p.gable(1.86, 0.3, 1.0, C.metalDark, { x: -0.2, y: 0.66, z: -0.35 });
  p.box(0.4, 0.34, 0.02, 0x24272b, { x: -0.5, y: 0.04, z: 0.08 });
  p.box(0.7, 0.2, 0.02, 0x9fc3d6, { x: 0.15, y: 0.3, z: 0.08 });
  p.cyl(0.09, 0.11, 1.1, C.brick, { x: 0.45, y: 0.04, z: -0.6 });
  p.box(0.5, 0.2, 0.3, C.white, { x: 0.9, y: 0.04, z: -0.35 });
  // Lumber stacks and log deck
  p.box(0.62, 0.22, 0.36, C.wood, { x: 0.8, y: 0.04, z: 0.6 });
  p.box(0.62, 0.22, 0.36, 0xd5b27a, { x: 0.8, y: 0.26, z: 0.6 });
  p.box(0.5, 0.22, 0.34, C.wood, { x: 0.1, y: 0.04, z: 0.7 });
  log(p, -0.95, 0.04, 0.55, 0.9);
  log(p, -0.95, 0.04, 0.76, 0.9);
  log(p, -0.95, 0.22, 0.655, 0.9);
  p.box(0.9, 0.07, 0.16, C.metalDark, { x: -0.9, y: 0.32, z: 0.1, rz: 0.12 });
  return p.build();
}

function mill(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.3, 1.8, C.concreteDark);
  p.tex = 6;
  for (let i = 0; i < 3; i++) {
    p.cyl(0.26, 0.26, 1.5, 0xd4d0c4, { x: -0.6 + i * 0.58, y: 0.04, z: -0.45 });
    p.cone(0.27, 0.18, 0x9aa1a6, { x: -0.6 + i * 0.58, y: 1.54, z: -0.45 });
  }
  p.box(1.8, 0.14, 0.3, 0xbab6aa, { x: -0.02, y: 1.72, z: -0.45 });
  p.box(1.3, 0.55, 0.8, C.concrete, { x: 0.3, y: 0.04, z: 0.45 });
  p.box(1.4, 0.06, 0.9, C.concreteDark, { x: 0.3, y: 0.59, z: 0.45 });
  p.box(0.45, 0.35, 0.02, 0x24272b, { x: 0.0, y: 0.04, z: 0.86 });
  p.box(0.5, 0.2, 0.02, 0x9fc3d6, { x: 0.7, y: 0.3, z: 0.86 });
  for (const [x, z] of [[-0.8, 0.5], [-0.65, 0.7]]) p.cyl(0.11, 0.11, 0.26, 0xf4efe3, { x, y: 0.04, z }, 10);
  return p.build();
}

function papermill(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.5, 2.0, C.concreteDark);
  p.tex = 5;
  p.box(2.0, 0.85, 1.0, 0xb8bab9, { x: -0.2, y: 0.04, z: -0.3 });
  for (let i = 0; i < 4; i++) p.gable(0.5, 0.22, 1.0, C.metalDark, { x: -0.8 + i * 0.5, y: 0.89, z: -0.3 });
  p.box(0.9, 0.22, 0.02, 0x9fc3d6, { x: -0.3, y: 0.5, z: 0.21 });
  p.box(0.4, 0.4, 0.02, 0x24272b, { x: 0.45, y: 0.04, z: 0.21 });
  for (const x of [0.75, 1.05]) {
    p.cyl(0.1, 0.13, 1.7, C.brick, { x, y: 0.04, z: -0.65 });
    p.cyl(0.11, 0.11, 0.1, 0xe9eced, { x, y: 1.5, z: -0.65 });
  }
  for (const x of [0.55, 0.98]) p.cyl(0.3, 0.3, 0.75, 0xe9eced, { x, y: 0.04, z: 0.65 });
  p.box(0.5, 0.05, 0.05, C.metalDark, { x: 0.77, y: 0.6, z: 0.65 });
  for (const [x, y] of [[-1.0, 0.04], [-0.7, 0.04], [-0.85, 0.3]]) p.cyl(0.17, 0.17, 0.5, 0xfbfbf7, { x, y, z: 0.7, rz: Math.PI / 2 }, 12);
  return p.build();
}

function bakery(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.3, 1.8, C.concreteDark);
  p.tex = 3;
  p.box(1.5, 0.6, 0.95, 0xd8c7a5, { x: -0.2, y: 0.04, z: -0.3 });
  p.gable(1.64, 0.3, 1.05, C.roofRed, { x: -0.2, y: 0.64, z: -0.3, ry: Math.PI / 2 });
  p.box(0.5, 0.36, 0.02, 0x2b2420, { x: -0.55, y: 0.04, z: 0.18 });
  p.box(0.6, 0.22, 0.02, 0xf0d9a0, { x: 0.15, y: 0.26, z: 0.18 });
  p.box(1.0, 0.08, 0.3, 0xb34a3a, { x: 0.15, y: 0.5, z: 0.32 });
  p.cyl(0.08, 0.1, 0.95, C.brick, { x: 0.35, y: 0.04, z: -0.62 });
  // Delivery van and bread crates
  p.box(0.5, 0.26, 0.28, 0xf2eee2, { x: 0.8, y: 0.06, z: 0.62 });
  p.box(0.2, 0.22, 0.26, 0xb34a3a, { x: 1.1, y: 0.06, z: 0.62 });
  p.box(0.4, 0.14, 0.3, 0xc98c4a, { x: -0.85, y: 0.04, z: 0.62 });
  p.box(0.4, 0.14, 0.3, 0xdba35c, { x: -0.85, y: 0.18, z: 0.62 });
  return p.build();
}

function brickworks(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.4, 1.9, C.concreteDark);
  p.tex = 1;
  p.box(1.5, 0.55, 0.9, 0x8e5646, { x: -0.3, y: 0.04, z: -0.4 });
  p.box(1.58, 0.06, 0.98, C.roofDark, { x: -0.3, y: 0.59, z: -0.4 });
  p.cyl(0.14, 0.18, 1.5, 0x7a4a3c, { x: 0.45, y: 0.04, z: -0.6 });
  p.cyl(0.16, 0.14, 0.08, 0x2b2420, { x: 0.45, y: 1.54, z: -0.6 });
  p.box(0.5, 0.34, 0.02, 0xff9a3c, { x: -0.7, y: 0.1, z: 0.06 });
  // Brick stacks drying
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p.box(0.5, 0.2, 0.3, [0xa4523f, 0xb05c46, 0x984a38][(i + j) % 3], { x: -0.55 + i * 0.52, y: 0.04 + j * 0.2, z: 0.7 });
  p.box(0.6, 0.14, 0.3, 0x9a9a95, { x: 0.9, y: 0.04, z: 0.55 });
  p.cone(0.3, 0.3, 0x9d9a92, { x: 1.0, y: 0.04, z: 0.1 }, 8);
  return p.build();
}

function feedmill(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.3, 1.8, C.concreteDark);
  p.tex = 2;
  p.box(1.2, 0.7, 0.9, 0xcbbd8b, { x: -0.3, y: 0.04, z: -0.35 });
  p.gable(1.3, 0.3, 1.0, 0x6f7a5a, { x: -0.3, y: 0.74, z: -0.35, ry: Math.PI / 2 });
  for (let i = 0; i < 2; i++) {
    p.cyl(0.28, 0.28, 1.2, 0xb7a35a, { x: 0.65 + i * 0.6, y: 0.04, z: -0.4 });
    p.dome(0.28, 0x8c7d42, { x: 0.65 + i * 0.6, y: 1.24, z: -0.4 });
  }
  p.box(0.4, 0.34, 0.02, 0x24272b, { x: -0.5, y: 0.04, z: 0.12 });
  for (let i = 0; i < 4; i++) p.box(0.28, 0.12, 0.2, 0xe2d6a7, { x: -0.9 + (i % 2) * 0.32, y: 0.04 + Math.floor(i / 2) * 0.12, z: 0.7 });
  p.box(0.5, 0.26, 0.3, 0x6b7f8e, { x: 0.85, y: 0.06, z: 0.65 });
  return p.build();
}

function pelletmill(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.3, 1.8, C.concreteDark);
  p.tex = 5;
  p.box(1.4, 0.6, 0.9, 0x8a7a5e, { x: -0.3, y: 0.04, z: -0.4 });
  p.gable(1.5, 0.26, 1.0, C.metalDark, { x: -0.3, y: 0.64, z: -0.4 });
  p.cyl(0.3, 0.3, 1.0, 0xc7c9cb, { x: 0.75, y: 0.04, z: -0.5 });
  p.cone(0.32, 0.3, 0x9aa1a6, { x: 0.75, y: 1.04, z: -0.5 }, 12);
  p.box(0.9, 0.06, 0.12, C.metalDark, { x: 0.2, y: 0.8, z: -0.5, rz: 0.2 });
  // Sawdust heap and pellet bags
  p.cone(0.45, 0.4, 0xd6bf8f, { x: -0.85, y: 0.04, z: 0.6 }, 10);
  for (let i = 0; i < 4; i++) p.box(0.26, 0.1, 0.18, 0x9a7448, { x: 0.3 + (i % 2) * 0.3, y: 0.04 + Math.floor(i / 2) * 0.1, z: 0.7 });
  return p.build();
}

function workshop(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.5, 2.0, C.concreteDark);
  p.tex = 5;
  p.box(1.9, 0.7, 1.0, 0x9aa1a8, { x: -0.1, y: 0.04, z: -0.4 });
  for (let i = 0; i < 3; i++) p.gable(0.66, 0.24, 1.04, 0x6f4a35, { x: -0.7 + i * 0.64, y: 0.74, z: -0.4 });
  p.box(0.6, 0.4, 0.02, 0x24272b, { x: -0.4, y: 0.04, z: 0.11 });
  p.box(0.8, 0.22, 0.02, 0x9fc3d6, { x: 0.45, y: 0.3, z: 0.11 });
  // Finished furniture: tables, a wardrobe and chairs out front
  p.box(0.6, 0.05, 0.36, 0x8b5a3a, { x: -0.6, y: 0.2, z: 0.75 });
  for (const [x, z] of [[-0.85, 0.62], [-0.35, 0.62], [-0.85, 0.88], [-0.35, 0.88]]) p.box(0.04, 0.2, 0.04, 0x6f4a35, { x, y: 0.0, z });
  p.box(0.34, 0.5, 0.3, 0x7a4f33, { x: 0.3, y: 0.04, z: 0.8 });
  p.box(0.34, 0.04, 0.3, 0x5c3a25, { x: 0.3, y: 0.54, z: 0.8 });
  p.box(0.3, 0.2, 0.3, 0xb8895a, { x: 0.8, y: 0.04, z: 0.8 });
  return p.build();
}

function printery(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.5, 2.0, C.concreteDark);
  p.tex = 6;
  p.box(1.8, 0.8, 1.0, 0x7389b3, { x: -0.1, y: 0.04, z: -0.4 });
  p.box(1.9, 0.07, 1.1, 0x3d4a66, { x: -0.1, y: 0.84, z: -0.4 });
  for (let i = 0; i < 4; i++) p.box(0.3, 0.26, 0.02, 0x9fc3d6, { x: -0.7 + i * 0.4, y: 0.5, z: 0.11 });
  p.box(0.4, 0.4, 0.02, 0x24272b, { x: 0.8, y: 0.04, z: 0.11 });
  p.box(0.5, 0.14, 0.02, 0xf2efe6, { x: -0.1, y: 0.7, z: 0.12 });
  // Paper reels and book pallets
  for (const x of [-0.9, -0.55]) p.cyl(0.2, 0.2, 0.34, 0xf7f5ee, { x, y: 0.04, z: 0.75 }, 14);
  for (let i = 0; i < 3; i++) p.box(0.5, 0.1, 0.34, [0x4f6fa8, 0xa8574f, 0x4f8a64][i], { x: 0.4 + (i % 2) * 0.1, y: 0.04 + i * 0.1, z: 0.8 });
  return p.build();
}

function hub(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.7, 2.2, C.concreteDark);
  p.tex = 5;
  p.box(2.3, 0.7, 1.15, 0x7b8691, { x: 0, y: 0.04, z: -0.4 });
  p.box(2.38, 0.05, 1.23, 0x4a5058, { x: 0, y: 0.74, z: -0.4 });
  p.box(2.3, 0.09, 0.02, C.orange, { x: 0, y: 0.5, z: 0.18 });
  for (let i = 0; i < 4; i++) {
    p.box(0.4, 0.4, 0.02, 0x23262a, { x: -0.85 + i * 0.57, y: 0.04, z: 0.18 });
    p.box(0.44, 0.04, 0.03, C.yellow, { x: -0.85 + i * 0.57, y: 0.44, z: 0.19 });
  }
  p.box(0.55, 0.38, 0.45, 0xe3e1da, { x: -1.05, y: 0.04, z: 0.75 });
  p.box(0.6, 0.04, 0.5, 0x6a6e73, { x: -1.05, y: 0.42, z: 0.75 });
  const cols = [C.orange, C.blue, C.green, C.red, 0xd9d6cc, C.blue];
  [[0.9, 0.04, 0.8], [0.9, 0.3, 0.8], [0.3, 0.04, 0.85], [-0.3, 0.04, 0.9], [0.3, 0.3, 0.85], [0.95, 0.04, 0.45]].forEach(([x, y, z], i) => {
    p.box(0.56, 0.26, 0.24, cols[i % cols.length], { x, y, z });
  });
  return p.build();
}

function market(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(1.9, 1.6, 0x9a968c);
  p.tex = 3;
  p.box(1.4, 0.45, 0.8, 0xc9bfa8, { x: 0, y: 0.04, z: -0.35 });
  p.gable(1.52, 0.24, 0.92, 0x6c3a33, { x: 0, y: 0.49, z: -0.35 });
  for (let i = 0; i < 7; i++) {
    p.box(0.2, 0.04, 0.55, i % 2 ? C.white : 0xb94a40, { x: -0.66 + i * 0.22, y: 0.4, z: 0.25, rx: 0.25 });
  }
  p.box(1.2, 0.2, 0.34, C.wood, { x: 0, y: 0.04, z: 0.38 });
  const fruit = [0xc0452f, 0xe0a030, 0x6fa84a, 0xc0452f, 0xe0a030];
  fruit.forEach((c, i) => p.sphere(0.07, c, { x: -0.45 + i * 0.22, y: 0.3, z: 0.38 }, 0));
  p.box(0.34, 0.2, 0.26, C.wood, { x: 0.8, y: 0.04, z: 0.65 });
  p.box(0.3, 0.2, 0.26, C.wood, { x: -0.8, y: 0.04, z: 0.65 });
  return p.build();
}

function freight(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.4, 2.0, 0x7b7d7e);
  p.tex = 5;
  const cols = [C.orange, C.blue, C.green, C.red, 0xd9d6cc, 0x6b7f8e];
  let n = 0;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      for (const z of [-0.6, -0.3]) p.box(0.5, 0.26, 0.24, cols[n++ % cols.length], { x: -0.85 + c * 0.55, y: 0.04 + r * 0.26, z });
    }
  }
  for (const x of [-0.95, 0.95]) p.box(0.06, 1.0, 0.06, C.blue, { x, y: 0.04, z: 0.5 });
  p.box(2.0, 0.08, 0.12, C.blue, { x: 0, y: 1.0, z: 0.5 });
  p.box(0.22, 0.12, 0.2, C.yellow, { x: 0.2, y: 0.88, z: 0.5 });
  p.box(0.5, 0.26, 0.24, C.orange, { x: 0.2, y: 0.04, z: 0.5 });
  return p.build();
}

/** The track runs in along +Z and ends at a buffer stop between two platforms. */
function station(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.7, 2.6, C.concreteDark);
  p.tex = 5;
  for (const x of [-0.72, 0.72]) p.box(0.62, 0.13, 2.4, C.concrete, { x, y: 0.04, z: 0 });
  for (const x of [-0.43, 0.43]) p.box(0.04, 0.02, 2.4, C.yellow, { x, y: 0.17, z: 0 });
  // Station house
  p.tex = 3;
  p.box(0.5, 0.52, 1.25, C.brick, { x: -0.92, y: 0.17, z: -0.35 });
  p.gable(1.4, 0.26, 0.64, C.roofDark, { x: -0.92, y: 0.69, z: -0.35, ry: Math.PI / 2 });
  for (const z of [-0.75, -0.35, 0.05]) p.box(0.02, 0.22, 0.2, 0x9fc3d6, { x: -0.66, y: 0.34, z });
  p.box(0.03, 0.14, 0.5, C.white, { x: -0.66, y: 0.6, z: -0.35 });
  // Canopy over the far platform
  p.tex = 5;
  for (const z of [-0.9, 0, 0.9]) p.box(0.06, 0.62, 0.06, C.metalDark, { x: 0.88, y: 0.17, z });
  p.box(0.78, 0.05, 2.2, C.roofDark, { x: 0.72, y: 0.79, z: 0 });
  // Buffer stop, and crates waiting on the platform
  p.box(0.5, 0.26, 0.1, C.red, { x: 0, y: 0.04, z: -1.05 });
  p.box(0.6, 0.06, 0.06, C.white, { x: 0, y: 0.3, z: -1.05 });
  p.box(0.3, 0.22, 0.3, C.wood, { x: 0.78, y: 0.17, z: -0.6 });
  p.box(0.3, 0.22, 0.3, C.wood, { x: 0.78, y: 0.17, z: -0.25 });
  p.box(0.26, 0.2, 0.26, C.orange, { x: 0.78, y: 0.39, z: -0.42 });
  p.box(0.34, 0.2, 0.5, C.blue, { x: -0.8, y: 0.17, z: 0.75 });
  return p.build();
}

export function siteGeometry(kind: SiteKind): THREE.BufferGeometry {
  switch (kind) {
    case 'forestry':
      return forestry();
    case 'farm':
      return farm();
    case 'quarry':
      return quarry();
    case 'sawmill':
      return sawmill();
    case 'mill':
      return mill();
    case 'papermill':
      return papermill();
    case 'bakery':
      return bakery();
    case 'brickworks':
      return brickworks();
    case 'feedmill':
      return feedmill();
    case 'pelletmill':
      return pelletmill();
    case 'workshop':
      return workshop();
    case 'printery':
      return printery();
    case 'hub':
      return hub();
    case 'market':
      return market();
    case 'freight':
      return freight();
    case 'station':
      return station();
    default:
      return industryGeometry(kind);
  }
}


/** Vehicles face +Z. Wheels are included. */
export function vehicleGeometry(kind: VehicleKind): THREE.BufferGeometry {
  const p = new Parts();
  switch (kind) {
    case 'boxtruck':
      p.box(0.32, 0.07, 0.92, 0x2b2d30, { y: 0.1 });
      p.box(0.32, 0.3, 0.28, 0x3b6ea5, { y: 0.14, z: 0.33 });
      p.box(0.3, 0.12, 0.02, 0xbcd6e6, { y: 0.28, z: 0.475 });
      p.box(0.35, 0.36, 0.58, 0xe4e5e6, { y: 0.14, z: -0.14 });
      for (const [x, z] of [[-0.17, 0.3], [0.17, 0.3], [-0.17, -0.26], [0.17, -0.26]]) wheel(p, x, 0.0, z);
      break;
    case 'rig':
      p.box(0.34, 0.07, 1.6, 0x2b2d30, { y: 0.1 });
      p.box(0.34, 0.36, 0.36, 0xa83a30, { y: 0.14, z: 0.62 });
      p.box(0.32, 0.12, 0.02, 0xbcd6e6, { y: 0.32, z: 0.805 });
      p.box(0.18, 0.1, 0.18, 0x2b2d30, { y: 0.5, z: 0.62 });
      p.box(0.38, 0.44, 1.05, 0xdfe1e3, { y: 0.14, z: -0.3 });
      p.box(0.39, 0.06, 1.05, 0x2f5f8a, { y: 0.34, z: -0.3 });
      for (const [x, z] of [[-0.18, 0.6], [0.18, 0.6], [-0.18, -0.55], [0.18, -0.55], [-0.18, -0.78], [0.18, -0.78]]) wheel(p, x, 0.0, z, 0.1);
      break;
    case 'train':
      p.box(0.36, 0.4, 0.9, 0x2f4a36, { y: 0.1, z: 0.8 });
      p.box(0.3, 0.12, 0.02, 0xbcd6e6, { y: 0.34, z: 1.255 });
      for (let i = 0; i < 3; i++) p.box(0.36, 0.38, 0.85, [0x8a4a32, 0x6b7f8e, 0x9a8a5a][i], { y: 0.1, z: -0.1 - i * 0.92 });
      break;
    case 'plane':
      p.cyl(0.17, 0.17, 1.5, 0xe9ebec, { y: 0.22, z: -0.75, rx: Math.PI / 2 }, 14);
      p.cone(0.17, 0.35, 0xe9ebec, { y: 0.22, z: 0.75, rx: Math.PI / 2 }, 14);
      p.box(1.7, 0.04, 0.34, 0xcfd3d6, { y: 0.2, z: 0.05 });
      p.box(0.6, 0.04, 0.22, 0xcfd3d6, { y: 0.24, z: -0.7 });
      p.box(0.04, 0.3, 0.24, 0x2f5f8a, { y: 0.3, z: -0.72 });
      break;
  }
  return p.build();
}
