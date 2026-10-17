import { it, expect } from 'vitest';
import { createWorldFromMap, createRoute, townStreets, type MapData } from './world';
import { findPath } from './path';
import { questProgress } from './quests';
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
