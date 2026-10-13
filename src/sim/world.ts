// Simulation core: plain TypeScript, no graphics, no renderer imports.
import {
  FREIGHT_DEMAND,
  GOODS,
  GOOD_LIST,
  LEVEL_CAP,
  LEVEL_SPEED,
  MARKET_DEMAND,
  MAX_LEVEL,
  NODE_QUALITY,
  BUILD_SLOPE,
  INDUSTRY_PLOTS,
  CROSSING_COST,
  HIGHWAY_COST_FACTOR,
  HIGHWAY_TIER,
  HIGHWAY_TIME,
  type RoadGrade,
  RAIL_COST_FACTOR,
  AIR_COST_PER_TILE,
  AIR_TIER,
  RAIL_TIER,
  ROAD_COST,
  SALE_MULT,
  TRADE_IN,
  type RouteMode,
  SITE_DEFS,
  SPAN_LIMIT,
  START_MONEY,
  TOWN_LEVELS,
  UPGRADE_COST_FACTOR,
  VEHICLE_DEFS,
  type Good,
  type SiteKind,
  type Stock,
  type Terrain,
  type VehicleKind,
} from './defs';
import { generateFeatures, plotEntry, plotFacing, plotTiles, type Place, type Region, type ResourceNode, type Tile } from './features';
import { generateLand } from './mapgen';
import { checkQuests } from './quests';
import { districtDemand, stepEconomy, townGrowthMult, townLoadMult, townPriceMult, townSpeedMult, townStorageMult } from './town';

export type { Place, Region, ResourceNode, Tile };
export { plotEntry, plotFacing, plotTiles };

export interface Site {
  id: number;
  kind: SiteKind;
  name: string;
  x: number;
  y: number;
  stock: Stock;
  /** Progress through the current production cycle. */
  timer: number;
  level: number;
  nodeId: number | null;
  /** Set on town docks. */
  placeId: number | null;
  /** The town whose district plot this building stands on (null for none). Worked out on first use. */
  townId?: number | null;
  /** Hubs: the goods this hub asks suppliers for. */
  pull: Good[];
  /** Rail stations: goods made in the town and waiting for a train. */
  out?: Stock;
}

export interface Route {
  id: number;
  mode: RouteMode;
  /** Roads only: a street or a multi-lane highway. */
  grade?: RoadGrade;
  fromSiteId: number;
  toSiteId: number;
  /** Tiles from one site to the other, inclusive. */
  path: Tile[];
}

export type VehicleState = 'loading' | 'moving' | 'unloading';

export interface Vehicle {
  id: number;
  routeId: number;
  kind: VehicleKind;
  /** Index into route.path. */
  idx: number;
  /** +1 heading to the last tile, -1 heading back. */
  dir: 1 | -1;
  state: VehicleState;
  /** Ticks spent on the current tile-to-tile move. */
  moveTimer: number;
  cargo: number;
  good: Good | null;
}

export interface MarketEvent {
  good: Good;
  /** Price multiplier while active. */
  mult: number;
  until: number;
}

export interface LogEntry {
  seq: number;
  text: string;
}

export interface World {
  version: 4;
  seed: number;
  width: number;
  height: number;
  terrain: Terrain[];
  /** 0..255 per tile. */
  elev: number[];
  regions: Region[];
  /** Per tile: id of the region it belongs to, or 0. */
  regionMap: number[];
  places: Place[];
  nodes: ResourceNode[];
  sites: Site[];
  routes: Route[];
  vehicles: Vehicle[];
  money: number;
  /** Units sold to towns, by good. Drives quests. */
  delivered: Stock;
  earned: number;
  tier: number;
  /** Ids of the quests already finished and paid out. */
  questsDone: string[];
  tick: number;
  /** Units made and used up by buildings since the start, by good. The production sheet turns these into rates. */
  produced: Stock;
  consumed: Stock;
  /** Live market swings: a good pays more or less for a while. */
  events: MarketEvent[];
  /** State of the event random stream. */
  rng: number;
  nextId: number;
  log: LogEntry[];
  logSeq: number;
  /** Running costs paid since the start, and money that districts have earned. */
  upkeep?: number;
  districtIncome?: number;
}

/** A truck leaves the start of its route once this share of its capacity is ready, or after MAX_LOAD_WAIT ticks. */
const LOAD_WAIT_FRACTION = 0.6;
/** A rail station tops the town's docks up to this share of their storage, so prices hold while it sells. */
const STATION_FEED = 0.6;
const MAX_LOAD_WAIT = 60;
const LOAD_CHECK_EVERY = 5;

const DEFAULT_ELEV: Record<Terrain, number> = { water: 50, grass: 130, forest: 130, mountain: 220, ice: 100 };

export function createBlankWorld(width: number, height: number, terrain: Terrain[], seed = 0, elev?: number[]): World {
  return {
    version: 4,
    seed,
    width,
    height,
    terrain,
    elev: elev ?? terrain.map((t) => DEFAULT_ELEV[t]),
    regions: [],
    regionMap: new Array<number>(width * height).fill(0),
    places: [],
    nodes: [],
    sites: [],
    routes: [],
    vehicles: [],
    money: START_MONEY,
    delivered: {},
    earned: 0,
    tier: 0,
    questsDone: [],
    tick: 0,
    produced: {},
    consumed: {},
    events: [],
    rng: (seed ^ 0x9e3779b9) >>> 0,
    nextId: 1,
    log: [],
    logSeq: 0,
  };
}

/** The world is a globe: x wraps east-west, y stops at the polar caps. */
export function wrapX(world: World, x: number): number {
  return ((x % world.width) + world.width) % world.width;
}

/** Shortest signed east-west distance between two tile columns. */
export function wrapDx(world: World, from: number, to: number): number {
  let d = wrapX(world, to) - wrapX(world, from);
  if (d > world.width / 2) d -= world.width;
  if (d < -world.width / 2) d += world.width;
  return d;
}

export function createWorld(seed = Math.floor(Math.random() * 1e9), width = 192, height = 64): World {
  const land = generateLand(width, height, seed);
  const world = createBlankWorld(width, height, land.terrain, seed, land.elev);
  const f = generateFeatures(land.terrain, width, height, seed, land.elev);
  world.regions = f.regions;
  world.regionMap = f.regionMap;
  world.places = f.places;
  world.nodes = f.nodes;
  for (const p of world.places) {
    addDock(world, p, 'market');
    if (p.level >= 2) addDock(world, p, 'freight');
  }
  return world;
}

function addLog(world: World, text: string): void {
  world.log.push({ seq: ++world.logSeq, text });
  if (world.log.length > 40) world.log.shift();
}

export function addDock(world: World, place: Place, kind: 'market' | 'freight'): Site {
  const tile = kind === 'market' ? place.marketTile : place.freightTile;
  const site: Site = {
    id: world.nextId++,
    kind,
    name: `${place.name} ${SITE_DEFS[kind].label}`,
    x: tile.x,
    y: tile.y,
    stock: {},
    timer: 0,
    level: 1,
    nodeId: null,
    placeId: place.id,
    pull: [],
  };
  world.sites.push(site);
  return site;
}

