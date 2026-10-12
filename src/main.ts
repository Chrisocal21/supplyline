import Phaser from 'phaser';
import { Game3D } from './r3d/game3d';
import * as sim from './sim/world';
import { findPath } from './sim/path';
import { HudScene } from './ui/hud';

const game = new Game3D(document.body);
const hash = location.hash;
const seed = /seed=(\d+)/.exec(hash);
if (hash.includes('demo')) {
  game.newWorld(seed ? +seed[1] : 11);
  game.buildDemoBase();
} else if (hash.includes('fresh') || seed) {
  game.newWorld(seed ? +seed[1] : undefined);
} else if (!game.load()) {
  game.newWorld();
}
game.start();

// The HUD is a transparent Phaser canvas on top of the 3D view.
const phaser = new Phaser.Game({
  type: Phaser.AUTO,
  transparent: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  render: { antialias: true },
  scene: [new HudScene(game)],
});

// Handles for automated checks and debugging from the console.
Object.assign(window, { __game: game, __phaser: phaser, __sim: sim, __path: findPath });
