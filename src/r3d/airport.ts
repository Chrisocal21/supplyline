// The airport: a field five tiles wide and three deep, a long runway across the back and the terminal at the front, where the road comes in.
// Every level keeps the full runway; the upgrades are the terminals. A municipal airfield with a small terminal and light
// aircraft, then a regional terminal with gates and turboprops, then an international terminal with jet bridges.
// Local frame: +z is the front (landside, the road), -z the back (airside, the runway). One unit is ten metres.
import * as THREE from 'three';
import { TILE_UNITS } from '../scale';
import { Parts } from './parts';

/** Half the field's width (five tiles, the runway's way) and half its depth (three tiles, front to back). */
const HX = 2.5 * TILE_UNITS;
const HZ = 1.5 * TILE_UNITS;
const EDGE = HX - 0.12;

const K = {
  grass: 0x6b7f48,
  grassDry: 0x7d8a52,
  asphalt: 0x2f3134,
  asphaltOld: 0x45474a,
  shoulder: 0x55575a,
  apron: 0xa3a49f,
  apronJoint: 0x8d8e8a,
  paint: 0xe8e8e2,
  yellow: 0xe0b52a,
  concrete: 0xb6b4ad,
  concreteDark: 0x8c8b86,
  white: 0xe9eaea,
  glass: 0x4f6f86,
  glassDark: 0x2c3e4c,
  steel: 0x8e9aa4,
  steelDark: 0x5a646d,
  roof: 0x5b6168,
  edgeLight: 0xf4efd2,
  blueLight: 0x4a7fe0,
  green: 0x3fd07a,
  red: 0xe0453a,
  tyre: 0x18191b,
};

const LIVERY = [0x1f4f8a, 0xb23a30, 0x2f7a55, 0xd7a21f, 0x7a4a9a, 0x1c8a9a];

/** Where the rotating radar on top of the tower sits, at each level, so the animation can turn it. */
export const AIRPORT_RADAR: Record<1 | 2 | 3, [number, number, number]> = {
  1: [-4.25, 1.4, 1.95],
  2: [3.75, 2.25, 2.15],
  3: [4.0, 3.37, 4.05],
};

// ---- helpers in the plane of a part turned by `yaw` ----

function turn(x: number, z: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return (lx: number, lz: number): { x: number; z: number } => ({ x: x + lx * c + lz * s, z: z - lx * s + lz * c });
}

/** A seven-segment runway number painted flat, read by a pilot landing toward `dir` (+1 east, -1 west). */
function runwayNumber(p: Parts, text: string, x: number, z: number, dir: 1 | -1, h: number): void {
  const segs: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '7': 'abc', '9': 'abcdfg', '8': 'abcdefg' };
  const w = h * 0.5;
  const t = h * 0.12;
  [...text].forEach((ch, i) => {
    const u0 = (i - (text.length - 1) / 2) * (w + h * 0.3);
    for (const s of segs[ch] ?? '') {
      const [u, v, along] = ({
        a: [0, h / 2, false], d: [0, -h / 2, false], g: [0, 0, false],
        b: [w / 2, h / 4, true], c: [w / 2, -h / 4, true], e: [-w / 2, -h / 4, true], f: [-w / 2, h / 4, true],
      } as Record<string, [number, number, boolean]>)[s];
      // A pilot facing +x has +z on the right; facing -x, -z.
      const px = x + dir * v;
      const pz = z + dir * (u0 + u);
      p.box(along ? h / 2 + t : t, 0.006, along ? t : w + t, K.paint, { x: px, y: 0.062, z: pz });
    }
  });
}

