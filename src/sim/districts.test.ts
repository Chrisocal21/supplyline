import { describe, expect, it } from 'vitest';
import map1 from '../maps/map1.json';
import { buildDistrict, districtRevenue, districtSatisfaction } from './town';
import { districtGoods } from './venues';
import { buyVehicle, needs, offers, civicAt, civicTiles, createWorldFromMap, districtSite, entryTile, placeError, placeSite, plotTiles, siteAt, step, streetAt, type MapData, type World } from './world';

const town = (): { w: World; p: World['places'][number] } => {
  const w = createWorldFromMap(map1 as MapData);
  w.tier = 3;
  w.money = 1e6;
  const p = w.places[0];
  p.level = 3;
  return { w, p };
};

describe('districts as buildings', () => {
  it('stand on a lot beside a street, with a door on it, and cannot be built over', () => {
    const { w, p } = town();
    expect(buildDistrict(w, p, 'community')).toBeNull();
    const site = districtSite(w, p, 'community')!;
    expect(site.kind).toBe('district');
    expect(civicAt(w, site.x, site.y)?.place).toBe(p);
    const door = entryTile(w, site.x, site.y)!;
    expect(streetAt(w, door.x, door.y)).toBe(p);
    expect(Math.abs(door.x - site.x) + Math.abs(door.y - site.y)).toBe(1);
    expect(placeError(w, 'bakery', site.x, site.y)).toMatch(/Reserved|occupied/);
    // Each district gets its own lot.
    expect(buildDistrict(w, p, 'restaurants')).toBeNull();
    const other = districtSite(w, p, 'restaurants')!;
    expect(other.x === site.x && other.y === site.y).toBe(false);
    // Taking a district up a level keeps the building and its lot.
    expect(buildDistrict(w, p, 'community')).toBeNull();
    expect(districtSite(w, p, 'community')).toBe(site);
    expect(site.level).toBe(2);
  });

  it('is told when the town has no lot left', () => {
    const { w, p } = town();
    p.level = 5;
    const ids = ['farmersmarket', 'restaurants', 'heating', 'hardware', 'warehouse', 'builders', 'furniture', 'fashion', 'bookshops', 'terminal', 'community', 'amphitheatre', 'stadium', 'university', 'hotels'] as const;
    const errors = ids.map((id) => buildDistrict(w, p, id)).filter((e) => e);
    const lots = civicTiles(w, p).length;
    expect(w.sites.filter((s) => s.kind === 'district').length).toBe(Math.min(ids.length, lots));
    for (const e of errors) expect(e).toMatch(/no free lot|Need/);
  });

  it('is fed by a truck that drops goods at its door, and earns while it is stocked', () => {
    const { w, p } = town();
    expect(buildDistrict(w, p, 'cafe')).toBeNull();
    const lot = plotTiles(w, p).find((t) => !siteAt(w, t.x, t.y) && placeSite(w, 'bakery', t.x, t.y) === null)!;
    const bakery = siteAt(w, lot.x, lot.y)!;
    bakery.stock.bread = 80;
    const d = districtSite(w, p, 'cafe')!;
    expect(districtRevenue(w, p)).toBe(0);
    expect(buyVehicle(w, bakery.id, 'boxtruck')).toBeNull();
    // Pinned to the district, so the market in town does not take the bread first.
    w.vehicles[0].destId = d.id;
    for (let i = 0; i < 4000 && (d.stock.bread ?? 0) < 1; i++) step(w);
    expect(d.stock.bread ?? 0).toBeGreaterThan(0);
    expect(districtSatisfaction(w, p, 'cafe')).toBeGreaterThan(0);
    expect(districtRevenue(w, p)).toBeGreaterThan(0);
  });

  it('uses its goods up, so it needs steady deliveries', () => {
    const { w, p } = town();
    buildDistrict(w, p, 'cafe');
    const d = districtSite(w, p, 'cafe')!;
    d.stock.bread = 5;
    for (let i = 0; i < 2000; i++) step(w);
    expect(d.stock.bread ?? 0).toBeLessThan(5);
  });

  it('takes from a Distribution Warehouse every good its venues buy', () => {
    const { w, p } = town();
    p.level = 5;
    const ids = ['restaurants', 'cafe', 'farmersmarket', 'hardware', 'furniture', 'fashion', 'builders', 'bookshops', 'community', 'amphitheatre', 'heating', 'hotels', 'university'] as const;
    const hubTile = plotTiles(w, p).find((t) => !siteAt(w, t.x, t.y) && placeSite(w, 'hub', t.x, t.y) === null)!;
    const hub = siteAt(w, hubTile.x, hubTile.y)!;
    let checked = 0;
    for (const id of ids) {
      if (buildDistrict(w, p, id) !== null) continue;
      checked++;
      const dock = districtSite(w, p, id)!;
      for (const g of districtGoods(p, id)) {
        hub.stock[g] = 20;
        expect(offers(hub, g), id + ' ' + g + ' offered by the warehouse').toBeGreaterThan(0);
        expect(needs(w, dock, g, hub), id + ' ' + g + ' taken from the warehouse').toBeGreaterThan(0);
        hub.stock[g] = 0;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(4);
  });

  it('is fed by a truck that leaves a Distribution Warehouse', () => {
    const { w, p } = town();
    expect(buildDistrict(w, p, 'cafe')).toBeNull();
    const dock = districtSite(w, p, 'cafe')!;
    const hubTile = plotTiles(w, p).find((t) => !siteAt(w, t.x, t.y) && placeSite(w, 'hub', t.x, t.y) === null)!;
    const hub = siteAt(w, hubTile.x, hubTile.y)!;
    const menu = districtGoods(p, 'cafe');
    for (const g of menu) hub.stock[g] = 60;
    expect(buyVehicle(w, hub.id, 'boxtruck')).toBeNull();
    w.vehicles[0].destId = dock.id;
    for (let i = 0; i < 4000 && menu.every((g) => (dock.stock[g] ?? 0) < 1); i++) step(w);
    expect(menu.some((g) => (dock.stock[g] ?? 0) >= 1)).toBe(true);
    expect(districtSatisfaction(w, p, 'cafe')).toBeGreaterThan(0);
    expect(districtRevenue(w, p)).toBeGreaterThan(0);
  });
});
