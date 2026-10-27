# Supplyline — Future Plan: Never-Ending, DLC, Other Planets

Written by Claude on October 26, 2026, at release 0.234, from Chris's direction: plan the future now so the game stays easy to extend while we find bugs. Think Farming Simulator: content keeps arriving, nothing is ever "finished". **This is a plan only. Nothing here is started, and it does not change the demo finish line** ([02-progress-tracker.md](02-progress-tracker.md)). Bring it to ChatGPT for a second opinion before we build anything from it.

> **Status, October 26, 2026.** This plan has been reviewed by ChatGPT and partly corrected. The running record is now [16-future-ledger.md](16-future-ledger.md); where the two differ, the ledger wins. Corrections already agreed: the $250,000 goal is Tier 3, and Tier 4 "Legacy" ($1,000,000) allows play on, so there is no forced end; goods stay a typed list (no "open registry"); new transport modes and mechanics are code, not data; the first pack should be proven before any pack platform; "Orchard and Brewery" already exist in the base game, so the first pack is now proposed as beer variants with a recipe selector.

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

---

## ChatGPT second opinion — October 26, 2026

Review only; no implementation or new policy is approved. I spot-checked `defs.ts` and the `World` state and routing code, rather than auditing the whole codebase. The direction is workable. My main change is to prove one small Earth content pack before building a general pack platform or moving the entire game into a multi-world architecture.

### The idea in one paragraph

**N1. Separate endless play, ongoing content and unlimited growth.** These are three different promises. Players can keep running and improving a mature company without infinitely increasing building levels, map size or production numbers. Retain the locked building levels and use optional efficiency goals, new destinations and different production choices for longevity. Avoid turning a successful economy into an endless requirement to buy more factories just to move a progress bar.

**N2. Give each expansion a new decision, not just more entries.** An Earth pack might introduce a useful alternative production chain; a space pack might make infrequent, expensive freight launches worth planning around. Write that player benefit before listing goods. A planet that uses the same routes and recipes under different names may be technically extensible but not worth playing.

### What the code already gives us

**N3. Narrow three claims in the checked section.**

- Data-driven recipes make additions within existing behavior easier. They do not make crop rotation, orbital transfers or a new transport mode data-only. `RouteMode` is currently a closed union, and `world.ts` contains mode-specific eligibility, placement and reach checks. Separating rendering from simulation does not remove the need for new simulation rules.
- The fixed `Good` union does not prevent a save from recording required packs. First-party packs shipped with the application can also contribute to a combined, typed catalog at build time. An open runtime registry is needed only if the chosen loading model requires it; replacing `Good` with unrestricted strings now would lose useful checks.
- The current ladder includes the Tier 4 **Legacy** goal of **$1,000,000**, with text explicitly allowing continued play. The $250,000 goal belongs to Tier 3. The future problem is sustaining worthwhile decisions after milestones, not removing a forced ending that this definition does not impose.

Catalog tests are valuable, but do not establish that thousands of interacting items are balanced, performant or reachable. That needs separate evidence.

### What is in the way: fix first and what can wait

**N4. Prioritize contracts between systems over file size.**

| When | Work | Why |
|---|---|---|
| During normal demo work | Keep existing IDs stable; record future compatibility decisions; avoid adding unnecessary coupling | Small discipline changes with no architecture migration |
| After the demo, before the first pack | Define supported pack combinations, activation rules and the save-support baseline; extract only the catalog pieces needed by one small pack | Proves the extension path with real content |
| Before persistent multi-world play | Move shared state into Campaign, define clocks and cross-world transfers, and test complete saves | This is when the current `World` ownership becomes a concrete blocker |
| When measured | Search/grouping, larger maps, dormant simulation | More recipes do not inherently require Map 3; profile actual content and usage |
| Later | Arbitrary runtime packs, public mod API, custom generator plugins | These create a lasting support interface and are not prerequisites for first-party DLC |

