// The claim map agrees with the placement rules: whatever it says is held permanently, placement refuses, and whatever
// placement allows, it says is not held.
import { describe, expect, it } from 'vitest';
import { blockedBy, claimAt, isPermanent } from './claims';
import { SITE_DEFS, type SiteKind } from './defs';
import { createWorld, placeError, placeSite, siteTiles, wrapX } from './world';

const PLAIN = (Object.keys(SITE_DEFS) as SiteKind[]).filter((k) => {
  const d = SITE_DEFS[k];
  return !d.node && !d.inTown && !d.airport && !d.port && !d.railyard && !d.dock && !d.station;
});

describe('claim map', () => {
  it('names what is on a tile, and refuses plain buildings wherever the claim is permanent', () => {
    expect(PLAIN.length).toBeGreaterThan(0);
    const w = createWorld(6);
    w.tier = 25;
    w.money = 1e9;
    const kind = PLAIN[0];
    const seen: Record<string, number> = {};
    for (let y = 3; y < w.height - 3; y++) {
      for (let x = 0; x < w.width; x++) {
        const c = claimAt(w, x, y);
        seen[c] = (seen[c] ?? 0) + 1;
        const err = placeError(w, kind, x, y);
        if (isPermanent(c)) expect(err, `${c} at ${x},${y} accepted a ${kind}`).not.toBeNull();
        // Whatever is allowed is on ground the map calls open, a route, a resource... never held.
        if (err === null) expect(isPermanent(c), `${kind} allowed on ${c} at ${x},${y}`).toBe(false);
      }
    }
    // The map tells the world's layers apart.
    for (const c of ['water', 'mountain', 'street', 'town', 'node', 'free']) expect(seen[c] ?? 0, c).toBeGreaterThan(0);
  });

  it('keeps a building where it was put: its tiles read as a building, and blockedBy names the stop', () => {
    const w = createWorld(6);
    w.tier = 25;
    w.money = 1e9;
    const kind = PLAIN[0];
    let site = null;
    for (let y = 3; y < w.height - 3 && !site; y++) {
      for (let x = 0; x < w.width && !site; x++) {
        if (placeError(w, kind, x, y) === null && placeSite(w, kind, x, y) === null) site = w.sites[w.sites.length - 1];
      }
    }
    expect(site).not.toBeNull();
    for (const t of siteTiles(w, site!)) expect(claimAt(w, wrapX(w, t.x), t.y)).toBe('building');
    expect(blockedBy(w, siteTiles(w, site!))).toBe('building');
  });
});
