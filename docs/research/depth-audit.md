# Strategic depth audit of the battle rules (A2, A3, A5, A7), with sim evidence

**Status.** Research note, 2026-09-27. Input for the battle-depth design. Nothing here is decided until it is merged into `docs/DESIGN.md`. Binding frame: `docs/design-engagement.md` (A15) and CLAUDE.md.

**Question.** Where is optimal play "spend gold as soon as possible" or "click fastest"? Which decisions are shallow or dominated? Which small, testable rule changes make timing, counters, economy and information matter more? What should the A2.14 targets be?

**Companion notes.** `depth-benchmarks.md` (what other games do) and `depth-architecture.md` (how features fit the code). This note measures the rules as built and does not repeat them.

---

## 0. Key findings

1. **The rules already punish blind spam. The AI does not.** Scripted players that only see the observation were pitted against each other in 45 pairings. The counter triangle holds hard: Heavy spam beats Infantry spam 100-0, AA spam beats Heavy spam 92-8, Infantry spam beats AA spam 100-0. A 20-line counter-picker beats every mono-army 92-100%. But the tier VII Balanced bot loses to cheapest-unit spam 54-60% of the time and to Heavy spam 98%.
2. **Two small AI fixes close most of the gap.** I patched them into a scratch copy of `src/ai` only. Cheapest-unit spam fell from 54-60% to 0-3% against tier VII, random spam from 28-30% to 11-13%, and Heavy spam from 98% to 35%. The owner's strict target (≤ 20%) is reachable through WP3 work, not rule changes. The fixes:
   - save gold for a counter the bot cannot yet afford;
   - apply A7.3's "safe window, ≤ 2 s" literally; today the bot waits for a safe window forever at every tier.
3. **The deepest decision today is banking gold into waves, and nothing teaches it.** Banking to 300-800 gold and then releasing everything beats spending as you go by 21-48 points in scripted play, and by 10 → 36% against tier VII. Its price is real: a banker starves on XP against an opponent that will not attack it. So "spend as soon as possible" is *not* optimal. Trickling is the mistake.
4. **Evolve is a non-decision.** Evolving as soon as possible was never beaten. Each delay cost points (as soon as possible 10%, +15 s 5%, +30 s 3% vs tier VII), and "only when safe" often never evolved at all. Pricing Evolve in gold made it worse:
   - spam rose to 83-92% against a bot that saves for its evolve;
   - scripted mirrors went to the Final Bell 67-100% of the time.
   Put the decision into *what* you evolve into (doctrines), not *when*.
5. **The Age Power has one real decision (use it) and a shallow one (when).** Never casting drops the win rate to 0%. Firing at the first 250-gold clump (20%) edges out firing when full (10%), and waiting for 500 gold loses (5%), because a full ring stops charging. Proposed fix: the ring keeps charging to 150% (section 4, P5).
6. **Counter-picking only matters against mono-armies.** Against mixed armies, swapping the counter logic for fixed weights changed nothing (96% vs 96%). With a full tray, a visible lane and instant switching, the in-match counter game is solved by a script. In-match counter depth has to come from commitment: War Plan choice, doctrines, fortifications.
7. **The kill bounty is the balance dial between spam and stalemate.**
   - At 45%, cheap spam beats tier VII 88-92%.
   - At 75% (with the fixed AI), spam stays dead but Full War Final Bells rise from 8% to 21%.
   - Keep 60%. Loss XP, splash, Overcharge, Ascension length and card recharges showed no useful effect.
8. **Stalemates are the biggest open rule problem.** Final Bell rates in AI mirrors: Short War 22-33%, Full War 4-15% (target < 3%). The turtle proxy goes to the Bell in 95-98% of Short Wars, so its 44-48% win rate means nothing. Earlier Overdrive and Siege did not help. A Siege-only bounty cut and turret shutdown are tested in section 3.7.
9. **Click speed is not the problem; attention is a mild tax.** Tier X does not beat tier V (43-61%), so reaction speed and precision do not convert into wins. But a script that decides every 3 s instead of every 1 s drops from 13% to 3% against tier VII, because idle gold piles up. Across the full sweep, the same script ranges from 25% (every tick) to 3% (every 3 s).
10. **Levels outweigh skill.** One card level (+5%) is worth about 20 points: L8 beats L7 70% of the time and L10 beats L7 95%. The whole tier VII vs V skill gap is 50-64%. Ranked play must normalise levels (section 6).
11. **The AI misses several A2.14 targets for reasons outside depth.** Numbers for Phase 3:
    - the tier VII bot builds 0.3 turrets per match, so turrets make 0.4% of kills (target 20-35%);
    - its first evolve lands at 1:23 (target 1:00 ± 10 s);
    - its Full War median is 5:23-6:19 (target 7:00).

