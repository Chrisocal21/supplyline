// Why a building is stuck, in plain words, and the one thing to do about it. The menus, the Production list and the
// top box all read this, so they never disagree. Plain rules over the world; the UI draws the buttons.
import { GOODS, GOOD_LIST, SITE_DEFS, vehicleLabel, type Good, type VehicleKind } from './defs';
import { bodyForLine, buyError, buyOptions, buyersFor, fleetOf, hasByLine, lineGoods, produces, siteCap, stockOf, upgradeError, wants, type Line, type Site, type World } from './world';

export type Fix =
  | { kind: 'start' }
  | { kind: 'buy'; vehicle: VehicleKind; line?: Line }
  | { kind: 'road'; to: number }
  | { kind: 'sell'; to: number; line?: Line }
  | { kind: 'upgrade' };

export interface Diagnosis {
  /** ok: nothing wrong. warn: stuck, and you can fix it. bad: losing goods right now. */
  level: 'ok' | 'warn' | 'bad';
  text: string;
  fix?: Fix;
}

const ok = (text: string): Diagnosis => ({ level: 'ok', text });

/** What is going on at a building and, if it is stuck, why and what to do. */
export function diagnose(world: World, s: Site, line: Line = 'main'): Diagnosis {
  const def = SITE_DEFS[s.kind];
  if (def.dock || def.station) return ok('');
  const terminal = !!(def.railyard || def.port || def.airport);
  const goods = lineGoods(s, line);
  const main = goods[0] ?? null;
  const word = main ? GOODS[main].label.toLowerCase() : 'goods';
  const cap = siteCap(world, s);
  const held = def.hub ? GOOD_LIST.reduce((n, g) => n + stockOf(s, g), 0) : 0;
  const shelfFull = def.hub && GOOD_LIST.some((g) => stockOf(s, g) / Math.max(1, cap) >= 0.9);

  // The by-product line only speaks up once there is something on the shelf to move.
  if (line === 'by' && goods.every((g) => stockOf(s, g) / Math.max(1, cap) < 0.4)) return ok('');

  if (line === 'main' && def.recipe && !s.making) return { level: 'warn', text: `Off. Press Start to make ${word}.`, fix: { kind: 'start' } };

  // A warehouse or terminal with nothing to carry yet has no use for a truck.
  const fleet = fleetOf(world, s.id, line);
  const kind = buyOptions(world, s.id)[0];
  if (fleet.length === 0 && kind && (!def.hub || held > 0)) {
    return { level: 'warn', text: `No ${vehicleLabel(kind, bodyForLine(s, line)).toLowerCase()} yet. Buy one to carry your ${def.hub ? 'goods' : word}.`, fix: { kind: 'buy', vehicle: kind, line } };
  }

  const buyers = buyersFor(world, s, 3, line);
  const joined = buyers.filter((b) => b.connected);
  if (joined.length === 0) {
    const far = buyers.find((b) => !b.connected);
    if (far) return { level: 'warn', text: `No road to anyone who buys ${word}. ${far.site.name} would.`, fix: { kind: 'road', to: far.site.id } };
    if (terminal) return { level: 'warn', text: 'Not joined to anything yet. Build a road from town to this terminal, then a line to a terminal in another town.' };
    if (def.hub) return { level: 'warn', text: 'Nothing is joined to this warehouse. Build a road to a market or a factory.' };
    return { level: 'warn', text: `Nobody nearby buys ${word} yet. Towns want more kinds of goods as they grow.` };
  }

  const selling = joined.filter((b) => b.on);
  if (selling.length === 0) {
    const b = joined[0];
    return { level: 'warn', text: `Not selling to anyone. ${b.site.name} is joined to you: tap Sell there.`, fix: { kind: 'sell', to: b.site.id, line } };
  }

  if (line === 'main' && def.recipe) {
    const short = (Object.keys(def.recipe.inputs) as Good[]).find((g) => stockOf(s, g) < (def.recipe!.inputs[g] ?? 0));
    if (short) {
      const supplied = world.sites.some((o) => o.id !== s.id && produces(o).includes(short) && world.routes.some((r) => !r.free && ((r.fromSiteId === o.id && r.toSiteId === s.id) || (r.fromSiteId === s.id && r.toSiteId === o.id))));
      if (!supplied) return { level: 'warn', text: `Out of ${GOODS[short].label.toLowerCase()}. Build a road from something that makes it, or put a Warehouse next to this factory.` };
      return { level: 'warn', text: `Waiting for ${GOODS[short].label.toLowerCase()}. It is on its way: check the trucks that bring it.` };
    }
  }

  // A terminal full of goods and no line to carry them is the classic stall.
  if (terminal && held > 0) {
    const mode = def.railyard ? 'rail' : def.port ? 'sea' : 'air';
    if (!world.routes.some((r) => !r.free && r.mode === mode && (r.fromSiteId === s.id || r.toSiteId === s.id))) {
      return { level: 'warn', text: `Goods are waiting here but no ${mode === 'rail' ? 'train line' : mode === 'sea' ? 'sea route' : 'flight'} leaves. Join this terminal to one in another town.` };
    }
  }

  const buyersFull = selling.every((b) => b.goods.every((g) => !wants(world, b.site).includes(g) || stockOf(b.site, g) / Math.max(1, siteCap(world, b.site)) >= 0.99));
  const pct = main ? Math.round((stockOf(s, main) / Math.max(1, cap)) * 100) : 0;
  const piling = def.hub ? shelfFull : pct >= 80;
  if (buyersFull) {
    const far = buyers.find((b) => !b.connected);
    if (far) return { level: 'warn', text: `Buyers are full${piling ? `, storage ${pct}% full` : ''}. Sell to another town: ${far.site.name} would buy ${word}.`, fix: { kind: 'road', to: far.site.id } };
    if (!def.hub) return { level: piling ? 'bad' : 'warn', text: `Buyers are full${piling ? `, storage ${pct}% full` : ''}. Build a Warehouse nearby to hold the extra, then send it to another town.` };
    return { level: shelfFull ? 'bad' : 'warn', text: 'Everything you sell to is full. Join this warehouse to a Rail Yard, Port or Airport to ship goods to another town.' };
  }

  if (piling) {
    if (def.hub) return { level: 'bad', text: 'The shelves are nearly full. Sell to more buyers, or ship goods out through a terminal.' };
    const idle = fleet.filter((v) => v.routeId === 0).length;
    if (fleet.length > 0 && idle === fleet.length) return { level: 'warn', text: 'Your trucks are waiting with no route. Switch a sale on, or check the road is still there.' };
    const more = buyOptions(world, s.id)[0];
    if (more && buyError(world, s.id, more) === null) {
      return { level: 'warn', text: `Goods are piling up (${pct}% full) and ${fleet.length} truck${fleet.length === 1 ? ' is' : 's are'} not keeping up. Build more trucks.`, fix: { kind: 'buy', vehicle: more, line } };
    }
    if (upgradeError(world, s.id) === null) return { level: 'warn', text: `Goods are piling up (${pct}% full). Upgrade for more storage and faster work, or a bigger vehicle.`, fix: { kind: 'upgrade' } };
    return { level: 'warn', text: `Goods are piling up (${pct}% full). ${buyError(world, s.id, more ?? 'boxtruck') ?? 'Add another buyer or a Warehouse.'}` };
  }

  return ok(def.hub && held > 0 ? 'All running. Holding goods for your buyers.' : 'All running.');
}

