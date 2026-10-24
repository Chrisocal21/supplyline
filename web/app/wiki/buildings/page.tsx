import type { Metadata } from 'next';
import { CATEGORY_NAMES, SITES, TIER_NAMES, money, siteImage } from '../wiki';
import { WikiShell } from '../parts';
import { Browse, type Item } from '../browse';

export const metadata: Metadata = { title: 'Buildings - SupplyLine wiki' };

export default function Buildings() {
  const items: Item[] = SITES.map((s) => ({
    href: `/wiki/buildings/${s.kind}/`,
    name: s.label,
    sub: `Tier ${s.tier} - ${money(s.cost)}`,
    img: siteImage(s, 1),
    group: CATEGORY_NAMES[s.category] ?? 'Other',
    text: [s.label, s.blurb, s.produce?.label ?? '', ...s.inputs.map((i) => i.label), ...s.outputs.map((i) => i.label), CATEGORY_NAMES[s.category] ?? '', TIER_NAMES[s.tier] ?? ''].join(' ').toLowerCase(),
  }));
  const groups = Array.from(new Set(items.map((i) => i.group)));
  return (
    <WikiShell here="/wiki/buildings/" crumbs={[['/wiki/buildings/', 'Buildings']]} title="Buildings" lead={`${SITES.length} buildings. Search by name, or by what they make and use.`}>
      <Browse items={items} groups={groups} placeholder="Search buildings, goods, tiers..." />
    </WikiShell>
  );
}
