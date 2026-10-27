import { describe, expect, it } from 'vitest';
import { DISTRICTS, PATHS, PATH_COST, VEHICLE_DEFS } from './defs';
import { districtGoods, venuesOf } from './venues';
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
import { connectSites, createBlankWorld, createRoute, createWorld, linkableSites, startRoute, marketList, onNetwork, placeAt, planRoute, removeRoute, removeRouteError, roadEndError, routeAt, routeRefund, step, upgradeVehicle, upgradeVehicleCost, upgradeVehicleError, unitPrice, type World } from './world';

function world(): World {
  const w = createWorld(11);
  w.money = 1e6;
  for (const p of w.places) p.stage = 2;
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
    expect(marketList(p)).not.toContain('honey');
    buildDistrict(w, p, 'farmersmarket');
    expect(districtDemand(p, 'market')).toEqual(['honey', 'juice', 'pasta']);
    expect(marketList(p)).toContain('honey');
  });

  it('raise what the town pays for the goods they live on', () => {
    const w = world();
    const p = w.places[0];
    p.level = 2;
    buildDistrict(w, p, 'restaurants');
    // What the town's own restaurants cook with pays more; what none of them cook with does not.
    const menu = districtGoods(p, 'restaurants');
    expect(townPriceMult(p, menu[0])).toBeGreaterThan(1);
    expect(townPriceMult(p, 'steel')).toBe(1);
    const market = w.sites.find((s) => s.placeId === p.id && s.kind === 'market')!;
    expect(unitPrice(w, market, menu[0])).toBeGreaterThan(0);
  });

  it('earn only while the town is stocked with what they live on', () => {
    const w = world();
    const p = w.places[0];
    p.level = 2;
    buildDistrict(w, p, 'restaurants');
    expect(districtRevenue(w, p)).toBe(0);
    // The district's own building is what has to be stocked: its trucks drop the goods there.
    const market = w.sites.find((s) => s.placeId === p.id && s.districtId === 'restaurants')!;
    const [first, second] = venuesOf(p, 'restaurants', 1);
    for (const g of first.goods) market.stock[g] = 5;
    const half = districtRevenue(w, p);
    expect(half).toBeGreaterThan(0);
    for (const g of second.goods) market.stock[g] = 5;
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
    for (let i = 0; i < 600; i++) step(w);
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
    w.vehicles.push({ id: 901, homeId: 1, routeId: 900, destId: 0, kind: 'boxtruck', idx: 0, dir: 1, state: 'loading', moveTimer: 0, cargo: 0, good: null });
    w.vehicles.push({ id: 903, homeId: 1, routeId: 900, destId: 0, kind: 'boxtruck', idx: 0, dir: 1, state: 'loading', moveTimer: 0, cargo: 0, good: null });
    w.tier = 0;
    expect(upgradeVehicleError(w, 901)).toMatch(/Tier 2/);
    w.tier = 2;
    // A bigger class needs a bigger yard: the Big Box Truck wants level 2 at its home.
    expect(upgradeVehicleError(w, 901)).toMatch(/at level 2/);
    w.sites.find((q) => q.id === 1)!.level = 2;
    const cost = upgradeVehicleCost('boxtruck');
    expect(cost).toBe(VEHICLE_DEFS.bigtruck.cost - VEHICLE_DEFS.boxtruck.cost / 2);
    const before = w.money;
    expect(upgradeVehicle(w, 901)).toBeNull();
    expect(w.money).toBe(before - cost);
    // Only the one that was picked changes.
    expect(w.vehicles[0].kind).toBe('bigtruck');
    expect(w.vehicles[1].kind).toBe('boxtruck');
    // Next up is the rig at Tier 6.
    expect(upgradeVehicleError(w, 901)).toMatch(/Tier 6/);
    w.tier = 25;
    w.sites.find((q) => q.id === 1)!.level = 5;
    for (let i = 0; i < 2; i++) expect(upgradeVehicle(w, 901)).toBeNull();
    expect(w.vehicles[0].kind).toBe('convoy');
    expect(upgradeVehicleError(w, 901)).toMatch(/top class/);
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

describe('free roads and removing routes', () => {
  const line = (x0: number, x1: number, y: number) => {
    const out = [];
    for (let x = x0; x <= x1; x++) out.push({ x, y });
    return out;
  };

  it('lays a road with no building at either end, and no vehicle comes with it', () => {
    const w = createWorld(11);
    w.money = 1e5;
    // Find a stretch of open grass.
    let y = 20;
    let x0 = 0;
    search: for (y = 12; y < 50; y++) {
      for (x0 = 0; x0 < w.width - 8; x0++) {
        const ok = line(x0, x0 + 5, y).every((t) => w.terrain[t.y * w.width + t.x] === 'grass' && !roadEndError(w, t.x, t.y, 'road') && !placeAt(w, t.x, t.y));
        if (ok) break search;
      }
    }
    const path = line(x0, x0 + 5, y);
    const plan = planRoute(w, path);
    expect(plan.error).toBeNull();
    expect(plan.free).toBe(true);
    const before = w.money;
    expect(createRoute(w, path)).toBeNull();
    expect(w.money).toBe(before - plan.cost);
    expect(w.routes[w.routes.length - 1].free).toBe(true);
    expect(w.vehicles.length).toBe(0);
    // A second road can join it, and the shared tiles are free.
    expect(onNetwork(w, x0 + 2, y, 'road')).toBe(true);
    expect(routeAt(w, x0 + 2, y, 'road', { vehicles: true })).toBeUndefined();
    // Refused on water.
    const sea = w.terrain.findIndex((t) => t === 'water');
    expect(roadEndError(w, sea % w.width, Math.floor(sea / w.width), 'road')).toMatch(/water/);
    // Removing it refunds half and takes the road away.
    const id = w.routes[w.routes.length - 1].id;
    const refund = routeRefund(w, w.routes[w.routes.length - 1]);
    expect(refund).toBeGreaterThan(0);
    const m = w.money;
    expect(removeRoute(w, id)).toBeNull();
    expect(w.money).toBe(m + refund);
    expect(onNetwork(w, x0 + 2, y, 'road')).toBe(false);
  });

  it('removing a route sends its vehicles home and leaves town streets alone', () => {
    const w = world();
    w.routes.push({ id: 900, mode: 'road', grade: 'street', fromSiteId: 1, toSiteId: 2, path: [{ x: 0, y: 0 }, { x: 1, y: 0 }] });
    w.vehicles.push({ id: 901, homeId: 1, routeId: 900, destId: 0, kind: 'boxtruck', idx: 0, dir: 1, state: 'loading', moveTimer: 0, cargo: 0, good: null });
    w.routes.push({ id: 902, mode: 'road', fromSiteId: 1, toSiteId: 2, path: [{ x: 0, y: 1 }, { x: 1, y: 1 }] });
    expect(removeRouteError(w, 902)).toMatch(/streets/);
    expect(removeRoute(w, 900)).toBeNull();
    expect(w.vehicles.length).toBe(1);
    expect(w.vehicles[0].routeId).toBe(0);
    expect(w.routes.some((r) => r.id === 900)).toBe(false);
  });
});

describe('routes along a network of free roads', () => {
  it('opens a route between two buildings that are only joined by free roads', () => {
    const w = createBlankWorld(40, 16, new Array(40 * 16).fill('grass'));
    w.money = 10000;
    w.tier = 1;
    const site = (kind: 'forestry' | 'sawmill', x: number, y: number) => {
      w.sites.push({ id: w.nextId++, kind, name: `${kind} ${x}`, x, y, stock: {}, timer: 0, level: 1, nodeId: null, placeId: null, pull: [] });
    };
    site('forestry', 3, 8);
    site('sawmill', 20, 8);
    const row = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => ({ x: a + i, y: 8 }));
    // Two stretches of plain road that meet in the middle: neither ends at both buildings.
    expect(createRoute(w, row(3, 11))).toBeNull();
    expect(createRoute(w, row(11, 20))).toBeNull();
    // Joining the two stretches joins the buildings at their far ends, with nothing to buy or click.
    expect(w.vehicles.length).toBe(0);
    const camp = w.sites[0];
    const mill = w.sites[1];
    const lane = w.routes.find((r) => !r.free && r.over);
    expect(lane).toBeDefined();
    expect([lane!.fromSiteId, lane!.toSiteId].sort()).toEqual([camp.id, mill.id].sort());
    expect(linkableSites(w, camp.id)).toHaveLength(0);
    expect(startRoute(w, camp.id, mill.id)).toMatch(/not joined/);
  });

  it('opens routes by itself for the buildings at the ends of a new road', () => {
    const w = createBlankWorld(40, 16, new Array(40 * 16).fill('grass'));
    w.money = 10000;
    for (const [kind, x] of [['forestry', 3], ['sawmill', 20]] as const) {
      w.sites.push({ id: w.nextId++, kind, name: `${kind} ${x}`, x, y: 8, stock: {}, timer: 0, level: 1, nodeId: null, placeId: null, pull: [] });
    }
    const row = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => ({ x: a + i, y: 8 }));
    createRoute(w, row(3, 11));
    createRoute(w, row(11, 20));
    expect(w.routes.filter((r) => r.over && !r.free)).toHaveLength(1);
    expect(connectSites(w, [w.sites[0].id])).toHaveLength(0);
    expect(w.vehicles).toHaveLength(0);
  });
});
