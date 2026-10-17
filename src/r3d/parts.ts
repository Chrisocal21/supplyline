// Builds one merged, vertex-coloured geometry out of simple primitives, so a whole building is a single draw call.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface Place {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  /** Surface pattern id for the building shader (0 plain, 1 brick, 2 siding, 3 stucco, 4 roof tiles, 5 corrugated metal, 6 concrete, 7 curtain wall). */
  t?: number;
}

export class Parts {
  /** Pattern id given to parts added from now on, unless a part says otherwise. */
  tex = 0;
  /**
   * Where the building that parts added from now on belong to stands (x, z), so an animation can raise it as one piece.
   * When unset, each part is its own anchor.
   */
  anchor: [number, number] | null = null;
  private readonly list: THREE.BufferGeometry[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly e = new THREE.Euler();
  private readonly q = new THREE.Quaternion();

  private add(geo: THREE.BufferGeometry, color: number, o: Place): this {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    this.e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, 'YXZ');
    this.q.setFromEuler(this.e);
    this.m.compose(new THREE.Vector3(o.x ?? 0, o.y ?? 0, o.z ?? 0), this.q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(this.m);
    const c = new THREE.Color(color);
    const count = g.getAttribute('position').count;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.setAttribute('mid', new THREE.BufferAttribute(new Float32Array(count).fill(o.t ?? this.tex), 1));
    this.setAnchor(g, count, o.x ?? 0, o.z ?? 0);
    this.list.push(g);
    return this;
  }

  /** Add geometry that is already positioned by a full matrix (for pieces laid along curved roads). */
  private addMatrix(geo: THREE.BufferGeometry, color: number, m: THREE.Matrix4): this {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    g.applyMatrix4(m);
    const c = new THREE.Color(color);
    const count = g.getAttribute('position').count;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.setAttribute('mid', new THREE.BufferAttribute(new Float32Array(count).fill(this.tex), 1));
    this.setAnchor(g, count, m.elements[12], m.elements[14]);
    this.list.push(g);
    return this;
  }

  private setAnchor(g: THREE.BufferGeometry, count: number, x: number, z: number): void {
    const [ax, az] = this.anchor ?? [x, z];
    const arr = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      arr[i * 2] = ax;
      arr[i * 2 + 1] = az;
    }
    g.setAttribute('anc', new THREE.BufferAttribute(arr, 2));
  }

  boxM(w: number, h: number, d: number, color: number, m: THREE.Matrix4): this {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    return this.addMatrix(g, color, m);
  }

  cylM(rTop: number, rBot: number, h: number, color: number, m: THREE.Matrix4, seg = 10): this {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    g.translate(0, h / 2, 0);
    return this.addMatrix(g, color, m);
  }

  get count(): number {
    return this.list.length;
  }

  /** Box with its base at y. */
  box(w: number, h: number, d: number, color: number, o: Place = {}): this {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    return this.add(g, color, o);
  }

  /** Cylinder (or truncated cone) with its base at y. */
  cyl(rTop: number, rBot: number, h: number, color: number, o: Place = {}, seg = 16): this {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    g.translate(0, h / 2, 0);
    return this.add(g, color, o);
  }

  cone(r: number, h: number, color: number, o: Place = {}, seg = 8): this {
    return this.cyl(0, r, h, color, o, seg);
  }

  /** Upper half of a sphere, sitting on y. */
  dome(r: number, color: number, o: Place = {}): this {
    const g = new THREE.SphereGeometry(r, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    return this.add(g, color, o);
  }

  sphere(r: number, color: number, o: Place = {}, detail = 1): this {
    return this.add(new THREE.IcosahedronGeometry(r, detail), color, o);
  }

  /**
   * A flat-topped solid of any outline: the polygon `points` (x, z), with optional holes, stood up from y to y + h. Used for
   * the true shapes of things: a rounded stadium bowl, a baseball outfield, a rink.
   */
  prism(points: [number, number][], h: number, color: number, o: Place = {}, holes: [number, number][][] = []): this {
    const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
    for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z))));
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2);
    return this.add(g, color, o);
  }

  /** Gable roof: width w across x, length d along z, ridge h high. Base at y. */
  gable(w: number, h: number, d: number, color: number, o: Place = {}): this {
    const a = w / 2;
    const b = d / 2;
    // prettier-ignore
    const v = [
      -a, 0, -b, -a, 0, b, 0, h, b,
      -a, 0, -b, 0, h, b, 0, h, -b,
      a, 0, b, a, 0, -b, 0, h, -b,
      a, 0, b, 0, h, -b, 0, h, b,
      -a, 0, b, a, 0, b, 0, h, b,
      a, 0, -b, -a, 0, -b, 0, h, -b,
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
    g.computeVertexNormals();
    return this.add(g, color, { t: 4, ...o });
  }

  /** A flat pad with a foundation block under it, so the building sits on slopes without a gap. */
  slab(w: number, d: number, color: number, o: Place = {}): this {
    this.box(w, 0.04, d, color, { ...o, t: 6 });
    return this.box(w * 0.97, 1.5, d * 0.97, 0x6d6b66, { ...o, y: (o.y ?? 0) - 1.5, t: 6 });
  }

  build(): THREE.BufferGeometry {
    const g = mergeGeometries(this.list, false)!;
    g.computeBoundingSphere();
    for (const l of this.list) l.dispose();
    return g;
  }
}
