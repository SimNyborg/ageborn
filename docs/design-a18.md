# A18. Harder, longer, deeper: pacing, ages, upgrades, difficulty, campaign and the road to online

**Status.** Design, written 2026-09-28 from the owner's playtest feedback of the same day and the owner directions in `docs/decisions.md` (2026-09-28 evening and late). It replaces the proposal in `docs/design-history/a18-proposal.md` and resolves both reviews of it (A18.15). Inputs: `docs/research/a18-classics.md`, `docs/research/a18-upgrades-pacing.md`, `docs/research/a18-campaign-online.md`, DESIGN A1-A16 and A17 (`docs/design-lane-ages.md`). Nothing here is built. Once the owner has answered A18.16, this section wins over A1-A17 where they differ; A18.14 lists the edits.

**Builds on work in flight.** Another agent is making Home and the meta visible from match 1, adding the difficulty picker (Easy, Normal, Hard, Expert, Legendary; `content.generals.difficulty`, Quick Battle and Skirmish tiers II, IV, VI, VIII, X) and making the AI stronger. A18 does not redesign those. It says how the War Path and the War Council use them (A18.6, A18.7).

**Hard rules kept.** No real money, no energy, no lives, no timers. Bots are labelled AI everywhere (A7.1). The sim stays integer, seeded and deterministic; every new number is content data. Art goes through the ArtProvider and the visual manifest; the sim owns all timing. The name of the classic Flash game is never used.

---

### A18.1 The owner's points and where each is answered

| Owner point (2026-09-28) | Root cause (measured) | Answer | Section |
|---|---|---|---|
| "Too easy", "single player needs difficulty levels" | Tier II-V AI loses to a human-like script 88-100% | The picker (in flight), a War Path difficulty that stays meaningful in every region, AI research and stance use, a "few soldiers" proxy that must lose | A18.6 |
| "You win by just spawning a few soldiers" | The AI does not punish a thin army | Normal and up push when their army is ≥ 1.5× yours; `few_then_evolve` wins ≤ 10% vs Normal | A18.6, A18.12 |
| "You evolve far too fast", "you climb very quickly" | Middle ages last 31-37 s; kill XP snowballs for the winner | XP by position in the match, less kill XP, more passive XP; 60-125 s per age | A18.3 |
| "Matches finish too fast" | Endings follow lane combat; nothing to spend on besides units | Longer clocks, plus the War Council, plus a stronger AI | A18.3, A18.5 |
| "Too few ages, many missing" | 8 ages | 13 ages as the target; presentation themes now; new ages after the realistic art pipeline is proven | A18.8 |
| "Upgrades with money are boring; troops, abilities, turret range, money generation" | Treasury and mounts are linear buy-once numbers | The **War Council**: four tracks of 1-of-2 picks that differ in kind, visible to both sides | A18.5 |
| "Maybe add the hold/attack option" | Stance exists but is hidden until match 4 | Visible from match 1 now; then three stances and a Hold flag | A18.4 |
| "A level map like Candy Crush ... cool opponents" | Conquest is 9 matches | The **War Path**: one region per age, 10 levels each, short windows, objective variety, boss Generals | A18.7 |
| "Online multiplayer is the final goal" | Spike only (`server/`) | Milestones M0-M8; M1 now, M2 after the War Path | A18.10 |
| Earlier wishes: forts, underground, air, six troops, collection, lane features, clans, village, beautiful art | Partly designed in A16 | Scheduled in A18.9 and A18.13 | A18.9 |

**Design stance.** Longer matches are good only if every extra minute holds a decision. Slower XP alone removes ages from a match (Full War 8:48 today, 8:39 at 1.5× thresholds) and adds Final Bells. So pacing (A18.3) and the War Council (A18.5) ship together, never pacing alone.

**Pillar 2 (owner decision D1).** A1 Pillar 2 and A16.2 say "evolving is the best moment; keep it fast". A18 keeps every evolve a big moment (the A12 show, a new tray, new research ranks, a doctrine pick later, and a new mechanic in every new age, A18.8.3) but makes evolves rarer, and gives every age a middle.

---

### A18.2 Principles and budgets

