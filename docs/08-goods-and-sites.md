# Supplyline: Goods and Sites

Generated from the game by `node tools/export-goods-list.cjs`. Do not edit by hand: change `src/sim/defs.ts` or `src/sim/planned.ts` and run it again. The old design draft is kept as [08-goods-and-sites-draft.md](08-goods-and-sites-draft.md).

## At a glance

| | Count |
|---|---|
| Goods in the game | 89 |
| Buildings that make or move goods | 91 |
| Goods planned, not in the game yet | 64 |

How to read it: **T** is the tier that unlocks it. A good is **raw** (from the land or sea), a **material**, a **product**, or a **by-product** (made alongside something else). **Market L** is the town level at which a Market starts buying it; a dash means no Market asks for it.

Jump to: [Goods](#goods) | [Buildings](#buildings) | [Planned goods](#planned-goods-not-in-the-game) | [Future ideas](#future-ideas-not-built)

## Goods

A good that fits two groups (for example Honey) is listed in both, so the group counts add up to more than the total.

### Food (38)

| Good | Kind | $ | Made by | Used by | Market L |
|---|---|---|---|---|---|
| Barley | raw | 3 | Barley Farm | Brewery, Distillery | 0 |
| Bran | byproduct | 2 | Farm (by-product), Cotton Farm (by-product), Coffee Plantation (by-product), Flour Mill (by-product) | Feed Mill, Garden Supply | - |
| Cocoa | raw | 15 | Cocoa Plantation | Chocolate Maker | 1 |
| Coffee | raw | 16 | Coffee Plantation | - | 1 |
| Eggs | raw | 4 | Chicken Farm | Pastry Kitchen, Noodle Maker, Bakery | 0 |
| Fish | raw | 6 | Fishing Harbor | Smokehouse, Fish Cannery | 0 |
| Fruit | raw | 5 | Orchard, Mango Grove (by-product) | Jam Factory, Juice Press, Dairy, Brewery | 0 |
| Grain | raw | 2 | Farm | Flour Mill, Cereal Mill, Seed Merchant | 0 |
| Grapes | raw | 5 | Vineyard | Winery | 2 |
| Honey | raw | 9 | Apiary | - | 1 |
| Mango | raw | 12 | Mango Grove | - | 1 |
| Milk | raw | 4 | Dairy Ranch | Dairy, Creamery, Ice Cream Plant, Chocolate Maker | 0 |
| Pork | raw | 8 | Pig Farm | Butcher, Sausage Maker, Smokehouse | 2 |
| Potatoes | raw | 3 | Potato Farm | Crisp Fryer | 0 |
| Salt | raw | 4 | Salt Pan | Smokehouse, Fish Cannery, Cannery, Crisp Fryer, Sausage Maker, Snack Factory, Soap Works | 1 |
| Spices | raw | 14 | Spice Plantation | Sausage Maker | 2 |
| Sugar Beet | raw | 3 | Sugar Beet Farm | Sugar Refinery, Biofuel Plant | 0 |
| Sunflower Seeds | raw | 3 | Sunflower Farm | Oil Press, Biofuel Plant, Seed Merchant | 0 |
| Vegetables | raw | 3 | Vegetable Farm | Pizzeria, Cannery | 0 |
| Whey | byproduct | 1 | Dairy Ranch (by-product), Dairy (by-product), Creamery (by-product) | Feed Mill | - |
| Butter | product | 14 | Creamery | Bakery | 0 |
| Canned Fish | product | 12 | Fish Cannery | - | 1 |
| Canned Food | product | 16 | Cannery | - | 1 |
| Cheese | product | 22 | Dairy | Pizzeria | 0 |
| Cooking Oil | material | 13 | Oil Press | Crisp Fryer, Snack Factory, Soap Works | 2 |
| Flour | material | 9 | Flour Mill | Bakery, Pastry Kitchen, Noodle Maker, Pizzeria | 1 |
| Meat | product | 28 | Butcher | - | 1 |
| Sausage | product | 34 | Sausage Maker | - | 2 |
| Sugar | material | 8 | Sugar Refinery | Jam Factory, Pastry Kitchen, Soft Drink Plant, Ice Cream Plant, Chocolate Maker, Bakery, Cereal Mill, Cannery | 1 |
| Bread | product | 13 | Bakery | - | 0 |
| Chocolate | product | 36 | Chocolate Maker | - | 2 |
| Crisps | product | 14 | Crisp Fryer | - | 1 |
| Ice Cream | product | 22 | Ice Cream Plant | - | 2 |
| Jam | product | 10 | Jam Factory | - | 0 |
| Pasta | product | 11 | Noodle Maker | - | 1 |
| Pastry | product | 14 | Pastry Kitchen | - | 1 |
| Pizza | product | 24 | Pizzeria | - | 2 |
| Smoked Fish | product | 15 | Smokehouse | - | 1 |

### Drink (11)

| Good | Kind | $ | Made by | Used by | Market L |
|---|---|---|---|---|---|
| Barley | raw | 3 | Barley Farm | Brewery, Distillery | 0 |
| Coffee | raw | 16 | Coffee Plantation | - | 1 |
| Grapes | raw | 5 | Vineyard | Winery | 2 |
| Hops | raw | 6 | Hop Farm | Brewery | 1 |
| Milk | raw | 4 | Dairy Ranch | Dairy, Creamery, Ice Cream Plant, Chocolate Maker | 0 |
| Water | raw | 1 | Water Pump | Fish Cannery, Brewery, Soft Drink Plant, Winery, Distillery, Cannery | 0 |
| Beer | product | 12 | Brewery | - | 2 |
| Juice | product | 8 | Juice Press | - | 0 |
| Spirits | product | 24 | Distillery | - | 2 |
| Wine | product | 28 | Winery | - | 2 |
| Soft Drink | product | 5 | Soft Drink Plant | - | 2 |

### Minerals and metals (13)

| Good | Kind | $ | Made by | Used by | Market L |
|---|---|---|---|---|---|
| Clay | raw | 3 | Clay Pit | Brickworks | 0 |
| Coal | raw | 6 | Coal Mine | Cement Works, Glassworks, Smelter, Steelworks, Foundry, Refinery | 0 |
| Crude Oil | raw | 11 | Oil Well | Fuel Refinery, Refinery, Paint Works | 2 |
| Gravel | byproduct | 3 | Quarry (by-product), Sand Pit (by-product), Granite Cutter (by-product), Stonecutter (by-product), Slag Crusher | Cement Works, Concrete Plant, Refinery | 0 |
| Iron Ore | raw | 7 | Iron Mine | Smelter | 0 |
| Salt | raw | 4 | Salt Pan | Smokehouse, Fish Cannery, Cannery, Crisp Fryer, Sausage Maker, Snack Factory, Soap Works | 1 |
| Sand | raw | 2 | Clay Pit (by-product), Oil Well (by-product), Sand Pit, Fuel Refinery (by-product), Slag Crusher (by-product) | Concrete Plant, Glassworks | 0 |
| Stone | raw | 5 | Quarry, Coal Mine (by-product), Iron Mine (by-product) | Granite Cutter, Stonecutter | 0 |
| Granite | material | 14 | Granite Cutter | - | - |
| Iron Ingots | material | 34 | Smelter | Toolworks, Steelworks | - |
| Slag | byproduct | 2 | Smelter (by-product), Steelworks (by-product) | Slag Crusher | 0 |
| Stone Blocks | material | 20 | Stonecutter | - | 0 |
| Steel | material | 90 | Steelworks | Machine Works, Steel Mill, Tyre Factory, Cycle Works, Appliance Factory | - |

### Building materials (12)

| Good | Kind | $ | Made by | Used by | Market L |
|---|---|---|---|---|---|
| Clay | raw | 3 | Clay Pit | Brickworks | 0 |
| Gravel | byproduct | 3 | Quarry (by-product), Sand Pit (by-product), Granite Cutter (by-product), Stonecutter (by-product), Slag Crusher | Cement Works, Concrete Plant, Refinery | 0 |
| Sand | raw | 2 | Clay Pit (by-product), Oil Well (by-product), Sand Pit, Fuel Refinery (by-product), Slag Crusher (by-product) | Concrete Plant, Glassworks | 0 |
| Stone | raw | 5 | Quarry, Coal Mine (by-product), Iron Mine (by-product) | Granite Cutter, Stonecutter | 0 |
| Bricks | material | 10 | Brickworks | - | 0 |
| Cement | material | 22 | Cement Works | Concrete Plant | - |
| Glass | material | 24 | Glassworks | Electronics Factory | - |
| Granite | material | 14 | Granite Cutter | - | - |
| Lumber | material | 11 | Sawmill | Furniture Workshop, Toolworks, Sawmill | - |
| Stone Blocks | material | 20 | Stonecutter | - | 0 |
| Concrete | material | 16 | Concrete Plant | - | - |
| Steel | material | 90 | Steelworks | Machine Works, Steel Mill, Tyre Factory, Cycle Works, Appliance Factory | - |

### Wood and paper (11)

| Good | Kind | $ | Made by | Used by | Market L |
|---|---|---|---|---|---|
| Logs | raw | 3 | Forestry Camp | Sawmill, Wood Yard, Paper Mill, Charcoal Kiln | - |
| Pulp | byproduct | 1 | Sugar Beet Farm (by-product), Juice Press (by-product), Sugar Refinery (by-product), Winery (by-product) | Compost Yard, Paper Mill | - |
| Sawdust | byproduct | 1 | Forestry Camp (by-product), Sawmill (by-product) | Garden Supply, Pellet Mill, Sawmill | - |
| Wood Chips | byproduct | 1 | Forestry Camp (by-product), Wood Yard (by-product) | Compost Yard | - |
| Firewood | product | 5 | Wood Yard | Smokehouse | 0 |
| Lumber | material | 11 | Sawmill | Furniture Workshop, Toolworks, Sawmill | - |
| Mulch | product | 6 | Garden Supply, Compost Yard | - | 0 |
| Paper | material | 26 | Paper Mill | Printery | 1 |
| Pellets | product | 8 | Pellet Mill | - | 0 |
| Books | product | 70 | Printery | - | 2 |
| Furniture | product | 40 | Furniture Workshop | - | 2 |

### Cloth and leather (7)

| Good | Kind | $ | Made by | Used by | Market L |
|---|---|---|---|---|---|
| Cotton | raw | 4 | Cotton Farm | Candle Maker, Pillow Maker, Spinning Mill | 1 |
| Feathers | byproduct | 2 | Chicken Farm (by-product) | Pillow Maker | - |
| Wool | raw | 6 | Sheep Farm | Wool Mill | 1 |
| Pillows | product | 24 | Pillow Maker | - | 2 |
| Yarn | material | 14 | Wool Mill, Spinning Mill | Weavery | 1 |
| Cloth | material | 34 | Weavery | Garment Factory, Furniture Workshop, Shoe Factory, Toy Factory | - |
| Clothes | product | 85 | Garment Factory | - | 2 |

### Fuel and energy (6)

| Good | Kind | $ | Made by | Used by | Market L |
|---|---|---|---|---|---|
| Coal | raw | 6 | Coal Mine | Cement Works, Glassworks, Smelter, Steelworks, Foundry, Refinery | 0 |
| Crude Oil | raw | 11 | Oil Well | Fuel Refinery, Refinery, Paint Works | 2 |
| Wood Chips | byproduct | 1 | Forestry Camp (by-product), Wood Yard (by-product) | Compost Yard | - |
| Firewood | product | 5 | Wood Yard | Smokehouse | 0 |
| Fuel | material | 45 | Fuel Refinery | - | 2 |
| Pellets | product | 8 | Pellet Mill | - | 0 |

### Household and tools (7)

| Good | Kind | $ | Made by | Used by | Market L |
|---|---|---|---|---|---|
| Wax | byproduct | 4 | Apiary (by-product) | Candle Maker | - |
| Candles | product | 10 | Candle Maker | - | 2 |
| Pillows | product | 24 | Pillow Maker | - | 2 |
| Books | product | 70 | Printery | - | 2 |
| Tools | product | 60 | Toolworks | Machine Works | 2 |
| Furniture | product | 40 | Furniture Workshop | - | 2 |
| Machinery | product | 330 | Machine Works | - | 3 |

### Farm supplies (10)

| Good | Kind | $ | Made by | Used by | Market L |
|---|---|---|---|---|---|
| Bran | byproduct | 2 | Farm (by-product), Cotton Farm (by-product), Coffee Plantation (by-product), Flour Mill (by-product) | Feed Mill, Garden Supply | - |
| Fish Scraps | byproduct | 1 | Fishing Harbor (by-product) | Fish Meal Plant, Compost Works | - |
| Grain | raw | 2 | Farm | Flour Mill, Cereal Mill, Seed Merchant | 0 |
| Husks | byproduct | 1 | Sunflower Farm (by-product), Oil Press (by-product) | Silage Plant, Compost Works | - |
| Straw | byproduct | 1 | Barley Farm (by-product) | Compost Yard, Silage Plant, Compost Works | - |
| Sunflower Seeds | raw | 3 | Sunflower Farm | Oil Press, Biofuel Plant, Seed Merchant | 0 |
| Whey | byproduct | 1 | Dairy Ranch (by-product), Dairy (by-product), Creamery (by-product) | Feed Mill | - |
| Feed | product | 8 | Feed Mill, Fish Meal Plant, Silage Plant | - | 0 |
| Mulch | product | 6 | Garden Supply, Compost Yard | - | 0 |
| Spent Grain | byproduct | 1 | Brewery (by-product), Distillery (by-product) | Fish Meal Plant, Silage Plant | - |

## Buildings

### Production (raw sites) (29)

| Building | T | Cost | Needs | Takes in | Makes | By-product |
|---|---|---|---|---|---|---|
| Dairy Ranch | T0 | $130 | pasture spot | - | Milk | Whey |
| Farm | T0 | $90 | farmland spot | - | Grain | Bran |
| Forestry Camp | T0 | $80 | forest spot | - | Logs | Sawdust, Wood Chips |
| Orchard | T0 | $120 | orchard spot | - | Fruit | - |
| Chicken Farm | T1 | $110 | pasture spot | - | Eggs | Feathers |
| Clay Pit | T1 | $110 | clay spot | - | Clay | Sand |
| Coal Mine | T1 | $200 | coal spot | - | Coal | Stone |
| Fishing Harbor | T1 | $500 | - | - | Fish | Fish Scraps |
| Potato Farm | T1 | $110 | farmland spot | - | Potatoes | - |
| Quarry | T1 | $160 | quarry spot | - | Stone | Gravel |
| Sand Pit | T1 | $140 | - | - | Sand | Gravel |
| Sugar Beet Farm | T1 | $130 | farmland spot | - | Sugar Beet | Pulp |
| Vegetable Farm | T1 | $100 | farmland spot | - | Vegetables | - |
| Water Pump | T1 | $100 | - | - | Water | - |
| Apiary | T2 | $140 | orchard spot | - | Honey | Wax |
| Barley Farm | T2 | $130 | farmland spot | - | Barley | Straw |
| Coffee Plantation | T2 | $420 | coffee spot | - | Coffee | Bran |
| Cotton Farm | T2 | $150 | farmland spot | - | Cotton | Bran |
| Iron Mine | T2 | $220 | mine spot | - | Iron Ore | Stone |
| Mango Grove | T2 | $320 | mango spot | - | Mango | Fruit |
| Oil Well | T2 | $900 | oil spot | - | Crude Oil | Sand |
| Pig Farm | T2 | $160 | pasture spot | - | Pork | - |
| Salt Pan | T2 | $120 | - | - | Salt | - |
| Sheep Farm | T2 | $140 | pasture spot | - | Wool | - |
| Sunflower Farm | T2 | $130 | farmland spot | - | Sunflower Seeds | Husks |
| Vineyard | T2 | $170 | orchard spot | - | Grapes | - |
| Cocoa Plantation | T3 | $360 | coffee spot | - | Cocoa | - |
| Hop Farm | T3 | $150 | farmland spot | - | Hops | - |
| Spice Plantation | T3 | $320 | mango spot | - | Spices | - |

### Processing (27)

| Building | T | Cost | Needs | Takes in | Makes | By-product |
|---|---|---|---|---|---|---|
| Bakery | T0 | $260 | town plot | Flour | Bread | - |
| Dairy | T0 | $280 | town plot | Milk | Cheese | Whey |
| Flour Mill | T0 | $220 | town plot | Grain | Flour | Bran |
| Wood Yard | T0 | $200 | town plot | Logs | Firewood | Wood Chips |
| Creamery | T1 | $300 | town plot | Milk | Butter | Whey |
| Feed Mill | T1 | $300 | town plot | Bran, Whey | Feed | - |
| Garden Supply | T1 | $320 | town plot | Sawdust, Bran | Mulch | - |
| Jam Factory | T1 | $300 | town plot | Fruit, Sugar | Jam | - |
| Juice Press | T1 | $280 | town plot | Fruit | Juice | Pulp |
| Pellet Mill | T1 | $380 | town plot | Sawdust | Pellets | - |
| Recycling Yard | T1 | $150 | town plot | - | - | - |
| Sawmill | T1 | $220 | town plot | Logs | Lumber | Sawdust |
| Sugar Refinery | T1 | $380 | town plot | Sugar Beet | Sugar | Pulp |
| Butcher | T2 | $450 | town plot | Pork | Meat | - |
| Cannery | T2 | $360 | town plot | Vegetables, Salt | Canned Food | - |
| Compost Yard | T2 | $300 | town plot | Wood Chips, Pulp, Straw | Mulch | - |
| Fish Cannery | T2 | $400 | town plot | Fish, Salt, Water | Canned Fish | - |
| Fish Meal Plant | T2 | $340 | town plot | Fish Scraps, Spent Grain | Feed | - |
| Noodle Maker | T2 | $380 | town plot | Flour, Eggs | Pasta | - |
| Oil Press | T2 | $400 | town plot | Sunflower Seeds | Cooking Oil | Husks |
| Pastry Kitchen | T2 | $420 | town plot | Flour, Eggs, Sugar | Pastry | - |
| Silage Plant | T2 | $300 | town plot | Straw, Husks, Spent Grain | Feed | - |
| Smokehouse | T2 | $420 | town plot | Fish, Salt, Firewood | Smoked Fish | - |
| Wool Mill | T2 | $380 | town plot | Wool | Yarn | - |
| Brewery | T3 | $600 | town plot | Barley, Hops, Water | Beer | Spent Grain |
| Pizzeria | T3 | $460 | town plot | Flour, Cheese, Vegetables | Pizza | - |
| Soft Drink Plant | T3 | $380 | town plot | Sugar, Water | Soft Drink | - |

### Manufacturing (14)

| Building | T | Cost | Needs | Takes in | Makes | By-product |
|---|---|---|---|---|---|---|
| Distillery | T2 | $750 | town plot | Barley, Water | Spirits | Spent Grain |
| Furniture Workshop | T2 | $900 | town plot | Lumber, Cloth | Furniture | - |
| Garment Factory | T2 | $650 | town plot | Cloth | Clothes | - |
| Paper Mill | T2 | $480 | town plot | Logs | Paper | - |
| Printery | T2 | $1200 | town plot | Paper | Books | - |
| Spinning Mill | T2 | $400 | town plot | Cotton | Yarn | - |
| Weavery | T2 | $520 | town plot | Yarn | Cloth | - |
| Winery | T2 | $650 | town plot | Grapes, Water | Wine | Pulp |
| Candle Maker | T3 | $500 | town plot | Wax, Cotton | Candles | - |
| Chocolate Maker | T3 | $700 | town plot | Cocoa, Sugar, Milk | Chocolate | - |
| Crisp Fryer | T3 | $520 | town plot | Potatoes, Cooking Oil, Salt | Crisps | - |
| Ice Cream Plant | T3 | $600 | town plot | Milk, Sugar | Ice Cream | - |
| Pillow Maker | T3 | $450 | town plot | Feathers, Cotton | Pillows | - |
| Sausage Maker | T3 | $600 | town plot | Pork, Salt, Spices | Sausage | - |

### Heavy industry (12)

| Building | T | Cost | Needs | Takes in | Makes | By-product |
|---|---|---|---|---|---|---|
| Brickworks | T1 | $420 | town plot | Clay | Bricks | - |
| Granite Cutter | T1 | $420 | town plot | Stone | Granite | Gravel |
| Stonecutter | T1 | $380 | town plot | Stone | Stone Blocks | Gravel |
| Cement Works | T2 | $600 | town plot | Gravel, Coal | Cement | - |
| Concrete Plant | T2 | $650 | town plot | Cement, Sand, Gravel | Concrete | - |
| Glassworks | T2 | $700 | town plot | Sand, Coal | Glass | - |
| Smelter | T2 | $800 | town plot | Iron Ore, Coal | Iron Ingots | Slag |
| Toolworks | T2 | $750 | town plot | Iron Ingots, Lumber | Tools | - |
| Fuel Refinery | T3 | $1600 | town plot | Crude Oil | Fuel | Sand |
| Machine Works | T3 | $2200 | town plot | Steel, Tools | Machinery | - |
| Slag Crusher | T3 | $500 | town plot | Slag | Gravel | Sand |
| Steelworks | T3 | $1400 | town plot | Iron Ingots, Coal | Steel | Slag |

### Logistics and storage (5)

| Building | T | Cost | Needs | Takes in | Makes | By-product |
|---|---|---|---|---|---|---|
| Distribution Warehouse | T1 | $300 | - | - | - | - |
| Mechanic Shop | T1 | $700 | - | - | - | - |
| Port | T2 | $4000 | - | - | - | - |
| Rail Yard | T2 | $3000 | - | - | - | - |
| Airport | T3 | $2500 | - | - | - | - |

### Town buildings and other (4)

| Building | T | Cost | Needs | Takes in | Makes | By-product |
|---|---|---|---|---|---|---|
| District | T0 | $0 | - | - | - | - |
| Market | T0 | $0 | - | - | - | - |
| Supply Yard | T0 | $0 | - | - | - | - |
| Rail Station | T2 | $0 | - | - | - | - |

## Planned goods (not in the game yet)

Placeholders from `src/sim/planned.ts`. Each has a spot waiting for it. Nothing here is built or decided.

| Good | Kind | $ | Would be made by | From | Note |
|---|---|---|---|---|---|
| Chicken | raw | 9 | Poultry Farm (with eggs and feathers) | - | Free-range birds on open ground |
| Beef Cattle | raw | 12 | Cattle Ranch (with leather hides) | - | Pasture on open ground |
| Lamb | raw | 11 | Sheep Ranch (with wool) | - | Pasture on open ground |
| Bacon | product | 30 | Smokehouse | pork, salt |  |
| Ham | product | 32 | Smokehouse | pork, salt |  |
| Cream | material | 12 | Dairy | milk |  |
| Yogurt | product | 12 | Dairy | milk, fruit |  |
| Cake | product | 30 | Bakery | flour, sugar, eggs, butter |  |
| Cookies | product | 16 | Bakery | flour, sugar, butter |  |
| Breakfast Cereal | product | 12 | Cereal Mill | grain, sugar |  |
| Rice | raw | 4 | Rice Paddy | - | Wet low ground in the tropics |
| Corn | raw | 3 | Farm | - | Fields on open ground |
| Tomatoes | raw | 4 | Farm | - | Fields on open ground |
| Onions | raw | 3 | Farm | - | Fields on open ground |
| Olives | raw | 5 | Olive Grove | - | Dry warm hillsides in the Mediterranean |
| Dates | raw | 8 | Date Palm Grove | - | Oases in the desert |
| Bananas | raw | 4 | Plantation | - | Tropical lowlands |
| Coconuts | raw | 5 | Plantation | - | Tropical coast |
| Peanuts | raw | 4 | Farm | - | Warm dry fields |
| Tea Leaves | raw | 8 | Tea Estate | - | Wet hillsides |
| Ketchup | product | 12 | Cannery | tomatoes, sugar |  |
| Soup | product | 15 | Cannery | vegetables, water |  |
| Popcorn | product | 8 | Snack Factory | corn, cookoil |  |
| Olive Oil | material | 20 | Oil Press | olives |  |
| Peanut Butter | product | 14 | Snack Factory | peanuts, salt |  |
| Tea | product | 14 | Tea Packer | tealeaves |  |
| Cider | product | 14 | Brewery | fruit, water |  |
| Limestone | raw | 4 | Quarry | - | Pale hills |
| Gypsum | raw | 5 | Quarry | - | Dry basins and the desert |
| Marble | raw | 12 | Quarry | - | High mountains |
| Copper Ore | raw | 9 | Mine | - | Mountains |
| Copper | material | 40 | Foundry | copperore, coal |  |
| Bauxite | raw | 8 | Mine | - | Warm hills |
| Aluminium | material | 55 | Smelter | bauxite, coal |  |
| Gold Ore | raw | 25 | Mine | - | Deep in the mountains |
| Gold | material | 300 | Refinery | goldore, coal |  |
| Natural Gas | raw | 10 | Gas Field | - | Deserts and shallow seas, beside oil |
| Charcoal | product | 12 | Charcoal Kiln | logs |  |
| Biofuel | product | 30 | Biofuel Plant | sugarbeet, sunflower |  |
| Roof Tiles | material | 18 | Brickworks | clay |  |
| Plaster | material | 14 | Cement Works | gypsum |  |
| Asphalt | material | 20 | Refinery | oil, gravel |  |
| Steel Pipes | material | 50 | Steel Mill | steel |  |
| Copper Wire | material | 40 | Wire Mill | copper |  |
| Plywood | material | 20 | Sawmill | lumber, sawdust |  |
| Cardboard | material | 12 | Paper Mill | pulp |  |
| Leather | material | 30 | Tannery | beef |  |
| Flax | raw | 5 | Farm | - | Cool wet fields |
| Linen | material | 28 | Textile Mill | flax |  |
| Silk | raw | 40 | Silk Farm | - | Mulberry groves in warm wet land |
| Shoes | product | 75 | Shoe Factory | leather, cloth |  |
| Soap | product | 8 | Soap Works | cookoil, salt |  |
| Rubber | raw | 12 | Rubber Plantation | - | Tropical forest |
| Tyres | product | 90 | Tyre Factory | rubber, steel |  |
| Plastic | material | 30 | Refinery | oil |  |
| Paint | product | 30 | Paint Works | oil, limestone |  |
| Toys | product | 40 | Toy Factory | plastic, cloth |  |
| Electronics | product | 400 | Electronics Factory | copper, plastic, glass |  |
| Batteries | product | 120 | Battery Plant | copper, aluminium |  |
| Bicycles | product | 180 | Cycle Works | steel, tyres |  |
| Appliances | product | 600 | Appliance Factory | steel, plastic, electronics |  |
| Hay | raw | 2 | Farm | - | Meadows |
| Seed | product | 6 | Seed Merchant | grain, sunflower |  |
| Fertilizer | product | 14 | Compost Works | fishscraps, straw, husks | Uses by-products that otherwise go to scrap |

## Future ideas (not built)

From [16-future-ledger.md](16-future-ledger.md). Chris wants variety in every family, with realistic ingredients. Nothing here is decided or started.

| Idea | What | Ledger row |
|---|---|---|
| Beer styles | pale, malt, stout, porter, sour, wheat, IPA | FP-37 |
| Wine styles | red, white, rose, sparkling, fruit and honey wines | FP-37 |
| Bread | white, rye, sourdough, whole grain | FP-37 |
| Cheese | fresh, soft, hard, blue, aged | FP-37 |
| Malt and yeast | real base ingredients with simple producers; first beer pack needs them | FP-40 |
| Preserves and produce | more jam, juice and canned varieties from what the map grows | FP-37 |
