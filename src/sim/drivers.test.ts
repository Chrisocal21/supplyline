// Named drivers, wear and service.
import { describe, expect, it } from 'vitest';
import { WEAR_SLOWDOWN, condition, driverName, renameDriver, serviceCost, serviceVehicle } from './drivers';
import type { Terrain } from './defs';
import { buyVehicle, createBlankWorld, vehicleTicks, type World } from './world';
import { VEHICLE_DEFS } from './defs';

function world(): World {
  const w = createBlankWorld(30, 14, new Array<Terrain>(30 * 14).fill('grass'));
  w.tier = 25;
  w.money = 1e6;
  w.sites.push({ id: w.nextId++, kind: 'forestry', name: 'Camp', x: 5, y: 5, stock: {}, timer: 0, level: 3, nodeId: null, placeId: null, pull: [], making: undefined, sendTo: [] });
  return w;
}

describe('drivers and wear', () => {
  it('give every vehicle a steady name, until the player renames the driver', () => {
    const w = world();
    buyVehicle(w, w.sites[0].id, 'boxtruck');
    buyVehicle(w, w.sites[0].id, 'boxtruck');
    const [a, b] = w.vehicles;
    expect(driverName(w, a)).toBe(driverName(w, a));
    expect(driverName(w, a)).toMatch(/^\w+ \w+$/);
    expect(driverName(w, a)).not.toBe(driverName(w, b));
    expect(renameDriver(w, a.id, '  Big   Dave ')).toBeNull();
    expect(driverName(w, a)).toBe('Big Dave');
    expect(renameDriver(w, a.id, '   ')).toMatch(/needs a name/);
  });

  it('slow a worn vehicle a little, and a service puts it right for a price that grows with the wear', () => {
    const w = world();
    buyVehicle(w, w.sites[0].id, 'boxtruck');
    const v = w.vehicles[0];
    expect(condition(v)).toBe(1);
    expect(serviceCost(v)).toBe(0);
    const fresh = vehicleTicks(v);
    v.wear = 0.5;
    const half = serviceCost(v);
    expect(half).toBeGreaterThan(0);
    v.wear = 1;
    expect(serviceCost(v)).toBeGreaterThan(half);
    expect(vehicleTicks(v)).toBeCloseTo(fresh * (1 + WEAR_SLOWDOWN));
    const before = w.money;
    expect(serviceVehicle(w, v.id)).toBeNull();
    expect(w.money).toBe(before - Math.max(10, Math.round((VEHICLE_DEFS.boxtruck.cost * 0.12) / 5) * 5));
    expect(v.wear).toBe(0);
    expect(serviceVehicle(w, v.id)).toMatch(/no service needed/);
  });
});
