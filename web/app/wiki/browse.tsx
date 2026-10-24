'use client';

import { useMemo, useState } from 'react';

export interface Item {
  href: string;
  name: string;
  sub: string;
  img?: string;
  group: string;
  text: string;
}

/** A searchable, filterable grid of cards. */
export function Browse({ items, groups, placeholder }: { items: Item[]; groups: string[]; placeholder: string }) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const shown = useMemo(() => {
    const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return items.filter((i) => (group === 'all' || i.group === group) && words.every((w) => i.text.includes(w)));
  }, [items, q, group]);
  return (
    <div>
      <div className="browse-bar">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Search" />
        <div className="chips">
          {['all', ...groups].map((g) => (
            <button key={g} type="button" className={group === g ? 'on' : ''} onClick={() => setGroup(g)}>
              {g === 'all' ? 'All' : g}
            </button>
          ))}
        </div>
      </div>
      <div className="label" style={{ margin: '4px 0 12px' }}>{shown.length} shown</div>
      <div className="cards">
        {shown.map((i) => (
          <a className="card-link" key={i.href} href={i.href}>
            {i.img ? (
              <div className="thumb"><img src={i.img} alt="" loading="lazy" /></div>
            ) : null}
            <div className="card-text">
              <b>{i.name}</b>
              <span>{i.sub}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
