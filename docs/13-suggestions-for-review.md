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

---

## ChatGPT second opinion — October 26, 2026

Review only. Nothing below is approved or started. Based on this proposal, the progress tracker, feature map and open questions; this is not a code audit or a playthrough. Older notes contradict some current rules, so the constraints at the top and the current tracker take precedence. Effort estimates below are provisional.

My main recommendation: prove that a new player can understand, earn from and improve one working production chain before adding more reasons for that chain to fail. The strongest missing pieces are useful economic feedback, recovery from mistakes, and a clear test of where the demo ends.

### Existing suggestions: keep, narrow or delay

| # | Recommendation | Reason / smallest useful scope |
|---|---|---|
| A1 | First priority; include someone who has never played. | Chris can judge pacing but already knows the rules. Watch a fresh tester without coaching; record the first sale, first self-solved problem, first town growth, and when they want to stop. Record wall-clock time separately from game time and speed setting. |
| A2 | Keep, using the existing quest sequence first. | Make the first actual delivery visibly pay and explain why. A quest cash reward alone does not prove the business works. Adjust existing quantities or rewards before adding a contract system; do not unlock buildings out of order or silently decide the Supply Yard pricing question. |
| A3 | Keep after the first observed session. | Report cash lows, idle stretches, failed prerequisites and stalled material deliveries as well as tier times. Keep a fixed set of seeds so changes can be compared. A successful bot run proves feasibility, not enjoyment. |
| B1 | Delay until the opening works; start with one optional, untimed order. | Deadlines add acceptance, expiry, cargo accounting and reward rules. Only request goods and quantities the player can actually supply. Keep contracts separate from early building unlocks. M may be optimistic for the complete timed system. |
| B2 | Delay; leave road closures out of the first version. | A closure can strand the only affordable route and cause lasting economic damage even if the road later reopens. First establish that ordinary routing is understandable. A temporary demand bonus would be a gentler first experiment. |
| B3 | Delay until Normal is measured. | A flag is cheap; balancing several economies is not. Change one or two parameters initially. Price volatility is a separate source of uncertainty and should not be bundled into the first difficulty pass. |
| C1 | Keep, but show a plain-language reason first. | Example: "Best earnings: higher sale value after travel costs." Show the reason used at dispatch, not a newly calculated explanation after prices change. Candidate scores belong in optional detail or diagnostics. |
| C2 | Keep the diagnosis goal; reduce the first scope. | Surface existing building warnings and let the player jump to the affected site. A network can have several changing constraints; promising to identify the single limiting road or building is stronger than the evidence may support. Full chain analysis could exceed M. |
| C3 | Delay until testers demonstrate a missing control. | Minimum loads can leave trucks waiting forever; skipping full buyers needs a clear waiting or fallback rule. Add one rule at a time, with visible reasons for waiting and the same reach/fuel checks as today. |
| C4 | Keep on the roadmap, outside the immediate feedback pass. | First establish what road transport cannot economically do well. Tune existing mode costs, capacity and reach before adding more perks. Do not reopen vehicle upgrades or airport placement rules. |
| D1 | Delay until Map 3 is the next agreed goal. | Measure generation, texture creation, memory and rendering separately before choosing the remedy. A larger map will magnify unresolved pacing and navigation problems. |
| D2 | Conditional on profiling. | Off-screen towns can still consume stock, affect prices and earn money. Cheap simulation must preserve those outcomes and timers. Camera movement must never become an economic strategy. This may be substantially more than M. |
| D3 | Move alongside A1. | Test an early save and a busy later save on actual tester hardware. Record resolution, graphics setting, game speed, frame-time spikes and save/load pauses alongside FPS, draw calls and triangles. Rendering counters alone do not identify simulation stalls. |
| D4 | Keep, but correct the justification. | Backups protect against corruption and accidental overwrite; they do not make an incompatible save playable in a new release. Label save format/build, reject incompatible saves clearly, and preserve the original before overwriting. No migration or old-save support is proposed. |
| E1 | Keep early; call it "Copy diagnostic report" if it only copies. | Add a short prompt for expected versus actual behavior. Seed and events may not reproduce a late-game bug without the save; offer a separate, explicit save export if needed. Reuse existing event history, or omit it initially if none exists. |
| E2 | Keep small and early. | Include affected version and any workaround. Keep the list short enough that testers read it. |
| F1 | Split and move basic sound earlier. | Delivery, completion and error cues can help communicate the loop before final models arrive. First check what the existing radio/audio already covers. Spatial engines and a fuller soundscape can follow later. |
| F2 | Delay until performance and readability are proven. | Night needs readable roads, sites and selection states; clouds and moving shadows add rendering work. This is not automatically a small extension of existing shadows. |
| F3 | Defer beyond the demo. | Yield seasons affect every downstream chain and create another balancing matrix. A1 alone is not enough evidence to justify that work. |

### New suggestions: the most useful gaps

Check existing screens and tester behavior before building any of these. Improve an existing readout where possible; each UI change remains a separate approval.

