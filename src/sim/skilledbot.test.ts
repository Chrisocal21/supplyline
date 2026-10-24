import { describe, expect, it } from 'vitest';
import { playBot } from './bot';

// A careful scripted player (one home town at a time, trucks serviced, cash kept in reserve) must do well on the money side.
// If this fails, either the economy got harder or the bot broke: run PACING=1 npx vitest run src/sim/pacing.test.ts to see.
describe('skilled player', () => {
  it('opens the Market, reaches Tier 1 and earns a living within half an hour', () => {
    const r = playBot(11, 30 * 600, undefined, 'skilled');
    expect(r.tierAt[1]).toBeGreaterThan(0);
    expect(r.tierAt[1]).toBeLessThan(15 * 600);
    expect(r.world.earned).toBeGreaterThan(8000);
  }, 120000);
});
