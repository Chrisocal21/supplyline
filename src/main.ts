import Phaser from 'phaser';
import { Game3D } from './r3d/game3d';
import * as sim from './sim/world';
import * as townRules from './sim/town';
import * as bankRules from './sim/bank';
import { findPath } from './sim/path';
import { HudScene } from './ui/hud';
import { SEASON_LOOK, seasonLook } from './r3d/season';

const game = new Game3D(document.body);
const hash = location.hash;
const seed = /seed=(\d+)/.exec(hash);
// A tester who pressed Sync update comes back to their game, where they were, with no title screen.
let synced: { lon: number; lat: number; dist: number; heading: number; pitch: number } | null = null;
try {
  const raw = sessionStorage.getItem('sl-sync');
  if (raw) {
    sessionStorage.removeItem('sl-sync');
    synced = JSON.parse(raw);
  }
} catch {
  // No session storage: nothing to resume.
}
if (synced) {
  if (!game.load()) game.newWorld();
  game.cam.set(synced.lon, synced.lat, synced.dist, synced.heading, synced.pitch);
} else if (hash.includes('demo')) {
  game.newWorld(seed ? +seed[1] : 11);
  game.buildDemoBase();
} else if (hash.includes('map')) {
  game.newWorld();
} else if (hash.includes('fresh') || seed) {
  game.newWorld(seed ? +seed[1] : undefined);
} else if (hash.includes('notitle') || (hash.includes('shot') && !hash.includes('title'))) {
  if (!game.load()) game.newWorld();
} else {
  // The opening is a title screen with a slideshow. No world is built until the player picks Continue or New game, so it comes
  // up at once and nothing is drawn in 3D behind it. The blank world only keeps the HUD happy.
  game.world = sim.createBlankWorld(8, 4, new Array(32).fill('grass'));
  game.showcase = true;
  game.idle = true;
}
game.start();
// Phones and tablets suspend a tab without warning, so save as the page is hidden.
const saveOnLeave = (): void => {
  if (!game.demo && !game.showcase) game.save();
};
window.addEventListener('pagehide', saveOnLeave);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveOnLeave();
});

// The HUD is a transparent Phaser canvas on top of the 3D view.
const phaser = new Phaser.Game({
  type: Phaser.AUTO,
  transparent: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  render: { antialias: true },
  scene: [new HudScene(game)],
});

// Handles for automated checks and debugging from the console.
Object.assign(window, { __game: game, __phaser: phaser, __sim: sim, __town: townRules, __bank: bankRules, __path: findPath, __season: { look: seasonLook, table: SEASON_LOOK } });