| # | Suggestion | Player value / smallest useful scope | Effort |
|---|---|---|---|
| N1 | Show whether a route is earning its keep. | On an existing route or vehicle card, show recent delivery revenue and direct running costs over the same game-time window. Label any excluded costs; an internal material transfer is not automatically a loss. Start with a text readout, not a finance dashboard. | S–M if accounting exists; otherwise M+ |
| N2 | Show actual production and consumption in comparable units. | For one selected building, show units per game minute, actual versus potential output, and its existing stop reason. Include by-product storage blockage. Players can then decide whether another truck or another producer would help. | S–M if counters exist |
| N3 | Test recovery from ordinary mistakes. | Try overspending, deleting a useful road, selling the wrong truck, filling by-product storage and waiting on unavailable construction materials. Confirm an affordable recovery exists and is explained. Fix demonstrated traps through existing refunds, cancellation or guidance; do not add a bailout economy speculatively. | S for audit; fixes separate |
| N4 | Make the next town-growth requirement actionable. | Beside the existing requirement, distinguish delivered goods, construction materials and missing unlocks; link to the relevant yard or site. Start with one confusing requirement found in A1. Do not create another quest system. | S–M |
| N5 | Let players return to a problem quickly. | If absent, make an existing warning or fleet entry focus its site or vehicle. Start with one frequent problem from A1. On a globe, finding the broken link again can be harder than fixing it. | S per small step |
| N6 | Define a demo completion test. | Agree on a reachable milestone and a short checklist: a fresh tester understands the opening, earns through deliveries, grows a town, recovers from a mistake, and resumes a saved session. Choose the actual ending with Chris. Scope percentages alone do not establish readiness. | S to define; validation takes playtime |
| N7 | Check desktop readability and input on tester setups. | Test common resolutions and display scaling; verify text fits, shortcuts are discoverable, and state is conveyed by words or shape as well as color. If sound cues are added, keep equivalent visual feedback. Fix observed problems individually. | S audit; fixes separate |

N1 and N2 matter most once A1 confirms that these answers are not already easy to find. N3 is the highest-value check before inviting longer sessions. N6 keeps this review from becoming another open-ended feature list.

### Constraint check

No item necessarily breaks a locked rule as written, but several implementations could:

- **A2 / B1:** bypassing the early quest unlock order would conflict. A paid first delivery or optional order must use what the sequence already permits.
- **C3:** route preferences cannot override reach, fuel or buyer eligibility.
- **C4:** keep direct vehicle purchases, driver/mechanic systems, slots and the fixed airport footprint. New transport depth does not authorize redesigning those systems.
- **D2:** simulation optimization is compatible; bringing back fog of war is not. Freezing economically active towns because they are off-screen would also change gameplay.
- **D4:** save labels and backups are compatible; promising old-save migration would reopen a deliberately dropped feature.
- **C1 / C2 / E1 / N1–N7:** any resulting UI work still needs the agreed small, individually approved steps. These notes approve none of them.
- **F1 / F2:** basic audio and environmental work need not wait for models, but neither is a reason to polish placeholder buildings.

### Revised order

1. **N6 + A1 + D3:** define what the demo must prove, watch a fresh player, and measure the actual machine. Use a plain notes template immediately; E1 need not block testing.
2. **A2 + N3:** fix the observed opening and recovery failures. Add **E1 / E2** as small support tasks and address **D4** before testers invest in long saves.
3. **C1**, then whichever of **N1 / N2 / N4 / N5 / N7** solves a demonstrated problem. One small UI approval at a time.
4. **A3**, then retest pacing after changes. Extend **C2** only if the simpler diagnostics are insufficient.
5. Basic **F1**, then trial **B1** only if players understand the economy but lack a useful next goal.
6. **C4 / D1 / D2** when transport depth or Map 3 becomes the agreed milestone. **B2 / B3 / C3 / F2** wait for evidence; **F3** stays beyond the demo.

### Low-cost lessons from comparable games

- **N1 — Transport Fever 2:** its line statistics connect revenue, maintenance and balance. Borrow the question "Is this service paying for itself?" as one compact readout. Do not assume the full statistics screen is cheap. Source: [Transport Fever 2 statistics manual](https://www.wiki.transportfever2.com/doku.php?id=gamemanual%3Astatisticsdatalayers).
- **N2 — Factorio:** production statistics compare production and consumption over time. Borrow consistent units and a shared time window for one selected good before considering charts or a global production panel. Source: [Factorio production statistics](https://wiki.factorio.com/Production_statistics).
- **C2 / N5 — apply those lessons to Supplyline:** a useful first diagnostic is "Sawmill stopped: sawdust storage full", with a way to find the site. This is a proposed Supplyline adaptation, not a claim that another game's entire diagnostic system can be copied cheaply.

I would not add more goods, a technology tree, rivals or another progression layer to this review. The existing rules already offer considerable depth; the immediate test is whether players can see that depth and make satisfying decisions with it.
