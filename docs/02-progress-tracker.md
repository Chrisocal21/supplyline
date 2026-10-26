# Supplyline — Progress Tracker

---

## Where we are (October 25, 2026, release 0.216)

**Overall progress:** about 74% of the planned scope (phase percentages below; each is checked boxes over total boxes, adjusted where a box was stale)
**Status:** Active. Tester build is out: Windows and Mac installers on GitHub Releases, coded tester page at /access, public site at /.
**Tests:** 525 pass, 2 skipped (vitest). Type check and production build clean.
**Current release:** 0.217 (tag v0.217.0): live guide for buildings waiting on materials (steps tick off as you do them).
**Pacing (test bot, downtown world, seed 11, 3 game hours):** Tier 1 at 7.9 min, town level 2 at 26.2 min, level 3 not reached (the bot grows one town). A human playthrough is still the real test.

### Percent by area

| Area | Progress | Note |
|---|---|---|
| Core sim (production, logistics, towns, districts, paths) | 100% | Locked in; see "Locked in" below |
| Vehicles, drivers, mechanics, fleet | 95% | Wagons and per-mode perks not built |
| Quest line and teaching (Tier 0 to 4, cards, hints) | 90% | Quest numbers need a human playthrough |
| Materials economy (Supply Yard store, build and upgrade materials) | 90% | Shipped 0.215 and 0.216; balance unmeasured by a person |
| Market and buyers (everything sells, districts buy) | 95% | Surplus sells at 60%; Supply Yard raw-goods price is Chris's call |
| Town growth and downtown skylines | 85% | Bot never reaches level 3; towers not in title world; tower shadows |
| UI and menus (site look applied) | 90% | One small approved UI change at a time |
| World look and art | 55% | Real models arrive later; clouds, day/night cycle, sound not done |
| Performance | 70% | Chunked ground, instancing; phone check and dormant towns open |
| Desktop app and release pipeline | 85% | Installer, auto-update check, release on tag; code signing not done |
| Tester launch | 80% | /access fixed in 0.216+; waiting on tester feedback |
| Steam | 0% | Not raised until the demo is 100% complete |

### Phases at a glance

| Phase | What it is | Progress |
|---|---|---|
| Step Zero | Prove the loop | 100% |
| Phase 1 | MVP as a 3D globe | 100% |
| Phase 2 | Core loop: rail, air, goods, highways | 100% |
| Phase 3 | The world, polished (graphics, sound) | 58% |
| Phase 4 | Depth: districts, paths, vehicle ladder | 90% |
| Phase 5 | Living towns, bank, rail yard, joined roads | 100% |
| Phase 6 | Later: sea transport, real-money cash, events | 50% |
| Phase 7 | Desktop version: .exe, auto-updates, WebGPU, Steam (plan in [05-desktop-version.md](05-desktop-version.md)) | 23% |

### Release history since 0.108 (details in [04-project-log.md](04-project-log.md))

| Releases | Date | What moved |
|---|---|---|
| 0.109 to 0.117 | Oct 23 | Map 3 preview, more land, compact saves, About page, goods page on the website |
| 0.118 to 0.129 | Oct 24 | Fog removed, green/orange build zones (0.122), fuller Tier 0 and 1 quest lines, tutorial (0.124), Map 3 opens for play as beta |
| 0.130 to 0.138 | Oct 24 | Map 3 channels, F3 triangle breakdown, far trees hide sooner, node pins from far out, demo on Map 1 ending at Tier 2 (0.136) |
| 0.139 to 0.148 | Oct 24 | Full game as a download, tester page, mock Steam page, Next.js website, chunked ground (0.145), buyer reach shown (0.148) |
| 0.149 to 0.159 | Oct 24 | Small hills levelled, land plots green/orange, model and art brief, Forestry Camp v2, new logo and site look in the game |
| 0.160 to 0.169 | Oct 24 | Mac build, /access page, title screen, drawn menu icons, sleeker HUD, Map 3 ground cheaper |
| 0.170 to 0.183 | Oct 24 | UI redesign in small bits: cards, Finance, How to play, world chooser, saved games, tabs, building window, vehicle cards, placement overlay, keys, room to build |
| 0.184 to 0.189 | Oct 24 | Trucks wait for orders, node markers, tier unlock cards, in-game Wiki, buyer filters |
| 0.190 to 0.196 | Oct 24 to 25 | Trucks reach farther, quest line walks the first town to level 2, early buildings unlock one at a time, padlock cards |
| 0.197 to 0.205 | Oct 25 | Footprints, 5x3 airport, driveway rule, held ground for growth, placement wash for roads and driveways |
| 0.206 to 0.208 | Oct 25 | Quarry opens at town level 2, Wood Yard quests, unlock cards, downtown housing and skylines, window grids and shopfronts |
| 0.209 | Oct 25 | Demo switched off, installer version taken from the release tag |
| 0.210 to 0.211 | Oct 25 | Quest card for every quest, Continue plays the growth show, "Back to previous place" halfway, full hints, first-income quest, walled-in factory refused |
| 0.212 to 0.214 | Oct 25 | Market buys every good (surplus at 60%), every district is a buyer, surplus labelled and kept out of panel lists, save round-trip test |
| 0.215 | Oct 25 | New buildings take materials from the town's Supply Yard store and wait until it has them |
| 0.216 | Oct 25 | Upgrades take materials per level, scaffold on waiting buildings, materials on build cards |
| after 0.216 | Oct 25 | Testers page falls back to the build's own release files when GitHub refuses the version lookup (403) |

### Open right now

- [ ] Vehicles through the driveway: Chris to describe what he sees
- [ ] Test bot grows only one town, so Tier 2 and town level 3 are not re-measured on downtown worlds
- [ ] Towers in the title and sample world; tower shadows do not shrink with the squash
- [ ] Tropical and temperate style look; performance on phones; dormant towns; wagons; Hard mode
- [ ] Padlock card to Wiki link; old-save airports
- [ ] Quest numbers and material amounts after a human playthrough
- [ ] Supply Yard price for raw goods: full price or salvage (Chris's call)
- [ ] Confirm the live /access page shows the version and downloads after the latest deploy

---

### Older notes kept from earlier sessions (built)

#### Warehouse list filters
- A warehouse or terminal's Businesses and Sells to pages (and every building's Selling page) get a filter bar: live text search by name, kind, town or good; status, type and goods chips that show how many match; sort orders; a "Showing X of Y" count; and Clear filters.
- Search is a real text field, so typing never triggers game hotkeys.
- "Send all shown" / "Stop all shown" (and "Sell to all shown" on the buyers list) switch everything the filters show at once.

#### Train movement polish
- Rolling stock follows measured distance along the rendered rails instead of a fixed tile-to-world conversion, keeping wagon spacing consistent through curves and across latitudes.
- Each carriage turns between its own bogie positions; station stops account for the full train length.
- Exhaust follows the locomotive's stack rather than the route's centre point.

**Older current release note:** [0.11 - A fuller, more detailed world](release-0.11.md)

---

### Step Zero — Prove the Loop

**Progress:** 100% (6/6)

