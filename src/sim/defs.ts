// Static game data. Add goods, sites, vehicles and quests here; the sim reads them generically.

const GOOD_IDS = [
  // raw
  'logs', 'grain', 'cotton', 'stone', 'ore', 'coal', 'clay', 'sand', 'milk', 'fruit',
  // island specialties: only grown on distant islands
  'coffee', 'mango', 'oil',
  // materials
  'lumber', 'flour', 'paper', 'bricks', 'blocks', 'ingots', 'steel', 'cement', 'concrete', 'glass', 'yarn', 'cloth',
  // products
  'bread', 'cheese', 'jam', 'clothes', 'furniture', 'books', 'pellets', 'feed', 'tools', 'machinery',
  // by-products
  'sawdust', 'bran', 'whey', 'gravel', 'slag',
] as const;
export type Good = (typeof GOOD_IDS)[number];
export type Stock = Partial<Record<Good, number>>;
export type Terrain = 'water' | 'grass' | 'forest' | 'mountain' | 'ice';
export type NodeKind = 'forest' | 'farmland' | 'quarry' | 'mine' | 'coal' | 'clay' | 'pasture' | 'orchard' | 'coffee' | 'mango' | 'oil';
export type VehicleKind = 'boxtruck' | 'bigtruck' | 'rig' | 'convoy' | 'train' | 'heavytrain' | 'plane' | 'jet' | 'barge' | 'boat' | 'freighter' | 'containership';
export type Category = 'production' | 'processing' | 'manufacturing' | 'heavy' | 'logistics' | 'vehicles';

export const GOOD_LIST: Good[] = [...GOOD_IDS];

export const START_MONEY = 1500;
export const TICKS_PER_SECOND = 10;

/** Terrain elevation scale: 0..255, with the waterline here. */
export const SEA_LEVEL = 96;
export const MOUNTAIN_ELEV = 188;
/** Steepest elevation step (per tile) a free-standing building may sit on. */
export const BUILD_SLOPE = 16;

type GoodKind = 'raw' | 'material' | 'product' | 'byproduct';
export const GOODS: Record<Good, { label: string; price: number; color: number; kind: GoodKind }> = {
  logs: { label: 'Logs', price: 3, color: 0x8a5a33, kind: 'raw' },
  grain: { label: 'Grain', price: 2, color: 0xd9b84a, kind: 'raw' },
  cotton: { label: 'Cotton', price: 4, color: 0xf0eee6, kind: 'raw' },
  stone: { label: 'Stone', price: 5, color: 0x8d9298, kind: 'raw' },
  ore: { label: 'Iron Ore', price: 7, color: 0x8a5a4a, kind: 'raw' },
  coal: { label: 'Coal', price: 6, color: 0x2b2d31, kind: 'raw' },
  clay: { label: 'Clay', price: 3, color: 0xb86f4a, kind: 'raw' },
  sand: { label: 'Sand', price: 2, color: 0xe0cd96, kind: 'raw' },
  milk: { label: 'Milk', price: 4, color: 0xf4f6f8, kind: 'raw' },
  fruit: { label: 'Fruit', price: 5, color: 0xc8453b, kind: 'raw' },
  coffee: { label: 'Coffee', price: 16, color: 0x6b4426, kind: 'raw' },
  mango: { label: 'Mango', price: 12, color: 0xf0a630, kind: 'raw' },
  oil: { label: 'Crude Oil', price: 11, color: 0x1f2023, kind: 'raw' },
  lumber: { label: 'Lumber', price: 11, color: 0xc9a06a, kind: 'material' },
  flour: { label: 'Flour', price: 9, color: 0xece4d0, kind: 'material' },
  paper: { label: 'Paper', price: 26, color: 0xf2efe6, kind: 'material' },
  bricks: { label: 'Bricks', price: 10, color: 0xa4523f, kind: 'material' },
  blocks: { label: 'Stone Blocks', price: 20, color: 0xb8b5ac, kind: 'material' },
  ingots: { label: 'Iron Ingots', price: 34, color: 0x6f7a86, kind: 'material' },
  steel: { label: 'Steel', price: 90, color: 0x4e6a86, kind: 'material' },
  cement: { label: 'Cement', price: 22, color: 0x9a9a96, kind: 'material' },
  concrete: { label: 'Concrete', price: 16, color: 0xb2b2ae, kind: 'material' },
  glass: { label: 'Glass', price: 24, color: 0x9fd0e0, kind: 'material' },
  yarn: { label: 'Yarn', price: 14, color: 0xd9a0b0, kind: 'material' },
  cloth: { label: 'Cloth', price: 34, color: 0x7f9fc8, kind: 'material' },
  bread: { label: 'Bread', price: 13, color: 0xc98c4a, kind: 'product' },
  cheese: { label: 'Cheese', price: 22, color: 0xe8c04a, kind: 'product' },
  jam: { label: 'Jam', price: 10, color: 0x9a2f4a, kind: 'product' },
  clothes: { label: 'Clothes', price: 85, color: 0x4f7f6f, kind: 'product' },
  furniture: { label: 'Furniture', price: 40, color: 0x8b5a3a, kind: 'product' },
  books: { label: 'Books', price: 70, color: 0x4f6fa8, kind: 'product' },
  pellets: { label: 'Pellets', price: 8, color: 0x9a7448, kind: 'product' },
  feed: { label: 'Feed', price: 8, color: 0xb7a35a, kind: 'product' },
  tools: { label: 'Tools', price: 60, color: 0x6a7480, kind: 'product' },
  machinery: { label: 'Machinery', price: 330, color: 0xd08a2e, kind: 'product' },
  sawdust: { label: 'Sawdust', price: 1, color: 0xd6bf8f, kind: 'byproduct' },
  bran: { label: 'Bran', price: 2, color: 0xb59a64, kind: 'byproduct' },
  whey: { label: 'Whey', price: 1, color: 0xe6e2c8, kind: 'byproduct' },
  gravel: { label: 'Gravel', price: 3, color: 0x9d9a92, kind: 'byproduct' },
  slag: { label: 'Slag', price: 2, color: 0x58545a, kind: 'byproduct' },
};

export interface SiteDef {
  label: string;
  blurb: string;
  category: Category | null;
  cost: number;
  /** World tier needed to build it. */
  tier: number;
  /** Max units held per good (before level and town multipliers). */
  cap: number;
  /** Must be built on a resource node of this kind. */
  node?: NodeKind;
  color: number;
  /** Raw producer: one unit of `good` every `every` ticks, and slower by-products (`also`) that sell like the main good. */
  produce?: { good: Good; every: number; also?: { good: Good; every: number }[] };
  /** Processor: consumes inputs, makes outputs every `every` ticks. The first output is the main product. */
  recipe?: { inputs: Stock; outputs: Stock; every: number };
  /** Processing buildings go in a town's plots, as part of the town. */
  inTown?: boolean;
  /** Logistics hub: stores goods and passes them on. */
  hub?: boolean;
  /** Town selling point. Created by towns, never placed by the player. */
  dock?: 'market' | 'freight' | 'civic';
  /** Town rail station: trains unload here and the goods are sold on to the town's docks. */
  station?: boolean;
  /** Airport: a hub that planes fly between. */
  airport?: boolean;
  /** Rail Yard: a hub at the edge of a town where trains load and unload. */
  railyard?: boolean;
  /** Storage Depot: goods shipped in wait here, and businesses nearby draw their inputs from it. */
  store?: boolean;
  /** The real-life thing this is like, in one plain sentence, shown in its menu and the guide. */
  real?: string;
  /** Port: a hub on the coast that ships sail between. */
  port?: boolean;
}

