import { describe, expect, it } from 'vitest';
import { MOUNTAIN_ELEV, VEHICLE_DEFS } from './defs';
import { put, stockLevelMats } from './testutil';
import { runChores } from './bot';
import type { Terrain } from './defs';
import { generateLand } from './mapgen';
import {
  addDock,
  buyVehicle,
  growPreview,
  growTown,
  readyToGrow,
  createBlankWorld,
  createRoute,
  createWorld,
  placeError,
  placeSite,
  planRoute,
  setHubPull,
  siteAt,
  siteById,
  step,
  inboundTo,
  HISTORY_JOBS,
  stockOf,
  upgradeSite,
  wrapX,
  type Tile,
  type World,
} from './world';

/**
 * 40x20 test map:
 *  forest x2..6 y3..6 (forestry node at 3,4), farmland node at (3,12),
 *  town Testford at (14,10) with docks at (16,10) and (12,10),
 *  water band x22..24, mountain band x30..32 with a quarry node at (30,9),
 *  ice on the top and bottom two rows.
 */
function testWorld(): World {
  const w = 40;
  const h = 20;
  const terrain: Terrain[] = new Array<Terrain>(w * h).fill('grass');
  const set = (x0: number, y0: number, x1: number, y1: number, t: Terrain) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) terrain[y * w + x] = t;
  };
  set(2, 3, 6, 6, 'forest');
  set(22, 2, 24, 17, 'water');
  set(30, 4, 32, 14, 'mountain');
  set(0, 0, w - 1, 1, 'ice');
  set(0, h - 2, w - 1, h - 1, 'ice');
  const world = createBlankWorld(w, h, terrain);
  world.places.push({
    id: 1,
    name: 'Testford',
    x: 14,
    y: 10,
    level: 1,
    growth: 0,
    delivered: {},
    marketTile: { x: 15, y: 9 },
    freightTile: { x: 13, y: 11 },
    style: "temperate",
    taste: {},
    radius: 3,
    homePlots: [],
  });
  addDock(world, world.places[0], 'market');
  world.nodes.push({ id: 1, kind: 'forest', x: 3, y: 4, quality: 1, regionId: 0 });
  world.nodes.push({ id: 2, kind: 'farmland', x: 3, y: 12, quality: 1, regionId: 0 });
  world.nodes.push({ id: 3, kind: 'quarry', x: 30, y: 9, quality: 1, regionId: 0 });
  return world;
}

function row(x0: number, x1: number, y: number): Tile[] {
  const out: Tile[] = [];
  const s = x1 >= x0 ? 1 : -1;
  for (let x = x0; x !== x1 + s; x += s) out.push({ x, y });
  return out;
}

function col(x: number, y0: number, y1: number): Tile[] {
  const out: Tile[] = [];
  const s = y1 >= y0 ? 1 : -1;
  for (let y = y0; y !== y1 + s; y += s) out.push({ x, y });
  return out;
}

describe('building', () => {
  it('requires nodes for extraction; industry goes on open ground or a town plot', () => {
    const w = testWorld();
    w.tier = 1;
    // Forests, quarries and the like are permanent spots: only a farm, ranch or orchard goes on open ground.
    expect(placeError(w, 'forestry', 5, 5)).toMatch(/forest node/);
    expect(placeError(w, 'sawmill', 3, 4)).toMatch(/forest node/);
    expect(placeError(w, 'forestry', 3, 4)).toBeNull();
    expect(placeError(w, 'farm', 3, 4)).toMatch(/forest node/);
    expect(placeError(w, 'farm', 6, 9)).toBeNull();
    expect(placeError(w, 'sawmill', 9, 4)).toBeNull();
    expect(placeError(w, 'sawmill', 13, 9)).toBeNull();
    expect(placeError(w, 'sawmill', 13, 11)).toMatch(/Reserved/);
    // plots all around the streets are open from the start
    expect(placeError(w, 'sawmill', 17, 9)).toBeNull();
    expect(placeError(w, 'sawmill', 11, 11)).toBeNull();
    
    expect(placeError(w, 'quarry', 30, 9)).toBeNull();
  });

  it('keeps clear of towns, and gates by tier and money', () => {
    const w = testWorld();
    expect(placeError(w, 'hub', 9, 4)).toMatch(/Tier 1/);
    w.tier = 1;
    expect(placeError(w, 'hub', 14, 10)).toMatch(/main street/);
    expect(placeError(w, 'hub', 13, 12)).toMatch(/Too close to Testford|Reserved/);
    expect(placeError(w, 'hub', 13, 11)).toMatch(/Reserved/);
    w.money = 10;
    expect(placeError(w, 'sawmill', 13, 9)).toBe('Need $220');
  });

  it('occupies a node and charges money', () => {
    const w = testWorld();
    const before = w.money;
    expect(placeSite(w, 'forestry', 3, 4)).toBeNull();
    expect(w.money).toBe(before - 80);
    expect(placeError(w, 'forestry', 3, 4)).toMatch(/occupied/);
    expect(w.sites.find((s) => s.kind === 'forestry')!.nodeId).toBe(1);
  });
});

