// Districts as things the player places: where one would go when pointed at a tile, and building it on that lot.
import { describe, expect, it } from 'vitest';
import map1 from '../maps/map1.json';
import { buildDistrictAt, districtSpotAt } from './town';
import { createBlankWorld, createWorldFromMap, districtSite, layoutOf, prepareRealisticWorld, type MapData } from './world';

function flatWorld() {
  const source = createWorldFromMap(map1 as MapData);
  const w = createBlankWorld(192, 64, new Array(192 * 64).fill('grass'));
  w.places = [{ ...source.places[0], x: 96, y: 32, level: 5, radius: 5, districts: {} }];
  w.money = 1e8;
  w.tier = 3;
  prepareRealisticWorld(w);
  return w;
}

describe('placing districts', () => {
  it('finds the campus kept for a sports ground when pointed at it', () => {
    const w = flatWorld();
    const place = w.places[0];
    for (const id of ['stadium', 'ballpark', 'arena', 'soccer'] as const) {
      const lot = layoutOf(w, place).civic.findIndex((c) => c.campus?.district === id);
      const c = layoutOf(w, place).civic[lot];
      const spot = districtSpotAt(w, place.x + c.x, place.y + c.y, id)!;
      expect(spot.lot).toBe(lot);
      expect(spot.error).toBeNull();
      expect(spot.campus).toBe(true);
    }
  });

  it('does not offer a ground for the wrong sport, or somewhere far from any lot', () => {
    const w = flatWorld();
    const place = w.places[0];
    const lot = layoutOf(w, place).civic.findIndex((c) => c.campus?.district === 'stadium');
    const c = layoutOf(w, place).civic[lot];
    expect(districtSpotAt(w, place.x + c.x, place.y + c.y, 'arena')?.lot).not.toBe(lot);
    expect(districtSpotAt(w, 3, 3, 'stadium')).toBeNull();
  });

  it('builds on the lot picked, and refuses a lot that is not for it', () => {
    const w = flatWorld();
    const place = w.places[0];
    const lot = layoutOf(w, place).civic.findIndex((c) => c.campus?.district === 'soccer');
    expect(buildDistrictAt(w, place, 'soccer', lot)).toBeNull();
    expect(place.districtLots?.soccer).toBe(lot);
    expect(districtSite(w, place, 'soccer')).toBeTruthy();
    expect(buildDistrictAt(w, place, 'arena', lot)).toMatch(/not a lot/);
  });
});
