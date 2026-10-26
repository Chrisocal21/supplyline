// The vehicle card: a garage plate for one vehicle, with its class ladder, its stats beside the next class up, and its driver's
// rank. The way a trucking game shows a truck you can level up.
import { DRIVER_RANKS, DRIVER_REACH, DRIVER_SPEED, DRIVER_TRIPS, GOODS, SITE_DEFS, VEHICLE_DEFS, VEHICLE_REACH, type VehicleKind } from '../sim/defs';
import { driverLevel, PICK_LABEL, PICK_MODES, runsOf, sellVehicleValue, siteById, vehicleRoute, vehicleTicks, wrapDx, type PickMode, type TruckRun, type Vehicle, type World } from '../sim/world';
import { button, fitSize, panel } from './company';
import { COLORS, Im } from './imui';

const fmt = (n: number): string => Math.floor(n).toLocaleString('en-US');
const MODE_COLOR: Record<string, number> = { road: 0xdfb66d, rail: 0x8cbace, sea: 0x5fc4c0, air: 0xb59ae0 };

/** A small drawn picture for the kind of vehicle, in the badge. */
export function vehicleIcon(im: Im, mode: string, cx: number, cy: number, c: number): void {
  if (mode === 'road') {
    im.rect(4, cx - 14, cy - 8, 17, 13, c, 1, 1);
    im.rect(4, cx + 5, cy - 3, 9, 8, c, 1, 1);
    im.circle(4, cx - 7, cy + 7, 3.5, c);
    im.circle(4, cx + 8, cy + 7, 3.5, c);
  } else if (mode === 'rail') {
    im.rect(4, cx - 15, cy - 6, 30, 11, c, 1, 1);
    im.rect(4, cx + 6, cy - 12, 8, 7, c, 1, 1);
    im.circle(4, cx - 9, cy + 8, 3, c);
    im.circle(4, cx, cy + 8, 3, c);
    im.circle(4, cx + 9, cy + 8, 3, c);
  } else if (mode === 'sea') {
    im.rect(4, cx - 15, cy, 30, 8, c, 1, 1);
    im.rect(4, cx - 6, cy - 9, 12, 9, c, 1, 1);
    im.rect(4, cx + 1, cy - 14, 3, 5, c, 1, 0);
  } else {
    im.line(4, cx - 15, cy + 2, cx + 14, cy + 2, c, 1, 4);
    im.line(4, cx - 2, cy - 11, cx + 2, cy + 2, c, 1, 4);
    im.line(4, cx - 2, cy + 14, cx + 2, cy + 2, c, 1, 4);
    im.line(4, cx - 15, cy - 3, cx - 12, cy + 2, c, 1, 3);
  }
}

export interface CardInfo {
  status: { text: string; color: number };
  /** The preference when no buyer is pinned. */
  pick: PickMode;
  copyOk: boolean;
  copyCost: number;
  unit: string;
  driver: string;
  /** 0 (worn out) to 1 (new). */
  condition: number;
  serviceCost: number;
  serviceOk: boolean;
}

export interface CardActions {
  /** Pick another driver for this vehicle. */
  changeDriver: () => void;
  copy: () => void;
  /** Send this vehicle only to one buyer, or to any of them (0). */
  setDest: (siteId: number) => void;
  /** Buy another vehicle like this one for one buyer, and leave this one as it is. */
  buyFor: (siteId: number) => void;
  setPick: (pick: PickMode) => void;
  sell: () => void;
  service: () => void;
  rename: () => void;
  /** Buy the next class up for this vehicle's building (opens the driver picker). */
  buyNext?: (kind: VehicleKind) => void;
  /** Upgrade the building this vehicle works for. */
  upgradeHome?: () => void;
}

const TILE_H = 46;
const TILE_GAP = 6;
const MAX_TILES = 60;

/** The buyers shown on a card: buyers who want something first, then the rest; pinned always included. */
function shownRuns(runs: TruckRun[], pinned: number): TruckRun[] {
  const wanting = runs.filter((r) => r.goods.length > 0);
  const list = wanting.slice(0, MAX_TILES);
  const pin = runs.find((r) => r.site.id === pinned);
  if (pin && !list.includes(pin)) list[MAX_TILES - 1] = pin;
  return list;
}

