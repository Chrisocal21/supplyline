# SUPPLYLINE: DESIGN BRIEF (paste this whole file into Claude.ai)

Version of the game this describes: **0.53** (written 2026-10-18), with the corrections in section 0A for **0.107** (2026-10-24). Where section 0A and the text below disagree, section 0A is right.
Everything below was read from the game's real code, not from memory. If this file and an idea in your head disagree, **this file is what the game does today.**

---

## 0A. CHANGES SINCE 0.53 (this overrides anything below that disagrees)

- **Start:** $6,000 (not $1,500). Running costs are lower: vehicles 1.5% of price a minute, buildings 0.5% a level, districts 1%. Driver wages $1, 1, 2, 3, 4 a minute by rank. Towns pay the full list price.
- **Supply Yard** (every town, built from lumber): holds **building materials only** (lumber, stone, bricks, blocks, sand, gravel, granite, cement, concrete, glass, steel, tools) for the town's builds and **pays nothing**. Its own trucks (bought on its Trucks tab) carry them to the Market site. **Distribution Warehouse** (the hub): finished goods for other towns. **Market**: finished goods and fresh food, and every by-product at 60% of its price (salvage: money only, no town growth).
- **Closed towns:** every town starts closed (Supply Yard 80 lumber, then Market 120 lumber) and opens as the player delivers lumber; building them pays nothing.
- **Goods and sites:** about 45 more goods and 38 more sites (crops, animals, water, salt, spices, cocoa, fish, kitchens, brewery, winery, distillery, and more). Recipes mix several inputs. The Recycling Yard and each building's own scrap sale (by-products above half a shelf sell for 25% of price) keep any by-product from jamming a line. See 08-goods-and-sites-draft.md.
- **Buildings open in four steps** (tier 0: forestry, farm, ranch, orchard, quarry, sawmill, mill, bakery, dairy, wood yard; tier 1, 2, 3 add the rest). A building never opens before there is a buyer for what it makes (flows test).
- **Nodes:** forest, quarry, mine, coal, clay, oil, coffee and mango are permanent spots: the site that works one must stand on it, and nothing else can. Farmland, pasture and orchard are no longer places on the map: a farm, ranch or orchard brings its own fields and can go on any open ground or town plot, as can every factory, warehouse, Sand Pit, Water Pump and Salt Pan. Open ground is shown green when placing.
- **Vehicles:** no upgrade or trade-up buttons. Buy the bigger class and move the driver into it (the old truck waits for a new driver). Quests say "Buy". An idle vehicle (barely moved for a minute) costs less, the Fleet sheet has a button to sell the idle surplus, and a building with idle trucks is not told to build more.
- **Selling:** a truck set to best price, best earnings, highest demand or closest counts trucks already on the way and the fuel for the round trip, and changes buyer only when the new one is clearly better.
- **Mechanics:** like drivers. Hired at a Mechanic Shop from three applicants who change every few minutes (rank from repairs done: Apprentice, Mechanic, Skilled, Master, Chief), paid a wage, up to the shop level plus one per shop. A worn truck queues for the mechanic free soonest; higher ranks repair faster, cheaper and past new. No shop or no mechanic: the driver patches the truck at the roadside after about four minutes, for 1.5 times a service, to 35% wear. There is no mechanic training any more.
- **Towns:** level 1 to 2 needs lumber only (250); later levels add the style's own materials in smaller amounts (see LEVEL_MATERIALS in defs.ts). Towns on Maps 1 and 2 with no clay or quarry within 30 tiles get one nearer.
- **Yards:** a building holds 4 vehicles at level 1 and 2 more per level, across all lines (22 at level 10).
- **Map 3** (The Meridian Sea, 768 by 256) exists and is listed in the world menu as in progress, view only. Maps 1 and 2 are unchanged.
- **Markets** use up about 50% more of each good a minute.
- **Fishing Harbor:** coastal; its boats circle offshore and raise the catch; trucks carry the fish.
- **Speed:** fog of war hides and stops working on buildings, towns and vehicles far from the view; graphics levels set how far.
- **Windows app:** opens at 1920 by 1080; the build menu spreads across the window and scrolls.
- **Quests:** Tier 1 has 18 quests that walk through the whole early game (see the 0.123 log entry); reaching Tier 2 is the end of the demo.
- **Testing:** `playBot(seed, ticks, onNote, 'skilled')` plays a careful game (one home town, trucks serviced, cash in reserve) and is the measure for balance; PACING=1 npx vitest run src/sim/pacing.test.ts prints its pace.

---

## 0. READ THIS FIRST (instructions for Claude)

**Who you are talking to:** Chris, the solo developer. He has ADHD. He wants short, clear, one-step-at-a-time conversation. No coding in this chat. This is a design conversation about the game's logic, balance and direction. Decisions made here get carried back into the code later by another tool.

**Rules for you:**
1. **Do not assume anything about the game.** If something is not in this file, say "that is not in the brief" and ask. Never invent a mechanic, number or feature.
2. **One question at a time.** Ask it, wait for the answer, then move on. Never dump a list of questions.
3. **Keep replies short.** Headings, short bullets, bold the key word. No walls of text. If an answer needs depth, give a 3-line summary first, then offer "want the detail?".
4. **Offer choices as A / B / C** with a one-line consequence each, and say which you would pick and why. Chris can answer with a letter or a few words.
5. **When Chris answers, write it back in one line** ("Decision: ...") so it can be copied into the Decision Log (section 17).
6. **Flag guesses.** Every number in this file marked `[GUESS]` has never been tested by a human. Challenge those.
7. **Say when something is a trade-off,** not a right answer.
8. **Never write code.** If code would help, describe the rule in plain words instead.
9. Chris uses this to decide, so end sessions with a **short list of decisions made** and **questions still open**.

