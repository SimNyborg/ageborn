# A18 proposal: harder, longer, deeper, and a War Path to online

**Status.** Proposal, written 2026-09-28 from the owner's playtest feedback of the same day ("fun, but too easy ... you evolve far too fast ... too few ages ... upgrades with money are boring ... matches finish too fast ... maybe add hold/attack ... a level map like Candy Crush ... online multiplayer is the final goal") and the owner directions recorded in `docs/decisions.md` (2026-09-28 evening and late). Inputs: `docs/research/a18-classics.md`, `docs/research/a18-upgrades-pacing.md`, `docs/research/a18-campaign-online.md`, DESIGN A1-A16 and `docs/design-lane-ages.md` (A17, merged in progress). Nothing here is built. Once the owner has decided the questions in A18.12, this becomes DESIGN A18 and wins over A1-A17 where they differ (A18.11 lists the edits).

**Builds on work in flight.** Another agent is now making Home and the meta visible from match 1, adding a single-player difficulty picker (Easy to Legendary, mapped to AI tiers) and making the AI stronger. This proposal does not redesign those. It says what each difficulty level changes once the War Council exists (A18.5) and how the War Path uses the picker (A18.6). Where this text names the picker's levels it assumes five: **Easy, Normal, Hard, Expert, Legendary**. Use the names the picker actually ships with.

**Hard rules kept.** No real money, no energy, no timers. Bots are labelled AI everywhere (A7.1). The sim stays integer and deterministic, and every new rule is content data (bp values in `src/content`). Art goes through the ArtProvider and visual manifest. The name of the classic Flash game is never used.

## A18. Harder, longer, deeper

### A18.1 The owner's points and where each is answered

| Owner point (2026-09-28) | Root cause (measured) | Answer | Section |
|---|---|---|---|
| "Too easy" | Tier II-V AI loses to a human-like script 88-100% (a18-upgrades-pacing 1.2) | Difficulty picker (in flight) plus AI use of the new upgrade system; a "few soldiers" proxy must lose | A18.5 |
| "You evolve far too fast" | Middle ages last 31-37 s, less than one 50 s Age Power charge; kill XP snowballs for the winner (lead of 47 s at evolve 3) | Slower XP set by position in the match, less kill XP, more passive XP; 70-120 s per age | A18.2 |
| "Matches finish too fast" | Endings follow lane combat, not the clock; nothing to spend on besides units | Longer format clocks, **plus** things to do in each age (War Council), plus a stronger AI | A18.2, A18.4 |
| "Too few ages, many missing" | 8 ages; the owner asks for Egypt, Greece, Rome, Norse, Samurai, Renaissance, Napoleonic, World War | 13 ages in three waves; formats become windows of 3, 5 or 7 ages | A18.3 |
| "Upgrades with money are boring" | Treasury and mounts are linear buy-once numbers | The **War Council**: one research slot, four tracks, 1-of-2 picks, visible to both sides | A18.4 |
| "Troops, abilities, turret range, money generation" | Not upgradeable in battle | Troops (per class, stats and then abilities), Defences (range, rate), Economy (income), Command (power charge) | A18.4 |
| "Maybe add the hold/attack option" | Stance exists but is hidden until match 4 | Three stances from match 1, a draggable Hold flag, a large HUD control | A18.7 |
| "A level map like Candy Crush ... cool opponents" | No campaign; Conquest is 9 matches | The **War Path**: 13 regions of 10 levels, boss Generals, stars, relics, harder replays | A18.6 |
| "Online multiplayer is the final goal" | Spike only (`server/`) | Milestones M0-M8 on the Cloudflare free tier, with owner steps | A18.9 |

**Design stance.** Longer matches are only good if every extra minute has a decision in it. The research is clear that a slower XP curve alone just removes ages from a match (Full War: 8:48 with today's numbers, 8:39 with 1.5x thresholds). So pacing (A18.2) and the War Council (A18.4) ship together, never pacing alone.

**Conflict with Pillar 2 (owner decision O1).** A1 Pillar 2 and A16.2 say "evolving is the best moment; keep it fast". The owner now asks for slower ages. This proposal keeps every evolve a big moment (the A12 show, a new tray, new research ranks, a doctrine pick), but makes evolves rarer and gives each age a middle: arrival, research and a fight, then the push to the next evolve.

---

### A18.2 Pacing: longer ages, longer matches

#### A18.2.1 What an age should feel like

| Beat | Length | What happens |
|---|---|---|
| Arrival | 15-20 s | New tray, Vanguard pair, new units march out, the next research rank opens |
| Middle | 40-60 s | One research, the first fight with the new troops, one Age Power cast (a second one in long ages) |
| Push | 20-35 s | Saving for the evolve, timing it against the enemy's research and power ring |

**Targets per age (Balanced mirror, any window):**

| Position in the match's age window | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th (final) |
|---|---|---|---|---|---|---|---|
| Target stay | 60-75 s | 90-105 s | 95-110 s | 100-115 s | 105-120 s | 110-125 s | to the end |
| Today (tier V mirror, Full War) | 72 s | 55 s | 50 s | 31 s | 35 s | 50 s | 49 s |

The first age stays shortest so a new player sees the first evolve by about 1:10. No age after the first may have a median under 75 s.

#### A18.2.2 XP rules (replaces the A2.4 source table and the A17.8 thresholds)

| XP source | Today | A18 |
|---|---|---|
| Passive trickle | 4 XP/s | **5 XP/s** (×2 in Overdrive and Siege, unchanged) |
| Kill by a unit, turret or unit ability | 100% of the victim's card cost | **70%** |
| Losing your own unit (not summons) | 40% | **50%** |
| Damage to the enemy base | 12 XP per 1% of its max HP | **8 XP per 1%** (the leader was paid twice) |
| Kills by powers or Last Stand | 0 | 0 |
| Underdog bonus | +50% | +50% (unchanged) |

**Thresholds follow the position in the window, not the age.** Every card costs the same in every age (A2.3), so XP income does not depend on the age. A threshold table keyed by position gives the same pacing whichever ages a window holds:

| Evolve out of the window's | 1st age | 2nd | 3rd | 4th | 5th | 6th |
|---|---|---|---|---|---|---|
| XP needed | **700** | **1,250** | **1,350** | **1,450** | **1,550** | **1,650** |
| Expected rate (XP/s, active play) | ~10 | ~12.5 | ~13 | ~13 | ~13.5 | ~13.5 |
| Expected stay | ~70 s | ~100 s | ~104 s | ~111 s | ~115 s | ~122 s |

- **Where the rates come from.** Today's active rate is 15-17 XP/s (A2.4). Kill XP at 70% and passive XP at 5 bring it to about 14-15. The War Council takes 15-25% of gold away from units, so fewer kills: about 12.5-13.5. In the first age, XP is mostly passive (5/s plus a few kills), about 10.
- **Check against the measurements.** The measured `x15kc` patch (thresholds 800-1,950, kill 70%, loss 50%) gave AI-mirror stays of 45-122 s and cut the winner's lead at evolve 3 from 47 s to 35 s. The `x15p` patch (kill 50%, passive 6) cut it to 29 s. A18 sits between the two, with the first age protected (the research's warning: 1.5x on Stone made the first evolve 2:02).
- **Tune in this order:** (1) ship the War Council, (2) measure the stays, (3) then move thresholds. Slowing XP fully and then adding research would overshoot (a18-upgrades-pacing 5.3).
- XP cap stays 1.5x the current threshold. In the final age of the window the cap is 1,650 and Overcharge (A2.4) uses 1,650 XP per +25% charge.
- Passive XP alone still reaches the second age at 2:20, so nobody is frozen in an age.
- The tutorial keeps its own thresholds (250 / 300 / 350 / 400); match 1 is unchanged.

