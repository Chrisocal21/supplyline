// Every town can build its first district from level 1, cities and small towns alike.
import { describe, expect, it } from 'vitest';
import { buildDistrict, districtError } from './town';
import { createWorld, freeCivicLot } from './world';

describe('first district lots', () => {
  it('give every town a free lot for a level 1 district', () => {
    for (const seed of [1, 2, 3, 7, 11, 21, 42]) {
      const w = createWorld(seed);
      w.money = 1e9;
      for (const p of w.places) {
        expect(freeCivicLot(w, p, 'farmersmarket'), `${p.name} (seed ${seed}, radius ${p.radius}) has no free lot`).not.toBeNull();
        expect(districtError(w, p, 'farmersmarket'), `${p.name}`).toBeNull();
      }
    }
  });

  it('build a Farmers Market in a city and a small town', () => {
    const w = createWorld(3);
    w.money = 1e9;
    for (const p of w.places) {
      expect(buildDistrict(w, p, 'farmersmarket'), p.name).toBeNull();
      expect(w.sites.some((s) => s.districtId === 'farmersmarket' && s.placeId === p.id)).toBe(true);
    }
  });
});
