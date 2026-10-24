// Desert ground: dry sand country with no trees, drawn in dune colours, where towns build in the arid style.
import type { World } from './world';

/** Whether a tile is desert. Worlds with no desert layer have none. */
export function isDesert(world: World, x: number, y: number): boolean {
  const d = world.desert;
  if (!d || y < 0 || y >= world.height) return false;
  return d.charCodeAt(y * world.width + ((((x % world.width) + world.width) % world.width))) === 100;
}