**Gold (A2.3) changes.**

| Rule | Today | A18 | Why |
|---|---|---|---|
| Starting gold | 175 | 175 | Unchanged |
| Passive income | 6 gold/s | 6 gold/s | Longer matches already give more gold; the new sinks absorb it |
| Treasury | 3 levels, +1.5 gold/s each | **Becomes the Economy track** of the War Council (A18.4.4) | Choices instead of a linear buy |
| Kill bounty | 60% of cost | 60% (War Spoils may add +25% in the enemy half) | |
| Evolve price | none | **none** (a gold price made spam win 83-92%, A16.2) | Kept rejected |

Expected gold per side: Short ~7,000, Standard ~10,500, Full ~15,000. The War Council budget is 15-25% of that (A18.4.7).

#### A18.2.3 Formats become age windows (replaces the A17.8 format table)

With 13 ages (A18.3) no match can play them all at 100 s each. A format is now a **window of consecutive ages**. The format's length is fixed; the window's start age is chosen per mode.

| Format | Ages in the window | Evolves (expected) | Overdrive | Siege | Final Bell | Median target | 80% of matches | Label on the start screen |
|---|---|---|---|---|---|---|---|---|
| Tutorial | Stone, Medieval, Gunpowder, Modern, Future (scripted) | scripted | none | none | none | ~2:30-3:00 | - | - |
| Short War | 3 | ~1:10, ~2:50 | 5:00 | 6:30 | 8:30 | **7:00** | 5:30-8:30 | "about 7 min" |
| Standard War | 5 | ~1:10, 2:50, 4:35, 6:25 | 8:00 | 10:00 | 12:30 | **10:30** | 8:30-12:30 | "about 10 min" |
| Full War | 7 | ~1:10, 2:50, 4:35, 6:25, 8:20, 10:20 | 12:00 | 14:30 | 17:30 | **15:00** | 12:00-17:00 | "about 15 min" |
| War Path windows | 1-5 (A18.6.3) | per window | per window length (table below) | | | | | shown on the node |

War Path and custom windows use the clock of the matching length:

| Window length | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Overdrive / Siege / Final Bell | 3:30 / 4:30 / 6:00 | 4:15 / 5:30 / 7:15 | Short War | 6:30 / 8:15 / 10:30 | Standard War |

- **Validation.** Research medians: classics recommend Short ~7, Standard 10-12, Full 14-18 minutes; the pacing research proposes 6:30 / 10:00 / 14:00 for 3 / 5 / 7 ages. The targets above sit inside both. The measured warning stands: longer clocks with nothing new to do raised Short War Final Bells to 23%. The clocks ship with the War Council and the stronger AI, and the Final Bell gates (A2.14: ≤ 10% Short, ≤ 5% Full) stay.
- **Which window.** Quick Battle and Skirmish: the player picks the format and a start era (default: Stone). Ladder: Arenas 1-2 always start at Stone; from Arena 3 the window is the **Era of the Week** (seeded weekly, shown on Mode select a week ahead, the same for everyone), so the ladder visits every age. Daily Challenge: its own seeded window (Standard). War Path: fixed per level (A18.6).
- **War Plan.** A plan holds one loadout per age (13 at the end), but a match only needs the loadouts of its window. The VS screen and the pre-match check use only those; Auto-fill fills a missing loadout from the starter Commons, so a plan is never unplayable.
- **Starting in a later age.** The base starts at that age's P and HP; everything else is as at 0:00 (175 gold, empty mounts). Underdog compares global `AgeDef.index`, as A17.15 rule 4 already requires.
- **Performance (B3).** Full War up to 17:30 is 21,000 ticks. The headless budget becomes ≤ 850 ms per Full War on desktop Node, which the balance tools must be measured against (today ≤ 500 ms for 12,900 ticks).
- **Old names.** "Full War" no longer means "all ages". The Hall of Generals and titles that say "reach Cosmic" become "reach the last age of your window".

---

### A18.3 More ages

#### A18.3.1 The target list: 13 ages

The existing 8 keep their ids, cards and P values. Five are inserted where history fits. Bronze already plays as Greek antiquity (Hoplite, Phalangite, Scorpion, Gorgon Bust), so it is presented as **Bronze Age: Hellas** and answers the owner's "Ancient Greece" without a new age. Napoleonic warfare is the Gunpowder Age (Corsair, Cuirassier, Congreve Rack) and the World Wars are Industrial and Modern (Land Dreadnought, Trench Raider, Tankette); their presentation leans into those themes.

| # | Age (id) | Era and theme | P | Step | Status | Signature mechanic (new or first-time combination of existing kinds) |
|---|---|---|---|---|---|---|
| 0 | Stone (`stone`) | Tribes, beasts | 1.00 | - | exists | Basics |
| 1 | **Nile** (`nile`) | Desert kingdoms: chariots of the sun, sphinx, obelisks | 1.08 | ×1.08 | **new, wave 1** | Monuments: the first Stationary card (A16.14 walls); sandstorm power |
| 2 | Bronze (`bronze`), shown as "Bronze Age: Hellas" | Hoplites, gorgons, bronze giants | 1.16 | ×1.08 | exists | Piercing throws, damage auras |
| 3 | **Rome** (`rome`) | Iron legions: testudo, ballistae, legates | 1.22 | ×1.05 | **new, wave 1** | Formations: shield wall that takes less damage while in the front rank; siege towers |
| 4 | **Norse** (`norse`) | Raiders, longships, berserkers, runes | 1.28 | ×1.05 | **new, wave 2** | Rage (damage up as HP falls), raids that pay War Spoils-style bounty |
| 5 | Medieval (`medieval`) | Castles, knights | 1.35 | ×1.05 | exists | Reach, shields, siege damage |
| 6 | **Shogun** (`shogun`) | Feudal Japan: samurai, ashigaru, kites, fire arrows | 1.49 | ×1.10 | **new, wave 3 (owner decision O4)** | Duelists: first-strike counters, stance-sensitive units |
| 7 | **Renaissance** (`renaissance`) | Pike and shot, inventors, war wagons, early gliders | 1.65 | ×1.10 | **new, wave 2** | Inventions: a glider (light Air) and a war wagon (mobile cover) |
| 8 | Gunpowder (`gunpowder`), shown as "Age of Muskets" | Napoleonic lines, sail-age cannon | 1.82 | ×1.10 | exists | Splash artillery, first Air |
| 9 | Industrial (`industrial`), shown as "Great War" flavour | Steam, rail, landships | 2.12 | ×1.16 | exists | Mech Heavies, marks |
| 10 | Modern (`modern`) | Trenches to tanks, aircraft | 2.46 | ×1.16 | exists | Air as a regular option |
| 11 | Future (`future`) | Mechs, energy shields | 3.32 | ×1.35 | exists | EMP, time control |
| 12 | Cosmic (`cosmic`) | Star legions | 4.48 | ×1.35 | exists | Blink, motherships |