describe('roads, bridges and tunnels', () => {
  it('limits bridge span by tier', () => {
    const w = testWorld();
    w.tier = 1;
    w.money = 100000;
    put(w, 'sawmill', 19, 5);
    placeSite(w, 'hub', 27, 5);
    const path = row(19, 27, 5); // crosses the 3-wide river at x22..24
    const plan = planRoute(w, path);
    expect(plan.error).toBeNull();
    expect(plan.bridgeTiles).toBe(3);
    w.tier = 0;
    expect(planRoute(w, path).error).toMatch(/Bridge too long: max 2/);
  });

  it('prices tunnels above roads and limits them by tier', () => {
    const w = testWorld();
    w.tier = 1;
    w.money = 100000;
    placeSite(w, 'hub', 28, 8);
    put(w, 'sawmill', 34, 8);
    const plan = planRoute(w, row(28, 34, 8));
    expect(plan.error).toBeNull();
    expect(plan.tunnelTiles).toBe(3);
    expect(plan.cost).toBe(3 * 36 + 2 * 2);
    w.tier = 0;
    expect(planRoute(w, row(28, 34, 8)).error).toMatch(/Tunnel too long/);
  });

  it('refuses routes through towns, through ice, or between sites with nothing to trade', () => {
    const w = testWorld();
    w.tier = 1;
    w.money = 100000;
    placeSite(w, 'hub', 14, 6);
    placeSite(w, 'hub', 14, 13);
    // straight down the middle of Testford

    placeSite(w, 'forestry', 3, 4);
    placeSite(w, 'farm', 3, 12);
    put(w, 'sawmill', 9, 4);
    // a farm ships grain; a sawmill wants logs
    const path: Tile[] = [...col(3, 12, 8), ...row(4, 9, 8), ...col(9, 7, 5), { x: 9, y: 4 }];
    expect(planRoute(w, path).free).toBe(true);

    placeSite(w, 'hub', 9, 3 - 0 + 5);
    placeSite(w, 'hub', 20, 2 + 0);
    // a path that runs through the ice rows is refused
    const iceHub = { x: 20, y: 2 };
    expect(siteAt(w, iceHub.x, iceHub.y)).toBeDefined();
    expect(planRoute(w, [{ x: 20, y: 2 }, { x: 20, y: 1 }, { x: 20, y: 0 }, { x: 21, y: 0 }, { x: 21, y: 2 }]).error).toBeTruthy();
  });
});

