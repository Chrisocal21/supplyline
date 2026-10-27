# Supplyline — Tier Remodel (Tiers 0 to 25)

Started October 26, 2026, release 0.234. Chris's direction: spread unlocks thin, about 3 to 4 per tier, across 26 tiers (0 to 25), because the game will keep growing. Buildings also get their own levels that must be earned with experience, so a building cannot be built and then levelled to the top at once. This file is the plan and the working ladder. Rows in [16-future-ledger.md](16-future-ledger.md): FP-53 to FP-57.

## What exists now

The unlock ladder is written as data in [src/sim/ladder.ts](../src/sim/ladder.ts) and checked by [src/sim/ladder.test.ts](../src/sim/ladder.test.ts). **It is not wired into the game yet.** The game still uses the old five tiers. The test checks that:

1. Tiers run 0 to 25 in order.
2. Every building and vehicle appears exactly once (the town-made Market, Supply Yard, District and Rail Station are exempt; the Rail Station comes with the Rail Yard).
3. Every tier opens three or four things (the last may open fewer).
4. Every building opens at or after the buildings that make its inputs.
5. Boats, trains and planes open at or after the Harbor, Rail Yard, Port or Airport they need.

I broke the ladder on purpose once and confirmed the test fails, so it is not passing by accident.

## The ladder (draft, edit freely)

| Tier | Name | Buildings | Vehicles |
|---|---|---|---|
| 0 | Startup | Forestry Camp, Wood Yard, Dairy Ranch | Box Truck |
| 1 | Mill and Dairy | Sawmill, Dairy, Farm, Flour Mill | |
| 2 | Daily Bread | Bakery, Orchard, Juice Press | Big Box Truck |
| 3 | Brick and Stone | Clay Pit, Brickworks, Quarry, Stonecutter | |
| 4 | Water and Sand | Sand Pit, Water Pump, Recycling Yard, Distribution Warehouse | |
| 5 | Farmyard | Chicken Farm, Vegetable Farm, Potato Farm, Creamery | |
| 6 | Sweet Trade | Sugar Beet Farm, Sugar Refinery, Jam Factory, Feed Mill | |
| 7 | Coal and Cement | Coal Mine, Cement Works, Concrete Plant, Granite Cutter | |
| 8 | The Kitchen | Pastry Kitchen, Noodle Maker, Garden Supply, Pellet Mill | |
| 9 | Harbor | Fishing Harbor, Salt Pan, Smokehouse | Fishing Boat |
| 10 | Preserves | Fish Cannery, Cannery, Mechanic Shop, Glassworks | |
| 11 | Iron Age | Iron Mine, Smelter, Toolworks, Slag Crusher | |
| 12 | Rails | Rail Yard (with Rail Station) | Freight Train, Big Rig |
| 13 | Pork and Oil | Pig Farm, Butcher, Sunflower Farm, Oil Press | |
| 14 | Ports | Port, Sheep Farm | River Barge, Cargo Boat |
| 15 | Cloth | Wool Mill, Cotton Farm, Spinning Mill, Weavery | |
| 16 | Fine Goods | Garment Factory, Furniture Workshop, Paper Mill, Printery | |
| 17 | Hives and Hauling | Apiary, Candle Maker, Pillow Maker | Truck Fleet |
| 18 | Brewing | Barley Farm, Hop Farm, Brewery, Silage Plant | |
| 19 | Vines and Spirits | Distillery, Vineyard, Winery, Compost Yard | |
| 20 | Prepared Foods | Fish Meal Plant, Pizzeria, Soft Drink Plant | Heavy Haul Train |
| 21 | Snacks | Spice Plantation, Sausage Maker, Crisp Fryer, Ice Cream Plant | |
| 22 | Exotics | Cocoa Plantation, Chocolate Maker, Coffee Plantation, Mango Grove | |
| 23 | Heavy Industry | Oil Well, Fuel Refinery, Steelworks | |
| 24 | Machines and Air | Machine Works, Airport | Cargo Plane, Freighter |
| 25 | Legacy | | Cargo Jet, Container Ship |

Tier names are placeholders.

**Notes on the order.**
- The early tiers follow the chains the quest line already teaches (camp, dairy, mill, bakery, orchard).
- Brick and Stone comes at tier 3 so bricks exist early for the materials economy. Cement follows at tier 7, steel at tier 23.
- Rail arrives at tier 12 and sea at tier 14. Today both open at Tier 2, so this is a real slowdown. Is that what you want, or should logistics come earlier?
- Late tiers are dense with food and exotic goods, which is where new free packs will slot in (FP-57).

