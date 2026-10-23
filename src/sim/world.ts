// Simulation core: plain TypeScript, no graphics, no renderer imports.
import {
  DISTRICTS,
  DISTRICT_ORDER,
  type DistrictId,
  FREIGHT_DEMAND,
  PATH_TOWN_LEVEL,
  GOODS,
  GOOD_LIST,
  LEVEL_CAP,
  LEVEL_SPEED,
  MARKET_DEMAND,
  MOUNTAIN_ELEV,
  fleetLimit,
  DRIVER_SPEED,
  DRIVER_TRIPS,
  maxLevelOf,
  NODE_QUALITY,
  BUILD_SLOPE,
  LOTS_PER_LEVEL,
  CROSSING_COST,
  HIGHWAY_COST_FACTOR,
  HIGHWAY_TIER,
  HIGHWAY_TIME,
  type RoadGrade,
  RAIL_COST_FACTOR,
  AIR_COST_PER_TILE,
  SEA_COST_PER_TILE,
  SEA_TIER,
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
  UPGRADE_COST_POWER,
  LEVEL_EARN,
  VEHICLE_DEFS,
  bodyOf,
  TICKS_PER_SECOND,
  type Body,
  type Good,
  type NodeKind,
  type SiteKind,
  type Stock,
  type Terrain,
  type VehicleKind,
} from './defs';
import { generateFeatures, type FixedPlace, type Place, type Region, type ResourceNode, type Tile } from './features';
import { corridorTiles } from './corridors';
import { landError } from './land';
import { blendPartner, civicFootprint, footprint, plotCount, streetReach, townLayout, type TownLayout } from './townlayout';
import { generateLand } from './mapgen';
import { checkQuests } from './quests';
import { stepBank, type BankState } from './bank';
import { WEAR_SLOWDOWN, WEAR_TILES } from './drivers';
import { saleMult, wearMult } from './perks';
import { seasonMult } from './seasons';
import { districtDemand, stepEconomy, townGrowthMult, townLoadMult, townPriceMult, townSpeedMult, townStorageMult } from './town';

export type { Place, Region, ResourceNode, Tile };

/** How a town is laid out along its main street (offsets from its centre). See townlayout.ts. */
export function layoutOf(world: World, place: Place): TownLayout {
  return townLayout(world, place);
}

/** The tiles a town covers at a level (by default fully grown), wrapped: streets, lots and homes. */
export function townTiles(world: World, place: Place, level = 5): Tile[] {
  return footprint(layoutOf(world, place), level).map((t) => ({ x: wrapX(world, place.x + t.x), y: place.y + t.y }));
}

/**
 * The ground a town covers now: streets, plots and homes built so far, and the district lots a district has taken. Offsets
 * wrapped to the world. The rest of its footprint (the ring it will grow into, and campus lots no district has claimed) is
 * reserved: see reservedGround.
 */
export function townGround(world: World, place: Place, level = place.level): Tile[] {
  const layout = layoutOf(world, place);
  const used = new Set(Object.values(place.districtLots ?? {}));
  const civic = layout.civic.filter((c, i) => (c.campus ? used.has(i) : c.level <= level));
  const tiles = [...layout.streets.filter((s) => s.level <= level), ...layout.plots, ...civic.flatMap(civicFootprint), ...layout.homes.filter((h) => h.level <= level)];
  return tiles.map((t) => ({ x: wrapX(world, place.x + t.x), y: place.y + t.y }));
}

/** Ground set aside for a town but not built on yet: where it grows next, and the lots for stadiums and the like. */
export function reservedGround(world: World, place: Place): Tile[] {
  const built = new Set(townGround(world, place).map((t) => t.y * world.width + t.x));
  return townTiles(world, place).filter((t) => !built.has(t.y * world.width + t.x));
}

/**
 * Where a road enters a town: the two ends of its main street, which no district lot is built across. They are on the town's
 * permanent streets, so a road laid to one joins the street that is already planned there.
 */
export function townGates(world: World, place: Place): Tile[] {
  const layout = layoutOf(world, place);
  const main = layout.streets.filter((s) => s.main);
  const streets = main.length > 0 ? main : layout.streets;
  if (streets.length === 0) return [];
  // The two ends of the main street, the way out toward the nearest towns.
  const along = (t: { x: number; y: number }): number => (layout.axis === 'h' ? t.x : t.y);
  const lo = streets.reduce((m, t) => (along(t) < along(m) ? t : m));
  const hi = streets.reduce((m, t) => (along(t) > along(m) ? t : m));
  return [lo, hi]
    .filter((g, i, all) => i === 0 || g.x !== all[0].x || g.y !== all[0].y)
    .map((g) => ({ x: wrapX(world, place.x + g.x), y: place.y + g.y }));
}

/** A town's district plots, in order: the Market, the Supply Yard, then outward along the streets. */
export function plotTiles(world: World, place: Place): Tile[] {
  return layoutOf(world, place).plots.map((p) => ({ x: place.x + p.x, y: place.y + p.y }));
}

/** Which way a building on a town's plot faces: toward the street its drive meets. */
export function plotFacing(world: World, place: Place, index: number): 'N' | 'S' | 'E' | 'W' {
  const p = layoutOf(world, place).plots[index];
  if (!p) return 'S';
  const dx = p.entry.x - p.x;
  const dy = p.entry.y - p.y;
  return dx > 0 ? 'E' : dx < 0 ? 'W' : dy < 0 ? 'N' : 'S';
}

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
  /** District buildings (kind 'district'): which district this is. */
  districtId?: DistrictId;
  /** The town whose district plot this building stands on (null for none). Worked out on first use. */
  townId?: number | null;
  /** Hubs: the goods this hub asks suppliers for. */
  pull: Good[];
  /** Raw producers: timers for the by-products, one per entry of `produce.also`. */
  extra?: number[];
  /** Distribution Hubs: 'overflow' only takes goods from a supplier whose store is filling up; 'all' takes everything on offer. */
  hubMode?: 'overflow' | 'all';
  /** Overflow mode: how full a supplier's store must be (0 to 1) before this hub takes its goods. */
  trigger?: number;
  /** Storage Depots: the inputs of the businesses in reach, refreshed as they come and go. The depot asks suppliers for these. */
  fed?: Good[];
  /** Yards, ports and airports: a vehicle leaves only with this share of its capacity (0 to 1), unless the store is nearly full. */
  minLoad?: number;
  /** Rail stations: goods made in the town and waiting for a train. */
  out?: Stock;
  /** Processors: whether the player has switched production on. Nothing is made until they do. */
  making?: boolean;
  /** Producers and processors: the share of recent time spent making goods (0 to 1), smoothed over about twenty seconds. */
  run?: number;
  /** Why the building is not making goods right now: off, short of an input, or its shelf is full. */
  stall?: 'off' | 'input' | 'room' | null;
  /** A stalled-for-input factory has been reported in the log, so it is not reported again until it recovers. */
  stallLogged?: boolean;
  /** Processors, hubs and airports: the buildings this one sells to. */
  sendTo?: number[];
  /** Raw producers sell to everyone they are joined to, except the buyers listed here. */
  sendOff?: number[];
  /** The same two lists for the by-product line. Unset means it follows the main line until the player changes it. */
  byTo?: number[];
  byOff?: number[];
  /** When on, the building buys another truck by itself once goods keep piling up and every truck it has is busy. */
  autoBuy?: boolean;
  /** Tick before which a declined truck offer is not made again. */
  autoSnooze?: number;
  /** What this building has sold to each buyer, by buyer id: units and money. */
  sales?: Record<number, { units: number; money: number }>;
  /** The last jobs that went out and were paid for, newest last: what, how much, to whom, and what it paid. */
  history?: SaleJob[];
  /**
   * Which way the front faces, as the player turned it while placing: 0 south, 1 east, 2 north, 3 west. Unset means the
   * game turns it to face its road. An airport always has one: its road comes in at the middle of that side.
   */
  rot?: Rot;
}

export type Rot = 0 | 1 | 2 | 3;
/** One tile step toward the front, for each `Rot`. */
export const FRONT: readonly Tile[] = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }];

/** How many tiles a building reaches out from its middle: an airport covers 3x3 tiles, everything else one. */
export function siteReach(kind: SiteKind): number {
  return SITE_DEFS[kind].airport ? 1 : 0;
}

/**
 * The middle of the ground a building covers. A big building's site tile is its gate, in the middle of its front edge, where
 * roads join it; the rest of it lies behind.
 */
export function siteCenter(world: World, s: Pick<Site, 'kind' | 'x' | 'y' | 'rot'>): Tile {
  const reach = siteReach(s.kind);
  if (!reach) return { x: s.x, y: s.y };
  const f = FRONT[s.rot ?? 0];
  return { x: wrapX(world, s.x - f.x * reach), y: s.y - f.y * reach };
}

/** Every tile a building covers. */
export function siteTiles(world: World, s: Pick<Site, 'kind' | 'x' | 'y' | 'rot'>): Tile[] {
  const reach = siteReach(s.kind);
  const c = siteCenter(world, s);
  const out: Tile[] = [];
  for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) out.push({ x: wrapX(world, c.x + dx), y: c.y + dy });
  return out;
}

/** One delivery that was sold. */
export interface SaleJob {
  tick: number;
  good: Good;
  units: number;
  money: number;
  toId: number;
}

/** How many sold jobs a building remembers. */
export const HISTORY_JOBS = 30;

/** A vehicle on its way to a building with goods to drop off. */
export interface Inbound {
  vehicle: Vehicle;
  good: Good;
  amount: number;
  /** The building it picked the load up at. */
  fromId: number;
}

/** The loaded vehicles heading for this building, so the player can see what is on the way and how much. */
export function inboundTo(world: World, site: Site): Inbound[] {
  const out: Inbound[] = [];
  for (const v of world.vehicles) {
    if (v.cargo <= 0 || !v.good || v.fromId === undefined || v.fromId === site.id || v.back) continue;
    const route = v.routeId === 0 ? undefined : world.routes.find((r) => r.id === v.routeId);
    if (!route) continue;
    const dest = route.fromSiteId === v.fromId ? route.toSiteId : route.fromSiteId;
    if (dest === site.id) out.push({ vehicle: v, good: v.good, amount: v.cargo, fromId: v.fromId });
  }
  return out;
}

export interface Route {
  id: number;
  mode: RouteMode;
  /** Roads only: a street or a multi-lane highway. */
  grade?: RoadGrade;
  /** Zero on a free road, which joins no two buildings: it is just network to build on. */
  fromSiteId: number;
  toSiteId: number;
  /** A road, highway or rail laid with no vehicle, so later routes can run along it. */
  free?: boolean;
  /** A stretch of laid road or track: the ground a route runs on, built a few tiles at a time so one stretch can be taken out alone. */
  seg?: boolean;
  /** A lane between two buildings that runs along stretches laid separately. It owns no ground: only its stretches do. */
  over?: boolean;
  /** Sea routes only: the biggest ship class the narrowest water on the path takes (0 barge, 1 boat, 2 any). Older saves have none, which means any. */
  draft?: number;
  /** Sea routes only: dug through land where no water joins the two ports. Boats and barges sail it; freighters are too big. */
  canal?: boolean;
  /** Tiles from one site to the other, inclusive. */
  path: Tile[];
}

/** Road and track is laid, and taken out, in stretches of about this many tiles. */
export const SEGMENT_TILES = 5;

export type VehicleState = 'loading' | 'moving' | 'unloading';

/** A building with a by-product runs two lines: the main good, and the by-product(s). Each has its own buyers and its own vehicles. */
export type Line = 'main' | 'by';

/** How a vehicle picks which buyer to serve: spread out, hungriest buyer, best price, closest, or best earnings for the trip. */
export type PickMode = 'any' | 'demand' | 'price' | 'near' | 'earn';
export const PICK_MODES: PickMode[] = ['any', 'demand', 'price', 'near', 'earn'];
export const PICK_LABEL: Record<PickMode, string> = { any: 'spread out', demand: 'highest demand', price: 'best price', near: 'closest', earn: 'best earnings' };

export interface Vehicle {
  id: number;
  /** The building it was bought at and works for. */
  homeId: number;
  /** The route it runs on, or 0 while it waits at home for a route it is allowed to run. */
  routeId: number;
  /** Pinned destination building, or 0 to take any route its home may send along. */
  destId: number;
  /** How it chooses between buyers when not pinned. Unset means spread out: the least busy route. */
  pick?: PickMode;
  /** Which line of its home's goods it carries. Unset means the main good. */
  line?: Line;
  /** What it is built to haul: a flatbed takes logs, an open-top takes grain, a tanker takes milk. Unset means a box, which takes anything. */
  body?: Body;
  /** The building the current load came from. */
  fromId?: number;
  kind: VehicleKind;
  /** Deliveries made to a buyer, which raise the driver's level and make it faster. */
  trips?: number;
  /** The driver's name, once the player has given one. Until then a name is made from the vehicle (see drivers.ts). */
  driver?: string;
  /** How worn the vehicle is, 0 (new) to 1 (worn out). It grows with the ground covered and a service sets it back. */
  wear?: number;
  /**
   * Set when the road it was on is taken out from under it: the old line, kept here (not in world.routes) so it can
   * drive on to its home along it instead of vanishing. Cleared when it gets there.
   */
  back?: Route;
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

/** A truck a building with Auto-buy wants, waiting for the player to say yes. The game keeps running meanwhile. */
export interface TruckOffer {
  siteId: number;
  line: Line;
  kind: VehicleKind;
}

export interface World {
  version: 4;
  /** New worlds reserve measured, multi-tile sports campuses. Missing means the legacy layout. */
  realisticLots?: boolean;
  /** New games: a building outside a town needs its land plot bought first (see land.ts). Missing means build anywhere. */
  landRules?: boolean;
  /** Land plots the player owns, by plot id. */
  owned?: number[];
  /** Trucks buildings are asking for. Not saved: they come back on their own if the need is still there. */
  offers?: TruckOffer[];
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
  /** Company skills bought, by perk id: the level of each (see perks.ts). Old saves have none. */
  perks?: Record<string, number>;
  /** Path quests finished, by id (see PATH_QUESTS). */
  pathDone?: string[];
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
  /** Resource node layout version (see NODE_LAYOUT). */
  layout?: number;
  /** Towns may grow into their nearest neighbour (see blendPartner). New worlds only: an old save keeps its gaps. */
  blend?: boolean;
  /** The made map this world was started from, if it was not generated. */
  mapId?: string;
  /** Loans, savings and the market fund. Opened the first time the bank sheet is used. */
  bank?: BankState;
}

/** A truck leaves the start of its route with a full load: all of its capacity, or nine tenths of what its building can hold if that is less. */
const LOAD_WAIT_FRACTION = 1;
/** A rail station tops the town's docks up to this share of their storage, so prices hold while it sells. */
const STATION_FEED = 0.6;
const MAX_LOAD_WAIT = 1200;
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

/**
 * Make a generated world one step at a time. It yields what it is about to do, before it does it, so a screen can show
 * progress between the steps: the land, then the towns, rivers and resources.
 */
export function* worldSteps(seed = Math.floor(Math.random() * 1e9), width = 192, height = 64): Generator<string, World, void> {
  yield 'Shaping the land';
  const land = generateLand(width, height, seed);
  const world = createBlankWorld(width, height, land.terrain, seed, land.elev);
  yield 'Placing towns, rivers and resources';
  const f = generateFeatures(land.terrain, width, height, seed, land.elev);
  world.regions = f.regions;
  world.regionMap = f.regionMap;
  world.places = f.places;
  world.nodes = f.nodes;
  world.layout = NODE_LAYOUT;
  world.blend = true;
  linkPartners(world);
  yield 'Cutting passes through the mountains';
  carvePasses(world);
  for (const p of world.places) {
    addDock(world, p, 'market');
    if (p.level >= 2) addDock(world, p, 'freight');
  }
  return world;
}

/**
 * Cut a pass wherever a natural route between towns (see corridors.ts) crosses a mountain: the ridge is lowered to open
 * ground along the route, and its shoulders are eased, so a road or railway runs through the range on the level and not
 * only by tunnel. Returns how many tiles were opened. Done to generated worlds; a hand-made map keeps its own mountains.
 */
export function carvePasses(world: World): number {
  const route = corridorTiles(world);
  const W = world.width;
  let opened = 0;
  for (const k of route) {
    if (world.terrain[k] !== 'mountain') continue;
    world.terrain[k] = 'grass';
    world.elev[k] = Math.min(world.elev[k], MOUNTAIN_ELEV - 12);
    opened += 1;
    const x = k % W;
    const y = (k - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ny = y + dy;
      if (ny < 0 || ny >= world.height) continue;
      const n = ny * W + ((((x + dx) % W) + W) % W);
      if (world.terrain[n] === 'mountain' && !route.has(n)) world.elev[n] = Math.min(world.elev[n], MOUNTAIN_ELEV + 14);
    }
  }
  return opened;
}

export function createWorld(seed = Math.floor(Math.random() * 1e9), width = 192, height = 64): World {
  const steps = worldSteps(seed, width, height);
  for (;;) {
    const r = steps.next();
    if (r.done) return r.value;
  }
}

/** A world made by hand: the land, its heights, its towns and its resources, all fixed. See src/maps. */
export interface MapData {
  id: string;
  name: string;
  /** Names the seas, forests and regions, and drives anything else left to chance. */
  seed: number;
  width: number;
  height: number;
  /** One string per row, one character per tile: ~ water, . grass, f forest, ^ mountain, * ice. */
  terrain: string[];
  /** One string per row, two hex digits per tile: height 0..255, below SEA_LEVEL is sea floor. */
  elev: string[];
  places: FixedPlace[];
  nodes: { kind: NodeKind; x: number; y: number; quality: number }[];
  /** Island specialties (coffee, mangoes, oil): resource nodes the map places by hand. */
  specials?: { kind: string; x: number; y: number; quality: number }[];
  /** [x, y, radius] of the specialty islands, where the usual resources are held back to a few. */
  islands?: number[][];
}

const MAP_TERRAIN: Record<string, Terrain> = { '~': 'water', '.': 'grass', f: 'forest', '^': 'mountain', '*': 'ice' };

export function createWorldFromMap(map: MapData): World {
  const { width, height } = map;
  const terrain: Terrain[] = [];
  const elev: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      terrain.push(MAP_TERRAIN[map.terrain[y][x]] ?? 'grass');
      elev.push(parseInt(map.elev[y].slice(x * 2, x * 2 + 2), 16));
    }
  }
  const world = createBlankWorld(width, height, terrain, map.seed, elev);
  // A map without specialty islands (Map 2) places its oil, coffee and mangoes first, so everything else keeps clear of them.
  const presets = !map.islands?.length ? (map.specials ?? []).map((q) => ({ kind: q.kind as NodeKind, x: q.x, y: q.y, quality: q.quality })) : undefined;
  const f = generateFeatures(terrain, width, height, map.seed, elev, map.places, presets);
  world.regions = f.regions;
  world.regionMap = f.regionMap;
  world.places = f.places;
  // Resources follow the placement rules unless the map lists its own; either way the same map always has the same ones.
  world.nodes = !map.nodes.length ? f.nodes : map.nodes.map((n, i) => ({ id: i + 1, kind: n.kind, x: n.x, y: n.y, quality: n.quality, regionId: f.regionMap[n.y * width + n.x] }));
  // The specialty islands keep only a field, a wood and a meadow of the usual resources: what they are for is what grows
  // nowhere else, which has to come home by ship.
  if (map.islands?.length) {
    const near = (n: { x: number; y: number }, [ix, iy, ir]: number[]): boolean => Math.hypot(wrapDx(world, n.x, ix), n.y - iy) < ir;
    let nodes = world.nodes;
    for (const isl of map.islands) {
      const inside = nodes.filter((n) => near(n, isl)).sort((a, b) => Math.hypot(wrapDx(world, a.x, isl[0]), a.y - isl[1]) - Math.hypot(wrapDx(world, b.x, isl[0]), b.y - isl[1]));
      const keep = new Set<number>();
      for (const kind of ['farmland', 'forest', 'pasture'] as const) {
        const one = inside.find((n) => n.kind === kind);
        if (one) keep.add(one.id);
      }
      nodes = nodes.filter((n) => !near(n, isl) || keep.has(n.id));
    }
    for (const sp of map.specials ?? []) nodes.push({ id: 0, kind: sp.kind as NodeKind, x: sp.x, y: sp.y, quality: sp.quality, regionId: f.regionMap[sp.y * width + sp.x] });
    nodes.forEach((n, i) => (n.id = i + 1));
    world.nodes = nodes;
  }
  world.layout = NODE_LAYOUT;
  world.blend = true;
  linkPartners(world);
  world.mapId = map.id;
  for (const p of world.places) {
    addDock(world, p, 'market');
    if (p.level >= 2) addDock(world, p, 'freight');
  }
  return world;
}

