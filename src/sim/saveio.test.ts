import { describe, expect, it } from 'vitest';
import { packSave, saveFileName, unpackSave } from './saveio';
import { buyVehicle, createWorld, placeSite, step } from './world';

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

  it('an older save keeps playing: missing newer fields, a farm that still points at a field node, goods it never heard of', () => {
    const w = createWorld(7);
    w.money = 1e6;
    w.tier = 3;
    const farmNode = w.nodes.find((n) => n.kind === 'farmland')!;
    expect(placeSite(w, 'farm', farmNode.x, farmNode.y)).toBeNull();
    const farm = w.sites.find((x) => x.kind === 'farm')!;
    expect(buyVehicle(w, farm.id, 'boxtruck')).toBeNull();
    for (let i = 0; i < 600; i++) step(w);
    const old = JSON.parse(JSON.stringify(w)) as typeof w;
    // What an older build never wrote.
    for (const v of old.vehicles) delete (v as { busy?: number }).busy;
    delete (old as { upkeep?: number }).upkeep;
    farm.nodeId = farmNode.id;
    const back = unpackSave(JSON.stringify(old));
    expect('world' in back).toBe(true);
    if ('world' in back) {
      for (let i = 0; i < 1500; i++) step(back.world);
      expect(back.world.sites.length).toBe(old.sites.length);
      expect(Number.isFinite(back.world.money)).toBe(true);
    }
  });
});
