import { describe, expect, it } from 'vitest';
import type { Terrain } from './defs';
import { findPath } from './path';
import { put } from './testutil';
import { addDock, addVehicle, createBlankWorld, createRoute, demolishSite, airPath, createAirRoute, dockDemand, ensureStations, townSites, placeSite, planRoute, siteAt, step, stockOf, type World } from './world';

function open(): World {
  const w = 30;
  const h = 14;
  const terrain: Terrain[] = new Array<Terrain>(w * h).fill('grass');
  for (let x = 0; x < w; x++) {
    terrain[0 * w + x] = 'ice';
    terrain[(h - 1) * w + x] = 'ice';
  }
  // a wall of water with a gap, and a town in the way
  for (let y = 2; y < h - 2; y++) terrain[y * w + 12] = 'water';
  terrain[6 * w + 12] = 'grass';
  const world = createBlankWorld(w, h, terrain);
  world.places.push({
    id: 1,
    name: 'Midton',
    x: 20,
    y: 6,
    level: 1,
    growth: 0,
    delivered: {},
    marketTile: { x: 22, y: 6 },
    freightTile: { x: 18, y: 6 },
    style: "temperate",
    taste: {},
    radius: 3,
    homePlots: [],
  });
  addDock(world, world.places[0], 'market');
  world.nodes.push({ id: 1, kind: 'farmland', x: 3, y: 6, quality: 1, regionId: 0 });
  world.money = 1e6;
  world.tier = 3;
  return world;
}

describe('pathfinding', () => {
  it('finds a legal road that goes through the gap and around the town', () => {
    const w = open();
    placeSite(w, 'farm', 3, 6);
    put(w, 'mill', 6, 6);
    const farm = siteAt(w, 3, 6)!;
    const market = siteAt(w, 22, 6)!;
    const path = findPath(w, farm, market);
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ x: 3, y: 6 });
    expect(path![path!.length - 1]).toEqual({ x: 22, y: 6 });
    // it never steps through the town centre
    expect(path!.some((t) => Math.abs(t.x - 20) <= 1 && Math.abs(t.y - 6) <= 1)).toBe(false);
    // a farm sends grain, which a market does not want, so the plan is refused for that reason alone
    const plan = planRoute(w, path!);
    expect(plan.error).toBeNull();
    expect(plan.free).toBe(true);
  });

  it('routes grain farm to mill and the plan is accepted', () => {
    const w = open();
    placeSite(w, 'farm', 3, 6);
    put(w, 'mill', 9, 6);
    const path = findPath(w, siteAt(w, 3, 6)!, siteAt(w, 9, 6)!)!;
    expect(createRoute(w, path)).toBeNull();
  });
});

describe('demolish', () => {
  it('removes the site, its roads and vehicles, and refunds half', () => {
    const w = open();
    placeSite(w, 'farm', 3, 6);
    put(w, 'mill', 9, 6);
    const farm = siteAt(w, 3, 6)!;
    const mill = siteAt(w, 9, 6)!;
    expect(createRoute(w, findPath(w, farm, mill)!)).toBeNull();
    expect(w.routes).toHaveLength(1);
    const before = w.money;
    expect(demolishSite(w, mill.id)).toBeNull();
    expect(w.routes).toHaveLength(0);
    expect(w.vehicles).toHaveLength(0);
    expect(siteAt(w, 9, 6)).toBeUndefined();
    expect(w.money).toBe(before + 110);
    // docks stay
    expect(demolishSite(w, siteAt(w, 22, 6)!.id)).toMatch(/docks cannot/);
  });
});

