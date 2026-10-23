// Drivers and upkeep: every vehicle has a named driver, and wears as it covers ground until it is serviced. The names and the
// wear are the groundwork for a fuller crew and maintenance system; for now a worn vehicle is a little slower and a service
// puts it right.
import { APPLICANT_TICKS, DRIVER_HIRE, DRIVER_TRIPS, DRIVER_WAGE, MECHANIC_BUFF, MECHANIC_COST, MECHANIC_MAX, SHOP_WAIT, SITE_DEFS, VEHICLE_DEFS, type VehicleKind } from './defs';
import type { Site, Vehicle, World } from './world';

const FIRST = [
  'Marta', 'Dale', 'Priya', 'Tomas', 'Ines', 'Walt', 'Noor', 'Gus', 'Yara', 'Hank', 'Lena', 'Omar', 'Cleo', 'Ray', 'Sana', 'Boris',
  'Mae', 'Felix', 'Tess', 'Ivo', 'Rosa', 'Lars', 'Amara', 'Dev', 'Nell', 'Cyrus', 'Hana', 'Otis', 'Vera', 'Kofi', 'June', 'Pablo',
  'Edda', 'Raj', 'Wren', 'Mateo', 'Ada', 'Sven', 'Luz', 'Moe',
];
const LAST = [
  'Okafor', 'Brandt', 'Nakamura', 'Duval', 'Haddad', 'Kowalski', 'Reyes', 'Lindqvist', 'Mbeki', 'Castellan', 'Pryce', 'Ogunde', 'Varga', 'Moreau',
  'Tanaka', 'Whitlock', 'Soto', 'Bergstrom', 'Adeyemi', 'Fontaine', 'Quill', 'Marsh', 'Iyer', 'Dragan', 'Holloway', 'Nunez', 'Voss', 'Abara',
  'Kessler', 'Ferro', 'Lund', 'Garrity', 'Osei', 'Petrov', 'Calloway', 'Rinaldi', 'Sato', 'Vance', 'Mercer', 'Dube',
];

/** A mix of two numbers into one, so names are scattered but the same every time for the same vehicle. */
function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

/** The driver's name: the one the player gave, or one made from the vehicle's number and the world's seed. */
export function driverName(world: World, v: Pick<Vehicle, 'id' | 'driver'> & { driverId?: number }): string {
  if (v.driverId === 0) return 'No driver';
  const on = driverById(world, v.driverId);
  if (on) return on.name;
  if (v.driver) return v.driver;
  const h = hash(v.id, world.seed);
  return `${FIRST[h % FIRST.length]} ${LAST[Math.floor(h / FIRST.length) % LAST.length]}`;
}

export function renameDriver(world: World, vehicleId: number, name: string): string | null {
  const v = world.vehicles.find((x) => x.id === vehicleId);
  if (!v) return 'No such vehicle';
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 24);
  if (!clean) return 'A driver needs a name';
  v.driver = clean;
  const on = driverById(world, v.driverId);
  if (on) on.name = clean;
  return null;
}

/** Tiles a vehicle drives before it is fully worn. */
export const WEAR_TILES = 4000;
/** A fully worn vehicle takes this much longer for every tile. */
export const WEAR_SLOWDOWN = 0.12;
/** Share of its load a fully worn road vehicle loses (see WEAR_LOAD_LOSS in defs). */
const WEAR_LOAD_LOSS_SHARE = 0.3;
/** What a service costs a fully worn vehicle, as a share of its price. */
export const SERVICE_SHARE = 0.12;

/** How well the vehicle is, 0 to 1. */
export function condition(v: Pick<Vehicle, 'wear'>): number {
  // Past 1 is a repair that took it beyond new, by a good mechanic: it wears off as the vehicle drives.
  return 1 - Math.min(1, Math.max(-0.5, v.wear ?? 0));
}

/** How well a vehicle works at its wear: speed and load together, 0 to 1. A good repair does not make it better than new. */
export function vehicleEfficiency(v: Pick<Vehicle, 'wear'>): number {
  const w = Math.max(0, v.wear ?? 0);
  return (1 - WEAR_LOAD_LOSS_SHARE * w) / (1 + WEAR_SLOWDOWN * w);
}

/** The average efficiency of a building's vehicles, 0 to 1, or null when it has none. */
export function fleetEfficiency(world: World, siteId: number): number | null {
  const fleet = world.vehicles.filter((v) => v.homeId === siteId && VEHICLE_DEFS[v.kind].mode === 'road');
  return fleet.length === 0 ? null : fleet.reduce((n, v) => n + vehicleEfficiency(v), 0) / fleet.length;
}