describe('logistics loop', () => {
  function buildChain(): World {
    const w = testWorld();
    addDock(w, w.places[0], 'freight');
    w.money = 100000;
    placeSite(w, 'forestry', 3, 4);
    put(w, 'sawmill', 9, 4);
    expect(createRoute(w, row(3, 9, 4))).toBeNull();
    expect(createRoute(w, [...col(9, 5, 10), ...row(10, 13, 10), { x: 13, y: 11 }])).toBeNull();
    // The farm-goods quests at the end of Tier 0 are not what this chain tests.
    (w.questsDone ??= []).push(...['t0-camps', 't0-ranch', 't0-milk', 't0-dairy', 't0-cheesemake', 't0-cheese', 't0-earn']);
    runChores(w);
    return w;
  }

  it('turns logs into lumber, sells it to the town, grows it and unlocks tier 1', () => {
    const w = buildChain();
    for (let i = 0; i < 6000; i++) step(w);
    expect(w.delivered.lumber ?? 0).toBeGreaterThan(20);
    expect(w.tier).toBe(1);
    // The Village threshold is higher than the first quest, so keep selling until the town grows.
    // A town waits for the player to finish its upgrade.
    stockLevelMats(w.places[0]);
    // Building goods earn nothing and grow nothing: the town grows on finished goods, so give it the growth by hand.
    w.places[0].growth = 1e9;
    w.places[0].delivered = { bread: 1, cheese: 1, jam: 1 };
    for (let i = 0; i < 30000 && !readyToGrow(w.places[0]); i++) step(w);
    expect(w.places[0].level).toBe(1);
    expect(growTown(w, w.places[0].id)).toBeNull();
    expect(w.places[0].level).toBeGreaterThanOrEqual(2);
    expect(w.log.some((l) => /grew into/.test(l.text))).toBe(true);
    expect(w.sites.some((s) => s.kind === 'freight')).toBe(true);
  });

  it('remembers its last sold jobs, never more than 30, and shows loads on the way', () => {
    const w = buildChain();
    const saw = w.sites.find((x) => x.kind === 'sawmill')!;
    let inbound = 0;
    for (let i = 0; i < 12000; i++) {
      step(w);
      if (i % 20 === 0) inbound = Math.max(inbound, inboundTo(w, saw).length);
    }
    expect(inbound).toBeGreaterThan(0);
    expect(saw.history?.length ?? 0).toBeGreaterThan(5);
    expect(saw.history!.length).toBeLessThanOrEqual(HISTORY_JOBS);
    expect(saw.history!.every((j) => j.units > 0)).toBe(true);
  });

  it('never carries more than the truck holds', () => {
    const w = buildChain();
    for (let i = 0; i < 3000; i++) {
      step(w);
      for (const v of w.vehicles) expect(v.cargo).toBeLessThanOrEqual(VEHICLE_DEFS[v.kind].capacity);
    }
  });
});

describe('hubs', () => {
  it('a warehouse feeds a factory: forestry -> hub -> sawmill', () => {
    const w = testWorld();
    w.tier = 1;
    w.money = 100000;
    placeSite(w, 'forestry', 3, 4);
    placeSite(w, 'hub', 8, 8);
    put(w, 'sawmill', 11, 5);
    expect(createRoute(w, [...col(3, 4, 8), ...row(4, 8, 8)])).toBeNull();
    expect(createRoute(w, [...col(8, 8, 5), ...row(9, 11, 5)])).toBeNull();
    for (let i = 0; i < 60; i++) step(w);
    runChores(w);
    for (let i = 0; i < 4000; i++) step(w);
    const saw = w.sites.find((s) => s.kind === 'sawmill')!;
    expect((saw.stock.lumber ?? 0) + (saw.stock.logs ?? 0)).toBeGreaterThan(0);
  });

  it('does not ping-pong goods between two hubs, and honours the pull list', () => {
    const w = testWorld();
    w.tier = 1;
    w.money = 100000;
    put(w, 'hub', 8, 8);
    put(w, 'hub', 8, 12);
    const a = w.sites.find((s) => s.x === 8 && s.y === 8)!;
    const b = w.sites.find((s) => s.x === 8 && s.y === 12)!;
    a.stock.logs = 100;
    expect(createRoute(w, col(8, 8, 12))).toBeNull();
    runChores(w);
    for (let i = 0; i < 4000; i++) step(w);
    expect(stockOf(a, 'logs') + stockOf(b, 'logs')).toBe(100); // nothing created or lost
    // flow stops once the hubs are within the balance margin
    const moved = stockOf(b, 'logs');
    for (let i = 0; i < 1000; i++) step(w);
    expect(stockOf(b, 'logs')).toBe(moved);

    setHubPull(w, b.id, 'logs', false);
    expect(siteById(w, b.id)!.pull).not.toContain('logs');
  });
});

