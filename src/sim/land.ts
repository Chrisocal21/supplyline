// Land plots, the way a farming game lays out a map: the ground is a patchwork of plots of different sizes standing edge to
// edge, and you buy the plot before you build on it. Plots come from a fixed grid of 4-tile cells (the same 4-tile step the
// resource nodes stand on), merged into blocks of 1x1, 2x1, 1x2 or 2x2 cells by a seeded roll, so a world always has the same
// plots. Ground a town has set aside is the town's and cannot be bought. Plots are bought, never sold, and nothing that
// stands is ever moved by a purchase.
//
// The rules apply only to worlds that switch them on (world.landRules), which new games do: worlds from tests and older
// saves build where they like, as before.
import { plannedTownAt, terrainAt, townTiles, wrapX, type World } from './world';

export const CELL = 4;
export const LAND_PREFIX = 'Plot for sale';

export interface Parcel {
  id: number;
  /** Top-left tile, and size in tiles. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Tiles that are not water or ice. */
  land: number;
  /** Any of it is ground a town has set aside. */
  town: boolean;
  /** Resource nodes inside, by quality (0 to 2). */
  nodes: number[];
  /** Cost of the ground itself, before the nearness-to-town premium. */
  value: number;
  /** Tiles from the nearest town centre. */
  townDist: number;
}

interface Grid {
  parcels: Parcel[];
  of: Int32Array;
}

const grids = new WeakMap<object, Grid>();

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PER_TILE = { grass: 14, forest: 9, mountain: 7, water: 0, ice: 0 } as const;

/** Every plot of a world and, for each tile, the plot it is in (-1 for none). Made once per world. */
export function parcelsOf(world: World): Grid {
  const hit = grids.get(world.terrain);
  if (hit) return hit;
  const W = world.width;
  const H = world.height;
  const cw = Math.max(1, Math.floor(W / CELL));
  const ch = Math.ceil(H / CELL);
  const taken = new Uint8Array(cw * ch);
  const r = rng(world.seed ^ 0x1a2b3c);
  const of = new Int32Array(W * H).fill(-1);
  const parcels: Parcel[] = [];
  const town = new Set<number>();
  for (const p of world.places) for (const t of townTiles(world, p)) town.add(t.y * W + wrapX(world, t.x));
  const nodeAt = new Map<number, number>();
  for (const n of world.nodes) nodeAt.set(n.y * W + wrapX(world, n.x), n.quality);
  const free = (cx: number, cy: number): boolean => cy < ch && !taken[cy * cw + (cx % cw)];
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      if (taken[cy * cw + cx]) continue;
      const roll = r();
      let sw = roll < 0.35 ? 1 : roll < 0.55 ? 2 : roll < 0.75 ? 1 : 2;
      let sh = roll < 0.35 ? 1 : roll < 0.55 ? 1 : roll < 0.75 ? 2 : 2;
      if (!free(cx + sw - 1, cy) || (sw === 2 && cx + 1 >= cw)) sw = 1;
      if (sh === 2 && (!free(cx, cy + 1) || !free(cx + sw - 1, cy + 1))) sh = 1;
      for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) taken[(cy + j) * cw + ((cx + i) % cw)] = 1;
      const id = parcels.length;
      const x0 = cx * CELL;
      const y0 = cy * CELL;
      // The last column takes any tiles left over when the width is not a multiple of the cell.
      const w = sw * CELL + (cx + sw === cw ? W - cw * CELL : 0);
      const h = Math.min(sh * CELL, H - y0);
      const p: Parcel = { id, x: x0, y: y0, w, h, land: 0, town: false, nodes: [], value: 0, townDist: Infinity };
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          const k = y * W + wrapX(world, x);
          of[k] = id;
          const t = terrainAt(world, wrapX(world, x), y);
          if (t === null || t === 'water' || t === 'ice') continue;
          p.land += 1;
          p.value += PER_TILE[t];
          // Ground a town holds is the town's from the first day: where it stands now, and where it will have grown to.
          if (town.has(k) || plannedTownAt(world, wrapX(world, x), y)) p.town = true;
          const q = nodeAt.get(k);
          if (q !== undefined) p.nodes.push(q);
        }
      }
      const cx0 = x0 + w / 2;
      const cy0 = y0 + h / 2;
      for (const pl of world.places) {
        let dx = Math.abs(pl.x - cx0);
        dx = Math.min(dx, W - dx);
        p.townDist = Math.min(p.townDist, Math.hypot(dx, pl.y - cy0));
      }
      for (const q of p.nodes) p.value += 120 + q * 80;
      parcels.push(p);
    }
  }
  const grid = { parcels, of };
  grids.set(world.terrain, grid);
  return grid;
}

