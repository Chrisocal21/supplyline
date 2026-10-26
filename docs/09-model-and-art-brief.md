# SupplyLine: model and art brief

Hand this whole file to ChatGPT (or any 3D artist or tool) first. It says what the game is, what every model has to do, how many models and tiers are needed, and how to merge the look-alike ones into hybrids so there are far fewer to make.

Written 2026-10-24 from the game's own data (91 building kinds, 13 vehicles, 25 town districts, 89 goods, 11 resource nodes, 5 town styles). Update it when the lists change.

---

## 1. About the game (read this first)

SupplyLine is a logistics and supply-chain game on a 3D globe, by Probably Fine Studios. Think Farming Simulator for the producing, Euro Truck Simulator / American Truck Simulator for the vehicles and roads, and Satisfactory for the production chains.

- The player owns plots of land, builds producers (camps, farms, mines, wells), processors (mills, factories) and logistics (roads, rail, ports, airports, warehouses), buys vehicles, and moves goods to towns.
- Towns have a Market and a Supply Yard. They want goods, and as they are supplied they grow: village, town, city, metropolis (5 growth levels), with more homes, then blocks and towers, and civic districts (stadiums, universities, a grand plaza).
- Goods are made in chains: Logs -> Lumber (+ Sawdust by-product) -> Furniture. Grain -> Flour -> Bread (+ Bran). There are 89 goods in four kinds: 29 raw, 16 materials, 31 products, 13 by-products.
- By-products (straw, husks, feathers, sawdust, whey, slag...) pile up at a building and are sold or carried away like any other good. A truck is assigned to a building, picks up what it makes, and drives it along a road to a buyer. Nothing moves until the player buys a truck and lays a road.
- Five tiers of progress (Startup, Regional Supplier, Industrial Group, Global Network, Legacy). Each tier unlocks buildings and vehicles: roads and trucks first, then rail, ports and ships, then planes and heavy industry.
- Worlds: three hand-made maps that wrap round a globe. Seasons change the ground (summer, autumn, winter with snow, spring). Five regional looks: nordic, temperate, mediterranean, tropical, arid.
- The camera runs from the whole globe seen from space, down to street level beside a single building. Every model has to read at both distances.
- Mood: warm, tidy, a little toy-like. Relaxed to play. It is not a realistic or gritty look.

### The hybrid idea (important)

Many buildings are the same thing with a different crop, animal or material. Do not make them as separate models. Make one shell with named toggle parts, and the game switches on the ones it needs, like Farming Simulator fields:

- One **Crop Farm** that shows wheat, corn, cotton, barley, hops, sugar beet, sunflower, potato or vegetable rows. Same barn, silo and field; only the crop meshes and field colour change.
- One **Livestock Farm** that shows cattle, chickens, pigs or sheep.
- One **Plantation / Orchard** that shows apple, grape, coffee, mango, cocoa or spice trees (and beehives).
- One **Extraction Site** that shows quarry, clay, sand, coal, iron or salt.
- One **Food Plant** and one **Heavy Plant** shell family with swappable roofs, stacks and signs.

By-products appear as piles or bins on the site (straw bales, husk heaps, feather bags, sawdust, slag), so the trucks assigned to the building visibly "pick them up". Each by-product pile is a small shared prop.

---

## 2. Technical rules for every model

- Format: glTF 2.0 (.glb), Y up, 1 unit = 1 metre-ish "game unit". One town tile is 3.3 units wide; a town lot pad is 3.1 x 3.1 (`LOT` in src/scale.ts). A building on open ground holds a 2 x 2 tile block from the day it is placed: its body stands on one tile (3.1 wide) up to level 3 and fills the whole block (6.2 wide) from level 4. Town lots are one tile at every level. The airport is 5 x 3 tiles (16.4 x 9.8 units), long side along the runway, front (+z) where the road comes in. The game shrinks any model's plan to fit its ground and never squeezes height, so models should be authored to those widths.
- Origin: centre of the footprint, on the ground (y = 0). The front or door faces +Z. Streets run along X and Z.
- Style: low poly, flat or softly shaded colours, no baked dirt, small colour palette shared across models (a single 512 px palette texture or vertex colours). Wood, brick, tin, glass and metal read by colour alone.
- Triangle budgets (the game draws hundreds at once and many players have laptops):
  - Houses and small props: 300 to 1,200
  - Farm and mine sites at their top tier: up to 6,000
  - Factories at their top tier: up to 8,000
  - Civic campuses, ports, airports: up to 20,000
  - Vehicles: 600 to 2,500
  - Trees: 150 to 500 (the world draws tens of thousands, so keep these light)
