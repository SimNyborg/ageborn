# Meta-Collection Research: Deck Building, Rarity, Upgrades, Chests and Reveal Presentation

## 0. Executive summary (the 12 decisions that matter)

1. **Power must never be purchasable, and we have no store at all.** Every hated system in this genre comes down to paying for power: Clash Royale Elite Wild Cards and paid-pass Evolutions, and Rush Royale crit.
2. **Keep randomness.** Brawl Stars removed loot boxes in Dec 2022 and players revolted. Randomness came back as Starr Drops in 2023, and a third-party analysis reports MAU 2.4x, DAU 3.9x and revenue 8.8x between Jun 2023 and Feb 2024. Free randomness is the fun part.
3. **No timers, slots or keys.** Clash Royale removed all three in spring 2025.
4. **Show pity counters and enforce them:** an Epic guaranteed every 10 chests, a Legendary every 40, the first Legendary by chest 10, and no duplicate Legendaries until all are owned (the Hearthstone model).
5. **Use one level scale for all rarities.** Rarer cards unlock at a higher starting level, so a new Legendary is immediately playable. Fix a max level at launch and do not keep raising it.
6. **Duplicates must always be useful.** Before max level they are upgrade fuel. After max they become Essence (craft any card) and Star Dust (cosmetic star levels).
7. **Add a Collection Level (Marvel Snap):** every upgrade gives collection XP, and that XP feeds a reward track.
8. **Pre-roll the outcome, then animate a climb:** tap-to-upgrade tiers (Lucky Drop and Starr Drop), a rarity pre-signal (the FIFA tunnel and flare tells), and a walkout for Legendaries.
9. **Use a CS:GO-style reel only for cosmetic crates:** 5-7 s ease-out, a tick per tile, rarity color strips, and filler drawn from the real odds.
10. **Use a level cap and parity in competitive or ranked modes** (Clash Royale Tournament Standard caps levels at 11). Label bots clearly.
11. **Regulatory safe harbor:** chest currency is earn-only, and daily rewards bank instead of expiring. PEGI's June 2026 rules rate paid random items 16+ and punishing play-by-appointment 12+.
12. **Publish the odds in-game.** Valve, EA and Supercell all do this, and it builds trust.

---

## 1. Reference systems: facts and numbers

### 1.1 Clash Royale

**Deck rules.** A deck is 8 cards with 4 in hand and the next card previewed. Elixir starts at 5, caps at 10, and regenerates 1 per 2.8 s. Double elixir (1 per 1.4 s) starts after 2:00, and triple elixir (about 1 per 0.9 s) runs in overtime [1].

**Unified level scale.** Rarities unlock at different levels: Common L1, Rare L3, Epic L6, Legendary L9, Champion L11. Max level is now 16. The Nov 24 2025 update removed Elite Wild Cards and made every level cost card copies plus gold. Level 15 costs 90,000 gold and Level 16 costs 120,000. Maxing one card costs about 365,625 gold whatever its rarity, and an 8-card deck costs about 3M gold. Copies needed from unlock to L16 are: Common about 23.1K, Rare about 4.8K, Epic about 596, Legendary about 67, Champion about 41 [2].

**Gold curve per level (L2→L16):** 5, 20, 50, 150, 400, 1k, 2k, 4k, 8k, 15k, 25k, 40k, 60k, 90k, 120k. That is roughly ×2 per step, then ×1.5 at the top. Common copies per level: 2, 4, 10, 20, 50, 100, 200, 400, 800, 1000, 1500, 2500, 3500, 5500, 7500 [2]. Veterans report gold, not cards, as the real bottleneck [2].

**The level-cap raise saga.** Supercell's plan to add Level 15 with a gold cost (Feb 2023) met "such a vocal response against adding a new level" that they redesigned it around Elite Wild Cards: 50,000 per card, with maxed duplicates converting at 1/5/20/1,500/4,000 per rarity [3]. Players then called EWCs pay-to-win because they were scarce for free players and plentiful in paid offers. Evolution shards sat behind paid passes and bundles. A Jan 2026 student opinion piece blames the game's decline on this, quoting a player who said evolutions give "a highly unfair advantage" [4].