/** Height of the route picture: a title row, the tiles (or a note when there are none), and the preference chips. */
export const routeHeight = (n: number): number => 30 + (n === 0 ? 44 : Math.min(n, MAX_TILES) * (TILE_H + TILE_GAP) - TILE_GAP) + (n > 1 ? 36 : 0) + 12;

export const vehicleCardHeight = 300;

export function vehicleCard(im: Im, world: World, v: Vehicle, name: string, homeLevel: number, x: number, y: number, w: number, info: CardInfo, act: CardActions): void {
  const vd = VEHICLE_DEFS[v.kind];
  const color = MODE_COLOR[vd.mode] ?? COLORS.accent;
  const h = vehicleCardHeight;
  panel(im, x, y, w, h, info.status.color);
  const px = x + 14;
  const iw = w - 28;
  const id = `vc${v.id}`;

  // The badge, the name, and the class under it.
  im.rect(3, px, y + 12, 52, 52, 0x0b1117, 1, 8, color, 1);
  vehicleIcon(im, vd.mode, px + 26, y + 38, color);
  im.text(`${id}n`, name, px + 64, y + 12, { size: 16, bold: true, layer: 4 });
  im.text(`${id}c`, vd.label.toUpperCase(), px + 64, y + 34, { size: 10, bold: true, color, layer: 4 });
  im.text(`${id}s`, info.status.text, px + 64, y + 50, { size: 11, color: info.status.color, wrap: iw - 64, layer: 4 });

  // Stats: load and speed with the next class beside them, and the driver's rank.
  const peers = (Object.keys(VEHICLE_DEFS) as VehicleKind[]).filter((k) => VEHICLE_DEFS[k].mode === vd.mode).sort((a, b) => VEHICLE_DEFS[a].cost - VEHICLE_DEFS[b].cost);
  const maxCap = Math.max(...peers.map((k) => VEHICLE_DEFS[k].capacity));
  const perMin = (ticks: number): number => 600 / ticks;
  const maxSpeed = Math.max(...peers.map((k) => perMin(VEHICLE_DEFS[k].ticksPerTile * 0.84)));
  const next = vd.next ? VEHICLE_DEFS[vd.next] : null;
  const sy = y + 78;
  const colW = (iw - 24) / 3;
  const statCol = (i: number, label: string, value: string, ratio: number, plus: string): void => {
    const cx = px + i * (colW + 12);
    im.text(`${id}sl${i}`, label, cx, sy, { size: 9, bold: true, color: COLORS.muted, layer: 4 });
    im.text(`${id}sv${i}`, value, cx, sy + 11, { size: 14, bold: true, layer: 4 });
    if (plus) im.text(`${id}sp${i}`, plus, cx + colW, sy + 14, { size: 11, bold: true, color: COLORS.good, align: 'right', layer: 4 });
    im.rect(4, cx, sy + 32, colW, 5, 0x0a0f14, 1, 1);
    im.rect(4, cx, sy + 32, colW * Math.min(1, ratio), 5, color, 1, 1);
  };
  statCol(0, 'LOAD', `${vd.capacity} t`, vd.capacity / maxCap, next ? `+${next.capacity - vd.capacity}` : '');
  const speed = perMin(vehicleTicks(v));
  statCol(1, 'SPEED', `${Math.round(speed)} tiles/min`, speed / maxSpeed, next && perMin(next.ticksPerTile) - perMin(vd.ticksPerTile) >= 0.5 ? `+${Math.round(perMin(next.ticksPerTile) - perMin(vd.ticksPerTile))}` : '');
  // The driver: rank, five pips, and the trips to the next rank.
  const lv = driverLevel(v);
  const trips = v.trips ?? 0;
  const dx = px + 2 * (colW + 12);
  const who = info.driver.toUpperCase();
  im.text(`${id}dl`, who, dx, sy, { size: fitSize(who, colW, 9, 7), bold: true, color: COLORS.muted, layer: 4 });
  im.text(`${id}dv`, DRIVER_RANKS[lv - 1], dx, sy + 11, { size: 14, bold: true, color: COLORS.accent, layer: 4 });
  for (let i = 0; i < 5; i++) im.rect(4, dx + colW - 5 * 13 + i * 13, sy + 15, 10, 10, i < lv ? COLORS.accent : 0x0a0f14, 1, 1, i < lv ? COLORS.accent : COLORS.line, 1);
  const lo = DRIVER_TRIPS[lv - 1];
  const hi = DRIVER_TRIPS[lv];
  im.rect(4, dx, sy + 32, colW, 5, 0x0a0f14, 1, 1);
  im.rect(4, dx, sy + 32, colW * (hi === undefined ? 1 : (trips - lo) / (hi - lo)), 5, COLORS.accent, 1, 1);
  im.text(`${id}dt`, hi === undefined ? `${trips} trips · top rank` : `${trips} / ${hi} trips`, dx, sy + 41, { size: 9, color: COLORS.muted, layer: 4 });

  // Condition: how worn it is, and the service that puts it right.
  const cy = y + 134;
  const cond = info.condition;
  const tint = cond > 0.6 ? COLORS.good : cond > 0.3 ? COLORS.warn : COLORS.bad;
  im.text(`${id}ol`, `CONDITION  ${Math.round(cond * 100)}%`, px, cy + 3, { size: 9, bold: true, color: tint, layer: 4 });
  const barX = px + 100;
  const svcW = 112;
  const barW = Math.max(40, iw - 100 - svcW - 10);
  im.rect(4, barX, cy + 5, barW, 6, 0x0a0f14, 1, 1);
  im.rect(4, barX, cy + 5, barW * Math.min(1, Math.max(0, cond)), 6, cond > 1 ? COLORS.accent : tint, 1, 1);
  button(im, `${id}v`, info.serviceCost > 0 ? `SERVICE  $${fmt(info.serviceCost)}` : 'NO SERVICE NEEDED', px + iw - svcW, cy - 2, svcW, 20, info.serviceOk, act.service, 'quiet');

  // The class ladder: where this vehicle is, and what the next step needs.
  const ly = y + 160;
  const n = peers.length;
  const gap = 6;
  const cw = (iw - gap * (n - 1)) / n;
  const at = peers.indexOf(v.kind);
  peers.forEach((k, i) => {
    const d = VEHICLE_DEFS[k];
    const cx = px + i * (cw + gap);
    const cur = i === at;
    const passed = i < at;
    const need = passed || cur ? '' : d.tier > world.tier ? `Tier ${d.tier}` : homeLevel < d.needLevel ? `Yard level ${d.needLevel}` : 'Ready';
    const lit = cur ? color : passed ? 0x1f3a31 : 0x0e141a;
    im.rect(4, cx, ly, cw, 34, lit, 1, 8, cur ? color : i === at + 1 ? COLORS.accent : COLORS.line, 1);
    const ink = cur ? 0x10161c : passed ? COLORS.good : i === at + 1 ? COLORS.text : COLORS.muted;
    const label = d.label.toUpperCase();
    im.text(`${id}lc${i}`, label, cx + cw / 2, ly + 5, { size: fitSize(label, cw - 8, 10, 7), bold: true, color: ink, align: 'center', layer: 5 });
    im.text(`${id}lr${i}`, cur ? 'THIS ONE' : passed ? 'done' : need, cx + cw / 2, ly + 20, { size: 9, bold: cur, color: cur ? 0x10161c : need === 'Ready' ? COLORS.good : COLORS.warn, align: 'center', layer: 5 });
  });

  // The buttons: the driver is the big one. A bigger vehicle is bought new, and the driver moved over to it.
  const by = y + 206;
  const gapB = 8;
  const upW = (iw - gapB * 2) * 0.52;
  const smW = (iw - gapB * 2 - upW) / 2;
  button(im, `${id}u`, v.driverId === 0 ? 'ASSIGN A DRIVER' : 'CHANGE DRIVER', px, by, upW, 38, true, act.changeDriver, v.driverId === 0 ? 'main' : 'quiet', true);
  button(im, `${id}k`, `COPY  $${fmt(info.copyCost)}`, px + upW + gapB, by, smW, 38, info.copyOk, act.copy, 'quiet');
  button(im, `${id}m`, 'RENAME DRIVER', px + upW + smW + gapB * 2, by, smW, 38, true, act.rename, 'quiet', true);
  button(im, `${id}x`, `SELL ${info.unit.toUpperCase()}  +$${fmt(sellVehicleValue(v))}`, px, y + 252, iw, 38, true, act.sell, 'danger');
}

