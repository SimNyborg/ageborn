/**
 * Audio (WP6, DESIGN B7, A13): the Web Audio implementation of the `AudioService` contract, the
 * pre-rendered sound and music files (made by `tools/audio`), the ZzFX and sequenced fallbacks, the
 * "Dawn March" music and the mixer.
 *
 * The app builds the service with `createWebAudioService()` (renders the boot sounds, queues the rest
 * for idle time) and calls `unlock()` on the first user gesture. Render and capsule receive it as an
 * `AudioService` by injection (B2).
 */
export { createWebAudioService, WebAudioService, type CreateAudioOptions, type ServiceStats, type WebAudioServiceOptions } from './service';
export { BOOT_GROUPS, SOUND_GROUPS, SOUND_IDS, sounds, type SoundBus, type SoundDef, type SoundGroup, type SoundSource } from './sounds';
export {
  AGE_CUES,
  buildFileMusic,
  continuesBattle,
  EVOLVE_TRANSPOSE_STEPS,
  evolveTranspose,
  fileMusic,
  MUSIC_CUES,
  music,
  type MusicDef,
  type MusicRole,
  type MusicSource,
  type MusicStem,
} from './music';
export { assetUrl, MUSIC_FILES, sfxFiles, SfxFileBank, type Clip, type MusicFile, type SfxFiles, type SheetState } from './files';
export { SFX_SAMPLE_RATE, SoundBank, renderDef, type RenderedSound, type RenderStats } from './bank';
export { Mixer, LIMITER, MIX_TRIM, softClip, volumeGain } from './mixer';
export { MusicEngine, MUSIC_LAYERS } from './musicEngine';
