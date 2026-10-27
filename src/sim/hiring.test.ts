// Drivers are hired by the player, carry their experience between vehicles, and cost a wage.
import { describe, expect, it } from 'vitest';
import { DRIVER_TRIPS } from './defs';
import { applicants, assignDriver, dismissDriver, driverById, hireDriver, hireFee, idleDrivers, rankOf, tendDrivers, wagesPerMinute } from './drivers';
import { buyVehicle, createWorld, sellVehicle, siteById } from './world';

function setup() {
  const w = createWorld(11);
  w.money = 1e6;
  w.tier = 25;
  const mill = w.sites[0];
  mill.kind = 'hub';
  mill.level = 4;
  return { w, home: mill };
}

describe('hiring drivers', () => {
  it('shows three applicants, who can be hired once for a fee by rank', () => {
    const { w } = setup();
    const a = applicants(w);
    expect(a).toHaveLength(3);
    const before = w.money;
    const hired = hireDriver(w, a[0].key);
    expect('driver' in hired).toBe(true);
    expect(w.money).toBe(before - hireFee(a[0]));
    expect(applicants(w).map((x) => x.key)).not.toContain(a[0].key);
    expect(idleDrivers(w)).toHaveLength(1);
  });

  it('puts the chosen driver in a new vehicle, and a kind they are new to costs a rank', () => {
    const { w, home } = setup();
    const a = applicants(w)[0];
    const hired = hireDriver(w, a.key);
    if ('error' in hired) throw new Error(hired.error);
    const d = hired.driver;
    d.trips = DRIVER_TRIPS[3];
    d.kind = 'boxtruck';
    expect(buyVehicle(w, home.id, 'boxtruck', 'main', { use: d.id })).toBeNull();
    const v1 = w.vehicles[w.vehicles.length - 1];
    expect(v1.driverId).toBe(d.id);
    expect(rankOf(d.trips)).toBe(3);
    // A bigger truck: he moves over, and loses a rank for it being new to him.
    expect(buyVehicle(w, home.id, 'bigtruck', 'main')).toBeNull();
    const v2 = w.vehicles[w.vehicles.length - 1];
    tendDrivers(w);
    const rookie = driverById(w, v2.driverId)!;
    rookie.vehicleId = null;
    expect(assignDriver(w, v2.id, d.id)).toBeNull();
    expect(rankOf(d.trips)).toBe(2);
    expect(v2.trips).toBe(d.trips);
    // The truck he left has nobody until the player gives it someone.
    expect(v1.driverId).toBe(0);
    expect(assignDriver(w, v1.id, rookie.id)).toBeNull();
    expect(v1.driverId).toBe(rookie.id);
  });

  it('pays wages, sets drivers free when their vehicle is sold, and lets idle ones go', () => {
    const { w, home } = setup();
    expect(buyVehicle(w, home.id, 'boxtruck')).toBeNull();
    tendDrivers(w);
    expect(wagesPerMinute(w)).toBeGreaterThan(0);
    const v = w.vehicles[0];
    const d = driverById(w, v.driverId)!;
    expect(dismissDriver(w, d.id)).toMatch(/driving/);
    expect(sellVehicle(w, v.id)).toBeNull();
    tendDrivers(w);
    expect(d.vehicleId).toBeNull();
    expect(dismissDriver(w, d.id)).toBeNull();
    expect(wagesPerMinute(w)).toBe(0);
    void siteById;
  });
});
