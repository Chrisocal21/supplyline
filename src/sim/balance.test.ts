// Balance report: what every building earns and costs per game minute, and how long it takes to pay for itself.
// Skipped in normal runs. Use:  BALANCE=1 npx vitest run src/sim/balance.test.ts --reporter=verbose
import { it } from 'vitest';

declare const process: { env: Record<string, string | undefined>; stdout: { write(s: string): void } };
import { GOODS, SALE_MULT, SITE_DEFS, SITE_UPKEEP, TICKS_PER_SECOND, VEHICLE_DEFS, VEHICLE_UPKEEP, type Good } from './defs';

const run = process.env.BALANCE ? it : it.skip;
const PER_MIN = TICKS_PER_SECOND * 60;
const f = (n: number, d = 1): string => n.toFixed(d);

run('balance report', () => {
  const out: string[] = [];
  out.push('BUILDINGS  (value = units a minute x list price x SALE_MULT, at level 1; truck upkeep not included)');
  out.push('site            cost  tier  /min   value/min  upkeep/min  payback(min)');
  for (const [kind, d] of Object.entries(SITE_DEFS)) {
    if (!d.produce && !d.recipe) continue;
    let perMin: number;
    let value: number;
    if (d.produce) {
      perMin = PER_MIN / d.produce.every;
      value = perMin * GOODS[d.produce.good].price * SALE_MULT;
      for (const x of d.produce.also ?? []) value += (PER_MIN / x.every) * GOODS[x.good].price * SALE_MULT;
    } else {
      const r = d.recipe!;
      perMin = PER_MIN / r.every;
      const made = Object.entries(r.outputs).reduce((n, [g, q]) => n + (q ?? 0) * GOODS[g as Good].price, 0);
      const used = Object.entries(r.inputs).reduce((n, [g, q]) => n + (q ?? 0) * GOODS[g as Good].price, 0);
      // What the factory adds: the value of what it makes less what it buys in. Selling inputs is the raw site's income.
      value = perMin * (made - used) * SALE_MULT;
    }
    const upkeep = d.cost * SITE_UPKEEP;
    const net = value - upkeep;
    out.push(`${kind.padEnd(15)} ${String(d.cost).padStart(5)}  T${d.tier}  ${f(perMin).padStart(5)}  ${f(value).padStart(9)}  ${f(upkeep).padStart(10)}  ${net > 0 ? f(d.cost / net).padStart(11) : 'never'}`);
  }
  out.push('');
  out.push('VEHICLES  (revenue for a 25 tile run carrying a 10 dollar good, full both ways is NOT assumed: one way loaded)');
  out.push('vehicle            cost  tier  cap  tiles/min  trip(min)  revenue/min  upkeep/min  payback(min)');
  for (const [kind, v] of Object.entries(VEHICLE_DEFS)) {
    const tilesPerMin = PER_MIN / v.ticksPerTile;
    const run25 = (2 * 25) / tilesPerMin;
    const revenue = (v.capacity * 10 * SALE_MULT) / run25;
    const upkeep = v.cost * VEHICLE_UPKEEP;
    const net = revenue - upkeep;
    out.push(`${kind.padEnd(17)} ${String(v.cost).padStart(6)}  T${v.tier}  ${String(v.capacity).padStart(3)}  ${f(tilesPerMin).padStart(9)}  ${f(run25).padStart(9)}  ${f(revenue).padStart(11)}  ${f(upkeep).padStart(10)}  ${net > 0 ? f(v.cost / net).padStart(11) : 'never'}`);
  }
  out.push('');
  out.push(`SALE_MULT ${SALE_MULT}, ticks per second ${TICKS_PER_SECOND}`);
  process.stdout.write(out.join('\n') + '\n');
});
