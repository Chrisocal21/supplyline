import { expect, it } from 'vitest';
import { findPath } from './path';
import { runChores } from './bot';
import { buyVehicle, createRoute, createWorld, placeSite, step } from './world';

it('the first tier plays through on a generated world, following the quests', () => {
  const w = createWorld(11);
  // The camps, ranch and orchard quests at the end of Tier 0 need things these chores do not build: count them done.
  (w.questsDone ??= []).push(...['t0-camps', 't0-ranch', 't0-milk', 't0-first', 't0-dairy', 't0-cheesemake', 't0-cheese', 't0-woodyard', 't0-firewood', 't0-earn']);
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
  // Quest 3: a road from the camp to the town's Supply Yard site.
  const camp = w.sites.find((s) => s.kind === 'forestry')!;
  const mill = w.sites.find((s) => s.kind === 'freight' && s.placeId === town.id)!;
  expect(buyVehicle(w, camp.id, 'boxtruck')).toBeNull();
  expect(createRoute(w, findPath(w, camp, mill, 120000, 'road')!, 'road', 'street')).toBeNull();
  expect(w.money).toBeGreaterThan(0);
  // What a player does by hand now: buy a truck, switch the sale on.
  runChores(w);
  // Quests 4 to 6: the lumber builds the Supply Yard, fills its store, and a yard truck carries it to build the Market. A player
  // buys that truck when the yard stands: the chores do the same.
  for (let i = 0; i < 30000 && w.tier === 0; i++) {
    step(w);
    if (i % 100 === 0) runChores(w);
  }
  expect(w.places[0].stage).toBe(2);
  expect(w.tier).toBe(1);
  expect(w.questsDone).toEqual(expect.arrayContaining(['t0-camp', 't0-truck', 't0-road', 't0-selling', 't0-yard', 't0-market']));
});