/**
 * The route picture: the building the vehicle loads at on the left, and each buyer it could run to as a tile on the right, joined
 * by lines. Click a buyer to send the vehicle only there; click it again, or "Any buyer", to let it choose. With no buyer pinned
 * every tile is lit and a row of chips sets how it chooses.
 */
export function routePicture(im: Im, world: World, v: Vehicle, id: string, x: number, y: number, w: number, info: CardInfo, act: CardActions): void {
  const home = siteById(world, v.homeId);
  const all = runsOf(world, v);
  const runs = shownRuns(all, v.destId);
  const pinned = all.find((r) => r.site.id === v.destId);
  // A vehicle just bought has no orders: nothing is lit until the player picks a buyer, or any buyer.
  const held = !!v.awaitOrders;
  im.line(3, x, y + 2, x + w, y + 2, COLORS.line, 1);
  im.text(`${id}rh`, 'DELIVERS TO', x, y + 12, { size: 10, bold: true, color: COLORS.muted, layer: 4 });
  const mode = PICK_LABEL[info.pick ?? 'any'].toUpperCase();
  im.text(`${id}rs`, held ? 'NO ORDERS YET  ·  PICK A BUYER BELOW' : pinned ? `ONLY TO ${pinned.site.name.toUpperCase()}` : all.length > 0 ? `ANY BUYER  ·  ${mode}` : '', x + 92, y + 12, { size: 10, bold: true, color: held ? COLORS.warn : pinned ? COLORS.accent : COLORS.muted, layer: 4 });
  const anyW = 112;
  if (all.length > 0) button(im, `${id}ra`, pinned || held ? 'ANY BUYER' : 'ANY BUYER  (ON)', x + w - anyW, y + 7, anyW, 20, !!pinned || held, () => act.setDest(0), 'quiet');
  else im.text(`${id}rn`, 'No buyer is joined to this building yet', x + w - 6, y + 12, { size: 10, color: COLORS.warn, align: 'right', layer: 4 });
  const top = y + 34;
  const fw = Math.max(96, Math.min(132, w * 0.3));
  const tx = x + fw + 34;
  const tw = w - fw - 34;
  const bodyH = runs.length === 0 ? 44 : runs.length * (TILE_H + TILE_GAP) - TILE_GAP;
  // The building the goods leave from.
  const hc = home ? SITE_DEFS[home.kind].color : COLORS.muted;
  const fh = Math.min(bodyH, 64);
  const fy = top + (bodyH - fh) / 2;
  im.rect(3, x, fy, fw, fh, 0x0e151c, 1, 8, hc, 1);
  im.rect(3, x + 1, fy + 8, 2, Math.max(0, fh - 16), hc, 1, 1);
  im.text(`${id}f1`, 'LOADS AT', x + 12, fy + 6, { size: 9, bold: true, color: COLORS.muted, layer: 4 });
  const hn = home?.name ?? 'Home';
  im.text(`${id}f2`, hn, x + 12, fy + 19, { size: fitSize(hn, fw - 20, 12, 8), bold: true, layer: 4 });
  if (fh >= 58) im.text(`${id}f3`, home ? SITE_DEFS[home.kind].label : '', x + 12, fy + 37, { size: 9, color: COLORS.muted, layer: 4 });
  const fx = x + fw;
  const fcy = fy + fh / 2;
  runs.forEach((r, i) => {
    const ty = top + i * (TILE_H + TILE_GAP);
    const pin = pinned?.site.id === r.site.id;
    const on = !held && (!pinned || pin);
    const col = SITE_DEFS[r.site.kind].color;
    const live = r.goods.length > 0;
    // The line from the loading building to this buyer, with an arrow head.
    const lc = !on ? COLORS.line : live ? COLORS.good : COLORS.warn;
    const lw = on ? 2 : 1;
    const midx = fx + 14;
    const my = ty + TILE_H / 2;
    im.line(3, fx, fcy, midx, fcy, lc, 1, lw);
    im.line(3, midx, fcy, midx, my, lc, 1, lw);
    im.line(3, midx, my, tx - 2, my, lc, 1, lw);
    im.line(3, tx - 8, my - 4, tx - 2, my, lc, 1, lw);
    im.line(3, tx - 8, my + 4, tx - 2, my, lc, 1, lw);
    const hov = im.hit(`${id}b${r.site.id}`, tx, ty, tw, TILE_H, () => act.setDest(pin ? 0 : r.site.id), 3);
    im.rect(3, tx, ty, tw, TILE_H, pin ? 0x2a2411 : hov ? 0x1c2836 : on ? 0x111a23 : 0x0b1015, 1, 8, pin || hov ? COLORS.accent : COLORS.line, 1);
    im.rect(3, tx + 1, ty + 8, 2, TILE_H - 16, on ? col : COLORS.line, 1, 1);
    const ink = on ? COLORS.text : COLORS.muted;
    im.text(`${id}bn${r.site.id}`, r.site.name, tx + 12, ty + 6, { size: fitSize(r.site.name, tw - 100, 12, 8), bold: true, color: ink, layer: 4 });
    im.text(`${id}bk${r.site.id}`, `${SITE_DEFS[r.site.kind].label}  ·  ${r.tiles} tiles`, tx + 12, ty + 23, { size: 9, color: COLORS.muted, layer: 4 });
    const what = live ? r.goods.map((g) => GOODS[g].label).join(' + ') : 'wants nothing of ours yet';
    im.text(`${id}bg${r.site.id}`, what, tx + 12, ty + 34, { size: 9, color: live ? (on ? COLORS.good : COLORS.muted) : COLORS.warn, layer: 4 });
    // Right side: what it pays, and how much room it has.
    const rx = tx + tw - 12;
    // Instead of turning this truck round, buy a second one for this buyer: both keep running.
    if (tw >= 300 && live) {
      const bw2 = 78;
      const bx = rx - 70 - 14 - bw2;
      button(im, `${id}bt${r.site.id}`, `+ TRUCK $${fmt(info.copyCost)}`, bx, ty + 22, bw2, 20, info.copyOk, () => act.buyFor(r.site.id), 'quiet');
    }
    if (live) {
      im.text(`${id}bp${r.site.id}`, r.price > 0 ? `$${r.price.toFixed(1)}/t` : 'passes on', rx, ty + 6, { size: 11, bold: true, color: on ? COLORS.accent : COLORS.muted, align: 'right', layer: 4 });
      const bw = 70;
      im.rect(4, rx - bw, ty + 24, bw, 5, 0x0a0f14, 1, 1);
      im.rect(4, rx - bw, ty + 24, bw * (1 - r.fill), 5, r.fill > 0.8 ? COLORS.warn : COLORS.good, 1, 1);
      im.text(`${id}bf${r.site.id}`, r.fill > 0.8 ? 'nearly full' : 'wants more', rx, ty + 32, { size: 8, color: COLORS.muted, align: 'right', layer: 4 });
    }
  });
  if (runs.length === 0) {
    im.text(`${id}rz`, 'Lay a road, track or lane to a buyer and it shows up here.', tx, top + 14, { size: 11, color: COLORS.muted, wrap: tw, layer: 4 });
  }
  if (all.length > 0) {
    // How it chooses while no buyer is pinned: shown even with one buyer, so the strategy is already set once more join.
    const cy = top + bodyH + 8;
    const n = PICK_MODES.length;
    const gap = 4;
    const cw = (w - gap * (n - 1)) / n;
    PICK_MODES.forEach((m, i) => {
      const on = !held && !pinned && info.pick === m;
      const label = PICK_LABEL[m].toUpperCase();
      const cx = x + i * (cw + gap);
      // Clicking a chip while a buyer is pinned lets the truck choose again, by that rule.
      const hov = im.hit(`${id}pk${m}`, cx, cy, cw, 24, () => act.setPick(m), 3);
      im.rect(3, cx, cy, cw, 24, on ? COLORS.accent : hov ? 0x26364a : 0x121920, 1, 12, on ? COLORS.accent : COLORS.line, 1);
      im.text(`${id}pt${m}`, label, cx + cw / 2, cy + 7, { size: fitSize(label, cw - 8, 9, 6), bold: true, color: on ? 0x1b1204 : COLORS.text, align: 'center', layer: 4 });
    });
  }
}

