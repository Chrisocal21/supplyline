# Supplyline: which AI for what, and where each one looks

Rewritten 2026-10-26. Three tools share the work: **Claude Code** (builds and ships), **ChatGPT** (art and models), **GitHub Copilot** (small edits in the editor). This file says who takes which job, what each one must read first, what it must do and hand back, and what to do when an allowance runs low.

What is marked "known" comes from how this project has been built. "Not verified" is a pointer to check, not a claim. Model names and prices change quickly: check the vendor page before paying for anything.

---

## If you are an AI reading this: start here

1. Work out which tool you are: Claude Code, ChatGPT, or Copilot. Go to that section below. It lists exactly which files to read first and what to produce.
2. Stay inside your job. If the task belongs to another tool (see the table), say so and write a short request for that tool instead of doing it badly.
3. Read the rules at the bottom of this file before you change anything. They are decisions already made.
4. Do not trust a number, name or version from memory. Check it in the code or the docs. The sim rules and the look rules both live in files, listed in the map below.
5. Hand back something the next tool can use directly (see "What you hand back" in each section).

## The map: where to look for what

| You need | Look here |
|---|---|
| What the game is, the look, the art rules, how models are built, what is open | docs/11-chatgpt-model-handoff.md (newest; wins over 09 where they disagree) |
| Every model: size, footprint, naming, triangle budget, .glb rules | docs/09-model-and-art-brief.md |
| The painterly look and what is already done | docs/visual-direction.md |
| Scale of things against each other | docs/scale.md and docs/scale-lineup.png |
| Pictures of the current models | docs/model-previews/, docs/town-previews/ |
| Latest screenshots of the game | dist/review/ |
| What was built, release by release | docs/04-project-log.md |
| Where the project stands now, percent by area, open items | docs/02-progress-tracker.md |
| Open design questions | docs/03-open-questions.md |
| Goods, sites and the economy numbers | src/sim/defs.ts (goods, buildings, districts, demand) |
| Who buys each good | src/sim/buyers.ts |
| District venues and their menus | src/sim/venues.ts |
| Towns, districts, revenue | src/sim/town.ts |
| The world, trucks, selling, the Warehouse | src/sim/world.ts |
| Building and truck 3D models, built in code | src/r3d/models.ts, industry.ts, specialty.ts, airport.ts, districts.ts, trucks.ts |
| The shape helper models are made with | src/r3d/parts.ts (box, cyl, cone, sphere, dome, prism, stone) |
| Trees, bushes, stones, node heaps | src/r3d/vegetation.ts, stones.ts, scenery.ts (HEAPS) |
| Ground, mountains, ocean colour and shader | src/r3d/paint.ts, geo.ts, globeMesh.ts |
| UI, HUD, wiki | src/ui/hud.ts, src/ui/sheets.ts |
| Tests that guard the rules | src/sim/*.test.ts, src/r3d/*.test.ts (especially buyers.test.ts, venues.test.ts, districts.test.ts) |
| Screenshot tool | tools/shots.cjs (see its header for use) |
| Desktop release notes | docs/05-desktop-version.md |

---

## The split in one table

| Job | Who | Why |
|---|---|---|
| New features, bug fixes, anything over several files | Claude Code | Reads the whole repo, edits, runs the tests, drives the game, commits |
| Running tests, screenshots, checking a change really works | Claude Code | It is the only one that can run the game here |
| Releasing (version bump, commit, tag, push) | Claude Code | It knows the release steps (see Rules) |
| Docs, project log, progress tracker | Claude Code | It sees what changed in the code |
| Economy and sim rules (goods, buyers, venues, districts) | Claude Code | Needs the tests that guard those rules |
| Building, truck, tree and landmark art (new looks, redesigns) | ChatGPT | Art is where its allowance should go |
| Concept pictures, mood boards, texture ideas, logos | ChatGPT (image generation) | Claude cannot make images |
| Mock-ups and layouts of a screen | Claude (quick SVG sketch) | Cheap, and it can put the result straight into the game |
| Turning ChatGPT's art into game code (Parts, .glb loading, fitting footprints) | Claude Code | It can run the game and check the fit |
| One-file edit, rename, small refactor, "what does this do" | Copilot (cheap model) | Fast, in the editor, costs almost nothing |
| A test for a function already open | Copilot (Sonnet or similar) | Self-contained |
| Second opinion on a risky change (saves, money, town growth) | A different model from the one that wrote it | Catches what the first one missed |

Rule of thumb: the bigger the change and the more files it touches, the more it belongs in Claude Code. The more it is about how something looks, the more it belongs in ChatGPT. The smaller and more self-contained, the cheaper the model can be.

---

## Claude Code (the builder)

Known: this project is built with it. It reads code, edits files, runs `npx vitest run`, drives a headless browser for screenshots (tools/shots.cjs), updates docs, commits and tags releases.

**Read first:** docs/02-progress-tracker.md (where things stand), the newest entries in docs/04-project-log.md, and docs/11 if the task touches looks or models. For sim work, read the matching test file before the code.

**Do:**
- Everything in src/sim (economy, towns, venues, districts, buyers) and its tests.
- UI (src/ui), the wiki, the HUD, anything that must be checked on screen.
- Bring outside art into the game and make it fit, then send screenshots (saved in dist/review).
- Release work and keeping the docs current.

**What you hand back:** working code, a passing test run, a screenshot for anything visual, and an updated docs/04 and docs/02 entry. Say plainly what was and was not checked.

**Do not:** draw new art when ChatGPT should; push or bump a version until Chris says go; claim something was play-tested when it was only tested in code.

Models inside it: Haiku (fast, cheap, small edits), Sonnet (daily driver: multi-file edits, tests), Opus (hard bugs, review, decisions with a real cost if wrong), Fable (hardest problems, overkill for small tasks).

Save its allowance: give it a clear, finished brief; do not ask for long free-form exploration of art ideas.

## ChatGPT (the artist)

This is where art effort goes. docs/11-chatgpt-model-handoff.md was written for it.

**Read first, in this order:**
1. docs/11-chatgpt-model-handoff.md: the look, Chris's rules, how models are made, what is open.
2. docs/09-model-and-art-brief.md: every model, sizes, naming, budgets.
3. docs/visual-direction.md and docs/scale.md, plus the pictures in docs/model-previews and the newest files in dist/review.
4. For code-style output, open src/r3d/vegetation.ts and stones.ts as examples, and src/r3d/parts.ts for the helper.

**Do:**
- New building, truck, tree and landmark designs in the painted style: pictures first, then models.
- Concept art and colour studies before anything is built.
- Venue shopfronts: one shell per district with swappable signs and props. Venue names and menus are in src/sim/venues.ts, so the signs can match them.
- Icon and logo ideas (Claude can redraw the chosen one as clean SVG).

**What you hand back** (you cannot run the repo or the tests, so return one of these):
- **.glb files**: Y up, origin at the footprint centre on the ground, door facing +Z, named toggle parts (for example crop_wheat, anim_blade), at most 3 materials, vertex colours. Full rules in docs/09.
- **Parts code** in the style of vegetation.ts and stones.ts, which can be dropped in as it is.
- With every model: its name from docs/09, its footprint in tiles (a tile is 3.3 units, a lot pad 3.1), and one line on what to look at.

Then Chris gives it to Claude Code: "fit this into the game and send me a screenshot". Do not try to wire it into the game yourself.

**Do not:** add clutter (extra carts, posts, ponds, stacked boxes), float or sink-ring anything (everything on the ground is bedded in), or use fine texture and noise. See the look rules in docs/11.

## GitHub Copilot (the quick helper)

Known: it sits in the editor and lets you pick a model per chat. Premium requests are counted and each model has a multiplier, so check the model page before leaving a big model selected.

**Read first:** only the file you are editing and the test beside it. If the task needs more than one file, stop and send it to Claude Code.

**Do:**
- A question while reading code ("what calls this?", "explain this function").
- A rename, a one-file edit, a small refactor, a type fix.
- A test for a function that is already open.
- Auto mode for trivial things. Auto picks by availability, not difficulty, so never for anything risky.

**What you hand back:** a small, reviewable diff that matches the surrounding code (same comment density, names and style).

**Do not:** change economy rules, saves, or anything across many files; touch version numbers; do art.

Picker names seen so far (only the Claude rows are known to me; the rest are not verified): Claude Haiku, Sonnet, Opus; GPT-6 Luna (said to be fast and cheap), GPT-6.1 Sol (said to be deep reasoning); Gemini 3.8 Flash (said to be fast and cheap). Others (GPT-6 Astra, Gemini 4 Argon, Grok, Kimi, MAI-Code, HydraFusion) could not be confirmed.

---

## How work moves between them

1. **Art request:** Chris picks what needs a look (for example "all producer buildings"). ChatGPT gets docs/11, 09, visual-direction and the current screenshots. It returns pictures first, then .glb or Parts code.
2. **Fit and check:** Claude Code puts the models in, runs the game, sends screenshots to dist/review, and fixes sizes and footprints.
3. **Look again:** the screenshots go back to ChatGPT for the next round if the look is off. One round trip per batch is the aim.
4. **Small things on the side:** Copilot handles quick edits in the editor while the big pieces run elsewhere.

Keep the handoff files current: after any change to the look rules or the model list, Claude Code updates docs/09 and docs/11 so ChatGPT never works from an old rule.

## When an allowance runs low

- **Claude low:** stop drawing and exploring with it. Spend what is left on fixes and releases. Do the art with ChatGPT and the small edits with Copilot.
- **ChatGPT low:** keep a queue of art requests ready with the docs attached, and send them in one batch when it resets. Claude can make plain SVG or Parts placeholders in the meantime, but do not polish them: the current in-code models are temporary.
- **Copilot low:** switch the picker to a cheaper model, or hand the work to Claude Code if it touches more than one file.

---

## Rules every tool follows

These come from decisions already made in this project.

- **No emojis.** Icons are SVG only when needed. Keep replies and docs short.
- **Desktop only.** No phone layouts or phone screenshots.
- **Do not downgrade locked-in systems** (see docs/02-progress-tracker.md). Steam is not raised until the demo is 100% done.
- **Models are replaced later.** Do not spend time polishing the current in-code models; fix terrain, culling and level of detail instead.
- **Look rules** (docs/11): everything on the ground is bedded in; no clutter; nodes read from far away; colours by material (pale stone for quarry, rust for mine, dark grey for coal, terracotta for clay).
- **Releases:** one batched push per round of work. Each release bumps src/version.ts and package.json, makes a commit named to match (0.X), tags vX.Y.Z and pushes the tag. Claude Code does this, and only when Chris says go.
- **Tests:** run `npx vitest run` and look at the result on screen before calling anything done. A model that sounds sure can still be wrong: check names, numbers and versions against the code.
- **Economy rules:** a good always has somewhere to sell; a building never opens before something pays full price for what it makes; a venue only earns when supplied; districts are made of town-chosen venues with their own menus, never "everything". The tests in src/sim/buyers.test.ts, venues.test.ts and districts.test.ts guard these.
- **Not wanted:** spoilage in the Warehouse, old-save compatibility work.

## Keep this guide honest

When a model's strengths are confirmed (by use or by the vendor's docs), mark it known with the date. When a model disappears from a picker, delete its row. When a rule in docs/11 changes, check this file still agrees. When a file in the map moves, fix the map.
