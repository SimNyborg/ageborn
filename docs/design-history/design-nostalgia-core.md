# Ageborn: v1 design proposal ("Faithful soul, modern body")

This proposal starts from one rule. Within ten seconds of play the battle must feel like the Flash original: one lane, two bases, warriors who walk and fight on their own, turrets on the base, XP that pushes you into the next age, and one big special per age. Underneath that, the numbers, bots and pacing are rebuilt so the known exploits and stalemates can't happen. The meta systems (collection, capsules, upgrades, trophies) exist to give the battle variety and a reason to come back. They never gate the fun part.

All numbers are starting values. They live in data files, and the headless bot-vs-bot runs described in 9.7 tune them before anyone judges them by feel.

---

## 0. Pillars and the keep/fix list

Pillars:
1. Familiar in 10 seconds. You tap a card, a warrior walks out and fights. Match one asks for nothing new.
2. Each evolution is the best moment of the match. It brings a big visual transformation, a clear power spike and a music change.
3. The player faces a decision every 5-10 seconds: which unit, save or spend, turret or army, evolve now or fire the power first.
4. Honesty. Bots follow the player's rules and are labeled as AI. Capsule odds and pity counters are visible. Nothing is for sale.
5. Readable chaos. Juice scales with how much an event matters, and it never hides the state of the lane.

