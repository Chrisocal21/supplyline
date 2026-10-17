// The opening screen. The world behind it is a live showcase base, filmed by a cinematic camera while buildings, towns and
// vehicles are shown off; this draws the film-title layer on top: letterbox bars, the logo (at the start, and again at the end
// with the start buttons), captions that follow the film, panels that show the menus, cuts through black and shutter flashes.
import { COLORS, type Im } from './imui';

const LOGO = 'SUPPLYLINE';
const SPLIT = 6;
const WHITE = 0xf5f7fa;

const ease = (t: number): number => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const span = (t: number, a: number, b: number): number => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

export type TitleChoice = 'continue' | 'new';

/** What the game tells the title layer about the film each frame. */
export interface ShowInfo {
  t: number;
  film: number;
  total: number;
  cue: { head: string; sub: string; at: number; end: number } | null;
  ui: { kind: 'sell' | 'bank' | 'town'; u: number } | null;
  dip: number;
  flash: number;
}

export class Title {
  private t0 = -1;
  private outAt = -1;
  private choice: TitleChoice | null = null;
  private fired = false;
  private readonly widths: number[] = [];

  constructor(
    private readonly hasSave: boolean,
    private readonly onStart: (choice: TitleChoice) => void,
    private readonly info: () => ShowInfo | null,
    private readonly onSkip: () => void,
  ) {}

  /** Whether the buttons are up: the film has reached its end. */
  private finale(): boolean {
    const i = this.info();
    return !i || i.t >= i.film - 4;
  }

  /** Enter: skip the film if it is still running, otherwise start with the first choice. */
  primary(): void {
    if (!this.finale()) {
      this.onSkip();
      return;
    }
    this.pick(this.hasSave ? 'continue' : 'new');
  }

  /** Any other key or a click on the picture: skip ahead to the buttons. */
  skip(): void {
    if (!this.finale()) this.onSkip();
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
    const info = this.info();
    const ct = info ? info.t : 99;
    const film = info ? info.film : 0;
    // The logo card: at the start of the film, and at the end of it with the buttons.
    const opening = 1 - span(ct, 6.5, 8.2);
    const fe = info ? ct - (film - 7) : 99;
    const finaleA = info ? ease(fe / 1.0) : 1;
    const logoA = Math.max(opening, finaleA);
    const lt = fe >= 0 ? fe : t;

    // Darkening at the top and bottom, so the logo, the captions and the buttons read against any ground.
    const bands = 22;
    const intro = ease(t / 1.4);
    const dark = Math.max(logoA, 0.55);
    for (let i = 0; i < bands; i++) {
      const k = 1 - i / bands;
      const a = 0.78 * k * k * intro * dark;
      // Bands meet edge to edge: overlapping them would show as stripes.
      const t0 = Math.round((i * H * 0.34) / bands);
      const t1 = Math.round(((i + 1) * H * 0.34) / bands);
      im.rect(1, 0, t0, W, t1 - t0, 0x05080c, a * 0.8 * (logoA > 0.05 ? 1 : 0.4));
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
      const k = ease((lt - at) / 0.7) * logoA;
      const rise = (1 - k) * size * 0.35;
      const color = i < SPLIT ? WHITE : COLORS.accent;
      im.text(`tl-s${i}`, ch, x + 3, ly + rise + 4, { size, bold: true, color: 0x000000, alpha: 0.5 * k, layer: 3 });
      im.text(`tl-l${i}`, ch, x, ly + rise, { size, bold: true, color, alpha: k, layer: 3 });
      x += this.widths[i] + track;
    });
    const logoLeft = Math.round((W - total) / 2);

    // A supply line under the logo with goods running along it.
    const lineA = ease((lt - 2.0) / 0.9) * logoA;
    if (lineA > 0) this.supplyLine(im, logoLeft, ly + size * 1.22, total, size, t, lineA);

    // The tagline.
    const tagA = ease((lt - 2.3) / 0.8) * logoA;
    const tagSize = Math.round(Math.max(15, size * 0.2));
    const tagY = ly + size * 1.42 + (1 - tagA) * 10;
    im.text('tl-tagS', 'Build the chain. Feed the world.', W / 2 + 1, tagY + 2, { size: tagSize, color: 0x000000, align: 'center', alpha: tagA * 0.7, layer: 3 });
    im.text('tl-tag', 'Build the chain. Feed the world.', W / 2, tagY, { size: tagSize, color: 0xf0f4f8, align: 'center', alpha: tagA, layer: 3 });

