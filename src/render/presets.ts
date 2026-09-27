/**
 * Graphics presets and the Auto fallback (DESIGN B6 Graphics presets, B16).
 *
 * | Preset | DPR | Particle cap | Parallax layers | Shadows | Legendary auras | Draw call budget |
 * | Lite   | 1   | 300          | 2               | off     | off             | ≤ 40             |
 * | High   | 2   | 1,500        | 3               | on      | on              | ≤ 80             |
 * Auto = High on desktop, Lite on mobile or when the average frame time over 3 s exceeds 20 ms.
 *
 * The render applies DPR (as a recommendation to the host), the particle cap, shadows and Legendary
 * auras; parallax layers are passed on to whoever builds the art provider.
 */
export type GraphicsSetting = 'auto' | 'high' | 'lite';
export type GraphicsPreset = 'high' | 'lite';

export interface PresetSpec {
  id: GraphicsPreset;
  maxDpr: number;
  particleCap: number;
  parallaxLayers: 2 | 3;
  shadows: boolean;
  legendaryAuras: boolean;
  drawCallBudget: number;
}

export const PRESETS: Record<GraphicsPreset, PresetSpec> = {
  lite: { id: 'lite', maxDpr: 1, particleCap: 300, parallaxLayers: 2, shadows: false, legendaryAuras: false, drawCallBudget: 40 },
  high: { id: 'high', maxDpr: 2, particleCap: 1500, parallaxLayers: 3, shadows: true, legendaryAuras: true, drawCallBudget: 80 },
};

/** The preset a setting starts with. */
export function initialPreset(setting: GraphicsSetting, isMobile: boolean): GraphicsPreset {
  if (setting === 'auto') return isMobile ? 'lite' : 'high';
  return setting;
}

/**
 * Particle cap: the preset's cap, never above the device cap from `feel.config.json`
 * (600 mobile, 1,500 desktop; B16).
 */
export function particleCap(preset: GraphicsPreset, isMobile: boolean, caps: { mobile: number; desktop: number }): number {
  return Math.min(PRESETS[preset].particleCap, isMobile ? caps.mobile : caps.desktop);
}

/** Device pixel ratio to render at: capped at 2, and at 1 in Lite (B16). */
export function presetDpr(preset: GraphicsPreset, devicePixelRatio: number): number {
  return Math.max(1, Math.min(PRESETS[preset].maxDpr, devicePixelRatio || 1));
}

/**
 * The Auto fallback: watches frame times and drops to Lite once the average over a 3 s window exceeds
 * 20 ms. It never climbs back during a match, so the picture does not flip back and forth.
 */
export class AutoPresetMonitor {
  private samples: { t: number; ms: number }[] = [];
  private now = 0;
  private sum = 0;
  preset: GraphicsPreset;

  constructor(
    readonly setting: GraphicsSetting,
    isMobile: boolean,
    readonly windowMs = 3000,
    readonly limitMs = 20,
  ) {
    this.preset = initialPreset(setting, isMobile);
  }

  /** Feeds one frame. Returns true when the preset just changed. */
  frame(frameMs: number): boolean {
    if (this.setting !== 'auto' || this.preset === 'lite' || !(frameMs > 0)) return false;
    // Ignore huge gaps (tab switches); they are not rendering cost.
    const ms = Math.min(frameMs, 250);
    this.now += ms;
    this.samples.push({ t: this.now, ms });
    this.sum += ms;
    while (this.samples.length > 0 && (this.samples[0]?.t ?? 0) <= this.now - this.windowMs) {
      this.sum -= this.samples.shift()?.ms ?? 0;
    }
    const full = this.now >= this.windowMs;
    if (full && this.sum / this.samples.length > this.limitMs) {
      this.preset = 'lite';
      return true;
    }
    return false;
  }
}

/** A best-effort mobile check for the host (coarse pointer or a small touch screen). */
export function detectMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.screen?.width ?? 1920, window.screen?.height ?? 1080) < 820;
  return coarse && small;
}
