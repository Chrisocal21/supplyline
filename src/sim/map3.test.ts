import { describe, expect, it } from 'vitest';
import { isDesert } from './desert';
import map3 from '../maps/map3.json';
import { NODE_FAMILY, SAME_GAP, nodeGap } from './noderules';
import { claimAt } from './claims';
import { createWorldFromMap, step, terrainAt, type MapData, type World } from './world';
import { WORLD_SIZES } from './defs';

describe('Map 3: The Meridian Sea', () => {
  let w: World;
  it('builds, with its towns, its goods overseas and a Forestry node for every big wood', () => {
    const t0 = Date.now();
    w = createWorldFromMap(map3 as unknown as MapData);
    expect(Date.now() - t0).toBeLessThan(60000);
    expect(w.width).toBe(768);
    expect(w.places.length).toBeGreaterThan(150);
    expect(w.height).toBe(352);
    for (const kind of ['coffee', 'mango', 'oil'] as const) expect(w.nodes.filter((n) => n.kind === kind).length).toBeGreaterThanOrEqual(5);
    // Every wood of 26 tiles or more has a forest node on it or beside it.
    const seen = new Set<number>();
    let big = 0;
    let bare = 0;
    for (let y = 0; y < w.height; y++) {
      for (let x = 0; x < w.width; x++) {
        const i = y * w.width + x;
        if (seen.has(i) || w.terrain[i] !== 'forest') continue;
        const wood = [i];
        seen.add(i);
        for (let k = 0; k < wood.length; k++) {
          const cx = wood[k] % w.width;
          const cy = (wood[k] - cx) / w.width;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ny = cy + dy;
            if (ny < 0 || ny >= w.height) continue;
            const j = ny * w.width + ((((cx + dx) % w.width) + w.width) % w.width);
            if (seen.has(j) || w.terrain[j] !== 'forest') continue;
            seen.add(j);
            wood.push(j);
          }
        }
        if (wood.length < 26) continue;
        big++;
        const set = new Set(wood);
        const has = w.nodes.some((n) => n.kind === 'forest' && [-2, -1, 0, 1, 2].some((dy) => [-2, -1, 0, 1, 2].some((dx) => set.has((n.y + dy) * w.width + ((((n.x + dx) % w.width) + w.width) % w.width)))));
        if (!has) bare++;
      }
    }
    expect(big).toBeGreaterThan(10);
    // A wood that is all hemmed in by towns may go without; nearly all must have one.
    expect(bare / big).toBeLessThan(0.08);
  }, 120000);

  it('keeps its nodes off towns and apart, and plays', () => {
    for (const n of w.nodes) {
      expect(['grass', 'forest']).toContain(terrainAt(w, n.x, n.y));
      expect(['town', 'street', 'district', 'building']).not.toContain(claimAt(w, n.x, n.y));
    }
    for (let i = 0; i < w.nodes.length; i += 3) {
      for (let j = i + 1; j < Math.min(w.nodes.length, i + 40); j++) {
        if (NODE_FAMILY[w.nodes[i].kind] === NODE_FAMILY[w.nodes[j].kind]) expect(nodeGap(w.nodes[i], w.nodes[j], w.width)).toBeGreaterThanOrEqual(SAME_GAP);
      }
    }
    for (let i = 0; i < 200; i++) step(w);
    expect(Number.isFinite(w.money)).toBe(true);
  }, 120000);

  it('is listed in the menu as in progress, and after Maps 1 and 2', () => {
    const ids = WORLD_SIZES.map((q) => q.id);
    expect(ids.slice(0, 3)).toEqual(['map1', 'map2', 'map3']);
    expect(WORLD_SIZES.find((q) => q.id === 'map3')?.inProgress).toBe(true);
  });
});

describe('Map 3 deserts', () => {
  const w = createWorldFromMap(map3 as unknown as MapData);
  it('has a desert continent and a desert belt, with no trees on the sand', () => {
    let land = 0;
    let sand = 0;
    let treed = 0;
    for (let y = 0; y < w.height; y++) {
      for (let x = 0; x < w.width; x++) {
        const t = w.terrain[y * w.width + x];
        if (t === 'water' || t === 'ice') continue;
        land++;
        if (isDesert(w, x, y)) {
          sand++;
          if (t === 'forest') treed++;
        }
      }
    }
    expect(sand / land).toBeGreaterThan(0.1);
    expect(sand / land).toBeLessThan(0.3);
    expect(treed).toBe(0);
  });
  it('desert towns are arid, and the start town is not in the desert', () => {
    const start = w.places[0];
    expect(isDesert(w, start.x, start.y)).toBe(false);
    const arid = w.places.filter((p) => isDesert(w, p.x, p.y));
    expect(arid.length).toBeGreaterThan(10);
    for (const p of arid) expect(p.style).toBe('arid');
  });
});

describe('Map 3 towns keep clear of the water', () => {
  const w = createWorldFromMap(map3 as unknown as MapData);
  it('has no water within three tiles of any town edge, and about 5.5 times the land of Map 2', () => {
    for (const p of w.places) {
      const r = p.radius + 3;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const t = terrainAt(w, p.x + dx, p.y + dy);
          expect(t === 'water' || t === 'ice').toBe(false);
        }
      }
    }
    let land = 0;
    for (const t of w.terrain) if (t !== 'water' && t !== 'ice') land++;
    expect(land).toBeGreaterThan(5.2 * 26000);
  }, 120000);
});
