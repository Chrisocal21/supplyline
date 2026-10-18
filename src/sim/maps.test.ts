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

  it('Map 2 is a large world of several landmasses, about 45% water, with rivers, ranges and towns on dry land', () => {
    const t0 = performance.now();
    const w = createWorldFromMap(map2 as MapData);
    expect(performance.now() - t0).toBeLessThan(6000);
    expect(w.width).toBe(384);
    expect(w.height).toBe(128);
    // Earth-like: just under half water.
    const playable = w.terrain.filter((t) => t !== 'ice');
    const water = playable.filter((t) => t === 'water').length / playable.length;
    expect(water).toBeGreaterThan(0.38);
    expect(water).toBeLessThan(0.52);
    // Separate landmasses: the coffee, mangoes and some oil lie across the water from the start town, so ships and planes have work.
    const landmass = new Map<number, number>();
    let masses = 0;
    const flood = (sx: number, sy: number): void => {
      const stack = [[sx, sy]];
      landmass.set(sy * w.width + sx, masses);
      while (stack.length) {
        const [x, y] = stack.pop()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = (x + dx + w.width) % w.width;
          const ny = y + dy;
          if (ny < 0 || ny >= w.height || landmass.has(ny * w.width + nx) || ['water', 'ice'].includes(w.terrain[ny * w.width + nx])) continue;
          landmass.set(ny * w.width + nx, masses);
          stack.push([nx, ny]);
        }
      }
    };
    for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++) if (!landmass.has(y * w.width + x) && !['water', 'ice'].includes(w.terrain[y * w.width + x])) {
      flood(x, y);
      masses++;
    }
    expect(masses).toBeGreaterThanOrEqual(5);
    const startMass = landmass.get(w.places[0].y * w.width + w.places[0].x);
    for (const kind of ['coffee', 'mango'] as const) {
      const ns = w.nodes.filter((n) => n.kind === kind);
      expect(ns.length, kind).toBeGreaterThan(0);
      expect(ns.every((n) => landmass.get(n.y * w.width + n.x) !== startMass), kind + ' should be overseas').toBe(true);
    }
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

  it('Map 2 squares its belts up: farms, pastures, orchards and mines stand in straight rows and columns', () => {
    const w = createWorldFromMap(map2 as MapData);
    let pairs = 0;
    let square = 0;
    for (let i = 0; i < w.nodes.length; i++) {
      for (let j = i + 1; j < w.nodes.length; j++) {
        const a = w.nodes[i];
        const b = w.nodes[j];
        const family = NODE_FAMILY[a.kind];
        if (family !== NODE_FAMILY[b.kind] || (family !== 'farming' && family !== 'mining') || nodeGap(a, b, w.width) > SAME_GAP + 4) continue;
        pairs += 1;
        if (Math.abs(a.x - b.x) % 4 === 0 && Math.abs(a.y - b.y) % 4 === 0) square += 1;
      }
    }
    expect(pairs).toBeGreaterThan(10);
    expect(square / pairs).toBeGreaterThan(0.85);
  }, 30000);

  it('Map 2 has a forestry node by most of its stands of trees', () => {
    const w = createWorldFromMap(map2 as MapData);
    const woods = w.nodes.filter((n) => n.kind === 'forest');
    let trees = 0;
    let served = 0;
    for (let k = 0; k < w.terrain.length; k++) {
      if (w.terrain[k] !== 'forest') continue;
      trees += 1;
      if (woods.some((n) => nodeGap(n, { kind: 'forest', x: k % w.width, y: Math.floor(k / w.width) }, w.width) <= 8)) served += 1;
    }
    expect(served / trees).toBeGreaterThan(0.7);
  }, 30000);
});
