# Visual direction: earth first

The target is a cohesive painterly world, using Sea of Thieves as an art-feel reference across natural and modern subjects. Skyscrapers should still read as modern architecture. Shared colour relationships, clear silhouettes and broad surface detail should tie the world together. These procedural changes establish a starting point for a future artist's assets.

## First trial

- Ground only: cooler green shadows, warmer meadow highlights and sand, quieter grain, broader baked colour variation.
- Keep existing terrain geometry, texture dimensions, material count and shader texture samples.
- Preserve water colours, terrain heights, gameplay boundaries, seasonal behaviour and resource overlays.
- Review at normal play distance and close up, in daylight and winter. The natural-world sequence is ground, mountains, ocean, trees, bushes, then remaining rocks/resource scenery. Treat each as a separate reviewable pass before moving to buildings.

## General earth refinement

The next ground-only pass strengthens green meadow masses, reduces the extent of dry yellow patches, brightens the forest floor, and softens forest/sand transitions. It lowers the existing terrain micro-bump strength from 0.018 to 0.005 so close-up surfaces read as painted rather than pebbly. This shared ground-material adjustment also quiets grain on rocky land; mountain shapes and rock palettes remain for their own pass. Ocean shading, vegetation geometry, resource props and global lighting are unchanged. All colour variation is baked using the existing noise fields; no extra runtime texture samples, texture layers, draw calls or geometry are introduced.

Validation: production build/type check passed. Inspected matching-camera summer captures before and after the refinement, then a winter capture with the existing snow treatment. Chrome reported no runtime errors. Current screenshots are `dist/review/ground-after.png` and `dist/review/ground-winter.png`; build output is temporary and is replaced on the next production build. Hardware FPS remains unmeasured.

## Mountain surface pass

Mountain rock now moves from cool slate in lower bands toward warm stone higher up, with broad irregular colour patches and three gently blended altitude bands. Existing noise fields warp those bands, and the rock/grass transition is softened. This is a baked surface-art pass: silhouettes, terrain heights, collision/road grading, snow rules, texture dimensions and runtime shader cost are unchanged. Mountain mesh reshaping remains a separate decision after visual review. Ocean and vegetation are still queued for their own passes.

Validation: production build/type check passed; inspected seed 11 in Chrome at camera distances 40 and 110 with no reported runtime errors. Review captures: `dist/review/mountains-close.png` and `dist/review/mountains-wide.png`. These are visual checks, not a hardware performance benchmark.

## Rendering investigation

Reported symptoms: intermittent lag opening Logistics, consistent lag opening a road tool, truck flicker and FPS drops.

Confirmed in code: opening a category calls `setTool('select')`; every tool switch invalidated the world signature, triggering site, town and vehicle synchronization on the following frame. Removed that invalidation: tool overlays and node markers already update outside the world-change branch on every frame. World changes still invalidate normally.

Road overlay follow-up: `Scenery.setRoadZones` now builds one 16-by-16 tile chunk per frame, prioritizing the camera and reprioritizing pending work when it moves. Completed chunks are cached across closing/reopening, have bounds for frustum culling, and preserve continuous blocked-area outlines across chunk boundaries and the longitude seam. World or mode changes discard stale geometry. Roads, site footprints and district-lot changes invalidate the overlay. Colour coverage fills progressively, especially from far away; gameplay placement checks remain immediate and unchanged. Measure first-open frame time and steady draw calls on the affected save before claiming an FPS improvement.

Truck follow-up: cargo ribs and side stripes had overlapping outward faces on exactly the same plane. The ribs now stand 3.5 cm farther outward, preserving geometry counts and lane fit. A regression test checks their separation for all four truck variants. This removes one concrete depth conflict; the user's observed flicker still needs visual confirmation, and other shadow/depth issues may remain.

## Review procedure