- [x] Scaffold TypeScript + Vite project on localhost:3000
- [x] Simulation core separate from rendering
- [x] Raw site, processor and sell point
- [x] Draw a route, assign a vehicle
- [x] Vehicle loads, travels, unloads; processor converts; goods sell
- [x] Money updates on screen

---

### Phase 1 — MVP (rebuilt as a 3D globe)

**Phase progress:** 100% (19/19)

#### Feature 1.1 — The World
- [x] Globe with continents, oceans, mountains, forests and polar caps
- [x] Camera: drag, rotate, tilt, zoom, from space down to street level
- [x] Named seas, woods, mountains, plains, ice caps and towns
- [x] Resource nodes (forest, farmland, quarry) with quality

#### Feature 1.2 — Production
- [x] Forestry, farm, quarry, sawmill, flour mill, paper mill
- [x] Building levels 1 to 3
- [x] Demolish with a refund

#### Feature 1.3 — Roads and Vehicles
- [x] Draw roads; overlapping roads merge, crossings become junctions
- [x] Bridges over water and tunnels through mountains, length limited by tier
- [x] Box truck and big rig with different capacity and speed

#### Feature 1.4 — Logistics
- [x] Push and pull: vehicles haul what the far end needs
- [x] Distribution hub with a pull list, and downhill flow between hubs

#### Feature 1.5 — Towns and Progression
- [x] Towns with a Market and a Freight Yard that unlocks at level 2
- [x] Five town levels, with a variety-of-goods rule
- [x] Tiers 0 to 3 driven by deliveries and town growth
- [x] Tier quests: a list per tier with rewards, a quest bar, and a Quests sheet

#### Feature 1.6 — Interface and Saves
- [x] Category menu with 3D thumbnails, hover cards, selection panels, status rings, collision-free labels
- [x] Save and load in browser local storage
- [x] How to play guide (opens on a first visit; H, the ? button, or the menu)
- [x] Deploy to Vercel (every push to main is live)

---

### Phase 2 — Core Loop

**Phase progress:** 100% (10/10)

- [x] Rail as its own network, with level crossings, and freight trains
- [x] Airports and cargo planes
- [x] More goods and chains, so bigger towns have more to want (15 goods, by-products, 6 new buildings)
- [x] Towns as districts with through streets, production and towns sheets, new header
- [x] Major cities and small towns; for-sale lots, driveways and regional town styles
- [x] Highways (four lanes, faster) that narrow into streets
- [x] Roads regrade the ground: cuts, embankments, and tunnel mouths placed from the real shape of the hill
- [x] Economy balancing pass, first round (upkeep, town growth thresholds); needs a person's playthrough to finish
- [x] One-click auto-road tool (the Build road button on a building; it avoids resource spots and joins the nearest road)

---

### Phase 3 — The World, polished

**Phase progress:** 58% (7/12)

- [x] Richer sky and light, ambient occlusion and smoother edges close up
- [x] Opening screen with a cinematic flythrough
- [x] Smaller polar ice caps
- [ ] Ground and grass detail (fine surface shading added; grass geometry still to do)
- [x] Trees with branching conifer silhouettes and clustered broadleaf crowns, including town trees
- [x] Buildings: distinct signboards, wall weathering, varied homes and skyline forms, framed glazing, loading bays and rooftop equipment
- [x] Water: sky-environment reflections and animated surface normals, fading ripples at distance (not reflections of nearby buildings)
- [ ] Clouds
- [ ] Day and night, seasons (manual Day/Dusk/Night lighting implemented; automatic cycle and seasons outstanding)
- [ ] Sound and music
- [ ] Phone performance check
- [x] Balanced, High and Ultra graphics presets, saved per device

#### Measured realism foundation (October 18, 2026)

- Local geometry now has an explicit convention: one world unit is 10 metres. Road lanes are 3.5m; newly authored road trucks use 2.55m bodies, with cab glazing, mirrors, steps, tires, loading doors and ribbed cargo bodies. Removed the road vehicles' display-only enlargement.
- Vendored nine 2K brick, concrete and asphalt texture maps from Poly Haven under CC0, with source attribution in `public/assets/materials/NOTICE.txt`. The running game serves these locally. Building and road shaders use scanned albedo, roughness and normal detail with physical repeat sizes.
- Full-size football, baseball and hockey campuses have three geometry tiers, stands, roof structures, support buildings and floodlights. The football playing surface measures 109.728 by 48.768m; the hockey rink is inside a roofed arena. Campus entrance drives connect to town streets.
- New worlds reserve suitable land for these campuses and relocate ordinary resource nodes without dropping their identities, types or qualities. Existing saves keep their compact lot layout. Sports availability depends on clear terrain: the current authored map fits stadiums and arenas, but no full-size ballpark was found. Suitable flat-land regression worlds fit all three.
- Traffic signals and streetlights use measured pole heights. Bounded local lights illuminate streets and sports grounds at dusk/night; window and fixture emission complements the main lighting.
- Menu > Graphics and lighting provides Balanced / High / Ultra and Day / Dusk / Night. Ultra uses 4096px shadows, 32-sample contact shading, bloom and up to 16 local lights; Balanced disables post-processing and reduces shadows, pixel density and local lights. The 2K material download remains shared across presets.
- Verified: production build; 209 tests passed, two existing tests skipped; nine local texture requests; no detected shader failures while switching graphics/lighting presets; a built full-size stadium and completed town growth; desktop and 390px mobile graphics panel, preset selection and close button. Automated Escape-key delivery did not close the panel in the browser check; its existing keyboard-handler integration still needs a manual keyboard check.
- **Still outstanding:** comprehensive human-scale redesign of every industrial/civic building and tier, airports/aircraft/ships/rail scale reconciliation, further terrain and vegetation realism, broader campus availability, and real-device GPU/memory profiling. This is not yet Farming Simulator / American Truck Simulator / Satisfactory asset fidelity.

#### Resource-site polish (October 18, 2026)

- All 13 built resource sites now receive purpose-specific detail at levels 1–3: forestry, grain farm, dairy ranch, orchard, cotton, coffee, mango, quarry, clay, sand, coal, iron and oil.
- Resource upgrades retain the original core geometry at a fixed size, replacing the generic scaled-up buildings, piles and barns with site-specific additions. Production-menu thumbnails also use the polished level-one models. Production rules, resource placement and saves are unchanged.
- Farms gain detailed loading doors, silo ladders/bands, roof fittings, crop stalks, smaller rolled hay bales, trailer wheels and tiered grain storage. Dairy ranches gain shaped cattle with markings, ears and hooves, finer paddock fencing, a water trough, feed area, milk tanks and collection pipes.
- Plantation/orchard sites gain irrigation runs, strapped produce pallets, packing shelters, water storage and a detailed tractor. Cotton rows now contain individual stems, foliage and cotton bolls rather than white bars.
- Forestry gains cabin battens, log-end detail, machinery wheels, lumber storage and a tractor. Extraction sites gain layered rock faces, excavator tracks/glazing, ladders, sorting conveyors and storage. Oil upgrades add pipework, valve assemblies, tank access and control equipment.
- Shared tractors, pallets, shelters, fences and ladders are merged into each site's existing geometry, not separate objects per detail. Resource signboards are reduced to roadside scale.
- Verified: production build and 110 graphics tests, including all 13 sites at every tier, unchanged core dimensions, deterministic geometry, explicit vertex budgets and bounded footprints. Level-three farm and dairy-ranch close-ups rendered without detected runtime/shader failures. These remain procedural models; bare undeveloped resource-node scenery is unchanged.

