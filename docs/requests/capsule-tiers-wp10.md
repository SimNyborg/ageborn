# Request to WP10 (capsule show): the capsule ladder

From: the lead designer, 2026-09-29 (owner request "more capsule tiers"; spec in DESIGN A10 and `docs/decisions.md`). Needs `capsule-tiers-wp0.md`, `-wp1.md`, `-wp6.md` and `-wp7.md`. The owner cares a great deal about the look: check every tier in the capsule bench and with Playwright at 844×390 and 1280×720 before reporting done.

## 1. `capsule/tiers.ts`

`TIER_ORDER` from content (7 tiers). `resolveStrikes`: k_main = clamp(min(tier, `summitAbove`) − start, 0, 4) back-loaded over the 4 main strikes; summit strikes = max(0, tier − `summitAbove`). It stays the source of truth; a mismatch with `CapsuleReveal` is logged in dev.

## 2. `capsule/palette.ts` and the ΔE test

- `TIER_COLORS`: Gold `#EFE0B0`, Platinum `#C4F2EA`, Aeon `#5D3DFF` (was `#8B5CF6`). `AEON_RIM` goes.
- Crest: `CREST_STAR = #F5B82E`, `CREST_SHIELD = #1D1405`, `CREST_RIM = #F4ECD8`.
- Reference ramps (highlight / key / mid-tone / shadow): Gold `#FFF6DC` / `#EFE0B0` / `#CDB887` / `#8A7A5A` (champagne; no saturated "burnished" gold anywhere); Platinum `#F2FFFC` / `#C4F2EA` / `#A6D4CD` / `#7E9E99`; Aeon `#B8AAFF` / `#5D3DFF` / `#3A2A9E` / midnight body `#241C4A`.
- **Unit test (ΔE2000 ≥ 12):** every new or changed key (Gold, Platinum, Aeon), and the mid-tone and highlight pixels sampled from the body of each rendered Gold, Platinum and Aeon drum in the bench (not the brass fittings every drum shares), against: Common `#B8C0CC`, Rare `#22B8CF`, Epic `#A855F7` and `#B77BF9`, Legendary `#F5B82E`; team `#2F7DF6`, `#5B9BFF`, `#F28A1E`, `#F2C21E`, `#1F5FD6`, `#FF6A00`; buttons `#F2B52C`, `#FFD466`, `#B7801A`, `#3CC46B`, `#C9392F`; and every other tier key. Known old exceptions stay listed in the test: Silver vs Common 4.2, Jade vs progress green 2.4, Bronze vs the primary lip 8.3 and foe orange 10.1, Clay vs Bronze 11.4.
- Contrast test: the crest star on its shield ≥ 3:1 (10.2); the shield on the brass band ≥ 3:1 (7.5). The star straight on brass would be 1.36:1, so it is never drawn without its shield.

## 3. `capsule/climb.ts` (the drum)

- Keep the **5 carved rings** (`RING_Y`), now Clay, Bronze, Silver, Jade, Gold. Reaching tier i lights rings 1..min(i, 4) + 1; each lit ring's front gem in its own tier's colour (not a shade of the current body).
- **Summit band:** the stone cap band carries 0-2 summit gems. A gem exists only after its rise (never an empty socket); the strike ignites it in the new tier's colour (Platinum ice, then Aeon indigo).
- **Crests:** widen the upper brass band to about 22 px on every drum (tighten the rings to about 29-30 px spacing if needed) so nothing moves when a crest stamps. 1-3 shields about 18 px tall, centred, stamped on reaching Gold and on each summit strike. Drawn only when earned: no empty outline, no crest before its tier is shown. Crests come from the tier's `guaranteed` Legendary count, never `tier === 'aeon'`.
- 3 new materials: champagne gold with lapis enamel (`#2B4C9B`) in the ring grooves; brushed platinum with streak highlights and a thin-film prismatic edge; an Aeon time crystal (midnight body, drifting starfield, indigo facets, white-gold filigree).