const raw = (label: string, blurb: string, cost: number, tier: number, node: NodeKind, good: Good, every: number, color: number, also: Good[] = []): SiteDef => ({
  label,
  blurb,
  category: 'production',
  cost,
  tier,
  cap: 240,
  node,
  color,
  // From tier 1 on, raw sites run a third slower than before, so trucks and roads, not the ground, decide how much you can sell. The first tier stays quick to learn on. By-products come at 2.5 times the gap.
  produce: { good, every: Math.round(every * (tier >= 1 ? 1.5 : 1)), also: also.map((g) => ({ good: g, every: Math.round(every * (tier >= 1 ? 1.5 : 1) * 2.5) })) },
});

const proc = (
  category: Category,
  label: string,
  blurb: string,
  cost: number,
  tier: number,
  inputs: Stock,
  outputs: Stock,
  every: number,
  color: number,
): SiteDef => ({ label, blurb, category, cost, tier, cap: 120, inTown: true, color, recipe: { inputs, outputs, every } });

const DEFS = {
  // Production: extraction on resource nodes
  forestry: raw('Forestry Camp', 'Fells timber on a forest node. Makes logs and sawdust.', 80, 0, 'forest', 'logs', 20, 0x5f7f4a, ['sawdust']),
  farm: raw('Farm', 'Grows grain on farmland. Makes grain and bran.', 90, 0, 'farmland', 'grain', 15, 0xc8a850, ['bran']),
  claypit: raw('Clay Pit', 'Digs clay on a clay node by the water. Makes clay and sand.', 110, 0, 'clay', 'clay', 18, 0xb86f4a, ['sand']),
  ranch: raw('Dairy Ranch', 'Grazes cattle on pasture. Makes milk and whey.', 130, 0, 'pasture', 'milk', 20, 0x8bb46a, ['whey']),
  orchard: raw('Orchard', 'Grows fruit on an orchard node. Makes fruit and sawdust.', 120, 0, 'orchard', 'fruit', 22, 0xb0583f, ['sawdust']),
  quarry: raw('Quarry', 'Cuts stone from a pit at the foot of a mountain. Makes stone and gravel.', 160, 0, 'quarry', 'stone', 28, 0x8d9298, ['gravel']),
  cottonfarm: raw('Cotton Farm', 'Grows cotton on farmland. Makes cotton and bran.', 150, 1, 'farmland', 'cotton', 22, 0xe6e2d2, ['bran']),
  coalmine: raw('Coal Mine', 'Mines coal on a coal seam in the hills. Makes coal and stone.', 200, 1, 'coal', 'coal', 24, 0x2b2d31, ['stone']),
  oremine: raw('Iron Mine', 'Mines iron ore on an ore deposit in the hills. Makes iron ore and stone.', 220, 1, 'mine', 'ore', 26, 0x8a5a4a, ['stone']),
  coffeefarm: raw('Coffee Plantation', 'Terraced coffee on an island highland. Makes coffee and bran. Islands only, so it has to come by ship.', 420, 2, 'coffee', 'coffee', 26, 0x6b4426, ['bran']),
  mangogrove: raw('Mango Grove', 'Mango trees in the island sun. Makes mangoes and fruit. Islands only, so they have to come by ship.', 320, 2, 'mango', 'mango', 22, 0xf0a630, ['fruit']),
  oilwell: raw('Oil Well', 'Pumps crude oil from a field. Makes oil and sand. Found on a few islands, so it has to come by ship.', 900, 2, 'oil', 'oil', 30, 0x2a2a2e, ['sand']),
  sandpit: raw('Sand Pit', 'Digs sand on a clay node. Makes sand and gravel.', 140, 1, 'clay', 'sand', 16, 0xe0cd96, ['gravel']),

  // Processing
  sawmill: proc('processing', 'Sawmill', 'Logs in, lumber out. Sawdust is the by-product.', 220, 0, { logs: 2 }, { lumber: 1, sawdust: 1 }, 20, 0xb48650),
  mill: proc('processing', 'Flour Mill', 'Grain in, flour out. Bran is the by-product.', 220, 0, { grain: 2 }, { flour: 1, bran: 1 }, 20, 0xd8d2bf),
  bakery: proc('processing', 'Bakery', 'Flour in, bread out. Towns love bread.', 260, 0, { flour: 1 }, { bread: 2 }, 18, 0xc98c4a),
  dairy: proc('processing', 'Dairy', 'Milk in, cheese out. Whey is the by-product.', 280, 0, { milk: 2 }, { cheese: 1, whey: 1 }, 22, 0xe8c04a),
  jamfactory: proc('processing', 'Jam Factory', 'Fruit in, jam out.', 300, 1, { fruit: 2 }, { jam: 2 }, 20, 0x9a2f4a),
  feedmill: proc('processing', 'Feed Mill', 'Bran and whey in, animal feed out. Puts two by-products to work.', 300, 1, { bran: 2, whey: 1 }, { feed: 2 }, 20, 0xb7a35a),
  pelletmill: proc('processing', 'Pellet Mill', 'Presses sawdust into heating pellets.', 380, 1, { sawdust: 3 }, { pellets: 1 }, 22, 0x9a7448),

  // Manufacturing
  papermill: proc('manufacturing', 'Paper Mill', 'Logs in, paper out.', 480, 1, { logs: 3 }, { paper: 1 }, 30, 0x8fa3b8),
  spinmill: proc('manufacturing', 'Spinning Mill', 'Cotton in, yarn out.', 400, 1, { cotton: 2 }, { yarn: 1 }, 22, 0xd9a0b0),
  weavery: proc('manufacturing', 'Weavery', 'Yarn in, cloth out.', 520, 2, { yarn: 2 }, { cloth: 1 }, 26, 0x7f9fc8),
  tailor: proc('manufacturing', 'Garment Factory', 'Cloth in, clothes out. Big money.', 650, 2, { cloth: 2 }, { clothes: 1 }, 34, 0x4f7f6f),
  workshop: proc('manufacturing', 'Furniture Workshop', 'Lumber in, furniture out.', 900, 2, { lumber: 2 }, { furniture: 1 }, 34, 0x8b5a3a),
  printery: proc('manufacturing', 'Printery', 'Paper in, books out.', 1200, 2, { paper: 2 }, { books: 1 }, 40, 0x4f6fa8),

  // Heavy industry
  brickworks: proc('heavy', 'Brickworks', 'Clay in, bricks out.', 420, 1, { clay: 2 }, { bricks: 1 }, 22, 0xa4523f),
  stonecutter: proc('heavy', 'Stonecutter', 'Stone in, cut blocks out. Gravel is the by-product.', 380, 1, { stone: 2 }, { blocks: 1, gravel: 1 }, 24, 0xb8b5ac),
  cementworks: proc('heavy', 'Cement Works', 'Gravel and coal in, cement out.', 600, 2, { gravel: 2, coal: 1 }, { cement: 1 }, 26, 0x9a9a96),
  concrete: proc('heavy', 'Concrete Plant', 'Cement and sand in, concrete out.', 650, 2, { cement: 1, sand: 1 }, { concrete: 2 }, 24, 0xb2b2ae),
  glassworks: proc('heavy', 'Glassworks', 'Sand and coal in, glass out.', 700, 2, { sand: 2, coal: 1 }, { glass: 1 }, 28, 0x9fd0e0),
  smelter: proc('heavy', 'Smelter', 'Ore and coal in, iron ingots out. Slag is the by-product.', 800, 2, { ore: 2, coal: 1 }, { ingots: 1, slag: 1 }, 30, 0x6f7a86),
  toolworks: proc('heavy', 'Toolworks', 'Ingots and lumber in, tools out.', 750, 2, { ingots: 1, lumber: 1 }, { tools: 1 }, 30, 0x6a7480),
  steelworks: proc('heavy', 'Steelworks', 'Ingots and coal in, steel out.', 1400, 3, { ingots: 2, coal: 1 }, { steel: 1, slag: 1 }, 40, 0x4e6a86),
  slagcrusher: proc('heavy', 'Slag Crusher', 'Turns slag into gravel and sand.', 500, 3, { slag: 1 }, { gravel: 1, sand: 1 }, 20, 0x58545a),
  machinery: proc('heavy', 'Machine Works', 'Steel and tools in, machinery out. The top of the chain.', 2200, 3, { steel: 2, tools: 1 }, { machinery: 1 }, 60, 0xd08a2e),

  // Logistics and town docks
  hub: {
    label: 'Warehouse',
    blurb: 'Keeps your goods safe. It holds the extra when buyers are full, and the factories next to it take what they need.',
    real: 'Like a real warehouse: goods wait on the shelf until a store or a factory needs them.',
    category: 'logistics',
    cost: 300,
    tier: 1,
    cap: 480,
    color: 0xd68a2e,
    hub: true,
    store: true,
  } as SiteDef,
  railyard: {
    label: 'Rail Yard',
    blurb: 'A rail freight terminal at the edge of a town. Goods are loaded onto trains here, and unloaded and sent into town when trains arrive.',
    real: 'Like a real rail yard: where freight is loaded onto trains and unloaded again.',
    category: 'logistics',
    cost: 3000,
    tier: 2,
    cap: 800,
    color: 0x5c7ea8,
    hub: true,
    railyard: true,
  } as SiteDef,
  port: {
    label: 'Port',
    blurb: 'A seaport. Goods are loaded onto ships here, and unloaded and sent into town when ships arrive.',
    real: 'Like a real seaport: cranes load containers onto ships and unload them again.',
    category: 'logistics',
    cost: 4000,
    tier: 2,
    cap: 960,
    color: 0x3f78a8,
    hub: true,
    port: true,
  } as SiteDef,
  market: {
    label: 'Market',
    blurb: 'Where the town buys finished goods that people use every day.',
    category: null,
    cost: 0,
    tier: 0,
    cap: 120,
    color: 0xc0504d,
    dock: 'market',
  } as SiteDef,
  freight: {
    label: 'Supply Yard',
    blurb: 'Where the town buys raw materials for its builders and factories: logs, grain, ore and leftovers.',
    category: null,
    cost: 0,
    tier: 0,
    cap: 120,
    color: 0x6d8fa8,
    dock: 'freight',
  } as SiteDef,
  district: {
    label: 'District',
    blurb: 'A town district: a building on a lot beside the streets, supplied by your trucks.',
    category: null,
    cost: 0,
    tier: 0,
    cap: 120,
    color: 0x9a8a6a,
    dock: 'civic',
  } as SiteDef,
  station: {
    label: 'Rail Station',
    blurb: 'Where trains serve a town. Goods unloaded here are sold on to its Market and Supply Yard.',
    category: null,
    cost: 0,
    tier: 2,
    cap: 240,
    color: 0x8a7a5c,
    station: true,
  } as SiteDef,
  airport: {
    label: 'Airport',
    blurb: 'An air cargo terminal on a 3x3 field: the runway runs across the back and the road comes in at the front. Goods are loaded onto cargo planes here, and unloaded and sent into town when planes land. Upgrades build out the terminal, from airfield to regional to international.',
    real: 'Like a real air cargo terminal: freight is loaded onto planes and unloaded again.',
    category: 'logistics',
    cost: 2500,
    tier: 3,
    cap: 480,
    color: 0x7f8d9a,
    hub: true,
    airport: true,
  } as SiteDef,
};

