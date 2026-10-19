// The opening screen: a slideshow of the game's own pictures behind the logo and the start buttons. Nothing of the game is built
// or drawn in 3D while it is up, so it appears at once and stays smooth. After a choice it becomes the loading screen, which
// goes on showing pictures while the world is made behind it.
import { COLORS, type Im } from './imui';

const LOGO = 'SUPPLYLINE';
const SPLIT = 6;
const WHITE = 0xf5f7fa;

const ease = (t: number): number => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);

export type TitleChoice = 'continue' | 'new';

/** The pictures, in the order they show, and the line that goes with each. They are in public/title. */
export const TITLE_SLIDES: { file: string; head: string; sub: string }[] = [
  { file: 'title/0.jpg', head: 'A whole world to supply', sub: 'Islands, rivers, mountains and seas, all of it yours to connect.' },
  { file: 'title/1.jpg', head: 'Towns that grow into cities', sub: 'Feed a town what it asks for and watch it become a metropolis.' },
  { file: 'title/2.jpg', head: 'Farms, camps and factories', sub: 'Turn raw goods into better ones, and read the seasons.' },
  { file: 'title/3.jpg', head: 'Trucks, trains, ships and planes', sub: 'Build the roads and rails. Name your drivers. Keep them serviced.' },
  { file: 'title/4.jpg', head: 'Day into night', sub: 'Lit streets, busy yards and a supply line that never sleeps.' },
  { file: 'title/5.jpg', head: 'Build the chain. Feed the world.', sub: 'Early build. Thanks for playing it.' },
];

const SHOW = 6.2;
const FADE = 1.4;

const TIPS = [
  'Purer resource spots work faster. Impure ones are free to build on.',
  'Open a building and tap Selling to choose who buys its goods.',
  'Farms and orchards follow the seasons: autumn is the harvest.',
  'A road carries nothing. Trucks do. Buy one for every building.',
  'Your drivers rank up with every delivery and drive a little faster.',
  'Service worn vehicles from the Fleet page before they slow down.',
  'Press Esc for the menu, and Sync update to get a new build without losing your place.',
];

export class Title {
  private t0 = -1;
  private choice: TitleChoice | null = null;
  private pickedAt = 0;
  private fired = false;
  private frames = 0;
  private readonly widths: number[] = [];

  constructor(
    private readonly hasSave: boolean,
    private readonly onStart: (choice: TitleChoice) => void,
    /** Which of the pictures have loaded. */
    private readonly ready: (key: string) => boolean,
    private readonly version: string,
  ) {}

  /** Enter: start with the first choice. */
  primary(): void {
    this.pick(this.hasSave ? 'continue' : 'new');
  }

  /** Any other key: nothing to skip any more. */
  skip(): void {}

  private pick(c: TitleChoice): void {
    if (this.choice) return;
    this.choice = c;
    this.pickedAt = -1;
  }

  seconds(now: number): number {
    return this.t0 < 0 ? 0 : (now - this.t0) / 1000;
  }

  /** The slideshow, covering the screen, with a slow drift on the picture and a cross-fade between them. */
  private slides(im: Im, W: number, H: number, t: number, offset: number): void {
    const n = TITLE_SLIDES.length;
    const loaded = TITLE_SLIDES.map((_, i) => this.ready(`title-${i}`));
    if (!loaded.some(Boolean)) return;
    const clock = t + offset;
    const idx = Math.floor(clock / SHOW) % n;
    const local = clock - Math.floor(clock / SHOW) * SHOW;
    const draw = (i: number, alpha: number, age: number): void => {
      if (!loaded[i] || alpha <= 0.002) return;
      const zoom = 1 + 0.07 * Math.min(1, age / (SHOW + FADE));
      // Cover the screen: the picture is 16:9, so it fills by width on a wide screen and by height on a tall one.
      const fill = Math.max(W / 1920, H / 1080) * zoom;
      const w = 1920 * fill;
      const h = 1080 * fill;
      im.image(`tl-img${i}`, `title-${i}`, (W - w) / 2, (H - h) / 2, w, h, alpha, 1);
    };
    // The one fading out sits underneath, the one fading in on top.
    const prev = (idx + n - 1) % n;
    const fadeIn = Math.min(1, local / FADE);
    draw(prev, loaded[prev] ? 1 : 0, local + SHOW);
    draw(idx, loaded[idx] ? fadeIn : 0, local);
  }

