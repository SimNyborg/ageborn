# Request to WP9 (UI screens) and the UI plan owner: the capsule ladder

From: the lead designer, 2026-09-29 (owner request "more capsule tiers"; spec in DESIGN A6.4, A9, A10 and `docs/decisions.md`). Needs `capsule-tiers-wp0.md`, `-wp1.md` and `-wp7.md`. The UI rebuild is working in these files now: fold this in when the capsule-tier contracts land, not before.

## 1. Unopened capsules show only what is already true (A6.4, A9, A10; A15.1 red line 7)

A capsule that climbs (kinds `win`, `daily`, `meter`, i.e. `content.capsules.kinds[kind].climbFrom !== null`) is shown by its **start tier** and its **kind name** until it is opened. Showing the rolled tier and then "revealing" it with strikes would be a staged tease.

- `src/ui/screens/model/progress.ts` `trayCapsules`: sort by the visible tier (`startTier` for climbing kinds, `tier` for fixed ones), then by `createdAt`. Never by the rolled tier of a climbing capsule. Update the test in `test/model.test.ts` that expects `['jade', 'silver', ...]`.
- `src/ui/screens/home/parts.tsx` `CapsuleTray`: the drums and the panel icon use the visible tier; the aria label uses the kind name for climbing capsules (`capsuleKind.win.name` "Win Capsule", `capsuleKind.daily.name` "Supply Capsule", `ui.capsules.starter` for scripted ones) and the tier name only for fixed ones.
- `src/ui/screens/capsules/CapsulesScreen.tsx` already draws `startTier`; keep it, and name climbing capsules by kind (not `capsuleTierNameKey(startTier)`, which would call a Win Capsule "Clay Capsule").
- `src/ui/screens/result/ResultScreen.tsx`: the capsule reward row (`reward-capsule`) and the summary row draw the visible tier, never `cap.tier` of a climbing capsule.
- `CapsuleIcon` gets a `crests` prop that callers set only for fixed-tier capsules and revealed ones; a pending climbing capsule never gets crests.
- The odds panel's "shown once before the first open of each tier" (ui-plan 4.6) is keyed on the visible tier, never the rolled one.
- The odds panel shows `ui.capsules.revealNote` ("Win and Supply Capsules show their tier when you open them.").

## 2. `src/ui/components/icons.tsx` (`TIER_COLOR`, `CapsuleIcon`)

