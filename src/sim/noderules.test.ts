// Resource nodes: kin blend into belts, strangers keep apart, nothing piles up.
import { describe, expect, it } from 'vitest';
import { CLUSTER_MAX, NODE_FAMILY, OTHER_GAP, SAME_GAP, clusterSize, nodeAllowed, nodeGap } from './noderules';
import { createWorld } from './world';

describe('node rules', () => {
  const near = [{ kind: 'farmland' as const, x: 50, y: 20 }];
  it('let kin stand side by side but not on top of each other', () => {
    expect(nodeAllowed('pasture', 50 + SAME_GAP, 20, near, 200)).toBe(true);
    expect(nodeAllowed('orchard', 50 + SAME_GAP - 1, 20, near, 200)).toBe(false);
  });
  it('keep different families well apart', () => {
    expect(nodeAllowed('forest', 50 + OTHER_GAP - 1, 20, near, 200)).toBe(false);
    expect(nodeAllowed('forest', 50 + OTHER_GAP, 20, near, 200)).toBe(true);
    expect(nodeAllowed('coal', 50 + 4, 20, near, 200)).toBe(false);
  });
  it('cap a belt at a few, so it is a belt and not a sea of fields', () => {
    const belt = Array.from({ length: CLUSTER_MAX }, (_, i) => ({ kind: 'farmland' as const, x: 50 + i * SAME_GAP, y: 20 }));
    expect(clusterSize('pasture', 50, 20, belt, 200)).toBeGreaterThanOrEqual(3);
    expect(nodeAllowed('pasture', 57, 23, belt, 200)).toBe(false);
  });
  it('measure distance round the seam', () => {
    expect(nodeGap({ kind: 'coal', x: 1, y: 5 }, { kind: 'mine', x: 198, y: 5 }, 200)).toBe(3);
  });
});

describe('generated worlds', () => {
  it('have no pile-ups of unrelated nodes, belts of kin, and mining kinds that share a district', () => {
    let blends = 0;
    let mixedBlends = 0;
    for (const [w, h, seeds] of [[192, 64, [1, 2, 3]], [288, 96, [4, 5]], [384, 128, [6, 7]]] as [number, number, number[]][]) {
      for (const seed of seeds) {
        const world = createWorld(seed, w, h);
        const start = { kind: 'forest' as const, x: world.places[0].x, y: world.places[0].y };
        const nodes = world.nodes;
        for (let i = 0; i < nodes.length; i++) {
          // No node has more than CLUSTER_MAX kin close by.
          expect(clusterSize(nodes[i].kind, nodes[i].x, nodes[i].y, nodes, world.width) - 1, `${nodes[i].kind} crowd`).toBeLessThan(CLUSTER_MAX + 2);
          for (let j = i + 1; j < nodes.length; j++) {
            const d = nodeGap(nodes[i], nodes[j], world.width);
            const sameFamily = NODE_FAMILY[nodes[i].kind] === NODE_FAMILY[nodes[j].kind];
            if (sameFamily) {
              expect(d, `${nodes[i].kind}/${nodes[j].kind} too close`).toBeGreaterThanOrEqual(SAME_GAP);
              if (d <= SAME_GAP + 3) {
                blends += 1;
                if (nodes[i].kind !== nodes[j].kind) mixedBlends += 1;
              }
            } else if (d < OTHER_GAP) {
              // Only the starting town's first forest, field and meadow may sit closer.
              expect(Math.min(nodeGap(nodes[i], start, world.width), nodeGap(nodes[j], start, world.width)), `${nodes[i].kind}/${nodes[j].kind} piled up`).toBeLessThanOrEqual(20);
            }
          }
        }
      }
    }
    expect(blends).toBeGreaterThan(10);
    expect(mixedBlends).toBeGreaterThan(3);
  }, 30000);
});