**Chests (historical).** The game used 4 chest slots with unlock timers of 3 h (Silver) to 24 h (Legendary and Super Magical). Chests followed a fixed 240-chest cycle: 180 Silver, 52 Gold, 4 Magical and 4 Giant at fixed positions, with Epic and Legendary chests once per cycle at random positions [5]. This is effectively a shuffle bag. It gave low variance while still feeling random.

**Spring 2025 change.** Chest queues, timers and keys were all removed and rewards are now instant. Keys converted to gold at 5,000 each, up to 30 [6]. Supercell's stated reasons were that timers delayed the joy of winning and forced multiple logins a day [6]. Daily caps now apply:
- The first 3 wins give Lucky Drops, Bonus Rewards and Crowns.
- The next 7 give Bonus Rewards and Crowns.
- After that, wins give Crowns only [6].

**Lucky Drops.** These are the presentation innovation. A drop starts at 1★ and each tap can raise its star tier; 1-3★ drops get 4 taps [7]. The published final distribution for Magic Lucky Chests is 1★ 31.6%, 2★ 43.0%, 3★ 20.3%, 4★ 4.1%, 5★ 1.0%. A 5★ Magic Chest at level 13+ contains Common 27.9%, Rare 25.9%, Epic 19.6%, Legendary 15.5% or Champion 4.6% [8]. Card pools are limited to rarities unlocked in the player's current arena [6].

**Star Levels** are a cosmetic sink for maxed cards: golden sprite details and particles, costing up to 20,000 Star Points per card. Maxed duplicates convert to gold and Star Points at 1/10/100/1,000/2,000 per rarity [9].

**Trophy Road.** There are 32 arenas up to 14,000 trophies, and a win is worth about 30 trophies. Seasonal arenas run from 10k to 15k, where swings grow to about 150 per match. Ranked mode sits above that [10]. Matchmaking uses trophies only and ignores card level, which is a constant complaint [11]. Tournament Standard caps cards and King Tower at level 11 [12].

### 1.2 Brawl Stars: randomness as the core pleasure
- Loot boxes were removed on Dec 12 2022 and replaced by the deterministic Starr Road, with "no more probabilities" [13]. Many players demanded boxes back and said the game was less fun [14]. Deconstructor of Fun found the short-term revenue bump came mainly from returning players, and iOS revenue per download was flat to negative [15].
- Starr Drops arrived in 2023 with odds of Rare 50%, Super Rare 28%, Epic 15%, Mythic 5% and Legendary 2%. The outcome is decided when the drop is granted, and the tap animation only reveals it. There is no pity [16]. Chaos Drops (Dec 2025) added an Ultra tier and a guaranteed drop on the 6th daily win [16].
- A third-party analysis credits the return of randomness with MAU 2.4x, DAU 3.9x and revenue 8.8x between Jun 2023 and Feb 2024 [17]. Many other changes shipped in the same period, so this is not clean evidence.

### 1.3 Marvel Snap: the collection is the progression
- **Upgrades are purely cosmetic.** A card has 7 visual tiers (Common through Infinity) with frame break, 3D, animation, logo and border effects. Each step costs credits plus card-specific boosters: 25/5, 100/10, 200/20, 300/30, 400/40, 500/50. Steps grant 1/2/4/6/8/10 Collection Levels, and cards unlock through the Collection Level reward track [18].
- A free player doing dailies was estimated to complete the collection in about 7 months [18]. Collection completion is Snap's main praised feature, along with "every card obtainable F2P" [19].
- **Beta backlash.** Paid Nexus Event loot boxes were reversed quickly: purchases were refunded and the event cards were returned to the free pool [18].
- **Spotlight Caches** show 4 items in advance: a new card, 2 older Series 4/5 cards and 1 random. They work as a bag without replacement, with pull odds of 25%, 33%, 50% and then 100%, so every featured item is guaranteed within 4 opens. Owned cards are replaced by an exclusive variant. Duplicate token payouts were later raised from 1k to 2k [20][21]. Critics said it gave fewer free tokens overall and encouraged hoarding [22].

