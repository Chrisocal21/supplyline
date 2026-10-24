import { describe, expect, it } from 'vitest';
import { catalog, catalogGaps } from './catalog';
import { GOOD_LIST } from './defs';
import { GROUPS, PLANNED } from './planned';

describe('goods catalogue', () => {
  it('lists every game good once', () => {
    expect(catalog().filter((e) => !e.planned).map((e) => e.id).sort()).toEqual([...GOOD_LIST].sort());
  });
  it('planned goods are new, named once, and built from goods that exist', () => {
    const ids = PLANNED.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    const known = new Set<string>([...GOOD_LIST, ...ids]);
    for (const g of PLANNED) {
      expect(GOOD_LIST as string[]).not.toContain(g.id);
      for (const f of g.from) expect(known.has(f), `${g.id} needs ${f}`).toBe(true);
    }
  });
  it('every good is in at least one group', () => {
    const ok = new Set(GROUPS.map((g) => g.id));
    for (const e of catalog()) {
      expect(e.groups.length, e.id).toBeGreaterThan(0);
      for (const g of e.groups) expect(ok.has(g)).toBe(true);
    }
  });
  it('every good has a maker and a use, so no chain is cut', () => {
    expect(catalogGaps()).toEqual({ noMaker: [], noUse: [] });
  });
  it('raw goods come from the ground and made goods take inputs', () => {
    for (const e of catalog()) if (e.kind === 'raw') expect(e.depth).toBe(0);
  });
});
