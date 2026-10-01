# Request: give bots their Fort card (WP3 → WP11, with WP7; forts phase 6, F2)

**From:** WP3 (AI), forts F1 AI work, 2026-09-30.
**To:** WP11 (`src/app/matchSetup.ts`), with WP7 for War Path level bots if their plans are built in `src/meta`.
**When:** together with F2 turning `FORT_SLOT_IN_BATTLE` on. Nothing changes while it is off.

## Why

Bots place forts only through the Fort card in their own loadout (DESIGN A16.14.7). Bot War Plans are
built in `meta/matchmaking.ts` without a `fort` field, and `applyFortMatchRule` keeps a bot's `null` slot
empty, so from F2 on every bot would play without forts while the player has the slot. `meta` cannot
import `src/ai` (B2 layering), so the choice has to be made in `app`.

## What

In `matchSetupFor` (and wherever else a bot `SideConfig` is built for a battle), before
`applyFortMatchRule` runs, fill each bot loadout whose `fort` is missing or `null`:

```ts
import { botFortCard } from '@/ai';

for (const age of Object.keys(side.loadouts) as AgeId[]) {
  const l = side.loadouts[age];
  if (l && (l.fort ?? null) === null) l.fort = botFortCard(content, age, { generalId, tier });
}
```

- `botFortCard(content, age, { generalId, tier, allowed? })` (`src/ai/forts.ts`) returns the General's
  preferred kind that the tier places (Moss walls/traps, Kettle camps, Boomsworth towers, the Warden
  any), else the age's wall; `null` below tier II (tiers 0-I never place forts).
- `applyFortMatchRule` then applies the source filter (`botForts`, the A2.9.8 rule): a card the player
  could not own yet becomes the age's wall, exactly as A16.14.7 asks ("a preferred kind overrides the
  tier's kind list, never the source filter").
- Old Grogg (scripted) and the tutorial keep `fort: null`.
- Echo of You keeps the player's own Fort card (it mirrors the player's plan).

## Tests to add (WP11)

- A ladder bot at tier VII with Kettle gets a camp in every age once the player has first-cleared the
  camp levels, and the wall before that.
- A tier I bot gets no Fort card.
- Both sides still play the same slots (a locked player slot sends `fort: null` for both).

## Status (forts fixer, 2026-10-01)

Done in `src/app/matchSetup.ts`: `withBotForts` fills every empty bot Fort slot with `botFortCard` before
`applyFortMatchRule` (scripted Generals and Echo of You keep their slots). Tests in
`src/app/test/matchSetup.test.ts`.