/**
 * Which way resource nodes were laid out: 2 is low, level ground, spaced out; 3 also leaves out land no town can reach;
 * 4 keeps every node two tiles clear of water.
 */
export const NODE_LAYOUT = 4;

/**
 * Move an old save's resource nodes to the current layout. Nodes with a building on them stay where they are; the
 * rest are replaced by the new layout's, wherever those do not crowd a kept node, a building or a road.
 */
export function relayoutNodes(world: World): void {
  if ((world.layout ?? 1) >= NODE_LAYOUT || world.mapId) return;
  const f = generateFeatures(world.terrain, world.width, world.height, world.seed, world.elev);
  const used = new Set(world.sites.map((s) => s.nodeId).filter((n): n is number => n !== null));
  const kept = world.nodes.filter((n) => used.has(n.id));
  const roads = new Set<number>();
  for (const r of world.routes) for (const p of r.path) roads.add(p.y * world.width + wrapX(world, p.x));
  let nextId = Math.max(0, ...world.nodes.map((n) => n.id)) + 1;
  for (const n of f.nodes) {
    if (kept.some((k) => Math.abs(wrapDx(world, k.x, n.x)) < 3 && Math.abs(k.y - n.y) < 3)) continue;
    if (siteAt(world, n.x, n.y) || roads.has(n.y * world.width + n.x)) continue;
    kept.push({ ...n, id: nextId++ });
  }

  world.nodes = kept;
  world.layout = NODE_LAYOUT;
}

/** New-world-only layout preparation. Resources are retained outside reserved campuses. */
export function prepareRealisticWorld(world: World): void {
    if (world.sites.some(s => !SITE_DEFS[s.kind].dock)) throw new Error('Realistic layouts must be prepared before construction begins.');
    world.realisticLots = true;
    const reserved = new Set<number>();
    for (const place of world.places) {
      const layout = layoutOf(world, place);
      for (const t of layout.streets) reserved.add((place.y + t.y) * world.width + wrapX(world, place.x + t.x));
      for (const c of layout.civic) if (c.campus) {
        for (const t of civicFootprint(c)) reserved.add((place.y + t.y) * world.width + wrapX(world, place.x + t.x));
      }
    }
    const occupied = new Set(world.nodes.filter(n => !reserved.has(n.y * world.width + n.x)).map(n => n.y * world.width + n.x));
    for (const node of world.nodes) {
      if (!reserved.has(node.y * world.width + node.x)) continue;
      const terrain = terrainAt(world, node.x, node.y);
      let destination: Tile | undefined;
      for (let radius = 1; radius < Math.max(world.width, world.height) && !destination; radius++) {
        for (let dy = -radius; dy <= radius && !destination; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
            const x = wrapX(world, node.x + dx);
            const y = node.y + dy;
            const key = y * world.width + x;
            if (reserved.has(key) || occupied.has(key) || terrainAt(world, x, y) !== terrain || placeAt(world, x, y)) continue;
            if (world.nodes.some(n => n !== node && Math.abs(wrapDx(world, n.x, x)) < 2 && Math.abs(n.y - y) < 2)) continue;
            destination = { x, y };
            break;
          }
        }
      }
      if (!destination) throw new Error(`No safe location for ${node.kind} after reserving sports campuses.`);
      node.x = destination.x;
      node.y = destination.y;
      node.regionId = world.regionMap[node.y * world.width + node.x];
      occupied.add(node.y * world.width + node.x);
    }
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

/**
 * The tile for a town's rail station: one of the house tiles beside the main street, towards its outer end, so it fronts
 * a street like any lot, with open ground behind it for the track. Never out in the grass away from the town's streets.
 */
function stationTile(world: World, place: Place): Tile | null {
  const layout = layoutOf(world, place);
  const key = (x: number, y: number): string => x + ',' + y;
  const built = new Map(layout.streets.filter((q) => q.level <= place.level).map((q) => [key(q.x, q.y), q]));
  const covered = new Set([...layout.plots, ...layout.civic, ...layout.streets, ...layout.homes].map((t) => key(t.x, t.y)));
  const ok = (dx: number, dy: number): boolean => {
    const x = wrapX(world, place.x + dx);
    const y = place.y + dy;
    const t = terrainAt(world, x, y);
    return t !== null && t !== 'water' && t !== 'mountain' && t !== 'ice' && !siteAt(world, x, y) && slopeAt(world, x, y) <= BUILD_SLOPE && !routeAt(world, x, y);
  };
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const cands: { dx: number; dy: number; score: number }[] = [];
  // Houses, or a district lot no district has taken.
  const taken = new Set(Object.values(place.districtLots ?? {}));
  for (const h of [...layout.homes, ...layout.civic.filter((_, i) => !taken.has(i))]) {
    if (h.level > place.level || !ok(h.x, h.y)) continue;
    const fronts = nb.map(([ox, oy]) => built.get(key(h.x + ox, h.y + oy))).filter((q) => !!q);
    if (fronts.length === 0) continue;
    // The track needs a way in: a free tile behind that is not a street.
    const behind = nb.some(([ox, oy]) => ok(h.x + ox, h.y + oy) && !built.has(key(h.x + ox, h.y + oy)) && !layout.plots.some((q) => q.x === h.x + ox && q.y === h.y + oy));
    if (!behind) continue;
    const open = nb.some(([ox, oy]) => !covered.has(key(h.x + ox, h.y + oy)));
    cands.push({ dx: h.x, dy: h.y, score: Math.hypot(h.x, h.y) + (fronts.some((q) => q!.main) ? 3 : 0) + (open ? 2 : 0) });
  }
  cands.sort((x, y) => y.score - x.score);
  const best = cands[0];
  return best ? { x: wrapX(world, place.x + best.dx), y: place.y + best.dy } : null;
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
  for (const t of plotTiles(world, place)) {
    const s = siteAt(world, t.x, t.y);
    if (s && !SITE_DEFS[s.kind].dock && !SITE_DEFS[s.kind].station && !out.includes(s)) out.push(s);
  }
  return out;
}

/** A town's Market and Supply Yard, found from any site that belongs to the town. */
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
  const exact = world.sites.find((s) => s.x === wx && s.y === y);
  if (exact) return exact;
  for (const s of world.sites) {
    const reach = siteReach(s.kind);
    if (!reach) continue;
    const c = siteCenter(world, s);
    if (Math.abs(wrapDx(world, c.x, wx)) <= reach && Math.abs(c.y - y) <= reach) return s;
  }
  if (!world.realisticLots) return undefined;
  for (const site of world.sites) {
    if (!site.districtId) continue;
    const place = world.places.find(p => p.id === site.placeId);
    const index = place?.districtLots?.[site.districtId];
    if (!place || index === undefined) continue;
    const c = layoutOf(world, place).civic[index];
    if (c?.campus && Math.abs(wrapDx(world, place.x + c.x, wx)) <= c.campus.halfX && Math.abs(place.y + c.y - y) <= c.campus.halfY) return site;
  }
  return undefined;
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
  const wx = wrapX(world, x);
  for (const p of world.places) {
    const dx = wrapDx(world, p.x, wx);
    const dy = y - p.y;
    const reach = streetReach(radiusOf(p), 5) + 2;
    if (!world.realisticLots && (Math.abs(dx) > reach || Math.abs(dy) > reach)) continue;
    if (coverOf(world, p).has(dx + ',' + dy)) return p;
  }
  return undefined;
}

const coverCache = new WeakMap<Place, { level: number; layout: TownLayout; tiles: Set<string> }>();
/** The tiles a town covers now (offsets as "dx,dy"). */
function coverOf(world: World, p: Place): Set<string> {
  const layout = layoutOf(world, p);
  const hit = coverCache.get(p);
  if (hit && hit.level === p.level && hit.layout === layout) return hit.tiles;
  const tiles = new Set(footprint(layout, p.level).map((t) => t.x + ',' + t.y));
  coverCache.set(p, { level: p.level, layout, tiles });
  return tiles;
}

const plannedCache = new WeakMap<Place, { layout: TownLayout; tiles: Set<string> }>();
/** The tiles a town will cover once fully grown (offsets as "dx,dy"). */
function plannedCover(world: World, p: Place): Set<string> {
  const layout = layoutOf(world, p);
  const hit = plannedCache.get(p);
  if (hit && hit.layout === layout) return hit.tiles;
  const tiles = new Set(footprint(layout, 5).map((t) => t.x + ',' + t.y));
  plannedCache.set(p, { layout, tiles });
  return tiles;
}

/** The town that covers this tile now or will once it has fully grown: its future streets, homes and lots. */
export function plannedTownAt(world: World, x: number, y: number): Place | undefined {
  if (y < 0 || y >= world.height) return undefined;
  const id = plannedGrid(world)[y * world.width + wrapX(world, x)];
  return id ? world.places.find((p) => p.id === id) : undefined;
}

const plannedGrids = new WeakMap<World, { key: string; grid: Int32Array }>();
/** Every tile's fully grown town (by id, 0 for none), worked out once: placement checks ask about it constantly. */
function plannedGrid(world: World): Int32Array {
  let radii = 0;
  world.places.forEach((p, i) => (radii += ((p.radius ?? 3) + p.id) * (i + 1)));
  const key = `${world.places.length}:${!!world.realisticLots}:${radii}`;
  const hit = plannedGrids.get(world);
  if (hit && hit.key === key) return hit.grid;
  const grid = new Int32Array(world.width * world.height);
  for (const p of world.places) {
    for (const k of plannedCover(world, p)) {
      const [dx, dy] = k.split(',').map(Number);
      const ty = p.y + dy;
      if (ty < 0 || ty >= world.height) continue;
      const i = ty * world.width + wrapX(world, p.x + dx);
      if (!grid[i]) grid[i] = p.id;
    }
  }
  plannedGrids.set(world, { key, grid });
  return grid;
}

/** The town whose streets run through this tile, if any. */
export function streetAt(world: World, x: number, y: number): Place | undefined {
  const p = placeAt(world, x, y);
  return p && townStreets(world, p).has(y * world.width + wrapX(world, x)) ? p : undefined;
}

const streetCache = new WeakMap<Place, { key: string; tiles: Set<number> }>();

/**
 * A town's street tiles (as y * width + x): its main street and lanes as far as the town has grown, on dry land only,
 * with any dead end that is left (say past a building that stands in the way) trimmed.
 */
export function townStreets(world: World, place: Place): Set<number> {
  const key = `${world.routes.length}:${world.sites.length}:${place.level}:${!!world.realisticLots}`;
  const hit = streetCache.get(place);
  if (hit && hit.key === key) return hit.tiles;
  const W = world.width;
  const k = (dx: number, dy: number): number => (place.y + dy) * W + wrapX(world, place.x + dx);
  const tiles = new Set<number>();
  for (const s of layoutOf(world, place).streets) {
    if (s.level > place.level) continue;
    const x = place.x + s.x;
    const y = place.y + s.y;
    const t = terrainAt(world, x, y);
    if (t === null || t === 'water' || t === 'ice' || t === 'mountain') continue;
    if (siteAt(world, x, y)) continue;
    tiles.add(k(s.x, s.y));
  }
  // Keep only what still joins the centre (a building standing on the street cuts off the stretch beyond it).
  const centre = k(0, 0);
  const keep = new Set<number>();
  const queue = tiles.has(centre) ? [centre] : [];
  for (const t of queue) {
    if (keep.has(t)) continue;
    keep.add(t);
    const tx = t % W;
    const ty = Math.floor(t / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = (ty + dy) * W + wrapX(world, tx + dx);
      if (tiles.has(n) && !keep.has(n)) queue.push(n);
    }
  }
  tiles.clear();
  for (const t of keep) tiles.add(t);
  streetCache.set(place, { key, tiles });
  return tiles;
}

/** Which district plot of which town a tile is, if any. */
export function plotAt(world: World, x: number, y: number): { place: Place; index: number } | null {
  const wx = wrapX(world, x);
  for (const place of world.places) {
    const plots = plotTiles(world, place);
    for (let i = 0; i < plots.length; i++) {
      if (wrapX(world, plots[i].x) === wx && plots[i].y === y) return { place, index: i };
    }
  }
  return null;
}

/** The tiles of a town's district lots, wrapped. */
export function civicTiles(world: World, place: Place): Tile[] {
  return layoutOf(world, place).civic.map((c) => {
    const gate = c.campus?.gate ?? c;
    return { x: wrapX(world, place.x + gate.x), y: place.y + gate.y };
  });
}

/** The district lot on this tile, if it is one. */
export function civicAt(world: World, x: number, y: number): { place: Place; index: number } | null {
  const wx = wrapX(world, x);
  for (const place of world.places) {
    const lots = layoutOf(world, place).civic;
    for (let i = 0; i < lots.length; i++) {
      const c = lots[i];
      const dx = Math.abs(wrapDx(world, place.x + c.x, wx));
      const dy = Math.abs(place.y + c.y - y);
      if (dx <= (c.campus?.halfX ?? 0) && dy <= (c.campus?.halfY ?? 0)) return { place, index: i };
    }
  }
  return null;
}

/** The building a district stands in, if it has been built. */
export function districtSite(world: World, place: Place, id: DistrictId): Site | undefined {
  return world.sites.find((s) => s.placeId === place.id && s.districtId === id);
}

/** The sports campuses a town keeps ground for: which sport, where, how big, and whether it is built yet. */
export interface CampusSite {
  district: DistrictId;
  /** Tile of its centre, and how far it reaches either way from there. */
  x: number;
  y: number;
  halfX: number;
  halfY: number;
  built: boolean;
}