/** A runway along x at z: pavement, shoulders, threshold bars, numbers, aiming points, centreline, edge and end lights. */
function runway(p: Parts, z: number, w: number, level: number): void {
  const len = 2 * EDGE;
  p.tex = 6;
  if (level >= 3) p.box(len, 0.03, w + 0.34, K.shoulder, { y: 0.03, z });
  p.box(len, 0.035, w, level >= 2 ? K.asphalt : K.asphaltOld, { y: 0.03, z });
  p.tex = 0;
  // Edge stripes and the dashed centreline.
  for (const s of [-1, 1]) p.box(len - 0.3, 0.006, 0.035, K.paint, { y: 0.066, z: z + s * (w / 2 - 0.06) });
  for (let x = -EDGE + 1.7; x < EDGE - 1.7; x += 0.6) p.box(0.36, 0.006, 0.035, K.paint, { x: x + 0.18, y: 0.066, z });
  for (const dir of [1, -1] as const) {
    const end = -dir * EDGE;
    // Threshold "piano keys" across the runway.
    const keys = level >= 3 ? 8 : level >= 2 ? 6 : 4;
    const kw = (w - 0.2) / (keys * 2 - 1);
    for (let i = 0; i < keys; i++) {
      const kz = z - (w - 0.2) / 2 + kw / 2 + i * 2 * kw;
      p.box(0.36, 0.006, kw, K.paint, { x: end + dir * 0.32, y: 0.066, z: kz });
    }
    runwayNumber(p, dir === 1 ? '09' : '27', end + dir * 0.95, z, dir, Math.min(0.5, w * 0.34));
    if (level >= 2) {
      // Aiming-point blocks and touchdown-zone bars.
      for (const s of [-1, 1]) {
        p.box(0.55, 0.006, 0.09, K.paint, { x: end + dir * 1.75, y: 0.066, z: z + s * w * 0.24 });
        p.box(0.25, 0.006, 0.05, K.paint, { x: end + dir * 2.45, y: 0.066, z: z + s * w * 0.22 });
        p.box(0.25, 0.006, 0.05, K.paint, { x: end + dir * 2.45, y: 0.066, z: z + s * w * 0.3 });
      }
      // PAPI: four lamp boxes beside the touchdown zone, two white and two red as seen on the glide path.
      const off = level >= 3 ? 0.26 : 0.22;
      for (let i = 0; i < 4; i++) {
        p.box(0.07, 0.05, 0.07, 0x2a2c2e, { x: end + dir * 1.75, y: 0.03, z: z - w / 2 - off - i * 0.09 });
        p.box(0.03, 0.025, 0.02, i < 2 ? K.edgeLight : K.red, { x: end + dir * 1.75 - dir * 0.04, y: 0.05, z: z - w / 2 - off - i * 0.09 });
      }
    }
    // Threshold lights: green going in, red at the far end.
    for (let i = 0; i < (level >= 2 ? 6 : 3); i++) {
      const lz = z - w / 2 + (i + 0.5) * (w / (level >= 2 ? 6 : 3));
      p.sphere(0.025, i % 2 ? K.green : K.red, { x: end + dir * 0.06, y: 0.07, z: lz }, 0);
    }
  }
  // Edge lights along both sides.
  const step = level >= 3 ? 0.5 : 0.8;
  for (let x = -EDGE + 0.4; x <= EDGE - 0.4; x += step) {
    for (const s of [-1, 1]) {
      p.cyl(0.008, 0.008, 0.05, 0x3a3c3e, { x, y: 0.03, z: z + s * (w / 2 + 0.05) }, 4);
      p.sphere(0.022, K.edgeLight, { x, y: 0.085, z: z + s * (w / 2 + 0.05) }, 0);
    }
    if (level >= 3) p.box(0.04, 0.008, 0.04, K.edgeLight, { x, y: 0.064, z });
  }
}

/** A taxiway strip from (x0, z0) to (x1, z1) along one axis, with its yellow centreline and, at the top level, blue edge lights. */
function taxiway(p: Parts, x0: number, z0: number, x1: number, z1: number, w: number, lights: boolean): void {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  p.tex = 6;
  p.box(alongX ? len : w, 0.034, alongX ? w : len, K.asphalt, { x: cx, y: 0.03, z: cz });
  p.tex = 0;
  p.box(alongX ? len : 0.025, 0.006, alongX ? 0.025 : len, K.yellow, { x: cx, y: 0.065, z: cz });
  if (!lights) return;
  for (let d = 0.2; d < len - 0.1; d += 0.55) {
    for (const s of [-1, 1]) {
      const lx = alongX ? Math.min(x0, x1) + d : cx + s * (w / 2 + 0.04);
      const lz = alongX ? cz + s * (w / 2 + 0.04) : Math.min(z0, z1) + d;
      p.sphere(0.018, K.blueLight, { x: lx, y: 0.06, z: lz }, 0);
    }
  }
}

/** Concrete apron slabs with expansion joints, from x0..x1, z0..z1. */
function apron(p: Parts, x0: number, x1: number, z0: number, z1: number): void {
  p.tex = 6;
  p.box(x1 - x0, 0.036, z1 - z0, K.apron, { x: (x0 + x1) / 2, y: 0.03, z: (z0 + z1) / 2 });
  p.tex = 0;
  for (let x = x0 + 0.75; x < x1 - 0.1; x += 0.75) p.box(0.012, 0.004, z1 - z0, K.apronJoint, { x, y: 0.066, z: (z0 + z1) / 2 });
  for (let z = z0 + 0.75; z < z1 - 0.1; z += 0.75) p.box(x1 - x0, 0.004, 0.012, K.apronJoint, { x: (x0 + x1) / 2, y: 0.066, z });
}

/** A stand: yellow lead-in line, stop bar and the stand's safety box. */
function stand(p: Parts, x: number, zNose: number, depth: number): void {
  p.box(0.025, 0.006, depth, K.yellow, { x, y: 0.068, z: zNose - depth / 2 });
  p.box(0.3, 0.006, 0.025, K.yellow, { x, y: 0.068, z: zNose });
  p.box(0.025, 0.006, 0.6, 0xc8402e, { x: x - 1.2, y: 0.068, z: zNose - 0.3 });
}

// ---- aircraft, built to their real size ----

/**
 * A twin-engine jet or turboprop airliner, nose toward +z when yaw is 0. `len` is its length in units (3.0 is a 30 m
 * regional jet), and the wingspan, body and tail follow from it.
 */
