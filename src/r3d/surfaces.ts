import * as THREE from 'three';
import { METERS_PER_UNIT } from '../scale';

type Shader = Parameters<THREE.Material['onBeforeCompile']>[0];
type Surface = 'brick' | 'concrete' | 'asphalt';
const sources: Record<Surface, { asset: string; meters: number }> = {
  brick: { asset: 'brick_wall_001', meters: 3 },
  concrete: { asset: 'concrete_floor_01', meters: 2 },
  asphalt: { asset: 'asphalt_02', meters: 3 },
};
const ready = { value: 0 };
const empty = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
empty.needsUpdate = true;
const textures = Object.fromEntries(Object.keys(sources).flatMap(name =>
  ['Color', 'Normal', 'Rough'].map(channel => [`${name}${channel}`, { value: empty as THREE.Texture }]),
)) as Record<string, { value: THREE.Texture }>;

let pending: Promise<void> | undefined;

/** Assets are served locally; the running game never calls an external asset service. */
export function loadSurfaces(anisotropy: number): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    const loader = new THREE.TextureLoader();
    const loaded: THREE.Texture[] = [];
    try {
      for (const [name, source] of Object.entries(sources)) {
        for (const [suffix, channel] of [['Color', 'Diffuse'], ['Normal', 'nor_gl'], ['Rough', 'Rough']]) {
          const url = `${import.meta.env.BASE_URL}assets/materials/${source.asset}/${channel}.jpg`;
          const texture = await loader.loadAsync(url);
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.anisotropy = anisotropy;
          // Custom shader sampling decodes the albedo explicitly.
          texture.colorSpace = THREE.NoColorSpace;
          loaded.push(texture);
          textures[`${name}${suffix}`].value = texture;
        }
      }
      ready.value = 1;
    } catch (error) {
      for (const texture of loaded) texture.dispose();
      for (const uniform of Object.values(textures)) uniform.value = empty;
      pending = undefined;
      throw new Error('Could not load the local PBR material library.', { cause: error });
    }
  })();
  return pending;
}

const normalCode = `
vec3 surfaceNormal(vec3 n, vec3 position, vec2 uv, vec3 sampleNormal) {
  vec3 dp1 = dFdx(position);
  vec3 dp2 = dFdy(position);
  vec2 duv1 = dFdx(uv);
  vec2 duv2 = dFdy(uv);
  vec3 dp2perp = cross(dp2, n);
  vec3 dp1perp = cross(n, dp1);
  vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
  vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
  float invmax = inversesqrt(max(max(dot(T,T), dot(B,B)), 1e-12));
  vec3 mapped = sampleNormal * 2.0 - 1.0;
  mapped.xy *= 0.5;
  return normalize(mat3(T * invmax, B * invmax, n) * mapped);
}
vec3 surfaceLinear(vec3 value) {
  return mix(value / 12.92, pow((value + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), value));
}`;

function uniforms(shader: Shader, names: Surface[]): void {
  shader.uniforms.pbrReady = ready;
  let declarations = '\nuniform float pbrReady;\n';
  for (const name of names) {
    for (const suffix of ['Color', 'Normal', 'Rough']) {
      const key = `${name}${suffix}`;
      shader.uniforms[key] = textures[key];
      declarations += `uniform sampler2D ${key};\n`;
    }
  }
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>${declarations}${normalCode}`);
}

export function buildingSurfaces(shader: Shader): void {
  uniforms(shader, ['brick', 'concrete']);
  shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  if (pbrReady > 0.5) {
    float surface = floor(vMid + 0.5);
    if (surface == 1.0 || surface == 3.0 || surface == 6.0) {
      vec3 face = abs(normalize(vON));
      vec2 uv = face.y > 0.6 ? vOP.xz : (face.x > face.z ? vOP.zy : vOP.xy);
      vec3 albedo;
      vec3 mapped;
      float rough;
      if (surface == 1.0) {
        uv *= ${(METERS_PER_UNIT / sources.brick.meters).toFixed(6)};
        albedo = texture2D(brickColor, uv).rgb;
        mapped = texture2D(brickNormal, uv).rgb;
        rough = texture2D(brickRough, uv).r;
      } else {
        uv *= ${(METERS_PER_UNIT / sources.concrete.meters).toFixed(6)};
        albedo = texture2D(concreteColor, uv).rgb;
        mapped = texture2D(concreteNormal, uv).rgb;
        rough = texture2D(concreteRough, uv).r;
      }
      diffuseColor.rgb = mix(diffuseColor.rgb, surfaceLinear(albedo), surface == 1.0 ? 0.78 : 0.45);
      roughnessFactor = clamp(rough, 0.45, 1.0);
      normal = surfaceNormal(normal, -vViewPosition, uv, mapped);
    }
  }`);
}

export function roadSurfaces(material: THREE.MeshStandardMaterial, width: number, repeatLength: number): void {
  material.onBeforeCompile = shader => {
    uniforms(shader, ['asphalt']);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      if (pbrReady > 0.5) {
        vec2 uv = vMapUv * vec2(${(width * METERS_PER_UNIT / 3).toFixed(6)}, ${(repeatLength * METERS_PER_UNIT / 3).toFixed(6)});
        float marking = smoothstep(0.16, 0.35, max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)));
        vec3 asphalt = surfaceLinear(texture2D(asphaltColor, uv).rgb);
        diffuseColor.rgb = mix(asphalt * 0.8, diffuseColor.rgb, marking);
        roughnessFactor = mix(texture2D(asphaltRough, uv).r, 0.68, marking);
        normal = surfaceNormal(normal, -vViewPosition, uv, texture2D(asphaltNormal, uv).rgb);
      }`);
  };
  material.customProgramCacheKey = () => `asphalt-pbr:${width}:${repeatLength}`;
}