export function campusSites(world: World, place: Place): CampusSite[] {
  const used = new Set(Object.values(place.districtLots ?? {}));
  const out: CampusSite[] = [];
  layoutOf(world, place).civic.forEach((c, i) => {
    if (!c.campus) return;
    out.push({ district: c.campus.district, x: wrapX(world, place.x + c.x), y: place.y + c.y, halfX: c.campus.halfX, halfY: c.campus.halfY, built: used.has(i) });
  });
  return out;
}

/** The next free district lot: one beside a street the town has built, nearest the centre. Null when there is none. */
export function freeCivicLot(world: World, place: Place, district?: DistrictId): number | null {
  const layout = layoutOf(world, place);
  const used = new Set(Object.values(place.districtLots ?? {}));
  for (let i = 0; i < layout.civic.length; i++) {
    const c = layout.civic[i];
    const needsCampus = world.realisticLots && (district === 'stadium' || district === 'ballpark' || district === 'arena' || district === 'soccer');
    if (c.campus ? c.campus.district !== district : needsCampus) continue;
    if (used.has(i) || c.level > place.level) continue;
    if (civicFootprint(c).some(t => siteAt(world, wrapX(world, place.x + t.x), place.y + t.y) || routeAt(world, wrapX(world, place.x + t.x), place.y + t.y))) continue;
    return i;
  }
  return null;
}

/**
 * Put a district's building on a free lot beside the streets, or bring its level up to date. The building is a town point
 * like the Market: trucks bring it the goods the district lives on, and it uses them up.
 */
export function syncDistrictSite(world: World, place: Place, id: DistrictId): string | null {
  const level = place.districts?.[id] ?? 0;
  if (level <= 0) return null;
  const have = districtSite(world, place, id);
  if (have) {
    have.level = level;
    return null;
  }
  const lot = place.districtLots?.[id] ?? freeCivicLot(world, place, id);
  if (lot === null || lot === undefined) return 'No free lot for it beside the streets';
  const c = layoutOf(world, place).civic[lot];
  const gate = c.campus?.gate ?? c;
  place.districtLots ??= {};
  place.districtLots[id] = lot;
  world.sites.push({
    id: world.nextId++,
    kind: 'district',
    districtId: id,
    name: `${place.name} ${DISTRICTS[id].label}`,
    x: wrapX(world, place.x + gate.x),
    y: place.y + gate.y,
    stock: {},
    timer: 0,
    level,
    nodeId: null,
    placeId: place.id,
    pull: [],
  });
  linkTown(world, place);
  linkNetwork(world, 'road');
  sendToDistricts(world);
  return null;
}

/** Districts are fed by whoever is joined to them: switch the sale on from every factory and hub that has a lane to one. */
export function sendToDistricts(world: World): void {
  for (const r of world.routes) {
    if (r.free) continue;
    for (const [a, b] of [[r.fromSiteId, r.toSiteId], [r.toSiteId, r.fromSiteId]]) {
      const src = siteById(world, a);
      const dst = siteById(world, b);
      if (!src || !dst || SITE_DEFS[dst.kind].dock !== 'civic') continue;
      const def = SITE_DEFS[src.kind];
      if (def.dock || def.station || def.produce) continue;
      const list = (src.sendTo ??= []);
      if (!list.includes(dst.id)) list.push(dst.id);
    }
  }
}

/** Old saves have districts but no buildings for them: give each one its lot. */
export function ensureDistrictSites(world: World): void {
  for (const place of world.places) for (const id of DISTRICT_ORDER) if ((place.districts?.[id] ?? 0) > 0 && !districtSite(world, place, id)) syncDistrictSite(world, place, id);
}

/**
 * Link every pair of buildings in a town that could trade, over the town's own streets. These district links cost
 * nothing; buy a truck at either building to run goods along them. Safe to call again whenever something changes.
 */
export function linkTown(world: World, place: Place): void {
  const plots = [...plotTiles(world, place), ...civicTiles(world, place)].map((t) => ({ x: wrapX(world, t.x), y: t.y }));
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
      const reach = world.realisticLots ? Math.max(streetReach(radiusOf(place), place.level), ...layoutOf(world, place).streets.map(s => Math.abs(s.x) + Math.abs(s.y))) : streetReach(radiusOf(place), place.level);
      if (!path || path.length > 2 * reach + 8 || planRoute(world, path).error) continue;
      const route: Route = { id: world.nextId++, mode: 'road', fromSiteId: src.id, toSiteId: dst.id, path };
      world.routes.push(route);
    }
  }
  sendToDistricts(world);
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
  return homesNow(place).includes(index);
}

/** The plots that are still homes at the town's level: each level frees the LOTS_PER_LEVEL nearest the centre. */
export function homesNow(place: Place, level = place.level): number[] {
  return (place.homePlots ?? []).slice(LOTS_PER_LEVEL * (level - 1));
}

/** How many lots a town has for building at a level (not counting its Market and Supply Yard plots). */
export function lotsAt(place: Place, level = place.level): number {
  return plotCount(radiusOf(place)) - 2 - homesNow(place, level).length;
}

const futureStreets = new WeakMap<Place, { layout: TownLayout; tiles: Set<string> }>();
/** Whether a tile is on one of the town's streets at any level, built yet or not. */
function futureStreet(world: World, place: Place, x: number, y: number): boolean {
  const layout = layoutOf(world, place);
  let hit = futureStreets.get(place);
  if (!hit || hit.layout !== layout) {
    hit = { layout, tiles: new Set(layout.streets.map((s) => s.x + ',' + s.y)) };
    futureStreets.set(place, hit);
  }
  return hit.tiles.has(wrapDx(world, place.x, wrapX(world, x)) + ',' + (y - place.y));
}

/** Where a road is and is not allowed to go inside a town: roads follow the streets, rails stay off streets and plots (except the lot beside a depot). */
export function townBlocks(world: World, x: number, y: number, mode: RouteMode): boolean {
  // Ground a town will grow over is kept for it: nothing is laid across its future homes and lots. A road may take one of
  // its future streets (it becomes the street), and nothing else may.
  if (!placeAt(world, x, y)) {
    const later = plannedTownAt(world, x, y);
    if (!later) return false;
    return futureStreet(world, later, x, y) ? mode !== 'road' : true;
  }
  if (streetAt(world, x, y)) return mode !== 'road';
  if (mode === 'rail') {
    if (plotAt(world, x, y) === null && civicAt(world, x, y) === null) return false;
    return true;
  }
  return true;
}

/** The street tile a building on a plot must be reached from, or null when the tile is not a plot. */
export function entryTile(world: World, x: number, y: number): Tile | null {
  const pl = plotAt(world, x, y);
  if (pl) {
    const e = layoutOf(world, pl.place).plots[pl.index].entry;
    return { x: wrapX(world, pl.place.x + e.x), y: pl.place.y + e.y };
  }
  const lot = civicAt(world, x, y);
  if (!lot) return null;
  const e = layoutOf(world, lot.place).civic[lot.index].entry;
  return { x: wrapX(world, lot.place.x + e.x), y: lot.place.y + e.y };
}

/** First route whose path passes through the tile. */
export function routeAt(world: World, x: number, y: number, mode?: RouteMode, opts: { newest?: boolean; vehicles?: boolean } = {}): Route | undefined {
  const wx = wrapX(world, x);
  const hit = (r: Route): boolean => (mode ? r.mode === mode : r.mode !== 'air' && r.mode !== 'sea') && !(opts.vehicles && r.free) && (opts.vehicles || !r.over) && r.path.some((p) => p.x === wx && p.y === y);
  if (!opts.newest) return world.routes.find(hit);
  for (let i = world.routes.length - 1; i >= 0; i--) if (hit(world.routes[i])) return world.routes[i];
  return undefined;
}

/** Why a road, highway or rail cannot start or end on this tile when no building is there, or null. */
export function roadEndError(world: World, x: number, y: number, mode: RouteMode): string | null {
  const t = terrainAt(world, x, y);
  if (t === null) return 'Out of bounds';
  if (siteAt(world, x, y)) return null;
  if (t === 'water' || t === 'mountain' || t === 'ice') return `A ${mode === 'rail' ? 'track' : 'road'} cannot start or end on ${t}`;
  const town = placeAt(world, x, y);
  if (town && townBlocks(world, x, y, mode)) return `Not inside ${town.name}: use its streets`;
  return null;
}

/** Whether a tile already carries a road or track of this mode (a town's streets count as road), so a new one can join it. */
export function onNetwork(world: World, x: number, y: number, mode: RouteMode): boolean {
  return routeAt(world, x, y, mode) !== undefined || (mode === 'road' && streetAt(world, x, y) !== undefined);
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
  return LEVEL_SPEED[site.level - 1] * (node ? NODE_QUALITY[node.quality].mult : 1) * (town ? townSpeedMult(town, site.kind) : 1) * seasonMult(site.kind, world.tick);
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
  if (def.dock === 'civic') return site.districtId ? [...DISTRICTS[site.districtId].goods] : [];
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
  return GOODS[good].price * SALE_MULT * taste * swing * (place ? townPriceMult(place, good) * metroBonus(world, place) : 1) * (1 + 0.12 * (level - 1)) * Math.min(1.3, Math.max(0.4, 1.3 - fill)) * saleMult(world);
}

// ---- push / pull ----

/** Goods a site can ever send out. */
export function produces(site: Site): Good[] {
  const def = SITE_DEFS[site.kind];
  if (def.produce) return [def.produce.good, ...(def.produce.also ?? []).map((x) => x.good)];
  if (def.recipe) return Object.keys(def.recipe.outputs) as Good[];
  if (def.hub || def.station) return GOOD_LIST;
  return [];
}

/** The goods one line of a building carries. Hubs, terminals and stations have a single line with everything. */
export function lineGoods(site: Site, line: Line = 'main'): Good[] {
  const all = produces(site);
  const def = SITE_DEFS[site.kind];
  if (!(def.produce || def.recipe)) return all;
  return line === 'by' ? all.slice(1) : all.slice(0, 1);
}

/** The body a vehicle for one line of a building is built with, from the good that line carries. */
export function bodyForLine(site: Site, line: Line = 'main'): Body {
  const good = lineGoods(site, line)[0];
  return SITE_DEFS[site.kind].produce || SITE_DEFS[site.kind].recipe ? (good ? bodyOf(good) : 'box') : 'box';
}

/** Whether a building makes a by-product, and so has a second line. */
export function hasByLine(site: Site): boolean {
  const def = SITE_DEFS[site.kind];
  return !!(def.produce || def.recipe) && produces(site).length > 1;
}

/** Goods a site asks for. */
export function wants(world: World, site: Site): Good[] {
  const def = SITE_DEFS[site.kind];
  if (def.recipe) return site.making ? (Object.keys(def.recipe.inputs) as Good[]) : [];
  if (def.store) return Array.from(new Set([...site.pull, ...(site.fed ?? [])]));
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
  // A warehouse always takes what the factories next to it need. Anything else only when a supplier is filling up, and only
  // if there is somewhere for it to go, so by-products with no buyer cannot clog the shelves.
  const sd = SITE_DEFS[site.kind];
  if (from && sd.store && !SITE_DEFS[from.kind].hub && !SITE_DEFS[from.kind].station && !(site.fed ?? []).includes(good) && (site.hubMode ?? 'overflow') === 'overflow') {
    if (stockOf(from, good) / Math.max(1, siteCap(world, from)) < (site.trigger ?? HUB_TRIGGER)) return 0;
    if (!hasOutlet(world, site, good)) return 0;
  }
  if (from && SITE_DEFS[site.kind].hub && SITE_DEFS[from.kind].hub) {
    const sendRatio = stockOf(from, good) / siteCap(world, from);
    const recvRatio = stockOf(site, good) / cap;
    if (sendRatio <= recvRatio + 0.15) return 0;
  }
  return room;
}

/** Best cargo to haul from `src` to `dst`: the most valuable good that src has and dst needs. */
export function pickCargo(world: World, src: Site, dst: Site, capacity: number, line?: Line, body?: Body): { good: Good; amount: number } | null {
  if (!sendAllowed(src, dst, line ?? 'main')) return null;
  let best: { good: Good; amount: number } | null = null;
  let bestValue = 0;
  for (const g of line ? lineGoods(src, line) : GOOD_LIST) {
    if (body && body !== 'box' && bodyOf(g) !== body) continue;
    const amount = Math.floor(Math.min(capacity, offers(src, g), needs(world, dst, g, src)));
    if (amount < 1) continue;
    // A yard, port or airport waits for a worthwhile load unless its store is nearly full.
    if (src.minLoad && amount < src.minLoad * capacity && stockOf(src, g) < 0.9 * siteCap(world, src)) continue;
    const value = amount * GOODS[g].price;
    if (value > bestValue) {
      bestValue = value;
      best = { good: g, amount };
    }
  }
  return best;
}

/**
 * Whether `a` may send to `b`. Everything sells to anything it is joined to; which buyer a truck goes to is settled by
 * the truck's own destination and what it prefers. Only an old save's switched-off sale still holds.
 */
export function sendAllowed(a: Site, b: Site, line: Line = 'main'): boolean {
  const def = SITE_DEFS[a.kind];
  if (def.station) return true;
  return !(line === 'by' ? a.byOff ?? a.sendOff ?? [] : a.sendOff ?? []).includes(b.id);
}

/** Whether `a` makes or passes on something `b` asks for, and is allowed to send it. */
export function supplies(world: World, a: Site, b: Site, line: Line = 'main'): boolean {
  if (!sendAllowed(a, b, line)) return false;
  const asked = wants(world, b);
  return lineGoods(a, line).some((g) => asked.includes(g));
}

/** What a building could ask for if the player switched everything on. */
function wantsEver(world: World, site: Site): Good[] {
  const def = SITE_DEFS[site.kind];
  return def.recipe ? (Object.keys(def.recipe.inputs) as Good[]) : wants(world, site);
}

/** Whether the two sites could ever trade, so a route between them makes sense. */
export function canHaul(world: World, a: Site, b: Site): boolean {
  const defA = SITE_DEFS[a.kind];
  const defB = SITE_DEFS[b.kind];
  if (defA.hub || defB.hub) return true;
  const ab = produces(a).some((g) => wantsEver(world, b).includes(g));
  const ba = produces(b).some((g) => wantsEver(world, a).includes(g));
  return ab || ba;
}

/** Whether `a` could ever send `b` something, ignoring what is switched on. */
function couldSend(world: World, a: Site, b: Site, line: Line = 'main'): boolean {
  if (SITE_DEFS[a.kind].dock) return false;
  const mine = lineGoods(a, line);
  if (SITE_DEFS[b.kind].hub) return mine.length > 0;
  return mine.some((g) => wantsEver(world, b).includes(g));
}

/** The buildings a site has a route to and could sell to, with whether the sale is on. */
export function sellTargets(world: World, site: Site, line: Line = 'main'): { site: Site; on: boolean; goods: Good[] }[] {
  const out: { site: Site; on: boolean; goods: Good[] }[] = [];
  const seen = new Set<number>();
  const mine = lineGoods(site, line);
  for (const r of world.routes) {
    if (r.free || (r.fromSiteId !== site.id && r.toSiteId !== site.id)) continue;
    const other = siteById(world, r.fromSiteId === site.id ? r.toSiteId : r.fromSiteId);
    if (!other || seen.has(other.id) || !couldSend(world, site, other, line)) continue;
    seen.add(other.id);
    const goods = SITE_DEFS[other.kind].hub ? mine : mine.filter((g) => wantsEver(world, other).includes(g));
    out.push({ site: other, on: sendAllowed(site, other, line), goods });
  }
  return out;
}

/** Switch a sale from one building to another on or off. */
export function setSendTo(world: World, siteId: number, destId: number, on: boolean, line: Line = 'main'): void {
  const site = siteById(world, siteId);
  if (!site) return;
  const by = line === 'by';
  // The by-product list starts as a copy of the main one, then goes its own way.
  const off = by ? (site.byOff ??= [...(site.sendOff ?? [])]) : (site.sendOff ??= []);
  const next = on ? off.filter((id) => id !== destId) : off.includes(destId) ? off : [...off, destId];
  if (by) site.byOff = next;
  else site.sendOff = next;
}

export interface Buyer {
  site: Site;
  /** The goods of ours it would take. */
  goods: Good[];
  /** Joined to us by road, track or air already. */
  connected: boolean;
  /** Selling to it is switched on. */
  on: boolean;
  /** Rough takings per minute for one box truck on the run, so the best buyer can be picked out. Only worked out for buyers not yet joined. */
  perMinute?: number;
}

/** Everyone who could buy what this building makes: those already joined to it first, then the nearest few that are not. */
export function buyersFor(world: World, site: Site, extra = 3, line: Line = 'main'): Buyer[] {
  const def = SITE_DEFS[site.kind];
  if (def.dock || def.station) return [];
  const joined = sellTargets(world, site, line);
  const out: Buyer[] = joined.map((t) => ({ site: t.site, goods: t.goods, connected: true, on: t.on }));
  if (def.hub || extra <= 0) return out;
  const mine = lineGoods(site, line);
  const seen = new Set(joined.map((t) => t.site.id));
  const d2 = (o: Site): number => wrapDx(world, site.x, o.x) ** 2 + (site.y - o.y) ** 2;
  const far = world.sites
    .filter((o) => o.id !== site.id && !seen.has(o.id) && !SITE_DEFS[o.kind].station && !SITE_DEFS[o.kind].hub && !SITE_DEFS[o.kind].produce)
    .map((o) => ({ o, goods: mine.filter((g) => wantsEver(world, o).includes(g)) }))
    .filter((x) => x.goods.length > 0 && d2(x.o) < 40 * 40)
    .map((x) => ({ ...x, perMinute: runValue(world, site, x.o, x.goods, Math.sqrt(d2(x.o))) }))
    .sort((a, b) => b.perMinute - a.perMinute)
    .slice(0, extra);
  for (const x of far) out.push({ site: x.o, goods: x.goods, connected: false, on: false, perMinute: x.perMinute });
  return out;
}