/** A few words for a crowded list, where the full sentence will not fit. The building's own menu has the whole thing. */
export function shortOf(d: Diagnosis): string {
  const named = /^([A-Z][A-Za-z ]*): (.+)$/.exec(d.text);
  if (named) return `${named[1]}: ${shortOf({ ...d, text: named[2] }).toLowerCase()}`;
  const t = d.text;
  if (t.includes('is piling up and nobody')) return `${t.split(' is piling')[0]}: no buyer`;
  if (d.level === 'ok') return t.startsWith('All running') ? 'Running' : t;
  const starts: [string, string][] = [
    ['Off.', 'Off: press Start'],
    ['No ', t.includes('yet. Buy') ? 'No vehicle: buy one' : t.startsWith('No road') ? 'No road to a buyer' : 'Nobody buys it yet'],
    ['Nobody nearby', 'Nobody buys it yet'],
    ['Not joined', 'Not joined yet'],
    ['Nothing is joined', 'Nothing joined yet'],
    ['Not selling', 'Pick who buys'],
    ['Out of', 'Out of inputs'],
    ['Goods are waiting here', 'Goods waiting: no line out'],
    ['Buyers are full', 'Buyers full'],
    ['Everything you sell', 'Buyers full'],
    ['The shelves', 'Shelves nearly full'],
    ['Your trucks are waiting', 'Trucks have no route'],
    ['Goods are piling', 'Piling up: add trucks'],
  ];
  for (const [p, label] of starts) if (t.startsWith(p)) return label;
  return t;
}

/** The worst thing going on across a building's lines: the main good first, then its by-product, named so it is clear which. */
export function diagnoseAll(world: World, s: Site): Diagnosis {
  const main = diagnose(world, s);
  if (main.level !== 'ok' || !hasByLine(s)) return main;
  const by = diagnose(world, s, 'by');
  if (by.level === 'ok') return main;
  const names = lineGoods(s, 'by').map((g) => GOODS[g].label).join(' and ');
  return { ...by, text: `${names}: ${by.text}` };
}
