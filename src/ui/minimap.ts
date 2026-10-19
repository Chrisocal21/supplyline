// The minimap: a flat, wrapped picture of the whole world, drawn into a canvas texture the HUD shows in the corner.
// The terrain is painted once per world; roads, towns, buildings and the camera box go on top a few times a second.
import Phaser from 'phaser';
import { SITE_DEFS, type Terrain } from '../sim/defs';
import type { World } from '../sim/world';
import { R } from '../r3d/geo';

// A clean, flat palette: deep sea with a lighter shelf by the coast, soft green land, a pale beach line.
const LAND: Record<Terrain, [number, number, number]> = {
  water: [30, 66, 104],
  grass: [104, 150, 84],
  forest: [58, 110, 66],
  mountain: [146, 134, 120],
  ice: [226, 234, 240],
};
const SHALLOW: [number, number, number] = [52, 108, 150];
const BEACH: [number, number, number] = [214, 200, 150];

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
  /** Texture pixels per screen pixel, so markers keep a readable size on screen. */
  private k = 2;

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
      this.k = tw / w;
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
    const isWater = (x: number, y: number): boolean => y < 0 || y >= H || world.terrain[y * W + ((x % W) + W) % W] === 'water';
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const t = world.terrain[i];
        const e = (world.elev[i] ?? 128) / 255;
        let [r, g, b] = LAND[t] ?? LAND.grass;
        const next = isWater(x - 1, y) || isWater(x + 1, y) || isWater(x, y - 1) || isWater(x, y + 1);
        let k = 0.92 + e * 0.2;
        if (t === 'water') {
          // The shelf by the coast is lighter than the deep.
          const near = !next && (!isWater(x - 2, y) || !isWater(x + 2, y) || !isWater(x, y - 2) || !isWater(x, y + 2));
          const coast = [isWater(x - 1, y), isWater(x + 1, y), isWater(x, y - 1), isWater(x, y + 1)].some((v) => !v);
          if (coast || near) [r, g, b] = SHALLOW;
          k = 1;
        } else if (next && t !== 'ice') {
          [r, g, b] = BEACH;
          k = 1;
        }
        img.data[i * 4] = Math.min(255, r * k);
        img.data[i * 4 + 1] = Math.min(255, g * k);
        img.data[i * 4 + 2] = Math.min(255, b * k);
        img.data[i * 4 + 3] = 255;
      }
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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // The terrain, rolled so the camera sits in the middle.
    const shift = -(((off % W) + W) % W) * s;
    ctx.drawImage(this.base!, 0, 0, W, world.height, shift, 0, W * s, world.height * s);
    ctx.drawImage(this.base!, 0, 0, W, world.height, shift + W * s, 0, W * s, world.height * s);

    // Roads and track: only the stretches that own ground, so joined lanes are not drawn twice.
    const k = this.k;
    for (const r of world.routes) {
      if (r.over || r.mode === 'air' || r.mode === 'sea') continue;
      ctx.fillStyle = r.mode === 'rail' ? '#e4ded2' : r.grade === 'highway' ? '#ffd57a' : '#f4ecd8';
      const t0 = Math.max(s, k * 1.1);
      for (const t of r.path) ctx.fillRect(px(t.x) + s / 2 - t0 / 2, t.y * s + s / 2 - t0 / 2, t0, t0);
    }
    // Air and sea lanes as thin lines between their ends.
    for (const r of world.routes) {
      if (r.mode !== 'air' && r.mode !== 'sea') continue;
      const a = r.path[0];
      const b = r.path[r.path.length - 1];
      if (!a || !b) continue;
      ctx.strokeStyle = r.mode === 'air' ? 'rgba(235,245,255,0.7)' : 'rgba(150,215,255,0.75)';
      ctx.lineWidth = k * 0.9;
      ctx.setLineDash([k * 3, k * 2.5]);
      ctx.beginPath();
      const ax = px(a.x) + s / 2;
      let bx = px(b.x) + s / 2;
      if (Math.abs(bx - ax) > (W * s) / 2) bx += bx > ax ? -W * s : W * s;
      ctx.moveTo(ax, a.y * s + s / 2);
      ctx.lineTo(bx, b.y * s + s / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Towns: a pale block the size of the town's streets.
    for (const p of world.places) {
      // A round marker that grows a little with the town, the same size on screen whatever the world.
      const r = k * (4 + Math.min(4, p.level * 0.5));
      const cx = px(p.x) + s / 2;
      const cy = p.y * s + s / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r + k * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10,15,20,0.8)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#f6efe0';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#c9a35a';
      ctx.fill();
    }

    // The player's buildings.
    const d = k * 3.2;
    for (const site of world.sites) {
      const def = SITE_DEFS[site.kind];
      const cx = px(site.x) + s / 2;
      const cy = site.y * s + s / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, d + k * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10,15,20,0.85)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, d, 0, Math.PI * 2);
      ctx.fillStyle = SITE_COLOR[def?.category ?? 'logistics'] ?? '#d2b478';
      ctx.fill();
    }

    // The camera: a box the size of the view, turned to the camera heading, with a tick for "forward".
    const cx = (W / 2) * s + s / 2;
    const cy = view.y * s + s / 2;
    const bw = Math.max(k * 8, view.span * s);
    const bh = Math.max(k * 5, bw * 0.62);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(view.heading);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = k * 2.4;
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = k * 1.2;
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
