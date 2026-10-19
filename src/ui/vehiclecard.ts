// The vehicle card: a garage plate for one vehicle, with its class ladder, its stats beside the next class up, and its driver's
// rank. The way a trucking game shows a truck you can level up.
import { DRIVER_RANKS, DRIVER_TRIPS, VEHICLE_DEFS, type VehicleKind } from '../sim/defs';
import { driverLevel, sellVehicleValue, upgradeVehicleCost, upgradeVehicleError, vehicleTicks, type Vehicle, type World } from '../sim/world';
import { button, fitSize, panel } from './company';
import { COLORS, Im } from './imui';

const fmt = (n: number): string => Math.floor(n).toLocaleString('en-US');
const MODE_COLOR: Record<string, number> = { road: 0xdfb66d, rail: 0x8cbace, sea: 0x5fc4c0, air: 0xb59ae0 };

/** A small drawn picture for the kind of vehicle, in the badge. */
function vehicleIcon(im: Im, mode: string, cx: number, cy: number, c: number): void {
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
  destLabel: string;
  destOk: boolean;
  pickLabel: string;
  pickOk: boolean;
  copyOk: boolean;
  copyCost: number;
  unit: string;
}

export interface CardActions {
  upgrade: () => void;
  copy: () => void;
  toggle: () => void;
  cycleDest: () => void;
  cyclePick: () => void;
  sell: () => void;
}

export const vehicleCardHeight = (open: boolean): number => (open ? 354 : 222);

export function vehicleCard(im: Im, world: World, v: Vehicle, name: string, homeLevel: number, x: number, y: number, w: number, open: boolean, info: CardInfo, act: CardActions): void {
  const vd = VEHICLE_DEFS[v.kind];
  const color = MODE_COLOR[vd.mode] ?? COLORS.accent;
  const h = vehicleCardHeight(open);
  panel(im, x, y, w, h, info.status.color);
  const px = x + 14;
  const iw = w - 28;
  const id = `vc${v.id}`;

  // The badge, the name, and the class under it.
  im.rect(3, px, y + 12, 52, 52, 0x0b1117, 1, 3, color, 1);
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
  im.text(`${id}dl`, 'DRIVER', dx, sy, { size: 9, bold: true, color: COLORS.muted, layer: 4 });
  im.text(`${id}dv`, DRIVER_RANKS[lv - 1], dx, sy + 11, { size: 14, bold: true, color: COLORS.accent, layer: 4 });
  for (let i = 0; i < 5; i++) im.rect(4, dx + colW - 5 * 13 + i * 13, sy + 15, 10, 10, i < lv ? COLORS.accent : 0x0a0f14, 1, 1, i < lv ? COLORS.accent : COLORS.line, 1);
  const lo = DRIVER_TRIPS[lv - 1];
  const hi = DRIVER_TRIPS[lv];
  im.rect(4, dx, sy + 32, colW, 5, 0x0a0f14, 1, 1);
  im.rect(4, dx, sy + 32, colW * (hi === undefined ? 1 : (trips - lo) / (hi - lo)), 5, COLORS.accent, 1, 1);
  im.text(`${id}dt`, hi === undefined ? `${trips} trips · top rank` : `${trips} / ${hi} trips`, dx, sy + 41, { size: 9, color: COLORS.muted, layer: 4 });

  // The class ladder: where this vehicle is, and what the next step needs.
  const ly = y + 128;
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
    im.rect(4, cx, ly, cw, 34, lit, 1, 3, cur ? color : i === at + 1 ? COLORS.accent : COLORS.line, 1);
    const ink = cur ? 0x10161c : passed ? COLORS.good : i === at + 1 ? COLORS.text : COLORS.muted;
    const label = d.label.toUpperCase();
    im.text(`${id}lc${i}`, label, cx + cw / 2, ly + 5, { size: fitSize(label, cw - 8, 10, 7), bold: true, color: ink, align: 'center', layer: 5 });
    im.text(`${id}lr${i}`, cur ? 'THIS ONE' : passed ? 'done' : need, cx + cw / 2, ly + 20, { size: 9, bold: cur, color: cur ? 0x10161c : need === 'Ready' ? COLORS.good : COLORS.warn, align: 'center', layer: 5 });
  });

  // The buttons: upgrade is the big one.
  const by = y + 174;
  const upErr = upgradeVehicleError(world, v.id);
  const gapB = 8;
  const upW = (iw - gapB * 2) * 0.52;
  const smW = (iw - gapB * 2 - upW) / 2;
  const upLabel = !next ? 'TOP CLASS' : upErr ? upErr : `UPGRADE TO ${next.label.toUpperCase()}  ·  $${fmt(upgradeVehicleCost(v.kind))}`;
  button(im, `${id}u`, upLabel, px, by, upW, 38, !upErr && !!next, act.upgrade, 'main', true);
  button(im, `${id}k`, `COPY  $${fmt(info.copyCost)}`, px + upW + gapB, by, smW, 38, info.copyOk, act.copy, 'quiet');
  button(im, `${id}m`, open ? 'LESS' : 'SETTINGS', px + upW + smW + gapB * 2, by, smW, 38, true, act.toggle, 'quiet');
  if (open) {
    let sy2 = y + 222;
    button(im, `${id}d`, info.destLabel, px, sy2, iw, 38, info.destOk, act.cycleDest, 'quiet', true);
    sy2 += 44;
    button(im, `${id}p`, info.pickLabel, px, sy2, iw, 38, info.pickOk, act.cyclePick, 'quiet', true);
    sy2 += 44;
    button(im, `${id}x`, `SELL ${info.unit.toUpperCase()}  +$${fmt(sellVehicleValue(v))}`, px, sy2, iw, 38, true, act.sell, 'danger');
  }
}
