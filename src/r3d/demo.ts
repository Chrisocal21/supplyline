// Builds a small working base near the first town. Used by the #demo link and for screenshots; never saved.
import type { DistrictId, SiteKind } from '../sim/defs';
import { buildDistrict } from '../sim/town';
import { findPath } from '../sim/path';
import { runChores } from '../sim/bot';
import {
  addDock,
  buyVehicle,
  createAirRoute,
  createRoute,
  placeError,
  setSendTo,
  upgradeVehicle,
  placeSite,
  siteAt,
  terrainAt,
  yardSpot,
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

/** Where the showpieces of the last demo base stand, for the opening flythrough. */
export const demoSpots: { airport?: Tile; airport2?: Tile; yard?: Tile; stadium?: Tile; amphitheatre?: Tile; farm?: Tile; stadiumTown?: Tile } = {};

/** Two airports a good way apart on open ground near the town, joined by an air route with a plane flying cargo between them. */
function addAirfield(w: World, town: Tile): void {
  const found: Tile[] = [];
  for (let r = 11; r <= 30 && found.length < 2; r += 1) {
    for (let a = 0; a < 24 && found.length < 2; a++) {
      const ang = (a / 24) * Math.PI * 2 + r * 0.7;
      const x = wrapX(w, Math.round(town.x + Math.cos(ang) * r * 1.6));
      const y = Math.round(town.y + Math.sin(ang) * r);
      if (placeError(w, 'airport', x, y) !== null) continue;
      // Open grass all round, so the runway and planes show instead of hiding in woods.
      let open = 0;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (terrainAt(w, wrapX(w, x + dx), y + dy) === 'grass') open += 1;
      if (open < 44) continue;
      if (found.every((f) => dist(w, f, { x, y }) >= 16)) found.push({ x, y });
    }
  }
  if (found.length < 2) return;
  if (placeSite(w, 'airport', found[0].x, found[0].y) !== null || placeSite(w, 'airport', found[1].x, found[1].y) !== null) return;
  const a = siteAt(w, found[0].x, found[0].y);
  const b = siteAt(w, found[1].x, found[1].y);
  if (!a || !b || createAirRoute(w, a.id, b.id) !== null) return;
  demoSpots.airport = found[0];
  demoSpots.airport2 = found[1];
  // Each field holds goods the other wants, so planes keep flying.
  a.pull = ['flour'];
  b.pull = ['lumber'];
  a.stock.lumber = 400;
  b.stock.flour = 400;
  setSendTo(w, a.id, b.id, true);
  setSendTo(w, b.id, a.id, true);
  buyVehicle(w, a.id, 'plane');
  buyVehicle(w, b.id, 'plane');
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

  // A Rail Yard at the edge of the town, and a freight line into it.
  const spot = yardSpot(world, town);
  if (spot && placeSite(world, 'railyard', spot.x, spot.y) === null) {
    const yard = siteAt(world, spot.x, spot.y);
    if (yard) for (const a of [farm, forestry, quarry]) if (a && connect(world, a, yard, 'rail')) break;
  }
  void hub;
  for (const k of Object.keys(demoSpots)) delete (demoSpots as Record<string, unknown>)[k];
  if (farm) demoSpots.farm = { x: farm.x, y: farm.y };
  if (spot) demoSpots.yard = spot;
  addAirfield(world, town);

  // Civic landmarks: a stadium and community centre in the big city, an amphitheatre in the first town.
  const civic = (p: (typeof world.places)[number] | undefined, id: DistrictId): Tile | null => {
    if (!p) return null;
    p.level = Math.max(p.level, 4);
    if (buildDistrict(world, p, id) !== null) return null;
    const d = world.sites.find((q) => q.districtId === id && q.placeId === p.id) ?? world.sites.find((q) => q.districtId === id);
    return d ? { x: d.x, y: d.y } : null;
  };
  const big = world.places[1] ?? town;
  const st = civic(big, 'stadium');
  if (st) {
    demoSpots.stadium = st;
    demoSpots.stadiumTown = { x: big.x, y: big.y };
  }
  civic(big, 'community');
  const am = civic(town, 'amphitheatre');
  if (am) demoSpots.amphitheatre = am;

  // The base runs: factories on, sales on, trucks bought, as a player would have set it up.
  runChores(world);
  // A few trucks grown into big rigs.
  for (const v of world.vehicles.filter((q) => q.kind === 'boxtruck').slice(0, 3)) {
    upgradeVehicle(world, v.id);
    upgradeVehicle(world, v.id);
  }
  for (let i = 0; i < 1200; i++) step(world);
  return { x: town.x, y: town.y };
}