## The work, in order

| Phase | What | Notes |
|---|---|---|
| A | Ladder as data and a test | **Done** |
| B | Wire it in: derive each building's and vehicle's tier from the ladder | **Done** (0.235). Rail is tier 6, ports 12, air 18; bridge spans and building-level caps re-pointed. Highways stay at tier 1 |
| C | Quests for 26 tiers | **Done as a first pass** (0.235). The 58 old quests were re-sorted onto the ladder; each building or vehicle with no quest got a plain "build it" or "buy it" quest. To be rewritten properly |
| D | Material bands | **Done** (0.235). Lumber to tier 3, bricks from tier 4, cement from tier 8, steel from tier 23. Farm, mill, bakery and orchard stay free of materials, as before |
| E | Town levels | 24 districts over 5 town levels today (1, 6, 8, 6, 4). Spread them over more levels, 2 to 4 each |
| F | Building experience | See below |
| G | Fix tests and the pacing bot | **Done** for tests (566 pass). The pacing bot plays the new ladder: tier 3 at 21.5 min, tier 8 at 47.7 min in one game hour |

## Building experience (the new mechanic)

Chris: each building levels up separately with experience, so you cannot build a building and then level it all the way up. Today a building levels by paying money and materials, limited by the world tier (the code gives "Level N needs Tier X").

A first proposal for review:
- A building earns experience from the work it does (units made, units sold), not from money.
- Each level needs more experience than the last. Money and materials are still paid, but only when the experience is reached.
- The tier still caps how high a building may go. Experience decides when it can go up to that cap.
- A building bought late starts at level 1 with no experience, however rich the player is.

Open questions for Chris:
1. Should money and materials still be needed to level up, or only experience?
2. What counts as experience: units produced, units delivered, or earnings?
3. Should the tier still cap the level, or is experience the only gate?
4. Should upgrades of old worlds keep their current levels? (Old-save compatibility is dropped, so new worlds only.)

## Risks

- **Pacing.** Spreading Tier 2's 39 buildings over many tiers changes how fast the game feels. The pacing bot and a fresh-player test must re-measure it.
- **Demo.** The demo ends in early town level 2, which is within the first few tiers. Its length should be re-checked after phase C.
- **Early unlock order.** The locked rule (one early building unlocking at a time through the quest line) is respected: tiers 0 to 5 follow the existing sequence.
- **Logistics.** Delaying rail and sea to tiers 12 and 14 may make the middle game feel stuck on trucks. Needs your call.
- **Locked-in systems.** Building levels stay at ten; direct vehicle purchase, truck reach and fuel limits, and the by-product rules are unchanged.

## Chris's decisions, October 26

- 26 tiers (0 to 25); "tiers" and "levels" are the same thing.
- Rail at tier 6, ports at tier 12, air at tier 18.
- The Rail Yard and the Distribution Warehouse need a permanent home in every town, like the Supply Yard and the Market. They should also be buildable later, in a free spot in the town. Rail should be able to form circuits and loops, like Satisfactory and Factorio. **Not built yet; needs design** (see below).
- Rice or Brewery first is no longer a question: all quests are being rebuilt anyway.

## Known gaps after 0.235

- **Town levels and districts** are not spread along the ladder. 48 venues open before the goods they sell can be made (a counted known gap in `venues.test.ts`; phase E brings it to zero).
- **Pacing.** The early tiers fly by (tiers 3 to 5 in under two minutes) because their quests are plain builds. The quests are due to be rebuilt.
- **Demo end** moved to tier 3 (town level 2). The bot reaches it at 21.5 min, below the 30 to 50 minute target.
- **Highways** still open at tier 1.
- **Tier tabs** on the Objectives sheet show a window of seven with arrows. Checked in a screenshot at tier 9.
- **Rail Yard and Distribution Warehouse homes, and rail circuits:** today both are ordinary buildings placed by hand. The new idea is a town plot like the Supply Yard and Market that can also be placed later, plus rail loops. Needs a design.

## Log

| Date | By | Change |
|---|---|---|
| 2026-10-26 | Claude | Phase A: ladder data, test, and this plan |
| 2026-10-26 | Claude | 0.235: phases B, C (first pass), D and G. Ladder wired into the game; 26 tiers; tests updated; tier tab window |