function airliner(p: Parts, x: number, z: number, yaw: number, len: number, livery: number, kind: 'jet' | 'turboprop'): void {
  const at = turn(x, z, yaw);
  const r = len * (kind === 'jet' ? 0.058 : 0.052);
  const y = r + len * 0.06;
  const span = len * (kind === 'jet' ? 0.93 : 1.0);
  const body = 0xf1f2f3;
  const prevTex = p.tex;
  p.tex = 0;
  // Fuselage: a long tube with a rounded nose and a tail cone that sweeps up. (A cylinder grows from its base, so a tube
  // laid down with rx = PI/2 runs forward from where it is placed, and with rx = -PI/2 backward.)
  const rear = at(0, -len * 0.31);
  p.cyl(r, r, len * 0.66, body, { x: rear.x, y, z: rear.z, rx: Math.PI / 2, ry: yaw }, 14);
  const nose = at(0, len * 0.35);
  p.ellipsoid(r * 2, r * 2, len * 0.2, body, { x: nose.x, y, z: nose.z, ry: yaw }, 2);
  p.cyl(r * 0.25, r, len * 0.2, body, { x: rear.x, y, z: rear.z, rx: -Math.PI / 2 + 0.12, ry: yaw }, 12);
  // Cockpit glass, a cheat line and a row of cabin windows each side, the passenger doors.
  const cock = at(0, len * 0.405);
  p.box(r * 1.3, r * 0.32, len * 0.05, K.glassDark, { x: cock.x, y: y + r * 0.42, z: cock.z, ry: yaw, rx: -0.55 });
  for (const side of [-1, 1]) {
    const stripe = at(side * r * 0.99, 0);
    p.box(0.008, r * 0.28, len * 0.66, livery, { x: stripe.x, y: y - r * 0.35, z: stripe.z, ry: yaw });
    const rows = Math.round(len * 7);
    for (let i = 0; i < rows; i++) {
      const w = at(side * r * 1.0, len * 0.28 - (i * len * 0.58) / rows);
      p.box(0.008, r * 0.18, len * 0.022, 0x22303c, { x: w.x, y: y + r * 0.2, z: w.z, ry: yaw });
    }
    const door = at(side * r * 1.0, len * 0.3);
    p.box(0.008, r * 0.9, len * 0.035, 0xc9ced2, { x: door.x, y: y - r * 0.35, z: door.z, ry: yaw });
  }
  // Low swept wings, with winglets on a jet.
  for (const side of [-1, 1]) {
    const sweep = kind === 'jet' ? 0.42 : 0.08;
    const root = at(side * span * 0.25, -len * 0.02);
    p.box(span * 0.5, len * 0.012, len * (kind === 'jet' ? 0.13 : 0.09), 0xd8dcdf, {
      x: root.x, y: kind === 'jet' ? y - r * 0.55 : y + r * 0.85, z: root.z, ry: yaw + side * sweep,
    });
    const tip = at(side * span * 0.5, -len * (kind === 'jet' ? 0.13 : 0.03));
    if (kind === 'jet') p.box(0.012, len * 0.05, len * 0.04, livery, { x: tip.x, y: y - r * 0.55, z: tip.z, ry: yaw });
    // Engines: a podded turbofan under each wing, or a turboprop nacelle with its propeller on top of a high wing.
    if (kind === 'jet') {
      const e = at(side * span * 0.17, len * 0.01);
      p.cyl(r * 0.5, r * 0.44, len * 0.14, 0xb5bcc1, { x: e.x, y: y - r * 1.15, z: e.z, rx: Math.PI / 2, ry: yaw }, 12);
      const intake = at(side * span * 0.17, len * 0.15);
      p.cyl(r * 0.4, r * 0.4, 0.006, 0x1d2126, { x: intake.x, y: y - r * 1.15, z: intake.z, rx: Math.PI / 2, ry: yaw }, 12);
    } else {
      const e = at(side * span * 0.16, -len * 0.03);
      p.cyl(r * 0.36, r * 0.3, len * 0.18, 0xdfe2e4, { x: e.x, y: y + r * 0.7, z: e.z, rx: Math.PI / 2, ry: yaw }, 10);
      const prop = at(side * span * 0.16, len * 0.155);
      p.box(len * 0.13, 0.012, 0.012, 0x2a2c2f, { x: prop.x, y: y + r * 0.7, z: prop.z, ry: yaw, rz: 0.6 });
      p.box(len * 0.13, 0.012, 0.012, 0x2a2c2f, { x: prop.x, y: y + r * 0.7, z: prop.z, ry: yaw, rz: -0.9 });
    }
  }
  // Fin and tailplane: a T-tail on the turboprop.
  const fin = at(0, -len * 0.36);
  p.box(0.018, len * 0.17, len * 0.12, livery, { x: fin.x, y: y + r * 0.6, z: fin.z, ry: yaw, rx: -0.35 });
  for (const side of [-1, 1]) {
    const tp = at(side * len * 0.1, -len * 0.42);
    p.box(len * 0.2, 0.01, len * 0.06, 0xd8dcdf, { x: tp.x, y: kind === 'jet' ? y + r * 0.4 : y + r * 0.6 + len * 0.16, z: tp.z, ry: yaw + side * 0.25 });
  }
  // Undercarriage: nose gear and two main bogies.
  for (const [gx, gz] of [[0, 0.33], [-0.09, -0.02], [0.09, -0.02]]) {
    const g = at(gx * len, gz * len);
    p.box(0.012, y - r * 0.5, 0.012, 0x6b7279, { x: g.x, y: 0.02, z: g.z });
    p.cyl(0.035, 0.035, 0.05, K.tyre, { x: g.x, y: 0.035, z: g.z, rz: Math.PI / 2, ry: yaw }, 8);
  }
  p.tex = prevTex;
}

