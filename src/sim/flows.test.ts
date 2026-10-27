// The economy has to hold together: every good has somewhere to go, and by-products never have only one way out.
import { describe, expect, it } from 'vitest';
import { flows } from './flows';
import { BUILD_GOODS, BUILD_ORDER, GOODS, GOOD_LIST, MARKET_DEMAND, SITE_DEFS, type Good } from './defs';

describe('economy flows', () => {
  const f = flows();

  it('gives every good a maker and an outlet', () => {
    const bad = GOOD_LIST.filter((g) => f[g].makers.length === 0 || (f[g].users.length === 0 && !f[g].town)).map((g) => g);
    expect(bad).toEqual([]);
  });

  it('gives every by-product at least two ways out, one of them a real factory', () => {
    const bad = GOOD_LIST.filter((g) => GOODS[g].kind === 'byproduct').filter((g) => {
      const real = f[g].users.filter((k) => !SITE_DEFS[k].recycle);
      return f[g].users.length < 2 || real.length < 1;
    });
    expect(bad).toEqual([]);
  });

  it('never makes far more of a by-product than every user of it could take', () => {
    // One site of each kind making against one of each using, with the Recycling Yard counted. A wide gap means jams.
    const bad = GOOD_LIST.filter((g) => GOODS[g].kind === 'byproduct').filter((g) => f[g].made > f[g].used * 4).map((g) => `${g} makes ${f[g].made.toFixed(1)} uses ${f[g].used.toFixed(1)}`);
    expect(bad).toEqual([]);
  });

  it('never opens a building whose product has no buyer yet', () => {
    // A tester who builds something the moment it opens must be able to sell what it makes: to a Market of the level a town
    // has by then, or to another open building that uses it. Town level 2 comes with tier 3, level 3 with tier 6, level 4 with tier 9, level 5 with tier 24.
    const marketLevelAt = (t: number): number => (t < 3 ? 1 : t < 6 ? 2 : t < 9 ? 3 : t < 24 ? 4 : 5);
    const bad: string[] = [];
    for (let t = 0; t <= 25; t++) {
      const open = BUILD_ORDER.filter((k) => SITE_DEFS[k].tier <= t);
      const used = new Set<Good>();
      for (const k of open) for (const g of Object.keys(SITE_DEFS[k].recipe?.inputs ?? {})) used.add(g as Good);
      const market = new Set(MARKET_DEMAND[marketLevelAt(t) - 1]);
      for (const k of open) {
        const d = SITE_DEFS[k];
        const outs = d.produce ? [d.produce.good] : (Object.keys(d.recipe?.outputs ?? {}) as Good[]);
        for (const g of outs) if (GOODS[g].kind !== 'byproduct' && !market.has(g) && !used.has(g) && !BUILD_GOODS.includes(g)) bad.push(`tier ${t}: ${k} makes ${g}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('by-product shelves', () => {
  it('never nag the player or need a truck: a standing mill keeps its sawdust shelf at half and says all is well', async () => {
    const { createBlankWorld, placeSite, setMaking, step, siteAt } = await import('./world');
    const { diagnoseAll } = await import('./diagnose');
    const w = createBlankWorld(30, 14, new Array(30 * 14).fill('grass'));
    w.money = 1e6;
    w.tier = 25;
    expect(placeSite(w, 'sawmill', 9, 9)).toBeNull();
    const saw = siteAt(w, 9, 9)!;
    setMaking(w, saw.id, true);
    for (let i = 0; i < 6000; i++) {
      saw.stock.logs = 30;
      saw.stock.lumber = 0;
      step(w);
    }
    expect(saw.stock.sawdust ?? 0).toBeLessThan(120 * 0.8);
    expect(diagnoseAll(w, saw).level).not.toBe('bad');
    // The leftover sold for scrap, not for nothing.
    expect(w.earned).toBeGreaterThan(0);
  });
});
