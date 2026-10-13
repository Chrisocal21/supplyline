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
