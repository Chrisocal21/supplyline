import { Color } from 'three';
import { expect, it } from 'vitest';
import { meters } from '../scale';
import { truckGeometry } from './trucks';

it.each(['boxtruck', 'bigtruck', 'rig', 'convoy'] as const)('%s keeps cargo ribs clear of the side stripes', kind => {
  const geometry = truckGeometry(kind);
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const color = geometry.getAttribute('color');
  const mid = geometry.getAttribute('mid');
  const ribColor = new Color(0x939c9a);
  const stripeColors = [0x496879, 0x8a5045, 0x566c5e].map(hex => new Color(hex));
  const matches = (i: number, c: Color) => Math.abs(color.getX(i) - c.r) < 1e-6 &&
    Math.abs(color.getY(i) - c.g) < 1e-6 && Math.abs(color.getZ(i) - c.b) < 1e-6;
  const ribs: number[] = [];
  const stripes: number[] = [];
  for (let i = 0; i < position.count; i++) {
    // Only the outward-facing side surfaces, where the stripe and each vertical rib intersect.
    if (Math.abs(normal.getX(i)) < 0.99 || normal.getX(i) * position.getX(i) <= 0) continue;
    if (mid.getX(i) === 5 && matches(i, ribColor)) ribs.push(Math.abs(position.getX(i)));
    if (mid.getX(i) === 0 && stripeColors.some(c => matches(i, c))) stripes.push(Math.abs(position.getX(i)));
  }
  expect(ribs.length).toBeGreaterThan(0);
  expect(stripes.length).toBeGreaterThan(0);
  expect(Math.min(...ribs) - Math.max(...stripes)).toBeGreaterThan(meters(0.02));
  geometry.dispose();
});
