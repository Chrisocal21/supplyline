// Usage: node tools/export-goods-list.cjs
// Writes docs/08-goods-and-sites.md from the game's own definitions (goods, buildings, planned goods), so the list never disagrees
// with the game. Run it after changing src/sim/defs.ts or src/sim/planned.ts, then commit the file.
const fs = require('fs');
const path = require('path');
const { createServer } = require('vite');
const root = path.join(__dirname, '..');

const FUTURE = [
  ['Beer styles', 'pale, malt, stout, porter, sour, wheat, IPA', 'FP-37'],
  ['Wine styles', 'red, white, rose, sparkling, fruit and honey wines', 'FP-37'],
  ['Bread', 'white, rye, sourdough, whole grain', 'FP-37'],
  ['Cheese', 'fresh, soft, hard, blue, aged', 'FP-37'],
  ['Malt and yeast', 'real base ingredients with simple producers; first beer pack needs them', 'FP-40'],
  ['Preserves and produce', 'more jam, juice and canned varieties from what the map grows', 'FP-37'],
];

(async () => {
  const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
  try {
    const defs = await server.ssrLoadModule('/src/sim/defs.ts');
    const cat = await server.ssrLoadModule('/src/sim/catalog.ts');
    const pl = await server.ssrLoadModule('/src/sim/planned.ts');
    const label = (g) => (defs.GOODS[g] ? defs.GOODS[g].label : g);
    const list = (s) => Object.keys(s || {}).map(label).join(', ') || '-';
    const entries = cat.catalog();
    const inGame = entries.filter((e) => !e.planned);
    const planned = entries.filter((e) => e.planned);
    const sites = Object.entries(defs.SITE_DEFS);
    const tierName = (t) => `T${t}`;

    const out = [];
    out.push('# Supplyline: Goods and Sites');
    out.push('');
    out.push('Generated from the game by `node tools/export-goods-list.cjs`. Do not edit by hand: change `src/sim/defs.ts` or `src/sim/planned.ts` and run it again. The old design draft is kept as [08-goods-and-sites-draft.md](08-goods-and-sites-draft.md).');
    out.push('');
    out.push('## At a glance');
    out.push('');
    out.push(`| | Count |`);
    out.push(`|---|---|`);
    out.push(`| Goods in the game | ${inGame.length} |`);
    out.push(`| Buildings that make or move goods | ${sites.length} |`);
    out.push(`| Goods planned, not in the game yet | ${planned.length} |`);
    out.push('');
    out.push('How to read it: **T** is the tier that unlocks it. A good is **raw** (from the land or sea), a **material**, a **product**, or a **by-product** (made alongside something else). **Market L** is the town level at which a Market starts buying it; a dash means no Market asks for it.');
    out.push('');
    out.push('Jump to: [Goods](#goods) | [Buildings](#buildings) | [Planned goods](#planned-goods-not-in-the-game) | [Future ideas](#future-ideas-not-built)');
    out.push('');

    out.push('## Goods');
    out.push('');
    out.push('A good that fits two groups (for example Honey) is listed in both, so the group counts add up to more than the total.');
    out.push('');
    for (const grp of pl.GROUPS) {
      const rows = inGame.filter((e) => (e.groups || []).includes(grp.id));
      if (rows.length === 0) continue;
      out.push(`### ${grp.label} (${rows.length})`);
      out.push('');
      out.push('| Good | Kind | $ | Made by | Used by | Market L |');
      out.push('|---|---|---|---|---|---|');
      for (const e of rows.sort((a, b) => a.depth - b.depth || a.label.localeCompare(b.label))) {
        const made = [...new Set(e.madeBy.map((m) => `${m.label}${m.byProduct ? ' (by-product)' : ''}`))].join(', ') || '-';
        const used = [...new Set(e.usedBy.map((u) => u.label))].join(', ') || '-';
        out.push(`| ${e.label} | ${e.kind} | ${e.price} | ${made} | ${used} | ${e.marketLevel ?? '-'} |`);
      }
      out.push('');
    }
    const ungrouped = inGame.filter((e) => !(e.groups || []).length);
    if (ungrouped.length) {
      out.push(`### Not in a group (${ungrouped.length})`);
      out.push('');
      out.push(ungrouped.map((e) => e.label).join(', '));
      out.push('');
    }

    out.push('## Buildings');
    out.push('');
    const cats = ['production', 'processing', 'manufacturing', 'heavy', 'logistics', 'vehicles', ''];
    const catName = { production: 'Production (raw sites)', processing: 'Processing', manufacturing: 'Manufacturing', heavy: 'Heavy industry', logistics: 'Logistics and storage', vehicles: 'Vehicle buildings', '': 'Town buildings and other' };
    for (const c of cats) {
      const rows = sites.filter(([, d]) => (d.category || '') === c);
      if (rows.length === 0) continue;
      out.push(`### ${catName[c]} (${rows.length})`);
      out.push('');
      out.push('| Building | T | Cost | Needs | Takes in | Makes | By-product |');
      out.push('|---|---|---|---|---|---|---|');
      for (const [, d] of rows.sort((a, b) => a[1].tier - b[1].tier || a[1].label.localeCompare(b[1].label))) {
        let takes = '-';
        let makes = '-';
        let by = '-';
        if (d.produce) {
          makes = label(d.produce.good);
          by = (d.produce.also || []).map((a) => label(a.good)).join(', ') || '-';
        } else if (d.recipe) {
          takes = list(d.recipe.inputs);
          const outs = Object.keys(d.recipe.outputs);
          makes = label(outs[0]);
          by = outs.slice(1).map(label).join(', ') || '-';
        }
        const needs = d.node ? `${d.node} spot` : d.inTown ? 'town plot' : '-';
        out.push(`| ${d.label} | ${tierName(d.tier)} | $${d.cost} | ${needs} | ${takes} | ${makes} | ${by} |`);
      }
      out.push('');
    }

    out.push('## Planned goods (not in the game yet)');
    out.push('');
    out.push('Placeholders from `src/sim/planned.ts`. Each has a spot waiting for it. Nothing here is built or decided.');
    out.push('');
    out.push('| Good | Kind | $ | Would be made by | From | Note |');
    out.push('|---|---|---|---|---|---|');
    for (const p of pl.PLANNED) {
      out.push(`| ${p.label} | ${p.kind} | ${p.price} | ${p.madeBy} | ${(p.from || []).join(', ') || '-'} | ${p.note || ''} |`);
    }
    out.push('');

    out.push('## Future ideas (not built)');
    out.push('');
    out.push('From [16-future-ledger.md](16-future-ledger.md). Chris wants variety in every family, with realistic ingredients. Nothing here is decided or started.');
    out.push('');
    out.push('| Idea | What | Ledger row |');
    out.push('|---|---|---|');
    for (const [a, b, c] of FUTURE) out.push(`| ${a} | ${b} | ${c} |`);
    out.push('');

    fs.writeFileSync(path.join(root, 'docs', '08-goods-and-sites.md'), out.join('\n'));
    // Optional: GOODS_JSON=path also writes the same data as JSON, for an interactive viewer.
    if (process.env.GOODS_JSON) {
      const gl = (g) => label(g);
      const data = {
        groups: pl.GROUPS,
        goods: inGame.map((e) => ({ id: e.id, label: e.label, kind: e.kind, price: e.price, groups: e.groups || [], depth: e.depth, marketLevel: e.marketLevel, forBuilding: e.forBuilding, madeBy: e.madeBy.map((m) => ({ site: m.site, label: m.label, tier: m.tier, byProduct: m.byProduct, inputs: m.inputs.map(gl) })), usedBy: e.usedBy.map((u) => ({ site: u.site, label: u.label, makes: u.makes.map(gl) })) })),
        sites: sites.map(([kind, d]) => ({ kind, label: d.label, blurb: d.blurb, category: d.category || '', tier: d.tier, cost: d.cost, node: d.node || '', inTown: !!d.inTown, takes: d.recipe ? Object.keys(d.recipe.inputs).map(gl) : [], makes: d.produce ? [gl(d.produce.good)] : d.recipe ? Object.keys(d.recipe.outputs).slice(0, 1).map(gl) : [], by: d.produce ? (d.produce.also || []).map((a) => gl(a.good)) : d.recipe ? Object.keys(d.recipe.outputs).slice(1).map(gl) : [] })),
        planned: pl.PLANNED.map((p) => ({ id: p.id, label: p.label, kind: p.kind, price: p.price, groups: p.groups, madeBy: p.madeBy, from: p.from || [], note: p.note || '' })),
        future: FUTURE.map(([idea, what, row]) => ({ idea, what, row })),
      };
      fs.writeFileSync(process.env.GOODS_JSON, JSON.stringify(data));
    }
    console.log(`wrote docs/08-goods-and-sites.md: ${inGame.length} goods, ${sites.length} buildings, ${pl.PLANNED.length} planned`);
  } finally {
    await server.close();
  }
})();
