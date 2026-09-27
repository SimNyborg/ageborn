# Age of War 1 and 2: research report on mechanics, player sentiment, clones, and design lessons

**Method note:** Game numbers come from three places: the community wiki (aowg.fandom, pulled through its API), the Flash Gaming Wiki, and an open-source Unity clone whose author says its values were "extracted from the original game" ActionScript. The fan-wiki numbers sometimes disagree, and I flag those cases. Player sentiment comes from Reddit (read through the pullpush.io archive, because reddit.com blocks fetches), Kongregate, Armor Games, JayIsGames, Steam review API data, and Google Play and App Store reviews. YouTube comments could not be accessed. The session's web-search budget ran out partway through, so the later sources were found through direct site APIs.

---

## 0. Key takeaways

1. **The Age of War 1 enemy AI does not follow the player's rules.** Per the clone's code comments, it spends no gold and evolves on a fixed timer (about every 3.3 minutes). It spawns random units, buys turrets from a fixed script, and on higher difficulties gets flat stat multipliers (x1.3 or x2). Players call Impossible "rigged" and "cheating AI with infinite money". Our bots have to play by the same rules as the player and be labelled as bots.
2. **The economy is kill-bounty based, and that creates the two dominant exploits.** A kill pays 1.3x the victim's cost in gold and 2.6x in XP. Because of that, players (a) turtle behind turrets and let the game farm itself for hours, or (b) stay in the Stone Age and farm expensive enemy units with 15-gold clubmen.
3. **Turrets decided too many games.** Four Ion Rays could defend alone ("Turrets OP", "build only turrets... You win. Awful game"). Age of War 2 overcorrected: its turrets "can't even reach the midway point" and felt weak.
4. **The music is the biggest nostalgia trigger.** "Glorious Morning" by Waterflame appears in a large share of positive reviews. The humour, especially the chicken turret that lays eggs when hit with a hammer, is the second.
5. **The fantasy players love** is evolving from cavemen to lasers, watching the chaos, and finally beating Impossible.
6. **Recurring frustrations:**
   - no pause, mute or save (in Age of War 1)
   - units too slow, so players ask for a speed-up button
   - stalemates on Insane
   - games that are short once solved ("completed in an hour or less")
   - unfair-feeling enemy evolution
7. **The modern successes in this genre** are Stick War: Legacy (100M+ installs, 4.8 stars), We Are Warriors! (10M+, 4.5 stars), The Battle Cats (4.5 stars) and Clash Royale (500M+). Their negative reviews warn against grind walls, wait timers on chests, AI that gets inflated stats, hidden mechanics, and gaps in unit levels in PvP.

---

## 1. The originals at a glance

| | Age of War (AoW1) | Age of War 2 (AoW2) | Army of Ages ("AoW3") |
|---|---|---|---|
| Developer / publisher | Louissi (aged 17) / Max Games | Louissi / Max Games | Louissi |
| Release | 15 Oct 2007. Won a contest prize of $10k. On Armor Games from 14 Jan 2008. | 2010 (Armor Games 28 May 2010). The brief's "2011" is wrong. Mobile: iOS 2017. | About 2013, HTML5 port later |
| Ages | 5 (Stone, Medieval, Renaissance, Modern, Future) | 7 (adds Spartan and Egyptian) | 5, fought against an alien base |
| Content | 16 units, 15 turrets | 29 units, God's Spells, Generals mode | Auto-spawning buildings, gatherers, air units |
| Reach | Armor Games: 10.2M plays, 94/100 from 30,169 ratings. Kongregate: 3.8. Android: 10M+ installs, 4.0 stars from 255K reviews. | Armor Games: 4.29M plays, 94/100 from 16,040 ratings. Android: 10M+, 4.1 stars from 86.3K. iOS: 4.27 from 836. | Portal: 3.1/5 |

---

## 2. Age of War 1 (2007) mechanics

### 2.1 Core loop
- One horizontal lane with a base on each side. The player uses only the mouse.
- Buttons buy units (training queue of up to 5) or turrets, buy turret slots, sell turrets, fire the special, or evolve.
- Units walk automatically and fight the first enemy they meet.
  - Melee units fight in single file.
  - Ranged units can shoot from behind allies.
- Killing enemies earns gold and XP. XP is used only to evolve. Destroying the enemy base wins.

