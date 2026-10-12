// Placeholder name generator. Seeded, so a given world always gets the same names.

const STEMS = [
  'Ash', 'Bram', 'Cold', 'Dun', 'Elm', 'Fair', 'Glen', 'Hart', 'Iron', 'Kings', 'Lang', 'Mar', 'North', 'Oak',
  'Pine', 'Red', 'Stone', 'Thorn', 'Wick', 'Wolf', 'Briar', 'Copper', 'Dale', 'Ember', 'Fern', 'Gold', 'Heron',
  'Ivy', 'Juniper', 'Kestrel', 'Linden', 'Moss', 'Nettle', 'Otter', 'Pebble', 'Quill', 'Raven', 'Sable', 'Tansy',
  'Umber', 'Violet', 'Willow', 'Yarrow', 'Amber', 'Birch', 'Cedar',
];
const TOWN_ENDS = ['ford', 'ton', 'vale', 'wick', 'haven', 'field', 'bury', 'stead', 'brook', 'ridge', 'hollow', 'cross'];
const WATER_ENDS = ['mere', 'water', 'pool', 'tarn', 'bay', 'sound'];
const FOREST_SUFFIX = ['Woods', 'Forest', 'Weald', 'Holt', 'Thicket'];
const LAND_SUFFIX = ['Plains', 'Reach', 'Downs', 'Heartland', 'Marches', 'Fields'];
const MOUNTAIN_SUFFIX = ['Mountains', 'Range', 'Peaks', 'Heights'];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Namer {
  rand(): number;
  town(): string;
  lake(): string;
  sea(): string;
  ocean(): string;
  forest(): string;
  land(): string;
  mountain(): string;
}

export function makeNamer(seed: number): Namer {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const used = new Set<string>();
  const pick = <T>(list: T[]): T => list[Math.floor(rand() * list.length)];

  /** Keep drawing until the name is unused; fall back to a numeral after many tries. */
  const unique = (make: () => string): string => {
    for (let i = 0; i < 40; i++) {
      const n = make();
      if (!used.has(n)) {
        used.add(n);
        return n;
      }
    }
    const n = `${make()} ${used.size}`;
    used.add(n);
    return n;
  };

  return {
    rand,
    town: () => unique(() => pick(STEMS) + pick(TOWN_ENDS)),
    lake: () => unique(() => `Lake ${pick(STEMS)}${pick(WATER_ENDS)}`),
    sea: () => unique(() => `${pick(STEMS)}${pick(WATER_ENDS)} Sea`),
    ocean: () => unique(() => `${pick(STEMS)}${pick(['', 'ic', 'an'])} Ocean`),
    forest: () => unique(() => `${pick(STEMS)}${pick(['', 'hollow', 'wood', 'shade'])} ${pick(FOREST_SUFFIX)}`),
    land: () => unique(() => `${pick(STEMS)}${pick(['', 'moor', 'land', 'mark'])} ${pick(LAND_SUFFIX)}`),
    mountain: () => unique(() => `${pick(STEMS)}${pick(['', 'crag', 'tor'])} ${pick(MOUNTAIN_SUFFIX)}`),
  };
}