## 4. `capsule/plan.ts`, `runner.ts` and `summaryModel.ts`

- Steps: 3c summit gem rise (400 ms, `cap_summit_rise`; the hammer heats neutral white, never the next tier's colour), 3d summit strike (900 ms: last 200 ms of the descent at half speed, impact, 120 ms hold, shockwave, 300 ms top-down transmutation, gem ignites, a crest stamps; `cap_climb_5` / `cap_climb_6` with `upgrade_slam` at −6 dB; tap or auto after 1.5 s).
- The step after strike 4 starts at the same moment for every tier (burst build, or the summit gem rise). No sound or visual before strike 4's result hints at a summit.
- Burst builds: Clay 200, Bronze 260, Silver 360, Jade 560, Gold 820, Platinum 1,000, Aeon 1,200 (+360 pop). Stingers: Clay to Gold the final climb note; Platinum `cap_burst_platinum`; Aeon `cap_burst_aeon`; music ducks −6 dB for Platinum and Aeon.
- **4b First of a tier:** its own skippable step after the pop, 1,000 ms, when `CapsuleReveal.firstOfTier` (text `capsule.firstTier.<tier>`), riding the stinger's tail.
- `SHOW_LIMITS`: `burst` 1,600; new `summitRise` 400, `summitStrike` 900, `firstTier` 1,000.
- **Walkouts, one opening:** in a single show or one Open all batch, only the first NEW Legendary gets the full walkout; every other Legendary walkout is 3 s and skippable, even the first time that card is revealed. Change `summaryModel.ts` (today: "the full walkout never turns into a skippable one", `firstLegendary` for every NEW Legendary) and `revealCards` in `plan.ts`. `checkPlan` asserts at most one unskippable step per plan and per batch.
- **Open all:** a batch holding a Platinum or Aeon ends its volley with that tier's stinger and a 600 ms flare; first-of-tier capsules in a batch get one combined banner for the highest tier. All within `SHOW_LIMITS.volley` (2,000).
- **Quick reveal and fixed-tier capsules** start at step 4 with their tier's staging and crests; summit steps are skipped; the first-of-tier step stays.
- Steps 1-2 show the start tier only: no header, label or aria text names the rolled tier (`capsule.aria.summitStrike` for the summit strike button).

## 5. `capsule/capsuleStage.ts`, `fx.ts`, `textures.ts` (staging by the tier already shown)

| Tier | Light and camera | Particles |
|---|---|---|
| Gold | faint sunlight god-rays from above; 2% push | 16 sparks; champagne gold-leaf flakes for 1.5 s |
| Platinum | room dims to 60%; cold top spotlight; prismatic glints once around the drum (800 ms); 4% push | ice-crystal splinters; a frost ring on the pedestal (3 s) |
| Aeon | room dims to 35%; drum lifts 12 px; the starfield spills behind the drum; the age glyphs of the content age list in a halo within 900 ms (stagger = 900 / ages); 8% push with 1.5° tilt | star dust from a pooled batch (≤ 160 sprites; Lite 80); the starfield stays behind the card fan until the summary |

Reduce motion: rings, summit gems and crests fade in over 150 ms; no push, tilt or shake; at most 3 flashes a second at ≤ 20%. Lite: half the particles, a static starfield and sheen. Replace the `s.tier === 'aeon'` ring in `capsuleStage.ts` with data.

## 6. Bench and tests

- `dev/capsuleBench/cases.ts`: every start and final tier pair (Clay and Bronze starts × 7 finals), fixed Gold, Platinum and Aeon, a first-of-tier case, and an Open all batch with two new Legendaries.
- Invariants (with WP12): a climb is never followed by a non-climb, summit strikes included; a summit gem appears only above Gold; the climbs add up and the last tier shown is the rolled tier; no ring, summit gem or crest is drawn before it is earned.
