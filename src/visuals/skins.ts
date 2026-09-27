/**
 * Skins (DESIGN A5.8): each skin is its own manifest entry `<target visualId>@<skin>` built from the
 * base puppet with a palette outside team zones, overlays, filters (alpha), aura and projectile.
 * Clarity parity: a skin never changes silhouette, size, weapon type, team zones or facing; the
 * silhouette test keeps IoU >= 0.85 against the base visual.
 */
import type { PuppetDef } from './types';

export const SKIN_PUPPETS: readonly PuppetDef[] = [];