Use the same save, camera, graphics preset and simulation speed for comparisons. Record frame time and the first-open hitch separately from steady FPS. Open Logistics, open roads, pan, close and reopen roads, and check a road placement and a town-growth update. Repeat on the larger maps. A headless software-rendered screenshot is a visual smoke test, not evidence of hardware FPS improvement.

The palette/noise edits are in `src/r3d/paint.ts`; close-up grain strength is in `src/r3d/globeMesh.ts`. They can be reverted independently of the tool-switch fix. No new external assets are needed for this trial.

## Validation of the first two passes

Production build and TypeScript checks pass. The targeted graphics, fit, tool-switch, road-overlay and truck suites pass (256 tests). A headless Chrome smoke test on seed 11 successfully rendered the globe and the active road overlay at close range, with pending chunks still loading; no runtime errors were reported. Screenshots are local review artifacts under `dist/review/`. This does not establish hardware FPS improvement or confirm that every reported truck flicker is resolved.

## Mountains as rock slabs

Reference: the Sea of Thieves rock masses and the layered sandstone arch. A mountain is now a few big flat-topped, bevelled slabs that are part of the ground, not a smooth spike with a painted texture and not objects placed on top. `HeightField` in `src/r3d/geo.ts` lays out about one slab per two mountain tiles (2 to 4 tiles across, topped near the smooth height there, a tall peak is two stacked) and the terrain height on mountain tiles is the union of the slabs, with the old smooth ground kept underneath at 30 percent as a skirt. Slabs meet in hard creases. Roads, pads, tunnels, mines and scenery all read the same `at`/`surface` height, so they follow the slabs; the road grading numbers are unchanged. The old shallow shelf code is gone.

Shading in `src/r3d/globeMesh.ts`: stone is shaded by its triangle so the planes read flat; steep ground is rock whatever the map painted, so grass stops at the foot of a cliff; steep rock is coloured from world height as warm banded sandstone with ledge lighting, cooling to grey stone and pale caps on the highest peaks. The stone detail texture is sampled blurred, so there is no honeycomb. Colour on steep faces is computed in the shader because the map colour stretches down a cliff.

Tried and dropped: scattering hundreds of flat-shaded rock chunks over the smooth terrain (read as boulders pasted on spires), and stronger terrain shelf steps (no visible gain).

Not yet checked: desert maps, winter, trees and bushes on the lower slopes of mountains, first-open frame time and FPS on hardware, a road tunnelled through a slab on a real save. Review captures: `dist/review/mountains-*.png`.

## Mountain foot

Grass hills that ran up the side of a mountain read as green wedges between the slabs. `HeightField.dropFoothills` now caps land beside a mountain at relief 1.2 (one tile out) and 2.2 (two tiles out), the smooth ground under a mountain tile drops to a low skirt (18 percent) so the slabs stand out of the plain, and the map's rock mask is widened so leftover ground reads as scree. In `src/r3d/scenery.ts` trees, bushes and stones are skipped on steep ground and above a treeline (surface 7.5), and shrubs, stones and a few trees gather on gentle ground on and within two tiles of mountains. Changes land heights near mountains, so buildings on old saves beside a mountain may sit slightly differently. Not yet checked: desert, winter, a road tunnelled through a slab, hardware FPS.

## Queued for the trees and bushes pass

Chris, 2026-10-26: the leftover green patches between mountain slabs (the straight grass edges where grass meets rock) need bushes and trees to break up the grass lines, and the grass should blend into the rock more. Do this when the natural-world sequence reaches trees and bushes.

## Mountains in winter

Snow was a flat white blanket over every mountain, hiding the rock. In `src/r3d/globeMesh.ts` snow now slides off steep rock (up to 80 percent less on steep faces), so tops, ledges and the ground stay white and the layered faces still show. Desert: no random seed (3, 5, 7, 11) or the hand-made world map has a mountain inside a desert zone, so the sandstone palette is unchecked there. Captures: `dist/review/winter-*.png`.

## Ocean pass

