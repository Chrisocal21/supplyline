// Town districts and specialisation paths. A town starts as a hamlet with a Market; the player grows it by building
// districts (each one a way to earn and a taste for more goods) and, once it is a Town, committing it to a path.
// Everything here is plain rules over the world: no renderer, and the world functions are reached through data only.
import {
  AFFINITY_BONUS,
  DISTRICTS,
  DISTRICT_ORDER,
  DISTRICT_UPGRADE_FACTOR,
  DISTRICT_UPKEEP,
  GOOD_LIST,
  MAX_DISTRICT_LEVEL,
  PATHS,
  PATH_MASTERY_BONUS,
  PATH_COST,
  PATH_TOWN_LEVEL,
  SITE_DEFS,
  SITE_UPKEEP,
  TOWN_LEVELS,
  VEHICLE_DEFS,
  VEHICLE_UPKEEP,
  type DistrictDef,
  type DistrictId,
  type Good,
  type PathDef,
  type PathId,
  type SiteKind,
} from './defs';
import { upkeepMult } from './perks';
import { tendDrivers, wagesPerMinute } from './drivers';
import type { Place } from './features';
import { freeCivicLot, layoutOf, routeAt, siteAt, syncDistrictSite, wrapDx, wrapX, type World } from './world';
import { civicFootprint } from './townlayout';

const TICKS_PER_MINUTE = 600;

export function districtLevel(place: Place, id: DistrictId): number {
  return place.districts?.[id] ?? 0;
}

/** Districts the town has built, in menu order. */
export function builtDistricts(place: Place): { id: DistrictId; def: DistrictDef; level: number }[] {
  return DISTRICT_ORDER.filter((id) => districtLevel(place, id) > 0).map((id) => ({ id, def: DISTRICTS[id], level: districtLevel(place, id) }));
}

export function pathOf(place: Place): PathDef | null {
  return place.path ? PATHS[place.path] : null;
}

/** A district is 50% stronger in a town whose path it suits. */
export function districtBoost(place: Place, def: DistrictDef): number {
  return boost(place, def);
}

function boost(place: Place, def: DistrictDef): number {
  return def.affinity && def.affinity === place.path ? AFFINITY_BONUS : 1;
}

/** Whether a town may build this district at all, and the highest level it may take it to now. */
export function districtCap(place: Place, id: DistrictId): number {
  const def = DISTRICTS[id];
  if (def.path && def.path !== place.path) return 0;
  if (place.level < def.minLevel) return 0;
  if (def.capstone) return 1;
  return Math.min(MAX_DISTRICT_LEVEL, place.level - def.minLevel + 1);
}

/** Cost of the next level of a district: its list price to build, then more for each level up. */
export function districtCost(place: Place, id: DistrictId): number {
  const level = districtLevel(place, id);
  const def = DISTRICTS[id];
  return level === 0 ? def.cost : Math.round(def.cost * DISTRICT_UPGRADE_FACTOR * level);
}

/** Why the district cannot be built or taken up a level now, or null. */
export function districtError(world: World, place: Place, id: DistrictId): string | null {
  const def = DISTRICTS[id];
  const level = districtLevel(place, id);
  if (def.path && def.path !== place.path) return place.path ? `Only a ${PATHS[def.path].label} town can build this` : `Needs the ${PATHS[def.path].label} path`;
  if (place.level < def.minLevel) return `Needs a ${TOWN_LEVELS[def.minLevel - 1].name}`;
  if (def.capstone && level >= 1) return 'Already built';
  if (level >= MAX_DISTRICT_LEVEL) return 'Already at max level';
  if (level >= districtCap(place, id)) return `Needs a ${TOWN_LEVELS[Math.min(TOWN_LEVELS.length, def.minLevel + level) - 1].name}`;
  const cost = districtCost(place, id);
  if (world.money < cost) return `Need $${cost.toLocaleString('en-US')}`;
  if (level === 0 && place.districtLots?.[id] === undefined && freeCivicLot(world, place, id) === null) return world.realisticLots && ['stadium', 'ballpark', 'arena', 'soccer'].includes(id)
    ? `${place.name} has no clear, full-size sports campus available`
    : `${place.name} has no free lot left for it`;
  return null;
}

/** The ground a district would take if built where the player points: which town, which lot, and why it cannot be built, if so. */
export interface DistrictSpot {
  place: Place;
  /** Index of the lot among the town's civic lots. */
  lot: number;
  /** Tile at the middle of the lot, and the tile its door looks toward. */
  x: number;
  y: number;
  ex: number;
  ey: number;
  campus: boolean;
  error: string | null;
}

