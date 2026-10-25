// The wiki's data (written by tools/export-wiki.cjs from the game's own definitions) and small helpers around it.
import data from './data.json';

export interface Site {
  kind: string;
  label: string;
  blurb: string;
  real: string;
  category: string;
  tier: number;
  cost: number;
  cap: number;
  node: string;
  inTown: boolean;
  dock: string;
  produce: { good: string; label: string; also: { good: string; label: string }[] } | null;
  inputs: { good: string; label: string; n: number }[];
  outputs: { good: string; label: string; n: number }[];
  hub: boolean;
  airport: boolean;
  port: boolean;
  maxLevel: number;
}
export interface Vehicle {
  kind: string;
  label: string;
  blurb: string;
  mode: string;
  tier: number;
  cost: number;
  capacity: number;
  needLevel: number;
  next: string;
  reach: number;
}
export interface District {
  id: string;
  label: string;
  blurb: string;
  minLevel: number;
  cost: number;
  revenue: number;
  goods: { good: string; label: string }[];
  effect: string;
}
export interface Good {
  id: string;
  label: string;
  price: number;
  kind: string;
  depth: number;
  forBuilding: boolean;
  marketLevel: number | null;
  madeBy: { site: string; label: string; byProduct: boolean }[];
  usedBy: { site: string; label: string }[];
}

export const SITES = data.sites as Site[];
export const VEHICLES = data.vehicles as Vehicle[];
export const DISTRICTS = data.districts as District[];
export const GOODS = data.goods as Good[];

export const TIER_NAMES = ['Startup', 'Regional Supplier', 'Industrial Group', 'Global Network', 'Legacy'];
export const CATEGORY_NAMES: Record<string, string> = {
  production: 'Production',
  processing: 'Processing',
  manufacturing: 'Manufacturing',
  heavy: 'Heavy industry',
  logistics: 'Logistics',
  town: 'Town',
};
export const KIND_NAMES: Record<string, string> = { raw: 'Raw goods', material: 'Materials', product: 'Products', byproduct: 'By-products' };
export const MODE_NAMES: Record<string, string> = { road: 'Road', rail: 'Rail', sea: 'Sea', air: 'Air' };

export const money = (n: number): string => '$' + n.toLocaleString('en-US');

/** The levels of a building that have a picture. */
export function levelsOf(s: Site): number[] {
  return s.dock || s.kind === 'station' ? [1] : s.port || s.airport ? [1, 2, 3] : [1, 3, 10];
}

export const siteImage = (s: Site, level = 1): string => `/wiki/models/site-${s.kind}-L${level}.png`;
export const vehicleImage = (v: Vehicle): string => `/wiki/models/vehicle-${v.kind}.png`;
export const districtImage = (d: District, level = 3): string => `/wiki/models/district-${d.id}-L${level}.png`;

export const siteByKind = (kind: string): Site | undefined => SITES.find((s) => s.kind === kind);