/** A single-engine high-wing light aircraft, about 8 m long and 11 m across: the plane every airfield has. */
function lightAircraft(p: Parts, x: number, z: number, yaw: number, color: number): void {
  const at = turn(x, z, yaw);
  p.tex = 0;
  const b = at(0, 0);
  p.box(0.12, 0.13, 0.62, 0xf2f2ef, { x: b.x, y: 0.1, z: b.z, ry: yaw });
  const nose = at(0, 0.36);
  p.box(0.1, 0.1, 0.12, 0xf2f2ef, { x: nose.x, y: 0.11, z: nose.z, ry: yaw });
  const spin = at(0, 0.43);
  p.box(0.2, 0.012, 0.01, 0x222, { x: spin.x, y: 0.16, z: spin.z, ry: yaw });
  const tail = at(0, -0.33);
  p.box(0.06, 0.07, 0.25, 0xf2f2ef, { x: tail.x, y: 0.15, z: tail.z, ry: yaw });
  const fin = at(0, -0.4);
  p.box(0.012, 0.15, 0.14, color, { x: fin.x, y: 0.2, z: fin.z, ry: yaw });
  const tp = at(0, -0.42);
  p.box(0.34, 0.01, 0.09, 0xf2f2ef, { x: tp.x, y: 0.2, z: tp.z, ry: yaw });
  const wing = at(0, 0.08);
  p.box(1.1, 0.018, 0.15, 0xf2f2ef, { x: wing.x, y: 0.24, z: wing.z, ry: yaw });
  for (const s of [-1, 1]) {
    const tip = at(s * 0.5, 0.08);
    p.box(0.1, 0.02, 0.15, color, { x: tip.x, y: 0.241, z: tip.z, ry: yaw });
    const strut = at(s * 0.18, 0.06);
    p.box(0.008, 0.12, 0.01, 0xcfd2d4, { x: strut.x, y: 0.12, z: strut.z, ry: yaw, rz: s * 0.9 });
    const g = at(s * 0.1, 0.0);
    p.cyl(0.025, 0.025, 0.02, K.tyre, { x: g.x, y: 0.025, z: g.z, rz: Math.PI / 2, ry: yaw }, 8);
  }
  const win = at(0, 0.18);
  p.box(0.125, 0.05, 0.12, K.glassDark, { x: win.x, y: 0.17, z: win.z, ry: yaw });
  const ng = at(0, 0.32);
  p.cyl(0.022, 0.022, 0.02, K.tyre, { x: ng.x, y: 0.022, z: ng.z, rz: Math.PI / 2, ry: yaw }, 8);
}

// ---- ground equipment and landside ----

function car(p: Parts, x: number, z: number, yaw: number, color: number, lift = 0): void {
  p.tex = 0;
  p.box(0.19, 0.08, 0.45, color, { x, y: lift + 0.035, z, ry: yaw });
  const c = turn(x, z, yaw)(0, -0.03);
  p.box(0.17, 0.06, 0.24, 0x2a3946, { x: c.x, y: lift + 0.115, z: c.z, ry: yaw });
}

/** Parked cars in marked bays, from x0..x1, z0..z1, on ground `lift` up (a car park deck). */
function carPark(p: Parts, x0: number, x1: number, z0: number, z1: number, seed: number, lift = 0): void {
  p.tex = 6;
  p.box(x1 - x0, 0.03, z1 - z0, 0x3d3f42, { x: (x0 + x1) / 2, y: lift + 0.03, z: (z0 + z1) / 2 });
  p.tex = 0;
  const colors = [0xb23a30, 0x2f5f8a, 0xe6e6e1, 0x2a2d31, 0x9aa1a8, 0x3f7a55, 0xd7a21f, 0x5a5f66];
  let row = 0;
  for (let z = z0 + 0.32; z < z1 - 0.2; z += 0.62, row++) {
    p.box(x1 - x0 - 0.1, 0.004, 0.02, K.paint, { x: (x0 + x1) / 2, y: lift + 0.062, z: z + 0.29 });
    let k = 0;
    for (let x = x0 + 0.17; x < x1 - 0.12; x += 0.27, k++) {
      p.box(0.012, 0.004, 0.42, K.paint, { x: x - 0.135, y: lift + 0.062, z });
      if ((k * 7 + row * 5 + seed) % 6 === 0) continue;
      car(p, x, z, row % 2 ? Math.PI : 0, colors[(k * 3 + row + seed) % colors.length], lift + 0.03);
    }
  }
}

function tug(p: Parts, x: number, z: number, yaw: number, carts: number): void {
  const at = turn(x, z, yaw);
  p.box(0.16, 0.1, 0.26, 0xd7a21f, { x, y: 0.03, z, ry: yaw });
  const cab = at(0, -0.06);
  p.box(0.15, 0.08, 0.1, 0x2a3946, { x: cab.x, y: 0.13, z: cab.z, ry: yaw });
  for (let i = 0; i < carts; i++) {
    const c = at(0, -0.38 - i * 0.32);
    p.box(0.17, 0.04, 0.26, 0x5a646d, { x: c.x, y: 0.04, z: c.z, ry: yaw });
    p.box(0.15, 0.1, 0.22, [0x2f5f8a, 0x8a4a32, 0x3f3f44][i % 3], { x: c.x, y: 0.08, z: c.z, ry: yaw });
  }
}

function fuelTruck(p: Parts, x: number, z: number, yaw: number): void {
  const at = turn(x, z, yaw);
  const cab = at(0, 0.36);
  p.box(0.24, 0.24, 0.22, 0xe6e6e1, { x: cab.x, y: 0.04, z: cab.z, ry: yaw });
  p.box(0.22, 0.08, 0.02, 0x2a3946, { x: at(0, 0.475).x, y: 0.18, z: at(0, 0.475).z, ry: yaw });
  const tank = at(0, -0.47);
  p.cyl(0.13, 0.13, 0.7, 0xd9dcdf, { x: tank.x, y: 0.2, z: tank.z, rx: Math.PI / 2, ry: yaw }, 12);
  const bed = at(0, -0.12);
  p.box(0.27, 0.04, 0.7, 0x2f7a55, { x: bed.x, y: 0.05, z: bed.z, ry: yaw });
}