export type SiteKind = keyof typeof DEFS;
export const SITE_DEFS: Record<SiteKind, SiteDef> = DEFS;

/** Every building the player can place, in menu order. */
export const BUILD_ORDER: SiteKind[] = (Object.keys(DEFS) as SiteKind[]).filter((k) => !DEFS[k].dock && !DEFS[k].station);

/** Each time a town grows a level, this many of the homes along its streets make way for lots the player can build on. */
export const LOTS_PER_LEVEL = 3;

/** How a town looks and what it likes depends on where it is. Style is picked from latitude and a roll of the dice. */
export type TownStyle = 'nordic' | 'temperate' | 'mediterranean' | 'tropical' | 'arid';
export const TOWN_STYLES: TownStyle[] = ['nordic', 'temperate', 'mediterranean', 'tropical', 'arid'];
export const STYLE_LABEL: Record<TownStyle, string> = {
  nordic: 'Nordic',
  temperate: 'Temperate',
  mediterranean: 'Mediterranean',
  tropical: 'Tropical',
  arid: 'Desert',
};
/** Goods a town style pays extra for (the multiplier on price and need). */
export const STYLE_TASTE: Record<TownStyle, Stock> = {
  nordic: { pellets: 1.5, clothes: 1.3, cheese: 1.2 },
  temperate: { bread: 1.2, books: 1.2, furniture: 1.1 },
  mediterranean: { cheese: 1.4, jam: 1.4, glass: 1.2, bread: 1.1 },
  tropical: { jam: 1.3, lumber: 1.2, cloth: 1.2, concrete: 1.2 },
  arid: { glass: 1.4, lumber: 1.4, feed: 1.3, bricks: 1.2 },
};

export interface VehicleDef {
  label: string;
  blurb: string;
  mode: 'road' | 'rail' | 'air' | 'sea';
  cost: number;
  tier: number;
  capacity: number;
  ticksPerTile: number;
  /** False for vehicles that are designed but whose routes are not built yet. */
  implemented: boolean;
  /** The class this one trades up to. */
  next?: VehicleKind;
  /** The building level whose garage can take this class: a bigger vehicle needs a bigger yard. */
  needLevel: number;
  /** Ships only: how wide a channel it needs. 0 sails any river or lake, 1 needs a wide channel, 2 needs open sea. */
  draft?: number;
}

export const VEHICLE_DEFS: Record<VehicleKind, VehicleDef> = {
  boxtruck: { label: 'Box Truck', blurb: 'Small, cheap, good for short hauls.', mode: 'road', cost: 120, tier: 0, capacity: 12, ticksPerTile: 6, implemented: true, needLevel: 1, next: 'bigtruck' },
  bigtruck: { label: 'Big Box Truck', blurb: 'Twice the load of a box truck.', mode: 'road', cost: 380, tier: 1, capacity: 27, ticksPerTile: 6, implemented: true, needLevel: 2, next: 'rig' },
  rig: { label: 'Big Rig', blurb: 'Large trailer, faster on the highway.', mode: 'road', cost: 950, tier: 2, capacity: 60, ticksPerTile: 5, implemented: true, needLevel: 3, next: 'convoy' },
  convoy: { label: 'Truck Fleet', blurb: 'A convoy of rigs that moves as one. The top of the road ladder.', mode: 'road', cost: 3200, tier: 3, capacity: 165, ticksPerTile: 5, implemented: true, needLevel: 4 },
  train: { label: 'Freight Train', blurb: 'Huge capacity on its own track. Rails cross roads at level crossings.', mode: 'rail', cost: 1800, tier: 2, capacity: 140, ticksPerTile: 3, implemented: true, needLevel: 1, next: 'heavytrain' },
  heavytrain: { label: 'Heavy Haul Train', blurb: 'A long unit train for the busiest lines.', mode: 'rail', cost: 5200, tier: 3, capacity: 360, ticksPerTile: 3, implemented: true, needLevel: 3 },
  plane: { label: 'Cargo Plane', blurb: 'Fast, crosses any terrain. Flies between airports.', mode: 'air', cost: 7000, tier: 3, capacity: 60, ticksPerTile: 3, implemented: true, needLevel: 1, next: 'jet' },
  barge: { label: 'River Barge', blurb: 'Flat and shallow: sails rivers and lakes, and the coast.', mode: 'sea', cost: 900, tier: 2, capacity: 24, ticksPerTile: 5, implemented: true, needLevel: 1, next: 'boat', draft: 0 },
  boat: { label: 'Cargo Boat', blurb: 'A small coastal freighter. Needs a wide channel.', mode: 'sea', cost: 2500, tier: 2, capacity: 50, ticksPerTile: 4.5, implemented: true, needLevel: 1, next: 'freighter', draft: 1 },
  freighter: { label: 'Freighter', blurb: 'A proper cargo ship with a crane and a hold.', mode: 'sea', cost: 9000, tier: 3, capacity: 160, ticksPerTile: 3.75, implemented: true, needLevel: 2, next: 'containership', draft: 2 },
  containership: { label: 'Container Ship', blurb: 'Boxes stacked high. Carries more than any other vehicle.', mode: 'sea', cost: 28000, tier: 4, capacity: 520, ticksPerTile: 3, implemented: true, needLevel: 3, draft: 2 },
  jet: { label: 'Cargo Jet', blurb: 'A wide-body freighter for the longest hauls.', mode: 'air', cost: 22000, tier: 4, capacity: 220, ticksPerTile: 2.25, implemented: true, needLevel: 3 },
};

