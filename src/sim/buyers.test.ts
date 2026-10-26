import { describe, expect, it } from 'vitest';
import { buyersOf } from './buyers';
import { GOODS, GOOD_LIST, SITE_DEFS, type Good } from './defs';

/** The lowest town level a player can have when a tier first opens: tier 2 opens with a level 4 town, tier 3 and up with level 5. */
const LEVEL_AT_TIER = [1, 1, 4, 5, 5];

describe('every good has somewhere to sell', () => {
  it('each made good has a building that pays full price for it', () => {
    const none = GOOD_LIST.filter((g) => GOODS[g].kind !== 'byproduct').filter((g) => buyersOf(g).every((b) => b.salvage));
    expect(none).toEqual([]);
  });
  it('every good, by-products too, can at least be sold off at a Market', () => {
    for (const g of GOOD_LIST) expect(buyersOf(g).length, g).toBeGreaterThan(0);
  });
  it('a building is never open before something pays full price for what it makes (by-products sell for salvage)', () => {
    const stuck: string[] = [];
    for (const [k, d] of Object.entries(SITE_DEFS)) {
      const def = d as { tier: number; produce?: { good: Good; also?: { good: Good }[] }; recipe?: { outputs: Partial<Record<Good, number>> } };
      const outs: Good[] = [...(def.produce ? [def.produce.good, ...(def.produce.also ?? []).map((x) => x.good)] : []), ...(def.recipe ? (Object.keys(def.recipe.outputs) as Good[]) : [])];
      for (const g of outs) {
        if (GOODS[g].kind === 'byproduct') continue;
        if (!buyersOf(g).some((b) => !b.salvage && b.level <= LEVEL_AT_TIER[Math.min(4, def.tier)])) stuck.push(`${k} (tier ${def.tier}) makes ${g}`);
      }
    }
    expect(stuck).toEqual([]);
  });
});
