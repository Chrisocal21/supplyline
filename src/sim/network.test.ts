import { describe, expect, it } from 'vitest';
import map1 from '../maps/map1.json';
import { findPath } from './path';
import { runChores } from './bot';
import { put } from './testutil';
import { HIGHWAY_TIER, SITE_DEFS } from './defs';
import { airportPad, buildCost, FOREST_CLEAR_COST, buyVehicle, createBlankWorld, createRoute, createSeaRoute, portSpot, portWater, seaPath, setSendTo, createWorldFromMap, layoutOf, placeError, placeSite, plotTiles, siteAt, siteCenter, siteTiles, yardSpot, siteById, step, streetAt, terrainAt, type MapData, type World } from './world';

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

  it('joins buildings through the yards in between, so a chain of roads joins every stop on it', () => {
    const w = createBlankWorld(60, 16, new Array(60 * 16).fill('grass'));
    w.money = 1e6;
    w.tier = 3;
    const row = (a: number, b: number, y: number) => Array.from({ length: b - a + 1 }, (_, i) => ({ x: a + i, y }));
    // Two farms and a mill, strung along one road: farm A, then farm B, then the mill. Each road runs yard to yard.
    for (const x of [5, 15]) w.nodes.push({ id: w.nextId++, kind: 'farmland', x, y: 8, quality: 1, regionId: 0 });
    expect(placeSite(w, 'farm', 5, 8)).toBeNull();
    expect(placeSite(w, 'farm', 15, 8)).toBeNull();
    put(w, 'mill', 25, 8);
    const [a, b, m] = [siteAt(w, 5, 8)!, siteAt(w, 15, 8)!, siteAt(w, 25, 8)!];
    expect(createRoute(w, row(5, 15, 8))).toBeNull();
    expect(createRoute(w, row(15, 25, 8))).toBeNull();
    const joined = (x: number, y: number) => w.routes.some((r) => r.over && !r.free && [r.fromSiteId, r.toSiteId].sort().join() === [x, y].sort().join());
    expect(joined(b.id, m.id)).toBe(true);
    // Farm A reaches the mill past farm B's yard: grain is grain, wherever it is grown.
    expect(joined(a.id, m.id)).toBe(true);
    const lane = w.routes.find((r) => r.over && r.fromSiteId === a.id && r.toSiteId === m.id)!;
    expect(lane.path[0]).toEqual({ x: 5, y: 8 });
    expect(lane.path[lane.path.length - 1]).toEqual({ x: 25, y: 8 });
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
    expect(placeError(w, 'airport', 27, 15)).toMatch(/3x3 tiles of open/);
    // Hard against a mountain is no better.
    for (let dx = -1; dx <= 1; dx++) w.terrain[10 * 60 + 8 + dx] = 'mountain';
    expect(placeError(w, 'airport', 8, 11)).toMatch(/3x3 tiles of open/);
    w.places.push({ id: 1, name: 'Midton', x: 45, y: 25, level: 1, growth: 0, delivered: {}, marketTile: { x: 46, y: 25 }, freightTile: { x: 44, y: 25 }, style: 'temperate', taste: {}, radius: 3, homePlots: [] });
    expect(placeError(w, 'airport', 45, 21)).toMatch(/Too close|town/);
  });

  it('an airport covers 3x3 tiles, faces the way it was turned, and takes its road at the middle of its front', () => {
    const w = createBlankWorld(60, 30, new Array(60 * 30).fill('grass'));
    w.money = 1e6;
    w.tier = 3;
    expect(placeSite(w, 'airport', 20, 15, 1)).toBeNull();
    const a = w.sites[w.sites.length - 1];
    // Placed by its middle, facing east: its gate is the middle of the east side.
    expect(a.rot).toBe(1);
    expect({ x: a.x, y: a.y }).toEqual({ x: 21, y: 15 });
    expect(siteCenter(w, a)).toEqual({ x: 20, y: 15 });
    expect(siteTiles(w, a)).toHaveLength(9);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) expect(siteAt(w, 20 + dx, 15 + dy)?.id).toBe(a.id);
    expect(siteAt(w, 22, 15)).toBeUndefined();
    // Nothing else can be built on its field, and another airport needs ground of its own.
    expect(placeError(w, 'sawmill', 19, 14)).toBeTruthy();
    expect(placeError(w, 'airport', 22, 15)).toMatch(/3x3/);
    expect(placeError(w, 'airport', 23, 15)).toBeNull();
    // A road to the gate joins it to the network.
    expect(createRoute(w, [{ x: 21, y: 15 }, { x: 22, y: 15 }, { x: 23, y: 15 }, { x: 24, y: 15 }])).toBeNull();
    // Facing water, it cannot be turned that way; left to itself it finds a side that works.
    for (let y = 0; y < 30; y++) w.terrain[y * 60 + 42] = 'water';
    expect(placeError(w, 'airport', 40, 15, 1)).toMatch(/turn it/);
    expect(placeError(w, 'airport', 40, 15)).toBeNull();
    // The facing is kept as turned.
    expect(placeSite(w, 'airport', 10, 5, 2)).toBeNull();
    expect(w.sites[w.sites.length - 1].rot).toBe(2);
    expect({ x: w.sites[w.sites.length - 1].x, y: w.sites[w.sites.length - 1].y }).toEqual({ x: 10, y: 4 });
  });

  it('keeps the ground a town will grow over clear, while its plots stay free to build on', () => {
    const w = createBlankWorld(60, 30, new Array(60 * 30).fill('grass'));
    w.money = 1e6;
    w.tier = 3;
    const town = { id: 1, name: 'Midton', x: 30, y: 15, level: 1, growth: 0, delivered: {}, marketTile: { x: 31, y: 15 }, freightTile: { x: 29, y: 15 }, style: 'temperate' as const, taste: {}, radius: 3, homePlots: [] };
    w.places.push(town);
    // The main street reaches 3 tiles each way now and 7 when fully grown: the stretch between is kept for it.
    expect(placeError(w, 'hub', 35, 15)).toMatch(/Kept clear for Midton/);
    expect(placeError(w, 'sawmill', 35, 15)).toMatch(/Kept clear for Midton|town/);
    // Inside the town, its free plots take buildings just as before.
    const lot = plotTiles(w, town)[4];
    expect(placeError(w, 'bakery', lot.x, lot.y)).toBeNull();
    // Once the town has grown over it, it is the town's street.
    town.level = 5;
    expect(placeError(w, 'hub', 35, 15)).toMatch(/main street|Too close/);
  });

  it('clears forest and levels the ground for an airport, at a price', () => {
    const w = createBlankWorld(60, 30, new Array(60 * 30).fill('grass'));
    w.money = 1e6;
    w.tier = 3;
    for (let dy = -1; dy <= 1; dy++) w.terrain[(15 + dy) * 60 + 20] = 'forest';
    expect(placeError(w, 'airport', 20, 15)).toBeNull();
    expect(buildCost(w, 'airport', 20, 15)).toBe(SITE_DEFS.airport.cost + 3 * FOREST_CLEAR_COST);
    // Gently rolling ground is levelled; a cliff is not.
    for (let dx = -1; dx <= 1; dx++) w.elev[16 * 60 + 40 + dx] += 20;
    expect(placeError(w, 'airport', 40, 15)).toBeNull();
    for (let dx = -1; dx <= 1; dx++) w.elev[16 * 60 + 40 + dx] += 60;
    expect(placeError(w, 'airport', 40, 15)).toMatch(/steep/);
    const before = w.money;
    expect(placeSite(w, 'airport', 20, 15)).toBeNull();
    expect(before - w.money).toBe(SITE_DEFS.airport.cost + 3 * FOREST_CLEAR_COST);
  });

  it('keeps a spot for an airport by every town on the map, and lets an airport go there', () => {
    const w = createWorldFromMap(map1 as MapData);
    w.tier = 3;
    w.money = 1e6;
    const withPad = w.places.filter((p) => airportPad(w, p));
    expect(withPad.length).toBeGreaterThanOrEqual(w.places.length - 1);
    const town = withPad[0];
    const pad = airportPad(w, town)!;
    expect(placeError(w, 'airport', pad.x, pad.y, pad.rot)).toBeNull();
    // Nothing else may take it.
    expect(placeError(w, 'hub', pad.x, pad.y)).toMatch(/Kept clear for .*airport/);
    expect(placeSite(w, 'airport', pad.x, pad.y, pad.rot)).toBeNull();
    // Once the town has its airport, the ground is no longer kept.
    expect(airportPad(w, town)).toBeNull();
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
    expect(placeError(w, 'port', main.x + 12, main.y)).toMatch(/coast|town|Too close|Cannot|steep|Kept clear/);
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