  draw(im: Im, W: number, H: number, now: number): void {
    if (this.t0 < 0) this.t0 = now;
    const t = (now - this.t0) / 1000;
    this.frames += 1;
    if (this.choice && this.pickedAt < 0) this.pickedAt = now;
    const loading = !!this.choice;
    const lt = loading ? (now - this.pickedAt) / 1000 : 0;
    const n = TITLE_SLIDES.length;
    const clock = t + (loading ? 0 : 0);
    const idx = Math.floor(clock / SHOW) % n;

    im.rect(0, 0, 0, W, H, 0x04070b, 1);
    this.slides(im, W, H, t, 0);

    // Darkening top and bottom so the logo, the captions and the buttons read against any picture.
    const bands = 22;
    for (let i = 0; i < bands; i++) {
      const k = 1 - i / bands;
      const a = 0.78 * k * k;
      const t0 = Math.round((i * H * 0.4) / bands);
      const t1 = Math.round(((i + 1) * H * 0.4) / bands);
      im.rect(1, 0, t0, W, t1 - t0, 0x05080c, a * 0.8);
      const b0 = Math.round((i * H * 0.46) / bands);
      const b1 = Math.round(((i + 1) * H * 0.46) / bands);
      im.rect(1, 0, H - b1, W, b1 - b0, 0x05080c, a);
    }

    // The logo.
    const size = Math.round(Math.max(40, Math.min(124, W * 0.082)));
    const track = size * 0.07;
    let total = 0;
    LOGO.split('').forEach((ch, i) => {
      this.widths[i] = im.text(`tl-m${i}`, ch, 0, -400, { size, bold: true, layer: 3, alpha: 0 }).w;
      total += this.widths[i] + (i < LOGO.length - 1 ? track : 0);
    });
    const ly = Math.round(H * 0.15);
    let x = Math.round((W - total) / 2);
    LOGO.split('').forEach((ch, i) => {
      const k = ease((t - 0.1 - i * 0.05) / 0.6);
      const rise = (1 - k) * size * 0.3;
      const color = i < SPLIT ? WHITE : COLORS.accent;
      im.text(`tl-s${i}`, ch, x + 3, ly + rise + 4, { size, bold: true, color: 0x000000, alpha: 0.5 * k, layer: 3 });
      im.text(`tl-l${i}`, ch, x, ly + rise, { size, bold: true, color, alpha: k, layer: 3 });
      x += this.widths[i] + track;
    });
    const tagA = ease((t - 0.7) / 0.7);
    const tagSize = Math.round(Math.max(15, size * 0.2));
    im.text('tl-tagS', 'Build the chain. Feed the world.', W / 2 + 1, ly + size * 1.3 + 2, { size: tagSize, color: 0x000000, align: 'center', alpha: tagA * 0.7, layer: 3 });
    im.text('tl-tag', 'Build the chain. Feed the world.', W / 2, ly + size * 1.3, { size: tagSize, color: 0xf0f4f8, align: 'center', alpha: tagA, layer: 3 });

    // The caption for the picture on show.
    const local = clock - Math.floor(clock / SHOW) * SHOW;
    const cap = TITLE_SLIDES[idx];
    const capA = ease(local / 0.9) * (1 - ease((local - (SHOW - 0.6)) / 0.6) * 0.0) * Math.min(1, ease((SHOW + FADE - local) / 0.8));
    const cx = Math.max(28, W * 0.05);
    const cy = H - Math.max(120, H * 0.17);
    im.rect(3, cx, cy + 2, 4, 62, COLORS.accent, capA);
    im.text('tl-chS', cap.head, cx + 19, cy + 2, { size: 30, bold: true, color: 0x000000, alpha: capA * 0.6, layer: 3 });
    im.text('tl-ch', cap.head, cx + 18, cy, { size: 30, bold: true, color: WHITE, alpha: capA, layer: 3 });
    im.text('tl-csS', cap.sub, cx + 19, cy + 41, { size: 15, color: 0x000000, alpha: capA * 0.6, wrap: Math.min(W * 0.5, 560), layer: 3 });
    im.text('tl-cs', cap.sub, cx + 18, cy + 40, { size: 15, color: 0xe3eaf1, alpha: capA, wrap: Math.min(W * 0.5, 560), layer: 3 });

    // Slide dots, bottom right.
    for (let i = 0; i < n; i++) im.circle(3, W - 28 - (n - 1 - i) * 16, H - 34, i === idx ? 5 : 3.5, i === idx ? COLORS.accent : 0xffffff, i === idx ? 1 : 0.4);

    if (!loading) {
      // The buttons.
      const bw = Math.min(330, W - 60);
      const bh = 54;
      const gap = 14;
      const items: { id: TitleChoice; label: string; primary: boolean }[] = this.hasSave
        ? [{ id: 'continue', label: 'Continue', primary: true }, { id: 'new', label: 'New game', primary: false }]
        : [{ id: 'new', label: 'New game', primary: true }];
      const by0 = Math.round(H * 0.5);
      items.forEach((it, i) => {
        const k = ease((t - 0.9 - i * 0.15) / 0.5);
        if (k <= 0) return;
        const bx = Math.round((W - bw) / 2);
        const by = Math.round(by0 + i * (bh + gap) + (1 - k) * 16);
        const hov = im.hit(`tl-b${it.id}`, bx, by, bw, bh, () => k > 0.9 && this.pick(it.id), 3);
        if (it.primary) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
          im.rect(2, bx - 6, by - 6, bw + 12, bh + 12, COLORS.accent, (0.1 + 0.1 * pulse + (hov ? 0.12 : 0)) * k, 12);
          im.rect(3, bx, by, bw, bh, hov ? 0xf4b24c : COLORS.accent, k, 6);
          im.text(`tl-bt${it.id}`, it.label.toUpperCase(), bx + bw / 2, by + 15, { size: 19, bold: true, color: 0x1b1204, align: 'center', alpha: k, layer: 3 });
        } else {
          im.rect(2, bx, by, bw, bh, hov ? 0x1c2735 : 0x0d131b, 0.72 * k, 6, hov ? COLORS.accent : 0xffffff, hov ? 1 : 0.28);
          im.text(`tl-bt${it.id}`, it.label.toUpperCase(), bx + bw / 2, by + 15, { size: 19, bold: true, color: hov ? COLORS.accent : WHITE, align: 'center', alpha: k, layer: 3 });
        }
      });
      const hintA = ease((t - 1.6) / 0.8) * (0.55 + 0.35 * Math.sin(t * 2.2));
      const hintY = by0 + items.length * (bh + gap) + 6;
      im.text('tl-hint', 'Press Enter to start', W / 2, hintY, { size: 13, color: 0xdbe3ec, align: 'center', alpha: hintA, layer: 3 });
    } else {
      // Loading: a bar that keeps moving while the world is made, and a tip.
      const bw = Math.min(420, W - 80);
      const bx = Math.round((W - bw) / 2);
      const by = Math.round(H * 0.52);
      const label = this.choice === 'continue' ? 'LOADING YOUR GAME' : 'BUILDING A NEW WORLD';
      im.text('tl-ld', label, W / 2, by - 30, { size: 14, bold: true, color: WHITE, align: 'center', layer: 3 });
      im.rect(3, bx, by, bw, 8, 0x0d131b, 0.8, 4, 0xffffff, 0.25);
      const run = (lt * 0.55) % 1;
      const head = Math.min(1, 0.12 + 0.88 * (1 - Math.exp(-lt * 0.9)));
      im.rect(4, bx, by, Math.max(10, bw * head), 8, COLORS.accent, 1, 4);
      im.rect(5, bx + (bw - 70) * run, by, 70, 8, 0xffffff, 0.22, 4);
      im.text('tl-tip', TIPS[Math.floor(lt / 4 + 2) % TIPS.length], W / 2, by + 28, { size: 14, color: 0xdbe3ec, align: 'center', wrap: Math.min(W - 60, 620), layer: 3 });
    }
    im.text('tl-ver', `Early build ${this.version}`, W - 24, 22, { size: 12, color: 0xaeb9c7, align: 'right', layer: 3 });

    // The fade up from black.
    const fadeIn = 1 - ease(t / 0.9);
    if (fadeIn > 0.002) im.rect(5, 0, 0, W, H, 0x000000, fadeIn);

    // Draw the loading screen for a couple of frames first, then make the world (which holds the page for a moment).
    if (this.choice && !this.fired && this.frames > 3 && lt > 0.25) {
      this.fired = true;
      const c = this.choice;
      setTimeout(() => this.onStart(c), 30);
    }
  }
}
