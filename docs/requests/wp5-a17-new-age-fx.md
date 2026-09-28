# Request: play the A17 effects and key changes in the battle view

**From:** WP4 and WP6 (the A17 asset registration). **To:** WP5 (`src/render/**`, `src/ui/hud/**`).

The visuals manifest now has every A17.12 id (projectiles, instant beams, ability and power effects,
`icon.age.<age>` for all eight ages, `icon.chevron`, `icon.base_alert`, `icon.follow`), and the audio
manifest every A17.12 sound and music cue. Four things in the render still use the five-age data.

1. **Power effects** (`src/render/feel.config.json`). The new powers fall back to their effect kind's
   preset, so Tidal Wave plays the Orbital Lance beam, Aegis the Royal Decree glow and Warp Strike the
   parachutes. Suggested keys (the power's own key wins over the kind, `eventMapper.powerPreset`):

   | Key | Effect | Notes |
   |---|---|---|
   | `power.fx.tidal_wave.first` | `fx.tidal_wave` | sweeps `zone` along `dir` over 2.0 s, like `fx.orbital_beam` |
   | `power.fx.aegis.first` | `fx.aegis_glow` | `fxTarget: "sideUnits"`, like the Decree |
   | `power.fx.iron_horse` | `fx.iron_horse` | one per runner; runs `distance` along `dir` (like `fx.aurochs`) |
   | `power.fx.zeppelin_raid.first` | `fx.zeppelin` | crosses `zone` over 2.0 s (like `fx.plane_bomber`); the bombs keep `power.fx.barrage` |
   | `power.fx.starfall` | `fx.star_shard_rain` | one per impact (like `fx.meteor`) |
   | `power.fx.warp_strike.first` | `fx.warp_portal` | at each drop point, instead of `fx.parachute` |

2. **Ability effects** (A17.12): `fx.stomp_ring` on the Bronze Colossus's slowing hits and Molten Heart
   burst (pass `radius`), `fx.fuse_spark` looping on a Sapper while it lives (`durationMs`),
   `fx.beacon_ring` when a Starwarden's Shield Beacon fires (`radius` 180), and `fx.blink` at both ends
   of a Warp Stalker's blink. The unit clips `ability.stomp`, `ability.beacon`, `ability.blink` and
   `ability.reel` (Harpoon Gunner) are the matching body language (`unit.<slug>` `ability` clip).

3. **Key changes** (A17.8). `src/render/eventMapper.ts` `TRANSPOSE_STEPS` is still `[2, 2, 1, 1]`; with
   eight ages it must be `[2, 2, 1, 1, 1, 1, 1]` (+9 at Cosmic). `@/audio` exports the same rule as
   `EVOLVE_TRANSPOSE_STEPS` / `evolveTranspose(n)` if render may import it. The audio engine drops the
   lead lines an octave above +6, and the stingers exist in every key up to `.k9`.

4. **Test id lists.** `src/render/test/designIds.ts` copies A13 and A14.1 verbatim, so
   `realSim.test.ts` fails on `evolve_fanfare_bronze`. Add the A17.12 ids (sounds, projectiles, effects)
   there, or read them from DESIGN once A17 is merged.

The HUD age icon can draw `icon.age.bronze`, `icon.age.industrial` and `icon.age.cosmic` through the art
provider like the other ages (they are in the manifest now).
