/**
 * Base skins of the cosmetic collections (DESIGN A18.9.4): a restyle of one age's base with the same
 * size, silhouette and mounts. The lane shows it as a body tint (the team layer keeps its colour, A11),
 * a trim colour on the flag poles and an ambient layer of particles (snow, embers, petals ...).
 * Tints are strong enough to tell a skin from the standard base at lane size (reviewed 2026-09-29).
 */

export type SkinParticles = 'snow' | 'fireflies' | 'glints' | 'petals' | 'embers' | 'dust' | 'stars';

export interface BaseSkinArt {
  /** Multiplied into the base body (never the team layer). */
  tint: number;
  /** Pole caps and trim. */
  trim: number;
  particles: SkinParticles;
  particleColor: number;
}

export const BASE_SKINS: Readonly<Record<string, BaseSkinArt>> = {
  frost_cave: { tint: 0xb4d4ff, trim: 0x9fd8ff, particles: 'snow', particleColor: 0xffffff },
  mossy_den: { tint: 0xb4d894, trim: 0x7fc26a, particles: 'fireflies', particleColor: 0xdcff7a },
  gilded_ziggurat: { tint: 0xffd978, trim: 0xffcf3a, particles: 'glints', particleColor: 0xfff2b0 },
  rose_keep: { tint: 0xffb4c6, trim: 0xff8fb0, particles: 'petals', particleColor: 0xff9ab8 },
  snowy_keep: { tint: 0xd8e6ff, trim: 0xbfe3ff, particles: 'snow', particleColor: 0xffffff },
  coral_fort: { tint: 0xffb296, trim: 0xff8a6a, particles: 'glints', particleColor: 0xffe2d2 },
  copper_foundry: { tint: 0xffa46e, trim: 0xd9824b, particles: 'embers', particleColor: 0xffa040 },
  desert_bunker: { tint: 0xeccd86, trim: 0xd9b36a, particles: 'dust', particleColor: 0xe8d4a4 },
  midnight_neon: { tint: 0x8c92ff, trim: 0x57f0ff, particles: 'glints', particleColor: 0x57f0ff },
  nebula_ark: { tint: 0xc8a4ff, trim: 0xbda8ff, particles: 'stars', particleColor: 0xffffff },
};
