// The model of a town or major city: lots for sale and homes beside the streets, driveways, a signalled crossing,
// street lamps, and homes or towers around the outside. Everything is built once per change and merged into one mesh.
import * as THREE from 'three';
import { DISTRICT_ORDER, type DistrictId, type TownStyle } from '../sim/defs';
import { CITY_RADIUS, homeTiles, plotEntry, plotFacing, plotTiles } from '../sim/features';
import { R as GLOBE_R } from './geo';
import { districtLandmark } from './districts';
import { Parts } from './parts';

const TILE = 3.27;
const GLASS = 0x6f93ad;
const ASPHALT = 0x4a4b4f;

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

interface StyleLook {
  walls: number[];
  roofs: number[];
  roof: 'steep' | 'mid' | 'low' | 'flat';
  wallTex: number;
}

const STYLE_LOOKS: Record<TownStyle, StyleLook> = {
  nordic: { walls: [0xa8472f, 0xc8a050, 0x8a6a48, 0xd9d2c0, 0x7a4a38], roofs: [0x2f3338, 0x3d3a36, 0x4a3a30], roof: 'steep', wallTex: 2 },
  temperate: { walls: [0x9c6a56, 0xc9b79c, 0x8a8f94, 0xb7a58a, 0xa07a5e], roofs: [0x7a3f35, 0x4f545c, 0x6b4a38], roof: 'mid', wallTex: 1 },
  mediterranean: { walls: [0xf0e9da, 0xe9dcc0, 0xf3d9b0, 0xd8c7a5, 0xf5f0e4], roofs: [0xb8573a, 0xc4683f, 0xa84e34], roof: 'low', wallTex: 3 },
  tropical: { walls: [0xe6c36a, 0x8fc4a8, 0xe08f7a, 0xf0e8d0, 0x7fb4d4], roofs: [0x3f7a55, 0x9a5a3a, 0x2f6a8a], roof: 'mid', wallTex: 3 },
  arid: { walls: [0xd9bf8c, 0xcaa874, 0xe4cfa3, 0xb89a68, 0xdcc49a], roofs: [0xb89a68, 0xa88a5a, 0xc7ab78], roof: 'flat', wallTex: 3 },
};
const BLOCKS = [0xc9c3b6, 0xd8cfc0, 0xb9b2a4, 0xcfd2d4, 0xe0d6c4, 0xb8a894];
const TOWERS = [0x9fb4c8, 0xb4c4d2, 0x8ea6ba, 0xc2cbd2, 0x7f9ab0, 0xa8b8a8];
const TREE_GREEN = [0x4f8a3f, 0x5d9a48, 0x3f7a4a];

const YAW: Record<'N' | 'S' | 'E' | 'W', number> = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 };

export interface TownModelOptions {
  level: number;
  seed: number;
  /** East-west narrowing at high latitude. */
  squeeze: number;
  radius: number;
  style: TownStyle;
  /** Per plot: a building (the player's, or the Market and Freight Yard) stands there. */
  occupied: boolean[];
  /** Per plot: already homes. */
  homePlots: number[];
  /** Per plot and per home tile: dry land that can be built on. */
  plotOk: boolean[];
  homeOk: boolean[];
  /** Districts the town has built, each shown as a landmark on one of the tiles around its streets. */
  districts?: { id: DistrictId; level: number }[];
}

