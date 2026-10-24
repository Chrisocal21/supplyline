import { describe, expect, it } from 'vitest';
import map3 from '../maps/map3.json';
import { compactWorld, expandWorld } from './compact';
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
});
