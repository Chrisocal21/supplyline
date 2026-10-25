// The demo (the free Windows installer, or a browser for testing): Map 1, Tiers 0 and 1, and it ends when the player reaches Tier 2.
// A tester can switch the limit off by opening the game with #full on the address (kept for next time), and back on with #nofull.
import { inBrowser } from './r3d/graphics';

/** The tier the demo ends at: reaching it ends the demo. */
export const DEMO_END_TIER = 2;
/** The one map the demo plays. */
export const DEMO_MAP = 'map1';

const KEY = 'sl-full';

/** The free demo is switched off while the levels are unfinished: every build plays the whole game. Set true to bring it back. */
export const DEMO_ON = false;

export function isDemo(): boolean {
  if (!DEMO_ON) return false;
  // The desktop demo installer says so itself; the full desktop game is never limited.
  if (!inBrowser()) return (window as unknown as { supplyline?: { demo?: boolean } }).supplyline?.demo === true;
  try {
    if (location.hash.includes('nofull')) localStorage.removeItem(KEY);
    else if (location.hash.includes('full')) localStorage.setItem(KEY, '1');
    return localStorage.getItem(KEY) !== '1';
  } catch {
    return true;
  }
}
