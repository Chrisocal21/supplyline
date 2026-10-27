// The unlock ladder: tiers 0 to 25, each opening three or four things (buildings and vehicles). One ordered table, so moving something
// earlier or later is a one-line change. Not wired into the game yet: today every building and vehicle still carries its own `tier` in
// defs.ts. ladder.test.ts checks this table against the definitions (everything appears once, three or four a step, inputs come first).
import type { SiteKind, VehicleKind } from './defs';

export interface LadderStep {
  tier: number;
  /** Draft name, shown on the tier badge. */
  name: string;
  sites: SiteKind[];
  vehicles: VehicleKind[];
}

const step = (tier: number, name: string, sites: SiteKind[], vehicles: VehicleKind[] = []): LadderStep => ({ tier, name, sites, vehicles });

export const LADDER: LadderStep[] = [
  step(0, 'Startup', ['forestry', 'woodyard', 'ranch'], ['boxtruck']),
  step(1, 'Mill and Dairy', ['sawmill', 'dairy', 'farm', 'mill']),
  step(2, 'Daily Bread', ['bakery', 'orchard', 'juicepress'], ['bigtruck']),
  step(3, 'Brick and Stone', ['claypit', 'brickworks', 'quarry', 'stonecutter']),
  step(4, 'Water and Sand', ['sandpit', 'waterpump', 'scrapyard', 'hub']),
  step(5, 'Farmyard', ['chickenfarm', 'vegfarm', 'potatofarm', 'creamery']),
  step(6, 'Sweet Trade', ['sugarfarm', 'sugarrefinery', 'jamfactory', 'feedmill']),
  step(7, 'Coal and Cement', ['coalmine', 'cementworks', 'concrete', 'granitecutter']),
  step(8, 'The Kitchen', ['pastrykitchen', 'noodlemaker', 'gardensupply', 'pelletmill']),
  step(9, 'Harbor', ['harbor', 'saltpan', 'smokehouse'], ['fishboat']),
  step(10, 'Preserves', ['fishcannery', 'cannery', 'garage', 'glassworks']),
  step(11, 'Iron Age', ['oremine', 'smelter', 'toolworks', 'slagcrusher']),
  step(12, 'Rails', ['railyard'], ['train', 'rig']),
  step(13, 'Pork and Oil', ['pigfarm', 'butcher', 'oilseedfarm', 'oilpress']),
  step(14, 'Ports', ['port', 'sheepfarm'], ['barge', 'boat']),
  step(15, 'Cloth', ['woolmill', 'cottonfarm', 'spinmill', 'weavery']),
  step(16, 'Fine Goods', ['tailor', 'workshop', 'papermill', 'printery']),
  step(17, 'Hives and Hauling', ['apiary', 'candlemaker', 'pillowmaker'], ['convoy']),
  step(18, 'Brewing', ['barleyfarm', 'hopfarm', 'brewery', 'silage']),
  step(19, 'Vines and Spirits', ['distillery', 'vineyard', 'winery', 'compostyard']),
  step(20, 'Prepared Foods', ['fishmeal', 'pizzeria', 'sodaplant'], ['heavytrain']),
  step(21, 'Snacks', ['spicefarm', 'sausagemaker', 'crispfryer', 'icecreamplant']),
  step(22, 'Exotics', ['cocoafarm', 'chocolatier', 'coffeefarm', 'mangogrove']),
  step(23, 'Heavy Industry', ['oilwell', 'refinery', 'steelworks']),
  step(24, 'Machines and Air', ['machinery', 'airport'], ['plane', 'freighter']),
  step(25, 'Legacy', [], ['jet', 'containership']),
];

/** The tier a building or vehicle opens at on the ladder, or undefined for one that is not on it (town-made buildings). */
export function ladderTier(id: string): number | undefined {
  for (const s of LADDER) if ((s.sites as string[]).includes(id) || (s.vehicles as string[]).includes(id)) return s.tier;
  return undefined;
}
