// The goods catalogue: for every good, where it comes from, what it feeds, who buys it. Built from the game's own definitions, so
// the website's goods page and the tests always agree with the game.
import { BUILD_GOODS, GOODS, GOOD_LIST, LEVEL_MATERIALS, MARKET_DEMAND, SITE_DEFS, TOWN_STYLES, type Good, type SiteKind, type Stock } from './defs';
import { GROUPS_OF, PLANNED, type GoodGroup } from './planned';

export interface MadeBy {
  /** The building in the game, or null for one that is planned. */
  site: SiteKind | null;
  label: string;
  tier: number;
  node?: string;
  /** What it takes in for this good (empty for a raw producer). */
  inputs: string[];
  /** The other goods made in the same run, or as by-products. */
  alsoMakes: string[];
  /** Whether this good is the site's main product or a by-product. */
  byProduct: boolean;
}

export interface GoodEntry {
  /** A game good's id, or the id of a planned good that is not in the game yet. */
  id: string;
  /** True for a placeholder: the good is not in the game yet. */
  planned: boolean;
  groups: GoodGroup[];
  /** For a planned good: where it grows, or a note. */
  note?: string;
  label: string;
  price: number;
  kind: 'raw' | 'material' | 'product' | 'byproduct';
  madeBy: MadeBy[];
  usedBy: { site: SiteKind | null; label: string; makes: string[]; planned?: boolean }[];
  /** The town level a Market starts to buy it at, or null if no market asks for it. */
  marketLevel: number | null;
  /** Used to build or grow towns. */
  forBuilding: boolean;
  /** How many steps from the ground: raw is 0, a good made only from raw goods is 1, and so on. */
  depth: number;
}

const keys = (s: Stock): Good[] => Object.keys(s) as Good[];

export function catalog(): GoodEntry[] {
  const out = new Map<string, GoodEntry>();
  for (const id of GOOD_LIST) {
    const g = GOODS[id];
    out.set(id, { id, planned: false, groups: GROUPS_OF[id], label: g.label, price: g.price, kind: g.kind, madeBy: [], usedBy: [], marketLevel: null, forBuilding: false, depth: -1 });
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
  // Placeholders: goods that are not in the game yet, with the building and inputs they would have.
  for (const g of PLANNED) {
    out.set(g.id, { id: g.id, planned: true, groups: g.groups, note: g.note, label: g.label, price: g.price, kind: g.kind, madeBy: [{ site: null, label: g.madeBy, tier: -1, inputs: g.from, alsoMakes: [], byProduct: false }], usedBy: [], marketLevel: null, forBuilding: false, depth: -1 });
  }
  for (const g of PLANNED) for (const input of g.from) out.get(input)?.usedBy.push({ site: null, label: g.madeBy, makes: [g.id], planned: true });
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
  const depth = (g: string, seen: Set<string>): number => {
    const e = out.get(g);
    if (!e) return 0;
    if (e.depth >= 0) return e.depth;
    if (seen.has(g)) return 99;
    seen.add(g);
    const ways = e.madeBy.map((m) => (m.inputs.length === 0 ? 0 : 1 + Math.max(...m.inputs.map((i) => depth(i, new Set(seen))))));
    const d = ways.length ? Math.min(...ways) : 0;
    e.depth = d;
    return d;
  };
  for (const id of out.keys()) depth(id, new Set());
  return [...out.values()];
}

/** Goods that nothing makes, or that nothing uses and nobody buys: gaps in the chains. */
export function catalogGaps(): { noMaker: string[]; noUse: string[] } {
  const all = catalog().filter((e) => !e.planned);
  return {
    noMaker: all.filter((e) => e.madeBy.length === 0).map((e) => e.id),
    noUse: all.filter((e) => e.usedBy.filter((u) => !u.planned).length === 0 && e.marketLevel === null && !e.forBuilding).map((e) => e.id),
  };
}