export const VEHICLE_ORDER: VehicleKind[] = ['boxtruck', 'bigtruck', 'rig', 'convoy', 'train', 'heavytrain', 'plane', 'jet', 'barge', 'boat', 'freighter', 'containership'];

/**
 * The body a road vehicle is built with, set by what it hauls, like real freight: logs and heavy goods ride on flatbeds,
 * bulk loose goods like grain and gravel in open-top trucks, liquids and powders in tankers, everything else in boxes.
 */
export type Body = 'flatbed' | 'open' | 'tanker' | 'box';
const BODY_GOODS: Record<Exclude<Body, 'box'>, Good[]> = {
  flatbed: ['logs', 'lumber', 'stone', 'blocks', 'bricks', 'ingots', 'steel', 'machinery', 'cotton'],
  open: ['grain', 'coal', 'ore', 'clay', 'sand', 'gravel', 'slag', 'bran', 'sawdust', 'feed'],
  tanker: ['milk', 'oil', 'whey', 'cement', 'concrete'],
};
export function bodyOf(g: Good): Body {
  for (const b of Object.keys(BODY_GOODS) as Exclude<Body, 'box'>[]) if (BODY_GOODS[b].includes(g)) return b;
  return 'box';
}
const ROAD_NAMES: Record<Body, [string, string, string, string]> = {
  box: ['Box Truck', 'Big Box Truck', 'Big Rig', 'Truck Fleet'],
  flatbed: ['Flatbed Truck', 'Big Flatbed', 'Flatbed Rig', 'Flatbed Fleet'],
  open: ['Open-top Truck', 'Big Open-top', 'Open-top Rig', 'Open-top Fleet'],
  tanker: ['Tanker Truck', 'Big Tanker', 'Tanker Rig', 'Tanker Fleet'],
};
/** A vehicle's name: road vehicles are named for their body, everything else keeps its own name. */
export function vehicleLabel(kind: VehicleKind, body: Body = 'box'): string {
  const i = ['boxtruck', 'bigtruck', 'rig', 'convoy'].indexOf(kind);
  return i < 0 ? VEHICLE_DEFS[kind].label : ROAD_NAMES[body][i];
}

/** Trips a vehicle has made to a buyer for each driver level, the way a driver in a trucking game earns rank. */
export const DRIVER_TRIPS = [0, 6, 20, 45, 90];
/** Each driver level above the first takes this share off the time a vehicle needs for a tile. */
export const DRIVER_SPEED = 0.04;
export const DRIVER_RANKS = ['Rookie', 'Regular', 'Experienced', 'Veteran', 'Ace'];

/** Running costs. Vehicles cost this share of their price every minute; buildings and districts a share of theirs per level. */
export const VEHICLE_UPKEEP = 0.04;
export const SITE_UPKEEP = 0.01;
export const DISTRICT_UPKEEP = 0.015;
/** Towns pay this share of the list price. Keeps the early game from running away. */
export const SALE_MULT = 0.65;
/** Trading in a vehicle for the next class returns this share of its price. */
export const TRADE_IN = 0.5;

/** Building levels: output speed and storage multipliers for level 1, 2, 3. */
export const LEVEL_SPEED = [1, 1.8, 3.2, 4.6, 6.2, 8, 10, 12.5, 15.5, 19];
export const LEVEL_CAP = [1, 2, 4, 6, 9, 13, 18, 24, 32, 42];
export const MAX_LEVEL = 10;
/** The late levels also ask for what the company has earned in all, so they come after the tiers are done, not with them. */
export const LEVEL_EARN: Record<number, number> = { 7: 150_000, 8: 400_000, 9: 800_000, 10: 1_500_000 };
/** Ports and airports grow with the town beside them and stop at level 3. */
export const maxLevelOf = (def: { airport?: boolean; port?: boolean }): number => (def.airport || def.port ? 3 : MAX_LEVEL);
/** How many vehicles a building runs on each of its product lines: the yard grows with the building. */
export const FLEET_BASE = 3;
export const FLEET_PER_LEVEL = 2;
export const fleetLimit = (level: number): number => FLEET_BASE + FLEET_PER_LEVEL * level;
export const UPGRADE_COST_FACTOR = 1.2;
/** What each upgrade costs grows a little faster than the level, so the top levels are a real goal. */
export const UPGRADE_COST_POWER = 1.25;

/** Node quality: impure, normal, pure. */
export const NODE_QUALITY = [
  { label: 'Impure', mult: 0.6 },
  { label: 'Normal', mult: 1 },
  { label: 'Pure', mult: 1.5 },
];

/** Road building. Costs per tile; bridge and tunnel spans are limited by world tier. */
export const ROAD_COST: Record<Terrain, number> = { grass: 2, forest: 4, water: 24, mountain: 36, ice: Infinity };
export const SPAN_LIMIT = [2, 4, 8, 16];

/** Rails are a separate network from roads. Track costs more per tile, and unlocks at Tier 2. */
export type RouteMode = 'road' | 'rail' | 'air' | 'sea';
export const RAIL_COST_FACTOR = 1.8;
export const RAIL_TIER = 2;
/** A Distribution Hub can be given a rail yard, which is how trains reach a town. */
export const DEPOT_COST = 3000;
/** Air routes link two airports in a straight line. */
export const AIR_TIER = 3;
export const AIR_COST_PER_TILE = 4;
/** Sea routes link two ports over open water. */
export const SEA_TIER = 2;
export const SEA_COST_PER_TILE = 3;
/** Extra cost where a road and a rail cross at a level crossing. */
export const CROSSING_COST = 8;

/** Highways: multi-lane roads between towns. They cost more to build and carry traffic faster. */
export type RoadGrade = 'street' | 'highway';
export const HIGHWAY_COST_FACTOR = 2.4;
export const HIGHWAY_TIER = 1;
/** Trucks cover a highway tile in this share of the time. */
export const HIGHWAY_TIME = 0.65;

export interface TownLevel {
  name: string;
  pop: number;
  /** Growth points needed to reach this level. */
  growth: number;
}

export const TOWN_LEVELS: TownLevel[] = [
  { name: 'Hamlet', pop: 60, growth: 0 },
  { name: 'Village', pop: 400, growth: 2000 },
  { name: 'Town', pop: 2200, growth: 8000 },
  { name: 'City', pop: 11000, growth: 20000 },
  { name: 'Metropolis', pop: 60000, growth: 80000 },
];

