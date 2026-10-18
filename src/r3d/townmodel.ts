// The model of a town or major city: lots for sale and homes beside its streets, driveways, a signalled crossing,
// street lamps, and homes or towers lining the main street and its lanes. Everything is built once per change and merged into one mesh.
import * as THREE from 'three';
import { type DistrictId, type TownStyle } from '../sim/defs';
import { R as GLOBE_R } from './geo';
import { districtLandmark, type Setting } from './districts';
import { Parts } from './parts';
import { addCityBlock, addResidence } from './architecture';
import { addTree } from './vegetation';
import { sportsCampus } from './sports';
import { STREET, TILE_UNITS, type LightAnchor } from '../scale';

const TILE = TILE_UNITS;
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
const TREE_GREEN = [0x526747, 0x63764e, 0x405a41];

const YAW: Record<'N' | 'S' | 'E' | 'W', number> = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 };

/** Where a district's landmark stands in the model: its tile (offset from the centre) and its place in model units. */
export interface TownLandmark {
  id: DistrictId;
  level: number;
  tx: number;
  ty: number;
  x: number;
  z: number;
}

export interface TownModelOptions {
  level: number;
  seed: number;
  /** East-west narrowing at high latitude. */
  squeeze: number;
  /** A major city: longer streets, and blocks and towers instead of houses as it grows. */
  city: boolean;
  style: TownStyle;
  /** The town's streets as built so far, as offsets from the centre. */
  streets: { x: number; y: number; main: boolean }[];
  /** The district plots, in order: offset, the street tile the drive meets, dry land, built on, still homes. */
  plots: { x: number; y: number; ex: number; ey: number; ok: boolean; occupied: boolean; home: boolean }[];
  /** The tiles beside the streets where homes stand (as far as the town has grown), and whether each can be built on. */
  homes: { x: number; y: number; ok: boolean }[];
  /** Districts the town has built, each a building on its own lot beside a street: the lot, and the street tile its door meets. */
  districts?: { id: DistrictId; level: number; x: number; y: number; ex: number; ey: number; setting?: Setting; campus?: boolean }[];
}

