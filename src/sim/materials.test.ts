// New buildings in a built town wait for materials from its Supply Yard store.
import { describe, expect, it } from 'vitest';
import { SITE_DEFS, buildMaterials, upgradeMaterials, type SiteKind } from './defs';
import { createWorld, depotLeft, materialsHere, placeSite, step, upgradeSite, wants } from './world';

describe('building materials', () => {
  const kinds = (Object.keys(SITE_DEFS) as SiteKind[]).filter((k) => SITE_DEFS[k].tier >= 1 && !SITE_DEFS[k].dock && !SITE_DEFS[k].station);

  it('asks nothing of Tier 0 buildings and grows heavier with the tiers', () => {
    expect(buildMaterials('forestry')).toEqual({});
    const t1 = kinds.find((k) => SITE_DEFS[k].tier >= 1 && SITE_DEFS[k].tier <= 3 && Object.keys(buildMaterials(k)).length > 0)!;
    expect(Object.keys(buildMaterials(t1))).toEqual(['lumber']);
    const high = kinds.find((k) => SITE_DEFS[k].tier >= 23);
    if (high) expect(buildMaterials(high).steel).toBeGreaterThan(0);
  });

  it('keeps a building waiting until the yard has the materials, then lets it run', () => {
    const w = createWorld(5);
    w.tier = 25;
    w.money = 1e6;
    const p = w.places[0];
    p.stage = 2;
    const yard = w.sites.find((s) => s.placeId === p.id && SITE_DEFS[s.kind].dock === 'freight')!;
    const kind = kinds.find((k) => SITE_DEFS[k].tier >= 1 && SITE_DEFS[k].tier <= 3 && SITE_DEFS[k].inTown && !SITE_DEFS[k].dock && Object.keys(buildMaterials(k)).length > 0)!;
    let spot: { x: number; y: number } | null = null;
    for (let dy = -12; dy <= 12 && !spot; dy++) for (let dx = -12; dx <= 12 && !spot; dx++) {
      const x = p.x + dx, y = p.y + dy;
      if (Object.keys(materialsHere(w, kind, x, y)).length > 0 && placeSite(w, kind, x, y) === null) spot = { x, y };
    }
    expect(spot).not.toBeNull();
    const site = w.sites[w.sites.length - 1];
    expect(site.pending?.lumber).toBeGreaterThan(0);
    // The yard now asks for what the new building needs.
    expect(depotLeft(p, yard, 'lumber', w)).toBeGreaterThan(0);
    expect(wants(w, yard)).toContain('lumber');
    const need = site.pending!.lumber!;
    yard.depot = { lumber: need };
    for (let i = 0; i < 30; i++) step(w);
    expect(site.pending).toBeUndefined();
    expect(yard.depot.lumber ?? 0).toBe(0);
  });
});

describe('what makes a material is not made to wait for it', () => {
  it('lets the Sawmill be built without lumber', () => {
    expect(buildMaterials('sawmill').lumber).toBeUndefined();
  });
});

describe('upgrades and levels', () => {
  it('asks for a different mix at every level, and every tier', () => {
    const seen = new Set<string>();
    for (let l = 2; l <= 8; l++) seen.add(Object.keys(upgradeMaterials('bakery', l)).sort().join('+'));
    expect(seen.size).toBe(7);
    const tiers = new Set<string>();
    for (const k of Object.keys(SITE_DEFS) as SiteKind[]) {
      const t = SITE_DEFS[k].tier;
      if (t >= 1 && !SITE_DEFS[k].dock && !SITE_DEFS[k].station && !SITE_DEFS[k].recipe) tiers.add(t + ':' + Object.keys(buildMaterials(k)).sort().join('+'));
    }
    expect(new Set([...tiers].map((s) => s.split(':')[1])).size).toBeGreaterThanOrEqual(3);
  });

  it('keeps the old level working while an upgrade waits for its materials', () => {
    const w = createWorld(5);
    w.tier = 25;
    w.money = 1e6;
    w.earned = 1e9;
    const p = w.places[0];
    p.stage = 2;
    const yard = w.sites.find((s) => s.placeId === p.id && SITE_DEFS[s.kind].dock === 'freight')!;
    const before = w.sites.length;
    for (let r = 3; r <= 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (w.sites.length === before) placeSite(w, 'bakery', p.x + dx, p.y + dy);
    expect(w.sites.length).toBe(before + 1);
    const site = w.sites[w.sites.length - 1];
    expect(SITE_DEFS[site.kind].dock).toBeUndefined();
    delete site.pending;
    expect(upgradeSite(w, site.id)).toBeNull();
    expect(site.upgrade).toBeDefined();
    if (!site.upgrade) return;
    expect(site.level).toBe(1);
    yard.depot = { ...site.upgrade.need };
    for (let i = 0; i < 30; i++) step(w);
    expect(site.level).toBe(2);
    expect(site.upgrade).toBeUndefined();
  });
});
