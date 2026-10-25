import { describe, expect, it } from 'vitest';
import { SITE_DEFS, SITE_FOOTPRINT, type SiteKind } from '../sim/defs';
import { LOT, TILE_UNITS } from '../scale';
import { airportGeometry } from './airport';
import { siteFit, siteGeometryAt } from './models';

const kinds = (Object.keys(SITE_DEFS) as SiteKind[]).filter((k) => !SITE_DEFS[k].airport && !SITE_DEFS[k].port && !SITE_DEFS[k].station);

describe('a building fits the ground it is given', () => {
  it('stays inside its one-tile lot at every level, once fitted', () => {
    const over: string[] = [];
    for (const kind of kinds) {
      for (const level of kind === 'hub' || SITE_DEFS[kind].dock ? [1, 2, 3] : [1, 3, 4, 6, 8, 10]) {
        const g = siteGeometryAt(kind, level);
        g.computeBoundingBox();
        const b = g.boundingBox!;
        const f = siteFit(kind, level);
        const ext = Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z) * f;
        if (ext > LOT / 2 + 1e-6) over.push(`${kind}@${level} reaches ${ext.toFixed(2)}`);
        expect(f).toBeGreaterThan(0.4);
        expect(f).toBeLessThanOrEqual(1);
      }
    }
    expect(over).toEqual([]);
  }, 120000);

  it('an upgrade grows taller, not wider than its lot', () => {
    for (const kind of ['sawmill', 'farm', 'bakery'] as SiteKind[]) {
      const a = siteGeometryAt(kind, 1);
      const b = siteGeometryAt(kind, 10);
      a.computeBoundingBox();
      b.computeBoundingBox();
      expect(b.boundingBox!.max.y).toBeGreaterThan(a.boundingBox!.max.y);
    }
  }, 120000);

  it('an airport is a rectangle: its model fills exactly the tiles of its footprint', () => {
    const fp = SITE_FOOTPRINT.airport!;
    expect(fp.w).toBeGreaterThan(fp.d);
    for (const level of [1, 2, 3]) {
      const g = airportGeometry(level);
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.max.x - b.min.x).toBeLessThanOrEqual(fp.w * TILE_UNITS + 0.02);
      expect(b.max.z - b.min.z).toBeLessThanOrEqual(fp.d * TILE_UNITS + 0.02);
      expect(b.max.x - b.min.x).toBeGreaterThan(fp.w * TILE_UNITS - 0.3);
    }
  }, 120000);
});
