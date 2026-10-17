// The opening screen. The world behind it is a live showcase base, flown over by a cinematic camera while buildings
// are upgraded and towns grow; this draws the film-title layer on top: letterbox bars, the logo coming in letter by
// letter, a supply line with goods running along it, captions that follow the flight, and the start buttons.
import { COLORS, type Im } from './imui';

const LOGO = 'SUPPLYLINE';
const SPLIT = 6;
const WHITE = 0xf5f7fa;

/** Captions follow the flight: each starts when its shot does. */
const CAPTIONS: { at: number; head: string; sub: string }[] = [
  { at: 3, head: 'ONE WORLD', sub: 'A hand-made globe of towns, farms and mountains.' },
  { at: 9, head: 'HARVEST', sub: 'Camps, farms and quarries feed the chain.' },
  { at: 15, head: 'HAUL', sub: 'Trucks, trains and planes carry it across the world.' },
  { at: 21, head: 'GROW', sub: 'Every sale builds towns into cities.' },
  { at: 27, head: 'BUILD', sub: 'Upgrade, specialise, and watch it all rise.' },
];
const CAPTION_LOOP = 33;
const CAPTION_LEN = 6;

const ease = (t: number): number => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const span = (t: number, a: number, b: number): number => Math.max(0, Math.min(1, (t - a) / (b - a)));

export type TitleChoice = 'continue' | 'new';

export class Title {
  private t0 = -1;
  private outAt = -1;
  private choice: TitleChoice | null = null;
  private fired = false;
  private readonly widths: number[] = [];

  constructor(
    private readonly hasSave: boolean,
    private readonly onStart: (choice: TitleChoice) => void,
  ) {}

  /** Enter or a click on the main button: start with the first choice. */
  primary(): void {
    this.pick(this.hasSave ? 'continue' : 'new');
  }

  private pick(c: TitleChoice): void {
    if (this.choice || this.t0 < 0) return;
    this.choice = c;
    this.outAt = -1;
  }

  /** Seconds since the screen opened. */
  seconds(now: number): number {
    return this.t0 < 0 ? 0 : (now - this.t0) / 1000;
  }

