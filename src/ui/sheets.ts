// The overview sheets: production (goods, rates, buildings), towns (what each town needs), quests (the tier goals)
// and the how-to-play guide. Drawn with the immediate-mode helper, like the rest of the HUD. All scroll with the wheel.
import {
  GOODS,
  GOOD_LIST,
  SITE_DEFS,
  STYLE_LABEL,
  DISTRICTS,
  DISTRICT_ORDER,
  MAX_DISTRICT_LEVEL,
  PATHS,
  PATH_QUESTS,
  PATH_COST,
  PATH_ORDER,
  PATH_TOWN_LEVEL,
  TICKS_PER_SECOND,
  TIERS,
  TOWN_LEVELS,
  type Good,
} from '../sim/defs';
import { BANK_TIER, FUND_FEE, LOAN_RATE, REAL_MONEY_ENABLED, SAVINGS_RATE, bankOf, borrow, creditLimit, deposit, divest, fundValue, invest, netWorth, repay, withdraw } from '../sim/bank';
import { pathMastered, pathQuestState, questState, tierUnlocks } from '../sim/quests';
import { buildDistrict, choosePath, districtBoost, districtCost, districtError, districtLevel, districtRevenue, districtSatisfaction, pathError, townUpkeep } from '../sim/town';
import { dockDemand, isHomePlot, plotTiles, radiusOf, produces, siteCap, stockOf, unitPrice, wants, type Place, type Site, type World } from '../sim/world';
import { COLORS, Im } from './imui';
import { isTouch } from './inputmode';

export type SheetId = 'production' | 'towns' | 'bank' | 'quests' | 'guide';

interface View {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const wrapped = (world: World, x: number): number => ((x % world.width) + world.width) % world.width;
const fmt = (n: number): string => Math.floor(n).toLocaleString('en-US');
/** The how-to-play guide: a card per topic, in the order a new player needs them. */
/** Wording per input type. A plain string is shared; touch also gets Click turned into Tap. */
type Body = string | { mouse: string; touch: string };
const bodyText = (b: Body): string => {
  if (typeof b === 'string') return isTouch() ? b.replace(/Click/g, 'Tap').replace(/click/g, 'tap') : b;
  return isTouch() ? b.touch : b.mouse;
};
/** One box in the guide: what it is, what it does in one line, the details, and the one thing to try. */
interface GuideCard {
  title: string;
  /** What it does, in one line. */
  sum: string;
  body?: Body;
  /** The one thing to try, in its own box. */
  todo?: Body;
  icon?: string;
  /** A numbered step: drawn with a big number badge. */
  step?: number;
}

interface GuideSection {
  id: string;
  label: string;
  blurb: string;
  color: number;
  cards: GuideCard[];
}

const GUIDE: GuideSection[] = [
  {
    id: 'steps',
    label: 'Steps',
    blurb: 'Do these in order. Each one takes a minute.',
    color: 0xf2a33a,
    cards: [
      {
        step: 1,
        title: 'Make raw goods',
        sum: 'Build a camp or farm on a glowing ring.',
        body: 'Open Production at the bottom.\nPick a building.\nRings light up on the map.\nClick a ring to build there.\nPurer spots work faster.',
        todo: 'Done when you see your first building.',
        icon: 'thumb-forestry',
      },
      {
        step: 2,
        title: 'Make better goods',
        sum: 'A factory turns raw goods into better ones.',
        body: 'Open Processing.\nPick a factory, like a Sawmill.\nClick a for-sale lot in a town.\nClick your new factory and press Start.',
        todo: 'Logs go in, lumber comes out.',
        icon: 'thumb-sawmill',
      },
      {
        step: 3,
        title: 'Build a road',
        sum: 'A road joins your buildings together.',
        body: {
          mouse: 'Open Logistics and pick Road.\nDrag from one building to the other.\nClick to add a corner.\nEnter finishes. Esc cancels.\nThe road goes around hills and over water by itself.',
          touch: 'Open Logistics and pick Road.\nDrag from one building to the other.\nTap to add a corner.\nUse the buttons to undo, cancel or finish.\nThe road goes around hills and over water by itself.',
        },
        todo: 'A road carries nothing. Trucks do. That is the next step.',
        icon: 'thumb-route',
      },
      {
        step: 4,
        title: 'Buy a truck',
        sum: 'Trucks carry your goods along the road.',
        body: 'Click your camp or farm.\nPress Buy.\nThe truck waits at the gate.\nIt leaves when a road leads to a buyer.',
        todo: 'No truck, no sales.',
        icon: 'thumb-boxtruck',
      },
      {
        step: 5,
        title: 'Sell',
        sum: 'Choose who buys your goods.',
        body: 'Click a building.\nFind Who buys.\nTap Sell here on a buyer.\nGreen lines on the map show where you sell.\nCamps and farms sell to everyone they touch.',
        todo: 'Money goes up. That is the loop. Now do it bigger.',
        icon: 'thumb-market',
      },
    ],
  },
  {
    id: 'basics',
    label: 'Basics',
    blurb: 'The big picture and how to get around.',
    color: 0x4aa3d8,
    cards: [
      { title: 'The big idea', sum: 'You make things. Towns buy them. You get paid.', body: 'Towns grow as you sell to them.\nBig towns want more kinds of goods.\nFinish quests to unlock new buildings and vehicles.', todo: 'Make stuff, move it to a town, get money.' },
      {
        title: 'The top box',
        sum: 'Your coach. It tells you what to do next.',
        body: 'Click any building and look at the top box.\nIt spots the problem and gives you a button.\nBuyers are full: sell to another town.\nGoods pile up: buy more trucks.\nOut of an input: build a road to a supplier.',
        todo: 'When it says All running, you are done.',
      },
      {
        title: 'Looking around',
        sum: 'Move, turn and zoom the map.',
        body: {
          mouse: 'Drag to move the map.\nRight-drag to turn.\nScroll to zoom.\nW A S D also move you.',
          touch: 'Drag to move.\nPinch to zoom.\nTwist two fingers to turn.',
        },
        todo: 'Zoom all the way out to see the whole globe.',
      },
      { title: 'Quests and tiers', sum: 'Goals that unlock new things and pay money.', body: 'The bar at the top shows your next quest.\nClick it to see them all.\nFinish a whole tier to unlock new buildings and vehicles.', todo: 'Follow the bar when you are not sure what to do.' },
    ],
  },
  {
    id: 'money',
    label: 'Sell and money',
    blurb: 'Where the money comes from and how to use the bank.',
    color: 0x58c58a,
    cards: [
      {
        title: 'Markets',
        sum: 'Where towns buy your goods.',
        body: 'Each town has a Market for finished goods, like lumber and flour.\nFrom level 2 it also has a Supply Yard, where builders and factories buy raw goods and leftovers.\nA town pays less for what it is already full of.\nIt uses goods up slowly, so it wants more later.\nA surge pays extra. A glut pays less.',
        todo: 'Open Towns to see what each town wants and pays.',
        icon: 'thumb-market',
      },
      { title: 'Running costs', sum: 'What your stuff costs every minute.', body: 'Buildings, vehicles and districts cost a little each minute.\nThe number under your money is what is left after costs.\nBigger vehicles carry more but cost more.', todo: 'If that number goes red, sell more or sell a vehicle.' },
      { title: 'Bank: Loan', sum: 'Borrow money now, pay it back later.', body: 'Open Bank (unlocks at Tier 1).\nYou can borrow up to your limit.\nThe limit grows as you do well.\nIt costs 1% every minute until paid back.', todo: 'Borrow to build, then pay it back fast.' },
      { title: 'Bank: Savings', sum: 'Park money and earn a little. Safe.', body: 'Put money in the savings account.\nIt earns 0.4% every minute.\nTake it out any time.', todo: 'Good for money you are not using yet.' },
      { title: 'Bank: Fund', sum: 'Buy shares. The price goes up and down.', body: 'Buy shares when you think the price is low.\nSell when it is high.\nYou can win or lose.\nSelling costs a 2% fee.', todo: 'Only use money you can spare.' },
    ],
  },
  {
    id: 'move',
    label: 'Move goods',
    blurb: 'Warehouses and terminals. How goods travel between towns.',
    color: 0xd68a2e,
    cards: [
      {
        title: 'Do I need these?',
        sum: 'Only when your goods get stuck.',
        body: 'Same town or a road all the way: trucks are enough.\nGoods piling up with nowhere to go: build a Warehouse.\nWater or a long way in between: build a Freight Terminal.',
        todo: 'Do not build them until the top box tells you to.',
      },
      {
        title: 'Warehouse',
        sum: 'A big shelf for your goods.',
        body: 'Goods wait here until someone wants them.\nWhen buyers are full, the extra goes here instead of being wasted.\nFactories next to it grab what they need.\nIt is like a real warehouse.',
        todo: 'Build one next to your factories.',
        icon: 'thumb-hub',
      },
      {
        title: 'Freight Terminal',
        sum: 'A loading dock for trains, ships and planes.',
        body: 'It is the Rail Yard, the Port or the Airport.\nUse one when a truck cannot get there: over water, or very far.\nGoods go on at one terminal and come off at the other.\nIn its menu pick how full a vehicle must be before it leaves.',
        todo: 'Build one in each town. Join them with rail, sea or air.',
      },
      {
        title: 'How they fit',
        sum: 'The trip of your goods, step by step.',
        body: 'Farm makes grain.\nTruck takes it to the Warehouse.\nTruck takes it to the Terminal.\nTrain, ship or plane carries it to the far Terminal.\nTruck takes it to the far Warehouse.\nThe factory next to it makes flour.',
        todo: 'Skip any step you do not need.',
      },
      { title: 'Highways and rail', sum: 'Faster roads and big trains.', body: 'Highways make trucks about a third faster.\nBuild a highway over a road. You only pay the difference.\nRail carries huge loads.\nTrains reach a town through a Rail Yard at its edge.', todo: 'Upgrade busy roads to highways.' },
      { title: 'Vehicles', sum: 'Bigger vehicles carry more.', body: 'Box Truck, Truck Fleet, Train, Plane, Jet, Ship.\nSelect a building and press Buy.\nEach vehicle can Upgrade, Sell, or be sent to one destination.', todo: 'Upgrade a truck instead of buying lots of small ones.' },
      { title: 'By-products', sum: 'A second good that comes out with the first.', body: 'Farms, mines, camps and factories make one too.\nExamples: sawdust, bran, whey, gravel, stone.\nIt has its own page in the building menu: tap By-product at the top.\nIt has its own buyers and its own trucks.\nThe main trucks never carry it. Buy a truck on the By-product page.', todo: 'Like a sawmill: flatbeds for lumber, hopper trucks for sawdust.' },
      { title: 'Buyers for by-products', sum: 'Most go to the Supply Yard, or to a factory that uses them.', body: 'Sawdust becomes pellets.\nBran and whey become animal feed.\nGravel becomes cement.\nIf one piles up, the top box tells you who would buy it.', todo: 'Do not waste them. They are free money.' },
    ],
  },
  {
    id: 'towns',
    label: 'Towns',
    blurb: 'Growing and shaping towns.',
    color: 0xc0504d,
    cards: [
      { title: 'Growing towns', sum: 'More sales and more variety make towns level up.', body: 'Every sale adds growth.\nThe more kinds of goods you sell, the higher it can go.\nBig towns want more and pay more.', todo: 'Sell a town something new.' },
      { title: 'Districts', sum: 'Special buildings a town builds as it grows.', body: 'Select a town and open Manage town.\nExamples: Farmers Market, Hardware Store.\nEach likes certain goods and pays more for them.\nEach costs money to run.', todo: 'Keep a district supplied so it earns.', icon: 'thumb-market' },
      { title: 'Specialise', sum: 'Pick one path for a town. It is permanent.', body: 'At level 3 pick: Breadbasket, The Forge, Trade Hub or The Boulevard.\nEach path makes certain goods pay more.', todo: 'Give different towns different jobs.' },
      { title: 'Roads and houses', sum: 'Houses move over to make room. None are deleted.', body: 'When a road or building takes a house\'s spot, the house moves to a free spot nearby.', todo: 'Build freely. Towns adjust.' },
    ],
  },
  {
    id: 'help',
    label: 'Stuck?',
    blurb: 'Click the building. The top box says what is wrong and has the fix. Here is what each message means.',
    color: 0x9a8fd0,
    cards: [
      { title: 'Buyers are full', sum: 'Nobody will take your goods right now.', body: 'The towns you sell to have enough.\nSell to another town: tap the Road button.\nOr build a Warehouse to hold the extra.', todo: 'Extra goods wait. They are not lost.' },
      { title: 'Goods piling up', sum: 'Your storage is nearly full.', body: 'Not enough trucks to carry it all.\nTap Buy to add a truck.\nOr tap Upgrade for more room.', todo: 'A full store stops making more.' },
      { title: 'Out of an input', sum: 'A factory has nothing to work with.', body: 'It needs a raw good, like logs or grain.\nBuild a road from something that makes it.\nOr put a Warehouse next to the factory and stock it.', todo: 'Check who sells to it in Who buys.' },
      { title: 'No truck or no route', sum: 'Goods are ready but nothing carries them.', body: 'Tap Buy to get a truck.\nTap Sell here on a buyer.\nCheck a road really joins the two.', todo: 'A road alone carries nothing.' },
      { title: 'Terminal has goods, nothing leaves', sum: 'There is no line to another town.', body: 'A terminal needs a track, sea route or flight.\nJoin it to a terminal in the other town.\nThen buy a train, ship or plane there.', todo: 'Build the line first, then the vehicle.' },
      { title: 'Not enough money', sum: 'You cannot afford the next step.', body: 'Check the Bank for a loan.\nSell goods to earn.\nSell a vehicle you do not need.', todo: 'Pay loans back fast. Interest never stops.' },
      {
        title: 'Shortcuts',
        sum: 'Faster ways to do things.',
        body: {
          mouse: 'Tab: next category.\n1 to 9: pick a card.\nP: production. T: towns. G: quests. H: this guide.\nSpace: pause. Esc: close.\nIt saves by itself every 20 seconds.',
          touch: 'Everything is a button.\nIt saves by itself every 20 seconds.',
        },
      },
    ],
  },
];

const KIND_ORDER: { kind: 'raw' | 'material' | 'product' | 'byproduct'; label: string }[] = [
  { kind: 'raw', label: 'RAW' },
  { kind: 'material', label: 'MATERIALS' },
  { kind: 'product', label: 'PRODUCTS' },
  { kind: 'byproduct', label: 'BY-PRODUCTS' },
];

/** Per-minute production and consumption, measured over the last minute of game time. */
export class Rates {
  private samples: { tick: number; made: Partial<Record<Good, number>>; used: Partial<Record<Good, number>> }[] = [];