/**
 * What a box truck would take on a run from one building to a buyer, per minute: the load times what the buyer pays, over the
 * round trip. A factory buyer pays nothing itself but turns the goods into dearer ones, so it counts for a little less than a
 * market. Buyers that are already full count for less, and far ones lose to near ones through the longer trip.
 */
function runValue(world: World, from: Site, to: Site, goods: Good[], dist: number): number {
  const truck = VEHICLE_DEFS.boxtruck;
  const dock = SITE_DEFS[to.kind].dock;
  const price = Math.max(...goods.map((g) => (dock ? unitPrice(world, to, g) : GOODS[g].price * 0.6)));
  const room = Math.max(0.15, 1 - Math.max(...goods.map((g) => stockOf(to, g))) / Math.max(1, siteCap(world, to)));
  const trip = 2 * dist * truck.ticksPerTile + 50;
  void from;
  return (truck.capacity * price * room * 600) / trip;
}

/** The road a "Build road" button would lay from one building to another, priced, or null if none can be found. */
export function roadPlan(world: World, fromId: number, toId: number): RoutePlan | null {
  const a = siteById(world, fromId);
  const b = siteById(world, toId);
  if (!a || !b) return null;
  const path = findPath(world, a, b, 60000, 'road');
  if (!path) return null;
  const plan = planRoute(world, path, 'road', 'street');
  return plan.error ? null : plan;
}

/** Lay a road between two buildings and start selling along it. */
export function buildRoadTo(world: World, fromId: number, toId: number): string | null {
  const plan = roadPlan(world, fromId, toId);
  if (!plan) return 'No way through for a road from here';
  const err = createRoute(world, plan.path, 'road', 'street');
  if (err) return err;
  connectSites(world, [fromId, toId]);
  setSendTo(world, fromId, toId, true);
  return null;
}

/** Switch a processor's production on or off. */
export function setMaking(world: World, siteId: number, on: boolean): void {
  const site = siteById(world, siteId);
  if (site && SITE_DEFS[site.kind].recipe) site.making = on;
}

// ---- simulation ----

/** How full a supplier's store must be before an overflow hub takes its goods. */
export const HUB_TRIGGER = 0.6;
/** Whether anything joined to a warehouse would take a good from it: a buyer, a factory or a terminal. */
function hasOutlet(world: World, hub: Site, good: Good): boolean {
  return sellTargets(world, hub).some((t) => {
    const d = SITE_DEFS[t.site.kind];
    return d.railyard || d.port || d.airport || (!d.hub && wantsEver(world, t.site).includes(good));
  });
}

/** What a warehouse asks for: the inputs of every business in its reach. */
function refreshFed(world: World, depot: Site): void {
  const near = world.sites.filter((o) => SITE_DEFS[o.kind].recipe && wrapDx(world, o.x, depot.x) ** 2 + (o.y - depot.y) ** 2 <= DEPOT_REACH ** 2);
  depot.fed = Array.from(new Set(near.flatMap((o) => Object.keys(SITE_DEFS[o.kind].recipe!.inputs) as Good[])));
}

/** How far a Storage Depot's stock reaches to the businesses around it, in tiles. */
export const DEPOT_REACH = 14;

/** Storage Depots within reach of a site, nearest first. */
export function depotsNear(world: World, site: Site): Site[] {
  return world.sites
    .filter((d) => SITE_DEFS[d.kind].store && wrapDx(world, d.x, site.x) ** 2 + (d.y - site.y) ** 2 <= DEPOT_REACH ** 2)
    .sort((a, b) => wrapDx(world, a.x, site.x) ** 2 + (a.y - site.y) ** 2 - (wrapDx(world, b.x, site.x) ** 2 + (b.y - site.y) ** 2));
}

/** A business short of an input takes it from the nearest depot that has it: a few runs' worth at a time. */
function drawFromDepot(world: World, site: Site, inputs: Partial<Record<Good, number>>): void {
  let depots: Site[] | null = null;
  for (const [g, n] of Object.entries(inputs)) {
    const need = (n ?? 0) * 4 - stockOf(site, g as Good);
    if (stockOf(site, g as Good) >= (n ?? 0)) continue;
    depots ??= depotsNear(world, site);
    for (const d of depots) {
      const take = Math.min(need, Math.floor(stockOf(d, g as Good)));
      if (take < 1) continue;
      addStock(d, g as Good, -take);
      addStock(site, g as Good, take);
      break;
    }
  }
}

export function setHubOptions(world: World, siteId: number, o: { hubMode?: 'overflow' | 'all'; trigger?: number; minLoad?: number }): void {
  const site = siteById(world, siteId);
  if (!site) return;
  if (o.hubMode) site.hubMode = o.hubMode;
  if (o.trigger !== undefined) site.trigger = Math.max(0.2, Math.min(1, o.trigger));
  if (o.minLoad !== undefined) site.minLoad = Math.max(0, Math.min(1, o.minLoad));
}

/** Keep a running average of how much of the time a building is making goods, and say so in the log when a factory starves. */
function noteRun(world: World, site: Site, working: boolean, stall: Site['stall']): void {
  site.run = (site.run ?? (working ? 1 : 0)) + ((working ? 1 : 0) - (site.run ?? (working ? 1 : 0))) * 0.005;
  site.stall = stall;
  if (working && (site.run ?? 0) > 0.6) site.stallLogged = false;
  if (stall === 'input' && !site.stallLogged && (site.run ?? 0) < 0.2 && world.tick % 100 === 0) {
    site.stallLogged = true;
    const def = SITE_DEFS[site.kind];
    const short = def.recipe ? (Object.keys(def.recipe.inputs) as Good[]).find((g) => stockOf(site, g) < (def.recipe!.inputs[g] ?? 0)) : undefined;
    addLog(world, `${site.name} has stopped: out of ${short ? GOODS[short].label.toLowerCase() : 'inputs'}`);
  }
}

/** What a producer or processor makes and uses each minute at its level, if it never stalls. */
export function ratePerMin(world: World, site: Site): { out: Partial<Record<Good, number>>; in: Partial<Record<Good, number>> } | null {
  const def = SITE_DEFS[site.kind];
  const speed = siteSpeed(world, site);
  const perMin = (n: number, every: number): number => Math.round(((n * speed * TICKS_PER_SECOND * 60) / every) * 10) / 10;
  if (def.produce) {
    const out: Partial<Record<Good, number>> = { [def.produce.good]: perMin(1, def.produce.every) };
    for (const x of def.produce.also ?? []) out[x.good] = perMin(1, x.every);
    return { out, in: {} };
  }
  if (def.recipe) {
    const out: Partial<Record<Good, number>> = {};
    const inn: Partial<Record<Good, number>> = {};
    for (const [g, n] of Object.entries(def.recipe.outputs)) out[g as Good] = perMin(n ?? 0, def.recipe.every);
    for (const [g, n] of Object.entries(def.recipe.inputs)) inn[g as Good] = perMin(n ?? 0, def.recipe.every);
    return { out, in: inn };
  }
  return null;
}

export interface Bottleneck {
  site: Site;
  stall: 'off' | 'input' | 'room';
  /** Money a minute the stall is costing, at what the goods sell for. */
  lostPerMin: number;
}

/** Factories and producers held up, worst first: the ones costing the most each minute. Switched-off factories are not counted. */
export function bottlenecks(world: World): Bottleneck[] {
  const out: Bottleneck[] = [];
  for (const site of world.sites) {
    const r = ratePerMin(world, site);
    if (!r || !site.stall || site.stall === 'off') continue;
    const idle = 1 - (site.run ?? 0);
    if (idle < 0.3) continue;
    let value = 0;
    for (const [g, n] of Object.entries(r.out)) value += (n ?? 0) * GOODS[g as Good].price;
    out.push({ site, stall: site.stall, lostPerMin: Math.round(value * idle) });
  }
  return out.sort((a, b) => b.lostPerMin - a.lostPerMin);
}

