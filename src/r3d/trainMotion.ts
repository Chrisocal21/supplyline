import type { PathPoint } from './roads';

/** Converts simulation tile progress to distance on the rendered track. */
export class TrackDistance {
  private readonly distances: number[] = [0];
  private readonly steps: number;
  readonly length: number;

  constructor(private readonly last: number, private readonly sample: (f: number, dir: 1 | -1) => PathPoint) {
    this.steps = Math.max(1, Math.ceil(last * 24));
    let prev = sample(0, 1).pos;
    for (let i = 1; i <= this.steps; i++) {
      const next = sample(last * i / this.steps, 1).pos;
      this.distances.push(this.distances[i - 1] + prev.distanceTo(next));
      prev = next;
    }
    this.length = this.distances[this.steps];
  }

  distance(f: number): number {
    const t = (this.last > 0 ? Math.max(0, Math.min(1, f / this.last)) : 0) * this.steps;
    const i = Math.min(this.steps - 1, Math.floor(t));
    return this.distances[i] + (this.distances[i + 1] - this.distances[i]) * (t - i);
  }

  point(distance: number, dir: 1 | -1): PathPoint {
    const d = Math.max(0, Math.min(this.length, distance));
    let lo = 0;
    let hi = this.steps;
    while (hi - lo > 1) {
      const mid = (lo + hi) >>> 1;
      if (this.distances[mid] <= d) lo = mid;
      else hi = mid;
    }
    const span = this.distances[hi] - this.distances[lo];
    const t = span > 0 ? (d - this.distances[lo]) / span : 0;
    return this.sample(this.last * (lo + t) / this.steps, dir);
  }
}