export function townGeometry(o: TownModelOptions): THREE.BufferGeometry {
  const r = rng(o.seed * 7919 + 13);
  const p = new Parts();
  const look = STYLE_LOOKS[o.style];
  const city = o.city;
  const sq = o.squeeze;
  const pick = <T,>(list: T[]): T => list[Math.floor(r() * list.length)];
  const level = o.level;
  const lights: LightAnchor[] = [];

  /** A point in a frame centred at (cx, cz) and turned by yaw. */
  const at = (cx: number, cz: number, yaw: number, lx: number, lz: number): [number, number] => [
    cx + lx * Math.cos(yaw) + lz * Math.sin(yaw),
    cz - lx * Math.sin(yaw) + lz * Math.cos(yaw),
  ];

  const home = (cx: number, cz: number, yaw: number, w: number, d: number, h: number): void => {
    p.anchor = [cx, cz];
    const wall = pick(look.walls);
    const roof = pick(look.roofs);
    // Keep the layout RNG sequence stable; appearance must not move later houses or gardens.
    if (look.roof !== 'flat') {
      r();
      r();
    }
    r();
    const variant = Math.abs(Math.round(cx * 31 + cz * 73 + o.seed)) % 4;
    addResidence(p, { x: cx, z: cz, yaw, w, d, h, wall, roof, wallTex: look.wallTex, roofShape: look.roof, variant });
    p.tex = 0;
    p.anchor = null;
  };

  const tall = (cx: number, cz: number, yaw: number, w: number, d: number, h: number, kind: 'block' | 'tower'): void => {
    p.anchor = [cx, cz];
    addCityBlock(p, {
      x: cx, z: cz, yaw, w, d, h, tower: kind === 'tower',
      wall: kind === 'tower' ? pick(TOWERS) : pick(BLOCKS),
      variant: Math.abs(Math.round(cx * 31 + cz * 73 + o.seed)) % 3,
    });
    p.tex = 0;
    p.anchor = null;
  };

  const tree = (x: number, z: number): void => {
    p.anchor = [x, z];
    const radius = 0.4 + r() * 0.22;
    const color = pick(TREE_GREEN);
    const variant = Math.abs(Math.round(x * 13 + z * 7));
    addTree(p, variant % 4 === 0 ? 'birch' : 'oak', x, -0.18, z, radius * 2.2, variant, color);
    p.anchor = null;
  };

  // Offsets from the town centre to model coordinates.
  const X = (dx: number): number => dx * TILE * sq;
  const Z = (dy: number): number => dy * TILE;
  const tkey = (x: number, y: number): string => x + ',' + y;
  const streetMap = new Map(o.streets.map((s) => [tkey(s.x, s.y), s]));
  const isStreet = (x: number, y: number): boolean => streetMap.has(tkey(x, y));
  const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // The road centre lines through town, so nothing is built on the tarmac. A corner is cut, as the road is drawn.
  const segs: [number, number, number, number][] = [];
  for (const s of o.streets) {
    const nb = DIRS.filter(([a, b]) => isStreet(s.x + a, s.y + b));
    for (const [a, b] of nb) if (a > 0 || b > 0) segs.push([X(s.x), Z(s.y), X(s.x + a), Z(s.y + b)]);
    if (nb.length === 2 && nb[0][0] !== -nb[1][0]) {
      const [[a0, b0], [a1, b1]] = nb;
      segs.push([X(s.x + a0 / 2), Z(s.y + b0 / 2), X(s.x + a1 / 2), Z(s.y + b1 / 2)]);
    }
    if (nb.length === 0) segs.push([X(s.x), Z(s.y), X(s.x), Z(s.y)]);
  }
  const segDist = (px: number, pz: number, [ax, az, bx, bz]: [number, number, number, number]): number => {
    const vx = bx - ax;
    const vz = bz - az;
    const l2 = vx * vx + vz * vz;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / l2)) : 0;
    return Math.hypot(px - ax - vx * t, pz - az - vz * t);
  };
  const ROAD_CLEAR = 0.5;
  const offRoad = (x: number, z: number, hx: number, hz: number): boolean =>
    [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]].every(([a, b]) => segs.every((sg) => segDist(x + a * hx, z + b * hz, sg) > ROAD_CLEAR));

  // ---- the plots beside the streets ----
  o.plots.forEach((t, index) => {
    if (!t.ok || index < 2 || t.occupied || t.home) return;
    const cx = X(t.x);
    const cz = Z(t.y);
    const fx = Math.sign(t.ex - t.x);
    const fz = Math.sign(t.ey - t.y);
    // A lot held for the player: a level, serviced pad with a painted edge and survey stakes at the corners.
    const hw = 1.3 * sq;
    p.anchor = [cx, cz];
    p.tex = 6;
    p.box(hw * 2, 0.03, 2.6, 0xb7b1a3, { x: cx, y: 0.0, z: cz });
    p.box(hw * 2 - 0.1, 2.5, 2.5, 0x6d6b66, { x: cx, y: -2.5, z: cz });
    p.box(hw * 2 - 0.34, 0.012, 2.26, 0xc9c4b6, { x: cx, y: 0.03, z: cz });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        p.tex = 0;
        p.box(0.04, 0.34, 0.04, 0x6a5a48, { x: cx + sx * (hw - 0.1), y: 0.03, z: cz + sz * 1.2 });
        p.box(0.07, 0.07, 0.07, 0xe0792b, { x: cx + sx * (hw - 0.1), y: 0.37, z: cz + sz * 1.2 });
      }
    }
    // The drive meets the street where the plot is entered.
    p.tex = 6;
    p.box(fx === 0 ? 0.6 : 0.5, 0.012, fz === 0 ? 0.6 : 0.5, 0xa39e92, { x: cx + fx * hw * 0.92, y: 0.03, z: cz + fz * 1.2 });
    p.tex = 0;
    p.anchor = null;
  });

  const construction = (cx: number, cz: number, yaw: number, stage: number): void => {
    p.anchor = [cx, cz];
    p.tex = 6;
    p.box(1.6, 0.03, 1.5, 0x9c968a, { x: cx, y: 0.0, z: cz, ry: yaw });
    p.box(1.55, 1.5, 1.45, 0x6d6b66, { x: cx, y: -1.5, z: cz, ry: yaw });
    const [bx, bz] = at(cx, cz, yaw, -0.1, -0.05);
    p.box(0.95, 0.07, 0.75, 0xc4c0b6, { x: bx, y: 0.03, z: bz, ry: yaw });
    p.tex = 1;
    if (stage >= 1) p.box(0.95, 0.34 * stage, 0.75, 0xcbbfa6, { x: bx, y: 0.1, z: bz, ry: yaw });
    p.tex = 0;
    if (stage >= 2) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const [px, pz] = at(bx, bz, yaw, sx * 0.5, sz * 0.4);
        p.box(0.03, 0.8, 0.03, 0x9a8a5a, { x: px, y: 0.1, z: pz });
      }
    }
    // Materials, a site cabin and orange safety fencing along the street side.
    const [mx, mz] = at(cx, cz, yaw, 0.55, 0.45);
    p.box(0.34, 0.16, 0.24, 0xa4523f, { x: mx, y: 0.03, z: mz, ry: yaw });
    p.box(0.26, 0.1, 0.2, 0xb08a4a, { x: mx + 0.05, y: 0.19, z: mz, ry: yaw });
    const [kx, kz] = at(cx, cz, yaw, -0.6, 0.5);
    p.box(0.3, 0.2, 0.22, 0x3f6f9a, { x: kx, y: 0.03, z: kz, ry: yaw });
    for (let i = -2; i <= 2; i++) {
      const [fx2, fz2] = at(cx, cz, yaw, i * 0.3, 0.7);
      p.box(0.24, 0.16, 0.02, 0xe0792b, { x: fx2, y: 0.03, z: fz2, ry: yaw });
    }
    if (stage >= 2 && level >= 2) {
      const [tx, tz] = at(cx, cz, yaw, 0.65, -0.5);
      p.box(0.05, 1.25, 0.05, 0xd7a21f, { x: tx, y: 0.03, z: tz });
      p.box(0.85, 0.04, 0.04, 0xd7a21f, { x: tx - 0.3, y: 1.25, z: tz, ry: yaw });
    }
    p.anchor = null;
  };

  /** The streets a tile fronts, as unit steps toward them; the main street first. */
  const fronts = (x: number, y: number): [number, number][] =>
    DIRS.filter(([a, b]) => isStreet(x + a, y + b)).sort(([a, b], [c, d]) => (streetMap.get(tkey(x + c, y + d))!.main ? 1 : 0) - (streetMap.get(tkey(x + a, y + b))!.main ? 1 : 0));
  const yawToward = (a: number, b: number): number => (a > 0 ? YAW.E : a < 0 ? YAW.W : b > 0 ? YAW.S : YAW.N);

  // ---- homes along the streets, nearest the centre first ----
  const around = o.homes
    .map((t, i) => ({ t, i, d: Math.hypot(t.x, t.y) + r() * 0.5 }))
    .filter((h) => h.t.ok && fronts(h.t.x, h.t.y).length > 0)
    .sort((a, b) => a.d - b.d);
  const fillFrac = city ? [0.7, 0.8, 0.9, 1, 1][level - 1] : [0.7, 0.85, 1, 1, 1][level - 1];
  const filled = Math.floor(around.length * fillFrac);
  // Just past the finished houses, the next ones are being built: sites in several stages, so the town is plainly in
  // development and fills in as it grows. A fully grown town has none.
  const frontier = fillFrac >= 1 ? 0 : Math.max(2, Math.min(8, Math.round(around.length * 0.14)));
  // Each district is a building on its own lot, turned to face the street its door opens on, with a drive to it.
  const marks: TownLandmark[] = [];
  for (const d of o.districts ?? []) {
    const fx = Math.sign(d.ex - d.x);
    const fz = Math.sign(d.ey - d.y);
    const cx = X(d.x);
    const cz = Z(d.y);
    marks.push({ id: d.id, level: d.level, tx: d.x, ty: d.y, x: cx, z: cz });
    p.anchor = [cx, cz];
    if (d.campus && (d.id === 'stadium' || d.id === 'ballpark' || d.id === 'arena')) {
      lights.push(...sportsCampus(p, d.id, d.level, cx, cz, yawToward(fx, fz)));
      const front = d.id === 'stadium' ? 5.7 : d.id === 'ballpark' ? 7.7 : 4.16;
      const startX = cx + fx * front;
      const startZ = cz + fz * front;
      const endX = X(d.ex);
      const endZ = Z(d.ey);
      p.box(fx ? Math.abs(endX - startX) : STREET.lane * 2, 0.018, fz ? Math.abs(endZ - startZ) : STREET.lane * 2, ASPHALT,
        { x: (startX + endX) / 2, y: 0.043, z: (startZ + endZ) / 2 });
    } else {
      districtLandmark(p, d.id, d.level, cx, cz, yawToward(fx, fz), d.setting);
    }
    p.tex = 6;
    if (!d.campus) p.box(fx === 0 ? 0.6 : 0.5, 0.012, fz === 0 ? 0.6 : 0.5, 0xa39e92, { x: cx + fx * 1.2 * sq, y: 0.03, z: cz + fz * 1.2 });
    p.tex = 0;
    p.anchor = null;
  }

  const built: { x: number; y: number }[] = [];
  around.forEach((h, idx) => {
    const [a, b] = fronts(h.t.x, h.t.y)[0];
    const yaw = yawToward(a, b);
    if (idx >= filled && idx < filled + frontier) {
      const ex = X(h.t.x + a * 0.5);
      const ez = Z(h.t.y + b * 0.5);
      construction(ex - a * 0.2, ez - b * 0.2, yaw, 1 + Math.floor(r() * 3));
      return;
    }
    if (idx >= filled) {
      if (r() < (city ? 0.8 : 0.55)) tree(X(h.t.x) + (r() - 0.5) * 1.6, Z(h.t.y) + (r() - 0.5) * 1.6);
      return;
    }
    built.push(h.t);
  });
  o.plots.forEach((t, index) => {
    if (index >= 2 && t.ok && t.home && !t.occupied) built.push(t);
  });

  // Homes stand shoulder to shoulder along the street in front of each built-up tile, facing it behind a small front
  // garden, with the gardens running back behind them. In a big city the centre climbs into blocks and towers.
  const placed: [number, number, number, number][] = [];
  const free = (x0: number, z0: number, x1: number, z1: number): boolean =>
    !placed.some(([a0, b0, a1, b1]) => x0 < a1 && x1 > a0 && z0 < b1 && z1 > b0);
  for (const t of built) {
    const fr = fronts(t.x, t.y);
    if (fr.length === 0) continue;
    for (const [a, b] of fr) {
      const main = streetMap.get(tkey(t.x + a, t.y + b))!.main;
      const along: [number, number] = [-b, a];
      const span = along[0] !== 0 ? TILE * sq : TILE;
      // The street's centre line, and the frontage line just off it on this tile's side.
      const sx = X(t.x + a);
      const sz = Z(t.y + b);
      const close = 1 - Math.hypot(t.x, t.y) / ((city ? 11 : 8) * 1.2);
      const yawBase = yawToward(-a, -b);
      const bigCity = city && level >= 2;
      let s = -span / 2;
      while (s < span / 2) {
        const w = bigCity ? 1.1 + r() * 0.5 : 0.62 + r() * 0.22;
        const d = bigCity ? 1.0 + r() * 0.4 : 0.58 + r() * 0.2;
        const gap = bigCity ? 0.15 + r() * 0.15 : 0.1 + r() * 0.2;
        const mid = s + w / 2;
        s += w + gap;
        if (mid + w / 2 > span / 2 + 0.2) break;
        if (r() < 0.08) continue;
        const setback = (main ? 0.5 : 0.42) + 0.16 + d / 2;
        const x = along[0] !== 0 ? X(t.x) + mid : sx - a * setback;
        const z = along[0] !== 0 ? sz - b * setback : Z(t.y) + mid;
        const hx = (along[0] !== 0 ? w : d) / 2;
        const hz = (along[0] !== 0 ? d : w) / 2;
        if (!offRoad(x, z, hx, hz)) continue;
        if (!free(x - hx - 0.04, z - hz - 0.04, x + hx + 0.04, z + hz + 0.04)) continue;
        placed.push([x - hx, z - hz, x + hx, z + hz]);
        const yaw = yawBase + (r() - 0.5) * 0.06;
        if (bigCity) {
          const hmax = level === 2 ? 1.6 : level === 3 ? 3.4 : level === 4 ? 6 : 9.5;
          const height = 0.9 + hmax * (0.25 + Math.max(0, close) * 0.75) * (0.7 + r() * 0.5);
          tall(x, z, yaw, w, d, height, level >= 3 && r() < 0.2 + Math.max(0, close) * 0.45 ? 'tower' : 'block');
        } else if (level >= 4 && close > 0.5 && r() < 0.5) tall(x, z, yaw, w, d, 1.3 + r() * 1.5, 'tower');
        else if (level >= 3 && close > 0.3 && r() < 0.6) tall(x, z, yaw, w, d, 0.8 + r() * 0.6, 'block');
        else home(x, z, yaw, w, d, 0.34 + r() * 0.3 + (level >= 2 ? 0.15 : 0));
        // Now and then a tree in the back garden.
        if (r() < 0.3) {
          const gx = x - a * (d / 2 + 0.5);
          const gz = z - b * (d / 2 + 0.5);
          if (offRoad(gx, gz, 0.3, 0.3)) tree(gx, gz);
        }
      }
    }
    // The back of the tile: gardens, a shed, a tree or two.
    if (r() < 0.6) tree(X(t.x) + (r() - 0.5) * 1.4, Z(t.y) + (r() - 0.5) * 1.4);
    if (r() < 0.35) {
      const cx = X(t.x) + (r() - 0.5) * 1.2;
      const cz = Z(t.y) + (r() - 0.5) * 1.2;
      if (free(cx - 0.3, cz - 0.3, cx + 0.3, cz + 0.3) && offRoad(cx, cz, 0.3, 0.3)) home(cx, cz, yawToward(-fr[0][0], -fr[0][1]), 0.42, 0.4, 0.26);
    }
  }

  // ---- the crossing at the centre, and lamps along the main street ----
  if (DIRS.filter(([a, b]) => isStreet(a, b)).length >= 3) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = sx * 0.62 * sq;
        const z = sz * 0.62;
        p.cyl(0.009, 0.014, STREET.signalHeight, 0x2d3034, { x, y: 0.04, z }, 8);
        p.box(0.038, 0.11, 0.038, 0x1d2024, { x, y: STREET.signalHeight - 0.07, z });
        const nsGreen = sx * sz > 0;
        for (const [face, green] of [['z', nsGreen], ['x', !nsGreen]] as ['x' | 'z', boolean][]) {
          const off = 0.02;
          const colors = [green ? 0x2b3a30 : 0xe04a3a, 0x3a3524, green ? 0x4cd08a : 0x3a2b2b];
          colors.forEach((c, i) => {
            p.box(face === 'z' ? 0.025 : 0.006, 0.025, face === 'z' ? 0.006 : 0.025, c, {
              x: x + (face === 'x' ? off * sx : 0),
              y: STREET.signalHeight + 0.003 - i * 0.033,
              z: z + (face === 'z' ? off * sz : 0),
            });
          });
        }
      }
    }
  }
  for (const s of o.streets) {
    if (!s.main || (s.x === 0 && s.y === 0)) continue;
    const ew = isStreet(s.x + 1, s.y) && isStreet(s.x - 1, s.y);
    const ns = isStreet(s.x, s.y + 1) && isStreet(s.x, s.y - 1);
    if (ew === ns) continue;
    const side = (s.x + s.y) % 2 === 0 ? 1 : -1;
    const x = X(s.x) + (ns ? side * 0.62 : 0);
    const z = Z(s.y) + (ew ? side * 0.62 : 0);
    p.cyl(0.009, 0.016, STREET.lampHeight, 0x515c60, { x, y: 0.04, z, t: 5 }, 8);
    p.box(0.16, 0.02, 0.035, 0x515c60, { x: x + (ns ? -side * 0.06 : 0), y: STREET.lampHeight + 0.04, z, t: 5 });
    p.box(0.065, 0.012, 0.035, 0xffeed0, { x, y: STREET.lampHeight + 0.025, z, t: 9 });
    lights.push({ x, y: STREET.lampHeight + 0.02, z, range: 2.5, power: 1.8 });
  }

  if (p.count === 0) p.box(0.1, 0.02, 0.1, ASPHALT, { y: 0 });
  const geo = bendToGlobe(p.build());
  geo.userData.landmarks = marks;
  geo.userData.lights = lights.map(light => ({ ...light, y: light.y - (light.x * light.x + light.z * light.z) / (2 * (GLOBE_R + 0.3)) }));
  return geo;
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
