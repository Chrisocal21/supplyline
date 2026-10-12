// The overview sheets: production (goods, rates, buildings), towns (what each town needs), quests (the tier goals)
// and the how-to-play guide. Drawn with the immediate-mode helper, like the rest of the HUD. All scroll with the wheel.
import {
  GOODS,
  GOOD_LIST,
  SITE_DEFS,
  STYLE_LABEL,
  TICKS_PER_SECOND,
  TIERS,
  TOWN_LEVELS,
  type Good,
} from '../sim/defs';
import { questState, tierUnlocks } from '../sim/quests';
import { dockDemand, isHomePlot, plotTiles, radiusOf, produces, siteCap, stockOf, unitPrice, wants, type Place, type Site, type World } from '../sim/world';
import { COLORS, Im } from './imui';

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
const GUIDE: { title: string; body: string; icon?: string }[] = [
  {
    title: 'The idea',
    body: 'Towns buy goods. You make the goods, haul them to town and get paid. Sales grow the towns, bigger towns want more kinds of goods, and finished quests unlock new tiers of buildings and vehicles.',
    icon: 'thumb-market',
  },
  {
    title: 'Looking around',
    body: 'Drag to move the map. Right-drag to turn and tilt. Scroll to zoom, from the whole globe down to street level. W A S D or the arrow keys also move, and Q and E turn.',
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
    body: 'Open Logistics and pick Road. Drag from one building to the other. The road finds its own way round hills, bridges water and tunnels under mountains (those cost more). To steer it, click along the way to drop corners. Backspace undoes a corner and Esc cancels. A box truck comes with every road.',
    icon: 'thumb-route',
  },
  {
    title: 'Step 4: sell',
    body: 'The Market buys finished goods. From level 2 a town also has a Freight Yard for raw goods and by-products. Open Towns (T) to see what each town wants and what it pays. A town pays less for something it is already full of, and prices swing with market surges.',
  },
  {
    title: 'Growing towns',
    body: 'Every sale adds growth. To level up a town needs growth and variety: the more kinds of goods you sell it, the higher it can go. Bigger towns want more goods and buy more of them, and the major cities buy much more.',
  },
  {
    title: 'Keeping things moving',
    body: 'Click a building to see its stock and what is holding it up. Full means nothing is taking its goods away: add a vehicle (Vehicles, then click the road) or another customer. Waiting means it is short of an input. Upgrade a building to make it faster and roomier. The Production sheet (P) lists the problems first.',
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
    body: 'The bar at the top shows your next quest. Click it, or press G, for the full list. Finish every quest of a tier to unlock the next one: new buildings and vehicles, longer bridges and tunnels, and higher building levels. Each quest pays a reward.',
  },
  {
    title: 'Shortcuts',
    body: 'Tab: next category. 1 to 9: pick a card. P: production. T: towns. G: quests. H: this guide. Space: pause. Esc: cancel or close. The game saves by itself every 20 seconds.',
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
}

export class Sheets {
  scroll = 0;
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
    const contentH = id === 'production' ? this.production(world, view) : id === 'towns' ? this.towns(world, view) : id === 'quests' ? this.quests(world, view) : this.guide(view);
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
    const cols = v.x1 - v.x0 > 760 ? 2 : 1;
    const cw = (v.x1 - v.x0 - gap * (cols - 1)) / cols;
    const places = [...world.places].sort((a, b) => b.level - a.level || b.growth - a.growth || a.id - b.id);
    if (places.length === 0) return 0;

    const chipW = 100;
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
      const t2 = im.text(`gd-b-${i}`, sec.body, tx, y + 18 + t1.h, { size: 13, wrap: x + cw - 18 - tx, layer: 3 });
      const h = Math.max(icon ? 88 : 0, 18 + t1.h + t2.h + 18);
      im.rect(3, x, y, cw, h, COLORS.panelAlt, 1, 14, COLORS.line, 1);
      if (icon) im.image(`gd-i-${i}`, icon, x + 12, y + 14, 60, 60, 1, 3);
      colY[c] += h + gap;
    });
    return Math.max(...colY) + 4;
  }
}
