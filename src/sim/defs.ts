// Static game data. Add goods, sites, vehicles and quests here; the sim reads them generically.

const GOOD_IDS = [
  // raw
  'logs', 'grain', 'cotton', 'stone', 'ore', 'coal', 'clay', 'sand', 'milk', 'fruit',
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
export type NodeKind = 'forest' | 'farmland' | 'quarry' | 'mine' | 'coal' | 'clay' | 'pasture' | 'orchard';
export type VehicleKind = 'boxtruck' | 'rig' | 'train' | 'plane';
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
  /** Raw producer: one unit of `good` every `every` ticks. */
  produce?: { good: Good; every: number };
  /** Processor: consumes inputs, makes outputs every `every` ticks. The first output is the main product. */
  recipe?: { inputs: Stock; outputs: Stock; every: number };
  /** Processing buildings go in a town's plots, as part of the town. */
  inTown?: boolean;
  /** Logistics hub: stores goods and passes them on. */
  hub?: boolean;
  /** Town selling point. Created by towns, never placed by the player. */
  dock?: 'market' | 'freight';
  /** Town rail station: trains unload here and the goods are sold on to the town's docks. */
  station?: boolean;
  /** Airport: a hub that planes fly between. */
  airport?: boolean;
}

const raw = (label: string, blurb: string, cost: number, tier: number, node: NodeKind, good: Good, every: number, color: number): SiteDef => ({
  label,
  blurb,
  category: 'production',
  cost,
  tier,
  cap: 60,
  node,
  color,
  produce: { good, every },
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
): SiteDef => ({ label, blurb, category, cost, tier, cap: 30, inTown: true, color, recipe: { inputs, outputs, every } });

const DEFS = {
  // Production: extraction on resource nodes
  forestry: raw('Forestry Camp', 'Fells timber on a forest node. Output: logs.', 80, 0, 'forest', 'logs', 20, 0x5f7f4a),
  farm: raw('Farm', 'Grows grain on farmland. Output: grain.', 90, 0, 'farmland', 'grain', 15, 0xc8a850),
  claypit: raw('Clay Pit', 'Digs clay on a clay node by the water. Output: clay.', 110, 0, 'clay', 'clay', 18, 0xb86f4a),
  ranch: raw('Dairy Ranch', 'Grazes cattle on pasture. Output: milk.', 130, 0, 'pasture', 'milk', 20, 0x8bb46a),
  orchard: raw('Orchard', 'Grows fruit on an orchard node. Output: fruit.', 120, 0, 'orchard', 'fruit', 22, 0xb0583f),
  quarry: raw('Quarry', 'Cuts stone from a pit at the foot of a mountain. Output: stone.', 160, 0, 'quarry', 'stone', 28, 0x8d9298),
  cottonfarm: raw('Cotton Farm', 'Grows cotton on farmland. Output: cotton.', 150, 1, 'farmland', 'cotton', 22, 0xe6e2d2),
  coalmine: raw('Coal Mine', 'Mines coal on a coal seam in the hills. Output: coal.', 200, 1, 'coal', 'coal', 24, 0x2b2d31),
  oremine: raw('Iron Mine', 'Mines iron ore on an ore deposit in the hills. Output: iron ore.', 220, 1, 'mine', 'ore', 26, 0x8a5a4a),
  sandpit: raw('Sand Pit', 'Digs sand on a clay node. Output: sand.', 140, 1, 'clay', 'sand', 16, 0xe0cd96),

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
  slagcrusher: proc('heavy', 'Slag Crusher', 'Turns slag into gravel and sand.', 500, 3, { slag: 2 }, { gravel: 1, sand: 1 }, 20, 0x58545a),
  machinery: proc('heavy', 'Machine Works', 'Steel and tools in, machinery out. The top of the chain.', 2200, 3, { steel: 2, tools: 1 }, { machinery: 1 }, 60, 0xd08a2e),

  // Logistics and town docks
  hub: {
    label: 'Distribution Hub',
    blurb: 'Stores goods. Pulls what you choose from suppliers and pushes it on to whoever needs it.',
    category: 'logistics',
    cost: 300,
    tier: 1,
    cap: 120,
    color: 0xd68a2e,
    hub: true,
  } as SiteDef,
  market: {
    label: 'Market',
    blurb: 'A town selling point for everyday goods.',
    category: null,
    cost: 0,
    tier: 0,
    cap: 30,
    color: 0xc0504d,
    dock: 'market',
  } as SiteDef,
  freight: {
    label: 'Freight Yard',
    blurb: 'A town selling point for raw and bulk goods.',
    category: null,
    cost: 0,
    tier: 0,
    cap: 30,
    color: 0x6d8fa8,
    dock: 'freight',
  } as SiteDef,
  station: {
    label: 'Rail Station',
    blurb: 'Where trains serve a town. Goods unloaded here are sold on to its Market and Freight Yard.',
    category: null,
    cost: 0,
    tier: 2,
    cap: 60,
    color: 0x8a7a5c,
    station: true,
  } as SiteDef,
  airport: {
    label: 'Airport',
    blurb: 'Stores goods like a hub, and cargo planes fly between airports over any terrain.',
    category: 'logistics',
    cost: 2500,
    tier: 3,
    cap: 120,
    color: 0x7f8d9a,
    hub: true,
    airport: true,
  } as SiteDef,
};

export type SiteKind = keyof typeof DEFS;
export const SITE_DEFS: Record<SiteKind, SiteDef> = DEFS;

/** Every building the player can place, in menu order. */
export const BUILD_ORDER: SiteKind[] = (Object.keys(DEFS) as SiteKind[]).filter((k) => !DEFS[k].dock && !DEFS[k].station);

/** Plots a town has open for the player, by town level. Plots 0 and 1 belong to the Market and Freight Yard. */
export const INDUSTRY_PLOTS = [10, 10, 10, 10, 10];

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
  mode: 'road' | 'rail' | 'air';
  cost: number;
  tier: number;
  capacity: number;
  ticksPerTile: number;
  /** False for vehicles that are designed but whose routes are not built yet. */
  implemented: boolean;
}

