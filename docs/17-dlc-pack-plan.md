# Supplyline — DLC Pack Plan (cleaned draft)

Written by Claude on October 26, 2026, at release 0.234. Chris built 13 packs with the pack planner page (153 new ideas, 40 existing or planned items). This file is the cleaned-up version: the pattern across the packs, what does not belong, what overlaps, and what needs expanding. **Nothing here is decided or started.** Chris decides; Claude and ChatGPT align and add.

Related: [16-future-ledger.md](16-future-ledger.md) (rules and FP rows), [08-goods-and-sites.md](08-goods-and-sites.md) (what is in the game now, generated).

## For the reader (read this first)

Supplyline is a single-player logistics and production game on a 3D globe. Raw sites make goods, factories turn them into products, trucks, trains, ships and planes carry them to towns. The game has 89 goods and 91 buildings today. Paid DLC packs are the plan (like Farming Simulator), and the base game must work on its own with every pack off. Locked rules, dropped features and the demo finish line are in the ledger; do not break them.

**How to reply.** Edit this file. Fill the ChatGPT column, add rows with the next free number in your own voice, mark each claim Checked (read in the code or docs) or Assumed, and add a line to the Log. Do not decide for Chris.

## What the pattern is

All 13 packs fit one of three shapes.

| Shape | Packs | What it adds |
|---|---|---|
| **A. Deepening**: more depth on a chain the game already has | Brewery, Winery, Coffee and Tea, Expanded Fruits, Expanded Cheese, Expanded Vegetable, Expanded Wood | New variants of goods the player already makes, one or two new buildings, new end products. Most inputs already exist |
| **B. New material**: a new raw material and the chain behind it | Rice, Hay, Expanded Metals, Oil, Greenhouse | A new crop, ore or resource, its processing buildings, and the products it feeds. Needs new map spots or farm types |
| **C. Cosmetic or cross-cutting** | Custom Color | Paint and pigments as goods, plus vehicle paint. Part chain, part feature |

**The shape of a good pack** (what the better lists already do):
1. One new source (a farm, mine or plantation), unless it reuses an existing one.
2. One to three processing buildings.
3. Four to eight variants or products from them.
4. A by-product with an outlet, so nothing jams (a locked rule).
5. At least one end product a town Market or venue already buys, so the pack has demand from day one.
6. A new decision for the player (FP-02), not only more names.

**Where the lists went wrong:**
- **They name things the game already has** (Pellets, Feed, Bran, Cheese, Steel, Furniture).
- **Variants are listed as separate goods** when the ledger plan is a variant of one base good (FP-34).
- **Shared ingredients get claimed twice** (vinegar, paint, barrels, herbs, smoked cheese).
- **Some items have no buyer** (Engine Grease, Cheese Rind Wax, Pet Bedding).
- **Some need systems that do not exist**: aging, new ore spots, horses and pets, vehicle paint, farm machinery.

## The 13 packs at a glance

| Pack | Shape | Existing or planned items | New ideas | Main problem |
|---|---|---|---|---|
| Brewery | A | 7 | 0 | No new ideas yet: needs styles, malt, yeast |
| Winery | A | 5 | 0 | No new ideas yet: needs styles |
| Coffee and Tea | A | 5 real, 3 stray | 14 | Three stray items; overlaps Fruits (tea) |
| Expanded Fruits | A | 7 | 14 | Several items belong to other packs |
| Expanded Cheese | A | 1 | 14 | Duplicates Dairy; aging needed |
| Expanded Vegetable | A | 1 | 13 | Overlaps Greenhouse and base Crisp Fryer, Pizzeria |
| Expanded Wood | A | 5 | 14 | Owns base items; enables other packs |
| Rice | B | 1 | 14 | Needs a paddy farm type |
| Hay | B | 1 | 14 | Four items have no home |
| Expanded Metals | B | 0 | 14 | Needs new ore spots; ignores planned metals |
| Oil | B | 4 | 14 | No consumers for most outputs; overlaps Paint |
| Greenhouse | B | 0 | 14 | Overlaps Vegetable and Fruits |
| Custom Color | C | 0 | 14 | Two different things in one pack |

## Misfits and fixes (the cleanup)

**Stray items from a search bug.** "Coffee and Tea" collected Chicken, Gypsum and Natural Gas because the search matched the word "and". Fixed in the planner. **Action: remove those three from the pack.**

**Items that already exist in the game or the planned list.** Checked in `src/sim/defs.ts` and the planned list.