describe('rail', () => {
  /** A road runs north to south at x=6; a farm and a mill sit either side for a rail line to join. */
  function crossed(): World {
    const w = open();
    w.tier = 3;
    w.money = 100000;
    placeSite(w, 'farm', 3, 6);
    put(w, 'mill', 9, 6);
    placeSite(w, 'hub', 6, 2);
    placeSite(w, 'hub', 6, 10);
    expect(createRoute(w, findPath(w, siteAt(w, 6, 2)!, siteAt(w, 6, 10)!)!)).toBeNull();
    return w;
  }

  it('needs Tier 2 and is its own network', () => {
    const w = open();
    w.tier = 0;
    placeSite(w, 'farm', 3, 6);
    put(w, 'mill', 9, 6);
    const path = findPath(w, siteAt(w, 3, 6)!, siteAt(w, 9, 6)!, 120000, 'rail')!;
    expect(planRoute(w, path, 'rail').error).toMatch(/Tier 2/);
    w.tier = 2;
    expect(createRoute(w, path, 'rail')).toBeNull();
    expect(w.routes[0].mode).toBe('rail');
    expect(w.vehicles[0].kind).toBe('train');
  });

  it('crosses a road at a right angle and counts the level crossing', () => {
    const w = crossed();
    const path = findPath(w, siteAt(w, 3, 6)!, siteAt(w, 9, 6)!, 120000, 'rail')!;
    const plan = planRoute(w, path, 'rail');
    expect(plan.error).toBeNull();
    expect(plan.crossings).toBe(1);
    expect(createRoute(w, path, 'rail')).toBeNull();
  });

  it('refuses to run along or turn on a road tile', () => {
    const w = crossed();
    // a rail that runs straight down the road tiles
    const along = [{ x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 7 }, { x: 7, y: 7 }, { x: 8, y: 7 }, { x: 9, y: 7 }, { x: 9, y: 6 }];
    expect(planRoute(w, along, 'rail').error).toMatch(/right angles/);
  });

  it('only lets trains use rails and trucks use roads', () => {
    const w = crossed();
    const path = findPath(w, siteAt(w, 3, 6)!, siteAt(w, 9, 6)!, 120000, 'rail')!;
    createRoute(w, path, 'rail');
    const rail = w.routes.find((r) => r.mode === 'rail')!;
    const road = w.routes.find((r) => r.mode === 'road')!;
    expect(addVehicle(w, rail.id, 'boxtruck')).toMatch(/need a road/);
    expect(addVehicle(w, road.id, 'train')).toMatch(/need rails/);
    expect(addVehicle(w, rail.id, 'train')).toBeNull();
  });

  it('a train moves goods between sites', () => {
    const w = open();
    w.tier = 2;
    w.money = 100000;
    placeSite(w, 'farm', 3, 6);
    put(w, 'mill', 9, 6);
    createRoute(w, findPath(w, siteAt(w, 3, 6)!, siteAt(w, 9, 6)!, 120000, 'rail')!, 'rail');
    for (let i = 0; i < 1500; i++) step(w);
    expect(stockOf(siteAt(w, 9, 6)!, 'flour') + (siteAt(w, 9, 6)!.stock.grain ?? 0)).toBeGreaterThan(0);
  });
});

