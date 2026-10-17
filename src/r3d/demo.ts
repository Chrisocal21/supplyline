// Builds a small working base near the first town. Used by the #demo link and for screenshots; never saved.
import type { SiteKind } from '../sim/defs';
import { findPath } from '../sim/path';
import { runChores } from '../sim/bot';
import {
  addDock,
  createRoute,
  buildDepot,
  placeSite,
  isHomePlot,
  plotTiles,
  step,
  wrapDx,
  wrapX,
  type Site,
  type Tile,
  type World,
} from '../sim/world';

function dist(w: World, a: Tile, b: Tile): number {
  return Math.hypot(wrapDx(w, a.x, b.x), a.y - b.y);
}

function connect(w: World, a: Site, b: Site, mode: 'road' | 'rail' = 'road', grade: 'street' | 'highway' = 'street'): boolean {
  const path = findPath(w, a, b, 120000, mode);
  return path !== null && createRoute(w, path, mode, grade) === null;
}

/** Returns the tile the camera should look at. */
export function buildDemo(world: World): Tile | null {
  world.money = 500000;
  world.tier = 3;
  const town = world.places[0];
  if (!town) return null;

  // Show towns at different stages of growth.
  const levels = [3, 5, 4, 2];
  world.places.slice(0, levels.length).forEach((p, i) => {
    p.level = levels[i];
    if (p.level >= 2) addDock(world, p, 'freight');
  });

  const nearest = (kind: 'forest' | 'farmland' | 'quarry', min = 0) =>
    world.nodes
      .filter((n) => n.kind === kind && dist(world, n, town) >= min)
      .sort((a, b) => dist(world, a, town) - dist(world, b, town))[0];
  const forestNode = nearest('forest', 6);
  const farmNode = nearest('farmland', 6);
  const quarryNode = nearest('quarry');

  const place = (kind: SiteKind, x: number, y: number): Site | null =>
    placeSite(world, kind, x, y) === null ? world.sites[world.sites.length - 1] : null;
  const plots = plotTiles(world, town);
  const spots = plots.map((_, i) => i).filter((i) => i >= 2 && !isHomePlot(town, i));
  const inTown = (kind: SiteKind, index: number): Site | null => {
    const pi = spots[index - 2];
    return pi === undefined ? null : place(kind, wrapX(world, plots[pi].x), plots[pi].y);
  };

  const forestry = forestNode ? place('forestry', forestNode.x, forestNode.y) : null;
  const farm = farmNode ? place('farm', farmNode.x, farmNode.y) : null;
  const quarry = quarryNode && dist(world, quarryNode, town) < 40 ? place('quarry', quarryNode.x, quarryNode.y) : null;

  const sawmill = inTown('sawmill', 2);
  const mill = inTown('mill', 3);
  inTown('bakery', 4);
  inTown('feedmill', 6);
  const hub = inTown('hub', 7);
  const bricks = inTown('brickworks', 5);

  if (forestry && sawmill) connect(world, forestry, sawmill);
  if (farm && mill) connect(world, farm, mill, 'road', 'highway');
  if (quarry && bricks) connect(world, quarry, bricks);

  // A freight line into the town's rail depot.
  if (hub && buildDepot(world, hub.id) === null) {
    for (const a of [farm, forestry, quarry]) if (a && connect(world, a, hub, 'rail')) break;
  }

  // The base runs: factories on, sales on, trucks bought, as a player would have set it up.
  runChores(world);
  for (let i = 0; i < 1200; i++) step(world);
  return { x: town.x, y: town.y };
}
