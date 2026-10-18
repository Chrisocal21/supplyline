// A pass is cut through a range where the natural route between two towns crosses it; roads and rails run through it
// on the level, and the corridors between towns are kept clear.
import { describe, expect, it } from 'vitest';
import { corridorTiles } from './corridors';
import { MOUNTAIN_ELEV } from './defs';
import { createWorld } from './world';

describe('corridors and passes', () => {
  it('reach every town, and cross no mountain on a generated world (the range is cut through)', () => {
    let crossed = 0;
    for (const seed of [2, 5, 9]) {
      const w = createWorld(seed, 288, 96);
      const route = corridorTiles(w);
      expect(route.size).toBeGreaterThan(w.places.length);
      for (const p of w.places) expect(route.has(p.y * w.width + p.x), `${p.name} is on a corridor`).toBe(true);
      for (const k of route) {
        expect(w.terrain[k], `corridor tile ${k} is still mountain`).not.toBe('mountain');
      }
      // At least one pass lies on a route: ground between the mountain line and the cut that was a ridge.
      crossed += [...route].filter((k) => w.elev[k] > MOUNTAIN_ELEV - 20).length;
    }
    expect(crossed).toBeGreaterThan(0);
  });
});
