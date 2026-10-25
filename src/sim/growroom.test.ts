// A building on open ground holds the ground of its last level from the day it is placed: nothing is torn down to make room.
import { describe, expect, it } from 'vitest';
import type { Terrain } from './defs';
import { createBlankWorld, placeError, placeSite, siteAt, siteBodyCenter, siteTiles, type World } from './world';

function world(): World {
  const w = createBlankWorld(40, 30, new Array<Terrain>(40 * 30).fill('grass'));
  w.tier = 3;
  w.money = 1e6;
  w.growRoom = true;
  return w;
}

describe('ground held for growth', () => {
  it('holds a 2x2 block at once, and every tile of it belongs to the building', () => {
    const w = world();
    expect(placeSite(w, 'hub', 10, 10, 1)).toBeNull();
    const hub = siteAt(w, 10, 10)!;
    expect(hub.res).toBe(1);
    const tiles = siteTiles(w, hub);
    expect(tiles).toHaveLength(4);
    for (const t of tiles) expect(siteAt(w, t.x, t.y)?.id).toBe(hub.id);
    expect(siteAt(w, 12, 10)).toBeUndefined();
  });

  it('keeps other buildings off the held ground, and off ground it could not hold', () => {
    const w = world();
    expect(placeSite(w, 'hub', 10, 10, 1)).toBeNull();
    const hub = siteAt(w, 10, 10)!;
    for (const t of siteTiles(w, hub)) expect(placeError(w, 'hub', t.x, t.y)).toBeTruthy();
    // Right beside the block there is room for the next one; one tile off the edge, its own block would overlap.
    const edge = siteTiles(w, hub).reduce((m, t) => Math.max(m, t.x), 0);
    expect(placeError(w, 'hub', edge + 2, 10)).toBeNull();
    // A tile of water beside the gate leaves no 2x2 to hold toward that side, so the block lies the other way, or it is refused.
    w.terrain[21 * 40 + 19] = 'water';
    expect(placeError(w, 'hub', 20, 20, 1)).toMatch(/2x2/);
    expect(placeError(w, 'hub', 20, 20)).toBeNull();
  });

  it('stands a small building on its gate tile and a grown one in the middle of its block', () => {
    const w = world();
    expect(placeSite(w, 'hub', 10, 10, 1)).toBeNull();
    const hub = siteAt(w, 10, 10)!;
    expect(siteBodyCenter(w, hub)).toEqual({ x: 10, y: 10 });
    hub.level = 4;
    const c = siteBodyCenter(w, hub);
    const tiles = siteTiles(w, hub);
    const mx = tiles.reduce((s, t) => s + t.x, 0) / 4;
    const my = tiles.reduce((s, t) => s + t.y, 0) / 4;
    expect(c).toEqual({ x: mx, y: my });
  });

  it('is only for new worlds: an old save keeps one tile', () => {
    const w = world();
    w.growRoom = false;
    expect(placeSite(w, 'hub', 10, 10)).toBeNull();
    expect(siteAt(w, 10, 10)!.res).toBeUndefined();
    expect(siteTiles(w, siteAt(w, 10, 10)!)).toHaveLength(1);
  });

  it('a camp on a resource node holds the room beside it when there is some, and still stands on its node when there is none', () => {
    const w = world();
    w.nodes.push({ id: 90, kind: 'forest', x: 10, y: 10, quality: 1 } as never);
    expect(placeError(w, 'forestry', 10, 10)).toBeNull();
    expect(placeSite(w, 'forestry', 10, 10)).toBeNull();
    const camp = siteAt(w, 10, 10)!;
    expect(camp.res).toBeDefined();
    expect(siteTiles(w, camp)).toHaveLength(4);
    // A node on a one-tile spit with water all round: never refused for room, just no more ground held.
    w.nodes.push({ id: 91, kind: 'forest', x: 25, y: 20, quality: 1 } as never);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) w.terrain[(20 + dy) * 40 + 25 + dx] = 'water';
    expect(placeSite(w, 'forestry', 25, 20)).toBeNull();
    expect(siteAt(w, 25, 20)!.res).toBeUndefined();
    expect(siteTiles(w, siteAt(w, 25, 20)!)).toHaveLength(1);
  });
});
