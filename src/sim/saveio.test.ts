import { describe, expect, it } from 'vitest';
import { packSave, saveFileName, unpackSave } from './saveio';
import { createWorld } from './world';

describe('save files', () => {
  it('round-trips a world through a file', () => {
    const w = createWorld(7);
    w.money = 4242;
    const back = unpackSave(packSave(w));
    expect('world' in back).toBe(true);
    if ('world' in back) {
      expect(back.world.money).toBe(4242);
      expect(back.world.sites.length).toBe(w.sites.length);
      expect(back.world.terrain.length).toBe(w.terrain.length);
    }
    expect(saveFileName(w)).toMatch(/^supplyline-.+-tier\d-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('accepts a bare world and refuses anything else', () => {
    const w = createWorld(7);
    expect('world' in unpackSave(JSON.stringify(w))).toBe(true);
    expect('error' in unpackSave('not json')).toBe(true);
    expect('error' in unpackSave('{"hello":1}')).toBe(true);
    expect('error' in unpackSave(JSON.stringify({ ...w, version: 3 }))).toBe(true);
    expect('error' in unpackSave(JSON.stringify({ ...w, terrain: [] }))).toBe(true);
  });
});
