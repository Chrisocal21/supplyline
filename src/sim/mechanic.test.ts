// Worn-out trucks stop, and a Mechanic Shop with hired mechanics repairs them, past new if the mechanic is experienced.
import { describe, expect, it } from 'vitest';
import { MECHANIC_BUFF, MECHANIC_JOBS, MECHANIC_WAGE } from './defs';
import { dismissMechanic, fleetEfficiency, hireMechanic, mechanicApplicants, mechanicRank, mechanicsAt, shopSlots, tendDrivers, vehicleEfficiency, wagesPerMinute } from './drivers';
import { buyVehicle, createWorld, step, type Site } from './world';

function setup() {
  const w = createWorld(11);
  w.money = 1e6;
  w.tier = 25;
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

describe('the mechanic shop and its mechanics', () => {
  it('with no mechanic, a worn-out truck stays stopped for a while and is then patched, not made new', () => {
    const { w, home, v } = setup();
    shopAt(w, home.x + 2, home.y);
    v.wear = 1;
    for (let i = 0; i < 1500; i++) step(w);
    expect(v.wear).toBe(1);
    for (let i = 0; i < 3000; i++) step(w);
    expect(v.wear ?? 0).toBeLessThan(0.9);
    expect(v.wear ?? 0).toBeGreaterThan(0.2);
  });

  it('hires from the applicants, pays a wage, and stops at the room of the shop', () => {
    const { w, home } = setup();
    const shop = shopAt(w, home.x + 2, home.y);
    expect(shopSlots(shop)).toBe(2);
    const wages = wagesPerMinute(w);
    const [a, b, c] = mechanicApplicants(w);
    const r = hireMechanic(w, a.key, shop.id);
    expect('mechanic' in r).toBe(true);
    expect(wagesPerMinute(w)).toBeGreaterThan(wages);
    expect('mechanic' in hireMechanic(w, b.key, shop.id)).toBe(true);
    expect(hireMechanic(w, c.key, shop.id)).toMatchObject({ error: expect.stringMatching(/room for 2/) });
    expect(hireMechanic(w, c.key, home.id)).toMatchObject({ error: expect.stringMatching(/Mechanic Shop/) });
    expect(mechanicsAt(w, shop.id)).toHaveLength(2);
  });

  it('repairs after a wait, and an experienced mechanic sends it back past new and gains experience', () => {
    const { w, home, v } = setup();
    const shop = shopAt(w, home.x + 2, home.y);
    const a = mechanicApplicants(w)[0];
    const r = hireMechanic(w, a.key, shop.id);
    if (!('mechanic' in r)) throw new Error(r.error);
    r.mechanic.jobs = MECHANIC_JOBS[2];
    expect(mechanicRank(r.mechanic)).toBe(2);
    v.wear = 1;
    const before = w.money;
    for (let i = 0; i < 2500 && (v.wear ?? 0) >= 1; i++) step(w);
    expect(v.wear).toBeCloseTo(-MECHANIC_BUFF * 2, 1);
    expect(w.money).toBeLessThan(before);
    expect(r.mechanic.jobs).toBe(MECHANIC_JOBS[2] + 1);
  });

  it('queues two trucks behind one mechanic, and a second mechanic takes the other', () => {
    const { w, home, v } = setup();
    expect(buyVehicle(w, home.id, 'boxtruck')).toBeNull();
    const v2 = w.vehicles[1];
    const shop = shopAt(w, home.x + 2, home.y);
    const apps = mechanicApplicants(w);
    for (const ap of apps.slice(0, 1)) hireMechanic(w, ap.key, shop.id);
    v.wear = 1;
    v2.wear = 1;
    for (let i = 0; i < 12; i++) step(w);
    expect(v.repairAt).toBeDefined();
    expect(v2.repairAt ?? 0).toBeGreaterThan(v.repairAt ?? 0);
    expect(hireMechanic(w, apps[1].key, shop.id)).toHaveProperty('mechanic');
  });

  it('turns a trained mechanic of an old save into a hired one, and lets go of the crew of a demolished shop', () => {
    const { w, home } = setup();
    const shop = shopAt(w, home.x + 2, home.y);
    shop.mech = 3;
    tendDrivers(w);
    expect(shop.mech).toBeUndefined();
    const crew = mechanicsAt(w, shop.id);
    expect(crew).toHaveLength(1);
    expect(mechanicRank(crew[0])).toBe(3);
    w.sites = w.sites.filter((x) => x.id !== shop.id);
    tendDrivers(w);
    expect(w.mechanics).toHaveLength(0);
    expect(dismissMechanic(w, 999)).toMatch(/No such/);
    expect(MECHANIC_WAGE.length).toBe(MECHANIC_JOBS.length);
  });
});