  update(w: World): void {
    const last = this.samples[this.samples.length - 1];
    if (last && w.tick < last.tick) this.samples = [];
    if (!last || w.tick - last.tick >= 50) {
      this.samples.push({ tick: w.tick, made: { ...w.produced }, used: { ...w.consumed } });
      if (this.samples.length > 13) this.samples.shift();
    }
  }

  private rate(which: 'made' | 'used', g: Good): number {
    const a = this.samples[0];
    const b = this.samples[this.samples.length - 1];
    if (!a || !b || b.tick <= a.tick) return 0;
    return (((b[which][g] ?? 0) - (a[which][g] ?? 0)) / (b.tick - a.tick)) * TICKS_PER_SECOND * 60;
  }
  made(g: Good): number {
    return this.rate('made', g);
  }
  used(g: Good): number {
    return this.rate('used', g);
  }
}

export interface SheetHooks {
  status: (s: Site) => { text: string; color: number };
  hasTexture: (key: string) => boolean;
  focusSite: (s: Site) => void;
  focusPlace: (p: Place) => void;
  select: (id: SheetId) => void;
  clip: (x: number, y: number, w: number, h: number) => void;
  toast: (text: string) => void;
}

export class Sheets {
  scroll = 0;
  /** The town being managed on the Towns sheet, or null for the list of towns. */
  manage: number | null = null;
  private maxScroll = 0;

  constructor(
    private readonly im: Im,
    private readonly cim: Im,
    private readonly rates: Rates,
    private readonly hooks: SheetHooks,
  ) {}

