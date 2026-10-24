// Procedural 3D models: industry, logistics, towns and vehicles. Muted, realistic colours.
// Units: one tile is about 3.3 world units wide, so a building is roughly 2.5 units across.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GOODS, SITE_DEFS, type Good, type SiteKind, type VehicleKind } from '../sim/defs';
import { industryGeometry } from './industry';
import { cargoShipGeometry, coasterGeometry, containerShipGeometry } from './opening';
import { portGeometry } from './specialty';
import { Parts } from './parts';
import { addTree } from './vegetation';
import { framedWindow, loadingBay, roofVent } from './architecture';
import { truckGeometry } from './trucks';
import { resourceDetails } from './resourceDetails';
import { airportGeometry } from './airport';

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
  // Ground: the soil disc and its skirt, with a trodden dirt yard in front of the cabin and along the log pile.
  p.cyl(1.35, 1.4, 0.05, C.soil);
  p.cyl(1.32, 1.32, 1.5, 0x5a4c3a, { y: -1.5 });
  p.box(0.34, 0.012, 1.1, 0x9a845f, { x: -0.45, y: 0.05, z: 0.8 });
  p.cyl(0.5, 0.5, 0.012, 0x9a845f, { x: 0.55, y: 0.05, z: 0.6 }, 20);
  p.tex = 2;
  // Cabin: timber walls on a stone footing, dark corner posts, a shingle roof with a ridge cap, a stone chimney.
  const cx = -0.45;
  const cz = -0.25;
  p.box(1.24, 0.07, 0.84, 0x8d8b84, { x: cx, y: 0.05, z: cz, t: 6 });
  p.box(1.2, 0.5, 0.8, 0x946a43, { x: cx, y: 0.1, z: cz });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.box(0.075, 0.52, 0.075, 0x5c4129, { x: cx + sx * 0.6, y: 0.1, z: cz + sz * 0.4 });
  for (let i = 0; i < 4; i++) p.box(1.22, 0.012, 0.82, 0x7a5636, { x: cx, y: 0.2 + i * 0.1, z: cz });
  p.gable(1.42, 0.34, 1.02, 0x6b4a3a, { x: cx, y: 0.6, z: cz });
  p.box(1.44, 0.025, 0.05, 0x4a3328, { x: cx, y: 0.94, z: cz, t: 0 });
  p.box(0.15, 0.55, 0.15, 0x8d8b84, { x: -0.1, y: 0.62, z: -0.5, t: 6 });
  p.box(0.19, 0.04, 0.19, 0x65625d, { x: -0.1, y: 1.17, z: -0.5, t: 6 });
  // Front: a porch under a lean-to roof, the door, two shuttered windows.
  p.box(0.95, 0.03, 0.3, 0xa07a4f, { x: cx, y: 0.05, z: cz + 0.55 });
  for (const sx of [-1, 1]) p.box(0.05, 0.4, 0.05, 0x5c4129, { x: cx + sx * 0.44, y: 0.08, z: cz + 0.68 });
  p.box(1.0, 0.035, 0.36, 0x4a3328, { x: cx, y: 0.5, z: cz + 0.6, rx: -0.14, t: 4 });
  p.box(0.24, 0.36, 0.025, 0x4a3328, { x: cx, y: 0.1, z: cz + 0.41, t: 0 });
  p.box(0.025, 0.04, 0.03, 0xd7a21f, { x: cx + 0.08, y: 0.28, z: cz + 0.43, t: 0 });
  for (const wx of [-0.82, -0.08]) {
    framedWindow(p, wx, 0.22, cz + 0.41, 0.2, 0.2);
    for (const sx of [-1, 1]) p.box(0.06, 0.2, 0.02, 0x3f6a4a, { x: wx + sx * 0.15, y: 0.22, z: cz + 0.42, t: 0 });
  }
  // Firewood stacked against the side wall.
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) p.cyl(0.04, 0.04, 0.3, i % 2 ? 0xb08a56 : 0x946f43, { x: -1.08, y: 0.12 + r * 0.075, z: -0.62 + i * 0.09 + r * 0.045, rx: Math.PI / 2 }, 7);
  // Log yard: a stack on bearers with pale cut ends, loose logs, and the by-product piles.
  const stack = (x: number, z: number, rows: number): void => {
    for (const bz of [-0.12, 0.12]) p.box(0.06, 0.04, 0.06, C.timberDark, { x: x - 0.4 + (bz > 0 ? 0.8 : 0), y: 0.05, z, t: 0 });
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < rows - r; i++) {
        const lz = z + (i - (rows - r - 1) / 2) * 0.2;
        const ly = 0.14 + r * 0.17;
        p.cyl(0.09, 0.09, 1.0, (i + r) % 2 ? 0xa97f50 : 0x8d6a42, { x, y: ly, z: lz, rz: Math.PI / 2 }, 10);
        for (const e of [-1, 1]) p.cyl(0.075, 0.075, 0.01, 0xd9bf8c, { x: x + e * 0.501, y: ly, z: lz, rz: Math.PI / 2 }, 10);
      }
    }
  };
  stack(0.55, 0.5, 3);
  log(p, 0.2, 0.05, 0.9, 0.8);
  p.cone(0.16, 0.16, 0xd2b27a, { x: 1.0, y: 0.05, z: 0.92 }, 10);
  p.cone(0.13, 0.13, 0x9a7650, { x: 1.12, y: 0.05, z: 0.45 }, 9);
  // Chopping block with an axe, and stumps.
  p.cyl(0.09, 0.1, 0.14, 0x8a6a45, { x: -1.0, y: 0.05, z: 0.3 }, 10);
  p.box(0.02, 0.2, 0.02, 0x6e4f33, { x: -1.0, y: 0.19, z: 0.3, rz: 0.4, t: 0 });
  p.box(0.07, 0.05, 0.015, 0x9aa4ab, { x: -0.95, y: 0.34, z: 0.3, t: 5 });
  p.cyl(0.07, 0.08, 0.1, C.timberDark, { x: -1.05, y: 0.04, z: 0.62 }, 8);
  p.cyl(0.06, 0.07, 0.08, C.timberDark, { x: 1.0, y: 0.04, z: 0.1 }, 8);
  p.tex = 2;
  // Skidder: yellow body and hood, a cab with glass and a roof, an exhaust, a front blade and a rear log arch.
  p.box(0.6, 0.22, 0.38, C.yellow, { x: 0.45, y: 0.15, z: -0.5 });
  p.box(0.3, 0.12, 0.34, 0xc4901a, { x: 0.3, y: 0.37, z: -0.5 });
  p.box(0.26, 0.24, 0.3, C.yellow, { x: 0.6, y: 0.37, z: -0.5 });
  p.box(0.3, 0.03, 0.34, 0x3a3d42, { x: 0.6, y: 0.62, z: -0.5, t: 0 });
  p.box(0.2, 0.14, 0.02, 0x9fc3d6, { x: 0.6, y: 0.48, z: -0.34, t: 8 });
  p.cyl(0.02, 0.02, 0.2, 0x2b2d30, { x: 0.22, y: 0.4, z: -0.4 }, 6);
  p.box(0.04, 0.22, 0.42, 0x3a3d42, { x: 0.78, y: 0.1, z: -0.5, t: 5 });
  for (const sz of [-1, 1]) p.box(0.03, 0.34, 0.03, 0x3a3d42, { x: 0.1, y: 0.15, z: -0.5 + sz * 0.17, t: 5 });
  p.box(0.03, 0.03, 0.4, 0x3a3d42, { x: 0.1, y: 0.49, z: -0.5, t: 5 });
  for (const [x, z] of [[0.25, -0.3], [0.65, -0.3], [0.25, -0.7], [0.65, -0.7]]) {
    p.cyl(0.11, 0.11, 0.07, C.black, { x, y: 0.16, z, rx: Math.PI / 2 }, 16);
    p.cyl(0.05, 0.05, 0.075, C.metal, { x, y: 0.16, z, rx: Math.PI / 2 }, 12);
  }
  // Standing trees behind the camp.
  for (const [x, z, h] of [[-1.1, -0.95, 1.2], [1.0, -0.95, 1.0]]) {
    addTree(p, 'pine', x, 0.05, z, h, x > 0 ? 1 : 0);
  }
  return p.build();
}