### 1.4 Hearthstone: the reference for bad-luck protection
- **Packs.** Each pack has 5 cards with at least 1 Rare. Measured per-card rates over 27,868 packs: Common 71.65%, Rare 22.84%, Epic 4.42%, Legendary 1.10% [23].
- **Pity.** An Epic comes at least every 10 packs, a Legendary at least every 40, and the first Legendary of a new set within 10 packs [24].
- **Duplicate protection.** Legendaries got it in Aug 2017, fixing "one of the most annoying things" in the game [25]. It was extended to all rarities in Mar 2020, and disenchanted cards still count as owned [23].
- **Dust.** Crafting costs 40/100/400/1600 per rarity and disenchanting returns 5/20/100/400. That 4-8× spread keeps crafting a targeted fallback rather than the main source of cards [26].

### 1.5 Legends of Runeterra, Rush Royale and Clash Mini
- **LoR** is widely called the most generous CCG. Players choose which region's reward track to level, which avoids unwanted cards. A Weekly Vault (levels 1-15) holds capsules that can upgrade into Epic or Champion capsules. One estimate put 91.4% of the collection within reach for under $100 [27][28].
- **Rush Royale** is the anti-model. Account-wide crit and paid talents create up to 2× power gaps at 4-5k trophies, and players say legendaries are pure luck with no way forward otherwise [29].
- **Clash Mini** shut down on Apr 25 2024 after $2.3M IAP and 2.68M downloads in soft launch because it "did not meet the quality bar." A meta layer cannot save a core loop that is not good enough [30].

---

## 2. What players hate, ranked with evidence

| # | Pain | Evidence | Our rule |
|---|---|---|---|
| 1 | Pay-to-win power | Elite Wild Cards, paid-pass Evolutions [3][4]; Rush Royale crit [29]; 61% of Dungeon Keeper Mobile's negative reviews cite monetization [31] | No money. Power comes only from play. |
| 2 | Raising the level cap / upgrade walls | Clash Royale L14→L15→L16 backlash; Supercell conceded the "vocal response" [3] | Fix max level (L10) at launch. Grow sideways with new cards and ages. |
| 3 | Matched against higher levels | Clash Royale matches on trophies only [11]; Rush Royale 2× gaps [29] | Bots use level parity. Ranked applies a level cap. |
| 4 | Chest timers and slots | Clash Royale removed them because they delayed joy and forced logins [6] | Instant opening, unlimited stack, batch "Open all". |
| 5 | Useless duplicates | Hearthstone duplicate Legendaries [25] | Legendary duplicate protection; every duplicate converts to value. |
| 6 | Low-odds dead ends for missing items | Brawl Stars players couldn't get the brawlers they lacked [15]; Snap's "Series 3 slog" (rate raised 2/9→4/9) [21] | Crafting via Essence, shuffle bags, pity. |
| 7 | Randomness removed entirely | Brawl Stars 2022 backlash [13][14] | Keep randomness, make it free and bounded. |
| 8 | FOMO and time-limited exclusive power | Snap Nexus Events reversed [18] | Time-limited items are cosmetic only and return later. |

## 3. What was celebrated
- Hearthstone duplicate protection, in 2017 and again in 2020 [25].
- Marvel Snap's cosmetic-only upgrades plus Collection Level, and Spotlight caches with visible contents and a guarantee within 4 opens [18][20].
- Clash Royale removing timers and keys (2025) [6], Star Levels as a prestige sink [9], and level-capped tournaments [12].
- Brawl Stars bringing randomness back as free Starr Drops [16][17].
- LoR's player-chosen reward tracks [27].

---

## 4. Reveal presentation: why CS:GO and FIFA feel thrilling

**CS:GO/CS2 cases.** Official odds, disclosed in 2017 under Chinese rules:

