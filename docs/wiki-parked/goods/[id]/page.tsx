import type { Metadata } from 'next';
import { GOODS, KIND_NAMES, siteByKind, siteImage } from '../../wiki';
import { Fact, WikiShell } from '../../parts';

export function generateStaticParams() {
  return GOODS.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${GOODS.find((x) => x.id === id)?.label ?? 'Good'} - SupplyLine wiki` };
}

export default async function GoodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = GOODS.find((x) => x.id === id)!;
  const card = (kind: string, label: string, note?: string) => {
    const s = siteByKind(kind);
    return (
      <a className="card-link" key={kind + label} href={`/wiki/buildings/${kind}/`}>
        {s ? <div className="thumb"><img src={siteImage(s, 1)} alt="" loading="lazy" /></div> : null}
        <div className="card-text"><b>{label}</b>{note ? <span>{note}</span> : null}</div>
      </a>
    );
  };
  return (
    <WikiShell here="/wiki/goods/" crumbs={[['/wiki/goods/', 'Goods'], [`/wiki/goods/${g.id}/`, g.label]]} title={g.label} lead={`${KIND_NAMES[g.kind] ?? g.kind}. Sells for about $${g.price} a unit.`}>
      <dl className="facts-list panel" style={{ maxWidth: 560 }}>
        <Fact k="Kind" v={KIND_NAMES[g.kind] ?? g.kind} />
        <Fact k="Price" v={`$${g.price} a unit`} />
        <Fact k="From the ground" v={g.depth <= 0 ? 'Raw: it comes straight from the land' : `${g.depth} steps of making`} />
        {g.marketLevel ? <Fact k="A Market buys it" v={`From town level ${g.marketLevel}`} /> : null}
        {g.forBuilding ? <Fact k="Also used to" v="Build and grow towns" /> : null}
      </dl>
      <h2 className="wiki-h2">Made by</h2>
      {g.madeBy.length ? <div className="cards">{g.madeBy.map((m) => card(m.site, m.label, m.byProduct ? 'As a by-product' : undefined))}</div> : <p className="wiki-note">Nothing makes it yet.</p>}
      <h2 className="wiki-h2">Used by</h2>
      {g.usedBy.length ? <div className="cards">{g.usedBy.map((u) => card(u.site, u.label))}</div> : <p className="wiki-note">It is only sold.</p>}
    </WikiShell>
  );
}