function farm(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(2.5, 1.5, 2.2, 0x6a5a3a, { y: -1.5 });
  p.tex = 2;
  p.box(1.3, 0.7, 0.9, 0x7a3a2e, { x: -0.5, y: 0, z: -0.3 });
  p.gable(1.46, 0.45, 1.04, C.roofDark, { x: -0.5, y: 0.7, z: -0.3 });
  loadingBay(p, -0.5, 0.02, 0.16, 0.38, 0.38);
  p.box(0.5, 0.1, 0.02, 0xe6e2d6, { x: -0.5, y: 0.55, z: 0.16 });
  for (const side of [-1, 1]) {
    p.box(0.025, 0.55, 0.025, C.white, { x: -0.5 + side * 0.19, y: 0.02, z: 0.18, rz: side * 0.62, t: 0 });
    p.box(0.03, 0.7, 0.03, C.white, { x: -0.5 + side * 0.63, y: 0, z: 0.17, t: 0 });
  }
  for (const z of [-0.76, 0.16]) p.box(1.35, 0.022, 0.028, C.metalDark, { x: -0.5, y: 0.69, z, t: 5 });
  for (let i = 0; i < 5; i++) p.box(0.11, 0.045, 0.055, C.metalDark, { x: -1.02 + i * 0.26, y: 1.125, z: -0.3, t: 5 });
  // Silos
  p.cyl(0.22, 0.22, 1.3, 0xc9cdcf, { x: 0.35, y: 0, z: -0.55 });
  p.dome(0.22, 0x9aa1a6, { x: 0.35, y: 1.3, z: -0.55 });
  p.cyl(0.18, 0.18, 1.0, 0xc9cdcf, { x: 0.78, y: 0, z: -0.45 });
  p.dome(0.18, 0x9aa1a6, { x: 0.78, y: 1.0, z: -0.45 });
  // Farmhouse
  p.box(0.6, 0.4, 0.5, 0xe9e6dc, { x: 0.55, y: 0, z: 0.5 });
  p.gable(0.72, 0.28, 0.62, C.roofRed, { x: 0.55, y: 0.4, z: 0.5 });
  framedWindow(p, 0.4, 0.15, 0.76, 0.14, 0.14);
  framedWindow(p, 0.7, 0.15, 0.76, 0.14, 0.14);
  // Hay bales and a trailer
  for (const [x, z] of [[-0.2, 0.7], [0.05, 0.72], [-0.07, 0.95]]) {
    p.cyl(0.075, 0.075, 0.12, 0xb4a16d, { x, y: 0.08, z, rz: Math.PI / 2 }, 16);
    p.cyl(0.05, 0.05, 0.123, 0x9c8956, { x, y: 0.08, z, rz: Math.PI / 2 }, 16);
    p.cyl(0.025, 0.025, 0.125, 0xc4b47f, { x, y: 0.08, z, rz: Math.PI / 2 }, 12);
  }
  p.box(0.5, 0.14, 0.3, C.green, { x: -1.0, y: 0.08, z: 0.6 });
  for (const x of [-1.16, -0.84]) for (const z of [0.45, 0.78]) p.cyl(0.055, 0.055, 0.035, C.black, { x, y: 0.06, z, rx: Math.PI / 2 }, 12);
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
  framedWindow(p, -0.62, 0.23, 0.996, 0.15, 0.085);
  for (const x of [-0.6, -0.15]) for (const z of [0.69, 1.035]) {
    p.cyl(0.075, 0.075, 0.04, C.black, { x, y: 0.125, z, rx: Math.PI / 2 }, 16);
    p.cyl(0.035, 0.035, 0.044, C.metal, { x, y: 0.125, z, rx: Math.PI / 2 }, 12);
  }
  return p.build();
}

function sawmill(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.3, 1.8, C.concreteDark);
  p.tex = 5;
  p.box(1.7, 0.62, 0.85, C.metal, { x: -0.2, y: 0.04, z: -0.35 });
  p.gable(1.86, 0.3, 1.0, C.metalDark, { x: -0.2, y: 0.66, z: -0.35 });
  loadingBay(p, -0.5, 0.04, 0.09, 0.4, 0.34);
  framedWindow(p, 0.15, 0.3, 0.09, 0.7, 0.2);
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
  loadingBay(p, 0, 0.04, 0.86, 0.45, 0.35);
  framedWindow(p, 0.7, 0.3, 0.86, 0.5, 0.2);
  roofVent(p, 0.6, 0.65, 0.45);
  for (const [x, z] of [[-0.8, 0.5], [-0.65, 0.7]]) p.cyl(0.11, 0.11, 0.26, 0xf4efe3, { x, y: 0.04, z }, 10);
  return p.build();
}

function papermill(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(2.5, 2.0, C.concreteDark);
  p.tex = 5;
  p.box(2.0, 0.85, 1.0, 0xb8bab9, { x: -0.2, y: 0.04, z: -0.3 });
  for (let i = 0; i < 4; i++) p.gable(0.5, 0.22, 1.0, C.metalDark, { x: -0.8 + i * 0.5, y: 0.89, z: -0.3 });
  framedWindow(p, -0.3, 0.5, 0.21, 0.9, 0.22);
  loadingBay(p, 0.45, 0.04, 0.21, 0.4, 0.4);
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
    loadingBay(p, -0.85 + i * 0.57, 0.04, 0.18, 0.4, 0.4);
  }
  for (const x of [-0.7, 0.7]) roofVent(p, x, 0.79, -0.5, 1.2);
  for (const z of [-0.99, 0.19]) p.box(2.38, 0.09, 0.03, C.metalDark, { y: 0.79, z, t: 5 });
  p.box(0.55, 0.38, 0.45, 0xe3e1da, { x: -1.05, y: 0.04, z: 0.75 });
  p.box(0.6, 0.04, 0.5, 0x6a6e73, { x: -1.05, y: 0.42, z: 0.75 });
  framedWindow(p, -1.05, 0.16, 0.985, 0.36, 0.17);
  const cols = [C.orange, C.blue, C.green, C.red, 0xd9d6cc, C.blue];
  [[0.9, 0.04, 0.8], [0.9, 0.3, 0.8], [0.3, 0.04, 0.85], [-0.3, 0.04, 0.9], [0.3, 0.3, 0.85], [0.95, 0.04, 0.45]].forEach(([x, y, z], i) => {
    p.box(0.56, 0.26, 0.24, cols[i % cols.length], { x, y, z });
  });
  return p.build();
}

