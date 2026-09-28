# A16. Strategic depth, variety and long-term play

**Status.** Addendum to `docs/DESIGN.md`, written 2026-09-28. The orchestrator merges it into DESIGN as section A16, after A15, together with the DESIGN edits listed in A16.24. Until then Phase 1 agents build to the current DESIGN; the v1 items in A16.2-A16.7 and the wall prototype in A16.14 bind Phases 2a, 2b and 3.

**What it answers.** The owner's seven directions of 2026-09-27: (1) battle variety, (2) a much larger card pool with a deeper rarity ladder, (3) strategic depth instead of spam-clicking, (4) lane fortifications, (5) lanes, (6) social play, (7) a home village. Across all of them: the game must look beautiful and be well animated.

**Sources.**

- `docs/research/depth-audit.md`: about 12,000 headless matches in the real sim (sections and proposals P1-P10 are cited as "audit 2.3", "audit P6").
- `docs/research/depth-benchmarks.md` ("benchmarks") and `docs/research/depth-architecture.md` ("architecture", foundations F1-F5).
- `art/blender/SPIKE_REPORT.md`: cost and size of the 3D sprite art tier.
- The proposal `docs/design-history/depth-proposal.md` (systems DP-1 to DP-36, kept as history).
- Two reviews of it: "strategy-veteran" (SV, points C1-C12) and "builder-scope" (BS, sections 1-6). Every point is resolved in A16.27.
- The binding frame is A15: engagement rules 1-10, the classes, the five tests, red lines 1-13 and the counter budget (A15.13). A16 references A15 and does not repeat it.

**Funding.** A15's funding note applies unchanged. Only v1 is funded, and the cloud credit ends 2026-11-05. The v1 part of A16 is small on purpose: bot fixes, measurements, a sandbox prototype and a few strings (A16.24). Everything marked v1.1, v1.2 or online is a ranked wishlist, not a promise to players or to the owner.

**Sizes.** A15.19's scale, plus **XL**: needs a server, or a new dimension in the sim.

**Phases.** v1 Phase 2a, 2b and 3 (C3; Phase 3 changes numbers only). v1.1 and v1.2 (A15.19 wishlist). Online (the D1 server milestone). Later.

**Merge note.** A16 is written to be merged whole. Builders of v1 need only A16.1-A16.7, the prototype part of A16.14, A16.23-A16.25 and the A2.14 rows in A16.5. Later subsections are wishlist cards in the style of A15.14-A15.17.

---

## A16.1 Principles and budgets

**Goal: skill beats spam, luck and levels.** Winning should come from reading the lane, committing to a plan and timing it, not from tapping faster, rolling better capsules or grinding levels. This is the owner's "like why online chess became popular".

**The five decision tests.** A decision is meaningful only when all five hold (benchmarks section 1). They are separate from A15's five engagement tests.

1. **Trade-off:** every option costs something, and none is best in every state.
2. **Information:** the player sees enough to act before committing.
3. **Counterplay:** the opponent sees the choice and can respond.
4. **Attribution:** afterwards the player can trace the result to the choice.
5. **State-dependence:** no rule of thumb ("always X") solves it.

**The core loop to protect.** The audit found one deep decision already in the rules: bank gold, then send a wave (audit 2.5). Around it sit the answers: a full power ring punishes a wave, baiting drains the ring, turrets punish walking in, and the clock ends the match. Every A16 system must feed this loop or stay out of its way.

**Depth from commitment, not reaction.** With a full tray, a visible lane and instant switching, in-match counter-picking is solved by a script (audit finding 6). New depth therefore comes from choices that commit: the War Plan, the preset picked after the battlefield is revealed, doctrines, and fortifications that take time to build.

**Complexity budget.**

- The tray keeps 5 unit cards. No sixth slot (A16.19).
- **The v1 battle HUD is the ceiling.** A later release may add at most one always-visible control, the Fort button (A16.14), and only by freeing room: the Army counter becomes a badge on the stance flag. Doctrine picks reuse the Evolve button. Repeat order is a gesture on a card (A16.21). Anything else must replace a control, not add one.
- Pillar 1 ("familiar in 10 seconds") still holds: the first 20 matches of a save use a flat battlefield with no weather and no doctrines.

**Stacking budget** (SV C3). One level (+5% HP and damage) swings about 20 points of win rate (audit 2.7), so modifiers must not stack unchecked.

- All rule-mod sources that apply to one side or one zone (battlefield features, doctrines, and later commanders or bosses) **add** in bp on the same stat of the same unit and **clamp at ±2,000 bp (±20%)**. Range clamps at +1,500 bp.
- **No range bonus inside your own turret cover.** A unit whose p ≤ 480 gets no positive range mod from any source, so nobody out-ranges the enemy from safety.
- Symmetric match-wide sources (Daily modifiers, weather) are exempt from the clamp: they change the match for both sides, not the matchup. They still add into the same sum.

**Gate the combinations, not only the axes.** Each axis gets its own gates, and a combination sweep plus an exploit search look for stacks and strategies that no single gate sees (A16.8).

**Resist tuning to the test** (SV C6). Rules-only rows (scripts against scripts, no bot) sit next to every bot row, spam proxies run as families with a mixing parameter, and bot tiers are never made weaker to widen a gap.

**Everything visible, everything mirrored.** Battlefields, weather schedules, doctrine offers and fortifications are shown before they matter and are the same for both sides. Nothing in the lane is hidden (A7.1: bots see what humans see).

**Reuse before new systems.**

| Need | Reuse |
|---|---|
| Rule changes per side, zone or time | One rule-mods engine (A16.8) for battlefields, weather, doctrines and bosses |
| New card behaviour | The keyword engine (F2, A16.17) for forts, tunnelers, detectors and boss phases |
| Goals and star conditions | A15.10 feat predicate kinds (puzzles, bosses) |
| A friend fighting your plan | A15.15 codes and "AI · Echo of ..." (Echo challenges, clan raids) |
| A village "trickle" | The A15.4 Supply allowance |
| Currencies | Dust and cosmetics only (A15 rule 8). **A16 adds no currency** |
| One tracker per time scale | Puzzles, Review and modes add no Home widget or Result step (A15.13) |

**Beauty budget.** The owner cares most that the game looks beautiful and moves well. Art money goes where players look most often:

1. **The evolve moment.** Protect it. A doctrine pick never interrupts the Ascension show.
2. **Battlefields and weather,** seen in every match (A16.9).
3. **The village Home,** seen every session (A16.22).
4. **Ascended walkouts and the Holo shimmer:** the rarity thrill (A16.18).
5. **One readable effect per keyword,** reused by every card (A16.17).

One decision sets the cost of every future card: stay on procedural puppets, or move units to the 3D sprite tier (spike report: about 1-2 agent hours and 70-300 KB per unit, plus about one WP for the in-game sprite renderer). The owner answers it at the fun gate (A16.25, task 5).

---

## A16.2 What the audit found, and the rule decisions (v1)

**Where optimal play is "spend as soon as possible" or "click fastest"** (audit 3):

| Rule | Optimal play today | Depth verdict | A16 decision |
|---|---|---|---|
| A2.3 Gold banks with no cap | Bank 300-800 gold, then release a wave. Trickling loses by 21-48 points | Real, and invisible | Teach it (A16.6) |
| A2.3 Treasury | Buy 1-2 levels early | Real, low stakes | Keep |
| A2.3 Kill bounty 60% | Punishes feeding; also funds a defender's replacements | The dial between spam and stalls | Keep 60% (45%: spam wins 88-92%; 75%: Full War Bells 8% → 21%) |
| A2.4 Evolve | Always at once | Dominated | Keep evolving fast (Pillar 2). Add a choice of *what* later (A16.10) |
| A2.7 Queue of 5 | Never binds; gold is the only brake | Neutral | No queue cap |
| A2.7 Two-wide front | Only 2 melee units per side ever fight (see `docs/requests/wp2-third-rank-reach.md`) | A main stall cause | Measured and fixed in A16.4 |
| A2.7 Stance | Bots toggle about 12 times per Full War; Hold feeds stalls | Clicking more than deciding | Keep as is. No movable hold line |
| A2.8 Turrets | Worth something only against an attacker that walks in | Fine as area denial | Turret share of kills becomes report-only (A16.5) |
| A2.9 Age Power | Fire at the first modest clump; a full ring wastes charge | Shallow "when" | Overflow experiment in v1.1 (A16.11) |
| A2.10 Clock | 22-33% of Short Wars end at the Bell | Open problem | A16.4 |
| A2.12 Controls | Spend promptly; no micro | Not click speed; a mild attention tax (1 s vs 3 s decisions: 13% vs 3%) | Repeat order for online PvP (A16.21) |
| A3 Tray | Counter-pick what you see | Solved by a script | Commitment lives in the War Plan and the preset pick |
| A5 Content | Legendaries beat their own counters; Balloon Admiral and EMP Saboteur lack answers | Numbers | Phase 3 tuning (A16.4) |
| A6.8 Levels | +1 level ≈ +20 points; the tier VII vs V gap is about 10 | Levels beat skill | Standard levels where skill is measured (A16.7) |
| A7 AI | Loses to cheap spam 54-60% and to Heavy spam 98%; freezes before evolving under pressure | Two bugs | A16.3 |

**Anti-spam tools we do not add.** Recorded in `docs/decisions.md` by the lead.

| Tool | Evidence | Verdict |
|---|---|---|
| Queue cap below 5 | Passive gold pays for one Infantry every 8.3 s; the queue never binds | Not needed |
| Per-card recharge on units | V3: the counter-picker against spam fell from 100% to 58%, with 83% of matches at the Bell | Rejected. Recharges only on fortifications (A16.14) |
| Evolve price | V2, V2b: spam 83-92%, more stalls | Rejected |
| Longer Ascension | V9: Short War Bells 50% | Rejected |
| Bounty 45% or 75% | V8, V11 | Keep 60% |
| Less loss XP, stronger splash, Overcharge changes, territory decay | No useful effect | Rejected |
| Direct unit control | Rewards click speed (Stick War) | Rejected |

---

## A16.3 The bot answers spam and evolves on time (v1)

| | |
|---|---|
| Class | Healthy: fairness is the only tuning target (A15 rule 10) |
| Decisions | Blind spam stops paying; the player must read the lane and trade |
| Counterplay | Same rules for both sides; tier-scaled human mistakes stay (A7.2) |
| Architecture | `src/ai` only (`brain.ts`, `scoring.ts`). No contract change. Rule 2 is an A7.3 spec-conformance bug; the rest amend A7.2 |
| Size, phase, owners | S · a request to WP3 now, so it lands in the Phase 1 integration pass and the owner's Checkpoint A test is against an honest bot · WP3 · `docs/requests/wp3-depth-answers.md` |
| From | DP-1; audit P1; SV C1, C6; BS 1, 2 |

**Rules** (A7.2 and A7.3 amendments):

1. **Save for a counter.** When the best counter score over the whole tray, ignoring gold, beats the best affordable card by at least 0.15, the bot sets a saving goal for that card's cost, reusing the Legendary saving-goal code. The goal lapses after 8 s, or when an enemy unit comes within 300 lu of the bot's gate. For this, `trainCandidates` scores every tray card; an unaffordable card can only set a goal, never be trained. Today it skips `gold < cost`, so a bot with a 120-gold float answers Infantry with Infantry and never reaches a 150-gold Heavy.
2. **Evolve on time.** The safe-window check applies only from tier VII and is capped at 2 s (tier X: 0.5 s), as A7.3 says. Below tier VII the evolve-delay column applies as written. Today the check has no timeout at any tier, so constant pressure at the gate froze the bot in the Stone Age until 2:00.
3. **Answer one-type armies, smoothly.** Let s be the largest role-group share of visible enemy army value. The counter weight is multiplied by 1 + 2.5 × max(0, s − 0.4), capped at 2 (×1 at 40%, ×1.5 at 60%, ×2 at 80%). The diversity term and the gold float target shrink by the same factor. There is no threshold cliff for a spammer to sit just under.
4. **No Legendary saving goal while the push gate fails.** The bots' mutual banking adds most of the Legendary-plan stalls (audit 3.7).
5. **Not adopted:** "build turrets toward the tier's maximum". The audit found 0 turrets did best (25%) and that turrets plus the push gate cause stalls. The turret share of kills becomes report-only (A16.5).

**Measured** on a scratch copy of the bot with rules 1 and 2 (audit 2.3), against tier VII:

| Proxy | Before | After |
|---|---|---|
| Cheapest-unit spam | 54-60% | 0-3% |
| Random spam | 28-30% | 11-13% |
| Heavy spam | 98% | 35% |

Rule 3 targets the remaining Heavy spam. **Acceptance:** the `sim:exploits` smoke run (A16.5 rows) and WP3's existing 400-match tier-ordering test.

**Later (v1.1, AI only):** from tier VIII the bot plays the wave game. It banks to a wave threshold (400 gold at VIII, 600 at X) while no enemy is within 480 lu of its gate, then releases; it holds its power while the enemy ring is at 80% or more and a wave is coming. The ceiling is in the rules (Save-and-counter wins 96% in the scripted round robin, audit 2.4); a top-tier bot must reach toward it, or experts farm it.

---

## A16.4 Stalemates (v1)

| | |
|---|---|
| Class | Healthy |
| Decisions | Defending forever stops being safe; late pushes and power timing decide matches instead of the Bell |
| Counterplay | Every lever is symmetric |
| Size, phase, owners | S to measure; S per adopted sim change · Phase 2b (measure and adopt), Phase 3 (numbers) · WP12 (harness), WP2 (sim branches), WP3, lead · `docs/requests/wp2-depth-sim.md`, `wp12-depth-proxies.md` |
| From | DP-3; audit 3.7, P6; SV C1; BS 2 |

**Why matches stall** (audit 3.7). At equal strength a defensive line beats an attack, and no clock rule changed that:

- the two-wide front caps melee damage, so a bigger army adds HP but not damage;
- ranged units behind a Heavy front shoot over it;
- each side replaces its losses from the 60% bounty;
- turrets cover only 480 lu and never reach a mid-lane front, and bots refuse to attack into them.

Measured Bell rates with the fixed bot: tier VII mirror 28% Short / 8% Full; with a Legendary in each plan 55% / 83%; Heavy plus Ranged scripted mirror 100%; turtle 95% / 55% of its matches. Once players learn waves, the expert meta is Save-and-counter against a defence, which reached the Bell in 63-68% of Short Wars against tier VII.

**The evidence is thin, so v1 measures before it builds.** Only lower unit HP for the whole match (`glass_armies`, ×0.7) moved the Bell rate (baseline Short 28% → 8%, turtle 95% → 46%), and even it made Legendary plans worse (55/83% → 67/96%). Siege-only lethality was never simulated.

**Step 1: measure (Phase 2b, first week; CPU, not credit).** WP12 adds `--patch <file>` to `sim:balance` and `sim:exploits` (a content override for `playJob`) and two harness hooks. The lead runs each lever on seven rows, Short and Full War, 200 matches per row, 400 for the finalists:

- rows: tier VII mirror (baseline plan), tier VII mirror (a Legendary in each plan), Save-and-counter mirror, Save-and-counter vs Turtle, Heavy plus Ranged mirror, Turtle vs tier VII, cheapest spam vs tier VII.