export function serviceCost(v: Pick<Vehicle, 'kind' | 'wear'>): number {
  const wear = v.wear ?? 0;
  return wear < 0.02 ? 0 : Math.max(10, Math.round((VEHICLE_DEFS[v.kind].cost * SERVICE_SHARE * wear) / 5) * 5);
}

export function serviceError(world: World, vehicleId: number): string | null {
  const v = world.vehicles.find((x) => x.id === vehicleId);
  if (!v) return 'No such vehicle';
  const cost = serviceCost(v);
  if (cost === 0) return 'In good shape: no service needed';
  return world.money < cost ? `Need $${cost.toLocaleString('en-US')} for the service` : null;
}

/** A service puts the vehicle back to new condition for a price that grows with the wear. */
export function serviceVehicle(world: World, vehicleId: number): string | null {
  const err = serviceError(world, vehicleId);
  if (err) return err;
  const v = world.vehicles.find((x) => x.id === vehicleId)!;
  world.money -= serviceCost(v);
  v.wear = 0;
  v.repairAt = undefined;
  return null;
}


// ---- the people who drive ----

/** A driver the company employs. They are paid whether or not they have a vehicle, and their experience goes with them. */
export interface Driver {
  id: number;
  name: string;
  /** Deliveries made: sets their rank. */
  trips: number;
  /** The kind of vehicle they last drove: a different kind is new to them. */
  kind?: VehicleKind;
  /** The vehicle they drive now, or null while they wait for one. */
  vehicleId: number | null;
}

/** An applicant the player can hire. They change every few game minutes. */
export interface Applicant {
  key: number;
  name: string;
  trips: number;
}

export const rankOf = (trips: number): number => DRIVER_TRIPS.filter((n) => trips >= n).length - 1;

export function nameFor(seed: number, a: number, b: number): string {
  const h = hash(a + seed, b);
  return `${FIRST[h % FIRST.length]} ${LAST[Math.floor(h / FIRST.length) % LAST.length]}`;
}

/** What a driver is paid each minute. */
export const wageOf = (d: Pick<Driver, 'trips'>): number => DRIVER_WAGE[rankOf(d.trips)];

export function driverById(world: World, id: number | undefined): Driver | undefined {
  return id === undefined ? undefined : world.drivers?.find((d) => d.id === id);
}

/** A vehicle whose driver was moved to another one has driverId 0: it cannot work until someone is assigned. */
export const hasDriver = (v: Vehicle): boolean => v.driverId !== 0;

/** The driver at the wheel. Older games and quick buys had no driver on file: they are given one, with the vehicle's own name and experience. */
export function driverOf(world: World, v: Vehicle): Driver {
  if (v.driverId === 0) return { id: 0, name: 'No driver', trips: 0, vehicleId: v.id };
  const found = driverById(world, v.driverId);
  if (found) return found;
  const d: Driver = { id: world.nextId++, name: driverName(world, v), trips: v.trips ?? 0, kind: v.kind, vehicleId: v.id };
  (world.drivers ??= []).push(d);
  v.driverId = d.id;
  return d;
}

/** Drivers with no vehicle, waiting for one. */
export const idleDrivers = (world: World): Driver[] => (world.drivers ?? []).filter((d) => d.vehicleId === null);

/** The three people looking for work right now. Fixed for a period, so the player can think it over; the same world shows the same three. */
export function applicants(world: World): Applicant[] {
  const day = Math.floor(world.tick / APPLICANT_TICKS);
  const taken = world.hired && world.hired.day === day ? world.hired.keys : [];
  const top = Math.min(4, 1 + world.tier);
  const out: Applicant[] = [];
  for (let i = 0; i < 3; i++) {
    const key = day * 10 + i;
    if (taken.includes(key)) continue;
    const rank = hash(day * 3 + i, world.seed) % (top + 1);
    out.push({ key, name: nameFor(world.seed, day, i), trips: DRIVER_TRIPS[rank] });
  }
  return out;
}

export function hireFee(a: Pick<Applicant, 'trips'>): number {
  return DRIVER_HIRE[rankOf(a.trips)];
}

/** Hire an applicant: they join the company, waiting for a vehicle. */
export function hireDriver(world: World, key: number): { error: string } | { driver: Driver } {
  const a = applicants(world).find((x) => x.key === key);
  if (!a) return { error: 'That person has found another job' };
  const fee = hireFee(a);
  if (world.money < fee) return { error: `Need $${fee.toLocaleString('en-US')} to hire ${a.name}` };
  world.money -= fee;
  const day = Math.floor(world.tick / APPLICANT_TICKS);
  if (!world.hired || world.hired.day !== day) world.hired = { day, keys: [] };
  world.hired.keys.push(key);
  const d: Driver = { id: world.nextId++, name: a.name, trips: a.trips, vehicleId: null };
  (world.drivers ??= []).push(d);
  return { driver: d };
}

