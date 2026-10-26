import { Parts } from './parts';

export type TreeKind = 'pine' | 'oak' | 'birch' | 'orchard' | 'palm';

/** Cheap crop rows with mixed green and ripening plants, merged into the field mesh. */
export function addCropRows(p: Parts, x: number, z: number, width: number, depth: number, rows: number, columns: number, y = 0.035): void {
  for (let row = 0; row < rows; row++) {
    const cz = z - depth / 2 + (row + 0.5) * depth / rows;
    p.box(width, 0.012, depth / rows * 0.55, 0x756345, { x, y, z: cz, t: 0 });
    for (let col = 0; col < columns; col++) {
      const cx = x - width / 2 + (col + 0.5) * width / columns;
      const mature = (row * 7 + col * 3) % 5 > 1;
      const height = 0.09 + ((row + col * 3) % 4) * 0.017;
      const color = mature ? 0xa49a52 : 0x627940;
      p.box(0.008, height, 0.008, color, { x: cx, y: y + 0.012, z: cz, t: 0 });
      p.box(0.065, 0.008, 0.018, color, { x: cx, y: y + height * 0.55, z: cz, rz: col % 2 ? 0.35 : -0.35, t: 0 });
      p.cone(0.014, 0.045, mature ? 0xb8ab69 : 0x78904b, { x: cx, y: y + height, z: cz, t: 0 }, 4);
    }
  }
}

/** A low shrub: four overlapping lumps of leaf, brighter on top. */
export function addBush(p: Parts, x: number, y: number, z: number, s = 1): void {
  const prev = p.foliage;
  p.foliage = { base: y, height: 0.5 * s };
  p.sphere(0.34 * s, 0x5f9040, { x, y: y + 0.2 * s, z }, 1);
  p.sphere(0.26 * s, 0x76a448, { x: x + 0.28 * s, y: y + 0.15 * s, z: z + 0.1 * s }, 1);
  p.sphere(0.24 * s, 0x4d7e38, { x: x - 0.22 * s, y: y + 0.14 * s, z: z - 0.14 * s }, 1);
  p.sphere(0.18 * s, 0x84ad4e, { x: x + 0.02 * s, y: y + 0.34 * s, z: z - 0.05 * s }, 1);
  p.foliage = prev;
}

/** Shared, bounded-cost trees. All coordinates are relative to the foot of the trunk. */
export function addTree(
  p: Parts, kind: TreeKind, x: number, y: number, z: number,
  height = 1.4, variant = 0, leafColor?: number,
): void {
  const prev = p.foliage;
  p.foliage = { base: y, height };
  buildTree(p, kind, x, y, z, height, variant, leafColor);
  p.foliage = prev;
}

