// Production rates and the bottleneck list: what a building makes a minute, how much of the time it really runs, and why it stops.
import { describe, expect, it } from 'vitest';
import { GOOD_LIST, SITE_DEFS, type SiteKind, type Terrain } from './defs';
import { bottlenecks, createBlankWorld, ratePerMin, siteCap, step, type World } from './world';

function world(): World {
  const w = createBlankWorld(30, 14, new Array<Terrain>(30 * 14).fill('grass'));
  w.tier = 25;
  w.money = 1e6;
  return w;
}
const add = (w: World, kind: SiteKind, x: number) => {
  w.sites.push({ id: w.nextId++, kind, name: `${kind}${x}`, x, y: 5, stock: {}, timer: 0, level: 1, nodeId: null, placeId: null, pull: [...GOOD_LIST], making: SITE_DEFS[kind].recipe ? true : undefined, sendTo: [] });
  return w.sites[w.sites.length - 1];
};

describe('production', () => {
  it('works out what a building makes and uses a minute, more at a higher level', () => {
    const w = world();
    const mill = add(w, 'sawmill', 5);
    const r1 = ratePerMin(w, mill)!;
    expect(Object.keys(r1.in).length).toBeGreaterThan(0);
    expect(Object.values(r1.out)[0]).toBeGreaterThan(0);
    mill.level = 3;
    const r3 = ratePerMin(w, mill)!;
    expect(Object.values(r3.out)[0]).toBeGreaterThan(Object.values(r1.out)[0]!);
  });

  it('shows a factory with no inputs as starved, and one with a full shelf as blocked', () => {
    const w = world();
    const mill = add(w, 'sawmill', 5);
    for (let i = 0; i < 3000; i++) step(w);
    expect(mill.stall).toBe('input');
    expect(mill.run ?? 1).toBeLessThan(0.1);
    expect(bottlenecks(w).some((b) => b.site.id === mill.id && b.stall === 'input')).toBe(true);
    expect(w.log.some((l) => l.text.includes('has stopped'))).toBe(true);
  });

  it('counts a fed factory as running and keeps it off the list', () => {
    const w = world();
    const mill = add(w, 'sawmill', 5);
    const def = SITE_DEFS.sawmill.recipe!;
    for (let i = 0; i < 3000; i++) {
      for (const g of Object.keys(def.inputs)) mill.stock[g as keyof typeof mill.stock] = siteCap(w, mill);
      mill.stock[Object.keys(def.outputs)[0] as keyof typeof mill.stock] = 0;
      step(w);
    }
    expect(mill.run ?? 0).toBeGreaterThan(0.8);
    expect(bottlenecks(w).some((b) => b.site.id === mill.id)).toBe(false);
  });
});