/** A Rail Yard: a warehouse and truck bays on one side, a rail yard with a platform and a gantry on the other. */
function depot(): THREE.BufferGeometry {
  const p = new Parts();
  p.slab(3.1, 3.0, C.concreteDark);
  p.tex = 5;
  // Warehouse and truck bays, as the hub, a little smaller.
  p.box(1.5, 0.7, 1.15, 0x7b8691, { x: -0.8, y: 0.04, z: -0.6 });
  p.box(1.58, 0.05, 1.23, 0x4a5058, { x: -0.8, y: 0.74, z: -0.6 });
  p.box(1.5, 0.09, 0.02, C.orange, { x: -0.8, y: 0.5, z: -0.02 });
  for (let i = 0; i < 3; i++) {
    loadingBay(p, -1.25 + i * 0.45, 0.04, -0.02, 0.34, 0.4);
  }
  roofVent(p, -0.8, 0.79, -0.6, 1.25);
  p.box(0.55, 0.36, 0.4, 0xe3e1da, { x: -1.1, y: 0.04, z: 0.8 });
  p.box(0.6, 0.04, 0.45, 0x6a6e73, { x: -1.1, y: 0.4, z: 0.8 });
  framedWindow(p, -1.1, 0.14, 1.01, 0.36, 0.17);
  // The rail yard: two tracks with a loading platform between them.
  p.tex = 6;
  p.box(0.34, 0.11, 2.7, C.concrete, { x: 0.95, y: 0.04, z: 0 });
  for (const x of [0.5, 1.4]) {
    p.box(0.3, 0.02, 2.8, 0x4a4036, { x, y: 0.04, z: 0 });
    for (let z = -1.3; z <= 1.31; z += 0.2) p.box(0.34, 0.025, 0.07, 0x3a2f26, { x, y: 0.05, z });
    for (const dx of [-0.08, 0.08]) p.box(0.03, 0.04, 2.8, 0x9aa3ab, { x: x + dx, y: 0.075, z: 0 });
  }
  p.box(0.32, 0.06, 0.1, 0x2a2c30, { x: 0.5, y: 0.1, z: -1.4 });
  p.box(0.32, 0.06, 0.1, 0x2a2c30, { x: 1.4, y: 0.1, z: -1.4 });
  // A gantry over the platform, and a stack of containers.
  for (const z of [-0.5, 0.5]) for (const x of [0.62, 1.28]) p.box(0.05, 0.7, 0.05, C.blue, { x, y: 0.04, z });
  for (const z of [-0.5, 0.5]) p.box(0.78, 0.06, 0.08, C.blue, { x: 0.95, y: 0.74, z });
  p.box(0.12, 0.1, 0.18, C.yellow, { x: 0.95, y: 0.62, z: 0.1 });
  const cols = [C.orange, C.blue, C.green, C.red];
  for (let i = 0; i < 4; i++) p.box(0.5, 0.26, 0.22, cols[i], { x: -0.1 + (i % 2) * 0.05, y: 0.04 + Math.floor(i / 2) * 0.26, z: 1.25 });
  // The yard office.
  p.tex = 3;
  p.box(0.4, 0.34, 0.5, C.brick, { x: 0.1, y: 0.04, z: -1.2 });
  p.gable(0.5, 0.2, 0.6, C.roofDark, { x: 0.1, y: 0.38, z: -1.2, ry: Math.PI / 2 });
  return p.build();
}

/** A cleared building site: bare ground with a few stakes and a pile of boards, where a town's Supply Yard or Market will go up. */
function foundation(kind: SiteKind): THREE.BufferGeometry {
  const p = new Parts();
  const big = kind === 'freight';
  const w = big ? 2.4 : 1.9;
  const d = big ? 2.0 : 1.6;
  p.slab(w, d, 0x8f8a7c);
  p.tex = 0;
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) p.box(0.06, 0.34, 0.06, C.wood, { x: x * (w / 2 - 0.12), y: 0.04, z: z * (d / 2 - 0.12) });
  for (let i = 0; i < 3; i++) p.box(0.7, 0.06, 0.18, 0xc9a06a, { x: -0.3, y: 0.04 + i * 0.06, z: 0.2 + (i % 2) * 0.03 });
  p.box(0.32, 0.12, 0.32, 0xb8b5ac, { x: 0.45, y: 0.04, z: -0.2 });
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

/**
 * A parked or flying airliner built from simple shapes, nose toward +z when yaw is 0: a white fuselage with a tapered tail,
 * dark cockpit and a row of windows, swept wings with engines under them, a tail fin and tail planes, and a colour stripe.
 * `size` scales it (1 is the cargo plane's length); `engines` is two or four; `gear` adds wheels for one on the ground.
 */