- Provide a far version (about 5 to 10 percent of the triangles, or a simple block with the right colour) of every site, vehicle and house, since from space they are specks.
- Materials: at most 3 per model (main palette, glass/emissive, transparent for water or glass). Windows and lamps need an emissive material so the game can light them at night.
- Naming for toggles: every swappable part is a named child, prefixed by its group: `crop_wheat`, `crop_corn`, `animal_cow`, `tree_coffee`, `ore_iron`, `stack_a`, `annex_1`. The game shows or hides them by name. Animated parts are prefixed `anim_` (for example `anim_blade`, `anim_wheel_fl`).
- Animation clips: short seamless loops, 24 or 30 fps, named `idle`, `work`, `load`, `unload`. Parts that only spin or slide may be a simple named node the game rotates itself (say which axis).
- Level growth: the look for each upgrade level is the base shell plus a stack of additive annexes (see section 4). Do not remodel the building per level.

---

## 3. Master list and counts

| Group | Unique models to make | Notes |
|---|---|---|
| Producer shells (farms, livestock, plantations, extraction, water, harbor) | 6 | Each has toggles and 3 base tiers |
| Processor shells (food, wood, textile, heavy, special) | 9 | 3 sizes each, swappable stacks and signs |
| Logistics and core town buildings | 12 | Market, Supply Yard, warehouse, garage, rail yard, station, port, airport and parts |
| Annex kit (levels 4 to 10) | 10 | Shared add-ons any site can wear |
| By-product and cargo props | about 20 | Piles, bins, pallets, crates |
| Vehicles | 13 kinds, built from about 24 parts | Cabs, bodies, wagons, hulls, aircraft |
| Houses, blocks, towers, lots | about 40 per region set, 5 regional sets | Reskins share the same forms |
| Civic district landmarks | 25 | Each has 3 levels |
| Roads, rails, bridges, tunnels, crossings | about 30 pieces | Tileable |
| Resource node markers | 11 | Three quality states each |
| Scenery: trees, rocks, plants, animals | about 45 | Seasonal variants |
| UI: logo, icons, thumbnails, goods icons, store art | about 260 images | Section 12 |

Total: roughly 60 base building models (down from 91 separate ones) and about 24 vehicle parts, plus kits and props.

---

## 4. Producers (hybrids)

All producers sit on a resource node or open ground. Each has 3 base looks (small, medium, large) and then annexes for levels 4 to 10.

### P1. Crop Farm (one model, many crops)
Replaces 8 buildings: Farm (grain), Cotton Farm, Vegetable Farm, Potato Farm, Barley Farm, Hop Farm, Sugar Beet Farm, Sunflower Farm.
- Shell: barn, silo, shed, tractor parking, field plot. Tier 1 small barn and one field; tier 2 adds a second field and a silo; tier 3 adds a big barn, grain bins and a drying shed.
- Toggles (field and crop meshes, each in 3 growth stages: seedling, growing, ripe, plus a bare/harvested stage): `crop_wheat`, `crop_corn`, `crop_cotton`, `crop_barley`, `crop_hops` (poles with vines), `crop_sugarbeet`, `crop_sunflower`, `crop_potato`, `crop_vegetable`.
- Also toggle a small prop set per crop at the barn: bales, sacks, crates (`prop_*`).
- By-product piles: straw bales, husks, stalks.
- Animations: crop sway (shader or morph), combine or tractor working the field (`work`), windsock.

### P2. Livestock Farm
Replaces: Dairy Ranch, Chicken Farm, Pig Farm, Sheep Farm.
- Shell: barn, fenced paddock, trough, water tank. 3 tiers add more pens and a bigger barn.
- Toggles: `animal_cow` (a small herd group), `animal_chicken`, `animal_pig`, `animal_sheep`. Each needs `idle` (graze, peck, root) and a walking loop.
- By-products: feather bags, manure heap, wool bales, whey churns.
- Animations: animals idle, a milk or feed truck bay light.

### P3. Plantation and Orchard
Replaces: Orchard, Vineyard, Apiary, Coffee Plantation, Mango Grove, Spice Plantation, Cocoa Plantation.
- Shell: rows of trees or vines on terraces, a pickers' hut, a drying rack.
- Toggles: `tree_apple`, `tree_grape` (trellis rows), `tree_coffee`, `tree_mango`, `tree_cocoa`, `tree_spice`, `hives` (beehives with a few bees).
- 3 tiers: a small plot, a full orchard, a big estate with a packing shed.
- Animations: leaves sway, bees buzzing around `hives`.