| # | Lever | How it is measured | Kind if adopted |
|---|---|---|---|
| L1 | Whole-match unit HP ×0.85 and ×0.75 | Content patch | Numbers (Phase 3) |
| L2 | Short War clock: Overdrive 3:00, Siege 3:45, Final Bell 5:00 (from 3:30 / 4:30 / 6:00) | Content patch | Numbers (Phase 3) |
| L3 | Melee closes to contact (option B of `wp2-third-rank-reach.md`), so the third rank really fights | WP2 branch | Sim rule (A2.7) |
| L4 | Three-wide front | WP2 branch | Sim rule (A2.7) |
| L5 | Siege lethality: all units take +40% damage in Siege | Harness hook | Sim field `EconomyRules.siege.unitDamageTakenBp?` |
| L6 | "The rope" as the Bell tie-breaker: in Siege the side losing the contact point loses 1% base HP per second instead of the symmetric decay | Harness hook | Sim rule (A2.10) |
| L7 | Bot drops its Legendary saving goal while the push gate fails | In WP3's request (A16.3 rule 4) | AI |

**Step 2: adopt by a fixed rule.** Rank lever combinations by the mean Bell share over the five stall rows. Adopt the best combination that keeps all of these:

- cheapest spam ≤ 20%;
- the turtle wins 35-45%;
- first-mover 47-53%;
- Full War median between 6:00 and 8:00;
- L1 only if the owner found faster deaths "better" or "the same" at the fun gate (A16.25, task 3).

At most two sim changes (from L3-L6) join the Phase 2b sim batch, with one `SIM_VERSION` major bump and re-recorded goldens for both. If L3 is not adopted, A2.7's "third position" sentences are deleted, as option A of the WP2 request says. Content levers go to Phase 3. `overdrive.unitDamageTakenBp` is not built.

**Step 3: numbers (Phase 3).**

- The adopted HP scale and the Short War clock. If the clock changes, A2.14's Short War median becomes 4:00 ± 0:20 and A15.8's Short War trophy row is re-derived from the new median (trophies per minute within ±5% across formats).
- Legendary tuning: each Legendary's age must contain a counter that beats it at equal gold at least 55%. Today Mammoth Matriarch beats Spear Hunter 76%, Ursa Paladin beats Pikeman 73%, Behemoth Tank beats Bazooka Trooper 90%.
- Balloon Admiral gets a unit answer in Gunpowder; EMP Saboteur beats the mechs it should counter.
- Kill bounty stays 60%.

**Targets:** A16.5.

---

## A16.5 A2.14 targets and exploit proxies (v1)

| | |
|---|---|
| Class | Healthy |
| Architecture | Extends the existing `tools/exploits.ts` and `tools/proxies.ts` (8 proxies, Full War only today). New proxies, a rules-sanity runner, Short War in the smoke run, `--patch`, and new `EXPLOIT_TARGETS` |
| Size, phase, owners | S · Phase 2b (tools), Phase 3 (gates) · WP12, lead (A2.14 and B12 text) · `docs/requests/wp12-depth-proxies.md` |
| From | DP-2; audit 5; SV C1, C6; BS 1, 2 |

**Proxy rules.** Every proxy reads only the delayed `Observation`, decides every **0.5 s** (as built; the audit used 0.25 s, so its numbers are re-baselined), casts Last Stand when armed, never sells turrets and draws from a seeded RNG. Exploit rows run against the tier VII Balanced bot at L7, in Short and Full War, with at least 400 matches per proxy. Rules-sanity rows run scripts against scripts with no bot.

**New proxies:**

- **Random spam:** a uniformly random affordable tray unit, no turrets, no Treasury, evolves at once, power on auto-aim when full.
- **Mono family** (Heavy, AA, Ranged): a mixing parameter m of 0, 20, 40, 60, 80 and 100% of that role group, the rest random. The gate applies to the worst m.
- **Bait-and-switch:** 60% Heavy until the bot's visible AA share reaches 30%, then Infantry only.
- **Save-and-counter:** counter-picks, banks to 300 gold and then spends it all; 2 turrets, Treasury 1, power when the zone holds 350 gold or more, evolves in a safe window of at most 2 s, smart Last Stand.
- **Counter-picker** and **Balanced script** (rules sanity).

**A2.14 rows** (replace the exploit rows and add the rest):

| Metric | Old target | v1 gate | Later |
|---|---|---|---|
| Cheapest-unit spam | ≤ 55% | **≤ 20%** | same |
| Random spam | none | **≤ 15%** | same |
| Mono family, worst m, each group | none | ≤ 35% | ≤ 25% from v1.1 |
| Bait-and-switch | none | ≤ 35% | ≤ 25% from v1.1 |
| 4-turret turtle with Hold | 35-45% | 35-45% **and ≤ 50% of its matches at the Bell** | Bell ≤ 15% from v1.1 |
| Heavy plus mass Ranged | ≤ 55% | ≤ 55%; its mirror's Bell reported | mirror Bell ≤ 20% from v1.1 |
| Other B12 proxies | ≤ 55% | ≤ 55% (unchanged) | same |
| Save-and-counter mirror, Bell share | none | reported | ≤ 20% from v1.1 |
| Save-and-counter vs Turtle, Bell share | none | reported | ≤ 20% from v1.1 |
| Final Bell, tier VII mirror, baseline plan | < 3% | **≤ 10% Short, ≤ 5% Full** | < 5% Short, < 3% Full from v1.1 |
| Final Bell, tier VII mirror, a Legendary in each plan | none | reported | ≤ 15% Short, ≤ 10% Full from v1.1 |
| Rules sanity: counter-picker vs each mono spam | none | ≥ 80% | same |
| Rules sanity: triangle, mono vs mono (Heavy > Infantry, AA > Heavy, Infantry > AA) | none | each ≥ 70% | same |
| Rules sanity: skill gradient (Save-and-counter vs Balanced script; Balanced script vs cheapest spam) | none | each ≥ 80% | same |
| Has-an-answer (static, `counters.json`): a same-age card scores ≥ 55% at equal gold | none | gated for every non-Legendary card; Legendaries reported | Legendaries gated from v1.1 |
| Has-a-starter-answer (static): every mechanic (air, burrowing, structure, shields) has a Common or starter-kit answer in its age | none | reported | gated from v1.2 |
| Per-card Final Bell delta | none | reported | ≤ 5 points from v1.2 |
| Turret share of kills | 20-35% | **reported only** | same |
| Bot tier gaps (VII vs V, X vs V, VII vs III) | none | reported | reported; the gated skill measure is the rules-only gradient |
| Attention gap (Balanced script at 1 s vs 3 s, each vs VII) | none | reported | ≤ 5 points once Repeat order exists |
| Level edge +1 | none | reported | never gated |
| First-mover advantage | 47-53% | unchanged | per battlefield from v1.1 |

**Release rule for the Bell rows.** The old Short War row (< 3%) fails today by 20-30 points and no numbers-only change is known to reach it. If Phase 3 cannot meet a v1 Bell gate after the A16.4 levers, the lead records the measured value in `docs/balance-log.md`, tells the owner in plain words, and the row becomes the first v1.1 task. Bell rows alone do not block the v1 release. Every other row does (C4).

---

## A16.6 Teaching the wave (v1)

| | |
|---|---|
| Class | Healthy (informative feedback, A15.12) |
| Decisions | Banking 300-800 gold, then releasing a wave, beats spending as you go by 21-48 points among scripts, and by 10% → 36% against tier VII. Nothing shows it today |
| Counterplay | Enemy gold stays hidden; reading a lull is the skill. A wave is met with a power, a Hold or turrets |
| AI | Mama Moss and Madame Tempest already bank, Hold, then Charge visibly (A7.4) |
| Size, phase, owners | XS · Phase 2b · WP11 (detector, hint), WP9 (Result line), WP1 (strings) · `docs/requests/wp11-depth-session.md` |
| From | DP-4; audit P4; BS 2 |

- **Detector "trickle":** in the last 30 s the player spawned at least 6 units, no two within 2 s of each other, while the enemy army value on the lane was at least 1.5 × the player's.
- **In-battle hint** (A8, onboarding matches only): "Save gold, then send them together."
- **Loss tip:** "Tip: units sent one by one fall one by one. Bank gold, then send a wave." This one tip ships even if A15.12 is cut: one line on the Result of a loss where the detector fired, inside A15.13's summary row.
- Review (A16.16) later names the same pattern as a key moment.

---

## A16.7 Fair measurement: standard levels, peak tier and ranked (v1 rule; online)

| | |
|---|---|
| Class | Healthy |
| Decisions | Protects every decision in A16 from being drowned by levels (+1 level ≈ +20 points) |
| AI | Bots play at the same standard levels in those modes (A7.1) |
| Architecture | `OpponentSpec.standardLevels?` (A15.18 item 3); clamp `SideConfig.levels` in `BattleSession` for ranked |
| Size, phase, owners | XS · v1 (text, peak-tier rule) · WP7; S · online · WP7, WP11 |
| From | DP-9; audit P10; SV C9 |

- **Standard L7 for both sides:** the Daily Challenge (A15.7), Echo and challenge codes (A15.15), puzzles, Random Armies, Boss Battles and Endless Horde.
- **Gauntlet and Draft War** set levels only through boons (A15.17).
- **Online ranked:** every card plays at exactly L8, whatever its level. This replaces A6.8's "caps all cards at L8" with "sets".
- **The AI ladder and Conquest** keep A6.8 level matching; upgrades still matter there.
- **Peak tier at even levels** (v1, XS, amends A15.9): a win raises "Highest AI tier beaten" only when the player's average level over the format's ages is at most 1 above the opponent's. The Daily always counts (both sides L7). Offline, this is the one honest skill number, and it no longer measures grind. WP7, added to A15's `wp7-engagement-rules.md`.

---

## A16.8 Rule-mods engine (F1-lite) and the balance tools (v1.1)

| | |
|---|---|
| Class | None (a foundation) |
| Architecture | `ModEffect` and `ModScope` in `contracts/content.ts`, with **only the kinds a shipping system uses**. `createCtx` compiles every active source into per-side integer tables plus at most 4 zones; a unit's zone result is cached per tick on its runtime record. Neutral values keep goldens unchanged (a minor bump). Timed mods are hashed only when non-empty. New gameplay tables join `compile.ts`'s `hashedSlice`, so two builds with different terrain never share a `contentHash` |
| Size, phase, owners | M · v1.1, with battlefields · WP0, WP2, WP1, WP12 |
| From | DP-11; architecture F1; SV C3; BS 1, 3 |

**Already done in v1.** The sim reads Daily modifier effects from compiled content (`src/sim/modifiers.ts`), with the sign normalised and a test that content and the frozen defaults agree. No v1 work remains here.

**v1.1 kinds** (for battlefields and weather): `moveSpeed`, `range`, `damageTaken` with an attacker-tag scope, `unitDamage` with an own-tag scope, `turretDamage`, `turretRange`, `frontWidth`. Scopes: side, own tags, attacker tags, zone. Doctrines, if adopted, add `vsTags` (damage against targets with a tag), `attackSpeed`, `baseDamage`, `popCap` and per-side `passiveGold` (A16.10).

**Zones** are written in each side's own progress p and mirrored: a zone "p 600-700" covers x 600-700 for the left side and x 500-600 for the right side, and it applies only to that side's units. This settles whose units a feature helps.

**Stacking budget:** as in A16.1 (±20% per stat, range +15%, no range bonus at p ≤ 480, symmetric match-wide sources exempt).

**Performance.** The phone step budget (B16) is re-measured on the 80-unit Full War sandbox with 4 zones and a weather front active.

**Balance tools (v1.1, WP12, S each; CPU on free Actions, not credit):**

- **`sim:combos`:** random full configurations (battlefield × weather schedule × Daily modifier × doctrine picks once they exist). It flags any configuration where a proxy moves by 10 points or more against the flat baseline.
- **`tools/exploitSearch.ts`:** a parameterised script family (composition weights, bank threshold, doctrine policy, fort use, power threshold), hill-climbed against tier VII. The exploit gates apply to the best configuration found, so degenerate strategies are found before players find them.
- **Plan-meta search** (from v1.2, when the pool grows): A16.17.

---

## A16.9 Battlefields and weather (APPROVED; v1.1)

| | |
|---|---|
| Class | Healthy: symmetric, visible, known before the match |
| Decisions | Which preset to bring, ranged against melee weight, when to push (a Fog window), where to fight (take the ridge, stage in your trench) |
| Counterplay | Features are mirrored or central; the whole weather schedule is public |
| AI | Reads `Observation.field` and `weather`. Small scoring terms: push into a Fog window (turtle personalities first), avoid buying range ≥ 250 in the 20 s before Fog, prefer splash on a Bridge. Re-passes WP3's tier-ordering test |
| Architecture | F1-lite zones and timed mods; `frontWidth` in movement (already present if L4 was adopted in v1); `MatchConfig.battlefield?`; `content/battlefields.ts` with the weather table (hashed); weather drawn from `xmur3(seed + ':weather')`; `ArtProvider.createBackdrop({ battlefield? })` and `BackdropView.setWeather?(id, intensity)`, both optional so every art adapter keeps compiling; weather effects through `createEffect('weather.<id>')` |
| Art | Per arena: feature props and ground decals, faint zone-edge markers. Four weather overlays (rain streaks, snow, a drifting fog band behind the units, wind streaks with bending grass and flags) and audio loops. Lite shows fewer particles. Art M |
| Size, phase, owners | M + art M · v1.1 · WP0, WP2, WP1, WP3, WP4, WP5, WP6, WP8, WP9, WP11, WP12 |
| From | DP-10, DP-12, DP-13; benchmarks idea 3; SV C5; BS 4 |

**Feature kinds.** At most one per battlefield. Home-half bonuses reward holding, so every feature is central or helps the side that advances.

| Feature | Zone | Effect | Why |
|---|---|---|---|
| Ridge (high ground) | Central, x 540-660 | Units with tag `ranged` whose centre is on it get range +10% | Contested: it helps whoever holds mid-lane |
| Trenches | Each side's approach, own p 600-700 (just outside the enemy turret cover, which starts at own p 720) | Your ground units in your trench take −20% damage from attackers with tag `ranged` | A staging area for a wave; only the side winning mid-lane can use it |
| Bridge | Central, x 560-640 | Front width 1 on the span: armies meet in single file, so splash and pierce shine | **Measured before any art:** its Bell rows must stay within +5 points of the flat field. If not, it becomes a **Causeway**: ground units on x 520-680 move +15%, which speeds pushes through the middle |
| Ford | Central, x 520-680 | Ground units inside move −25%; air is unaffected | Same measurement. If it fails, the feature is dropped and the arena gets a Ridge |

Features never change bases, turret rules, spawns, powers or Last Stand. The old "Cover" on each side's own half is not built.

**Weather.** A battlefield lists 0-4 kinds. When the list is not empty, a match draws its fronts from its seed: 0 fronts 30%, 1 front 50%, 2 fronts 20%. Each front lasts 40 s, starts on a 5 s grid between 1:00 and 40 s before Overdrive, and two fronts start at least 60 s apart.

| Weather | Effect |
|---|---|
| Rain | Units with tag `ranged` and turrets deal −15% damage; ground units move −10% |
| Fog | Units with tag `ranged` and turrets have −35% range: a public push window against turtles |
| Snow | Ground units move −20% |
| Gale | Air units move −30% |

