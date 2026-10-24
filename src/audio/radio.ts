// The radio: a few stations of easy listening music made live in the browser, so there are no audio files to download or pay
// for. Each station is a small generator that plays notes a moment ahead of the clock. Pick a station, turn it up or down, or
// switch it off from the menu.

export interface Station {
  id: string;
  name: string;
  blurb: string;
}

export const STATIONS: Station[] = [
  { id: 'lofi', name: 'Lo-Fi Chill', blurb: 'Dusty keys, a slow beat and vinyl crackle' },
  { id: 'rain', name: 'Rainy Window', blurb: 'Steady rain, far thunder and a soft pad' },
  { id: 'drive', name: 'Night Drive', blurb: 'Warm synths and a gentle pulse' },
  { id: 'drift', name: 'Ambient Drift', blurb: 'Slow drones and bells, no beat' },
  { id: 'sunrise', name: 'Sunrise Drive', blurb: 'Bright arpeggios, warm pads and a steady beat' },
  { id: 'horizon', name: 'Horizon Lines', blurb: 'Slow, wide and hopeful, with soft brushes' },
  { id: 'tape', name: 'Tape Garden', blurb: 'Worn tape, hazy chords and a sleepy tune' },
  { id: 'golden', name: 'Golden Hour', blurb: 'A loose sunny groove with clean plucked guitar' },
  { id: 'dusty', name: 'Dusty Roads', blurb: 'Jazzy keys over a head-nodding boom-bap beat' },
  { id: 'cassette', name: 'Cassette Dreams', blurb: 'Neon synth arpeggios and a gentle gated pad' },
  { id: 'fog', name: 'Morning Fog', blurb: 'Slow plucked notes in a big soft room, no drums' },
  { id: 'porch', name: 'Slow Porch', blurb: 'Soft keys, a barely-there beat and warm tape hiss' },
  { id: 'pillow', name: 'Pillow Talk', blurb: 'Very slow, round and hushed, with a heartbeat kick' },
  { id: 'moss', name: 'Mossy Stones', blurb: 'Unhurried plucks falling into a big quiet room' },
  { id: 'lantern', name: 'Lantern Walk', blurb: 'Gentle bells over a slow brushed shuffle' },
  { id: 'tide', name: 'Low Tide', blurb: 'Deep warm pads that swell and fade, no beat' },
  { id: 'harvest', name: 'Harvest Slow', blurb: 'Soft guitar-like plucks and a lazy loose groove' },
  { id: 'nightshift', name: 'Night Shift', blurb: 'Hushed late-hour keys, easy and unhurried' },
  { id: 'synthwave', name: 'Neon Highway', blurb: 'Fast retro synths, big gated drums and a driving bass' },
  { id: 'funk', name: 'Funk Depot', blurb: 'Slap-style bass, choppy chords and a tight groove' },
  { id: 'bossa', name: 'Bossa Terrace', blurb: 'Brazilian rhythm, soft chords and a light shaker' },
  { id: 'house', name: 'Four on the Floor', blurb: 'Steady house kick, offbeat stabs and a rolling bass' },
  { id: 'disco', name: 'Mirror Ball', blurb: 'Bright chords, open hats and a bouncing bass' },
  { id: 'reggae', name: 'Island Rail', blurb: 'Laid-back offbeat chords and a deep, slow bass' },
  { id: 'trip', name: 'Smoke Signals', blurb: 'Slow heavy beat, dark keys and wide echoes' },
  { id: 'chip', name: 'Pixel Parade', blurb: 'Bleepy square-wave tunes like an old game' },
  { id: 'country', name: 'Open Range', blurb: 'Warm plucks and a steady two-step on the road' },
  { id: 'techno', name: 'Warehouse Night', blurb: 'Hard pulse, ticking hats and a hypnotic line' },
  { id: 'latin', name: 'Sunny Plaza', blurb: 'Lively Latin groove with bright stabs' },
  { id: 'jazz', name: 'Late Lounge', blurb: 'Smoky seventh chords and a soft swung ride' },
  { id: 'march', name: 'Brass Band Parade', blurb: 'Bouncy two-beat march with bright stabs' },
  { id: 'space', name: 'Orbit Radio', blurb: 'Floating arpeggios and deep space pads' },
  { id: 'rock', name: 'Highway Rock', blurb: 'Driving straight beat with crunchy chord stabs' },
  { id: 'dream', name: 'Cloud Pop', blurb: 'Sweet bouncy pop with shimmering pads' },
];

const KEY = 'sl-radio';
const LOOKAHEAD = 0.35;

/** MIDI note number to a frequency. */
const hz = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

interface Settings {
  on: boolean;
  volume: number;
  station: number;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Settings>;
      return { on: s.on !== false, volume: typeof s.volume === 'number' ? Math.max(0, Math.min(1, s.volume)) : 0.4, station: Math.max(0, Math.min(STATIONS.length - 1, s.station ?? 0)) };
    }
  } catch {
    // No storage: the defaults stand.
  }
  return { on: true, volume: 0.4, station: 0 };
}

