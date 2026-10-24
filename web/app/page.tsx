import { BUILD, COMPARE, FAQ, FEATURES, LINKS, MAPS, NEWS, ROADMAP, SHOTS, STATS, STEPS, TIERS } from './content';
import { Footer, Head, LinkButton, Nav } from './parts';

export default function Home() {
  return (
    <>
      <Nav home />
      <header className="hero">
        <div className="hero-bg" />
        <div className="wrap">
          <span className="chip">In development</span>
          <h1>SUPPLY<span>LINE</span></h1>
          <p className="tag">Build farms, forests and factories on a 3D globe. Then move the goods by truck, train, ship and plane.</p>
          <div className="btn-row">
            <LinkButton primary href={LINKS.demo} label="Download the free demo" note="For Windows, free" soon="For Windows, coming soon" />
            <LinkButton href={LINKS.steam} label="Wishlist on Steam" note="Wishlist now" soon="Coming soon" />
          </div>
          <p className="build-line">Current build <b>{BUILD}</b>. The free demo covers Tiers 0 and 1 on Map 1. It changes often, and saves may not carry over.</p>
        </div>
      </header>

      <main>
        <section className="section" id="game">
          <div className="wrap">
            <Head kicker="The game" title="Feed the world">
              Towns need goods. You grow the food, cut the wood and dig the stone, then deliver it. Fill the towns&apos; shelves and they grow.
            </Head>
            <div className="grid c3">
              {FEATURES.map((f) => (
                <div className="panel bar" key={f.tag}>
                  <div className="label accent">{f.tag}</div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              ))}
            </div>
            <div className="stats">
              {STATS.map((s) => (
                <div className="stat" key={s.label}><b>{s.n}</b><span>{s.label}</span></div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="shots">
          <div className="wrap">
            <Head kicker="Screenshots" title="A whole world to build on" />
            <div className="shots">
              {SHOTS.map((s) => (
                <figure className="shot" key={s.src}>
                  <img src={s.src} alt={s.alt} loading="lazy" />
                  <figcaption>{s.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="play">
          <div className="wrap split">
            <div>
              <Head kicker="How it plays" title="Your first ten minutes">A little guide shows you around. These are the steps.</Head>
              <ol className="steps">
                {STEPS.map((s) => (
                  <li key={s.title}><div><b>{s.title}</b><span>{s.body}</span></div></li>
                ))}
              </ol>
            </div>
            <div>
              <Head kicker="Progress" title="Five tiers">Each tier opens new buildings and bigger goals. The free demo covers Tiers 0 and 1.</Head>
              <div className="grid" style={{ gap: 10 }}>
                {TIERS.map((t) => (
                  <div className={`rung${t.demo ? '' : ' off'}${t.edge ? ' edge' : ''}`} key={t.tier}>
                    <small>{t.tier}</small>
                    <b>{t.name}</b>
                    <span>{t.body}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="demo">
          <div className="wrap">
            <Head kicker="Free demo" title="Try it, then take it further">The demo is a real slice of the game. When you reach Tier 2 it ends, and your save carries over.</Head>
            <table className="compare">
              <thead>
                <tr><th></th><th className="demo">Free demo</th><th>Full game</th></tr>
              </thead>
              <tbody>
                {COMPARE.map((c) => (
                  <tr key={c.what}><th>{c.what}</th><td className="demo">{c.demo}</td><td className="full">{c.full}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="btn-row" style={{ marginTop: 20 }}>
              <LinkButton primary href={LINKS.demo} label="Download the free demo" note="For Windows, free" soon="For Windows, coming soon" />
              <a className="btn" href="/steam/">See the store page<small>A preview</small></a>
            </div>
          </div>
        </section>

        <section className="section" id="maps">
          <div className="wrap">
            <Head kicker="Maps" title="Three worlds to play">Each map is shown flat here. In the game it wraps round a globe.</Head>
            <div className="maps">
              {MAPS.map((m) => (
                <article className="map" key={m.n}>
                  <img src={m.img} alt={`Map ${m.n}, ${m.name}, seen flat`} loading="lazy" />
                  <div className="map-body">
                    <span className={`pill ${m.tone}`}>{m.status}</span>
                    <h3>Map {m.n}: {m.name}</h3>
                    <p><b>{m.lead}</b> {m.body}</p>
                    <ul className="pills">{m.facts.map((f) => <li key={f}>{f}</li>)}</ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="artists">
          <div className="wrap">
            <div className="panel gold hire">
              <div className="label accent">Artwork overhaul</div>
              <h2>We are looking for 3D artists</h2>
              <p>The game you see today uses stand-in models while the rules and the world are built. A full overhaul of the artwork is coming, and we want artists to help make it look right.</p>
              <ul>
                <li>Buildings, vehicles, town pieces and props, low to mid poly, built for a world seen from far out and from the street.</li>
                <li>A consistent look across hundreds of pieces.</li>
                <li>Paid work, scoped by piece. Show us what you have made.</li>
              </ul>
              <div className="btn-row" style={{ marginTop: 18 }}>
                <a className="btn primary" href={LINKS.studio} rel="noopener">Get in touch<small>Through Probably Fine Studios</small></a>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="roadmap">
          <div className="wrap">
            <Head kicker="Roadmap" title="The road ahead">Where we have been, where we are, and where we are going.</Head>
            <ol className="trail">
              {ROADMAP.map((r) => (
                <li className={r.state} key={r.title}>
                  <h3>{r.title} <span className={`pill ${r.state === 'done' ? 'good' : r.state === 'now' ? 'accent' : ''}`}>{r.state === 'done' ? 'Done' : r.state === 'now' ? 'Now' : 'Next'}</span></h3>
                  <p>{r.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section" id="news">
          <div className="wrap">
            <Head kicker="Updates" title="What is new" />
            <div className="log">
              {NEWS.map((n) => (
                <div className="panel bar" key={n.v}>
                  <div className="label">{n.v}</div>
                  <h3>{n.title}</h3>
                  <ul>{n.items.map((i) => <li key={i}>{i}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="wrap">
            <Head kicker="Questions" title="Quick answers" />
            {FAQ.map((f) => (
              <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
