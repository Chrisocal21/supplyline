// Saves as files: pack a world into text the player can keep anywhere, and read one back safely.
import { VERSION } from '../version';
import { compactWorld, expandWorld } from './compact';
import type { World } from './world';

const MARK = 'supplyline-save';

/** The text of a save file: the world, with a label so a wrong file is caught. */
export function packSave(world: World): string {
  return JSON.stringify({ game: MARK, format: 1, build: VERSION, exportedAt: new Date().toISOString(), world: compactWorld(world) });
}

/** A file name like supplyline-birchridge-tier2-2026-10-17.json. */
export function saveFileName(world: World): string {
  const town = (world.places[0]?.name ?? 'world').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'world';
  return `supplyline-${town}-tier${world.tier}-${new Date().toISOString().slice(0, 10)}.json`;
}

/** Read a save file's text. Returns the world, or why it cannot be used. Accepts a bare world too, for saves copied by hand. */
export function unpackSave(text: string): { world: World } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'That file is not a save: it could not be read.' };
  }
  const obj = data as { game?: unknown; world?: unknown };
  const w = (obj && obj.game === MARK ? obj.world : data) as Partial<World> | null;
  if (!w || typeof w !== 'object') return { error: 'That file is not a Supplyline save.' };
  if (w.version !== 4) return { error: 'That save is from a different version of the game.' };
  if (typeof w.terrain === 'string') expandWorld(w as unknown as { terrain: unknown; elev: unknown; regionMap: unknown });
  if (w.realisticLots !== undefined && typeof w.realisticLots !== 'boolean') return { error: 'That save has an invalid town layout setting.' };
  if (!Array.isArray(w.terrain) || !Array.isArray(w.sites) || !Array.isArray(w.places) || !Array.isArray(w.routes) || !Array.isArray(w.vehicles) || typeof w.width !== 'number' || typeof w.height !== 'number') {
    return { error: 'That save is missing parts of the world.' };
  }
  if (w.terrain.length !== w.width * w.height) return { error: 'That save has a damaged map.' };
  return { world: w as World };
}
