// Venues inside a district. A town decides which venues stand in its Restaurant Row or Hardware Store; the player only supplies them.
// Each venue has its own menu, so a district asks for what its venues sell and no more. A venue nobody supplies earns nothing and costs nothing.
import { DISTRICTS, type DistrictId, type Good, type TownStyle } from './defs';
import type { Place } from './features';

export interface Venue {
  id: string;
  label: string;
  /** What it buys. */
  goods: Good[];
  /** Town styles that favour it: a town of that style is more likely to have it. */
  styles?: TownStyle[];
}

export const VENUE_POOLS: Partial<Record<DistrictId, Venue[]>> = {
  restaurants: [
    { id: 'italian', label: 'Italian Restaurant', goods: ['pasta', 'pizza', 'cheese', 'wine', 'vegetables'], styles: ['mediterranean'] },
    { id: 'mexican', label: 'Mexican Kitchen', goods: ['grain', 'meat', 'vegetables', 'spices', 'beer'], styles: ['arid', 'tropical'] },
    { id: 'steak', label: 'Steakhouse', goods: ['meat', 'potatoes', 'butter', 'wine', 'salt'], styles: ['temperate'] },
    { id: 'bakery', label: 'Bakery and Cafe', goods: ['bread', 'pastry', 'flour', 'butter', 'milk'], styles: ['nordic', 'temperate'] },
    { id: 'seafood', label: 'Seafood House', goods: ['fish', 'smokedfish', 'salt', 'wine', 'vegetables'], styles: ['nordic', 'mediterranean'] },
    { id: 'diner', label: 'Diner', goods: ['meat', 'bread', 'potatoes', 'cheese', 'soda'], styles: ['temperate'] },
    { id: 'bbq', label: 'Smokehouse BBQ', goods: ['sausage', 'pork', 'potatoes', 'beer', 'spices'], styles: ['arid', 'nordic'] },
    { id: 'dessert', label: 'Dessert Parlour', goods: ['icecream', 'chocolate', 'sugar', 'pastry', 'jam'], styles: ['tropical'] },
  ],
  // Sports grounds: each has its own vendors, so a crowd is fed with different food.
  stadium: [
    { id: 'hotdog', label: 'Hot Dog Stand', goods: ['sausage', 'bread'] },
    { id: 'burger', label: 'Burger Grill', goods: ['meat', 'bread', 'cheese'] },
    { id: 'slice', label: 'Pizza Slice Counter', goods: ['pizza', 'soda'] },
    { id: 'nachos', label: 'Nachos and Snacks', goods: ['crisps', 'cheese', 'soda'] },
    { id: 'beer', label: 'Beer Garden', goods: ['beer', 'crisps'] },
    { id: 'coffee', label: 'Coffee Cart', goods: ['coffee', 'pastry'] },
    { id: 'icecream', label: 'Ice Cream Cart', goods: ['icecream', 'chocolate'] },
    { id: 'shop', label: 'Team Shop', goods: ['clothes', 'paper'] },
  ],
  ballpark: [
    { id: 'hotdog', label: 'Hot Dog Stand', goods: ['sausage', 'bread'] },
    { id: 'peanuts', label: 'Peanuts and Crisps', goods: ['sunflower', 'crisps'] },
    { id: 'lemonade', label: 'Lemonade Stand', goods: ['juice', 'water', 'fruit'] },
    { id: 'beer', label: 'Beer Stand', goods: ['beer', 'crisps'] },
    { id: 'pretzel', label: 'Pretzel and Pastry Cart', goods: ['pastry', 'bread', 'butter'] },
    { id: 'icecream', label: 'Ice Cream Cart', goods: ['icecream', 'milk'] },
    { id: 'score', label: 'Scorecard Kiosk', goods: ['paper', 'candles'] },
    { id: 'shop', label: 'Team Shop', goods: ['clothes', 'pillows'] },
  ],
  soccer: [
    { id: 'pie', label: 'Pie and Pasty Stall', goods: ['pastry', 'meat', 'potatoes'] },
    { id: 'kebab', label: 'Kebab Van', goods: ['meat', 'bread', 'vegetables', 'spices'] },
    { id: 'pizza', label: 'Pizza Van', goods: ['pizza', 'cheese'] },
    { id: 'beer', label: 'Beer Tent', goods: ['beer', 'crisps'] },
    { id: 'coffee', label: 'Coffee Kiosk', goods: ['coffee', 'milk', 'sugar'] },
    { id: 'fruit', label: 'Fruit and Juice Bar', goods: ['fruit', 'juice', 'water'] },
    { id: 'shop', label: 'Supporters Shop', goods: ['clothes', 'candles'] },
  ],
  arena: [
    { id: 'fries', label: 'Fries and Gravy Stand', goods: ['potatoes', 'cheese', 'butter'] },
    { id: 'burger', label: 'Burger Grill', goods: ['meat', 'bread', 'cheese'] },
    { id: 'cocoa', label: 'Hot Chocolate Cart', goods: ['milk', 'chocolate', 'sugar'] },
    { id: 'beer', label: 'Beer Bar', goods: ['beer', 'crisps'] },
    { id: 'pizza', label: 'Pizza Counter', goods: ['pizza', 'soda'] },
    { id: 'coffee', label: 'Coffee Stand', goods: ['coffee', 'pastry'] },
    { id: 'pro', label: 'Pro Shop', goods: ['clothes', 'steel'] },
  ],
  cafe: [
    { id: 'espresso', label: 'Espresso Bar', goods: ['coffee', 'milk', 'sugar'] },
    { id: 'counter', label: 'Bakery Counter', goods: ['bread', 'pastry', 'jam'] },
    { id: 'juice', label: 'Juice Bar', goods: ['juice', 'water', 'fruit'] },
    { id: 'sweets', label: 'Dessert Case', goods: ['pastry', 'chocolate', 'icecream', 'cocoa'] },
  ],
  farmersmarket: [
    { id: 'honey', label: 'Honey Stall', goods: ['honey', 'jam'] },
    { id: 'dairy', label: 'Dairy Stall', goods: ['milk', 'cheese', 'butter', 'eggs'] },
    { id: 'produce', label: 'Produce Stall', goods: ['vegetables', 'potatoes', 'fruit'] },
    { id: 'bake', label: 'Bakery Stall', goods: ['bread', 'flour', 'pastry'] },
    { id: 'pasta', label: 'Pasta Stall', goods: ['pasta', 'flour'] },
    { id: 'juice', label: 'Juice Stall', goods: ['juice', 'water'] },
    { id: 'farm', label: 'Farm Supplies Stall', goods: ['feed', 'mulch', 'firewood'] },
  ],
  fashion: [
    { id: 'tailor', label: 'Tailor', goods: ['cloth', 'yarn'] },
    { id: 'boutique', label: 'Boutique', goods: ['clothes', 'cloth'] },
    { id: 'knit', label: 'Knitwear Shop', goods: ['yarn', 'wool', 'clothes'] },
  ],
  furniture: [
    { id: 'cabinet', label: 'Cabinet Maker', goods: ['furniture', 'lumber'] },
    { id: 'uphol', label: 'Upholsterer', goods: ['cloth', 'furniture'] },
    { id: 'home', label: 'Homeware Shop', goods: ['pillows', 'candles', 'glass'] },
  ],
  builders: [
    { id: 'brick', label: 'Brick and Block Yard', goods: ['bricks', 'blocks'] },
    { id: 'cement', label: 'Cement and Concrete Depot', goods: ['cement', 'concrete'] },
    { id: 'glass', label: 'Glass and Stone Merchant', goods: ['glass', 'stone', 'granite'] },
  ],
  hotels: [
    { id: 'dining', label: 'Hotel Dining Room', goods: ['meat', 'fish', 'wine', 'butter', 'vegetables'] },
    { id: 'breakfast', label: 'Breakfast Room', goods: ['bread', 'eggs', 'jam', 'coffee', 'milk'] },
    { id: 'cocktail', label: 'Cocktail Bar', goods: ['spirits', 'wine', 'juice', 'soda'] },
    { id: 'linen', label: 'Linen Room', goods: ['cloth', 'pillows', 'candles'] },
    { id: 'gift', label: 'Gift Shop', goods: ['chocolate', 'books', 'candles'] },
  ],
  amphitheatre: [
    { id: 'props', label: 'Props Workshop', goods: ['lumber', 'cloth'] },
    { id: 'costume', label: 'Costume Hall', goods: ['clothes', 'cloth'] },
    { id: 'programme', label: 'Programme Stand', goods: ['paper', 'books'] },
    { id: 'interval', label: 'Interval Bar', goods: ['wine', 'juice', 'pastry'] },
  ],
  community: [
    { id: 'library', label: 'Library Corner', goods: ['books', 'paper'] },
    { id: 'craft', label: 'Craft Room', goods: ['furniture', 'yarn', 'wool'] },
    { id: 'kitchen', label: 'Community Kitchen', goods: ['bread', 'milk', 'cheese', 'jam'] },
    { id: 'marketday', label: 'Market Day Hall', goods: ['vegetables', 'eggs', 'potatoes'] },
    { id: 'tea', label: 'Tea Room', goods: ['pastry', 'milk', 'sugar'] },
  ],
  bookshops: [
    { id: 'bookshop', label: 'Bookshop', goods: ['books'] },
    { id: 'stationer', label: 'Stationer', goods: ['paper', 'candles'] },
    { id: 'reading', label: 'Reading Room Cafe', goods: ['books', 'coffee', 'pastry'] },
  ],
  resort: [
    { id: 'poolbar', label: 'Poolside Bar', goods: ['mango', 'juice', 'soda', 'beer'] },
    { id: 'restaurant', label: 'Resort Restaurant', goods: ['fish', 'fruit', 'vegetables', 'wine', 'spices'] },
    { id: 'spa', label: 'Spa', goods: ['candles', 'pillows', 'cloth'] },
    { id: 'terrace', label: 'Coffee Terrace', goods: ['coffee', 'pastry', 'mango'] },
    { id: 'beachshop', label: 'Beach Shop', goods: ['clothes', 'furniture'] },
  ],
  university: [
    { id: 'library', label: 'University Library', goods: ['books', 'paper'] },
    { id: 'lab', label: 'Engineering Lab', goods: ['machinery', 'steel', 'tools'] },
    { id: 'cafe', label: 'Campus Cafe', goods: ['coffee', 'bread', 'pizza', 'soda'] },
    { id: 'print', label: 'Print Shop', goods: ['paper', 'books'] },
  ],
  heating: [
    { id: 'pellets', label: 'Pellet Depot', goods: ['pellets'] },
    { id: 'coal', label: 'Coal Merchant', goods: ['coal'] },
    { id: 'fuel', label: 'Fuel Yard', goods: ['oil', 'fuel'] },
    { id: 'firewood', label: 'Firewood Yard', goods: ['firewood'] },
  ],
  foodhall: [
    { id: 'bakery', label: 'Bakery Hall', goods: ['bread', 'flour', 'pastry'] },
    { id: 'dairy', label: 'Dairy Hall', goods: ['cheese', 'milk', 'butter'] },
    { id: 'preserves', label: 'Fruit and Preserves Hall', goods: ['fruit', 'jam', 'juice'] },
    { id: 'butcher', label: 'Butcher Hall', goods: ['meat', 'sausage', 'pork'] },
  ],
  grandplaza: [
    { id: 'gallery', label: 'Gallery Shop', goods: ['books', 'paper'] },
    { id: 'fashionhall', label: 'Fashion Hall', goods: ['clothes', 'cloth'] },
    { id: 'showroom', label: 'Showroom', goods: ['furniture', 'glass'] },
    { id: 'theatrebar', label: 'Theatre Bar', goods: ['wine', 'spirits', 'chocolate'] },
  ],
  hardware: [
    { id: 'timber', label: 'Timber Yard', goods: ['lumber', 'firewood'], styles: ['nordic', 'temperate'] },
    { id: 'merchant', label: "Builders' Merchant", goods: ['bricks', 'blocks', 'cement', 'concrete'] },
    { id: 'tools', label: 'Tool Shop', goods: ['tools', 'ingots'] },
    { id: 'glazier', label: 'Glazier', goods: ['glass', 'lumber'], styles: ['mediterranean'] },
    { id: 'stone', label: 'Stone and Landscaping', goods: ['stone', 'gravel', 'sand', 'mulch'], styles: ['arid', 'mediterranean'] },
    { id: 'garden', label: 'Garden Centre', goods: ['mulch', 'feed', 'pellets', 'firewood'], styles: ['temperate', 'tropical'] },
    { id: 'iron', label: 'Ironmonger', goods: ['steel', 'ingots', 'tools'] },
  ],
};

