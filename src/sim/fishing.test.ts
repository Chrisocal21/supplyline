import { describe, expect, it } from 'vitest';
import { buyOptions, buyVehicle, createWorld, placeError, placeSite, step } from './world';

describe('fishing', () => {
  it('a harbor on the coast catches more fish with every boat, and its boats need no road', () => {
    const w = createWorld(11);
    w.money = 1e6;
    w.tier = 9;
    let spot: { x: number; y: number } | null = null;
    for (let y = 2; y < w.height - 2 && !spot; y++) for (let x = 0; x < w.width && !spot; x++) if (placeError(w, 'harbor', x, y) === null) spot = { x, y };
    expect(spot).not.toBeNull();
    expect(placeSite(w, 'harbor', spot!.x, spot!.y)).toBeNull();
    const harbor = w.sites.find((s) => s.kind === 'harbor')!;
    expect(buyOptions(w, harbor.id)).toContain('fishboat');
    for (let i = 0; i < 6000; i++) step(w);
    const alone = harbor.stock.fish ?? 0;
    expect(alone).toBeGreaterThan(0);
    harbor.stock = {};
    for (let i = 0; i < 3; i++) expect(buyVehicle(w, harbor.id, 'fishboat')).toBeNull();
    for (let i = 0; i < 6000; i++) step(w);
    expect(harbor.stock.fish ?? 0).toBeGreaterThan(alone * 2);
  });
});
