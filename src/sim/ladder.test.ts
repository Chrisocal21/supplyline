import { describe, expect, it } from 'vitest';
import { SITE_DEFS, VEHICLE_DEFS, type Good, type SiteKind, type VehicleKind } from './defs';
import { LADDER, ladderTier } from './ladder';

// Town-made buildings are not on the ladder: the town builds them. The Rail Station comes with the Rail Yard.
const NOT_ON_LADDER: string[] = ['market', 'freight', 'district', 'station'];

describe('unlock ladder', () => {
  const sites = Object.keys(SITE_DEFS) as SiteKind[];
  const vehicles = Object.keys(VEHICLE_DEFS) as VehicleKind[];

  it('has tiers 0 to 25 in order', () => {
    expect(LADDER.map((s) => s.tier)).toEqual(Array.from({ length: 26 }, (_, i) => i));
  });

  it('lists every building and vehicle exactly once', () => {
    const listed = LADDER.flatMap((s) => [...s.sites, ...s.vehicles]) as string[];
    const dupes = listed.filter((id, i) => listed.indexOf(id) !== i);
    const missing = [...sites.filter((k) => !NOT_ON_LADDER.includes(k)), ...vehicles].filter((id) => !listed.includes(id));
    const unknown = listed.filter((id) => !(sites as string[]).includes(id) && !(vehicles as string[]).includes(id));
    expect({ dupes, missing, unknown }).toEqual({ dupes: [], missing: [], unknown: [] });
  });

  it('opens three or four things a tier (the last may open fewer)', () => {
    for (const s of LADDER) {
      const n = s.sites.length + s.vehicles.length;
      if (s.tier === LADDER.length - 1) expect(n, `tier ${s.tier}`).toBeLessThanOrEqual(4);
      else {
        expect(n, `tier ${s.tier} ${s.name}`).toBeGreaterThanOrEqual(3);
        expect(n, `tier ${s.tier} ${s.name}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('opens every building after the buildings that make its inputs', () => {
    const makers = new Map<Good, number>();
    for (const s of LADDER) {
      for (const kind of s.sites) {
        const d = SITE_DEFS[kind];
        const outs: Good[] = [];
        if (d.produce) outs.push(d.produce.good, ...(d.produce.also ?? []).map((a) => a.good));
        if (d.recipe) outs.push(...(Object.keys(d.recipe.outputs) as Good[]));
        for (const g of outs) if (!makers.has(g) || makers.get(g)! > s.tier) makers.set(g, s.tier);
      }
    }
    const late: string[] = [];
    for (const s of LADDER) {
      for (const kind of s.sites) {
        const d = SITE_DEFS[kind];
        if (!d.recipe) continue;
        for (const g of Object.keys(d.recipe.inputs) as Good[]) {
          const first = makers.get(g);
          if (first === undefined || first > s.tier) late.push(`${kind} (tier ${s.tier}) needs ${g} (first made at ${first ?? 'never'})`);
        }
      }
    }
    expect(late).toEqual([]);
  });

  it('opens vehicles after the building their route needs', () => {
    const tierOf = (kind: SiteKind): number => ladderTier(kind) ?? 99;
    const bad: string[] = [];
    for (const s of LADDER) {
      for (const v of s.vehicles) {
        const mode = VEHICLE_DEFS[v].mode;
        const need: SiteKind | null = v === 'fishboat' ? 'harbor' : mode === 'rail' ? 'railyard' : mode === 'air' ? 'airport' : mode === 'sea' ? 'port' : null;
        if (need && tierOf(need) > s.tier) bad.push(`${v} (tier ${s.tier}) needs ${need} (tier ${tierOf(need)})`);
      }
    }
    expect(bad).toEqual([]);
  });
});
