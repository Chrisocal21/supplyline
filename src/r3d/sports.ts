import type { Parts } from './parts';
import { meters, SPORTS, type LightAnchor } from '../scale';

export type SportsKind = 'stadium' | 'ballpark' | 'arena';

/**
 * The campus each kind takes, in metres across and deep. Football, hockey and the rest of the big venues share one size so they
 * fit any site; a baseball park is built at three quarters of that scale.
 */
export const CAMPUS_SIZE: Record<SportsKind, [number, number]> = { stadium: [180, 125], arena: [180, 125], ballpark: [135, 135] };

/** Full-size sports facilities. The caller reserves a campus before using these models. */
export function sportsCampus(p: Parts, kind: SportsKind, level: number, cx: number, cz: number, yaw: number): LightAnchor[] {
  const scale = kind === 'ballpark' ? 0.75 : 1;
  const m = (v: number): number => meters(v * scale);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const at = (x: number, z: number) => ({ x: cx + m(x) * c + m(z) * s, z: cz - m(x) * s + m(z) * c, ry: yaw });
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: number, t = 0, turn = 0) =>
    p.box(m(w), m(h), m(d), color, { ...at(x, z), y: m(y), ry: yaw + turn, t });
  const pole = (x: number, z: number, height: number, radius = 0.15) =>
    p.cyl(m(radius * 0.7), m(radius), m(height), 0x6e797c, { ...at(x, z), y: 0.04, t: 5 }, 10);
  const lights: LightAnchor[] = [];
  const flood = (x: number, z: number, height: number) => {
    pole(x, z, height, 0.3);
    box(x, height, z, 3.5, 0.5, 0.65, 0x475157, 5);
    for (let i = 0; i < 4; i++) box(x - 1.3 + i * 0.85, height + 0.05, z + 0.35, 0.6, 0.34, 0.1, 0xf2e7c9, 9);
    lights.push({ ...at(x, z), y: m(height), range: m(75), power: 25 });
  };
  const line = (x0: number, z0: number, x1: number, z1: number, y: number, color = 0xe9e5d6, width = 0.102) =>
    box((x0 + x1) / 2, y, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0), 0.015, width, color, 0, -Math.atan2(z1 - z0, x1 - x0));
  const prism = (points: [number, number][], y: number, h: number, color: number) => {
    p.prism(points.map(([x, z]) => {
      const pt = at(x, z);
      return [pt.x, pt.z];
    }), m(h), color, { y: m(y), t: 0 });
  };

  if (kind === 'stadium') {
    p.slab(m(180), m(125), 0x777d73, { ...at(0, 0) });
    const { length, width } = SPORTS.football;
    box(0, 0.42, 0, length + 5, 0.03, width + 5, 0x455e3d, 10);
    for (let i = 0; i < 12; i++) box(-length / 2 + (i + 0.5) * length / 12, 0.455, 0, length / 12, 0.01, width, i % 2 ? 0x536b40 : 0x496239, 10);
    for (const side of [-1, 1]) box(side * (length / 2 - 4.572), 0.47, 0, 9.144, 0.012, width, side > 0 ? 0x456372 : 0x775348);
    for (let yard = -50; yard <= 50; yard += 5) line(yard * 0.9144, -width / 2, yard * 0.9144, width / 2, 0.49);
    for (const z of [-width / 2, width / 2]) line(-length / 2, z, length / 2, z, 0.49);
    for (let yard = -49; yard < 50; yard++) for (const z of [-3.1, 3.1]) line(yard * 0.9144, z, yard * 0.9144, z + 0.6, 0.49);
    for (const side of [-1, 1]) {
      pole(side * length / 2, 0, 3.05, 0.08);
      box(side * length / 2, 3.45, 0, 0.15, 0.15, 5.64, 0xd0b854, 5);
      for (const z of [-2.82, 2.82]) {
        p.cyl(m(0.07), m(0.07), m(6), 0xd0b854, { ...at(side * length / 2, z), y: m(3.45), t: 5 }, 8);
      }
      for (let row = 0; row < 5 * level; row++) {
        box(0, 0.4, side * (width / 2 + 5 + row * 0.85), 128, 0.7 + row * 0.38, 0.85, 0x8d948f, 6);
        box(0, 1.1 + row * 0.38, side * (width / 2 + 5 + row * 0.85), 128, 0.35, 0.42, side > 0 ? 0x465b68 : 0x6e4941, 11);
      }
      if (level >= 2) {
        const roofZ = side * 39;
        box(0, 12, roofZ, 136, 0.35, 21, 0x75807c, 5);
        for (let i = -4; i <= 4; i++) pole(i * 15, side * 47, 12, 0.2);
        for (let i = -4; i <= 4; i++) box(i * 15, 11.4, roofZ, 0.22, 0.6, 21, 0x444f53, 5);
      }
    }
    if (level === 3) {
      for (const side of [-1, 1]) for (let row = 0; row < 12; row++) {
        box(side * (65 + row * 0.9), 0.4, 0, 0.9, 0.7 + row * 0.38, 62, 0x8d948f, 6);
        box(side * (65 + row * 0.9), 1.1 + row * 0.38, 0, 0.45, 0.35, 62, 0x465b68, 11);
      }
    }
    box(0, 0.4, 53, 44, 5, 8, 0xaaa79a, 1);
    for (let i = -3; i <= 3; i++) box(i * 5.5, 1.1, 57.05, 3.4, 2.4, 0.12, 0x3b5663, 8);
    box(0, 13, -53, 22, 8, 0.6, 0x303d42, 5);
    box(0, 13.5, -52.65, 20, 6.5, 0.08, 0x37556a, 8);
    for (const x of [-70, 70]) for (const z of [-49, 49]) flood(x, z, 28);
  } else if (kind === 'ballpark') {
    p.slab(m(180), m(180), 0x69715f, { ...at(0, 0) });
    box(0, 0.42, 0, 176, 0.025, 176, 0x566d41, 10);
    const homeZ = 50;
    const edge: [number, number][] = [];
    for (let i = 0; i <= 48; i++) {
      const angle = Math.PI / 4 + i / 48 * Math.PI / 2;
      const radius = 99 + Math.sin(i / 48 * Math.PI) * 23;
      edge.push([Math.cos(angle) * radius, homeZ - Math.sin(angle) * radius]);
    }
    prism([[0, homeZ], ...edge], 0.46, 0.015, 0x3e613d);
    const b = SPORTS.baseball.basePath / Math.sqrt(2);
    prism([[0, homeZ + 4], [b + 4, homeZ - b], [0, homeZ - 2 * b - 4], [-b - 4, homeZ - b]], 0.49, 0.015, 0xa47d57);
    prism([[0, homeZ - 4], [b - 4, homeZ - b], [0, homeZ - 2 * b + 4], [-b + 4, homeZ - b]], 0.51, 0.015, 0x45653e);
    for (const [x, z] of [[0, homeZ], [b, homeZ - b], [0, homeZ - 2 * b], [-b, homeZ - b]]) box(x, 0.55, z, 0.381, 0.06, 0.381, 0xf0eadb, 0, Math.PI / 4);
    p.cyl(m(2.75), m(2.75), m(0.254), 0xa47d57, { ...at(0, homeZ - SPORTS.baseball.mound), y: m(0.53), t: 0 }, 24);
    for (const i of [0, 48]) {
      line(0, homeZ, edge[i][0], edge[i][1], 0.54);
      pole(edge[i][0], edge[i][1], 12, 0.1);
    }
    for (let i = 1; i < edge.length; i++) line(edge[i - 1][0], edge[i - 1][1], edge[i][0], edge[i][1], 3.4, 0x36594a, 0.4);
    for (const side of [-1, 1]) {
      for (let row = 0; row < 4 + level * 4; row++) box(side * (28 + row * 0.8), 0.4, 45, 0.8, 0.5 + row * 0.36, 56, 0x8b938b, 6, side * Math.PI / 4);
      if (level > 1) box(side * 40, 10, 50, 22, 0.35, 60, 0x65716c, 5, side * Math.PI / 4);
      flood(side * 72, -50, 30);
      flood(side * 65, 55, 30);
    }
    box(0, 0.4, 72, 42, 5, 10, 0xa19b89, 1);
    box(0, 13, -77, 24, 9, 0.7, 0x344955, 8);
  } else {
    p.slab(m(180), m(125), 0x7e847d, { ...at(0, 0) });
    const { length, width } = SPORTS.hockey;
    box(0, 0.42, 0, length, 0.02, width, 0xcadadd, 8);
    for (const x of [-length / 2, length / 2]) box(x, 0.45, 0, 0.15, 1.22, width, 0xe0dfd5);
    for (const z of [-width / 2, width / 2]) box(0, 0.45, z, length, 1.22, 0.15, 0xe0dfd5);
    line(0, -width / 2, 0, width / 2, 0.46, 0xa64b43, 0.3);
    for (const x of [-7.62, 7.62]) line(x, -width / 2, x, width / 2, 0.46, 0x406a94, 0.3);
    for (const side of [-1, 1]) {
      for (let row = 0; row < 4 + level * 3; row++) box(0, 0.4, side * (17 + row), 76, 0.5 + row * 0.42, 1, 0x7c8986, 6);
      for (let i = -4; i <= 4; i++) pole(i * 10, side * 32, 13, 0.25);
      box(0, 0.4, side * 33, 96, level === 1 ? 3.5 : 11, 0.4, 0x9b9f96, 5);
    }
    for (let segment = 0; segment < 12; segment++) {
      const x = -48 + segment * 8 + 4;
      const roofY = 13 + Math.sin((segment + 0.5) / 12 * Math.PI) * 3;
      box(x, roofY, 0, 8.1, 0.25, 68, 0x687980, 5);
      box(x, roofY - 0.55, 0, 0.22, 0.6, 67, 0x47545c, 5);
    }
    box(0, 0.4, 38, 62, 5.5, 7, 0xa9aca1, 6);
    for (let i = -5; i <= 5; i++) box(i * 5.5, 1.0, 41.6, 4.4, 3.4, 0.1, 0x496c7c, 8);
    box(0, 5.9, 40, 70, 0.2, 5, 0x596d76, 5);
    for (const x of [-46, 46]) flood(x, 37, 8);
  }
  return lights;
}
