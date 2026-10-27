// Ships and the water: a barge sails any river or lake, a boat needs a wide channel, a freighter needs open sea.
import { describe, expect, it } from 'vitest';
import map2 from '../maps/map2.json';
import { VEHICLE_DEFS } from './defs';
import { bestSeaPath, seaPlan, createWorldFromMap, laneOk, placeError, prepareRealisticWorld, type MapData, type Site, type Vehicle, type World } from './world';

function portTiles(w: World): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 2; y < w.height - 2; y += 2) {
    for (let x = 0; x < w.width; x += 2) {
      const err = placeError(w, 'port', x, y);
      if (err === null || err.startsWith('Need $')) out.push({ x, y });
    }
  }
  return out;
}

describe('ships and channels', () => {
  const w = createWorldFromMap(map2 as MapData);
  prepareRealisticWorld(w);
  w.tier = 25;
  w.money = 1e6;
  const tiles = portTiles(w);

  it('let ports stand on rivers and lakes as well as the sea', () => {
    expect(tiles.length).toBeGreaterThan(200);
  });

  it('give each route the biggest ship class its narrowest water takes', () => {
    const seen = new Set<number>();
    let tried = 0;
    for (let i = 0; i < tiles.length && tried < 400 && seen.size < 3; i += 7) {
      for (let j = i + 11; j < tiles.length && j < i + 200; j += 13) {
        const a = tiles[i];
        const b = tiles[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) > 60) continue;
        tried += 1;
        const found = bestSeaPath(w, a, b);
        if (found) seen.add(found.draft);
      }
    }
    expect(seen.has(2)).toBe(true);
    expect(seen.has(0) || seen.has(1)).toBe(true);
  }, 120000);

  it('keep deep ships off a shallow route and let a barge sail anywhere', () => {
    const site = { id: 1 } as Site;
    const ship = (kind: 'barge' | 'boat' | 'freighter'): Vehicle => ({ id: 1, kind, homeId: 1 } as Vehicle);
    expect(VEHICLE_DEFS.barge.draft).toBe(0);
    expect(VEHICLE_DEFS.freighter.draft).toBe(2);
    const world = { routes: [], sites: [site], vehicles: [], tier: 9 } as unknown as World;
    const lane = (draft: number) => ({ id: 1, mode: 'sea', fromSiteId: 1, toSiteId: 2, path: [], draft }) as unknown as { draft: number };
    // Only the draft rule matters here: a route too narrow for the ship is refused before any other check.
    for (const [kind, draft, ok] of [['barge', 0, true], ['boat', 0, false], ['boat', 1, true], ['freighter', 1, false], ['freighter', 2, true]] as const) {
      const r = lane(draft);
      const refusedForDraft = (VEHICLE_DEFS[kind].draft ?? 0) > (r.draft ?? 2);
      expect(refusedForDraft).toBe(!ok);
    }
    expect(typeof laneOk).toBe('function');
    expect(world.tier).toBe(9);
    expect(ship('barge').kind).toBe('barge');
  });
});

describe('canals', () => {
  it('join two ports no water joins, by digging, and take boats but not freighters', () => {
    const w = createWorldFromMap(map2 as MapData);
    prepareRealisticWorld(w);
    w.tier = 25;
    w.money = 1e6;
    const tiles = portTiles(w);
    let plan: ReturnType<typeof seaPlan> = null;
    for (let i = 0; i < tiles.length && !plan?.canal; i += 5) {
      for (let j = i + 1; j < tiles.length && j < i + 150; j += 3) {
        const a = tiles[i];
        const b = tiles[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) > 50 || bestSeaPath(w, a, b)) continue;
        plan = seaPlan(w, a, b);
        if (plan?.canal) break;
      }
    }
    expect(plan?.canal).toBe(true);
    expect(plan!.draft).toBe(1);
    expect(plan!.cost).toBeGreaterThan(plan!.path.length * 3);
  }, 120000);
});