/** Put a waiting driver at the wheel of a vehicle. The one who drove it before waits for another. A kind of vehicle the driver is new to costs them a rank. */
export function assignDriver(world: World, vehicleId: number, driverId: number): string | null {
  const v = world.vehicles.find((x) => x.id === vehicleId);
  const d = driverById(world, driverId);
  if (!v || !d) return 'No such driver or vehicle';
  // A driver moved from another vehicle leaves it without one: it waits for someone new.
  const from = d.vehicleId !== null && d.vehicleId !== v.id ? world.vehicles.find((x) => x.id === d.vehicleId) : undefined;
  if (from) from.driverId = 0;
  const old = driverById(world, v.driverId);
  if (old && old.id !== d.id) old.vehicleId = null;
  if (d.kind !== undefined && d.kind !== v.kind) d.trips = DRIVER_TRIPS[Math.max(0, rankOf(d.trips) - 1)];
  d.kind = v.kind;
  d.vehicleId = v.id;
  v.driverId = d.id;
  v.trips = d.trips;
  return null;
}

/** Let a waiting driver go. */
export function dismissDriver(world: World, driverId: number): string | null {
  const d = driverById(world, driverId);
  if (!d) return 'No such driver';
  if (d.vehicleId !== null) return `${d.name} is driving: give the vehicle another driver first`;
  world.drivers = (world.drivers ?? []).filter((x) => x.id !== driverId);
  return null;
}

/** Once a second: every vehicle has a driver on file, and drivers of sold or removed vehicles wait for another. */
export function tendDrivers(world: World): void {
  for (const v of world.vehicles) if (v.driverId !== 0) driverOf(world, v);
  const live = new Set(world.vehicles.map((v) => v.id));
  for (const d of world.drivers ?? []) if (d.vehicleId !== null && !live.has(d.vehicleId)) d.vehicleId = null;
}

/** Wages for every driver on the books, per minute. */
export const wagesPerMinute = (world: World): number => (world.drivers ?? []).reduce((n, d) => n + wageOf(d), 0);

// ---- the mechanic shop ----

/** The shop nearest a vehicle's building, if the company has one. */
export function nearestShop(world: World, v: Vehicle): Site | undefined {
  const home = world.sites.find((x) => x.id === v.homeId);
  if (!home) return undefined;
  let best: Site | undefined;
  let bd = Infinity;
  for (const s of world.sites) {
    if (!SITE_DEFS[s.kind].garage) continue;
    const d = Math.hypot(Math.min(Math.abs(s.x - home.x), world.width - Math.abs(s.x - home.x)), s.y - home.y);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}

/** What the shop charges to repair a worn vehicle: a better shop is a little cheaper. */
export function shopCost(v: Pick<Vehicle, 'kind' | 'wear'>, shop: Site): number {
  const base = serviceCost(v);
  return base === 0 ? 0 : Math.max(10, Math.round((base * (1 - 0.1 * (shop.level - 1))) / 5) * 5);
}

/** Train the shop's mechanic one level: a repair then takes a vehicle further past new. Paid apart from the shop's own upgrades. */
export function trainMechanic(world: World, siteId: number): string | null {
  const s = world.sites.find((x) => x.id === siteId);
  if (!s || !SITE_DEFS[s.kind].garage) return 'Only a Mechanic Shop has a mechanic';
  const lv = s.mech ?? 0;
  if (lv >= MECHANIC_MAX) return 'The mechanic is at the top level';
  const cost = MECHANIC_COST[lv + 1];
  if (world.money < cost) return `Need $${cost.toLocaleString('en-US')} to train the mechanic`;
  world.money -= cost;
  s.mech = lv + 1;
  return null;
}

/**
 * A fully worn vehicle stops and waits for a shop. With a Mechanic Shop it is repaired on its own after a wait that shrinks with
 * the shop's level and grows with the distance, and comes back with the mechanic's buff. With none it stays broken until serviced by hand.
 */
export function stepBreakdown(world: World, v: Vehicle): void {
  const shop = nearestShop(world, v);
  if (!shop) return;
  if (v.repairAt === undefined) {
    const home = world.sites.find((x) => x.id === v.homeId);
    const dist = home ? Math.hypot(shop.x - home.x, shop.y - home.y) : 0;
    v.repairAt = world.tick + Math.max(300, Math.round(SHOP_WAIT + dist * 10 - 150 * (shop.level - 1)));
  }
  if (world.tick < v.repairAt) return;
  const cost = shopCost(v, shop);
  if (world.money < cost) return;
  world.money -= cost;
  v.wear = -MECHANIC_BUFF * (shop.mech ?? 0);
  v.repairAt = undefined;
}