function buildTree(
  p: Parts, kind: TreeKind, x: number, y: number, z: number,
  height: number, variant: number, leafColor?: number,
): void {
  const scale = height / 1.4;
  const phase = variant * 2.399;
  const bark = kind === 'birch' ? 0xd2cdb8 : 0x77593f;
  const trunk = kind === 'birch' ? 0.038 : 0.06;
  p.cyl(trunk * 0.35 * scale, trunk * scale, height * 0.82, bark, { x, y, z, t: 2 }, 7);
  if (kind === 'palm') {
    for (let i = 0; i < 8; i++) {
      const a = phase + i * Math.PI / 4;
      for (let segment = 0; segment < 3; segment++) {
        const reach = (0.12 + segment * 0.13) * scale;
        p.ellipsoid(0.29 * scale, 0.035 * scale, (0.11 - segment * 0.025) * scale,
          i % 2 ? 0x6a9a48 : 0x4a7f46, {
            x: x + Math.cos(a) * reach, y: y + height * 0.84 - segment * segment * 0.027 * scale,
            z: z + Math.sin(a) * reach, ry: -a, rz: -segment * 0.18, t: 0,
          }, 0);
      }
    }
    return;
  }
  if (kind === 'pine') {
    // Broad skirts of needles, stacked and overlapping, so the tree reads as a few big tiers with a clear outline.
    for (let tier = 0; tier < 5; tier++) {
      const py = y + (0.22 + tier * 0.22) * scale;
      const spread = (0.42 - tier * 0.062) * scale;
      p.cone(spread * 0.92, 0.46 * scale, leafColor ?? (tier % 2 ? 0x3a7a4c : 0x2c6847), { x, y: py, z, t: 0 }, 8);
      for (let branch = 0; branch < 3; branch++) {
        const a = phase + branch * Math.PI * 2 / 3 + tier * 2.4;
        p.cone(spread * 0.6, 0.28 * scale,
          leafColor ?? [0x43864f, 0x2f6c48, 0x4a8c52][branch], {
            x: x + Math.cos(a) * spread * 0.66, y: py - 0.05 * scale,
            z: z + Math.sin(a) * spread * 0.66,
            rx: Math.sin(a) * 0.22, rz: -Math.cos(a) * 0.22, t: 0,
          }, 6);
      }
    }
    return;
  }
  const narrow = kind === 'birch';
  const crown = (kind === 'orchard' ? 0.34 : narrow ? 0.25 : 0.4) * scale;
  const colors = narrow ? [0x93aa58, 0x7d984c, 0xaabd68] : [0x5f9140, 0x74a048, 0x4a7f3a];
  for (let i = 0; i < 7; i++) {
    const a = phase + i * 2.399;
    const reach = i === 6 ? crown * 0.1 : crown * 0.65;
    const cx = x + Math.cos(a) * reach;
    const cz = z + Math.sin(a) * reach;
    const cy = y + height * (0.52 + (i % 3) * (narrow ? 0.13 : 0.08));
    if (i < 4) p.cyl(0.009 * scale, 0.022 * scale, height * 0.3, bark, {
      x: x + Math.cos(a) * reach * 0.4, y: y + height * 0.33,
      z: z + Math.sin(a) * reach * 0.4,
      rx: Math.sin(a) * 0.55, rz: -Math.cos(a) * 0.55, t: 2,
    }, 5);
    p.ellipsoid(crown * 1.4, crown * (narrow ? 2.1 : 1.35), crown * 1.25,
      leafColor ?? colors[i % 3], { x: cx, y: cy, z: cz, ry: a, t: 0 }, 1);
  }
  if (narrow) {
    for (let i = 0; i < 4; i++) {
      p.cyl(trunk * scale * (0.92 - i * 0.16), trunk * scale * (0.96 - i * 0.16),
        0.018 * scale, 0x6b6a5e, { x, y: y + height * (0.08 + i * 0.14), z, t: 0 }, 7);
    }
  }
}

export function treeGeometry(kind: TreeKind, variant = 0) {
  const p = new Parts();
  addTree(p, kind, 0, 0, 0, 1.4, variant);
  return p.build();
}

/** A distant stand-in with the same silhouette and footprint as `treeGeometry`, at a few percent of the cost. */
export function treeLodGeometry(kind: TreeKind) {
  const p = new Parts();
  const bark = kind === 'birch' ? 0xd2cdb8 : 0x77593f;
  p.foliage = { base: 0, height: 1.4 };
  if (kind === 'pine') {
    p.cyl(0.02, 0.06, 0.4, bark, { y: 0, t: 2 }, 4);
    p.cone(0.42, 0.8, 0x2f6c48, { y: 0.25, t: 0 }, 6);
    p.cone(0.3, 0.85, 0x3a7a4c, { y: 0.72, t: 0 }, 6);
  } else if (kind === 'birch') {
    p.cyl(0.02, 0.038, 0.9, bark, { y: 0, t: 2 }, 4);
    p.ellipsoid(0.66, 0.8, 0.6, 0x8aa253, { y: 0.86, t: 0 }, 1);
  } else {
    p.cyl(0.03, 0.06, 0.7, bark, { y: 0, t: 2 }, 4);
    p.ellipsoid(1.05, 0.75, 0.95, 0x679643, { y: 0.86, t: 0 }, 1);
  }
  return p.build();
}