  /** Draw the open sheet inside the box. Returns the box so the caller can block input and route wheel events. */
  draw(world: World, id: SheetId, x: number, y: number, w: number, h: number, close: () => void): void {
    const im = this.im;
    im.rect(2, x, y, w, h, COLORS.panel, 0.97, 18, COLORS.line, 1);
    im.block({ x, y, w, h });

    // Header: tabs and a close button.
    const tabs: [SheetId, string][] = [['production', 'Production'], ['towns', 'Towns'], ['bank', 'Bank'], ['quests', 'Quests'], ['guide', 'How to play']];
    tabs.forEach(([tid, label], i) => {
      const tx = x + 18 + i * 128;
      const on = tid === id;
      const hov = im.hit(`sheetTab${tid}`, tx, y + 14, 120, 40, () => {
        this.hooks.select(tid);
        this.scroll = 0;
      }, 3);
      im.rect(3, tx, y + 14, 120, 40, on ? 0x1f2c3a : hov ? 0x1a2431 : 0x131b25, 1, 12, on ? COLORS.accent : COLORS.line, 1, on ? 2 : 1);
      im.text(`sheetTabT${tid}`, label, tx + 60, y + 24, { size: 15, bold: true, color: on ? COLORS.accent : COLORS.text, align: 'center', layer: 3 });
    });
    const cx = x + w - 58;
    const chov = im.hit('sheetClose', cx, y + 14, 40, 40, close, 3);
    im.rect(3, cx, y + 14, 40, 40, chov ? 0x2a3646 : 0x1b2430, 1, 20);
    im.line(3, cx + 14, y + 28, cx + 26, y + 40, COLORS.text, 1, 2.5);
    im.line(3, cx + 26, y + 28, cx + 14, y + 40, COLORS.text, 1, 2.5);
    im.line(3, x + 14, y + 66, x + w - 14, y + 66, COLORS.line, 1, 1);

    const top = y + 76;
    const bottom = y + h - 12;
    const view = { x0: x + 18, x1: x + w - 18, y0: top, y1: bottom };
    this.hooks.clip(x, top, w, bottom - top);
    this.cim.clipBox = { x, y: top, w, h: bottom - top };
    const contentH = id === 'production' ? this.production(world, view) : id === 'towns' ? (this.manage !== null && world.places.some((p) => p.id === this.manage) ? this.townDetail(world, world.places.find((p) => p.id === this.manage)!, view) : this.towns(world, view)) : id === 'bank' ? this.bank(world, view) : id === 'quests' ? this.quests(world, view) : this.guide(view);
    this.maxScroll = Math.max(0, contentH - (bottom - top));
    this.scroll = Math.max(0, Math.min(this.maxScroll, this.scroll));
    if (this.maxScroll > 0) {
      const trackH = bottom - top - 8;
      const barH = Math.max(36, (trackH * (bottom - top)) / contentH);
      const by = top + 4 + (trackH - barH) * (this.scroll / this.maxScroll);
      im.rect(3, x + w - 10, top + 4, 4, trackH, 0xffffff, 0.06, 2);
      im.rect(3, x + w - 10, by, 4, barH, 0xffffff, 0.3, 2);
    }
  }

  scrollBy(dy: number): void {
    this.scroll = Math.max(0, Math.min(this.maxScroll, this.scroll + dy));
  }

  // ---- production sheet ----

