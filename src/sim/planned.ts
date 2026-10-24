// Goods that make sense for the game but are not in it yet. The goods page shows them with a "not in game" badge, so the whole
// picture is in one place and each one has a spot waiting for it. Nothing here is used by the game itself.
import type { Good } from './defs';

export type GoodGroup = 'food' | 'drink' | 'minerals' | 'building' | 'wood' | 'cloth' | 'fuel' | 'household' | 'farm';

export const GROUPS: { id: GoodGroup; label: string }[] = [
  { id: 'food', label: 'Food' },
  { id: 'drink', label: 'Drink' },
  { id: 'minerals', label: 'Minerals and metals' },
  { id: 'building', label: 'Building materials' },
  { id: 'wood', label: 'Wood and paper' },
  { id: 'cloth', label: 'Cloth and leather' },
  { id: 'fuel', label: 'Fuel and energy' },
  { id: 'household', label: 'Household and tools' },
  { id: 'farm', label: 'Farm supplies' },
];

export interface PlannedGood {
  id: string;
  label: string;
  groups: GoodGroup[];
  kind: 'raw' | 'material' | 'product';
  price: number;
  /** The building that would make it, in plain words. */
  madeBy: string;
  /** What it would be made from: goods in the game, or other planned goods. */
  from: string[];
  /** Where it grows or lies, or a note about it. */
  note?: string;
}

const p = (id: string, label: string, groups: GoodGroup[], kind: PlannedGood['kind'], price: number, madeBy: string, from: string[], note?: string): PlannedGood => ({ id, label, groups, kind, price, madeBy, from, note });

