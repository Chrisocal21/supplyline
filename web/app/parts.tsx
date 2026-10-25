import { LINKS } from './content';

/** A button that stays off until it has an address. */
export function LinkButton({ href, primary, label, note, soon }: { href: string; primary?: boolean; label: string; note: string; soon: string }) {
  const on = href !== '';
  return (
    <a className={`btn${primary ? ' primary' : ''}`} href={on ? href : '#'} aria-disabled={on ? undefined : true} rel={on ? 'noopener' : undefined}>
      {label}
      <small>{on ? note : soon}</small>
    </a>
  );
}

/** The mark (a globe with a route running through it) and the name. */
export function Logo({ size = 34, mark = true }: { size?: number; mark?: boolean }) {
  return (
    <a className="brand" href="/" aria-label="SupplyLine home">
      {mark ? <img src="/favicon.svg" alt="" width={size} height={size} /> : null}
      <span className="brand-name">SUPPLY<span>LINE</span></span>
    </a>
  );
}

export function Nav({ home }: { home: boolean }) {
  const h = home ? '' : '/';
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Logo mark={false} />
        <nav className="nav-links">
          <a className="hide-s" href={`${h}#game`}>The game</a>
          <a className="hide-s" href={`${h}#maps`}>Maps</a>
          <a className="hide-s" href={`${h}#news`}>Updates</a>
          <a className="hide-s" href={`${h}#studio`}>The studio</a>
          <a className="hide-s" href={`${h}#contact`}>Contact</a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-in">
        <div>
          <Logo size={40} />
          <p>A <a href={LINKS.studio} rel="noopener">Probably Fine Studios</a> game. Made by Chris and a handful of friends with opinions, some of whom need to patch their build. The models are made with AI, because none of us can do 3D.</p>
        </div>
        <nav className="footer-links">
          <a href="/steam/">Store page preview</a>
          <a href={LINKS.studio} rel="noopener">Studio</a>
        </nav>
      </div>
    </footer>
  );
}
