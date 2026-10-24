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

export function Nav({ home }: { home: boolean }) {
  const h = home ? '' : '/';
  return (
    <header className="nav">
      <div className="wrap">
        <div className="nav-in">
          <a className="brand" href="/">SUPPLY<span>LINE</span></a>
          <nav className="nav-links">
            <a className="hide-s" href={`${h}#play`}>How it plays</a>
            <a className="hide-s" href={`${h}#maps`}>Maps</a>
            <a className="hide-s" href={`${h}#roadmap`}>Roadmap</a>
            <a className="hide-s" href={`${h}#faq`}>Questions</a>
            <a href="/goods/">Goods</a>
            <a href="/steam/">Store page</a>
            <a className="btn primary sm" href={LINKS.demo || '#'} rel="noopener">Get the demo</a>
          </nav>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <p>SupplyLine is part of the <a href={LINKS.studio} rel="noopener">Probably Fine Studios</a> family.</p>
        <p>Made by Chris, with help from Jawraw, the old man in the chair, who is always picking fights with the office dog.</p>
      </div>
    </footer>
  );
}

export function Head({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="section-head">
      <div className="label accent">{kicker}</div>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