Water colour in `src/r3d/paint.ts` now runs bright turquoise at the shore, through clear blue, to deep navy (three colours, two smoothsteps on distance from land, nudged by the existing noise), with a thin broken foam line where water meets beach. Water gloss in `src/r3d/globeMesh.ts` is 0.42 roughness (was 0.5) so the sun glints on it. Water stays flat and still, geometry and texture counts unchanged. A ripple-line idea was tried and dropped (it read as winding rivers). Not checked: night, winter, other seeds, hardware FPS. Captures: `dist/review/ocean-*.png`.

## Trees, bushes and the mountain foot

Tree and bush models are unchanged (Chris likes how they look); this pass is placement and blending. In `src/r3d/scenery.ts`, every tile on or within two tiles of a mountain now gets many candidate plants and stones (a mix of bushes, stones, pines, birches and oaks), and the slope and treeline filter keeps only gentle ground (bushes tolerate more slope than trees, nothing above surface height 7.5), so the pockets between slabs fill in. In `src/r3d/paint.ts` the roughness map's blue channel is now a soft mountain halo (fading over three tiles), and `src/r3d/globeMesh.ts` dries the grass inside it toward earth and fallen stone in broken patches, so green fades into the rock instead of stopping at it. No new textures, draw calls or geometry; a few hundred more small instanced plants near mountains. Not checked: hardware FPS, other seeds, winter near mountains. Captures: `dist/review/foot-*.png`.

## Rocks and resource scenery

Loose stones and the resource-node rock heaps (quarry, mine, coal, clay) were smooth grey eggs. In `src/r3d/scenery.ts`, `stoneLump` now builds them as uneven, squared-off slabs in broad flat planes with a vertex-colour ramp: a dark damp foot, a warm face and a pale top, each plane a little different. The node heap is one big slab with two leaning against it and three loose stones at the foot. Loose stones are tinted per instance: warm sandstone within two tiles of a mountain, grey-brown elsewhere. Node marker colours were warmed (quarry, mine, coal, clay). No new textures or draw calls; the models stay as instanced low-poly meshes. Not changed: the near-range node scenes (hay, fences, mine adit, sheds), which belong with the buildings pass. Captures: `dist/review/rocks-*.png`.

## Trees, bushes and resource nodes (models)

Trees and bushes were dull and spiky. `src/r3d/parts.ts` gained a `foliage` mode: parts added while it is set take light and shade from their own surface, so tops facing the sky are warm and bright, undersides cool and deep, and the crown brighter than the skirts. `src/r3d/vegetation.ts` uses it for every tree and for the new shared `addBush`, with fresher greens (pines deep teal-green, oaks and birches yellow-green) and broader pine skirts. The far pin for a wood is now three painted pines, not flat cones. Resource node scenes (quarry, mine, coal, clay, forest) use `src/r3d/stones.ts` for slabs sunk into the ground with a dusted foot. Chris removed clutter that read as wrong: the clay pond and reeds, quarry marker posts and stacked blocks, ore carts and rails. Rule from Chris: node rocks must look bedded into the ground, not floating and not sitting in a crater or ring. Also fixed: the far pin used to draw on top of the near scene; now only one shows. Captures: `dist/review/trees-*.png`, `dist/review/nodes-*.png`.

## Node heaps

Chris, 2026-10-26: node rocks need more than one big rock, must read from a distance, and some stones should mesh together. In `src/r3d/scenery.ts`, `HEAPS` holds four patterns of six overlapping stones (a big slab, leaning stones, loose ones), picked per node by id and coloured per kind (`HEAP_COLOR`: pale quarry, rust mine, dark coal, terracotta clay). The near scene and the far pin use the same heap, so a node looks the same up close and from afar. The far pin grows with distance past where the near scene stops (up to 6 times for stone, 2.2 for woods), so heaps stay clear shapes on the globe. Captures: `dist/review/heaps-*.png`.