const CAMPUS_DISTRICTS: DistrictId[] = ['stadium', 'ballpark', 'arena', 'soccer'];

/**
 * The lot a district would take at a tile. A district already built can only be taken up a level on its own lot; one not yet
 * built goes on a free lot of the town beside it, or on the campus kept for it (a stadium, ballpark, arena or soccer stadium).
 */
export function districtSpotAt(world: World, x: number, y: number, id: DistrictId): DistrictSpot | null {
  let best: DistrictSpot | null = null;
  let bd = Infinity;
  for (const place of world.places) {
    const layout = layoutOf(world, place);
    const used = new Set(Object.values(place.districtLots ?? {}));
    const own = place.districtLots?.[id];
    layout.civic.forEach((c, i) => {
      if (c.campus ? c.campus.district !== id : CAMPUS_DISTRICTS.includes(id) && world.realisticLots) return;
      if (own !== undefined ? own !== i : used.has(i) || (!c.campus && c.level > place.level)) return;
      const cx = wrapX(world, place.x + c.x);
      const cy = place.y + c.y;
      const d = Math.hypot(wrapDx(world, x, cx), y - cy);
      const reach = c.campus ? Math.max(c.campus.halfX, c.campus.halfY) + 3 : 3.5;
      if (d > reach || d >= bd) return;
      bd = d;
      const blocked = own === undefined && civicFootprint(c).some((t) => siteAt(world, wrapX(world, place.x + t.x), place.y + t.y) || routeAt(world, wrapX(world, place.x + t.x), place.y + t.y));
      best = { place, lot: i, x: cx, y: cy, ex: wrapX(world, place.x + c.entry.x), ey: place.y + c.entry.y, campus: !!c.campus, error: blocked ? 'Something is in the way of this lot' : districtError(world, place, id) };
    });
  }
  return best;
}

/** Build a district on the lot the player picked, or take the one already there up a level. */
export function buildDistrictAt(world: World, place: Place, id: DistrictId, lot: number): string | null {
  const had = place.districtLots?.[id];
  const spot = districtSpotAt(world, place.x + layoutOf(world, place).civic[lot].x, place.y + layoutOf(world, place).civic[lot].y, id);
  if (!spot || spot.place.id !== place.id || spot.lot !== lot) return 'That is not a lot for this district';
  if (spot.error) return spot.error;
  place.districtLots ??= {};
  place.districtLots[id] = lot;
  const err = buildDistrict(world, place, id);
  if (err && had === undefined) delete place.districtLots[id];
  return err;
}

/** Build a district, or take it up a level. */
export function buildDistrict(world: World, place: Place, id: DistrictId): string | null {
  const err = districtError(world, place, id);
  if (err) return err;
  world.money -= districtCost(place, id);
  place.districts ??= {};
  place.districts[id] = districtLevel(place, id) + 1;
  syncDistrictSite(world, place, id);
  return null;
}

export function pathError(world: World, place: Place, path: PathId): string | null {
  if (place.path) return `${place.name} is already ${PATHS[place.path].label}`;
  if (place.level < PATH_TOWN_LEVEL) return `Needs a ${TOWN_LEVELS[PATH_TOWN_LEVEL - 1].name}`;
  if (world.money < PATH_COST) return `Need $${PATH_COST.toLocaleString('en-US')}`;
  void path;
  return null;
}

/** Commit a town to a path. It cannot be changed afterwards: that is the choice. */
export function choosePath(world: World, place: Place, path: PathId): string | null {
  const err = pathError(world, place, path);
  if (err) return err;
  world.money -= PATH_COST;
  place.path = path;
  return null;
}

// ---- what the town's choices do ----

/** Multiplier on what this town pays for a good: its path, and the districts that live on that good. */
export function townPriceMult(place: Place, good: Good): number {
  let m = 1;
  const path = pathOf(place);
  if (path) {
    m *= path.basePrice;
    if (path.goods.includes(good)) m *= path.priceMult * (place.mastered ? 1 + PATH_MASTERY_BONUS : 1);
    else if (place.mastered && !path.goods.length) m *= 1 + PATH_MASTERY_BONUS;
  }
  if (!place.districts) return m;
  for (const { def, level } of builtDistricts(place)) {
    if (def.goods.includes(good)) m *= 1 + def.price * level * boost(place, def);
    if (def.capstone && def.path === 'tradehub') m *= 1 + 0.05 * level;
  }
  return Math.min(2.6, m);
}

