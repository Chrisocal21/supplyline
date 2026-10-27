// The unlock ladder: tiers 0 to 25, each opening three or four things (buildings and vehicles). One ordered table, so moving something
// earlier or later is a one-line change. defs.ts reads it to set every building's and vehicle's tier; ladder.test.ts checks it against the
// definitions (everything appears once, three or four a step, ingredients come first, routes come after the yard, port or airport they need).
import type { SiteKind, VehicleKind } from './defs';

export interface LadderStep {
  tier: number;
  /** Draft name, shown on the tier badge. */
  name: string;
  sites: SiteKind[];
  vehicles: VehicleKind[];
}

const step = (tier: number, name: string, sites: SiteKind[], vehicles: VehicleKind[] = []): LadderStep => ({ tier, name, sites, vehicles });

/** The vehicle every game starts with, and the town-made buildings: none of them is unlocked by a tier. */
export const STARTING_VEHICLES: VehicleKind[] = ['boxtruck'];
export const TOWN_MADE: SiteKind[] = ['market', 'freight', 'district', 'station'];

export const LADDER: LadderStep[] = [
  step(0, 'Startup', ['forestry', 'woodyard', 'ranch', 'dairy']),
  step(1, 'Lumber and Grain', ['sawmill', 'farm', 'mill', 'bakery']),
  step(2, 'Daily Bread', ['garage', 'orchard', 'juicepress'], ['bigtruck']),
  step(3, 'Brick and Stone', ['claypit', 'brickworks', 'quarry', 'stonecutter']),
  step(4, 'Water and Sand', ['sandpit', 'waterpump', 'scrapyard', 'hub']),
  step(5, 'Farmyard', ['chickenfarm', 'vegfarm', 'potatofarm', 'creamery']),
  step(6, 'Rails', ['railyard', 'coalmine'], ['train', 'rig']),
  step(7, 'Sweet Trade', ['sugarfarm', 'sugarrefinery', 'jamfactory', 'feedmill']),
  step(8, 'Cement and Granite', ['cementworks', 'concrete', 'granitecutter', 'pelletmill']),
  step(9, 'Harbor', ['harbor', 'saltpan', 'smokehouse'], ['fishboat']),
  step(10, 'The Kitchen', ['pastrykitchen', 'noodlemaker', 'gardensupply', 'glassworks']),
  step(11, 'Iron Age', ['cannery', 'oremine', 'smelter', 'toolworks']),
  step(12, 'Ports', ['port', 'sheepfarm'], ['barge', 'boat']),
  step(13, 'Preserves and Pork', ['fishcannery', 'slagcrusher', 'pigfarm', 'butcher']),
  step(14, 'Oil and Wool', ['oilseedfarm', 'oilpress', 'woolmill', 'cottonfarm']),
  step(15, 'Cloth', ['spinmill', 'weavery', 'tailor', 'workshop']),
  step(16, 'Fine Goods', ['papermill', 'printery', 'apiary', 'candlemaker']),
  step(17, 'Hives and Hauling', ['pillowmaker', 'barleyfarm', 'hopfarm'], ['convoy']),
  step(18, 'Air and Brewing', ['airport', 'brewery', 'silage'], ['plane']),
  step(19, 'Vines and Spirits', ['distillery', 'vineyard', 'winery', 'compostyard']),
  step(20, 'Prepared Foods', ['fishmeal', 'pizzeria', 'sodaplant'], ['heavytrain']),
  step(21, 'Snacks', ['spicefarm', 'sausagemaker', 'crispfryer', 'icecreamplant']),
  step(22, 'Sweet Exotics', ['cocoafarm', 'chocolatier', 'coffeefarm']),
  step(23, 'Heavy Industry', ['oilwell', 'refinery', 'steelworks']),
  step(24, 'Machines and Freight', ['mangogrove', 'machinery'], ['freighter']),
  step(25, 'Legacy', [], ['jet', 'containership']),
];

/** The tier a building or vehicle opens at on the ladder. The starting vehicle is tier 0; town-made buildings open with what they belong to. */
export function ladderTier(id: string): number | undefined {
  for (const s of LADDER) if ((s.sites as string[]).includes(id) || (s.vehicles as string[]).includes(id)) return s.tier;
  if ((STARTING_VEHICLES as string[]).includes(id)) return 0;
  if (id === 'station') return ladderTier('railyard');
  if ((TOWN_MADE as string[]).includes(id)) return 0;
  return undefined;
}
