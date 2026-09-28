# WP3 → WP0 (contracts) and WP2 (`sim/observe.ts`): the foe's last emote in `Observation`

**From:** WP3 (AI Generals). **To:** WP0 (owner of `src/contracts/observation.ts`), WP2 (`observe`).
**Status:** open. **Priority:** low (a workaround is in place).

## Request

Add the opponent's most recent emote to the observation, so a bot can follow the A7.2 emote rule
("If the player emotes first, the bot may reply ... at most once per 20 s") from the observation alone:

```ts
// src/contracts/observation.ts, in Observation['foe']
/** The opponent's most recent emote and the tick it was shown, or null (DESIGN A7.2). */
lastEmote: { emote: EmoteId; tick: number } | null;
```

WP2 fills it in `observe()` from the last applied `emote` command of the other side (the sim already
emits the `emote` event, so this is one field on `SideRt`).

## Why

Emotes are on screen for both players, so seeing them is fair (A7.1), but today they exist only in the
event stream, which bots never receive. The reply rule therefore needs an out-of-band call.

## Workaround in place (no action needed to keep things working)

- `AiBotController.hearEmote(emote, tick)` (`src/ai/controller.ts`) takes the player's emote.
- `BotMatch` (`src/ai/harness.ts`) relays `emote` events of the other side to bots that have
  `hearEmote`; the battle session (WP11) should do the same (see `docs/requests/wp3-session-bots.md`).
- The controller already reads `obs.foe.lastEmote` when present, so once the field exists the relay
  can be dropped without changing `src/ai`.