/** A steady score from 0 to 1 for a town and a venue, so a town always picks the same ones. */
function scoreOf(place: Place, venue: Venue): number {
  let h = 2166136261 ^ place.id;
  for (const c of venue.id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** The venues a town has in a district at a district level: its favourites first, one more with each level. */
export function venuesOf(place: Place, id: DistrictId, level: number): Venue[] {
  const pool = VENUE_POOLS[id];
  if (!pool) return [];
  const ranked = pool
    .map((v) => ({ v, s: scoreOf(place, v) + (v.styles?.includes(place.style) ? 0.6 : 0) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.v);
  // A capstone is one big hall: all its venues stand from the start.
  return DISTRICTS[id].capstone ? ranked : ranked.slice(0, Math.min(pool.length, level + 1));
}

/** Everything the venues of a district sell to: the goods its dock asks for. */
export function venueMenu(place: Place, id: DistrictId, level: number): Good[] {
  return Array.from(new Set(venuesOf(place, id, level).flatMap((v) => v.goods)));
}

/** The goods a built district lives on: its venues' menus where it has venues, otherwise its own list. */
export function districtGoods(place: Place, id: DistrictId): Good[] {
  if (!VENUE_POOLS[id]) return DISTRICTS[id].goods;
  return venueMenu(place, id, Math.max(1, place.districts?.[id] ?? 0));
}
