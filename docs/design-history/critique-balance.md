# Ageborn v1 design review: balance designer lens

Most of these numbers are hand-calculated from the A2/A5 tables at level 1 with no mods. The evolve timings and Treasury figures come from a small economy model with two mirrored players. They spend all their gold, their units live about 22 s, trades are even, and they buy turrets and Treasury on a schedule. Ranked most severe first.

## P0: break the game

### 1. The 0.3 spacing rule multiplies every splash attack by 4 to 8
**Problem.** Once a fight starts, small units bunch up 14.4 lu apart (48 × 0.3), plus the two-wide front. A splash of radius R aimed at the front therefore hits 2 + floor(R/14.4) units. Only large units are spaced wider (28.8 lu), which helps heavies.

Per-gold output against a normal file of light units, compared with the single-target option of the same age:

| Card | Hits | Output | Comparison |
|---|---|---|---|
| Grenadier (100 g) | r35 hits 4 | 117 DPS | Fusilier 23.5 DPS for 75 g, so 3.7× per gold |
| Grenadier vs heavies | 3 | 175 DPS | AA baseline 79 |
| Bronze Cannon (range 320) | r60 hits 6 | 223 DPS | Outranges every Gunpowder unit |
| Radio Operator (110 g) | Call-in hits 5 | 125 DPS, plus 17 from its own gun | Stacks with more operators |
| Grapeshot Gun | 8 | 200 DPS | Swivel Gun 37 DPS; 4.7× per gold |
| Howitzer | 6 | 324 DPS | MG Nest 50; 3.9× per gold |
| Plasma Mortar | 6 | 432 DPS | Pulse Laser 67; 3.9× per gold |
| Pitch Cauldron | Up to 11 at the gate | 440 DPS | |
| Behemoth main gun | r50 hits 5 | 400 DPS plus MG | |
| Mammoth Matriarch | r60 hits 6 | 180 DPS | 7× a Heavy |

- Short War ends in Gunpowder, and every new player gets the Grenadier at capsule 2. So Arena 1 turns into a mass-Grenadier meta.
- The target "Turret damage per gold ≤ 1.3× a unit" in A2.14 fails for every splash turret.

**Fix.** Add one global rule. Area attacks (splash, cleave, chain, pierce, line, gate zone, followBehind) deal 100% to the primary target and 50% to the others, and hit at most 4 targets. Powers, Last Stand and death explosions are exempt because they are tuned by coverage (item 3). Then change these cards:

| Card | Change |
|---|---|
| Grenadier | Damage 70→50; light mod ×0.75→×0.5; HP 364→230. Result: 35 DPS vs a light file, 83 DPS vs 3 heavies |
| Bronze Cannon | 130 r60 → 110 r50; range 320→280 |
| Radio Operator | Strike 150 every 6 s → 120 every 8 s; one call-in per side per 3 s |
| Howitzer | 270 → 200 |
| Plasma Mortar | 360 → 270 |
| Pitch Cauldron | 20 → 14 per 0.5 s |
| Log Roller | Max 6 targets |
| Matriarch | 60 r60 → 55 r40 |
| Behemoth | Main gun 200 r50 → 170 r40; range 300→240 |

### 2. Overcharge in the final age turns it into non-stop Age Powers
**Problem.** The model reaches Future at about 5:14. After that, XP comes in at 30 to 60 XP/s (Overdrive doubles passive XP). At 400 XP per +25% charge, that is about 33 steps, or 8 extra powers. On top of that come about 8 powers from normal charge, sped up ×1.5 in Overdrive. That is roughly 16 Orbital Lances in 4:46, one every ~18 s. Short War has the same problem from about 2:20.

**Fix.**
- Overcharge costs 1,200 XP per +25%. In the model that drops it from 33 to 11 steps, about 2.75 extra powers.
- Overdrive doubles only the base 6 gold/s, not Treasury income. The document currently doesn't say which.

### 3. Age Powers do too much damage, pay out bounty, and ignore card level
**Problem: damage.** Coverage damage per unit is the number of overlapping hits times damage per hit. Percentages are of an L1 Infantry / Ranged / Heavy of the same age. The design target is 60-100% light and 15-35% heavy.

| Power | Damage per unit | Infantry | Ranged | Heavy | Verdict |
|---|---|---|---|---|---|
| Meteor Shower (2.8 hits × 70) | 196 | 123% | 206% | 35% | Too high |
| Arrow Storm | 142 | 66% | 111% | 19% | OK |
| Broadside | 240 | 82% | 139% | 24% | OK |
| Carpet Bomber (2.4 × 240) | 576 | 146% | 246% | 42% | Too high |
| Orbital Lance | 650 | 116% | 206% | 35% | Too high |

Every zone is 400-500 lu wide, while a 20-unit army is about 300 lu long. So one cast deletes every light unit in the army.

**Problem: bounty.** Powers earn the full bounty. A Meteor on a clash of 15 light units (about 975 g) pays the caster ~585 gold and ~975 XP, which is more than the whole Medieval threshold. The evolve race becomes a race of who times their power better, not who plays the lane better.

