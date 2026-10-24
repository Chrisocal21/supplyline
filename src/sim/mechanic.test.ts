// Worn-out trucks stop, and a Mechanic Shop repairs them, past new if its mechanic is trained.
import { describe, expect, it } from 'vitest';
import { MECHANIC_BUFF, MECHANIC_COST } from './defs';
import { fleetEfficiency, trainMechanic, vehicleEfficiency } from './drivers';
import { buyVehicle, createWorld, step, type Site } from './world';

function setup() {
  const w = createWorld(11);
  w.money = 1e6;
  w.tier = 3;
  const home = w.sites[0];
  home.kind = 'hub';
  home.level = 4;
  expect(buyVehicle(w, home.id, 'boxtruck')).toBeNull();
  return { w, home, v: w.vehicles[0] };
}

const shopAt = (w: ReturnType<typeof createWorld>, x: number, y: number) => {
  const s: Site = { id: w.nextId++, kind: 'garage', name: 'Test Shop', x, y, stock: {}, timer: 0, level: 1, nodeId: null, placeId: null, pull: [], making: false, sendTo: [] };
  w.sites.push(s);
  return s;
};

describe('efficiency', () => {
  it('falls as a vehicle wears, and is a site average', () => {
    expect(vehicleEfficiency({ wear: 0 })).toBe(1);
    expect(vehicleEfficiency({ wear: 1 })).toBeLessThan(0.7);
    // A repair past new does not make it better than new.
    expect(vehicleEfficiency({ wear: -0.2 })).toBe(1);
    const { w, home, v } = setup();
    v.wear = 1;
    expect(fleetEfficiency(w, home.id)).toBeCloseTo(vehicleEfficiency(v));
  });
});

describe('the mechanic shop', () => {
  it('with no shop, a worn-out truck stays stopped for a while and is then patched, not made new', () => {
    const { w, v } = setup();
    v.wear = 1;
    for (let i = 0; i < 1500; i++) step(w);
    expect(v.wear).toBe(1);
    for (let i = 0; i < 3000; i++) step(w);
    expect(v.wear ?? 0).toBeLessThan(0.9);
    expect(v.wear ?? 0).toBeGreaterThan(0.2);
  });

  it('repairs it after a wait, and a trained mechanic sends it back past new', () => {
    const { w, home, v } = setup();
    const shop = shopAt(w, home.x + 2, home.y);
    expect(trainMechanic(w, shop.id)).toBeNull();
    expect(trainMechanic(w, shop.id)).toBeNull();
    expect(shop.mech).toBe(2);
    v.wear = 1;
    const before = w.money;
    for (let i = 0; i < 2500 && (v.wear ?? 0) >= 1; i++) step(w);
    expect(v.wear).toBeCloseTo(-MECHANIC_BUFF * 2, 1);
    expect(w.money).toBeLessThan(before);
  });

  it('charges for training and tops out', () => {
    const { w, home } = setup();
    const shop = shopAt(w, home.x + 2, home.y);
    const before = w.money;
    expect(trainMechanic(w, shop.id)).toBeNull();
    expect(w.money).toBe(before - MECHANIC_COST[1]);
    w.money = 0;
    expect(trainMechanic(w, shop.id)).toMatch(/Need/);
    expect(trainMechanic(w, home.id)).toMatch(/Only a Mechanic Shop/);
  });
});