function cateringTruck(p: Parts, x: number, z: number, yaw: number): void {
  const at = turn(x, z, yaw);
  const cab = at(0, 0.3);
  p.box(0.24, 0.22, 0.2, 0xe6e6e1, { x: cab.x, y: 0.04, z: cab.z, ry: yaw });
  const box = at(0, -0.08);
  p.box(0.2, 0.05, 0.5, 0x5a646d, { x: box.x, y: 0.06, z: box.z, ry: yaw });
  p.box(0.025, 0.2, 0.025, 0x5a646d, { x: box.x, y: 0.1, z: box.z, ry: yaw, rx: 0.5 });
  p.box(0.25, 0.22, 0.5, 0xf2f2ef, { x: box.x, y: 0.28, z: box.z, ry: yaw });
}

/** A floodlight mast for the apron: about 25 m tall with a bank of lamps. */
function floodMast(p: Parts, x: number, z: number, h: number): void {
  p.cyl(0.03, 0.05, h, K.steelDark, { x, y: 0.03, z }, 8);
  p.box(0.36, 0.1, 0.06, 0x3a3c3e, { x, y: h, z });
  for (let i = 0; i < 4; i++) p.box(0.07, 0.06, 0.02, K.edgeLight, { x: x - 0.12 + i * 0.08, y: h + 0.02, z: z - 0.035 });
}

/** A control tower: a tapered shaft, a service floor, the glazed cab and a mast with its radar on top. */
function controlTower(p: Parts, x: number, z: number, h: number, big: boolean): void {
  const r = big ? 0.24 : 0.12;
  p.tex = 6;
  p.box(r * 4, 0.3, r * 3.2, K.concrete, { x, y: 0.03, z });
  p.cyl(r * 0.8, r, h, K.concrete, { x, y: 0.03, z }, 14);
  p.tex = 0;
  p.cyl(r * 1.5, r * 0.9, 0.12, K.concreteDark, { x, y: 0.03 + h, z }, 14);
  const cab = big ? 0.32 : 0.2;
  p.cyl(r * 2.0, r * 1.6, cab, K.glass, { x, y: 0.15 + h, z }, 14);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    p.box(0.012, cab, 0.012, K.steelDark, { x: x + Math.cos(a) * r * 1.85, y: 0.15 + h, z: z + Math.sin(a) * r * 1.85 });
  }
  p.cyl(r * 2.15, r * 2.15, 0.05, K.roof, { x, y: 0.15 + h + cab, z }, 14);
  // The radio mast stands to one side, leaving the middle of the roof to the turning radar.
  p.cyl(0.012, 0.016, 0.3, K.steelDark, { x: x + r * 1.5, y: 0.2 + h + cab, z }, 6);
  p.sphere(0.03, K.red, { x: x + r * 1.5, y: 0.52 + h + cab, z }, 1);
}

function hangar(p: Parts, x: number, z: number, w: number, d: number, h: number): void {
  p.tex = 5;
  p.box(w, h, d, 0xb2b9bf, { x, y: 0.03, z });
  // A shallow barrel roof.
  p.cyl(d * 0.55, d * 0.55, w, 0x7d868f, { x: x - w / 2, y: 0.03 + h - d * 0.4, z, rz: -Math.PI / 2 }, 18);
  p.tex = 0;
  p.box(w * 0.86, h * 0.86, 0.02, 0x50585f, { x, y: 0.03, z: z - d / 2 - 0.01 });
  for (let i = 1; i < 6; i++) p.box(0.012, h * 0.86, 0.025, 0x3f454b, { x: x - w * 0.43 + (i * w * 0.86) / 6, y: 0.03, z: z - d / 2 - 0.015 });
}

/** A fence round the field, gapped at the front for the road. */
function perimeter(p: Parts): void {
  const ex = HX - 0.05;
  const ez = HZ - 0.05;
  const run = (x0: number, z0: number, x1: number, z1: number): void => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    p.box(alongX ? len : 0.01, 0.2, alongX ? 0.01 : len, 0x8b949b, { x: (x0 + x1) / 2, y: 0.03, z: (z0 + z1) / 2 });
    for (let d = 0; d <= len + 1e-6; d += 0.6) p.box(0.02, 0.24, 0.02, 0x5a646d, { x: alongX ? Math.min(x0, x1) + d : x0, y: 0.03, z: alongX ? z0 : Math.min(z0, z1) + d });
  };
  run(-ex, -ez, ex, -ez);
  run(-ex, -ez, -ex, ez);
  run(ex, -ez, ex, ez);
  run(-ex, ez, -0.55, ez);
  run(0.55, ez, ex, ez);
}

