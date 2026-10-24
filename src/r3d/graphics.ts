export const GRAPHICS = {
  low: { reach: 0.7, label: 'Low', pixelRatio: 0.8, shadows: 512, aoSamples: 0, aoScale: 0, msaa: 0, lights: 2, bloom: false, treeDetail: 12 },
  balanced: { reach: 0.9, label: 'Balanced', pixelRatio: 1, shadows: 1024, aoSamples: 0, aoScale: 0, msaa: 0, lights: 4, bloom: false, treeDetail: 20 },
  high: { reach: 1.1, label: 'High', pixelRatio: 1.5, shadows: 2048, aoSamples: 12, aoScale: 0.5, msaa: 2, lights: 8, bloom: true, treeDetail: 32 },
  ultra: { reach: 1.4, label: 'Ultra', pixelRatio: 2, shadows: 4096, aoSamples: 16, aoScale: 0.75, msaa: 4, lights: 16, bloom: true, treeDetail: 45 },
} as const;

export type GraphicsQuality = keyof typeof GRAPHICS;
export type LightingMode = 'day' | 'dusk' | 'night';
export const nightLight = { value: 0 };
const KEY = 'supplyline.graphics.v1';

export function readGraphics(): { quality: GraphicsQuality; lighting: LightingMode } {
  // The browser version may end up the demo, so it starts light; the desktop app starts high on a good graphics card.
  const defaults = { quality: inBrowser() || window.matchMedia('(pointer: coarse)').matches || weakGpu() ? 'balanced' as const : 'high' as const, lighting: 'day' as const };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || !('quality' in value) || !('lighting' in value)) throw new Error('Invalid graphics preferences');
    const { quality, lighting } = value;
    if ((quality !== 'low' && quality !== 'balanced' && quality !== 'high' && quality !== 'ultra') || (lighting !== 'day' && lighting !== 'dusk' && lighting !== 'night')) throw new Error('Unknown graphics preset');
    return { quality, lighting };
  } catch (error) {
    console.warn('Graphics preferences could not be read; using device defaults.', error);
    return defaults;
  }
}

/** True in a web page, false in the desktop app (which exposes `supplyline` from its preload script). */
export const inBrowser = (): boolean => !(window as unknown as { supplyline?: unknown }).supplyline;

/** The graphics card's name as the browser reports it, for the About page. */
export function gpuName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return info && gl ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)).replace(/^ANGLE \(|\)$/g, '') : 'not reported';
  } catch {
    return 'not reported';
  }
}

/** A graphics chip that is built into the processor (or software) cannot take the High preset, so a first run starts lower. */
function weakGpu(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = info && gl ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    return /Intel|Mali|Adreno|PowerVR|SwiftShader|Basic Render|llvmpipe|Apple GPU/i.test(name) && !/Arc|Iris Xe Max/i.test(name);
  } catch {
    return false;
  }
}

/** Whether the game may lower its own quality when it runs slowly. On until the player picks a quality by hand. */
export function readAutoQuality(): boolean {
  try {
    return localStorage.getItem('supplyline.autoq') !== 'off';
  } catch {
    return true;
  }
}

export function saveAutoQuality(on: boolean): void {
  try {
    localStorage.setItem('supplyline.autoq', on ? 'on' : 'off');
  } catch {
    // No storage: it lasts until the page closes.
  }
}

export function saveGraphics(quality: GraphicsQuality, lighting: LightingMode): void {
  localStorage.setItem(KEY, JSON.stringify({ quality, lighting }));
}
