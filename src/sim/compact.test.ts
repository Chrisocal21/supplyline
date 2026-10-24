import { describe, expect, it } from 'vitest';
import map3 from '../maps/map3.json';
import { baseNeeded, compactWorld, expandWorld, MapChanged, registerBase } from './compact';
import { createWorldFromMap, step, type MapData, type World } from './world';
import { packSave, unpackSave } from './saveio';

describe('compact saves', () => {
  const world = createWorldFromMap(map3 as unknown as MapData);
  for (let i = 0; i < 20; i++) step(world);

  it('a big world packs small and reads back the same', () => {
    const full = JSON.stringify(world);
    const packed = JSON.stringify(compactWorld(world));
    expect(packed.length).toBeLessThan(full.length / 2);
    const back = expandWorld(JSON.parse(packed) as World);
    expect(back.terrain).toEqual(world.terrain);
    expect(back.elev).toEqual(world.elev);
    expect(back.regionMap).toEqual(world.regionMap);
    expect(back.sites.length).toBe(world.sites.length);
    expect(world.desert?.length).toBe(world.width * world.height);
    expect(back.desert).toBe(world.desert);
  });

  it('does not change the world it packs', () => {
    compactWorld(world);
    expect(Array.isArray(world.terrain)).toBe(true);
  });

  it('save files round trip', () => {
    const out = unpackSave(packSave(world));
    expect('world' in out && out.world.terrain.length).toBe(world.width * world.height);
  });

  it('a made map is saved as a difference from the map, and keeps what the player changed', { timeout: 120000 }, () => {
    const w = createWorldFromMap(map3 as unknown as MapData);
    const i = w.terrain.findIndex((t) => t === 'forest');
    w.terrain[i] = 'grass';
    const lean = JSON.stringify(compactWorld(w));
    expect(lean.length).toBeLessThan(JSON.stringify(compactWorld(w, false)).length * 0.7);
    expect(baseNeeded(lean)).toBeNull();
    const back = expandWorld(JSON.parse(lean) as World);
    expect(back.terrain[i]).toBe('grass');
    expect(back.terrain.length).toBe(w.terrain.length);
    expect(back.elev).toEqual(w.elev);
    expect(back.mapId).toBe('map3');
  });

  it('a save made on an older edit of the map is refused, not misread', { timeout: 120000 }, () => {
    const w = createWorldFromMap(map3 as unknown as MapData);
    const lean = JSON.stringify(compactWorld(w));
    registerBase({ ...(map3 as unknown as { id: string; terrain: string[]; elev: string[] }), rev: 99 });
    expect(() => expandWorld(JSON.parse(lean) as World)).toThrow(MapChanged);
    registerBase(map3 as unknown as { id: string; terrain: string[]; elev: string[] });
  });

  it('a game saved the old way and one saved the new way both keep playing', { timeout: 120000 }, () => {
    const w = createWorldFromMap(map3 as unknown as MapData);
    for (let i = 0; i < 50; i++) step(w);
    for (const lean of [false, true]) {
      const back = expandWorld(JSON.parse(JSON.stringify(compactWorld(w, lean))) as World);
      expect(back.tick).toBe(w.tick);
      for (let i = 0; i < 50; i++) step(back);
      expect(back.tick).toBe(w.tick + 50);
    }
  });
});