1. **A decision in every minute.** In the middle of an age a player has at least: spawn choices, one research about every 60-90 s, a stance or flag choice, and an Age Power cast. If playtests show standoffs, the Supply Cache (A18.3.5) adds a timed objective.
2. **Research is never retroactive.** A finished pick applies to units spawned after it completes; units already on the lane keep their stats. The completion shimmer on existing units is visual only and marks the timing.
3. **Picks differ in kind.** Two picks of a pair never differ only in size (+10% damage vs +12% HP). One answers swarms, the other Heavies; one pays in quiet games, the other in busy ones.
4. **Hard stacking caps** (all sources summed in bp: research, doctrines, relics, modifiers, weather, auras): damage dealt ≤ +35%; damage taken ≥ −35% (a floor: no unit ever takes less than 65% of a hit); max HP ≤ +30%; attack speed ≤ +25%; move speed ≤ +20% (forced march and slows apply after); unit range ≤ +60 lu; turret range hard cap **560 lu** from the own gate. The A16.1 budget (±20% additive, range +15%) still limits doctrines, weather and modifiers among themselves.
5. **Disclosed modifiers are allowed; hidden ones never.** Difficulty changes behaviour, not stats. The only stat differences between sides are disclosed on the node and the VS screen (boss base HP, extra turret, The Warden's L9 Legendaries, relics in single player).
6. **The winner is not paid twice.** Kill XP and base-damage XP are cut; bounty is cut; the side behind gets cheaper research.
7. **Content is data.** Every pick, threshold, clock, level, objective and boss rule is a table in `src/content`. The only new sim code is listed in A18.11.

---

### A18.3 Pacing: longer ages, longer matches

#### A18.3.1 What an age should feel like

| Beat | Length | What happens |
|---|---|---|
| Arrival | 15-20 s | New tray, Vanguard pair, new units march out, the next research rank may open |
| Middle | 40-60 s | One research, the first fight with the new troops, one Age Power cast |
| Push | 20-35 s | Saving for the evolve, timing it against the enemy's research ring and power ring |

| Position in the match's age window | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th (final) |
|---|---|---|---|---|---|---|---|
| Target median stay (Balanced mirror) | 60-75 s | 90-105 s | 95-110 s | 100-115 s | 105-120 s | 110-125 s | to the end |
| Today (tier V mirror, Full War) | 72 s | 55 s | 50 s | 31 s | 35 s | 50 s | 49 s |

The first age stays shortest, so a new player sees the first evolve by about 1:10. No age after the first may have a median stay under 75 s.

#### A18.3.2 XP rules (replace the A2.4 source table and the A17.8 thresholds)

| XP source | Today | A18 |
|---|---|---|
| Passive trickle | 4 XP/s | **5 XP/s** (×2 in Overdrive and Siege, unchanged) |
| Kill by a unit, turret or unit ability | 100% of the victim's card cost | **70%** |
| Losing your own unit (not summons) | 40% | **50%** |
| Damage to the enemy base | 12 XP per 1% of its max HP | **8 XP per 1%** |
| Kills by powers or Last Stand | 0 | 0 |
| Underdog bonus | +50% | +50% |

**Thresholds follow the position in the window, not the age.** Every card costs the same in every age (A2.3), so XP income does not depend on the age. `FormatDef.xpToNextOverride` holds them per format:

| Evolve out of the window's | 1st age | 2nd | 3rd | 4th | 5th | 6th |
|---|---|---|---|---|---|---|
| XP needed | **700** | **1,250** | **1,350** | **1,450** | **1,550** | **1,650** |
| Expected rate (XP/s, active play) | ~10 | ~12.5 | ~13 | ~13 | ~13.5 | ~13.5 |
| Expected stay | ~70 s | ~100 s | ~104 s | ~111 s | ~115 s | ~122 s |

- These are starting values between the measured `x15kc` and `x15p` patches, with the first age protected (1.5× on Stone made the first evolve 2:02). They are tuned once, after the War Council is in (A18.13 phase 3), never before: slowing XP fully and then adding research overshoots.
- The XP cap stays 1.5× the current threshold. In the final age Overcharge (A2.4) uses 1,650 XP per +25% charge.
- Passive XP alone reaches the second age at 2:20, so nobody is frozen in an age.
- The tutorial keeps its own thresholds (250 / 300 / 350 / 400).

#### A18.3.3 Gold (changes to A2.3)

| Rule | Today | A18 | Why |
|---|---|---|---|
| Starting gold | 175 | 175 | |
| Passive income | 6 gold/s | 6 gold/s | Longer matches already give more gold; research absorbs it |
| Treasury | 3 levels, +1.5 gold/s each | **Replaced by the Economy track** (A18.5.5) | Choices instead of a linear buy |
| Kill bounty | 60% of cost | **50%** | Longer matches pay more kills; the leader must not buy research first on the winner's gold |
| Evolve price | none | none | A gold price made spam win 83-92% (A16.2) |

Expected gold per side: Short ~6,500, Standard ~9,800, Full ~14,000. Research takes 15-25% of it (A18.12).

#### A18.3.4 Formats become age windows (replace the A17.8 format table)

A format is a **window of consecutive ages**. `FormatId` becomes an open string key into `content.formats`; each `FormatDef` already lists its ages, and the sim already advances by position (`ctx.fmt.ages[s.ageIndex]`). A Rome-to-Medieval window is one more `FormatDef`. `ReplayDoc` already stores the format key, and the content hash makes a replay self-describing.

| Format | Ages in the window | Evolves (expected) | Overdrive | Siege | Final Bell | Median target | 80% of matches | Start screen label |
|---|---|---|---|---|---|---|---|---|
| Tutorial | Stone, Medieval, Gunpowder, Modern, Future (scripted) | scripted | none | none | none | ~2:30-3:00 | | |
| Short War | 3 | ~1:10, ~2:50 | 5:00 | 6:30 | 8:30 | **7:00** | 5:30-8:30 | "about 7 min" |
| Standard War | 5 | ~1:10, 2:50, 4:35, 6:25 | 8:00 | 10:00 | 12:30 | **10:30** | 8:30-12:30 | "about 10 min" |
| Full War | 7 | ~1:10, 2:50, 4:35, 6:25, 8:20, 10:20 | 12:00 | 14:30 | 17:30 | **15:00** | 12:00-17:00 | "about 15 min" |

Shorter windows (War Path, Daily, custom) use these clocks:

| Window length | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Overdrive / Siege / Final Bell | 3:30 / 4:30 / 6:00 | 4:15 / 5:30 / 7:15 | Short War | 6:30 / 8:15 / 10:30 | Standard War |
| Median target | ~4:30 | ~5:45 | 7:00 | ~8:45 | 10:30 |

- **Which window.** Quick Battle and Skirmish: the player picks the format and a start era (default Stone). Ladder: Arenas 1-2 start at Stone; from Arena 3 the window is the **Era of the Week**, seeded weekly in `meta` from the date and shown on Mode select a week ahead; the sim only receives the resolved format key. Daily Challenge: its own seeded window, Standard length. War Path: fixed per level (A18.7.3).
- **Starting in a later age.** The base starts at that age's P and HP; everything else is as at 0:00. Underdog, older-age turrets and Modernise compare global `AgeDef.index` (A17.15 rule 4).
- **War Plan.** A plan holds one loadout per age; a match uses only the loadouts of its window. Auto-fill fills a missing loadout from starter Commons, so a plan is never unplayable.
- **Old names.** "Full War" no longer means "all ages". Titles that say "reach Cosmic" become "reach the last age of your window".
- **Performance (B3).** Full War up to 17:30 is 21,000 ticks; the headless budget becomes ≤ 850 ms per Full War on desktop Node. Balance tools measure Short and Standard on every run and Full only at gates.

#### A18.3.5 The Supply Cache (a mid-age event, built only if needed)

If the owner playtest after phase 3 (A18.13) shows standoffs in the 880 lu gap, the Supply Cache ships:

- A crate drops at p = 1,000 at fixed match times from content (Short 2:30 and 4:30; Standard every 2:30 from 2:30; Full every 2:30 from 2:30), announced 5 s ahead on both minimaps.
- The first side with ground units alone within 60 lu of it for 5 s gains **150 gold** (flat, no XP). Air, powers and burrowed units cannot claim it. Unclaimed after 30 s, it vanishes.
- Gate: Final Bell unchanged or lower; turtle proxy still in its band; median decisions per minute in the middle of an age (spawns, research, stance, power) ≥ 6.

---

### A18.4 Stance and the Hold flag (replace the A2.7 stance rules and the A2.12 row)

#### A18.4.1 Now: the toggle from match 1

The existing Charge/Hold toggle ships visible from match 1 by flipping `training.stanceEnabled` in onboarding. No sim change, no contract change (A18.13 phase 0).

#### A18.4.2 Three stances

| Stance | Behaviour | Button |
|---|---|---|
| **Charge** (default) | As today: units advance and fight | Crossed swords |
| **Hold** | Ground units hold at the side's **Hold flag**: units beyond it with no target walk back at 70% speed; units behind it do not pass it; engaged units keep fighting | Flag |
| **Fall back** | Ground units with no target walk back to p = 200 at full speed, then hold there; engaged units keep fighting until their target dies or leaves range | Shield |

- **The Hold flag.** Default p = 320. While Hold is active the player drags the flag on the lane or the minimap to any p in **[320, 800]**, snapped to 20 lu. Every modifier that moves the flag (Sally Port) is clamped to the same range. Command `stance { mode, holdP? }`; the sim clamps `holdP`.
- **Stance cooldown.** A stance change is accepted at most once per **3 s** (`battle.stanceCooldownMs` 3,000); a flag move is accepted at most once per 1 s. A rejected change is shown on the control with a short fill.
- **Engagement.** A unit is "fresh" after 4 s with no target. A fresh unit's first hit is its engagement's first hit; after that the unit is fresh again only after 4 s with no target. Stance changes never reset it. All "first hit" bonuses (Rush, Ambush) read this flag, so toggling stance gains nothing.
- **Controls.** A three-segment control above the tray on the right, 48 px tall on phones; **S** toggles Charge and Hold, **Shift+S** is Fall back. A small flag shows over the own front. Air gunships obey stance; the bomber does not.
- **AI.** Hold at the flag when the push gate fails, placed where its turrets cover or where its army value is highest; Fall back when its army is under 0.5× the enemy's and the enemy is past mid-lane. Tiers 0-II never move the flag; tiers V and up use Fall back.
- **Taught** at War Path Stone L2 (A18.7.5).

---

### A18.5 The War Council: in-battle upgrades with real choices

A round button right of the gold counter (it replaces the Treasury tap target) opens the **War Council**. It has four tracks. Research runs in **one slot**, one item at a time. Owned picks are kept across evolves and apply to later units of the same class.

#### A18.5.1 Rules

- **Command.** `research { track, group?, rank, pick }`, replacing `treasury`. Valid when the rank is unlocked, the previous rank of that track (and class group) is owned, the slot is free and gold suffices. Gold is paid at the start. Validation lives in `sim/commands.ts` with reject codes like the others.
- **Time.** Rank I 10 s, rank II 14 s, rank III 18 s, in ticks. Research continues through Ascension. Cancel refunds 75%.
- **Underdog discount.** A side whose age position is lower than the enemy's, or whose base HP is 20 or more percentage points lower, pays **−20%** for research started while that holds (integer, rounded down).
- **Ranks unlock with the window:**

  | Window length | Rank I | Rank II | Rank III |
  |---|---|---|---|
  | 1 | from start | | |
  | 2 | from start | 2nd age | |
  | 3 | from start | 2nd age | 3rd age |
  | 4-5 | from start | 2nd age | 4th age |
  | 7 | from start | 3rd age | 5th age |

- **Applies from spawn.** A pick applies to units spawned after it completes (A18.2 rule 2). Turret, base and economy picks apply at once, since those objects are updated only by research, never by per-tick stat code.
- **Public.** The researching side's base shows a workshop glyph with a progress ring and the item's icon; the opponent's HUD shows it too, and finished picks join the Scouted list. Completion plays a stinger and a shimmer on affected units.
- **Math.** All integer bp. For a unit stat: final = card value at its level (A6.6) × (10,000 + Σ bp of research, doctrine, relic, modifier) / 10,000, truncated, then clamped to the A18.2 caps.
- **Never touches** XP, the clock, train time or Overdrive multipliers.
- **Hashing.** `SideState.research` is hashed as an owned-picks bitmask integer plus the current item and its end tick.

#### A18.5.2 Track 1: Troops (per class)

Each class has its own line, bought separately. Epics and Legendaries count in their base role's class. Rank I is a stat choice of different kinds; rank II an ability; rank III an elite pick (v1.1).

| Class | Rank I (150 g): 1 of 2 | Rank II (300 g), ability: 1 of 2 | Rank III (500 g, v1.1): 1 of 2 |
|---|---|---|---|
| Infantry | **Weapons**: +10% damage · **Mail**: each hit taken −N flat (N = 25% of that age's Infantry Common L1 damage; a hit never drops below 1) | **Shield Wall**: −20% damage from attackers with range ≥ 100, −8% speed · **Rush**: +15% speed, first hit of each engagement +30% | **Veterans**: +8% damage per kill, up to 3 stacks · **Second Rank**: the second rank strikes (reach 1) |
| Ranged | **Weapons**: +10% damage · **Long Draw**: +30 lu range, −8% attack speed | **Fire Arrows**: hits burn 3 s at 15% of hit damage per second · **Pierce**: shots also hit the next enemy within 40 lu for 50% | **Marksmen**: +25% damage vs Heavy · **Quick Nock**: +18% attack speed |
| Heavy | **Plating**: −15% damage taken from Infantry · **Weapons**: +10% damage | **Trample**: first hit knocks back 30 lu · **Bulwark**: allies within 60 lu behind it take −10% damage | **Juggernaut**: immune to knockback and pulls · **Breaker**: +25% damage to bases and structures |
| Anti-armor | **Hunters**: +12% damage vs armored · **Lightfoot**: +12% speed | **Ambush**: first hit of an engagement +40% while Holding · **Skirmish**: −20% damage taken from Infantry | **Tank Killers**: +20% damage vs mech · **Harriers**: +15% attack speed |
| Support | **Field Care**: heals and shields +20% · **Mail** (as Infantry) | **War Drums**: allies within 160 lu +8% attack speed · **Rally**: allies within 160 lu −10% damage taken | **Miracle**: once per age per side, the first own unit to die within 160 lu of a Support revives at 30% HP without Veterans stacks · **Banners**: aura radius +50% |
| Air (with the class, A18.9) | **Weapons**: +10% · **Evasion**: −20% damage from turrets | **Strafing Run**: +20% vs moving ground units · **Loiter**: +25% time over the target | **Aces**: +15% attack speed · **Heavy Payload**: bomb splash +30% |
| Underground (with the class, A18.9) | **Quick Dig**: +20% burrowed speed · **Shoring**: +15% HP | **Surprise**: first hit after surfacing +40% · **Deep Tunnel**: surfaces 120 lu further | later |

- **Budget.** One class to rank II costs 450 gold, to rank III 950. A Standard War research budget of ~1,500-2,500 gold buys 5-8 items, so a player specialises in 2-3 classes: that is the build.
- **Research compatibility.** The War Plan builder shows, per age loadout, which classes it holds, so a player sees that a Heavy line is wasted in an age with no Heavy. The Council marks a class with no unit in the current loadout "Not in this tray".
- **Kinds.** Rank I and II picks use existing kinds: stat bp, range, attack speed, speed, `firstHitBonus`, auras, `resist`, knockback, flat damage reduction (a new `resist` variant, part of the phase 2 sim work). Fire Arrows ships in v1 only if a damage-over-time status already exists; otherwise it moves to v1.1 with Pierce, Veterans, Miracle, Second Rank and Juggernaut.

#### A18.5.3 Track 2: Defences

| Rank | Pick A | Pick B |
|---|---|---|
| I (150 g) | **Watchtowers**: turret range +40 lu | **Quick Loaders**: turret attack speed +15% |
| II (300 g) | **Engineers**: Modernise costs −50% and takes 0.5 s; fort build time −40% | **Arsenal**: turret damage +12% |
| III (450 g, v1.1) | **Keep Walls**: base max HP +10% | **Sally Port**: units spawn 60 lu further forward and the Hold flag range becomes [380, 800] |

- Range comes from rank I only, so it cannot be stacked twice inside the Council. Relics and modifiers may add more, up to the 560 lu hard cap; the gap between the two covers never falls below 880 lu.
- Gate: the turtle and `tech_turtle` proxies stay in the turtle band (A2.14). If Watchtowers fails the pick-flip gate against Quick Loaders, Watchtowers becomes +30 lu.
- When forts ship (A18.9), wall picks join this track.

#### A18.5.4 Track 3: Economy (replaces Treasury)

| Rank | Pick A | Pick B |
|---|---|---|
| I (150 g) | **Granary**: +1.5 gold/s | **Forage**: +40% kill bounty for kills made in your own half (p ≤ 1,000) |
| II (300 g) | **Market**: +2 gold/s | **Bounty Hunters**: kill bounty 50% → 65% everywhere |
| III (450 g, v1.1) | **Guildhall**: +2.5 gold/s, but your unit queue holds one fewer unit | **Levy**: Common units cost −12%, passive income −1 gold/s |

- Every rank-I price is 150 g in every track. Granary pays back in 100 s; Forage pays a defender under pressure; Bounty Hunters pays in busy games and Market in quiet ones. Guildhall trades burst spawning for income; Levy trades income for cheap Commons.
- Economy income is never doubled by Overdrive. There is **no second research slot** anywhere.
- Rejected: interest on banked gold, gold from XP, anything that multiplies with Overdrive.
- **Migration.** Treasury disappears as a control. Saved plans, AI profiles (`Treasury max` column in A7.3) and HUD switch to the Council.

#### A18.5.5 Track 4: Command

| Rank | Pick A | Pick B |
|---|---|---|
| I (150 g) | **Signal Fires**: Age Power charges 15% faster | **War Horns**: while Charging, ground units +8% speed; while Holding with the flag at p ≤ 480, units at the flag +10% damage |
| II (300 g, v1.1) | **Survey Corps**: power zones +20% wider | **Master Gunners**: power damage and heals +12% |
| III (450 g, v1.1) | **Reserve Charge**: power charge kept across an evolve 50% → 70% | **Last Stand Drill**: Last Stand arms at 35% base HP and hits 20% harder |

Power kills still pay 30% gold and no XP. Reserve Charge and Last Stand Drill must pass the `fallback_turtle` and power-banking proxies.

#### A18.5.6 How it fits with card levels, doctrines and relics

| System | Relation |
|---|---|
| Card levels (A6.6) | Unchanged; research multiplies with them. Ranked and Daily use Standard levels (A16.7) |
| Evolve doctrines (A16.10) | Stay the free pick at evolve; may not duplicate a research pick; same caps |
| War Relics (A18.7.8) | Single player only; same caps |
| Modifiers (A16.8) | War Path and Daily may lock a track ("No Council") or discount one ("Cheap Drills"), always disclosed |

#### A18.5.7 UI

- **Button.** Round, right of the gold counter; a ring while research runs, a dot when something is affordable. **G** opens and closes it. T is freed.
- **Sheet.** A bottom sheet over the tray, never the lane; the game keeps running. Four track cards, each showing its next item (Troops shows the class icons with rank pips). Tap a card to flip it to its two picks: icon, name, one-line effect, cost, time. At most 2 decisions on screen (A15.13).
- **Advisor.** On Easy and in War Path regions 1-2, one pick is outlined "Suggested" with a reason ("They have many Heavies"). Never on Hard and up.
- **Enemy.** The enemy's research icon and ring show on their base and in the top-bar enemy panel.
- **Motion (A12).** The sheet slides up in 180 ms ease-out; the chosen pick stamps into the slot; completion sends a shimmer along affected units, a class badge pops, the workshop glyph bursts. Reduce motion uses fades.
- **Look.** v1: one badge per pick plus a class-coloured shimmer. Later, per-age looks through the manifest (`research.<id>.<ageId>`, falling back to `research.<id>`). Art never changes numbers.

#### A18.5.8 AI use

- **Utility (A7.2 addition).** Research score = personality weight by track × (value over the rest of the age − value of the units the gold would buy now) + counter value against scouted enemy classes + a timing bonus for a push planned at completion.
- **Tiers (A7.3 columns).** Research is public to every tier; tiers differ in how they use it.

  | Tier | First research | How it picks | Uses enemy research |
  |---|---|---|---|
  | 0-I | after 1:30, then every ~90 s | seeded random among affordable | no |
  | II-IV | after 1:00 | the pick's `aiHint` | no |
  | V-VI | after 0:45 | counter scoring | pushes when its own Troops rank completes |
  | VII-X | from 0:30 | counter scoring | times pushes and evolves to its completions and away from the enemy's |

- **Generals' research styles:** Captain Kettle: Infantry Rush, Forage never; Mama Moss: Defences first; Baroness Ledger: Economy first, Guildhall; Sgt. Boomsworth: Command and Ranged; Madame Tempest: Signal Fires, Reserve Charge; Rook: counters your scouted classes.

---

### A18.6 Difficulty in single player

**Principle.** Difficulty changes **how** the AI plays, never its stats (A18.2 rule 5). Easy to Normal is the smallest step.

#### A18.6.1 Quick Battle and Skirmish

They use the picker as it ships: Easy II, Normal IV, Hard VI, Expert VIII, Legendary X, plus the behaviour flags below.

#### A18.6.2 War Path

Each region has a Normal base tier; the level role adds `tierOffset` (A18.7.2); the difficulty adds its own offset; the result is clamped to [0, X]. Because tiers clamp at the top, every difficulty also carries **behaviour flags**, so each step changes play in every region.

| Region (8-age map) | Stone | Bronze | Medieval | Gunpowder | Industrial | Modern | Future | Cosmic |
|---|---|---|---|---|---|---|---|---|
| Normal base tier | 0 | I | II | III | IV | V | VI | VII |

With 13 regions the Normal bases run 0, 0, I, I, II, III, III, IV, V, V, VI, VII, VII in map order.

| Difficulty | Tier offset | Behaviour flags |
|---|---|---|
| Easy | −2 (min 0) | Never pushes before its first evolve; research late and random; never moves the flag; pauses 5 s after each of its pushes |
| Normal | 0 | Punishes a thin army: pushes when its army value is ≥ 1.5× yours; research by `aiHint` |
| Hard | +1 | As Normal, plus counter scoring for units and research, Hold flag use, saves gold for counters (A16.3) |
| Expert | +2 | As Hard, plus the wave game (A16.3) and push timing to research completions |
| Legendary | always X | As Expert, plus evolve timing against the player's research ring and a boss-phase plan on every level |

- In Cosmic this gives Easy V, Normal VII, Hard VIII, Expert IX, Legendary X. At Stone Easy and Normal are both tier 0 and differ by flags only.
- The node and the VS screen show the resulting tier ("AI · Rook · Tier IX").
- **No hidden bonus.** Opponents use Standard L8 levels; The Warden keeps its disclosed L9 Legendaries. If the owner later wants Legendary harder still, the only allowed lever is a disclosed head start (owner decision D7; recommended: not needed).
- **Rookie AI** (A7.1) still applies to the first 20 matches of a save and is still disclosed. Daily keeps Recruit, Veteran and Warlord mapped to Easy, Normal and Hard.

---

### A18.7 The War Path (saga-map campaign)

The War Path is the centre of Home (owner direction). A scrolling map in the Candy Crush style: a winding road through one landscape per age, each node a battle, the next node always under a big Play button with the difficulty picker (default Normal, remembered per save). Quick Battle, Daily and Ladder sit around it.

#### A18.7.1 Size

| | Now (8 ages) | With 10 | 12 | 13 |
|---|---|---|---|---|
| Regions | 8 | 10 | 12 | 13 |
| Main levels (10 per region) | 80 | 100 | 120 | 130 |
| Side nodes (2 per region, optional) | 16 | 20 | 24 | 26 |
| First pass (median level ~5:30) | ~7.5 h | ~9 h | ~11 h | ~12 h |

A new age's region is inserted at its place in history. Players past that point see it marked "New region" and may play it any time; nothing cleared is locked again. Level ids are stable forever (`wp.<ageId>.l05`, side nodes `wp.<ageId>.s1`).

#### A18.7.2 The sawtooth inside a region

| Level | Role | Tier offset | Window | Target win rate (tier-matched player bot, Normal) |
|---|---|---|---|---|
| 1 | Intro: the region's new thing | −1 | region age only | 85-95% |
| 2 | Practice | 0 | 2 ages | 65-80% |
| 3 | Mix (card unlock node) | 0 | 2 ages | 65-80% |
| 4 | Feature: a lane feature or special objective | 0 | 2 ages | 60-75% |
| 5 | **Lieutenant** (mini-boss, marked Hard) | +1 | 3 ages | 40-55% |
| 6 | Relief: a fun modifier | −1 | region age only | 80-90% |
| 7 | Ramp | 0 | 2 ages | 60-75% |
| 8 | Counter puzzle: the enemy plan punishes one class | +1 | 2 ages | 50-65% |
| 9 | **Spike** (marked Hard) | +1 | 2 ages | 35-50% |
| 10 | **Boss General** | +2 | 4 ages (fewer in regions 1-3) | 25-40% |

A window "of 2 ages" is the region's previous age and its own; windows never reach past the region's age, and in region 1 every window is Stone only. So the region's new age is on screen for most of every level. Bosses in regions 2 and 3 use 2 and 3 ages. No War Path level uses a 5-age or longer window.

#### A18.7.3 Objectives (data, so levels differ in kind)

| Objective | Rule | Where it lives |
|---|---|---|
| Destroy the base | Default | Sim (today) |
| Hold out | Win if your base stands at a set time (for example 4:00) | Sim: `MatchConfig.victory { kind: 'survive', atMs }` |
| Take the tower | Win by destroying one marked enemy turret or fort | Sim: `victory { kind: 'target', slot }` |
| Fixed loadout | You play a given War Plan: a puzzle | Meta (builds the `SideConfig`) |
| Mid-battle start | The level starts from a preset state: a seed plus a stored command prefix, simulated before the first frame | Meta, replay tools |
| Fast win | Win before a set time | Star goal (meta) |

Roles 4, 8 and at least two other levels per region use a non-default objective or start. "Hold mid-lane for 60 s" waits for v1.1.

#### A18.7.4 Stars, crowns and goals

- **★** win. **★★** win and meet the disclosed goal on the node (base above 50%, win before the Final Bell, at most 3 unit types, all turrets alive, no Legendary, at most 3 research items, and so on). **★★★** win and meet the goal on Hard or harder.
- **Crowns** record the highest difficulty beaten on the level (bronze Easy, silver Normal, gold Hard, jade Expert, star Legendary). Stars measure skill goals, crowns measure difficulty.
- Stars never block progress; the next region opens when its boss is beaten once on any difficulty.
- **Retry is free and instant.** After 3 losses in a row the result offers "Try Easy" and one A15.12 tip. A level never quietly gets easier.

#### A18.7.5 Teaching one thing at a time (8-age map)

| Where | New thing |
|---|---|
| Stone L1 | Train, the lane, destroy the base (today's training match vs Old Grogg) |
| Stone L2 | **Stance**: the enemy rushes; winning needs Hold, then Charge |
| Stone L3 | Turret on a mount |
| Stone L4 | Age Power, dragged onto the lane |
| Stone L6 | **War Council: Economy** (the button appears with Granary and Forage) |
| Stone L7 | Troops rank I, advisor on |
| Stone L8 | Defences rank I (enemy Ranged outranges plain turrets) |
| Stone L10 | First boss: Pip Quickstep |
| Bronze L1 | **Evolving** (first 2-age window) |
| Bronze L3 | Troops rank II |
| Bronze L4 | **Forts** (once the card type ships) |
| Bronze L6 | Command track |
| Medieval L1 | Doctrines at evolve (when shipped) |
| Medieval L4 | The Hold flag and Fall back |
| Gunpowder L1 | **Underground** (when shipped) |
| Industrial L1 | **Air** as a full class (when shipped) |
| Modern L1 | Council rank III (v1.1) |
| Each region L4 | One lane feature (A15.16, A16.9) once they ship |

When Nile and Rome arrive, evolving moves to Nile L1 and forts to Nile L4 (A18.8).

#### A18.7.6 Boss Generals

Every boss is labelled "AI General", with its tier, its War Plan and its research style.

| Region | Boss | Style | New? |
|---|---|---|---|
| Stone | Pip Quickstep | Balanced beginner | exists |
| Nile | Queen Sethra of the Dunes | Monuments and walls, Holds, bursts out with chariots | new (with Nile) |
| Bronze (Hellas) | Captain Kettle | Rusher | exists |
| Rome | Legate Varro Ironhand | Two classes to rank III, Shield Wall, pushes on completions | new (with Rome) |
| Norse | Jarl Ingrid Stormaxe | Bounty Hunters, always Charges, pushes after evolves | new (with Norse) |
| Medieval | Mama Moss | Turtle | exists |
| Shogun | Lady Kaede | Ambush on Anti-armor, counter-times your evolve | new (if D4 says yes) |
| Renaissance | Baroness Ledger | Economy first | exists |
| Gunpowder | Sgt. Boomsworth | Artillery, Command | exists |
| Industrial | Ada & Ivo | Balanced counters | exists |
| Modern | Rook | Counter-picker | exists |
| Future | Madame Tempest | Power timing | exists |
| Cosmic | The Warden | Final boss, L9 Legendaries (disclosed) | exists |

On the 8-age map, Baroness Ledger is the Bronze Lieutenant and the Medieval region boss is Mama Moss; Captain Kettle holds Bronze.

**Boss rules.**

- **Boss base:** +50% base HP and one extra fixed turret of the boss's age, disclosed on the node and the VS screen. These are per-side modifiers (`SideConfig.sideMods`, A18.11), the one sim addition bosses need.
- **Phase at 50% base HP** (a bot-profile rule reading the `Observation`, no sim trigger): a banner "The General is enraged" and a 2 s warning. Then the boss casts its Age Power if charged and the zone holds at least its power threshold, trains its signature Legendary if affordable, and switches to Charge only if its army value is ≥ 1.0× the player's; otherwise it Holds, banks and counters, and re-checks every 5 s. Stopping at 51% to build a kill zone gains nothing.
- A new General needs a portrait, a VS line, a plan per age and a profile entry: ~2 agent hours plus art.

#### A18.7.7 Modifiers

Disclosed on the node and the VS screen, from the A16.8 kinds: Gold Rush (passive gold ×1.5 both sides), Double Powers, Iron Rain (enemy starts with a Rare turret), No Council, Cheap Drills (Troops −30%), Fog Window, Night (turret range −20%), Mud (−15% speed), Short Fuse (Overdrive 1 min earlier). Each appears first in a relief level.

#### A18.7.8 Rewards (all earned, all shown before the fight)

| Reward | Rule | When |
|---|---|---|
| First clear | Amber (40; 60 on Hard-marked levels); boss: a fixed capsule shown on the node | v1 |
| **Card unlocks** | Level 3 of each region grants a named Rare of the region's age, the boss grants a named Epic, on first clear; a copy of a card already owned counts as a normal duplicate (A6) | v1 |
| Star chests | Every 10 stars: Amber, Dust and one cosmetic from the collections | v1.1 |
| **War Relics** | 3 per region, earned by ★★ on levels 3, 6 and 9. Each is a trade-off ("Nile Charm: +5% Economy income, −5% turret damage"), within the A18.2 caps. **Single player only**: War Path, Skirmish, Quick Battle. `meta` never puts relic `sideMods` into Ladder, Daily, ranked or PvP configs, and a test proves it | v1.1 |
| Veteran and Legend Paths | After the Cosmic boss: the same map at +2 and +3 tier offset with one modifier or restriction per level; own stars | v1.1 |
| Boss rematch | After a region is done, the boss returns with a twist modifier | v1.1 |
| Titles | "Pathfinder", "Veteran", "Legend", "Crowned" | v1.1 |

No lives, energy, timers, boosters or paid anything (A15 red lines).

**Capsule age weighting.** Age Capsules and card drops that pick an age weight the current War Path region's age ×2 and the Era of the Week ×2 (disclosed on the odds screen), so cards arrive for the ages the player actually plays (v1.1, meta data).

#### A18.7.9 Resume a single-player match

Single-player matches save their seed, config and command log every 10 s and on page hide. After a reload, "Resume battle" re-simulates the log to the saved tick (deterministic, B3) and continues. Never in PvP. Size S-M, v1.1. Full War stays off the War Path either way.

#### A18.7.10 Conquest, onboarding, content and save

- **Conquest folds into the War Path** (owner decision D5). The boss and Lieutenant nodes are the Conquest Generals. On migration each Conquest star becomes the matching star on that General's boss node; Conquest milestones (9, 18, 27 stars) become star-chest credit; the Conquest tab leaves Mode select. Nothing earned is lost (A15.1).
- **Onboarding (A8).** The first 40 minutes are Stone L1-L6; A8's beats move onto the nodes; the stance is there from L2.
- **Content** (`src/content/raw/warPath.ts`):

```ts
interface WarPathLevel {
  id: string;                 // 'wp.bronze.l05', stable forever
  region: AgeId;
  index: number;              // 1..10, or side nodes 's1', 's2'
  role: 'intro' | 'practice' | 'mix' | 'feature' | 'lieutenant' | 'relief' | 'ramp' | 'puzzle' | 'spike' | 'boss' | 'side';
  format: string;             // a content FormatId: the window and its clocks
  general: GeneralId;         // labelled AI
  tierOffset: number;         // added to the region base and the difficulty offset, clamped [0, 10]
  victory?: VictoryRule;      // default: destroy the base
  start?: { seed: number; commands: string };  // mid-battle start
  fixedPlan?: WarPlanSpec;    // fixed loadout puzzle
  modifiers: ModifierId[];    // disclosed
  laneFeatures: LaneFeatureId[];
  goal2: StarGoal;            // the ★★ goal
  teaches?: MechanicId;
  reward: RewardSpec;         // first clear, card unlocks
  boss?: { sideMods: SideMods; phaseAtBp: number };
}
```

- **Save** (`SaveDoc` v3): `warPath: { path: 'normal' | 'veteran' | 'legend'; stars: Record<levelId, 0|1|2|3>; crowns: Record<levelId, 0..5>; relics: RelicId[]; difficulty: DifficultyId }`.
- **Headless check** (`tools/warPath.ts`): plays every level with the human-limited player bot (A15.17) at each difficulty and fails the build when a level misses its role band in A18.7.2 by more than 10 points.

---

### A18.8 More ages

#### A18.8.1 The target list: 13 ages

The existing 8 keep their ids, cards and P values. Five are inserted at geometric steps between their neighbours, so no existing card changes.

| # | Age (id) | Theme | P | Status | Signature mechanic |
|---|---|---|---|---|---|
| 0 | Stone (`stone`) | Tribes, beasts | 1.00 | exists | Basics |
| 1 | **Nile** (`nile`) | Ancient Egypt: chariots of the sun, sphinx, obelisks | 1.08 | new, wave 1 | Monuments (first fort card); sandstorm power |
| 2 | Bronze (`bronze`), shown as **"Bronze Age: Hellas"** | Ancient Greece: hoplites, gorgons, bronze giants | 1.16 | exists | Piercing throws, auras |
| 3 | **Rome** (`rome`) | Legions, testudo, ballistae | 1.22 | new, wave 1 | Formations: the front rank takes less damage; siege towers |
| 4 | **Norse** (`norse`) | Raiders, longships, berserkers | 1.28 | new, wave 2 | Rage: damage up as HP falls |
| 5 | Medieval (`medieval`) | Castles, knights | 1.35 | exists | Reach, shields, siege |
| 6 | **Shogun** (`shogun`) | Feudal Japan: samurai, ashigaru, fire arrows | 1.49 | new, wave 3, only if D4 = yes | Duelists: first-strike counters |
| 7 | **Renaissance** (`renaissance`) | Pike and shot, inventors, war wagons, gliders | 1.65 | new, wave 2 | Inventions: a glider (light Air), a war wagon (mobile cover) |
| 8 | Gunpowder (`gunpowder`), shown as **"Age of Muskets"** | Napoleonic lines, sail-age cannon | 1.82 | exists | Splash artillery, first Air |
| 9 | Industrial (`industrial`), shown as **"Great War"** | Steam, rail, landships, trenches | 2.12 | exists | Mech Heavies, marks |
| 10 | Modern (`modern`) | Second World War to tanks and jets | 2.46 | exists | Air as a regular option |
| 11 | Future (`future`) | Mechs, energy shields | 3.32 | exists | EMP, time control |
| 12 | Cosmic (`cosmic`) | Star legions | 4.48 | exists | Blink, motherships |

- Nile = √1.16; Rome and Norse split Bronze to Medieval in three; Shogun and Renaissance split Medieval to Gunpowder in three. Without Shogun, Renaissance becomes √(1.35 × 1.82) ≈ 1.57.
- Small early steps are a feature (being one age ahead early matters less), paid for by a visibly new mechanic in every new age.
- Rejected: a separate Greek age (Bronze is Hellas), a separate Napoleonic age (Gunpowder is), a separate World War age (Industrial and Modern are), a Contemporary age (too close to Modern and Future). Shogun as a side branch instead of Medieval is rejected: it breaks queue conversion and the one-line P scale.

#### A18.8.2 Now: presentation themes (no new art)

Bronze is presented as "Bronze Age: Hellas", Gunpowder as "Age of Muskets", Industrial with Great War flavour: age card titles, flavour lines, VS lines, War Path region names and music titles. Strings and content data only, size XS (A18.13 phase 0). This answers the owner's Ancient Greece, Napoleonic and World War wishes at once.

#### A18.8.3 When new ages are built, and what they cost

The owner has chosen an **ultra-realistic** art direction; every existing age will be restyled. Building Nile and Rome before that pipeline is proven would pay for their art twice. So:

1. New ages are **frozen** until one existing age (Stone) ships in the realistic style, passes the screenshot review, and has a measured hours figure.
2. Each new age is then re-costed from that figure. Planning value until then: **75-150 agent hours per age** (1.5-3× the stylized 50 h), of which unit art is the largest part.
3. Waves: 1 Nile and Rome; 2 Norse and Renaissance; 3 Shogun (if D4 = yes).

Per age, as A17 set the standard: 7 units (3 Common, 2 Rare, 1 Epic, 1 Legendary), 4 turrets, 2 Age Powers, 1 fort card when forts exist, a base, a backdrop, a sound set and music arrangement, one boss General, and its War Path region (10 levels as data). Each signature mechanic that needs a new ability kind (Rome formation, Norse rage) is one `AbilityDef` kind with its own unit test, requested from WP0 and WP2 before content is written.

**Age index shift.** Inserting an age shifts `AgeDef.index`, which the sim reads for older-age turrets, Modernise and underdog. Saves persist only ids, so no migration is needed; a sim test proves these rules on a window with an inserted age.

---

### A18.9 Classes, forts and six troops

| Owner wish | Rule | When |
|---|---|---|
| **Six troops per battle** | A loadout has 6 unit slots; the tray shows 6 cards. The `train` and `cancelTrain` slot type widens from `0..4` to `0..5` | Phase 2 contract bump |
| **Stationary class (forts)** | The A16.14 card type rules (pads at p 240, 360, 460; at most 2 alive; 5 s scaffold; 6 pop; 25 s recharge; decay; ×2 from Heavy, siege and Legendary; bounty 60%). Each age loadout gains 1 Fort slot beside its 6 units. Placed by dragging onto a pad (the power drag). Wall picks join the Defences track. The wall-turtle gate (≤ 45%, ≤ 15% at the Bell) applies | Phase 6, right after the War Path (owner: early) |
| **Air as a full class** | Air units get their own class icon, counter row and Troops line (A18.5.2) | Phase 8 |
| **Underground class** | A16.15 rules (tunnelers, detectors, 1 s surfacing telegraph); own Troops line | Phase 8, after forts |
| **Class icons and counters, clear deck builder** | Owner directions of 2026-09-28; the builder also shows research compatibility (A18.5.2) | In flight / Phase 3 |
| **Cosmetic collections** (emotes, quotes, flags, base skins, decorations, national flags) | Specified in their own section with the Customize screen; the War Path pays into them through star chests | Separate section |
| **Lane features, battlefields** | One per region from L4 (A15.16, A16.9) | v1.1 |
| **Clans, friends** | Online M6 and M8 (A18.10) | Later |
| **Home village** | v1.1 as decided (A16.22); shares Home with the War Path map | v1.1 |
| **Beautiful art** | Realistic restyle (A18.8.3); research picks add badges and later per-age looks | Art track |

---

### A18.10 Online multiplayer: the final goal

Single player leads there directly: the sim is integer, seeded and hashed; replays are command logs; every War Path match is a determinism test; Generals become labelled AI fill; relics and card levels stay out of PvP (Standard L8).

**Netcode (A16.21 and the `server/` spike; D1's Colyseus line is superseded).** One Cloudflare Durable Object per match relays commands: stamped at server tick + 4 (200 ms, adaptive 4-8), frames every 2 ticks, state hashes compared every 20 ticks. On a mismatch the room re-simulates the log and the side that disagrees loses. Reconnect replays the stored log, 60 s grace. PvP: no pause, no speed, Standard L8; research and stance are public anyway.

**Free-tier capacity** (Durable Objects 13,000 GB-s and 100,000 requests a day; going over gives errors, never a bill). Longer matches reduce it:

| Online format | Median | GB-s per match | Matches a day | Use |
|---|---|---|---|---|
| Short War | 7:00 | ~53 | ~245 | Ranked |
| Standard War | 10:30 | ~79 | ~165 | Friend Duel, casual |
| Full War | 15:00 | ~113 | ~115 | Friend Duel only |

A client-clocked relay that lets the room hibernate roughly doubles these; M0 measures whether it is worth the code. A daily guard closes ranked near 90% of the budget.

| # | Milestone | Size | Exit test | Owner action | When |
|---|---|---|---|---|---|
| M0 | Spike measurements | S | 100 bot matches, 0 desyncs; costs in `docs/online-spike.md` | None | In progress |
| M1 | Same results in Chromium, Firefox and WebKit: golden replays and fuzz in CI | M | CI green on 3 engines | None | **Now, beside phase 3** |
| M2 | Friend Duel by code, reconnect, desync disputes, capacity guard | L | Owner plays PC vs phone; 0 desyncs in 200 CI matches | Cloudflare account and two GitHub secrets (below) | After the War Path |
| M3 | Accounts and cloud save (device keys, transfer code) | M | Save moves between devices | None | After M2 |
| M4 | Casual matchmaking; labelled AI after 20-30 s; block and report; emotes only | M | Paired in 30 s or a labelled AI | Pick the public server name | |
| M5 | Ranked: Glicko-2 plus trophies, server-granted rewards | L | Rating moves only human vs human | Decide the review for minors | |
| M6 | Friends and leaderboards | M | An edited replay is rejected | None | |
| M7 | PWA install; store apps only if the owner pays | S | Browser and installed player finish a match | PWA or stores | |
| M8 | Clans, 2v2 vs AI, then 2v2 PvP | XL | Per A16.21 | None | |

**Owner steps for M2 (exact, when asked).**

1. Go to dash.cloudflare.com, sign up with your email and confirm it. Stay on the Free plan. Do not add a payment method.
2. In Cloudflare: My Profile, API Tokens, Create Token, template "Edit Cloudflare Workers", choose your account, Create. Copy the token. Copy the Account ID from the Workers & Pages overview.
3. On github.com/SimNyborg/ageborn: Settings, Secrets and variables, Actions, New repository secret. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. When told Friend Duel is live: open the game on PC and phone, press Online, Friend Duel, share the code, play, and report lag or anything out of sync.

---

### A18.11 Contract, save and content changes

All sim-visible contract changes land in **one** WP0 bump and one `SIM_VERSION` 3.0.0 with one golden re-record (phase 2). Pacing data (phase 1) changes only `contentHash`.

| Area | Change | Phase | Owner |
|---|---|---|---|
| Contracts | `FormatId` becomes an open string key into `content.formats` (was a closed union of 4); used by `MatchConfig.format` and `ReplayDoc.format` | 2 | WP0 |
| Contracts | `SideConfig.sideMods?` (per-side modifiers read at spawn and base init: base HP bp, extra fixed turret, unit stat bp) | 2 | WP0 |
| Contracts | `Command.research { track, group?, rank, pick }` replaces `treasury`; `research.cancel` | 2 | WP0 |
| Contracts | `Command.stance { mode: 'charge' \| 'hold' \| 'fallback', holdP? }` replaces the toggle | 2 | WP0 |
| Contracts | Tray slot type `0..5` in `train` and `cancelTrain` | 2 | WP0 |
| Contracts | `MatchConfig.victory?` (`survive`, `target`) | 2 | WP0 |
| Contracts | `Observation.me/foe.research` (owned picks, current item, progress), `stance`, `holdP`; `SimEvent` `researchStarted`, `researchDone`, `stanceChanged` | 2 | WP0 |
| Contracts | `AgeId` gains `nile`, `rome`, `norse`, `renaissance` (and `shogun`) | per age wave | WP0 |
| Sim | Research slot and timers, underdog discount, spawn-time application, A18.2 caps and damage-taken floor, flat per-hit reduction, turret cap 560, three stances, flag, stance cooldown, engagement freshness, `sideMods`, victory rules; `SideState.research` hashed | 2 | WP2 |
| Content | `raw/economy.ts`: XP sources, bounty 50%, thresholds by position, window formats and clocks, `stanceCooldownMs`, `turretRangeHardCapLu` | 1-2 | WP1 |
| Content | `raw/research.ts` (tracks, picks, bp, `aiHint`), `raw/warPath.ts`, later `raw/warRelics.ts` | 3, 5, 7 | WP1 |
| Content | Presentation names for Bronze, Gunpowder, Industrial | 0 | WP1, i18n |
| AI | Research utility, tier columns, Generals' styles, stance and flag, difficulty behaviour flags, boss phase | 3-5 | WP3 |
| Save | `SaveDoc` v3 migration: `warPath`, `difficulty`, 6-slot loadouts (a sixth slot auto-filled), Fort slot later, Conquest stars mapped to boss nodes; Treasury fields dropped | 5 | WP8 |
| Meta | War Path rules, stars, crowns, card unlocks, Era of the Week (seeded in meta), relic PvE switch and its test | 5, 7 | WP7 |
| Replays | Each tuning pass changes `contentHash`, and `replayPlayer` requires an exact match. Replays from an older build keep their result card and are labelled "Recorded on an older build"; they no longer play. Replays never promise to survive balance work | 2 | WP11 |
| Tools | Proxies and gates (A18.12), time-in-age rows, `tools/warPath.ts`, the 850 ms budget, fewer Full War runs | 1-5 | WP12 |
| CI | M1: golden replays on 3 browser engines | 3 | WP12 |

---

### A18.12 A2.14 targets, proxies and gates

**New proxies (B12):** `no_research`, `drill_rush`, `eco_greed`, `tech_turtle` (Defences first, Hold at home), `flag_ball` (Hold flag at 800 with Ranged, Support auras, Bulwark, Shield Wall), `fallback_turtle` (Fall back, Keep Walls, Last Stand Drill), `few_then_evolve` (the owner's "a few soldiers" player), `stance_toggler` (toggles on every engagement).

| Metric | Target |
|---|---|
| Median stay per age, Balanced mirror | A18.3.1; no age after the first under 75 s |
| Winner's evolve lead at the 3rd evolve | Median ≤ 30 s |
| Short / Standard / Full median | 7:00 / 10:30 / 15:00 (80% bands A18.3.4) |
| Final Bell (mirror) | ≤ 10% Short, ≤ 8% Standard, ≤ 5% Full |
| Research share of gold, Balanced mirror | 15-25% |
| Research items per Standard War | 5-8 median |
| `no_research` vs a researching Balanced script | Loses ≥ 70% |
| `few_then_evolve` | Wins ≤ 10% vs Normal, ≤ 2% vs Hard |
| Each pick pair | Pick-flip ≥ 30% of sampled lane states (A16.10) and the two picks within ±5 points of each other |
| Rank III | Buying it beats saving the gold by ≥ +4 points |
| `tech_turtle`, `fallback_turtle` | In the turtle band (A2.14) |
| `flag_ball` | ≤ 45% vs tier VII |
| `stance_toggler` | No better than the same bot without toggling (±2 points) |
| Underdog discount | Comeback share (A2.14) unchanged or higher; mirror win rate unchanged |
| War Path levels | Per-role bands in A18.7.2 |

If `flag_ball` fails, the flag cap drops from 800 to 700.

---

### A18.13 Build plan

Each phase keeps `main` playable and reruns `balance`, `exploits` and `strength`. Sizes: XS a few hours, S ≤ 1 day of agent work, M 1-3, L 3-6, XL more. Phases 0-3 give "harder, longer, more choices" with no new art.

| Phase | What | Size | Owning areas | Depends on |
|---|---|---|---|---|
| **0** | Stance toggle visible from match 1; Hellas, Muskets and Great War presentation names | XS | app/onboarding (WP11), content and i18n (WP1) | Picker in flight |
| **1** | **Pacing as data**: XP sources, bounty 50%, thresholds by position, window clocks. Behind a content switch; measured with the stronger AI in flight | S | content (WP1), tools (WP12) | |
| **2** | **One contract bump**: open `FormatId`, `sideMods`, `research` replacing `treasury`, `stance { mode, holdP }`, six tray slots, `victory`, caps and floor, stance cooldown and engagement freshness; `SIM_VERSION` 3.0.0 and one golden re-record; age-index sim test | M | contracts (WP0), sim (WP2), tools (WP12) | |
| **3** | **War Council v1**: Economy I-II, Defences I-II, Troops I-II for the 5 existing classes, Command I (about 26 picks); AI utility and tiers; HUD button and sheet, enemy ring, badges and shimmer; deck-builder compatibility marks; proxies and gates; tune the phase 1 thresholds once. Ships with phase 1 switched on. M1 CI in parallel | L | content (WP1), AI (WP3), visuals (WP4), render and HUD (WP5), UI (WP9), tools (WP12) | 1, 2 |
| **4** | Hold flag and Fall back in the HUD and minimap; AI flag placement | M | render and HUD (WP5), AI (WP3) | 2 |
| **Owner check** | Owner plays Short and Standard War on Normal and Hard | | | 0-4 |
| **5** | **War Path v1** on the 8 ages: map screen, 80 levels and 16 side nodes as data, objectives, stars and crowns, card unlocks, first-clear rewards, the Generals as bosses with `sideMods` and the phase rule, Conquest migration in save v3, difficulty flags, `tools/warPath.ts` | L | meta (WP7), save (WP8), UI (WP9), content (WP1), AI (WP3), tools (WP12) | 3, Home in flight |
| **6** | **Forts card type** (A16.14) with the Fort slot and wall picks in Defences; Supply Cache if the owner check showed standoffs | L | WP0, WP1, WP2, WP3, WP4, WP5, WP7, WP8, WP9, WP12 | 5, wall prototype verdict |
| **7** | Council rank III, Command II-III, doctrines (A16.10), relics, star chests, Veteran and Legend Paths, boss rematches, match resume, capsule age weighting | M | WP1, WP2, WP3, WP7, WP8, WP9 | 3, 5 |
| **8** | Air as a full class, then the Underground class (A16.15) | M each | WP0, WP1, WP2, WP3, WP4, WP5 | 6 |
| **Art track** | Realistic restyle of the existing ages, Stone first, with measured hours per age | XL | art, visuals (WP4) | Parallel from now |
| **9+** | New ages, re-costed from the art track: wave 1 Nile and Rome, wave 2 Norse and Renaissance, wave 3 Shogun (if D4) | 2 × L-XL per wave | all content areas, art, audio (WP6) | Stone restyled and measured |
| **Online** | M1 with phase 3; M2 Friend Duel after phase 5; M3-M8 after | M, L | server, tools | Owner's Cloudflare steps for M2 |

---

### A18.14 Edits to other sections when merged

A1 (Pillar 2 wording, match lengths), A2.3 (Treasury to Economy, bounty 50%), A2.4 (XP sources, thresholds by position), A2.7 and A2.12 (three stances, flag, cooldown, keys S, Shift+S, G; T freed), A2.8 (turret cap 560, A18.2 caps), A2.10 and A17.8 (windows, clocks), A2.11 (underdog research discount, Reserve Charge), A2.13 (match flow), A2.14 and A17.14 (A18.12 rows), A3 (6 unit slots, Fort slot, loadouts per window, compatibility marks), A6.3 (ladder Era of the Week), A6.10 (Conquest into the War Path), A7.2-A7.4 (research utility, tier columns, Treasury column removed, Generals' styles, new Generals), A8 (onboarding on War Path nodes), A9 (War Path screen, Council, stance control), A11-A13 (realistic direction, badges, presentation names), A14 (ids), A16.10, A16.14, A16.15 (schedule), A16.21 and D1 (milestones, capacity), B3 (tick budget), B15 (contracts).

---

### A18.15 Review resolution

"Accepted" means applied as written; "Changed" means applied in a modified form, with the reason; "Rejected" gives the reason.

#### Player review (veteran lane-battler and Clash Royale player)

| Point | Verdict | Where, and why |
|---|---|---|
| Weapons vs Armour is not a decision | Changed | Armour becomes Mail, a flat per-hit reduction that beats swarms and burn ticks and loses to Heavies (A18.5.2) |
| Hunters vs Armour, Air Weapons vs Armour are the same fake pair | Accepted | Hunters vs Lightfoot; Air Weapons vs Evasion |
| Economy rank I has no choice; Granary is a forced opener | Accepted | Forage added: pays a defender under pressure (A18.5.4) |
| Market vs War Spoils is a profile choice | Changed | War Spoils replaced by Bounty Hunters (all kills): the choice reads how busy the lane is, a match decision |
| Guildhall's second slot is worthless; Levy too small | Accepted | No second slot anywhere; Guildhall costs a queue slot; Levy −12% Commons for −1 gold/s |
| Watchtowers beats Quick Loaders; range stacks twice | Accepted | Range only at rank I; rank II is Engineers vs Arsenal |
| Research wasted if the next loadout lacks the class | Accepted | Builder and Council show compatibility (A18.5.2) |
| `no_research` gate too lenient | Accepted | Loses ≥ 70% |
| `few_then_evolve` ≤ 20% too lenient | Accepted | ≤ 10% vs Normal, ≤ 2% vs Hard |
| Rank III ±5 gate contradicts itself | Accepted | Pairs within ±5 of each other; buying beats saving by ≥ +4 |
| Forward Hold ball | Accepted | Flag cap 800 (700 if the gate fails), War Horns' damage only with the flag at p ≤ 480, `flag_ball` proxy |
| Damage-reduction stacking | Accepted | Damage-taken floor −35% and the other A18.2 caps |
| Stance-toggle resets | Accepted | 3 s stance cooldown; engagement freshness by 4 s without a target; `stance_toggler` proxy |
| Fall back stalling | Accepted | `fallback_turtle` proxy; Fall back no longer disengages mid-fight |
| Gold snowball through research | Accepted | Bounty 60% → 50% and a −20% underdog research discount |
| Veterans plus Miracle ambiguity | Accepted | Miracle is once per age per side; revived units lose Veterans stacks; both are v1.1 behind gates |
| Boss enrage is exploitable | Accepted | The phase casts and trains, but Charges only when the army comparison favours the boss (A18.7.6) |
| Research eclipses small early age steps | Changed | Kept small steps; each new age must bring a visibly new mechanic, and research never touches the P step itself |
| Full War at 15 min is long; no checkpoints | Accepted | Full War stays off the War Path; match resume from the command log (A18.7.9) |
| Mid-age standoffs | Changed | The Supply Cache is designed and gated, built only if the owner playtest shows standoffs, since the stronger AI may already fill the middle |
| Difficulty spread collapses at the top | Accepted | Region bases lowered to 0-VII, offsets −2/0/+1/+2/X, and behaviour flags per difficulty (A18.6.2) |
| Some rules break "difficulty never changes stats" | Accepted | Principle restated: disclosed modifiers allowed, hidden never; Legendary uses Standard L8 |
| Every level is "destroy the base" | Accepted | Objective kinds as data (A18.7.3) |
| Levels too long; the region's age appears late | Accepted | Normal levels use 1-2 ages, Lieutenant 3, boss at most 4; mid-battle starts |
| Stars and crowns overlap | Accepted | ★★★ = the ★★ goal on Hard; crowns keep difficulty |
| Relics gated behind Hard reward the wrong players | Accepted | Relics on ★★ and as trade-offs; v1.1 |
| Rewards are generic; the map is a single line | Accepted | Card unlocks on L3 and the boss; 2 side nodes per region; boss rematches in v1.1 |
| One win-rate band for all levels | Accepted | Bands per role (A18.7.2) |
| G and T both open the Council | Accepted | G only; T freed |
| Flag plus Sally Port needs a clamp | Accepted | Clamped to [380, 800] |
| "Tiers VII-X know enemy research" is no distinction | Accepted | Tiers differ in how they use public research (A18.5.8) |
| Economy rank I costs 200 while others cost 150 | Accepted | All rank I cost 150 |
| Capsule drops for rarely played ages feel dead | Accepted | Region and Era of the Week weighted ×2, disclosed (v1.1) |

#### Engineering and producer review

| Point | Verdict | Where, and why |
|---|---|---|
| Pacing is already data; step 2 is S | Accepted | Phase 1 is S, content only |
| Open `FormatId` instead of `MatchConfig.window` | Accepted | A18.3.4, A18.11 |
| Modifiers are symmetric; bosses, relics and research need per-side modifiers | Accepted | `SideConfig.sideMods`, the one boss addition |
| Research raising units already on the lane is a replay risk | Accepted | Research applies from spawn; shimmer is visual only |
| Stance toggle is an XS onboarding flip; the flag is M | Accepted | Phase 0 and phases 2 and 4 |
| Treasury swap, stance shape and `sideMods` in one major bump | Accepted | Phase 2, with slots and `victory` too |
| Replays break on every tuning pass | Accepted | Old replays labelled and not played; no promise (owner decision D8) |
| Tray slots typed `0..4` | Accepted | Widened in the phase 2 bump |
| Saves are ready; keep ids stable; age index shift needs a sim test | Accepted | A18.8.3, A18.11 |
| Art cost priced wrong after the ultra-realistic decision | Accepted | New ages frozen until Stone is restyled and measured; 75-150 h planning value |
| Cheap answers to "too few ages" | Accepted | Presentation names in phase 0; windows and Era of the Week |
| Council v1 cut to ~26 picks from existing kinds | Accepted | Phase 3; Fire Arrows only if a DoT exists |
| Air and Underground lines wait for the classes; second slot waits | Changed | Lines wait (phase 8); the second slot is removed entirely (player review) |
| War Path v1 cut list | Changed | Relics, star chests, paths and crowns' extras move to v1.1; crowns and card unlocks stay in v1 because they are cheap meta data and answer the player review |
| Difficulty: no new layer beyond the picker | Changed | Quick Battle uses the picker as is; the War Path needs region-relative tiers and behaviour flags, because absolute tiers collapse at the top (player review). The flags live in `raw/difficulty` data and the bot profile |
| Online: only M1 now | Accepted | A18.10 |
| Balance tool run counts | Accepted | Full War only at gates |
| Corrections list (A18.2.3, A18.4.1, A18.6.5, A18.3.2, step splits, first-pass hours) | Accepted | All applied; first pass now ~7.5 h at the shorter War Path windows |

---

### A18.16 Owner decisions

| # | Question | Recommendation |
|---|---|---|
| D1 | Slower evolving: ages of about 60-125 s instead of 30-70 s (changes Pillar 2)? | Yes |
| D2 | Match lengths: Short ~7, Standard ~10:30, Full ~15 minutes, formats as windows of 3, 5 and 7 ages? | Yes |
| D3 | Treasury disappears; money generation becomes the Economy track of the War Council? | Yes |
| D4 | New ages wait until the realistic art is proven on Stone; then Nile and Rome first. 12 ages, or 13 with Shogun? | Wait, then 13 |
| D5 | Fold Conquest into the War Path (Generals become bosses, stars carried over)? | Yes |
| D6 | Three stances (Charge, Hold at a draggable flag up to just before mid-lane, Fall back)? | Yes |
| D7 | Legendary: behaviour only, or also a disclosed head start for the AI? | Behaviour only |
| D8 | Saved replays stop playing after a balance update (their result stays, labelled)? | Accept |
