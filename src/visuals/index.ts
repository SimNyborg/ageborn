/**
 * Visuals (WP4): the art provider and the visual manifest (DESIGN B5, A11).
 *
 * Consumers (render, capsule, app) use only the `ArtProvider` contract from `@/contracts/art`;
 * the app creates the provider here and injects it:
 *
 *   import { createArtProvider, artOverrideFromUrl } from '@/visuals';
 *   const art = createArtProvider({ force: artOverrideFromUrl(location.search), quality: 'high' });
 *   await art.preload(['stone', 'medieval']);          // boot (B11 step 4)
 *   void art.preload(['gunpowder', 'modern', 'future']); // later, in idle time
 */
export { artOverrideFromUrl, createArtProvider, VisualsArtProvider, type ArtProviderOptions } from './provider';
export { MANIFEST, OVERRIDES, type VisualManifest } from './manifest';
export { TEAM_COLORS, TEAM_PRESETS, teamColor } from './palette';
export { STYLE, WORLD, CLIP_TIMING } from './style';
