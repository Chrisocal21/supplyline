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
  trem?: number;
}

type Generator = (kit: Kit) => { tick: (now: number) => void; stop: () => void };

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

// ---- the stations ----

/** Lo-Fi Chill: seventh chords on a soft electric piano, a lazy swung beat, a walking bass and crackle. */
const lofi: Generator = (k) => {
  const bpm = 74;
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

const GENERATORS: Record<string, Generator> = { lofi, rain, drive, drift };

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
    const kit: Kit = {
      ctx,
      bus,
      reverb,
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
        osc.start(t);
        osc.stop(t + dur + r + 0.1);
      },
      hit: (kind, t, vel = 1) => {
        if (kind === 'kick') {
          const o = ctx.createOscillator();
          o.frequency.setValueAtTime(130, t);
          o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.4 * vel, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
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
          f.frequency.value = 7000;
          g.gain.setValueAtTime(0.09 * vel, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        } else {
          f.type = 'bandpass';
          f.frequency.value = kind === 'clap' ? 1500 : 1800;
          g.gain.setValueAtTime((kind === 'clap' ? 0.2 : 0.16) * vel, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'clap' ? 0.16 : 0.13));
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