### 2.2 Economy (numbers from the decompiled-values clone)
- **Starting gold:** 175. There is no passive income.
- **Kill bounty:** gold equal to 1.3x the victim's cost, and XP equal to 2.6x its cost.
- **Losing your own unit** still gives XP equal to 0.65x its cost. This works as a built-in catch-up mechanic.
- **XP needed to evolve:** 4,000, then 14,000, then 45,000, then 200,000. Each step is about 3.5x the previous one.
- **Base HP by age:** 500, 1,100, 2,000, 3,200, 4,700.
- **Map:** 900 units long. A unit walks 450 units in about 11.5 s, so crossing the whole lane takes about 23 s. The game ran at roughly 40 frames per second, and all timers are counted in frames.
- **Unit cost inflates exponentially while HP does not.** The first unit of each age goes 15, 50, 200, 1,500, 5,000 gold. HP per gold falls from 3.7 (Club Man) to 0.17 (Tank) to 0.027 (Super Soldier). Old-age units are therefore 20 to 100 times more cost-efficient. Combined with bounties scaled to the victim's cost, this is the root of the "stay in the Stone Age" exploit.

### 2.3 Units (cost / HP / melee damage / ranged damage and range / train time)

| Age | Light melee | Ranged | Heavy |
|---|---|---|---|
| Stone | Club Man 15 / 55 / 16 / none / 1 s | Slingshot 25 / 42 / 10 / 8 at range 100 / 1 s | Dino Rider 100 / 160 / 40 / none / 2.5 s |
| Medieval | Sword Man 50 / 100 / 32-35 | Archer 75 / 80 / 20 / 9-14 at 130 | Knight 500 / 300 / 60 |
| Renaissance | Dueler 200 / 200 / 79 | Musketeer 400 / 160 / 40 / 20 at 130 | Cannoneer 1,000 / 600 / 120 |
| Modern | Melee Infantry 1,500 / 350 / 100 | Infantry 2,000 / 300 / 60 / 30 at 130 | Tank 7,000 / 1,200 / 300 (about 7.5 s to train) |
| Future | God's Blade 5,000 / 1,000 / 250 | Blaster 6,000 / 800 / 130 / 80 | War Machine 20,000 / 3,000 / 600 |

The Future Age also has a fourth unit, the **Super Soldier**: 150,000 gold, 4,000 HP, and 400 melee plus 400 ranged damage.

Units take up different amounts of lane space: 20 for infantry, 80 for Dino Rider and Knight, 120 for Tank.

### 2.4 Turrets and slots
- **Slots:** you start with 1. Extra slots cost 1,000, then 3,000, then 7,500, for a maximum of 4. Slots are stacked up the tower, and the lower ones shoot farther.
- **Selling** a turret refunds 50%.

Turrets by age, as cost followed by DPS:

| Age | Turrets (cost / DPS) |
|---|---|
| Stone | Rock Slingshot 100 / 16; Egg Automatic 200 / 18; Primitive Catapult 500 / 14 |
| Medieval | Catapult 500 / 23; Fire Catapult 750 / 29 (splash); Oil 1,000 (damage over time, range about 50, hits only under the base) |
| Renaissance | Small Cannon 1,500 / 17; Large Cannon 3,000 / 40; Explosive Cannon 6,000 / 57 (splash) |
| Modern | Single 7,000 / 70; Rocket 9,000 / 80; Double 14,000 / 127 |
| Future | Titanium 24,000 / 100; Laser 40,000 / 160; Ion Ray 100,000 / 240 |

The Ion Ray's range is 550 to 800 depending on the source, long enough to reach the enemy half of the lane.

The **Egg Automatic** (the chicken turret) delivers about the DPS of a 1,500-gold cannon for 200 gold. That imbalance is why it became a meme ("chicken egg turrets during the futuristic age").

### 2.5 Specials
Specials are free and run on a cooldown. The wiki says 30 s; the clone uses 60 s. They hit units only and stop short of the enemy base.

| Age | Special |
|---|---|
| Stone | Meteor shower, 22 meteors that can miss |
| Medieval | Arrow rain, 40 arrows |
| Renaissance | Heal: all your units regenerate about 1 HP per frame for 14.6 s |
| Modern | Airstrike, 15 bombs of 400 damage each |
| Future | Laser strike, 18 beams of 1,000 damage each |

