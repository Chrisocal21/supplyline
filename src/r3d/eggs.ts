// Things to find in the opening if you look closely: a few conspiracy theories from a made-up world, taken very seriously by
// the people who live in it. Scenery only; none of it is in the game world or the save.
import * as THREE from 'three';
import { Parts } from './parts';
import type { OpeningProps } from './opening';

type Tile = { x: number; y: number };

/** A flat sign with its own words, drawn onto a canvas. */
export function signTexture(lines: string[], bg: string, fg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 492, 236);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = lines.length > 2 ? 52 : 64;
  ctx.font = `bold ${size}px sans-serif`;
  lines.forEach((l, i) => ctx.fillText(l, 256, 128 + (i - (lines.length - 1) / 2) * (size + 10), 470));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A pole with a stout frame, for a sign panel to hang on. */
export function signPostGeometry(w: number, h: number, top: number): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(0.04, 0.05, top, 0x6a4a30, { x: -w * 0.4, y: 0 }, 6);
  p.cyl(0.04, 0.05, top, 0x6a4a30, { x: w * 0.4, y: 0 }, 6);
  p.box(w + 0.1, 0.06, 0.06, 0x6a4a30, { y: top - h - 0.06, z: -0.02 });
  p.box(w + 0.1, 0.06, 0.06, 0x6a4a30, { y: top, z: -0.02 });
  return p.build();
}

/** A bird that is not a bird: a grey body, a lens for an eye, a little aerial with a red light, and a tail like a rudder. */
export function droneBirdGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(0.16, 0.09, 0.26, 0x8d949b, { y: 0.0 });
  p.sphere(0.06, 0x8d949b, { y: 0.06, z: 0.15 }, 1);
  p.cone(0.03, 0.09, 0xe8a23a, { y: 0.06, z: 0.24, rx: Math.PI / 2 }, 6);
  p.sphere(0.022, 0x1f2124, { x: -0.04, y: 0.09, z: 0.2 }, 0);
  p.sphere(0.022, 0x1f2124, { x: 0.04, y: 0.09, z: 0.2 }, 0);
  for (const sx of [-1, 1]) p.box(0.32, 0.012, 0.12, 0xaab1b6, { x: sx * 0.24, y: 0.03, z: -0.01, rz: sx * 0.18 });
  p.box(0.03, 0.12, 0.03, 0x555a60, { x: 0, y: 0.08, z: -0.08 });
  p.sphere(0.022, 0xff3b30, { x: 0, y: 0.2, z: -0.08 }, 0);
  p.box(0.1, 0.012, 0.12, 0x6c737a, { y: 0.02, z: -0.2 });
  return p.build();
}

/** A tall, shy, hairy figure with long arms, caught peering round a tree. */
export function bigfootGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  const fur = 0x4a3426;
  const lite = 0x5e4533;
  for (const sx of [-1, 1]) {
    p.box(0.1, 0.34, 0.1, fur, { x: sx * 0.09, y: 0.0 });
    p.box(0.12, 0.05, 0.16, 0x2f241c, { x: sx * 0.09, y: 0.0, z: 0.03 });
    p.box(0.08, 0.4, 0.08, lite, { x: sx * 0.22, y: 0.24, z: 0.02, rz: sx * 0.08 });
  }
  p.box(0.34, 0.42, 0.2, fur, { y: 0.3 });
  p.box(0.26, 0.2, 0.16, lite, { y: 0.54 });
  p.box(0.18, 0.18, 0.16, fur, { y: 0.74, z: 0.02 });
  p.box(0.12, 0.08, 0.02, 0xc8a98a, { y: 0.78, z: 0.11 });
  p.sphere(0.018, 0xffffff, { x: -0.035, y: 0.82, z: 0.11 }, 0);
  p.sphere(0.018, 0xffffff, { x: 0.035, y: 0.82, z: 0.11 }, 0);
  p.box(0.07, 0.03, 0.02, 0x2f241c, { y: 0.76, z: 0.12 });
  // A camera hung round his neck, as one does.
  p.box(0.08, 0.06, 0.04, 0x2a2d31, { y: 0.52, z: 0.12 });
  return p.build();
}

