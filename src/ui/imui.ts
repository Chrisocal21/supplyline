// A tiny immediate-mode UI layer on top of Phaser. Each frame the HUD describes what it wants drawn
// (rects, text, images, buttons); pooled display objects are reused and unused ones are hidden.
import Phaser from 'phaser';

export const FONT = "'Segoe UI', 'Inter', system-ui, -apple-system, Roboto, sans-serif";
const TEXT_RES = Math.max(2, Math.ceil(window.devicePixelRatio || 1));

export const COLORS = {
  panel: 0x10151c,
  panelAlt: 0x161d27,
  line: 0x2b3542,
  text: 0xe8edf2,
  muted: 0x8f9bab,
  accent: 0xe8a23a,
  good: 0x4cc38a,
  warn: 0xe0a93e,
  bad: 0xe5604f,
  info: 0x58a6e8,
};
export const css = (n: number): string => '#' + n.toString(16).padStart(6, '0');

export interface TextOpts {
  size?: number;
  color?: number;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  layer?: number;
  stroke?: number;
  wrap?: number;
  alpha?: number;
  spacing?: boolean;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Pooled = Phaser.GameObjects.Text & { _sig?: string };

export class Im {
  private readonly gfx: Phaser.GameObjects.Graphics[] = [];
  private readonly texts = new Map<string, Pooled>();
  private readonly images = new Map<string, Phaser.GameObjects.Image>();
  private readonly zones = new Map<string, Phaser.GameObjects.Zone>();
  private readonly handlers = new Map<string, () => void>();
  private usedT = new Set<string>();
  private usedI = new Set<string>();
  private usedZ = new Set<string>();
  /** Areas that swallow pointer input, so clicks do not fall through to the 3D world. */
  blockers: Box[] = [];
  hoverId: string | null = null;
  private tipId: string | null = null;

  /** Hit areas are clipped to this box when set. Pixels are clipped by drawing into a layer seen by a small camera. */
  clipBox: Box | null = null;
  private readonly maxLayer: number;

  constructor(
    private readonly scene: Phaser.Scene,
    layers = 4,
    private readonly home?: Phaser.GameObjects.Layer,
  ) {
    this.maxLayer = layers - 1;
    for (let i = 0; i < layers; i++) {
      const g = scene.add.graphics().setDepth(i * 10);
      home?.add(g);
      this.gfx.push(g);
    }
  }

  private L(layer: number): number {
    return Math.min(layer, this.maxLayer);
  }

  begin(): void {
    for (const g of this.gfx) g.clear();
    this.usedT.clear();
    this.usedI.clear();
    this.usedZ.clear();
    this.blockers = [];
    this.handlers.clear();
    this.tipId = null;
  }

  end(): void {
    for (const [k, t] of this.texts) if (!this.usedT.has(k)) t.setVisible(false);
    for (const [k, i] of this.images) if (!this.usedI.has(k)) i.setVisible(false);
    for (const [k, z] of this.zones) {
      if (!this.usedZ.has(k)) {
        z.setActive(false).setVisible(false);
        z.input && (z.input.enabled = false);
        if (this.hoverId === k) this.hoverId = null;
      }
    }
  }

  /** Is a screen point over any blocking area? */
  blocked(x: number, y: number): boolean {
    return this.blockers.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  }

  block(b: Box): void {
    this.blockers.push(b);
  }

  rect(layer: number, x: number, y: number, w: number, h: number, fill: number, alpha = 1, radius = 0, line?: number, lineAlpha = 1, lineWidth = 1): void {
    const g = this.gfx[this.L(layer)];
    g.fillStyle(fill, alpha);
    if (radius > 0) g.fillRoundedRect(x, y, w, h, radius);
    else g.fillRect(x, y, w, h);
    if (line !== undefined) {
      g.lineStyle(lineWidth, line, lineAlpha);
      if (radius > 0) g.strokeRoundedRect(x, y, w, h, radius);
      else g.strokeRect(x, y, w, h);
    }
  }

  circle(layer: number, x: number, y: number, r: number, fill: number, alpha = 1): void {
    this.gfx[this.L(layer)].fillStyle(fill, alpha).fillCircle(x, y, r);
  }

