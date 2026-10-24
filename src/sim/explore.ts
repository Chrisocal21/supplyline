// What the company has seen. The world is covered in fog until something of the company's is near: a building, a road or
// track, a vehicle's route, a town it trades with. The drawing keeps fogged ground bare and its trees, towns and props unmade,
// so a big world costs no more than the part that is open. Old saves have no fog (every cell counts as seen).
import type { World } from './world';

/** The fog is kept in squares of this many tiles. */
export const EXPLORE_CELL = 12;

export const exploreCols = (world: World): number => Math.ceil(world.width / EXPLORE_CELL);
export const exploreRows = (world: World): number => Math.ceil(world.height / EXPLORE_CELL);

/** Cover the world in fog and open the ground round the first town and anything already built. */
export function startExploring(world: World): void {
  world.explored = new Array<number>(exploreCols(world) * exploreRows(world)).fill(0);
  const home = world.places[0];
  if (home) reveal(world, home.x, home.y, 40);
  stepExplore(world, true);
}

/** Whether the ground at a tile has been seen. */
export function isExplored(world: World, x: number, y: number): boolean {
  const e = world.explored;
  if (!e) return true;
  const cols = exploreCols(world);
  const cx = Math.floor((((x % world.width) + world.width) % world.width) / EXPLORE_CELL);
  const cy = Math.max(0, Math.min(exploreRows(world) - 1, Math.floor(y / EXPLORE_CELL)));
  return e[cy * cols + cx] === 1;
}

/** Open every cell whose centre is within `r` tiles of a point. Returns whether anything new opened. */
export function reveal(world: World, x: number, y: number, r: number): boolean {
  const e = world.explored;
  if (!e) return false;
  const cols = exploreCols(world);
  const rows = exploreRows(world);
  const c0 = Math.floor((y - r) / EXPLORE_CELL);
  const c1 = Math.floor((y + r) / EXPLORE_CELL);
  const x0 = Math.floor((x - r) / EXPLORE_CELL);
  const x1 = Math.floor((x + r) / EXPLORE_CELL);
  let changed = false;
  for (let cy = Math.max(0, c0); cy <= Math.min(rows - 1, c1); cy++) {
    for (let cxr = x0; cxr <= x1; cxr++) {
      const cx = ((cxr % cols) + cols) % cols;
      const i = cy * cols + cx;
      if (e[i] === 1) continue;
      const mx = cxr * EXPLORE_CELL + EXPLORE_CELL / 2;
      const my = cy * EXPLORE_CELL + EXPLORE_CELL / 2;
      if (Math.hypot(mx - x, my - y) > r + EXPLORE_CELL * 0.35) continue;
      e[i] = 1;
      changed = true;
    }
  }
  if (changed) world.exploreStamp = (world.exploreStamp ?? 0) + 1;
  return changed;
}

/** Open ground round the company's buildings and along its roads, tracks and lanes. Every few seconds (or at once when forced). */
export function stepExplore(world: World, force = false): void {
  if (!world.explored || (!force && world.tick % 60 !== 0)) return;
  // The company's own buildings: a town's docks and district buildings are not the company's, and open nothing.
  for (const s of world.sites) if (s.placeId == null && !s.districtId) reveal(world, s.x, s.y, 26);
  for (const r of world.routes) {
    const p = r.path;
    for (let i = 0; i < p.length; i += 5) reveal(world, p[i].x, p[i].y, 11);
    if (p.length) reveal(world, p[p.length - 1].x, p[p.length - 1].y, 11);
  }
}
