import { describe, expect, it } from 'vitest';
import { DISTRICTS, PATHS, PATH_COST, VEHICLE_DEFS } from './defs';
import { questProgress } from './quests';
import {
  buildDistrict,
  choosePath,
  districtCap,
  districtCost,
  districtDemand,
  districtError,
  districtRevenue,
  townPriceMult,
  townSpeedMult,
  upkeepPerMinute,
} from './town';
import { createWorld, dockDemand, step, tradeUp, tradeUpCost, tradeUpError, unitPrice, type World } from './world';

function world(): World {
  const w = createWorld(11);
  w.money = 1e6;
  return w;
}

describe('districts', () => {
  it('open with the town level, and each level up needs the town one level higher', () => {
    const w = world();
    const p = w.places[0];
    p.level = 1;
    expect(districtError(w, p, 'restaurants')).toMatch(/Village/);
    expect(districtCap(p, 'farmersmarket')).toBe(1);
    expect(buildDistrict(w, p, 'farmersmarket')).toBeNull();
    expect(districtError(w, p, 'farmersmarket')).toMatch(/Village/);
    p.level = 2;
    const cost = districtCost(p, 'farmersmarket');
    expect(cost).toBe(Math.round(DISTRICTS.farmersmarket.cost * 1.3));
    const before = w.money;
    expect(buildDistrict(w, p, 'farmersmarket')).toBeNull();
    expect(w.money).toBe(before - cost);
    expect(p.districts!.farmersmarket).toBe(2);
  });

  it('are refused when the player cannot pay', () => {
    const w = world();
    const p = w.places[0];
    w.money = 10;
    expect(buildDistrict(w, p, 'farmersmarket')).toMatch(/Need \$/);
    expect(p.districts?.farmersmarket ?? 0).toBe(0);
  });

  it('add goods the Market asks for', () => {
    const w = world();
    const p = w.places[0];
    const market = w.sites.find((s) => s.placeId === p.id && s.kind === 'market')!;
    expect(dockDemand(w, market)).not.toContain('fruit');
    buildDistrict(w, p, 'farmersmarket');
    expect(districtDemand(p, 'market')).toEqual(['fruit', 'milk']);
    expect(dockDemand(w, market)).toContain('fruit');
  });

  it('raise what the town pays for the goods they live on', () => {
    const w = world();
    const p = w.places[0];
    p.level = 2;
    const base = townPriceMult(p, 'bread');
    buildDistrict(w, p, 'restaurants');
    expect(townPriceMult(p, 'bread')).toBeGreaterThan(base);
    expect(townPriceMult(p, 'steel')).toBe(1);
    const market = w.sites.find((s) => s.placeId === p.id && s.kind === 'market')!;
    expect(unitPrice(w, market, 'bread')).toBeGreaterThan(0);
  });

  it('earn only while the town is stocked with what they live on', () => {
    const w = world();
    const p = w.places[0];
    p.level = 2;
    buildDistrict(w, p, 'restaurants');
    expect(districtRevenue(w, p)).toBe(0);
    const market = w.sites.find((s) => s.placeId === p.id && s.kind === 'market')!;
    market.stock.bread = 5;
    market.stock.cheese = 5;
    expect(districtRevenue(w, p)).toBeGreaterThan(0);
    const half = districtRevenue(w, p);
    market.stock.jam = 5;
    market.stock.flour = 5;
    expect(districtRevenue(w, p)).toBeGreaterThan(half);
  });
});

