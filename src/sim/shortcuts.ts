// Drivers do not just follow the first road that was built between two buildings. As the network grows they take a quicker way
// over the roads that now exist, and an experienced driver knows shortcuts a rookie would not see: the longer someone has driven
// a route, the smaller the saving they notice and act on.
import { HIGHWAY_TIME } from './defs';
import { driverLevel, townStreets, wrapX, type Route, type Tile, type Vehicle, type World } from './world';

/** How much quicker a way has to be before a driver of each rank (rookie first) takes it. */
export const SHORTCUT_NEEDS = [0.12, 0.08, 0.05, 0.03, 0.01];
/** How often drivers look at the map again, in ticks. */
export const SHORTCUT_EVERY = 600;
/** While a new road has just opened, or a quicker way is waiting for the trucks to clear it, drivers look this often. */
export const SHORTCUT_SOON = 60;

type Graph = Map<number, Map<number, number>>;

const tileKey = (world: World, t: Tile): number => t.y * world.width + wrapX(world, t.x);

/** Every road tile joined to the next one along any road or built town street, with the time a driver needs to cross it: highway tiles are quicker. */
function roadGraph(world: World): { graph: Graph; at: Map<number, Tile> } {
  const graph: Graph = new Map();
  const at = new Map<number, Tile>();
  const link = (a: number, b: number, w: number): void => {
    let m = graph.get(a);
    if (!m) graph.set(a, (m = new Map()));
    const old = m.get(b);
    if (old === undefined || w < old) m.set(b, w);
  };
  for (const r of world.routes) {
    if (r.mode !== 'road') continue;
    const w = r.grade === 'highway' ? HIGHWAY_TIME : 1;
    for (let i = 0; i < r.path.length; i++) {
      const k = tileKey(world, r.path[i]);
      if (!at.has(k)) at.set(k, r.path[i]);
      if (i > 0) {
        const p = tileKey(world, r.path[i - 1]);
        link(p, k, w);
        link(k, p, w);
      }
    }
  }
  // A town's built streets are road too: a driver can cut through town as well as along the lanes.
  for (const p of world.places) {
    const streets = townStreets(world, p);
    for (const k of streets) {
      const x = k % world.width;
      const y = Math.floor(k / world.width);
      if (!at.has(k)) at.set(k, { x, y });
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const n = (y + dy) * world.width + wrapX(world, x + dx);
        if (!streets.has(n)) continue;
        if (!at.has(n)) at.set(n, { x: wrapX(world, x + dx), y: y + dy });
        link(k, n, 1);
        link(n, k, 1);
      }
    }
  }
  return { graph, at };
}

/** The time a route's own path takes to drive, on the same scale as the graph. */
function pathCost(world: World, graph: Graph, path: Tile[]): number {
  let c = 0;
  for (let i = 1; i < path.length; i++) c += graph.get(tileKey(world, path[i - 1]))?.get(tileKey(world, path[i])) ?? 1;
  return c;
}

/** The quickest way between two road tiles over the roads that exist, or null. A plain Dijkstra with a small binary heap. */
function quickest(graph: Graph, from: number, to: number, limit: number): number[] | null {
  const dist = new Map<number, number>([[from, 0]]);
  const prev = new Map<number, number>();
  const heap: [number, number][] = [[0, from]];
  const push = (d: number, k: number): void => {
    heap.push([d, k]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  while (heap.length > 0) {
    const [d, k] = pop();
    if (k === to) break;
    if (d > (dist.get(k) ?? Infinity) || d > limit) continue;
    for (const [n, w] of graph.get(k) ?? []) {
      const nd = d + w;
      if (nd < (dist.get(n) ?? Infinity)) {
        dist.set(n, nd);
        prev.set(n, k);
        push(nd, n);
      }
    }
  }
  if (!dist.has(to)) return null;
  const out = [to];
  while (out[out.length - 1] !== from) out.push(prev.get(out[out.length - 1])!);
  return out.reverse();
}

/** The best driver on a route sets how small a saving gets noticed: they show the others the way. */
function bestRank(world: World, route: Route): number {
  let best = -1;
  for (const v of world.vehicles) if (v.routeId === route.id) best = Math.max(best, driverLevel(v) - 1);
  return best;
}

/**
 * Look at every road route again over the roads that exist now. Where a quicker way has opened up, and the drivers on the route
 * are experienced enough to notice it, the route takes it: its trucks carry on along the new way from wherever they are.
 * Returns how many routes changed.
 */
export function optimizeRoutes(world: World): number {
  const { graph, at } = roadGraph(world);
  let changed = 0;
  let waiting = false;
  for (const r of world.routes) {
    if (r.mode !== 'road' || r.free || r.seg || r.grade === undefined || r.path.length < 4) continue;
    const rank = bestRank(world, r);
    if (rank < 0) continue;
    const start = tileKey(world, r.path[0]);
    const end = tileKey(world, r.path[r.path.length - 1]);
    const cost = pathCost(world, graph, r.path);
    const keys = quickest(graph, start, end, cost);
    if (!keys) continue;
    const path = keys.map((k) => at.get(k)!);
    const quickCost = pathCost(world, graph, path);
    if (quickCost > cost * (1 - SHORTCUT_NEEDS[rank])) continue;
    // Trucks already on the road carry on from the same tile; if one is somewhere the new way does not go, wait for a quieter moment.
    const index = new Map(keys.map((k, i) => [k, i]));
    const moves = new Map<Vehicle, number>();
    let blocked = false;
    for (const v of world.vehicles) {
      if (v.routeId !== r.id) continue;
      const last = r.path.length - 1;
      if (v.idx <= 0) moves.set(v, 0);
      else if (v.idx >= last) moves.set(v, path.length - 1);
      else {
        const to = index.get(tileKey(world, r.path[v.idx]));
        if (to === undefined) {
          blocked = true;
          break;
        }
        moves.set(v, to);
      }
    }
    if (blocked) {
      // A truck is on a stretch the new way does not use: look again soon, when it has driven on.
      waiting = true;
      continue;
    }
    for (const [v, i] of moves) v.idx = i;
    const hw = path.reduce((n, t, i) => n + (i > 0 && (graph.get(tileKey(world, path[i - 1]))?.get(tileKey(world, t)) ?? 1) < 1 ? 1 : 0), 0);
    r.grade = hw * 2 > path.length - 1 ? 'highway' : 'street';
    r.path = path;
    changed += 1;
  }
  world.shortcutsDirty = waiting;
  return changed;
}