### P4. Extraction Site
Replaces: Quarry, Clay Pit, Sand Pit, Coal Mine, Iron Mine, Salt Pan.
- Shell: a worked ground area with a shed, a conveyor or ramp, a loading bay.
- Toggles: `pit_stone` (cut terraces), `pit_clay`, `pit_sand` (heaps), `pit_coal` (mine entrance and tipple), `pit_iron` (headframe and ore cart), `pit_salt` (flat evaporation pans).
- 3 tiers: hand site, mechanised, big operation.
- Animations: conveyor, ore cart on a rail, headframe wheel.
- By-products: gravel and slag heaps.

### P5. Forestry Camp
Separate because it works inside a forest: cabin, log stacks, a loader, a sawdust and wood-chip pile. 3 tiers. Animations: loader arm, chainsaw puff.

### P6. Utility producers
Replaces: Water Pump, Oil Well, Fishing Harbor.
- Oil Well with `anim_pumpjack` (nodding head), tank farm tier 3.
- Water Pump with tower, tank, pipework.
- Fishing Harbor (needs the sea): pier, shed, nets, ice plant; a fishing boat `vehicle_fishboat` moors here.

---

## 5. Processors (hybrid shells)

These stand in town plots. Each shell has three sizes (small, medium, large) and a set of swappable roofs, stack/chimney styles and sign boards. The sign board and the interior props change what it is.

| Shell | Replaces these buildings | Toggles |
|---|---|---|
| Food Plant | Flour Mill, Bakery, Dairy, Creamery, Jam Factory, Juice Press, Pastry Kitchen, Noodle Maker, Pizzeria, Cannery, Butcher, Sausage Maker, Ice Cream Plant, Crisp Fryer, Chocolate Maker, Sugar Refinery, Oil Press, Feed Mill | `roof_a/b/c`, `stack_a/b/c`, `sign_*`, `tank_*`, `silo_*`, `oven_vent`, `cold_unit` |
| Drink Plant | Brewery, Winery, Distillery, Soft Drink Plant | `vat_copper`, `barrel_rack`, `still_column`, `bottling_line`, `sign_*` |
| Wood and Paper Plant | Sawmill, Wood Yard, Pellet Mill, Paper Mill, Furniture Workshop, Printery, Compost Yard, Silage Plant | `saw_shed`, `log_deck`, `press`, `kiln`, `stack_*`, `sign_*` |
| Textile and Craft Plant | Wool Mill, Spinning Mill, Weavery, Garment Factory, Pillow Maker, Candle Maker | `loom_hall`, `spinning_hall`, `dye_vats`, `sign_*` |
| Stone and Glass Plant | Brickworks, Stonecutter, Granite Cutter, Cement Works, Concrete Plant, Glassworks | `kiln_tower`, `mixer`, `saw_frame`, `furnace`, `conveyor_*` |
| Heavy Plant | Smelter, Toolworks, Steelworks, Machine Works, Slag Crusher, Fuel Refinery | `blast_stack`, `crane_gantry`, `tank_farm`, `cooling_tower`, `stack_*` |
| Fish Plant | Smokehouse, Fish Cannery, Fish Meal Plant | `smoke_shed`, `cannery_line`, `meal_dryer` |
| Garden and Repair Shop | Garden Supply, Recycling Yard, Mechanic Shop | `yard_*`, `shed_*`, `press_baler`, `lift_bay` |
| Warehouse | Distribution Warehouse | 3 sizes, loading docks |

Each shell: 3 sizes x 1 base + the toggle parts. Animations: smoke from stacks (`anim_smoke` emitter points named `smoke_1..n`), conveyors, a spinning vent, a crane trolley, windows lit at night.

---

## 6. Logistics and core town buildings

Each is its own model because it has a special job.

| Model | Tiers | Notes |
|---|---|---|
| Market | 4 (foundation, small, medium, large) plus 3 growth annexes | Town selling point; stalls, awning |
| Supply Yard | 4 (foundation, small, medium, large) | Stacks of logs, lumber, bricks; crane |
| Civic lot (district plot) | 1 pad plus 3 construction stages | The foundation shown while a district is built |
| Distribution Warehouse | 3 | In Processors above; also a "depot" version with a tall shelf hall |
| Mechanic Shop | 3 | Lift bay, tyre stack |
| Rail Yard | 3 | Tracks, gantry, container stack |
| Rail Station | 3 | Platform, canopy, signal |
| Port | 3 (the maximum for ports) | Quay, cranes, container stacks, warehouse; `anim_crane` |
| Airport | 3 (the maximum) | Runway, terminal, tower, hangar; `anim_radar`, windsock |
| Foundation / building site | 3 stages | Concrete slab, frame, scaffold; used while anything is being built |

