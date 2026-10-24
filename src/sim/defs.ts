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
  // made from by-products
  'mulch',
  // the sea: caught by the harbor's boats
  'fish', 'fishscraps', 'smokedfish', 'cannedfish',
  // the wider farm, kitchen and brewery chains
  'water', 'barley', 'hops', 'grapes', 'eggs', 'vegetables', 'potatoes', 'sugarbeet', 'sunflower', 'pork', 'wool', 'honey', 'salt', 'spices', 'cocoa', 'sugar', 'cookoil', 'fuel', 'granite', 'firewood', 'butter', 'juice', 'pastry', 'pizza', 'pasta', 'icecream', 'canned', 'crisps', 'meat', 'sausage', 'beer', 'wine', 'spirits', 'soda', 'chocolate', 'candles', 'pillows', 'straw', 'pulp', 'husks', 'feathers', 'wax', 'woodchips', 'spentgrain',
] as const;
export type Good = (typeof GOOD_IDS)[number];
export type Stock = Partial<Record<Good, number>>;
export type Terrain = 'water' | 'grass' | 'forest' | 'mountain' | 'ice';
export type NodeKind = 'forest' | 'farmland' | 'quarry' | 'mine' | 'coal' | 'clay' | 'pasture' | 'orchard' | 'coffee' | 'mango' | 'oil';
export type VehicleKind = 'fishboat' | 'boxtruck' | 'bigtruck' | 'rig' | 'convoy' | 'train' | 'heavytrain' | 'plane' | 'jet' | 'barge' | 'boat' | 'freighter' | 'containership';
export type Category = 'production' | 'processing' | 'manufacturing' | 'heavy' | 'logistics' | 'vehicles';

export const GOOD_LIST: Good[] = [...GOOD_IDS];

/**
 * Farmland, pasture and orchards are not places on the map: a farm, ranch or orchard brings its own fields, paddock or trees and can
 * stand on any open ground. Every other node (forest, quarry, mine, coal, clay, oil, coffee, mango) is a permanent spot on the map
 * and the site that works it must stand on it.
 */
export const SOFT_NODES: NodeKind[] = ['farmland', 'pasture', 'orchard'];
export const isSoftNode = (kind: NodeKind): boolean => SOFT_NODES.includes(kind);

