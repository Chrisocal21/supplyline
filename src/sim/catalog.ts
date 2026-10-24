// The goods catalogue: for every good, where it comes from, what it feeds, who buys it. Built from the game's own definitions, so
// the website's goods page and the tests always agree with the game.
import { BUILD_GOODS, GOODS, GOOD_LIST, LEVEL_MATERIALS, MARKET_DEMAND, SITE_DEFS, TOWN_STYLES, type Good, type SiteKind, type Stock } from './defs';

export interface MadeBy {
  site: SiteKind;
  label: string;
  tier: number;
  node?: string;
  /** What it takes in for this good (empty for a raw producer). */
  inputs: Good[];
  /** The other goods made in the same run, or as by-products. */
  alsoMakes: Good[];
  /** Whether this good is the site's main product or a by-product. */
  byProduct: boolean;
}

export interface GoodEntry {
  id: Good;
  label: string;
  price: number;
  kind: 'raw' | 'material' | 'product' | 'byproduct';
  madeBy: MadeBy[];
  usedBy: { site: SiteKind; label: string; makes: Good[] }[];
  /** The town level a Market starts to buy it at, or null if no market asks for it. */
  marketLevel: number | null;
  /** Used to build or grow towns. */
  forBuilding: boolean;
  /** How many steps from the ground: raw is 0, a good made only from raw goods is 1, and so on. */
  depth: number;
}

const keys = (s: Stock): Good[] => Object.keys(s) as Good[];

export function catalog(): GoodEntry[] {
  const out = new Map<Good, GoodEntry>();
  for (const id of GOOD_LIST) {
    const g = GOODS[id];
    out.set(id, { id, label: g.label, price: g.price, kind: g.kind, madeBy: [], usedBy: [], marketLevel: null, forBuilding: false, depth: -1 });
  }
  for (const [site, def] of Object.entries(SITE_DEFS) as [SiteKind, (typeof SITE_DEFS)[SiteKind]][]) {
    if (def.produce) {
      const all = [def.produce.good, ...(def.produce.also ?? []).map((a) => a.good)];
      all.forEach((good, i) => out.get(good)!.madeBy.push({ site, label: def.label, tier: def.tier, node: def.node, inputs: [], alsoMakes: all.filter((x) => x !== good), byProduct: i > 0 }));
    }
    if (def.recipe) {
      const outs = keys(def.recipe.outputs);
      outs.forEach((good, i) => out.get(good)!.madeBy.push({ site, label: def.label, tier: def.tier, inputs: keys(def.recipe!.inputs), alsoMakes: outs.filter((x) => x !== good), byProduct: i > 0 }));
      for (const good of keys(def.recipe.inputs)) out.get(good)!.usedBy.push({ site, label: def.label, makes: outs });
    }
  }
  MARKET_DEMAND.forEach((list, level) => {
    for (const g of list) {
      const e = out.get(g);
      if (e && e.marketLevel === null) e.marketLevel = level;
    }
  });
  const building = new Set<Good>(BUILD_GOODS);
  for (const style of TOWN_STYLES) for (const stock of LEVEL_MATERIALS[style]) for (const g of keys(stock)) building.add(g);
  for (const g of building) out.get(g)!.forBuilding = true;
  // Depth: raw goods are 0; anything else is one more than its deepest input, from the cheapest way to make it.
  const depth = (g: Good, seen: Set<Good>): number => {
    const e = out.get(g)!;
    if (e.depth >= 0) return e.depth;
    if (seen.has(g)) return 99;
    seen.add(g);
    const ways = e.madeBy.map((m) => (m.inputs.length === 0 ? 0 : 1 + Math.max(...m.inputs.map((i) => depth(i, new Set(seen))))));
    const d = ways.length ? Math.min(...ways) : 0;
    e.depth = d;
    return d;
  };
  for (const g of GOOD_LIST) depth(g, new Set());
  return [...out.values()];
}

/** Goods that nothing makes, or that nothing uses and nobody buys: gaps in the chains. */
export function catalogGaps(): { noMaker: Good[]; noUse: Good[] } {
  const all = catalog();
  return {
    noMaker: all.filter((e) => e.madeBy.length === 0).map((e) => e.id),
    noUse: all.filter((e) => e.usedBy.length === 0 && e.marketLevel === null && !e.forBuilding).map((e) => e.id),
  };
}