/** The tile for a town's rail station: a corner of its built-up square that track can reach from outside. */
function stationTile(world: World, place: Place): Tile | null {
  const r = radiusOf(place) - 1;
  const free = (x: number, y: number): boolean => {
    const t = terrainAt(world, x, y);
    return t !== null && t !== 'water' && t !== 'mountain' && t !== 'ice' && !siteAt(world, x, y) && !streetAt(world, x, y) && !plotAt(world, x, y);
  };
  for (const [sx, sy] of [[1, -1], [-1, 1], [1, 1], [-1, -1]]) {
    const x = wrapX(world, place.x + sx * r);
    const y = place.y + sy * r;
    if (free(x, y) && !routeAt(world, x, y) && (free(x + sx, y) || free(x, y + sy))) return { x, y };
  }
  return null;
}

/** Give every town that lacks one a rail station. Returns how many were built. Safe to call again. */
export function ensureStations(world: World): number {
  let made = 0;
  for (const place of world.places) {
    if (world.sites.some((s) => s.placeId === place.id && SITE_DEFS[s.kind].station)) continue;
    const t = stationTile(world, place);
    if (!t) continue;
    world.sites.push({ id: world.nextId++, kind: 'station', name: `${place.name} Station`, x: t.x, y: t.y, stock: {}, timer: 0, level: 1, nodeId: null, placeId: place.id, pull: [] });
    made += 1;
  }
  return made;
}

/** Buildings standing on a town's district plots. */
export function townSites(world: World, place: Place): Site[] {
  const out: Site[] = [];
  for (const t of plotTiles(place.x, place.y, radiusOf(place))) {
    const s = siteAt(world, t.x, t.y);
    if (s && !SITE_DEFS[s.kind].dock && !SITE_DEFS[s.kind].station && !out.includes(s)) out.push(s);
  }
  return out;
}

/** A town's Market and Freight Yard, found from any site that belongs to the town. */
export function townDocks(world: World, site: Site): Site[] {
  return world.sites.filter((s) => s.placeId === site.placeId && s.placeId !== null && SITE_DEFS[s.kind].dock);
}

/** The dock a station passes this good to: the one that asks for it and has the most room. */
export function stationDock(world: World, station: Site, good: Good): Site | undefined {
  const room = (d: Site): number => siteCap(world, d) - stockOf(d, good);
  return townDocks(world, station)
    .filter((d) => dockDemand(world, d).includes(good))
    .sort((a, b) => room(b) - room(a))[0];
}

// ---- lookups ----

export function terrainAt(world: World, x: number, y: number): Terrain | null {
  if (y < 0 || y >= world.height) return null;
  return world.terrain[y * world.width + wrapX(world, x)];
}

export function elevAt(world: World, x: number, y: number): number {
  if (y < 0 || y >= world.height) return 100;
  return world.elev[y * world.width + wrapX(world, x)];
}

/** Steepest elevation step to a neighbouring tile. Buildings need fairly level ground. */
export function slopeAt(world: World, x: number, y: number): number {
  const e = elevAt(world, x, y);
  let s = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (terrainAt(world, x + dx, y + dy) && terrainAt(world, x + dx, y + dy) !== 'ice') s = Math.max(s, Math.abs(elevAt(world, x + dx, y + dy) - e));
  return s;
}

export function siteAt(world: World, x: number, y: number): Site | undefined {
  const wx = wrapX(world, x);
  return world.sites.find((s) => s.x === wx && s.y === y);
}

export function nodeAt(world: World, x: number, y: number): ResourceNode | undefined {
  const wx = wrapX(world, x);
  return world.nodes.find((n) => n.x === wx && n.y === y);
}

/** The town whose built-up centre covers this tile. */
/** How far a settlement reaches: 3 tiles for a town, 5 for a major city. */
export function radiusOf(p: Place): number {
  return p.radius ?? 3;
}

export function placeAt(world: World, x: number, y: number): Place | undefined {
  return world.places.find((p) => Math.abs(wrapDx(world, p.x, x)) <= radiusOf(p) && Math.abs(p.y - y) <= radiusOf(p));
}

/** The town whose main street runs through this tile (the cross through its centre, three tiles each way), if any. */
export function streetAt(world: World, x: number, y: number): Place | undefined {
  return world.places.find((p) => {
    const dx = wrapDx(world, p.x, x);
    const dy = y - p.y;
    const r = radiusOf(p);
    return (dx === 0 && Math.abs(dy) <= r) || (dy === 0 && Math.abs(dx) <= r);
  });
}

/** Which district plot of which town a tile is, if any. */
export function plotAt(world: World, x: number, y: number): { place: Place; index: number } | null {
  const wx = wrapX(world, x);
  for (const place of world.places) {
    const plots = plotTiles(place.x, place.y, radiusOf(place));
    for (let i = 0; i < plots.length; i++) {
      if (wrapX(world, plots[i].x) === wx && plots[i].y === y) return { place, index: i };
    }
  }
  return null;
}

/**
 * Link every pair of buildings in a town that could trade, over the town's own streets. These district links cost
 * nothing and come with a van, so a building placed in town just works. Safe to call again whenever something changes.
 */
export function linkTown(world: World, place: Place): void {
  const plots = plotTiles(place.x, place.y, radiusOf(place)).map((t) => ({ x: wrapX(world, t.x), y: t.y }));
  const members = world.sites.filter((s) => plots.some((p) => p.x === s.x && p.y === s.y));
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];
      const linked = world.routes.some(
        (r) => r.mode === 'road' && ((r.fromSiteId === a.id && r.toSiteId === b.id) || (r.fromSiteId === b.id && r.toSiteId === a.id)),
      );
      if (linked || !canHaul(world, a, b)) continue;
      // Run the link from the supplier to its customer.
      const [src, dst] = supplies(world, a, b) || !supplies(world, b, a) ? [a, b] : [b, a];
      const path = findPath(world, src, dst, 6000);
      if (!path || path.length > 2 * radiusOf(place) + 8 || planRoute(world, path).error) continue;
      const route: Route = { id: world.nextId++, mode: 'road', fromSiteId: src.id, toSiteId: dst.id, path };
      world.routes.push(route);
      newVehicle(world, route.id, 'boxtruck');
    }
  }
}

/** Tiles carried by a highway route. */
function highwayTiles(world: World): Set<number> {
  const out = new Set<number>();
  for (const r of world.routes) {
    if (r.mode === 'road' && r.grade === 'highway') for (const p of r.path) out.add(p.y * world.width + wrapX(world, p.x));
  }
  return out;
}

/** Whether a town's plot is already homes along the street, so not for sale. */
export function isHomePlot(place: Place, index: number): boolean {
  return (place.homePlots ?? []).includes(index);
}

/** Where a road is and is not allowed to go inside a town: roads follow the streets, rails stay off streets and plots. */
function townBlocks(world: World, x: number, y: number, mode: RouteMode): boolean {
  if (!placeAt(world, x, y)) return false;
  if (streetAt(world, x, y)) return mode !== 'road';
  if (mode === 'rail') return plotAt(world, x, y) !== null;
  return true;
}

