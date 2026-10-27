import { BUILD, MAPS, PILLARS, STUDIO } from './content';
import { ContactForm } from './ContactForm';
import { Footer, Nav } from './parts';
import { COUNTS } from './counts';

const LOOP = [
  ['01', 'Find a source', 'Claim a forest, farm, quarry or mine and start the flow of raw materials.'],
  ['02', 'Build the chain', 'Turn raw goods into useful products, then keep every input moving.'],
  ['03', 'Run the network', 'Connect the right places by road, rail, sea and air. Your vehicles do the hauling.'],
  ['04', 'Grow the world', 'Deliver what towns need. A small settlement becomes a larger problem to solve.'],
];

const SYSTEMS = [
  ['A living globe', 'Build across continents, coasts, mountains and islands on a world that wraps around you.'],
  ['Routes that matter', 'Distance, terrain, capacity and running costs shape every connection you make.'],
  ['Production with consequences', 'A chain only works when its inputs, outputs and buyers line up.'],
  ['Towns worth serving', 'Markets, districts and freight yards give each town its own appetite.'],
];

const SHOTS = [
  ['/site/shot-world-startup.png', 'A new world, ready for its first route'],
  ['/site/shot-harbor-objectives.png', 'Harbor objectives open new supply chains'],
  ['/site/shot-home.png', 'A working town and production base'],
  ['/site/shot-river.png', 'Routes crossing a river valley'],
  ['/site/shot-range.png', 'Industry among the mountains'],
];

export default function Home() {
  return (
    <>
      <Nav home />
      <main>
        <header className="site-hero">
          <div className="site-hero-image" />
          <div className="site-hero-grid" />
          <div className="wrap site-hero-content">
            <p className="eyebrow">Production · Logistics · Town growth</p>
            <h1>Make the world <em>move.</em></h1>
            <p className="site-lead">SupplyLine is a production and logistics game on a 3D globe. Build industries, draw the routes between them, and turn scattered towns into a working world.</p>
            <div className="site-actions">
              <a className="site-button primary" href="/access/">Get the tester build <span>Windows and Mac</span></a>
              <a className="site-button" href="/goods/">Explore the goods</a>
            </div>
            <p className="site-status"><span /> In active development{BUILD ? ` · Build ${BUILD}` : ''}</p>
          </div>
          <div className="wrap site-metrics" aria-label="Game at a glance">
            <div><strong>{COUNTS.goods}</strong><span>goods to move</span></div>
            <div><strong>{COUNTS.buildings}</strong><span>buildings and sites</span></div>
            <div><strong>{COUNTS.vehicles}</strong><span>vehicle classes</span></div>
            <div><strong>Map 3</strong><span>current focus</span></div>
          </div>
        </header>

        <section className="site-section intro-section" id="game">
          <div className="wrap">
            <div className="section-heading split-heading">
              <div><p className="eyebrow">The job</p><h2>Every delivery starts somewhere.</h2></div>
              <p>There is no magic conveyor belt. Goods need a source, a destination and a route that makes financial sense. The rest is your network.</p>
            </div>
            <ol className="game-loop">
              {LOOP.map(([n, title, body]) => <li key={n}><span>{n}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}
            </ol>
          </div>
        </section>

        <section className="site-section image-break">
          <div className="wrap image-break-grid">
            <figure className="feature-shot"><img src="/site/shot-home.png" alt="A supply network operating around a town" loading="eager" /></figure>
            <div className="image-break-copy"><p className="eyebrow">A network you can read</p><h2>From the first truck to a regional system.</h2><p>Start with a simple connection. Add processing, storage and bigger vehicles as demand grows. The same network that feeds a hamlet can become the spine of a city.</p><a href="#screens" className="text-link">See the world in motion <span>→</span></a></div>
          </div>
        </section>

        <section className="site-section systems-section">
          <div className="wrap"><div className="section-heading"><p className="eyebrow">Built for logistics people</p><h2>Plan it. Watch it work. Fix what does not.</h2></div>
            <div className="systems-grid">{SYSTEMS.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
          </div>
        </section>

        <section className="site-section screen-section" id="screens">
          <div className="wrap"><div className="section-heading split-heading"><div><p className="eyebrow">In game</p><h2>One world, seen from every scale.</h2></div><p>Zoom from a route across an ocean to the road outside a factory. The screenshots here come from the current playable build.</p></div>
            <div className="screen-grid">{SHOTS.map(([src, alt], index) => <a href={src} target="_blank" rel="noopener" className={`screen screen-${index + 1}`} key={src}><img src={src} alt={alt} loading="lazy" /><span>{alt}</span></a>)}</div>
          </div>
        </section>

        <section className="site-section pillars-section">
          <div className="wrap">{PILLARS.map((p) => <article className="clean-pillar" key={p.tag}><img src={p.img} alt={p.alt} loading="lazy" /><div><p className="eyebrow">{p.n} · {p.tag}</p><h2>{p.title}</h2><p>{p.body}</p></div></article>)}</div>
        </section>

        <section className="site-section world-section" id="maps"><div className="wrap"><div className="section-heading split-heading"><div><p className="eyebrow">The current world</p><h2>Map 3 is where the network grows.</h2></div><p>The Meridian Sea is the active focus: a large connected world of rivers, sea channels, towns and long-haul logistics.</p></div>
          <div className="world-grid">{MAPS.map((m) => <article key={m.n}><img src={m.img} alt={`Map ${m.n}: ${m.name}`} loading="lazy" /><div><span>Map {m.n}</span><h3>{m.name}</h3><p>{m.body}</p><small>{m.facts.join(' · ')}</small></div></article>)}</div>
        </div></section>

        <section className="site-section studio-section" id="studio"><div className="wrap studio-clean"><div><p className="eyebrow">The studio</p><h2>Small team. Large logistics problem.</h2><p>{STUDIO.body[0]}</p><p>The game is being built in public, with a playable tester build and a focus on making the first hour clear, satisfying and worth replaying.</p></div><aside><span>Current focus</span><strong>Make the early game feel great.</strong><p>Tester feedback, performance and the feel of a working production chain come before the next big expansion.</p><a href="/access/" className="text-link">Join the test build <span>→</span></a></aside></div></section>

        <section className="site-section contact-section" id="contact"><div className="wrap contact-clean"><div><p className="eyebrow">Get in touch</p><h2>Have a route in mind?</h2><p>Send a bug, a thought, an art portfolio or a message about the kind of logistics game you want to play.</p></div><ContactForm /></div></section>
      </main>
      <Footer />
    </>
  );
}
