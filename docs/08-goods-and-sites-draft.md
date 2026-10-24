# Goods and production sites: draft list (not built yet)

Farming-Simulator style: raw sites make raw goods, factories take one or SEVERAL inputs and mix them into something new.
Every good ends at one of three places, and every raw good has a path to money.

- **Market** (town): finished goods and fresh food that people use. Pays money, grows the town.
- **Supply Yard** (town): building materials only, kept for the town's builds. Pays nothing.
- **Distribution Warehouse**: finished goods you ship to OTHER towns' Markets.

Tier in brackets. NEW means it does not exist yet. Prices are placeholders.

## Raw sites (what the land makes)

| Site | Makes | By-product | Tier | |
|---|---|---|---|---|
| Forestry Camp | logs | sawdust | 0 | have |
| Farm | grain | bran | 0 | have |
| Dairy Ranch | milk | whey | 0 | have |
| Orchard | fruit | sawdust | 0 | have |
| Clay Pit | clay | sand | 0 | have |
| Quarry | stone | gravel | 0 | have |
| Cotton Farm | cotton | bran | 1 | have |
| Coal Mine | coal | stone | 1 | have |
| Iron Mine | ore | stone | 1 | have |
| Sand Pit | sand | gravel | 1 | have |
| Coffee, Mango, Oil | island raws | | 2 | have |
| Chicken Farm | eggs | feathers (later) | 0 | NEW |
| Vegetable Farm | potatoes, vegetables | | 0 | NEW |
| Sugar Farm | sugar beet | pulp | 1 | NEW |
| Oilseed Farm | sunflower seeds | husks | 1 | NEW |
| Pig Farm | pork | | 1 | NEW |
| Sheep Farm | wool | | 1 | NEW |
| Apiary | honey | wax | 1 | NEW |
| Salt Pan / Mine | salt | | 1 | NEW (coast/mountain) |

## Processing (one or many inputs in, mixed products out)

| Site | Inputs | Output | By-product | Goes to | Tier |
|---|---|---|---|---|---|
| Sawmill | logs | lumber | sawdust | Yard, factories | 0 have |
| Wood Yard | logs | firewood | woodchips | Market L1 | 0 NEW |
| Flour Mill | grain | flour | bran | factories | 0 have |
| Bakery | flour | bread | | Market L1 | 0 have |
| Pastry Kitchen | flour + eggs + sugar | cake, pastries | | Market L2 | 1 NEW |
| Pizzeria | flour + cheese + vegetables | pizza | | Market L2 | 1 NEW |
| Dairy | milk | cheese, butter | whey | Market | 0 have (butter NEW) |
| Ice Cream Plant | milk + sugar | ice cream | | Market L3 | 1 NEW |
| Jam Factory | fruit + sugar | jam | | Market L2 | 1 have (add sugar) |
| Juice Press | fruit | juice | pulp | Market L2 | 1 NEW |
| Cannery | vegetables + salt | canned food | | Market L2, Warehouse | 1 NEW |
| Chip Fryer | potatoes + sunflower oil + salt | crisps | | Market L2 | 1 NEW |
| Sugar Refinery | sugar beet | sugar | pulp | factories | 1 NEW |
| Oil Press | sunflower seeds | cooking oil | husks | factories, Market L3 | 1 NEW |
| Butcher | pork | meat | | Market L2 | 1 NEW |
| Sausage Maker | pork + salt + spices (later) | sausage | | Market L3 | 2 NEW |
| Brewery | grain + sugar + water (free) | beer | spent grain to feed | Market L3, Warehouse | 1 NEW |
| Feed Mill | bran + whey + grain | animal feed | | farms (feeds ranch/pig/chicken output) | 1 have |
| Pellet Mill | sawdust + woodchips | pellets | | Market L2 | 1 have |
| Garden Supply | sawdust + woodchips + pulp | mulch / compost | | Market L2 | 1 NEW |
| Chocolate Maker | sugar + milk + (cocoa later) | chocolate | | Market L3 | 2 NEW |
| Candle Maker | wax + cotton | candles | | Market L3 | 2 NEW |
| Spinning Mill | cotton / wool | yarn | | factories | 1 have (add wool) |
| Weavery | yarn | cloth | | factories | 2 have |
| Garment Factory | cloth + yarn | clothes | | Market L3 | 2 have |
| Furniture Workshop | lumber + cloth | furniture | | Market L3 | 2 have (add cloth) |
| Paper Mill | logs + woodchips | paper | | Market L2 | 1 have |
| Printery | paper + (ink later) | books | | Market L4 | 2 have |

## Building materials (go to the Supply Yard)

| Site | Inputs | Output | Tier |
|---|---|---|---|
| Sawmill | logs | lumber | 0 |
| Quarry / Stonecutter | stone | stone, blocks, granite (NEW) | 0-1 |
| Brickworks | clay | bricks | 1 |
| Cement Works | gravel + coal | cement | 2 |
| Concrete Plant | cement + sand + gravel | concrete | 2 |
| Glassworks | sand + coal | glass | 2 |
| Smelter | ore + coal | ingots | 2 |
| Steelworks | ingots + coal | steel | 3 |

## Heavy goods (Warehouse and high-level Markets)

| Site | Inputs | Output | Goes to |
|---|---|---|---|
| Toolworks | ingots + lumber | tools | Market L3, Warehouse |
| Machine Works | steel + tools | machinery | Market L5, Warehouse |
| Fuel Refinery (NEW, tier 3) | crude oil | fuel, plastic (later) | trucks and Market L3 |

## The three lists, as proposed