function airliner(p: Parts, x: number, z: number, yaw: number, size: number, livery: number, engines = 2, gear = true): void {
  const c = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const at = (lx: number, lz: number): { x: number; z: number } => ({ x: x + lx * c + lz * sn, z: z - lx * sn + lz * c });
  const s = size;
  const r = 0.15 * s;
  const y = 0.2 * s + (gear ? 0.06 * s : 0);
  const white = 0xf0f1f2;
  const prevTex = p.tex;
  p.tex = 0;
  // Fuselage, nose and tapering tail.
  const body = at(0, -0.62 * s);
  p.cyl(r, r, 1.3 * s, white, { x: body.x, y, z: body.z, rx: Math.PI / 2, ry: yaw }, 14);
  const nose = at(0, 0.68 * s);
  p.cone(r, 0.36 * s, white, { x: nose.x, y, z: nose.z, rx: Math.PI / 2, ry: yaw }, 14);
  const tail = at(0, -0.62 * s);
  p.cyl(r * 0.28, r, 0.62 * s, white, { x: tail.x, y: y + 0.01 * s, z: tail.z, rx: -Math.PI / 2, ry: yaw }, 14);
  // Belly, the colour stripe and a row of windows along each side.
  const belly = at(0, -0.5 * s);
  p.box(r * 1.5, 0.05 * s, 1.0 * s, 0xc9cdd0, { x: belly.x, y: y - r - 0.01 * s, z: belly.z, ry: yaw });
  for (const side of [-1, 1]) {
    const st = at(side * (r + 0.002 * s), -0.45 * s);
    p.box(0.012 * s, 0.035 * s, 1.1 * s, livery, { x: st.x, y: y - 0.03 * s, z: st.z, ry: yaw });
    for (let i = 0; i < 9; i++) {
      const w = at(side * (r + 0.003 * s), 0.38 * s - i * 0.095 * s);
      p.box(0.012 * s, 0.03 * s, 0.045 * s, 0x2a3946, { x: w.x, y: y + 0.03 * s, z: w.z, ry: yaw });
    }
  }
  const cock = at(0, 0.52 * s);
  p.box(r * 1.5, 0.05 * s, 0.1 * s, 0x1f2e3a, { x: cock.x, y: y + r * 0.45, z: cock.z, ry: yaw, rx: -0.5 });
  // Swept wings with engines slung under them, and the tail plane.
  for (const side of [-1, 1]) {
    const w = at(side * 0.42 * s, -0.02 * s);
    p.box(0.8 * s, 0.025 * s, 0.3 * s, 0xd5d9dc, { x: w.x, y: y - 0.07 * s, z: w.z, ry: yaw + side * 0.5 });
    const tip = at(side * 0.8 * s, -0.22 * s);
    p.box(0.02 * s, 0.07 * s, 0.1 * s, livery, { x: tip.x, y: y - 0.06 * s, z: tip.z, ry: yaw });
    for (const px of engines === 4 ? [0.28, 0.55] : [0.3]) {
      const e = at(side * px * s, 0.1 * s);
      p.cyl(0.055 * s, 0.05 * s, 0.22 * s, 0xaab1b6, { x: e.x, y: y - 0.16 * s, z: e.z, rx: Math.PI / 2, ry: yaw }, 10);
      const f = at(side * px * s, 0.32 * s);
      p.cyl(0.04 * s, 0.04 * s, 0.01 * s, 0x2a2e33, { x: f.x, y: y - 0.16 * s, z: f.z, rx: Math.PI / 2, ry: yaw }, 10);
    }
    const t = at(side * 0.14 * s, -1.12 * s);
    p.box(0.3 * s, 0.02 * s, 0.14 * s, 0xd5d9dc, { x: t.x, y, z: t.z, ry: yaw + side * 0.45 });
  }
  const fin = at(0, -1.08 * s);
  p.box(0.02 * s, 0.28 * s, 0.22 * s, livery, { x: fin.x, y: y + 0.04 * s, z: fin.z, ry: yaw });
  if (gear) {
    for (const [gx, gz] of [[0, 0.5], [-0.12, -0.1], [0.12, -0.1]]) {
      const g = at(gx * s, gz * s);
      p.box(0.015 * s, 0.1 * s, 0.015 * s, 0x6b7279, { x: g.x, y: 0.03 * s, z: g.z });
      p.cyl(0.032 * s, 0.032 * s, 0.03 * s, 0x1d1f22, { x: g.x, y: 0.0, z: g.z, rz: Math.PI / 2 }, 8);
    }
  }
  p.tex = prevTex;
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
    case 'garage':
      return workshop();
    case 'market':
      return market();
    case 'freight':
      return freight();
    case 'station':
      return station();
    case 'airport':
      return airportGeometry(1);
    case 'port':
      return portGeometry(1);
    case 'railyard':
      return depot();
    default:
      return industryGeometry(kind);
  }
}


// ---- building levels: an upgraded building is bigger and has more going on around it ----

/** How much the main building grows at each level: [across, up]. Camps and farms grow less in height. */
const LEVEL_GROW: Record<number, { raw: [number, number]; other: [number, number] }> = {
  2: { raw: [1.06, 1.15], other: [1.08, 1.3] },
  3: { raw: [1.12, 1.3], other: [1.15, 1.6] },
};

/** A fence round the lot, open at the front where the road comes in. */
function fence(p: Parts, color: number): void {
  const e = 1.55;
  p.box(3.1, 0.14, 0.04, color, { y: 0, z: -e });
  p.box(0.04, 0.14, 3.1, color, { x: -e, y: 0 });
  p.box(0.04, 0.14, 3.1, color, { x: e, y: 0 });
  p.box(1.1, 0.14, 0.04, color, { x: -1.0, y: 0, z: e });
  p.box(1.1, 0.14, 0.04, color, { x: 1.0, y: 0, z: e });
  for (const [x, z] of [[-e, -e], [e, -e], [-e, e], [e, e], [-0.45, e], [0.45, e]]) p.box(0.07, 0.24, 0.07, color, { x, y: 0, z });
}

function truck(p: Parts, x: number, z: number, color: number): void {
  p.box(0.5, 0.22, 0.26, color, { x: x - 0.06, y: 0.07, z });
  p.box(0.18, 0.2, 0.26, 0xe6e6e1, { x: x + 0.28, y: 0.07, z });
  p.box(0.02, 0.09, 0.2, 0x9fc3d6, { x: x + 0.37, y: 0.17, z });
  for (const [dx, dz] of [[-0.2, 0.13], [0.25, 0.13], [-0.2, -0.13], [0.25, -0.13]]) wheel(p, x + dx, 0.0, z + dz, 0.07);
}

function lamp(p: Parts, x: number, z: number, h = 1.3): void {
  p.cyl(0.025, 0.03, h, C.metalDark, { x, y: 0, z }, 6);
  p.box(0.16, 0.05, 0.08, 0xf2e6b0, { x, y: h, z });
}

