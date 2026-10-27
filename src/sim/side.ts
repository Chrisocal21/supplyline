// Side objectives: a town you already ship to asks for a good you make but are not sending it. They never gate a tier and are not
// announced when they appear: they sit on the Objectives sheet, and pay cash when the town has received the amount.
import { GOODS, GOOD_LIST, SITE_DEFS, type Good } from './defs';
import { dockDemand, type World } from './world';

export interface SideObjective {
  id: string;
  placeId: number;
  good: Good;
  amount: number;
  reward: number;
}

const MAX_OPEN = 3;

/** Units the town is asked for: a few truckloads, more for a bigger town. */
function amountFor(level: number, good: Good): number {
  const base = 40 + level * 20;
  return Math.max(10, Math.round((base * 3) / Math.max(2, GOODS[good].price) / 10) * 10);
}

/** Progress of one objective: the town's own tally of that good, which was nothing when the objective was set. */
export function sideProgress(world: World, o: SideObjective): { have: number; need: number; done: boolean } {
  const place = world.places.find((p) => p.id === o.placeId);
  const have = place ? Math.floor(place.delivered[o.good] ?? 0) : 0;
  return { have: Math.min(have, o.amount), need: o.amount, done: have >= o.amount };
}

/** Keep a few open: one per town you ship to, for something it wants, you can make, and it has never had from you. */
export function checkSide(world: World, log: (text: string) => void): void {
  world.side ??= [];
  world.sideDone ??= 0;
  for (const o of [...world.side]) {
    if (!sideProgress(world, o).done) continue;
    world.side.splice(world.side.indexOf(o), 1);
    world.sideDone++;
    world.money += o.reward;
    const place = world.places.find((p) => p.id === o.placeId);
    log(`${place?.name ?? 'A town'} got its ${GOODS[o.good].label.toLowerCase()}  +$${o.reward.toLocaleString('en-US')}`);
  }
  if (world.side.length >= MAX_OPEN) return;
  for (const place of world.places) {
    if (world.side.length >= MAX_OPEN) return;
    if ((place.stage ?? 2) < 2 || world.side.some((o) => o.placeId === place.id)) continue;
    // Only towns that already buy from you: a town you have never sent anything to is not a connection yet.
    if (!GOOD_LIST.some((g) => (place.delivered[g] ?? 0) > 0)) continue;
    const market = world.sites.find((s) => s.placeId === place.id && SITE_DEFS[s.kind].dock === 'market');
    if (!market) continue;
    const asked = dockDemand(world, market).filter((g) => (place.delivered[g] ?? 0) === 0 && (world.produced[g] ?? 0) > 0 && GOODS[g].kind !== 'byproduct');
    if (asked.length === 0) continue;
    // Prefer what this town likes most, so different towns ask for different things.
    const good = asked.slice().sort((a, b) => (place.taste[b] ?? 1) - (place.taste[a] ?? 1) || (a < b ? -1 : 1))[0];
    const amount = amountFor(place.level, good);
    world.side.push({ id: `s-${place.id}-${good}-${world.sideDone}`, placeId: place.id, good, amount, reward: Math.round((amount * GOODS[good].price * 3) / 50) * 50 + 200 });
  }
}