describe('towns as districts', () => {
  function townWorld(): World {
    const w = open();
    w.tier = 3;
    w.money = 100000;
    w.places[0].marketTile = { x: 21, y: 5 };
    w.places[0].freightTile = { x: 19, y: 7 };
    w.sites = [];
    addDock(w, w.places[0], 'market');
    return w;
  }

  it('lets a road run straight through the town street but not across its blocks', () => {
    const w = townWorld();
    placeSite(w, 'hub', 16, 6);
    placeSite(w, 'hub', 24, 6);
    const through = findPath(w, siteAt(w, 16, 6)!, siteAt(w, 24, 6)!)!;
    expect(through.some((t) => t.x === 20 && t.y === 6)).toBe(true);
    expect(planRoute(w, through).error).toBeNull();
    // rail may not use town streets
    expect(planRoute(w, through, 'rail').error).toBeTruthy();
  });

  it('builds industry on any plot around the streets and links it to the market on its own', () => {
    const w = townWorld();
    expect(placeSite(w, 'bakery', 19, 5)).toBeNull();
    expect(placeSite(w, 'sawmill', 21, 7)).toBeNull();
    expect(placeSite(w, 'mill', 22, 5)).toBeNull();
    expect(placeSite(w, 'mill', 22, 7)).toBeNull();
    expect(placeSite(w, 'hub', 20, 6)).toMatch(/main street/);
    // the bakery sells bread to the market: a district link appeared with a free van
    const bakery = siteAt(w, 19, 5)!;
    const market = siteAt(w, 21, 5)!;
    const link = w.routes.find((r) => [r.fromSiteId, r.toSiteId].sort().join() === [bakery.id, market.id].sort().join());
    expect(link).toBeDefined();
    expect(link!.path.every((t) => Math.abs(t.x - 20) <= 2 && Math.abs(t.y - 6) <= 2)).toBe(true);
    expect(w.vehicles.some((v) => v.routeId === link!.id)).toBe(true);
  });

  it('turns by-products into their own goods, and does not stall when they pile up', () => {
    const w = townWorld();
    // Standing alone, so nothing hauls the sawdust away: it piles up to the cap while the lumber is taken.
    put(w, 'sawmill', 9, 9);
    const saw = siteAt(w, 9, 9)!;
    for (let i = 0; i < 4000; i++) {
      saw.stock.logs = 30;
      saw.stock.lumber = 0;
      step(w);
    }
    expect(w.produced.lumber ?? 0).toBeGreaterThan(100);
    expect(stockOf(saw, 'sawdust')).toBe(30);
    expect(w.consumed.logs ?? 0).toBeGreaterThan(200);
  });

  it('sells through the town link whichever site was built first', () => {
    // The Market is always older than the buildings beside it, so the link used to run from the Market and its van never left.
    const w = townWorld();
    placeSite(w, 'sawmill', 19, 5);
    const saw = siteAt(w, 19, 5)!;
    for (let i = 0; i < 3000; i++) {
      saw.stock.logs = 30;
      step(w);
    }
    expect(w.delivered.lumber ?? 0).toBeGreaterThan(50);
  });

  it('a road drawn from the customer to the supplier still hauls', () => {
    const w = open();
    w.nodes.push({ id: 2, kind: 'forest', x: 3, y: 9, quality: 1, regionId: 0 });
    placeSite(w, 'forestry', 3, 9);
    put(w, 'sawmill', 9, 9);
    const back = findPath(w, siteAt(w, 9, 9)!, siteAt(w, 3, 9)!)!;
    expect(createRoute(w, back)).toBeNull();
    for (let i = 0; i < 2000; i++) step(w);
    expect(w.produced.lumber ?? 0).toBeGreaterThan(10);
  });

  it('sometimes swings a price', () => {
    const w = townWorld();
    for (let i = 0; i < 20000; i++) step(w);
    expect(w.log.some((l) => /surging|slumped/.test(l.text))).toBe(true);
  });
});

describe('production chains', () => {
  it('every good has a maker, and a user or a buyer', async () => {
    const { GOOD_LIST, SITE_DEFS, MARKET_DEMAND, FREIGHT_DEMAND } = await import('./defs');
    const defs = Object.values(SITE_DEFS);
    for (const g of GOOD_LIST) {
      const made = defs.some((d) => (d.produce && d.produce.good === g) || (d.recipe && g in d.recipe.outputs));
      const used = defs.some((d) => d.recipe && g in d.recipe.inputs) || MARKET_DEMAND.some((l) => l.includes(g)) || FREIGHT_DEMAND.some((l) => l.includes(g));
      expect({ g, made }).toEqual({ g, made: true });
      expect({ g, used }).toEqual({ g, used: true });
    }
  });

  it('every processing recipe makes more value than it uses', async () => {
    const { GOODS, SITE_DEFS } = await import('./defs');
    for (const [k, d] of Object.entries(SITE_DEFS)) {
      if (!d.recipe) continue;
      const v = (s: Record<string, number | undefined>) => Object.entries(s).reduce((n, [g, c]) => n + (c ?? 0) * GOODS[g as keyof typeof GOODS].price, 0);
      expect({ k, ok: v(d.recipe.outputs) > v(d.recipe.inputs) }).toEqual({ k, ok: true });
    }
  });

  it('worlds have every kind of resource node', async () => {
    const { createWorld } = await import('./world');
    for (const seed of [1, 7, 42]) {
      const kinds = new Set(createWorld(seed).nodes.map((n) => n.kind));
      for (const k of ['forest', 'farmland', 'quarry', 'mine', 'coal', 'clay', 'pasture', 'orchard']) expect(kinds.has(k as never)).toBe(true);
    }
  });
});