export const PLANNED: PlannedGood[] = [
  // Meat and farm animals
  p('chicken', 'Chicken', ['food'], 'raw', 9, 'Poultry Farm (with eggs and feathers)', [], 'Free-range birds on open ground'),
  p('beef', 'Beef Cattle', ['food'], 'raw', 12, 'Cattle Ranch (with leather hides)', [], 'Pasture on open ground'),
  p('lamb', 'Lamb', ['food'], 'raw', 11, 'Sheep Ranch (with wool)', [], 'Pasture on open ground'),
  p('bacon', 'Bacon', ['food'], 'product', 30, 'Smokehouse', ['pork', 'salt']),
  p('ham', 'Ham', ['food'], 'product', 32, 'Smokehouse', ['pork', 'salt']),
  // Dairy and baking
  p('cream', 'Cream', ['food'], 'material', 12, 'Dairy', ['milk']),
  p('yogurt', 'Yogurt', ['food'], 'product', 12, 'Dairy', ['milk', 'fruit']),
  p('cake', 'Cake', ['food'], 'product', 30, 'Bakery', ['flour', 'sugar', 'eggs', 'butter']),
  p('cookies', 'Cookies', ['food'], 'product', 16, 'Bakery', ['flour', 'sugar', 'butter']),
  p('cereal', 'Breakfast Cereal', ['food'], 'product', 12, 'Cereal Mill', ['grain', 'sugar']),
  // Crops
  p('rice', 'Rice', ['food'], 'raw', 4, 'Rice Paddy', [], 'Wet low ground in the tropics'),
  p('corn', 'Corn', ['food'], 'raw', 3, 'Farm', [], 'Fields on open ground'),
  p('tomatoes', 'Tomatoes', ['food'], 'raw', 4, 'Farm', [], 'Fields on open ground'),
  p('onions', 'Onions', ['food'], 'raw', 3, 'Farm', [], 'Fields on open ground'),
  p('olives', 'Olives', ['food'], 'raw', 5, 'Olive Grove', [], 'Dry warm hillsides in the Mediterranean'),
  p('dates', 'Dates', ['food'], 'raw', 8, 'Date Palm Grove', [], 'Oases in the desert'),
  p('bananas', 'Bananas', ['food'], 'raw', 4, 'Plantation', [], 'Tropical lowlands'),
  p('coconuts', 'Coconuts', ['food'], 'raw', 5, 'Plantation', [], 'Tropical coast'),
  p('peanuts', 'Peanuts', ['food'], 'raw', 4, 'Farm', [], 'Warm dry fields'),
  p('tealeaves', 'Tea Leaves', ['food', 'drink'], 'raw', 8, 'Tea Estate', [], 'Wet hillsides'),
  // Prepared food
  p('ketchup', 'Ketchup', ['food'], 'product', 12, 'Cannery', ['tomatoes', 'sugar']),
  p('soup', 'Soup', ['food'], 'product', 15, 'Cannery', ['vegetables', 'water']),
  p('popcorn', 'Popcorn', ['food'], 'product', 8, 'Snack Factory', ['corn', 'cookoil']),
  p('olive-oil', 'Olive Oil', ['food'], 'material', 20, 'Oil Press', ['olives']),
  p('peanut-butter', 'Peanut Butter', ['food'], 'product', 14, 'Snack Factory', ['peanuts', 'salt']),
  // Drink
  p('tea', 'Tea', ['drink'], 'product', 14, 'Tea Packer', ['tealeaves']),
  p('cider', 'Cider', ['drink'], 'product', 14, 'Brewery', ['fruit', 'water']),
  // Minerals and metals
  p('limestone', 'Limestone', ['minerals', 'building'], 'raw', 4, 'Quarry', [], 'Pale hills'),
  p('gypsum', 'Gypsum', ['minerals', 'building'], 'raw', 5, 'Quarry', [], 'Dry basins and the desert'),
  p('marble', 'Marble', ['minerals', 'building'], 'raw', 12, 'Quarry', [], 'High mountains'),
  p('copperore', 'Copper Ore', ['minerals'], 'raw', 9, 'Mine', [], 'Mountains'),
  p('copper', 'Copper', ['minerals'], 'material', 40, 'Foundry', ['copperore', 'coal']),
  p('bauxite', 'Bauxite', ['minerals'], 'raw', 8, 'Mine', [], 'Warm hills'),
  p('aluminium', 'Aluminium', ['minerals'], 'material', 55, 'Smelter', ['bauxite', 'coal']),
  p('goldore', 'Gold Ore', ['minerals'], 'raw', 25, 'Mine', [], 'Deep in the mountains'),
  p('gold', 'Gold', ['minerals'], 'material', 300, 'Refinery', ['goldore', 'coal']),
  // Fuel and energy
  p('naturalgas', 'Natural Gas', ['fuel', 'minerals'], 'raw', 10, 'Gas Field', [], 'Deserts and shallow seas, beside oil'),
  p('charcoal', 'Charcoal', ['fuel', 'wood'], 'product', 12, 'Charcoal Kiln', ['logs']),
  p('biofuel', 'Biofuel', ['fuel'], 'product', 30, 'Biofuel Plant', ['sugarbeet', 'sunflower']),
  // Building
  p('tiles', 'Roof Tiles', ['building'], 'material', 18, 'Brickworks', ['clay']),
  p('plaster', 'Plaster', ['building'], 'material', 14, 'Cement Works', ['gypsum']),
  p('asphalt', 'Asphalt', ['building', 'fuel'], 'material', 20, 'Refinery', ['oil', 'gravel']),
  p('pipes', 'Steel Pipes', ['building', 'minerals'], 'material', 50, 'Steel Mill', ['steel']),
  p('wire', 'Copper Wire', ['building', 'minerals'], 'material', 40, 'Wire Mill', ['copper']),
  p('plywood', 'Plywood', ['building', 'wood'], 'material', 20, 'Sawmill', ['lumber', 'sawdust']),
  p('cardboard', 'Cardboard', ['wood'], 'material', 12, 'Paper Mill', ['pulp']),
  // Cloth and leather
  p('leather', 'Leather', ['cloth'], 'material', 30, 'Tannery', ['beef']),
  p('flax', 'Flax', ['cloth'], 'raw', 5, 'Farm', [], 'Cool wet fields'),
  p('linen', 'Linen', ['cloth'], 'material', 28, 'Textile Mill', ['flax']),
  p('silk', 'Silk', ['cloth'], 'raw', 40, 'Silk Farm', [], 'Mulberry groves in warm wet land'),
  p('shoes', 'Shoes', ['cloth', 'household'], 'product', 75, 'Shoe Factory', ['leather', 'cloth']),
  // Household
  p('soap', 'Soap', ['household'], 'product', 8, 'Soap Works', ['cookoil', 'salt']),
  p('rubber', 'Rubber', ['household'], 'raw', 12, 'Rubber Plantation', [], 'Tropical forest'),
  p('tyres', 'Tyres', ['household'], 'product', 90, 'Tyre Factory', ['rubber', 'steel']),
  p('plastic', 'Plastic', ['household'], 'material', 30, 'Refinery', ['oil']),
  p('paint', 'Paint', ['household', 'building'], 'product', 30, 'Paint Works', ['oil', 'limestone']),
  p('toys', 'Toys', ['household'], 'product', 40, 'Toy Factory', ['plastic', 'cloth']),
  p('electronics', 'Electronics', ['household'], 'product', 400, 'Electronics Factory', ['copper', 'plastic', 'glass']),
  p('batteries', 'Batteries', ['household'], 'product', 120, 'Battery Plant', ['copper', 'aluminium']),
  p('bicycles', 'Bicycles', ['household'], 'product', 180, 'Cycle Works', ['steel', 'tyres']),
  p('appliances', 'Appliances', ['household'], 'product', 600, 'Appliance Factory', ['steel', 'plastic', 'electronics']),
  // Farm supplies
  p('hay', 'Hay', ['farm'], 'raw', 2, 'Farm', [], 'Meadows'),
  p('seeds', 'Seed', ['farm'], 'product', 6, 'Seed Merchant', ['grain', 'sunflower']),
  p('fertilizer', 'Fertilizer', ['farm'], 'product', 14, 'Compost Works', ['fishscraps', 'straw', 'husks'], 'Uses by-products that otherwise go to scrap'),
];