/** What a station needs to play: the clock, its own output bus, noise to draw on, and a way to make notes. */
interface Kit {
  ctx: AudioContext;
  bus: GainNode;
  reverb: AudioNode;
  echo: AudioNode;
  white: AudioBuffer;
  tone: (freq: number, t: number, dur: number, o?: ToneOpts) => void;
  hit: (kind: 'kick' | 'snare' | 'hat' | 'clap', t: number, vel?: number) => void;
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  release?: number;
  cutoff?: number;
  detune?: number;
  send?: number;
  /** How much goes to the station's echo. */
  echo?: number;
  trem?: number;
}

type Generator = (kit: Kit) => { tick: (now: number) => void; stop: () => void };

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

// ---- the stations ----

/** Lo-Fi Chill: seventh chords on a soft electric piano, a lazy swung beat, a walking bass and crackle. */
const lofi: Generator = (k) => {
  const bpm = 66;
  const beat = 60 / bpm;
  const chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 59, 62, 65]];
  const roots = [41, 40, 38, 43];
  const scale = [65, 67, 69, 72, 74, 76, 79];
  let next = k.ctx.currentTime + 0.1;
  let bar = 0;
  // Vinyl crackle: a loop of random pops over a faint hiss.
  const len = k.ctx.sampleRate * 4;
  const buf = k.ctx.createBuffer(1, len, k.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() - 0.5) * 0.02 + (Math.random() < 0.0006 ? (Math.random() - 0.5) * 0.9 : 0);
  const crackle = k.ctx.createBufferSource();
  crackle.buffer = buf;
  crackle.loop = true;
  const cg = k.ctx.createGain();
  cg.gain.value = 0.35;
  const hp = k.ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 900;
  crackle.connect(hp).connect(cg).connect(k.bus);
  crackle.start();
  const swing = (i: number): number => (i % 2 === 1 ? beat * 0.06 : 0);
  return {
    tick: (now) => {
      while (next < now + LOOKAHEAD) {
        const c = chords[bar % 4];
        const bt = next;
        c.forEach((n, i) => k.tone(hz(n), bt + i * 0.012, beat * 3.6, { type: 'triangle', gain: 0.085, attack: 0.02, release: 1.2, cutoff: 1500, trem: 4.5, send: 0.35, detune: rand(-5, 5) }));
        k.tone(hz(roots[bar % 4]), bt, beat * 1.4, { type: 'sine', gain: 0.22, attack: 0.02, release: 0.5, cutoff: 400 });
        k.tone(hz(roots[bar % 4]), bt + beat * 2.5, beat * 1.2, { type: 'sine', gain: 0.18, attack: 0.02, release: 0.5, cutoff: 400 });
        for (let i = 0; i < 8; i++) {
          const t = bt + i * beat * 0.5 + swing(i);
          k.hit('hat', t, i % 2 ? rand(0.2, 0.35) : rand(0.4, 0.55));
          if (Math.random() < 0.3) k.tone(hz(pick(scale)), t, beat * rand(0.6, 1.6), { type: 'sine', gain: 0.05, attack: 0.01, release: 0.9, send: 0.6 });
        }
        k.hit('kick', bt);
        k.hit('kick', bt + beat * 2.5 + swing(5), 0.8);
        k.hit('snare', bt + beat);
        k.hit('snare', bt + beat * 3);
        next += beat * 4;
        bar += 1;
      }
    },
    stop: () => crackle.stop(),
  };
};

/** Rainy Window: steady rain, thunder far off now and then, and a very soft pad underneath. */
const rain: Generator = (k) => {
  const src = k.ctx.createBufferSource();
  src.buffer = k.white;
  src.loop = true;
  const lp = k.ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  const hp = k.ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 500;
  const g = k.ctx.createGain();
  g.gain.value = 0.28;
  src.connect(hp).connect(lp).connect(g).connect(k.bus);
  src.start();
  const roar = k.ctx.createBufferSource();
  roar.buffer = k.white;
  roar.loop = true;
  roar.loopStart = 0.7;
  const rl = k.ctx.createBiquadFilter();
  rl.type = 'lowpass';
  rl.frequency.value = 420;
  const rg = k.ctx.createGain();
  rg.gain.value = 0.22;
  roar.connect(rl).connect(rg).connect(k.bus);
  roar.start();
  const chords = [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]];
  let next = k.ctx.currentTime + 0.2;
  let bar = 0;
  let thunder = k.ctx.currentTime + rand(14, 30);
  return {
    tick: (now) => {
      while (next < now + LOOKAHEAD) {
        chords[bar % 4].forEach((n, i) => k.tone(hz(n), next + i * 0.05, 9, { type: 'sine', gain: 0.05, attack: 3, release: 4, send: 0.7, detune: rand(-4, 4) }));
        next += 8;
        bar += 1;
      }
      if (now > thunder) {
        const t = now + 0.1;
        const n = k.ctx.createBufferSource();
        n.buffer = k.white;
        const f = k.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(260, t);
        f.frequency.exponentialRampToValueAtTime(60, t + 5);
        const tg = k.ctx.createGain();
        tg.gain.setValueAtTime(0.0001, t);
        tg.gain.exponentialRampToValueAtTime(0.5, t + 0.6);
        tg.gain.exponentialRampToValueAtTime(0.0001, t + 6);
        n.connect(f).connect(tg).connect(k.bus);
        n.start(t, rand(0, 1), 6.5);
        thunder = now + rand(22, 48);
      }
    },
    stop: () => {
      src.stop();
      roar.stop();
    },
  };
};

/** Night Drive: a steady soft pulse, an arpeggio and wide pads. */
const drive: Generator = (k) => {
  const bpm = 92;
  const beat = 60 / bpm;
  const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const roots = [33, 29, 36, 31];
  let next = k.ctx.currentTime + 0.1;
  let bar = 0;
  return {
    tick: (now) => {
      while (next < now + LOOKAHEAD) {
        const c = chords[bar % 4];
        const bt = next;
        c.forEach((n) => k.tone(hz(n), bt, beat * 4.2, { type: 'sawtooth', gain: 0.032, attack: 0.5, release: 1.5, cutoff: 900, send: 0.5, detune: rand(-9, 9) }));
        for (let i = 0; i < 16; i++) {
          const t = bt + i * beat * 0.25;
          if (i % 2 === 0) k.tone(hz(roots[bar % 4]), t, beat * 0.22, { type: 'sawtooth', gain: 0.1, attack: 0.005, release: 0.12, cutoff: 280 });
          if (i % 2 === 0) k.tone(hz(c[(i / 2) % 3] + 12), t, beat * 0.4, { type: 'square', gain: 0.03, attack: 0.005, release: 0.3, cutoff: 1400, send: 0.55 });
        }
        for (let i = 0; i < 4; i++) k.hit('kick', bt + i * beat, 0.65);
        k.hit('clap', bt + beat, 0.5);
        k.hit('clap', bt + beat * 3, 0.5);
        for (let i = 0; i < 8; i++) k.hit('hat', bt + i * beat * 0.5 + beat * 0.25, 0.25);
        next += beat * 4;
        bar += 1;
      }
    },
    stop: () => undefined,
  };
};

/** Ambient Drift: long drones that change slowly, and now and then a bell. */
const drift: Generator = (k) => {
  const chords = [[43, 50, 55, 62], [41, 48, 55, 60], [38, 45, 53, 57], [40, 47, 52, 59]];
  const scale = [67, 69, 71, 74, 76, 79, 81];
  let next = k.ctx.currentTime + 0.1;
  let bar = 0;
  let bell = k.ctx.currentTime + 2;
  return {
    tick: (now) => {
      while (next < now + LOOKAHEAD) {
        chords[bar % 4].forEach((n, i) => {
          k.tone(hz(n), next + i * 0.4, 18, { type: 'sawtooth', gain: 0.03, attack: 6, release: 6, cutoff: 520, send: 0.8, detune: rand(-12, 12) });
          k.tone(hz(n + 12), next + i * 0.4, 18, { type: 'sine', gain: 0.035, attack: 7, release: 6, send: 0.8, detune: rand(-6, 6) });
        });
        next += 14;
        bar += 1;
      }
      if (now > bell) {
        k.tone(hz(pick(scale)), now + 0.05, 4, { type: 'sine', gain: 0.07, attack: 0.01, release: 3.5, send: 0.9 });
        bell = now + rand(2.5, 7);
      }
    },
    stop: () => undefined,
  };
};

/** A beat-based station described by patterns: sixteen steps a bar, x for a hit and o for a soft one. */
interface Groove {
  bpm: number;
  swing?: number;
  chords: number[][];
  roots: number[];
  /** Bars each chord lasts. */
  chordBars?: number;
  kick: string;
  snare: string;
  hat: string;
  clap?: string;
  /** r root, 5 fifth. */
  bass: string;
  bassType?: OscillatorType;
  /** a to d: the chord's notes, an octave up. */
  arp?: string;
  arpType?: OscillatorType;
  arpCutoff?: number;
  arpGain?: number;
  /** Short chord stabs where there is an x. */
  stab?: string;
  stabGain?: number;
  pad?: { type: OscillatorType; gain: number; cutoff: number };
  lead?: { scale: number[]; prob: number; gain: number };
  echo?: number;
  crackle?: boolean;
  drums?: number;
}