| Item | Pack | Already exists as | Proposed action |
|---|---|---|---|
| Furniture, Furniture Workshop | Wood | Base good and building | Stay in base; remove from pack |
| Wood Pellets Premium | Wood | Pellets, Pellet Mill (base) | Make it a variant of Pellets, not a new good |
| Hay Pellets, Rice Husk Pellets | Hay, Rice | Pellets, Pellet Mill (base) | Same: variants of Pellets |
| Cattle Feed Mix, Horse Feed Mix | Hay | Feed, Feed Mill (base) | Feed variants; drop Horse (no horses) |
| Rice Bran | Rice | Bran (base) | Variant of Bran |
| Cheesemaker | Cheese | Dairy makes cheese (base) | Expand Dairy; no second maker |
| Foundry, Rolling Mill | Metals | Smelter, Steelworks (base) | Add as upgrades or variants of those, or justify a new step |
| Copper, Aluminium, Gold, Steel Pipes, Copper Wire | not in Metals | Planned goods | Add to Metals pack (the search missed them) |
| Biodiesel, Biodiesel Plant | Oil | Biofuel (planned) | Merge with planned Biofuel |
| Plastic, Asphalt | Oil | Planned goods | Keep in Oil |
| Olive Oil | Oil | Planned good (food) | Move to a cooking-oils idea; not a fuel |
| Paint | Oil | Planned good | Move to Custom Color paint chain |
| Tea, Tea Leaves, Cider, Cream, Yogurt, Rice, Hay, Soup | various | Planned goods | Keep; assign to the one pack that owns them |

**Items that belong in a different pack.**

| Item | Now in | Move to | Why |
|---|---|---|---|
| Preserves and produce (ledger idea) | Coffee and Tea | Expanded Fruits | Wrong theme |
| Fruit Yogurt, Yogurt | Fruits | Cheese (call it Dairy) | A dairy product |
| Fruit Tart | Fruits | a Bakery pack | A baked good |
| Fruit Brandy, Coffee Liqueur | Fruits, Coffee and Tea | a Spirits or Distillery pack | Drinks, needs the Distillery |
| Wood-Smoked Cheese, Hay-Smoked Cheese | Wood, Hay | Cheese (as Smoked Cheese, which is already there) | Duplicates |
| Aged Whiskey, Barrel-Aged Stout, Oak-Aged Wine | Wood | Spirits, Brewery, Winery | They need Wooden Barrels from Wood |
| Sake | Rice | Brewery (or a Drinks pack) | A brewed drink |
| Mac and Cheese, Cheese Sauce | Cheese | a Ready Meals pack | A meal, not a cheese |
| Vegetable Pizza, Veggie Sausage | Vegetable | Variants of base Pizza and Sausage | Variants (FP-34) |
| Pickles, Hot Sauce | Greenhouse | Vegetable (Pickling Works) | Same chain |
| Herbal Infusion | Greenhouse | Coffee and Tea | A tea |
| Strawberries | Greenhouse | Fruits | A fruit |
| Wood Varnish, Beeswax Polish | Wood, Custom Color | One Paint and Finishes chain | Same chain |
| Maple Syrup | Wood | Keep in Wood, or Sugar | Tree tapping fits Forestry |

**Items to drop for now** (no buyer, no chain, or a system that does not exist).

| Item | Pack | Reason |
|---|---|---|
| Hay-Baked Ham, Hay Tea Infusion | Hay | Gimmick; no chain |
| Pet Bedding, Horse Feed Mix | Hay | The game has no pets or horses |
| Cheese Board, Cheese Rind Wax | Cheese | No chain; wax already exists as a good |
| Sushi Rice Pack | Rice | Packaging only |
| Grow Lamp Fixtures | Greenhouse | No consumer; implies electricity |
| Engine Grease, Fuel Barrels, Petroleum Jelly | Oil | No buyer yet |
| Cheese Cave | Cheese | Needs aging, which was kept out of scope (FP-20, FP-31). Use fixed-time recipes or hold |

## Shared enablers (cross-pack dependencies)

Several packs need the same thing. The rule from the ledger is that the base game never needs a pack, and a pack that needs another pack must say so (FP-07). Each enabler needs one owner.

| Enabler | Needed by | Option 1 | Option 2 |
|---|---|---|---|
| Wooden Barrels (Cooperage) | Brewery, Winery, Spirits | Make a base good | Brewery and Winery packs require Wood |
| Vinegar Works | Fruits, Rice, Vegetable | Base building | One pack owns it, others require it |
| Drying Shed | Fruits, Tea, Herbs | Base building | Same |
| Fresh Herbs | Cheese, Vegetable, Tea | Owned by Greenhouse | Cheese and Tea require Greenhouse |
| Paint and Pigments | Oil, Custom Color, Wood | One Paint pack | Base good with variants |
| Smoking | Cheese, Fish, Meat | Base building (Smokehouse exists) | Reuse Smokehouse; do not duplicate |
| Frozen storage | Vegetable, Fruits | Treat as an ordinary good | Needs refrigerated transport, which does not exist |

