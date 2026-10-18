// The claim map: what holds every tile of the world, in one place. Placement checks, hover hints and the tests all ask here,
// so there is one answer to "what is on this ground" and one order of precedence. Nothing is stored: each answer is worked
// out from the world as it is, using the same cached lookups the placement rules use.
import { corridorTiles } from './corridors';
import { airportPad, civicAt, isHomePlot, nodeAt, padAt, plannedTownAt, plotAt, routeAt, siteAt, streetAt, terrainAt, wrapX, type World } from './world';

/** What holds a tile, from the strongest claim to none. Permanent claims can never be built over. */
export type Claim =
  | 'outside'
  | 'water'
  | 'ice'
  | 'mountain'
  | 'building'
  | 'street'
  | 'district'
  | 'lot'
  | 'town'
  | 'airport'
  | 'road'
  | 'rail'
  | 'node'
  | 'corridor'
  | 'free';

/** Claims nothing may be placed over. A road or rail may cross water and mountain by bridge and tunnel, so those are not here. */
const PERMANENT: ReadonlySet<Claim> = new Set<Claim>(['outside', 'ice', 'building', 'street', 'district', 'town', 'airport']);

export function isPermanent(c: Claim): boolean {
  return PERMANENT.has(c);
}

/** In words, for a hover hint or a refusal. */
export const CLAIM_TEXT: Record<Claim, string> = {
  outside: 'Off the map',
  water: 'Open water',
  ice: 'Polar ice',
  mountain: 'Mountain',
  building: 'A building stands here',
  street: "One of a town's streets",
  district: 'Held for a town district',
  lot: 'A building lot in a town',
  town: 'Ground a town will grow over',
  airport: "Kept clear for a town's airport",
  road: 'A road runs here',
  rail: 'A railway runs here',
  node: 'A resource lies here',
  corridor: 'A natural route between towns',
  free: 'Open ground',
};

const corridors = new WeakMap<World, { key: string; tiles: Set<number> }>();
function corridorOf(world: World): Set<number> {
  const key = `${world.places.length}:${world.terrain.length}`;
  const hit = corridors.get(world);
  if (hit && hit.key === key) return hit.tiles;
  const tiles = corridorTiles(world);
  corridors.set(world, { key, tiles });
  return tiles;
}

/** What holds this tile. */
export function claimAt(world: World, x: number, y: number): Claim {
  const t = terrainAt(world, x, y);
  if (t === null) return 'outside';
  if (t === 'water') return 'water';
  if (t === 'ice') return 'ice';
  if (siteAt(world, x, y)) return 'building';
  if (streetAt(world, x, y)) return 'street';
  if (civicAt(world, x, y)) return 'district';
  const plot = plotAt(world, x, y);
  // A lot the town has opened is the player's to build on; the Market, the Supply Yard and lots not yet opened are not.
  if (plot && plot.index >= 2 && !isHomePlot(plot.place, plot.index)) return 'lot';
  if (plannedTownAt(world, x, y)) return 'town';
  if (padAt(world, x, y)) return 'airport';
  if (routeAt(world, x, y, 'road')) return 'road';
  if (routeAt(world, x, y, 'rail')) return 'rail';
  if (nodeAt(world, x, y)) return 'node';
  if (t === 'mountain') return 'mountain';
  if (corridorOf(world).has(y * world.width + wrapX(world, x))) return 'corridor';
  return 'free';
}

/** Whether any tile of a footprint is held permanently. Returns the first claim that stops it, or null. */
export function blockedBy(world: World, tiles: { x: number; y: number }[]): Claim | null {
  for (const t of tiles) {
    const c = claimAt(world, t.x, t.y);
    if (isPermanent(c)) return c;
  }
  return null;
}

// airportPad is re-exported so a hover hint can name the town whose airport ground it is.
export { airportPad };
