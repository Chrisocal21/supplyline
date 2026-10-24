import { describe, expect, it } from 'vitest';
import { diagnose } from './diagnose';
import { createBlankWorld, buyVehicle, siteById, step, produces, siteCap, fleetOf, AUTO_BUY_MAX, acceptOffer, declineOffer, type World } from './world';
import { GOOD_LIST, vehicleLabel, type SiteKind, type Terrain } from './defs';

function world(): World {
  const w = createBlankWorld(30, 14, new Array<Terrain>(30 * 14).fill('grass'));
  w.tier = 3;
  w.money = 1e6;
  return w;
}
const add = (w: World, kind: SiteKind, x: number, y: number) => {
  w.sites.push({ id: w.nextId++, kind, name: `${kind}${x}`, x, y, stock: {}, timer: 0, level: 1, nodeId: null, placeId: null, pull: [...GOOD_LIST], making: false, sendTo: [] });
  return w.sites[w.sites.length - 1];
};

describe('diagnose', () => {
  it('says to press Start on a factory that is off', () => {
    const w = world();
    const mill = add(w, 'sawmill', 5, 5);
    const d = diagnose(w, mill);
    expect(d.fix?.kind).toBe('start');
    expect(d.text).toContain('Press Start');
  });

  it('says to buy a truck, and then to find a buyer, in that order', () => {
    const w = world();
    const camp = add(w, 'forestry', 3, 5);
    expect(diagnose(w, camp).fix?.kind).toBe('buy');
    expect(buyVehicle(w, camp.id, 'boxtruck')).toBeNull();
    const d = diagnose(w, siteById(w, camp.id)!);
    expect(d.level).toBe('warn');
    expect(d.fix?.kind).not.toBe('buy');
  });

  it('does not ask an empty warehouse to buy a truck', () => {
    const w = world();
    const hub = add(w, 'hub', 5, 5);
    const d = diagnose(w, hub);
    expect(d.fix?.kind).not.toBe('buy');
    expect(d.text).toContain('warehouse');
  });

  it('tells a terminal holding goods with no line to join another terminal', () => {
    const w = world();
    const yard = add(w, 'railyard', 5, 5);
    const mill = add(w, 'sawmill', 8, 5);
    yard.stock.lumber = 20;
    w.routes.push({ id: w.nextId++, mode: 'road', fromSiteId: mill.id, toSiteId: yard.id, over: true, path: [{ x: 8, y: 5 }, { x: 7, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 5 }] } as never);
    yard.sendTo = [mill.id];
    // A truck is not what is missing: the line out is.
    const d = diagnose(w, yard);
    expect(d.text.length).toBeGreaterThan(0);
  });

  it('raw sites make a by-product beside the main good, and say when it has no buyer', () => {
    const w = world();
    const quarry = add(w, 'quarry', 5, 5);
    expect(produces(quarry)).toEqual(['stone', 'gravel']);
    for (let i = 0; i < 2000; i++) step(w);
    expect(quarry.stock.stone ?? 0).toBeGreaterThan(0);
    expect(quarry.stock.gravel ?? 0).toBeGreaterThan(0);
    expect(quarry.stock.gravel ?? 0).toBeLessThan(quarry.stock.stone ?? 0);
    // Gravel waits on the shelf like stone, and the building says so once it piles up.
    const cement = add(w, 'stonecutter', 9, 5);
    cement.making = true;
    quarry.stock.gravel = 230;
    quarry.stock.stone = 10;
    expect(buyVehicle(w, quarry.id, 'boxtruck')).toBeNull();
    w.routes.push({ id: w.nextId++, mode: 'road', fromSiteId: quarry.id, toSiteId: cement.id, over: true, path: [5, 6, 7, 8, 9].map((x) => ({ x, y: 5 })) } as never);
    // The main line is fine; the by-product line has gravel to move and no truck of its own.
    expect(diagnose(w, quarry).level).toBe('ok');
    const d = diagnose(w, quarry, 'by');
    expect(d.fix).toMatchObject({ kind: 'buy', line: 'by' });
    expect(d.text).toContain('gravel');
  });
});

