import { BUILD, MAPS } from './content';
import { Footer, Nav } from './parts';
import { COUNTS } from './counts';

const PLAY = [
  ['Claim the ground', 'Forests, fields, mines and towns sit where the world puts them. Start with what is nearby, then reach farther when the easy answers run out.'],
  ['Make the connection', 'A useful factory still needs inputs, buyers, roads and a vehicle that can make the trip. Every link in the chain has a cost.'],
  ['Keep it moving', 'Demand changes as towns grow. Expand a route, add a new supplier or find the one bottleneck slowing the whole network.'],
];

const SHOTS = [
  ['/site/shot-world-startup.png', 'A new world, ready for its first route'],
  ['/site/shot-harbor-objectives.png', 'Harbor objectives open new supply chains'],
  ['/site/shot-home.png', 'A working town and production base'],
  ['/site/shot-river.png', 'Routes crossing a river valley'],
  ['/site/shot-range.png', 'Industry among the mountains'],
];

export default function Home() {
  const map = MAPS[0];
  return (
    <>
      <Nav home />
      <main className="front-page">
        <header className="front-hero">
          <div className="front-hero-image" />
          <div className="front-hero-shade" />
          <div className="front-hero-frame" aria-hidden="true"><span>SL / M3</span><span>PRODUCTION NETWORK</span></div>
          <div className="wrap front-hero-content">
            <p className="front-kicker">Map 3 · The Meridian Sea</p>
            <h1>Build the line<br />that moves the world.</h1>
            <p className="front-lead">A production and logistics game on a living 3D globe. Turn raw land into working industry, then make every road, rail line and shipment count.</p>
            <div className="front-actions">
              <a className="front-primary" href="/access/">Play the tester build <span>Windows and Mac</span></a>
              <a className="front-secondary" href="#screens">Watch the network grow <span>↓</span></a>
            </div>
            <p className="front-build">In active development{BUILD ? ` · Build ${BUILD}` : ''}</p>
            <a className="front-scroll" href="#game">Scroll to enter the network <i /></a>
          </div>
          <div className="wrap front-facts" aria-label="Game at a glance">
            <div><strong>{COUNTS.goods}</strong><span>goods</span></div>
            <div><strong>{COUNTS.buildings}</strong><span>sites</span></div>
            <div><strong>{COUNTS.vehicles}</strong><span>vehicle classes</span></div>
            <div><strong>190</strong><span>towns on Map 3</span></div>
          </div>
        </header>

        <div className="front-ticker" aria-label="Game systems"><div><span>Extract</span><i /> <span>Process</span><i /> <span>Haul</span><i /> <span>Trade</span><i /> <span>Grow</span><i /> <span>Road</span><i /> <span>Rail</span><i /> <span>Sea</span><i /> <span>Air</span></div></div>

        <section className="front-statement" id="game">
          <div className="wrap statement-grid">
            <p className="front-kicker">There is no shortcut</p>
            <div><h2>Every town needs something.<br />Every delivery needs a plan.</h2><p>SupplyLine is about seeing the whole picture: the field that grows the crop, the factory that needs it, the truck that can carry it, and the town waiting at the end of the road. Build a network that earns its keep.</p></div>
          </div>
        </section>

        <section className="front-feature">
          <div className="wrap feature-grid">
            <figure><img src="/site/shot-home.png" alt="A production town with factories and roads" loading="eager" /></figure>
            <div className="feature-copy"><span className="front-section-number">01 / PRODUCTION</span><p className="front-kicker">Start close. Think big.</p><h2>One good route changes everything.</h2><p>Begin with a local need. Grow it into a chain of raw materials, processing and delivery. A town that gets lumber and food asks for more; a network that works opens the next problem worth solving.</p><a className="front-inline-link" href="/goods/">Explore the full goods list <span>→</span></a></div>
          </div>
        </section>

        <section className="front-play">
          <div className="wrap"><div className="play-heading"><div><span className="front-section-number">02 / LOGISTICS</span><p className="front-kicker">The work</p><h2>Read the land.<br />Run the system.</h2></div><p className="play-aside">The route is the machine.<br />You decide how it runs.</p></div>
            <ol className="play-steps">{PLAY.map(([title, body], index) => <li key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
          </div>
        </section>

        <section className="front-map" id="maps">
          <div className="wrap"><div className="map-heading"><div><span className="front-section-number">03 / THE WORLD</span><p className="front-kicker">The current world</p></div><p>Map 3 is the focus of SupplyLine’s next chapter: a large, connected place built for long routes and ambitious companies.</p></div>
            <article className="map-feature"><img src={map.img} alt={`Map ${map.n}: ${map.name}`} loading="lazy" /><div><span>Map {map.n}</span><h2>{map.name}</h2><p>{map.body}</p><small>{map.facts.join(' · ')}</small></div></article>
          </div>
        </section>

        <section className="front-screens" id="screens">
          <div className="wrap"><div className="screens-heading"><div><span className="front-section-number">04 / IN GAME</span><p className="front-kicker">From the current build</p></div><h2>The whole system,<br />at every scale.</h2><p>Zoom out to plan the next region. Zoom in to follow a single delivery. These are real moments from the game in development.</p></div>
            <div className="front-shot-grid">{SHOTS.map(([src, alt], index) => <a href={src} target="_blank" rel="noopener" className={`front-shot front-shot-${index + 1}`} key={src}><img src={src} alt={alt} loading="lazy" /><span>{alt}</span></a>)}</div>
          </div>
        </section>

        <section className="front-test">
          <div className="wrap test-grid"><div><p className="front-kicker">Help shape the first hour</p><h2>Build something worth keeping.</h2></div><div><p>SupplyLine is being made in public. The tester build is where the early economy, the routes and the feeling of a growing town get better.</p><a className="front-primary" href="/access/">Get the tester build <span>Windows and Mac</span></a></div></div>
        </section>
      </main>
      <Footer />
    </>
  );
}
