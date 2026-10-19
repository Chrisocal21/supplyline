import { describe, expect, it } from 'vitest';
import type { BufferGeometry } from 'three';
import { DISTRICT_ORDER, SITE_DEFS, TOWN_STYLES, type SiteKind } from '../sim/defs';
import { addCityBlock, addResidence, type Residence } from './architecture';
import { districtLandmark } from './districts';
import { siteGeometry, siteGeometryAt } from './models';
import { Parts } from './parts';
import { townGeometry } from './townmodel';
import { addCropRows, addTree, treeGeometry, treeLodGeometry, type TreeKind } from './vegetation';
import { truckGeometry } from './trucks';
import { sportsCampus } from './sports';
import { STREET, meters } from '../scale';
import { addCow } from './livestock';
import { airportGeometry } from './airport';
import { TILE_UNITS } from '../scale';

function checkGeometry(g: BufferGeometry, budget: number): void {
  const position = g.getAttribute('position');
  expect(position.count).toBeGreaterThan(0);
  expect(position.count).toBeLessThanOrEqual(budget);
  for (const name of ['position', 'normal', 'color', 'mid', 'anc']) {
    const attribute = g.getAttribute(name);
    expect(attribute.count, name).toBe(position.count);
    expect(Array.from(attribute.array).every(Number.isFinite), name).toBe(true);
  }
  g.computeBoundingBox();
  expect(g.boundingBox!.isEmpty()).toBe(false);
}

const trees: TreeKind[] = ['pine', 'oak', 'birch', 'orchard', 'palm'];

const resourceSites = (Object.keys(SITE_DEFS) as SiteKind[]).filter(kind => SITE_DEFS[kind].produce);

describe('resource-site polish', () => {
  it.each(resourceSites)('%s keeps its core at physical size and adds distinct, repeatable tiers', kind => {
    const base = siteGeometry(kind);
    const positions = base.getAttribute('position').array;
    const tierCounts = new Set<number>();
    for (const level of [1, 2, 3]) {
      const g = siteGeometryAt(kind, level);
      const repeat = siteGeometryAt(kind, level);
      checkGeometry(g, 120000);
      expect(g.getAttribute('position').array.slice(0, positions.length)).toEqual(positions);
      expect(g.getAttribute('position').array).toEqual(repeat.getAttribute('position').array);
      expect(g.boundingBox!.min.x).toBeGreaterThanOrEqual(-1.65);
      expect(g.boundingBox!.max.x).toBeLessThanOrEqual(1.65);
      expect(g.boundingBox!.min.z).toBeGreaterThanOrEqual(-1.65);
      expect(g.boundingBox!.max.z).toBeLessThanOrEqual(1.65);
      tierCounts.add(g.getAttribute('position').count);
      g.dispose();
      repeat.dispose();
    }
    expect(tierCounts.size).toBe(3);
    base.dispose();
  }, 30000);
});

describe('measured transport and sports geometry', () => {
  it('builds a 120 by 53 1/3 yard football surface, not a tile-sized field', () => {
    const p = new Parts();
    sportsCampus(p, 'stadium', 1, 0, 0, 0);
    const g = p.build();
    const position = g.getAttribute('position');
    const material = g.getAttribute('mid');
    const xs: number[] = [], zs: number[] = [];
    for (let i = 0; i < position.count; i++) {
      if (material.getX(i) !== 10 || position.getY(i) < 0.0454 || position.getY(i) > 0.0466) continue;
      xs.push(position.getX(i));
      zs.push(position.getZ(i));
    }
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(meters(109.728), 4);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(meters(48.768), 4);
    g.dispose();
  });
  it.each(['boxtruck', 'bigtruck', 'rig', 'convoy'] as const)('%s fits a 3.5 metre lane, including mirrors', kind => {
    const g = truckGeometry(kind);
    checkGeometry(g, 30000);
    expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeLessThan(STREET.lane);
    expect(g.boundingBox!.max.y).toBeLessThan(meters(4.3));
    expect(g.boundingBox!.max.y).toBeGreaterThan(meters(3.8));
    g.dispose();
  });

  it.each(['stadium', 'ballpark', 'arena'] as const)('%s has three distinct tiers within its measured campus', kind => {
    const counts = new Set<number>();
    for (const level of [1, 2, 3]) {
      const p = new Parts();
      const lights = sportsCampus(p, kind, level, 0, 0, 0);
      const g = p.build();
      checkGeometry(g, 120000);
      counts.add(g.getAttribute('position').count);
      expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeLessThanOrEqual(meters(kind === 'ballpark' ? 136 : 181));
      expect(g.boundingBox!.max.z - g.boundingBox!.min.z).toBeLessThanOrEqual(meters(kind === 'ballpark' ? 136 : 126));
      expect(lights.length).toBeGreaterThan(0);
      g.dispose();
    }
    expect(counts.size).toBe(3);
  });
});

