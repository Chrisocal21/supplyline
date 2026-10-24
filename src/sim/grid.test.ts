import { describe, expect, it } from 'vitest';
import { gridId, gridRange } from './grid';

describe('map grid', () => {
  it('names cells by letter and number, 32 tiles each', () => {
    expect(gridId(0, 0)).toBe('A1');
    expect(gridId(31, 31)).toBe('A1');
    expect(gridId(32, 0)).toBe('B1');
    expect(gridId(767, 255)).toBe('X8');
  });
  it('reads a name back into its tiles', () => {
    expect(gridRange('K4')).toEqual({ x0: 320, y0: 96, x1: 351, y1: 127 });
    expect(gridRange('nonsense')).toBeNull();
  });
});
