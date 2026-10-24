# Supplyline — Feature Map

> A browser-based logistics and production game on a 3D globe. Build production sites, lay the roads between them, move goods, combine them into more valuable goods, and grow towns into an empire. Also a learning project: Chris's first real game dev, built with tools he already knows.

Updated October 11, 2026 (v2). The first version of this document described a flat 2D map. The direction changed after the 2D prototype: the play space is now a 3D globe with real terrain, towns that grow, and a push/pull logistics system. What changed is called out in the project log.

---

## The Idea

Railroads Online has great route building but a thin economy. Farming Sim has deep production, but logistics is an afterthought. Satisfactory has a satisfying unlock ladder. City Skylines has towns that grow. Supplyline combines them.

**Core loop:** extract, process, haul, sell to towns, grow the towns, unlock more, repeat.

**Differentiator:** production chains with Farming Sim depth, connected by roads you build across real terrain, feeding towns that grow in response. Logistics is the game, not a side system.

**Look and feel:** adult and grounded, in the spirit of City Skylines, Satisfactory and Farming Simulator. Muted natural colours, real lighting and shadows, readable industrial buildings. Not cartoonish.

---

## Core Architecture Principle

**Separate the simulation from the rendering.** This is what made the move from 2D to 3D cheap.

- **Simulation:** plain TypeScript in `src/sim`, no graphics. Tracks every site, stockpile, vehicle, route, town and dollar. This is the actual game and it is covered by tests.
- **Renderer:** `src/r3d`, Three.js. Draws whatever the simulation says is true.
- **HUD:** `src/ui`, a transparent Phaser canvas on top of the 3D view. Menus, panels, labels and gauges are drawn on a canvas, not built from page markup.

---

## The World

- A **globe**: a 192 by 64 tile grid covering latitudes 60 degrees north to 60 south, wrapping east-west, with polar ice caps beyond it.
- **Terrain with height**: oceans, continents, grassland, forest, mountain ranges with snow caps. Generated from a seed, with controlled proportions (about 36 percent land, 5 to 8 percent of that mountain).
- **Named features**: oceans, seas, lakes, woods, mountain ranges, plains and ice caps, plus every town. All placeholder names, generated per seed.
- **Level ground only.** Buildings need flat tiles, towns sit on flattened plateaus, and quarries are dug into the foot of a mountain.
- **Mountains and water are obstacles.** Roads cross water as bridges and mountains as tunnels, at much higher cost and with a maximum length that grows with tier. Otherwise you go around: the route finder charges extra for steep ground and for hugging the foot of a mountain.
- **Roads shape the ground.** A road cuts into hillsides and builds up embankments so it runs level. Where it meets a mountain the real shape of the hill decides: low ground is cut through as open road, and the road only goes underground where the hill stands well above it, with a concrete tunnel mouth set into the slope at each end.
- **Resource nodes**: forests, farmland and quarries have specific build spots, each with a quality (impure, normal, pure) that changes output.

---

## Production and Logistics

**Goods:** logs, lumber, paper, grain, flour, stone.

**Chains:**
- Forestry camp makes logs. Sawmill turns logs into lumber. Paper mill turns logs into paper.
- Farm makes grain. Flour mill turns grain into flour.
- Quarry makes stone (sold to towns for now).

**Building levels:** every production and industry building upgrades to level 2 and 3, for faster output and more storage. Level 2 needs Tier 1, level 3 needs Tier 2.

**Push and pull.** Roads are just links. A vehicle loads whatever the far end needs and the near end has. Producers push their output, processors pull their inputs, towns pull what they want. A **Distribution Hub** stores goods, pulls the goods you tick from suppliers, and passes them on to anything that needs them. Goods flow from fuller hubs to emptier ones so they do not ping-pong.

**Vehicles** differ in capacity and speed:

