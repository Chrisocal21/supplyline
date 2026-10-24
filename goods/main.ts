// The goods page: every good, A to Z or from raw to built, made from the game's own definitions, plus placeholders for goods that are
// planned but not in the game yet.
import { catalog, catalogGaps, type GoodEntry } from '../src/sim/catalog';
import { GOODS, type Good } from '../src/sim/defs';
import { GROUPS, type GoodGroup } from '../src/sim/planned';
import { VERSION } from '../src/version';

const all = catalog();
const byId = new Map(all.map((e) => [e.id, e]));
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
const link = (id: string): string => `<a href="#g-${id}">${esc(byId.get(id)?.label ?? id)}</a>${byId.get(id)?.planned ? ' <span class="tag">not in game</span>' : ''}`;
const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0');
const KIND: Record<GoodEntry['kind'], string> = { raw: 'Raw', material: 'Material', product: 'Product', byproduct: 'By-product' };
const KIND_ORDER: GoodEntry['kind'][] = ['raw', 'material', 'product', 'byproduct'];
const TIER_NAME = ['Start', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];
const colorOf = (e: GoodEntry): string => (e.planned ? '#3a4a60' : hex(GOODS[e.id as Good].color));

$('build').textContent = VERSION;
const gaps = catalogGaps();
const bad = gaps.noMaker.length + gaps.noUse.length;
const inGame = all.filter((e) => !e.planned).length;
const gapEl = $('gaps');
gapEl.className = `check ${bad ? 'bad' : 'ok'}`;
gapEl.textContent = bad
  ? `Gaps: ${gaps.noMaker.map((g) => `${byId.get(g)?.label} has no maker`).concat(gaps.noUse.map((g) => `${byId.get(g)?.label} has no use`)).join('; ')}`
  : `${inGame} goods in the game: every one has a maker and a use. ${all.length - inGame} more are planned.`;

/** Everything on a good's card that can be searched. */
const haystack = (e: GoodEntry): string => `${e.label} ${KIND[e.kind]} ${e.madeBy.map((m) => m.label).join(' ')} ${e.usedBy.map((u) => u.label).join(' ')} ${e.note ?? ''}`.toLowerCase();

function card(e: GoodEntry): string {
  const made = e.madeBy
    .map((m) => {
      const from = m.inputs.length ? ` from ${m.inputs.map(link).join(', ')}` : m.node ? ` on a ${esc(m.node)} spot` : e.planned ? '' : ' on open ground';
      const also = m.alsoMakes.length ? ` (with ${m.alsoMakes.map(link).join(', ')})` : '';
      const tier = m.tier >= 0 ? ` <span class="tag">${TIER_NAME[m.tier] ?? `Tier ${m.tier}`}</span>` : '';
      return `${esc(m.label)}${from}${also}${m.byProduct ? ' as a by-product' : ''}${tier}`;
    })
    .join('<br>');
  const uses = e.usedBy.length ? e.usedBy.map((u) => `${esc(u.label)} makes ${u.makes.map(link).join(', ')}${u.planned ? ' (planned)' : ''}`).join('<br>') : '';
  const sold: string[] = [];
  if (e.marketLevel !== null) sold.push(`Markets buy it from town level ${e.marketLevel + 1}`);
  if (e.forBuilding) sold.push('builds and grows towns');
  const end = e.planned
    ? 'to be decided when it is added'
    : sold.length
      ? sold.join('; ')
      : e.usedBy.some((u) => !u.planned)
        ? 'only as an input to other goods'
        : '<span class="none">nothing uses it</span>';
  const groups = e.groups.map((g) => GROUPS.find((x) => x.id === g)?.label ?? g).join(', ');
  return `<div class="card${e.planned ? ' planned' : ''}" id="g-${e.id}">
    <h3><span class="dot" style="background:${colorOf(e)}"></span>${esc(e.label)}${e.planned ? '<span class="badge">Not in game</span>' : ''}</h3>
    <div class="meta"><span class="tag ${e.kind}">${KIND[e.kind]}</span><span>${e.planned ? 'about ' : ''}$${e.price} each</span><span>${e.depth === 0 ? 'from the ground' : `step ${e.depth} from the ground`}</span></div>
    <div class="meta">${esc(groups)}</div>
    ${e.note ? `<div class="row note">${esc(e.note)}</div>` : ''}
    <div class="row"><b>${e.planned ? 'Would be made by' : 'Made by'}</b>${made || '<span class="none">nothing makes it yet</span>'}</div>
    ${uses ? `<div class="row"><b>${e.planned ? 'Would go into' : 'Goes into'}</b>${uses}</div>` : ''}
    <div class="row"><b>Sold to</b>${end}</div>
  </div>`;
}