/** The road in from the gate, the curb road along the terminal front and its lane markings. */
function landside(p: Parts, curbZ: number, x0: number, x1: number): void {
  p.tex = 6;
  p.box(0.75, 0.032, HZ - curbZ, 0x3a3c3f, { y: 0.03, z: (HZ + curbZ) / 2 });
  p.box(x1 - x0, 0.032, 0.55, 0x3a3c3f, { x: (x0 + x1) / 2, y: 0.03, z: curbZ });
  p.box(x1 - x0, 0.06, 0.18, K.concrete, { x: (x0 + x1) / 2, y: 0.03, z: curbZ - 0.36 });
  p.tex = 0;
  for (let z = curbZ + 0.4; z < HZ - 0.1; z += 0.35) p.box(0.02, 0.005, 0.18, K.paint, { y: 0.063, z });
  for (let x = x0 + 0.2; x < x1 - 0.2; x += 0.35) p.box(0.18, 0.005, 0.02, K.paint, { x, y: 0.063, z: curbZ });
}

/**
 * A terminal hall from x0..x1, its airside face at z0 and landside face at z1, `floors` storeys of 4.5 m with a curtain
 * wall on both faces, a deep roof overhang and plant on the roof.
 */
function terminalHall(p: Parts, x0: number, x1: number, z0: number, z1: number, floors: number, accent: number): number {
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const h = floors * 0.45;
  p.tex = 6;
  p.box(w, 0.08, d, K.concrete, { x: cx, y: 0.03, z: cz });
  p.tex = 7;
  p.box(w - 0.04, h, d - 0.04, 0x9fb3c2, { x: cx, y: 0.11, z: cz });
  p.tex = 0;
  // Mullions and floor bands on both faces.
  for (let x = x0 + 0.25; x < x1 - 0.1; x += 0.25) {
    for (const fz of [z0, z1]) p.box(0.018, h, 0.02, K.steelDark, { x, y: 0.11, z: fz + (fz === z0 ? 0.01 : -0.01) });
  }
  for (let f = 1; f < floors; f++) for (const fz of [z0, z1]) p.box(w, 0.05, 0.03, K.white, { x: cx, y: 0.11 + f * 0.45, z: fz });
  // Roof: a deep overhang all round, an accent fascia, and plant on top.
  p.box(w + 0.3, 0.09, d + 0.4, K.white, { x: cx, y: 0.11 + h, z: cz });
  p.box(w + 0.32, 0.05, 0.03, accent, { x: cx, y: 0.14 + h, z: z1 + 0.21 });
  p.box(w + 0.32, 0.05, 0.03, accent, { x: cx, y: 0.14 + h, z: z0 - 0.21 });
  for (let i = 0; i < Math.floor(w / 1.4); i++) {
    p.box(0.36, 0.14, 0.26, 0x7b828a, { x: x0 + 0.6 + i * 1.4, y: 0.2 + h, z: cz });
    p.cyl(0.07, 0.07, 0.04, 0x3a3c3e, { x: x0 + 0.6 + i * 1.4, y: 0.34 + h, z: cz }, 10);
  }
  // Landside entrances: glass doors under a canopy.
  for (let x = x0 + 0.8; x < x1 - 0.5; x += 1.6) p.box(0.4, 0.22, 0.03, K.glassDark, { x, y: 0.11, z: z1 + 0.01 });
  return 0.11 + h + 0.09;
}

/** A jet bridge: a fixed rotunda at the terminal and a telescopic tunnel out to the aircraft door, on its drive wheels. */
function jetBridge(p: Parts, x0: number, z0: number, x1: number, z1: number, y: number): void {
  p.cyl(0.14, 0.14, y + 0.24, K.steel, { x: x0, y: 0.03, z: z0 }, 12);
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);
  p.box(0.2, 0.24, len, 0xc8ced3, { x: x0 + dx / 2, y, z: z0 + dz / 2, ry: yaw });
  p.box(0.21, 0.03, len, K.steelDark, { x: x0 + dx / 2, y: y + 0.24, z: z0 + dz / 2, ry: yaw });
  p.box(0.24, 0.3, 0.12, 0x5a646d, { x: x1, y: y - 0.02, z: z1, ry: yaw });
  const lx = x0 + dx * 0.7;
  const lz = z0 + dz * 0.7;
  p.box(0.04, y - 0.03, 0.04, K.steelDark, { x: lx, y: 0.03, z: lz });
  p.box(0.22, 0.05, 0.1, 0x3a3c3e, { x: lx, y: 0.03, z: lz, ry: yaw });
}

/** The ground of the whole field: mown grass, a strip of rougher grass round the edge, and the bed it all stands on. */
function field(p: Parts): void {
  p.tex = 0;
  p.box(2 * HX, 0.03, 2 * HZ, K.grass, { y: 0 });
  for (let i = 0; i < 9; i++) p.box(2 * HX, 0.002, 0.5, i % 2 ? K.grass : K.grassDry, { y: 0.031, z: -HZ + 0.55 + i * 1.0 });
  p.box(2 * HX * 0.98, 1.5, 2 * HZ * 0.98, 0x6d6b66, { y: -1.5, t: 6 });
}

function windsock(p: Parts, x: number, z: number): void {
  p.cyl(0.01, 0.014, 0.6, 0xe0e0da, { x, y: 0.03, z }, 6);
  p.cone(0.05, 0.3, 0xe0722a, { x: x + 0.15, y: 0.58, z, rz: -Math.PI / 2 }, 8);
  p.box(0.04, 0.1, 0.1, 0xf2f2ef, { x: x + 0.12, y: 0.53, z });
}

