import { Footer, Nav } from '../parts';

const TABS: [string, string][] = [
  ['/wiki/', 'Overview'],
  ['/wiki/buildings/', 'Buildings'],
  ['/wiki/vehicles/', 'Vehicles'],
  ['/wiki/districts/', 'Districts'],
  ['/wiki/goods/', 'Goods'],
  ['/wiki/gallery/', 'Gallery'],
];

/** Every wiki page: the site bar, the wiki tabs, then the page. */
export function WikiShell({ here, crumbs, title, lead, children }: { here: string; crumbs?: [string, string][]; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <>
      <Nav home={false} />
      <div className="wiki-tabs">
        <div className="wrap">
          {TABS.map(([href, label]) => (
            <a key={href} href={href} className={href === here ? 'on' : ''}>{label}</a>
          ))}
        </div>
      </div>
      <main className="wrap wiki-main">
        {crumbs && crumbs.length > 0 ? (
          <div className="label crumbs-line">
            <a href="/wiki/">Wiki</a>
            {crumbs.map(([href, label]) => (
              <span key={href}> &gt; <a href={href}>{label}</a></span>
            ))}
          </div>
        ) : null}
        <h1 className="wiki-title">{title}</h1>
        {lead ? <p className="wiki-lead">{lead}</p> : null}
        {children}
      </main>
      <Footer />
    </>
  );
}

/** A model picture on the soft panel the wiki gives every model. */
export function Model({ src, alt, size = 'md' }: { src: string; alt: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className={`model model-${size}`}>
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

export function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="fact">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
