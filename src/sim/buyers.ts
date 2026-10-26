// Who buys each good: the one place the wiki and the balance test read, so a good can never be left with nowhere to sell.
import { VENUE_POOLS } from './venues';
import { WAREHOUSE_GOODS, BUILD_GOODS, DISTRICTS, DISTRICT_ORDER, FREIGHT_DEMAND, GOODS, GOOD_LIST, LEVEL_MATERIALS, MARKET_DEMAND, MARKET_WOOD, type Good } from './defs';

export interface Buyer {
  /** The building that buys it. */
  label: string;
  /** Town level it first buys at. */
  level: number;
  /** Paid at a lower salvage price, with no growth for the town. */
  salvage?: boolean;
}

const MARKET = 'Market';
const YARD = 'Supply Yard';

/** Every kind of building that pays for a good, with the town level it starts at. Salvage buyers come last. */
export function buyersOf(good: Good): Buyer[] {
  const out: Buyer[] = [];
  const marketLevel = MARKET_DEMAND.findIndex((l) => l.includes(good)) + 1;
  if (marketLevel > 0) out.push({ label: MARKET, level: marketLevel });
  else if (MARKET_WOOD.includes(good)) out.push({ label: MARKET, level: 1 });
  const yardLevel = FREIGHT_DEMAND.findIndex((l) => l.includes(good)) + 1;
  const mats = Object.values(LEVEL_MATERIALS).some((lv) => lv.some((m) => (m[good] ?? 0) > 0));
  if (yardLevel > 0) out.push({ label: YARD, level: yardLevel });
  else if (mats || BUILD_GOODS.includes(good)) out.push({ label: YARD, level: 1 });
  if (WAREHOUSE_GOODS.includes(good)) out.push({ label: 'Distribution Warehouse', level: 1 });
  for (const id of DISTRICT_ORDER) {
    const d = DISTRICTS[id];
    const pool = VENUE_POOLS[id];
    if (pool) {
      // A district made of venues: only the venues whose menu has the good buy it.
      const names = pool.filter((v) => v.goods.includes(good)).map((v) => v.label);
      if (names.length > 0) out.push({ label: `${d.label} (${names.join(', ')})`, level: d.minLevel });
    }
    if ((!pool && d.goods.includes(good)) || (!pool && (d.buys ?? []).includes(good)) || (d.demand?.market ?? []).includes(good) || (d.demand?.freight ?? []).includes(good)) out.push({ label: d.label, level: d.minLevel });
  }
  // Anything else still sells at a built Market, at the salvage price.
  if (!out.some((b) => b.label === MARKET)) out.push({ label: MARKET, level: 1, salvage: true });
  return out;
}

/** Goods that no building pays full price for: only the Market's salvage price. */
export function unsold(): Good[] {
  return GOOD_LIST.filter((g) => buyersOf(g).every((b) => b.salvage));
}

/** Goods that are not made to be sold on: a by-product just needs a salvage buyer. */
export const isByproduct = (g: Good): boolean => GOODS[g].kind === 'byproduct';
