# Request (Track C, Customize round 2): the opponent's General performs the opponent's emotes

Status: done (round 2 final, 2026-10-16): `EmoteWheel.foeGeneral` in `src/ui/hud/context.ts`, `BattleScreen` passes
`b.setup.opponent`, and `EmoteWheel.tsx` reads it without its local type. An online player's own look still wins.

PLAN 2a "Emotes (6 starter)": "The opponent's emote uses their look: the AI General's fixed look or the
generated player's look." The HUD bubble (`src/ui/hud/EmoteWheel.tsx`, Track C) already draws an online
player's own look (`side.online.avatar`). For a labelled AI opponent it needs the AI General's id, which
only the match setup knows. `src/app/cosmetics.ts emoteWheelOf` (Track C) takes it as an optional third
argument and returns it as `foeGeneral`; until the two edits below land, an AI opponent's starter emote
shows the plain face (`EmoteGlyph`), as before this round.

1. `src/ui/hud/context.ts`, interface `EmoteWheel`, add:

   ```ts
   /** The opponent's AI General (`OpponentSpec.generalId`), whose fixed look performs its starter emotes; absent for an online player (their own look) and in replays. */
   foeGeneral?: string;
   ```

   (`EmoteWheel.tsx` reads it through a local type until then, so nothing breaks either way.)

2. `src/app/ui/BattleScreen.tsx`, line 33: pass the opponent.

   ```ts
   const wheel = emoteWheelOf(save, ui.services.content, b.setup.opponent);
   ```

Check: a Quick Battle against an AI General, the bot's GG or Salute shows that General's head (Grogg's
mammoth hood in the tutorial) performing it; a Ladder battle shows the generated player's head.