/** What a level adds around a building. */
function levelParts(kind: SiteKind, level: number): THREE.BufferGeometry {
  const def = SITE_DEFS[kind];
  const p = new Parts();
  const good = def.produce?.good ?? (Object.keys(def.recipe?.outputs ?? {})[0] as Good | undefined);
  const gc = good ? GOODS[good].color : C.wood;

  if (def.produce) {
    // Camps, farms, pits and mines: a fenced yard, a shed and stockpiles, then a barn, storage and their own truck.
    // A foundation pad just under the site's own ground carries the extras on a slope.
    p.slab(3.2, 3.2, C.soil, { y: -0.05 });
    p.tex = 2;
    fence(p, C.timber);
    p.box(0.7, 0.42, 0.55, C.timber, { x: 1.12, y: 0, z: -1.08 });
    p.gable(0.8, 0.24, 0.64, C.roofDark, { x: 1.12, y: 0.42, z: -1.08 });
    p.tex = 0;
    p.cone(0.34, 0.38, gc, { x: -1.18, y: 0, z: 1.1 }, 9);
    p.cone(0.24, 0.28, gc, { x: -0.84, y: 0, z: 1.25 }, 9);
    if (level >= 3) {
      p.tex = 2;
      p.box(1.0, 0.7, 0.7, C.red, { x: -1.0, y: 0, z: -1.08 });
      p.gable(1.12, 0.36, 0.8, C.roofDark, { x: -1.0, y: 0.7, z: -1.08 });
      p.box(0.34, 0.42, 0.02, 0xe6e2d6, { x: -1.0, y: 0, z: -0.72 });
      const farmy = def.node === 'farmland' || def.node === 'pasture' || def.node === 'orchard';
      p.tex = 5;
      if (farmy) {
        for (const z of [0.05, 0.5]) {
          p.cyl(0.19, 0.19, 1.4, 0xc9cdcf, { x: 1.32, y: 0, z });
          p.dome(0.19, C.metalDark, { x: 1.32, y: 1.4, z });
        }
      } else {
        // An open-sided storage shed with the goods stacked under it.
        for (const [x, z] of [[1.08, -0.2], [1.5, -0.2], [1.08, 0.75], [1.5, 0.75]]) p.box(0.06, 0.62, 0.06, C.timberDark, { x, y: 0, z });
        p.box(0.6, 0.05, 1.12, C.roofDark, { x: 1.29, y: 0.62, z: 0.27 });
        p.tex = 0;
        for (let i = 0; i < 4; i++) p.box(0.38, 0.16, 0.2, gc, { x: 1.29, y: 0.02 + (i % 2) * 0.16, z: 0.02 + Math.floor(i / 2) * 0.5 });
      }
      p.tex = 0;
      p.cone(0.3, 0.34, gc, { x: -1.3, y: 0, z: 0.7 }, 9);
      truck(p, 0.85, 1.22, C.blue);
      lamp(p, -1.48, -1.48);
      lamp(p, 1.48, 1.48);
    }
    return p.build();
  }

  // Factories, hubs and airports: a bigger paved lot first.
  p.slab(3.1, 2.8, level >= 3 ? 0x7f7e79 : 0x8f8e89, { y: -0.005 });
  if (def.hub) {
    const cols = [C.orange, C.blue, C.green, C.red, 0xd9d6cc];
    for (let i = 0; i < 6; i++) p.box(0.56, 0.26, 0.24, cols[i % cols.length], { x: -1.25 + (i % 2) * 0.6, y: 0.035 + Math.floor(i / 2) * 0.26, z: -1.2 });
    if (level >= 3) {
      for (const x of [-1.45, 1.45]) p.box(0.08, 1.5, 0.08, C.yellow, { x, y: 0.035, z: 1.2 });
      p.box(3.0, 0.1, 0.12, C.yellow, { y: 1.5, z: 1.2 });
      p.box(0.3, 0.2, 0.2, C.metalDark, { x: 0.4, y: 1.3, z: 1.2 });
      for (let i = 0; i < 6; i++) p.box(0.56, 0.26, 0.24, cols[(i + 2) % cols.length], { x: 0.75 + (i % 2) * 0.6, y: 0.035 + Math.floor(i / 2) * 0.26, z: -1.2 });
      lamp(p, -1.45, -1.45, 1.6);
      lamp(p, 1.45, -1.45, 1.6);
    }
    return p.build();
  }

  // An annex hall at the back, silos to one side, and pallets of what it makes out front.
  p.tex = 5;
  p.box(1.1, 0.55, 0.6, 0xb9b4a8, { x: -0.95, y: 0.035, z: -1.15 });
  p.box(1.16, 0.05, 0.66, 0x5a6068, { x: -0.95, y: 0.585, z: -1.15 });
  for (const z of [-1.15, -0.62]) {
    p.cyl(0.2, 0.2, 1.15, 0xc7cbce, { x: 1.32, y: 0.035, z });
    p.dome(0.2, C.metalDark, { x: 1.32, y: 1.185, z });
  }
  p.tex = 0;
  for (let i = 0; i < 3; i++) p.box(0.3, 0.14, 0.24, gc, { x: -1.3 + i * 0.36, y: 0.035, z: 1.2 });
  p.box(0.3, 0.14, 0.24, gc, { x: -1.12, y: 0.175, z: 1.2 });
  if (level >= 3) {
    // A tall striped chimney, a second hall with a sawtooth roof, and a loading dock with a truck at it.
    p.tex = 1;
    p.cyl(0.11, 0.16, 2.7, 0xd8d4cc, { x: 0.35, y: 0.035, z: -1.35 });
    for (const h of [1.9, 2.35]) p.cyl(0.125, 0.125, 0.16, C.red, { x: 0.35, y: h, z: -1.35 });
    p.tex = 5;
    p.box(1.2, 0.75, 0.5, 0x9aa3ab, { x: 0.65, y: 0.035, z: 0.05 + 1.0 });
    for (let i = 0; i < 3; i++) p.gable(0.4, 0.22, 0.54, 0x4a525c, { x: 0.65 - 0.4 + i * 0.4, y: 0.785, z: 1.05 });
    p.tex = 6;
    p.box(1.2, 0.18, 0.3, C.concrete, { x: 0.65, y: 0.035, z: 1.45 });
    p.tex = 0;
    truck(p, -0.5, 0.95, C.orange);
    lamp(p, -1.48, 1.48);
    lamp(p, 1.48, -1.48);
  }
  return p.build();
}

/**
 * A signboard on a pole at the back corner of the lot, so a building can be told apart at a glance in a busy town. Its shape
 * says what sort of place it is (a disc for a camp, farm or pit, a square for a factory, a diamond for logistics) and its colour
 * is the good it makes, or blue for freight, with a white mark in the middle.
 */
function signGeometry(kind: SiteKind, level = 1): THREE.BufferGeometry {
  const def = SITE_DEFS[kind];
  const p = new Parts();
  const good = def.produce?.good ?? (Object.keys(def.recipe?.outputs ?? {})[0] as Good | undefined);
  const edge = def.airport ? 4.65 : def.port ? [0, 1.55, 1.85, 2.2][Math.max(1, Math.min(3, level))] : 1.5;
  const x = -edge;
  const z = -edge;
  const top = def.produce ? 0.48 : 2.05;
  const raw = good ? GOODS[good].color : def.airport ? 0x4aa3d8 : def.port ? 0x3a86c8 : def.railyard ? 0xd0702f : 0x2f6fb0;
  // Good colours are earthy; a sign has to read from afar, so pull them toward bright and saturated.
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(raw).getHSL(hsl);
  const color = new THREE.Color().setHSL(hsl.h, Math.max(0.85, hsl.s), 0.6).getHex();
  p.cyl(def.produce ? 0.009 : 0.03, def.produce ? 0.014 : 0.04, top, C.metal, { x, y: 0, z }, 8);
  if (def.produce) {
    p.cyl(0.12, 0.12, 0.012, C.white, { x, y: top - 0.05, z, rx: Math.PI / 2 }, 20);
    p.cyl(0.1, 0.1, 0.016, color, { x, y: top - 0.05, z, rx: Math.PI / 2 }, 20);
    p.cyl(0.035, 0.035, 0.02, C.white, { x, y: top - 0.05, z, rx: Math.PI / 2 }, 12);
  } else if (def.recipe) {
    p.box(0.74, 0.74, 0.07, C.white, { x, y: top - 0.37, z });
    p.box(0.64, 0.64, 0.09, color, { x, y: top - 0.32, z });
    p.box(0.26, 0.26, 0.1, C.white, { x, y: top - 0.13, z });
  } else {
    p.box(0.62, 0.62, 0.07, C.white, { x, y: top - 0.1, z, rz: Math.PI / 4 });
    p.box(0.5, 0.5, 0.09, color, { x, y: top - 0.1, z, rz: Math.PI / 4 });
    p.box(0.34, 0.07, 0.1, C.white, { x, y: top - 0.1, z });
  }
  return p.build();
}

