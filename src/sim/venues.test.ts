import { describe, expect, it } from 'vitest';
import { GOODS } from './defs';
import { VENUE_POOLS, districtGoods, venuesOf } from './venues';
import type { Place } from './features';

const town = (id: number, style: Place['style']): Place => ({ id, style, districts: { restaurants: 1, hardware: 1 } } as unknown as Place);

describe('venues', () => {
  it('are only made of goods that exist', () => {
    for (const pool of Object.values(VENUE_POOLS)) for (const v of pool!) for (const g of v.goods) expect(GOODS[g], `${v.id} ${g}`).toBeDefined();
  });
  it('have a different name and menu in a district', () => {
    for (const [id, pool] of Object.entries(VENUE_POOLS)) {
      expect(new Set(pool!.map((v) => v.id)).size, id).toBe(pool!.length);
      expect(new Set(pool!.map((v) => v.label)).size, id).toBe(pool!.length);
    }
  });
  it('are the same every time for a town, and a higher level only adds one', () => {
    const p = town(7, 'temperate');
    const one = venuesOf(p, 'restaurants', 1).map((v) => v.id);
    expect(venuesOf(p, 'restaurants', 1).map((v) => v.id)).toEqual(one);
    const two = venuesOf(p, 'restaurants', 2).map((v) => v.id);
    expect(two.slice(0, one.length)).toEqual(one);
    expect(two.length).toBe(one.length + 1);
  });
  it('differ from town to town, and favour the town style', () => {
    const picks = new Set<string>();
    for (let i = 0; i < 40; i++) picks.add(venuesOf(town(i, 'mediterranean'), 'restaurants', 2).map((v) => v.id).sort().join());
    expect(picks.size).toBeGreaterThan(1);
    let italian = 0;
    let italianElsewhere = 0;
    for (let i = 0; i < 60; i++) {
      if (venuesOf(town(i, 'mediterranean'), 'restaurants', 1).some((v) => v.id === 'italian')) italian++;
      if (venuesOf(town(i, 'nordic'), 'restaurants', 1).some((v) => v.id === 'italian')) italianElsewhere++;
    }
    expect(italian).toBeGreaterThan(italianElsewhere);
  });
  it('ask only for what their own venues sell', () => {
    const p = town(3, 'arid');
    const menu = districtGoods(p, 'restaurants');
    expect(menu.length).toBeGreaterThan(0);
    expect(menu.length).toBeLessThan(15);
    expect(menu).not.toContain('steel');
  });
});

describe('venue goods can be sold to', () => {
  it('each is made by a building and can be held and relayed by a Distribution Warehouse', async () => {
    const { SITE_DEFS, WAREHOUSE_GOODS } = await import('./defs');
    const made = (g: string): boolean => Object.values(SITE_DEFS).some((d) => (d as any).produce?.good === g || ((d as any).produce?.also ?? []).some((x: any) => x.good === g) || ((d as any).recipe?.outputs?.[g] ?? 0) > 0);
    for (const [id, pool] of Object.entries(VENUE_POOLS)) for (const v of pool!) for (const g of v.goods) {
      expect(made(g), `${id}/${v.id} ${g} is made nowhere`).toBe(true);
      expect(WAREHOUSE_GOODS.includes(g), `${id}/${v.id} ${g} is not on the Warehouse list`).toBe(true);
    }
  });
});

describe('venues are open when their goods can be made', () => {
  it('every venue opens at a tier it can be supplied, and none is shown earlier', async () => {
    const { DISTRICTS, TOWN_LEVEL_TIER } = await import('./defs');
    const { venueTier } = await import('./venues');
    for (const [id, pool] of Object.entries(VENUE_POOLS)) {
      for (const v of pool!) expect(venueTier(v), `${id}/${v.id} cannot be made at all`).toBeLessThanOrEqual(25);
      for (const tier of [0, 3, 8, 15, 25]) {
        const shown = venuesOf(town(1, 'temperate'), id as keyof typeof DISTRICTS, 5, tier);
        for (const v of shown) expect(venueTier(v), `${id}/${v.id} at tier ${tier}`).toBeLessThanOrEqual(tier);
      }
    }
    expect(TOWN_LEVEL_TIER.length).toBe(5);
  });
});