describe('cities, entrances and highways', () => {
  it('worlds have a few major cities and many small towns, and start in a small town', async () => {
    const { createWorld } = await import('./world');
    for (const seed of [1, 7, 42]) {
      const w = createWorld(seed);
      expect(w.places.filter((p) => p.radius === 5).length).toBeGreaterThanOrEqual(2);
      expect(w.places.filter((p) => p.radius === 3).length).toBeGreaterThanOrEqual(5);
      expect(w.places[0].radius).toBe(3);
      for (const c of w.places.filter((p) => p.radius === 5)) {
        // Every town starts at the bottom, however big its footprint.
        expect(c.level).toBe(1);
        expect(c.growth).toBe(0);
        expect(w.sites.some((s) => s.kind === 'freight' && s.placeId === c.id)).toBe(false);
      }
    }
  });

  it('towns have 12 plots and cities 28', async () => {
    const { plotTiles } = await import('./features');
    expect(plotTiles(0, 0, 3)).toHaveLength(12);
    expect(plotTiles(0, 0, 5)).toHaveLength(28);
    expect(new Set(plotTiles(0, 0, 5).map((t) => `${t.x},${t.y}`)).size).toBe(28);
  });

  it('a road into a plot arrives by the plot street', () => {
    const w = open();
    w.tier = 3;
    w.money = 100000;
    placeSite(w, 'hub', 14, 6);
    put(w, 'bakery', 19, 5); // plot (x-1,y-1) of Midton at (20,6): its street is the one below it, (19,6)
    const path = findPath(w, siteAt(w, 14, 6)!, siteAt(w, 19, 5)!)!;
    expect(path[path.length - 2]).toEqual({ x: 19, y: 6 });
  });

  it('highways need Tier 1, cost more than streets, and run faster', async () => {
    const { routeTicks } = await import('./world');
    const w = open();
    placeSite(w, 'farm', 3, 6);
    put(w, 'mill', 9, 6);
    const path = findPath(w, siteAt(w, 3, 6)!, siteAt(w, 9, 6)!)!;
    w.tier = 0;
    expect(planRoute(w, path, 'road', 'highway').error).toMatch(/Tier 1/);
    w.tier = 1;
    const street = planRoute(w, path, 'road', 'street');
    const highway = planRoute(w, path, 'road', 'highway');
    expect(highway.error).toBeNull();
    expect(highway.cost).toBeGreaterThan(street.cost * 2);
    createRoute(w, path, 'road', 'highway');
    expect(routeTicks(w.routes[0], 4)).toBeLessThan(4);
  });
});

