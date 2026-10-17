import { describe, expect, it } from 'vitest';
import map1 from '../maps/map1.json';
import { findPath } from './path';
import { runChores } from './bot';
import { HIGHWAY_TIER } from './defs';
import { buyVehicle, createBlankWorld, createRoute, createSeaRoute, portSpot, portWater, seaPath, setSendTo, createWorldFromMap, layoutOf, placeError, placeSite, plotTiles, siteAt, yardSpot, siteById, step, streetAt, terrainAt, type MapData, type World } from './world';

/** A farm on the nearest farmland to the first town, and a free spot on that town's main street to join. */
function setup(): { w: World; farm: NonNullable<ReturnType<typeof siteAt>>; mill: NonNullable<ReturnType<typeof siteAt>>; street: { x: number; y: number } } {
  const w = createWorldFromMap(map1 as MapData);
  w.tier = Math.max(w.tier, HIGHWAY_TIER);
  w.money = 1e6;
  const town = w.places[0];
  const node = w.nodes
    .filter((n) => n.kind === 'farmland')
    .sort((a, b) => Math.hypot(a.x - town.x, a.y - town.y) - Math.hypot(b.x - town.x, b.y - town.y))[0];
  expect(placeSite(w, 'farm', node.x, node.y)).toBeNull();
  const farm = siteAt(w, node.x, node.y)!;
  // A flour mill on one of the town's lots: it wants what the farm grows.
  const lot = plotTiles(w, town).find((t) => placeSite(w, 'mill', t.x, t.y) === null)!;
  const mill = siteAt(w, lot.x, lot.y)!;
  const streets = layoutOf(w, town).streets.map((s) => ({ x: town.x + s.x, y: town.y + s.y }));
  const street = streets.filter((t) => streetAt(w, t.x, t.y)).sort((a, b) => Math.hypot(a.x - node.x, a.y - node.y) - Math.hypot(b.x - node.x, b.y - node.y))[0];
  return { w, farm, mill, street };
}

describe('roads that join a network', () => {
  it('a road that runs onto a town street joins its buildings, with no route drawn to them', () => {
    const { w, farm, mill, street } = setup();
    const path = findPath(w, { x: farm.x, y: farm.y }, street)!;
    expect(path).not.toBeNull();
    expect(createRoute(w, path, 'road', 'street')).toBeNull();
    const lane = w.routes.find((r) => r.over && !r.free && [r.fromSiteId, r.toSiteId].sort().join() === [farm.id, mill.id].sort().join());
    expect(lane).toBeDefined();
    expect(siteById(w, lane!.fromSiteId)).toBeDefined();
    // A truck bought at the farm has somewhere to go.
    expect(buyVehicle(w, farm.id, 'boxtruck')).toBeNull();
  });

  it('a highway laid from a road onto a town street links the buildings at both ends of the whole network', () => {
    const { w, farm, mill, street } = setup();
    // The farm road stops short of the town on plain ground; the highway then carries it the rest of the way.
    const full = findPath(w, { x: farm.x, y: farm.y }, street)!;
    const cut = Math.max(2, Math.floor(full.length / 2));
    expect(createRoute(w, full.slice(0, cut + 1), 'road', 'street')).toBeNull();
    expect(w.routes.some((r) => r.over && !r.free)).toBe(false);
    expect(createRoute(w, full.slice(cut), 'road', 'highway')).toBeNull();
    expect(w.routes.some((r) => r.over && !r.free && [r.fromSiteId, r.toSiteId].sort().join() === [farm.id, mill.id].sort().join())).toBe(true);
  });
});

describe('keeping a network joined', () => {
  it('rejoins buildings on one network by itself, as an old save or a growing town would need', () => {
    const { w, farm, mill, street } = setup();
    expect(createRoute(w, findPath(w, { x: farm.x, y: farm.y }, street)!, 'road', 'street')).toBeNull();
    const pair = (r: { fromSiteId: number; toSiteId: number }) => [r.fromSiteId, r.toSiteId].sort().join() === [farm.id, mill.id].sort().join();
    expect(w.routes.some((r) => r.over && pair(r))).toBe(true);
    w.routes = w.routes.filter((r) => !r.over);
    expect(w.routes.some((r) => r.over && pair(r))).toBe(false);
    for (let i = 0; i < 100; i++) step(w);
    expect(w.routes.some((r) => r.over && pair(r))).toBe(true);
  });
});

