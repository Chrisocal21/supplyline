// Sound effects: the hum of engines near where you are looking, the bed of the place (wind, birds by day, crickets by night),
// and short sounds for a click, a build and a warning. All of it is made live in the browser, so there are no files.

const KEY = 'sl-sfx';

/** What the game tells the sound each moment about the scene the camera is looking at. */
export interface AudioScene {
  /** How far the camera is from the ground, in the camera's own units: close is small. */
  dist: number;
  /** Moving vehicles near the view, each weighted by how close it is (0 to 1), by kind of vehicle. */
  road: number;
  rail: number;
  sea: number;
  air: number;
  night: boolean;
  winter: boolean;
  /** How near a town is to the view (0 to 1). */
  town: number;
  paused: boolean;
  /** Every moving vehicle in the world by kind, for the soft bed of traffic heard from a wide view. */
  all: { road: number; rail: number; sea: number; air: number };
}

interface Settings {
  on: boolean;
  volume: number;
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Settings>;
      return { on: s.on !== false, volume: typeof s.volume === 'number' ? Math.max(0, Math.min(1, s.volume)) : 0.5 };
    }
  } catch {
    // No storage: the defaults stand.
  }
  return { on: true, volume: 0.5 };
}

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

export class Sfx {
  private s: Settings = load();
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private road: GainNode | null = null;
  private roadOsc: OscillatorNode | null = null;
  private rail: GainNode | null = null;
  private railBeat: GainNode | null = null;
  private sea: GainNode | null = null;
  private air: GainNode | null = null;
  private wind: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private town: GainNode | null = null;
  private nextBird = 0;
  private nextHorn = { road: 0, rail: 0, sea: 0, air: 0 };
  private nextCricket = 0;
  private lastClick = 0;