#### Quick vegetation density pass (October 18, 2026)

- Forest tiles now attempt 8–14 trees instead of 3–6; grassland groves are more frequent and contain 3–6 trees. Existing town, resource-yard and road clearance logic remains in place, and map trees remain instanced.
- Undeveloped forest nodes gain eight standing trees. Orchard and mango scenes now contain 20 trees each, including the undeveloped groves; packing areas remain at the front.
- Undeveloped farmland gains 144 visible crop plants in nine rows. Built grain farms gain another planted strip beside the buildings. Plants mix green and ripe colors/heights; this is static scenery, not a new growth/harvest simulation.
- This is a quick fill-in pass; density tuning and real-device performance profiling remain follow-up work.

#### Render performance pass (after 0.11)

- Diagnosed on an integrated AMD Radeon at 1440x900, Ultra preset. The demo took 111 ms per frame (about 9 FPS). Hiding all map trees brought it to 24 ms, and tree shadows alone cost about 40 ms. Each tree kind used one globe-wide InstancedMesh, so about 38M tree vertices were drawn every frame and drawn again for shadows, with no culling. The second cost was GTAO: about 14 ms at device pixel ratio 1, and Ultra at device pixel ratio 2 reached 91 ms even after the tree fix.
- Trees are now batched per kind in 6x6-tile chunks so frustum culling works. Chunks over the horizon are hidden. Distant chunks swap to a low-poly stand-in, `treeLodGeometry`, with the same silhouette and no shadow casting. The stand-in shares the near mesh's instance buffers, so road regrading and clearing stay in sync. The detail distance is set per preset with `treeDetail`: 20 for Balanced, 32 for High, and 45 for Ultra.
- Ambient occlusion now runs on a smaller buffer measured in CSS pixels: 0.5 scale on High and 0.75 on Ultra. AO samples are now 12 on High and 16 on Ultra. New players on desktop default to High instead of Ultra.
- Result on the same machine: Ultra fell from 111 ms to 21 ms per frame, High runs at 13.7 ms, and Balanced is capped at the 144 Hz refresh rate. Ultra at device pixel ratio 2 improved from 91 ms with the tree fix alone to 55 ms per frame.

#### 3x3 airport and placement rotation (after 0.11)

- Buildings can be rotated during placement with `R`, in 90-degree steps clockwise. The rotation is stored as `Site.rot`. Ports and stations keep their automatic facing. Rotation is keyboard-only for now; there is no touch button.
- Airports now occupy a 3x3 tile field. All nine tiles must be open grass or forest with a gentle slope, no other features, and clearance from towns. The road gate sits in front of the field's center. `R` chooses which side the terminal and road face. Placement picks the side facing the nearest town by default, and shows "turn it (R)" when the chosen side has no room for a road. The terrain is graded into a flat pad under the field. Air routes use the center of each field.
- New airport model in `src/r3d/airport.ts`; the airport upgrades are now terminal expansions:
  - L1, municipal airfield: runway with markings, PAPI lights, taxiway, hangar, small terminal, tower, windsock and light aircraft.
  - L2, regional terminal: two gates, an apron with jets, a larger tower and a car park.
  - L3, international terminal: jet bridges, a departures deck, a multi-storey car park and a tall control tower.
- Scale compromise: the 3x3 field is about 98 m across, so the runway is much shorter than a real runway. Aircraft are close to real size.
- Legacy saves load with airports facing south (`rot` 0) and need no migration.
- Validation: 231 tests passing with 2 skipped. TypeScript, the production build and in-browser checks pass: L1 and L3 render, the 3x3 ghost appears and rotates, and blocked sides show the error.

#### Warehouse controls (after 0.11)

- Warehouses and terminals (Rail Yard, Port and Airport) have a new Businesses page. It lists every business of yours joined to the warehouse, with its status and stock. Each card has a Sending here / Send here switch, Run / Pause for factories, and an Open button. The switch covers both the main product and any by-product. It is saved through `sendOff`.
- The Sells to page brings back the old Distribution Hub's per-buyer Selling / Sell here switch. Trucks only go to buyers that are switched on. Producers and factories keep the existing behavior, where each truck's Settings decide its destination.

#### Release 0.12

0.12 collects everything done since 0.11:
- a game-style HUD with one menu, a minimap and more keyboard shortcuts;
- roads that join every like business on the network;
- warehouse business controls;
- a 3x3 airport and building rotation;
- the render performance pass.

Each has its own section in this log.

#### Road networks join like goods (after 0.11)

- One road now joins every building that can trade over it, not just the two at its ends. The network check used to stop at any building tile. Now it passes through a building's own yard to reach the roads beyond. A chain such as Farm, Farm, Mill joins both farms to the mill. Town lots are still only entered from their door.
- Send menus, buyer lists and the warehouse pages all read these joined lanes, so they show every reachable base automatically. The network is checked again every 100 ticks and on load. Covered by a new test in `network.test.ts`.
- Limitation: a truck on one of these lanes drives across the yards in between.

#### Game HUD: header, footer, menu and minimap (after 0.11)

- **Header:** a full-width dark strip with an accent edge. It holds the money and bank on the left, the tier and quest in the middle, and the speed control on the right. The Production, Towns, Help and menu round buttons are replaced by one MENU button.
- **Menu:** opens as a centered overlay of tiles, each showing its key. The tiles are Production, Towns, Bank, Quests, How to play, Save / Load, Graphics, Minimap and New world. A full keyboard reference sits below the tiles. Click outside the menu, or press Esc, to close it.
- **Footer:** a full-width strip with the category dock in the middle and key hints at the left.
- **Minimap:** sits in the bottom-right corner and is drawn into a canvas texture (`src/ui/minimap.ts`). The terrain is painted once per world. Roads, rails, air and sea lanes, towns, buildings, and a camera box with a heading tick are redrawn four times a second. The map wraps so the camera stays in the middle. Click it to jump there. It is hidden on screens narrower than 900 px and on touch, and M toggles it. The build tray and side panel stay clear of it.
- **New keys:**
  - Esc opens the menu when nothing else is open.
  - M toggles the minimap, O opens Graphics and L opens Save / Load.
  - C picks the road tool and X picks demolish; press the same key again to put the tool away.
  - U upgrades the selected building.
  - The minus and plus keys change the speed.
  - Save / Load moved from S, which is a camera key, to L.

#### Release 0.11 finishing pass

- Increased forests again to 16–26 placement attempts per forest tile and grassland groves to 6–10. The demo now contains 24,603 instanced map trees, compared with 11,999 after the first density pass; node and town trees are additional.
- Farmland now contains 240 plants per undeveloped node.
- Replaced both dairy-ranch and pasture-node cattle with shared, more detailed adult-scale models. Six cows per herd have varied coats, standing/grazing poses, muzzles, eyes, ear tags, jointed legs, hooves, udders and tails.
- Version metadata updated to 0.11 / package 0.11.0. Release notes cover the complete graphics overhaul.
- Release validation: production build and 226 passing tests, with two existing tests skipped. The demo loaded version 0.11 with the denser vegetation and upgraded ranch, without detected runtime or shader failures.

