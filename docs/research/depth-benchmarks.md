# Depth and variety benchmarks: what makes decisions meaningful for years (September 2026)

**Purpose.** Evidence for the owner's seven directions of 2026-09-27 (battle variety, a larger card pool, strategic depth over spam, lane fortifications, one lane, social play, the home village). For each benchmark: the mechanisms, what makes its decisions meaningful rather than busywork, how it avoids power creep and pay-to-win, and what transfers to a one-lane browser battler with no money. Section 5 ranks the 20 most transferable ideas.

**Binding frame.** `docs/design-engagement.md` (A15): the red lines, the five tests, "finished once beats fed forever", Dust and cosmetics for new systems, fairness as the only tuning target. Where an idea touches a red line, it says so. Engagement mechanics (streaks, banks, notifications) are covered in `engagement-benchmarks.md` and are not repeated here.

**Method and limits.** Web searches in September 2026. The session's egress policy blocked direct page fetches, so each fact comes from the search-engine summary of the cited page. Third-party figures are marked "third-party". Source IDs are `[S1]`-`[S73]` (list at the end).

---

## 0. Key findings

1. **Depth against spam comes from trades, not from clicking limits.** In Clash Royale the core skill is the positive elixir trade (answer a 7-cost card with a 3-cost one) plus not "leaking" at the 10-elixir cap [S10]. Legion TD 2 does the same with 75-125% attack and defence type multipliers and a choice between "power" and "income" sends [S44, S46]. Ageborn already has the tool, a 60% kill bounty to the killer, but spam is only punished if every age has a cheap, efficient answer. That is a numbers job for the strict spam proxies.
2. **Randomness works when players see it before they commit.** Marvel Snap's 3 random locations are revealed on turns 1-3, and Ben Brode's rule is "randomness the player can act upon" [S15]. Plants vs Zombies shows the zombie types before seed selection. Ageborn's battlefields and weather should be shown on the VS screen, and the player should pick which War Plan preset to bring after seeing them.
3. **The best mid-match choices are mirrored and small.** Mechabellum offers both sides the same 4 reinforcements each round and each side takes 1 [S47]. Hearthstone Battlegrounds offers trinkets at turn 6 and turn 9, only twice a game [S25]. Kingdom Rush's level-4 towers branch into two specialisations [S42]. Slay the Spire's boss relics pair +1 energy with a real cost [S69]. Ageborn doctrines should be 1 of 2, a trade-off rather than pure power, the same offers for both sides from the seed, and chosen with the Evolve button itself.
4. **Fair skill modes normalise levels.** Clash Royale fixes cards at Level 11 in tournaments and in the 2026 Global Tournaments [S7]. It kept Ranked at Level 15 for six months after Level 16 arrived, and now faces "no place where a skilled under-levelled player can compete" criticism since Ranked plays at L16 [S5, S6]. Chess, Hearthstone Arena and Battlegrounds have no power progression at all.
5. **Seeded rotation beats curated rotation for a small team.** Hearthstone cancelled Twist, its rotating curated ladder format, in May 2026 for low engagement and development cost [S27]. Snap rotates only location odds (+40% "featured", +60% "hot") [S14], and Clash Royale's Merge Tactics resets monthly with modifier pools [S8]. These are data switches, not new content.
6. **Rarity can carry the collecting thrill with zero power.** Snap's Infinity Splits are purely cosmetic: 4 finishes × 4 flares × 8 colours = 128 combinations, with Ink and Gold finishes at 10% [S19]. Snap Packs (April 2025) "never give you a card you already own" [S18]. Snap's revenue fall and power-creep complaints [S20] show the risk of letting new cards carry power instead.
7. **Keywords make a large pool readable.** Hearthstone uses keywords so players "recognise … the same ability" without reading, keeps about 20 evergreen keywords, and retires most set keywords with their set [S23]. Ageborn's sim already has a closed `AbilityDef` union (16 kinds) plus attack fields. Naming them as keywords with icons is cheap, and afterwards most new cards are data.
8. **Chess boomed on a learning loop, not on content.** The loop is instant fair games with a visible rating, short formats (bullet and blitz are about 79% of lichess games, 1+0 alone 25% [S63]), puzzles mined from real games with a rating per puzzle [S60], and post-game analysis with an evaluation graph and key moments [S59]. Lichess serves 5-7 million games a day with no ads, on donations [S64]. All of this can be built from Ageborn's deterministic replays.
9. **Tower-defence depth comes from scarce build spots and slow, high-value placements.** Kingdom Rush allows towers only on fixed spots ("spam cheap buildings and you run out of locations") and uses barracks to hold enemies inside tower range [S41]. Plants vs Zombies gives walls and instant-kill plants slow recharges (30 or 50 s against 7.5 s for attackers) [S30] and a single-use lawn mower per lane [S31]. This is the recipe for fortifications that do not turn into turtling.
10. **Friction removal is the 2025-2026 trend at Supercell.** Clash of Clans "Clash Anytime" (March 2025) removed troop, spell and siege training times and hero recovery [S56]. Clash Royale removed chest timers in 2025 (`engagement-benchmarks.md` 3.3). A village home screen should open features, not add waiting.

---

## 1. The lens: meaningful decision or busywork

A decision is **meaningful** when all five of these hold:

| Test | Meaning | Benchmark that shows it |
|---|---|---|
| Trade-off | Every option has a visible cost; no option is best in every state | Slay the Spire boss relics (Coffee Dripper: +1 energy, no resting) [S69] |
| Information | The player sees enough to act (input randomness) | Snap locations revealed before most cards are played [S15] |
| Counterplay | The opponent can see it and respond | Mechabellum: both boards visible between rounds [S47] |
| Attribution | The result can be traced to the decision afterwards | chess.com Game Review key moments [S59] |
| State-dependence | No rule of thumb ("always X") solves it | Clash Royale trades depend on the opponent's hand and elixir [S10] |

It is **busywork** when the best answer is constant ("spend as soon as possible", "always pick the damage boon"), when a tap has no alternative, or when randomness lands after the choice with no way to respond.

**Ageborn baseline (A2, A5.1).** Passive income is 6 gold/s and the cheapest unit (Infantry) costs 50 gold, so one Bonker per 8.3 s from income alone. The shared queue trains an Infantry in 1.5 s, so the queue never binds: gold is the only brake. The killer earns 60% of cost in gold and 100% in XP (30 gold and 50 XP per Bonker), and the owner gets 40% XP on death. So blind spam is punished only when the opponent kills spam cheaply, with splash, chain, turrets or Last Stand. The benchmarks agree that this is where the fix belongs, together with commitment and timing tools (sections 2.1, 2.8, 2.9, 5).

**Anti-creep toolkit seen across the benchmarks:** sidegrade rarity; normalised levels in skill modes; a "vanilla line" of plain cards that new cards must not beat on raw efficiency (Snap [S20]); metrics-driven numbers-only balance (Slay the Spire [S71], Clash Royale monthly); rotation (Hearthstone Standard swaps 70 core cards a year [S22]); cosmetic prestige in place of power.

---

## 2. Benchmarks

### 2.1 Clash Royale (Supercell)

**Facts, 2024-2026**
- **Evolutions:** a card in an Evolution slot turns into its evolved form after N "cycles" of the base card. Most need 2 cycles and a few (Mortar, Bomber) need 3; after use the card returns to normal [S2]. Unlocking one costs 6 Evolution Shards [S1].
- **Heroes (Q4 2025):** Champions were folded into Heroes. Each Hero is a card with one ability button, bought for 200 Hero Coins [S4].
  - Mid-March 2026: the special slots went from 2 Evo + 2 Hero to 1 Evo + 1 Hero + 1 Wild, "to limit complexity and maintain core gameplay" [S3].
  - 26 August 2026: every Hero and Champion ability became single-use per deployment, with nothing recharging [S4].