Splitting a large file by responsibility can help reviews, but line count alone is not a reason to redesign the simulation. Keep mechanical moves separate from behavior changes.

### Proposed structure

**N5. Keep Campaign / World / Pack / Link, with clearer ownership.** Campaign is the saved playthrough, not the user's account or purchase library. It can own the shared treasury, company milestones, active content configuration and world list. A World owns local terrain, inventories, towns and routes. Whether unlocks are global or local remains a design choice: Earth progress should not accidentally mark every Mars tutorial complete. Do not add research solely because the proposed Campaign list mentions it.

Content definitions live outside mutable save state. A pack supplies definitions; a saved campaign records which versions it used. Installed, owned and active packs are different concepts. Preserve the existing single-player, no-backend direction; this architecture does not require an account service.

**N6. Model cross-world freight as a saved shipment.** A Link connects endpoints identified by both world ID and site ID. Cargo in transit needs its own identity, quantity, departure/arrival time and destination. Loading removes stock once; arrival credits it once. Define what happens when a destination is full or removed. Saving mid-flight and reloading must neither duplicate nor lose goods. Save the campaign, affected worlds and shipments as one consistent snapshot. Start with scheduled transfers; a continuously simulated rocket is not required to prove the economy.

**N7. Decide time behavior before opening the second world.** Recommendation: one campaign clock, with world-local random streams and consistent economic progress while the player views another world. If background worlds update less frequently, transfers, consumption and earnings must still reconcile correctly. Switching cameras or saving/reloading must not change the economic outcome. Real-world offline earnings are a separate feature and should not arise accidentally from this design.

### Guard rails to keep, change and add

**N8. Keep stable identity, but allow deliberate migrations later.** Never reuse an old ID for a different meaning. Display names may change freely. New pack IDs should be namespaced, such as `orchard:apple_juice`; do not rename all existing base IDs just to introduce that convention. Once compatibility support is approved, explicit aliases or migrations can handle exceptional ID changes. "Never rename" is a good default, not a substitute for a migration strategy.

**N9. Replace the absolute ban on `if` chains with a narrower rule.** Put repeated content variation in definitions. Keep genuinely different mechanics in focused simulation code. Adding a new boolean for every special case eventually creates contradictory combinations. Validate capabilities and their required fields, and introduce a shared mechanism only when actual content needs it. Do not refactor existing special cases opportunistically during unrelated bug fixes.

**N10. Soften the immediate `World` rule.** Document whether a new field is company-wide or local, and keep access to company-wide state easy to move. Do not force every demo fix through a new Campaign abstraction before its behavior is agreed. Similarly, make text accurate about continued play, but avoid a sweeping rename of all "end-game" references.

**N11. Add a minimal pack manifest and dependency validation before packs ship.** Record pack ID/version, supported game or content-schema versions, required packs, and any explicitly unsupported combinations. Reject duplicate IDs and unresolved recipes, quests or assets before starting a session. Make loading deterministic and reject dependency cycles. Avoid hidden overrides where whichever folder loads last silently wins. The base catalog must not require an optional pack; any bridge recipe should belong to the pack or a declared integration.

### Save compatibility and adding packs to existing games

**N12. Make the compatibility promise bounded and explicit.** "Without breaking a player's save" is a new future commitment relative to the current dropped old-save policy. Recommend choosing a supported baseline before persistent public release or the first pack, whichever comes first. It need not include today's development saves. Labels and backups can be added independently; migrations remain a separate approved project.

A future save should distinguish save-schema version, application build, active pack versions and relevant map/generator versions. For supported upgrades: preserve the original, migrate a copy, validate it, then replace it safely. A backup alone cannot make old data compatible. Downgrading a migrated save need not be supported, but that limit must be clear.

**N13. Define adding and removing packs separately.** Recommend explicit activation into an existing campaign at a save boundary, with a backup and prerequisite check. If required content is missing, explain which pack/version is needed and leave the save untouched. Do not silently delete unknown goods or buildings. Supporting removal after a pack has contributed cargo, quests and worlds is substantially harder; defer it rather than promising effortless toggling.