Vehicles are a ladder, managed from the buildings they serve: select a building and its **Vehicles** list shows every route it is on, with a class picker and **Buy**, and **Trade up**, which swaps the smallest vehicle on that route for the next class and returns half of its price. There is no vehicle tab and no placing vehicles on roads.

| Vehicle | Carries | Needs | Status |
|---|---|---|---|
| Box truck | 8 | Roads | Built |
| Big box truck | 18 | Roads, Tier 1 | Built |
| Big rig | 40 | Roads, Tier 2 | Built |
| Truck fleet (convoy of rigs) | 110 | Roads, Tier 3 | Built |
| Freight train | 140 | Its own rail network, Tier 2 | Built |
| Heavy haul train | 360 | Rail, Tier 3 | Built |
| Cargo plane | 60 | Air routes between airports, Tier 3 | Built |
| Cargo jet | 220 | Air routes, Tier 4 | Built |

**Running costs.** Vehicles cost 5% of their price every minute, buildings 1% per level, districts 1.5% per level. The figure under the money is income after those costs. Money never goes below zero.

---

## Towns and Progression

Towns are why you build anything. Each town has a **Market** (everyday goods) and, once it grows, a **Freight Yard** (raw and bulk goods). Towns use up what you deliver, and a stocked dock pays less, so you spread deliveries around.

Deliveries earn growth. A town grows through five levels (Hamlet, Village, Town, City, Metropolis), and each level needs a wider variety of goods. Bigger towns want more, pay more, add buildings and eventually skyline towers.

World tier is unlocked by **quests**. Each tier has a short list; finishing all of it unlocks the next tier, and every quest pays a cash reward. The quest bar at the top of the screen shows the next one, and the Quests sheet (G) shows all four tiers, what each quest pays and what the next tier unlocks.

| Tier | Name | Quests to finish it | Finishing it unlocks |
|---|---|---|---|
| 0 | Startup | Build a Forestry Camp, build a Sawmill in a town, join them with a road, sell 100 lumber | Tier 1: highways, hub, big rig, coal, iron, cotton, sand, jam, feed, pellets, paper, yarn, bricks, stone blocks, building level 2, spans of 4 tiles |
| 1 | Regional Supplier | Sell 3 different goods, upgrade a building to level 2, build a hub, build a highway, build a district, trade up to a big box truck, grow a town to level 4 | Tier 2: rail and freight trains, cloth, clothes, furniture, books, cement, concrete, glass, ingots, tools, building level 3, spans of 8 tiles |
| 2 | Industrial Group | Lay a rail line, make 60 ingots, sell 60 tools, upgrade 2 buildings to level 3, specialise a town, upgrade 2 districts to level 2, run a big rig, grow 3 towns to level 4 | Tier 3: steel, slag crusher, machinery, spans of 16 tiles |
| 3 | Global Network | Make 100 steel, sell 40 machinery, grow a town to level 5, open an air route, build a capstone district, run a truck fleet, earn $250,000 | Tier 4: cargo jet |
| 4 | Legacy | Run 3 different specialisations, fly a cargo jet, grow 3 towns to level 5, build 3 capstones, earn $1,000,000 | The end game |

Quests are data in `src/sim/defs.ts` (the `TIERS` list) and progress is measured straight from the world, so a quest cannot fall out of step with what is really built. A test checks that no quest asks for something its tier has not unlocked.

A **How to play** guide (H, the ? button, or the menu) walks through the loop in twelve short cards. It opens by itself on a first visit.

---|---|---|
| 0 | Start | Box truck, forestry, farm, quarry, sawmill, flour mill |
| 1 | Deliver 100 lumber | Paper mill, distribution hub, big rig, level 2 buildings, longer bridges and tunnels |
| 2 | Grow a town to level 3 | Level 3 buildings (rail comes here, when built) |
| 3 | Grow 3 towns to level 4 | (air freight comes here, when built) |

---

## Districts and Specialisation (the town game)

