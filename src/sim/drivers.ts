// Drivers and upkeep: every vehicle has a named driver, and wears as it covers ground until it is serviced. The names and the
// wear are the groundwork for a fuller crew and maintenance system; for now a worn vehicle is a little slower and a service
// puts it right.
import { VEHICLE_DEFS } from './defs';
import type { Vehicle, World } from './world';

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
export function driverName(world: World, v: Pick<Vehicle, 'id' | 'driver'>): string {
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
  return null;
}

/** Tiles a vehicle drives before it is fully worn. */
export const WEAR_TILES = 4000;
/** A fully worn vehicle takes this much longer for every tile. */
export const WEAR_SLOWDOWN = 0.12;
/** What a service costs a fully worn vehicle, as a share of its price. */
export const SERVICE_SHARE = 0.12;

/** How well the vehicle is, 0 to 1. */
export function condition(v: Pick<Vehicle, 'wear'>): number {
  return 1 - Math.min(1, Math.max(0, v.wear ?? 0));
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
  return null;
}