/** A good that is in the game, which groups it belongs to. A good can be in several. */
export const GROUPS_OF: Record<Good, GoodGroup[]> = {
  logs: ['wood'], grain: ['food', 'farm'], cotton: ['cloth'], stone: ['minerals', 'building'], ore: ['minerals'], coal: ['minerals', 'fuel'], clay: ['minerals', 'building'],
  sand: ['minerals', 'building'], milk: ['food', 'drink'], fruit: ['food'], coffee: ['food', 'drink'], mango: ['food'], oil: ['fuel', 'minerals'], lumber: ['wood', 'building'],
  flour: ['food'], paper: ['wood'], bricks: ['building'], blocks: ['building', 'minerals'], ingots: ['minerals'], steel: ['minerals', 'building'], cement: ['building'],
  concrete: ['building'], glass: ['building'], yarn: ['cloth'], cloth: ['cloth'], bread: ['food'], cheese: ['food'], jam: ['food'], clothes: ['cloth'],
  furniture: ['household', 'wood'], books: ['household', 'wood'], pellets: ['fuel', 'wood'], feed: ['farm'], tools: ['household'], machinery: ['household'], sawdust: ['wood'],
  bran: ['farm', 'food'], whey: ['farm', 'food'], gravel: ['minerals', 'building'], slag: ['minerals'], mulch: ['farm', 'wood'], fish: ['food'], fishscraps: ['farm'],
  smokedfish: ['food'], cannedfish: ['food'], water: ['drink'], barley: ['food', 'drink'], hops: ['drink'], grapes: ['food', 'drink'], eggs: ['food'], vegetables: ['food'],
  potatoes: ['food'], sugarbeet: ['food'], sunflower: ['food', 'farm'], pork: ['food'], wool: ['cloth'], honey: ['food'], salt: ['minerals', 'food'], spices: ['food'],
  cocoa: ['food'], sugar: ['food'], cookoil: ['food'], fuel: ['fuel'], granite: ['minerals', 'building'], firewood: ['wood', 'fuel'], butter: ['food'], juice: ['drink'],
  pastry: ['food'], pizza: ['food'], pasta: ['food'], icecream: ['food'], canned: ['food'], crisps: ['food'], meat: ['food'], sausage: ['food'], beer: ['drink'], wine: ['drink'],
  spirits: ['drink'], soda: ['drink'], chocolate: ['food'], candles: ['household'], pillows: ['household', 'cloth'], straw: ['farm'], pulp: ['wood'], husks: ['farm'],
  feathers: ['cloth'], wax: ['household'], woodchips: ['wood', 'fuel'], spentgrain: ['farm'],
};