### 2.6 Difficulty
There are three modes: **Normal**, **Harder** (enemy HP and damage x1.3) and **Impossible** (x2). Nothing else changes.

### 2.7 AI behaviour (from the ActionScript rules transcribed in the clone)
- Each second there is a 30% chance it spawns a unit, so about one unit every 3.3 s. It keeps at most 6 units queued or on the field.
- The unit tier is random among the tiers it has unlocked. Tier 2 unlocks after about 37 s in each age, tier 3 after about 122 s.
- It **evolves after about 195 s in each age, regardless of XP or what the player does**, so it reaches the Future Age at around 13 minutes.
- Turret purchases and sales follow a fixed script for each age.
- It **does not pay for anything.** A player who tried to starve it of gold found that "they just kept sending shit".

### 2.8 Battle length
- Normal runs take about 15 to 30 minutes.
- Players of the Steam remake report "Impossible... 18 minutes" and "all 3 difficulties in 43 minutes".
- The exploit-based Impossible strategies include idling for "approximately one hour" to bank 3 to 4 million gold.

### 2.9 Dominant strategies and exploits

| Exploit | How it works | Source |
|---|---|---|
| Turtle and idle farm | Max out turrets, then go AFK for hours ("coming back to the most money I've ever had"). Four Ion Rays hold alone, then Super Soldiers finish the game. | r/gaming, r/dogelore |
| Stay in the Stone Age | Spam Club Men or Slingshots at your own gate. They stack on the first tile into a "meat wall", and each high-tier enemy kill pays for many cheap units. | r/DramaticText, 85 upvotes; r/gaming guide |
| Special every cooldown | The special gives free gold. Wait for 3 to 5 enemies, then fire it. | Wiki, Armor Games guide |
| Pause glitch | The special's cooldown and the turrets keep running while the game is paused. | Wiki "Glitch" page |

---

## 3. Age of War 2 (2010) mechanics

**What changed from Age of War 1:**
- **Flat unit prices** of 100, 125, 200 and 400 gold in every age. Power now comes from evolving and upgrades instead of price inflation.
- **God's Spells cost XP.** This competes directly with evolving, and guides advised "avoid special attacks entirely".
- **The 4th unit in each age is locked** behind a building you buy: Dino Hut 400, Armory 600, Temple 750, Arena 900, Black Powder 1,000, Factory 1,100.
- **Population cap.** It starts at 10 (JayIsGames: "all 10 of the computer's units will be on the screen"). The wiki says it rises to 20 or 30 in later ages, but that source is inconsistent.
- **Unit roles** are Infantry, Support (ranged), Anti-armor and Armor, with counter bonuses. Upgrades are bought per role (Infantry Armor and Damage, Support Range and Damage, and so on) plus an **Income level** upgrade.
- **Other features:**
  - up to 4 tower spots
  - a **2x speed** button
  - enemy base HP that grows with each age
  - four difficulties: Easy, Medium, Hard and Insane
- **Generals mode**, paid on mobile, has 10 named AI generals with their own strategies. Examples are Brom "the Basher" and Hades, and others are based on Leonidas, Hannibal, Rameses, Genghis Khan, Napoleon, Rasputin and Stalin.

**Age table** (units, turrets, spell cost in XP, XP to evolve):

| Age | Units | Turrets | Spell (XP) | Evolve (XP) |
|---|---|---|---|---|
| Stone | Clubman, Slinger, Speedy Dino, Assault Dino | Mammoth Catapult 750, Egg Rifle 1,500, Rock Slingshot 2,300 | Meteorite Shower 2,000 | 7,000 |
| Spartan | Sword, Spear, Assault, Armored Spartan | Guard 2,000 (the only turret) | Zeus' Anger 2,500 | 8,000 |
| Egyptian | Kopesh, Priest, Anubis, Cart Warrior | Golden Eagle 1,500, Big Bird 2,100 | Rage of the Desert 3,000 | 9,000 |
| Medieval | Footman, Archer, Mage, Griffon Knight | Crossbow 1,000, Rock Catapult 2,000, Metal Catapult 3,000 | Arrow Storm 4,000 | 10,000 |
| Renaissance | Swordman, Rifleman, Cannon, Knight | Small Cannon 2,000, Large Cannon 3,500 | Bomb Rain 5,000 | 11,000 |
| Modern | Infantry, Machine Gun, Grenade, Tank | Machine Gun 2,000, Rocket 3,000, Double Rocket 4,500 | Bomber 6,000 (one wiki says 1,000) | 12,000 (one wiki says 10,000) |
| Future | Spider Blade 200, Cyborg 250, Mad Scientist 400, Armored Combat Suit 800, God's Wrath 10,000 (16,500 HP) | Ion 2,500, Plasma 3,500, Heavy Plasma 5,000 | Death Ray 7,000 (1,500 damage to all enemies) | none |