export function parcelAt(world: World, x: number, y: number): Parcel | null {
  if (y < 0 || y >= world.height) return null;
  const id = parcelsOf(world).of[y * world.width + wrapX(world, x)];
  return id < 0 ? null : parcelsOf(world).parcels[id];
}

const ownedSets = new WeakMap<object, { n: number; set: Set<number> }>();
export function ownedSet(world: World): Set<number> {
  const list = world.owned ?? [];
  const hit = ownedSets.get(list);
  if (hit && hit.n === list.length) return hit.set;
  const set = new Set(list);
  ownedSets.set(list, { n: list.length, set });
  return set;
}

/** owned and free plots can be built on; free ones hold only an impure node, which anyone may work at no cost. */
export type ParcelState = 'owned' | 'free' | 'sale' | 'town' | 'none';

export function parcelState(world: World, p: Parcel): ParcelState {
  if (ownedSet(world).has(p.id)) return 'owned';
  if (p.land < (p.w * p.h) / 2) return 'none';
  // Impure nodes are free to build on, wherever they are.
  if (p.nodes.length > 0 && Math.max(...p.nodes) === 0) return 'free';
  // A plot touching a town's ground belongs to the town, unless a resource node lies in it: that must stay for sale.
  if (p.town && p.nodes.length === 0) return 'town';
  return 'sale';
}

/**
 * What a plot costs: the ground, dearer the nearer a town it lies. A plot with a normal node is half price, and one with an
 * impure node is free. A plot with a pure node, or no node, costs the full price.
 */
export function parcelPrice(p: Parcel): number {
  const near = p.townDist < 10 ? 1.5 : p.townDist < 20 ? 1.2 : 1;
  const best = p.nodes.length > 0 ? Math.max(...p.nodes) : 2;
  if (best === 0) return 0;
  const full = Math.max(60, Math.round((p.value * near) / 10) * 10);
  return best === 1 ? Math.max(30, Math.round(full / 2 / 10) * 10) : full;
}

/** Why a building cannot go on these tiles for want of the land, or null. A plot for sale says what it costs. */
export function landError(world: World, tiles: { x: number; y: number }[]): string | null {
  if (!world.landRules) return null;
  for (const t of tiles) {
    // Ground a town will grow over is the town's, whatever plot it lies in.
    if (plannedTownAt(world, t.x, t.y)) return 'That ground belongs to the town';
    const p = parcelAt(world, t.x, t.y);
    if (!p) continue;
    const state = parcelState(world, p);
    if (state === 'owned' || state === 'free' || state === 'none') continue;
    if (state === 'town') return 'That ground belongs to the town';
    return `${LAND_PREFIX}: $${parcelPrice(p).toLocaleString('en-US')} (click to buy it, then click again to build)`;
  }
  return null;
}

export function buyParcel(world: World, id: number): string | null {
  const p = parcelsOf(world).parcels[id];
  if (!p) return 'No such plot';
  const state = parcelState(world, p);
  if (state === 'owned') return 'You already own this plot';
  if (state === 'free') return 'This ground is free to build on';
  if (state !== 'sale') return 'This ground is not for sale';
  const price = parcelPrice(p);
  if (world.money < price) return `Need $${price.toLocaleString('en-US')} to buy this plot`;
  world.money -= price;
  world.owned = [...(world.owned ?? []), id];
  return null;
}

/** Switch the land rules on for a new world and hand over the first plots: the start town's nearest forest, field and meadow. */
export function enableLandRules(world: World): void {
  world.landRules = true;
  world.growRoom = true;
  world.owned = [];
  const home = world.places[0];
  if (!home) return;
  for (const kind of ['forest', 'farmland', 'pasture'] as const) {
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (const n of world.nodes) {
      if (n.kind !== kind) continue;
      let dx = Math.abs(n.x - home.x);
      dx = Math.min(dx, world.width - dx);
      const d = Math.hypot(dx, n.y - home.y);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    const p = best ? parcelAt(world, best.x, best.y) : null;
    if (p && !world.owned.includes(p.id)) world.owned.push(p.id);
  }
}
