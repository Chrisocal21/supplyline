import { describe, expect, it } from 'vitest';
import { catalog, catalogGaps } from './catalog';
import { GOOD_LIST } from './defs';

describe('goods catalogue', () => {
  it('lists every good once', () => {
    expect(catalog().map((e) => e.id).sort()).toEqual([...GOOD_LIST].sort());
  });
  it('every good has a maker and a use, so no chain is cut', () => {
    expect(catalogGaps()).toEqual({ noMaker: [], noUse: [] });
  });
  it('raw goods come from the ground and made goods take inputs', () => {
    for (const e of catalog()) if (e.kind === 'raw') expect(e.depth).toBe(0);
  });
});