/**
 * What a building adds from level 4 to level 10, one stage a level: more halls and silos, an office, a second stack, cooling
 * towers, solar roofs and, at the top, a headquarters tower with its own grounds. It grows out round the lot on a plinth that
 * reaches below the ground, so on a slope the wider lot still sits on the hill.
 */
function grandParts(kind: SiteKind, level: number): THREE.BufferGeometry {
  const def = SITE_DEFS[kind];
  const p = new Parts();
  const stage = Math.min(7, Math.max(1, level - 3));
  const good = def.produce?.good ?? (Object.keys(def.recipe?.outputs ?? {})[0] as Good | undefined);
  const gc = good ? GOODS[good].color : C.wood;
  const raw = !!def.produce;
  const e = 3.4 + 0.3 * stage;
  p.slab(e, e, raw ? C.soil : 0x7f7e79, { y: -0.06 });
  p.box(e - 0.1, 0.4, e - 0.1, C.soil, { y: -0.46 });
  const tree = (x: number, z: number): void => {
    p.cyl(0.03, 0.04, 0.3, C.timberDark, { x, y: 0, z }, 6);
    p.cone(0.28, 0.55, 0x3f7a4f, { x, y: 0.3, z }, 8);
  };
  if (raw) {
    if (stage >= 1) {
      p.tex = 2;
      p.box(0.9, 0.5, 0.6, C.timber, { x: 2.0, y: 0, z: -0.5 });
      p.gable(1.0, 0.28, 0.7, C.roofRed, { x: 2.0, y: 0.5, z: -0.5 });
      p.tex = 0;
      p.cone(0.3, 0.34, gc, { x: 2.0, y: 0, z: 0.5 }, 9);
      p.cone(0.22, 0.26, gc, { x: 2.3, y: 0, z: 0.8 }, 9);
    }
    if (stage >= 2) {
      p.tex = 5;
      p.cyl(0.05, 0.08, 1.8, C.metal, { x: -2.0, y: 0, z: 1.6 }, 8);
      for (const a of [0, Math.PI / 2]) p.box(0.9, 0.05, 0.06, C.white, { x: -2.0, y: 1.7, z: 1.6, ry: a });
      p.tex = 0;
    }
    if (stage >= 3) {
      p.tex = 5;
      p.box(2.0, 0.6, 0.8, 0x9aa3ab, { x: 0, y: 0, z: -2.1 });
      for (let i = 0; i < 4; i++) p.gable(0.5, 0.22, 0.84, 0x4a525c, { x: -0.75 + i * 0.5, y: 0.6, z: -2.1 });
      p.tex = 0;
      truck(p, 0.2, -1.55, C.orange);
    }
    if (stage >= 4) {
      p.tex = 5;
      for (const z of [0.3, 0.95]) {
        p.cyl(0.28, 0.28, 1.9, 0xc9cdcf, { x: 2.25, y: 0, z }, 14);
        p.dome(0.28, C.metalDark, { x: 2.25, y: 1.9, z });
      }
      p.box(0.1, 0.1, 1.3, C.metalDark, { x: 1.75, y: 1.0, z: 0.6 });
      p.tex = 0;
    }
    if (stage >= 5) {
      p.tex = 6;
      p.box(1.0, 0.75, 0.8, 0xcfc9bb, { x: -2.1, y: 0, z: -1.5 });
      p.box(1.06, 0.06, 0.86, C.roofDark, { x: -2.1, y: 0.75, z: -1.5 });
      for (let i = 0; i < 3; i++) p.box(0.18, 0.2, 0.02, 0x8fb4c8, { x: -2.45 + i * 0.35, y: 0.3, z: -1.09 });
      p.tex = 0;
      truck(p, -2.1, -0.45, C.blue);
    }
    if (stage >= 6) {
      for (let i = 0; i < 5; i++) p.box(0.34, 0.03, 0.6, 0x1f3d63, { x: -0.8 + i * 0.4, y: 0.95, z: -2.1, rx: -0.35 });
      p.cyl(0.03, 0.04, 2.6, C.metal, { x: 2.4, y: 0, z: -1.7 }, 6);
      p.box(0.08, 0.08, 0.08, 0xff4a3d, { x: 2.4, y: 2.6, z: -1.7 });
    }
    if (stage >= 7) {
      p.cyl(0.55, 0.55, 0.03, 0x4f86a8, { x: 2.1, y: 0, z: 1.9 }, 24);
      for (const [x, z] of [[-2.3, 2.0], [-1.8, 2.4], [1.2, 2.4], [2.5, 2.7], [-2.4, 0.5]]) tree(x, z);
      p.cyl(0.015, 0.015, 1.6, C.metal, { x: -1.4, y: 0, z: 2.3 }, 6);
      p.box(0.3, 0.18, 0.02, gc, { x: -1.25, y: 1.4, z: 2.3 });
    }
    return p.build();
  }
  // Factories and hubs.
  if (stage >= 1) {
    p.tex = 1;
    p.cyl(0.1, 0.14, 2.1, 0xd8d4cc, { x: -0.2, y: 0, z: -1.9 }, 12);
    p.cyl(0.115, 0.115, 0.14, C.red, { x: -0.2, y: 1.5, z: -1.9 }, 12);
    p.tex = 5;
    p.box(1.3, 0.9, 0.7, 0xb9b4a8, { x: 2.0, y: 0, z: -0.6 });
    p.box(1.36, 0.05, 0.76, 0x5a6068, { x: 2.0, y: 0.9, z: -0.6 });
    p.tex = 0;
  }
  if (stage >= 2) {
    p.tex = 5;
    for (const z of [1.1, 1.8]) {
      p.cyl(0.32, 0.32, 0.95, 0xc7cbce, { x: -2.1, y: 0, z }, 16);
      p.dome(0.32, C.metalDark, { x: -2.1, y: 0.95, z });
    }
    p.box(2.2, 0.08, 0.08, C.metalDark, { x: 0.1, y: 1.05, z: -1.9 });
    p.tex = 0;
  }
  if (stage >= 3) {
    p.tex = 6;
    p.box(0.9, 1.4, 0.8, 0xd7d2c4, { x: -2.1, y: 0, z: -1.5 });
    for (let r = 0; r < 4; r++) p.box(0.74, 0.08, 0.02, 0x8fb4c8, { x: -2.1, y: 0.25 + r * 0.3, z: -1.09 });
    p.box(0.96, 0.06, 0.86, C.roofDark, { x: -2.1, y: 1.4, z: -1.5 });
    p.tex = 0;
  }
  if (stage >= 4) {
    p.tex = 5;
    p.box(1.6, 0.8, 0.7, 0x9aa3ab, { x: 0.2, y: 0, z: 2.1 });
    for (let i = 0; i < 4; i++) p.gable(0.4, 0.22, 0.74, 0x4a525c, { x: -0.4 + i * 0.4, y: 0.8, z: 2.1 });
    p.tex = 0;
    p.box(3.0, 0.03, 0.05, C.metalDark, { y: 0.02, z: 2.85 });
    p.box(3.0, 0.03, 0.05, C.metalDark, { y: 0.02, z: 3.05 });
    p.box(0.7, 0.28, 0.26, C.red, { x: 1.0, y: 0.07, z: 2.95 });
  }
  if (stage >= 5) {
    p.tex = 6;
    for (const z of [1.2, 2.2]) p.cyl(0.34, 0.5, 1.2, 0xc9c8c2, { x: 2.3, y: 0, z }, 20);
    p.tex = 1;
    p.cyl(0.1, 0.14, 3.4, 0xd8d4cc, { x: 2.6, y: 0, z: -1.7 }, 12);
    for (const h of [2.4, 2.9]) p.cyl(0.115, 0.115, 0.16, C.red, { x: 2.6, y: h, z: -1.7 }, 12);
    p.tex = 0;
  }
  if (stage >= 6) {
    for (let i = 0; i < 4; i++) p.box(0.3, 0.03, 0.55, 0x1f3d63, { x: 1.6 + i * 0.32, y: 0.97, z: -0.6, rx: -0.3 });
    p.box(1.0, 0.5, 0.6, 0x9ccbe0, { x: -1.0, y: 0, z: 2.6 });
    p.box(1.06, 0.05, 0.66, C.roofDark, { x: -1.0, y: 0.5, z: 2.6 });
    for (const x of [-1.5, -0.5]) p.box(0.06, 1.3, 0.06, C.yellow, { x, y: 0, z: 3.3 });
    p.box(1.1, 0.08, 0.1, C.yellow, { x: -1.0, y: 1.3, z: 3.3 });
  }
  if (stage >= 7) {
    p.tex = 6;
    p.box(0.8, 3.0, 0.8, 0xcfd6db, { x: -2.7, y: 0, z: -2.1 });
    for (let r = 0; r < 9; r++) p.box(0.84, 0.1, 0.84, 0x7fa8bf, { x: -2.7, y: 0.25 + r * 0.3, z: -2.1 });
    p.box(0.86, 0.16, 0.86, gc, { x: -2.7, y: 3.0, z: -2.1 });
    p.tex = 0;
    p.cyl(0.02, 0.025, 0.7, C.metal, { x: -2.7, y: 3.16, z: -2.1 }, 6);
    p.cyl(0.5, 0.5, 0.03, 0x4f86a8, { x: 2.2, y: 0, z: 2.9 }, 24);
    for (const [x, z] of [[-2.6, 0.6], [-2.5, 2.8], [1.4, 3.4], [2.9, 3.3], [2.9, 0.4]]) tree(x, z);
  }
  return p.build();
}