## What needs new systems

| System | Items it blocks | Status |
|---|---|---|
| New ore spots on the map (Lead, Nickel, Tin, Zinc) | Metals | Checked: node kinds today are forest, farmland, clay, pasture, orchard, quarry, coal, mine, coffee, mango and oil. Existing maps cannot gain new spots (FP-13) |
| Paddy farm type | Rice | New soft node kind, like Farm |
| Recipe selector (a building runs one of several recipes) | Every variant | Checked: not built (FP-33) |
| Aging (a timer that improves a good) | Cheese Cave, barrel aging | Out of scope so far (FP-20, FP-31) |
| Farm machinery as a class | Hay Baler | Out of scope (FP-20) |
| Vehicle paint or liveries | Custom Color | A different system from goods; needs a design |
| Consumers for new industrial goods | Oil outputs (lubricant, kerosene, bitumen) | Nothing in the game uses them yet |

## Per-pack cleaned lists

Format: **Keep** (stays), **Add** (to expand), **Needs** (a decision or system). New ideas are Claude's suggestions, not checked against the game.

**Brewery** (A). Keep: Brewery, Hop Farm, Beer, Hops, Cider (planned), Beer styles, Malt and yeast. Add: Malt, Yeast as real goods (Chris decided, FP-40); Malt House; beer styles as variants (pale, stout, porter, sour, wheat, IPA). Needs: Wooden Barrels for barrel-aged styles (Wood); recipe selector.

**Winery** (A). Keep: Vineyard, Winery, Grapes, Wine, Wine styles. Add: Yeast (shared with Brewery and Bakery); red, white, rosé, sparkling, fruit and honey wines as variants. Needs: Barrels (Wood); Honey is already in the game, so honey wine works.

**Coffee and Tea** (A). Keep: Coffee Plantation, Coffee, Tea, Tea Leaves; Roastery, Tea Blender; Ground, Instant and Espresso variants; Black, Green and Fruit tea; Spent Coffee Grounds (by-product, needs an outlet such as Mulch). Remove: Chicken, Gypsum, Natural Gas. Move out: Coffee Liqueur (Spirits). Add: a Tea Plantation as a new source (planned Tea Leaves).

**Expanded Fruits** (A). Keep: Jam Factory, Juice Press, Mango Grove, Jam, Juice, Mango, Drying Shed, Dried Fruit, Marmalade, Fruit Syrup, Fruit Cordial, Fruit Pectin, Fruit Leather, Sorbet, Mango Chutney, Preserves and produce. Move out: Yogurt, Fruit Yogurt (Dairy); Fruit Tart (Bakery); Fruit Brandy (Spirits). Add: Strawberries (from Greenhouse). Needs: Vinegar Works owner.

**Expanded Cheese** (A, call it Dairy). Keep: Cheese variants (Cheddar, Mozzarella, Ricotta, Cottage, Blue, Herb, Processed, Smoked) as variants of base Cheese. Add: Cream, Yogurt, Butter variants (planned Cream and Yogurt). Remove: Cheesemaker (expand Dairy), Cheese Board, Cheese Rind Wax, Cheese Cave. Move out: Mac and Cheese, Cheese Sauce (Ready Meals). Needs: recipe selector; Fresh Herbs for Herb Cheese.

**Expanded Vegetable** (A). Keep: Pickling Works, Pickles, Kimchi, Sauerkraut, Vegetable Stock, Vegetable Juice, Vegetable Pasties, Ready Meals, Soup (planned). Fold into base variants: Vegetable Pizza, Veggie Sausage, Vegetable Chips and French Fries (variants of Crisp Fryer output). Needs: Frozen Foods Plant only if frozen storage is agreed. Add: Tomatoes, Onions, Corn (planned) as sources.

**Expanded Wood** (A). Keep: Cooperage, Wooden Barrels, Veneer Mill, Wood Veneer, Particleboard, Wood Pulp Board, Wooden Pallets, Cardboard, Charcoal, Plywood (planned), Maple Syrup. Remove: Furniture, Furniture Workshop (base); Wood Pellets Premium (variant of Pellets). Move out: smoked cheese, aged drinks. Role: this pack is the enabler for barrels.

**Rice** (B). Keep: Rice (planned), Rice Mill, White and Brown Rice, Rice Flour, Rice Noodles (uses the existing Noodle Maker), Rice Cakes, Rice Pudding, Fried Rice Meal, Rice Bran Oil. Fold into base variants: Rice Bran, Rice Husk Pellets. Move: Sake (Brewery), Rice Vinegar (Vinegar Works). Drop: Sushi Rice Pack. Needs: a paddy farm type.

