// A town's fully grown footprint is held from the first tick: nothing a player can build or lay is ever on the ground its homes,
// lots and districts will take, so nothing needs demolishing, moving or replacing when the town levels up.
import { describe, expect, it } from 'vitest';
import { SITE_DEFS, type SiteKind } from './defs';
import map1 from '../maps/map1.json';
import map2 from '../maps/map2.json';
import map3 from '../maps/map3.json';
import { createWorld, createWorldFromMap, layoutOf, placeError, plannedTownAt, plotAt, townBlocks, wrapX, type MapData, type World } from './world';

const KINDS = (Object.keys(SITE_DEFS) as SiteKind[]).filter((k) => !SITE_DEFS[k].dock && !SITE_DEFS[k].station);

function future(w: World): { x: number; y: number; what: string; placeId: number }[] {
  const out: { x: number; y: number; what: string; placeId: number }[] = [];
  for (const p of w.places) {
    const l = layoutOf(w, p);
    // Homes and district lots at their final level, not yet built at level 1.
    for (const h of l.homes) out.push({ x: wrapX(w, p.x + h.x), y: p.y + h.y, what: 'home', placeId: p.id });
    for (const c of l.civic) out.push({ x: wrapX(w, p.x + c.x), y: p.y + c.y, what: 'district lot', placeId: p.id });
  }
  return out;
}

describe('ground held for the town it will become', () => {
  it('turns every kind of building away from a future home or district lot, and keeps every road off it', () => {
    for (const seed of [3, 8, 21]) {
      const w = createWorld(seed);
      w.tier = 25;
      w.money = 1e9;
      let checked = 0;
      for (const t of future(w)) {
        if (t.y < 0 || t.y >= w.height || w.terrain[t.y * w.width + t.x] === 'water') continue;
        checked += 1;
        // A town lot is the town's own: only its plot may take a building, and a district lot only a district.
        if (plotAt(w, t.x, t.y)) continue;
        for (const kind of KINDS) expect(placeError(w, kind, t.x, t.y), `${kind} on a future ${t.what} at ${t.x},${t.y} (seed ${seed})`).not.toBeNull();
        expect(townBlocks(w, t.x, t.y, 'road'), `a road over a future ${t.what} at ${t.x},${t.y} (seed ${seed})`).toBe(true);
      }
      expect(checked).toBeGreaterThan(50);
    }
  }, 120000);

  it('has no resource node anywhere inside a grown town footprint, on any generated world or hand-made map', () => {
    const worlds = [3, 5, 8, 11, 21].map((seed) => createWorld(seed)).concat([map1, map2, map3].map((m) => createWorldFromMap(m as MapData)));
    for (const w of worlds) for (const n of w.nodes) expect(plannedTownAt(w, n.x, n.y), `${n.kind} node at ${n.x},${n.y}`).toBeUndefined();
  }, 120000);
});