function fuelFarm(p: Parts, x: number, z: number, tanks: number): void {
  p.tex = 6;
  p.box(tanks * 0.62 + 0.2, 0.08, 0.8, K.concreteDark, { x, y: 0.03, z });
  p.tex = 5;
  for (let i = 0; i < tanks; i++) {
    const tx = x - ((tanks - 1) * 0.62) / 2 + i * 0.62;
    p.cyl(0.26, 0.26, 0.42, 0xdfe2e4, { x: tx, y: 0.11, z }, 16);
    p.cyl(0.27, 0.27, 0.02, 0x8a949c, { x: tx, y: 0.53, z }, 16);
  }
  p.tex = 0;
}

// ---- the three airports ----

/** Level 1, the municipal airfield: the full runway with a single taxiway, a small terminal, a hangar and light aircraft. */
function airfield(p: Parts): void {
  const rz = -3.35;
  const rw = 1.3;
  runway(p, rz, rw, 1);
  taxiway(p, -2.4, rz + rw / 2, -2.4, -1.15, 0.45, false);
  taxiway(p, 2.6, rz + rw / 2, 2.6, -0.95, 0.45, false);
  apron(p, -4.5, -0.3, -1.25, 1.25);
  apron(p, 1.3, 3.9, -1.0, 0.05);
  landside(p, 2.75, -4.6, 1.2);
  // The terminal: a single-storey building with a glazed front, a flat roof and a canopy on the airside.
  p.tex = 3;
  p.box(2.6, 0.42, 0.95, 0xe7e2d6, { x: -2.3, y: 0.03, z: 1.95 });
  p.tex = 0;
  p.box(2.8, 0.06, 1.1, K.roof, { x: -2.3, y: 0.45, z: 1.95 });
  p.box(2.8, 0.04, 0.03, 0x1f4f8a, { x: -2.3, y: 0.47, z: 2.51 });
  for (let i = 0; i < 6; i++) p.box(0.3, 0.24, 0.02, K.glass, { x: -3.4 + i * 0.44, y: 0.1, z: 2.43 });
  for (let i = 0; i < 5; i++) p.box(0.32, 0.22, 0.02, K.glass, { x: -3.3 + i * 0.5, y: 0.1, z: 1.47 });
  p.box(2.2, 0.03, 0.4, 0xd9dcdf, { x: -2.3, y: 0.36, z: 1.3 });
  for (const x of [-3.3, -2.3, -1.3]) p.box(0.025, 0.33, 0.025, K.steelDark, { x, y: 0.03, z: 1.13 });
  controlTower(p, -4.25, 1.95, 1.0, false);
  hangar(p, 2.6, 0.7, 1.9, 1.3, 0.62);
  fuelFarm(p, 0.2, 1.9, 1);
  windsock(p, 4.2, -1.9);
  // Aircraft: light singles tied down on the apron, one taxiing out, and a small twin turboprop at the terminal.
  lightAircraft(p, -4.0, -0.6, 0, 0xb23a30);
  lightAircraft(p, -2.8, -0.6, 0, 0x2f5f8a);
  lightAircraft(p, 2.0, -0.45, Math.PI / 2, 0x2f7a55);
  lightAircraft(p, -2.4, -2.0, Math.PI, 0xd7a21f);
  airliner(p, -1.1, 0.35, 0, 1.5, LIVERY[0], 'turboprop');
  carPark(p, 0.7, 4.5, 3.35, 4.6, 1);
  carPark(p, -4.5, -0.7, 3.35, 4.0, 3);
  fuelTruck(p, 3.3, -0.5, Math.PI / 2);
  perimeter(p);
}

/** Level 2, the regional airport: a parallel taxiway, a two-storey terminal with two gates, turboprops and a regional jet. */
function regional(p: Parts): void {
  const rz = -3.4;
  const rw = 1.55;
  runway(p, rz, rw, 2);
  const tz = -1.85;
  taxiway(p, -EDGE + 0.3, tz, EDGE - 0.3, tz, 0.5, false);
  for (const x of [-4.2, 0, 4.2]) taxiway(p, x, rz + rw / 2, x, tz, 0.5, false);
  apron(p, -4.55, 4.55, -1.6, 1.4);
  landside(p, 2.95, -4.6, 3.0);
  const top = terminalHall(p, -4.3, 1.6, 1.4, 2.65, 2, 0x2f5f8a);
  // A raised hall in the middle with the airport name band.
  p.tex = 7;
  p.box(1.6, 0.3, 0.9, 0xa8bccb, { x: -1.35, y: top, z: 2.0 });
  p.tex = 0;
  p.box(1.7, 0.05, 1.0, K.white, { x: -1.35, y: top + 0.3, z: 2.0 });
  p.box(1.2, 0.12, 0.02, 0x1f4f8a, { x: -1.35, y: top + 0.12, z: 2.51 });
  // Landside canopy over the drop-off curb.
  p.box(5.6, 0.04, 0.4, 0xd9dcdf, { x: -1.35, y: 0.42, z: 2.85 });
  for (let x = -4.0; x <= 1.4; x += 0.9) p.box(0.03, 0.39, 0.03, K.steelDark, { x, y: 0.03, z: 2.72 });
  // Two gates, boarding by airstairs: a turboprop and a regional jet, nose in to the terminal.
  stand(p, -3.0, 1.25, 2.6);
  stand(p, -0.0, 1.25, 2.6);
  airliner(p, -3.0, -0.15, 0, 2.7, LIVERY[1], 'turboprop');
  airliner(p, 0.0, -0.3, 0, 3.2, LIVERY[0], 'jet');
  for (const x of [-3.0, 0.0]) p.box(0.08, 0.2, 0.3, 0xd7d9db, { x: x - 0.25, y: 0.03, z: 0.75, rx: 0.4 });
  tug(p, -1.6, 0.6, Math.PI / 2, 3);
  fuelTruck(p, 1.1, 0.1, 0);
  cateringTruck(p, -4.0, 0.7, 0);
  hangar(p, 3.35, -0.35, 2.0, 1.6, 0.75);
  lightAircraft(p, 2.0, 1.0, Math.PI / 2, 0xb23a30);
  controlTower(p, 3.75, 2.15, 1.85, false);
  fuelFarm(p, 3.6, 4.15, 2);
  floodMast(p, -4.45, 1.1, 1.6);
  floodMast(p, 1.5, 1.1, 1.6);
  carPark(p, -4.6, -0.55, 3.4, 4.75, 2);
  carPark(p, 0.55, 2.6, 3.4, 4.75, 5);
  windsock(p, 4.4, -2.4);
  perimeter(p);
}