/** The street tile a building on a plot must be reached from, or null when the tile is not a plot. */
export function entryTile(world: World, x: number, y: number): Tile | null {
  const pl = plotAt(world, x, y);
  if (!pl) return null;
  const e = plotEntry(wrapDx(world, pl.place.x, x), y - pl.place.y);
  return { x: wrapX(world, pl.place.x + e.x), y: pl.place.y + e.y };
}

/** Number of plots the player can build on in a town at its current level. */
export function openIndustryPlots(place: Place): number {
  return INDUSTRY_PLOTS[Math.min(INDUSTRY_PLOTS.length, place.level) - 1] + (radiusOf(place) - 3) * 3;
}

/** First route whose path passes through the tile. */
export function routeAt(world: World, x: number, y: number, mode?: RouteMode): Route | undefined {
  const wx = wrapX(world, x);
  return world.routes.find((r) => (mode ? r.mode === mode : r.mode !== 'air') && r.path.some((p) => p.x === wx && p.y === y));
}

/** How the routes of one mode run through a tile: straight along one axis, or 'x' for ends, turns and junctions. */
export type Axis = 'h' | 'v' | 'x';

/** Per tile index, the axis of the track or road of one mode. Built once per query; crossings need it constantly. */
export function axisMap(world: World, mode: RouteMode): Map<number, Axis> {
  const out = new Map<number, Axis>();
  for (const r of world.routes) {
    if (r.mode !== mode) continue;
    r.path.forEach((p, i) => {
      const ax = pathAxis(world, r.path, i);
      const k = p.y * world.width + wrapX(world, p.x);
      const cur = out.get(k);
      out.set(k, cur === undefined || cur === ax ? ax : 'x');
    });
  }
  return out;
}

/** Axis of a path through its i-th tile. Ends and turns count as 'x'. */
export function pathAxis(world: World, path: Tile[], i: number): Axis {
  const p = path[i];
  const a = path[i - 1];
  const b = path[i + 1];
  if (!a || !b) return 'x';
  if (a.y === p.y && b.y === p.y) return 'h';
  if (wrapX(world, a.x) === wrapX(world, p.x) && wrapX(world, b.x) === wrapX(world, p.x)) return 'v';
  return 'x';
}

export function siteById(world: World, id: number): Site | undefined {
  return world.sites.find((s) => s.id === id);
}

export function placeOf(world: World, site: Site): Place | undefined {
  return site.placeId === null ? undefined : world.places.find((p) => p.id === site.placeId);
}

export function stockOf(site: Site, good: Good): number {
  return site.stock[good] ?? 0;
}

/** Take goods a vehicle is loading. A rail station hands over what is waiting for trains. */
function take(site: Site, good: Good, n: number): void {
  if (SITE_DEFS[site.kind].station) {
    const out = (site.out ??= {});
    out[good] = Math.max(0, (out[good] ?? 0) - n);
  } else addStock(site, good, -n);
}

function addStock(site: Site, good: Good, n: number): void {
  site.stock[good] = stockOf(site, good) + n;
}

/** Max units of each good this site can hold. */
export function siteCap(world: World, site: Site): number {
  const def = SITE_DEFS[site.kind];
  if (def.dock || def.station) {
    const pl = placeOf(world, site);
    return def.cap * (pl?.level ?? 1) * (pl && radiusOf(pl) > 3 ? 2 : 1) * (pl ? townStorageMult(pl) : 1);
  }
  return def.cap * LEVEL_CAP[site.level - 1];
}

/** Output speed multiplier from building level and node quality. */
export function siteSpeed(world: World, site: Site): number {
  const node = site.nodeId === null ? undefined : world.nodes.find((n) => n.id === site.nodeId);
  const town = SITE_DEFS[site.kind].inTown ? siteTown(world, site) : undefined;
  return LEVEL_SPEED[site.level - 1] * (node ? NODE_QUALITY[node.quality].mult : 1) * (town ? townSpeedMult(town, site.kind) : 1);
}

/** The town a site belongs to: its docks and station, and the buildings on its district plots. */
export function siteTown(world: World, site: Site): Place | undefined {
  if (site.placeId !== null) return world.places.find((p) => p.id === site.placeId);
  if (site.townId === undefined) site.townId = plotAt(world, site.x, site.y)?.place.id ?? null;
  return site.townId === null ? undefined : world.places.find((p) => p.id === site.townId);
}

function cityOf(world: World, site: Site): boolean {
  const pl = placeOf(world, site);
  return !!pl && radiusOf(pl) > 3;
}

const withExtra = (base: Good[], extra: Good[]): Good[] => (extra.length === 0 ? base : [...base, ...extra.filter((g) => !base.includes(g))]);

/** Goods a town dock currently wants. */
export function dockDemand(world: World, site: Site): Good[] {
  const place = placeOf(world, site);
  if (!place) return [];
  const def = SITE_DEFS[site.kind];
  if (def.dock === 'market') return withExtra(MARKET_DEMAND[place.level - 1], districtDemand(place, 'market'));
  return withExtra(FREIGHT_DEMAND[Math.min(FREIGHT_DEMAND.length, place.level) - 1], districtDemand(place, 'freight'));
}

/** Price per unit a dock pays right now: base, town level bonus, and how stocked it already is. */
export function unitPrice(world: World, site: Site, good: Good): number {
  const place = placeOf(world, site);
  const level = place?.level ?? 1;
  const fill = stockOf(site, good) / Math.max(1, siteCap(world, site));
  const taste = place?.taste?.[good] ?? 1;
  const swing = world.events.find((e) => e.good === good && e.until > world.tick)?.mult ?? 1;
  return GOODS[good].price * SALE_MULT * taste * swing * (place ? townPriceMult(place, good) : 1) * (1 + 0.12 * (level - 1)) * Math.min(1.3, Math.max(0.4, 1.3 - fill));
}

// ---- push / pull ----

/** Goods a site can ever send out. */
export function produces(site: Site): Good[] {
  const def = SITE_DEFS[site.kind];
  if (def.produce) return [def.produce.good];
  if (def.recipe) return Object.keys(def.recipe.outputs) as Good[];
  if (def.hub || def.station) return GOOD_LIST;
  return [];
}

/** Goods a site asks for. */
export function wants(world: World, site: Site): Good[] {
  const def = SITE_DEFS[site.kind];
  if (def.recipe) return Object.keys(def.recipe.inputs) as Good[];
  if (def.hub) return site.pull;
  if (def.dock) return dockDemand(world, site);
  if (def.station) {
    const place = placeOf(world, site);
    const inputs = place ? townSites(world, place).flatMap((m) => Object.keys(SITE_DEFS[m.kind].recipe?.inputs ?? {}) as Good[]) : [];
    return Array.from(new Set([...townDocks(world, site).flatMap((d) => dockDemand(world, d)), ...inputs]));
  }
  return [];
}

