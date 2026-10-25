// Drivers take a quicker way once the roads offer one, and the more experienced they are the smaller a saving they notice.
import { describe, expect, it } from 'vitest';
import { DRIVER_TRIPS, type Terrain } from './defs';
import { optimizeRoutes } from './shortcuts';
import { createBlankWorld, type Route, type Vehicle, type World } from './world';

const row = (x0: number, x1: number, y: number) => Array.from({ length: x1 - x0 + 1 }, (_, i) => ({ x: x0 + i, y }));
const col = (x: number, y0: number, y1: number) => Array.from({ length: Math.abs(y1 - y0) + 1 }, (_, i) => ({ x, y: y0 + (y1 >= y0 ? i : -i) }));

function world(): World {
  const w = createBlankWorld(40, 20, new Array<Terrain>(40 * 20).fill('grass'));
  w.sites.push({ id: 1, kind: 'hub', name: 'A', x: 3, y: 5, stock: {}, timer: 0, level: 1, nodeId: null, placeId: null, pull: [], making: false, sendTo: [] });
  w.sites.push({ id: 2, kind: 'hub', name: 'B', x: 19, y: 5, stock: {}, timer: 0, level: 1, nodeId: null, placeId: null, pull: [], making: false, sendTo: [] });
  return w;
}

/** A lane A to B that goes the long way round, and a driver of the given experience on it. */
function lane(w: World, trips: number, detour = 7): { route: Route; v: Vehicle } {
  const path = [...col(3, 5, 5 + detour), ...row(4, 18, 5 + detour), ...col(19, 5 + detour - 1, 5)];
  const route: Route = { id: 10, mode: 'road', grade: 'street', fromSiteId: 1, toSiteId: 2, path };
  w.routes.push(route);
  const v: Vehicle = { id: 20, homeId: 1, routeId: 10, destId: 0, kind: 'boxtruck', idx: 0, dir: 1, state: 'loading', moveTimer: 0, cargo: 0, good: null, trips };
  w.vehicles.push(v);
  return { route, v };
}

const directRoad = (w: World): void => {
  w.routes.push({ id: 11, mode: 'road', grade: 'street', fromSiteId: 0, toSiteId: 0, free: true, seg: true, path: row(3, 19, 5) });
};

describe('drivers and shortcuts', () => {
  it('take a new road that is much quicker, even a rookie', () => {
    const w = world();
    const { route, v } = lane(w, 0);
    const before = route.path.length;
    expect(optimizeRoutes(w)).toBe(0);
    directRoad(w);
    expect(optimizeRoutes(w)).toBe(1);
    expect(route.path.length).toBeLessThan(before);
    expect(route.path).toHaveLength(17);
    expect(v.idx).toBe(0);
  });

  it('keep a truck that is already on the road going from the same tile', () => {
    const w = world();
    const { route, v } = lane(w, DRIVER_TRIPS[4]);
    // Mid-way along the shared first leg: the tile (3,6) is not on the direct road, so it waits for a better moment.
    v.idx = 2;
    v.state = 'moving';
    directRoad(w);
    expect(optimizeRoutes(w)).toBe(0);
    v.idx = 0;
    v.state = 'loading';
    expect(optimizeRoutes(w)).toBe(1);
    expect(route.path[0]).toEqual({ x: 3, y: 5 });
    expect(route.path[route.path.length - 1]).toEqual({ x: 19, y: 5 });
  });

  it('look again soon when a truck is in the way, and take the quicker road as soon as it has cleared', () => {
    const w = world();
    const { route, v } = lane(w, 0);
    v.idx = 5;
    v.state = 'moving';
    directRoad(w);
    expect(optimizeRoutes(w)).toBe(0);
    expect(w.shortcutsDirty).toBe(true);
    // The truck drives on to the end of the old line, where it can join the new way.
    v.idx = route.path.length - 1;
    expect(optimizeRoutes(w)).toBe(1);
    expect(w.shortcutsDirty).toBe(false);
    expect(route.path).toHaveLength(17);
  });

  it('leave a small saving to the experienced', () => {
    // A detour of one tile either side costs about 2 of 18: roughly 11 percent.
    const rookie = world();
    const a = lane(rookie, 0, 1);
    directRoad(rookie);
    expect(optimizeRoutes(rookie)).toBe(0);
    expect(a.route.path.length).toBeGreaterThan(17);
    const ace = world();
    const b = lane(ace, DRIVER_TRIPS[4], 1);
    directRoad(ace);
    expect(optimizeRoutes(ace)).toBe(1);
    expect(b.route.path).toHaveLength(17);
  });
});