- The full schedule is public: on the VS screen ("Fog 2:10-2:50") and as bands on the match-clock timeline next to the Overdrive and Siege ticks. The HUD weather chip lights up 10 s ahead, a rules telegraph like a power's.
- Weather never hides units and never touches powers, bases or Last Stand. There is no night.

**Per arena:**

| # | Arena | Feature | Weather kinds |
|---|---|---|---|
| 1 | Tar Pits | none (flat, for onboarding) | none |
| 2 | Frostfang Pass | Ford (snowdrift) | Snow |
| 3 | Kingsmoat | Bridge | Rain |
| 4 | Powder Bay | Ridge (sea cliffs) | Fog |
| 5 | Iron Front | Trenches | Rain, Fog |
| 6 | Neon Harbor | Bridge (drawbridge) | Rain, Gale |
| 7 | Orbital Ring | Ridge (docking pylons) | Gale, Fog |
| 8 | Chrono Rift | Ford (time eddy) | Rain, Snow, Fog, Gale |

**Which battlefield a match uses.**

- **Ladder:** drawn by seed, uniformly, from every arena unlocked so far, and shown on the VS screen. A player stays in one arena for weeks; a fixed map per arena would make the preset pick a lookup.
- The tutorial and the first 20 matches of a save: flat Tar Pits, no weather (Pillar 1).
- **Conquest:** each General's home field: Pip Quickstep flat; Captain Kettle Bridge; Mama Moss Trenches (garden hedges); Baroness Ledger Ford; Sgt. Boomsworth Ridge; Ada & Ivo Bridge with Rain; Rook flat; Madame Tempest Ridge with Fog and Gale; The Warden Ridge with every weather.
- **Daily:** drawn from the Daily seed. **Skirmish:** the player chooses.

**Reveal, then pick a preset.** The VS screen shows the battlefield, the weather schedule, the AI General (tier and AI badge) and any modifiers; the player then taps one of up to **5** presets (A3 has 3). The default is the last preset used in that format. New presets start empty; nothing is copied. No timer offline; online, a 15 s pick window applies the default (a match-flow limit, not a reward countdown).

**Gates** (per battlefield and per weather kind): first-mover 47-53%; every A16.5 Bell and exploit row; no weather kind moves a mono-family proxy by more than 10 points; `sim:combos` clean.

---

## A16.10 Evolve doctrines (owner decision; v1.1 or v1.2)

| | |
|---|---|
| Class | Healthy |
| Decisions | Evolve moves from *when* (dominated) to *what*. The offer is known one age ahead, so the pick shapes what you train; the side that evolves second sees the other's pick and can answer it |
| Counterplay | Identical offers for both sides; the active doctrine flies as a glyph banner on the base and joins the Scouted list |
| AI | A `choose` term: counter value against the enemy's scouted cards and doctrine, the weather ahead, and personality weights. Tiers 0-II pick by seeded chance, III-VI by the doctrine's `aiHint`, VII and up with full scoring. Re-passes the tier-ordering test |
| Architecture | `evolve` command + `pick?: 0 \| 1`; `Observation.me.doctrineOffer` and `foe.doctrine`; `SideState.doctrine`, hashed when set; `SimEvent` `doctrinePicked`; `HudModel` offer glyphs and banner; `content/doctrines.ts` (hashed); the F1 kinds listed in A16.8 |
| Art | 10 procedural glyphs; split halves on the Evolve button; a banner glyph; a pick sound. S |
| Size, phase, owners | M · after battlefields, **only if the owner says yes** at the fun gate (A16.25, task 5) and again after playing battlefields; otherwise v1.2 · WP0, WP2, WP1, WP3, WP5, WP6, WP8 |
| From | DP-14; audit P8; benchmarks idea 4; SV C4; BS 3, 4 |

**Rules.**

- **When.** From Arena 2, in every mode except the tutorial and the first 20 matches. Picks happen at 2 evolves per match: both evolves in Short War, the 1st and 3rd in Standard and Full War (about 2 pivots per match, as Battlegrounds trinkets show). "Every evolve" is a data switch the owner can turn on after playtests.
- **Offers.** 2 doctrines per pick, the same for both sides, drawn without replacement by `hash(seed, 'doctrine', ageIndex)`. **The next pick's offer is visible from the start of the current age** as two small glyphs beside the XP bar (long-press shows the rule), so the choice is made calmly, not at the fastest moment of the match.
- **Pick then evolve.** When Evolve is available at a pick moment, the button splits into two labelled halves; tapping one sends one `evolve { pick }` command that evolves and picks. Keyboard: E left, R right. There is no plain Evolve at a pick moment, so picking costs no extra tap. The Ascension show plays unchanged.
- **One doctrine at a time.** A new pick replaces the old at `ageUp`. Doctrines never change max HP, so every effect is read live and a swap is clean for units already on the lane.
- **Shape.** One bonus and one cost, each at most ±15% on one stat of one group, or a small economy trade. Costs are paid in gold, pop, damage or damage taken, never in train time (the queue never binds, so train time is a fake cost). No doctrine touches XP, the clock, bounty, turrets or Treasury.
- **Onboarding hint** (first pick only): "Choose how your new age fights."

**Pool of 10.** Most are worth more or less depending on what the enemy shows, the weather ahead or the phase:

