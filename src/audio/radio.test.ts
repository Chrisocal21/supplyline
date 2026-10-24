import { describe, expect, it } from 'vitest';
import { GROOVES, STATIONS } from './radio';

describe('radio stations', () => {
  it('every groove station has sixteen-step patterns and a chord for each root', () => {
    for (const [id, g] of Object.entries(GROOVES)) {
      for (const key of ['kick', 'snare', 'hat', 'clap', 'bass', 'arp', 'stab'] as const) {
        const p = g[key];
        if (p !== undefined) expect({ id, key, len: p.length }).toEqual({ id, key, len: 16 });
      }
      expect({ id, same: g.chords.length === g.roots.length }).toEqual({ id, same: true });
    }
  });

  it('has a generator for every listed station and no duplicate ids', () => {
    const ids = STATIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(['lofi', 'rain', 'drive', 'drift', ...Object.keys(GROOVES)]).toContain(id);
    expect(ids.length).toBeGreaterThanOrEqual(34);
  });
});