/** Units of `good` this site has ready to ship. */
export function offers(site: Site, good: Good): number {
  if (SITE_DEFS[site.kind].station) return Math.floor(site.out?.[good] ?? 0);
  return produces(site).includes(good) ? Math.floor(stockOf(site, good)) : 0;
}

/** Units of `good` this site would take from `from` right now. */
export function needs(world: World, site: Site, good: Good, from?: Site): number {
  if (!wants(world, site).includes(good)) return 0;
  const cap = siteCap(world, site);
  const room = Math.floor(cap - stockOf(site, good));
  if (room <= 0) return 0;
  // Hubs only pass goods to another hub when the sender is fuller, so goods flow downhill instead of ping-ponging.
  if (from && SITE_DEFS[site.kind].hub && SITE_DEFS[from.kind].hub) {
    const sendRatio = stockOf(from, good) / siteCap(world, from);
    const recvRatio = stockOf(site, good) / cap;
    if (sendRatio <= recvRatio + 0.15) return 0;
  }
  return room;
}

/** Best cargo to haul from `src` to `dst`: the most valuable good that src has and dst needs. */
export function pickCargo(world: World, src: Site, dst: Site, capacity: number): { good: Good; amount: number } | null {
  let best: { good: Good; amount: number } | null = null;
  let bestValue = 0;
  for (const g of GOOD_LIST) {
    const amount = Math.floor(Math.min(capacity, offers(src, g), needs(world, dst, g, src)));
    if (amount < 1) continue;
    const value = amount * GOODS[g].price;
    if (value > bestValue) {
      bestValue = value;
      best = { good: g, amount };
    }
  }
  return best;
}

/** Whether `a` makes or passes on something `b` asks for. */
export function supplies(world: World, a: Site, b: Site): boolean {
  const asked = wants(world, b);
  return produces(a).some((g) => asked.includes(g));
}

/** Whether the two sites could ever trade, so a route between them makes sense. */
export function canHaul(world: World, a: Site, b: Site): boolean {
  const defA = SITE_DEFS[a.kind];
  const defB = SITE_DEFS[b.kind];
  if (defA.hub || defB.hub) return true;
  const ab = produces(a).some((g) => wants(world, b).includes(g));
  const ba = produces(b).some((g) => wants(world, a).includes(g));
  return ab || ba;
}

// ---- simulation ----

function stepSite(world: World, site: Site): void {
  const def = SITE_DEFS[site.kind];
  const cap = siteCap(world, site);
  if (def.produce) {
    const { good, every } = def.produce;
    if (stockOf(site, good) >= cap) return;
    site.timer += siteSpeed(world, site);
    if (site.timer >= every) {
      site.timer -= every;
      addStock(site, good, 1);
      world.produced[good] = (world.produced[good] ?? 0) + 1;
    }
    return;
  }
  if (def.recipe) {
    const { inputs, outputs, every } = def.recipe;
    const hasInputs = Object.entries(inputs).every(([g, n]) => stockOf(site, g as Good) >= (n ?? 0));
    // Only the main product (listed first) can stall the building. By-products that do not fit are simply lost.
    const hasRoom = stockOf(site, Object.keys(outputs)[0] as Good) < cap;
    if (!hasInputs || !hasRoom) {
      site.timer = 0;
      return;
    }
    site.timer += siteSpeed(world, site);
    if (site.timer >= every) {
      site.timer -= every;
      for (const [g, n] of Object.entries(inputs)) {
        addStock(site, g as Good, -(n ?? 0));
        world.consumed[g as Good] = (world.consumed[g as Good] ?? 0) + (n ?? 0);
      }
      for (const [g, n] of Object.entries(outputs)) {
        site.stock[g as Good] = Math.min(cap, stockOf(site, g as Good) + (n ?? 0));
        world.produced[g as Good] = (world.produced[g as Good] ?? 0) + (n ?? 0);
      }
    }
    return;
  }
  if (def.station) {
    // Every second: factories in town send their goods to the platform when a track serves it, and what trains
    // unloaded goes to those factories first, then to the town's docks a little at a time so one load cannot flood them.
    if (world.tick % 10 !== 0) return;
    const place = placeOf(world, site);
    if (!place) return;
    const members = townSites(world, place);
    if (world.routes.some((r) => r.mode === 'rail' && (r.fromSiteId === site.id || r.toSiteId === site.id))) {
      const out = (site.out ??= {});
      for (const m of members) {
        const recipe = SITE_DEFS[m.kind].recipe;
        if (!recipe) continue;
        for (const g of Object.keys(recipe.outputs) as Good[]) {
          const n = Math.min(Math.floor(stockOf(m, g) / 2), Math.floor(cap - (out[g] ?? 0)));
          if (n < 1) continue;
          addStock(m, g, -n);
          out[g] = (out[g] ?? 0) + n;
        }
      }
    }
    for (const g of GOOD_LIST) {
      let have = Math.floor(stockOf(site, g));
      if (have < 1) continue;
      for (const m of members) {
        const n = Math.min(have, needs(world, m, g));
        if (n < 1) continue;
        addStock(m, g, n);
        addStock(site, g, -n);
        have -= n;
      }
      const dock = have >= 1 ? stationDock(world, site, g) : undefined;
      if (!dock) continue;
      const n = Math.min(have, Math.floor(siteCap(world, dock) * STATION_FEED - stockOf(dock, g)));
      if (n < 1) continue;
      addStock(site, g, -n);
      sell(world, dock, g, n);
    }
    return;
  }
  if (def.dock) {
    // Towns use up what they are sent.
    const level = placeOf(world, site)?.level ?? 1;
    for (const g of dockDemand(world, site)) {
      if (stockOf(site, g) > 0) site.stock[g] = Math.max(0, stockOf(site, g) - 0.02 * level * (cityOf(world, site) ? 2.5 : 1));
    }
  }
}

export function checkTown(world: World, place: Place): void {
  while (place.level < TOWN_LEVELS.length) {
    const next = TOWN_LEVELS[place.level];
    const kinds = GOOD_LIST.filter((g) => (place.delivered[g] ?? 0) > 0).length;
    if (place.growth < next.growth || kinds < place.level) break;
    place.level += 1;
    addLog(world, `${place.name} grew into a ${next.name}`);
    if (place.level === 2) addDock(world, place, 'freight');
    linkTown(world, place);
  }
}

/** A town dock buys `amount` of a good: money in, and the town grows. */
function sell(world: World, dock: Site, g: Good, amount: number): void {
  const place = placeOf(world, dock);
  addStock(dock, g, amount);
  if (!place) return;
  const gain = amount * unitPrice(world, dock, g);
  world.money += gain;
  world.earned += gain;
  world.delivered[g] = (world.delivered[g] ?? 0) + amount;
  place.delivered[g] = (place.delivered[g] ?? 0) + amount;
  place.growth += amount * GOODS[g].price * townGrowthMult(place);
  checkTown(world, place);
}

function deliver(world: World, site: Site, v: Vehicle): void {
  const g = v.good;
  const amount = v.cargo;
  v.cargo = 0;
  v.good = null;
  if (!g || amount <= 0) return;
  if (SITE_DEFS[site.kind].dock) sell(world, site, g, amount);
  else addStock(site, g, amount);
}