| Doctrine | Bonus | Cost | Best when |
|---|---|---|---|
| Hunters | +12% damage vs `armored` | −8% damage vs `light` | The enemy fields Heavies and mechs |
| Skirmish Screen | +12% damage vs `light` | −8% damage vs `armored` | The enemy swarms |
| Flak Drill | Units and turrets +20% damage vs `air` | Ground units move −5% | The enemy has air, or its next age brings it |
| Shieldwall | Your `melee` units take −12% damage from `ranged` attackers | Your `melee` units move −10% | The enemy leans on ranged units |
| Forced March | Ground units move +12% | Units take +6% damage | A Fog window or Snow is coming |
| Wide Line | Front width 3 | Ground units move −10% | Melee against a dug-in line (the owner's formation direction) |
| Zealots | Age Power charge +25% | Unit damage −5% | The enemy bunches up or banks for waves |
| Supply Lines | Passive gold +1 per second | Pop cap −6 | Early in the age, before armies fill up |
| Drill | Units +8% attack speed | Unit cost +10% gold | Few, strong units; cut if it fails the pick-flip gate |
| Breakers | Damage to bases +20% | Damage to units −5% | The enemy turtles, or Siege is near |

**Cut from the proposal:** Plunder (the bounty dial, a turtle income engine), Engineers (a second turtle doctrine), Swarm and Veterans (fake train-time costs), Loose Order, Field Medics and Siegecraft (new effect kinds).

**Gates:**

- each doctrine within ±5 points in mirrored runs;
- **pick-flip:** across sampled lane states, each offered pair's better pick must flip in at least 30% of states; a pair that never flips is not a decision and is removed from the draw;
- `sim:combos` with doctrines, battlefields and weather together.

---

## A16.11 Power ring overflow (v1.1 experiment)

| | |
|---|---|
| Class | Healthy |
| Decisions | Today a full ring wastes charge, so the only real decision is to fire early. With overflow, *when* becomes a readable choice: hold for a clump, or bait the enemy's ring first |
| Counterplay | Both rings show the overflow arc; the opponent spreads out, holds back or baits |
| Architecture | `EconomyRules.power.chargeMaxPpm?` (default 1,000,000, today's behaviour); the sim clamp and `powerReady`; the AI's readiness test and final-age inference; the HUD ring |
| Size, phase, owners | S · v1.1, headless first · WP2, WP5, WP3, WP12, WP0 |
| From | DP-5; audit P5; SV C6; BS 2 |

**Rules if adopted** (A2.9 amendment): charge keeps filling past 100% at the same rate up to 150%; a cast uses 100%; the evolve carry stays min(charge, 50%), so overflow is lost on evolve; Overcharge adds charge only below 100%.

**Adopt only if all of these pass, and the owner agrees:**

- firing at a zone worth ≥ 450 gold beats firing when full by at least 5 points;
- a power-hoarding turtle proxy (Hold, fires only into a wave) reaches the Bell in at most 20% of its matches;
- "bait the power, then wave" beats a plain wave against a hoarding opponent by at least 5 points, so baiting is a real skill.

Reason for waiting: the v1 evidence (20% vs 10% at N = 40) is inside the audit's noise band, and the change touches four WPs.

---

## A16.12 Modes and seeded rotation

A15.17's rule stands: core modes are permanent. Every mode has a natural end (A15 rule 5) and pays Dust or cosmetics, never Amber or power (rule 8). Levels as in A16.7.

| Mode | Rules | Rewards | Class | Size · phase |
|---|---|---|---|---|
| Ladder, Daily, Conquest, Skirmish | As today; battlefields and weather from v1.1 | As today | As A15 | none |
| Blitz | A15.16 Skirmish preset | As Skirmish | Healthy | XS · v1.1 |
| Random Armies ("Ageborn 960") | Both plans generated per age from the seed and the full pool, owned or not. Each age is guaranteed a Heavy or Legendary, a Ranged, an Anti-armor, a splash source and, from Gunpowder, an air-hitter. A "mirror" toggle gives both sides the same plan | As Skirmish | Healthy | S · v1.1 (`SkirmishOptions.plan?`, A15.18) |
| Draft War and Gauntlet | A15.17, plus a first "Banner Group" pick per plan: a Legendary with 3 complementing cards (the Hearthstone Arena lesson). Online ranked "Arena" uses a mirrored variant: both players get the same offers (A16.21) | A15.17 | Healthy | M-L · v1.2 |
| Boss Battles | A permanent numbered gallery (D1's "weekly kaiju" is dropped). A boss is a disclosed asymmetric AI side: base HP ×3 and a boss unit with phase triggers below 66% and 33% HP (summon waves; enrage +30% attack speed), all shown on the VS screen. Stars for conditions, as Heat | First clear 100 Dust and a village monument; stars 25 Dust each | Healthy | M (F1 + F2) · v1.2 |
| Endless Horde | Your War Plan against seeded, escalating waves (`TrainingEvent.spawn?`). No clock. The run ends when the base falls or at wave 30, with a finish screen. No auto-restart and no per-wave rewards | 5 Dust per wave above your best; best wave on the Profile | Healthy | M · v1.2 |
| Battle Puzzles | A16.16 | A16.16 | Healthy | M · v1.2 |

**Rotation without taking anything away** (engagement rule 9):

1. **Per match:** weather fronts and doctrine offers come from the match seed; the ladder battlefield comes from the seed.
2. **Per day:** the Daily draws a battlefield, a modifier (or a pair, A15.16), an opponent and a seed. Mode select spotlights one "Featured today" mode from the date seed. Every mode stays available.
3. **Per content season:** new cards and a numbers-only balance patch shift the meta (A16.17).

**Never:** time-limited modes, a curated calendar (Hearthstone cancelled Twist in 2026), "featured odds" boosts (A15.22), or rotating owned cards out of any mode they were earned for.

**Commanders are deferred** (v1.3 or later, only after doctrines prove out). They add the largest new axis for little gain, since doctrines already give each match its asymmetry. If they are ever built: one passive of at most ±10% under the stacking budget, one single-use active, no stance-cooldown active (pure click speed), every summoned unit pays normal bounty, no instant-gold active, no hero unit in the lane at first, and no level-ups.

---

## A16.13 One lane: decision, revisit trigger and a two-lane sketch

**Decision (with the owner, 2026-09-27).** Ageborn keeps one lane:

- it is the genre's identity;
- it reads well on a phone in landscape;
- several real-time lanes reward click speed;
- the sim is one-dimensional by construction, and a second lane means rebuilding it.

**Depth inside the lane:**

| Source | Where |
|---|---|
| Layers: ground and air (exist), underground (APPROVED) | A16.15 |
| Ranks: the third rank really fighting, or a three-wide front | A16.4 (L3, L4) |
| Formation | The Wide Line doctrine (A16.10); the Bridge's single file (A16.9). No formation toggle: stance toggling is already more clicking than deciding |
| Terrain and weather | A16.9 |
| Fortifications on fixed pads | A16.14 |
| Stance | Charge and Hold as today. No movable hold line: with one feature per map the best line would be a per-map constant |

**Revisit trigger.**

- **v1:** the owner's feel. After at least 10 Full Wars at Checkpoint B, if the owner says matches feel like "one blob pushing", the experiment below is costed and offered.
- **From v1.1, measured on the expert meta, not on casual play:** after battlefields ship, if the Save-and-counter mirror still reaches the Bell in more than 20% of matches, or `tools/exploitSearch.ts` finds one plan family that wins at least 60% against every other family, the experiment is offered to the owner.

**Two-lane sketch: "Twin Fronts".** An experiment only: XL, behind a dev flag, never in ranked.

- Its own format id and its own A2.14 targets.
- `lane: 0 | 1` on units and in the `train` and `power` commands.
- Gold, XP, age, Treasury, power charge and pop (60) are shared; each lane has its own spawn, front and movement; turret mounts split 2 and 2.
- Two lane bands at half height: landscape only, unreadable in portrait.
- A 1-week internal prototype plus an owner playtest decides whether it lives on.

---

## A16.14 Fortifications (prototype v1; card type v1.2 if the gate passes)

| | |
|---|---|
| Class | Healthy |
| Decisions | Gold and pop into a wall (defence) or into units (attack); which pad; when to commit, given the build time and the 25 s recharge. For the attacker: bring Heavies, siege units, tunnelers or air, wait for decay, or push in Fog |
| Counterplay | A fort is a visible commitment: it scaffolds for 5 s before it blocks. Heavy, siege and Legendary attacks deal ×2 to it; every blocked attacker can hit it; it decays and takes ×2 in Siege; tunnelers pass under and air flies over |
| AI | A `place` action: under pressure, the most forward free legal pad inside turret cover (Mama Moss places more). Walls **count** in the push-gate defence value D (each live wall adds 2 × its cost), and the bot answers them with siege, tunneler and air picks through `aiHint.vsStructure`, because the counter matrix (equal-gold duels on a flat lane) cannot value walls |
| Size, phase, owners | Prototype S · v1 Phase 2a, dev page only · WP5, WP12 · `docs/requests/wp5-wall-sandbox.md`. Card type L+ · v1.2 · WP0, WP1, WP2, WP3, WP4, WP5, WP7, WP8, WP9, WP12 |
| From | DP-19; benchmarks idea 10; SV C2; BS 1, 5 |

**Checkpoint A prototype** (no sim, contract, content or art change).

- **Where:** the sandbox dev page (`src/dev/sandbox/viewSources.tsx`, WP5), which already runs the real sim, the real HUD, human commands and AI seats.
- **Walls toggle:** builds a clone of the compiled content that adds a `palisade`, copied from Tuskback's compiled def with: `speed: 0`; HP ×1 (the full rule; a ×2 switch for feel); `abilities: []`; tags `armored` and `ground`; `hidden: true`; `visualId: 'unit.palisade'` (the placeholder visual); one attack with `damage: 0`, `range: 2000`, `hitsGround: false`, `hitsAir: false`.
- **Why it works:** that attack is inert; the overtaking rule lets own units walk through a parked ally with a longer range; the enemy block rule stops enemies at the wall; `devSpawn(sim, side, 'palisade', { p, summoned: true })` means no pop and no bounty.
- **Placement:** pad buttons at p 240, 360 and 460 for either side, plus a free p slider, so "fixed pads or free placement" is tested in the same session.
- **Check:** a 20-line test proves own melee passes, enemy melee stops and attacks the wall, and Sabertooth pounces over.
- **Known gaps:** no scaffold, pop cost, contact rule or ranged ×0.5; enemy ranged units shoot the wall at full damage. The prototype is a worst case for turtling.
- **Headless number** (WP12): a wall-turtle proxy (4 turrets, Hold, Ranged-heavy) re-places 2 walls through a driver hook that calls `devSpawn` whenever the 25 s recharge allows and no enemy ground unit is within 120 lu of the pad; it counts 125 gold of its own spending per wall. Played 400 times against tier VII.

**Go or no-go** (A16.25, task 4). The owner's answer decides whether forts go on; the headless number sets the burden of proof:

- the owner finds walls fun and the worst case is ≤ 55%: build the card type in v1.2;
- fun but the worst case is > 55%: build the full rules sim-first in v1.2 and pass the wall-turtle gate before any fort art is made;
- not fun: park forts, and re-confirm the underground layer's scope with the owner (A16.15).

**Card type rules (v1.2).**

- **Slot and unlock.** Arena 3. Each age loadout gains 1 Fort slot: 5 units, 2 turrets, 1 fort, 1 power.
- **Pads.** 3 per side at p 240, 360 and 460, all inside turret cover (or free placement at p 200-460 if the owner preferred it). At most **2** forts alive per side, one per pad.
- **Commitment.** A pad is legal only when no enemy ground unit is within 120 lu of it. A placed fort is a **scaffold for 5 s**: visible to both sides, hittable, not blocking, traps unarmed. Only then does it block. A wall cannot be dropped as a panic button in front of a wave.
- **Pop.** A live fort (scaffold included) uses 6 pop, like a Heavy, so spare gold at 60/60 cannot flow into walls for free.
- **Recharge.** 25 s after placing; first ready at 0:20; evolving does not reset it.
- **Cost,** flat across ages like units: wall 125 gold, trap 75, bunker 175.
- **Wall HP** = 1 × the age's Heavy Common HP at L1: Stone 560, Medieval 756, Gunpowder 1,019, Modern 1,378, Future 1,860. Levels scale as for cards.
- **Contact rule.** Every enemy ground unit whose path the wall blocks, standing within 60 lu behind the blocked front unit, may start its first attack on the wall as if in range. Break time falls as the attack grows.
- **Damage taken:** ×2 from Heavy, siege-tagged and Legendary attacks (a `mods` entry `vs: 'structure'`); ×0.5 from attacks with range ≥ 100, which pick a fort only when no unit candidate is in range; ×2 during Siege; Age Powers and Last Stand never hit forts.
- **Decay.** From 60 s after placement, −1% of max HP per second, ×2 in Siege: about 160 s of life untouched, about 110 s in Siege.
- **Blocking.** Enemy ground units stop at a wall; own units walk through their own forts; air ignores forts; burrowed units pass under.
- **Bounty.** Destroying a fort pays 60% of its cost in gold and 100% in XP, like a unit. A decayed fort pays nothing.
- **Forts never** queue, convert on evolve or modernise.
- **Traps:** untargetable, non-blocking and always visible to both sides; they fire when an enemy ground unit's centre comes within 30 lu (1 s between charges); air and burrowed units never trigger them. **No trap stuns**, so a trap plus a power telegraph is never a guaranteed hit.
- **Keyboard:** D places on the most forward free legal pad. **HUD:** a Fort button with drag-to-pad (the power drag); on the phone, if the owner found the tray too tight (task 1), forts are placed by long-pressing a pad instead.

**Season 1 cards (10):**

| Age | Wall (Common) | Trap (Rare) |
|---|---|---|
| Stone | Palisade | Spike Pit: 3 charges, 40 damage and 40% slow for 2 s each |
| Medieval | Shield Barricade | Caltrops: 3 charges, 40 damage and 50% slow for 3 s each (×P) |
| Gunpowder | Gabion Wall | Powder Keg: 1 charge, 250 splash r60 (×P) |
| Modern | Sandbag Bunker (175 gold): a wall; allies within 60 lu behind it take −20% damage from ranged attacks | Minefield: 3 charges, 150 splash r40 each (×P) |
| Future | Hardlight Barrier: regenerates 1% per second after 3 s without damage, and still decays | Grav Snare: 1 charge, 60% slow for 3 s, r80 |

**Architecture (full):** forts are stationary units with the F2 traits `structure`, `allyPassable` and `noPowerDamage` (targeting, damage, deaths, hashing, events and views reused), plus scaffold, decay, pad legality and the contact rule; `Tag` + `structure`; `Loadout.structures?`; command `place { side, slot, pad }`; `EconomyRules.fort { pads, max, rechargeMs, firstReadyMs, scaffoldMs, decay }`; F2 for traps; F5 slot counts; a structure-aware counters generator; save loadout migration.

**Art:** 10 static rigs with scaffold, build, hit, three crumble stages and collapse; armed and spent trap states; subtle pad markings. About 1 agent hour each (code-drawn). Sounds: build thunk, crumble, trap snap.

**Gates:** wall-turtle proxy ≤ 45% with ≤ 15% of its matches at the Bell; the 4-turret turtle unchanged; each fort card within ±3 points and a Bell delta ≤ 5; has-a-starter-answer (the Heavy Common ×2 against structures qualifies).

---

## A16.15 Underground layer (APPROVED; v1.2)

| | |
|---|---|
| Class | Healthy: every tunnel is visible |
| Decisions | Tunnelers answer turtles and backline-heavy plans. The defender chooses a detector turret or a normal one, and how compact to keep the backline |
| Counterplay | A dust trail always shows the tunnel; surfacing has a 1 s telegraph; detectors hit burrowed units; ground powers and Last Stand hit them at 50%; melee near the backline punishes the surfacing |
| AI | The book gains `burrows` and `detects`. Bots with scouted tunnelers value detector turrets; burrowed units count in threat estimates |
| Architecture | First a behaviour-neutral refactor that replaces the ad-hoc `air`, `hitsAir` and `hitsGround` checks (53 lines in 14 sim files) with `layerOf(u)` and `canHitLayer(attack, u)`, proved by unchanged goldens (S-M). Then `UnitState.burrowed?`, `AttackDef.hitsUnder?`, `Observation.units[].burrowed?`, `Tag` + `under`, `UnitPose` + `burrowed`. Burrowed movement is like air (no blocking) at ground speed. Burrow and surface are F2 effects |
| Art | Burrow and surface clips, a moving mound pose, a dust trail on the ground-decal layer, 3 detector turret rigs. S-M |
| Size, phase, owners | M (after F2) · v1.2 · WP0, WP2, WP1, WP3, WP4, WP5 |
| From | DP-20; architecture 4.3; BS 3, 4 |

**Rules.**

- **Cards** (Season 1): Sapper (Gunpowder), Tunnel Rat (Modern), Mole Drill (Future). Role group Epic: cost 200, train 4 s, pop 8. They are fragile raiders with priority `backline` and ×1.5 against tag `ranged`. This makes a second Epic per age, so WP1's per-set count rules (A16.19) are a prerequisite.
- **Burrowing.** Spawns at p 20 and digs in over 1 s (hittable while digging), then travels burrowed at its speed and obeys stance.
- **While burrowed:** ignores blocking by units and forts; cannot attack; only `hitsUnder` attacks (the Detector keyword) can hit it; ground Age Powers and Last Stand deal it 50%.
- **Surfacing** at the first of: its centre within 20 lu of an enemy ranged or support ground unit at p ≥ 560; or p 880 (the enemy's hold line). Surfacing takes 1 s with a dust plume visible to both sides; the unit can be hit during it and never burrows again.
- **Detectors** (Season 1): one detector turret each in Gunpowder, Modern and Future.
- **Gate:** a "tunnel rush" proxy (tunnelers only, Infantry as fallback) ≤ 25%.
- **If forts are parked** (A16.14), the layer is still approved, but its main reason (passing under walls) is gone and it overlaps Sabertooth's pounce and the bombers. The orchestrator re-confirms the scope with the owner before building it.

---

## A16.16 The learning loop: Battle Puzzles and Review

Chess grew on a loop, not on content: short fair games, puzzles from real games, and analysis with key moments (benchmarks 2.11). Deterministic replays make all of it possible here.

### Battle Puzzles (v1.2)

| | |
|---|---|
| Class | Healthy. The daily pick is a spotlight, not a bank or a streak; every puzzle stays playable forever |
| Decisions | Isolates the levers the audit found: hold the wave, time the power, Last Stand, Hold then Charge, and later fort placement |
| AI | The opponent is a bot at a fixed tier, rebuilt by re-running its controller from tick 0, so every attempt is deterministic given the player's inputs |
| Architecture | Built on A15.17's battle-resume infrastructure: a session that starts from tick T of a recorded match (`replayMatch(r, content, toTick)` exists) with bots rebuilt. Mined positions keep in-flight projectiles, statuses, timers and RNG state, which a tick-0 scenario would lose. F4 scenarios (`training.scenario?`) come later, only for hand-authored setups. `content/puzzles.ts` (outside `contentHash`): id, stable number, source replay and tick, player side, goal, stars, and a copy of its battle rules (A15.17). `tools/puzzles.ts mine` and `verify` (CI replays every stored solution). Save `puzzles?: Record<id, { stars; bestMs }>`. `MatchResultInput.mode` + `puzzle`. A Puzzle screen |
| Size, phase, owners | M + S per 10 puzzles of authoring, after battle resume · v1.2 · WP11, WP2, WP1, WP7, WP9, WP12, WP3, WP8. It replaces and widens A15.17's Clutch Puzzles |
| From | DP-22; A15.17; SV C10; BS 4 |

**Rules.**

- A puzzle is a position, an opponent, a clock limit of 30-120 s, one goal and three stars. Goals reuse A15.10's predicate kinds: destroy the base before T; survive to T with the base at X% or more; kill N units with one power; win spending at most N gold.
- **Themes,** not only clutch saves: Waves, Powers, Last Stands, Holds.
- **Levels:** standard L7 on both sides.
- **Attempts:** free and unlimited, instant retry; "Show idea" after 3 failed attempts.
- **Solvable by humans.** A human-limited input bot (at least 300 ms per action, at most 12 actions per 10 s; new WP12 and WP3 work) must solve every puzzle.
- **Tolerance test.** The stored solution must still reach its goal with every input shifted 400 ms earlier and, in a second run, 400 ms later. A puzzle that needs one exact tick is a reflex trial and is rejected.
- **Mining.** `tools/puzzles.ts mine` scans headless bot matches for positions where one decision flips the result; a human curates. A broken puzzle is re-authored or runs on its stored rules copy.
- **Pool:** 30 at launch in 3 numbered sets of 10; 10 more per content season.
- **Puzzle of the day:** `hash('puzzle' + YYYYMMDD) mod pool`, the same for everyone. Mode select shows "Today's puzzle: #37". No streak and no count of unsolved puzzles (A15.13).
- **Rewards:** first ★ 10 Dust, ★★ 10 more, ★★★ 20 more. A set of 10 at ★★★ pays a banner once. The daily pick pays nothing extra.
- **Copy line:** `Ageborn Puzzle #37 · ★★★ · 0:48`. No name; copying pays nothing.
- Difficulty shows as 1-5 pips per puzzle. There is no player puzzle rating (A15.9: one moving rank).

### Review: advantage graph and key moments (v1.1; "What if" v1.2)

| | |
|---|---|
| Class | Healthy |
| Decisions | Attribution (decision test 4): the player traces results back to choices |
| Architecture | `src/sim/analysis.ts` (pure, WP2) re-simulates a replay with `replayMatch` in a Web Worker and samples every 20 ticks. Evaluation: P(side 0 wins) = logistic(Σ wᵢ fᵢ) through an integer look-up table. Features: army value × HP%, base HP, age difference, XP, gold, Treasury, turrets, power charge. Coefficients are content data fitted offline by `tools/fitEval.ts` on at least 5,000 headless matches. No contract change beyond an exported type |
| Art | A graph (the dataviz rules apply); no new game art |
| Size, phase, owners | M · v1.1, with D1's replay seek bar · WP2, WP1, WP12, WP9, WP11. "What if": M · v1.2, after battle resume |
| From | DP-23; SV C10 |

- **Where:** a "Review" button on the Result screen and in the replay viewer. Never a staged Result step (A15.13) and never live in battle.
- **Graph:** advantage from 0:00 to the end (blue above, orange below) with phase and weather ticks. Tapping a point opens the replay there. A note under it: "Estimated from AI games."
- **Key moments:** the 3 largest swings over 5 s windows. A swing is an *effect*; the mistake usually came earlier. Each key moment therefore shows its main event (a wave arriving, a power with N kills, an evolve, Last Stand, a wall broken) **and** any lever note that fired in the 60 s before it.
- **Lever notes** (at most 3, fixed thresholds in content): "You held 400+ gold for 40 s." "12 units arrived one at a time." "Your power hit 2 units." "You evolved 20 s after it was ready."
- **"What if" (v1.2).** At each key moment, re-simulate from 20 s before it with one alternative policy for the player's side (bank then wave; fire the power at the best zone) and show the difference in the evaluation. This is the real chess lesson, and deterministic re-simulation makes it cheap.

---

## A16.17 Keywords and content growth: from 65 to 150+

### Keywords

| | |
|---|---|
| Class | Healthy |
| Decisions | Faster plan building and counter reading as the pool grows |
| Architecture | v1.1: `content/keywords.ts` maps existing ability kinds and attack fields to about 10 player-facing keywords, each with an icon and a one-line rule template (`t('kw.reach', { … })`); chips in Card detail; a Collection filter. No sim change. v1.2: the F2 engine (triggers, selectors, effects, traits; architecture 3) runs alongside the old kinds with goldens green; the old kinds are ported once, at a planned major bump; `keyword` events feed `feel.config.json`, so each keyword has one reusable effect and sound |
| Size, phase, owners | S · v1.1 · WP1, WP9, WP4 (10 glyphs). L · v1.2 · WP0, WP2, WP1, WP3, WP5, WP12 |
| From | DP-25; architecture 3; SV v1 slice 5; BS 2 |

- **v1:** no chips and no filter. Card descriptions already name each behaviour in words.
- **v1.1 glossary: only keywords that at least 2 v1 cards share.** Impact, Reach, Ricochet, Splash, Cleave, Pierce, Heal, Suppress, Flying, Drag. Behaviours found on one card (Pounce, Riders, Time Stop, EMP, Roar, Call-in and others) stay card text; that is card text, not a keyword system.
- **Rules for new cards:** at most 2 keywords per card; at most 2 new keywords per season, about 25 evergreen in the long run; keyword numbers vary per card but type multipliers stay within ±25% (only the existing triangle keeps ×2); no keyword may hide state.
- **Keyword stat budget.** Each keyword carries `budgetBp`: a fixed deduction from the vanilla line, priced from duel and smoke-run sims. A keyword card with vanilla stats would be strictly better than vanilla; the budget prevents that.
- **Synergy comes from keyword interactions** designed into content, not from a bonus system: Mark with big hitters, Drag with splash, slowing traps with powers.
- About 1 new card in 10 needs a new trigger or effect kind (about a day of sim work plus tests). The other 9 are data, art and strings.

### Balance discipline for a growing game

| Rule | Check |
|---|---|
| **Vanilla line.** Each age's Commons are the reference; a new card may not beat them on stats per gold at equal level, after its keyword budget | Report per season |
| Per-card win-rate delta within ±3 points; Bell delta ≤ 5 | `sim:balance`, only for cards whose card hash changed |
| **Has-an-answer:** a same-age card scores ≥ 55% against it at equal gold | Static, `counters.json` |
| **Has-a-starter-answer:** every mechanic (air, burrowing, structure, shields) has a Common or starter-kit answer in its age, so rarity never decides whether a player has a hard answer | Static |
| **Plan-meta search** (`tools/metaSearch.ts`, WP12, from v1.2): an evolutionary population of 64 War Plans per format from the full pool, piloted by the Balanced brain. No plan wins more than 58% against the field, and the top 10 hold at least 5 distinct plans (differing by 3 or more cards) | Each season; CPU on free Actions |
| **Numbers-only patch** each season | A16.5 and the rows above re-run |
| **Nerf compensation.** When a patch lowers a card's win-rate delta by more than 3 points, every save that upgraded it gets, once, the Dust value of the copies it spent on that card (A6.6 "copy past L10" rates), and keeps its levels. No time limit. Nothing earned is taken away | WP7, WP1 (a meta table per patch, outside the hash), a `flags` entry; from the first patch after v1 |
| **Nothing owned is removed** from a mode it was earned for; `retired` is only for content fixes | Content integrity test |

### Content roadmap

**Seasons are content releases, not reward seasons.** Each is a numbered set; nothing in it is time-limited; its cards join every capsule pool with A6.4-A6.5's unowned weighting and new-card protection. Each season is one funded build session. **None is funded today.**

| Release | New cards | Total cards | Also | Size |
|---|---|---|---|---|
| v1 (Checkpoint D) | 35 units, 20 turrets, 10 powers | 65 | | funded |
| v1.1 | none | 65 | 8 battlefields, 4 weathers, emotes and quips; 10 doctrines if adopted | M-L (systems) |
| Season 1 (v1.2): "Walls and Tunnels" | 10 forts, 3 tunnelers, 3 detector turrets | 81 | 5 Ascended forms (A16.18) | L, with F2 |
| Season 2: "Sidegrades" | 10 units (2 per age), 5 turrets, 5 powers (a third per age) | 101 | | L |
| Season 3: "The Bronze Age" (D1's sixth age) | 7 units, 4 turrets, 2 powers, 2 forts | 116 | The Bronze Legendary's Ascended form; a decision on which formats include Bronze | L-XL |
| Season 4: "Beasts and Machines" | 12 units (2 per age), 6 turrets, 6 forts | 140 | Forms for any new Legendaries | L |
| Season 5 | 12 units, 6 turrets | 158 | Forms for any new Legendaries | L |

If forts are parked, each season swaps its forts for sidegrade units and turrets; the totals stay the same. At one funded season per quarter, 150+ cards arrive about 15 months after v1, not in year one. Seeds (battlefields × weather × doctrines × modifiers × modes) give far more variety per credit, so v1.1 spends on them first.

**Cost per card** (estimates from the architecture report and the spike, not measurements):

| Kind | Data and strings | Art, procedural tier | Art, 3D sprite tier | Balance |
|---|---|---|---|---|
| Common or Rare unit on an existing rig | 0.5 h with keywords | About 80 lines of SVG parts and clips, about 1 agent hour | 1-2 agent hours; 70-200 KB per sheet at 1.5x | Smoke run (400 matches, about 1 min on 8 workers), then a full run for changed cards |
| Epic or Legendary unit | 1 h; about 1 in 3 needs a new keyword kind (+1 day of sim work) | + signature clip and walkout pose, 3-5 agent hours | 3-6 agent hours; up to 300 KB | As above, plus has-an-answer and Bell delta |
| New rig (a burrower, a new flyer) | none | + half a day | + half a day | none |
| Turret or fort | 0.5 h | 0.5-1 agent hour (code-drawn) | stays code-drawn | As above |
| Power | 1 h | 1-2 agent hours of effects | stays code-drawn | Power coverage check (A2.9) |

**Per season** (about 15-25 cards): about 25-60 agent hours of art, 10-15 hours of data, strings (English and Danish) and tests, an economy re-run (A6.9), the A15.20 "days without a new collectible" report, and a pick-rate report from bot drafts.

**Download size.** Sprite sheets load per match roster (at most 2 × 45 cards), never for the whole pool.

**Prerequisites before Season 1:** F3 (A16.20: otherwise every new card breaks every stored and shared replay, puzzle and Echo replay); WP1's per-set count rules (`src/content/schema.ts` hard-codes 35 units, 20 turrets, 7 units, one Epic and one Legendary per age, and rarity totals 25/15/10/5); new gameplay tables inside `hashedSlice`.

---

## A16.18 The rarity ladder: Ascended forms and Holo (v1.2)

**One ladder for every collectible:** Common, Rare, Epic, Legendary, and a new top tier, **Mythic**. Foils (Bronze, Silver, Holo) are a separate axis, as today.

### Mythic as Ascended forms (recommended; owner decision O2)

| | |
|---|---|
| Class | **Grey:** a random cosmetic reward for players who may be minors. Safeguards: earned only; pre-rolled; odds and a pity counter on every capsule screen; a crafting path; no duplicates; no trading, gifting or selling (red lines 1-2); no "collection value" number; no rate-up events (A15.22); honest pre-signals only (red line 7); quick reveal honoured; walkouts ≤ 10 s |
| Decisions | Which Legendary to show off; nothing in battle changes |
| Architecture | `SkinRarity` + `mythic` (already planned in `contracts/ids.ts`). An Ascended form is a Mythic skin of a Legendary unit, applied through `SideConfig.skins` (exists), so the sim never sees it. A capsule-level roll and pity in A6.4-A6.5; save `pity.sinceMythic` and the skin-rarity picklist (migration); `sim:drops` chi-square and pity-boundary tests; a rarity colour token |
| Art | Per form: a walkout, a spawn effect, a lane idle flourish that keeps the silhouette and team zones (A5.8 clarity parity), a sound set, a Mythic frame. 5 at launch |
| Size, phase, owners | M + 5 forms of art · v1.2 (Season 1) · WP0, WP1, WP4, WP7, WP8, WP10, WP12 |
| From | DP-28; SV C7, C12; BS 4 |

**Why cosmetic.** The owner wants rarity to be "mostly a sidegrade: spectacle, uniqueness, not raw power". A Mythic *card* with a new signature would give lucky or long-playing players strategic options others lack, add a random reward that affects play for minors, and touch about 12 `Record<Rarity, …>` sites plus the balance gates, the AI and an economy re-run. An Ascended form gives the thrill and the uniqueness at the cost of art. New gameplay stays in Epics and Legendaries, which have pity at 40 and can be crafted. D1's "Mythic skin tier with a hard pity at 40 crates" becomes this tier.

**Rules.**

- **Pool.** One Ascended form per Legendary: 5 in Season 1, then one with each new Legendary.
- **Eligibility.** A capsule rolls for a Mythic only when the player owns a Legendary whose form is not yet owned; the form is picked among those. Pity counts only eligible capsules. So there are never duplicates, and a player who owns every eligible form simply stops rolling until a new Legendary arrives.
- **Roll** (a new A6.4 step after guarantees):

  | Tier | Clay | Bronze | Silver | Jade | Aeon |
  |---|---|---|---|---|---|
  | Mythic chance | 0 | 25 bp | 50 bp | 150 bp | 500 bp |

  Supply, Trophy Road and Codex capsules roll by their tier; Age Capsules roll 50 bp for that age's form; scripted, Age Unlock and Wardrobe capsules never roll. A Mythic is added to the capsule; it replaces no card stack.
- **Pity** (A6.5 style): n counts eligible capsules since the last Mythic, including this one. n ≤ 100: no bonus; 101-149: a Mythic with probability (n − 100) × 2%; **n = 150 guarantees one.** Every capsule screen shows "Mythic: 37/150".
- **Crafting:** 4,000 Dust for a form whose Legendary you own.
- **Expected rate** for the engaged A6.9 profile (about 6 capsules a day): about 1 in 220 capsules without pity, about 1 in 85 with it, never more than 150 (about 25 days). `sim:drops` confirms these.
- **Presentation.** UI colour #F0386B with an iridescent sweep. The card back glows Mythic for 0.3 s only when a Mythic is really there (A10 step 5); there is no teasing climb and no "almost Mythic". Walkout 10 s the first time and 3 s after, always skippable. The odds panel says: "Mythics can't be bought, traded or given away." Nothing is ever described as "the rarest object in the game".
- **Codex:** +16 points per form.

**The rejected alternative** (if the owner prefers it anyway): a Mythic card that counts as Legendary for every limit and plays at the level of the player's highest same-age Legendary. It needs `Rarity` + `mythic` on cards, the full balance gates, has-a-starter-answer for its mechanic, and the economy re-run.

### Holo in the lane

| | |
|---|---|
| Class | **Grey:** a random cosmetic. Safeguards: odds unchanged and shown (A6.4 step 5: Holo 25 bp per stack); no foil pity (A15.22 rejected the Holo compass); crafting after L10 (A15.11); no value number; never tradable |
| Architecture | `SideConfig.foils?: Record<CardId, Foil>` (cosmetic; the sim ignores it and hashes skip it); `ArtProvider.createUnit` + `foil?`; one shared shimmer filter for every rig |
| Size, phase, owners | M (art) · v1.2 · WP0, WP4, WP5, WP11 |
| From | DP-29; SV C12 |

- A5.8's "Foils never appear in the lane" becomes: "Only Holo appears in the lane: a holographic shimmer on the unit's non-team parts and a sparkle on spawn, visible to both sides." Bronze and Silver stay on the card frame.
- Clarity parity holds: silhouette unchanged, team zones untouched, colour rule applied, gallery tests per rig. Lite shows a static holo trim.
- About 1 Holo per 128 bag capsules (about 3 weeks for the engaged profile).

---

## A16.19 Slots, sets and the album

| | |
|---|---|
| Class | Healthy |
| AI | The procedural plan generator (A7.4) draws from the growing pool under A6.8's rarity allowance; the counter matrix is regenerated each season (same and adjacent ages) |
| Architecture | Each card gets a permanent dex number `num` (v1.1, in a meta table outside the hash, for codes), then `set` and `family` on card defs (v1.2); content split into `content/sets/<set>/<age>.ts`; per-set count rules; F5 data-driven slot counts (`EconomyRules.loadoutSlots`, `Command.slot: number`) |
| Size, phase, owners | S (v1.1: presets, `num`) · M (v1.2: sets, F5) · WP1, WP0, WP2, WP9, WP7, WP8 |
| From | DP-27; SV C7; BS 3 |

- **Loadout per age:** 5 units, 2 turrets, 1 power; plus 1 fort from Season 1 if forts pass.
- **No sixth unit slot.** Every slot adds coverage, and coverage is what makes in-match counter-picking trivial; fewer slots mean more commitment. The tray also needs about 700 of the 756 usable px on an 844 px landscape phone.
- **Deck depth grows through the pool,** not the slots: from 13 cards per age (7 units, 4 turrets, 2 powers) to about 25-30 by Season 4.
- **Presets:** up to 5 from v1.1 (A16.9); new ones start empty.
- **Album.** The Museum (A16.22) and the Collection get album pages per set and per age. Unowned cards show as silhouettes. Completion is derived; no save field. Completing an age or a set pays a banner once (a village monument from v1.2), into `cosmetics.owned`. This generalises A15.16's age sets.
- **Deck tools** (v1.2): War Plan search; keyword, set and rarity filters.
- **No bonds.** Family bonuses of +5% would either define the meta or be invisible (one level ≈ 20 points), and they would push plans toward families instead of good answers. Synergy comes from keywords (A16.17).

---

## A16.20 People without a server (v1.1)

### Codes, Echo challenges, replay links and clips

| | |
|---|---|
| Class | Healthy. Opponents are labelled AI; nothing is paid for creating, sharing or redeeming; no "used n times" counter (red line 9); no name unless the player adds the auto name |
| Decisions | The friend has to solve your plan; you design a plan that is hard to solve |
| AI | "AI · Echo of Chief-4821": the Balanced brain playing the creator's War Plan (A15.15). No style vector: it would need per-match history the save does not keep and new `MatchStats` fields that A15.22 rejected |
| Architecture | A15.15 codes (`src/core/codes.ts`). **F3:** `matchHash` = hash of the rules slice plus only the cards in either plan (and their summon sources), with `cardHash[id]` computed at compile time; `ReplayDoc` v2 with `matchHash`; `SIM_VERSION` semver (major = any change to a golden hash; minor = an inert addition proved by unchanged goldens); versioned player builds at `/ageborn/v/<major>/` (a `pages.yml` change, requested from the lead). `src/sim/replayCodec.ts` for replay links |
| Size, phase, owners | F3 S · codes and Echo M (A15.19 v1.1-4) · replay links S · v1.1 · WP0, WP2, WP7, WP8, WP9, WP11, WP12 |
| From | DP-30; architecture F3, 5; BS 1, 3 |

- **v1 already needs one piece (XS, WP2, Phase 2b):** `replayMatch` checks the `SIM_VERSION` major, not only `contentHash`. Today a sim-only fix after release would replay old local replays wrongly, and A15.6's "Watch" buttons depend on them.
- **Payloads:** War Plan code about 66 characters; Echo challenge about 105; puzzle score about 18; replay link about 0.5-1 K characters for bot-like play, about 3 K for a very busy human.
- Poki builds use pasted text codes only; GitHub Pages builds also offer `#c=` URL fragments, which never reach the server.
- **Clips and save image:** D1 Clip Mode and A15.16, independent of codes.
- Until F3 lands, every numbers patch invalidates every stored replay, so F3 comes before any sharing ships and before Season 1.

### Emotes and quips (APPROVED)

| | |
|---|---|
| Class | Healthy offline (bots are labelled AI and keep A7.2's limits). Grey online (contact with strangers); safeguards in A16.21 |
| Architecture | `EmoteId` becomes `string`, validated against content in commands, events and `HudModel`; the sim checks the cooldown plus a per-match cap (`EconomyRules.emoteMaxPerMatch`); the session checks ownership offline, the relay online; `content/emotes.ts` (id, kind `emote` or `quip`, rarity, `visualId`, `soundId`, `textKey`, `botAllowed`); save `profile.emotes?` (the equipped 6); `ArtProvider.createEmote?`; WP8's replay schema accepts string emotes (today it hard-codes the 6 ids and would drop such replays) |
| Art | 20-30 small animated sticker rigs; quips are a speech bubble over your base. M |
| Size, phase, owners | M + art M · v1.1 · WP0, WP1, WP2, WP3, WP4, WP5, WP8, WP9 |
| From | DP-31; SV C12; BS 3 |

- **Kinds:** animated emotes, and quips: fixed one-liners in i18n. **Never free text.**
- **Tone:** only friendly or neutral quips, in every mode. No taunts, nothing about skill, looks or age. Every quip is reviewed for kindness in English and Danish. Examples: "Well played!", "That was close!", "Onward to the next age!", "My turrets salute you."
- **Rarity:** the same ladder as cards.
- **Sources:** Trophy Road nodes, feats, Conquest stars, Heat trims, puzzle sets and set completion; crafting with Dust (Common 100, Rare 300, Epic 800, Legendary 2,000); the Wardrobe Crate pool under its visible odds and pity. Never a new random source. The 6 v1 emotes stay free.
- **Equip:** 6 on the Profile.
- **In battle:** cooldown 3 s and at most 8 per side per match. A quip bubble shows for 2 s in the top-bar area and never covers the lane.
- **Mute:** a mute button on the opponent's nameplate for the match, and the existing Settings switch.
- **Bots:** each General gets 2-3 signature quips in the character of its VS line, at most once per match; replies at most once per 20 s (A7.2).

---

## A16.21 People online (the D1 server milestone and later)

| | |
|---|---|
| Class | Grey (people, possibly minors). Safeguards in "Safety for minors" below |
| Architecture | An input relay in one Cloudflare Durable Object per room (free tier; check the current limits before building). It stamps commands at tick + 4 and broadcasts them; clients simulate and compare `state.hashes` every 20 ticks. A `NetService` interface is injected into `app`, never into the sim. Anonymous device-key accounts. Cross-browser determinism is proved first: golden replays in Chromium and WebKit e2e (WebKit is not configured today). `OpponentSpec.isAI` and `HudModel.foe.isAI` change from the literal `true` to `boolean`, with A7.1 labelling logic. Verification by peer re-simulation or a scheduled GitHub Actions job (Workers' CPU limit rules out re-simulating on the server) |
| Size, phase, owners | Relay and friendlies L; friends list, friend leaderboard and spectating M; clans XL; 2v2 XL · online, later · a server WP, WP11, WP9, WP8, WP2 |
| From | DP-24, DP-32 to DP-35; SV C9, C11; BS 3 |

**Friends and friendlies.**

- Server-issued friend codes and invite links, exchanged out of band. No search. A friends list, with presence only when both friends opt in (default off).
- **Friendly battles:** unranked, no trophies, no pause or speed (D1), emotes and quips only, a Rematch button; battlefields, weather and standard levels as in Skirmish.
- **Friend leaderboard:** relative, among friends only: Daily results, puzzle stars, best Endless wave.
- **Spectating:** friends only, with a 30 s delay; clients simulate from the command stream.
- **Repeat order** (PvP has no pause): swipe up on a card (keyboard Shift + 1-5) to repeat it; at most one card at a time; the queue refills with it while gold and queue room allow. Bots have the same command (A7.1). It trickles, and trickling loses to waves, so it is a convenience with a cost.

**Ranked.**

- Every card at exactly L8 (A16.7).
- A visible **Glicko-2** rating, provisional ("1500?") until the rating deviation is below 110 (about 15-20 games). No decay; online seasons carry over (A15.17).
- **One moving rank per mode:** ranked PvP shows Glicko and no trophies; the AI ladder keeps trophies (A15.9). Owner decision O3.
- **Only human-against-human matches move Glicko.** AI Generals may fill thin queues, labelled AI (D1), but those matches never change a rating, so learning the bot cannot farm it.
- **Format:** Short War becomes the ranked default only after its A16.5 Bell rows pass; until then Standard War.
- **"Arena":** mirrored Draft War (both players get the same offers, as in Mechabellum) as a second ranked queue with no collection edge and no offer luck.

**Clans (APPROVED).**

- Joined by invite code only; at most 30 members; name from word lists; emblem from preset parts; preset messages only ("Good luck!", "Nice win!").
- **Clan level** rises from cooperative battle goals counted clan-wide ("300 wins together", "100 puzzle stars", "10 Boss Battles cleared"). No per-member numbers are shown. Levels unlock emblem parts and Clan Hall stages.
- No quotas, no per-member contribution display, no "last seen", **no deadlines**. Leaving costs nothing; kicked members keep everything; leaders cannot see member activity.
- **Reinforcements:** each member may set one standing "lend": a unit card, **never a Legendary**. It never pings anyone. In friendlies and clan raids only (never the AI ladder or ranked), a player may call one clanmate's lend once per battle. It spawns at p 20 at standard L7 with no pop, and it **pays normal bounty** to its killer, so it cannot bypass the anti-spam engine. Lending pays nothing and no lend counts are shown. Sim part S: `SideConfig.reinforcement?` (a server-signed single-use token) and a `reinforce` command through the summon path.
- **Clan raids (the owner's clan wars, made pressure-free).** The raid board shows another clan's published defences: each member's Echo code (War Plan, and fort layout once forts exist), played by "AI · Echo of <member>" at standard levels. Each member has **3 attacks per raid** (a limit, not a quota); **every attack uses a fresh seed**, so memorising inputs does not work. Stars add to a cooperative clan total. There is no race between clans, and the defending clan is never told it "lost". The raid ends when every member has used their attacks, or when the leader closes it after half the clan's attacks are used. Everyone who attacked at least once gets the raid banner; the clan gains level progress. Results are submitted as replay codes (1-3 KB) and verified by peers or a scheduled Action.

**2v2 (later).** Co-op against AI Generals and bosses first, then PvP. One lane; a shared team base with HP ×1.6; 2 mounts per player; individual gold, XP, plans and ages; pop 42 per player; **front width 3** (84 pop behind a two-wide front would stall); emotes only; bots fill empty seats, labelled AI. "Team base age = the highest on the team" invites one player going pure economy while the other defends, so a greed proxy is gated at ≤ 55%. XL: "players" must become separate from `Side` in the sim.

**Safety for minors** (every online system):

1. No free-text chat anywhere, ever. Emotes and curated quips only.
2. No contact from strangers by default: friend codes out of band, no search, no direct messages.
3. Block and report on every nameplate, the friends list and clan screens. Block also hides that player's emotes.
4. Privacy: pseudonymous auto names by default; no public "last seen"; presence only with mutual opt-in; no real-world location, camera, microphone or health data (red line 10); anonymous device-key accounts.
5. No rewards for inviting, sharing or social actions (red line 9).
6. A Danish games or consumer lawyer reviews age, consent and account rules before the online milestone (A15.1).
7. Settings > For parents gains a line for each online feature as it ships.

---

## A16.22 Home village (APPROVED direction)

| | |
|---|---|
| Class | Healthy: no timers, no collecting taps, no decay, no raids that take anything, no guilt copy, no battle power in any mode |
| Decisions | Which decorations and Wonder to show (v1.2); which fort layout to publish as your defence (online) |
| Architecture | Home (WP9) becomes a DOM layer of building hotspots over baked images from `ArtProvider.building?(o: { id; stage; age; skin?; size })`, which returns a cached data URL like `portrait()`. The UI never draws the buildings; painted art can replace procedural art later; hit areas stay accessible DOM. Idle life (smoke, flags, sparkles) is small CSS-animated layers. `meta/village.ts` `villageStages(save, content)` is pure and derives every stage from existing progress, so v0 and v1.1 need **no save field**. The Battle button is DOM and loads first (B16: Play ≤ 3 s); the village chunk loads lazily |
| Size, phase, owners | v0 M (engineering M, art M) · v1.1 stages L (mostly art) · v1.2 L · online M · WP9, WP4, WP7, WP11, WP8 |
| From | DP-36; architecture 4.14; SV C12; BS 1, 2 |

**Rules.**

- **No walking avatar.** Tapping a building opens its feature directly. A large Battle button is always visible.
- **Badges** only for things that are ready ("Open (3)" on the Vault, "Upgrade ready" on the Forge, "New" on the Museum). Never backlog counts (A15.13).
- **Buildings grow from achievements, not time served.** Home never shows "next stage at X"; progress toward the next stage is shown only inside each building, so Home does not become a wall of meters (A15.13).
- **Reconciled with A15:** the Keep *is* A15.16's Home base (same milestones) and holds the A15.16 trophy shelf; the Hall of Generals is A15.9's Conquest ladder. A15.19's item v1.1-7 is replaced by this section.

| Building | Opens | Grows with |
|---|---|---|
| Keep (your base) | Profile and the trophy shelf | A15.16 milestones: Stone for a new save, Medieval at Arena 3, Gunpowder with all cards owned, Modern at 27 Conquest stars, Future with every card at L10 |
| Arena Gate | Mode select (the Battle button stays separate) | Arenas 1-3, 4-6, 7-8 |
| Barracks | War Plan | A win in Short, Standard and Full War |
| Vault | Capsules | First Legendary; all 5 Legendaries; first Ascended form |
| Forge | Upgrades (the Collection filtered to "upgrade ready") | 10 cards at L7+; 30 cards at L7+ |
| Museum | Collection, feats and album | Collection 50%, 100% |
| Hall of Generals | Conquest | Arena 3; 9 stars; 27 stars |
| Clan Hall (online) | Clan screens | Clan level |

- **The "trickle."** No new resource and no new clock. The existing Supply allowance (A15.4) is the village's production: a supply wagon appears at the Vault **only when a Supply Capsule is ready to open**. It never fills day by day, so it is neither a "come back tomorrow" cue nor loss framing when full. Owner decision O6.
- **Base cosmetics visible to opponents:** base skins already exist in v1 (A5.8, `SideConfig.skins`). The banner on your lane base follows A15.17 ("identity in the lane").

**Phases.**

| Phase | Content | Size |
|---|---|---|
| v0: owner decision at Checkpoint C (O5) | Home laid out as the village: the Keep from the existing base visuals, 6 buildings with 1 stage each drawn procedurally from the part library in each age palette, small idle layers; the existing Home widgets stay as a thin DOM frame. Home is already built (`src/ui/screens/home/`, with its animated arena backdrop), so v0 is extra cost, not a saving. With the remaining credit shown, the owner chooses: yes lands the `ArtProvider.building?` method and the WP9 and WP4 work as one change after Checkpoint C; no makes v0 the first v1.1 art item | M |
| v1.1 | 3 growth stages per building (about 18 compositions from a shared part kit); the trophy shelf in the Keep | L (mostly art) |
| v1.2 | **Free placement** of decorations and monuments (save `village?: { placed: { id; x; y }[] }`, a migration). Decorations come from achievements (feats, set completion, puzzle sets, boss clears, Heat trims) and Dust crafting, with no new currency. **Wonders:** 5, one per age, each with 5 stages tied to achievement counts (for example "Sun Stones: a stage per 5 Conquest stars"), built over months with no timer. The chosen Wonder rises in your half of the battle backdrop skyline, seen by both sides, purely cosmetic | L |
| Online | The Clan Hall. A published **defence layout**: fort pads and War Plan inside your Echo code (about 10 more bytes), which friends and clanmates attack as "AI · Echo of you". Read-only visits to a friend's village | M |

---

## A16.23 Contract, save-schema and content-table changes by phase

A15.18's rules hold: optional fields only; fakes and the save fixture updated in the same change; meaning documented in JSDoc; one batch per phase; no stubs or hooks for unbuilt systems.

**Amendment to A15.18.** Its sentence "Nothing changes in the sim, AI, art, HUD or platform contracts in v1.1" is replaced by: "v1.1 changes contracts only for F3, battlefields and weather, emotes and quips, the village `building?` method and, if the owner approves them, doctrines and power overflow, all in the one v1.1 batch." Owner decision O10.

**Hidden costs this list includes.** WP8's `src/save/replaySchema.ts` uses `v.object`, which strips unknown keys: every new `ReplayDoc`, `SideConfig`, `MatchConfig`, `training` or `Command` field must be mirrored there, or stored replays silently lose it and desync. The same file hard-codes the emote list, the slot literals and five-age `partialPerAge`. `src/save/schema.ts` enforces loadout lengths 5 and 2, five ages per War Plan and a four-value rarity list. `src/content/schema.ts` hard-codes the v1 card counts.

### v1 Phase 2a

- Contracts, save and content: **none.**
- WP5: the wall sandbox (dev page only). WP3: A16.3. WP11: Quick Battle URL flags `&tier=` and `&mods=` (A16.25). WP12: the headless wall-turtle driver (tools only).

### v1 Phase 2b (joins A15.18's one amendment, with the pending `MatchStats.ageTimesMs` and `Observation.foe.lastEmote` requests)

- **Sim, only if A16.4 adopts them** (at most two): L3 or L4 in `movement.ts` (no contract change); L5 as `EconomyRules.siege.unitDamageTakenBp?` (default 10,000; WP1 adds it to the Valibot economy schema and `raw/economy.ts`; WP2 shim-defaults it for the frozen fixture); L6 in `clock.ts`/`win.ts` (no contract change). One `SIM_VERSION` major bump; goldens re-recorded; the tutorial beat times re-pinned, as in `docs/requests/wp2-tutorial-retime.md`.
- WP2 (no contract change): `replayMatch` checks the `SIM_VERSION` major.
- WP8 schemas: none.
- WP12: the A16.5 proxies and rows, the rules-sanity runner, Short War in the smoke run, `--patch`, the two harness hooks.
- Strings: the trickle hint (WP11) and tip (WP1, WP9).
- WP7: the peak-tier rule (A16.7).

### v1 Phase 3

- Numbers only: the adopted HP scale, the Short War clock (formats are content data), Siege lethality if adopted, the Legendary counters, Balloon Admiral, EMP Saboteur. Bounty stays 6,000 bp. No schema change.

### v1.1

| Area | Change | For |
|---|---|---|
| Contracts | `ReplayDoc` v2 with `matchHash`; the `SIM_VERSION` semver rule | F3 |
| Contracts | `ModEffect`, `ModScope` (kinds in use only); `MatchConfig.battlefield?`, `ReplayDoc.battlefield?`, `OpponentSpec.battlefield?`, `SkirmishOptions.battlefield?`; `Observation.field`, `weather`; `SimState.weather?` (hashed when non-empty); `SimEvent` `weatherChanged`; `HudModel` weather chip and bands in the clock marks; `ArtProvider.createBackdrop({ battlefield? })`, `BackdropView.setWeather?` | Battlefields and weather |
| Contracts | `EmoteId` becomes `string`; `EconomyRules.emoteMaxPerMatch`; `ArtProvider.createEmote?` | Emotes and quips |
| Contracts | `ArtProvider.building?` | Village (if not landed after Checkpoint C) |
| Contracts, if adopted | `evolve.pick?`; `Observation.me.doctrineOffer`, `foe.doctrine`; `SideState.doctrine`; `SimEvent` `doctrinePicked`; `HudModel` offer and banner; F1 kinds `vsTags`, `attackSpeed`, `baseDamage`, `popCap`, per-side `passiveGold` | Doctrines |
| Contracts, if adopted | `EconomyRules.power.chargeMaxPpm?` | Power overflow |
| Contracts | `SkirmishOptions.plan?`, `seed?`, `modifiers?`, `pact?`, `challenge?` (A15.18) | Codes, Random Armies |
| Save m[1] | `profile.emotes?`; nerf-compensation flags (existing `flags`); presets up to 5 (the schema allows it; WP9 caps at 5); plus A15's v1.1 fields | |
| WP8 replay schema | `battlefield`; string emotes; v2 with `matchHash`; `evolve.pick` if doctrines | |
| WP1 content | `battlefields.ts` and the weather table (inside `hashedSlice`); arena and General to battlefield maps; `emotes.ts`; eval coefficients; the dex `num` table and nerf-compensation table (meta, outside the hash); the keyword glossary; `doctrines.ts` if adopted (inside the hash); Daily pair entries in the `ModifierId` union (A15.16) | |
| CI | A request to the lead for versioned builds in `pages.yml` | F3 |
| Not needed | F4 scenarios (puzzles use replay prefixes); `MatchStats` style fields (cut) | |

### v1.2

| Area | Change | For |
|---|---|---|
| Contracts | F2 triggers, selectors, effects and traits beside `AbilityDef`; `Tag` + `structure`, `under`; `AttackDef.hitsUnder?`; `UnitState.burrowed?`; `UnitPose` + `burrowed`; `ClipName` + build, crumble, burrow, surface; `Observation.units[].burrowed?` and fort state | Keywords, forts, underground |
| Contracts | `Loadout.structures?`; command `place`; F5 `Command.slot: number` and `EconomyRules.loadoutSlots`; `EconomyRules.fort`; `HudModel` Fort card | Forts, slots |
| Contracts | `SkinRarity` + `mythic`; `SideConfig.foils?`; `ArtProvider.createUnit` + `foil?` | Ascended forms, Holo |
| Contracts | `SideConfig.mods?` (boss); `TrainingEvent.spawn?`; `MatchOutcome.reason` + `waveCap`; `MatchResultInput.mode` + `puzzle`, `boss`, `horde`, `draft`, `gauntlet`; a session that starts from a replay tick (A15.18) | Modes, puzzles |
| Contracts | `num`, `set`, `family`, `retired?` on card defs; `AgeId` + `bronze` (Season 3) | Sets |
| Save m[2] | Loadout lengths and `structures` (migration); `pity.sinceMythic` and the skin-rarity picklist; `puzzles?`; `village?`; `bosses?`, `horde?`; plus A15's `gauntlet?`, `expedition?`, `relics?`. Season 3: `AGE_IDS`, a `bronze` loadout in every War Plan, `partialPerAge` in the replay schema | |
| WP1 content | Per-set count rules replace the hard counts; `keywords.ts` with `budgetBp`; bosses and horde tables; a structure-aware counters generator; `puzzles.ts` (outside the hash) | |

### Online

- `OpponentSpec.isAI` and `HudModel.foe.isAI` become `boolean`, with A7.1 labelling logic.
- `NetService` (app only); a cloud `SaveStore`; the `reinforce` command and `SideConfig.reinforcement?`; `MatchResultInput.mode` + `friendly`, `ranked`, `raid`.
- WebKit golden e2e before any relay work.

---

## A16.24 Build plan

### v1

Every item is S or smaller and adds no screen, mode or currency. Cut from the bottom if time runs short.

| # | Item | Section | Size | Phase | Owners | Request file |
|---|---|---|---|---|---|---|
| 1 | Bot fixes: save for a counter, evolve on time, smooth answer to one-type armies, score unaffordable counters, no Legendary saving goal while the gate fails | A16.3 | S | Now, landing in the Phase 1 integration pass (before Phase 2a) | WP3 | `wp3-depth-answers.md` |
| 2 | Quick Battle flags `&tier=` and `&mods=` | A16.25 | XS | Phase 2a | WP11 | `wp11-depth-session.md` |
| 3 | Wall sandbox prototype | A16.14 | S | Phase 2a, before Checkpoint A | WP5 | `wp5-wall-sandbox.md` |
| 4 | Proxies, A2.14 rows, rules-sanity runner, `--patch`, harness hooks, Short War in smoke, headless wall-turtle number | A16.5, A16.4, A16.14 | S | Phase 2a (wall number) and Phase 2b start | WP12 | `wp12-depth-proxies.md` |
| 5 | Stalemate levers: measure, then adopt at most two sim changes | A16.4 | S + S per change | Phase 2b, first week | WP2, WP12, lead | `wp2-depth-sim.md` |
| 6 | `SIM_VERSION` major check in `replayMatch` | A16.20 | XS | Phase 2b | WP2 | `wp2-depth-sim.md` |
| 7 | Teach the wave: detector, hint, loss tip | A16.6 | XS | Phase 2b | WP11, WP9, WP1 | `wp11-depth-session.md` |
| 8 | Peak tier at even levels | A16.7 | XS | Phase 2b | WP7 | added to A15's `wp7-engagement-rules.md` |
| 9 | Numbers: HP scale, Short War clock, Legendary counters, Balloon Admiral, EMP Saboteur | A16.4 | numbers | Phase 3 | tuning agent | none |

**How to land it (orchestrator).**

1. Write the WP3 request now, while Phase 1 is still editing the bot.
2. Merge A16 into DESIGN with these edits: A2.7 (the adopted front rule, after A16.4), A2.10 (clock, if changed), A2.14 (A16.5 rows), A3 (presets note for v1.1), A5.8 (Holo, v1.2 text), A6.8 (ranked "sets L8"), A7.2 and A7.3 (A16.3), A8 (trickle hint), A15.9 (peak tier), A15.18 (the amendment line), A15.19 (item v1.1-7 replaced by A16.22; the unified order below), B12 (proxies and tools), C3 (the fun-gate tasks), D1 (Mythic tier as Ascended forms; weekly kaiju dropped).
3. Record in `docs/decisions.md`: bounty stays 60% as the spam-stall dial; the tools we do not add (A16.2); the adopted stalemate levers with their numbers.
4. Update `ageborn-phase2-battle` with the wall sandbox and the URL flags, `ageborn-phase2-loop` with items 4-8, and `ageborn-phase3-polish` with item 9 and the Bell release rule (A16.5).
5. Keep the proposal and both reviews as design history. Add no stubs or hooks for later systems.

### After v1: one ranked wishlist (merges A15.19)

A15.19's own items keep their relative order; A16 items slot in. Systems that renew from seeds come first (A15 rule 9). Each line is a separate funded step. v1.1 as a whole is L to XL: its art alone (battlefield props for 8 arenas, 4 weather overlays, 20-30 emote rigs, village stages, glyphs) is roughly 60-110 agent hours, and every new string is written in English and Danish.

| Order | Item | Section | Size | Needs |
|---|---|---|---|---|
| v1.1-1 | Danish text | D1 | M | |
| v1.1-2 | Foil crafting and Amber to Dust, if not in v1 | A15.11 | S | |
| v1.1-3 | Any A16.5 Bell row that missed its v1 gate | A16.4, A16.5 | S-M | |
| v1.1-4 | Chrono Heat | A15.14 | M | |
| v1.1-5 | F3, then share codes and Echo challenges; replay links | A16.20, A15.15 | S + M + S | |
| v1.1-6 | Battlefields and weather, reveal-then-pick, 5 presets, F1-lite, `sim:combos` | A16.8, A16.9 | M + art M | F3 |
| v1.1-7 | Card stars and the Codex extension | A15.14 | M | Heat |
| v1.1-8 | Daily pairs, welcome card, Skirmish presets (Blitz, Random Armies), age sets | A15.16, A16.12 | S | |
| v1.1-9 | Village v0 (if not after Checkpoint C), then 3 stages and the trophy shelf | A16.22 | M, then L | |
| v1.1-10 | Emotes and quips | A16.20 | M + art M | |
| v1.1-11 | Review: graph, key moments, lever notes | A16.16 | M | D1 seek bar |
| v1.1-12 | Keyword glossary; dex numbers; nerf compensation (before the first patch) | A16.17, A16.19 | S | |
| v1.1-13 | Exploit search; bot wave play for tiers VIII+ | A16.8, A16.3 | S, S | |
| v1.1-14 | Rival, feats to 30, save image with Clip Mode | A15.15, A15.16 | S, S, M | |
| v1.1-15 | Evolve doctrines, **if the owner says yes** | A16.10 | M | Battlefields |
| v1.1-16 | Power ring overflow, headless first | A16.11 | S | |
| v1.2-1 | Battle resume, then Battle Puzzles | A15.17, A16.16 | M, then M | |
| v1.2-2 | Gauntlet and Draft War (Banner Group) | A15.17, A16.12 | M-L | |
| v1.2-3 | F2 keyword engine, layer refactor, F5 slots, per-set rules, sets | A16.15, A16.17, A16.19 | L | |
| v1.2-4 | Season 1: forts (if they passed), tunnelers, detectors; plan-meta search | A16.14, A16.15, A16.17 | L+ | v1.2-3 |
| v1.2-5 | Ascended forms and Holo in the lane | A16.18 | M + art | |
| v1.2-6 | Rift Expedition | A15.17 | L | |
| v1.2-7 | Boss Battles, Endless Horde | A16.12 | M, M | F1, F2 |
| v1.2-8 | Guest Generals, identity in the lane | A15.17 | M, M | |
| v1.2-9 | Village free placement and Wonders; Review "What if" | A16.22, A16.16 | L, M | Resume |
| Seasons 2-5 | Content seasons | A16.17 | L each | F3, F2 |
| Online-1 | Relay, friendlies, friends, spectating, ranked (Glicko, L8, Arena), Repeat order | A16.21 | L + M | WebKit goldens |
| Online-2 | A15.17 online items (seasons with carry-over, Daily leaderboards, Warbands) | A15.17 | L | Online-1 |
| Online-3 | Clans, reinforcements, clan raids | A16.21 | XL | Online-1 |
| Later | 2v2; commanders; the Twin Fronts experiment if triggered | A16.21, A16.12, A16.13 | XL each | |

---

## A16.25 Checkpoint A: the fun gate

The owner plays the battle slice (C3). The orchestrator gives exact steps in Danish, including the full links with the URL flags, and reports the `sim:exploits` smoke numbers and the headless wall-turtle number next to the owner's answers. Five tasks, about 1 hour in all:

| # | Task for the owner | Questions | If yes | If no |
|---|---|---|---|---|
| 1 | Play 5 Short Wars in Quick Battle, at least one on the phone in landscape | Does the battle feel good? Did any match drag at the end or stop at the Final Bell? Is Short War the right length? Is the phone tray comfortable? | Continue to Phase 2b | Feel and rules first (C3). Stalls weigh the A16.4 levers; length sets the Phase 3 clock; a tight tray moves fort placement to a long-press on the lane |
| 2 | Two matches at `&tier=7`: one pressing only the cheapest unit, one reacting to the bot and saving gold for waves | Does thinking beat spamming? Did saving gold and sending a wave feel like a real choice? | A16.3 confirmed; the wave hint stays as planned | WP3 fixes first, before Phase 2b ends; the hint becomes more visible |
| 3 | One match at `&tier=7&mods=glass_armies` (units have 30% less HP) | Better or worse when units die faster? | The HP lever (L1) may be adopted | L1 is excluded from A16.4 |
| 4 | 10 minutes in the wall sandbox: place walls for both sides, then push a Tuskback into a palisade with Pebblers behind it | Fun, or turtle-y and dull? Fixed spots or free placement? | Forts go on (A16.14 go or no-go, with the headless number) | Forts are parked; the underground scope is re-confirmed later |
| 5 | Two spoken questions and one look | Does the lane feel deep, or like "one blob pushing"? Would choosing one of two bonuses when you evolve be welcome? Looking at the 3D sprite GIF next to today's units: which style should future cards use? | Keep one lane; doctrines join the v1.1 list; the art tier sets the cost per card | Start the one-lane revisit (A16.13); doctrines wait for v1.2 or never; the art stays procedural |

---

## A16.26 Owner decisions

The orchestrator asks these in Danish, each with the recommendation.

| # | Question | Recommendation | When |
|---|---|---|---|
| O1 | 150+ cards needs about five funded content seasons (about 15 months after v1). Accept "seeds first in v1.1, then seasons as funding allows"? | Yes | Now |
| O2 | The new top rarity: cosmetic Ascended forms of Legendaries (same stats, big walkout), or a Mythic card with its own power? | Ascended forms | Before v1.2 |
| O3 | Online ranked shows a chess-style rating and no trophies, and the AI ladder keeps trophies, so each mode has one rank that moves? | Yes | Before online |
| O4 | No queue limits or unit cooldowns against spam; the data shows they hurt the answer more than the spam | Agree | Now |
| O5 | Village v0 right after Checkpoint C (with the remaining credit shown), or as the first v1.1 art item? | Decide at Checkpoint C | Checkpoint C |
| O6 | The village "trickle" is the existing Supply Capsule, shown as a wagon only when one is ready | Yes | Now |
| O7 | Clan wars as cooperative raids with no deadline and no race between clans | Yes | Before online |
| O8 | "AI · Echo of Chief-4821" instead of "ghost" in the game's text | Yes | Now |
| O9 | Evolve doctrines only if you want them after playing (fun-gate task 5, and again after battlefields) | Yes | Checkpoint A, v1.1 |
| O10 | v1.1 may change the battle engine for battlefields and weather, and the shared interfaces for share links, emotes and the village (amends A15.18) | Yes | Now |
| O11 | Commanders are put off until doctrines prove out | Yes | Now |
| O12 | Bridge and Ford keep their rules only if they do not cause more stalemates; otherwise the Bridge becomes a fast causeway and the Ford is replaced | Yes | Now |

---

## A16.27 Review resolution

Every point of both reviews, with its verdict. "Accepted" means applied as written; "Changed" means applied in a modified form, with the reason; "Rejected" gives the reason.

### Strategy-veteran review (SV)

| Point | Verdict | Where, and why |
|---|---|---|
| C1 The expert meta (waves into a defence) reaches the Bell, and the fix is untested | Accepted | A16.4 measures seven levers on the stall rows before anything is built |
| C1.1 Measure and gate the Save-and-counter mirror and Save-and-counter vs Turtle | Changed | Rows added and reported in v1, gated from v1.1 (A16.5): Phase 3 is numbers-only, so a v1 gate no known lever reaches would block release (BS 2) |
| C1.2 Whole-match lethality as the main lever, put to the owner as a feel question | Accepted | Lever L1; fun-gate task 3 |
| C1.3 Test a three-wide front | Accepted | Lever L4, beside L3 (WP2's third-rank request, the same stall cause) |
| C1.4 Fix Short War's clock | Changed | The numbers version (Overdrive 3:00, Siege 3:45, Bell 5:00) is lever L2 for Phase 3. "Overdrive once both sides reach the final age" is a rule change and waits until the numbers version is measured |
| C1.5 Keep the rope as the Bell tie-breaker | Changed | Lever L6, adopted only under A16.4's rule: it cut the turtle to 21-27%, below the owner's 35-45% band |
| C1.6 Report the turret share instead of gating it; reconsider "build turrets" | Accepted | A16.5; A16.3 rule 5 |
| C2 problem 1: break time does not grow with the attack | Accepted | Contact rule; wall HP 1 × Heavy (A16.14) |
| C2 problem 2: an instant stop button | Accepted | 5 s scaffold and 120 lu legality |
| C2 problem 3: outside pop | Accepted | 6 pop per fort |
| C2 problem 4: walls count 0 in D | Accepted | Walls count 2 × cost in D; answers through `aiHint.vsStructure` |
| C2 Wall bounty 60% | Accepted | A16.14 |
| C2 Headless wall-turtle number at Checkpoint A | Accepted | WP12 driver with emulated recharge, legality and cost. Pop, scaffold and contact cannot be emulated without sim code, so the number is a worst case with a burden-of-proof rule |
| C2 Traps are a rule of thumb; Stasis Mine plus a power is a sure combo | Changed | Traps stay as cheap variety under their own gates; no trap stuns, so the combo cannot exist |
| C3.1 Stacking budget | Changed | Additive, ±20%, range +15% (A16.1). Instead of deriving zone positions from the turret cap, no unit inside its own turret cover gets a range bonus: base ranges (up to 480) already cross mid-lane, and the rule targets out-ranging from safety directly |
| C3.2 Combination sweep in CI | Accepted | `sim:combos` (A16.8) |
| C3.3 Exploit search | Accepted | `tools/exploitSearch.ts` (A16.8), v1.1 |
| C4 Picks solvable before the match | Accepted | Pool rebuilt around the enemy's composition, weather and phase (A16.10) |
| C4 Fake train-time costs | Accepted | Costs in gold, pop, damage or damage taken only |
| C4 Plunder, Engineers | Accepted | Both cut |
| C4 Circular "pick matters" gate | Accepted | Pick-flip in ≥ 30% of sampled states |
| C4 Show the next offer from the start of the age | Accepted | A16.10 |
| C4 Wide Line as a formation doctrine | Accepted | A16.10 |
| C4 "+X while behind in age" | Rejected | Needs a new condition kind; the reactive pool already makes picks depend on the match |
| C5 Own-half features reward defence | Accepted | Cover dropped; the Ridge is central; Trenches sit on the approach (A16.9) |
| C5 Bridge and Ford at mid-lane tighten stalls | Accepted | Measured before any art, with fallbacks (O12) |
| C5 One fixed map per arena | Accepted | Ladder battlefields drawn by seed from every unlocked arena |
| C5 Whose units a zone helps | Accepted | Zones are in own progress and help only that side's units (A16.8) |
| C5 Keep the weather schedule | Accepted | A16.9 |
| C6 The mono gate can be passed at 55% | Accepted | A smooth answer rule (A16.3 rule 3) and the mono family gated at its worst mix |
| C6 Bait-and-switch | Accepted | Proxy gated ≤ 35% in v1, ≤ 25% from v1.1 |
| C6 The skill-gap gate can be met by weakening low tiers | Accepted | Bot tier gaps report-only; the rules-only skill gradient is gated |
| C6 Tiers VIII+ must play the wave game | Accepted | v1.1, AI only (A16.3) |
| C6 Standoff gates for power overflow | Accepted | Adoption conditions in A16.11 |
| C7 Keyword value is not costed | Accepted | `budgetBp` per keyword (A16.17) |
| C7 Plan-meta search | Accepted | `tools/metaSearch.ts`, gated from v1.2 |
| C7 Answers locked behind rarity | Accepted | Has-a-starter-answer |
| C7 Mythic as a cosmetic Ascended form | Accepted | The recommendation in O2 (A16.18) |
| C7 Cut bonds | Accepted | A16.19 |
| C7 No sixth slot, for coverage reasons | Accepted | A16.19 |
| C7 Refund nerfed cards in Dust | Changed | Dust value of the copies spent, levels kept, no time limit: nothing earned is taken away and no deadline is created (A16.17) |
| C8 Cut the movable hold line | Accepted | A16.13 |
| C8 Defer commanders; no Twin Orders; summons pay bounty | Accepted | A16.12 |
| C8 Repeat order is fine | Accepted | Online, where there is no pause (A16.21) |
| C8 Hard cap on controls | Accepted | The v1 HUD is the ceiling, plus at most the Fort button (A16.1) |
| C9 Mirrored Draft War for ranked | Accepted | The "Arena" ranked queue (A16.21) |
| C9 AI fills must not move Glicko | Accepted | A16.21 |
| C9 Short War not the ranked default until its Bell rows pass | Accepted | A16.21 |
| C9 An honest offline skill number | Changed | Peak tier counts only wins where the player is at most 1 level above the opponent, rather than a separate track that would be a second number (A16.7) |
| C10 Puzzle tolerance test | Accepted | ±400 ms (A16.16) |
| C10 Counterfactual re-simulation; say the evaluation comes from AI games | Accepted | "What if" (v1.2); the graph note |
| C10 Review marks effects, not causes | Accepted | Lever notes attached to each key moment |
| C11 Raids become memorisation and a race of hours | Accepted | Fresh seed per attack, 3 attacks per member, cooperative total, no race (A16.21) |
| C11 No Legendary lends; lends pay bounty | Accepted | A16.21 |
| C11 2v2 front width and a greed proxy | Accepted | Front width 3; greed proxy ≤ 55% |
| C12 Supply wagon filling daily | Accepted | Shown only when a Supply Capsule is ready (A16.22) |
| C12 "Next stage at X" on Home | Accepted | Shown only inside each building |
| C12 Two moving ranks online | Accepted | One rank per mode, as owner decision O3 |
| C12 Taunt quips | Changed | Friendly or neutral quips only, in every mode, not only PvP: one rule is simpler to review |
| C12 "The rarest object in the game" | Accepted | Framing dropped (A16.18) |
| Keep as written (DP-1, DP-2, DP-4, DP-5, DP-6, DP-9, DP-10, Random Armies, Echo codes, the layer refactor, DP-11, DP-26 funding) | Accepted, two changed | DP-5 moves to a v1.1 experiment (BS 2); DP-11 is already done in code (BS 1) |
| v1 slice changes 1-5 | Accepted | A16.4, A16.5, A16.14, A16.17 |
| v1 slice change 6: village to v1.1 | Changed | The owner asked for v1-lite, so it becomes an owner decision at Checkpoint C with the credit shown (O5) |
| "Can one lane last for years?" (four conditions) | Accepted | Used as the measured one-lane revisit trigger (A16.13) |

### Builder-scope review (BS)

| Point | Verdict | Where, and why |
|---|---|---|
| 0 Verdict: trim the slice, fix sizes, resolve A15.18, list the breaking changes, fewer owner questions | Accepted | A16.23-A16.25 |
| 1 DP-11 already fixed | Accepted | Dropped (A16.8) |
| 1 DP-2 extends existing tools; pin the cadence | Accepted | 0.5 s pinned; audit numbers re-baselined (A16.5) |
| 1 DP-1 bugs are spec-conformance bugs | Accepted | A16.3 |
| 1 `standardLevels` arrives with A15.18 | Accepted | A16.7 |
| 1 The layer refactor is 53 lines in 14 files | Accepted | S-M (A16.15) |
| 1 Home is already built | Accepted | The village is extra cost (A16.22) |
| 1 `replayMatch` ignores `SIM_VERSION` | Accepted | XS major check in v1 (A16.20) |
| 1 A hidden palisade in shipped content breaks integrity tests | Accepted | Dev-page content clone (A16.14) |
| 2.1 Bot fixes on the critical path; measure turret rule | Accepted | A16.3; turret rule not adopted |
| 2.2 Siege field only if the harness supports it; cut the Overdrive field | Accepted | Lever L5; the Overdrive field is not built |
| 2.3 Fewer v1 gates | Changed | The Bell rows are reported or relaxed, with a release rule. Mono and bait-and-switch stay gated at 35%, near the measured fixed-bot value, because the smooth answer rule ships in v1 and needs a guard against tuning to the test (SV C6) |
| 2.4 Wall prototype on the dev page only | Accepted | A16.14 |
| 2.5 Drop DP-11 | Accepted | |
| 2.6 The trickle lesson reaches only onboarding | Accepted | The trickle loss tip ships even if A15.12 is cut (A16.6) |
| 2.7 Power overflow out of v1 | Accepted | A16.11 |
| 2.8 Keyword chips out of v1 | Accepted | v1.1, 10 shared keywords (A16.17) |
| 2.9 Standard-level rule | Accepted | A16.7 |
| 2.10a Village v0 out of Phase 2b; ask the owner at Checkpoint C | Accepted | O5 |
| 2.10b Daily pairs out of v1 | Accepted | Stay A15.16 in v1.1 |
| 2 Three request files | Changed | Five, plus one line in A15's WP7 request: WP2 needs the version check and the lever branches, WP11 the URL flags and the hint |
| 3 Replay schema strips unknown keys | Accepted | A16.23 |
| 3 Save schema needs migrations | Accepted | A16.23 |
| 3 Cut the style vector | Accepted | A16.20 |
| 3 Presets up to 5, created empty | Accepted | A16.9 |
| 3 Content schema counts are a prerequisite | Accepted | A16.17 |
| 3 New gameplay tables inside `hashedSlice` | Accepted | A16.8 |
| 3 F1 touches every hot path | Accepted | F1-lite with only the kinds in use; phone budget re-measured |
| 3 Doctrine kinds F1 lacks | Accepted | Pool restricted; the few extra kinds listed |
| 3 Living units when a doctrine changes | Accepted | Doctrines never change max HP; all effects read live |
| 3 Full forts are L+ | Accepted | A16.14 |
| 3 Every AI axis re-passes tier ordering; the counter matrix cannot value walls | Accepted | A16.9, A16.10, A16.14 |
| 3 `isAI` literal types, new modes, `waveCap` | Accepted | A16.23 |
| 3 Art 60-110 hours; v1.1 is L-XL; v1.2 is several sessions | Accepted | A16.24 |
| 4 A15.18 says no sim change in v1.1 | Accepted | An explicit, narrow amendment (O10) |
| 4 v1.1 order | Changed | Danish, then A15's no-sim items and F3 before sharing, as advised; battlefields come before card stars because the owner approved them and they are seen in every match |
| 4 Puzzles from replay prefixes, after battle resume; the solver bot is new work | Accepted | A16.16 |
| 4 Merge only the v1 slice into DESIGN | Changed | A16 merges whole but is written compactly, with a merge note naming what v1 builders read; the proposal and reviews stay in history |
| 4 One doctrine pick flow | Accepted | Pick then evolve |
| 4 The one-lane trigger needs proxies that do not exist | Accepted | Owner feel in v1; a measured trigger from v1.1 (A16.13) |
| 4 Underground without forts | Accepted | Re-confirmed with the owner, since it is approved (A16.15) |
| 4 Cosmetic top tier | Accepted | O2 |
| 4 Quick Battle is hard-wired to tier III | Accepted | `&tier=` flag |
| 5 Wall recipe | Accepted | A16.14 |
| 5 `--patch` for data-only experiments | Accepted | A16.4 |
| 5 Five owner questions | Changed | Five tasks; one replaces the headless-only power question with SV's "units die faster" feel test, which costs nothing |
| 6 Contract list by phase | Accepted | A16.23 |

---

## A16.28 Rejected ideas

| Idea | Source | Why not | Instead |
|---|---|---|---|
| Per-card recharge on units, queue caps, an evolve price, a longer Ascension | Owner direction 3 | Audit V2, V3 and V9: they throttle the answer more than the spam, or add stalls | Trades, bot fixes, strict proxies |
| Kill bounty 45% or 75% | Audit | Spam wins, or Bells rise | 60% |
| A movable hold line | DP-7 | A per-map constant, another turtle tool and another control | Charge and Hold as today |
| A formation toggle | Owner direction 5 | More clicking than deciding | Wide Line doctrine, third-rank fix |
| Own-half Cover and high ground | DP-12 | Rewards holding, so both sides turtle | Central Ridge, forward Trenches |
| Bonds (card-family bonuses) | DP-15 | Meta-defining or invisible; pushes plans toward families | Keyword interactions |
| Plunder and Engineers doctrines; train-time costs | DP-14 | Turtle engines; fake costs | The A16.10 pool |
| Commanders now; Twin Orders; summons without bounty; instant gold | DP-16 | Largest axis, least need; click speed; bypasses anti-spam | Deferred with fixes |
| "Build turrets toward max" bot rule | DP-1 rule 4 | Turrets plus the push gate cause stalls | Turret share report-only |
| Gating bot tier gaps | DP-2 | Met by weakening low tiers | Rules-only skill gradient |
| `overdrive.unitDamageTakenBp` | DP-3 | No evidence | Levers L1-L6, measured |
| Power overflow in v1 | DP-5 | Evidence inside the noise band; 4 WPs | v1.1 experiment |
| Keyword chips and 25 glyphs in v1 | DP-25 | Cost in a full phase; most "keywords" are single-card text | 10 shared keywords in v1.1 |
| Daily modifier pairs in v1 | DP-36 stretch | `ModifierId` is a typed union; 15 smoke runs | A15.16 in v1.1 |
| Village v0 in Phase 2b | DP-36 | Home is already built; M art; A15.13 | Owner decision at Checkpoint C |
| Instant walls, walls outside pop, walls at 2 × Heavy HP, walls ignored by the bot | DP-19 | Turtle engine and wave killer | Scaffold, pop, contact rule, 1 × HP, walls in D |
| Stunning traps | DP-19 | A trap plus a power telegraph is a sure hit | Damage and slow only |
| Hidden traps, night, fog of war | Owner direction 4 | A7.1 same information; per-side views are L | Visible traps and telegraphs |
| A sixth tray slot | Owner direction 2 | More coverage means less commitment; phone width | Fort slot, presets, a bigger pool |
| A Mythic card tier with its own power | DP-28 | Gives lucky or long-playing players options others lack; a random reward that affects play for minors | Ascended forms (O2) |
| Marketing a Holo Mythic as "the rarest object in the game" | DP-29 | Invites status chasing | Plain odds |
| A style vector for Echo | DP-30 | Needs saved history and new `MatchStats` fields A15.22 rejected | Balanced brain plus the plan |
| F4 scenarios for mined puzzles | DP-22 | Loses projectiles, statuses, timers and RNG state | Replay-prefix start |
| Taunting quips | DP-31 | Strangers may be minors | Friendly or neutral lines only |
| Timed clan wars, attack quotas, a race between clans | Clash of Clans; DP-33 | Obligation and deadline pressure (red lines 11-12) | Cooperative raids |
| Rewards for lending reinforcements; Legendary lends | Clash of Clans; DP-33 | Farming, pressure; free Legendaries | Lends pay nothing; no Legendaries |
| A Glicko rating next to trophies in the same mode | DP-24 | Two moving ranks (A15.9) | One rank per mode (O3) |
| AI-filled matches moving a rating | D1 | Learning the bot farms rating | Only human matches move Glicko |
| Ranked at players' own levels | Clash Royale L16 | Levels beat skill | Standard L8 |
| A resource trickle on a clock; a wagon that fills daily | Owner direction 7; DP-36 | A15 rules 1 and 8; a "come back" cue and loss framing | Wagon shown only when a Supply Capsule is ready |
| "Next stage at X" meters on Home | DP-36 | A collage of meters (A15.13) | Progress inside each building |
| A curated rotating format; time-limited modes; offline monthly seasons | Hearthstone Twist; A15.22 | Cost; expiry | Seeded rotation; permanent modes |
| Holo odds boosts or a foil pity | A15.22 | Changes the exact roll | Crafting |
| Direct unit control | Stick War | Click speed | Doctrines, forts |
| Hero units in the lane at launch | Owner direction 1 | Largest art cost | Deferred with commanders |
| Two lanes in v1 | Owner direction 5 | Decided against with the owner | Revisit trigger and the Twin Fronts experiment |
| Stake or bet verbs | Marvel Snap | Grey for minors | Heat (A15.14) |
| In-session double-point streaks | lichess Arena | Rewards "one more" | none |