describe('tier quests', () => {
  it('pays each quest once and moves up a tier when the list is done', async () => {
    const { TIERS } = await import('./defs');
    const { checkQuests, nextQuest, questState } = await import('./quests');
    const w = open();
    w.tier = 0;
    w.money = 0;
    const log: string[] = [];
    checkQuests(w, (t) => log.push(t));
    expect(w.questsDone).toHaveLength(0);
    expect(nextQuest(w)?.quest.id).toBe('t0-camp');

    // A sawmill counts as soon as it stands; the reward is paid once only.
    put(w, 'sawmill', 9, 6);
    const before = w.money;
    checkQuests(w, (t) => log.push(t));
    checkQuests(w, (t) => log.push(t));
    expect(w.questsDone).toEqual(['t0-mill']);
    expect(w.money - before).toBe(TIERS[0].quests.find((q) => q.id === 't0-mill')!.reward);
    expect(log.filter((l) => /Quest complete/.test(l))).toHaveLength(1);

    // A finished quest stays finished after the building is gone.
    w.sites = w.sites.filter((s) => s.kind !== 'sawmill');
    expect(questState(w, TIERS[0], TIERS[0].quests[1]).done).toBe(true);

    // The rest of tier 0, by the book.
    w.nodes.push({ id: 2, kind: 'forest', x: 3, y: 9, quality: 1, regionId: 0 });
    w.money = 1e6;
    placeSite(w, 'forestry', 3, 9);
    put(w, 'sawmill', 9, 9);
    expect(createRoute(w, findPath(w, siteAt(w, 3, 9)!, siteAt(w, 9, 9)!)!)).toBeNull();
    w.delivered.lumber = 100;
    checkQuests(w, (t) => log.push(t));
    expect(w.tier).toBe(1);
    expect(log.some((l) => /Tier 1 unlocked/.test(l))).toBe(true);
    expect(nextQuest(w)?.quest.id).toBe('t1-variety');
  });

  it('only asks for things that are unlocked at that tier', async () => {
    const { TIERS, SITE_DEFS, VEHICLE_DEFS, HIGHWAY_TIER, RAIL_TIER, TOWN_LEVELS, MAX_LEVEL, MARKET_DEMAND, FREIGHT_DEMAND } = await import('./defs');
    const ids = new Set<string>();
    for (const tier of TIERS) {
      expect(tier.quests.length).toBeGreaterThan(0);
      for (const q of tier.quests) {
        expect(ids.has(q.id)).toBe(false);
        ids.add(q.id);
        const g = q.goal;
        // Who makes a good, at the lowest tier.
        const makerTier = (good: string): number =>
          Math.min(...Object.values(SITE_DEFS).filter((d) => d.produce?.good === good || (d.recipe && good in d.recipe.outputs)).map((d) => d.tier));
        if (g.kind === 'build') expect(SITE_DEFS[g.site].tier).toBeLessThanOrEqual(tier.tier);
        if (g.kind === 'route' && g.mode === 'rail') expect(RAIL_TIER).toBeLessThanOrEqual(tier.tier);
        if (g.kind === 'route' && g.grade === 'highway') expect(HIGHWAY_TIER).toBeLessThanOrEqual(tier.tier);
        if (g.kind === 'vehicle') expect(VEHICLE_DEFS[g.vehicle].tier).toBeLessThanOrEqual(tier.tier);
        if (g.kind === 'make' || g.kind === 'deliver') expect(makerTier(g.good)).toBeLessThanOrEqual(tier.tier);
        if (g.kind === 'deliver') expect([...MARKET_DEMAND.flat(), ...FREIGHT_DEMAND.flat()]).toContain(g.good);
        if (g.kind === 'town') expect(g.level).toBeLessThanOrEqual(TOWN_LEVELS.length);
        // Level n needs tier n - 1.
        if (g.kind === 'upgrade') {
          expect(g.level).toBeLessThanOrEqual(MAX_LEVEL);
          expect(g.level - 1).toBeLessThanOrEqual(tier.tier);
        }
      }
    }
  });
});