function stepSite(world: World, site: Site): void {
  const def = SITE_DEFS[site.kind];
  const cap = siteCap(world, site);
  if (def.produce) {
    const { good, every, also } = def.produce;
    const speed = siteSpeed(world, site);
    const working = stockOf(site, good) < cap;
    noteRun(world, site, working, working ? null : 'room');
    if (working) {
      site.timer += speed;
      if (site.timer >= every) {
        site.timer -= every;
        addStock(site, good, 1);
        world.produced[good] = (world.produced[good] ?? 0) + 1;
      }
    }
    // By-products come out beside the main good and wait for a truck the same way. A full shelf of one never stalls the other.
    if (also) {
      const t = (site.extra ??= []);
      also.forEach((x, i) => {
        if (stockOf(site, x.good) >= cap) return;
        t[i] = (t[i] ?? 0) + speed;
        if (t[i] >= x.every) {
          t[i] -= x.every;
          addStock(site, x.good, 1);
          world.produced[x.good] = (world.produced[x.good] ?? 0) + 1;
        }
      });
    }
    return;
  }
  if (def.recipe) {
    const { inputs, outputs, every } = def.recipe;
    if (!site.making) {
      site.timer = 0;
      noteRun(world, site, false, 'off');
      return;
    }
    if (world.tick % 10 === 0) drawFromDepot(world, site, inputs);
    const hasInputs = Object.entries(inputs).every(([g, n]) => stockOf(site, g as Good) >= (n ?? 0));
    // Only the main product (listed first) can stall the building. By-products that do not fit are simply lost.
    const hasRoom = stockOf(site, Object.keys(outputs)[0] as Good) < cap;
    if (!hasInputs || !hasRoom) {
      site.timer = 0;
      noteRun(world, site, false, hasInputs ? 'room' : 'input');
      return;
    }
    noteRun(world, site, true, null);
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
  if (def.store) {
    if (world.tick % 50 === 0) refreshFed(world, site);
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
  if (def.dock === 'civic') {
    // A district uses up what it is sent: faster as it grows.
    for (const g of dockDemand(world, site)) if (stockOf(site, g) > 0) site.stock[g] = Math.max(0, stockOf(site, g) - 0.006 * site.level);
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

/** Whether a town has earned its next level: enough growth, and enough different goods sold to it. */
export function readyToGrow(place: Place): boolean {
  const next = TOWN_LEVELS[place.level];
  if (!next) return false;
  return place.growth >= next.growth && growthKinds(place) >= place.level;
}

/** A town does not grow by itself: once it has earned it, the player is told, and finishes the upgrade with growTown. */
export function checkTown(world: World, place: Place): void {
  if (!readyToGrow(place) || place.readyAt === place.level) return;
  place.readyAt = place.level;
  addLog(world, `${place.name} is ready to grow into a ${TOWN_LEVELS[place.level].name}`);
}

export interface GrowPreview {
  from: string;
  to: string;
  popFrom: number;
  popTo: number;
  /** Goods its Market starts buying, and goods its Supply Yard starts buying. */
  newMarket: Good[];
  newFreight: Good[];
  /** The Supply Yard opens with this level. */
  freightOpens: boolean;
  /** Price bonus on everything it buys, in percent, before and after. */
  priceFrom: number;
  priceTo: number;
  /** How much its Market and Supply Yard can hold, per good. */
  storeFrom: number;
  storeTo: number;
  /** Districts that can be built from this level, and whether it can pick a specialisation. */
  districts: string[];
  pathOpens: boolean;
  /** Building lots in the town before and after. */
  lotsFrom: number;
  lotsTo: number;
}

/** What growing a town to its next level would change. */
export function growPreview(place: Place): GrowPreview | null {
  const next = TOWN_LEVELS[place.level];
  if (!next) return null;
  const lv = place.level;
  const market = (l: number): Good[] => MARKET_DEMAND[l - 1] ?? [];
  const freight = (l: number): Good[] => (l >= 2 ? FREIGHT_DEMAND[Math.min(FREIGHT_DEMAND.length, l) - 1] : []);
  const store = (l: number): number => Math.round(SITE_DEFS.market.cap * l * (radiusOf(place) > 3 ? 2 : 1) * townStorageMult(place));
  return {
    from: TOWN_LEVELS[lv - 1].name,
    to: next.name,
    popFrom: TOWN_LEVELS[lv - 1].pop,
    popTo: next.pop,
    newMarket: market(lv + 1).filter((g) => !market(lv).includes(g)),
    newFreight: lv + 1 >= 2 ? freight(lv + 1).filter((g) => !freight(lv).includes(g)) : [],
    freightOpens: lv + 1 === 2,
    priceFrom: Math.round(12 * (lv - 1)),
    priceTo: Math.round(12 * lv),
    storeFrom: store(lv),
    storeTo: store(lv + 1),
    districts: DISTRICT_ORDER.filter((id) => DISTRICTS[id].minLevel === lv + 1 && !DISTRICTS[id].path).map((id) => DISTRICTS[id].label),
    pathOpens: lv + 1 === PATH_TOWN_LEVEL,
    lotsFrom: lotsAt(place, lv),
    lotsTo: lotsAt(place, lv + 1),
  };
}

/** Finish a town's upgrade to its next level. */
export function growTown(world: World, placeId: number): string | null {
  const place = world.places.find((p) => p.id === placeId);
  if (!place) return 'No such town';
  if (!readyToGrow(place)) return `${place.name} is not ready to grow yet`;
  const next = TOWN_LEVELS[place.level];
  place.level += 1;
  addLog(world, `${place.name} grew into a ${next.name}`);
  if (place.level === 2) addDock(world, place, 'freight');
  linkTown(world, place);
  checkTown(world, place);
  return null;
}

/** Share of a town's growth that its partner also earns, and how much more the smaller of a joined pair catches up. */
export const JOIN_SHARE = 0.2;
export const JOIN_CATCH_UP = 0.1;

/** Pair each town with the one it has grown into (see blendPartner), once, when the world is made. */
export function linkPartners(world: World): void {
  for (const p of world.places) {
    const q = blendPartner(world, p);
    if (q) p.partnerId = q.id;
    else delete p.partnerId;
  }
}

/** The town this one has grown into, if any. Two towns that have joined stay two towns: their own names, markets and districts. */
export function partnerOf(world: World, place: Place): Place | undefined {
  return place.partnerId ? world.places.find((q) => q.id === place.partnerId) : undefined;
}

/** How many different goods count toward a town's growth: what was sold to it, and half of what was sold to its partner. */
export function growthKinds(place: Place): number {
  return GOOD_LIST.filter((g) => (place.delivered[g] ?? 0) > 0 || (place.partnerDelivered?.[g] ?? 0) > 0).length;
}

/** A joined pair is a metro area once both have reached a level 3 town: the pair sell a little better together. */
export function metroBonus(world: World, place: Place): number {
  const q = partnerOf(world, place);
  return q && place.level >= 3 && q.level >= 3 ? 1 + 0.02 * Math.min(place.level, q.level) : 1;
}

/** A town dock buys `amount` of a good: money in, and the town grows. */
export function sell(world: World, dock: Site, g: Good, amount: number): number {
  const place = placeOf(world, dock);
  addStock(dock, g, amount);
  if (!place) return 0;
  const gain = amount * unitPrice(world, dock, g);
  world.money += gain;
  world.earned += gain;
  world.delivered[g] = (world.delivered[g] ?? 0) + amount;
  place.delivered[g] = (place.delivered[g] ?? 0) + amount;
  const earned = amount * GOODS[g].price * townGrowthMult(place);
  place.growth += earned;
  checkTown(world, place);
  // A town that has grown into another shares what it earns: the smaller of the two catches up faster, and the variety of
  // goods sold to either counts for both. Each stays a town of its own.
  const mate = partnerOf(world, place);
  if (mate) {
    const behind = Math.max(0, Math.min(3, place.level - mate.level));
    mate.growth += earned * (JOIN_SHARE + JOIN_CATCH_UP * behind);
    (mate.partnerDelivered ??= {})[g] = (mate.partnerDelivered[g] ?? 0) + amount;
    checkTown(world, mate);
  }
  return gain;
}

/** How much of a good a building has room to take right now. */
function roomFor(world: World, site: Site, g: Good): number {
  return Math.max(0, Math.floor(siteCap(world, site) - stockOf(site, g)));
}

/**
 * Hand a load over. A buyer only takes what it has room for; whatever is left stays on the vehicle (v.cargo, v.good) so it
 * can try the next best buyer. Returns how much was left.
 */
function deliver(world: World, site: Site, v: Vehicle, all = true): number {
  const g = v.good;
  const total = v.cargo;
  if (!g || total <= 0) {
    v.cargo = 0;
    v.good = null;
    return 0;
  }
  const amount = all ? total : Math.min(total, roomFor(world, site, g));
  v.cargo = total - amount;
  if (v.cargo <= 0) v.good = null;
  if (amount <= 0) return v.cargo;
  if (SITE_DEFS[site.kind].dock) {
    const gain = sell(world, site, g, amount);
    const src = v.fromId === undefined ? undefined : siteById(world, v.fromId);
    if (src) {
      const rec = ((src.sales ??= {})[site.id] ??= { units: 0, money: 0 });
      rec.units += amount;
      rec.money += gain;
      const hist = (src.history ??= []);
      hist.push({ tick: world.tick, good: g, units: amount, money: gain, toId: site.id });
      if (hist.length > HISTORY_JOBS) hist.shift();
    }
  }
  else addStock(site, g, amount);
  return v.cargo;
}

/**
 * A vehicle back home with part of a load the first buyer could not take: the best other run that will take it, or none.
 * "Best" is the one that pays the most for it, then the nearest.
 */
function detourRoute(world: World, v: Vehicle, from: Route): Route | undefined {
  const g = v.good;
  const home = siteById(world, v.homeId);
  if (!g || !home) return undefined;
  let best: Route | undefined;
  let bestPay = -Infinity;
  for (const r of world.routes) {
    if (r.id === from.id || !laneOk(world, v, r)) continue;
    const other = siteById(world, r.fromSiteId === v.homeId ? r.toSiteId : r.fromSiteId);
    if (!other || roomFor(world, other, g) < 1 || !wants(world, other).includes(g)) continue;
    const pay = SITE_DEFS[other.kind].dock ? unitPrice(world, other, g) : SITE_DEFS[other.kind].hub ? 0 : GOODS[g].price * 0.6;
    const score = pay - r.path.length * 0.001;
    if (score > bestPay) {
      best = r;
      bestPay = score;
    }
  }
  return best;
}

/** Ticks to cover one tile on this route: highways are faster. */
/** The driver's level, 1 to 5, from how many deliveries the vehicle has made. */
export function driverLevel(v: { trips?: number }): number {
  const t = v.trips ?? 0;
  let lv = 1;
  DRIVER_TRIPS.forEach((n, i) => {
    if (t >= n) lv = i + 1;
  });
  return lv;
}

/** Ticks a vehicle needs for a tile: its class's time, less what its driver's experience saves. */
export function vehicleTicks(v: { kind: VehicleKind; trips?: number; wear?: number }): number {
  return VEHICLE_DEFS[v.kind].ticksPerTile * (1 - DRIVER_SPEED * (driverLevel(v) - 1)) * (1 + WEAR_SLOWDOWN * (v.wear ?? 0));
}

export function routeTicks(route: Route, base: number): number {
  return route.grade === 'highway' ? base * HIGHWAY_TIME : base;
}

/** Index of the vehicle's home end on a route it works. */
function homeEnd(route: Route, v: Vehicle): 0 | -1 {
  return route.fromSiteId === v.homeId ? 0 : -1;
}

/** Whether this vehicle may work this route: the right kind of route, its home on it, and its home selling to the other end. */
export function laneOk(world: World, v: Vehicle, route: Route): boolean {
  if (route.free || route.mode !== VEHICLE_DEFS[v.kind].mode) return false;
  if (route.mode === 'sea' && (VEHICLE_DEFS[v.kind].draft ?? 0) > (route.draft ?? 2)) return false;
  if (route.fromSiteId !== v.homeId && route.toSiteId !== v.homeId) return false;
  const home = siteById(world, v.homeId);
  const other = siteById(world, route.fromSiteId === v.homeId ? route.toSiteId : route.fromSiteId);
  if (!home || !other) return false;
  if (v.destId && v.destId !== other.id) return false;
  // A vehicle carries its own building's goods out. Supplying a hub or factory is the supplier's job, not theirs.
  return supplies(world, home, other, v.line ?? 'main');
}

/** How good a run looks to a vehicle with a preference: higher is better. Unset or 'any' scores every run the same. */
function routeScore(world: World, v: Vehicle, r: Route): number {
  const mode = v.pick ?? 'any';
  if (mode === 'any') return 0;
  const home = siteById(world, v.homeId);
  const other = siteById(world, r.fromSiteId === v.homeId ? r.toSiteId : r.fromSiteId);
  if (!home || !other) return -Infinity;
  const asked = wants(world, other);
  const goods = lineGoods(home, v.line ?? 'main').filter((g) => asked.includes(g));
  if (goods.length === 0) return -1;
  const fill = (g: Good): number => stockOf(other, g) / Math.max(1, siteCap(world, other));
  const price = (g: Good): number => (SITE_DEFS[other.kind].dock ? unitPrice(world, other, g) : SITE_DEFS[other.kind].hub ? 0 : GOODS[g].price * 0.6);
  if (mode === 'demand') return Math.max(...goods.map((g) => 1 - fill(g)));
  if (mode === 'price') return Math.max(...goods.map(price));
  if (mode === 'near') return -r.path.length;
  return Math.max(...goods.map((g) => price(g) * Math.max(0.15, 1 - fill(g)))) / (r.path.length + 10);
}

/** The run a vehicle should be on: its preferred one, and among equals the least busy. */
function bestRoute(world: World, v: Vehicle): Route | undefined {
  let best: Route | undefined;
  let bestScore = -Infinity;
  let bestLoad = Infinity;
  for (const r of world.routes) {
    if (!laneOk(world, v, r)) continue;
    const load = world.vehicles.reduce((n, x) => n + (x.routeId === r.id ? 1 : 0), 0);
    const score = routeScore(world, v, r);
    if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) <= 1e-9 && load < bestLoad)) {
      best = r;
      bestScore = score;
      bestLoad = load;
    }
  }
  return best;
}

/** Put a waiting vehicle on the best run it is allowed to take. Returns whether it found one. */
export function assignVehicle(world: World, v: Vehicle): boolean {
  const best = bestRoute(world, v);
  if (!best) return false;
  v.routeId = best.id;
  v.idx = homeEnd(best, v) === 0 ? 0 : best.path.length - 1;
  v.dir = v.idx === 0 ? 1 : -1;
  v.state = 'loading';
  v.moveTimer = 0;
  v.cargo = 0;
  v.good = null;
  return true;
}

export function setVehiclePick(world: World, vehicleId: number, pick: PickMode): void {
  const v = world.vehicles.find((x) => x.id === vehicleId);
  if (v) v.pick = pick;
}

function stepVehicle(world: World, v: Vehicle): void {
  if (v.back) {
    stepRetreat(world, v);
    return;
  }
  const route = v.routeId === 0 ? undefined : world.routes.find((r) => r.id === v.routeId);
  if (!route) {
    // Waiting at home: look for a route a few times a second.
    v.routeId = 0;
    if ((world.tick + v.id) % LOAD_CHECK_EVERY === 0) assignVehicle(world, v);
    return;
  }
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
      const homeIdx = homeEnd(route, v) === 0 ? 0 : last;
      const atHome = v.idx === homeIdx;
      const away: 1 | -1 = v.idx === 0 ? 1 : -1;
      // The player switched this run off (or removed what it served): park at home, or drive back there empty.
      if (!laneOk(world, v, route)) {
        if (atHome) v.routeId = 0;
        else {
          v.state = 'moving';
          v.dir = away;
        }
        v.moveTimer = 0;
        break;
      }
      // A vehicle with a preference looks again at home between trips, so it follows demand and prices as they change.
      if (atHome && v.pick && v.pick !== 'any' && !v.destId) {
        const better = bestRoute(world, v);
        if (better && better.id !== route.id && routeScore(world, v, better) > routeScore(world, v, route) + 1e-9) {
          v.routeId = better.id;
          v.idx = homeEnd(better, v) === 0 ? 0 : better.path.length - 1;
          v.dir = v.idx === 0 ? 1 : -1;
          v.moveTimer = 0;
          break;
        }
      }
      const hereTown = siteTown(world, here);
      const capacity = Math.floor(vdef.capacity * (hereTown ? townLoadMult(hereTown) : 1));
      const pick = pickCargo(world, here, there, capacity, atHome ? v.line ?? 'main' : undefined, atHome ? v.body : undefined);
      // A full load is the vehicle's capacity, or nine tenths of what the building can hold when that is smaller, so it can always fill.
      // The same goes for the buyer: it can never take more than it can hold, so a small buyer sets the size of a full load.
      const fullLoad = Math.max(1, Math.min(capacity, Math.floor(siteCap(world, here) * 0.9), Math.floor(siteCap(world, there) * 0.9)));
      const waited = v.moveTimer;
      // Leaving home always takes a full load: the vehicle waits until it has one. Only a backhaul from the far end may go part full.
      const enough = pick !== null && (atHome ? pick.amount >= fullLoad * LOAD_WAIT_FRACTION : pick.amount >= capacity * 0.4);
      // Having come all this way for it (home has nothing to send back), take whatever is waiting.
      const fetch = pick !== null && !atHome && !pickCargo(world, there, here, capacity);
      if (pick && (enough || fetch)) {
        take(here, pick.good, pick.amount);
        v.fromId = here.id;
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
      if (v.moveTimer < routeTicks(route, vehicleTicks(v))) break;
      v.moveTimer = 0;
      v.idx += v.dir;
      v.wear = Math.min(1, (v.wear ?? 0) + wearMult(world) / WEAR_TILES);
      if (v.idx <= 0 || v.idx >= last) {
        v.idx = v.idx <= 0 ? 0 : last;
        v.state = 'unloading';
      }
      break;
    }
    case 'unloading': {
      const atHomeEnd = (v.idx === 0) === (homeEnd(route, v) === 0);
      const site = v.idx === 0 ? from : to;
      // Arriving at a buyer with a load is a trip: it counts toward the driver's rank.
      if (!atHomeEnd && v.cargo > 0) v.trips = (v.trips ?? 0) + 1;
      if (atHomeEnd) {
        if (v.cargo > 0 && v.good && v.fromId === v.homeId) {
          // Back home still carrying what the buyer could not take: try the next best buyer before loading again.
          const next = detourRoute(world, v, route);
          if (next) {
            v.routeId = next.id;
            v.idx = homeEnd(next, v) === 0 ? 0 : next.path.length - 1;
            v.dir = v.idx === 0 ? 1 : -1;
            v.state = 'moving';
            v.moveTimer = 0;
            break;
          }
        }
        // Nothing else will take it: it goes back on the shelf.
        deliver(world, site, v);
      } else if (v.fromId === v.homeId && deliver(world, site, v, false) > 0) {
        // The buyer filled up: take the rest back along the same road and look for another buyer.
        v.dir = homeEnd(route, v) === 0 ? -1 : 1;
        v.state = 'moving';
        v.moveTimer = 0;
        break;
      }
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
  if (world.tick % 10 === 0) {
    stepEconomy(world);
    stepBank(world);
  }
  // Streets grow with the towns and old saves come in unjoined: keep everything on one network joined.
  if (world.tick % 100 === 0) {
    ensureDistrictSites(world);
    linkNetwork(world, 'road');
    linkNetwork(world, 'rail');
    sendToDistricts(world);
  }
  if (world.tick % 300 === 0) stepAutoBuy(world);
  checkQuests(world, (text) => addLog(world, text));
}

/** The most trucks a building asks for on each line. */
export const AUTO_BUY_MAX = 6;

/** How long a declined offer stays quiet. */
const SNOOZE_TICKS = TICKS_PER_SECOND * 180;

/**
 * Buildings with Auto-buy on ask for a truck when a line is nearly full, at least one truck is already on it and none are
 * idle. The player confirms each purchase, so nothing is bought behind their back, and play carries on while they decide.
 */
function stepAutoBuy(world: World): void {
  const offers = (world.offers ??= []);
  // Drop offers that no longer make sense: the building is gone, switched off, or the need has passed.
  world.offers = offers.filter((o) => {
    const s = siteById(world, o.siteId);
    return !!s && !!s.autoBuy && offerNeeded(world, s, o.line);
  });
  for (const s of world.sites) {
    if (!s.autoBuy || world.tick < (s.autoSnooze ?? 0)) continue;
    for (const line of ['main', 'by'] as Line[]) {
      if (world.offers.some((o) => o.siteId === s.id && o.line === line)) continue;
      if (!offerNeeded(world, s, line)) continue;
      const kind = buyOptions(world, s.id)[0];
      if (kind) world.offers.push({ siteId: s.id, line, kind });
    }
  }
}

function offerNeeded(world: World, s: Site, line: Line): boolean {
  const def = SITE_DEFS[s.kind];
  if (def.dock || def.station || def.hub) return false;
  if (line === 'by' && !hasByLine(s)) return false;
  const cap = siteCap(world, s);
  const full = lineGoods(s, line).some((g) => stockOf(s, g) / Math.max(1, cap) >= 0.9);
  const fleet = fleetOf(world, s.id, line);
  return full && fleet.length > 0 && fleet.length < AUTO_BUY_MAX && !fleet.some((v) => v.routeId === 0);
}

/** The player said yes to a truck offer. */
export function acceptOffer(world: World, offer: TruckOffer): string | null {
  const s = siteById(world, offer.siteId);
  world.offers = (world.offers ?? []).filter((o) => o !== offer);
  if (!s) return 'That building is gone';
  return buyVehicle(world, offer.siteId, offer.kind, offer.line);
}

/** The player said not now: ask again in a few minutes. */
export function declineOffer(world: World, offer: TruckOffer): void {
  world.offers = (world.offers ?? []).filter((o) => o !== offer);
  const s = siteById(world, offer.siteId);
  if (s) s.autoSnooze = world.tick + SNOOZE_TICKS;
}

export function setAutoBuy(world: World, siteId: number, on: boolean): void {
  const s = siteById(world, siteId);
  if (s) s.autoBuy = on;
}

// ---- player actions. Each returns an error string, or null on success. ----

/** Why a site cannot be placed here, or null if it can. Does not change the world. */
export function placeError(world: World, kind: SiteKind, x: number, y: number, rot?: Rot): string | null {
  const def = SITE_DEFS[kind];
  if (def.dock || def.station) return 'Towns build their own docks and stations';
  const t = terrainAt(world, x, y);
  if (t === null) return 'Out of bounds';
  if (def.tier > world.tier) return `${def.label} unlocks at Tier ${def.tier}`;
  if (siteAt(world, x, y)) return 'Tile already occupied';
  if (civicAt(world, x, y)) return 'Reserved for a town district';
  const plot = plotAt(world, x, y);
  if (plot) {
    // Inside a town: any building that does not need a resource node, on the plots beside the streets.
    if (def.node) return `${def.label} must be built on a ${def.node} node`;
    if (def.airport) return 'Airports need open ground outside a town';
    if (def.port) return 'A Port goes on the coast, outside the town streets';
    if (def.railyard) return 'A Rail Yard goes at the edge of town, outside its streets';
    if (plot.index < 2) return `Reserved for ${plot.place.name}'s ${plot.index === 0 ? 'Market' : 'Supply Yard'}`;
    if (isHomePlot(plot.place, plot.index)) return 'Homes line this stretch of street: not for sale';
    if (t === 'water' || t === 'mountain' || t === 'ice') return `Cannot build on ${t}`;
  } else {
    if (def.inTown) return `${def.label} goes in a town: pick a free plot beside a town street`;
    const town = placeAt(world, x, y);
    if (town) return town && streetAt(world, x, y) ? `That is ${town.name}'s main street` : `Too close to ${town.name}`;
    if (!def.node) {
      // Towns grow in set stages: the ground their later streets and homes will take is kept clear.
      const later = plannedTownAt(world, x, y);
      if (later) return `Kept clear for ${later.name}: its streets grow out to here`;
    }
    if (!def.airport) {
      const pad = padAt(world, x, y);
      if (pad) return `Kept clear for ${pad.name}'s airport`;
    }
    if (def.node) {
      const node = nodeAt(world, x, y);
      if (!node || node.kind !== def.node) return `${def.label} must be built on a ${def.node} node`;
      if (world.sites.some((s) => s.nodeId === node.id)) return 'Node already in use';
    } else if (def.airport) {
      // An airport checks all nine of its tiles below; it clears forest and levels the ground itself.
    } else if (t !== 'grass' && !(def.port && t === 'forest')) {
      return t === 'forest' ? 'Forests are reserved for forestry nodes' : `Cannot build on ${t}`;
    } else if (!def.port && slopeAt(world, x, y) > BUILD_SLOPE) {
      return 'Too steep to build on';
    }
    if (world.landRules) {
      // Outside a town the ground has to be bought: an airport needs all nine of its tiles, anything else the one it stands on.
      const tiles = def.airport ? Array.from({ length: 9 }, (_, i) => ({ x: x + (i % 3) - 1, y: y + Math.floor(i / 3) - 1 })) : [{ x, y }];
      const e = landError(world, tiles);
      if (e) return e;
    }
    if (def.airport) {
      const e = airfieldError(world, x, y, rot);
      if (e) return e;
    }
    if (def.railyard) {
      const e = railyardError(world, x, y);
      if (e) return e;
    }
    if (def.port) {
      const e = portError(world, x, y);
      if (e) return e;
    }
  }
  const cost = buildCost(world, kind, x, y);
  if (world.money < cost) return `Need $${cost}`;
  return null;
}

/** Clearing a forest tile for an airport's field costs this much on top of the airport. */
export const FOREST_CLEAR_COST = 150;
/** An airport's ground is levelled when it is built, so its nine tiles may rise and fall by up to this much. */
export const AIRFIELD_SPREAD = BUILD_SLOPE * 2.5;

/** What a building costs to put down here: an airport pays extra for each forest tile it clears. */
export function buildCost(world: World, kind: SiteKind, x: number, y: number): number {
  const def = SITE_DEFS[kind];
  if (!def.airport) return def.cost;
  let trees = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (terrainAt(world, wrapX(world, x + dx), y + dy) === 'forest') trees += 1;
  return def.cost + trees * FOREST_CLEAR_COST;
}

/**
 * An airport covers 3x3 tiles round (x, y): every one dry, unbuilt and clear of any town (as it will be fully grown, with a
 * tile to spare), with the runway at the back and the terminal at the front, where a road can come in. Forest is cleared
 * and the ground levelled, so it only has to be fairly even. With `rot` the front must be that side; without it, any side.
 */
function airfieldError(world: World, x: number, y: number, rot?: Rot): string | null {
  // The fully grown town covers every lot and street it will ever have, so this also keeps airports out of towns.
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const p = plannedTownAt(world, x + dx, y + dy);
      if (p) return Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && placeAt(world, x + dx, y + dy) ? 'Airports need open ground outside a town' : `Too close to ${p.name} for an airport: its streets grow out to here`;
    }
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = wrapX(world, x + dx);
      const ty = y + dy;
      const t = terrainAt(world, tx, ty);
      if (t !== 'grass' && t !== 'forest') return 'An airport needs 3x3 tiles of open, dry land';
      if (siteAt(world, tx, ty) || nodeAt(world, tx, ty)) return 'An airport needs 3x3 tiles clear of other buildings and resources';
      if (routeAt(world, tx, ty)) return 'A road or track crosses where the runway would go';
      const e = elevAt(world, tx, ty);
      lo = Math.min(lo, e);
      hi = Math.max(hi, e);
    }
  }
  if (hi - lo > AIRFIELD_SPREAD) return 'Too steep for a runway: an airport needs 3x3 tiles of fairly even ground';
  return airportRot(world, x, y, rot) === null ? (rot === undefined ? 'An airport needs a side open for its road' : 'No room for a road at the front: turn it (R) to face open ground') : null;
}