describe('automatic roads', () => {
  const flat = (): World => {
    const w = createBlankWorld(40, 16, new Array(40 * 16).fill('grass'));
    w.money = 1e6;
    w.tier = 3;
    return w;
  };

  it('keep off resource spots when there is open ground beside them', () => {
    const w = flat();
    // A straight run from (3,8) to (20,8) with a row of spots across its line.
    for (let x = 8; x <= 14; x++) w.nodes.push({ id: w.nextId++, kind: 'farmland', x, y: 8, quality: 1, regionId: 0 });
    const path = findPath(w, { x: 3, y: 8 }, { x: 20, y: 8 })!;
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(17);
    const spots = new Set(w.nodes.map((n) => n.x + ',' + n.y));
    expect(path.some((t) => spots.has(t.x + ',' + t.y))).toBe(false);
  });

  it('cross a spot rather than fail when it is the only way', () => {
    const w = flat();
    // A wall of spots across the whole map height leaves no way round.
    for (let y = 0; y < 16; y++) w.nodes.push({ id: w.nextId++, kind: 'farmland', x: 15, y, quality: 1, regionId: 0 });
    expect(findPath(w, { x: 3, y: 8 }, { x: 30, y: 8 })).not.toBeNull();
  });

  it('join an existing road instead of running a new one beside it', () => {
    const w = createBlankWorld(120, 16, new Array(120 * 16).fill('grass'));
    w.money = 1e6;
    w.tier = 3;
    const row = (a: number, b: number, y: number) => Array.from({ length: b - a + 1 }, (_, i) => ({ x: a + i, y }));
    expect(createRoute(w, row(10, 50, 4))).toBeNull();
    const path = findPath(w, { x: 10, y: 8 }, { x: 50, y: 8 })!;
    // It heads for the road already there (row 4) and follows it, not straight along row 8.
    expect(path.filter((t) => t.y === 4).length).toBeGreaterThan(10);
  });
});

describe('places for airports and rail yards', () => {
  it('an airport needs flat open ground with room for a road, clear of towns and water', () => {
    const w = createBlankWorld(60, 30, new Array(60 * 30).fill('grass'));
    w.money = 1e6;
    w.tier = 3;
    expect(placeError(w, 'airport', 20, 15)).toBeNull();
    // A spit of land with sea on three sides is no place for a runway.
    for (let y = 10; y <= 20; y++) for (let x = 28; x <= 40; x++) w.terrain[y * 60 + x] = 'water';
    w.terrain[15 * 60 + 27] = 'grass';
    expect(placeError(w, 'airport', 27, 15)).toMatch(/flat, open ground/);
    // Hard against a mountain is no better.
    for (let dx = -1; dx <= 1; dx++) w.terrain[10 * 60 + 8 + dx] = 'mountain';
    expect(placeError(w, 'airport', 8, 11)).toMatch(/flat, open ground/);
    w.places.push({ id: 1, name: 'Midton', x: 45, y: 25, level: 1, growth: 0, delivered: {}, marketTile: { x: 46, y: 25 }, freightTile: { x: 44, y: 25 }, style: 'temperate', taste: {}, radius: 3, homePlots: [] });
    expect(placeError(w, 'airport', 45, 21)).toMatch(/Too close|town/);
  });

  it('puts a Rail Yard just outside a town, never in its streets or lots, and gives it track and trucks', () => {
    const w = createWorldFromMap(map1 as MapData);
    w.tier = 3;
    w.money = 1e6;
    const town = w.places[0];
    const spot = yardSpot(w, town)!;
    expect(spot).not.toBeNull();
    // Beside the town, outside it.
    expect(Math.hypot(spot.x - town.x, spot.y - town.y)).toBeLessThan(15);
    expect(streetAt(w, spot.x, spot.y)).toBeUndefined();
    expect(placeError(w, 'railyard', spot.x, spot.y)).toBeNull();
    // Not in a lot, nor on a street, nor out in the country.
    const lot = plotTiles(w, town)[4];
    expect(placeError(w, 'railyard', lot.x, lot.y)).toBeTruthy();
    expect(placeError(w, 'railyard', town.x, town.y)).toBeTruthy();
    // Out in the country, miles from any town.
    let lonely: { x: number; y: number } | null = null;
    for (let y = 8; y < w.height - 8 && !lonely; y++) {
      for (let x = 0; x < w.width && !lonely; x++) {
        if (terrainAt(w, x, y) === 'grass' && w.places.every((p) => Math.hypot(p.x - x, p.y - y) > 10)) lonely = { x, y };
      }
    }
    expect(lonely).not.toBeNull();
    expect(placeError(w, 'railyard', lonely!.x, lonely!.y)).toMatch(/edge of a town|steep/);
    expect(placeSite(w, 'railyard', spot.x, spot.y)).toBeNull();
    const yard = siteAt(w, spot.x, spot.y)!;
    // Track can leave it at once.
    const out = [{ x: spot.x - 9, y: spot.y }, { x: spot.x + 9, y: spot.y }, { x: spot.x, y: spot.y - 9 }, { x: spot.x, y: spot.y + 9 }].find((o) => terrainAt(w, o.x, o.y) === 'grass')!;
    expect(findPath(w, { x: yard.x, y: yard.y }, out, 200000, 'rail')).not.toBeNull();
    // Trucks bring the town's goods to it over the streets.
    expect(w.sites.some((o) => o.id !== yard.id)).toBe(true);
  });

});

