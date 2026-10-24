import { describe, expect, it } from 'vitest';
import map3 from '../maps/map3.json';
import { questProgress } from './quests';
import { createWorldFromMap, needs, pickCargo, siteCap, type MapData } from './world';

describe('the last lumber for the Market', () => {
  const setup = () => {
    const w = createWorldFromMap(map3 as unknown as MapData);
    const p = w.places[0];
    const yard = w.sites.find((s) => s.kind === 'freight' && s.placeId === p.id)!;
    const market = w.sites.find((s) => s.kind === 'market' && s.placeId === p.id)!;
    p.stage = 1;
    p.build = 119;
    return { w, p, yard, market };
  };

  it('the yard still takes the last lumber when its shelf is full of lumber it bought', () => {
    const { w, yard } = setup();
    yard.stock.lumber = siteCap(w, yard);
    expect(needs(w, yard, 'lumber')).toBe(1);
  }, 120000);

  it('the yard truck still carries the last lumber when the Market shelf is full', () => {
    const { w, yard, market } = setup();
    market.stock.lumber = siteCap(w, market);
    yard.depot = { lumber: 1 };
    expect(pickCargo(w, yard, market, 12)).toEqual({ good: 'lumber', amount: 1 });
  }, 120000);

  it('the quest says what to do when the yard store holds all the lumber and no truck is there', () => {
    const { w, p, yard } = setup();
    p.build = 0;
    yard.depot = { lumber: 120 };
    const goal = { kind: 'townbuilt', stage: 2, count: 1 } as const;
    expect(questProgress(w, goal).waiting).toBe('Buy a yard truck');
    expect(questProgress(w, goal).done).toBe(false);
  }, 120000);

  it('the Market count shows only lumber that has reached the Market site, with the yard store beside it', () => {
    const { w, p, yard } = setup();
    p.build = 10;
    yard.depot = { lumber: 50 };
    const prog = questProgress(w, { kind: 'townbuilt', stage: 2, count: 1 });
    expect(prog.have).toBe(10);
    expect(prog.detail).toBe('50 in yard');
    expect(prog.waiting).toBeUndefined();
  }, 120000);
});
