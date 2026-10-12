// Orbit camera for the globe: it looks at a point on the ground, from a distance, heading and tilt.
// Zooming in tilts the view toward the horizon automatically, so close-ups feel like a 3D city builder.
import * as THREE from 'three';
import { HeightField, MAX_RELIEF, R, lonLatToVec, surfaceFrame, vecToLonLat } from './geo';

export const MIN_DIST = 9;
export const MAX_DIST = 520;
const FOV = 45;

const wrapAngle = (a: number): number => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

export class GlobeCamera {
  /** What the camera is moving toward; the visible values ease toward these. */
  target = { lon: 0, lat: 0.25, dist: 330, heading: 0, pitch: 0 };
  lon = 0;
  lat = 0.25;
  dist = 330;
  heading = 0;
  /** Extra tilt the player added with the mouse, on top of the automatic tilt. */
  pitchManual = 0;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private readonly hf: HeightField,
  ) {
    camera.fov = FOV;
  }

  /** Tilt from straight-down: automatic with zoom, plus the player's own adjustment. */
  get pitch(): number {
    const auto = (1 - THREE.MathUtils.smoothstep(this.dist, 30, 200)) * 0.95;
    return THREE.MathUtils.clamp(auto + this.pitchManual, 0, 1.35);
  }

  /** Jump straight to a view. */
  set(lon: number, lat: number, dist: number, heading = 0, pitchManual = 0): void {
    this.lon = this.target.lon = lon;
    this.lat = this.target.lat = lat;
    this.dist = this.target.dist = dist;
    this.heading = this.target.heading = heading;
    this.pitchManual = this.target.pitch = pitchManual;
  }

  focusOn(lon: number, lat: number, dist?: number): void {
    this.target.lon = lon;
    this.target.lat = THREE.MathUtils.clamp(lat, -1.45, 1.45);
    if (dist !== undefined) this.target.dist = THREE.MathUtils.clamp(dist, MIN_DIST, MAX_DIST);
  }

  /** Drag the ground: a pixel move in the viewport shifts the focus point the opposite way. */
  panPixels(dx: number, dy: number, viewportH: number): void {
    const upp = (2 * this.dist * Math.tan((FOV * Math.PI) / 360)) / viewportH;
    const { east, north } = surfaceFrame(this.lon, this.lat);
    const h = north.clone().multiplyScalar(Math.cos(this.heading)).addScaledVector(east, Math.sin(this.heading));
    const up = lonLatToVec(this.lon, this.lat, 1);
    const right = new THREE.Vector3().crossVectors(h, up).normalize();
    const move = right.multiplyScalar(-dx * upp).addScaledVector(h, dy * upp);
    const cosLat = Math.max(0.2, Math.cos(this.lat));
    this.moveFocus((move.dot(east) / (R * cosLat)), move.dot(north) / R);
  }

  /** Move the focus by an angle, immediately. */
  moveFocus(dLon: number, dLat: number): void {
    this.target.lon = this.lon = wrapAngle(this.lon + dLon);
    this.target.lat = this.lat = THREE.MathUtils.clamp(this.lat + dLat, -1.45, 1.45);
  }

  /** Pan with the keyboard, in screen directions, at a speed that scales with zoom. */
  panKeys(right: number, forward: number, dt: number): void {
    const speed = (this.dist * 0.9 * dt) / R;
    const { east, north } = surfaceFrame(this.lon, this.lat);
    const h = north.clone().multiplyScalar(Math.cos(this.heading)).addScaledVector(east, Math.sin(this.heading));
    const up = lonLatToVec(this.lon, this.lat, 1);
    const r = new THREE.Vector3().crossVectors(h, up).normalize();
    const move = r.multiplyScalar(right).addScaledVector(h, forward);
    this.moveFocus((move.dot(east) * speed) / Math.max(0.2, Math.cos(this.lat)), move.dot(north) * speed);
  }

  rotate(dHeading: number, dPitch: number): void {
    this.target.heading = this.heading = wrapAngle(this.heading + dHeading);
    this.pitchManual = this.target.pitch = THREE.MathUtils.clamp(this.pitchManual + dPitch, -0.6, 0.9);
  }

  zoom(factor: number): void {
    this.target.dist = THREE.MathUtils.clamp(this.target.dist * factor, MIN_DIST, MAX_DIST);
  }

  /** Ease the visible values toward their targets. */
  update(dt: number): void {
    const k = 1 - Math.exp(-dt * 10);
    this.dist += (this.target.dist - this.dist) * k;
    this.lon = wrapAngle(this.lon + wrapAngle(this.target.lon - this.lon) * k);
    this.lat += (this.target.lat - this.lat) * k;
  }

  /** The point on the ground the camera looks at. */
  focusPoint(out = new THREE.Vector3()): THREE.Vector3 {
    return lonLatToVec(this.lon, this.lat, this.hf.radius(this.lon, this.lat), out);
  }

  /** Place the Three.js camera. */
  apply(): void {
    const F = this.focusPoint();
    const { east, north } = surfaceFrame(this.lon, this.lat);
    const up = F.clone().normalize();
    const h = north.clone().multiplyScalar(Math.cos(this.heading)).addScaledVector(east, Math.sin(this.heading));
    const pitch = this.pitch;
    const pos = F.clone().addScaledVector(up, this.dist * Math.cos(pitch)).addScaledVector(h, -this.dist * Math.sin(pitch));
    this.camera.position.copy(pos);
    this.camera.up.copy(h);
    this.camera.lookAt(F);
    this.camera.near = THREE.MathUtils.clamp(this.dist * 0.03, 0.4, 12);
    this.camera.far = 4000;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  /** Camera position as a lon/lat and altitude above the globe centre, for lighting and fog. */
  height(): number {
    return this.camera.position.length() - R;
  }
}

/** Where a ray first meets the ground, found by marching through the relief shell and refining. */
export function pickGround(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  hf: HeightField,
): { lon: number; lat: number; point: THREE.Vector3 } | null {
  const shell = R + MAX_RELIEF + 1;
  const b = origin.dot(dir);
  const c = origin.lengthSq() - shell * shell;
  const disc = b * b - c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const t0 = Math.max(0, -b - root);
  const t1 = -b + root;
  if (t1 <= 0) return null;
  const steps = 220;
  const dt = (t1 - t0) / steps;
  const p = new THREE.Vector3();
  const below = (t: number): boolean => {
    p.copy(dir).multiplyScalar(t).add(origin);
    const { lon, lat } = vecToLonLat(p);
    return p.length() <= hf.radius(lon, lat);
  };
  let prev = t0;
  for (let i = 0; i <= steps; i++) {
    const t = t0 + dt * i;
    if (below(t)) {
      let lo = i === 0 ? t0 : prev;
      let hi = t;
      for (let k = 0; k < 14; k++) {
        const mid = (lo + hi) / 2;
        if (below(mid)) hi = mid;
        else lo = mid;
      }
      p.copy(dir).multiplyScalar(hi).add(origin);
      const { lon, lat } = vecToLonLat(p);
      return { lon, lat, point: p.clone() };
    }
    prev = t;
  }
  return null;
}
