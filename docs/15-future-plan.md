# Supplyline — Future Plan: Never-Ending, DLC, Other Planets

Written by Claude on October 26, 2026, at release 0.234, from Chris's direction: plan the future now so the game stays easy to extend while we find bugs. Think Farming Simulator: content keeps arriving, nothing is ever "finished". **This is a plan only. Nothing here is started, and it does not change the demo finish line** ([02-progress-tracker.md](02-progress-tracker.md)). Bring it to ChatGPT for a second opinion before we build anything from it.

## The idea in one paragraph

Supplyline is an endless economy, not a campaign with a last level. The base game is Earth: farms, forests, mines, factories, towns, and trucks, trains, ships and planes. Later content comes as **packs** that add goods, buildings, vehicles, quests and whole worlds: more farm and industry depth, then other planets, then orbit and a space station that goods are shipped to. Each pack must be addable without rewriting the core, and without breaking a player's save.

## What the code already gives us (checked)

- **Content is data.** `src/sim/defs.ts` says "Add goods, sites, vehicles and quests here; the sim reads them generically." Goods are one list of string ids, sites are `SITE_DEFS` entries with a recipe or a producer, vehicles are `VEHICLE_DEFS` with a `mode`. Adding a farm, a brewery or a good is mostly a data edit plus a model.
- **Generated docs and tests follow the data.** The wiki is exported from the data (`tools/export-wiki.cjs`), and tests like `catalog.test.ts` and `flows.test.ts` guard it. That is what stops thousands of items becoming thousands of bugs.
- **Sim and renderer are separate.** `src/sim` has no graphics, so a new world or a new vehicle class does not touch the rules.
- **Sea and air modes exist** (barge, freighter, containership, plane, jet), so "a new transport mode" already has a pattern.

## What is in the way (checked, or marked unverified)

| Problem | Why it blocks the future |
|---|---|
| One `World` holds money, tier, earned, delivered and the map (`world.ts`, `version: 4`) | A second planet needs shared money and progress across worlds, but each map separate. Today those are tangled in one object |
| `Good` is a fixed union built from one const list | Packs cannot add goods without editing core code, and a save cannot say "this needs the Space pack" |
| `defs.ts` is a single 1,170-line file, `world.ts` is 4,697 lines | Every new pack means editing the same two files. Merge pain and slow reviews |
| Tiers and quests are tuned for one ladder (Tier 0 to 4, a $250,000 end) | "Never-ending" needs goals that do not run out. Unverified: how many places hard-code the top tier |
| Old-save compatibility was dropped on purpose | Fine for now, but DLC owners need saves to survive updates. Needs a rule before the first pack ships |
| Build menu and wiki assume tens of items | At hundreds of goods and sites, the menus need search and grouping. Unverified: how the build tray copes |
| Models are placeholders and will be replaced | Any pack that adds models must plan for the same replacement |

## Guard rails to follow starting now (cheap, no new features)

These apply to every bug fix and feature while we finish the demo. They cost little and prevent painting ourselves into a corner.

1. **Stable ids, never renamed.** A good, site, vehicle or quest id, once released, is never reused or changed. Saves and packs refer to ids.
2. **Content goes in data, not in `if` chains.** If a feature says `if (kind === 'sawmill')` in the sim, it should be a flag on the def instead. The `SiteDef` flags (`hub`, `dock`, `airport`, `store`) are the pattern to keep.
3. **No new fields on `World` that belong to the whole game.** Money, tier and unlocks are "campaign" things. Put new ones in one clearly named place so they can move later.
4. **Every new good or site gets its test hook.** The existing catalog and flow tests must cover it automatically. A pack that fails them does not ship.
5. **Name the end-game honestly.** Anything described as "the last tier" in code or text should be named so it can become "the last tier of the Earth campaign".
6. **Save format is labelled.** Pending D4 from the suggestions list: every save records its build and the packs it needs.

## Proposed structure (the shape to grow into)

- **Campaign.** Holds money, unlocks, research, the list of worlds and which packs are active. Persists across worlds.
- **World (a planet or map).** Terrain, towns, sites, routes, vehicles. This is roughly today's `World` minus the campaign parts.
- **Content pack.** A folder of data: goods, sites, vehicles, quests, world generators, models. The base game is itself a pack ("Earth").
- **Link (between worlds).** A route that crosses worlds, such as a launch site, orbital freight and a space station dock.

## Stages (order of work, not dates)

| Stage | What | Needs first |
|---|---|---|
| 0 | Finish the demo. Fresh-player test, bug fixes, the guard rails above | Nothing. This is now |
| 1 | **Earth, deeper and never-ending.** More farm and industry content: crop rotation, fields, livestock, machinery tiers, more chains. Goals that do not end: stretch goals, a rising "level" of towns and companies, yearly reports | Demo done. D1/D2 (Map 3 size, dormant towns) so bigger worlds stay playable |
| 2 | **Pack structure.** Split `defs.ts` into per-domain files, make goods an open registry, move campaign data out of `World` | A plan agreed with ChatGPT's review, and save labelling (D4) |
| 3 | **Second world.** A Moon or Mars map with its own resources and a small set of new goods; the first cross-world route | Stage 2 |
| 4 | **Orbit and the space station.** A launch site building, a rocket or lift as a new transport mode, a station as a hub and buyer | Stage 3 |
| 5 | **More planets and the long tail.** Each new world is a pack. Content cadence like Farming Simulator: a pack every few months | Stages 2 to 4 proven |

## Farming Simulator style: what "never ending" means here

- **Always something new to chase.** Rising town and company levels, record goods, efficiency goals, and contract boards (B1 on the suggestions list) once the economy is understood.
- **Depth that rewards setups.** Fields, seasons (F3), animals, machinery classes, storage, processing chains that need several inputs.
- **Packs, not patches.** Base game stays complete on its own. A pack adds a theme: Orchard and Brewery, Heavy Industry, Mars, Orbit.
- **Mod friendliness (later).** Because content is data, a documented pack format could let others add goods and buildings. Out of scope until packs work.

## Risks to watch

- **Content outruns testing.** More goods means more by-product and flow rules. The catalog and flow tests must grow with content, not after.
- **Balance matrix.** Each new chain touches prices and the Market. Add the pacing bot (A3) across several seeds before adding large packs.
- **Scope creep before the demo.** The demo finish line comes first. Stage 0 is the only stage active.
- **Performance.** More sites and bigger worlds hit D1 and D2 first. Profile before each stage.
- **Space needs a fresh look.** Another planet means new terrain generators, gravity-free or low-gravity visuals, and a different globe. Plan it as a new world generator, not a retexture.

## Questions for Chris

1. Which comes first after the demo: deeper Earth (Stage 1) or the pack structure (Stage 2)? My view: a little of both. Do Stage 2's id and save rules early, and keep Stage 1 content flowing.
2. Are packs paid DLC, free updates, or both? That decides how strict the "base game stays complete" rule must be.
3. Does space share money and unlocks with Earth (one company across worlds), or is each planet a separate start?
4. Is a documented mod format on the long-term list, or only your own packs?

## Questions for ChatGPT

1. What is missing from this plan for a game meant to run for years of content?
2. Which of the "in the way" items would you fix first, and which can wait?
3. Does the Campaign / World / Pack / Link split fit, or would you cut it differently?
4. Which guard rails would you add or drop?
5. Any lessons from Farming Simulator, Factorio, Satisfactory, Transport Fever or Stellaris-style expansions on shipping packs without breaking saves?

Please reply by section heading, and number new points N1, N2 and so on.