**Hay** (B). Keep: Hay (planned), Alfalfa, Alfalfa Farm, Hay Bales, Round Bales, Hay Barn, Haylage. Fold into base variants: Hay Pellets, Cattle Feed Mix. Drop: Hay-Baked Ham, Hay Tea Infusion, Pet Bedding, Horse Feed Mix. Needs: decide Hay Baler (machinery, out of scope). Thin pack: probably merge into a Farm Supplies pack with Seed and Fertilizer (planned).

**Expanded Metals** (B). Keep: Tin Ore, Tin, Zinc Ore, Zinc, Lead Ore, Nickel Ore, Brass, Bronze, Stainless Steel, Galvanized Steel, Steel Wire, Tinplate. Add: Copper Ore, Copper, Copper Wire, Steel Pipes, Bauxite, Aluminium, Gold Ore, Gold (all planned). Relate: Foundry and Rolling Mill to the existing Smelter and Steelworks. Needs: new ore spots (blocked until map generation can place them).

**Oil** (B). Keep: Tank Farm, Cracking Unit, Diesel, Kerosene, Bitumen, Asphalt Plant, Asphalt (planned), Plastic (planned), Lubricating Oil, Lubricant Blender. Merge: Biodiesel with planned Biofuel. Move: Olive Oil (cooking oils), Paint (Custom Color). Needs: a consumer for each output, or the chain stalls (Kerosene for planes? Bitumen for roads? Lubricant for vehicle upkeep?).

**Greenhouse** (B). Keep: Greenhouse, Nursery, Fresh Herbs, Salad Kit, Salad Packing House, Cucumbers, Bell Peppers, Cut Flowers and Potted Plants (need a buyer). Move out: Strawberries (Fruits), Pickles and Hot Sauce (Vegetable), Herbal Infusion (Tea). Drop: Grow Lamp Fixtures. Role: owns Fresh Herbs for other packs.

**Custom Color** (C). Split in two. (1) Paint and Finishes chain: Pigment Works, Paint Mixer, White, Red Oxide, Ochre and Carbon Black Pigments, Linseed-Style Binder Oil, Resin Varnish, Matte, Metallic and Pearlescent Paint, Wood Varnish, Beeswax Polish, planned Paint. (2) Vehicle liveries: Paint Shop, Decal Sheets, and the paint feature itself. Needs: Chris to say what the pack is for.

## Open questions for Chris

1. Custom Color: is it vehicle cosmetics (liveries), a paint goods chain, or both?
2. Should shared enablers (Barrels, Vinegar, Drying Shed, Herbs, Paint) be base-game items, or owned by one pack that the others require?
3. Are variants of existing goods (Pellets, Feed, Pizza, Sausage) in this DLC, or are they free base-game additions?
4. Which pack first? Claude suggests Brewery, because malt and yeast are already decided and it needs no new map spots.
5. Metals needs new ore spots on the map. Should that wait for the map groundwork (D1)?

## Questions for ChatGPT

1. Is the A, B, C shape right, or would you cut the packs differently?
2. Which of the moves, merges and drops would you change?
3. Which shared enablers should be base game, and which should be pack-owned with a declared dependency?
4. Which packs are too thin to sell alone (Hay, Greenhouse) and which are too wide?
5. What would you add to the "shape of a good pack"?

Reply by editing the ChatGPT column or adding rows below.

## Alignment rows

| ID | Point | Claude | ChatGPT | Status |
|---|---|---|---|---|
| PK-01 | Three pack shapes: deepening, new material, cosmetic | Proposed | | Idea |
| PK-02 | A good pack has one source, one to three buildings, four to eight products, a by-product outlet, an existing buyer and a new decision | Proposed | | Idea |
| PK-03 | Variants of existing base goods are variants (FP-34), not new goods | Proposed. Applies to Pellets, Feed, Bran, Pizza, Sausage | | Idea |
| PK-04 | Shared enablers need one owner and a declared dependency | Proposed | | Idea |
| PK-05 | First pack: Brewery | Proposed | | Idea |
| PK-06 | Metals waits for new ore spots | Proposed. Checked: node kinds are fixed | | Idea |
| PK-07 | Custom Color splits into paint goods and vehicle liveries | Proposed | | Idea |
| PK-08 | Drop items with no buyer or no system (list above) | Proposed | | Idea |

## Log

| Date | By | Change |
|---|---|---|
| 2026-10-26 | Claude | Created from Chris's 13-pack plan (read from the planner page's saved data). Cleaned misfits, overlaps and gaps; added PK-01 to PK-08 |