**AI behaviour.**
- It is "utterly predictable". It fires a spell right at the start and evolves ahead of the player.
- It follows every evolution with a spell (a "death storm"). Players learned to keep "1000 gold or so to survive a death storm".
- It can use its special once per age.

**Balance problems players reported.**
- Anti-armor units were "somewhat overpowered".
- Cannon spam was "most overpowered unit in the game".
- Stacking Egg Rifles could "get you almost to the end".
- There were Insane stalemates. One Hard game went 40+ minutes with the enemy base at 9,861/10,000 damage before the player gave up.
- With the right strategy, Insane at 2x speed takes "4 min".

---

## 4. "Age of War 3 and 4", fan sequels, and derivatives

- **Army of Ages**, Louissi's own third game, is often relabelled "Age of War 3".
  - Buildings auto-spawn units.
  - Gatherers carry water from wells to earn money.
  - It adds air units.
  - Units carry type tags (Biological or Mechanical; Light, Medium or Heavy; Air or Ground) with bonus-damage modifiers.
  - Turrets have HP.
  - The enemy is an asymmetric alien faction.
  - On one hosting portal it rates 3.1/5. The mechanics are deeper, but it never gained the originals' fanbase.
- **Fan and alternative sequels:** The Wars (2009) and The Wars II Evolution (2013) add World War and Roman eras. "Age of War 4" is only a label portals put on various clones (3.4/5).
- **Knock-offs trading on the name:**
  - "Age Of War 3" on iOS (2022): 3.87 stars from 60 ratings. It copies AoW2's description.
  - "Age of Battle War" (Android): 2.7 stars. Reviewers call it "misleading... adding a '3'", with "the only surefire strategy is to buy the 10k mech".
  - "Age Of Fight" (Android): 2.7 stars. Reviewers say "the ai always has a steady supply of coins".

---

## 5. What players loved (with evidence)