    // The caption for this stretch of the film.
    const cx = Math.max(28, W * 0.05);
    const cy = H - bar - Math.max(110, H * 0.17);
    if (info && info.cue && fe < 0) {
      const cap = info.cue;
      const capA = Math.min(ease((ct - cap.at) / 0.6), 1 - span(ct, cap.end - 0.5, cap.end));
      const slide = (1 - capA) * -14;
      im.rect(3, cx, cy + 2, 4, 62, COLORS.accent, capA);
      im.text('tl-chS', cap.head, cx + 19 + slide, cy + 2, { size: 30, bold: true, color: 0x000000, alpha: capA * 0.6, layer: 3 });
      im.text('tl-ch', cap.head, cx + 18 + slide, cy, { size: 30, bold: true, color: WHITE, alpha: capA, layer: 3 });
      im.text('tl-csS', cap.sub, cx + 19 + slide, cy + 41, { size: 15, color: 0x000000, alpha: capA * 0.6, wrap: Math.min(W * 0.5, 560), layer: 3 });
      im.text('tl-cs', cap.sub, cx + 18 + slide, cy + 40, { size: 15, color: 0xe3eaf1, alpha: capA, wrap: Math.min(W * 0.5, 560), layer: 3 });
    }

    // The menus, shown as panels over the film.
    if (info && info.ui && fe < 0) this.panel(im, W, bar, info.ui.kind, info.ui.u);