| Tier | Color | Odds |
|---|---|---|
| Mil-Spec | blue | 79.92% |
| Restricted | purple | 15.98% |
| Classified | pink | 3.20% |
| Covert | red | 0.64% |
| Knife / Gloves | gold | 0.26% (about 1 in 385) |

Each tier is about 5× rarer than the one below [32]. The reel scrolls horizontally, slows down, and briefly flashes rare items past the pointer, so the suspense peaks before the stop. The rarity color strip under each tile makes every tile readable at a glance [33].

**EA FC walkouts.** The sequence is tunnel, then flags revealing nation → position → club, then a dark silhouette, then the card. The tells are graded, and players learn to read them:
- Boards (81-85): the camera skips the tunnel and the flag lines are gold.
- Walkouts (86+, or 84+ for specials): the full tunnel plays, the flag lines are silver, and the player walks onto the stage.
- Promo cards: color splashes in the tunnel.
- Double walkout: a rigid rather than waving club flag [34].
- In FIFA 21, a glowing door corner signaled a rare card [35].

The pre-signal turns waiting into active reading of cues, and the step-by-step reveal of information invites guessing.

**Evidence.**
- Larche et al. (2019): rarer loot-box outcomes produced more arousal, a stronger urge to open more, larger skin-conductance responses and longer post-reward pauses. Skin conductance rose during the roughly 2 s shake *before* the reveal [36]. Anticipation is half the payoff.
- Near-miss effects on persistence are weak and inconsistent (Pisklak et al. 2019) [37]. A tease is optional flavor, not a core mechanic.

### Our "thrill recipe" (free currency only)

Pre-roll the outcome on the "server" (in v1, local and seeded), then animate a climb.

1. **Arrival (0-0.5 s):** the chest drops with a bounce and a low thud.
2. **Anticipation (0.5-2.5 s):** the chest shakes, a noise riser plays, and light leaks through cracks in the current tier's color.
3. **Strikes:** the player taps 3 times (agency, as in Lucky Drops). Each tap either climbs a tier or does not, revealing the pre-rolled result step by step. A climb gets a color flash, a screen shake and a chord a step higher. A miss gets a soft "clunk," never a penalty sound.
4. **Burst (0.3 s):** a white flash and god-rays in the final tier color.
5. **Cards:** cards come out face-down and are revealed sorted ascending, with the rarest last. Each card back glows in its rarity color before flipping, like the FIFA gold/silver tells. Commons auto-flip at 0.15 s each.
6. **Legendary "walkout" (8-12 s the first time):**
   - The screen dims to a spotlight.
   - Silhouette → age icon → role icon → rarity banner.
   - The warrior plays its attack or victory animation, with fireworks and its own jingle.
   - "NEW!" badge.
7. **Duplicate payoff:** the copies bar fills (for example 3/4 → "UPGRADE READY") and the upgrade button pulses. Filling the bar is its own reward moment.
8. **Summary screen** with new items highlighted and an "Upgrade" call to action.

Hold-to-fast-forward and skip unlock after an item's first reveal. No sequence should be more than 10 s unskippable, and "Open all" batches the stack.

**Cosmetic crates (CS-style reel):**
- 50 tiles, with the winner placed around index 45.
- Filler tiles are drawn from the true odds, so the reel stays honest.
- 5-7 s with quintic ease-out.
- A WebAudio tick each time a tile crosses the pointer, falling slightly in pitch as the reel slows.
- The stop offset is random within the winning tile, so the result looks close to the next tile.
- The winning tile zooms in with a color burst, name, rarity and variant line.

**Audio and haptics (WebAudio):**
- Common: a pluck.
- Rare: two rising notes.
- Epic: a triad arpeggio plus shimmer.
- Legendary: a 5-note fanfare, a choir-like pad and a sub-bass drop.
- Each tier steps up in key. Add `navigator.vibrate` patterns on mobile.

