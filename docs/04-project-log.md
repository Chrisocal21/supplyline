# Supplyline — Project Log

---

## Supplyline -- Session 1 -- 2026-10-11

**Status:** Active

---

### What We Decided

- New project: a browser game, chosen as a learning project in new territory (game dev)
- Genre: production chains plus route building plus empire growth
- Reference points: Railroads Online for routes, Farming Sim for production depth, Satisfactory for unlocks
- Architecture: simulation and rendering kept separate, so a voxel world can be swapped in later
- Build 2D first with Phaser; voxel 3D with Three.js comes in Phase 3
- Progression: small vehicles, then trucks, then rail, unlocked by milestones
- Early routes are player-drawn paths; no pathfinding needed
- No backend; saves in browser local storage
- Name: Supplyline

---

### What Was Learned

- Chris wants depth inside production areas, not just transport: deliver, combine, make, ship, repeat
- Chris's interest in voxels comes from wanting simple, achievable art, not from voxels being the core fun
- Chris wants shorter answers with less text per response

---

### What Changed

- Original recommendation was rail first; changed to progression-led start (small vehicles) using player-drawn roads

---

### Open Questions Added

- First two-step chain for Step Zero
- Handcrafted vs generated map
- Tier 0 and Tier 1 content
- Running costs for vehicles and sites
- Art direction (voxel vs low-poly), deferred

---

### Open Questions Closed

- Genre, framework, backend, progression model, voxel timing, name

---

### Progress Updates

- Project created at 0%. Step Zero, Phase 1, and Phases 2-4 defined in the tracker

---

### Documents Updated

- SUPPLYLINE_FEATURE_MAP.md — created
- SUPPLYLINE_PROGRESS_TRACKER.md — created
- SUPPLYLINE_OPEN_QUESTIONS.md — created
- SUPPLYLINE_PROJECT_LOG.md — created

---

### Next Session

Pick the first two-step chain, then scaffold the project and get a blank Phaser scene running.

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed

---

## Supplyline -- Session 1 (build) -- 2026-10-11

- Decided: logs are the base good; paper and other items come from logs later. Step Zero chain is forest, sawmill (lumber), market
- Built: Vite + TypeScript + Phaser scaffold on localhost:3000; data-driven sim in src/sim (defs.ts, world.ts) with 3 passing tests; Phaser scene with site placement, drag-to-draw routes, one vehicle per route, money HUD
- Not yet verified in a browser: placement, route drawing, HUD

---

## Supplyline -- Session 1 (Phase 1 build) -- 2026-10-11

- Chris asked for a changeable view of the land and told Claude to take the reins through Phase 1
- Built: seeded 64x48 terrain; camera pan (right-drag, WASD, arrows) and wheel zoom; costs and purchasing; farm, mill, paper mill; pickup and truck; Tier 1 milestone (deliver 50 lumber); autosave plus Save/Load/New; screen-space HUD and toolbar in a second Phaser scene
- Decided (draft): generated map; Tier 0/1 content as listed in open questions
- Gotcha: a Phaser Scene already has a `load` property, so scene methods must not be named `load`
- 6 sim tests pass; none of the rendering has been played yet
- Not done: Vercel deploy (needs Chris approval and a repo)

---

## Supplyline -- Session 1 (globe) -- 2026-10-11

- Chris's screenshot showed no HUD (second Phaser scene was never launched) and an off-centre map; he asked for it centred and "like a globe, not flat"
- Fixed: scene launch; view now driven by a stored centre point and zoom re-applied every frame, so it stays centred through resizes
- Built: wrapping world (96x48, x wraps, polar caps), seamless noise at the seam, routes and vehicles that cross the seam, canvas-textured terrain drawn in repeated copies, rotatable globe view (src/render/globe.ts), `#globe` URL hash for screenshots
- Save key bumped to v2; old saves are ignored
- Verified visually with headless Chrome screenshots; 8 sim tests pass
- Gotcha: world-space objects (like the globe image) are affected by the flat camera zoom and scroll

---

## Supplyline -- Session 1 (visuals and living world) -- 2026-10-11

- Chris asked for cleaner, more modern visuals, names across the world, a more livable world, and every node (like the forest) clearly visible on the map
- Sim: regions (seas, woods, plains, ice caps), villages and towns (3x3 footprint blocks building), site names after nearest settlement or woods; save version 3; 10 tests pass
- Render: smooth painted terrain (src/render/terrainRender.ts), scenery (decor.ts), illustrated site and vehicle sprites (sprites.ts), region and village labels that fade with zoom, name plates with stock bars, ghost placement preview with the reason a spot is invalid, restyled HUD, globe uses the same painted colours and shows villages
- Forest sites are drawn as a log cabin in a cleared yard so they stand out from the surrounding trees
- URL hashes for screenshots: add -shot to freeze the game after a few frames (#demo-shot zoomed sample base, #demo-fit-shot whole globe, #demo-fit-globe-shot globe view). Demo never touches the save
- Screenshots are taken with a DevTools script that waits for the frozen frame (about 4s); plain chrome --screenshot with virtual time stalls on this game

---

## Supplyline -- Session 1 (v2: 3D globe) -- 2026-10-11

### What Chris asked for
- Cleaner, more adult visuals (City Skylines, Satisfactory, Farming Sim), and more 3D
- No overlapping text: names on hover, and just a status circle on buildings
- Roads that overlap look clean, and crossing roads merge into crossroads
- The map as a globe, with continents, mountains and terrain that force bridges, tunnels or detours
- Logistics buildings with push and pull; vehicle classes (box truck, big rig, train, plane); a category menu
- Markets that are part of towns, towns that grow, and growth as part of the tier system
- Limited build spots per forest, and levels for every production building

### What was built
- Replaced the Phaser 2D renderer with Three.js: displaced terrain on a sphere, painted colour texture, atmosphere, stars, real sun and shadows, fog and sky that change with altitude
- Simulation rewritten: elevation, mountains, resource nodes with quality, towns with docks and five levels, push/pull cargo choice, hubs, building levels, bridge and tunnel rules by tier, demolish
- Procedural 3D models for every building, five town stages, vehicles, bridges and tunnel portals
- HUD rebuilt as a Phaser canvas overlay: category tabs with 3D thumbnails, hover cards, status rings, collision-free labels, selection panels with upgrade and hub controls, speed control
- 18 simulation tests; interaction checked with real mouse events through a DevTools driver (build, draw road, sell, grow town, demolish)

### What changed
- Three.js moved from Phase 3 to now
- The standalone Market building was removed; towns own their markets
- Pickup became Box Truck, Truck became Big Rig; trains and planes are designed but locked
- Trucks wait briefly at the start of a route for a worthwhile load instead of leaving with one unit

### Gotchas
- Large heredocs in the shell tool fail; write files with the file tool
- Headless Chrome screenshots work through a DevTools script that waits for the game to freeze, not with --virtual-time-budget
- World-space objects need care with camera maths; the new camera is an orbit around a ground point

### Open from this session
- Rail design, goods for bigger towns, running costs, auto-road tool, final art direction (see Open Questions)
- Not yet done: Vercel deploy (needs Chris approval and a GitHub repo)

---

## Session: Oct 12, 2026 (feedback pass)

Chris reviewed the 3D build and listed what looked wrong. What changed:

- **Roads:** dragging between two sites now auto-routes (cheapest buildable path, bridges and tunnels only within the tier limit, few turns). Corners are drawn and driven as curves. Roads are narrower.
- **Terrain and placement:** plains are flatter. Buildings need level ground. Towns are only placed on flat ground and get a levelled plateau. Quarries moved from mountain tops to the foot of a mountain and are dug into a pit with terraced walls.
- **Menu:** the full-width footer became a floating dock of categories with a card tray above it that only appears when a category is open.
- **Rail:** a separate network with sleepers and steel rails, level crossings with signs, a freight train (capacity 140, Tier 2). Train and Rail cards are live.
- **Saves:** key bumped to supplyline.save.v5; older saves are ignored.
- **Tests:** 23 passing (rail rules, crossings, vehicles by network).

Not done: planes and airports, rail stations, balance pass, Vercel deploy (needs Chris's go-ahead).

---

## Session: Oct 12, 2026 (towns as districts)

Chris asked for markets and production to live inside towns, the header to feel like a console or tablet game, overview sheets, and more products and by-products.

- **Towns are districts.** Each town has a main street (centre plus two tiles each way) that is part of the road network from the start, so roads can run straight through towns like an interstate. Around it are eight district plots: Market, Freight Yard, then six industry plots that open as the town levels up (2, 4, 6). Processing and manufacturing buildings can only be built on those plots.
- **15 goods.** New: sawdust, pellets, furniture, bran, bread, feed, bricks, gravel, books. By-products (sawdust, bran, gravel) never stall a building; overflow is lost. Freight yards buy by-products and raw goods.
- **New buildings:** bakery, brickworks, feed mill, pellet mill, furniture workshop, printery.
- **Menu:** Processing and Manufacturing replace Industry.
- **Header:** floating pills for money, tier goal, speed, and round buttons for the Production sheet, Towns sheet and Menu.
- **Sheets (P and T):** production sheet (every good with stock and made/used per minute, every building with status, live market swings) and towns sheet (growth, variety, plots, what each market and freight yard wants with price and stock).
- **Live feel:** chimney smoke on running buildings, random price surges and slumps with log toasts.
- **Saves:** key is now supplyline.save.v6.

### Follow-up: buildings built into the town

- A town is now a 5x5 block with a street cross. The twelve tiles beside the streets are plots; any building that does not need a resource node (processing, manufacturing, hubs) can go on any plot, from the start. Houses fill empty plots and give way to what you build.
- Buildings in a town link themselves to every trading partner in that town over the town streets, with a free van each. No road drawing inside a town. Roads from outside join the street cross.
- The old level gating of plots is gone.

---

## Session: Oct 12, 2026 (towns with character, deep chains, bendable roads)

- **Towns:** now a 7x7 area. Streets run three tiles each way, twelve plots beside them, homes around the outside. Empty plots are fenced lots with a For Sale sign facing the street; built plots hold your building, facing the street. Five regional styles (Nordic, Temperate, Mediterranean, Tropical, Desert) set by latitude: different walls, roofs and roof shapes. Windows, doors, chimneys, street lamps, trees. Each town also has its own taste (price and need multipliers per good, nudged by its style).
- **Chains:** 37 goods (10 raw, 12 materials, 10 products, 5 by-products). 8 node kinds: forest, farmland, quarry, iron mine, coal seam, clay, pasture, orchard. 10 production sites, 7 processing, 6 manufacturing, 10 heavy-industry buildings. Examples: stone to blocks and gravel; gravel and coal to cement; cement and sand to concrete; ore and coal to ingots and slag; ingots to steel; steel and tools to machinery; slag crusher feeds gravel and sand back in; milk to cheese and whey; bran and whey to feed; cotton to yarn to cloth to clothes. Tests check every good has a maker and a user, and every recipe adds value.
- **Menu:** Heavy Industry tab added; trays wrap onto rows.
- **Roads:** drag from a site, then click or drag again to bend the road, finish on a site. Backspace undoes a bend, Esc cancels. Same for rail.
- **Saves:** key is now supplyline.save.v7.

Still open: quests and story, the far-away "town only needs a little" supply gameplay beyond the freight yard, planes, a balance pass.

---

## Session: Oct 12, 2026 (cities, entrances, highways, textures)

- **Major cities.** Two or three per world (radius 5, 28 plots, start at level 2, bigger demand, dense blocks that climb into towers); small towns (radius 3, 12 plots) stay the norm, and the game starts in a small town.
- **Buildings along the roads.** Some plots along each street are already homes (not for sale); the rest are fenced lots with a For Sale sign. Every plot has a driveway to its street, and a building on a plot is entered only from that street (roads into it must arrive by the plot's street). Rail may cross a town's outer ring but not its streets or plots.
- **Crossing.** The centre of every town has crosswalks and traffic signals.
- **Highways.** New Highway tool (Tier 1): four lanes with a double yellow median, wider bends and junctions, about 2.4x the cost of a street, and trucks cover it about 35% faster. Highways join the main street inside towns.
- **Textures.** Buildings use a procedural surface shader: brick, siding, stucco, roof tiles, corrugated metal, concrete panels, and lit-window curtain walls on towers.
- **Ground.** Town models now follow the curve of the globe (they were floating at the edges), every building has a foundation under it, trees and rocks are cleared from whole towns, and town ground flattening no longer gets undone by hill noise.
- **Saves:** key is now supplyline.save.v8.

- **Follow-up:** driveways are now drawn by the road network, so they use the same road surface and markings as the street they join. Houses, towers and trees have foundations or sunk trunks so nothing hovers on uneven ground, and lot pads are deeper.

---

## Session: Oct 12, 2026 (tunnels, tier quests, how to play)

- **Tunnels.** Rebuilt. A mountain crossing is now read from the real shape of the ground along the road. Where the hill stands well above the road (1.5 units over it, and high on both sides) the road goes under, with a concrete mouth (two piers, a lintel, a dark bore) set into the slope at each end; trucks and trains drive in and out of it. Anywhere lower, including "mountain" tiles flattened by a nearby city or quarry pit, the road is simply cut through as open road. The old version put a portal block at a fixed point on the edge, which is why blocks floated or stood in the open.
- **Roads regrade the ground.** Each road cuts into slopes and fills dips along its bed. The grading stops square at a tunnel mouth so the hill behind it stays. The route finder also charges extra for steep ground and for running along the foot of a mountain, so roads go around when that is reasonable. A bridge can no longer run straight into a tunnel: one tile of land is needed between them.
- **Everything sits on the drawn ground.** The terrain mesh is flat triangles between its points, while objects were being placed on the smooth height formula. On rough ground the two differ, which is why boulders hovered on peaks. Roads, boulders, trees, buildings and markers now use the height of the mesh itself, and trees and rocks are re-seated when a road regrades the ground under them.
- **Highways** narrow into a street where one runs on as the other, including through back-to-back bends, instead of stopping at full width. Trucks keep to the outer lane of whatever the road is at that point.
- **Buildings out of town** turn to face the road that serves them.
- **Build menu** folds away when you pick something to place, so the map is clear. Esc or the category tab brings it back.
- **Tier quests.** Four tiers (Startup, Regional Supplier, Industrial Group, Global Network), each with four or five quests that pay cash. Finishing a tier's list unlocks the next tier. The middle of the top bar is the quest bar: tier, next quest, progress; hover for the hint and reward, click (or G) for the Quests sheet with every tier, every quest and what each tier unlocks. Quests live in `TIERS` in `src/sim/defs.ts`; the logic is `src/sim/quests.ts`. Old saves load with their tier kept.
- **How to play.** A guide of twelve short cards: the idea, the camera, the four steps (produce, process in a town, build a road, sell), growing towns, keeping things moving, hubs, highways and rail, by-products, quests, shortcuts. It opens by itself on a first visit and is on H, the ? button and the menu.
- **Rail.** Track cannot reach a town's Market or Freight Yard (both are inner lots, and track may not run along streets or over lots). The game now says so when you try, and the rail card and the guide explain the way round: end the track at a hub or an outer-lot factory.
- **Town vans were stuck (the big one).** The free van between a town lot and the Market was created running from the Market, because the Market is always the older building, and a vehicle only ever waited for a load at the start of its route. So the van sat at the Market forever, nothing built in a town sold through it, and the first tier could not be finished by following the quests. Two fixes: a vehicle's home is now whichever end supplies the other, so a road drawn from customer to supplier works too; and town links are created running from the supplier. Found by playing tier 0 through on a generated world, which is now a test.
- **Vehicles pull up at the door** of a building instead of parking in the middle of it. Trains stop a wagon-length out, so the wagons no longer run through the building.
- **A building with no road of its own yet** faces a road that passes its door.
- **Tools.** `tools/shots.cjs` takes several screenshots in one browser session.
- **Tests:** 39 pass. New: quests pay once and move up a tier; no quest asks for something its tier has not unlocked; the town link sells whichever site was built first; a road drawn backwards still hauls; tier 0 plays through on a generated world.

Still open: rail stations so trains can serve town centres, planes, a balance pass. Now that town sales work, money and town growth come much faster than before: tier 0 takes about five minutes at normal speed, so prices, growth thresholds and the quest numbers all need tuning after a real playthrough.


## Oct 12, 2026 (later): rail stations

- **Trains can now serve towns.** At Tier 2 every town gets a Rail Station on a corner of its square (`ensureStations` in sim/world.ts; old saves get them within a couple of seconds). A train unloads its whole load there; the station sells it on to the Market and Freight Yard a little at a time (`sell()` is shared with truck deliveries).
- With the rail tool, pointing at a Market or Freight Yard snaps to the station. Roads cannot use a station.
- New station model, panel text, guide and rail-card text. The demo runs a train into the station.
- **Tests:** 41 pass (two new ones for stations).

Still open: stations only receive goods; planes; a balance pass.

## Oct 12, 2026 (later still): balance, stations that send, planes

- **Balance.** Town growth thresholds are three times higher (Village 750, Town 3600, City 13500, Metropolis 45000), so towns no longer shoot to level 3 in one sitting.
- **Small towns.** A station holds 60 of a good per town level instead of 240, so a train only takes what the town can absorb.
- **Stations send goods.** Once a rail line serves a station, the town's factories pass half of what they make to the platform every second and trains carry it away. Goods a train unloads go to the town's factories first, then to the Market and Freight Yard. This also makes inner-lot factories reachable by rail.
- **Vehicles.** An idle vehicle at its home end now goes to fetch from the far end when something is waiting there, and takes whatever is there on arrival. Fixes hub-to-station and other two-way links.
- **Planes and airports.** Airport (Tier 3, $2500, outside towns) is a hub planes fly between. Air Route tool: click one airport then another; a cargo plane (40 units, $7000) comes with it and flies a straight line over any terrain. Air routes draw as a faint arc. New quest "Open an air route" in Tier 3.
- **Tests:** 43 pass.


## Oct 12, 2026 (evening): touch, depth and pacing

**Why.** Chris is taking the game on a four-hour trip to test on an iPad, and the game was too fast: one camp and one sawmill took a town to level 3 in about five minutes. He asked for depth, not just a slowdown: vehicles that level up from a small box truck to trains and planes, towns that keep growing with things to level up (restaurants, farmers markets), and reasons to focus on one city after expanding, with choices that make a second playthrough different.

**Touch.**
- `src/ui/inputmode.ts` follows the last pointer used (finger, pen or mouse) and guesses from the device before the first input, including iPadOS reporting itself as a Mac. Guide text, hints and key badges change with it.
- Two fingers: pinch zooms, twist turns, sliding up or down tilts. A tapped build or demolish previews first and a bar with Cancel and Build confirms. Roads get Undo and Cancel buttons. Sheets scroll by dragging. Buttons fire on lift so scrolling does not press them. The page blocks browser zoom and rubber-banding; the game saves when the page is hidden.
- `tools/drive-touch.cjs` drives the game with emulated touch for tests.

**Towns you keep building.**
- *Districts* (`DISTRICTS` in defs, rules in `src/sim/town.ts`): each lives on goods, pays more for them, earns money while they are stocked, may add goods the docks ask for, and shows as a landmark on a tile around the streets (`src/r3d/districts.ts`). Each level needs the town one level higher, so growth keeps unlocking things.
- *Paths* (`PATHS`): a Town commits permanently to Breadbasket, The Forge, Trade Hub or The Boulevard for $3,000. It changes prices, factory speed, load size or storage, strengthens on-theme districts by 50% and opens exclusive districts and a capstone at level 5.
- The *Manage town* screen is inside the Towns sheet and reachable from a town's panel.

**Vehicles.** Eight classes in three families, with a Trade up tool that swaps the smallest vehicle on a route for the next class and returns half its price. Four new models.

**Running costs.** Vehicles 5% of price a minute, buildings 1% a level, districts 1.5% a level. The figure under the money is now net income.

**Economy.** Towns pay 45% of list price. Level thresholds are now 2,000 / 10,000 / 45,000 / 150,000. Tier 4 "Legacy" is the end game (three specialisations, three Metropolises, three capstones, a cargo jet, $1,000,000). New quests for districts, paths and vehicles in tiers 1 to 3.

**Measuring.** `src/sim/bot.ts` plays the real simulation at about one action per ten game seconds: it builds chains for three towns side by side, follows quests, upgrades, buys districts, picks paths, trades vehicles up. `PACING=1 PACING_HOURS=3 npx vitest run src/sim/pacing.test.ts --reporter=verbose` prints when each tier and town level arrives. On seed 11 the bot reaches Tier 1 at 5 minutes, Tier 2 at about 45, Tier 3 at about 135 game minutes. A person is slower than the bot, so expect roughly double.

**Speed.** Profiling showed vehicles hunting for loads every tick were almost all of the cost. They now look five times a second; a 3 hour run went from 190 s to about 40 s.

**Tests:** 55 pass (12 new for districts, paths, running costs and trade-up). Two old tests were changed: money no longer has to rise on a train sale because running costs offset it, and a town needs longer to reach level 2.

Still open: balance by a human playthrough; per-path quests; offline play for the iPad.


## Oct 12, 2026 (night): Chris's playtest list

Chris played the first build and listed what bothered him. All of it is done.

- **Free roads.** A route can now be a *free* road (`free: true`, no site ids, no vehicle). `planRoute` decides: two different buildings that trade give a vehicle route, anything else is plain road. Free ends must be on dry, buildable ground (`roadEndError`), and a drag that reaches a building or an existing road of the same kind finishes by itself (`endsHere`); otherwise Enter or the Finish button builds it. Existing tiles cost almost nothing, so later routes run along a network you laid first. Vehicle tools and Trade up ignore free roads.
- **Removing routes.** `removeRoute` takes a route and its vehicles, refunds half (`routeRefund`) and leaves tiles another route still uses. Town streets are refused. The Demolish tool handles roads as well as buildings.
- **Nodes.** Each kind has its own ragged-edged ground paint (`paint.ts`) and a small 3D scene (`nodeProps` in `scenery.ts`) shown until a building takes the node. Only quarries dig a pit; mines and coal get a level yard (`geo.ts`). Trees come in groves (`grove()` noise) and keep clear of every non-forest node.
- **Placement.** World generation puts farmland, pasture and orchards in belts around the flattest ground, then makes sure every town has a forest, farmland and pasture within 15 tiles (`features.ts`).
- **Towns.** All towns start at level 1 and growth 0. Lots are a clean pad with stakes; the frontier of the built-up area is construction sites (stages 1 to 3, a crane from level 2).
- **Windows.** Sheets are full screen; the dock and hint hide while one is open. The selection panel draws into the clipped layer and scrolls above the dock.
- **Tests:** 57 pass (2 new for free roads and removal; four old expectations updated: nothing-to-trade is now a plain road, cities start at level 1).
- Pacing after the change, seed 11 (bot): Tier 1 at about 6 minutes, Tier 2 at about 55.

## Oct 12, 2026 (late night): vehicles from the building

The click-a-road way of adding vehicles was confusing (free roads, shared tiles). It is gone, along with the Vehicles tab and the Trade up tool. Select a building and its panel lists every route it is on (`vehicleSection` in hud.ts): what runs there, a class picker, **Buy** and **Trade up**. Same sim calls (`addVehicle`, `tradeUp`), so the economy is unchanged. Quest hints and the guide were reworded. Verified with real clicks: buy, pick a class and buy, trade up.

## Oct 12, 2026 (late night, fix): roads that joined buildings gave no trucks

A road drawn from a building onto another road is a free road (no vehicle), so a camp could be "connected" with no truck, and the new vehicle panel said "No routes yet". Now routes follow the network: `linkableSites` walks the roads and tracks already laid (tiles joined where a route runs from one to the next; a building is the end of the line) and lists every building the one it is selecting could trade with and has no route to. The building panel shows them under "Connected, no route yet" with a **Start** button (\`startRoute\`), and when a road is laid the buildings at its ends get routes started automatically (\`connectSites\`, up to three, only if money allows). Existing level crossings are no longer charged again. Tests: 59 pass (two new, including the exact two-free-roads case).

## Oct 15, 2026: nothing runs until you set it up

Vehicles, production and sales are now player-driven, one clean flow:

1. **Build** a camp, farm or mill. **Buy a truck at that building** (its panel, Vehicles). The truck belongs to that building (`homeId`) and waits at the gate (`routeId 0`, hidden) until a route it may run exists.
2. **Roads and rails only open lanes.** `createRoute`, `createAirRoute`, `connectSites` and in-town district links no longer buy anything.
3. **Raw producers** (farm, camp, pit...) deliver by themselves to any connected building that asks for their good.
4. **Processors** make nothing until switched on (`site.making`, Production section). While off they ask suppliers for nothing, so a farm's truck stays parked until the mill is on.
5. **Everything else sells only where switched on** (`site.sendTo`, Sell to section; `sellTargets`, `setSendTo`, `sendAllowed`). Applies to processors, hubs and airports. Stations stay automatic.
6. **Vehicles are individual.** Each has Upgrade (next class, half the old price back), Sell (half price) and a destination picker (`destId`). Trade-up by route and the click-a-road vehicle tools are gone. A vehicle carries its own building's goods out; the route it runs is whichever lane its building sells along (`laneOk`, `assignVehicle`), least busy first. Switch a sale off and the truck finishes its trip, drives home and parks. Removing a route parks its trucks; demolishing a building sells its trucks.
7. Tier 0 quests now walk the flow: camp, buy a truck, sawmill, road, switch on, sell to the Market, sell 100 lumber. New quest goals `fleet`, `making`, `selling`.
8. Bot: `runChores(w)` in bot.ts does what a player does by hand (switch everything on, switch sales on, buy a truck at the supplying end of each route). The demo base uses it too. Save key is now v9 (old saves do not load).

Pacing, seed 11: Tier 1 at 5.7 min, Tier 2 at about 56 (was 45; the bot now pays for trucks per route). 60 tests pass.

Open for later: the hub-as-overflow step (quests nudge it at Tier 1; hubs still need Sell to switched on by hand), and in-app purchases: if this ships to a store it needs a premium currency bought with real money alongside the in-game cash.

## Oct 15, 2026 (later): selling made simple

The building panel was too technical. It now tells one story, top to bottom:
- **Next step card** (`nextStep` in hud.ts): one plain sentence and one button. Start, Buy a truck, Build road ($), Sell there, or "All running".
- **Flow card**: what goes in (with stock), the building (per minute or Stopped), and what comes out (ready, full). Pause sits under it once running.
- **Who buys your X** (`buyersFor` in world.ts): every buyer already joined, plus the three nearest that are not, each with its price, a "Wants more / Nearly full / Full, try later" meter, sales so far, and one button: Selling / Sell here / Road $N (`buildRoadTo` lays the road and turns the sale on; prices come from `roadPlan`, cached, one path search per frame).
- **Your trucks**: + Truck, then one row per truck in plain words ("Carrying 6 lumber to Birchridge Market", "Waiting for a road"), Upgrade, and More (destination, Sell).
- **Map arrows**: with a building selected, arrows to its buyers with tappable price tags (green selling, white can sell, grey dashed needs a road).
- Camps and farms now use the same switch: they sell to whoever they are joined to unless you stop it (`sendOff`).

61 tests pass. Checked the whole loop in the browser: camp, truck, road from the camp's panel, Start, Sell here, lumber sold.

## Oct 15, 2026 (evening): building dashboard, sell lines on the roads

- Clicking a building shows a short side card: the next step, the flow, a one-line summary and **Open building**. That opens a full-page **dashboard** (`dashboard()` in hud.ts): header with Show on map and close, the next step across the top, then three columns (Production, Who buys, Your trucks). It drops to two or one column on narrow screens. Esc closes it; it scrolls with wheel or drag. Docks and stations keep their short side panel.
- Map sell lines now follow the road that joins the two buildings (the route's tiles), with the arrow at the buyer's door. A buyer not joined yet shows the road a tap would build, dashed, and only when its price tag fits on screen. Tags move along the line to avoid covering each other.

## Oct 15, 2026 (night): towns grow when you say so

A town no longer levels up by itself. When it has the growth and the variety (`readyToGrow`), it is logged once ("ready to grow", `place.readyAt`) and a popup opens (`growModal` in hud.ts): Hamlet to Village, population before and after, price bonus, stall size, how fast it uses goods, what the Market and Freight Yard start buying, new districts, and whether it can specialise (`growPreview`). **Grow into a Village** finishes it (`growTown`: level, Freight Yard at 2, town links) and flies the camera there; **Later** puts it off, and the town's panel and a market's town column show a **Ready: grow into a ...** button to bring it back. The popup waits while a sheet is open or a road is being drawn. The bot grows towns in `runChores`. 61 tests pass.

## Oct 15, 2026 (night): upgraded buildings look bigger

`siteGeometryAt(kind, level)` in r3d/models.ts: the main building grows (factories 1.08x across and 1.3x up at level 2, 1.15x and 1.6x at 3; camps and farms less in height) and each level adds its own pieces (`levelParts`). Factories: a wider paved lot, an annex hall, silos and pallets in the colour of what they make; level 3 adds a tall striped chimney, a sawtooth second hall, a loading dock with a truck, and lamps. Camps, farms, pits and mines: a foundation pad, a fence, a shed and stockpiles; level 3 adds a barn, silos (farms) or an open storage shed (others), a truck and lamps. Hubs: container stacks, then a gantry crane. Markets and stations do not change (towns grow them). Models are cached per kind and level, and swapped when a building is upgraded.

## Oct 15, 2026 (night): construction you can watch

`r3d/construction.ts`: when a building is placed or upgraded, scaffolding goes up round its lot (walkways, braces, a materials pile and a site hut), a yellow tower crane at the back corner swings its load, dust rises (through the smoke system, `every` sets a faster puff rate), and the new model grows out of the ground with a small bounce before the scaffolding comes down. About 3.2 seconds of real time. game3d spots new and upgraded buildings in `syncSites` (`siteLevels`, `sitesShown` so loading a world does not set everything building), keeps each mesh's resting matrix in `userData.base`, and runs `updateConstruction` every frame. The Upgrade button says "Construction started"; the finish says "X is now level N" or "X is open". `construction.debugT` holds every job at one point, for screenshots.

## Oct 15, 2026 (night): upgrades are an event

- Pressing Upgrade on a building closes the dashboard and the side card, and the camera flies in close and slowly circles while the work plays (`watch`, `orbitUntil`; any click or drag hands the camera back).
- The building job is now about 5 seconds: two flatbed lorries drive in from the street side and their loads swing off onto the lot; scaffolding and the crane go up; the old building sinks away in a burst of dust; the new, bigger one rises with a bounce; the scaffolding comes down and the lorries back out. A new building does the same without the old one sinking.
- Upgrading a vehicle closes the menu, flies the camera to it, and it swells into its new body with a bounce and a puff of dust (`userData.pop` in game3d).
- Laying a road or track sends a yellow road roller down its length with dust behind it (`startRoad`).
- Fixed: the truck Upgrade button had lost its $ sign.

## Oct 15, 2026 (night): resource spots on level ground, spaced out

- Placement (`generateFeatures` in sim/features.ts): farms, pastures, orchards, forests and clay only go on low, level ground (step to every neighbour at most `NODE_SLOPE` 9, height at most `NODE_MAX_ELEV` 160), with at least two clear tiles to any other node (`NODE_GAP` 3, was touching), and land within `NODE_TOWN_REACH` 22 tiles of a town is preferred. Pastures and orchards may use any open land in the region, not only the farming belt. Quarries, mines and coal seams take the lowest half of the grass within two tiles of the rock, so they sit down on the plain at the foot, not up the flank.
- Ground (`HeightField` in r3d/geo.ts): every node now gets a levelled pad like towns have (a 1-tile flat core blending out over 2.2 tiles, at the average height of the ground round it); quarries keep their dug pit, mines their yard.
- Town-built stations and docks animate quietly (no "is open" message for each).
- Pacing seed 11: Tier 1 6.5 min, Tier 2 55 min (unchanged). Existing saves keep their old node positions; a new game uses the new layout.

## Oct 15, 2026 (late): old saves get the new layout, towns open lots as they grow

- Old saves: `relayoutNodes` (sim/world.ts) runs on load when `world.layout` is below `NODE_LAYOUT` (2). It regenerates the nodes with the current rules for the same seed, keeps every node that has a building on it, and adds the new ones that do not crowd a kept node, sit on a building or sit on a road. New worlds are stamped layout 2.
- Lots: towns start with more of their street plots as homes (60%, cities 50%; was 35%/30%), and each level frees `LOTS_PER_LEVEL` (3) of them, nearest the centre first (`homesNow`, `lotsAt`). The town model draws only the homes still standing, so the freed plots show as empty lots. The grow popup has a "Building lots 8 → 10" row and a "N new building lots" note; its "what is new" list is now in two columns so it fits a short screen. The unused `INDUSTRY_PLOTS` / `openIndustryPlots` are gone. 63 tests pass.

## Oct 15, 2026 (late): five save slots, and New asks first

New world used to need a second click within three seconds, so one click seemed to do nothing. Now the menu has **Save / Load** and **New world**, both opening one window (`savesModal` in hud.ts). Five slots (`saveSlot`, `loadSlot`, `deleteSlot`, `slotInfo` in game3d; each slot stores the world and a small summary: town, tier, money, minutes played, when saved). New world asks "Do you want to save this game first?": each slot has **Save, then new**, plus **Start new without saving** and **Cancel**. Overwriting a slot, loading over the current game, deleting, and starting without saving each need a second press (the button says "Overwrite?", "Sure?", "Delete?" or "Press again"). The autosave keeps running as before. A save is about 250 KB, so six fit well inside the browser's storage.

## Oct 15, 2026 (late): no resource spots on islands no town can reach

`generateFeatures` now floods out from every town over land, letting it hop straight across up to `REACH_BRIDGE` (4) tiles of water (a Tier 1 bridge), and drops any node outside that. An island with no town stays scenery. `NODE_LAYOUT` is now 3, so saves made before this get their unbuilt spots re-laid on load (built ones stay). Every kind of node still appears in every test world.

## Oct 15, 2026 (late): hard rule, no resource spots by the water

Every node is at least `NODE_DRY` + 1 (3) tiles from water (`dry` in features.ts), so its levelled yard or a quarry's pit never reaches the sea or a lake. Clay sits 3 to 4 tiles back from the shore instead of on it. The farming belt's centres are picked from dry ground. Quarries, mines and coal take turns choosing first at each mountain, so all three stay common. `NODE_LAYOUT` 4: older saves are re-laid on load (built spots stay). A test checks the rule on four worlds. Pacing seed 11: Tier 1 7.3 min, Tier 2 47 min.

## Oct 15, 2026 (late): towns as a street grid

- Streets (`streetOffset` in features.ts, `townStreets` in world.ts): the main cross, a ring road round the edge, and in a major city a cross street through each quarter (kept clear of the plots along the cross). Only on dry land; a gap is left beside an old rail station so its track still reaches it; any dead end left over (an arm that would run into the sea) is trimmed back. `streetAt` now asks this set, so pathing, building rules and the road renderer all agree. Cached per town until routes or sites change.
- Roads renderer draws the town grid from `townStreets`, with square corners in towns (country roads keep their curves).
- New rail stations stand just outside the ring road, beside a corner. Saves keep their stations; the ring opens beside them.
- Homes: fuller from the start (fill 70% at level 1, was 30 to 35%), two rows of homes on every home plot, three to four homes per home tile.
- Pacing seed 11 unchanged within noise. Old saves get the grid on load; nothing moves.

## Oct 15, 2026 (late): roads that flow

- Road and rail drawing (r3d/roads.ts): plain road between "pins" (junctions, dead ends, and where it meets a bridge, tunnel or highway) is now one smooth run, rounded off with three corner-cutting passes (`smoothTiles`, `SMOOTH_PASSES`). Staircases become diagonals, quarter turns become bends, town ring corners round off. Vehicles follow the same curves (`pathPoint` uses the route's cached smooth runs, refreshed each rebuild). Bridges, tunnels and highways keep their exact tile-by-tile shape.
- Towns: back to the main cross plus the ring road (the city quarter streets made a maze of short stubs). Driveways are a short apron instead of a stub of street. Homes stand in a row facing their street, set back behind front gardens, with small random offsets and turns; a second row fills in from level 2, and a garden tree where there is room.

## 2026-10-16: town grids and farmyards
- Every town's main east-west street is drawn as a highway through the middle of town; the grid's streets join it.
- Side streets on the lines between tiles (one each way in a town, three in a city) split towns into real blocks. They run out from the highway and end at the ring road, or in a turning circle where the ring is missing.
- Homes now line every street shoulder to shoulder, facing it behind a small front garden, with back gardens meeting mid-block. No more homes stranded in the middle of a block, and no more stub driveways.
- Farm fields lie square to the compass with a farmyard in the middle and a track out to each end, so the farm buildings sit in their yard, in line with the crops.
- Fix: a nearby farm's levelled yard could raise part of a town's flat ground, burying its streets. A town's flat ground now always wins.

## 2026-10-16: Map 1, a made world
- New games start on Map 1, "The Known World": a hand-drawn world map with seven landmasses, island chains, an inner sea, lakes and twelve mountain ranges. Seeded links (#seed=N) still make a generated world for tests and screenshots; #map-shot opens Map 1.
- The globe is bigger: 288 x 96 tiles (was 192 x 64), more than twice the area, at the same tile size. The globe radius, polar caps, camera range and space-view thresholds follow the world's size, so older saves still load at their old size.
- 28 towns and cities are placed by hand; the map builder moves each to the nearest spot where its whole square is dry, level land, and clears and levels it.
- Maps live in src/maps/*.json, baked by tools/maps/map1.cjs (`node tools/maps/map1.cjs preview.png` also draws a flat preview). Resources follow the placement rules from the map's fixed seed, so a map always has the same ones, and a map can list its own instead.

## 2026-10-16: strip towns
- Towns are no longer squares. Each is a strip along one main street (src/sim/townlayout.ts) that leaves the centre toward the nearest towns, bending gently to aim at them (at most one tile sideways in three), with a short cross street at the centre and lanes of uneven length branching off every other tile. Lots and homes line both sides.
- Streets grow with the town: the main street runs 3 tiles each way at level 1 (5 in a city) and one more per level, and lanes reach out a tile at a time. Neighbours' streets stop just short of halfway, so they reach toward each other and a short road joins them.
- The layout is worked out from the land and the towns, never saved. Plots, entries, facing, placeAt, townStreets and stations all read it. Dead ends are kept (they are where roads carry a street on); only stretches cut off from the centre are dropped.
- The town model lines every built street with houses (or blocks and towers in a grown city), keeping off the road's centre line, and the ground is levelled and worn along the whole strip. The main street is no longer a highway through town.
- Save key is now supplyline.save.v10: old saves had buildings on the old square plots.

## 2026-10-16: highways
- Highways are drawn as smooth runs like streets (staircases become diagonals, corners become bends) instead of square per-tile strips that overlapped at every turn. A run stops where a highway meets a street, and the highway narrows into the street over its last half tile. Vehicles follow the same curves.
- A town's streets count as part of the road network for the road and highway tools (`onNetwork`), so a highway can start on one town's street and finish the moment it reaches another's.

## 2026-10-16: build camera
- Upgrading a building no longer circles the camera round it (it swung behind trees and homes). It holds a low view from one side, then cuts to a higher view from another side halfway through, drifting slowly in on each. Each view is picked from eight headings by checking the sight line against the ground, trees, town buildings and sites (`watch`/`blocked` in game3d.ts). Any click or drag hands the camera back.
- Building work lasts 9 seconds instead of 5.2 (`BUILD_MS`), so every stage plays out slower: lorries, unloading, scaffolding, the old building sinking and the new one rising.
- Fix: where a highway turned into a street at a corner, the two were drawn as separate pieces meeting at a small junction pad, leaving a jagged join. A highway and the street it runs on into are now one smooth curve: the highway narrows to street width over its last half tile and the markings change at the hand-over, with no pad in between. Vehicles follow the same curve.

## 2026-10-16: towns grow on screen
- When a town grows a level, the change plays out over 8.5 seconds (`GROW_MS`, src/r3d/grow.ts): a wave runs out from the centre, the old town's buildings sink into the ground as it reaches them and the bigger town's rise behind it with a small overshoot, dust along the front. Road rollers lay each new stretch of street, and the camera uses the two-view build camera, pulled back to take in the whole town.
- Every part of a Parts model now carries an anchor (`Parts.anchor`, attribute `anc`), so a building rises as one piece instead of stretching. The town model sets it per house, block, tree, lot and landmark.
- Shadows wait until the growth ends. `debugGrowT` on the game holds growth at a point for screenshots.

## 2026-10-16: highway quest
- Fix: "Build a highway" (and the other road quests) ignored any road that did not start and end on a building, which is what a highway between two towns' streets is. The quest now counts every road the player lays; only a town's own street links (no grade) are left out. Test in src/sim/quests.test.ts.

## 2026-10-16: rail station spot
- Fix: a town's rail station was put on the nearest free tile outside the town, so it could stand alone in the grass with no street. It now takes one of the house tiles beside the main street (towards the outer end, with open ground behind it for the track) and turns to face that street instead of the track. See `stationTile` in sim/world.ts.

## 2026-10-16: every upgrade plays out
- Town districts: building one, or raising its level, now runs the same building work as a building upgrade: scaffolding and a crane go up at the district's tile, lorries unload, the old landmark sinks and the new one rises (9 seconds, the two-view build camera). Only that landmark changes; the rest of the town stays put (`growMaterial` with a `local` spot in r3d/grow.ts, `startDistrictWork` in game3d.ts). `townGeometry` records each landmark's tile in `geometry.userData.landmarks`.
- Committing a town to a specialisation path plays the growth wave as a renovation: the town sinks and rises again, without new streets.
- Already animated: buildings (scaffold, crane, lorries), town levels (growth wave and rollers), vehicles (swell and dust).

## 2026-10-16: trains bend
- Trains were one rigid box that swung round corners like a stick. A train is now a string of separate units (`trainUnits` in r3d/models.ts): a locomotive with hood, cab, stack, lamps and bogies, and wagons of five kinds (box, tank, hopper, flat with logs, open). Each unit follows the track on its own and points along the chord between its two ends, so the train bends round a curve one unit at a time. The load shows in the first wagon. Icons still use the whole train as one model.

## 2026-10-16: rail depots replace stations
- Towns no longer get a Rail Station for free. A Distribution Hub can be given a Rail Depot ($3,000, Tier 2; `buildDepot` in sim/world.ts, button in the hub panel): a rail yard with a platform, gantry and containers next to the truck bays, built behind scaffolding like an upgrade. Trains reach a town only through a depot hub (`planRoute`), and the last step into one may cross the lot beside it. Out in the country, track still joins any two buildings. Hubs already pass goods on to the town by truck, so nothing a train brings is lost. Old stations in saves keep working; `ensureStations` is no longer called.
- New tier 2 quest "Build a Rail Depot" before "Lay a rail line"; the bot and demo build depots.
- Level crossings are built for the width of the road: gates stand clear of a highway's four lanes (`wideTiles` in roads.ts).

## 2026-10-16: road and track in stretches
- Road, highway and rail are now laid as stretches of about 5 tiles (`SEGMENT_TILES`, `createRoute` in sim/world.ts). Each stretch is its own piece of ground (`Route.seg`), so the demolish tool removes one stretch, refunds only its own tiles, and leaves the rest. When two buildings are joined, a lane (`Route.over`) runs along the stretches for the vehicles; it owns no ground, so refunds come from the stretches. Taking a stretch out removes the lanes that ran along it and parks their vehicles (`dropBrokenLanes`); the rest of the road stays, and so does the road if a building is demolished.
- Only ground that is not already road becomes new stretches, so joining more buildings along existing road adds none.
- The demolish tool shows the stretch it will remove in red.

## 2026-10-16: opening screen
- The game now opens on a title screen over a live showcase: Map 1 with the demo base built, flown over by a cinematic camera (`startShowcase` / `updateShowcase` in game3d.ts: a Catmull-Rom path from a view of the whole globe down to a farm, the depot hub, the town and a neighbour, then a slow orbit). While it flies, things happen in the world: a farm and the hub are upgraded, a town grows a level, a Farmers Market goes up, and later upgrades and growth follow every few seconds, so every build animation plays under the title.
- The title layer is drawn on the HUD canvas (src/ui/title.ts): fade up from black, letterbox bars, SUPPLYLINE appearing letter by letter, a supply line with goods running along it, a tagline, captions that change with each shot, then Continue (when an autosave exists) and New game buttons. Enter starts. Starting fades to black, loads the player's world behind it, and fades up; first-time players then get the guide.
- The showcase world is never saved (`showcase` flag). Links with demo, map, seed, fresh or shot in the hash skip the title; `#notitle` skips it, `#title-shot` shows it frozen for screenshots.

## Graphics overhaul, segment 1: light and sky
- Deeper sky gradient with a warm horizon band, fog colour matched to it, warmer sun, green-tinted ground bounce, exposure 1.12.
- Planned next: 2 water and shore, 3 terrain, 4 trees, 5 buildings.

## Graphics overhaul, segment 2: ambient occlusion
- Frames closer than 150 units go through an EffectComposer: 4x MSAA render, GTAO ambient occlusion (radius follows view height), then OutputPass for tone mapping. From space it draws straight to the screen.

## The bank
- New sim/bank.ts: loans (limit from tier and earnings, 1% per minute compounding), savings (0.4% per minute), and a market fund (seeded random walk with slow cycles, 2% sell fee). Opens at Tier 1, key B, top-bar button and a Bank tab. State is the optional world.bank, so old saves load.
- Real-money purchases are a closed card (REAL_MONEY_ENABLED = false): they need a payment provider and server-side confirmation, not built.
- Tests in sim/bank.test.ts.
- The money pill at top left is now the bank button (small bank icon at its right end, accent outline when open); the separate bank button on the right is gone. The Bank tab and B key remain.
- Trucks caught out on a road that is taken out no longer reset to home: the old line is kept on the vehicle (Vehicle.back), it drives home along it, the load goes back in the store, then it waits for a road. Status reads "The road was removed: heading home".
- Roads and track now join buildings across the whole connected network (world.linkNetwork): a road that runs onto a town street, another road or a highway gives every pair of buildings on it that could trade a lane. Fixes "not joined" when it was, and highway-to-street links. Toast lists the routes opened.
- Removal animations: a demolished building shudders and folds into the ground in dust (1.7 s); a sold truck shrinks away with a puff (0.5 s). `leaving` list in game3d.
- linkNetwork now enters a town lot only from its own door (a lot beside two streets was skipped), and runs every 10 s of game time for road and rail, so old saves and growing towns get their buildings joined too (about 1.4 ms per call on the demo base).

## Districts as buildings
- Each town sets aside district lots (TownLayout.civic, 22 per town, 26 per city) beside its streets after the for-sale plots; an unclaimed lot is still homes. Building a district gives it a lot (place.districtLots) and a Site of kind district (dock: civic) with a door on the street (entryTile covers civic lots), so roads, lanes, linkNetwork and trucks treat it like the Market.
- Trucks drop goods at it (deliver adds to stock and pays like a dock sale); it uses them up (0.006 per tick per level); its income and satisfaction now come from its own stock. Hubs and factories joined to one get the sale switched on automatically (sendToDistricts). Old saves get lots via ensureDistrictSites on load.
- The landmark is drawn on the lot facing its street with a drive, replacing the old home-tile slots. Three new districts: Community Centre (town 2), Amphitheatre (town 3), Stadium (town 4), with models.
- A town with no free lot says so on the card. District card shows own stock and Show on map; panel shows district level.

- Auto roads (findPath): resource spots cost 60 extra so a road keeps off them unless it has no other way; town streets are as cheap as any road to join. After a town or district show the camera cuts back to where the player was (watch(..., back); a click cancels it).

## Smaller ice caps, placement rules
- Map 1 is now 124 rows (14 rows of open sea added beyond each end; tools/maps/map1.cjs pads the 96-row drawing), so the playable grid reaches about 77 degrees and the polar caps shrink to a small disc. Latitude per row is now worked out from the map (a tile spans the same angle both ways), so old 96-row saves look exactly as before.
- Airports need flat, open, unbuilt ground (7 of 8 neighbours), a free side for a road, and distance from towns (airfieldError). A Rail Depot needs a way for track to leave the town from the hub (trackReaches); a boxed-in hub says so. Tests check the promise against the real path finder.

## Rail Yard is its own building
- New placeable Rail Yard (Logistics, Tier 2, $3,000): a hub (stores goods, pulls, pushes) that trains call at. It goes just outside a town, within a few tiles of its last street, on open ground (railyardError); never in the streets or lots. Trucks bring the town goods in and carry them on, like a dock; track runs yard to yard. Replaces the Rail Depot add-on on hubs (the button, buildDepot and depotError are gone; old saves keep depot hubs working through isRailHub). A plain hub in a town cannot take track.
- yardSpot(world, place) finds a spot for the bot and the demo; the quest now reads Build a Rail Yard.

## Economy pass, path quests, clearer towns, smarter roads, readable buildings
- Economy: vehicle running cost 5% to 3% of price per minute; City needs 20,000 growth (was 45,000), Town 8,000 (was 10,000), Metropolis 80,000 (was 150,000). Pacing bot: Tier 2 at 54 to 94 game minutes (was 118+), Tier 3 near 103. The bot also crashed on road-to-road routes (no home site); fixed.
- Path quests: each path has four quests (reach level 4, sell its goods, build 3 districts, build its capstone) paid in cash, tracked per path (world.pathDone). Finishing all four masters the path: its towns pay 10% more for the path's goods (Place.mastered). Shown under the path card in Manage town.
- Towns sheet: each card now says what is needed to level up in words, lists only the goods the market is short of ("Bring next", NEW tag for kinds it has never had, price and stock), folds the well-stocked ones into one line and the freight yard's raw goods into one line.
- Roads: buyersFor ranks buyers not yet joined by estimated takings per minute for one truck (price, room left, round trip), not just distance. The panel marks the best pick and shows the estimate. The next-step prompt uses the best pick.
- Look: every building (except docks and stations) carries a signboard on a pole at its back corner: a disc for camps, farms and pits, a square for factories, a diamond for logistics, coloured by the good it makes (blue for freight, orange rail yard, sky airport). Walls darken toward the ground and bleach toward the top in the building shader.

## 0.5: opening flythrough shows the whole game
- The demo base now has two airports on open grass joined by an air route with planes flying cargo, a Rail Yard with a train, box trucks grown into big rigs, a stadium and community centre in the big city and an amphitheatre in the first town.
- The opening flythrough is 10 shots over about 50 seconds: farm, rail yard, airport, planes between airports, stadium, amphitheatre, town growth. Captions retimed (Haul, Take off, Landmarks). Ships and boats are not in the game yet (sea transport is Phase 6), so they are not shown.


## Stadium, airports, planes, and a slower opening
- Airports are rebuilt at each level (airstrip, regional field with taxiway and jets, international hub with piers, two runways, tower, cargo hangars, car parks). Upgrading one needs a bigger town nearby: level 2 needs a Town (level 3), level 3 needs a City (level 4) (upgradeError, nearestPlace).
- Planes and jets are proper airliners: tapered fuselage, windows, swept wings, engines, tail fin and planes, colour stripe (the same model parks at the airports).
- Stadium is a bowl: tiers of seats in club colours, outer wall with slits, roof ring on bigger ones, striped pitch inside a track with markings, four floodlight masts, a gate and flags, and a scoreboard at level 3.
- Opening flythrough is about 162 seconds in 12 film shots with hard cuts, easing moves, follow shots on a big rig, a train and a plane, a slow handheld sway, and captions retimed (src/r3d/game3d.ts startShowcase; src/r3d/opening.ts).
- Opening-only scenery (not part of the game or the save): a cargo ship, tanker, tug and sailboat on the sea, a giant rubber duck, a lake monster that surfaces every 26 seconds, a hot air balloon over the town, and a flying saucer over the mountains lifting a cow. Ships are scenery only; sea transport is still a later phase.

## Islands and sea transport, sports venues, a long opening
- Sea transport: Port (Logistics, Tier 2, three looks by level) on open coast; Sea Route tool joins two ports over water (seaPath, createSeaRoute); ships Cargo Boat, Freighter, Container Ship (trade up). Quest: Build a Port, Open a sea route.
- Island specialties: coffee, mangoes, oil (new goods, Coffee Plantation, Mango Grove, Oil Well). Map 1 now has five big islands out in the ocean with hamlets (Ventura, Port Mango, Oilport, Kona, Northholm), the specialties only there, other resources held to a field, a wood and a meadow, and many more small islets. Markets ask for coffee and mangoes from level 2; the freight yard takes oil.
- Venues: Football Stadium (rounded-rectangle bowl, field with end zones), Baseball Park (true diamond, fan outfield, curved wall), Hockey Arena (rink painted on the roof), Coffee House, Beach Resort. The amphitheatre is built into the hills (red rock), on the water, or in the woods, by the terrain round its lot. Parts.prism makes any outline.
- Moving parts: pumpjack nods, radar turns, port crane trolleys lift boxes, windmills turn (anims.ts). Planes nose up and bank, ships pitch and roll, trains trail smoke.
- Opening film (about 4 minutes): logo card, a town grown from hamlet to metropolis with districts going up, building and port and airport levels 1 to 3, a showroom turntable with every vehicle tier and a shutter flash, follow shots of trucks, rail, ships and planes, and the venues. Mock menu panels act out choosing who buys, the bank and what a town needs. Cuts dip through black; buttons wait for the end; any key skips. Opening-only scenery: ships, lake monster, duck, balloon, saucer and cow, crop circle, Area 52, Bigfoot, the raccoon mayor and a few signs.
- Airport upgrades need a bigger town nearby (earlier in this release). Pacing and path quests as logged above.

## 0.7: warehouse and terminals, by-products, stuck diagnosis
- The depot is merged into the Warehouse (hub, stores and passes on goods). Rail Yard, Port and Airport are freight terminals. Raw sites make a by-product on their own line with their own buyers and trucks. diagnose.ts explains why a building is stuck, in words, with the one fix. Vehicles are built for their cargo (flatbed, open-top, tanker, box) and wait for full loads. New sectioned guide and building dashboards.

## 0.8: balance, badges, truck prompts, phone layout
- Balance: bigger and slower vehicles, sale multiplier 0.65, upkeep and raw rates tuned, storage 4x. Pace on the pacing bot: Tier 1 near 8 minutes, Tier 2 near 32.
- Stuck badge (real faults only) and a separate waiting-on-supply badge under the money; piling up is a tip, not a fault. N jumps to the next stuck building.
- Trucks leave home only with a full load. A load the buyer cannot take is carried home and sent to the next best buyer before loading again. Every joined buyer is a destination: trucks choose with Prefers and pinned destinations, there is no Sell here switch.
- "Ask me about trucks": a building with it on asks (card on screen, game keeps running) before buying a truck. Copy button on each truck.
- Demolishing a building or removing a road asks first. Esc closes every menu and tool. Only town growth animates (plus scaffolding on a building upgrade, added in 0.9).
- Building menu: inbound trucks with amounts, last 30 sold jobs with a price chart, full-width sections. First-time tips ring the exact button the quest needs (Tier 0). Phone layout: two-row top bar, compact build tray, 2x2 stat tiles. Version label (src/version.ts) in the menu.

## 0.9: pages, save files, valid spots, upgrade button
- Menus are dashboards with pages: a building has Overview, Selling and Trucks; a market has What it buys, Who sells here and The town; a town has Market, Specialisation and Districts; the production sheet has Buildings and Goods.
- Upgrade is the biggest button, at the top of a building's Overview (greyed with the reason when it cannot go up, green at the top level).
- Clicking a town opens its full menu (with what its markets buy) instead of a side panel. A building going up a level shows its scaffolding without moving the camera.
- Saves can be exported to a file (current game or a slot) and imported back (src/sim/saveio.ts, tests in saveio.test.ts). Importing replaces the current game after a second press.
- Placing a rail yard, airport or port lights every valid tile green (game3d updateSpots, a slice of the map per frame).
- Tabled: bigger, more realistic airport and rail yard models; contracts; larger maps; third-party items; text-size and colour-blind toggles.

## 0.10: the bank explained, quiet vehicle upgrades
- Bank menu: each account says how it works in plain words, with a Today and an All time line (dollars and percent) and what it earns or costs per minute right now. Loans show interest added and paid; savings show interest earned; the market fund shows its price move on your units today, and all-time profit counting both what was sold and what is held. Net worth shows how it moved today. A bank day is ten minutes of play (bank.ts bankReport, DAY_TICKS, marks every ten seconds).
- Upgrading a vehicle changes nothing but the vehicle: the menu stays open, nothing is deselected, the camera does not move and there is no toast unless it fails.


## Oct 18, 2026: desktop version planned
- Chris wants a downloadable game with patches, saves and settings all handled in one place, plus a higher graphics ceiling. Decision: Electron app from the same code, GitHub download first, Steam later; browser version stays.
- Honest finding: wrapping alone changes little (same Chromium and WebGL). The big gains are WebGPU, lighting and post-processing, real textured animated art, and streamed worlds. A native engine rewrite is the only higher ceiling and is not planned.
- Written up in docs/05-desktop-version.md (ceiling ladder, all-in-one features, wish list, build order). Added as Phase 7 in the tracker, a section in the feature map, three open questions, and two answered decisions.
- Ground rules added to docs/05-desktop-version.md before any build: truck capacity per building by level (none exists today, buyError in sim/world.ts has no cap check), the outskirts node rule, code and release rules, and an order of work. Tracker Phase 7.0 holds the checklist.
- Truck cap decided: 2 / 4 / 6 slots at levels 1 to 3, one pool per product line (lumber and sawdust separate). At airports trucks and planes share a pool and a plane takes 2 slots. Levels 1 to 3 only add more trucks; level 4 unlocks trade-up to bigger trucks (needs a new building level 4). Docs updated; open questions hold the unset numbers.
- Decided: a bigger truck is still 1 slot; buildings get 8 levels (code has MAX_LEVEL 3). Slot and unlock numbers for levels 4 to 8 are proposals in 05-desktop-version.md.
- Idea added: customizable trains. Add wagons as an upgrade within a train; wagon cap set by rail yard level; wagon type follows cargo. Written in 05-desktop-version.md and tracker 7.3.
- Decided: ships and planes do not copy the train wagon idea. Each mode gets its own edge and quality-of-life perks, and mixing modes earns bonuses (containers, hub bonus, first mile, shared dispatch). Written in 05-desktop-version.md and tracker 7.3.
- Research pass added to 05-desktop-version.md: twelve candidates from OpenTTD, Factorio, Cities: Skylines, Transport Fever and Railroad Tycoon, tech foundations (sim in a Web Worker first), and a release order: 0.14 sim rules, 0.15 foundations, 0.16 the .exe.
- QoL master list and a revised release plan (0.14 to 0.24+) added to 05-desktop-version.md; QoL batches ship between the big pieces. Tracker 7.3c holds the checklist.
- Chris moved the world to the front: release 0.14 is now the layered world (globe, land, mountains, rivers, lakes, then towns with reserved growth room, nodes in the outskirts, corridors, scenery), a claim map and placement validator so nothing is ever deleted. Sim rules moved to 0.15. Note: version.ts still reads 0.12 though 0.13 shipped.
- Districts rule added to 0.14: each district gets a permanent reserved lot; upgrades add buildings onto it and never remove or replace existing ones. Found in the code: townmodel.ts draws district landmarks without adding them to the list of placed homes, so homes and towers can overlap them.
- Size research: world width is tiles around the globe, rows are about width/2, so doubling width is 4x tiles. 0.14 targets Large (384 wide, 4x); Huge, Giant, Enormous need chunking, the worker and the .exe. Table in 05-desktop-version.md.

## 0.14: the world foundation (first part)
- Audit over 40 seeds found towns overlapping each other in 14 seeds and resource nodes within two tiles of a town's grown footprint in every seed. Both fixed in sim/features.ts: a town is only kept if its fully grown footprint plus a one-tile gap touches no other town (settle), nodes keep 3 tiles from every town's grown footprint (NODE_TOWN_BUFFER), and an airport's front tile can no longer sit on a node. Guarded by src/sim/claims.test.ts (25 seeds plus Map 1).
- Towns spread out: bigger spacing on worlds wider than 200 tiles and about one town per 1,100 tiles; cities scale with area (3 to 6).
- New game asks which world: Map 1 (hand-made), Small 192, Medium 288, Large 384 (WORLD_SIZES in sim/defs.ts, sizeModal in ui/hud.ts). A Large world builds in about 3.5 seconds in headless software rendering.
- Districts: the town model now counts a district's lot as taken (townmodel.ts), so homes and towers never build over it. Lots a town has not opened yet are staked out instead of showing houses that vanish when the lot opens.
- Fixed: the minimap image kept a dead texture when the world changed size (imui.ts).
- Known gaps: Map 1's hand-placed island goods (coffee, mango, oil) still sit beside island towns; rivers, lakes, mountain passes and road corridors are not in the generator yet; the pacing bot has not been re-run on the new worlds; old saves keep their world.

## 0.14: the rest of the world foundation
- Towns blend (Chris asked for towns and cities to grow into each other where possible, never swallowed): blendPartner in townlayout.ts. Each town has at most one partner (its nearest, mutual, close, 40% of pairs); their main streets meet in the middle; world.blend is set on new worlds only.
- Rivers and lakes: mapgen.ts carveRivers cuts one-tile rivers from the coast through lowland (no more than 22 above sea level), each ending in a small lake, before towns and nodes are placed. Seen in the render as winding water with sandy banks.
- Corridors: sim/corridors.ts finds the cheapest route between each town and its two nearest neighbours (Dijkstra over the land, a range crossed at its lowest point). Nodes and trees keep off them. Fixed a bug on the way: distances stored as Float32 made the search loop for ever (17 s on Map 1); Float64 fixes it.
- Placement: roads are no longer allowed over ground a town will grow over (homes, lots, districts), only along its future streets. A new test (placement.test.ts) places many buildings on several worlds and lays roads: every placement uses free ground and nothing standing is moved.
- Nodes: every world gets every kind of node (a fallback finds clay, rock, ore, coal or orchards near a town if the buffers left none), and the start town has forest, fields and meadow close.
- Map 1: island goods keep 8 tiles clear of island towns (the tiny twin island excepted); map rebaked.
- Pacing bot on seed 11 after all this: Tier 1 at 7.7 minutes, Tier 2 at 32.2 minutes, as before.

## 0.14: last additions before release
- Joined towns work together (world.ts: JOIN_SHARE, JOIN_CATCH_UP, growthKinds, metroBonus, partnerOf); worldSteps generator makes a world a step at a time for the new-world progress bar; carvePasses cuts the ridge where a corridor crosses it; claims.ts is the claim map (claimAt, blockedBy) with claimmap.test.ts checking it against placeError over a whole world; frame readout on F3; more bushes and rocks in scenery.ts.
- An old save (no blend, no partners) loads and runs unchanged.

## 0.15 step 2: node families and belts
- sim/noderules.ts: node families (farming, mining, woods, shore, island). Kin blend into belts (65% of picks join an existing node of the family, 3 to 5 tiles off, along the same stretch), strangers keep 7 tiles apart, and no belt has more than 6 nodes within 9 tiles (NodeBook makes the check quick). The start town's first forest, field and meadow may sit closer (4). Wired into features.ts spread(); old NODE_GAP removed.
- Seen: a pasture-and-orchard belt side by side in one valley on a Large world.

## 0.15 steps 3 and 4: Map 2, The Continental
- Chris: all maps made by hand, random maps not worked on. The new-game picker now offers Map 1 and Map 2 only (WORLD_SIZES); random worlds stay in RANDOM_SIZES for tests and #seed URLs.
- tools/maps/map2.cjs: 384 x 128, 85.6% land. Western cordillera and coast range, a great river system with flood-plain valleys running south to a gulf, a chain of lakes in the north-east, low eastern highlands (the coal country), a far-eastern range, climate woods (thin on the plains, thick on wet slopes and river banks), dry country in the south-west, 65 towns and cities spaced by the same rules as everywhere else, and oil, coffee and mango sites placed where they belong. The map's specials are now preset nodes (features.ts PresetNode), so every other node keeps clear of them.
- Scenery thins per tile on mostly-land worlds so the number of trees drawn stays about the same (Map 2 loads in about 5 s headless, with about 337,000 plants and rocks).
- Scale charter written (05-desktop-version.md): distances are compressed, proportions and geography logic are kept, vehicle speed ratios are listed for a later balance pass.

## 2026-10-18 Map 2 rebuilt at about 31% water, then reshaped

Water raised from 14% to 31% (the 15% target was too low). Three continents split by seas: the wide Pacific (planes), a Western Channel and a narrow Eastern Strait (ships), plus island groups. Coffee and mangoes only grow overseas of the start town, oil on the gulf coast and the western continent, so docks and planes have real work. Map 1 left as is for now; a smaller map comes after the assets are made.

(Same day, reshaped) The strips looked like a beach ball, so the continents are now polygons with ragged coasts: a west continent with a southern lobe, a notched central continent with the gulf, an eastern continent, a south-eastern island continent and island chains. Water is about 46%, 55 towns.

## 2026-10-18 0.16 polish

Ocean animation removed (plain blue with depth shading, no foam). Dirt tracks drawn as continuous strips, not round spots. Resource nodes of a belt stand on a square lattice, in straight rows and columns (4 tiles apart), and a node that has kin near it must line up with them. Forest nodes now scale with forest size (one per about 18 tiles) and small stands get one too, so most trees have a forestry node (76% of forest tiles within 8 tiles of one on Map 2).

## 2026-10-18 0.17 start: natural town reserve and gates

The flat dark rectangle around each town is gone. Ground a town will grow over now keeps its trees, bushes and rocks (thinned by 40%), with survey stakes at the corners. When a town levels up, the wave of growth fells the trees on the new ground as it passes. Each town has up to four gates (the outer ends of its main streets); they glow gold while a road tool is active, and planned streets count as cheap road so routes join them. The Back button moved above the hint chip and now glides home, and keeps the first view when two towns grow in a row.

Reserved land (same day): the big dark flat rectangles were stadium, ballpark and arena campus lots, painted as worn ground. Reserved ground (growth ring and unclaimed campus lots) now keeps the look of the country around it, wooded where the land around is wooded, and is only cleared when a district takes the lot or the town grows over it. With a road or building tool active it is washed amber and the gates glow gold, and the hint line says so.

Gates and lanes (same day): campuses were being built across the ends of the main street, so a town could be walled in. Campus lots now attach only to side streets, and a town's two gates are the ends of its main street, never inside a campus lot (tested on Map 2). With a road tool active the planned streets show as gold lanes through the amber reserved ground: roads may follow them.

Black reserved ground (found): the ambient-occlusion pass draws every mesh as a solid sheet, including the see-through amber wash, so at close zoom it blacked out the ground under it. The wash is now left out of that pass. It is also always on at every height and tool (soft by default, stronger with a road or build tool) and is remade when a town grows or a district takes a lot.

## 2026-10-18 0.17: land plots

New games now lay out land as a patchwork of plots (src/sim/land.ts): a fixed grid of 4-tile cells merged into 1x1, 2x1, 1x2 or 2x2 blocks by a seeded roll. A building outside a town needs its plot bought first (click the plot with a building tool active, then click again to build). Plots touching a town's ground are the town's and not for sale. Price follows the ground (grass 14, forest 9, mountain 7 per tile, plus resource nodes), dearer within 10 tiles of a town (x1.5) or 20 (x1.2). New games start owning the plots of the start town's nearest forest, field and meadow. Plots show as outlines while a building tool is active: white for sale, gold owned. Worlds from tests and older saves keep the old build-anywhere rules (world.landRules is off). Roads are public: no plot needed.

## 0.70 to 0.98 (Oct 17 to 24, 2026): yards, goods overhaul, open placement, fog of war

**Supply Yard and Distribution Warehouse (0.72 to 0.88)**
- The Supply Yard holds building materials only (lumber, gravel, granite, concrete, steel...). It stores them for the town's builds and pays nothing. Its page shows "N of M stored" and "for building". A new Supply Yard has no truck: buy one on its Trucks tab (0.78 to 0.79), then send lumber to the Market site.
- The Distribution Warehouse is for finished goods shipped to other towns' Markets. The Market takes finished goods plus fresh food.
- Towns start closed: bare building sites until the yard and Market are built from lumber (0.74, 0.77). Building them pays nothing. First quests walk through it.
- Truck reach became very long (Box Truck 900 tiles); fuel, wear and fleet size are the real limits (0.75, 0.76). Drivers take quicker roads as roads are built and waste less fuel with experience (0.73).
- Drivers are hired and moved. Buying a truck lets you move a working driver into it, leaving the old truck parked (0.84). The driver picker scrolls (0.85). A Mechanic Shop repairs wear.
- Bank open from tier 0 (0.80). Quest bar shows lumber progress for the yard and Market.
- Vehicle upgrade buttons are gone; you buy the bigger class and move the driver. Quests say "Buy a Big Box Truck" (0.89).
- Low on cash badge: quiet help when costs outrun sales, no penalties (0.71). Desktop checks for an update at start (0.70).

**Goods and sites overhaul (0.90 to 0.93)**
- About 45 new goods and 38 new sites: crops (vegetables, potatoes, sugar beet, sunflower, hops, barley, grapes), animals (eggs, pork, wool, honey, chickens, pigs, sheep), water, salt, spices, cocoa, and kitchens and plants (creamery, juice press, sugar refinery, oil press, pastry kitchen, noodle maker, pizzeria, cannery, butcher, brewery, soda plant, winery, distillery, ice cream, crisps, sausage, chocolate, candles, pillows, granite, refinery and more). Recipes mix several inputs.
- By-products: every by-product has two or more outlets, one a real factory. Recycling Yard takes any by-product at half price (6 units a minute per good). Garden Supply turns it into mulch; concrete takes gravel. Wood chips, spent grain, husks, feathers, wax and fish scraps all have new uses.
- Fishing Harbor on the coast (0.92): fishing boats go out and come back on their own, each boat raises the catch. Trucks carry fish to the Market, smokehouse, fish cannery and fish meal plant.
- src/sim/flows.ts and flows.test.ts check the whole economy: every good has a maker and an outlet, by-products have outlets, and nothing is made more than four times faster than it is used. World generation stays the same when goods are added (frozen taste lists in features.ts).
- Price and recipe balance pass (0.93), using BALANCE=1 npx vitest run src/sim/balance.test.ts.
- 16 new radio stations (0.86).

**Look and models (0.94 to 0.96)**
- Models for all new sites; every building has a different model at each level 1 to 3; towns have different models per growth level. Buildings and houses never stand on a road (0.94, 0.95).
- Open placement (0.95, 0.98): anything that needs no resource node (farms, factories, warehouses) goes on any open ground in the green zone or on a town plot. A node is only the better spot. Every such build tool lights open ground green (same green as the road tool), and plots for sale gold.
- Truck level-up panel (0.95): shows the driver's next rank progress and a checklist of exactly what the next truck needs, with Upgrade Building and Buy buttons.
- Windows: app opens at 1920x1080, minimum 1100x720 (0.85, 0.87). The build tray spreads across the window and scrolls by rows with the wheel (0.96).

**Fog of war (0.97)**
- Things far from the view (past the horizon or beyond a range set by zoom and graphics level) are hidden and not worked on: buildings, their moving parts and smoke, towns, and sleeping vehicles (checked every 20 frames). The sim itself keeps running. Screenshots and the opening cinematic are never trimmed. F3 shows an asleep count.

## 0.99 to 0.100: money balance

- New games start with $6,000 (was $1,500). Running costs cut: vehicles 1.5% of price a minute (was 4%), buildings 0.5% (was 1%), districts 1% (was 1.5%), driver wages $1, 1, 2, 3, 4 a minute by rank (were $2 to $16). Towns pay full list price (SALE_MULT 1, was 0.65).
- Why: the pacing bot spent its $1,500 in two minutes, paid $43 a minute in upkeep and earned nothing for 30 minutes because a town pays nothing until its yard and Market are built. Wages were more than half of all upkeep, and a Box Truck earns only a few dollars a minute.
- Company page: "Idle income a minute" and "$X/min idle" replace "Lost a minute"; those numbers are income a stalled building would make, not costs.
- Measured with the bot on four seeds (cost share of earnings at 10, 30 and 80 minutes): about 25 to 35% in the good seed, 60 to 80% in the others at 80 minutes. The bot buys vehicles until it is broke, so that shows where the pinch is, not a ceiling. Still open: many trucks sit idle on stalled buildings (5 of 23 moving in one run), and the bot cannot finish a town's level 4 materials (sand), so Tier 2 is slow.

## Skilled bot (after 0.100)

- bot.ts has a second playing style, 'skilled' (pacing.test.ts uses it by default; PACING_STYLE=quest for the old one). It plays one home town at a time, builds three more Forestry Camps while the Market is closed, makes what the town's Market buys and roads it in, builds level materials, keeps a cash reserve, upgrades only buildings that are selling, adds trucks only where goods pile up, and services worn trucks.
- What it found on four maps at 80 minutes: earnings are about $75k to $210k with costs 33 to 48% of earnings; Tier 1 at about 10 minutes (the quest bot took 18 to 29). Without servicing trucks the same bot earned $22k to $27k on two of the maps: a truck at full wear runs slow, carries 30% less and waits for the shop. Servicing is the biggest single money lever.
- Still true: the first 10 minutes earn nothing (lumber for the yard and Market pays nothing, and level 2 buildings need Tier 1), cash piles up from minute 30 on, and towns stay at level 2 at 80 minutes, so growth materials, not money, set the pace past Tier 1.

## 0.101: fields come with the farm, real nodes stay put

- Farmland, pasture and orchard nodes are no longer places on the map (SOFT_NODES in defs.ts): no painted field, meadow or orchard ground, no props, no ring markers, and they never block building. A Farm, Ranch, Orchard or any crop or animal farm stands on any open ground or town plot and brings its own fields, paddock or trees in its model. The world data still holds those nodes (so worlds do not change) but nodeAt ignores them.
- Forest, quarry, mine, coal, clay, oil, coffee and mango nodes are permanent spots again: the site that works them must stand on the node (needsNode). A node of one kind blocks every other building, factories included (before, a factory could be placed on any node).

## 0.102: smarter "sell to" choices

- A truck set to best price, best earnings, highest demand or closest now judges a run by what the load would really earn when it arrives: the buyer's price after trucks already on their way have filled the gap (inbound loads count), less the fuel for the round trip. Best earnings is money a minute for a full round trip. Highest demand and closest break ties by distance. A truck only changes run between trips when the new one is clearly better (8%), so it does not flip back and forth.

## 0.103: a calmer menu, and a buyer for everything

- Buildings now open in four steps (OPENS in defs.ts) instead of almost all at Tier 1: Tier 0 has 11 staples (forestry, farm, clay, ranch, orchard, quarry, sawmill, mill, bakery, dairy, wood yard); Tier 1 the next wave (water, hens, vegetables, potatoes, sugar, jam, feed, creamery, juice, bricks...); Tier 2 the wider farm, kitchen and brewery inputs plus cement, glass, smelter, tools, rail yard and port; Tier 3 the specialist plants (pizza, brewery, soda, ice cream, crisps, sausage, chocolate, candles, pillows, refinery, steel, machinery, airport, spices, cocoa). A building never opens before the ones that make its ingredients (flows tests and the quest bot pass).
- Every Market buys every by-product (feathers, sawdust, bran, whey, wax, husks, straw, pulp, wood chips, spent grain, fish scraps, slag, gravel) at 60% of its price. This is salvage: money only, it does not grow the town and does not count as a kind of good. The Recycling Yard and factory uses remain.
- Market lists gain flour, sugar and salt from level 2 and spices, pork and grapes from level 3, so every food has a buyer.
- All maps share one set of rules: Map 1, Map 2 and the next map only differ in terrain, towns and resource positions (createWorldFromMap).

## 0.104: no more by-product jams, and a buyer for everything a new building makes

What the sims showed (skilled bot, four maps, Tier 0 and Tier 1):
- By-products never stalled the main good, but a by-product shelf over 40% put a "buy a truck / nobody buys it" warning on the building. Following it meant a truck carrying sawdust at $0.6 a unit: a load is worth about $7 and the round trip costs more in fuel, wages and upkeep. That was the money loss.
- Piles of 400 to 2,900 units of sawdust, wood chips, bran, whey, pulp and feathers stood unsold after 45 minutes, and no run ever bought a by-product truck.
- Tier 1 buildings made things no level 1 Market bought: jam, butter, juice, feed, mulch, water, pellets, coal, paper, yarn, cotton, ore. Their owners' output piled up.
- A level 1 Market takes only about 12 units a minute of each good (0.02 a tick times the level), well under what one bakery, dairy or jam factory makes, so one Market is a ceiling on one chain.

What changed:
- Every building scraps its by-products above half a shelf for 25% of their price, so a leftover never jams anything or needs a truck. The by-product warning only speaks if trucks keep the shelf above 75%.
- Level 1 Markets now buy jam, butter, juice, water, feed, mulch, pellets and coal. Spirits, books and machinery are on the later Market lists. Pellet mill moved to Tier 1 (it is the sawdust sink); paper mill, spin mill, cotton farm and ore mine moved to Tier 2; hop farm to Tier 3; clay pit to Tier 1. New test: nothing opens before there is a buyer for what it makes.
- Still open: a town stuck at level 1 for want of bricks (the clay pit can be 100+ road tiles from the town on some maps), and many idle trucks (60 to 90% of the fleet idle in the bot runs).

## 0.105: idle trucks and town growth

- Each vehicle now tracks how much of the last minute it spent moving (busy). A vehicle below 0.2 is idle. Idle vehicles cost 40% to 100% of their upkeep (down to 40% when fully idle). The Company page counts working versus idle by this (before, a truck waiting for a load counted as working because it had a route). The Fleet sheet has "SELL N IDLE": it sells the idle surplus, keeping one vehicle on every line, and shows what comes back and what it saves a minute.
- A building with piled-up goods and idle trucks no longer suggests more trucks: it says to check the buyer or the road.
- Badly worn trucks (85%) and broken-down trucks (100%) now put a message in the log. A truck at full wear stops until it is serviced by hand or a Mechanic Shop repairs it (unchanged).
- Town growth: level 1 to 2 now needs lumber only (250, tropical 300). Every town has a forest within about 40 tiles, but clay, stone and sand are 40 to 100 tiles from a quarter or more of towns on Maps 1 and 2. Later levels keep the style's materials in smaller amounts (for example temperate level 2 to 3: lumber 250, bricks 200). With this all four test maps reach level 2 in the first 25 minutes (before: one map stayed at level 1 for an hour), and the careful bot earns $76k to $184k in an hour with costs at 16 to 34% of earnings.

## 0.106: broken trucks, clay for every town, boats at sea

- A truck at full wear with no Mechanic Shop is now patched by its driver after about four minutes, for 1.5 times a service, and comes back at 35% wear (a shop is still faster, cheaper and better).
- Towns on Maps 1 and 2 with no clay bank or quarry within 30 tiles get one 10 to 24 tiles away (addMaterialNodes), placed by the same spacing rules as the others. New games only; saves keep their own nodes. Clay and quarry medians are now 20 and 25 to 33 tiles.
- Sand Pit, Water Pump and Salt Pan no longer need a node (they were taking the few clay banks, so no Clay Pit could be built and bricks never came). Seed 7 went from stuck at level 2 to level 3 in 34 minutes.
- Town building is cheaper: the Supply Yard needs 80 lumber and the Market 120 (was 100 and 150). The first quest says to build two or three Forestry Camps.
- Markets use up goods 50% faster (0.03 a tick per level), so a Market takes about 18 units a minute of each good at level 1.
- Fishing boats circle in the water off their harbor with the boat model.
- Pacing with the careful bot: Tier 1 at 8 minutes, level 2 at 17, level 3 at 34 to 60, Tier 2 (a level 4 town) at 105 minutes on one map and not within 150 on the others. Tier 2 stays the slow gate.
- Old saves: a test now loads a save missing the newer fields, with a farm still pointing at a field node, and plays on.

## 0.107: a crew of mechanics

- Mechanics work like drivers. Each Mechanic Shop has room for its level plus one. Three applicants a few minutes at a time (better ones as the tier rises) are hired at the shop for a fee ($0, 120, 350, 800, 1,800 by rank) and paid a wage a minute ($2, 3, 4, 6, 9). Rank comes from repairs done (0, 6, 18, 40, 80): Apprentice, Mechanic, Skilled, Master, Chief.
- A broken truck joins the queue of the mechanic who is free soonest. Each rank above apprentice takes 12% off the repair time and 5% off the bill, and a repair leaves the truck 8% better than new per rank, wearing off as it drives. Each repair adds to the mechanic's experience.
- No shop, or a shop with nobody hired: the roadside patch (about four minutes, 1.5 times a service, 35% wear left).
- The shop's panel lists its mechanics (rank, repairs, wage, working or free, Let go), the three applicants with Hire, the trucks waiting, and the shop upgrade. "Train the mechanic" is gone. An old save's trained mechanic level becomes a hired mechanic of that rank on load; a demolished shop's crew is let go. Wages are part of the company's running costs.

## 0.108: yards hold a limited number of vehicles, and Map 3 (in progress)

- A building's yard holds a fixed number of vehicles in all, across every line: 4 at level 1, then 2 more a level, 22 at level 10 (FLEET_BASE 2, FLEET_PER_LEVEL 2). Before, the limit was 5 to 23 for each line separately. Vehicles already owned over the new limit stay; no more can be bought until the building is upgraded.
- Map 3, The Meridian Sea (tools/maps/map3.cjs bakes src/maps/map3.json; `node tools/maps/map3.cjs preview.png` draws a flat picture): 768 by 256, four times Map 2's area, 38% land, 141 towns (17 cities), 24 land masses, 24 island goods on the lands away from the start continent. It is shaped to look nothing like Maps 1 and 2: land comes from soft blobs bent by a warp of the ground (no long straight strips, only coasts that bend), a great crescent continent curls round an inland sea, a cold northern land, a ringed eastern basin, belts of islands. Ranges follow curving noise ridges, rivers run from the high ground down to the sea, woods grow in big clumps.
- Every wood of 26 tiles or more gets a Forestry node (map.forestNodes, addForestNodes in world.ts), placed nearest its middle by the usual node spacing. Only Map 3 uses it so far.
- In the world menu Map 3 is listed after Maps 1 and 2 as IN PROGRESS, VIEW ONLY: clicking it opens a picture of the whole map (cities, towns and island goods marked; the data loads only when asked, as its own 600 kB file) and it cannot be started. map3.test.ts checks it builds, keeps its node rules and plays.
- Not done for Map 3 yet (the groundwork for size): the ground picture is one texture capped at 4,096 pixels across (5 pixels a tile at this width), trees are drawn for the whole globe, many checks scan every tile, and a save holds the whole map. They come before it can be played.

## 0.109: Map 3 grid and test build

- The Map 3 preview is drawn with a grid: columns A to X, rows 1 to 8, each cell 32 tiles (A1 top left). Pointing at the map shows the cell and the tile. Use the cell name (for example "K4") to say where something is. `src/sim/grid.ts` has `gridId` and `gridRange`.
- "Try it (test build)" on the preview starts Map 3 as a playable test. It may be slow: the ground picture is still capped at 4096 pixels across (5 pixels a tile), and the trees and lookups are not yet tuned for the size.

## 0.110: more land on Map 3

- Map 3 is now 50% land (was 38%): 181 towns (17 cities), 16 land masses, 24 rivers, with the inland sea and ocean channels kept. Same coasts and shapes, wider.

## 0.111: smoothness first steps

- The frame readout (F3) also shows draw calls and thousands of triangles for the whole frame, so slowness can be traced to what is drawn.
- The web page starts on Balanced (no ambient occlusion, bloom or extra antialiasing, pixel ratio 1); the desktop app still starts on High on a good card. A saved choice still wins.
- Slow play (under 24 fps) lowers the quality step after 4 seconds instead of 7.

## 0.112: grid in the game

- On worlds 600 or more tiles wide (Map 3) a badge at the top left always shows the grid cell the view is centred on and its tile (for example "GRID K4  330, 100"). The world map header shows the same, and the world map has grid lines, with cell names when opened large (ENLARGE).

## 0.113: compact saves (Map 3 groundwork)

- A world of 100,000 tiles or more (Map 3) is saved with its ground (terrain, heights, regions) packed into short strings: about 3.2 MB down to under 1 MB, so the autosave and five slots fit browser storage and saving no longer stalls the game. Older and smaller saves load as before. See `src/sim/compact.ts`.

## 0.114: About page

- Menu > About: the game (version, web or Windows app, download size about 31 MB), what it needs (draft: smallest, comfortable, best looks), this computer (graphics card, threads, memory, screen), how it runs right now (fps, frame time, logic and draw time, draw calls, triangles, quality) and this world (map, size, towns, buildings, vehicles, crew, save size). The needs numbers are guesses until more machines are tried.