/** Three raccoons in a long coat: the mayor. */
export function mayorGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  const grey = 0x8a8f94;
  const mask = 0x1f2124;
  // The coat.
  p.box(0.34, 0.8, 0.22, 0xa8896a, { y: 0.0 });
  p.box(0.36, 0.05, 0.24, 0x6e5a44, { y: 0.4 });
  p.box(0.06, 0.34, 0.01, 0xb23a30, { y: 0.36, z: 0.115 });
  for (const sx of [-1, 1]) p.box(0.08, 0.3, 0.1, 0x8a6e52, { x: sx * 0.2, y: 0.38, rz: sx * 0.12 });
  // Three heads, one above another, each in a tiny mask.
  for (let i = 0; i < 3; i++) {
    const y = 0.8 + i * 0.2;
    p.sphere(0.1, grey, { y: y + 0.1 }, 1);
    p.box(0.2, 0.05, 0.04, mask, { y: y + 0.12, z: 0.08 });
    p.sphere(0.025, 0xffffff, { x: -0.04, y: y + 0.12, z: 0.1 }, 0);
    p.sphere(0.025, 0xffffff, { x: 0.04, y: y + 0.12, z: 0.1 }, 0);
    p.sphere(0.02, mask, { y: y + 0.07, z: 0.1 }, 0);
    for (const sx of [-1, 1]) p.cone(0.04, 0.07, grey, { x: sx * 0.07, y: y + 0.19 }, 5);
  }
  p.cyl(0.11, 0.11, 0.04, 0x22262b, { y: 1.4 }, 12);
  p.cyl(0.07, 0.07, 0.1, 0x22262b, { y: 1.44 }, 12);
  p.box(0.2, 0.02, 0.1, 0xd7a21f, { y: 1.46, z: 0.0 });
  // Ringed tail.
  for (let i = 0; i < 4; i++) p.box(0.07, 0.07, 0.07, i % 2 ? 0x1f2124 : grey, { y: 0.1 + i * 0.05, z: -0.15 - i * 0.07 });
  return p.build();
}

/** A hangar, a fence and a tarpaulin with something saucer-shaped under it: nothing to see. */
export function area52Geometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.box(2.6, 0.02, 2.4, 0x9a9588);
  // Fence.
  for (let i = -6; i <= 6; i++) for (const z of [-1.2, 1.2]) p.box(0.04, 0.22, 0.04, 0x555a60, { x: i * 0.2, y: 0.02, z });
  for (let i = -5; i <= 5; i++) for (const x of [-1.3, 1.3]) p.box(0.04, 0.22, 0.04, 0x555a60, { x, y: 0.02, z: i * 0.22 });
  for (const z of [-1.2, 1.2]) p.box(2.6, 0.02, 0.02, 0x8a9096, { y: 0.2, z });
  for (const x of [-1.3, 1.3]) p.box(0.02, 0.02, 2.4, 0x8a9096, { x, y: 0.2 });
  // Hangar.
  p.tex = 5;
  p.box(1.0, 0.4, 0.8, 0xaab2b9, { x: -0.4, y: 0.02, z: -0.5 });
  p.gable(1.08, 0.2, 0.9, 0x58606a, { x: -0.4, y: 0.42, z: -0.5, ry: Math.PI / 2 });
  p.tex = 0;
  p.box(0.6, 0.3, 0.02, 0x2a2e33, { x: -0.4, y: 0.02, z: -0.09 });
  // The tarpaulin.
  p.cone(0.4, 0.16, 0x7d8a94, { x: 0.6, y: 0.02, z: 0.5 }, 12);
  p.cyl(0.52, 0.52, 0.04, 0x7d8a94, { x: 0.6, y: 0.02, z: 0.5 }, 16);
  p.dome(0.2, 0x7d8a94, { x: 0.6, y: 0.18, z: 0.5 });
  // A pizza truck, because the staff have to eat.
  p.box(0.34, 0.16, 0.2, 0xe9e6dc, { x: -0.7, y: 0.03, z: 0.7 });
  p.box(0.1, 0.12, 0.2, 0xc0392b, { x: -0.5, y: 0.03, z: 0.7 });
  p.cone(0.06, 0.04, 0xf2d36b, { x: -0.7, y: 0.22, z: 0.7 }, 3);
  // A guard hut.
  p.box(0.2, 0.2, 0.2, 0xd8d2c4, { x: 0.1, y: 0.02, z: 1.0 });
  p.box(0.24, 0.03, 0.24, 0x4f545c, { x: 0.1, y: 0.22, z: 1.0 });
  return p.build();
}

/** The dish that turns, over Area 52. */
export function radarDishGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(0.04, 0.06, 0.4, 0x8a9096, { y: 0 }, 8);
  p.cyl(0.3, 0.05, 0.1, 0xe6e6e1, { y: 0.4, rz: 0.5 }, 18);
  p.box(0.02, 0.18, 0.02, 0x555a60, { x: 0.12, y: 0.42, rz: 0.5 });
  return p.build();
}

/** Crop circle: rings and spokes pressed into the wheat. */
export function cropCircleGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(1.6, 1.6, 0.012, 0xc4a64c, { y: 0.0 }, 28);
  for (const [r, w] of [[1.3, 0.12], [0.95, 0.1], [0.55, 0.08]]) {
    p.cyl(r + w, r + w, 0.014, 0xa88a36, { y: 0.0 }, 28);
    p.cyl(r, r, 0.016, 0xc4a64c, { y: 0.0 }, 28);
  }
  for (let i = 0; i < 6; i++) p.box(0.1, 0.018, 1.2, 0xa88a36, { y: 0.0, ry: (i / 6) * Math.PI });
  p.cyl(0.22, 0.22, 0.02, 0xa88a36, { y: 0.0 }, 12);
  return p.build();
}

