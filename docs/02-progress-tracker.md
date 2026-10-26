# Supplyline — Progress Tracker

One page. Full release notes are in [04-project-log.md](04-project-log.md); the old long tracker is kept in [12-progress-archive.md](12-progress-archive.md).

## Right now

| | |
|---|---|
| **Release** | 0.234 (October 26, 2026): truck buyer chips work |
| **Overall** | About 74% of the planned scope |
| **Status** | Active. Tester build is out (Windows and Mac installers on GitHub Releases, coded tester page at /access, public site at /) |
| **Tests** | 561 pass, 2 skipped. Type check and build clean |
| **Pacing** | Test bot, downtown world, seed 11: Tier 1 at 7.9 min, town level 2 at 26.2 min, level 3 not reached. A human playthrough is the real test |

## Progress by area

| Area | % | Still missing |
|---|---|---|
| Core sim (production, logistics, towns, districts, paths) | 100 | Locked in, see below |
| Vehicles, drivers, mechanics, fleet | 95 | Wagons, per-mode perks |
| Quests and teaching | 90 | Quest numbers need a human playthrough |
| Materials economy (Supply Yard store) | 90 | Balance not measured by a person |
| Market and buyers | 95 | Supply Yard raw-goods price (Chris's call) |
| Town growth and skylines | 85 | Level 3 not reached by the bot; towers in title world; tower shadows |
| UI and menus | 90 | One small approved change at a time |
| World look and art | 55 | Real models later; clouds, day/night, sound |
| Performance | 70 | Dormant towns; Map 3 load time; FPS on real hardware |
| Desktop app and releases | 85 | Code signing |
| Tester launch | 80 | Waiting on tester feedback |
| Steam | 0 | Not raised until the demo is 100% done |

## Phases

| Phase | What | % |
|---|---|---|
| Step Zero | Prove the loop | 100 |
| 1 | MVP as a 3D globe | 100 |
| 2 | Core loop: rail, air, goods, highways | 100 |
| 3 | The world, polished (graphics, sound) | 58 |
| 4 | Depth: districts, paths, vehicle ladder | 90 |
| 5 | Living towns, bank, rail yard, joined roads | 100 |
| 6 | Later: sea transport, real-money cash, events | 50 |
| 7 | Desktop version, auto-updates, WebGPU, Steam (see [05-desktop-version.md](05-desktop-version.md)) | 23 |

## Open items

**Needs Chris**
- [ ] Vehicles through the driveway: describe what you see
- [ ] Supply Yard price for raw goods: full price or salvage
- [ ] Playthrough: quest numbers and material amounts

**Needs checking**
- [ ] Map 3 flashing fix (0.231 to 0.233) on real hardware
- [ ] Truck buyer chips (0.234) in the running game
- [ ] Live /access page shows the version and downloads

**Build next**
- [ ] Test bot grows only one town, so Tier 2 and town level 3 are not re-measured
- [ ] Towers in the title and sample world; tower shadows do not shrink with the squash
- [ ] Padlock card to Wiki link
- [ ] Map 3: Chris's layout edits, then size groundwork (streamed ground, near-camera trees, grid index)
- [ ] Dormant towns, wagons, Hard mode (only a flag, nothing reads it)
- [ ] Models replaced later by artist or AI models: fix terrain, culling and LOD, not the current models

**Dropped**: old-save compatibility, spoilage, fog of war (tried and removed, do not bring back without asking).

## Locked in

New work must not undo these. Check the covering tests and ask first.

- Eight to ten building levels
- Vehicle classes bought directly, no upgrade buttons
- Truck reach and fuel limits
- Supply Yard and Distribution Warehouse split; closed towns built from lumber
- Drivers, mechanics, driver shortcuts
- About 45 goods and 38 sites, with the by-product rules in `flows.test.ts`
- Buildings never on roads
- Land plots
- One early building unlocking at a time through the quest line
- Held ground, the 5x3 airport and the driveway rule

## Recent releases

| Release | What changed |
|---|---|
| 0.234 | Truck buyer chips work: a click unpins the buyer and re-routes the truck |
| 0.233 | Far node markers much smaller |
| 0.232 | Node markers stop flashing on hover or tool change |
| 0.231 | Resource markers and boulders stop popping at range edge |
| 0.230 | Map 3 builds again; failed map builds show the error |
| 0.229 | Level 5 capstone districts earn more than they cost |
| 0.215 to 0.228 | Materials economy, quest tracker, district venues, Supply Yard guides |
| 0.109 to 0.214 | Map 3, tester pages, UI redesign, footprints, downtown skylines, quest cards |

## Build rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed
