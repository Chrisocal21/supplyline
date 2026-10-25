// New worlds hold a town's street frontage as downtown: housing, shopfronts and districts rise there with the town's level, and
// the town keeps only its Market and Supply Yard as plots. The ground a town holds never changes.
import { describe, expect, it } from 'vitest';
import { BUILDING_HEIGHT } from '../scale';
import { SKYLINE_CAP, skylineCap, skylineOf } from './skyline';
import { enableLandRules, parcelState, parcelsOf } from './land';
import { footprint, townLayout } from './townlayout';
import { createWorld, lotsAt, prepareRealisticWorld, siteTown, placeSite, wrapX, type World } from './world';
import type { TownStyle } from './defs';

const key = (t: { x: number; y: number }): string => t.x + ',' + t.y;

describe('downtown layout', () => {
  it('keeps only the Market and Supply Yard as plots, and never changes the ground a town holds', () => {
    for (const seed of [3, 11, 21]) {
      const w = createWorld(seed);
      const old = w.places.map((p) => new Set(footprint(townLayout({ ...w, downtown: false }, p), 5).map(key)));
      const next = w.places.map((p) => townLayout({ ...w, downtown: true }, p));
      w.places.forEach((p, i) => {
        expect(next[i].plots.length, `${p.name} plots (seed ${seed})`).toBe(2);
        expect(next[i].homes.length, `${p.name} housing tiles (seed ${seed})`).toBeGreaterThan(0);
        const now = new Set(footprint(next[i], 5).map(key));
        // The yellow zone is the same ground: nothing a town held is given up, and nothing new is taken.
        expect([...now].filter((k) => !old[i].has(k)), `${p.name} takes new ground (seed ${seed})`).toEqual([]);
        expect([...old[i]].filter((k) => !now.has(k)), `${p.name} gives up ground (seed ${seed})`).toEqual([]);
      });
    }
  });

  it('marks new worlds lotless, and gives the player a free starter plot of open ground', () => {
    const w = createWorld(11);
    prepareRealisticWorld(w);
    enableLandRules(w);
    expect(w.downtown).toBe(true);
    for (const p of w.places) {
      expect(p.lotless).toBe(true);
      expect(lotsAt(p)).toBe(0);
    }
    expect(w.owned!.length).toBe(4);
    const ground = parcelsOf(w).parcels.filter((p) => w.owned!.includes(p.id) && p.nodes.length === 0);
    expect(ground.length).toBe(1);
    expect(parcelState(w, ground[0])).toBe('owned');
  });

  it('counts a factory on open ground near a town as that town\'s, so its path still speeds it', () => {
    const w: World = createWorld(11);
    prepareRealisticWorld(w);
    enableLandRules(w);
    w.money = 1e6;
    w.tier = 1;
    const home = w.places[0];
    const own = parcelsOf(w).parcels.find((p) => w.owned!.includes(p.id) && p.nodes.length === 0)!;
    let site = null;
    for (let y = own.y; y < own.y + own.h && !site; y++) {
      for (let x = own.x; x < own.x + own.w && !site; x++) {
        if (placeSite(w, 'sawmill', wrapX(w, x), y) === null) site = w.sites[w.sites.length - 1];
      }
    }
    expect(site).not.toBeNull();
    expect(siteTown(w, site!)).toBeDefined();
    expect(Math.hypot(home.x - site!.x, home.y - site!.y)).toBeLessThan(40);
  });
});

describe('skylines', () => {
  const styles: TownStyle[] = ['nordic', 'temperate', 'mediterranean', 'tropical', 'arid'];

  it('is fixed by where a town stands, and a major city is never low', () => {
    for (const style of styles) {
      for (let i = 0; i < 80; i++) {
        const town = { x: i * 7, y: i * 3 + 5, radius: 3, style };
        const city = { ...town, radius: 5 };
        expect(skylineOf(town)).toBe(skylineOf({ ...town }));
        expect(skylineOf(city)).not.toBe('low');
        expect(skylineOf(town)).not.toBe('tall');
      }
    }
  });

  it('mixes the kinds: some towns stay low, some cities build towers, some stay mid-rise', () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 200; i++) {
      kinds.add(skylineOf({ x: i * 11, y: i * 5 + 3, radius: 3, style: 'temperate' }));
      kinds.add(skylineOf({ x: i * 11, y: i * 5 + 3, radius: 5, style: 'temperate' }));
    }
    expect([...kinds].sort()).toEqual(['low', 'mid', 'tall']);
  });

  it('only ever rises with the town level, and never passes the tallest core tower', () => {
    for (const sky of ['low', 'mid', 'tall'] as const) {
      let last = 0;
      for (let level = 1; level <= 5; level++) {
        const h = skylineCap(sky, level);
        expect(h).toBeGreaterThanOrEqual(last);
        expect(h).toBeLessThanOrEqual(BUILDING_HEIGHT.coreCap);
        last = h;
      }
    }
    expect(SKYLINE_CAP.low[4]).toBeLessThan(SKYLINE_CAP.mid[4]);
    expect(SKYLINE_CAP.mid[4]).toBeLessThan(SKYLINE_CAP.tall[4]);
  });
});

describe('downtown model', () => {
  const build = async (skyline: 'low' | 'mid' | 'tall', level: number) => {
    const { townGeometry } = await import('../r3d/townmodel');
    const w = createWorld(11);
    const city = w.places.find((p) => (p.radius ?? 3) > 3)!;
    const lay = townLayout({ ...w, downtown: true }, city);
    const geo = townGeometry({
      level, seed: 7, squeeze: 1, city: true, downtown: true, skyline, style: city.style,
      streets: lay.streets.filter((s) => s.level <= level).map((s) => ({ x: s.x, y: s.y, main: s.main })),
      plots: [], homes: lay.homes.filter((h) => h.level <= level).map((h) => ({ x: h.x, y: h.y, ok: true, face: h.face })),
    });
    geo.computeBoundingBox();
    return geo.boundingBox!.max.y;
  };

  it('never builds taller than the skyline allows, and a tall city does climb', async () => {
    const tall = await build('tall', 5);
    expect(tall).toBeGreaterThan(9);
    expect(tall).toBeLessThanOrEqual(BUILDING_HEIGHT.coreCap / 10 + 0.8);
    expect(await build('mid', 5)).toBeLessThanOrEqual(BUILDING_HEIGHT.midRise / 10 + 0.8);
    expect(await build('low', 5)).toBeLessThanOrEqual(2.9);
  }, 60000);

  it('rises with the town level', async () => {
    const heights = [];
    for (const level of [1, 2, 3, 4, 5]) heights.push(await build('tall', level));
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeGreaterThanOrEqual(heights[i - 1] - 0.01);
    expect(heights[4]).toBeGreaterThan(heights[1] * 2);
  }, 60000);
});