---

## 1. Method

- **Code.** Sim and content at commit `d066c58`. The AI is a snapshot of `src/ai` taken at 23:00 on 2026-09-27, including WP3's uncommitted `brain.ts` edits of that hour. WP3 was editing the bot during this audit; each AI number describes that snapshot, not the final bot.
- **Setup.** A2.14 baseline plan (3 Commons, the AA Rare and the Support Rare, both Common turrets, the default power), every card at L7, both sides.
- **Scripted players.** Throwaway scripts in the session scratchpad (not in the repo). They read only the `Observation`, 300 ms delayed like a bot, and issue ordinary `Command`s. Rule changes were applied as content data (a patched clone of `CompiledContent`), or by a harness filter for the three that need code (evolve price, card recharge, Siege bounty). The AI copy was taught to save for an evolve price.
- **Samples.** Every row swaps sides each seed. N = 24-60 matches per row: about 1,900 matches in the main runs and about 4,500 in the variant runs, roughly 6,500 in all.
- **Noise.** The 95% interval at 50% is about ±20 points at N = 24, ±15 at N = 40 and ±12 at N = 60. It is narrower near 0% and 100%. Treat gaps under about 15 points as noise.

| Script | What it does |
|---|---|
| Cheapest-unit spam | Every 0.25 s, trains the cheapest tray unit while gold allows. Evolves when able. Fires the power at once on auto-aim. No turrets, no Treasury, never Hold |
| Random spam | As above, but a uniformly random tray unit |
| Mono spam (Heavy, AA, Ranged) | As above, only that role group |
| Counter-picker | As above, but the tray card with the best counter-matrix score against visible enemies (value-weighted); waits for it if short of gold |
| Balanced | Weighted random units (Infantry 4, Ranged 3, Heavy 2, AA 2, Support 1), 2 turrets, Treasury 1, power at once, evolves at once, decides every 0.5 s |
| Save-and-counter | Counter-picker that banks to 300 gold and then spends it all (a wave). 2 turrets, Treasury 1, power when the zone holds ≥ 350 gold, evolves in a safe window, smart Last Stand |
| Turtle | Ranged-leaning, 4 turrets, Treasury 2, Hold until Overdrive, power at ≥ 350 gold |
| Greedy | Balanced plus Treasury 3 by 2:30 |

---

## 2. Results

### 2.1 Baseline: AI mirrors (snapshot AI, N = 60)

| Pairing | Short War median / Final Bell | Full War median / Final Bell | First evolve |
|---|---|---|---|
| VII vs VII | 5:24 / 22% | 5:23 / 5% | 1:23 |
| V vs V | 5:20 / 25% | 5:34 / 15% | 1:29 |
| Targets (A2.14) | 4:30 / < 3% | 7:00 / < 3% | 1:00 ± 0:10 |

A trace shows why Short War stalls. The bot answered cheap spam with its own Infantry. From 2:34, both sides were in Gunpowder, the format's last age, and 12-28 Corsairs a side ground against each other at mid-lane for 3.5 minutes. Siege decay then decided the Final Bell.

### 2.2 Skill expression: tier against tier (N = 40)

| Winner-side tier | Short | Full | With the two AI fixes (Short / Full) |
|---|---|---|---|
| X vs V | 43% | 46% | 54% / 61% |
| VII vs V (N = 60) | 61% | 59% | 64% / 60% |
| VII vs III | 85% | 88% | |
| V vs I | 89% | 90% | |

Above tier V, faster decisions, shorter delay, deeper counter reading and fewer mistakes barely convert into wins. That is good news for "not click speed". It is bad news for depth: the rules offer the better player little to exploit.

### 2.3 Exploit proxies against the tier VII Balanced bot (N = 40)