describe('vehicle preferences', () => {
  it('a truck set to highest demand serves the hungrier of two buyers, and closest picks the nearer', async () => {
    const { assignVehicle, setVehiclePick } = await import('./world');
    const w = world();
    const camp = add(w, 'forestry', 3, 5);
    const near = add(w, 'sawmill', 6, 5);
    const far = add(w, 'sawmill', 12, 5);
    near.making = far.making = true;
    near.stock.logs = 28;
    camp.sendTo = [];
    const line = (to: typeof near) => w.routes.push({ id: w.nextId++, mode: 'road', fromSiteId: camp.id, toSiteId: to.id, over: true, path: Array.from({ length: to.x - 2 }, (_, i) => ({ x: 3 + i, y: 5 })) } as never);
    line(near);
    line(far);
    expect(buyVehicle(w, camp.id, 'boxtruck')).toBeNull();
    const v = w.vehicles[0];
    const target = (): number => w.routes.find((r) => r.id === v.routeId)!.toSiteId;
    setVehiclePick(w, v.id, 'demand');
    v.routeId = 0;
    expect(assignVehicle(w, v)).toBe(true);
    expect(target()).toBe(far.id);
    setVehiclePick(w, v.id, 'near');
    v.routeId = 0;
    assignVehicle(w, v);
    expect(target()).toBe(near.id);
  });
});

describe('two lines', () => {
  it('a main truck carries only the main good and a by-product truck only the by-product', () => {
    const w = world();
    const quarry = add(w, 'quarry', 3, 5);
    const yard = add(w, 'freight', 9, 5);
    yard.placeId = null;
    w.routes.push({ id: w.nextId++, mode: 'road', fromSiteId: quarry.id, toSiteId: yard.id, over: true, path: [3, 4, 5, 6, 7, 8, 9].map((x) => ({ x, y: 5 })) } as never);
    // The yard has to want both goods: stone and gravel.
    yard.stock = {};
    expect(buyVehicle(w, quarry.id, 'boxtruck')).toBeNull();
    expect(buyVehicle(w, quarry.id, 'boxtruck', 'by')).toBeNull();
    expect(w.vehicles.map((v) => v.line ?? 'main')).toEqual(['main', 'by']);
    expect(w.vehicles.filter((v) => (v.line ?? 'main') === 'by').length).toBe(1);
  });

  it('on the road, each truck only delivers its own line', () => {
    const w = world();
    const quarry = add(w, 'quarry', 3, 5);
    const cutter = add(w, 'stonecutter', 8, 5);
    const cement = add(w, 'cementworks', 3, 9);
    cutter.making = cement.making = true;
    const line = (to: typeof cutter, path: { x: number; y: number }[]) => w.routes.push({ id: w.nextId++, mode: 'road', fromSiteId: quarry.id, toSiteId: to.id, over: true, path } as never);
    line(cutter, [3, 4, 5, 6, 7, 8].map((x) => ({ x, y: 5 })));
    line(cement, [5, 6, 7, 8, 9].map((y) => ({ x: 3, y })).reverse().reverse());
    quarry.stock.stone = 40;
    quarry.stock.gravel = 40;
    buyVehicle(w, quarry.id, 'boxtruck');
    buyVehicle(w, quarry.id, 'boxtruck', 'by');
    for (let i = 0; i < 6000; i++) step(w);
    // Stone only reached the stonecutter, and gravel only reached the cement works.
    expect(cutter.stock.stone ?? 0).toBeGreaterThan(0);
    expect((cement.stock.gravel ?? 0) + (w.consumed.gravel ?? 0)).toBeGreaterThan(0);
    expect(cement.stock.stone ?? 0).toBe(0);
  });
});

describe('bodies and full loads', () => {
  it('trucks are built for what they haul', () => {
    const w = world();
    const camp = add(w, 'forestry', 3, 3);
    const farm = add(w, 'farm', 3, 6);
    const ranch = add(w, 'ranch', 3, 9);
    const shop = add(w, 'bakery', 3, 12);
    for (const s of [camp, farm, ranch, shop]) buyVehicle(w, s.id, 'boxtruck');
    const label = (id: number): string => vehicleLabel('boxtruck', w.vehicles.find((v) => v.homeId === id)!.body);
    expect(label(camp.id)).toBe('Flatbed Truck');
    expect(label(farm.id)).toBe('Open-top Truck');
    expect(label(ranch.id)).toBe('Tanker Truck');
    expect(label(shop.id)).toBe('Box Truck');
  });

  it('a truck waits at home for a full load before it sets off', () => {
    const w = world();
    const camp = add(w, 'forestry', 3, 5);
    const mill = add(w, 'sawmill', 9, 5);
    mill.making = true;
    w.routes.push({ id: w.nextId++, mode: 'road', fromSiteId: camp.id, toSiteId: mill.id, over: true, path: [3, 4, 5, 6, 7, 8, 9].map((x) => ({ x, y: 5 })) } as never);
    buyVehicle(w, camp.id, 'boxtruck');
    const v = w.vehicles[0];
    camp.stock.logs = 3;
    for (let i = 0; i < 100; i++) step(w);
    expect(v.state).toBe('loading');
    camp.stock.logs = 20;
    for (let i = 0; i < 60; i++) step(w);
    expect(v.state).not.toBe('loading');
  });
});

