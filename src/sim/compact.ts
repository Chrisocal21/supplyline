// Compact saves: a big world's ground is three long lists (terrain names, heights, region numbers) that would fill a save.
// Written out as short strings they take a sixth of the room, and read back into the lists the game uses.
import type { Terrain } from './defs';
import type { World } from './world';

const CODE: Record<Terrain, string> = { water: '~', grass: '.', forest: 'f', mountain: '^', ice: '*' };
const NAME: Record<string, Terrain> = { '~': 'water', '.': 'grass', f: 'forest', '^': 'mountain', '*': 'ice' };

/** Worlds smaller than this many tiles are saved as they are. */
const BIG = 100_000;

/** A copy of the world, ready for JSON, with the ground lists packed when the world is big. The world itself is not changed. */
export function compactWorld(world: World): unknown {
  if (world.width * world.height < BIG || typeof world.terrain === 'string') return world;
  if (!world.elev.every((e) => Number.isInteger(e) && e >= 0 && e <= 255) || !world.regionMap.every((r) => Number.isInteger(r) && r >= 0)) return world;
  let terrain = '';
  for (const t of world.terrain) terrain += CODE[t];
  let elev = '';
  for (const e of world.elev) elev += (e < 16 ? '0' : '') + e.toString(16);
  const runs: string[] = [];
  let at = 0;
  while (at < world.regionMap.length) {
    let n = 1;
    while (at + n < world.regionMap.length && world.regionMap[at + n] === world.regionMap[at]) n++;
    runs.push(`${world.regionMap[at]}*${n}`);
    at += n;
  }
  return { ...world, terrain, elev, regionMap: runs.join(',') };
}

/** Turn a parsed save's packed ground back into lists, in place. A save that is not packed is left alone. */
export function expandWorld<T extends { terrain: unknown; elev: unknown; regionMap: unknown }>(w: T): T {
  const o = w as unknown as { terrain: unknown; elev: unknown; regionMap: unknown };
  if (typeof o.terrain !== 'string') return w;
  const terrain: Terrain[] = [];
  for (const c of o.terrain) terrain.push(NAME[c] ?? 'grass');
  const hex = o.elev as string;
  const elev: number[] = [];
  for (let i = 0; i < hex.length; i += 2) elev.push(parseInt(hex.slice(i, i + 2), 16));
  const regionMap: number[] = [];
  for (const run of (o.regionMap as string).split(',')) {
    const [id, n] = run.split('*').map(Number);
    for (let k = 0; k < n; k++) regionMap.push(id);
  }
  o.terrain = terrain;
  o.elev = elev;
  o.regionMap = regionMap;
  return w;
}
