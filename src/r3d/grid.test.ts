// A town stands on its own tiles: nothing it draws reaches past the ground its streets, homes and lots cover.
import { describe, expect, it } from 'vitest';
import { TOWN_STYLES } from '../sim/defs';
import { TILE_UNITS } from '../scale';
import { townGeometry } from './townmodel';

describe('a town stays inside its grid', () => {
  it('never reaches more than a fraction of a tile past the ground it covers, at any squeeze, level or size', () => {
    const streets = Array.from({ length: 9 }, (_, i) => ({ x: i - 4, y: 0, main: true }));
    const homes = [-1, 1].flatMap((y) => Array.from({ length: 9 }, (_, i) => ({ x: i - 4, y, ok: true })));
    const plots = [-1, 1].flatMap((y) => Array.from({ length: 9 }, (_, i) => ({ x: i - 4, y: y * 2, ex: i - 4, ey: 0, ok: true, occupied: false, home: i % 3 === 0 })));
    for (const sq of [1, 0.85, 0.6]) {
      for (const level of [1, 3, 5]) {
        for (const city of [false, true]) {
          const g = townGeometry({ level, seed: 5, squeeze: sq, city, style: TOWN_STYLES[0], streets, homes, plots });
          const pos = g.getAttribute('position').array;
          let over = -Infinity;
          for (let i = 0; i < pos.length; i += 3) {
            // The covered ground runs nine tiles along the street and five across, so its edge is 4.5 and 2.5 tiles out.
            over = Math.max(over, Math.abs(pos[i]) / (TILE_UNITS * sq) - 4.5, Math.abs(pos[i + 2]) / TILE_UNITS - 2.5);
          }
          expect(over, `squeeze ${sq}, level ${level}, ${city ? 'city' : 'town'}`).toBeLessThan(0.12);
          g.dispose();
        }
      }
    }
  }, 120000);
});
