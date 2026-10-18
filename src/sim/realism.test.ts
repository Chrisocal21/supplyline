import { describe, expect, it } from 'vitest';
import map1 from '../maps/map1.json';
import { buildDistrict } from './town';
import { civicFootprint } from './townlayout';
import { packSave, unpackSave } from './saveio';
import { createBlankWorld, createWorldFromMap, districtSite, entryTile, layoutOf, prepareRealisticWorld, siteAt, streetAt, type MapData } from './world';

function flatWorld() {
  const source = createWorldFromMap(map1 as MapData);
  const w = createBlankWorld(192, 64, new Array(192 * 64).fill('grass'));
  w.places = [{ ...source.places[0], x: 96, y: 32, level: 5, radius: 5, districts: {} }];
  w.money = 1e8;
  w.tier = 3;
  prepareRealisticWorld(w);
  return w;
}

describe('measured sports reservations', () => {
  it('provides all three facilities on suitable land without overlapping other lots', () => {
    const w = flatWorld();
    const layout = layoutOf(w, w.places[0]);
    const campuses = layout.civic.filter(c => c.campus);
    expect(campuses.map(c => c.campus!.district)).toEqual(['stadium', 'ballpark', 'arena']);
    const occupied = new Set([...layout.homes, ...layout.plots, ...layout.streets, ...layout.civic.filter(c => !c.campus)].map(t => `${t.x},${t.y}`));
    for (const campus of campuses) for (const tile of civicFootprint(campus)) {
      const key = `${tile.x},${tile.y}`;
      expect(occupied.has(key), key).toBe(false);
      occupied.add(key);
    }
  });

  it.each(['stadium', 'ballpark', 'arena'] as const)('%s delivers at its gate and can be selected from the playing grounds', kind => {
    const w = flatWorld();
    const place = w.places[0];
    expect(buildDistrict(w, place, kind)).toBeNull();
    const site = districtSite(w, place, kind)!;
    const campus = layoutOf(w, place).civic.find(c => c.campus?.district === kind)!;
    expect(siteAt(w, place.x + campus.x, place.y + campus.y)).toBe(site);
    const entry = entryTile(w, site.x, site.y)!;
    expect(streetAt(w, entry.x, entry.y)).toBe(place);
    expect(Math.abs(site.x - entry.x) + Math.abs(site.y - entry.y)).toBe(1);
  });

  it('preserves legacy layouts and round-trips the opt-in layout with unchanged resources', () => {
    const w = createWorldFromMap(map1 as MapData);
    expect(w.places.flatMap(p => layoutOf(w, p).civic).some(c => c.campus)).toBe(false);
    const resources = w.nodes.map(n => ({ id: n.id, kind: n.kind, quality: n.quality }));
    prepareRealisticWorld(w);
    expect(w.nodes.map(n => ({ id: n.id, kind: n.kind, quality: n.quality }))).toEqual(resources);
    expect(w.places.flatMap(p => layoutOf(w, p).civic).filter(c => c.campus).length).toBeGreaterThan(0);
    const back = unpackSave(packSave(w));
    expect('world' in back).toBe(true);
    if ('world' in back) {
      expect(back.world.realisticLots).toBe(true);
      expect(back.world.places.map(p => layoutOf(back.world, p))).toEqual(w.places.map(p => layoutOf(w, p)));
    }
    expect('error' in unpackSave(JSON.stringify({ ...w, realisticLots: 'yes' }))).toBe(true);
  });
});
