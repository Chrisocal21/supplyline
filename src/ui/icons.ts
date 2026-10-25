// Small drawn icons for the menus, made of the UI's own shapes so they stay crisp at any size. Each fits a 26 px box centred
// on (cx, cy); `bg` is the colour behind it, used to cut holes.
import type { Im } from './imui';

export type IconName =
  | 'business' | 'game' | 'sound' | 'display' | 'keys' | 'about' | 'company' | 'production' | 'fleet' | 'towns' | 'bank'
  | 'quests' | 'guide' | 'save' | 'world' | 'tutorial' | 'minimap' | 'perf';

export function drawIcon(im: Im, name: IconName, cx: number, cy: number, c: number, bg: number, layer = 5): void {
  const r = (x: number, y: number, w: number, h: number, col = c, rad = 1): void => im.rect(layer, cx + x, cy + y, w, h, col, 1, rad);
  const box = (x: number, y: number, w: number, h: number, t = 2.5): void => {
    r(x, y, w, h);
    r(x + t, y + t, w - t * 2, h - t * 2, bg, 0);
  };
  switch (name) {
    case 'business':
      r(-12, 9, 24, 3);
      r(-10, 0, 5, 8);
      r(-3, -5, 5, 13);
      r(4, -11, 5, 19);
      break;
    case 'game':
      r(-13, -7, 26, 15, c, 6);
      r(-9, -1, 8, 3, bg, 0);
      r(-6.5, -3.5, 3, 8, bg, 0);
      im.circle(layer, cx + 5, cy - 1, 2, bg);
      im.circle(layer, cx + 9, cy + 2, 2, bg);
      break;
    case 'sound':
      r(-12, -4, 6, 8);
      r(-7, -9, 6, 18);
      r(2, -5, 2.5, 10);
      r(7, -9, 2.5, 18);
      break;
    case 'display':
      box(-13, -10, 26, 17);
      r(-2, 7, 4, 4);
      r(-7, 10, 14, 2.5);
      break;
    case 'keys':
      box(-13, -8, 26, 16, 2);
      for (const dx of [-9, -4, 1, 6]) r(dx, -4, 3, 3);
      r(-7, 2, 14, 3);
      break;
    case 'about':
      im.circle(layer, cx, cy, 12, c);
      im.circle(layer, cx, cy, 9.5, bg);
      im.circle(layer, cx, cy - 5, 2, c);
      r(-1.5, -1, 3, 8);
      break;
    case 'company':
      for (const [dx, dy] of [[-10, -10], [1, -10], [-10, 1], [1, 1]]) r(dx, dy, 9, 9);
      break;
    case 'production':
      r(-12, -1, 24, 12);
      r(5, -12, 6, 12);
      r(-12, -7, 8, 6);
      r(-3, -7, 8, 6);
      break;
    case 'fleet':
      r(-12, -8, 16, 12);
      r(5, -3, 8, 7);
      im.circle(layer, cx - 6, cy + 6, 3.5, c);
      im.circle(layer, cx + 8, cy + 6, 3.5, c);
      break;
    case 'towns':
      r(-13, -1, 9, 12);
      r(-4, -11, 10, 22);
      r(7, 2, 7, 9);
      break;
    case 'bank':
      r(-13, -11, 26, 5);
      for (const dx of [-10, -3, 4]) r(dx, -5, 6, 12);
      r(-14, 8, 28, 4);
      break;
    case 'quests':
      r(-8, -12, 3, 24);
      r(-5, -12, 15, 11);
      break;
    case 'guide':
      r(-13, -9, 12, 19, c, 2);
      r(1, -9, 12, 19, c, 2);
      for (const dy of [-4, 1]) {
        r(-10, dy, 6, 2, bg, 0);
        r(4, dy, 6, 2, bg, 0);
      }
      break;
    case 'save':
      r(-11, -11, 22, 22, c, 3);
      r(-6, -11, 12, 7, bg, 0);
      r(-7, 3, 14, 6, bg, 0);
      break;
    case 'world':
      im.circle(layer, cx, cy, 12, c);
      im.circle(layer, cx, cy, 9.5, bg);
      r(-1, -10, 2, 20);
      r(-10, -1, 20, 2);
      break;
    case 'tutorial':
      im.circle(layer, cx, cy - 3, 8, c);
      r(-4, 5, 8, 3);
      r(-3, 9, 6, 2.5);
      break;
    case 'minimap':
      r(-12, -9, 7, 19);
      r(-4, -11, 7, 19);
      r(4, -9, 7, 19);
      break;
    case 'perf':
      for (const [x0, y0, x1, y1] of [[-13, 2, -6, 2], [-6, 2, -2, -9], [-2, -9, 3, 9], [3, 9, 7, 2], [7, 2, 13, 2]]) im.line(layer, cx + x0, cy + y0, cx + x1, cy + y1, c, 1, 3);
      break;
  }
}