/** Ticks to cover one tile on this route: highways are faster. */
export function routeTicks(route: Route, base: number): number {
  return route.grade === 'highway' ? base * HIGHWAY_TIME : base;
}

function stepVehicle(world: World, v: Vehicle): void {
  const route = world.routes.find((r) => r.id === v.routeId);
  if (!route) return;
  const vdef = VEHICLE_DEFS[v.kind];
  const from = siteById(world, route.fromSiteId)!;
  const to = siteById(world, route.toSiteId)!;
  const last = route.path.length - 1;

  switch (v.state) {
    case 'loading': {
      // Looking for a load is the costly part of a tick, so each vehicle does it a few times a second, not every tick.
      if ((world.tick + v.id) % LOAD_CHECK_EVERY !== 0) {
        v.moveTimer += 1;
        break;
      }
      // The vehicle's home is the end that supplies the other one. That is usually where the route was started, but a
      // route drawn from the customer to the supplier works just the same. At home it waits a little for a worthwhile
      // load; at the far end it takes a load back only if it is decent.
      const here = v.idx === 0 ? from : to;
      const there = v.idx === 0 ? to : from;
      const homeIdx = supplies(world, from, to) || !supplies(world, to, from) ? 0 : last;
      const atHome = v.idx === homeIdx;
      const away: 1 | -1 = v.idx === 0 ? 1 : -1;
      const hereTown = siteTown(world, here);
      const capacity = Math.floor(vdef.capacity * (hereTown ? townLoadMult(hereTown) : 1));
      const pick = pickCargo(world, here, there, capacity);
      const waited = v.moveTimer;
      const enough = pick !== null && pick.amount >= capacity * (atHome ? LOAD_WAIT_FRACTION : 0.4);
      // Having come all this way for it (home has nothing to send back), take whatever is waiting.
      const fetch = pick !== null && !atHome && !pickCargo(world, there, here, capacity);
      if (pick && (enough || fetch || (atHome && waited >= MAX_LOAD_WAIT))) {
        take(here, pick.good, pick.amount);
        v.cargo = pick.amount;
        v.good = pick.good;
        v.state = 'moving';
        v.dir = away;
        v.moveTimer = 0;
      } else if (atHome && !pick && waited >= MAX_LOAD_WAIT && pickCargo(world, there, here, capacity)) {
        // Nothing to carry from home, but the other end has something for us: go and fetch it.
        v.state = 'moving';
        v.dir = away;
        v.moveTimer = 0;
      } else if (!atHome) {
        // Nothing worth taking from this end: head for home empty rather than wait.
        v.state = 'moving';
        v.dir = away;
        v.moveTimer = 0;
      } else {
        v.moveTimer = waited + 1;
      }
      break;
    }
    case 'moving': {
      v.moveTimer += 1;
      if (v.moveTimer < routeTicks(route, vdef.ticksPerTile)) break;
      v.moveTimer = 0;
      v.idx += v.dir;
      if (v.idx <= 0 || v.idx >= last) {
        v.idx = v.idx <= 0 ? 0 : last;
        v.state = 'unloading';
      }
      break;
    }
    case 'unloading': {
      deliver(world, v.idx === 0 ? from : to, v);
      v.state = 'loading';
      break;
    }
  }
}

/** Every so often one good swings in price: a demand surge or a glut. Keeps the market feeling alive. */
const EVENT_EVERY = 600;
const EVENT_LENGTH = 1800;

function nextRandom(world: World): number {
  world.rng = (Math.imul(world.rng, 1664525) + 1013904223) >>> 0;
  return world.rng / 4294967296;
}

function stepEvents(world: World): void {
  world.events = world.events.filter((e) => e.until > world.tick);
  if (world.tick % EVENT_EVERY !== 0 || world.events.length >= 2 || world.places.length === 0) return;
  if (nextRandom(world) > 0.65) return;
  const top = Math.max(...world.places.map((p) => p.level));
  const pool = Array.from(new Set([...MARKET_DEMAND[top - 1], ...FREIGHT_DEMAND[top - 1]])).filter((g) => !world.events.some((e) => e.good === g));
  if (pool.length === 0) return;
  const good = pool[Math.floor(nextRandom(world) * pool.length)];
  const surge = nextRandom(world) < 0.65;
  const mult = surge ? 1.6 : 0.65;
  world.events.push({ good, mult, until: world.tick + EVENT_LENGTH });
  addLog(world, surge ? `${GOODS[good].label} demand is surging: +60% for 3 minutes` : `${GOODS[good].label} prices have slumped: -35% for 3 minutes`);
}

export function step(world: World): void {
  world.tick += 1;
  stepEvents(world);
  for (const s of world.sites) stepSite(world, s);
  for (const v of world.vehicles) stepVehicle(world, v);
  if (world.tier >= RAIL_TIER && world.tick % 20 === 0 && ensureStations(world) > 0) addLog(world, 'Rail Stations have opened on the edge of every town');
  if (world.tick % 10 === 0) stepEconomy(world);
  checkQuests(world, (text) => addLog(world, text));
}

// ---- player actions. Each returns an error string, or null on success. ----

/** Why a site cannot be placed here, or null if it can. Does not change the world. */
export function placeError(world: World, kind: SiteKind, x: number, y: number): string | null {
  const def = SITE_DEFS[kind];
  if (def.dock || def.station) return 'Towns build their own docks and stations';
  const t = terrainAt(world, x, y);
  if (t === null) return 'Out of bounds';
  if (def.tier > world.tier) return `${def.label} unlocks at Tier ${def.tier}`;
  if (siteAt(world, x, y)) return 'Tile already occupied';
  const plot = plotAt(world, x, y);
  if (plot) {
    // Inside a town: any building that does not need a resource node, on the plots beside the streets.
    if (def.node) return `${def.label} must be built on a ${def.node} node`;
    if (def.airport) return 'Airports need open ground outside a town';
    if (plot.index < 2) return `Reserved for ${plot.place.name}'s ${plot.index === 0 ? 'Market' : 'Freight Yard'}`;
    if (isHomePlot(plot.place, plot.index)) return 'Homes line this stretch of street: not for sale';
    if (t === 'water' || t === 'mountain' || t === 'ice') return `Cannot build on ${t}`;
  } else {
    if (def.inTown) return `${def.label} goes in a town: pick a free plot beside a town street`;
    const town = placeAt(world, x, y);
    if (town) return town && streetAt(world, x, y) ? `That is ${town.name}'s main street` : `Too close to ${town.name}`;
    if (def.node) {
      const node = nodeAt(world, x, y);
      if (!node || node.kind !== def.node) return `${def.label} must be built on a ${def.node} node`;
      if (world.sites.some((s) => s.nodeId === node.id)) return 'Node already in use';
    } else if (t !== 'grass') {
      return t === 'forest' ? 'Forests are reserved for forestry nodes' : `Cannot build on ${t}`;
    } else if (slopeAt(world, x, y) > BUILD_SLOPE) {
      return 'Too steep to build on';
    }
  }
  if (world.money < def.cost) return `Need $${def.cost}`;
  return null;
}