**N14. Plan how new resources reach old maps.** A new ore does not appear on an already generated Earth simply because its definition exists. Decide per pack whether it uses existing resources, adds a new region/world, or performs an approved placement pass that preserves built land. Keep generator versions and map data sufficient to restore existing terrain; a seed alone is not a guarantee after generation algorithms change. A new destination is often simpler than retrofitting occupied terrain.

### Stages and the meaning of never-ending

**N15. Reorder around a small proof.**

1. **Stage 0:** finish the demo, with modest ID and ownership discipline. No pack engine or Campaign migration now.
2. **First post-demo experiment:** one small Earth pack using existing mechanics, with only the catalog extraction and manifest support it requires. Check base-only and base-plus-pack games, including activation into a supported existing save.
3. **Compatibility foundation:** establish and test the promised save upgrade path before shipping content under that promise. This can accompany the first pack; it is not something to retrofit after release.
4. **Two-world experiment:** extract Campaign and prove one transfer between Earth and a small destination. Choose Moon, Mars or a simple orbital buyer according to the gameplay question. A full second planet need not precede a station, and a full station simulation need not precede testing freight.
5. **Expand only after the experiment works:** deeper worlds, richer transport and eventually public mod support. Set a content cadence from measured production and support effort rather than promising a pack every few months now.

Crop rotation, seasons and livestock behavior are mechanics projects, even when packaged as Earth content. They should not be the first test of whether a data pack works. D1/D2 are prerequisites only when measured scale requires them.

**N16. Keep the base complete regardless of price.** Paid versus free does not decide how strict that principle is. Base quests, by-product outlets and recovery options must remain workable without optional content. Packs can add alternatives and new goals without making previous purchases or established routes economically pointless. Shared money also needs testing: a mature Earth treasury could remove every interesting constraint from a new world. Prefer meaningful local logistics prerequisites over inventing extra currencies by default.

### Risks and release checks

**N17. Test saved behavior as well as catalog validity.** Maintain small representative saves from the supported baseline. Check base-only, each pack with required dependencies, and supported combinations; the matrix grows rapidly, so do not promise every arbitrary combination. Cover upgrade/load/save, missing packs, mid-shipment reload, full destinations, reachable unlocks, valid by-product outlets, and a mature economy after recipe or price changes. A save can load successfully while the player's whole production setup stops working.

**N18. Budget for maintenance and long sessions.** Bound logs and history, measure save growth and background-world cost, and keep a representative large campaign for performance checks. Define model IDs and asset references separately from simulation identity so replacing placeholder art does not require changing saved buildings. Plan asset licensing and release maintenance alongside new content; a data format alone does not make a pack inexpensive to produce.

### Lessons from comparable games

**N19. Borrow explicit dependencies and migrations, not another game's entire plugin system.** Factorio documents versioned dependencies in its [mod structure](https://lua-api.factorio.com/latest/auxiliary/mod-structure.html), staged definition loading in its [data lifecycle](https://lua-api.factorio.com/latest/auxiliary/data-lifecycle.html), and ordered [migration files](https://lua-api.factorio.com/latest/auxiliary/migrations.html). The useful Supplyline lesson is to make content requirements and state transitions explicit. It does not require exposing executable third-party scripts or reproducing Factorio's infrastructure.

**N20. Distinguish loading compatibility from gameplay compatibility.** Factorio's [2.1 release notes](https://direct.factorio.com/blog/post/fff-449) explicitly say 2.0 saves load while some factory designs may break. That distinction matters here: preserving a file is weaker than preserving a viable company. For Supplyline, test established chains after changes and explain any required player action. The proposed migration tests and base-game guarantees above are recommendations drawn from that distinction, not a claim that another game guarantees unbroken factories forever.

The best near-term preparation is a few clear boundaries and accurate promises. Prove them with one modest pack, then let the first real cross-world economy determine how much architecture space actually needs.
