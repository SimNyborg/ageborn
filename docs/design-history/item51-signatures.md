# Queue items 51 and 52: a signature for every troop, counters you can see, and formations (design pass)

Date: 2026-11-03. Lead game designer's pass for owner queue item 51 (with the owner's addendum of the same day) and item 52; nothing here is built. The orchestrator's decisions of 2026-11-03 are applied: the core families first, raiders with clear tells and a hold-back order, Momentum on the starter Heavies, rollout by match window (drop 1 is Stone, Bronze and Medieval), item 51's own `SIM_VERSION` 11.0.0, the Legion in drop 1, and War Hounds that leap. The owner approves the direction from the Danish summary before anything is built.

Inputs: `CLAUDE.md`; `docs/owner-queue.md` items 5, 8, 12, 13, 14, 29, 42, 45, 51, 52; DESIGN A2.6-A2.7, A2.14, A5, A16.15, A16.17, A17, A18.2-A18.5, A18.9, A18.12, B3, B5, B15, B16; `docs/research/unit-abilities.md` and `docs/research/unit-synergies.md` (written for this pass); `genre-peers.md`, `meta-collection.md`, `depth-audit.md`, `depth-benchmarks.md`, `depth-architecture.md`, `battle-feel-audit.md`; `docs/design-history/item12-upgrade-paths.md`, `item42-gold-building.md`, `item45-testudo.md`, `item47-art-audit.md`; the content in `src/content/raw/<age>.ts`, the counter matrix `src/content/generated/counters.json`, and the sim (`src/sim/systems/{abilities,combat,movement}.ts`, `src/sim/damage.ts`, `src/sim/rules.ts`). Measurements were made on the item51-design tree with small scratch scripts (no match sims were run: the machine is shared with the art tracks).

---

## Til ejeren (kort på dansk)

**Hvad ændrer sig for en spiller.** I dag ligner mange tropper i samme tidsalder hinanden: de har forskellige tal, men vinder og taber mod de samme ting. Med denne plan kan hver trop én tydelig ting, som man kan se ske på slagmarken, og hver trop er stærk mod nogle og svag mod andre af en grund, man kan se og lære. Tropperne arbejder også sammen af sig selv, når de står tæt: skjolde låser sig sammen til en mur, spyd stikker hen over skjoldene, ryttere rider i kile, og musketerer knæler og skyder i linje. Fjenden kan bryde det med kanoner, buer i høj bue, spring og skub. Ingen trop skifter navn, tegning eller sjældenhed.

**Fem eksempler, før og efter:**

1. **Tuskback** (Stenalder). Før: første slag i hver kamp slår dobbelt. Efter: den skal have løbet et stykke frit, så sænker den hovedet, sætter farten op og rammer dobbelt. Bliver den bremset eller stoppet, mister den farten. Svar: spydjægeren, der står fast, bolaskasteren, der bremser den, eller to billige ulve, der tager stødet.
2. **Hide Shield** (Stenalder). Før: tager lidt mindre skade fra skud. Efter: skjoldet dækker også de skytter, der står lige bag det, og to skjolde side om side bliver til en skjoldmur. Svar: kastespyd i høj bue og sten fra himlen går hen over skjoldet, og Boulder Hurler smadrer det.
3. **Torch Runner** (Stenalder). Før: hurtig og dobbelt skade på basen, men den slås med alt på vejen. Efter: den løber forbi fjendens skytter direkte mod basen, og man ser og hører den smutte forbi. Kun en trop, der kæmper tæt på, kan stoppe den.
4. **Woolly Rhino** (Stenalder). Før: en tung trop, der rammer to på én gang. Efter: den tykke pels gør hvert slag lidt svagere, så små slag og småsten preller af. Store slag knuser den stadig.
5. **Fusilier** (Krudtalderen). Før: en musketer, der skyder. Efter: to side om side danner en skudlinje, hvor den forreste knæler, og begge rammer hårdere. Kommer fjendens ryttere, danner de en firkant med bajonetterne frem og holder dem væk, men så skyder de langsommere og er et let mål for kanoner.

**Én ny trop:** Legionen i Bronzealderen, fire romere, der låser skjoldene til en skildpadde under pile og sten (punkt 45).

**Sådan kommer det ud:** i tre dele, så ingen kamp blander gamle og nye regler i sine første tidsaldre. Først Sten, Bronze og Middelalder med Legionen, så Krudt og Industri, så Moderne, Fremtid og Kosmos. Hver del afprøves med tusindvis af automatiske kampe, før den udgives.

**Hvad du skal beslutte:**

1. Er retningen rigtig: én tydelig evne pr. trop, modtræk man kan se, og formationer, der dannes af sig selv? Anbefalet: ja.
2. Løberne løber forbi skytterne mod basen. Gør det de første kampe for tilfældige for nye spillere, holder vi det tilbage på Stenalderens og Bronzealderens løbere først. Anbefalet: ja, med den sikring.
3. Første del (Sten, Bronze, Middelalder og Legionen) koster cirka 38-46 agentdage, hele planen cirka 82-102. Skal vi gå i gang med første del, når du har set planen? Anbefalet: ja.

---

## 0. Summary

- **The problem, measured.** Of 167 troop rows (160 collectable cards and 7 hidden ones), 65 have no ability; the rest mostly share a support's follow rule (29) and the Anti-heavy class's Brace (16), which are class rules rather than identities. In the counter matrix, **46 of 1,520 same-age card pairs are "counter twins"**: their duel profiles correlate at 0.95 or more (Bonker and Pelt Rager 0.996, Walker Mech and Crab Mech 0.994, Star Legionnaire and Crystal Guard 0.997). A player cannot learn what makes them different, because nothing does.
- **The approach.** Research across lane battlers, RTS games, tactics games and MOBAs (`docs/research/unit-abilities.md`) found that counters players learn by watching come from **shot geometry and interactions** (a shield stops straight shots but not lobbed ones; a stun spoils an aimed shot; a cheap unit eats a charge), and that **resets, blocks and baits beat percentages**. Ageborn already has a small triangle of multipliers; the new depth comes from mechanics with a visible tell.
- **43 mechanic families** cover the 160 cards; every age uses 20 distinct ones, so **no two cards of one age share a signature**. 16 families are new or extended sim kinds; the rest exist today. About 80 cards keep their mechanic (some re-tuned), about 80 change.
- **The core families** (drop 1): Momentum (a run-up charge that replaces "first hit of each engagement"), Cover (a shield that also covers the troops just behind it from straight shots, while arcs pass over), Hardened (flat armour per hit), Shatter (breaks shields, ignores cover and armour), Shove (every third hit knocks back and spoils a windup), Aimed Shot (a long visible aim, spoiled by a shove or stun), Raider (runs past enemy shooters for the base; only melee stops it), War Cry (a periodic horn, tune or fanfare that boosts allies), and Siege range (item 5).
- **Formations (item 52)** form by themselves from one rule (neighbours in the side's file within 48 lu): Shield Wall, Phalanx (spears behind shields), Wedge (chargers together), Pack (beasts), Firing Line (the front rank kneels), Square (line infantry against cavalry), and the Legion's Testudo. Each has a pose, a bonus inside the A18.2 caps and a counter (splash, arcs, divers, shoves, hooks).
- **Counter matrices per age** (section 6): every threat has at least two answers in its own age at different costs, and each card names its counter in its card text and Info preview.
- **One new troop**: the Legion (Bronze Epic squad of four, item 45). Every other counter role is filled by existing cards without losing their identity; the one gap (Medieval could reach enemy artillery only with artillery and powers) closes by letting the Kennel Master's War Hounds leap the front.
- **Rollout in three drops by match window**: drop 1 is Stone, Bronze and Medieval with the Legion (`SIM_VERSION` 11.0.0); drop 2 Gunpowder and Industrial plus the three drop-1 Legendaries' showpieces; drop 3 Modern, Future and Cosmic. Each drop stands on its own: its sim kinds, content, gates, AI and art.
- **Gates**: per-card win rate within ±3 (smoke ±6), every card's named counter scoring at least 60 against it, two answers per threat, no counter twins among fighting cards (r < 0.92), new exploit proxies (`raider_rush`, `cover_ball`, `formation_ball`, `mono_momentum`, `mono_hardened`, `siege_turtle`; later `tunnel_rush`), each formation worth +2 to +8 points, and every existing pacing, Bell, spam and performance row unchanged.
- **Effort**: about 38-46 agent-days for drop 1, 26-32 for drop 2, 18-24 for drop 3 (82-102 in all); per-card tuning on a machine shared with the art tracks is the long pole.

---

## 1. The goal

### 1.1 In the owner's words

> "All the units must be more unique, especially in their attacks and abilities and advantages and disadvantages and so on, like in Clash Royale, where every unit has very unique properties that you get to know as a player and form preferences for." (item 51, 2026-11-03)

> "Research thoroughly, from other games and your own brainstorm, what kinds of unique abilities and attacks exist. Then give them to the existing troops, and you may make new ones. The point is to make it even more tactical, so the different troops counter each other better." (item 51 addendum, 2026-11-03)

> "Think more about how the troops work together strategically. Brainstorm and research it. For example, several Romans with shields form a tortoise, and several of Napoleon's troops form firing formations where the front rank kneels and fires so the rear can fire over them, and so on." (item 52, 2026-11-03)

### 1.2 What "done" means

1. **Every troop has a signature**: one mechanic with a visible tell, one clear strength and one named counter, explained by a one-line card text and shown in the Info preview (item 25).
2. **No two cards of one age share a signature**, and same-class cards of an age no longer win and lose against the same things.
3. **Every age has a working counter web**: each threat has at least two answers in its own age at different costs, for reasons a player can see.
4. **Troops work together**: formations that form by themselves when troops stand close, and combos between roles, each with a counter.
5. **Commons stay simple**; Epics and Legendaries get the showpieces.
6. **Names, roles, rarities and art stay**; only mechanics change (plus clips that the art round renders in the same sitting).
7. **Measured first**: the headless gates hold before each drop ships.

---

## 2. Today, measured

### 2.1 Abilities in the content

The contract (`AbilityDef`, `src/contracts/content.ts`) has 18 ability kinds plus a rich `AttackDef` (splash, pierce, cleave, chain, line, gate zone, cone, volley, scatter, on-hit statuses, drag, pull, priority). The queue's count of "36 kinds" was a text count that included the status kinds inside auras. What matters for players:

| Today | Rows |
|---|---|
| No ability at all (some have an attack shape: cleave, chain, pierce) | 65 of 167 |
| Support follow rule (a class rule) | 29 |
| Brace (the Anti-heavy class rule) | 16 |
| "Guard" resist against range 100+ (one per age, plus the Medieval and Cosmic starters) | 9 |
| First-hit bonus (all eight starter Heavies have it or a variant) | 10 |
| Raider (double damage to bases, fast) | 8, one per age |
| Squad (2-3 bodies) | 8, one per age |

### 2.2 Counter twins

For every pair of cards in the same age, I correlated their rows and columns of the counter matrix (`counters.json`: equal-gold 1v1 group duels on the real sim). Pairs at 0.95 or more win and lose against the same cards:

| Age | Pairs ≥ 0.95 | Strongest examples |
|---|---|---|
| Stone | 11 | Bonker ~ Pelt Rager 0.996; Hide Shield ~ Pelt Rager 0.985; Woolly Rhino ~ Cave Bear 0.984; Tuskback ~ Woolly Rhino 0.976; Bonker ~ Torch Runner 0.965 |
| Bronze | 9 | the three supports ~1.0 (duels cannot see supports); Hoplite ~ Shield Bearer 0.983; War Chariot ~ War Elephant 0.979; Rhodian Slingers ~ Discus Thrower 0.969 |
| Medieval | 8 | Longbowman ~ Crossbowman 0.985; Destrier ~ Greatsword 0.983; Footman ~ Flailman 0.982 |
| Gunpowder | 3 | Coehorn Crew ~ Rocket Cart 0.982; Drummer Boy ~ Bagpiper 0.979 |
| Industrial | 1 | Steam Golem ~ Steam Tractor 0.966 |
| Modern | 3 | Commando ~ Bulldog Sergeant 0.990; Trench Raider ~ Commando 0.968 |
| Future | 4 | Walker Mech ~ Crab Mech 0.994; Photon Knight ~ Barrier Trooper 0.986 |
| Cosmic | 7 | Star Legionnaire ~ Crystal Guard 0.997; Mothership ~ Star Fighter 0.988; Star Legionnaire ~ Void Skimmer 0.986 |
| **All** | **46 of 1,520** | |

Supports (and air units against ground) look alike in single-card duels because the duel cannot show auras, heals or flight; the gate in 10.6 therefore applies to fighting cards only.

### 2.3 The slot template

Every age has the same 20 slots (the X0 waves built it): starter Infantry, Ranged and Heavy Commons; the starter Anti-heavy Rare; two support Rares and a third Rare; a squad, a "guard", a raider, a second ranged Common and a second Heavy Common; a Long range Rare; a second Anti-heavy Rare; four Epics; two Legendaries. The sub-archetypes (guard, raider, squad) are real ideas, but their mechanics are too weak to change who beats them (a guard's −25% from range 100+ or a raider's double base damage barely moves a duel). This design keeps the slots and gives each a mechanic strong and visible enough to change its counters.

### 2.4 What already works

Leap (five skirmisher Epics), Riders, Summons, Daze and Time Stop, Dread auras, Long range with landing markers and ranks, Squads, Siege, Air, Call-ins, Frenzy, Death Blasts and Chain. These stay; most only get a sharper card text and a named counter.

---

## 3. Principles

### 3.1 What a signature is

- A **family** is a rule the sim runs (one sim kind with parameters, content data). A **signature** is a card's family with its parameters and age flavour ("Gore" is the Tuskback's Momentum; "Lance" the Destrier's).
- A signature has a **tell** (an event or a pose), a **strength** (what it beats and why), and a **counter** (the cards or classes that beat it and why). The card text names the mechanic in one line; the Info preview shows it happening with a "Strong:" line and a "Weak:" line.
- **Class rules are not signatures**: Brace and ×3 for Anti-heavy, the follow rule for Support, Blunt for melee Infantry, ranks for ranged troops. A card's signature sits on top of its class.
- **Within an age, no two cards share a signature.** The one family that appears more than once in an age is Flying: its three variants (gunship, carpet bomber, dive bomber) are separate signatures with separate tells and counters, and Modern, the air age, uses all three. Across ages, families repeat with age flavour, so a player learns a family once and recognises it in every age.

### 3.2 Readability on a phone (844 x 390, up to 80 units)

From `unit-abilities.md` section 4:
1. One mechanic, one tell: a short event tell (at most about 400 ms) and, where it changes how to fight it, a pose.
2. Persistent state only when it decides the fight, at most one state icon per unit (priority: burrowed, aiming, charging, burning, shielded, raging), only on units in view.
3. Telegraph every big hit (aim lines, surfacing cracks, dive shadows, call-in markers).
4. Shot geometry is visible: arcs stay arcs; a stopped straight shot glances off the shield.
5. Never colour alone; Lite keeps tells as sprites without particles; Reduce motion keeps poses and icons.
6. The lane shows the mechanic; the card text and Info preview teach it.

### 3.3 Counters by geometry and interaction

- **Geometry**: straight shots against arcs (Cover and lobs), along the line against from above (call-ins), in front against behind (cone, pierce, reach), small against large or braced (Overrun, Shove, Hook).
- **Interaction**: resets (a shove or a stun spoils an aim and empties a charge or a ramp), blocks (only melee stops a raider; braced or large units stop an overrun), baits (a cheap squad eats an aimed shot or a charge), switches (an EMP turns hardlight cover off).
- **Numbers stay modest**: new type multipliers stay within ±25% (A16.17); only the existing triangle keeps ×2-×3. Every reduction obeys the A18.2 floor (no unit takes less than 65% of a hit), except the Legion's testudo (item 45's narrow exception).
- **No randomness, no hard immunity, no stealth**: every mechanic triggers on a rule the player can see.

### 3.4 One strength, one named counter, two answers

Every card names one counter (a card or a class of its age) in its "Weak:" line, and that counter must beat it in the measured matrix or a scripted scenario (gate G2). Separately, every threat must have at least two answers in its age at different costs (gate G3), so no single card decides a matchup at the plan screen.

### 3.5 The rarity ladder

| Rarity | Mechanics |
|---|---|
| Common | One simple keyword, readable in one fight (Shove, Cover, Hardened, Raider, Snag, Squad, Lob) |
| Rare | One conditional keyword (Momentum is Common on the starter Heavies; Rares get Aimed Shot, Focus, Shatter, Hook, War Cry, Heal, Aura) |
| Epic | A showpiece with a tell and a cooldown or a state (Leap, Tunnel, Overrun, Siege range, Daze, Testudo) |
| Legendary | A rule-breaker, up to two keywords (Overrun with riders, War Cry with Call-in, Burn with a cone, Rampage with a slow) |

### 3.6 The stat budget

