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
  PATH_COST,
  PATH_ORDER,
  PATH_TOWN_LEVEL,
  TICKS_PER_SECOND,
  TIERS,
  TOWN_LEVELS,
  type Good,
} from '../sim/defs';
import { questState, tierUnlocks } from '../sim/quests';
import { buildDistrict, choosePath, districtBoost, districtCost, districtError, districtLevel, districtRevenue, districtSatisfaction, pathError, townUpkeep } from '../sim/town';
import { dockDemand, isHomePlot, plotTiles, radiusOf, produces, siteCap, stockOf, unitPrice, wants, type Place, type Site, type World } from '../sim/world';
import { COLORS, Im } from './imui';
import { isTouch } from './inputmode';

export type SheetId = 'production' | 'towns' | 'quests' | 'guide';

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
const GUIDE: { title: string; body: Body; icon?: string }[] = [
  {
    title: 'The idea',
    body: 'Towns buy goods. You make the goods, haul them to town and get paid. Sales grow the towns, bigger towns want more kinds of goods, and finished quests unlock new tiers of buildings and vehicles.',
    icon: 'thumb-market',
  },
  {
    title: 'Looking around',
    body: {
      mouse: 'Drag to move the map. Right-drag to turn and tilt. Scroll to zoom, from the whole globe down to street level. W A S D or the arrow keys also move, and Q and E turn.',
      touch: 'Drag with one finger to move the map. Pinch to zoom, from the whole globe down to street level. Twist two fingers to turn, and drag them up or down to tilt.',
    },
  },
  {
    title: 'Step 1: produce',
    body: 'Open Production at the bottom and pick a building. The menu folds away and the matching resource spots light up with rings: forest for a Forestry Camp, farmland for a Farm, and so on. Click a ring to build there. Purer spots work faster.',
    icon: 'thumb-forestry',
  },
  {
    title: 'Step 2: process in a town',
    body: 'Open Processing, Manufacturing or Heavy Industry and pick a building. The for-sale lots in every town light up. Click one. Anything built on a town lot is joined to that town by its streets, and a free van carries goods between the lot and the Market.',
    icon: 'thumb-sawmill',
  },
  {
    title: 'Step 3: build a road',
    body: {
      mouse: 'Open Logistics and pick Road. Drag from one building to the other. The road finds its own way round hills, bridges water and tunnels under mountains (those cost more). To steer it, click along the way to drop corners. Enter finishes, Backspace undoes a corner and Esc cancels. Between two buildings that trade a box truck comes with the road. You can also lay roads from open ground or from another road and connect buildings later. The Demolish tool removes a road.',
      touch: 'Open Logistics and pick Road. Drag from one building to the other. The road finds its own way round hills, bridges water and tunnels under mountains (those cost more). To steer it, tap along the way to drop corners. Undo, Cancel and Finish buttons show while you draw. Between two buildings that trade a truck comes with the road. You can also lay roads from open ground or from another road and connect buildings later. The Demolish tool removes a road.',
    },
    icon: 'thumb-route',
  },
  {
    title: 'Step 4: sell',
    body: 'The Market buys finished goods. From level 2 a town also has a Freight Yard for raw goods and by-products. Open Towns to see what each town wants and what it pays. A town pays less for something it is already full of, and prices swing with market surges.',
  },
  {
    title: 'Growing towns',
    body: 'Every sale adds growth. To level up a town needs growth and variety: the more kinds of goods you sell it, the higher it can go. Bigger towns want more goods and buy more of them, and the major cities buy much more.',
  },
  {
    title: 'Districts: build a town up',
    body: 'Select a town and open Manage town. Districts are what a town builds as it grows: a Farmers Market, Restaurant Row, a Hardware Store and more. Each lives on certain goods: it pays more for them, earns money while the town is stocked with them, and appears as a landmark in town. Each level needs the town one level higher. They cost money to run, so keep the town supplied.',
    icon: 'thumb-market',
  },
  {
    title: 'Specialise a town',
    body: 'A Town (level 3) can commit to one path: Breadbasket, The Forge, Trade Hub or The Boulevard. It is permanent. A path makes the town pay more for its goods, speeds up the right factories, strengthens the districts that suit it and opens its own districts, with a capstone at level 5. Give different towns different paths.',
  },
  {
    title: 'Keeping things moving',
    body: 'Click a building to see its stock and what is holding it up. Full means nothing is taking its goods away: add a vehicle (Vehicles, then click the road) or another customer. Waiting means it is short of an input. Upgrade a building to make it faster and roomier. The Production sheet lists the problems first.',
    icon: 'thumb-boxtruck',
  },
  {
    title: 'Bigger vehicles and running costs',
    body: 'Box Truck, Big Box Truck, Big Rig, Truck Fleet. Freight Train, Heavy Haul Train. Cargo Plane, Cargo Jet. Select any building to see the vehicles that serve it: pick a class and Buy, or Trade up to swap the smallest one for the next class and get half its price back. Bigger vehicles carry far more but cost more to run. Vehicles, buildings and districts are paid for every minute, and the figure under your money is what is left after that.',
    icon: 'thumb-boxtruck',
  },
  {
    title: 'Hubs, highways and rail',
    body: 'A Distribution Hub stores goods and passes them on: gather from several sites, then feed several others. Highways (Tier 1) carry trucks about a third faster. Rail (Tier 2) is its own network with huge trains, and track meets roads at level crossings. Every town has a Rail Station on its edge: run track to it and whatever the train unloads is sold on to the Market and Freight Yard.',
    icon: 'thumb-hub',
  },
  {
    title: 'By-products',
    body: 'Many buildings make a second good: sawdust, bran, whey, gravel, slag. Sell it at a Freight Yard, or turn it into something better: sawdust into pellets, bran and whey into feed, gravel into cement.',
  },
  {
    title: 'Quests and tiers',
    body: 'The bar at the top shows your next quest. Click it for the full list. Finish every quest of a tier to unlock the next one: new buildings and vehicles, longer bridges and tunnels, and higher building levels. Each quest pays a reward.',
  },
  {
    title: 'Shortcuts',
    body: {
      mouse: 'Tab: next category. 1 to 9: pick a card. P: production. T: towns. G: quests. H: this guide. Space: pause. Esc: cancel or close. The game saves by itself every 20 seconds.',
      touch: 'Every action is a button, so no keyboard is needed. The game saves by itself every 20 seconds.',
    },
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
    const tabs: [SheetId, string][] = [['production', 'Production'], ['towns', 'Towns'], ['quests', 'Quests'], ['guide', 'How to play']];
    tabs.forEach(([tid, label], i) => {
      const tx = x + 18 + i * 142;
      const on = tid === id;
      const hov = im.hit(`sheetTab${tid}`, tx, y + 14, 134, 40, () => {
        this.hooks.select(tid);
        this.scroll = 0;
      }, 3);
      im.rect(3, tx, y + 14, 134, 40, on ? 0x1f2c3a : hov ? 0x1a2431 : 0x131b25, 1, 12, on ? COLORS.accent : COLORS.line, 1, on ? 2 : 1);
      im.text(`sheetTabT${tid}`, label, tx + 67, y + 24, { size: 15, bold: true, color: on ? COLORS.accent : COLORS.text, align: 'center', layer: 3 });
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
    const contentH = id === 'production' ? this.production(world, view) : id === 'towns' ? (this.manage !== null && world.places.some((p) => p.id === this.manage) ? this.townDetail(world, world.places.find((p) => p.id === this.manage)!, view) : this.towns(world, view)) : id === 'quests' ? this.quests(world, view) : this.guide(view);
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
    const heights = places.map((p) => {
      const market = world.sites.find((s) => s.placeId === p.id && SITE_DEFS[s.kind].dock === 'market');
      const freight = world.sites.find((s) => s.placeId === p.id && SITE_DEFS[s.kind].dock === 'freight');
      const mrows = market ? Math.ceil(dockDemand(world, market).length / perRow) : 0;
      const frows = freight ? Math.ceil(dockDemand(world, freight).length / perRow) : 0;
      return 108 + (mrows ? 20 + mrows * (chipH + 6) : 0) + (frows ? 20 + frows * (chipH + 6) : 0) + 12;
    });
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
      const ok = kinds >= p.level;
      im.text(`tw-v-${p.id}`, `Variety ${kinds}/${p.level} different goods delivered`, x + 16, y + 78, { size: 11, color: ok ? COLORS.good : COLORS.warn, layer: 3 });
    } else {
      im.text(`tw-g-${p.id}`, 'Fully grown', x + 16, y + 59, { size: 12, color: COLORS.good, layer: 3 });
    }
    const plots = plotTiles(p.x, p.y, radiusOf(p));
    const forSale = plots.map((t, i) => ({ t, i })).filter(({ i }) => i >= 2 && !isHomePlot(p, i));
    const used = forSale.filter(({ t }) => world.sites.some((s) => s.x === wrapped(world, t.x) && s.y === t.y)).length;
    im.text(`tw-p-${p.id}`, `Plots built ${used}/${forSale.length}`, x + w - 16, y + 78, { size: 11, color: COLORS.muted, align: 'right', layer: 3 });

    let cy = y + 100;
    for (const [dock, label] of [['market', 'MARKET WANTS'], ['freight', 'FREIGHT YARD WANTS']] as const) {
      const site = world.sites.find((s) => s.placeId === p.id && SITE_DEFS[s.kind].dock === dock);
      if (!site) continue;
      im.text(`tw-${dock}-h-${p.id}`, label, x + 16, cy, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
      cy += 18;
      const goods = dockDemand(world, site);
      const cap = siteCap(world, site);
      goods.forEach((g, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const gx = x + 16 + col * (chipW + 6);
        const gy = cy + row * (chipH + 6);
        const have = stockOf(site, g) / cap;
        const color = have > 0.4 ? COLORS.good : have > 0.05 ? COLORS.warn : COLORS.bad;
        im.rect(3, gx, gy, chipW, chipH, 0x10161e, 1, 8, color, 0.7);
        im.text(`tw-c-${p.id}-${dock}-${g}`, GOODS[g].label, gx + 8, gy + 3, { size: 11, bold: true, layer: 3 });
        im.text(`tw-cp-${p.id}-${dock}-${g}`, `$${unitPrice(world, site, g).toFixed(1)}`, gx + chipW - 8, gy + 3, { size: 11, color: COLORS.warn, align: 'right', layer: 3 });
        im.bar(3, gx + 8, gy + 21, chipW - 16, 4, have, color);
      });
      cy += Math.ceil(goods.length / perRow) * (chipH + 6) + 2;
    }
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
      y += h + 18;
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

    // What it lives on: a square per good, bright when the town's docks have it in stock.
    const docks = world.sites.filter((s) => s.placeId === p.id && SITE_DEFS[s.kind].dock);
    def.goods.slice(0, 9).forEach((g, k) => {
      const have = docks.some((d) => stockOf(d, g) >= 1);
      im.rect(3, x + 16 + k * 20, y + 70, 15, 15, GOODS[g].color, have ? 1 : 0.22, 3);
    });
    const bits: string[] = [];
    if (def.price > 0) bits.push(`+${Math.round(def.price * shown * boost * 100)}% price on ${def.goods.length} goods`);
    if (def.revenue > 0) {
      bits.push(`$${fmt(def.revenue * shown * boost)}/min at full supply${lvl > 0 ? ` (now ${Math.round(districtSatisfaction(world, p, id) * 100)}%)` : ''}`);
    }
    if (def.effect === 'storage') bits.push(`docks hold +${Math.round((def.capstone ? 30 : 25) * shown * boost)}%`);
    if (def.effect === 'growth') bits.push(`growth +${20 * shown}%`);
    if (def.effect === 'visitors') bits.push('income grows with the variety delivered');
    const ask = [...(def.demand?.market ?? []), ...(def.demand?.freight ?? [])];
    if (ask.length) bits.push(`asks for ${ask.map((g) => GOODS[g].label.toLowerCase()).join(', ')}`);
    im.text(`dc-s-${p.id}-${id}`, bits.join('  ·  '), x + 16, y + 92, { size: 11, color: COLORS.text, wrap: w - 32 - 160, layer: 3 });

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

  private guide(v: View): number {
    const im = this.cim;
    const gap = 14;
    const cols = v.x1 - v.x0 > 820 ? 2 : 1;
    const cw = (v.x1 - v.x0 - gap * (cols - 1)) / cols;
    const colY = new Array<number>(cols).fill(0);
    GUIDE.forEach((sec, i) => {
      // Shortest column first keeps the two sides balanced.
      let c = 0;
      for (let k = 1; k < cols; k++) if (colY[k] < colY[c]) c = k;
      const x = v.x0 + c * (cw + gap);
      const y = v.y0 - this.scroll + colY[c];
      const icon = sec.icon && this.hooks.hasTexture(sec.icon) ? sec.icon : null;
      const tx = x + 18 + (icon ? 66 : 0);
      const t1 = im.text(`gd-t-${i}`, sec.title, tx, y + 14, { size: 16, bold: true, color: COLORS.accent, layer: 3 });
      const t2 = im.text(`gd-b-${i}`, bodyText(sec.body), tx, y + 18 + t1.h, { size: 13, wrap: x + cw - 18 - tx, layer: 3 });
      const h = Math.max(icon ? 88 : 0, 18 + t1.h + t2.h + 18);
      im.rect(3, x, y, cw, h, COLORS.panelAlt, 1, 14, COLORS.line, 1);
      if (icon) im.image(`gd-i-${i}`, icon, x + 12, y + 14, 60, 60, 1, 3);
      colY[c] += h + gap;
    });
    return Math.max(...colY) + 4;
  }
}
