import { expect, it } from 'vitest';
import { findPath } from './path';
import { runChores } from './bot';
import { buyVehicle, createRoute, createWorld, placeError, placeSite, plotTiles, step, wrapX } from './world';

it('the first tier plays through on a generated world, following the quests', () => {
  const w = createWorld(11);
  const town = w.places[0];
  const W = w.width;
  const d2 = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
    let dx = Math.abs(a.x - b.x);
    dx = Math.min(dx, W - dx);
    return dx * dx + (a.y - b.y) ** 2;
  };
  // Quest 1: a Forestry Camp on the nearest forest spot.
  const node = w.nodes.filter((n) => n.kind === 'forest').sort((a, b) => d2(a, town) - d2(b, town))[0];
  expect(placeSite(w, 'forestry', node.x, node.y)).toBeNull();
  // Quest 2: a Sawmill on the first lot that is for sale.
  const lot = plotTiles(w, town)
    .map((t) => ({ x: wrapX(w, t.x), y: t.y }))
    .find((t) => placeError(w, 'sawmill', t.x, t.y) === null)!;
  expect(placeSite(w, 'sawmill', lot.x, lot.y)).toBeNull();
  // Quest 3: a road between them. The town's streets do the rest.
  const camp = w.sites.find((s) => s.kind === 'forestry')!;
  const mill = w.sites.find((s) => s.kind === 'sawmill')!;
  expect(buyVehicle(w, camp.id, 'boxtruck')).toBeNull();
  expect(createRoute(w, findPath(w, camp, mill, 120000, 'road')!, 'road', 'street')).toBeNull();
  expect(w.money).toBeGreaterThan(0);
  // What a player does by hand now: switch the sawmill on, buy a truck, switch the sale on.
  runChores(w);
  // Quest 4: sell 100 lumber. About ten minutes of game time is plenty.
  for (let i = 0; i < 9000 && w.tier === 0; i++) step(w);
  expect(w.delivered.lumber ?? 0).toBeGreaterThanOrEqual(100);
  expect(w.tier).toBe(1);
  expect(w.questsDone).toEqual(expect.arrayContaining(['t0-camp', 't0-truck', 't0-mill', 't0-road', 't0-making', 't0-selling', 't0-sell']));
});