/** A hay bale with sunglasses, on lookout. */
export function lookoutBaleGeometry(): THREE.BufferGeometry {
  const p = new Parts();
  p.cyl(0.2, 0.2, 0.34, 0xd0b050, { y: 0.0, rz: Math.PI / 2 }, 12);
  p.box(0.3, 0.06, 0.02, 0x1f2124, { y: 0.2, z: 0.2 });
  p.box(0.06, 0.04, 0.02, 0x1f2124, { y: 0.2, z: 0.2 });
  return p.build();
}

export interface EggContext {
  /** An open spot of grass near a tile, clear of buildings, roads, towns and nodes, or null. */
  spot: (near: Tile, rmin: number, rmax: number) => Tile | null;
  /** The first town, an airport, a farm, a forestry camp, a quarry or mountain tile, a dock and a stretch of sea, where they exist. */
  at: { town?: Tile; airport?: Tile; farm?: Tile; forest?: Tile; hill?: Tile; dock?: Tile; sea?: Tile[] };
}

/** Put the conspiracies out. Each is small and sits where it makes the most sense. */
export function placeEggs(props: OpeningProps, ctx: EggContext): void {
  const { at } = ctx;
  const sign = (near: Tile | undefined, rmin: number, rmax: number, lines: string[], bg: string, fg: string, yaw: number, w = 3.2): Tile | null => {
    if (!near) return null;
    const t = ctx.spot(near, rmin, rmax);
    if (!t) return null;
    props.addSign(lines, t, yaw, w, bg, fg);
    return t;
  };
  // The first town: a flat-earth meeting, and a mayor who is three raccoons.
  if (at.town) {
    const t = sign(at.town, 6, 12, ['THE WORLD IS FLAT', '(we checked the globe)'], '#f1e7c8', '#3a2a14', 0.5);
    if (t) props.addStatic(lookoutBaleGeometry(), { x: t.x + 1, y: t.y }, 0.4, 2.2);
    const m = ctx.spot(at.town, 5, 9);
    if (m) {
      props.addStatic(mayorGeometry(), m, 3.5, 2.2);
      const k = ctx.spot(m, 2, 3);
      if (k) props.addSign(['THE MAYOR IS', 'THREE RACCOONS'], k, 3.5, 2.8, '#2a323c', '#f2d36b');
    }
  }
  // The airport: birds are not real, and these ones have aerials.
  if (at.airport) {
    sign(at.airport, 5, 8, ["BIRDS AREN'T REAL"], '#1f3a5c', '#ffffff', 0.9);
    const loop: Tile[] = [];
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      loop.push({ x: Math.round(at.airport.x + 2 + Math.cos(a) * 4), y: Math.round(at.airport.y + Math.sin(a) * 3) });
    }
    for (let i = 0; i < 3; i++) props.addMover(droneBirdGeometry(), loop.concat(loop.slice().reverse()), 0.9 + i * 0.12, 2.0, { alt: 3.5 + i * 0.7, bob: 0.25, phase: i * 9 });
  }
  // The farm: a crop circle, and a bale keeping watch.
  if (at.farm) {
    const c = ctx.spot(at.farm, 4, 7);
    if (c) {
      props.addStatic(cropCircleGeometry(), c, 0.3, 1.0);
      const k = ctx.spot(c, 2, 4);
      if (k) props.addSign(['NOT ALIENS.', 'GERALD.'], k, 0.6, 2.6, '#e9e2c4', '#4a2f14');
    }
    sign(at.farm, 8, 12, ['COWS ARE ALIEN SPIES', 'MOO RESPONSIBLY'], '#2f3b2a', '#f4f1e2', 1.9);
  }
  // The woods: someone is watching the sawmill.
  if (at.forest) {
    const b = ctx.spot(at.forest, 4, 7);
    if (b) {
      props.addStatic(bigfootGeometry(), b, 2.6, 2.4);
      const k = ctx.spot(b, 2, 4);
      if (k) props.addSign(['THE SAWMILL', 'IS A COVER-UP'], k, 2.6, 2.8, '#3a2a1a', '#f2d36b');
    }
  }
  // The hills: Area 52, which does not exist.
  if (at.hill) {
    const h = ctx.spot(at.hill, 3, 8);
    if (h) {
      props.addStatic(area52Geometry(), h, 0.4, 1.2);
      props.addSpinner(radarDishGeometry(), { x: h.x, y: h.y + 1 }, 1.4, 1.2, 0);
      const k = ctx.spot(h, 3, 5);
      if (k) props.addSign(['AREA 52', 'NOTHING TO SEE HERE'], k, 0.4, 3.2, '#8a1f1a', '#ffffff');
    }
  }
  // The docks.
  if (at.dock) sign(at.dock, 5, 9, ['SHIPS ARE JUST WAREHOUSES', 'THAT FLOAT'], '#16324a', '#e8f3fb', 1.2);
}
