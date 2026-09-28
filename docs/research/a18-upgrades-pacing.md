# A18 research: in-match upgrades that are decisions, and pacing

Date: 2026-09-28. Input for the A18 design pass. It answers two lines of the owner's feedback: "upgrades with money are boring; there must be more ways to upgrade your troops, their abilities, how far turrets shoot, money generation" and "you evolve far too fast, you climb through the ages very quickly, matches finish too fast".

Companion reports: `docs/research/a18-classics.md` (what the classic Flash games and their peers did: role upgrade tracks, Stick War abilities, Battle Cats' Worker Cat, turret range history). This report does not repeat that; it adds how RTS and autobattler games make upgrades into decisions, measures Ageborn's pacing with the real sim, and turns both into a concrete proposal. Another agent is building the difficulty picker and a stronger AI right now; everything here assumes that work and builds on it.

Method: design literature and game knowledge (sources at the end; numbers from wikis are marked where not verified), plus headless runs of the real simulation with the tools in `tools/` (`balance --mirror`, and a scratch grid runner that plays human-like scripted proxies against the Balanced AI at tiers II, V and VIII). All runs used the working tree of 2026-09-28 (content hash `04660d28`, the AI package mid-change by the difficulty agent), so bot-strength numbers are a snapshot; the pacing mechanics they show are not.

---

## 0. Findings in one page

1. **Ages are short, and they are shortest for the player who wins.** Against the tier II AI (what a new player meets), a human-like Balanced player evolves at 0:55 / 1:42 / 2:30 / 3:07 / 3:43 / 4:36 / 5:38 and wins at 6:43. Age stays are 36-62 s. The Gunpowder and Industrial stays (31-37 s) are shorter than one Age Power charge (50 s). That is exactly "you climb through the ages very quickly".
2. **Kill XP is the accelerator and it snowballs.** The side that wins fights evolves first and the gap grows: the skilled proxy vs tier II leads by 27 s at the first evolve and 47 s at the third. XP from kills (100% of card cost) plus XP from base damage reward the leader twice.
3. **Slowing XP alone does not lengthen matches; it removes ages.** In the tier V mirror, Full War lasts 8:48 today and 8:39 with 1.5x XP thresholds and a longer clock. Lane combat and base HP decide when a base falls; a slower XP curve only means fewer ages are reached before that. Standard and Short War did get longer (9:07 and 6:34), because their endings are clock-driven.
4. **Match length against a weak opponent is set by how fast the stronger side kills a base**, not by the clock: every patch still let the skilled proxy beat tier II in 6:40-7:41. "Matches finish too fast" is mostly a difficulty problem (being built elsewhere) plus a "nothing to do per age" problem (this report).
5. **Good in-match upgrades share six traits:** they compete with something you want right now (units, evolving, the next upgrade), they lock something out (branches, one research at a time), they change what a unit does and how it looks, they create a visible power spike the opponent can read and time, they are few and large at the top and many and small at the bottom, and the AI can use them.
6. **Ageborn's only gold upgrades today (Treasury, mounts) have none of these traits except "compete with units".** Each is a linear, buy-once, invisible-on-the-lane number.
7. **Proposal: a War Council with three tracks and one research slot.** Drills per role group (3 ranks, 1 of 2 at each rank, behaviour-changing, carried across ages), Economy (Treasury becomes a branching track), and Defences (turret range or rate, base works), all researched one at a time in a visible slot, plus the already-approved evolve doctrines (A16.10) as the free pick at evolve. Roughly 6-9 purchases per Full War out of about 30 available ranks, so each match is a build.
8. **Pacing proposal:** 75-110 s per age in an even match (about 1.6-2x today), first age shortest; XP thresholds about 1.5x with less kill XP and more passive XP (compresses the snowball: the lead at the third evolve drops from 26-47 s to 2-29 s); clocks +2:00 to +2:45; and formats become age windows of 4-6 ages, because with 12+ ages no match can or should play them all.
9. **Keep:** no gold price on evolving (V2/V2b: spam wins 83-92%), no interest mechanic (feeds banking and turtling), no upgrade that touches XP, the clock, bounty rate on own half, or train time.
10. **Owner decision needed:** Pillar 2 says "evolving is the best moment" and A16.2 chose "keep evolving fast". The owner now asks for slower ages. The proposal keeps each evolve a big moment but makes it rarer and gives each age a middle.

---

## 1. Measurements: how fast Ageborn is today

### 1.1 The Balanced AI mirror (tier V vs tier V, 60 matches per format, `balance --mirror 60`)

| Format | Median length | P10-P90 | Final Bell | Evolve medians |
|---|---|---|---|---|
| Full (8 ages) | 8:48 | 5:46-10:45 | 15.0% | 1:12 / 2:07 / 2:57 / 3:28 / 4:03 / 4:53 / 5:42 |
| Standard (6 ages) | 6:58 | 5:38-8:30 | 11.7% | 1:12 / 2:07 / 2:57 / 3:28 / 4:03 |
| Short (4 ages) | 4:59 | 4:51-6:15 | 11.7% | 1:12 / 2:07 / 2:57 |

Time spent in each age (Full War, from the medians):

| Age | Stone | Bronze | Medieval | Gunpowder | Industrial | Modern | Future | Cosmic |
|---|---|---|---|---|---|---|---|---|
| A17.8 design | 52 s | 33 s | 60 s | 45 s | 50 s | 70 s | 80 s | to the end |
| AI mirror, tier V | 72 s | 55 s | 50 s | 31 s | 35 s | 50 s | 49 s | ~3:06 |
| Human-like Balanced proxy vs tier II | 55 s | 47 s | 48 s | 37 s | 36 s | 53 s | 62 s | ~1:05 (wins at 6:43) |

The middle ages (Gunpowder, Industrial) last half a minute. A player who evolves "as soon as the button glows" sees a new tray every 30-60 s and spends the first 15-20 s of each age walking new units to the front, so an age is mostly transit.

### 1.2 Human-like players against the AI (Full War, 8 matches per cell, half on each side)

Proxies from `tools/proxies.ts`: `few_then_evolve` (keeps at most 4 units alive, "a few soldiers, then evolve"), `save_counter` (the skilled player), `cheap_spam`, `balanced`. The AI is Echo (Balanced brain). P = proxy evolves, B = AI evolves.

| Matchup | Proxy wins | Median length | Bell | Proxy evolves | AI evolves |
|---|---|---|---|---|---|
| few_then_evolve vs II | 25% | 10:08 | 3/8 | 0:51 1:19 2:23 3:04 3:59 4:52 6:09 | 0:59 1:34 2:46 3:35 4:11 5:11 6:17 |
| save_counter vs II | 100% | 5:59 | 0/8 | 0:53 1:39 2:48 3:20 4:02 4:59 6:07 | 1:20 2:20 3:35 4:16 5:13 6:13 7:19 |
| balanced vs II | 88% | 6:43 | 1/8 | 0:55 1:42 2:30 3:07 3:43 4:36 5:38 | 1:11 1:58 2:56 3:46 4:59 5:47 6:59 |
| cheap_spam vs II | 63% | 9:21 | 1/8 | 0:54 1:22 2:10 2:46 3:22 4:15 5:19 | 0:59 1:29 2:26 3:13 4:07 5:38 6:19 |
| save_counter vs V | 0% | 10:45 | 7/8 | 2:18 2:54 3:41 4:28 5:17 6:23 7:13 | 2:22 2:52 3:43 4:25 5:07 6:07 7:06 |
| balanced vs V | 13% | 10:10 | 2/8 | 1:53 2:37 3:39 4:08 4:59 5:55 7:04 | 1:45 2:25 3:21 3:59 4:54 5:52 6:51 |
| any proxy vs VIII | 0-13% | 7:02-10:45 | 1-6/8 | similar to vs V | 1:01-2:19 first evolve |

Reading:

- Against tier II the player out-evolves the AI by 8-27 s at the first evolve and by 26-47 s at the third: **the leader levels faster because kill XP pays the leader**. A player who wins fights has Medieval troops against Bronze ones, which wins more fights (a 1.35x step leaves about half HP in a duel).
- Against tier V and VIII the working-tree AI already wins most games (the difficulty agent's changes), but even-strength matches (save_counter vs V) drift into the Final Bell (6-7 of 8): with no way to convert a gold lead into something other than more units, two careful players stall.
- Short War vs tier II: the proxy wins in 4:52-5:23. Standard War: 6:11-7:25.

### 1.3 Gold per match (for sizing an upgrade budget)

Tier V vs Balanced or Save-and-counter proxy, Full War, 12 matches: each side spends **7,100-11,100 gold per match, 13.6-17.3 gold per second** on average. Today's Treasury (1,100 gold for all three levels) and mounts (1,200 gold) are 10-20% of that, bought once each. An upgrade budget of **15-25% of match gold, 1,500-2,500 gold**, fits without starving armies; at 150-500 gold per rank that is 6-9 purchases per Full War.

### 1.4 Candidate XP and clock changes (`--patch`, data only)

Patches (all files in the scratchpad `a18/`, JSON merged over compiled content):

| Patch | XP thresholds (Stone to Future) | Kill XP / own-loss XP / passive | Clock (Overdrive / Siege / Bell) |
|---|---|---|---|
| base | 550 500 900 700 800 1200 1300 | 100% / 40% / 4 per s | Full 6:45 / 8:45 / 10:45 |
| x15 | 800 750 1350 1050 1200 1800 1950 | unchanged | unchanged |
| x15kc | as x15 | 70% / 50% / 4 | Short 5:00/6:15/8:00, Standard 7:00/9:00/11:00, Full 9:30/11:30/13:30 |
| x15p | as x15 | 50% / 50% / 6 | as x15kc |
| x2kc | 1100 1000 1800 1400 1600 2400 2600 | 70% / 50% / 5 | as x15kc |

**Tier V mirror** (60 per format):

| Patch | Full median (P10-P90) | Full Bell | Standard median / Bell | Short median / Bell | Full evolves |
|---|---|---|---|---|---|
| base | 8:48 (5:46-10:45) | 15.0% | 6:58 / 11.7% | 4:59 / 11.7% | 1:12 2:07 2:57 3:28 4:03 4:53 5:42 |
| x15kc | 8:39 (6:55-13:18) | 8.3% | 9:07 / 10.0% | 6:34 / 10.0% | 2:02 2:47 3:51 4:42 5:41 7:00 8:26 |
| x2kc | 9:41 (6:20-12:46) | 6.7% | 9:17 / 11.7% | 6:49 / 23.3% | 2:12 3:04 4:26 5:26 6:39 8:33 10:09 |

**Proxies vs tier II and V** (Full War, 8 per cell):

| Patch | balanced vs II: win, length, P evolves 1/3/5/7 vs AI | save_counter vs II: win, length | Lead at evolve 3 (save_counter vs II) | save_counter vs V: length, Bell |
|---|---|---|---|---|
| base | 88%, 6:43, 0:55 / 2:30 / 3:43 / 5:38 vs 1:11 / 2:56 / 4:59 / 6:59 | 100%, 5:59 | 47 s | 10:45, 7/8 |
| x15 | 75%, 9:28, 1:20 / 3:28 / 5:21 / 8:18 | 88%, 8:45 | 50 s | 10:05, 3/8 |
| x15kc | 88%, 11:08, 1:26 / 3:51 / 5:46 / 9:19 | 100%, 7:41 | 35 s | 13:30, 5/8 |
| x15p | 75%, 12:12, 1:21 / 3:45 / 5:32 / 9:20 vs 1:25 / 3:47 / 6:35 / 9:56 | 100%, 7:31 | 29 s | 13:30, 5/8 |
| x2kc | 88%, 12:29, 1:42 / 4:32 / 6:57 / 11:08 | 100%, 6:40 | 60 s | 12:36, 0/8 |

What the numbers say (small samples; direction, not verdicts):

- **1.5x thresholds lengthen age stays by about 30-50%**, not a full 50% in every age, because XP income rises with fighting; 2x lengthens them by about 60-100%.
- **The first age reacts most** (Stone 72 s to 2:02 in the mirror), because early XP is mostly passive. The first age should get a smaller multiplier than the rest, or a new player waits two minutes for the first "wow".
- **Moving XP from kills to passive (x15p) shrinks the snowball**: the Balanced proxy and tier II evolve within 2-4 s of each other through Medieval (26 s apart today). It also makes the evolve less of a skill reward; somewhere between x15kc and x15p is the right dial.
- **Clocks drive Standard and Short, combat drives Full.** A longer clock with no new decisions produces more Bells in even matches (Short x2kc: 23%). The extra time must be filled with decisions (Section 4), not only walking.
- **A dominant player still wins in 6-8 minutes** under every patch. That is fine for Easy; the difficulty picker and the AI's upgrade use (Section 5.6) set how long a close match lasts.

---

## 2. How other games make upgrades exciting

### 2.1 StarCraft II (RTS)

- **Global tiered upgrades** (Forge / Engineering Bay / Evolution Chamber): +1/+2/+3 weapons and armour per unit class. Each level costs more and takes longer (Terran Infantry Weapons: 100/100 then 175/175 then 250/250 resources, about 114 / 136 / 157 s *(Liquipedia, patch-dependent)*), and level 2 and 3 need a tech building (Armory, Lair, Hive).
- **Unit-specific research** changes behaviour: Stim (attack speed up, costs the unit HP), Combat Shield, Concussive Shells (slow), Blink, Charge, Burrow. These are the upgrades players talk about.
- **Why they are decisions:** one research building researches one thing at a time, so order matters; the gas spent is gas not spent on units; the completion moment is a **visible power spike** ("+1/+1 timing attack", "Stim timing"), and scouting the research building tells the opponent what is coming.
- **Lesson for Ageborn:** a single research slot (you cannot do everything at once), rising costs per rank, and a visible "research in progress" on the base that the opponent can read and play around.

### 2.2 Age of Empires II and IV (RTS with ages)

- **AoE II:** each age advance costs resources and takes time (Feudal 500 food, 130 s; Castle 800 food + 200 gold, 160 s; Imperial 1,000 food + 800 gold, 190 s *(wiki)*). The central strategic tension is "age up now (and be weak during the advance) or build army". Blacksmith lines (Forging / Iron Casting / Blast Furnace), economy techs (Double-Bit Axe, Horse Collar, Wheelbarrow) and civilization unique techs fill each age with purchases; a new age unlocks the next rank of every line.
- **AoE IV:** advancing is done by building **one of two landmarks**, each with a different permanent bonus. The age-up itself is a mutually exclusive choice.
- **Lesson:** "each age unlocks the next rank of every upgrade line" is the natural fit for Ageborn: upgrades become the reason to stay in an age and the reward for reaching the next. AoE IV landmarks are the same shape as Ageborn's approved evolve doctrines (A16.10). The gold price on the age-up itself is the part Ageborn tested and rejected (A16.2, V2/V2b: spam won 83-92%), because Ageborn's evolve also upgrades the base and the tray at once.

### 2.3 Teamfight Tactics (autobattler)

- **Augments:** three times a game (stages 2-1, 3-2, 4-2) each player picks 1 of 3, with limited rerolls; tiers Silver / Gold / Prismatic. A pick defines the rest of the game.
- **Economy tension:** gold earns interest (+1 per 10 gold banked, up to +5 per round), and win or loss streaks pay extra. Every round is "level up, reroll, or save". Buying XP (4 gold for 4 XP) competes with units.
- **Items:** components combine into items that you place on specific units, so an upgrade is also a positioning choice.
- **Lesson:** rare, big, 1-of-N picks at fixed moments create the story of a match; a few of them (2-3) is enough. Interest is a great tension in a turn-based game but, in Ageborn's real-time lane, banking is already the dominant play (A16.2: banking beats trickling by 21-48 points), so interest would reward turtling. Rejected for Ageborn.

### 2.4 Mechabellum (autobattler with a front line)

- Every round each side gets supply to buy units, **unit levels** (a unit type gets stronger by paying to level it) and **unit techs** (each unit type has several techs, for example extra range, anti-air shots, damage vs large targets, a shield), plus **reinforcement cards** where both sides are offered the same set and take one. Specialists chosen at the start shape the economy.
- Both boards are visible between rounds, so a tech is a public commitment the opponent answers with a counter unit.
- **Lesson:** per-unit-type techs that change a unit's job (range, anti-air, splash) turn a small roster into many builds; making the pick visible makes it a duel of reads, not a hidden stat. This is the closest peer to what Ageborn needs: a one-lane battle where the upgrade question is "what should my army become?".

### 2.5 Bloons TD 6 (tower defence)

- Every tower has **3 paths of 5 tiers**. You may take one path to tier 5 and a second path to tier 2 at most (crosspathing "5-2-0"); the third path is locked. Every tier changes the monkey's look and often its behaviour (a dart monkey becomes a Crossbow Master or a Juggernaut).
- **Lesson:** a lock-out rule is what makes a tree a decision; visible transformation at every tier is what makes it exciting to watch. For Ageborn, each Drill rank should change the units' look (a crest, a shield, flaming arrows), through the ArtProvider and the visual manifest, not only the stat line.

### 2.6 Kingdom Rush, Stick War, Battle Cats (briefly; details in `a18-classics.md`)

- Kingdom Rush: level-4 towers branch into two specialisations with their own skill buys; stars buy a permanent tree between levels.
- Stick War Legacy: in-battle research changes behaviour (Rage costs HP, Fire Arrows, Shield Wall); miners compete with army for population.
- Battle Cats: the Worker Cat is the income-vs-army decision the whole stage revolves around, because it is bought in small, frequent steps.

### 2.7 What they have in common

| Trait | Seen in | What it means for Ageborn |
|---|---|---|
| Competes with something you want now | SC2 gas, AoE ages, TFT gold, Battle Cats Worker | Paid in gold from the same purse as units; a research in progress means fewer units now |
| Locks something out | BTD6 crosspaths, KR branches, AoE IV landmarks, SC2 one-at-a-time forge | 1 of 2 at each rank; one research slot; cannot afford every track |
| Changes behaviour, and looks different | Stim, Blink, Fire Arrows, BTD6 tiers | Drill picks change what a unit does (reach, shield, slow, pierce), with a visible badge on units |
| Visible power spike to both sides | SC2 timing attacks, Mechabellum boards | Research shows on the base with a progress ring; completion is announced; both sides can time a push |
| Few big picks, many small buys | TFT augments + items; SC2 +1s + Stim | Doctrines at evolve (2 per match), Drill ranks and economy steps (6-9 per match) |
| New tier unlocks with progression | AoE ages, SC2 Lair/Hive | Rank II and III unlock with later ages: a reason to evolve and a reason to stay |
| The AI uses them | SC2, AoE AI | Utility term in A7.2; difficulty shows in upgrade timing, not only in army |

---

## 3. Constraints for Ageborn

- Determinism and data: upgrades are content tables (`src/content/research.ts`) using the A16.8 rule-mod kinds (stat multipliers by group or tag, range, attack speed, on-hit effects that already exist in unit abilities). Integer bp math. No new effect kinds without a request.
- **Never paid in train time** (A16.10: the queue never binds, so train time is a fake cost). Research time is different: it delays the benefit and shows the intent, so it is a real cost.
- **Never touch XP, the clock, own-half bounty or Treasury income multipliers of Overdrive** (the levers the stall and spam tests are tuned on).
- **Turret range stays far from midlane.** The classics broke on turret range (a18-classics finding 9). Today the cap is 480 lu of a 2,000 lu lane; the covers leave 1,040 lu between them. Any range upgrade must keep that gap at 800 lu or more (cap at most 600 lu).
- **Visible to both sides** (Pillar 4 honesty; online later). The opponent sees what you research and what you have.
- **AI-usable** and **the same rules for bots** (A7.1).
- **Screen and counter budget** (A15.13): one new HUD button, no new currency.
- Online-ready: one new command, part of the replay; no hidden state.

---

## 4. Proposal: the War Council (in-match research)

One button on the HUD, next to the gold counter (it replaces the Treasury tap target), opens a compact panel with three tracks. One research runs at a time (the "council table"); a second slot is itself a purchase in the Economy track for players who want to go wide. Everything bought is kept across evolves.

### 4.1 Ranks unlock with ages

A format's ages are split into thirds: rank I is available from the start, rank II from the format's 2nd-third age, rank III from its last-third age. For Full War (8 ages): rank I from Stone, II from Gunpowder, III from Modern. For a 4-age window: I, II from age 2, III from age 4. This makes evolving unlock choices, gives the late ages a reason to exist, and scales to any number of ages.

### 4.2 Track 1: Drills (troops), 1 of 2 at each rank, per role group

Five role groups today (Infantry, Ranged, Heavy, Anti-armor, Support); Air and Underground join when they become classes. A Drill applies to every unit of that group, including cards of later ages (the same group mapping as queue conversion, A2.4), so a Drill bought in Bronze still matters in Cosmic.

Illustrative pairs (numbers are starting points for the sim; each pair is a trade-off, and each is better against a different enemy):

| Group | Rank I (150 g, 10 s) | Rank II (300 g, 14 s) | Rank III (500 g, 18 s) |
|---|---|---|---|
| Infantry | **Shield Drill**: −20% damage from ranged attackers, −8% speed · or · **Rush Drill**: +15% speed, first hit +30% | **Second Rank**: melee can strike from the second rank (reach 1, the Medieval rule) · or · **Hardened**: +12% HP | **Veterans**: +10% damage per kill, up to 3 stacks · or · **Last Breath**: on death deals 20% max HP to adjacent foes |
| Ranged | **Long Draw**: +40 lu range, −10% attack speed · or · **Quick Nock**: +15% attack speed | **Fire Arrows**: hits set a 3 s burn (the existing damage-over-time kind) · or · **Pierce**: shots hit a second target at 50% | **Marksmen**: +25% damage vs Heavy · or · **Volley Line**: ranged units hold at the front of their group, never alone |
| Heavy | **Plated**: −15% damage from Infantry · or · **Trample**: knockback on first hit | **Bulwark**: allies behind the Heavy take −10% damage · or · **Breaker**: +25% damage to bases | **Juggernaut**: immune to knockback and pulls · or · **Siege Engine**: +20% range, −15% speed |
| Anti-armor | **Hunters**: +12% vs armored · or · **Sappers**: +12% vs turrets' targets (units within 480 lu of the enemy gate) | **Ambush**: first hit from Hold is +40% · or · **Mobile**: +15% speed | **Tank Killers**: +20% vs mech · or · **Skirmishers**: −20% damage from Infantry |
| Support | **Field Care**: heals +20% · or · **War Drums**: nearby allies +8% attack speed | **Rally**: nearby allies −10% damage taken · or · **Scouts**: reveal and mark the nearest enemy (+10% damage taken) | **Miracle**: once per age, revive the first fallen ally at 30% HP · or · **Banners**: the group's aura radius +50% |

- A Drill's look: each pick adds a small badge and a visual tweak per group through the visual manifest (shield rim, flaming arrow trail, war paint), so the lane shows the build. Art is swappable, sim timing is unaffected.
- Full War budget check: all five groups to rank III costs 4,750 gold; a typical match affords 6-9 ranks, so a player specialises in 2-3 groups. That is the "build".
- Rank III picks that add new behaviour (Veterans, Miracle, Juggernaut) need the pick-flip gate (A16.10) and exploit proxies before they ship; stat-only picks can ship first.

### 4.3 Track 2: Economy (money generation as choices)

Treasury today: three linear levels, +1.5 gold/s each. Proposed:

| Rank | Pick A | Pick B |
|---|---|---|
| I (200 g) | **Granary**: +1.5 gold/s (today's Treasury 1) | same (no choice at rank I; keeps the tutorial simple) |
| II (350 g) | **Market**: +2 gold/s | **War Spoils**: +25% bounty for kills **in the enemy half of the lane** (p > 1,000 from your gate); an attacker's income, useless to a turtle |
| III (550 g) | **Guildhall**: +2.5 gold/s and a second research slot | **Levy**: unit costs −8% (Commons only) |

- War Spoils answers A16's reason for cutting Plunder (a turtle income engine): it only pays for kills made while attacking.
- The second research slot is an explicit "go wide" option that costs a full economy rank.
- Rejected: interest on banked gold (rewards banking and turtling, A16.2), gold per second from XP, anything that multiplies with Overdrive.

### 4.4 Track 3: Defences (turrets and base)

| Rank | Pick A | Pick B |
|---|---|---|
| I (150 g) | **Watchtowers**: turret range +50 lu (cap 530) | **Quick Loaders**: turret attack speed +15% |
| II (300 g) | **High Ground**: turret range +50 lu more (cap 580; the gap between covers stays ≥ 840 lu) | **Engineers**: Modernise costs −50% and takes 0.5 s |
| III (450 g) | **Keep Walls**: base max HP +10% (applied as a bonus pool, so evolve rescaling stays simple) | **Sally Port**: units spawn 60 lu further forward and Hold line +60 lu |

- Range picks and Keep Walls must pass the turtle proxy band (A2.14: 35-45%, ≤ 50% at the Bell) with the proxy buying them. If High Ground fails it, it becomes +30 lu.
- When the stationary class (fortifications) lands, this track is where wall upgrades belong.

### 4.5 Research rules

- **Command:** `research { track, rank, pick }`. Valid if the rank is unlocked, the previous rank of that track is owned, the slot is free and gold suffices. Gold is paid at the start. Cancel refunds 75% (a misclick guard, not a trick).
- **One slot**, research time 10-18 s. The base shows a progress ring and the icon of what is being researched; the opponent's HUD shows it too (Scouted list). Completion plays a stinger and a short effect on every affected unit (the "power spike").
- **Evolve does not interrupt research.** Ascension pauses the training timer only; research continues.
- **Doctrines (A16.10) stay the free pick at evolve** and are the "few big picks" layer (2 per match). The War Council is the "many small buys" layer. Together they match the SC2 (+1s and Stim) and TFT (items and augments) pattern.
- **Tutorial and first matches:** the button appears at War Path level 3 with Economy rank I only (it is today's Treasury), Drills from level 5, Defences from level 7, doctrines from level 10 (one new thing per level, the PvZ cadence in a18-classics).

### 4.6 AI and difficulty

- A7.2 gets a `research` utility: value = (expected damage or income gain over the rest of the age) − (value of the units the gold would buy now), plus counter value against the enemy's scouted groups (Hunters vs a Heavy-heavy enemy).
- **Difficulty lives mostly here** and in timing, not in stat cheats: Easy researches late and at random; Normal follows `aiHint`; Hard picks counters and times a push to research completion; Legendary does both and uses the second slot. This is behaviour, visible, and honest (the bot has the same options).
- Generals get personalities through their research: a "Tinkerer" General goes three ranks deep in Ranged; a "Warlord" skips Economy.

### 4.7 Validation gates (tools)

- New proxies: `drill_rush` (spends all early gold on Drills), `eco_greed` (Economy to rank III first), `tech_turtle` (Defences first, Hold), `no_research` (today's player).
- Gates: `no_research` vs a researching Balanced script loses ≥ 60% (upgrades matter); no single rank-III pick changes the mirror win rate by more than ±5 points; each pair passes pick-flip ≥ 30%; `tech_turtle` stays inside the turtle band; the share of gold spent on research in the Balanced mirror is 15-25%.
- New report rows in `balance`: time in each age (median and P10-P90), the evolve lead of the match winner at evolves 1, 3 and 5, research purchases per match, and the time of each research completion relative to the next big fight.

---

## 5. Pacing proposal

### 5.1 What pacing should feel like

- **An age has three beats:** arrival (new units march out, the tray changes, 15-20 s), a middle (research, the first fight with new troops, one Age Power, 40-60 s), and a push toward the next evolve (20-30 s). That is 75-110 s. Today's 31-55 s stays leave only the arrival.
- **The first age is shortest** (60-75 s) so the first evolve arrives before a new player loses interest; the late ages are the longest (100-130 s) and hold the biggest fights.
- **Tension rises by phase**, as the existing Overdrive and Siege do, and the last age of a format is the climax, not an afterthought.

### 5.2 Format windows instead of "all ages"

With 12 or more ages planned (A18 age list), no match can play every age at 90 s each (18+ minutes). Formats become **windows of consecutive ages** (the format table already stores an age list; the tutorial already skips ages, so this is data):

| Format | Ages in the window | Target median | Last evolve | Overdrive / Siege / Bell (first cut) |
|---|---|---|---|---|
| Skirmish | 3 | 6:30 | ~3:00 | 4:30 / 6:00 / 7:30 |
| Battle (War Path default) | 5 | 10:00 | ~6:30 | 7:30 / 9:30 / 11:30 |
| Epic | 7 | 14:00 | ~10:00 | 11:00 / 13:30 / 16:00 |

- A War Path region plays its own window (for example Bronze, Egypt, Greece, Rome, Norse). The ladder and Quick Battle offer windows that start at Stone or at a chosen era.
- This removes the conflict between "more ages" and "longer ages".

### 5.3 XP: slower, less snowball, first age protected

Starting point for the sim (current 8 ages, per-age thresholds to leave the age):

| Stone | Bronze | Medieval | Gunpowder | Industrial | Modern | Future |
|---|---|---|---|---|---|---|
| 650 (×1.2) | 750 (×1.5) | 1,350 (×1.5) | 1,050 (×1.5) | 1,200 (×1.5) | 1,800 (×1.5) | 1,950 (×1.5) |

- Kill XP 100% to **70%** of card cost; own-loss XP 40% to **50%**; passive XP 4 to **5 per s**. Base-damage XP unchanged. (Between the measured x15kc and x15p patches: the evolve lead of a stronger player shrinks by about a third, and skill still pays.)
- Measured effect of the nearby patches: Full War AI mirror stays of 45-122 s, Balanced proxy vs tier II stays of 45-126 s, lead at the third evolve down from 47 s to 29-35 s.
- **Tune after the War Council lands, not before.** Research spends 15-25% of gold, which means fewer units, fewer kills and slower kill XP. Slowing XP fully first and adding research second would overshoot.

### 5.4 Evolve cost: keep it in XP

- A gold price on evolving (AoE's model) was tested (A16.2 V2/V2b) and made spam win 83-92%. Keep evolving free in gold.
- The **evolve-or-research tension** comes from gold instead: rank II and III unlock on evolve, but you pay for them with the gold that would otherwise hold the lane while you ascend. "Evolve now, research later" or "finish Fire Arrows, then evolve into Gunpowder with burning volleys" is a real timing choice without an evolve price.
- The XP cap (1.5x threshold) stays, so banking XP for a double evolve stays impossible.

### 5.5 Match length: add time where decisions are

- Clocks move with the windows (Section 5.2). Measured warning: longer clocks without new decisions raise the Bell share in even matches (Short x2kc: 23%). Clocks and the War Council must ship together.
- Close matches get longer mainly because both sides now have gold sinks that are not units (fewer mutual wipes) and a stronger AI; lopsided matches (Easy) may still end in 6-8 minutes, and that is right for Easy.
- Keep the anti-stall tools (the falling gate, Siege decay, forced march). War Spoils and Breaker give attackers new tools, which counter the extra defence from Watchtowers and Keep Walls.

### 5.6 Targets to add to A2.14 (A17.14) once the system exists

| Metric | Target |
|---|---|
| Median time in an age, Balanced mirror, Battle window | 75-110 s; first age 60-75 s; no age under 60 s |
| Evolve lead of the winner at the third evolve (Balanced proxy vs Normal AI) | Median ≤ 30 s |
| Share of gold spent on research, Balanced mirror | 15-25% |
| Research purchases per Battle-window match | 5-8 median |
| Battle window median / 80% band | 10:00 / 8:00-12:00 |
| Final Bell, Battle window, mirror | ≤ 8% |

---

## 6. Build order suggestion

1. **Data-only pacing patch** (thresholds, XP sources, clocks) behind a content switch, measured with the tools. Small. Do not ship alone (Section 5.5).
2. **Economy track** (Treasury becomes a branching track; War Spoils). Small: one command, reuses Treasury code paths.
3. **Research slot + Drills rank I-II, stat and existing-ability picks only.** Medium: command, side state, observation, HUD panel, AI utility, visuals badges, proxies.
4. **Defences track** with the turtle gates.
5. **Rank III behaviour picks**, after pick-flip and exploit gates.
6. **Format windows** together with the new ages.
7. **Doctrines (A16.10)** as the evolve pick, which the owner has already approved in principle.

Each step keeps `main` playable and reruns `balance`, `exploits` and `strength`.

---

## 7. Risks

- **Too many buttons.** The War Council must be one panel with at most 3 visible choices at a time (the next rank of each track), and the AI advisor can suggest one. Measure the attention tax (A16.2: 1 s vs 3 s decisions changed win rates by 10 points).
- **Solved builds.** Pairs that never flip become a script. The pick-flip gate and mirrored offers catch that; seeded variation of which pairs appear (per War Path node) adds variety later.
- **Turtling returns** through range and base HP. Gated by the turtle proxy band.
- **Match length overshoot.** The owner asked for longer matches, but mobile sessions and the War Path cadence want 8-12 minutes; the Epic window is the place for 14+.
- **Online balance.** Every pick is public and deterministic, so the same system works in PvP; standard levels (A16.7) keep card levels out of the comparison.

---

## 8. Scratch material

Scripts and raw outputs (not part of the repo): `/tmp/claude-0/-home-user-ageborn/e9e6071d-3409-58a6-a28d-0aba492052fd/scratchpad/a18/` (`pace.mts` grid runner: proxy vs AI tier, evolve times and gold per side; patch files `x15.json`, `x15kc.json`, `x15p.json`, `x2kc.json`; `balance --mirror 60` reports in `base/`, `m-x15kc/`, `m-x2kc/`). Reproduce with, for example:

```sh
npx tsx tools/sim-cli.ts balance --mirror 60 --matches 0 --no-scenarios --no-gate --patch <patch.json> --out <dir>
```

---

## Sources

- StarCraft II upgrades and research: https://liquipedia.net/starcraft2/Upgrades ; Stimpack: https://liquipedia.net/starcraft2/Stimpack ; timing attacks: https://liquipedia.net/starcraft2/Timing_Attack
- Age of Empires II ages and technologies: https://ageofempires.fandom.com/wiki/Age_(Age_of_Empires_II) ; Blacksmith: https://ageofempires.fandom.com/wiki/Blacksmith_(Age_of_Empires_II)
- Age of Empires IV landmarks: https://ageofempires.fandom.com/wiki/Landmark
- Teamfight Tactics augments and economy: https://leagueoflegends.fandom.com/wiki/Augment_(Teamfight_Tactics) ; https://leagueoflegends.fandom.com/wiki/Gold_(Teamfight_Tactics)
- Mechabellum units, techs and reinforcements: see `docs/research/depth-benchmarks.md` [S47]-[S50]
- Bloons TD 6 upgrade paths and crosspathing: https://bloons.fandom.com/wiki/Upgrades_(BTD6)
- Kingdom Rush, Stick War, Battle Cats and the classic Flash games: `docs/research/a18-classics.md`
- Ageborn: DESIGN A2.3, A2.4, A2.10, A2.14, A16.2, A16.8, A16.10, A15.13; `docs/design-lane-ages.md` A17.2, A17.8, A17.14; `tools/README.md`; `tools/proxies.ts`