  get on(): boolean {
    return this.s.on;
  }
  get volume(): number {
    return this.s.volume;
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.s));
    } catch {
      // No storage: the settings last until the page closes.
    }
  }

  private level(): number {
    return this.s.on ? this.s.volume * this.s.volume * 0.9 : 0;
  }

  /** Wake the sound up on the first click or key press, as browsers insist. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = this.level();
    master.connect(ctx.destination);
    this.master = master;
    const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      // Slightly brown noise: softer than white, like wind and rumble.
      last = (last + (Math.random() * 2 - 1) * 0.12) / 1.03;
      d[i] = last * 5;
    }
    const loop = (): AudioBufferSourceNode => {
      const n = ctx.createBufferSource();
      n.buffer = noise;
      n.loop = true;
      return n;
    };
    const voice = (): GainNode => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(master);
      return g;
    };

    // Road: an engine note with a rough edge.
    this.road = voice();
    const ro = ctx.createOscillator();
    ro.type = 'sawtooth';
    ro.frequency.value = 62;
    const rf = ctx.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.value = 260;
    ro.connect(rf).connect(this.road);
    ro.start();
    this.roadOsc = ro;
    const rn = loop();
    const rnf = ctx.createBiquadFilter();
    rnf.type = 'lowpass';
    rnf.frequency.value = 340;
    const rng = ctx.createGain();
    rng.gain.value = 0.5;
    rn.connect(rnf).connect(rng).connect(this.road);
    rn.start();

    // Rail: a low rumble with a beat, wheels on the joints.
    this.rail = voice();
    const tn = loop();
    const tf = ctx.createBiquadFilter();
    tf.type = 'lowpass';
    tf.frequency.value = 220;
    this.railBeat = ctx.createGain();
    this.railBeat.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 3.2;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.4;
    lfo.connect(lfoDepth).connect(this.railBeat.gain);
    lfo.start();
    tn.connect(tf).connect(this.railBeat).connect(this.rail);
    tn.start();

    // Sea: water along a hull.
    this.sea = voice();
    const sn = loop();
    const sf = ctx.createBiquadFilter();
    sf.type = 'bandpass';
    sf.frequency.value = 420;
    sf.Q.value = 0.6;
    sn.connect(sf).connect(this.sea);
    sn.start();

    // Air: a high steady rush.
    this.air = voice();
    const an = loop();
    const af = ctx.createBiquadFilter();
    af.type = 'bandpass';
    af.frequency.value = 1500;
    af.Q.value = 0.5;
    an.connect(af).connect(this.air);
    an.start();

    // Wind: the bed of the place.
    this.wind = voice();
    const wn = loop();
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 500;
    wn.connect(this.windFilter).connect(this.wind);
    wn.start();

    // A town's low murmur.
    this.town = voice();
    const tw = loop();
    const twf = ctx.createBiquadFilter();
    twf.type = 'bandpass';
    twf.frequency.value = 300;
    twf.Q.value = 0.4;
    tw.connect(twf).connect(this.town);
    tw.start();
  }

  setOn(on: boolean): void {
    this.s.on = on;
    this.save();
    this.unlock();
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.1);
  }

  setVolume(v: number): void {
    this.s.volume = Math.max(0, Math.min(1, v));
    this.save();
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.05);
  }

  private ease(g: GainNode | null, to: number): void {
    if (g && this.ctx) g.gain.setTargetAtTime(to, this.ctx.currentTime, 0.35);
  }

  /** Called a few times a second with what the camera is looking at. */
  update(sc: AudioScene): void {
    const ctx = this.ctx;
    if (!ctx || !this.s.on) return;
    // Close to the ground you hear the place; from space you hear almost nothing.
    const near = 1 - Math.max(0, Math.min(1, (sc.dist - 20) / 220));
    const live = sc.paused ? 0.25 : 1;
    const eng = near * live;
    // Pulled back to see the whole network, a quiet bed of traffic: it grows slowly with how many are moving, never past a low
    // ceiling, and fades out again toward space. Up close, the vehicles you are on top of stand out above it.
    const wide = Math.max(0, Math.min(1, (sc.dist - 20) / 100)) * (1 - Math.max(0, Math.min(1, (sc.dist - 350) / 450))) * live;
    const bed = (n: number, ceil: number): number => Math.min(ceil, Math.sqrt(n) * ceil * 0.3) * wide;
    const close = 1 + near * 0.6;
    this.ease(this.road, Math.max(Math.min(1, sc.road) * 0.16 * eng * close, bed(sc.all.road, 0.05)));
    if (this.roadOsc) this.roadOsc.frequency.setTargetAtTime(58 + Math.min(1, sc.road) * 18, ctx.currentTime, 0.4);
    this.ease(this.rail, Math.max(Math.min(1, sc.rail) * 0.2 * eng * close, bed(sc.all.rail, 0.04)));
    this.ease(this.sea, Math.max(Math.min(1, sc.sea) * 0.12 * eng, bed(sc.all.sea, 0.025)));
    this.ease(this.air, Math.max(Math.min(1, sc.air) * 0.07 * eng, bed(sc.all.air, 0.015)));
    this.ease(this.wind, (sc.winter ? 0.12 : 0.05) * near);
    if (this.windFilter) this.windFilter.frequency.setTargetAtTime(sc.winter ? 700 : 420, ctx.currentTime, 0.5);
    this.ease(this.town, Math.min(1, sc.town) * 0.05 * near * (sc.night ? 0.5 : 1));
    // Now and then a horn or whistle from the traffic: louder near the camera, a faint far-off note from a wide view. The gap
    // between them is long and only shortens a little with a busy network, so it stays a touch of life and never a din.
    if (!sc.paused) {
      const now = ctx.currentTime;
      (['road', 'rail', 'sea', 'air'] as const).forEach((m) => {
        const n = sc.all[m];
        if (n <= 0 || now < this.nextHorn[m]) return;
        this.nextHorn[m] = now + (rand(7, 18) * (m === 'road' ? 1 : 1.8)) / (1 + 0.12 * Math.sqrt(n));
        const level = Math.max(Math.min(1, sc[m]) * near * 0.06, wide * 0.02);
        if (level < 0.004) return;
        const far = Math.min(1, sc[m]) * near < 0.3;
        this.horn(m, level, far ? 700 : 1800);
      });
    }
    // Birds by day and crickets by night, when you are down among the fields.
    if (near > 0.5 && !sc.paused) {
      const now = ctx.currentTime;
      if (!sc.night && !sc.winter && now > this.nextBird) {
        this.chirp(0.04 * near);
        this.nextBird = now + rand(1.2, 5.5);
      }
      if (sc.night && now > this.nextCricket) {
        this.cricket(0.03 * near);
        this.nextCricket = now + rand(0.35, 1.1);
      }
    }
  }

  private tone(freq: number, t: number, dur: number, gain: number, type: OscillatorType = 'sine', slide = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** One horn note: a few detuned notes through a low-pass, which is how a far-off horn sounds. */
  private horn(mode: 'road' | 'rail' | 'sea' | 'air', gain: number, cutoff: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + 0.05;
    // Notes in Hz, a start gap and a length for each kind of horn.
    const voices: Record<typeof mode, { notes: number[]; dur: number; again: number; type: OscillatorType }> = {
      road: { notes: pick([[392, 494], [330, 415], [440, 554]]), dur: rand(0.12, 0.3), again: Math.random() < 0.4 ? 0.28 : 0, type: 'square' },
      rail: { notes: [330, 415, 494], dur: rand(1.1, 1.8), again: Math.random() < 0.5 ? 1.9 : 0, type: 'sawtooth' },
      sea: { notes: [98, 123], dur: rand(1.8, 2.6), again: 0, type: 'sawtooth' },
      air: { notes: [880, 1175], dur: rand(0.5, 0.9), again: 0, type: 'sine' },
    };
    const v = voices[mode];
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = mode === 'sea' ? Math.min(cutoff, 500) : cutoff;
    f.connect(this.master);
    for (const at of v.again ? [0, v.again] : [0]) {
      v.notes.forEach((hz) => {
        const o = ctx.createOscillator();
        o.type = v.type;
        o.frequency.value = hz * rand(0.995, 1.005);
        const g = ctx.createGain();
        const s = t + at;
        const peak = gain / v.notes.length;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.linearRampToValueAtTime(peak, s + (mode === 'road' ? 0.02 : 0.15));
        g.gain.setValueAtTime(peak, s + v.dur);
        g.gain.exponentialRampToValueAtTime(0.0001, s + v.dur + (mode === 'road' ? 0.08 : 0.5));
        o.connect(g).connect(f);
        o.start(s);
        o.stop(s + v.dur + 0.7);
      });
    }
    window.setTimeout(() => f.disconnect(), (v.dur + (v.again || 0) + 1.5) * 1000);
  }

  private chirp(gain: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    const base = rand(2400, 4200);
    const n = Math.floor(rand(2, 5));
    for (let i = 0; i < n; i++) this.tone(base * (1 + i * 0.07), t + i * 0.09, 0.07, gain, 'sine', rand(0.8, 1.3));
  }

  private cricket(gain: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    for (let i = 0; i < 3; i++) this.tone(4300 + rand(-80, 80), t + i * 0.05, 0.03, gain, 'square');
  }

  /** A small tick for pressing something. */
  click(): void {
    const ctx = this.ctx;
    if (!ctx || !this.s.on) return;
    const now = performance.now();
    if (now - this.lastClick < 40) return;
    this.lastClick = now;
    this.tone(1250, ctx.currentTime, 0.05, 0.18, 'triangle', 0.7);
  }

  /** Something was built: a soft thud and a bright note. */
  build(): void {
    const ctx = this.ctx;
    if (!ctx || !this.s.on) return;
    const t = ctx.currentTime;
    this.tone(120, t, 0.18, 0.5, 'sine', 0.5);
    this.tone(660, t + 0.06, 0.2, 0.16, 'triangle');
    this.tone(990, t + 0.14, 0.3, 0.12, 'triangle');
  }

  /** Money in: two quick bright notes. */
  coin(): void {
    const ctx = this.ctx;
    if (!ctx || !this.s.on) return;
    const t = ctx.currentTime;
    this.tone(1320, t, 0.09, 0.14, 'square');
    this.tone(1760, t + 0.08, 0.22, 0.14, 'square');
  }

  /** A level or a tier: a short rising line. */
  fanfare(): void {
    const ctx = this.ctx;
    if (!ctx || !this.s.on) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.1, 0.35, 0.16, 'triangle'));
  }

  /** Something could not be done. */
  warn(): void {
    const ctx = this.ctx;
    if (!ctx || !this.s.on) return;
    const t = ctx.currentTime;
    this.tone(180, t, 0.16, 0.2, 'sawtooth', 0.8);
    this.tone(150, t + 0.12, 0.2, 0.2, 'sawtooth', 0.8);
  }
}