- **Levels:** the level cap rose to 16 on 24 November 2025. Ranked stayed capped at 15 until May 2026 and now plays at 16, which drew fairness criticism [S5, S6]. Tournaments with fixed decks lock everything at Level 11, and the 2026 Global Tournaments use Level 11 deck building [S7].
- **Seasonal Trophy Road (26 May 2026):** above 14,000 trophies a monthly seasonal road starts. Entering Seasonal Arena II bans your 8 most-winning cards from Arena I and lifts your cards to at least Level 15 [S9].
- **Modes:** Merge Tactics launched on 30 June 2025 (a 4-player auto-battler: 20 troops, 11 traits, 27 modifiers) and resets monthly from October 2025 [S8]. A "party" slot rotates Draft, Mega Draft, Triple Draft, Chaos Draft, Touchdown and Double or Triple Elixir [S13]. 2v2 can be played with a friend without trophies at risk [S12].
- **Balance:** monthly balance patches [S5]. Evolutions were the centre of the May 2024 nerf controversy [S11].

**Mechanisms that create depth**
- An 8-card deck with a 4-card hand in cycle: what you can play now depends on what you played.
- An elixir cap of 10: waiting costs you ("leaking"), yet overspending leaves you without an answer [S10].
- Positive trades: a cheap answer to an expensive threat, then a counter-push with what survived.
- A two-dimensional drop position and the lane choice: *where* matters as much as *what*.

**Meaningful against busywork.** Spam of cheap cards is punished by cheap spells (Log, Arrows) that kill whole swarms at a gain. Evolutions add a rhythm decision: cycle quickly to reach the evolved version, or hold the card for defence.

**Creep and pay-to-win.** Levels are real power, and the L16 move shows the failure mode. Evolutions are sold faster through paid passes and were repeatedly overtuned. The mitigations are tournament level caps and slot limits (reduced in 2026).

**Transfer to Ageborn**
- The trade economy (idea 1). Ageborn has no hand cycle (A3), so trades and timing must carry the depth.
- Level normalisation everywhere skill is measured (idea 2).
- A complexity budget: Clash Royale *cut* special slots in 2026. A "Veteran" evolution-style rhythm (every Nth training of a card is upgraded) would fit the sim, but it is creep-prone, so it is not ranked.
- The Seasonal Arena II ban of your top-8 cards was already rejected by A15.22 ("takes away the player's identity"). Keep it rejected.

### 2.2 Marvel Snap (Second Dinner)

**Facts**
- **Locations:** 3 random locations per game, revealed on turns 1, 2 and 3, each with a rule. About 80 existed early in the game's life [S15]. "Featured" locations appear 40% more often for 48 h and "Hot" ones 60% more often for 24 h [S14].
- **Brode's rule:** randomness should be "input randomness the player can act upon", and "both players feel the same amount of randomness" [S15].
- **Snap and Retreat:** stakes of 1, 2, 4 or 8 cubes. Players call this a bigger skill than card play [S16].
- **Collection:** Series 1 (46 cards, CL 18-214), Series 2 (25 cards, CL 222-474), Series 3 from CL 486 [S17]. New cards launch in Series 5 and drop to 4 and 3 over time. In 2025 more cards dropped straight to Series 3 because players said releasing everything in Series 5 "interfered with their ability to get excited" [S17].
- Snap Packs replaced Spotlight Caches on 29 April 2025 and never give an owned card [S18].
- Six rotating limited-time modes in 2025, up from 2 [S21].
- The total pool is several hundred cards; third-party counts differ between 273 and 496 [S20].

**Mechanisms.** A short match (6 turns). Location rules change the value of every card, so the same deck plays differently each game. A risk verb (Snap) turns reading the opponent into the main skill.

**Meaningful against busywork.** Locations are shown before most cards are committed, so they are decisions, not dice. Brode defends even the hated locations because both players face them.

**Creep and pay-to-win.** Upgrades and variants are cosmetic, but new cards carry power and are bought first. Players report overpowered metas "for months" and buff-heavy balance. The studio keeps plain "vanilla" cards as a power reference line [S20]. Revenue fell from about $99M (2023) to about $26M (2025), third-party (`engagement-benchmarks.md` 3.7).

**Transfer to Ageborn**
- Battlefields as locations (idea 3). A featured battlefield per day from the date seed, instead of a calendar (idea 11).
- Cosmetic rarity ladders with no power, and no-duplicate pools (idea 15).
- The vanilla line as a balance rule (idea 16).
- The Snap stake verb is grey for minors (A15 already classes "bet currency" modes as grey). Heat (A15.14) is the offline analogue: opt-in handicaps for extra reward.

### 2.3 Hearthstone (Blizzard): keywords, rotation, Battlegrounds, Arena

**Facts**
- **Standard, Year of the Scarab (2026):** 3 expansions plus mini-sets a year. The Core Set swaps 70 cards out and 70 in [S22].
- **Keywords:** about 20 evergreen keywords (Battlecry, Deathrattle, Discover, Taunt, Rush, Reborn and more). Most set keywords stay in their set; a few (Discover, Reborn, Tradeable) became evergreen [S23].
- **Arena revamp (patch 32.4, June 2025):**
  - Drafts start by picking a **Legendary Group**: a Legendary plus 3 cards that complement it [S24].
  - "The Arena" runs end at 5 wins (it used to be 12). "The Underground" keeps 12 wins and lets you **redraft after a loss** [S24].
- **Battlegrounds:**
  - Minions have Tavern tiers 1-6, all cost 3 coins, and you choose between 2 heroes at the start [S28].
  - Trinkets (Season 8, August 2024): 4 Lesser Trinkets offered on turn 6, a Greater offer later. Typed trinkets need "2 minions of the type on turn 6 or 3 on turn 9" [S25].
  - Anomalies (one lobby-wide rule per game) returned in patch 31.6 alongside trinkets [S25].
  - Season 9 rotated about 90 minions out and about 90 in [S25].
  - Duos (April 2024): 4 teams of 2 share a health total and pass cards through a portal for 1 gold [S26].
- **Twist** (a rotating curated ladder format) was removed on 5 May 2026. It "did not connect with players", and another long-term ranked mode was "too demanding" [S27].

**Mechanisms**
- Keywords compress rules.
- Draft modes remove collection advantage.
- Battlegrounds varies every lobby through the hero choice, the minion-type pool, anomalies and rotating minions. That is combinatorial variety from existing pieces.

**Meaningful against busywork.** Trinket timing (turns 6 and 9) makes 2 big pivots per game rather than a stream of small ones. Legendary Groups give a draft a direction from the first pick, so later picks have something to evaluate against.

**Creep and pay-to-win.** Standard rotation is the creep valve, but it takes cards out of the main mode, which would break Ageborn's red line "nothing earned is taken away" (only if applied to the main ladder). Arena and Battlegrounds are level-free.

**Transfer to Ageborn**
- A keyword glossary (idea 6).
- Doctrine picks at only 2 moments per match, mirrored (idea 4). Hearthstone's trinkets show 2 pivots is enough.
- Draft War starting with a "Banner Group" (idea 13).
- Seeded variety, not Twist-style curated formats (idea 11).
- Duos card passing maps to 2v2 later and to reinforcements (idea 20).

### 2.4 Plants vs Zombies (PopCap, EA): defence structures and lane design

**Facts**
- 5-6 lanes; plants are stationary "towers" that players "immediately understand" [S29].
- Sun is the economy, and Sunflowers are the engine plant; George Fan made them cheap to teach engine building [S29].
- Every seed packet has a recharge: Fast 7.5 s, Slow 30 s, Very slow 50 s. At the level start Fast is ready, Slow takes 20 s and Very slow 30-40 s [S30].
- Up to 6 seed types are chosen before a level, on a screen that shows the incoming zombie types [S30].
- The lawn mower is a one-time last defence per lane [S31].
- **Replanted** (23 October 2025) added "Cloudy Day" (limited sunlight) and "Rest in Peace" (permadeath) [S32].
- **PvZ Heroes:** 5 lanes; the leftmost is high ground (some cards gain or lose from it) and the rightmost is water, which only Amphibious cards may enter. A reviewer notes this "gives enough room for strategy" [S33].

