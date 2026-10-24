import { describe, expect, it } from 'vitest';
import { createBlankWorld, buyVehicle, idleSurplus, isIdle, placeSite, siteAt, step } from './world';
import { upkeepPerMinute } from './town';

describe('idle vehicles', () => {
  const setup = () => {
    const w = createBlankWorld(30, 14, new Array(30 * 14).fill('grass'));
    w.money = 1e6;
    w.tier = 3;
    expect(placeSite(w, 'sawmill', 9, 9)).toBeNull();
    const saw = siteAt(w, 9, 9)!;
    for (let i = 0; i < 3; i++) expect(buyVehicle(w, saw.id, 'boxtruck')).toBeNull();
    return { w, saw };
  };

  it('a vehicle with nothing to carry becomes idle and costs less', () => {
    const { w } = setup();
    const before = upkeepPerMinute(w);
    for (let i = 0; i < 4000; i++) step(w);
    expect(w.vehicles.every(isIdle)).toBe(true);
    expect(upkeepPerMinute(w)).toBeLessThan(before);
  });

  it('surplus keeps one vehicle on a line and offers the rest for sale', () => {
    const { w } = setup();
    for (let i = 0; i < 4000; i++) step(w);
    expect(idleSurplus(w)).toHaveLength(2);
    // If one of them is working, all the idle ones are surplus.
    w.vehicles[0].busy = 1;
    expect(idleSurplus(w)).toHaveLength(2);
    for (const v of w.vehicles) v.busy = 1;
    expect(idleSurplus(w)).toHaveLength(0);
  });
});
