# Supplyline — Local Links

Click a link (Ctrl+Click in VS Code) while the dev server is running. Start it from the project folder with `npm run dev`. It serves on port 3000.

## The game and site (port 3000, `npm run dev`)

| What | Link |
|---|---|
| The game | [localhost:3000/play/](http://localhost:3000/play/) |
| Goods browser (A to Z, with what makes and uses each good) | [localhost:3000/goods/](http://localhost:3000/goods/) |
| Testers' page | [localhost:3000/access/](http://localhost:3000/access/) |
| Version check (JSON) | [localhost:3000/version.json](http://localhost:3000/version.json) |

## Local only (git-ignored `local/` folder, never committed or deployed)

| What | Link |
|---|---|
| DLC collections: 29 collections, every good and building with a home | [localhost:3000/local/dlc/](http://localhost:3000/local/dlc/) |

Rebuild the DLC view's data after editing [17-dlc-pack-plan.md](17-dlc-pack-plan.md): `node local/export-dlc-catalog.cjs`. Smoke check in headless Chrome: `node local/review-dlc.cjs`.

## The website (port 3001, `npm run site`)

| What | Link |
|---|---|
| Home page and wiki | [localhost:3001/](http://localhost:3001/) |

## Documents

| Doc | What it is |
|---|---|
| [01-feature-map.md](01-feature-map.md) | What the game is and how it is built |
| [02-progress-tracker.md](02-progress-tracker.md) | Where we are now, one page |
| [08-goods-and-sites.md](08-goods-and-sites.md) | Every good and building, generated from the game |
| [13-suggestions-for-review.md](13-suggestions-for-review.md) | Near-term suggestions and ChatGPT's review |
| [14-fresh-player-notes.md](14-fresh-player-notes.md) | Notes sheet for watching a new player |
| [15-future-plan.md](15-future-plan.md) | Never-ending game, packs, other planets |
| [16-future-ledger.md](16-future-ledger.md) | Running Claude and ChatGPT ledger (FP rows) |
| [17-dlc-pack-plan.md](17-dlc-pack-plan.md) | The DLC pack plan (PK rows, ownership map) |

## Notes

- If a page shows nothing, the dev server is probably not running, or port 3000 is taken (it is set to fail rather than move to another port).
- The interactive goods and packs planner is a private claude.ai page, not a local link. Ask Claude for its address.
