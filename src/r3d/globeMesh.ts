// The globe itself: displaced terrain mesh with the painted texture, plus atmosphere and stars.
import * as THREE from 'three';
import type { World } from '../sim/world';
import { CAP_ROWS, HeightField, MESH_SUB, R, lonLatToVec, textureRows } from './geo';
import type { Pixels } from './paint';
import { seasonLook } from './season';


function canvasFrom(p: Pixels): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = p.width;
  c.height = p.height;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(p.data), p.width, p.height), 0, 0);
  return c;
}

/** Small tileable greyscale noise, multiplied over the colour map so close-ups keep fine grain. */
function detailTexture(): THREE.Texture {
  const size = 256;
  const cells = [8, 16, 32, 64];
  const out = new Float32Array(size * size);
  let seed = 99;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  cells.forEach((c, oi) => {
    const lat = new Float32Array(c * c);
    for (let i = 0; i < lat.length; i++) lat[i] = rand();
    const amp = 1 / (1 + oi * 0.8);
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * c;
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * c;
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        const a = lat[(y0 % c) * c + (x0 % c)];
        const b = lat[(y0 % c) * c + ((x0 + 1) % c)];
        const d = lat[((y0 + 1) % c) * c + (x0 % c)];
        const e = lat[((y0 + 1) % c) * c + ((x0 + 1) % c)];
        out[y * size + x] += (a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + d * (1 - tx) * ty + e * tx * ty) * amp;
      }
    }
  });
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of out) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < out.length; i++) {
    const v = ((out[i] - lo) / (hi - lo)) * 255;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.CanvasTexture(canvasFrom({ data, width: size, height: size }));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export interface Globe {
  terrain: THREE.Group;
  update(seconds: number): void;
  /** Pick each ground chunk's detail from where the camera is: chunks past the horizon are not drawn, and chunks far from the
   *  camera (or all of them, from far out) use a quarter of the triangles, one quad a tile, where the bumps cannot be seen. */
  setDetail(eye: THREE.Vector3): void;
  /** Re-sample the height of these tiles (and refresh normals), after roads regrade the ground. */
  regrade(tiles: Iterable<number>): void;
  atmosphere: THREE.Mesh;
  stars: THREE.Points;
  dispose(): void;
}


export function buildGlobe(world: World, hf: HeightField, color: Pixels, rough: Pixels, maxAnisotropy: number): Globe {
  const SUB = MESH_SUB;
  const rows = textureRows(world);
  const lonSeg = world.width * SUB;
  const latSeg = rows * SUB;
  const cols = lonSeg + 1;
  const vertCount = cols * (latSeg + 1);
  const pos = new Float32Array(vertCount * 3);
  const uv = new Float32Array(vertCount * 2);
  const tmp = new THREE.Vector3();

  for (let j = 0; j <= latSeg; j++) {
    const lat = Math.PI / 2 - (Math.PI * j) / latSeg;
    for (let i = 0; i <= lonSeg; i++) {
      const lon = -Math.PI + (Math.PI * 2 * i) / lonSeg;
      const k = j * cols + i;
      lonLatToVec(lon, lat, hf.radius(lon, lat), tmp);
      pos[k * 3] = tmp.x;
      pos[k * 3 + 1] = tmp.y;
      pos[k * 3 + 2] = tmp.z;
      uv[k * 2] = i / lonSeg;
      uv[k * 2 + 1] = 1 - j / latSeg;
    }
  }
  const index = new Uint32Array(lonSeg * latSeg * 6);
  let n = 0;
  for (let j = 0; j < latSeg; j++) {
    for (let i = 0; i < lonSeg; i++) {
      const a = j * cols + i;
      const c = a + cols;
      index[n++] = a;
      index[n++] = c;
      index[n++] = a + 1;
      index[n++] = a + 1;
      index[n++] = c;
      index[n++] = c + 1;
    }
  }
  // The attributes live on one geometry; the ground is drawn as chunks of tiles that share them, each with its own indices and
  // bounds, so the ones off screen (or round the far side of the globe) are skipped instead of all being drawn every frame.
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeVertexNormals();
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute;
  // The first and last column are the same meridian; share their normals so the seam does not show.
  for (let j = 0; j <= latSeg; j++) {
    const a = j * cols;
    const b = a + lonSeg;
    const x = nrm.getX(a) + nrm.getX(b);
    const y = nrm.getY(a) + nrm.getY(b);
    const z = nrm.getZ(a) + nrm.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    nrm.setXYZ(a, x / l, y / l, z / l);
    nrm.setXYZ(b, x / l, y / l, z / l);
  }
  geo.setIndex(null);
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

  const CHUNK_QUADS = 32 * SUB;
  interface Chunk {
    geo: THREE.BufferGeometry;
    fine: THREE.BufferAttribute;
    coarse: THREE.BufferAttribute;
    mesh?: THREE.Mesh;
    isCoarse?: boolean;
  }
  const chunks: Chunk[] = [];
  const chunkGroup = new THREE.Group();
  chunkGroup.name = 'terrain';
  const chunkBounds = (c: THREE.BufferGeometry, i0: number, i1: number, j0: number, j1: number): void => {
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * cols + i;
        box.expandByPoint(v.set(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]));
      }
    }
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    // Roads regrade the ground a little after this, so leave some room.
    sphere.radius += 0.6;
    c.boundingSphere = sphere;
  };
  for (let j0 = 0; j0 < latSeg; j0 += CHUNK_QUADS) {
    for (let i0 = 0; i0 < lonSeg; i0 += CHUNK_QUADS) {
      const j1 = Math.min(latSeg, j0 + CHUNK_QUADS);
      const i1 = Math.min(lonSeg, i0 + CHUNK_QUADS);
      const fi: number[] = [];
      for (let j = j0; j < j1; j++) {
        for (let i = i0; i < i1; i++) {
          const a = j * cols + i;
          const c = a + cols;
          fi.push(a, c, a + 1, a + 1, c, c + 1);
        }
      }
      // The same vertices, every SUB-th one: a whole tile per quad.
      const ci: number[] = [];
      for (let j = j0; j + SUB <= j1; j += SUB) {
        for (let i = i0; i + SUB <= i1; i += SUB) {
          const a = j * cols + i;
          const c = a + SUB * cols;
          ci.push(a, c, a + SUB, a + SUB, c, c + SUB);
        }
      }
      const cg = new THREE.BufferGeometry();
      cg.setAttribute('position', posAttr);
      cg.setAttribute('normal', nrm);
      cg.setAttribute('uv', geo.getAttribute('uv'));
      const fine = new THREE.BufferAttribute(new Uint32Array(fi), 1);
      const coarse = new THREE.BufferAttribute(new Uint32Array(ci), 1);
      cg.setIndex(fine);
      chunkBounds(cg, i0, i1, j0, j1);
      chunks.push({ geo: cg, fine, coarse });
    }
  }

  const map = new THREE.CanvasTexture(canvasFrom(color));
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  const roughMap = new THREE.CanvasTexture(canvasFrom(rough));
  const detail = detailTexture();
  detail.anisotropy = maxAnisotropy;

  const material = new THREE.MeshStandardMaterial({ map, roughnessMap: roughMap, roughness: 1, metalness: 0.0 });
  const repeat = new THREE.Vector2(world.width * 4, rows * 4);
  const time = { value: 0 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.detailMap = { value: detail };
    shader.uniforms.detailRepeat = { value: repeat };
    shader.uniforms.surfaceTime = time;
    shader.uniforms.uSnow = seasonLook.snow;
    shader.uniforms.uSeasonTint = seasonLook.tint;
    shader.uniforms.uSeaR = { value: R };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSurfacePosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurfacePosition = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D detailMap;
uniform vec2 detailRepeat;
uniform float surfaceTime;
uniform float uSnow;
uniform vec3 uSeasonTint;
uniform float uSeaR;
varying vec3 vSurfacePosition;`)
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
  float surfaceWater = 1.0 - smoothstep(0.46, 0.57, texture2D(roughnessMap, vRoughnessMapUv).g);
  float grain = texture2D(detailMap, vMapUv * detailRepeat).g;
  diffuseColor.rgb *= mix(0.86 + 0.28 * grain, 1.0, surfaceWater);
  // The season: a tint over the land, and snow on the high ground and toward the poles as winter comes in; the tropics stay clear.
  float seasonLand = 1.0 - surfaceWater;
  diffuseColor.rgb *= mix(vec3(1.0), uSeasonTint, seasonLand);
  float seaLevelHeight = length(vSurfacePosition) - uSeaR;
  // Snow lies in patches, not as a blanket: only the far north and south and the high ground, broken up by a coarse noise so
  // under half of the land in winter is white.
  float snowPatch = texture2D(detailMap, vMapUv * 2.5).g;
  float snowScore = seaLevelHeight * 0.5 + abs(vSurfacePosition.y) / length(vSurfacePosition) * 1.0 + (snowPatch - 0.5) * 1.3 + (grain - 0.5) * 0.3;
  float snow = uSnow * smoothstep(0.8, 0.98, snowScore);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 1.0), snow * seasonLand * 0.9);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
  // Water is flat and still: a plain blue that darkens with depth (painted into the ground texture), no moving waves.
  float height = 0.0;
  height += (1.0 - surfaceWater) * (grain - 0.5) * 0.018;
  vec3 surfaceDx = dFdx(-vViewPosition);
  vec3 surfaceDy = dFdy(-vViewPosition);
  vec3 crossX = cross(surfaceDy, normal);
  vec3 crossY = cross(normal, surfaceDx);
  float determinant = dot(surfaceDx, crossX);
  vec3 gradient = sign(determinant) * (dFdx(height) * crossX + dFdy(height) * crossY);
  normal = normalize(max(abs(determinant), 1e-8) * normal - gradient);
  roughnessFactor = mix(roughnessFactor, 0.5, surfaceWater);`,
      );
  };

  const terrain = chunkGroup;
  for (const c of chunks) {
    const m = new THREE.Mesh(c.geo, material);
    c.mesh = m;
    m.receiveShadow = true;
    m.name = 'terrain';
    chunkGroup.add(m);
  }

  // Atmosphere: a soft glow hugging the planet's limb.
  const atmoMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        float a = abs(dot(normalize(vN), normalize(vV)));
        float glow = smoothstep(0.0, 0.34, a) * (1.0 - smoothstep(0.34, 0.5, a));
        gl_FragColor = vec4(0.36, 0.62, 1.0, 1.0) * glow * 0.95;
      }`,
  });
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 96, 64), atmoMat);

  // Stars.
  const starCount = 1400;
  const sp = new Float32Array(starCount * 3);
  let s = 12345;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < starCount; i++) {
    const u = rnd() * 2 - 1;
    const t = rnd() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    const d = 1400 + rnd() * 200;
    sp[i * 3] = Math.cos(t) * r * d;
    sp[i * 3 + 1] = u * d;
    sp[i * 3 + 2] = Math.sin(t) * r * d;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.9, fog: false }));

  /** Refresh the normals of just these vertices (and nothing else), the same area-weighted way computeVertexNormals does. */
  const renormal = (verts: Set<number>): void => {
    for (const k of [...verts]) {
      const i = k % cols;
      if (i === 0) verts.add(k + lonSeg);
      else if (i === lonSeg) verts.add(k - lonSeg);
    }
    const acc = new Map<number, [number, number, number]>();
    for (const k of verts) acc.set(k, [0, 0, 0]);
    const quads = new Set<number>();
    for (const k of verts) {
      const i = k % cols;
      const j = (k - i) / cols;
      for (const qj of [j - 1, j]) {
        if (qj < 0 || qj >= latSeg) continue;
        for (const qi of [i - 1, i]) if (qi >= 0 && qi < lonSeg) quads.add(qj * cols + qi);
      }
    }
    const face = (a: number, b: number, c: number): void => {
      const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
      const ux = pos[b * 3] - ax, uy = pos[b * 3 + 1] - ay, uz = pos[b * 3 + 2] - az;
      const vx = pos[c * 3] - ax, vy = pos[c * 3 + 1] - ay, vz = pos[c * 3 + 2] - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const v of [a, b, c]) {
        const s = acc.get(v);
        if (s) {
          s[0] += nx;
          s[1] += ny;
          s[2] += nz;
        }
      }
    };
    for (const q of quads) {
      face(q, q + cols, q + 1);
      face(q + 1, q + cols, q + cols + 1);
    }
    for (const [k, s] of acc) {
      const i = k % cols;
      const twin = i === 0 ? k + lonSeg : i === lonSeg ? k - lonSeg : -1;
      const t = twin >= 0 ? acc.get(twin) : undefined;
      const x = s[0] + (t ? t[0] : 0);
      const y = s[1] + (t ? t[1] : 0);
      const z = s[2] + (t ? t[2] : 0);
      const l = Math.hypot(x, y, z) || 1;
      nrm.setXYZ(k, x / l, y / l, z / l);
    }
  };

  const regrade = (tiles: Iterable<number>): void => {
    let any = false;
    const touched = new Set<number>();
    for (const t of tiles) {
      const tx = t % world.width;
      const ty = Math.floor(t / world.width);
      const j0 = (ty + CAP_ROWS) * SUB;
      for (let j = j0; j <= j0 + SUB; j++) {
        const lat = Math.PI / 2 - (Math.PI * j) / latSeg;
        for (let i = tx * SUB; i <= tx * SUB + SUB; i++) {
          const lon = -Math.PI + (Math.PI * 2 * i) / lonSeg;
          const k = j * cols + i;
          lonLatToVec(lon, lat, hf.radius(lon, lat), tmp);
          pos[k * 3] = tmp.x;
          pos[k * 3 + 1] = tmp.y;
          pos[k * 3 + 2] = tmp.z;
          if (i === 0 || i === lonSeg) {
            const o = j * cols + (i === 0 ? lonSeg : 0);
            pos[o * 3] = tmp.x;
            pos[o * 3 + 1] = tmp.y;
            pos[o * 3 + 2] = tmp.z;
          }
        }
      }
      // The normals of the tile's vertices and the ring round them change with the heights.
      for (let j = Math.max(0, j0 - 1); j <= Math.min(latSeg, j0 + SUB + 1); j++) {
        for (let i = tx * SUB - 1; i <= tx * SUB + SUB + 1; i++) touched.add(j * cols + ((i + lonSeg) % lonSeg));
      }
      any = true;
    }
    if (!any) return;
    renormal(touched);
    // Upload only the rows that changed: the whole ground is tens of megabytes, and sending it all stalled the frame.
    const rows = new Map<number, [number, number]>();
    for (const k of touched) {
      const j = Math.floor(k / cols);
      const r = rows.get(j);
      if (!r) rows.set(j, [k, k]);
      else {
        if (k < r[0]) r[0] = k;
        if (k > r[1]) r[1] = k;
      }
    }
    for (const [lo, hi] of rows.values()) {
      posAttr.addUpdateRange(lo * 3, (hi - lo + 1) * 3);
      nrm.addUpdateRange(lo * 3, (hi - lo + 1) * 3);
    }
    posAttr.needsUpdate = true;
    nrm.needsUpdate = true;
  };

  return {
    terrain,
    update(seconds) {
      time.value = seconds;
    },
    regrade,
    setDetail(eye) {
      const eyeLen = eye.length();
      const height = eyeLen - R;
      // Full detail within a couple of camera heights (and never less than a dozen tiles); everything is light from far out.
      const tile = (2 * Math.PI * R) / world.width;
      const near = height > 350 ? -1 : Math.max(height * 2, tile * 12);
      const horizon = Math.acos(Math.min(1, R / Math.max(eyeLen, R)));
      for (const c of chunks) {
        const s = c.geo.boundingSphere!;
        const cl = s.center.length() || 1;
        const angle = Math.acos(Math.max(-1, Math.min(1, s.center.dot(eye) / (cl * eyeLen))));
        const shown = angle < horizon + s.radius / R + 0.03;
        if (c.mesh!.visible !== shown) c.mesh!.visible = shown;
        if (!shown || SUB < 2) continue;
        const coarse = near < 0 || eye.distanceTo(s.center) - s.radius > near;
        if (coarse !== !!c.isCoarse) {
          c.isCoarse = coarse;
          c.geo.setIndex(coarse ? c.coarse : c.fine);
        }
      }
    },
    atmosphere,
    stars,
    dispose() {
      geo.dispose();
      for (const c of chunks) c.geo.dispose();
      map.dispose();
      roughMap.dispose();
      detail.dispose();
      material.dispose();
      atmoMat.dispose();
      sg.dispose();
    },
  };
}