- **P values.** New ages sit at geometric steps between their neighbours, so no existing card changes: Nile = √1.16 ≈ 1.08; Rome and Norse split Bronze→Medieval in three (×1.052 each: 1.22, 1.28); Shogun and Renaissance split Medieval→Gunpowder in three (×1.105: 1.49, 1.65). **If the owner drops Shogun**, Renaissance becomes √(1.35 × 1.82) ≈ 1.57 (it is new, so its numbers can still move).
- **Small steps are a feature.** Early ages differ by 5-8% in power, so being one age ahead early matters less (a small anti-snowball), and those ages sell themselves on mechanics and look. The ×1.35 steps stay where the classics put their big jumps (to Future and Cosmic).
- **Samurai placement.** Feudal Japan overlaps the European Middle Ages and Renaissance in time. The lane is one line of history, so Shogun sits after Medieval as "the next leap in the art of war" (cavalry archers, disciplined ashigaru, fire arrows) before pike-and-shot. The alternative, a side branch a War Plan can pick instead of Medieval, breaks queue conversion and the one-line P scale and is not recommended.
- **Rejected ages:** a separate Greek age (Bronze is Greek), a separate Napoleonic age (Gunpowder is), a separate World War age (Industrial and Modern are), a Space age (Cosmic), a Contemporary/Information age (too close to Modern and Future, and drones are already Future).

#### A18.3.2 What a new age costs (content, art, audio)

Per age, as A17 set the standard: 7 units (3 Common, 2 Rare, 1 Epic, 1 Legendary), 4 turrets (2 Common, 1 Rare, 1 Epic), 2 Age Powers, plus from the Stationary class 1 Common fortification card (A16.14, when that card type ships). A loadout has 6 unit slots (owner decision 2026-09-28 late).

| Work item | Per age | Agent time (from A17.16 step 3 actuals, scaled) |
|---|---|---|
| Content tables (`src/content/raw/<age>.ts`), strings, counter matrix, schema totals | 7 + 4 + 2 (+1) cards | ~4 h |
| Unit art: Blender rigs and 3D sprite sheets, procedural fallback puppet, card stills | 7 units | ~17 h |
| Turrets, base (4 mounts, crumble states, evolve morph), Treasury/Economy art | 4 turrets, 1 base | ~7 h |
| Backdrop (3 parallax layers plus ground), palette, skyline entry | 1 | ~4 h |
| Projectiles, ability effects, 2 power effects | ~6 effects | ~4 h |
| Sound: effect sheet, music arrangement and intensity layers, evolve fanfare, key step | 1 set | ~4 h |
| AI: General plans gain the loadout; new boss General (A18.6.5) | 1 | ~2 h |
| War Path region: 10 levels as data, ★★ goals, relic set, headless win-rate check | 10 levels | ~3 h |
| Balance: per-card delta, has-an-answer, power coverage runs | 13-14 cards | ~4 h |
| **Total** | | **~50 agent hours per age (size L)**; download +3-4 MB, loaded lazily per age |

