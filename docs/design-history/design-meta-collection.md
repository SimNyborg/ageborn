# Ageborn: v1 design proposal (collector and deck-builder first)

This proposal builds v1 around the Clash Royale-style meta: a separate deck for each age, a real collection with rarities, Time Capsule openings with honest odds and pity, bounded upgrades, skins and a trophy road. None of it costs money. The battle is designed so that picking 4 of 8 warriors per age changes how a match plays. Every number below is a starting value. A headless bot-vs-bot harness tunes them against the targets in section 9.

Design pillars:
1. **Cards are side-grades.** Collecting gives you options. Levels are capped at 10 and normalized in ranked, so a bigger collection never buys a win.
2. **The reveal is the reward.** Every capsule is a short show with the odds and pity counters visible.
3. **Decks per age give each player an identity.** A War Deck is 5 age loadouts of 7 picks each.
4. **Free forever.** There is no store, no real money, no timers, no energy and no keys.

---

## 1. Title

**Working title: Ageborn.** It is short and ownable, and "Age" signals the genre without borrowing anything. Quick web, Steam and Google Play checks came back clear.

Alternatives:
1. **Mammoths to Mechs.** It describes the whole arc and works as a clip hook. Our first Legendary (Mammoth Warband) and last (Aurora Titan) make the title literal.
2. **Timeline Titans.** This fits the collector angle best (collect titans across eras), with only partial matches found.
3. **Aeonfront.** It sounds premium and came back clear on Steam and Google Play.

Before committing, run TMview (EUIPO/USPTO) and domain checks. Do not use "Age of War" anywhere, including tags and store keywords.

The cases are called **Time Capsules** whichever title wins.

---

## 2. Core battle design

### 2.1 Lane and camera
- The lane is 1,800 units long. Each base footprint is 150 units, which leaves a 1,500-unit battle zone.
- Units walk 38 to 130 units/s (typical 70-80), so a normal unit crosses the zone in about 19 s. That is faster than Age of War's 23 s and answers the "too slow" complaint.
- The camera shows about 1,100 units at default zoom. It follows your front line with gentle lerp, you can drag to pan, pinch or scroll to zoom out and fit the whole lane, and a minimap strip at the top shows every unit as a team-colored tick.
- Sub-lanes: units get a ±6 px visual y-offset in 3 rows and are sorted by y so stacks stay readable. The offset is visual only. The sim is 1D.
- Body widths: small 20, medium 30, large 60, legendary 90. Up to 2 melee units can engage one enemy at a time (limited clumping). Ranged units fire over allies.

### 2.2 Bases
- Base HP is 1,600 in Age 1. Each evolution adds 400 to both max and current HP, so an Age 5 base has 3,200.
- The base has no attack of its own apart from Last Stand (see 2.9).
- Visual damage states at 66% and 33%, plus a morph on each evolution.

### 2.3 Economy (gold)

| Parameter | Value |
|---|---|
| Starting gold | 175 |
| Passive income | 7 g/s, +1 g/s per full minute elapsed, capped at 12 g/s at 5:00. Tied to the match clock, not your age, so evolving first does not also raise your income. |
| Treasury upgrade (in-battle economy choice) | 3 levels costing 120 / 200 / 300 gold, each +2 g/s. Payback is 60 / 100 / 150 s, so it is a real greed-versus-safety choice. |
| Kill bounty | 0.5 x the victim's cost |
| Home-zone bounty | 70% for kills inside the 400 units in front of your own base. This stops AFK turret farming. |
| Underdog bounty | +50% gold and XP for killing a unit from a higher age than yours |
| Base damage pay | 0.2 gold per point of base HP damage |
| Overdrive (6:00) | Passive income x1.5 |

### 2.4 XP and ages

| Parameter | Value |
|---|---|
| Kill XP | 1.0 x the victim's cost (underdog +50%) |
| Defense XP | 0.35 x the cost of each of your own units that dies |
| Passive XP | 6 XP/s. Nobody can be frozen in an age: passive XP alone reaches Age 2 in about 2:15. |
| Base damage XP | 0.5 XP per point of base HP damage |
| XP to evolve | 800 (to Age 2), 1,200 (Age 3), 1,600 (Age 4), 2,000 (Age 5). Overflow carries over. |
| Evolve action | Manual button with a steady glow, never flashing. Evolving takes 2 s: your spawns are locked and your turrets pause (refit). The base gains +400 HP and morphs. Units already on the field stay. Your hand swaps to the new age's loadout. |
| Age power | Unit and turret HP and damage scale x1.2 per age (1.00 / 1.20 / 1.44 / 1.73 / 2.07). Costs stay flat across ages (AoW2 model), which removes the "stay in the Stone Age" exploit. One age ahead is about +44% HP x DPS: a real edge, not an automatic win. |
| Race visibility | Both XP bars sit at the top of the HUD, so evolving is a visible race. |

v1 has five ages, all our own design:

| # | Age | Palette | Fantasy |
|---|---|---|---|
| 1 | Primal | ochre, moss, bone | cavemen, sabertooths, mammoths |
| 2 | Bronze | bronze, terracotta, lapis | phalanxes, chariots, temple priests |
| 3 | Iron Crown | steel, heraldic red, oak | castles, crossbows, trebuchets, a hero knight |
| 4 | Powder & Steam | brass, navy, soot | muskets, mortars, balloons, a steam tank |
| 5 | Neon Frontier | graphite, cyan, magenta | volt blades, railguns, gunships, a titan mech |

A sixth age ("Atomic", modern tanks) is planned for v1.x. It slots in as data between Powder & Steam and Neon Frontier.

### 2.5 Expected match timeline (5-age format)

| Time | Event |
|---|---|
| 0:00 | 175 gold, 7 g/s |
| ~0:15-0:20 | First clash near midlane |
| 0:45 | First special charged |
| ~1:00 | Age 2 (onboarding target: first evolution inside 2-3 minutes) |
| ~2:05 | Age 3 |
| ~3:20 | Age 4 |
| ~4:45 | Age 5 |
| 6:00 | Overdrive |
| 7:30 | Siege Fall |
| 9:00 | Hard end |

**Target:** median match 6:00-7:00. The 90th percentile ends before 8:30, and fewer than 3% of matches reach the hard end.

### 2.6 Match formats (data-driven)

| Format | Ages | Overdrive | Siege Fall | Hard end | Used in |
|---|---|---|---|---|---|
| Tutorial | 1-2 | none | none | no timer | First match |
| Skirmish-3 | 1-3 | 3:30 | 4:30 | 6:00 | Arena 1 |
| Skirmish-4 | 1-4 | 4:45 | 6:00 | 7:30 | Arena 2 |
| Full War | 1-5 | 6:00 | 7:30 | 9:00 | Arena 3+ |

### 2.7 Unit roles, damage types and counters

Units carry an armor tag (Light, Armored or Air), a damage type, and an anti-air flag.

| Damage type vs | Light | Armored | Air (needs AA) | Structure (base) |
|---|---|---|---|---|
| Normal | 100% | 70% | 100% | 100% |
| Pierce | 80% | 160% | 100% | 60% |
| Blast (splash) | 125% | 80% | only if AA | 100% |
| Siege | 60% | 90% | no | 200% |

| Role | Job | Beats | Loses to |
|---|---|---|---|
| Brawler (cheap melee) | Body count and cheap pressure | Lone Breakers, Strikers, unescorted Shooters | Blast (artillery, splash turrets) |
| Shooter (ranged, AA) | Damage from behind the line; the default anti-air | Air, Strikers they can see coming | Artillery, Strikers that reach them |
| Guardian (Armored melee) | Holds the line so ranged units live | Brawler swarms | Breakers, Pierce |
| Breaker (Pierce, melee or ranged) | Anti-armor | Guardians, Legendaries, Mechs | Brawler numbers, Strikers |
| Artillery (range 440-500, min range) | Out-ranges every turret (max turret range is 440). This is the anti-turtle tool. | Turtles, clumps | Strikers, Air, Sappers |
| Striker (fast, leaps or blinks) | Dives the back line | Shooters, Artillery, Support | Brawlers, turrets |
| Support (heal or buff) | Force multiplier | Attrition fights | Blast, Strikers |
| Flyer (Air, Ages 4-5) | Ignores melee | Melee-heavy loadouts | Shooters, AA turrets, Railgunner |
| Legendary (unique heavy) | Signature body with an ability | Anything without Pierce | Breakers, focused Pierce |

Because each age loadout holds only 4 of that age's 8 units, no loadout covers everything. That limit is what makes deck choices matter.

### 2.8 Turrets and slots
- 4 slots on the base. Slot 1 is free. Slots 2, 3 and 4 cost 150, 350 and 700 gold, roughly 1 : 2.3 : 4.7.
- Building takes 2 s. Selling refunds 50%. Turrets cannot be damaged, cannot hit the enemy base, and their range is measured from your base front, with a maximum of 440 (about 29% of the battle zone).
- Turrets built in earlier ages keep firing at their original age's stats. To refit, sell the old turret and build a new one.
- During Siege Fall, turret damage drops by 50%.
- The turret menu offers the 2 turret cards in your current age loadout.

### 2.9 Comeback and anti-stalemate mechanics
1. **Defense XP:** you earn 0.35 x the cost of every unit you lose.
2. **Underdog bounty:** +50% gold and XP for killing a unit from a higher age.
3. **Age-up heal:** +400 base HP on each evolution.
4. **Special charge from damage:** every 1% of base max HP you lose adds 1% special charge.
5. **Last Stand** (once per match, when your base drops below 30%): a horn gives a 1.0 s telegraph, then the base fires a volley. Every enemy within 450 takes 25% of its max HP (Legendaries 12%) and 80 knockback. The counterplay is to hold back until it fires.
6. **Cooldown carry-over cap:** on evolve, special charge carries over but is capped at 60%, so a leader cannot chain specials.
7. **Artillery out-ranges turrets**, so turtling always has an answer.
8. **Supply cap of 16 per side.** Brawler, Shooter, Breaker, Striker and Support cost 1. Guardian, Artillery, Flyer and Chariot cost 2. Sir Aldric costs 3. Other Legendaries cost 4. This prevents the "meat wall" of hundreds of units.
9. **Match clock:** Overdrive (income x1.5, specials charge 2x faster, louder music layer), then Siege Fall (turrets -50%, both bases lose 1% of max HP per second), then the hard end. At the hard end, the higher base HP percentage wins and an exact tie is a draw.
10. **No hidden rubber-banding.** Bots get none of the above except what the player also gets.

### 2.10 Win conditions
- Destroy the enemy base.
- At the hard end, the higher base HP percentage wins.
- Surrender becomes available after 1:00 and counts as a loss.

### 2.11 Player controls

| Control | How it works |
|---|---|
| Deploy | Tap one of the 4 unit cards. The unit exits your gate after a 0.4 s gate animation, which also hides later netcode input delay. Limits: gold, per-card cooldown, supply cap. There is no training queue. |
| Turrets | Tap a slot to build one of your 2 age turrets, buy the slot, or sell. |
| Evolve | Button with an XP ring. |
| Special | Tap the button, then tap the lane. The target shows a 1.0 s telegraph to both players. It cannot be centered within 250 of the enemy base. |
| Stance (3-way toggle) | Charge (default). Hold (units stop at a rally flag you drag between your base and midlane). Fall Back (units retreat into turret cover and take -15% damage within 300 of your base). |
| Treasury | Upgrade button. |
| Pause, speed | Pause, and 1x/2x speed. Allowed in every v1 mode because all v1 opponents are AI. Both will be disabled in future PvP. |
| Emotes | 4 slots, cosmetic only. No text chat. |
| Keyboard | 1-4 deploy, Q/W/A/S turret slots, E evolve, R special, Tab stance, Space pause. No Esc binding, AZERTY-safe. |

---

## 3. Deck system: War Deck and Age Loadouts

### 3.1 Rules
- A **War Deck** holds one **Age Loadout** for each age the current arena format uses (3, 4 or 5).
- A loadout is exactly **4 units, 2 turrets and 1 special**, all from that age, all owned, with no duplicates.
- Empty slots are allowed only while you own fewer cards of that age than the loadout needs (new players).
- At most 2 Legendary cards per loadout (a Legendary unit plus a Legendary turret). Each age has only one Legendary unit.
- 3 War Deck slots that you can name and copy, plus an **Auto-fill** button. Auto-fill picks the highest levels while covering frontline, ranged, anti-armor and (in Ages 4-5) anti-air.
- The deck builder shows each loadout's average cost and average level, plus the War Deck level (the mean level of all cards in the loadouts the current format uses).
- **Deck advisor warnings** (never blockers): "Age 4 has no anti-air", "Age 2 has no frontline", "No anti-armor in Age 5", "No artillery anywhere: turrets will stall you".
- Skins are chosen per card in the deck builder and are visual only.

### 3.2 How loadouts work in battle
1. You start in Age 1 with your Age 1 loadout: 4 unit cards, the turret menu showing your 2 Age 1 turrets, and your Age 1 special.
2. When you evolve, the 4 cards flip over to the new age's units with a short card-flip animation, and the turret menu and special swap too. Your army on the field and your built turrets stay.
3. Scouting: opponent cards appear in a "Scouted" strip the first time the opponent plays them. Nobody sees the full enemy loadout in advance, so reading what the opponent brought is a skill.
4. There is no draw or cycling. All 4 cards are always available, gated by gold, cooldown and supply. The meaningful decisions happen when you build the deck, and in battle they are about timing.

### 3.3 Archetypes the rules support

| Archetype | Plan |
|---|---|
| Rush | Brawlers plus a Striker plus War Drummer. Skips Treasury and pressures before the first evolution. |
| Turtle-Siege | Early turrets and Guardians, with artillery to break the other side's turtle. |
| Air Raid | Balloon Bomber and Hover Gunship in Ages 4-5, with Strikers early. |
| Legendary Hammer | Saves gold for a Legendary each age, supported by healers. |
| Eco-Evolver | Treasury 3, evolves as fast as possible, weak before minute 2. |

### 3.4 Unlock
- Each arena where a new age first appears grants an **Age Unlock Capsule** with that age's 3 common units, common turret, common special, one Rare unit and one Rare turret. Age 1 and Age 2 come from the tutorial.
- Fully unlocked, the starter set is 35 of 70 cards: all 25 Commons and 10 Rares.
- The chase is the other 10 Rares, 18 Epics, 7 Legendaries, 33 skins, star levels and max levels.

---

## 4. Full v1 content

**Totals:** 40 units, 20 turrets, 10 specials, 70 cards in all: 25 Common, 20 Rare, 18 Epic, 7 Legendary. There are also 33 skins and profile cosmetics.

**Reading the tables:**
- Stats are final values for that age at card level 1. Levels add +6% HP and damage per level (section 5).
- "Sup" is supply. "CD" is the per-card deploy cooldown. DPS is before type multipliers.
- Bounty is the gold / XP the killer earns: 0.5 x cost in gold and 1.0 x cost in XP.
- Range is in lane units. "Melee" means about 20.

### Age 1: Primal (x1.00)

| Unit | Rar | Role | Tags | Cost | Sup | CD s | HP | Dmg / interval (DPS) | Range | Speed | Bounty g / XP | Ability |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bonebasher | C | Brawler | Light | 50 | 1 | 1.5 | 120 | 15 Nrm / 1s (15) | melee | 80 | 25 / 50 | None. Cheapest body in the game. |
| Pebble Pitcher | C | Shooter | Light, AA | 75 | 1 | 2.5 | 75 | 11 Nrm / 1s (11) | 160 | 72 | 38 / 75 | Hits air. |
| Hide Warden | C | Guardian | Armored | 125 | 2 | 5 | 440 | 16 Nrm / 1.4s (11) | melee | 55 | 63 / 125 | Hide Shield: -25% damage from projectiles. |
| Tusk Lancer | R | Breaker | Light | 100 | 1 | 3.5 | 170 | 26 Prc / 1.3s (20) | 30 | 68 | 50 / 100 | Reach 30: can strike past a dying ally. |
| Boulder Brute | R | Artillery | Light | 150 | 2 | 8 | 130 | 40 Bls / 3.4s (12) | 440 | 50 | 75 / 150 | Splash r40, min range 100. |
| Sabre Pouncer | E | Striker | Light | 90 | 1 | 4 | 110 | 20 Nrm / 0.8s (25) | melee | 120 | 45 / 90 | Pounce (once per life): leaps up to 220 over the front line onto the nearest ranged, support or artillery unit. First bite x2. |
| Ember Shaman | E | Support | Light, AA | 110 | 1 | 6 | 95 | 6 Nrm / 1.5s (4) | 130 | 68 | 55 / 110 | Heals the most injured ally within 150 for 12 HP/s (age-scaled). |
| Mammoth Warband | L | Legendary | Armored | 300 | 4 | 25 | 1400 | 40 Bls / 1.6s (25) | melee | 45 | 150 / 300 | Tusk sweep splash r40. Two sling riders (8 dmg / 1.2 s, range 150, hit air). Trample every 8 s: charges 80 forward, dealing 60 damage and 70 knockback to everything in its path. |

### Age 2: Bronze (x1.20)

| Unit | Rar | Role | Tags | Cost | Sup | CD s | HP | Dmg / interval (DPS) | Range | Speed | Bounty g / XP | Ability |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bronzeblade | C | Brawler | Light | 50 | 1 | 1.5 | 158 | 17 Nrm / 1s (17) | melee | 80 | 25 / 50 | None. |
| Reed Archer | C | Shooter | Light, AA | 75 | 1 | 2.5 | 84 | 16 Nrm / 1.2s (13) | 190 | 72 | 38 / 75 | Hits air. Longest common range. |
| Phalanx Wall | C | Guardian | Armored | 125 | 2 | 5 | 528 | 19 Nrm / 1.4s (14) | melee | 55 | 63 / 125 | Braced: immune to knockback. |
| Chariot Raider | R | Striker | Light | 110 | 2 | 4 | 192 | 29 Nrm / 1s (29) | melee | 130 | 55 / 110 | Charge: first hit x2.5 plus 60 knockback. Does not leap. |
| Bolt Crew | R | Artillery | Light | 150 | 2 | 8 | 132 | 54 Prc / 2.8s (19) | 460 | 50 | 75 / 150 | Bolt pierces up to 3 targets in a line. No splash, hits Armored hard. |
| Sun Priestess | E | Support | Light, AA | 110 | 1 | 6 | 114 | 7 Nrm / 1.5s (5) | 130 | 68 | 55 / 110 | Heals 14 HP/s (age-scaled) and gives allies within 120 +10% damage. |
| Labrys Champion | E | Breaker | Light | 100 | 1 | 3.5 | 240 | 36 Prc / 1.2s (30) | melee | 68 | 50 / 100 | Sunder: each hit gives the target -10% armor for 5 s, stacking 3 times. |
| Bronze Colossus | L | Legendary | Armored | 300 | 4 | 25 | 1500 | 60 Bls / 2s (30) | melee | 40 | 150 / 300 | Ground slam splash r50. Molten Core: under 50% HP it burns enemies within 60 for 20 DPS. Shatters on death for 150 damage in r80. |

### Age 3: Iron Crown (x1.44)