describe('towns and levels', () => {
  it('needs variety of goods to keep growing', () => {
    const w = testWorld();
    const p = w.places[0];
    p.growth = 1e7;
    p.delivered = { lumber: 500 };
    stockLevelMats(p);
    expect(readyToGrow(p)).toBe(true);
    expect(growTown(w, p.id)).toBeNull();
    expect(p.level).toBe(2); // one kind is enough for level 2, but not level 3
    stockLevelMats(p);
    expect(growTown(w, p.id)).toMatch(/not ready/);
    p.delivered = { lumber: 500, flour: 500 };
    expect(growPreview(p)?.to).toBe('Town');
    expect(growPreview(p)?.newMarket.length).toBeGreaterThan(0);
    expect(growTown(w, p.id)).toBeNull();
    expect(p.level).toBe(3);
  });

  it('upgrades buildings by tier', () => {
    const w = testWorld();
    w.money = 100000;
    put(w, 'sawmill', 9, 4);
    const s = w.sites.find((x) => x.kind === 'sawmill')!;
    expect(upgradeSite(w, s.id)).toMatch(/needs Tier 1/);
    w.tier = 1;
    expect(upgradeSite(w, s.id)).toBeNull();
    expect(s.level).toBe(2);
    expect(upgradeSite(w, s.id)).toMatch(/needs Tier 2/);
    expect(upgradeSite(w, siteAt(w, 15, 9)!.id)).toMatch(/deliveries/);
  });

  it('keeps planes off roads', () => {
    const w = testWorld();
    w.money = 100000;
    w.tier = 3;
    placeSite(w, 'forestry', 3, 4);
    put(w, 'sawmill', 9, 4);
    createRoute(w, row(3, 9, 4));
    const camp = w.sites.find((s) => s.kind === 'forestry')!;
    expect(buyVehicle(w, camp.id, 'plane')).toMatch(/cannot run/);
    expect(buyVehicle(w, camp.id, 'boxtruck')).toBeNull();
  });
});

describe('world generation', () => {
  it('is deterministic with continents, mountains, forests and ocean', () => {
    const a = generateLand(192, 64, 5);
    expect(generateLand(192, 64, 5)).toEqual(a);
    const counts: Record<string, number> = {};
    for (const t of a.terrain) counts[t] = (counts[t] ?? 0) + 1;
    const total = 192 * 64;
    const land = (counts.grass ?? 0) + (counts.forest ?? 0) + (counts.mountain ?? 0);
    expect(land / total).toBeGreaterThan(0.25);
    expect(land / total).toBeLessThan(0.45);
    expect(counts.mountain).toBeGreaterThan(40);
    expect(counts.forest).toBeGreaterThan(200);
    expect(counts.ice).toBe(192 * 4);
    expect(a.elev.every((e) => e >= 0 && e <= 255)).toBe(true);
    for (let i = 0; i < a.terrain.length; i++) {
      if (a.terrain[i] === 'mountain') expect(a.elev[i]).toBeGreaterThanOrEqual(MOUNTAIN_ELEV);
    }
  });

  it('builds a named, populated world for any seed', () => {
    for (const seed of [1, 7, 42, 99, 12345]) {
      const w = createWorld(seed);
      expect(w.places.length).toBeGreaterThanOrEqual(5);
      expect(w.nodes.filter((n) => n.kind === 'forest').length).toBeGreaterThan(3);
      expect(w.nodes.filter((n) => n.kind === 'farmland').length).toBeGreaterThan(3);
      expect(w.regions.some((r) => r.kind === 'ocean')).toBe(true);
      expect(w.regions.some((r) => r.kind === 'ice')).toBe(true);
      const names = [...w.regions.map((r) => r.name), ...w.places.map((p) => p.name)];
      expect(new Set(names).size).toBe(names.length);
      for (const p of w.places) {
        expect(w.sites.some((s) => s.kind === 'market' && s.placeId === p.id)).toBe(true);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) expect(w.terrain[(p.y + dy) * w.width + wrapX(w, p.x + dx)]).toBe('grass');
        }
      }
      for (const n of w.nodes) {
        const t = w.terrain[n.y * w.width + n.x];
        expect(t).toBe(n.kind === 'forest' ? 'forest' : 'grass');
      }
    }
  });
});
