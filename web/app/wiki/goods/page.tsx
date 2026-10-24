import type { Metadata } from 'next';
import { GOODS, KIND_NAMES } from '../wiki';
import { WikiShell } from '../parts';
import { Browse, type Item } from '../browse';

export const metadata: Metadata = { title: 'Goods - SupplyLine wiki' };

export default function Goods() {
  const items: Item[] = GOODS.map((g) => ({
    href: `/wiki/goods/${g.id}/`,
    name: g.label,
    sub: `${KIND_NAMES[g.kind] ?? g.kind} - $${g.price} each`,
    group: KIND_NAMES[g.kind] ?? g.kind,
    text: [g.label, g.kind, ...g.madeBy.map((m) => m.label), ...g.usedBy.map((u) => u.label)].join(' ').toLowerCase(),
  }));
  return (
    <WikiShell here="/wiki/goods/" crumbs={[['/wiki/goods/', 'Goods']]} title="Goods" lead={`${GOODS.length} goods. Open one to see what makes it and what uses it.`}>
      <Browse items={items} groups={Array.from(new Set(items.map((i) => i.group)))} placeholder="Search goods or the buildings that make them..." />
    </WikiShell>
  );
}