| Proxy | Snapshot: Short | Snapshot: Full | Fixed AI: Short | Fixed AI: Full |
|---|---|---|---|---|
| Cheapest-unit spam | 54% | 60% | **3%** | **0%** |
| Random spam | 30% | 28% | 11% | 13% |
| Heavy spam | 98% | 98% | 35% | 35% |
| AA spam | 0% | 0% | 0% | 0% |
| Ranged spam | 0% | 0% | | |
| Turtle (share of its matches at the Final Bell) | 48% (98%) | 19% (53%) | 44% (95%) | 14% (55%) |
| Save-and-counter (Final Bell) | 26% (68%) | 14% (15%) | 21% (63%) | 11% (20%) |
| Counter-picker | 76% | 78% | | |
| Balanced script | 18% | 25% | | |
| Balanced, never fires the power | 1% | 0% | | |
| Balanced, never evolves | 0% | 0% | | |

**Why the snapshot bot loses to spam:**
- It only scores cards it can afford now (`trainCandidates` skips `gold < cost`), and its gold float (120 gold at VII) never reaches a Heavy's 150. So it answers Infantry with Infantry.
- Its evolve safety check has no timeout at any tier. Constant pressure at the gate froze it in the Stone Age until 2:00 with capped XP, while the spammer evolved at 0:46.

The two fixes in the scratch copy:
- a saving goal for the best-scoring counter when it beats the best affordable card by ≥ 0.15;
- the safety check only for tiers VII and up, capped at 2 s (0.5 s at X).

### 2.4 Scripted round robin, rules only (Full War, N = 24 per pair, row's win %)

| | Inf | Rnd | Hvy | AA | Rng | Ctr | Bal | Sav | Tur | Grd | Avg |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Inf spam | - | 8 | 0 | 100 | 100 | 0 | 2 | 0 | 67 | 2 | 31 |
| Random spam | 92 | - | 50 | 100 | 100 | 33 | 21 | 0 | 46 | 13 | 51 |
| Heavy spam | 100 | 50 | - | 8 | 100 | 8 | 29 | 0 | 79 | 23 | 44 |
| AA spam | 0 | 0 | 92 | - | 79 | 0 | 0 | 0 | 4 | 0 | 19 |
| Ranged spam | 0 | 0 | 0 | 21 | - | 0 | 0 | 0 | 8 | 0 | 3 |
| Counter-picker | 100 | 67 | 92 | 100 | 100 | - | 33 | 0 | 56 | 33 | 65 |
| Balanced | 98 | 79 | 71 | 100 | 100 | 67 | - | 0 | 50 | 44 | 68 |
| Save-and-counter | 100 | 100 | 100 | 100 | 100 | 100 | 100 | - | 63 | 100 | 96 |
| Turtle | 33 | 54 | 21 | 96 | 92 | 44 | 50 | 37 | - | 63 | 54 |
| Greedy | 98 | 87 | 77 | 100 | 100 | 67 | 56 | 0 | 37 | - | 69 |

- Every Turtle pairing except the one against AA spam ran to the Final Bell in 17-96% of matches.
- Ranged-only armies lose to everything: Ranged is support, as A2.6 intends.
- The counter matrix (equal-gold 1v1 duels, `counters.json`) agrees. Heavy beats Infantry by 79% in every age. AA beats Heavy by 58-86%. Infantry beats AA by 67-77%.

### 2.5 What each decision is worth

Left: variations of the Balanced script against tier VII (Full War, N = 40; the base script wins 10%). Right: removing one part of Save-and-counter, played against Balanced and against the Counter-picker (Full War, N = 24).

| Decision | Against tier VII | Rules only (full script → without that part) | Verdict |
|---|---|---|---|
| Bank, then release a wave | bank to 250: 8%; 500: 23%; 800: 36% | without waves: 96 → 75 and 100 → 52 | **The biggest real decision.** Not taught anywhere |
| Decision cadence | every tick: 25%; 1 s: 13%; 3 s: 3%; 5 s: 3% | | Attention tax: idle gold rises from 27 to 84 gold |
| Age Power | never: 0%; when full: 10%; zone ≥ 250 gold: 20%; zone ≥ 500: 5% | threshold → when full: 100 → 100 and 100 → 92 | Must use; timing is shallow |
| Evolve timing | at once: 10%; +15 s: 5%; +30 s: 3%; safe window only: 5% (reached Medieval in only 70% of matches) | safe window → at once: no change | **Dominated:** evolve at once |
| Turrets | 0: 25%; 2: 10%; 4: 14% | without turrets: 96 → 65 and 100 → 88 | Worth something only if the opponent attacks into them |
| Treasury | 0: 13%; 1: 10%; 3 by 2:30: 13% | without Treasury: 96 → 88 and 100 → 69 | Real, low stakes against bots |
| Composition | cheapest: 0%; random: 13%; weights: 10%; counter: 18% | counter → weights: 96 → 96 and 100 → 96 | Matters only against mono-armies |