const padCache = new WeakMap<Place, string>();

/**
 * The ground kept for a town's airport: the nearest spot an airport can go, found once and kept (and only moved if a road
 * is laid across it). Null once the town has an airport of its own, or when there is nowhere near it for one.
 */
export function airportPad(world: World, place: Place): { x: number; y: number; rot: Rot } | null {
  const key = `${world.routes.length}:${world.sites.length}:${place.level}`;
  if (padCache.get(place) === key) return place.airportPad ?? null;
  padCache.set(place, key);
  if (world.sites.some((s) => SITE_DEFS[s.kind].airport && nearestPlace(world, siteCenter(world, s))?.id === place.id)) {
    place.airportPad = null;
    return null;
  }
  const pad = place.airportPad;
  if (pad && SITE_DEFS[siteAt(world, pad.x, pad.y)?.kind ?? 'hub'].airport) {
    place.airportPad = null;
    return null;
  }
  if (pad && airfieldError(world, pad.x, pad.y, pad.rot) === null) return pad;
  place.airportPad = findPad(world, place, true) ?? findPad(world, place, false);
  return place.airportPad;
}

/** The closest spot to a town (by rings outward) where an airport fits: on its own side of its neighbours when `own`. */
function findPad(world: World, place: Place, own: boolean): { x: number; y: number; rot: Rot } | null {
  // Clear of the ground already kept for other towns' airports.
  const taken = (x: number, y: number): boolean =>
    world.places.some((p) => p !== place && p.airportPad && Math.abs(wrapDx(world, p.airportPad.x, x)) <= 3 && Math.abs(p.airportPad.y - y) <= 3);
  const from = streetReach(radiusOf(place), 5) + 3;
  for (let r = from; r <= from + 14; r++) {
    const ring: { x: number; y: number; d: number }[] = [];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        ring.push({ x: wrapX(world, place.x + dx), y: place.y + dy, d: Math.hypot(dx, dy) });
      }
    }
    ring.sort((a, b) => a.d - b.d);
    for (const c of ring) {
      const t = terrainAt(world, c.x, c.y);
      if (t !== 'grass' && t !== 'forest') continue;
      if (airfieldError(world, c.x, c.y) !== null) continue;
      if (taken(c.x, c.y) || (own && nearestPlace(world, c)?.id !== place.id)) continue;
      const rot = airportRot(world, c.x, c.y);
      if (rot !== null) return { x: c.x, y: c.y, rot };
    }
  }
  return null;
}

const padTiles = new WeakMap<World, { key: string; at: Map<number, Place> }>();

/** The town whose kept airport ground (its 3x3 field and the tile its road comes in on) covers this tile. */
export function padAt(world: World, x: number, y: number): Place | undefined {
  let levels = 0;
  world.places.forEach((p, i) => (levels += p.level * (i + 1)));
  const key = `${world.routes.length}:${world.sites.length}:${world.places.length}:${levels}`;
  let hit = padTiles.get(world);
  if (!hit || hit.key !== key) {
    const at = new Map<number, Place>();
    for (const p of world.places) {
      const pad = airportPad(world, p);
      if (!pad) continue;
      const mark = (tx: number, ty: number): void => {
        if (ty >= 0 && ty < world.height) at.set(ty * world.width + wrapX(world, tx), p);
      };
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mark(pad.x + dx, pad.y + dy);
      mark(pad.x + FRONT[pad.rot].x * 2, pad.y + FRONT[pad.rot].y * 2);
    }
    hit = { key, at };
    padTiles.set(world, hit);
  }
  return hit.at.get(y * world.width + wrapX(world, x));
}

/**
 * Which way an airport at (x, y) can face: `want` if a road can reach that side, otherwise (when `want` is unset) the open
 * side closest to a town. Null when no side will do.
 */
export function airportRot(world: World, x: number, y: number, want?: Rot): Rot | null {
  const ok = (r: Rot): boolean => {
    const ax = wrapX(world, x + FRONT[r].x * 2);
    const ay = y + FRONT[r].y * 2;
    const t = terrainAt(world, ax, ay);
    if (t === null || t === 'water' || t === 'ice') return false;
    if (routeAt(world, ax, ay, 'road') || streetAt(world, ax, ay)) return true;
    return t !== 'mountain' && !siteAt(world, ax, ay) && !nodeAt(world, ax, ay) && slopeAt(world, ax, ay) <= BUILD_SLOPE;
  };
  if (want !== undefined) return ok(want) ? want : null;
  const town = nearestPlace(world, { x, y });
  const order = ([0, 1, 2, 3] as Rot[]).sort((a, b) => {
    if (!town) return a - b;
    const score = (r: Rot): number => -(FRONT[r].x * wrapDx(world, x, town.x) + FRONT[r].y * (town.y - y));
    return score(a) - score(b);
  });
  return order.find(ok) ?? null;
}

/** Nearly all the ground around a tile is flat, dry and unbuilt (at least `minFlat` of its 8 neighbours), with a free side for a road. */
function openGround(world: World, x: number, y: number, minFlat: number): boolean {
  const land = (tx: number, ty: number): boolean => {
    const t = terrainAt(world, tx, ty);
    return (t === 'grass' || t === 'forest') && !siteAt(world, tx, ty) && !placeAt(world, tx, ty) && !routeAt(world, tx, ty);
  };
  let flat = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && land(wrapX(world, x + dx), y + dy)) flat += 1;
  const door = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => land(wrapX(world, x + dx), y + dy) && slopeAt(world, wrapX(world, x + dx), y + dy) <= BUILD_SLOPE);
  return flat >= minFlat && door;
}

/** A Rail Yard stands just outside a town (within a few tiles of its last street) on open ground with room for a road and track. */
function railyardError(world: World, x: number, y: number): string | null {
  let near = false;
  // Measured from the town as it will be fully grown, since its later streets are kept clear.
  for (let dy = -5; dy <= 5 && !near; dy++) for (let dx = -5; dx <= 5; dx++) if (plannedTownAt(world, wrapX(world, x + dx), y + dy)) near = true;
  if (!near) return 'A Rail Yard goes at the edge of a town: within a few tiles of its last street';
  return openGround(world, x, y, 6) ? null : 'A Rail Yard needs flat, open ground with room beside it for a road and track';
}

/** Where a town's Rail Yard could go: the closest open ground just outside its edge, or null. Used by the bot and the demo. */
export function yardSpot(world: World, place: Place): Tile | null {
  const best: { x: number; y: number; d: number }[] = [];
  const R = streetReach(radiusOf(place), 5) + 8;
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const x = wrapX(world, place.x + dx);
      const y = place.y + dy;
      const err = placeError(world, 'railyard', x, y);
      if (err === null || err.startsWith('Need $')) best.push({ x, y, d: Math.hypot(dx, dy) });
    }
  }
  best.sort((a, b) => a.d - b.d);
  return best[0] ? { x: best[0].x, y: best[0].y } : null;
}

// ---- ports and sea routes ----

const ORTHO: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const SEA_STEPS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Whether a water tile belongs to a body of water of at least this many tiles: a river, lake or sea, not a pond. */
function waterBody(world: World, x: number, y: number, size: number): boolean {
  const seen = new Set<number>([y * world.width + x]);
  const queue: Tile[] = [{ x, y }];
  for (let q = 0; q < queue.length && queue.length < size; q++) {
    const c = queue[q];
    for (const [dx, dy] of ORTHO) {
      const nx = wrapX(world, c.x + dx);
      const ny = c.y + dy;
      const k = ny * world.width + nx;
      if (seen.has(k) || terrainAt(world, nx, ny) !== 'water') continue;
      seen.add(k);
      queue.push({ x: nx, y: ny });
    }
  }
  return queue.length >= size;
}

const PORT_WATER = 40;

const clearances = new WeakMap<object, Uint8Array>();

/** How wide the water is around a tile: 0 beside land, 1 with a tile of water all round, 2 with two. A ship needs at least its draft. */
function clearance(world: World, x: number, y: number): number {
  let grid = clearances.get(world.terrain);
  if (!grid) {
    grid = new Uint8Array(world.width * world.height).fill(255);
    clearances.set(world.terrain, grid);
  }
  const k = y * world.width + x;
  if (grid[k] !== 255) return grid[k];
  let c = 0;
  for (let r = 1; r <= 2; r++) {
    let all = true;
    for (let dy = -r; dy <= r && all; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (terrainAt(world, wrapX(world, x + dx), y + dy) !== 'water') {
          all = false;
          break;
        }
      }
    }
    if (!all) break;
    c = r;
  }
  grid[k] = c;
  return c;
}

/** The water tile a port's ships use: the widest water right beside it (sea, lake or river), or null when the port is not at the water's edge. */
export function portWater(world: World, x: number, y: number): Tile | null {
  let best: Tile | null = null;
  let bc = -1;
  for (const [dx, dy] of ORTHO) {
    const nx = wrapX(world, x + dx);
    const ny = y + dy;
    if (terrainAt(world, nx, ny) !== 'water' || !waterBody(world, nx, ny, PORT_WATER)) continue;
    const c = clearance(world, nx, ny);
    if (c > bc) {
      bc = c;
      best = { x: nx, y: ny };
    }
  }
  return best;
}

/** A Port stands on flat dry ground at the water's edge, away from any town street. */
function portError(world: World, x: number, y: number): string | null {
  if (!portWater(world, x, y)) return 'A Port goes at the water\'s edge: sea, lake or river';
  // The quay is level: only the land beside it counts, not the drop into the water.
  const e = elevAt(world, x, y);
  for (const [dx, dy] of ORTHO) {
    const t = terrainAt(world, wrapX(world, x + dx), y + dy);
    if (t && t !== 'water' && t !== 'ice' && Math.abs(elevAt(world, wrapX(world, x + dx), y + dy) - e) > BUILD_SLOPE) return 'Too steep to build on';
  }
  return null;
}

/** Where a town's Port could go: the nearest coastal tile that takes one. Used by the demo and the bot. */
export function portSpot(world: World, near: Tile, reach = 30): Tile | null {
  let best: { x: number; y: number; d: number } | null = null;
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const x = wrapX(world, near.x + dx);
      const y = near.y + dy;
      const d = Math.hypot(dx, dy);
      if (best && d >= best.d) continue;
      const err = placeError(world, 'port', x, y);
      if (err === null || err.startsWith('Need $')) best = { x, y, d };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

/** The tiles a ship sails: out of one port, across open water the short way, and in to the other. Null when the seas do not join. */
export function seaPath(world: World, a: Tile, b: Tile, draft = 0): Tile[] | null {
  const start = portWater(world, a.x, a.y);
  const goal = portWater(world, b.x, b.y);
  if (!start || !goal) return null;
  const key = (x: number, y: number): number => y * world.width + x;
  const from = new Map<number, number>([[key(start.x, start.y), -1]]);
  const queue: number[] = [key(start.x, start.y)];
  const target = key(goal.x, goal.y);
  for (let q = 0; q < queue.length; q++) {
    const k = queue[q];
    if (k === target) break;
    const cx = k % world.width;
    const cy = (k - cx) / world.width;
    for (const [dx, dy] of SEA_STEPS) {
      const nx = wrapX(world, cx + dx);
      const ny = cy + dy;
      if (terrainAt(world, nx, ny) !== 'water') continue;
      // A deep-draft ship keeps to wide water, except in the harbours at either end.
      if (draft > 0 && clearance(world, nx, ny) < draft && Math.max(Math.abs(nx - start.x), Math.abs(ny - start.y)) > 3 && Math.max(Math.abs(nx - goal.x), Math.abs(ny - goal.y)) > 3) continue;
      // Cutting a corner of land is not allowed: both tiles beside a diagonal step must be water.
      if (dx && dy && (terrainAt(world, wrapX(world, cx + dx), cy) !== 'water' || terrainAt(world, cx, ny) !== 'water')) continue;
      const nk = key(nx, ny);
      if (from.has(nk)) continue;
      from.set(nk, k);
      queue.push(nk);
    }
  }
  if (!from.has(target)) return null;
  const water: Tile[] = [];
  for (let k = target; k !== -1; k = from.get(k)!) water.push({ x: k % world.width, y: Math.floor(k / world.width) });
  water.reverse();
  return [{ x: a.x, y: a.y }, ...water, { x: b.x, y: b.y }];
}

/** The path for the biggest ships that can sail between two ports, and which class that is. Null when no water joins them at all. */
export function bestSeaPath(world: World, a: Tile, b: Tile): { path: Tile[]; draft: number } | null {
  for (const draft of [2, 1, 0]) {
    const path = seaPath(world, a, b, draft);
    if (path) return { path, draft };
  }
  return null;
}

/** A canal costs this a tile to dig across land, and is no more than this many land tiles long. */
export const CANAL_LAND_COST = 60;
export const CANAL_MAX_LAND = 40;

/**
 * The cheapest way to join two ports by digging: water is free to sail, land is dug at a price. Keeps off towns, buildings,
 * mountains and ice. Returns the tiles and how many of them are dug, or null when the dig would be too long.
 */
export function canalPath(world: World, a: Tile, b: Tile): { path: Tile[]; dug: number } | null {
  const start = portWater(world, a.x, a.y);
  const goal = portWater(world, b.x, b.y);
  if (!start || !goal) return null;
  const W = world.width;
  const blocked = new Set<number>();
  for (const p of world.places) for (const t of townTiles(world, p)) blocked.add(t.y * W + wrapX(world, t.x));
  for (const site of world.sites) for (const t of siteTiles(world, site)) blocked.add(t.y * W + wrapX(world, t.x));
  const key = (x: number, y: number): number => y * W + x;
  const dist = new Map<number, number>([[key(start.x, start.y), 0]]);
  const from = new Map<number, number>([[key(start.x, start.y), -1]]);
  const heap: [number, number][] = [[0, key(start.x, start.y)]];
  const push = (item: [number, number]): void => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const target = key(goal.x, goal.y);
  const reach = Math.hypot(wrapDx(world, a.x, b.x), a.y - b.y) * 2 + 20;
  while (heap.length > 0) {
    const [d, k] = pop();
    if (d > (dist.get(k) ?? Infinity)) continue;
    if (k === target) break;
    const cx = k % W;
    const cy = (k - cx) / W;
    for (const [dx, dy] of ORTHO) {
      const nx = wrapX(world, cx + dx);
      const ny = cy + dy;
      const t = terrainAt(world, nx, ny);
      if (t === null || t === 'ice' || t === 'mountain') continue;
      const nk = key(nx, ny);
      if (t !== 'water' && blocked.has(nk)) continue;
      if (Math.abs(wrapDx(world, nx, a.x)) > reach || Math.abs(ny - a.y) > reach) continue;
      const nd = d + (t === 'water' ? 1 : CANAL_LAND_COST);
      if (nd >= (dist.get(nk) ?? Infinity)) continue;
      dist.set(nk, nd);
      from.set(nk, k);
      push([nd, nk]);
    }
  }
  if (!from.has(target)) return null;
  const tiles: Tile[] = [];
  for (let k = target; k !== -1; k = from.get(k)!) tiles.push({ x: k % W, y: Math.floor(k / W) });
  tiles.reverse();
  const dug = tiles.filter((t) => terrainAt(world, t.x, t.y) !== 'water').length;
  if (dug > CANAL_MAX_LAND) return null;
  return { path: [{ x: a.x, y: a.y }, ...tiles, { x: b.x, y: b.y }], dug };
}

/** What a sea route between two ports would be: sailed where water joins them, otherwise dug as a canal. */
export function seaPlan(world: World, a: Tile, b: Tile): { path: Tile[]; draft: number; canal: boolean; cost: number } | null {
  const found = bestSeaPath(world, a, b);
  if (found) return { ...found, canal: false, cost: found.path.length * SEA_COST_PER_TILE };
  const dig = canalPath(world, a, b);
  if (!dig) return null;
  return { path: dig.path, draft: 1, canal: true, cost: dig.path.length * SEA_COST_PER_TILE + dig.dug * CANAL_LAND_COST };
}

/** Why two ports cannot be linked, or null. */
export function seaError(world: World, aId: number, bId: number): string | null {
  const a = siteById(world, aId);
  const b = siteById(world, bId);
  if (world.tier < SEA_TIER) return `Sea routes unlock at Tier ${SEA_TIER}`;
  if (!a || !b || !SITE_DEFS[a.kind].port || !SITE_DEFS[b.kind].port) return 'Sea routes join two ports';
  if (a.id === b.id) return 'Pick a different port to sail to';
  if (world.routes.some((r) => r.mode === 'sea' && ((r.fromSiteId === a.id && r.toSiteId === b.id) || (r.fromSiteId === b.id && r.toSiteId === a.id)))) return 'Those ports are already linked';
  const found = seaPlan(world, a, b);
  if (!found) return 'No water joins those two ports, and the ground between is too far or too rough to dig a canal';
  const cost = found.cost;
  return world.money < cost ? `Need $${cost}` : null;
}

/** Sail a route between two ports. Ships are bought at the ports. */
export function createSeaRoute(world: World, aId: number, bId: number): string | null {
  const err = seaError(world, aId, bId);
  if (err) return err;
  const a = siteById(world, aId)!;
  const b = siteById(world, bId)!;
  const { path, draft, canal, cost } = seaPlan(world, a, b)!;
  world.money -= cost;
  world.routes.push({ id: world.nextId++, mode: 'sea', fromSiteId: a.id, toSiteId: b.id, path, draft, ...(canal ? { canal: true } : {}) });
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

export function placeSite(world: World, kind: SiteKind, x: number, y: number, rot?: Rot): string | null {
  const err = placeError(world, kind, x, y, rot);
  if (err) return err;
  const def = SITE_DEFS[kind];
  const cost = buildCost(world, kind, x, y);
  // An airport is placed by its middle, and stored by its gate at the middle of its front edge.
  const turn = def.airport ? airportRot(world, wrapX(world, x), y, rot)! : rot;
  if (def.airport) {
    x += FRONT[turn!].x;
    y += FRONT[turn!].y;
  }
  const wx = wrapX(world, x);
  const node = def.node ? nodeAt(world, wx, y) : undefined;
  world.money -= cost;
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
    making: def.recipe ? false : undefined,
    sendTo: [],
    ...(turn !== undefined ? { rot: turn } : {}),
  });
  for (const d of world.sites) if (SITE_DEFS[d.kind].store) refreshFed(world, d);
  const home = plotAt(world, wx, y);
  if (home) linkTown(world, home.place);
  // A building put down on a road, or a town street, that already reaches others is joined to them.
  linkNetwork(world, 'road');
  linkNetwork(world, 'rail');
  connectSites(world, [world.sites[world.sites.length - 1].id]);
  return null;
}

