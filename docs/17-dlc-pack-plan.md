# Supplyline — DLC Pack Plan (cleaned draft)

**Interactive view:** [DLC collections](http://localhost:3000/local/dlc/) (local only, in the git-ignored `local/` folder; start the dev server with `npm run dev`). It includes every collection below, current and planned goods, existing buildings, expansion ideas, shared ingredients and questions. Search, filter, select a collection, or expand and collapse all. After editing this plan, regenerate its data with `node local/export-dlc-catalog.cjs`, which also checks that every good and building has exactly one home. See [00-local-links.md](00-local-links.md) for all local links. This is a local browsing page, not a published DLC announcement and not part of the build.

> **Current direction from Chris:** use packs to organize all content, including goods and buildings already in the game, and deepen the unassigned families. The **ChatGPT organization pass** below supplies a complete proposed ownership map and expansion menu. Catalog ownership does not remove existing content from the base game or decide pricing. Earlier cleanup comments are retained as review history.

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
| PK-01 | Three pack shapes: deepening, new material, cosmetic | Proposed | Assumed: useful overlapping tags; add production-method and infrastructure tags. Catalog homes need not equal paid releases | Idea |
| PK-02 | A good pack has one source, one to three buildings, four to eight products, a by-product outlet, an existing buyer and a new decision | Proposed | Refine: Assumed sizing guide only. Existing sources/buildings can suffice; any new buyer acceptance must be implemented and checked | Idea |
| PK-03 | Variants of existing base goods are variants (FP-34), not new goods | Proposed. Applies to Pellets, Feed, Bran, Pizza, Sausage | Refine: distinct typed goods can share a demand family. Assumed: merge only when interchangeable, not merely similarly named | Idea |
| PK-04 | Shared enablers need one owner and a declared dependency | Proposed | Agree. Assumed: separate catalog owner from availability; shared support or optional integration avoids compulsory unrelated DLC purchases | Idea |
| PK-05 | First pack: Brewery | Proposed | Agree as a post-demo proposal. Assumed: selector and family demand are real work; source-to-buyer proof before wider styles | Idea |
| PK-06 | Metals waits for new ore spots | Proposed. Checked: node kinds are fixed | Checked closed NodeKind list. Assumed: source design is required; Map 3 streaming is not inherently a prerequisite | Idea |
| PK-07 | Custom Color splits into paint goods and vehicle liveries | Proposed | Agree on separate scopes, not necessarily separate purchases. Assumed: keep both under one catalog home until Chris chooses | Idea |
| PK-08 | Drop items with no buyer or no system (list above) | Proposed | Disagree with blanket deletion. Assumed: assign a home and defer; a town buyer may consume goods without simulated pets/horses | Idea |
| PK-09 | Existing content remains in its thematic pack catalog | — | Chris's stated direction; proposed ownership below. Existing base availability is unchanged | Discussing |
| PK-10 | Complete catalog coverage: current goods, planned goods and sites | — | Checked: 89 goods, 64 planned goods, 91 sites; one proposed primary home each in P01–P29 | Idea |
| PK-11 | Owner, implementation status and paid/base availability are separate | — | Assumed: prevents cleanup from silently converting existing base content into paid-only content | Idea |
| PK-12 | Preserve deferred ideas with a missing-dependency explanation | — | Assumed: distinguish a missing buyer, an unverified recipe and a genuinely new mechanic | Idea |
| PK-13 | Non-cargo features have their own roadmap homes | — | Assumed: engine support, infrastructure, future worlds, presentation and operations stay organized without becoming goods | Idea |

## ChatGPT organization pass — current working proposal

Chris's clarification: **everything should have a sensible pack home, including content already in the game.** This is catalog organization and expansion planning. A pack home does not by itself mean a separate paid purchase, a new unlock, or removal from the base game. Existing goods and buildings stay available under current rules. The earlier cleanup above is retained as Claude's review history; its blanket instructions to remove existing content or drop unsupported ideas are not the approach used in this pass.

**Checked:** `src/sim/defs.ts`, `src/sim/planned.ts`, the generated goods/building list, and its export tool. There are **89 current goods, 64 planned goods and 91 listed sites**. The ownership tables below cover every one exactly once in its respective category. Planned goods are catalog placeholders, not working production chains. The historical draft is not the current source of truth.

**Assumed proposals:** all pack assignments, new products, buildings, buyers, recipes, bundles and priorities below. These are suggestions for Chris, not decisions. Exact real-world recipes, balancing, art and new buyer behavior have not been verified. The external planner was not inspected or edited in this pass.

### Pack ownership is separate from availability

Track these fields independently when the planner is next changed:

| Field | Meaning | Example |
|---|---|---|
| Primary pack | The one family responsible for an item | Furniture and Household owns furniture |
| Related packs | Other families that produce, consume or display it | Forestry supplies lumber; Textiles supplies cloth |
| Implementation | In game / Planned in code / New proposal | Furniture is In game |
| Availability | Included in base / Optional expansion / Undecided | Existing furniture remains Included in base |
| Item type | Good / Recipe / Building / Vehicle / Feature / World | A livery is a Feature, not a cargo |
| Dependency | Exact required inputs or capabilities | A barrel recipe needs lumber and a cooperage |
| Evidence | Checked source, or Assumed proposal | `defs.ts` versus a suggested new recipe |

Keep a stable item ID when changing its catalog home. Do not duplicate a good just because several packs use it. Conversely, variants may have distinct typed IDs while sharing a demand family; FP-34 does not require collapsing every style into one inventory ID. Rice bran and wheat bran may share uses, but equivalence is a design choice, not an automatic merge.

The A/B/C shapes are useful tags, not exclusive categories. Greenhouse is primarily a **production-method** pack, and Logistics is **infrastructure**. A pack can carry several tags. Product counts are a sizing aid for an initial release, not a ceiling on Chris's long-term variety.

### Complete ownership map: current and planned goods

P01–P13 retain the original thirteen homes, with clearer names where useful. P14–P29 give the remaining content a home. These are **29 catalog families, not a promise of 29 separately sold DLCs**. Technical IDs make coverage and duplicate checks unambiguous; player-facing names remain in the generated goods list.

| Pack | Family | In game — Checked IDs, proposed home | Planned — Checked IDs, proposed home |
|---|---|---|---|
| P01 | Brewery | `barley`, `hops`, `beer`, `spentgrain` | `cider` |
| P02 | Winery | `grapes`, `wine` | — |
| P03 | Coffee and Tea | `coffee` | `tealeaves`, `tea` |
| P04 | Fruit and Preserves | `fruit`, `mango`, `jam`, `juice` | `dates`, `bananas`, `coconuts` |
| P05 | Dairy and Cheese | `milk`, `cheese`, `butter`, `whey`, `icecream` | `cream`, `yogurt` |
| P06 | Vegetables and Pickling | `vegetables`, `potatoes`, `canned` | `tomatoes`, `onions`, `ketchup` |
| P07 | Forestry and Wood Products | `logs`, `lumber`, `sawdust`, `woodchips`, `firewood`, `pellets` | `charcoal`, `plywood` |
| P08 | Rice | — | `rice` |
| P09 | Field Crops and Farm Supplies (includes Hay) | `grain`, `feed`, `bran`, `straw`, `husks`, `mulch` | `corn`, `hay`, `seeds`, `fertilizer` |
| P10 | Mining and Metals | `ore`, `coal`, `ingots`, `steel`, `slag` | `copperore`, `copper`, `bauxite`, `aluminium`, `goldore`, `gold`, `pipes`, `wire` |
| P11 | Oil, Gas and Industrial Chemicals | `oil`, `fuel` | `naturalgas`, `biofuel`, `asphalt`, `plastic` |
| P12 | Greenhouse and Horticulture | — | — |
| P13 | Paint and Finishes / Custom Color | — | `paint` |
| P14 | Bakery and Milling | `flour`, `bread`, `pastry` | `cake`, `cookies`, `cereal` |
| P15 | Spirits and Distilling | `spirits` | — |
| P16 | Prepared Meals | `pizza`, `pasta` | `soup` |
| P17 | Livestock and Meat | `pork`, `eggs`, `meat`, `sausage` | `chicken`, `beef`, `lamb`, `bacon`, `ham` |
| P18 | Fishing and Seafood | `fish`, `fishscraps`, `smokedfish`, `cannedfish` | — |
| P19 | Textiles and Leather | `cotton`, `wool`, `yarn`, `cloth`, `clothes`, `feathers`, `pillows` | `leather`, `flax`, `linen`, `silk`, `shoes` |
| P20 | Stone, Ceramics and Construction | `stone`, `clay`, `sand`, `gravel`, `granite`, `bricks`, `blocks`, `cement`, `concrete`, `glass` | `limestone`, `gypsum`, `marble`, `tiles`, `plaster` |
| P21 | Paper, Printing and Packaging | `paper`, `books`, `pulp` | `cardboard` |
| P22 | Pantry Ingredients and Cooking Oils | `sugarbeet`, `sunflower`, `honey`, `salt`, `spices`, `cocoa`, `sugar`, `cookoil`, `wax` | `olives`, `olive-oil`, `peanuts` |
| P23 | Snacks, Confectionery and Soft Drinks | `crisps`, `chocolate`, `soda` | `popcorn`, `peanut-butter` |
| P24 | Tools, Machinery and Vehicle Components | `tools`, `machinery` | `bicycles` |
| P25 | Rubber and Tyres | — | `rubber`, `tyres` |
| P26 | Electronics and Appliances | — | `electronics`, `batteries`, `appliances` |
| P27 | Furniture and Household Goods | `furniture`, `candles` | `soap`, `toys` |
| P28 | Water and Utilities | `water` | — |
| P29 | Logistics, Fleet Services and Towns | — | — |

Some deliberately shared boundaries: Sheep Farm belongs to Textiles today because it makes wool; a future lamb recipe can supply Livestock. Fish Meal Plant belongs to Seafood but makes feed owned by Farm Supplies. Apiary belongs to Pantry Ingredients and supplies wax to Household and Finishes. Ownership is responsibility, not an exclusive right to make or use a good.

### Complete ownership map: current buildings

These are catalog homes only. No building moves on the map, changes tier, gains a recipe or becomes paid because of this table. New buildings proposed later are not included in this checked count.

| Pack | Current buildings — Checked names, proposed home |
|---|---|
| P01 | Barley Farm; Hop Farm; Brewery |
| P02 | Vineyard; Winery |
| P03 | Coffee Plantation |
| P04 | Orchard; Mango Grove; Jam Factory; Juice Press |
| P05 | Dairy Ranch; Dairy; Creamery; Ice Cream Plant |
| P06 | Potato Farm; Vegetable Farm; Cannery |
| P07 | Forestry Camp; Wood Yard; Pellet Mill; Sawmill |
| P08 | No existing building assigned |
| P09 | Farm; Feed Mill; Garden Supply; Compost Yard; Silage Plant |
| P10 | Coal Mine; Iron Mine; Smelter; Steelworks; Slag Crusher |
| P11 | Oil Well; Fuel Refinery |
| P12 | No existing building assigned |
| P13 | No existing building assigned |
| P14 | Flour Mill; Bakery; Pastry Kitchen |
| P15 | Distillery |
| P16 | Noodle Maker; Pizzeria |
| P17 | Chicken Farm; Pig Farm; Butcher; Sausage Maker |
| P18 | Fishing Harbor; Fish Cannery; Fish Meal Plant; Smokehouse |
| P19 | Cotton Farm; Sheep Farm; Spinning Mill; Wool Mill; Weavery; Garment Factory; Pillow Maker |
| P20 | Clay Pit; Quarry; Sand Pit; Granite Cutter; Stonecutter; Brickworks; Cement Works; Concrete Plant; Glassworks |
| P21 | Paper Mill; Printery |
| P22 | Sugar Beet Farm; Sunflower Farm; Apiary; Salt Pan; Cocoa Plantation; Spice Plantation; Sugar Refinery; Oil Press |
| P23 | Crisp Fryer; Chocolate Maker; Soft Drink Plant |
| P24 | Toolworks; Machine Works |
| P25 | No existing building assigned |
| P26 | No existing building assigned |
| P27 | Furniture Workshop; Candle Maker |
| P28 | Water Pump |
| P29 | Recycling Yard; Distribution Warehouse; Mechanic Shop; Port; Rail Yard; Airport; District; Market; Supply Yard; Rail Station |

P29 is the shared base infrastructure home. Drivers, mechanics, roads, rail, routes, vehicle classes, land plots, town progression and buyer policies also belong here as **systems**, not additional goods. Rail/sea/air extensions can be subcollections. Existing capacity, reach, fuel, airport and driveway rules remain intact. Space and orbital transport belong in future-world collections, not in an Earth product pack.

### Deeper expansion menu

Every entry in this table is an **Assumed proposal** unless its existing/planned ID is listed above. Product names identify possible content, not approved or complete recipes. A proposed outlet needs implementation and testing; being thematically plausible does not make an existing venue accept the new ID.

| Pack | Deeper content to explore | Buildings or recipes to explore | Choice and outlet to prove |
|---|---|---|---|
| P01 Brewery | Pale, stout, porter, wheat, IPA, sour, cider; malt and yeast ingredient chains | Malt House; yeast production; selectable Brewery recipes | Local ingredient supply versus sale margin; one shared beer-demand pool, declared premiums only |
| P02 Winery | Red, white, rosé, sparkling, fruit and honey wines | Vineyard grape selections; Winery recipes; optional barrel recipes | Grape supply versus blended styles; wine-buying venues with explicit family acceptance |
| P03 Coffee and Tea | Roast profiles, ground and instant coffee; black, green, fruit and herbal tea | Roastery, Tea Estate, Tea Blender; spent grounds | Destination preferences and ingredient blends; cafes as proposed buyers, mulch and another real outlet for grounds |
| P04 Fruit and Preserves | Apples, pears, berries, citrus, dates, bananas, coconuts; jams, marmalade, dried fruit, chutney, pectin, syrups | Orchard selections, drying and preserving recipes | Fresh sales versus processing; Markets and food factories; bakery consumes fillings |
| P05 Dairy and Cheese | Cream, yogurt, fruit yogurt; fresh, hard, blue, herb and smoked cheeses; flavored butter and ice cream | Existing Dairy/Creamery recipes; optional cultured-product production | Milk split among products; Markets, bakery and meals; fixed recipes before aging systems |
| P06 Vegetables and Pickling | Tomatoes, onions, cabbage, carrots; pickles, sauerkraut, kimchi, ketchup, hot sauce | Farm selections, Pickling Works, Cannery recipes | Sell crops or preserve/process them; food buyers and meal makers; no spoilage required |
| P07 Forestry and Wood Products | Species/grades only if useful; veneer, plywood, particleboard, charcoal, barrels, pallets | Cooperage, Veneer Mill, board recipes, Charcoal Kiln | Construction timber versus manufactured wood; packaging and furniture consumers; reuse sawdust outlets |
| P08 Rice | White/brown rice, flour, noodles, cakes, bran oil; husk/bran outputs | Paddy producer, Rice Mill, flour/noodle recipes | Milling yield and output allocation; meals and ingredient buyers; feed/pellet integration |
| P09 Field Crops and Farm Supplies | Hay, alfalfa, corn, seed, fertilizer; cattle feed, hay pellets, haylage; later rye/oats if useful | Hay Barn, Seed Merchant, feed and fertilizer recipes | Crop versus input supply; farms need explicit feed/fertilizer demand before promising productivity effects |
| P10 Mining and Metals | Copper/aluminium/gold plus tin, zinc, nickel, lead; brass, bronze, stainless steel, wire, pipes, tinplate | Ore sources, Foundry, Rolling/Wire Mill where a distinct step is useful | Ore sourcing versus alloys; machinery/electronics/building outlets; resolve sources before shipping |
| P11 Oil, Gas and Industrial Chemicals | Fuel blends, natural gas, plastic, asphalt, lubricants, bitumen, kerosene, biofuel | Cracking Unit, Tank Farm, Asphalt Plant, lubricant recipes | Sell basic fuel versus industrial outputs; no automatic new road or vehicle fuel requirements |
| P12 Greenhouse and Horticulture | Herbs, cucumbers, peppers, cut flowers, potted plants; alternative growing methods for existing crops | Greenhouse, Nursery, packing recipes | More setup cost for controlled production; food factories and proposed garden/florist buyers |
| P13 Paint and Finishes / Custom Color | Pigments, paint finishes, varnish, polish; liveries and decals as separate feature scope | Pigment Works, Paint Mixer; optional Paint Shop | Industrial finish supply versus cosmetics; furniture/construction buyers must be defined |
| P14 Bakery and Milling | White/whole-grain/rye breads, rolls, pastries, cakes, cookies, cereal, fruit tarts | Mill and Bakery recipes, Cereal Mill | Cheap staples versus input-heavy products; flour, dairy, fruit and honey sourcing |
| P15 Spirits and Distilling | Grain spirits, fruit brandy, coffee liqueur, honey blends; later barrel-finished styles | Distillery recipes, optional blending | Which crop/fruit streams to distill; drinks venues; no aging simulation assumed |
| P16 Prepared Meals | Pasta dishes, pizza variants, soup, vegetable stock, sauces, fried rice, rice pudding, mac and cheese, salad kits | Meal Kitchen, sauce recipes, existing Noodle Maker/Pizzeria | Combine several supply chains for higher-value orders; explicit meal demand, no refrigeration requirement |
| P17 Livestock and Meat | Chicken, beef cattle, lamb, bacon, ham; sausage and smoked-meat styles | Ranch/Poultry recipes, Butcher and smoke recipes | Animal supply versus processed cuts; food buyers and meals; hides can support Textiles |
| P18 Fishing and Seafood | Fish species if sourcing differs; smoked/canned styles, fish cakes, seafood meals, fish oil/meal candidates | Existing harbor, smoke/canning recipes | Landing allocation between fresh and processed sales; retain autonomous fishing behavior |
| P19 Textiles and Leather | Flax, linen, silk, leather, shoes; cloth blends, workwear, upholstery, blankets | Textile Mill, Tannery, Shoe Factory; existing mills and garments | Fiber choice versus downstream goods; clothing/furniture buyers; no required livestock expansion for base textiles |
| P20 Stone, Ceramics and Construction | Limestone, gypsum, marble, roof tiles, plaster, ceramic tiles, paving, glass products | Quarry recipes/sources, ceramic and finishing processes | Local bulk materials versus refined construction products; do not rewrite base build bills |
| P21 Paper, Printing and Packaging | Cardboard, cartons, wrapping paper, stationery, labels, printed packaging | Paper Mill/Printery recipes, carton production | Sell paper versus convert it; packaging can be a saleable output before becoming a universal recipe input |
| P22 Pantry Ingredients and Cooking Oils | Olives/olive oil, peanuts, herb/spice blends, syrups, salt grades, cooking-oil variants | Olive Grove, Oil Press variants, ingredient blending | Alternate sources for food processors; avoid obligatory specialty inputs in base recipes |
| P23 Snacks, Confectionery and Soft Drinks | Popcorn, peanut butter, chocolate styles, sweets, chips/fries, flavored soft drinks | Snack Factory, chocolate and soda recipes | Ingredient combinations and buyer preferences; stadium/cafe demand must be explicitly connected |
| P24 Tools, Machinery and Vehicle Components | Hand tools, machine parts, fasteners, pumps, bicycles; later agricultural equipment | Machine Works variants, assembly processes | Bulk metal processing versus assembly; machinery can remain sold cargo without new drivable vehicles |
| P25 Rubber and Tyres | Rubber, tyre types, hoses, belts, seals | Rubber Plantation, Tyre Factory, rubber processing | Industrial supply to assembly; tyre wear/replacement gameplay is a separate proposal |
| P26 Electronics and Appliances | Electronics, batteries, circuit assemblies, household appliances | Electronics Factory, Battery Plant, Appliance Factory | Several costly inputs versus high-value outputs; destination demand and actual supported recipes needed |
| P27 Furniture and Household Goods | Furniture styles, cabinets, seating, candles, soap, toys, cleaning/polish products | Furniture Workshop variants, Soap Works, Toy Factory | Wood/textile/chemical combinations for household buyers; wood finishing need not gate base furniture |
| P28 Water and Utilities | Water as shared input; optional bottled water, filtration equipment, irrigation supplies | Existing Water Pump; optional treatment/packing | Freight-intensive water supply versus refined output; no power grid or water-quality simulation assumed |
| P29 Logistics, Fleet Services and Towns | Freight terminals, storage options, transport-mode depth, maintenance services, commercial buyers | Existing infrastructure; later separately scoped extensions | More useful network decisions; preserve all locked transport and placement rules |

The farming and greenhouse collections can be sold or released together later. Construction, metals, chemicals and machinery are broad families that can ship in smaller themed installments. Their breadth is useful for organization; it is not a reason to implement everything at once.

### Shared inputs: one definition, several consumers

Default proposal: avoid making someone buy a large unrelated pack solely to unlock a minor ingredient. Use shared base support where a general capability is needed, or an explicitly declared small dependency. Optional integration recipes can connect two owned packs without making either pack's core loop depend on the other.

| Shared item/capability | Proposed catalog owner | How other packs use it |
|---|---|---|
| Malt | P01 Brewery | Brewing ingredient; the original beer recipe remains available |
| Yeast | P01 Brewery as initial steward | Shared ingredient for optional brewing/baking/wine recipes; availability needs one explicit decision |
| Wooden barrels and pallets | P07 Forestry and Wood Products | Supply recipes for drinks and freight; do not force a Wood purchase for the basic Brewery expansion loop |
| Vinegar | P06 Vegetables and Pickling | Fruits/Rice may supply alternate recipes; one vinegar definition, explicit compatibility rules |
| Drying | Shared processing capability; dried products owned by their product family | Fruit, Tea and Herbs can reuse the capability without three conflicting buildings |
| Fresh herbs | P12 Greenhouse and Horticulture | Dairy/Tea/Meals consume them; ordinary field-grown support could be base if needed to avoid a mandatory greenhouse purchase |
| Paint/pigments | P13 Paint and Finishes | Wood, household and cosmetics consume; Oil owns upstream materials, not a second Paint |
| Smoking | Existing Smokehouse has its current home in P18 Seafood | Meat and Dairy add recipes only when supported; its current fish recipe does not automatically smoke every good |
| Olive oil | P22 Pantry Ingredients and Cooking Oils | Food inputs; never merge it with industrial fuel |
| Biofuel / biodiesel | P11 Oil, Gas and Industrial Chemicals | Decide whether biodiesel is a specific variant; do not erase the broader planned Biofuel category by assuming synonyms |
| Rice bran / husk pellets / hay pellets | Source recipe stays in Rice/Hay; shared outputs belong to P09/P07 when identical | Distinct IDs only where the player or logistics needs the distinction; family matching does not prove chemical interchangeability |
| Optional pack interfaces | Shared engine/base capability | Recipe selection, family demand, save labels and catalog filtering are features, not purchasable ingredients |

No existing paid/free availability is changed here. Exact recipe dependencies should form a workable graph, with no circular requirement to own three packs before any can operate.

### Reconsider the earlier moves and drops

- **Keep existing content in its family.** Furniture stays in P27, wood supply in P07; the existing Workshop is not removed from the catalog. Existing Cheese, Feed, Pellets and Bran are anchors for their expansions.
- **Owner follows the finished product.** Fruit yogurt belongs to Dairy, fruit tart to Bakery, fruit brandy to Spirits, smoked cheese to Dairy, and barrel-finished beer to Brewery. Supplier packs can list them as consumers, not claim a second definition.
- **Prepared-food boundaries should be consistent.** Move vegetable pasties to Bakery; soup, stock, sauces, salad kits, fried rice and rice pudding to Prepared Meals. Rice still supplies the ingredients. Vegetable sausage is a candidate Meat-family alternative recipe; its eligibility for sausage demand needs an explicit rule.
- **Sake can have Brewery as its producer home and Rice as its supplier.** This organizational choice does not decide its in-game demand family or replace real recipe research.
- **Do not drop saleable goods just because the player does not own the end user.** Horse feed and pet bedding could be outputs sold to future town buyers; the game need not simulate owned horses or pets. Keep them in the later Farm Supplies collection until a buyer and a worthwhile chain are designed.
- **Do not invent systems from names alone.** A Cheese Cave could be a fixed-duration processing building. Frozen food can be an ordinary manufactured good without spoilage or refrigeration simulation. Lamps can be sold equipment without an electricity grid. None of those systems is automatically authorized.
- **Industrial outputs need named demand, not automatic new operating costs.** Keep engine grease, petroleum jelly and fuel containers in the later Chemicals/Packaging backlog. A future industrial buyer is an option; mandatory lubricant, tyre or kerosene upkeep would change vehicle rules and needs a separate decision.
- **Packaging-only goods are not automatically worthless.** Sushi Rice Pack and Cheese Board could become food-service products if assembly and buyer demand create a meaningful choice. Keep them in Prepared Meals as later candidates; do not pad the first release with labels that behave identically.
- **Keep novelty items visible but low priority.** Hay-baked ham belongs under Meat/Prepared Meals, hay infusion under Coffee and Tea; recipe credibility and demand have not been checked.
- **No universal new-source rule.** A pack can deepen an existing building with useful recipes and need no new farm or building. No need to invent a by-product solely to satisfy a checklist; any by-product introduced must satisfy the existing outlet rules.
- **Map constraints need precision.** A rice producer could initially reuse farmland with supplied water, if Chris accepts that design; wetland placement is a separate rule. New ores require a resource-source design, but not inherently Map 3 texture streaming. Existing maps need an explicit, safe activation plan; they cannot acquire new deposits merely from a catalog entry.

### Items outside commercial product packs

Everything still has a home, but not everything is cargo or a sellable expansion:

| Home | Contents | Treatment |
|---|---|---|
| Shared engine/base | Recipe selector, demand families, pack manifests, catalog validation, save policy, UI grouping | Feature roadmap; no new commercial decision implied |
| P29 core infrastructure | Drivers, mechanics, vehicle classes, roads, rail, sea/air routes, yards, districts, markets | Existing systems remain available; future additions reviewed separately |
| Future Worlds | Moon/Mars resources, orbital buyers, space stations and cross-world shipments | Separate future-world collection; retain Campaign/World/Pack/Link proposals |
| Presentation | Models, sounds, terrain, lighting, icons and accessibility | Production/art work, not additional goods; do not polish placeholders |
| Operations | Testing, balance, performance, releases, feedback and recovery | Ongoing work; never hide essential bug fixes in a paid pack |
| Deferred mechanics | Aging, refrigeration, machinery operation, power grids, automatic tyre/lubricant consumption | Separate proposals; no spoilage or other dropped mechanic restored |

### A better release checklist

1. A clear player decision and at least one complete source-to-buyer route.
2. One primary owner per item, with status and base/optional availability recorded separately.
3. Reachable inputs and buyers for each active pack combination; no unsupported cross-pack requirements.
4. Exact variants retain identity but share demand and storage where intended; no multiplied demand or duplicate growth credit.
5. Existing base content, unlocks, by-product behavior and transport rules still work.
6. By-products have the required outlets; recipes do not introduce deadlocks or require unattainable inputs.
7. Recipe switches, leftover cargo, save/load and pack activation obey the separately agreed policies.
8. Catalog, wiki and planner present the same definitions and clearly distinguish proposals.
9. Representative playtesting, throughput and performance checks, including after adding a mature pack to a supported save.
10. A bounded first installment, without pretending the wider family is finished.

**Suggested order, not a decision:** finish the demo; prove Brewery's selector and family handling with malt/yeast and a small style set; extend to Bakery/Dairy/Fruit recipes; then expand crops and processed foods; take minerals, industrial assembly and new-world sourcing as separate later projects. Existing goods keep their pack homes throughout. Selling or bundling these families can be decided after their playable scope is known.

## Log

| Date | By | Change |
|---|---|---|
| 2026-10-26 | Claude | Created from Chris's 13-pack plan (read from the planner page's saved data). Cleaned misfits, overlaps and gaps; added PK-01 to PK-08 |
| 2026-10-26 | ChatGPT | Applied Chris's all-content pack organization direction; added 29 proposed catalog homes covering 89 current goods, 64 planned goods and 91 sites, deeper expansion menus, shared-input ownership and deferred-item homes. Preserved Claude's review; no game or external planner changes |
