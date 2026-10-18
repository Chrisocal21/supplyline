import { Parts } from './parts';

const FRAME = 0xc9c6ba;
const GLASS = 0x526f7b;
const METAL = 0x50595e;

export interface BuildingFrame {
  x: number;
  z: number;
  yaw: number;
  w: number;
  d: number;
  h: number;
}

function local(frame: BuildingFrame, x: number, z: number) {
  const c = Math.cos(frame.yaw);
  const s = Math.sin(frame.yaw);
  return { x: frame.x + x * c + z * s, z: frame.z - x * s + z * c, ry: frame.yaw };
}

export function framedWindow(p: Parts, x: number, y: number, z: number, w: number, h: number, yaw = 0): void {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  p.box(w, h, 0.025, FRAME, { x, y, z, ry: yaw, t: 0 });
  p.box(w * 0.8, h * 0.78, 0.018, GLASS, {
    x: x + s * 0.019, y: y + h * 0.11, z: z + c * 0.019, ry: yaw, t: 8,
  });
  p.box(Math.min(0.018, w * 0.06), h * 0.8, 0.025, FRAME, {
    x: x + s * 0.024, y: y + h * 0.1, z: z + c * 0.024, ry: yaw, t: 0,
  });
  p.box(w * 1.08, 0.025, 0.07, FRAME, { x, y: y - 0.025, z, ry: yaw, t: 0 });
}

export function loadingBay(p: Parts, x: number, y: number, z: number, w: number, h: number): void {
  p.box(w, h, 0.04, 0x2e383c, { x, y, z, t: 0 });
  for (let i = 1; i < 6; i++) {
    p.box(w * 0.9, 0.014, 0.05, 0x687477, { x, y: y + i * h / 6, z: z + 0.015, t: 5 });
  }
  for (const side of [-1, 1]) {
    p.box(0.035, h + 0.035, 0.065, METAL, { x: x + side * w / 2, y, z, t: 5 });
    p.cyl(0.022, 0.022, h * 0.42, 0xc6a25c, { x: x + side * w * 0.62, y, z: z + 0.09, t: 0 }, 6);
  }
  p.box(w * 1.12, 0.035, 0.15, METAL, { x, y: y + h, z: z + 0.035, t: 5 });
}

export function roofVent(p: Parts, x: number, y: number, z: number, scale = 1): void {
  p.box(0.32 * scale, 0.14 * scale, 0.22 * scale, 0x9ca4a1, { x, y, z, t: 5 });
  p.cyl(0.075 * scale, 0.075 * scale, 0.025 * scale, 0x394347, { x, y: y + 0.14 * scale, z, t: 0 }, 12);
  for (let i = -1; i <= 1; i++) {
    p.box(0.022 * scale, 0.01 * scale, 0.14 * scale, 0x909994,
      { x: x + i * 0.04 * scale, y: y + 0.165 * scale, z, t: 0 });
  }
}

export interface Residence extends BuildingFrame {
  wall: number;
  roof: number;
  wallTex: number;
  roofShape: 'steep' | 'mid' | 'low' | 'flat';
  variant: number;
}

