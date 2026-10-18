# Supplyline 0.11 - A fuller, more detailed world

## World and vegetation

- Much denser instanced forests: 16-26 placement attempts per forest tile, plus more frequent grassland groves of 6-10 trees. Roads, towns and resource work areas retain their existing clearance rules.
- Fuller orchard and mango scenes, standing trees on undeveloped forest nodes, and 240 visible plants on undeveloped farmland.
- Extra crop rows on built grain farms; individual cotton plants replace solid white strips.
- More detailed pine, oak, birch, orchard and palm models.

## Dairy herds and resource sites

- Shared dairy cattle models on ranches and undeveloped pasture: shaped shoulders and haunches, irregular coat markings, muzzles, eyes, ears, ear tags, jointed legs, hooves, udders and tails.
- Six cows per herd, with different coats, orientations and standing/grazing poses. These are static poses, not animated livestock simulation.
- All 13 resource-site types have purpose-specific detail across three tiers, including silo ladders, loading doors, machinery, irrigation, packing shelters, milk tanks, lumber stacks, conveyors and oil-field pipework.
- Resource upgrades add equipment instead of scaling up the original buildings, animals and props. Production previews show the updated models.

## Materials, architecture and scale

- Locally hosted CC0 brick, concrete and asphalt PBR textures from Poly Haven. See the material notice in `public/assets/materials/NOTICE.txt`.
- Four residential variants, three city-block silhouettes, framed glazing, loading bays and rooftop equipment.
- Detailed road trucks with 2.55m bodies, matched to 3.5m lanes. Local geometry uses 10 metres per world unit.
- Full-size football, baseball and hockey campus models with tiered stands, roofs, access drives and floodlights. New worlds reserve suitable land; older saves preserve compact layouts.
- Muted terrain and interface colors, animated water normals and sky reflections.

## Graphics controls

- Menu > Graphics and lighting: Balanced, High and Ultra presets, saved on the device.
- Manual Day, Dusk and Night lighting with emissive fixtures and bounded local lights.
- Ultra prioritizes desktop quality; Balanced reduces shadows, pixel density and post-processing.

## Compatibility and remaining work

Production rules and existing saves are preserved. Crops and livestock do not yet have growth or grazing simulation. Full-size campus availability depends on suitable land; the current authored map has no suitable full-size ballpark location. Some buildings and air/sea/rail models still need scale reconciliation. Increased vegetation needs further real-device performance tuning, particularly on mobile. This remains a procedural visual upgrade, not simulator-level photorealism.
