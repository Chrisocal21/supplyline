// A second truck for a second buyer: the first keeps its own run.
import { describe, expect, it } from 'vitest';
import { GOOD_LIST, VEHICLE_DEFS, type SiteKind, type Terrain } from './defs';
import { buyVehicle, createBlankWorld, duplicateVehicleTo, fleetOf, type World } from './world';

const add = (w: World, kind: SiteKind, x: number, y: number) => {
  w.sites.push({ id: w.nextId++, kind, name: `${kind}${x}`, x, y, stock: {}, timer: 0, level: 1, nodeId: null, placeId: null, pull: [...GOOD_LIST], making: false, sendTo: [] });
  return w.sites[w.sites.length - 1];
};
const line = (w: World, a: number, b: number, from: { x: number; y: number }, to: { x: number; y: number }) => {
  const path = [];
  for (let x = from.x; x !== to.x; x += Math.sign(to.x - from.x)) path.push({ x, y: from.y });
  for (let y = from.y; y !== to.y + Math.sign(to.y - from.y); y += Math.sign(to.y - from.y) || 1) path.push({ x: to.x, y });
  w.routes.push({ id: w.nextId++, mode: 'road', grade: 'street', fromSiteId: a, toSiteId: b, over: true, path } as never);
};

describe('a second truck for another buyer', () => {
  it('is bought pinned to that buyer and leaves the first truck on its own run', () => {
    const w = createBlankWorld(30, 20, new Array<Terrain>(30 * 20).fill('grass'));
    w.tier = 3;
    w.money = 1e6;
    const ranch = add(w, 'ranch', 3, 5);
    const market = add(w, 'hub', 12, 5);
    const dairy = add(w, 'hub', 3, 14);
    line(w, ranch.id, market.id, { x: 3, y: 5 }, { x: 12, y: 5 });
    line(w, ranch.id, dairy.id, { x: 3, y: 5 }, { x: 3, y: 14 });
    ranch.sendTo = [market.id, dairy.id];
    expect(buyVehicle(w, ranch.id, 'boxtruck')).toBeNull();
    const first = fleetOf(w, ranch.id)[0];
    first.destId = market.id;
    const before = w.money;
    expect(duplicateVehicleTo(w, first.id, dairy.id)).toBeNull();
    const fleet = fleetOf(w, ranch.id);
    expect(fleet).toHaveLength(2);
    expect(fleet[0].destId).toBe(market.id);
    expect(fleet[1].destId).toBe(dairy.id);
    expect(before - w.money).toBe(VEHICLE_DEFS.boxtruck.cost);
  });

  it('refuses a buyer the building is not joined to', () => {
    const w = createBlankWorld(30, 20, new Array<Terrain>(30 * 20).fill('grass'));
    w.tier = 3;
    w.money = 1e6;
    const ranch = add(w, 'ranch', 3, 5);
    const lone = add(w, 'hub', 20, 15);
    ranch.sendTo = [lone.id];
    expect(buyVehicle(w, ranch.id, 'boxtruck')).toBeNull();
    expect(duplicateVehicleTo(w, fleetOf(w, ranch.id)[0].id, lone.id)).toMatch(/not joined/);
    expect(fleetOf(w, ranch.id)).toHaveLength(1);
  });
});
