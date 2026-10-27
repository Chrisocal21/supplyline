// Route lines: from tier 3 the game is free, but the first building of a chain starts a short guided line for it. The line shows one step
// at a time and follows what the player is already making, so nothing pulls them across the map. Lines never gate a tier.
import { SITE_DEFS, type Good, type Quest, type SiteKind } from './defs';

export interface RouteLine {
  id: string;
  name: string;
  blurb: string;
  /** Building any of these starts the line. */
  starts: SiteKind[];
  /** Finishing the line opens these branches, so the route keeps going: one thing leads to the next. */
  opens?: string[];
  steps: Quest[];
}

const build = (line: string, site: SiteKind, reward: number, extra = ''): Quest => ({
  id: `l-${line}-build-${site}`,
  label: `Build ${/^[aeiou]/i.test(SITE_DEFS[site].label) ? 'an' : 'a'} ${SITE_DEFS[site].label}`,
  hint: `${SITE_DEFS[site].blurb} Road it to what feeds it and to a buyer.${extra ? ` ${extra}` : ''}`,
  goal: { kind: 'build', site, count: 1 },
  reward,
});
const make = (line: string, good: Good, amount: number, reward: number, hint: string): Quest => ({
  id: `l-${line}-make-${good}`,
  label: `Make ${amount.toLocaleString('en-US')} ${good}`,
  hint,
  goal: { kind: 'make', good, amount },
  reward,
});
const sell = (line: string, good: Good, amount: number, reward: number, hint: string): Quest => ({
  id: `l-${line}-sell-${good}`,
  label: `Sell ${amount.toLocaleString('en-US')} ${good} to towns`,
  hint,
  goal: { kind: 'deliver', good, amount },
  reward,
});