XP before the first evolve (10 Full Wars against tier VII):

| Player | First evolve | Kills | Own losses | Passive |
|---|---|---|---|---|
| Cheap spam | 0:45 | 58% | 17% | 25% |
| Balanced | 1:20 | 27% | 28% | 44% |
| Bot | 1:22 | 41% | 19% | 40% |

Spam evolves early because it kills the bot's early Ranged. Cutting loss XP would not change that (section 2.6).

### 2.6 Rule variants

Win % of the row player. N = 24; snapshot AI unless marked.

| Variant | Cheap spam vs VII (S / F) | Heavy spam vs VII (S / F) | Counter-picker vs cheap spam (S / F) | VII mirror Final Bell (S / F) | Balanced mirror Final Bell (S / F) | Verdict |
|---|---|---|---|---|---|---|
| V0 current rules | 50 / 58 | 100 / 100 | 100 / 100 | 29 / 4 | 4 / 17 | |
| V1 loss XP 40% → 15% | 48 / 50 | 100 / 100 | 100 / 100 | 29 / 4 | 8 / 13 | No effect. Reject |
| V2 evolve costs 150 / 250 / 350 / 450 gold | 92 / 92 | 100 / 100 | 100 / 100 | 17 / 4, but the bot reached Future in only 21% | **100 / 100** | Slows everything, helps spam. Reject |
| V2b evolve costs 100 / 150 / 200 / 250 gold | 83 / 83 | 100 / 100 | 100 / 100 | 8 / 0 | 17 / 67 | Same. Reject |
| V3 card recharge = cost ÷ 25 s (Inf 2 s … Legendary 14 s) | 48 / 50 | 100 / 100 | **58 (83% Bell)** / 100 | 25 / 0 | 4 / 17 | Throttles the answer more than the spam. Reject as an anti-spam tool |
| V4 splash secondary 50% → 75% | 46 / 54 | 96 / 100 | 100 / 100 | 25 / 8 | 4 / 17 | No effect. Reject |
| V5 = V1 + V2 + V3 | 75 / 79 | 100 / 100 | 100 / 100 | 33 / 0 | 100 / 100 | Reject |
| V7 Overcharge 1,200 → 600 XP | 50 / 58 | 100 / 100 | 100 / 100 | 33 / 8 | 4 / 17 | No effect |
| V8 bounty 60% → 45% | **88 / 92** | 83 / 83 | 100 / 100 | 17 / 0 | 8 / 4 | Fewer stalls, but spam wins. Reject |
| V9 Ascension 2.5 → 6 s | 48 / 50 | 96 / 96 | 83 / 100 | **50** / 13 | 13 / 25 | More stalls. Reject |
| Fixed AI, current rules (N = 40) | **3 / 0** | 35 / 35 | | 28 / 8 | | Adopt (P1) |
| Fixed AI + V3 | 0 / 0 | 38 / 42 | 58 / 100 | (mirror rows unreliable, see note) | 4 / 17 | Reject |
| Fixed AI + V11 bounty 75% | 19 / 2 | 29 / 29 | 96 / 100 | 33 / **21** | 21 / 50 | Spam stays dead, stalls rise. Keep 60% |
| Fixed AI + V12 Overdrive and Siege 30-60 s earlier | 10 / 0 | 38 / – | 100 / – | 33 / 13 | 17 / – | Does not cure stalls |

**Note on V3.** With the fixed AI, the tier VII mirror showed a seat bias (83% for the first seat in both formats) that I could not explain. Treat those two rows as unreliable. The rejection rests on the scripted rows.

### 2.7 Levels against skill (Full War, N = 40)

| Pairing | Row player wins |
|---|---|
| Tier VII L7 vs tier VII L8 | 30% |
| Tier VII L7 vs tier VII L10 | 5% |
| Tier VII L7 vs tier III L9 | 73% |
| Counter-picker L7 vs Balanced L10 (33% at equal levels) | 16% |
| Save-and-counter L7 vs Balanced L10 (96% at equal levels) | 84% |