/** Goods the town's Market or Supply Yard asks for because of the districts it has built. */
export function districtDemand(place: Place, kind: 'market' | 'freight'): Good[] {
  const out: Good[] = [];
  for (const { def } of builtDistricts(place)) for (const g of def.demand?.[kind] ?? []) if (!out.includes(g)) out.push(g);
  return out;
}

/** How much more the town's docks hold. */
export function townStorageMult(place: Place): number {
  let m = pathOf(place)?.storageMult ?? 1;
  for (const { def, level } of builtDistricts(place)) if (def.effect === 'storage') m *= 1 + (def.capstone ? 0.3 : 0.25) * level * boost(place, def);
  return m;
}

/** Growth points from sales are multiplied by this. */
export function townGrowthMult(place: Place): number {
  let m = 1;
  for (const { def, level } of builtDistricts(place)) if (def.effect === 'growth') m *= 1 + 0.2 * level;
  return m;
}

/** Output speed of a factory standing in this town. */
export function townSpeedMult(place: Place, kind: SiteKind): number {
  const path = pathOf(place);
  return path && path.fasterSites.includes(kind) ? path.speedMult : 1;
}

/** Load multiplier for vehicles loading at a building in this town. */
export function townLoadMult(place: Place): number {
  return pathOf(place)?.loadMult ?? 1;
}

// ---- income and running costs ----

/** 0 to 1: how well the town is supplied with what a district lives on. */
export function districtSatisfaction(world: World, place: Place, id: DistrictId): number {
  const def = DISTRICTS[id];
  if (def.effect === 'visitors') return Math.min(1, GOOD_LIST.filter((g) => (place.delivered[g] ?? 0) > 0).length / 10);
  if (def.goods.length === 0) return 1;
  // What the district's own building has in store (its trucks drop the goods there). A district with no building yet
  // (an old save, before it is given a lot) is judged by the town's docks, as before.
  const home = world.sites.find((s) => s.placeId === place.id && s.districtId === id);
  const docks = home ? [home] : world.sites.filter((s) => s.placeId === place.id && SITE_DEFS[s.kind].dock);
  let have = 0;
  for (const g of def.goods) if (docks.some((d) => (d.stock[g] ?? 0) >= 1)) have += 1;
  return have / def.goods.length;
}

/** Money per minute the town's districts bring in right now. */
export function districtRevenue(world: World, place: Place): number {
  let total = 0;
  for (const { id, def, level } of builtDistricts(place)) {
    if (def.revenue <= 0) continue;
    total += def.revenue * level * districtSatisfaction(world, place, id) * boost(place, def);
  }
  return total;
}

/** What this town's districts cost to keep running, per minute. */
export function townUpkeep(place: Place): number {
  let total = 0;
  for (const { def, level } of builtDistricts(place)) total += def.cost * level * DISTRICT_UPKEEP;
  return total;
}

/** Money per minute the whole company pays to keep vehicles, buildings and districts running. */
export function upkeepPerMinute(world: World): number {
  let total = 0;
  for (const s of world.sites) total += SITE_DEFS[s.kind].cost * s.level * SITE_UPKEEP;
  for (const v of world.vehicles) total += VEHICLE_DEFS[v.kind].cost * VEHICLE_UPKEEP * upkeepMult(world);
  total += wagesPerMinute(world);
  for (const p of world.places) for (const { def, level } of builtDistricts(p)) total += def.cost * level * DISTRICT_UPKEEP;
  return total;
}

/** Called once a second: district income comes in and running costs go out. Returns the net change. */
export function stepEconomy(world: World): void {
  tendDrivers(world);
  let gain = 0;
  for (const p of world.places) gain += districtRevenue(world, p);
  gain /= TICKS_PER_MINUTE / 10;
  if (gain > 0) {
    world.money += gain;
    world.earned += gain;
    world.districtIncome = (world.districtIncome ?? 0) + gain;
  }
  const cost = upkeepPerMinute(world) / (TICKS_PER_MINUTE / 10);
  const paid = Math.min(world.money, cost);
  world.money -= paid;
  world.upkeep = (world.upkeep ?? 0) + paid;
}

/** The paths a player has in use, for quests. */
export function pathsInUse(world: World): Set<PathId> {
  const out = new Set<PathId>();
  for (const p of world.places) if (p.path) out.add(p.path);
  return out;
}