The point of a town is that you keep building it up. A town starts as a hamlet with a Market, and the player grows it through **districts**: things the town builds and levels, shown in 3D as landmarks on the tiles around its streets (stalls, a hotel tower, a builders' yard with a crane, a university).

- **Manage town** (select a town, then the button; or the Towns sheet) lists every district, its level, what it lives on, what it earns and what the next level costs.
- A district lives on certain goods. They pay more in that town, the district earns money while the town's docks hold them, and some districts add goods the Market or Freight Yard asks for.
- Each district level needs the town one level higher. Districts open at different town levels, so growing the town keeps unlocking things to level.
- Special effects: Warehouse District (docks hold more), University (growth), Hotels and Plaza (visitors pay by variety delivered).

**Specialisation paths.** A Town (level 3) commits permanently to one path for $3,000: **Breadbasket** (food), **The Forge** (metal and building goods), **Trade Hub** (everything pays a little more, bigger loads, more storage) or **The Boulevard** (fine goods and visitors). A path raises the price of its goods, speeds up the right factories in that town, makes on-theme districts 50% stronger, and opens exclusive districts. A Metropolis on a path can build its **capstone**: Grand Food Hall, Heavy Industry Exchange, International Terminal or Grand Plaza. Different towns can take different paths, which is the replay value: a different mix each game.

Rules live in `src/sim/town.ts`, data in `src/sim/defs.ts` (`DISTRICTS`, `PATHS`), landmarks in `src/r3d/districts.ts`, and the screen in `src/ui/sheets.ts`.

---

## The Bank (done, 90%)

Click the money at the top left. Loans (limit grows with tier and earnings, 1% interest a minute added to what you owe), a savings account (0.4% a minute), and a market fund whose price rises and falls (2% fee to sell). Opens at Tier 1; key B. Buying cash with real money is shown as closed (0%): it needs a payment service and a server.

## Districts as buildings (done, 100%)

Each district stands on its own lot beside a street with a door facing it, and trucks deliver the goods it lives on. It uses them up, and its income follows its stock. Factories and hubs joined to it sell to it by default. New: Community Centre, Amphitheatre, Stadium. A town with no free lot says so.

## Towns and Cities as Strips (done, 100%)

Towns run along a main street toward their neighbours with side lanes, lots and homes, and grow longer with each level, with a growth animation and a camera that returns to where you were. Builds and upgrades play a scaffold, crane and lorry animation from two camera angles; demolished buildings fold into the ground and sold trucks shrink away.

## Opening Screen (done, 100%)

A cinematic flythrough of a working base with the logo, captions, Continue and New game.

## Roads and Rails

Drag from one site to another: the game finds the cheapest buildable route (bridges and tunnels only where they are cheaper and within the tier limit) and draws it with rounded corners. A box truck comes with it.

**Highways** (Tier 1) are four lanes wide and about a third faster. Where a highway runs on as a street it narrows into it.

**Joined networks (done).** Roads are laid in 5-tile stretches so one can be deleted alone. Anything connected by road, highway or street is joined automatically, and automatic roads avoid resource spots and join the nearest road. Trucks on a removed road drive home.

**Rail Yard (done).** A placeable at a town's edge (Tier 2): trucks bring goods in, trains run yard to yard. Airports and yards need flat open ground with a way in.

**Rail** is a separate network with its own track, drawn the same way, and a freight train comes with it. Trains serve sites out of town, hubs, factories on a town's outer lots, and each town's **Rail Station**. From Tier 2 every town has a station on a corner of its built-up square. It stores up to 240 of each good the town wants and sells them on to the Market and Freight Yard as they have room (topping them up to 60% so prices hold). Pointing the rail tool at a Market or Freight Yard snaps to the station. Only trains can use it.

---

## Yards, Goods and Placement (0.70 to 0.98)

- **Supply Yard:** building materials only, stored for the town's builds, pays nothing. Trucks are bought on its Trucks tab.
- **Distribution Warehouse:** finished goods for other towns. **Market:** finished goods and fresh food. Towns start closed and are built from lumber.
- **Goods:** about 45 new goods and 38 new sites, mixed recipes (farm, kitchen, brewery chains), water as a trucked good, by-products with two or more outlets, Recycling Yard and Garden Supply as the safety net.
- **Fishing Harbor:** coastal; self-working fishing boats raise the catch; trucks carry fish.
- **Placement:** anything without a resource node goes on open ground or a town plot; green zone shown for every build tool; nothing on roads.
- **Models:** a different model at each building level and each town growth level.
- **Drivers and trucks:** hired drivers, move a driver between trucks, no upgrade buttons (buy the bigger class), level-up checklist panel, Mechanic Shop.
- **Speed:** fog of war hides and sleeps things far from the view; graphics levels set how far.
- **Windows app:** 1920x1080, scrolling build tray, 16 new radio stations.

## Phases

**Done so far:** the 3D globe with terrain, towns, resource nodes, push/pull logistics, hubs, two road vehicle classes, bridges and tunnels, building levels, demolish, save and load, HUD with categories, hover cards and panels.

**World.** Map 1 is 124 rows with small polar caps. Graphics: sky and light, ambient occlusion done (about 40% of the overhaul); ground, trees, buildings, water to come. Sea transport: not started.

**Next:**
- More train types, and loading goods onto trains at a station
- More plane types, and airports with their own storage upgrades
- Real economy balancing (prices, speeds, costs)
- More chains and goods, so higher-level towns have more to want
- Events: demand spikes, price changes
- Better art: real textures and models, water motion, clouds, day and night

---

## Tools

| Need | Tool | Why |
|---|---|---|
| Language and build | TypeScript + Vite | No change from Chris's web apps |
| Local dev | localhost:3000 | Always |
| 3D rendering | Three.js | The globe, terrain, models, lighting and shadows |
| HUD | Phaser | A canvas overlay for menus, panels and labels |
| Saves | Browser local storage | Single-player, no backend needed |
| Deploy | Vercel | Static build |
| Version control | Git + GitHub | Always |

No backend, no AI, no accounts.

---

## Things Considered and Set Aside

| Idea | Why It Was Set Aside |
|---|---|
| Flat continuous map | Replaced by the globe |
| Godot | Brings its own editor and language, too many new things at once |
| Truck pathfinding on road networks | Player-drawn routes avoid the hardest technical problem. A path helper exists for demos and a possible one-click road tool |
| Backend / accounts | Nothing for them to do in a single-player game |
| Standalone Market building | Markets are part of towns now |

---

## Desktop Version (planned, Phase 7)

The same game as a downloadable Windows app, with the browser version kept. Full plan, graphics ceiling and wish list: [05-desktop-version.md](05-desktop-version.md); checklist in the tracker's Phase 7.

- Ground rules first: every building gets a max truck count that grows with its level (2 / 4 / 6 slots, one pool per product so lumber and sawdust are separate; at an airport a plane takes 2 slots; levels 1 to 3 add trucks, level 4 unlocks bigger trucks); resource nodes sit in the outskirts, away from towns and their growth room; a much bigger map streamed in chunks
- Electron shell, saves as files, auto-updater on GitHub Releases, Steam later
- All-in-one: updates, autosave and backups, settings, crash reports, repair button
- Graphics: WebGPU, bloom and ambient occlusion, day and night, weather, animated textured models
- Tools: map editor, photo mode, time-lapse, blueprints, mods
- Depth: campaign, AI rivals, tech tree, seasons
- Online later: daily challenge, shared maps, co-op

---

## Ideas in the Backlog

- A one-click auto-road tool using the existing path finder
- Seasons and weather (now part of Phase 7)
- Contracts from towns (deliver X by a date for a bonus)
- Multiplayer or shared maps (now part of Phase 7)
- Other renderers or art styles (WebGPU and real art are in Phase 7)

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed
