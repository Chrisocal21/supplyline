'use client';

import { useState, type FormEvent } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** Posts to the shared Probably Fine Studios inbox. See the message-hub handoff doc for the contract. */
const ENDPOINT = 'https://mail.probablyfinestudios.com/api/public/messages';

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    // The honeypot: a real visitor never fills this in. A bot usually does.
    if (data.get('company')) return;
    setStatus('sending');
    setError('');
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_site: 'supplyline',
          name: data.get('name'),
          email: data.get('email'),
          message: data.get('message'),
          company: '',
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? 'Could not send that. Try again in a moment.');
      setStatus('sent');
      form.reset();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not send that. Try again in a moment.');
    }
  }

  if (status === 'sent') {
    return <p className="contact-sent">Sent. Thanks for writing in — Chris reads every one of these himself.</p>;
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="c-name">Name</label>
        <input id="c-name" name="name" type="text" required maxLength={200} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="c-email">Email</label>
        <input id="c-email" name="email" type="email" required maxLength={200} autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="c-message">Message</label>
        <textarea id="c-message" name="message" required maxLength={5000} rows={5} />
      </div>
      {/* Honeypot: hidden from a real visitor, left in the DOM for bots to find. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="c-company">Company</label>
        <input id="c-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <button className="btn primary" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
      {status === 'error' && <p className="contact-error">{error}</p>}
    </form>
  );
}
