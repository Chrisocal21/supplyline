# Supplyline — Future Ledger

One running list that Claude and ChatGPT both read and add to, with Chris deciding. It replaces passing whole documents back and forth: paste this one file, get a reply that edits it, bring it back.

Background: [15-future-plan.md](15-future-plan.md) (the plan), [13-suggestions-for-review.md](13-suggestions-for-review.md) (near-term suggestions and ChatGPT's review). Last updated October 26, 2026, release 0.234.

## Rules for whoever reads this (Claude, ChatGPT, or anyone)

1. **Nothing here is approved or started** unless its Status says Decided. Only Chris decides.
2. **One row per idea.** Use the next free number (FP-xx). Never reuse or renumber.
3. **Do not rewrite another voice.** Add your own position in your own column. If you disagree, say why in one or two sentences. If you agree, write "Agree" and any change.
4. **Keep rows short.** Details go in the Notes section under the row's number, not in the table.
5. **Respect the constraints:** locked-in systems, dropped features (fog of war, spoilage, old-save compatibility), placeholder models, desktop only, Steam not raised before the demo is done, and the demo finish line (early town level 2, 30 to 50 minutes). Flag any row that would break one.
6. **Say what you checked.** Mark claims as Checked (read in the code or docs) or Assumed.
7. **Status values:** Idea, Discussing, Leaning, Decided, Built, Dropped.
8. **Reply format:** return the whole file with your changes. Add a line to the Log at the bottom with the date and what you changed.

## Ledger

| ID | Idea | Claude | ChatGPT | Status |
|---|---|---|---|---|
| FP-01 | Endless play means optional goals and new decisions, not ever-higher building levels or numbers | Agree with ChatGPT. Tier 4 "Legacy" is $1,000,000 and says play on (Checked); I wrongly said $250,000 ended the game | Separate endless play, ongoing content and unlimited growth. Keep the locked levels | Leaning |
| FP-02 | Every pack must add a new player decision, not only more entries | Agree | Write the player benefit before listing goods | Leaning |
| FP-03 | Content structure: Campaign / World / Pack / Link | Proposed. Campaign holds money and unlocks, World holds a map, Pack holds data, Link joins worlds | Keep, with clearer ownership. Saved playthrough, not an account. Unlocks global or local is open | Discussing |
| FP-04 | Goods stay a typed list; packs add to a combined catalog at build time | Withdrawn my "open registry" idea. Typed checks are worth keeping | Agree. Open runtime registry only if loading needs it | Leaning |
| FP-05 | New transport modes and mechanics are code, not data | Corrected. `RouteMode` is a closed list: road, rail, air, sea (Checked) | Same | Leaning |
| FP-06 | Prove one small Earth pack before building a pack platform | Agree. Suggest an Orchard and Brewery theme using existing mechanics | First post-demo experiment, with only the catalog split and manifest it needs | Leaning |
| FP-07 | Pack manifest: id, version, required packs, unsupported combinations; reject duplicate ids and cycles | Agree, before the first pack ships | Same, deterministic load, no hidden overrides | Leaning |
| FP-08 | Stable ids; new pack ids namespaced (`orchard:apple_juice`); base ids not renamed | Agree | Agree; a migration route stays possible later | Leaning |
| FP-09 | Guard rail on `if` chains: repeated variation in data, real mechanics in code | Softened from my first draft | Narrower rule; do not refactor during unrelated bug fixes | Leaning |
| FP-10 | New fields on `World`: note whether company-wide or local, do not force a refactor | Softened from my first draft | Same | Leaning |
| FP-11 | Save promise is bounded: pick a supported baseline before the first pack or public release | Agree. Links to D4 save labelling | Distinguish schema version, build, pack versions and generator versions. Migrate a copy, never the original | Discussing |
| FP-12 | Adding packs to an existing save happens at a save point with a backup and a prerequisite check; removing packs is deferred | Agree | Same | Leaning |
| FP-13 | New resources do not appear on an already-built map; prefer a new destination | Agree | A seed alone does not guarantee a map after generator changes | Idea |
| FP-14 | Two-world experiment: extract Campaign and prove one scheduled transfer to a small destination (Moon depot or orbital buyer) | Agree as the second experiment | Choose by the gameplay question, not by planet | Discussing |
| FP-15 | Cross-world freight is a saved shipment, credited once on arrival | Agree | Define full or removed destinations; mid-flight save must not duplicate or lose goods | Idea |
| FP-16 | One campaign clock; switching worlds must not change the economy | Agree | Background worlds must still reconcile; offline earnings are a separate feature | Idea |
| FP-17 | Shared money across planets may trivialise a new world | Open. Test before deciding | Prefer local logistics prerequisites over extra currencies | Open question for Chris |
| FP-18 | Base game stays complete whether packs are paid or free | Agree | Packs add alternatives, never make earlier routes pointless | Leaning |
| FP-19 | Test saved behaviour, not only catalog validity (upgrade, missing packs, mid-shipment reload, mature economy after price changes) | Agree | Small representative saves, base-only and base-plus-pack | Leaning |
| FP-20 | Crop rotation, seasons and livestock are mechanics projects, not the first pack test | Agree | Same | Leaning |
| FP-21 | Model and asset ids separate from simulation ids, so placeholder art swaps cleanly | Agree | Same, plus asset licensing | Idea |
| FP-22 | Public mod format and runtime packs | Out of scope until packs work | Later; do not copy another game's whole plugin system | Idea |
| FP-23 | Pack cadence | I said every few months; withdrawn | Set from measured production and support effort | Idea |

## Open questions for Chris

1. First pack: Orchard and Brewery, or another small Earth theme? (FP-06)
2. Paid, free, or both? ChatGPT and I agree the base stays complete either way. (FP-18)
3. One company with shared money across planets, or a fresh start per planet? (FP-17)
4. Do unlocks carry across worlds, or does each world teach its own? (FP-03)

## Notes

Add longer reasoning here under the row number.

**FP-03.** ChatGPT: Campaign is the saved playthrough. Content definitions live outside mutable save state. A pack supplies definitions, and a save records which versions it used. Installed, owned and active packs are different concepts. No account service needed.

**FP-11.** ChatGPT: loading a save is weaker than keeping a viable company (Factorio's 2.0 to 2.1 notes make the same split). Test that an established production setup still works after a change, not only that the file opens.

## Log

| Date | By | Change |
|---|---|---|
| 2026-10-26 | Claude | Created from the future plan and ChatGPT's second opinion. Seeded FP-01 to FP-23 |
