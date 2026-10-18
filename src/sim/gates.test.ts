// Every town has up to four gates, on its own permanent streets, one at the outer end of each direction.
import { describe, expect, it } from 'vitest';
import map2 from '../maps/map2.json';
import { createWorldFromMap, createWorld, layoutOf, townGates, wrapX, type MapData } from './world';

describe('town gates', () => {
  it('stand on a planned street at the edge of every town, in up to four directions', () => {
    for (const w of [createWorld(5), createWorldFromMap(map2 as MapData)]) {
      for (const p of w.places) {
        const gates = townGates(w, p);
        expect(gates.length).toBeGreaterThan(0);
        expect(gates.length).toBeLessThanOrEqual(4);
        const streets = new Set(layoutOf(w, p).streets.map((s) => `${wrapX(w, p.x + s.x)},${p.y + s.y}`));
        for (const g of gates) expect(streets.has(`${g.x},${g.y}`)).toBe(true);
      }
    }
  }, 30000);
});
