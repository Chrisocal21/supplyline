// Towns that have grown into each other stay two towns, but share growth and variety, and the smaller catches up.
import { describe, expect, it } from 'vitest';
import { createWorld, growthKinds, metroBonus, partnerOf, sell, type World } from './world';

function joinedWorld(): World {
  for (let seed = 1; seed < 40; seed++) {
    const w = createWorld(seed, 288, 96);
    if (w.places.some((p) => p.partnerId)) return w;
  }
  throw new Error('no joined pair found');
}

describe('joined towns', () => {
  it('pair up both ways, each with one partner at most, and keep their own markets', () => {
    const w = joinedWorld();
    for (const p of w.places) {
      const q = partnerOf(w, p);
      if (!q) continue;
      expect(q.partnerId).toBe(p.id);
      expect(q.id).not.toBe(p.id);
      expect(w.sites.some((s) => s.placeId === p.id && s.kind === 'market')).toBe(true);
      expect(w.sites.some((s) => s.placeId === q.id && s.kind === 'market')).toBe(true);
    }
    expect(w.blend).toBe(true);
  });

  it('share what is sold: growth goes to both, the smaller catches up faster, variety counts for both', () => {
    const w = joinedWorld();
    const a = w.places.find((p) => p.partnerId)!;
    const b = partnerOf(w, a)!;
    a.level = 3;
    b.level = 1;
    const dockA = w.sites.find((s) => s.placeId === a.id && s.kind === 'market')!;
    const dockB = w.sites.find((s) => s.placeId === b.id && s.kind === 'market')!;
    const before = { a: a.growth, b: b.growth };
    sell(w, dockA, 'lumber', 20);
    const gainA = a.growth - before.a;
    const gainB = b.growth - before.b;
    expect(gainA).toBeGreaterThan(0);
    expect(gainB).toBeGreaterThan(0);
    // The one two levels behind gets more than the bare share of what the bigger earned.
    expect(gainB / gainA).toBeGreaterThan(0.2 + 0.1);
    expect(b.delivered.lumber ?? 0).toBe(0);
    expect(growthKinds(b)).toBe(1);
    expect(growthKinds(a)).toBe(1);
    // And back the other way: what the smaller is sold counts for the bigger, at a smaller share.
    const beforeA = a.growth;
    sell(w, dockB, 'bread', 20);
    expect(a.growth).toBeGreaterThan(beforeA);
    expect(growthKinds(a)).toBe(2);
  });

  it('become a metro area when both are towns of level 3 or more', () => {
    const w = joinedWorld();
    const a = w.places.find((p) => p.partnerId)!;
    const b = partnerOf(w, a)!;
    a.level = 2;
    b.level = 4;
    expect(metroBonus(w, a)).toBe(1);
    a.level = 3;
    expect(metroBonus(w, a)).toBeGreaterThan(1);
    expect(metroBonus(w, b)).toBeGreaterThan(1);
  });

  it('are left alone in a world that is not blended (an old save)', () => {
    const w = joinedWorld();
    for (const p of w.places) delete p.partnerId;
    for (const p of w.places) expect(partnerOf(w, p)).toBeUndefined();
  });
});