**Mechanisms.** Recharge is the tempo limit: expensive or decisive plants cannot be spammed however much sun you have. Walls (Wall-nut) buy time for attackers behind them. Lanes and terrain make placement a decision.

**Meaningful against busywork.** The pre-level seed pick against a *shown* threat is PvZ's deepest decision. Slow recharge on walls makes each wall a commitment of position, not a reflex.

**Creep and pay-to-win.** The original game sold no power. PvZ 2's paid plants and Plant Food are the counter-example (not researched further).

**Transfer to Ageborn**
- Fortifications with long recharge and few build spots (idea 10).
- Recharge ("muster cooldown") on high-impact cards only (idea 7).
- Terrain features taken from PvZ Heroes: high ground, water and a bridge (idea 3).
- "Reveal, then choose preset" (idea 9).
- Ageborn's Last Stand is already the lawn mower: one use, visible, automatic at 10%.

### 2.5 Stick War: Legacy (Max Games)

**Facts**
- The player can take control of any unit (a gold star over its head). Controlled units deal more damage: regular units +35%, Generals +25% [S34].
- The whole army follows global Attack, Defend and Garrison stances.
- Miners gather gold from deposits that run out. The standard advice is 3-4 miners before attacking [S35].
- Stick War: Saga (2024) added decks and PvP. Paid generals with power caused backlash (`genre-peers.md`).

**Mechanisms.** The economy is built from units (miners are bodies that can be killed). Stances move the whole army. One unit can be directly controlled.

**Meaningful against busywork.** The miner count is greed against safety; "Defend, wait 2 s, attack" regroups before a push [S35]. Direct control is fun but is a click-speed skill.

**Creep and pay-to-win.** Legacy: skins with stats and a weekly paid content gate. Saga: paid generals.

**Transfer to Ageborn**
- Stance already exists (Charge and Hold). Make the Hold *line* movable (idea 8) instead of adding unit control, which favours click speed (the owner's concern).
- Treasury already covers "economy against army". Killable gatherers would add harassment play, but that is a sim change and is not ranked.

### 2.6 The Battle Cats (PONOS)

**Facts**
- Every cat has its own recharge.
- Cheap "meatshields" are spawned in a rhythm, clicked at 70-90% of the cooldown so the next wall arrives just as the previous one dies [S38].
- The Worker Cat raises money income in battle, and the Cat Cannon charges over time (`genre-peers.md`).
- **Cat Combos:** specific cats in the top row of the lineup (the first 5 slots) give small bonuses such as starting money, cannon attack or recharge, worker maximum, base defence, "research" (recharge down) or bounty up. Several combos can be active at once [S36].
- **Talents** at True or Ultra Form add or upgrade abilities, or add a new target trait [S37].
- The collection has 6 rarity tiers.

**Mechanisms.** Per-unit cooldowns give the battle a rhythm. Enemy traits (Red, Floating, Metal and more) make specific cats counters. Lineup combos reward collection breadth with small, non-stat bonuses.

**Meaningful against busywork.** Spawn timing against a slow heavy hitter's attack animation is a real skill with a single lane. On easy stages it degrades into tapping everything off cooldown.

**Creep and pay-to-win.** Heavy: Uber gacha, energy, treasures that are "essential" [S37]. Not a model for the economy.

**Transfer to Ageborn**
- Small, visible lineup bonuses (idea 14).
- Muster cooldowns (idea 7). Keep them off the cheapest unit, or tapping on cooldown becomes the whole game.

### 2.7 Kingdom Rush (Ironhide): build spots and heroes

**Facts**
- Towers only go on fixed spots along the road.
- Barracks spawn up to 3 soldiers that block enemies, and "should always be built in range of other towers" [S41].
- Level-4 towers branch: for example the Mage tower becomes the Arcane Wizard (single-target burst) or the Sorcerer Mage (crowd control and support) [S42].
- Heroes gain XP in the level and spend upgrade points on 5 skills [S43].
- **KR5 Alliance (2024):** 2 heroes at once, and a **tower loadout of 5** drawn from 15 towers [S39].
- **KR6 Genesis (24 September 2026):** 15 towers, 12 heroes, 9 spells, 18 stages. Towers use a shared global upgrade system "that can be retuned between stages and reset at will" [S40].
- Premium one-off purchase, $6.99 [S40].

**Mechanisms.** Scarce build spots are the core constraint. Blockers and damage dealers are complementary (the blocker holds enemies in the damage zone). A specialisation branch late in each tower's life is a commitment. Before a level, loadout limits force a choice even with a big pool.

**Meaningful against busywork.** Spots end spam by construction. Branches are trade-offs (burst against control) that depend on the enemy mix. Free respec (KR6) lets players experiment without a penalty.

**Creep and pay-to-win.** A premium price, and heroes sold in some versions. KR6's respec-at-will removes "wrong build" regret.

**Transfer to Ageborn**
- Fortifications on 2 fixed own-half spots (idea 10).
- Turret "Modernise" could later offer a 1-of-2 branch, the same idea as doctrines (idea 4).
- The KR5 loadout of 5 from 15 supports keeping Ageborn at 5 unit slots even as the pool grows (section 4).

### 2.8 Legion TD 2 (AutoAttack Games)

**Facts**
- Each player builds fighters on their own lane grid against waves and hires mercenaries that attack the enemy lane.
- Spending mythium on sends raises your income for good. "Power mercs" are stronger but give less income, so you send them only when you expect to break the opponent that wave. Otherwise you send for income or upgrade your King [S44].
- Attack and defence types give damage multipliers from 75% to 125% [S46].
- Experienced players memorise the known wave table and build against specific waves [S46].
- **Mastermind:** instead of a fixed legion you draft 6 fighters from 10 options across all legions. "Chaos" re-rolls your 6 available fighters every wave, with one fighter guaranteed per tier [S45].
- The roll always covers "different price points … and all attack and defence types" [S45].

**Mechanisms.** Every gold spent is an investment decision: defence now, pressure now, or income later. The information is public: the wave table and the opponent's grid.

**Meaningful against busywork.** The same resource buys three different futures, and the right one depends on what the opponent holds. Guaranteed coverage in random rolls keeps randomness fair.

**Creep and pay-to-win.** Cosmetic shop; all units are available in the match.

**Transfer to Ageborn**
- Trade economy and modest type multipliers (idea 1). Ageborn's ×2.0 anti-armor is strong: fine for the triangle, but new keywords should stay near ±25%.
- Random armies with guaranteed coverage per age (idea 13).
- An "income against pressure" choice already exists through Treasury against units. Keep Treasury's payback visible (A2.3: 133-367 s).

### 2.9 Mechabellum (Game River)

**Facts**
- Round-based auto-battler; 1.0 on 27 September 2024; 2.0 on 22 September 2026 with a Free Edition and "Star Expedition", a roguelite mode against asynchronous "player mirrors" with co-op [S48, S50].
- Units persist between rounds. Supply rises 200 per round [S49].
- Only 2 units can be deployed per round (a specialist adds 1) [S47].
- From round 2, both players are offered the **same 4 reinforcements** and each picks 1. Picks do not reappear [S47, namu wiki in S47].
- Techs upgrade a unit type (for example +40 m range) [S47].
- "Everything has … multiple counters." You watch the opponent's placements and adapt [S49].
- **Catch-up:** destroying the leader's units pays extra supply (patch 1.3 aimed to "reduce the pressure of leading players") [S49].
- The loser of each round loses HP equal to the surviving enemy units [S49].
- Standard advice: place fast units behind slow ones so they reach the centre together [S47].

**Mechanisms.** Simultaneous commitment with full information about the previous state. Mirrored offers. A deploy cap per round. Techs that compete with new units for supply. Formation.

**Meaningful against busywork.** A deploy cap plus visible boards turns every round into a counter-and-bluff puzzle, so spam is impossible by construction. A mirrored pick is fair and readable ("they took the missile strike, so I spread out").

**Creep and pay-to-win.** Paid game until 2.0. The Free Edition unlocks tech points and cosmetics more slowly and limits chat [S48]; the power in a match is equal.

**Transfer to Ageborn**
- Mirrored doctrine offers at evolve (idea 4).
- Formation timing already exists through Hold then Charge; a movable line makes it richer (idea 8).
- Catch-up through the leader's losses mirrors Ageborn's underdog bounty (A2.3). Keep it visible.
- Async mirrors for ghost battles (ideas 19 and 20).

### 2.10 Clash of Clans (Supercell): village, reinforcements, wars, layouts

**Facts**
- **Clan Castle:** request troops once every 20 minutes. Clanmates donate up to 6 troops per request (9 with a clan perk). Donors earn XP by housing space [S53]. Castle troops fight in your attack or defend your base.
- **Clan War Leagues:** once a month, clans enter with 15-50 players, meet 7 other clans in a group, and each chosen player gets 1 attack per war day. Stars decide promotion [S54].
- **War bases** are built against 3-star attacks: long troop pathing, compartments, dead zones, traps where popular attacks go [S55].
- Players share layouts through a "Share as Link" button, and whole sites catalogue thousands of copyable bases [S55].
- **Clan Capital:** Raid Weekends run Friday-Monday, 5 attacks per member, against other clans' shared capitals [S57].
- **Ranked Battles (6 October 2025):** weekly brackets of 100 players. Temporary troops are banned in ranked and war. Inactive players now drop one league per 4 weeks instead of per week [S51].
- **Clash Anytime (March 2025)** removed troop, spell and siege training times and hero recovery [S56].
- Town Hall 18 (November 2025) added Guardians and merged defences [S52].
- Hammer Jam (1-17 November 2025): 50% off upgrade time and cost [S56].

**Mechanisms.** Asynchronous PvP against a player-designed defence controlled by the game. Cooperative clan goals. Layout design as creative play. Reinforcements as a social gift that matters in battle.

**Meaningful against busywork.** Base layout is a real design puzzle with a visible community meta. War attacks are scarce (1 per day), so each is planned. Timers and training waits were busywork, and Supercell removed them.

**Creep and pay-to-win.** Builder time is sold, and Hammer Jam is a time-limited discount (a red-line pattern for Ageborn: countdown offers). Ranked banning temporary troops is a fairness move.

**Transfer to Ageborn**
- Async defence layouts (War Plan plus fortifications) raided as labelled AI ghosts (idea 19).
- Capped one-use reinforcements (idea 20).
- Layout and War Plan share codes (A15.15 codes) as the offline version of layout links.
- A village with no timers to skip (section 4).

### 2.11 chess.com and lichess: why online chess boomed

**Facts**
- chess.com passed 200 million members in April 2025, three times its 2019 base, with 85% of new sign-ups from outside the US [S58].
  - Third-party: 250 million by February 2026; 8.7 million daily actives in Q4 2025 (+17.5% year on year); more than 20 million games a day [S58].
- The spikes followed *The Queen's Gambit* (+500% sign-ups), Gukesh's 2024 world title and chess at the 2025 Esports World Cup [S58].
- Lichess: 5-7 million games a day; no ads, no registration; funded by donations; about $789k in costs in 2025; 3 full-time staff [S64].
- **Formats:** bullet and blitz are about 79% of lichess games; 1+0 alone is 25%, 3+0 18%, 5+0 17% [S63].
- **Ratings:** Glicko-2; a rating is shown as provisional ("1500?") until the rating deviation falls below 110, usually after 15-20 games [S62].
- **Puzzles:** mined from real games. Every solution move is an "only move", auto-tagged by theme, and each puzzle has its own Glicko-2 rating [S60]. Puzzle Storm gives 3 minutes, with a combo bar that adds time and a 10 s penalty per miss. Puzzle Streak has no clock and gets harder, and one miss ends it [S61].
- **Game Review:** an evaluation graph (click any point to jump there), a coach that stops at key moments (last book move, a brilliant move, a missed tactic) and a "retry" of the moment [S59].
- **Arena tournaments:** Berserk halves your clock for +1 point on a win; two wins in a row start double points [S65].
- **Freestyle (Chess960):** the 2025 Grand Slam Tour removed opening preparation with 960 random start positions [S66].

**Mechanisms**
- Identical pieces: skill is the only power.
- Instant matchmaking by rating.
- Short games, so a loss costs 3 minutes.
- A learning loop: play, see the eval graph, find key moments, drill puzzles from the same patterns.
- Spectating and streaming.
- Randomised starts to beat memorisation.

**Meaningful against busywork.** Every move is a decision. Analysis attributes outcomes to moments. Puzzles isolate one decision. The loop is "I got better", not "I got more stuff".

**Creep and pay-to-win.** None in play. chess.com sells learning tools and coach depth, and lichess sells nothing.

**Transfer to Ageborn**
- The post-match review (idea 5) and Battle Puzzles (idea 12), both built on deterministic replays.
- Normalised levels (idea 2).
- Visible Glicko rating for online PvP (idea 18). Offline, A15 keeps trophies as the one moving rank.
- Short formats already exist (Short War).
- Random armies as Ageborn's Chess960 (idea 13).
- The fire streak (double points) is grey: it rewards "one more" inside a session. Do not copy it into offline modes.

### 2.12 Roguelite run choices: Hades, Hades II, Slay the Spire, Slay the Spire 2

**Facts**
- Slay the Spire 2 entered early access on 5 March 2026 with 5 characters, more than 575 cards, 278 relics and 4-player co-op [S67].
- Card rewards are "choose 1 of 3 or skip". Guide sites describe a hidden rare-card counter that raises rare odds after rewards without a rare, so a skip does not waste it [S68].
- Boss relics trade power for a cost: Coffee Dripper gives +1 energy but no resting; Runic Dome gives +1 energy but hides enemy intents [S69].
- Ascension has 20 cumulative levels, one modifier each (A1 more elites … A20 a double boss) [S70].
- The GDC 2019 talk: metrics-driven balance, "every card should have its place", comparing pick rate with win rate [S71].
- Hades II 1.0 (September 2025) has Fear vows: opt-in difficulty with a visible total [S72].
- Hades Duo boons appear only when you hold specific boons from 2 gods [S73].

**Mechanisms.** Small choices from 3 options, with skip allowed. Trade-off relics. Synergies with prerequisites, so early picks shape later offers. Stacking opt-in difficulty.

**Meaningful against busywork.** A skip option makes "take the best card" non-automatic. Trade-off relics are the purest meaningful choice. Prerequisites create builds rather than a pile of bonuses.

**Creep and pay-to-win.** None: premium games, and runs reset power.

**Transfer to Ageborn**
- Doctrine offers built as trade-offs, with the option to keep the default (idea 4).
- Pick-rate against win-rate metrics in the headless sim (idea 16).
- Heat (A15.14) already follows Hades and Ascension.
- Gauntlet boons (A15.17) already follow this pattern.

---

## 3. Cross-cutting tables

### 3.1 The anti-spam toolkit

| Mechanism | Used by | What it stops | Ageborn fit and cost |
|---|---|---|---|
| Positive trades (cheap answer, gain) | Clash Royale, Legion TD 2 | Blind spam feeds the opponent | Exists (60% bounty). Tune splash and chain answers per age; strict proxies. XS-S |
| Resource cap that leaks | Clash Royale (10 elixir) | Banking forever, then dumping | Not needed: gold banks without a cap, and XP has a cap. Skip |
| Per-card recharge | Plants vs Zombies, Battle Cats | Spamming the *best* card | Only on Heavy, Epic, Legendary and fortifications. S-M, sim |
| Deploy cap per window | Mechabellum (2 per round) | Volume over judgement | Queue of 5 exists but does not bind. Skip; the recharge covers it |
| Hand cycle | Clash Royale (4 of 8) | Always playing the same answer | Conflicts with A3's always-available tray. Skip for v1 |
| Mirrored offers plus visible boards | Mechabellum | Autopilot builds | Doctrines (idea 4). M |
| Scarce build spots | Kingdom Rush | Tower spam | Fortifications (idea 10) |
| Economy investment | Legion TD 2, Stick War, Battle Cats | Spend-now as always right | Treasury exists; keep payback visible |
| Formation timing | Mechabellum, Stick War (Defend, then Attack) | Trickle attacks | Hold then Charge exists; movable line (idea 8) |

### 3.2 Variety engines ranked by content cost

| Engine | Benchmark | Authoring cost | Fits "finished once"? |
|---|---|---|---|
| Seeded rule or location rotation | Snap featured/hot, Battlegrounds anomalies, Merge Tactics modifiers | Very low: rows in a table | Yes |
| Mirrored in-match offers | Mechabellum, Battlegrounds trinkets | Low: a few rule rows plus AI scoring | Yes |
| Draft or random armies | Hearthstone Arena, Clash Royale Draft, LTD2 Mastermind, Chess960 | Low: uses the existing pool | Yes |
| Mined puzzles | lichess | Low after the pipeline | Yes |
| New cards | Snap, Hearthstone, Clash Royale | High: art, audio, balance runs each | No: needs funding |
| Curated rotating formats | Hearthstone Twist (cancelled 2026) | High and recurring | No |

---

## 4. The owner's directions, checked against the benchmarks

1. **Choices at each evolve.** Supported by Mechabellum, Battlegrounds trinkets, Kingdom Rush branches and Slay the Spire relics. Three things to design carefully:
   - **Count.** Battlegrounds uses 2 pivots per game. Four picks in a Full War risk becoming routine. If the pick comes at every evolve, show only 2 offers (drawn from about 6 per age) and make both trade-offs, so neither is an automatic pick. Test in Phase 3 whether 2 picks per match (for example at Medieval and Modern) feel better than 4.
   - **Real time.** Ascension lasts 2.5 s and PvP cannot pause. Make the choice *the Evolve button itself*: "Evolve: Shieldwall doctrine" and "Evolve: Swift doctrine". This adds zero extra taps.
   - **Mirroring.** Offers for both sides come from the match seed, the opponent's pick is shown, and the AI picks through the utility model (A7.2).
2. **150+ cards in year one.** Snap and Hearthstone have large teams. Ageborn funds v1 only (A15), and each card needs a visual, audio, strings, a balance run and a 2,000-match win-rate check. Variety per unit of effort is far higher from battlefields × doctrines × modifiers (seed-combinatorial) than from card count. Recommendation:
   - Grow cards in series of about 10-15 per age wave, all data plus visuals, gated by the headless sim.
   - A keyword system (idea 6) keeps the pool readable.
   - **More loadout slots:** Clash Royale *cut* special slots in 2026 and Kingdom Rush 5 introduced a 5-tower loadout even with 15 towers. Keep 5 unit slots; add at most one flex slot, and only if the phone tray stays readable.
3. **Rarity and shinies.** Snap's cosmetic splits (10% rarest finish) and no-duplicate packs are the model. An ultra-rare tier should be a cosmetic layer (an animated variant with a walkout) with odds and pity shown. It must never be power, and red line 7 applies (no staged teases).
4. **A visible rating (chess).** A15 keeps trophies as the single moving rank offline and rejects a live skill chip (A15.22). A chess-style Glicko rating fits online PvP ranked only, shown with a provisional marker.
5. **Fortifications.** Kingdom Rush spots and PvZ recharge are the recipe: 2 fixed own-half spots, at most 2 alive, a 20-30 s recharge, ×2 damage from Breacher attacks (the siege keyword), decay during the Siege phase. Judge them at Checkpoint A.
6. **One lane.** PvZ Heroes and Legion TD get multi-lane depth from turn-based or build-phase play. Clash Royale's two lanes work with one tap per card in a 2D arena. Real-time multiple lanes on a phone with Ageborn's many units would reward click speed. Keep one lane, with layers (air, ground, underground) and terrain.
7. **Social and village.** Clash of Clans' social depth comes from async layouts, reinforcements and cooperative goals, all of which need a server. Its 2025 removal of training waits supports the "no timers to skip" rule. Offline, the benchmark-backed social layer is codes and ghosts (A15.15).

---

## 5. The 20 most transferable ideas, ranked

Ranked by (depth or variety gained) × (fit with one lane, determinism and A15) ÷ (build cost). Phases follow A15.19 language: v1 = Phase 2b or 3 only if small; later items are a wishlist.

| # | Idea | Evidence | Ageborn form | Phase, size |
|---|---|---|---|---|
| 1 | **Trade economy as the anti-spam engine**, checked by strict proxies | Clash Royale positive trades [S10]; LTD2 types and power against income sends [S44, S46]; Mechabellum multiple counters [S49] | Every age gets a cheap splash or chain answer that wins on trade against massed Commons (the Pebbler ricochet, the Log Roller's 6 targets, the Beehive). A2.14: cheapest-unit spam at or below 20% against tier VII; a new random-spam proxy (random affordable card each 2 s) at or below 10%; a "greedy spend-ASAP best DPS" proxy at or below 40%. Numbers only | v1 Phase 3 · XS-S |
| 2 | **Standard levels wherever skill is measured** | Clash Royale L11 tournaments, and criticism of the L16 Ranked [S5-S7]; Arena and Battlegrounds; chess | L7 for both sides in the Daily (exists), Heat, codes, puzzles, draft and all future PvP ranked. The AI ladder keeps A6.8 level matching | v1 rule · XS |
| 3 | **Battlefields with lane features, revealed before commitment** | Snap locations and featured odds [S14, S15]; PvZ Heroes high ground and water [S33]; PvZ stage types, Cloudy Day [S32] | At most 1 terrain feature (bridge choke, high ground +range, shallow water slows) plus optional weather, symmetric, on the VS screen. Weather can use the existing `matchMods` channel; terrain needs sim geometry | Weather v1 if cheap; terrain v1.1 · M |
| 4 | **Mirrored doctrine offer at evolve (1 of 2), chosen with the Evolve button** | Mechabellum same-for-both reinforcements [S47]; Battlegrounds trinkets turns 6 and 9 [S25]; Kingdom Rush branches [S42]; StS boss relics [S69] | Offers drawn from the match seed for both sides. Each doctrine is a trade-off from a closed list of modifier kinds (for example +15% Ranged range, −10% Ranged HP). The opponent's pick is shown; the AI scores offers in A7.2 | v1.1; prototype at Checkpoint A if spare · M |
| 5 | **Post-match review: advantage graph, 3 key moments, "watch from here"** | chess.com Game Review [S59]; lichess analysis | Sample an advantage score each second during the sim (army value on the lane + base HP% gap + XP and age gap). Key moments are the 3 largest swings, each opening the replay at that tick. Lives behind a Review button (A15.13 meter test) | v1.1 (v1 stretch with replays) · S-M |
| 6 | **Keyword glossary with icons** | Hearthstone evergreen keywords [S23]; Battle Cats traits [S37] | Name the existing `AbilityDef` kinds and attack fields as about 14 evergreen keywords (Reach, Splash, Chain, Pierce, Knockback, First Strike, Shield Wall, Brace, Heal, Aura, Shield, Stun, Breacher, Flying; names must not clash with Charge stance or the Siege phase). Card detail shows chips with one-line rules. At most 2 keywords per new card; a new keyword is code plus a test once, and cards using it are data | v1 UI chips · S |
| 7 | **Muster cooldowns on high-impact cards only** | PvZ 7.5 / 30 / 50 s recharge [S30]; Battle Cats rhythm [S38] | A data field `musterMs` per card (for example Heavy 6 s, Epic 12 s, Legendary 30 s, fortification 25 s), starting at enqueue. Infantry has none, so trades, not cooldowns, answer cheap spam | v1.1 prototype · S-M, sim |
| 8 | **Movable rally line** | Kingdom Rush rally point; Stick War Defend then Attack [S35]; Mechabellum formation [S47] | Drag the Hold flag between p 200 and p 520 (not fixed at 320). With high ground, holding the right line becomes a positioning decision | v1.1 · S-M, sim command |
| 9 | **Reveal, then choose preset** | PvZ seed pick against shown zombies [S30]; LTD2 known wave table [S46] | On the VS screen, after the battlefield and General are shown, the player picks 1 of their 3 War Plan presets. Bots use their personal plan. UI only once battlefields exist | With #3 · S |
| 10 | **Fortifications on fixed own-half spots** | Kingdom Rush spots and barracks [S41]; PvZ Wall-nut slow recharge [S30]; Clash of Clans traps [S55] | A new card type: a wall that ranged units fire over, a hidden trap, a bunker. 2 spots per side, at most 2 alive, recharge (#7), ×2 from Breacher attacks, decay in the Siege phase. Tunnelers bypass them. Turtle proxy stays at 35-45% | Prototype after Checkpoint A · M |
| 11 | **Seeded rotation, not curated formats** | Twist cancelled 2026 [S27]; Snap featured +40%, hot +60% [S14]; Merge Tactics monthly reset [S8] | A date-seeded "featured battlefield" and doctrine pool, with every mode always available. No new ladder formats; no calendar authoring | v1.1 · S |
| 12 | **Battle Puzzles mined from sims, rated per puzzle** | lichess only-move puzzles with a Glicko-2 rating per puzzle [S60]; Storm and Streak [S61] | A15.17 Clutch Puzzles plus a per-puzzle rating in meta and one shared "puzzle of the day" from the Daily seed. No streak counter | v1.2 · M |
| 13 | **Draft War and Random Armies** | HS Legendary Groups, 5-win and 12-win runs with redraft [S24]; Clash Royale Draft modes [S13]; LTD2 Mastermind coverage guarantee [S45]; Chess960 [S66] | Draft War (A15.17) starts with a "Banner Group" pick. Random Armies (a Skirmish preset) guarantees AA, splash and an air-hitter per age | v1.2 · M-L |
| 14 | **Small visible lineup synergies ("banners")** | Battle Cats Cat Combos [S36]; Battlegrounds type thresholds [S25]; Hades Duo boons [S73] | A loadout meeting a tag condition (for example 3 `bio` units) gets one small bonus (at most +5%), shown in the plan builder. One per age, never stacking. Data in `src/content` | v1.1 · S-M |
| 15 | **Rarity as spectacle; no-duplicate pools; an ultra-rare cosmetic tier** | Snap Infinity Splits (128 combos, rarest 10%) [S19]; Snap Packs no duplicates [S18]; Snap series pools [S17] | Keep the A3 sidegrade rule. The ultra-rare tier is an animated variant layer with odds and pity shown. New-card draws skip owned cards until a series is complete | v1.1+ · S |
| 16 | **Numbers-only balance with a vanilla line and pick-rate metrics** | StS metrics [S71]; Clash Royale monthly patches; Snap vanilla line [S20]; HS rotation [S22] | Each age's Commons are the vanilla line: new cards may not beat them on stats per gold at equal level. Add a bot-draft pick rate to the per-card win-rate CI. Never rotate owned cards out of any mode a player earned them for | Process now · XS |
| 17 | **Commander choice before the match** | Battlegrounds 1-of-2 hero choice [S28]; Clash Royale slot cap and single-use abilities [S3, S4]; Kingdom Rush heroes [S43] | 6-8 Commanders, each with one passive (economy, stance or tempo) and one single-use active per match. Standard levels in skill modes; the AI Generals use the same list. Counts against the complexity budget, so only after doctrines prove out | v1.2 · M |
| 18 | **Visible Glicko-2 rating and short formats in online PvP** | lichess provisional "?" [S62]; bullet and blitz about 79% [S63] | Online ranked shows a rating with a provisional marker until about 15 games; Short War is the default. Offline keeps trophies only (A15.9) | Online · M |
| 19 | **Async defence layouts and clan ghost wars** | Clash of Clans war bases, links, CWL 1 attack a day [S54, S55]; Clash Royale Clan Wars 2 boat defences [S12]; Mechabellum 2.0 async mirrors [S48] | A clan war attacks each rival member's War Plan plus fortification layout, played by the AI. Labelled "AI playing X's plan", 1 attack per member per war day, standard levels | Online · L |
| 20 | **Capped one-use reinforcements** | Clash of Clans Clan Castle (6 per request, every 20 min) [S53]; Battlegrounds Duos card passing [S26] | A clanmate lends 1 unit card; it can be called once per battle at standard level. No donation quotas or counts (red line 11) | Online · M |

**Already planned and confirmed by the benchmarks** (not re-ranked): Heat with a Pact menu (Hades Fear, StS Ascension, lichess Berserk: A15.14); codes and ghost challenges (A15.15); Gauntlet (A15.17); Last Stand as PvZ's lawn mower; Retreat as Snap's cut-your-losses verb.

---

## 6. Do not copy

| Pattern | Seen in | Why not |
|---|---|---|
| Ranked at max level | Clash Royale L16 Ranked [S6] | Levels beat skill; idea 2 instead |
| Ban your most-used cards | Clash Royale Seasonal Arena II [S9] | Rejected in A15.22 |
| Curated rotating ladder format | Hearthstone Twist [S27] | Cost and population split; idea 11 instead |
| New cards as the main power source | Snap metas and sales [S20]; Clash Royale evolutions [S11] | Power creep; sidegrade rule and vanilla line |
| Stake or bet verbs for minors | Snap cube doubling [S16] | Grey (A15); Heat covers the skill wager |
| In-session double-point streaks | lichess Arena fire [S65] | Rewards "one more"; not offline |
| Time-limited discounts or boosts | Clash of Clans Hammer Jam [S56] | Red line 12, and A15.22 "2× foil weekends" |
| Gacha, energy, paid heroes or generals | Battle Cats [S37]; Stick War Saga (`genre-peers.md`) | Red lines 1 and 2 |
| Direct unit control | Stick War [S34] | Click speed over judgement |
| Hard-counter multipliers above ×2 in new keywords | general | Hard counters make matches decided at the plan screen; LTD2's ±25% shows the softer range |

---

## Sources

- [S1] Clash Royale Wiki, Card Evolution: https://clashroyale.fandom.com/wiki/Card_Evolution
- [S2] PlayAware, Clash Royale evolution mechanic: https://playaware.gg/guides/clash-royale-evolution-mechanic
- [S3] RoyaleAPI, 2026 Mid-March Update: https://royaleapi.com/blog/2026-q1a-update-mid-march-2026?lang=en ; Supercell, Mid-March Update: https://supercell.com/en/games/clashroyale/blog/news/mid-march-update/
- [S4] timesaver.gg, Heroes explained (Sep 2026): https://timesaver.gg/blog/clash-royale-heroes-explained-september-2026 ; TrophyCoach, Single-use abilities (Aug 2026): https://trophycoach.com/guides/single-use-abilities-explained
- [S5] RoyaleAPI, Level 16 and economy changes: https://royaleapi.com/blog/level-16-and-economy-changes-2025-q4?lang=en ; timesaver.gg, Card levels explained: https://timesaver.gg/blog/clash-royale-card-levels-explained-september-2026
- [S6] SuperClashCN, Ranked mode 2026 guide: https://superclashcn.com/blog/clash-royale-ranked-mode-explained-the-complete-2026-guide/
- [S7] Clash Royale Wiki, Tournament: https://clashroyale.fandom.com/wiki/Tournament ; TrophyCoach, Global Tournaments 2026: https://trophycoach.com/guides/global-tournaments-guide-2026
- [S8] Clash Royale Wiki, Merge Tactics: https://clashroyale.fandom.com/wiki/Merge_Tactics ; Fragster, October 2025 Merge Tactics: https://www.fragster.com/clash-royale-merge-tactics-october-2025-seasonal-update/
- [S9] TrophyCoach, Seasonal Trophy Road Q2 2026: https://trophycoach.com/guides/seasonal-trophy-road-q2-2026 ; Supercell Support, Seasonal Trophy Road: https://support.supercell.com/clash-royale/en/articles/seasonal-trophy-road-2-2.html
- [S10] Clash Royale Wiki, Elixir: https://clashroyale.fandom.com/wiki/Elixir ; Sportskeeda, positive elixir trades: https://sportskeeda.com/esports/how-maintain-positive-elixir-trades-clash-royale
- [S11] zleague, May 2024 balance controversy: https://www.zleague.gg/theportal/clash-royale-may-2024-balance-changes-spark-controversy-among-players/
- [S12] Clash Royale Wiki, 2v2: https://clashroyale.fandom.com/wiki/2v2 ; Dot Esports, Clan Wars 2: https://dotesports.com/mobile/news/everything-you-need-to-know-about-clan-wars-2-in-clash-royale
- [S13] Clashest, events and challenges: https://clashest.com/events
- [S14] GameSpot, Featured and Hot Locations: https://www.gamespot.com/articles/marvel-snap-featured-and-hot-locations-explained/1100-6511164/ ; Dexerto: https://www.dexerto.com/gaming/marvel-snap-featured-hot-locations-1994994/
- [S15] Twinfinite, Brode defends locations: https://twinfinite.net/marvel-snap/ben-brode-defends-marvel-snaps-most-hated-locations/ ; GDC Vault, Designing Marvel Snap: https://gdcvault.com/play/1029024/Designing-MARVEL-SNAP ; Apple Developer, Behind the Design: https://developer.apple.com/news/?id=sosm2p7q
- [S16] Untapped.gg, Snapping and Retreating: https://blog.snap.untapped.gg/marvel-snap-wiki-snapping-retreating
- [S17] Marvel Snap Zone, Series guide: https://marvelsnapzone.com/series/ ; Marvel Snap, card acquisition updates: https://marvelsnap.com/card-acquisition-updates/
- [S18] Marvel Snap Zone, Snap Packs announcement: https://marvelsnapzone.com/snap-packs-announcement/
- [S19] Marvel Snap Zone, Infinity Splits: https://marvelsnapzone.com/infinity-splits/ ; Game Rant: https://gamerant.com/marvel-snap-infinity-splits-ink-gold-explained-guide/
- [S20] Marvel Snap Zone, power creep: https://marvelsnapzone.com/is-marvel-snap-suffering-from-power-creep/ ; Marvel Snap, balance update 10 Sep 2026: https://marvelsnap.com/balance-update-september-10-2026/ ; Dot Esports card count: https://dotesports.com/marvel/news/how-many-cards-are-in-marvel-snap ; Untapped schedule: https://snap.untapped.gg/en/schedule
- [S21] Marvel Snap Zone, 2026 roadmap: https://marvelsnapzone.com/future-of-marvel-snap-roadmap-announcement/
- [S22] Blizzard, Year of the Scarab: https://hearthstone.blizzard.com/en-us/news/24243444/welcome-to-the-year-of-the-scarab ; Hearthstone Top Decks, Core Set 2026: https://www.hearthstonetopdecks.com/all-changes-to-the-hearthstone-core-set-2026/
- [S23] Hearthstone Wiki, Evergreen keywords: https://hearthstone.wiki.gg/wiki/Category:Evergreen_keywords ; Ability: https://hearthstone.wiki.gg/wiki/Ability
- [S24] Blizzard Watch, Arena revamp: https://blizzardwatch.com/2025/05/30/hearthstone-revamps-arena/ ; Blizzard, Underground: https://hearthstone.blizzard.com/en-us/news/24208800/hearthstone-arena-expands-with-new-underground-mode ; HSReplay, Legendary groups: https://articles.hsreplay.net/2025/06/04/hearthstone-arena-new-legendary-groups-list/
- [S25] Blizzard Watch, Trinkets: https://blizzardwatch.com/2024/08/06/hearthstone-battlegrounds-trinkets/ ; HearthPwn, trinket rules: https://www.hearthpwn.com/news/12345-battlegrounds-developer-insights-updated-trinket ; Blizzard, Season 9: https://hearthstone.blizzard.com/en-us/news/24159389/announcing-battlegrounds-season-9 ; Blizzard, 31.6 patch notes: https://hearthstone.blizzard.com/en-us/news/24179332/31-6-patch-notes
- [S26] Blizzard, Introducing Battlegrounds Duos: https://news.blizzard.com/en-us/article/24008691/introducing-battlegrounds-duos
- [S27] Massively OP, Twist cancelled: https://massivelyop.com/2026/04/23/blizzard-has-canceled-yet-another-hearthstone-mode-this-time-its-twist/ ; Blizzard, A Farewell to Twist: https://hearthstone.blizzard.com/en-us/news/24259073
- [S28] Hearthstone Wiki, Battlegrounds: https://hearthstone.wiki.gg/wiki/Battlegrounds
- [S29] Game Developer, GDC 2012 tutorial tips from George Fan: https://www.gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan
- [S30] PvZ Wiki, recharge times: https://plantsvszombies.fandom.com/wiki/Thread:48881 ; Seed packet: https://plantsvszombies.fandom.com/wiki/Seed_packet
- [S31] PvZ Wiki, Lawn Mower: https://plantsvszombies.wiki.gg/wiki/Lawn_Mower
- [S32] Wikipedia, Plants vs. Zombies: Replanted: https://en.wikipedia.org/wiki/Plants_vs._Zombies:_Replanted ; TechRadar review: https://www.techradar.com/gaming/plants-vs-zombies-replanted-review
- [S33] Game Developer, PvZ Heroes designer review: https://www.gamedeveloper.com/design/plants-vs-zombies-heroes---designer-review ; Wikipedia: https://en.wikipedia.org/wiki/Plants_vs._Zombies_Heroes
- [S34] Stick War Wiki, User Control: https://stick-war.fandom.com/wiki/User_Control
- [S35] Stick War Wiki, Miner strategies: https://stick-war.fandom.com/wiki/Miner/Strategies ; NamuWiki tips: https://en.namu.wiki/w/Stick%20War:%20Legacy/%ED%8C%81
- [S36] Battle Cats Wiki, Cat Combo: https://battlecats.miraheze.org/wiki/Cat_Combo
- [S37] Battle Cats Wiki, Talents: https://battlecats.miraheze.org/wiki/Talents ; Special Abilities: https://battle-cats.fandom.com/wiki/Special_Abilities
- [S38] Battle Cats Wiki, Guide: Meatshields: https://battle-cats.fandom.com/wiki/Guide:Meatshields
- [S39] Pocket Gamer, Kingdom Rush 5 review: https://www.pocketgamer.com/kingdom-rush-5-alliance/review/ ; Game8 review: https://game8.co/articles/reviews/kingdom-rush-5-alliance-td-review
- [S40] GamingonPhone, Kingdom Rush 6 launch: https://gamingonphone.com/news/kingdom-rush-6-genesis-td-lets-you-relive-the-kingdoms-origins-on-mobile-and-pc-on-september-24-2026/ ; Steam: https://store.steampowered.com/app/4259190/Kingdom_Rush_6_Genesis_TD/
- [S41] Game Developer, Kingdom Rush campaign level design: https://www.gamedeveloper.com/design/kingdom-rush---the-wonderful-campaign-level-design ; Pocket Gamer, basic strategies: https://www.pocketgamer.com/kingdom-rush/basic-strategies/
- [S42] Kingdom Rush Wiki, Sorcerer Mage: https://kingdomrushtd.fandom.com/wiki/Sorcerer_Mage ; Arcane Wizard: https://kingdomrushtd.fandom.com/wiki/Arcane_Wizard
- [S43] Kingdom Rush Wiki, Heroes: https://kingdomrushtd.fandom.com/wiki/Heroes/Kingdom_Rush
- [S44] Legion TD 2 Wiki, Mercenary: https://legiontd2.wiki.gg/wiki/Mercenary ; official gameplay guide: https://steamcommunity.com/sharedfiles/filedetails/?id=1793195628
- [S45] Legion TD 2, Mastermind options: https://beta.legiontd2.com/mastermind/ ; Wiki, Mastermind: https://legiontd2.wiki.gg/wiki/Mastermind_Playstyle
- [S46] Switchblade Gaming, LTD2 wave composition (third-party): https://www.switchbladegaming.com/strategy-games/legion-td-2/wave-composition-guide/
- [S47] TheGamer, Mechabellum tips: https://www.thegamer.com/mechabellum-beginner-tips-tricks/ ; Pro Game Guides, reinforcements: https://progameguides.com/mechabellum/mechabellum-tips-guide-reinforcements-research-points-specialists/ ; NamuWiki, skills: https://en.namu.wiki/w/%EB%A9%94%EC%B9%B4%EB%B2%A8%EB%A3%B8/%EC%8A%A4%ED%82%AC
- [S48] Turn Based Lovers, Mechabellum 2.0: https://turnbasedlovers.com/overview/mechabellum-2-0/ ; GamingHQ, Free Edition: https://gaminghq.eu/2026/09/23/mechabellum-free-edition-2-0-update/
- [S49] MechaMonarch, patch 1.3: https://mechamonarch.com/news/mechabellum-patch-notes-1-3/ ; MonsterVine review: https://monstervine.com/2025/04/mechabellum-review/ ; Game Rant counters: https://gamerant.com/mechabellum-all-unit-counters/ ; Steam discussion on supply: https://steamcommunity.com/app/669330/discussions/0/521962388138841184/
- [S50] Wikipedia, Mechabellum: https://en.wikipedia.org/wiki/Mechabellum
- [S51] Clash of Clans Wiki, Ranked Battles: https://clashofclans.fandom.com/wiki/Ranked_Battles ; Supercell, Upcoming changes to Ranked Mode: https://supercell.com/en/games/clashofclans/blog/news/upcoming-changes-to-ranked-mode/
- [S52] GamingonPhone, Town Hall 18: https://gamingonphone.com/news/clash-of-clans-town-hall-18-update-all-the-details-and-features-explained/
- [S53] Clash of Clans Wiki, Clan Castle: https://clashofclans.fandom.com/wiki/Clan_Castle ; Supercell Support: https://support.supercell.com/clash-of-clans/en/articles/clan-castle-troops-and-spells-2.html
- [S54] Clash of Clans Wiki, Clan War Leagues: https://clashofclans.fandom.com/wiki/Clan_War_Leagues
- [S55] Blueprint CoC, copy base links: https://blueprintcoc.com/blogs/clash-of-clans-guides/copy-best-base-links ; ClashCodes war bases: https://clashcodes.com/bases/war
- [S56] Wikipedia, Clash of Clans (Clash Anytime, March 2025): https://en.wikipedia.org/wiki/Clash_of_Clans ; Sportskeeda, Hammer Jam November 2025: https://www.sportskeeda.com/mobile-games/clash-clans-hammer-jam-event-november-2025-schedule-event-details-revealed
- [S57] Clash of Clans Wiki, Raid Weekends: https://clashofclans.fandom.com/wiki/Raid_Weekends
- [S58] TechCrunch, 200 million members: https://techcrunch.com/2025/04/24/chess-com-reaches-200-million-members/ ; chess.com Q4 2025 report: https://www.chess.com/board-reports/2025-q4 ; VoxBooster online chess statistics 2026 (third-party): https://voxbooster.com/blog/online-chess-statistics-2026/
- [S59] chess.com Help, How does Game Review work: https://support.chess.com/en/articles/8584089-how-does-game-review-work ; chess.com, Game Review: https://www.chess.com/terms/game-review
- [S60] Lichess puzzle dataset: https://huggingface.co/datasets/Lichess/chess-puzzles ; lichess open database: https://database.lichess.org/
- [S61] lichess, Puzzle Storm: https://lichess.org/page/storm ; Puzzle Streak: https://lichess.org/streak
- [S62] ChessHere, rating systems: https://www.chesshere.com/chess-rating-system ; Wikipedia, Glicko: https://en.wikipedia.org/wiki/Glicko_rating_system
- [S63] Chess Digits, most common time controls (third-party): https://web.chessdigits.com/articles/most-common-time-controls
- [S64] lichess, End of Year Update 2025: https://lichess.org/@/Lichess/blog/lichess-end-of-year-update-2025/YRiNKoaQ ; Open Source For You: https://www.opensourceforu.com/2025/11/community-powered-lichess-outplays-corporate-giants/ ; Rook Review, 2025 expenses: https://rookreview.com/news/lichess-2025-expensess-report
- [S65] lichess, Arena tournament FAQ: https://lichess.org/tournament/help?system=arena
- [S66] Wikipedia, Freestyle Chess Grand Slam Tour: https://en.wikipedia.org/wiki/Freestyle_Chess_Grand_Slam_Tour
- [S67] Mega Crit, Slay the Spire 2 Early Access launch: https://www.megacrit.com/news/2026-03-05-early-access-launch/ ; StratGG roadmap: https://www.stratgg.com/guides/early-access/
- [S68] Slay the Spire Wiki, Card Rewards: https://slay-the-spire.fandom.com/wiki/Card_Rewards ; Spire Builds, card rewards: https://www.spirebuilds.com/guides/understanding-card-rewards ; GameStrategyHub, StS2 skipping: https://gamestrategyhub.com/games/slay-the-spire-2/when-to-skip-cards/
- [S69] GlyphShuffle, boss relic tier list: https://glyphshuffle.com/blog/slay-the-spire-boss-relic-tier-list ; Steam discussion, energy relics: https://steamcommunity.com/app/646570/discussions/0/2576571891723202258/
- [S70] Slay the Spire Wiki, Ascension: https://slaythespire.wiki.gg/wiki/Ascension
- [S71] GDC Vault, Slay the Spire: Metrics Driven Design and Balance (2019): https://www.gdcvault.com/play/1025731/-Slay-the-Spire-Metrics ; slides: https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf
- [S72] Wikipedia, Hades II: https://en.wikipedia.org/wiki/Hades_II ; BrokenBuilds, Fear guide: https://brokenbuilds.gg/hades-ii/guides/fear
- [S73] Hades Wiki, Duo Boons: https://hades.fandom.com/wiki/Duo_Boons

Internal: `docs/research/genre-peers.md` (Stick War Saga, Battle Cats economy); `docs/research/engagement-benchmarks.md` (Clash Royale 2025 comeback, Snap revenue); `docs/design-engagement.md` (A15 rules and red lines); `src/contracts/content.ts` (`AbilityDef`, 16 kinds).
