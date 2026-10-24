// The goods page: every good, A to Z or from raw to built, made from the game's own definitions.
import { catalog, catalogGaps, type GoodEntry } from '../src/sim/catalog';
import { GOODS, type Good } from '../src/sim/defs';
import { VERSION } from '../src/version';

const all = catalog();
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
const link = (g: Good): string => `<a href="#g-${g}">${esc(GOODS[g].label)}</a>`;
const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0');
const KIND: Record<GoodEntry['kind'], string> = { raw: 'Raw', material: 'Material', product: 'Product', byproduct: 'By-product' };
const TIER_NAME = ['Start', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];

$('build').textContent = VERSION;
const gaps = catalogGaps();
const bad = gaps.noMaker.length + gaps.noUse.length;
const gapEl = $('gaps');
gapEl.className = `check ${bad ? 'bad' : 'ok'}`;
gapEl.textContent = bad
  ? `Gaps: ${gaps.noMaker.map((g) => `${GOODS[g].label} has no maker`).concat(gaps.noUse.map((g) => `${GOODS[g].label} has no use`)).join('; ')}`
  : `${all.length} goods: every one has a maker and a use`;

/** Everything on a good's card that can be searched. */
const haystack = (e: GoodEntry): string => `${e.label} ${KIND[e.kind]} ${e.madeBy.map((m) => m.label).join(' ')} ${e.usedBy.map((u) => u.label).join(' ')}`.toLowerCase();

function card(e: GoodEntry): string {
  const made = e.madeBy.length
    ? e.madeBy
        .map((m) => {
          const from = m.inputs.length ? ` from ${m.inputs.map(link).join(', ')}` : m.node ? ` on a ${esc(m.node)} spot` : ' on open ground';
          const also = m.alsoMakes.length ? ` (with ${m.alsoMakes.map(link).join(', ')})` : '';
          return `${esc(m.label)}${from}${also}${m.byProduct ? ' as a by-product' : ''} <span class="tag">${TIER_NAME[m.tier] ?? `Tier ${m.tier}`}</span>`;
        })
        .join('<br>')
    : '<span class="none">nothing makes it yet</span>';
  const uses = e.usedBy.length ? e.usedBy.map((u) => `${esc(u.label)} makes ${u.makes.map(link).join(', ')}`).join('<br>') : '';
  const sold: string[] = [];
  if (e.marketLevel !== null) sold.push(`Markets buy it from town level ${e.marketLevel + 1}`);
  if (e.forBuilding) sold.push('builds and grows towns');
  const end = sold.length ? sold.join('; ') : e.usedBy.length ? 'only as an input to other goods' : '<span class="none">nothing uses it</span>';
  return `<div class="card" id="g-${e.id}">
    <h3><span class="dot" style="background:${hex(GOODS[e.id].color)}"></span>${esc(e.label)}</h3>
    <div class="meta"><span class="tag ${e.kind}">${KIND[e.kind]}</span><span>$${e.price} each</span><span>${e.depth === 0 ? 'from the ground' : `step ${e.depth} from the ground`}</span></div>
    <div class="row"><b>Made by</b>${made}</div>
    ${uses ? `<div class="row"><b>Goes into</b>${uses}</div>` : ''}
    <div class="row"><b>Sold to</b>${end}</div>
  </div>`;
}

let mode: 'az' | 'chain' = 'az';

function render(): void {
  const q = ($('q') as HTMLInputElement).value.trim().toLowerCase();
  const list = all.filter((e) => !q || haystack(e).includes(q));
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

$('q').addEventListener('input', render);
$('mode').addEventListener('click', (ev) => {
  const m = (ev.target as HTMLElement).dataset.m as 'az' | 'chain' | undefined;
  if (!m) return;
  mode = m;
  for (const b of Array.from($('mode').children)) b.classList.toggle('on', (b as HTMLElement).dataset.m === m);
  render();
});
render();
if (location.hash.startsWith('#g-')) document.getElementById(location.hash.slice(1))?.scrollIntoView();
