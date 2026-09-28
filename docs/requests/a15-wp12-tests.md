# A15 → WP12: economy report, tests and checklist

**From:** design merge of A15 (2026-09-28). **To:** WP12 (tools, tests, CI). **Status:** open, Phase 2b (tests) and Phase 3 (economy run).

- **`sim:economy`** (A15.20, B12): model the new sources (Supply Capsules, charges banking 28, the War Chest at 20, rewards by format, Dust from feats). Report the day each v1 track ends (A15.2), a weekly player's income against a daily player's for the same matches (target within 15%), the Supply and War Chest rates, and Dust after max. The A6.9 gates stay; nothing new is gated.
- **Integrity and e2e:**
  - Copy result grants nothing (with WP9).
  - A copy-review test that fails on "Nothing is lost while you're away", "Everything waits for you", "we missed you", "last chance" in any string file.
  - No reel: no `reel` module is imported by the capsule show, and `NonePlatform.features.reelReveal` is false.
  - The walk-away test with WP7: a save advanced 30 days changes nothing owned, and every bank sits at its cap.
- **C5 additions** 45-53 are in DESIGN C5; items 24, 26 and 36 changed. Update any e2e that checks the old values (charges 12, daily capsule bank 3, the reel).

**Progress (Phase 2b integration):** `tests/integrity/copyReview.test.ts` covers the copy review (the four forbidden lines in every string file) and "no reel" (no `reel` import under `src/capsule`, `NonePlatform.features.reelReveal` false). The walk-away and Daily tests exist in `src/meta/test/daily.test.ts` and `supplyWarChest.test.ts`; the onboarding e2e checks the Starter Capsule label on both Results and both summaries. Open: `sim:economy` with the A15 sources (Phase 3), a "Copy result grants nothing" test, and a sweep of the C5 45-53 items.