**Rarity palette:** Common grey-white, Rare blue, Epic purple, Legendary gold, Mythic (cosmetic only) red/prismatic. This matches genre convention, with gold at the top everywhere.

---

## 5. Recommended system and starting numbers (tune by simulation)

Keep all numbers in data files, not code.

**Deck ("Age Loadout").**
- For each age, pick 4 warriors, 2 turrets and 1 age special from the cards you own. No duplicates.
- Show the loadout's average level, as Clash Royale shows deck level.
- A starter loadout is always available so nobody is ever locked out.
- The arena determines which cards can drop, so early chests are not diluted [6].

**Rarities and per-card rates** for non-guaranteed slots, modeled on Hearthstone:

| Rarity | Rate |
|---|---|
| Common | 72% |
| Rare | 22% |
| Epic | 5% |
| Legendary | 1% |

Skins roll separately, and Mythic exists only as a skin tier.

**Battle chests.** Tiers follow the Starr Drop curve and are revealed with the 3-tap climb:

| Tier | Final odds | Cards | Gold | Guarantee |
|---|---|---|---|---|
| Wood | 50% | 4 | 80 | none |
| Iron | 28% | 8 | 150 | at least 1 Rare |
| Gold | 15% | 20 | 400 | at least 2 Rare, 1 Epic |
| Crystal | 5% | 50 | 1,000 | at least 2 Epic, 20% Legendary, 1 Wild Card |
| Royal | 2% | 60 | 2,000 | 1 Legendary (unowned first), 25% skin |

**Daily flow:**
- The first 4 wins each day give a chest. Wins 5-10 give gold and trophies. After that, trophies only (a milder version of the Clash Royale caps [6]).
- Unclaimed daily chests bank for up to 3 days and nothing expires. This stays inside PEGI's "rewards return" tier (7+) rather than "punishes non-return" (12+) [38].

**Pity (shown in the UI):**
- An Epic at least every 10 chests.
- Legendary soft pity: +5 percentage points per chest after 25 dry chests, hard guarantee at 40.
- Onboarding script: chest 1 gives a new warrior, chest 5 an Epic, and a Legendary comes by chest 10.
- No duplicate Legendaries until all are owned.
- Featured cosmetics use a 4-item bag (25/33/50/100%) [20].

**Upgrades (max L10, one scale for all rarities).** Start levels: Common 1, Rare 2, Epic 4, Legendary 6. Each level gives +6% HP and damage, additive, so L10 is about +54% over L1. This keeps level gaps small compared with Clash Royale's roughly 10% per level.

| To level | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Common copies | 2 | 4 | 8 | 12 | 20 | 30 | 45 | 65 | 90 | 276 |
| Rare copies | – | 2 | 4 | 6 | 10 | 15 | 22 | 30 | 40 | 129 |
| Epic copies | – | – | – | 2 | 3 | 5 | 7 | 10 | 14 | 41 |
| Legendary copies | – | – | – | – | – | 1 | 2 | 3 | 4 | 10 |
| Gold | 10 | 25 | 60 | 120 | 250 | 500 | 900 | 1,500 | 2,500 | 5,865 |

**Pacing check.** These estimates assume about 5 chests a day and a pool of about 60 cards (24 Common, 18 Rare, 12 Epic, 6 Legendary):
- Income is about 59 cards and about 1,300 gold a day.
- Each Common gets about 1.75 copies a day and each Legendary about 0.1.
- Any given card maxes naturally in about 3-6 months.
- A focused loadout, helped by Wild Cards and Essence, maxes in about 6-10 weeks.
- The full collection takes about 6-8 months, in line with Snap's free-player estimate of about 7 months [18].
- Gold and cards run out at about the same time, so neither becomes a lone bottleneck.

**Duplicates past max.**
- Essence per duplicate: Common 5, Rare 20, Epic 100, Legendary 400. Crafting a card costs 40/100/400/1,600 (Hearthstone ratios [26]).
- Star Dust per duplicate: 1/10/100/1,000. Star levels 1-3 cost 5k/10k/20k and add golden visual tiers [9].