  draw(im: Im, W: number, H: number, now: number): void {
    if (this.t0 < 0) this.t0 = now;
    const t = (now - this.t0) / 1000;
    if (this.choice && this.outAt < 0) this.outAt = now;
    const out = this.outAt < 0 ? 0 : Math.min(1, (now - this.outAt) / 650);

    // Darkening at the top and bottom, so the logo and the buttons read against any ground.
    const bands = 22;
    const intro = ease(t / 1.4);
    for (let i = 0; i < bands; i++) {
      const k = 1 - i / bands;
      const a = 0.78 * k * k * intro;
      // Bands meet edge to edge: overlapping them would show as stripes.
      const t0 = Math.round((i * H * 0.34) / bands);
      const t1 = Math.round(((i + 1) * H * 0.34) / bands);
      im.rect(1, 0, t0, W, t1 - t0, 0x05080c, a * 0.8);
      const b0 = Math.round((i * H * 0.46) / bands);
      const b1 = Math.round(((i + 1) * H * 0.46) / bands);
      im.rect(1, 0, H - b1, W, b1 - b0, 0x05080c, a);
    }
    // Letterbox bars slide in.
    const bar = Math.round(H * 0.075 * ease(t / 1.2));
    im.rect(2, 0, 0, W, bar, 0x000000, 1);
    im.rect(2, 0, H - bar, W, bar, 0x000000, 1);

    // The logo, letter by letter.
    const size = Math.round(Math.max(40, Math.min(124, W * 0.082)));
    const track = size * 0.07;
    let total = 0;
    LOGO.split('').forEach((ch, i) => {
      this.widths[i] = im.text(`tl-m${i}`, ch, 0, -400, { size, bold: true, layer: 3, alpha: 0 }).w;
      total += this.widths[i] + (i < LOGO.length - 1 ? track : 0);
    });
    const ly = Math.round(H * 0.17);
    let x = Math.round((W - total) / 2);
    LOGO.split('').forEach((ch, i) => {
      const at = 0.9 + i * 0.075;
      const k = ease((t - at) / 0.7);
      const rise = (1 - k) * size * 0.35;
      const color = i < SPLIT ? WHITE : COLORS.accent;
      im.text(`tl-s${i}`, ch, x + 3, ly + rise + 4, { size, bold: true, color: 0x000000, alpha: 0.5 * k, layer: 3 });
      im.text(`tl-l${i}`, ch, x, ly + rise, { size, bold: true, color, alpha: k, layer: 3 });
      x += this.widths[i] + track;
    });
    const logoLeft = Math.round((W - total) / 2);

    // A supply line under the logo with goods running along it.
    const lineA = ease((t - 2.0) / 0.9);
    if (lineA > 0) this.supplyLine(im, logoLeft, ly + size * 1.22, total, size, t, lineA);

    // The tagline.
    const tagA = ease((t - 2.3) / 0.8);
    const tagSize = Math.round(Math.max(15, size * 0.2));
    const tagY = ly + size * 1.42 + (1 - tagA) * 10;
    im.text('tl-tagS', 'Build the chain. Feed the world.', W / 2 + 1, tagY + 2, { size: tagSize, color: 0x000000, align: 'center', alpha: tagA * 0.7, layer: 3 });
    im.text('tl-tag', 'Build the chain. Feed the world.', W / 2, tagY, { size: tagSize, color: 0xf0f4f8, align: 'center', alpha: tagA, layer: 3 });

    // Captions that follow the flight, one at a time; after the flight they simply take turns.
    let ci = -1;
    let capA = 0;
    if (t >= CAPTIONS[0].at) {
      let start: number;
      let end: number;
      if (t < CAPTION_LOOP) {
        ci = CAPTIONS.reduce((n, c, i) => (t >= c.at ? i : n), 0);
        start = CAPTIONS[ci].at;
        end = CAPTIONS[ci + 1]?.at ?? CAPTION_LOOP;
      } else {
        const n = Math.floor((t - CAPTION_LOOP) / CAPTION_LEN);
        ci = n % CAPTIONS.length;
        start = CAPTION_LOOP + n * CAPTION_LEN;
        end = start + CAPTION_LEN;
      }
      capA = Math.min(ease((t - start) / 0.7), 1 - span(t, end - 0.7, end));
    }
    const cx = Math.max(28, W * 0.05);
    const cy = H - bar - Math.max(110, H * 0.17);
    if (ci >= 0) {
      const cap = CAPTIONS[ci];
      const slide = (1 - capA) * -14;
      im.rect(3, cx, cy + 2, 4, 62, COLORS.accent, capA);
      im.text('tl-chS', cap.head, cx + 19 + slide, cy + 2, { size: 30, bold: true, color: 0x000000, alpha: capA * 0.6, layer: 3 });
      im.text('tl-ch', cap.head, cx + 18 + slide, cy, { size: 30, bold: true, color: WHITE, alpha: capA, layer: 3 });
      im.text('tl-csS', cap.sub, cx + 19 + slide, cy + 41, { size: 15, color: 0x000000, alpha: capA * 0.6, layer: 3 });
      im.text('tl-cs', cap.sub, cx + 18 + slide, cy + 40, { size: 15, color: 0xe3eaf1, alpha: capA, layer: 3 });
      for (let i = 0; i < CAPTIONS.length; i++) im.rect(3, cx + 18 + i * 22, cy + 70, 16, 3, i === ci ? COLORS.accent : 0xffffff, i === ci ? 1 : 0.3);
    }

    // The buttons.
    const bw = Math.min(330, W - 60);
    const bh = 54;
    const gap = 14;
    const items: { id: TitleChoice; label: string; primary: boolean }[] = this.hasSave
      ? [{ id: 'continue', label: 'Continue', primary: true }, { id: 'new', label: 'New game', primary: false }]
      : [{ id: 'new', label: 'New game', primary: true }];
    const by0 = Math.round(H * 0.55);
    items.forEach((it, i) => {
      const at = 3.0 + i * 0.18;
      const k = ease((t - at) / 0.6);
      if (k <= 0) return;
      const bx = Math.round((W - bw) / 2);
      const by = Math.round(by0 + i * (bh + gap) + (1 - k) * 18);
      const live = !this.choice && k > 0.9;
      const hov = im.hit(`tl-b${it.id}`, bx, by, bw, bh, () => live && this.pick(it.id), 3);
      if (it.primary) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
        im.rect(2, bx - 6, by - 6, bw + 12, bh + 12, COLORS.accent, (0.1 + 0.1 * pulse + (hov ? 0.12 : 0)) * k, 34);
        im.rect(3, bx, by, bw, bh, hov ? 0xf4b24c : COLORS.accent, k, 27);
        im.text(`tl-bt${it.id}`, it.label.toUpperCase(), bx + bw / 2, by + 15, { size: 19, bold: true, color: 0x1b1204, align: 'center', alpha: k, layer: 3 });
      } else {
        im.rect(2, bx, by, bw, bh, hov ? 0x1c2735 : 0x0d131b, 0.72 * k, 27, hov ? COLORS.accent : 0xffffff, hov ? 1 : 0.28);
        im.text(`tl-bt${it.id}`, it.label.toUpperCase(), bx + bw / 2, by + 15, { size: 19, bold: true, color: hov ? COLORS.accent : WHITE, align: 'center', alpha: k, layer: 3 });
      }
    });
    const hintA = ease((t - 3.8) / 0.8) * (0.55 + 0.35 * Math.sin(t * 2.2));
    const hintY = by0 + items.length * (bh + gap) + 6;
    im.text('tl-hintS', 'Press Enter to start', W / 2 + 1, hintY + 1, { size: 13, color: 0x000000, align: 'center', alpha: hintA * 0.8, layer: 3 });
    im.text('tl-hint', 'Press Enter to start', W / 2, hintY, { size: 13, color: 0xdbe3ec, align: 'center', alpha: hintA, layer: 3 });
    im.text('tl-ver', 'Early build', W - 24, H - bar - 28, { size: 12, color: 0x8f9bab, align: 'right', alpha: ease((t - 3) / 1) * 0.8, layer: 3 });

