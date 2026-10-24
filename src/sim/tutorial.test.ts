import { describe, expect, it } from 'vitest';
import { TUTORIAL, tutorialNext, tutorialSkip } from './tutorial';
import { createWorld } from './world';

describe('the tutorial', () => {
  const fresh = () => createWorld(11);

  it('starts at the first step and moves on when the player has done it on screen', () => {
    const w = fresh();
    expect(tutorialNext(w, new Set())?.step.id).toBe('look');
    expect(tutorialNext(w, new Set(['moved']))?.step.id).toBe('zoom');
  });

  it('skips a step by hand, and remembers it', () => {
    const w = fresh();
    tutorialSkip(w, 'look');
    expect(tutorialNext(w, new Set())?.step.id).toBe('zoom');
  });

  it('counts steps the world already shows as done', () => {
    const w = fresh();
    const flags = new Set(['moved', 'zoomed', 'sheet:towns']);
    expect(tutorialNext(w, flags)?.step.id).toBe('camp');
  });

  it('only offers the steps of the tier the player is at', () => {
    const w = fresh();
    w.tutorialDone = TUTORIAL.filter((s) => s.tier === 0).map((s) => s.id);
    expect(tutorialNext(w, new Set())).toBeNull();
    w.tier = 1;
    expect(tutorialNext(w, new Set())?.step.tier).toBe(1);
  });

  it('a game well under way does not start with the first steps', () => {
    const w = fresh();
    w.tick = 20000;
    w.tier = 1;
    expect(tutorialNext(w, new Set())?.step.tier).toBe(1);
  });

  it('every step has a way to be finished and unique ids', () => {
    const ids = new Set<string>();
    for (const s of TUTORIAL) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      expect(!!s.flag || !!s.test).toBe(true);
    }
  });
});