- `TIER_COLOR`: add `gold: '#EFE0B0'`, `platinum: '#C4F2EA'`; change `aeon` to `'#5D3DFF'`. Remove the Aeon gold ellipse (`#f5d060`).
- From 32 px: a mini drum with 5 ring ticks (lit count = min(index, 4) + 1, each lit tick in its own tier's colour), 0-2 summit gems on the cap (Platinum 1, Aeon 2) and, when `crests` is set, 1-3 crest stars (the Legendary star in `#F5B82E` on a dark `#1D1405` shield). Nothing is drawn for an unearned ring beyond the carved drum, and no empty gem or crest outline.
- Below 32 px: a flat drum silhouette in the tier colour and, when `crests` is set, a "★n" badge. Callers at 18-26 px (OddsSheet rows, Mode select, Trophy Road chips, War Path sheets, the tray title) use this small form; the tier name always sits beside the icon.
- Every size: a 1.5 px parchment outline (`#F4ECD8` at 60%). The Aeon fill is below 3:1 on the surfaces, so the outline is what carries WCAG 1.4.11.
- Crests come from data (`guaranteed` Legendary count), never `tier === 'aeon'`.

## 3. `src/ui/components/OddsSheet.tsx` and `oddsModel.ts`

- 7 tiers everywhere, all from `content.capsules.tierOrder`; no `'aeon'` or `'jade'` literal (today `OddsSheet.tsx` line ~39 finds `'aeon'`).
- Bag line: `ui.odds.bagLine` with {list} built from the bag counts of the tiers that guarantee a Legendary, from the top ("1 Aeon, 2 Platinum and 4 Gold"; `ui.odds.bagItem` + `capsuleTier.<id>.short`, joined with `Intl.ListFormat`). Per-tier chips keep `ui.odds.perHundred` with {size} = the content bag size.
- Bag state: `ui.odds.bagLeftTotal` with {size} = `capsules.bagSize || content bag size`; while `bagSize` is 100, also `ui.odds.bagLegacy`.
- Per tier in "What's inside": the guarantees (Legendary count from `guaranteed`), `ui.odds.extraLegendary` where `extraLegendaryCopies` < `copies.legendary`, `ui.odds.skinChance` (below 100%) or `ui.odds.skinSure` (100%, with `skinMinRarity`), bonus Dust, and for `exclusiveItems` `ui.odds.aeonSet` plus `ui.odds.aeonSetRule`. `ui.odds.rareToLegendary` only where it is above 0.
- Rules: `ui.odds.crestRule`, `ui.odds.catchUp`, `ui.odds.summitRule`, and the Supply chips for all 6 Supply tiers.

## 4. The one-time notice

When `flags['notice.capsuleLadder']` is set, the **Capsules tab** (not Home: A15.13 and ui-plan 2.3) shows one closable card at the top: `ui.notice.capsuleLadder.title` and `.body`, plus `.legacy` with n = `legacySkillAeonCount` when n > 0. No timer, no expiry, no badge. Closing it clears the flag. The odds panel shows the same text while the flag is set.

## 5. Crafting the Aeon Collection

Collection and Customize list the 4 Aeon items with `cosmetic.source.capsuleTier`; the craft button is disabled with "Craftable after your first Aeon Capsule" until `flags['capsule.first.aeon']`, then costs 3,000 Dust (`capsules.exclusiveCraftDust`).

## 6. Fixtures

`src/ui/screens/fixtures/saves.ts`: tier lists with 7 tiers; the "aeon" pending capsule becomes a fixed-tier road Aeon (a Win Capsule's hidden tier must not appear in screenshots); add a Gold and a Platinum example; `bagSize` in every save.

## 7. `docs/ui-plan.md` follow-ups (for the UI plan owner; exact text)

- **3.2 Reserved colours, Capsule tier row:** "Clay `#9C6B4A` (text `#C08A62`), Bronze `#C27C3A`, Silver `#C9D1DC`, Jade `#2FBF71`, Gold `#EFE0B0`, Platinum `#C4F2EA`, Aeon `#5D3DFF`, each with a 1.5 px parchment outline" | always paired with "the lit ring count (1-5), the summit gems (0-2), the Legendary crests (0-3) and the tier name".
- **3.2 Separation by object:** replace "Aeon tier vs Epic (1.07)" with "Aeon tier vs Epic (ΔE2000 13.2; the old violet was 5.0)", and add "Gold tier vs primary gold: the Gold tier is a pale champagne, ΔE2000 ≥ 12.3 from every button face".
- **3.2 Group table, Capsule tier row:** non-colour cue "lit ring count 1-5, summit gems 0-2, crest count and the name". **Rarity row:** add the exception "except the Legendary crest on Gold, Platinum and Aeon capsules: the Legendary star on a dark shield, always the star shape".
- **3.2 Contrast checks:** add "Tier icons on surface-1 / 2 / 3: the parchment outline gives 5.87 / 5.29 / 4.63 (needs 3.0; the Aeon fill alone is 2.81 / 2.39 / 1.95)".
- **3.5 Iconography, Capsule tiers row:** "the drum with 1-5 lit ring ticks, 0-2 summit gems and 0-3 crest stars | 32-96; below 32 a flat silhouette with a ★n badge | ring count, summit gems, crests and the name".
- **4.6 Capsules tab:** "a shelf of capsule tiles (the drum at its visible tier: a Win or Supply Capsule shows its start tier and kind name until opened, a fixed-tier capsule its tier, crests and name; the source...)"; "the full panel also shows once before the first open of each *visible* tier"; add "the one-time 'Two new capsule tiers' card sits at the top of this tab".
- **4.9 Result:** add "a Win Capsule reward shows its start tier and 'Win Capsule', never its rolled tier".