export const VEHICLE_DEFS: Record<VehicleKind, VehicleDef> = {
  boxtruck: { label: 'Box Truck', blurb: 'Small, cheap, good for short hauls.', mode: 'road', cost: 120, tier: 0, capacity: 8, ticksPerTile: 4, implemented: true },
  rig: { label: 'Big Rig', blurb: 'Large trailer, faster on the highway.', mode: 'road', cost: 480, tier: 1, capacity: 36, ticksPerTile: 3, implemented: true },
  train: { label: 'Freight Train', blurb: 'Huge capacity on its own track. Rails cross roads at level crossings.', mode: 'rail', cost: 1800, tier: 2, capacity: 140, ticksPerTile: 2, implemented: true },
  plane: { label: 'Cargo Plane', blurb: 'Fast, crosses any terrain. Flies between airports.', mode: 'air', cost: 7000, tier: 3, capacity: 40, ticksPerTile: 2, implemented: true },
};

export const VEHICLE_ORDER: VehicleKind[] = ['boxtruck', 'rig', 'train', 'plane'];

/** Building levels: output speed and storage multipliers for level 1, 2, 3. */
export const LEVEL_SPEED = [1, 1.8, 3.2];
export const LEVEL_CAP = [1, 2, 4];
export const MAX_LEVEL = 3;
export const UPGRADE_COST_FACTOR = 1.2;

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
export type RouteMode = 'road' | 'rail' | 'air';
export const RAIL_COST_FACTOR = 1.8;
export const RAIL_TIER = 2;
/** Air routes link two airports in a straight line. */
export const AIR_TIER = 3;
export const AIR_COST_PER_TILE = 4;
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
  { name: 'Village', pop: 400, growth: 750 },
  { name: 'Town', pop: 2200, growth: 3600 },
  { name: 'City', pop: 11000, growth: 13500 },
  { name: 'Metropolis', pop: 60000, growth: 45000 },
];

/** Goods the Market wants at each town level. */
export const MARKET_DEMAND: Good[][] = [
  ['flour', 'bread', 'lumber', 'cheese'],
  ['flour', 'bread', 'lumber', 'cheese', 'paper', 'pellets', 'jam'],
  ['flour', 'bread', 'lumber', 'cheese', 'paper', 'pellets', 'jam', 'furniture', 'clothes', 'tools', 'glass'],
  ['flour', 'bread', 'lumber', 'cheese', 'paper', 'pellets', 'jam', 'furniture', 'clothes', 'tools', 'glass', 'books', 'bricks', 'concrete', 'blocks'],
  ['flour', 'bread', 'lumber', 'cheese', 'paper', 'pellets', 'jam', 'furniture', 'clothes', 'tools', 'glass', 'books', 'bricks', 'concrete', 'blocks', 'machinery'],
];
const FREIGHT_BASE: Good[] = ['logs', 'grain', 'cotton', 'stone', 'ore', 'coal', 'clay', 'sand', 'milk', 'fruit', 'sawdust', 'bran', 'whey', 'gravel', 'slag', 'feed'];
/** Goods the Freight Yard wants by town level (it appears at level 2). Raw materials and by-products find a buyer here. */
export const FREIGHT_DEMAND: Good[][] = [
  [],
  FREIGHT_BASE,
  [...FREIGHT_BASE, 'ingots', 'cement', 'yarn'],
  [...FREIGHT_BASE, 'ingots', 'cement', 'yarn', 'steel'],
  [...FREIGHT_BASE, 'ingots', 'cement', 'yarn', 'steel'],
];