/** Level 3, the international airport: a big two-level terminal with three jet bridges, a full lighting system and a tall tower. */
function international(p: Parts): void {
  const rz = -3.4;
  const rw = 1.8;
  runway(p, rz, rw, 3);
  const tz = -2.1;
  taxiway(p, -EDGE + 0.3, tz, EDGE - 0.3, tz, 0.5, true);
  for (const x of [-4.3, -1.6, 1.6, 4.3]) taxiway(p, x, rz + rw / 2, x, tz, 0.5, true);
  apron(p, -EDGE, EDGE, -1.85, 1.35);
  landside(p, 3.1, -EDGE, EDGE);
  const top = terminalHall(p, -4.6, 3.3, 1.35, 2.85, 3, 0x1f4f8a);
  // A long, gently arched roof over the hall, the way modern terminals are built, laid as a run of tilted panels.
  p.tex = 5;
  const panels = 6;
  for (let i = 0; i < panels; i++) {
    const a = -1 + (2 * (i + 0.5)) / panels;
    const zc = 2.1 + a * 1.0;
    p.box(8.2, 0.05, 2.0 / panels + 0.04, 0xdfe3e6, { x: -0.65, y: top + 0.04 + 0.2 * (1 - a * a), z: zc, rx: 0.4 * a * 0.5 });
  }
  p.tex = 0;
  // Departures: an elevated drop-off deck along the front on columns, with a glass canopy over it.
  p.tex = 6;
  p.box(7.4, 0.06, 0.6, K.concrete, { x: -0.65, y: 0.5, z: 3.2 });
  p.tex = 0;
  for (let x = -4.2; x <= 2.9; x += 0.9) p.box(0.06, 0.47, 0.06, K.concreteDark, { x, y: 0.03, z: 3.44 });
  p.box(7.4, 0.06, 0.03, K.steel, { x: -0.65, y: 0.56, z: 3.49 });
  p.box(7.4, 0.03, 0.65, 0x9fc0d4, { x: -0.65, y: 0.95, z: 3.15 });
  for (let x = -4.2; x <= 2.9; x += 1.8) p.box(0.03, 0.39, 0.03, K.steelDark, { x, y: 0.56, z: 3.45 });
  // Three contact gates with jet bridges, each with a jet nose in on stand and its ground crew.
  const gates = [-3.4, -0.4, 2.6];
  gates.forEach((gx, i) => {
    stand(p, gx, 1.15, 2.9);
    airliner(p, gx, -0.45, 0, 3.1, LIVERY[i % LIVERY.length], 'jet');
    jetBridge(p, gx - 0.65, 1.55, gx - 0.24, 0.6, 0.36);
    tug(p, gx + 0.95, 1.0, -Math.PI / 2, 2);
    fuelTruck(p, gx + 0.75, 0.62, Math.PI / 2);
  });
  // A jet on its take-off roll.
  airliner(p, -1.2, rz + 0.08, -Math.PI / 2, 3.0, LIVERY[4], 'jet');
  for (const x of [-4.4, -1.9, 1.1, 4.6]) floodMast(p, x, 1.0, 2.2);
  // Landside: a multi-storey car park with cars on every deck, a surface lot, the tall tower and the fuel farm.
  p.tex = 6;
  for (let x = -4.25; x <= -0.95; x += 0.55) for (const z of [3.78, 4.72]) p.box(0.05, 0.62, 0.05, K.concreteDark, { x, y: 0.03, z });
  p.tex = 0;
  for (let f = 0; f < 3; f++) carPark(p, -4.3, -0.9, 3.75, 4.75, f + 2, f * 0.32);
  for (let f = 1; f < 3; f++) p.box(3.4, 0.04, 0.03, K.white, { x: -2.6, y: 0.06 + f * 0.32, z: 4.76 });
  carPark(p, 0.55, 3.3, 3.75, 4.75, 4);
  controlTower(p, 4.0, 4.05, 2.85, true);
  fuelFarm(p, 4.1, 2.25, 2);
  windsock(p, 4.1, -2.65);
  perimeter(p);
}

/** The airport as it looks at a level: the 3x3-tile field with its runway, and the terminal that level adds. */
export function airportGeometry(level: number): THREE.BufferGeometry {
  const p = new Parts();
  field(p);
  const L = Math.max(1, Math.min(3, level));
  if (L === 1) airfield(p);
  else if (L === 2) regional(p);
  else international(p);
  return p.build();
}