describe('shared vegetation', () => {
  it.each([0, 1, 2])('dairy cow variant %s has detailed geometry at adult cattle scale', variant => {
    const p = new Parts();
    addCow(p, 0, 0, 0, variant);
    const g = p.build();
    checkGeometry(g, 14000);
    expect(g.boundingBox!.min.y).toBeGreaterThanOrEqual(-0.001);
    expect(g.boundingBox!.max.y).toBeGreaterThan(0.13);
    expect(g.boundingBox!.max.y).toBeLessThan(0.18);
    expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeLessThan(0.34);
    g.dispose();
  });
  it('fills a field with bounded, deterministic crop rows', () => {
    const a = new Parts(), b = new Parts();
    addCropRows(a, 0, 0, 2.2, 1.5, 9, 16);
    addCropRows(b, 0, 0, 2.2, 1.5, 9, 16);
    const g = a.build(), repeat = b.build();
    checkGeometry(g, 25000);
    expect(g.getAttribute('position').array).toEqual(repeat.getAttribute('position').array);
    expect(g.boundingBox!.max.y).toBeGreaterThan(0.2);
    expect(g.boundingBox!.max.y).toBeLessThan(0.25);
    expect(g.boundingBox!.max.x).toBeLessThan(1.11);
    expect(g.boundingBox!.max.z).toBeLessThan(0.76);
    g.dispose();
    repeat.dispose();
  });
  it.each(['pine', 'oak', 'birch'] as const)('%s distant stand-in keeps the silhouette at a fraction of the cost', (kind) => {
    const full = treeGeometry(kind, kind === 'birch' ? 1 : 0);
    const lod = treeLodGeometry(kind);
    checkGeometry(lod, 400);
    expect(lod.getAttribute('position').count * 4).toBeLessThan(full.getAttribute('position').count);
    full.computeBoundingBox();
    const fb = full.boundingBox!, lb = lod.boundingBox!;
    expect(Math.abs(lb.max.y - fb.max.y)).toBeLessThan(0.25);
    expect(Math.abs((lb.max.x - lb.min.x) - (fb.max.x - fb.min.x))).toBeLessThan(0.3);
    full.dispose();
    lod.dispose();
  });
  it.each(trees)('%s has finite, repeatable geometry within a 5,000-vertex budget', (kind) => {
    const a = treeGeometry(kind, 3);
    const b = treeGeometry(kind, 3);
    checkGeometry(a, 5000);
    expect(a.getAttribute('position').array).toEqual(b.getAttribute('position').array);
    expect(a.boundingBox!.min.y).toBeGreaterThanOrEqual(-0.001);
    expect(a.boundingBox!.max.y).toBeLessThan(1.6);
    a.dispose();
    b.dispose();
  });

  it('preserves town growth anchors and uses the same geometry at a smaller scale', () => {
    const p = new Parts();
    p.anchor = [4, 7];
    addTree(p, 'oak', 4, 0, 7, 0.7, 2);
    const g = p.build();
    checkGeometry(g, 5000);
    const anchor = g.getAttribute('anc');
    for (let i = 0; i < anchor.count; i++) {
      expect(anchor.getX(i)).toBe(4);
      expect(anchor.getY(i)).toBe(7);
    }
    expect(g.boundingBox!.max.y).toBeLessThan(0.8);
    g.dispose();
  });
});

const home: Residence = {
  x: 0, z: 0, yaw: 0, w: 0.8, d: 0.7, h: 0.75,
  wall: 0xc9b79c, roof: 0x4f545c, wallTex: 1, roofShape: 'mid', variant: 0,
};