  private production(world: World, v: View): number {
    const im = this.cim;
    const colW = 392;
    let ly = v.y0 - this.scroll;
    const lx = v.x0;
    const vis = (y: number, hh: number): boolean => y + hh > v.y0 && y < v.y1;

    // Left column: every good, grouped, with what is in store and how fast it is made and used.
    if (vis(ly, 24)) {
      im.text('pg-h-stock', 'In store', lx + 232, ly + 2, { size: 11, bold: true, color: COLORS.muted, align: 'right', layer: 3 });
      im.text('pg-h-made', 'Made/min', lx + 308, ly + 2, { size: 11, bold: true, color: COLORS.muted, align: 'right', layer: 3 });
      im.text('pg-h-used', 'Used/min', lx + colW, ly + 2, { size: 11, bold: true, color: COLORS.muted, align: 'right', layer: 3 });
    }
    ly += 24;
    for (const group of KIND_ORDER) {
      const goods = GOOD_LIST.filter((g) => GOODS[g].kind === group.kind);
      if (vis(ly, 22)) im.text(`pg-g-${group.kind}`, group.label, lx, ly + 4, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
      ly += 22;
      for (const g of goods) {
        if (vis(ly, 26)) {
          const stored = world.sites.filter((s) => !SITE_DEFS[s.kind].dock).reduce((n, s) => n + stockOf(s, g), 0);
          const made = this.rates.made(g);
          const used = this.rates.used(g);
          im.rect(3, lx, ly + 5, 12, 12, GOODS[g].color, 1, 3);
          im.text(`pg-n-${g}`, GOODS[g].label, lx + 22, ly + 3, { size: 13, layer: 3 });
          im.text(`pg-s-${g}`, fmt(stored), lx + 232, ly + 3, { size: 13, align: 'right', layer: 3 });
          im.text(`pg-m-${g}`, made > 0.05 ? made.toFixed(1) : '-', lx + 308, ly + 3, { size: 13, color: made > 0.05 ? COLORS.good : COLORS.muted, align: 'right', layer: 3 });
          im.text(`pg-u-${g}`, used > 0.05 ? used.toFixed(1) : '-', lx + colW, ly + 3, { size: 13, color: used > 0.05 ? COLORS.warn : COLORS.muted, align: 'right', layer: 3 });
          im.line(3, lx, ly + 25, lx + colW, ly + 25, 0xffffff, 0.05, 1);
        }
        ly += 26;
      }
    }
    const leftH = ly + this.scroll - v.y0;

    // Right column: market swings, then every building and how it is doing.
    const rx = v.x0 + colW + 28;
    const rw = v.x1 - rx;
    let ry = v.y0 - this.scroll;
    const swings = world.events.filter((e) => e.until > world.tick);
    if (vis(ry, 22)) im.text('pg-ev-h', 'MARKET SWINGS', rx, ry + 3, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
    ry += 22;
    if (swings.length === 0) {
      if (vis(ry, 24)) im.text('pg-ev-none', 'Prices are steady.', rx, ry + 2, { size: 13, color: COLORS.muted, layer: 3 });
      ry += 28;
    }
    swings.forEach((e, i) => {
      if (vis(ry, 28)) {
        const up = e.mult > 1;
        const secs = Math.max(0, Math.round((e.until - world.tick) / TICKS_PER_SECOND));
        im.rect(3, rx, ry, rw, 26, up ? 0x15332a : 0x38201d, 1, 8, up ? COLORS.good : COLORS.bad, 0.6);
        im.text(`pg-ev-${i}`, `${GOODS[e.good].label}  ${up ? '+' : '-'}${Math.round(Math.abs(e.mult - 1) * 100)}%`, rx + 12, ry + 5, { size: 13, bold: true, color: up ? COLORS.good : COLORS.bad, layer: 3 });
        im.text(`pg-evt-${i}`, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} left`, rx + rw - 12, ry + 6, { size: 12, color: COLORS.muted, align: 'right', layer: 3 });
      }
      ry += 32;
    });
    ry += 10;

    const buildings = world.sites.filter((s) => !SITE_DEFS[s.kind].dock && !SITE_DEFS[s.kind].station);
    if (vis(ry, 22)) im.text('pg-b-h', `BUILDINGS  ${buildings.length}`, rx, ry + 3, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
    ry += 22;
    if (buildings.length === 0) {
      if (vis(ry, 24)) im.text('pg-b-none', 'Nothing built yet. Pick Production from the menu below.', rx, ry + 2, { size: 13, color: COLORS.muted, wrap: rw, layer: 3 });
      ry += 30;
    }
    // Problems first: full and starved buildings float to the top.
    const rank = (s: Site): number => {
      const c = this.hooks.status(s).color;
      return c === COLORS.bad ? 0 : c === COLORS.warn ? 1 : 2;
    };
    const sorted = [...buildings].sort((a, b) => rank(a) - rank(b) || a.id - b.id);
    for (const s of sorted) {
      const rh = 46;
      if (vis(ry, rh)) {
        const def = SITE_DEFS[s.kind];
        const st = this.hooks.status(s);
        const hov = im.hit(`pg-row-${s.id}`, rx, ry, rw, rh - 4, () => this.hooks.focusSite(s), 3);
        im.rect(3, rx, ry, rw, rh - 4, hov ? 0x1f2b3a : COLORS.panelAlt, 1, 10, COLORS.line, 1);
        const key = `thumb-${s.kind}`;
        if (this.hooks.hasTexture(key)) im.image(`pg-i-${s.id}`, key, rx + 6, ry + 3, 36, 36, 1, 3);
        im.text(`pg-nm-${s.id}`, s.name, rx + 50, ry + 4, { size: 13, bold: true, layer: 3 });
        im.text(`pg-lv-${s.id}`, `${def.label} · Lv ${s.level}`, rx + 50, ry + 22, { size: 11, color: COLORS.muted, layer: 3 });
        im.circle(3, rx + rw - 150, ry + 17, 4, st.color);
        im.text(`pg-st-${s.id}`, st.text, rx + rw - 140, ry + 10, { size: 12, color: st.color, wrap: 128, layer: 3 });
        const ratio = this.fill(world, s);
        im.bar(3, rx + 50, ry + 38, 90, 3, ratio, ratio > 0.85 ? COLORS.bad : COLORS.good);
      }
      ry += rh;
    }
    const rightH = ry + this.scroll - v.y0;
    return Math.max(leftH, rightH) + 8;
  }

  /** How full the fullest shelf of a building is, 0..1. */
  private fill(world: World, s: Site): number {
    const cap = siteCap(world, s);
    const goods = Array.from(new Set([...produces(s), ...wants(world, s)]));
    return goods.reduce((m, g) => Math.max(m, stockOf(s, g) / cap), 0);
  }

  // ---- towns sheet ----

  private towns(world: World, v: View): number {
    const gap = 14;
    const cols = v.x1 - v.x0 > 1500 ? 3 : v.x1 - v.x0 > 760 ? 2 : 1;
    const cw = (v.x1 - v.x0 - gap * (cols - 1)) / cols;
    const places = [...world.places].sort((a, b) => b.level - a.level || b.growth - a.growth || a.id - b.id);
    if (places.length === 0) return 0;

    const chipW = 116;
    const chipH = 30;
    const perRow = Math.max(1, Math.floor((cw - 28 + 6) / (chipW + 6)));
    const heights = places.map((p) => this.townCardHeight(world, p, cw, perRow, chipH));
    const colY = new Array<number>(cols).fill(0);
    places.forEach((p, i) => {
      // Shortest column first keeps the two sides balanced.
      let c = 0;
      for (let k = 1; k < cols; k++) if (colY[k] < colY[c]) c = k;
      const cx = v.x0 + c * (cw + gap);
      const cy = v.y0 - this.scroll + colY[c];
      colY[c] += heights[i] + gap;
      const hh = heights[i];
      if (cy + hh < v.y0 || cy > v.y1) return;
      this.townCard(world, p, cx, cy, cw, hh, chipW, chipH, perRow);
    });
    return Math.max(...colY) + 4;
  }

  private townCard(world: World, p: Place, x: number, y: number, w: number, h: number, chipW: number, chipH: number, perRow: number): void {
    const im = this.cim;
    const lv = TOWN_LEVELS[p.level - 1];
    const hov = im.hit(`tw-card-${p.id}`, x, y, w, h, () => this.hooks.focusPlace(p), 3);
    im.rect(3, x, y, w, h, hov ? 0x1b2634 : COLORS.panelAlt, 1, 14, COLORS.line, 1);
    im.text(`tw-n-${p.id}`, p.name, x + 16, y + 12, { size: 17, bold: true, layer: 3 });
    const mhov = im.hit(`tw-m-${p.id}`, x + w - 170, y + 10, 84, 28, () => {
      this.manage = p.id;
      this.scroll = 0;
    }, 4);
    im.rect(3, x + w - 170, y + 10, 84, 28, mhov ? 0x2a3b50 : 0x1b2735, 1, 14, COLORS.accent, 1);
    im.text(`tw-mt-${p.id}`, 'Manage', x + w - 128, y + 16, { size: 13, bold: true, color: COLORS.accent, align: 'center', layer: 5 });
    im.rect(3, x + w - 76, y + 12, 60, 24, COLORS.accent, 1, 12);
    im.text(`tw-l-${p.id}`, `Lv ${p.level}`, x + w - 46, y + 16, { size: 12, bold: true, color: 0x1b1204, align: 'center', layer: 4 });
    im.text(`tw-s-${p.id}`, `${radiusOf(p) > 3 ? 'Major city' : lv.name}  ·  ${STYLE_LABEL[p.style]}  ·  population ${fmt(lv.pop * (radiusOf(p) > 3 ? 4 : 1))}`, x + 16, y + 38, { size: 12, color: COLORS.muted, layer: 3 });

    const next = TOWN_LEVELS[p.level];
    const kinds = GOOD_LIST.filter((g) => (p.delivered[g] ?? 0) > 0).length;
    if (next) {
      im.bar(3, x + 16, y + 64, w - 160, 8, p.growth / next.growth, COLORS.good);
      im.text(`tw-g-${p.id}`, `${fmt(p.growth)} / ${fmt(next.growth)}`, x + w - 16, y + 59, { size: 12, color: COLORS.muted, align: 'right', layer: 3 });
      im.text(`tw-v-${p.id}`, `${kinds} kind${kinds === 1 ? '' : 's'} of goods sold so far`, x + 16, y + 78, { size: 11, color: COLORS.muted, layer: 3 });
    } else {
      im.text(`tw-g-${p.id}`, 'Fully grown', x + 16, y + 59, { size: 12, color: COLORS.good, layer: 3 });
    }
    const plots = plotTiles(world, p);
    const forSale = plots.map((t, i) => ({ t, i })).filter(({ i }) => i >= 2 && !isHomePlot(p, i));
    const used = forSale.filter(({ t }) => world.sites.some((s) => s.x === wrapped(world, t.x) && s.y === t.y)).length;
    im.text(`tw-p-${p.id}`, `Plots built ${used}/${forSale.length}`, x + w - 16, y + 78, { size: 11, color: COLORS.muted, align: 'right', layer: 3 });

    // What it needs to level up, in words.
    const n = this.townNeeds(world, p);
    const ny = y + 100;
    if (next) {
      const lines: string[] = [];
      if (n.moreKinds > 0) lines.push(`Needs ${n.moreKinds} more kind${n.moreKinds > 1 ? 's' : ''} of good${n.fresh.length ? `: try ${n.fresh.slice(0, 3).map((g) => GOODS[g].label).join(', ')}` : ''}`);
      if (p.growth < next.growth) lines.push(`${fmt(next.growth - p.growth)} more in sales`);
      im.text(`tw-next-${p.id}`, lines.length ? `To level up: ${lines.join('  ·  ')}` : 'Ready to level up: the next delivery does it', x + 16, ny, { size: 12, color: lines.length ? COLORS.text : COLORS.good, wrap: w - 32, layer: 3 });
    }
    let cy = ny + (next ? 24 : 0);
    if (n.market) {
      im.text(`tw-mh-${p.id}`, n.bring.length ? 'BRING NEXT' : 'MARKET', x + 16, cy, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
      cy += 18;
      if (n.bring.length === 0) {
        im.text(`tw-mok-${p.id}`, 'Well stocked on everything it asks for.', x + 16, cy, { size: 12, color: COLORS.good, layer: 3 });
        cy += 22;
      } else {
        const cap = siteCap(world, n.market);
        n.bring.slice(0, 6).forEach((g, i) => {
          const gx = x + 16 + (i % perRow) * (chipW + 6);
          const gy = cy + Math.floor(i / perRow) * (chipH + 6);
          const have = stockOf(n.market!, g) / cap;
          const color = have > 0.05 ? COLORS.warn : COLORS.bad;
          im.rect(3, gx, gy, chipW, chipH, 0x10161e, 1, 8, color, 0.7);
          im.text(`tw-c-${p.id}-${g}`, GOODS[g].label, gx + 8, gy + 3, { size: 11, bold: true, layer: 3 });
          im.text(`tw-cp-${p.id}-${g}`, (p.delivered[g] ?? 0) > 0 ? `$${unitPrice(world, n.market!, g).toFixed(1)}` : 'NEW', gx + chipW - 8, gy + 3, { size: 11, bold: (p.delivered[g] ?? 0) === 0, color: (p.delivered[g] ?? 0) > 0 ? COLORS.warn : COLORS.good, align: 'right', layer: 3 });
          im.bar(3, gx + 8, gy + 21, chipW - 16, 4, have, color);
        });
        cy += Math.ceil(Math.min(6, n.bring.length) / perRow) * (chipH + 6);
        if (n.bring.length > 6) {
          im.text(`tw-more-${p.id}`, `+${n.bring.length - 6} more asked for`, x + 16, cy - 2, { size: 11, color: COLORS.muted, layer: 3 });
          cy += 16;
        }
      }
      if (n.stocked.length) {
        im.text(`tw-st-${p.id}`, `Stocked: ${n.stocked.map((g) => GOODS[g].label).join(', ')}`, x + 16, cy, { size: 11, color: COLORS.muted, wrap: w - 32, layer: 3 });
        cy += this.wrapLines(`Stocked: ${n.stocked.map((g) => GOODS[g].label).join(', ')}`, w - 32) * 14 + 6;
      }
    }
    if (n.freight.length) {
      const text = `Freight yard buys raw goods (${n.freight.length}): ${n.freight.map((g) => GOODS[g].label).join(', ')}`;
      im.text(`tw-fr-${p.id}`, text, x + 16, cy + 2, { size: 11, color: COLORS.muted, wrap: w - 32, layer: 3 });
    }
  }

  private wrapLines(text: string, width: number): number {
    return Math.max(1, Math.ceil((text.length * 6.2) / width));
  }

  /** What a town is asking for, sorted so the useful things come first. */
  private townNeeds(world: World, p: Place): { market: Site | undefined; bring: Good[]; stocked: Good[]; freight: Good[]; moreKinds: number; fresh: Good[] } {
    const market = world.sites.find((s) => s.placeId === p.id && SITE_DEFS[s.kind].dock === 'market');
    const freightSite = world.sites.find((s) => s.placeId === p.id && SITE_DEFS[s.kind].dock === 'freight');
    const wanted = market ? dockDemand(world, market) : [];
    const cap = market ? siteCap(world, market) : 1;
    const low = (g: Good): boolean => !market || stockOf(market, g) / cap <= 0.4;
    const price = (g: Good): number => (market ? unitPrice(world, market, g) : 0);
    const newKind = (g: Good): number => ((p.delivered[g] ?? 0) === 0 ? 1 : 0);
    const bring = wanted.filter(low).sort((a, b) => newKind(b) - newKind(a) || price(b) - price(a));
    const kinds = GOOD_LIST.filter((g) => (p.delivered[g] ?? 0) > 0).length;
    return {
      market,
      bring,
      stocked: wanted.filter((g) => !low(g)),
      freight: freightSite ? dockDemand(world, freightSite) : [],
      moreKinds: Math.max(0, p.level - kinds),
      fresh: wanted.filter((g) => newKind(g) === 1),
    };
  }

  private townCardHeight(world: World, p: Place, cw: number, perRow: number, chipH: number): number {
    const n = this.townNeeds(world, p);
    const hasNext = !!TOWN_LEVELS[p.level];
    let h = 100 + (hasNext ? 24 : 0);
    if (n.market) {
      h += 18;
      h += n.bring.length === 0 ? 22 : Math.ceil(Math.min(6, n.bring.length) / perRow) * (chipH + 6) + (n.bring.length > 6 ? 16 : 0);
      if (n.stocked.length) h += this.wrapLines(`Stocked: ${n.stocked.map((g) => GOODS[g].label).join(', ')}`, cw - 32) * 14 + 6;
    }
    if (n.freight.length) h += 2 + this.wrapLines(`Freight yard buys raw goods (${n.freight.length}): ${n.freight.map((g) => GOODS[g].label).join(', ')}`, cw - 32) * 14;
    return h + 14;
  }

  // ---- manage a town: its path and its districts ----

  private townDetail(world: World, p: Place, v: View): number {
    const im = this.cim;
    const x = v.x0;
    const w = v.x1 - v.x0;
    let y = v.y0 - this.scroll;
    const vis = (yy: number, hh: number): boolean => yy + hh > v.y0 && yy < v.y1;
    const lv = TOWN_LEVELS[p.level - 1];
    const path = p.path ? PATHS[p.path] : null;
    const gap = 12;

    // Back, and the town's name.
    if (vis(y, 40)) {
      const bhov = im.hit('td-back', x, y, 132, 36, () => {
        this.manage = null;
        this.scroll = 0;
      }, 3);
      im.rect(3, x, y, 132, 36, bhov ? 0x243142 : 0x172130, 1, 18, COLORS.line, 1);
      im.text('td-back-t', '‹  All towns', x + 66, y + 9, { size: 14, bold: true, align: 'center', layer: 4 });
      im.text('td-name', p.name, x + 150, y + 4, { size: 24, bold: true, layer: 3 });
      im.text('td-sub', `${radiusOf(p) > 3 ? 'Major city' : lv.name}  ·  ${STYLE_LABEL[p.style]}  ·  level ${p.level}`, x + 150 + 12 + p.name.length * 13, y + 12, { size: 13, color: COLORS.muted, layer: 3 });
    }
    y += 50;

    // Summary: growth, and what the districts earn and cost.
    const next = TOWN_LEVELS[p.level];
    const kinds = GOOD_LIST.filter((g) => (p.delivered[g] ?? 0) > 0).length;
    const earn = districtRevenue(world, p);
    const cost = townUpkeep(p);
    if (vis(y, 84)) {
      im.rect(3, x, y, w, 76, COLORS.panelAlt, 1, 14, COLORS.line, 1);
      if (next) {
        im.text('td-gh', `GROWING INTO A ${next.name.toUpperCase()}`, x + 16, y + 12, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
        im.bar(3, x + 16, y + 34, Math.min(420, w - 330), 8, p.growth / next.growth, COLORS.good);
        im.text('td-g', `${fmt(p.growth)} / ${fmt(next.growth)}`, x + 16 + Math.min(420, w - 330) + 12, y + 29, { size: 12, color: COLORS.muted, layer: 3 });
        const ok = kinds >= p.level;
        im.text('td-v', `Variety ${kinds}/${p.level} different goods delivered`, x + 16, y + 50, { size: 12, color: ok ? COLORS.good : COLORS.warn, layer: 3 });
      } else {
        im.text('td-gh', 'FULLY GROWN', x + 16, y + 12, { size: 10, bold: true, color: COLORS.good, layer: 3 });
        im.text('td-v', 'The districts below are how this town keeps getting better.', x + 16, y + 34, { size: 12, color: COLORS.muted, layer: 3 });
      }
      im.text('td-e', `+$${fmt(earn)}/min from districts`, x + w - 16, y + 14, { size: 15, bold: true, color: earn > 0 ? COLORS.good : COLORS.muted, align: 'right', layer: 3 });
      im.text('td-c', `-$${fmt(cost)}/min to run them`, x + w - 16, y + 38, { size: 13, color: cost > 0 ? COLORS.warn : COLORS.muted, align: 'right', layer: 3 });
    }
    y += 76 + 18;

    // Specialisation.
    if (vis(y, 22)) im.text('td-ph', 'SPECIALISATION', x, y + 3, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
    y += 22;
    if (path) {
      const h = 126;
      if (vis(y, h)) {
        im.rect(3, x, y, w, h, COLORS.panelAlt, 1, 14, path.color, 0.9);
        im.rect(3, x, y + 14, 6, h - 28, path.color, 1, 3);
        im.text('td-pn', path.label, x + 22, y + 12, { size: 20, bold: true, color: path.color, layer: 3 });
        im.text('td-pb', path.blurb, x + 22, y + 40, { size: 12, color: COLORS.muted, wrap: w - 44, layer: 3 });
        im.text('td-pp', path.perks.map((s2) => `•  ${s2}`).join('\n'), x + 22, y + 62, { size: 12, layer: 3 });
      }
      y += h + 14;
      // The path's own quests: cash for each, and a standing bonus once all are done.
      const pid = p.path!;
      const list = PATH_QUESTS[pid];
      const mastered = pathMastered(world, pid);
      if (vis(y, 22)) {
        im.text('td-qh', `${path.label.toUpperCase()} QUESTS`, x, y + 3, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
        im.text('td-qm', mastered ? `Mastered: ${path.label} towns pay 10% more for their goods` : 'Finish all four and the path is mastered: its towns pay 10% more for its goods', x + 150, y + 2, { size: 11, color: mastered ? COLORS.good : COLORS.muted, layer: 3 });
      }
      y += 24;
      const rowH = 44;
      const qh = list.length * rowH + 8;
      if (vis(y, qh)) {
        im.rect(3, x, y, w, qh, COLORS.panelAlt, 1, 14, COLORS.line, 1);
        list.forEach((q, i) => {
          const ry = y + 4 + i * rowH;
          const st = pathQuestState(world, q);
          if (i > 0) im.line(3, x + 16, ry, x + w - 16, ry, 0xffffff, 0.06, 1);
          im.circle(3, x + 30, ry + 22, 10, st.done ? COLORS.good : 0x3a4656);
          if (!st.done) im.circle(3, x + 30, ry + 22, 7.5, COLORS.panelAlt);
          im.text(`td-q-${q.id}`, q.label, x + 52, ry + 6, { size: 13, bold: true, color: st.done ? COLORS.good : COLORS.text, layer: 3 });
          im.text(`td-qt-${q.id}`, q.hint, x + 52, ry + 24, { size: 11, color: COLORS.muted, layer: 3 });
          im.text(`td-qr-${q.id}`, st.done ? 'Paid' : `+$${fmt(q.reward)}`, x + w - 16, ry + 6, { size: 13, bold: true, color: st.done ? COLORS.muted : COLORS.warn, align: 'right', layer: 3 });
          if (!st.done) {
            im.bar(3, x + w - 176, ry + 29, 100, 6, st.have / st.need, path.color);
            im.text(`td-qp-${q.id}`, `${fmt(st.have)} / ${fmt(st.need)}`, x + w - 16, ry + 24, { size: 11, color: COLORS.muted, align: 'right', layer: 3 });
          }
        });
      }
      y += qh + 18;
    } else {
      const locked = p.level < PATH_TOWN_LEVEL;
      const intro = locked
        ? `At level ${PATH_TOWN_LEVEL} (${TOWN_LEVELS[PATH_TOWN_LEVEL - 1].name}) this town can commit to one path. The choice is permanent, and it changes what the town pays for, how its factories work and which districts it can build. Different towns can take different paths.`
        : `This town is ready to specialise. The choice is permanent, so pick the one that fits the goods you can supply. It costs $${fmt(PATH_COST)}.`;
      if (vis(y, 48)) im.text('td-pi', intro, x, y, { size: 12, color: locked ? COLORS.muted : COLORS.text, wrap: w, layer: 3 });
      y += 52;
      const cols = w >= 900 ? 4 : 2;
      const cw = (w - gap * (cols - 1)) / cols;
      const ch = 214;
      PATH_ORDER.forEach((pid, i) => {
        const def = PATHS[pid];
        const cx = x + (i % cols) * (cw + gap);
        const cy = y + Math.floor(i / cols) * (ch + gap);
        if (!vis(cy, ch)) return;
        const err = pathError(world, p, pid);
        im.rect(3, cx, cy, cw, ch, COLORS.panelAlt, 1, 14, def.color, locked ? 0.35 : 0.8);
        im.rect(3, cx + 14, cy, cw - 28, 4, def.color, locked ? 0.5 : 1, 2);
        im.text(`td-p-${pid}`, def.label, cx + 16, cy + 16, { size: 17, bold: true, color: locked ? COLORS.muted : def.color, layer: 3 });
        im.text(`td-pb-${pid}`, def.blurb, cx + 16, cy + 42, { size: 11, color: COLORS.muted, wrap: cw - 32, layer: 3 });
        im.text(`td-pk-${pid}`, def.perks.map((s2) => `•  ${s2}`).join('\n'), cx + 16, cy + 92, { size: 11, wrap: cw - 32, layer: 3 });
        const bw = cw - 32;
        const by = cy + ch - 46;
        const hov = !err && im.hit(`td-pc-${pid}`, cx + 16, by, bw, 34, () => {
          const e = choosePath(world, p, pid);
          this.hooks.toast(e ?? `${p.name} is now ${def.label}`);
        }, 4);
        im.rect(3, cx + 16, by, bw, 34, err ? 0x151c26 : hov ? 0xf0b250 : COLORS.accent, 1, 17, err ? COLORS.line : COLORS.accent, 1);
        im.text(`td-pct-${pid}`, locked ? `Needs level ${PATH_TOWN_LEVEL}` : err ? err : `Commit  $${fmt(PATH_COST)}`, cx + 16 + bw / 2, by + 9, { size: 14, bold: true, color: err ? COLORS.muted : 0x1b1204, align: 'center', layer: 4 });
      });
      y += Math.ceil(PATH_ORDER.length / cols) * (ch + gap) + 6;
    }

    // Districts.
    if (vis(y, 22)) im.text('td-dh', 'DISTRICTS', x, y + 3, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
    if (vis(y, 22)) im.text('td-dn', 'Each level of a district needs the town one level higher.', x + 96, y + 2, { size: 11, color: COLORS.muted, layer: 3 });
    y += 24;
    const ids = DISTRICT_ORDER.filter((id) => !DISTRICTS[id].path || !p.path || DISTRICTS[id].path === p.path).sort((a, b) => Number(!!DISTRICTS[a].capstone) - Number(!!DISTRICTS[b].capstone));
    const cols = w > 760 ? 2 : 1;
    const cw = (w - gap * (cols - 1)) / cols;
    const ch = 148;
    ids.forEach((id, i) => {
      const cx = x + (i % cols) * (cw + gap);
      const cy = y + Math.floor(i / cols) * (ch + gap);
      if (!vis(cy, ch)) return;
      this.districtCard(world, p, id, cx, cy, cw, ch);
    });
    y += Math.ceil(ids.length / cols) * (ch + gap);
    return y + this.scroll - v.y0 + 6;
  }

  private districtCard(world: World, p: Place, id: (typeof DISTRICT_ORDER)[number], x: number, y: number, w: number, h: number): void {
    const im = this.cim;
    const def = DISTRICTS[id];
    const lvl = districtLevel(p, id);
    const err = districtError(world, p, id);
    const maxed = err === 'Already at max level' || err === 'Already built';
    const shown = Math.max(1, lvl);
    const boost = districtBoost(p, def);
    const tint = def.capstone ? COLORS.accent : lvl > 0 ? COLORS.good : COLORS.line;
    im.rect(3, x, y, w, h, COLORS.panelAlt, 1, 14, tint, lvl > 0 || def.capstone ? 0.7 : 1);
    im.text(`dc-n-${p.id}-${id}`, def.label, x + 16, y + 12, { size: 15, bold: true, layer: 3 });
    // Level pips, or a tag for capstones and path-only districts.
    if (def.capstone) {
      im.text(`dc-t-${p.id}-${id}`, lvl > 0 ? 'CAPSTONE · BUILT' : 'CAPSTONE', x + w - 16, y + 15, { size: 10, bold: true, color: COLORS.accent, align: 'right', layer: 3 });
    } else {
      for (let k = 0; k < MAX_DISTRICT_LEVEL; k++) im.circle(3, x + w - 24 - (MAX_DISTRICT_LEVEL - 1 - k) * 18, y + 22, 6, k < lvl ? COLORS.good : 0x2a3544);
    }
    if (def.path && !def.capstone) im.text(`dc-p-${p.id}-${id}`, `${PATHS[def.path].label} only`, x + 16 + def.label.length * 8.6 + 10, y + 16, { size: 10, bold: true, color: PATHS[def.path].color, layer: 3 });
    im.text(`dc-b-${p.id}-${id}`, def.blurb, x + 16, y + 36, { size: 11, color: COLORS.muted, wrap: w - 32, layer: 3 });

    // What it lives on: a square per good, bright when its building has that good in stock (the town's docks, until it has one).
    const home = world.sites.find((s) => s.placeId === p.id && s.districtId === id);
    const docks = home ? [home] : world.sites.filter((s) => s.placeId === p.id && SITE_DEFS[s.kind].dock);
    def.goods.slice(0, 9).forEach((g, k) => {
      const have = docks.some((d) => stockOf(d, g) >= 1);
      im.rect(3, x + 16 + k * 20, y + 70, 15, 15, GOODS[g].color, have ? 1 : 0.22, 3);
    });
    const bits: string[] = [];
    if (def.price > 0) bits.push(`+${Math.round(def.price * shown * boost * 100)}% price on ${def.goods.length} goods`);
    if (def.revenue > 0) {
      bits.push(`$${fmt(def.revenue * shown * boost)}/min at full supply${lvl > 0 ? ` (now ${Math.round(districtSatisfaction(world, p, id) * 100)}%)` : ''}`);
    }
    if (lvl > 0 && def.goods.length > 0) bits.push(home ? 'trucks deliver to its door' : 'finding a lot for it');
    if (def.effect === 'storage') bits.push(`docks hold +${Math.round((def.capstone ? 30 : 25) * shown * boost)}%`);
    if (def.effect === 'growth') bits.push(`growth +${20 * shown}%`);
    if (def.effect === 'visitors') bits.push('income grows with the variety delivered');
    const ask = [...(def.demand?.market ?? []), ...(def.demand?.freight ?? [])];
    if (ask.length) bits.push(`asks for ${ask.map((g) => GOODS[g].label.toLowerCase()).join(', ')}`);
    im.text(`dc-s-${p.id}-${id}`, bits.join('  ·  '), x + 16, y + 92, { size: 11, color: COLORS.text, wrap: w - 32 - 160, layer: 3 });

    if (home) {
      const showHov = im.hit(`dc-show-${p.id}-${id}`, x + 16, y + h - 34, 110, 22, () => this.hooks.focusSite(home), 4);
      im.text(`dc-showt-${p.id}-${id}`, 'Show on map', x + 16, y + h - 32, { size: 12, bold: true, color: showHov ? 0xf0b250 : COLORS.accent, layer: 4 });
    }

    // Build or upgrade.
    const bw = 148;
    const bx = x + w - 16 - bw;
    const by = y + h - 46;
    if (maxed) {
      im.rect(3, bx, by, bw, 32, 0x14201a, 1, 16, COLORS.good, 0.6);
      im.text(`dc-m-${p.id}-${id}`, def.capstone ? 'Built' : 'Max level', bx + bw / 2, by + 8, { size: 13, bold: true, color: COLORS.good, align: 'center', layer: 4 });
      return;
    }
    const label = `${lvl > 0 ? 'Upgrade' : 'Build'}  $${fmt(districtCost(p, id))}`;
    const hov = !err && im.hit(`dc-b2-${p.id}-${id}`, bx, by, bw, 32, () => {
      const e = buildDistrict(world, p, id);
      this.hooks.toast(e ?? `${def.label} ${lvl > 0 ? `upgraded to level ${lvl + 1}` : 'built'}`);
    }, 4);
    im.rect(3, bx, by, bw, 32, err ? 0x151c26 : hov ? 0xf0b250 : COLORS.accent, 1, 16, err ? COLORS.line : COLORS.accent, 1);
    im.text(`dc-bt-${p.id}-${id}`, label, bx + bw / 2, by + 8, { size: 13, bold: true, color: err ? COLORS.muted : 0x1b1204, align: 'center', layer: 4 });
    if (err) im.text(`dc-e-${p.id}-${id}`, err, bx + bw, by - 16, { size: 11, color: err.startsWith('Need $') ? COLORS.warn : COLORS.muted, align: 'right', layer: 3 });
  }

  // ---- quests sheet ----

  private quests(world: World, v: View): number {
    const im = this.cim;
    const x = v.x0;
    const w = v.x1 - v.x0;
    let y = v.y0 - this.scroll;
    const chipW = (s: string): number => 22 + Math.ceil(s.length * 6.7);
    for (const tier of TIERS) {
      const state = tier.tier < world.tier ? 'done' : tier.tier === world.tier ? 'now' : 'locked';
      const unlocks = tierUnlocks(tier.tier + 1);
      const rowH = state === 'now' ? 62 : 34;
      // Unlock chips wrap. Their widths are estimated, so the card's height is known without drawing it.
      const spots: { u: string; cx: number; row: number }[] = [];
      let cx = 0;
      let row = 0;
      for (const u of unlocks) {
        if (cx > 0 && cx + chipW(u) > w - 36) {
          cx = 0;
          row += 1;
        }
        spots.push({ u, cx, row });
        cx += chipW(u) + 6;
      }
      const head = 76;
      const h = head + tier.quests.length * rowH + (unlocks.length ? 34 + (row + 1) * 32 : 0) + 10;
      if (y + h > v.y0 && y < v.y1) {
        const tint = state === 'done' ? COLORS.good : state === 'now' ? COLORS.accent : 0x4a5666;
        im.rect(3, x, y, w, h, COLORS.panelAlt, 1, 14, state === 'now' ? COLORS.accent : COLORS.line, state === 'now' ? 0.8 : 1);
        im.circle(3, x + 36, y + 38, 21, tint);
        im.text(`qs-n-${tier.tier}`, String(tier.tier), x + 36, y + 24, { size: 24, bold: true, color: 0x14100a, align: 'center', layer: 3 });
        im.text(`qs-t-${tier.tier}`, `Tier ${tier.tier}  ·  ${tier.name}`, x + 70, y + 14, { size: 18, bold: true, color: state === 'locked' ? COLORS.muted : COLORS.text, layer: 3 });
        im.text(`qs-b-${tier.tier}`, tier.blurb, x + 70, y + 42, { size: 12, color: COLORS.muted, wrap: w - 220, layer: 3 });
        im.rect(3, x + w - 120, y + 14, 104, 26, state === 'now' ? COLORS.accent : 0x10161e, 1, 13, tint, 1);
        im.text(`qs-s-${tier.tier}`, state === 'done' ? 'Complete' : state === 'now' ? 'In progress' : 'Locked', x + w - 68, y + 19, { size: 12, bold: true, color: state === 'now' ? 0x1b1204 : tint, align: 'center', layer: 3 });

        tier.quests.forEach((q, i) => {
          const ry = y + head + i * rowH;
          const p = questState(world, tier, q);
          im.line(3, x + 16, ry, x + w - 16, ry, 0xffffff, 0.06, 1);
          const cyc = ry + (state === 'now' ? 20 : 17);
          if (p.done) {
            im.circle(3, x + 34, cyc, 11, COLORS.good);
            im.line(3, x + 28, cyc, x + 32, cyc + 4, 0x0e1a14, 1, 2.5);
            im.line(3, x + 32, cyc + 4, x + 40, cyc - 5, 0x0e1a14, 1, 2.5);
          } else {
            im.circle(3, x + 34, cyc, 11, 0x3a4656);
            im.circle(3, x + 34, cyc, 8.5, COLORS.panelAlt);
          }
          im.text(`qs-q-${q.id}`, q.label, x + 56, ry + (state === 'now' ? 8 : 8), { size: 14, bold: true, color: p.done ? COLORS.good : state === 'locked' ? COLORS.muted : COLORS.text, layer: 3 });
          im.text(`qs-r-${q.id}`, p.done && state !== 'locked' ? 'Paid' : `+$${fmt(q.reward)}`, x + w - 18, ry + 8, { size: 13, bold: true, color: p.done ? COLORS.muted : COLORS.warn, align: 'right', layer: 3 });
          if (state === 'now') {
            im.text(`qs-h-${q.id}`, q.hint, x + 56, ry + 30, { size: 12, color: COLORS.muted, wrap: Math.max(160, w - 56 - 250), layer: 3 });
            im.bar(3, x + w - 232, ry + 40, 130, 7, p.have / p.need, p.done ? COLORS.good : COLORS.accent);
            im.text(`qs-p-${q.id}`, `${fmt(p.have)} / ${fmt(p.need)}`, x + w - 18, ry + 33, { size: 12, color: COLORS.muted, align: 'right', layer: 3 });
          }
        });

        if (unlocks.length) {
          const uy = y + head + tier.quests.length * rowH + 8;
          im.line(3, x + 16, uy - 8, x + w - 16, uy - 8, 0xffffff, 0.06, 1);
          im.text(`qs-u-${tier.tier}`, state === 'done' ? `UNLOCKED AT TIER ${tier.tier + 1}` : `FINISH THESE TO UNLOCK TIER ${tier.tier + 1}`, x + 18, uy, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
          for (const s of spots) {
            const ux = x + 18 + s.cx;
            const yy = uy + 20 + s.row * 32;
            im.rect(3, ux, yy, chipW(s.u), 26, 0x10161e, 1, 13, state === 'done' ? COLORS.good : COLORS.line, state === 'done' ? 0.6 : 1);
            im.text(`qs-c-${tier.tier}-${s.u}`, s.u, ux + 11, yy + 5, { size: 12, color: state === 'locked' ? COLORS.muted : COLORS.text, layer: 3 });
          }
        }
      }
      y += h + 14;
    }
    return y + this.scroll - v.y0;
  }

  // ---- how to play ----

  // ---- bank sheet ----

  private bank(world: World, v: View): number {
    const im = this.cim;
    const W = v.x1 - v.x0;
    let y0 = v.y0 - this.scroll;
    if (world.tier < BANK_TIER) {
      im.text('bk-lock', `The bank opens at Tier ${BANK_TIER}. Finish the Startup quests to open an account.`, v.x0 + 8, y0 + 12, { size: 16, color: COLORS.muted, wrap: W - 16, layer: 3 });
      return 80;
    }
    const b = bankOf(world);
    const stats: [string, number, number][] = [
      ['Cash', world.money, COLORS.text],
      ['Savings', b.savings, COLORS.text],
      ['Fund', fundValue(world), COLORS.text],
      ['Owed', b.loan, b.loan > 0 ? COLORS.bad : COLORS.text],
      ['Net worth', netWorth(world), COLORS.accent],
    ];
    im.rect(3, v.x0, y0, W, 76, COLORS.panelAlt, 1, 14, COLORS.line, 1);
    const sw = W / stats.length;
    stats.forEach(([label, val, col], i) => {
      const sx = v.x0 + i * sw + sw / 2;
      im.text(`bk-sl${i}`, label, sx, y0 + 14, { size: 12, color: COLORS.muted, align: 'center', layer: 3 });
      im.text(`bk-sv${i}`, `${val < 0 ? '-' : ''}$${fmt(Math.abs(val))}`, sx, y0 + 34, { size: W < 700 ? 16 : 22, bold: true, color: col, align: 'center', layer: 3 });
    });
    y0 += 90;

    const gap = 14;
    const cols = W > 900 ? 2 : 1;
    const cw = (W - gap * (cols - 1)) / cols;
    const ch = 250;
    const pos = (i: number): { x: number; y: number } => ({ x: v.x0 + (i % cols) * (cw + gap), y: y0 + Math.floor(i / cols) * (ch + gap) });
    const toast = (err: string | null): void => {
      if (err) this.hooks.toast(err);
    };
    const row = (id: string, x: number, y: number, label: string, fn: (amt: number) => string | null, last: string): void => {
      const bw = (cw - 32 - 16) / 3;
      [1000, 5000, Infinity].forEach((amt, k) => {
        const bx = x + 16 + k * (bw + 8);
        const hov = im.hit(`${id}${k}`, bx, y, bw, 36, () => toast(fn(amt)), 4);
        im.rect(3, bx, y, bw, 36, hov ? 0x243142 : 0x172130, 1, 18, COLORS.line, 1);
        im.text(`${id}t${k}`, amt === Infinity ? `${label} ${last}` : `${label} $${amt / 1000}k`, bx + bw / 2, y + 10, { size: 13, bold: true, align: 'center', layer: 5 });
      });
    };
    const card = (i: number, id: string, title: string, tint: number): { x: number; y: number } => {
      const p = pos(i);
      im.rect(3, p.x, p.y, cw, ch, COLORS.panelAlt, 1, 14, tint, 0.8);
      im.rect(3, p.x + 14, p.y, cw - 28, 4, tint, 1, 2);
      im.text(`bk-t${id}`, title, p.x + 16, p.y + 14, { size: 18, bold: true, layer: 3 });
      return p;
    };

    // Loans
    const limit = creditLimit(world);
    let p = card(0, 'loan', 'Loans', COLORS.bad);
    im.text('bk-l1', `Owed $${fmt(b.loan)}   ·   limit $${fmt(limit)}   ·   interest ${(LOAN_RATE * 100).toFixed(1)}% per minute`, p.x + 16, p.y + 46, { size: 13, color: COLORS.muted, wrap: cw - 32, layer: 3 });
    im.text('bk-l2', b.loan > 0 ? `Interest runs up about $${fmt(b.loan * LOAN_RATE)} a minute. Interest so far: $${fmt(b.interest)}.` : 'Nothing owed. The limit grows as you earn and reach new tiers.', p.x + 16, p.y + 72, { size: 13, color: COLORS.text, wrap: cw - 32, layer: 3 });
    row('bk-borrow', p.x, p.y + 152, 'Borrow', (a) => borrow(world, a), 'max');
    row('bk-repay', p.x, p.y + 196, 'Repay', (a) => repay(world, a), 'all');

    // Savings
    p = card(1, 'sav', 'Savings account', COLORS.good);
    im.text('bk-s1', `Balance $${fmt(b.savings)}   ·   interest ${(SAVINGS_RATE * 100).toFixed(1)}% per minute`, p.x + 16, p.y + 46, { size: 13, color: COLORS.muted, wrap: cw - 32, layer: 3 });
    im.text('bk-s2', 'Safe: it only goes up, and you can take it out any time. Slow, but better than idle cash.', p.x + 16, p.y + 72, { size: 13, color: COLORS.text, wrap: cw - 32, layer: 3 });
    row('bk-dep', p.x, p.y + 152, 'Deposit', (a) => deposit(world, a), 'all');
    row('bk-wd', p.x, p.y + 196, 'Withdraw', (a) => withdraw(world, a), 'all');

    // Market fund
    p = card(2, 'fund', 'Market fund', COLORS.accent);
    const hist = b.history;
    const first = hist[0] ?? b.price;
    const chg = (b.price / first - 1) * 100;
    const held = fundValue(world);
    const profit = held - b.invested;
    im.text('bk-f1', `Price $${b.price.toFixed(2)}  ${chg >= 0 ? '+' : ''}${chg.toFixed(1)}% on the chart   ·   ${FUND_FEE * 100}% fee when you sell`, p.x + 16, p.y + 40, { size: 13, color: COLORS.muted, wrap: cw - 32, layer: 3 });
    im.text('bk-f2', held > 0 ? `Holding $${fmt(held)}   ·   ${profit >= 0 ? 'up' : 'down'} $${fmt(Math.abs(profit))}` : 'Nothing held. Prices rise and fall: you can lose money.', p.x + 16, p.y + 60, { size: 13, color: held > 0 ? (profit >= 0 ? COLORS.good : COLORS.bad) : COLORS.text, wrap: cw - 32, layer: 3 });
    const gx = p.x + 16;
    const gy = p.y + 84;
    const gw = cw - 32;
    const gh = 56;
    im.rect(3, gx, gy, gw, gh, 0x10161e, 1, 8);
    if (hist.length > 1) {
      const lo = Math.min(...hist);
      const hi = Math.max(...hist);
      const span = Math.max(1e-6, hi - lo);
      const col = hist[hist.length - 1] >= first ? COLORS.good : COLORS.bad;
      for (let k = 1; k < hist.length; k++) {
        const ax = gx + 4 + ((k - 1) / (hist.length - 1)) * (gw - 8);
        const bx = gx + 4 + (k / (hist.length - 1)) * (gw - 8);
        const ay = gy + gh - 5 - ((hist[k - 1] - lo) / span) * (gh - 10);
        const by = gy + gh - 5 - ((hist[k] - lo) / span) * (gh - 10);
        im.line(3, ax, ay, bx, by, col, 1, 2);
      }
    }
    row('bk-buy', p.x, p.y + 152, 'Buy', (a) => invest(world, a), 'all');
    row('bk-sell', p.x, p.y + 196, 'Sell', (a) => divest(world, a), 'all');

    // Real money: closed until a payment service stands behind it.
    p = card(3, 'real', 'Buy cash', COLORS.muted);
    im.text('bk-r1', REAL_MONEY_ENABLED ? 'Cash packs' : 'Cash packs with real money are not open yet.', p.x + 16, p.y + 46, { size: 14, bold: true, color: COLORS.muted, wrap: cw - 32, layer: 3 });
    im.text('bk-r2', 'They need a payment service that confirms each purchase before cash is added, so this stays closed until that is set up. Everything else here is earned in the game.', p.x + 16, p.y + 72, { size: 13, color: COLORS.muted, wrap: cw - 32, layer: 3 });
    im.rect(3, p.x + 16, p.y + ch - 52, cw - 32, 36, 0x121820, 1, 18, COLORS.line, 1);
    im.text('bk-r3', 'Coming later', p.x + cw / 2, p.y + ch - 42, { size: 13, bold: true, color: COLORS.muted, align: 'center', layer: 5 });

    return 90 + Math.ceil(4 / cols) * (ch + gap) + 4;
  }

  /** The guide section on show. */
  guideTab = 'steps';

  private guide(v: View): number {
    const im = this.cim;
    const gap = 14;
    const W = v.x1 - v.x0;
    // Section buttons: pick one and only that part of the guide is shown.
    let cx = v.x0;
    let cy = v.y0 - this.scroll;
    for (const s of GUIDE) {
      const w = s.label.length * 9 + 36;
      if (cx + w > v.x1) {
        cx = v.x0;
        cy += 46;
      }
      const on = s.id === this.guideTab;
      const hov = im.hit(`gd-tab-${s.id}`, cx, cy, w, 38, () => {
        this.guideTab = s.id;
        this.scroll = 0;
      }, 4);
      im.rect(3, cx, cy, w, 38, on ? s.color : hov ? 0x2a3646 : COLORS.panelAlt, 1, 19, on ? s.color : COLORS.line, 1);
      im.text(`gd-tabt-${s.id}`, s.label, cx + w / 2, cy + 10, { size: 15, bold: true, color: on ? 0x10161e : COLORS.text, align: 'center', layer: 4 });
      cx += w + 10;
    }
    cy += 54;
    const sec = GUIDE.find((s) => s.id === this.guideTab) ?? GUIDE[0];
    const hd = im.text(`gd-h-${sec.id}`, sec.label.toUpperCase(), v.x0, cy, { size: 24, bold: true, color: sec.color, layer: 3 });
    const hb = im.text(`gd-hb-${sec.id}`, sec.blurb, v.x0, cy + hd.h + 4, { size: 15, color: COLORS.muted, wrap: W, layer: 3 });
    cy += hd.h + hb.h + 18;

    const cols = W > 820 ? 2 : 1;
    const cw = (W - gap * (cols - 1)) / cols;
    const colY = new Array<number>(cols).fill(cy);
    const dots: [number, number][] = [];
    sec.cards.forEach((card, i) => {
      // Row by row, so the order reads 1, 2 then 3, 4.
      const c = i % cols;
      if (c === 0) colY.fill(Math.max(...colY));
      const x = v.x0 + c * (cw + gap);
      const y = colY[c];
      const key = `${sec.id}-${i}`;
      const icon = !card.step && card.icon && this.hooks.hasTexture(card.icon) ? card.icon : null;
      const tx = x + 20 + (card.step ? 62 : icon ? 66 : 0);
      const tw = x + cw - 20 - tx;
      let yy = y + 16;
      const t1 = im.text(`gd-t-${key}`, card.title, tx, yy, { size: card.step ? 21 : 18, bold: true, color: sec.color, wrap: tw, layer: 4 });
      yy += t1.h + 4;
      const t2 = im.text(`gd-s-${key}`, card.sum, tx, yy, { size: 15, bold: true, color: COLORS.text, wrap: tw, layer: 4 });
      yy += t2.h + 10;
      // The details, a line each with its own dot, so the eye can pick one out.
      const lines = card.body ? bodyText(card.body).split('\n') : [];
      lines.forEach((ln, k) => {
        const t = im.text(`gd-l-${key}-${k}`, ln, tx + 16, yy, { size: 14, color: 0xcfd6df, wrap: tw - 16, layer: 4 });
        dots.push([tx + 5, yy + 8]);
        yy += t.h + 5;
      });
      let box: { x: number; y: number; w: number; h: number } | null = null;
      if (card.todo) {
        yy += 6;
        const t3 = im.text(`gd-d-${key}`, bodyText(card.todo), tx + 12, yy + 9, { size: 14, bold: true, color: COLORS.good, wrap: tw - 24, layer: 4 });
        box = { x: tx, y: yy, w: tw, h: t3.h + 18 };
        yy += t3.h + 18;
      }
      const h = Math.max(card.step || icon ? 96 : 0, yy - y + 16);
      im.rect(3, x, y, cw, h, COLORS.panelAlt, 1, 14, card.step ? sec.color : COLORS.line, card.step ? 0.7 : 1);
      if (box) im.rect(3, box.x, box.y, box.w, box.h, 0x12261f, 1, 10, COLORS.good, 1);
      for (const [dx, dy] of dots.splice(0)) im.circle(4, dx, dy, 3, sec.color);
      if (card.step) {
        im.circle(4, x + 20 + 22, y + 16 + 24, 24, sec.color);
        im.text(`gd-n-${key}`, String(card.step), x + 20 + 22, y + 16 + 10, { size: 26, bold: true, color: 0x10161e, align: 'center', layer: 5 });
      } else if (icon) im.image(`gd-i-${key}`, icon, x + 12, y + 14, 60, 60, 1, 4);
      colY[c] += h + gap;
    });
    return Math.max(...colY) - (v.y0 - this.scroll) + 4;
  }
}