The tug-of-war amplifies small stat edges: one level (+5% HP and damage) swings about 20 points. Good decisions (waves) survive a 3-level deficit; mediocre ones do not.

### 2.8 Counter-matrix red flags (equal-gold 1v1, L1)

- **Legendaries beat their own counters:**
  - Mammoth Matriarch vs Spear Hunter 76%
  - Ursa Paladin vs Pikeman 73%
  - Behemoth Tank vs Bazooka Trooper 90%
  - only Chrono Titan loses to its counter (Rail Gunner beats it; the Titan scores 42%)
  - with one Legendary allowed and a 7 s train time this is contained, but "always buy the Legendary" is a rule of thumb, not a decision.
- **Balloon Admiral** has no unit answer in Gunpowder at equal gold: Fusilier 30%, every other Gunpowder unit 0%. Only turrets answer it.
- **EMP Saboteur** loses to the mechs it should counter: Walker Mech 6%, Chrono Titan 1%.
- These belong to Phase 3 per-card tuning. For depth, the rule is: every card needs an answer in its age that wins at equal gold (section 5, "has-an-answer" gate).

---

## 3. Audit by rule

| Rule | What optimal play is today | Evidence | Depth verdict |
|---|---|---|---|
| A2.3 Gold: no cap, no leak, no interest | Bank to 300-800 gold and release in waves; trickling loses | 2.5 | Real decision, invisible to players |
| A2.3 Treasury | Buy 1-2 levels early | 2.5 | Real, low stakes |
| A2.3 Bounty 60% / A2.4 kill XP 100% | Punishes feeding. It is the anti-spam engine, and also what funds a defender's endless replacements | 2.6 (V8, V11) | Keep 60%; it is tuned between spam and stalls |
| A2.4 Evolve (free, heals 5%, 2.5 s training pause) | Evolve at once; fire the power first | 2.5, 2.6 (V2, V9) | Dominated. Keep it fast (Pillar 2); add a *what* choice (doctrines) |
| A2.7 Queue of 5, train times | Never binds: gold is the only brake | Infantry trains in 1.5 s; passive gold pays for one every 8.3 s | Neutral. Recharges hurt the counter more than the spam (V3) |
| A2.7 Stance (2 s cooldown) | Hold + push gate = stall; bots toggle 24 times per Full War (76-116 in an earlier build, per `depth-architecture.md`) | 2.3 turtle | APM more than decision; the Hold part feeds stalls |
| A2.8 Turrets (invulnerable, never hit bases) | Worth it only against an attacker that walks into them. The bot's push gate refuses to, so 0 turrets did best against tier VII | 2.5 | Area denial is a fine decision, but it makes turtles force Bells |
| A2.9 Age Power (charge on a timer, auto-aim, ring caps at 100%) | Fire at the first modest clump | 2.5 | Shallow: holding the ring wastes charge |
| A2.10 Clock | 22-33% of Short Wars end at the Bell | 2.1, 2.6 | Open problem (section 3.7) |
| A2.11 Last Stand | Automatic at 10%, manual at ≤ 25% | not tested | Fine |
| A2.12 Controls | Spend promptly; no micro exists | 2.2, 2.5 | Not click speed; a mild attention tax |
| A3 Tray (all 5 cards always, no cycle) | Counter-pick what you see | 2.4, 2.5 | Solved by a script; commitment lives in the War Plan |
| A5 Content | Triangle sound; a few red flags | 2.8 | Phase 3 numbers |
| A7 AI | Loses to mono-armies; waits forever to evolve under pressure; builds 0.3 turrets per match | 2.3 | Fix before trusting any A2.14 exploit gate |

### 3.7 Stalemates: what the data says

Short War reaches its last age at about 2:30 and then has 3.5 minutes with no tech left to race for. Several things make same-age armies grind:
- The two-wide melee front caps melee damage, so a bigger army adds HP but not much damage.
- Each side replaces its losses from the 60% bounty.
- The push gate stops bots from attacking into turrets.

None of the tested knobs fixed it: loss XP, splash, Overcharge, Ascension, bounty ±15 points, or Siege 60 s earlier. The Siege-only rules (V13 bounty 30% in Siege, V14 turrets off in Siege, V15 both) were still running when this note was written, so there is no verdict on them here.

