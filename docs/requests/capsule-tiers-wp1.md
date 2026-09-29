# Request to WP1 (content, strings): the capsule ladder

From: the lead designer, 2026-09-29 (owner request "more capsule tiers"; spec in DESIGN A6.3, A6.4, A10 and `docs/decisions.md`). Needs `capsule-tiers-wp0.md` first (the 7-tier `CapsuleTier`).

## 1. `src/content/capsules.ts` and `types.ts` (`CapsuleTierDef`, `CapsuleTables`)

`tierOrder: ['clay', 'bronze', 'silver', 'jade', 'gold', 'platinum', 'aeon']`; `index` 0-6.

New `CapsuleTierDef` fields: `extraLegendaryCopies: number` (copies of the 2nd and later guaranteed Legendary stacks; equal to `copies.legendary` where a tier has at most one), `skinMinRarity: SkinRarity` (`'rare'` = full Wardrobe odds), `exclusiveItems: boolean`.

| Tier | stacks | copies C/R/E/L | guaranteed | rareToLegendaryBp | legendaryUnownedFirst | skinChanceBp | skinMinRarity | bonusDust | amber | extraLegendaryCopies | exclusiveItems | expectedCopiesCenti |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| clay | 2 | 4/1/1/1 | [] | 0 | false | 0 | rare | 0 | 105 | 1 | false | 630 |
| bronze | 3 | 5/2/2/1 | [rare] | 0 | false | 0 | rare | 0 | 210 | 1 | false | 1030 |
| silver | 4 | 10/5/2/1 | [rare, rare, epic] | 0 | false | 0 | rare | 0 | 530 | 1 | false | 2040 |
| jade | 5 | 24/10/5/2 | [rare, rare, epic, epic] | **0** (was 2500) | false | 0 | rare | 100 | 1400 | 2 | false | **4980** |
| gold | 6 | 26/10/5/2 | [legendary, epic, epic] | 0 | true | 3000 | rare | **100** | 2640 | 2 | false | 7560 |
| platinum | 7 | 26/12/5/2 | [legendary, legendary, epic, epic] | 0 | true | **10000** | rare | 200 | 2800 | **1** | false | 7790 |
| aeon | 8 | 40/14/6/2 | [legendary, legendary, legendary, epic, epic, epic] | 0 | true | 10000 | **epic** | 500 | 3600 | **1** | **true** | 8640 |

