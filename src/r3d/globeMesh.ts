// The globe itself: displaced terrain mesh with the painted texture, plus atmosphere and stars.
import * as THREE from 'three';
import type { World } from '../sim/world';
import { CAP_ROWS, HeightField, MESH_SUB, R, lonLatToVec, textureRows } from './geo';
import type { Pixels } from './paint';

const SUB = MESH_SUB;

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
  terrain: THREE.Mesh;
  update(seconds: number): void;
  /** Re-sample the height of these tiles (and refresh normals), after roads regrade the ground. */
  regrade(tiles: Iterable<number>): void;
  atmosphere: THREE.Mesh;
  stars: THREE.Points;
  dispose(): void;
}

export function buildGlobe(world: World, hf: HeightField, color: Pixels, rough: Pixels, maxAnisotropy: number): Globe {
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
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeVertexNormals();
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute;
  const smooth = (): void => {
    geo.computeVertexNormals();
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
  };
  smooth();
  geo.computeBoundingSphere();

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
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSurfacePosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurfacePosition = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D detailMap;
uniform vec2 detailRepeat;
uniform float surfaceTime;
varying vec3 vSurfacePosition;`)
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
  float surfaceWater = 1.0 - smoothstep(0.46, 0.57, texture2D(roughnessMap, vRoughnessMapUv).g);
  float grain = texture2D(detailMap, vMapUv * detailRepeat).g;
  diffuseColor.rgb *= mix(0.86 + 0.28 * grain, 1.0, surfaceWater);`,
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

  const terrain = new THREE.Mesh(geo, material);
  terrain.receiveShadow = true;
  terrain.name = 'terrain';

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

  const regrade = (tiles: Iterable<number>): void => {
    let any = false;
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
      any = true;
    }
    if (!any) return;
    geo.getAttribute('position').needsUpdate = true;
    smooth();
    nrm.needsUpdate = true;
    geo.computeBoundingSphere();
  };

  return {
    terrain,
    update(seconds) {
      time.value = seconds;
    },
    regrade,
    atmosphere,
    stars,
    dispose() {
      geo.dispose();
      map.dispose();
      roughMap.dispose();
      detail.dispose();
      material.dispose();
      atmoMat.dispose();
      sg.dispose();
    },
  };
}
