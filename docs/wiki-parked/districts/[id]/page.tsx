import type { Metadata } from 'next';
import { DISTRICTS, districtImage, money } from '../../wiki';
import { Fact, Model, WikiShell } from '../../parts';

export function generateStaticParams() {
  return DISTRICTS.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const d = DISTRICTS.find((x) => x.id === id);
  return { title: `${d?.label ?? 'District'} - SupplyLine wiki`, description: d?.blurb };
}

export default async function District({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = DISTRICTS.find((x) => x.id === id)!;
  return (
    <WikiShell here="/wiki/districts/" crumbs={[['/wiki/districts/', 'Districts'], [`/wiki/districts/${d.id}/`, d.label]]} title={d.label} lead={d.blurb}>
      <div className="detail">
        <div className="levels">
          {[1, 2, 3].map((l) => (
            <figure key={l}>
              <Model src={districtImage(d, l)} alt={`${d.label}, level ${l}`} size="md" />
              <figcaption>Level {l}</figcaption>
            </figure>
          ))}
        </div>
        <aside className="panel">
          <dl className="facts-list">
            <Fact k="Opens at" v={`Town level ${d.minLevel}`} />
            <Fact k="Cost" v={money(d.cost)} />
            {d.revenue ? <Fact k="Income" v={`About ${money(d.revenue)} a minute at level 1, while its goods are in stock`} /> : null}
            {d.effect ? <Fact k="Effect" v={d.effect === 'storage' ? 'Docks hold more' : d.effect === 'growth' ? 'The town grows faster' : 'Brings visitors'} /> : null}
            {d.goods.length ? <Fact k="Lives on" v={d.goods.map((g, i) => <span key={g.good}>{i ? ', ' : ''}<a href={`/wiki/goods/${g.good}/`}>{g.label}</a></span>)} /> : null}
          </dl>
        </aside>
      </div>
    </WikiShell>
  );
}