export function townGeometry(o: TownModelOptions): THREE.BufferGeometry {
  const r = rng(o.seed * 7919 + 13);
  const p = new Parts();
  const look = STYLE_LOOKS[o.style];
  const R = o.radius;
  const city = R === CITY_RADIUS;
  const sq = o.squeeze;
  const pick = <T,>(list: T[]): T => list[Math.floor(r() * list.length)];
  const level = o.level;

  /** A point in a frame centred at (cx, cz) and turned by yaw. */
  const at = (cx: number, cz: number, yaw: number, lx: number, lz: number): [number, number] => [
    cx + lx * Math.cos(yaw) + lz * Math.sin(yaw),
    cz - lx * Math.sin(yaw) + lz * Math.cos(yaw),
  ];

  const home = (cx: number, cz: number, yaw: number, w: number, d: number, h: number): void => {
    const wall = pick(look.walls);
    p.tex = look.wallTex;
    p.box(w, h, d, wall, { x: cx, y: 0.04, z: cz, ry: yaw });
    p.box(w * 0.98, 1.2, d * 0.98, 0x6d6b66, { x: cx, y: -1.2, z: cz, ry: yaw });
    p.tex = 0;
    const roof = pick(look.roofs);
    if (look.roof === 'flat') {
      p.box(w * 1.06, 0.07, d * 1.06, roof, { x: cx, y: 0.04 + h, z: cz, ry: yaw, t: 6 });
    } else {
      const rh = look.roof === 'steep' ? 0.5 : look.roof === 'mid' ? 0.3 : 0.17;
      p.gable(w * 1.1, rh, d * 1.1, roof, { x: cx, y: 0.04 + h, z: cz, ry: yaw + (r() < 0.7 ? Math.PI / 2 : 0) });
      if (r() < 0.35) {
        const [kx, kz] = at(cx, cz, yaw, w * 0.25, -d * 0.2);
        p.box(0.08, 0.3, 0.08, 0x5a4a40, { x: kx, y: 0.04 + h + 0.12, z: kz, t: 1 });
      }
    }
    const [dx, dz] = at(cx, cz, yaw, (r() - 0.5) * w * 0.3, d / 2 + 0.005);
    p.box(0.15, 0.26, 0.02, 0x4a3828, { x: dx, y: 0.04, z: dz, ry: yaw });
    for (const s of [-1, 1]) {
      const [wx, wz] = at(cx, cz, yaw, s * w * 0.3, d / 2 + 0.005);
      p.box(0.14, 0.14, 0.02, GLASS, { x: wx, y: 0.04 + h * 0.5, z: wz, ry: yaw });
      const [sx, sz] = at(cx, cz, yaw, s * (w / 2 + 0.005), 0);
      p.box(0.02, 0.14, 0.14, GLASS, { x: sx, y: 0.04 + h * 0.5, z: sz, ry: yaw });
    }
  };

  const tall = (cx: number, cz: number, yaw: number, w: number, d: number, h: number, kind: 'block' | 'tower'): void => {
    p.tex = kind === 'tower' ? 7 : 6;
    p.box(w, h, d, kind === 'tower' ? pick(TOWERS) : pick(BLOCKS), { x: cx, y: 0.04, z: cz, ry: yaw });
    p.box(w * 0.98, 1.6, d * 0.98, 0x6d6b66, { x: cx, y: -1.6, z: cz, ry: yaw });
    p.tex = 6;
    p.box(w * 1.03, 0.07, d * 1.03, 0x6a6e73, { x: cx, y: 0.04 + h, z: cz, ry: yaw });
    if (kind === 'tower' && h > 3) {
      p.box(w * 0.5, 0.35, d * 0.5, 0x7a7e84, { x: cx, y: 0.11 + h, z: cz, ry: yaw });
      p.box(0.05, 0.6 + h * 0.05, 0.05, 0x5a5e64, { x: cx, y: 0.46 + h, z: cz });
    }
    p.tex = 0;
  };

  const tree = (x: number, z: number): void => {
    p.cyl(0.05, 0.07, 0.9, 0x6a4a30, { x, y: -0.5, z }, 6);
    p.sphere(0.4 + r() * 0.22, pick(TREE_GREEN), { x, y: 0.5, z }, 1);
  };

  // ---- the plots beside the streets ----
  const plots = plotTiles(0, 0, R);
  plots.forEach((t, index) => {
    if (index < 2 && !o.plotOk[index]) return;
    if (!o.plotOk[index]) return;
    const cx = t.x * TILE * sq;
    const cz = t.y * TILE;
    const face = plotFacing(t.x, t.y);
    const yaw = YAW[face];
    const f = plotEntry(t.x, t.y);
    const fx = Math.sign(f.x - t.x) * (Math.abs(f.x - t.x) > 0 ? 1 : 0);
    const fz = Math.sign(f.y - t.y) * (Math.abs(f.y - t.y) > 0 ? 1 : 0);

    if (index < 2 || o.occupied[index]) return;

    if (o.homePlots.includes(index)) {
      // Homes (or, in a major city, towers) lining the street.
      if (city && level >= 2 && r() < 0.35 + level * 0.1) {
        const h = (1.6 + r() * 2.2) * (0.6 + level * 0.35);
        const [bx, bz] = at(cx, cz, yaw, 0, 0.2);
        tall(bx, bz, yaw, 1.7 * sq + 0.3, 1.7, h, level >= 3 && r() < 0.6 ? 'tower' : 'block');
      } else {
        const rows = level >= 3 ? 2 : 1;
        for (let row = 0; row < rows; row++) {
          for (const side of [-1, 1]) {
            const [hx, hz] = at(cx, cz, yaw, side * 0.82, 0.75 - row * 1.5);
            const w = 0.66 + r() * 0.2;
            const d = 0.62 + r() * 0.2;
            if (city && level >= 3 && r() < 0.5) tall(hx, hz, yaw, w + 0.35, d + 0.3, 0.9 + r() * 0.9, 'block');
            else home(hx, hz, yaw, w, d, 0.34 + r() * 0.3 + (level >= 2 ? 0.15 : 0));
          }
        }
      }
      return;
    }

    // A lot for sale: a dirt pad on a foundation, a low fence with a gate gap at the driveway, and a sign.
    const hw = 1.3 * sq;
    p.tex = 6;
    p.box(hw * 2, 0.03, 2.6, 0xa89c7e, { x: cx, y: 0.0, z: cz });
    p.box(hw * 2 - 0.1, 2.5, 2.5, 0x6d6b66, { x: cx, y: -2.5, z: cz });
    p.tex = 2;
    for (const sx of [-1, 1]) {
      if (fx === 0 || sx !== fx) p.box(0.04, 0.2, 2.6, 0x8a6a48, { x: cx + sx * hw, y: 0.03, z: cz });
      else for (const seg of [-1, 1]) p.box(0.04, 0.2, 0.9, 0x8a6a48, { x: cx + sx * hw, y: 0.03, z: cz + seg * 0.85 });
    }
    for (const sz of [-1, 1]) {
      if (fz === 0 || sz !== fz) p.box(hw * 2, 0.2, 0.04, 0x8a6a48, { x: cx, y: 0.03, z: cz + sz * 1.3 });
      else for (const seg of [-1, 1]) p.box(0.9 * sq, 0.2, 0.04, 0x8a6a48, { x: cx + seg * 0.85 * sq, y: 0.03, z: cz + sz * 1.3 });
    }
    p.tex = 0;
    const [sx, sz] = at(cx, cz, yaw, 0.95, 1.2);
    p.box(0.05, 0.85, 0.05, 0x6a4a30, { x: sx, y: 0.03, z: sz });
    p.box(0.72, 0.36, 0.04, 0xf4f1e8, { x: sx, y: 0.6, z: sz, ry: yaw });
    p.box(0.72, 0.1, 0.05, 0xc0392b, { x: sx, y: 0.86, z: sz, ry: yaw });
    p.box(0.46, 0.05, 0.05, 0x2a2a2a, { x: sx, y: 0.7, z: sz, ry: yaw });
    p.box(0.34, 0.05, 0.05, 0x2a2a2a, { x: sx, y: 0.62, z: sz, ry: yaw });
  });

  // ---- homes and towers around the outside ----
  const around = homeTiles(0, 0, R)
    .map((t, i) => ({ t, i, d: Math.hypot(t.x, t.y) + r() * 0.5 }))
    .filter((h) => o.homeOk[h.i])
    .sort((a, b) => a.d - b.d);
  const fillFrac = city ? [0.35, 0.5, 0.65, 0.8, 0.9][level - 1] : [0.3, 0.5, 0.75, 0.95, 1][level - 1];
  const filled = Math.floor(around.length * fillFrac);
  const maxD = Math.max(1, ...around.map((h) => h.d));
  // Each district has its own slot, taken from the tiles nearest the centre, so it stays put as others are added.
  const slots = homeTiles(0, 0, R)
    .map((t, i) => ({ i, d: Math.hypot(t.x, t.y) + Math.atan2(t.y, t.x) * 0.001 }))
    .filter((h) => o.homeOk[h.i])
    .sort((a, b) => a.d - b.d);
  const claimed = new Map<number, { id: DistrictId; level: number }>();
  for (const d of o.districts ?? []) {
    const slot = slots[DISTRICT_ORDER.indexOf(d.id)];
    if (slot) claimed.set(slot.i, d);
  }
  around.forEach((h, idx) => {
    const tx = h.t.x * TILE * sq;
    const tz = h.t.y * TILE;
    // Face the nearest street.
    const face = Math.abs(h.t.x) < Math.abs(h.t.y) ? (h.t.x > 0 ? 'W' : 'E') : h.t.y > 0 ? 'N' : 'S';
    const yaw = YAW[face as 'N' | 'S' | 'E' | 'W'];
    const landmark = claimed.get(h.i);
    if (landmark) {
      districtLandmark(p, landmark.id, landmark.level, tx, tz, yaw);
      return;
    }
    if (idx >= filled) {
      if (r() < (city ? 0.8 : 0.55)) tree(tx + (r() - 0.5) * 1.6, tz + (r() - 0.5) * 1.6);
      if (city && r() < 0.5) tree(tx + (r() - 0.5) * 2, tz + (r() - 0.5) * 2);
      return;
    }
    const close = 1 - h.d / maxD;
    if (city && level >= 2) {
      // Major cities: dense blocks, and the centre climbs into towers.
      const big = r() < 0.2 + close * 0.45 && level >= 3;
      const hmax = level === 2 ? 1.6 : level === 3 ? 3.4 : level === 4 ? 6 : 9.5;
      const height = 0.9 + hmax * (0.25 + close * 0.75) * (0.7 + r() * 0.5);
      tall(tx, tz, yaw, (1.4 + r() * 0.5) * sq + 0.2, 1.4 + r() * 0.5, height, big ? 'tower' : 'block');
      return;
    }
    for (const lot of [[-0.8, -0.8], [0.8, 0.8], [0.8, -0.8], [-0.8, 0.8]].sort(() => r() - 0.5).slice(0, level >= 3 ? 3 : level >= 2 ? 2 : 1)) {
      const x = tx + lot[0] * sq;
      const z = tz + lot[1];
      const w = 0.66 + r() * 0.2;
      const d = 0.62 + r() * 0.2;
      if (level >= 4 && close > 0.5 && r() < 0.5) tall(x, z, yaw, w + 0.2, d + 0.2, 1.3 + r() * 1.5, 'tower');
      else if (level >= 3 && close > 0.3 && r() < 0.6) tall(x, z, yaw, w + 0.1, d + 0.1, 0.8 + r() * 0.6, 'block');
      else home(x, z, yaw, w, d, 0.34 + r() * 0.3 + (level >= 2 ? 0.15 : 0));
    }
  });

  // ---- the street crossing: crosswalks and traffic signals ----
  p.tex = 6;
  for (const dir of [0, 1, 2, 3]) {
    const ax = dir % 2 === 0 ? 1 : 0;
    const sgn = dir < 2 ? 1 : -1;
    for (let k = 0; k < 5; k++) {
      const a = sgn * (1.0 + k * 0.12);
      p.box(ax ? 0.07 : 0.56, 0.012, ax ? 0.56 : 0.07, 0xe8e8e0, { x: ax ? a * sq : 0, y: 0.078, z: ax ? 0 : a });
    }
  }
  p.tex = 0;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * 0.62 * sq;
      const z = sz * 0.62;
      p.cyl(0.03, 0.04, 1.05, 0x2d3034, { x, y: 0.04, z }, 6);
      p.box(0.13, 0.34, 0.13, 0x1d2024, { x, y: 1.0, z });
      // The lamps facing each street: green one way, red the other, alternating by corner.
      const nsGreen = sx * sz > 0;
      for (const [face, green] of [['z', nsGreen], ['x', !nsGreen]] as ['x' | 'z', boolean][]) {
        const off = 0.07;
        const colors = [green ? 0x2b3a30 : 0xe04a3a, 0x3a3524, green ? 0x4cd08a : 0x3a2b2b];
        colors.forEach((c, i) => {
          p.box(face === 'z' ? 0.07 : 0.02, 0.07, face === 'z' ? 0.02 : 0.07, c, {
            x: x + (face === 'x' ? off * sx : 0),
            y: 1.2 - i * 0.1,
            z: z + (face === 'z' ? off * sz : 0),
          });
        });
      }
    }
  }

  // ---- lamps along the two main streets ----
  for (let k = -R; k <= R; k++) {
    if (k === 0) continue;
    for (const [x, z] of [[k * TILE * sq, 0.55], [-0.55 * sq, k * TILE]] as [number, number][]) {
      p.cyl(0.025, 0.035, 0.75, 0x3a3d40, { x, y: 0.04, z }, 6);
      p.box(0.12, 0.05, 0.12, 0xfff0b8, { x, y: 0.79, z });
    }
  }

  if (p.count === 0) p.box(0.1, 0.02, 0.1, ASPHALT, { y: 0 });
  return bendToGlobe(p.build());
}

/** The model is built on a flat plane; the ground it stands on curves away. Follow the sphere so nothing floats at the edges. */
function bendToGlobe(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, pos.getY(i) - (x * x + z * z) / (2 * (GLOBE_R + 0.3)));
  }
  pos.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}
