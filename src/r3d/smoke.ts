// Chimney smoke over running processing buildings, so a working base looks alive.
import * as THREE from 'three';

const POOL = 90;
const LIFE = 3.2;

interface Puff {
  sprite: THREE.Sprite;
  age: number;
  vx: number;
  vz: number;
}

function puffTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(235,235,235,0.9)');
  g.addColorStop(0.6, 'rgba(210,210,214,0.45)');
  g.addColorStop(1, 'rgba(200,200,205,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Smoke {
  readonly group = new THREE.Group();
  private readonly puffs: Puff[] = [];
  private readonly spawn = new Map<number, number>();
  private readonly tmp = new THREE.Vector3();

  constructor() {
    const tex = puffTexture();
    for (let i = 0; i < POOL; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.group.add(sprite);
      this.puffs.push({ sprite, age: LIFE, vx: 0, vz: 0 });
    }
  }

  /** `sources` are chimney tops (world position and up direction) keyed by site id. */
  update(dt: number, sources: Map<number, { pos: THREE.Vector3; up: THREE.Vector3; every?: number }>): void {
    for (const [id, s] of sources) {
      const t = (this.spawn.get(id) ?? Math.random() * 0.6) - dt;
      if (t <= 0) {
        const p = this.puffs.find((q) => q.age >= LIFE);
        if (p) {
          p.age = 0;
          p.vx = (Math.random() - 0.5) * 0.25;
          p.vz = (Math.random() - 0.5) * 0.25;
          p.sprite.position.copy(s.pos);
          p.sprite.userData.up = s.up.clone();
          p.sprite.visible = true;
        }
        this.spawn.set(id, s.every ?? 0.55 + Math.random() * 0.3);
      } else this.spawn.set(id, t);
    }
    for (const p of this.puffs) {
      if (p.age >= LIFE) continue;
      p.age += dt;
      if (p.age >= LIFE) {
        p.sprite.visible = false;
        continue;
      }
      const k = p.age / LIFE;
      const up = p.sprite.userData.up as THREE.Vector3;
      p.sprite.position.addScaledVector(up, dt * 0.7);
      this.tmp.set(p.vx, 0, p.vz);
      p.sprite.position.addScaledVector(this.tmp, dt);
      const size = 0.35 + k * 1.3;
      p.sprite.scale.set(size, size, 1);
      (p.sprite.material as THREE.SpriteMaterial).opacity = 0.5 * (1 - k) * Math.min(1, k * 8);
    }
    for (const id of [...this.spawn.keys()]) if (!sources.has(id)) this.spawn.delete(id);
  }
}
