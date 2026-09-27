# Ageborn: v1 design proposal (angle: juice, clarity, shippability)

## 0. Summary

**Design pillars (in priority order)**

1. **The evolution moment.** Going from clubs to lasers inside one match is the main fantasy, and every evolve should land as the loudest regular beat of the match.
2. **Readable chaos.** A player should be able to see at a glance which side is winning and why: silhouettes by role, blue vs orange teams, visible counters.
3. **The save-the-day button.** The per-age special is aimed by the player, fires on a charge meter, and is shown in advance to both sides.
4. **An honest thrill.** Capsule openings are exciting, earn-only and pre-rolled, and the odds are always shown.
5. **Shippable in slices.** Rules and content live in data. The simulation is deterministic and separate from rendering. Art and sound are looked up by ID so they can be replaced one piece at a time.

**What v1 leaves out, and why**

| Cut | Reason |
|---|---|
| Ages 5 and 6 | Each age adds about 10 cards of art, a base, a background, a special, a music arrangement and a new row in the balance matrix. Four ages keep the full stone-to-laser arc. |
| Air units | They need extra targeting rules and an anti-air tag. That is a v1.2 topic. |
| Online PvP and 2v2 | The architecture is built for them now. The netcode comes later. |
| Campaign, daily quests, emotes, achievements, clip export | These go in v1.1 and v1.2, once the core loop is proven fun. |
| Shop, premium currency, accounts | Not needed in v1, and none of them would ever sell random rewards. |
| Units transforming when you evolve | It would make evolving too swingy and would need a mapping between cards. The base morphs instead, and a shockwave goes out. |
| Controlling a single hero unit | Considered for v2. In v1 the extra verbs are the aimed special and the Hold/Charge stance. |

---

## 1. Working title

**Working title: Ageborn.** Tagline: "From clubs to lasers."

Alternatives (all from the research shortlist, and all clear in the quick Steam and Google Play checks):
- **Aeonfront**
- **Mammoths to Mechs** (strongest hook for TikTok, but weaker as a trademark)
- **Spears to Starships**

A TMview check (EUIPO/USPTO) and a domain check are still needed before the name is locked. No name, tag or keyword may use "Age of War".

---

## 2. Core battle design

### 2.1 Lane geometry (all values in world units, "wu")

| Item | Value |
|---|---|
| World width | 2000 wu. Player base 0-200 (front at 200); enemy base 1800-2000 (front at 1800) |
| Lane between the base fronts | 1600 wu |
| Spawn point | 170 / 1830 (inside the gate) |
| Hold line | base front + 300 wu (x = 500 / 1500) |
| Infantry walk speed | 80 wu/s, so a crossing takes about 20 s at 1x. The originals took about 23 s and players called them slow. |
| Heavy walk speed | 55-70 wu/s |
| Unit footprint | Light 26 wu, Heavy 50 wu, Large (legendaries, rams, mechs) 70 wu |

**Camera.** When the viewport is at least 1200 CSS px wide, the whole world is visible. Narrower screens use Follow mode: about 1100 wu are visible, the camera auto-follows the midpoint between the two front lines (lerp k = 0.08), the player can drag to pan, and a double-tap recenters. A 1D minimap strip at the top always shows both bases, unit dots in team colour, and turret coverage.

### 2.2 Bases

- Base HP is **3000** for the whole match. It does not grow with age, which keeps the number easy to read.
- Damage multipliers against the base: Normal 100%, AntiArmor 100%, Pierce 50%, Blast 50%. Melee units kill bases; ranged units mainly support.
- A base has no attack of its own. It relies on turrets, plus a one-time Last Stand (see 2.9).
- The base shows damage in visible stages: crack decals at 66% and 33% HP, and smoke below 25%.

### 2.3 Economy

| Parameter | Value |
|---|---|
| Starting gold | 150 |
| Passive gold | 8/s. Treasury upgrade (in-match): L1 10/s for 100 g, L2 12/s for 200 g, L3 14/s for 300 g. Payback times are 50 s, 100 s and 150 s. |
| Kill bounty | 50% of the victim's cost in gold. Feeding units to the enemy always loses gold, which removes the idle-farm exploit. |
| Kill XP | victim's cost × age factor (Age 1: 1.0, Age 2: 1.25, Age 3: 1.5, Age 4: 1.75) |
| XP for losing your own units | 50% of that unit's kill-XP value (catch-up) |
| Passive XP | 5/s, so no side can ever be frozen in an age |
| Damage dealt to the enemy base | +2 gold and +3 XP per 10 damage (rewards aggression over turtling) |
| Damage taken by your base | +3 XP per 10 damage (defense XP) |
| Underdog bounty | +50% gold and XP for killing a unit from a later age than your own |
| Unit costs | Flat across ages (for example, a grunt costs 25 in every age). Power comes from the age, not the price, which removes the "stay in the Stone Age" exploit. |
| Per-age stat growth | HP ×1.3 and damage ×1.3 per age (combat value about ×1.69). This is a single tuning value, `ageStatGrowth`. |
| Supply cap | 20 per side. Light 1, Heavy/Rare 2, Legendary 3. |
| Production | One queue per side, 5 slots. Training times are 1.0-4.0 s. |

**Economy targets for the headless sim**
- An active player in an even match evolves at about 1:15, 2:45 and 4:15.
- Spending averages 12-18 gold/s.
- In an equal-gold fight, the side one age ahead wins with 40-55% of its army left. That is a real edge, but it does not decide the match on its own.

### 2.4 Ages and evolving

| # | Age | Palette | To evolve into it | Special |
|---|---|---|---|---|
| 1 | Stone Age | warm ochre, bone, moss | (start) | Mammoth Stampede |
| 2 | Castle Age | slate grey, forest green, iron | 1000 XP + 150 gold | Firepot Volley |
| 3 | Powder Age | brass, navy, smoke white | 1800 XP + 250 gold | Airship Barrage |
| 4 | Future Age | teal and violet neon on dark steel | 2600 XP + 400 gold | Orbital Lance |

**Evolve rules**
- Evolving is a choice, made by tapping the Evolve button. The gold cost makes it a trade-off: spend now to survive, or save to evolve.
- Surplus XP carries over into the next age.
- The transformation takes 1.5 s, and the production queue pauses during it.
- A cosmetic shockwave knocks enemy units within 250 wu of your base back by 60 wu. It deals no damage.
- Units already on the field and turrets already built stay as they are. Old turrets can be sold for a 50% refund.
- From that point the HUD shows the new age's deck.
- **In the final age**, the XP bar keeps meaning something: every 1500 XP fully charges the special.

The opponent's age and XP percentage are public information, so the race to evolve is visible to both sides. Gold is hidden from the opponent.

### 2.5 Roles, armour and counters

| Role | Armour | Attack type | Job | Strong against | Weak against |
|---|---|---|---|---|---|
| Grunt | Light | Normal | cheap front wall | Ranged (in melee) | Heavy, splash |
| Ranged | Light | Pierce | fires over allies from behind | Grunts, Breakers | Heavy |
| Heavy | Heavy | Normal | absorbs damage, pushes the line | Grunts, Ranged | Breakers |
| Breaker | Light | AntiArmor | kills heavies | Heavy | Ranged, Grunts |

Rare, Epic and Legendary cards add one mechanic each: swarm, siege, splash, heal aura, haste aura, shield, leap, revive, charge, or death explosion.

**Damage multipliers**

| Attack \ Target | Light | Heavy | Base |
|---|---|---|---|
| Normal | 100% | 70% | 100% |
| Pierce | 125% | 50% | 50% |
| AntiArmor | 70% | 200% | 100% |
| Blast (splash) | 100% | 75% | 50% |
| Special abilities | flat, ignores armour | flat | 0% (specials never hit bases or turrets) |

**Targeting priorities** help make counters readable on screen:
- AntiArmor units prefer Heavy targets in range.
- Pierce units prefer Light targets.
- Otherwise a unit attacks the nearest enemy.

Every card shows "Strong vs / Weak vs" icons, and a counter hint appears after the player repeatedly loses to the same matchup.

### 2.6 Combat rules

