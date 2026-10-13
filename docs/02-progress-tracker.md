# Supplyline — Progress Tracker

---

## Supplyline

**Overall progress:** about 55% (by checklist count; all of it runs, most of it is playtested only through automated clicks)
**Last updated:** October 12, 2026
**Status:** Active

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
| Oct 11, 2026 | Direction changed to a 3D globe. Rebuilt the renderer in Three.js, added terrain, towns, nodes, push/pull hubs, vehicle classes, levels, demolish, new HUD | 45% (new, larger scope) |

---

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