describe('paths', () => {
  it('need a Town and the fee, and cannot be changed', () => {
    const w = world();
    const p = w.places[0];
    p.level = 2;
    expect(choosePath(w, p, 'forge')).toMatch(/Town/);
    p.level = 3;
    w.money = PATH_COST - 1;
    expect(choosePath(w, p, 'forge')).toMatch(/Need/);
    w.money = PATH_COST + 100;
    expect(choosePath(w, p, 'forge')).toBeNull();
    expect(w.money).toBe(100);
    expect(p.path).toBe('forge');
    expect(choosePath(w, p, 'boulevard')).toMatch(/already/);
  });

  it('pay extra for their goods and speed up their factories', () => {
    const w = world();
    const p = w.places[0];
    p.level = 3;
    choosePath(w, p, 'breadbasket');
    expect(townPriceMult(p, 'bread')).toBeCloseTo(PATHS.breadbasket.priceMult);
    expect(townPriceMult(p, 'steel')).toBe(1);
    expect(townSpeedMult(p, 'bakery')).toBe(PATHS.breadbasket.speedMult);
    expect(townSpeedMult(p, 'smelter')).toBe(1);
  });

  it('gate the exclusive districts and strengthen the ones that suit them', () => {
    const w = world();
    const p = w.places[0];
    p.level = 3;
    expect(districtError(w, p, 'foundry')).toMatch(/Forge/);
    choosePath(w, p, 'breadbasket');
    expect(districtError(w, p, 'foundry')).toMatch(/Forge/);
    const plain = world().places[0];
    plain.level = 3;
    buildDistrict(w, p, 'farmersmarket');
    buildDistrict(world(), plain, 'farmersmarket');
    // The on-theme town gets the larger bonus.
    expect(townPriceMult(p, 'bread')).toBeGreaterThan(townPriceMult(plain, 'bread') * PATHS.breadbasket.priceMult * 0.999);
  });

  it('capstones need a Metropolis and a path, and only one can stand', () => {
    const w = world();
    const p = w.places[0];
    p.level = 4;
    choosePath(w, p, 'forge');
    expect(districtError(w, p, 'heavyexchange')).toMatch(/Metropolis/);
    p.level = 5;
    expect(districtError(w, p, 'foodhall')).toMatch(/Only a/);
    expect(buildDistrict(w, p, 'heavyexchange')).toBeNull();
    expect(districtError(w, p, 'heavyexchange')).toMatch(/Already/);
  });
});

describe('running costs', () => {
  it('drain money as vehicles, buildings and districts run, but never below zero', () => {
    const w = world();
    const p = w.places[0];
    buildDistrict(w, p, 'farmersmarket');
    expect(upkeepPerMinute(w)).toBeGreaterThan(0);
    const before = w.money;
    for (let i = 0; i < 600; i++) step(w);
    expect(w.money).toBeLessThan(before);
    expect(w.upkeep).toBeGreaterThan(0);
    w.money = 0.5;
    for (let i = 0; i < 100; i++) step(w);
    expect(w.money).toBeGreaterThanOrEqual(0);
  });
});

describe('vehicle trade-up', () => {
  it('swaps the smallest vehicle for the next class at a discount', () => {
    const w = world();
    // A route is needed: use the free street link inside any town with two buildings is overkill, so fake one.
    w.routes.push({ id: 900, mode: 'road', fromSiteId: 1, toSiteId: 2, path: [{ x: 0, y: 0 }, { x: 1, y: 0 }] });
    w.vehicles.push({ id: 901, routeId: 900, kind: 'boxtruck', idx: 0, dir: 1, state: 'loading', moveTimer: 0, cargo: 0, good: null });
    w.tier = 0;
    expect(tradeUpError(w, 900)).toMatch(/Tier 1/);
    w.tier = 1;
    const cost = tradeUpCost('boxtruck');
    expect(cost).toBe(VEHICLE_DEFS.bigtruck.cost - VEHICLE_DEFS.boxtruck.cost / 2);
    const before = w.money;
    expect(tradeUp(w, 900)).toBeNull();
    expect(w.money).toBe(before - cost);
    expect(w.vehicles[0].kind).toBe('bigtruck');
    // Next up is the rig at Tier 2.
    expect(tradeUpError(w, 900)).toMatch(/Tier 2/);
    w.tier = 4;
    for (let i = 0; i < 2; i++) expect(tradeUp(w, 900)).toBeNull();
    expect(w.vehicles[0].kind).toBe('convoy');
    expect(tradeUpError(w, 900)).toMatch(/top class/);
  });
});

describe('quests that read districts and paths', () => {
  it('count districts, paths and capstones across towns', () => {
    const w = world();
    const [a, b] = w.places;
    a.level = 5;
    b.level = 3;
    buildDistrict(w, a, 'farmersmarket');
    expect(questProgress(w, { kind: 'district', level: 1, count: 1 }).done).toBe(true);
    expect(questProgress(w, { kind: 'district', level: 2, count: 1 }).done).toBe(false);
    choosePath(w, a, 'forge');
    choosePath(w, b, 'boulevard');
    expect(questProgress(w, { kind: 'path', count: 2 }).done).toBe(true);
    expect(questProgress(w, { kind: 'paths', count: 2 }).done).toBe(true);
    expect(questProgress(w, { kind: 'paths', count: 3 }).done).toBe(false);
    expect(questProgress(w, { kind: 'capstone', count: 1 }).done).toBe(false);
    buildDistrict(w, a, 'heavyexchange');
    expect(questProgress(w, { kind: 'capstone', count: 1 }).done).toBe(true);
  });
});