- **Soft single file.** A blocked unit may overlap the ally in front by up to 50% of its footprint, so the first 2-3 melee units reach the enemy (We Are Warriors players praised clumping like this). The supply cap stops meat walls from forming.
- **Projectiles** are sim entities that home on their target and never miss, which keeps outcomes clear. Their travel time is only for the visuals.
- **Heavy hits** (damage of at least 20% of the victim's max HP) knock the victim back 12 wu. This is part of the deterministic sim.
- **Attack timing.** Melee impact lands at 40% of the attack interval; projectiles are released at 50%.
- **Rendering depth.** Units get a 0-8 wu y-offset based on their ID and are sorted by y, so stacked units stay visible.

### 2.7 Turrets

| Rule | Value |
|---|---|
| Slots | 3. Slot 1 is free; slot 2 costs 150 g, slot 3 costs 350 g. |
| Turret cost | 100-170 gold |
| Range | 220-560 wu from the base front, always 35% of the lane or less. Turrets can never reach the midline or the enemy base. |
| Selling | 50% refund |
| Durability | Turrets cannot be damaged (clearer that way). Their weakness is range, and in Siege time they lose 50% of their damage. |
| Deck | 2 turret cards per age deck. Turrets from older ages keep working with their old stats. |

The balance sim acts as a guardrail against dominant turrets: over 90 s, no turret may deal more than 1.3× the damage per gold of the median same-age unit.

### 2.8 Specials

- One special per age, fixed in v1. Choosing between specials comes in v1.1.
- **Charge:** 45 s to full (30 s during Overdrive). The meter starts empty and keeps its charge across evolves. The opponent's charge state is shown.
- **Targeting:** tap the special, then tap or drag on the lane. The zone is 360 wu wide.
- **Telegraph:** 0.8-1.2 s. Both sides see the zone outline, which gives time to counterplay (pull back, or send more units).
- **Damage** only affects units, never bases or turrets. It is tuned to kill light units of the same age and take about 25-40% off same-age heavies.

| Age | Special | Telegraph | Effect |
|---|---|---|---|
| Stone | Mammoth Stampede | 1.0 s dust cloud and rumble | A spirit mammoth charges through the zone: 120 damage to each enemy and 100 wu knockback. |
| Castle | Firepot Volley | 1.0 s whistling arcs | 10 pots over 1.2 s, each 45 damage in r60 (2-3 hits per unit), plus burning ground at 15 DPS for 4 s. |
| Powder | Airship Barrage | 0.8 s airship shadow | 8 bombs, each 80 damage in r70 |
| Future | Orbital Lance | 1.2 s shrinking target ring | The beam sweeps the zone: 270 flat damage to each enemy. |

### 2.9 Match clock, win conditions, anti-stalemate and comebacks

| Time | Phase | Change |
|---|---|---|
| 0:00-5:00 | Regulation | normal rules |
| 5:00 | **Overdrive** | Passive gold ×2, special charge 1.5× faster, an extra music layer, and a gold frame pulse. |
| 7:00 | **Siege** | Turret damage -50%. Both bases lose 1% of max HP per second (30 HP/s). A red vignette and crumbling particles appear. |
| 9:00 | Hard cap | Tiebreak: higher base HP% wins, then more total damage dealt to the enemy base, otherwise a draw. |

- **Target length:** median 6:00, with 80% of matches between 4:30 and 8:00 and under 5% reaching 9:00. The balance CI measures this.
- **Win condition:** destroy the enemy base. The player can also concede with Retreat, which counts as a loss.

**Comeback tools.** All of them are visible and predictable, and each can be played around.
1. Defense XP (see 2.3).
2. Underdog bounty (+50%).
3. **Last Stand**, once per match, when your base drops to 25% HP or less. The base glows and a horn sounds for 1.2 s. Then a shockwave hits every enemy unit within 450 wu of your base for 25% of its max HP and knocks it back 150 wu. The attacker can hold back to avoid it.
4. The evolve shockwave.
5. Home-field advantage: your reinforcements arrive faster near your own base, and your turrets are there.

**Limits on the leader:**
- The special charges at a fixed rate and cannot be chained.
- The supply cap is 20.
- Bounties are only 50% of cost.
- There is no hidden rubber-banding anywhere.

### 2.10 Player controls in v1

| Control | Mouse / touch | Keyboard |
|---|---|---|
| Spawn a unit (4 cards for the current age) | tap card | 1-4 |
| Build a turret: pick a slot, then one of 2 turret cards; buy a slot; sell a turret | tap slot on base | Q / W |
| Evolve (steady glow when affordable, never flashing) | tap | E |
| Special: arm, then aim | tap, then tap or drag on the lane | Space, then click |
| Treasury upgrade | tap coin | R |
| Stance: Charge (default) or Hold (gather at the hold line, release as a wave) | tap flag | H |
| Pause, speed 1x / 1.5x / 2x (in all v1 modes, since every opponent is an AI) | buttons | P / F |
| Pan and recentre the camera | drag / double-tap | A/D, C |

---

## 3. Deck system

**Rules**
1. **Four age decks**, one per age. Each holds **exactly 4 units and 2 turrets**, chosen from that age's pool (7 units and 3 turrets). The special is fixed per age in v1.
2. A card belongs to one age and appears once. There are no duplicates within a deck.
3. **Starter collection:** all Commons (4 units and 2 turrets per age, 24 cards) are owned at L1 from the start. They cover the complete counter set in every age, so no player is ever locked out of an answer.
4. Rare, Epic and Legendary cards are sidegrades that bring a new mechanic ("a new card never replaces an old one"). They come from capsules or are crafted with Relic Dust.
5. **In battle** the HUD shows only the current age's 4 unit cards and 2 turret cards. After an evolve, the next age's deck slides in with a 300 ms card-flip.
6. A card's gold cost is fixed by its data and never changes with level.
7. There are **3 loadout presets** (A/B/C), shown with their average deck level, plus an "Auto-fill" button (highest level, keeping role coverage).
8. The deck builder unlocks after onboarding match 3. Before that, decks are preset. When a new card is revealed, the summary offers "Equip now".

---

## 4. Full v1 content list

**Stats key**
- Stats are at **card level 1**. A card at level L multiplies HP and damage by 1 + 0.06 × (L - 1).
- Rarity start levels are Common L1, Rare L2, Epic L4, Legendary L6. Stats of higher rarities are written so that at their start level they are worth about 1.0-1.1× a same-level Common per gold, with the extra value coming from their ability.
- DPS values are before the armour multipliers. "XP" is the kill-XP reward. The gold bounty is always 50% of cost.
- Training times: Grunt 1.0 s, Ranged 1.2 s, Breaker 1.5 s, Heavy 2.5 s, Rare 2.0 s, Epic 2.5 s, Legendary 4.0 s.

### 4.1 Stone Age (age factor 1.0)

| Card | Rarity | Role | Armour / Attack | Cost | HP | Damage / interval (DPS) | Range | Speed | Supply | XP | Ability |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Clubber | C | Grunt | Light / Normal | 25 | 110 | 14 / 1.0 s (14) | 30 | 80 | 1 | 25 | none |
| Spear Thrower | C | Ranged | Light / Pierce | 40 | 70 | 12 / 1.2 s (10) | 220 | 75 | 1 | 40 | none |
| Boar Rider | C | Heavy | Heavy / Normal | 75 | 420 | 26 / 1.5 s (17) | 35 | 60 | 2 | 75 | none |
| Bone Crusher | C | Breaker | Light / AntiArmor | 55 | 150 | 36 / 1.4 s (26) | 35 | 85 | 1 | 55 | none |
| Raptor Pack | R | Swarm | Light / Normal | 50 | 3 × 45 | 9 / 0.7 s each | 25 | 120 | 2 | 50 | Spawns 3 raptors. Pounce: each raptor's first hit does double damage. |
| Firebrand Shaman | E | Ranged splash | Light / Blast | 70 | 80 | 18 in r50 / 2.0 s | 200 | 70 | 1 | 70 | Fire bowls splash everything within 50 wu. |
| Big Mo, the War Mammoth | L | Heavy | Heavy / Normal | 140 | 620 | 32 to all enemies in 60 wu / 1.8 s | 45 | 55 | 3 | 140 | Charge: on first contact, knockback 120 wu and 0.5 s stun in 80 wu. A caveman drummer rides on top. |

| Turret | Rarity | Type | Cost | Damage / interval (DPS) | Range | Notes |
|---|---|---|---|---|---|---|
| Sling Nest | C | Pierce | 100 | 9 / 0.8 s (11) | 420 | rapid, single target |
| Boulder Tosser | C | AntiArmor | 140 | 48 / 3.0 s (16) | 480 | slow arcing boulder |
| Wasp Nest Lobber | R | Blast | 160 | 16 in r70 / 2.5 s | 400 | 30% slow for 2 s. This is the humour turret; angry wasps chase the targets. |

### 4.2 Castle Age (stats ×1.3, age factor 1.25)

| Card | Rarity | Role | Armour / Attack | Cost | HP | Damage / interval (DPS) | Range | Speed | Supply | XP | Ability |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Man-at-Arms | C | Grunt | Light / Normal | 25 | 143 | 18 / 1.0 s (18) | 30 | 80 | 1 | 31 | none |
| Longbowman | C | Ranged | Light / Pierce | 40 | 91 | 16 / 1.2 s (13) | 240 | 75 | 1 | 50 | none |
| Knight | C | Heavy | Heavy / Normal | 75 | 546 | 34 / 1.5 s (23) | 35 | 65 | 2 | 94 | none |
| Halberdier | C | Breaker | Light / AntiArmor | 55 | 195 | 47 / 1.4 s (34) | 45 | 80 | 1 | 69 | none |
| Battering Ram | R | Siege | Heavy / none | 90 | 600 | 80 to the base only / 2.0 s | 30 | 45 | 2 | 113 | Only attacks bases and blocks enemies like a wall. It is the answer to turtling. |
| War Friar | E | Support | Light / Normal | 70 | 130 | 9 / 1.2 s | 30 | 70 | 1 | 88 | Heal aura: allies within 120 wu regain 10 HP/s. Auras never stack; only the strongest applies. |
| Sir Reginald the Stubborn | L | Heavy | Heavy / Normal | 130 | 560 | 42 / 1.4 s (30) | 40 | 65 | 3 | 163 | When he first reaches 0 HP, he stays down for 1.5 s (untargetable, not blocking), then gets up with 50% HP. |

| Turret | Rarity | Type | Cost | Damage / interval (DPS) | Range | Notes |
|---|---|---|---|---|---|---|
| Crossbow Nest | C | Pierce | 100 | 12 / 0.8 s (15) | 440 | rapid |
| Scorpion Ballista | C | AntiArmor | 140 | 62 / 3.0 s (21) | 500 | bolt passes through 2 targets |
| Boiling Oil Cauldron | R | Blast | 150 | 30 on pour, then 15 DPS burn for 3 s, in a 120 wu zone, every 4 s | 220 | short-range area denial at the gate |

### 4.3 Powder Age (stats ×1.69, age factor 1.5)

| Card | Rarity | Role | Armour / Attack | Cost | HP | Damage / interval (DPS) | Range | Speed | Supply | XP | Ability |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Swashbuckler | C | Grunt | Light / Normal | 25 | 186 | 24 / 1.0 s (24) | 30 | 85 | 1 | 38 | none |
| Fusilier | C | Ranged | Light / Pierce | 40 | 118 | 20 / 1.2 s (17) | 260 | 75 | 1 | 60 | none |
| Cuirassier | C | Heavy | Heavy / Normal | 75 | 710 | 44 / 1.5 s (29) | 35 | 70 | 2 | 113 | none |
| Grenadier | C | Breaker | Light / AntiArmor | 55 | 254 | 61 / 1.4 s (44) | 90 | 75 | 1 | 83 | short lobbed throw |
| Mortar Crew | R | Artillery | Light / Blast | 80 | 140 | 40 in r70 / 3.0 s | 420 (min 120) | 60 | 2 | 120 | Cannot hit enemies closer than 120 wu. |
| Drummer | E | Support | Light / Normal | 65 | 150 | 8 / 1.2 s | 30 | 75 | 1 | 98 | War Beat: allies within 150 wu attack 20% faster. |
| Admiral Kaboom | L | Bruiser | Heavy / Blast | 140 | 780 | 50 cone to all enemies within 120 wu ahead / 1.6 s | 120 | 65 | 3 | 210 | Last Keg: on death, explodes for 140 in r100 (enemies only). |

| Turret | Rarity | Type | Cost | Damage / interval (DPS) | Range | Notes |
|---|---|---|---|---|---|---|
| Crank Gun | C | Pierce | 100 | 6 / 0.3 s (20) | 460 | rapid, with a visible crank handle |
| Bronze Cannon | C | AntiArmor | 140 | 81 / 3.0 s (27) | 520 | heavy recoil squash |
| Fireworks Rack | R | Blast | 170 | 4 rockets at random targets, each 20 in r50, every 3 s | 480 | colourful, clip-friendly |

### 4.4 Future Age (stats ×2.2, age factor 1.75)

| Card | Rarity | Role | Armour / Attack | Cost | HP | Damage / interval (DPS) | Range | Speed | Supply | XP | Ability |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Volt Brawler | C | Grunt | Light / Normal | 25 | 242 | 31 / 1.0 s (31) | 30 | 90 | 1 | 44 | none |
| Photon Ranger | C | Ranged | Light / Pierce | 40 | 154 | 26 / 1.2 s (22) | 280 | 80 | 1 | 70 | none |
| Bulwark Mech | C | Heavy | Heavy / Normal | 75 | 923 | 57 / 1.5 s (38) | 40 | 65 | 2 | 131 | none |
| Arc Lancer | C | Breaker | Light / AntiArmor | 55 | 330 | 79 / 1.4 s (56) | 45 | 90 | 1 | 96 | none |
| Jump Trooper | R | Flanker | Light / Normal | 60 | 250 | 42 / 1.0 s (42) | 30 | 95 | 1 | 105 | Leap: the first time it is blocked, it jumps up to 220 wu over the enemy front and lands for 60 damage in r60. |
| Shield Projector | E | Support | Heavy / none | 75 | 420 | no attack | n/a | 65 | 2 | 131 | Every 8 s, gives allies within 130 wu a 110 HP shield lasting 6 s. |
| Robo-Rex | L | Heavy | Heavy / Normal | 150 | 1250 | bite 64 / 1.4 s (46) | 45 | 70 | 3 | 263 | Eye Beam every 5 s: 55 damage to every enemy in a 300 wu line ahead. This is the anachronism callback to the Stone Age dinosaurs. |

| Turret | Rarity | Type | Cost | Damage / interval (DPS) | Range | Notes |
|---|---|---|---|---|---|---|
| Pulse Turret | C | Pierce | 100 | 10 / 0.4 s (25) | 480 | rapid |
| Rail Cannon | C | AntiArmor | 140 | 105 / 3.0 s (35) | 560 | hits every enemy in a 200 wu line |
| Gravity Well | R | Control | 170 | 12 DPS and 50% slow in a 150 wu zone for 4 s, every 6 s | 450 | aims at the densest enemy group |

**Card count:** 28 units and 12 turrets make 40 cards: 24 Common, 8 Rare, 4 Epic, 4 Legendary.

### 4.5 Skins (24 in v1)

**Clarity rule.** A skin may never change a unit's silhouette, its size, its primary feature (weapon or mount), or its team-colour zone. An automated gallery test compares the silhouette mask of every skin with its base visual and requires an overlap (IoU) of at least 0.85.

| # | Skin | Target | Rarity | What changes (all code-drawn) |
|---|---|---|---|---|
| 1 | Sabertooth Pelt | Clubber | Rare | palette and fang pelt overlay |
| 2 | Bone Mask | Spear Thrower | Rare | skull mask overlay |
| 3 | Frost Boar | Boar Rider | Epic | ice palette, frosty breath particles |
| 4 | Storm Mo | Big Mo | Legendary | thundercloud aura, lightning on charge |
| 5 | Plush Mo | Big Mo | Mythic | stitched-toy look, squeak SFX, confetti charge |
| 6 | Greenwood | Longbowman | Rare | hood and leaf trim |
| 7 | Obsidian Knight | Knight | Epic | dark metal, ember eye slit |
| 8 | Lantern Guard | Halberdier | Rare | lantern hanging from the polearm |
| 9 | Sir Reginald the Gilded | Sir Reginald | Legendary | gold armour, sparkle trail, trumpet when he gets back up |
| 10 | Parrot Captain | Swashbuckler | Epic | parrot on the shoulder that squawks on kills |
| 11 | Marching Band | Fusilier | Rare | plumed shako, brass trim |
| 12 | Party Admiral | Admiral Kaboom | Legendary | confetti explosions, party hat |
| 13 | Neon Alley | Volt Brawler | Rare | neon trim, glow on fists |
| 14 | Panda Mech | Bulwark Mech | Epic | panda paint and ears |
| 15 | Fossil Rex | Robo-Rex | Legendary | bone-chrome plating, amber beam |
| 16 | Wind-Up Rex | Robo-Rex | Mythic | tin-toy look, turning key on its back, clockwork SFX |
| 17 | Bird Nest | Sling Nest | Rare | a nest with a grumpy bird |
| 18 | Dragon Maw | Crossbow Nest | Epic | carved dragon head |
| 19 | Pipe Organ | Crank Gun | Epic | organ pipes, musical firing notes |
| 20 | Arcade Cabinet | Pulse Turret | Legendary | arcade screen, pixel projectiles |
| 21 | Mammoth Skull Cave | Stone base | Epic | base skin |
| 22 | Gingerbread Keep | Castle base | Legendary | base skin (keeps the base silhouette) |
| 23 | Clocktower Fort | Powder base | Epic | base skin |
| 24 | Moon Citadel | Future base | Legendary | base skin |

**Rarity count:** 7 Rare, 8 Epic, 7 Legendary, 2 Mythic. Mythic exists only as a skin rarity.

**Profile cosmetics** (non-skin): 8 banners, titles earned from ranks and Commander levels, and avatars made from the portraits of owned cards.

---

## 5. Meta

### 5.1 Profile

- The player gets an auto-generated name such as "Commander Fox-417" and can rename after match 3. There is no login.
- Other profile fields: avatar, title, banner, highest trophies, rank badge, wins and matches, collection %, legendaries owned, favourite card (most spawned), and Commander Level.

### 5.2 Currencies (all earned; none can be bought, and none will ever be purchasable)

| Currency | Source | Use |
|---|---|---|
| Gold | wins, capsules, Trophy Road | card upgrades |
| Card copies (per card) | capsules | card upgrades |
| Relic Dust | duplicate skins; copies of a card already at L10 | crafting a chosen card or skin |
| Trophies | wins | rank and Trophy Road |

### 5.3 Ranks, trophies and rewards

| Rank | Trophies | Floor (you cannot drop below it) | Bot tier band | Bot card-level cap |
|---|---|---|---|---|
| Clay | 0-299 | 0 | 1-2 | 2 |
| Bronze | 300-699 | 300 | 2-3 | 3 |
| Iron | 700-1099 | 700 | 3-4 | 4 |
| Silver | 1100-1499 | 1100 | 4-5 | 5 |
| Gold | 1500-1999 | 1500 | 5-6 | 6 |
| Crystal | 2000-2499 | 2000 | 6-7 | 7 |
| Aeon | 2500-2999 | 2500 | 7-8 | 8 |
| Timeless | 3000+ | 3000 | 8-10 | 10 |

| Result | Trophies | Gold | Other |
|---|---|---|---|
| Win | +30 | 30 + 5 × rank index (30-65) | 1 Time Capsule, +1 Relic meter (every 5th win gives a Relic Crate) |
| Loss | -20 (0 in Clay) | 10 | +1 Capsule charge (3 charges = 1 Time Capsule) |
| Draw | 0 | 15 | +2 Capsule charges |
| First win of the day | as a win | as a win | A Daily Capsule whose climb starts at Gold. Up to 3 bank, and nothing expires. |

**Trophy Road:** a node every 100 trophies up to 3000 (30 nodes). Each 500-trophy block runs 150 gold, Time Capsule, 250 gold, Relic Crate, and a Crystal Capsule (minimum tier Crystal). Each rank-up grants a title and a banner.

**Commander Level:** each level gained on any card gives Commander XP (Common +1, Rare +2, Epic +4, Legendary +8). A level takes 20 Commander XP and grants a Time Capsule. Every 5 levels also grant a Relic Crate and a title.

**Daily cap:** the data has a `dailyChestCap` setting that is null (off) in v1, so testers can play as much as they like. It can be switched on if the economy needs slowing down later.

### 5.4 Time Capsules (card cases)

**How a capsule is revealed**
1. The final tier is rolled when the capsule is granted, from a seeded RNG stream stored in the save, and saved immediately.
2. Opening plays a 4-tap climb from Stone. Each tap either climbs a tier or does not. The taps only reveal the result, and the Odds screen says so ("The result is decided when the capsule drops").

| Tier | Final odds | Card slots | Gold | Guarantees |
|---|---|---|---|---|
| Stone | 50% | 2 | 40 | none |
| Bronze | 28% | 3 | 80 | at least 1 Rare slot |
| Gold | 15% | 4 | 180 | at least 2 Rare slots, 30% chance of an Epic slot |
| Crystal | 5% | 5 | 400 | at least 1 Epic slot, 20% Legendary, 25% skin |
| Aeon | 2% | 6 | 800 | 1 Legendary (unowned first), 1 skin of Epic or better |

- Non-guaranteed slots roll rarity: Common 72%, Rare 22%, Epic 5%, Legendary 1%.
- Copies per slot:

| Slot rarity | Stone | Bronze | Gold | Crystal | Aeon |
|---|---|---|---|---|---|
| Common | 4 | 6 | 10 | 16 | 20 |
| Rare | 1 | 2 | 4 | 6 | 8 |
| Epic | 1 | 1 | 1 | 2 | 3 |
| Legendary | 1 | 1 | 1 | 1 | 1 |

**Pity and protection** (counters are shown on the Capsule screen):
- An Epic card at least every 10 capsules.
- Legendary: soft pity from 25 capsules without one (+5 percentage points per capsule to upgrade one slot to Legendary), with a hard guarantee at 40.
- **Onboarding script:** capsule 1 gives a new Rare, capsule 2 an Epic, and a Legendary arrives by capsule 10.
- No duplicate Legendary until all 4 are owned. Epics prefer unowned cards (3× weight).

### 5.5 Relic Crates (skin cases, CS-style reel)

- **Odds:** Rare 65%, Epic 27%, Legendary 7%, Mythic 1%.
- **Pity:** a Legendary or better at least every 12 crates.
- **Sources:** every 5th win, Trophy Road, Commander Level milestones.
- **Honesty rules** for the reel are in 7.7.
- **Portals:** the reel can be switched off with a build flag. The Poki build replaces it with a card-flip reveal, because Poki bans gambling themes.

### 5.6 Upgrades

Stats grow by **+6% HP and damage per level, additively.** L10 is 1.54× L1. The maximum level is fixed at L10 at launch, and the plan is to grow sideways with new cards and ages, never by raising the cap.

| To level | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Common copies (start L1) | 2 | 4 | 8 | 12 | 20 | 30 | 45 | 65 | 90 | 276 |
| Rare copies (start L2) | n/a | 2 | 4 | 6 | 10 | 15 | 22 | 30 | 40 | 129 |
| Epic copies (start L4) | n/a | n/a | n/a | 2 | 3 | 5 | 7 | 10 | 14 | 41 |
| Legendary copies (start L6) | n/a | n/a | n/a | n/a | n/a | 1 | 2 | 3 | 4 | 10 |
| Gold | 10 | 25 | 60 | 120 | 250 | 500 | 900 | 1500 | 2500 | 5865 |

**Duplicates and dust**
- Copies are the "upgrade shards"; the collection screen shows them as a fill bar per card.
- Once a card is at L10, each extra copy converts to dust: Common 5, Rare 20, Epic 100, Legendary 400.
- Duplicate skins convert to dust: Rare 25, Epic 75, Legendary 300, Mythic 1000.
- **Crafting costs:** cards (Rare 100, Epic 400, Legendary 1600); skins (Rare 150, Epic 450, Legendary 1800). Mythic skins cannot be crafted.

**Pacing sanity check** (10 matches a day at about 60% wins, so about 7 capsules a day):
- About 100 copies and 1,000 gold per day.
- The first upgrade happens in match 1.
- A focused deck reaches about L7 in 3-4 weeks.
- Gold, not copies, is the long-term bottleneck, and the gold rewards are data knobs.

### 5.7 Matchmaking fairness

- **v1 AI ladder:** bot card level = min(rank cap, your deck's average level, rounded). A bot is never above your level, so an under-levelled player never hits a wall, while upgrading still helps you climb.
- **Skirmish "Fair Duel" toggle:** both sides at L7.
- **Later PvP:**
  - *Ranked:* all cards normalised to L9 (tournament standard).
  - *Trophy PvP:* matchmaking within ±1 deck level and an arena level cap (card level is limited to the rank cap + 1).
  - When PvP ships, the AI ladder becomes a separate PvE ladder. Its rank seeds a hidden starting MMR, and the PvP ladder starts fresh.

---

## 6. Bot opponents ("AI Generals")

### 6.1 Honesty rules

- Every opponent carries an **AI badge**: on the VS screen, the HUD nameplate, the results screen and the history.
- The VS card shows personality and difficulty stars.
- An "About AI Generals" page states the rules:
  - bots have the same gold, XP, costs, card levels and cooldowns as the player;
  - bots see only what a human would see: they receive a lagged public snapshot and never your gold or deck;
  - bots issue commands through the same API as the player.
- Bots never get hidden stat bonuses and never evolve on a timer.
- Future "Ghost of <player>" opponents will be labelled as ghosts.

### 6.2 Architecture

A utility AI evaluates candidate actions at each decision tick:

| Action | What it considers |
|---|---|
| Spawn card X | counter score against the visible enemy composition, threat level, gold float |
| Build turret | repeated threat near base, surplus gold |
| Evolve | saving for it at 80% or more XP |
| Treasury | quiet lane plus personality |
| Special | value in the best zone (sum of enemy costs) or an emergency |
| Stance | Hold to build a wave, Charge when army value reaches a threshold |

**Making the bot feel human**
- *Perception lag:* the bot plays on a world snapshot that is N ms old, so it reacts late in a natural way.
- *Intelligent mistakes:* the bot works out its best move, then with probability p swaps in a plausible human error. Examples: over-buying turrets, evolving with no gold left to defend, a special aimed at one unit, a lone heavy sent into breakers, floating gold.
- *Seeded RNG* inside the command producer, so replays reproduce exactly.

| Parameter | T1 | T3 | T5 | T7 | T10 |
|---|---|---|---|---|---|
| Perception lag | 1500 ms | 1100 | 800 | 550 | 350 |
| Decision interval | 1.5 s | 1.2 | 1.0 | 0.8 | 0.5 |
| Counter-pick accuracy | 30% | 50% | 65% | 80% | 92% |
| Delay before evolving once affordable | 15 s | 8 | 4 | 2 | 0.5 |
| Special aim error | ±250 wu | ±180 | ±120 | ±70 | ±30 |
| Special value threshold | any 2 units | 90 g | 120 g | 150 g | 180 g or emergency |
| Mistake rate | 35% | 25% | 15% | 10% | 4% |
| Uses Hold/waves | no | no | yes | yes | yes |
| Actions per minute cap | 20 | 28 | 36 | 45 | 60 |

**Difficulty adaptation happens between matches, never during one.**
- The tier is picked from the rank band, adjusted by a hidden MMR: +1 after 3 wins in a row, -1 after 2 losses, staying within the band ±1.
- Target win rate: about 70% over the first 10 matches, then about 55%.

### 6.3 Roster

Twelve generals, each with a code-drawn portrait, a signature deck built from the same card pool at the bot level, and a personality.

| General | Personality | Tiers | Signature cards | Sample taunt |
|---|---|---|---|---|
| Training Dummy | none (tutorial) | 0 | Clubber | (creaks in the wind) |
| Grub the Patient | Turtle | 1-3 | Sling Nest, Boulder Tosser, Boar Rider | "Grub wait. Grub good at wait." |
| Lady Ashgrove | Balanced | 1-4 | Longbowman, Knight | "What a charming little army." |
| Brother Clatter | Swarm | 2-5 | Raptor Pack, Man-at-Arms, War Friar | "More! Always more!" |
| Captain Fizzwick | Rusher | 2-7 | Swashbuckler, Grenadier, Raptor Pack | "Full sail, no brakes!" |
| Madame Mortar | Artillery | 3-6 | Mortar Crew, Fusilier, Fireworks Rack | "Stand still, darling." |
| Baron Coinsworth | Greedy (economy) | 3-7 | early Treasury, Drummer, Cuirassier | "Money first. Manners later." |
| Professor Tock | Tech (fast evolve) | 4-8 | Shield Projector, Photon Ranger | "Behold, progress!" |
| Old Tusk | Heavy armour | 4-8 | Big Mo, Knight, Bulwark Mech | "Big feet. Big problems." |
| Sister Anvil | Fortress (turrets plus Hold) | 5-9 | Boiling Oil Cauldron, Scorpion Ballista, Shield Projector | "The gate holds." |
| Unit Z-9 | Adaptive counter | 6-10 | Arc Lancer, Jump Trooper, Rail Cannon | "Composition analysed." |
| Queen Zenith | Champion | 8-10 | Robo-Rex, Sir Reginald | "Kneel across the ages." |

**Taunts:** a speech bubble only on events (evolve, a special that hits 3 or more units, base under 50%, win or loss). At most 1 per 25 s, and they can be muted.

**Bot matches must never stall.** Every personality has an "attack clock": after 60 s without pushing past the midline, the bot's Charge priority rises until it attacks.

---

## 7. Game feel and presentation

### 7.1 Art direction (code-drawn now, swappable later)

**Style:** chunky cel-shaded cartoon cutouts.
- 3 px dark outline at 1x.
- Two-tone flat shading, with one highlight shape per part.
- Big heads, about 1:2.5 proportions, which suit both humour and small screens.
- Backgrounds kept desaturated and low in contrast, so the units carry the colour.

**Readability**

| Cue | Rule |
|---|---|
| Size by role | Grunt 60 wu tall, Heavy 90+, Legendary 120+ |
| Weapon by role | ranged units carry long visible launchers; breakers have oversized hammers, axes or lances |
| Team colour | Blue (light value, #4C8DF6) vs orange (dark value, #D9480F) on tabard or banner parts, plus a team ground ellipse, facing direction and health-bar colour. Colourblind presets change the pair. |
| Health bars | only shown on damaged units; a ghost segment drains 300 ms behind the real bar |

**Six rig archetypes** cover all 28 units:
- light humanoid
- heavy humanoid
- rider on a mount
- quadruped (raptor, mammoth, rex)
- walker/vehicle (ram, mech)
- crew (mortar)

Parts are drawn once with Pixi Graphics, baked into a runtime atlas at min(DPR, 2), and animated as sprites.

**Split-era background.** Each half of the lane is drawn in its owner's current age, blended across a soft seam that follows the midpoint between the two front lines. The race to evolve then shows up in the scenery, which also makes a good clip.

**No blood.** Units poof into dust, KO stars and coins, which keeps the game Poki-safe for all ages.

### 7.2 Animation list

Every unit uses the same clip names, whichever art tier renders it.

| Clip | Spec |
|---|---|
| spawn | drops in: scale 0 → 1.15 → 1 over 180 ms with ease-out-back, plus a dust puff |
| idle | 2 px breathing bob on a 1.2 s loop, with a weapon sway |
| walk | legs swing ±25°, 3 px body bob; the cycle is 0.5 s at 80 wu/s and scales with speed |
| attack | anticipation for 60% of the wind-up (lean back, squash 0.9/1.1), strike, then recovery. The `impactAt` marker lines up with the sim's impact tick. |
| hit | 80 ms white flash, squash toward the knockback direction, 1-2 px jitter during local hitstop |
| die | fling along the knockback direction with a spin, poof into dust, KO stars; debris decal stays 6 s |
| victory | cheer loop (used on the results screen and in the legendary walkout) |
| unit-specific | Big Mo charge, Reginald falls and gets back up, Kaboom's keg blast, Jump Trooper leap arc, Robo-Rex eye beam, Shield Projector bubble, Drummer beat pulse |

**Turrets:** idle, aim (rotates toward the target), fire (recoil squash over 120 ms plus a one-frame muzzle flash), and build (rises from the base with a dust puff).

**Bases:**
- idle (flags, smoke)
- hit (60 ms flash and chunks)
- damage states at 66% and 33%
- evolve morph (squash, light pillar, rebuild)
- Last Stand glow
- destroy (collapse with 0.3× slow motion)

### 7.3 Juice table (all values live in `feel.json` and can be tuned with the dev overlay)

| Event | Hitstop | Screen-shake trauma | Flash | Particles | Sound |
|---|---|---|---|---|---|
| Light hit | none | 0 | victim 60 ms | 3 sparks by attack type | hit_light (4 variations) |
| Heavy hit (≥20% max HP) | local: victim 70 ms, attacker 50 ms | +0.04 | 80 ms | 6 sparks and dust; 12 wu knockback | hit_heavy (3 variations) |
| Unit death | local 50 ms (heavy dies: global 80 ms) | +0.05 (heavy +0.12) | none | 10 dust, KO stars, 1-4 coins flying to the gold counter (player kills only) | poof (4 variations) |
| Turret shot | none | 0 | muzzle 1 frame | 3 smoke | per-turret ID |
| Base hit | none | +0.08 (at most once per 0.5 s) | base 60 ms | 4 chunks | base_hit (3 variations) |
| Special impact | global 120 ms | +0.45 | 1 frame at 30% white | per-special preset | special cue; music ducks -6 dB for 1.5 s |
| Evolve | global 150 ms | +0.35 | 120 ms | light pillar, ring, confetti of age icons | riser, boom, age fanfare, music key change |
| Last Stand | global 150 ms | +0.5 | red 100 ms | shockwave ring | gong and horn |
| Base destroyed | 250 ms, then 0.3× slow motion for 1.2 s | 1.0 | 200 ms | 120 debris | collapse and victory/defeat stinger |

**Shake model:** trauma², Perlin noise, maximum offset 10 px, maximum rotation 2°, linear decay 1.4/s, noise frequency 18 Hz.
- At most one global freeze every 0.5 s.
- A "reduce motion" preset turns shake off, halves hitstop and softens flashes.

**Damage numbers:** by default only for specials, base damage, and kills by the player's own turrets. They can be set to off, important, or all.

**Hitstop is presentation only.** Local hitstop never touches the sim. Global freezes pause the sim clock only in offline modes; in future online play they become visual-only freezes with a short catch-up afterwards.

### 7.4 VFX list

1. Spawn dust
2. Hit sparks for 4 attack types: white stars (Normal), splinters (Pierce), orange sparks plus a dent ring (AntiArmor), explosion ring (Blast)
3. Muzzle flashes
4. Projectile trails (bright core, team-tinted tail)
5. Death poof and coins
6. Debris decals (a pool of at most 40)
7. Base cracks and smoke
8. Evolve pillar and shockwave
9. Special telegraphs: pulsing zone outline in team colour
10. Special effects: mammoth spirit, firepots with burning ground, airship with bombs, orbital beam
11. Aura rings (heal green, haste yellow, shield cyan)
12. Overdrive gold frame pulse
13. Siege red vignette with crumbling particles
14. Last Stand wave
15. Capsule and crate effects (see 7.7)

**Particle budget:** 600 live on desktop and 300 on mobile. The lowest-priority emitters are dropped first.

### 7.5 SFX list

All effects are ZzFX/jsfxr definitions, pre-rendered to AudioBuffers at load and referenced by ID.

| Group | Sounds |
|---|---|
| UI | click, hover, deny (with a red card shake), toggle, tab switch |
| Units | per-age spawn whoosh (×4); hit_light ×4, hit_heavy ×3, pierce_hit ×3, blast ×3; releases for sling, bow, musket and laser; death poof ×4 |
| Turrets | one fire sound per turret (12); build thud; sell clink |
| Economy | coin tick (throttled to one per 40 ms), treasury upgrade chime, not-enough-gold deny |
| Base | hit ×3, crack, collapse |
| Match | evolve riser, evolve boom, age fanfares ×4, special cues ×4 (rumble, whistle, airship drone, orbital charge and beam), Overdrive horn, Siege alarm, Last Stand gong, victory jingle, defeat jingle |
| Capsules | thud, shake riser, tier-climb chords ×4 (each a step higher), soft miss clunk, burst, card flip, rarity stingers (Common pluck; Rare two rising notes; Epic triad plus shimmer; Legendary 5-note fanfare with pad and sub drop), reel tick with falling pitch, level-up chime |

**Mixer**
- Buses: master, music, SFX, UI.
- At most 4 voices per sound ID, with a 30-50 ms minimum gap before retriggering.
- Pitch varies ±8% and volume ±3 dB.
- Sounds the player caused get priority.

### 7.6 Music

- **One memorable main theme.** The working name is "Ageborn Anthem": a 16-bar singable hook at 112 BPM. It is our own melody and deliberately unlike "Glorious Morning".
- **The theme is written as note data and played by a small WebAudio synth,** with an arrangement per age:
  - Stone: drums, marimba, bone flute
  - Castle: brass and lute
  - Powder: fife and snare march
  - Future: synth arpeggios and a sidechained pad
- **Stems:** base, intensity (switched on when combat is heavy) and Overdrive (+8 BPM and extra percussion). The key rises one step on each evolve.
- **Other cues:** a slow menu arrangement, victory and defeat stingers built on the same motif, and a capsule-room loop.
- **Later:** recorded stems replace the synth under the same cue IDs. Because all music is our own, clips will never be muted or claimed.

### 7.7 Capsule and crate reveal storyboard

**Time Capsule** (a sealed stone-and-brass capsule with an hourglass emblem):

| Time | Beat |
|---|---|
| 0.0-0.5 s | The capsule drops with a bounce, a low thud and a dust ring. |
| 0.5-2.0 s | Anticipation: shaking, a riser, and light leaking through the seams in the current tier colour (Stone grey, Bronze orange, Gold yellow, Crystal cyan, Aeon violet with gold). |
| Taps 1-4 | Each tap cracks the shell. A climb brings a colour flash, a shake of +0.2 and a chord one step higher. A non-climb gets a soft knock. After 2 s idle the capsule taps itself. |
| +0.3 s | Burst: white flash and god-rays in the final tier colour. |
| Cards | Cards fan out face down, sorted from lowest to highest rarity. Each card back glows in its rarity colour before it flips. Commons flip automatically at 0.15 s each. |
| Legendary walkout (8 s the first time, 3 s after) | The screen dims to a spotlight. The reveal goes silhouette, age icon, role icon, name banner. The unit plays its victory clip with a fanfare and a "NEW!" badge. |
| Duplicates | The copies bar fills (for example 3/4 → "UPGRADE READY") and the Upgrade button pulses. |
| Summary | New items are highlighted, with "Equip" and "Upgrade" buttons. |

**Relic Crate reel:**
- 50 tiles scroll horizontally; the winning tile sits around index 45.
- Filler tiles are drawn from the true odds.
- The reel runs 5.5 s with a quintic ease-out, and a tick sounds each time a tile crosses the pointer.
- The stop point is random within the winning tile.
- The winning tile zooms in with a colour burst.
- The reel never stages a stop just past a rare item.

**Controls:**
- Holding the screen fast-forwards any reveal the player has seen at least once.
- "Open all" opens the whole stack in one batch.
- No sequence stays unskippable for more than 10 s.
- The Odds button is on every capsule and crate.

### 7.8 UI screens and flow

```
Boot (≤3 s) ─► first run: Match 1 directly ─► Results ─► Capsule ─► Upgrade ─► Match 2 ...
            └► returning: Home
Home (tabs): Collection | Decks | BATTLE (centre) | Road | Profile    (+ settings gear)
BATTLE ─► VS card (AI badge, 2 s, skippable) ─► Battle HUD ─► Pause ─► Results ─► Capsule / Replay / Next
```

| Screen | Contents |
|---|---|
| Home | Big Battle button with a preview of the next general, unopened capsules ("Open" / "Open all"), Trophy Road bar, profile chip, Skirmish entry |
| Battle HUD | Top: your base HP, age and XP bar; timer and phase; opponent base HP, age and XP; opponent special state; minimap strip. Bottom bar (72 px, touch targets of at least 48 px): gold with income/s, Treasury, 4 unit cards (cost, train progress, queue icons), turret, special meter, Evolve (shows "1800 XP · 250 g"), Hold/Charge, pause and speed. |
| Results | Victory or defeat banner, trophy animation, gold roll-up, stats recap (spawned, kills, base damage, MVP card), capsule drop, "Watch replay", "Next battle" |
| Capsule / Crate | see 7.7, plus the odds sheet with live pity counters |
| Collection | Grid grouped by age, filters for role, rarity and owned. The card detail shows every stat at the current and next level (including attack interval, range, speed and multipliers), strong/weak icons, ability text, copies bar, upgrade, and skin carousel. |
| Decks | Age tabs, 4 + 2 slots, drag or tap to swap, average level, presets A/B/C, Auto-fill |
| Trophy Road | vertical path with nodes and rank gates |
| Profile | name, avatar, title, banner, stats, collection % |
| Skirmish | roster of 12 generals, difficulty 1-10, Fair Duel toggle, speed. Rewards are small gold only, with no capsules and no trophies. |
| Settings | volume for Master, Music, SFX and UI; reduce motion; shake slider; hitstop on/off; damage numbers; colourblind preset; language; default speed; save export/import/reset; odds; credits |
| Dev (flag) | art gallery, feel tuner, sim inspector, bot-vs-bot viewer, replay viewer |

---

## 8. Onboarding: the first 10 minutes

| Time | Beat | What it teaches | On-screen text (≤8 words) |
|---|---|---|---|
| 0:00 | The page loads in 3 s or less. The title screen is the live battlefield with a single Play button: no menu, no name, no login. | none | "Play" |
| 0:05 | **Match 1 vs Training Dummy (AI).** No timer. Only the Clubber card. The gold counter pulses when a unit is affordable. | spawning, gold | "Tap to send a Clubber." |
| 0:30 | The Spear Thrower card slides in. | ranged units fire over allies | "Spear Throwers shoot over friends." |
| 0:55 | The XP bar fills (the tutorial threshold is 300). Evolve glows steadily. | evolving | "Evolve!" |
| 1:00 | Full evolve cinematic. The player's half of the background turns Castle; the Dummy stays in the Stone Age for comedy. Man-at-Arms and Longbowman unlock. | the signature moment | none |
| 2:15 | The Dummy's base falls with slow motion and a victory stinger. Rewards are staged one at a time. | winning feels big | none |
| 2:40 | **Capsule 1** (scripted to climb to Bronze): Raptor Pack NEW, plus 6 Clubber copies. | the capsule thrill | "Tap to crack it!" |
| 3:20 | A single forced tap upgrades the Clubber to L2. | upgrading | "+6% HP and damage" |
| 3:40 | **Match 2 vs Grub the Patient (AI, T1).** Two ages, no timer. Full Stone deck. The turret slot unlocks early. The special unlocks at 0:45. | turrets, counters, aiming the special | "Build a Sling Nest." / "Drag Stampede onto enemies." |
| during | Adaptive hints fire only when the player is failing, for example after a heavy kills 3 of their grunts. | counters | "Heavies crush Clubbers. Try Bone Crusher." |
| 7:10 | Results, then **Capsule 2** (scripted Gold tier, first Epic: War Friar). | rarity tiers | none |
| 7:50 | **Match 3 vs Lady Ashgrove (AI, T2).** Full rules: 4 ages, match clock, Treasury hint at 0:15, Hold hint after 3 losses to turrets. | full loop | "Upgrade Treasury for more gold." |
| ~14:00 | After match 3: name prompt, deck builder unlocked, Trophy Road revealed, Capsule 3. | the meta | none |

Scripted capsules keep going until a Legendary has dropped by capsule 10.

**Instrumentation:** a local event log records drop-off at each step (it can be exported for playtests).

---

## 9. Tech architecture

### 9.1 Stack

| Layer | Choice |
|---|---|
| Language and build | TypeScript (7.x, or 6.0 if tooling lags), Vite 8, pnpm workspace, Node 22 LTS |
| Battle renderer | PixiJS 8.x with WebGL preferred (WebGPU behind a flag), DPR capped at 2 (1 on low-memory devices) |
| Meta UI | Preact with signals and CSS in the DOM. Pixi is used only for the battle and the capsule/crate effects. |
| Simulation | Pure TS, deterministic fixed timestep at 20 Hz (50 ms ticks), integer math, seeded sfc32 RNG kept in the state |
| Audio | ZzFX and jsfxr pre-rendered to AudioBuffers, a small custom music sequencer and mixer, AudioContext resumed on the first user gesture |
| Save | IndexedDB via idb-keyval, plus a localStorage mirror; Valibot schema; migrations |
| Tests | Vitest 4 for the Node sim and meta; Vitest Browser Mode with Playwright for smoke and gallery screenshot tests |
| Repository | New private GitHub repo `ageborn` with GitHub Actions CI. Players run it locally with `pnpm play` (build plus preview), so nothing needs to be online. |

### 9.2 Keeping the sim and the renderer apart

```
input (UI, keys) ─┐
bot command producers ─┼─► Command[] {tick, side, type, payload}
                       ▼
        packages/sim: step(state, cmds) → state' + Event[]    (pure, deterministic)
                       ▼ events + prev/curr state
        apps/web/render: interpolate (alpha = acc/DT), UnitView per entity, feel layer
        (hitstop, shake, VFX, SFX, numbers)  ── never writes to the sim
```

**Commands:** `spawn(slot)`, `buildTurret(slot, card)`, `sellTurret(slot)`, `buySlot`, `evolve`, `special(x)`, `treasury`, `stance(hold|charge)`. Commands run on the next tick; online play later adds a delay of N ticks, hidden behind a "summon" animation.

**Events:** `unitSpawned`, `attackWindup`, `hit`, `projectileFired`, `projectileHit`, `died`, `baseDamaged`, `turretFired`, `goldEarned`, `xpEarned`, `ageUp`, `specialTelegraph`, `specialImpact`, `phaseChanged`, `lastStand`, `matchEnded`.

**Determinism rules** (ESLint bans the forbidden calls inside `packages/sim`):
- **Integer units:**
  - positions are integers in 1/100 wu;
  - HP and damage are integers;
  - multipliers are in basis points;
  - content timings are authored in ms and compiled to ticks.
- **Banned calls:** `Math.random`, `Date`, `performance.now`, and `Math.sin/cos/pow/exp`.
- **Ordering:** iteration is by stable entity ID.
- **Hashing:** a state hash (FNV-1a) every 20 ticks.

**Replays** are `{simVersion, contentHash, seed, decks, levels, commands[]}`, about 5-20 KB each. The last 20 are kept. They power debugging, balance work, the "Watch replay" button, and later clip mode, ghost opponents and server validation.

### 9.3 Data-driven content

- `packages/content` holds typed TS definitions for ages, units, turrets, specials, skins, rarities, capsules, generals, rules (economy and match-clock numbers) and feel presets.
- They are validated by schema at build time and compiled into a JSON bundle with a `contentHash`.
- Gameplay data refers only to `visualId`, `soundId` and `musicCueId`, never to files.

### 9.4 Asset manifest and art-swap strategy

```ts
type VisualDef = {
  kind: 'procedural' | 'atlas' | 'spine';
  source: string;                      // rig+parts generator id | atlas key | skeleton key
  anchors: { feet; head; muzzle; hitCenter };
  scale: number;
  teamZones: string[];                 // parts locked to team colour (skins cannot touch)
  clips: Record<'idle'|'walk'|'attack'|'hit'|'die'|'spawn'|'victory'|string, ClipRef>;
  events: { attack: { impactAt: number } };   // 0..1, view time-scales clip to the sim impact tick
};
type SkinDef = { base: string; palette?: Record<string,string>; overlays?: PartRef[]; aura?: string; sfxOverrides?: Record<string,string> };
```

**Art tiers.** Each unit can move up a tier on its own, without touching gameplay:

| Tier | What it is |
|---|---|
| 0 (v1) | Procedural puppet: parts drawn in code, baked to atlases per age (Age 1 at boot, the rest during idle time). Clips are JSON keyframes on bones, using the same concepts as Spine. |
| 1 | Static AI-generated or painted parts dropped into the same rig. `graphicsContextToSvg()` exports today's parts as size and pivot templates. |
| 2 | AssetPack atlases with a manifest; bundles load per age. |
| 3 | Spine skeletons (spine-pixi-v8). |

- The view adapters `ProceduralPuppetView`, `AtlasView` and `SpineView` all implement one `UnitView` interface.
- The sim owns all timing, so new art can never change balance.
- Sounds (`sounds.json`: zzfx params or a file) and music cues (`music.json`: synth score or stems) follow the same pattern.
- The **dev art gallery** renders every visualId × clip × skin. It is the review surface, the screenshot-test target and the handoff sheet for a future artist.

### 9.5 Save system

**SaveDoc v1:**

```
{v, profile, currencies{gold, dust}, trophies, bestTrophies,
 collection{cardId:{level, copies, isNew}}, skins{skinId:{owned, equipped}},
 decks{presets[3]{ageId:{units[4], turrets[2]}}, active},
 capsules{pending[{id, kind, tier, contents, opened}], charges, relicMeter, dailyBank},
 pity{epic, legendary, skinLegendary, total}, rng{capsuleState},
 stats, settings, tutorialStep, replayIds[]}
```

**How writes and loads work**
- Writes are debounced and go to 2 alternating slots, each with a checksum. Pending writes are flushed on `visibilitychange`. A localStorage mirror of the latest good slot is kept.
- Pure migrations `m[n]: Vn → Vn+1` run in order. The pre-migration state is backed up, then the result is validated against the schema.
- **Capsule results are written to the save before the animation plays**, so reloading can never re-roll a capsule.
- The game calls `navigator.storage.persist()` and offers export/import as a file and as a copyable code from day one (this protects against Safari's 7-day eviction).
- All storage sits behind a `SaveStore` interface, so Capacitor Preferences or SQLite, or cloud saves, can replace it later.

### 9.6 Folder structure

```
ageborn/
  packages/
    sim/      src/core (fixed, rng-sfc32, hash, ids) · battle (state, step, commands, events, rules)
              systems (spawn, movement, targeting, combat, projectiles, turrets, economy,
              xp-age, specials, match-clock, auras) · ai (perception, utility, personalities,
              generals) · replay/ · test/
    content/  ages, units, turrets, specials, skins, rarities, capsules, generals, rules,
              feel presets · schema.ts · compile.ts (ms→ticks, contentHash)
    meta/     save-doc, migrations, collection, decks, upgrades, capsule-roll, pity,
              trophies, rewards, commander-level
  apps/web/src/
    app/ (boot, router, platform adapter)   ui/ (Preact screens)   render/ (BattleView,
    camera, hud, interpolation, feel/)   visuals/ (registry, procedural/{rigs,parts,clips},
    adapters/)   audio/ (mixer, sounds, music-seq, unlock)   save/   i18n/ (en; da in v1.1)
    dev/ (gallery, feel tuner, sim inspector, replay viewer)
  tools/sim-cli/  balance matrix, replay verify, drop-rate and economy reports (CSV)
  docs/           design.md, art-style.md, generated content tables
```

ESLint `no-restricted-imports` keeps `sim`, `content` and `meta` free of DOM, Pixi or `apps/*` imports.

### 9.7 Testing

**Sim**
- Formula unit tests.
- Golden replays (seed plus commands must produce a known hash).
- Determinism check: run twice and compare hashes.
- fast-check invariants: HP never above max, gold never negative, no unit past a base, supply never above cap.
- Benchmark: a full headless match in 50 ms or less.

**Balance CI**
- 400 bot-vs-bot matches per matchup using mirrored decks.
- Checks:
  - every card's win-rate delta within ±5 points;
  - turret damage per gold within guardrails;
  - match-length distribution on target;
  - evolve timings within ±15 s of target;
  - first-mover advantage under 53%.

**Meta**
- Migration fixtures for every save version.
- Chi-square test of capsule and crate odds over 10⁶ simulated openings.
- Pity guarantees verified.
- Economy simulation over 30 simulated days.

**Browser**
- Playwright smoke test: boot, tutorial match 1 on autopilot, capsule, upgrade.
- Screenshot tests of the art gallery.
- A readability test: every unit rendered at 32 px height must stay distinguishable by silhouette. This is a manual review sheet in v1.

### 9.8 Performance budget

| Metric | Budget |
|---|---|
| Initial download | ≤3 MB (target 1.5 MB gzipped); total ≤8 MB |
| Time to Play button | ≤3 s on desktop, ≤5 s on a mid-range phone |
| Frame rate | 60 fps on a 4 GB Chromebook and a 3-year-old mid-range phone |
| Entities | ≤60 unit bodies (20 supply per side plus swarms), ≤80 projectiles, ≤600 particles (300 on mobile) |
| Draw calls | ≤30 per frame (atlases per age, blend modes grouped) |
| Sim cost | ≤1 ms per tick in the worst case |
| JS heap | ≤150 MB |

---

## 10. Scope, risks and build order

### 10.1 Scope

| v1 (must-have, fully working and polished) | v1.1 | v1.2 | Later |
|---|---|---|---|
| 4 ages; 40 cards (28 units, 12 turrets); 4 specials; 24 skins | 5th age "Steel Age" (+10 cards, 1 special) | Air units with an anti-air tag | Online 1v1 (Colyseus room hosting `packages/sim`, input relay plus hash checks) |
| 1v1 against 12 labelled AI Generals: AI ladder plus Skirmish | Daily Orders (3 per day) and login streak | Campaign (about 30 levels across the ages) | 2v2 with bot fill |
| Match clock (Overdrive, Siege, tiebreak), Treasury, Hold/Charge, Last Stand, underdog rules | Choice of special per age (2 per age) | Local "ghost" opponents and a replay browser | Accounts, cloud save, seasons |
| Capsules (4-tap climb, pity), Relic Crate (reel), dust and crafting, upgrades to L10 | Clip Mode: 9:16 camera, MediaRecorder rolling buffer, auto-highlights, watermark | Endless "Horde" mode, kaiju boss event | PWA and Capacitor app, native storage |
| 8 ranks, Trophy Road, Commander Level, profile | Bot emotes; achievements (about 20) | Danish localisation plus any further languages | Portal SDK adapters (Poki or CrazyGames path), optional ads for fixed rewards only |
| 3-match onboarding with adaptive hints | Star levels (cosmetic prestige for maxed cards) | Card combo synergies | Owner's clip workflow (Claude produces the clips, the owner approves each post with one click) |
| Procedural art (6 rigs), feel layer, full SFX, synthesised anthem in 4 arrangements | | | |
| Settings (audio, motion, colourblind, numbers), pause and speed, save export/import, replay of recent matches | | | |
| Dev tools: gallery, feel tuner, balance CLI | | | |

### 10.2 Build order

Each milestone ends with something playable.

1. **M0 Grey box.** Workspace, CI, sim loop at 20 Hz, one age with rectangles, commands, a random bot, render interpolation. Done when a match can be won against a random bot and a golden replay test passes.
2. **M1 Full battle.** All 4 ages of content, turrets, specials, evolve, match clock, stance, Treasury, Last Stand, utility bots with 3 personalities. Done when the balance CLI runs the matrix and median match length is 5-7 min.
3. **M2 Look and feel.** The 6 rigs, all 40 cards and 24 skins in code, split-era background, feel layer, VFX, SFX, anthem, HUD polish. Done when every entry in the gallery passes review and the game holds 60 fps on the low-end target.
4. **M3 Meta.** Save system, collection, decks, capsules and crates, upgrades, dust, ranks, Trophy Road, profile. Done when the odds tests and migration tests pass.
5. **M4 Onboarding and generals.** 3 tutorial matches, adaptive hints, 12 generals, tier adaptation, AI labelling everywhere. Done when a fresh player reaches the first evolve within 1:00 and the first capsule within 3:00.
6. **M5 Ship.** Performance pass, accessibility, bug bash, Playwright smoke, and a playtest build for the owner via `pnpm play`.

### 10.3 Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Procedural art looks cheap | Players see it as low quality | Style guide (outlines, cel shading, big heads), only 6 rigs so each can be polished, gallery reviews, and effort put into juice rather than detail |
| 40 cards across 4 ages are hard to balance | Dominant decks, dead cards | Headless bot matrix in CI, guardrails, the single `ageStatGrowth` knob, all numbers in data |
| Bots feel dumb or unfair | The game feels hollow or rigged | Perception lag, intelligent mistakes, personalities, identical rules for bots and players, visible AI labels, never stalling |
| Scope creep | v1 never ships | The frozen v1 list above; every new idea goes into v1.x |
| Determinism bugs | Replays and future online play break | ESLint bans, golden replays, hash checks in CI from M0 |
| Save loss (Safari eviction, IndexedDB errors) | Players lose trust | Two slots plus a localStorage mirror, `persist()`, export/import from day one |
| Audio on iOS or Safari | Silent game | Unlock on the first gesture, silent-switch workaround, fallback if AudioContext fails |
| Capsules perceived as gambling or breaking portal rules | Rejected by a portal, backlash | Earn-only forever, odds and pity shown, outcome decided before the reveal, no staged near-misses, reel switchable off for Poki |
| Upgrade pacing too fast or too slow | Boredom or grind | Economy sim over 30 days; gold and copy rewards are data knobs; `dailyChestCap` is available |
| Match length drifts | Stalemates or matches that end too quickly | The match clock sets hard limits; CI checks the length distribution |
| Name or IP conflict | Forced rebrand | TMview check before the name is public; no Age of War names or melody |
| Level gaps in future PvP | Clash-style frustration | Normalised levels in Ranked, an arena level cap and ±1 matchmaking, designed in now |