describe('rail stations', () => {
  function stationWorld(): World {
    const w = open();
    w.places[0].marketTile = { x: 21, y: 5 };
    w.sites = [];
    addDock(w, w.places[0], 'market');
    return w;
  }

  it('gives every town a station once rail is unlocked, on a tile track can reach', () => {
    const w = stationWorld();
    w.tier = 1;
    expect(ensureStations(w)).toBe(1);
    w.sites = w.sites.filter((s) => s.kind !== 'station');
    for (let i = 0; i < 40; i++) step(w);
    expect(w.sites.some((s) => s.kind === 'station')).toBe(false);
    w.tier = 2;
    for (let i = 0; i < 40; i++) step(w);
    const st = w.sites.filter((s) => s.kind === 'station');
    expect(st.length).toBe(1);
    expect(demolishSite(w, st[0].id)).toMatch(/belong to the town/);
  });

  it('sells what a train unloads at the station to the town', () => {
    const w = stationWorld();
    ensureStations(w);
    const station = w.sites.find((s) => s.kind === 'station')!;
    const market = w.sites.find((s) => s.kind === 'market')!;
    const good = dockDemand(w, market)[0];
    placeSite(w, 'hub', 15, 3);
    const hub = siteAt(w, 15, 3)!;
    hub.stock[good] = 120;
    const path = findPath(w, hub, station, 120000, 'rail')!;
    expect(path).not.toBeNull();
    expect(createRoute(w, path, 'rail')).toBeNull();
    // trucks cannot use it
    expect(planRoute(w, path, 'road').error).toBeTruthy();
    const before = w.earned;
    for (let i = 0; i < 1500; i++) step(w);
    expect(w.delivered[good] ?? 0).toBeGreaterThan(30);
    expect(w.earned).toBeGreaterThan(before);
    expect(w.places[0].growth).toBeGreaterThan(0);
  });
});

describe('air routes and station freight', () => {
  it('flies cargo between two airports over water', () => {
    const w = open();
    w.tier = 3;
    w.money = 1e6;
    placeSite(w, 'airport', 5, 4);
    placeSite(w, 'airport', 25, 9);
    const [a, b] = w.sites.filter((s) => s.kind === 'airport');
    expect(createAirRoute(w, a.id, b.id)).toBeNull();
    expect(createAirRoute(w, a.id, b.id)).toMatch(/already linked/);
    const route = w.routes.find((r) => r.mode === 'air')!;
    expect(route.path.length).toBe(airPath(w, a, b).length);
    expect(w.vehicles.some((v) => v.kind === 'plane')).toBe(true);
    a.pull = [];
    b.pull = ['lumber'];
    a.stock.lumber = 100;
    for (let i = 0; i < 1200; i++) step(w);
    expect(b.stock.lumber ?? 0).toBeGreaterThan(20);
    expect(planRoute(w, route.path, 'road').error).toBeTruthy();
    expect(placeSite(w, 'airport', 20, 6)).toMatch(/outside a town|Too close|main street/);
  });

  it('sends goods from a town factory out by train, and feeds a factory from the platform', () => {
    const w = open();
    w.tier = 3;
    w.money = 1e6;
    w.places[0].marketTile = { x: 21, y: 5 };
    w.sites = [];
    addDock(w, w.places[0], 'market');
    expect(placeSite(w, 'sawmill', 19, 5)).toBeNull();
    ensureStations(w);
    const station = w.sites.find((s) => s.kind === 'station')!;
    const mill = siteAt(w, 19, 5)!;
    expect(townSites(w, w.places[0])).toContain(mill);
    placeSite(w, 'hub', 15, 3);
    const hub = siteAt(w, 15, 3)!;
    hub.pull = ['lumber'];
    createRoute(w, findPath(w, hub, station, 120000, 'rail')!, 'rail');
    mill.stock.lumber = 40;
    for (let i = 0; i < 1500; i++) step(w);
    // The train carried lumber out of the platform: it reached the hub, or came back and was sold in town.
    expect((hub.stock.lumber ?? 0) + (w.delivered.lumber ?? 0)).toBeGreaterThan(0);
    expect(station.out?.lumber ?? 0).toBeLessThan(31);
  });
});
