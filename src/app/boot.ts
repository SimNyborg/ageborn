/**
 * Boot sequence (DESIGN B11 Boot):
 *
 * 1. load the save
 * 2. apply settings
 * 3. init the platform adapter
 * 4. init Pixi and start the Stone/Bronze art (Home does not wait for it; a battle start does)
 * 5. audio unlock on the first gesture
 * 6. route to the tutorial or Home
 *
 * Every browser dependency is injectable, so the order is tested headless.
 */
import type { AgeId, ArtProvider, AudioService, Bus, SaveDoc, Settings } from '@/contracts';
import type { KeyValueStore } from './eventLog';
import { bootRoute } from './onboarding';
import type { PixiHost } from './pixiHost';
import { buildServices, choiceFromUrl, type Services } from './services';
import { settleAbandoned } from './abandon';

/** Baked at boot (A17.13): Stone, and Bronze, the second age of every format. */
export const BOOT_AGES: readonly AgeId[] = ['stone', 'bronze'];
/** Every other age (A17.8: eight ages). They load per match, as a side nears them (B16), never all at boot. */
export const LATER_AGES: readonly AgeId[] = ['medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];

export type BootStep = 'save' | 'settings' | 'platform' | 'pixi' | 'art' | 'audio' | 'route';

export interface BootOptions {
  /** `location.search`: service overrides, `?dev=1&autopilot=1`, `?art=`. */
  search: string;
  /** localStorage in the browser (event log). */
  storage?: KeyValueStore | null;
  /** Creates the Pixi host (omitted = headless). */
  initPixi?: () => Promise<PixiHost>;
  /** Where the first gesture is listened for (document). */
  gestureTarget?: EventTarget | null;
  /** Runs a task when the browser is idle (unused since art loads per match; kept for callers). */
  idle?: (task: () => void) => void;
  /** Wait for the boot art before returning, whatever the route (tests, dev pages). */
  awaitArt?: boolean;
  devicePixelRatio?: number;
  isMobile?: boolean;
  services?: Services;
  warn?: (msg: string) => void;
  /** Seed for a brand-new save. */
  newSaveSeed?: number;
}

export interface BootFlags {
  /** `?dev=1&autopilot=1`: the dev autopilot plays the player's side (B13). */
  autopilot: boolean;
}

export interface Booted {
  services: Services;
  save: SaveDoc | null;
  pixi: PixiHost | null;
  art: ArtProvider;
  /** Resolves once the boot ages' art (Stone, Bronze) has loaded; a battle start waits for it. */
  artReady: Promise<void>;
  route: 'tutorial' | 'home';
  flags: BootFlags;
  /** The boot steps in the order they ran. */
  steps: BootStep[];
}

export function bootFlags(search: string): BootFlags {
  const q = new URLSearchParams(search);
  return { autopilot: q.get('dev') === '1' && q.get('autopilot') === '1' };
}

const BUSES: readonly Bus[] = ['master', 'music', 'sfx', 'ui'];

/** B11 step 2: language and volumes. The graphics settings reach the view when a battle starts. */
export function applySettings(services: Pick<Services, 'i18n' | 'audio'>, settings: Settings | undefined): void {
  if (!settings) return;
  services.i18n.setLocale(settings.locale);
  for (const bus of BUSES) services.audio.setBusVolume(bus, settings.volume[bus] ?? 1);
}

/**
 * Events that carry user activation in the HTML rules. A touch `pointerdown` does not, so it is left
 * out: on a phone the tap's `pointerup`/`touchend` starts the AudioContext on the first try.
 */
export const GESTURE_EVENTS: readonly string[] = ['pointerup', 'touchend', 'click', 'keydown'];

/** B11 step 5: the AudioContext may only start after a user gesture (iOS Safari, C5 #44). */
export function unlockAudioOnGesture(audio: AudioService, target: EventTarget | null | undefined): () => void {
  if (!target) return () => undefined;
  const events = GESTURE_EVENTS;
  const unlock = (): void => {
    for (const e of events) target.removeEventListener(e, unlock);
    void audio.unlock();
  };
  for (const e of events) target.addEventListener(e, unlock);
  return () => {
    for (const e of events) target.removeEventListener(e, unlock);
  };
}

export async function boot(o: BootOptions): Promise<Booted> {
  const steps: BootStep[] = [];
  const services = o.services ?? (await buildServices({ choice: choiceFromUrl(o.search), storage: o.storage ?? null, ...(o.warn ? { warn: o.warn } : {}) }));

  // 1. Load the save; a first launch gets a new one when meta is available (Phase 2).
  let save = await services.saveStore.load();
  if (!save && services.meta) {
    save = services.meta.newSave(services.content, services.clock, o.newSaveSeed ?? services.clock.now() >>> 0);
    await services.saveStore.save(save, { immediate: true });
  } else if (save && services.meta) {
    // Charges, the Supply and Daily banks, quest arrivals and the Daily day move on while away (A6.3).
    const ticked = services.meta.tickTimers(save, services.clock);
    if (ticked !== save) void services.saveStore.save((save = ticked));
    // A Ladder battle left by a reload counts as the Retreat it could have been (bug hunt 2026-10-01 #9).
    save = await settleAbandoned(services, save);
  }
  steps.push('save');

  // 2. Apply settings.
  applySettings(services, save?.settings);
  steps.push('settings');

  // 3. Platform adapter.
  await services.platform.init();
  steps.push('platform');

  // 4. Pixi, then the Stone and Bronze bake; later ages bake when the browser is idle.
  const pixi = o.initPixi ? await o.initPixi() : null;
  steps.push('pixi');
  const settings = save?.settings;
  // Owner feedback 2026-10-03: phones get the full art under Auto too (HD sheets, DPR up to 2); only
  // an explicit Lite setting loads the lite tier. The render's Auto monitor still drops effects if slow.
  const lite = settings?.graphics === 'lite';
  const art = services.createArt({
    quality: lite ? 'lite' : 'high',
    dpr: lite ? 1 : Math.min(2, o.devicePixelRatio ?? 1),
    teamPreset: settings?.teamPreset ?? 'default',
    search: o.search,
  });
  // Home does not wait for the battle art (perf audit 2026-10-01, B16 "Play button <= 5 s"): the
  // Stone and Bronze sheets stream in behind Home and only a battle start waits for them
  // (`artReady`). The other ages load per match, as each side nears them (render `preloadAhead`).
  // The capsule title, the dev autopilot and `?quick=` put a battlefield on screen at once: they wait.
  const route = bootRoute(save);
  const artReady = art.preload([...BOOT_AGES]).catch((e: unknown) => o.warn?.(`[boot] art preload failed: ${String(e)}`));
  const q = new URLSearchParams(o.search);
  if (o.awaitArt === true || route === 'tutorial' || bootFlags(o.search).autopilot || q.has('quick')) await artReady;
  steps.push('art');

  // 5. Audio unlocks on the first gesture.
  unlockAudioOnGesture(services.audio, o.gestureTarget);
  steps.push('audio');

  // 6. Route to the tutorial or Home.
  steps.push('route');
  services.platform.loadingFinished();
  services.eventLog.record('boot', route, { services: Object.values(services.choice).join(',') });
  return { services, save, pixi, art, artReady, route, flags: bootFlags(o.search), steps };
}

/** DESIGN B4 / docs/requests/wp1-dev-boot-validation.md: validate content in dev builds only. */
export function validateContentInDev(log: (msg: string) => void = (m) => console.error(m)): void {
  if (!import.meta.env.DEV) return;
  void Promise.all([import('@/content'), import('@/content/raw'), import('@/content/schema')]).then(
    ([{ content }, { raw }, { validateContent, validateRaw }]) => {
      for (const i of [...validateRaw(raw), ...validateContent(content)]) log(`[content] ${i.path}: ${i.message}`);
    },
  );
}
