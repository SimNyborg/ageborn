# Queue item 12: in-battle upgrade paths (design pass)

> Kept in the repo on 2026-10-26 (copied from the orchestrating session's scratch folder). Paths under `/tmp/claude-0/...` or `scratchpad/...` inside point at that session's working files (captures, scripts) and may no longer exist. The owner questions are tracked in `docs/owner-queue.md`; until answered, the recommended defaults apply.

Date: 2026-10-18. Designer pass for owner queue item 12; nothing here is built. Read-only on the repository.

Inputs: `CLAUDE.md`; `docs/owner-queue.md` item 12; `docs/ui-principles-short.md`; `docs/ui-plan.md` 4.7; DESIGN A2.3, A2.4, A2.8, A2.11, A2.13, A2.14, A6.6, A7, A9.2, A15.13, A16.1, A16.2, A16.10, A18.2, A18.3, A18.5, A18.7.5, A18.12, A18.13, A18.15, B3, B12, Part C; `docs/decisions.md` (A18 phases 0-3, its HUD and AI entries, the release checks); `docs/PROGRESS.md`; `docs/research/a18-classics.md`, `a18-upgrades-pacing.md`, `aow-deepdive.md`, `depth-benchmarks.md`; the code in `src/content/raw/research.ts`, `src/sim/research.ts`, `src/sim/researchRules.ts`, `src/sim/damage.ts`, `src/sim/systems/turrets.ts`, `src/ai/brain.ts`, `src/ai/tiers.ts`, `src/ai/personalities.ts`, `src/ui/hud/{Council.tsx,council.ts,council.css,Tray.tsx,MountPopover.tsx,Hud.tsx}`, `tools/{proxies.ts,exploits.ts}`.

No headless runs were made for this pass: other agents were releasing on the same machine (load average about 4.5 on 4 cores). Every number marked "measured" comes from `docs/decisions.md` or `docs/PROGRESS.md` with its date; every other number is a starting value for the prototype.

---

## 0. Summary

- **Recommendation: Option C, "War Council III with turret paths".**
  1. Every War Council line gets a third rank: each troop class, Defences, Economy and Command. 48 picks instead of 28.
  2. Defences becomes the base's line: Watchtowers or Thick Walls, Engineers or Sally Port, Keep Walls or Bastion. Its turret stat picks move to the turrets themselves.
  3. Every turret on your base gets its own path, the tower-defence part: tap the turret, buy rank I and rank II, then choose one of two rank III shots. The ranks stay through Modernise.
  4. You can see all of it: rank pips on the tray cards, chevrons over the troops, studs and new parts on turrets, walls on the base. The opponent sees the same. No new button.
  5. Cheaper first steps (125 instead of 150) and stronger last steps, because research barely pays in a Short War today.
- **Why not per card.** A card leaves the tray at the next evolve, 60-125 s later, and an upgrade bought for it leaves with it. Priced fairly it returns too little; priced cheaply it is bought every time without thought (2.3). Classes, turrets, the base and the economy last the whole match, so paths pay there. Each card still shows its class's path, and per-card looks and signature ranks for Epic and Legendary cards can follow later.
- **What it fixes (measured).** Nothing goes past rank II today. The no-research script wins 45.8% of Short Wars against the researching one (gate: at most 30%). Turrets have no path, and the turret turtle wins 0% (band 35-45%), so turrets have room to matter more.
- **Economy.** Upgrades take about one gold in four (today about one in six), 10-16 purchases in a Standard War.
- **AI.** Extends what is built (tiers, counter scoring, Generals' styles) with rank III and a turret-rank action; same commands, public information.
- **Plan.** A prototype gate first (about 3 agent-days, nothing shipped, a go/no-go written down before the run), then rules, HUD, art and tuning: about 25-31 agent-days in all.
- **Three owner questions** (section 5): per class or per card; new troops only or also those already fighting; how big the upgrade share should be.

---

## 1. The goal

### 1.1 In the owner's words

> "Many more in-battle upgrades (inspired by the genre classic's sequel, our own design and names), and every thing upgradable more than 2 times, like tower upgrade paths in tower-defence classics; keep the idea of an upgrade path." (owner, 2026-10-07, `docs/owner-queue.md` item 12)

The orchestrator's note with it: "Today: War Council research (one pick of two) and Evolve. Design per-card in-match upgrade paths (several tiers, maybe branching), economy/turret/base upgrades, HUD that stays simple, AI uses them, balance gates."

It continues the owner's feedback of 2026-09-28 that led to the War Council: "upgrades with money are boring; there must be more ways to upgrade your troops, their abilities, how far turrets shoot, money generation" (`docs/research/a18-upgrades-pacing.md`).

### 1.2 What "done" means (our reading)

1. **Many more:** clearly more upgrades than today's 28 War Council picks, spread over troops, turrets, the base, the economy and powers.
2. **More than two times:** every upgradable thing has at least three steps.
3. **A path you can see:** where each thing stands (I, II, III) and what its next step is, shown on the thing itself.
4. **Our own design and names**, built on what the sequel and tower-defence games did well.
5. **The HUD stays simple:** no new always-visible control on an 844 × 390 phone (A16.1), at most two decisions on screen (A18.5.7), spends take two taps (U14).
6. **The AI uses them** with the same commands and the same information (A7.1).
7. **Measured first:** a prototype gate with the headless tools before anything ships.

### 1.3 What players love about upgrade paths

| What players love | Evidence | Lesson for Ageborn |
|---|---|---|
| A path you can see and climb, where each step changes how the thing looks and fights | Bloons TD 6: every tower has 3 paths of 5 tiers; every tier changes the look and often the behaviour [2]. Kingdom Rush: each tower is upgraded 3 times, then branches into two specialisations with 2-4 purchasable abilities [7] | Show the rank on the thing itself (pips, marks, a new part per rank); make rank III change behaviour, not only a number |
| A lock-out that turns the path into a decision | BTD6 crosspathing: one path may reach tier 5, a second only tier 2, the third is locked ("5-2-0") [5]. Kingdom Rush's two specialisations per tower [7]. Players call out a crosspath tier that is never worth taking as a non-choice [6] | Keep a real choice where it matters (the pairs, the rank III fork) and gate it with pick-flip, so no branch is dead |
| Upgrades bought with the army's own money, at rising prices, during the fight | The 2010 sequel moved power from unit prices into per-role upgrade tracks with several levels (Infantry Attack and Armour, Support Attack and Range, Anti-armour Attack and Armour) plus an Income level, at rising prices (Anti-armour Attack 400 then 800; Income 500 then 1,100) [1][3]. Random Dice: in-match upgrades bought with the summoning currency cost more each time [9]. Kingdom Rush 6: level IV skills are bought with battle gold [8] | Paid in battle gold from the troops' purse; each rank costs more than the last |
| Upgrades that change what a unit does | Stick War Legacy's Rage, Fire Arrows and Shield Wall are the upgrades its guides name; "+10%" upgrades are not remembered [1] | Rank II and III picks are abilities and new behaviour |
| A visible power spike the opponent can read and play around | StarCraft II "+1/+1 timing" and Stim timing; research shows on the building [2][10] | Every rank is public (ring, marks, Scouted list), and bots time pushes around research (built) |
| Economy upgrades only when they are a choice | Battle Cats' Worker Cat (8 levels per battle) is the decision a stage turns on; the sequel's flat Income level is not remembered [1] | An economy path with real alternatives: income, bounty, cheaper Commons |
| Turrets that matter but never decide the war from home | Both classics broke on turret range: in 2007 "turrets OP, build only turrets"; in 2010 turrets "can't even reach the midway point" and were "a waste of money" [1] | Turret paths add damage, rate and control, never range; Watchtowers stays the one range pick, capped at 560 lu |
| An AI that upgrades by the same rules | The 2007 AI was called "rigged" (free money, x2 stats); the 2010 Insane AI "has all the upgrades" from the start [1][3] | Bots buy paths with their own gold, in public, by tier and personality |
| No nagging | "The flashing reminder to upgrade to the next age is OBNOXIOUS" [3] | No flashing "upgrade ready"; steady marks only (U15) |

**Sources.** Web facts [5]-[9] come from search-result summaries; the pages themselves could not be opened from this environment (their hosts did not resolve), so treat their details as summaries.

1. `docs/research/a18-classics.md` findings 3, 4, 5, 8 and 9, with its source list (the genre classic of 2007, its 2010 sequel, Stick War Legacy, Battle Cats, Kingdom Rush).
2. `docs/research/a18-upgrades-pacing.md` section 2 (StarCraft II, Age of Empires II and IV, Teamfight Tactics, Mechabellum, Bloons TD 6, Kingdom Rush) and its table 2.7.
3. `docs/research/aow-deepdive.md` sections 3 and 6 (the sequel's flat prices and per-role upgrades; player complaints).
4. `docs/research/depth-benchmarks.md` sections 2.7 (Kingdom Rush) and 2.9 (Mechabellum).
5. Bloons Wiki, Upgrade: https://www.bloonswiki.com/Upgrade ; crosspath example: https://bloons.fandom.com/wiki/File:302DartMonkeyCrosspathImage.jpg
6. Steam discussion, Bloons TD 6 (a crosspath that is never worth taking): https://steamcommunity.com/app/960090/discussions/0/3485249057149532997
7. TV Tropes, Kingdom Rush: https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/KingdomRush ; BlueStacks, Kingdom Rush tips: https://www.bluestacks.com/blog/game-guides/kingdom-rush/kr-tips-tricks-en.html
8. Kingdom Rush 6 Genesis wiki, Militia Barracks: https://wikily.gg/kingdom-rush-6-genesis/classic-towers/militia-barracks
9. Pocket Tactics, Random Dice guide: https://www.pockettactics.com/random-dice/guide ; Random Dice 2 beginner guide: https://www.oslink.io/blog/guide/random-dice-2-beginner-guide.html
10. Liquipedia, StarCraft II upgrades and timing attacks (cited in [2]): https://liquipedia.net/starcraft2/Upgrades ; https://liquipedia.net/starcraft2/Timing_Attack

---

## 2. Today's systems and their limits

### 2.1 What exists

| System | What it does today | Steps | Prices | Where |
|---|---|---|---|---|
| War Council, Troops | One line per class (Infantry, Ranged, Heavy, Anti-heavy, Support; Epics and Legendaries count in their base class). Rank I a pair of stat picks, rank II a pair of abilities | I-II (Ranged I only) | 150 / 300 | `src/content/raw/research.ts` |
| War Council, Defences | Watchtowers or Quick Loaders; Engineers or Arsenal (all turrets at once) | I-II | 150 / 300 | same |
| War Council, Economy | Granary or Forage; Market or Bounty Hunters (replaced the Treasury) | I-II | 150 / 300 | same |
| War Council, Command | Signal Fires or War Horns | I | 150 | same |
| Turrets | Build on a mount; Modernise to the current age (new price minus 50% of the old); Sell (50% back after 1 s) | none | 150-250 | `src/sim/systems/turrets.ts`, `src/ui/hud/MountPopover.tsx` |
| Mounts | Mount 1 free, then mounts 2, 3, 4 | 3 buys | 150 / 350 / 700 | A2.3 |
| Base | HP follows the age; Last Stand once per match | none | none | A2.2, A2.11 |
| Evolve | XP to the next age, a 2.5 s Ascension, the new tray, two Vanguard troops; opens new research ranks | one per age | XP only, never gold | A2.4, A18.3 |
| Card levels | Meta, outside battle: copies and Amber, L1-L10, +5% per level; shown in battle as a bronze, silver or gold trim on the unit's ground ring | outside battle | Amber | A6.6 |

War Council rules as built (A18.5.1): one research slot; 10 / 14 / 18 s by rank; cancel refunds 75%; −20% for a side that is behind (a lower age position, or 20+ points less base HP); the two picks of a rank exclude each other; ranks open by window position (3 ages: I at the start, II in the 2nd age, III in the 3rd; 4-5 ages: I, II in the 2nd, III in the 4th; 7 ages: I, II in the 3rd, III in the 5th); public (a ring by their medallion, finished picks in the Scouted list); troop picks apply to units spawned after completion (A18.2 rule 2), turret, economy and command picks at once; every sum inside the A18.2 caps.

HUD as built: a round Council button in the tray's left cluster (key G) with a ring while research runs; a bottom sheet of `max(24%, 172 px)` over the tray (172 px on an 844 × 390 phone, covering the tray and the lowest 78 px of the lane); four track cards, Troops as five class buttons with rank pips; a tap flips a line to its pair, the first tap on a pick selects it, the second starts it, the badge flies into the button and the sheet closes (`src/ui/hud/Council.tsx`, `Hud.tsx`). The mount popover offers Build, Modernise and Sell (`MountPopover.tsx`).

AI as built: first research at 1:30 / 1:00 / 0:45 / 0:30 by tier, then gaps of 90 / 65 / 50 / 45 s; random, `aiHint` or counter scoring by tier; deepening owned lines before opening a third; each General's research style; push timing around its own and the enemy's research (`src/ai/brain.ts` `chooseResearch`, `src/ai/tiers.ts`, `src/ai/personalities.ts`).

Designed but not built: rank III for every line and Command II-III (A18.5.2-A18.5.5, marked v1.1), the Air and Underground lines (with their classes), and evolve doctrines (A16.10, waiting for an owner yes).

### 2.2 Limits

1. **Nothing goes past rank II.** Every line has two ranks at most, Ranged and Command one. The owner's "more than 2 times" fails everywhere.
2. **Research barely pays in a Short War, and less than it did.** The no-research script against the researching Balanced script (`exploits` duel; gate: it wins at most 30%) won 20 / 13% (Short / Standard) on 2026-09-29, 35% in Short at the release check of 2026-10-07, and 45.8 / 31.8% at the ranks gates of 2026-10-08 (`docs/PROGRESS.md`, `docs/decisions.md`). A likely reason: seven troop slots spread an army over more classes, so one class line touches less of it (2.3).
3. **The research share is low.** 14.9 / 16.1 / 16.8% of gold (Short / Standard / Full) against a 15-25% target, with about 9 items per Standard War (target 5-8), measured 2026-09-29. The gold, not the slot, is the brake.
4. **Turrets have no path.** The only turret upgrades are global Defences picks (Watchtowers, Quick Loaders, Arsenal), each for every turret at once; a single turret is only built, modernised or sold. The turtle proxies win 0% against tier VII (band 35-45%; A2.10.2 table and the 2026-10-07 release check): turrets are weak as a plan and have room to grow.
5. **The base has no path:** three mount buys and a once-per-match Last Stand. Keep Walls and Last Stand Drill are v1.1.
6. **The path is hidden.** Tray cards show no ranks; units show only a short shimmer when a pick completes; the badge art is still an open request (`docs/requests/wp4-council-badges.md`). A rank sits two taps deep and reads as a pair ("Weapons or Mail"), not as a path.
7. **The HUD is full.** At 844 × 390 the tray row is 828 px: the left cluster 100, seven cards of 51 × 69, the three stance buttons 152, Fort, Home and Field 56 each, plus gaps. The top band uses 734 of 750 px. A16.1 allows no new always-visible control.
8. **Cards change every age; classes, turrets, the base and the economy do not.** This decides who should own an upgrade (2.3).

### 2.3 The constraint that decides the design: what an upgrade is worth

A rank that makes some units 10-12% stronger is worth about 6-12% of the gold you will still spend on those units after buying it. (Between Lanchester's square law for massed ranged fire, where +12% damage is worth +6% more units, and the linear law of a three-wide melee front, where it is worth +12%.) So an upgrade pays only if its owner keeps receiving gold for long enough.

| Who owns the rank | Gold still spent on its units after the buy | Value of a +12% rank | So a fair price is about |
|---|---|---|---|
| One card, until the next evolve (Option A) | ~450 (the main card's share of the ~1,500 gold of a 100 s age) | 27-54 | 25-55 |
| One class, a Short War | ~1,500 | 90-180 | 90-180 |
| One class, a Standard War | ~2,300 | 140-280 | 140-280 |
| One turret | nothing more: it is already built and fires to the end (Modernise keeps its ranks) | a share of a whole turret's match | 100-250 per rank, like buying part of a fifth turret |

Assumptions: about 6,500 gold per side in a Short War and 9,800 in a Standard War of about 10:30 (A18.3.3), so about 1,500 gold per 100 s age; troops about 60% of it; the class you research is the one you field most, about 40% of the troop gold; the card you would rank takes about half of an age's troop gold (450 of 900). Orders of magnitude, not measurements: P0 measures the real value of every rank.

What it says:

- **A per-card rank** must cost 25-55 gold to break even inside one age. At that price every player buys it every age without thinking (a chore, not a decision); at a price that feels like a decision it loses gold. Investing just before an evolve is worthless, so the routine becomes "rank your main card right after each evolve".
- **A class rank** at 150 just pays in a Standard War and does not in a Short War, which is exactly what the no-research rows measure. A cheaper rank I (125) and a stronger rank III fix that.
- **A turret, the base and the economy** last the whole match, which makes them the natural owners of deep paths: the tower-defence lesson applies to our turrets almost one to one.

---

## 3. Three options

### 3.0 Rules every option keeps

1. Paid in battle gold from the troops' purse. No real money, no new currency, nothing sold (CLAUDE.md, A16.1).
2. Public: the opponent sees every rank (the research ring, the Scouted list, marks on units and turrets, the observation). Bots see exactly what a player sees (A7.1).
3. Same rules for bots. Difficulty changes how they use upgrades, never their stats (A18.2 rule 5).
4. Troop upgrades apply to units trained after they complete (A18.2 rule 2; owner question 2). Turret, base and economy upgrades apply at once.
5. The A18.2 caps hold for every sum: damage dealt at most +35%, damage taken at least −35%, max HP at most +30%, attack speed at most +25%, move speed at most +20%, unit range at most +60 lu, turret range at most 560 lu from the own gate.
6. Never touched: XP, the clock, train time, Overdrive multipliers, interest on banked gold, and turret range through turret ranks.
7. Ranks open with the ages (the A18.5.1 window table), so every evolve opens new things to buy (Pillar 2).
8. Underdog −20% on every upgrade started while behind.
9. HUD: no new always-visible control; a spend takes two taps; a long-press never spends; a denied press says why; at most one pulse; nothing flashes to nag.
10. Content is data in `src/content`; integer bp; every command in the replay; new state hashed; one `SIM_VERSION` bump (written 9.0.0 here; major or minor by the A2.9.11 / F3 policy) with deliberately re-recorded goldens; old replays keep their result card and are labelled "Recorded on an older build" (D8); single-player resume logs from before the bump do not resume.
11. Our own names. Nothing is named after the classic's units, turrets or upgrades.

### 3.1 Option A: Card Forge (per-card paths)

**Idea.** Every unit card in the tray has its own path of three ranks, bought instantly with gold. Ranks I and II are its class's stat steps; rank III is a choice of two (Guard or Assault) that changes how the card fights. Every turret also gets its own path (as in Option C). The War Council keeps Defences, Economy and Command, each to rank III, and drops its Troops track, since the cards carry the troop upgrades. A card's ranks belong to the age's tray: after an evolve the new cards start at rank 0, while the troops already fighting keep theirs.

Card templates by class (Epics and Legendaries use their base role's class until a card gets a signature path):

| Class | Rank I (75) | Rank II (125) | Rank III Guard (175) | Rank III Assault (175) |
|---|---|---|---|---|
| Infantry | +12% HP | +12% damage | Phalanx: cannot be knocked back, ignores charge bonuses | Rush: +15% speed, first hit +30% |
| Ranged | +12% damage | +10% attack speed | Long Draw: +30 lu range | Pierce: also hits the next enemy within 40 lu for 50% |
| Heavy | +10% HP | +12% damage | Bulwark: allies within 60 lu behind take −10% | Trample: first hit knocks back 30 lu |
| Anti-heavy | +12% vs armored | +10% HP | Ambush: first hit +40% while Holding | Lightfoot: +12% speed |
| Support | heals and shields +15% | +10% HP | Rally: allies within 160 lu take −10% | War Drums: allies within 160 lu +8% attack speed |

**What the player sees and taps.** Each tray card shows its own pips. The Council button opens the sheet on a Troops row that lays the seven cards out in the same columns as the tray below it, each with its pips and next price; tabs reach Defences, Economy and Command. Turrets: tap a turret (Option C's popover).

```
+==================== FORGE: THE COUNCIL SHEET IN OPTION A (172 px) =====================+
| FORGE   [Troops]  Defences  Economy  Command          (o)640                   [ X ]   |  34
|   Bonker, rank II: +12% damage   (o)125    tap again to buy                            |
|              .----.----.----.----.----.----.----.                                      |
|              |Bonk|Pebb|Tusk|Spea|Drum|Sabe|Atla|     Turrets: tap a turret            |
|              |*-- |    |    |**- |    |    |*-- |     on your base                     |
|              |125 | 75 | 75 |III?| 75 | 75 |125 |                                      |  138
|              '----'----'----'----'----'----'----'                                      |
+----------------------------------------------------------------------------------------+
```

At the evolve the tray swaps and the pips empty:

```
+----------------------------------------------------------------------------------------+
| before the evolve (Stone)                  after the evolve (Bronze)                   |
| |Bonk|Pebb|Tusk|Spea|Drum|Sabe|Atla|      |Hopl|Jave|Char|Phal|Stan|Scor|Colo|         |
| |*** |**- |    |*-- |    |    |*-- |      |    |    |    |    |    |    |    |         |
| every new card starts at rank 0; troops already on the lane keep their ranks           |
+----------------------------------------------------------------------------------------+
```

Flow: (1) Council or G; (2) tap Bonker: the strip says "Bonker, rank II: +12% damage, 125, tap again to buy"; (3) tap again: the pips stamp, "−125" floats from the gold, the next Bonkers walk out with two chevrons. Three taps, no wait. After the first evolve with ranks a one-time note: "New age, new cards: troops already fighting keep their ranks."

**Economy.** Card ranks 75 / 125 / 175 (375 to rank III), turret ranks 100 / 175 / 250, Council lines 125 / 250 / 400. A typical age takes the main card to rank III (375) and a second to rank I (75). Over the five ages of a Standard War that is about 2,000-2,250 gold on card ranks, plus 500-900 in the Council and 300-600 on turret ranks: 29-38% of about 9,800, above a 20-30% target. Higher prices fail the value math (2.3); lower prices make the ranks automatic. Instant buys compete head-on with the next troop, and a rank just before an evolve is nearly worthless.

**AI.** The value of rank r on card c is its template gain times the gold the bot expects to spend on c in the rest of the age (c's share of its last 30 s of trains × its income × the age time left, read from its XP progress). It buys when value ÷ price passes the tier's bar, never with XP at 80% or more of the threshold, and forks by counter scoring (Guard against ranged and Heavy armies, Assault against swarms or when pushing). Tiers 0-II buy rank I on their most-trained card only, III-IV up to rank II, V and up rank III; VII and up rank right after an evolve. Generals: Kettle takes Infantry to rank III every age, Boomsworth his artillery card, Rook his counter card. The bots read the player's card ranks (public) into the push gate.

**Sim and content.**
- Command `cardRank { side, slot: TraySlot, branch?: 0 | 1 }`; rejects `badCommand`, `emptySlot`, `rankLocked`, `rankMax`, `branchNeeded`, `noGold`.
- State: `SideState.cardRank: number[7]` and `cardBranch: number[7]`, reset at `ageUp` when the tray swaps; a unit snapshots its card's ranks at spawn (as research does today); hashed.
- Content: new `src/content/raw/cardRanks.ts` with the five class templates (4 nodes each) and the rule for Epics and Legendaries; later optional `UnitDef.ranks` overrides for signature paths. The Troops picks leave `raw/research.ts`, so every research proxy, the AI's research logic, the tutorial's match-2 beat, the War Path "Troops rank I and II" nodes and the War Plan's compatibility marks change.
- Events `cardRanked`; `Observation.me/foe.cardRanks`; `HudModel` tray cards gain rank, branch and next price; `MatchStats` ranks bought. Turret paths as in Option C.
- `SIM_VERSION` 9.0.0. The frozen fixture's research table loses its Troops picks, so every golden that researches Troops changes its hash (a deliberate re-record). No save schema change.

**Balance risks and gates.**
- Traps or chores (2.3); a solved routine ("rank the main card after each evolve") fails the state-dependence test (A16.1).
- The strongest card gets stronger: the per-card ±3 rows are measured at rank 0, and a rank III card amplifies its edge.
- Evolve timing bends: players finish ranks before evolving, or rush evolves to skip them.
- More taps per minute: A16.2 measured that 1 s against 3 s decisions swing win rates by 10 points.
- Gates: `no_upgrades` loses at least 70% to the upgrading Balanced script (Short, Standard); card-rank purchases per age median 1-3; the most-ranked card is the most-trained card in at most 75% of ages (not a script); median stays per age within ±15 s of today; the winner's evolve lead at the 3rd evolve at most 30 s; per-card ±3 at rank 0, with a reported row at rank III; the shared rows of Option C.

**Effort.**

| Phase | Work packages (agent-days) | Total |
|---|---|---|
| P0 prototype | WP2 2, WP3 1, WP12 1 | 4 |
| P1 rules | WP0 1, WP1 2, WP2 3.5, WP3 3, WP7 / WP9 / WP11 1.5 (Troops track removal), WP12 2.5 | 13.5 |
| P2 HUD and teaching | WP5 5 (Forge row, card pips, mode safety), WP9 0.5, WP11 0.5 | 6 |
| P3 art and sound | WP4 5-6 (rank looks for every card family, generic first), WP6 0.5 | 6 |
| P4 tuning | tuning agent and lead | 3-4 |
| | | about 32-38 |

**Risks.** Evolving starts to feel like losing your upgrades, which works against Pillar 2 ("evolving is the best moment"). It removes a built, gated system (the Troops track) to replace it. Signature paths for 167 cards would be a large content programme.

### 3.2 Option B: Crosspaths (two branches per line and per turret)

**Idea.** The well-known tower-defence crosspath rule, applied everywhere. Every War Council line (each troop class, Economy, Defences, Command) and every turret has two branches of three ranks. You may take one branch to rank III and the other only to rank I ("3-1"): the first rank II you buy on a branch locks the other branch where it stands. The 28 built picks fall into place, because each built pair becomes one step of each branch; the designed rank III picks finish the branches.

| Line | Branch A: I → II → III | Branch B: I → II → III |
|---|---|---|
| Infantry | Guard: Mail → Shield Wall → Phalanx | Assault: Weapons → Rush → Veterans |
| Ranged | Volley: Weapons → Fire Arrows → Quick Nock | Reach: Long Draw → Pierce → Marksmen |
| Heavy | Guard: Plating → Bulwark → Juggernaut | Assault: Weapons → Trample → Breaker |
| Anti-heavy | Hunter: Hunters → Ambush → Tank Killers | Skirmish: Lightfoot → Skirmish → Harriers |
| Support | Care: Field Care → Rally → Miracle | Drums: Mail → War Drums → Banners |
| Economy | Income: Granary → Market → Guildhall | Spoils: Forage → Bounty Hunters → Levy |
| Defences | Works: Watchtowers → Engineers → Keep Walls | Gate: Thick Walls → Sally Port → Bastion |
| Command | Signals: Signal Fires → Survey Corps → Quartermasters | Horns: War Horns → Master Gunners → Last Stand Drill |
| Each turret | Power: Reinforced → Heavy Shot → Breach (hits pierce one more enemy) | Control: Drilled Crew → Tar Shot → Spotter (hits mark the target, +20% damage taken for 2 s) |

The effects are those of 4.6.

**What the player sees and taps.** The line view becomes two rows of three nodes: owned nodes lit and joined, the next node on each row priced, locked nodes with a padlock and "Only one path past rank I". The mount popover shows the same two rows small. Tray cards show the deep branch's pips plus a small mark for the other branch's rank I (`**-+`). The rest of the battle HUD is Option C's (3.3).

```
+----------------------------------------------------------------------------------------+
| the tray in Option B (inside the same 51 x 69 cards; a card shows its class line)      |
| |Bonk|Pebb|Tusk|Spea|Drum|Sabe|Atla|    **-+ : the deep branch at rank II,             |
| |**-+|*-- |    |*** |    |**-+|*-- |    plus the other branch's rank I                 |
+----------------------------------------------------------------------------------------+

+======================= WAR COUNCIL > HEAVY, CROSSPATH (172 px) ========================+
| [<]  [H] HEAVY    one path to rank III, the other only to rank I               [ X ]   |  34
|  GUARD    [x] Plating  ------  [x] Bulwark  ------  [ Juggernaut  (o)400  18 s ]       |
|           -15% from Infantry   allies behind -10%    cannot be knocked or pulled       |
|  ASSAULT  [x] Weapons  ------  [lock] Trample ----  [lock] Breaker                     |
|           +10% damage          locked: Guard went past rank I                          |
|                                                                                        |  138
+----------------------------------------------------------------------------------------+

+------------------------------------------------------+
| Rock Tosser              power **-   control *       |
| POWER    [x] Reinforced [x] Heavy Shot [Breach 250]  |
| CONTROL  [x] Drilled    [lock] Tar     [lock] Spot   |
| [ Sell  +262 ]                                       |
+------------------------------------------------------+
```

Flow: as in Option C (Council, line, node, tap again; or turret, node, tap again).

**Economy.** Line nodes 125 / 250 / 400 (research slot, 10 / 14 / 18 s); turret nodes 100 / 175 / 250 (instant, 1 s refit). Ranks open on the same window table as today, so a rank II node waits for the 2nd age and a rank III node for the rank III age. A full line (3-1) costs 900, a full turret 625. A Standard War sketch: two lines at 3-1 (1,800), Economy I (125), a Defences I (125), one turret at 3-1 (625) = 2,675 gold, about 27%, in about 13 purchases. A line can take four purchases instead of three, so the cheap side rank I competes with the next troop more often than today's exclusive pairs do.

**AI.** At a line's first rank II the bot commits to the branch with the better counter score (Guard against ranged and Heavy armies, Assault against swarms and when pushing) and takes the other branch's rank I when it is cheap and matches the lane. Turret branches by the enemy's mix (Power against armored and mech, Control against swarms and rushes). Generals' styles map to branches: Kettle Assault, Moss Guard and Works, Ledger Income, Tempest Signals, Rook by your classes.

**Sim and content.**
- `ResearchPickDef` keeps its fields with a new meaning: `pick` (0 | 1) is the branch, `rank` the step on it. The command `research { track, group?, rank, pick }` keeps its shape. Validation replaces "the rank's other pick is owned" (`otherPickOwned`) with the crosspath rule (`branchLocked`): rank r ≥ II on branch b needs rank r − 1 on b, its window rank, and the other branch at rank I or less; once b passes rank I, the other branch stops where it is.
- Turrets: `turretRank { side, mount, branch: 0 | 1 }`; `TurretState.ranks: [number, number]`, the refit state and the ranks paid, hashed.
- New effect kinds as in Option C, plus Breach and Spotter for turrets.
- `SIM_VERSION` 9.0.0; the fixture's research table is re-shaped, so goldens that research change hashes (deliberate re-record). No save schema change.

**Balance risks and gates.**
- Owning both rank I picks of a line (Weapons and Mail) is new: more stacking per class than today's exclusive pairs, and today's pair data no longer applies.
- The side rank I may be bought every time (automatic, not a decision).
- Eight lines and every turret with four end states each: many combinations to gate.
- A turret at 3-1 (Reinforced, Heavy Shot, Breach and Drilled Crew) may out-trade units: a turtle risk.
- The 3-1 rule has to be taught on a phone.
- Gates: each branch's end state within ±5 points of the other branch's in its line; the side rank I bought in 20-80% of the lines that reach rank III; a `crosspath_stack` proxy (every rank I first) no better than the Balanced script +2 points; turret 3-1 turtles in the turtle band; the shared rows of Option C.

**Effort.**

| Phase | Work packages (agent-days) | Total |
|---|---|---|
| P0 prototype | WP2 2, WP3 0.5, WP12 1 | 3.5 |
| P1 rules | WP0 1, WP1 2, WP2 3.5, WP3 3, WP12 2.5 (proxies re-mapped) | 12 |
| P2 HUD and teaching | WP5 4.5 (crosspath grid, pips, popover rows), WP9 0.5, WP11 0.5 | 5.5 |
| P3 art and sound | WP4 5, WP6 0.5 | 5.5 |
| P4 tuning | tuning agent and lead | 3-4 |
| | | about 29-34 |

**Risks.** It restructures a working, gated system (rules, AI, proxies, tests, tutorial texts) for a gain that is mostly flexibility and presentation. Two rows of nodes in a 126 px sheet body are dense on a phone. More combinations mean a longer tuning tail.

### 3.3 Option C: War Council III with turret paths (recommended)

**Idea.**
1. **Every line to rank III.** Ranged gets its rank II, every troop class its rank III, Command its ranks II and III, Economy and Defences their rank III. 48 picks instead of 28; every line can be upgraded three times. The designs are A18.5.2-A18.5.5's v1.1 picks, with one swap where the design needs an unbuilt rule (Phalanx replaces Second Rank) and the reworked Defences line below (4.6).
2. **Defences becomes the base's line:** Watchtowers or Thick Walls; Engineers or Sally Port; Keep Walls or Bastion. Its two turret stat picks (Quick Loaders, Arsenal) move into the turret paths.
3. **Turret paths.** Every turret on a mount gets its own path: rank I Reinforced (+20% damage), rank II Drilled Crew (+20% fire rate), rank III a choice of Heavy Shot (×1.5 against armored and mech) or Tar Shot (hits slow move and attack speed by 25% for 1.5 s). Bought instantly by tapping the turret; it stops firing for a 1 s refit. Modernise keeps the ranks and the choice; Sell refunds 50% of the turret and of its ranks.
4. **Visible paths.** Rank pips on every tray card (the card's class line), chevrons over every unit's HP pip, studs and new parts on ranked turrets, new walls on the base, a path strip in the Council sheet. The opponent sees all of it.
5. **Prices:** every Council line 125 / 250 / 400; turret ranks 100 / 175 / 250.

**What the player sees and taps.** In battle (844 × 390; heights in px on the right):

```
+----------------------------------------------------------------------------------------+
| [St] HP ########-- 92%      3:12  (:)    [AI][St] HP #######--- 88% (o)(o)(R)  [||][1x]|  44
|      XP #####----- 410/620                        XP ####------ 380/620   [Scouted 4]  |
|        [<]  ====================@============|============o====================  [>]   |  24
| .----.                                                                         .----.  |
| | T^^|    ^^  ^^   ^   ^  ^^^                                    ^             | T^ |  |
| | T^ |     i   i   r   r   a   s  >>>        <<<  h   i   i   r   a            | T  |  |  207
| |    |   (^ over a unit: one rank of its class; ^ on a turret: its rank)       |    |  |
| '----'                                                                         '----'  |
+----------------------------------------------------------------------------------------+
| (o)640 +6/s  .----.----.----.----.----.----.----. .---.---.---. .--. .---. .---.       |
| Army 32/60   |50 I|75 R|150H|100A|110S|200I|75 R| |Chg|Hld|Bck| |Ft| |Hm | |Fd |       |  94
| (Cn)(Ev)     |**- |*-- |    |*** |    |**- |*-- | '---'---'---' |  | |125| |100|       |
|              |Bonk|Pebb|Tusk|Spea|Drum|Sabe|Atla|               '--' '---' '---'       |
|              '----'----'----'----'----'----'----'                                      |
+----------------------------------------------------------------------------------------+
```

- The pips (`**-` is rank II of III) sit inside each card above its name: three 5 px dots, 2 px apart, filled or ring, so they read without colour. A card shows its class line's ranks: the Sabertooth (an Epic that counts as Infantry) shows the Infantry pips like the Bonker, the Atlatl Thrower the Ranged pips like the Pebbler. No pips at rank 0, so a new player's tray stays clean. They fit the 51 × 69 cards at 844 px and the 48 × 65 cards at 800 × 360; the tray row stays 828 px.
- Units wear one chevron per rank of their class over the HP pip; rank III shows the pick's emblem instead of the third chevron. Chevrons are new shapes on purpose: the bronze, silver and gold ground-ring trims already mean card levels (A6.6).
- A ranked turret shows one stud per rank on its mount plate and a new part per rank (bands, a crew, the Heavy Shot barrel or the Tar Shot pot), drawn through the ArtProvider; the enemy's turrets show theirs.

The Council sheet (unchanged size: 172 px with a 34 px header):

```
+----------------------------------------------------------------------------------------+
| top band, minimap and the upper lane stay in view; the battle keeps running            |  68
|                                                                                        |  150
+============================== WAR COUNCIL SHEET (172 px) ==============================+
| WAR COUNCIL   [Fire Arrows ####-- 6 s] [Cancel]       -20% (you are behind)   [ X ]    |  34
| .-TROOPS-----------------------------------. .-DEFENCES--. .-ECONOMY---. .-COMMAND---. |
| | [I] **-  [R] *--  [H]      [A] ***  [S]  | | *--       | | **-       | | *--       | |
| |  400      busy     125     done    125   | | Engineers | | Guildhall | | Survey    | |
| |  rank III is open                        | | or Sally  | | or Levy   | | or Gunners| |  138
| '------------------------------------------' '-----------' '-----------' '-----------' |
+----------------------------------------------------------------------------------------+
```

A class's path view: the owned ranks as a strip, the next rank's pair as two cards (at most two decisions on screen):

```
+=========================== WAR COUNCIL > INFANTRY (172 px) ============================+
| [<]  [I] INFANTRY  **-       In this tray: Bonker, Sabertooth                  [ X ]   |  34
|   RANK I               RANK II              RANK III: choose one, kept all match       |
|  [x] Weapons   --->    [x] Rush     --->    .------------------. .------------------.  |
|      +10% damage           +15% speed       | Veterans         | | Phalanx          |  |
|  ( ) Mail                ( ) Shield Wall    | +8% damage per   | | cannot be knocked|  |
|      not chosen              not chosen     | kill, up to 3    | | back or charged  |  |
|                                             | (o)400     18 s  | | (o)400     18 s  |  |  138
|                                             '------------------' '------------------'  |
+----------------------------------------------------------------------------------------+
```

A turret, tapped on your base (the popover opens toward the lane and may cover its edge briefly, as it does today). A current turret shows its path; an outdated one shows Modernise first:

```
+--------------------------------------------+      +--------------------------------------------+
| Rock Tosser                     rank **-   |      | Rock Tosser (Stone)       rank **-   old   |
| [x] I  Reinforced     +20% damage          |      | MODERNISE (keeps its ranks):               |
| [x] II Drilled crew   +20% fire rate       |      | .-------------------. .------------------. |
| RANK III, choose one:                      |      | | Archer Tower (o)75| | Sun Mirror (o)100| |
| .-------------------. .-----------------.  |      | '-------------------' '------------------' |
| | Heavy Shot  (o)250| | Tar Shot  (o)250|  |      | Next: rank III, Heavy Shot or Tar Shot 250 |
| | x1.5 vs Heavy     | | slows 25%, 1.5 s|  |      | [ Sell  +212 ]                             |
| '-------------------' '-----------------'  |      +--------------------------------------------+
| [ Sell  +212 ]                             |
+--------------------------------------------+
```

About 230 × 190 px on a phone: a 24 px title row, 48 px option rows, a 40 px Sell row.

Flows:
- **A class rank:** (1) Council or G: the sheet slides up (180 ms); (2) tap Infantry: the path view flips in; (3) tap Veterans: it lifts with a gold rim, full text, "Tap again to research"; (4) tap again: the badge flies on an arc into the Council button (420 ms), "−400" floats from the gold, `council_pick` plays, the sheet closes (130 ms) and the ring runs 18 s. On completion: the button bursts, the completion card shows for 2.6 s (a tap skips it), `research_done` plays, a shimmer runs along your Infantry (visual only), the Infantry cards' third pip stamps in (MR-25), and the next Infantry walk out with the Veterans emblem.
- **A turret rank:** (1) tap your turret; (2) tap Heavy Shot: selected, "Tap again, 250"; (3) tap again: the turret dips (80 ms anticipation), a puff, the new barrel pops in with an overshoot, sparks, `turret_upgrade`, "−250" floats; it stays silent for the 1 s refit; the third stud stamps onto its plate. Reduce motion: a cross-fade and a glow.
- **Defences, Economy, Command:** as today (Council, track, pick, tap again).
- **The opponent's upgrades:** their chevrons and turret studs on the lane, their research ring by their medallion, and the Scouted drop-down's "Their research" plus a new "Their turrets" line.
- **Teaching (A18.7.5):** one War Path node teaches turret ranks (Stone L8 becomes "Tap your turret to make it stronger"; Defences rank I moves to Stone L9), and the first three-age level teaches rank III. A player who skipped them gets one hint, the first time a turret rank is affordable while enemies are in turret range (A8 limits). The tutorial match has no ranks.
- **Denied presses say why:** "Opens in the Gunpowder Age", "Need 75 gold", "One research at a time", "Refitting".
- **The Council dot** shows only when a new rank has opened (after an evolve) or the slot is free and a line you have started can afford its next rank, so it does not glow all match now that there is always something to buy. It never pulses (U15).

**Economy.**

| What | Rank I | Rank II | Rank III | Time | Notes |
|---|---|---|---|---|---|
| Each War Council line (8) | 125 | 250 | 400 | 10 / 14 / 18 s | one research slot; cancel 75%; −20% when behind |
| Each turret | 100 | 175 | 250, choose one | 1 s refit | instant, separate from the research slot (like Build and Modernise today); −20% when behind; Modernise keeps ranks; Sell refunds 50% of turret and ranks |

Turret ranks open on the Council's window table (rank II and III with the Council's rank II and III ages), so the first age has rank I turrets only.

A Standard War, one side (about 9,800 gold), as a sketch of the target:

| Time | Purchase | Gold |
|---|---|---|
| 0:35 | Granary (Economy I) | 125 |
| 1:00 | Rock Tosser rank I | 100 |
| 1:20 | Infantry Weapons (I) | 125 |
| 2:10 | Infantry Rush (II; the 2nd age opened rank II at ~1:10) | 250 |
| 2:40 | Rock Tosser rank II | 175 |
| 3:20 | Ranged Weapons (I) | 125 |
| 4:00 | Market (Economy II) | 250 |
| 4:50 | Infantry Veterans (III; the 4th age opened rank III at ~4:35) | 400 |
| 5:40 | Ranged Fire Arrows (II) | 250 |
| 6:30 | Rock Tosser Heavy Shot (III) | 250 |
| 7:30 | Ranged Quick Nock (III) | 400 |
| 9:00 | Thick Walls (Defences I), in Overdrive | 125 |
| | 12 purchases | 2,575 (about 26%) |

Targets: upgrades (Council and turret ranks together) take 20-30% of the gold in Standard and Full War and 15-25% in Short War (rank III opens only in its last age), against 14.9 / 16.1 / 16.8% research today; 10-16 purchases per Standard War.

How it competes with troops: a rank I costs 2.5 Bonkers, a rank III 2.7 Tuskbacks, and research delays its benefit by 10-18 s. A turret rank is instant but silences the turret for 1 s, a real cost when the enemy is at the gate. At the pop cap (60) the gold has nowhere else to go, so upgrades are where a capped army grows stronger; the AI's banking already stops at the cap (A2.9.9).

**AI.**
- **Research (extends `chooseResearch`).** The tier columns stay. The 20 new picks join through `startablePicks` with an `aiHint` each (4.6). Rank III needs at least 120 s before the Final Bell (the 90 s horizon becomes per rank). The bot still deepens two lines before it opens a third (the A18.5.2 budget). Defences picks: Watchtowers with 2+ turrets, Thick and Keep Walls when its base HP is at or below the enemy's or for turtle styles, Sally Port for Charging styles, Bastion when its base is at or below 60%.
- **Turret ranks (a new action beside Modernise in `brain.ts`).** A candidate when a turret is active, below its open rank cap, and the gold is spare: score 0.8 · m_turret · f_pressure · f_spare (the A7.2 form of Build and Modernise), plus a pop-cap term (at 54+ of 60 pop, spare gold goes to ranks). An outdated turret modernises first. The fork: Heavy Shot when armored and mech units are 35%+ of the visible enemy value (remembered composition from tier VII), else Tar Shot.
- **Tiers (`tiers.ts`, a new column `turretRankMax`):** 0-II rank I; III-IV rank II; V and up rank III; VII and up rank before a scouted enemy wave crosses mid-lane and never while their own wave is committed.
- **Generals (`personalities.ts`):** Mama Moss ranks every turret to III and takes Thick and Keep Walls; Sgt. Boomsworth takes Heavy Shot on his artillery turrets and the Ranged line; Captain Kettle never ranks turrets and takes Veterans; Baroness Ledger takes Economy to III (Guildhall) first; Rook forks against your class mix (Marksmen and Tank Killers against Heavies and mechs); Madame Tempest takes Command to III (Quartermasters); The Warden takes everything at full tier.
- **Reading the player.** The push gate's defence value D counts an enemy turret as 300 + 75 per rank (+75 more for Heavy Shot when the bot fields Heavies). The bots' estimate of the player's gold (they never see it) subtracts the public upgrades.
- **Honest.** Same commands, same observation; bots stay labelled AI, or the Ranked persona (A7.1). The mistakes list gains a tier-scaled "ranks a turret the fight has already passed".

**Sim and content.**
- **Commands.** `research` is unchanged (content now uses rank 3). New `turretRank { side, mount: 0 | 1 | 2 | 3, branch?: 0 | 1 }`; rejects in order `badCommand`, `noTurret`, `turretBusy` (building, selling, replacing, refitting), `rankLocked` (the window), `rankMax`, `branchNeeded` (rank III without a choice), `noGold`.
- **State, hashed.** `TurretState.rank` (0-3), `branch` (−1, 0, 1), `rankPaid` (milli-gold, for the Sell refund), `state` gains `'refitting'`. Per-unit fields only when used (Veterans `kills`, Miracle `revived`) and `SideState.miracleAge`. Base max HP from research goes through the existing `sideMods.baseHpBp` path (base init and the evolve rescale), raised at completion by the same amount as the max.
- **Effect kinds** (`ResearchEffect` in `src/contracts/content.ts`): `burn` (a new damage-over-time `StatusKind`, credited to its source for bounty), `pierce` (ranged), `veteran` (bp per kill, a stack cap), `brace` (grants Brace), `immune` (knockback and pulls), `vsStructures` (bases and forts), `revive` (Miracle), `auraRadius` (bp), `baseHp` (bp), `spawnForward` and `holdMin` (Sally Port), `spawnBuffBelow` (Bastion), `powerZone` (Survey Corps, in `core/powerReach.ts`), `powerDamage` (Master Gunners), `lastStand` (Last Stand Drill) and `unitCost` (Levy; the HUD and the AI read effective prices). `powerCost` (Quartermasters) is compiled already.
- **The turret path table:** new `src/content/raw/turretRanks.ts`, compiled into `CompiledContent.turretRanks`: costs [100, 175, 250], refit 1,000 ms, rank I `damageBp 2000`, rank II `attackSpeedBp 2000`, rank III `[Heavy Shot: mods armored 15000 and mech 15000, appended after the attack's own mods; Tar Shot: on hit, snare 2500 bp for 1,500 ms, Legendaries half as long]`. Heavy Shot is a type mod (pipeline step 2, like an Anti-heavy card's mods), so it stays outside the +35% damage cap that `capSum` applies to Reinforced and every other bonus (`src/sim/damage.ts`). Rank effects add to the turret's fire-time numbers in `fireTurret` (`src/sim/systems/turrets.ts`) within the caps; they never add range, never hit bases, and Siege still halves turret damage. They never apply to field towers (A16.14.5). Per-turret overrides (`TurretDef.ranks?`) can come later.
- **Observation, events, HUD.** `Observation.me/foe.turrets[i]` gains `rank` and `branch` (public); event `turretRanked { side, mount, rank, branch }` for the view, audio and stats; `HudModel` mounts gain rank, branch, next price and whether the rank is open; tray cards read their class line's owned ranks; `MatchStats` counts upgrades and their gold.
- **A match switch.** `MatchConfig.turretRanks?: boolean` (default true; false in the tutorial and in War Path levels before the teaching node) applies to both sides, as the power slots' match rule does (A2.9.1).
- **Versions and saves.** `SIM_VERSION` 9.0.0 (a new command and new effect kinds; since goldens 01-17 keep their hashes, the A2.9.11 / F3 policy also allows a minor 8.1.0, the lead decides). The frozen fixture gets a copy of the new tables and a new golden `18-paths.json` that buys every new kind; goldens 01-17 keep their hashes because the fixture's existing picks stay frozen (re-recorded for the version string). No save schema change: one UI flag for the hint (`ui-hint.turretRank` in `SaveDoc.flags`).
- **Strings, art and sound.** `research.<id>.name|desc` for 22 new pick designs (20 more picks; 2 replace Quick Loaders and Arsenal), `turret.rank.*`, `hud.turret.*`, `hint.turretRank`; manifest ids `research.<id>` (the open badge request), `fx.rank_mark.<1-3>`, `turret.rank.<1-3>`, `turret.branch.<heavy|tar>`, `fx.turret_rank_up`, `fx.walls_up`; sounds `turret_upgrade` (in the bank) and a new `turret_branch` stinger.

**Balance risks and gates.** The tools in `tools/` measure every row (`npx tsx tools/sim-cli.ts balance | exploits | strength | lbs`, smoke size on every run, full size at the gates, `--patch` for data levers).

| Risk | Gate |
|---|---|
| Research still does not pay in short wars | `no_upgrades` (the Balanced script without research or turret ranks; replaces `no_research`) loses at least 70% to the upgrading Balanced script in Short and Standard, Full at gates (today 45.8 / 31.8% wins) |
| Turtling behind ranked turrets and walls | New `turret_rank_turtle` (Hold at 320, 4 turrets all to rank III, Watchtowers, Thick and Keep Walls) and `keep_turtle` (walls, Bastion, Last Stand Drill, Fall back), plus the updated `tech_turtle`, `turret_turtle` and `fallback_turtle`: each wins at most 45% and has at most 50% of its matches at the Final Bell; the `lbs` turtle rows at most 45% |
| More stalls | Final Bell, tier VII mirror, at most 10 / 8 / 5% (Short / Standard / Full); medians in the A18.12 bands |
| The leader snowballs | The winner's evolve lead at the 3rd evolve at most 30 s; the comeback share not below today's; the underdog row of A18.12 |
| Dead or forced picks | Each pair and each turret fork within ±5 points (2,000 mirrored matches; smoke 400, ±6); pick-flip in at least 30% of sampled lane states; rank III beats saving the gold by at least +4 points (A18.12) |
| Upgrades crowd out the army | Upgrade share 20-30% (Standard, Full) and 15-25% (Short); purchases per Standard War 10-16 (the `balance` research-share and items rows, widened) |
| Turrets too strong | Turret share of kills reported and flagged above 30% |
| Stacking past the caps | A static test: every combination of maxed picks, turret ranks, relics and (later) doctrines stays inside A18.2 |
| The AI loses its edge | `strength` gates unchanged (tiers VIII+ beat every simple strategy at least 80%; the higher tier of each pair at least 60%) |
| Cost per tick | B3: a headless Full War within 850 ms |
| Everything else | `few_then_evolve` at most 10% vs Normal and 2% vs Hard; `flag_ball` at most 45%; the spam, mono and power rows (A2.9.12) unchanged; first-mover 47-53% |

**Effort.**

| Phase | Work packages (agent-days) | Total |
|---|---|---|
| P0 prototype gate | WP2 1.5, WP3 0.5, WP12 1 | 3 |
| P1a rules: stat-like picks, the Defences rework, Economy III, Command II-III, turret paths, prices, AI, proxies and gates, `SIM_VERSION` 9.0.0, goldens | WP0 1, WP1 1.5, WP2 2.5, WP3 2, WP12 2 | 9 |
| P1b behaviour picks: Fire Arrows (burn), Pierce, Veterans, Phalanx, Miracle, Banners, Survey Corps, Levy prices | WP2 2, WP1 0.5, WP3 1, WP12 0.5 | 4 |
| P2 HUD and teaching: card pips, the path strip, rank III cards, the Defences content, the turret popover, "Their turrets", hints, the War Path node, strings; Playwright at 844 × 390, 844 × 340, 800 × 360, 1280 × 720 | WP5 3, WP9 0.5, WP11 0.5, WP1 0.5 | 4.5 |
| P3 art and sound: unit chevrons, turret rank looks (generic overlays by turret size first), wall looks per age, rank-up effects, sounds; Playwright and the frame-time check | WP4 4, WP5 0.5, WP6 0.5 | 5 |
| P4 tuning at full gate sizes | tuning agent and lead | 3 |
| | | about 25-31 (1.5-2 weeks with 3-4 agents in parallel) |

**Risks.**
1. It may feel like "more of the same" to the owner. The turret paths, the marks and the path strip are what is new; owner question 1 offers per-card paths if the owner still wants them.
2. The behaviour picks (burn, revive, kill stacks) need new sim code and may fail their gates. They ship in P1b behind their own rows, with fallbacks ready: Barbed Shot (hits slow 15% for 1 s) for Fire Arrows, Second Wind (+20% HP once below 30%) for Miracle.
3. Turret turtling. Levers in order: turret rank prices +25, Heavy Shot ×1.5 → ×1.35, Keep Walls +10% → +6%, rank III one age later.
4. Snowball through upgrades: the underdog discount covers every upgrade; the comeback rows watch it.
5. HUD density (pips on seven cards, a bigger popover): pips only from rank I, and the Playwright review decides.
6. Art scope: 48 turrets and 8 bases. Generic overlays first; per-turret looks in later content waves.
7. Name collisions. "Rank" is the Council's word (Rank I-III), but A2.7 calls the formation "ranks" and queue item 9 brings military ranks; "tower" is a Fort kind. Use "turret path" for turrets, and give item 9's titles their own word.
8. Replays from before 9.0.0 stop playing (D8, accepted).

### 3.4 Side by side

| | A: Card Forge | B: Crosspaths | C: Council III and turret paths |
|---|---|---|---|
| Who owns a troop upgrade | the card, until the next evolve | the class | the class |
| Per-card identity | strong | through the class | through the class; per-card looks later |
| "More than two times" | yes | yes (3-1) | yes |
| Turret paths | yes | yes, crosspath | yes, fork at rank III |
| New always-visible controls | none | none | none |
| New UI | Forge row, card pips, turret popover | crosspath grid, pips, popover | path strip, pips, popover |
| Content to build | 20 template nodes and the turret path; the Troops track removed | 48 nodes re-shaped and the turret crosspath | 22 new picks and the turret path |
| AI work | a new per-card valuation | branch planning | extends what is built |
| Balance risk | high (traps or chores, evolve timing) | medium-high (combinations) | medium (behaviour picks, turret turtle) |
| Effort (agent-days) | about 32-38 | about 30-34 | about 25-31 |
| Fits the owner's words | literally "per card"; weak on a path that lasts | the most "tower defence" | most asks now; per-card later |

---

## 4. Recommendation and phased plan

### 4.1 Recommendation: Option C

1. **It fits how Ageborn works.** Classes, turrets, the base and the economy last the whole match; cards do not. Paths belong where they keep paying (2.3).
2. **It answers every part of the request.** 48 picks instead of 28 plus a path on every turret; every line, every turret and the base upgradable three times; tower-defence paths on our actual towers; a path you can see on cards, units and turrets; no new button; the AI uses it all; gates measured first.
3. **It fixes measured weaknesses:** research that does not pay in Short War, turrets that are weak as a plan, a base with nothing to buy.
4. **It is the least risk and work,** because it finishes designs that A18.5 already wrote and reuses the built sheet, popover, AI and tools.
5. **It leaves room** for what A and B do better: signature ranks and looks per card (A) as a later content wave, and the crosspath grid (B) as the fallback layout if the P2 review finds the pairs hard to read.

### 4.2 Phases

| Phase | What | Size | Owners | Ends with |
|---|---|---|---|---|
| **P0** prototype gate (nothing shipped) | A throwaway branch: the Council at rank III with the new prices, the Defences rework and the turret paths; the behaviour picks only if cheap (otherwise they are measured in P1b); a minimal AI (rank III through the existing scoring and hints, the turret-rank rule); proxies `no_upgrades`, `turret_rank_turtle`, `keep_turtle`. Runs: tier V mirrors, Short and Standard, 200 each; the duel and turtle rows against tier VII, 200 each; run when the machine is free | S-M (3) | WP2, WP3, WP12, lead | The go/no-go below, told to the owner in plain words |
| **P1a** rules | One WP0 contract bump, the stat-like picks, the turret paths, prices, AI, tools and gates, `SIM_VERSION` 9.0.0 and the goldens | L (9) | WP0, WP1, WP2, WP3, WP12 | Smoke gates green |
| **P1b** behaviour picks | Fire Arrows, Pierce, Veterans, Phalanx, Miracle, Banners, Survey Corps, Levy, each behind its rows, fallbacks ready | M (4) | WP2, WP1, WP3, WP12 | Their pair, pick-flip and buy-vs-save rows |
| **P2** HUD and teaching | Card pips, the path strip, rank III, the turret popover, "Their turrets", hints, the War Path node, strings; `docs/ui-plan.md` 4.7 updated; Playwright at four viewports with the budget spec | M (4.5) | WP5, WP9, WP11, WP1 | Screenshots reviewed |
| **P3** art and sound | Unit chevrons, turret rank looks, wall looks, rank-up effects, sounds | M (5) | WP4, WP5, WP6 | Playwright and frame time within budget |
| **Owner check** | The owner plays a Short and a Standard War on Normal and Hard | | owner | Feedback |
| **P4** tuning | Full gate sizes; per-pick ±5, pick-flip, buy-vs-save; Full War at gates | M (3) | tuning agent, lead | A18.12 rows green or reported to the owner |

Every phase keeps `main` playable. Until P2 ships, the live content keeps today's Defences picks and prices, every new pick carries a release flag set to false (a `released` field as cards and powers already have), and `MatchConfig.turretRanks` is false for both sides; the tools switch all of it on for the gates. So P1 lands without changing what players see, and P2 switches it on together with its HUD.

### 4.3 P0 go/no-go (written down before the run)

Go only if all of these hold at smoke size:

1. `no_upgrades` wins at most 30% against the upgrading Balanced script in Short and in Standard War.
2. The upgrade share is 20-30% in Standard (15-25% in Short) and the median purchases per Standard War are 10-16 (tier V mirror).
3. The tier V mirror's Final Bell is not above today's in Short or Standard, and the medians are within ±30 s of today's.
4. `turret_rank_turtle`, `keep_turtle` and `tech_turtle` each win at most 45%, with at most 50% of their matches at the Bell.
5. Every new pair and turret fork: each side of it is taken in at least 25% of the times its rank is bought by tier V counter scoring (a smoke stand-in for pick-flip).
6. First-mover 47-53%; a headless Full War within 850 ms.

On a fail, in order and re-run after each: rank I 125 → 100 (or Economy back to 150 if `eco_greed` is the problem), turret ranks ±25 gold, rank III effects ±25%, rank III one age later, Heavy Shot ×1.5 → ×1.35. Still failing: the lead reports to the owner with a proposal before P1.

### 4.4 Later, and only with a reason

- **Signature ranks for Epic and Legendary cards** (from Option A): one bespoke rank III per card that replaces its class's pick for that card, in content waves with their art. Only if the owner wants more per-card identity after playing C.
- **Per-card and per-age looks** for the rank marks and turret parts through the manifest (`research.<id>.<ageId>`, as A18.5.7 planned).
- **The Air and Underground lines** with their classes (A18.13 phase 8; queue item 8 brings burrowing).
- **A rank IV "mastery"** per line, only if P4 shows rank III bought in most matches with gold to spare.
- **Evolve doctrines** (A16.10), the big free pick at evolve; they need the owner's yes and fit beside C.
- **Fort upgrades**, only after the fort gates hold in production (A18.5.3). **Per-power paths** stay out: the power gates (casts per age, share of kills) are fragile, and Command already covers powers.

### 4.5 Fit with the queue

The owner's order of 2026-10-18 puts item 12 after items 37 and 34, iPhone stability and Customize round 3. P0 needs no UI and only WP2, WP3 and WP12 time, so it can run beside round 3's art work once the machine is free; P1 onwards follows round 3. Item 13 (Heavy) is helped by Heavy Shot and the Anti-heavy and Ranged rank III picks, item 5 (siege range) by the Ranged line, and item 15 (merging Future and Cosmic) changes nothing here, because ranks follow the window's length, not its ages.

### 4.6 Starting tables for the prototype (Option C)

Starting values for P0. "New" marks a pick that is not built; the rest are built today. Prices: every line 125 / 250 / 400 (was 150 / 300 / 450-500); times 10 / 14 / 18 s.

**Troops** (a pick applies to own units of that class trained after it completes; Epics and Legendaries count in their base class):

| Class | Rank I: 1 of 2 | Rank II: 1 of 2 | Rank III: 1 of 2 (new) | `aiHint` of the new picks |
|---|---|---|---|---|
| Infantry | Weapons: +10% damage · Mail: each hit taken −N flat (N = 25% of the age's Infantry Common L1 damage) | Shield Wall: −20% damage from range 100+, −8% speed · Rush: +15% speed, first hit +30% | Veterans: +8% damage per kill, up to 3 · Phalanx: Brace (cannot be knocked back, ignores first-hit bonuses; replaces Second Rank, which needs the unbuilt reach rule of `docs/requests/wp2-third-rank-reach.md`) | Veterans `push`, Phalanx `vsHeavy` |
| Ranged | Weapons: +10% damage · Long Draw: +30 lu range, −8% attack speed | **New:** Fire Arrows: hits burn for 3 s at 15% of the hit per second · Pierce: shots also hit the next enemy within 40 lu for 50% | Marksmen: +25% damage vs armored · Quick Nock: +18% attack speed | Fire Arrows `vsSwarm`, Pierce `busy`, Marksmen `vsHeavy`, Quick Nock `vsSwarm` |
| Heavy | Plating: −15% damage from Infantry · Weapons: +10% damage | Trample: first hit knocks back 30 lu · Bulwark: allies within 60 lu behind take −10% | Juggernaut: immune to knockback and pulls · Breaker: +25% damage to bases and forts | Juggernaut `vsHeavy`, Breaker `push` |
| Anti-heavy | Hunters: +12% vs armored · Lightfoot: +12% speed | Ambush: first hit +40% while Holding · Skirmish: −20% damage from Infantry | Tank Killers: +20% vs mech · Harriers: +15% attack speed | Tank Killers `vsHeavy`, Harriers `busy` |
| Support | Field Care: heals and shields +20% · Mail | War Drums: allies within 160 lu +8% attack speed · Rally: allies within 160 lu −10% damage taken | Miracle: once per age, the first own unit to die within 160 lu of an own Support revives at 30% HP (no Veterans stacks) · Banners: aura radius +50% | Miracle `busy`, Banners `push` |

**Defences** (the base's line; the picks apply at once):

| Rank | Pick A | Pick B |
|---|---|---|
| I | Watchtowers: turret range +40 lu (hard cap 560) | **New:** Thick Walls: base max HP +6% (replaces Quick Loaders) |
| II | Engineers: Modernise −50% and 0.5 s; fort scaffolds 3 s | **New:** Sally Port: units spawn 60 lu further forward; Hold flag range [380, 800] (was rank III B; replaces Arsenal) |
| III | **New:** Keep Walls: base max HP +10% | **New:** Bastion: while your base is at or below 50% HP, units you train deal +10% damage |

**Economy** (income is never doubled by Overdrive):

| Rank | Pick A | Pick B |
|---|---|---|
| I | Granary: +1.5 gold/s | Forage: +40% bounty for kills in your own half |
| II | Market: +2 gold/s | Bounty Hunters: kill bounty 50% → 65% |
| III | **New:** Guildhall: +2.5 gold/s, the queue holds one unit fewer | **New:** Levy: Common units cost 12% less, income −1 gold/s |

**Command:**

| Rank | Pick A | Pick B |
|---|---|---|
| I | Signal Fires: both power slots reload 15% faster | War Horns: while Charging +8% speed; while Holding with the flag at p ≤ 480, units near the flag +10% damage |
| II | **New:** Survey Corps: aimed power zones 20% wider (caps unchanged; a Home zone stays in your half) | **New:** Master Gunners: power damage and heals +12% |
| III | **New:** Quartermasters: powers cost 20% less | **New:** Last Stand Drill: Last Stand arms at 35% base HP and hits 20% harder |

Gates named in A18.5.5 for Command still apply: Quartermasters must pass `power_hoarder` and `home_turtle`, Last Stand Drill `fallback_turtle`.

`aiHint` of the new picks outside Troops: Thick Walls `defend`, Sally Port `push`, Keep Walls `defend`, Bastion `defend`; Guildhall `quiet`, Levy `busy`; Survey Corps and Master Gunners `power`, Quartermasters `power`, Last Stand Drill `defend`.

**Turret path** (each turret; instant; a 1 s refit with no firing; opens on the Council's window table; −20% when behind):

| Rank | Effect | Price |
|---|---|---|
| I Reinforced | +20% damage (inside the +35% cap) | 100 |
| II Drilled Crew | +20% attack speed (inside the +25% cap) | 175 |
| III, choose one | Heavy Shot: its attack gains the mods armored ×1.5 and mech ×1.5, appended after its own mods (a type mod, outside the damage cap) · Tar Shot: hits snare 25% (move and attack speed) for 1.5 s; Legendaries half as long | 250 |

Modernise keeps the ranks and the choice; Sell refunds 50% of the turret and of its ranks; never more range; never a base; ×0.5 in Siege as today.

### 4.7 Changes by work package (Option C)

| WP | Files | Change |
|---|---|---|
| WP0 (lead) | `src/contracts/{content,commands,sim,observation,hud,events}.ts`, `src/content/raw/{research,turretRanks}.ts`, `tests/fixtures/content`, `docs/DESIGN.md` | One contract bump (effect kinds, `burn` status, `ResearchPickDef.released`, `turretRank` command and rejects, turret rank state, observation and HUD fields, `turretRanked` event, `MatchConfig.turretRanks`); the raw tables; the frozen fixture copy; DESIGN A18.5 amended (or a new A19) and `docs/decisions.md` |
| WP1 | `src/content/{schema,compile}.ts`, `src/i18n/content.en.json` | Schema and compile for the new kinds and the turret path table; release flags on every new pick and the Defences rework until P2; strings |
| WP2 | `src/sim/{research,researchRules,damage,commands,state,hashState,observe,replay}.ts`, `src/sim/systems/{turrets,status,deaths,economy,laststand,powers,training}.ts` | The effect kinds, the turret ranks and refit, the Modernise and Sell rules, hashing, `SIM_VERSION` 9.0.0, golden 18 and the re-records |
| WP3 | `src/ai/{brain,tiers,personalities,estimate,view,actions}.ts` | Rank III and the new hints, the per-rank horizon, the turret-rank action and tier column, Generals' styles, the defence value of ranked turrets |
| WP4 | `src/visuals/**` | Unit chevrons, turret rank parts (generic overlays by size first), wall looks per age, the Council badges (the open request), rank-up effects |
| WP5 | `src/ui/hud/**`, `src/render/**`, `src/i18n/hud.en.json` | Card pips, the path strip and rank III cards, the turret popover path, "Their turrets", the dot rule, deny reasons, event mapping; `docs/ui-plan.md` 4.7 through a request |
| WP6 | `src/audio/**` | The `turret_branch` stinger; `turret_upgrade` mapped |
| WP9 | `src/ui/screens/**` | Card detail: "In battle: the Infantry path"; the War Plan compatibility marks keep working |
| WP11 | `src/app/**`, `src/tutorial/**` | The `turretRanks` match switch by progress, the hint, the War Path teaching node |
| WP12 | `tools/**`, `tests/**` | `no_upgrades`, `turret_rank_turtle`, `keep_turtle`, the updated `tech_turtle` and Balanced research list; upgrade share and purchases rows; pair, fork, pick-flip and buy-vs-save rows; the static caps test; e2e for the popover path |

---

## 5. Questions for the owner

1. **Should a troop upgrade belong to the troop class or to one card?** A class upgrade makes all your Infantry better, also in later ages. A card upgrade makes only your Bonker better, and it is gone when you evolve, because the Bonker leaves your tray. **Recommended: the class.** It keeps paying the whole match. Every card still shows its class's upgrades, and your turrets get their own path, which is the tower-defence part.
2. **Should a finished upgrade also change the troops already fighting, or only the ones trained afterwards?** **Recommended: only the ones trained afterwards, as today.** It is fair and easy to read, there are no sudden swings in the middle of a fight, and you see the new troops march out in their upgraded look. Turrets, the base and gold upgrades work at once.
3. **How much of a match should go to upgrades?** Today about one gold coin in six goes to research. With the new paths we aim at about one in four; troops stay the main spend and matches keep their length. **Recommended: about one in four.** More would make a match more about buying than fighting.

---

## 6. Kort på dansk

Du ønskede mange flere opgraderinger i kampen, og at alt kan opgraderes mere end to gange, ligesom tårnene i de klassiske tårnforsvarsspil.

Mit forslag har tre dele:

1. Alle linjer i War Council får tre trin i stedet for to: hver troppeklasse, økonomien, basen og kommandoen. Det giver 48 opgraderinger at vælge imellem i stedet for 28.
2. Hvert tårn på din base får sin egen opgraderingssti. Du trykker på tårnet og køber trin 1 og trin 2. På trin 3 vælger du mellem to slags skud: et der rammer tunge enheder hårdt, eller et der bremser fjenden. Tårnet beholder sine trin, når du moderniserer det.
3. Du kan se opgraderingerne: små prikker på kortene, små mærker over soldaterne og nye detaljer på tårnene og basen. Modstanderen kan også se dem.

Der kommer ingen nye knapper på skærmen. Computeren bruger de samme opgraderinger efter de samme regler. Første trin bliver lidt billigere, fordi opgraderinger i dag næsten ikke betaler sig i den korte kamp.

Jeg anbefaler, at troppernes opgraderinger hører til klassen og ikke til det enkelte kort. Dine kort skifter ved hver ny tidsalder, men klasserne bliver. En opgradering af et enkelt kort ville forsvinde ved næste tidsalder.

Vi bygger først en prøve, som ikke ændrer spillet, og måler den med vores testværktøjer. Først når tallene holder, bygger vi det ind.

Tre spørgsmål til dig:

1. Skal troppernes opgraderinger høre til klassen (min anbefaling) eller til det enkelte kort?
2. Skal en opgradering kun gælde nye tropper (min anbefaling, som i dag) eller også dem, der allerede kæmper?
3. Er det rigtigt, at cirka hver fjerde guldmønt går til opgraderinger (min anbefaling)? I dag er det cirka hver sjette.
