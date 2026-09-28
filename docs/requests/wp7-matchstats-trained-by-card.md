# WP7 → integration lead (and WP2): per-card training counts for the favourite card

**From:** WP7 (meta rules). **To:** integration lead (contract `MatchStats` in `src/contracts/meta.ts`), then WP2 (`src/sim/stats.ts`). **Status:** open (v1 nice-to-have).

A6.1 lists "favourite card (most trained)" among the profile stats, and `SaveDoc.stats.trainedByCard`
exists for it, but `MatchStats` only has the total `trained`. Meta therefore cannot fill
`trainedByCard`; it stays `{}` and the profile's favourite card cannot be shown.

## Request

Add an optional field to `MatchStats`:

```ts
/** Units trained by this side per card, summons excluded (A6.1 favourite card). */
trainedByCard?: Record<CardId, number>;
```

and fill it in `sim/stats.ts` (it already counts `unitSpawned` events with `summoned: false`). Once it
exists, `applyMatchResult` adds it to `SaveDoc.stats.trainedByCard` (a few lines in
`src/meta/rewards.ts` `recordStats`). Optional keeps every existing producer and fixture valid.