---

## 4. Recommended changes

Ordered by value for cost. Each has a test.

| # | Change | Where, owner, size | Why | Test and target |
|---|---|---|---|---|
| P1 | **The AI answers mono-armies:** (a) save for a clearly better unaffordable counter (reuse the Legendary saving goal); (b) safe-window evolve only from tier VII, capped at 2 s (X: 0.5 s), as A7.3 says; (c) against a foe ≥ 60% one role group by value, counter weight ×2, diversity term off and no gold float; (d) build turrets toward A7.3's max so the turret share target can pass | A7.2, A7.3 · WP3 · S | (a) and (b) alone: cheap spam 54-60% → 0-3%, random spam 28-30% → 11-13%, Heavy spam 98% → 35% | The exploit gates in section 5 |
| P2 | **New proxies and targets in A2.14 and B12** | A2.14, B12 · WP12 · S | Makes "skill, not spam" a CI fact, and tests the bot's reactions | Section 5 |
| P3 | **Keep the kill bounty at 60%.** Record it in `docs/decisions.md` as the dial between spam and stalemate | A2.3 · lead · XS | 45%: spam 88-92%; 75%: Full War Bells 8% → 21% | Phase 3 re-checks both proxies after any bounty change |
| P4 | **Teach and signal the wave.** Add an A8 failure-pattern hint and an A15.12 loss tip when units arrived one at a time. Personalities (Mama Moss, Madame Tempest) visibly bank, Hold, then Charge (A7.4 readable intent). Keep enemy gold hidden: reading a lull is the skill | A8, A15.12, A7.4 · WP11, WP1 strings, WP3 · XS | The largest decision in the rules (+21 to +48 points) is invisible | Strings in review; bot traces show bank → Charge |
| P5 | **Power ring overflow.** Charge keeps filling to 150% at the same rate. A cast uses 100%. The 50% cap across Evolve stays. Both rings show the overflow | A2.9 · WP2 (sim, `SIM_VERSION` bump) and WP5 (ring) · S | Waiting for a clump or an evolve moment stops costing charge, so *when* becomes a choice the opponent can read | Zone-threshold proxy (≥ 450 gold) beats fire-when-full by ≥ 5 points |
| P6 | **Stalemate fix: prototype behind data flags, then choose.** Candidates: bounty 30% in Siege only; turrets off in Siege. Each could be a new field in `EconomyRules.siege` (compile rules and `contentHash` only) | A2.10 · WP2, WP1 · S | Short War Bell 22-33%; no global knob helped (section 3.7) | Final Bell < 5% in the VII mirror and ≤ 15% in turtle matches, with cheap spam still ≤ 20% |
| P7 | **Do not add** per-card recharges, queue caps, an evolve price or a longer Ascension against spam. Recharges belong to fortifications (PvZ model) | A2.4, A2.7 · lead · XS (a decision) | V2, V2b, V3, V5 and V9 all hurt | none |
| P8 | **Evolve depth through a choice, not a price** (the owner's doctrines): 1 of 2 mirrored offers from the seed; the Evolve button carries the pick; the bot scores both | A2.4 · v1.1 · M (see `depth-architecture.md` 4.1) | Evolve timing is dominated and should stay a celebration | Each doctrine's win-rate delta within ±5 points; the pick matters: the better pick for the lane state wins by ≥ 5 points |
| P9 | **Repeat order (attention tax).** Long-press a card: the queue refills with that card whenever gold allows, until tapped again. The same command exists for bots (A7.1). It does not chain matches, so A15 red line 5 is untouched | A2.12 · v1.1 or with PvP · S | 1 s vs 3 s decisions: 13% vs 3%. PvP has no pause | The same brain at 1 s and 3 s cadence with Repeat order is within 5 points |
| P10 | **Ranked normalises levels** (Standard L7, as the Daily does, or a cap) | D1 online · M | +1 level ≈ +20 points; tier VII vs V ≈ +10 | Report the level-edge row each release |

---

## 5. A2.14: proposed targets

Exploit rows run against the tier VII Balanced bot at L7, in both Short and Full War, with at least 400 matches per proxy. Rules-sanity rows run scripts against scripts, with no bot involved.

| Metric | Today's target | Measured (snapshot) | With P1 (a)+(b) | Proposed target |
|---|---|---|---|---|
| Cheapest-unit spam | ≤ 55% | 54% S / 60% F | 3% / 0% | **≤ 20%** |
| Random spam (new) | – | 30% / 28% | 11% / 13% | **≤ 15%** |
| Mono Heavy, AA and Ranged spam (new, each) | – | Heavy 98% / 98%; AA 0%; Ranged 0% | Heavy 35% / 35% | **≤ 25%** |
| Turtle (4 turrets, Hold) | 35-45% | 48% / 19%, Bell 98% / 53% | 44% / 14%, Bell 95% / 55% | 35-45% **and ≤ 15% of its matches at the Final Bell** |
| Counter-picker vs each mono spam (rules sanity, new) | – | 92-100% | – | **≥ 80%** |
| Triangle (rules sanity, new): Heavy > Inf, AA > Heavy, Inf > AA (mono vs mono) | – | 100% / 92% / 100% | – | **each ≥ 70%** |
| Final Bell, VII mirror | < 3% | 22% S / 5% F | 28% / 8% | < 3% Full; **< 5% Short**, after P6 |
| Skill gap (new) | – | VII vs V 59-61%; VII vs III 85-88% | 60-64% | **VII vs V ≥ 65%; X vs V ≥ 65%; VII vs III ≥ 80%** |
| Attention gap (new): Balanced script at 1 s vs 3 s decisions, each vs VII | – | 13% vs 3% | – | ≤ 10 points today; ≤ 5 with P9 |
| Power timing (new): threshold ≥ 450 gold vs fire-when-full | – | 5% vs 10% | – | threshold ≥ fire-when-full + 5, after P5 |
| Has-an-answer (new, from `counters.json`, no match sims) | – | Balloon Admiral and EMP Saboteur fail | – | every card has a same-age card scoring ≥ 55% against it, with Legendaries reported |
| Turret share of kills | 20-35% | 0.4% (bot builds 0.3 turrets per match) | – | keep; needs P1 (d) |
| Level edge +1 (report only) | – | 70% | – | reported; gates nothing in v1 |

**Proxy definitions for WP12** (`tools/exploits.ts`). All issue ordinary commands from the delayed observation, decide every 0.25 s, cast Last Stand when armed, never sell turrets, and draw from a seeded RNG.

- **Cheapest-unit spam:** as in section 1.
- **Random spam:** a uniformly random tray unit whenever it is affordable. No turrets, no Treasury. Evolves at once; power on auto-aim when full.
- **Mono spam:** one role group only, with Infantry as the fallback when the loadout has none.
- **Counter-picker** (rules sanity): the best counter-matrix score against visible enemies, value-weighted; waits for that card.
- **Turtle:** keep the existing B12 definition, plus the Bell condition.

---

## 6. Chess lessons, applied

- **Skill over levels:** normalise levels in any ranked play (P10). Offline, keep A6.8 level matching; A15.9 allows no second moving rank.
- **Short formats:** Short War is the natural blitz, but stalls in 22-33% of matches. Fix P6 before promoting it.
- **Puzzles** (`depth-architecture.md` 4.10): positions snowball. A side losing at its own gate trickles units into the enemy army for minutes (one trace: 2:20 to 5:15 with nothing to gain). Mine puzzles where a single decision flips the result: a held wave, a power timing, Last Stand, Hold then Charge. Verify each with A15.17's human-limited bot.
- **Post-match analysis** (`depth-architecture.md` 4.11): give key moments for the measured levers, not only kills. Examples: "you held 400 gold for 40 s" (idle gold), "units arrived one at a time" (trickle), "power fired into 2 units" (clump value), "evolved 20 s after it was ready".

---

## 7. Limits

- The bot is mid-build. Every "vs tier VII" number is a snapshot, and the P1 effect comes from a scratch patch that WP3 must re-implement and re-measure.
- The baseline plan has no Epics, Legendaries or alternate powers, so stall rates may fall with full plans. Balloon Admiral and Behemoth Tank are wall-breakers.
- Scripts are not humans. Humans will find waves, Hold timing and power reads faster than scripts do, which is why the rules-only rows and the gates matter more than any single bot number.
- The three code-dependent variants (evolve price, card recharge, Siege bounty) were emulated in the harness, not in the sim.
- The harness and scripts lived in the session scratchpad and are not in the repo. WP12 should build the proxies in section 5 as `tools/exploits.ts`.
