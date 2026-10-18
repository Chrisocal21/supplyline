# Supplyline — Open Questions

---

## Answered

| Question | Answer | Session |
|---|---|---|
| What kind of project? | Browser game dev, a learning project using tools Chris already knows | Oct 11, 2026 |
| Genre? | Production plus logistics: build roads, build production, earn money, grow an empire | Oct 11, 2026 |
| Reference games? | Railroads Online (routes), Farming Sim (production depth), Satisfactory (unlocks), City Skylines (growing towns) | Oct 11, 2026 |
| Look and feel? | Adult and grounded, not cartoonish: realistic lighting, muted colours, industrial buildings | Oct 11, 2026 |
| 2D or 3D? | 3D. Three.js globe from the start of Phase 1 instead of Phase 3. The simulation was already separate, so this was a renderer swap | Oct 11, 2026 |
| Flat or globe? | A globe. The grid wraps east-west and has polar ice caps. Camera goes from space to street level | Oct 11, 2026 |
| Terrain? | Real heights: oceans, continents, mountain ranges with snow. Mountains and water force bridges, tunnels or detours | Oct 11, 2026 |
| Handcrafted or generated map? | Generated from a seed, with controlled proportions | Oct 11, 2026 |
| Names? | Placeholder names generated per seed for seas, woods, mountains, plains, towns. Sites are named after their woods or nearest town | Oct 11, 2026 |
| Progression? | Tiers unlocked by milestones, including growing towns. Buildings also level 1 to 3 | Oct 11, 2026 |
| Why build a market? | Markets belong to towns. A town has a Market and, from level 2, a Freight Yard. Towns grow from deliveries and need a variety of goods | Oct 11, 2026 |
| Where can things be built? | Extraction only on resource nodes (forest, farmland, quarry), each with a quality. Industry on open grass. Nothing inside a town | Oct 11, 2026 |
| Logistics? | Push and pull. Vehicles carry what the far end needs. Hubs store goods and relay them | Oct 11, 2026 |
| Vehicles? | Box truck and big rig built. Train and plane designed, locked as "coming soon" | Oct 11, 2026 |
| Truck pathfinding? | Not needed. Player draws roads and vehicles follow them. A path helper exists for demos | Oct 11, 2026 |
| Framework? | Three.js for the world, Phaser only for the HUD overlay, TypeScript + Vite throughout | Oct 11, 2026 |
| HUD technology? | A canvas overlay, so the build rule about not writing HTML is kept | Oct 11, 2026 |
| Backend? | None. Saves in browser local storage | Oct 11, 2026 |
| Name? | Supplyline | Oct 11, 2026 |
| How should rail work? | A separate network from roads. Rails cross roads at level crossings (right angles, straight stretches only). Trains join sites directly for now | Oct 12, 2026 |
| Where do markets and production go? | Inside towns, as district plots that open as the town grows. Town streets double as through roads | Oct 12, 2026 |
| Where do buildings go? | Only on level ground. Towns sit on flattened plateaus. Quarries are dug into the foot of a mountain | Oct 12, 2026 |
| Is this a sandbox or does it have an end goal? | Both. Four tiers of quests with rewards lead to an end game (steel, machinery, a metropolis, $250,000 earned); nothing stops you playing on | Oct 12, 2026 |
| How does a new player learn it? | A How to play guide that opens on a first visit, and a quest bar that always shows the next step with a hint | Oct 12, 2026 |
| When is a mountain crossing a tunnel? | Only where the hill really stands above the road. Low ground is cut through as open road | Oct 12, 2026 |
| Do towns just grow, or do you build them up? | Both: districts you build and level, landmarks in the 3D town, and a permanent specialisation path per town | Oct 12, 2026 |
| Do vehicles level up? | A ladder of classes with Trade up, from box truck through truck fleet, train and plane to jet | Oct 12, 2026 |
| How many truck slots per building level, and how do products and airports count? | 2 / 4 / 6 at levels 1 to 3; each product line has its own slots (lumber and sawdust separate); at an airport a plane takes 2 slots (2 trucks or 1 plane); bigger trucks unlock at level 4 | Oct 18, 2026 |
| Does a bigger truck take more slots? How many building levels? | No, a bigger truck is still 1 slot. Buildings get 8 levels | Oct 18, 2026 |
| Browser only or downloadable? | Both. A downloadable Windows app (Electron) with auto-updates, and the browser version stays. Same code | Oct 18, 2026 |
| Steam or GitHub? | Steam is the goal; a GitHub download comes first for ease. Code kept behind a platform layer so Steam swaps in | Oct 18, 2026 |

---

## Still Open

| Question | Why It Matters |
|---|---|
| Should trains need stations (stops with their own storage) instead of joining sites directly? | Makes rail feel different from roads, but adds a building and more clicks. It would also let trains serve town centres: today track cannot reach a Market or Freight Yard, so a train ends at a hub or an outer-lot factory |
| Should a station also send goods out? | Today a station only receives. Factories on outer lots can be reached by track directly; the two inner corner lots cannot |
| Are the quest numbers right? | They are first guesses. The bot says Tier 3 arrives around 135 game minutes; a human playthrough will say if that feels right |
| Do the paths feel different enough? | Four paths change price, factory speed, load size and storage. Only a person playing two paths can say if the choice matters |
| Do running costs bite at the right moment? | Vehicles cost 5% of their price a minute. Bigger classes only pay for themselves when there is enough to carry |
| What do towns want at levels 3 to 5? | Districts now add some of this, but a few more goods and chains would help |
| Should paths have their own quests and mastery levels? | It would reward committing to one path for a whole game |
| How many wagons can a train have, and what does each cost? | Proposed Freight Train 4 to 8, Heavy Haul 8 to 16, capped by rail yard level; cost and upkeep per wagon to tune with the pacing bot |
| Which quality-of-life perks does each mode get, and how big is the cross-mode bonus? | Decided: ships and planes do not copy the wagon idea; each mode has its own edge and mixing modes pays more (see 05-desktop-version.md). The perk list and bonus sizes are proposals |
| Slots and unlocks for levels 4 to 8 | Proposed 8, 10, 12, 14, 16 slots; road classes unlock at levels 4, 5 and 6. Each new level needs speed, storage, cost and art |
| How many slots does a train, ship or jet take at a terminal? | Plane = 2 is decided; the others and the bigger plane classes are still to set |
| Do warehouses and terminals get more slots per level than a factory? | They relay many goods; the pacing bot has to confirm it does not stall Tier 1 to 3 |
| How big should the new map be, and should the node-placement rule come first? | The outskirts rule fixes crowding on today's map and is cheap; the bigger map needs chunk streaming and is a larger job |
| Desktop: how far to push art before touching the renderer? | Art is the biggest visible jump but costs the most time; WebGPU is the biggest engine jump (see 05-desktop-version.md) |
| Desktop: should the web version match the .exe or be a lighter demo? | Decides how much WebGPU and asset weight the browser build carries |
| Desktop: when to pay for code signing and the Steam fee? | Signing removes the "unknown publisher" warning; Steam needs a one-time fee and a store page |
| Should there be a one-click auto-road tool next to hand-drawn roads? | The path finder exists; it changes how much of the game is route drawing |
| Art direction beyond the current procedural models | Real assets (Kenney, hand-modelled) versus staying procedural |

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed
- If the game goes to an app store: a premium currency bought with real money, alongside the in-game cash. Not designed yet.
- Islands: a Port building (Tier 3?) and cargo ships between ports, so islands with no town become a late-game reward. Until then, islands get no resource spots.
