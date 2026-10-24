// A closed town builds its Supply Yard and then its Market from delivered lumber, then asks for materials to level up.
import { describe, expect, it } from 'vitest';
import { BUILD_LUMBER, LEVEL_MATERIALS } from './defs';
import { buildingNow, buyVehicle, createWorld, dockDemand, growTown, linkTown, matsNeeded, readyToGrow, sell, step } from './world';

describe('closed towns', () => {
  const dockOf = (w: ReturnType<typeof createWorld>, id: number, kind: string) => w.sites.find((s) => s.placeId === id && s.kind === kind)!;

  it('start with nothing built, and want only lumber for the Supply Yard', () => {
    const w = createWorld(11);
    const p = w.places[0];
    expect(p.stage).toBe(0);
    expect(dockDemand(w, dockOf(w, p.id, 'freight'))).toEqual(['lumber']);
    expect(dockDemand(w, dockOf(w, p.id, 'market'))).toEqual([]);
    expect(buildingNow(p)).toEqual({ name: 'Supply Yard', have: 0, need: BUILD_LUMBER[0] });
  });

  it('build the yard from lumber, keep more lumber in its store, and the yard own truck builds the Market', () => {
    const w = createWorld(11);
    w.money = 1e6;
    const p = w.places[0];
    const yard = dockOf(w, p.id, 'freight');
    const market = dockOf(w, p.id, 'market');
    sell(w, yard, 'lumber', BUILD_LUMBER[0] - 1);
    expect(p.stage).toBe(0);
    sell(w, yard, 'lumber', 1);
    expect(p.stage).toBe(1);
    expect(dockDemand(w, market)).toEqual(['lumber']);
    // The yard has to fill before anything can be built; a sawmill truck selling straight to the Market does not build it.
    expect(buyVehicle(w, yard.id, 'boxtruck')).toBeNull();
    sell(w, market, 'lumber', 50);
    expect(p.stage).toBe(1);
    sell(w, yard, 'lumber', BUILD_LUMBER[1] + 40);
    expect(yard.depot?.lumber).toBe(BUILD_LUMBER[1]);
    for (let i = 0; i < 6000 && p.stage === 1; i++) step(w);
    expect(p.stage).toBe(2);
    expect(buildingNow(p)).toBeNull();
    expect(p.growth).toBe(0);
    expect(dockDemand(w, market)).toContain('bread');
  });

  it('need the level materials carried from the yard to the Market site as well as growth', () => {
    const w = createWorld(11);
    w.money = 1e6;
    const p = w.places[0];
    p.stage = 2;
    p.growth = 1e9;
    p.delivered = { bread: 1 };
    const want = LEVEL_MATERIALS[p.style][0];
    expect(matsNeeded(p).map(([g]) => g).sort()).toEqual(Object.keys(want).sort());
    expect(readyToGrow(p)).toBe(false);
    const yard = dockOf(w, p.id, 'freight');
    linkTown(w, p);
    expect(buyVehicle(w, yard.id, 'boxtruck')).toBeNull();
    for (const [g, n] of matsNeeded(p)) sell(w, yard, g, n + 50);
    for (const [g, n] of matsNeeded(p)) expect(yard.depot?.[g]).toBe(n);
    for (let i = 0; i < 20000 && matsNeeded(p).length > 0; i++) step(w);
    expect(matsNeeded(p)).toEqual([]);
    expect(readyToGrow(p)).toBe(true);
    expect(growTown(w, p.id)).toBeNull();
    expect(p.level).toBe(2);
    expect(matsNeeded(p).length).toBeGreaterThan(0);
  });

  it('pay nothing for the lumber that builds the yard or fills its store, and only pay for the surplus', () => {
    const w = createWorld(11);
    const p = w.places[0];
    const yard = dockOf(w, p.id, 'freight');
    const before = w.money;
    expect(sell(w, yard, 'lumber', BUILD_LUMBER[0] * 0.6)).toBe(0);
    expect(sell(w, yard, 'lumber', BUILD_LUMBER[0] * 0.6)).toBe(0);
    expect(p.stage).toBe(1);
    // The part of the second delivery that went past what the yard needed is kept in store for the Market, also unpaid.
    expect(yard.depot?.lumber).toBeCloseTo(BUILD_LUMBER[0] * 0.2);
    expect(w.money).toBe(before);
    expect(w.earned).toBe(0);
    // The store only holds what the Market still needs: a delivery beyond that is a sale.
    const paid = sell(w, yard, 'lumber', BUILD_LUMBER[1] + 50);
    expect(yard.depot?.lumber).toBe(BUILD_LUMBER[1]);
    expect(paid).toBeGreaterThan(0);
    expect(w.money).toBeCloseTo(before + paid);
  });
});
