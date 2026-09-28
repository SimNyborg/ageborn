# A18 research: how the classics structure ages, upgrades, difficulty, pacing and campaigns

Date: 2026-09-28. Input for the A18 design pass that answers the owner's feedback ("too easy, you evolve far too fast, too few ages, money upgrades are boring, matches finish too fast, add difficulty levels, a level map, hold/attack").

**Method and limits.** This session could search the web but every page fetch was blocked by the network egress proxy (fandom, miraheze, strategywiki, jayisgames, blogspot all returned `EGRESS_BLOCKED`). Numbers below therefore come from search-result extracts of the cited pages, plus the earlier deep dive `docs/research/aow-deepdive.md` (which decompiled-value numbers for the 2007 game and its 2010 sequel came from). Where a number is from memory or unverified it is marked *(unverified)*. The classic 2007 Flash game is called "the 2007 original" and its 2010 sequel "the 2010 sequel" here; neither name may be used in Ageborn.

---

## 0. Ten findings that matter for Ageborn

1. **The classics were slow on purpose.** In the 2007 original the AI evolves every ~195 s per age regardless of the player, so a Normal run takes **15-30 min**; the player needs 4,000 / 14,000 / 45,000 / 200,000 XP to evolve (each step ~3.5x). Our Full War expects the last of 7 evolves at ~6:30, which is **~56 s per age**, about 3.5x faster than the original. This is the root of "you climb through the ages very quickly".
2. **The "many ages" sequel is the 2010 sequel with 7 ages**: Stone, Spartan (Greek), Egyptian, Medieval, Renaissance, Modern, Future. Fan follow-ups went further: *The Wars II Evolution* (2013) has **9 levels/eras from Stone Age to space war**. Ageborn already has 8; the owner's "too few" is mostly about *feeling* (each age is over before you learn it), not only count.
3. **The sequel moved power from price to upgrades.** Unit prices were flat (100 / 125 / 200 / 400 gold in every age); power came from evolving, **per-role upgrade tracks** (Infantry Attack, Infantry Armour, Support Attack, Support Range, Anti-armour Attack/Armour), an **Income level** upgrade (more gold per kill), and a **building that unlocks the 4th unit** of each age (Dino Hut 400 ... Factory 1,100). Guide prices: Anti-armour Attack 400 then 800, Armour 300, Income 500 then 1,100, Anti-armour Armour 1,700; "as soon as you have 1,500 gold buy the last Support Range upgrade" so three Support units shoot the front enemy.
4. **Upgrades players remember change what a unit *does*, not +10%.** Stick War Legacy: Swordwrath **Rage** (double attack speed, costs HP), Archidon **Fire Arrows** (burn), Spearton **Shield Wall / Shield Bash / Spear Throw**, Magikill **minion summon**, Castle Archers on the statue, **Passive Income** (5 / 10 / 15 gold and mana every 5 s). These are the upgrades players name in guides.
5. **Difficulty by stat multiplier is hated; difficulty by behaviour and head start is accepted.** 2007 original: Normal / Harder (x1.3 HP and damage) / Impossible (x2) and nothing else, which players called "rigged". 2010 sequel: Easy / Medium / Hard / Insane, with Insane starting the enemy far ahead; players complain "easy is way too easy while normal is way too hard" (a gap, not a ramp). Stick War Legacy: Normal / Hard / Insane with a **crown per difficulty per level**; Insane buffs enemy damage/HP *and* makes the AI "more aggressive and cunning" with stronger spells and reinforcements.
6. **Campaign maps give each level a job.** Plants vs Zombies: 50 levels = 5 worlds x 10; a new plant after levels 1, 2, 3, 5, 6, 7, 8, 10 of each world, level 4 unlocks a feature, level 5 is a minigame, level 9 a story note, level 10 a special (conveyor/boss). Kingdom Rush: 12 main levels, 3 stars by lives left (18-20 of 20 = 3 stars, 6-17 = 2, 1-5 = 1), plus Heroic (+1 star) and Iron (+1 star) challenges unlocked by 3-starring, so **5 stars per level**. Battle Cats: 3 chapters x 48 stages per saga, with treasures per stage.
7. **Stars and treasures are a second upgrade currency that is earned by skill, not grind.** Kingdom Rush stars buy permanent tower/spell upgrades (7 per tower tree, with **two mutually exclusive branches**); examples 1 star: soldier HP +10%, armour +10%; 2 stars: rally range +20%; 3 stars: 10% double-damage chance; artillery +10% range. Battle Cats treasures give permanent % bonuses to worker rate, wallet, cat HP/ATK, cannon, money per kill, XP.
8. **In-battle economy upgrades are the most loved "boring money" mechanic when they are a choice.** Battle Cats' **Worker Cat** (8 levels per battle, each raising income rate and wallet cap; tap to level) is the economy-vs-army decision that every stage revolves around. Stick War's miners vs army pop space is the same decision. The 2010 sequel's Income level was a flat buy-once and is not remembered.
9. **Turret range is the lever that broke both classics.** 2007: Ion Ray range 550-800 of a 900 lane, "Turrets OP, build only turrets, you win". 2010: turrets "can't even reach the midway point", and "there's a spot right in front of the enemy tower where turrets can't hit you", players called them "a waste of money" except the egg turret. Range upgrades must be capped well short of midlane.
10. **What players complained about most:** cheating AI (infinite gold, x2 stats, instant enemy evolve), turret stalemates, too slow units/no speed button, games solved in an hour, difficulty cliffs, "the AI knows when you have no gold and uses its special to wipe your army", campaigns that are "quite short, will only distract us a few days", and the wish to "play online with real players" for replay value (Stick War Legacy reviews).