1. **The music.** People call Glorious Morning the reason to replay "every year just for [the] soundtrack alone". It is praised in both Steam and Reddit threads, and a Reddit thread about the game is titled after the song ("certified glorious morning moment"). AoW2 got its own remix of the theme.
2. **The evolution fantasy.** Players name cavemen to super soldiers and "evolving through ages, spawning units, and watching chaos unfold" as the core pleasure.
3. **Humour and charm:** the chicken egg turret ("the famous Chicken Turret which is a must build", from Max Games' own store copy) and dinosaur riders.
4. **Beating Impossible as a badge of honour.** It shows up in "hardest mission of all time" threads, and one Danish Reddit user wrote "my life peaked".
5. **Discovering cheese.** Players enjoy sharing exploit guides; the Impossible guides are among the most upvoted content.
6. **Quick, mouse-only, easy to learn.** The "It's an easy game but enjoyable" type of comment is common.
7. **Big late-game payoffs:** Ion cannons ("ion cannon owns") and Super Soldiers.

## 6. What frustrated players

| Problem | Evidence |
|---|---|
| AI that cheats or is rigged | "Impossible mode is rigged against the player" (85 upvotes). "Cheating AI with infinite money". On mobile: "moving to a new age... only to have my enemy do it in a few seconds". |
| Turret dominance and stalemates | "Turrets OP". "Don't build anything except turrets... Awful game". Insane stalemates in AoW2. |
| Too slow, no speed control | Kongregate: "The Characters Are Too Slow". Mobile: "needs a 'speed up' button". |
| Missing basics | Kongregate: "No mute butten!", "pause button would be nice", "needs a save". A mobile reviewer complains the sound option only mutes music. |
| Short and solved quickly | "can be completed in an hour or less". JayIsGames: "probably isn't the sort of thing you'll find yourself coming back to". |
| Nagging UI | "The flashing reminder to upgrade to the next age is OBNOXIOUS". |
| Mobile controls | "can't scroll the screen", small buttons, "can't see the cost of any units". |
| Watching the same thing repeat | "got bored of watching people just repeat what they're doing with bots". |
| Dominant single strategy (clones) | "only surefire strategy is to buy the 10k mech... repetitive and boring meta". |

---

## 7. Modern remakes and genre peers: reception and lessons

| Title | Reception | Lesson |
|---|---|---|
| **Age of War (Steam 3566610)**, free Godot fan port, 2025 | Very Positive, 587 up / 55 down | Nostalgia alone carries it. Negative reviews: the enemy builds no turrets, balance differs from the original, "waiting for space" spawn limits, small map, inconsistent unit scale, no blood, no achievements, no exit button. **Fidelity details matter.** |
| **Max Games mobile ports** (AoW1 and AoW2) | 10M+ each, about 4.0-4.1 stars | A faithful port plus a paid extra mode. Complaints about length, nagging UI and audio controls. |
| **We Are Warriors!** (Lessmore, 2023) | 10M+, 4.5 stars from 283K on Android; 4.47 from 51.5K on iOS | Direct modern evolution of the formula. Praised: "it allows unit clumping", saving resources is rewarded, optional ads, events such as "horde vs cavemen" and "Kaiju". Hated: ad-farm progression, walls needing "100k+" replays, bots with "5x your damage and health", a "hidden mechanic" nullifying stat cards, only one unit type usable per era, "No PvP", and one reviewer on the r/wearewarriors sub saying "Tower turrets are what I miss the most compared to Age of War". |
| **Stick War: Legacy** (Max Games) | 100M+, 4.8 stars from 3.21M reviews | The biggest success of this type. Recent reviews complain about **chest wait timers** and ads replacing free chests. |
| **The Battle Cats** (Ponos) | 4.5 stars from 618K reviews | The collection is loved, along with "no forced ads". Players want an in-game stats list and PvP, and complain about material grind. |
| **Clash Royale** | 500M+, 4.4 stars | The top complaint: "if your deck is under levelled at all then the game becomes seriously unfun", with matchmaking seen as pushing spending. |
| **GitHub clones** (Godot, 74 stars; a React+TypeScript+Canvas clone with online 1v1) | n/a | There is still developer appetite for this genre, and online 1v1 has already been prototyped as a web clone. |

---

## 8. Recommendations for our game

**Match structure and anti-stalemate**
1. **Target 6 to 8 minutes for PvP** and 10 to 15 minutes for PvE campaign battles. Tune XP so that active play evolves roughly every 60 to 90 s. Keep AoW1's ratio of about 3x more XP per age, but add a small passive XP trickle so neither side can be frozen in an age.
2. **Add sudden death** at a fixed time (for example 6:00): turret damage -50%, damage to bases x2, and both bases slowly decaying after that. This kills turtling and Insane-style stalemates.
3. **Remove AFK farming.** Cap kill bounties when the enemy is near your base, or pay part of the income for damage dealt to the enemy base.

**Economy**
4. **Mix the income sources:** passive gold, plus bounties of about 0.5 to 0.8x the victim's cost, plus XP from your own losses (the 0.65x catch-up rule, which is a good one to keep).
5. **Keep unit prices from inflating across ages.** Follow AoW2 (roughly flat prices, with power coming from evolving and upgrades), not AoW1's 15-to-150,000 range. This removes the "stay in the Stone Age" exploit.
6. **Add an age-gap modifier**, for example -15% damage per age behind, so evolving always matters. Show the opponent's XP bar so evolving becomes a visible race ("Can you advance faster than your enemy?").

**Units and decks**
7. **Use AoW2's four roles** (Infantry, Support, Anti-armor, Armor) plus Army of Ages-style tags (Light/Heavy, Bio/Mech, Ground/Air later) with visible counter bonuses. This gives deck building real decisions.
8. **Deck per age:** for example 4 units, 2 turrets and 1 special, chosen from the collection. This extends AoW2's 4 units per age. Let older-age units stay deployable in limited form: a We Are Warriors reviewer wanted "cavemen, riflemen... robots, aliens all on one battlefield".
9. **Formation rules:** allow limited clumping (2 or 3 melee units engaging at once, which We Are Warriors players praised). Cap field population (AoW2 used 10 at the start) so the "300 cavemen on one tile" meat wall cannot happen.

**Turrets**
10. **Keep 4 slots** with escalating slot costs (about 1:3:7.5) and 50% refund on selling.
11. **Limit turret range** to about 40% of the lane and do not let turrets hit the enemy base. Their job is defence, not winning.
12. **Check cost-efficiency with an automated sim** so no single turret dominates the way the Egg Automatic did (the DPS of a 1,500-gold turret for 200 gold).

**Specials**
13. **Use a cooldown or charge meter, not an XP cost.** AoW1's free special was loved; AoW2's XP-cost spells were hoarded or ignored.
14. **In PvP:** telegraph each special for about 1 s, cap damage as a percentage of max HP (no full-screen wipes like Death Ray's flat 1,500), and have it stop short of the enemy base.

**Bots**
15. **Named AI Generals** with personalities (AoW2 had 10, which is good precedent), shown clearly as "AI" or "Ghost" opponents.
16. **Bots obey the exact player rules.** Same gold, same XP, no timer-based evolving, no hidden stat inflation. Difficulty should come from decision quality, reaction time and macro skill. If there is a handicap, disclose it.
17. **Use a utility-based bot** that reads the lane state, not AoW1's random spawns plus scripted turrets. Add "ghost" opponents built from recorded player decks.

**Meta and collection (cases with no real money)**
18. **Normalise or cap level differences in PvP**, for example a tournament-standard level or a maximum gap of 1 to 2. Keep the rarity excitement concentrated in skins and cosmetic variants.
19. **No wait timers on opening cases** (Stick War's players hated the new timers). Duplicates convert into upgrade shards, with a pity counter for guaranteed rare drops. Publish drop rates.
20. **Put full stats in-game**, including attack speed, range and counters. This was requested for Battle Cats, and We Are Warriors' hidden mechanic angered players. Never hide mechanics.
21. **Keep content fresh** with rotating events (horde modes, a kaiju boss), achievements (requested for the Steam port), and challenge badges such as "win without evolving" or "beat Impossible".

**UX and quality of life**
22. Add pause, 1x/2x/3x speed in PvE, and separate music and SFX sliders reachable from the menu. Add save and resume.
23. Show costs and stats in tooltips. Keep a training queue of 5. Show gold popups on kills.
24. Do not flash the evolve button.
25. On mobile: drag-to-scroll or auto-fit the lane, large touch targets, and unit scale kept consistent across ages.

**Audio, art and pipeline**
26. **Budget for one heroic, loopable main theme** with a variation for each age. This is the strongest retention and nostalgia lever in this genre. Plan for procedural WebAudio as a placeholder that a composed track can later replace.
27. **Keep unit silhouettes readable by role**, with strong hit feedback (sparks and gore toggleable) and humorous signature units of our own design.
28. **Make all balance data-driven.** AoW1's entire balance fits in about 15 arrays: cost, train time, HP, melee and ranged damage, ranges, unit length, attack timers. Use a fixed-tick deterministic simulation, which AoW1 already was with its frame-based timers. That makes an authoritative server, replays and marketing clip export straightforward later.

**IP**
29. Use no "Age of War" naming (knock-offs using it are called "misleading"). Do not copy the Glorious Morning melody, the chicken-and-hammer turret, or unit names such as "God's Blade", "Super Soldier" or "Ion Ray". Mechanics can be inspired by the originals; names and art must be our own.

---

## 9. Sources

**Wikis**
- https://aowg.fandom.com/wiki/Age_of_War (via api.php)
- https://aowg.fandom.com/wiki/Stone_Age
- https://aowg.fandom.com/wiki/Medieval_Age
- https://aowg.fandom.com/wiki/Rennaissance_Age
- https://aowg.fandom.com/wiki/Modern_Age
- https://aowg.fandom.com/wiki/Future_Age
- https://aowg.fandom.com/wiki/Units
- https://aowg.fandom.com/wiki/Turrets
- https://aowg.fandom.com/wiki/Turret_Slots
- https://aowg.fandom.com/wiki/Strategies_(Age_of_War)
- https://aowg.fandom.com/wiki/Age_of_War_2
- https://aowg.fandom.com/wiki/Spartan_Age
- https://aowg.fandom.com/wiki/Egyptian_Age
- https://aowg.fandom.com/wiki/Generals_Mode
- https://aowg.fandom.com/wiki/Glitch
- https://aowg.fandom.com/wiki/Army_of_Ages
- https://aowg.fandom.com/wiki/Glorious_Morning
- https://aowg.fandom.com/wiki/Club_Man_(AoW1)
- https://flashgaming.fandom.com/wiki/Age_of_War
- https://flashgaming.fandom.com/wiki/Age_Of_War_2

**Code**
- https://github.com/erupturatis/Age-of-war-unity-clone (Assets/scripts/Enemy_AI.cs, Data.cs, Troop.cs, GameManager.cs)
- https://github.com/erupturatis/Decompiled-flash-games-archive
- https://github.com/apiotrowski255/age-of-war
- https://github.com/ataberkus/age-of-war-clone

**Portals and reviews**
- https://armorgames.com/play/616/age-of-war
- https://armorgames.com/play/5933/age-of-war-2
- https://armorgames.com/community/thread/170409/age-of-war-guide-to-beating-impossible
- https://armorgames.com/community/thread/5671254/guide-to-beating-age-of-war-2-in-easy-medium-and-hard
- https://armorgames.com/community/thread/5636854/age-of-war-2-guide
- https://www.kongregate.com/games/louissi/age-of-war/comments
- https://www.kongregate.com/games/louissi/age-of-war-mobile/comments
- https://jayisgames.com/review/age-of-war-2.php
- https://www.maxgames.com/guides/age-of-war-2.html
- https://www.maxgames.com/game/age-of-war-2.html
- https://www.crazygames.com/game/age-of-war
- https://ageofwar.pro/game/age-of-war-3/

**Steam**
- https://store.steampowered.com/app/3566610/Age_of_War/ (plus the appreviews API)

**App stores**
- https://play.google.com/store/apps/details?id=com.maxgames.ageofwar1
- https://play.google.com/store/apps/details?id=com.maxgames.aow2
- https://apps.apple.com/us/app/age-of-war-2/id1194118663
- https://apps.apple.com/us/app/id1603388282
- https://play.google.com/store/apps/details?id=com.vjsjlqvlmp.wearewarriors
- https://apps.apple.com/us/app/id6466648550 (App Store RSS reviews)
- https://play.google.com/store/apps/details?id=com.maxgames.stickwarlegacy
- https://play.google.com/store/apps/details?id=jp.co.ponos.battlecatsen
- https://play.google.com/store/apps/details?id=com.supercell.clashroyale
- https://play.google.com/store/apps/details?id=bibogames.defense.ageofwar
- https://play.google.com/store/apps/details?id=com.lapira.ageofwar
- https://play.google.com/store/apps/details?id=com.slimewarrior.ageofwar.army.battle.fight

**Reddit** (read through the api.pullpush.io archive)
- https://www.reddit.com/r/DramaticText/comments/12vdi3q/certified_glorious_morning_moment/jhcep4d/
- https://www.reddit.com/r/dogelore/comments/wtgh9j/le_2009_days_have_arrived/il4tsdg/
- https://www.reddit.com/r/gaming/comments/f9wwbv/how_to_beat_age_of_war_on_impossible_guide/fjkdkjd/
- https://www.reddit.com/r/gaming/comments/a27cdq/anyone_else_have_fond_memories_with_this_website/eawdtqc/
- https://www.reddit.com/r/AskReddit/comments/1nnktfr/whats_the_oldest_game_you_still_boot_up_at_least/nfou07z/
- https://www.reddit.com/r/forsen/comments/qek30x/age_of_bajs_is_out_free_to_play_browser_game_with/hhye7m0/
- https://www.reddit.com/r/wearewarriors/comments/1j35oli/new_heroes_some_ideas_about_this/mfy28ow/
- https://www.reddit.com/r/IAmA/comments/puedl/i_am_a_full_time_flash_game_developer_working_by/
- https://www.reddit.com/r/battlecats/comments/1tanl5q/what_games_do_you_think_inspired_battle_cats_fluff/
- https://www.reddit.com/r/StrategyGames/comments/1uthxez/what_if_age_of_war_was_a_3d_firstperson_game_im/
- https://www.reddit.com/r/IndieDev/comments/1wcg3k7/ive_missed_age_of_war_since_flash_died_so_ive/
