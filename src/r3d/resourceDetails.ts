import { SITE_DEFS, type SiteKind } from '../sim/defs';
import { HUMAN, STREET } from '../scale';
import { framedWindow, loadingBay } from './architecture';
import { Parts } from './parts';
import { addCropRows } from './vegetation';

const STEEL = 0x667273;
const TIMBER = 0x8a7351;
const DARK = 0x282d2b;
const CREAM = 0xc8c6b5;

function rail(p: Parts, x: number, z: number, length: number, metal = false): void {
  const color = metal ? STEEL : TIMBER;
  const n = Math.ceil(length / 0.22);
  for (let i = 0; i <= n; i++) p.box(0.014, 0.14, 0.014, color, { x: x - length / 2 + i * length / n, y: 0.035, z, t: metal ? 5 : 2 });
  for (const y of [0.09, 0.15]) p.box(length, 0.012, 0.012, color, { x, y, z, t: metal ? 5 : 2 });
}

function ladder(p: Parts, x: number, z: number, height: number, y = 0.04): void {
  for (const dx of [-0.025, 0.025]) p.box(0.008, height, 0.008, STEEL, { x: x + dx, y, z, t: 5 });
  for (let h = 0.03; h < height; h += 0.03) p.box(0.06, 0.006, 0.008, STEEL, { x, y: y + h, z, t: 5 });
}

function pallet(p: Parts, x: number, z: number, color: number, wrapped = false): void {
  for (const dx of [-0.045, 0.045]) p.box(0.02, 0.012, 0.1, TIMBER, { x: x + dx, y: 0.035, z, t: 2 });
  for (let i = 0; i < 5; i++) p.box(0.12, 0.006, 0.015, TIMBER, { x, y: 0.047, z: z - 0.04 + i * 0.02, t: 2 });
  p.box(0.11, 0.09, 0.095, color, { x, y: 0.053, z, t: wrapped ? 0 : 2 });
  for (const dx of [-0.035, 0.035]) p.box(0.008, 0.092, 0.098, DARK, { x: x + dx, y: 0.053, z });
}

function shelter(p: Parts, x: number, z: number, width: number, color: number): void {
  const height = 0.36;
  for (const dx of [-width / 2, 0, width / 2]) for (const dz of [-0.12, 0.12]) {
    p.box(0.018, height, 0.018, STEEL, { x: x + dx, y: 0.035, z: z + dz, t: 5 });
  }
  p.gable(width + 0.06, 0.09, 0.32, color, { x, y: height + 0.035, z, t: 5 });
  p.box(width, 0.025, 0.022, STEEL, { x, y: height, z: z + 0.12, t: 5 });
}

function tractor(p: Parts, x: number, z: number): void {
  p.box(0.16, 0.085, 0.35, 0x526846, { x, y: 0.09, z, t: 5 });
  p.box(0.14, 0.07, 0.17, 0x61794e, { x, y: 0.175, z: z + 0.09, t: 5 });
  p.box(0.13, 0.115, 0.14, 0x476069, { x, y: 0.19, z: z - 0.075, t: 8 });
  p.box(0.16, 0.015, 0.17, CREAM, { x, y: 0.305, z: z - 0.075, t: 5 });
  for (const side of [-1, 1]) for (const front of [false, true]) {
    const radius = front ? 0.047 : 0.072;
    const wz = z + (front ? 0.105 : -0.1);
    p.cyl(radius, radius, 0.042, DARK, { x: x + side * 0.095, y: 0.035 + radius, z: wz, rz: side * Math.PI / 2 }, 16);
    p.cyl(radius * 0.52, radius * 0.52, 0.045, 0xb5b3a4, { x: x + side * 0.095, y: 0.035 + radius, z: wz, rz: side * Math.PI / 2 }, 12);
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      p.box(0.046, 0.012, 0.025, 0x3a3f37, { x: x + side * 0.12, y: 0.035 + radius + Math.cos(angle) * radius, z: wz + Math.sin(angle) * radius, rx: -angle });
    }
  }
  p.box(0.11, 0.055, 0.008, DARK, { x, y: 0.185, z: z + 0.18 });
  for (const dx of [-0.052, 0.052]) p.box(0.025, 0.022, 0.01, 0xe8dcad, { x: x + dx, y: 0.235, z: z + 0.18, t: 9 });
  p.cyl(0.007, 0.007, 0.15, STEEL, { x: x + 0.065, y: 0.21, z: z + 0.035, t: 5 }, 6);
}

function tank(p: Parts, x: number, z: number, height: number, radius: number, color: number): void {
  p.cyl(radius, radius, height, color, { x, y: 0.04, z, t: 5 }, 20);
  p.dome(radius, STEEL, { x, y: height + 0.04, z, t: 5 });
  for (let y = 0.12; y < height; y += 0.12) p.cyl(radius + 0.003, radius + 0.003, 0.008, STEEL, { x, y, z, t: 5 }, 20);
  ladder(p, x, z + radius + 0.008, height);
}

