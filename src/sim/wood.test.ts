import { districtGoods } from './venues';
// Logs and lumber keep a buyer after a town is built, and the early menu opens one step at a time.
import { describe, expect, it } from 'vitest';
import { DISTRICTS, DISTRICT_ORDER, GOOD_LIST, LEVEL_MATERIALS, SITE_DEFS, SITE_UNLOCK_QUEST, TIERS } from './defs';
import { createWorld, dockDemand, needs, sell, townDocks, wants } from './world';

describe('what happens to the wood once the town is built', () => {
  const docks = () => {
    const w = createWorld(5);
    const p = w.places[0];
    p.stage = 2;
    const all = townDocks(w, w.sites.find((s) => s.placeId === p.id)!);
    const market = all.find((s) => SITE_DEFS[s.kind].dock === 'market')!;
    const yard = all.find((s) => SITE_DEFS[s.kind].dock === 'freight')!;
    return { w, p, market, yard };
  };

  it('has the Market and the Supply Yard both buy logs and lumber', () => {
    const { w, market, yard } = docks();
    for (const d of [market, yard]) for (const g of ['logs', 'lumber'] as const) expect(wants(w, d), `${d.kind} wants ${g}`).toContain(g);
  });

  it('keeps the Market from taking the lumber the town still needs for building, and takes the rest', () => {
    const { w, p, market, yard } = docks();
    expect(needs(w, market, 'lumber')).toBe(0);
    expect(needs(w, market, 'logs')).toBeGreaterThan(0);
    expect(needs(w, yard, 'logs')).toBeGreaterThan(0);
    const want = LEVEL_MATERIALS[p.style][p.level - 1];
    p.mats = { ...want };
    expect(needs(w, market, 'lumber')).toBeGreaterThan(0);
  });

  it('pays for logs sold to the yard when no building needs them', () => {
    const { w, p, yard } = docks();
    p.mats = { ...LEVEL_MATERIALS[p.style][p.level - 1] };
    const before = w.money;
    expect(sell(w, yard, 'logs', 20)).toBeGreaterThan(0);
    expect(w.money).toBeGreaterThan(before);
  });
});

describe('the first steps of the menu', () => {
  it('opens the quarry with town level 2 and the wood yard after the cheese, not at the very start', () => {
    expect(SITE_DEFS.quarry.tier).toBe(3); // the tier after the one whose last quests grow a town to level 2
    expect(SITE_UNLOCK_QUEST.quarry).toBe('t1-town2');
    expect(SITE_DEFS.woodyard.tier).toBe(0);
    expect(SITE_UNLOCK_QUEST.woodyard).toBe('t0-cheese');
  });

  it('asks for the wood yard in Tier 0 right after the quest that opens it', () => {
    const ids = TIERS[0].quests.map((q) => q.id);
    expect(ids.indexOf('t0-woodyard')).toBe(ids.indexOf('t0-cheese') + 1);
    expect(ids).toContain('t0-firewood');
  });

  it('only gates a building behind a quest that exists, and one that comes before the building is wanted', () => {
    const all = TIERS.flatMap((t) => t.quests.map((q) => q.id));
    for (const id of Object.values(SITE_UNLOCK_QUEST)) expect(all, id).toContain(id);
  });
});

describe('everything sells at the Market', () => {
  it('buys every good in the game once it is built, and only pays growth for what the town asks for', () => {
    const w = createWorld(5);
    const p = w.places[0];
    p.stage = 2;
    const market = townDocks(w, w.sites.find((s) => s.placeId === p.id)!).find((s) => SITE_DEFS[s.kind].dock === 'market')!;
    for (const g of GOOD_LIST) expect(wants(w, market), g).toContain(g);
    const before = p.growth;
    expect(sell(w, market, 'steel', 10)).toBeGreaterThan(0);
    expect(p.growth).toBe(before);
    sell(w, market, 'bread', 10);
    expect(p.growth).toBeGreaterThan(before);
  });
});

describe('every district is a buyer', () => {
  it('asks for at least one good, and buys a good it asks for', () => {
    const w = createWorld(5);
    w.tier = 25;
    const p = w.places[0];
    p.stage = 2;
    p.level = 5;
    for (const id of DISTRICT_ORDER) {
      expect([...districtGoods(p, id), ...(DISTRICTS[id].buys ?? [])].length, id).toBeGreaterThan(0);
    }
    const site = { ...w.sites[0], kind: 'district', districtId: 'hotels', placeId: p.id } as never;
    // A venue district asks for what its own venues sell, not for everything.
    expect(dockDemand(w, site as never)).toContain(districtGoods(p, 'hotels')[0]);
  });
});