    // The buttons, once the film has run its course.
    const bw = Math.min(330, W - 60);
    const bh = 54;
    const gap = 14;
    const items: { id: TitleChoice; label: string; primary: boolean }[] = this.hasSave
      ? [{ id: 'continue', label: 'Continue', primary: true }, { id: 'new', label: 'New game', primary: false }]
      : [{ id: 'new', label: 'New game', primary: true }];
    const by0 = Math.round(H * 0.55);
    items.forEach((it, i) => {
      const at = 3.0 + i * 0.18;
      const k = info ? ease((fe - at) / 0.6) : ease((t - at) / 0.6);
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
    const hintA = (info ? ease((fe - 3.8) / 0.8) : ease((t - 3.8) / 0.8)) * (0.55 + 0.35 * Math.sin(t * 2.2));
    const hintY = by0 + items.length * (bh + gap) + 6;
    im.text('tl-hintS', 'Press Enter to start', W / 2 + 1, hintY + 1, { size: 13, color: 0x000000, align: 'center', alpha: hintA * 0.8, layer: 3 });
    im.text('tl-hint', 'Press Enter to start', W / 2, hintY, { size: 13, color: 0xdbe3ec, align: 'center', alpha: hintA, layer: 3 });
    const verA = info ? ease((fe - 3) / 1) * 0.8 : ease((t - 3) / 1) * 0.8;
    im.text('tl-ver', 'Early build  ·  look closer next time', W - 24, H - bar - 28, { size: 12, color: 0x8f9bab, align: 'right', alpha: verA, layer: 3 });

    // While the film runs, a way out of it.
    if (info && fe < 0.5 && t > 3) {
      const a = ease((t - 3) / 1) * (0.45 + 0.3 * Math.sin(t * 2.0)) * (1 - span(fe, 0, 0.5));
      im.text('tl-skipS', 'Press any key to skip', W - 23, H - bar - 27, { size: 13, color: 0x000000, align: 'right', alpha: a * 0.8, layer: 3 });
      im.text('tl-skip', 'Press any key to skip', W - 24, H - bar - 28, { size: 13, color: 0xdbe3ec, align: 'right', alpha: a, layer: 3 });
    }

    // A camera shutter at the start of each vehicle, and a cut through black between shots.
    if (info && info.flash > 0.01) im.rect(3, 0, 0, W, H, 0xffffff, 0.55 * info.flash * info.flash);
    if (info && info.dip > 0.01) im.rect(3, 0, 0, W, H, 0x000000, Math.min(1, info.dip * 1.15));

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

  // ---- the menus, as they look in the game ----

  /** A pointer arrow. */
  private cursor(im: Im, x: number, y: number, a: number, press: boolean): void {
    const s = press ? 0.9 : 1;
    const pts: [number, number][] = [[0, 0], [0, 17 * s], [4.5 * s, 13 * s], [8 * s, 20 * s], [11 * s, 18.5 * s], [7.5 * s, 12 * s], [13 * s, 12 * s]];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      im.line(4, x + ax + 1.5, y + ay + 1.5, x + bx + 1.5, y + by + 1.5, 0x000000, 0.5 * a, 3);
      im.line(4, x + ax, y + ay, x + bx, y + by, 0xffffff, a, 2);
    }
    if (press) im.circle(4, x, y, 14, 0xffffff, 0.25 * a);
  }

  private button(im: Im, id: string, label: string, x: number, y: number, w: number, h: number, on: boolean, a: number): void {
    im.rect(3, x, y, w, h, on ? 0x1d3a2c : 0x1b2735, a, h / 2, on ? COLORS.good : COLORS.accent, a);
    im.text(id, label, x + w / 2, y + h / 2 - 8, { size: 12, bold: true, color: on ? COLORS.good : COLORS.accent, align: 'center', alpha: a, layer: 4 });
  }

  /** One of the game's menus, acted out: where goods are sold, the bank, and what a town needs. */
  private panel(im: Im, W: number, bar: number, kind: 'sell' | 'bank' | 'town', u: number): void {
    const pw = Math.min(440, Math.max(300, W * 0.36));
    const ph = kind === 'bank' ? 330 : kind === 'sell' ? 300 : 320;
    const slide = 1 - ease(u / 0.07) * (1 - span(u, 0.93, 1));
    const a = ease(u / 0.06) * (1 - span(u, 0.94, 1));
    const x = W - pw - 28 + slide * (pw + 40);
    const y = bar + 70;
    im.rect(3, x, y, pw, ph, COLORS.panel, 0.94 * a, 14, COLORS.line, a);
    const head = kind === 'sell' ? 'WHO BUYS YOUR FLOUR' : kind === 'bank' ? 'BANK' : 'WESTHAVEN  ·  VILLAGE';
    im.text('pn-h', head, x + 16, y + 14, { size: 12, bold: true, color: COLORS.muted, alpha: a, layer: 4 });
    const press = (at: number): boolean => u > at && u < at + 0.04;
    // Where the pointer is: a path through the points the scene acts on.
    const route = (pts: [number, number, number][]): [number, number] => {
      let px = pts[0][1];
      let py = pts[0][2];
      for (let i = 1; i < pts.length; i++) {
        const t0 = pts[i - 1][0];
        const [t1, x1, y1] = pts[i];
        if (u >= t0 && u <= t1) {
          const k = ease((u - t0) / Math.max(0.001, t1 - t0));
          return [lerp(pts[i - 1][1], x1, k), lerp(pts[i - 1][2], y1, k)];
        }
        if (u > t1) {
          px = x1;
          py = y1;
        }
      }
      return [px, py];
    };

    if (kind === 'sell') {
      const rows: { name: string; price: string; state: string; bar: number; col: number }[] = [
        { name: 'Ashford Market', price: '$6.2 each', state: 'Wants more', bar: 0.28, col: COLORS.good },
        { name: 'Kelmere Bakery', price: 'uses flour', state: 'Wants more', bar: 0.45, col: COLORS.good },
        { name: 'Calder Market', price: '$7.1 each', state: 'Not joined by road yet', bar: 0, col: COLORS.muted },
      ];
      const on0 = u > 0.3;
      const on2 = u > 0.64;
      rows.forEach((r, i) => {
        const ry = y + 40 + i * 76;
        const on = i === 0 ? on0 : i === 2 ? on2 : false;
        im.rect(3, x + 12, ry, pw - 24, 68, on ? 0x12261f : 0x131a24, a, 10, on ? COLORS.good : COLORS.line, a);
        im.text(`pn-n${i}`, r.name, x + 24, ry + 9, { size: 13, bold: true, alpha: a, layer: 4 });
        im.text(`pn-p${i}`, r.price, x + pw - 24, ry + 9, { size: 13, bold: true, color: i === 1 ? COLORS.muted : COLORS.warn, align: 'right', alpha: a, layer: 4 });
        im.text(`pn-s${i}`, i === 2 && on2 ? 'Wants more' : r.state, x + 24, ry + 30, { size: 11, color: i === 2 && on2 ? COLORS.good : r.col, alpha: a, layer: 4 });
        if (i < 2 || on2) im.bar(4, x + 24, ry + 52, pw - 168, 6, i === 2 ? 0.2 : r.bar, COLORS.good);
        const label = i === 2 && !on2 ? 'Road  $340' : on ? 'Selling' : 'Sell here';
        this.button(im, `pn-b${i}`, label, x + pw - 112, ry + 28, 88, 28, on, a);
      });
      const sold = Math.max(0, Math.floor((u - 0.34) * 130));
      if (u > 0.34) im.text('pn-sold', `Sold ${sold} for $${Math.round(sold * 6.2)}`, x + 24, y + ph - 28, { size: 12, color: COLORS.muted, alpha: a, layer: 4 });
      if (u > 0.7) im.text('pn-toast', 'Road built. Now selling to Calder Market', x + pw / 2, y + ph - 52, { size: 12, bold: true, color: COLORS.good, align: 'center', alpha: a * ease((u - 0.7) / 0.05), layer: 4 });
      const [cx, cy] = route([[0, x + pw * 0.9, y + 40], [0.28, x + pw - 68, y + 40 + 42], [0.32, x + pw - 68, y + 40 + 42], [0.62, x + pw - 68, y + 40 + 152 + 42], [0.7, x + pw - 68, y + 40 + 152 + 42], [1, x + pw * 0.6, y + ph]]);
      this.cursor(im, cx, cy, a, press(0.3) || press(0.64));
    } else if (kind === 'bank') {
      const loan = u > 0.28;
      const fund = u > 0.6;
      const cash = 2400 + (loan ? 10000 : 0) - (fund ? 5000 : 0);
      im.text('pn-cash', `$${cash.toLocaleString('en-US')}`, x + 16, y + 38, { size: 34, bold: true, alpha: a, layer: 4 });
      im.text('pn-cashl', 'cash in hand', x + 16, y + 78, { size: 11, color: COLORS.muted, alpha: a, layer: 4 });
      const debt = loan ? 10000 + Math.floor((u - 0.28) * 600) : 0;
      im.text('pn-debt', loan ? `Debt  $${debt.toLocaleString('en-US')}  ·  interest compounds` : 'No loans', x + pw - 16, y + 44, { size: 12, color: loan ? COLORS.bad : COLORS.muted, align: 'right', alpha: a, layer: 4 });
      im.rect(3, x + 12, y + 100, pw - 24, 58, 0x131a24, a, 10, COLORS.line, a);
      im.text('pn-l1', 'Borrow $10,000', x + 24, y + 112, { size: 13, bold: true, alpha: a, layer: 4 });
      im.text('pn-l2', 'Pay it back whenever you like.', x + 24, y + 133, { size: 11, color: COLORS.muted, alpha: a, layer: 4 });
      this.button(im, 'pn-lb', loan ? 'Borrowed' : 'Borrow', x + pw - 108, y + 114, 84, 28, loan, a);
      im.rect(3, x + 12, y + 166, pw - 24, 58, 0x131a24, a, 10, COLORS.line, a);
      im.text('pn-f1', 'Market fund  $5,000', x + 24, y + 178, { size: 13, bold: true, alpha: a, layer: 4 });
      im.text('pn-f2', 'Rises and falls with the world.', x + 24, y + 199, { size: 11, color: COLORS.muted, alpha: a, layer: 4 });
      this.button(im, 'pn-fb', fund ? 'Invested' : 'Invest', x + pw - 108, y + 180, 84, 28, fund, a);
      // The fund's chart climbing.
      const cx0 = x + 16;
      const cw = pw - 32;
      const cy0 = y + 296;
      im.line(4, cx0, cy0, cx0 + cw, cy0, COLORS.line, a, 1);
      if (fund) {
        const n = 60;
        const k = Math.min(1, (u - 0.6) / 0.38);
        let prev: [number, number] | null = null;
        for (let i = 0; i <= n * k; i++) {
          const q = i / n;
          const v = q * 0.7 + Math.sin(q * 11) * 0.09 + Math.sin(q * 27) * 0.03;
          const px = cx0 + q * cw;
          const py = cy0 - 8 - v * 54;
          if (prev) im.line(4, prev[0], prev[1], px, py, COLORS.good, a, 2);
          prev = [px, py];
        }
        im.text('pn-gain', `+${Math.round(k * 12)}%`, x + pw - 16, y + 230, { size: 13, bold: true, color: COLORS.good, align: 'right', alpha: a, layer: 4 });
      }
      const worth = cash + (fund ? 5000 * (1 + 0.12 * Math.min(1, (u - 0.6) / 0.38)) : 0) - debt;
      im.text('pn-nw', `Net worth  $${Math.round(worth).toLocaleString('en-US')}`, x + 16, y + 236, { size: 12, color: COLORS.muted, alpha: a, layer: 4 });
      const [cx, cy] = route([[0, x + pw * 0.9, y + 30], [0.24, x + pw - 66, y + 128], [0.3, x + pw - 66, y + 128], [0.55, x + pw - 66, y + 194], [0.62, x + pw - 66, y + 194], [1, x + pw * 0.7, y + 260]]);
      this.cursor(im, cx, cy, a, press(0.27) || press(0.6));
    } else {
      // What a town wants: how far it is from the next level, and the goods it is short of.
      const next = 0.62 + 0.3 * span(u, 0.1, 0.95);
      im.text('pn-sub', 'Village  ·  Temperate  ·  population 400', x + 16, y + 34, { size: 12, color: COLORS.muted, alpha: a, layer: 4 });
      im.bar(4, x + 16, y + 62, pw - 150, 8, next, COLORS.good);
      im.text('pn-gr', `${Math.round(next * 8000).toLocaleString('en-US')} / 8,000`, x + pw - 16, y + 56, { size: 12, color: COLORS.muted, align: 'right', alpha: a, layer: 4 });
      const need = u < 0.55 ? 'To level up: needs 1 more kind of good: try Coffee, Mango' : 'Ready to level up: the next delivery does it';
      im.text('pn-need', need, x + 16, y + 84, { size: 12, color: u < 0.55 ? COLORS.text : COLORS.good, wrap: pw - 32, alpha: a, layer: 4 });
      im.text('pn-bn', 'BRING NEXT', x + 16, y + 122, { size: 10, bold: true, color: COLORS.muted, alpha: a, layer: 4 });
      const goods: { n: string; p: string; fresh: boolean; col: number; stock: number }[] = [
        { n: 'Coffee', p: 'NEW', fresh: true, col: 0x6b4426, stock: u > 0.35 ? Math.min(0.8, (u - 0.35) * 2.4) : 0.02 },
        { n: 'Mango', p: 'NEW', fresh: true, col: 0xf0a630, stock: u > 0.5 ? Math.min(0.7, (u - 0.5) * 2) : 0.02 },
        { n: 'Bread', p: '$13.1', fresh: false, col: 0xc98c4a, stock: 0.18 },
        { n: 'Cheese', p: '$21.6', fresh: false, col: 0xe8c04a, stock: 0.1 },
      ];
      const cw = (pw - 32 - 12) / 2;
      goods.forEach((g, i) => {
        const gx = x + 16 + (i % 2) * (cw + 12);
        const gy = y + 142 + Math.floor(i / 2) * 44;
        const have = g.stock;
        const c = have > 0.4 ? COLORS.good : have > 0.05 ? COLORS.warn : COLORS.bad;
        im.rect(3, gx, gy, cw, 36, 0x10161e, a, 8, c, 0.7 * a);
        im.circle(4, gx + 14, gy + 14, 5, g.col, a);
        im.text(`pn-gn${i}`, g.n, gx + 26, gy + 6, { size: 12, bold: true, alpha: a, layer: 4 });
        im.text(`pn-gp${i}`, g.p, gx + cw - 10, gy + 6, { size: 12, bold: g.fresh, color: g.fresh ? COLORS.good : COLORS.warn, align: 'right', alpha: a, layer: 4 });
        im.bar(4, gx + 10, gy + 26, cw - 20, 4, have, c);
      });
      im.text('pn-fr', 'Freight yard buys raw goods (16): Logs, Grain, Cotton, Stone, Iron Ore, Coal, Oil...', x + 16, y + 240, { size: 11, color: COLORS.muted, wrap: pw - 32, alpha: a, layer: 4 });
      const [cx, cy] = route([[0, x + pw * 0.9, y + 40], [0.3, x + 90, y + 160], [0.5, x + 90, y + 160], [0.7, x + pw * 0.5, y + 206], [1, x + pw * 0.8, y + 250]]);
      this.cursor(im, cx, cy, a, false);
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
