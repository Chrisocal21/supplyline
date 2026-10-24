// Usage: node tools/export-wiki.cjs
// Writes web/app/wiki/data.json from the game's own definitions (buildings, vehicles, districts, goods), so the wiki never
// disagrees with the game. Run it after changing src/sim/defs.ts, then commit the file.
const fs = require('fs');
const path = require('path');
const { createServer } = require('vite');
const root = path.join(__dirname, '..');
(async () => {
  const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
  try {
    const defs = await server.ssrLoadModule('/src/sim/defs.ts');
    const cat = await server.ssrLoadModule('/src/sim/catalog.ts');
    const goodLabel = (g) => (defs.GOODS[g] ? defs.GOODS[g].label : g);
    const stock = (s) => Object.entries(s || {}).map(([g, n]) => ({ good: g, label: goodLabel(g), n }));
    const sites = Object.entries(defs.SITE_DEFS).map(([kind, d]) => ({
      kind,
      label: d.label,
      blurb: d.blurb,
      real: d.real || '',
      category: d.category || (d.dock ? 'town' : d.station ? 'logistics' : ''),
      tier: d.tier,
      cost: d.cost,
      cap: d.cap,
      node: d.node || '',
      inTown: !!d.inTown,
      dock: d.dock || '',
      produce: d.produce ? { good: d.produce.good, label: goodLabel(d.produce.good), also: (d.produce.also || []).map((a) => ({ good: a.good, label: goodLabel(a.good) })) } : null,
      inputs: d.recipe ? stock(d.recipe.inputs) : [],
      outputs: d.recipe ? stock(d.recipe.outputs) : [],
      hub: !!d.hub,
      airport: !!d.airport,
      port: !!d.port,
      maxLevel: d.airport || d.port ? 3 : defs.MAX_LEVEL,
    }));
    const vehicles = Object.entries(defs.VEHICLE_DEFS).map(([kind, d]) => ({ kind, label: d.label, blurb: d.blurb, mode: d.mode, tier: d.tier, cost: d.cost, capacity: d.capacity, needLevel: d.needLevel, next: d.next || '', reach: (defs.VEHICLE_REACH && defs.VEHICLE_REACH[kind]) || 0 }));
    const districts = Object.entries(defs.DISTRICTS).map(([id, d]) => ({ id, label: d.label, blurb: d.blurb, minLevel: d.minLevel, cost: d.cost, revenue: d.revenue, goods: d.goods.map((g) => ({ good: g, label: goodLabel(g) })), effect: d.effect || '' }));
    const goods = cat.catalog().filter((g) => !g.planned).map((g) => ({ id: g.id, label: g.label, price: g.price, kind: g.kind, depth: g.depth, forBuilding: g.forBuilding, marketLevel: g.marketLevel, madeBy: g.madeBy.filter((m) => m.site).map((m) => ({ site: m.site, label: m.label, byProduct: m.byProduct })), usedBy: g.usedBy.filter((u) => u.site).map((u) => ({ site: u.site, label: u.label })) }));
    const out = path.join(root, 'web', 'app', 'wiki', 'data.json');
    fs.writeFileSync(out, JSON.stringify({ sites, vehicles, districts, goods }, null, 1));
    console.log(`wrote ${out}: ${sites.length} buildings, ${vehicles.length} vehicles, ${districts.length} districts, ${goods.length} goods`);
  } finally {
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