export function upgradeCost(site: Site): number {
  return Math.round(SITE_DEFS[site.kind].cost * UPGRADE_COST_FACTOR * Math.pow(site.level, UPGRADE_COST_POWER));
}

/** The closest town to a building, within reach of its customers (about 60 tiles), or null. */
export function nearestPlace(world: World, at: Tile): Place | null {
  let best: Place | null = null;
  let bd = 60;
  for (const p of world.places) {
    const d = Math.hypot(wrapDx(world, at.x, p.x), at.y - p.y);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

export function upgradeError(world: World, siteId: number): string | null {
  const site = siteById(world, siteId);
  if (!site) return 'Nothing selected';
  const def = SITE_DEFS[site.kind];
  if (def.dock) return 'Towns grow through deliveries';
  if (def.station) return 'Stations belong to the town';
  if (site.level >= maxLevelOf(def)) return 'Already at max level';
  const needTier = Math.min(site.level, 4); // level 2 needs tier 1, and so on up to tier 4 for level 5 and beyond
  if (world.tier < needTier) return `Level ${site.level + 1} needs Tier ${needTier}`;
  const needEarn = LEVEL_EARN[site.level + 1];
  if (needEarn && world.earned < needEarn) return `Level ${site.level + 1} needs $${needEarn.toLocaleString('en-US')} earned in total`;
  if (def.airport) {
    // An airport grows with the town it serves: a Town (level 3) for a regional field, a City (level 4) for an international one.
    const town = nearestPlace(world, site);
    const need = site.level + 2;
    if (!town || town.level < need) return `A bigger airport needs a bigger town: ${town ? town.name : 'a town nearby'} must reach level ${need}`;
  }
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

/** A building where trains can call: a Rail Yard. */
export function isRailHub(site: Site): boolean {
  return !!SITE_DEFS[site.kind].railyard;
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
  for (const v of world.vehicles) if (v.homeId === siteId) world.money += VEHICLE_DEFS[v.kind].cost * 0.5;
  world.vehicles = world.vehicles.filter((v) => v.homeId !== siteId);
  for (const v of world.vehicles) if (dead.has(v.routeId)) parkVehicle(v);
  for (const s of world.sites) {
    if (s.sendTo) s.sendTo = s.sendTo.filter((id) => id !== siteId);
    if (s.byTo) s.byTo = s.byTo.filter((id) => id !== siteId);
  }
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
  /** No vehicle comes with it: its ends are not two buildings that trade. */
  free: boolean;
}

/** Check a drawn path and price it. Does not change the world. */
export function planRoute(world: World, rawPath: Tile[], mode: RouteMode = 'road', grade: RoadGrade = 'street'): RoutePlan {
  const path = rawPath.map((p) => ({ x: wrapX(world, p.x), y: p.y }));
  const plan: RoutePlan = { mode, grade, error: null, path, cost: 0, bridgeTiles: 0, tunnelTiles: 0, crossings: 0, free: true };
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
  if (from && to && from.id === to.id) return fail('A road cannot start and end at the same building');
  for (const [end, site] of [[first, from], [last, to]] as [Tile, Site | undefined][]) {
    if (site) continue;
    const e = roadEndError(world, end.x, end.y, mode);
    if (e) return fail(e);
  }
  if (mode === 'road' && ((from && SITE_DEFS[from.kind].station) || (to && SITE_DEFS[to.kind].station))) return fail('Only trains call at a Rail Station');
  // Trains reach a town only through a Rail Yard at its edge (or an old Rail Station).
  if (mode === 'rail') {
    for (const site of [from, to]) {
      if (!site || SITE_DEFS[site.kind].station) continue;
      if (placeAt(world, site.x, site.y) && !isRailHub(site)) return fail('Trains reach a town through its Rail Yard, built at the edge of town');
    }
  }

  // A building on a town plot is entered from its street, like a driveway.
  if (mode === 'road') {
    for (const [end, next, site] of [[first, path[1], from], [last, path[path.length - 2], to]] as [Tile, Tile, Site | undefined][]) {
      if (!site) continue;
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
    // Where a building stands at the end, the road simply arrives at its door.
    if ((i === 0 && from) || (i === path.length - 1 && to)) continue;
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
      if (!own.has(k)) plan.cost += CROSSING_COST;
    }
    if (hwTiles ? !hwTiles.has(k) : !own.has(k)) plan.cost += ROAD_COST[t] * factor;
  }
  // Two buildings that trade get a vehicle with the road. Anything else is just road.
  plan.free = !(from && to && canHaul(world, from, to));
  return plan;
}

/** The route a vehicle is on, or the old line it is driving home along. */
export function vehicleRoute(world: World, v: Vehicle): Route | undefined {
  if (v.back) return v.back;
  return v.routeId === 0 ? undefined : world.routes.find((r) => r.id === v.routeId);
}

/** A route went from under a vehicle: if it is out on the road it turns round and drives home, otherwise it just waits. */
function strand(route: Route, v: Vehicle): void {
  const last = route.path.length - 1;
  if (route.mode === 'air' || route.mode === 'sea' || v.state !== 'moving' || v.idx <= 0 || v.idx >= last) {
    parkVehicle(v);
    return;
  }
  v.back = { ...route, path: route.path.slice() };
  v.routeId = 0;
  v.dir = route.fromSiteId === v.homeId ? -1 : 1;
  v.moveTimer = 0;
}

/** One tick of a vehicle driving home along a road that has gone. */
function stepRetreat(world: World, v: Vehicle): void {
  const route = v.back!;
  const home = siteById(world, v.homeId);
  if (!home) {
    parkVehicle(v);
    return;
  }
  v.moveTimer += 1;
  if (v.moveTimer < routeTicks(route, vehicleTicks(v))) return;
  v.moveTimer = 0;
  v.idx += v.dir;
  v.wear = Math.min(1, (v.wear ?? 0) + wearMult(world) / WEAR_TILES);
  const last = route.path.length - 1;
  if ((v.dir === -1 && v.idx <= 0) || (v.dir === 1 && v.idx >= last)) {
    // Home: the load goes back in the store, and the vehicle waits for a road like any other.
    if (v.good && v.cargo > 0 && !SITE_DEFS[home.kind].station) addStock(home, v.good, v.cargo);
    parkVehicle(v);
  }
}

function parkVehicle(v: Vehicle): void {
  v.back = undefined;
  v.routeId = 0;
  v.idx = 0;
  v.dir = 1;
  v.state = 'loading';
  v.moveTimer = 0;
  v.cargo = 0;
  v.good = null;
}

function newVehicle(world: World, homeId: number, kind: VehicleKind): Vehicle {
  const v: Vehicle = {
    id: world.nextId++,
    homeId,
    routeId: 0,
    destId: 0,
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

/** Split a run of new road into stretches of SEGMENT_TILES, each sharing its end tile with the next. */
function splitStretches(path: Tile[]): Tile[][] {
  if (path.length <= SEGMENT_TILES + 1) return [path];
  const out: Tile[][] = [];
  for (let i = 0; i < path.length - 1; i += SEGMENT_TILES) out.push(path.slice(i, Math.min(path.length, i + SEGMENT_TILES + 1)));
  // A last scrap joins the stretch before it.
  if (out.length > 1 && out[out.length - 1].length < 3) {
    const last = out.pop()!;
    const prev = out.pop()!;
    out.push([...prev, ...last.slice(1)]);
  }
  return out;
}

/**
 * Build a route along `path`. The new ground is laid as separate stretches (so taking one out leaves the rest standing),
 * and when two buildings are joined a lane runs along them for the vehicles. Vehicles are bought separately.
 */
export function createRoute(world: World, rawPath: Tile[], mode: RouteMode = 'road', grade: RoadGrade = 'street'): string | null {
  const plan = planRoute(world, rawPath, mode, grade);
  if (plan.error) return plan.error;
  if (world.money < plan.cost) return `Need $${Math.ceil(plan.cost)}`;
  world.money -= plan.cost;
  const g = mode === 'road' ? grade : undefined;
  // Only ground that is not already laid becomes new stretches, with one tile of the old to join them to.
  const key = (t: Tile): number => t.y * world.width + wrapX(world, t.x);
  const have = new Set<number>();
  // A highway laid over an existing road is an upgrade: only ground that is already highway counts as laid.
  const upgrade = mode === 'road' && grade === 'highway';
  for (const r of world.routes) if (r.mode === mode && !r.over && (!upgrade || r.grade === 'highway')) for (const t of r.path) have.add(key(t));
  const path = plan.path;
  for (let i = 0; i < path.length; i++) {
    if (have.has(key(path[i]))) continue;
    let j = i;
    while (j + 1 < path.length && !have.has(key(path[j + 1]))) j++;
    const run = path.slice(Math.max(0, i - 1), Math.min(path.length, j + 2));
    for (const part of splitStretches(run)) world.routes.push({ id: world.nextId++, mode, grade: g, fromSiteId: 0, toSiteId: 0, free: true, seg: true, path: part });
    i = j;
  }
  if (plan.free) {
    linkNetwork(world, mode);
    return null;
  }
  const from = siteAt(world, path[0].x, path[0].y)!;
  const to = siteAt(world, path[path.length - 1].x, path[path.length - 1].y)!;
  world.routes.push({ id: world.nextId++, mode, grade: g, fromSiteId: from.id, toSiteId: to.id, over: true, path });
  linkNetwork(world, mode);
  return null;
}

/**
 * Buildings are joined by road or track being connected, not only by a line drawn between them: a road that runs onto
 * another road, a highway, or a town street joins everything on that network. Give every pair of buildings on one
 * network that could trade a lane to run along, so "joined" means what it looks like. Safe to call again.
 */
export function linkNetwork(world: World, mode: RouteMode): void {
  if (mode === 'air' || mode === 'sea') return;
  const key = (x: number, y: number): number => y * world.width + wrapX(world, x);
  const ground = new Set<number>();
  for (const r of world.routes) if (r.mode === mode && !r.over) for (const t of r.path) ground.add(key(t.x, t.y));
  const open = (x: number, y: number): boolean => ground.has(key(x, y)) || (mode === 'road' && streetAt(world, wrapX(world, x), y) !== undefined);
  const bySpot = new Map<number, Site>();
  for (const st of world.sites) bySpot.set(key(st.x, st.y), st);
  // A building is on the network when road arrives at its door: its own tile is laid, or it is a lot on a town street.
  const onNet = (st: Site): boolean => ground.has(key(st.x, st.y)) || (mode === 'road' && entryTile(world, st.x, st.y) !== null);
  const members = world.sites.filter(onNet);
  if (members.length < 2) return;
  // A lot in a town is entered from its own door, whichever other street it touches.
  const door = new Map<number, number>();
  if (mode === 'road') {
    for (const st of members) {
      const e = entryTile(world, st.x, st.y);
      if (e) door.set(key(st.x, st.y), key(e.x, e.y));
    }
  }
  const hw = highwayTiles(world);
  // Lanes that now run wholly on highway, after a road was upgraded, drive at highway speed.
  if (mode === 'road') for (const r of world.routes) if (r.over && r.mode === 'road' && r.grade !== 'highway' && r.path.every((t) => hw.has(key(t.x, t.y)))) r.grade = 'highway';
  const joined = (a: Site, b: Site): boolean =>
    world.routes.some((r) => !r.free && r.mode === mode && ((r.fromSiteId === a.id && r.toSiteId === b.id) || (r.fromSiteId === b.id && r.toSiteId === a.id)));
  const MAX_DEPTH = 260;
  for (const a of members) {
    const want = new Map<number, Site>();
    for (const b of members) if (b.id > a.id && canHaul(world, a, b) && !joined(a, b)) want.set(key(b.x, b.y), b);
    if (want.size === 0) continue;
    // Breadth-first over the laid ground from this building.
    const from = key(a.x, a.y);
    const prev = new Map<number, number>([[from, -1]]);
    let frontier = [from];
    let found = 0;
    for (let depth = 0; depth < MAX_DEPTH && frontier.length > 0 && found < want.size; depth++) {
      const nextFrontier: number[] = [];
      for (const k of frontier) {
        const x = k % world.width;
        const y = Math.floor(k / world.width);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy;
          if (ny < 0 || ny >= world.height) continue;
          const nx = wrapX(world, x + dx);
          const nk = ny * world.width + nx;
          if (prev.has(nk)) continue;
          if (k === from && door.has(from) && nk !== door.get(from)) continue;
          // A building whose own tile is on the laid road (a yard the road runs into and out of) does not end the line:
          // the network carries on through it, so everything joined by road is joined, however many stops in between.
          const through = bySpot.has(nk) && ground.has(nk) && !door.has(nk);
          if (want.has(nk)) {
            if (door.has(nk) && door.get(nk) !== k) continue;
            prev.set(nk, k);
            found += 1;
            if (through) nextFrontier.push(nk);
          } else if (through) {
            prev.set(nk, k);
            nextFrontier.push(nk);
          } else if (!bySpot.has(nk) && open(nx, ny)) {
            prev.set(nk, k);
            nextFrontier.push(nk);
          }
        }
      }
      frontier = nextFrontier;
    }
    for (const [bk, b] of want) {
      if (!prev.has(bk)) continue;
      const tiles: Tile[] = [];
      for (let k = bk; k !== -1; k = prev.get(k)!) tiles.push({ x: k % world.width, y: Math.floor(k / world.width) });
      tiles.reverse();
      // Run the lane from the supplier to its customer, like the links inside a town.
      const [src, dst] = supplies(world, a, b) || !supplies(world, b, a) ? [a, b] : [b, a];
      const path = src === a ? tiles : tiles.reverse();
      const grade: RoadGrade = path.every((t) => hw.has(key(t.x, t.y))) ? 'highway' : 'street';
      world.routes.push({ id: world.nextId++, mode, grade: mode === 'road' ? grade : undefined, fromSiteId: src.id, toSiteId: dst.id, over: true, path });
    }
  }
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
  const cost = airPath(world, siteCenter(world, a), siteCenter(world, b)).length * AIR_COST_PER_TILE;
  return world.money < cost ? `Need $${cost}` : null;
}

/** Fly a route between two airports. Planes are bought at the airports. */
export function createAirRoute(world: World, aId: number, bId: number): string | null {
  const err = airError(world, aId, bId);
  if (err) return err;
  const a = siteById(world, aId)!;
  const b = siteById(world, bId)!;
  const path = airPath(world, siteCenter(world, a), siteCenter(world, b));
  world.money -= path.length * AIR_COST_PER_TILE;
  const route: Route = { id: world.nextId++, mode: 'air', fromSiteId: a.id, toSiteId: b.id, path };
  world.routes.push(route);
  return null;
}

/** Whether a building has a track to run trains on. */
function hasRail(world: World, siteId: number): boolean {
  return world.routes.some((r) => r.mode === 'rail' && !r.free && (r.fromSiteId === siteId || r.toSiteId === siteId));
}

/** The vehicle classes a building can buy to start with: bigger ones come from upgrading. */
export function buyOptions(world: World, siteId: number): VehicleKind[] {
  const site = siteById(world, siteId);
  if (!site) return [];
  const def = SITE_DEFS[site.kind];
  if (def.dock) return [];
  if (def.airport) return ['plane'];
  const out: VehicleKind[] = [];
  if (!def.station) out.push('boxtruck');
  if (def.port) out.push('barge', 'boat');
  if (def.station || hasRail(world, siteId)) out.push('train');
  return out;
}

/** Why a building cannot take a vehicle of this class, or null. */
export function buyError(world: World, siteId: number, kind: VehicleKind): string | null {
  const def = VEHICLE_DEFS[kind];
  if (!siteById(world, siteId)) return 'Select a building first';
  if (!buyOptions(world, siteId).includes(kind)) return 'This building cannot run that vehicle';
  if (def.tier > world.tier) return `${def.label} unlocks at Tier ${def.tier}`;
  const owner0 = siteById(world, siteId)!;
  if (owner0.level < def.needLevel) return `${def.label} needs this building at level ${def.needLevel}`;
  const shipLanes = world.routes.filter((r) => r.mode === 'sea' && (r.fromSiteId === siteId || r.toSiteId === siteId));
  if (def.mode === 'sea' && shipLanes.length > 0 && !shipLanes.some((r) => (def.draft ?? 0) <= (r.draft ?? 2))) return `The water from this port is too narrow for a ${def.label}`;
  if (world.money < def.cost) return `Need ${def.cost}`;
  return null;
}

/** Buy a vehicle that works for a building. It waits there until a route it may run exists. */
export function buyVehicle(world: World, siteId: number, kind: VehicleKind, line: Line = 'main'): string | null {
  const err = buyError(world, siteId, kind);
  if (err) return err;
  const owner = siteById(world, siteId)!;
  if (fleetOf(world, siteId, line).length >= fleetLimit(owner.level)) return `This line runs ${fleetLimit(owner.level)} vehicles at level ${owner.level}. Upgrade the building to run more`;
  world.money -= VEHICLE_DEFS[kind].cost;
  const v = newVehicle(world, siteId, kind);
  const site = siteById(world, siteId);
  if (line === 'by' && site && hasByLine(site)) v.line = 'by';
  if (site && VEHICLE_DEFS[kind].mode === 'road') {
    const body = bodyForLine(site, v.line ?? 'main');
    if (body !== 'box') v.body = body;
  }
  assignVehicle(world, v);
  return null;
}

/** Buy another vehicle just like this one: same class, same line, same pinned destination and buyer choice. */
export function duplicateVehicle(world: World, vehicleId: number): string | null {
  const src = world.vehicles.find((x) => x.id === vehicleId);
  if (!src) return 'No such vehicle';
  const err = buyVehicle(world, src.homeId, src.kind, src.line ?? 'main');
  if (err) return err;
  const v = world.vehicles[world.vehicles.length - 1];
  v.destId = src.destId;
  if (src.pick) v.pick = src.pick;
  v.routeId = 0;
  assignVehicle(world, v);
  return null;
}

/** The vehicles that work for a building. */
export function fleetOf(world: World, siteId: number, line?: Line): Vehicle[] {
  return world.vehicles.filter((v) => v.homeId === siteId && (!line || (v.line ?? 'main') === line));
}

/** What upgrading one vehicle costs: the next class, less what the old one is worth. */
export function upgradeVehicleCost(kind: VehicleKind): number {
  const next = VEHICLE_DEFS[kind].next;
  return next ? Math.round(VEHICLE_DEFS[next].cost - VEHICLE_DEFS[kind].cost * TRADE_IN) : 0;
}

export function upgradeVehicleError(world: World, vehicleId: number): string | null {
  const v = world.vehicles.find((x) => x.id === vehicleId);
  if (!v) return 'No such vehicle';
  const next = VEHICLE_DEFS[v.kind].next;
  if (!next) return 'Already the top class';
  if (VEHICLE_DEFS[next].tier > world.tier) return `${VEHICLE_DEFS[next].label} unlocks at Tier ${VEHICLE_DEFS[next].tier}`;
  const home = siteById(world, v.homeId);
  if (home && home.level < VEHICLE_DEFS[next].needLevel) return `${VEHICLE_DEFS[next].label} needs ${home.name} at level ${VEHICLE_DEFS[next].needLevel}`;
  const lane = v.routeId ? world.routes.find((r) => r.id === v.routeId) : undefined;
  if (lane && lane.mode === 'sea' && (VEHICLE_DEFS[next].draft ?? 0) > (lane.draft ?? 2)) return `This route's water is too narrow for a ${VEHICLE_DEFS[next].label}`;
  const cost = upgradeVehicleCost(v.kind);
  return world.money < cost ? `Need $${cost.toLocaleString('en-US')}` : null;
}

/** Swap one vehicle for the next class up. It keeps its route and its load. */
export function upgradeVehicle(world: World, vehicleId: number): string | null {
  const err = upgradeVehicleError(world, vehicleId);
  if (err) return err;
  const v = world.vehicles.find((x) => x.id === vehicleId)!;
  world.money -= upgradeVehicleCost(v.kind);
  v.kind = VEHICLE_DEFS[v.kind].next!;
  return null;
}

/** Money for selling a vehicle: half its price. */
export function sellVehicleValue(v: Vehicle): number {
  return Math.round(VEHICLE_DEFS[v.kind].cost * 0.5);
}

export function sellVehicle(world: World, vehicleId: number): string | null {
  const v = world.vehicles.find((x) => x.id === vehicleId);
  if (!v) return 'No such vehicle';
  world.money += sellVehicleValue(v);
  world.vehicles = world.vehicles.filter((x) => x.id !== vehicleId);
  return null;
}

/** Pin a vehicle to one destination, or let it take any run its building may send along (destId 0). */
export function setVehicleDest(world: World, vehicleId: number, destId: number): void {
  const v = world.vehicles.find((x) => x.id === vehicleId);
  if (v) v.destId = destId;
}

/** Where a vehicle could be sent: the buildings its home has a route of its kind to. */
export function destinationsOf(world: World, v: Vehicle): Site[] {
  const out: Site[] = [];
  for (const r of world.routes) {
    if (r.free || r.mode !== VEHICLE_DEFS[v.kind].mode) continue;
    if (r.fromSiteId !== v.homeId && r.toSiteId !== v.homeId) continue;
    const o = siteById(world, r.fromSiteId === v.homeId ? r.toSiteId : r.fromSiteId);
    if (o && !out.includes(o)) out.push(o);
  }
  return out;
}

/** One buyer a vehicle could run to, with what it would take there, for the truck card's route picture. */
export interface TruckRun {
  site: Site;
  /** Its home's goods the buyer wants right now. */
  goods: Good[];
  /** Length of the road, track, sea or air lane in tiles. */
  tiles: number;
  /** About what a unit sells for there. */
  price: number;
  /** How full the buyer is of what we bring, 0 to 1: full buyers pay less and want little. */
  fill: number;
}

/** Every buyer this vehicle may serve, nearest first, ignoring any pin so the card can show the choices. */
export function runsOf(world: World, v: Vehicle): TruckRun[] {
  const home = siteById(world, v.homeId);
  if (!home) return [];
  const out: TruckRun[] = [];
  const free = { ...v, destId: 0 };
  for (const r of world.routes) {
    if (!laneOk(world, free, r)) continue;
    const other = siteById(world, r.fromSiteId === v.homeId ? r.toSiteId : r.fromSiteId);
    if (!other) continue;
    const asked = wants(world, other);
    const goods = lineGoods(home, v.line ?? 'main').filter((g) => asked.includes(g));
    const cap = Math.max(1, siteCap(world, other));
    const price = goods.length === 0 ? 0 : Math.max(...goods.map((g) => (SITE_DEFS[other.kind].dock ? unitPrice(world, other, g) : SITE_DEFS[other.kind].hub ? 0 : GOODS[g].price * 0.6)));
    const fill = goods.length === 0 ? 1 : Math.min(1, Math.max(...goods.map((g) => stockOf(other, g))) / cap);
    const at = out.findIndex((x) => x.site.id === other.id);
    if (at >= 0) {
      if (r.path.length < out[at].tiles) out[at].tiles = r.path.length;
      continue;
    }
    out.push({ site: other, goods, tiles: r.path.length, price, fill });
  }
  return out.sort((a, b) => a.tiles - b.tiles);
}

// ---- joining buildings along the network ----

/** The roads or tracks of one mode as a graph: tiles joined where a route runs from one to the next. */
export function networkGraph(world: World, mode: RouteMode): Map<number, number[]> {
  const g = new Map<number, number[]>();
  const key = (t: Tile): number => t.y * world.width + wrapX(world, t.x);
  const link = (a: number, b: number): void => {
    if (!g.has(a)) g.set(a, []);
    if (!g.get(a)!.includes(b)) g.get(a)!.push(b);
  };
  for (const r of world.routes) {
    if (r.mode !== mode) continue;
    for (let i = 0; i < r.path.length - 1; i++) {
      const a = key(r.path[i]);
      const b = key(r.path[i + 1]);
      link(a, b);
      link(b, a);
    }
  }
  return g;
}

export interface Link {
  site: Site;
  mode: RouteMode;
  /** Tiles along the existing network, from the first building to this one. */
  path: Tile[];
}

/** Buildings reachable from this one along roads or tracks already laid, that it could trade with and has no route to yet. */
export function linkableSites(world: World, siteId: number): Link[] {
  const site = siteById(world, siteId);
  if (!site) return [];
  const out: Link[] = [];
  for (const mode of ['road', 'rail'] as RouteMode[]) {
    const g = networkGraph(world, mode);
    const start = site.y * world.width + site.x;
    if (!g.has(start)) continue;
    const prev = new Map<number, number>([[start, -1]]);
    const queue = [start];
    for (let qi = 0; qi < queue.length; qi++) {
      const cur = queue[qi];
      // A truck cannot drive through a building, so every building is the end of the line.
      if (cur !== start && siteAt(world, cur % world.width, Math.floor(cur / world.width))) continue;
      for (const nb of g.get(cur) ?? []) {
        if (prev.has(nb)) continue;
        prev.set(nb, cur);
        queue.push(nb);
      }
    }
    for (const t of queue) {
      if (t === start) continue;
      const other = siteAt(world, t % world.width, Math.floor(t / world.width));
      if (!other || other.id === site.id) continue;
      if (mode === 'road' && (SITE_DEFS[other.kind].station || SITE_DEFS[site.kind].station)) continue;
      if (!canHaul(world, site, other)) continue;
      const joined = world.routes.some((r) => !r.free && r.mode === mode && ((r.fromSiteId === site.id && r.toSiteId === other.id) || (r.fromSiteId === other.id && r.toSiteId === site.id)));
      if (joined) continue;
      const path: Tile[] = [];
      for (let c = t; c !== -1; c = prev.get(c)!) path.push({ x: c % world.width, y: Math.floor(c / world.width) });
      out.push({ site: other, mode, path: path.reverse() });
    }
  }
  return out;
}

/** Open a route between two buildings along the network that already joins them. */
export function startRoute(world: World, siteId: number, otherId: number): string | null {
  const link = linkableSites(world, siteId).find((l) => l.site.id === otherId);
  if (!link) return 'Those two are not joined by a road or track yet, or have nothing to trade';
  return createRoute(world, link.path, link.mode, 'street');
}

/** After a road is laid, start routes from the buildings at its ends to what they can now reach. Returns what was started. */
export function connectSites(world: World, siteIds: number[], max = 3): string[] {
  const made: string[] = [];
  for (const id of siteIds) {
    const site = siteById(world, id);
    if (!site) continue;
    for (const l of linkableSites(world, id)) {
      if (made.length >= max) return made;
      if (startRoute(world, id, l.site.id) === null) made.push(`${site.name} to ${l.site.name}`);
    }
  }
  return made;
}

// ---- taking roads out ----

/** Money back for removing a route: half the cost of the tiles only it uses. */
export function routeRefund(world: World, route: Route): number {
  if (route.over) return 0;
  const shared = new Set<number>();
  for (const r of world.routes) if (r.id !== route.id && !r.over && r.mode === route.mode) for (const p of r.path) shared.add(p.y * world.width + p.x);
  const factor = (route.mode === 'rail' ? RAIL_COST_FACTOR : 1) * (route.mode === 'road' && route.grade === 'highway' ? HIGHWAY_COST_FACTOR : 1);
  let refund = 0;
  if (route.mode === 'air') refund += route.path.length * AIR_COST_PER_TILE * 0.5;
  else if (route.mode === 'sea') refund += route.path.length * SEA_COST_PER_TILE * 0.5;
  else {
    for (const p of route.path) {
      const t = terrainAt(world, p.x, p.y);
      if (t && t !== 'ice' && !shared.has(p.y * world.width + p.x) && !siteAt(world, p.x, p.y)) refund += ROAD_COST[t] * factor * 0.5;
    }
  }
  return Math.round(refund);
}

/** Why a route cannot be removed, or null. */
export function removeRouteError(world: World, routeId: number): string | null {
  const route = world.routes.find((r) => r.id === routeId);
  if (!route) return 'Nothing to remove';
  // The free links inside a town (no grade) are its streets.
  if (route.mode === 'road' && route.grade === undefined && !route.free) return "Town streets belong to the town";
  return null;
}

/** Take a route out. Vehicles that ran it go back to waiting at home. The tiles another route still uses stay. */
export function removeRoute(world: World, routeId: number): string | null {
  const err = removeRouteError(world, routeId);
  if (err) return err;
  const route = world.routes.find((r) => r.id === routeId)!;
  world.money += routeRefund(world, route);
  world.routes = world.routes.filter((r) => r.id !== routeId);
  for (const v of world.vehicles) if (v.routeId === routeId) strand(route, v);
  dropBrokenLanes(world, route.mode);
  linkNetwork(world, route.mode);
  return null;
}

/** A lane between two buildings needs ground under every tile: when a stretch goes, the lanes that ran along it go too. */
function dropBrokenLanes(world: World, mode: RouteMode): void {
  const key = (t: Tile): number => t.y * world.width + wrapX(world, t.x);
  const ground = new Set<number>();
  for (const r of world.routes) if (r.mode === mode && !r.over) for (const t of r.path) ground.add(key(t));
  const dead = new Set<number>();
  for (const r of world.routes) {
    if (!r.over || r.mode !== mode) continue;
    // Town streets and the buildings at the ends are ground too.
    if (r.path.some((t) => !ground.has(key(t)) && !siteAt(world, t.x, t.y) && !(mode === 'road' && streetAt(world, t.x, t.y)))) dead.add(r.id);
  }
  if (dead.size === 0) return;
  const gone = world.routes.filter((r) => dead.has(r.id));
  world.routes = world.routes.filter((r) => !dead.has(r.id));
  for (const v of world.vehicles) {
    const r = dead.has(v.routeId) ? gone.find((x) => x.id === v.routeId) : undefined;
    if (r) strand(r, v);
  }
}

// ---- path finding ----

const TURN_COST = 0.4;
/** Extra cost for a road to cross a resource spot: more than any sensible detour, so it only does so when it must. */
const NODE_COST = 60;

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
  // Resource spots are for buildings: a road keeps off them unless it has nowhere else to go. A town's streets are road
  // already, so joining one is as cheap as joining any other road.
  const spots = new Set<number>(world.nodes.map((n) => n.y * W + wrapX(world, n.x)));
  const streets = new Set<number>();
  if (mode === 'road') {
    for (const p of world.places) {
      for (const k of townStreets(world, p)) streets.add(k);
      // Streets the town has yet to build are planned ground: a road that follows one becomes it, so it is as cheap as a road.
      for (const s of layoutOf(world, p).streets) streets.add((p.y + s.y) * W + wrapX(world, p.x + s.x));
    }
  }
  const D = 5; // four headings, plus 4 for 'none yet'
  const tileOf = (st: number) => Math.floor(st / (R * D));
  const start = (from.y * W + wrapX(world, from.x)) * R * D + 4;
  const goalTile = to.y * W + wrapX(world, to.x);
  const startTile = from.y * W + wrapX(world, from.x);
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
      if (own.has(nt) || streets.has(nt)) cost = 0.4;
      else {
        if (t !== 'water' && t !== 'mountain') cost += terrainHazard(world, nx, ny);
        if (spots.has(nt) && nt !== goalTile && nt !== startTile) cost += NODE_COST;
      }
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