**Problem: levels.** Powers don't scale with level, but units do. At L7 a Bonker has 208 HP and survives a Meteor, so the tuning drifts as players level up.

**Fix.**
- Per-hit damage: Meteor 70→50, Carpet Bomber 240→150, Orbital Lance 650→480. That gives about 85-90% of Infantry and about 25% of Heavy.
- Kills by powers and Last Stand give the caster 0 XP and 30% gold. The victim still gets the 40% own-loss XP.
- Power damage and Last Stand damage scale with the caster's average card level in the current age (+5% per level).
- To make up for the removed power XP, lower thresholds about 10%: 800 / 1,000 / 1,200 / 1,500. Re-check with B12.

### 4. Ranged Anti-armor units kept melee-level HP, so they replace the Ranged role
**Problem.** The AA baseline (200 HP, range 60) assumes a melee reach unit. The ranged AA units keep that HP:

- **Bazooka vs Rifleman:** the Bazooka has 492 HP, the Rifleman 234. HP×DPS per gold² is 1.97 vs 1.33. The Rifleman is only better on range (260 vs 200).
- **Rail Gunner vs Pulse Trooper:** the Rail Gunner has range 280 vs 260, 664 HP vs 315, and pierces 2 targets. It is strictly better. The Pulse Trooper is dead content.
- The triangle rule "Infantry beats AA" also breaks, because Infantry has to walk through 200-280 lu of fire.

**Fix.**

| Card | HP | Other changes |
|---|---|---|
| Bazooka | 492 → 300 | Light mod ×0.5 |
| Rail Gunner | 664 → 400 | Range 280→240; light mod ×0.5 |
| Grenadier | 364 → 230 | Already in item 1 |

Check: 2 Trench Raiders (100 g) still beat one Bazooka after 2.5 s of approach fire.

## P1: dominant strategies and exploits

### 5. Treasury is always correct
**Problem.** Treasury costs 800 total and pays back in 75 / 125 / 200 s. In the model it adds +48% unit throughput by 7:00 (4,345 vs 2,941 gold of units) and gets to Future about 55 s earlier. A 3-Bonker rush doesn't punish it: the defender can afford 3 Bonkers when the rush arrives at 17 s and fights at their own gate.

**Fix.** Costs 200 / 350 / 550, each level +1.5 gold/s, and Overdrive does not double it. The model then shows −9% at 3:00, +5% at 5:00 and +16% at 7:00. That is a real greed-versus-safety decision, and in Short War it barely pays back.

### 6. Rarity start levels are a real stat bonus, so "sidegrade" is false
**Problem.**
- A new Legendary starts at L6 (+25% HP and damage, 1.56× combat power) and a new Epic at L4 (+15%). Meanwhile Commons sit at L1-3 for weeks: L5 takes about 19 days.
- The scripted Matriarch at capsule 10 arrives at L6. Bots at plan-average level 2 can't field Legendaries at all, so Arena 1 is a stomp.
- Even at equal level and gold, the Matriarch (r60, hits 5 medium units per swing) beats its own counter. 3.5 Spear Hunters kill it in about 11 s, but it kills them in about 6.5 s and survives with ~60% HP.
- Ursa's Roar gives 80 shield × ~15 allies every 12 s, about 100 effective HP/s. That is 2.5 Friars from a card that is also a Heavy.

**Fix.**
- Normalize level scaling: statMult = 1 + 0.45 × (L − start) / (10 − start). A new card of any rarity is then exactly baseline, and every card still reaches +45% at L10.
- Matriarch numbers as in item 1.
- Roar: 60 shield, nearest 8 allies, every 15 s.

