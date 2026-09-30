/**
 * Android: the first battle start of a session asks for full screen and landscape (ui-plan 3.1).
 * Home's Battle and the War Path's Play both call it; failures are silent.
 */
let fullscreenAsked = false;

export function askFullscreen(): void {
  if (fullscreenAsked || typeof document === 'undefined') return;
  fullscreenAsked = true;
  try {
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const ios = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (!coarse || ios || document.fullscreenElement) return;
    const p = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    void p
      ?.then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape'))
      .catch(() => undefined);
  } catch {
    /* not allowed here */
  }
}
