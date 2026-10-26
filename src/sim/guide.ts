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

export interface QuestGuide {
  questId: string;
  title: string;
  why: string;
  steps: GuideStep[];
  index: number;
}

const TAB_OF = (k: SiteKind): string => SITE_DEFS[k].category ?? 'logistics';

/** The steps of a chain that makes goods for a buyer: place it, switch it on, road it, sell, truck. `kind` is its building. */
function chainSteps(world: World, kind: SiteKind, count: number): GuideStep[] {
  const def = SITE_DEFS[kind];
  const mine = world.sites.filter((s) => s.kind === kind && !s.pending);
  const site = mine[0];
  const steps: GuideStep[] = [
    { text: count > 1 ? `Build ${count} ${def.label}s (${Math.min(count, mine.length)} of ${count})` : `Pick ${def.label} in ${TAB_OF(kind)[0].toUpperCase() + TAB_OF(kind).slice(1)} and place it`, done: mine.length >= count, coach: mine.length < count ? { tab: TAB_OF(kind), tool: kind } : undefined },
  ];
  if (!(def.produce || def.recipe) || def.dock) return steps;
  if (def.recipe) steps.push({ text: `Click it and switch ${GOODS[Object.keys(def.recipe.outputs)[0] as Good].label.toLowerCase()} on: a factory makes nothing until you do`, done: !!site?.making });
  const linked = !!site && world.routes.some((r) => !r.free && (r.fromSiteId === site.id || r.toSiteId === site.id));
  steps.push({ text: 'Road it to the buyer (Logistics, Road, drag between the two)', done: linked, coach: site && !linked ? { tab: 'logistics', tool: 'route' } : undefined });
  steps.push({ text: 'Buy a truck for it: click it, then Buy Box Truck', done: !!site && world.vehicles.some((v) => v.homeId === site.id) });
  const sells = !!site && sellTargets(world, site).some((t) => t.on);
  steps.push({ text: 'Open its Selling tab and switch a buyer on', done: sells });
  return steps;
}

/** Subquests for the quest the player is on: its how-to steps, read from the world. Null when the quest is a plain count. */
export function questGuide(world: World, quest: { id: string; label: string; hint: string; goal: import('./defs').QuestGoal }): QuestGuide | null {
  const goal = quest.goal;
  let steps: GuideStep[] = [];
  if (goal.kind === 'build') steps = chainSteps(world, goal.site, goal.count);
  else if (goal.kind === 'route') steps = [{ text: 'Pick Road in Logistics and drag from one building to another', done: world.routes.some((r) => r.mode === goal.mode && !r.free), coach: { tab: 'logistics', tool: goal.mode === 'rail' ? 'rail' : goal.grade === 'highway' ? 'highway' : 'route' } }];
  else if (goal.kind === 'fleet' || goal.kind === 'yardfleet') steps = [{ text: goal.kind === 'yardfleet' ? 'Click the Supply Yard, open Trucks, press Buy Box Truck' : 'Click a building and press Buy Box Truck, then pick a driver', done: goal.kind === 'yardfleet' ? world.vehicles.some((v) => SITE_DEFS[world.sites.find((s) => s.id === v.homeId)?.kind ?? 'forestry'].dock === 'freight') : world.vehicles.length >= goal.count }];
  else if (goal.kind === 'selling') steps = [{ text: 'Click one of your buildings and open its Selling tab', done: world.sites.some((x) => sellTargets(world, x).length > 0) }, { text: 'Switch a buyer on under Sell to', done: world.sites.some((x) => sellTargets(world, x).some((t) => t.on)) }];
  else if (goal.kind === 'making') steps = [{ text: 'Click a factory and switch what it makes on', done: world.sites.filter((x) => x.making).length >= goal.count }];
  else if (goal.kind === 'townbuilt') {
    const camp = world.sites.find((s) => s.kind === 'forestry');
    const linked = !!camp && world.routes.some((r) => !r.free && (r.fromSiteId === camp.id || r.toSiteId === camp.id));
    steps = [
      { text: 'Have a Forestry Camp cutting logs', done: !!camp, coach: camp ? undefined : { tab: 'production', tool: 'forestry' } },
      { text: 'Road the camp to the town', done: linked, coach: camp && !linked ? { tab: 'logistics', tool: 'route' } : undefined },
      { text: 'Buy the camp a truck', done: !!camp && world.vehicles.some((v) => v.homeId === camp.id) },
      { text: 'Open the camp\'s Selling tab and switch the town on', done: !!camp && sellTargets(world, camp).some((t) => t.on) },
      { text: 'Keep the logs coming: the quest bar counts them', done: false },
    ];
  } else if (goal.kind === 'deliver' || goal.kind === 'make') {
    const kind = makerKind(world, goal.good);
    if (kind) steps = chainSteps(world, kind, 1);
  }
  if (steps.length === 0) return null;
  const i = steps.findIndex((s) => !s.done);
  return { questId: quest.id, title: quest.label, why: quest.hint, steps, index: i < 0 ? steps.length - 1 : i };
}
