// The company pages: a home dashboard that shows how the whole business is doing at a glance, and the fleet garage where every
// vehicle is listed, upgraded and sold. Drawn with the same immediate-mode helper as the other sheets, in console style:
// square panels, a coloured edge, big numbers and small capitals.
import { GOODS, SITE_DEFS, TIERS, TOWN_LEVELS, VEHICLE_DEFS, VEHICLE_UPKEEP, vehicleLabel, type VehicleKind } from '../sim/defs';
import { netWorth } from '../sim/bank';
import { condition, serviceCost, serviceVehicle } from '../sim/drivers';
import { PERKS, PERK_MAX, buyPerk, perkError, perkLevel, pointsLeft } from '../sim/perks';
import { diagnoseAll, shortOf } from '../sim/diagnose';
import { nextQuest } from '../sim/quests';
import {
  bottlenecks,
  buyError,
  buyOptions,
  fleetOf,
  idleSurplus,
  isIdle,
  sellVehicle,
  sellVehicleValue,
  type Place,
  type Site,
  type Vehicle,
  type World,
} from '../sim/world';
import { COLORS, Im } from './imui';
import { drawIcon, type IconName } from './icons';

export interface PageView {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface PageHooks {
  focusSite: (s: Site) => void;
  focusPlace: (p: Place) => void;
  hasTexture: (key: string) => boolean;
  toast: (text: string) => void;
  income: () => number;
  /** Buying a vehicle asks who drives it first. */
  pickDriver: (siteId: number, kind: VehicleKind) => void;
  open: (page: 'production' | 'fleet' | 'towns' | 'bank' | 'quests') => void;
}

const fmt = (n: number): string => Math.floor(n).toLocaleString('en-US');
const money = (n: number): string => `${n < 0 ? '-' : ''}$${fmt(Math.abs(n))}`;
const PANEL = 0x0f161d;
const PANEL_HI = 0x17212b;

/** A square console panel with a coloured edge down its left side. */
export function panel(im: Im, x: number, y: number, w: number, h: number, edge: number = COLORS.line, hot = false): void {
  im.rect(3, x, y, w, h, hot ? PANEL_HI : PANEL, 1, 3, COLORS.line, 1);
  im.rect(3, x, y, 3, h, edge, 1, 0);
}

/** A section title: a small coloured square, the words in capitals, and a rule across. */
export function sectionHead(im: Im, id: string, text: string, x: number, y: number, w: number, right?: string): void {
  im.rect(3, x, y + 4, 8, 8, COLORS.accent, 1, 1);
  im.text(`${id}t`, text.toUpperCase(), x + 16, y + 1, { size: 11, bold: true, color: COLORS.text, layer: 3 });
  if (right) im.text(`${id}r`, right, x + w, y + 1, { size: 11, color: COLORS.muted, align: 'right', layer: 3 });
  im.line(3, x, y + 20, x + w, y + 20, COLORS.line, 0.8, 1);
}

/** A big number with its label, in a square tile. */
export function stat(im: Im, id: string, x: number, y: number, w: number, h: number, label: string, value: string, color: number = COLORS.text, edge: number = COLORS.accent): void {
  // A soft rounded card: a coloured dot by the label, the number large, and a short accent line along the foot.
  im.rect(3, x, y, w, h, PANEL, 0.85, 8, COLORS.line, 0.6);
  im.circle(3, x + 17, y + 14, 3, edge);
  im.text(`${id}l`, label.toUpperCase(), x + 26, y + 8, { size: 10, bold: true, color: COLORS.muted, layer: 3 });
  im.text(`${id}v`, value, x + 14, y + 22, { size: fitSize(value, w - 28, 26, 14, 0.5), bold: true, color, layer: 3 });
  im.rect(3, x + 14, y + h - 2, 28, 2, edge, 0.9, 1);
}

/** Text sized to fit a width: the size asked for, or smaller down to a floor. */
export function fitSize(text: string, width: number, size: number, floor = 8, perChar = 0.56): number {
  const need = text.length * size * perChar;
  return need <= width ? size : Math.max(floor, Math.floor((size * width) / need));
}

/** An empty page: an icon, a short title and one line on what to do. Returns its height. */
export function emptyState(im: Im, id: string, x: number, y: number, w: number, icon: IconName, title: string, body: string): number {
  const h = 150;
  im.rect(3, x, y, w, h, 0x0f161d, 0.9, 6, COLORS.line, 1);
  im.circle(3, x + w / 2, y + 40, 26, 0x18232c);
  drawIcon(im, icon, x + w / 2, y + 40, COLORS.accent, 0x18232c, 4);
  im.text(`${id}t`, title, x + w / 2, y + 76, { size: 20, bold: true, align: 'center', layer: 4 });
  im.text(`${id}b`, body, x + w / 2, y + 108, { size: 13, color: COLORS.muted, align: 'center', wrap: Math.min(w - 40, 560), layer: 4 });
  return h;
}

/** A quiet status line: a coloured dot and a short note, for a state with nothing to press. */
export function statusLine(im: Im, id: string, text: string, x: number, y: number, color: number): void {
  im.circle(3, x + 6, y + 8, 4.5, color);
  im.text(`${id}s`, text, x + 18, y, { size: 13, bold: true, color, layer: 3 });
}

/** A console button: angled like the website's, with a bright face when it can be pressed. The label shrinks (and wraps, if asked) so all of it shows. */
export function button(im: Im, id: string, label: string, x: number, y: number, w: number, h: number, enabled: boolean, onClick: () => void, tone: 'main' | 'danger' | 'quiet' = 'quiet', wrap = false): void {
  const hov = im.hit(id, x, y, w, h, () => enabled && onClick(), 3);
  const face = !enabled ? 0x121920 : tone === 'main' ? (hov ? 0xf4b84f : COLORS.accent) : tone === 'danger' ? (hov ? 0x6a2a26 : 0x4a1f1c) : hov ? 0x26364a : 0x1a2431;
  const line = !enabled ? COLORS.line : tone === 'main' ? COLORS.accent : tone === 'danger' ? COLORS.bad : hov ? COLORS.accent : COLORS.line;
  im.slab(3, x, y, w, h, face, 1, line, 1);
  const ink = !enabled ? COLORS.muted : tone === 'main' ? 0x1b1204 : COLORS.text;
  const room = w - 18;
  const size = fitSize(label, room, 15, wrap ? 12 : 10, 0.46);
  const two = wrap && label.length * size * 0.46 > room;
  const ty = two ? y + 4 : y + h / 2 - size * 0.62;
  im.text(`${id}t`, label.toUpperCase(), x + w / 2, ty, { size, bold: true, display: true, color: ink, align: 'center', wrap: two ? room : undefined, layer: 4, alpha: enabled ? 1 : 0.7 });
}

// ---- company: the home dashboard ----

export function companyPage(im: Im, world: World, v: PageView, scroll: number, hooks: PageHooks): number {
  const W = v.x1 - v.x0;
  let y = v.y0 - scroll;
  const vis = (yy: number, hh: number): boolean => yy + hh > v.y0 && yy < v.y1;
  const gap = 12;
  const buildings = world.sites.filter((s) => !SITE_DEFS[s.kind].dock && !SITE_DEFS[s.kind].station);
  const stuck = bottlenecks(world);
  const lost = stuck.reduce((n, b) => n + b.lostPerMin, 0);
  const working = world.vehicles.filter((q) => !isIdle(q)).length;
  const income = hooks.income();

  // The numbers that matter, across the top.
  const tiles: [string, string, number, number][] = [
    ['Cash', money(world.money), COLORS.text, COLORS.accent],
    ['Income a minute', `${income >= 0 ? '+' : ''}${money(income)}`, income > 0 ? COLORS.good : COLORS.muted, COLORS.good],
    ['Net worth', money(netWorth(world)), COLORS.accent, COLORS.accent],
    ['Buildings', String(buildings.length), COLORS.text, COLORS.info],
    ['Vehicles working', `${working} / ${world.vehicles.length}`, COLORS.text, COLORS.info],
    [lost > 0 ? 'Idle income a minute' : 'Running', lost > 0 ? money(lost) : 'All good', lost > 0 ? COLORS.warn : COLORS.good, lost > 0 ? COLORS.warn : COLORS.good],
  ];
  const tc = W < 620 ? 2 : W < 980 ? 3 : 6;
  const tw = (W - gap * (tc - 1)) / tc;
  tiles.forEach(([label, value, color, edge], k) => {
    const tx = v.x0 + (k % tc) * (tw + gap);
    const ty = y + Math.floor(k / tc) * 66;
    if (vis(ty, 58)) stat(im, `co-s${k}`, tx, ty, tw, 58, label, value, color, edge);
  });
  y += Math.ceil(tiles.length / tc) * 66 + 8;

  const two = W >= 900;
  const colW = two ? (W - gap) / 2 : W;
  const left = v.x0;
  const right = two ? v.x0 + colW + gap : v.x0;
  let yl = y;
  let yr = two ? y : -1;

  // Needs attention: the buildings that are held up, the costliest first.
  if (vis(yl, 24)) sectionHead(im, 'co-att', 'Needs attention', left, yl, colW, stuck.length ? `${stuck.length} held up` : undefined);
  yl += 30;
  const sick = buildings
    .map((s) => ({ s, d: diagnoseAll(world, s), cost: stuck.find((b) => b.site.id === s.id)?.lostPerMin ?? 0 }))
    .filter((r) => r.d.level === 'warn' || r.d.level === 'bad' || r.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 7);
  if (sick.length === 0) {
    if (vis(yl, 40)) {
      panel(im, left, yl, colW, 40, COLORS.good);
      im.text('co-ok', 'Everything is running. Build, upgrade or open a new route.', left + 16, yl + 12, { size: 13, color: COLORS.good, layer: 3 });
    }
    yl += 50;
  }
  sick.forEach((r, k) => {
    if (vis(yl, 46)) {
      const hov = im.hit(`co-a${k}`, left, yl, colW, 42, () => hooks.focusSite(r.s), 3);
      panel(im, left, yl, colW, 42, r.d.level === 'bad' ? COLORS.bad : COLORS.warn, hov);
      im.text(`co-an${k}`, r.s.name, left + 16, yl + 6, { size: 13, bold: true, wrap: colW - 190, layer: 4 });
      im.text(`co-as${k}`, shortOf(r.d), left + 16, yl + 24, { size: 11, color: COLORS.warn, wrap: colW - 190, layer: 4 });
      if (r.cost > 0) im.text(`co-ac${k}`, `${money(r.cost)}/min idle`, left + colW - 78, yl + 13, { size: 12, bold: true, color: COLORS.bad, align: 'right', layer: 4 });
      im.text(`co-ag${k}`, 'GO', left + colW - 22, yl + 13, { size: 11, bold: true, color: COLORS.accent, align: 'center', layer: 4 });
    }
    yl += 48;
  });
  yl += 8;

  // The next objective.
  if (vis(yl, 24)) sectionHead(im, 'co-obj', 'Objective', left, yl, colW, `Tier ${world.tier}${TIERS[world.tier] ? ` · ${TIERS[world.tier].name}` : ''}`);
  yl += 30;
  const next = nextQuest(world);
  if (vis(yl, 70)) {
    const hov = im.hit('co-quest', left, yl, colW, 66, () => hooks.open('quests'), 3);
    panel(im, left, yl, colW, 66, COLORS.accent, hov);
    if (next) {
      im.text('co-qn', next.quest.label, left + 16, yl + 8, { size: 14, bold: true, wrap: colW - 130, layer: 4 });
      im.text('co-qh', next.quest.hint, left + 16, yl + 28, { size: 11, color: COLORS.muted, wrap: colW - 130, layer: 4 });
      im.bar(4, left + 16, yl + 54, colW - 140, 5, Math.min(1, next.progress.have / Math.max(1, next.progress.need)), COLORS.accent);
      im.text('co-qp', `${fmt(next.progress.have)} / ${fmt(next.progress.need)}`, left + colW - 14, yl + 10, { size: 13, bold: true, color: COLORS.warn, align: 'right', layer: 4 });
      im.text('co-qr', `Reward ${money(next.quest.reward)}`, left + colW - 14, yl + 32, { size: 11, color: COLORS.good, align: 'right', layer: 4 });
    } else im.text('co-qn', 'All quests complete', left + 16, yl + 24, { size: 14, bold: true, color: COLORS.good, layer: 4 });
  }
  yl += 76;

  // The fleet, class by class.
  if (two) {
    yr = y;
  } else {
    yr = yl;
  }
  if (vis(yr, 24)) sectionHead(im, 'co-fl', 'Fleet', right, yr, colW, `${world.vehicles.length} vehicles`);
  yr += 30;
  const kinds = (Object.keys(VEHICLE_DEFS) as VehicleKind[]).filter((k) => world.vehicles.some((q) => q.kind === k));
  if (kinds.length === 0) {
    if (vis(yr, 40)) {
      panel(im, right, yr, colW, 40, COLORS.muted);
      im.text('co-nf', 'No vehicles yet. Click a building and buy a truck.', right + 16, yr + 12, { size: 13, color: COLORS.muted, layer: 3 });
    }
    yr += 50;
  }
  const most = Math.max(1, ...kinds.map((k) => world.vehicles.filter((q) => q.kind === k).length));
  kinds.forEach((k, i) => {
    const all = world.vehicles.filter((q) => q.kind === k);
    const busy = all.filter((q) => q.routeId !== 0).length;
    if (vis(yr, 32)) {
      panel(im, right, yr, colW, 30, COLORS.info);
      im.text(`co-fk${i}`, VEHICLE_DEFS[k].label, right + 16, yr + 8, { size: 12, bold: true, layer: 4 });
      const bx = right + 150;
      const bw = Math.max(40, colW - 150 - 120);
      im.rect(4, bx, yr + 11, bw, 8, 0x0a0f14, 1, 1);
      im.rect(4, bx, yr + 11, bw * (all.length / most), 8, 0x2c3c4e, 1, 1);
      im.rect(4, bx, yr + 11, bw * (busy / most), 8, COLORS.good, 1, 1);
      im.text(`co-fn${i}`, `${busy} / ${all.length} working`, right + colW - 12, yr + 8, { size: 11, color: busy < all.length ? COLORS.warn : COLORS.muted, align: 'right', layer: 4 });
    }
    yr += 36;
  });
  if (vis(yr, 40) && world.vehicles.length > 0) button(im, 'co-gar', 'Open the garage', right, yr, colW, 36, true, () => hooks.open('fleet'), 'quiet');
  if (world.vehicles.length > 0) yr += 46;
  yr += 8;

  // Towns, the biggest first, with how close each is to the next level.
  if (vis(yr, 24)) sectionHead(im, 'co-tw', 'Towns', right, yr, colW, `${world.places.length} on the map`);
  yr += 30;
  const towns = [...world.places].sort((a, b) => b.level - a.level || b.growth - a.growth).slice(0, 6);
  towns.forEach((p, k) => {
    if (vis(yr, 40)) {
      const hov = im.hit(`co-t${k}`, right, yr, colW, 36, () => hooks.focusPlace(p), 3);
      panel(im, right, yr, colW, 36, COLORS.accent, hov);
      const lv = TOWN_LEVELS[p.level - 1];
      const nx = TOWN_LEVELS[p.level];
      im.text(`co-tn${k}`, p.name, right + 16, yr + 5, { size: 13, bold: true, layer: 4 });
      im.text(`co-tl${k}`, `${lv.name}`, right + 16, yr + 21, { size: 10, color: COLORS.muted, layer: 4 });
      const bx = right + 170;
      const bw = Math.max(40, colW - 170 - 70);
      im.rect(4, bx, yr + 14, bw, 7, 0x0a0f14, 1, 1);
      if (nx) im.rect(4, bx, yr + 14, bw * Math.min(1, p.growth / nx.growth), 7, COLORS.good, 1, 1);
      else im.rect(4, bx, yr + 14, bw, 7, COLORS.accent, 1, 1);
      im.text(`co-tp${k}`, `Lv ${p.level}`, right + colW - 12, yr + 10, { size: 12, bold: true, color: COLORS.accent, align: 'right', layer: 4 });
    }
    yr += 42;
  });
  yr += 8;

  let total = Math.max(yl, yr);
  void GOODS;

  // Company skills: points to spend on lasting perks.
  if (vis(total, 24)) sectionHead(im, 'co-sk', 'Company skills', v.x0, total, W, `${pointsLeft(world)} point${pointsLeft(world) === 1 ? '' : 's'} to spend`);
  total += 30;
  const kw = (W - gap * (PERKS.length - 1)) / PERKS.length;
  PERKS.forEach((p, k) => {
    const kx = v.x0 + k * (kw + gap);
    if (vis(total, 96)) {
      const lv = perkLevel(world, p.id);
      panel(im, kx, total, kw, 92, lv > 0 ? COLORS.accent : COLORS.line);
      im.text(`co-pk${k}`, p.label.toUpperCase(), kx + 16, total + 8, { size: 13, bold: true, layer: 4 });
      im.text(`co-pb${k}`, p.blurb, kx + 16, total + 28, { size: 11, color: COLORS.muted, wrap: kw - 32, layer: 4 });
      for (let i = 0; i < PERK_MAX; i++) im.rect(4, kx + 16 + i * 22, total + 62, 18, 14, i < lv ? COLORS.accent : 0x0a0f14, 1, 2, i < lv ? COLORS.accent : COLORS.line, 1);
      const err = perkError(world, p.id);
      button(im, `co-pu${k}`, lv >= PERK_MAX ? 'MAXED' : '+1 LEVEL', kx + kw - 110, total + 56, 94, 26, !err, () => hooks.toast(buyPerk(world, p.id) ?? `${p.label} improved`), 'main');
    }
    if (k === PERKS.length - 1) total += 100;
  });
  return total + scroll - v.y0 + 8;
}

// ---- fleet: the garage ----

/** The biggest class a building's yard can take now, going by its level, and the level the next one is waiting on. */
function garage(world: World, s: Site): { top: VehicleKind | null; next: { kind: VehicleKind; level: number } | null } {
  const start = buyOptions(world, s.id)[0];
  if (!start) return { top: null, next: null };
  let top: VehicleKind | null = null;
  let kind: VehicleKind | undefined = start;
  let next: { kind: VehicleKind; level: number } | null = null;
  while (kind) {
    const d: (typeof VEHICLE_DEFS)[VehicleKind] = VEHICLE_DEFS[kind];
    if (d.needLevel <= s.level) top = kind;
    else {
      next = { kind, level: d.needLevel };
      break;
    }
    kind = d.next;
  }
  return { top, next };
}

function vehicleState(world: World, v: Vehicle): { text: string; color: number } {
  if (v.back) return { text: 'Returning home', color: COLORS.warn };
  if (v.routeId === 0) return { text: 'Waiting: no route', color: COLORS.warn };
  if (v.state === 'loading') return { text: 'Loading', color: COLORS.info };
  if (v.state === 'unloading') return { text: 'Unloading', color: COLORS.info };
  const dest = world.sites.find((q) => q.id === v.destId);
  return { text: v.cargo > 0 && v.good ? `Carrying ${Math.floor(v.cargo)} ${GOODS[v.good].label.toLowerCase()}` : dest ? `To ${dest.name}` : 'On the road', color: COLORS.good };
}

export function fleetPage(im: Im, world: World, v: PageView, scroll: number, hooks: PageHooks): number {
  const W = v.x1 - v.x0;
  let y = v.y0 - scroll;
  const vis = (yy: number, hh: number): boolean => yy + hh > v.y0 && yy < v.y1;
  const gap = 12;
  const vehicles = world.vehicles;
  const working = vehicles.filter((q) => !isIdle(q)).length;
  const value = vehicles.reduce((n, q) => n + VEHICLE_DEFS[q.kind].cost, 0);
  const upkeep = vehicles.reduce((n, q) => n + VEHICLE_DEFS[q.kind].cost * VEHICLE_UPKEEP, 0);
  const worn = vehicles.filter((q) => condition(q) < 0.6);
  const tiles: [string, string, number][] = [
    ['Vehicles', String(vehicles.length), COLORS.text],
    ['Working', String(working), COLORS.good],
    ['Idle', String(vehicles.length - working), vehicles.length - working > 0 ? COLORS.warn : COLORS.muted],
    ['Fleet value', money(value), COLORS.accent],
    ['Upkeep a minute', money(upkeep), COLORS.bad],
    ['Need service', String(worn.length), worn.length ? COLORS.warn : COLORS.muted],
  ];
  const tc = W < 620 ? 2 : W < 900 ? 3 : 6;
  const tw = (W - gap * (tc - 1)) / tc;
  tiles.forEach(([label, val, color], k) => {
    const tx = v.x0 + (k % tc) * (tw + gap);
    const ty = y + Math.floor(k / tc) * 66;
    if (vis(ty, 58)) stat(im, `fl-s${k}`, tx, ty, tw, 58, label, val, color, color === COLORS.text ? COLORS.info : color);
  });
  y += Math.ceil(tiles.length / tc) * 66 + 2;
  // Two fleet actions on one row. With nothing to do, each shows as a quiet status line, not a greyed-out button.
  const surplus = idleSurplus(world);
  if (vis(y, 34)) {
    const bill = worn.reduce((n, q) => n + serviceCost(q), 0);
    if (worn.length)
      button(im, 'fl-svc', `SERVICE ALL WORN  ${worn.length}  ·  ${money(bill)}`, v.x0, y, 300, 30, world.money >= Math.min(...worn.map(serviceCost)), () => {
        let done = 0;
        for (const q of worn) if (serviceVehicle(world, q.id) === null) done++;
        hooks.toast(done ? `Serviced ${done} vehicle${done === 1 ? '' : 's'}` : 'Not enough money');
      }, 'main');
    else statusLine(im, 'fl-svc', 'All vehicles in good shape', v.x0, y + 7, COLORS.good);
    // Idle vehicles earn nothing and still cost upkeep and a wage: one click sells the surplus, keeping a vehicle on every line.
    const back = surplus.reduce((n, q) => n + sellVehicleValue(q), 0);
    const cost = surplus.reduce((n, q) => n + VEHICLE_DEFS[q.kind].cost * VEHICLE_UPKEEP * 0.4, 0);
    if (surplus.length)
      button(im, 'fl-idle', `SELL ${surplus.length} IDLE  ·  +${money(back)}  ·  saves ${money(cost)} a minute`, v.x0 + 316, y, 420, 30, true, () => {
        let done = 0;
        for (const q of surplus) if (sellVehicle(world, q.id) === null) done++;
        hooks.toast(`Sold ${done} idle vehicle${done === 1 ? '' : 's'}`);
      }, 'danger');
    else statusLine(im, 'fl-idle', 'No idle vehicles', v.x0 + 316, y + 7, COLORS.muted);
  }
  y += 44;

  // Every building that has a yard, the ones with vehicles first.
  const homes = world.sites
    .filter((s) => !SITE_DEFS[s.kind].dock && !SITE_DEFS[s.kind].station && buyOptions(world, s.id).length > 0)
    .sort((a, b) => fleetOf(world, b.id).length - fleetOf(world, a.id).length || a.id - b.id);
  if (homes.length === 0) {
    if (vis(y, 40)) {
      panel(im, v.x0, y, W, 44, COLORS.muted);
      im.text('fl-none', 'No buildings with a yard yet. Build a camp, farm or factory, then buy its first truck here.', v.x0 + 16, y + 14, { size: 13, color: COLORS.muted, wrap: W - 32, layer: 3 });
    }
    return y + 60 + scroll - v.y0;
  }
  for (const s of homes) {
    const fleet = fleetOf(world, s.id);
    const g = garage(world, s);
    const lines = (s.byTo || SITE_DEFS[s.kind].produce?.also) ? ['main', 'by'] : ['main'];
    void lines;
    const rowH = 46;
    const headH = 52;
    const total = headH + fleet.length * rowH + 58;
    if (vis(y, total)) {
      panel(im, v.x0, y, W, headH, COLORS.accent, true);
      const key = `thumb-${s.kind}`;
      if (hooks.hasTexture(key)) im.image(`fl-i${s.id}`, key, v.x0 + 12, y + 4, 44, 44, 1, 4);
      const nameHov = im.hit(`fl-h${s.id}`, v.x0 + 60, y + 4, W - 330, 44, () => hooks.focusSite(s), 3);
      im.text(`fl-n${s.id}`, s.name, v.x0 + 66, y + 7, { size: 14, bold: true, color: nameHov ? COLORS.accent : COLORS.text, layer: 4 });
      im.text(`fl-k${s.id}`, `${SITE_DEFS[s.kind].label} · Level ${s.level}`, v.x0 + 66, y + 28, { size: 11, color: COLORS.muted, layer: 4 });
      const limit = 3 + 2 * s.level;
      const used = fleet.length;
      // The garage: how many it can run, and the biggest class it can take.
      im.text(`fl-g${s.id}`, 'GARAGE', v.x0 + W - 300, y + 7, { size: 9, bold: true, color: COLORS.muted, layer: 4 });
      im.text(`fl-gv${s.id}`, `${used} / ${limit} per line`, v.x0 + W - 300, y + 21, { size: 12, bold: true, color: used >= limit ? COLORS.warn : COLORS.text, layer: 4 });
      im.text(`fl-c${s.id}`, 'BIGGEST CLASS', v.x0 + W - 170, y + 7, { size: 9, bold: true, color: COLORS.muted, layer: 4 });
      im.text(`fl-cv${s.id}`, g.top ? VEHICLE_DEFS[g.top].label : 'None', v.x0 + W - 170, y + 21, { size: 12, bold: true, layer: 4 });
      if (g.next) im.text(`fl-cn${s.id}`, `${VEHICLE_DEFS[g.next.kind].label} at level ${g.next.level}`, v.x0 + W - 170, y + 36, { size: 9, color: COLORS.warn, layer: 4 });
    }
    let ry = y + headH + 4;
    fleet.forEach((q, i) => {
      if (vis(ry, rowH)) {
        const st = vehicleState(world, q);
        panel(im, v.x0, ry, W, rowH - 4, st.color);
        im.text(`fl-vn${q.id}`, `${vehicleLabel(q.kind, q.body)} ${i + 1}`, v.x0 + 16, ry + 5, { size: 13, bold: true, layer: 4 });
        im.text(`fl-vs${q.id}`, st.text, v.x0 + 16, ry + 22, { size: 11, color: st.color, layer: 4 });
        const cond = condition(q);
        const tint = cond > 0.6 ? COLORS.good : cond > 0.3 ? COLORS.warn : COLORS.bad;
        im.text(`fl-vc${q.id}`, `carries ${VEHICLE_DEFS[q.kind].capacity}`, v.x0 + 230, ry + 6, { size: 11, color: COLORS.muted, layer: 4 });
        im.rect(4, v.x0 + 230, ry + 26, 90, 5, 0x0a0f14, 1, 1);
        im.rect(4, v.x0 + 230, ry + 26, 90 * cond, 5, tint, 1, 1);
        const bw = 118;
        button(im, `fl-x${q.id}`, `Sell +${money(sellVehicleValue(q))}`, v.x0 + W - bw + 6, ry + 5, bw - 10, rowH - 14, true, () => hooks.toast(sellVehicle(world, q.id) ?? 'Sold'), 'danger');
      }
      ry += rowH;
    });
    // Buying: one button for each class this yard can start with, and the reason when one cannot be bought.
    if (vis(ry, 56)) {
      let bx = v.x0;
      let reason = '';
      for (const kind of buyOptions(world, s.id)) {
        const err = buyError(world, s.id, kind);
        const full = fleet.length >= 3 + 2 * s.level;
        const why = err ?? (full ? 'This yard is full: upgrade the building to run more' : null);
        if (why && !reason) reason = why;
        button(im, `fl-b${s.id}${kind}`, `+ ${VEHICLE_DEFS[kind].label} ${money(VEHICLE_DEFS[kind].cost)}`, bx, ry, 210, 32, !why, () => hooks.pickDriver(s.id, kind), 'quiet');
        bx += 218;
      }
      if (reason) im.text(`fl-be${s.id}`, reason, v.x0, ry + 38, { size: 10, color: COLORS.warn, wrap: W, layer: 4 });
    }
    y += total + 10;
  }
  return y + scroll - v.y0 + 8;
}
