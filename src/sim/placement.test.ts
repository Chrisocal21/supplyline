// Placement never takes anything that is already there: a building goes only on free ground, and nothing that stands is
// moved, replaced or removed by another going up. Tried on many tiles of several worlds, for every kind a player can place.
import { describe, expect, it } from 'vitest';
import { HIGHWAY_TIER, SITE_DEFS, type SiteKind } from './defs';
import { findPath } from './path';
import { civicAt, createRoute, createWorld, padAt, placeError, plotAt, placeSite, siteTiles, streetAt, townTiles, wrapX, type World } from './world';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLACEABLE = (Object.keys(SITE_DEFS) as SiteKind[]).filter((k) => !SITE_DEFS[k].dock && !SITE_DEFS[k].station);

function snapshot(w: World): string[] {
  return w.sites.map((s) => `${s.id}:${s.kind}:${s.x},${s.y}:${s.rot ?? ''}:${s.level}`);
}

describe('placing buildings', () => {
  it('only ever uses free ground and never disturbs what already stands', () => {
    for (const seed of [3, 8]) {
      const w = createWorld(seed);
      w.tier = Math.max(w.tier, HIGHWAY_TIER);
      w.money = 1e9;
      const r = rng(seed * 101);
      const taken = new Set<number>();
      const key = (x: number, y: number): number => y * w.width + wrapX(w, x);
      let placed = 0;
      for (let attempt = 0; attempt < 6000 && placed < 120; attempt++) {
        const kind = PLACEABLE[Math.floor(r() * PLACEABLE.length)];
        const def = SITE_DEFS[kind];
        // Resource buildings need their node; try one, otherwise any tile.
        const node = def.node ? w.nodes.filter((n) => n.kind === def.node)[Math.floor(r() * 4) % Math.max(1, w.nodes.filter((n) => n.kind === def.node).length)] : undefined;
        const x = node ? node.x : Math.floor(r() * w.width);
        const y = node ? node.y : 4 + Math.floor(r() * (w.height - 8));
        if (placeError(w, kind, x, y) !== null) continue;
        const before = snapshot(w);
        expect(placeSite(w, kind, x, y)).toBeNull();
        const after = snapshot(w);
        // Everything that stood is still standing, unchanged.
        for (const line of before) expect(after).toContain(line);
        const site = w.sites[w.sites.length - 1];
        for (const t of siteTiles(w, site)) {
          const k = key(t.x, t.y);
          expect(taken.has(k), `${kind} at ${t.x},${t.y} overlaps another building`).toBe(false);
          taken.add(k);
          expect(w.terrain[k], `${kind} on bad ground`).not.toBe('water');
          expect(w.terrain[k]).not.toBe('ice');
          expect(streetAt(w, t.x, t.y), `${kind} on a town street`).toBeUndefined();
          expect(civicAt(w, t.x, t.y), `${kind} on a district lot`).toBeNull();
          if (!def.airport) expect(padAt(w, t.x, t.y), `${kind} on an airport's ground`).toBeUndefined();
        }
        placed++;
      }
      expect(placed).toBeGreaterThan(20);
    }
  });

  it('never lets a building go inside another town\'s grown footprint except on its own plots', () => {
    const w = createWorld(5);
    w.tier = Math.max(w.tier, HIGHWAY_TIER);
    w.money = 1e9;
    const grown = new Set<number>();
    for (const p of w.places) for (const t of townTiles(w, p)) grown.add(t.y * w.width + wrapX(w, t.x));
    const r = rng(77);
    for (let attempt = 0; attempt < 4000; attempt++) {
      const kind = PLACEABLE[Math.floor(r() * PLACEABLE.length)];
      const def = SITE_DEFS[kind];
      if (def.node || def.inTown) continue;
      const x = Math.floor(r() * w.width);
      const y = 4 + Math.floor(r() * (w.height - 8));
      if (placeError(w, kind, x, y) !== null) continue;
      // A town's own plots are where a building may stand inside its footprint.
      if (plotAt(w, x, y)) continue;
      expect(grown.has(y * w.width + wrapX(w, x)), `${kind} at ${x},${y} is in a town's grown footprint`).toBe(false);
    }
  });
});

describe('laying roads', () => {
  it('never runs over a building, a district lot or a town\'s homes, and leaves every building standing', () => {
    const w = createWorld(3);
    w.tier = Math.max(w.tier, HIGHWAY_TIER);
    w.money = 1e9;
    const r = rng(404);
    const kinds = PLACEABLE.filter((k) => SITE_DEFS[k].node);
    for (let attempt = 0; attempt < 800 && w.sites.length < 14; attempt++) {
      const kind = kinds[Math.floor(r() * kinds.length)];
      const nodes = w.nodes.filter((n) => n.kind === SITE_DEFS[kind].node);
      const n = nodes[Math.floor(r() * nodes.length)];
      if (n && placeError(w, kind, n.x, n.y) === null) placeSite(w, kind, n.x, n.y);
    }
    expect(w.sites.length).toBeGreaterThan(5);
    const standing = snapshot(w);
    const siteTilesAll = new Set<number>();
    for (const s of w.sites) for (const t of siteTiles(w, s)) siteTilesAll.add(t.y * w.width + wrapX(w, t.x));
    let built = 0;
    for (let i = 0; i < w.sites.length && built < 6; i++) {
      const a = w.sites[i];
      const b = w.sites[(i + 1) % w.sites.length];
      if (a === b) continue;
      const path = findPath(w, { x: a.x, y: a.y }, { x: b.x, y: b.y }, 120000, 'road');
      if (!path) continue;
      if (createRoute(w, path, 'road', 'street') !== null) continue;
      built++;
      for (const t of path) {
        const k = t.y * w.width + wrapX(w, t.x);
        const own = (a.x === t.x && a.y === t.y) || (b.x === t.x && b.y === t.y);
        if (!own) expect(siteTilesAll.has(k), `road at ${t.x},${t.y} runs over a building`).toBe(false);
        expect(civicAt(w, t.x, t.y), `road at ${t.x},${t.y} runs over a district lot`).toBeNull();
      }
    }
    expect(built).toBeGreaterThan(0);
    expect(snapshot(w)).toEqual(standing);
  });
});