---

## 7. The annex kit (levels 4 to 10)

Sites level up to 10 (ports and airports to 3). Levels 1 to 3 use the base tiers. Levels 4 to 10 each add one more piece, so the building grows without new models. Make about 10 annexes that any shell can wear, in one palette:

`annex_1` extra shed, `annex_2` second silo or tank, `annex_3` loading dock canopy, `annex_4` office block, `annex_5` conveyor bridge, `annex_6` solar roof, `annex_7` cooling or storage tower, `annex_8` second stack, `annex_9` truck wash and fuel pump, `annex_10` flag and sign plaza.

Each annex has a snap point (a named empty on the shell) so the game can place them; say where each should attach (`snap_1` to `snap_7`).

---

## 8. Vehicles

Build from parts, not whole. The game picks a cab tier and a body by the cargo.

### Trucks (4 classes, 4 body types)
- Cabs (4): Box Truck (Tier 0), Big Box Truck (Tier 1), Big Rig (Tier 2), Truck Fleet convoy (Tier 3, a lead rig with trailers).
- Bodies (4): `flatbed` (logs, lumber, stone, steel, machinery, cotton), `open` (grain, coal, ore, clay, sand, gravel), `tanker` (milk, oil, water, juice, fuel), `box` (everything else).
- Each body needs: empty, half and full load states (or a toggle `cargo_*` per good group so the load shows), loading animation (`load`, `unload`: tailgate or tipper), and driving animation (wheels `anim_wheel_*`, exhaust puff).
- Colours: the game tints the cab by owner; leave a `paint` material slot.

### Rail
- Freight Train (Tier 2) and Heavy Haul Train (Tier 3): 1 locomotive each (a small and a big diesel), wagons: boxcar, open hopper, tank car, flatcar, container car (5), coupling animation not needed. Wheels spin.

### Air
- Cargo Plane (Tier 3) and Cargo Jet (Tier 4): propeller `anim_prop`, jet `anim_engine` glow, landing gear that retracts (`gear_up`, `gear_down`), take off and land animations on the runway.

### Sea
- Fishing Boat, River Barge, Cargo Boat, Freighter, Container Ship (5 hulls). Each has a `wake` mesh the game animates, and cargo toggles: containers for the Container Ship (stack heights), open hold for barge and boat, deck crane for the Freighter.

Total about 24 parts: 4 cabs, 4 truck bodies, 2 locomotives, 5 wagons, 2 aircraft, 5 hulls, plus wheel and prop parts.

---

## 9. Towns

Five regional styles: nordic, temperate, mediterranean, tropical, arid. Each style shares the same shapes and swaps palette and roof form, so make the forms once and re-skin.

- Houses: 6 types per style (cottage, house, terrace unit, shop-house, corner house, big house), each with 2 colour variants. 400 to 1,200 triangles.
- Mid-rise: 3 types (block, flats, mixed-use). Towers: 3 types for the big cities (one is a skyscraper with a crown). Heights for levels 2 to 5 are varied by scale, so supply the forms in 3 heights each.
- Lots (lots held for the player to build on): a pad with painted edge and four orange corner stakes, an empty-lot version and a "reserved/for sale" version.
- Building site (before a home exists): 3 stages (staked, foundation and frame, scaffold and crane at higher levels).
- Street furniture: lamp post (day and lit), traffic signal, bench, bin, fire hydrant, bus stop, market stall, tree and hedge, fence. About 12 props.
- Town growth: levels 1 to 5. Level 1 is a handful of cottages; level 5 is a skyline. Provide the full piece set; the game decides how many to place.
- Windows and doors lit at night via an emissive material.

---

## 10. Civic districts (25 landmarks, 3 levels each)

Each district is a landmark that sits on a town lot and grows with its level. For campuses (sports and university) share a bowl, stand, field and plaza kit.

Level 1: Farmers Market.
Level 2 and up: Restaurant Row, Heating Depot, Coffee House, Hardware Store, Warehouse District, Community Centre.

Venues (added 2026-10-26): Restaurant Row and the Hardware Store are rows of named venues, each wanting its own goods, and a town has only some of them (names and menus in src/sim/venues.ts). Plan one shell per district with a swappable sign and props per venue, not a model per venue. Every district except the bulk and industrial ones now works the same way (Wiki > Venues lists them all). See docs/11-chatgpt-model-handoff.md.
Level 3 and up: Builders' Yard, Furniture Gallery, Fashion Quarter, Library and Bookshops, Freight Terminal, Amphitheatre, Beach Resort, Foundry Row.
Level 4 and up: Football Stadium, Baseball Park, Soccer Stadium, Hockey Arena, University, Hotels and Promenade.
Level 5: Grand Food Hall, Heavy Industry Exchange, International Terminal, Grand Plaza.

