// The economy has to hold together: every good has somewhere to go, and by-products never have only one way out.
import { describe, expect, it } from 'vitest';
import { flows } from './flows';
import { GOODS, GOOD_LIST, SITE_DEFS } from './defs';

describe('economy flows', () => {
  const f = flows();

  it('gives every good a maker and an outlet', () => {
    const bad = GOOD_LIST.filter((g) => f[g].makers.length === 0 || (f[g].users.length === 0 && !f[g].town)).map((g) => g);
    expect(bad).toEqual([]);
  });

  it('gives every by-product at least two ways out, one of them a real factory', () => {
    const bad = GOOD_LIST.filter((g) => GOODS[g].kind === 'byproduct').filter((g) => {
      const real = f[g].users.filter((k) => !SITE_DEFS[k].recycle);
      return f[g].users.length < 2 || real.length < 1;
    });
    expect(bad).toEqual([]);
  });

  it('never makes far more of a by-product than every user of it could take', () => {
    // One site of each kind making against one of each using, with the Recycling Yard counted. A wide gap means jams.
    const bad = GOOD_LIST.filter((g) => GOODS[g].kind === 'byproduct').filter((g) => f[g].made > f[g].used * 4).map((g) => `${g} makes ${f[g].made.toFixed(1)} uses ${f[g].used.toFixed(1)}`);
    expect(bad).toEqual([]);
  });
});
