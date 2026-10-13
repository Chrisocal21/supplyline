# Supplyline — Progress Tracker

---

## Supplyline

**Overall progress:** about 60% (by checklist count; all of it runs, most of it is playtested only through automated clicks)
**Last updated:** October 12, 2026
**Status:** Active

---

### Phase 4 — Depth: towns you keep building (Oct 12, 2026)

**Phase progress:** 85% (17/20)

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
- [ ] Per-path quests and path mastery
- [ ] Deploy and offline play (service worker) so the iPad can load it with no signal

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

**Phase progress:** 70% (7/10)

- [x] Rail as its own network, with level crossings, and freight trains
- [x] Airports and cargo planes
- [x] More goods and chains, so bigger towns have more to want (15 goods, by-products, 6 new buildings)
- [x] Towns as districts with through streets, production and towns sheets, new header
- [x] Major cities and small towns; for-sale lots, driveways and regional town styles
- [x] Highways (four lanes, faster) that narrow into streets
- [x] Roads regrade the ground: cuts, embankments, and tunnel mouths placed from the real shape of the hill
- [ ] Economy balancing pass (prices, speeds, costs, town growth rate)
- [ ] One-click auto-road tool (the path finder already exists)

---

### Phase 3 — The World, polished

**Phase progress:** 0%

- [ ] Real textures and models, water motion, clouds
- [ ] Day and night, seasons
- [ ] Sound

---

### Phase 4 — Depth

**Phase progress:** 0%

- [ ] Contracts and events (demand spikes, price changes)
- [ ] Larger maps
- [ ] Vehicle upgrades and depots

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
| Oct 11, 2026 | Direction changed to a 3D globe. Rebuilt the renderer in Three.js, added terrain, towns, nodes, push/pull hubs, vehicle classes, levels, demolish, new HUD | 45% (new, larger scope) |

---

## Next Update (Chris's list, Oct 12, 2026, from playing the first build)

- [ ] **Delete roads.** A way to remove a road, highway or rail (a section or a whole route), with a refund and its vehicles handled.
- [ ] **Lay roads, highways and rails without a site at either end.** Let them start and finish on any open ground or on an existing road, so the player can lay out a clean network first and connect sites to it afterwards.
- [ ] **Resource nodes should not look like quarries.** Nodes (farmland, forest, clay, ore, coal and so on) currently show as ringed pits and flat brown or green patches. Each kind needs its own natural look.
- [ ] **Cleaner, more natural placement of nodes, farms and scenery.** Less clutter, less like assets dropped everywhere: clustering, spacing, fields that follow the land, trees that belong to forests.
- [ ] **For-sale lots look wrong.** Replace the fenced dirt pads with a town that looks "in development" around its roads: cleared ground, building sites, small buildings that get added and replaced as the town grows. Some plots stay reserved for the player's buildings.
- [ ] **Every town starts at the bottom.** Major cities currently start at level 2 with 250 growth (code: `level: city ? 2 : 1` in `src/sim/features.ts`), so a new game already shows Villages and a different building count. All towns should start at the first level; a bigger footprint should not mean a later stage.
- [ ] **Towns list as a full-screen window.** The Towns sheet should be a proper full-screen pop-up, like a normal game menu, instead of a panel over the map. Same for the town side panel, which runs under the bottom bar.
- [ ] Tooltip and side panel clash with the bottom bar when many goods are listed (the Vehicles card overlaps the panel).

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
