// Which kind of input the player is using right now: a finger or pen (touch) or a mouse and keyboard.
// It follows the last pointer that actually touched the game, so an iPad with a trackpad, or a touch laptop, switches
// as the player switches. Before the first input it guesses from the device.
export type InputMode = 'touch' | 'mouse';

const guess = (): InputMode => {
  try {
    const coarse = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches;
    // iPadOS Safari reports itself as a Mac, so tell it apart by the touch points.
    const ipad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return coarse || ipad ? 'touch' : 'mouse';
  } catch {
    return 'mouse';
  }
};

let mode: InputMode = guess();
const listeners: ((m: InputMode) => void)[] = [];

const seen = (e: PointerEvent): void => {
  const next: InputMode = e.pointerType === 'mouse' ? 'mouse' : 'touch';
  if (next === mode) return;
  mode = next;
  for (const fn of listeners) fn(mode);
};
window.addEventListener('pointerdown', seen, true);
window.addEventListener('pointermove', (e) => {
  // A finger only moves while down, but a mouse hovers: a hovering mouse is a sure sign of a mouse.
  if (e.pointerType === 'mouse') seen(e);
}, true);

export const inputMode = (): InputMode => mode;
export const isTouch = (): boolean => mode === 'touch';
/** Pick the wording that matches the input in use. */
export const byInput = <T>(mouseValue: T, touchValue: T): T => (mode === 'touch' ? touchValue : mouseValue);
export const onInputChange = (fn: (m: InputMode) => void): void => {
  listeners.push(fn);
};