/** Four silhouettes sharing the same plot envelope: cottage, cross-gable, terrace and shop-house. */
export function addResidence(p: Parts, b: Residence): void {
  const { w, d, h } = b;
  const variant = b.variant % 4;
  const box = (x: number, z: number, bw: number, bh: number, bd: number, color: number, y: number, t = 0) =>
    p.box(bw, bh, bd, color, { ...local(b, x, z), y, t });
  box(0, 0, w * 0.98, 1.2, d * 0.98, 0x706e65, -1.2, 6);
  const terrace = variant === 2;
  const mainH = terrace ? h * 0.62 : h;
  box(0, 0, w, mainH, d, b.wall, 0.04, b.wallTex);
  box(0, 0, w * 1.02, 0.055, d * 1.02, 0xa5a093, 0.04, 6);
  const rh = Math.min(w * 0.55, b.roofShape === 'steep' ? 0.45 : b.roofShape === 'low' ? 0.16 : 0.28);
  if (terrace) {
    box(-w * 0.13, -d * 0.08, w * 0.68, h * 0.38, d * 0.8, b.wall, 0.04 + mainH, b.wallTex);
    box(-w * 0.13, -d * 0.08, w * 0.72, 0.05, d * 0.84, b.roof, h + 0.04, 6);
    box(w * 0.4, 0, w * 0.035, 0.12, d, FRAME, mainH + 0.055);
    box(w * 0.28, d * 0.46, w * 0.25, 0.12, 0.025, FRAME, mainH + 0.055);
  } else if (b.roofShape === 'flat') {
    box(0, 0, w * 1.04, 0.06, d * 1.04, b.roof, h + 0.04, 6);
    for (const side of [-1, 1]) box(side * w * 0.49, 0, w * 0.04, 0.1, d, b.wall, h + 0.1, b.wallTex);
    box(0, -d * 0.48, w, 0.1, 0.03, b.wall, h + 0.1, b.wallTex);
    box(-w * 0.18, -d * 0.12, w * 0.22, 0.12, d * 0.22, METAL, h + 0.1, 5);
    if (variant === 1) {
      box(w * 0.2, -d * 0.05, w * 0.28, 0.16, d * 0.45, b.wall, h + 0.1, b.wallTex);
      box(w * 0.2, -d * 0.05, w * 0.32, 0.035, d * 0.49, b.roof, h + 0.26, 6);
      box(w * 0.2, d * 0.18, w * 0.2, 0.07, 0.018, GLASS, h + 0.15, 8);
    }
  } else {
    p.gable(w * 1.08, rh, d * 1.08, b.roof, { ...local(b, 0, 0), y: h + 0.04 });
    if (variant === 1) {
      const cross = local(b, 0, d * 0.15);
      p.gable(d * 0.7, rh * 0.7, w * 0.8, b.roof, { ...cross, y: h + 0.06, ry: b.yaw + Math.PI / 2 });
    }
    for (const side of [-1, 1]) box(side * w * 0.53, 0, 0.025, 0.035, d * 1.1, METAL, h + 0.025);
    if (variant === 0 || variant === 1) {
      box(-w * 0.26, -d * 0.22, w * 0.12, rh * 0.8, d * 0.13, 0x796055, h + 0.12, 1);
      box(-w * 0.26, -d * 0.22, w * 0.16, 0.035, d * 0.17, METAL, h + 0.12 + rh * 0.8);
    }
  }
  const floors = h > 0.6 ? 2 : 1;
  for (let floor = 0; floor < floors; floor++) {
    const y = 0.04 + h * (floors === 1 ? 0.42 : 0.24 + floor * 0.46);
    for (const side of [-1, 1]) {
      if (!(terrace && floor === 1 && side === 1)) {
        const front = local(b, side * w * 0.29, (terrace && floor === 1 ? d * 0.32 : d / 2) + 0.012);
        if (!(variant === 3 && floor === 0)) framedWindow(p, front.x, y, front.z, w * 0.2, h * 0.22, b.yaw);
      }
      const flank = local(b, side * (w / 2 + 0.012), -d * 0.15);
      if (!terrace || floor === 0) framedWindow(p, flank.x, y, flank.z, d * 0.25, h * 0.22, b.yaw + side * Math.PI / 2);
    }
  }
  box(0, d / 2 + 0.02, w * 0.19, Math.min(h * 0.65, 0.3), 0.035, 0x424d4d, 0.06);
  box(0, d / 2 + 0.03, w * 0.27, 0.035, 0.1, FRAME, 0.04, 6);
  if (variant === 3) {
    for (const side of [-1, 1]) {
      const front = local(b, side * w * 0.29, d / 2 + 0.016);
      framedWindow(p, front.x, 0.1, front.z, w * 0.29, h * 0.42, b.yaw);
    }
    box(0, d / 2 + 0.035, w * 0.94, 0.045, 0.12, 0x526d65, h * 0.58 + 0.06);
    box(0, d / 2 + 0.018, w * 0.78, 0.07, 0.035, 0xd4c8ac, h * 0.69 + 0.04);
  } else {
    box(0, d / 2 + 0.035, w * 0.32, 0.035, 0.1, b.roof, Math.min(h * 0.65, 0.3) + 0.09);
  }
}

