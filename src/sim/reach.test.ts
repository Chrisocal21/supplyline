// Road vehicles have a reach, pay for fuel, and wear more on long hauls.
import { describe, expect, it } from 'vitest';
import { DRIVER_REACH, FUEL_PER_TILE, VEHICLE_REACH } from './defs';
import { createWorld, laneOk, routeSpan, vehicleReach, type Route, type Vehicle } from './world';

const veh = (kind: Vehicle['kind'], trips = 0): Vehicle => ({ id: 1, homeId: 1, routeId: 0, destId: 0, kind, idx: 0, dir: 1, state: 'loading', moveTimer: 0, cargo: 0, good: null, trips });
const path = (n: number) => Array.from({ length: n }, (_, i) => ({ x: i, y: 0 }));

describe('reach', () => {
  it('is the class reach stretched by the driver rank', () => {
    expect(vehicleReach(veh('boxtruck'))).toBe(VEHICLE_REACH.boxtruck! * DRIVER_REACH[0]);
    expect(vehicleReach(veh('boxtruck', 100))).toBe(VEHICLE_REACH.boxtruck! * DRIVER_REACH[4]);
    expect(vehicleReach(veh('rig'))).toBeGreaterThan(vehicleReach(veh('bigtruck')));
    expect(vehicleReach(veh('train'))).toBe(Infinity);
  });

  it('counts a highway tile as half', () => {
    const street = { path: path(40) } as Pick<Route, 'path' | 'grade'>;
    const hwy = { path: path(40), grade: 'highway' } as Pick<Route, 'path' | 'grade'>;
    expect(routeSpan(street)).toBe(40);
    expect(routeSpan(hwy)).toBe(20);
  });

  it('keeps a small truck off a route that is too long for it, but not a big one', () => {
    const w = createWorld(11);
    const route: Route = { id: 99, mode: 'road', fromSiteId: 1, toSiteId: 2, path: path(70) };
    const a = w.sites[0];
    const b = w.sites[1];
    route.fromSiteId = a.id;
    route.toSiteId = b.id;
    const box = veh('boxtruck');
    box.homeId = a.id;
    const rig = veh('rig', 100);
    rig.homeId = a.id;
    expect(laneOk(w, box, route)).toBe(false);
    // The rig's reach covers it; whether the buyer wants anything is another matter, so only check the reach did not refuse it.
    expect(vehicleReach(rig)).toBeGreaterThan(routeSpan(route));
  });

  it('charges fuel for every tile', () => {
    expect(FUEL_PER_TILE.boxtruck!).toBeGreaterThan(0);
    expect(FUEL_PER_TILE.convoy!).toBeGreaterThan(FUEL_PER_TILE.boxtruck!);
  });
});