/** Goods the Market wants at each town level. */
export const MARKET_DEMAND: Good[][] = [
  ['flour', 'bread', 'lumber', 'cheese'],
  ['flour', 'bread', 'lumber', 'cheese', 'paper', 'pellets', 'jam', 'coffee', 'mango'],
  ['flour', 'bread', 'lumber', 'cheese', 'paper', 'pellets', 'jam', 'coffee', 'mango', 'furniture', 'clothes', 'tools', 'glass'],
  ['flour', 'bread', 'lumber', 'cheese', 'paper', 'pellets', 'jam', 'coffee', 'mango', 'furniture', 'clothes', 'tools', 'glass', 'books', 'bricks', 'concrete', 'blocks'],
  ['flour', 'bread', 'lumber', 'cheese', 'paper', 'pellets', 'jam', 'coffee', 'mango', 'furniture', 'clothes', 'tools', 'glass', 'books', 'bricks', 'concrete', 'blocks', 'machinery'],
];
const FREIGHT_BASE: Good[] = ['logs', 'grain', 'cotton', 'stone', 'ore', 'coal', 'clay', 'sand', 'milk', 'fruit', 'sawdust', 'bran', 'whey', 'gravel', 'slag', 'feed', 'oil'];
/** Goods the Supply Yard wants by town level (it appears at level 2). Raw materials and by-products find a buyer here. */
export const FREIGHT_DEMAND: Good[][] = [
  [],
  FREIGHT_BASE,
  [...FREIGHT_BASE, 'ingots', 'cement', 'yarn'],
  [...FREIGHT_BASE, 'ingots', 'cement', 'yarn', 'steel'],
  [...FREIGHT_BASE, 'ingots', 'cement', 'yarn', 'steel'],
];

// ---- specialisation paths and districts ----

/** What a town commits to once it is a Town (level 3). Each path favours a family of goods and a way of earning. */
export type PathId = 'breadbasket' | 'forge' | 'tradehub' | 'boulevard';
export const PATH_ORDER: PathId[] = ['breadbasket', 'forge', 'tradehub', 'boulevard'];
/** Town level needed to pick a path, and what it costs. */
export const PATH_TOWN_LEVEL = 3;
export const PATH_COST = 3000;

export interface PathDef {
  label: string;
  blurb: string;
  /** Short lines for the town sheet: what the path does. */
  perks: string[];
  color: number;
  /** Goods this town pays extra for, and by how much. */
  goods: Good[];
  priceMult: number;
  /** Price multiplier on everything else (the Trade Hub's small edge on all goods). */
  basePrice: number;
  /** Town factories of these kinds work faster. */
  fasterSites: SiteKind[];
  speedMult: number;
  /** Vehicles loading at this town's buildings carry more. */
  loadMult: number;
  /** Docks and stations hold more. */
  storageMult: number;
}

export const PATHS: Record<PathId, PathDef> = {
  breadbasket: {
    label: 'Breadbasket',
    blurb: 'A food town. Farm produce, bakeries and dairies feed a thriving market.',
    perks: ['Food pays 25% more here', 'Mills, bakeries and dairies here work 30% faster', 'Food districts are 50% stronger'],
    color: 0x7fae5a,
    goods: ['grain', 'milk', 'fruit', 'flour', 'bread', 'cheese', 'jam', 'feed', 'bran', 'whey'],
    priceMult: 1.25,
    basePrice: 1,
    fasterSites: ['mill', 'bakery', 'dairy', 'jamfactory', 'feedmill'],
    speedMult: 1.3,
    loadMult: 1,
    storageMult: 1,
  },
  forge: {
    label: 'The Forge',
    blurb: 'A heavy-industry town. Metal, stone and building materials pour out of its works.',
    perks: ['Metal and building goods pay 25% more', 'Smelters, steelworks and brickworks here work 30% faster', 'Construction districts are 50% stronger'],
    color: 0xd0702f,
    goods: ['ore', 'coal', 'ingots', 'steel', 'tools', 'machinery', 'bricks', 'blocks', 'cement', 'concrete', 'glass', 'slag', 'gravel'],
    priceMult: 1.25,
    basePrice: 1,
    fasterSites: ['smelter', 'steelworks', 'toolworks', 'brickworks', 'stonecutter', 'cementworks', 'concrete', 'glassworks', 'machinery', 'slagcrusher'],
    speedMult: 1.3,
    loadMult: 1,
    storageMult: 1,
  },
  tradehub: {
    label: 'Trade Hub',
    blurb: 'A crossroads town. It does not specialise in a good: it moves all of them.',
    perks: ['Everything pays 8% more here', 'Vehicles loading here carry 30% more', 'Docks and stations hold 50% more'],
    color: 0x4f93c9,
    goods: [],
    priceMult: 1,
    basePrice: 1.08,
    fasterSites: [],
    speedMult: 1,
    loadMult: 1.3,
    storageMult: 1.5,
  },
  boulevard: {
    label: 'The Boulevard',
    blurb: 'A town of fine goods and fine living. Fashion, furniture, books and visitors.',
    perks: ['Fine goods pay 25% more here', 'Weaveries, tailors and workshops here work 30% faster', 'Visitors spend 50% more'],
    color: 0xb55f9a,
    goods: ['cloth', 'yarn', 'clothes', 'furniture', 'books', 'paper', 'glass'],
    priceMult: 1.25,
    basePrice: 1,
    fasterSites: ['spinmill', 'weavery', 'tailor', 'workshop', 'printery', 'papermill'],
    speedMult: 1.3,
    loadMult: 1,
    storageMult: 1,
  },
};

export type DistrictId =
  | 'farmersmarket'
  | 'restaurants'
  | 'heating'
  | 'hardware'
  | 'warehouse'
  | 'builders'
  | 'furniture'
  | 'fashion'
  | 'bookshops'
  | 'community'
  | 'amphitheatre'
  | 'stadium'
  | 'ballpark'
  | 'arena'
  | 'cafe'
  | 'resort'
  | 'terminal'
  | 'university'
  | 'foundry'
  | 'hotels'
  | 'foodhall'
  | 'heavyexchange'
  | 'intlterminal'
  | 'grandplaza';

export interface DistrictDef {
  label: string;
  blurb: string;
  /** Town level it opens at. Each further district level needs the town one level higher. */
  minLevel: number;
  cost: number;
  /** Goods it lives on: they pay more in this town, and its income depends on how well stocked they are. */
  goods: Good[];
  /** Extra price on those goods per district level. */
  price: number;
  /** Income per minute at district level 1, when every good it lives on is in stock. Scales with level. */
  revenue: number;
  /** Goods the town's docks start to ask for once this is built. */
  demand?: { market?: Good[]; freight?: Good[] };
  /** Something other than money or price. */
  effect?: 'storage' | 'growth' | 'visitors';
  /** Only towns on this path can build it. */
  path?: PathId;
  /** Towns on this path get 50% more out of it. */
  affinity?: PathId;
  /** The top district of a path: one per town, needs a Metropolis. */
  capstone?: boolean;
}

export const MAX_DISTRICT_LEVEL = 3;
export const DISTRICT_UPGRADE_FACTOR = 1.3;
export const AFFINITY_BONUS = 1.5;