---

## 1. Ages in the classics and their themes

| Game | Ages (in order) | Units per age | Notes |
|---|---|---|---|
| 2007 original | Stone, Castle/Medieval, Renaissance, Modern, Future (5) | 3 (+ Super Soldier in Future) | 15 turrets, 1 special per age on cooldown |
| 2010 sequel | **Stone, Spartan, Egyptian, Medieval, Renaissance, Modern, Future (7)** | 4 (4th unlocked by a building) + Future "God's Wrath" 10,000 gold / 16,500 HP | Egyptian: Kopesh, Priest, Anubis, Cart Warrior; Spartan has one turret (Guard); spells cost XP |
| Army of Ages (same author, ~2013) | 5 vs an alien base | buildings auto-spawn | Air units, type tags (bio/mech, light/medium/heavy), turrets with HP |
| The Wars / The Wars II Evolution (2009/2013) | Stone Age to space war; **9 levels**; adds World War and Roman eras | - | Fan sequel frequently mislabelled |
| We Are Warriors! (mobile, 10M+) | Stone, Iron, Modern within a timeline; **evolving resets you into a new timeline** (prestige loop), content visible to level 15 | 3 (melee, ranged, premium) | Gold from kills buys squad upgrades; food buys units |

**Theme palette the classics used** (useful for new Ageborn ages): cavemen and dinosaurs; Spartan/Greek hoplites with a Zeus spell; Egyptian with Anubis, priests, chariots and a desert sandstorm spell; medieval knights, mages and griffon riders; renaissance duelists, musketeers and cannons; modern infantry, machine guns, tanks and bombers; future cyborgs, spider blades, ion and plasma; Roman legions and World War trenches (The Wars). Each age had one signature "wow" unit (Assault Dino, Griffon Knight, Anubis, Tank, God's Wrath) and one signature spell.

**2010 sequel XP to evolve and spell cost per age:** Stone 7,000 (spell 2,000), Spartan 8,000 (2,500), Egyptian 9,000 (3,000), Medieval 10,000 (4,000), Renaissance 11,000 (5,000), Modern 12,000 (6,000), Future: none, Death Ray 7,000 XP deals 1,500 to all. Evolve cost grows only +1,000 per age; the length comes from flat bounties and a population cap (10 at the start).

## 2. In-battle upgrades: what existed

| Game | Unit stat upgrades | Ability upgrades | Turret / base | Economy |
|---|---|---|---|---|
| 2007 original | none | none | 1 to 4 slots (1,000 / 3,000 / 7,500); lower slots shoot farther; sell 50% | kill bounty 1.3x victim cost gold, 2.6x XP; start 175 gold, no passive income |
| 2010 sequel | per role, several levels each: Infantry Attack/Armour, Support Attack/**Range**, Anti-armour Attack/Armour, Armour unit (reset per age *(unverified)*) | 4th unit unlocked by a building per age (400-1,100) | up to 4 tower spots; turret range short | **Income level** (500, 1,100 ...): more gold per kill |
| Stick War Legacy | per unit type in the Armory / buildings | **Rage, Fire Arrows, Shield Wall, Shield Bash, Spear Throw, minion summon, Magikill spells**; Castle Archers tiers | Statue with Castle Archers (upgraded from the statue menu); Miner's Wall, Tower | Miners (Hustle faster mining), **Passive Income 1/2/3 = 5/10/15 gold+mana every 5 s**; pop cap trade (miners cost pop) |
| Stick War 2 Order Empire | skill tree | abilities per tree | - | **2 upgrade points per campaign stage** (after level 8), spent between levels on 7 trees (Infantry, Archers, Cavalry, Mages, Dwarves, Wyverns, Wizards) |
| Battle Cats (in battle) | none in battle | Cat Cannon (fires on charge) | base | **Worker Cat levels 1-8**: rate and wallet rise each level (+50 wallet per level in battle) |
| Battle Cats (between battles, XP) | unit levels | - | **Cannon Power** (more damage but longer recharge), **Cannon Range** (max 6,000), **Cannon Charge** (faster recharge), Cat Base HP | **Worker Rate**, **Wallet** (+100 start wallet per level), **Research** (-0.2 s production per level from 2), **Accountant** (+5% kill money per level from 2), **Study** (+5% XP per level), **Cat Energy** (+10 cap per level) |
| Kingdom Rush | tower level 1-4 in battle, then 2 specialisations with 2-3 abilities each | hero levels 1-10 in battle-persistent XP, skill points to 4 skills | - | gold per kill and per wave call-early |

**Pattern.** Each successful game has three layers: (a) **in-battle choices** that cost the same currency as units (sequel role upgrades, Worker Cat, Stick War research), (b) **ability unlocks** that change behaviour (Rage, Fire Arrows, Shield Wall, tower specialisations), and (c) **between-battle permanent upgrades** bought with a skill-earned currency (stars, treasures, upgrade points, XP). Ageborn today has (a) only as Treasury and turret mounts, and (c) only as card levels.

## 3. Difficulty

| Game | Levels | What changes | Reception |
|---|---|---|---|
| 2007 original | Normal, Harder, Impossible | enemy HP and damage x1.3 / x2; AI pays nothing, evolves on a timer | "rigged", "cheating AI with infinite money"; beating Impossible is a badge of honour |
| 2010 sequel | Easy, Medium, Hard, Insane | Insane: enemy "already in futuristic, has all the upgrades, max money, max experience" *(player report)*; AI fires a spell after each evolve | "easy is way too easy, normal way too hard"; one player (2026) "wished it were more difficult"; Insane stalemates 40+ min |
| Stick War Legacy | Normal, Hard, Insane (per level, crown for each) | Insane: enemy damage and HP up, **AI more aggressive and cunning, stronger spells and reinforcements, statue skins** | crowns give a reason to replay each level three times; tournament Hard/Insane finals felt "overpowered even with 25 upgrades" |
| Battle Cats | star difficulty per stage (up to 9 stars), later chapters | enemy **strength magnification** (e.g. starred aliens 1,600% until treasures reduce it) | the chapter replay (Ch. 2, 3 = same map harder) triples content cheaply |
| Kingdom Rush | Casual / Normal / Veteran *(unverified detail)* + per-level Heroic and Iron challenges | Heroic: 6 elite waves, 1 life; Iron: 1 giant wave, restricted towers *(unverified detail)*; upgrade rows limited per challenge | challenges are the most praised replay content |

**Lessons.** Named levels with visible rewards (crowns, stars) beat an invisible multiplier. Behaviour (aggression, spell timing, composition, upgrade buying) should do most of the work; small, labelled stat or economy bonuses are acceptable only at the top level and should be shown to the player. Avoid a cliff between the first two levels: the step from Easy to Normal must be the smallest.

## 4. Match length and pacing

| Game | Typical match | Per age | Source of length |
|---|---|---|---|
| 2007 original | 15-30 min Normal; speedrun "Impossible 18 min", "all 3 difficulties in 43 min" | AI ~195 s per age | XP curve x3.5 per age; lane crossing ~23 s |
| 2010 sequel | ~15-25 min *(unverified)*; Insane "4 min" with a 2x speed exploit; Hard stalemate 40+ min | XP 7,000-12,000 | pop cap 10, flat prices, 2x speed button |
| Stick War Legacy | ~5-15 min per level *(unverified)* | no ages | economy build-up, pop cap |
| Battle Cats | 1-5 min early stages, 10+ min late | no ages | wallet cap and cooldowns |
| Kingdom Rush | ~8-15 min per level | no ages | fixed wave count |
| Ageborn (A17 today) | Short 4:45, Standard 6:30, Full 8:30 median | ~56 s (Full) | Overdrive/Siege/Final Bell clocks |

The classics spent **2-4 minutes per age**. Players still complained the original was "too slow" and asked for a speed-up button, so the answer is not "slow walking" but **more to do per age**: more units unlocked inside an age, upgrades to buy, a signature ability to earn, and an AI that pushes back.

## 5. Campaign and level maps

- **Plants vs Zombies:** 5 worlds x 10 levels, each world a new board rule (day, night with no sun, pool lanes, fog, roof). Almost every level ends with a new plant; level 5 of each world is a minigame, level 10 a special level (conveyor or boss). Start with 6 seed slots, buy more in Crazy Dave's shop (unlocked after 3-4). Teaching principle (George Fan, GDC 2012): teach one thing at a time inside play, not with text ("tutorial chameleon").
- **Kingdom Rush:** 12 levels on a painted world map; 3 stars by lives lost, +1 Heroic, +1 Iron = 5 per level (60 total in the base campaign); stars buy the upgrade tree between levels. Stars are the pacing gate for upgrades.
- **Battle Cats:** 48 stages per chapter, 3 chapters of the same map with rising magnification; each stage drops treasures that give permanent bonuses; stages cost energy (a pure time gate, which Ageborn must not copy).
- **Stick War Legacy:** 12 classic campaign stages + 6 bonus stages, each against a named tribe (Archidons, Swordwrath, Magikill, Speartons) with a final boss giant; Normal/Hard/Insane crowns per stage; separate Crown of Inamorta tournament against 12 of 24 named champions; weekly Missions mode.
- **2010 sequel Generals mode:** 10 named AI generals with their own strategies (Brom "the Basher" free, Hades unlocked by finishing classic mode, others themed on Leonidas, Hannibal, Rameses, Genghis Khan, Napoleon...). Ageborn's Conquest (9 Generals) is the same idea; a map makes it feel like a journey.

## 6. What players loved and complained about (consolidated)

**Loved:** the evolution fantasy (cavemen to lasers); a signature unit and spell per age; the funny egg/chicken turret; beating the hardest level; discovering strategies; big late-game payoffs; per-level crowns and stars; named opponents with personalities; Stick War's direct control of units (lead one unit) and Hold/Defend/Attack stance buttons.

**Complained:** AI cheating (free gold, x2 stats, instant evolve, spell on your empty moment); turret-only wins or useless turrets; stalemates; too slow walking without a speed button; solved within an hour; difficulty cliffs; "flashing reminder to upgrade to the next age is obnoxious"; short campaigns with nothing after; wish for online play.

## 7. Recommendations for A18 (concrete, data-driven)

1. **Slow ages down by content, not walking speed.** Target 90-150 s per age in Full War (roughly 2x today) and extend format medians accordingly (e.g. Full ~14-18 min, Standard ~10-12, Short ~7). Raise the XP curve steepness (classics: x3.5 per age in 2007) and stop the "a few soldiers win" pattern by making bounty XP depend on what you kill, not what you spend.
2. **Add per-role in-battle upgrade tracks** (content data, 3 levels each, reset or carried per age): Melee Attack, Melee Armour, Ranged Damage, **Ranged Range**, Heavy Armour, **Turret Range** (capped so no turret reaches midlane: max +15% and never past 35% of the lane), **Bounty** (+% gold per kill, like Income level / Accountant), plus Treasury as the passive track.
3. **Add one ability unlock per unit role per age** (like Rage, Fire Arrows, Shield Wall): bought in battle, changes behaviour, shows a visible effect. This answers "more ways to upgrade their abilities" and gives each age more to do.
4. **Unlock the 3rd/4th unit inside an age with a building or research** (the sequel's Dino Hut ... Factory), so an age has an opening, middle and late phase.
5. **Difficulty picker** (already in progress by another agent): 5 named levels with the smallest step at the bottom, behaviour-first; any bonus at Hard+ must be shown; crowns per difficulty per map node (Stick War) give replay.
6. **Campaign map**: 5-8 regions x 8-10 nodes, each region themed on an age, a named AI General per region boss, nodes that each teach or unlock one thing (PvZ cadence: new card, new rule, minigame/challenge node at 5, boss at 10), 3 stars per node by base HP left (Kingdom Rush), and stars as a second upgrade currency for a permanent doctrine tree with mutually exclusive branches. No energy or timers.
7. **More ages**: candidates from the classics that Ageborn lacks: Egyptian/Desert, Greek/Spartan (if Bronze does not already cover it), Roman, World War/Trench, Space (if Cosmic does not already cover it). Adding 2-4 ages is less important than giving each age 90+ s of decisions.
8. **Hold/Attack**: Stick War's Defend/Hold/Attack buttons are among its most praised controls; Ageborn's Charge/Hold stance should be prominent in the HUD and taught early.

---

## Sources

- Earlier Ageborn deep dive with decompiled numbers and player quotes: `docs/research/aow-deepdive.md`
- [Flash Gaming Wiki: 2010 sequel page](https://flashgaming.fandom.com/wiki/Age_Of_War_2)
- [Flash Gaming Wiki: 2007 original page](https://flashgaming.fandom.com/wiki/Age_of_War)
- [Community wiki: The Wars II Evolution](https://aowg.fandom.com/wiki/The_Wars_II_Evolution), [The Wars](https://aowg.fandom.com/wiki/The_Wars), [Generals Mode](https://aowg.fandom.com/wiki/Generals_Mode)
- [Game walkthroughs: 2010 sequel walkthrough (upgrade list)](http://seegamewalkthroughs.blogspot.com/2011/12/age-of-war-2-walkthrough.html)
- [Armor Games community: 2010 sequel guide (upgrade prices, 1,500 gold Support Range)](https://armorgames.com/community/thread/5636854/age-of-war-2-guide)
- [Armor Games community: guide to Easy, Medium and Hard](https://armorgames.com/community/thread/5671254/guide-to-beating-age-of-war-2-in-easy-medium-and-hard)
- [Max Games guide for the 2010 sequel](https://www.maxgames.com/guides/age-of-war-2.html)
- [JayIsGames review of the 2010 sequel](https://jayisgames.com/review/age-of-war-2.php)
- [App Store reviews of the 2010 sequel](https://apps.apple.com/us/app/age-of-war-2/id1194118663?see-all=reviews)
- [Stick War Wiki: Passive Income](https://stick-war.fandom.com/wiki/Passive_Income), [Insane mode](https://stick-war.fandom.com/wiki/Insane_mode), [Upgrade point](https://stick-war.fandom.com/wiki/Upgrade_Point), [Game updates (Legacy)](https://stick-war.fandom.com/wiki/Game_Updates_(Stick_War:_Legacy)), [Crown of Inamorta](https://stick-war.fandom.com/wiki/Crown_of_Inamorta), [Final Boss](https://stick-war.fandom.com/wiki/Final_Boss_(Stick_War:_Legacy)), [Campaign Mode](https://stick-war.fandom.com/wiki/Campaign_Mode)
- [Stick Empires Wiki: Armory](https://stickempires.fandom.com/wiki/Armory)
- [Steemit review of Stick War: Legacy](https://steemit.com/gaming/@colovhis/stick-war-legacy-review), [TapTap reviews](https://www.taptap.io/app/2597/review), [justuseapp reviews](https://justuseapp.com/en/app/1001780528/stick-war-legacy/reviews)
- [Battle Cats Wiki: Upgrade Menu](https://battle-cats.fandom.com/wiki/Upgrade_Menu), [Worker Cat](https://battle-cats.fandom.com/wiki/Worker_Cat), [Cat Cannon](https://battle-cats.fandom.com/wiki/Cat_Cannon), [Empire of Cats](https://battlecats.miraheze.org/wiki/Empire_of_Cats), [Stage Difficulties](https://battlecats.miraheze.org/wiki/Stage_Difficulties), [Main Chapters Levels](https://battlecats.miraheze.org/wiki/Main_Chapters_Levels)
- [Kingdom Rush Wiki: Upgrades](https://kingdomrushtd.fandom.com/wiki/Upgrades), [Campaign](https://kingdomrushtd.fandom.com/wiki/Campaign), [Heroic Challenge](https://kingdomrushtd.fandom.com/wiki/Heroic_Challenge), [Iron Challenge](https://kingdomrushtd.fandom.com/wiki/Iron_Challenge)
- [TheGamer: best Kingdom Rush upgrades](https://www.thegamer.com/kingdom-rush-best-upgrades/), [Supercheats: Kingdom Rush upgrades](https://www.supercheats.com/kingdom-rush/walkthrough/upgrades)
- [Steam discussion: Kingdom Rush Frontiers hero level 10](https://steamcommunity.com/app/458710/discussions/0/360670708787507239/)
- [Plants vs Zombies Wiki: Adventure Mode](https://plantsvszombies.fandom.com/wiki/Adventure_Mode), [Seed slot](https://plantsvszombies.fandom.com/wiki/Seed_slot), [Crazy Dave's Twiddydinkies](https://plantsvszombies.fandom.com/wiki/Crazy_Dave's_Twiddydinkies), [StrategyWiki walkthrough](https://strategywiki.org/wiki/Plants_vs._Zombies/Walkthrough)
- [GDC Vault: George Fan, "How I Got My Mom to Play Through Plants vs. Zombies"](https://www.gdcvault.com/play/1015541/How-I-Got-My-Mom), [Game Developer summary](https://www.gamedeveloper.com/design/video-how-i-got-my-mom-to-play-through-i-plants-vs-zombies-i-)
- [We Are Warriors: Evolution explained](https://www.appgamer.com/we-are-warriors/evolution-explained), [Talk Android guide](https://www.talkandroid.com/70085-we-are-warriors-game-guide/)