export const TRUCK_TILE_H = 92;

/** One vehicle as a compact tile on the building's Trucks page: its picture, name, class and what it is doing. Click to open it. */
export function vehicleTile(im: Im, v: Vehicle, name: string, x: number, y: number, w: number, info: { status: { text: string; color: number }; driver: string; condition: number }, open: () => void): void {
  const vd = VEHICLE_DEFS[v.kind];
  const color = MODE_COLOR[vd.mode] ?? COLORS.accent;
  const id = `vt${v.id}`;
  const hov = im.hit(id, x, y, w, TRUCK_TILE_H, open, 3);
  panel(im, x, y, w, TRUCK_TILE_H, info.status.color, hov);
  if (hov) im.rect(3, x, y, w, TRUCK_TILE_H, COLORS.accent, 0, 8, COLORS.accent, 1);
  const px = x + 16;
  im.rect(3, px, y + 12, 48, 48, 0x0b1117, 1, 8, color, 1);
  vehicleIcon(im, vd.mode, px + 24, y + 36, color);
  const textW = w - 16 - 64 - 34;
  im.text(`${id}n`, name, px + 60, y + 10, { size: 15, bold: true, layer: 4 });
  im.text(`${id}c`, vd.label.toUpperCase(), px + 60, y + 30, { size: 10, bold: true, color, layer: 4 });
  im.text(`${id}s`, info.status.text, px + 60, y + 45, { size: fitSize(info.status.text, textW, 11, 8), color: info.status.color, layer: 4 });
  // Bottom row: the load it carries, who drives it, and how worn it is.
  const lv = driverLevel(v);
  im.text(`${id}d`, `${vd.capacity} t  ·  ${info.driver}  ·  ${DRIVER_RANKS[lv - 1]}`, px, y + 71, { size: 10, color: COLORS.muted, layer: 4 });
  const cond = info.condition;
  const tint = cond > 0.6 ? COLORS.good : cond > 0.3 ? COLORS.warn : COLORS.bad;
  const bw = 54;
  im.rect(4, x + w - 16 - bw, y + 75, bw, 5, 0x0a0f14, 1, 1);
  im.rect(4, x + w - 16 - bw, y + 75, bw * cond, 5, tint, 1, 1);
  im.text(`${id}o`, `${Math.round(cond * 100)}%`, x + w - 16 - bw - 6, y + 71, { size: 9, bold: true, color: tint, align: 'right', layer: 4 });
  im.text(`${id}k`, '›', x + w - 18, y + 28, { size: 26, bold: true, color: hov ? COLORS.accent : COLORS.muted, align: 'right', layer: 4 });
}

