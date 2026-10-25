import type { Metadata } from 'next';
import { MODE_NAMES, VEHICLES, money, vehicleImage } from '../wiki';
import { WikiShell } from '../parts';
import { Browse, type Item } from '../browse';

export const metadata: Metadata = { title: 'Vehicles - SupplyLine wiki' };

export default function Vehicles() {
  const items: Item[] = VEHICLES.map((v) => ({
    href: `/wiki/vehicles/${v.kind}/`,
    name: v.label,
    sub: `${MODE_NAMES[v.mode] ?? v.mode} - Tier ${v.tier} - ${money(v.cost)}`,
    img: vehicleImage(v),
    group: MODE_NAMES[v.mode] ?? v.mode,
    text: [v.label, v.blurb, v.mode].join(' ').toLowerCase(),
  }));
  return (
    <WikiShell here="/wiki/vehicles/" crumbs={[['/wiki/vehicles/', 'Vehicles']]} title="Vehicles" lead="Trucks, trains, ships and planes. Each is bought at a building and works for it.">
      <Browse items={items} groups={Array.from(new Set(items.map((i) => i.group)))} placeholder="Search vehicles..." />
    </WikiShell>
  );
}