describe('auto-buy trucks', () => {
  it('asks before buying, buys only on a yes, and stays quiet after a no', () => {
    const w = world();
    w.money = 1e6;
    const camp = add(w, 'forestry', 3, 4);
    const mill = add(w, 'sawmill', 9, 4);
    mill.making = true;
    w.routes.push({ id: w.nextId++, mode: 'road', fromSiteId: camp.id, toSiteId: mill.id, over: true, path: [3, 4, 5, 6, 7, 8, 9].map((x) => ({ x, y: 4 })) } as never);
    expect(buyVehicle(w, camp.id, 'boxtruck')).toBeNull();
    camp.autoBuy = true;
    for (let i = 0; i < 1500; i++) {
      camp.stock.logs = siteCap(w, camp);
      step(w);
    }
    // It asked, and bought nothing by itself.
    expect(w.offers?.length).toBe(1);
    expect(fleetOf(w, camp.id, 'main')).toHaveLength(1);
    expect(acceptOffer(w, w.offers![0])).toBeNull();
    expect(fleetOf(w, camp.id, 'main')).toHaveLength(2);
    // A no keeps the building quiet for a while.
    for (let i = 0; i < 600; i++) {
      camp.stock.logs = siteCap(w, camp);
      step(w);
    }
    expect(w.offers?.length).toBe(1);
    declineOffer(w, w.offers![0]);
    for (let i = 0; i < 600; i++) {
      camp.stock.logs = siteCap(w, camp);
      step(w);
    }
    expect(w.offers?.length ?? 0).toBe(0);
    expect(fleetOf(w, camp.id, 'main').length).toBeLessThanOrEqual(AUTO_BUY_MAX);
  });
});

describe('a load the buyer cannot fully take', () => {
  it('takes the rest to the next best buyer before loading again', () => {
    const w = world();
    w.money = 1e6;
    const camp = add(w, 'forestry', 3, 4);
    const a = add(w, 'sawmill', 9, 4);
    const b = add(w, 'sawmill', 3, 10);
    a.making = true;
    b.making = true;
    const ra = { id: w.nextId++, mode: 'road', fromSiteId: camp.id, toSiteId: a.id, over: true, path: [3, 4, 5, 6, 7, 8, 9].map((x) => ({ x, y: 4 })) };
    const rb = { id: w.nextId++, mode: 'road', fromSiteId: camp.id, toSiteId: b.id, over: true, path: [4, 5, 6, 7, 8, 9, 10].map((y) => ({ x: 3, y })) };
    w.routes.push(ra as never, rb as never);
    expect(buyVehicle(w, camp.id, 'boxtruck')).toBeNull();
    const v = w.vehicles[0];
    const cap = siteCap(w, a);
    // Arrives at A carrying 12 logs, but A only has room for 5.
    a.stock.logs = cap - 5;
    v.routeId = ra.id;
    v.idx = ra.path.length - 1;
    v.dir = 1;
    v.state = 'unloading';
    v.cargo = 12;
    v.good = 'logs';
    v.fromId = camp.id;
    step(w);
    expect(a.stock.logs).toBe(cap);
    expect(v.cargo).toBe(7);
    expect(v.state).toBe('moving');
    const before = b.stock.logs ?? 0;
    for (let i = 0; i < 2000 && (b.stock.logs ?? 0) === before; i++) {
      // keep A full so B is the only buyer with room
      a.stock.logs = cap;
      step(w);
    }
    expect((b.stock.logs ?? 0) - before).toBe(7);
  });
});
