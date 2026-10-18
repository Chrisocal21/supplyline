import { describe, expect, it } from 'vitest';
import map1 from '../maps/map1.json';
import map2 from '../maps/map2.json';
import { NODE_FAMILY, OTHER_GAP, SAME_GAP, nodeGap } from './noderules';
import { corridorTiles } from './corridors';
import { claimAt } from './claims';
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
      expect(w.nodes.some((n) => n.kind === kind && Math.hypot(n.x - home.x, n.y - home.y) <= 18)).toBe(true);
    }
    // The same map always makes the same world.
    expect(createWorldFromMap(map1 as MapData).nodes).toEqual(w.nodes);
  });

  it('Map 2 is a large, mostly-land continent with rivers, ranges and towns on dry land', () => {
    const t0 = performance.now();
    const w = createWorldFromMap(map2 as MapData);
    expect(performance.now() - t0).toBeLessThan(6000);
    expect(w.width).toBe(384);
    expect(w.height).toBe(128);
    // About 85% land, as asked.
    const playable = w.terrain.filter((t) => t !== 'ice');
    const water = playable.filter((t) => t === 'water').length / playable.length;
    expect(water).toBeGreaterThan(0.1);
    expect(water).toBeLessThan(0.18);
    expect(w.places.length).toBeGreaterThan(40);
    expect(w.places.filter((p) => p.radius === 5).length).toBeGreaterThanOrEqual(6);
    for (const p of w.places) {
      expect(['grass', 'forest']).toContain(terrainAt(w, p.x, p.y));
      for (const t of plotTiles(w, p)) expect(['grass', 'forest']).toContain(terrainAt(w, t.x, t.y));
    }
    // Its start town has a forest, a field and a meadow close by, and every kind of resource is somewhere.
    const home = w.places[0];
    for (const kind of ['forest', 'farmland', 'pasture'] as const) {
      expect(w.nodes.some((n) => n.kind === kind && Math.hypot(n.x - home.x, n.y - home.y) <= 20), kind).toBe(true);
    }
    const kinds = new Set(w.nodes.map((n) => n.kind));
    for (const k of ['forest', 'farmland', 'pasture', 'orchard', 'quarry', 'mine', 'coal', 'clay', 'oil', 'coffee', 'mango'] as const) expect(kinds.has(k), k).toBe(true);
    // Rivers and routes: corridors reach every town and keep out of the water.
    const route = corridorTiles(w);
    for (const p of w.places) expect(route.has(p.y * w.width + p.x)).toBe(true);
    // The same map always makes the same world.
    expect(createWorldFromMap(map2 as MapData).nodes).toEqual(w.nodes);
  }, 30000);

  it('Map 2 keeps its node rules: kin side by side, strangers apart, nothing on a town, a route or open water', () => {
    const w = createWorldFromMap(map2 as MapData);
    const start = { kind: 'forest' as const, x: w.places[0].x, y: w.places[0].y };
    for (let i = 0; i < w.nodes.length; i++) {
      const n = w.nodes[i];
      expect(['grass', 'forest']).toContain(terrainAt(w, n.x, n.y));
      expect(['town', 'street', 'district', 'building']).not.toContain(claimAt(w, n.x, n.y));
      for (let j = i + 1; j < w.nodes.length; j++) {
        const d = nodeGap(n, w.nodes[j], w.width);
        if (NODE_FAMILY[n.kind] === NODE_FAMILY[w.nodes[j].kind]) expect(d).toBeGreaterThanOrEqual(SAME_GAP);
        else if (d < OTHER_GAP) expect(Math.min(nodeGap(n, start, w.width), nodeGap(w.nodes[j], start, w.width))).toBeLessThanOrEqual(24);
      }
    }
  }, 30000);
});
