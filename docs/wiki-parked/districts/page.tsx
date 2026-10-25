import type { Metadata } from 'next';
import { DISTRICTS, districtImage, money } from '../wiki';
import { WikiShell } from '../parts';
import { Browse, type Item } from '../browse';

export const metadata: Metadata = { title: 'Districts - SupplyLine wiki' };

export default function Districts() {
  const items: Item[] = DISTRICTS.map((d) => ({
    href: `/wiki/districts/${d.id}/`,
    name: d.label,
    sub: `Town level ${d.minLevel} - ${money(d.cost)}`,
    img: districtImage(d, 3),
    group: `Level ${d.minLevel}`,
    text: [d.label, d.blurb, ...d.goods.map((g) => g.label)].join(' ').toLowerCase(),
  }));
  return (
    <WikiShell here="/wiki/districts/" crumbs={[['/wiki/districts/', 'Districts']]} title="Districts" lead="Landmarks a growing town can build. Each lives on the goods it asks for.">
      <Browse items={items} groups={Array.from(new Set(items.map((i) => i.group)))} placeholder="Search districts..." />
    </WikiShell>
  );
}