  /** A ring gauge: a faint track and a coloured arc covering `ratio` of the circle, starting at the top. */
  ring(layer: number, x: number, y: number, r: number, thick: number, ratio: number, color: number): void {
    const g = this.gfx[this.L(layer)];
    g.fillStyle(0x0b0f14, 0.8).fillCircle(x, y, r + thick * 0.8);
    g.lineStyle(thick, 0xffffff, 0.16).strokeCircle(x, y, r);
    if (ratio <= 0.01) return;
    g.lineStyle(thick, color, 1);
    g.beginPath();
    g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, ratio), false);
    g.strokePath();
  }

  line(layer: number, x0: number, y0: number, x1: number, y1: number, color: number, alpha = 1, width = 1): void {
    this.gfx[this.L(layer)].lineStyle(width, color, alpha).lineBetween(x0, y0, x1, y1);
  }

  bar(layer: number, x: number, y: number, w: number, h: number, ratio: number, color: number): void {
    this.rect(layer, x, y, w, h, 0xffffff, 0.12, h / 2);
    if (ratio > 0) this.rect(layer, x, y, Math.max(h, w * Math.min(1, ratio)), h, color, 1, h / 2);
  }

  /** Draw text. Returns its pixel size, so callers can lay things out around it. */
  text(id: string, str: string, x: number, y: number, o: TextOpts = {}): { w: number; h: number } {
    const size = o.size ?? 13;
    const color = o.color ?? COLORS.text;
    const sig = `${size}|${color}|${o.bold ? 1 : 0}|${o.stroke ?? -1}|${o.wrap ?? 0}|${o.align ?? 'left'}`;
    let t = this.texts.get(id);
    if (!t) {
      t = this.scene.add.text(0, 0, '', { fontFamily: FONT, resolution: TEXT_RES }) as Pooled;
      this.home?.add(t);
      this.texts.set(id, t);
    }
    if (t._sig !== sig) {
      t._sig = sig;
      t.setStyle({
        fontFamily: FONT,
        fontSize: `${size}px`,
        color: css(color),
        fontStyle: o.bold ? 'bold' : 'normal',
        stroke: o.stroke !== undefined ? css(o.stroke) : undefined,
        strokeThickness: o.stroke !== undefined ? 3 : 0,
        wordWrap: o.wrap ? { width: o.wrap } : undefined,
        align: o.align ?? 'left',
        resolution: TEXT_RES,
      });
    }
    t.setText(str);
    const ox = o.align === 'center' ? 0.5 : o.align === 'right' ? 1 : 0;
    t.setOrigin(ox, 0).setPosition(Math.round(x), Math.round(y)).setDepth(this.L(o.layer ?? 1) * 10 + 5).setAlpha(o.alpha ?? 1).setVisible(true);
    this.usedT.add(id);
    return { w: t.width, h: t.height };
  }

  image(id: string, key: string, x: number, y: number, w: number, h: number, alpha = 1, layer = 1): void {
    let i = this.images.get(id);
    if (!i) {
      i = this.scene.add.image(0, 0, key);
      this.home?.add(i);
      this.images.set(id, i);
    }
    if (i.texture.key !== key) i.setTexture(key);
    i.setOrigin(0, 0).setPosition(x, y).setDisplaySize(w, h).setAlpha(alpha).setDepth(this.L(layer) * 10 + 4).setVisible(true);
    this.usedI.add(id);
  }

  private touchDown: { id: string; x: number; y: number } | null = null;

  /** A clickable area. Returns whether the pointer is over it. */
  hit(id: string, x: number, y: number, w: number, h: number, onClick: () => void, layer = 1): boolean {
    const c = this.clipBox;
    if (c) {
      const x0 = Math.max(x, c.x);
      const y0 = Math.max(y, c.y);
      const x1 = Math.min(x + w, c.x + c.w);
      const y1 = Math.min(y + h, c.y + c.h);
      if (x1 <= x0 || y1 <= y0) return false;
      x = x0;
      y = y0;
      w = x1 - x0;
      h = y1 - y0;
    }
    let z = this.zones.get(id);
    if (!z) {
      z = this.scene.add.zone(0, 0, w, h).setOrigin(0, 0);
      z.setInteractive({ useHandCursor: true });
      z.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.button !== 0) return;
        // A finger fires on lift, so dragging a list to scroll it does not press what it started on.
        if (p.wasTouch) this.touchDown = { id, x: p.x, y: p.y };
        else this.handlers.get(id)?.();
      });
      z.on('pointerup', (p: Phaser.Input.Pointer) => {
        const t = this.touchDown;
        this.touchDown = null;
        if (t && t.id === id && p.wasTouch && Math.hypot(p.x - t.x, p.y - t.y) < 14) this.handlers.get(id)?.();
      });
      z.on('pointerover', () => (this.hoverId = id));
      z.on('pointerout', () => {
        if (this.hoverId === id) this.hoverId = null;
      });
      this.zones.set(id, z);
    }
    z.setActive(true).setVisible(true).setPosition(x, y).setSize(w, h).setDepth(this.L(layer) * 10 + 9);
    if (z.input) {
      z.input.enabled = true;
      (z.input.hitArea as Phaser.Geom.Rectangle).setTo(0, 0, w, h);
    }
    this.handlers.set(id, onClick);
    this.usedZ.add(id);
    this.block({ x, y, w, h });
    return this.hoverId === id;
  }

  /** Remember which hit area wants a tooltip this frame. */
  tip(id: string | null): void {
    this.tipId = id;
  }
  get tipTarget(): string | null {
    return this.tipId;
  }
}