(`expectedCopiesCenti` must equal WP7's `expectedCopiesX10k` / 100; the content test already checks it.) There is no foil floor field: foils stay purely rolled.

New `CapsuleTables` fields: `summitAbove: 'gold'`, `legendaryCatchUp: true`, `exclusiveCompleteDust: 500`, `exclusiveCraftDust: 3000`.

Changed values:

- `bag: { clay: 60, bronze: 80, silver: 40, jade: 13, gold: 4, platinum: 2, aeon: 1 }` (200; the bag size is always the sum, never a constant).
- `dailyOddsBp: { clay: 0, bronze: 7800, silver: 1500, jade: 500, gold: 150, platinum: 35, aeon: 15 }`.
- `script[4]`: `{ capsule: 5, tier: 'gold', ... }` (same cards and full walkout).
- Comments: update the A6.4 comments (bag, Supply, Jade line).

## 2. Other content

- `schema.ts`: `TIER` picklist and `perTier` keys with the 7 ids; validate the new fields (`skinMinRarity` a skin rarity, `extraLegendaryCopies` 1..`copies.legendary`).
- `arenas.ts`: Gate 7 (Orbital Ring) capsule `'gold'`; Gate 8 (Chrono Rift) capsule `'platinum'`.
- `trophyRoad.ts` (4,000 stays `'aeon'`) and `generals.ts` (27 stars stays `'aeon'`): no change.
- `cosmetics.ts`: `capsuleChanceBp: { clay: 800, bronze: 1200, silver: 2000, jade: 3500, gold: 6000, platinum: 8000, aeon: 10000 }`.
- `types.ts` `CosmeticSource`: add `| { kind: 'capsuleTier'; tier: CapsuleTier }`.
- `raw/cosmetics.ts`: 4 Aeon Collection items, rarity `legendary`, source `{ kind: 'capsuleTier', tier: 'aeon' }`, art `cosmetic.<collection>.<id>`: `decoration.aeon_hourglass`, `baseFlag.eternal_dawn`, `emote.frozen_moment` (theme `general`), `quote.across_the_ages` (with `textKey`). The art may land a release later; until an item's art exists, leave it out of the list (the Aeon then rolls the normal pool).
- War Path: see `capsule-tiers-warpath.md` (not WP1's file).

## 3. Content tests

- Every arena drop pool holds at least 4 Legendaries (so 3 distinct ones always fit).
- The tier table is non-decreasing up the ladder in stacks, guaranteed Legendaries, guaranteed Epics, Amber, bonus Dust and skin chance.
- `bag` sums to 200 and holds exactly 1 Aeon, 2 Platinum and 4 Gold; `dailyOddsBp` sums to 10,000.
- `summitAbove` is a tier; every tier above it guarantees more Legendaries than the one below.

## 4. Strings (`src/i18n/*.en.json`)

| Key | EN |
|---|---|
| `capsuleTier.gold.name` / `.platinum.name` | Gold Capsule / Platinum Capsule |
| `capsuleTier.<id>.short` (all 7) | Clay / Bronze / Silver / Jade / Gold / Platinum / Aeon |
| `ui.odds.bagLine` (changed; params `list`, `size`) | Exactly {list} in every {size} Win Capsules. |
| `ui.odds.bagItem` (params `n`, `tier`) | {n} {tier} |
| `ui.odds.bagMix` (params `list`, `size`) | Every {size} Win Capsules hold exactly {list}. Luck only decides the order. |
| `ui.odds.bagLegacy` | Your current bag was filled before Gold and Platinum arrived, so it finishes with its old mix. Each Aeon left in it is the new Aeon. |
| `ui.odds.crestRule` | Each Legendary crest on a capsule stands for one Legendary inside. |
| `ui.odds.extraLegendary` (param `n`) | Second and third Legendary: {n} copy each. |
| `ui.odds.skinSure` (param `rarity`) | A skin, {rarity} or better. |
| `ui.odds.aeonSet` (params `owned`, `total`, `dust`) | An Aeon Collection item you don't have yet ({owned}/{total}). Once you have all {total}: a collection item and +{dust} Dust. |
| `ui.odds.aeonSetRule` (param `dust`) | Aeon Collection items come from Aeon Capsules. After your first Aeon Capsule you can also craft them for {dust} Dust each. They can't be bought or traded, and they never leave the game. |
| `ui.odds.catchUp` | Once you own every Legendary here, Legendary stacks favour the ones you are furthest from maxing. |
| `ui.odds.summitRule` | Platinum and Aeon get summit strikes after the four strikes. A summit strike appears only when the capsule really is Platinum or Aeon. |
| `ui.capsules.revealNote` | Win and Supply Capsules show their tier when you open them. |
| `capsule.firstTier.gold` / `.platinum` / `.aeon` | Your first Gold Capsule / Your first Platinum Capsule / Your first Aeon Capsule |
| `capsule.aria.summitStrike` | Summit strike. Tap to strike. |
| `ui.notice.capsuleLadder.title` | Two new capsule tiers |
| `ui.notice.capsuleLadder.body` | Gold and Platinum join the ladder above Jade, and Aeon now holds 3 Legendaries. Jade no longer turns a Rare into a Legendary. Unopened Aeon Capsules keep what they hold, get 100 Dust more and are now called Gold. The Aeons left in your current bag stay Aeon. |
| `ui.notice.capsuleLadder.legacy` (param `n`) | You had already earned {n} of the skill Aeons (Trophy Road 4,000, Conquest 27 stars, the War Path finale), so {n} new Aeon Capsules are on your shelf. |
| `cosmetic.set.aeon.name` | Aeon Collection |
| `cosmetic.decoration.aeon_hourglass.name` | Aeon Hourglass |
| `cosmetic.baseFlag.eternal_dawn.name` | Eternal Dawn |
| `cosmetic.emote.frozen_moment.name` | Frozen Moment |
| `cosmetic.quote.across_the_ages.name` / `.text` | Across the Ages / Well met, across the ages! |
| `cosmetic.source.capsuleTier` (param `tier`) | From {tier} Capsules. Craftable after your first. |

Retire `ui.odds.rareToLegendary` only if nothing shows it (the odds sheet shows it only when a tier's value is above 0). Danish (v1.1): Ler, Bronze, Sølv, Jade, Guld, Platin, Aeon.

**Forbidden words** in `capsule.*`, `capsuleTier.*`, `ui.odds.*`, `ui.capsules.*`, `ui.notice.capsuleLadder.*` and `cosmetic.set.aeon.*`: "jackpot", "ultra rare", "rarest", "so close", "almost", "nearly", "lucky", "limited", "don't miss", "only {n} left", and any countdown (WP12 scans for them, C5 item 89).