/** Fixed-size additions: upgrades add purpose-built equipment rather than enlarging doors, animals or vehicles. */
export function resourceDetails(kind: SiteKind, level: number) {
  const p = new Parts();
  const node = SITE_DEFS[kind].node;
  const agricultural = node === 'farmland' || node === 'pasture' || node === 'orchard' || node === 'coffee' || node === 'mango';
  p.slab(3.16, 3.16, agricultural ? 0x686c4c : 0x70695b, { y: -0.04 });
  rail(p, 0.8, 1.5, 1.2, !agricultural);
  rail(p, -0.95, 1.5, 0.9, !agricultural);
  // Keep the front-centre entrance clear for loading.
  p.box(0.7, 0.012, 0.28, 0x8e8878, { y: 0.025, z: 1.43, t: 6 });
  if (kind === 'farm' || kind === 'ranch') {
    const ranch = kind === 'ranch';
    const x = ranch ? 0.45 : 0.35, z = ranch ? -0.7 : -0.55;
    ladder(p, x, z + 0.225, ranch ? 1.06 : 1.26);
    const radius = ranch ? 0.204 : 0.224;
    for (let y = 0.14; y < (ranch ? 1.1 : 1.3); y += 0.12) p.cyl(radius, radius, 0.008, STEEL, { x, y, z, t: 5 });
    const facade = ranch ? -0.185 : 0.17;
    for (const dx of [-0.95, -0.05]) {
      framedWindow(p, dx, 0.36, facade, 0.12, 0.12);
      p.box(0.012, 0.45, 0.012, STEEL, { x: dx, y: 0.03, z: facade, t: 5 });
    }
    if (ranch) {
      p.box(0.11, 0.065, 0.55, 0x94978d, { x: -0.95, y: 0.035, z: 0.53, t: 6 });
      p.box(0.085, 0.012, 0.51, 0x50686b, { x: -0.95, y: 0.095, z: 0.53 });
      p.box(0.18, 0.04, 0.5, 0x9b905e, { x: 1.22, y: 0.04, z: -0.2 });
      tank(p, 1.15, -0.75, 0.28, 0.115, 0xc0c7c6);
      p.box(0.65, 0.015, 0.015, STEEL, { x: 0.85, y: 0.12, z: -0.75, t: 5 });
    } else {
      addCropRows(p, 1.15, 0.68, 0.4, 0.86, 8, 5);
      for (let i = 0; i < 5; i++) {
        p.box(0.48, 0.015, 0.04, 0x847340, { x: 0.95, y: 0.015, z: -0.1 + i * 0.06 });
        for (let j = 0; j < 7; j++) p.box(0.007, 0.085, 0.007, 0xb3a060, { x: 0.74 + j * 0.067, y: 0.03, z: -0.1 + i * 0.06 });
      }
    }
    if (level >= 2) {
      shelter(p, -0.7, -1.3, 1.2, ranch ? 0xa9ada0 : 0x626c66);
      for (let i = 0; i < 5; i++) pallet(p, -1.15 + i * 0.22, -1.3, ranch ? 0xb9bca9 : 0xb3a060, true);
    }
    if (level >= 3) {
      tractor(p, 0.75, 1.23);
      if (ranch) tank(p, 1.15, -1.15, 0.4, 0.13, 0xc0c7c6);
      else tank(p, 1.22, -1.13, 0.85, 0.18, 0xb5b9af);
    }
  } else if (kind === 'forestry') {
    for (let i = 0; i < 7; i++) p.box(0.012, 0.5, 0.018, 0xa38965, { x: -0.98 + i * 0.17, y: 0.05, z: 0.16, t: 2 });
    for (const z of [0.45, 0.66]) {
      p.cyl(0.068, 0.068, 0.008, 0x735335, { x: 0.557, y: 0.14, z, rz: Math.PI / 2 }, 12);
      p.cyl(0.039, 0.039, 0.01, 0xbfa57b, { x: 0.565, y: 0.14, z, rz: Math.PI / 2 }, 12);
    }
    for (let i = 0; i < 4; i++) pallet(p, -1.15 + i * 0.22, 1.18, 0xbaa078);
    if (level >= 2) shelter(p, 0.15, -1.32, 1.4, 0x626962);
    if (level >= 3) {
      for (let i = 0; i < 6; i++) p.box(0.9, 0.035, 0.22, i % 2 ? 0xb19670 : 0x94794f, { x: 0.15, y: 0.035 + i * 0.038, z: -1.32, t: 2 });
      tractor(p, 0.85, 1.19);
    }
  } else if (agricultural) {
    const coffee = kind === 'coffeefarm';
    const cotton = kind === 'cottonfarm';
    const crop = cotton ? 0xd8d5c5 : coffee ? 0x735038 : kind === 'mangogrove' ? 0xc89745 : 0xa8694e;
    for (let i = 0; i < 3; i++) {
      p.box(2.3, 0.009, 0.009, DARK, { y: 0.035, z: -0.7 + i * 0.55 });
      for (let j = 0; j < 6; j++) p.cyl(0.006, 0.006, 0.035, STEEL, { x: -1 + j * 0.38, y: 0.03, z: -0.7 + i * 0.55 }, 5);
    }
    for (let i = 0; i < 5; i++) pallet(p, -1.1 + i * 0.22, 1.24, crop, cotton);
    if (level >= 2) {
      shelter(p, -0.3, -1.33, 1.8, coffee ? 0x8d7961 : 0x6c776d);
      for (let i = 0; i < 7; i++) pallet(p, -1.02 + i * 0.23, -1.33, crop, cotton);
    }
    if (level >= 3) {
      tank(p, 1.34, 0.18, 0.36, 0.13, 0x627d76);
      tractor(p, 0.85, 1.3);
    }
  } else {
    const oil = kind === 'oilwell';
    const mine = kind === 'coalmine' || kind === 'oremine';
    const clay = kind === 'claypit';
    const sand = kind === 'sandpit';
    const rock = kind === 'coalmine' ? 0x383936 : kind === 'oremine' ? 0x856354 : clay ? 0xa27b60 : sand ? 0xc3b58b : 0x96958b;
    if (!oil) {
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 7; i++) p.box(0.24, 0.07, 0.14, i % 2 ? rock : 0x7d7a6e, { x: -0.85 + i * 0.27, y: 0.035 + row * 0.065, z: -1.3 - row * 0.055, t: 6 });
      }
      const ex = clay ? -0.5 : -0.55;
      if (kind === 'quarry' || clay) {
        framedWindow(p, ex, 0.32, 0.36, 0.24, 0.14);
        for (const z of [-0.025, 0.405]) {
          p.box(0.56, 0.12, 0.075, DARK, { x: ex, y: 0.05, z });
          for (let i = 0; i < 12; i++) p.box(0.018, 0.125, 0.082, STEEL, { x: ex - 0.25 + i * 0.045, y: 0.05, z, t: 5 });
        }
      }
      if (mine) {
        ladder(p, 0.22, 0.27, 1.3);
        for (const z of [-0.2, 0.2]) for (let i = 0; i < 4; i++) p.box(0.6 - i * 0.09, 0.025, 0.025, STEEL, { y: 0.23 + i * 0.29, z, t: 5 });
      }
      if (level >= 2) {
        p.box(0.75, 0.14, 0.28, STEEL, { x: 0.65, y: 0.24, z: 1.24, t: 5 });
        for (let i = 0; i < 12; i++) p.box(0.04, 0.012, 0.24, DARK, { x: 0.31 + i * 0.061, y: 0.38, z: 1.24 });
        for (const x of [0.35, 0.95]) p.box(0.035, 0.23, 0.18, STEEL, { x, y: 0.035, z: 1.24, t: 5 });
        rail(p, 0.65, 1.43, 0.75, true);
      }
      if (level >= 3) {
        shelter(p, -0.85, 1.23, 0.85, 0x66736e);
        for (let i = 0; i < 3; i++) pallet(p, -1.12 + i * 0.26, 1.23, rock);
        tank(p, 1.3, -0.63, 0.42, 0.14, sand ? 0x8faaa6 : STEEL);
      }
    } else {
      for (let i = 0; i < 3; i++) ladder(p, -0.8 + i * 0.45, 1.025, 0.4);
      rail(p, -0.35, 1.32, 1.6, true);
      for (const z of [-0.8, -1.0]) p.box(1.4, 0.02, 0.02, STEEL, { x: -0.4, y: 0.12, z, t: 5 });
      for (let i = 0; i < level; i++) {
        p.cyl(0.035, 0.035, 0.015, 0xa76c50, { x: -0.9 + i * 0.35, y: 0.18, z: -0.8 }, 12);
        p.cyl(0.008, 0.008, 0.07, STEEL, { x: -0.9 + i * 0.35, y: 0.11, z: -0.8, t: 5 }, 6);
      }
      if (level >= 2) tank(p, -1.28, -0.4, 0.6, 0.16, CREAM);
      if (level >= 3) {
        p.box(0.68, 0.3, 0.3, 0xb6b5a6, { x: -0.6, y: 0.035, z: -1.3, t: 5 });
        loadingBay(p, -0.6, 0.04, -1.145, HUMAN.doorWidth, HUMAN.doorHeight);
      }
    }
  }
  if (level >= 2) {
    p.cyl(0.009, 0.014, STREET.lampHeight, STEEL, { x: 1.48, y: 0.035, z: 1.45, t: 5 }, 8);
    p.box(0.07, 0.014, 0.04, 0xe8d6ac, { x: 1.46, y: STREET.lampHeight + 0.035, z: 1.45, t: 9 });
  }
  return p.build();
}