**Market by town level** (fresh and finished; each level adds, nothing is removed)
- L1: bread, cheese, milk, eggs, fruit, vegetables, potatoes, firewood
- L2: + butter, jam, juice, pastries, pizza, canned food, crisps, meat, honey, mulch, pellets, paper, coffee, mango
- L3: + beer, ice cream, sausage, chocolate, candles, cooking oil, fuel, furniture, clothes, tools
- L4: + books
- L5: + machinery

**Supply Yard** (building materials only): lumber, stone, granite, sand, gravel, bricks, blocks, cement, concrete, glass, steel

**Distribution Warehouse** (finished goods to ship between towns): bread, pastries, pizza, cheese, butter, ice cream, jam, juice, canned food, crisps, meat, sausage, beer, chocolate, candles, paper, books, clothes, furniture, tools, machinery, pellets, fuel, cooking oil, mulch

Not in the Warehouse: fresh milk, eggs, fruit, vegetables, potatoes (they spoil: Market only).

## Open questions for Chris
1. Is this the right size, or too many new sites for one release? (19 new sites/goods)
2. Spoilage: should fresh food (milk, eggs, fruit) lose value if it waits too long?
3. Water: leave as free for the Brewery, or make a Water Pump?
4. Which of these do you want first, and which not at all?

---

# Round 2 (after Chris's answers)

Decided: build it all (not too much), no spoilage, water is a real good shipped in by truck, farms grow the beer ingredients, add fishing boats at the docks, and do one mega balance pass with by-products.

## Ingredients as real goods (think "what does each recipe really need")

| New raw site | Makes | By-product | Used by |
|---|---|---|---|
| Water Pump / Well | water | none | Brewery, Cannery, Ice Cream, Pizzeria dough, Chocolate, Soda, Mill (washing) |
| Barley Farm | barley | straw | Brewery, Distillery, Feed Mill |
| Hop Farm | hops | | Brewery |
| Wheat is the existing Farm "grain" | | | |
| Vineyard | grapes | | Winery |
| Spice Farm (island) | spices | | Sausage Maker, Pizzeria, Cannery |
| Cocoa Plantation (island) | cocoa | | Chocolate Maker |
| Sugar Farm | sugar beet | pulp | Sugar Refinery |
| Chicken Farm | eggs | feathers | Pastry, Pizzeria, Noodles |
| Vegetable Farm | potatoes, vegetables | | Cannery, Chip Fryer, Pizzeria |
| Pig Farm | pork | | Butcher, Sausage |
| Sheep Farm | wool | | Spinning Mill |
| Apiary | honey | wax | Pastry, Candle |
| Salt Pan | salt | | Cannery, Sausage, Chip Fryer |

New factories this adds: Brewery (barley + hops + water -> beer, spent grain), Winery (grapes + water -> wine), Distillery (barley + water -> spirits), Soda Plant (sugar + water -> soft drink), Noodle Maker (flour + eggs -> pasta), Fish Smokehouse and Fish Cannery (below).

## Fishing (the docks)

- New building: **Fishing Harbor** on a coast tile. It is a raw site: it owns **Fishing Boats** (a new vehicle bought there, like a truck).
- A boat sails to the fishing grounds nearby, fills up, comes home: fish goes into the harbor's store. Bigger boat = more catch, farther grounds.
- Makes: **fish**, by-product **fish scraps**.
- Fish -> Fish Market (Market L1 sells fresh fish), **Smokehouse** (fish + salt + firewood -> smoked fish), **Fish Cannery** (fish + salt + water -> canned fish), **Fish Meal** (fish scraps -> feed ingredient, bridges to animal feed).
- Needs to be shipped like anything else from the harbor by truck (or boat to a port town).

## The by-product mega balance (the bottleneck problem)

Why they bottleneck now: each by-product (sawdust, bran, whey, gravel, slag, sand...) is made on its own timer whether or not anyone buys it. It piles up, the shelf fills, and the site stalls or its trucks sit idle. Most have only ONE buyer, and that buyer's own output (pellets, feed) was a dead end until 0.83.

Rules for the balance:
1. **Every good has at least two outlets** (two different factories, or one factory plus a Market/Yard).
2. **Every by-product has a safety net**: a Scrap and Recycling Yard (tier 0, cheap) at every town that buys ANY by-product at a very low price, capped per minute. Nothing can ever fully jam, and a bad chain still earns pennies.
3. **A full by-product shelf never stops the main product** (verify in code; by-product lines are separate).
4. **Rates are matched**: for every good, total possible production per minute vs total possible consumption per minute, computed from the recipes. A test fails when any chain makes more than about 3x what it can use.
5. **Prices follow value added**: a product is worth more than the sum of its inputs by a set margin that rises with tier, so processing always pays and longer chains pay more.

By-product outlets (proposed):

| By-product | Outlets |
|---|---|
| sawdust | pellets, mulch, particleboard (new), Scrap Yard |
| woodchips | pellets, paper, mulch, Scrap Yard |
| bran | feed, bread (whole grain), Scrap Yard |
| whey | feed, butter/ricotta (new), Scrap Yard |
| straw | feed, mulch, paper, Scrap Yard |
| pulp | feed, mulch, sugar, Scrap Yard |
| gravel | cement, concrete, road (new use), Scrap Yard |
| slag | slag crusher, cement, Scrap Yard |
| sand | glass, concrete, brickworks, Scrap Yard |
| husks | feed, pellets |
| fish scraps | fish meal, feed |
| feathers | pillows (new), Scrap Yard |

## What I still need from Chris
1. Fishing: a harbor plus boats that fish by themselves (my proposal above), or boats the player routes by hand?
2. Scrap and Recycling Yard: OK as the by-product safety net?
3. Say GO and I build in three steps: (1) by-product balance and scrap yard, (2) new farms, water, ingredients, factories and the three lists, (3) fishing. Each steps passes the balance test before it ships.
