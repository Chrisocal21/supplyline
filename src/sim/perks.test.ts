// Company skills.
import { describe, expect, it } from 'vitest';
import { PERK_MAX, buyPerk, perkError, pointsLeft, saleMult, skillPoints, upkeepMult, wearMult } from './perks';
import type { Terrain } from './defs';
import { createBlankWorld } from './world';

describe('company skills', () => {
  it('earn points from tiers and quests, and spend them a level at a time', () => {
    const w = createBlankWorld(20, 10, new Array<Terrain>(200).fill('grass'));
    w.tier = 2;
    w.questsDone = ['a', 'b', 'c', 'd'];
    expect(skillPoints(w)).toBe(3);
    expect(buyPerk(w, 'haggler')).toBeNull();
    expect(buyPerk(w, 'haggler')).toBeNull();
    expect(saleMult(w)).toBeCloseTo(1.08);
    expect(pointsLeft(w)).toBe(1);
    expect(buyPerk(w, 'thrift')).toBeNull();
    expect(upkeepMult(w)).toBeCloseTo(0.85);
    expect(buyPerk(w, 'tough')).not.toBeNull();
    expect(wearMult(w)).toBe(1);
  });

  it('stop at the top level', () => {
    const w = createBlankWorld(20, 10, new Array<Terrain>(200).fill('grass'));
    w.tier = 25;
    for (let i = 0; i < PERK_MAX; i++) expect(buyPerk(w, 'tough')).toBeNull();
    expect(perkError(w, 'tough')).toBe('Fully trained');
  });
});
