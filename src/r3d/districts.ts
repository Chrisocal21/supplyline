// Landmarks for town districts. Each district a town builds puts a small building group on one of the tiles around its
// streets, and it grows taller or busier with the district's level, so a town visibly fills in as it is developed.
// Everything fits inside one tile (about 1.7 units square) so it can sit in any of the slots without touching a street.
import type { DistrictId } from '../sim/defs';
import type { Parts } from './parts';

const GLASS = 0x6f93ad;
const AWN = [0xb94a40, 0xe6e2d6, 0x3f7a55, 0xd7a21f];

export function districtLandmark(p: Parts, id: DistrictId, level: number, cx: number, cz: number, yaw: number): void {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const at = (lx: number, lz: number): [number, number] => [cx + lx * c + lz * s, cz - lx * s + lz * c];
  const L = Math.max(1, Math.min(3, level));
  const box = (lx: number, lz: number, w: number, h: number, d: number, color: number, y = 0.04, tex = 0): void => {
    const [x, z] = at(lx, lz);
    p.tex = tex;
    p.box(w, h, d, color, { x, y, z, ry: yaw });
  };
  const gable = (lx: number, lz: number, w: number, h: number, d: number, color: number, y: number, along = true): void => {
    const [x, z] = at(lx, lz);
    p.gable(w, h, d, color, { x, y, z, ry: yaw + (along ? 0 : Math.PI / 2) });
  };
  const cyl = (lx: number, lz: number, r: number, h: number, color: number, y = 0.04, tex = 0, seg = 14): void => {
    const [x, z] = at(lx, lz);
    p.tex = tex;
    p.cyl(r, r, h, color, { x, y, z }, seg);
  };
  const cone = (lx: number, lz: number, r: number, h: number, color: number, y: number): void => {
    const [x, z] = at(lx, lz);
    p.cone(r, h, color, { x, y, z }, 12);
  };
  const dome = (lx: number, lz: number, r: number, color: number, y: number): void => {
    const [x, z] = at(lx, lz);
    p.dome(r, color, { x, y, z });
  };
  p.slab(1.8, 1.8, 0x9a968c, { x: cx, z: cz, ry: yaw });
  const front = 0.82;
  const win = (lx: number, y: number, w: number, h: number): void => box(lx, front, w, h, 0.02, GLASS, y);

  switch (id) {
    case 'farmersmarket': {
      const n = 1 + L;
      for (let i = 0; i < n; i++) {
        const lx = -0.62 + i * (1.24 / Math.max(1, n - 1));
        box(lx, 0.35, 0.34, 0.24, 0.5, 0xc7a068);
        box(lx, 0.35, 0.4, 0.04, 0.58, AWN[i % AWN.length], 0.62);
        for (const k of [-0.1, 0.1]) box(lx + k, 0.35, 0.1, 0.1, 0.1, [0xc0452f, 0xe0a030, 0x6fa84a][(i + (k > 0 ? 1 : 0)) % 3], 0.28);
      }
      box(0, -0.55, 1.5, 0.5, 0.5, 0xc9bfa8, 0.04, 3);
      gable(0, -0.55, 1.62, 0.26, 0.6, 0x6c3a33, 0.54);
      break;
    }
    case 'restaurants': {
      box(0, -0.35, 1.5, 0.5 * (0.8 + 0.2 * L), 0.8, 0xe4d8be, 0.04, 3);
      box(0, front - 0.45, 1.6, 0.05, 0.14, 0xb94a40, 0.3 + 0.1 * L);
      win(-0.4, 0.14, 0.4, 0.22);
      win(0.4, 0.14, 0.4, 0.22);
      gable(0, -0.35, 1.62, 0.26, 0.92, 0x6c3a33, 0.54 * (0.8 + 0.2 * L));
      for (let i = 0; i < 2 + L; i++) {
        const lx = -0.6 + i * (1.2 / (1 + L));
        cyl(lx, 0.55, 0.02, 0.34, 0x555a60, 0.04, 0, 6);
        cone(lx, 0.55, 0.2, 0.1, AWN[i % AWN.length], 0.36);
      }
      break;
    }
    case 'heating': {
      box(-0.35, -0.1, 0.9, 0.44, 0.8, 0x7a8590, 0.04, 5);
      gable(-0.35, -0.1, 1.0, 0.2, 0.9, 0x3e4650, 0.48);
      for (let i = 0; i < L; i++) cyl(0.5, -0.5 + i * 0.5, 0.2, 0.9 + 0.1 * L, 0xc7c9cb, 0.04, 5);
      cone(0.45, 0.55, 0.3, 0.3, 0x24272b, 0.04);
      box(0.1, 0.62, 0.4, 0.16, 0.2, 0x9a7448);
      break;
    }
    case 'hardware': {
      box(-0.1, -0.3, 1.3, 0.5, 0.7, 0xb0583f, 0.04, 1);
      box(-0.1, front - 0.5, 1.2, 0.12, 0.04, 0xe6e2d6, 0.44);
      win(-0.1, 0.14, 0.7, 0.26);
      gable(-0.1, -0.3, 1.42, 0.24, 0.84, 0x4f545c, 0.54);
      for (let i = 0; i < 1 + L; i++) box(0.62, 0.3 + i * 0.28, 0.5, 0.12, 0.2, 0xc7a068, 0.04 + 0.12 * (i % 2));
      for (let i = 0; i < L; i++) box(-0.55 + i * 0.3, 0.6, 0.26, 0.14, 0.2, 0xa4523f);
      break;
    }
    case 'warehouse': {
      const len = 1.1 + 0.2 * L;
      box(0, -0.2, 1.6, 0.5 + 0.08 * L, len, 0xb9b6ad, 0.04, 5);
      gable(0, -0.2, 1.7, 0.2, len + 0.1, 0x6e6e6a, 0.54 + 0.08 * L);
      for (let i = 0; i < 1 + L; i++) box(-0.5 + i * 0.5, -0.2 + len / 2, 0.36, 0.34, 0.02, 0x3a3d40, 0.04);
      break;
    }
    case 'builders': {
      for (const [lx, lz] of [[-0.55, -0.4], [-0.15, -0.4], [0.25, -0.4]]) box(lx, lz, 0.36, 0.22 + 0.06 * L, 0.3, 0xa4523f, 0.04, 1);
      box(0.6, -0.4, 0.3, 0.4, 0.3, 0xb2b2ae, 0.04, 6);
      for (const lx of [-0.7, 0.6]) box(lx, 0.45, 0.06, 0.9 + 0.1 * L, 0.06, 0xd7a21f);
      box(-0.05, 0.45, 1.4, 0.06, 0.08, 0xd7a21f, 0.9 + 0.1 * L);
      box(-0.4, 0.55, 0.4, 0.1, 0.3, 0x9fd0e0);
      break;
    }
    case 'furniture': {
      box(0, -0.2, 1.5, 0.55 * (0.8 + 0.2 * L), 0.9, 0xe9dcc0, 0.04, 3);
      box(0, front - 0.2, 1.3, 0.34, 0.02, GLASS, 0.1);
      box(0, front - 0.1, 1.5, 0.05, 0.3, 0x8b5a3a, 0.5);
      box(-0.3, 0.55, 0.22, 0.18, 0.2, 0x8b5a3a);
      box(0.1, 0.58, 0.3, 0.1, 0.18, 0xc7a068);
      gable(0, -0.2, 1.62, 0.22, 1.0, 0x6b4a38, 0.5 * (0.8 + 0.2 * L) + 0.04);
      break;
    }
    case 'fashion': {
      const cols = [0xe6b8c8, 0xb8d4e6, 0xe6dcb0, 0xc8e0c0];
      const n = 2 + (L > 1 ? 1 : 0) + (L > 2 ? 1 : 0);
      const w = 1.5 / n;
      for (let i = 0; i < n; i++) {
        const lx = -0.75 + w * (i + 0.5);
        const h = (0.55 + 0.18 * L) * (0.9 + 0.1 * (i % 2));
        box(lx, -0.2, w - 0.04, h, 0.9, cols[i % cols.length], 0.04, 3);
        box(lx, front - 0.2, w - 0.1, 0.05, 0.26, AWN[(i + 1) % AWN.length], 0.34);
        box(lx, front - 0.19, w - 0.14, 0.22, 0.02, GLASS, 0.08);
      }
      break;
    }
    case 'bookshops': {
      box(0, -0.2, 1.4, 0.7 * (0.8 + 0.2 * L), 0.9, 0xd8d2c4, 0.04, 6);
      for (let i = 0; i < 4; i++) cyl(-0.54 + i * 0.36, front - 0.12, 0.05, 0.5, 0xeae6da, 0.04, 6, 8);
      box(0, front - 0.12, 1.4, 0.06, 0.2, 0xcfc9ba, 0.54, 6);
      box(0, front - 0.45, 1.2, 0.04, 0.26, 0xcfc9ba, 0.04, 6);
      dome(0, -0.2, 0.34, 0x4f7f6f, 0.04 + 0.7 * (0.8 + 0.2 * L));
      break;
    }
    case 'terminal': {
      const cols = [0xcf7a2b, 0x2f5f8a, 0x3f7a55, 0x9a3a32, 0xd9d6cc];
      for (let r = 0; r < 1 + (L > 1 ? 1 : 0) + (L > 2 ? 1 : 0); r++) for (let k = 0; k < 3; k++) box(-0.5 + k * 0.5, -0.4, 0.44, 0.2, 0.22, cols[(r + k) % cols.length], 0.04 + r * 0.2, 5);
      for (const lx of [-0.8, 0.8]) box(lx, 0.4, 0.06, 0.9, 0.06, 0x2f5f8a);
      box(0, 0.4, 1.7, 0.07, 0.1, 0x2f5f8a, 0.9);
      box(0.2, 0.4, 0.22, 0.12, 0.2, 0xd7a21f, 0.78);
      break;
    }
    case 'university': {
      box(0, -0.25, 1.6, 0.5, 0.7, 0xc9b79c, 0.04, 1);
      gable(0, -0.25, 1.7, 0.2, 0.8, 0x4f545c, 0.54);
      box(0, -0.25, 0.4, 0.5 + 0.35 * L, 0.4, 0xd8cfc0, 0.04, 6);
      cone(0, -0.25, 0.3, 0.3, 0x4f7f6f, 0.04 + 0.5 + 0.35 * L);
      box(0, 0.45, 1.4, 0.04, 0.5, 0x6b8a4a, 0.04);
      win(-0.5, 0.18, 0.3, 0.2);
      win(0.5, 0.18, 0.3, 0.2);
      break;
    }
    case 'foundry': {
      box(-0.25, -0.1, 1.1, 0.5, 0.9, 0x5a5f66, 0.04, 5);
      gable(-0.25, -0.1, 1.2, 0.2, 1.0, 0x30343a, 0.54);
      for (let i = 0; i < 1 + L; i++) {
        cyl(0.6, -0.55 + i * 0.5, 0.1, 1.0 + 0.2 * i, 0x8a5646, 0.04, 1, 10);
        cyl(0.6, -0.55 + i * 0.5, 0.11, 0.05, 0xe08a3a, 0.04 + 1.0 + 0.2 * i, 0, 10);
      }
      box(-0.25, front - 0.4, 1.0, 0.06, 0.04, 0xe08a3a, 0.3);
      break;
    }
    case 'hotels': {
      box(0, -0.1, 1.6, 0.35, 1.2, 0xd8cfc0, 0.04, 6);
      box(0, -0.1, 0.9, 0.9 + 0.7 * L, 0.7, 0x9fb4c8, 0.39, 7);
      box(0, -0.1, 0.96, 0.06, 0.76, 0x6a6e73, 0.39 + 0.9 + 0.7 * L, 6);
      box(0, front - 0.15, 1.2, 0.05, 0.5, 0xb94a40, 0.3);
      break;
    }
    case 'foodhall': {
      box(0, -0.2, 1.6, 0.45, 1.1, 0xe4d8be, 0.04, 3);
      const [x, z] = at(0, -0.2);
      p.cyl(0.5, 0.5, 1.6, 0x7fa8b8, { x, y: 0.55, z, rz: Math.PI / 2, ry: yaw }, 14);
      for (let i = 0; i < 4; i++) box(-0.6 + i * 0.4, 0.6, 0.3, 0.2, 0.3, AWN[i % AWN.length], 0.04);
      cyl(0.78, 0.55, 0.03, 0.9, 0x555a60, 0.04, 0, 6);
      box(0.9, 0.55, 0.3, 0.2, 0.02, 0x3f7a55, 0.7);
      break;
    }
    case 'heavyexchange': {
      box(0, -0.1, 1.5, 0.5, 1.0, 0x8a949f, 0.04, 6);
      box(0, -0.1, 0.8, 1.7, 0.8, 0x4e5a68, 0.54, 7);
      for (let i = 0; i < 5; i++) cyl(-0.6 + i * 0.3, front - 0.1, 0.05, 0.5, 0xb8b5ac, 0.04, 6, 8);
      cyl(0, -0.1, 0.03, 0.5, 0x555a60, 2.24, 0, 6);
      box(0, -0.1, 0.3, 0.12, 0.3, 0xd08a2e, 2.0);
      break;
    }
    case 'intlterminal': {
      box(0, 0.1, 1.7, 0.4, 0.9, 0xd8dde0, 0.04, 6);
      box(0, 0.1, 1.5, 0.05, 0.8, 0x4f7f96, 0.44);
      cyl(0.6, -0.55, 0.12, 1.3, 0xe9ebec, 0.04, 6);
      box(0.6, -0.55, 0.4, 0.2, 0.4, 0x6f93ad, 1.34, 7);
      for (let i = 0; i < 6; i++) box(-0.8 + i * 0.32, -0.6, 0.18, 0.02, 0.5, 0xe6e2d6, 0.07);
      break;
    }
    case 'grandplaza': {
      box(0, -0.5, 1.5, 0.8, 0.5, 0xe4d8be, 0.04, 6);
      for (let i = 0; i < 5; i++) cyl(-0.6 + i * 0.3, -0.2, 0.05, 0.8, 0xeae6da, 0.04, 6, 8);
      box(0, -0.2, 1.5, 0.08, 0.14, 0xcfc9ba, 0.84, 6);
      cyl(0, 0.4, 0.4, 0.06, 0x8a8f94, 0.04, 6);
      cyl(0, 0.4, 0.3, 0.05, 0x6fa8c8, 0.1, 0, 14);
      cyl(0, 0.4, 0.05, 0.5, 0xd8d2c4, 0.04, 0, 8);
      for (const lx of [-0.7, 0.7]) box(lx, 0.4, 0.08, 0.9, 0.08, 0xd7a21f);
      box(0, 0.4, 1.5, 0.08, 0.08, 0xd7a21f, 0.9);
      break;
    }
  }
  p.tex = 0;
}
