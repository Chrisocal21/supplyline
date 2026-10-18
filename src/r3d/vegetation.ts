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

/** Shared, bounded-cost trees. All coordinates are relative to the foot of the trunk. */
export function addTree(
  p: Parts, kind: TreeKind, x: number, y: number, z: number,
  height = 1.4, variant = 0, leafColor?: number,
): void {
  const scale = height / 1.4;
  const phase = variant * 2.399;
  const bark = kind === 'birch' ? 0xc7c5b5 : 0x695847;
  const trunk = kind === 'birch' ? 0.038 : 0.06;
  p.cyl(trunk * 0.35 * scale, trunk * scale, height * 0.82, bark, { x, y, z, t: 2 }, 7);
  if (kind === 'palm') {
    for (let i = 0; i < 8; i++) {
      const a = phase + i * Math.PI / 4;
      for (let segment = 0; segment < 3; segment++) {
        const reach = (0.12 + segment * 0.13) * scale;
        p.ellipsoid(0.29 * scale, 0.035 * scale, (0.11 - segment * 0.025) * scale,
          i % 2 ? 0x607948 : 0x466843, {
            x: x + Math.cos(a) * reach, y: y + height * 0.84 - segment * segment * 0.027 * scale,
            z: z + Math.sin(a) * reach, ry: -a, rz: -segment * 0.18, t: 0,
          }, 0);
      }
    }
    return;
  }
  if (kind === 'pine') {
    for (let tier = 0; tier < 6; tier++) {
      const py = y + (0.25 + tier * 0.185) * scale;
      const spread = (0.37 - tier * 0.046) * scale;
      p.cone(spread * 0.85, 0.4 * scale, leafColor ?? 0x3d5545, { x, y: py, z, t: 0 }, 7);
      for (let branch = 0; branch < 4; branch++) {
        const a = phase + branch * Math.PI / 2 + tier * 2.4;
        p.cone(spread * 0.58, (0.25 + branch * 0.01) * scale,
          leafColor ?? (tier % 2 ? 0x526951 : 0x354e40), {
            x: x + Math.cos(a) * spread * 0.62, y: py - 0.05 * scale,
            z: z + Math.sin(a) * spread * 0.62,
            rx: Math.sin(a) * 0.22, rz: -Math.cos(a) * 0.22, t: 0,
          }, 6);
      }
    }
    return;
  }
  const narrow = kind === 'birch';
  const crown = (kind === 'orchard' ? 0.34 : narrow ? 0.25 : 0.4) * scale;
  const colors = narrow ? [0x79865b, 0x63764f, 0x8c9669] : [0x526747, 0x63764e, 0x405a41];
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
        0.018 * scale, 0x565852, { x, y: y + height * (0.08 + i * 0.14), z, t: 0 }, 7);
    }
  }
}

export function treeGeometry(kind: TreeKind, variant = 0) {
  const p = new Parts();
  addTree(p, kind, 0, 0, 0, 1.4, variant);
  return p.build();
}
