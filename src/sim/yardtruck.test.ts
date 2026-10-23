import { describe, expect, it } from 'vitest';
import { BUILD_LUMBER } from './defs';
import { buyVehicle, createWorld, sell, step } from './world';

describe('yard truck', () => {
  it('is bought by the player at a built yard, and only then carries lumber to the Market site', () => {
    const w = createWorld(11);
    const p = w.places[0];
    const yard = w.sites.find((s) => s.placeId === p.id && s.kind === 'freight')!;
    sell(w, yard, 'lumber', BUILD_LUMBER[0] + BUILD_LUMBER[1]);
    expect(w.vehicles.filter((v) => v.homeId === yard.id)).toHaveLength(0);
    for (let i = 0; i < 3000; i++) step(w);
    expect(p.stage).toBe(1);
    expect(buyVehicle(w, yard.id, 'boxtruck')).toBeNull();
    for (let i = 0; i < 6000 && p.stage === 1; i++) step(w);
    expect(p.stage).toBe(2);
  });
});