**Collection Level (Snap-style).** Each level-up grants +1/+2/+4/+8 collection XP by rarity. The reward track gives a chest every 10 levels, plus titles, frames and emotes [18].

**Trophy Road.**
- 10 arenas, roughly one per age band, every 400 trophies.
- A win gives +30 trophies. A loss costs −20, or 0 below 300 trophies.
- You cannot drop below an arena gate.
- A reward node every 100 trophies.

**Modes and bots.**
- Trophy Road uses real card levels. Bots match the player's loadout level ±1, never more than 1 above.
- A later Ranked mode caps all cards at L8 ("Standard") [12].
- Bots are named "Training Bot" or "Ghost of X" (a replayed deck) and always carry a bot badge.

**Cosmetics.**
- Unit and turret skins (Rare → Mythic), base skins per age, emotes, banners, titles, profile frames and kill effects.
- The profile shows collection %, collection level, star-level showcase, max trophies and favorite card.

**Transparency and compliance.**
- An odds table and live pity counters on every chest.
- Chest currency can never be bought or converted from any purchasable currency. Under PEGI's June 2026 rules, anything offered for purchase whose contents are unknown makes the game PEGI 16 [38]. Belgium already treats paid loot boxes as gambling [39].
- No time-limited purchase offers (PEGI 12 [38]).

---

