// Seasons for crop sites.
import { describe, expect, it } from 'vitest';
import { SEASON_TICKS, seasonMult, seasonOf } from './seasons';

describe('seasons', () => {
  it('turn through the year, and only crop sites follow them', () => {
    expect(seasonOf(0).id).toBe('summer');
    expect(seasonOf(SEASON_TICKS).id).toBe('autumn');
    expect(seasonOf(SEASON_TICKS * 4).id).toBe('summer');
    expect(seasonMult('farm', SEASON_TICKS)).toBeGreaterThan(1);
    expect(seasonMult('farm', SEASON_TICKS * 2)).toBeLessThan(1);
    expect(seasonMult('sawmill', SEASON_TICKS)).toBe(1);
  });
});