| Classic element | v1 decision |
|---|---|
| One lane, two bases, mouse/tap only | Keep |
| Units walk and fight automatically | Keep, and add a two-state stance (Charge / Hold) |
| 5 ages, XP to evolve | Keep 5 ages: Stone, Medieval, Gunpowder, Modern, Future |
| Training queue of 5 | Keep |
| Turrets on the base, 4 slots, 50% sell refund | Keep. Range capped at 40% of the lane, and turrets cannot hit bases |
| Kill bounty | Keep at 60% of the victim's cost (AoW1 paid 130%) |
| XP when your own unit dies | Keep at 40% (AoW1: 65%) |
| Free special on a cooldown | Keep as a charge meter. It never costs XP (AoW2's mistake) |
| Unit prices inflating from 15 to 150,000 across ages | Replace with flat prices by role. Power comes from age and card level |
| AI with free gold and timer-based evolution | Replace with bots on the same economy and command API |
| Turtling and AFK farming | Countered by the bounty cut, match phases and XP from base damage |
| 40-minute stalemates | Hard cap at 10:00, with escalation at 6:00 and 8:00 |
| Units queued behind the front stand idle | Melee engages two-wide, and Reach units hit from the second rank |
| Slow walking | Crossing takes about 17 s (AoW1: about 23 s). 2x/3x speed in Skirmish |
| No pause, mute or save | Pause, 3 volume sliders, autosave and an export code |
| Flashing evolve reminder | Steady glow only |
| Army of Ages wiping your units on evolve | Units and turrets survive evolving |

---

## 1. Working title

Working title: **Ageborn**. It is short and ownable, and it says "ages" without borrowing from Age of War. Quick web, Steam and Google Play checks came back clear.

Alternatives, which passed the same quick checks:
- Mammoths to Mechs. It describes the whole arc and doubles as a clip hook, but it is descriptive and so weaker as a trademark.
- Aeonfront
- Spears to Starships

Before we commit, we still need a TMview search (EUIPO/USPTO), a domain check and a DK/EU store search. "Age of War" never appears in the title, tags or store keywords.

---

## 2. Core battle design

### 2.1 Lane and camera
- The lane is 1,200 lane units (lu) long, from your gate (x = 0) to the enemy gate (x = 1,200). Each base sits 140 lu behind its gate, outside the fighting area.
- Units spawn at x = 20 on their own side.
- Key positions: the hold line is at 420 lu, the turret range cap is 480 lu (40% of the lane), and mid-lane is 600.
- Unit speeds run from 35 to 100 lu/s. Standard infantry (70 lu/s) crosses the lane in about 17 s.
- Camera: the whole lane fits on screen by default, so there is no scrolling (a known mobile complaint). On phones, a pinch zooms to 1.6x with a camera that follows the front, and a double tap resets it.
- Each unit gets a random sub-lane y offset of ±6 lu, and units are depth-sorted by y so stacks stay readable.

### 2.2 Bases and age power scale
Base max HP grows with the owner's age. On evolving, the base keeps its current HP percentage and heals 5% of the new maximum.

| Age | Power scale P | Base HP |
|---|---|---|
| 1 Stone | 1.00 | 1,500 |
| 2 Medieval | 1.35 | 2,025 |
| 3 Gunpowder | 1.82 | 2,730 |
| 4 Modern | 2.46 | 3,690 |
| 5 Future | 3.32 | 4,980 |

P multiplies the HP and damage of every unit, turret and power in that age. At a ×1.35 step, an age-N unit beats its age N-1 counterpart one-on-one with about half its HP left, and a same-gold army is roughly 1.8x stronger. That is a real edge. Turrets and the defender's short walk can hold it off for 20-40 s while the trailing player catches up. Because base HP scales with P as well, time-to-kill in a same-age fight is identical in every age, so pacing stays consistent.

Bases do not attack, except for Last Stand (2.11).

### 2.3 Gold (in battle)

| Rule | Value |
|---|---|
| Starting gold | 175 |
| Passive income | 6 gold/s |
| Tribute upgrade | 3 levels, each +2 gold/s. Costs 150 / 250 / 400 (payback 75 / 125 / 200 s) |
| Kill bounty | 60% of the victim's cost |
| Underdog bounty | +50% gold and XP when the victim is from a higher age than yours |
| Unit prices | Flat across ages, set by role (4.1) |
| Turret sell refund | 50% |

Tribute is the in-battle greed-or-safety decision. Its art changes with the age (gatherers, farms, trade cart, factory, fusion core), but its numbers do not.

### 2.4 XP and evolving

| XP source | Value |
|---|---|
| Passive trickle | 4 XP/s |
| Killing an enemy unit | 100% of its cost |
| Losing your own unit | 40% of its cost |
| Damaging the enemy base | 12 XP per 1% of its max HP |

Evolve thresholds are 900 to Medieval, 1,100 to Gunpowder, 1,350 to Modern and 1,650 to Future, for 5,000 in total. In active play each side earns about 16 XP/s, so evolutions land near 0:55, 2:05, 3:30 and 5:10. A player who does nothing still evolves (the trickle alone reaches Medieval at 3:45), so neither side can be frozen in an age.

How evolving works:
- The player presses Evolve once the bar is full. The button glows steadily and never flashes.
- A 2.5 s Ascension follows. Your training queue pauses while your turrets keep firing. The base morphs, your half of the backdrop wipes to the new age, and the music modulates up.
- Excess XP carries over. Your Age Power meter resets to 0%, which teaches the habit of firing the power before you ascend.
- Units and turrets already on the field stay as they are. The card tray swaps to the next age's loadout.
- In the Future Age, XP keeps flowing as Overcharge. Every 400 XP adds 25% to the Age Power meter.

Both players' XP bars are always visible, so the race to evolve is part of the show.

### 2.5 Ages in v1
Each age adds one mechanic, so tactics change as well as numbers.

| Age | New mechanic |
|---|---|
| Stone | Basics: melee, ranged, heavy, knockback |
| Medieval | Reach (second-rank attacks), shields, siege damage to bases |
| Gunpowder | Splash artillery, the Mech tag, the first Air unit (a Legendary) |
| Modern | Air as a regular option, target marking, call-in strikes |
| Future | Energy shields, EMP stuns, time control |

Ages are data. A sixth age (Bronze/Antiquity, between Stone and Medieval) is planned for v1.x and should need only content files.

### 2.6 Roles, tags and counters
Roles are Infantry (light melee), Ranged, Heavy, Anti-armor and Support, plus specialist Epics and Legendaries. Tags are Light/Heavy, Melee/Ranged, Bio/Mech, Ground/Air and Armored.

| Attacker | Target | Effect |
|---|---|---|
| Anti-armor | Heavy or Mech | ×2.0 (Grenadier ×1.5, with splash) |
| Anti-armor | Light | ×0.75 |
| Light melee | Armored | ×0.70 |
| Melee | Air | Cannot hit |
| Flak Gun / Congreve Rack | Air | ×2.0 / ×1.5 |
| EMP | Mech | 1.5 s stun, energy shields stripped |
| Angry Beehive | Armored | Ignores the ×0.70 armor |

The counter triangle:
- Heavy beats Infantry through armor.
- Anti-armor beats Heavy.
- Infantry beats Anti-armor, because it is cheap and takes only ×0.75 from Anti-armor.
- Ranged supports all of them but dies fast once reached.
- Splash punishes clumps, and Air punishes armies with only melee.

Every card detail screen shows "Strong vs" and "Weak vs".

### 2.7 Combat rules
- **Two-wide melee.** The two frontmost melee units on a side can both hit the enemy's front unit; the second one uses the other sub-lane. Players get the clumping they liked in We Are Warriors without a meat wall.
- **Reach.** A unit with range 60 or more can hit from the second rank.
- **Ranged.** Ranged units fire over allies at the frontmost enemy in range. All ranged units and all turrets can hit Air.
- **Cleave** also hits the next enemy within 40 lu behind the target.
- **Knockback** pushes a unit back along the lane but never past its own gate. Heavy and Legendary units take half knockback.
- **Air units:**
  - They ignore ground blocking.
  - They stop at the first enemy ground unit in range. Bombers float over it instead.
  - They attack the base when they reach it.
  - Only ranged units, turrets, powers and Last Stand can hit them.
- **Training.** One shared queue of 5, trained one unit at a time. Train times: Infantry 1.5 s, Ranged 2.0 s, Anti-armor 2.5 s, Support 3.0 s, Heavy and Epic 4.0 s, Legendary 7.0 s.
- **Population cap: 20 per side.**
  - Pop cost: Infantry, Ranged, Anti-armor and Support 1; Heavy and Epic 2; Legendary 3.
  - The HUD shows "Army 14/20". At the cap the next queued unit waits and its card reads "ARMY FULL".
  - The cap is generous on purpose. It binds only when your army isn't dying, which means you are pushing.
- **Legendary limit.** One Legendary alive per player.
- **Targeting.** Melee hits the frontmost enemy in reach. Turrets hit the frontmost enemy in range unless their card says otherwise.

### 2.8 Turrets and slots
- You start with one free slot. Slots 2, 3 and 4 cost 150, 350 and 700 gold.
- To build, tap an empty slot and pick one of your two turret cards for the current age. Building takes 1 s (a drop-in animation). Selling takes 1 s and refunds 50%.
- Turrets from older ages keep firing at their original stats. After evolving, rebuilding them is a gold decision: sell for 50% and buy new.
- Limits:
  - range 480 lu at most
  - never targets bases
  - invulnerable
  - 50% less damage during Siege (8:00)
- Turret costs are flat across ages: Commons 150 and 175, Rare 250, Epic 300. v1 has no Legendary turrets, because turret dominance was the classic game's worst balance problem.

### 2.9 Age Powers (specials)
- One power is equipped per age: the default or the alternate (see section 4).
- The meter fills from 0 to 100% in 50 s, 1.5x faster during Overdrive, and resets to 0% when you evolve.
- Tap to auto-aim at the densest enemy group, or drag to place the zone yourself.
- A 1.0 s telegraph (a ground marker plus a sound) plays before the effect lands, readable by both sides.
- Powers hit units only. The zone centre is clamped to 1,050 lu from your gate, so it never reaches the enemy base.
- Tuning target: an average cast removes 60-100% of a same-age Light unit's HP and 15-35% of a Heavy's.

### 2.10 Match clock, win conditions, anti-stalemate

| Time | Phase | Effect |
|---|---|---|
| 0:00 | Regulation | Normal rules |
| 6:00 | Overdrive | Passive gold and passive XP ×2, Age Power charge ×1.5, faster music layer |
| 8:00 | Siege | Turret damage -50%, all damage to bases ×2, each base loses 0.5% of max HP per second |
| 10:00 | Final Bell | Higher base HP % wins; a gap of 0.5% or less is a draw |

You win by destroying the enemy base. Retreat (surrender) unlocks at 2:00 and counts as a loss.

Targets, checked in the balance sim:
- median match length of 7:00
- 80% of matches between 5:00 and 9:00
- fewer than 3% of matches reaching Final Bell

| Classic exploit or stall | Countermeasure |
|---|---|
| Turtling behind 4 turrets and farming | Turret range cap; turrets can't hit bases; Siege halves turret damage; bounty only 60% |
| Staying in the Stone Age to farm expensive units | Flat prices: an old-age unit costs the same and is weaker, and bounty follows cost, not age |
| Going AFK for an hour | Bots stop feeding a losing push; Final Bell at 10:00 |
| Getting stuck in an age | Passive XP and XP from base damage |
| Endless fighting at the enemy gate | Siege base decay and ×2 base damage |
| Firing the special on every cooldown for free gold | Lower bounty, telegraph, meter reset on evolve |

### 2.11 Comeback tools (limited, visible, counterable)
- XP from your own losses (40% of cost).
- The underdog bounty (+50% for killing a higher-age unit).
- The defender's advantage. Your new units start right at your gate, and your turrets cover the area in front of it.
- The Age Power reset on evolve, which stops the leader from chaining two specials across an evolution.
- **Last Stand**, once per match:
  - It unlocks when your base is at 25% HP or below.
  - After a 1.0 s charge, the base fires a volley that deals 200 × P damage to every enemy within 450 lu of your gate and knocks them back 80 lu.
  - If you never fire it, it fires automatically at 10%.
- No hidden rubber-banding of any kind.

### 2.12 Player controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Train unit (4 cards) | Tap card | 1-4 |
| Build turret | Tap slot, then card | Q / W (next free slot) |
| Sell turret | Long-press slot | Shift+click |
| Buy turret slot | Tap the "+" slot | B |
| Tribute | Tap coin button | T |
| Evolve | Tap Evolve | E |
| Age Power | Tap to auto-aim, drag to place | Space (auto-aim) |
| Stance Charge/Hold | Toggle | S |
| Last Stand | Tap when unlocked | L |
| Pause | Top-right button | P (no Esc binding, per CrazyGames rules) |
| Speed 1x/2x/3x | Skirmish, Daily Challenge, later Campaign | F |

Stances:
- **Hold.** Your ground units stop at the hold line (420 lu) and fight whatever comes into range.
- **Charge.** Your units march to the enemy base.
- The toggle has a 2 s cooldown.

Ladder matches run at 1x only so they stay close to future PvP. Pause works in every mode while the game is offline.

### 2.13 Expected match flow (two mid-tier players)

| Time | What typically happens |
|---|---|
| 0:00-0:10 | Both sides open with 2-3 units; first clash near mid-lane around 0:09 |
| 0:30 | First turret; greedy players buy Tribute |
| 0:50 | Stone power ready, fired just before evolving |
| ~0:55 | Evolve to Medieval |
| ~2:05 | Gunpowder; first Epics |
| ~3:30 | Modern; turret rebuilds; first Legendary pushes |
| ~5:10 | Future |
| 6:00 | Overdrive; big pushes |
| 6:30-8:30 | Most matches end |
| 8:00-10:00 | Siege; Final Bell only rarely |

---

## 3. Deck system: the War Plan

- A War Plan is five Age Loadouts, one per age.
- **Loadout contents.** Each loadout has 4 unit slots, 2 turret slots and 1 Age Power. Every card must come from that age, and a loadout can't hold duplicates. The minimum to play is 3 units and 1 turret per age, and the starter kit always meets it.
- **The tray.** In battle, all 4 units of the current age sit in the tray at once. There is no hand cycling: the classic tray is part of the feel, and the decisions come from choosing the loadout and timing. A Clash-style cycling mode can be tested later as a separate mode.
- **Evolving.** When you evolve, the tray swaps to the next loadout. Your old units and turrets stay on the field, but you can no longer train older cards.
- **Starter kit per age:**
  - 3 Common units (Infantry, Ranged, Heavy)
  - 2 Common turrets
  - the default Age Power

  The fourth unit slot fills with the first Rare, Epic or Legendary you own from that age.
- **Presets and helpers.**
  - You can save 3 War Plan presets.
  - Auto-fill picks the highest-level card for each slot and keeps one card of each role.
  - The builder shows each loadout's average level and the War Plan's average level. Bots are matched to that average.
- **Costs and rarity.** Each card has a fixed cost; there is no deck budget. The balance rule: at equal level, rarity is a sidegrade. Rare, Epic and Legendary cards are more specialised or more complex, not more efficient. In the balance sim, every card stays within ±3 win-rate points of its archetype baseline when swapped into a reference loadout.
- **Unlock order.**
  - Match 1 uses 2 Stone units.
  - Match 2 adds turrets and more ages.
  - From match 3 on, full 5-age War Plans are used, and the War Plan screen opens after that match.
  - Alternate Age Powers come from Trophy Road arenas 2-6.

---

## 4. v1 content

### 4.1 Conventions and archetype baselines
Actual stats = baseline × P(age) × (1 + 0.05 × (level - 1)). Cards start at level 1 (Common), 2 (Rare), 4 (Epic) or 6 (Legendary), and the maximum is level 10. Speed, range and attack interval never change with level. The age tables below list stats at level 1 with P already applied.

| Archetype | Cost | HP | Damage / interval | DPS | Range | Speed | Pop | Bounty gold / XP |
|---|---|---|---|---|---|---|---|---|
| Infantry | 50 | 160 | 20 / 1.0 s | 20 | 30 | 70 | 1 | 30 / 50 |
| Ranged | 75 | 95 | 18 / 1.4 s | 12.9 | 200 | 65 | 1 | 45 / 75 |
| Heavy | 150 | 560 | 42 / 1.5 s | 28 | 35 | 55 | 2 | 90 / 150 |
| Anti-armor | 100 | 200 | 26 / 1.2 s | 21.7 | 60 | 70 | 1 | 60 / 100 |
| Support | 110 | 130 | Heal 30 HP/s or an aura | - | 150 | 65 | 1 | 66 / 110 |
| Epic | 200 | Varies | Varies | - | - | - | 2 | 120 / 200 |
| Legendary | 350 | About 3x Heavy | About 1.5-2x Heavy DPS plus a unique trait | - | - | - | 3 | 210 / 350 |

"Bounty gold / XP" is what the killer earns. The owner also earns 40% of the unit's cost as XP when it dies.

The collection pool is 35 units and 20 turrets, 55 cards in all (25 Common, 15 Rare, 10 Epic, 5 Legendary). There are also 10 Age Powers, earned on the Trophy Road rather than from capsules.

### 4.2 Stone Age (P 1.00)

| Unit | Rarity | Role | Cost | HP | Damage / interval | Range | Speed | Pop | Bounty g / XP | Traits and ability |
|---|---|---|---|---|---|---|---|---|---|---|
| Bonker | C | Infantry | 50 | 160 | 20 / 1.0 s | 30 | 70 | 1 | 30 / 50 | Baseline |
| Pebbler | C | Ranged | 75 | 95 | 18 / 1.4 s | 200 | 65 | 1 | 45 / 75 | Fires over allies |
| Tuskback | C | Heavy | 150 | 560 | 42 / 1.5 s | 35 | 55 | 2 | 90 / 150 | Armored. Gore: first hit of each fight ×2 and 30 lu knockback |
| Spear Hunter | R | Anti-armor | 100 | 200 | 26 / 1.2 s | 60 | 70 | 1 | 60 / 100 | Reach. ×2 vs Heavy, ×0.75 vs Light |
| Drum Shaman | R | Support | 110 | 130 | 8 / 1.2 s | 150 | 65 | 1 | 66 / 110 | Aura: allies within 160 lu get +20% attack speed (does not stack) |
| Sabertooth | E | Skirmisher | 200 | 380 | 34 / 0.8 s | 30 | 100 | 2 | 120 / 200 | Pounce: on contact, leaps over one enemy to hit the rearmost enemy Ranged or Support within 150 lu. 10 s cooldown |
| Mammoth Matriarch | L | Siege heavy | 350 | 1,700 | Stomp 60, AoE radius 60 / 2.0 s | 40 | 40 | 3 | 210 / 350 | Armored. Two riders shoot 12 / 1.4 s at range 200 and jump off as Pebblers when she falls |

| Turret | Rarity | Cost | Damage / interval | Range | Notes |
|---|---|---|---|---|---|
| Rock Tosser | C | 150 | 30 / 1.5 s | 360 | Single target |
| Angry Beehive | C | 175 | 5 / 0.2 s | 220 | Bees ignore armor. Our own comic turret |
| Log Roller | R | 250 | 45 to every ground enemy in the first 300 lu / 4.0 s | 300 | Line splash |
| Grumpy Toad | E | 300 | 40 / 6.0 s | 420 | Tongue grabs the nearest enemy Ranged or Support unit and drags it 120 lu toward your gate |

### 4.3 Medieval Age (P 1.35)

| Unit | Rarity | Role | Cost | HP | Damage / interval | Range | Speed | Pop | Bounty g / XP | Traits and ability |
|---|---|---|---|---|---|---|---|---|---|---|
| Footman | C | Infantry | 50 | 215 | 27 / 1.0 s | 30 | 70 | 1 | 30 / 50 | - |
| Longbowman | C | Ranged | 75 | 130 | 24 / 1.4 s | 230 | 65 | 1 | 45 / 75 | Longbow: +30 range |
| Destrier Knight | C | Heavy | 150 | 755 | 57 / 1.5 s | 35 | 60 | 2 | 90 / 150 | Armored. Lance charge: first hit ×2 and 30 lu knockback |
| Pikeman | R | Anti-armor | 100 | 270 | 35 / 1.2 s | 70 | 70 | 1 | 60 / 100 | Reach. ×2 vs Heavy, ×0.75 vs Light. Brace: immune to charge bonuses and knockback |
| Friar | R | Support | 110 | 175 | 11 / 1.2 s | 150 | 65 | 1 | 66 / 110 | Heals 40 HP/s, split between the 2 most damaged allies within 160 lu |
| Battering Ram | E | Siege | 200 | 1,000 | 10 to units, 160 to bases / 2.0 s | 30 | 45 | 2 | 120 / 200 | Armored, Mech. The age's win-condition card |
| Ursa Paladin | L | Siege heavy | 350 | 2,300 | 70 cleave / 1.4 s | 40 | 55 | 3 | 210 / 350 | Armored. Roar every 12 s: allies within 200 lu get an 80 HP shield for 6 s |

| Turret | Rarity | Cost | Damage / interval | Range | Notes |
|---|---|---|---|---|---|
| Crossbow Nest | C | 150 | 40 / 1.5 s | 380 | Single target |
| Pitch Cauldron | C | 175 | 20 every 0.5 s to all enemies in range | 130 | Area damage at the gate |
| Trebuchet | R | 250 | 110, AoE radius 50 / 4.5 s | 480 (min 150) | Artillery |
| Honk Ballista | E | 300 | 45 goose bouncing to 3 targets / 3.5 s | 400 | Slows 30% for 2 s |

### 4.4 Gunpowder Age (P 1.82)

| Unit | Rarity | Role | Cost | HP | Damage / interval | Range | Speed | Pop | Bounty g / XP | Traits and ability |
|---|---|---|---|---|---|---|---|---|---|---|
| Corsair | C | Infantry | 50 | 290 | 36 / 1.0 s | 30 | 72 | 1 | 30 / 50 | - |
| Fusilier | C | Ranged | 75 | 175 | 47 / 2.0 s | 240 | 65 | 1 | 45 / 75 | Slow, heavy shots |
| Cuirassier | C | Heavy | 150 | 1,020 | 76 / 1.5 s | 35 | 60 | 2 | 90 / 150 | Armored. Charge: first hit ×2 |
| Grenadier | R | Anti-armor | 100 | 365 | 70, AoE radius 35 / 1.8 s | 150 | 68 | 1 | 60 / 100 | Lobbed over allies. ×1.5 vs Heavy/Mech, ×0.75 vs Light |
| Field Surgeon | R | Support | 110 | 235 | 15 / 1.2 s | 150 | 65 | 1 | 66 / 110 | Heals 55 HP/s, split between the 2 most damaged allies within 160 lu |
| Bronze Cannon | E | Artillery | 200 | 500 | 130, AoE radius 60 / 3.5 s | 320 | 45 | 2 | 120 / 200 | Mech. Stops at maximum range |
| Balloon Admiral | L | Air bomber | 350 | 1,500 | 110, AoE radius 50 / 1.6 s (straight down) | 0 | 45 | 3 | 210 / 350 | Air. When shot down, crashes for 250 damage, AoE radius 70 |

| Turret | Rarity | Cost | Damage / interval | Range | Notes |
|---|---|---|---|---|---|
| Swivel Gun | C | 150 | 22 / 0.6 s | 340 | Single target |
| Grapeshot Gun | C | 175 | 50 to every enemy in a 90 lu cone / 2.0 s | 220 | Anti-swarm |
| Congreve Rack | R | 250 | 4 rockets × 55, AoE radius 30 / 5.0 s | 460 | Seeded scatter ±40 lu. ×1.5 vs Air |
| Chainshot Cannon | E | 300 | 75, piercing up to 4 in a line / 4.0 s | 400 | - |

### 4.5 Modern Age (P 2.46)

| Unit | Rarity | Role | Cost | HP | Damage / interval | Range | Speed | Pop | Bounty g / XP | Traits and ability |
|---|---|---|---|---|---|---|---|---|---|---|
| Trench Raider | C | Infantry | 50 | 395 | 49 / 1.0 s | 30 | 75 | 1 | 30 / 50 | - |
| Rifleman | C | Ranged | 75 | 235 | 32 / 1.0 s | 260 | 65 | 1 | 45 / 75 | - |
| Tankette | C | Heavy | 150 | 1,380 | 104 / 1.5 s | 90 | 50 | 2 | 90 / 150 | Armored, Mech |
| Bazooka Trooper | R | Anti-armor | 100 | 490 | 64 / 1.2 s | 200 | 65 | 1 | 60 / 100 | ×2 vs Heavy/Mech, ×0.75 vs Light |
| Radio Operator | R | Support | 110 | 320 | 20 / 1.2 s | 200 | 65 | 1 | 66 / 110 | Every 6 s, calls a shell onto the enemy's front unit: 150 damage, AoE radius 50 |
| Gyrocopter | E | Air gunship | 200 | 740 | 20 / 0.3 s | 150 | 80 | 2 | 120 / 200 | Air, Mech |
| Behemoth Tank | L | Siege heavy | 350 | 4,100 | Main gun 200, AoE radius 50 / 2.5 s, plus a machine gun 20 / 0.4 s at range 150 | 300 | 35 | 3 | 210 / 350 | Armored, Mech |

| Turret | Rarity | Cost | Damage / interval | Range | Notes |
|---|---|---|---|---|---|
| MG Nest | C | 150 | 15 / 0.3 s | 340 | Single target |
| Flak Gun | C | 175 | 60, AoE radius 40 / 1.5 s | 420 | ×2 vs Air; targets Air first |
| Howitzer | R | 250 | 270, AoE radius 60 / 5.0 s | 480 (min 180) | Artillery |
| Searchlight Sniper | E | 300 | 280 / 4.0 s | 480 | Mark: the target takes +20% damage from all sources for 4 s |

### 4.6 Future Age (P 3.32)

| Unit | Rarity | Role | Cost | HP | Damage / interval | Range | Speed | Pop | Bounty g / XP | Traits and ability |
|---|---|---|---|---|---|---|---|---|---|---|
| Photon Knight | C | Infantry | 50 | 470 + 90 shield | 66 / 1.0 s | 30 | 75 | 1 | 30 / 50 | The shield regenerates 30/s after 3 s without taking damage |
| Pulse Trooper | C | Ranged | 75 | 315 | 43 / 1.0 s | 260 | 65 | 1 | 45 / 75 | - |
| Walker Mech | C | Heavy | 150 | 1,860 | 140 / 1.5 s | 60 | 50 | 2 | 90 / 150 | Armored, Mech |
| Rail Gunner | R | Anti-armor | 100 | 665 | 86 / 1.2 s | 280 | 65 | 1 | 60 / 100 | Pierces 2 in a line. ×2 vs Heavy/Mech, ×0.75 vs Light |
| Repair Drone | R | Support | 110 | 430 | - | 160 | 70 | 1 | 66 / 110 | Air. Heals 100 HP/s, split between the 2 most damaged allies |
| EMP Saboteur | E | Anti-mech | 200 | 700 | 50 / 1.0 s | 30 | 85 | 2 | 120 / 200 | EMP every 8 s (radius 120): Mech enemies stunned 1.5 s, shields stripped |
| Chrono Titan | L | Siege heavy | 350 | 5,600 | 230, cleaves 3 targets / 1.6 s | 60 | 35 | 3 | 210 / 350 | Armored, Mech. Time Stop on first contact and every 15 s after: enemies within 200 lu freeze for 1.5 s |

| Turret | Rarity | Cost | Damage / interval | Range | Notes |
|---|---|---|---|---|---|
| Pulse Laser | C | 150 | 20 / 0.3 s | 360 | Single-target beam |
| Arc Coil | C | 175 | 60, chaining to 3 targets / 1.8 s | 260 | - |
| Plasma Mortar | R | 250 | 360, AoE radius 60 / 5.0 s | 480 (min 180) | Artillery |
| Gravity Well | E | 300 | 60 / 7.0 s | 400 | Pulls enemies within 90 lu of the impact into the centre and slows them 50% for 2.5 s. Combos with splash |

### 4.7 Age Powers

| Age | Default (owned from the start) | Alternate (Trophy Road unlock) |
|---|---|---|
| Stone | **Meteor Shower**: 14 meteors over 3 s in a 400 lu zone, 70 damage each, AoE radius 40 | **Stampede** (Arena 2): 5 spirit aurochs charge 500 lu from your front line, dealing 50 damage and 40 lu of knockback per hit, at most 3 hits per enemy |
| Medieval | **Arrow Storm**: 40 arrows over 2.5 s in a 450 lu zone, 30 damage each | **Royal Decree** (Arena 3): your units get +30% damage and +25% speed for 8 s |
| Gunpowder | **Broadside**: 10 cannonballs over 3 s in a 450 lu zone, 120 damage each, AoE radius 45 | **Smoke Screen** (Arena 4): a 350 lu cloud for 7 s. Enemy shots into it miss 50% of the time (seeded), and your units inside get +20% damage |
| Modern | **Carpet Bomber**: 12 bombs along a 500 lu line, 240 damage each, AoE radius 50 | **Paratroopers** (Arena 5): 4 Riflemen at your card level land 150 lu behind the enemy front and don't count toward the pop cap |
| Future | **Orbital Lance**: after the telegraph, sweeps 500 lu over 2 s, dealing 650 damage to each enemy it touches | **Nanite Surge** (Arena 6): your units heal 40% of max HP over 4 s and get a 150 shield for 6 s |

All power values are at P for that age. Powers have no card levels.

### 4.8 Skins and cosmetics
Skins follow a clarity-parity rule. A skin never changes a unit's silhouette, size, weapon type, team-colour areas or stats. It may change the palette outside the team areas, decorative overlays, the idle flourish, the dropped death prop and the colour of attack effects.

| Skin | For | Rarity | Look |
|---|---|---|---|
| Pumpkin Head | Bonker | Rare | Carved gourd helmet |
| Punk Pebbler | Pebbler | Rare | Mohawk and spiked belt |
| Woolly Tuskback | Tuskback | Epic | Shaggy coat, frosty breath puffs |
| Frost Matriarch | Mammoth Matriarch | Legendary | Ice tusks, snow aura |
| Wasp Nest | Angry Beehive | Rare | Striped paper nest |
| Tin Can | Footman | Rare | Dented bucket armour |
| Jester Bow | Longbowman | Epic | Bell hat, confetti arrow trails |
| Parade Knight | Destrier Knight | Epic | Plumes and ribbons |
| Panda Paladin | Ursa Paladin | Legendary | Panda mount, bamboo banner |
| Cake Launcher | Trebuchet | Epic | Lobs cakes (same hitbox) |
| Ghost Corsair | Corsair | Epic | Translucent body with a glow |
| Toy Soldier | Fusilier | Rare | Wind-up key on the back |
| Brass Dragon | Swivel Gun | Rare | Dragon-head muzzle |
| Candy Balloon | Balloon Admiral | Legendary | Striped candy envelope |
| Arctic Rifleman | Rifleman | Rare | Winter whites |
| Sprinkle Camo | Tankette | Epic | Ice-cream colours |
| Shark Mouth | Gyrocopter | Epic | Painted nose art |
| Golden Behemoth | Behemoth Tank | Mythic | Gold plating, coin sparks |
| Synthwave | Photon Knight | Epic | Neon grid visor |
| Kaiju Walker | Walker Mech | Legendary | Dinosaur-head plating, a nod back to the Stone Age |
| Clockwork Titan | Chrono Titan | Mythic | Brass gears, a ticking sound layer |
| Disco Laser | Pulse Laser | Legendary | Rainbow beam |
| Cozy Cave | Stone base | Rare | Hanging laundry, a chimney |
| Candy Keep | Medieval base | Epic | Gingerbread walls |
| Pirate Fort | Gunpowder base | Epic | Jolly flags, a ship's figurehead |
| Bunker 9 | Modern base | Rare | Stencils and sandbags |
| Crystal Spire | Future base | Legendary | Faceted glass, prism glints |

Other cosmetics:
- 8 profile banners
- 8 profile frames
- 12 titles
- 6 icon emotes (Laugh, Salute, Cry, Angry, Thumbs up, GG); there is no text chat anywhere

Mythic skins drop only from Wardrobe Crates and Aeon capsules.

---

## 5. Meta

### 5.1 Profile
- **Identity.** You get an automatic name such as "Chief-4821", editable at any time and never required.
- **Look.** A procedural face avatar built from parts, plus a banner, a frame and a title.
- **Stats:**
  - trophies (current and best) and arena
  - win rate for each AI tier
  - favourite card
  - collection % and Collection Level
  - fastest win
  - number of times you reached the Future Age
- **History.** The last 20 matches, each with a replay.
- No login or account in v1.

### 5.2 Currencies (all earned; nothing is sold)

| Currency | Use | Sources |
|---|---|---|
| Gold | In battle only, resets every match | Income, bounties |
| Amber | Card upgrades | Capsules, wins, Trophy Road |
| Card shards | Per-card copies used to upgrade | Capsules |
| Wild Shards (Rare/Epic/Legendary) | Count as a copy of any card of that rarity | Gold and Aeon capsules, Trophy Road, quests |
| Dust | Crafts specific cards and skins | Duplicates past max level, duplicate skins |
| Trophies | Ladder rank | Wins |
| Collection XP | Collection Level track | Upgrades |

There is no premium currency, no store and no payment SDK in the codebase. No path from money to any of these currencies can exist.

### 5.3 Trophies, arenas, rewards

| Result | Trophies | Amber | Other |
|---|---|---|---|
| Win | +30 (+5 against a tier above your expected tier, -5 against one below) | 20, or 40 once your capsule charges are used | A Win Capsule if you have a charge |
| Loss | -20 (0 below 400 trophies; never below your current arena gate) | 8 | - |
| Draw | 0 | 12 | - |

How the extras work:
- **Capsule charges.** 4 per day accrue and bank up to 12 (3 days). Nothing expires, so the design rewards coming back without punishing absence.
- **Daily Capsule.** One every 24 h, banking up to 3. Its climb starts at Bronze.
- **Loss protection.** After 3 losses in a row, the next opponent is one AI tier lower and the VS screen says "Warm-up match".

| Arena | Trophies | Battlefield look | Unlocks |
|---|---|---|---|
| 1 Tar Pits | 0 | Bubbling tar, ferns | Starter War Plan |
| 2 Frostfang Pass | 300 | Snow, icicles | Stampede; Legendary drops enabled |
| 3 Kingsmoat | 700 | Moat, drawbridges | Royal Decree |
| 4 Powder Bay | 1,200 | Docks, gulls | Smoke Screen |
| 5 Iron Front | 1,800 | Mud, barbed wire | Paratroopers |
| 6 Neon Harbor | 2,500 | Rain, signs | Nanite Surge |
| 7 Orbital Ring | 3,300 | Starfield | Profile frame, Gold Capsule |
| 8 Chrono Rift | 4,200 | Time-warp sky | The Warden rematches, Legendary base skin |

An arena changes the ground and weather layer. The skyline layers still follow each player's age. A reward node sits every 100 trophies, rotating through Amber (100-500), fixed-tier capsules and Wild Shards, with a skin at each arena gate.

### 5.4 Capsules
Time Capsules roll their result the moment they are granted and save it before any animation plays. The opening then reveals that result as a climb through tiers (5.7 and 7.8).

Win and Daily Capsule tiers:

| Tier | Final odds | Cards | Amber | Guarantees |
|---|---|---|---|---|
| Clay | 50% | 4 | 60 | - |
| Bronze | 28% | 8 | 120 | At least 1 Rare |
| Silver | 15% | 16 | 300 | At least 2 Rares and 1 Epic |
| Gold | 5% | 36 | 800 | At least 3 Epics, a 25% chance of a Legendary, 1 Rare Wild Shard |
| Aeon | 2% | 50 | 1,500 | 1 Legendary (unowned first), 30% chance of a skin |

Cards that aren't guaranteed roll Common 72%, Rare 22%, Epic 5%, Legendary 1%. In Arena 1 the Legendary 1% moves to Common.

Other capsule types:
- **Daily Capsule.** The same table, but the climb starts at Bronze.
- **Trophy Road Capsule.** A fixed tier with no climb.
- **Age Capsule.** A quest reward: 12 cards, all from an age you choose, with at least 1 Epic.
- **Wardrobe Crate.** Skins only.
  - Odds: Rare 80%, Epic 16%, Legendary 3.4%, Mythic 0.6%.
  - Sources: every 5 Collection Levels and the weekly quest.
  - v1 reveals it with a card flip. A CS-style reel is an optional v1.x presentation for builds outside Poki.

### 5.5 Pity and duplicates
Pity rules:
- At least one Epic every 10 capsules.
- Legendary soft pity: after 25 capsules without a Legendary, each capsule's Legendary chance rises by 5 percentage points. Capsule 40 guarantees one.
- No duplicate Legendary until you own all Legendaries in the pool.
- Wardrobe Crates: an Epic or better at least every 5 crates, and a Legendary or better at least every 25.
- **Onboarding script:**
  - capsule 1 gives a new Rare unit (Spear Hunter)
  - capsule 2 a new Rare turret (Log Roller)
  - capsule 5 an Epic
  - your first Legendary arrives by capsule 12, or with the first capsule after you reach Arena 2 if that comes sooner

All pity counters and the full odds table appear on every capsule screen.

Duplicates:
- Below max level, a copy is an upgrade shard for that card.
- Past max level, a copy becomes Dust: Common 5, Rare 20, Epic 100, Legendary 400.
- Crafting one copy of a specific card costs 40 / 100 / 400 / 1,600 Dust by rarity (Hearthstone ratios, so crafting stays a targeted fallback).
- Duplicate skins give 50 / 200 / 800 / 2,000 Dust (Rare / Epic / Legendary / Mythic). Crafting a skin costs 200 / 800 / 3,000 Dust; Mythics can't be crafted.

### 5.6 Upgrades
All rarities share one level scale. Each level adds +5% HP, damage, healing and shields (additive, measured from level 1), so level 10 is +45%. Turrets level the same way.

| To level | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Common copies | 2 | 4 | 8 | 12 | 20 | 30 | 45 | 65 | 90 | 276 |
| Rare copies | - | 2 | 4 | 6 | 10 | 15 | 22 | 30 | 40 | 129 |
| Epic copies | - | - | - | 2 | 3 | 5 | 7 | 10 | 14 | 41 |
| Legendary copies | - | - | - | - | - | 1 | 2 | 3 | 4 | 10 |
| Amber | 10 | 25 | 50 | 100 | 200 | 350 | 550 | 900 | 1,400 | 3,585 |

The level cap is fixed at 10 at launch, and the game grows sideways with new cards and ages.

### 5.7 Collection Level and quests
- **Collection Level.** Each upgrade gives Collection XP: +1 per level for a Common, +2 for a Rare, +4 for an Epic, +8 for a Legendary.
  - A new Collection Level every 10 Collection XP, about 86 levels in all.
  - Each level gives 100 Amber.
  - Every 5 levels a capsule, alternating with a Wardrobe Crate.
  - Titles and frames at milestones.
- **Quests.**
  - Three daily quests, one of which you can reroll each day. Examples: "Reach the Future Age before 5:30", "Win with a Stone Legendary", "Kill 20 units with turrets", "Win without Tribute".
  - One weekly quest that gives a Wardrobe Crate.
  - Daily quests give Amber (100-200), Wild Shards or Age Capsules.

### 5.8 Matchmaking fairness
- A bot's War Plan level equals your War Plan average level, rounded down. It is never above yours.
- Hidden MMR (Elo, K = 32) picks the AI tier inside the band for your arena (section 6).
- Skirmish has a "Standard levels" toggle that puts every card on both sides at level 7.
- For future PvP:
  - Ranked caps every card at level 8.
  - The trophy ladder prefers opponents within one average level of you.
  - AI matches are marked as AI in match history.

### 5.9 Pacing check
Full daily engagement (4 capsule wins, the Daily Capsule, quests) gives about 50 cards and about 1,100 Amber per day.

| Rarity | Copies per card per day | Time to max one card |
|---|---|---|
| Common | about 1.4 | about 6 months |
| Rare | about 0.75 | about 6 months |
| Epic | about 0.26 | about 5 months |
| Legendary | about 0.10 | about 4 months |

Other pacing figures:
- Maxing all 55 cards costs about 192k Amber, about 6 months, so Amber and cards run out at roughly the same time.
- A focused War Plan reaches level 7-8 in about 6-8 weeks with Wild Shards.
- A new player owns all 5 Legendaries within about 2-3 weeks.

A 365-day economy sim confirms these figures before launch (9.7).

---

## 6. Bot opponents

### 6.1 Honesty rules
Every rule below is enforced in code:
- **Same rules.** Bots send commands through the same API as the player: same gold, XP, prices, cooldowns and levels. They get no stat bonuses at any tier.
- **Same information.** Bots read only what a player can see: the lane, both bases, turrets, both XP bars and their own gold. They never see the player's gold, so they estimate it from time and kills.
- **Visible modifiers.** If a Daily Challenge gives the AI a modifier, the VS screen shows it (for example "AI: +20% gold").
- **Labeling.**
  - A robot icon and an "AI" chip on the nameplate
  - "AI General" on the VS screen
  - the line "Plays by the same rules as you" on the bot's profile card
  - Settings > About: "All opponents in this version are AI."

### 6.2 How a bot decides (utility AI)
- **Timing.** Each decision tick, the bot reads a snapshot of the match delayed by its reaction time.
- **Scoring.** It scores every legal action:
  - **Train (card):** counter value against enemy units within 500 lu of its front, plus push value from the army-value ratio, plus its personality weight, minus a penalty if it is saving for something.
  - **Build a turret or buy a slot:** pressure near its own base × spare gold × personality.
  - **Tribute:** before 3:00 and while not under pressure.
  - **Evolve:** XP is full and no enemy is within 300 lu of its base. Greedy bots evolve regardless.
  - **Power:** the expected damage in the best zone passes a threshold that rises with tier, or it is defending its base.
  - **Stance:** Hold when its army value is below 0.7× the enemy's and it has at least 2 turrets; otherwise Charge.
  - **Last Stand:** 4 or more enemies in range.
- **Saving goals.** A goal like "bank 350 for a Legendary" pauses training, and the player sees it as a lull before a push.
- **Choice.** With probability 1 minus the mistake rate, the bot takes the best action. Otherwise it samples from the top 3 with a softmax.
- **Mistakes.** These are plausible human errors: over-committing, evolving late, firing the power early, forgetting a turret slot. They are never nonsense like selling every turret.
- **Openings.** Each personality has an opening build with seeded variation, so no two games start the same.

### 6.3 Tiers

| Tier | Decision interval | Reaction delay | Mistake rate | Actions per 10 s | Counter model | Macro |
|---|---|---|---|---|---|---|
| I | 1.6 s | 900 ms | 35% | 3 | None (weighted random from its deck) | No Tribute; evolves 5-10 s late; fires the power at 2+ enemies |
| III | 1.35 s | 770 ms | 25% | 5 | Reacts to the enemy front unit only | Tribute 1; evolves 3-6 s late |
| V | 1.1 s | 640 ms | 16% | 7 | Counters the front 3 units | Tribute 2; turret rebuilds after evolving |
| VII | 0.85 s | 510 ms | 9% | 9 | Full matrix, tracks composition over time | Times evolving to safe windows; saves for Legendaries |
| X | 0.5 s | 300 ms | 3% | 12 | Full matrix plus prediction of the next enemy age | Optimal Tribute timing; fires the power at 4+ enemies or in a clutch; uses Last Stand well |

Tiers II, IV, VI, VIII and IX interpolate. No bot reacts faster than 300 ms.

Difficulty assignment:
- The tier comes from hidden MMR, inside each arena's band: Arena 1 I-II, A2 II-III, A3 III-IV, A4 IV-V, A5 V-VI, A6 VI-VII, A7 VII-VIII, A8 IX-X.
- In your first 10 matches the tier is shifted one step down, targeting about a 70% win rate. After that the target is 50-55%.
- Difficulty adapts only between matches, never during one.

### 6.4 Named AI Generals

| General | Personality | Tiers | Signature |
|---|---|---|---|
| Old Grogg | Tutorial trainer | Training | Barely attacks; his base starts at 50% HP (disclosed as "Training match") |
| Pip Quickstep | Balanced beginner | I-II | Always opens with a Ranged unit, then Infantry |
| Captain Kettle | Rusher | I-V | Infantry spam, few turrets, goes all-in before each evolve |
| Mama Moss | Turtle | II-IV | Early turrets, Hold stance, pushes only in Overdrive |
| Baroness Ledger | Greedy evolver | III-VI | Buys Tribute to level 3 early and evolves first; weak for the first 60 s |
| Sgt. Boomsworth | Artillery lover | IV-VII | Picks splash turrets and artillery units; slow, heavy pushes |
| Ada & Ivo, "The Twins" | Balanced counters | V-VIII | Two portraits on one bot, teasing 2v2 |
| Rook | Counter-picker | VI-IX | Reads your composition and switches units within seconds |
| Madame Tempest | Power timing | VII-IX | Banks the power for evolve moments and big clumps |
| The Warden | All-round expert | X | Final boss of Arena 8; brings all five Legendaries |

Between the named Generals, the ladder also uses procedural AI Commanders. Their names come from syllable tables ("AI · Brakka Stonejaw", "AI · Lady Wren Ashdown"), and each has a stable seeded profile with a personality and a favourite card. They carry the same AI badge.

### 6.5 Feeling human, honestly
- **Timing.** Humanlike reaction delays and decision rhythm (6.3).
- **Emotes:**
  - a Laugh after winning a big trade, and GG at the end
  - at most one every 20 s
  - a one-tap mute
- **Readable intent.** Players can see a bot's plan: saving lulls before a push, holding at the line, a burst of spawns right after it evolves.
- **Personality lines.** Each General has a short quote on the VS and result screens, such as Kettle's "Tea's getting cold. Charge!" and Moss's "Nobody gets past my garden."
- **Later: ghosts.** "Ghost of <player>" opponents replay recorded War Plans and behaviour profiles, labeled as ghosts (v1.x locally, later online).

---

## 7. Game feel and presentation

### 7.1 Art direction (code-drawn now, swappable later)
- **Style: chunky cartoon cutout.** Flat fills, two-tone cel shadows, 3 px outlines at 720p in a darkened version of each fill colour (not black), rounded shapes, big heads (about a third of body height) and short legs. The style is readable at phone size, and AI or human art can match it later.
- **Scale.** Kept consistent across ages: infantry about 56 px tall at 720p, heavies 80-100 px, Legendaries 140-180 px.
- **Team colours.**
  - You are blue (#2F7DF6) and the opponent is orange (#F28A1E), with a clear difference in value between them.
  - Team colour sits on the large parts: tabard, shield face and plume.
  - Redundant cues: facing direction, a ground ring (circle for you, diamond for the enemy), the pennant on heavies and the health-bar colour.
  - Colourblind presets: blue/yellow and high contrast.
- **Age palettes:**
  - Stone: ochre, moss green, bone
  - Medieval: slate grey, banner red, gold
  - Gunpowder: navy, brass, cream
  - Modern: olive, khaki, gunmetal
  - Future: white, cyan and magenta neon on charcoal
- **Split-age lane.** Your half of the backdrop shows your age and the enemy's half shows theirs, blending at mid-lane. When either side evolves, its half wipes to the new age from the base outward over 1.5 s. This is the signature visual and it makes good clips.
- **Backdrops.** Three parallax layers per age, generated from seeded noise: a sky gradient, distant silhouettes (mountains, then castles, windmills, a city and megastructures) and a mid-ground. The arena controls the ground and weather layer. Backgrounds stay desaturated and low contrast so units pop.
- **Bases:** Cave Hold, Keep, Star Fort, Bunker, Spire. Each has 4 turret mounts stacked vertically and crumble states at 75%, 50% and 25%.
- **Violence.** No blood anywhere, which is portal-safe. Units pop into dust and coins.

### 7.2 Rigs and animation list
Five shared rigs keep the 55 cards affordable:
- **Biped:** head, torso, pelvis, 2-part arms, weapon, 2-part legs.
- **Quadruped:** boar, horse, bear, mammoth, sabertooth.
- **Vehicle:** hull, wheels or treads, gun turret.
- **Flyer:** body, rotor or balloon, gondola.
- **Turret:** base, pivot, barrel.

Every unit implements the same clip set:

| Clip | Default treatment |
|---|---|
| spawn | Pop from 0 to 1.15 to 1 over 180 ms with ease-out-back, plus a dust puff |
| idle | 2 s breathing bob, blink, a weapon twirl every 6-10 s |
| walk | 6-8 key procedural gait; vehicles bounce and treads scroll |
| attack | Windup with squash (0.9/1.1), impact at the sim's impact tick, short recovery |
| hit | 80 ms white flash, 4 px recoil |
| die | Fling along the knockback direction, dust poof and coins, the hat, helmet or weapon drops and stays 6 s |
| victory | Cheer hop, raised weapon |
| ability | Card-specific (below) |

Card-specific clips:
- Tuskback / Knight / Cuirassier: charge
- Sabertooth: pounce arc
- Matriarch: stomp and riders jumping off
- Ram: swing
- Cannon, tank and Howitzer: recoil
- Balloon: bomb drop and crash
- Gyrocopter: rotor tilt
- Radio Operator: radio call
- Repair Drone: repair beam
- EMP Saboteur: EMP ring
- Chrono Titan: Time Stop pose with a clock-face shockwave

Base clips: idle (torches and lights), hit (shake and debris), crumble stages, destroyed collapse. Turret clips: build drop-in, aim, fire recoil, sell poof.

### 7.3 VFX list
- **Combat:**
  - hit sparks by damage type (blunt dust, slash arc, pierce spark, bullet spark, laser scorch)
  - muzzle flashes
  - projectile trails (rock, arrow, musket ball, rocket smoke, plasma)
  - splash rings
  - heal glyphs, shield bubbles
  - Mark reticle, Gravity Well swirl, Smoke Screen cloud
- **Rewards:** gold "+30" popups that fly to the gold counter, XP sparkles into the XP bar.
- **Powers:**
  - meteors with craters
  - an arrow volley shadow
  - a ship's broadside off screen
  - a bomber silhouette
  - the orbital beam
  - the stampede
  - a buff aura for Royal Decree
- **Evolve:** radial light burst, base morph, backdrop wipe, age banner.
- **Match states:**
  - Last Stand charge and volley
  - Overdrive frame tint
  - Siege bell ripple
  - a red vignette pulse every 1.2 s when your base is below 25% HP
- **Legendaries:** an idle aura for Legendary units and Legendary skins.
- **Budget:** particles are pooled, with a cap of 600 on mobile and 1,500 on desktop. The lowest-priority emitters drop first.

### 7.4 Feel numbers (all in feel.json, tunable live)
- **Hitstop.** This is view-only; the sim never pauses, and the view catches up within 100 ms.
  - Per unit: 40-80 ms, scaled by damage relative to the victim's max HP. The victim freezes 20 ms longer than the attacker, with 1-2 px of jitter.
  - Global freezes: 80 ms for a heavy death, 120 ms when a power lands, 250 ms plus 0.5 s of slow motion when a base is destroyed. At most one global freeze every 0.5 s.
- **Screen shake.** Uses the trauma model (shake = trauma², linear decay of 1.0/s, Perlin noise, at most 12 px offset and 2.5° rotation, with a small directional kick). Trauma added per event:

  | Event | Trauma added |
  |---|---|
  | Heavy hit (15% of max HP or more) | 0.05 |
  | Unit death | 0.1 |
  | Base hit | 0.2 |
  | Evolve | 0.4 |
  | Power lands | 0.5 |
  | Base destroyed | 1.0 |

- **Health bars.** They appear only once a unit is damaged, in team colours, with a ghost segment that drains 300 ms after each hit.
- **Numbers.** By default the game shows gold popups, base damage chunks and power hits, spread 20-40 px apart so they don't stack. A toggle shows every number.
- **Mech deaths.** One in three Mech deaths explodes (a cosmetic roll).
- **The evolve moment (2.5 s):**
  1. 100 ms freeze
  2. white flash
  3. light burst from the base while the base morphs with a scale bounce
  4. backdrop wipe
  5. banner (for example "MEDIEVAL AGE") with the age icon
  6. music key change
  7. every allied unit does a small cheer hop

  When the enemy evolves, a smaller version plays on their side and a banner appears on their XP bar.
- **Reduce motion setting.** Shake ×0, hitstop ×0.5, softer flashes.

### 7.5 SFX list (ZzFX now, files later through the manifest)
- **UI:** ui_click, ui_deny (unaffordable press: red flash plus a 2-frame shake), ui_toggle.
- **Units:**
  - spawn_pop
  - hit_blunt, hit_slash, hit_pierce, hit_bullet, hit_laser (4 variants each)
  - shot_sling, shot_bow, shot_musket, shot_cannon, shot_rifle, shot_mg, shot_rocket, shot_rail, shot_laser
  - explosion_s, explosion_m, explosion_l
  - die_bio, die_mech, prop_drop
- **Turrets and bases:** turret_build, turret_sell, slot_buy, base_hit, base_crumble, base_destroyed.
- **Economy:** coin_gain, xp_tick, tribute_up.
- **Evolving:** evolve_ready (one soft chime, no loop), evolve_fanfare_[age].
- **Powers:** power_ready, power_telegraph, and one sound per power (meteor, arrows, broadside, bomber, lance, stampede, decree, smoke, paratroop, nanite).
- **Match states:** last_stand_charge, last_stand_fire, overdrive_horn, siege_bell.
- **Results:** victory_jingle, defeat_jingle (gentle, not mocking).
- **Capsules:**
  - capsule_drop, capsule_riser, capsule_strike
  - capsule_climb_1 to capsule_climb_4, capsule_clunk
  - capsule_burst, card_flip
  - stingers: stinger_common (pluck), stinger_rare (two rising notes), stinger_epic (triad arpeggio and shimmer), stinger_legendary (5-note fanfare, choir pad, sub drop)
  - upgrade, level_up
- **Mixer:**
  - buses: master, music, sfx and ui, each with its own slider
  - at most 4 voices per sound ID, 40 ms minimum retrigger gap
  - pitch ±8% and volume ±3 dB per play
  - music ducks 6 dB during powers and evolves
  - the iOS audio context unlocks on the first tap

### 7.6 Music
- **Main theme.** "Dawn March" is our own heroic, loopable 16-bar theme at 110 BPM. It is the biggest nostalgia lever in this genre, so we write 3 melody candidates and the owner picks one.
- **Engine.** A tiny step sequencer with synthesized instruments renders it.
- **Arrangements.** One for each age (Stone: drums and a breathy flute; Medieval: plucked lute and horn; Gunpowder: fife and snare; Modern: brass and synth bass; Future: arpeggiated synths). There is also a menu arrangement, plus victory and defeat stingers.
- **Layers:**
  - a base loop
  - a combat intensity layer, driven by a view-side intensity estimate from nearby damage and deaths
  - an Overdrive layer with double-time percussion

  Each evolve modulates up a whole step, capped at 2 steps above the start key.
- **Replaceable.** A composed track can replace any musicId in the manifest later.

### 7.7 UI screens and flow

```
Boot (≤3 s) ──first launch──> Tutorial match 1 ──> Capsule 1 ──> Tutorial match 2 ──> Capsule 2 ──> Home
Home: [BATTLE] | War Plan | Collection | Capsules | Profile | Settings
BATTLE ──> Mode (Ladder / Skirmish / Daily Challenge) ──> VS screen (2 s, AI badge) ──> Battle HUD
Battle HUD ──> Pause (Resume / Settings / Retreat)
Battle ──> Result (rewards staged) ──> Capsule opening ──> Home or Next battle
```

Screens:
1. **Boot/loading.** Logo for at most 1 s, then a progress bar.
2. **Home.**
   - a big Battle button
   - the Trophy Road bar showing the next reward
   - the capsule tray ("Open (3)")
   - quests
   - a profile chip
   - a settings button
3. **Mode select.** Ladder, Skirmish (choose a General, tier, speed and "Standard levels"), Daily Challenge (a date-seeded modifier that is the same for everyone).
4. **VS screen.** Your card against the AI General's card: AI badge, tier, War Plan level, personality line.
5. **Battle HUD.** Landscape:
   - Top bar: your base HP on the left, the enemy's on the right; both XP bars with age icons; the match clock with a phase marker in the centre; pause at top right.
   - Bottom tray:
     - 4 unit cards (cost, queue count, glow when affordable, radial training fill)
     - a divider, then 2 turret cards
     - Tribute, stance toggle and the Army counter
     - the gold counter with current income
     - the Evolve button
     - a large round Age Power button on the right
   - Turret slots are tapped directly on the base.
   - All controls sit below the lane, never on top of it.
6. **Pause menu.**
7. **Result screen:**
   - a Victory or Defeat banner
   - a recap: units trained and killed, base damage, time spent in each age, MVP card
   - rewards staged one at a time: trophies tick up, Amber, the capsule drops, Collection XP
   - Next battle, Replay and Home buttons
8. **Capsule opening** (7.8), with an odds and pity panel on every capsule.
9. **War Plan builder.**
   - 5 age tabs showing the loadout slots
   - the collection filtered to that age
   - average level
   - auto-fill and presets
10. **Collection.** A grid filterable by age, type and rarity. Unowned cards show as silhouettes, and each card shows its copies bar.
11. **Card detail:**
    - animated idle on a stage
    - full stats: HP, damage, interval, DPS, range, speed, pop, tags, traits
    - Strong vs / Weak vs
    - a preview of the next level (+5%)
    - an Upgrade button and a skins tab
12. **Trophy Road.**
13. **Profile and match history.**
14. **Replay viewer.** Play, pause, 2x, and scrubbing by re-simulating.
15. **Settings:**
    - three volume sliders
    - graphics preset (Auto / High / Lite)
    - reduce motion, colourblind team preset, damage-number density
    - language (EN/DA)
    - save export and import
    - About (including "All opponents in this version are AI.") and credits
16. **Dev pages.** Behind `?dev=1`: the art gallery, the feel tuning panel, a spawn sandbox, a time-scale control and a replay debugger.

### 7.8 Capsule opening storyboard
The result is rolled and saved before step 1, so a reload can't re-roll it. The animation never fakes a near miss.

| Step | Time | Visual | Audio | Input |
|---|---|---|---|---|
| 1. Arrival | 0-0.5 s | Capsule drops onto a pedestal, bounces, dust ring | Low thud | - |
| 2. Charge | 0.5-2.0 s | Capsule shakes; cracks leak light in its current tier colour (Clay brown) | Rising riser | - |
| 3. Strikes (4) | About 0.6 s each | Each tap is a hammer strike. If the saved tier is higher, the crack widens, the colour steps up (Clay, Bronze, Silver, Gold, Aeon), and the screen shakes. If not, a small dust puff | Chord a step higher on each climb; soft clunk otherwise | Tap, or auto after 1.5 s idle |
| 4. Burst | 0.3 s | White flash, god-rays in the final tier colour, capsule halves fly apart | Burst plus tier stinger | - |
| 5. Cards | 0.15-0.8 s each | Cards fan out face down, sorted so the rarest is last. Each back glows in its rarity colour before it flips: Commons in 0.15 s, Rares 0.4 s, Epics 0.8 s with a purple shimmer | Pluck, two notes or arpeggio | Tap to flip faster, hold to fast-forward |
| 6. Legendary walkout | 8-10 s the first time, 3 s after that | Screen dims to a spotlight. Silhouette, then age icon, then role icon, then the gold banner. The warrior walks onto a lane backdrop, attacks, and strikes its victory pose. Fireworks and a "NEW!" badge | 5-note fanfare, choir pad, sub drop | Skippable after the first reveal |
| 7. Duplicates | 0.5 s per card | Copies bar fills (for example 3/4, then "UPGRADE READY") and pulses | Rising ticks, a ding when full | - |
| 8. Summary | Until closed | Grid of everything, new items highlighted, Amber total, updated pity counters | - | Upgrade / Open next / Done |

"Open all" batches the whole stack. No part of the sequence runs longer than 10 s without a skip.

---

## 8. Onboarding: the first 10 minutes

| Time | Beat | On-screen text (8 words max) |
|---|---|---|
| 0:00 | Player clicks Play. Loading takes 3 s or less. No menu, no name prompt | - |
| 0:03 | Match 1, Stone Age, against Old Grogg (AI badge, "Training match": no clock, his base starts at 50%). The tray holds only Bonker | "Tap to send a Bonker" |
| 0:08 | First kill; "+30" gold flies to the counter | "Kills earn gold" |
| 0:25 | The Pebbler card unlocks | "Pebblers shoot over friends" |
| 0:50 | The tutorial XP bar (400 XP) fills and Evolve glows | "Evolve!" |
| 0:55 | Ascension to Medieval, played at full size | - |
| 1:20 | Arrow Storm is ready; an animated hand drags it onto the enemies | "Drag the arrows onto them" |
| ~2:00 | Grogg's base falls. Victory | - |
| 2:10 | First capsule: guided taps; Spear Hunter reveal (short walkout) | "Tap to crack it" |
| 3:00 | Match 2 against Captain Kettle (AI tier I, three ages). His rush arrives and the empty slot pulses | "Build a turret" |
| ~4:30 | Adaptive hint only if your base drops below 60% | "Buy another slot" |
| ~7:00 | Victory. On a loss, rewards are still given and a retry is offered. Capsule 2: Log Roller | - |
| 7:45 | The Home screen appears for the first time. Auto name (editable). Trophy Road shows the next reward | Battle button pulses once |
| 8:00 | Match 3: a full five-age match against Pip Quickstep (tier I) | - |
| ~15:00 | After match 3, the War Plan screen unlocks with a prompt to slot in Spear Hunter | "Add Spear Hunter to Stone" |

By minute 10 the player has won two matches, opened two capsules, evolved at least twice, used a power, built a turret, seen Home and has a name. Account and settings screens stay out of the way.

Adaptive hints fire at most once per 30 s and only on failure patterns:
- "Their turret shreds melee. Try Pebblers."
- "Heavies stop Bonkers. Try a Spear Hunter."
- "Your power is ready."
- "Evolve before they do."

---

## 9. Tech architecture

### 9.1 Stack

| Layer | Choice |
|---|---|
| Language and build | TypeScript (strict), Vite, pnpm workspaces, Node 22 LTS |
| Battle renderer | PixiJS v8, WebGL by default with Canvas fallback; WebGPU behind a flag |
| Meta UI | Preact with signals, plain CSS in the DOM |
| Simulation | Pure TypeScript, no engine: integer math, 20 Hz fixed step, seeded sfc32 RNG |
| Audio | ZzFX pre-rendered to AudioBuffers, our own mixer and tiny music sequencer |
| Saves | IndexedDB (idb-keyval) plus a localStorage backup, Valibot schemas |
| Tests | Vitest (Node and browser mode), fast-check, Playwright smoke tests |
| Later | Colyseus server hosting the same sim package, Capacitor app, PWA |

### 9.2 Deterministic sim, separate from rendering
- **Tick.** 50 ms (20 Hz). Content is authored in milliseconds and seconds and compiled to ticks at build time. A 10-minute match is 12,000 ticks.
- **State.** All integers: positions in milli-lu, integer HP and damage, multipliers in basis points (10,000 = 100%), `Math.trunc` for division. Entities live in arrays with stable ids and are processed in id order.
- **Lint bans in `sim` and `meta`:**
  - `Math.random`, `Date`, `performance`
  - `Math.sin`, `Math.cos`, `Math.pow`, `Math.exp`, `Math.log`
  - the DOM and pixi.js

  Where arcs are needed, the sim uses lookup tables. The view can use any math it likes.
- **RNG.** One sfc32 generator lives in sim state, seeded with xmur3 of the match seed. A separate cosmetic RNG lives in the view, so visual effects can never change the outcome.
- **API.** `step(state, commands) -> events`, where a command is `{tick, player, type, payload}` (train, buildTurret, sellTurret, buySlot, tribute, evolve, power, stance, lastStand, retreat).
  - Human input is stamped for the next tick, or for tick + N once online.
  - Bots run outside the sim and produce commands from delayed snapshots with their own seeded RNG.
  - Every command, bot commands included, is recorded.
- **Events:**
  - unitSpawned, attackStarted, hit, died
  - projectileFired, projectileHit
  - turretBuilt, turretSold
  - powerTelegraph, powerImpact
  - ageUp, baseDamaged, phaseChanged, lastStand
  - goldEarned, xpEarned, matchEnded

  The view turns them into animation, VFX and sound.
- **Rendering.** Driven by requestAnimationFrame, interpolating between the previous and current state with alpha = acc / DT. Frame time is clamped to 250 ms. The view never mutates the sim. Hitstop and slow motion exist only in the view.
- **Replays.** A replay is `{simVersion, contentHash, seed, warPlans, levels, commands[]}`, a few KB each. An FNV-1a hash of the state is taken every 20 ticks for golden tests and, later, desync detection.
- **Online path.** The same package runs in a Colyseus room that stamps commands with an execution tick (now + 4) and compares hashes. The 1 s summon animation hides the input delay.

### 9.3 Data-driven content
- **Location.** `packages/content` holds ages, units, turrets, powers, rarities, capsules, loot tables, the economy and `feel.json`.
- **Card fields:**
  - id, age, role, rarity
  - cost, stats, traits
  - `visualId`, `soundIds`
  - name and description string keys (EN and DA string tables from day one)
- **Build step.** Content is validated against a schema at build time, compiled to ticks and stamped with a `contentHash`.
- **Spreadsheets.** Balance tables export to CSV and import back.
- **New content.** Adding a card or an age means adding data files and visuals. It needs no code changes.

### 9.4 Asset manifest and art swap strategy
- **The visual contract.**
  - Game data refers only to a `visualId`. A registry maps each `visualId` to a `VisualDef`: `{kind: 'procedural'|'atlas'|'spine', source, anchors{feet, head, muzzle, hitCenter}, scale, teamTintParts, clips{spawn, idle, walk, attack, hit, die, victory, ability}, impactAt}`.
  - The sim owns timing. The view time-scales the attack clip so that `impactAt` lands on the sim's impact tick, which means new art can never change balance.
- **Tier 0 (v1), procedural:**
  - Rig parts are authored as SVG path data in TypeScript modules, so they open in any vector editor.
  - They are drawn once with Pixi Graphics and baked into a runtime atlas at a pixel ratio of at most 2.
  - They are animated as a Container tree using JSON keyframes on bones (rotation, offset, scale), plus procedural helpers for walk cycles, bobbing and squash.
- **Later tiers:**
  - **Tier 1:** AI-generated static parts dropped into the same rigs with the same pivots, plus a defringe step for alpha edges.
  - **Tier 2:** atlases packed with AssetPack.
  - **Tier 3:** Spine through spine-pixi-v8.

  Units can be swapped one at a time, and tiers can be mixed within a match.
- **Adapters.** `ProceduralPuppetView`, `AtlasAnimView` and `SpineView` all implement one `UnitView` interface.
- **Art gallery.** The dev art gallery renders every visualId × clip × skin × team. It also exports parts as SVG (Pixi `graphicsContextToSvg`) to use as reference sheets for artists or image generators.
- **Manifest.** `assets/manifest.json` has bundles per age. Ages 3-5 load lazily during the tutorial or the menu.
- **Sound and music entries:**
  - soundId: `{kind: 'zzfx', params, variants}` or `{kind: 'file', src}`
  - musicId: `{kind: 'seq', score}` or `{kind: 'file', src}`

  Swapping in real audio means editing one manifest entry.

### 9.5 Save system
- **SaveDoc.** A versioned document: `{v, createdAt, profile, currencies{amber, dust, wild}, trophies{current, best, arena, roadClaimed}, collection{cardId: {level, shards}}, skins{owned, equipped}, warPlans[3], activePlan, capsules{bank, charges, dailyNextAt, rngState, pity{sinceEpic, sinceLegendary, wardrobeSinceEpic, wardrobeSinceLegendary}, scriptStep}, quests, mmr, settings, replays[20], flags}`.
- **Storage.**
  - Two alternating IndexedDB slots, each with a checksum.
  - A localStorage mirror of the last good slot.
  - Writes are debounced by 2 s and flushed on `visibilitychange` and `pagehide`.
- **Migrations.** A chain of pure migrations, one per schema version, followed by schema validation. A backup of the save is kept from before each migration.
- **Export and import.** A compressed base64 code plus a file download. Because Safari can evict storage after 7 days without use, the game calls `navigator.storage.persist()` and shows a gentle "Back up your progress" reminder if the last export is more than 5 days old.
- **Capsule rolls.** They come from a seeded stream kept in the save, and each result is written before its animation plays.
- **Local clocks.** Daily timers use the local clock. Since no money is involved, clock tampering is accepted, limited only by the bank caps.
- Everything sits behind a `SaveStore` interface, so a Capacitor store or cloud saves can replace it later.

### 9.6 Folder structure

```
ageborn/
  packages/
    sim/          core/ (fixed.ts, rng-sfc32.ts, hash.ts, ids.ts)
                  battle/ (state.ts, step.ts, commands.ts, events.ts,
                           systems/ movement, combat, projectiles, turrets,
                           economy, xp-age, powers, phases, laststand)
                  replay/  test/
    ai/           utility bot, personalities, tiers, generals, name generator
    content/      ages, units/, turrets/, powers, rarities, capsules, loot,
                  economy, feel.json, strings/{en,da}.json, schemas, compile.ts
    meta/         profile, collection, warplan rules, upgrades, capsule rolls,
                  pity, trophies, quests, economy pacing sim
  apps/
    web/src/
      app/        boot, router, platform adapter (none now; Poki/CrazyGames later)
      ui/         Preact screens: home, warplan, collection, card, capsules,
                  trophy road, profile, settings, result
      render/     BattleView, interpolation, camera, hud, vfx, juice
      visuals/    registry.ts, procedural/{parts, rigs, clips}, adapters/
      audio/      mixer, zzfx defs, sequencer, unlock
      save/       store, slots, schema, migrations/
      dev/        art gallery, tuning panel, spawn sandbox, replay debugger
    sim-cli/      node: balance matrix, replay verify, economy sim, CSV reports
  .github/workflows/ci.yml
```

ESLint `no-restricted-imports` enforces the layering: `sim`, `ai`, `content` and `meta` never import pixi, Preact, the DOM or `apps/*`.

### 9.7 Testing and balancing
- **Sim tests:**
  - unit tests for every formula (multipliers, economy, phases)
  - 10 golden replays that must reach known final hashes
  - determinism: each replay runs twice, in Node and in browser mode (Chromium and WebKit), and the hashes must match
  - property tests: HP never exceeds max, gold is never negative, no unit passes a gate, population never exceeds the cap
  - a benchmark: a full 10-minute headless match runs in under 50 ms on a desktop
- **Balance matrix.** `sim-cli` runs bot-vs-bot matches: a smoke set of 50 matches per pairing in CI, and a full nightly run of 400 per matchup. It flags:
  - any card more than ±3 win-rate points from its baseline
  - a turret-heavy War Plan winning more than 40% against tier VII
  - a median match length outside 6:00-8:00
  - more than 3% of matches reaching Final Bell
- **Meta tests:**
  - chi-square tests of drop rates over 10⁶ simulated openings
  - pity invariants
  - a save migration fixture for every past version
  - a 365-day economy pacing sim
- **End to end (Playwright).** Boot, tutorial, first spawn, a win via the dev fast-forward, opening a capsule, then saving and reloading.
- **Screenshot tests.** Screenshot diffs of the art gallery arrive in v1.x, so art swaps show up as visible diffs.

### 9.8 Performance budget

| Item | Budget |
|---|---|
| Initial download | 2 MB gzipped target, 5 MB hard cap; 8 MB total |
| First frame | 3 s or less on a mid-range phone over 4G |
| Click to first spawn in the tutorial | 10 s or less |
| Frame rate | 60 fps on a 3-year-old mid-range phone; 30 fps floor with the Lite preset |
| On screen at once | 80 units and 150 projectiles |
| Particles | 600 mobile / 1,500 desktop |
| Draw calls in battle | 25 or fewer |
| Sim step | 0.5 ms or less on average on mobile |
| JS heap | 150 MB or less; runs on a 4 GB Chromebook |
| Device pixel ratio | Capped at 2 (1 in Lite) |
| Audio pre-render | Under 300 ms at boot for the first two ages; the rest lazily |

### 9.9 Repository and workflow
- **Repository.** A new private GitHub repository, `ageborn`. `main` is protected.
- **CI (GitHub Actions)** runs:
  - typecheck and the layer lint
  - unit tests and the determinism checks
  - the balance smoke run
  - a build with a size gate that fails if the initial chunk exceeds 3 MB
- **Playing locally.** `pnpm dev` serves the game at localhost for the owner. A preview link (itch.io unlisted, or GitHub Pages) is set up only when the owner wants to share one, since the game doesn't need to be online yet.

---

## 10. Scope, milestones, risks

### 10.1 v1 must-have
- **Battle:**
  - 5 ages with the full content: 35 units, 20 turrets, 10 Age Powers
  - turret slots, Tribute, stance, pop cap
  - Last Stand, match phases, Final Bell
  - bots with 10 tiers, 10 named Generals and procedural AI Commanders
- **Modes:**
  - tutorial (2 guided matches)
  - Trophy Road ladder against AI
  - Skirmish (choose General, tier, speed, standard levels)
  - Daily Challenge (a date-seeded modifier)
- **Meta:**
  - profile
  - War Plan builder with 3 presets
  - Collection with full stats
  - upgrades up to level 10
  - Win, Daily, Trophy Road and Age capsules with the climb reveal
  - pity, duplicates, Dust crafting
  - Collection Level
  - 8 arenas
  - daily and weekly quests
  - 27 skins and the other cosmetics, with Wardrobe Crates using the card-flip reveal
- **Presentation:**
  - procedural art for every card, base and backdrop
  - the feel layer
  - the full SFX set
  - "Dawn March" in five age arrangements
  - the capsule sequence
  - settings (volume, motion, colourblind, numbers, language, EN/DA)
- **Tech:**
  - deterministic sim
  - local replays of the last 20 matches
  - dual-slot saves with export and import
  - dev gallery and tuning panel
  - CI with the balance smoke run

### 10.2 v1.x
- The sixth age (Bronze/Antiquity), plus more cards per age.
- The "Chronicle" campaign (about 30 levels with disclosed modifiers) and Endless Horde mode.
- A "Who wins?" sandbox, for example 100 Bonkers against 1 Chrono Titan.
- Clip mode:
  - a 9:16 camera
  - MediaRecorder with a rolling 30 s buffer
  - automatic highlight triggers for evolves, Legendary pulls, comebacks and multi-kills
  - a watermark
- "Ghost of You" local ghosts.
- Achievements and badges.
- The optional CS-style reel for Wardrobe Crates on builds outside Poki.
- Portrait layout and a PWA install.
- Poki and CrazyGames platform adapters (the choice between an exclusive Poki launch and a multi-portal launch comes before launch).
- Screenshot tests.

### 10.3 Later
- **Online 1v1.** Colyseus hosts the same sim with server-stamped inputs and hash checks. Ghosts come from other players' recordings.
- **2v2:**
  - each side shares one base (HP ×1.6) and 4 turret slots (2 per player)
  - gold, XP, War Plans and ages stay individual
  - the base's age is the highest age on the team
- **Platform:** a Capacitor app with native storage, cloud saves and optional accounts.
- **Live features:** seasons, clans and events.
- **Art:** the tier 1-3 swaps.
- **Marketing clips.** Claude prepares clips and captions from replays. The owner approves each post with one click, and nothing posts automatically.

### 10.4 Build order
1. **M0, repository and skeleton.** Workspace, CI, a Pixi canvas, the sim loop with its first determinism test.
2. **M1, battle slice.** Stone and Medieval, 3 Commons and 2 turrets per age, evolve, one power, a tier III bot, placeholder rigs. This is owner playtest 1, and the core loop has to be fun here before any meta work starts.
3. **M2, full battle.** Five ages, all 55 cards and 10 powers, phases, Last Stand, stance, Tribute, all bot tiers and Generals, and the balance matrix in CI. Owner playtest 2.
4. **M3, feel pass.** All rigs and clips, VFX, the SFX set, the three music candidates, HUD polish, the split-age backdrop.
5. **M4, meta.** Saves, profile, War Plan, collection, upgrades, capsules and the opening sequence, Trophy Road, quests.
6. **M5, release candidate.** Onboarding, settings, EN/DA, the replay viewer, a performance pass on real phones and Safari. Release candidate for v1.

### 10.5 Risks

| Risk | Impact | Mitigation |
|---|---|---|
| The core loop isn't fun enough (Clash Mini shut down for this) | Fatal | M1 battle slice first; owner playtests before any meta work; iterate on feel.json live |
| Content volume (55 cards, 5 bases, many clips) | Schedule slip | Five shared rigs, archetype-driven stats, the gallery for fast review |
| Procedural art looks cheap | Weak first impression | Strict style guide; polish time goes to evolves and capsules; the swap path is ready from day one |
| Balance across 55 cards and 5 ages | A dominant strategy appears | Headless matrix in CI, the ±3 point rule, turret caps, no Legendary turrets |
| Bots feel repetitive or dumb | Churn | 5 personalities across 10 tiers, varied openings, intelligent mistakes, playtests |
| Save loss (Safari eviction, cleared data) | Lost trust | Dual slots, export reminders, `persist()` |
| The theme music isn't memorable | Weaker hook | Three melody candidates for the owner; a composed track can drop in via the manifest |
| Name or trademark conflict | Forced rename | TMview and domain checks before anything public |
| Capsules read as gambling | Portal rejection | Earn-only, published odds, visible pity, no fake near misses, chest-style reveal by default |
| Determinism breaks across browsers | Blocks online play later | Lint bans, cross-engine golden tests from M1 |
| Meta scope creep | Late v1 | Meta starts after M2; the v1.x list is explicit |
| iOS audio unlock and the mute switch | Silent game on iPhones | Unlock on first tap; a note in settings |