export const DISTRICTS: Record<DistrictId, DistrictDef> = {
  farmersmarket: { label: 'Farmers Market', blurb: 'Stalls of fresh produce. Buys fruit and milk that the Market ignores.', minLevel: 1, cost: 450, goods: ['fruit', 'milk', 'bread', 'cheese', 'jam', 'flour'], price: 0.08, revenue: 10, demand: { market: ['fruit', 'milk'] }, affinity: 'breadbasket' },
  restaurants: { label: 'Restaurant Row', blurb: 'Kitchens that burn through bread, cheese and jam.', minLevel: 2, cost: 1000, goods: ['bread', 'cheese', 'jam', 'flour'], price: 0.1, revenue: 24, affinity: 'breadbasket' },
  heating: { label: 'Heating Depot', blurb: 'Warms the town in winter. Wants pellets, coal and oil from the islands.', minLevel: 2, cost: 800, goods: ['pellets', 'coal', 'oil'], price: 0.1, revenue: 20, demand: { market: ['coal'] } },
  cafe: { label: 'Coffee House', blurb: 'The corner cafe. Pays well for island coffee, with bread, jam and milk to go with it.', minLevel: 2, cost: 700, goods: ['coffee', 'bread', 'jam', 'milk'], price: 0.12, revenue: 24, affinity: 'boulevard' },
  hardware: { label: 'Hardware Store', blurb: 'Tools, timber and bricks for every home.', minLevel: 2, cost: 1000, goods: ['tools', 'lumber', 'bricks', 'cement'], price: 0.1, revenue: 26, demand: { market: ['cement'] }, affinity: 'forge' },
  warehouse: { label: 'Warehouse District', blurb: 'Deep storage. Docks hold more, so prices hold up under heavy deliveries.', minLevel: 2, cost: 1300, goods: [], price: 0, revenue: 0, effect: 'storage', affinity: 'tradehub' },
  builders: { label: "Builders' Yard", blurb: 'Brick, block and glass for a growing skyline.', minLevel: 3, cost: 2000, goods: ['bricks', 'blocks', 'concrete', 'glass', 'cement'], price: 0.1, revenue: 42, demand: { market: ['blocks', 'concrete'] }, affinity: 'forge' },
  furniture: { label: 'Furniture Gallery', blurb: 'Showrooms for timber and cloth.', minLevel: 3, cost: 1800, goods: ['furniture', 'lumber', 'cloth'], price: 0.1, revenue: 36, affinity: 'boulevard' },
  fashion: { label: 'Fashion Quarter', blurb: 'Boutiques that pay well for cloth and clothes.', minLevel: 3, cost: 2200, goods: ['clothes', 'cloth', 'yarn'], price: 0.12, revenue: 46, demand: { freight: ['yarn'] }, affinity: 'boulevard' },
  bookshops: { label: 'Library and Bookshops', blurb: 'Paper and books, read in quiet rooms.', minLevel: 3, cost: 2000, goods: ['books', 'paper'], price: 0.12, revenue: 40, affinity: 'boulevard' },
  terminal: { label: 'Freight Terminal', blurb: 'Raw goods and bulk freight find a better buyer.', minLevel: 3, cost: 2400, goods: ['logs', 'stone', 'ore', 'coal', 'sand', 'clay', 'gravel'], price: 0.1, revenue: 32, demand: { freight: ['ingots', 'steel'] }, affinity: 'tradehub' },
  community: { label: 'Community Centre', blurb: 'A hall for classes, clubs and markets. Wants books, furniture, bread and milk.', minLevel: 2, cost: 900, goods: ['books', 'furniture', 'bread', 'milk'], price: 0.06, revenue: 22, demand: { market: ['books'] } },
  amphitheatre: { label: 'Amphitheatre', blurb: 'Open-air stage and tiered seating. Timber, cloth and paper for the shows.', minLevel: 3, cost: 2600, goods: ['lumber', 'cloth', 'clothes', 'paper'], price: 0.08, revenue: 50, affinity: 'boulevard' },
  stadium: { label: 'Football Stadium', blurb: 'Game day fills the town. Wants bread, cheese, milk, clothes and coffee for the crowd.', minLevel: 4, cost: 6500, goods: ['bread', 'cheese', 'milk', 'clothes', 'coffee'], price: 0.08, revenue: 120 },
  ballpark: { label: 'Baseball Park', blurb: 'Summer evenings and a full house. Wants bread, fruit, paper, clothes and coffee.', minLevel: 4, cost: 6000, goods: ['bread', 'fruit', 'paper', 'clothes', 'coffee'], price: 0.08, revenue: 110 },
  arena: { label: 'Hockey Arena', blurb: 'An indoor arena on ice. Wants milk, cheese, clothes, steel and coffee.', minLevel: 4, cost: 5500, goods: ['milk', 'cheese', 'clothes', 'steel', 'coffee'], price: 0.08, revenue: 100 },
  resort: { label: 'Beach Resort', blurb: 'Pool, palms and a long list of guests. Pays well for mangoes and coffee. Income grows with the variety the town offers.', minLevel: 3, cost: 3600, goods: ['mango', 'coffee', 'fruit', 'furniture', 'cloth'], price: 0.1, revenue: 58, effect: 'visitors', affinity: 'boulevard' },
  university: { label: 'University', blurb: 'Educated townsfolk. Everything the town buys makes it grow faster.', minLevel: 4, cost: 4500, goods: ['books', 'paper', 'machinery'], price: 0.06, revenue: 0, effect: 'growth' },
  foundry: { label: 'Foundry Row', blurb: 'Casting yards that buy iron and steel in bulk. The Forge only.', minLevel: 3, cost: 3200, goods: ['ingots', 'steel', 'tools', 'slag'], price: 0.15, revenue: 60, demand: { freight: ['ingots', 'steel'] }, path: 'forge' },
  hotels: { label: 'Hotels and Promenade', blurb: 'Visitors pay by how much variety the town offers.', minLevel: 4, cost: 4000, goods: [], price: 0, revenue: 80, effect: 'visitors', affinity: 'boulevard' },
  foodhall: { label: 'Grand Food Hall', blurb: 'The pride of the Breadbasket. Every food good sells at a premium.', minLevel: 5, cost: 18000, goods: ['bread', 'cheese', 'jam', 'flour', 'fruit', 'milk'], price: 0.15, revenue: 160, path: 'breadbasket', capstone: true },
  heavyexchange: { label: 'Heavy Industry Exchange', blurb: 'Where the Forge sets the price of steel and machinery.', minLevel: 5, cost: 24000, goods: ['steel', 'machinery', 'tools', 'ingots'], price: 0.15, revenue: 180, demand: { market: ['steel'] }, path: 'forge', capstone: true },
  intlterminal: { label: 'International Terminal', blurb: 'Cargo from everywhere passes through. Every good pays a little more.', minLevel: 5, cost: 30000, goods: [], price: 0, revenue: 200, effect: 'storage', path: 'tradehub', capstone: true },
  grandplaza: { label: 'Grand Plaza', blurb: 'Theatre, galleries and a skyline. Fine goods pay a premium.', minLevel: 5, cost: 22000, goods: ['clothes', 'furniture', 'books', 'glass', 'cloth'], price: 0.15, revenue: 170, effect: 'visitors', path: 'boulevard', capstone: true },
};

export const DISTRICT_ORDER: DistrictId[] = Object.keys(DISTRICTS) as DistrictId[];

/** What a quest asks for. Each kind is measured straight from the world. */
export type QuestGoal =
  | { kind: 'build'; site: SiteKind; count: number }
  | { kind: 'route'; mode: RouteMode; grade?: RoadGrade; count: number }
  /** Rail Yards built (and old hubs that were given a rail depot). */
  | { kind: 'depot'; count: number }
  | { kind: 'vehicle'; vehicle: VehicleKind; count: number }
  /** Vehicles owned, of any class. */
  | { kind: 'fleet'; count: number }
  /** Processing buildings switched on. */
  | { kind: 'making'; count: number }
  /** Buildings with a sale switched on to someone. */
  | { kind: 'selling'; count: number }
  /** Units of one good sold to towns. */
  | { kind: 'deliver'; good: Good; amount: number }
  /** Different goods sold to towns. */
  | { kind: 'variety'; count: number }
  /** Units of one good made by your buildings. */
  | { kind: 'make'; good: Good; amount: number }
  /** Money earned from sales, in total. */
  | { kind: 'earn'; amount: number }
  /** Towns at or above a level. */
  | { kind: 'town'; level: number; count: number }
  /** Buildings at or above a level. */
  | { kind: 'upgrade'; level: number; count: number }
  /** Districts built, at or above a level (counted across all towns). */
  | { kind: 'district'; level: number; count: number }
  /** Towns that have picked a specialisation path. */
  | { kind: 'path'; count: number }
  /** Different paths in use across your towns. */
  | { kind: 'paths'; count: number }
  /** Capstone districts built. */
  | { kind: 'capstone'; count: number }
  /** A town on this path at or above a level. */
  | { kind: 'pathtown'; path: PathId; level: number }
  /** Units of the path's own goods sold to towns on that path. */
  | { kind: 'pathgoods'; path: PathId; amount: number }
  /** Districts built in towns on this path. */
  | { kind: 'pathdistricts'; path: PathId; count: number }
  /** The path's capstone district built. */
  | { kind: 'pathcapstone'; path: PathId };