- **No new sim rule per age.** Each new age uses existing ability kinds only (A17.1 principle 5). Where a signature needs a new kind (Rome's formation, Norse rage), it is a single new `AbilityDef` kind with its own unit test, requested from WP0 and WP2 before the age's content is written.
- **Visual quality comes first** (CLAUDE.md). Each age ships only after the Playwright screenshot pass and the art-style direction the owner picks from the running style exploration (gritty, realistic, heroic).

#### A18.3.3 Waves and order

| Wave | Ages | Why this order |
|---|---|---|
| 1 | **Nile, Rome** | Explicit owner wishes; both fill the thin early part of history where new players spend most time; Nile teaches the Stationary class early (owner direction) |
| 2 | **Norse, Renaissance** | Owner wishes; Renaissance fills the long Medieval→Gunpowder jump (×1.35 today) |
| 3 | **Shogun** | Only if the owner says yes (O4) |

---

### A18.4 The War Council: in-battle upgrades with real choices

One button beside the gold counter (it replaces the Treasury tap target) opens the **War Council**. It has four tracks. Research runs in **one slot**, one item at a time. Everything researched is kept across evolves and applies to units of later ages of the same class.

#### A18.4.1 Rules

- **Command.** `research { track, group?, rank, pick }` (one new `Command` kind, part of the replay). Valid when the rank is unlocked (below), the previous rank of that track (and group) is owned, the slot is free and gold suffices. Gold is paid at the start.
- **Research time.** Rank I 10 s, rank II 14 s, rank III 18 s. Research continues through Ascension. Cancel refunds 75% (a misclick guard).
- **One slot.** A second slot comes only from the Economy rank III pick Guildhall.
- **Ranks unlock with the window** (so evolving opens choices, and late ages have a reason to exist):

  | Window length | Rank I | Rank II | Rank III |
  |---|---|---|---|
  | 1 | from start | - | - |
  | 2 | from start | 2nd age | - |
  | 3 | from start | 2nd age | 3rd age |
  | 4-5 | from start | 2nd age | 4th age |
  | 7 | from start | 3rd age | 5th age |

- **Public.** The researching side's base shows a workshop glyph with a progress ring and the icon of the item; the opponent's HUD shows it too, and finished picks join the Scouted list. Completion plays a stinger and a short flash on every affected unit: a visible power spike both sides can time.
- **Look.** Every pick has a small class badge and a visual tweak per age through the visual manifest (`research.<id>.<ageId>`, falling back to `research.<id>`): Fire Arrows are flaming arrows in Medieval and tracer rounds in Modern. The sim owns all numbers and timing; art can never change them.
- **Stacking and math.** All bonuses are integer bp. For a stat: final = card value at its level (A6.6, +5% per level) × (10,000 + Σ research bp + doctrine bp + relic bp) / 10,000, truncated. Research never changes max HP of a unit already on the lane except through the bonus-pool rule (a unit's current HP rises by the same amount as its max), so every change is clean in replays.
- **Never touches** XP, the clock, own-half bounty, train time or Overdrive income multipliers (the levers the stall and spam gates are tuned on, A16.10).

#### A18.4.2 Track 1: Troops (per class)

Each class has its own 3-rank line, bought separately. Rank I is the classic stat choice (Attack or Armour, as in the 2010 sequel); rank II unlocks an **ability**; rank III is an elite specialisation. Classes: Infantry, Ranged, Heavy, Anti-armor, Support, and later Air and Underground when they become full classes (owner direction). Epics and Legendaries count in their base role's class.

| Class | Rank I (150 g): 1 of 2 | Rank II (300 g), ability: 1 of 2 | Rank III (500 g), elite: 1 of 2 |
|---|---|---|---|
| Infantry | **Weapons**: +10% damage · **Armour**: +12% HP | **Shield Wall**: −20% damage from ranged attackers, −8% speed · **Rush**: +15% speed, first hit of each engagement +30% | **Veterans**: +8% damage per kill, up to 3 stacks · **Second Rank**: melee strikes from the second rank (reach 1, the Medieval rule) |
| Ranged | **Weapons**: +10% damage · **Long Draw**: +30 lu range, −8% attack speed | **Fire Arrows**: hits burn for 3 s (existing damage-over-time kind), 15% of hit damage per second · **Pierce**: shots also hit the next enemy within 40 lu for 50% | **Marksmen**: +25% damage vs Heavy · **Quick Nock**: +18% attack speed |
| Heavy | **Plating**: −15% damage taken from Infantry · **Weapons**: +10% damage | **Trample**: first hit knocks back 30 lu · **Bulwark**: allies within 60 lu behind it take −10% damage | **Juggernaut**: immune to knockback and pulls · **Breaker**: +25% damage to bases and structures |
| Anti-armor | **Hunters**: +12% damage vs armored · **Armour**: +12% HP | **Ambush**: first hit from Hold +40% · **Mobile**: +15% speed | **Tank Killers**: +20% damage vs mech · **Skirmishers**: −20% damage taken from Infantry |
| Support | **Field Care**: heals and shields +20% · **Armour**: +15% HP | **War Drums**: allies within 160 lu +8% attack speed · **Rally**: allies within 160 lu −10% damage taken | **Miracle**: once per age, the first own unit to die within 160 lu revives at 30% HP · **Banners**: aura radius +50% |
| Air (when a class) | **Weapons**: +10% · **Armour**: +12% HP | **Strafing Run**: +20% damage vs ground units that are moving · **Evasion**: −20% damage from turrets | **Aces**: +15% attack speed · **Heavy Payload**: bomb splash radius +30% |

- **Budget check.** One class to rank III costs 950 gold. All five classes cost 4,750. A Standard War budget of ~1,500-2,600 gold buys 6-9 items, so a player specialises in 2-3 classes: that is the build.
- **Ship order.** Rank I and rank II picks built from existing kinds (stats, range, attack speed, knockback, burn, auras, damage taken) ship first. Rank III behaviour picks (Veterans, Miracle, Second Rank, Juggernaut) ship only after the pick-flip gate (A16.10: each pair's better pick flips in ≥ 30% of sampled lane states) and the exploit proxies (A18.4.8).

#### A18.4.3 Track 2: Defences (turrets, walls, base)

| Rank | Pick A | Pick B |
|---|---|---|
| I (150 g) | **Watchtowers**: turret range +40 lu | **Quick Loaders**: turret attack speed +15% |
| II (300 g) | **High Ground**: turret range +40 lu more | **Engineers**: Modernise costs −50% and takes 0.5 s; fortification build time −40% |
| III (450 g) | **Keep Walls**: base max HP +10% (a bonus pool, so evolve rescaling stays A2.2) | **Sally Port**: units spawn 60 lu further forward and the Hold line moves +60 lu |

- **The hard range cap.** Turret range from every source (research, relics, modifiers) is capped at **560 lu** from the own gate (`battle.turretRangeHardCapLu`), 28% of the 2,000 lu lane. The gap between the two covers never falls below 880 lu (the research asks ≥ 840; the classics warn "never past 35% of the lane"). Today's cap is 480, so the upgrade is +80 lu at most and cards with range 480 gain the most.
- **Turtle gate.** The Defences track must pass the turtle proxy band (A2.14: 35-45% wins, ≤ 50% at the Bell) with the proxy buying it. If High Ground fails, it becomes +20 lu.
- When the Stationary class ships (A16.14), wall upgrades join this track.

#### A18.4.4 Track 3: Economy (money generation as choices; replaces Treasury)

| Rank | Pick A | Pick B |
|---|---|---|
| I (200 g) | **Granary**: +1.5 gold/s (today's Treasury level 1) | (no choice at rank I; keeps the first lesson simple) |
| II (350 g) | **Market**: +2 gold/s | **War Spoils**: +25% kill bounty for kills made in the enemy half (p > 1,000 from your gate); an attacker's income, useless to a turtle |
| III (550 g) | **Guildhall**: +2.5 gold/s and a **second research slot** | **Levy**: Common unit costs −8% |

- Payback at the prices above: Granary 133 s, Market 175 s, Guildhall 220 s. In a 10-minute match all pay back; in a 7-minute match rank III is a gamble.
- Economy income is never doubled by Overdrive (as Treasury today). The art keeps A2.3's per-age look (gatherers, granary, market, factory).
- **Rejected** (kept from the research): interest on banked gold (rewards turtling), gold from XP, anything that multiplies with Overdrive.

#### A18.4.5 Track 4: Command (Age Power and stance)

| Rank | Pick A | Pick B |
|---|---|---|
| I (150 g) | **Signal Fires**: Age Power charges 15% faster (50 s → 43.5 s) | **War Horns**: while Charging, ground units +8% speed; while Holding, units at the Hold flag +10% damage |
| II (300 g) | **Survey Corps**: power zones +20% wider | **Master Gunners**: power damage and heals +12% |
| III (450 g) | **Reserve Charge**: the power charge carried across an evolve rises from 50% to 70% | **Last Stand Drill**: Last Stand arms at 35% base HP (was 25%) and hits 20% harder |

- Power kills still pay 30% gold and no XP, so a power build never speeds up evolving.
- Reserve Charge weakens the A2.11 comeback cap, so it is rank III (late) and must pass the "power saved for evolve moments" exploit proxy.

#### A18.4.6 How it fits with Treasury, card levels, doctrines and relics

| System | Relation |
|---|---|
| Treasury | Removed as a separate control; Economy rank I is today's Treasury level 1. The `treasury` command is replaced by `research`; `SIM_VERSION` 3.0.0 and golden replays are re-recorded once |
| Card levels (A6.6) | Unchanged: +5% per level, from the collection. Research multiplies with them. Ranked and Daily use Standard levels (A16.7), so skill in research, not grind, decides PvP |
| Evolve doctrines (A16.10, approved in principle) | Stay the free "big pick" at 2 evolves per match; the War Council is the "many small buys" layer. A doctrine may not duplicate a research pick (Hunters as a doctrine and as an Anti-armor rank I: the doctrine keeps its −8% cost, so they stack but differ) |
| War Relics (A18.6.7) | Small permanent bonuses in single player only; count toward the same bp sums and the 560 lu range cap |
| Modifiers (A16.8) | War Path and Daily modifiers may lock a track ("No Council") or discount one ("Cheap Drills"), always disclosed |

#### A18.4.7 UI

- **Button.** A round Council button right of the gold counter, with a small ring when research is running and a dot when something new is affordable. Keyboard: **G** opens and closes it.
- **Panel.** A bottom sheet that covers the tray, never the lane; the game keeps running. Four track cards in a row, each showing only its **next** item (or a class chooser for Troops: the six class icons with their current rank pips). Tapping a card flips it to its two picks: icon, name, one-line effect, cost, time. Tapping a pick starts it. Long-press or hover shows the full rule and the "good against" hint. Unaffordable picks show the missing gold. At most 2 decisions on screen at a time (A15.13 budget).
- **Advisor.** On Easy and in the first War Path levels, one pick is outlined "Suggested" with a reason ("They have many Heavies"). Never on Hard and up.
- **Readability for the opponent.** The enemy's research icon and ring show on their base and in the top-bar enemy panel.
- **Motion** (A12): the sheet slides up in 180 ms with ease-out; the chosen pick card stamps into the slot; completion sends a shimmer along the affected units, a class badge pops on each, and the base's workshop glyph bursts. Reduce motion replaces these with fades.

#### A18.4.8 AI use and validation

- **AI utility (A7.2 addition).** Research score = m_econ or m_aggr (by track) × (expected value over the rest of the age − value of the units the gold would buy now) + counter value against scouted enemy classes (Marksmen vs a Heavy-heavy enemy, Watchtowers vs a rusher) + a timing bonus for a push planned at completion.
- **Tier behaviour** (joins the A7.3 table):

  | Tier | First research | How it picks | Push timing | Second slot |
  |---|---|---|---|---|
  | 0-I | after 1:30, then every ~90 s | seeded random among affordable | none | never |
  | II-IV | after 1:00 | the pick's `aiHint` | none | never |
  | V-VI | after 0:45 | counter scoring | pushes when a Troops rank completes | rarely |
  | VII-X | from 0:30 | counter scoring with the enemy's research known | times pushes and evolves to completions | when Economy allows |

- **Generals' personalities show in research:** Captain Kettle skips Economy and goes Infantry Rush; Mama Moss goes Defences to rank III; Baroness Ledger goes Economy to Guildhall first; Sgt. Boomsworth goes Command and Ranged; Madame Tempest goes Command to Reserve Charge.
- **New proxies (B12):** `no_research` (today's player), `drill_rush`, `eco_greed`, `tech_turtle` (Defences first, Hold), `few_then_evolve` (the owner's "a few soldiers" player).
- **Gates:** `no_research` loses ≥ 60% to a researching Balanced script; no single rank-III pick moves the mirror win rate by more than ±5 points; each pair passes pick-flip ≥ 30%; `tech_turtle` stays in the turtle band; research takes 15-25% of gold in the Balanced mirror; `few_then_evolve` wins ≤ 20% against Normal.

---

### A18.5 Difficulty in single player (on top of the picker in flight)

**Principle.** Difficulty changes **how** the AI plays, never its stats (A7.1: no stat multipliers; the classics' ×1.3 and ×2 multipliers were called "rigged"). The first step (Easy to Normal) is the smallest (the 2010 sequel's cliff was "easy way too easy, normal way too hard").

| Level | Tier offset on the node's base tier | Research | Doctrines | Other behaviour | Player help |
|---|---|---|---|---|---|
| Easy | −1 (min 0) | Late, random | Seeded chance | Never pushes before the first evolve; mistakes from the tier list | Council advisor, result tips, "Try Easy" never needed |
| Normal | 0 | `aiHint` | `aiHint` | Punishes a thin army: pushes when its army is ≥ 1.5× yours | Council advisor in War Path regions 1-2 |
| Hard | +2 | Counter scoring | Counter scoring | Uses Hold and the Hold flag; saves for counters (A16.3) | None |
| Expert | +4 | Times pushes to completions | Full scoring | Plays the wave game (A16.3, tier VIII+) | None |
| Legendary | always tier X | As Expert, uses the second slot | Full scoring | The General's personal plan at Standard L9 (disclosed on VS) | None |

- Tiers clamp to [0, X]. The node and the VS screen show the resulting tier ("AI · Rook · Tier IX").
- **No hidden bonus at any level.** If the owner later wants Legendary even harder, the only allowed lever is a **disclosed** head start on the VS screen ("General's Edge: +15% passive gold"), and a win with it earns a Legendary crown only (owner decision O5; recommended: not needed).
- **Crowns.** Each War Path level remembers the highest difficulty beaten and shows it as a crown colour on the node (Stick War's crowns): bronze Easy, silver Normal, gold Hard, jade Expert, star Legendary. Crowns are cosmetic mastery; a full region of gold crowns grants a base flag (A18.6.7).
- **Rookie AI** (A7.1) still applies to the first 20 matches of a save and is still disclosed.
- **Adaptive ladder** (A6.8) is unchanged; the picker is for War Path, Quick Battle, Skirmish and Daily (Recruit / Veteran / Warlord map to Easy / Normal / Hard).

---

### A18.6 The War Path (saga-map campaign)

The War Path is the centre of Home (owner direction). It is a scrolling map in the Candy Crush style: a winding road through one landscape per age, each node a battle, the next node always showing a big Play button.

#### A18.6.1 Size

| | Now (8 ages) | Wave 1 (10 ages) | Wave 2 (12) | Wave 3 (13) |
|---|---|---|---|---|
| Regions (one per age) | 8 | 10 | 12 | 13 |
| Levels (10 per region) | 80 | 100 | 120 | 130 |
| With Veteran and Legend Paths | 240 | 300 | 360 | 390 |
| First pass at ~8 min per match | ~11 h | ~13 h | ~16 h | ~17 h |

When a new age ships, its region is inserted at its place in history on the map. Players who are past that point see it marked "New region" and may play it at any time; nothing already cleared is locked again. Level ids are stable forever (`wp.<ageId>.l05`), so stars are never orphaned.

#### A18.6.2 The sawtooth inside a region

| Level | Role | Tier offset on the region's base tier | Window | Map marker |
|---|---|---|---|---|
| 1 | Intro: the region's new mechanic, easy setting | −1 | region window | "New" badge |
| 2 | Practice | 0 | | |
| 3 | Mix new and old (relic star) | 0 | | |
| 4 | Feature: a lane feature or objective | 0 | | |
| 5 | **Lieutenant** (mini-boss, the boss's plan at a lower tier) | +1 | | **Hard** |
| 6 | Relief: a fun modifier (Gold Rush, Double Powers) (relic star) | −1 | | |
| 7 | Ramp | 0 | | |
| 8 | Counter puzzle: the enemy plan punishes one class | +1 | | |
| 9 | **Spike** (relic star) | +1 | | **Hard** |
| 10 | **Boss General** | +2 | region window + 1 earlier age | **Boss** (crown and portrait) |

**Base tier per region on Normal:** Stone 0, Nile I, Bronze I, Rome II, Norse III, Medieval III, Shogun IV, Renaissance V, Gunpowder V, Industrial VI, Modern VII, Future VIII, Cosmic IX (boss nodes clamp at X). In the 8-age release, the eight existing regions use 0, I, II, III, V, VI, VII, VIII.

#### A18.6.3 Age windows per region

Each region's battles are fought in a window that **ends at that region's age**, so the latest age is the payoff of every level:

| Region position | 1st (Stone) | 2nd | 3rd | 4th and later |
|---|---|---|---|---|
| Normal levels | Stone only | previous + this (2 ages) | 3 ages | the last 4 ages (for example Rome region: Stone, Nile, Bronze, Rome) |
| Boss level | Stone only | 3 ages | 4 ages | the last 5 ages |

Median lengths follow the window clocks (A18.2.3): about 5 minutes in region 1, 7 in region 3, 9-10 from region 4, 10-11 for bosses. This needs `MatchConfig` to take a start age and an end age (`format.window: [AgeId, AgeId]`), which the format windows need anyway.

#### A18.6.4 Teaching one thing at a time

| Where | New thing | How |
|---|---|---|
| Stone L1 | Train, the lane, destroy the base | The existing training match vs Old Grogg becomes level 1 |
| Stone L2 | **Stance: Charge / Hold / Fall back** | Enemy rushes; winning needs Hold at the flag, then Charge |
| Stone L3 | Turret on a mount | |
| Stone L4 | Age Power, dragged onto the lane | Drag is the taught interaction (owner direction) |
| Stone L5 | First Lieutenant | |
| Stone L6 | **War Council: Economy** (Granary) | The Council button appears; its only card is Granary |
| Stone L7 | **Troops** rank I (Weapons or Armour) | Advisor on |
| Stone L8 | **Defences** rank I (turret range or rate) | Counter puzzle: enemy Ranged outranges plain turrets |
| Stone L10 | First boss: Pip Quickstep | |
| Nile L1 | **Evolving** (the first two-age match) | |
| Nile L3 | Troops rank II abilities | Unlocks in the 2nd age of the window |
| Nile L4 | **Stationary class**: walls and barricades (owner direction, early) | Nile's Monument card |
| Nile L6 | **Command** track | |
| Bronze L1 | Doctrines at evolve (when shipped) | |
| Rome L1 | Council rank III | Window of 4 ages |
| Norse L1 | **Air** as a full class | |
| Medieval L1 | **Underground** class | |
| Each later region L4 | One lane feature (A15.16, A16.9) | |
| From Nile L6 | One disclosed modifier per relief level | Each modifier appears first in an easy level |

Until Nile and Rome ship, the same lessons sit on the existing regions (Bronze region teaches evolving, and so on).

#### A18.6.5 Boss Generals

Every boss is labelled AI ("AI General"), with its tier, its personal War Plan and its research style. Bosses use the existing 9 Generals plus 4 new ones for the new ages:

| Region | Boss | Personality and research style | Signature | New? |
|---|---|---|---|---|
| Stone | **Pip Quickstep** | Balanced beginner | Opens Ranged, then Heavies | exists |
| Nile | **Queen Sethra of the Dunes** | Monument builder: Defences and walls first, Holds, bursts out with chariots | "The sands keep what they take." | new |
| Bronze (Hellas) | **Captain Kettle** | Rusher: Infantry Rush, skips Economy | "Tea's getting cold. Charge!" | exists |
| Rome | **Legate Varro Ironhand** | Drill master: two classes to rank III, Shield Wall, formation pushes timed to completions | "Close ranks. Advance." | new |
| Norse | **Jarl Ingrid Stormaxe** | Raider: War Spoils, always Charges, big pushes after every evolve | "Your gold will look good on my longship." | new |
| Medieval | **Mama Moss** | Turtle: Keep Walls, 4 turrets, pushes in Overdrive | "Nobody gets past my garden." | exists |
| Shogun | **Lady Kaede** | Duelist: switches stance often, Ambush on Anti-armor, counter-times your evolve | "Strike once. Strike true." | new (wave 3) |
| Renaissance | **Baroness Ledger** | Greedy: Guildhall first, then two research slots | "Money first. Manners later." | exists |
| Gunpowder | **Sgt. Boomsworth** | Artillery: Command and Ranged research | "Stand still, please." | exists |
| Industrial | **Ada & Ivo** | Balanced counters | "Two heads, one plan." | exists |
| Modern | **Rook** | Counter-picker; researches against your scouted classes | "I see what you brought." | exists |
| Future | **Madame Tempest** | Power timing: Command to Reserve Charge | "Wait for it..." | exists |
| Cosmic | **The Warden** | Final boss: everything, Legendaries at L9 (disclosed) | "Every age ends. Yours ends here." | exists |

**Boss rules** (all data: bot profile plus content modifiers, no special sim code):

- Boss base: +50% base HP and one extra fixed turret of the boss's age (a disclosed modifier on the VS screen).
- **Phase at 50% base HP**: a banner "The General is enraged" and a 2 s warning, then the boss switches to Charge, casts its Age Power if charged and trains its signature Legendary if it can afford it. The phase is a bot-profile rule reading the observation; nothing in the sim changes.
- New Generals each need a portrait, a VS line, a personal plan per age and a profile entry: about 2 agent hours each plus art.

#### A18.6.6 Stars, modifiers and replays

- **Three stars per level:** ★ win on any difficulty; ★★ a disclosed goal written on the node (base above 50%, win before the Final Bell, at most 3 unit types, all turrets alive, no Legendary, research at most 3 items); ★★★ win on Hard or harder. Stars never gate progress; the next region opens when its boss is beaten once on any difficulty.
- **Modifiers** (disclosed on the node and the VS screen, from the A16.8 kinds): Gold Rush (passive gold ×1.5 both sides), Double Powers (charge ×2), Iron Rain (enemy starts with a Rare turret), No Council, Cheap Drills (Troops −30%), Fog Window, Night (turret range −20%), Mud (−15% speed), Short Fuse (Overdrive 2 min earlier).
- **Veteran Path** (unlocks after the Cosmic boss): the same map, base tier +2 and one modifier per level. **Legend Path**: +3 and one restriction per level ("No turrets", "Heavies locked", "One research only"). Each path keeps its own stars.
- **Retry is free and instant.** After 3 losses in a row on a level, the result offers "Try Easy" and one A15.12 tip. The level never quietly gets easier.

#### A18.6.7 Rewards (all earned, all shown before the fight)

| Reward | Rule |
|---|---|
| First clear | Amber (40 on normal levels, 60 on Hard-marked levels); boss: a fixed capsule shown on the node (Age Capsule of the region's age in the first 3 regions, then Jade; the final boss an Aeon Capsule) |
| Star chests | Every 10 stars on a path: a chest with Amber, Dust and one cosmetic (base flag, decoration, emote or quote from the owner's cosmetic collections) |
| **War Relics** | Each region has a set of 3 relics, earned by ★★★ on levels 3, 6 and 9. A full set gives a small permanent bonus themed to the region (for example Nile: +5% Economy income; Rome: +5% Infantry HP; Renaissance: +4% turret range, still under the 560 lu cap). **Single player only**: War Path, Skirmish, Quick Battle; **never** Ladder, Daily, ranked or any PvP (A16.7) |
| Crowns | Highest difficulty beaten per level (A18.5); a region of gold crowns gives a region base flag |
| Titles | "Pathfinder" (Cosmic boss), "Veteran" and "Legend" (the paths), "Crowned" (all 3 stars on a region) |

No lives, energy, timers, boosters or paid anything (A15 red lines).

#### A18.6.8 How it fits Conquest, Home and onboarding

- **Conquest folds into the War Path** (owner decision O6, recommended). The boss nodes are the Conquest Generals. On migration, each Conquest star counts as the matching star on that General's boss node; Conquest milestones (9, 18, 27 stars) move to the star chests; the Conquest tab leaves Mode select. Nothing earned is lost (A15.1).
- **Onboarding (A8):** the first 40 minutes are Stone levels 1-6. A8's beats move onto the nodes; the staged unlocks follow A18.6.4, except the stance, which is there from level 2 (owner direction).
- **Home** (being built by the other agent): the War Path card shows the current region's art, the next node, its difficulty picker (default Normal, remembered per save) and the Play button. Quick Battle, Daily and Ladder sit around it.

#### A18.6.9 Content and save shapes

```ts
// src/content/raw/warPath.ts
interface WarPathLevel {
  id: string;                 // 'wp.nile.l05', stable forever
  region: AgeId;
  index: number;              // 1..10
  role: 'intro' | 'practice' | 'mix' | 'feature' | 'lieutenant' | 'relief' | 'ramp' | 'puzzle' | 'spike' | 'boss';
  window: [AgeId, AgeId];
  general: GeneralId;         // opponent, labelled AI
  tierOffset: number;         // added to the region base tier and the difficulty offset
  modifiers: ModifierId[];    // disclosed
  laneFeatures: LaneFeatureId[];
  goal2: StarGoal;            // the ★★ goal
  teaches?: MechanicId;       // intro card and hint
  reward: RewardSpec;         // first clear
  boss?: { baseHpBp: number; extraTurret: CardId; phaseAtBp: number };
}
```

Save (`SaveDoc` v3): `warPath: { path: 'normal' | 'veteran' | 'legend'; stars: Record<levelId, 0|1|2|3>; crowns: Record<levelId, 0..5>; relics: RelicId[]; difficulty: DifficultyId }`.

**Headless check** (`tools/warPath.ts`, WP12): plays every level with the human-limited player bot (A15.17: ≥ 300 ms per action, ≤ 12 actions per 10 s) at each difficulty. It fails the build if a tier-matched player wins a Normal level less than 45% or more than 85% of the time, or a boss less than 25%.

---

### A18.7 Stance and the rest of the feedback

#### A18.7.1 Three stances and the Hold flag (replaces the A2.7 stance rules and the A2.12 row)

| Stance | Behaviour | Button |
|---|---|---|
| **Charge** (default) | As today: units advance and fight | Crossed swords |
| **Hold** | Ground units hold at the side's **Hold flag**: units beyond it with no target walk back at 70% speed; units behind it do not pass it; engaged units keep fighting | Flag |
| **Fall back** | Ground units with no target walk back to p = 200 (inside turret cover) at 100% speed, then hold there; engaged units disengage after their current attack | Shield |

- **The Hold flag.** Default at p = 320 (today's hold line). While Hold is active, the player drags the flag on the lane or the minimap to any p in [320, 1,000] (up to mid-lane), snapped to 20 lu. Command `stance { mode, holdP? }`; the sim clamps holdP. Holding mid-lane is a real strategy (deny the middle, protect a Support line); holding at home is safe.
- **Always visible from match 1** (owner direction): a three-segment control above the tray on the right, 48 px tall on phones, with keyboard **S** (toggles Charge and Hold, as today) and **Shift+S** (Fall back). D (fortifications), F (speed) and the other A2.12 and A17.4 keys keep their meanings; T now opens the Council on the Economy track. The stance also shows as a small flag over the own front.
- Air gunships obey stance; the bomber does not (unchanged).
- **AI:** Hold at the flag when the push gate fails, placed just inside where its turrets cover or where its army value is highest; Fall back when myArmy < 0.5 × foeArmy and the enemy is past mid-lane; tiers 0-II never move the flag.
- **Taught** at War Path Stone L2 (A18.6.4) and linked to the Command pick War Horns.

#### A18.7.2 The rest of the owner's wishes: where they land

| Wish | Plan |
|---|---|
| "You win by spawning a few soldiers" | The stronger AI (in flight) plus the `few_then_evolve` gate (≤ 20% vs Normal) and "punishes a thin army" on Normal and up |
| Collection with many cards and rarities | 13 ages bring 91 units, 52 turrets, 26 powers; cosmetic collections (flags, emotes, quotes, base skins) come from star chests and relics too |
| Strategy over clicking | The War Council, stances with a flag, doctrines, readable enemy research |
| Fortifications (Stationary class) | Nile teaches it at L4; each age gets one Common fortification card; wall upgrades live in the Defences track; A16.14's anti-turtle limits apply |
| Underground layer | A class with its own Troops line, taught at Medieval L1 (A16.15) |
| Lane features | One per region from L4 (A15.16, A16.9) |
| Clans and friends | Online milestones M6 and M8 (A18.9) |
| Home village | v1.1 as decided (A16.22); the War Path map and village share the Home screen |
| Six troops per loadout, clear deck builder, class icons and counters | Owner directions already recorded; A18 assumes them |
| Beautiful art | Each new age ships only after the screenshot pass and in the owner's chosen style; research picks change unit looks |

---

### A18.8 Architecture and contract changes

| Area | Change | Owner WP |
|---|---|---|
| Contracts | `Command` gains `research { track, group?, rank, pick }` and `stance { mode, holdP? }` (replaces the Treasury command and the old stance toggle); `Observation.me/foe.research` (owned picks, current item, progress); `SideState.research`, hashed; `SimEvent` `researchStarted`, `researchDone`; `MatchConfig.window: [AgeId, AgeId]`; `AgeId` gains `nile`, `rome`, `norse`, `renaissance` (and `shogun`); `DifficultyId` | WP0 |
| Content | `raw/research.ts` (tracks, picks, bp effects, `aiHint`), `raw/warPath.ts`, `raw/warRelics.ts`, `raw/difficulty.ts` (tier offsets, behaviour flags), window-position thresholds and clocks in `raw/economy.ts`, new generals and ages | WP1 |
| Sim | Research slot and timers; bonus pools applied through the A16.8 rule-mod kinds; turret range hard cap 560; three stances and holdP; window start age; `SIM_VERSION` 3.0.0 with one golden re-record | WP2 |
| AI | Research utility, stance flag placement, difficulty behaviour flags, boss phase rule | WP3 |
| Visuals | Research badges and per-age tweaks in the manifest, workshop glyph, completion shimmer, Hold flag, new ages' art | WP4 |
| Render and HUD | Council button and sheet, enemy research ring, stance control, draggable flag on lane and minimap | WP5 |
| Meta, save, UI | War Path rules, stars, crowns, relics (PvE-only switch), Conquest migration, Era of the Week, `SaveDoc` v3 migration; War Path map screen, node sheet, difficulty picker on nodes | WP7, WP8, WP9 |
| Tools | Proxies, gates, time-in-age rows, `tools/warPath.ts`, the 850 ms Full War budget | WP12 |

**New A2.14 rows** (once the systems exist):

| Metric | Target |
|---|---|
| Median stay per age, Balanced mirror | Per A18.2.1; no age after the first under 75 s |
| Winner's evolve lead at the 3rd evolve (Balanced proxy vs Normal) | Median ≤ 30 s |
| Short / Standard / Full median | 7:00 / 10:30 / 15:00 (80% bands in A18.2.3) |
| Final Bell | ≤ 10% Short, ≤ 8% Standard, ≤ 5% Full (mirror) |
| Research share of gold, Balanced mirror | 15-25% |
| Research items per Standard War | 5-8 median |
| `few_then_evolve` vs Normal | Wins ≤ 20% |
| War Path levels | Normal 45-85%, bosses ≥ 25% (tier-matched player bot) |

---

### A18.9 Online multiplayer: the final goal

Single player leads there directly: the sim is integer, seeded and hashed, replays are command logs, every War Path match is a determinism test, the Generals become the labelled AI fill, and relics and card levels stay out of PvP (Standard L8).

**Netcode (A16.21 and the `server/` spike; D1's Colyseus line is superseded).** One Cloudflare Durable Object per match relays commands: the room stamps each command at server tick + 4 (200 ms, adaptive 4-8), sends frames every 2 ticks and compares state hashes every 20 ticks. On a mismatch the room re-simulates the command log and the side that disagrees loses. Reconnect replays the stored log, 60 s grace. PvP: no pause, no speed, Standard L8, research and stance fully public (they already are).

**Free-tier capacity** (Cloudflare Workers Free, checked 2026-09-28: Durable Objects 13,000 GB-s duration and 100,000 requests a day, D1 hard daily caps; going over gives errors, never a bill). A room with its own tick timer is never idle, so duration is the limit, and **A18's longer matches reduce it**:

| Online format | Median | GB-s per match | Matches a day | Recommendation |
|---|---|---|---|---|
| Short War (3 ages) | 7:00 | ~53 | ~245 | Ranked default |
| Standard War (5 ages) | 10:30 | ~79 | ~165 | Friend Duel and casual |
| Full War (7 ages) | 15:00 | ~113 | ~115 | Friend Duel only |

A client-clocked relay (the room hibernates between messages) roughly doubles these numbers; M0 measures whether it is worth the code. A daily guard closes ranked near 90% of the budget ("Online is full for today, play the AI or try after 02:00").

**Milestones.**

| # | Milestone | Size | Exit test | Owner action |
|---|---|---|---|---|
| M0 | Spike measurements (in progress) | S | 100 bot matches, 0 desyncs; GB-s, requests and CPU per match written to `docs/online-spike.md`; whether Free caps DO CPU at 10 ms | None |
| M1 | Same results in every browser engine: sim as a workspace package, golden replays and fuzz in Chromium, Firefox and WebKit in CI | M | CI green on 3 engines | None |
| M2 | **Friend Duel** by code: room on workers.dev, reconnect, desync disputes, capacity guard, online e2e | L | Owner plays PC vs phone; 0 desyncs in 200 CI matches | Create the Cloudflare account and the two GitHub secrets (steps below); test on two devices |
| M3 | Accounts and cloud save: anonymous device keys, transfer code, D1, conflict screen | M | Save moves between two devices | None |
| M4 | Casual matchmaking: matchmaker DO, queue per build, labelled AI after 20-30 s, block and report, emotes only | M | Two strangers paired within 30 s or a labelled AI | Decide the public server name |
| M5 | Ranked: Glicko-2 plus trophies, server-granted rewards and capsule rolls, rate caps, win-trade limits | L | Rating moves only human vs human; a tampered client loses its disputes | Decide how to do the lawyer review for minors (it may cost money: owner's call) |
| M6 | Friends and leaderboards, Daily leaderboard with server re-simulation | M | An edited replay is rejected | None |
| M7 | PWA install on phones; store apps only if the owner pays (Apple $99 a year, Google $25 once; conflicts with the free-only rule) | S (PWA) | A browser and an installed player finish a ranked match | Decide PWA-only or stores |
| M8 | Clans, warbands, 2v2 co-op vs AI, then 2v2 PvP | XL | Per A16.21 | None |

**Owner steps for M2 (exact).**

1. Go to dash.cloudflare.com, sign up with your email and confirm it. Stay on the Free plan. Do not add a payment method.
2. In Cloudflare: My Profile, API Tokens, Create Token, template "Edit Cloudflare Workers", choose your account, Create. Copy the token. Copy the Account ID from the Workers & Pages overview (right side).
3. On github.com/SimNyborg/ageborn: Settings, Secrets and variables, Actions, New repository secret. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. When told the Friend Duel is live: open the game on your PC and your phone, press Online, Friend Duel, share the code, play a match, and report lag or anything that looks out of sync.

---

### A18.10 Build plan

Each step keeps `main` playable and reruns `balance`, `exploits` and `strength`. Sizes: S ≤ 1 day of agent work, M 1-3, L 3-6, XL more.

| Step | What | Size | Depends on | Why here |
|---|---|---|---|---|
| **1** | **Stance from match 1**: three stances, the Hold flag, the HUD control, AI flag placement, tutorial beat | S-M | the picker in flight | The owner asked for it; cheap; teaches control early |
| **2** | **Format windows and pacing data**: `MatchConfig.window`, window-position thresholds, new XP sources, new clocks, Era of the Week, the 850 ms budget. Behind a content switch, **not shipped alone** | M | - | Needed by the Council's rank unlocks and by the War Path |
| **3** | **War Council core**: research slot, Economy (Treasury migrates), Troops ranks I-II, Defences ranks I-II with the 560 lu cap, Command rank I; AI utility and tier table; HUD button and sheet; enemy research ring; badges; proxies and gates. Ships **together with step 2** | L | 2 | The biggest answer to "too easy, too fast, boring upgrades" |
| Owner check | Play Short and Standard War on Normal and Hard | - | 1-3 | Confirms "longer and harder" before content is built on it |
| **4** | **War Path v1 on the 8 existing ages**: map screen, 80 levels as data, stars, crowns, modifiers, the 9 Generals as bosses with phases, relics (PvE only), Conquest migration, `tools/warPath.ts` | L | 2, 3, Home in flight | The owner's centrepiece; uses only existing ages |
| **5** | Council rank III, Command II-III, doctrines at evolve (A16.10) | M | 3 | Behaviour picks need the gates first |
| **6** | **Ages wave 1: Nile and Rome** (content, art, audio, 2 regions, 2 new Generals), with the Stationary card in Nile | 2 × L (~100 agent hours) | 4; art style chosen | Owner's named ages, early history |
| **7** | Veteran and Legend Paths | S | 4 | Triples campaign length as data |
| **8** | Ages wave 2: Norse and Renaissance | 2 × L | 6 | |
| **9** | Ages wave 3: Shogun (if O4 = yes) | L | 8 | |
| **Online track (parallel from step 3)** | M0 finish, then M1 (cheap, protects cross-play), then M2 Friend Duel after step 4; M3-M8 after | M1 M, M2 L | owner's Cloudflare steps for M2 | Final goal; M1 early because it guards everything |

**What comes first:** steps 1-3 as one phase (Pacing and Council), then the owner plays, then the War Path. New ages come after the War Path, because more ages are only worth their art cost once each age is long and full of decisions.

---

### A18.11 Edits to other sections when merged

A1 (Pillar 2 wording, match lengths), A2.3 (Treasury → Economy), A2.4 (XP sources, thresholds by position), A2.7 and A2.12 (stances, Hold flag, keys G, T and Shift+S), A2.8 (range cap 560 from all sources), A2.10 and A17.8 (format windows and clocks), A2.11 (Reserve Charge note), A2.13 (match flow), A2.14 and A17.14 (new rows), A3 (loadouts per window, Era of the Week), A6.3 (ladder windows), A6.10 (Conquest folds into the War Path), A7.2-A7.4 (research utility, tier columns, Generals' research styles, 4 new Generals), A8 (onboarding on War Path nodes; stance at level 2), A9 and A9.2 (War Path screen, Council button and sheet, stance control), A11-A13 (new ages, research badges, sounds), A14 (ids), A16.10 (doctrines beside the Council), A16.14 (Stationary schedule), A16.21 and D1 (milestones, capacity with longer matches), B3 (tick budget), B15 (contracts).

### A18.12 Owner decisions

| # | Question | Recommendation |
|---|---|---|
| O1 | Slower evolving changes Pillar 2 ("evolving fast"). Accept ages of about 70-120 s? | Yes |
| O2 | Match lengths: Short ~7, Standard ~10:30, Full ~15 minutes, with formats as windows of 3, 5 and 7 ages? | Yes |
| O3 | Remove Treasury as its own button and make it the Economy track of the War Council? | Yes |
| O4 | 12 ages, or 13 with Shogun (feudal Japan after Medieval)? | 13, in wave 3 |
| O5 | Legendary difficulty: behaviour only, or also a disclosed "General's Edge"? | Behaviour only |
| O6 | Fold Conquest into the War Path (bosses = Generals, stars carried over)? | Yes |
| O7 | Three stances (Charge, Hold at a draggable flag, Fall back) instead of two? | Yes |
| O8 | Online: stay browser and PWA only (free), or pay for store apps later? | PWA first; decide at M7 |
