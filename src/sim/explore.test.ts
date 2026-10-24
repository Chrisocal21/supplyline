import { describe, expect, it } from 'vitest';
import map2 from '../maps/map2.json';
import { isExplored, reveal, startExploring, stepExplore } from './explore';
import { createWorldFromMap, step, type MapData } from './world';

describe('fog of the world', () => {
  const world = createWorldFromMap(map2 as unknown as MapData);

  it('starts covered, with the first town open', () => {
    const home = world.places[0];
    expect(isExplored(world, home.x, home.y)).toBe(true);
    const far = world.places.find((p) => Math.hypot(p.x - home.x, p.y - home.y) > 120);
    expect(far).toBeTruthy();
    expect(isExplored(world, far!.x, far!.y)).toBe(false);
    const open = world.explored!.filter((e) => e === 1).length;
    expect(open).toBeGreaterThan(0);
    expect(open).toBeLessThan(world.explored!.length / 3);
  });

  it('opens round a new point, and the stamp moves', () => {
    const before = world.exploreStamp ?? 0;
    expect(reveal(world, 5, 5, 20)).toBe(true);
    expect(isExplored(world, 5, 5)).toBe(true);
    expect(world.exploreStamp).toBeGreaterThan(before);
    expect(reveal(world, 5, 5, 20)).toBe(false);
  });

  it('opens along a built route as the game runs', () => {
    const w = createWorldFromMap(map2 as unknown as MapData);
    const far = w.places.find((p) => Math.hypot(p.x - w.places[0].x, p.y - w.places[0].y) > 120)!;
    w.routes.push({ id: 9999, mode: 'road', fromSiteId: 0, toSiteId: 0, free: true, path: [{ x: far.x, y: far.y }] });
    stepExplore(w, true);
    expect(isExplored(w, far.x, far.y)).toBe(true);
    for (let i = 0; i < 5; i++) step(w);
  });

  it('an old save with no fog counts everything as seen', () => {
    const old = createWorldFromMap(map2 as unknown as MapData);
    old.explored = undefined;
    expect(isExplored(old, 100, 40)).toBe(true);
    startExploring(old);
    expect(old.explored).toBeTruthy();
  });
});