export interface Quest {
  id: string;
  label: string;
  /** How to go about it, in a line. */
  hint: string;
  goal: QuestGoal;
  /** Cash paid when it is done. */
  reward: number;
}

/** Each path has its own short ladder. Finish it for cash, and the path is mastered: its towns pay 10% more for its goods. */
export const PATH_MASTERY_BONUS = 0.1;
export const PATH_QUESTS: Record<PathId, Quest[]> = {
  breadbasket: [
    { id: 'p-bread-town', label: 'Grow a Breadbasket town to level 4', hint: 'Feed it grain, flour, bread and cheese.', goal: { kind: 'pathtown', path: 'breadbasket', level: 4 }, reward: 4000 },
    { id: 'p-bread-goods', label: 'Sell 600 food to Breadbasket towns', hint: 'Grain, milk, flour, bread, cheese and jam all count.', goal: { kind: 'pathgoods', path: 'breadbasket', amount: 600 }, reward: 5000 },
    { id: 'p-bread-districts', label: 'Build 3 districts in Breadbasket towns', hint: 'Open Manage town. Food districts are 50% stronger here.', goal: { kind: 'pathdistricts', path: 'breadbasket', count: 3 }, reward: 6000 },
    { id: 'p-bread-cap', label: 'Build the Grand Food Hall', hint: 'A level 5 Breadbasket town can build it.', goal: { kind: 'pathcapstone', path: 'breadbasket' }, reward: 20000 },
  ],
  forge: [
    { id: 'p-forge-town', label: 'Grow a Forge town to level 4', hint: 'Metal and building goods keep it growing.', goal: { kind: 'pathtown', path: 'forge', level: 4 }, reward: 4000 },
    { id: 'p-forge-goods', label: 'Sell 400 metal and building goods to Forge towns', hint: 'Ore, coal, ingots, steel, tools, bricks and cement all count.', goal: { kind: 'pathgoods', path: 'forge', amount: 400 }, reward: 5000 },
    { id: 'p-forge-districts', label: 'Build 3 districts in Forge towns', hint: 'Open Manage town. Construction districts are 50% stronger here.', goal: { kind: 'pathdistricts', path: 'forge', count: 3 }, reward: 6000 },
    { id: 'p-forge-cap', label: 'Build the Heavy Industry Exchange', hint: 'A level 5 Forge town can build it.', goal: { kind: 'pathcapstone', path: 'forge' }, reward: 20000 },
  ],
  tradehub: [
    { id: 'p-trade-town', label: 'Grow a Trade Hub town to level 4', hint: 'Any goods help; the more kinds the better.', goal: { kind: 'pathtown', path: 'tradehub', level: 4 }, reward: 4000 },
    { id: 'p-trade-goods', label: 'Sell 800 goods to Trade Hub towns', hint: 'Every kind of good counts here.', goal: { kind: 'pathgoods', path: 'tradehub', amount: 800 }, reward: 5000 },
    { id: 'p-trade-districts', label: 'Build 3 districts in Trade Hub towns', hint: 'Open Manage town. Storage districts are stronger here.', goal: { kind: 'pathdistricts', path: 'tradehub', count: 3 }, reward: 6000 },
    { id: 'p-trade-cap', label: 'Build the International Terminal', hint: 'A level 5 Trade Hub town can build it.', goal: { kind: 'pathcapstone', path: 'tradehub' }, reward: 20000 },
  ],
  boulevard: [
    { id: 'p-boul-town', label: 'Grow a Boulevard town to level 4', hint: 'Furniture, clothes, books and glass keep it growing.', goal: { kind: 'pathtown', path: 'boulevard', level: 4 }, reward: 4000 },
    { id: 'p-boul-goods', label: 'Sell 300 fine goods to Boulevard towns', hint: 'Cloth, clothes, furniture, books and glass all count.', goal: { kind: 'pathgoods', path: 'boulevard', amount: 300 }, reward: 5000 },
    { id: 'p-boul-districts', label: 'Build 3 districts in Boulevard towns', hint: 'Open Manage town. Culture districts are stronger here.', goal: { kind: 'pathdistricts', path: 'boulevard', count: 3 }, reward: 6000 },
    { id: 'p-boul-cap', label: 'Build the Grand Plaza', hint: 'A level 5 Boulevard town can build it.', goal: { kind: 'pathcapstone', path: 'boulevard' }, reward: 20000 },
  ],
};

export interface TierDef {
  tier: number;
  name: string;
  blurb: string;
  /** Finishing all of these unlocks the next tier. The last tier's quests are the end game. */
  quests: Quest[];
}

