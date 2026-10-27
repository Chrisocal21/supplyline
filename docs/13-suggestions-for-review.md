# Supplyline — Suggestions for Review

Written by Claude (Claude Code) on October 26, 2026, at release 0.234. Chris is collecting a second opinion from ChatGPT, then bringing both back before anything is built. **Nothing here is decided or started.**

## For the reader (read this first)

**The game.** Supplyline is a desktop and browser logistics and production game on a 3D globe (TypeScript, Three.js, Vite; simulation in `src/sim`, renderer in `src/r3d`, canvas UI in `src/ui`). You extract resources, process them, haul goods by road, rail, sea and air, sell to towns, and the towns grow into cities. Inspirations: Farming Simulator (production depth), Satisfactory (unlock ladder), Transport Fever and Railroads Online (routes), Cities Skylines (growing towns). Look: adult and grounded, not cartoonish. Single player, no backend, desktop first.

**Where it stands.** About 74% of planned scope, release 0.234. Core sim, vehicles, quests, the materials economy and the market are largely done. Weakest areas: world look and art (55%), performance (70%), and nobody but Chris has done a full playthrough yet. Tester build is out. Details: [02-progress-tracker.md](02-progress-tracker.md), [01-feature-map.md](01-feature-map.md), [03-open-questions.md](03-open-questions.md).

**Constraints. Please do not suggest breaking these.**
- Locked-in systems: 8 to 10 building levels; vehicle classes bought directly (no upgrade buttons); truck reach and fuel limits; Supply Yard / Distribution Warehouse split; drivers and mechanics; about 45 goods and 38 sites with fixed by-product rules; buildings never on roads; land plots; one early building unlocking at a time through quests; held ground, the 5x3 airport and the driveway rule.
- Dropped on purpose: fog of war, spoilage, old-save compatibility.
- Current 3D models are placeholders; artist or AI models arrive later. Do not spend effort polishing them. Terrain, culling and level of detail are fair game.
- Desktop only. No mobile or phone layout work.
- Steam is not raised until the demo is 100% done.
- UI changes go in one small approved step at a time. Chris wants lean, fast updates and short explanations.
- No HTML in outputs, no emojis, SVG icons only when needed.

## Claude's suggestions

Effort: S is a day or less, M is a few days, L is a week or more. Value is Claude's guess, not measured.

### A. Find out if the game is fun (highest value)

| # | Suggestion | Why | Effort |
|---|---|---|---|
| A1 | A structured human playthrough: Chris plays the first hour with a notes template (when bored, confused, or stuck; what he did next). | The pacing bot only grows one town and reaches level 2 at 26 min. Quest numbers and material amounts have never been tuned by a person. Everything else balances against this. | S |
| A2 | Make the first 10 minutes pay something. | Open item since early on: the opening earns nothing, which is where new players leave. A fast first sale or a small starting contract would fix it. | S to M |
| A3 | Extend the pacing bot to grow several towns and run on several seeds, reporting tier and level times. | Level 3 and Tier 2 are not re-measured on downtown worlds. A multi-town, multi-seed bot gives real numbers to tune against. | M |

### B. Short-term goals between tiers

| # | Suggestion | Why | Effort |
|---|---|---|---|
| B1 | Town contracts: a town posts a request ("200 bricks in 20 game minutes, paid at 1.5x") with a reward. | Tiers are long-range. Contracts give a reason to react now, use the existing demand and market code, and teach routing. | M |
| B2 | Soft events: price swings, a road closure, a bumper harvest, with a clear notice and no permanent loss. | Phase 6 already lists events. Keeps a settled economy from going static. | M |
| B3 | Difficulty: the `world.difficulty` flag exists but nothing reads it. Wire it to start cash, running costs and price volatility. | Cheap, gives replay value, and the hook is already there. | S to M |

### C. Making logistics readable and controllable

| # | Suggestion | Why | Effort |
|---|---|---|---|
| C1 | Show why a truck chose its buyer (its score for each choice) on the vehicle card. | The five buyer rules (spread out, highest demand, best price, closest, best earnings) were only just made to work in 0.234. Players need to see the effect or they will not trust them. | S |
| C2 | A bottleneck view: highlight the one building or road limiting each production chain, with a one-line cause. | Stuck diagnosis exists per building. A chain-level view is the Satisfactory-style payoff for building big. | M |
| C3 | Per-route rules: minimum load, priority between routes, and optional "do not go to a full buyer". | Pushes logistics depth without a new system. Check it does not fight the locked-in truck reach and fuel rules. | M |
| C4 | Wagons and per-mode perks (rail, sea, air each handle a different strength). | Already listed as unbuilt in the vehicles area (95%). Gives non-road modes a reason to exist beyond range. | L |

### D. Technical health

| # | Suggestion | Why | Effort |
|---|---|---|---|
| D1 | Map 3 size groundwork: streamed ground picture, trees only near the camera, a grid index for tile lookups. | World build alone is 20 s or more. The picture is capped at 4,096 px across. Needed before the map can open for play. | L |
| D2 | Dormant towns: towns far from the camera and with no active routes simulate cheaply. | Listed open. Scales to bigger maps and helps frame rate. | M |
| D3 | Measure FPS on a low-end real machine and record F3 numbers (draw calls, triangles) from near and far views. | Performance is 70% with no hard numbers from other hardware. Flashing fixes in 0.231 to 0.233 are guesses until seen on a real machine. | S |
| D4 | Save versioning plus a rolling backup (last 3 autosaves). | Old-save compatibility was dropped, so a version bump can break a player's save with no way back. Backups are the safety net. | S to M |

### E. Tester feedback loop

| # | Suggestion | Why | Effort |
|---|---|---|---|
| E1 | An in-game "Send feedback" button that copies a short report (version, seed, tier, town levels, time played, last 20 events) to the clipboard. | Testers can paste it into a message. No backend needed. Makes bug reports reproducible. | S |
| E2 | A "Known issues" line on the /access page, updated per release. | Saves repeated reports. | S |

### F. Atmosphere (after models arrive)

| # | Suggestion | Why | Effort |
|---|---|---|---|
| F1 | Sound: engines, ambient, a few UI sounds, quiet music. | Phase 3 is at 58% mostly because sound is missing. High feel-per-effort. | M |
| F2 | Day and night cycle, with clouds. | Listed missing. Fits the adult grounded look. Tie it to shadows already in the scene. | M |
| F3 | Seasons that affect farm yield. | Optional depth. Risks tuning load, so do it after A1. | M |

## Suggested order (Claude's view)

1. A1, then A2 and A3. Tuning anything else without a playthrough is guessing.
2. C1 and E1 (both small, both help the testers now).
3. D3, then D4.
4. B1 (contracts), then C2.
5. F1 and F2 once art lands.
6. D1 and D2 when Map 3 is the next goal.

## Questions for ChatGPT to answer

1. What is missing from this list that would matter most to a player of this kind of game?
2. Which of these would you drop or delay, and why?
3. Which suggestion breaks a constraint above? Flag it.
4. Where would you change the order?
5. Any good-fit ideas from comparable games (Transport Fever, Satisfactory, Factorio, Cities Skylines, Farming Simulator, Mini Metro) that cost little?

Please reply using the same numbering (A1, B2 and so on) for existing items and "N1, N2..." for new ones, so Claude can compare answers item by item.
