import type { Metadata } from 'next';
import { DISTRICTS, SITES, VEHICLES, districtImage, levelsOf, siteImage, vehicleImage } from '../wiki';
import { Model, WikiShell } from '../parts';

export const metadata: Metadata = { title: 'Gallery - SupplyLine wiki', description: 'Every model in SupplyLine as a picture.' };

const TREES = ['pine', 'oak', 'birch', 'orchard', 'palm'];

export default function Gallery() {
  return (
    <WikiShell here="/wiki/gallery/" crumbs={[['/wiki/gallery/', 'Gallery']]} title="Gallery" lead="Every model in the game as a picture: buildings at up to three levels, vehicles, district landmarks and trees. These are the stand-in models; the artwork overhaul will replace them.">
      <h2 className="wiki-h2">Buildings</h2>
      <div className="grid-models">
        {SITES.flatMap((s) => levelsOf(s).map((l) => (
          <a key={`${s.kind}${l}`} href={`/wiki/buildings/${s.kind}/`} className="gm">
            <Model src={siteImage(s, l)} alt={`${s.label} level ${l}`} size="sm" />
            <span>{s.label}{levelsOf(s).length > 1 ? ` L${l}` : ''}</span>
          </a>
        )))}
      </div>
      <h2 className="wiki-h2">Vehicles</h2>
      <div className="grid-models">
        {VEHICLES.map((v) => (
          <a key={v.kind} href={`/wiki/vehicles/${v.kind}/`} className="gm">
            <Model src={vehicleImage(v)} alt={v.label} size="sm" />
            <span>{v.label}</span>
          </a>
        ))}
      </div>
      <h2 className="wiki-h2">Districts</h2>
      <div className="grid-models">
        {DISTRICTS.flatMap((d) => [1, 2, 3].map((l) => (
          <a key={`${d.id}${l}`} href={`/wiki/districts/${d.id}/`} className="gm">
            <Model src={districtImage(d, l)} alt={`${d.label} level ${l}`} size="sm" />
            <span>{d.label} L{l}</span>
          </a>
        )))}
      </div>
      <h2 className="wiki-h2">Trees</h2>
      <div className="grid-models">
        {TREES.map((t) => (
          <div key={t} className="gm">
            <Model src={`/wiki/models/tree-${t}.png`} alt={t} size="sm" />
            <span>{t[0].toUpperCase() + t.slice(1)}</span>
          </div>
        ))}
      </div>
    </WikiShell>
  );
}