/**
 * The circuit a vehicle drives, drawn as the real road: the route's own tiles scaled into the box, the loading building at one
 * end and the buyer at the other, and the vehicle where it is now, with the way it is heading.
 */
export function circuitMap(im: Im, world: World, v: Vehicle, x: number, y: number, w: number, h: number): void {
  const id = `cm${v.id}`;
  const vd = VEHICLE_DEFS[v.kind];
  const color = MODE_COLOR[vd.mode] ?? COLORS.accent;
  im.rect(3, x, y, w, h, 0x0a1016, 1, 8, COLORS.line, 1);
  const route = vehicleRoute(world, v);
  if (!route || route.path.length < 2) {
    im.text(`${id}n`, 'No circuit yet: join this building to a buyer and the truck will start running it.', x + w / 2, y + h / 2 - 8, { size: 12, color: COLORS.muted, align: 'center', wrap: w - 60, layer: 4 });
    return;
  }
  // Unwrap the path across the seam of the map, then fit it into the box.
  const pts: { x: number; y: number }[] = [];
  route.path.forEach((t, i) => pts.push(i === 0 ? { x: t.x, y: t.y } : { x: pts[i - 1].x + wrapDx(world, route.path[i - 1].x, t.x), y: t.y }));
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const pad = 44;
  const scale = Math.min(56, (w - pad * 2) / Math.max(1, maxX - minX), (h - pad * 2) / Math.max(1, maxY - minY));
  const ox = x + w / 2 - ((minX + maxX) / 2) * scale;
  const oy = y + h / 2 - ((minY + maxY) / 2) * scale;
  const at = (i: number): { x: number; y: number } => ({ x: ox + pts[i].x * scale, y: oy + pts[i].y * scale });
  for (let i = 0; i < pts.length - 1; i++) {
    const a = at(i);
    const b = at(i + 1);
    im.line(3, a.x, a.y, b.x, b.y, 0x222c38, 1, 9);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = at(i);
    const b = at(i + 1);
    im.line(3, a.x, a.y, b.x, b.y, color, 0.85, 3);
  }
  const homeFirst = route.fromSiteId === v.homeId;
  const hi = homeFirst ? 0 : pts.length - 1;
  const bi = homeFirst ? pts.length - 1 : 0;
  const home = siteById(world, v.homeId);
  const buyer = siteById(world, homeFirst ? route.toSiteId : route.fromSiteId);
  const node = (i: number, label: string, tint: number, tag: string): void => {
    const p = at(i);
    im.circle(4, p.x, p.y, 11, 0x0a1016, 1);
    im.circle(4, p.x, p.y, 8, tint, 1);
    // The name goes to the side of the building that faces away from the middle of the box, clear of the road.
    const right = p.x >= x + w / 2;
    const tx = right ? p.x + 18 : p.x - 18;
    const al = right ? 'left' : 'right';
    im.text(`${id}${tag}t`, tag === 'h' ? 'LOADS' : 'DELIVERS', tx, p.y - 15, { size: 8, bold: true, color: COLORS.muted, align: al, layer: 4 });
    im.text(`${id}${tag}n`, label, tx, p.y - 4, { size: 12, bold: true, align: al, layer: 4 });
  };
  node(hi, home?.name ?? 'Home', COLORS.good, 'h');
  node(bi, buyer?.name ?? 'Buyer', COLORS.accent, 'b');
  // The vehicle itself.
  const vi = Math.max(0, Math.min(pts.length - 1, v.idx));
  const vp = at(vi);
  im.circle(4, vp.x, vp.y, 11, 0xffffff, 0.2);
  im.circle(4, vp.x, vp.y, 7, 0xffffff, 1);
  im.circle(4, vp.x, vp.y, 4, color, 1);
  const ni = Math.max(0, Math.min(pts.length - 1, vi + v.dir * 2));
  if (ni !== vi) {
    const np = at(ni);
    im.line(4, vp.x, vp.y, np.x, np.y, 0xffffff, 1, 2);
  }
  im.text(`${id}l`, `${pts.length - 1} tiles each way`, x + 12, y + h - 22, { size: 10, color: COLORS.muted, layer: 4 });
}

