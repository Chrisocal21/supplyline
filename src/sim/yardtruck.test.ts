import { describe, expect, it } from 'vitest';
import { BUILD_LUMBER } from './defs';
import { createWorld, sell, step } from './world';

describe('yard truck', () => {
  it('comes with a new Supply Yard and carries the lumber to the Market site', () => {
    const w = createWorld(11);
    const p = w.places[0];
    const yard = w.sites.find((s) => s.placeId === p.id && s.kind === 'freight')!;
    const money = w.money;
    sell(w, yard, 'lumber', BUILD_LUMBER[0]);
    expect(w.vehicles.filter((v) => v.homeId === yard.id)).toHaveLength(1);
    expect(w.money).toBe(money);
    sell(w, yard, 'lumber', BUILD_LUMBER[1]);
    for (let i = 0; i < 6000 && p.stage === 1; i++) step(w);
    expect(p.stage).toBe(2);
  });
});
