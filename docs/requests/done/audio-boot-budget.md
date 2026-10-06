# Request: boot ZzFX budget and the content waves (from the X0 Stone wave, 2026-10-03)

**Owner of the paths:** audio (`src/audio/bank.ts`, `src/audio/sounds.ts`, `src/audio/test/prerender.test.ts`).

**Problem.** `prerender.test.ts > keeps the boot work small enough for a slow phone` sums the ZzFX samples of
every sound in `BOOT_GROUPS` (`ui`, `battle`, `stone`, `bronze`) at 80 ns per sample. Before the content
waves the total was already 299.6 ms of the 300 ms budget, so every new Stone or Bronze sound fails it:

| Part | ms at 80 ns/sample |
|---|---|
| Base (shipped before X0) | 299.6 |
| Bronze wave ZzFX fallbacks (15 ids) | 113.5 |
| Stone wave ZzFX fallbacks (14 ids, trimmed) | 63.2 |

The recorded sheets (`public/audio/sfx/<group>.*`) carry all 29 wave sounds, and the ZzFX renders are only
their fallback (`AudioService.usesFiles`), so the real boot cost is unchanged while the files load.

**Proposal.** Add `lazy?: boolean` to `SoundMix`; `SoundBank.idsIn` skips lazy ids for the boot render (they
render in `renderLazily` like the non-boot groups), and the budget test skips them too. Mark the wave
attack, turret and power sounds `lazy: true` (they are only heard once a wave card is on the lane).
Alternatively raise the budget, or trim the heaviest base fallbacks (`pw_wave` 39.9, `pw_stampede` 36.3,
`pw_aegis` 29.6, `evolve_fanfare_bronze` 27.1 ms).

**Done (release checker, 2026-10-06).** Built as proposed: `SoundMix.lazy`, `LAZY_BOOT_SOUNDS` in
`src/audio/sounds.ts` (the 14 Stone and 15 Bronze wave sounds), `SoundBank.renderGroups` skips lazy ids (they
stay in `pending`, so `renderLazily` and first use render them), and the budget test skips them. Boot work at
80 ns per sample: 476.3 ms before, 299.6 ms after (budget 300). Later waves' sounds are in non-boot groups.
