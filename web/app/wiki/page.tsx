import type { Metadata } from 'next';
import { DISTRICTS, GOODS, SITES, VEHICLES, districtImage, siteImage, vehicleImage } from './wiki';
import { WikiShell } from './parts';

export const metadata: Metadata = { title: 'SupplyLine wiki', description: 'Every building, vehicle, district and good in SupplyLine, with pictures.' };

const FEATURED = ['forestry', 'sawmill', 'steelworks'];

export default function WikiHome() {
  const cards: [string, string, number, string, string][] = [
    ['/wiki/buildings/', 'Buildings', SITES.length, 'Producers, processors, factories and logistics, at three levels each.', siteImage(SITES.find((s) => s.kind === 'forestry')!, 1)],
    ['/wiki/vehicles/', 'Vehicles', VEHICLES.length, 'Trucks, trains, ships and planes, and how far and how much they carry.', vehicleImage(VEHICLES.find((v) => v.kind === 'rig')!)],
    ['/wiki/districts/', 'Districts', DISTRICTS.length, 'The landmarks a growing town can build, from a market to a grand plaza.', districtImage(DISTRICTS.find((d) => d.id === 'stadium')!)],
    ['/wiki/goods/', 'Goods', GOODS.length, 'Raw goods, materials, products and by-products, and where each comes from.', siteImage(SITES.find((s) => s.kind === 'sawmill')!, 1)],
  ];
  return (
    <WikiShell here="/wiki/" title="The SupplyLine wiki" lead="Everything in the game, with pictures. It is written from the game's own data, so it matches what you play. The models you see are stand-ins while the artwork overhaul is built.">
      <div className="cards big">
        {cards.map(([href, name, n, text, img]) => (
          <a className="card-link" key={href} href={href}>
            <div className="thumb"><img src={img} alt="" /></div>
            <div className="card-text">
              <b>{name} <span className="count">{n}</span></b>
              <span>{text}</span>
            </div>
          </a>
        ))}
      </div>
      <h2 className="wiki-h2">A few to start with</h2>
      <div className="cards">
        {FEATURED.map((k) => {
          const s = SITES.find((x) => x.kind === k)!;
          return (
            <a className="card-link" key={k} href={`/wiki/buildings/${k}/`}>
              <div className="thumb"><img src={siteImage(s, 3)} alt="" loading="lazy" /></div>
              <div className="card-text"><b>{s.label}</b><span>{s.blurb}</span></div>
            </a>
          );
        })}
      </div>
      <p className="wiki-note">All the pictures are in <a href="/wiki/gallery/">the gallery</a>.</p>
    </WikiShell>
  );
}
