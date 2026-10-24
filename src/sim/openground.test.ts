import { describe, expect, it } from 'vitest';
import { createWorld } from './world';
import { SITE_DEFS, type SiteKind } from './defs';
import { needsNode } from './world';
import { placeError } from './world';

describe('open ground', () => {
  it('every site that needs no node can go somewhere on open ground', () => {
    const w = createWorld(12345);
    w.tier = 9;
    w.money = 1e9;
    const kinds = (Object.keys(SITE_DEFS) as SiteKind[]).filter((k) => {
      const d = SITE_DEFS[k];
      return !d.dock && !d.station && !needsNode(d) && !d.airport && !d.port && !d.harbor && !d.railyard;
    });
    expect(kinds.length).toBeGreaterThan(60);
    const bad: string[] = [];
    for (const k of kinds) {
      let ok = false;
      for (let i = 0; i < w.width * w.height && !ok; i += 3) if (placeError(w, k, i % w.width, Math.floor(i / w.width)) === null) ok = true;
      if (!ok) bad.push(k);
    }
    expect(bad).toEqual([]);
  });
});
