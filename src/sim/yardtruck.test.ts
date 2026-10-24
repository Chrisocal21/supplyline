import { describe, expect, it } from 'vitest';
import { BUILD_LUMBER } from './defs';
import { buyVehicle, createWorld, sell, step } from './world';

describe('yard truck', () => {
  it('is bought by the player at a built yard, and only then carries lumber to the Market site', () => {
    const w = createWorld(11);
    w.tier = 1;
    const p = w.places[0];
    const yard = w.sites.find((s) => s.placeId === p.id && s.kind === 'freight')!;
    sell(w, yard, 'lumber', BUILD_LUMBER[0] + BUILD_LUMBER[1]);
    expect(w.vehicles.filter((v) => v.homeId === yard.id)).toHaveLength(0);
    for (let i = 0; i < 3000; i++) step(w);
    expect(p.stage).toBe(1);
    expect(buyVehicle(w, yard.id, 'boxtruck')).toBeNull();
    for (let i = 0; i < 6000 && p.stage === 1; i++) step(w);
    expect(p.stage).toBe(2);
  });
});

describe('moving a driver to a new truck', () => {
  it('parks the old truck without a driver', async () => {
    const { buyVehicle: buy, createWorld: make } = await import('./world');
    const w = make(11);
    w.money = 1e6;
    const camp = w.sites.find((s) => s.placeId !== null)!;
    const home = w.sites.find((s) => s.kind === 'freight')!;
    void camp;
    const p = w.places[0];
    p.stage = 2;
    expect(buy(w, home.id, 'boxtruck')).toBeNull();
    const first = w.vehicles[0];
    for (let i = 0; i < 30; i++) step(w);
    const driver = first.driverId;
    expect(driver).not.toBe(0);
    expect(buy(w, home.id, 'boxtruck', 'main', { use: driver })).toBeNull();
    const second = w.vehicles[1];
    expect(second.driverId).toBe(driver);
    expect(first.driverId).toBe(0);
  });
});
