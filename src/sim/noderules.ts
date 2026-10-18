// The placement rules for resource nodes, in one place so the world generator and the map maker agree. Nodes come in
// families that belong together the way they do on a real map: fields, pasture and orchards run side by side along a road
// like a farm belt, and coal, mines and quarries share a mining district at the foot of a range. Kinds from different
// families keep well apart, so no spot is a pile-up of unrelated things, and a family cannot grow into one endless blob.
import type { NodeKind } from './defs';

export type NodeFamily = 'farming' | 'mining' | 'woods' | 'shore' | 'island';

export const NODE_FAMILY: Record<NodeKind, NodeFamily> = {
  farmland: 'farming',
  pasture: 'farming',
  orchard: 'farming',
  quarry: 'mining',
  mine: 'mining',
  coal: 'mining',
  forest: 'woods',
  clay: 'shore',
  coffee: 'island',
  mango: 'island',
  oil: 'island',
};

/** Tiles between two nodes of the same family: they may stand next to each other, with room for their yards. */
export const SAME_GAP = 3;
/** Tiles between nodes of different families. */
export const OTHER_GAP = 7;
/** A family's cluster: no more than CLUSTER_MAX of one family within CLUSTER_RADIUS tiles, so a belt is a belt, not a field of them. */
export const CLUSTER_RADIUS = 9;
export const CLUSTER_MAX = 6;
/** Woods are the exception: a forest of any size is dotted with forestry nodes, one for each stand of trees. */
const CLUSTER_CAP: Partial<Record<NodeFamily, number>> = { woods: 14 };
const capOf = (family: NodeFamily): number => CLUSTER_CAP[family] ?? CLUSTER_MAX;
/** Nodes of a belt stand on a square lattice this many tiles apart, in straight rows and columns. */
export const PITCH = 4;
/** When choosing where the next node of a family goes, this share of the time it joins an existing one (a blend). */
export const BLEND_CHANCE = 0.65;

interface Spot {
  kind: NodeKind;
  x: number;
  y: number;
}

function wrapDelta(a: number, b: number, width: number): number {
  let d = b - a;
  if (d > width / 2) d -= width;
  if (d < -width / 2) d += width;
  return d;
}

/** Tiles apart, the greater of the two distances (Chebyshev), around the globe. */
export function nodeGap(a: Spot, b: Spot, width: number): number {
  return Math.max(Math.abs(wrapDelta(a.x, b.x, width)), Math.abs(a.y - b.y));
}

/**
 * The nodes placed so far, with each one's belt size worked out once, so a whole region of tiles can be tested quickly.
 * Make a new one whenever a node is added.
 */
export class NodeBook {
  private readonly around: number[];

  constructor(
    private readonly nodes: Spot[],
    private readonly width: number,
  ) {
    this.around = nodes.map((n) => {
      let c = 0;
      for (const m of nodes) if (m !== n && NODE_FAMILY[m.kind] === NODE_FAMILY[n.kind] && nodeGap(n, m, width) <= CLUSTER_RADIUS) c += 1;
      return c;
    });
  }

  /** Whether a node of this kind may stand here: kin not too close, strangers far enough, and no belt over the cap. */
  allowed(kind: NodeKind, x: number, y: number, otherGap = OTHER_GAP): boolean {
    const family = NODE_FAMILY[kind];
    const me = { kind, x, y };
    let kin = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const d = nodeGap(me, n, this.width);
      const sameFamily = NODE_FAMILY[n.kind] === family;
      if (d < (sameFamily ? SAME_GAP : otherGap)) return false;
      if (sameFamily && d <= CLUSTER_RADIUS) {
        kin += 1;
        // Nor may this one push a neighbour's own belt over the cap: a crowd builds up around an old node one at a time.
        if (this.around[i] + 1 >= capOf(family)) return false;
      }
    }
    return kin < capOf(family);
  }
}

/** Whether a node of this kind may stand here, given the nodes already placed (see NodeBook for a quicker way over many tiles). */
export function nodeAllowed(kind: NodeKind, x: number, y: number, nodes: Spot[], width: number, otherGap = OTHER_GAP): boolean {
  return new NodeBook(nodes, width).allowed(kind, x, y, otherGap);
}

/** Nodes of one family within CLUSTER_RADIUS of a tile: how crowded that family's belt is there. */
export function clusterSize(kind: NodeKind, x: number, y: number, nodes: Spot[], width: number): number {
  const family = NODE_FAMILY[kind];
  let count = 0;
  for (const n of nodes) if (NODE_FAMILY[n.kind] === family && nodeGap({ kind, x, y }, n, width) <= CLUSTER_RADIUS) count += 1;
  return count;
}

/** Whether a tile is close enough to a node of the same family to blend with it: near, but not on top of it. */
export function nextToFamily(kind: NodeKind, x: number, y: number, nodes: Spot[], width: number): boolean {
  const family = NODE_FAMILY[kind];
  return nodes.some((n) => {
    if (NODE_FAMILY[n.kind] !== family) return false;
    const d = nodeGap({ kind, x, y }, n, width);
    return d >= SAME_GAP && d <= SAME_GAP + 3;
  });
}

/** Whether a tile sits exactly one lattice step (PITCH tiles) from a node of the same family, on its row, its column or its diagonal. */
export function squareWithFamily(kind: NodeKind, x: number, y: number, nodes: Spot[], width: number): boolean {
  const family = NODE_FAMILY[kind];
  return nodes.some((n) => {
    if (NODE_FAMILY[n.kind] !== family) return false;
    const dx = Math.abs(wrapDelta(n.x, x, width));
    const dy = Math.abs(n.y - y);
    return (dx === PITCH && dy === 0) || (dx === 0 && dy === PITCH);
  });
}

/** Whether a tile lines up (rows and columns a whole number of PITCH steps apart) with every node of its family close by. */
export function alignedWithKin(kind: NodeKind, x: number, y: number, nodes: Spot[], width: number): boolean {
  const family = NODE_FAMILY[kind];
  for (const n of nodes) {
    if (NODE_FAMILY[n.kind] !== family) continue;
    const dx = Math.abs(wrapDelta(n.x, x, width));
    const dy = Math.abs(n.y - y);
    if (Math.max(dx, dy) > CLUSTER_RADIUS) continue;
    if (dx % PITCH !== 0 || dy % PITCH !== 0) return false;
  }
  return true;
}