| Unit | Rar | Role | Tags | Cost | Sup | CD s | HP | Dmg / interval (DPS) | Range | Speed | Bounty g / XP | Ability |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Levy Swordsman | C | Brawler | Light | 50 | 1 | 1.5 | 173 | 22 Nrm / 1s (22) | melee | 80 | 25 / 50 | None. |
| Crossbowman | C | Shooter | Light, AA | 75 | 1 | 2.5 | 115 | 29 Prc / 1.8s (16) | 180 | 72 | 38 / 75 | Pierce bolts. Hits air. |
| Pavise Guard | C | Guardian | Armored | 125 | 2 | 5 | 665 | 23 Nrm / 1.4s (16) | melee | 55 | 63 / 125 | Pavise: -35% damage from projectiles. |
| Halberdier | R | Breaker | Light | 100 | 1 | 3.5 | 245 | 37 Prc / 1.3s (28) | 35 | 68 | 50 / 100 | Hook: every 4th hit knocks the target back 40. |
| Trebuchet Team | R | Artillery | Light | 150 | 2 | 8 | 137 | 86 Sge / 4.5s (19) | 500 | 50 | 75 / 150 | Siege: x2 vs structures. Splash r50, min range 150. |
| War Drummer | E | Support | Light, AA | 110 | 1 | 6 | 137 | 9 Nrm / 1.5s (6) | 130 | 68 | 55 / 110 | No heal. Allies within 150 get +20% attack speed and +10% move speed. |
| Shadow Duelist | E | Striker | Light | 90 | 1 | 4 | 144 | 32 Nrm / 0.8s (40) | melee | 115 | 45 / 90 | Shadowstep (once per life): teleports behind the enemy front line to the nearest ranged unit, then is untargetable for 1 s. |
| Sir Aldric the Unbroken | L | Legendary | Armored | 280 | 3 | 25 | 1080 | 43 Nrm / 1s (43) | melee | 72 | 140 / 280 | Cleave hits 2 targets. Allies within 150 deal +15% damage. Unbroken: the first time he drops to 0 HP he kneels for 1.5 s (untargetable) and rises with 40% HP. |

### Age 4: Powder & Steam (x1.73)

| Unit | Rar | Role | Tags | Cost | Sup | CD s | HP | Dmg / interval (DPS) | Range | Speed | Bounty g / XP | Ability |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bayonet Private | C | Brawler | Light | 50 | 1 | 1.5 | 207 | 26 Nrm / 1s (26) | melee | 80 | 25 / 50 | None. |
| Line Fusilier | C | Shooter | Light, AA | 75 | 1 | 2.5 | 138 | 36 Nrm / 1.8s (20) | 200 | 72 | 38 / 75 | Hits air. Slow, heavy volleys. |
| Steam Bulwark | C | Guardian | Armored | 125 | 2 | 5 | 795 | 28 Nrm / 1.4s (20) | melee | 55 | 63 / 125 | Boiler plate: immune to knockback. |
| Harpoon Gunner | R | Breaker | Light, AA | 100 | 1 | 3.5 | 242 | 45 Prc / 1.8s (25) | 140 | 68 | 50 / 100 | Ranged Pierce. Reel: first hit drags the target 60 toward your line. Hits air. |
| Field Mortar | R | Artillery | Light | 150 | 2 | 8 | 164 | 76 Bls / 3.6s (21) | 480 | 50 | 75 / 150 | Splash r55, min range 120. |
| Balloon Bomber | E | Flyer | Air | 150 | 2 | 7 | 328 | 52 Bls / 2s (26) | under | 62 | 75 / 150 | Only anti-air can hit it. Bombs the ground below, splash r35. |
| Powder Sapper | E | Striker (sapper) | Light | 120 | 1 | 4 | 225 | see ability | n/a | 125 | 60 / 120 | Trench run: passes through enemy units; ranged units and turrets can still hit it. At the enemy base it detonates for 200 damage to the base. If it dies elsewhere: 60 Blast r50. |
| Ironclad Crawler | L | Legendary | Armored, Mech | 320 | 4 | 25 | 2074 | 95 Bls / 2.4s (40) | 260 | 38 | 160 / 320 | Cannon splash r50. Immune to knockback. Boiler burst on death: 100 damage in r90. |

### Age 5: Neon Frontier (x2.07)

| Unit | Rar | Role | Tags | Cost | Sup | CD s | HP | Dmg / interval (DPS) | Range | Speed | Bounty g / XP | Ability |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Volt Trooper | C | Brawler | Light | 50 | 1 | 1.5 | 249 | 31 Nrm / 1s (31) | melee | 80 | 25 / 50 | Arc Blade: every 3rd hit chains 50% damage to one nearby enemy. |
| Pulse Ranger | C | Shooter | Light, AA | 75 | 1 | 2.5 | 156 | 27 Nrm / 1.2s (23) | 170 | 72 | 38 / 75 | Hits air. 3-round burst. |
| Aegis Frame | C | Guardian | Armored | 125 | 2 | 5 | 867 | 33 Nrm / 1.4s (24) | melee | 55 | 63 / 125 | Hardlight: absorbs the first 150 (age-scaled) projectile damage. Recharges after 8 s without being hit. |
| Railgunner | R | Breaker | Light, AA | 100 | 1 | 3.5 | 249 | 79 Prc / 2.6s (30) | 260 | 68 | 50 / 100 | Ranged Pierce. The round passes through 2 targets. Hits air. |
| Grav Mortar | R | Artillery | Light | 150 | 2 | 8 | 197 | 75 Bls / 3.2s (23) | 480 | 50 | 75 / 150 | Splash r60 and 30% slow for 2 s. |
| Phase Stalker | E | Striker | Light | 90 | 1 | 4 | 218 | 41 Nrm / 0.8s (51) | melee | 115 | 45 / 90 | Blink (every 10 s): teleports 180 forward past blockers to hit a ranged unit. |
| Hover Gunship | E | Flyer | Air, AA | 170 | 2 | 7 | 394 | 17 Nrm / 0.5s (34) | 120 | 62 | 85 / 170 | Strafes ground and air targets within 120. |
| Aurora Titan | L | Legendary | Armored, Mech, AA | 340 | 4 | 25 | 2281 | 37 Nrm / 0.5s (74) | 220 | 40 | 170 / 340 | Twin plasma (hits air). Aegis Dome every 14 s: a 4 s dome, r120, that blocks enemy projectiles aimed at allies inside. |

**Balance intent:**
- Legendaries are big bodies with a signature ability. Pierce answers every one of them. Tusk Lancer deals 32 DPS to Armored targets, so three Lancers (300 gold) roughly trade with a Mammoth.
- The Legendary edge a new player feels comes from its starting level (L6, +30%). In Ranked Standard all cards sit at L7, so that edge disappears there.
- Ranged units deal about 70% of the DPS of their melee counterparts to pay for safety.
- Every artillery unit (440-500) out-ranges every turret (440 max).

### Turrets (4 per age)

Template costs are the same in every age: Rapid 140, Heavy 220, Splash 240, Epic 300, Legendary 350.

| Age | Turret | Rar | Cost | Dmg / interval (DPS) | Type | Range | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Sling Post | C | 140 | 6 / 0.45s (13) | Nrm | 320 | Hits air. |
| 1 | Thornspitter | R | 220 | 40 / 2s (20) | Prc | 420 | Ground only. |
| 1 | Hive Hurler | R | 240 | 30 / 2.4s (13) | Bls | 380 | Splash r45. Honey slows 20% for 2 s. Ground only. Our humor signature turret. |
| 1 | Bone Totem | E | 300 | 8 / 1s (8) | Nrm | 300 | Curse: enemies within 300 take +15% damage from all sources. Hits air. |
| 2 | Arrow Loft | C | 140 | 7 / 0.45s (16) | Nrm | 360 | Hits air. |
| 2 | Bronze Ballista | R | 220 | 48 / 2s (24) | Prc | 420 | Ground only. |
| 2 | Fire Pot Sling | R | 240 | 36 / 2.4s (15) | Bls | 380 | Splash r45 plus burn 5 DPS (age-scaled) for 3 s. Ground only. |
| 2 | Sun Mirror | E | 300 | 6 / 0.5s (12) | Nrm | 360 | Beam. Damage on the same target ramps up to x3 over 2 s. Hits air. |
| 3 | Crossbow Nest | C | 140 | 10 / 0.5s (20) | Nrm | 340 | Hits air. |
| 3 | Spring Bolt | R | 220 | 58 / 2s (29) | Prc | 420 | Bolt pierces 2 targets in a line. Ground only. |
| 3 | Mangonel | R | 240 | 49 / 2.8s (18) | Bls | 380 | Splash r55. Ground only. |
| 3 | Dragon Maw | L | 350 | 29 / 0.5s (58 in bursts) | Bls | 220 | Flame cone to 220: 3 s bursts every 6 s that hit everything in the cone, burn 3 s. Ground only. |
| 4 | Gatling Crank | C | 140 | 7 / 0.3s (23) | Nrm | 340 | Hits air. |
| 4 | Carronade | R | 220 | 83 / 2.4s (35) | Prc | 400 | Ground only. |
| 4 | Mortar Nest | R | 240 | 52 / 2.4s (22) | Bls | 420 | Splash r45, min range 100. Ground only. |
| 4 | Arc Coil | E | 300 | 38 / 1.5s (25) | Nrm | 320 | Chain lightning to 4 targets, -20% per jump. Hits air. |
| 5 | Pulse Turret | C | 140 | 12 / 0.45s (27) | Nrm | 340 | Hits air. |
| 5 | Rail Lance | R | 220 | 83 / 2s (42) | Prc | 440 | Pierces 3 targets in a line. Ground only. |
| 5 | Plasma Mortar | R | 240 | 62 / 2.4s (26) | Bls | 380 | Splash r55. Ground only. |
| 5 | Chrono Spire | L | 350 | 10 / 0.5s (20) | Nrm | 380 | Time field: enemies within 380 move and attack 35% slower. Hits air. |

### Specials (2 per age)

Rules for every special:
- 45 s charge, 1.0 s telegraph visible to both players.
- Cannot be centered within 250 of the enemy base, and never damages bases or turrets.
- Legendary units take 50% special damage.
- Special damage scales with card level.