export interface CityBlock extends BuildingFrame {
  wall: number;
  tower: boolean;
  variant: number;
}

/** Masonry apartments, setback towers and split-volume office buildings. */
export function addCityBlock(p: Parts, b: CityBlock): void {
  const { w, d, h } = b;
  const variant = b.variant % 3;
  const box = (x: number, z: number, bw: number, bh: number, bd: number, color: number, y: number, t = 0) =>
    p.box(bw, bh, bd, color, { ...local(b, x, z), y, t });
  const podium = Math.min(0.52, h * 0.32);
  box(0, 0, w * 0.98, 1.6, d * 0.98, 0x706e65, -1.6, 6);
  box(0, 0, w, podium, d, 0x8d9089, 0.04, 6);
  if (variant === 1) {
    box(0, 0, w * 0.86, h * 0.7 - podium, d * 0.9, b.wall, podium + 0.04, b.tower ? 7 : 1);
    box(-w * 0.09, -d * 0.08, w * 0.66, h * 0.3, d * 0.66, b.wall, h * 0.7 + 0.04, b.tower ? 7 : 1);
    box(-w * 0.09, -d * 0.08, w * 0.7, 0.07, d * 0.7, METAL, h + 0.04, 5);
  } else if (variant === 2) {
    box(-w * 0.21, 0, w * 0.48, h - podium, d * 0.88, b.wall, podium + 0.04, b.tower ? 7 : 6);
    box(w * 0.24, d * 0.1, w * 0.4, h * 0.8 - podium, d * 0.7, b.wall, podium + 0.04, b.tower ? 7 : 6);
    box(-w * 0.21, 0, w * 0.5, 0.06, d * 0.92, METAL, h + 0.04, 5);
    box(w * 0.24, d * 0.1, w * 0.44, 0.06, d * 0.74, METAL, h * 0.8 + 0.04, 5);
  } else {
    box(0, 0, w * 0.94, h - podium, d * 0.94, b.wall, podium + 0.04, b.tower ? 7 : 1);
    box(0, 0, w * 1.02, 0.07, d * 1.02, METAL, h + 0.04, 5);
    const floors = Math.min(10, Math.max(2, Math.floor(h / 0.4)));
    for (let floor = 1; floor < floors; floor++) {
      box(0, 0, w * 0.99, 0.025, d * 0.99, FRAME, 0.04 + floor * h / floors);
    }
    if (!b.tower && variant !== 0) {
      const floors = Math.min(7, Math.max(2, Math.floor(h / 0.4)));
      for (let floor = 1; floor < floors; floor++) {
        const y = 0.06 + floor * h / floors;
        for (const side of [-1, 1]) {
          const upper = y >= h * 0.7;
          if (variant === 2 && side === 1 && y + h / floors * 0.5 > h * 0.8) continue;
          const x = variant === 1 ? (upper ? -w * 0.09 : 0) + side * w * (upper ? 0.19 : 0.25) : side * w * 0.23;
          const z = variant === 1 ? (upper ? d * 0.25 : d * 0.45) : side < 0 ? d * 0.44 : d * 0.45;
          const pt = local(b, x, z + 0.01);
          framedWindow(p, pt.x, y, pt.z, w * 0.19, h / floors * 0.45, b.yaw);
        }
      }
    }
    if (!b.tower) {
      for (let floor = 1; floor < Math.min(7, floors); floor++) {
        for (const side of [-1, 1]) {
          const pt = local(b, side * w * 0.27, d * 0.475);
          framedWindow(p, pt.x, 0.08 + floor * h / floors, pt.z, w * 0.22, h / floors * 0.52, b.yaw);
        }
      }
    }
  }
  for (const side of [-1, 1]) {
    const pt = local(b, side * w * 0.25, d / 2 + 0.012);
    framedWindow(p, pt.x, 0.09, pt.z, w * 0.32, podium * 0.68, b.yaw);
  }
  box(0, d / 2 + 0.025, w * 0.86, 0.05, 0.12, METAL, podium + 0.08, 5);
  box(-w * 0.16, -d * 0.14, w * 0.23, Math.min(0.22, h * 0.08), d * 0.22, 0x8f9896, h + 0.12, 5);
}
