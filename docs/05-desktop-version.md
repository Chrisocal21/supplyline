# 05 - Desktop version (the .exe plan)

Written 2026-10-18. Read the TL;DR, skip the rest until you need it.

## TL;DR

- Wrapping the game in an .exe does **not** make it prettier by itself. It is the same engine inside a window.
- It **does** unlock: smooth performance, WebGPU, disk saves, offline, auto-updates, and Steam.
- The real graphics gains come from **WebGPU + better art**, not from the .exe alone.
- The only way to a truly higher ceiling is a full engine (Unity / Godot / Unreal). That is a rewrite. Not needed yet.
- Plan: Electron wrapper -> auto-updater -> WebGPU renderer. Web version stays alive.

---

## What changes with an .exe

| Thing | Browser now | Desktop .exe |
|---|---|---|
| Rendering engine | Three.js on WebGL | Same, then upgrade to WebGPU |
| Tab throttling | Yes, pauses when hidden | None |
| GPU choice | Browser decides (often weak GPU) | We can force the strong GPU |
| Saves | localStorage, can be wiped, small | Real files on disk, unlimited slots |
| Big assets | Download every visit | Sit on disk, load fast |
| Offline | No | Yes |
| Updates | Just refresh | Auto-download patch, restart |
| Fullscreen | Awkward | Proper |
| Steam | No | Yes |
| Install | Open a link | Installer (~100 MB) |

---

## The ceiling, step by step

Each rung is something we can reach. Higher rung = more work.

### Rung 1 - Wrapped in Electron (the .exe)
- Same look as today, but smoother and steadier.
- Disk saves, offline, fullscreen, icon.
- Ceiling raised: **a little.**

### Rung 2 - WebGPU renderer
This is the big graphics jump. Needs Chromium, which Electron gives us for free.
- Many more things on screen: thousands of buildings, trees, vehicles, no slowdown.
- Compute shaders: moving crowds, traffic, smoke, water done on the GPU.
- Better shadows (soft, long, sunrise/sunset light).
- Post-processing: bloom, ambient occlusion, depth of field, tilt-shift "miniature" look, colour grading.
- Night with lit windows and headlights.
- Weather: rain, snow, fog, wet roads.
- Ceiling raised: **a lot.**

### Rung 3 - Better art
No engine upgrade gives this. It is the biggest look change of all.
- Real textured models for buildings, vehicles, industry (not simple shapes).
- Normal maps, baked lighting, proper materials.
- Animated parts: spinning wheels, crane arms, smoke stacks, workers.
- Bigger texture sizes (disk makes this cheap).
- Ceiling raised: **a lot, but it costs art time.** Could be made in Blender or bought/found.

### Rung 4 - Sound and feel
- Real audio: engines, trains, town ambience, music by region.
- Needs lots of files, which suits disk storage.
- Controller / better key rebinding.

