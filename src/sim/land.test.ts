// Land plots: a patchwork over the whole map, bought before anything is built on it outside a town.
import { describe, expect, it } from 'vitest';
import map1 from '../maps/map1.json';
import map2 from '../maps/map2.json';
import { LAND_PREFIX, buyParcel, enableLandRules, parcelAt, parcelPrice, parcelState, parcelsOf } from './land';
import { SITE_DEFS } from './defs';
import { createWorld, createWorldFromMap, placeError, placeSite, prepareRealisticWorld, type MapData, type World } from './world';

const worlds = (): World[] => [createWorld(5), createWorldFromMap(map1 as MapData), createWorldFromMap(map2 as MapData)];

describe('land plots', () => {
  it('cover every tile exactly once, in plots of 1, 2 or 4 cells, the same every time', () => {
    for (const w of worlds()) {
      const { parcels, of } = parcelsOf(w);
      let covered = 0;
      for (let i = 0; i < of.length; i++) if (of[i] >= 0) covered += 1;
      expect(covered).toBe(w.width * w.height);
      for (const p of parcels) {
        expect(p.h === 4 || p.h === 8 || p.y + p.h >= w.height).toBe(true);
        expect(p.w % 4 === 0 || p.x + p.w >= w.width).toBe(true);
      }
      expect(parcels.length).toBeGreaterThan(w.width * w.height / 70);
    }
    const a = parcelsOf(createWorldFromMap(map2 as MapData)).parcels.map((p) => `${p.x},${p.y},${p.w},${p.h}`);
    const b = parcelsOf(createWorldFromMap(map2 as MapData)).parcels.map((p) => `${p.x},${p.y},${p.w},${p.h}`);
    expect(a).toEqual(b);
  }, 30000);

  it('leave worlds without the rules building anywhere, as before', () => {
    const w = createWorld(5);
    const node = w.nodes.find((n) => n.kind === 'forest')!;
    expect(w.landRules).toBeUndefined();
    expect(placeError(w, 'forestry', node.x, node.y)).toBeNull();
  });

  it('hand over the start town\'s nearest forest, field and meadow, and sell the rest', () => {
    const w = createWorldFromMap(map2 as MapData);
    prepareRealisticWorld(w);
    enableLandRules(w);
    expect(w.owned!.length).toBeGreaterThanOrEqual(2);
    const home = w.places[0];
    const dist = (n: { x: number; y: number }): number => Math.hypot(n.x - home.x, n.y - home.y);
    const first = w.nodes.filter((n) => n.kind === 'forest').sort((p, q) => dist(p) - dist(q))[0];
    expect(placeError(w, 'forestry', first.x, first.y)).toBeNull();
    // A farther forest needs its plot.
    const far = w.nodes.filter((n) => n.kind === 'forest' && parcelState(w, parcelAt(w, n.x, n.y)!) === 'sale').sort((p, q) => dist(p) - dist(q))[0];
    const err = placeError(w, 'forestry', far.x, far.y);
    expect(err).toContain(LAND_PREFIX);
  }, 30000);

  it('are bought for their price, then built on; the money and the plot change hands once', () => {
    const w = createWorldFromMap(map2 as MapData);
    prepareRealisticWorld(w);
    enableLandRules(w);
    w.money = 100000;
    const home = w.places[0];
    const far = w.nodes
      .filter((n) => n.kind === 'forest' && parcelState(w, parcelAt(w, n.x, n.y)!) === 'sale')
      .sort((p, q) => Math.hypot(p.x - home.x, p.y - home.y) - Math.hypot(q.x - home.x, q.y - home.y))[0];
    const plot = parcelAt(w, far.x, far.y)!;
    const price = parcelPrice(plot);
    expect(price).toBeGreaterThan(0);
    const before = w.money;
    expect(placeSite(w, 'forestry', far.x, far.y)).toContain(LAND_PREFIX);
    expect(w.money).toBe(before);
    expect(buyParcel(w, plot.id)).toBeNull();
    expect(w.money).toBe(before - price);
    expect(buyParcel(w, plot.id)).toBe('You already own this plot');
    expect(placeSite(w, 'forestry', far.x, far.y)).toBeNull();
  }, 30000);

  it('cannot be bought without the money, and a town\'s own ground is never for sale', () => {
    const w = createWorldFromMap(map1 as MapData);
    prepareRealisticWorld(w);
    enableLandRules(w);
    const home = w.places[0];
    const townPlot = parcelAt(w, home.x, home.y)!;
    expect(parcelState(w, townPlot)).toBe('town');
    expect(buyParcel(w, townPlot.id)).toBe('This ground is not for sale');
    w.money = 0;
    const sale = parcelsOf(w).parcels.find((p) => parcelState(w, p) === 'sale')!;
    expect(buyParcel(w, sale.id)).toContain('Need $');
    expect(w.owned!.includes(sale.id)).toBe(false);
  }, 30000);

  it('are needed by every kind of building outside a town, not only the resource ones', () => {
    const w = createWorldFromMap(map2 as MapData);
    prepareRealisticWorld(w);
    enableLandRules(w);
    w.money = 1e9;
    w.tier = 9;
    const kinds = (Object.keys(SITE_DEFS) as (keyof typeof SITE_DEFS)[]).filter((k) => !SITE_DEFS[k].dock && !SITE_DEFS[k].station && !SITE_DEFS[k].inTown && !SITE_DEFS[k].node);
    let checked = 0;
    for (const kind of kinds) {
      for (const p of parcelsOf(w).parcels) {
        if (parcelState(w, p) !== 'sale') continue;
        const x = p.x + 2;
        const y = p.y + 2;
        const err = placeError(w, kind, x, y);
        if (err && err.startsWith(LAND_PREFIX)) {
          checked += 1;
          break;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  }, 60000);
});

describe('plots with nodes', () => {
  it('are free with an impure node, half price with a normal one and full price with a pure one', () => {
    const w = createWorldFromMap(map2 as MapData);
    prepareRealisticWorld(w);
    enableLandRules(w);
    const { parcels } = parcelsOf(w);
    const by = (q: number) => parcels.filter((p) => p.nodes.length === 1 && p.nodes[0] === q && p.land >= (p.w * p.h) / 2 && !w.owned!.includes(p.id));
    const impure = by(0);
    const normal = by(1);
    const pure = by(2);
    expect(impure.length).toBeGreaterThan(5);
    for (const p of impure) {
      expect(parcelState(w, p)).toBe('free');
      expect(parcelPrice(p)).toBe(0);
    }
    // The same ground costs twice as much with a pure node as with a normal one.
    const p1 = normal[0];
    const full = Math.max(60, Math.round((p1.value * (p1.townDist < 10 ? 1.5 : p1.townDist < 20 ? 1.2 : 1)) / 10) * 10);
    expect(parcelPrice(p1)).toBe(Math.max(30, Math.round(full / 2 / 10) * 10));
    const p2 = pure[0];
    expect(parcelPrice(p2)).toBe(Math.max(60, Math.round((p2.value * (p2.townDist < 10 ? 1.5 : p2.townDist < 20 ? 1.2 : 1)) / 10) * 10));
    expect(parcelPrice(p2)).toBeGreaterThan(0);
  }, 30000);

  it('let a camp go up on an impure node with no purchase', () => {
    const w = createWorldFromMap(map2 as MapData);
    prepareRealisticWorld(w);
    enableLandRules(w);
    w.money = 100000;
    const n = w.nodes.find((q) => q.kind === 'forest' && q.quality === 0 && !w.owned!.includes(parcelAt(w, q.x, q.y)!.id) && parcelState(w, parcelAt(w, q.x, q.y)!) === 'free')!;
    expect(placeError(w, 'forestry', n.x, n.y)).toBeNull();
    expect(buyParcel(w, parcelAt(w, n.x, n.y)!.id)).toBe('This ground is free to build on');
  }, 30000);
});