| Age | Special | Rar | Effect (final numbers) |
|---|---|---|---|
| 1 | Rockslide | C | 12 boulders over 2.5 s in a 400-wide zone. 45 Blast each, splash r35. |
| 1 | Stampede | E | 5 aurochs charge 800 forward from your front unit. 60 damage and 70 knockback per aurochs, max 2 hits per enemy. |
| 2 | Spear Storm | C | 28 spears over 2 s, 400 wide. 26 Pierce each. |
| 2 | Blessing of the Sun | E | All allies heal 40% of max HP over 5 s and deal +20% damage for 8 s. |
| 3 | Fire Barrage | C | 8 fireballs over 2 s. 72 Blast r50 each plus burn 7 DPS for 3 s. |
| 3 | Call the Levy | E | 4 Levy Swordsmen appear at your gate (no supply, 25 s lifetime). All allies get +25% move speed for 6 s. |
| 4 | Cannonade | C | 10 shells over 2.5 s. 86 Blast r55 each. |
| 4 | Smoke and Steel | E | 400-wide smoke for 8 s. Enemy projectiles fired into or out of it (turret shots included) miss 50%. Your units inside take -30% damage. |
| 5 | Orbital Lance | C | A beam sweeps 600 units over 2 s, dealing 250 to each enemy it crosses. |
| 5 | EMP Nova | E | 500-wide pulse: 100 damage, 2.5 s stun (Legendaries 1.25 s), strips shields and buffs. |

### Skins (33 at launch)

All skins are visual only. **Clarity parity:** a skin keeps the unit's silhouette, size, weapon read, facing and team markers. Mythic exists only as a cosmetic tier.

| Skin | For | Rarity | Look |
|---|---|---|---|
| Snowhide | Bonebasher | R | Ice-age furs, frosted club |
| Fruit Flinger | Pebble Pitcher | E | Throws melons; fruit-splat hit effect |
| Tortoise Warden | Hide Warden | R | Giant shell shield |
| Midnight Sabre | Sabre Pouncer | E | Black fur, glowing eyes, violet leap trail |
| Festival Mammoth | Mammoth Warband | L | Lantern hut, drummer riders, confetti trample |
| Fossil Mammoth | Mammoth Warband | M | Skeletal mammoth with amber glow |
| Obsidian Blade | Bronzeblade | R | Black glass sword and trim |
| Painted Phalanx | Phalanx Wall | R | Hand-painted shields |
| Golden Chariot | Chariot Raider | E | Gilded chariot, sun-disc wheels |
| Verdigris Colossus | Bronze Colossus | E | Green patina, moss |
| Sunforged Colossus | Bronze Colossus | L | Gold body with sun halo; slam leaves a sun glyph |
| Jester Swordsman | Levy Swordsman | E | Motley outfit, bell-jingle hits |
| Greenwood Crossbowman | Crossbowman | R | Forest hood and cloak |
| Knight of Thorns | Sir Aldric | E | Rose armor, petal burst on revive |
| Black Aldric | Sir Aldric | L | Blackened plate, ember revive |
| Winter Private | Bayonet Private | R | Greatcoat, fur hat |
| Parade Fusilier | Line Fusilier | R | Parade dress, white plume |
| Patchwork Balloon | Balloon Bomber | E | Quilted balloon, basket of junk bombs |
| Brass Beetle | Ironclad Crawler | L | Beetle-shell plating, antenna periscopes |
| Circus Crawler | Ironclad Crawler | M | Circus wagon on treads; cannon puffs confetti smoke (same hitbox) |
| Glitch Trooper | Volt Trooper | E | Pixel-glitch shader flicker |
| Chrome Ranger | Pulse Ranger | R | Mirror-chrome armor |
| Solar Flare Titan | Aurora Titan | L | White-gold plating, corona dome |
| Tin Toy Titan | Aurora Titan | M | Wind-up tin robot, turning key |
| Scarecrow Post | Sling Post | R | Scarecrow slinger |
| Honey Palace | Hive Hurler | E | Ornate honeycomb tower |
| Music Box Crank | Gatling Crank | E | Plays a melody note per shot |
| Hourglass Spire | Chrono Spire | L | Giant hourglass with falling sand |
| Frostfang Camp | Age 1 base | E | Snowbound camp, ice palisade |
| Temple of Tides | Age 2 base | L | Sea temple with waterfalls |
| Wyvern Keep | Age 3 base | E | Castle with a sleeping stone wyvern |
| Clocktower Works | Age 4 base | L | Factory clocktower, gear-driven turret mounts |
| Orbital Ring | Age 5 base | M | Floating ring citadel |

Skin rarity split: 9 Rare, 12 Epic, 8 Legendary, 4 Mythic.

Profile cosmetics at launch:
- 20 banners
- 30 titles (for example "Mammoth Tamer", "Never Evolved", "Siege Scholar")
- 10 profile frames
- 12 emotes (Thumbs Up, Laughing Caveman, Mammoth Trumpet, GG, Oops, Crying Knight, Salute, Facepalm Robot, Dancing Mammoth, Wow, Angry Goat, Thinking)

---

## 5. Meta: profile, progression, currencies and capsules

### 5.1 Currencies (all earned in play, none purchasable, ever)

| Currency | Earned from | Spent on |
|---|---|---|
| Gold | Capsules, wins, quests, Trophy Road, Collection Level | Card upgrades |
| Card Shards (per card) | Capsules. Every copy of a card is a shard for it. | Upgrading that card |
| Wild Shards (C/R/E/L) | Gold and Prismatic capsules, Trophy Road, weekly quests | Act as shards for any card of that rarity |
| Essence | Shards received for maxed cards (C 1, R 4, E 20, L 80 per shard) and duplicate skins (R 50, E 150, L 500, M 1,500) | Crafting unowned cards, extra shards, star levels, and skins in the rotating Relic Shop (see below) |
| Trophies | Wins | Rank only; not spendable |

What Essence buys:
- Craft an unowned card: C 40, R 100, E 400, L 1,600.
- Shards for an owned card: C 8, R 25, E 100, L 400 each.
- Star levels 1/2/3 on L10 cards: 300 / 800 / 2,000.
- Skins in the rotating Relic Shop: Rare 250, Epic 700, Legendary 1,800. Mythic is never sold.

### 5.2 Card levels and upgrade curve

All rarities share one scale with max level 10, fixed at launch; the cap will never be raised. A new card arrives at its rarity's starting level: Common L1, Rare L2, Epic L4, Legendary L6.

| To level | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Common shards | 2 | 4 | 6 | 10 | 15 | 22 | 30 | 40 | 50 | 179 |
| Rare shards | - | 2 | 3 | 5 | 8 | 12 | 16 | 22 | 28 | 96 |
| Epic shards | - | - | - | 2 | 3 | 5 | 7 | 9 | 12 | 38 |
| Legendary shards | - | - | - | - | - | 1 | 2 | 3 | 4 | 10 |
| Gold | 10 | 25 | 50 | 100 | 180 | 300 | 500 | 750 | 1,100 | 3,015 |
| HP and damage | x1.06 | x1.12 | x1.18 | x1.24 | x1.30 | x1.36 | x1.42 | x1.48 | x1.54 | |

- Growth is +6% HP and damage per level, additive. Healing, ability damage and special damage scale the same way. Costs, speed, range and cooldowns never scale.
- Level 10 is +54% over level 1, far below Clash Royale's gaps.
- Upgrading is its own reward moment: the card is slammed with a hammer, the level number counts up, and a stat bar grows.

### 5.3 Time Capsules (card cases)

A Time Capsule is earned by winning. Its tier is revealed through a 4-strike climb (section 7.7). The tier comes from a **shuffle bag of 100**: exactly 50 Clay, 28 Bronze, 15 Silver, 5 Gold and 2 Prismatic, drawn without replacement and refilled when empty. The UI publishes the bag odds and the result is pre-rolled.

Contents at Arena 1. Shards scale by x(1 + 0.1 per arena above 1) and gold by x(1 + 0.15 per arena above 1).

| Tier | Card stacks | Total shards | Gold | Guarantees and extras |
|---|---|---|---|---|
| Clay | 2 | 6 | 60 | none |
| Bronze | 3 | 12 | 120 | 1 Rare stack |
| Silver | 4 | 25 | 250 | 1 Rare and 1 Epic stack; 5% skin |
| Gold | 5 | 50 | 600 | 2 Rare and 1 Epic stack; 25% Legendary; 3 Wild Rare; 15% skin |
| Prismatic | 6 | 80 | 1,200 | 1 Legendary (unowned first), 2 Epic stacks, 1 Wild Epic, 1 guaranteed Epic-or-better skin |

- Non-guaranteed stacks roll Common 70%, Rare 24%, Epic 5%, Legendary 1%.
- A Legendary stack is 1 shard, an Epic stack 1-3, a Rare stack 3-8, and Common stacks take the rest.
- Expected value per capsule at Arena 1: about 14 shards, 155 gold and 2.8 stacks. A Legendary appears in about 6% of capsules.

Other case types:

| Case | Source | Contents |
|---|---|---|
| Age Capsule | Trophy Road, weekly quests | Silver-sized, but you pick which age it draws from (a LoR-style choice) |
| Age Unlock Capsule | Reaching an arena that adds an age | That age's starter set plus one Rare unit and one Rare turret |
| Relic Crate (cosmetic) | Trophy Road, Collection Level every 5 levels, weekly quests, achievements | 1 cosmetic (skin, emote, banner or frame): Rare 70%, Epic 22%, Legendary 7%, Mythic 1% |
| Grit Capsule | 3 losses | A Clay capsule; it uses no daily charge |

### 5.4 Pity and protection (visible in the UI under the capsule stack)

| Rule | Value |
|---|---|
| Epic pity | At least 1 Epic stack every 10 capsules |
| Legendary soft pity | After 25 capsules without a Legendary, +5 percentage points per capsule |
| Legendary hard pity | Guaranteed at 40 |
| Legendary duplicate protection | Legendary stacks roll only unowned Legendaries from your unlocked pool until you own them all |
| New-card protection | At least 1 unowned card every 5 capsules while unowned cards exist in your pool |
| Relic Crate pity | Legendary-or-better within 15 crates. No duplicate skins until you own every skin of that rarity. |
| Onboarding script | Capsule 1: Tusk Lancer (new card). Capsule 2: new turret. Capsule 3: at least Silver. Capsule 5: first Epic. Capsule 10: Prismatic with Mammoth Warband, so every player's first Legendary is the mammoth and gets the full walkout. |
| Persistence | The result is rolled from a seeded stream stored in the save and written to disk before the animation starts, so reloading cannot re-roll. |