#### Grounded visual pass (October 17, 2026)

- Muted olive, stone and coastal blue terrain palette; finer ground shading instead of strong mottling.
- Multi-tier conifer branches and irregular broadleaf crowns, retaining instanced forest rendering.
- Water highlights animate independently of simulation speed, with land and ice excluded by the surface mask.
- Sky environment lighting, lower exposure and a lower afternoon sun; separate roughness for concrete, glass facades and metal cladding.
- Shared slate-and-brass interface palette, brighter secondary text and subtle panel shadows; controls and save formats unchanged.
- Verified: production build, 17 targeted simulation/map tests, desktop and 390px mobile browser rendering, no detected runtime or shader errors, and advancing water animation uniforms.
- Still needs a real-device performance pass. This is a procedural art-direction upgrade, not a replacement with photorealistic assets; clouds, seasons, sound and quality presets remain outstanding.

#### Buildings and vegetation overhaul (October 17, 2026)

- Shared pine, oak, birch, orchard and palm models replace simple cone and ball trees across forests, town gardens, forestry sites, orchards, plantations and forest amphitheatres.
- Four residential variants: cottages, cross-gabled or rooftop-pavilion homes, stepped terrace homes and shop-houses. Regional wall colors and roof styles remain distinct.
- Three city-block silhouettes: floor-banded apartments/offices, setback towers and split-volume buildings, with storefronts, roof equipment and more restrained curtain-wall glazing.
- Framed windows with separate glazing material, sills and mullions; industrial loading-bay shutters, bollards, canopies, silo bands, roof lights and rooftop solar panels on flat-roof factories.
- Freight warehouses and rail-yard offices gain loading and roof detail. Community centres and retail districts gain richer facades; their windows now sit against their building walls.
- Existing simulation types, plot allocation, town-layout random sequence, saves and growth-animation anchors are preserved. These are visual variants, not new production chains or purchases.
- Verified: production build and 106 tests (89 graphics checks plus 17 map/simulation checks), desktop close-ups, a completed town-growth animation and 390px mobile rendering without detected runtime or shader errors.
- Geometry budgets are checked automatically: at most 5,000 vertices per shared tree, 3,500 per tested house and 10,000 per tested city block. Forests remain instanced. Real-device frame-rate and memory profiling are still outstanding.

---

### Phase 4 — Depth: towns you keep building (Oct 12, 2026)

**Phase progress:** 90% (18/20)

- [x] Touch controls: pinch, twist and tilt, tap-to-preview with a confirm bar, road Undo and Cancel, touch scrolling, lift-to-press buttons, iPad page settings, save on hide
- [x] The game knows touch from mouse and keyboard and words its text to match
- [x] Town districts: 17 of them, built and levelled from Manage town, shown as landmarks in the town
- [x] Specialisation paths: Breadbasket, The Forge, Trade Hub, The Boulevard, chosen per town at level 3
- [x] Capstone districts at level 5 (one per path)
- [x] Vehicle ladder (box truck to truck fleet, freight train to heavy haul train, plane to jet) and Trade up
- [x] Running costs for vehicles, buildings and districts; net income under the money
- [x] Pacing: sale prices and growth thresholds retuned, Tier 4 Legacy added, new quests for districts, paths and vehicles
- [x] A scripted player (`src/sim/bot.ts`) and a pacing report (`pacing.test.ts`) to measure how long each tier takes
- [x] Simulation sped up about 3.5 times (vehicles look for loads a few times a second)
- [x] Tests for districts, paths, running costs, trade-up (55 pass)
- [ ] Restaurants, farmers markets and the rest: effects and costs need a playthrough by a person
- [x] Per-path quests and path mastery (four quests per path, 10% price bonus when mastered)
- [ ] Deploy and offline play (service worker) so the iPad can load it with no signal

---

### Phase 5 — Living towns, a bank, and a world that fits (Oct 13 to 16, 2026)

**Phase progress:** 100% (all built; the graphics overhaul continues in Phase 3)

Towns and look
- [x] Towns are natural strips along a main street with side lanes, fishbone lots and homes, and reach toward each other as they grow (100%)
- [x] Growth animation when a town levels up, then the camera cuts back to where you were (100%)
- [x] Build animations for districts and specialisation, a two-angle camera that avoids trees and buildings, longer build time (100%)
- [x] Removal animations: buildings fold into the ground in dust, trucks shrink away (100%)
- [x] Opening screen with a cinematic flythrough, logo, captions, Continue and New game (100%)
- [x] Ice caps shrunk: Map 1 now reaches about 77 degrees latitude, old saves unchanged (100%)

Roads, rail and logistics
- [x] Smooth highways that join town streets with clean corners, and road-to-road highways (100%)
- [x] Road and track laid in 5-tile stretches, so one stretch can be deleted alone (100%)
- [x] Trucks caught by a removed road drive home with their load instead of vanishing (100%)
- [x] Everything on one connected road network is joined automatically, re-checked every 10 seconds (100%)
- [x] Automatic roads keep off resource spots and join the nearest road or street (100%)
- [x] Rail Yard is its own placeable at a town's edge; trains run yard to yard (100%)
- [x] Articulated trains that bend round curves, wider level crossings (100%)
- [x] Airports and rail yards must go on flat open ground with a way in (100%)
- [x] Highway quest and station placement bugs fixed (100%)

Towns as buildings
- [x] Districts are real buildings on lots with a door on a street, delivered to by truck, using up goods (100%)
- [x] New districts: Community Centre, Amphitheatre, Stadium (100%)

Money
- [x] Bank: loans with compounding interest, savings, a market fund, net worth; the money pill opens it (100%)


---

### Phase 6 — Later

**Phase progress:** 50% (4/8)

- [x] Sea transport: ports, ships, water lanes, island specialties
- [ ] Buying cash with real money (needs a payment service and a server)
- [x] Market events (demand surges and slumps, already in the game)
- [ ] Contracts
- [ ] Larger maps with more land
- [x] Export and import of saves: any slot or the current game to a file, and back in from a file
- [x] Highlight valid spots for airports, rail yards and ports while placing (green tiles)
- [ ] Bigger, more realistic airports and rail yards (tabled)

---

### Phase 7 — Desktop version and beyond (planned Oct 18, 2026)

**Phase progress:** 23% (22/96; installer, auto-update check, release on tag and Mac build shipped; the rest is plan). Full detail, tables and reasoning: [05-desktop-version.md](05-desktop-version.md). Distribution: GitHub download first, Steam later. The browser version stays alive from the same code.

