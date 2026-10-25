# Scale

One world unit is 10 m (`src/scale.ts`). One tile is 32.7 m, so a one-tile lot holds one building. People, floors, roads and
vehicles are made at real size; the terrain is not (the globe is 1 km across, the highest peak 65 m today).

| Thing | Size |
|---|---|
| Person | 1.8 m |
| Floor | 3.2 m (4.5 m for a ground floor with a shopfront) |
| Lane | 3.5 m |
| Box truck | 8 m long, 4 m high |
| Big box truck | 10 m long |
| Big rig | 18 m long |
| Cottage | 7 m (2 floors) |
| Terrace or shopfront row | 12 m (3 to 4 floors) |
| Low block | 27 m (8 floors) |
| Mid-rise | 54 m (17 floors) |
| Tower | 115 m (36 floors) |
| Tallest core tower (cap) | 150 m (47 floors) |

`BUILDING_HEIGHT`, `SHOP_FLOOR_HEIGHT` and `storeys` in `src/scale.ts` hold the same numbers. The picture `docs/scale-lineup.png`
(made by `tools/scale-lineup.cjs`) shows them side by side with today's and a raised mountain.

The highest peak is 160 m (`MAX_RELIEF` 16 in `src/r3d/geo.ts`, was 6.5), so the biggest mountain stands above the tallest 150 m core tower.
