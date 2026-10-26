// The materials guide follows what the player has really done.
import { describe, expect, it } from 'vitest';
import { SITE_DEFS, buildMaterials, type SiteKind } from './defs';
import { materialTasks, questGuide } from './guide';
import { TIERS } from './defs';
import { nextQuest } from './quests';
import { buyVehicle, createRoute, createWorld, findPath, placeSite, step } from './world';

describe('materials guide', () => {
  const setup = () => {
    const w = createWorld(5);
    w.tier = 4;
    w.money = 1e7;
    w.earned = 1e9;
    const p = w.places[0];
    p.stage = 2;
    const yard = w.sites.find((s) => s.placeId === p.id && SITE_DEFS[s.kind].dock === 'freight')!;
    const kind = (Object.keys(SITE_DEFS) as SiteKind[]).find((k) => SITE_DEFS[k].tier >= 2 && SITE_DEFS[k].inTown && buildMaterials(k).bricks)!;
    let waiting = null as ReturnType<typeof Object>;
    for (let r = 2; r < 14 && !waiting; r++) for (let dy = -r; dy <= r && !waiting; dy++) for (let dx = -r; dx <= r && !waiting; dx++) {
      if (placeSite(w, kind, p.x + dx, p.y + dy) === null) waiting = w.sites[w.sites.length - 1];
    }
    return { w, p, yard, waiting };
  };

  it('lists nothing when nothing waits, and a task when a building does', () => {
    const w = createWorld(5);
    expect(materialTasks(w)).toEqual([]);
    const { w: w2 } = setup();
    expect(materialTasks(w2).length).toBeGreaterThan(0);
  });

  it('starts at the maker, then the road, the truck and the wait, and finishes when the yard has the goods', () => {
    const { w, p, yard, waiting } = setup();
    let t = materialTasks(w).find((x) => x.site === waiting)!;
    expect(t.title).toContain('waiting for materials');
    // Lumber is first: it needs a maker, then a road.
    const lumberTask = t;
    expect(lumberTask.steps[0].done).toBe(false);
    // Build a brickworks beside the town and road it to the yard.
    let bw = null as ReturnType<typeof Object>;
    for (let r = 4; r < 16 && !bw; r++) for (let dy = -r; dy <= r && !bw; dy++) for (let dx = -r; dx <= r && !bw; dx++) {
      if (placeSite(w, 'brickworks', p.x + dx, p.y + dy) === null) bw = w.sites[w.sites.length - 1];
    }
    delete bw.pending;
    bw.stock.bricks = 200;
    bw.making = true;
    w.sites.forEach((s) => { if (s !== waiting && s !== bw) delete s.pending; });
    waiting.pending = { bricks: 4 };
    t = materialTasks(w).find((x) => x.site === waiting)!;
    expect(t.good).toBe('bricks');
    expect(t.steps[0].done).toBe(true);
    const roadStep = t.steps.findIndex((s) => s.text.includes('Road'));
    expect(t.steps[roadStep].done).toBe(false);
    expect(t.index).toBe(roadStep);
    expect(createRoute(w, findPath(w, bw, yard)!)).toBeNull();
    t = materialTasks(w).find((x) => x.site === waiting)!;
    expect(t.steps.find((s) => s.text.includes('Road'))!.done).toBe(true);
    expect(buyVehicle(w, bw.id, 'boxtruck')).toBeNull();
    t = materialTasks(w).find((x) => x.site === waiting)!;
    expect(t.steps.find((s) => s.text.includes('truck'))!.done).toBe(true);
    for (let i = 0; i < 1500 && waiting.pending; i++) step(w);
    expect(waiting.pending).toBeUndefined();
    expect(materialTasks(w).find((x) => x.site === waiting)).toBeUndefined();
  });
});

describe('quest guide', () => {
  it('gives the first quest a step that ticks off when the camp stands, and moves to the next quest', () => {
    const w = createWorld(5);
    let n = nextQuest(w)!;
    expect(n.quest.id).toBe('t0-camp');
    let g = questGuide(w, n.quest)!;
    expect(g.steps[0].done).toBe(false);
    expect(g.steps[0].coach?.tool).toBe('forestry');
    expect(g.why.length).toBeGreaterThan(20);
    w.questsDone.push('t0-camp');
    n = nextQuest(w)!;
    expect(n.quest.id).not.toBe('t0-camp');
  });

  it('has well-formed steps for every quest in Tier 0 and 1 that has any', () => {
    const w = createWorld(5);
    for (const q of [...TIERS[0].quests, ...TIERS[1].quests]) {
      const g = questGuide(w, q);
      if (!g) continue;
      expect(g.steps.length).toBeGreaterThan(0);
      expect(g.index).toBeGreaterThanOrEqual(0);
      expect(g.index).toBeLessThan(g.steps.length);
    }
  });
});