A keyword is paid for in stats (A16.17: each keyword carries a budget against the age's vanilla line). Starting stats are today's; each card is tuned by its per-card row (gate G1) after the last counter regeneration of its drop, because every regeneration moves single cards by several points (`docs/decisions.md`).

### 3.7 How signatures meet the other systems

| System | Rule |
|---|---|
| Classes (A18.9) | The class icon and label stay; the signature chip sits next to them. War Council lines still apply per class |
| Stances (A18.4) | Hold gathers troops at the flag, where formations form; Momentum needs a free run, so "Hold, then Charge" from a held line becomes a real tactic; Fall back has no formations or ranks (as today); a tunneler digs in only on Charge |
| War Council (A18.5, item 12) | Research and signatures use the same kinds and never stack the same effect twice (the larger applies): Trample adds to a charge's knockback; Juggernaut (immune to knockback and pulls) counters Shove and Hook; the Phalanx pick (Brace) counters Momentum; Shield Wall research and Bulwark take the larger of themselves and Cover; Fire Arrows shares the Burn status; Veterans shares Rampage's kill count; Field Care raises War Cry shields; Banners widens War Cry |
| Forts (A16.14) | Forts block raiders (they are structures); a wall is not a formation member; the Tunnel passes under forts; Siege and Shatter keep the ×2 against structures; Shield Wall cover does not apply to forts |
| Powers (A2.9) | Powers ignore Cover, Hardened and formations (they skip unit reductions today) and hit burrowed troops at 50% (A16.15); squads and formations still soak power caps (A2.9.5) |
| AI (A7) | Same commands and public information; the counter matrix (duels on the real sim) learns most signatures by itself; a few hints cover what duels cannot see (raids, escorts, formations, tunnels) |

### 3.8 Clash Royale's lessons, translated to one lane

| Clash Royale | Our lane |
|---|---|
| A card is a mechanic first, stats second | Every slot gets a family strong enough to change its counters |
| Charges, ramps and charge-up shots with resets | Momentum, Focus and Aimed Shot, reset by shoves and stuns |
| Building-targeters pulled by a cheap building | Raiders stopped by any melee; siege stopped by any blocker |
| Swarms soak single targets, splash kills swarms | Squads and summons against Aimed and Focus; splash shapes against squads |
| Shields that pop | Barrier against many small hits; Shatter |
| Placement and the river | We have no placement: timing (waves, Hold then Charge) and the War Plan replace it |
| A hand of 4 in cycle | We have the whole tray: depth from commitment in the War Plan and from interactions, not from a hand |

---

## 4. Mechanic families

### 4.1 Overview

"Drop" is when the family's sim kind ships (section 10.1). "Cards" lists every card whose signature it is.

| Family | Kind | Drop | Cards (signature) |
|---|---|---|---|
| **Momentum** | `firstHitBonus` extended | 1 | Tuskback, War Chariot, Destrier Knight, Cuirassier, Steam Golem, Tankette, Hover Tank |
| **Cover** | new `cover` | 1 | Hide Shield, Shield Bearer, Footman, Iron Mantlet, Sandbag Carrier, Barrier Trooper, Crystal Guard |
| **Hardened** | new `hardened` | 1 | Woolly Rhino, War Elephant, Dragoon, Armoured Car, Behemoth Tank, Crab Mech, Asteroid Golem |
| **Shatter** | new attack field | 1 | Boulder Hurler, Flailman, Riveter, Bazooka Trooper, Needle Gunner |
| **Shove** | new attack field | 1 | Bonker, Hoplite, Steam Tractor, Assault Gun |
| **Aimed Shot** | data plus a view flag | 1 | Belly Bowman, Crossbowman, Wall Gunner, Ghillie Sniper, Particle Cannon |
| **Raider** | new `raider` | 1 | Torch Runner, Thracian Raider, Brigand (with Plunder), Powder Monkey, Dispatch Rider, Commando, Hover Bike, Void Skimmer |
| **War Cry** | `periodicShieldAura` extended | 1 | Elk Chieftain, Aulos Piper, Herald, Grand Marshal, Starwarden |
| **Siege range** | data (item 5) | 1 | Scorpion, Mangonel (drop 1), Bronze Cannon (drop 2) |
| **Formations** | new formation pass | 1 | Firing Line: Fusilier, Carbineer (switched on in drop 2); plus memberships (section 5) |
| **Testudo** | item 45's kind | 1 | the Legion (new card) |
| **Burn** | new status `burn` | 2 | Lindworm, Plasma Lancer (shared with item 12's Fire Arrows) |
| **Focus** | new attack field | 2 | Steam Driller, Antimatter Rifler |
| **Backstep** | new `backstep` | 2 | Voltigeurs, Moonlings |
| **Tunnel** | new `tunnel` | 2 | Sapper |
| **Overrun** | new `overrun` | 2 | Mammoth Matriarch, Bulldozer |
| **Rampage** | new `rampage` | 2 | Hydra |
| **Spotting** | targeting rule | 2 | users: Long range and siege range troops; markers: Warhammer Sergeant, Flare Spotter, turrets and powers that mark |
| **Fuse** | new attack field | 3 | Sticky Bomber |
| **Dive** | `bomber` extended | 3 | Dive Bomber |
| Leap | `pounce` (have) | | Sabertooth, Amazon Rider, Hussar, Alpine Climber, Warp Stalker (and the hidden War Hound, drop 1) |
| Ricochet | `chain` (have) | | Pebbler, Discus Thrower, Ion Ranger |
| Pierce | (have) | | Javelineer, Rail Gunner |
| Cleave | (have) | | Greatsword Knight, Trench Raider |
| Cone | `followBehind` (have) | | Blunderbuss, Star Leviathan |
| Lob | arc splash (have) | | Grenadier, Bomb Bowler, Rifle Grenadier, Nova Thrower |
| Long range | (have) | | the eight Long range Rares |
| Volley | (have) | | Rocket Cart |
| Reach | (have) | | Spear Hunter, Phalangite, Pikeman, Walker Mech |
| Snag | on-hit slow or snare (have) | | Bolas Thrower, Longbowman, Rifleman, Pulse Trooper |
| Sunder | on-hit mark (have) | | Warhammer Sergeant, Flare Spotter |
| Hook | first-hit pull (have) | | Corsair, Harpoon Gunner, Graviton Halberdier |
| Barrier | `innateShield` (have) | | Photon Knight, Star Legionnaire |
| Frenzy | (have) | | Pelt Rager, Minotaur, Highlander, Armoured Train, Bulldog Sergeant, Overload Android |
| Aura | (have) | | Drum Shaman, Standard Bearer, Drummer Boy, Bandmaster, Overclock Engineer |
| Dread | foe aura (have) | | Tragic Chorus, Bagpiper, Void Whisperer |
| Heal | (have) | | Herbalist, Friar, Field Surgeon, Combat Medic, Repair Drone, Bio-Weaver |
| Summon | (have) | | Beast Caller, Kennel Master, Clockwork Tinker, Holo Projector, Swarm Matron |
| Call-in | `callStrike` (have) | | Rockfall Shaman, Alchemist, Radio Operator, Mothership |
| Daze | `timeStop` (have) | | Cave Bear, Ursa Paladin, Mesmerist, Spark Scientist, Gravity Sage, Chrono Titan (as Time Stop) |
| EMP | (have) | | EMP Saboteur |
| Riders | (have) | | Siege Belfry, Land Dreadnought, Drone Carrier |
| Death Blast | `onDeathExplode` (have) | | Bronze Colossus |
| Squad | (have) | | Hunting Wolves, Rhodian Slingers, Squires, Coal Miners, SMG Squad, Android Pair |
| Siege | `siegeOnly` (have) | | Wooden Horse, Battering Ram |
| Flying | air (have; Dive in drop 3) | | Balloon Admiral, Gyrocopter, Dive Bomber, Sky Fortress, Jetpack Trooper, Star Fighter |

### 4.2 The new and changed families

Each block gives what it does, how it reads, its counters, the sim cost, the AI's needs and the balance risk. Numbers are starting values for the prototype; the per-card rows set the final ones.

#### Momentum (drop 1)

- **What.** A troop builds momentum while it walks freely. After **120 lu** of free walking it charges: **+50% speed**, and its next hit deals **×2** and knocks back (30-40 lu by card). Momentum empties when it attacks, stands still for 0.25 s (blocked, held at the flag, in the file behind a stopped ally), is slowed or snared by any amount, stunned, or knocked back. A braced target ignores the bonus and the knockback (as today).
- **Replaces** "first hit of each engagement" (a 2 s or 4 s idle reset, A18.4.2) on the seven starter Heavies. The difference a player sees: the charge happens where there is free lane (reinforcements arriving from the gate, a broken enemy front, a switch from Hold to Charge with room ahead) and fails in a stuck scrum or against a slow.
- **Tell.** A `charge` clip (head down, lance couched, sabre levelled, tracks spinning), a dust trail with speed lines while charging, the charging icon, a heavy impact with a short hit-stop.
- **Counters.** Braced Anti-heavy (no bonus, ×3 back), any slow (Bolas, Snag arrows, Dread, suppression), a cheap squad in front that eats the double hit, the Square (Gunpowder), Shove (resets it on a knockback).
- **Sim.** Two optional fields on `firstHitBonus` (`runUpLu`, `chargeSpeedBp`); one integer per unit (`runUp`, milli-lu walked since the last reset), hashed; the speed bonus applies after the A18.2 caps like a forced march. O(1) per unit per tick.
- **AI.** Learns its value from the regenerated matrix (duels start with a free run, which may overrate it; the per-card row corrects). Brain: prefer releasing a held wave with chargers when the lane ahead is clear for 120 lu; answer chargers with braced cards and slows (counter scoring).
- **Risk.** Stronger "Hold, then Charge" balls (`flag_ball` row); the gate `mono_momentum` ≤ 35%. It serves item 13 (section 9).

#### Cover (drop 1)

- **What.** The troop's shield covers itself and allied ground troops up to **60 lu behind it** (towards its own gate): they take **25% less** from **straight shots** of the damage types its material stops. Arcs (lobs, Long range, siege range, mortars), blasts and splash, call-ins, powers and siege weapons pass. Two or more linked Cover troops form a **Shield Wall** (section 5): 100 lu and 35%.
- **What each material stops** (data): hide, bronze and wood shields stop blunt, pierce and slash shots (stones, darts, arrows, javelins, discs); steel and sandbags stop bullets and arrows; hardlight and crystal stop lasers, bullets and bolts; an EMP switches hardlight cover off for its stun.
- **The coverage rule is shared with item 45** (the Legion's testudo stops the same shot types): the sim reads `projectile.arc` (today a view flag only), the attack's `dmgType` and a `coverPass` flag on siege weapons.
- **Tell.** `shield_lock` pose while it covers or walls; stopped shots glance off with a spark and a thud (`fx.cover_glance`); a faint arc over the covered troops only when a shot is stopped.
- **Counters.** Arcs and lobs, call-ins, powers, Shatter, any melee (Heavies above all), a hook that pulls the shield out.
- **Sim.** New kind `cover { behindLu, bp, stops: DmgType[] }`; per straight-shot impact, a scan of the defender side's cover troops (at most a handful). Applied at pipeline step 4 (resist) inside the −35% floor; the larger of Cover, Guard-style resist, Shield Wall research and Bulwark applies, never their sum.
- **AI.** Hint `escort`: in a wave, train the Cover troop before the shooters; counter scoring weighs arcs and Shatter against scouted Cover.
- **Risk.** A cover ball (Cover, mass shooters, Hold at the flag) that stalls: proxy `cover_ball` and the Bell rows.

#### Hardened (drop 1)

- **What.** Every hit the troop takes is **N weaker**, never more than the −35% floor. N is about 25% of the age's starter Infantry hit for Commons (Stone 5, Bronze 6, Gunpowder 9, Future 16, Cosmic 22) and up to 35% for Epics and Legendaries (Armoured Car 12, Behemoth 17).
- **Tell.** A dull thud or clink with a smaller damage number (`fx.hardened_clink`); no icon.
- **Counters.** Big hits: Aimed Shot, the ×3 Anti-heavy, artillery, Focus; and Shatter, which ignores it.
- **Sim.** New kind `hardened { perHit }`, the Mail research's code path (`src/sim/damage.ts`), scaled by level like damage. O(1).
- **AI.** Nothing new: the matrix shows that small hitters lose to it.
- **Risk.** Hardened plus heals as an unkillable tank: Burn (drop 2), Shatter and the ×3 answer it; `mono_hardened` ≤ 35%.

#### Shatter (drop 1)

- **What.** The troop's hits break shields (temporary shields and Barrier pools are stripped before the damage) and ignore Cover, Hardened and Mail for that hit.
- **Tell.** Shards and a shield pop (`fx.shatter`).
- **Counters.** Its own class answers (it is a counter tool): light troops against the Anti-heavy Shatters, Heavies against the infantry Shatters.
- **Sim.** An attack flag `shatter`; at impact, before damage. O(1).
- **AI.** Counter scoring against scouted Cover, Hardened and Barrier.
- **Risk.** Low.

#### Shove (drop 1)

- **What.** Every **third** hit of the troop's main attack knocks the target back 20-25 lu (size resist as today: large and huge 50%, braced and air 100%). A knockback cancels a pending windup (A2.7), so the shove spoils an aim, a charge, a ramp and a heavy swing.
- **Tell.** The third hit plays the heavier attack variant (`attack_c` or `attack_b`), dust at the feet, the target slides back.
- **Counters.** Braced and large troops; ranged troops that kill it before it reaches them.
- **Sim.** An attack field `shove { every, knockback }`; a hit counter per attack, hashed. O(1).
- **AI.** Counter scoring sees it against Aimed Shot cards; nothing else.
- **Risk.** A lock on slow attackers: bounded by "every third hit".

#### Aimed Shot (drop 1)

- **What.** The troop aims for about **70% of its interval** (1.4-2.8 s by card) and then fires one heavy shot. A stun or a knockback during the aim spoils it (the existing windup cancel, A2.7): the shot is lost and the cooldown runs.
- **Tell.** A sight line from the weapon to the target for the whole aim (`fx.aim_line`, drawn by the view from `attackStarted`), an optional `aim` hold clip, the aiming icon.
- **Counters.** Shove and stuns (spoil), squads and decoys (bait: the shot is wasted on chaff), Cover (it is a straight shot), Barrier (absorbs it).
- **Sim.** Data (`windupPct`) plus a view flag `aim` on the attack; no sim code.
- **AI.** None beyond the matrix.
- **Risk.** Low; heavies may need a small HP check against the new burst.

#### Raider (drop 1)

- **What.** The raider goes for the enemy base. **Enemy shooters and supports do not block it** (troops whose first attack reaches 100 lu or more, the ranks' definition, A2.7): it runs past them. **Only melee troops, forts and the base stop it**, and it fights only what stops it. Hits on the base deal double (today's `vsBaseDamage`). The Brigand adds **Plunder**: each hit on the base also takes 3 gold from the enemy (never below zero) and gives it to its side.
- **Tell (the orchestrator's condition).** A visible run-past: when it passes an enemy shooter it ducks and weaves around it in the depth rows (200 ms, view only) with a speed-streak trail (`fx.raider_trail`), and a distinct sound cue (`raid_dash`: a sharp whoosh with quick footfalls, hooves or an engine by age; once per pass, rate-limited); a raid glyph on its HP pip; the existing off-screen badge when it reaches the base; Plunder flies coins from the enemy's gold to yours.
- **Counters.** Any melee troop (the cheapest Common blocks it), slows, turrets, a fort in its path.
- **Sim.** New kind `raider { plunderGold? }`: a blocking filter in movement (shared with Overrun) and a target filter in targeting; Plunder moves milli-gold at the impact. O(1) per blocker check.
- **AI.** Raiders count as base threats in `estimate.ts` (they ignore its shooters); when raiders are scouted, the bot keeps one melee troop on the lane between its gate and the fight; it uses raiders against turtles and all-ranged plans.
- **Risk.** Swingy early games for new players and runner spam: the `raider_rush` proxy ≤ 25% against tier VII, the existing `runner_reach` row, and the hold-back order in 10.10.

#### War Cry (drop 1)

- **What.** Every 9-15 s while it or its army is fighting, the troop gives allies within 180-200 lu (at most 8) a timed boon: a shield (Herald, Starwarden: today's periodic shield), a burst of speed (Aulos Piper), or speed and damage (Elk Chieftain, Grand Marshal). It replaces the always-on aura on the Elk Chieftain, the Aulos Piper and the Grand Marshal, where a constant aura was invisible.
- **Tell.** A horn blast, a tune or a fanfare with a ring (`fx.war_cry_ring` in three variants), allies flash once; the existing `ability` clip.
- **Counters.** Kill or outrange the crier (divers, Long range); spread the fight beyond its radius.
- **Sim.** `periodicShieldAura` gains `statuses?` (a shield is a status with an amount). O(n) only on the tick it fires.
- **AI.** Pushes may wait for a cry that is about to fire (tiers VII+); not required.
- **Risk.** Low; the cry boons sit inside the A18.2 caps.

#### Siege range (drop 1, data; item 5)

- **What.** The age's artillery Epic fires from very far back: range 560-600 lu (about 28-30% of the lane), minimum range 150, one shot every 5-6 s, splash 50-60 lu (the Scorpion keeps its piercing bolt), a quarter of its damage to bases, ground only, a landing marker (built). Ranks keep it 40% of its range behind its melee front (built).
- **Counters.** Leap, raiders and air reach it (it cannot hit within 150), lane powers, a counter-battery from the enemy's own artillery once the fronts meet.
- **Sim.** Data only (`range`, `minRange`, `intervalMs`, `vsBaseDamage`, `coverPass` on bolts).
- **AI.** The matrix and the existing ranks rules.
- **Risk.** A new turtle that shells bases from outside turret cover: `siege_turtle` in the turtle band, quarter base damage, item 5's Bell gate.

#### Burn (drop 2)

- **What.** A hit sets the target burning for 3 s: 15% of the hit per second, on the shared heal grid, credited to the source (bounty); a burning troop receives half healing (heals and regen; shields unaffected). Reapplying keeps the larger, as for every status.
- **Tell.** Flames on the target (`fx.burn`), the burning icon.
- **Counters.** Shields and Barrier absorb the ticks; high health; Hardened shaves each tick within the floor.
- **Sim.** New `StatusKind` `burn`, shared with item 12's Fire Arrows (whichever ships first builds it; the two items are not coupled). O(n) per pulse.
- **AI.** Hint `vsHeal`.
- **Risk.** Burn plus splash on squads; per-card rows.

#### Focus (drop 2)

- **What.** Each consecutive hit on the same target deals **+30%** more, up to **×2.5**; a new target, a stun, a knockback or 2 s without hitting resets it. The bonus rides the first-hit path (`bonusBp`, outside the +35% damage cap like a charge or a leap bite) but, unlike them, is not cancelled by Brace.
- **Tell.** The drill or beam glows hotter step by step (`fx.focus_heat`).
- **Counters.** Squads, summons and decoys (it wastes the ramp on chaff), Daze and Shove (resets).
- **Sim.** An attack field `focus { stepBp, maxBp, resetMs }`; target id and stacks per attack, hashed. O(1).
- **AI.** The matrix; the bot throws summons at a scouted Focus card only if counter scoring prefers them.
- **Risk.** Legendaries melt by design; per-card rows.

#### Backstep (drop 2)

- **What.** When an enemy melee troop comes within 30 lu and the troop is between shots, it hops back 60 lu over 0.3 s (untargetable by melee during the hop, like a leap), every 5 s at most.
- **Tell.** A hop back with dust; an optional `hop_back` clip.
- **Counters.** Fast melee and leapers (they catch it again), hooks, ranged fire, dazes.
- **Sim.** New kind `backstep`; a self-leap on the existing leap machinery. O(1) plus one nearest-melee check.
- **AI.** The matrix.
- **Risk.** Kiting chains against slow melee: the cooldown.

#### Tunnel (drop 2; the item 8 prototype)

- **What.** At spawn the troop digs in for 1 s (hittable), then travels underground at its speed: untargetable by troops, turrets and forts, not blocked, ignoring traps; powers hit it at 50% (A16.15). It surfaces 40 lu in front of the enemy gate with a **1.5 s telegraph** (hittable, cannot act), then works as siege; its charge blows when it dies. It digs in only while its side is on Charge, and never burrows twice.
- **Tell.** `burrow` and `surface` clips; a dirt mound and a dust trail along the lane (`fx.tunnel_mound`, `fx.tunnel_trail`); a crack ring at the gate for the whole telegraph (`fx.surface_crack`); the burrowed icon on the minimap.
- **Counters.** Troops at your gate, gate turrets (the Steam Hammer's gate zone), powers at 50%.
- **Sim.** New kind `tunnel`; state `burrowed`, `surfaceTick` (hashed); a targeting filter beside the leap's; `Observation.units[].burrowed` (public). O(1) per tunneler.
- **AI.** Defend when an enemy tunnel trail is seen (keep or send one melee troop to the gate); use it against turtles and forts.
- **Risk.** A guaranteed base hit: `tunnel_rush` ≤ 25%; the surfacing telegraph and its 560 HP give the defence time.

#### Overrun (drop 2)

- **What.** Small and medium enemies without Brace do not block the troop; it walks through them while it fights (its attacks do not stop it), and each one it passes takes 50% of its attack damage once per 2 s and loses its windup. Large or huge enemies, braced enemies, forts and the base stop it.
- **Tell.** Small troops tumble aside (view offsets) with dust (`fx.trample`); an optional `stomp_walk` clip for the Mammoth.
- **Counters.** Large or braced troops block it; the ×3 Anti-heavy.
- **Sim.** New kind `overrun { maxSize, trampleBp, everyMs }`; a blocking exception in movement (shared with Raider) and a small trampled list per overrunner (hashed). O(k) per overrunner.
- **AI.** The matrix shows the answer (braced and large cards).
- **Risk.** A Legendary that walks to the base; the per-card row and the Bell rows.

#### Rampage (drop 2)

- **What.** Each kill gives the Hydra +10% damage (inside the cap) and one more bite target (3, up to 5), for the rest of its life.
- **Tell.** It grows a little per kill (view scale), a kill pip per stack, a glow.
- **Counters.** Early burst (Aimed Shot, ×3 Anti-heavy); never feed it squads.
- **Sim.** New kind `rampage`; a kill count per unit (shared with item 12's Veterans). O(1).
- **Risk.** Snowball, capped at two extra heads.

#### Spotting (drop 2)

- **What.** Long range and siege range troops may fire at a **marked** enemy (Sunder, Medusa's Gaze, Target Painter, the Searchlight Sniper) up to 100 lu beyond their range.
- **Tell.** A flare or reticle over the target and a dotted arc from the gun.
- **Counters.** Kill the marker; the mark fades in 3-6 s.
- **Sim.** A candidate filter in targeting. O(1) per candidate.

#### Fuse (drop 3)

- **What.** The Sticky Bomber's hit plants a charge: 30% of the hit at once, the rest 1.5 s later as a homing blast on the target plus a small splash; if the target dies first, it blows where it fell.
- **Tell.** A blinking charge on the hull with a quickening beep.
- **Counters.** Kill or keep off the bomber before it reaches a hull (it is a light melee troop); Barrier and heals soften the blast.
- **Sim.** An attack field `fuse`; a delayed homing impact on the existing projectile path.

#### Dive (drop 3)

- **What.** Every 6 s the Dive Bomber picks the densest ground group within 300 lu ahead (the existing `densest` targeting), shows a shadow and a whistle for 1 s, and drops one heavy bomb (splash 60); between dives it flies on.
- **Counters.** Anti-air; spreading out.
- **Sim.** `bomber` gains `dive?`.

### 4.3 Families kept as they are

Leap, Ricochet, Pierce, Cleave, Cone, Lob, Long range, Volley, Reach, Snag, Sunder, Hook, Barrier, Frenzy, Aura, Dread, Heal, Summon, Call-in, Daze (and Time Stop), EMP, Riders, Death Blast, Squad, Siege and Flying stay. Their cards get a sharper card text with a named counter, and a few get new numbers (Bolas Thrower's slow, the Corsair's and Graviton's pulls, the Rifleman's suppression).

---

## 5. Formations and combos (item 52)

### 5.1 The rule

- **Link.** Two troops of one side are linked when they are neighbours in their side's ground file (sorted by progress every tick, A2.7) and their centres are at most **48 lu** apart.
- **Members** must be alive, not stunned, not leaping and not burrowed. A knockback, a hook or a slow that opens a gap over 48 lu breaks the link at once.
- **One formation per troop** (priority: Testudo, Square, Shield Wall, Phalanx, Firing Line, Wedge, Pack).
- **No growth with size:** the bonus is the same for 2 members as for 6, so no mega-ball.
- **Where they form:** at the contact point and at the Hold flag, where troops gather; on the march they string out (spawns are 1.5-7 s apart). "Hold to form up, then Charge" is the tactic a player learns.
- **Inside the caps** (A18.2); the Legion's testudo keeps item 45's narrow exception.
- **Seen:** a pose, a small glyph over the front member (shield, spears, musket, arrowhead, paw), a faint team-coloured ground band under the members, a lock sound (shields clack, pikes thud, muskets level). Lite keeps the glyph; Reduce motion keeps poses and glyphs.

### 5.2 The formations

| Formation | Members | Rule | Bonus | Pose and tell | Counter | Drop |
|---|---|---|---|---|---|---|
| **Shield Wall** | Cover troops | 2+ linked | Cover reaches 100 lu behind and 35% (60 lu and 25% alone) | `shield_lock`; overlapping shields; glancing sparks | Arcs and lobs, call-ins, powers, Shatter, melee, a hook | 1 |
| **Phalanx** | a Reach troop directly behind a Cover or Shove troop: Spear Hunter behind Hide Shield or Bonker; Phalangite behind Shield Bearer or Hoplite; Pikeman behind Footman; Steam Driller behind Iron Mantlet; Walker Mech behind Barrier Trooper; Graviton Halberdier behind Crystal Guard | the linked pair | the Reach troop +25% damage (inside the cap) | `spear_set` / `pike_set` over the shield | Divers landing behind, a shove or hook that breaks the pair, arcs, killing the shield | 1 (later ages with their drop) |
| **Wedge** | Momentum troops | 2+ linked, both charging | the charge also hits the enemy behind the target (50%) and knocks back 20 lu further | shared dust and streamers | Braced troops, the Square, a slow on one of them | 1 |
| **Pack** | beasts: Hunting Wolves, Cave Pups, Sabertooth, War Hounds, Swarmlings | 3+ linked | +15% move and attack speed (inside the caps) | a howl ring | Splash, ricochet, cleave, dazes | 1 (Swarmlings in drop 3) |
| **Firing Line** | line infantry: Fusilier, Carbineer | 2+ of the same card linked and shooting | +20% damage (rolling volleys); the kneeling front member takes 20% less from straight shots | `kneel_fire` on the front member, standing fire behind | Artillery and lobs, chargers in the open, divers | built in 1, switched on in 2 |
| **Square** | Fusiliers | a Firing Line (or 2+ linked Fusiliers) with an enemy charging or leaping troop within 160 lu | Brace, and +50% against charging or leaping troops (`bonusBp`); but half fire rate against everything else and half speed; ends 2 s after the threat | `square` (bayonets levelled) | Artillery, lobs and splash (the historical answer); shooters out-fire a square | built in 1, switched on in 2 |
| **Testudo** | the Legion (item 45) | by itself when shots its shields stop are aimed at it | 70% less from those shots, half pace, no attacks; opens to fight at 50 lu | the shell | Blasts, fire, artillery, siege bolts, melee, stuns, powers | 1 |

The Napoleonic triangle lives in Gunpowder: the Firing Line out-fires infantry and shooters; enemy cavalry forces it into a Square, which stops the charge; the Square is the best target for the Bronze Cannon, the Coehorn Crew and the Grenadier; and cavalry rides down artillery and lines caught in the open. A player who brings cavalry and guns together beats a player who brings only Fusiliers.

### 5.3 Combos without a rule

They come from signatures that fit together; each roster row lists them in its "Works with" column.

| Combo | How it works | Counter |
|---|---|---|
| Shield in front of shooters | Cover protects allies up to 60 lu behind | Arcs, Shatter |
| Spears behind shields | The Phalanx | Divers, shoves |
| Healer behind armour | Heal plus Hardened outlasts small hits | Burn, big hits, divers |
| War Cry into a charge | A speed burst gets the run-up sooner | Slows, braced troops |
| Slow plus arcs | Arcs land where the target stood; a slowed one stays in the splash | Ranged fire on the slower, air |
| Hook into splash or a cone | The pulled troop lands in the lob or the cone | Braced and large troops |
| Daze or slow plus siege | The defenders stand still while the ram or tunneler works | Kill the siege troop early |
| Mark plus artillery | Spotting | Kill the marker |
| Decoys or a squad in front of an aimed shot | They soak fire while the shot is aimed | Splash |
| Drums plus a Firing Line | Attack speed and line damage sit under different caps | Kill the drummer |
| Chaff in front of a charger | The enemy's slow or shove lands on the chaff | Splash |
| Cavalry plus guns (Gunpowder) | Cavalry forces squares; guns break them | Your own guns and the Square's timing |

### 5.4 What breaks synergy

Splash and arcs punish tight groups; divers and tunnelers land behind lines; shoves and hooks open a gap and break a link; slows pull a member out of step; dazes stop a formation from acting; an overrun tramples formations of small troops; killing the linchpin (the shield in front of the spears, the drummer, the marker) ends the bonus. Every formation's row names its breaker, and gate G6 measures it.

### 5.5 Sim, AI and view

- **Sim.** One formation pass per side per tick in B3 step 6 (beside the aura recompute), over the already sorted file: O(n). The Square's threat check uses the enemy file (binary search). Formation state is derived from positions every tick like the Dread aura and the ranks, so it adds no hashed state; the events `formed` and `unformed { side, kind, ids }` tell the view and the AI.
- **AI.** Builds: trains formation cards in pairs inside a banked wave, trains Cover before shooters, holds to form up before a push (the push gate exists), brings guns with cavalry. Breaks: against an observed formation, splash, arcs, Shatter, shoves and divers score ×1.25 in counter scoring; against Fusiliers it sends guns before cavalry. Tiers 0-II never plan formations (they still form by chance); V+ build and break them; VII+ time a charge for when an enemy Square has just ended.
- **View.** The staging keeps linked members in neighbouring depth rows and plays their pose; the glyph and the ground band are one sprite per formation, not per troop.

---

## 6. Counter matrices per age

### 6.1 The family web (all ages)

| Threat | Beaten by | Why |
|---|---|---|
| Charger (Momentum) | Braced Anti-heavy; any slow; a cheap squad in front; the Square; Shove | No bonus against Brace and ×3 back; a slow empties the run-up; chaff eats the double hit; a knockback resets it |
| Cover and Shield Wall | Arcs and lobs, call-ins, powers, Shatter, melee | Cover stops only straight shots of its material |
| Hardened | Aimed Shot, the ×3 Anti-heavy, artillery, Focus, Shatter | A flat cut matters only on small hits |
| Barrier | Many small hits, Shatter, EMP | A pool pops under any damage |
| Squads and summons | Splash, ricochet, cleave, cone, lobs, Overrun, Hardened | Many small bodies |
| Splash shapes | Divers, raiders, chargers that reach them | They stand behind |
| Aimed Shot | Shove and stuns, squads and decoys, Cover, Barrier | Spoiled, baited, blocked or absorbed |
| Focus | Squads, summons and decoys, dazes, shoves | Resets |
| Long range and siege range | Leap, Tunnel, Overrun, air, lane powers, raiders (they run past to the base) | Minimum range; they stand alone at the back |
| Leap | Melee near the back, dazes, the Square | It lands alone among your shooters |
| Raider | Any melee troop, slows, turrets, forts | Only melee and structures stop it |
| Overrun | Large or braced troops, the ×3 Anti-heavy | They block it |
| Tunnel | Troops at your gate, gate turrets, powers at 50% | It surfaces with a telegraph |
| Air | Anything that hits air | Melee cannot |
| Hook | Braced, large and armoured troops | They resist the pull |
| Shove | Braced and large troops | Half or no push |
| Snag and Dread | Ranged outside their reach, air | Short reach |
| Daze | Spread-out ranged; Legendaries take half | Short radius |
| Heal, War Cry, Aura | Divers, artillery, Burn, hooks | The supporter stands at the back |
| Burn | Shields, Barrier, high health | They absorb or outlast it |
| Frenzy and Rampage | Burst before they grow (Aimed, ×3, a charge), dazes | They need time |
| Siege | Any blocker plus the Anti-heavy | They fight only when blocked |
| Formations | Splash and arcs, divers, shoves and hooks, dazes, killing the linchpin | They need tight, linked troops |
| Square | Artillery, lobs, shooters | Dense and slow-firing |
| Firing Line | Chargers in the open, artillery, divers | Dense, weak to a charge until it squares |

### 6.2 Threats and answers, age by age

Every threat has at least two answers in its own age at different costs (cost in gold; turrets and powers named). Gate G3 checks it.

**Stone**

| Threat | Answers (cost) | Why |
|---|---|---|
| Tuskback, Momentum (150) | Spear Hunter (100), Bolas Thrower (75), Hunting Wolves (50) | Brace and reach; a slow stops the run-up; a cheap pair eats the double hit |
| Woolly Rhino, Hardened (150) | Boulder Hurler (100), Spear Hunter (100), Atlatl Thrower (75) | Shatter and ×3 dwarf −5 per hit; big arcs |
| Bonker (Shove) and Hide Shield as a front | Tuskback (150), Woolly Rhino (150), Atlatl (75) | Heavy beats infantry; arcs pass the shield |
| A Hide Shield wall with Pebblers behind | Atlatl (75), Boulder Hurler (100), Rockfall Shaman (200) | Arcs and falling rocks pass over; Shatter ignores cover |
| Hunting Wolves and Cave Pups (squad, Pack) | Pebbler (75), Woolly Rhino (150), Elk Chieftain (350) | Ricochet; Hardened shrugs off bites; cleave |
| Torch Runner, Raider (50) | Bonker (50), Bolas Thrower (75), Rock Thrower (150) | Melee blocks it; a slow; a turret |
| Pebbler and Bolas (shooters) | Hide Shield (50), Atlatl (75), Sabertooth (200) | Cover; outranged; leap |
| Atlatl, Long range (75) | Sabertooth (200), Mammoth Matriarch (350, Overrun from drop 2), Stampede | Leap and overrun reach the back; a lane power |
| Spear Hunter, Boulder Hurler (Anti-heavy) | Bonker (50), Hunting Wolves (50), Pebbler (75) | Light troops take ×0.75 or ×0.5 |
| Drum Shaman, Herbalist (support) | Sabertooth (200), Atlatl (75), Rockfall Shaman (200) | They stand at the back |
| Pelt Rager, Frenzy (50) | Atlatl (75), Tuskback (150), Cave Bear (200) | Burst before the rage; daze |
| Sabertooth, Leap (200) | Bonker reinforcements (50), Woolly Rhino (150), Cave Bear (200) | Melee arriving from your gate; the roar dazes it on landing |
| Cave Bear, Daze (200) | Pebbler (75), Spear Hunter (100) | Shoot from outside the roar; ×3 |
| Rockfall Shaman, Call-in (200) | Atlatl (75, outranges it), Sabertooth (200) | Range; leap |
| Mammoth Matriarch (350) | Spear Hunter (100), Boulder Hurler (100), Tuskback (150) | Braced or large troops block her (drop 2); ×3 and ×2 against Legendaries |
| Elk Chieftain, War Cry (350) | Spear Hunter (100), Boulder Hurler (100) | ×3 and ×2 against Legendaries |

**Bronze**

| Threat | Answers (cost) | Why |
|---|---|---|
| War Chariot, Momentum (150) | Phalangite (100), Tragic Chorus (110), Rhodian Slingers (75) | Brace and reach; Dread stops the run-up; chaff |
| War Elephant, Hardened (150) | Belly Bowman (100), Phalangite (100), Scorpion (200) | Aimed ×3; ×3; siege bolts |
| Hoplite (Shove) and Shield Bearer (Cover) | War Chariot (150), War Elephant (150), Cretan Archer (75) | Heavy beats infantry; arcs pass shields |
| A shield wall with Javelineers behind, and the Legion | Cretan Archer (75), Scorpion (200), Zeus's Bolts, the Colossus or Hydra in melee | Arcs and siege bolts pass; powers pass; melee opens the shell |
| Rhodian Slingers (squad) | Discus Thrower (75), Cretan (75), Hydra (350), Bronze Colossus (350) | Ricochet; splash; cleave |
| Thracian Raider (50) | Hoplite (50), Tragic Chorus (110), Archer Tower (150) | Melee blocks it; a slow; a turret |
| Javelineer, Discus (shooters) | Shield Bearer (50), Cretan (75), Amazon Rider (200) | Cover; outranged; leap |
| Cretan Archer, Long range (75) | Amazon Rider (200), Scorpion (200, outranges it), Chariot Rush | Leap; siege range; a lane power |
| Scorpion, Siege range (200) | Amazon Rider (200), Cretan (75, in range once the fronts meet), Chariot Rush | Leap; counter-battery; a lane power |
| Belly Bowman, Aimed Shot (100) | Hoplite (50, shove spoils the aim), Shield Bearer (50, cover), Rhodian Slingers (75, bait), Amazon (200) | Spoil, block, bait, leap |
| Phalangite (Anti-heavy) | Hoplite (50), Shield Bearer (50), Rhodian Slingers (75) | Light troops |
| Standard Bearer, Aulos Piper, Tragic Chorus (support) | Amazon (200), Cretan (75), Scorpion (200) | The back line |
| Wooden Horse, Siege (200) | Phalangite (100), Belly Bowman (100), any blocker (50) | ×3 on an armoured mech; it fights only when blocked |
| Amazon Rider, Leap (200) | Hoplite reinforcements (50), War Elephant (150), Minotaur (200) | Melee near the back |
| Minotaur, Frenzy (200) | Belly Bowman (100), Phalangite (100) | Burst before the rage |
| Bronze Colossus, Death Blast (350) | Belly Bowman (100), Phalangite (100); shooters stay out of the blast | ×3 and ×2 against Legendaries |
| Hydra (350; Rampage from drop 2) | Belly Bowman (100), Phalangite (100); never feed it squads | Burst before it grows |
| The Legion, Testudo (200) | Scorpion (200), War Elephant (150), Tragic Chorus (110) with Cretan arcs (75) | Siege bolts pass the shell; melee opens it; a slowed shell sits under the arcs |

**Medieval**

| Threat | Answers (cost) | Why |
|---|---|---|
| Destrier Knight, Momentum (150) | Pikeman (100), Longbowman (75), Squires (50), War Hounds | Brace and reach; Snag stops the run-up; chaff |
| Greatsword Knight, Cleave (150) | Pikeman (100), Warhammer Sergeant (100), Crossbowman (75) | ×3; Sunder then ×3; an aimed bolt |
| A Footman wall with archers | Yeoman Archer (75), Flailman (50), Mangonel (200), Alchemist (200) | Arcs; Shatter; siege splash; a flask from above |
| Squires (squad) | Greatsword Knight (150), Mangonel (200), Lindworm (350) | Cleave; splash; a cone |
| Flailman, Shatter (50) | Destrier (150), Greatsword (150), Longbowman (75) | Heavy beats infantry |
| Brigand, Raider and Plunder (50) | Footman (50), Longbowman (75), Crossbow Nest (150) | Melee blocks him; a slow; a turret |
| Longbowman, Crossbowman (shooters) | Footman (50), Yeoman (75), Kennel Master's hounds (110) | Cover; outranged; hounds leap the front |
| Yeoman Archer, Long range (75) | Mangonel (200, outranges it), Kennel Master (110), Knights' Charge | Siege range; hounds; a lane power |
| Mangonel, Siege range (200) | Yeoman (75, in range once the fronts meet), Kennel Master (110), Knights' Charge | Counter-battery; hounds; a lane power |
| Pikeman, Warhammer (Anti-heavy) | Footman (50), Squires (50), Flailman (50) | Light troops |
| Friar, Herald, Kennel Master (support) | Yeoman (75), Mangonel (200), Lindworm (350, burn halves heals from drop 2) | The back line; anti-heal |
| Battering Ram, Siege (200) | Pikeman (100), Warhammer (100), any blocker (50) | ×3; blocked |
| Siege Belfry, Riders (200) | Pikeman (100), Warhammer (100) | ×3 |
| Alchemist, Call-in (200) | Yeoman (75), Kennel Master (110) | The back line |
| Ursa Paladin, Daze (350) | Pikeman (100), Warhammer (100), Kennel Master (110) | ×3; hounds (the measured best answer today) |
| Lindworm (350) | Pikeman (100), Warhammer (100), Crossbowman (75); spread out | ×3; an aimed bolt; the cone needs a clump |

**Gunpowder** (drop 2)

| Threat | Answers (cost) | Why |
|---|---|---|
| Cuirassier, Momentum and Wedge (150) | Fusilier Square (75 each), Grenadier (100), Bagpiper (110) | The Square braces and punishes chargers; Brace and lob; a slow stops the run-up |
| Dragoon, Hardened (150) | Grenadier (100), Wall Gunner (100), Coehorn Crew (75) | Splash ×2.5; aimed ×3; big arcs |
| Fusilier Firing Line | Coehorn Crew (75), Grenadier (100), Bronze Cannon (200), Hussar (200) | Artillery and lobs on a dense line; leap |
| Fusilier Square | Coehorn (75), Voltigeurs (75, out-fire it), Grenadier (100), Rocket Cart (200) | Artillery, the classic answer; a square fires at half rate |
| Voltigeurs, Backstep (75) | Blunderbuss (75), Grenadier (100), Hussar (200) | A cone hits all three; lob; leap |
| Highlander, Frenzy (50) | Coehorn (75), Cuirassier (150), Mesmerist (200) | Burst before the rage; daze |
| Corsair, Hook (50) | Blunderbuss (75), Cuirassier (150), Dragoon (150) | A cone; large and armoured troops resist the pull |
| Powder Monkey, Raider (50) | Corsair (50), Highlander (50), Bagpiper (110), Swivel Gun (150) | Melee blocks; slow; turret; shoot it before it pops |
| Blunderbuss, Cone (75) | Fusilier (75, outranges it), Coehorn (75), Hussar (200) | Range |
| Coehorn Crew, Long range (75) | Hussar (200), Bronze Cannon (200), Balloon Admiral (350) | Leap; siege range; air |
| Grenadier, Wall Gunner (Anti-heavy) | Corsair (50), Highlander (50), Voltigeurs (75) | Light troops |
| Field Surgeon, Drummer Boy, Bagpiper (support) | Coehorn (75), Hussar (200), Rocket Cart (200) | The back line |
| Bronze Cannon, Siege range (200) | Hussar (200), Balloon (350), Horse Artillery | Leap; air; a power |
| Rocket Cart, Volley (200) | Cuirassier charge (150), Hussar (200) | Reach the back |
| Hussar, Leap (200) | Fusilier Square (75 each), Highlander near the back (50), Mesmerist (200) | The Square braces against leapers; daze |
| Mesmerist, Daze (200) | Coehorn (75), Bronze Cannon (200) | Fire from outside the daze |
| Balloon Admiral, air (350) | Fusilier (75), Voltigeurs (75), Swivel Gun or Congreve Rack (150-250) | They hit air |
| Grand Marshal, War Cry (350) | Voltigeurs (75), Wall Gunner (100), Grenadier (100) | ×2 and ×1.5 against Legendaries; Voltigeurs the measured best today |

**Industrial** (drop 2)

| Threat | Answers (cost) | Why |
|---|---|---|
| Steam Golem, Momentum (150) | Coal Miners (50), Steam Driller (100), Harpoon Gunner (100) | Chaff; Brace and Focus; ×3 |
| Steam Tractor, Shove (150) | Trench Mortar (75), Steam Driller (100, braced: cannot be shoved), Harpoon (100) | Arcs; Brace; ×3 |
| Armoured Car, Hardened (200) | Riveter (50, Shatter), Harpoon (100), Steam Driller (100, Focus) | Shatter; ×3; ramp |
| An Iron Mantlet wall with Carbineers | Riveter (50), Bomb Bowler (75), Trench Mortar (75) | Shatter; lobs and arcs pass |
| Carbineer Firing Line | Bomb Bowler (75), Trench Mortar (75), Alpine Climber (200) | Lob and arcs on a dense line; leap |
| Coal Miners (squad) | Bomb Bowler (75), Spark Scientist (200), Armoured Car (200) | Lob; chain and daze; armour |
| Riveter, Shatter (50) | Carbineer line (75), Steam Golem (150), Steam Tractor (150) | Heavy beats infantry |
| Dispatch Rider, Raider (50) | Riveter (50), Clockwork Tinker's soldiers (110), Gatling Gun (150) | Melee blocks; turret |
| Bomb Bowler, Lob (75) | Carbineer (75, outranges it), Alpine Climber (200) | Range; leap |
| Trench Mortar, Long range (75) | Alpine Climber (200), Iron Horse, Railway Gun | Leap; powers |
| Harpoon, Steam Driller (Anti-heavy) | Riveter (50), Coal Miners (50), Iron Mantlet (50) | Light troops |
| Flare Spotter, Bandmaster, Clockwork Tinker (support) | Trench Mortar (75), Alpine (200), Spark Scientist (200) | The back line |
| Sapper, Tunnel (200) | Melee at your gate (50), Gun Line (50% while burrowed), Steam Hammer (250) | It surfaces at your gate with a telegraph |
| Alpine Climber, Leap (200) | Steam Golem near the back (150), Spark Scientist (200) | Tank; daze |
| Spark Scientist, Daze (200) | Trench Mortar (75), Alpine (200) | Outside the burst |
| Land Dreadnought, Riders (350) | Trench Mortar (75), Harpoon (100), Steam Driller (100) | Arcs; ×3 |
| Armoured Train, Frenzy (350) | Harpoon (100), Steam Driller (100), Tinker's soldiers (110) | ×3 and Focus; chaff |

**Modern** (drop 3)

| Threat | Answers (cost) | Why |
|---|---|---|
| Tankette, Momentum (150) | Rifleman (75, suppression), SMG Squad (75, chaff), Bazooka (100), Sticky Bomber (100) | No run-up while suppressed; Brace and ×3 |
| Assault Gun, Shove (150) | Mortar Team (75), Bazooka (100), Sticky Bomber (100, braced) | Arcs; ×3; Brace |
| Behemoth Tank, Hardened (350) | Mortar Team (75), Bazooka (100, Shatter and ×3), Sticky Bomber (100, Fuse ×3) | Arcs (the measured best today); Shatter; a delayed blast |
| A Sandbag wall with Riflemen | Rifle Grenadier (75), Mortar Team (75), Bazooka (100), Radio Operator (110) | Lob and arcs; Shatter; a call-in from above |
| SMG Squad (squad) | Trench Raider (50, cleave), Rifle Grenadier (75), Behemoth (350) | Cleave; lob; armour |
| Trench Raider and Bulldog Sergeant (infantry) | Tankette (150), Assault Gun (150), Ghillie Sniper (200) | Heavy beats infantry; burst |
| Commando, Raider (50) | Trench Raider (50), Rifleman (75), MG Nest (150) | Melee blocks; suppression; turret |
| Rifleman, Snag (75) | Sandbag Carrier (50), Mortar Team (75), Gyrocopter (200) | Cover; arcs; air |
| Rifle Grenadier, Lob (75) | Rifleman (75, outranges it), Gyrocopter (200) | Range; air |
| Mortar Team, Long range (75) | Paratroopers, Gyrocopter (200), Dive Bomber (200) | A drop behind the front; air |
| Bazooka, Sticky Bomber (Anti-heavy) | Trench Raider (50), Rifleman (75), SMG Squad (75) | Light troops |
| Radio Operator, Combat Medic (support) | Mortar Team (75), Ghillie Sniper (200), Dive Bomber (200) | The back line |
| Gyrocopter, gunship (200) | Rifleman (75), Bazooka (100, hits air, ×3 against mech), Flak Gun (175) | Anti-air |
| Dive Bomber, Dive (200) | Rifleman (75), Bazooka (100), Flak Gun (175); spread out | Anti-air; no clump to dive on |
| Bulldozer (200; Overrun from drop 2's kind) | Bazooka (100), Sticky Bomber (100, braced blocks it), Tankette (150, large blocks it) | Brace or size stop the overrun; ×3 |
| Ghillie Sniper, Aimed Shot (200) | Sandbag Carrier (50, cover), SMG Squad (75, bait), Assault Gun (150, shove spoils the aim) | Block, bait, spoil |
| Sky Fortress, carpet bomber (350) | SMG Squad (75), Bazooka (100), Flak Gun (175), Gyrocopter (200) | Anti-air |

**Future** (drop 3)

| Threat | Answers (cost) | Why |
|---|---|---|
| Walker Mech, Reach (150) | Rail Gunner (100), Plasma Lancer (100), EMP Saboteur (200) | ×2 pierce; ×3 and burn; the EMP stuns mechs |
| Crab Mech, Hardened (150) | Needle Gunner (75, Shatter), Rail Gunner (100), Particle Cannon (200) | Shatter; a big instant hit; an aimed beam |
| Photon Knight, Barrier (50) | Android Pair (50), Needle Gunner (75), EMP Saboteur (200) | Many small hits; Shatter; the EMP strips shields |
| A Barrier Trooper wall with Pulse Troopers | Arc Lobber (75), Needle Gunner (75), EMP Saboteur (200) | Arcs; Shatter; the EMP switches hardlight off |
| Android Pair (squad) | Arc Lobber (75), Crab Mech (150), Particle Cannon (200), Chrono Titan (350) | Splash; armour; a beam through the line; cleave |
| Hover Bike, Raider (50) | Photon Knight (50), Holo Projector's decoys (110), Pulse Laser (150) | Melee and decoys block it; a turret |
| Pulse Trooper, Snag (75) | Barrier Trooper (50), Arc Lobber (75), Jetpack Trooper (200) | Cover; arcs; air |
| Needle Gunner, Shatter (75) | Arc Lobber (75), Walker Mech (150), Particle Cannon (200) | Splash; a heavy; a beam |
| Arc Lobber, Long range (75) | Drone Swarm, Jetpack Trooper (200), Drone Carrier (350) | Air |
| Rail Gunner, Plasma Lancer (Anti-heavy) | Photon Knight (50), Android Pair (50), Barrier Trooper (50) | Light troops |
| Repair Drone, Overclock, Holo Projector (support) | Pulse Trooper (75, hits the flying drone), Arc Lobber (75), Jetpack (200) | The back line; air |
| EMP Saboteur (200) | Photon Knight (50, not a mech), Pulse Trooper (75, outranges it) | It stuns only mechs |
| Jetpack Trooper, gunship (200) | Pulse Trooper (75), Rail Gunner (100), Pulse Laser (150) | Anti-air |
| Particle Cannon, Aimed Shot (200) | Holo decoys (110, bait), EMP Saboteur (200, a stun spoils it), Overload Android (200) | Bait; spoil; reach it |
| Overload Android, Frenzy (200) | Rail Gunner (100), Plasma Lancer (100), EMP (200) | ×2 and ×3 on an armoured mech; a stun |
| Chrono Titan, Time Stop (350) | Rail Gunner (100), Plasma Lancer (100), Holo Projector (110) | ×2; ×3; decoys absorb (the measured best today) |
| Drone Carrier, Riders (350) | Arc Lobber (75), Rail Gunner (100), Plasma Lancer (100) | Arcs; ×2; ×3 |

**Cosmic** (drop 3)

| Threat | Answers (cost) | Why |
|---|---|---|
| Hover Tank, Momentum (150) | Moonlings (75, chaff), Graviton Halberdier (100), Antimatter Rifler (100), Void Whisperer (110) | Chaff; Brace and ×3; Focus; Dread stops the run-up |
| Asteroid Golem, Hardened (150) | Star Mortar (75), Antimatter Rifler (100, Focus), Graviton (100) | Arcs; ramp; ×3 |
| Star Legionnaire, Barrier (50) | Moonlings (75), Ion Ranger (75), Gravity Sage (200) | Many small hits; ricochet; daze |
| A Crystal Guard wall with Ion Rangers | Nova Thrower (75), Star Mortar (75), Mothership (350) | Lob, arcs and call-ins pass over |
| Moonlings, Backstep (75) | Ion Ranger (75), Nova Thrower (75), Warp Stalker (200) | Ricochet; lob; blink |
| Swarm Matron's Swarmlings (Pack) | Ion Ranger (75), Nova Thrower (75), Star Leviathan (350) | Ricochet; lob; cone |
| Void Skimmer, Raider (50) | Star Legionnaire (50), Void Whisperer (110), Ion Turret (150) | Melee blocks; a slow; a turret |
| Ion Ranger, Ricochet (75) | Crystal Guard (50), Star Mortar (75), Warp Stalker (200) | Cover; arcs; blink |
| Nova Thrower, Lob (75) | Ion Ranger (75, outranges it), Star Fighter (200), Warp Stalker (200) | Range; air; blink |
| Star Mortar, Long range (75) | Comet Run, Warp Stalker (200), Star Fighter (200) | A lane power; blink; air |
| Graviton, Antimatter (Anti-heavy) | Star Legionnaire (50), Crystal Guard (50), Moonlings (75) | Light troops |
| Starwarden, Bio-Weaver, Void Whisperer (support) | Star Mortar (75), Warp Stalker (200), Star Fighter (200) | The back line |
| Warp Stalker, Leap (200) | Asteroid Golem near the back (150), Gravity Sage (200) | Tank; daze |
| Star Fighter, gunship (200) | Moonlings (75), Ion Ranger (75), Ion Turret (150) | Anti-air |
| Gravity Sage, Daze (200) | Star Mortar (75), Warp Stalker (200) | Outside the collapse |
| Mothership, Call-in (350) | Moonlings (75), Ion Ranger (75), Star Fighter (200) | Anti-air |
| Star Leviathan, Cone and Riders (350) | Antimatter (100), Graviton (100), Swarm Matron (200) | Focus and ×3; a swarm (the measured best today) |

### 6.3 No dominant strategy

- Every popular threat above has two or more answers at different costs, and at least one answer costs no more than the threat (a 50-75 gold Common or Rare answers most 150-gold Heavies; an 100-gold Rare answers every Legendary).
- Mono-family plans lose to their family's counter in every age: mono-Momentum to braced Anti-heavy and slows, mono-Cover with shooters to arcs, mono-Hardened to Shatter and ×3, mono-raiders to any melee, mono-squads to splash, mono-artillery to divers and air.
- Formations are bounded (no growth with size, inside the caps) and every formation has a cheap breaker in its age (a lob or an arc Common or Rare).
- Gates G3, G5 and the plan-meta search (A16.17) check this on the sim.

---

## 7. The roster, age by age

Columns: **Card** (rarity, class, cost); **Signature** (family; "kept", "sharpened" or "new"); **Strong vs**; **Weak vs** (the named counter); **Tell**; **Card text** (one line, plain English; "kept" means today's text with at most a small edit); **Works with** (combos and formations); **New clip** (exact clip names, with the art wave); **Sim kind**. Where a card's change waits for a later drop, the row says so; until then the card keeps today's mechanics.

### 7.1 Stone (drop 1)

| Card | Signature | Strong vs | Weak vs | Tell | Card text | Works with | New clip | Sim kind |
|---|---|---|---|---|---|---|---|---|
| Bonker (C Infantry 50, starter) | **Shove** "Bonk" (new) | Holding the front; spoiling windups | Tuskback, Woolly Rhino (large: half push), Pebbler | Heavy overhead swing on the third hit, dust, the target slides | "Every third bonk knocks the target back and spoils its swing." | Phalanx front (Spear Hunter behind); Hide Shield beside it | none | `shove` attack field (new) |
| Pebbler (C Ranged 75, starter) | Ricochet (kept) | Squads and pups | Hide Shield (cover), Atlatl (outranges), Sabertooth | The bounce (built) | Kept: "Slings rocks over friends; each rock bounces to one more enemy nearby. Hits air." | Behind a Hide Shield; Drum Shaman | none | `chain` (have) |
| Tuskback (C Heavy 150, starter) | **Momentum** "Gore" (sharpened) | The first enemy after a free run; shooters caught in open lane | Spear Hunter (braced), Bolas Thrower (slow), Hunting Wolves (chaff) | Head down, dust trail and speed lines while charging; a heavy impact | "After a free run it charges: faster, and its first hit deals double and knocks back. Slows and stops end the charge." | Wedge (two Tuskbacks); Elk Chieftain's War Cry; Hold, then Charge | `charge` (W1 re-render) | `firstHitBonus` + run-up (extended) |
| Spear Hunter (R Anti-heavy 100, starter) | Reach (kept) and the class kit | Heavies; the Mammoth (braced, it blocks her) | Bonker, Hunting Wolves, Pebbler | Spear lowered over the shield in a Phalanx | Kept | Phalanx behind Hide Shield or Bonker | `spear_set` (W1 re-render) | have |
| Drum Shaman (R Support 110) | Aura: +20% attack speed (kept) | Even fights at the front | Sabertooth, Atlatl, Rockfall Shaman | Drum pulse ring (built) | Kept | Pack (beasts strike faster, inside the cap); Pebblers | none | have |
| Sabertooth (E Skirmisher 200) | Leap (kept) | Atlatl, Drum Shaman, Herbalist | Cave Bear (roar on landing), Woolly Rhino, melee reinforcements | Pounce arc (built) | Kept | Pack with Hunting Wolves and Cave Pups | none | `pounce` (have) |
| Mammoth Matriarch (L 350) | Drop 1: kept (stomp splash, riders). Drop 2: **Overrun** + riders | From drop 2: squads, pups, small infantry, the back line | Spear Hunter, Boulder Hurler (braced: they block her, ×3); Tuskback and Woolly Rhino (large: they block her) | From drop 2: small troops tumble aside | From drop 2: "Small foes cannot stop her: she tramples through them while her riders sling stones. Large or braced foes block her." | Drum Shaman, Herbalist behind | optional `stomp_walk` (W1 re-render, drop 2) | `riders` (have); `overrun` (new, drop 2) |
| Hunting Wolves (C Infantry 50, squad 2) | Squad (kept), in a Pack | Aimed shots and single big hitters; eating a charge | Pebbler (ricochet), Woolly Rhino (Hardened), Elk Chieftain (cleave) | Two bodies; a howl when a Pack forms | "Two fast wolves in one card. With a third beast they form a Pack and run and bite faster." | Pack (Sabertooth, Cave Pups) | none | squad (have); Pack (formation) |
| Hide Shield (C Infantry 50) | **Cover** (sharpened from Guard) | Pebbler, Bolas Thrower and every straight shot; protects shooters behind it | Atlatl (arcs), Rockfall Shaman (from above), Boulder Hurler (Shatter), Tuskback | Shield raised; straight shots glance off | "Its hide shield covers it and the troops just behind it from straight shots. Arcs pass over." | Shield Wall (two or more); Phalanx front; Pebblers behind | `shield_lock` (W1 re-render) | `cover` (new) |
| Torch Runner (C Infantry 50) | **Raider** (sharpened) | All-ranged armies, turtles, an empty lane | Bonker, Hide Shield (melee blocks it), Bolas (slow), Rock Thrower | Ducks past shooters with a smoke trail and a whoosh; a torch flare on the base | "Runs past enemy shooters for the base, where its torch deals double. Any melee troop stops it." | A Tuskback push that draws the defence forward | none | `raider` (new); first to hold back (10.10) |
| Bolas Thrower (C Ranged 75) | Snag (sharpened: 35% slower for 2 s) | Tuskback (no charge while slowed), Torch Runner | Hide Shield (cover), Atlatl, Sabertooth | Bolas wrap the legs; slow icon | "Its bolas tangle legs: the target slows by 35% for 2 s and cannot charge." | Atlatl (a slowed target stays in the splash) | none | on-hit slow (have; numbers) |
| Woolly Rhino (C Heavy 150) | **Hardened** (new; cleave dropped) | Hunting Wolves, Cave Pups, Bonkers, pebbles | Boulder Hurler (Shatter, ×3), Spear Hunter (×3), Atlatl (big arcs) | A wool puff and a dull thud; small damage numbers | "Thick wool: every hit it takes is 5 weaker. Big hits still hurt." | Herbalist behind (armour plus heals) | none | `hardened` (new) |
| Atlatl Thrower (R Ranged 75, Long range) | Long range (kept) | Shield walls, clumps, held lines | Sabertooth, the Mammoth (drop 2), Stampede | Arc and landing marker (built) | Kept | Bolas (slowed targets) | none | have |
| Boulder Hurler (R Anti-heavy 100) | **Shatter** (new) and the class kit | Woolly Rhino, a Hide Shield wall, Heavies, the Mammoth | Bonker, Hunting Wolves (light: ×0.5), Sabertooth | The boulder smashes; shards; a shield pops | "Its boulders smash shields and thick hides: they ignore cover and armour, and deal triple damage to armored and mech." | Behind a Hide Shield | none | `shatter` attack field (new) |
| Herbalist (R Support 110) | Heal (kept) | Long fights; a Hardened Rhino | Sabertooth, Atlatl, Rockfall Shaman | Heal glyph (built) | Kept | Woolly Rhino | none | have |
| Pelt Rager (R Infantry 50) | Frenzy (kept) | Long scrums | Burst before it rages: Atlatl, a Tuskback charge; Cave Bear's daze | Red rage glow | Kept | Drum Shaman | none | have |
| Beast Caller (E Support 200) | Summon (kept); pups join a Pack | Single big hitters, aimed shots | Pebbler (ricochet), Sabertooth, Atlatl | Built | Kept, plus: "Pups join a Pack with other beasts." | Pack | none | have |
| Cave Bear (E Heavy 200) | Daze (kept) | Clumps, a Sabertooth landing, chargers | Spear Hunter, Boulder Hurler (×3); shooters outside the roar | Roar ring, dizzy stars (built) | Kept | Tuskback (daze, then charge) | none | have |
| Rockfall Shaman (E Support 200) | Call-in (kept) | Shield walls (from above), clumps | Sabertooth, Atlatl (outranges it) | Marker and falling boulder (built) | Kept | Bolas (slowed targets under the rock) | none | have |
| Elk Chieftain (L 350) | **War Cry** (new: replaces its always-on aura and first-hit bonus) and cleave (kept) | Making a wave or a charge land at once | Spear Hunter, Boulder Hurler | A horn blast ring; allies flash | "Every 12 s its horn calls a charge: nearby allies run faster and hit harder for 4 s. Its antlers sweep two." | Tuskback (run-up sooner), Wedge, Pack | none (the ability clip) | `warCry` (extended) |
| Training Dummy (hidden, tutorial) | none (kept) | | | | Kept | | none | unchanged |
| Cave Pup (hidden summon) | joins a Pack | | | | Kept | Pack | none | Pack (formation) |

### 7.2 Bronze (drop 1)

| Card | Signature | Strong vs | Weak vs | Tell | Card text | Works with | New clip | Sim kind |
|---|---|---|---|---|---|---|---|---|
| Hoplite (C Infantry 50, starter) | **Shove** "Shield Bash" (sharpened: every third blow) | Holding the front; spoiling aimed shots | War Chariot, War Elephant, Javelineer | Shield bash on the third blow, dust | "Every third blow is a shield bash that knocks the target back and spoils its swing." | Phalanx front (Phalangite behind) | `shield_lock` (W1 re-render) | `shove` (new) |
| Javelineer (C Ranged 75, starter) | Pierce (kept) | Infantry in file, squads | Shield Bearer (cover), Cretan, Amazon | Built | Kept | Behind a Shield Bearer | none | have |
| War Chariot (C Heavy 150, starter) | **Momentum** "Scythe Charge" | Shooters and supports in open lane | Phalangite (braced), Tragic Chorus (slow), Rhodian Slingers (chaff) | Charging dust trail and speed lines | "After a free run it charges: faster, and its first hit deals double and knocks back. Slows and stops end the charge." | Wedge; Aulos Piper's tune | `charge` (W1 re-render) | `firstHitBonus` + run-up |
| Phalangite (R Anti-heavy 100, starter) | Reach (kept) | Heavies, chariots, the Wooden Horse | Hoplite, Shield Bearer, Rhodian Slingers | Sarissa lowered in a Phalanx | Kept | Phalanx behind Hoplite or Shield Bearer | `spear_set` (W1 re-render) | have |
| Standard Bearer (R Support 110) | Aura: +15% damage (kept) | Even fights | Amazon, Cretan, Scorpion | Built | Kept | Javelineers; the Legion | none | have |
| Scorpion (E Artillery 200) | **Siege range** (item 5; the bolt still pierces 3) | Held lines, shield walls, the Legion's shell (siege bolts pass shields), turtles | Amazon Rider (leap), Chariot Rush, a Cretan once the fronts meet | Long bolt, landing line | "Siege range: from very far back it fires a bolt that skewers up to 3 in a row. Cannot hit troops closer than 150, or air. Quarter damage to bases." | Tragic Chorus (slowed lines) | none | data (range 560, min 150, `coverPass`) |
| Bronze Colossus (L 350) | Death Blast "Molten Heart" (kept) and slowing stomps | Melee clumps | Belly Bowman, Phalangite; fight it at range | Built | Kept | Standard Bearer | none | have |
| Shield Bearer (C Infantry 50) | **Cover** | Javelineer, Discus Thrower, Rhodian Slingers | Cretan (arcs), Scorpion (siege bolts pass), the Colossus and Hydra in melee, Zeus's Bolts | `shield_lock`; shots glance off | "Its big shield covers it and the troops just behind from straight shots. Arcs and siege bolts pass." | Shield Wall; Phalanx front; Javelineers behind | `shield_lock` (W1 re-render) | `cover` |
| Thracian Raider (C Infantry 50) | **Raider** | All-ranged armies, turtles | Hoplite, Shield Bearer, Tragic Chorus, Archer Tower | Run-past trail and whoosh; a blade flash on the base | "Runs past enemy shooters for the base, where its blade deals double. Any melee troop stops it." | A War Chariot push; Aulos Piper's tune | none | `raider`; second to hold back |
| Rhodian Slingers (C Ranged 75, squad 3) | Squad (kept) | The Belly Bowman's aimed bolt (bait), single hitters | Discus (ricochet), Cretan, the Hydra and Colossus | Built | Kept | Chaff in front of a War Chariot | none | have |
| Discus Thrower (C Ranged 75) | Ricochet (kept) | Slingers, Hoplite lines | Shield Bearer, Cretan, Amazon | Built | Kept | Behind a Shield Bearer | none | have |
| War Elephant (C Heavy 150) | **Hardened** (cleave dropped) | Slingers, Javelineers, Hoplites | Belly Bowman (aimed ×3), Phalangite (×3), Scorpion | A hide thud; small numbers | "Thick hide: every hit it takes is 6 weaker. Big hits still hurt." | Standard Bearer | none | `hardened` |
| Cretan Archer (R Ranged 75, Long range) | Long range (kept) | Shield walls and the Legion's shell | Amazon, Scorpion (outranges it), Chariot Rush | Built | Kept | Tragic Chorus (slowed targets) | none | have |
| Belly Bowman (R Anti-heavy 100) | **Aimed Shot** and the class kit | War Elephant, War Chariot, the Colossus, the Hydra | Hoplite (shove spoils the aim), Shield Bearer (cover), Rhodian Slingers (bait), Amazon | Spans and holds; a sight line to the target | "Spans its belly-bow for about 2 s (a line shows the target), then a bolt dealing triple to armored and mech. A shove or a stun spoils it." | Behind a Shield Bearer | optional `aim` (W1 re-render) | `windupPct` 70 + `aim` flag |
| Aulos Piper (R Support 110) | **War Cry** "Marching Tune" (replaces the always-on speed aura) | Getting chariots to their charge sooner; racing raiders to the gate | Amazon, Cretan | A burst of notes, a ring | "Every 10 s a marching tune: nearby allies move 30% faster for 4 s." | War Chariot (run-up), Thracian Raider | none | `warCry` |
| Tragic Chorus (R Support 110) | Dread: slow (kept) | Chariots (no charge while slowed), raiders | Amazon, Cretan, Scorpion | Built | Kept | Cretan and Scorpion (slowed targets stay in the splash) | none | have |
| Wooden Horse (E Siege 200) | Siege and riders (kept) | Bases and forts | Phalangite, Belly Bowman, any blocker | Built | Kept | The Aulos Piper's tune; the Legion as escort | none | have |
| Amazon Rider (E Skirmisher 200) | Leap (kept) | Cretan, Scorpion, supports | Minotaur, War Elephant, Hoplite reinforcements | Built | Kept | | none | have |
| Minotaur (E Heavy 200) | Frenzy (kept; its first-hit charge goes, the War Chariot owns Momentum in Bronze) | Long brawls | Belly Bowman, Phalangite | Rage glow | "Armored brawler. Below half health it rages: 30% more damage and faster blows." | Standard Bearer | none | have (data) |
| Hydra (L 350) | Drop 1: kept (cleave 3, venom slow). Drop 2: **Rampage** | From drop 2: squads and infantry lines (it feeds on them) | Belly Bowman, Phalangite (burst it early) | From drop 2: it grows a little per kill; bite pips | From drop 2: "Every kill feeds it: +10% damage and its bite reaches one more enemy, up to 5. Its venom slows." | Tragic Chorus | none | have; `rampage` (new, drop 2) |
| **Legion** (E Infantry squad of 4, 200; new card, item 45) | **Testudo** | Shooters and arrow turrets (shots its shields stop) | Scorpion (siege bolts), blasts and fire, melee, stuns, powers | The shell: shields front, sides and roof; arrows glance and stick | "Four legionaries who lock shields into a tortoise under arrows and stones: much less damage, half pace, no attacks. They open to fight when foes close in." | Wooden Horse escort; Standard Bearer | full new model (art tracks after W2) | `testudo` (item 45) and four-member squads |

### 7.3 Medieval (drop 1)

| Card | Signature | Strong vs | Weak vs | Tell | Card text | Works with | New clip | Sim kind |
|---|---|---|---|---|---|---|---|---|
| Footman (C Infantry 50, starter) | **Cover** (sharpened from Shield Wall resist) | Longbowman, Crossbowman | Yeoman (arcs), Flailman (Shatter), Mangonel, Alchemist, Heavies | `shield_lock`; shots glance off | "Its shield covers it and the troops just behind from straight shots. Arcs pass over." | Shield Wall; Phalanx front (Pikeman behind); archers behind | `shield_lock` (W2) | `cover` |
| Longbowman (C Ranged 75, starter) | **Snag** (new: 20% slower for 1.5 s) | Destrier (no charge while slowed), Brigand | Footman (cover), Yeoman, War Hounds | Arrows pin; slow icon | "Its arrows pin the target: it slows by 20% for 1.5 s and cannot charge. Hits air." | Yeoman (pinned targets stay in the arc) | none | on-hit slow (have) |
| Destrier Knight (C Heavy 150, starter) | **Momentum** "Lance" | Shooters in open lane | Pikeman (braced), Longbowman (slow), Squires (chaff) | Couched lance at the gallop, dust trail | "After a free run it charges: faster, and its lance deals double and knocks back. Slows and stops end the charge." | Wedge; Ursa's roar (stun, then charge); the Herald's shields | `charge` (W2) | `firstHitBonus` + run-up |
| Pikeman (R Anti-heavy 100, starter) | Reach (kept) | Destrier, Greatsword, the Ram, the Belfry | Footman, Squires, Flailman | `pike_set` in a Phalanx and when braced against a charge | Kept | Phalanx behind a Footman | `pike_set` (W2) | have |
| Friar (R Support 110) | Heal (kept) | Long fights | Yeoman, Mangonel, War Hounds; the Lindworm's burn (drop 2) | Built | Kept | Greatsword Knight | none | have |
| Battering Ram (E Siege 200) | Siege (kept) | Bases, forts | Pikeman, Warhammer, any blocker | Built | Kept | The Herald's shields; Siege Belfry | none | have |
| Ursa Paladin (L 350) | **Daze** "Roar" (changed from the shield roar: the Herald keeps the shields) and cleave | Clumps, Squires, a Destrier wedge | Pikeman, Warhammer, Kennel Master | Roar ring, dizzy stars | "Every 15 s its roar stuns nearby enemies for 1 s (Legendaries half as long). It cleaves two." | Destrier (stun, then charge) | none | `timeStop` with `frozen: false` (have; data) |
| Squires (C Infantry 50, squad 2) | Squad (kept) | The Crossbowman's bolt (bait), a Destrier charge (chaff) | Greatsword, Mangonel, Lindworm | Built | Kept | Chaff in front of shooters | none | have |
| Flailman (C Infantry 50) | **Shatter** (cleave dropped) | Footman walls; shields (the Herald's) | Destrier, Greatsword, Longbowman | The flail swings over the shield; shards | "Its flail swings over shields: hits ignore cover and armour, and smash shields." | Against walls | none | `shatter` |
| Brigand (C Infantry 50) | **Raider** with **Plunder** | Turtles, all-ranged armies, banked gold | Footman (blocks him), Longbowman (slow), Crossbow Nest | Run-past trail and whoosh; coins fly from the enemy's gold to yours | "Runs past enemy shooters for the base. Each hit there deals double and steals 3 gold. Any melee troop stops him." | A Destrier push | none | `raider` + `plunderGold`; third to hold back |
| Crossbowman (C Ranged 75) | **Aimed Shot** "Cranked Bolt" (keeps ×1.25 against armored) | Greatsword, Destrier | Footman (cover), Squires (bait), War Hounds, a charge's knockback | Cranks, holds, a sight line | "Cranks and aims for about 1.7 s (a line shows the target), then a heavy bolt, 25% harder against armour. A shove or stun spoils it. Hits air." | Warhammer Sergeant (Sunder first) | optional `aim` (W2) | `windupPct` 70 + `aim` |
| Greatsword Knight (C Heavy 150) | Cleave (kept) | Squires, War Hounds, infantry lines | Pikeman, Warhammer, Crossbowman | Built | Kept | Friar | none | have |
| Yeoman Archer (R Ranged 75, Long range) | Long range (kept) | Shield walls, clumps, the Mangonel once the fronts meet | Mangonel (outranges it), War Hounds (leap), Knights' Charge | Built | Kept | Longbowman (pinned targets); Warhammer (Spotting, drop 2) | none | have |
| Warhammer Sergeant (R Anti-heavy 100) | Sunder (kept) | Greatsword, Ursa, Lindworm | Footman, Squires, Flailman | Built | Kept | Crossbowman; artillery (Spotting, drop 2) | none | have |
| Herald (R Support 110) | **War Cry** "Fanfare" (today's periodic shields, now a War Cry) | Protecting a push and the Ram | Yeoman, Mangonel, War Hounds | Built | Kept | Battering Ram, a Destrier wedge | none | `warCry` (today's data) |
| Kennel Master (R Support 110) | Summon (kept); the War Hounds now **leap** the front at shooters and form a Pack | Back lines (Yeoman, Mangonel, Crossbowman), single hitters | Greatsword (cleave), Mangonel, Yeoman | Hounds pounce (built) | "Unleashes a War Hound every 9 s, two at a time. Hounds leap the front at enemy shooters and hunt in packs." | Pack | none | `summon` (have); `pounce` on the hidden War Hound |
| Mangonel (E 200) | **Siege range** | Walls, held lines, Squires | Yeoman (counter-battery once the fronts meet), War Hounds, Knights' Charge | Built (arc, landing marker) | "Siege range: hurls a stone from very far back for big splash. Cannot hit troops closer than 150, or air. Quarter damage to bases." | Warhammer (Spotting, drop 2) | none | data (range 580, min 150) |
| Siege Belfry (E 200) | Riders (kept) | Escorting the Ram | Pikeman, Warhammer | Built | Kept | Battering Ram | none | have |
| Alchemist (E Support 200) | Call-in (kept) | Walls (from above), clumps | Yeoman, War Hounds | Built | Kept | Longbowman (pinned targets under the flask) | none | have |
| Lindworm (L 350) | Drop 1: kept (cone breath). Drop 2: **Burn** | From drop 2: the Friar (heals halved), Squires, clumps | Pikeman, Warhammer, Crossbowman; spread out | From drop 2: green flames on targets | From drop 2: "Its fire breath hits the target and up to 4 behind it and sets them burning: 3 s of fire, and they heal half as much." | Ursa (stun, then burn) | none | `followBehind` (have); burn (new, drop 2) |
| War Hound (hidden summon) | gains **Leap** (search 150, cooldown 10 s, first bite ×1.5) and Pack | Shooters at the back | Greatsword, splash | Pounce (built) | Kept | Pack | none | `pounce` (have) |

### 7.4 Gunpowder (drop 2)

| Card | Signature | Strong vs | Weak vs | Tell | Card text | Works with | New clip | Sim kind |
|---|---|---|---|---|---|---|---|---|
| Corsair (C Infantry 50, starter) | **Hook** "Boarding Hook" (sharpened: pull 40 lu) | Pulling the first enemy it fights into your line; breaking a link | Cuirassier, Dragoon (large or armoured resist), Blunderbuss | Grapple line (built) | "Its boarding hook pulls the first enemy it fights 40 lu into your line." | Blunderbuss (pull into the cone), Grenadier | none | first-hit pull (have; numbers) |
| Fusilier (C Ranged 75, starter) | **Firing Line** and **Square** (new) | Infantry and shooters (line); chargers and leapers (square) | Coehorn, Grenadier, Bronze Cannon (artillery), Hussar | The front kneels and fires; bayonets levelled in square | "Line infantry: two side by side form a firing line (the front kneels, both hit harder); against cavalry they form a square." | Another Fusilier; Drummer Boy (tempo) | `kneel_fire`, `square` (W2) | formations (new) |
| Cuirassier (C Heavy 150, starter) | **Momentum** | Lines, shooters and guns in open lane | Fusilier Square, Grenadier, Bagpiper | Sabre levelled at the gallop | "After a free run it charges: faster, and its sabre deals double and knocks back. Slows and stops end the charge." | Wedge; the Grand Marshal's War Cry | `charge` (W2) | `firstHitBonus` + run-up |
| Grenadier (R Anti-heavy 100, starter) | Lob (kept) | Cuirassier, Dragoon, squares | Corsair, Highlander, Voltigeurs | Built | Kept | Corsair (hook into the splash) | none | have |
| Field Surgeon (R Support 110) | Heal (kept) | Long fights | Hussar, Coehorn | Built | Kept | Dragoon | none | have |
| Bronze Cannon (E Artillery 200) | **Siege range** | Squares, lines, walls | Hussar, Balloon Admiral, Horse Artillery | Built, landing marker | "Siege range: a cannonball from very far back for heavy splash. Cannot hit troops closer than 150, or air. Quarter damage to bases." | Cuirassier (cavalry forces squares, the cannon breaks them) | none | data (range 600, min 150) |
| Balloon Admiral (L 350) | Flying carpet bomber and crash (kept) | Melee-only armies | Fusilier, Voltigeurs, Swivel Gun, Congreve Rack | Built | Kept | | none | have |
| Highlander (C Infantry 50) | **Frenzy** "Highland Fury" (changed from Guard: bullets pass a targe) | Long melee | Coehorn, a Cuirassier charge, Mesmerist | Rage glow | "Below half health it rages: 30% more damage and faster blows." | Drummer Boy | none | `frenzy` (have) |
| Powder Monkey (C Infantry 50) | **Raider** (sharpened) and his cask (kept) | All-ranged armies, turtles | Corsair, Highlander, Bagpiper, Swivel Gun; shoot him before he pops | Run-past trail; the cask pops | "Runs past enemy shooters for the base, where his scoop deals double. When he falls, his little cask pops." | | none | `raider` + `onDeathExplode` |
| Voltigeurs (C Ranged 75, squad 3) | **Backstep** (new) | Slow melee, Highlanders, Corsairs | Blunderbuss (a cone hits all three), Grenadier, Hussar | Each hops back from melee | "Three skirmishers who fire and fall back: when melee closes in, each hops back. Hits air." | In front of a Fusilier line | optional `hop_back` (W2) | `backstep` (new) |
| Blunderbuss (C Ranged 75) | Cone (kept) | Squads up close, Voltigeurs | Fusilier (outranges it), Coehorn, Hussar | Built | Kept | Corsair (hook into the cone) | none | have |
| Dragoon (C Heavy 150) | **Hardened** (new; keeps its carbine) | Voltigeurs, Corsairs, musket fire | Grenadier, Wall Gunner, Coehorn | A clink; small numbers | "Armoured horseman with a carbine: every hit it takes is 9 weaker." | Field Surgeon | none (its earlier `wheel_back` is no longer needed) | `hardened` |
| Coehorn Crew (R Ranged 75, Long range) | Long range (kept) | Lines, squares | Hussar, Balloon, Bronze Cannon | Built | Kept | Bagpiper; Cuirassier | none | have |
| Wall Gunner (R Anti-heavy 100) | **Aimed Shot** | Cuirassier, Dragoon, the Marshal | Corsair, Highlander (light), Hussar, a shove | Aims from the rest; a sight line | "Aims its long wall-gun from a rest for about 1.4 s (a line shows the target), then fires triple damage to armored and mech." | Behind Corsairs | optional `aim` (W2) | `windupPct` 70 + `aim` |
| Drummer Boy (R Support 110) | Aura: +25% attack speed (kept) | Even fights | Hussar, Coehorn | Built | Kept | Firing Line (attack speed and line damage sit under different caps) | none | have |
| Bagpiper (R Support 110) | Dread (kept) | Cuirassier (no charge while slowed), Powder Monkey | Hussar, Coehorn | Built | Kept | Coehorn (slowed targets) | none | have |
| Rocket Cart (E 200) | Volley (kept) | Groups | Hussar, a Cuirassier charge | Built | Kept | Bagpiper | none | have |
| Hussar (E 200) | Leap (kept) | Coehorn, the Cannon, supports | Fusilier Square, Mesmerist, Highlander | Built | Kept | | none | have |
| Mesmerist (E Support 200) | Daze (kept) | Hussar landings, a Cuirassier wedge | Coehorn, Bronze Cannon | Built | Kept | Bronze Cannon (dazed targets stand still) | none | have |
| Grand Marshal (L 350) | **War Cry** "Forward!" (replaces the always-on aura), Call-in (kept), cleave | Making a cavalry wave land | Wall Gunner, Grenadier, Voltigeurs | Sabre raised, a ring | "Every 10 s he orders the advance: nearby allies move and hit harder for 4 s. He also calls a cannonball onto the nearest enemy within 400." | A Cuirassier wedge | none | `warCry` + `callStrike` |

### 7.5 Industrial (drop 2)

| Card | Signature | Strong vs | Weak vs | Tell | Card text | Works with | New clip | Sim kind |
|---|---|---|---|---|---|---|---|---|
| Riveter (C Infantry 50, starter) | **Shatter** (replaces Big Wrench) | Iron Mantlet walls, the Armoured Car, shields | Steam Golem, Steam Tractor, a Carbineer line | Rivets pop; shards | "Its big wrench pops rivets: hits ignore cover and armour, and smash shields." | Against walls and armour | none | `shatter` |
| Carbineer (C Ranged 75, starter) | **Firing Line** | Infantry and shooters | Bomb Bowler, Trench Mortar, Alpine, a Golem charge | The front kneels | "Line infantry: two side by side form a firing line: the front kneels and both hit harder. Hits air." | Behind an Iron Mantlet; Bandmaster | `kneel_fire` (W3) | formation |
| Steam Golem (C Heavy 150, starter) | **Momentum** "Piston Punch" | Shooters in open lane | Coal Miners (chaff), Steam Driller, Harpoon | Head down, steam trail | "After a free run it charges: faster, and its piston punch deals double and knocks back." | Wedge | `charge` (W3) | `firstHitBonus` + run-up |
| Harpoon Gunner (R Anti-heavy 100, starter) | Hook (kept) | Golem, Armoured Car, Armoured Train | Riveter, Coal Miners, Iron Mantlet (its cover stops the harpoon) | Built | Kept | Bomb Bowler (pull into the splash) | none | have |
| Flare Spotter (R Support 110) | Sunder (kept) and a Spotting marker | Letting artillery reach marked targets | Alpine, Trench Mortar | A flare over the target | "Its flares mark armored targets first: marked enemies take 20% more and can be shelled from further away." | Trench Mortar (Spotting) | none | have + spotting |
| Sapper (E 200) | **Tunnel** (new), with siege and its death blast | Walls, forts, turtles, a Mint (item 42) | Melee at your gate, Steam Hammer, Gun Line (50% while burrowed) | Burrows; a dirt mound and trail along the lane; a 1.5 s surfacing crack | "Digs under the battle and surfaces at the enemy gate, with a warning, to blast the base. Untouchable underground except by powers." | A push that draws the defence out | `burrow`, `surface` (W3) | `tunnel` (new) |
| Land Dreadnought (L 350) | Riders (kept) | Groups at range | Trench Mortar, Harpoon, Steam Driller | Built | Kept | | none | have |
| Coal Miners (C Infantry 50, squad 2) | Squad (kept) | Aimed shots, a Golem charge (chaff) | Bomb Bowler, Spark Scientist, Armoured Car | Built | Kept | | none | have |
| Iron Mantlet (C Infantry 50) | **Cover** | Carbineers, rifle and Gatling fire | Bomb Bowler, Trench Mortar (arcs), Riveter (Shatter), Heavies | `shield_lock`; bullets spark off | "Pushes a steel shield that covers it and the troops just behind from bullets and arrows. Lobs and shells pass." | Shield Wall; Phalanx front (Steam Driller behind); Carbineers behind | `shield_lock` (W3) | `cover` |
| Dispatch Rider (C Infantry 50) | **Raider** | All-ranged armies, turtles | Riveter, the Tinker's soldiers, Gatling Gun | Run-past trail, an engine whine | "Runs past enemy shooters for the base on its motorbike, where its hits deal double. Any melee troop stops it." | | none | `raider` |
| Bomb Bowler (C Ranged 75) | Lob (kept) | Lines and walls (lobs pass cover), Coal Miners | Carbineer (outranges it), Alpine | Built | Kept | Harpoon (pull into the splash) | none | have |
| Steam Tractor (C Heavy 150) | **Shove** "Plough" (cleave dropped) | Pushing the front; spoiling the Driller's Focus and aims | Steam Driller (braced), Harpoon, Trench Mortar | The plough scoops; dust | "Every third scoop of its plough knocks the target back and spoils its swing." | A Golem wedge | none | `shove` |
| Trench Mortar (R Ranged 75, Long range) | Long range (kept) | Walls, lines | Alpine, Iron Horse, Railway Gun | Built | Kept | Flare Spotter (Spotting) | none | have |
| Steam Driller (R Anti-heavy 100) | **Focus** "Drill" (new) | Golem, Tractor, Armoured Car, Train, Dreadnought | Riveter, Coal Miners, the Tinker's soldiers (they reset it), Spark Scientist (daze) | Drill sparks grow hotter | "The drill bites deeper the longer it works one target, up to 2.5x. A new target or a stun resets it." | Phalanx behind an Iron Mantlet | none | `focus` (new) |
| Bandmaster (R Support 110) | Aura: +20% damage (kept) | Even fights | Alpine, Trench Mortar | Built | Kept | A Carbineer line (shares the damage cap) | none | have |
| Clockwork Tinker (R Support 110) | Summon (kept) | Single hitters, Focus | Bomb Bowler, Alpine | Built | Kept | Chaff in front of a Golem | none | have |
| Armoured Car (E 200) | **Hardened** (new) | Coal Miners, Carbineers, small fire | Riveter (Shatter), Harpoon, Steam Driller | Bullets spark off | "Riveted armour: every hit it takes is 12 weaker. It sprays its machine gun at ground and air." | | none | `hardened` |
| Alpine Climber (E 200) | Leap (kept) | Trench Mortar, supports | Steam Golem, Spark Scientist | Built | Kept | | none | have |
| Spark Scientist (E Support 200) | Daze and chain (kept) | Squads, Focus | Trench Mortar, Alpine | Built | Kept | | none | have |
| Armoured Train (L 350) | Frenzy (kept) | Long fights | Harpoon, Steam Driller, the Tinker's soldiers | Built | Kept | | none | have |
| Clockwork Soldier (hidden summon) | none (kept) | | | | Kept | | none | unchanged |

### 7.6 Modern (drop 3)

| Card | Signature | Strong vs | Weak vs | Tell | Card text | Works with | New clip | Sim kind |
|---|---|---|---|---|---|---|---|---|
| Trench Raider (C Infantry 50, starter) | **Cleave** "Trench Shovel" (new) | SMG Squad, infantry lines | Tankette, Assault Gun, Ghillie | A shovel sweep | "Swings an entrenching shovel that hits 2 enemies at once." | | none | cleave (have) |
| Rifleman (C Ranged 75, starter) | **Snag** "Suppress" (sharpened: a snare of 20% for 1.5 s) | Tankette (no rush while suppressed), Commando | Sandbag Carrier, Mortar Team, Gyrocopter | Suppression icon | "Suppressing fire: hits pin the target, slowing its moves and attacks for 1.5 s; it cannot charge. Hits air." | Ghillie (pinned targets); Mortar | none | on-hit snare (have) |
| Tankette (C Heavy 150, starter) | **Momentum** "Tracked Rush" | Shooters in open lane | Rifleman (suppression), SMG Squad (chaff), Bazooka, Sticky Bomber | Tracks spin, dust trail | "After a free run it rushes in: faster, and its first shot deals double and knocks back." | Wedge | `charge` (W3) | `firstHitBonus` + run-up |
| Bazooka Trooper (R Anti-heavy 100, starter) | **Shatter** (new) | Behemoth, Tankette, Assault Gun, Gyrocopter | Trench Raider, SMG Squad, Rifleman | Backblast; shards | "Anti-tank rockets: triple damage to armored and mech; they ignore cover and armour. Hits air." | | none | `shatter` |
| Radio Operator (R Support 110) | Call-in (kept) | Walls, clumps | Ghillie, Mortar, Dive Bomber | Built | Kept | Rifleman | none | have |
| Gyrocopter (E 200) | Flying gunship (kept) | Melee-only armies | Rifleman, Bazooka, Flak Gun | Built | Kept | | none | have |
| Behemoth Tank (L 350) | **Hardened** (new) and its anti-air gun (kept) | Rifles, SMGs, infantry | Mortar Team, Bazooka (Shatter, ×3), Sticky Bomber (Fuse ×3) | Bullets ping off | "Super-heavy armour: every hit it takes is 17 weaker. Its main gun splashes; its machine gun shoots down air." | Combat Medic | none | `hardened` |
| Commando (C Infantry 50) | **Raider** | All-ranged armies, turtles | Trench Raider, Rifleman, MG Nest | Run-past trail | "Runs past enemy shooters for the base, where his blows deal double. Any melee troop stops him." | | none | `raider` |
| Sandbag Carrier (C Infantry 50) | **Cover** | Riflemen, SMGs | Rifle Grenadier, Mortar, Bazooka, Radio Operator | `shield_lock`; bullets thud into sand | "Its sandbag covers it and the troops just behind from bullets. Grenades and shells pass." | Shield Wall; Riflemen behind | `shield_lock` (W3) | `cover` |
| SMG Squad (C Ranged 75, squad 3) | Squad (kept) | The Ghillie's shot (bait) | Rifle Grenadier, Trench Raider, Behemoth | Built | Kept | | none | have |
| Rifle Grenadier (C Ranged 75) | Lob (kept) | Sandbag walls, SMG Squad | Rifleman, Gyrocopter | Built | Kept | | none | have |
| Assault Gun (C Heavy 150) | **Shove** "HE Shell" | Spoiling the Ghillie's aim; pushing the front | Bazooka, Sticky Bomber (braced), Mortar | The blast pushes | "Every third high-explosive shell knocks the target back and spoils its aim." | | none | `shove` |
| Mortar Team (R Ranged 75, Long range) | Long range (kept) | Walls, lines | Gyrocopter, Dive Bomber, Paratroopers | Built | Kept | Searchlight Sniper (Spotting) | none | have |
| Sticky Bomber (R Anti-heavy 100) | **Fuse** (new) | Behemoth, Tankette, Assault Gun, Bulldozer | Trench Raider, SMG Squad, Rifleman | A blinking charge on the hull, a beep, a blast | "Slaps sticky charges on hulls that blow 1.5 s later for triple damage to armored and mech." | | none | `fuse` (new) |
| Combat Medic (R Support 110) | Heal (kept) | Long fights | Ghillie, Mortar, Dive Bomber | Built | Kept | Behemoth | none | have |
| Bulldog Sergeant (R Infantry 50) | Frenzy (kept) | Long brawls | Tankette, Assault Gun, Ghillie | Built | Kept | | none | have |
| Dive Bomber (E 200) | **Flying dive bomber: Dive** (new variant) | Clumps, formations, held balls | Rifleman, Bazooka, Flak Gun; spreading out | A shadow on the ground, a whistle, the dive | "Every 6 s it dives on the biggest group below (a shadow warns first) and drops one heavy bomb." | | none | `bomber` + `dive` |
| Bulldozer (E 200) | **Overrun** and siege | Bases, forts, lines of light troops | Bazooka, Sticky Bomber (braced: they block it), Tankette (large: it blocks it) | The blade shoves small troops aside | "Drives for the enemy base: small foes cannot stop its blade. Large or braced foes block it." | | none | `overrun` + `siegeOnly` |
| Ghillie Sniper (E 200) | **Aimed Shot** and back-line priority | Supports and shooters | Sandbag Carrier (cover), SMG Squad (bait), Assault Gun (shove) | A laser sight line for the aim | "Aims for about 2.8 s at enemy shooters and supports first (a line shows the target), then one huge shot. A shove or stun spoils it." | Rifleman (pinned targets) | optional `aim` (W3) | `windupPct` 70 + `aim` |
| Sky Fortress (L 350) | Flying carpet bomber, riders, crash (kept) | Ground armies | SMG Squad, Bazooka, Flak Gun, Gyrocopter | Built | Kept | | none | have |

### 7.7 Future (drop 3)

| Card | Signature | Strong vs | Weak vs | Tell | Card text | Works with | New clip | Sim kind |
|---|---|---|---|---|---|---|---|---|
| Photon Knight (C Infantry 50, starter) | Barrier (kept) | Big single hits: aimed shots, beams | Android Pair, Needle Gunner, EMP | Built | Kept | | none | have |
| Pulse Trooper (C Ranged 75, starter) | **Snag** (new: 20% slower for 1 s) | Hover Bike, Overload Android | Barrier Trooper, Arc Lobber, Jetpack | Slow icon | "Its pulse bolts disrupt: hits slow the target by 20% for 1 s. Hits ground and air." | Behind a Barrier Trooper | none | on-hit slow |
| Walker Mech (C Heavy 150, starter) | Reach (kept) | Infantry from the second rank | Rail Gunner, Plasma Lancer, EMP | Built | Kept | Phalanx behind a Barrier Trooper | none | have |
| Rail Gunner (R Anti-heavy 100, starter) | Pierce (kept) | Walker, Crab, the Chrono Titan | Photon Knight, Android Pair, Barrier Trooper | Built | Kept | | none | have |
| Repair Drone (R Support 110) | Heal, flying (kept) | Long fights | Pulse Trooper, Needle Gunner, Jetpack | Built | Kept | Crab Mech | none | have |
| EMP Saboteur (E 200) | EMP (kept; it also switches hardlight cover off for its stun) | Mechs, shields, hardlight walls | Photon Knight, Pulse Trooper | Built | Kept, plus: "...and switches hardlight cover off." | Particle Cannon | none | have (+ a small rule) |
| Chrono Titan (L 350) | Daze: Time Stop (kept) | Clumps | Rail Gunner, Plasma Lancer, Holo Projector | Built | Kept | | none | have |
| Android Pair (C Infantry 50, squad 2) | Squad (kept) | Aimed shots, Photon Knights | Arc Lobber, Crab Mech, Particle Cannon, Chrono Titan | Built | Kept | | none | have |
| Barrier Trooper (C Infantry 50) | **Cover** (hardlight) | Pulse Troopers, needles, lasers | Arc Lobber, Needle Gunner, EMP | `shield_lock`; bolts splash on the hardlight | "Its hardlight wall covers it and the troops just behind from bolts and bullets. Lobs pass, and an EMP switches it off." | Shield Wall; Phalanx front (Walker Mech behind) | `shield_lock` (W4) | `cover` |
| Hover Bike (C Infantry 50) | **Raider** | All-ranged armies, turtles | Photon Knight, Holo decoys, Pulse Laser | Run-past trail | "Runs past enemy shooters for the base on its hover bike, where its lance deals extra. Any melee troop or decoy stops it." | | none | `raider` |
| Needle Gunner (C Ranged 75) | **Shatter** (new) | Photon Knight (Barrier), Barrier Trooper walls, Crab Mech | Arc Lobber, Walker Mech, Particle Cannon | Needles spark through | "Its needles slip through energy shields: they ignore cover and armour, and strip shields. Hits air." | Overclock Engineer | none | `shatter` |
| Crab Mech (C Heavy 150) | **Hardened** (cleave dropped) | Android Pair, pulse fire | Needle Gunner, Rail Gunner, Particle Cannon, EMP | A clink | "Crab shell: every hit it takes is 16 weaker." | Repair Drone | none | `hardened` |
| Arc Lobber (R Ranged 75, Long range) | Long range (kept) | Walls, lines | Jetpack, Drone Carrier, Drone Swarm | Built | Kept | Target Painter (Spotting) | none | have |
| Plasma Lancer (R Anti-heavy 100) | **Burn** (new) and the class kit (reach 60) | Walker, Crab, Overload, the Repair Drone's patients | Photon Knight, Android Pair, Barrier Trooper | Targets glow and burn | "Its plasma lance sets targets burning: 3 s of fire, and they heal half as much. Triple damage to armored and mech." | Phalanx behind a Barrier Trooper | none | on-hit burn (new status) |
| Overclock Engineer (R Support 110) | Aura: +20% attack speed (kept) | Even fights | Jetpack, Arc Lobber | Built | Kept | Needle Gunner | none | have |
| Holo Projector (R Support 110) | Summon decoys (kept) | Aimed shots, single hitters, raiders (decoys block them) | Arc Lobber, Jetpack, Particle Cannon | Built | Kept | Particle Cannon (decoys soak while it aims) | none | have |
| Jetpack Trooper (E 200) | Flying gunship (kept) | Arc Lobber, supports | Rail Gunner, Pulse Trooper, Pulse Laser | Built | Kept | | none | have |
| Particle Cannon (E 200) | **Aimed Shot** "Dish Charge" | Lines, Walker, Crab | Holo decoys (bait), EMP Saboteur (a stun spoils it), Overload Android | The dish glows; a beam line during the charge | "Charges its dish for about 2.5 s (a glowing line shows the path), then a beam through 3 in a line. A stun spoils it." | Holo decoys | optional `aim` (W4) | `windupPct` 70 + `aim` |
| Overload Android (E 200) | Frenzy (kept) | Long brawls | Rail Gunner, Plasma Lancer, EMP | Built | Kept | | none | have |
| Drone Carrier (L 350) | **Riders** "Drone Wing" (changed from summon) | Ground and air near it | Arc Lobber, Rail Gunner, Plasma Lancer | Drones on its deck fire; they lift off when it falls | "Two drones on its deck shoot ground and air; when it falls they lift off and fight on. Its laser covers it." | | none | `riders` (have; data) |
| Holo Decoy (hidden summon) | none (kept) | | | | Kept | | none | unchanged |
| Attack Drone (hidden) | now the Drone Carrier's riders on death | | | | Kept | | none | `riders.onDeathSpawn` |

### 7.8 Cosmic (drop 3)

| Card | Signature | Strong vs | Weak vs | Tell | Card text | Works with | New clip | Sim kind |
|---|---|---|---|---|---|---|---|---|
| Star Legionnaire (C Infantry 50, starter) | **Barrier** "Deflector" (from resist) | Big single hits | Moonlings, Ion Ranger (many hits), Gravity Sage | The bubble pops | "A deflector shield absorbs the first 120 damage and recharges after 3 s out of combat." | | none | `innateShield` (have) |
| Ion Ranger (C Ranged 75, starter) | Ricochet (kept) | Moonlings, Swarmlings | Crystal Guard, Star Mortar, Warp Stalker | Built | Kept | Behind a Crystal Guard | none | have |
| Hover Tank (C Heavy 150, starter) | **Momentum** "Hover Rush" | Shooters in open lane | Moonlings (chaff), Graviton, Antimatter, Void Whisperer | A hover trail | "After a free run it rushes in: faster, and its first shot deals double and knocks back." | Wedge; Starwarden's shields | `charge` (W4) | `firstHitBonus` + run-up |
| Graviton Halberdier (R Anti-heavy 100, starter) | **Hook** "Gravity Pull" (new) with reach | Hover Tank, Asteroid Golem, the Leviathan; pulling a shooter into the Nova's splash | Star Legionnaire, Crystal Guard, Moonlings | A gravity ripple drags the target | "Its gravity halberd pulls the first enemy it fights 40 lu in. Reach; triple damage to armored and mech." | Phalanx behind a Crystal Guard; Nova Thrower | `spear_set` (W4) | first-hit pull (have; data) |
| Starwarden (R Support 110) | War Cry: shields (kept) | Protecting a push | Warp Stalker, Star Mortar, Star Fighter | Built (beacon ring) | Kept | Hover Tank | none | have |
| Warp Stalker (E 200) | Leap: blink (kept) | Star Mortar, supports | Asteroid Golem, Gravity Sage | Built | Kept | | none | have |
| Mothership (L 350) | Call-in, flying, crash (kept) | Ground clumps | Moonlings, Ion Ranger, Star Fighter | Built | Kept | | none | have |
| Crystal Guard (C Infantry 50) | **Cover** | Ion Rangers, lasers | Nova, Star Mortar, Mothership | `shield_lock`; lasers refract | "Its crystal shield covers it and the troops just behind from bolts and lasers. Lobs pass." | Shield Wall; Phalanx front (Graviton behind); Ion Rangers behind | `shield_lock` (W4) | `cover` |
| Void Skimmer (C Infantry 50) | **Raider** | All-ranged armies, turtles | Star Legionnaire, Void Whisperer, Ion Turret | Run-past trail | "Runs past enemy shooters for the base on its hover board, where its kicks deal double. Any melee troop stops it." | | none | `raider` |
| Moonlings (C Ranged 75, squad 3) | **Backstep** (new) | Slow melee | Ion Ranger, Nova Thrower, Warp Stalker | Each hops back | "Three moon aliens who hop back when melee closes in, spitting glowing pellets. Hits air." | | optional `hop_back` (W4) | `backstep` |
| Nova Thrower (C Ranged 75) | Lob (kept) | Crystal walls, clumps | Ion Ranger (outranges it), Star Fighter, Warp Stalker | Built | Kept | Graviton (pull into the splash) | none | have |
| Asteroid Golem (C Heavy 150) | **Hardened** (cleave dropped) | Moonlings, Swarmlings, ion fire | Star Mortar, Antimatter Rifler (Focus), Graviton (×3) | Rock chips | "Rock body: every hit it takes is 22 weaker." | Bio-Weaver | none | `hardened` |
| Star Mortar (R Ranged 75, Long range) | Long range (kept) | Walls, lines | Warp Stalker, Star Fighter, Comet Run | Built | Kept | Void Whisperer | none | have |
| Antimatter Rifler (R Anti-heavy 100) | **Focus** (new) | Hover Tank, Asteroid Golem, the Leviathan | Star Legionnaire, Crystal Guard, Moonlings (reset), Gravity Sage | The beam glows hotter | "Its antimatter beam intensifies on one target, up to 2.5x; a new target or a stun resets it. Triple damage to armored and mech." | Behind a Crystal Guard | none | `focus` |
| Bio-Weaver (R Support 110) | Heal (kept) | Long fights | Warp Stalker, Star Mortar, Star Fighter | Built | Kept | Asteroid Golem | none | have |
| Void Whisperer (R Support 110) | Dread (kept) | Hover Tank (no rush while slowed), Void Skimmer | Star Mortar, Warp Stalker | Built | Kept | Star Mortar (slowed targets) | none | have |
| Star Fighter (E 200) | Flying gunship (kept) | Nova, Star Mortar, melee-only armies | Moonlings, Ion Ranger, Ion Turret | Built | Kept | | none | have |
| Swarm Matron (E Support 200) | Summon (kept); Swarmlings form a Pack | Single hitters, Focus | Star Mortar, Nova, Ion Ranger | Built | Kept, plus: "Swarmlings hunt in packs." | Pack | none | have |
| Gravity Sage (E Support 200) | Daze (kept) | Clumps, Warp Stalker landings | Star Mortar, Warp Stalker | Built | Kept | | none | have |
| Star Leviathan (L 350) | Cone and riders (kept) | Clumps | Antimatter, Graviton, Swarm Matron | Built | Kept | | none | have |
| Swarmling (hidden summon) | joins a Pack | | | | Kept | Pack | none | Pack (formation) |

---

## 8. New troops

### 8.1 The Legion (Bronze Epic; drop 1)

Designed in `docs/design-history/item45-testudo.md` (Option A) and adopted here as the formation showpiece: four legionaries who close into a tortoise by themselves when shots their shields stop are aimed at them (70% less from those shots, half pace, no attacks) and open to fight when a foe comes within 50 lu. It shares Cover's coverage rule (the same shot types, the same code), so building it with drop 1 costs less than building it alone. Contract changes from item 45: four-member squads on an Epic card, the `testudo` kind, and its narrow exception to the −35% floor.

**Counter place:** strong against Bronze shooters (Javelineer, Discus, Slingers) and arrow turrets; answered by the Scorpion's siege bolts (they pass shields), melee (it opens), stuns and powers, and by slowing it under Cretan arcs. **Art cost:** a new four-man squad model with march, lock, covered walk, hold and break clips and portraits (item 45 section 7), made by the art tracks after W2: about 3-4 agent-days.

### 8.2 Considered and rejected

| Idea | Why not |
|---|---|
| A Medieval light horse that leaps (to reach artillery) | The War Hounds' leap closes the gap at no art cost |
| A Gunpowder lancer to break squares | Artillery is the historical and our answer to the Square; no gap |
| A Modern flamethrower (anti-heal) | Modern's healers already have three answers (Ghillie, Mortar, Dive Bomber) |
| Detector troops against tunnels | Only the Sapper tunnels in item 51; item 8's Underground class brings detectors with its burrowers |
| More siege-range cards | Item 5's own wave (new cards that reuse the Siege range family as data and art) |

---

## 9. How the related queue items fold in

| Item | How it folds in |
|---|---|
| **5 and 14** (very long range, siege range) | Item 14 already raised the Long range Rares to 400-440 lu (2026-10-07). Siege range becomes the signature of the artillery Epics: Scorpion and Mangonel in drop 1, Bronze Cannon in drop 2 (range 560-600, minimum 150, slow, quarter base damage, landing marker). Item 5's new siege-range cards per age stay its own wave and reuse the family as data |
| **8** (burrowing) | Tunnel on the Sapper (drop 2) is the prototype of the Underground class: the burrowed state, the targeting filter, the surfacing telegraph, the observation flag and the AI's gate defence. Item 8's burrowers per age and detector turrets then need only content and art |
| **12** (in-battle upgrade paths) | Not coupled (separate design and bump). Shared pieces: the Burn status (Fire Arrows), the kill count (Veterans and Rampage). Interactions are listed in 3.7: research and signatures never stack the same effect twice |
| **13** (Heavy balance) | Momentum makes the starter Heavies' burst conditional: it needs free lane, and slows, stops and Brace cancel it, so a Heavy stuck in a scrum hits at its plain rate. Hardened gives the second Heavy a defensive identity with three cheap answers (Shatter, Aimed Shot, the ×3 Anti-heavy). Gates: mono-Heavy against tier VII ≤ 35%, the Heavy share of winning armies reported (expected to fall from 28.5-31.2%), Heavy beats Infantry ≥ 65 kept |
| **29** (formation feel) | Formations extend the ranks: the same sorted file, the same gaps; the view's staging keeps linked members in neighbouring depth rows and plays their poses |
| **42** (the Mint) | Raiders stop at a Mint (it is a fort) and attack it; the Tunnel passes under it; Siege and Shatter keep the ×2 against structures |
| **45** (testudo) | The Legion ships in drop 1 with Cover's coverage rule; Shield Wall is the Commons' small version of the same idea |

---

## 10. Implementation plan

### 10.1 The drops

Each drop stands on its own: its sim kinds, content, AI, gates, art and UI ship together, and no match mixes old and new rules in its first ages.

| Drop | Ages | Sim kinds | Content | Art | `SIM_VERSION` |
|---|---|---|---|---|---|
| **1** | Stone, Bronze, Medieval | Momentum; Cover and the coverage rule; Hardened; Shatter; Shove; Aimed Shot (flag); Raider with Plunder; War Cry; Siege range (data); the formation pass with Shield Wall, Phalanx, Wedge and Pack (Firing Line and Square built and tested, switched on in drop 2); the Legion's Testudo and four-member squads (item 45) | The 60 cards of the three ages, the Legion, the War Hound's leap; the Mammoth, Hydra and Lindworm keep today's mechanics | W1 re-renders: `charge` (Tuskback, War Chariot), `shield_lock` (Hide Shield, Shield Bearer, Hoplite), `spear_set` (Spear Hunter, Phalangite), optional `aim` (Belly Bowman); W2 Medieval (rendering now): `pike_set`, `shield_lock` (Footman), `charge` (Destrier Knight), optional `aim` (Crossbowman); the Legion's model after W2 | 11.0.0 |
| **2** | Gunpowder, Industrial (and the showpieces of the drop-1 Legendaries) | Burn; Focus; Backstep; Tunnel; Overrun; Rampage; Spotting; Firing Line and Square switched on | The 40 cards of the two ages; the Mammoth's Overrun, the Hydra's Rampage, the Lindworm's Burn | W2 Gunpowder (rendering now): `kneel_fire`, `square`, `charge` (Cuirassier), optional `aim` (Wall Gunner), optional `hop_back` (Voltigeurs); the Dragoon's `wheel_back` is no longer needed; W3 Industrial: `charge` (Steam Golem), `kneel_fire` (Carbineer), `shield_lock` (Iron Mantlet), `burrow` and `surface` (Sapper); optional `stomp_walk` (Mammoth, W1 re-render) | 11.1.0 if no golden moves, else 12.0.0 (F3 policy) |
| **3** | Modern, Future, Cosmic | Fuse; Dive | The 60 cards of the three ages | W3 Modern: `charge` (Tankette), `shield_lock` (Sandbag Carrier), optional `aim` (Ghillie Sniper); W4: `charge` (Hover Tank), `shield_lock` (Barrier Trooper, Crystal Guard), `spear_set` (Graviton Halberdier), optional `hop_back` (Moonlings), optional `aim` (Particle Cannon) | the next minor or major by the same policy |

Until a drop ships, its new content rows carry release switches (the content keeps today's rows live; the tools switch the new ones on for the gates), as item 12 planned for its picks.

### 10.2 Sim kinds and their parameters (content data)

| Kind | Where | Parameters (starting values) | State (hashed) | Cost per tick |
|---|---|---|---|---|
| Momentum | `firstHitBonus` + `runUpLu` (120), `chargeSpeedBp` (5,000) | multBp 20,000; knockback 30-40 | `runUp` per unit | O(1) per unit |
| `cover` | AbilityDef | `behindLu` 60, `bp` 2,500, `stops` DmgType list | none | O(k) per straight-shot impact (k = cover troops of the side) |
| `hardened` | AbilityDef | `perHit` (whole HP at L1, level-scaled) | none | O(1) |
| `shatter` | AttackDef flag | | none | O(1) |
| `shove` | AttackDef | `every` 3, `knockback` 20-25 | hit counter per attack | O(1) |
| Aimed Shot | AttackDef `windupPct` 70 and view flag `aim` | | none | none |
| `raider` | AbilityDef | `plunderGold?` (3) | none | O(1) per blocker check |
| War Cry | `periodicShieldAura` + `statuses?` | `everyMs` 9,000-15,000, `radius` 180-200, `maxTargets` 8 | timer (exists) | O(n) on the firing tick |
| Siege range | data | range 560-600, `minRange` 150, `intervalMs` 5,000-6,000, `vsBaseDamage` a quarter, `coverPass` | none | none |
| Formations | `economy.formation.links` and `UnitDef.formation?` (tags: `cover`, `reach`, `shove`, `line`, `charger`, `beast`) | link 48 lu; Shield Wall 100 lu / 3,500 bp; Phalanx +2,500 bp; Wedge cleave 2 and +20 lu; Pack +1,500 bp speed and attack speed; Firing Line +2,000 bp damage and 2,000 bp kneel cover; Square Brace, ×1.5 against chargers and leapers, ×0.5 fire rate and speed, 160 lu trigger, 2 s hold | none (derived each tick) | O(n) per side |
| `testudo` | AbilityDef (item 45) | item 45 section 5.2 | the shell state | O(1) |
| `burn` | StatusKind | `magnitudeBp` 1,500 per second, 3,000 ms, heal ×0.5 | status (exists) | O(n) per pulse |
| `focus` | AttackDef | `stepBp` 3,000, `maxBp` 25,000, `resetMs` 2,000 | target id and stacks per attack | O(1) |
| `backstep` | AbilityDef | `triggerLu` 30, `hopLu` 60, `hopMs` 300, `cooldownMs` 5,000 | leap fields (exist) and a timer | O(1) plus one nearest-melee check |
| `tunnel` | AbilityDef | `digMs` 1,000, `surfaceMs` 1,500, `surfaceAtLu` 40 | `burrowed`, `surfaceTick` | O(1) |
| `overrun` | AbilityDef | `maxSize` medium, `trampleBp` 5,000, `everyMs` 2,000 | a short trampled list | O(k) per overrunner |
| `rampage` | AbilityDef | `perKillBp` 1,000, `maxKills` 2, `cleavePerKill` 1 | kill count | O(1) |
| Spotting | AttackDef `spotLu` (100) on Long range and siege range | | none | O(1) per candidate |
| `fuse` | AttackDef | `delayMs` 1,500, `nowBp` 3,000, `radius` 30 | a delayed impact (projectile) | O(1) |
| Dive | `bomber.dive` | `everyMs` 6,000, `telegraphMs` 1,000, `searchLu` 300, `radius` 60 | timer | O(n) on the dive tick |

All integer maths (milli-lu, centi-HP, ticks, bp), no RNG, every intermediate within ±2^31, the B3 pipeline order kept (formations and cover in step 6 beside the auras; Momentum in movement; Shove, Shatter, Focus, Burn and Fuse in steps 8-13; Tunnel and Overrun in movement and targeting).

### 10.3 Contract changes (WP0, one bump per drop)

- **Drop 1.** `AbilityDef` gains `cover`, `hardened`, `raider`, `testudo` (item 45); `firstHitBonus` gains `runUpLu?` and `chargeSpeedBp?`; `periodicShieldAura` gains `statuses?`. `AttackDef` gains `shove?`, `shatter?`, `aim?`, `coverPass?`. `UnitDef` gains `formation?` and the squad count widens to 2, 3 or 4. `EconomyRules.formation` gains `links`. `UnitState` gains `runUp` and the testudo state; `Observation.units[]` gains `charging?`, `formation?` and `testudo?`. `SimEvent` gains `charged`, `formed`, `unformed`, `glanced` (a stopped shot, for the effect), `raidPast` (the run-past cue) and `plundered`, plus item 45's events. No save change (the Legion is a card row; its album number and capsule odds come with its content).
- **Drop 2.** `StatusKind` gains `burn`; `AttackDef` gains `focus?` and `spotLu?`; `AbilityDef` gains `backstep`, `tunnel`, `overrun`, `rampage`; `UnitState` gains `burrowed`, `surfaceTick`, `kills`, the focus stacks; `Observation.units[]` gains `burrowed?`; `SimEvent` gains `burrowed`, `surfacing`, `surfaced`, `trampled`, `backstepped`.
- **Drop 3.** `AttackDef` gains `fuse?`; `bomber` gains `dive?`.
- The replay and save schema mirrors (`replaySchema.ts`, `save/schema.ts`) follow as for every bump.

### 10.4 `SIM_VERSION`, goldens and replays

- **Drop 1 is `SIM_VERSION` 11.0.0** (its own bump; items 12 and 42 keep theirs). Goldens 01-17 play the frozen fixture content, which has none of the new fields, so they keep their hashes and are re-recorded for the version string; a new golden (`18-signatures-1.json`, or the next free number) plays every drop-1 kind and every formation on a fixture copy of the drop-1 rows.
- Drops 2 and 3 each add a golden for their kinds; whether their bump is minor or major follows the F3 policy (major only if an existing golden's hash moves).
- `counters.json` is regenerated after each drop's content (its input hash includes `SIM_VERSION`).
- Replays recorded before a drop show their result card and the "Recorded on an older build" label (D8).

### 10.5 The AI (WP3)

- **Book** (`src/ai/book.ts`): flags per card for raider, cover, hardened, shatter, momentum, aimed, tunnel and formation tags; the counter matrix regenerated per drop.
- **Threats** (`estimate.ts`): raiders and burrowed tunnelers count as base threats; a charging troop's next hit counts double.
- **Building** (`brain.ts`): in a banked wave, train the Cover troop before the shooters and formation cards in pairs; hold to form up before a push (the push gate exists); release chargers from Hold when the lane ahead is clear; bring guns with cavalry (Gunpowder).
- **Answering**: counter scoring as today, plus ×1.25 for splash, arcs, Shatter, shoves and divers against an observed formation; one melee troop kept between the gate and the fight when enemy raiders are scouted; a defender sent to the gate when an enemy tunnel trail is seen; against Fusiliers, guns before cavalry.
- **Tiers**: 0-II never plan formations; III-IV train Cover before shooters; V+ build and break formations; VII+ time charges to the end of an enemy Square and pushes to their own War Cry.
- **Generals** (`personalities.ts`): Captain Kettle raids and charges; Mama Moss walls and shooters; Baroness Ledger Hardened heavies; Sgt. Boomsworth artillery and Spotting; Rook Shatter and braced answers to your scouted families; Madame Tempest War Cries and supports.
- **Honest**: same commands, same public observation; the persona and AI labels unchanged (A7.1).

### 10.6 Balance gates (WP12)

Measured with the existing tools (`npx tsx tools/sim-cli.ts balance | exploits | strength`), smoke size on every run and full size at each drop's release; the machine is shared with the art tracks, so runs go in short batches per age.

| Gate | Target |
|---|---|
| **G1 per-card rows** | Every card whose content changed: win-rate delta within ±3 (95% CI, 2,000 mirrored matches) at release, ±6 at smoke (400), in its one-age window, tier V Balanced, L7; two-age windows reported. Measured after the drop's last counter regeneration |
| **G2 named counter** | Each card's "Weak:" counter scores ≥ 60 against it in `counters.json`, or passes a scripted scenario where duels cannot show it (raider against a blocker, tunnel against gate defence, artillery against a leap, cover against arcs, the Square against a charge, Aimed Shot against a shove) |
| **G3 two answers** | Every card has at least two same-age answers scoring ≥ 55, at least one costing no more than it (turrets and powers through scenarios) |
| **G4 distinctness** | No pair of same-age fighting cards (supports, summoners and air excluded) with a duel-profile correlation ≥ 0.92 (46 pairs reach 0.95 today, supports included) |
| **G5 exploit proxies** against tier VII, Short and Standard (400 each; Full at release) | `raider_rush` ≤ 25%; `cover_ball` (Cover, mass shooters, Hold at the flag) ≤ 45% with a Bell share no more than the baseline +2; `formation_ball` (hold to form walls, phalanxes and lines, then Charge) ≤ 50%; `mono_momentum` ≤ 35%; `mono_hardened` ≤ 35%; `siege_turtle` (siege range, Cover, Hold) in the turtle band; drop 2: `tunnel_rush` ≤ 25% |
| **G6 formations** | Each formation adds +2 to +8 points to its cards (the per-card rows with the formation on and off, paired seeds); its named breaker cuts the formation's win share by at least 5 points in a scenario |
| **G7 unchanged rows** | Final Bell and medians (A18.12), first-mover 47-53%, spam and mono rows (A2.14), the Anti-heavy lane gate, research rows (A18.12), power rows (A2.9.12), turtle band |
| **G8 item 13** | Mono-Heavy against tier VII ≤ 35%; Heavy beats Infantry ≥ 65; the Heavy share of winning armies reported |
| **G9 performance** | Worst-case Full War bench within +15% (about 256 ms against 223 ms today; budget 850 ms); the 80-unit stress battle within +1 ms a frame (High), draw calls and particles within their caps |
| **G10 readability** | Playwright captures of every family's tell and every formation at 844 x 390 and 1280 x 720; the owner's video check after drop 1 |

### 10.7 UI (WP1 strings, WP5 HUD, WP9 screens, WP11 teaching)

- **Card text**: the one line in section 7 (`card.<id>.desc`), plus new keys `card.<id>.strong` and `card.<id>.weak` shown as "Strong:" and "Weak:" in the card detail and the Info preview, checked against `counters.json` by G2. The existing "Strong vs / Weak vs" chips from the matrix stay below them.
- **Keyword chip**: the family name and a small icon (one glyph per family, in the class-icon style; `kw.<family>.name|rule` in i18n), and a "Forms: Shield Wall" chip on cards that join a formation. Collection filter by keyword (A16.17's v1.1 glossary arrives with it).
- **Info preview (item 25)**: the showcase stages the signature: a run-up and a charge against a dummy; arrows glancing off a shield with a dummy behind it; small hits clinking off armour; a shield shattering; an aim line and the shot; a shove; a raider running past a shooter dummy; a War Cry ring over dummies; for formations, two of the card side by side locking into the pose. Reduce motion shows the pose and the chip only.
- **Teaching**: first-seen captions (A8 limits, one at a time, 5 s) for Momentum, Cover and the Shield Wall, Raider ("Raiders run past shooters. Block them with melee."), Aimed Shot and the Square; a War Path node per drop teaches one family ("Hold, then Charge" with Momentum on Stone L2, where Hold is already taught).
- **HUD**: no new control (A16.1). Tray cards keep their size; the lane shows the tells.
- Every screen change reviewed with Playwright at 844 x 390 and 1280 x 720.

### 10.8 Effects and sounds through the ArtProvider (WP4, WP6)

New recipes in `src/visuals/effects/recipes.ts` (ids through the manifest): `fx.momentum_trail`, `fx.charge_hit`, `fx.cover_glance`, `fx.cover_arc`, `fx.hardened_clink`, `fx.shatter`, `fx.aim_line` (drawn by the view), `fx.shove_dust`, `fx.war_cry_ring` (shield, speed, damage), `fx.raider_trail`, `fx.plunder_coins`, `fx.formation_band` and the formation glyphs; drop 2: `fx.burn`, `fx.focus_heat`, `fx.backstep_dust`, `fx.trample`, `fx.tunnel_mound`, `fx.tunnel_trail`, `fx.surface_crack`, `fx.rampage_glow`, `fx.spot_flare`; drop 3: `fx.fuse_charge`, `fx.dive_shadow`. Most reuse existing parts (rings, dust, sparks, flashes). Sounds: a charge gallop or engine rise, a shield glance, a clink, a shatter, an aim tone, three war-cry stingers (horn, tune, fanfare), `raid_dash`, coins, a shield-lock clack, a pike thud, a musket-level rattle; drop 2: a burn crackle, a drill whine that rises, a hop, a tunnel rumble and a surfacing crack. All within the particle caps, with Lite and Reduce motion versions. The sim owns every timing; art never changes a number.

### 10.9 Clips per age, with the art round (`item47-art-audit.md` section 7)

| Wave | Clip names (exact) | Units | Status |
|---|---|---|---|
| W1 re-render (Stone, Bronze; after the owner approves) | `charge` | Tuskback, War Chariot | drop 1 |
| | `shield_lock` | Hide Shield, Shield Bearer, Hoplite | drop 1 |
| | `spear_set` | Spear Hunter, Phalangite | drop 1 |
| | `aim` (optional) | Belly Bowman | drop 1 |
| | `stomp_walk` (optional) | Mammoth Matriarch | drop 2 |
| W2 Medieval (rendering now) | `pike_set` | Pikeman | drop 1 |
| | `shield_lock` | Footman | drop 1 |
| | `charge` | Destrier Knight | drop 1 |
| | `aim` (if cheap) | Crossbowman | drop 1 |
| W2 Gunpowder (rendering now) | `kneel_fire` | Fusilier | drop 2 |
| | `square` (if cheap) | Fusilier | drop 2 |
| | `charge` | Cuirassier | drop 2 |
| | `aim` (if cheap) | Wall Gunner | drop 2 |
| | `hop_back` (optional) | Voltigeurs | drop 2 |
| | `wheel_back` | Dragoon | **no longer needed** (the Dragoon became Hardened) |
| W3 Industrial | `charge` | Steam Golem | drop 2 |
| | `kneel_fire` | Carbineer | drop 2 |
| | `shield_lock` | Iron Mantlet | drop 2 |
| | `burrow`, `surface` | Sapper | drop 2 |
| W3 Modern | `charge` | Tankette | drop 3 |
| | `shield_lock` | Sandbag Carrier | drop 3 |
| | `aim` (optional) | Ghillie Sniper | drop 3 |
| W4 Future and Cosmic | `charge` | Hover Tank | drop 3 |
| | `shield_lock` | Barrier Trooper, Crystal Guard | drop 3 |
| | `spear_set` | Graviton Halberdier | drop 3 |
| | `hop_back` (optional) | Moonlings | drop 3 |
| | `aim` (optional) | Particle Cannon | drop 3 |
| After W2 (art tracks) | the full set | the Legion (new model, item 45) | drop 1 |

Every new clip is a pose on the existing rig with no new parts, so it fits the one-ticket-per-model sitting; the per-ticket estimates of `item47-art-audit.md` (about 20 minutes per aim clip, about 30-40 minutes per charge or pose) put the 32 clips (23 required, 9 optional or "if cheap") at about 2-2.5 agent-days across the waves. Optional clips have code fallbacks (the attack clip held for an aim, the leap hop for `hop_back`, the walk with a lean for `charge`).

### 10.10 Raider safeguards

- **Tells** (the orchestrator's condition): the run-past duck-and-weave and speed trail, the `raid_dash` cue once per pass, the raid glyph on the HP pip, the off-screen badge at the base, coins for Plunder, and a first-seen caption.
- **Gate**: `raider_rush` ≤ 25% against tier VII, the existing `runner_reach` row, and a new-player report: in War Path Stone and Bronze levels and Short Wars against tiers II-IV, the share of matches where raids dealt more than 30% of the loser's base damage.
- **Hold-back order**: all eight raiders are Commons, so there is no higher rarity to keep the raid on. If raids make early games swingy for new players, the raid comes off the early ages' raiders first, where new players play: **1. Torch Runner** (Stone: every new player's first age and the tutorial's), **2. Thracian Raider** (Bronze, the same opening window), **3. Brigand** (Medieval; his Plunder also costs the defender gold). A held-back raider keeps today's behaviour (fast, double damage to bases, fights what it meets).

### 10.11 Effort (agent-days)

| Work | Drop 1 | Drop 2 | Drop 3 |
|---|---|---|---|
| Contracts (WP0) | 1.5 | 0.5 | 0.5 |
| Sim kinds, formations, Testudo, goldens (WP2) | 14-16 | 10-11 | 2-2.5 |
| Content and strings (WP1) | 2 | 1.5 | 2 |
| AI (WP3) | 3 | 2.5 | 2 |
| Tools and gates (WP12) | 3 | 1 | 1 |
| Tuning to G1-G8 (tuning agent and lead) | 5-7 | 4-5 | 5-6 |
| Effects (WP4) and view hooks (WP5) | 6-7 | 5-6 | 3-4 |
| Audio (WP6) | 1.5 | 1 | 1 |
| UI and teaching (WP9, WP11) | 3 | 2 | 1.5 |
| Clips inside the art waves | 1 | 0.5-1 | 0.5 |
| The Legion's model (art tracks) | 3-4 | | |
| **Total** | **about 38-46** | **about 26-32** | **about 18-24** |

In all about 82-102 agent-days, about 5-6 weeks of wall-clock time with 3-4 agents in parallel; the per-card tuning on a machine shared with Blender is the long pole, so each drop's tuning runs in short batches per age while the art waves render.

### 10.12 Risks and the cut list

| Risk | Mitigation |
|---|---|
| Tuning drags: every counter regeneration moves single cards by several points | Tune per drop after the last regeneration; release switches keep live content stable meanwhile |
| Tells clutter a phone screen with 80 units | Event tells, one state icon per unit, glyphs per formation (not per troop), Lite versions, G10 |
| Raiders make early games swingy | The tells, the gate and the hold-back order (10.10) |
| Formations and Cover make held balls stronger | `cover_ball`, `formation_ball`, `flag_ball`, the Bell rows; levers: Cover 25 → 20%, link 48 → 40 lu, Shield Wall 35 → 30% |
| Momentum strengthens "Hold, then Charge" | `mono_momentum` and `flag_ball`; lever: run-up 120 → 160 lu |
| Tunnel and Overrun bend the 1D rules (overlap, blocking) | Tests per rule, view offsets for clarity, both in drop 2 after drop 1's lessons |
| The AI misuses new mechanics | `strength` gates unchanged; tier-scaled use |
| Players must learn many families | Families repeat across ages; Commons have one; the Info preview shows each; captions for the six most common |
| Art scope | Optional clips have code fallbacks; the Legion's model is the only new model |
| The W1 re-renders wait for the owner's approval | They are poses on existing rigs (about half a day for the seven) |

**Cut list (cut from the top):** Dive (the Dive Bomber keeps its bombs); Fuse (the Sticky Bomber keeps a plain ×3 hit); Spotting; Rampage (the Hydra keeps cleave 3 and its slow); Backstep (Voltigeurs and Moonlings stay plain squads); the optional clips. Never cut: the core families, the counter web of each shipped age, the tells, the gates.

---

## 11. Questions for the owner

1. **The direction.** One clear ability per troop, counters you can see, and formations that form by themselves when troops stand close (no commands)? Recommended: yes.
2. **Raiders.** They run past shooters for the base and only melee stops them. If that makes the first matches too swingy for new players, the raid is held back on the Stone and Bronze raiders first. Recommended: yes, with that safeguard.
3. **Drop 1.** Stone, Bronze and Medieval with the Legion, about 38-46 agent-days, then the other drops. Start drop 1 once you have seen the plan? Recommended: yes.

---

## Appendix: method notes

- **Counter twins** (2.2): for each age, each card's profile is its row (its score against every other same-age card) and its column (their scores against it), the pair itself excluded; Pearson correlation between two cards' profiles; threshold 0.95. Input: `src/content/generated/counters.json` on this tree (engine 102, the sim's duel harness).
- **Answers** (6.2): taken from the measured matrix where it shows them (for example "the measured best answer today"), and from the designed mechanics where the matrix cannot yet show them; gates G2 and G3 verify both after each drop.
- **Sources** for the research are in `docs/research/unit-abilities.md` and `docs/research/unit-synergies.md`.