### 7. Stacked healing makes fronts immortal, so matches stall
**Problem.** Melee damage is capped by the two-wide front. Two enemy Footmen deal 54 DPS focused on one target, and 3 Friars heal that target 60 HP/s. In Future, 2 Repair Drones (air, which melee can't hit) cut 2 Photon Knights to about 32 net DPS on a Walker Mech, so killing it takes 58 s.

**Fix.**
- Each heal pulse, a unit gets healing only from its single strongest healer. Heals don't stack, just like auras.
- Legendaries receive 50% healing.

### 8. Sticky targeting means backline raiders and air units get ignored
**Problem.** Units keep their target until it dies or leaves range. So:
- A pouncing Sabertooth eats Pebblers one by one while they keep shooting the front.
- Paratroopers land in the backline for free.
- Fusiliers ignore a Balloon Admiral overhead. At L6 the Balloon deals about 86 DPS to the base. Against two air-capable turrets (~100 DPS) it lands ~1,630 damage, which is 60% of a Gunpowder base plus ~720 XP. Against one Swivel Gun it kills the base in about 32 s.

**Fix.**
- Re-check targets every 1.0 s. Switch when a candidate has a higher priority class or is at least 60 lu closer.
- Ranged units always switch to any enemy within 30 lu of themselves.
- Balloon damage against bases 110 → 55.

### 9. Summoned units give the enemy a bounty
**Problem.** Paratroopers drop 4 Riflemen that pay the killer 180 gold and 300 XP. The Matriarch's riders do the same. Carpet Bomber gives more and feeds nothing, so Paratroopers are strictly worse and will never be picked.

**Fix.** Summoned units give 0 gold and 0 XP to either side.

### 10. Matching bots by plan-average level lets players sandbag
**Problem.** A Stone loadout of Tusk L8, Pebbler L8 and four L1 fillers averages 3.3, so the bot plays at L3. The player trains only the L8 cards and gets 1.56× combat power.

**Fix.** Per age, bot level = round(average of the player's 3 highest-level units in that age's loadout plus their highest turret). Use the same number in the VS screen's "Plan Lv".

## P2: weaker roles and smaller exploits

### 11. Infantry is outclassed
**Problem.** Only 2 melee units can attack at once. A Heavy has more HP per gold (3.73 vs 3.2) and more damage per front slot (28 vs 20, or 14 after Blunt vs armor). At equal gold, 600 g of Tuskbacks beats 600 g of Bonkers or Pebblers with about 57% HP left. Infantry only beats Anti-armor, so the best 4-card loadout drops it.

**Fix.** Infantry range 12 → 16. At 14.4 lu spacing, the third infantry in line then reaches the enemy (edge distance 14.4). Tuskbacks still win against it with about 40% HP left.

### 12. A flat pop count per unit rewards expensive units once an army is capped
**Problem.** Gold per pop: Legendary 117, Support 110, AA 100, Epic 100, Heavy 75, Ranged 75, Infantry 50. When a side is winning and hits the cap, cheap units are the worst choice.

**Fix.** Count pop in 25-gold units: Infantry 2, Ranged 3, AA 4, Support 4, Heavy 6, Epic 8, Legendary 14. Cap 60 (about 1,500 g). A normal army today (2 Heavies + 16 Ranged) comes to exactly 60.

### 13. Banking XP enables a "leapfrog" strategy
**Problem.** XP has no cap. A player can stay an age behind, collect the +50% underdog bonus on every kill, then evolve twice in a row.

**Fix.**
- XP caps at 1.5× the current threshold.
- The underdog bonus is off while your Evolve button is available.

### 14. Battering Ram is too strong against bases
**Problem.** At L4 with 1,150 HP, it survives 17 s against Crossbow Nest plus Pitch Cauldron (the Trebuchet's minimum range can't reach the gate). In that time it deals ~1,560 damage (77% of a Medieval base) and earns ~925 XP.

**Fix.** Damage against bases 160 → 110, HP 1,000 → 900. That comes to about 42% of the base per trip.

### 15. Epic turrets are worse than Common ones per gold
**Problem.** Each costs 300 g:

| Turret | Damage |
|---|---|
| Grumpy Toad | 6.7 DPS |
| Gravity Well | 8.6 DPS |
| Honk Ballista | 26-39 DPS |

Crossbow Nest does 26.7 DPS for 150 g. With a 2-slot turret deck, these will almost never be picked.

**Fix.**
- Honk Ballista: 70 damage every 3.0 s.
- Grumpy Toad: 60 damage every 5 s.
- Every Epic turret: 250 g.

### 16. The hold line at 420 gets almost no turret cover
**Problem.** Only turrets with 480 range can reach a melee fight at the line, and enemy ranged units shoot from 620-700, outside every turret.

**Fix.** Hold line 420 → 320.

### 17. Evolve timing depends heavily on strategy
**Problem.** With current numbers, the model matches the document's timings only for a full-Treasury player: 0:57 / 2:19 / 3:44 / 5:14. A no-Treasury player reaches Future at 6:09.

**Fix.** A2.14's "±15 s" evolve target needs to be measured per strategy. Re-verify after the fixes in items 3 and 5 change the XP flow.

## P3: the balance sim can't give trustworthy verdicts yet

### 18. The sim targets are too noisy or badly defined
**Problem.**
- **Too few matches.** "±3 points at 400 matches" has a standard error of 2.5 points. About 23% of fair cards would fail by chance, roughly 12 of 55 cards.
- **The turret target is meaningless.** Turrets can't die, so "turret damage per gold over 90 s ≤ 1.3× a unit" fails whenever turrets are firing more than ~30% of the time.

**Fix.**
- Use at least 1,600 mirrored-seed matches per card (standard error ≤ 1.25).
- Replace the turret metric with two targets: turrets make 20-35% of all kills in balanced bot-vs-bot, and a 4-turret plan wins 35-45% against a tier VII bot.
- Gate the bots' attack clock on army value: push only at ≥ 1.3× the estimated defence, counting each turret as the cost of 2 same-age units. Without this, turtles just farm the bots.

### 19. Add scripted exploit strategies to B12
Each of these must win ≤ 55% against the tier VII balanced bot:

1. Treasury 3 greed.
2. 4-turret turtle with Hold.
3. Cheapest-unit spam.
4. Heavy + mass Ranged at the pop cap.
5. Mass splash (Grenadier, Bronze Cannon, Radio Operator).
6. Heal stacking.
7. XP bank and double evolve.
8. Saving the power for evolve moments.
9. A sandbagged deck.
