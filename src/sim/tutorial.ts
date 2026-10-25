// The tutorial: short steps beside the quests, teaching the controls and the first chains. It can be switched on and off in the
// menu and never blocks anything: the quests are what advance the game. A step is done when the world shows it (a building stands,
// a road is laid) or when the player has done it on screen (moved the camera, opened a sheet), which the screen reports as a flag.
import type { World } from './world';

export interface TutStep {
  id: string;
  /** The tier it belongs to: shown from then on until done. */
  tier: number;
  title: string;
  text: string;
  /** Done when the screen has reported this flag. */
  flag?: string;
  /** Done when the world shows it. */
  test?: (w: World) => boolean;
  /** The build button to ring: the category tab and the tool. */
  coach?: { tab: string; tool: string };
}

const count = (w: World, kind: string): number => w.sites.filter((s) => s.kind === kind).length;

export const TUTORIAL: TutStep[] = [
  { id: 'look', tier: 0, title: 'Look around', text: 'Drag the map with the mouse, or press W A S D, to move the camera. Q and E turn it.', flag: 'moved' },
  { id: 'zoom', tier: 0, title: 'Zoom', text: 'Turn the mouse wheel to zoom in on the ground and out to the whole globe.', flag: 'zoomed' },
  { id: 'towns', tier: 0, title: 'Your first town', text: 'Press T to open the Towns sheet. A town grows when it is sold goods and supplied with building materials.', flag: 'sheet:towns' },
  { id: 'camp', tier: 0, title: 'A Forestry Camp', text: 'Open Production, pick Forestry Camp and click a ringed forest spot. Trees give logs.', test: (w) => count(w, 'forestry') >= 1, coach: { tab: 'production', tool: 'forestry' } },
  { id: 'truck', tier: 0, title: 'A truck', text: 'Click the camp, then Buy Box Truck. Pick a driver. The truck carries logs for you.', test: (w) => w.vehicles.length >= 1 },
  { id: 'road', tier: 0, title: 'A road', text: 'Open Logistics, pick Road, and drag from the camp to the town. Then open the truck and pick the town as its buyer.', test: (w) => w.routes.some((r) => r.mode === 'road' && r.grade !== undefined), coach: { tab: 'logistics', tool: 'route' } },
  { id: 'camps', tier: 0, title: 'More camps', text: 'One camp makes only about 9 logs a minute. Build two more Forestry Camps and road each one to the town.', test: (w) => count(w, 'forestry') >= 3 },
  { id: 'speed', tier: 0, title: 'Speed and pause', text: 'Press Space to pause, and plus or minus (or the speed buttons beside the map) to run faster while you wait.', flag: 'paused' },
  { id: 'company', tier: 0, title: 'Watch the money', text: 'Press C for the Company sheet: what you earn, and what the buildings and trucks cost to run every minute.', flag: 'sheet:company' },
  { id: 'yard', tier: 0, title: 'The Supply Yard', text: 'Send logs to the town: 160 of them builds the Supply Yard, which stores building materials for the town. It pays nothing.', test: (w) => w.places.some((p) => (p.stage ?? 2) >= 1) },
  { id: 'yardtruck', tier: 0, title: 'A yard truck', text: 'Click the Supply Yard and buy a Box Truck there. It carries the stored logs to the Market site.', test: (w) => w.vehicles.some((v) => w.sites.find((s) => s.id === v.homeId)?.kind === 'freight') },
  { id: 'market', tier: 0, title: 'The Market', text: 'Once 240 logs have reached the Market site it is built. Then towns buy your goods, and Tier 1 opens.', test: (w) => w.places.some((p) => (p.stage ?? 2) >= 2) },
  { id: 'sawmill', tier: 1, title: 'A Sawmill', text: 'Open Processing, pick Sawmill and click a for-sale lot beside a town street. Logs become lumber, which a town needs from Tier 1.', test: (w) => count(w, 'sawmill') >= 1, coach: { tab: 'processing', tool: 'sawmill' } },
  { id: 'switchon', tier: 1, title: 'Switch it on', text: 'Click the Sawmill and turn on Lumber under Production. A factory makes nothing until you do.', test: (w) => w.sites.some((s) => s.making) },
  { id: 'farm', tier: 1, title: 'Make food', text: 'The Market buys bread, cheese, milk, eggs and fruit. Build a Farm on open ground, a Flour Mill, and a Bakery, and road them in a line.', test: (w) => count(w, 'bakery') >= 1 && count(w, 'mill') >= 1 && count(w, 'farm') >= 1 },
  { id: 'sell', tier: 1, title: 'Where it goes', text: 'Click a building and open its Selling tab. A truck takes goods to whichever buyer you have joined it to.', flag: 'selected' },
  { id: 'fleet', tier: 1, title: 'The Fleet sheet', text: 'Press F to see every truck: how busy it is, how worn, who drives it. Idle trucks cost less but can be sold.', flag: 'sheet:fleet' },
  { id: 'production', tier: 1, title: 'The Production sheet', text: 'Press P to see every factory and what holds it up. Fix the red ones first.', flag: 'sheet:production' },
  { id: 'by', tier: 1, title: 'By-products', text: 'Many buildings also make sawdust, whey or bran. A Recycling Yard takes any of them so a line never jams.', test: (w) => count(w, 'scrapyard') >= 1 },
  { id: 'mechanic', tier: 1, title: 'Keep trucks running', text: 'Worn trucks go slower and carry less. Build a Mechanic Shop and hire a mechanic to repair them.', test: (w) => (w.mechanics ?? []).length >= 1 },
];

/** The first step that is not done yet, among the steps for the tier the player is at. Records every step the world already shows. */
export function tutorialNext(world: World, flags: ReadonlySet<string>): { step: TutStep; index: number; total: number } | null {
  // A game begun before the tutorial existed, or well under way: the steps for earlier tiers count as done.
  if (!world.tutorialDone) world.tutorialDone = world.tick > 6000 ? TUTORIAL.filter((s) => s.tier < world.tier || s.tier === 0).map((s) => s.id) : [];
  const done = world.tutorialDone;
  const steps = TUTORIAL.filter((s) => s.tier <= world.tier);
  for (const s of steps) {
    if (!done.includes(s.id) && ((s.test && s.test(world)) || (s.flag && flags.has(s.flag)))) done.push(s.id);
  }
  const i = steps.findIndex((s) => !done.includes(s.id));
  return i < 0 ? null : { step: steps[i], index: steps.filter((s) => done.includes(s.id)).length, total: steps.length };
}

/** Mark one step done by hand (the Skip button). */
export function tutorialSkip(world: World, id: string): void {
  const done = (world.tutorialDone ??= []);
  if (!done.includes(id)) done.push(id);
}
