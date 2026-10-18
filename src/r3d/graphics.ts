export const GRAPHICS = {
  balanced: { label: 'Balanced', pixelRatio: 1, shadows: 1024, aoSamples: 0, msaa: 0, lights: 4, bloom: false },
  high: { label: 'High', pixelRatio: 1.5, shadows: 2048, aoSamples: 16, msaa: 2, lights: 8, bloom: true },
  ultra: { label: 'Ultra', pixelRatio: 2, shadows: 4096, aoSamples: 32, msaa: 4, lights: 16, bloom: true },
} as const;

export type GraphicsQuality = keyof typeof GRAPHICS;
export type LightingMode = 'day' | 'dusk' | 'night';
export const nightLight = { value: 0 };
const KEY = 'supplyline.graphics.v1';

export function readGraphics(): { quality: GraphicsQuality; lighting: LightingMode } {
  const defaults = { quality: window.matchMedia('(pointer: coarse)').matches ? 'balanced' as const : 'ultra' as const, lighting: 'day' as const };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || !('quality' in value) || !('lighting' in value)) throw new Error('Invalid graphics preferences');
    const { quality, lighting } = value;
    if ((quality !== 'balanced' && quality !== 'high' && quality !== 'ultra') || (lighting !== 'day' && lighting !== 'dusk' && lighting !== 'night')) throw new Error('Unknown graphics preset');
    return { quality, lighting };
  } catch (error) {
    console.warn('Graphics preferences could not be read; using device defaults.', error);
    return defaults;
  }
}

export function saveGraphics(quality: GraphicsQuality, lighting: LightingMode): void {
  localStorage.setItem(KEY, JSON.stringify({ quality, lighting }));
}
