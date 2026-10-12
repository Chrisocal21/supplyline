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

| Vehicle | Carries | Needs | Status |
|---|---|---|---|
| Box truck | 8 | Roads | Built |
| Big rig | 36 | Roads, Tier 1 | Built |
| Freight train | 140 | Its own rail network, Tier 2 | Built |
| Cargo plane | 30 | Airports, Tier 3 | Designed, not built |

---

## Towns and Progression

Towns are why you build anything. Each town has a **Market** (everyday goods) and, once it grows, a **Freight Yard** (raw and bulk goods). Towns use up what you deliver, and a stocked dock pays less, so you spread deliveries around.

Deliveries earn growth. A town grows through five levels (Hamlet, Village, Town, City, Metropolis), and each level needs a wider variety of goods. Bigger towns want more, pay more, add buildings and eventually skyline towers.

World tier is unlocked by **quests**. Each tier has a short list; finishing all of it unlocks the next tier, and every quest pays a cash reward. The quest bar at the top of the screen shows the next one, and the Quests sheet (G) shows all four tiers, what each quest pays and what the next tier unlocks.

| Tier | Name | Quests to finish it | Finishing it unlocks |
|---|---|---|---|
| 0 | Startup | Build a Forestry Camp, build a Sawmill in a town, join them with a road, sell 100 lumber | Tier 1: highways, hub, big rig, coal, iron, cotton, sand, jam, feed, pellets, paper, yarn, bricks, stone blocks, building level 2, spans of 4 tiles |
| 1 | Regional Supplier | Sell 3 different goods, upgrade a building to level 2, build a hub, build a highway, grow a town to level 4 | Tier 2: rail and freight trains, cloth, clothes, furniture, books, cement, concrete, glass, ingots, tools, building level 3, spans of 8 tiles |
| 2 | Industrial Group | Lay a rail line, make 60 ingots, sell 60 tools, upgrade 2 buildings to level 3, grow 3 towns to level 4 | Tier 3: steel, slag crusher, machinery, spans of 16 tiles |
| 3 | Global Network | Make 100 steel, sell 40 machinery, grow a town to level 5, earn $250,000 | The end game |

Quests are data in `src/sim/defs.ts` (the `TIERS` list) and progress is measured straight from the world, so a quest cannot fall out of step with what is really built. A test checks that no quest asks for something its tier has not unlocked.

A **How to play** guide (H, the ? button, or the menu) walks through the loop in twelve short cards. It opens by itself on a first visit.

---|---|---|
| 0 | Start | Box truck, forestry, farm, quarry, sawmill, flour mill |
| 1 | Deliver 100 lumber | Paper mill, distribution hub, big rig, level 2 buildings, longer bridges and tunnels |
| 2 | Grow a town to level 3 | Level 3 buildings (rail comes here, when built) |
| 3 | Grow 3 towns to level 4 | (air freight comes here, when built) |

---

## Roads and Rails

Drag from one site to another: the game finds the cheapest buildable route (bridges and tunnels only where they are cheaper and within the tier limit) and draws it with rounded corners. A box truck comes with it.

**Highways** (Tier 1) are four lanes wide and about a third faster. Where a highway runs on as a street it narrows into it.

**Rail** is a separate network with its own track, drawn the same way, and a freight train comes with it. Trains serve sites out of town, hubs, factories on a town's outer lots, and each town's **Rail Station**. From Tier 2 every town has a station on a corner of its built-up square. It stores up to 240 of each good the town wants and sells them on to the Market and Freight Yard as they have room (topping them up to 60% so prices hold). Pointing the rail tool at a Market or Freight Yard snaps to the station. Only trains can use it.

---

## Phases

**Done so far:** the 3D globe with terrain, towns, resource nodes, push/pull logistics, hubs, two road vehicle classes, bridges and tunnels, building levels, demolish, save and load, HUD with categories, hover cards and panels.

**Next:**
- More train types, and loading goods onto trains at a station
- Airports and planes
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

## Ideas in the Backlog

- A one-click auto-road tool using the existing path finder
- Seasons and weather
- Contracts from towns (deliver X by a date for a bonus)
- Multiplayer or shared maps
- Other renderers or art styles

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed
