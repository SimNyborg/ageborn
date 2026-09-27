/**
 * Boot sequence (DESIGN B11 Boot):
 *
 * 1. load the save
 * 2. apply settings
 * 3. init the platform adapter
 * 4. init Pixi and pre-bake Stone/Medieval (the other ages bake in idle time)
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

export const BOOT_AGES: readonly AgeId[] = ['stone', 'medieval'];
export const LATER_AGES: readonly AgeId[] = ['gunpowder', 'modern', 'future'];

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
  /** Runs a task when the browser is idle (later ages bake then, B5). */
  idle?: (task: () => void) => void;
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

/** B11 step 5: the AudioContext may only start after a user gesture (iOS Safari, C5 #44). */
export function unlockAudioOnGesture(audio: AudioService, target: EventTarget | null | undefined): () => void {
  if (!target) return () => undefined;
  const events = ['pointerdown', 'keydown', 'touchend'];
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
  }
  steps.push('save');

  // 2. Apply settings.
  applySettings(services, save?.settings);
  steps.push('settings');

  // 3. Platform adapter.
  await services.platform.init();
  steps.push('platform');

  // 4. Pixi, then the Stone and Medieval bake; later ages bake when the browser is idle.
  const pixi = o.initPixi ? await o.initPixi() : null;
  steps.push('pixi');
  const settings = save?.settings;
  const lite = settings?.graphics === 'lite' || (settings?.graphics !== 'high' && o.isMobile === true);
  const art = services.createArt({
    quality: lite ? 'lite' : 'high',
    dpr: lite ? 1 : Math.min(2, o.devicePixelRatio ?? 1),
    teamPreset: settings?.teamPreset ?? 'default',
    search: o.search,
  });
  await art.preload([...BOOT_AGES]);
  (o.idle ?? ((task) => setTimeout(task, 0)))(() => void art.preload([...LATER_AGES]));
  steps.push('art');

  // 5. Audio unlocks on the first gesture.
  unlockAudioOnGesture(services.audio, o.gestureTarget);
  steps.push('audio');

  // 6. Route to the tutorial or Home.
  const route = bootRoute(save);
  steps.push('route');
  services.platform.loadingFinished();
  services.eventLog.record('boot', route, { services: Object.values(services.choice).join(',') });
  return { services, save, pixi, art, route, flags: bootFlags(o.search), steps };
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