/** What a quest asks for. Each kind is measured straight from the world. */
export type QuestGoal =
  | { kind: 'build'; site: SiteKind; count: number }
  | { kind: 'route'; mode: RouteMode; grade?: RoadGrade; count: number }
  | { kind: 'vehicle'; vehicle: VehicleKind; count: number }
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
  | { kind: 'upgrade'; level: number; count: number };

export interface Quest {
  id: string;
  label: string;
  /** How to go about it, in a line. */
  hint: string;
  goal: QuestGoal;
  /** Cash paid when it is done. */
  reward: number;
}

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
      { id: 't0-camp', label: 'Build a Forestry Camp', hint: 'Open Production, pick Forestry Camp, then click a ringed forest spot.', goal: { kind: 'build', site: 'forestry', count: 1 }, reward: 100 },
      { id: 't0-mill', label: 'Build a Sawmill in a town', hint: 'Open Processing, pick Sawmill, then click a for-sale lot beside a town street.', goal: { kind: 'build', site: 'sawmill', count: 1 }, reward: 150 },
      { id: 't0-road', label: 'Join them with a road', hint: 'Open Logistics, pick Road, then drag from the camp to the mill. A truck comes with it.', goal: { kind: 'route', mode: 'road', count: 1 }, reward: 150 },
      { id: 't0-sell', label: 'Sell 100 lumber', hint: 'The mill is linked to the town Market by the street. Lumber sells as it arrives.', goal: { kind: 'deliver', good: 'lumber', amount: 100 }, reward: 500 },
    ],
  },
  {
    tier: 1,
    name: 'Regional Supplier',
    blurb: 'The town is growing and wants more than planks. Widen the range and move it faster.',
    quests: [
      { id: 't1-variety', label: 'Sell 3 different goods', hint: 'Try grain into flour and bread, or milk into cheese. Towns need variety to grow.', goal: { kind: 'variety', count: 3 }, reward: 600 },
      { id: 't1-upgrade', label: 'Upgrade a building to level 2', hint: 'Click a building, then Upgrade. It works faster and holds more.', goal: { kind: 'upgrade', level: 2, count: 1 }, reward: 300 },
      { id: 't1-hub', label: 'Build a Distribution Hub', hint: 'Logistics tab. A hub gathers goods from several sites and passes them on.', goal: { kind: 'build', site: 'hub', count: 1 }, reward: 400 },
      { id: 't1-highway', label: 'Build a highway', hint: 'Logistics tab, Highway. Trucks cover it about a third faster.', goal: { kind: 'route', mode: 'road', grade: 'highway', count: 1 }, reward: 500 },
      { id: 't1-town', label: 'Grow a town to level 4', hint: 'A level 4 town is a City. It needs three kinds of goods and steady supply. The Towns sheet shows what it wants.', goal: { kind: 'town', level: 4, count: 1 }, reward: 1500 },
    ],
  },
  {
    tier: 2,
    name: 'Industrial Group',
    blurb: 'Rail, metal and cloth. Bigger loads and longer chains.',
    quests: [
      { id: 't2-rail', label: 'Lay a rail line', hint: 'Logistics tab, Rail. A freight train carries far more than a truck. Every town now has a Rail Station on its edge.', goal: { kind: 'route', mode: 'rail', count: 1 }, reward: 2000 },
      { id: 't2-ingots', label: 'Make 60 iron ingots', hint: 'Iron ore and coal from the hills go into a Smelter.', goal: { kind: 'make', good: 'ingots', amount: 60 }, reward: 2000 },
      { id: 't2-tools', label: 'Sell 60 tools', hint: 'A Toolworks turns ingots and lumber into tools.', goal: { kind: 'deliver', good: 'tools', amount: 60 }, reward: 2500 },
      { id: 't2-upgrade', label: 'Upgrade 2 buildings to level 3', hint: 'Level 3 more than triples what a building makes.', goal: { kind: 'upgrade', level: 3, count: 2 }, reward: 1500 },
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
      { id: 't3-air', label: 'Open an air route', hint: 'Logistics tab: build an Airport at each end, pick Air Route, then click one airport and the other. A cargo plane comes with it.', goal: { kind: 'route', mode: 'air', count: 1 }, reward: 8000 },
      { id: 't3-earn', label: 'Earn $250,000 in total', hint: 'High-value goods on fast, full vehicles.', goal: { kind: 'earn', amount: 250000 }, reward: 10000 },
    ],
  },
];
