// The live guide for materials: a building or upgrade that is waiting on the Supply Yard store gets a short list of steps that
// follow what the player has really done, so it is always clear what to do next. No rewards: these are the how-to inside a quest.
import { GOODS, SITE_DEFS, type Good, type SiteKind } from './defs';
import { lineGoods, sellTargets, supplyTown, type Site, type World } from './world';

export interface GuideStep {
  text: string;
  done: boolean;
  /** The build button to ring: its category tab and the tool. */
  coach?: { tab: string; tool: string };
}

export interface MaterialTask {
  site: Site;
  yard: Site;
  /** "Toolworks is waiting for materials" / "Bakery upgrade to level 2 is waiting for materials". */
  title: string;
  /** What it still needs from the yard store, as [good, units still to arrive]. */
  owed: [Good, number][];
  /** Why this matters, in a line. */
  why: string;
  /** The good the steps below are about. */
  good: Good;
  steps: GuideStep[];
  /** The first step not done yet. */
  index: number;
}

const CATEGORY_TAB: Record<string, string> = { production: 'production', processing: 'processing', logistics: 'logistics' };

/** The cheapest building the player can already build that makes a good as its main product. */
export function makerKind(world: World, good: Good): SiteKind | null {
  let best: SiteKind | null = null;
  for (const k of Object.keys(SITE_DEFS) as SiteKind[]) {
    const d = SITE_DEFS[k];
    if (d.tier > world.tier || d.dock || d.station) continue;
    const main = d.produce ? d.produce.good : d.recipe ? (Object.keys(d.recipe.outputs)[0] as Good) : null;
    if (main !== good) continue;
    if (!best || d.cost < SITE_DEFS[best].cost) best = k;
  }
  return best;
}

/** What the player has still to do to get one good to the yard. */
function stepsFor(world: World, yard: Site, good: Good, owed: number): GuideStep[] {
  const label = GOODS[good].label.toLowerCase();
  const makers = world.sites.filter((s) => !SITE_DEFS[s.kind].dock && !s.pending && lineGoods(s).includes(good));
  const steps: GuideStep[] = [];
  const kind = makerKind(world, good);
  const kindDef = kind ? SITE_DEFS[kind] : null;
  const make = makers[0];
  const buildTab = kindDef ? (kindDef.category ?? 'production') : 'production';
  steps.push({
    text: make
      ? `${SITE_DEFS[make.kind].label} makes ${label}`
      : kind
        ? `Build a ${kindDef!.label}: it makes ${label}${kindDef!.recipe ? ` from ${(Object.keys(kindDef!.recipe.inputs) as Good[]).map((g) => GOODS[g].label.toLowerCase()).join(' and ')}` : ''}`
        : `Nothing you can build yet makes ${label}: it opens at a higher tier`,
    done: !!make,
    coach: kind && !make ? { tab: CATEGORY_TAB[buildTab] ?? 'production', tool: kind } : undefined,
  });
  if (make && SITE_DEFS[make.kind].recipe) {
    steps.push({ text: `Switch ${label} on in ${SITE_DEFS[make.kind].label}'s Production list`, done: !!make.making });
  }
  const link = make ? sellTargets(world, make).find((t) => t.site.id === yard.id) : undefined;
  steps.push({
    text: make ? `Road ${SITE_DEFS[make.kind].label} to the Supply Yard` : 'Road it to the Supply Yard',
    done: !!link,
    coach: make && !link ? { tab: 'logistics', tool: 'route' } : undefined,
  });
  if (link) steps.push({ text: `Open its Selling tab and switch the Supply Yard on`, done: link.on });
  steps.push({ text: 'Buy a truck for it', done: !!make && world.vehicles.some((v) => v.homeId === make.id) });
  const have = Math.floor(yard.depot?.[good] ?? 0);
  steps.push({ text: `Wait for ${label} to arrive: ${Math.min(have, Math.ceil(owed))} of ${Math.ceil(owed)} in the store`, done: have >= owed });
  return steps;
}

/** Every building or upgrade waiting on the Supply Yard store, with the steps to get it going. */
export function materialTasks(world: World): MaterialTask[] {
  const out: MaterialTask[] = [];
  for (const site of world.sites) {
    const owedStock = { ...(site.pending ?? {}) } as Record<string, number>;
    for (const [g, n] of Object.entries(site.upgrade?.need ?? {})) owedStock[g] = (owedStock[g] ?? 0) + (n ?? 0);
    const owed = (Object.entries(owedStock) as [Good, number][]).filter(([, n]) => n > 0);
    if (owed.length === 0) continue;
    const pl = supplyTown(world, site);
    const yard = pl ? world.sites.find((s) => SITE_DEFS[s.kind].dock === 'freight' && s.placeId === pl.id) : undefined;
    if (!yard) continue;
    // The first good the store cannot cover yet; if it holds them all, the building is about to start.
    const next = owed.find(([g, n]) => (yard.depot?.[g] ?? 0) < n) ?? owed[0];
    const steps = stepsFor(world, yard, next[0], next[1]);
    const index = Math.max(0, steps.findIndex((s) => !s.done));
    const what = SITE_DEFS[site.kind].label;
    out.push({
      site,
      yard,
      title: site.pending ? `${what} is waiting for materials` : `${what} upgrade is waiting for materials`,
      owed: owed.map(([g, n]) => [g, Math.ceil(n)]),
      why: 'The town builds from its Supply Yard store. Until the materials arrive, the work stays on hold.',
      good: next[0],
      steps,
      index: steps.findIndex((s) => !s.done) < 0 ? steps.length - 1 : index,
    });
  }
  return out;
}