export const ROUTE_LINES: RouteLine[] = [
  {
    id: 'bricks',
    name: 'Brick and stone',
    blurb: 'Clay to bricks, stone to blocks: the building goods towns need to grow.',
    starts: ['claypit', 'quarry'],
    opens: ['cement', 'glass'],
    steps: [
      build('bricks', 'claypit', 300),
      build('bricks', 'brickworks', 500),
      make('bricks', 'bricks', 100, 800, 'Road clay to the Brickworks and switch Bricks on under Production.'),
      sell('bricks', 'bricks', 150, 1000, 'Switch a Supply Yard or Market on under Sell to. Bricks build bigger towns.'),
      build('bricks', 'quarry', 400),
      build('bricks', 'stonecutter', 600),
      make('bricks', 'blocks', 100, 1000, 'Road stone to the Stonecutter. Gravel comes out as a by-product.'),
    ],
  },
  {
    id: 'iron',
    name: 'Iron and steel',
    blurb: 'Ore and coal to ingots, then tools and steel.',
    starts: ['oremine', 'smelter'],
    opens: ['machines', 'cement'],
    steps: [
      build('iron', 'oremine', 1000),
      build('iron', 'coalmine', 500),
      build('iron', 'smelter', 1500, 'Road ore and coal to it. Slag is the by-product.'),
      make('iron', 'ingots', 100, 2000, 'Keep ore and coal coming to the Smelter.'),
      build('iron', 'toolworks', 1500),
      make('iron', 'tools', 60, 2500, 'Ingots and lumber in, tools out.'),
      build('iron', 'steelworks', 3000),
      make('iron', 'steel', 100, 5000, 'Ingots and coal to the Steelworks.'),
    ],
  },
  {
    id: 'cement',
    name: 'Cement and concrete',
    blurb: 'Gravel and coal to cement, then concrete for the biggest towns.',
    starts: ['cementworks', 'concrete'],
    opens: ['machines'],
    steps: [
      build('cement', 'cementworks', 1200),
      make('cement', 'cement', 100, 1500, 'Gravel from a quarry and coal from a mine, roaded in.'),
      build('cement', 'concrete', 1500),
      make('cement', 'concrete', 100, 2500, 'Cement, sand and gravel to the Concrete Plant.'),
    ],
  },
  {
    id: 'harbor',
    name: 'Fish and salt',
    blurb: 'A harbor and its boats, then salt, smoke and cans.',
    starts: ['harbor', 'saltpan'],
    opens: ['sea', 'prepared'],
    steps: [
      build('harbor', 'harbor', 800),
      make('harbor', 'fish', 100, 800, 'Buy a Fishing Boat at the harbor: each boat adds to the catch.'),
      build('harbor', 'saltpan', 600),
      build('harbor', 'smokehouse', 900),
      make('harbor', 'smokedfish', 80, 1500, 'Fish, salt and firewood to the Smokehouse.'),
      build('harbor', 'fishcannery', 1200),
      make('harbor', 'cannedfish', 80, 2000, 'Fish, salt and water to the Fish Cannery.'),
    ],
  },
  {
    id: 'cloth',
    name: 'Wool, cotton and cloth',
    blurb: 'Fibre to yarn to cloth, and on to clothes and furniture.',
    starts: ['sheepfarm', 'cottonfarm', 'woolmill', 'spinmill'],
    opens: ['hives', 'paper'],
    steps: [
      build('cloth', 'cottonfarm', 600),
      build('cloth', 'spinmill', 900),
      make('cloth', 'yarn', 100, 1200, 'Cotton to the Spinning Mill. A Wool Mill makes yarn from wool too.'),
      build('cloth', 'weavery', 1200),
      make('cloth', 'cloth', 80, 1800, 'Yarn to the Weavery.'),
      build('cloth', 'tailor', 1500),
      make('cloth', 'clothes', 60, 3000, 'Cloth to the Garment Factory. Boulevard towns pay well for clothes.'),
    ],
  },
  {
    id: 'sweets',
    name: 'Sugar and sweets',
    blurb: 'Beet to sugar, then jam, pastries and soft drinks.',
    starts: ['sugarfarm', 'sugarrefinery'],
    opens: ['prepared'],
    steps: [
      build('sweets', 'sugarfarm', 500),
      build('sweets', 'sugarrefinery', 800),
      make('sweets', 'sugar', 100, 1000, 'Beet to the Sugar Refinery. Pulp is a by-product for feed.'),
      build('sweets', 'jamfactory', 900),
      make('sweets', 'jam', 80, 1500, 'Fruit and sugar to the Jam Factory.'),
      build('sweets', 'pastrykitchen', 1200),
      make('sweets', 'pastry', 60, 2200, 'Flour, eggs and sugar to the Pastry Kitchen.'),
    ],
  },
  {
    id: 'brewing',
    name: 'Barley and beer',
    blurb: 'Barley and hops to beer, the spent grain to feed.',
    starts: ['barleyfarm', 'hopfarm', 'brewery'],
    opens: ['spirits'],
    steps: [
      build('brewing', 'barleyfarm', 600),
      build('brewing', 'hopfarm', 600),
      build('brewing', 'brewery', 1500, 'It needs water too: a Water Pump beside it helps.'),
      make('brewing', 'beer', 100, 3000, 'Barley, hops and water to the Brewery.'),
      build('brewing', 'silage', 1000),
    ],
  },
  {
    id: 'meat',
    name: 'Pork and meat',
    blurb: 'Pigs to the butcher, and on to sausage.',
    starts: ['pigfarm', 'butcher'],
    opens: ['prepared'],
    steps: [
      build('meat', 'pigfarm', 600),
      build('meat', 'butcher', 1000),
      make('meat', 'meat', 100, 1500, 'Pork to the Butcher.'),
      build('meat', 'sausagemaker', 1800),
      make('meat', 'sausage', 60, 3000, 'Pork, salt and spices to the Sausage Maker.'),
    ],
  },
  {
    id: 'bread',
    name: 'Grain and bread',
    blurb: 'Fields to flour to bread: the first chain, taken further.',
    starts: ['farm', 'mill', 'bakery'],
    opens: ['farmyard', 'sweets'],
    steps: [
      make('bread', 'flour', 300, 500, 'Grain from a Farm to a Flour Mill.'),
      make('bread', 'bread', 300, 800, 'Flour to a Bakery. Towns love bread.'),
      build('bread', 'pastrykitchen', 1200),
      make('bread', 'pastry', 80, 2000, 'Flour, eggs and sugar to the Pastry Kitchen.'),
      build('bread', 'noodlemaker', 1000),
      make('bread', 'pasta', 80, 1800, 'Flour and eggs to the Noodle Maker.'),
    ],
  },
  {
    id: 'farmyard',
    name: 'The farmyard',
    blurb: 'Hens, vegetables and potatoes, and the kitchens that use them.',
    starts: ['chickenfarm', 'vegfarm', 'potatofarm'],
    opens: ['prepared'],
    steps: [
      build('farmyard', 'chickenfarm', 500),
      make('farmyard', 'eggs', 150, 700, 'Hens on pasture. Feathers are the by-product.'),
      build('farmyard', 'vegfarm', 500),
      build('farmyard', 'potatofarm', 500),
      build('farmyard', 'cannery', 900),
      make('farmyard', 'canned', 80, 1500, 'Vegetables and salt to the Cannery.'),
    ],
  },
  {
    id: 'dairy',
    name: 'Milk and cream',
    blurb: 'Cheese, butter and ice cream from the same herd.',
    starts: ['ranch', 'dairy', 'creamery'],
    opens: ['sweets'],
    steps: [
      make('dairy', 'cheese', 200, 600, 'Milk to the Dairy. Whey is the by-product, good for feed.'),
      build('dairy', 'creamery', 800),
      make('dairy', 'butter', 100, 1200, 'Milk to the Creamery.'),
      build('dairy', 'icecreamplant', 1500),
      make('dairy', 'icecream', 60, 2500, 'Milk and sugar to the Ice Cream Plant.'),
    ],
  },
  {
    id: 'wood',
    name: 'Timber and by-products',
    blurb: 'Lumber, firewood and pellets, and a use for the sawdust.',
    starts: ['forestry', 'sawmill', 'woodyard'],
    opens: ['paper'],
    steps: [
      make('wood', 'lumber', 400, 600, 'Logs to the Sawmill. Sawdust is the by-product.'),
      build('wood', 'woodyard', 400),
      make('wood', 'firewood', 150, 700, 'Logs to the Wood Yard.'),
      build('wood', 'pelletmill', 800),
      make('wood', 'pellets', 100, 1200, 'Sawdust to the Pellet Mill.'),
      build('wood', 'gardensupply', 800),
      make('wood', 'mulch', 100, 1200, 'Sawdust and bran to Garden Supply.'),
    ],
  },
  {
    id: 'paper',
    name: 'Paper and books',
    blurb: 'Logs to paper to books, for the towns that read.',
    starts: ['papermill', 'printery'],
    steps: [
      build('paper', 'papermill', 900),
      make('paper', 'paper', 100, 1500, 'Logs to the Paper Mill.'),
      build('paper', 'printery', 1800),
      make('paper', 'books', 60, 3000, 'Paper to the Printery. Boulevard towns pay well for books.'),
    ],
  },
  {
    id: 'glass',
    name: 'Sand and glass',
    blurb: 'Sand and coal to glass.',
    starts: ['sandpit', 'glassworks'],
    steps: [
      build('glass', 'sandpit', 400),
      build('glass', 'glassworks', 1200),
      make('glass', 'glass', 100, 2000, 'Sand and coal to the Glassworks.'),
    ],
  },
  {
    id: 'prepared',
    name: 'Prepared foods',
    blurb: 'Pizza, crisps and soft drinks: the finished foods.',
    starts: ['pizzeria', 'crispfryer', 'sodaplant', 'fishmeal'],
    opens: ['exotics'],
    steps: [
      build('prepared', 'pizzeria', 1500),
      make('prepared', 'pizza', 80, 2500, 'Flour, cheese and vegetables to the Pizzeria.'),
      build('prepared', 'sodaplant', 1200),
      make('prepared', 'soda', 100, 2000, 'Sugar and water to the Soft Drink Plant.'),
      build('prepared', 'crispfryer', 1800),
      make('prepared', 'crisps', 80, 3000, 'Potatoes, cooking oil and salt to the Crisp Fryer.'),
    ],
  },
  {
    id: 'oil',
    name: 'Oil and fuel',
    blurb: 'Cooking oil from sunflowers, then crude and fuel from the oil fields.',
    starts: ['oilseedfarm', 'oilpress', 'oilwell'],
    steps: [
      build('oil', 'oilseedfarm', 600),
      build('oil', 'oilpress', 1000),
      make('oil', 'cookoil', 100, 1500, 'Sunflower seeds to the Oil Press.'),
      build('oil', 'oilwell', 2000, 'Oil fields are found on a few islands.'),
      build('oil', 'refinery', 3000),
      make('oil', 'fuel', 100, 5000, 'Crude oil to the Fuel Refinery.'),
    ],
  },
  {
    id: 'hives',
    name: 'Honey and wax',
    blurb: 'Hives, candles and pillows.',
    starts: ['apiary', 'candlemaker', 'pillowmaker'],
    steps: [
      build('hives', 'apiary', 500),
      make('hives', 'honey', 80, 800, 'Hives among orchard blossom. Wax is the by-product.'),
      build('hives', 'candlemaker', 900),
      make('hives', 'candles', 60, 1800, 'Wax and cotton to the Candle Maker.'),
      build('hives', 'pillowmaker', 900),
      make('hives', 'pillows', 60, 1800, 'Feathers and cotton to the Pillow Maker.'),
    ],
  },
  {
    id: 'spirits',
    name: 'Vines and spirits',
    blurb: 'Grapes to wine, barley to spirits.',
    starts: ['vineyard', 'winery', 'distillery'],
    steps: [
      build('spirits', 'vineyard', 700),
      build('spirits', 'winery', 1800),
      make('spirits', 'wine', 80, 3000, 'Grapes and water to the Winery.'),
      build('spirits', 'distillery', 1800),
      make('spirits', 'spirits', 60, 3500, 'Barley and water to the Distillery.'),
    ],
  },
  {
    id: 'exotics',
    name: 'Island exotics',
    blurb: 'Cocoa, coffee, spices and mangoes, grown on islands and shipped home.',
    starts: ['cocoafarm', 'coffeefarm', 'spicefarm', 'mangogrove'],
    steps: [
      build('exotics', 'cocoafarm', 800, 'Islands only, so you will ship it.'),
      build('exotics', 'chocolatier', 2000),
      make('exotics', 'chocolate', 60, 4000, 'Cocoa, sugar and milk to the Chocolate Maker.'),
      build('exotics', 'coffeefarm', 800),
      build('exotics', 'spicefarm', 800),
      build('exotics', 'mangogrove', 800),
    ],
  },
  {
    id: 'machines',
    name: 'Machines',
    blurb: 'The top of the metal chain.',
    starts: ['machinery'],
    steps: [
      build('machines', 'machinery', 5000, 'Steel and tools in, machinery out.'),
      make('machines', 'machinery', 50, 10000, 'Keep steel and tools coming.'),
    ],
  },
  {
    id: 'rail',
    name: 'Rail',
    blurb: 'Rail yards, track and trains for the long, heavy hauls.',
    starts: ['railyard'],
    steps: [
      { id: 'l-rail-depot', label: 'Build a Rail Yard', hint: 'Place it at the edge of a town. A train stops only at a town that has one.', goal: { kind: 'depot', count: 1 }, reward: 1000 },
      { id: 'l-rail-depots', label: 'Build a second Rail Yard', hint: 'A line needs a yard at each end.', goal: { kind: 'depot', count: 2 }, reward: 1500 },
      { id: 'l-rail-track', label: 'Lay a rail line', hint: 'Logistics, Rail: drag from one yard to another.', goal: { kind: 'route', mode: 'rail', count: 1 }, reward: 2000 },
      { id: 'l-rail-train', label: 'Buy a Freight Train', hint: 'Buy it at a Rail Yard. Trains carry far more than trucks.', goal: { kind: 'vehicle', vehicle: 'train', count: 1 }, reward: 2500 },
    ],
  },
  {
    id: 'sea',
    name: 'Sea freight',
    blurb: 'Ports, sea lanes and ships.',
    starts: ['port'],
    steps: [
      build('sea', 'port', 1500),
      { id: 'l-sea-lane', label: 'Open a sea route', hint: 'Logistics, Sea: drag from one port to another.', goal: { kind: 'route', mode: 'sea', count: 1 }, reward: 2000 },
      { id: 'l-sea-boat', label: 'Buy a Cargo Boat', hint: 'Buy it at a Port.', goal: { kind: 'vehicle', vehicle: 'boat', count: 1 }, reward: 2500 },
    ],
  },
  {
    id: 'air',
    name: 'Air freight',
    blurb: 'Airports, air lanes and planes.',
    starts: ['airport'],
    steps: [
      build('air', 'airport', 4000),
      { id: 'l-air-lane', label: 'Open an air route', hint: 'Logistics, Air: drag from one airport to another.', goal: { kind: 'route', mode: 'air', count: 1 }, reward: 3000 },
      { id: 'l-air-plane', label: 'Buy a Cargo Plane', hint: 'Buy it at an Airport.', goal: { kind: 'vehicle', vehicle: 'plane', count: 1 }, reward: 4000 },
    ],
  },
];

export const LINES_BY_ID: Record<string, RouteLine> = Object.fromEntries(ROUTE_LINES.map((l) => [l.id, l]));