/** The main building's growth at a level: more across and a good deal more up. Past level 3 it keeps growing, more slowly. */
function growAt(level: number): { raw: [number, number]; other: [number, number] } {
  const known = LEVEL_GROW[level];
  if (known) return known;
  const n = level - 3;
  return { raw: [1.12 + 0.012 * n, 1.3 + 0.04 * n], other: [1.15 + 0.022 * n, 1.6 + 0.1 * n] };
}

/** A building as it looks at a level: the main building grown, with that level's extras around it. */
export function siteGeometryAt(kind: SiteKind, rawLevel: number, withDepot = false): THREE.BufferGeometry {
  // Ports and airports stop at level 3. Everything else has ten looks: level 3 is the full set, and each level after adds a stage.
  const def = SITE_DEFS[kind];
  // Level 0 is a town's building site: its Market or Supply Yard has not been built yet.
  if (rawLevel <= 0 && def.dock) return foundation(kind);
  const level = def.port || def.airport ? Math.min(3, rawLevel) : Math.min(10, rawLevel);
  const base = withDepot && kind === 'hub' ? depot() : siteGeometry(kind);
  const grow = level >= 2 ? growAt(level) : undefined;
  if (def.dock || def.station) return base;
  const sign = signGeometry(kind, level);
  if (def.produce) {
    const details = resourceDetails(kind, Math.min(3, level));
    const more = level >= 4 ? grandParts(kind, level) : null;
    const whole = mergeGeometries(more ? [base, details, more, sign] : [base, details, sign], false)!;
    base.dispose();
    details.dispose();
    more?.dispose();
    sign.dispose();
    whole.computeBoundingSphere();
    return whole;
  }
  if (def.port) {
    base.dispose();
    const quay = portGeometry(level);
    const whole = mergeGeometries([quay, sign], false)!;
    quay.dispose();
    sign.dispose();
    whole.computeBoundingSphere();
    return whole;
  }
  if (def.airport) {
    // An airport is rebuilt, not scaled, at each level: the runway stays and the terminals grow.
    base.dispose();
    const field = airportGeometry(level);
    const whole = mergeGeometries([field, sign], false)!;
    field.dispose();
    sign.dispose();
    whole.computeBoundingSphere();
    return whole;
  }
  if (!grow) {
    const plain = mergeGeometries([base, sign], false)!;
    base.dispose();
    sign.dispose();
    plain.computeBoundingSphere();
    return plain;
  }
  const [across, up] = def.produce ? grow.raw : grow.other;
  base.scale(across, up, across);
  const extra = levelParts(kind, Math.min(3, level));
  const more = level >= 4 ? grandParts(kind, level) : null;
  const out = mergeGeometries(more ? [base, extra, more, sign] : [base, extra, sign], false)!;
  sign.dispose();
  base.dispose();
  extra.dispose();
  more?.dispose();
  out.computeBoundingSphere();
  return out;
}


// ---- rail rolling stock ----
// A train is a string of separate units (a locomotive and its wagons), each its own model, so on a curve every unit
// turns on its own and the train bends round the track instead of swinging like a stick. Units face +Z.

/** Two wheel sets on a bogie frame, at z. */
function bogie(p: Parts, z: number, w = 0.3): void {
  p.box(w, 0.05, 0.3, 0x24262a, { y: 0.05, z });
  for (const dz of [-0.09, 0.09]) for (const s of [-1, 1]) p.cyl(0.065, 0.065, 0.04, 0x15171a, { x: s * (w / 2 - 0.01), y: 0.065, z: z + dz, rz: Math.PI / 2 }, 10);
}