    // The fade up from black, and the fade out when the game starts.
    const fadeIn = 1 - ease(t / 1.5);
    const black = Math.max(fadeIn, out);
    if (black > 0.002) im.rect(3, 0, 0, W, H, 0x000000, black);
    if (this.choice && out >= 1 && !this.fired) {
      // Black on screen: load behind it.
      this.fired = true;
      const c = this.choice;
      setTimeout(() => this.onStart(c), 30);
    }
  }

  /** A route winding under the logo, with a station at each bend and bright goods sliding along it. */
  private supplyLine(im: Im, x0: number, y: number, w: number, size: number, t: number, a: number): void {
    const n = 48;
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push([x0 + u * w, y + Math.sin(u * Math.PI * 3.1 + 0.6) * size * 0.07 + Math.sin(u * Math.PI * 9) * size * 0.012]);
    }
    for (let i = 0; i < n; i++) {
      im.line(3, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 0xffffff, 0.16 * a, 5);
      im.line(3, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], COLORS.accent, 0.8 * a, 2);
    }
    // Stations along the line.
    const stops = [0.02, 0.27, 0.5, 0.73, 0.98];
    const speed = 0.2;
    for (const s of stops) {
      const [px, py] = pts[Math.round(s * n)];
      let near = 0;
      for (let d = 0; d < 3; d++) {
        const head = (t * speed + d / 3) % 1;
        near = Math.max(near, 1 - Math.min(1, Math.abs(head - s) / 0.05));
      }
      im.circle(3, px, py, 9 + near * 4, COLORS.accent, (0.15 + 0.3 * near) * a);
      im.circle(3, px, py, 5, 0x10151c, a);
      im.ring(3, px, py, 5, 2, 1, near > 0.3 ? 0xffffff : COLORS.accent);
    }
    // Goods: bright heads with a fading tail.
    for (let d = 0; d < 3; d++) {
      const head = (t * speed + d / 3) % 1;
      for (let k = 0; k < 9; k++) {
        const u = head - k * 0.012;
        if (u < 0) continue;
        const [px, py] = pts[Math.round(u * n)];
        im.circle(3, px, py, 5.2 - k * 0.45, k === 0 ? 0xffffff : 0xffd089, (1 - k / 9) * 0.95 * a);
      }
    }
  }
}
