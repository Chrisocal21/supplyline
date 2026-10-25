import type { Metadata } from 'next';
import { LINKS } from '../content';
import { GOODS, SITES } from '../wiki/wiki';
import { Footer, LinkButton, Nav } from '../parts';

export const metadata: Metadata = {
  title: 'SupplyLine - store page preview',
  description: 'A preview of the SupplyLine store page: a logistics game on a 3D globe by Probably Fine Studios. The Steam page is coming.',
};

const THUMBS = [
  ['/site/shot-overview.png', 'The whole globe from space'],
  ['/site/shot-forest.jpg', 'A forestry spot in the woods'],
  ['/site/shot-desert.jpg', 'A desert continent'],
  ['/site/shot-island.png', 'An island'],
];

const SHOTS = [
  ['/site/shot-overview.png', 'The whole globe from space'],
  ['/site/shot-river.png', 'A river valley'],
  ['/site/shot-range.png', 'A mountain range'],
  ['/site/shot-home.png', 'Home town'],
];

export default function Store() {
  return (
    <>
      <div className="note">This is a preview of the SupplyLine store page, made by the studio. The real page is not live yet. <a href="/">Back to the website</a></div>
      <Nav home={false} />
      <main className="wrap" style={{ paddingTop: 18 }}>
        <div className="label">All games &gt; Simulation &gt; SupplyLine</div>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', margin: '10px 0 16px', lineHeight: 1.1 }}>SupplyLine</h1>

        <div className="store-top">
          <div>
            <div className="stage"><span>Trailer coming soon</span></div>
            <div className="thumbs">
              {THUMBS.map(([src, alt]) => <img key={src} src={src} alt={alt} />)}
            </div>
          </div>
          <aside className="panel">
            <img className="store-logo" src="/site/logo-full.jpg" alt="SupplyLine logo" width={1000} height={1000} />
            <p>Build farms, forests and factories on a 3D globe. Then move the goods by truck, train, ship and plane, and watch the towns grow.</p>
            <dl className="rows">
              <div><dt>Developer</dt><dd><a href={LINKS.studio} rel="noopener">Probably Fine Studios</a></dd></div>
              <div><dt>Publisher</dt><dd><a href={LINKS.studio} rel="noopener">Probably Fine Studios</a></dd></div>
              <div><dt>Release</dt><dd>To be announced</dd></div>
              <div><dt>Status</dt><dd>In development, free demo available</dd></div>
            </dl>
            <ul className="tags">
              {['Logistics', 'Management', 'Building', 'Trains', 'Economy', 'Singleplayer', 'Relaxed'].map((t) => <li key={t}>{t}</li>)}
            </ul>
          </aside>
        </div>

        <div className="buy">
          <div>
            <h3>Wishlist SupplyLine</h3>
            <p>Be told when it launches. The free demo plays Tiers 0 and 1 on Map 1.</p>
          </div>
          <div className="btn-row">
            <a className="btn" href="/#demo">Download the free demo<small>Windows and Mac, free</small></a>
            <LinkButton primary href={LINKS.steam} label="Wishlist on Steam" note="Wishlist now" soon="Coming soon" />
          </div>
        </div>

        <div className="store-cols">
          <div className="stack">
            <section className="panel">
              <h3>About this game</h3>
              <p>Towns need goods. You grow the food, cut the wood and dig the stone, then deliver it. Fill the towns&apos; shelves and a village becomes a town, a city, a metropolis.</p>
              <ul className="plain-list">
                <li>A 3D globe with three hand-made maps, from a small teaching world to a huge one with about 190 towns.</li>
                <li>{GOODS.length} goods and {SITES.length} buildings, from raw logs to steel and machinery.</li>
                <li>Move goods by truck, train, ship and plane, with roads, rails, bridges and canals.</li>
                <li>Named drivers who rank up, and mechanics who keep the fleet running.</li>
                <li>Five tiers of goals, with a guide for your first town and a relaxed mode with no punishment.</li>
                <li>Made by one developer and a handful of friends. The models are stand-ins made with AI, because none of us can do 3D art.</li>
              </ul>
            </section>
            <section className="panel">
              <h3>Screenshots</h3>
              <div className="shot-grid">
                {SHOTS.map(([src, alt]) => <img key={src} src={src} alt={alt} loading="lazy" />)}
              </div>
            </section>
          </div>
          <div className="stack">
            <section className="panel bar">
              <h3>Free demo</h3>
              <p>Map 1, Tiers 0 and 1. It ends when you reach Tier 2, and you can save your progress to a file and carry it into the full game.</p>
              <p style={{ marginTop: 10 }}>The full game adds Maps 2 and 3, rail, ports, ships, planes, steel and machinery.</p>
            </section>
            <section className="panel bar">
              <h3>System requirements</h3>
              <table className="reqs">
                <tbody>
                  <tr><th>OS</th><td>Windows 10 or 11, 64-bit, or macOS 12 or later (Apple silicon or Intel)</td></tr>
                  <tr><th>Graphics</th><td>A dedicated graphics card is best. The big map is heavy.</td></tr>
                  <tr><th>Storage</th><td>About 500 MB</td></tr>
                  <tr><th>Input</th><td>Mouse and keyboard</td></tr>
                </tbody>
              </table>
              <p style={{ marginTop: 10, fontSize: '0.82rem' }}>Final requirements will be set before release.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
