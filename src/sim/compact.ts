// Compact saves: a big world's ground is three long lists (terrain names, heights, region numbers) that would fill a save.
// Written out as short strings they take a sixth of the room, and read back into the lists the game uses.
import type { Terrain } from './defs';
import type { World } from './world';

/** The fixed ground of a hand-made map, kept so a save of a big map can hold only what the player changed. */
export interface BaseMap {
  id: string;
  rev?: number;
  terrain: string[];
  elev: string[];
}

const bases = new Map<string, { rev: number; terrain: string; elev: string }>();

/** Remember a map's ground. A world made from a map does this itself. */
export function registerBase(map: BaseMap): void {
  bases.set(map.id, { rev: map.rev ?? 1, terrain: map.terrain.join(''), elev: map.elev.join('') });
}

/** The map a saved game was made on, when the save holds only a difference from it. Read from the raw text, so it is cheap. */
export function baseNeeded(raw: string | null): string | null {
  if (!raw) return null;
  const m = /"ground":\{"map":"([a-z0-9]+)"/.exec(raw);
  return m && !bases.has(m[1]) ? m[1] : null;
}

/** A save that leans on a map (a made map's ground) when it has been changed since: a rev that no longer matches cannot be read. */
export class MapChanged extends Error {}

const CODE: Record<Terrain, string> = { water: '~', grass: '.', forest: 'f', mountain: '^', ice: '*' };
const NAME: Record<string, Terrain> = { '~': 'water', '.': 'grass', f: 'forest', '^': 'mountain', '*': 'ice' };

/** Worlds smaller than this many tiles are saved as they are. */
const BIG = 100_000;

/** A copy of the world, ready for JSON, with the ground lists packed when the world is big. The world itself is not changed. */
export function compactWorld(world: World, leanOnMap = true): unknown {
  if (world.width * world.height < BIG || typeof world.terrain === 'string') return world;
  if (!world.elev.every((e) => Number.isInteger(e) && e >= 0 && e <= 255) || !world.regionMap.every((r) => Number.isInteger(r) && r >= 0)) return world;
  const base = leanOnMap && world.mapId ? bases.get(world.mapId) : undefined;
  let terrain = '';
  let elev = '';
  let ground: unknown;
  if (base && base.terrain.length === world.terrain.length && base.elev.length === world.elev.length * 2) {
    // Only the tiles that differ from the map are written: cleared forest, say. Nearly always a few hundred.
    const t: string[] = [];
    for (let i = 0; i < world.terrain.length; i++) if (CODE[world.terrain[i]] !== base.terrain[i]) t.push(`${i}:${CODE[world.terrain[i]]}`);
    const e: string[] = [];
    for (let i = 0; i < world.elev.length; i++) {
      const hex = (world.elev[i] < 16 ? '0' : '') + world.elev[i].toString(16);
      if (hex !== base.elev.slice(i * 2, i * 2 + 2)) e.push(`${i}:${world.elev[i]}`);
    }
    ground = { map: world.mapId, rev: base.rev, t: t.join(','), e: e.join(',') };
  } else {
    for (const t of world.terrain) terrain += CODE[t];
    for (const v of world.elev) elev += (v < 16 ? '0' : '') + v.toString(16);
  }
  const runs: string[] = [];
  let at = 0;
  while (at < world.regionMap.length) {
    let n = 1;
    while (at + n < world.regionMap.length && world.regionMap[at + n] === world.regionMap[at]) n++;
    runs.push(`${world.regionMap[at]}*${n}`);
    at += n;
  }
  // The desert layer is long runs of one letter: write each run once.
  let desert = world.desert;
  if (typeof desert === 'string' && !desert.includes('*')) desert = desert.replace(/(.)\1*/g, (m) => `${m[0]}*${m.length},`);
  return ground ? { ...world, terrain: '', elev: '', ground, regionMap: runs.join(','), desert } : { ...world, terrain, elev, regionMap: runs.join(','), desert };
}

/** Turn a parsed save's packed ground back into lists, in place. A save that is not packed is left alone. */
export function expandWorld<T extends { terrain: unknown; elev: unknown; regionMap: unknown }>(w: T): T {
  const o = w as unknown as { terrain: unknown; elev: unknown; regionMap: unknown };
  if (typeof o.terrain !== 'string') return w;
  const terrain: Terrain[] = [];
  const elev: number[] = [];
  const ground = (w as unknown as { ground?: { map: string; rev: number; t: string; e: string } }).ground;
  if (ground) {
    const base = bases.get(ground.map);
    if (!base) throw new MapChanged(`map ${ground.map} is not loaded`);
    if (base.rev !== ground.rev) throw new MapChanged(`map ${ground.map} changed since this save`);
    for (const c of base.terrain) terrain.push(NAME[c] ?? 'grass');
    for (let i = 0; i < base.elev.length; i += 2) elev.push(parseInt(base.elev.slice(i, i + 2), 16));
    for (const d of ground.t.split(',')) if (d) terrain[+d.slice(0, d.indexOf(':'))] = NAME[d.slice(d.indexOf(':') + 1)] ?? 'grass';
    for (const d of ground.e.split(',')) if (d) elev[+d.slice(0, d.indexOf(':'))] = +d.slice(d.indexOf(':') + 1);
    delete (w as unknown as { ground?: unknown }).ground;
  } else {
    for (const c of o.terrain as string) terrain.push(NAME[c] ?? 'grass');
    const hex = o.elev as string;
    for (let i = 0; i < hex.length; i += 2) elev.push(parseInt(hex.slice(i, i + 2), 16));
  }
  const regionMap: number[] = [];
  for (const run of (o.regionMap as string).split(',')) {
    const [id, n] = run.split('*').map(Number);
    for (let k = 0; k < n; k++) regionMap.push(id);
  }
  const dz = (w as unknown as { desert?: string }).desert;
  if (typeof dz === 'string' && dz.includes('*')) (w as unknown as { desert: string }).desert = dz.split(',').filter(Boolean).map((r) => r[0].repeat(Number(r.slice(2)))).join('');
  o.terrain = terrain;
  o.elev = elev;
  o.regionMap = regionMap;
  return w;
}