describe('islands and the sea', () => {
  it('has islands with specialties, and the specialties are only there', () => {
    const w = createWorldFromMap(map1 as MapData);
    for (const kind of ['coffee', 'mango', 'oil'] as const) expect(w.nodes.filter((n) => n.kind === kind).length).toBeGreaterThanOrEqual(3);
    // Nothing of them on the mainland: every one is on an island town's own island, a long way from the home town.
    const home = w.places[0];
    for (const n of w.nodes.filter((q) => q.kind === 'coffee' || q.kind === 'mango' || q.kind === 'oil')) expect(Math.hypot(n.x - home.x, n.y - home.y)).toBeGreaterThan(20);
    expect(w.places.map((p) => p.name)).toContain('Ventura');
  });

  it('puts a port on the coast only, and sails goods from an island to the mainland', () => {
    const w = createWorldFromMap(map1 as MapData);
    w.tier = 4;
    w.money = 1e7;
    const isle = w.places.find((p) => p.name === 'Ventura')!;
    const main = w.places.find((p) => p.name === 'Rio Palma')!;
    // Not inland.
    expect(placeError(w, 'port', main.x + 12, main.y)).toMatch(/coast|town|Too close|Cannot|steep/);
    const a = portSpot(w, isle)!;
    const b = portSpot(w, main)!;
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(portWater(w, a.x, a.y)).not.toBeNull();
    expect(placeSite(w, 'port', a.x, a.y)).toBeNull();
    expect(placeSite(w, 'port', b.x, b.y)).toBeNull();
    const pa = siteAt(w, a.x, a.y)!;
    const pb = siteAt(w, b.x, b.y)!;
    expect(seaPath(w, pa, pb)).not.toBeNull();
    expect(createSeaRoute(w, pa.id, pb.id)).toBeNull();
    expect(createSeaRoute(w, pa.id, pb.id)).toMatch(/already linked/);
    const route = w.routes.find((r) => r.mode === 'sea')!;
    // Every tile of the lane between the ports is water.
    for (const t of route.path.slice(1, -1)) expect(terrainAt(w, t.x, t.y)).toBe('water');
    expect(buyVehicle(w, pa.id, 'boat')).toBeNull();
    pa.stock.coffee = 400;
    pb.pull = ['coffee'];
    setSendTo(w, pa.id, pb.id, true);
    for (let i = 0; i < 6000; i++) {
      step(w);
      if (i % 200 === 0) runChores(w);
    }
    expect(pb.stock.coffee ?? 0).toBeGreaterThan(10);
  });
});
