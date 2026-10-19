// Eight building levels, and a fleet limit per product line that grows with the level.
import { describe, expect, it } from 'vitest';
import { LEVEL_CAP, LEVEL_SPEED, MAX_LEVEL, fleetLimit, type SiteKind, type Terrain } from './defs';
import { buyVehicle, createBlankWorld, fleetOf, siteById, upgradeSite, type World } from './world';

function world(): World {
  const w = createBlankWorld(30, 14, new Array<Terrain>(30 * 14).fill('grass'));
  w.tier = 4;
  w.money = 1e9;
  return w;
}
const add = (w: World, kind: SiteKind) => {
  w.sites.push({ id: w.nextId++, kind, name: kind, x: 5, y: 5, stock: {}, timer: 0, level: 1, nodeId: null, placeId: null, pull: [], making: false, sendTo: [] });
  return w.sites[w.sites.length - 1];
};

describe('building levels', () => {
  it('run to eight, each worth more than the one before', () => {
    expect(MAX_LEVEL).toBe(8);
    for (let i = 1; i < MAX_LEVEL; i++) {
      expect(LEVEL_SPEED[i]).toBeGreaterThan(LEVEL_SPEED[i - 1]);
      expect(LEVEL_CAP[i]).toBeGreaterThan(LEVEL_CAP[i - 1]);
    }
    const w = world();
    const mill = add(w, 'sawmill');
    for (let i = 1; i < MAX_LEVEL; i++) expect(upgradeSite(w, mill.id)).toBeNull();
    expect(mill.level).toBe(8);
    expect(upgradeSite(w, mill.id)).toMatch(/max level/);
  });

  it('stop a port at level 3, as it grows with its town', () => {
    const w = world();
    const port = add(w, 'port');
    port.level = 3;
    expect(upgradeSite(w, port.id)).toMatch(/max level/);
  });

  it('limit the vehicles a line runs until the building is upgraded', () => {
    const w = world();
    const camp = add(w, 'forestry');
    for (let i = 0; i < fleetLimit(1); i++) expect(buyVehicle(w, camp.id, 'boxtruck')).toBeNull();
    expect(buyVehicle(w, camp.id, 'boxtruck')).toMatch(/Upgrade the building/);
    expect(upgradeSite(w, camp.id)).toBeNull();
    expect(buyVehicle(w, camp.id, 'boxtruck')).toBeNull();
    expect(fleetOf(w, siteById(w, camp.id)!.id).length).toBe(fleetLimit(1) + 1);
  });
});

describe('vehicle classes and yards', () => {
  it('never ask for a building level the vehicle\'s own tier cannot reach', async () => {
    const { VEHICLE_DEFS } = await import('./defs');
    for (const [kind, d] of Object.entries(VEHICLE_DEFS)) {
      // Level n needs tier n - 1 (up to tier 4), so a vehicle unlocked at tier t can be had once the yard is level t + 1.
      expect(Math.min(d.needLevel - 1, 4), `${kind} needs a yard its tier cannot build`).toBeLessThanOrEqual(d.tier);
    }
  });
});
