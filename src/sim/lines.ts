// Route lines: from tier 3 the game is free, but the first building of a chain starts a short guided line for it. The line shows one step
// at a time and follows what the player is already making, so nothing pulls them across the map. Lines never gate a tier.
import { SITE_DEFS, type Good, type Quest, type SiteKind } from './defs';

export interface RouteLine {
  id: string;
  name: string;
  blurb: string;
  /** Building any of these starts the line. */
  starts: SiteKind[];
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
    steps: [
      build('meat', 'pigfarm', 600),
      build('meat', 'butcher', 1000),
      make('meat', 'meat', 100, 1500, 'Pork to the Butcher.'),
      build('meat', 'sausagemaker', 1800),
      make('meat', 'sausage', 60, 3000, 'Pork, salt and spices to the Sausage Maker.'),
    ],
  },
];

export const LINES_BY_ID: Record<string, RouteLine> = Object.fromEntries(ROUTE_LINES.map((l) => [l.id, l]));