### 5.5 Rewards per match and daily flow

| Event | Reward |
|---|---|
| Win | Time Capsule (if a charge is left), 40 gold +5 per arena, +30 trophies |
| Win with no charges | 80 gold, +30 trophies |
| Loss | 15 gold, -20 trophies (0 below 300; you never drop below an arena gate), +1 Grit (3 Grit = Grit Capsule) |
| Draw | 25 gold, 0 trophies |
| Capsule charges | 5 per day, banking up to 15. Nothing expires, which keeps the design in PEGI's "rewards return" tier rather than "punishes non-return". |
| Daily quests | 3 per day with 1 free reroll. 100 gold and 5 Collection XP each. Examples: "Win 2 battles", "Deploy 30 Primal units", "Reach Age 5 before 5:00". |
| Weekly quests | 5 quests. Completing all gives a Relic Crate, an Age Capsule and 1,000 gold. |

Opening is instant: no timers, no slots, no keys, and an "Open all" button.

### 5.6 Trophy Road and arenas

| # | Arena | Trophies | Max age in match | Cards added to the drop pool | Bot tiers |
|---|---|---|---|---|---|
| 0 | Training Grounds | tutorial (3 matches) | 2, then 3 | Scripted | T0 |
| 1 | Ember Valley | 0 | 3 | All Age 1-2 cards; Age 3 Commons and Rares | T1-T2 |
| 2 | Bronze Delta | 300 | 4 | Age 3 Epics and Legendaries; Age 4 Commons and Rares | T2-T3 |
| 3 | Iron Keep | 700 | 5 | Age 4 Epics and Legendaries; Age 5 Commons and Rares | T3-T4 |
| 4 | Powder Coast | 1,100 | 5 | Age 5 Epics and Legendaries (full pool) | T4-T5 |
| 5 | Neon Rift | 1,600 | 5 | Legendary skins added to Relic Crates | T5-T6 |
| 6 | Titan's Gate | 2,100 | 5 | | T6-T7 |
| 7 | Chrono Summit | 2,700 | 5 | | T7-T8 |
| 8 | Eternal Citadel | 3,300 | 5 | | T8-T9 |
| 9 | Hall of Ages | 4,000 | 5 | | T9-T10 |
| 10 | Legend League | 4,800+ | 5 | Seasonal title (v1.x) | T10 and CHRONOS |

- Trophy Road has a reward node every 100 trophies (48 nodes). They cycle through gold, fixed-tier capsules, Wild Shards, Relic Crates, Age Capsules, emotes and titles.
- Every arena gate gives a Gold capsule and an arena banner.
- **Collection Level:** each card upgrade gives Collection XP equal to the new level. A new card gives +10, a new skin +5 and a star level +20. You level up every 30 XP. Each level pays 100 gold, every 5th level a Relic Crate, every 10th a Gold capsule and a frame.

### 5.7 Pacing (engaged player: about 10 matches and 6 wins a day)

| Metric | Estimate |
|---|---|
| Daily income | About 70 shards (about 100 by Arena 5) and about 1,500 gold |
| Common to L7 | About 1 month |
| Rare to L7 | About 6 weeks |
| Epic to L7 | About 7 weeks |
| First full set of 7 Legendaries | About 3-4 weeks |
| Full deck (35 cards) at L7 ("Standard ready") | About 5-7 weeks, faster with Wild Shards |
| Whole collection maxed | About 6-8 months. Gold (about 210k total) and shards run out at roughly the same time. |

Validate all of this with a meta simulator before tuning (section 9.8).

### 5.8 Profile
- Auto-generated name (for example "SwiftMammoth482"), editable after match 3. No account and no login.
- Avatar (a portrait of any owned unit), banner, title and frame.
- Collection Level, completion % by age and by rarity, and trophies (current and best).
- Showcase of 3 cards with their levels, stars and skins.
- Stats: wins, losses, best streak, favorite card, units deployed, Legendaries owned.
- 40 achievements, for example "Mammoths to Mechs" (field both a Mammoth Warband and an Aurora Titan in one match) and "Never Give Up" (win after your Last Stand fired).

### 5.9 Matchmaking fairness
- **v1 Trophy Road (AI Generals):** the bot's card level equals your War Deck level plus a tier offset: -1 in Arenas 1-2, -0.5 in 3-5, 0 in 6-8, and at most +0.5 in 9-10. No bot card is ever above your highest card level +1. Both deck levels are shown before the match ("Deck Lv 4.2 vs Lv 4.0").
- **Level clamp (every mode):** no card can fight more than 2 levels above the opponent's deck average. Anything above is clamped to that ceiling.
- **Ranked Standard (v1 as a Practice toggle, v1.x as a mode, later online):** every card on both sides is set to L7, up or down. Your collection decides your options, not your power.
- **Future online Trophy Road:** trophies plus a deck-level band of ±0.5. The bot label rules stay the same.

---

## 6. Bot opponents: AI Generals

### 6.1 Honesty rules
- Every bot is an **AI General** with a portrait, an "AI" chip on the name plate, "AI General" on the loading screen, and "You defeated an AI General" on the results screen.
- There is no fake search spinner and no fake online status. The Battle screen says "Next challenger: Lady Pavise (AI)".
- Bots use the exact player rules and the same command API: same gold, XP, cooldowns and supply, and only the information a player can see (the whole lane is visible to both sides anyway).
- There are no stat multipliers and no timed evolution.
- Help text states that "opponent difficulty adapts to your recent results".

### 6.2 Roster

| General | Tier | Personality | Signature plan |
|---|---|---|---|
| Grogg the Training Dummy | T0 | Scripted tutor | Barely attacks, telegraphs everything, emotes "Grogg nap" |
| Pip Pebblefoot | T1 | Swarm | Floods Brawlers and Shooters, evolves late |
| Mother Ochre | T2 | Balanced healer | Ember Shaman and Sun Priestess behind Guardians |
| Captain Tallow | T3 | Rusher | Skips Treasury, all-in before 1:30, Chariot Raiders |
| Lady Pavise | T4 | Turtle | 3 turrets early, Guardians, late Trebuchets |
| Old Oxtail | T4 | Legendary Hammer | Saves for the Legendary in every age |
| Professor Gearwhistle | T5 | Greedy Evolver | Treasury 3, races ages, fragile early |
| The Brass Baroness | T6 | Siege | Artillery plus Powder Sappers |
| Nyx-7 | T7 | Air and Strikers | Divers and flyers, punishes a missing anti-air pick |
| Warden Hollow | T8 | Counter-picker | Reads your visible army and spawns the counter |
| Queen Maru of the Delta | T9 | Macro expert | Never floats gold, times pushes around your cooldowns |
| CHRONOS Unit Zero | T10 | Adaptive boss | Switches personality by phase; the Legend League gatekeeper |
| Echo of You | Any | Mirror | Plays your own most-used War Deck with the Balanced brain at your tier |

### 6.3 Behavior
- **Utility AI:** at each decision tick the bot scores deploy (per card), build or sell a turret, evolve, cast the special, buy Treasury, change stance, and save gold. The scores come from lane pressure, counter value against the visible enemy army, affordability, and a plan (for example a push window when gold is at or above a threshold, or saving for a Legendary or an evolution).
- **Pacing director (tiers 1-6 only):** a Left 4 Dead-style build-up, 3-5 s peak and 20-30 s relax cycle shapes wave timing. It never touches stats.
- **Intelligent mistakes:** the bot computes the best move, then with probability equal to its mistake rate picks a plausible human error. Examples: over-committing into turret range, evolving just before an enemy push, spending the special on 1 unit, buying Treasury late, forgetting anti-air. No "computer-stupid" moves.
- **Human feel:** a randomized reaction delay per tier, never under 300 ms. Canned emotes that are labelled as AI (a taunt after a big special, "GG" at the end), shown sparingly. Visible intent: bots bank gold before a push, so an attentive player can read it.

| Tier | Reaction delay | Decision tick | Counter-pick accuracy | Gold float target | Special aim error | Mistake rate | Level offset |
|---|---|---|---|---|---|---|---|
| T1 | 1,400 ms | 1.5 s | 20% | 400 | ±200 | 30% | -1 |
| T3 | 1,000 ms | 1.2 s | 40% | 250 | ±140 | 20% | -1 |
| T5 | 700 ms | 0.9 s | 60% | 180 | ±90 | 12% | -0.5 |
| T7 | 500 ms | 0.7 s | 75% | 120 | ±50 | 7% | 0 |
| T10 | 300 ms | 0.5 s | 90% | 80 | ±20 | 3% | +0.5 max |

Tiers in between interpolate. There are 10 fine-grained tiers, which avoids AoW2's "easy is too easy, normal is too hard" cliff.

### 6.4 Difficulty selection
- A hidden MMR picks the next General **between** matches, never during one.
- Target win rate: 70-75% over the first 10 matches, then about 55%.
- 3 wins in a row raise the tier by 1. 2 losses in a row lower it by 1.
- Practice mode lets you pick any unlocked General at any tier, with no trophies at stake.

---

## 7. Game feel and presentation