/** A locomotive: long hood in front, cab behind, exhaust stack, headlights, a stripe along the flank. */
function locomotive(p: Parts, z: number, body: number, accent: number, scale = 1): void {
  const w = 0.36 * scale;
  bogie(p, z + 0.3);
  bogie(p, z - 0.3);
  p.box(w - 0.02, 0.06, 0.92, 0x2a2c30, { y: 0.1, z });
  // Hood (front) and cab (rear).
  p.box(w, 0.2, 0.52, body, { y: 0.16, z: z + 0.2 });
  p.box(w + 0.02, 0.04, 0.54, accent, { y: 0.28, z: z + 0.2 });
  p.box(w + 0.01, 0.34, 0.34, body, { y: 0.16, z: z - 0.28 });
  p.box(w + 0.03, 0.04, 0.38, 0x3a3d42, { y: 0.5, z: z - 0.28 });
  p.box(w + 0.02, 0.05, 0.92, accent, { y: 0.2, z });
  // Cab windows and the front glass.
  p.box(w + 0.02, 0.1, 0.18, 0xbcd6e6, { y: 0.34, z: z - 0.28 });
  p.box(w - 0.08, 0.1, 0.02, 0xbcd6e6, { y: 0.34, z: z - 0.1 });
  p.box(w - 0.06, 0.1, 0.02, 0xbcd6e6, { y: 0.34, z: z - 0.46 });
  // Stack, fan grille, lamps, a buffer beam at each end.
  p.cyl(0.04, 0.05, 0.12, 0x2b2d30, { y: 0.36, z: z + 0.3 }, 8);
  p.box(0.2, 0.02, 0.2, 0x4a4d52, { y: 0.36, z: z + 0.0 });
  for (const s of [-1, 1]) p.box(0.05, 0.05, 0.02, 0xfff0b8, { x: s * 0.1, y: 0.2, z: z + 0.465 });
  for (const e of [-1, 1]) p.box(w, 0.05, 0.04, 0x1d1f22, { y: 0.1, z: z + e * 0.47 });
}

type Wagon = 'box' | 'tank' | 'hopper' | 'flat' | 'open';

/** A freight wagon of one of five kinds, with its own paint. */
function wagon(p: Parts, z: number, kind: Wagon, color: number): void {
  const w = 0.36;
  bogie(p, z + 0.26, 0.3);
  bogie(p, z - 0.26, 0.3);
  p.box(w - 0.02, 0.05, 0.84, 0x2a2c30, { y: 0.1, z });
  // Couplings out to each neighbour.
  for (const e of [-1, 1]) p.box(0.04, 0.03, 0.1, 0x1d1f22, { y: 0.11, z: z + e * 0.45 });
  switch (kind) {
    case 'box':
      p.box(w, 0.3, 0.8, color, { y: 0.15, z });
      p.box(w + 0.02, 0.03, 0.82, 0x3a3d42, { y: 0.45, z });
      p.box(0.02, 0.22, 0.2, 0x2a2c30, { x: w / 2 + 0.01, y: 0.19, z });
      p.box(0.02, 0.22, 0.2, 0x2a2c30, { x: -w / 2 - 0.01, y: 0.19, z });
      break;
    case 'tank':
      p.cyl(0.17, 0.17, 0.78, color, { y: 0.28, z, rx: Math.PI / 2 }, 14);
      p.box(w - 0.1, 0.06, 0.7, 0x2a2c30, { y: 0.14, z });
      p.cyl(0.05, 0.05, 0.05, 0x4a4d52, { y: 0.44, z }, 8);
      break;
    case 'hopper':
      p.box(w, 0.2, 0.78, color, { y: 0.15, z });
      p.box(w - 0.04, 0.16, 0.34, color, { y: 0.35, z: z + 0.2 });
      p.box(w - 0.04, 0.16, 0.34, color, { y: 0.35, z: z - 0.2 });
      p.box(w - 0.1, 0.03, 0.3, 0x2a2c30, { y: 0.51, z: z + 0.2 });
      p.box(w - 0.1, 0.03, 0.3, 0x2a2c30, { y: 0.51, z: z - 0.2 });
      break;
    case 'flat':
      p.box(w, 0.04, 0.82, 0x6b5a44, { y: 0.15, z });
      for (let i = 0; i < 3; i++) p.cyl(0.07, 0.07, 0.78, [0x7a5a3a, 0x6b4c30, 0x8a6a44][i], { x: (i - 1) * 0.1, y: 0.25, z, rx: Math.PI / 2 }, 8);
      break;
    case 'open':
      p.box(w, 0.04, 0.82, 0x3a3d42, { y: 0.15, z });
      for (const e of [-1, 1]) p.box(w, 0.2, 0.04, color, { y: 0.15, z: z + e * 0.39 });
      for (const s of [-1, 1]) p.box(0.04, 0.2, 0.82, color, { x: s * (w / 2 - 0.02), y: 0.15, z });
      p.box(w - 0.06, 0.12, 0.7, 0x1f1f20, { y: 0.17, z });
      break;
  }
}

const WAGONS: [Wagon, number][] = [
  ['box', 0x8a4a32], ['tank', 0xc8ccd0], ['hopper', 0x5a6b7c], ['flat', 0x6b5a44], ['open', 0x7a6a3a], ['box', 0x4f6a52], ['tank', 0x8a3a30], ['hopper', 0x8a6a3a],
];

/**
 * The separate units of a train, front first: each has its own model centred on its own origin, \`z\` is where that
 * origin sits along the train (as in vehicleGeometry), and \`len\` its length for working out how it follows the track.
 */
export function trainUnits(kind: VehicleKind): { geo: THREE.BufferGeometry; z: number; len: number }[] {
  const heavy = kind === 'heavytrain';
  const out: { geo: THREE.BufferGeometry; z: number; len: number }[] = [];
  const make = (z: number, len: number, draw: (p: Parts) => void): void => {
    const p = new Parts();
    draw(p);
    out.push({ geo: p.build(), z, len });
  };
  make(heavy ? 2.4 : 0.8, 0.96, (p) => locomotive(p, 0, heavy ? 0x4a2a28 : 0x2f4a36, heavy ? 0xd7a21f : 0xe0c060, heavy ? 1.04 : 1));
  const cars = heavy ? 6 : 3;
  const first = heavy ? 1.45 : -0.1;
  const step = heavy ? 0.9 : 0.92;
  for (let i = 0; i < cars; i++) {
    const [k, c] = WAGONS[(i + (heavy ? 2 : 0)) % WAGONS.length];
    make(first - i * step, 0.88, (p) => wagon(p, 0, k, c));
  }
  return out;
}

/** All the units of a train in one model, for icons. */
function mergeUnits(units: { geo: THREE.BufferGeometry; z: number }[]): THREE.BufferGeometry {
  const geos = units.map((u) => u.geo.clone().translate(0, 0, u.z));
  const out = mergeGeometries(geos, false)!;
  out.computeBoundingSphere();
  return out;
}

/** Vehicles face +Z. Wheels are included. */
export function vehicleGeometry(kind: VehicleKind): THREE.BufferGeometry {
  const p = new Parts();
  switch (kind) {
    case 'boxtruck':
    case 'rig':
    case 'bigtruck':
    case 'convoy':
      return truckGeometry(kind);
    case 'heavytrain':
    case 'train':
      return mergeUnits(trainUnits(kind));
    case 'fishboat':
    case 'barge':
    case 'boat':
      return coasterGeometry();
    case 'freighter':
      return cargoShipGeometry();
    case 'containership':
      return containerShipGeometry();
    case 'jet':
      airliner(p, 0, 0, 0, 1.45, 0xb23a30, 4, false);
      break;
    case 'plane':
      airliner(p, 0, 0, 0, 1.0, 0x2f5f8a, 2, false);
      break;
  }
  return p.build();
}