export const upgradePanelHeight = 262;

/**
 * Exactly what has to happen to level up: the driver's next rank (trips still to run, and what the rank gives), and the next
 * truck class (what is met and what is missing, with a button to fix it or to buy it). Nothing is a guess.
 */
export function upgradePanel(im: Im, world: World, v: Vehicle, x: number, y: number, w: number, act: CardActions): void {
  const id = `up${v.id}`;
  const h = upgradePanelHeight;
  const vd = VEHICLE_DEFS[v.kind];
  const home = siteById(world, v.homeId);
  panel(im, x, y, w, h, COLORS.accent);
  const px = x + 14;
  const iw = w - 28;
  im.text(`${id}h`, 'HOW TO LEVEL UP', px, y + 10, { size: 11, bold: true, color: COLORS.muted, layer: 4 });

  // The driver.
  const lv = driverLevel(v);
  const trips = v.trips ?? 0;
  const hi = DRIVER_TRIPS[lv];
  im.text(`${id}d`, hi === undefined ? `DRIVER: ${DRIVER_RANKS[lv - 1]} (top rank)` : `DRIVER: ${DRIVER_RANKS[lv - 1]}  to  ${DRIVER_RANKS[lv]}`, px, y + 30, { size: 13, bold: true, layer: 4 });
  if (hi !== undefined) {
    const lo = DRIVER_TRIPS[lv - 1];
    im.rect(4, px, y + 52, iw, 6, 0x0a0f14, 1, 1);
    im.rect(4, px, y + 52, iw * Math.max(0, Math.min(1, (trips - lo) / (hi - lo))), 6, COLORS.accent, 1, 1);
    const left = Math.max(0, hi - trips);
    const reachNow = Math.round((DRIVER_REACH[lv] / DRIVER_REACH[lv - 1] - 1) * 100);
    im.text(`${id}dt`, `${left} more deliveries (${trips} of ${hi}). ${DRIVER_RANKS[lv]} drives ${Math.round(DRIVER_SPEED * 100)}% faster and reaches ${reachNow}% farther.`, px, y + 64, { size: 11, color: COLORS.muted, wrap: iw, layer: 4 });
  } else {
    im.text(`${id}dt`, 'This driver cannot get better. Keep them on this truck: a new vehicle class drops a driver one rank.', px, y + 52, { size: 11, color: COLORS.muted, wrap: iw, layer: 4 });
  }

  // The next truck.
  const next = vd.next ? VEHICLE_DEFS[vd.next] : null;
  const ty = y + 100;
  im.line(3, px, ty - 6, px + iw, ty - 6, COLORS.line, 1);
  if (!next || !vd.next || !home) {
    im.text(`${id}t`, 'TRUCK: this is the top class', px, ty, { size: 13, bold: true, layer: 4 });
    return;
  }
  const kind: VehicleKind = vd.next;
  im.text(`${id}t`, `NEXT TRUCK: ${next.label}`, px, ty, { size: 13, bold: true, layer: 4 });
  const gain = `Carries ${next.capacity} t instead of ${vd.capacity}` + (VEHICLE_REACH[kind] && VEHICLE_REACH[v.kind] ? `, reaches ${VEHICLE_REACH[kind]} tiles instead of ${VEHICLE_REACH[v.kind]}.` : '.');
  im.text(`${id}g`, gain, px, ty + 18, { size: 11, color: COLORS.muted, wrap: iw, layer: 4 });
  const tierOk = next.tier <= world.tier;
  const levelOk = home.level >= next.needLevel;
  const moneyOk = world.money >= next.cost;
  const rows: [boolean, string][] = [
    [tierOk, tierOk ? `Tier ${next.tier} is unlocked` : `Reach Tier ${next.tier}: finish the quests of Tier ${world.tier}`],
    [levelOk, levelOk ? `This building is level ${home.level}` : `This building must be level ${next.needLevel} (it is level ${home.level})`],
    [moneyOk, moneyOk ? `You have $${fmt(next.cost)}` : `Needs $${fmt(next.cost)}: you have $${fmt(world.money)}`],
  ];
  rows.forEach(([ok, text], i) => {
    const ry = ty + 40 + i * 20;
    im.circle(4, px + 6, ry + 7, 6, ok ? COLORS.good : COLORS.bad);
    im.text(`${id}r${i}`, ok ? 'ok' : 'x', px + 6, ry + 1, { size: 9, bold: true, color: 0x0b1117, align: 'center', layer: 5 });
    im.text(`${id}rt${i}`, text, px + 20, ry, { size: 12, color: ok ? COLORS.text : COLORS.warn, wrap: iw - 24, layer: 4 });
  });
  if (!levelOk && act.upgradeHome) button(im, `${id}uh`, 'UPGRADE BUILDING', px + iw - 140, ty - 5, 140, 24, true, act.upgradeHome, 'quiet');
  const ready = tierOk && levelOk && moneyOk;
  button(im, `${id}b`, `BUY ${next.label.toUpperCase()}  $${fmt(next.cost)}`, px, y + h - 46, iw, 36, ready && !!act.buyNext, () => act.buyNext?.(kind), ready ? 'main' : 'quiet');
}
