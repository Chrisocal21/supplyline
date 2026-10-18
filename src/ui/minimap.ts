// The minimap: a flat, wrapped picture of the whole world, drawn into a canvas texture the HUD shows in the corner.
// The terrain is painted once per world; roads, towns, buildings and the camera box go on top a few times a second.
import Phaser from 'phaser';
import { SITE_DEFS, type Terrain } from '../sim/defs';
import type { World } from '../sim/world';
import { R } from '../r3d/geo';

const LAND: Record<Terrain, [number, number, number]> = {
  water: [24, 52, 78],
  grass: [82, 112, 60],
  forest: [42, 78, 44],
  mountain: [116, 108, 96],
  ice: [214, 222, 228],
};

const SITE_COLOR: Record<string, string> = {
  production: '#9fd36a',
  processing: '#f0a64a',
  manufacturing: '#6fb4f0',
  heavy: '#e0655a',
  logistics: '#d2b478',
};

/** Where the camera looks, in tiles, and how much ground it shows. */
export interface MinimapView {
  x: number;
  y: number;
  /** Width of the ground in view, in tiles. */
  span: number;
  heading: number;
}

/** Camera focus to tile coordinates (the inverse of tileLonLat). */
export function viewTile(world: World, lon: number, lat: number): { x: number; y: number } {
  const W = world.width;
  return { x: ((lon + Math.PI) / (Math.PI * 2)) * W - 0.5, y: world.height / 2 - (lat * W) / (Math.PI * 2) - 0.5 };
}

/** How many tiles across the camera shows from a distance, roughly. */
export function viewSpan(world: World, dist: number, aspect: number): number {
  const tile = (Math.PI * 2 * R) / world.width;
  return (2 * Math.tan((22.5 * Math.PI) / 180) * dist * aspect) / tile;
}

export class Minimap {
  private tex: Phaser.Textures.CanvasTexture | null = null;
  private base: HTMLCanvasElement | null = null;
  private baseWorld: World | null = null;
  private baseTerrain: Terrain[] | null = null;
  private last = -1e9;
  /** Pixels per tile in the texture. */
  private s = 2;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly key = 'minimap',
  ) {}

  /** Tile at the left edge of the picture, so the camera stays in the middle as the world wraps. */
  offset = 0;

  /** Repaint if it is time. Returns the texture key, sized for a map w pixels wide on screen. */
  draw(world: World, view: MinimapView, w: number, now: number): string {
    const s = Math.max(1, Math.ceil((w * 2) / world.width));
    const tw = world.width * s;
    const th = world.height * s;
    if (!this.tex || this.tex.width !== tw || this.tex.height !== th) {
      if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
      this.tex = this.scene.textures.createCanvas(this.key, tw, th);
      this.s = s;
      this.last = -1e9;
    }
    if (this.baseWorld !== world || this.baseTerrain !== world.terrain) this.paintBase(world);
    if (now - this.last < 250) return this.key;
    this.last = now;
    this.compose(world, view);
    return this.key;
  }

  private paintBase(world: World): void {
    const W = world.width;
    const H = world.height;
    const c = this.base ?? document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const t = world.terrain[i];
      const e = (world.elev[i] ?? 128) / 255;
      const [r, g, b] = LAND[t] ?? LAND.grass;
      // Land lightens with height; water darkens away from the shore a little.
      const k = t === 'water' ? 0.85 + e * 0.4 : 0.75 + e * 0.55;
      img.data[i * 4] = Math.min(255, r * k);
      img.data[i * 4 + 1] = Math.min(255, g * k);
      img.data[i * 4 + 2] = Math.min(255, b * k);
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.base = c;
    this.baseWorld = world;
    this.baseTerrain = world.terrain;
  }

  private compose(world: World, view: MinimapView): void {
    const tex = this.tex!;
    const ctx = tex.getContext();
    const W = world.width;
    const s = this.s;
    const off = view.x - W / 2;
    this.offset = off;
    const px = (x: number): number => ((((x - off) % W) + W) % W) * s;
    ctx.imageSmoothingEnabled = false;
    // The terrain, rolled so the camera sits in the middle.
    const shift = -(((off % W) + W) % W) * s;
    ctx.drawImage(this.base!, 0, 0, W, world.height, shift, 0, W * s, world.height * s);
    ctx.drawImage(this.base!, 0, 0, W, world.height, shift + W * s, 0, W * s, world.height * s);

    // Roads and track: only the stretches that own ground, so joined lanes are not drawn twice.
    for (const r of world.routes) {
      if (r.over || r.mode === 'air' || r.mode === 'sea') continue;
      ctx.fillStyle = r.mode === 'rail' ? '#b9b2a6' : r.grade === 'highway' ? '#f2c66a' : '#e8dcc0';
      for (const t of r.path) ctx.fillRect(px(t.x), t.y * s, s, s);
    }
    // Air and sea lanes as thin lines between their ends.
    for (const r of world.routes) {
      if (r.mode !== 'air' && r.mode !== 'sea') continue;
      const a = r.path[0];
      const b = r.path[r.path.length - 1];
      if (!a || !b) continue;
      ctx.strokeStyle = r.mode === 'air' ? 'rgba(220,235,255,0.6)' : 'rgba(120,200,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const ax = px(a.x) + s / 2;
      let bx = px(b.x) + s / 2;
      if (Math.abs(bx - ax) > (W * s) / 2) bx += bx > ax ? -W * s : W * s;
      ctx.moveTo(ax, a.y * s + s / 2);
      ctx.lineTo(bx, b.y * s + s / 2);
      ctx.stroke();
    }

    // Towns: a pale block the size of the town's streets.
    for (const p of world.places) {
      const r = Math.max(2, (p.radius + 0.5) * s * 0.75);
      const cx = px(p.x) + s / 2;
      const cy = p.y * s + s / 2;
      ctx.fillStyle = 'rgba(236,226,204,0.5)';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.strokeStyle = 'rgba(250,244,230,0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - r + 0.5, cy - r + 0.5, r * 2 - 1, r * 2 - 1);
    }

    // The player's buildings.
    const d = Math.max(3, s + 1);
    for (const site of world.sites) {
      const def = SITE_DEFS[site.kind];
      ctx.fillStyle = SITE_COLOR[def?.category ?? 'logistics'] ?? '#d2b478';
      ctx.fillRect(px(site.x) + s / 2 - d / 2, site.y * s + s / 2 - d / 2, d, d);
    }

    // The camera: a box the size of the view, turned to the camera heading, with a tick for "forward".
    const cx = (W / 2) * s + s / 2;
    const cy = view.y * s + s / 2;
    const bw = Math.max(6, view.span * s);
    const bh = Math.max(4, bw * 0.62);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(view.heading);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    ctx.beginPath();
    ctx.moveTo(0, -bh / 2);
    ctx.lineTo(0, -bh / 2 - Math.max(4, bh * 0.35));
    ctx.stroke();
    ctx.restore();
    tex.refresh();
  }

  /** Screen point inside the map (0..1 across and down) to a world tile. */
  tileAt(world: World, u: number, v: number): { x: number; y: number } {
    const W = world.width;
    const x = Math.floor((((this.offset + u * W) % W) + W) % W);
    const y = Math.max(0, Math.min(world.height - 1, Math.floor(v * world.height)));
    return { x, y };
  }
}
