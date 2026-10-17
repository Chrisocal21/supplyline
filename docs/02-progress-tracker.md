# Supplyline — Progress Tracker

---

## Supplyline

**Overall progress:** about 72% (by checklist count; all of it runs, most of it is playtested only through automated clicks)
**Last updated:** October 17, 2026
**Status:** Active

---

## Phases at a glance

| Phase | What it is | Progress |
|---|---|---|
| Step Zero | Prove the loop | 100% |
| Phase 1 | MVP as a 3D globe | 95% |
| Phase 2 | Core loop: rail, air, goods, highways | 90% |
| Phase 3 | The world, polished (graphics, sound) | 33% |
| Phase 4 | Depth: districts, paths, vehicle ladder | 90% |
| Phase 5 | Living towns, bank, rail yard, joined roads | 100% |
| Phase 6 | Later: sea transport, real-money cash, events | 0% |

Overall: about 72%.

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

**Phase progress:** 95% (18/19)

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
- [ ] Deploy to Vercel (needs Chris go-ahead and a GitHub repo)

---

### Phase 2 — Core Loop

**Phase progress:** 90% (9/10)

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

**Phase progress:** 33% (4/12)

- [x] Richer sky and light, ambient occlusion and smoother edges close up
- [x] Opening screen with a cinematic flythrough
- [x] Smaller polar ice caps
- [ ] Ground and grass detail
- [ ] Trees with real shape
- [x] Buildings: a distinct signboard per site, wall grime and sun fade (more detail still to do)
- [ ] Water: reflections and moving ripples
- [ ] Clouds
- [ ] Day and night, seasons
- [ ] Sound and music
- [ ] Phone performance check
- [ ] Quality switch for slower machines

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

**Phase progress:** 0%

- [ ] Sea transport: ports, ships, water lanes
- [ ] Buying cash with real money (needs a payment service and a server)
- [x] Market events (demand surges and slumps, already in the game)
- [ ] Contracts
- [ ] Larger maps with more land
- [ ] Export and import of saves
- [ ] Highlight valid spots for airports and rail yards while placing

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

## What to Tackle Next

- [ ] Playtest on a real machine and fix what feels wrong (performance, camera feel, balance)
- [ ] Balance pass: how fast towns grow, prices, truck speeds
- [x] Planes and airports
- [x] Rail stations: every town gets one at Tier 2, trains sell through it
- [x] Stations that also load goods made in the town onto trains
- [ ] Tune the quest numbers and rewards after a real playthrough
- [ ] Deploy to Vercel once Chris approves

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed
