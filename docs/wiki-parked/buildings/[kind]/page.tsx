import type { Metadata } from 'next';
import { CATEGORY_NAMES, GOODS, SITES, TIER_NAMES, levelsOf, money, siteByKind, siteImage } from '../../wiki';
import { Fact, Model, WikiShell } from '../../parts';

export function generateStaticParams() {
  return SITES.map((s) => ({ kind: s.kind }));
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  const s = siteByKind(kind);
  return { title: `${s?.label ?? 'Building'} - SupplyLine wiki`, description: s?.blurb };
}

export default async function Building({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const s = siteByKind(kind)!;
  const levels = levelsOf(s);
  const goodLink = (id: string, label: string) => <a key={id} href={`/wiki/goods/${id}/`}>{label}</a>;
  const list = (items: React.ReactNode[]) => items.reduce<React.ReactNode[]>((acc, x, i) => (i ? [...acc, ', ', x] : [x]), []);
  const makes = s.produce
    ? [goodLink(s.produce.good, s.produce.label), ...s.produce.also.map((a) => goodLink(a.good, `${a.label} (by-product)`))]
    : s.outputs.map((o, i) => goodLink(o.good, `${o.n} ${o.label}${i > 0 ? ' (by-product)' : ''}`));
  const uses = s.inputs.map((o) => goodLink(o.good, `${o.n} ${o.label}`));
  const where = s.node ? `On a free ${s.node} spot` : s.inTown ? 'On a free plot in a town' : s.dock ? 'Made by the town itself' : 'On open ground';
  const related = GOODS.filter((g) => g.madeBy.some((m) => m.site === s.kind) || g.usedBy.some((u) => u.site === s.kind)).slice(0, 8);
  return (
    <WikiShell here="/wiki/buildings/" crumbs={[['/wiki/buildings/', 'Buildings'], [`/wiki/buildings/${s.kind}/`, s.label]]} title={s.label} lead={s.blurb}>
      <div className="detail">
        <div>
          <div className="levels">
            {levels.map((l) => (
              <figure key={l}>
                <Model src={siteImage(s, l)} alt={`${s.label}, level ${l}`} size={levels.length > 1 ? 'md' : 'lg'} />
                <figcaption>{levels.length > 1 ? `Level ${l}` : s.label}</figcaption>
              </figure>
            ))}
          </div>
          {s.real ? <p className="wiki-note">In real life: {s.real}</p> : null}
        </div>
        <aside className="panel">
          <dl className="facts-list">
            <Fact k="Type" v={CATEGORY_NAMES[s.category] ?? 'Building'} />
            <Fact k="Unlocks at" v={`Tier ${s.tier}, ${TIER_NAMES[s.tier] ?? ''}`} />
            <Fact k="Cost" v={money(s.cost)} />
            <Fact k="Where" v={where} />
            {makes.length ? <Fact k="Makes" v={list(makes)} /> : null}
            {uses.length ? <Fact k="Uses" v={list(uses)} /> : null}
            <Fact k="Levels" v={`Up to ${s.maxLevel}`} />
          </dl>
        </aside>
      </div>
      {related.length ? (
        <>
          <h2 className="wiki-h2">Goods it touches</h2>
          <div className="pills">
            {related.map((g) => <a key={g.id} href={`/wiki/goods/${g.id}/`}>{g.label}</a>)}
          </div>
        </>
      ) : null}
    </WikiShell>
  );
}