type Mode = 'az' | 'chain';
type Status = 'all' | 'game' | 'planned';
let mode: Mode = 'az';
let status: Status = 'all';
const groupOn = new Set<GoodGroup>();
const kindOn = new Set<GoodEntry['kind']>();

const chip = (attr: string, id: string, label: string, on: boolean, n: number): string => `<button class="chip${on ? ' on' : ''}" data-${attr}="${id}">${esc(label)} <small>${n}</small></button>`;

function drawChips(base: GoodEntry[]): void {
  // Counts follow the other filters, so a chip never promises goods that the rest of the filters hide.
  const inGroups = (e: GoodEntry): boolean => !groupOn.size || e.groups.some((g) => groupOn.has(g));
  const inKinds = (e: GoodEntry): boolean => !kindOn.size || kindOn.has(e.kind);
  $('groups').innerHTML =
    chip('g', '', 'All kinds of good', groupOn.size === 0, base.filter(inKinds).length) +
    GROUPS.map((g) => chip('g', g.id, g.label, groupOn.has(g.id), base.filter((e) => inKinds(e) && e.groups.includes(g.id)).length)).join('');
  $('kinds').innerHTML =
    chip('k', '', 'Any stage', kindOn.size === 0, base.filter(inGroups).length) +
    KIND_ORDER.map((k) => chip('k', k, KIND[k], kindOn.has(k), base.filter((e) => inGroups(e) && e.kind === k).length)).join('');
}

function render(): void {
  const q = ($('q') as HTMLInputElement).value.trim().toLowerCase();
  const base = all.filter((e) => (status === 'all' || (status === 'planned') === e.planned) && (!q || haystack(e).includes(q)));
  drawChips(base);
  const list = base.filter((e) => (!groupOn.size || e.groups.some((g) => groupOn.has(g))) && (!kindOn.size || kindOn.has(e.kind)));
  $('count').textContent = `${list.length} of ${all.length} goods shown`;
  const out: string[] = [];
  const letters: string[] = [];
  if (mode === 'az') {
    const sorted = [...list].sort((a, b) => a.label.localeCompare(b.label));
    let cur = '';
    for (const e of sorted) {
      const l = e.label[0].toUpperCase();
      if (l !== cur) {
        if (cur) out.push('</div>');
        cur = l;
        letters.push(l);
        out.push(`<h2 class="group" id="L${l}">${l}</h2><div class="cards">`);
      }
      out.push(card(e));
    }
    if (cur) out.push('</div>');
  } else {
    const names = ['Raw materials, from the ground', 'Made from raw goods (step 1)', 'Made from those (step 2)', 'Made from those (step 3)', 'Made from those (step 4)', 'Made from those (step 5 and up)'];
    for (let d = 0; d <= 5; d++) {
      const grp = list.filter((e) => (d === 5 ? e.depth >= 5 : e.depth === d)).sort((a, b) => a.label.localeCompare(b.label));
      if (!grp.length) continue;
      out.push(`<h2 class="group">${names[d]}<small>${grp.length} goods</small></h2><div class="cards">${grp.map(card).join('')}</div>`);
    }
  }
  $('list').innerHTML = out.join('') || '<p class="empty">Nothing matches that.</p>';
  $('letters').innerHTML = letters.map((l) => `<a href="#L${l}">${l}</a>`).join('');
}

const toggle = <T>(set: Set<T>, v: T): void => {
  if (set.has(v)) set.delete(v);
  else set.add(v);
};

$('q').addEventListener('input', render);
$('mode').addEventListener('click', (ev) => {
  const m = (ev.target as HTMLElement).dataset.m as Mode | undefined;
  if (!m) return;
  mode = m;
  for (const b of Array.from($('mode').children)) b.classList.toggle('on', (b as HTMLElement).dataset.m === m);
  render();
});
$('status').addEventListener('click', (ev) => {
  const s = (ev.target as HTMLElement).dataset.s as Status | undefined;
  if (!s) return;
  status = s;
  for (const b of Array.from($('status').children)) b.classList.toggle('on', (b as HTMLElement).dataset.s === s);
  render();
});
$('groups').addEventListener('click', (ev) => {
  const g = (ev.target as HTMLElement).closest('button')?.dataset.g;
  if (g === undefined) return;
  if (g === '') groupOn.clear();
  else toggle(groupOn, g as GoodGroup);
  render();
});
$('kinds').addEventListener('click', (ev) => {
  const k = (ev.target as HTMLElement).closest('button')?.dataset.k;
  if (k === undefined) return;
  if (k === '') kindOn.clear();
  else toggle(kindOn, k as GoodEntry['kind']);
  render();
});
render();
if (location.hash.startsWith('#g-')) document.getElementById(location.hash.slice(1))?.scrollIntoView();