### Rung 5 - Full engine rewrite (Unity / Godot / Unreal)
- Highest ceiling: movie-grade lighting, huge worlds, ray tracing.
- But: rewrite everything, new language (C# / GDScript / C++), months of work.
- Our `src/sim` is plain TypeScript with no renderer inside, so the rules could be ported more easily than usual.
- Ceiling raised: **the most, but only worth it if Rung 2 + 3 hit a wall.**

---

## How to raise the ceiling A LOT (biggest first)

1. **WebGPU.** Compute shaders put work on the GPU: 50,000 trees, 10,000 moving vehicles, live crowds. Real-time shadows for the whole world, water with reflections and foam, volumetric fog, clouds, smoke. About 80% of the engine gain.
2. **Lighting + post-processing (cheapest big win).** Bloom, ambient occlusion, colour grading, tilt-shift "miniature" look. Day/night with lit windows, headlights, street lamps. Makes a flat game look expensive.
3. **Real art.** Textured models, normal maps, animation (wheels, cranes, smoke, workers), variety so no two houses match. Biggest visible jump, and it is an art job. Much can be generated in code (procedural buildings, foliage) or made in Blender.
4. **Systems the browser cannot hold.** Huge maps streamed from disk (far bigger than 288x96), terrain detail that streams in up close, seasons, weather and traffic all at once, vehicles that react to each other.
5. **Full engine (Unity / Godot / Unreal).** Ray tracing, film-grade lighting. A rewrite. Only if 1-4 hit a wall.

Realistic target with 1-3 done well: polished indie city-builder (Islanders, Townscaper, Cities in Motion territory). Not AAA.

---

## All-in-one: the game manages everything

Goal: the player never touches a file, a setting folder, or a website. Install once, everything else just happens.

### Updates
- Checks on launch, downloads in the background, "Update ready - restart".
- "What's new" screen after each update (we already write release notes).
- Release channels: Stable and Beta (opt in to test early patches).
- Rollback: if a patch breaks, one click goes back to the previous version.
- Delta updates: only changed files download, so patches are small.

### Saves
- Autosave on a timer and on quit, never lose progress.
- Many save slots with screenshot, date, play time, town count.
- Automatic backups (last N saves kept), so a bad save is never the end.
- Saves live in a normal folder (Documents/Supplyline) and can be copied.
- Import / export still works (we already have it).
- Old saves auto-migrate to new versions.
- Cloud saves: via Steam, or our own login later. Play on two machines.

### Settings and launcher
- Graphics presets (Low / Medium / High / Ultra) picked automatically from the GPU, changeable any time.
- Resolution, fullscreen, vsync, frame cap, UI scale, key rebinding, volume.
- Settings are saved and survive updates.

### Safety and support
- Crash reports sent automatically (opt in), with version and save info.
- "Report a bug" button that attaches the log and a screenshot.
- Log files in a known folder.
- Integrity check: "Repair game" button that re-downloads broken files.

### Extras that make it feel like a real game
- Start menu, loading screens with tips, credits.
- Achievements (local now, Steam later).
- Photo mode: free camera, hide the HUD, take a screenshot.
- Replays / time-lapse of your town growing.
- Mods and custom maps: drop a folder in, the game picks it up. Pairs with the hand-made map plan.
- Discord rich presence ("Tier 3, 12 towns").
- Leaderboards / daily challenge map (needs a small server).
- Controller support.
- Multiple languages.

### Platform choices that tie it together
- **Steam** gives updates, cloud saves, achievements, workshop mods, and a store page. One partner for most of this list.
- **Own launcher via GitHub** is free but we build every piece above ourselves.
- Can do both: same build, two ways to get it.

---

## A much bigger map, with cleaner node placement

Chris's ask (2026-10-18): the map should be a lot bigger, and resource nodes should sit out in the outskirts, cleanly away from towns and from any room a town will grow into.

Bigger map:
- Today's world is 288x96 tiles. The browser struggles to draw and hold much more; the desktop app can stream the world in chunks from disk and only draw what is near the camera.
- Needs: chunked terrain with detail that streams in up close, far-away chunks drawn simple, sim only fully ticking what is active, bigger map files (map1.json and the baked previews scale up).
- Multiple continents and island chains, long rail and air hauls that make Tier 3 and Tier 4 vehicles matter.

Node placement rules (outskirts, not in the way):
- Every town reserves a growth zone: its full level 5 footprint plus a buffer ring, calculated up front (`layoutOf` in sim/townlayout.ts already knows the footprint).
- Resource nodes (forest, farmland, quarry, mines, wells) are only placed outside every growth zone, and a minimum distance from any town.
- Nodes cluster in the outskirts as regions around a town, so each town has a hinterland, not nodes scattered randomly.
- Nodes keep clear of roads and rails the player might want to lay, and of each other (no overlapping footprints).
- Hand-made maps follow the same rule: the map baker (tools/maps) checks every node against the town zones and reports violations.
- Existing worlds and saves keep their old nodes; the new rule applies to new maps and seeds.

---

## Ground rules (settle these before the build starts)

Numbers marked "proposed" are first guesses to tune with the pacing bot.

### Truck capacity per building (Chris, 2026-10-18)
- Today there is no limit: `buyError` in sim/world.ts only checks mode, tier and money.
- New rule: every building has a **max truck count that rises with its level**, so upgrading a building is how you grow its fleet.
- Confirmed: level 1 holds 2 trucks, level 2 holds 4, level 3 holds 6. Warehouses and freight terminals (rail yard, port, airport) may get larger numbers because they relay more (still to tune).
- **Each product has its own slots.** Counted per product line, not per building: lumber and sawdust each get their own pool, so a sawmill at level 1 can run 2 lumber trucks and 2 sawdust trucks.
- **Levels 1 to 3 only add more trucks of the starting class.** No bigger trucks yet.
- **Level 4 unlocks trade-up** to the bigger truck class (the next class up the vehicle ladder), and each level after that unlocks the next class. **Buildings get 8 levels** (Chris, 2026-10-18); today they stop at level 3 (`MAX_LEVEL`, `LEVEL_SPEED`, `LEVEL_CAP` in sim/defs.ts).
- **A bigger truck still takes just 1 slot**, same as a small one. Trade-up is a pure power-up.
- Proposed slots for all 8 levels: 2, 4, 6, 8, 10, 12, 14, 16 (+2 per level). Proposed road unlocks: level 4 Big Box Truck, level 5 Big Rig, level 6 Truck Fleet; levels 7 and 8 are pure capacity and output. To tune with the pacing bot.
- **Airports are different.** A business has no plane attached; planes belong to the airport. At an airport, trucks and planes share the same pool and **a plane takes 2 slots**: with 2 free slots you can buy either 2 more trucks or 1 plane. Same idea for trains at a rail yard and ships at a port (each takes more than one slot; exact sizes to tune).
- The building menu shows "Trucks 3 / 4" per product line, and the Upgrade button says what it adds ("+2 truck slots", or "Unlocks bigger trucks" at level 4).
- Buying at the cap is blocked with the reason and the fix ("Upgrade to level 2 for 2 more slots").
- Trading up a vehicle keeps its slot (a bigger class that takes more slots is the open question below). Selling frees it.
- Old saves with more trucks than the new cap are allowed to keep them (grandfathered), they just cannot buy more until the building catches up.
- Needs a pacing re-run, since fleets now gate on upgrades, not just money.

### Customizable trains (Chris, 2026-10-18)
- A train is a locomotive plus wagons. The player adds wagons as an in-place upgrade, and each wagon adds capacity.
- Today a train has a fixed capacity (Freight Train 140, Heavy Haul 360) and the renderer already draws each carriage separately, so wagons are mostly a sim and menu change.
- Proposed: a Freight Train starts with 4 wagons and can grow to 8; a Heavy Haul Train starts at 8 and can grow to 16. Capacity per wagon is the class capacity divided by its starting wagons, so the numbers still line up with today.
- The wagon cap is set by the rail yard's level, because a longer train needs a longer platform. Level up the yard to allow longer trains.
- Wagon type follows the cargo, like truck bodies do: flat wagons for logs and steel, hoppers for grain and coal, tank wagons for liquids, boxcars for the rest.
- Each wagon costs money and adds upkeep; a longer train is slower to load and unload. That is the trade-off for the extra capacity.
- A train still takes the same slots at the yard however long it is (see the slot rules above).
- Ships and planes do NOT get the same wagon treatment (Chris, 2026-10-18). Each mode gets its own advantages instead, see the next section.

### Each mode has its own advantages, and they reward each other (Chris, 2026-10-18)
Goal: no mode is just a bigger version of another. Each does something the others cannot, and using them together pays more than using one alone. Quality of life, not only numbers.

| Mode | Its edge | Quality-of-life perks (proposed) |
|---|---|---|
| Truck | Goes anywhere there is a road, cheapest to start, first and last mile | Pick up and drop at any building on the road; quick reroute; ask-me prompts already exist; duplicate a truck in one click |
| Train | Cheapest per unit over long distance, huge loads, wagons | Add wagons; mixed cargo (different goods in different wagons on one trip); timetables (leave at a set time or when full); a station that loads and unloads fast |
| Ship | Biggest volume of all, cheap per unit, reaches islands | Container stacks to carry mixed goods; long standing orders; harbour queue so ships do not jam; islands only reachable by sea |
| Plane | Fastest, ignores terrain, no road or rail needed | Express: goods arrive fresh and sell at a premium; reaches mountains and far towns; scheduled flights; quick turnaround at the airport |

Synergies (the reason to mix modes):
- **Containers move between modes untouched.** A box loaded at a factory can go truck to train to ship without being unpacked, so a mixed chain loads and unloads faster than a single mode alone.
- **Hub bonus.** A terminal that links two or more modes (a rail yard with trucks feeding it, a port with trains behind it) gets a handling bonus: faster transfers and a bit more storage.
- **First and last mile.** Trucks feeding a train, ship or plane fill it quicker, so the big vehicle spends less time waiting.
- **Fresh premium needs the whole chain.** Perishables sell best when the air or fast leg is short and connected by trucks at both ends.
- **Shared dispatch.** One order sheet at a terminal can send a good down whichever mode is free or cheapest.
- Each synergy is shown in the building menu in plain words ("+20% faster loading: trucks feed this yard"), in the same style as the stuck diagnosis.
- The train menu shows "Wagons 6 / 8" with an Add wagon button, and the 3D train grows when you press it.

### Map and nodes
- Nodes only in the outskirts, outside every town's level 5 growth zone plus a buffer (see the map section above).
- Bigger map streams in chunks; the sim ticks only the active area.
- Hand-made maps are checked by the baker against the same rule.

### Code rules
- `src/sim` stays pure TypeScript and never imports a renderer, a platform API or Electron. The desktop shell only talks to the game through one small platform layer (saves, updates, achievements, settings).
- Saves carry a version number and migrate forward; never break an old save without a migration and a test.
- Every new rule gets a vitest test, and the pacing bot is re-run after any economy change.
- Web and desktop builds come from one codebase; features that need the desktop (disk saves, auto-update) degrade cleanly in the browser.
- WebGPU first, WebGL fallback; every graphics feature has a Low setting.
- Performance budget: 60 fps on a mid-range GPU at High; the quality picker steps down automatically.

### Release rules
- Each commit is a 0.X release with `src/version.ts` bumped; docs updated in the same commit.
- Desktop installers are built from version tags only.
- Beta channel gets a build before Stable.

### Order of work
1. Ground rules in the docs (this section).
2. Truck capacity per building, and the outskirts node rule (both are sim changes, no .exe needed).
3. Electron shell with disk saves.
4. Auto-updater and release workflow.
5. WebGPU and the lighting pass.
6. Bigger map with chunk streaming.
7. Art, audio, tools, then Steam.

---

## Research: what else is worth exploring (2026-10-18)

Lessons from the games in this space. Each is a candidate, not a promise; the first four are the best fit.

### Best fit for Supplyline
1. **Data views / map overlays (Cities: Skylines).** Press a key and the map shows coverage, traffic, supply and demand, or "where are my bottlenecks" as colours. Pairs with the stuck diagnosis we already have.
2. **Throughput and bottleneck stats (Factorio).** Per-building and per-line numbers: goods per minute in and out, utilisation, what is limiting it. Players love fixing a graph.
3. **Transit-time pay and reliability (OpenTTD).** Pay falls the longer goods take, so fast modes matter. Vehicles slowly wear out and need servicing at a depot, so a depot building has a job.
4. **Passengers (Transport Fever, OpenTTD).** Towns generate people who want to go somewhere. A second cargo type that uses the same roads, rails and airports, and lets towns grow from people as well as goods.
5. **Power and fuel.** Factories need electricity, vehicles need fuel. A power plant, wind farm and fuel depot become new chains and new things to site in the outskirts.
6. **Town reputation.** Each town rates you; reliable deliveries unlock better prices, contracts and growth.
7. **Contracts and trade deals.** Deliver X by a date for a bonus; standing deals between regions (already in the wish list).
8. **Rivals and a stock market (Railroad Tycoon).** AI companies compete for towns; you can issue shares, buy out a rival. Ties into the bank.
9. **Signals and junction rules.** Rail signals and road priority so trains and trucks do not pile up on shared track; congestion becomes a real problem to solve.
10. **Environment.** Pollution, noise, forests regrowing; heavy industry upsets towns, so placement matters (also supports the outskirts rule).
11. **Difficulty and start conditions.** Starting money, resource richness, disasters on or off; makes the 5 maps replayable.
12. **Scenario and challenge editor.** Build a puzzle ("deliver 500 steel in 20 minutes with $10,000") and share it.

### Tech worth doing early
- **Move the sim to a Web Worker.** The simulation stops fighting the renderer for the main thread. This is a prerequisite for the much bigger map and works in the browser too.
- **Instancing, level of detail and culling** for vegetation, buildings and vehicles; the foundation for tens of thousands of objects.
- **Deterministic sim + seeds.** Same seed and inputs give the same result, which makes replays, daily challenges, bug reports and (later) co-op possible.
- **Automated performance tests** with the bot: a fixed world, measure frame time, fail the build if it regresses.
- **Asset pipeline.** A folder of source models and textures that builds into optimised game assets, so art upgrades are drop-in.

### Getting players (cheap, early)
- An itch.io page and a short GIF-heavy post as soon as the .exe exists.
- A Discord for feedback; a Steam page early for wishlists (see the distribution section).
- A small group of playtesters on the Beta channel.

### Quality-of-life master list (Chris, 2026-10-18: "massive amounts of updates")
Everything here ships in the browser version too. Grouped so a release can take a whole group.

**Selecting and bulk actions**
- Box-select many buildings or vehicles, then act on all (upgrade, sell, send, stop, rename).
- Copy settings from one building to others (what it makes, who it sells to, truck setup).
- "Upgrade all affordable" and an upgrade queue that spends money as it arrives.
- Rename any building, town or vehicle; pin favourites to a quick bar.
- Search anywhere (jump to a building, town or good by name), with the same filters as the warehouse list.

**Vehicles**
- A fleet sheet with filters and sort: idle, stuck, old, unprofitable; profit per vehicle.
- Auto-renew worn vehicles and optional auto trade-up when affordable.
- Per-building default vehicle setup, so a new truck comes pre-configured.
- Group vehicles; pause or resume a whole line; follow-cam on any vehicle.
- Payback calculator before buying ("this pays for itself in 6 minutes on the current route").

**Building roads and rail**
- Drag to build long stretches, ghost preview with total cost before confirming.
- Auto-road tool using the path finder; curve and straight snapping; grid guides.
- Undo and redo for the last builds; bulldoze an area; upgrade a road in place.
- Copy a route to a second building.

**Information**
- Hover tooltips on everything, with a delay setting.
- A notification log (history of every toast and alert) with filters; choose which alerts you want.
- Daily and all-time profit per building and per line; a net worth graph.
- Price history and demand hints per good; "best place to sell this" suggestion.
- "Why?" explainers on prices, growth and stuck states, in plain words.
- Event timeline (surges, slumps, quests done, upgrades).

**Camera**
- Camera bookmarks with hotkeys; jump to town or to the last alert.
- Smooth zoom, snap-rotate, reset north, edge scrolling (desktop), follow a vehicle.

**Game flow**
- Pause and speed steps (1x, 2x, 4x, 8x) with fast-forward until the next event, if not already complete.
- Quick save and quick load keys; named saves with notes; autosave status shown.
- Confirmation toggles (turn off the ask for things you do all the time).

**Settings and help**
- UI scale, text size, colour-blind modes, reduced motion.
- Key rebinding and a hotkey cheat sheet overlay.
- A glossary and a searchable help page; contextual tips that only show once.
- Tier checklist always visible with the next step.

### Release plan (revised, 2026-10-18)
Each is a 0.X release; QoL batches ship between the big pieces so there is always something new.

| Release | Theme | Contents |
|---|---|---|
| 0.14 | THE WORLD (first, everything builds on it) | Layered world generation, claim map, placement validator, bigger and better spread map, rivers and lakes, outskirts nodes, towns with reserved growth room, nothing ever deleted by building |
| 0.15 | Sim rules | Truck cap per product line, 8 building levels (slots and cost now, art later), pacing bot re-run |
| 0.16 | QoL 1: select and act | Box-select, bulk actions, copy settings, rename, upgrade all affordable, search anywhere |
| 0.17 | QoL 2: see and understand | Notification log, tooltips, why explainers, price history, per-building profit, payback calculator, hotkey sheet |
| 0.18 | QoL 3: build faster | Drag and ghost preview, auto-road, undo and redo, bulldoze area, camera bookmarks, quick save |
| 0.19 | Foundations | Sim in a Web Worker, save versioning and migration, platform layer, deterministic seeds |
| 0.20 | The .exe | Electron shell, disk saves, auto-updater, GitHub release workflow, settings that persist |
| 0.21 | QoL 4: fleets and modes | Fleet sheet, auto-renew, train wagons, mode perks and synergies |
| 0.22 | Graphics 1 | WebGPU, bloom, ambient occlusion, day and night |
| 0.23 | Data | Map overlays, bottleneck view, throughput stats |
| 0.24 | Huge worlds | Chunk streaming from disk, much larger maps |
| 0.25+ | Depth and polish | Passengers, power and fuel, contracts, reputation, rivals, weather, art, audio, tools, Steam |

The order can change; the rule is that 0.14 (the world) comes first because towns, nodes, roads and every later feature are placed on it.

---

## The world first: layered generation and nothing ever deleted (Chris, 2026-10-18, release 0.14)

Biggest problem today: towns grow into nodes and roads, and placing a building or road deletes buildings or trees. Fix it at the root: build the world in layers, in a fixed order, and let each layer reserve its space before the next one is placed.

### Build order of the world (each layer sees all earlier layers)
1. **The globe and its size.** Bigger and more spread out (see size note below).
2. **Land masses and ocean.** Continents, island chains, seas, polar ice.
3. **Mountain ranges.** Ridges with passes, so there are natural places for roads and tunnels.
4. **Rivers and lakes.** Rivers run from mountains and lakes down to the sea; lakes fill basins. Crossings are bridges only.
5. **Land cover.** Forest, plains, farmland belts, shore, following height, rivers and climate.
6. **Cities and towns.** Sited on good land (flat, near a river or coast, near resources, not on a mountain or in a flood plain), spaced apart. **Each reserves its full level-max footprint plus a buffer ring on day one**, so growth can never reach anything. Coastal towns get a harbour site; river towns get canal or quay room.
7. **Resource nodes.** Forests, farmland, quarries, mines and wells in the outskirts, clustered as a hinterland per town, outside every growth zone, clear of each other, rivers and passes.
8. **Corridors.** Reserve natural road and rail corridors between towns through passes and along valleys, so the world has sensible routes that nothing else blocks.
9. **Scenery.** Trees, rocks and props fill only what is left, each recorded against the tile it stands on.

### The claim map (the key idea)
- One grid records what claims every tile: water, mountain, river, lake, town zone (core, growth, buffer), node zone, corridor, player building, player road, scenery, free.
- Every placement (building, road, rail, airport, port) is checked against the claim map **with its true footprint plus a clearance ring**. If any tile is claimed by something permanent, it is refused, with the reason in plain words and the nearest valid spot highlighted green (we already have green spots).
- Roads and rails may cross water and rivers only as bridges, and mountains only as tunnels, using the existing span rules; they may not enter a town zone except along its own streets.
- **Placing never removes anything.** Scenery is the only soft layer: it is cleared only from the exact tiles a build covers, and only scenery. Buildings, roads and towns are never overwritten, shifted or deleted by another placement.
- Towns grow only inside their reserved zone, so they can never collide with a node, a road or a river, however far the player expands. Towns do not share tiles, but some neighbours are meant to grow into each other (next section).

### Towns that blend (Chris, 2026-10-18)
Towns and cities should grow into each other where they can, and work together, but not everywhere, and a town must never be swallowed by a city.
- **Blend partner.** Each town has at most one partner: its nearest neighbour, when the two are each other's nearest, close enough to reach (radii plus 8 tiles), and the pair is one of the few that join (40% of such pairs, decided by where they stand, so it is the same every time). `blendPartner` in sim/townlayout.ts.
- **How they join.** A partner pair's main streets reach all the way to meet in the middle; every other pair stops short and leaves the last link to the player. The footprints still never share a tile, but they touch.
- **No swallowing.** One partner each means a town can stand beside a city but is never surrounded by it. Its own centre, market and streets stay its own, and its other sides stay open land.
- **Working together (to build).** Joined towns share growth and demand: goods delivered to one count as variety for both, the joined streets form one road network, and a district in one serves both. The shape is in 0.14; the sharing rules are in the tracker.
- New worlds only (`world.blend`): old saves keep their gaps.
- Measured: about 40% of towns have a partner on Medium and Large worlds, fewer on Small.

### District buildings are permanent parts of the town (Chris, 2026-10-18)
Farmers Market, Restaurant Row, Heating Depot, Coffee House, Hardware Store and the rest are not dropped between buildings.
- Every district has a **permanent lot reserved at town layout time**, sized for its level 3 footprint, sitting inside the town's growth zone. Nothing else is ever built on it: not homes, not towers, not trees.
- Building a district does not remove a single existing building. It takes the lot that was held for it, and homes and towers around it are laid out with that lot already counted.
- **Upgrading grows the district outward.** Like a shopping centre gaining shops: the level 1 building keeps standing, and level 2 and 3 add neighbouring buildings (stalls, a terrace, a second hall, car park, signage) onto the same lot. The original is never replaced.
- A district also lifts the buildings near it (nicer fronts, lights, awnings) without removing any.
- Homes, blocks and towers fill the remaining frontage and never overlap a district lot; overlap is tested.
- Districts of one town never overlap each other. Campuses (stadium, ballpark, arena) keep their own larger reserved ground.

### Tests that guard it (written with the generator)
- District test: build every district in every town and level it to the maximum; the count of homes and towers that were standing before never drops, and no district footprint overlaps a home, a tower, a street or another district.
- Generator test over many seeds: no two permanent layers overlap; every town can reach its max footprint; every node is outside every zone.
- Placement test: placing any building or road changes no other object's tiles; scenery loss is limited to the footprint.
- Growth test: grow every town to max level with a heavily built-up player map; nothing moves or disappears.
- The hand-made map baker (tools/maps) runs the same checks, and Map 1 is re-checked against them.

### Size (how big can we go; measured from the code, 2026-10-18)
The world is a globe. `width` is the tile count around the equator, and the pole-to-pole rows are about width / 2 (the code adds polar cap rows). So **doubling the width quadruples the tiles.** The terrain mesh uses 3x3 vertices per tile, and the ground paint texture is budgeted at 4096 pixels around the equator (`paintGlobe` in game3d.ts), so it gets blurrier as width grows. Tile size is fixed in world units (`TILE_UNITS`), so a bigger world means a bigger globe, not smaller tiles.

| Name | Width around | Tiles on the globe | Mesh vertices | Ground paint per tile | Where it can run |
|---|---|---|---|---|---|
| Today (random worlds) | 192 | about 18,000 | 166,000 | 16 px | browser |
| Map 1 | 288 | about 41,000 | 373,000 | 14 px | browser |
| Large | 384 | about 74,000 (4x today) | 660,000 | 10 px | browser, with culling and instancing |
| Huge | 576 | about 166,000 (9x) | 1.5 million | 7 px | browser if chunked, comfortable on desktop |
| Giant | 768 | about 295,000 (16x) | 2.65 million | 5 px | desktop, needs chunked mesh, tiled textures, sim in a worker |
| Enormous | 1,152 | about 660,000 (36x) | 6 million | 3 px | desktop only, streamed in chunks, sim ticks only the active area |
| Ceiling | 1,536 to 2,048 | 1.2 to 2.1 million | chunked only | tiled / virtual texturing | desktop, long term; memory and pathfinding become the limit |

Recommendation:
- **0.14 ships Large (384 wide, about 4x the tiles)** and a world-size choice at new game (Small 192, Medium 288, Large 384). This is safe in the browser and leaves room to measure real frame rate on your machine.
- **Huge and Giant come with the worker, chunked mesh and the .exe (0.19 to 0.24).**
- **Enormous is the practical ceiling for a good-feeling game.** Past it, tiles outnumber what a player can ever visit; more land does not make better play unless towns, nodes and travel time scale with it.
- Density rule: keep about one town per 800 to 1,200 tiles, and scale node hinterlands with it, so a big world is full, not empty.
- Gameplay needs to grow with size: faster speed steps, auto-routes and fleet screens (the QoL releases) matter more the bigger the world is.
- True 1:1 Earth at today's tile size would be about 1.2 million tiles around the equator, far past any ceiling. Not a goal.
- The numbers above come from the code, not a benchmark; headless screenshots cannot measure real GPU frame rate. 0.14 adds an on-screen frame-time readout and we measure each size on Chris's machine before shipping it.
- Saves record the world generator version: old saves keep their old map and rules; new games use the new generator.

---

## Distribution path: GitHub now, Steam later

Decision (2026-10-18): Steam is the goal, GitHub download is the easy first step.

1. **GitHub Releases** - free installer + auto-updater. Ship this first and get real players.
2. **Steam** - same build goes to Steam later. Steam then takes over updates, cloud saves, achievements, workshop.
3. Keep the code ready for both from day one: save paths, updater and achievements sit behind one small "platform" layer, so swapping GitHub for Steam does not mean a rewrite.
4. Steam needs: one-time app fee, store page, trailer, screenshots, Steamworks SDK. Start the store page early, it lets people wishlist.

---

## Going even bigger (the wish list)

### Game feel and world
- **Living world:** seasons, weather that affects roads and crops, storms that close routes, droughts, floods.
- **Real day/night + sun position** matched to the globe, so night really moves across the planet.
- **Dynamic towns:** visible people, traffic, delivery trucks you can follow, building construction you can watch.
- **Camera modes:** cinematic follow-cam on a vehicle, orbit the globe from space, street level.
- **Space-to-street zoom:** one unbroken zoom from whole Earth down to a loading dock.
- **Disasters and events:** strikes, fuel shortages, boom years, news ticker.

### Depth of play
- **More maps and a campaign:** the 5 hand-made maps become a story with goals and unlocks.
- **Sandbox mode** with no money limits, and **scenario mode** with fixed challenges.
- **Competitors:** AI companies that fight you for towns and routes.
- **Contracts and a market:** prices that move, trade deals between regions.
- **Tech tree:** research better vehicles, roads, warehouses.
- **Fleet management screens:** profit per vehicle, route graphs, auto-route helpers.

### Player tools
- **Photo mode** and **time-lapse recorder** (export as video).
- **Mod support:** custom vehicles, maps, textures. Steam Workshop later.
- **Map editor:** build and share maps (this is also how we make maps 2-5 faster).
- **Blueprints:** save a layout (a rail yard, a town grid) and paste it elsewhere.
- **Statistics dashboards:** charts of money, goods, growth over time.

### Online (later, needs a small server)
- **Daily challenge map** with a leaderboard.
- **Share a save or map by link or code.**
- **Co-op:** two players, one world.
- **Cloud saves** across machines (Steam handles this for free).

### Polish that sells a game
- Full soundtrack and positional audio (engine hum gets louder as you zoom in).
- Controller and Steam Deck support, plus touch (already started).
- Accessibility: colour-blind modes, UI scale, subtitles, reduced motion.
- Localisation into several languages.
- Tutorial that adapts to what the player already does.
- Trailer-ready intro scene: the globe, the sun rising, towns lighting up.

### Behind the scenes (players never see, but it keeps the game healthy)
- Automated tests on every release (we already have vitest and the bot).
- Auto-built installers from a version tag.
- Anonymous opt-in stats: where players quit, which tier is too slow.
- Performance monitor that picks quality settings by itself.
- Telemetry-free offline mode.

---

## Patching, in plain terms

1. You finish a release and push a version tag (like `v0.14`).
2. A GitHub Action builds the installer and publishes it to GitHub Releases.
3. Player opens the game. It checks for a newer version.
4. Downloads only the changed parts in the background.
5. Shows "Update ready - restart". Done.

Tool: `electron-updater`. Nothing for the player to do.

---

## Electron vs Tauri

| | Electron | Tauri |
|---|---|---|
| Size | ~100 MB | ~10 MB |
| Rendering | Bundled Chromium, same everywhere | Uses Windows' WebView, varies |
| WebGPU | Reliable | Depends on the machine |
| Verdict | **Pick this** | Smaller but riskier for graphics |

---

## Things to know

- **Web version stays.** One codebase. Vercel keeps serving the browser build. The .exe wraps the same build.
- **Code signing.** Without it, Windows shows "unknown publisher". Costs money (roughly 100-400 a year). Fine for friends and testing, worth it before a public release.
- **Steam.** Takes a one-time fee and a store page. Brings its own patching, achievements, and cloud saves.
- **WebGPU fallback.** Browser version uses WebGPU where it exists, falls back to WebGL where it does not.
- **Saves.** Need a migration so existing localStorage saves import into the file system.

---

## Build order

1. Electron shell around the existing build, with disk saves.
2. Auto-updater + GitHub Action for releases.
3. WebGPU renderer, with WebGL fallback for the web version.
4. Post-processing pass (bloom, AO, day/night).
5. Art upgrades, one asset family at a time (vehicles, industry, towns).
6. Audio.
7. Decide: signing, Steam.

## Open questions

- Free download from GitHub, or Steam? (decides signing and store work)
- How far do we push art before touching the renderer?
- Do we want the web version to match the .exe, or be a lighter "demo"?
