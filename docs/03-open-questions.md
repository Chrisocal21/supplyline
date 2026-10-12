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

---

## Still Open

| Question | Why It Matters |
|---|---|
| Should trains need stations (stops with their own storage) instead of joining sites directly? | Makes rail feel different from roads, but adds a building and more clicks. It would also let trains serve town centres: today track cannot reach a Market or Freight Yard, so a train ends at a hub or an outer-lot factory |
| Should a station also send goods out? | Today a station only receives. Factories on outer lots can be reached by track directly; the two inner corner lots cannot |
| Are the quest numbers right? | They are first guesses (100 lumber, 60 tools, 40 machinery, $250,000). They need a real playthrough |
| Is the economy too fast now? | Town sales used to be stuck, which hid how quickly money and growth come: one camp and one sawmill take a town to level 3 in about five minutes. Prices, growth thresholds and running costs need a pass |
| What do towns want at levels 3 to 5? | Needs new goods and chains (bricks, tools, furniture, steel) so growth stays interesting |
| Do vehicles and sites have running costs? | Big lever on how the economy feels |
| Should there be a one-click auto-road tool next to hand-drawn roads? | The path finder exists; it changes how much of the game is route drawing |
| Art direction beyond the current procedural models | Real assets (Kenney, hand-modelled) versus staying procedural |

---

## Build Rules

- No HTML in any output
- No emojis in any output
- SVG icons only when genuinely needed