const groove = (c: Groove): Generator => (k) => {
  const beat = 60 / c.bpm;
  const step = beat / 4;
  const per = c.chordBars ?? 1;
  let next = k.ctx.currentTime + 0.1;
  let bar = 0;
  let hiss: AudioBufferSourceNode | null = null;
  if (c.crackle) {
    const len = k.ctx.sampleRate * 4;
    const buf = k.ctx.createBuffer(1, len, k.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() - 0.5) * 0.02 + (Math.random() < 0.0005 ? (Math.random() - 0.5) * 0.9 : 0);
    hiss = k.ctx.createBufferSource();
    hiss.buffer = buf;
    hiss.loop = true;
    const hp = k.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const g = k.ctx.createGain();
    g.gain.value = 0.3;
    hiss.connect(hp).connect(g).connect(k.bus);
    hiss.start();
  }
  const vel = (ch: string | undefined, i: number): number => (ch && ch[i] === 'x' ? 1 : ch && ch[i] === 'o' ? 0.4 : 0);
  const dv = c.drums ?? 1;
  return {
    tick: (now) => {
      while (next < now + LOOKAHEAD) {
        const idx = Math.floor(bar / per) % c.chords.length;
        const chord = c.chords[idx];
        const root = c.roots[idx];
        const bt = next;
        if (c.pad && bar % per === 0) chord.forEach((n, i) => k.tone(hz(n), bt + i * 0.03, beat * 4 * per + 0.5, { type: c.pad!.type, gain: c.pad!.gain, attack: 0.9, release: 1.8, cutoff: c.pad!.cutoff, send: 0.5, detune: rand(-10, 10) }));
        for (let i = 0; i < 16; i++) {
          const t = bt + i * step + (i % 2 === 1 ? (c.swing ?? 0) * step : 0);
          const kv = vel(c.kick, i);
          if (kv) k.hit('kick', t, kv * dv * 0.9);
          const sv = vel(c.snare, i);
          if (sv) k.hit('snare', t, sv * dv * 0.8);
          const cv = vel(c.clap, i);
          if (cv) k.hit('clap', t, cv * dv * 0.6);
          const hv = vel(c.hat, i);
          if (hv) k.hit('hat', t, hv * dv * rand(0.6, 1));
          const b = c.bass[i];
          if (b && b !== '.') k.tone(hz(root + (b === '5' ? 7 : 0)), t, step * 1.7, { type: c.bassType ?? 'sine', gain: 0.2, attack: 0.01, release: 0.25, cutoff: 380 });
          const a = c.arp?.[i];
          if (a && a !== '.') k.tone(hz(chord[a.charCodeAt(0) - 97] + 12), t, step * 0.9, { type: c.arpType ?? 'triangle', gain: c.arpGain ?? 0.04, attack: 0.004, release: 0.4, cutoff: c.arpCutoff ?? 2600, send: 0.4, echo: c.echo });
          if (c.stab?.[i] === 'x') chord.forEach((n, j) => k.tone(hz(n), t + j * 0.008, step * 1.2, { type: 'triangle', gain: c.stabGain ?? 0.05, attack: 0.005, release: 0.5, cutoff: 2400, send: 0.4, echo: c.echo, detune: rand(-4, 4) }));
          if (c.lead && i % 2 === 0 && Math.random() < c.lead.prob) k.tone(hz(pick(c.lead.scale)), t, beat * rand(0.5, 1.5), { type: 'triangle', gain: c.lead.gain, attack: 0.008, release: 1, cutoff: 3200, send: 0.6, echo: c.echo ?? 0.4 });
        }
        next += beat * 4;
        bar += 1;
      }
    },
    stop: () => hiss?.stop(),
  };
};