**Status tags used below:**
- `[BUILT]` works in the game today
- `[PARTIAL]` exists but incomplete or unproven
- `[NOT BUILT]` only an idea
- `[GUESS]` a number picked without human testing
- `[DECIDED]` Chris already chose this

**How to start:** ask Chris which part of section 16 (Open Questions) he wants to work on, or go in order starting at **Batch A**.

---

## 1. THE GAME IN ONE PAGE

- **Name:** Supplyline. Studio name in the app: Probably Fine Studios.
- **Genre:** logistics and production tycoon on a 3D globe. You build production sites, connect them with roads, rails, planes and ships, make goods, and sell them to towns that grow because of what you deliver.
- **Inspirations (Chris's "north stars"):** Farming Simulator (production plots and seasons), American Truck Simulator (vehicles, drivers, wear), Satisfactory and Star Rupture (production chains and an unlock ladder), City Skylines (growing towns), Railroads Online (route building).
- **Core loop:** extract raw goods, process them into more valuable goods, haul them, sell to towns, towns grow and want more kinds of goods, unlock more, repeat.
- **Look:** adult and grounded, muted natural colours, real lighting. Not cartoonish. Console / PC-game feel.
- **No end boss.** Tier quests lead to an end goal (earn $1,000,000) but nothing stops you playing on. `[DECIDED]`
- **Single player. No multiplayer. No backend server.** Saves live on the player's machine.
- **Where it runs:** in a web browser (Vercel) and as a Windows desktop app (Electron) with auto-update. Both are the same code.
- **Tech (just so you know what is cheap or hard):** TypeScript, Three.js for the 3D world, Phaser for the on-screen menus (drawn on a canvas, no web page markup), Vite, tests with vitest. The rules of the game ("the sim") are separate from how it looks, so changing the look never changes the rules.

---

## 2. HOW A PLAYER EXPERIENCES IT

1. **Title screen:** slideshow of real screenshots, buttons Continue / New Game. Radio can play.
2. **New game:** pick a hand-made map (Map 1 or Map 2). Start with **$6,000**, tier 0.
3. **Quest bar** at the top always shows the next step with a hint. The first tier teaches: build a Forestry Camp, buy a truck, build a Sawmill in a town, join them with a road, switch the sawmill on, sell lumber to the Market, sell 100 lumber.
4. **Build tray** at the bottom: tabs Production, Processing, Manufacturing, Heavy Industry, Districts, Logistics. Pick a card, click the world.
5. **Click a building** to open its panel: switch products on, pick who it **sells to**, buy and manage vehicles, upgrade it.
6. **Menu** (top right) opens folders: Run your business (Company, Production, Fleet, Towns, Bank, Quests), Game (How to play, Save/Load, New world), Sound (radio, sound effects), Display (Graphics, Minimap, Frame rate), Keybinds.
7. **Speed:** pause, 1x, 2x, 4x. **Autosave** and a visible "SAVED" note. A **calendar** on the world map shows month, year, season.

---

## 3. THE WORLD

- **A globe.** The grid wraps east to west. Poles are ice. `[BUILT]`
- **Two hand-made maps** `[BUILT]`:
  - **Map 1: The Known World**, 288 x 124 tiles. Continents, islands, seas. Coffee, mango and oil islands to ship from.
  - **Map 2: The Continental**, 384 x 128 tiles. About 46% water, four continents, island chains, mountain ranges, a river system, lakes, about 55 towns.
  - Random worlds exist in code for testing only. Players cannot pick them.
- **Terrain:** water, grass, forest, mountain, ice. Real heights. Buildings need flat ground.
- **Mountains and water are obstacles.** Roads cross water as bridges and mountains as tunnels, costing much more, with a maximum span that grows with tier (2, 4, 8, 16 tiles). Otherwise routes go around.
- **Roads shape the ground** (cut and fill). Tunnels only where the hill stands well above the road.
- **Resource nodes:** forest, farmland, quarry, iron mine, coal seam, clay, pasture, orchard, and island-only coffee, mango, oil. Each node has a quality: Impure (x0.6), Normal (x1), Pure (x1.5).
- **Land plots:** the ground is a patchwork of plots you **buy before building** (new games). Ground a town has set aside cannot be bought. Plots are bought, never sold. `[BUILT]`
- **Canals:** sea routes can dig a canal across a short strip of land (cost per tile 60, max 40 tiles of land). The canal is a rule only; it is **not carved into the 3D terrain visually**. `[PARTIAL]`
- **Seasons and weather:** seasons yes (section 12). Rain, fog and weather effects: `[NOT BUILT]`.

---

## 4. GOODS (45 of them)

**Raw (10):** logs, grain, cotton, stone, iron ore, coal, clay, sand, milk, fruit.
**Island-only raw (3):** coffee, mango, crude oil. Only grow on distant islands, so they must come by ship (or plane).
**Materials (12):** lumber, flour, paper, bricks, stone blocks, iron ingots, steel, cement, concrete, glass, yarn, cloth.
**Products (10):** bread, cheese, jam, clothes, furniture, books, pellets, feed, tools, machinery.
**By-products (5):** sawdust, bran, whey, gravel, slag. Sell cheaply, or feed other recipes.

Base price examples (before the 65% sale multiplier): grain 2, logs 3, stone 5, ore 7, lumber 11, flour 9, bread 13, paper 26, ingots 34, tools 60, clothes 85, steel 90, machinery 330, coffee 16, oil 11.

**Oil is a raw good only.** Nothing refines it yet. `[NOT BUILT]` (it only feeds the Heating Depot district).

---

## 5. BUILDINGS

Tiers unlock buildings. Cost is the level 1 price. Processing buildings sit **inside towns on for-sale lots**. Producers sit on resource nodes in the countryside (forest, quarry, mine, coal, clay, oil, coffee, mango) or, for farms, ranches, orchards and the like, on any open ground.

### Producers (on nodes) `[BUILT]`
| Building | Makes | Also | Tier | Cost |
|---|---|---|---|---|
| Forestry Camp | logs | sawdust | 0 | 80 |
| Farm | grain | bran | 0 | 90 |
| Clay Pit | clay | sand | 0 | 110 |
| Dairy Ranch | milk | whey | 0 | 130 |
| Orchard | fruit | sawdust | 0 | 120 |
| Quarry | stone | gravel | 0 | 160 |
| Cotton Farm | cotton | bran | 1 | 150 |
| Coal Mine | coal | stone | 1 | 200 |
| Iron Mine | iron ore | stone | 1 | 220 |
| Sand Pit | sand | gravel | 1 | 140 |
| Mango Grove | mango | fruit | 2 | 320 |
| Coffee Plantation | coffee | bran | 2 | 420 |
| Oil Well | oil | sand | 2 | 900 |

From tier 1 on, raw sites run about 1.5x slower so trucks and roads, not the ground, set your income. `[GUESS]`

### Processors (in towns) `[BUILT]`
| Building | In | Out | Tier |
|---|---|---|---|
| Sawmill | 2 logs | 1 lumber + 1 sawdust | 0 |
| Flour Mill | 2 grain | 1 flour + 1 bran | 0 |
| Bakery | 1 flour | 2 bread | 0 |
| Dairy | 2 milk | 1 cheese + 1 whey | 0 |
| Jam Factory | 2 fruit | 2 jam | 1 |
| Feed Mill | 2 bran + 1 whey | 2 feed | 1 |
| Pellet Mill | 3 sawdust | 1 pellets | 1 |
| Paper Mill | 3 logs | 1 paper | 1 |
| Spinning Mill | 2 cotton | 1 yarn | 1 |
| Brickworks | 2 clay | 1 bricks | 1 |
| Stonecutter | 2 stone | 1 blocks + 1 gravel | 1 |
| Weavery | 2 yarn | 1 cloth | 2 |
| Garment Factory | 2 cloth | 1 clothes | 2 |
| Furniture Workshop | 2 lumber | 1 furniture | 2 |
| Printery | 2 paper | 1 books | 2 |
| Cement Works | 2 gravel + 1 coal | 1 cement | 2 |
| Concrete Plant | 1 cement + 1 sand | 2 concrete | 2 |
| Glassworks | 2 sand + 1 coal | 1 glass | 2 |
| Smelter | 2 ore + 1 coal | 1 ingots + 1 slag | 2 |
| Toolworks | 1 ingots + 1 lumber | 1 tools | 2 |
| Steelworks | 2 ingots + 1 coal | 1 steel + 1 slag | 3 |
| Slag Crusher | 1 slag | 1 gravel + 1 sand | 3 |
| Machine Works | 2 steel + 1 tools | 1 machinery | 3 (top of the chain) |

### Logistics buildings `[BUILT]`
| Building | What it does | Tier | Cost |
|---|---|---|---|
| Warehouse | Stores goods. Holds overflow when buyers are full; factories next to it draw inputs from it. | 1 | 300 |
| Rail Yard | Edge-of-town terminal where trains load and unload. | 2 | 3,000 |
| Port | Coastal terminal for ships. | 2 | 4,000 |
| Airport | 3x3 air cargo terminal. | 3 | 2,500 |

Towns also have **Market** (everyday goods), **Supply Yard** (building materials only, built from lumber; see section 0A) and **Rail Station**. The player never places these; towns make them.

### Building levels (1 to 10) `[BUILT]`
- Speed multiplier by level: 1, 1.8, 3.2, 4.6, 6.2, 8, 10, 12.5, 15.5, 19.
- Storage multiplier by level: 1, 2, 4, 6, 9, 13, 18, 24, 32, 42.
- **Gate:** going from level N to N+1 needs company tier N (level 2 needs tier 1, level 3 needs tier 2, level 4 needs tier 3), and from level 4 upward it stays at **tier 4**. Levels 7, 8, 9, 10 also need **lifetime earnings** of $150k, $400k, $800k, $1.5M. An airport also needs its nearest town to be big enough.
- Upgrade cost = base cost x 1.2 x level^1.25. `[GUESS]`
- Ports and airports stop at level 3.
- Each level has its own 3D model.
- **Fleet limit per building line:** 3 + 2 per level.
- **Running cost:** 1% of the building's cost per level, per minute.

---

## 6. VEHICLES

Vehicles belong to a **home building**. Managed from that building's panel (buy, sell, move a driver). No vehicle tab, no placing vehicles on the map by hand.

| Vehicle | Mode | Carries | Cost | Tier | Needs building level |
|---|---|---|---|---|---|
| Box Truck | road | 12 | 120 | 0 | 1 |
| Big Box Truck | road | 27 | 380 | 1 | 2 |
| Big Rig | road | 60 | 950 | 2 | 3 |
| Truck Fleet (convoy) | road | 165 | 3,200 | 3 | 4 |
| Freight Train | rail | 140 | 1,800 | 2 | 1 |
| Heavy Haul Train | rail | 360 | 5,200 | 3 | 3 |
| Cargo Plane | air | 60 | 7,000 | 3 | 1 |
| Cargo Jet | air | 220 | 22,000 | 4 | 3 |
| River Barge | sea | 24 | 900 | 2 | 1 |
| Cargo Boat | sea | 50 | 2,500 | 2 | 1 |
| Freighter | sea | 160 | 9,000 | 3 | 2 |
| Container Ship | sea | 520 | 28,000 | 4 | 3 |

- **Trade up is gone** (0.89): buy the bigger class and move the driver into it. Selling a vehicle returns part of its price.
- Road vehicles get a **body by cargo**: flatbed (logs, lumber, stone, steel...), open-top (grain, coal, ore...), tanker (milk, oil, cement...), box (everything else). Cosmetic and naming only.
- **Ships** have a draft: barges sail rivers and lakes, boats need a wide channel, freighters and container ships need open sea.
- **Highways** cost x2.4 per tile and trucks cover them in 65% of the time. Unlock tier 1.
- **Rails** cost x1.8 per tile, tier 2, cross roads at level crossings. Air routes tier 3 (4 per tile). Sea routes tier 2 (3 per tile).
- **Running cost:** 4% of a vehicle's price per minute. `[GUESS]` (the older doc says 5%; the code says 4%).

### Drivers, wear, service `[BUILT]`
- Every vehicle has a named driver (random names; you can rename).
- **Driver rank** from trips made: Rookie, Regular (6 trips), Experienced (20), Veteran (45), Ace (90). Each rank above the first makes the vehicle **4% faster**.
- **Wear:** a vehicle is fully worn after 4,000 tiles driven. Fully worn means **12% slower**. **Service** puts it back to new for up to 12% of its price (scales with wear). Vehicles show dirt and darker exhaust smoke as they wear.
- **Not built:** driver traits, wages, breakdowns, fatigue. `[NOT BUILT]`

---

## 7. LOGISTICS LOGIC (how goods actually move)

This is the heart of the game. Read carefully.

- **Roads are just links.** A road does not carry goods. Vehicles do.
- **Push and pull:**
  - A **producer pushes** what it makes.
  - A **processor pulls** its inputs.
  - A **town dock pulls** what it wants.
  - A vehicle loads whatever the far end needs and the near end has.
- **Sell to:** every building has a **Sell to** list of possible buyers. The player switches buyers on or off. Nothing is sent to a buyer that is off. A quest teaches this.
- **Lines:** a building can have a **main line** and a **by-product line** (e.g. lumber vs sawdust), each with its own vehicles and slots.
- **Pick mode** per vehicle: spread out, highest demand, best price, closest, best earnings.
- **Partial deliveries:** a buyer only takes what it has room for; leftovers stay on the truck and it tries the next best buyer.
- **Warehouse / hubs:** store goods, pull the goods you tick from suppliers, pass goods on. Modes: overflow only, or all. Goods flow from fuller hubs to emptier ones so they do not ping-pong.
- **Auto-buy:** a building can ask to buy another truck when a line is nearly full. **The player confirms each purchase.** Max 6 per line. Declined offers go quiet for 3 minutes.
- **Stuck detection:** the HUD lists "stuck" and "waiting on supply" buildings and tap-to-fix.
- **Supply plan:** a planner in the Production sheet shows what each building needs.
- **Rail:** separate network from roads. Trains join sites directly or yards. Today a train **cannot reach town centres**, only a Rail Yard or an outer-lot factory.
- **Efficiency and bottlenecks:** the game measures what each building is limited by (no input, no truck, buyers full).

---

## 8. MONEY AND ECONOMY

- **Start:** $6,000 (was $1,500). **Money never goes below zero.** There is no bankruptcy and no failure state. `[DECIDED so far]`
- **Selling price (per unit)** is, in words: base price x 0.65 x town taste x random event x path and district bonuses x a bonus for town level (+12% per level above 1) x a **saturation factor** x your Haggler perk.
  - **Saturation:** if the dock is already full of that good it pays down to 40% of normal; if it is empty it pays up to 130%. So you must **spread deliveries**.
- **Events:** about every 1 minute at 1x there is a 65% chance a random good gets either a **surge (+60%)** or a **slump (-35%)** for 3 minutes. Max 2 at once.
- **Town taste:** each town style pays extra for some goods (Nordic: pellets, clothes, cheese; Temperate: bread, books, furniture; Mediterranean: cheese, jam, glass, bread; Tropical: jam, lumber, cloth, concrete; Desert: glass, lumber, feed, bricks).
- **Running costs per minute:** buildings 1% of cost per level, vehicles 4% of price, districts 1.5% per level. The figure shown under your money is income after these.
- **District income:** each built district earns $/min if its goods are in stock (see section 9).
- **Bank** `[BUILT]` (opens tier 1): loans at 1% interest per game minute, a savings account at 0.4% per minute, and a **market fund** with a fluctuating price (2% fee on selling). It has a chart and profit tracking.
- **Company skills** `[BUILT]`: points = 1 per tier reached + 1 per 3 quests done. Three perks, 3 levels each, 1 point per level: **Haggler** (+4% sales per level), **Thrifty fleet** (-15% vehicle upkeep per level), **Tough parts** (-20% wear per level).
- **Premium currency / real money:** idea only, not designed. `[NOT BUILT]`

---

## 9. TOWNS

### Levels `[BUILT]`
Hamlet (pop 60) -> Village (400) -> Town (2,200) -> City (11,000) -> Metropolis (60,000). Growth points needed: 2,000 / 8,000 / 20,000 / 80,000.
- Delivering goods earns growth equal to **units x base price**.
- **A town does not grow by itself.** When it has the growth points **and** has been sold enough different kinds of goods (kinds >= its current level), the player is told and presses Grow.
- Higher level means: a wider list of goods bought, a +12% price bonus per level, more storage, more building lots, new districts, and skyline buildings.
- **Joined towns:** two towns that touch form a metro pair. Once both are level 3+, they sell slightly better, and the smaller catches up faster.

### What towns want
- **Market** buys everyday goods; the list grows by level (level 1: flour, bread, lumber, cheese; level 5 adds machinery, etc.).
- **Supply Yard**: only building materials (section 0A); it pays nothing. Raw goods and by-products go to Markets and factories.

### Specialisation paths `[BUILT]`
At level 3 a town can commit to a path for **$3,000**. It is permanent.
| Path | Edge |
|---|---|
| Breadbasket | Food +25% price, mills/bakeries/dairies 30% faster, food districts 50% stronger |
| The Forge | Metal and building goods +25%, smelters/steelworks/brickworks etc. 30% faster, construction districts 50% stronger |
| Trade Hub | Everything +8%, vehicles load 30% more, docks hold 50% more |
| The Boulevard | Fine goods +25%, weaveries/tailors/workshops 30% faster, visitors spend 50% more |
Each path has a 4-quest ladder (grow a town to level 4, sell X goods, build 3 districts, build the capstone). Finishing it makes the path **mastered**: +10% on its goods.

### Districts (25) `[BUILT]`
Buildings the player places on a **free lot beside a street** (or a sports ground kept for it). They raise prices on goods they "live on", earn income per minute if stocked, and ask the town docks for extra goods. Three levels each. Each level needs the town to be one level higher.
- Everyday: Farmers Market, Restaurant Row, Heating Depot, Coffee House, Hardware Store, Warehouse District (storage), Community Centre.
- Mid: Builders' Yard, Furniture Gallery, Fashion Quarter, Library and Bookshops, Freight Terminal, Amphitheatre, Beach Resort and Hotels (visitors scale with the variety of goods the town was sold), University (town grows faster).
- Sports (town level 4): Football Stadium, Baseball Park, Soccer Stadium, Hockey Arena. Each gets its own campus ground; football, soccer, hockey are the same size, baseball is 75% scale.
- Path-only: Foundry Row (Forge).
- **Capstones** (one per town, level 5 Metropolis, on a path): Grand Food Hall, Heavy Industry Exchange, International Terminal, Grand Plaza. `[BUILT]`
- Each district looks different at levels 1, 2, 3 and dresses itself for hills, water or woods.
- **Revenue example:** a district earns `base $/min x level x (share of its goods in stock) x affinity bonus (x1.5 on a matching path)`.

---

## 10. PROGRESSION: TIERS AND QUESTS

Finish all quests of a tier to unlock the next. Quests pay cash. Progress is measured from the real world, so it cannot fall out of step.

| Tier | Name | What you do (short) | Rough reward total |
|---|---|---|---|
| 0 | Startup | Camp, truck, sawmill, road, switch on, sell, sell 100 lumber | $1,250 |
| 1 | Regional Supplier | 3 kinds of goods, upgrade to level 2, Warehouse, highway, a district, Big Box Truck, a level 4 town | $4,300 |
| 2 | Industrial Group | Rail Yard, Port, rail line, 60 ingots, sell 60 tools, 2 level-3 buildings, a path, 2 level-2 districts, Big Rig, 3 level-4 towns | $22,500 |
| 3 | Global Network | 100 steel, sell 40 machinery, a Metropolis, air route, capstone, sea route, Truck Fleet, earn $250,000 | $74,000 |
| 4 | Legacy (end game) | 3 different paths, Cargo Jet, 3 Metropolises, 3 capstones, earn $1,000,000 | $265,000 |

**Pacing (from a robot player, not a human):**
- Tier 1 reached after about **12.6 game minutes**.
- Tier 2 reached after about **46 game minutes**.
- The robot got **stuck on tier 2 "Sell 60 tools"** after 3 game hours. That is probably the robot's limit, not the game's, but nobody has checked. `[GUESS]`
- An earlier robot run estimated tier 3 at around 135 game minutes. `[GUESS]`
- **No human has measured whether this pacing feels right.**

Game time: 10 ticks per second. 1 game minute = 600 ticks = 60 real seconds at 1x speed.

---

## 11. THE SEA AND THE AIR `[BUILT]`
- **Sea:** ports on coasts, sea routes between ports over open water, canals may be dug through short land strips. Islands grow coffee, mangoes and oil you cannot get anywhere else.
- **Air:** airports, straight-line air routes, planes take 2 truck slots at an airport. `[DECIDED]`
- **Slot decision:** a bigger truck is still 1 slot. `[DECIDED]` Slots per building level: 2 / 4 / 6 at levels 1 to 3; each product line has its own slots. Higher levels: 8, 10, 12, 14, 16 were proposed, not confirmed. `[GUESS]`

---

## 12. SEASONS AND CALENDAR `[BUILT]`
- One year = 4 seasons x 2,400 ticks = **16 real minutes at 1x**. Each season is 3 months of 30 days. The game starts **1 June, year 1, in summer**.
- **Season effect (only on Farm, Cotton Farm, Orchard):** summer x1.0 (growing), autumn x1.4 (harvest), winter x0.6 (fallow), spring x0.85 (planting). Everything else ignores seasons.
- **Look:** the ground and leaves tint by season. Winter snow settles on high ground and toward the poles, tropics stay clear.
- **Not built:** southern-hemisphere seasons (opposite), weather, crop growth stages on fields, seasonal town demand, winter road slowdown. `[NOT BUILT]`

---

## 13. LOOK, SOUND AND INTERFACE

### Look `[BUILT]`
- All 3D models are **generated by code** (no hand-made model files). Ground textures are CC0 scans from Poly Haven.
- Presets: Low, Balanced, High, Ultra, plus Day / Dusk / Night lighting. The game can **lower quality by itself** if it runs under 24 fps for 7 seconds (can be switched off).
- Buildings have 10 levels with distinct models. Towns have housing styles per climate. Vehicles get dirty and smoke.
- Seasons tint the world. Day, dusk and night lighting with lit windows.
- Title screen is a slideshow of real in-game screenshots.

### Sound `[BUILT but not listened to by a human yet]`
- **Radio:** 11 generated stations (lofi, chill, ambient), switchable, on/off, volume. Made live in the browser, no audio files.
- **Sound effects:** engine, rail, ship and plane hum near where the camera looks; wind, birds by day, crickets by night, town murmur; sounds for click, build, money, warning.

### Interface `[BUILT]`
- Top bar: money and income per minute, quest bar, speed, Menu.
- Left: "stuck" and "waiting on supply" badges.
- Bottom: build tray with category tabs and key hints.
- Bottom right: **World Map** (flat map with towns, buildings, routes, camera box, Enlarge button), compass, speed, calendar.
- Sheets: Company, Production, Fleet, Towns, Bank, Quests, How to play, Save/Load.
- **Rule: everything is drawn on a canvas, no HTML markup, no emojis.** `[DECIDED]`
- Works on touch (tap, two-finger gestures) but desktop is the main target. Wide screens cap menu width.

---

## 14. PLATFORMS AND SHIPPING

- **Web:** Vercel auto-deploys every push to `main`. Game at `/play/`, marketing site at `/`.
- **Windows app:** Electron. Installer built by GitHub Actions when a version tag is pushed. **Auto-update**: the Menu shows "Check for update" and downloads in the background, then "Restart to update". Saves are written to disk often. Download button on the website follows the latest release.
- **Saves:** 5 slots plus autosave, export and import. Stored in the browser or app storage. No cloud saves. `[NOT BUILT]`
- **Steam:** goal, not started. Needs a one-time fee and a store page. **Code signing** (removes "unknown publisher" warning): not done, costs money.
- **WebGPU** renderer: planned, not started.
- **Every push is versioned** as 0.X (a number in the game, in the package, in the commit name).
- **Version history in short:** 0.46 build tray, vehicle dirt, seasons. 0.47 ten levels. 0.48 districts as buildables, soccer. 0.49 sound effects. 0.50 desktop update check. 0.51 calendar and snow fix. 0.52 title sky. 0.53 menu folders and map.

---

## 15. STATUS BOARD

**Built and working (as far as tests and screenshots show):** world and two maps, all production chains above, roads, highways, rail, sea and air routes, vehicles 12 classes, drivers and wear, towns 5 levels, paths, 25 districts, quests tiers 0-4 and path ladders, bank, skills, seasons and calendar, building levels 1-10 with models, land plots, radio and sound effects, Windows app with auto-update, saves.

**Tested by 295 automated tests**, but **tests prove rules work, not that the game is fun.**

**Never checked by a human:** audio quality, vehicle dirt close-up, how auto-quality behaves on a slow PC, the full desktop auto-update flow from an old version, whether pacing and prices feel right, whether any town gets stuck, old saves after layout changes.

**Not built:** carved canals in 3D, crop growth stages, livestock detail, driver traits and wages, vehicle breakdowns, weather, oil refining, power or water systems, pollution, multiplayer, cloud saves, more maps, mod support, WebGPU, Steam, code signing, southern seasons, level 4-10 looks for ports and airports, achievements, photo mode, tutorial beyond the quest hints, controller support.

**Known weak spots (honest list):**
1. Balance has been tuned by a robot, not a person.
2. Trains cannot reach town centres.
3. By-products and many goods have little demand, so some chains feel pointless.
4. Oil has no use beyond one district.
5. There is no way to fail or feel pressure.
6. 25 districts may be more than anyone uses.
7. Old saves may shift town layouts after the 0.48 campus change.

---

## 16. OPEN QUESTIONS (answer one at a time)

**How to answer:** reply with a letter, or a few words, or "skip". Claude: ask one question, wait, restate the decision in one line, then ask the next.

Each question shows: **Why it matters**, **A/B/C options**, and **a lean** (Claude's suggested pick if Chris has no opinion). Chris can overrule any lean.

### BATCH A: VISION (answer these first, they steer everything else)

**A1. Who is this for?**
Why: sets difficulty, tutorial depth and price.
- A. Relaxed builders who want a cozy, no-stress sandbox
- B. Optimisers who want numbers, efficiency and challenge
- C. Both, with a difficulty choice at game start
Lean: C.

**A2. How long should one session feel like?**
Why: decides save/quit design and how fast things unlock.
- A. 20 to 30 minutes
- B. 1 to 2 hours
- C. Long evenings, many hours
Lean: B.

**A3. What should the game cost?**
Why: shapes Steam plans, the premium-currency idea and how polished it must be.
- A. Free in the browser, paid on Steam
- B. Free everywhere, support with donations
- C. Paid everywhere
- D. Free with optional premium currency
Lean: A.

**A4. In one sentence, what is the feeling when it is going well?**
Why: every future feature gets checked against this.
(Free text.)

**A5. Is "relaxing" or "intense" closer to the target?**
Why: decides whether to add pressure (breakdowns, rivals, deadlines) or not.
- A. Relaxing, no punishment
- B. Gentle pressure
- C. Real risk of going broke
Lean: A or B.

### BATCH B: PACING AND GOALS

**B1. How many real hours should it take to reach the end of tier 4?**
Why: the pacing robot measures game minutes; this converts to a target. Today the robot says roughly 2 to 3 game hours to get through tier 3 `[GUESS]`.
- A. About 3 hours
- B. About 10 hours
- C. 20+ hours
Lean: B.

**B2. What should happen when the player earns $1,000,000 (the last quest)?**
Why: today nothing special.
- A. A "you win" screen, then keep playing
- B. Unlock a new challenge tier or scenario
- C. Nothing, it is a sandbox
Lean: A.

**B3. Should the player ever be able to fail?**
Why: money floors at zero now.
- A. Never
- B. Loans can go bad (bank seizes a building)
- C. Optional hard mode
Lean: C.

**B4. Are the first-tier quests too hand-holding, too thin, or fine?**
Why: ADHD-friendly onboarding is a priority.
(Free text.)

**B5. Do skill points and perks matter enough?** Only 3 perks today.
- A. Add more perks (name ideas)
- B. Leave it
- C. Remove perks
Lean: A.

### BATCH C: LOGISTICS

**C1. Should trains need stations as their own buildings?**
Why: today a train joins sites directly. Stations make rail feel different but add steps.
- A. Yes, a station building with storage
- B. No, keep direct joins
- C. Only at towns
Lean: C.

**C2. Should there be a one-click auto-road?**
Why: a path finder exists. It changes how much of the game is drawing routes.
- A. Yes, a button next to hand-drawn roads
- B. No, drawing routes is the game
Lean: A (with hand-drawing kept).

**C3. How many wagons on a train, and what does each cost?** (Proposed: freight train 4 to 8, heavy haul 8 to 16, capped by rail yard level.) `[GUESS]`
(Free text.)

**C4. How many slots does a train, ship or jet take at a terminal?** Plane = 2 is decided.
(Free text.)

**C5. Should vehicles break down?**
Why: today wear only slows them. Breakdowns add the ATS feel but also frustration.
- A. No
- B. Rare, and a service prevents it
- C. Common, service is a chore
Lean: B.

**C6. Driver traits and wages?** Today drivers only have a name and a rank.
- A. Add traits (fast, careful, thrifty) and a wage
- B. Keep as is
- C. Traits only, no wages
Lean: C.

**C7. Should traffic jams exist?** Roads have no capacity today.
- A. No
- B. Yes, busy roads slow vehicles (makes highways matter)
Lean: B, later.

### BATCH D: TOWNS AND ECONOMY

**D1. Does the saturation rule feel right?** A full dock pays 40%, an empty one 130%.
(Free text, or: too harsh / right / too soft.)

**D2. Can towns shrink or die?** Today they only grow.
- A. No
- B. Yes, if neglected
Lean: A.

**D3. Do districts feel useful, or is 25 too many?**
(Free text.)

**D4. Are there goods nobody wants?** (By-products, oil.) Should every good have a clear buyer?
- A. Yes, fix demand
- B. Some goods are deliberately cheap filler
Lean: A.

**D5. Random price events: keep, tune, or remove?**
- A. Keep as is (+60% or -35% for 3 minutes)
- B. Less frequent
- C. Add bigger story events (strike, storm, festival)
Lean: C.

**D6. Should towns have personalities beyond taste?** (e.g. a mayor with requests.)
- A. Yes, small requests from towns ("send 50 bread for a festival")
- B. No
Lean: A.

**D7. Are the four paths different enough to matter?** Nobody has played two paths.
(Free text.)

**D8. How should the cross-mode bonus work** (using rail, sea and air together pays more)? Decided that each mode gets its own edge; sizes are guesses.
(Free text.)

### BATCH E: PRODUCTION DEPTH

**E1. Crop growth stages on fields (Farming Sim feel)?**
- A. Yes, fields visibly plant, grow, harvest with the seasons
- B. No, keep simple
Lean: A.

**E2. Livestock and pasture: any extra logic?** (feed, breeding)
(Free text.)

**E3. Power, water or fuel needs (Satisfactory-style)?**
Why: big change to every factory.
- A. No
- B. Power only
- C. Power, water, fuel
Lean: A for now.

**E4. Oil refining and plastics: add them?**
- A. Yes, a new chain from oil
- B. No
Lean: A (oil has no job today).

**E5. Pollution or environment?**
- A. No
- B. Yes, towns dislike heavy industry nearby
Lean: A.

**E6. Should season effects be stronger or reach more buildings?** Today only farms, cotton, orchards.
(Free text.)

### BATCH F: MAPS AND WORLD

**F1. More hand-made maps, or generated maps again?**
- A. More hand-made
- B. Generated with a seed
- C. Both
Lean: C.

**F2. Should the world be bigger than 384 x 128?** (Needs streaming.)
- A. No, enough
- B. Yes, much bigger
Lean: A.

**F3. Carve canals into the terrain visually?**
Why: cosmetic and a bit of work; rules already exist.
- A. Yes
- B. Later
Lean: B.

**F4. Scenarios or a campaign?** (Fixed start, fixed goal.)
- A. Yes
- B. No, sandbox only
Lean: B for now.

**F5. Map editor or mods?**
- A. Yes, later
- B. No
Lean: A, later.

**F6. Southern hemisphere seasons: opposite to the north?**
- A. Yes, realistic
- B. No, simple
Lean: A.

### BATCH G: LOOK, SOUND, UI

**G1. Art direction: stay code-generated, or bring in real models?**
- A. Stay procedural
- B. Mix: procedural plus hand-picked or AI-assisted assets
- C. Full real assets
Lean: B.

**G2. Order of graphics work (pick top 2):**
- A. WebGPU renderer
- B. Lighting and post effects (bloom, depth of field, colour grading)
- C. Better building and vehicle models
- D. Weather (rain, fog, snow)
Lean: B and D (cheap and big).

**G3. UI: what bothers you most today?**
(Free text. This steers the next UI pass.)

**G4. Music: keep generated lofi radio, or commission or licence tracks?**
- A. Keep generated
- B. Add licensed or commissioned music
Lean: A for now.

**G5. ADHD and accessibility: what would help you play?** (Bigger text, colour-blind modes, reduce flashing, focus mode, clear next-step arrows.)
(Free text.)

**G6. Controller support?**
- A. Yes
- B. No
Lean: B for now.

### BATCH H: SHIPPING

**H1. When should Steam happen?**
- A. Soon, after balance
- B. After graphics upgrade
- C. Not planned
Lean: B.

**H2. Pay for code signing now?** (Removes "unknown publisher" warning on Windows.)
- A. Yes
- B. Wait until Steam
Lean: B.

**H3. Name and branding: keep "Supplyline" and "Probably Fine Studios"?**
(Free text.)

**H4. Crash reports and a "report a bug" button?**
- A. Yes, opt-in
- B. No
Lean: A.

**H5. Cloud saves?**
- A. Via Steam
- B. Own login
- C. No
Lean: A.

### BATCH I: HOW TO USE OTHER AI MODELS

**I1. What should the AI tools do for this project?** (pick any)
- A. Balance math and design review
- B. Write and refactor code
- C. Review screenshots and give art feedback
- D. Generate textures, icons, title art
- E. Write copy, tutorials, store text
- F. Test the game and report bugs

**I2. Who has the last word on a design decision?**
- A. Chris always
- B. Chris, after a second AI opinion on big changes
Lean: B.

---

## 17. DECISION LOG (fill this in as you go, then paste back into the coding tool)

Copy this block, fill it in, and bring it back.

```
DECISIONS (date: ____)
A1 =
A2 =
...

NEW IDEAS (not yet in the game)
-

THINGS CLAUDE WAS UNSURE ABOUT
-

NUMBERS TO CHANGE (name, old value, new value, reason)
-
```

---

## 18. PLAN FOR USING OTHER MODELS (GitHub Copilot Pro+)

Chris has Copilot Pro+, which lets him pick among several AI models in the chat model picker. **Check the names actually in the picker; they change often.** Rough match of job to type of model:

| Job | What to look for in a model |
|---|---|
| Balance numbers, economy design, finding logic holes | The strongest reasoning model available. Give it sections 5 to 10 of this file. |
| Big code changes across many files | A strong coding model with a large context window |
| Fast repetitive edits, renames, test writing | A cheaper, fast model |
| Reviewing screenshots of the game and giving art feedback | A model that accepts images |
| Making textures, icons, title art, concept images | An image generator, outside Copilot. Models that write code do not make good art. |
| Writing store text, tutorial lines | Any good writing model |

**Rules for using several models:**
1. **Give every model this same file first** so none of them assume.
2. **One job per chat.** Name the job at the top.
3. **Ask each to list its assumptions** before it starts.
4. **Bring results back** to the Decision Log, not straight into the game.
5. **Never let two models edit the same files at once.**
6. **Graphics help:** the biggest visible jump is lighting and post effects (cheap), then real art, then WebGPU (big engine job). See `docs/05-desktop-version.md` in the project for the full ladder.

---

## 19. GLOSSARY (plain words)

- **Tick:** the game's smallest time step. 10 per second.
- **Sim:** the rules of the game, separate from graphics.
- **Tier:** a company-wide unlock level (0 to 4), earned by finishing quests.
- **Level:** per building (1 to 10) or per town (1 to 5, Hamlet to Metropolis).
- **Dock:** a town's Market or Supply Yard: where it buys goods.
- **Lot:** a building plot beside a town street.
- **Node:** a spot on the map where a raw resource can be extracted.
- **Line:** a product stream from a building (main or by-product) with its own vehicles.
- **Sell to:** the list of buyers a building may send goods to.
- **Path:** a town's permanent specialisation (Breadbasket, Forge, Trade Hub, Boulevard).
- **Capstone:** the top district of a path, one per town.
- **Saturation:** a buyer paying less when it already holds a lot of that good.
- **Pacing robot:** an automated player used in tests to measure how fast tiers are reached.