describe('architectural variants', () => {
  it.each(['steep', 'mid', 'low', 'flat'] as const)('%s homes have four distinct silhouettes inside the plot envelope', (roofShape) => {
    const silhouettes = new Set<string>();
    for (let variant = 0; variant < 4; variant++) {
      const p = new Parts();
      p.anchor = [0, 0];
      addResidence(p, { ...home, roofShape, variant });
      const g = p.build();
      checkGeometry(g, 3500);
      const box = g.boundingBox!;
      expect(Math.max(Math.abs(box.min.x), box.max.x)).toBeLessThanOrEqual(home.w / 2 + 0.08);
      expect(Math.max(Math.abs(box.min.z), box.max.z)).toBeLessThanOrEqual(home.d / 2 + 0.11);
      expect(box.max.y).toBeLessThan(home.h + 0.65);
      silhouettes.add(Array.from(g.getAttribute('position').array).join(','));
      expect(Array.from(g.getAttribute('mid').array)).toContain(8);
      g.dispose();
    }
    expect(silhouettes.size).toBe(4);
  });

  it.each([false, true])('city blocks are distinct, bounded and animated as one building (tower=%s)', (tower) => {
    const silhouettes = new Set<string>();
    for (let variant = 0; variant < 3; variant++) {
      const p = new Parts();
      p.anchor = [0, 0];
      addCityBlock(p, { x: 0, z: 0, yaw: 0, w: 1.4, d: 1.2, h: 5, wall: 0xb4c4d2, tower, variant });
      const g = p.build();
      checkGeometry(g, 10000);
      expect(g.boundingBox!.min.x).toBeGreaterThan(-0.8);
      expect(g.boundingBox!.max.x).toBeLessThan(0.8);
      expect(g.boundingBox!.max.z).toBeLessThan(0.75);
      expect(Array.from(g.getAttribute('anc').array).every(v => v === 0)).toBe(true);
      silhouettes.add(Array.from(g.getAttribute('position').array).join(','));
      g.dispose();
    }
    expect(silhouettes.size).toBe(3);
  });
});

describe('building integration', () => {
  it.each(Object.keys(SITE_DEFS) as SiteKind[])('%s remains mergeable at all three upgrade levels', (kind) => {
    for (let level = 1; level <= 3; level++) {
      const g = siteGeometryAt(kind, level);
      checkGeometry(g, 120000);
      g.dispose();
    }
  });

  it.each(DISTRICT_ORDER)('%s district remains valid at each level and orientation', (id) => {
    for (let level = 1; level <= 3; level++) {
      const p = new Parts();
      p.anchor = [2, 3];
      districtLandmark(p, id, level, 2, 3, level * Math.PI / 2);
      const g = p.build();
      checkGeometry(g, 80000);
      g.dispose();
    }
  });

  it.each(TOWN_STYLES)('%s towns retain repeatable geometry through all five growth levels', (style) => {
    const streets = Array.from({ length: 7 }, (_, i) => ({ x: i - 3, y: 0, main: true }));
    const homes = [-1, 1].flatMap(y => Array.from({ length: 5 }, (_, i) => ({ x: i - 2, y, ok: true })));
    for (let level = 1; level <= 5; level++) {
      const options = { level, seed: 17, squeeze: 0.85, city: true, style, streets, homes, plots: [] };
      const a = townGeometry(options);
      const b = townGeometry(options);
      checkGeometry(a, 250000);
      expect(a.getAttribute('position').array).toEqual(b.getAttribute('position').array);
      expect(a.getAttribute('anc').array).toEqual(b.getAttribute('anc').array);
      a.dispose();
      b.dispose();
    }
  });

  it.each(['plain', 'forest', 'rock', 'water'] as const)('amphitheatre retains valid growth geometry in the %s setting', (setting) => {
    const p = new Parts();
    p.anchor = [2, 3];
    districtLandmark(p, 'amphitheatre', 3, 2, 3, Math.PI / 2, setting);
    const g = p.build();
    checkGeometry(g, 80000);
    expect(Array.from(g.getAttribute('anc').array).every((v, i) => v === (i % 2 ? 3 : 2))).toBe(true);
    g.dispose();
  });
});

describe('airport', () => {
  it('fills its 3x3 field at every level, keeps the full runway, and stays a reasonable size', () => {
    const half = 1.5 * TILE_UNITS;
    let prev = 0;
    for (const level of [1, 2, 3]) {
      const g = airportGeometry(level);
      g.computeBoundingBox();
      const b = g.boundingBox!;
      expect(b.min.x).toBeGreaterThanOrEqual(-half - 0.01);
      expect(b.max.x).toBeLessThanOrEqual(half + 0.01);
      expect(b.min.z).toBeGreaterThanOrEqual(-half - 0.01);
      expect(b.max.z).toBeLessThanOrEqual(half + 0.01);
      // The runway runs nearly the whole width of the field.
      expect(b.max.x - b.min.x).toBeGreaterThan(2 * half - 0.2);
      const verts = g.getAttribute('position').count;
      expect(verts).toBeLessThan(400_000);
      // Each upgrade adds terminal, not just paint.
      expect(verts).toBeGreaterThan(prev);
      prev = verts;
      const again = airportGeometry(level);
      expect(again.getAttribute('position').count).toBe(verts);
    }
  });
});