Settings: the amphitheatre and resort adapt to their surroundings (plain, forest, rock, water). Give 3 background variants where relevant.

Animations: flags, a lit scoreboard, crowd particles for stadiums (just a texture strip), a rotating globe for the International Terminal, a fountain for the Grand Plaza.

---

## 11. Roads, rails, resource markers and scenery

### Transport pieces (tileable)
Street (2 lane), highway (4 lane, median), junction (T and cross), curve, end cap, bridge (short wood, long steel), tunnel mouth (3 portal styles), level crossing (road on rail, with barrier `anim_barrier`), rail track (straight, curve, switch), rail bridge, air route marker, sea route marker.

### Resource node markers (11 kinds, 3 qualities)
Forest, Farmland, Quarry, Mine, Coal, Clay, Pasture, Orchard, Coffee, Mango, Oil. Each shows as a pin and a ground ring in three states: impure (grey), normal (green), pure (gold). Plus a ring variant for "reserved by another player".

### Scenery (seasonal)
- Trees: conifer (3 sizes), broadleaf (3), palm (2), dry/arid (2), dead (1). Seasonal variants of each: summer, autumn, winter (snow cap), spring (blossom). Cheap LOD cards for the far view.
- Rocks and boulders (4), cliffs, hills, snow patches, reeds (water edge), grass tufts, flowers.
- Ambient animals: a few birds, fish jumping, a deer or two. Optional.

---

## 12. Logo, icons and store art

- Logo: SUPPLYLINE wordmark (the game uses gold on dark slate: #D2B478 and #111A20), a square icon version, and a one-colour version. Deliver SVG and PNG.
- App icon: 1024 px master plus 256, 128, 64, 32, 16.
- Favicon: 64 px.
- Building icons: one 256 px render of each producer and processor shell variant (about 90) so the build menu looks right: transparent background, same camera angle, soft shadow.
- District icons: 25.
- Vehicle icons: 13.
- Goods icons: 89, 64 px, grouped by kind (raw, material, product, by-product) with a consistent frame colour per kind.
- Tier badges (5) and town level badges (5).
- Steam store art (when the page goes live): header capsule 460 x 215, main capsule 616 x 353, small capsule 231 x 87, hero 3840 x 1240, library capsule 600 x 900, library hero 3840 x 1240, library logo, trailer thumbnail, and 5 screenshots at 1920 x 1080.

---

## 13. Suggested order of work

1. Core look and palette: a Crop Farm, a Forestry Camp, a house set, a Box Truck. These four prove the style.
2. Supply Yard, Market, roads and the lot pad (the first ten minutes of play).
3. Livestock Farm, Plantation, Extraction Site, Food Plant, Wood and Paper Plant.
4. Remaining processors, annex kit, by-product props, all trucks and bodies.
5. Towns in the other four regional styles, civic districts, scenery and seasons.
6. Rail, ports, airports, ships and planes.
7. UI icons and store art.

---

## 14. Prompt template for each model

Paste this before each request, filling the brackets:

> You are making a low-poly stylized game model for SupplyLine, a relaxed logistics game on a 3D globe (like Farming Simulator and Euro Truck Simulator). Style: warm, tidy, toy-like, flat or soft-shaded colours from one shared palette, no photoreal textures. Output: glTF 2.0 (.glb), Y up, origin at the centre of the footprint on the ground, front facing +Z. One tile is 3.3 units wide.
>
> Model: [name from the lists above]. Footprint: [for example 3 x 3 tiles]. Triangle budget: [from section 2]. Tiers: [1, 2, 3] with the differences [describe]. Toggle parts, each a named child: [list, for example crop_wheat, crop_corn, crop_cotton]. Animations: [list with clip names]. Include a far version at 5 to 10 percent of the triangles. Max 3 materials, one emissive for windows and lamps. Keep the colours inside the shared palette: slate #111A20, warm off-white #EEEAE1, gold #D2B478, green #81B79A, amber #DFB66D, blue #8CBACE, red #E68B7C.
>
> Give me the model, a front-three-quarter preview image, and a list of every named node.

---

## 15. Current stand-ins

All models in the game today are placeholders built from code (boxes and cylinders). They keep their names and footprints, so a new model drops in under the same name. Do not try to match their look; match this brief.
