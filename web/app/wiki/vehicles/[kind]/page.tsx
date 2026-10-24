import type { Metadata } from 'next';
import { MODE_NAMES, TIER_NAMES, VEHICLES, money, vehicleImage } from '../../wiki';
import { Fact, Model, WikiShell } from '../../parts';

export function generateStaticParams() {
  return VEHICLES.map((v) => ({ kind: v.kind }));
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  const v = VEHICLES.find((x) => x.kind === kind);
  return { title: `${v?.label ?? 'Vehicle'} - SupplyLine wiki`, description: v?.blurb };
}

export default async function Vehicle({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const v = VEHICLES.find((x) => x.kind === kind)!;
  const next = VEHICLES.find((x) => x.kind === v.next);
  return (
    <WikiShell here="/wiki/vehicles/" crumbs={[['/wiki/vehicles/', 'Vehicles'], [`/wiki/vehicles/${v.kind}/`, v.label]]} title={v.label} lead={v.blurb}>
      <div className="detail">
        <Model src={vehicleImage(v)} alt={v.label} size="lg" />
        <aside className="panel">
          <dl className="facts-list">
            <Fact k="Runs on" v={MODE_NAMES[v.mode] ?? v.mode} />
            <Fact k="Unlocks at" v={`Tier ${v.tier}, ${TIER_NAMES[v.tier] ?? ''}`} />
            <Fact k="Cost" v={money(v.cost)} />
            <Fact k="Carries" v={v.capacity ? `${v.capacity} units` : 'Catches fish'} />
            <Fact k="Building level" v={`Level ${v.needLevel} or more`} />
            {v.reach ? <Fact k="Road reach" v={`${v.reach.toLocaleString('en-US')} tiles for a rookie driver, more for a veteran`} /> : null}
            {next ? <Fact k="Trades up to" v={<a href={`/wiki/vehicles/${next.kind}/`}>{next.label}</a>} /> : null}
          </dl>
        </aside>
      </div>
    </WikiShell>
  );
}
