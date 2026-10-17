import { describe, expect, it } from 'vitest';
import map1 from '../maps/map1.json';
import { createWorldFromMap, layoutOf, plotTiles, terrainAt, type MapData } from './world';

describe('made maps', () => {
  it('Map 1 loads with every town on dry land and resources near home', () => {
    const t0 = performance.now();
    const w = createWorldFromMap(map1 as MapData);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(3000);
    expect(w.width).toBe(288);
    expect(w.places.length).toBeGreaterThan(20);
    for (const p of w.places) {
      expect(['grass', 'forest']).toContain(terrainAt(w, p.x, p.y));
      for (const t of plotTiles(w, p)) expect(['grass', 'forest']).toContain(terrainAt(w, t.x, t.y));
      for (const s of layoutOf(w, p).streets) expect(['grass', 'forest']).toContain(terrainAt(w, p.x + s.x, p.y + s.y));
      expect(plotTiles(w, p).length).toBeGreaterThanOrEqual(8);
    }
    const home = w.places[0];
    for (const kind of ['forest', 'farmland', 'pasture'] as const) {
      expect(w.nodes.some((n) => n.kind === kind && Math.hypot(n.x - home.x, n.y - home.y) <= 16)).toBe(true);
    }
    // The same map always makes the same world.
    expect(createWorldFromMap(map1 as MapData).nodes).toEqual(w.nodes);
  });
});
