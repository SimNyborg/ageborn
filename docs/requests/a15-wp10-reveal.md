# A15 → WP10: no reel, quick reveal, honesty lines

**From:** design merge of A15 (2026-09-28). **To:** WP10 (capsule show). **Status:** open, Phase 2b. In `ageborn-phase2-loop` this is the capsules agent's work.

- **No reel.** The Wardrobe Crate uses the card-flip reveal everywhere (A10, A15.3). Do not build the reel; if `src/capsule/reel.ts` exists, delete it and its bench cases. Players cannot switch a reel on. `WardrobeReveal.reelTiles` may be empty; do not read it. `reel_tick` stays an unused sound ID.
- **Quick reveal** (`Settings.quickReveal`, default false): when on, every capsule opens at step 4 (burst), as Trophy Road capsules do. Rarity pre-signals, walkouts and skips are unchanged (A15.6).
- **Honesty lines** (A15.3), in `capsule.en.json`:
  - first capsule and every odds panel: "The result was decided when you earned this capsule. Tapping only reveals it."
  - scripted capsules 1-5: label "Starter Capsule · contents set to get you started"; the odds panel shows "Set contents" instead of bag odds.
- `PendingCapsule.kind 'daily'` is shown as "Supply Capsule".
- Vibration on climbs and Legendaries follows `Settings.vibrate`, which now defaults to false.
- Bench: add a quick-reveal case and a card-flip Wardrobe Crate case for each skin rarity.