export const GROOVES: Record<string, Groove> = {
  sunrise: { bpm: 100, chords: [[57, 61, 64, 68], [54, 57, 61, 64], [50, 54, 57, 61], [52, 56, 59, 62]], roots: [45, 42, 38, 40], kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.o.x.o.x.o.x.o.', bass: 'r..r..r.r..r..r.', arp: 'abcdcbabcdcbabcd', arpType: 'sawtooth', arpCutoff: 2300, arpGain: 0.03, pad: { type: 'sawtooth', gain: 0.026, cutoff: 1100 }, lead: { scale: [69, 71, 73, 76, 78], prob: 0.12, gain: 0.05 }, echo: 0.5, chordBars: 2 },
  horizon: { bpm: 82, chords: [[53, 57, 60, 64], [55, 59, 62, 64], [57, 60, 64, 67], [52, 55, 59, 62]], roots: [41, 43, 45, 40], kick: 'x.......x.......', snare: '........o.......', hat: '..o...o...o...o.', bass: 'r.......r.....5.', arp: 'a...b...c...d...', arpCutoff: 3000, arpGain: 0.05, pad: { type: 'sine', gain: 0.05, cutoff: 2000 }, lead: { scale: [65, 67, 69, 72, 74], prob: 0.18, gain: 0.05 }, echo: 0.6, chordBars: 2 },
  tape: { bpm: 72, chords: [[50, 53, 57, 64], [46, 50, 53, 57], [55, 58, 62, 65], [52, 57, 59, 62]], roots: [38, 34, 43, 33], kick: 'x.......x..o....', snare: '....o.......o...', hat: 'o.o.o.o.o.o.o.o.', bass: 'r.....r.....r...', pad: { type: 'sawtooth', gain: 0.04, cutoff: 700 }, lead: { scale: [62, 65, 67, 69, 72], prob: 0.24, gain: 0.05 }, echo: 0.5, crackle: true, chordBars: 2 },
  golden: { bpm: 94, swing: 0.1, chords: [[57, 60, 64, 67], [50, 54, 57, 60], [55, 59, 62, 66], [48, 52, 55, 59]], roots: [45, 38, 43, 36], kick: 'x.....x...x.....', snare: '....x.o.....x..o', hat: 'x.o.x.o.x.o.x.o.', bass: 'r..r.5..r..r..5.', stab: '.x....x..x....x.', stabGain: 0.045, lead: { scale: [69, 72, 74, 76, 79], prob: 0.2, gain: 0.06 }, echo: 0.45 },
  dusty: { bpm: 84, swing: 0.16, chords: [[50, 53, 57, 60], [43, 50, 53, 57], [48, 52, 55, 59], [53, 57, 60, 64]], roots: [38, 43, 36, 41], kick: 'x.....x..x......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: 'r.....r.5.....r.', stab: '.x.....x........', stabGain: 0.06, lead: { scale: [62, 65, 67, 69, 72], prob: 0.14, gain: 0.05 }, echo: 0.4, crackle: true, chordBars: 2 },
  cassette: { bpm: 108, chords: [[52, 55, 59, 64], [48, 52, 55, 60], [43, 47, 50, 55], [50, 54, 57, 62]], roots: [40, 36, 43, 38], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', bass: '.r.r.r.r.r.r.r.r', bassType: 'sawtooth', arp: 'a.b.c.b.a.b.c.d.', arpType: 'sawtooth', arpCutoff: 1900, arpGain: 0.028, pad: { type: 'sawtooth', gain: 0.035, cutoff: 900 }, echo: 0.5, drums: 0.7, chordBars: 2 },
  porch: { bpm: 64, swing: 0.14, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 59, 62, 65]], roots: [41, 40, 38, 43], kick: 'x.......o.......', snare: '........o.......', hat: 'o...o...o...o...', bass: 'r.......r.......', stab: '.x..............', stabGain: 0.04, lead: { scale: [65, 67, 69, 72, 74], prob: 0.16, gain: 0.04 }, echo: 0.5, crackle: true, drums: 0.55, chordBars: 2 },
  pillow: { bpm: 56, chords: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]], roots: [36, 33, 29, 31], kick: 'o...............', snare: '................', hat: '................', bass: 'r...............', arp: 'a.....b.....c...', arpCutoff: 2200, arpGain: 0.04, pad: { type: 'sine', gain: 0.07, cutoff: 1400 }, lead: { scale: [67, 69, 72, 74, 76], prob: 0.08, gain: 0.04 }, echo: 0.6, drums: 0.5, chordBars: 2 },
  moss: { bpm: 52, chords: [[50, 53, 57, 62], [46, 50, 53, 58], [48, 52, 55, 60], [45, 48, 52, 57]], roots: [38, 34, 36, 33], kick: '................', snare: '................', hat: '................', bass: 'r...............', arp: 'a...c...b...d...', arpType: 'sine', arpCutoff: 2800, arpGain: 0.06, pad: { type: 'sine', gain: 0.045, cutoff: 1200 }, lead: { scale: [62, 65, 67, 69, 72], prob: 0.1, gain: 0.04 }, echo: 0.75, chordBars: 2 },
  lantern: { bpm: 70, swing: 0.12, chords: [[55, 59, 62, 66], [52, 55, 59, 62], [48, 52, 55, 59], [50, 54, 57, 61]], roots: [43, 40, 36, 38], kick: 'x...............', snare: '........o.......', hat: 'o.o.o.o.o.o.o.o.', bass: 'r.......5.......', arp: 'a...b...c...b...', arpType: 'sine', arpCutoff: 3200, arpGain: 0.055, pad: { type: 'triangle', gain: 0.03, cutoff: 1000 }, echo: 0.55, drums: 0.5, chordBars: 2 },
  tide: { bpm: 48, chords: [[45, 52, 57, 60], [43, 50, 55, 59], [41, 48, 53, 57], [43, 50, 55, 62]], roots: [33, 31, 29, 31], kick: '................', snare: '................', hat: '................', bass: 'r...............', pad: { type: 'sine', gain: 0.075, cutoff: 1300 }, lead: { scale: [69, 71, 74, 76, 81], prob: 0.06, gain: 0.04 }, echo: 0.7, chordBars: 2 },
  harvest: { bpm: 76, swing: 0.15, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]], roots: [45, 41, 36, 43], kick: 'x.......x.......', snare: '........o.......', hat: 'o...o...o...o...', bass: 'r.......r.....5.', stab: '.x..........x...', stabGain: 0.04, lead: { scale: [69, 72, 74, 76, 79], prob: 0.14, gain: 0.045 }, echo: 0.45, drums: 0.55 },
  nightshift: { bpm: 62, swing: 0.1, chords: [[50, 53, 57, 64], [48, 52, 55, 62], [46, 50, 53, 60], [49, 53, 56, 63]], roots: [38, 36, 34, 37], kick: 'o.......o.......', snare: '................', hat: '....o.......o...', bass: 'r.......r.......', stab: '.x..............', stabGain: 0.035, lead: { scale: [62, 65, 67, 69, 72], prob: 0.14, gain: 0.04 }, echo: 0.55, crackle: true, drums: 0.5, chordBars: 2 },
  synthwave: { bpm: 118, chords: [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]], roots: [33, 29, 36, 31], kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', clap: '....x.......x...', bass: 'rrrrrrrrrrrrrrrr', bassType: 'sawtooth', arp: 'abcdcbabcdcbabcd', arpType: 'sawtooth', arpCutoff: 2600, arpGain: 0.03, pad: { type: 'sawtooth', gain: 0.03, cutoff: 1200 }, echo: 0.4, chordBars: 2 },
  funk: { bpm: 104, swing: 0.1, chords: [[52, 56, 59, 62], [57, 61, 64, 67], [50, 54, 57, 60], [55, 59, 62, 65]], roots: [40, 45, 38, 43], kick: 'x..x..x...x..x..', snare: '....x..o....x..o', hat: 'xoxoxoxoxoxoxoxo', bass: 'r.rr.5r.r.rr.5r.', bassType: 'square', stab: '..x...x.x...x...', stabGain: 0.05, lead: { scale: [64, 67, 69, 71, 74], prob: 0.15, gain: 0.04 }, echo: 0.3 },
  bossa: { bpm: 126, chords: [[50, 53, 57, 60], [55, 58, 62, 65], [48, 52, 55, 59], [53, 57, 60, 64]], roots: [38, 43, 36, 41], kick: 'x..x..x.x..x..x.', snare: '..o..o....o..o..', hat: 'x.x.x.x.x.x.x.x.', bass: 'r..5..r.r..5..r.', stab: 'x..x..x...x..x..', stabGain: 0.04, lead: { scale: [62, 65, 67, 69, 72], prob: 0.15, gain: 0.04 }, echo: 0.45, drums: 0.5, chordBars: 2 },
  house: { bpm: 124, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]], roots: [33, 29, 31, 28], kick: 'x...x...x...x...', snare: '................', hat: '..x...x...x...x.', clap: '....x.......x...', bass: '.r.r.r.r.r.r.r.r', bassType: 'sawtooth', stab: '..x...x...x...x.', stabGain: 0.05, echo: 0.4, chordBars: 2 },
  disco: { bpm: 116, chords: [[53, 57, 60, 64], [55, 59, 62, 66], [57, 60, 64, 67], [50, 54, 57, 60]], roots: [41, 43, 45, 38], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '.o.o.o.o.o.o.o.o', bass: 'r.5.r.5.r.5.r.5.', stab: 'x.x.x.x.x.x.x.x.', stabGain: 0.04, lead: { scale: [65, 69, 72, 74, 77], prob: 0.2, gain: 0.05 }, echo: 0.3, chordBars: 2 },
  reggae: { bpm: 76, chords: [[57, 60, 64], [50, 53, 57], [52, 55, 59], [57, 60, 64]], roots: [33, 38, 40, 33], kick: '........x.......', snare: '........x.......', hat: 'o.o.o.o.o.o.o.o.', bass: 'r.....5.r.......', stab: '..x...x...x...x.', stabGain: 0.05, lead: { scale: [69, 72, 74, 76], prob: 0.1, gain: 0.04 }, echo: 0.5, chordBars: 2 },
  trip: { bpm: 68, chords: [[45, 48, 52, 59], [43, 47, 50, 57], [41, 45, 48, 55], [40, 44, 47, 54]], roots: [33, 31, 29, 28], kick: 'x.......x.x.....', snare: '........x.......', hat: 'o..o..o.o..o..o.', bass: 'r.......r.r.....', bassType: 'sawtooth', pad: { type: 'sawtooth', gain: 0.03, cutoff: 700 }, lead: { scale: [57, 60, 62, 64, 67], prob: 0.15, gain: 0.04 }, echo: 0.7, crackle: true, chordBars: 2 },
  chip: { bpm: 132, chords: [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]], roots: [36, 33, 29, 31], kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: 'r.r.r.r.r.r.r.r.', bassType: 'square', arp: 'abcdabcdabcdabcd', arpType: 'square', arpCutoff: 4000, arpGain: 0.025, lead: { scale: [72, 74, 76, 79, 81, 84], prob: 0.4, gain: 0.03 }, echo: 0.2, drums: 0.6 },
  country: { bpm: 112, swing: 0.05, chords: [[55, 59, 62, 67], [60, 64, 67, 72], [50, 54, 57, 62], [55, 59, 62, 67]], roots: [43, 36, 38, 43], kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: 'r.......5.......', arp: 'a.b.c.b.a.b.c.b.', arpType: 'triangle', arpCutoff: 3200, arpGain: 0.05, stab: '..x...x...x...x.', stabGain: 0.03, lead: { scale: [67, 69, 71, 74, 76], prob: 0.15, gain: 0.05 }, echo: 0.3, drums: 0.6 },
  techno: { bpm: 132, chords: [[45, 52, 57], [45, 52, 57], [43, 50, 55], [41, 48, 53]], roots: [33, 33, 31, 29], kick: 'x...x...x...x...', snare: '................', hat: '.x.x.x.x.x.x.x.x', clap: '....x.......x...', bass: '.r.r.r.r.r.r.r.r', bassType: 'sawtooth', arp: '..a...a...b...a.', arpType: 'square', arpCutoff: 1800, arpGain: 0.03, echo: 0.5, chordBars: 2 },
  latin: { bpm: 108, chords: [[57, 60, 64, 67], [52, 56, 59, 62], [50, 53, 57, 60], [55, 59, 62, 65]], roots: [45, 40, 38, 43], kick: 'x..x..x...x..x..', snare: '..o...o...o...o.', hat: 'x.xxx.xxx.xxx.xx', bass: 'r..5..r.r..5..r.', stab: 'x..x..x.x..x..x.', stabGain: 0.05, lead: { scale: [69, 72, 74, 76, 79], prob: 0.22, gain: 0.05 }, echo: 0.3 },
  jazz: { bpm: 96, swing: 0.2, chords: [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [45, 48, 52, 55]], roots: [38, 31, 36, 33], kick: 'o.......o.......', snare: '....o.......o...', hat: 'x..xx..xx..xx..x', bass: 'r..5r..5r..5r..5', stab: '.x.....x.x......', stabGain: 0.05, lead: { scale: [62, 65, 67, 69, 72, 74], prob: 0.3, gain: 0.05 }, echo: 0.4, drums: 0.5, chordBars: 2 },
  march: { bpm: 120, chords: [[55, 59, 62, 67], [60, 64, 67, 72], [50, 54, 57, 62], [55, 59, 62, 67]], roots: [43, 36, 38, 43], kick: 'x...x...x...x...', snare: '..x...x...x...x.', hat: 'x.x.x.x.x.x.x.x.', bass: 'r...5...r...5...', stab: 'x.x.x.x.x.x.x.x.', stabGain: 0.045, lead: { scale: [67, 71, 74, 76, 79], prob: 0.25, gain: 0.05 }, echo: 0.25 },
  space: { bpm: 90, chords: [[52, 59, 64, 71], [48, 55, 60, 67], [50, 57, 62, 69], [47, 54, 59, 66]], roots: [40, 36, 38, 35], kick: 'o...............', snare: '................', hat: '..o...o...o...o.', bass: 'r...............', arp: 'abcdedcbabcdedcb', arpType: 'sine', arpCutoff: 3600, arpGain: 0.04, pad: { type: 'sine', gain: 0.06, cutoff: 1600 }, echo: 0.8, drums: 0.5, chordBars: 2 },
  rock: { bpm: 128, chords: [[52, 55, 59, 64], [57, 60, 64, 69], [50, 54, 57, 62], [55, 59, 62, 67]], roots: [40, 33, 38, 43], kick: 'x.....x.x.....x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: 'rrrrrrrrrrrrrrrr', bassType: 'sawtooth', stab: 'x.x.x.x.x.x.x.x.', stabGain: 0.045, lead: { scale: [64, 67, 69, 71, 76], prob: 0.2, gain: 0.05 }, echo: 0.3, chordBars: 2 },
  dream: { bpm: 110, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]], roots: [36, 33, 29, 31], kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.o.x.o.x.o.x.o.', bass: 'r.r...r.r.r...r.', arp: 'a.b.c.d.c.b.a.b.', arpType: 'triangle', arpCutoff: 3800, arpGain: 0.04, pad: { type: 'sine', gain: 0.045, cutoff: 2200 }, lead: { scale: [72, 74, 76, 79, 81], prob: 0.2, gain: 0.05 }, echo: 0.6, chordBars: 2 },
  fog: { bpm: 60, chords: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]], roots: [36, 33, 29, 31], kick: '................', snare: '................', hat: '................', bass: 'r...............', arp: 'a.......b...c...', arpCutoff: 3400, arpGain: 0.06, pad: { type: 'sine', gain: 0.06, cutoff: 1800 }, lead: { scale: [72, 74, 76, 79, 81], prob: 0.1, gain: 0.05 }, echo: 0.7, chordBars: 2 },
};

