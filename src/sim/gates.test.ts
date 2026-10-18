// Every town has gates: the two ends of its main street. They stand on the town's own planned streets, and no district
// lot is ever built across the way out of them, so a town can always send its goods onward by road.
import { describe, expect, it } from 'vitest';
import map2 from '../maps/map2.json';
import { createWorldFromMap, createWorld, layoutOf, prepareRealisticWorld, townGates, wrapX, type MapData } from './world';
import { civicFootprint } from './townlayout';

describe('town gates', () => {
  it('stand on a planned street at each end of the main street', () => {
    for (const w of [createWorld(5), createWorldFromMap(map2 as MapData)]) {
      for (const p of w.places) {
        const gates = townGates(w, p);
        expect(gates.length).toBeGreaterThan(0);
        expect(gates.length).toBeLessThanOrEqual(2);
        const streets = new Set(layoutOf(w, p).streets.map((s) => `${wrapX(w, p.x + s.x)},${p.y + s.y}`));
        for (const g of gates) expect(streets.has(`${g.x},${g.y}`)).toBe(true);
      }
    }
  }, 30000);

  it('are never walled in by a stadium, ballpark or arena lot', () => {
    const w = createWorldFromMap(map2 as MapData);
    prepareRealisticWorld(w);
    let campuses = 0;
    for (const p of w.places) {
      const layout = layoutOf(w, p);
      const lots = new Set<string>();
      for (const c of layout.civic) if (c.campus) {
        campuses += 1;
        for (const t of civicFootprint(c)) lots.add(`${t.x},${t.y}`);
      }
      for (const g of townGates(w, p)) {
        const rel = { x: g.x - p.x, y: g.y - p.y };
        const dx = ((rel.x + w.width * 1.5) % w.width) - w.width / 2;
        expect(lots.has(`${dx},${rel.y}`), `${p.name} gate is inside a campus lot`).toBe(false);
        // And the two tiles straight out beyond it, where a road leaves the town, are free of any lot.
        const out = layout.axis === 'h' ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(rel.y) };
        for (const k of [1, 2]) expect(lots.has((dx + out.x * k) + ',' + (rel.y + out.y * k)), p.name + ' way out is blocked').toBe(false);
      }
    }
    expect(campuses).toBeGreaterThan(5);
  }, 30000);
});