#### 7.000 Release 0.15: custom maps and the placement rules (Chris, 2026-10-19; Chris says "continue" between steps)
Notes from playing a Large world (41 fps, 24 ms a frame, draw 10 ms): roads look alike in every town; nodes bunch up in places; too much ocean (water should be about 15% of the globe, it is 64% on random worlds); treeless strips in forests; wants hand-made maps with hard node rules around mountains, oceans, lakes and rivers. Towns should connect naturally, never take over (dominance dropped).
- [x] Step 1: the treeless strips were the kept-clear routes between towns (0.14); they are now worn into dirt tracks (paint.ts)
- [x] Step 2: node placement rules (sim/noderules.ts): families (farming: farmland, pasture, orchard; mining: quarry, mine, coal; woods; shore; island) blend into belts along a road, kin stand 3+ tiles apart, other families 7+, no belt over 6 within 9 tiles; used by the generator (the map baker will use the same module in step 4). Tests in noderules.test.ts
- [ ] Step 2b: per-kind distances from mountains, ocean, lakes and rivers as explicit rules, and a hinterland per town (rides along with step 4, where the custom map needs them)
- [x] Step 3: land shaper: tools/maps/map2.cjs lays a continent from named geography (ranges, rivers with flood-plain valleys, lakes, a gulf, climate woods, dry country), about 85% land
- [x] Step 4: Map 2, The Continental (Large, 384 wide, 85.6% land, 65 towns and cities, 19 oil, coffee and mango sites): baked to src/maps/map2.json with a preview; tests in maps.test.ts and claims.test.ts; picker now offers only made maps (random worlds stay for tests and #seed URLs)
- [ ] Maps 3 to 5
- [ ] Scale charter speeds: ships slower and bigger, planes faster (see 05-desktop-version.md); its own release
- [ ] Step 5: each town style gets its own streets: surface (cobble, brick, dirt, asphalt), width, lamps and layout (grid, organic, radial), so no two look alike
- [ ] Step 6: dirt tracks become roads: lay a road along a track to upgrade it, cheaper than new ground
- [ ] Not doing: a bigger partner taking over the smaller (Chris wants them to connect naturally)

#### 7.00 Release 0.14: the world first
- [x] Layered world generator: land and ocean, mountain ranges, rivers and lakes (new: one-tile rivers from the coast through lowland, each ending in a small lake), land cover, then towns, nodes, corridors, scenery
- [x] Natural corridors between neighbouring towns (sim/corridors.ts): the cheapest route over the land, crossing a range at its lowest point (the pass) and water where it is narrow; nodes and trees keep off them
- [x] Passes carved into the mountains: where a corridor crosses a range the ridge is lowered to open ground and the shoulders eased (generated worlds; Map 1 keeps its own)
- [x] Claim map (sim/claims.ts): one answer to what holds a tile, in order of strength; tested against placeError on every tile of a world
- [x] Claim map (old line): every tile records what owns it; every placement checked against true footprint plus a clearance ring
- [x] Towns reserve their full growth footprint and buffer on day one; cities, towns, harbours, canals sited on good land
- [x] Nodes kept 3+ tiles from every town's grown footprint and clear of airport pads (hinterland clustering, rivers and passes still to do)
- [ ] Nodes in the outskirts as a hinterland per town, outside growth zones, clear of rivers and passes
- [x] Placing a building or road never deletes buildings, roads or towns (tested in placement.test.ts: buildings only on free ground, roads never over buildings or district lots, nothing standing moves); roads keep off the ground a town will grow over, except its future streets; scenery cleared only from the exact footprint
- [x] District buildings (Farmers Market, Restaurant Row, Heating Depot, Coffee House and the rest) get a permanent lot reserved in the town layout, sized for level 3; building one removes nothing; upgrading adds neighbouring buildings onto the lot (like a shopping centre gaining shops) and never replaces the original; homes and towers are laid out around the reserved lot and never overlap it; test levels every district to max and checks nothing standing before is lost
- [x] Bigger, more spread-out map: Large 384 wide (about 4x the tiles) in 0.14, world-size choice at new game (Small 192, Medium 288, Large 384), frame-time readout to measure on Chris's machine; Huge 576, Giant 768, Enormous 1,152 later with chunking, worker and the .exe (size table in 05-desktop-version.md)
- [x] Tests: generator over many seeds, placement never touches other objects, growth to max with a built-up map loses nothing; Map 1 re-checked
- [x] Towns blend: each town has at most one partner (nearest, mutual, close, 40% of pairs) whose streets meet in the middle; no town is ever surrounded by a city; new worlds only
- [x] Joined towns work together (sim/world.ts): a partner earns 20% of what the other's sales earn in growth, plus 10% for each level it is behind (up to +30%), the variety of goods sold to either counts for both, and a metro area (both level 3+) sells 2% better per level. Each stays a town: own name, market, freight dock and districts. Shown in the town menu. Tests in joined.test.ts
- [ ] Dominance: a much bigger partner pulls the smaller one into a county-and-city arrangement (waiting on Chris's rules)
- [ ] World generator version stored in saves; old saves keep their map
- [x] Bump src/version.ts (it still says 0.12 although 0.13 shipped)

#### 7.0 Ground rules and sim changes (before the .exe)
- [x] Ground rules written down in [05-desktop-version.md](05-desktop-version.md)
- [ ] Truck capacity per building: 2 / 4 / 6 slots at levels 1 to 3, counted separately per product line (lumber and sawdust each have their own), shown as "Trucks 3 / 4", Upgrade button says "+2 truck slots", buying at the cap is blocked with the fix, old oversized fleets grandfathered
- [ ] Airports, rail yards and ports: trucks and planes share one pool and a plane takes 2 slots (2 trucks or 1 plane); trains and ships likewise
- [ ] Buildings go to 8 levels (today 3): speed, storage, upgrade cost and art for levels 4 to 8; level 4 unlocks trade-up to bigger trucks, next levels unlock the next class (levels 1 to 3 can only add more trucks of the starting class); a bigger truck still takes 1 slot
- [ ] Re-run the pacing bot after the truck cap and retune
- [ ] Node placement rule (outskirts, outside growth zones) on new maps and seeds
- [ ] Save versioning and migration check before saves move to disk

#### 7.1 The .exe and the all-in-one launcher
- [x] Electron shell around the existing build (0.139 onward)
- [ ] Saves as real files in Documents/Supplyline, with a one-time import of old localStorage saves
- [ ] Autosave on a timer and on quit, many slots with screenshot, date and play time, automatic backups, save migration across versions
- [x] Update check against GitHub Releases (latest.yml; installer version now taken from the tag, 0.209). Restart prompt and What's new screen still to do
- [x] GitHub Action that builds the Windows and Mac installers on a version tag (.github/workflows/release.yml)
- [ ] Stable and Beta channels, one-click rollback, "Repair game" button
- [ ] Settings that survive updates: graphics presets chosen from the GPU, resolution, fullscreen, vsync, frame cap, UI scale, key rebinding, volume
- [ ] Crash reports (opt in) and a "Report a bug" button that attaches log and screenshot
- [ ] Platform layer (saves, updates, achievements behind one interface) so Steam swaps in without a rewrite
- [ ] Code signing (before a public release)

#### 7.2 Graphics ceiling
- [ ] WebGPU renderer with WebGL fallback for the browser build
- [ ] Post-processing: bloom, ambient occlusion, colour grading, tilt-shift
- [ ] Day and night cycle matched to the globe, lit windows, headlights, street lamps
- [ ] Real-time shadows, water reflections and foam, volumetric fog, clouds, smoke
- [ ] Compute-shader crowds and traffic (tens of thousands of objects)
- [ ] Textured models with normal maps and animation (wheels, cranes, smoke, workers), one family at a time: vehicles, industry, towns
- [ ] Much bigger map: chunked terrain streamed from disk, far chunks drawn simple, sim ticks only the active area
- [ ] Node placement rule: resource nodes only in the outskirts, outside every town's level 5 growth zone plus a buffer, clustered as a hinterland per town, clear of each other; map baker flags violations
- [ ] Soundtrack and positional audio

#### 7.3 World and play depth (wish list)
- [ ] Seasons, weather, storms, droughts, floods; events and a news ticker
- [ ] Space-to-street unbroken zoom, cinematic follow-cam
- [ ] Visible people, traffic, construction
- [ ] Campaign across the 5 maps, sandbox and scenario modes
- [ ] AI rival companies, contracts and a moving market, tech tree
- [ ] Fleet management screens and route graphs
- [ ] Customizable trains: add wagons as an upgrade (Wagons 6 / 8), capacity per wagon, wagon cap set by rail yard level, wagon type follows the cargo, longer trains load slower and cost more upkeep
- [ ] Each mode gets its own edge and quality-of-life perks (truck: anywhere and first mile; train: wagons, mixed cargo, timetables; ship: biggest volume, containers, islands; plane: express and fresh premium, ignores terrain)
- [ ] Mode synergies: containers pass between modes untouched, hub bonus where two or more modes meet, trucks feeding a terminal fill the big vehicle faster, one shared dispatch sheet, each bonus explained in plain words in the building menu

#### 7.3b Researched candidates (details in 05-desktop-version.md)
- [ ] Data views / map overlays and a bottleneck view
- [ ] Throughput and utilisation stats per building and line
- [ ] Transit-time pay, vehicle reliability, depots and servicing
- [ ] Passengers as a second cargo
- [ ] Power and fuel chains
- [ ] Town reputation, contracts and trade deals
- [ ] Rival companies and a stock market
- [ ] Rail signals and road priority, congestion
- [ ] Environment: pollution and noise
- [ ] Difficulty and start conditions; scenario and challenge editor
- [ ] Tech foundations: sim in a Web Worker, instancing and LOD, deterministic sim, automated performance tests, asset pipeline
- [ ] Release order: 0.14 THE WORLD, 0.15 sim rules, 0.16 to 0.18 QoL batches, 0.19 foundations, 0.20 the .exe, 0.21 fleets and mode perks, 0.22 graphics, 0.23 data views, 0.24 huge worlds, 0.25+ depth

#### 7.3c Quality-of-life backlog (details in 05-desktop-version.md)
- [ ] Select and act: box-select, bulk actions, copy settings, rename, upgrade all affordable and upgrade queue, search anywhere, favourites bar
- [ ] Vehicles: fleet sheet with filters, auto-renew and auto trade-up, per-building defaults, group and pause lines, follow-cam, payback calculator
- [ ] Building: drag and ghost preview with cost, auto-road tool, undo and redo, bulldoze area, upgrade a road in place, copy a route
- [ ] Information: tooltips everywhere, notification log and alert choices, profit per building and line, net worth graph, price history and demand hints, best-place-to-sell hint, "why?" explainers, event timeline
- [ ] Camera: bookmarks with hotkeys, jump to town or last alert, snap-rotate, reset north, edge scrolling, smooth zoom
- [ ] Flow: speed steps and fast-forward to next event, quick save and load, named saves with notes, confirmation toggles
- [ ] Settings and help: UI scale, text size, colour-blind modes, reduced motion, key rebinding and hotkey sheet, glossary and searchable help, one-time contextual tips

#### 7.4 Player tools and sharing
- [ ] Map editor (also speeds up maps 2 to 5)
- [ ] Photo mode and time-lapse recorder
- [ ] Blueprints (save and paste a layout)
- [ ] Statistics dashboards
- [ ] Mod support (vehicles, maps, textures), Steam Workshop later
- [ ] Share a save or map by link or code

#### 7.5 Online and Steam (later)
- [ ] Steam store page early for wishlists, Steamworks SDK, achievements, cloud saves
- [ ] Daily challenge map and leaderboards (small server)
- [ ] Co-op, two players one world
- [ ] Controller and Steam Deck support

#### 7.6 Polish
- [ ] Accessibility: colour-blind modes, UI scale, subtitles, reduced motion
- [ ] Several languages
- [ ] Adaptive tutorial, trailer-ready intro scene
- [ ] Discord rich presence
- [ ] Opt-in anonymous stats, automatic quality by performance monitor

---

## Session Update Log

| Date | What Moved | New Overall |
|---|---|---|
| Oct 11, 2026 | Project created | 0% |
| Oct 11, 2026 | Step Zero and a 2D Phase 1 built and tested | 7% |
| Oct 11, 2026 | 2D version became a painted globe-wrapping map with names and buildings | 61% (2D scope) |
| Oct 12, 2026 | Towns as districts, 15 goods, sheets, new header | 58% |
| Oct 12, 2026 | Feedback pass: smooth auto-routed roads, flat build sites, quarry pit, floating dock menu, rail and trains with level crossings | 50% |
| Oct 12, 2026 | Tunnels placed from the terrain, roads regrade the ground, tier quests with rewards, how-to-play guide, highway joins, everything seated on the drawn ground | 55% |
| Oct 12, 2026 | Touch controls, districts and specialisation paths, vehicle ladder, running costs, pacing bot | 60% |
| Oct 16, 2026 | Strip towns, two-angle build camera and animations, bank, opening screen, districts as buildings, rail yard, auto-joined road networks, smaller ice caps | 72% |
| Oct 17, 2026 | 0.7: Warehouse and freight terminals, by-product lines, stuck diagnosis, vehicle bodies and full loads, new guide, building dashboards | 74% |
| Oct 17, 2026 | 0.8: Balance passes, stuck and waiting badges, ask-before-buying trucks, full loads with leftover detours, demolish confirm, first-time tips, inbound trucks and selling history, phone layout | 78% |
| Oct 17, 2026 | 0.9: Menus split into pages, save export and import, green spots for rail yards, airports and ports, big upgrade button, town menu, scaffolding on upgrades, auto-buy prompts | 80% |
| Oct 17, 2026 | 0.10: Bank explained in plain words with today and all-time results for loans, savings and the fund; vehicle upgrades are quiet and keep the menu open | 81% |
| Oct 17 to 18, 2026 | 0.11 to 0.17: fuller world, node belts, Map 2, town reserve and gates, land plots | see project log |
| Oct 19 to 21, 2026 | 0.70 to 0.89: Supply Yard and Distribution Warehouse split, closed towns, long truck reach, hired drivers, Mechanic Shop, Trucks tab, no vehicle upgrade buttons | see project log |
| Oct 22 to 23, 2026 | 0.90 to 0.96: Recycling Yard, about 45 goods and 38 sites, fishing harbor and boats, balance pass, models for every level, open placement, truck level-up panel, scrolling build tray | see project log |
| Oct 23, 2026 | 0.97 to 0.98: fog of war for speed, factories on open ground, green build zone for every build tool | see project log |
| Oct 23 to 24, 2026 | 0.99 to 0.106: $6,000 start and lower running costs, smarter sell-to choices, by-product scrap and buyers for every early product, staged building menu, idle vehicles, nearer clay and stone, roadside patch, fishing boats sail | see project log |
| Oct 24, 2026 | 0.107: a hired crew of mechanics | see project log |
| Oct 24, 2026 | 0.108: yard vehicle limits by building level; Map 3 made and shown in the menu as in progress | see project log |
| Oct 23 to 25, 2026 | 0.109 to 0.216: see "Release history since 0.108" at the top | about 74% |
| Oct 11, 2026 | Direction changed to a 3D globe. Rebuilt the renderer in Three.js, added terrain, towns, nodes, push/pull hubs, vehicle classes, levels, demolish, new HUD | 45% (new, larger scope) |

---

## Next Update (Chris's list, Oct 12, 2026) — done

- [x] **Delete roads.** Demolish removes a road, highway or rail with its vehicles and refunds half; town streets cannot be removed.
- [x] **Lay roads, highways and rails with no site at the ends.** Start anywhere on dry ground or on an existing road; finish on a building or another road (or press Enter / tap Finish). Between two buildings that trade a vehicle comes with it, otherwise it is just road to connect to later.
- [x] **Nodes no longer look like quarries.** Farmland is a patchwork of crops with a hedge and a tractor, pasture a fenced meadow with cows, orchards are rows of trees, clay a bank with a pond, ore a rust-coloured scree with a timbered adit, coal a black heap with a cart. Only quarries keep a pit. The props disappear when a building takes the node.
- [x] **Cleaner, more natural placement.** Farmland, pasture and orchards cluster in belts on flat ground; every town has a forest, farmland and pasture within reach; trees grow in groves and glades with clear space round fields and pits.
- [x] **For-sale lots.** A clean serviced pad with survey stakes replaces the fenced dirt pad and billboard. The edge of the built-up area is full of construction sites in different stages, so a town looks in development and fills in as it grows.
- [x] **Every town starts at the first level**, major cities included (they keep their larger footprint).
- [x] **Full-screen sheets.** Towns, Production, Quests and the guide take the whole screen under the top bar, and the Towns list uses up to three columns.
- [x] **Selection panel no longer runs under the dock.** It scrolls (wheel, or drag on touch) inside the space above it. Hover hints no longer show under open sheets.

## Downtown, skylines and scale (0.207)

- [x] **Scale chart** (`docs/scale.md`, `src/scale.ts` BUILDING_HEIGHT, picture `docs/scale-lineup.png`): 1 unit is 10 m, a tile 32.7 m; cottage 7 m up to a 150 m core tower. The highest peak is now 160 m (was 65 m), so mountains stand above the skyline.
- [x] **Downtown (new worlds only, `world.downtown`):** a town keeps only its Market and Supply Yard as plots (`DOWNTOWN_PLOTS`) and holds 12 (town) or 20 (city) district lots (`DOWNTOWN_CIVIC`). The rest of its street frontage is housing that rises with the town's level. The ground a town holds is exactly the same as before (tested), so nothing is given up or taken. Old saves keep their lots.
- [x] **Skylines** (`src/sim/skyline.ts`): each town is low (stays at terraces and fills out), mid-rise, or tall (towers at level 5), fixed by where it stands and its style. A major city is never low. Heights fall off smoothly from the centre, so neighbours are always close in height.
- [x] **Districts are shopfronts:** the district stands at the front of its lot and the housing rises behind it, as tall as the skyline allows there. Sports campuses are untouched.
- [x] **Factories go on open ground near a town.** They count as that town's within 14 tiles (`TOWN_CATCHMENT`), so a town's path still speeds them. A fourth free starter plot of plain open ground is handed out with the three node plots. Quest hints and tab text now say "open ground near the town".
- [x] **Window grids and shopfronts (0.208):** every downtown wall has a window row to each floor (3.2 m), and each block stands on a run of glazed shopfronts with awnings and a sign band, coloured by town style. At night only the glass cells light, each lit or dark by itself.
- [x] **Styles:** towers take their colour from the town's style (nordic steel, temperate blue glass, mediterranean sandstone, tropical teal, arid ochre); shopfront awnings differ by style too.
- [x] **Reserved district lots** look like paved, hoarded sites with a gold sign facing the street, not fenced plots for sale.
- [x] **See-through towers:** while a road, building or demolish tool is active the towers shrink to low-rise (`townSquash` in game3d.ts) and rise again on select. In select mode a click on a tower picks the tile it stands on, not the ground behind it (`tower()` in pickTile).
- [ ] Not done: the test bot cannot play new downtown worlds (it builds factories in town lots), so pacing is not re-measured; towers in the demo base and the wiki; tower shadows do not shrink with the squash.

## Website wiki parked (0.206)

- [x] The website wiki (/wiki pages, gallery and the 55 MB of model pictures) is no longer built or shipped, to keep Vercel storage down. The code is kept in `docs/wiki-parked` (with its data.json); `tools/export-wiki.cjs` writes there. The site is now 8.5 MB (was over 60). The in-game Wiki (I) is unchanged. To bring it back: move `docs/wiki-parked` to `web/app/wiki`, restore the gallery copy in `web/scripts/assets.cjs`, and the nav and footer links.

## Level 0 menu, unlock cards and wood sales (0.206)

- [x] **Quarry is Tier 1**, and stays locked until a town reaches level 2 (`SITE_UNLOCK_QUEST.quarry = t1-town2`): stone is first needed for a town's next step.
- [x] **Wood Yard stays in Tier 0** but opens after the cheese quest, with two new quests ("Build a Wood Yard", "Sell 40 firewood to the Market"): it turns the spare logs into firewood.
- [x] **Logs and lumber keep a buyer.** The Supply Yard (`FREIGHT_DEMAND`) and the Market (`MARKET_WOOD`) both buy them once the town is built. The Market still refuses lumber the town needs for building, so it goes to the yard first. Tests: wood.test.ts.
- [x] **Unlock cards.** Finishing a quest that opens a building shows "New building unlocked": what it is, which tab, the cost, and the quest that opened it. One card per quest, shown in turn; a loaded game shows none.
- [x] **Padlock cards are ordered and labelled.** Empty tabs stay. Quest locks (gold, "After quest" and the quest name) come first, then each tier, then town-level locks, then full game.
- [x] **Growth plays before popups.** The tier, unlock and next-town cards wait until the growing town's show is over (`growthShowing`), so nothing covers the animation. Checked by growing a town in the live game: the old model sinks, the new one rises behind scaffolds, rollers lay the new streets.

## Checked against 0.205 (the list below was written around 0.71 to 0.118)

What the paused list looks like now, so nothing is rebuilt or undone by mistake:

- Pacing: current bot run (seed 11, 3 game hours): Tier 1 at 6.5 min, Tier 2 at 72.5 min, town levels 2/3/4 at 16/29/72 min, Tier 3 not reached. Already slower than at 0.71 (Tier 2 was about 45 min). The 10-hour target needs a longer run and a human playthrough.
- Dormant towns: not built. Hard mode: only a flag on the world (`world.difficulty`), nothing reads it. Train stations: built (one per town from Tier 2); wagons are not.
- Built since 0.71 and no longer open: green and orange build zones (0.122, again for every tool in 0.204), staged district growth and neighbour blending (new worlds), a fuller Tier 0 to 1 quest line (0.123 to 0.126, 0.191 to 0.198), in-game Wiki (0.187), tutorial (0.124), Map 3 (beta, 0.127), demo and website (0.136 to 0.166), held ground and footprints (0.197 to 0.205).
- Fog of war was tried (0.97, 0.115) and removed (0.118). Do not bring it back without asking.
- Steam: keep on the list, do not raise until the demo is 100% complete.

**Locked in: new work must not undo any of these.** Eight to ten building levels (0.20, 0.94); vehicle classes are bought directly with no upgrade buttons (0.89); truck reach and fuel limits (0.75, 0.76, 0.190); Supply Yard and Distribution Warehouse split, closed towns built from lumber (0.72 to 0.82); drivers, mechanics and driver shortcuts (0.73, 0.107, 0.199); about 45 goods and 38 sites with the by-product rules in `flows.test.ts` (0.90 to 0.93); buildings never on roads (0.94); land plots (0.122, 0.205); one early building unlocking at a time through the quest line (0.194 to 0.196); held ground, the 5x3 airport and the driveway rule (0.197 to 0.205). Before changing any of them, check the tests that cover them and ask.

## What to Tackle Next

Shelved (not finished, for after the current round):

- [ ] Map 3: Chris's layout edits by grid cell (waiting on Chris); then the size groundwork still undone: ground picture streamed in tiles (capped at 4,096 px across now, 5 px a tile), trees only near the camera, a grid index for the lookups that scan every tile; then open it for play and run the balance bot on it
- [ ] Look at it on screen (headless screenshots time out): green build zone, houses off roads, models at each level, harbor and sailing boats, Fleet "sell idle" button, Mechanic Shop panel, Map 3 preview and grid badge, About page, desert ground, /goods/ page
- [ ] Smoothness: send the F3 readout (draw calls, triangles) from a zoomed-in and a far view, then cut what costs the most (separate objects, lights, shadows)
- [ ] Town building models are all built at load: skip towns far from the view until needed
- [ ] Pacing on the hand-made maps: re-run `PACING=1 PACING_MAP=map1` and `map2` after the 0.118 changes; Tier 2 needs a level 4 town
- [ ] "Chicken": poultry meat is only a placeholder on /goods/ (see `src/sim/planned.ts`); other planned goods move into the game one at a time
- [ ] First 10 minutes earn nothing; Market absorption ceiling; spice and cocoa reuse the coffee and mango models
- [ ] Parked balance: wear formula, prices, driver XP slowing with rank, pacing numbers, quest numbers
- [ ] Parked towns: train stations in towns, dormant towns
- [ ] Desert: farms could be slower or need water on sand; the fog of war was tried in 0.115 and removed in 0.118 (it looked wrong and was not needed)
- [ ] Desktop: code signing and the Steam fee (see 05-desktop-version.md)

Done earlier:

- [x] Planes and airports
- [x] Rail stations: every town gets one at Tier 2, trains sell through it
- [x] Stations that also load goods made in the town onto trains
- [ ] Tune the quest numbers and rewards after a real playthrough
- [x] Deployed to Vercel: every push to main is a live deployment (retention set to a week or two)

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed

#### Footprints, held ground and the wiki (0.197 to 0.205)
- The airport is now a 5x3 rectangle (long runway across the back); R turns it and the long side turns with it. The old 3x3 note above is superseded.
- One lot size (`LOT`, 3.1 units) for town lot pads, site fences and the fit rule. A model is shrunk to fit the ground it covers (`siteFit`), height is never squeezed.
- New worlds: a building on open ground holds a 2x2 block from placement, and a building on a resource node holds one when there is room. Body is one tile to level 3, the whole block from level 4.
- A building turned by hand is entered from its front tile (`entryTile`); an arrow marks it while placing and while drawing a road.
- Land plots never include a town's grown footprint; no resource node lies inside one (tested).
- The wiki data (`web/app/wiki/data.json`) and the model pictures (`docs/model-previews`) are regenerated with `node tools/export-wiki.cjs` and `node tools/model-gallery.cjs`.

## 0.210
- Every finished quest shows a card: cash paid, what it unlocked (with the building blurbs), and the next quest with its hint. Continue starts the town or city growth show; halfway through it a "Back to previous place" button returns the camera to where the player was.
- Quest hints written out in full for the four paths and Tiers 3 and 4; new Tier 0 quest "Earn your first $60".
- Downtown pacing (seed 11): the test bot's factory on open ground was walled in by neighbours' held ground, so no road could reach it and no lumber was made; the bot now checks for a way out. Result: T1 7.9 min, town level 2 at 21.7 min; level 3 not reached in 3 h (bot only grows one town). Players can hit the same walled-in spot: the build check does not warn about it yet.
- Release workflow takes the installer version from the tag.

## 0.215
- Building materials: from Tier 1, a new building in or beside a built town (Supply Yard and Market standing, within 14 tiles) costs money plus materials out of that town's Supply Yard store: lumber at Tier 1, plus bricks at Tier 2, plus cement at Tier 3, bricks, cement and steel from Tier 4. Tier 0 buildings and anything that makes the material itself (the Sawmill) need none. The building waits (`site.pending`, nothing runs) until the yard has it; the yard stocks these goods on top of the next level's materials (`depotLeft(place, yard, g, world)`). Town growth materials per style and level are unchanged.
- The test bot sends the yard what waiting buildings need. Downtown pacing (seed 11): T1 7.9 min, town level 2 at 25.3 min.

## 0.216
- Materials for upgrades: going up a level takes materials from the town's Supply Yard store (`site.upgrade`; the building keeps working at its old level until they arrive). Each level asks for a different mix: lumber, +bricks, +cement, steel, concrete, glass, tools, growing with the level (`upgradeMaterials`). New buildings: Tier 4 now takes bricks, concrete and steel.
- Waiting buildings stand as a scaffolded site with crane and piles until the materials arrive, then the work plays on. The build card and the upgrade button say what they take. Town growth materials per style and level unchanged (four different lists per style).
- Downtown pacing (seed 11): T1 7.9 min, town level 2 at 26.2 min; level 3 not reached (bot grows one town).

## 0.217
- Live materials guide (`src/sim/guide.ts`, card in the HUD): a building or upgrade waiting on the Supply Yard store shows what it needs, why, and a short list of steps that tick off from the real world (build the maker, switch it on, road it to the yard, switch the sale on, buy a truck, wait for delivery with a count). The current step rings its build button. No rewards: these are the how-to inside a quest.
- Found while checking "can't send materials": the sim does deliver (a brickworks roaded to the yard fills a waiting building); the gap was knowing what to do. Next in this thread: subquests inside the quests themselves, the tutorial folded into the same card, a "waiting for materials" list on the Supply Yard panel.
