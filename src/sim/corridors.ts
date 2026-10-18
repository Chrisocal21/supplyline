// Natural corridors between neighbouring towns: the ground a road or railway would most sensibly take, worked out from the
// land alone (flat ground cheap, forest dearer, a mountain crossed where it is lowest, water bridged where it is narrow).
// They are never saved. The world generator keeps resource nodes off them and the scenery keeps its trees off them, so
// the routes players will want stay open, and a pass through a range is found once and stays free.
import type { Terrain } from './defs';
import type { Place } from './features';

export interface CorridorEnv {
  width: number;
  height: number;
  terrain: Terrain[];
  elev?: number[];
  places: Place[];
}

/** Each town is joined to this many of its nearest neighbours. */
const LINKS = 2;
/** How far beyond the two towns the search may wander, in tiles. */
const MARGIN = 7;

const STEP_COST: Record<Terrain, number> = { grass: 1, forest: 1.7, mountain: 6, water: 12, ice: Infinity };

const cache = new WeakMap<Place[], { n: number; terrain: Terrain[]; tiles: Set<number> }>();

/** The tiles (as y * width + x) on the corridors between a world's towns. */
export function corridorTiles(env: CorridorEnv): Set<number> {
  const hit = cache.get(env.places);
  if (hit && hit.n === env.places.length && hit.terrain === env.terrain) return hit.tiles;
  const tiles = build(env);
  cache.set(env.places, { n: env.places.length, terrain: env.terrain, tiles });
  return tiles;
}

function build(env: CorridorEnv): Set<number> {
  const { width: W, height: H, terrain, elev, places } = env;
  const out = new Set<number>();
  const wdx = (d: number): number => d - Math.round(d / W) * W;
  const pairs = new Set<string>();
  const edges: [Place, Place][] = [];
  for (const a of places) {
    const near = places
      .filter((b) => b !== a)
      .map((b) => ({ b, d: Math.hypot(wdx(b.x - a.x), b.y - a.y) }))
      .sort((p, q) => p.d - q.d)
      .slice(0, LINKS);
    for (const { b } of near) {
      const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
      if (pairs.has(key)) continue;
      pairs.add(key);
      edges.push([a, b]);
    }
  }
  for (const [a, b] of edges) {
    for (const t of route(a, b)) out.add(t);
  }
  return out;

  function route(a: Place, b: Place): number[] {
    // Work in a window around the pair, with x unwrapped so a route across the seam is found.
    const bx = a.x + wdx(b.x - a.x);
    const x0 = Math.min(a.x, bx) - MARGIN;
    const x1 = Math.max(a.x, bx) + MARGIN;
    const y0 = Math.max(0, Math.min(a.y, b.y) - MARGIN);
    const y1 = Math.min(H - 1, Math.max(a.y, b.y) + MARGIN);
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const at = (x: number, y: number): number => (y - y0) * w + (x - x0);
    const real = (x: number, y: number): number => y * W + ((x % W) + W) % W;
    // The towns themselves cost a lot to cross: a corridor runs between towns, not through them.
    const solid = new Float64Array(w * h);
    for (const p of places) {
      const px = a.x + wdx(p.x - a.x);
      const r = (p.radius ?? 3) + 1;
      if (p === a || p === b) continue;
      for (let y = Math.max(y0, p.y - r); y <= Math.min(y1, p.y + r); y++) for (let x = Math.max(x0, px - r); x <= Math.min(x1, px + r); x++) solid[at(x, y)] = 40;
    }
    const dist = new Float64Array(w * h).fill(Infinity);
    const from = new Int32Array(w * h).fill(-1);
    const heap: [number, number][] = [];
    const push = (d: number, i: number): void => {
      heap.push([d, i]);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heap[p][0] <= heap[k][0]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = (): [number, number] => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1;
          const r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };
    const start = at(a.x, a.y);
    const goal = at(bx, b.y);
    dist[start] = 0;
    push(0, start);
    while (heap.length > 0) {
      const [d, i] = pop();
      if (d > dist[i]) continue;
      if (i === goal) break;
      const x = (i % w) + x0;
      const y = Math.floor(i / w) + y0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
        const r = real(nx, ny);
        const t = terrain[r];
        let c = STEP_COST[t];
        if (c === Infinity) continue;
        // A mountain is cheapest where it is lowest: that is the pass.
        if (t === 'mountain' && elev) c += Math.max(0, elev[r] - 180) * 0.12;
        const j = at(nx, ny);
        const nd = d + c + solid[j];
        if (nd < dist[j]) {
          dist[j] = nd;
          from[j] = i;
          push(nd, j);
        }
      }
    }
    const path: number[] = [];
    if (dist[goal] === Infinity) return path;
    for (let i = goal; i !== -1; i = from[i]) {
      const x = (i % w) + x0;
      const y = Math.floor(i / w) + y0;
      path.push(real(x, y));
      if (i === start) break;
    }
    return path;
  }
}
