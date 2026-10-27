import { it, expect } from 'vitest';
import { createWorldFromMap, createRoute, townStreets, type MapData } from './world';
import { findPath } from './path';
import { checkQuests, pathMastered, questProgress } from './quests';
import { PATH_QUESTS, TIERS } from './defs';
import map1 from '../maps/map1.json';
it('a highway laid from road to road counts for the highway quest', () => {
  const w = createWorldFromMap(map1 as MapData);
  w.tier = 1; w.money = 1e6;
  const goal = { kind: 'route', mode: 'road', grade: 'highway', count: 1 } as const;
  expect(questProgress(w, goal).have).toBe(0);
  const a = w.places[0];
  const b = w.places.slice(1).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
  const end = (p: typeof a, o: typeof a) => [...townStreets(w, p)].map((k) => ({ x: k % w.width, y: Math.floor(k / w.width) })).sort((s, t) => Math.hypot(s.x - o.x, s.y - o.y) - Math.hypot(t.x - o.x, t.y - o.y))[0];
  const path = findPath(w, end(a, b), end(b, a), 120000, 'road')!;
  expect(createRoute(w, path, 'road', 'highway')).toBeNull();
  expect(w.routes[w.routes.length - 1].free).toBe(true);
  expect(questProgress(w, goal).have).toBe(1);
});

it('pays out path quests once, and masters the path when all four are done', () => {
  const w = createWorldFromMap(map1 as MapData);
  const town = w.places[0];
  const log = (): void => {};
  checkQuests(w, log);
  expect(w.pathDone ?? []).toHaveLength(0);
  town.path = 'forge';
  town.level = 4;
  const before = w.money;
  checkQuests(w, log);
  expect(w.pathDone).toContain('p-forge-town');
  expect(w.money).toBe(before + PATH_QUESTS.forge[0].reward);
  checkQuests(w, log);
  expect(w.money).toBe(before + PATH_QUESTS.forge[0].reward);
  expect(pathMastered(w, 'forge')).toBe(false);
  for (const q of PATH_QUESTS.forge) if (!w.pathDone!.includes(q.id)) w.pathDone!.push(q.id);
  checkQuests(w, log);
  expect(pathMastered(w, 'forge')).toBe(true);
  expect(town.mastered).toBe(true);
});

it('a free tier moves on after any few of its goals, not all of them', () => {
  const w = createWorldFromMap(map1 as MapData);
  const log = (): void => {};
  w.tier = 7;
  checkQuests(w, log);
  expect(w.tier).toBe(7);
  const tier = TIERS[7];
  expect(tier.need).toBe(3);
  expect(tier.quests.length).toBeGreaterThan(tier.need!);
  // Two goals done are not enough; the third, whichever it is, moves the tier on.
  w.earned += 1e7;
  w.delivered.lumber = 1e6;
  checkQuests(w, log);
  expect(w.tier).toBe(7);
  for (const s of w.places) s.level = 5;
  checkQuests(w, log);
  expect(w.tier).toBeGreaterThan(7);
});

it('the tier goals count from where the tier began, not the lifetime total', () => {
  const w = createWorldFromMap(map1 as MapData);
  w.earned = 1e6;
  w.tier = 9;
  const q = TIERS[9].quests.find((x) => x.goal.kind === 'earn')!;
  expect(questProgress(w, q.goal).have).toBe(0);
  w.earned += 500;
  expect(questProgress(w, q.goal).have).toBe(500);
});
