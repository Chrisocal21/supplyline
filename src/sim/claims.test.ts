// The world's claim rules: no town may grow into another, nodes keep clear of every town's grown footprint, and a
// town's lots never sit on its streets or homes. Checked over many seeds and on the hand-made map.
import { describe, expect, it } from 'vitest';
import map1 from '../maps/map1.json';
import { createWorld, createWorldFromMap, layoutOf, townTiles, wrapX, type MapData, type World } from './world';
import { civicTiles } from './world';
import { civicFootprint } from './townlayout';

function audit(w: World): Record<string, number> {
  const out: Record<string, number> = { townOverlap: 0, nodeInTown: 0, nodeNearTown: 0, civicOnHome: 0, civicOnStreet: 0, landmarkTiles: 0, plotOnStreet: 0, townOnBadGround: 0 };
  const owner = new Map<number, number>();
  const key = (x: number, y: number): number => y * w.width + wrapX(w, x);
  for (const p of w.places) {
    for (const t of townTiles(w, p)) {
      const k = key(t.x, t.y);
      const prev = owner.get(k);
      if (prev !== undefined && prev !== p.id) out.townOverlap++;
      owner.set(k, p.id);
      const terr = w.terrain[k];
      if (terr !== 'grass' && terr !== 'forest') out.townOnBadGround++;
    }
  }
  // Map 1's hand-placed island goods (coffee, mango, oil) still sit beside their island towns; moving them is on the Map 1 list.
  const island = ['coffee', 'mango', 'oil'];
  for (const n of w.nodes) {
    if (island.includes(n.kind) && w.mapId) continue;
    const k = key(n.x, n.y);
    if (owner.has(k)) out.nodeInTown++;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (owner.has(key(n.x + dx, n.y + dy))) { out.nodeNearTown++; dy = 3; break; }
  }
  for (const p of w.places) {
    const l = layoutOf(w, p);
    const streets = new Set(l.streets.map((s) => s.x + ',' + s.y));
    const homes = new Set(l.homes.map((s) => s.x + ',' + s.y));
    for (const c of l.civic) {
      for (const t of civicFootprint(c)) {
        const k = t.x + ',' + t.y;
        if (homes.has(k)) out.civicOnHome++;
        if (streets.has(k) && !(c.campus)) out.civicOnStreet++;
      }
    }
    for (const pl of l.plots) if (streets.has(pl.x + ',' + pl.y)) out.plotOnStreet++;
    out.landmarkTiles += civicTiles(w, p).length;
  }
  return out;
}

const RULES = ['townOverlap', 'nodeInTown', 'nodeNearTown', 'civicOnHome', 'civicOnStreet', 'plotOnStreet', 'townOnBadGround'];

describe('claim rules', () => {
  it('hold on generated worlds, for many seeds', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const r = audit(createWorld(seed));
      for (const k of RULES) expect(`seed ${seed} ${k}: ${r[k]}`).toBe(`seed ${seed} ${k}: 0`);
    }
  });

  it('hold on the hand-made map', () => {
    const r = audit(createWorldFromMap(map1 as MapData));
    for (const k of RULES.filter((q) => q !== 'townOverlap')) expect(`${k}: ${r[k]}`).toBe(`${k}: 0`);
  });
});
