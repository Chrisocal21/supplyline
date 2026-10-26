# Supplyline: model handoff for ChatGPT

Written 2026-10-26. Read this first, then docs/09-model-and-art-brief.md (the full model list, sizes, naming and triangle budgets) and docs/visual-direction.md (the painterly look). Where this file and 09 disagree, this file is newer.

## What the game is, in three lines

A logistics game on a 3D globe (Three.js, runs in the browser). The player builds producers and factories, lays roads, buys trucks and sells goods to towns. Warm, tidy, painterly, a little toy-like: think Sea of Thieves colour masses, not realism.

## The look (decided, already applied to the ground and scenery)

- Broad colour masses, clear silhouettes, cool shadows, warm highlights. No fine texture, no noise, no baked dirt.
- Done so far, "earth first": ground, mountains (sculpted rock slabs), ocean, trees, bushes, loose rocks and the stone heaps on resource nodes.
- Still to do, and where you come in: buildings, then vehicles. Every building and truck should look like it belongs in the same painted world as the trees and rocks.
- Rules Chris has given and will hold you to:
  - Anything standing on the ground is bedded into it. Nothing floats, and nothing sits in a crater, ring or disc.
  - No clutter: no extra carts, rails, posts, ponds or stacked boxes around a node or building. One clear shape reads better than five small ones.
  - Resource nodes must read from far away. Make them bigger and simpler, not busier.
  - Colours by material: pale stone for quarry, rust for mine, dark grey for coal, terracotta for clay.

## How models are made in the code

Models are built in code, not imported. The helper is Parts in src/r3d/parts.ts: box, cyl, cone, sphere, dome, prism, stone, merged into one geometry with vertex colours. Buildings live in src/r3d/models.ts, industry.ts, specialty.ts, airport.ts, districts.ts; trucks in trucks.ts; trees and bushes in vegetation.ts; stones in stones.ts; node heaps in scenery.ts (HEAPS).

Two ways to hand work back:

1. Preferred: .glb files per docs/09 (Y up, origin at footprint centre on the ground, door faces +Z, named toggle parts such as crop_wheat, anim_blade, at most 3 materials, vertex colours or one small palette). The game can load these later in place of the code models.
2. Or Parts code in the same style as vegetation.ts and stones.ts, which can be dropped straight in.

Tile is 3.3 units wide, a lot pad 3.1. A building on open ground holds 2 x 2 tiles. The game shrinks a model to fit its ground but never squeezes height.

## What to check a model against

- Silhouette first: squint at it from far away. If it is not clear in one colour, redo the shape.
- Same palette family as the trees, rocks and ground (see the PNGs in dist/review: trees-*, nodes-*, heaps-*, mountains-*).
- Triangle budgets are in 09 section 2. Provide a far version of every site and vehicle.

## Selling, so models and goods agree (new today)

The wiki Goods page lists who buys each good on its card ("Sells to: ..."), read from src/sim/buyers.ts:

- Market: finished goods, food, and the bulk raw goods such as clay, sand, stone, grain.
- Distribution Warehouse: holds finished goods and the bulk raws, and passes them on to towns.
- Supply Yard: unchanged. Building materials for a town's growth, plus logs and lumber.
- Districts buy only what suits them. Not every district wants everything: a district is made of named venues, each with its own menu. The town picks its venues (seeded by town id and style, one more per district level) and the player only supplies them with trucks, which drop goods at the district's door. A venue nobody supplies earns nothing and costs nothing.
  - Built so far (src/sim/venues.ts): Restaurant Row (Italian Restaurant, Mexican Kitchen, Steakhouse, Bakery and Cafe, Seafood House, Diner, Smokehouse BBQ, Dessert Parlour) Hardware Store (Timber Yard, Builders' Merchant, Tool Shop, Glazier, Stone and Landscaping, Garden Centre, Ironmonger), the four sports grounds (concession vendors: hot dog stand, burger grill, pizza counter, beer garden, coffee cart, ice cream cart, team shop and more, different for football, baseball, soccer and hockey), Coffee House, Farmers Market stalls, Fashion Quarter, Furniture Gallery, Builders' Yard, Hotels, Amphitheatre, Community Centre, Library and Bookshops, Beach Resort, University, Heating Depot, Grand Food Hall and Grand Plaza.
  - Not built on purpose: venues for the Freight Terminal, Warehouse District, Foundry Row, Heavy Industry Exchange and International Terminal (they stay bulk buyers). Every venue has a good makeable by the tier its district opens at (tested), and the level 5 capstones now earn more than they cost to keep (tested).
- src/sim/buyers.test.ts fails if a good has no full-price buyer, or if a building could be built before something pays full price for what it makes. By-products (sawdust, bran, whey...) sell for salvage at the Market. The wiki has a Venues page.

## Open items for you

- Venues inside districts (logic built for restaurants and hardware, no models yet): each district is a row of venues, each with its own look and its own menu. Plan the sign, shopfront and a few props per venue type, not one shell per district. Names and menus are in src/sim/venues.ts; more districts will get venues, so keep each shopfront a swappable sign and prop set on a shared shell.
- Buildings pass (producers, processors, town homes) in the painterly style above.
- Vehicles to match.
- Resource node scenery for oil, coffee and mango: all draw on Map 1 (screenshots in dist/review/island-*.png). The oil pool is small from far away; the pumpjack carries it up close.
- Mine: currently just a rust heap with no entrance. A readable entrance that is not clutter would help.

- Not wanted: spoilage, and old-save compatibility. Idea only: a stall-based Market.