const GENERATORS: Record<string, Generator> = { lofi, rain, drive, drift, ...Object.fromEntries(Object.entries(GROOVES).map(([id, c]) => [id, groove(c)])) };

export class Radio {
  private s: Settings = loadSettings();
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private white: AudioBuffer | null = null;
  private playing: { bus: GainNode; timer: number; gen: ReturnType<Generator> } | null = null;
  /** The browser only lets sound start after the player has pressed something. */
  private unlocked = false;

  get on(): boolean {
    return this.s.on;
  }
  get volume(): number {
    return this.s.volume;
  }
  get station(): Station {
    return STATIONS[this.s.station];
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.s));
    } catch {
      // No storage: the settings last until the page closes.
    }
  }

  /** Call from a click or key press. The first one wakes the audio up, and the radio starts if it is switched on. */
  unlock(): void {
    if (this.unlocked) {
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.unlocked = true;
    const ctx = new Ctor();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = this.s.on ? this.level() : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    this.master = master;
    // A reverb made from decaying noise, shared by every station.
    const len = Math.floor(ctx.sampleRate * 2.6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const rv = ctx.createConvolver();
    rv.buffer = ir;
    const rvGain = ctx.createGain();
    rvGain.gain.value = 0.55;
    rv.connect(rvGain).connect(master);
    this.reverb = rv;
    const white = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const wd = white.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    this.white = white;
    if (this.s.on) this.play();
  }

  private level(): number {
    return this.s.volume * this.s.volume * 0.9;
  }

  /** Start the current station. */
  private play(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.reverb || !this.white) return;
    this.halt();
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
    bus.connect(this.master);
    const white = this.white;
    const reverb = this.reverb;
    // A feedback echo each station can send notes to.
    const echo = ctx.createGain();
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.36;
    const echoTone = ctx.createBiquadFilter();
    echoTone.type = 'lowpass';
    echoTone.frequency.value = 2400;
    echo.connect(delay).connect(echoTone);
    echoTone.connect(fb).connect(delay);
    echoTone.connect(bus);
    const kit: Kit = {
      ctx,
      bus,
      reverb,
      echo,
      white,
      tone: (freq, t, dur, o = {}) => {
        const osc = ctx.createOscillator();
        osc.type = o.type ?? 'sine';
        osc.frequency.value = freq;
        osc.detune.value = o.detune ?? 0;
        const g = ctx.createGain();
        const a = o.attack ?? 0.01;
        const r = o.release ?? 0.3;
        const peak = o.gain ?? 0.1;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + a);
        g.gain.setValueAtTime(peak, t + Math.max(a, dur - r * 0.2));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
        let node: AudioNode = osc;
        if (o.cutoff) {
          const f = ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = o.cutoff;
          node.connect(f);
          node = f;
        }
        node.connect(g);
        if (o.trem) {
          const lfo = ctx.createOscillator();
          lfo.frequency.value = o.trem;
          const depth = ctx.createGain();
          depth.gain.value = peak * 0.25;
          lfo.connect(depth).connect(g.gain);
          lfo.start(t);
          lfo.stop(t + dur + r + 0.1);
        }
        g.connect(bus);
        if (o.send) {
          const sg = ctx.createGain();
          sg.gain.value = o.send;
          g.connect(sg).connect(reverb);
        }
        if (o.echo) {
          const eg = ctx.createGain();
          eg.gain.value = o.echo;
          g.connect(eg).connect(echo);
        }
        osc.start(t);
        osc.stop(t + dur + r + 0.1);
      },
      hit: (kind, t, vel = 1) => {
        if (kind === 'kick') {
          const o = ctx.createOscillator();
          o.frequency.setValueAtTime(130, t);
          o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.3 * vel, t + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
          o.connect(g).connect(bus);
          o.start(t);
          o.stop(t + 0.3);
          return;
        }
        const n = ctx.createBufferSource();
        n.buffer = white;
        const f = ctx.createBiquadFilter();
        const g = ctx.createGain();
        if (kind === 'hat') {
          f.type = 'highpass';
          f.frequency.value = 5500;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.06 * vel, t + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
        } else {
          f.type = 'bandpass';
          f.frequency.value = kind === 'clap' ? 1300 : 1500;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime((kind === 'clap' ? 0.14 : 0.11) * vel, t + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'clap' ? 0.2 : 0.17));
        }
        n.connect(f).connect(g).connect(bus);
        n.start(t, rand(0, 2));
        n.stop(t + 0.3);
      },
    };
    const gen = GENERATORS[this.station.id](kit);
    const timer = window.setInterval(() => gen.tick(ctx.currentTime), 100);
    gen.tick(ctx.currentTime);
    this.playing = { bus, timer, gen };
  }

  /** Fade the current station out and let it go. */
  private halt(): void {
    const p = this.playing;
    const ctx = this.ctx;
    if (!p || !ctx) return;
    this.playing = null;
    window.clearInterval(p.timer);
    p.bus.gain.cancelScheduledValues(ctx.currentTime);
    p.bus.gain.setValueAtTime(p.bus.gain.value, ctx.currentTime);
    p.bus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
    window.setTimeout(() => {
      p.gen.stop();
      p.bus.disconnect();
    }, 900);
  }

  toggle(): void {
    this.s.on = !this.s.on;
    this.save();
    this.unlock();
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(this.s.on ? this.level() : 0, this.ctx.currentTime, 0.1);
    if (this.s.on) this.play();
    else this.halt();
  }

  setStation(i: number): void {
    this.s.station = (i + STATIONS.length) % STATIONS.length;
    this.s.on = true;
    this.save();
    this.unlock();
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.1);
    this.play();
  }

  next(): void {
    this.setStation(this.s.station + 1);
  }

  prev(): void {
    this.setStation(this.s.station - 1);
  }

  setVolume(v: number): void {
    this.s.volume = Math.max(0, Math.min(1, v));
    this.save();
    if (this.ctx && this.master && this.s.on) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.05);
  }
}