/** Name a new site after its surroundings: the woods it sits in, or the nearest town. */
function siteName(world: World, kind: SiteKind, x: number, y: number): string {
  const def = SITE_DEFS[kind];
  let base = def.label;
  const region = world.regions.find((r) => r.id === world.regionMap[y * world.width + wrapX(world, x)]);
  if (kind === 'forestry' && region?.kind === 'forest') {
    base = `${region.name} Camp`;
  } else if (world.places.length > 0) {
    let best = world.places[0];
    let bestD = Infinity;
    for (const p of world.places) {
      const d = wrapDx(world, p.x, x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    base = `${best.name} ${def.label}`;
  }
  const same = world.sites.filter((s) => s.name === base || s.name.startsWith(`${base} `)).length;
  return same === 0 ? base : `${base} ${same + 1}`;
}

export function placeSite(world: World, kind: SiteKind, x: number, y: number): string | null {
  const err = placeError(world, kind, x, y);
  if (err) return err;
  const wx = wrapX(world, x);
  const def = SITE_DEFS[kind];
  const node = def.node ? nodeAt(world, wx, y) : undefined;
  world.money -= def.cost;
  world.sites.push({
    id: world.nextId++,
    kind,
    name: siteName(world, kind, wx, y),
    x: wx,
    y,
    stock: {},
    timer: 0,
    level: 1,
    nodeId: node?.id ?? null,
    placeId: null,
    pull: def.hub ? [...GOOD_LIST] : [],
  });
  const home = plotAt(world, wx, y);
  if (home) linkTown(world, home.place);
  return null;
}

export function upgradeCost(site: Site): number {
  return Math.round(SITE_DEFS[site.kind].cost * UPGRADE_COST_FACTOR * site.level);
}

export function upgradeError(world: World, siteId: number): string | null {
  const site = siteById(world, siteId);
  if (!site) return 'Nothing selected';
  const def = SITE_DEFS[site.kind];
  if (def.dock) return 'Towns grow through deliveries';
  if (def.station) return 'Stations belong to the town';
  if (site.level >= MAX_LEVEL) return 'Already at max level';
  const needTier = site.level; // level 2 needs tier 1, level 3 needs tier 2
  if (world.tier < needTier) return `Level ${site.level + 1} needs Tier ${needTier}`;
  const cost = upgradeCost(site);
  if (world.money < cost) return `Need $${cost}`;
  return null;
}

export function upgradeSite(world: World, siteId: number): string | null {
  const err = upgradeError(world, siteId);
  if (err) return err;
  const site = siteById(world, siteId)!;
  world.money -= upgradeCost(site);
  site.level += 1;
  return null;
}

export function setHubPull(world: World, siteId: number, good: Good, on: boolean): void {
  const site = siteById(world, siteId);
  if (!site || !SITE_DEFS[site.kind].hub) return;
  const has = site.pull.includes(good);
  if (on && !has) site.pull.push(good);
  if (!on && has) site.pull = site.pull.filter((g) => g !== good);
}

/** Why this site cannot be demolished, or null. */
export function demolishError(world: World, siteId: number): string | null {
  const site = siteById(world, siteId);
  if (!site) return 'Nothing to demolish';
  if (SITE_DEFS[site.kind].dock) return 'Town docks cannot be demolished';
  if (SITE_DEFS[site.kind].station) return 'Rail stations belong to the town';
  return null;
}

/** Money back for demolishing: half of what the building and its upgrades cost. */
export function demolishRefund(site: Site): number {
  return Math.round(SITE_DEFS[site.kind].cost * 0.5 * site.level);
}

/** Remove a site along with the roads and vehicles that served it, and refund half its cost. */
export function demolishSite(world: World, siteId: number): string | null {
  const err = demolishError(world, siteId);
  if (err) return err;
  const site = siteById(world, siteId)!;
  const dead = new Set(world.routes.filter((r) => r.fromSiteId === siteId || r.toSiteId === siteId).map((r) => r.id));
  world.routes = world.routes.filter((r) => !dead.has(r.id));
  world.vehicles = world.vehicles.filter((v) => !dead.has(v.routeId));
  world.sites = world.sites.filter((s) => s.id !== siteId);
  world.money += demolishRefund(site);
  return null;
}

// ---- roads ----

export interface RoutePlan {
  mode: RouteMode;
  grade: RoadGrade;
  error: string | null;
  path: Tile[];
  /** Cost of the road alone. */
  cost: number;
  bridgeTiles: number;
  tunnelTiles: number;
  /** Level crossings with the other network. */
  crossings: number;
}

/** Check a drawn path and price it. Does not change the world. */
export function planRoute(world: World, rawPath: Tile[], mode: RouteMode = 'road', grade: RoadGrade = 'street'): RoutePlan {
  const path = rawPath.map((p) => ({ x: wrapX(world, p.x), y: p.y }));
  const plan: RoutePlan = { mode, grade, error: null, path, cost: 0, bridgeTiles: 0, tunnelTiles: 0, crossings: 0 };
  const fail = (e: string): RoutePlan => ({ ...plan, error: e });
  if (path.length < 2) return fail('Route too short');
  if (mode === 'rail' && world.tier < RAIL_TIER) return fail(`Rail unlocks at Tier ${RAIL_TIER}`);
  if (mode === 'road' && grade === 'highway' && world.tier < HIGHWAY_TIER) return fail(`Highways unlock at Tier ${HIGHWAY_TIER}`);
  const own = axisMap(world, mode);
  const other = axisMap(world, mode === 'road' ? 'rail' : 'road');
  const factor = (mode === 'rail' ? RAIL_COST_FACTOR : 1) * (mode === 'road' && grade === 'highway' ? HIGHWAY_COST_FACTOR : 1);
  const hwTiles = grade === 'highway' && mode === 'road' ? highwayTiles(world) : null;

  const first = path[0];
  const last = path[path.length - 1];
  const from = siteAt(world, first.x, first.y);
  const to = siteAt(world, last.x, last.y);
  if (!from || !to || from.id === to.id) return fail('Route must connect two different sites');
  if (mode === 'road' && (SITE_DEFS[from.kind].station || SITE_DEFS[to.kind].station)) return fail('Only trains call at a Rail Station');

  // A building on a town plot is entered from its street, like a driveway.
  if (mode === 'road') {
    for (const [end, next] of [[first, path[1]], [last, path[path.length - 2]]] as [Tile, Tile][]) {
      const entry = entryTile(world, end.x, end.y);
      if (entry && (wrapX(world, next.x) !== entry.x || next.y !== entry.y)) return fail('Enter that lot from its street');
    }
  }

  const limit = SPAN_LIMIT[Math.min(world.tier, SPAN_LIMIT.length - 1)];
  let run = 0;
  let runKind: Terrain | null = null;
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const t = terrainAt(world, p.x, p.y);
    if (t === null) return fail('Route leaves the map');
    if (i > 0 && Math.abs(wrapDx(world, path[i - 1].x, p.x)) + Math.abs(p.y - path[i - 1].y) !== 1) {
      return fail('Route must be connected tiles');
    }
    if (i === 0 || i === path.length - 1) continue;
    if (siteAt(world, p.x, p.y)) return fail('Route passes through a site');
    const town = placeAt(world, p.x, p.y);
    if (town && townBlocks(world, p.x, p.y, mode)) return fail(`Route passes through ${town.name}`);
    if (t === 'ice') return fail('Cannot build on ice');
    if (t === 'water' || t === 'mountain') {
      if (runKind !== null && runKind !== t) return fail('A bridge cannot run straight into a tunnel: leave a tile of land between them');
      run = runKind === t ? run + 1 : 1;
      runKind = t;
      if (run > limit) {
        return fail(`${t === 'water' ? 'Bridge' : 'Tunnel'} too long: max ${limit} tiles at Tier ${world.tier}`);
      }
      if (t === 'water') plan.bridgeTiles += 1;
      else plan.tunnelTiles += 1;
    } else {
      run = 0;
      runKind = null;
    }
    const k = p.y * world.width + p.x;
    const crossing = other.get(k);
    if (crossing !== undefined) {
      const mine = pathAxis(world, path, i);
      if (t === 'water' || t === 'mountain') return fail('Roads and rails cannot share a bridge or tunnel');
      if (crossing === 'x' || mine === 'x' || mine === crossing) return fail('Roads and rails can only cross at right angles on straight stretches');
      plan.crossings += 1;
      plan.cost += CROSSING_COST;
    }
    if (hwTiles ? !hwTiles.has(k) : !own.has(k)) plan.cost += ROAD_COST[t] * factor;
  }
  if (!canHaul(world, from, to)) return fail(`${from.name} and ${to.name} have nothing to trade`);
  return plan;
}

function newVehicle(world: World, routeId: number, kind: VehicleKind): Vehicle {
  const v: Vehicle = {
    id: world.nextId++,
    routeId,
    kind,
    idx: 0,
    dir: 1,
    state: 'loading',
    moveTimer: 0,
    cargo: 0,
    good: null,
  };
  world.vehicles.push(v);
  return v;
}

/** Build a route along `path` and buy one box truck for it. */
export function createRoute(world: World, rawPath: Tile[], mode: RouteMode = 'road', grade: RoadGrade = 'street'): string | null {
  const plan = planRoute(world, rawPath, mode, grade);
  if (plan.error) return plan.error;
  const first: VehicleKind = mode === 'rail' ? 'train' : 'boxtruck';
  const cost = plan.cost + VEHICLE_DEFS[first].cost;
  if (world.money < cost) return `Need $${cost}`;
  world.money -= cost;
  const from = siteAt(world, plan.path[0].x, plan.path[0].y)!;
  const to = siteAt(world, plan.path[plan.path.length - 1].x, plan.path[plan.path.length - 1].y)!;
  const route: Route = { id: world.nextId++, mode, grade: mode === 'road' ? grade : undefined, fromSiteId: from.id, toSiteId: to.id, path: plan.path };
  world.routes.push(route);
  newVehicle(world, route.id, first);
  return null;
}

/** The tiles a plane flies over, in a straight line that takes the short way round the world. */
export function airPath(world: World, a: Tile, b: Tile): Tile[] {
  const dx = wrapDx(world, a.x, b.x);
  const dy = b.y - a.y;
  const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const out: Tile[] = [];
  for (let i = 0; i <= n; i++) out.push({ x: wrapX(world, Math.round(a.x + (dx * i) / n)), y: Math.round(a.y + (dy * i) / n) });
  return out;
}

/** Why two airports cannot be linked, or null. */
export function airError(world: World, aId: number, bId: number): string | null {
  const a = siteById(world, aId);
  const b = siteById(world, bId);
  if (world.tier < AIR_TIER) return `Air routes unlock at Tier ${AIR_TIER}`;
  if (!a || !b || !SITE_DEFS[a.kind].airport || !SITE_DEFS[b.kind].airport) return 'Air routes join two airports';
  if (a.id === b.id) return 'Pick a different airport to fly to';
  if (world.routes.some((r) => r.mode === 'air' && ((r.fromSiteId === a.id && r.toSiteId === b.id) || (r.fromSiteId === b.id && r.toSiteId === a.id)))) return 'Those airports are already linked';
  const cost = airPath(world, a, b).length * AIR_COST_PER_TILE + VEHICLE_DEFS.plane.cost;
  return world.money < cost ? `Need $${cost}` : null;
}

/** Fly a route between two airports and buy a plane for it. */
export function createAirRoute(world: World, aId: number, bId: number): string | null {
  const err = airError(world, aId, bId);
  if (err) return err;
  const a = siteById(world, aId)!;
  const b = siteById(world, bId)!;
  const path = airPath(world, a, b);
  world.money -= path.length * AIR_COST_PER_TILE + VEHICLE_DEFS.plane.cost;
  const route: Route = { id: world.nextId++, mode: 'air', fromSiteId: a.id, toSiteId: b.id, path };
  world.routes.push(route);
  newVehicle(world, route.id, 'plane');
  return null;
}

export function vehicleError(world: World, routeId: number, kind: VehicleKind): string | null {
  const def = VEHICLE_DEFS[kind];
  if (!def.implemented) return `${def.label}s are not available yet`;
  const route = world.routes.find((r) => r.id === routeId);
  if (!route) return def.mode === 'rail' ? 'Click a rail line to add a train' : def.mode === 'air' ? 'Click an airport that has an air route' : 'Click a road to add a vehicle';
  if (route.mode !== def.mode) return def.mode === 'rail' ? 'Trains need rails, not a road' : def.mode === 'air' ? 'Planes need an air route' : 'Trucks need a road, not rails';
  if (def.tier > world.tier) return `${def.label} unlocks at Tier ${def.tier}`;
  if (world.money < def.cost) return `Need $${def.cost}`;
  return null;
}

/** Buy another vehicle for an existing route. */
export function addVehicle(world: World, routeId: number, kind: VehicleKind): string | null {
  const err = vehicleError(world, routeId, kind);
  if (err) return err;
  world.money -= VEHICLE_DEFS[kind].cost;
  newVehicle(world, routeId, kind);
  return null;
}

/** The vehicle on a route that a trade-up would replace: the smallest one that has a bigger class to go to. */
function tradeUpTarget(world: World, routeId: number): Vehicle | undefined {
  return world.vehicles
    .filter((v) => v.routeId === routeId && VEHICLE_DEFS[v.kind].next)
    .sort((a, b) => VEHICLE_DEFS[a.kind].capacity - VEHICLE_DEFS[b.kind].capacity)[0];
}

/** What trading a vehicle up costs: the next class, less what the old one is worth. */
export function tradeUpCost(kind: VehicleKind): number {
  const next = VEHICLE_DEFS[kind].next;
  return next ? Math.round(VEHICLE_DEFS[next].cost - VEHICLE_DEFS[kind].cost * TRADE_IN) : 0;
}

/** What a trade-up on this route would do, for the hint: the class it replaces, the class it becomes, and the price. */
export function tradeUpPreview(world: World, routeId: number): { from: VehicleKind; to: VehicleKind; cost: number } | null {
  const v = tradeUpTarget(world, routeId);
  return v ? { from: v.kind, to: VEHICLE_DEFS[v.kind].next!, cost: tradeUpCost(v.kind) } : null;
}

/** Why the smallest vehicle on this route cannot be traded up, or null. */
export function tradeUpError(world: World, routeId: number): string | null {
  const route = world.routes.find((r) => r.id === routeId);
  if (!route) return 'Click a road, rail line or air route to trade up its smallest vehicle';
  const v = tradeUpTarget(world, routeId);
  if (!v) return world.vehicles.some((x) => x.routeId === routeId) ? 'Already the top class on this route' : 'No vehicles on this route';
  const next = VEHICLE_DEFS[VEHICLE_DEFS[v.kind].next!];
  if (next.tier > world.tier) return `${next.label} unlocks at Tier ${next.tier}`;
  const cost = tradeUpCost(v.kind);
  return world.money < cost ? `Need $${cost.toLocaleString('en-US')}` : null;
}

/** Swap the smallest vehicle on a route for the next class up. */
export function tradeUp(world: World, routeId: number): string | null {
  const err = tradeUpError(world, routeId);
  if (err) return err;
  const v = tradeUpTarget(world, routeId)!;
  world.money -= tradeUpCost(v.kind);
  v.kind = VEHICLE_DEFS[v.kind].next!;
  return null;
}

// ---- path finding ----

const TURN_COST = 0.4;

/** Extra road cost for hugging steep ground or the foot of a mountain, so routes swing around peaks instead of scraping them. */
function terrainHazard(world: World, x: number, y: number): number {
  let cost = Math.min(8, slopeAt(world, x, y) / 4);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx !== 0 || dy !== 0) && terrainAt(world, x + dx, y + dy) === 'mountain') cost += 1.5;
    }
  }
  return Math.min(cost, 12);
}