export const START_MONEY = 6000;
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
  mulch: { label: 'Mulch', price: 6, color: 0x6b4a2e, kind: 'product' },
  fish: { label: 'Fish', price: 6, color: 0x7aa8c0, kind: 'raw' },
  fishscraps: { label: 'Fish Scraps', price: 1, color: 0xa8b0b8, kind: 'byproduct' },
  smokedfish: { label: 'Smoked Fish', price: 15, color: 0xc08848, kind: 'product' },
  cannedfish: { label: 'Canned Fish', price: 12, color: 0x8aa0b8, kind: 'product' },
  water: { label: 'Water', price: 1, color: 0x5aa0d8, kind: 'raw' },
  barley: { label: 'Barley', price: 3, color: 0xd8c070, kind: 'raw' },
  hops: { label: 'Hops', price: 6, color: 0x8ab04a, kind: 'raw' },
  grapes: { label: 'Grapes', price: 5, color: 0x6a3a7a, kind: 'raw' },
  eggs: { label: 'Eggs', price: 4, color: 0xf0e6c8, kind: 'raw' },
  vegetables: { label: 'Vegetables', price: 3, color: 0x5a9a3a, kind: 'raw' },
  potatoes: { label: 'Potatoes', price: 3, color: 0xb89a60, kind: 'raw' },
  sugarbeet: { label: 'Sugar Beet', price: 3, color: 0xc8b0a0, kind: 'raw' },
  sunflower: { label: 'Sunflower Seeds', price: 3, color: 0xe0b020, kind: 'raw' },
  pork: { label: 'Pork', price: 8, color: 0xd88a8a, kind: 'raw' },
  wool: { label: 'Wool', price: 6, color: 0xe8e0d0, kind: 'raw' },
  honey: { label: 'Honey', price: 9, color: 0xe0a030, kind: 'raw' },
  salt: { label: 'Salt', price: 4, color: 0xe8e8ee, kind: 'raw' },
  spices: { label: 'Spices', price: 14, color: 0xb8502a, kind: 'raw' },
  cocoa: { label: 'Cocoa', price: 15, color: 0x5a3420, kind: 'raw' },
  sugar: { label: 'Sugar', price: 8, color: 0xf4f0f0, kind: 'material' },
  cookoil: { label: 'Cooking Oil', price: 13, color: 0xe8c840, kind: 'material' },
  fuel: { label: 'Fuel', price: 45, color: 0xc04a2a, kind: 'material' },
  granite: { label: 'Granite', price: 14, color: 0x9a8f94, kind: 'material' },
  firewood: { label: 'Firewood', price: 5, color: 0x8a5a33, kind: 'product' },
  butter: { label: 'Butter', price: 14, color: 0xf0d870, kind: 'product' },
  juice: { label: 'Juice', price: 8, color: 0xe89030, kind: 'product' },
  pastry: { label: 'Pastry', price: 14, color: 0xd8a060, kind: 'product' },
  pizza: { label: 'Pizza', price: 24, color: 0xd86a3a, kind: 'product' },
  pasta: { label: 'Pasta', price: 11, color: 0xe8d090, kind: 'product' },
  icecream: { label: 'Ice Cream', price: 22, color: 0xf0d0d8, kind: 'product' },
  canned: { label: 'Canned Food', price: 16, color: 0xa0a8a0, kind: 'product' },
  crisps: { label: 'Crisps', price: 14, color: 0xe0b840, kind: 'product' },
  meat: { label: 'Meat', price: 28, color: 0xc05050, kind: 'product' },
  sausage: { label: 'Sausage', price: 34, color: 0xa04838, kind: 'product' },
  beer: { label: 'Beer', price: 12, color: 0xd8a020, kind: 'product' },
  wine: { label: 'Wine', price: 28, color: 0x7a2038, kind: 'product' },
  spirits: { label: 'Spirits', price: 24, color: 0xc8a870, kind: 'product' },
  soda: { label: 'Soft Drink', price: 5, color: 0x48a8c8, kind: 'product' },
  chocolate: { label: 'Chocolate', price: 36, color: 0x4a2a1a, kind: 'product' },
  candles: { label: 'Candles', price: 10, color: 0xf0e0b0, kind: 'product' },
  pillows: { label: 'Pillows', price: 24, color: 0xe0d8f0, kind: 'product' },
  straw: { label: 'Straw', price: 1, color: 0xd8c880, kind: 'byproduct' },
  pulp: { label: 'Pulp', price: 1, color: 0xc0a870, kind: 'byproduct' },
  husks: { label: 'Husks', price: 1, color: 0xb8a060, kind: 'byproduct' },
  feathers: { label: 'Feathers', price: 2, color: 0xf0f0f0, kind: 'byproduct' },
  wax: { label: 'Wax', price: 4, color: 0xe8d890, kind: 'byproduct' },
  woodchips: { label: 'Wood Chips', price: 1, color: 0xb08850, kind: 'byproduct' },
  spentgrain: { label: 'Spent Grain', price: 1, color: 0xa8905a, kind: 'byproduct' },
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
  /** Mechanic Shop: trucks that wear out go here, and come back repaired. */
  garage?: boolean;
  /** Recycling Yard: takes any by-product, a few units a minute, for a few cents each, so no by-product can ever jam a chain. */
  recycle?: boolean;
  /** Fishing Harbor: a raw site on the coast that fishing boats work for. */
  harbor?: boolean;
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
  forestry: raw('Forestry Camp', 'Fells timber on a forest node. Makes logs, sawdust and wood chips.', 80, 0, 'forest', 'logs', 20, 0x5f7f4a, ['sawdust', 'woodchips']),
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
  // Sand lies about on open ground, so a Sand Pit needs no node and never competes with a Clay Pit for the one clay bank.
  sandpit: { ...raw('Sand Pit', 'Digs sand on open ground. Makes sand and gravel.', 140, 1, 'clay', 'sand', 16, 0xe0cd96, ['gravel']), node: undefined } as SiteDef,

  // Processing
  sawmill: proc('processing', 'Sawmill', 'Logs in, lumber out. Sawdust is the by-product.', 220, 0, { logs: 2 }, { lumber: 1, sawdust: 1 }, 20, 0xb48650),
  mill: proc('processing', 'Flour Mill', 'Grain in, flour out. Bran is the by-product.', 220, 0, { grain: 2 }, { flour: 1, bran: 1 }, 20, 0xd8d2bf),
  bakery: proc('processing', 'Bakery', 'Flour in, bread out. Towns love bread.', 260, 0, { flour: 1 }, { bread: 2 }, 18, 0xc98c4a),
  dairy: proc('processing', 'Dairy', 'Milk in, cheese out. Whey is the by-product.', 280, 0, { milk: 2 }, { cheese: 1, whey: 1 }, 22, 0xe8c04a),
  jamfactory: proc('processing', 'Jam Factory', 'Fruit and sugar in, jam out.', 300, 1, { fruit: 2, sugar: 1 }, { jam: 3 }, 20, 0x9a2f4a),
  feedmill: proc('processing', 'Feed Mill', 'Bran and whey in, animal feed out. Puts two by-products to work.', 300, 1, { bran: 2, whey: 1 }, { feed: 2 }, 20, 0xb7a35a),
  gardensupply: proc('processing', 'Garden Supply', 'Sawdust and bran in, mulch out. A second life for two by-products.', 320, 1, { sawdust: 2, bran: 1 }, { mulch: 2 }, 20, 0x7a8a4a),
  scrapyard: {
    label: 'Recycling Yard',
    blurb: 'Takes any by-product, a few units a minute, for a few cents each. Nothing can jam a chain when it has a Recycling Yard to go to.',
    category: 'processing',
    cost: 150,
    tier: 0,
    cap: 120,
    inTown: true,
    color: 0x7d8a6a,
    recycle: true,
  } as SiteDef,
  // ---- the wider farm: crops, animals and the ingredients for the kitchen and the brewery ----
  waterpump: { ...raw('Water Pump', 'Pumps clean water by the shore. Breweries, canneries and ice cream plants need it, and trucks carry it in.', 100, 0, 'clay', 'water', 8, 0x5aa0d8), node: undefined } as SiteDef,
  chickenfarm: raw('Chicken Farm', 'Hens on pasture. Makes eggs and feathers.', 110, 0, 'pasture', 'eggs', 14, 0xe6c85a, ['feathers']),
  vegfarm: raw('Vegetable Farm', 'Market-garden rows on farmland. Makes vegetables.', 100, 0, 'farmland', 'vegetables', 14, 0x5a9a3a),
  potatofarm: raw('Potato Farm', 'Deep furrows on farmland. Makes potatoes.', 110, 1, 'farmland', 'potatoes', 15, 0xb89a60),
  barleyfarm: raw('Barley Farm', 'Golden barley on farmland. Makes barley and straw.', 130, 1, 'farmland', 'barley', 16, 0xd8c070, ['straw']),
  hopfarm: raw('Hop Farm', 'Tall hop vines on poles. Makes hops, the beer flavour.', 150, 1, 'farmland', 'hops', 24, 0x8ab04a),
  sugarfarm: raw('Sugar Beet Farm', 'Beet fields on farmland. Makes sugar beet and pulp.', 130, 1, 'farmland', 'sugarbeet', 16, 0xc8b0a0, ['pulp']),
  oilseedfarm: raw('Sunflower Farm', 'Bright sunflower fields. Makes seeds for cooking oil, and husks.', 130, 1, 'farmland', 'sunflower', 18, 0xe0b020, ['husks']),
  pigfarm: raw('Pig Farm', 'Pigs on pasture. Makes pork.', 160, 1, 'pasture', 'pork', 26, 0xd88a8a),
  sheepfarm: raw('Sheep Farm', 'Sheep on pasture. Makes wool.', 140, 1, 'pasture', 'wool', 22, 0xe8e0d0),
  apiary: raw('Apiary', 'Hives among the orchard blossom. Makes honey and wax.', 140, 1, 'orchard', 'honey', 28, 0xe0a030, ['wax']),
  vineyard: raw('Vineyard', 'Rows of vines on the orchard slopes. Makes grapes.', 170, 1, 'orchard', 'grapes', 22, 0x6a3a7a),
  saltpan: { ...raw('Salt Pan', 'Seawater dried in shallow pans by the shore. Makes salt.', 120, 1, 'clay', 'salt', 18, 0xe8e8ee), node: undefined } as SiteDef,
  spicefarm: raw('Spice Plantation', 'Island spices in the heat. Makes spices. Islands only, so they have to come by ship.', 320, 2, 'mango', 'spices', 28, 0xb8502a),
  cocoafarm: raw('Cocoa Plantation', 'Cocoa pods under shade trees on an island highland. Makes cocoa. Islands only, so it has to come by ship.', 360, 2, 'coffee', 'cocoa', 28, 0x5a3420),

  harbor: { ...raw('Fishing Harbor', 'A quay on the coast. Its fishing boats go out and come back on their own, and fill the harbor with fish. Trucks carry the fish to where it is needed.', 500, 1, 'clay', 'fish', 20, 0x3a7aa8, ['fishscraps']), node: undefined, harbor: true } as SiteDef,
  smokehouse: proc('processing', 'Smokehouse', 'Fish, salt and firewood in, smoked fish out.', 420, 1, { fish: 2, salt: 1, firewood: 1 }, { smokedfish: 2 }, 24, 0xc08848),
  fishcannery: proc('processing', 'Fish Cannery', 'Fish, salt and water in, canned fish out.', 400, 1, { fish: 2, salt: 1, water: 1 }, { cannedfish: 2 }, 22, 0x8aa0b8),
  fishmeal: proc('processing', 'Fish Meal Plant', 'Fish scraps and spent grain in, animal feed out. Two leftovers put to work.', 340, 1, { fishscraps: 3, spentgrain: 1 }, { feed: 2 }, 22, 0xa8b0b8),
  woodyard: proc('processing', 'Wood Yard', 'Logs in, firewood out. Wood chips are the by-product.', 200, 0, { logs: 2 }, { firewood: 2, woodchips: 1 }, 18, 0x8a5a33),
  creamery: proc('processing', 'Creamery', 'Milk in, butter out. Whey is the by-product.', 300, 1, { milk: 2 }, { butter: 1, whey: 1 }, 22, 0xf0d870),
  juicepress: proc('processing', 'Juice Press', 'Fruit in, juice out. Pulp is the by-product.', 280, 1, { fruit: 2 }, { juice: 2, pulp: 1 }, 20, 0xe89030),
  sugarrefinery: proc('processing', 'Sugar Refinery', 'Sugar beet in, sugar out. Pulp is the by-product.', 380, 1, { sugarbeet: 3 }, { sugar: 2, pulp: 1 }, 22, 0xf4f0f0),
  oilpress: proc('processing', 'Oil Press', 'Sunflower seeds in, cooking oil out. Husks are the by-product.', 400, 1, { sunflower: 2 }, { cookoil: 1, husks: 1 }, 20, 0xe8c840),
  pastrykitchen: proc('processing', 'Pastry Kitchen', 'Flour, eggs and sugar in, pastries out.', 420, 1, { flour: 1, eggs: 1, sugar: 1 }, { pastry: 2 }, 20, 0xd8a060),
  noodlemaker: proc('processing', 'Noodle Maker', 'Flour and eggs in, pasta out.', 380, 1, { flour: 1, eggs: 1 }, { pasta: 2 }, 20, 0xe8d090),
  pizzeria: proc('processing', 'Pizzeria', 'Flour, cheese and vegetables in, pizza out.', 460, 1, { flour: 1, cheese: 1, vegetables: 1 }, { pizza: 2 }, 24, 0xd86a3a),
  cannery: proc('processing', 'Cannery', 'Vegetables and salt in, canned food out.', 360, 1, { vegetables: 2, salt: 1 }, { canned: 1 }, 22, 0xa0a8a0),
  butcher: proc('processing', 'Butcher', 'Pork in, meat out.', 450, 1, { pork: 2 }, { meat: 1 }, 26, 0xc05050),
  brewery: proc('processing', 'Brewery', 'Barley, hops and water in, beer out. Spent grain is the by-product.', 600, 1, { barley: 2, hops: 1, water: 2 }, { beer: 2, spentgrain: 1 }, 26, 0xd8a020),
  sodaplant: proc('processing', 'Soft Drink Plant', 'Sugar and water in, soft drinks out.', 380, 1, { sugar: 1, water: 2 }, { soda: 3 }, 20, 0x48a8c8),
  woolmill: proc('processing', 'Wool Mill', 'Wool in, yarn out.', 380, 1, { wool: 3 }, { yarn: 2 }, 24, 0xe8e0d0),
  compostyard: proc('processing', 'Compost Yard', 'Wood chips, pulp and straw in, mulch out. Three leftovers put to work.', 300, 1, { woodchips: 2, pulp: 1, straw: 1 }, { mulch: 3 }, 22, 0x6b4a2e),
  silage: proc('processing', 'Silage Plant', 'Straw, husks and spent grain in, animal feed out. Three leftovers put to work.', 300, 1, { straw: 1, husks: 1, spentgrain: 1 }, { feed: 2 }, 22, 0xb7a35a),
  winery: proc('manufacturing', 'Winery', 'Grapes and water in, wine out. Pulp is the by-product.', 650, 2, { grapes: 3, water: 1 }, { wine: 1, pulp: 1 }, 30, 0x7a2038),
  distillery: proc('manufacturing', 'Distillery', 'Barley and water in, spirits out. Spent grain is the by-product.', 750, 2, { barley: 3, water: 2 }, { spirits: 1, spentgrain: 1 }, 34, 0xc8a870),
  icecreamplant: proc('manufacturing', 'Ice Cream Plant', 'Milk and sugar in, ice cream out.', 600, 2, { milk: 2, sugar: 1 }, { icecream: 1 }, 26, 0xf0d0d8),
  crispfryer: proc('manufacturing', 'Crisp Fryer', 'Potatoes, cooking oil and salt in, crisps out.', 520, 2, { potatoes: 2, cookoil: 1, salt: 1 }, { crisps: 2 }, 22, 0xe0b840),
  sausagemaker: proc('manufacturing', 'Sausage Maker', 'Pork, salt and spices in, sausage out.', 600, 2, { pork: 1, salt: 1, spices: 1 }, { sausage: 1 }, 28, 0xa04838),
  chocolatier: proc('manufacturing', 'Chocolate Maker', 'Cocoa, sugar and milk in, chocolate out.', 700, 2, { cocoa: 1, sugar: 1, milk: 1 }, { chocolate: 1 }, 30, 0x4a2a1a),
  candlemaker: proc('manufacturing', 'Candle Maker', 'Wax and cotton in, candles out.', 500, 2, { wax: 2, cotton: 1 }, { candles: 2 }, 22, 0xf0e0b0),
  pillowmaker: proc('manufacturing', 'Pillow Maker', 'Feathers and cotton in, pillows out.', 450, 2, { feathers: 4, cotton: 2 }, { pillows: 1 }, 26, 0xe0d8f0),
  granitecutter: proc('heavy', 'Granite Cutter', 'Stone in, granite out. Gravel is the by-product.', 420, 1, { stone: 3 }, { granite: 2, gravel: 1 }, 24, 0x9a8f94),
  refinery: proc('heavy', 'Fuel Refinery', 'Crude oil in, fuel out.', 1600, 3, { oil: 2 }, { fuel: 1, sand: 1 }, 28, 0xc04a2a),
  pelletmill: proc('processing', 'Pellet Mill', 'Presses sawdust into heating pellets.', 380, 1, { sawdust: 3 }, { pellets: 1 }, 22, 0x9a7448),

  // Manufacturing
  papermill: proc('manufacturing', 'Paper Mill', 'Logs in, paper out.', 480, 1, { logs: 3 }, { paper: 1 }, 30, 0x8fa3b8),
  spinmill: proc('manufacturing', 'Spinning Mill', 'Cotton in, yarn out.', 400, 1, { cotton: 2 }, { yarn: 1 }, 22, 0xd9a0b0),
  weavery: proc('manufacturing', 'Weavery', 'Yarn in, cloth out.', 520, 2, { yarn: 2 }, { cloth: 1 }, 26, 0x7f9fc8),
  tailor: proc('manufacturing', 'Garment Factory', 'Cloth in, clothes out. Big money.', 650, 2, { cloth: 2 }, { clothes: 1 }, 34, 0x4f7f6f),
  workshop: proc('manufacturing', 'Furniture Workshop', 'Lumber and cloth in, furniture out.', 900, 2, { lumber: 2, cloth: 1 }, { furniture: 2 }, 34, 0x8b5a3a),
  printery: proc('manufacturing', 'Printery', 'Paper in, books out.', 1200, 2, { paper: 2 }, { books: 1 }, 40, 0x4f6fa8),

  // Heavy industry
  brickworks: proc('heavy', 'Brickworks', 'Clay in, bricks out.', 420, 1, { clay: 2 }, { bricks: 1 }, 22, 0xa4523f),
  stonecutter: proc('heavy', 'Stonecutter', 'Stone in, cut blocks out. Gravel is the by-product.', 380, 1, { stone: 2 }, { blocks: 1, gravel: 1 }, 24, 0xb8b5ac),
  cementworks: proc('heavy', 'Cement Works', 'Gravel and coal in, cement out.', 600, 2, { gravel: 2, coal: 1 }, { cement: 1 }, 26, 0x9a9a96),
  concrete: proc('heavy', 'Concrete Plant', 'Cement, sand and gravel in, concrete out. Puts gravel to work.', 650, 2, { cement: 1, sand: 1, gravel: 1 }, { concrete: 3 }, 24, 0xb2b2ae),
  glassworks: proc('heavy', 'Glassworks', 'Sand and coal in, glass out.', 700, 2, { sand: 2, coal: 1 }, { glass: 1 }, 28, 0x9fd0e0),
  smelter: proc('heavy', 'Smelter', 'Ore and coal in, iron ingots out. Slag is the by-product.', 800, 2, { ore: 2, coal: 1 }, { ingots: 1, slag: 1 }, 30, 0x6f7a86),
  toolworks: proc('heavy', 'Toolworks', 'Ingots and lumber in, tools out.', 750, 2, { ingots: 1, lumber: 1 }, { tools: 1 }, 30, 0x6a7480),
  steelworks: proc('heavy', 'Steelworks', 'Ingots and coal in, steel out.', 1400, 3, { ingots: 2, coal: 1 }, { steel: 1, slag: 1 }, 40, 0x4e6a86),
  slagcrusher: proc('heavy', 'Slag Crusher', 'Turns slag into gravel and sand.', 500, 3, { slag: 1 }, { gravel: 1, sand: 1 }, 20, 0x58545a),
  machinery: proc('heavy', 'Machine Works', 'Steel and tools in, machinery out. The top of the chain.', 2200, 3, { steel: 2, tools: 1 }, { machinery: 1 }, 60, 0xd08a2e),

  // Logistics and town docks
  hub: {
    label: 'Distribution Warehouse',
    blurb: 'Holds finished goods like food and furniture and sells them on to other towns. Raw and building goods go to a Supply Yard.',
    real: 'Like a real distribution centre: finished goods wait on the shelf until a town buys them.',
    category: 'logistics',
    cost: 300,
    tier: 1,
    cap: 480,
    color: 0xd68a2e,
    hub: true,
    store: true,
  } as SiteDef,
  garage: {
    label: 'Mechanic Shop',
    blurb: 'Trucks that wear out go here and come back repaired. A better shop is quicker, and a better mechanic repairs past new for a while.',
    real: 'Like a real truck garage: a mechanic fixes the worn ones and sends them back out.',
    category: 'logistics',
    cost: 700,
    tier: 1,
    cap: 60,
    color: 0x9a7448,
    garage: true,
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
    blurb: 'Where the town buys raw and building goods: logs, lumber, grain, ore, bricks, steel and leftovers.',
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

/**
 * When each building opens. The menu grows with the game instead of arriving all at once: the staples first, then the wider farm
 * and kitchen chains, then the specialist plants. A building opens no earlier than the buildings that make its ingredients.
 */
const OPENS: Record<number, string[]> = {
  0: ['forestry', 'farm', 'ranch', 'orchard', 'quarry', 'sawmill', 'mill', 'bakery', 'dairy', 'woodyard'],
  1: ['claypit', 'waterpump', 'chickenfarm', 'vegfarm', 'potatofarm', 'sandpit', 'coalmine', 'harbor', 'sugarfarm',
    'jamfactory', 'feedmill', 'creamery', 'juicepress', 'sugarrefinery', 'gardensupply', 'scrapyard',
    'brickworks', 'stonecutter', 'granitecutter', 'hub', 'garage', 'pelletmill'],
  2: ['cottonfarm', 'papermill', 'spinmill', 'oremine', 'barleyfarm', 'oilseedfarm', 'pigfarm', 'sheepfarm', 'apiary', 'vineyard', 'saltpan', 'coffeefarm', 'mangogrove', 'oilwell',
    'smokehouse', 'fishcannery', 'fishmeal', 'oilpress', 'pastrykitchen', 'noodlemaker', 'cannery', 'butcher', 'woolmill', 'compostyard',
    'silage', 'weavery', 'tailor', 'workshop', 'printery', 'winery', 'distillery', 'cementworks', 'concrete', 'glassworks',
    'smelter', 'toolworks', 'railyard', 'port'],
  3: ['hopfarm', 'spicefarm', 'cocoafarm', 'pizzeria', 'brewery', 'sodaplant', 'icecreamplant', 'crispfryer', 'sausagemaker', 'chocolatier',
    'candlemaker', 'pillowmaker', 'refinery', 'steelworks', 'slagcrusher', 'machinery', 'airport'],
};
for (const [tier, kinds] of Object.entries(OPENS)) for (const k of kinds) (DEFS as Record<string, SiteDef>)[k].tier = Number(tier);

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
  fishboat: { label: 'Fishing Boat', blurb: 'Goes out from its Fishing Harbor and comes back on its own. Each boat makes the harbor catch more fish.', mode: 'sea', cost: 350, tier: 1, capacity: 0, ticksPerTile: 6, implemented: true, needLevel: 1 },
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
/** What a driver of each rank asks to be hired, and is paid every minute whether or not they have a truck. Draft numbers. */
export const DRIVER_HIRE = [0, 60, 200, 500, 1200];
export const DRIVER_WAGE = [1, 1, 2, 3, 4];
/** How often the applicants change, in ticks. */
export const APPLICANT_TICKS = 6000;

/**
 * How far a road vehicle can run a route, in tiles (a highway tile counts half). Past it, goods must be daisy-chained from
 * warehouse to warehouse, or go by rail, sea or air. The driver's rank stretches it. Draft numbers.
 */
export const VEHICLE_REACH: Partial<Record<VehicleKind, number>> = { boxtruck: 900, bigtruck: 1400, rig: 2200, convoy: 3300 };
export const DRIVER_REACH = [0.8, 1, 1.15, 1.3, 1.5];
/** Fuel the driver pays for on every tile driven, loaded or empty: about the same per unit of load for every class. Draft numbers. */
export const FUEL_PER_TILE: Partial<Record<VehicleKind, number>> = { boxtruck: 0.1, bigtruck: 0.22, rig: 0.5, convoy: 1.4 };
/** Wear per tile grows with the haul: a run at full reach wears this much more per tile than a short local one. */
export const WEAR_LONG_HAUL = 2;
/** A fully worn road vehicle carries this much less. */
export const WEAR_LOAD_LOSS = 0.3;

/** Running costs. Vehicles cost this share of their price every minute; buildings and districts a share of theirs per level. */
export const VEHICLE_UPKEEP = 0.015;
export const SITE_UPKEEP = 0.005;
export const DISTRICT_UPKEEP = 0.01;
/** Towns pay this share of the list price. Keeps the early game from running away. */
export const SALE_MULT = 1;
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

/** Goods the Market wants at each town level: finished goods people use every day. Raw and building goods go to the Supply Yard. */
export const MARKET_DEMAND: Good[][] = [
  ['bread', 'cheese', 'milk', 'eggs', 'fruit', 'vegetables', 'potatoes', 'firewood', 'fish'],
  ['bread', 'cheese', 'milk', 'eggs', 'fruit', 'vegetables', 'potatoes', 'firewood', 'fish', 'butter', 'jam', 'juice', 'pastry', 'pasta', 'canned', 'smokedfish', 'cannedfish', 'crisps', 'meat', 'honey', 'water', 'mulch', 'pellets', 'feed', 'paper', 'coffee', 'mango'],
  ['bread', 'cheese', 'milk', 'eggs', 'fruit', 'vegetables', 'potatoes', 'firewood', 'fish', 'butter', 'jam', 'juice', 'pastry', 'pasta', 'canned', 'smokedfish', 'cannedfish', 'crisps', 'meat', 'honey', 'water', 'mulch', 'pellets', 'feed', 'paper', 'coffee', 'mango', 'pizza', 'beer', 'wine', 'soda', 'icecream', 'sausage', 'chocolate', 'candles', 'pillows', 'cookoil', 'fuel', 'oil', 'furniture', 'clothes', 'tools'],
  ['bread', 'cheese', 'milk', 'eggs', 'fruit', 'vegetables', 'potatoes', 'firewood', 'fish', 'butter', 'jam', 'juice', 'pastry', 'pasta', 'canned', 'smokedfish', 'cannedfish', 'crisps', 'meat', 'honey', 'water', 'mulch', 'pellets', 'feed', 'paper', 'coffee', 'mango', 'pizza', 'beer', 'wine', 'soda', 'icecream', 'sausage', 'chocolate', 'candles', 'pillows', 'cookoil', 'fuel', 'oil', 'furniture', 'clothes', 'tools', 'books', 'spirits'],
  ['bread', 'cheese', 'milk', 'eggs', 'fruit', 'vegetables', 'potatoes', 'firewood', 'fish', 'butter', 'jam', 'juice', 'pastry', 'pasta', 'canned', 'smokedfish', 'cannedfish', 'crisps', 'meat', 'honey', 'water', 'mulch', 'pellets', 'feed', 'paper', 'coffee', 'mango', 'pizza', 'beer', 'wine', 'soda', 'icecream', 'sausage', 'chocolate', 'candles', 'pillows', 'cookoil', 'fuel', 'oil', 'furniture', 'clothes', 'tools', 'books', 'spirits', 'machinery'],
];
// Every food the Market can sell on to its customers is in its list, so no ingredient or crop is left without a buyer. Everything the
// first two tiers can make for sale (jam, butter, juice, water, feed, mulch, pellets, coal) sells at a level 1 Market from the start.
for (const [from, goods] of [[0, ['jam', 'butter', 'juice', 'water', 'feed', 'mulch', 'pellets', 'coal']], [1, ['flour', 'sugar', 'salt']], [2, ['spices', 'pork', 'grapes', 'spirits', 'books']], [3, ['machinery']]] as [number, Good[]][]) {
  for (let l = from; l < MARKET_DEMAND.length; l++) for (const g of goods) if (!MARKET_DEMAND[l].includes(g)) MARKET_DEMAND[l].push(g);
}

/** The goods a town gets a taste for (a price swing) among the raw and building goods. Only world generation reads it; keep it as is so towns look the same. */
export const YARD_TASTE_GOODS: Good[] = ['logs', 'grain', 'cotton', 'stone', 'ore', 'coal', 'clay', 'sand', 'milk', 'fruit', 'sawdust', 'bran', 'whey', 'gravel', 'slag', 'feed', 'oil', 'lumber', 'flour', 'ingots', 'cement', 'yarn', 'pellets', 'glass', 'tools', 'steel', 'bricks', 'concrete', 'blocks', 'cloth'];

/** Goods the Supply Yard buys by town level: none of its own. It is a store for building materials, so it only takes what the town still needs to build (see dockDemand). */
export const FREIGHT_DEMAND: Good[][] = [[], [], [], [], []];

/** Lumber a closed town needs delivered to build its Supply Yard, then its Market. */
export const BUILD_LUMBER = [80, 120];

/**
 * Materials a town needs delivered to its Supply Yard for each level-up (index 0 is level 1 to 2), by town style.
 * Each level asks for harder goods. The first step (level 1 to 2) is lumber alone: every town has a forest close by, but clay, stone and sand can be 40 to 100 tiles away on some maps, so a town's first step must never wait for them. Later levels add the style's own materials, in amounts a few trucks can bring. Draft numbers, to tune by playing.
 */
export const LEVEL_MATERIALS: Record<TownStyle, Stock[]> = {
  nordic: [{ lumber: 250 }, { lumber: 300, stone: 150 }, { lumber: 400, blocks: 200, bricks: 150 }, { steel: 1200, concrete: 2000, glass: 800, tools: 100 }],
  temperate: [{ lumber: 250 }, { lumber: 250, bricks: 200 }, { lumber: 400, bricks: 250, blocks: 150 }, { steel: 1000, concrete: 1800, glass: 700, tools: 100 }],
  mediterranean: [{ lumber: 250 }, { stone: 150, bricks: 150 }, { blocks: 250, bricks: 250, granite: 150 }, { steel: 1000, concrete: 1800, blocks: 800, glass: 600 }],
  tropical: [{ lumber: 300 }, { lumber: 300, sand: 150, bricks: 100 }, { lumber: 400, bricks: 250, sand: 200 }, { steel: 1100, cement: 300, concrete: 2000, glass: 800 }],
  arid: [{ lumber: 250 }, { bricks: 200, sand: 100 }, { bricks: 300, blocks: 200, sand: 200 }, { steel: 1000, concrete: 1800, glass: 900, tools: 100 }],
};

/** Goods a Supply Yard keeps in store for building: lumber for the Market, and the level materials. Its own trucks carry them to the Market site. */
/**
 * Mechanics are people, like drivers: hired from the people looking for work, paid a wage every minute, and better with
 * experience. A rank comes from the repairs they have done. A better rank repairs faster and cheaper, and sends a truck back
 * past new for a while (the buff, for each rank above apprentice). A shop has room for its level plus one mechanics. Draft numbers.
 */
export const MECHANIC_RANKS = ['Apprentice', 'Mechanic', 'Skilled mechanic', 'Master mechanic', 'Chief mechanic'];
export const MECHANIC_JOBS = [0, 6, 18, 40, 80];
export const MECHANIC_WAGE = [2, 3, 4, 6, 9];
export const MECHANIC_HIRE = [0, 120, 350, 800, 1800];
export const MECHANIC_BUFF = 0.08;
/** Each rank above apprentice: a share off the repair time and off the bill. */
export const MECHANIC_FASTER = 0.12;
export const MECHANIC_CHEAPER = 0.05;
/** A truck that is fully worn waits this long for a mechanic, faster with a better shop and rank, slower with distance. Ticks. */
export const SHOP_WAIT = 900;

export const BUILD_GOODS: Good[] = ['lumber', 'stone', 'granite', 'blocks', 'bricks', 'sand', 'gravel', 'cement', 'concrete', 'glass', 'steel', 'tools'];

/** What a Warehouse (the Distribution Warehouse) may hold: finished goods only. Tools can go in both it and the Supply Yard. */
export const WAREHOUSE_GOODS: Good[] = ['smokedfish', 'cannedfish', 'bread', 'pastry', 'pizza', 'pasta', 'cheese', 'butter', 'icecream', 'jam', 'juice', 'canned', 'crisps', 'meat', 'sausage', 'beer', 'wine', 'spirits', 'soda', 'chocolate', 'candles', 'pillows', 'paper', 'books', 'clothes', 'furniture', 'tools', 'machinery', 'pellets', 'feed', 'cookoil', 'fuel', 'oil', 'mulch', 'coffee', 'mango', 'honey'];

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
  | 'soccer'
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
  farmersmarket: { label: 'Farmers Market', blurb: 'Stalls of fresh produce. Buys honey, juice and pasta that the Market ignores.', minLevel: 1, cost: 450, goods: ['honey', 'juice', 'pasta', 'bread', 'cheese', 'jam', 'flour'], price: 0.08, revenue: 10, demand: { market: ['honey', 'juice', 'pasta'] }, affinity: 'breadbasket' },
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
  soccer: { label: 'Soccer Stadium', blurb: 'The beautiful game, under floodlights. Wants bread, fruit, milk, clothes and coffee for the supporters.', minLevel: 4, cost: 6000, goods: ['bread', 'fruit', 'milk', 'clothes', 'coffee'], price: 0.08, revenue: 105 },
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
  /** Towns built up to a stage: 1 has its Supply Yard, 2 its Market too. */
  | { kind: 'townbuilt'; stage: 1 | 2; count: number }
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
      { id: 't0-selling', label: 'Send lumber to the Supply Yard site', hint: 'Click the Sawmill, buy a truck, and switch the Supply Yard on under Sell to. The street already links them. The lumber builds the yard: it is not sold, so it pays nothing.', goal: { kind: 'selling', count: 1 }, reward: 150 },
      { id: 't0-yard', label: 'Build the Supply Yard: 80 lumber', hint: 'Keep the lumber coming. One camp makes only about 9 lumber a minute, so build two or three Forestry Camps and join each to the Sawmill. When 80 has arrived the yard is built.', goal: { kind: 'townbuilt', stage: 1, count: 1 }, reward: 500 },
      { id: 't0-market', label: 'Build the Market', hint: 'Fill the yard store with 150 more lumber, buy a Box Truck at the Supply Yard, and carry it to the Market site.', goal: { kind: 'townbuilt', stage: 2, count: 1 }, reward: 500 },
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
      { id: 't1-bigtruck', label: 'Buy a Big Box Truck', hint: 'Select a building with a Box Truck, open its Trucks tab and buy a Big Box Truck. Choose a driver for it, or move one over from your old truck. A bigger truck carries twice the load.', goal: { kind: 'vehicle', vehicle: 'bigtruck', count: 1 }, reward: 500 },
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
      { id: 't2-rig', label: 'Run a Big Rig', hint: 'Open the Trucks tab of a building and buy a Big Rig. Move a driver over from a smaller truck, or hire one.', goal: { kind: 'vehicle', vehicle: 'rig', count: 1 }, reward: 1500 },
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
      { id: 't3-fleet', label: 'Run a Truck Fleet', hint: 'Open the Trucks tab of a building and buy a Truck Fleet. Move a driver over from a smaller truck, or hire one.', goal: { kind: 'vehicle', vehicle: 'convoy', count: 1 }, reward: 8000 },
      { id: 't3-earn', label: 'Earn $250,000 in total', hint: 'High-value goods on fast, full vehicles.', goal: { kind: 'earn', amount: 250000 }, reward: 10000 },
    ],
  },
  {
    tier: 4,
    name: 'Legacy',
    blurb: 'The world is connected. Now make your towns great, each in its own way.',
    quests: [
      { id: 't4-paths', label: 'Run 3 different specialisations', hint: 'Breadbasket, The Forge, Trade Hub, The Boulevard: give three of your towns different paths.', goal: { kind: 'paths', count: 3 }, reward: 25000 },
      { id: 't4-jet', label: 'Fly a Cargo Jet', hint: 'Open an airport and buy a Cargo Jet. Move a driver over from a smaller plane, or hire one.', goal: { kind: 'vehicle', vehicle: 'jet', count: 1 }, reward: 30000 },
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