/** TIERS[n] is what the player works on while at tier n. */
export const TIERS: TierDef[] = [
  {
    tier: 0,
    name: 'Startup',
    blurb: 'One camp, one mill, one town. Show that you can get goods to market.',
    quests: [
      { id: 't0-camp', label: 'Build a Forestry Camp', hint: 'Open Production, pick Forestry Camp, then click a ringed forest spot. (A Farm works the same way, with a Flour Mill in place of the Sawmill.)', goal: { kind: 'build', site: 'forestry', count: 1 }, reward: 100 },
      { id: 't0-truck', label: 'Buy a delivery truck', hint: 'Click the camp and press Buy Box Truck. It waits at the gate until a road leads somewhere that wants logs.', goal: { kind: 'fleet', count: 1 }, reward: 100 },
      { id: 't0-mill', label: 'Build a Sawmill in a town', hint: 'Open Processing, pick Sawmill, then click a for-sale lot beside a town street.', goal: { kind: 'build', site: 'sawmill', count: 1 }, reward: 150 },
      { id: 't0-road', label: 'Join them with a road', hint: 'Open Logistics, pick Road, then drag from the camp to the mill. The truck sets off by itself.', goal: { kind: 'route', mode: 'road', count: 1 }, reward: 150 },
      { id: 't0-making', label: 'Switch the Sawmill on', hint: 'Click the Sawmill and turn on Lumber under Production. Nothing is made until you do.', goal: { kind: 'making', count: 1 }, reward: 100 },
      { id: 't0-selling', label: 'Sell lumber to the Market', hint: 'Click the Sawmill, buy a truck, and switch the Market on under Sell to. The street already links them.', goal: { kind: 'selling', count: 1 }, reward: 150 },
      { id: 't0-sell', label: 'Sell 100 lumber', hint: 'Lumber sells as the truck brings it. Add a second truck if it piles up.', goal: { kind: 'deliver', good: 'lumber', amount: 100 }, reward: 500 },
    ],
  },
  {
    tier: 1,
    name: 'Regional Supplier',
    blurb: 'The town is growing and wants more than planks. Widen the range and move it faster.',
    quests: [
      { id: 't1-variety', label: 'Sell 3 different goods', hint: 'Try grain into flour and bread, or milk into cheese. Towns need variety to grow.', goal: { kind: 'variety', count: 3 }, reward: 600 },
      { id: 't1-upgrade', label: 'Upgrade a building to level 2', hint: 'Click a building, then Upgrade. It works faster and holds more.', goal: { kind: 'upgrade', level: 2, count: 1 }, reward: 300 },
      { id: 't1-hub', label: 'Build a Warehouse', hint: 'Logistics tab. When your supply lines fill up, a Warehouse takes the overflow and holds it. Switch on what it sells to under Sell to.', goal: { kind: 'build', site: 'hub', count: 1 }, reward: 400 },
      { id: 't1-highway', label: 'Build a highway', hint: 'Logistics tab, Highway. Trucks cover it about a third faster.', goal: { kind: 'route', mode: 'road', grade: 'highway', count: 1 }, reward: 500 },
      { id: 't1-district', label: 'Build a town district', hint: 'Select a town, open Manage town, and build a district such as the Farmers Market. Districts give a town a way to earn and a taste for more goods.', goal: { kind: 'district', level: 1, count: 1 }, reward: 500 },
      { id: 't1-bigtruck', label: 'Upgrade to a Big Box Truck', hint: 'Select a building with a truck. Press Upgrade on that truck in its Vehicles list. A bigger truck carries twice the load.', goal: { kind: 'vehicle', vehicle: 'bigtruck', count: 1 }, reward: 500 },
      { id: 't1-town', label: 'Grow a town to level 4', hint: 'A level 4 town is a City. It needs three kinds of goods and steady supply. The Towns sheet shows what it wants.', goal: { kind: 'town', level: 4, count: 1 }, reward: 1500 },
    ],
  },
  {
    tier: 2,
    name: 'Industrial Group',
    blurb: 'Rail, metal and cloth. Bigger loads and longer chains.',
    quests: [
      { id: 't2-depot', label: 'Build a Rail Yard', hint: 'Logistics tab, Rail Yard. Place it at the edge of a town, then bring the town its goods by truck. Trains run from yard to yard.', goal: { kind: 'depot', count: 1 }, reward: 1000 },
      { id: 't2-port', label: 'Build a Port', hint: 'Logistics tab, Port. Put it on the coast, then bring goods to it by truck. Ships sail from port to port.', goal: { kind: 'build', site: 'port', count: 1 }, reward: 1500 },
      { id: 't2-rail', label: 'Lay a rail line', hint: 'Logistics tab, Rail. Run track to a Rail Yard, or between buildings out in the country, then buy a train. A freight train carries far more than a truck.', goal: { kind: 'route', mode: 'rail', count: 1 }, reward: 2000 },
      { id: 't2-ingots', label: 'Make 60 iron ingots', hint: 'Iron ore and coal from the hills go into a Smelter.', goal: { kind: 'make', good: 'ingots', amount: 60 }, reward: 2000 },
      { id: 't2-tools', label: 'Sell 60 tools', hint: 'A Toolworks turns ingots and lumber into tools.', goal: { kind: 'deliver', good: 'tools', amount: 60 }, reward: 2500 },
      { id: 't2-upgrade', label: 'Upgrade 2 buildings to level 3', hint: 'Level 3 more than triples what a building makes.', goal: { kind: 'upgrade', level: 3, count: 2 }, reward: 1500 },
      { id: 't2-path', label: 'Give a town a specialisation', hint: 'A Town (level 3) can commit to a path: Breadbasket, The Forge, Trade Hub or The Boulevard. Select the town and open Manage town.', goal: { kind: 'path', count: 1 }, reward: 3000 },
      { id: 't2-districts', label: 'Upgrade 2 districts to level 2', hint: 'Each district level needs the town one level higher. Open Manage town and upgrade.', goal: { kind: 'district', level: 2, count: 2 }, reward: 2500 },
      { id: 't2-rig', label: 'Run a Big Rig', hint: 'Select a building and upgrade a Big Box Truck to a Big Rig.', goal: { kind: 'vehicle', vehicle: 'rig', count: 1 }, reward: 1500 },
      { id: 't2-cities', label: 'Grow 3 towns to level 4', hint: 'Three Cities. Reach the other towns with highways and rail.', goal: { kind: 'town', level: 4, count: 3 }, reward: 5000 },
    ],
  },
  {
    tier: 3,
    name: 'Global Network',
    blurb: 'The top of the chain: steel, machinery and a metropolis.',
    quests: [
      { id: 't3-steel', label: 'Make 100 steel', hint: 'A Steelworks turns ingots and coal into steel.', goal: { kind: 'make', good: 'steel', amount: 100 }, reward: 5000 },
      { id: 't3-machinery', label: 'Sell 40 machinery', hint: 'Machine Works: steel and tools in, machinery out. Only the biggest towns buy it.', goal: { kind: 'deliver', good: 'machinery', amount: 40 }, reward: 10000 },
      { id: 't3-metropolis', label: 'Grow a town to level 5', hint: 'A Metropolis needs four kinds of goods and a lot of them.', goal: { kind: 'town', level: 5, count: 1 }, reward: 10000 },
      { id: 't3-air', label: 'Open an air route', hint: 'Logistics tab: build an Airport at each end, pick Air Route, then click one airport and the other. Buy a cargo plane at an airport.', goal: { kind: 'route', mode: 'air', count: 1 }, reward: 8000 },
      { id: 't3-capstone', label: 'Build a capstone district', hint: 'A Metropolis on a path can build its capstone: Grand Food Hall, Heavy Industry Exchange, International Terminal or Grand Plaza.', goal: { kind: 'capstone', count: 1 }, reward: 15000 },
      { id: 't3-sea', label: 'Open a sea route', hint: 'Build a Port on each coast, pick Sea Route in Logistics, then click one port and the other. Buy a cargo boat at a port. Islands grow coffee, mangoes and oil you cannot get anywhere else.', goal: { kind: 'route', mode: 'sea', count: 1 }, reward: 8000 },
      { id: 't3-fleet', label: 'Run a Truck Fleet', hint: 'Select a building and upgrade a Big Rig to a Truck Fleet.', goal: { kind: 'vehicle', vehicle: 'convoy', count: 1 }, reward: 8000 },
      { id: 't3-earn', label: 'Earn $250,000 in total', hint: 'High-value goods on fast, full vehicles.', goal: { kind: 'earn', amount: 250000 }, reward: 10000 },
    ],
  },
  {
    tier: 4,
    name: 'Legacy',
    blurb: 'The world is connected. Now make your towns great, each in its own way.',
    quests: [
      { id: 't4-paths', label: 'Run 3 different specialisations', hint: 'Breadbasket, The Forge, Trade Hub, The Boulevard: give three of your towns different paths.', goal: { kind: 'paths', count: 3 }, reward: 25000 },
      { id: 't4-jet', label: 'Fly a Cargo Jet', hint: 'Select an airport and upgrade a Cargo Plane to a Cargo Jet.', goal: { kind: 'vehicle', vehicle: 'jet', count: 1 }, reward: 30000 },
      { id: 't4-metropolises', label: 'Grow 3 towns to level 5', hint: 'Three Metropolises, each a different kind of city.', goal: { kind: 'town', level: 5, count: 3 }, reward: 50000 },
      { id: 't4-capstones', label: 'Build 3 capstone districts', hint: 'One in each of three towns.', goal: { kind: 'capstone', count: 3 }, reward: 60000 },
      { id: 't4-earn', label: 'Earn $1,000,000 in total', hint: 'The end game. Nothing stops you playing on.', goal: { kind: 'earn', amount: 1000000 }, reward: 100000 },
    ],
  },
];

/** The worlds a new game can start on: made maps, placed by hand. Random worlds are not offered; they remain for tests and development. */
export type WorldSizeId = 'map1' | 'map2' | 'small' | 'medium' | 'large';
export interface WorldSizeDef {
  id: WorldSizeId;
  label: string;
  width: number;
  height: number;
  blurb: string;
  /** A made map (src/maps), not a generated world. */
  made?: boolean;
}
export const WORLD_SIZES: WorldSizeDef[] = [
  { id: 'map1', label: 'Map 1: The Known World', width: 288, height: 124, made: true, blurb: 'A hand-made world map: continents, islands and seas, with coffee, mango and oil islands to ship from. A good place to start.' },
  { id: 'map2', label: 'Map 2: The Continental', width: 384, height: 128, made: true, blurb: 'A large hand-made world, about 46% water: four differently shaped continents and island chains, mountain ranges, a great river system to a gulf, lakes, about 55 towns and cities. Coffee, mangoes and some oil lie overseas, so docks and planes matter.' },
];
/** Generated worlds, for tests and development only (open the game with #seed=N). */
export const RANDOM_SIZES: WorldSizeDef[] = [
  { id: 'small', label: 'Small', width: 192, height: 64, blurb: 'A compact random world.' },
  { id: 'medium', label: 'Medium', width: 288, height: 96, blurb: 'A random world.' },
  { id: 'large', label: 'Large', width: 384, height: 128, blurb: 'A wide random world.' },
];