class Heap {
  private readonly keys: number[] = [];
  private readonly vals: number[] = [];
  get size(): number {
    return this.vals.length;
  }
  push(key: number, val: number): void {
    const k = this.keys;
    const v = this.vals;
    k.push(key);
    v.push(val);
    let i = k.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]];
      [v[p], v[i]] = [v[i], v[p]];
      i = p;
    }
  }
  pop(): { key: number; val: number } {
    const k = this.keys;
    const v = this.vals;
    const top = { key: k[0], val: v[0] };
    const lk = k.pop()!;
    const lv = v.pop()!;
    if (k.length > 0) {
      k[0] = lk;
      v[0] = lv;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && k[l] < k[m]) m = l;
        if (r < k.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]];
        [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Dijkstra over tiles. Avoids sites and towns, reuses existing roads cheaply, and prices water and mountains as
 * bridges and tunnels. A run of bridge or tunnel tiles never exceeds the span limit for the world's tier, so the
 * result is always buildable.
 */
export function findPath(world: World, from: Tile, to: Tile, maxVisits = 120000, mode: RouteMode = 'road', avoid?: Set<number>): Tile[] | null {
  const startEntry = mode === 'road' ? entryTile(world, from.x, from.y) : null;
  const goalEntry = mode === 'road' ? entryTile(world, to.x, to.y) : null;
  const W = world.width;
  const limit = SPAN_LIMIT[Math.min(world.tier, SPAN_LIMIT.length - 1)];
  const R = limit + 1;
  const own = axisMap(world, mode);
  const other = axisMap(world, mode === 'road' ? 'rail' : 'road');
  const factor = mode === 'rail' ? RAIL_COST_FACTOR : 1;
  const D = 5; // four headings, plus 4 for 'none yet'
  const tileOf = (st: number) => Math.floor(st / (R * D));
  const start = (from.y * W + wrapX(world, from.x)) * R * D + 4;
  const goalTile = to.y * W + wrapX(world, to.x);
  const dist = new Map<number, number>([[start, 0]]);
  const prev = new Map<number, number>();
  const heap = new Heap();
  heap.push(0, start);
  let visits = 0;
  while (heap.size > 0 && visits++ < maxVisits) {
    const { key, val: cur } = heap.pop();
    const ct = tileOf(cur);
    if (ct === goalTile) {
      const out: Tile[] = [];
      for (let c: number | undefined = cur; c !== undefined; c = prev.get(c)) {
        const t = tileOf(c);
        out.push({ x: t % W, y: Math.floor(t / W) });
      }
      return out.reverse();
    }
    if (key > (dist.get(cur) ?? Infinity)) continue;
    const dir = cur % D;
    const run = Math.floor(cur / D) % R;
    const cx = ct % W;
    const cy = Math.floor(ct / W);
    const curT = terrainAt(world, cx, cy);
    // Crossing the other network: stay perfectly straight until clear of it.
    const crossingHere = dir !== 4 && ct !== goalTile && other.has(ct);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy], h) => {
      const nx = wrapX(world, cx + dx);
      const ny = cy + dy;
      const t = terrainAt(world, nx, ny);
      if (t === null || t === 'ice') return;
      const nt = ny * W + nx;
      if (nt !== goalTile && (siteAt(world, nx, ny) || townBlocks(world, nx, ny, mode))) return;
      // Leaving or entering a town plot goes through its street entrance.
      if (dir === 4 && startEntry && (nx !== startEntry.x || ny !== startEntry.y)) return;
      if (nt === goalTile && goalEntry && (cx !== goalEntry.x || cy !== goalEntry.y)) return;
      const cross = nt === goalTile ? undefined : other.get(nt);
      if (crossingHere && h !== dir) return;
      if (cross !== undefined) {
        if (cross === 'x' || t === 'water' || t === 'mountain') return;
        if ((cross === 'h') === (dx !== 0)) return;
      }
      if (avoid && nt !== goalTile && avoid.has(nt)) return;
      let nrun = 0;
      if (t === 'water' || t === 'mountain') {
        // A bridge needs a tile of land before a tunnel, and the other way round.
        if (curT !== t && (curT === 'water' || curT === 'mountain')) return;
        nrun = curT === t ? run + 1 : 1;
        if (nrun > limit) return;
      }
      let cost = ROAD_COST[t] * factor;
      if (own.has(nt)) cost = 0.4;
      else if (t !== 'water' && t !== 'mountain') cost += terrainHazard(world, nx, ny);
      if (cross !== undefined) cost += CROSSING_COST;
      // Turning costs a little, so roads run straight and tidy instead of staircasing.
      const nd = key + cost + 0.01 + (dir !== 4 && dir !== h ? TURN_COST : 0);
      const ns = (nt * R + nrun) * D + h;
      if (nd < (dist.get(ns) ?? Infinity)) {
        dist.set(ns, nd);
        prev.set(ns, cur);
        heap.push(nd, ns);
      }
    });
  }
  return null;
}
