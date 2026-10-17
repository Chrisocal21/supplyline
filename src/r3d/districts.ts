// Landmarks for town districts. Each district a town builds puts a small building group on one of the tiles around its
// streets, and it grows taller or busier with the district's level, so a town visibly fills in as it is developed.
// Everything fits inside one tile (about 1.7 units square) so it can sit in any of the slots without touching a street.
import type { DistrictId } from '../sim/defs';
import type { Parts } from './parts';

const GLASS = 0x6f93ad;
const AWN = [0xb94a40, 0xe6e2d6, 0x3f7a55, 0xd7a21f];

/** What a district's lot sits among, which decides how an amphitheatre is built: in the hills, on the water, in the woods, or plain. */
export type Setting = 'plain' | 'rock' | 'water' | 'forest';

export function districtLandmark(p: Parts, id: DistrictId, level: number, cx: number, cz: number, yaw: number, setting: Setting = 'plain'): void {
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
  /** A solid of any outline, given in the lot's own frame. */
  const prism = (pts: [number, number][], y: number, h: number, color: number, tex = 0, holes: [number, number][][] = []): void => {
    p.tex = tex;
    p.prism(pts.map(([lx, lz]) => at(lx, lz)), h, color, { y }, holes.map((hh) => hh.map(([lx, lz]) => at(lx, lz))));
  };
  /** A rounded rectangle, centred on (mx, mz), as an outline. */
  const rrect = (mx: number, mz: number, w: number, d: number, r: number, n = 5): [number, number][] => {
    const pts: [number, number][] = [];
    const corners: [number, number, number][] = [[1, 1, 0], [-1, 1, Math.PI / 2], [-1, -1, Math.PI], [1, -1, Math.PI * 1.5]];
    for (const [sx, sz, a0] of corners) {
      for (let k = 0; k <= n; k++) {
        const a = a0 + (k / n) * (Math.PI / 2);
        pts.push([mx + sx * (w / 2 - r) + Math.cos(a) * r, mz + sz * (d / 2 - r) + Math.sin(a) * r]);
      }
    }
    return pts;
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
    case 'community': {
      box(0, -0.25, 1.3 + 0.1 * L, 0.5, 0.8, 0xd9c9a3, 0.04, 3);
      gable(0, -0.25, 1.42 + 0.1 * L, 0.3, 0.92, 0x7a4a3c, 0.54);
      box(0, front - 0.42, 0.3, 0.3, 0.06, 0x5a3b2a, 0.04);
      win(-0.45, 0.14, 0.3, 0.22);
      win(0.45, 0.14, 0.3, 0.22);
      if (L >= 2) {
        box(-0.66, 0.3, 0.4, 0.32, 0.5, 0xd9c9a3, 0.04, 3);
        gable(-0.66, 0.3, 0.5, 0.2, 0.6, 0x7a4a3c, 0.36);
      }
      if (L >= 3) box(0.5, 0.45, 0.6, 0.04, 0.4, 0x8fae6a, 0.04);
      cyl(0.72, 0.62, 0.02, 1.0, 0xcfd2d6, 0.04, 0, 6);
      box(0.82, 0.62, 0.22, 0.14, 0.02, 0xb94a40, 0.84);
      break;
    }
    case 'amphitheatre': {
      // The setting decides the stage: a bowl between red sandstone monoliths in the hills, a stage on a platform over the
      // water at the shore, a timber stage in a ring of pines in the woods, and a plain half ring of seating elsewhere.
      const tiers = 2 + L;
      const seats = (cz: number, r0: number, dr: number, count: number, colors: number[], h0: number, dh: number, spread = 0.25): void => {
        for (let t = 0; t < count; t++) {
          const r = r0 + t * dr;
          const n = 6 + t * 2;
          for (let i = 0; i < n; i++) {
            const a = spread + (i / (n - 1)) * (Math.PI - spread * 2);
            const [x, z] = at(Math.cos(a) * r * 1.3, cz - Math.sin(a) * r);
            p.tex = 6;
            p.box(0.2, h0 + t * dh, 0.14, colors[t % colors.length], { x, y: 0.04, z, ry: yaw + a - Math.PI / 2 });
          }
        }
      };
      const monolith = (lx: number, lz: number, w: number, d: number, h: number, lean: number): void => {
        const strata = [0xa14a32, 0xb4553a, 0xc2603f, 0xad4f36, 0xbd5b3c];
        const layers = 5;
        for (let k = 0; k < layers; k++) {
          const f = 1 - k * 0.1;
          const j = (k % 2 ? 1 : -1) * 0.02;
          prism(
            [[lx - (w / 2) * f + j + lean * k * 0.03, lz - (d / 2) * f], [lx + (w / 2) * f + j + lean * k * 0.03, lz - (d / 2) * f * 0.9], [lx + (w / 2) * f * 0.9 + lean * k * 0.03, lz + (d / 2) * f], [lx - (w / 2) * f * 0.95 + lean * k * 0.03, lz + (d / 2) * f * 0.9]],
            0.04 + (h / layers) * k,
            h / layers + 0.01,
            strata[k % strata.length],
            0,
          );
        }
      };
      if (setting === 'rock') {
        prism([[-0.55, -0.62], [0.55, -0.62], [0.72, -0.9], [-0.72, -0.9]], 0.04, 0.5 + 0.06 * L, 0x9a4a34, 0);
        prism([[-0.4, -0.62], [0.4, -0.62], [0.5, -0.8], [-0.5, -0.8]], 0.5 + 0.06 * L, 0.18, 0xa85a3c, 0);
        monolith(-0.72, -0.05, 0.42, 0.6, 0.95 + 0.1 * L, 1);
        monolith(0.72, -0.12, 0.4, 0.56, 0.85 + 0.1 * L, -1);
        seats(0.25, 0.3, 0.1, tiers + 1, [0xd6c2a0, 0xc9b48e], 0.05, 0.075, 0.45);
        box(0, 0.5, 0.9, 0.05, 0.36, 0x8a5e3f, 0.04, 1);
        box(0, 0.36, 0.8, 0.3, 0.04, 0x7a2f26, 0.09);
        for (const lx of [-0.4, 0.4]) cyl(lx, 0.62, 0.03, 0.2, 0x2a2e33, 0.09, 0, 6);
      } else if (setting === 'water') {
        prism(rrect(0, 0.5, 1.62, 0.7, 0.24), 0.03, 0.02, 0x3f95c9, 0);
        prism(rrect(0, 0.5, 1.56, 0.64, 0.22), 0.05, 0.004, 0x5fb4e0, 0);
        seats(-0.08, 0.36, 0.12, tiers, [0xd8cfc0, 0xb9b09a], 0.05, 0.07, 0.25);
        // The stage stands on piles out over the water, with a white sail canopy.
        prism(rrect(0, 0.5, 0.76, 0.34, 0.06), 0.09, 0.035, 0x8a5e3f, 1);
        for (const lx of [-0.3, 0, 0.3]) for (const lz of [0.36, 0.64]) cyl(lx, lz, 0.025, 0.14, 0x4a3b2a, 0.0, 0, 6);
        for (const lx of [-0.32, 0.32]) cyl(lx, 0.36, 0.014, 0.4, 0xdcdcd6, 0.12, 0, 6);
        box(0, 0.38, 0.8, 0.025, 0.04, 0xf0f1f2, 0.52);
        p.tex = 0;
        for (const sx of [-1, 1]) {
          const [x, z] = at(sx * 0.2, 0.42);
          p.box(0.4, 0.025, 0.3, 0xf6f4ee, { x, y: 0.4, z, ry: yaw, rz: sx * 0.35 });
        }
        for (const [lx, lz] of [[-0.62, 0.68], [0.64, 0.72]]) {
          box(lx, lz, 0.22, 0.05, 0.1, 0xf1f1ec, 0.05);
          box(lx, lz, 0.02, 0.2, 0.02, 0xdcdcd6, 0.1);
          box(lx, lz, 0.012, 0.16, 0.1, 0xf6f4ee, 0.14);
        }
        for (let i = 0; i < 6; i++) cone(-0.75 + i * 0.3, -0.7, 0.035, 0.22, 0x7a8f4a, 0.04);
      } else if (setting === 'forest') {
        for (let i = 0; i < 12; i++) {
          const a = (i / 11) * Math.PI;
          const lx = Math.cos(a) * 0.82;
          const lz = 0.1 - Math.sin(a) * 0.72;
          cone(lx, lz, 0.2 + (i % 3) * 0.03, 0.55 + (i % 4) * 0.1, i % 2 ? 0x2f5a3c : 0x3d6a46, 0.04);
        }
        for (const [lx, lz] of [[-0.85, 0.45], [0.85, 0.45], [-0.7, -0.7], [0.7, -0.7]]) cone(lx, lz, 0.2, 0.7, 0x2f5a3c, 0.04);
        seats(0.18, 0.34, 0.12, tiers, [0x8a5e3f, 0x7a5233], 0.04, 0.05, 0.3);
        box(0, 0.5, 0.86, 0.06, 0.36, 0x9a7448, 0.04, 2);
        for (const lx of [-0.36, 0.36]) for (const lz of [0.36, 0.64]) box(lx, lz, 0.04, 0.4, 0.04, 0x6a4a30, 0.1);
        gable(0, 0.5, 0.92, 0.28, 0.5, 0x6a4a30, 0.5, false);
        for (let i = 0; i < 8; i++) {
          const a = 0.35 + (i / 7) * (Math.PI - 0.7);
          const [x, z] = at(Math.cos(a) * 0.62, 0.18 - Math.sin(a) * 0.5);
          p.sphere(0.022, 0xf6d25a, { x, y: 0.28, z }, 0);
        }
      } else {
        seats(0.15, 0.38, 0.15, tiers, [0xcfc6b0, 0xb9b09a], 0.1, 0.08);
        box(0, 0.55, 1.0, 0.1, 0.4, 0x8a5e3f, 0.04, 1);
        box(0, 0.42, 0.9, 0.5, 0.04, 0xb94a40, 0.14);
        for (const lx of [-0.55, 0.55]) cyl(lx, 0.55, 0.03, 0.6, 0x555a60, 0.04, 0, 6);
      }
      break;
    }
    case 'stadium': {
      // A football stadium: a long rounded-rectangle bowl round a rectangular field with end zones and goalposts, the stands
      // stepping down toward the grass, a roof over the sidelines on the bigger ones, floodlights, a press box and a gate.
      prism(rrect(0, 0, 1.7, 1.14, 0.3), 0.04, 0.4 + 0.05 * L, 0xd9d4c6, 6, [rrect(0, 0, 1.38, 0.82, 0.2)]);
      prism(rrect(0, 0, 1.5, 0.96, 0.25), 0.04, 0.3 + 0.04 * L, 0x2f5f8a, 0, [rrect(0, 0, 1.2, 0.66, 0.16)]);
      prism(rrect(0, 0, 1.28, 0.74, 0.18), 0.04, 0.2 + 0.03 * L, 0xb23a30, 0, [rrect(0, 0, 1.04, 0.52, 0.1)]);
      // A pale band at the top of the wall, and window slits along the sidelines.
      prism(rrect(0, 0, 1.72, 1.16, 0.31), 0.4 + 0.05 * L, 0.04, 0xf0f1f2, 0, [rrect(0, 0, 1.36, 0.8, 0.2)]);
      for (let k = -5; k <= 5; k++) for (const sz of [-1, 1]) box(k * 0.14, sz * 0.572, 0.06, 0.18, 0.016, 0x3b4650, 0.12);
      // The field: end zones, mowing stripes, yard lines, the centre mark and the goalposts.
      box(0, 0, 1.0, 0.014, 0.52, 0x4a9444, 0.04);
      for (let k = 0; k < 8; k++) box(-0.31 + k * 0.088 + 0.044, 0, 0.088, 0.012, 0.52, k % 2 ? 0x4a9444 : 0x5ba852, 0.054);
      box(-0.42, 0, 0.16, 0.014, 0.52, 0x2f5f8a, 0.056);
      box(0.42, 0, 0.16, 0.014, 0.52, 0xb23a30, 0.056);
      for (let k = -4; k <= 4; k++) box(k * 0.088, 0, 0.012, 0.012, 0.52, 0xf4f4ec, 0.07);
      box(0, 0, 0.9, 0.012, 0.012, 0xf4f4ec, 0.07);
      cyl(0, 0, 0.06, 0.014, 0xf4f4ec, 0.07, 0, 14);
      cyl(0, 0, 0.05, 0.016, 0x2f5f8a, 0.07, 0, 14);
      for (const sx of [-1, 1]) {
        box(sx * 0.5, 0, 0.012, 0.16, 0.012, 0xe6b422, 0.06);
        box(sx * 0.5, 0, 0.012, 0.012, 0.16, 0xe6b422, 0.2);
        for (const pz of [-0.07, 0.07]) box(sx * 0.5, pz, 0.012, 0.1, 0.012, 0xe6b422, 0.21);
      }
      if (L >= 2) {
        // A roof over each sideline, on columns.
        for (const sz of [-1, 1]) {
          box(0, sz * 0.4, 1.1, 0.03, 0.26, 0xf0f1f2, 0.46 + 0.05 * L);
          for (const cx of [-0.5, 0, 0.5]) cyl(cx, sz * 0.52, 0.015, 0.4 + 0.05 * L, 0x8b8f93, 0.08, 0, 6);
        }
      }
      box(0, -0.48, 0.5, 0.07, 0.1, 0x5f8aa3, 0.4 + 0.05 * L);
      for (const lx of [-0.8, 0.8]) {
        for (const lz of [-0.5, 0.5]) {
          cyl(lx, lz, 0.022, 0.9 + 0.05 * L, 0x6a6e73, 0.04, 0, 6);
          box(lx, lz, 0.2, 0.09, 0.07, 0xf6efc8, 0.9 + 0.05 * L);
          box(lx, lz, 0.22, 0.02, 0.09, 0x4f545c, 1.0 + 0.05 * L);
        }
      }
      // The gate on the street side, ticket booths and flags.
      box(0, front - 0.12, 0.5, 0.3, 0.1, 0xb23a30, 0.04);
      box(0, front - 0.1, 0.36, 0.18, 0.11, 0x2a2e33, 0.04);
      box(0, front - 0.06, 0.62, 0.04, 0.2, 0xf0f1f2, 0.34);
      for (const lx of [-0.55, 0.55]) {
        box(lx, front - 0.14, 0.14, 0.14, 0.12, 0xe6e2d6, 0.04);
        cyl(lx * 1.35, front - 0.14, 0.01, 0.5, 0xdcdcd6, 0.04, 0, 6);
        box(lx * 1.35 + 0.06, front - 0.14, 0.12, 0.08, 0.01, [0x2f5f8a, 0xb23a30][lx > 0 ? 1 : 0], 0.44);
      }
      if (L >= 3) {
        box(-0.88, 0, 0.05, 0.22, 0.34, 0x22262b, 0.44);
        box(-0.865, 0, 0.012, 0.16, 0.28, 0xf2d36b, 0.47);
      }
      break;
    }
    case 'ballpark': {
      // A baseball park: a true diamond, fair territory a fan out to a curved wall, a warning track, bases, a mound, and
      // grandstands that curve round home plate and run down the foul lines.
      const hz = 0.35;
      const RW = 1.15;
      const fan = (rad: number, a0: number, a1: number, n = 12): [number, number][] => {
        const pts: [number, number][] = [[0, hz]];
        for (let k = 0; k <= n; k++) {
          const a = a0 + ((a1 - a0) * k) / n;
          pts.push([Math.sin(a) * rad, hz - Math.cos(a) * rad]);
        }
        return pts;
      };
      const d45 = Math.PI / 4;
      prism(fan(RW + 0.08, -d45 - 0.02, d45 + 0.02), 0.045, 0.012, 0xa8794f, 0);
      prism(fan(RW, -d45, d45), 0.055, 0.012, 0x4f9a48, 0);
      // Mowing stripes in the outfield.
      for (let k = 0; k < 5; k++) prism(fan(RW - k * 0.2, -d45 + 0.05, d45 - 0.05, 8).slice(1), 0.067, 0.004, k % 2 ? 0x5ba852 : 0x4a9444, 0);
      // The infield: dirt diamond with a grass square in it, the mound and the bases.
      const b1: [number, number] = [0.27, hz - 0.27];
      const b2: [number, number] = [0, hz - 0.54];
      const b3: [number, number] = [-0.27, hz - 0.27];
      prism([[0, hz + 0.1], [b1[0] + 0.1, b1[1]], [0, b2[1] - 0.1], [b3[0] - 0.1, b3[1]]], 0.07, 0.012, 0xb8825a, 0);
      prism([[0, hz - 0.08], [b1[0] - 0.08, b1[1]], [0, b2[1] + 0.08], [b3[0] + 0.08, b3[1]]], 0.082, 0.006, 0x58a04c, 0);
      cyl(0, hz, 0.1, 0.012, 0xb8825a, 0.07, 0, 14);
      cyl(0, hz - 0.27, 0.07, 0.016, 0xb8825a, 0.082, 0, 12);
      box(0, hz - 0.27, 0.04, 0.02, 0.012, 0xf4f4ec, 0.098);
      for (const b of [b1, b2, b3]) box(b[0], b[1], 0.05, 0.025, 0.05, 0xf4f4ec, 0.08);
      box(0, hz, 0.05, 0.018, 0.05, 0xf4f4ec, 0.082);
      // Foul lines.
      for (const sx of [-1, 1]) {
        const dx = sx * Math.sin(d45) * RW;
        const dz = -Math.cos(d45) * RW;
        const [mx, mz] = at(dx / 2, hz + dz / 2);
        p.tex = 0;
        p.box(0.014, 0.014, RW, 0xf4f4ec, { x: mx, y: 0.074, z: mz, ry: yaw + Math.atan2(dx, dz) });
      }
      // The outfield wall, with the scoreboard at dead centre.
      for (let k = 0; k < 18; k++) {
        const a = -d45 + ((k + 0.5) / 18) * (d45 * 2);
        const [x, z] = at(Math.sin(a) * (RW + 0.07), hz - Math.cos(a) * (RW + 0.07));
        p.tex = 0;
        p.box(0.11, 0.1 + (k % 6 === 3 ? 0.03 : 0), 0.03, 0x1f5a3a, { x, y: 0.045, z, ry: yaw - a });
      }
      box(0, hz - RW - 0.13, 0.46, 0.3, 0.05, 0x22262b, 0.1);
      box(0, hz - RW - 0.1, 0.4, 0.2, 0.012, 0xf2d36b, 0.14);
      // Grandstands: tiers of seats curving behind home plate and down both foul lines.
      const tiers = 2 + (L >= 2 ? 1 : 0);
      for (let t = 0; t < tiers; t++) {
        const r = 0.3 + t * 0.12;
        const n = 22 + t * 4;
        for (let k = 0; k < n; k++) {
          const a = d45 + 0.2 + (k / (n - 1)) * (Math.PI * 2 - (d45 + 0.2) * 2);
          const [x, z] = at(Math.sin(a) * r, hz - Math.cos(a) * r);
          p.tex = 0;
          p.box(((Math.PI * 2 * r) / 44) * 1.2, 0.1 + t * 0.09, 0.11, [0x2f5f8a, 0xb23a30, 0xe6e2d6][t % 3], { x, y: 0.04, z, ry: yaw - a });
        }
      }
      // Bleachers in left and right field.
      for (const sx of [-1, 1]) {
        for (let k = 0; k < 2; k++) {
          const a = sx * (0.35 + k * 0.08);
          const [x, z] = at(Math.sin(a) * (RW + 0.15 + k * 0.07), hz - Math.cos(a) * (RW + 0.15 + k * 0.07));
          p.tex = 0;
          p.box(0.34, 0.06 + k * 0.06, 0.07, k ? 0xcfc6b0 : 0xb9b09a, { x, y: 0.04, z, ry: yaw - a });
        }
      }
      if (L >= 2) {
        // A roof over the seats behind home plate.
        for (let k = 0; k < 14; k++) {
          const a = Math.PI - 0.95 + (k / 13) * 1.9;
          const [x, z] = at(Math.sin(a) * 0.46, hz - Math.cos(a) * 0.46);
          p.tex = 0;
          p.box(0.2, 0.025, 0.3, 0xf0f1f2, { x, y: 0.5, z, ry: yaw - a });
        }
      }
      for (const [lx, lz] of [[-0.82, -0.1], [0.82, -0.1], [-0.7, 0.74], [0.7, 0.74]]) {
        cyl(lx, lz, 0.02, 0.95 + 0.05 * L, 0x6a6e73, 0.04, 0, 6);
        box(lx, lz, 0.2, 0.08, 0.07, 0xf6efc8, 0.95 + 0.05 * L);
      }
      box(-0.64, front - 0.06, 0.2, 0.2, 0.12, 0xb23a30, 0.04);
      box(0.64, front - 0.06, 0.2, 0.2, 0.12, 0x2f5f8a, 0.04);
      break;
    }
    case 'arena': {
      // An indoor arena for hockey: a long rounded-rectangle hall with a glass concourse and tiered roofs, and on the roof, in
      // paint, the rink it covers, so the shape reads from above. A canopy and doors face the street.
      prism(rrect(0, 0, 1.6, 1.18, 0.34), 0.04, 0.08, 0x8f9498, 6);
      prism(rrect(0, 0, 1.5, 1.08, 0.3), 0.12, 0.38 + 0.04 * L, 0xaeb6bf, 3);
      prism(rrect(0, 0, 1.52, 1.1, 0.31), 0.22, 0.14, 0x6f93ad, 7);
      prism(rrect(0, 0, 1.56, 1.14, 0.32), 0.5 + 0.04 * L, 0.04, 0x4f545c, 0);
      prism(rrect(0, 0, 1.3, 0.9, 0.26), 0.54 + 0.04 * L, 0.1, 0xe8ebee, 0);
      prism(rrect(0, 0, 1.1, 0.7, 0.2), 0.64 + 0.04 * L, 0.05, 0xf4f6f8, 0);
      // The rink painted on the roof: ice, boards, centre line, blue lines and face-off dots.
      const ry = 0.69 + 0.04 * L;
      prism(rrect(0, 0, 0.96, 0.46, 0.15), ry, 0.012, 0x23609a, 0);
      prism(rrect(0, 0, 0.92, 0.42, 0.13), ry + 0.012, 0.01, 0xdcecf6, 0);
      box(0, 0, 0.012, 0.012, 0.42, 0xc0392b, ry + 0.022);
      for (const sx of [-1, 1]) {
        box(sx * 0.2, 0, 0.012, 0.012, 0.42, 0x2f5f8a, ry + 0.022);
        box(sx * 0.4, 0, 0.012, 0.012, 0.42, 0xc0392b, ry + 0.022);
        for (const sz of [-1, 1]) cyl(sx * 0.3, sz * 0.1, 0.022, 0.012, 0xc0392b, ry + 0.022, 0, 10);
      }
      cyl(0, 0, 0.07, 0.012, 0x2f5f8a, ry + 0.022, 0, 14);
      if (L >= 2) {
        box(-0.3, -0.2, 0.2, 0.06, 0.14, 0xaeb6bf, 0.7 + 0.04 * L, 5);
        box(0.3, -0.2, 0.2, 0.06, 0.14, 0xaeb6bf, 0.7 + 0.04 * L, 5);
      }
      if (L >= 3) {
        for (const lx of [-0.72, 0.72]) {
          cyl(lx, 0.5, 0.07, 0.74, 0xc9c6bc, 0.04, 6, 12);
          cyl(lx, 0.5, 0.08, 0.04, 0x4f545c, 0.78, 0, 12);
        }
        box(0, -0.58, 0.6, 0.18, 0.04, 0x22262b, 0.7);
        box(0, -0.56, 0.54, 0.12, 0.01, 0x5fd0e8, 0.73);
      }
      // Canopy and doors on the street side, a marquee, a Zamboni and a few cars.
      box(0, front - 0.1, 0.7, 0.04, 0.26, 0xb23a30, 0.38);
      for (const lx of [-0.3, 0.3]) cyl(lx, front + 0.02, 0.014, 0.34, 0xdcdcd6, 0.04, 0, 6);
      box(0, front - 0.24, 0.5, 0.26, 0.012, 0x2a2e33, 0.06);
      box(0, front - 0.24, 0.46, 0.18, 0.02, 0x5f8aa3, 0.1);
      box(0.62, front - 0.04, 0.2, 0.1, 0.12, 0xe9eaeb, 0.04);
      box(0.62, front - 0.04, 0.2, 0.04, 0.12, 0x2f5f8a, 0.14);
      for (let i = 0; i < 3; i++) {
        box(-0.66 + i * 0.16, front + 0.02, 0.1, 0.045, 0.2, [0xb23a30, 0x2f5f8a, 0xe6e6e1][i], 0.05);
        box(-0.66 + i * 0.16, front + 0.02, 0.08, 0.025, 0.1, 0x25333f, 0.095);
      }
      break;
    }
    case 'cafe': {
      // A coffee house on the corner: cream walls, a brown awning, a big cup for a sign, and tables with umbrellas on the pavement.
      box(-0.15, -0.3, 1.2, 0.46 + 0.1 * (L >= 2 ? 1 : 0), 0.62, 0xeadcb8, 0.04, 3);
      gable(-0.15, -0.3, 1.32, 0.22, 0.74, 0x6b3f2c, 0.5 + 0.1 * (L >= 2 ? 1 : 0));
      box(-0.15, front - 0.5, 1.1, 0.06, 0.24, 0x6b3f2c, 0.34);
      for (const lx of [-0.5, 0.2]) win(lx, 0.12, 0.34, 0.22);
      box(0.0, front - 0.52, 0.2, 0.26, 0.02, 0x4a2c20, 0.04);
      cyl(0.62, -0.1, 0.1, 0.16, 0xf4f1e8, 0.5, 0, 14);
      cyl(0.62, -0.1, 0.085, 0.02, 0x4a2c20, 0.65, 0, 14);
      box(0.74, -0.1, 0.04, 0.08, 0.02, 0xf4f1e8, 0.55);
      cyl(0.62, -0.1, 0.02, 0.5, 0x555a60, 0.04, 0, 6);
      const tables = 2 + L;
      for (let i = 0; i < tables; i++) {
        const lx = -0.6 + i * (1.2 / Math.max(1, tables - 1));
        cyl(lx, 0.5, 0.06, 0.012, 0xb08a60, 0.2, 0, 10);
        cyl(lx, 0.5, 0.008, 0.2, 0x555a60, 0.04, 0, 5);
        cone(lx, 0.5, 0.15, 0.1, [0xb94a40, 0xe6e2d6, 0x6b3f2c, 0x3f7a55][i % 4], 0.4);
        cyl(lx, 0.5, 0.008, 0.2, 0x555a60, 0.2, 0, 5);
      }
      break;
    }
    case 'resort': {
      // A beach resort: a white hotel block with balconies, a blue pool with loungers and umbrellas, palms.
      box(-0.15, -0.45, 1.3, 0.4 + 0.2 * L, 0.46, 0xf2efe6, 0.04, 7);
      for (let f = 0; f < 2 + L; f++) box(-0.15, -0.2, 1.24, 0.03, 0.1, 0xd8d2c4, 0.2 + f * 0.2);
      box(-0.15, -0.45, 1.36, 0.04, 0.52, 0x3f78a8, 0.44 + 0.2 * L);
      box(-0.5, 0.18, 0.5, 0.02, 0.36, 0xb08a60, 0.04);
      prism(rrect(0.1, 0.5, 0.62, 0.3, 0.12), 0.05, 0.014, 0x39a9d9, 0);
      for (let i = 0; i < 4; i++) {
        box(-0.2 + i * 0.28, 0.76, 0.1, 0.03, 0.2, 0xf0f1f2, 0.05);
        if (i % 2 === 0) {
          cyl(-0.2 + i * 0.28, 0.62, 0.008, 0.26, 0x555a60, 0.04, 0, 5);
          cone(-0.2 + i * 0.28, 0.62, 0.14, 0.09, [0xe0722a, 0xe6e2d6][i % 4 === 0 ? 0 : 1], 0.28);
        }
      }
      for (const [lx, lz] of [[0.75, 0.55], [0.8, -0.1], [-0.8, 0.6]]) {
        cyl(lx, lz, 0.025, 0.55, 0x8a6a48, 0.04, 0, 6);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const [x, z] = at(lx + Math.cos(a) * 0.12, lz + Math.sin(a) * 0.12);
          p.tex = 0;
          p.box(0.3, 0.02, 0.06, 0x3f8a40, { x, y: 0.58, z, ry: yaw - a, rz: -0.3 });
        }
      }
      break;
    }
  }
  p.tex = 0;
}