### 7.1 Art direction: "bold toy-box cartoon", drawn in code
- Chunky shapes with a 3 px dark outline (#1B1B24 at 85%) and two-tone cel shading: a base color, a shadow 18% darker, and one highlight.
- Heads are about 30% of body height. Weapons are oversized and read at a glance: a bow means ranged, a big shield means tank.
- Unit heights: infantry 48 units, Guardians 56, Flyers 60, Legendaries 110-160.
- Age palettes: Primal #C98A3D / #6E8B3D / #EDE3C8. Bronze #B87333 / #C65D3B / #2E5AAC. Iron Crown #8A96A3 / #B3282D / #6B4A2B. Powder & Steam #C9A227 / #22345C / #3A3A3A. Neon Frontier #23262E / #29E3F5 / #F03AA8.
- **Team readability:**
  - The player is sky blue (#39A0FF), faces right, and has a blue ground ring and sash. The enemy is orange (#FF8A1F), faces left, and has an orange ring and sash.
  - A colorblind preset switches to blue/yellow and adds a pattern marker (stripe or dot) to banners.
  - Health bars appear only after a unit takes damage, in team color, with a ghost segment that drains 300 ms after the real bar.
- **Split-era battlefield:** each half of the parallax background shows its owner's current age, blended at a soft seam near midlane. When one side evolves, its half morphs. It reads instantly and makes a strong clip.
- **Bases:** one structure per age (bone-palisade cave camp, stepped temple, stone keep, brick fort with smokestacks, neon citadel), 3 damage states, 4 visible turret mounts.
- **No blood** (portal requirement). Units fall and poof into dust and coins, with cartoon knock-back.
- Rarity colors appear in the UI only, to avoid confusion with team color: Common #B8C0CC, Rare #3D8BFF, Epic #A855F7, Legendary #F5B82E, Mythic a red-to-magenta prismatic shimmer.

### 7.2 Animation list

Every unit implements the same clip contract so art tiers can be swapped:

| Clip | Spec |
|---|---|
| `spawn` | Drops out of the gate, squash pop 0 → 1.15 → 1 over 180 ms |
| `idle` | 1.2 s breathing bob |
| `walk` | 0.6 s cycle, 2 footfalls, 3 px bob, squash 0.95 on contact |
| `attack` | About 60% wind-up, impact frame (`impactAt` marker), recover |
| `hit` | 80 ms white flash plus 4 px recoil |
| `stun` | Dizzy stars |
| `die` | Knock-back tumble along the hit vector, dust poof, coin pop |
| `victory` | Cheer |

Role-specific clips:
- Shooter: aim and release.
- Artillery: crew load and fire with recoil.
- Striker: pounce arc, charge lean, shadowstep puff, blink streak.
- Support: heal channel, drum beat.
- Flyer: hover sway, bank, bomb release.
- Sapper: trench dig, fuse spark.

Legendary signature clips:
- Mammoth: trample charge, rider slings.
- Colossus: slam, molten crack glow, shatter.
- Aldric: cleave, kneel and rise.
- Crawler: cannon recoil, boiler burst.
- Titan: twin-fire, dome deploy.

Turret clips: `build` (rises from the mount), `idle` scan, `fire` recoil, `reload`, `sell` collapse, `disabled` (during the evolve refit).

Base clips: ambient idle (smoke, flags), `hit`, damage states, `evolve` morph (1.8 s), `lastStand` volley, `destroy` collapse (250 ms global hitstop plus 0.5 s slow motion).

### 7.3 VFX

Particle presets live in `feel.json`, with a budget of 600 live particles and the lowest priority dropped first.

| Group | Effects |
|---|---|
| Hits by damage type | Normal: white chips. Pierce: thin streak and glint. Blast: dust ring and debris. Siege: rubble chunks. |
| Weapons | Muzzle flashes (first frame), projectile trails with a bright core and team-tinted tail, splash shockwave rings |
| Status | Heal pluses, buff aura rings, burn flicker, honey slow drips, stun stars, time-field ripple, Hardlight shimmer |
| Movement | Leap and blink trails |
| Rewards | Coin fountain with "+25" pops flying to the gold counter; XP orbs flying to the XP bar |
| Big moments | Evolve light pillar plus ring wave plus background morph. Special visuals: boulders, spears, fireballs, shells, beam sweep, EMP ring, aurochs dust. Base damage chunks. Last Stand muzzle ring. Overdrive frame glow. Siege Fall red vignette. |
| Capsules | See section 7.7 |

**Juice rules (all values in `feel.json`, editable from a dev slider panel):**
- Local hitstop of 40-80 ms, scaled by damage as a fraction of max HP. The victim freezes 20 ms longer than the attacker and jitters 1-2 px.
- Global hitstop only for a Legendary death (80 ms), a special landing (120 ms) and base destruction (250 ms), at most one per 0.5 s.
- Trauma screen shake: shake = trauma², max offset 12 px, max rotation 2.5°, Perlin noise. Trauma added: unit death +0.1, base hit +0.2, special +0.5, base destroyed 1.0.
- Damage numbers only for crits, specials and base hits. A toggle shows all numbers.
- A "Reduce motion" setting from day one.

### 7.4 SFX

About 70 IDs defined as ZzFX parameters in `sounds.json`, each with 3-5 variations, ±8% pitch, max 4 voices per ID and a 40 ms retrigger gap.

| Group | IDs |
|---|---|
| UI | `ui_tap`, `ui_deny`, `ui_confirm`, `ui_card_flip`, `ui_upgrade_hammer`, `ui_level_up` |
| Spawns and movement | `spawn_light`, `spawn_heavy`, `spawn_legendary`, `step_soft`, `step_heavy`, `step_mech` |
| Attacks | `swing_whoosh`, `sling`, `bow`, `crossbow`, `musket`, `cannon`, `mortar_thump`, `zap`, `plasma`, `railgun` |
| Hits and deaths | `hit_normal`, `hit_pierce`, `hit_blast`, `hit_siege`, `die_poof`, `coin`, with the coin pitch climbing on multi-kills |
| Economy and bases | `xp_tick`, `turret_build`, `turret_sell`, `base_hit`, `base_crumble`, `last_stand_horn`, `overdrive_bell`, `siege_fall_bell` |
| Evolve | `evolve_riser`, then one fanfare per age |
| Specials | One ID per special (10) |
| Match end | `victory_fanfare`, `defeat_sting` |
| Capsules | `cap_thud`, `cap_shake_loop`, `cap_strike_climb_1` to `cap_strike_climb_4` (ascending key), `cap_strike_miss` (soft clunk, never a penalty sound), `cap_burst`, `rarity_common` (pluck), `rarity_rare` (two rising notes), `rarity_epic` (triad and shimmer), `rarity_legendary` (5-note fanfare, pad and sub drop), `walkout_bass`, `upgrade_ready`, `reel_tick` |

The mixer has Master, Music, SFX and UI buses with separate sliders, and ducks music by 6 dB during specials, evolutions and walkouts. `navigator.vibrate` patterns fire on climbs and Legendaries (mobile, toggleable).

### 7.5 Music
- One heroic main theme, the "Anthem of Ages": an 8-bar melody plus harmony, written as data for a small WebAudio sequencer (ZzFXM-compatible).
- The theme is re-orchestrated per age:
  - Primal: drums and hollow square lead.
  - Bronze: lyre-like plucked arpeggios and frame drum.
  - Iron Crown: brass-like saw lead and snare march.
  - Powder & Steam: fife, drum and piano-like keys.
  - Neon Frontier: synth arpeggios with sidechain pump.
- Adaptive layers: an intensity layer driven by combat intensity, a key lift on each evolution, a faster percussion layer in Overdrive, and a heartbeat bass layer in Siege Fall.
- Separate loops for the menu and capsule opening. Victory and defeat stings.
- Every track is registered in the audio manifest, so a composed track later replaces the generated one with no code change.
- All music is our own, so clips never get muted or claimed.

### 7.6 UI screens and flow

```
Boot (under 3 s) -> [first run] Tutorial match 1 -> Results -> Capsule opening -> Home
Home: Battle | Deck | Collection | Capsules (stack + Open all) | Trophy Road | Profile | Settings
Battle -> Opponent card (AI General, deck levels) -> Loading tips -> Battle HUD -> Pause
       -> Results (win/loss, trophies, rewards staged one by one, stats recap, Replay)
       -> Capsule opening -> Upgrade prompt -> Home
Deck: War Deck slots -> Age tabs (1-5) -> 4 unit / 2 turret / 1 special slots
      -> collection grid (filters: age, role, rarity, owned) -> Card detail
Card detail: stats at each level, counters (strong vs / weak vs), full numbers, skins, star level, lore, Upgrade
Collection: album per age with silhouettes for unowned cards, completion %, Skins tab, Relic Shop
Capsules: inventory, odds and bag table, pity counters, Open / Open all
Settings: Music / SFX / UI sliders, reduce motion, colorblind preset, damage numbers,
          language (EN, DA), save export/import, credits
Dev only: art gallery (every visualId x clip x skin), feel sliders, spawn panel, replay viewer
```

**HUD layout (landscape):**
- Top: both base HP bars, both XP bars, the match clock, age icons and the scouted enemy cards.
- Bottom: gold counter showing current income, Treasury button, 4 unit cards (88 px touch targets with cost, radial cooldown and an "affordable" glow), stance toggle, Evolve button (XP ring), Special button (charge ring).
- Tapping the base opens the turret slots as a radial menu.
- Nothing covers the lane.

### 7.7 Time Capsule opening storyboard

The result is pre-rolled and saved first. Tiers are Clay, Bronze, Silver, Gold and Prismatic. The capsule is a carved drum with 5 age rings that light up as it climbs.

1. **Arrival (0-0.5 s):** the capsule drops with a squash bounce, a dust ring and a low thud.
2. **Charge (0.5-2 s):** the rings glow in the current tier's color, cracks leak light, a riser loops, and 4 strike pips plus a "Tap!" prompt appear.
3. **Strikes (4 taps, about 0.7 s each):**
   - A climb morphs the material to the next tier with a color flash, +0.25 trauma, a chord one step higher and a lit pip.
   - A miss gives sparks and a soft clunk.
   - The number of climbs equals the pre-rolled tier. Which strikes climb is picked by the cosmetic RNG.
   - No fake near-misses: there are no teasing half-climbs.
4. **Burst (0.3 s):** a white flash and god-rays in the tier color. Cards fan out face-down.
5. **Gold** pours into the counter first.
6. **Stacks, sorted rarest last:**
   - Each card back glows in its rarity color for 0.3 s before flipping. This is an honest pre-signal.
   - Commons auto-flip at 0.15 s each.
   - Rares flip with a blue shimmer and a two-note cue.
   - Epics hover with violet lightning and a 0.8 s arpeggio.
   - New cards get a "NEW" stamp and a silhouette-fill reveal.
7. **Legendary walkout (8-10 s the first time, 3 s after that):**
   - The screen dims to a spotlight and the capsule rings spin.
   - Reveal order: the age glyph, then the role icon, then a gold-rimmed silhouette rising.
   - Bass drop. The unit bursts into color and performs its signature move across the screen (the Mammoth tramples, the Titan raises its dome).
   - Name banner, "LEGENDARY", fanfare and confetti, then "NEW!" or the duplicate progress bar.
8. **Duplicate payoff:** each stack flies into its card's shard bar, which fills with ticks. When a threshold is met, an "UPGRADE READY" badge bounces.
9. **Summary grid:** buttons for "Upgrade" (jumps to the most impactful ready upgrade), "Open next (N)" and "Done".

Controls and variants:
- Tap to fast-forward any reveal you have seen before. No sequence is unskippable for more than 10 s.
- "Open all" shows only the summary plus any Epic-or-better reveals.
- **Relic Crate reel (non-Poki builds):**
  - 50 tiles with the winner near index 45, running 5.5 s with a quintic ease-out.
  - A tick sounds per tile, falling slightly in pitch.
  - Filler tiles are drawn from the true odds.
  - The stop offset is random within the winning tile.
- **Poki build flag:** Relic Crates use the same capsule-and-card reveal instead of a reel, because of Poki's gambling rule.

---

## 8. Onboarding: the first 10 minutes

| Time | Beat | Teaches |
|---|---|---|
| 0:00 | Loads in under 3 s. Title card, one tap, straight into battle. No name entry, no menus. | |
| 0:05 | Tutorial match vs **Grogg the Training Dummy (AI)**. Primal age, 2 cards (Bonebasher, Pebble Pitcher), no timer. Hint: "Tap to send warriors" (8 words max per hint). | Deploying, gold |
| 0:40 | Grogg sends a Hide Warden. A gift of gold appears and the hint says "Build a Sling Post". | Turrets |
| 1:10 | The XP bar fills and the Evolve button glows steadily. The first evolution is the full show: freeze, pillar, base morph, the player's half of the battlefield turning Bronze, a music key lift, and 3 Bronze cards flipping in. | Evolving, loadouts per age |
| 1:40 | The special charges: "Hold, then drop Spear Storm on the crowd." | Specials |
| ~3:00 | The enemy base falls, with slow motion and coins. Results stage the rewards one at a time. | Winning |
| 3:20 | First Time Capsule: a scripted climb from Clay to Silver teaches the strikes. Tusk Lancer appears with a NEW stamp and a one-tap "Add to Age 1". | Capsules, deck slots |
| 4:00 | Match 2 vs **Pip Pebblefoot (AI)**, Skirmish-3 (3 ages). Pip leans on Hide Wardens. Adaptive hint after a failed push: "Armor! Try the Tusk Lancer." | Counters |
| ~8:00 | Win, second capsule (a new turret card), then the first upgrade (Bonebasher to L2, with the hammer slam). | Upgrades |
| 9:00 | Home screen unlocks with the Trophy Road reveal and an editable auto-name. The Battle button pulses once, not continuously. | Meta loop |
| Later | The deck builder opens fully after match 3. The first Epic arrives at capsule 5 and the first Legendary walkout (Mammoth Warband) at capsule 10, typically inside the first day. | |

Onboarding win-rate target: about 75% over the first 10 matches via T0-T2 Generals, then about 55%.

---

## 9. Tech architecture

### 9.1 Stack

| Layer | Choice |
|---|---|
| Language and build | TypeScript (7.0; fall back to 6.0 if linting lags), Vite 8, pnpm workspaces, Node 22 LTS |
| Battle and capsule rendering | PixiJS 8.21, `preference: 'webgl'`, WebGPU behind an opt-in flag |
| Menus | Preact with signals (DOM), CSS |
| Simulation | Engine-free, pure TypeScript, deterministic fixed step |
| Audio | ZzFX pre-rendered to AudioBuffers, own mixer, small sequencer for music |
| Saves | idb-keyval (IndexedDB) plus a localStorage mirror, Valibot schemas |
| Tests | Vitest 4.1 (Node, plus Browser Mode with Playwright), fast-check |
| Repo | New private GitHub repo `ageborn`. GitHub Actions runs typecheck, tests, determinism goldens, the balance smoke test and a bundle-size gate on every push. |

### 9.2 Deterministic sim, separate from rendering
- **Timing:** 20 Hz fixed tick (50 ms). Content is authored in ms and compiled to ticks. Frame time is clamped to 250 ms. The renderer interpolates between the previous and current state with `alpha = acc / DT`.
- **Integer math only:**
  - Positions in milli-units (the lane is 1,800,000).
  - HP and damage as integers x10.
  - Multipliers in basis points (10000 = 100%).
  - `Math.trunc` and `Math.imul` only.
  - Banned in the sim: `Math.random`, `Date`, `performance.now`, and `sin/cos/pow/exp` (use lookup tables).
- **Randomness:** an sfc32 PRNG seeded via xmur3 lives inside sim state. The view has its own cosmetic RNG.
- **Data flow:** `step(state, commands) -> state + events`. Commands look like `{tick, player, type, payload}` (deploy, build, sell, buySlot, evolve, special, treasury, stance, emote). Bots and humans use the same API.
- **Events:** `UnitSpawned`, `Hit`, `UnitDied`, `ProjectileFired`, `BaseDamaged`, `AgeUp`, `SpecialCast`, `GoldEarned`, `LastStand`, `PhaseChanged`, and so on. The view reacts to events and never mutates state.
- **Stable iteration:** entities are updated in id order held in arrays.
- **Hashing:** an FNV-1a state hash every 20 ticks.
- **Replays:** `{simVersion, contentHash, seed, decks, levels, commands[]}` is a few KB. v1 stores the last 20 matches. The same format later powers ghosts, server validation and clip rendering.
- **Path to online:** a Colyseus room runs the same `sim` package in Node, stamps commands at now + 4 ticks, relays them and compares hashes. The 0.4 s gate animation hides the input delay.

### 9.3 Data-driven content
- `packages/content` holds ages, units, turrets, specials, formats, economy, rarities, capsules, loot tables, arenas, bots and quests as typed TS/JSON files with Valibot schemas.
- A compiler converts ms to ticks, validates cross-references and emits `contentHash`.
- Cards reference only a `visualId`, `sfxIds` and `iconId`. They never reference a file.

Example unit:

```json
{ "id": "tusk_lancer", "age": 1, "rarity": "rare", "role": "breaker",
  "cost": 100, "supply": 1, "deployCdMs": 3500, "hp": 170,
  "attack": { "dmg": 26, "type": "pierce", "intervalMs": 1300, "windupMs": 780, "range": 30 },
  "speed": 68, "armor": "light", "tags": ["melee"], "abilities": [],
  "visualId": "unit.tusk_lancer", "sfx": { "attack": "swing_whoosh", "hit": "hit_pierce" } }
```

A balance CSV export and import lets numbers be tuned in a spreadsheet.

### 9.4 Asset manifest and art swap strategy
- `visuals/registry.ts` maps each `visualId` to a `VisualDef`:

  ```ts
  { kind: 'procedural' | 'atlas' | 'spine', source, anchors: {feet, head, muzzle, hitCenter},
    scale, teamTint: partIds[], clips: {idle, walk, attack, hit, die, spawn, victory, stun, ...},
    events: { attack: { impactAt } } }
  ```

- **The sim owns timing.** The view time-scales whatever clip exists so that `impactAt` lands on the sim's impact tick. Swapping art can never change balance.
- One `UnitView` interface with three adapters: `ProceduralPuppetView` (v1), `AtlasAnimView` and `SpineView`.
- **Tier 0 (v1):**
  - Cutout rigs: humanoid (11 parts), quadruped (13), vehicle, flyer and mech.
  - Parts are drawn once with Pixi `Graphics` or SVG strings from a per-age parts library (heads, helmets, weapons, shields, garments).
  - Parts are baked at load to a runtime atlas at `min(devicePixelRatio, 2)`, so everything renders as batched sprites.
  - Clips are keyframes on part rotation, offset and scale in JSON (Spine-like concepts).
  - Skins are palette swaps, overlay parts, filters and particle auras.
- **Later tiers:**
  - AI-generated or painted static parts at the same pivots and canvas sizes. `graphicsContextToSvg()` exports the current parts as reference templates.
  - Then AssetPack atlases with per-age bundles loaded lazily.
  - Then Spine through `spine-pixi-v8`.
  - Each unit swaps independently by editing its registry entry.
- The dev **art gallery** route renders every visualId x clip x skin. It is the review sheet, the screenshot-test target and the handoff sheet for any artist.
- **Audio manifest:** each `soundId` maps to `{kind: 'zzfx', params}` or `{kind: 'file', src}`, and music tracks work the same way. Entries can be replaced one at a time.

### 9.5 Save system
- One versioned `SaveDoc`:

  ```ts
  { v, profile, settings, currencies, collection{cardId:{level, shards, stars, skin}},
    skins[], decks[3], activeDeck, trophies, arena, pity{epic, legendary, newCard, relic},
    bags{tierBag, rngState}, pending{capsules[], results[]}, quests, stats, achievements,
    replays[20], mmr }
  ```

- Pure migrations run in sequence (vN to vN+1), then schema validation. A pre-migration backup is kept.
- Writes go to IndexedDB in two alternating slots with a checksum, plus a localStorage mirror. Writes are debounced and flushed on `visibilitychange`. The app calls `navigator.storage.persist()`.
- **Export/import:** a file download and a copyable code from the Settings screen, available from day one (Safari's 7-day eviction makes this necessary).
- Capsule results are written before the animation plays.
- A `SaveStore` interface keeps later backends (Capacitor Preferences or SQLite, cloud, portal SDK data modules) behind one API.

### 9.6 Folder structure

```
ageborn/
  packages/
    sim/       core/(fixed, rng-sfc32, hash, ids) battle/(state, step, commands, events,
               systems/{movement, targeting, combat, projectiles, turrets, economy, xp-age,
               specials, abilities, phases}) ai/(utility, personalities, tiers) replay/ test/
    content/   ages, units, turrets, specials, formats, economy, capsules, arenas, bots,
               quests, skins + schemas + compiler (ms->ticks, contentHash)
    meta/      collection, decks + validator, upgrades, capsules (bag, stacks, pity),
               trophies, quests, collection level, economy sim
  apps/
    web/src/   app/ (boot, router)  ui/ (Preact screens)  render/ (BattleView, camera,
               hud, vfx, juice, interpolation)  visuals/ (registry, procedural parts/rigs/
               clips, adapters)  audio/ (mixer, sounds.json, music score)  save/
               dev/ (gallery, feel sliders, spawn panel, replay viewer)  platform/ (adapter:
               none | poki | crazygames | y8)  i18n/ (en, da)
    sim-cli/   balance matrix, meta pacing sim, replay verify, CSV reports
    server/    (later) Colyseus room hosting packages/sim
```

ESLint `no-restricted-imports` enforces the layering: `sim`, `content` and `meta` may not import Pixi, the DOM or `apps/*`.

### 9.7 Testing
- **Sim:**
  - Formula unit tests.
  - Golden replays (seed plus commands must produce a known hash).
  - Run-twice determinism checks.
  - Property tests: HP stays at or below max, gold stays at or above 0, no entity passes a base, supply never exceeds the cap.
  - `vitest bench`: a full headless match must run in under 50 ms.
- **Meta:**
  - Chi-square tests on 10^6 simulated capsules.
  - Pity guarantees at the boundaries (capsules 10, 25 and 40).
  - The shuffle bag totals exactly 50/28/15/5/2 per 100.
  - Duplicate protection.
  - Migration fixtures for every save version.
- **Balance CI:**
  - Bot-vs-bot at equal levels, 400 matches per matchup.
  - Targets:
    - every card's win rate when included falls between 45% and 55%
    - no card appears in more than 60% of T10 decks
    - the median match runs 6:00-7:00 (5 ages)
    - the first evolution lands at a median of 55-75 s
    - under 3% of matches reach the hard end
    - turret-only strategies lose more than 70% of the time against decks carrying artillery
- **Meta pacing sim:** a simulated player over 180 days has to hit the section 5.7 milestones within ±20%.
- **Browser Mode:** `toMatchScreenshot` over the art gallery, so every art swap shows up as a visible diff.

### 9.8 Performance budget

| Item | Budget |
|---|---|
| Frame rate | 60 fps on a 3-year-old mid-range Android phone and a 4 GB Chromebook; 30 fps floor |
| Sim cost | Under 1 ms per tick with 60 units per side |
| Scene | 250 or fewer sprites, 60 or fewer projectiles, 600 or fewer particles, 25 or fewer draw calls |
| Memory | JS heap under 150 MB; DPR capped at 2 (1 on iOS or low-memory devices) |
| Download size | Initial 3 MB or less (target 1.5 MB), total 8 MB or less (Poki bar). Music and later-age parts lazy-load during the tutorial. |
| Load time | First interactive in 3 s or less on 4G; gameplay within 10 s of the click |

---

## 10. Scope, phases and risks

### 10.1 v1 must-have (offline, browser, fully working)
- The battle core from sections 2-4:
  - 5 ages, 40 units, 20 turrets and 10 specials
  - Treasury, stances, Last Stand, Overdrive and Siege Fall
  - 4 match formats, pause and 2x speed
- War Deck with 5 Age Loadouts, 3 deck slots, auto-fill and the advisor.
- Collection album, card detail with full stats and counters, upgrades L1-10, Wild Shards, Essence crafting, star levels.
- Time Capsules with the strike climb, shuffle bag, pity, odds screen and "Open all". Age Capsules, Age Unlock Capsules, Grit Capsules. Relic Crates with the reel (card-reveal variant behind the Poki flag).
- 33 skins, profile cosmetics, Relic Shop (Essence only).
- Trophy Road with 10 arenas and 48 reward nodes, daily and weekly quests, Collection Level, 40 achievements, profile.
- 12 AI Generals, Echo of You, 10 tiers, the hidden-MMR director, Practice mode with a Standard L7 toggle.
- The full juice layer (`feel.json`), about 70 ZzFX SFX, the adaptive Anthem of Ages in 5 age arrangements, settings (audio buses, reduce motion, colorblind, damage numbers, EN/DA).
- Save system with export/import, replays of the last 20 matches, dev art gallery and feel sliders.
- Test suite, balance CLI and CI gates.

### 10.2 v1.x (next iterations)
- Age 6 "Atomic" (modern tanks, jets). Stone-to-tank upset clips.
- Kinship synergies (light deck bonuses, for example "3 Primal beasts: +10% speed").
- A "Legacy slot" that keeps one card from the previous age.
- Ranked Standard as its own ladder with seasons and a Legend League title.
- Weekly challenge modifiers, Endless Horde survival, a "Who wins?" sandbox (for example 100 cavemen vs 1 mech).
- Spotlight Vault (4 visible items, bag odds of 25/33/50/100%, opened with quest-earned tokens).
- Clip Mode: 9:16 follow camera, a rolling 30 s MediaRecorder buffer, automatic highlight triggers (evolution, Legendary pull, comeback, multi-kill) and caption drafts. The owner approves each post with one click; nothing posts automatically.
- Replay viewer polish.
- Portal SDK adapters (Poki or CrazyGames) with cloud save.

### 10.3 Later
- Online 1v1 on an authoritative Colyseus server running the same sim. Real players and AI Generals share the Trophy Road, with AI still labelled.
- Ghost opponents from other players' recorded decks ("Ghost of <name>").
- 2v2: one lane, shared base with 1.6x HP, and each player keeps their own deck, gold and XP.
- Clans and friendly battles with emote-only communication.
- A Capacitor app (native storage, haptics) and a PWA install.
- Cloud accounts, and an art upgrade to painted or AI parts, then Spine, done unit by unit.

### 10.4 Build order (for testable increments)
1. **M0 skeleton:** repo, workspace, lint boundaries, sim loop, one Brawler per side, golden-replay test.
2. **M1 playable duel:** all Age 1-2 units, turrets and specials, evolve, HUD, one General, juice basics.
3. **M2 full war:** all 5 ages, formats, phases, comeback rules, 6 Generals, the balance CLI.
4. **M3 meta:** collection, War Deck builder, upgrades, capsules with the full opening show, pity, save and export.
5. **M4 progression:** Trophy Road, arenas, quests, Collection Level, profile, all 12 Generals, onboarding script.
6. **M5 polish:** skins, Relic Crates, music arrangements, settings, accessibility, performance pass, CI budgets.

The owner can play every milestone in the browser.

### 10.5 Risks and mitigations

| Risk | Mitigation |
|---|---|
| 70 cards plus 33 skins is a lot of procedural art for one agent | Shared rigs and a per-age parts library, skins as overlays and palette swaps, and the art gallery as the review surface. If time runs short, ship 6 units per age first and add the rest as data. |
| Balance across 70 cards and 5 ages | Role templates, the automated 400-match matrix in CI, CSV tuning, and hard win-rate gates |
| Matches too long for portal audiences | Clock-tied income, the phase system, Skirmish-3 and Skirmish-4 formats early, and a 3-4 minute Blitz mode in v1.x |
| Turret or legendary dominance | Turret range cap, artillery that out-ranges turrets, Siege Fall, Pierce counters, clamped levels and Standard normalization |
| Economy pacing untested (collection too fast or too slow) | Meta pacing sim before launch; all numbers in data; Collection Level and Essence as pressure valves |
| Capsules read as gambling (Poki rule, PEGI, Belgium/NL) | Earn-only with no purchasable currency ever, published bag odds, visible pity, no fake near-misses, a card reveal instead of a reel on Poki builds, and no rewarded ad that yields random rewards |
| Bots feel repetitive or unfair | 12 personalities, intelligent mistakes, a between-match director, identical rules, honest labels |
| Determinism bugs block replays and online later | Integer-only sim, lint bans, golden replays and hash checks from M0 |
| Browser storage loss (Safari 7-day rule) | IndexedDB plus mirror, export/import, persist request; later a Capacitor or cloud backend behind `SaveStore` |
| Low-end device performance | Baked atlases, pooling, particle budget, DPR cap, a "Mobile-lite" preset in `feel.json` |
| PvP population too small later | PvE, AI Generals, Echo and Ghosts carry the game. PvP is never the only fun mode (the Crystal Clash lesson). |
| Name or IP conflict | Trademark and domain check before the name is fixed. All unit, turret and track names are original, with no Age of War names, melodies or the chicken-and-hammer turret. |

The stat tables in section 4 were generated from role templates with the x1.2 per-age multiplier and per-unit overrides. The generator scripts live in the session scratchpad and can seed `packages/content`:

- `C:/Users/shn/AppData/Local/Temp/claude/C--Users-shn-AppData-Roaming-Claude-scratch-workspaces-c83ec63c-ddce-46c2-bca5-232285987974-2f45279d-f74a-4955-8467-d4f33893f97f-scratch-2026-09-27-e2e518/85506e27-c278-4db4-8764-134cbc7b4f6b/scratchpad/stats.js`
- `C:/Users/shn/AppData/Local/Temp/claude/C--Users-shn-AppData-Roaming-Claude-scratch-workspaces-c83ec63c-ddce-46c2-bca5-232285987974-2f45279d-f74a-4955-8467-d4f33893f97f-scratch-2026-09-27-e2e518/85506e27-c278-4db4-8764-134cbc7b4f6b/scratchpad/turrets.js`
