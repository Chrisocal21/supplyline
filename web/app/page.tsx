import { BUILD, DEMO_POINTS, DEMO_TIERS, FAQ, LINKS, MAPS, NEWS, PILLARS, ROADMAP, SHOTS, STUDIO, TAGLINE, TIERS } from './content';
import { Footer, LinkButton, Nav } from './parts';
import { GOODS, SITES, VEHICLES, siteByKind, siteImage, vehicleImage } from './wiki/wiki';

/** Models shown on the home page, each linking to its wiki page. */
const SHOWCASE: [string, string, string][] = [
  ...(['forestry', 'sawmill', 'steelworks', 'port'] as const).flatMap((k): [string, string, string][] => {
    const s = siteByKind(k);
    return s ? [[siteImage(s, 3), s.label, `/wiki/buildings/${k}/`]] : [];
  }),
  ...(['rig', 'heavytrain', 'freighter', 'jet'] as const).flatMap((k): [string, string, string][] => {
    const v = VEHICLES.find((x) => x.kind === k);
    return v ? [[vehicleImage(v), v.label, `/wiki/vehicles/${k}/`]] : [];
  }),
];

export default function Home() {
  return (
    <>
      <Nav home />
      <header className="hero">
        <div className="hero-bg" />
        <div className="wrap hero-in">
          <span className="chip">In development{BUILD ? ` · Build ${BUILD}` : ''}</span>
          <img className="hero-logo" src="/site/logo-full.jpg" alt="SupplyLine: a globe with a road, a railway and a factory" width={1000} height={1000} />
          <h1><span className="sr">SupplyLine: </span>Feed the world, one truck at a time.</h1>
          <p className="tag">{TAGLINE}</p>
          <div className="btn-row">
            <a className="btn primary" href="#demo">Get the free demo<small>Windows and Mac</small></a>
            <LinkButton href={LINKS.steam} label="Wishlist on Steam" note="Wishlist now" soon="Coming soon" />
          </div>
        </div>
        <div className="stats wrap">
          <div><b>{SITES.length}</b><span>Buildings</span></div>
          <div><b>{GOODS.length}</b><span>Goods</span></div>
          <div><b>{VEHICLES.length}</b><span>Vehicles</span></div>
          <div><b>{MAPS.length}</b><span>Maps</span></div>
        </div>
      </header>

      <main>
        <section className="section" id="game">
          <div className="wrap pillars">
            {PILLARS.map((p, i) => (
              <article className={`pillar${i % 2 ? ' flip' : ''}`} key={p.tag}>
                <div className="pillar-img"><img src={p.img} alt={p.alt} loading="lazy" /></div>
                <div className="pillar-text">
                  <div className="kicker"><span>{p.n}</span>{p.tag}</div>
                  <h2>{p.title}</h2>
                  <p>{p.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="studio">
          <div className="wrap studio">
            <div>
              <div className="kicker">The honest bit</div>
              <h2>Hi. We are <a href={LINKS.studio} rel="noopener">Probably Fine Studios</a>.</h2>
              {STUDIO.body.map((b) => <p key={b}>{b}</p>)}
            </div>
            <aside className="report">
              <div className="report-head"><span>Studio status report</span><span>Form PF-1</span></div>
              <dl>
                {STUDIO.report.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
              <div className="stamp">Probably fine</div>
            </aside>
          </div>
        </section>

        <section className="section showcase" id="models">
          <div className="wrap">
            <div className="head-row">
              <div>
                <div className="kicker">The wiki</div>
                <h2>Every building and vehicle, up close</h2>
              </div>
              <a className="btn" href="/wiki/">Open the wiki</a>
            </div>
            <div className="models">
              {SHOWCASE.map(([src, label, href]) => (
                <a key={href} href={href} className="model-card">
                  <img src={src} alt={label} loading="lazy" />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="shots">
          <div className="wrap">
            <div className="kicker">Screenshots</div>
            <h2 className="h2">A whole world to build on</h2>
            <div className="shots">
              {SHOTS.map((s) => (
                <a className="shot" key={s.src} href={s.src} target="_blank" rel="noopener">
                  <img src={s.src} alt={s.alt} loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="maps">
          <div className="wrap">
            <div className="kicker">Maps</div>
            <h2 className="h2">Three worlds, wrapped round a globe</h2>
            <div className="maps">
              {MAPS.map((m) => (
                <article className="map" key={m.n}>
                  <img src={m.img} alt={`Map ${m.n}, ${m.name}, seen flat`} loading="lazy" />
                  <div className="map-body">
                    <span className={`pill${m.n === 1 ? ' accent' : ''}`}>{m.status}</span>
                    <h3><small>Map {m.n}</small>{m.name}</h3>
                    <p>{m.body}</p>
                    <span className="map-fact">{m.facts.join(' · ')}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="demo">
          <div className="wrap">
            <div className="demo-band">
              <div>
                <div className="kicker">Free demo</div>
                <h2>Play the first two tiers free</h2>
                <ul className="ticks">{DEMO_POINTS.map((d) => <li key={d}>{d}</li>)}</ul>
                <div className="btn-row">
                  <LinkButton primary href={LINKS.demo} label="Windows" note="Windows 10 or 11" soon="Coming soon" />
                  <LinkButton href={LINKS.demoMacArm} label="Mac" note="Apple silicon (M1 and later)" soon="Coming soon" />
                  <LinkButton href={LINKS.demoMacIntel} label="Intel Mac" note="Older Macs" soon="Coming soon" />
                </div>
                <p className="demo-note">First time on Windows, if it warns: More info, then Run anyway. On a Mac: System Settings, Privacy and Security, then Open Anyway.</p>
              </div>
              <ol className="tiers">
                {TIERS.map((t, i) => (
                  <li key={t} className={i < DEMO_TIERS ? 'on' : ''}>
                    <small>Tier {i}</small>
                    <b>{t}</b>
                    <span>{i < DEMO_TIERS ? 'Demo' : 'Full game'}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="section" id="news">
          <div className="wrap devlog">
            <div>
              <div className="kicker">Updates</div>
              <h2 className="h2">What is new</h2>
              {NEWS.map((n, i) => (
                <details className="update" key={n.v} open={i === 0}>
                  <summary><span className="ver">{n.v}</span>{n.title}</summary>
                  <ul>{n.items.map((x) => <li key={x}>{x}</li>)}</ul>
                </details>
              ))}
            </div>
            <div>
              <div className="kicker">Roadmap</div>
              <h2 className="h2">Where it is going</h2>
              <div className="road">
                <h3><span className="dot now" />Now</h3>
                <ul>{ROADMAP.now.map((r) => <li key={r}>{r}</li>)}</ul>
                <h3><span className="dot" />Next</h3>
                <ul>{ROADMAP.next.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="wrap faq">
            <div>
              <div className="kicker">Questions</div>
              <h2 className="h2">Quick answers</h2>
            </div>
            <div>
              {FAQ.map((f) => (
                <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="artists">
              <div>
                <div className="kicker">Artists wanted. Badly.</div>
                <h2>Can you make a barn look like a barn?</h2>
                <p>We have the logic, the spreadsheets and plenty of opinions. We need someone who can make buildings, vehicles and town pieces, low to mid poly, in one style. It is paid work, and you would be replacing the AI.</p>
              </div>
              <a className="btn primary" href={LINKS.studio} rel="noopener">Get in touch</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