## Sources
1. Clash Royale Wiki, Elixir: https://clashroyale.fandom.com/wiki/Elixir
2. Timesaver.gg, CR Card Levels Explained (Sep 2026): https://timesaver.gg/blog/clash-royale-card-levels-explained-september-2026
3. Supercell, How to get Elite Levels: https://supercell.com/en/games/clashroyale/blog/news/how-to-get-elite-levels-level-15-2/
4. The Highlander, "Clash Royale turns skill into a paywall" (Jan 2026): https://thehighlandernews.com/40324/opinions/clash-royale-turned-skill-into-a-paywall/
5. Clash for Dummies, Chest cycle pattern: https://clashfordummies.com/2017/02/15/clash-royale-chest-cycle-pattern-for-all-chests/
6. Supercell, CR April Update (chests, timers and keys removed): https://supercell.com/en/games/clashroyale/blog/release-notes/april-update/
7. Supercell, Lucky Drops update: https://supercell.com/en/games/clashroyale/blog/release-notes/game-update-lucky-drops/ and GameRant: https://gamerant.com/clash-royale-how-do-lucky-drops-work/
8. Supercell, All About Drop Rates: https://supercell.com/en/games/clashroyale/blog/news/clash-royale-chest-info-2/
9. Clash Royale Wiki, Star Points: https://clashroyale.fandom.com/wiki/Star_Points
10. Clash Royale Wiki, Arenas: https://clashroyale.fandom.com/wiki/Arenas
11. Quora/CR Wiki threads on matchmaking: https://www.quora.com/Why-do-I-keep-getting-matched-up-against-players-one-level-higher-or-lower-than-me-in-clash-Royale
12. Clash Royale Wiki, Tournament: https://clashroyale.fandom.com/wiki/Tournament
13. Game World Observer, Brawl Stars loot boxes removed: https://gameworldobserver.com/2022/12/13/brawl-stars-loot-boxes-removed-supercell
14. Kotaku, "Game Removes Loot Boxes, Players Revolt": https://kotaku.com/brawl-stars-loot-boxes-free-mobile-battle-pass-1849890262
15. Deconstructor of Fun, Brawl Stars ditching loot: https://www.deconstructoroffun.com/blog/was-brawl-stars-ditching-loot-a-good-move
16. Timesaver.gg, Starr Drops explained: https://timesaver.gg/blog/brawl-stars-starr-drops-july-2026
17. Ata Aktun, "What Brawl Stars Learned the Hard Way": https://ataaktun.substack.com/p/what-brawl-stars-learned-the-hard
18. Daniel Friedman, Marvel Snap economy guide: https://danielfriedman.substack.com/p/a-comprehensive-guide-to-the-marvel
19. Marvel Snap Zone, F2P guide: https://marvelsnapzone.com/marvel-snap-free-to-play-f2p-guide/
20. Marvel Snap official, Spotlight Cache: https://marvelsnap.com/spotlight-cache-more-cards-for-more-players/
21. Marvel Snap on X (Series 3 rate, token payout): https://x.com/MARVELSNAP/status/1879272429593481273 and Marvel Snap Zone cache rates: https://marvelsnapzone.com/cache-drop-rates-and-contents/
22. Marvel Snap Zone, Spotlight Caches changes: https://marvelsnapzone.com/spotlight-caches-details-drop-rates-and-card-acquisition-changes/
23. Hearthstone Wiki (wiki.gg), Card pack: https://hearthstone.wiki.gg/wiki/Card_pack
24. Hearthstone-decks.net, How card packs work: https://hearthstone-decks.net/how-do-card-packs-work-in-hearthstone/
25. HearthPwn, No more duplicate Legendaries: https://www.hearthpwn.com/news/2930-card-pack-changes-coming-no-more-duplicate
26. Hearthstone Wiki, Crafting: https://hearthstone.fandom.com/wiki/Crafting
27. The Magic Rain, LoR best F2P: https://themagicrain.com/2021/06/what-is-the-best-f2p-online-card-game-and-why-is-it-legends-of-runeterra/
28. Fanbyte, LoR Weekly Vault: https://www.fanbyte.com/legacy/legends-of-runeterra-weekly-vault-guide-ranks-rewards-upgrade-chance
29. Rush Royale App Store reviews: https://apps.apple.com/us/app/rush-royale-tower-defense-rpg/id1526121033?see-all=reviews
30. Game World Observer, Clash Mini shutdown: https://gameworldobserver.com/2024/03/15/clash-mini-shutdown-supercell-no-new-games-in-five-years
31. Game Developer, "When is pay-to-win too much?": https://www.gamedeveloper.com/business/when-is-pay-to-win-too-much-
32. CSGOSkins.gg, Official Valve case odds: https://csgoskins.gg/blog/csgo-case-odds-the-official-numbers-published-by-valve
33. GamerBolt, Why CS2 cases hook players: https://www.gamerbolt.com/opening-cs2-cases/
34. Dexerto, EA FC 26 pack animations: https://www.dexerto.com/wikis/ea-fc-26-guides-walkthrough-tips/pack-animations/
35. Dexerto, FIFA 21 pack animations: https://www.dexerto.com/fifa/how-to-recognize-fifa-21-pack-animations-for-walkouts-in-forms-icons-1429842/
36. Larche et al. 2019, Rare loot box rewards and arousal: https://pmc.ncbi.nlm.nih.gov/articles/PMC7882574/
37. Pisklak et al. 2019, Near-miss effect review: https://pmc.ncbi.nlm.nih.gov/articles/PMC7214505/
38. Reed Smith, PEGI interactive risk categories (June 2026): https://www.reedsmith.com/articles/pegi-launches-interactive-risk-categories-overhauls-age-ratings-for-loot-boxes-in-game-spending-and-communication-features/
39. Xiao, "Breaking Ban: Belgium's loot box law" (Collabra): https://online.ucpress.edu/collabra/article/9/1/57641/195100/Breaking-Ban-Belgium-s-Ineffective-Gambling-Law
40. EA, FC Pack Probabilities: https://www.ea.com/games/ea-sports-fc/news/fc-pack-probabilities
41. Game8, Genshin pity system (soft pity reference): https://game8.co/games/Genshin-Impact/archives/305937

Caveats:
- The session's web-search budget (200 calls) ran out near the end. RoyaleAPI and some fandom pages returned 403/402, so those facts come from other sources above.
- The Brawl Stars growth figures [17] are a third-party estimate with many confounding changes in the same period.
- All numbers in Section 5 are my proposed starting values, not researched facts, and should be checked with an economy simulation before tuning.
