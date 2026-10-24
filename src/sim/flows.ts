// The economy on paper: for every good, what the sites could make a minute and what could use it, worked out from the recipes
// alone. The balance test reads this so a new good or recipe cannot leave a chain with nowhere to go.
import { BUILD_GOODS, GOODS, GOOD_LIST, LEVEL_MATERIALS, MARKET_DEMAND, SITE_DEFS, WAREHOUSE_GOODS, type Good, type SiteKind } from './defs';

export interface GoodFlow {
  good: Good;
  /** Units a minute one of each making site could produce. */
  made: number;
  /** Units a minute one of each using site could take in. */
  used: number;
  makers: SiteKind[];
  /** Factories (and the Recycling Yard) that take it in. */
  users: SiteKind[];
  /** A town buys it: a Market, a Supply Yard store or a Warehouse. */
  town: boolean;
}

const perMin = (every: number): number => 600 / every;

export function flows(): Record<Good, GoodFlow> {
  const out = {} as Record<Good, GoodFlow>;
  for (const good of GOOD_LIST) out[good] = { good, made: 0, used: 0, makers: [], users: [], town: false };
  for (const [k, d] of Object.entries(SITE_DEFS) as [SiteKind, (typeof SITE_DEFS)[SiteKind]][]) {
    if (d.produce) {
      out[d.produce.good].made += perMin(d.produce.every);
      out[d.produce.good].makers.push(k);
      for (const x of d.produce.also ?? []) {
        out[x.good].made += perMin(x.every);
        out[x.good].makers.push(k);
      }
    }
    if (d.recipe) {
      for (const [g, n] of Object.entries(d.recipe.outputs)) {
        out[g as Good].made += (n ?? 0) * perMin(d.recipe.every);
        out[g as Good].makers.push(k);
      }
      for (const [g, n] of Object.entries(d.recipe.inputs)) {
        out[g as Good].used += (n ?? 0) * perMin(d.recipe.every);
        out[g as Good].users.push(k);
      }
    }
    if (d.recycle) {
      for (const g of GOOD_LIST) {
        if (GOODS[g].kind !== 'byproduct') continue;
        out[g].used += 6;
        out[g].users.push(k);
      }
    }
  }
  const sold = new Set<Good>([...MARKET_DEMAND.flat(), ...WAREHOUSE_GOODS, ...BUILD_GOODS]);
  for (const m of Object.values(LEVEL_MATERIALS)) for (const l of m) for (const g of Object.keys(l)) sold.add(g as Good);
  for (const g of sold) out[g].town = true;
  return out;
}
