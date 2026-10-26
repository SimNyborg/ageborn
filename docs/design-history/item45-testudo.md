# Queue item 45: Roman legionaries with the tortoise formation (design pass)

> Kept in the repo on 2026-10-26 (copied from the orchestrating session's scratch folder). Paths under `/tmp/claude-0/...` or `scratchpad/...` inside point at that session's working files (captures, scripts) and may no longer exist. The owner questions are tracked in `docs/owner-queue.md`; until answered, the recommended defaults apply.

Date: 2026-10-26. Designer pass for owner queue item 45. Nothing here is built; the repository was read only.

Inputs: `CLAUDE.md`; `docs/owner-queue.md` items 12, 15, 42, 44 and 45; `docs/design-history/item12-upgrade-paths.md` and `docs/design-history/item42-gold-building.md` (style and the P0 gate); `scratchpad/content/CONTENT_PLAN.md` (X0: M1-M5, roster shape, stat templates, the Bronze wave); DESIGN A2.6, A2.7 (formation and ranks, targeting, attack cycle, damage pipeline, stacking caps), A2.8, A2.14, A5.1, A7.1-A7.4, A9.2, A11, A12, A16.1, A16.5, A16.17-A16.19, A17.9, A18.2-A18.4, A18.7, A18.8, A18.9, A18.12, B3, B12; `docs/ui-plan.md` U4, U8, U11, U14, U15; the code in `src/sim/{damage,state,rules,step,hashState,replay,duel}.ts`, `src/sim/systems/{impacts,projectiles,movement,training,abilities}.ts`, `src/contracts/{content,sim,observation,events,art}.ts`, `src/content/{rosterShape,album,cardArena,schema,generals}.ts`, `src/content/raw/{bronze,warPath,economy}.ts`, `src/ai/{book,counters,scoring,brain}.ts`, `src/render/{battleView,eventMapper}.ts`, `src/visuals/adapters/{atlas,atlasMotion}.ts`, `src/audio/sounds.ts`, `tools/{proxies,README}.md|ts`, `art/blender/README.md`, `art/blender/units/{shield_bearer,rhodian_slingers}.py`.

**Measurements.** Two read-only scripts in this folder: `cover_scan.mts` classifies every ranged attack in the content under the proposed coverage rule (no sim runs), and `testudo_overlay.mts` runs the proposed lock and open rules beside 22 real headless matches (tier VII Echo, baseline plans) without feeding anything back into play. Every overlay number is *indicative*: Bronze Hoplites stand in for legionaries, there is no half pace and no lost attack, and n is small. Other agents shared the machine (load average 1.5-8.8); no quiet lock was set while the scripts ran, and each batch took 5-20 s. Web facts come from search-result summaries: wikipedia.org and lexundria.com did not resolve from this environment, so their details are as summarised.

---

## 0. Summary

- **Recommendation: Option A, the Legion** (card name "Legion", working name for the troops "legionaries"): a new Bronze Epic. One card trains **four Roman legionaries** (an X0 squad, widened from 2-3 to 4). When an enemy shot that shields can stop (an arrow, javelin, sling stone or bolt, from a troop, turret or tower) is aimed at them, they **lock shields into a tortoise by themselves**: shields in front, on the near side and overhead. Closed, they take **70% less damage from those shots**, walk at **half pace** and **do not attack**. The moment an enemy comes within 50 lu, or they reach something to hit, the shields swing open and they fight as infantry.
- **A clear tell and real counterplay.** The lock takes 0.4 s (a crouch, a rippling clack, dust at the shield feet); the closed shell is a new silhouette in team colour with a small shield glyph; arrows glance off and stick in the shields. Answers: close combat (it opens), fire, boulders, explosions and lasers (Sun Mirror, Onager, Gorgon Bust, every gunpowder weapon), every Age Power, stuns and knockbacks (they break the shell), slows (it crawls), and killing legionaries (one alone cannot close).
- **The coverage rule is data, and it ages well.** Under it the shields stop 14 of 16 ranged attacks in Stone, 13 of 16 in Bronze and 12 of 16 in Medieval, but only 5 of 19 in Gunpowder and 0-3 in each later age (`cover_scan.mts`). The tortoise is an ancient-age tool that fades exactly when gunpowder arrives, with no special rule.
- **It is situational, not a must-pick** (indicative overlay): in today's battles the tortoise would be closed for only 0.1-0.9% of a unit's life, in spells of 0.3-1.4 s at the median and 4 s at most, even against a turret turtle or mono Ranged. Armies close the gap fast and turtles hold a melee line inside their turret cover. Its value is the last stretch under turret fire, ranged-heavy armies and Long range back lines. The gate checks both sides: the formation must add +2 to +8 points to the card, never carry it.
- **One narrow exception to a hard rule.** A18.2 floors damage taken at −35%. At 35% and half pace a tortoise would take 1.3× the damage per lane length it crosses, so it would be pointless. The exception covers only a closed tortoise against shots it stops, and nothing else stacks on top (no research, no Mail, no auras).
- **The AI plays it and answers it** with the same commands and public information: the regenerated counter matrix values it against Ranged and answers it with melee and Heavies; its push gate halves the arrow turrets it must beat when its own front has a Legion; it prefers a turret the shields do not stop against a scouted Legion. Kettle and Rook carry it.
- **No new button.** It is a tray card; the state shows on the lane; a first-seen caption, an adaptive counter hint and a Result tip teach both sides.
- **Placement: the Bronze age, as "the legions come to Hellas".** Bronze already names two Roman engines (Scorpion, Onager), and the first recorded tortoise was a Roman attack on a Macedonian town, Heracleum, in 169 BC. Bronze becomes 8 / 6 / 5 / 2; the card gets album No. 321; the Epic pool grows from 40 to 41.
- **Plan:** about 9-12 agent-days, merged into items 12 and 42's prototype gate and contract bump (one gate, one golden re-record).
- **Three owner questions** (section 8): by itself or by a power card; Bronze now or wait for a Roman age; four legionaries or one block.

---

## 1. The goal

### 1.1 In the owner's words

> "In the Roman era it could be cool to have the option of the tortoise formation (testudo) with the classic Roman legionaries." (owner, 2026-10-25, `docs/owner-queue.md` item 45, translated from Danish)

The orchestrator's reading with it: there is no Roman age, Bronze is classical antiquity with a Greek face, so the legionaries join it as a new card; the tortoise must differ in form from today's passive Shield Wall (a visible state with a clear tell and real counterplay); the starting shape is an Epic legionary squad that locks shields by itself under ranged fire (about 70% less ranged damage, half speed, no attacks) and opens into a fighting line when melee foes reach it; splash, area attacks, powers and melee counter it; the AI plays and answers it; the open question is automatic or player-triggered.

### 1.2 What "done" means for a player

1. **An option you choose:** a Legion card in your Bronze War Plan, earned like any Epic.
2. **What you see:** four legionaries march out behind tall curved shields. When the enemy's archers draw on them they crouch, the shields slam together in a ripple, front, side and roof, and the shell shuffles forward while arrows glance off and stick in the wood. When the enemy closes in, the shields swing open with a shout, the short swords come out and they fight. A boulder, a sunbeam or a power hits them at full force, and a stun or a charge knocks the shell apart.
3. **What you hear:** the clack of the lock, the dull tock of glancing arrows, the scrape and shout of the break.
4. **What you decide:** whether to bring it to Bronze (against ranged-heavy enemies and arrow turrets); when to send it (to lead an assault into turret fire, ahead of your own ranged, or to escort a Wooden Horse to the gate); and, facing it, how to answer (melee, Sun Mirror, Onager, a power, a stun).
5. **Fair and readable:** a state everyone can read, a clear tell, real counterplay, never an unkillable blob, a stall or a must-pick, used and answered by the AI under the player's rules, no new button, and it works on a phone at 844 × 390, with Graphics Lite and with Reduce motion.

---

## 2. What exists today

### 2.1 Shield Wall and every other damage reduction

| Source | Rule | Where |
|---|---|---|
| Footman (Medieval Common) | Shield Wall: −25% from attacks with range ≥ 100, never powers | A5.3, ability `resist` |
| Shield Bearer (Bronze Common, Guard) | −25% from range ≥ 100 | `raw/bronze.ts` |
| Star Legionnaire (Cosmic Common) | Deflector: −20% from range ≥ 100 | `raw/cosmic.ts` |
| War Council, Infantry rank II "Shield Wall" | −20% from range ≥ 100, −8% speed | `raw/research.ts` |
| Cover walls (Hoplon Line, Star Bulwark) and the Sandbag Bunker | own ground units within 60 lu behind: −20% from range ≥ 100 | A16.14.3 |
| Bulwark (Heavy II), Rally (Support II) | aura: −10% damage taken | A18.5.2 |
| Plating, Skirmish | −15% / −20% from Infantry | A18.5.2 |
| Mail | a flat cut per hit | A18.5.2 |
| Forts | ×0.5 from range ≥ 100, as a type mod outside the floor | A16.14.2 |
| **All unit reductions** | summed at pipeline step 4 and floored at **−35%** ("no unit ever takes less than 65% of a hit", A18.2 rule 4); powers and Last Stand skip them | `sim/damage.ts` `unitDamage` |

Every unit reduction today is **passive, invisible and small** (10-25%): always on, no state, no tell, no decision for either player.

### 2.2 Squads, the Dread aura, stances and the formation rules

- **Squads (X0 M1, SIM 7.0.0).** One train command spawns 2-3 members of the card at p 20 on the same tick; stats are per member; cost and pop are the group's, split evenly (bounty and XP on cost ÷ count). Members are ordinary units for targeting, power caps (a squad soaks cap slots, the designed "formation skill" of A2.9.5), stances and research. Eight squads ship, one per age. The schema allows count 2 or 3, only on Infantry or Ranged cards, with pop and cost divisible by the count. After spawn the sim keeps **no squad identity**. The duel harness and the card showcase handle squads generically.
- **The Dread aura (X0 M4, SIM 7.1.0).** `aura.foe` puts a slow or mark on enemy ground units within a radius (Tragic Chorus in Bronze: 20% slower within 130 lu). It is recomputed every tick from positions and hashes as before: the precedent for a per-tick state that moves no old golden.
- **Stances (A18.4).** Charge, Hold (a flag at p 320-800) and Fall back, with no cooldown; bots keep 3 s between stance commands.
- **Formation and ranks (A2.7, SIM 8.0.0).** A soft single file with a three-wide front; ranged units keep 25% of their range behind their melee front (Long range and artillery 40%); a unit cannot pass a moving ally ahead with a shorter or equal range, so **a slow front slows everything behind it**.
- **Engagement freshness, first-hit bonuses and Brace** (immune to knockback and first-hit bonuses) exist; a stun or a knockback cancels a pending windup.

### 2.3 Ranged, arcing, splash, powers and turrets, as the sim sees them

- **"Ranged" for resists** is the source attack's range ≥ 100 lu (`Impact.srcRange`); every turret counts (their ranges are 130-480 lu). Powers and Last Stand never count.
- **"Arcing" is a view flag only:** `projectile.arc` draws the parabola; the sim never reads it. Arcs are the Long range Rares (35 lu splash at 300 lu/s), arc turrets (Onager, Rock Thrower, Trebuchet...) and lobs.
- **Area attacks:** splash (aimed at a point), pierce, chain, cleave, line, gate zone and follow-behind deal 100% to the primary and 50% to others, at most 4 targets; powers are exempt and obey their own caps (1-6 targets).
- **Damage types** sit on every attack (blunt, slash, pierce, bullet, laser, blast); today the sim uses them only for events.
- **Turrets** are invulnerable, target `front` from their own gate and deal ×0.5 in Siege.

### 2.4 The Bronze roster and its identity

"Bronze Age: Hellas", mechanic line "Piercing throws, damage auras, turret stuns and the sweep power", flavour "Hoplites, gorgons and bronze giants under the eyes of the old gods". The roster after the X0 wave (8 / 6 / 4 / 2):

| Rarity | Troops |
|---|---|
| Common (8) | Hoplite, Javelineer, War Chariot (starters); Shield Bearer (Guard), Thracian Raider, Rhodian Slingers (Trio), Discus Thrower, War Elephant |
| Rare (6) | Phalangite (starter Anti-heavy); Standard Bearer, Cretan Archer (Long range), Belly Bowman, Aulos Piper, Tragic Chorus (Dread) |
| Epic (4) | Scorpion (bolt-thrower), Wooden Horse (siege), Amazon Rider (skirmisher), Minotaur (brawler) |
| Legendary (2) | Bronze Colossus, Hydra |

Turrets: Archer Tower and Sun Mirror (starters), Net Caster, Onager, Polybolos, Gorgon Bust. Powers: Tidal Wave and Chariot Rush (starters), Aegis, Zeus Bolts, Medusa's Gaze, Apollo's Arrow, Sandstorm, Charybdis. Forts: Cyclopean Wall, Pyrgos Tower, Muster Tents, Hidden Stakes, Hoplon Line, Slinger Camp. The world: the Hellas scene, the Ziggurat base and the Acropolis and Colossus base skins. History and myth mix freely: Rhodian, Cretan and Thracian mercenaries next to the Hydra, Medusa and a Rhodian Colossus.

### 2.5 Why the tortoise must differ in form

1. **A fifth passive adds nothing.** Shield Wall exists on two Commons, a Cosmic Common and a research pick.
2. **The testudo is a formation you watch form and break.** That is what makes it "cool" and what the owner pictures.
3. **A visible state with a cost creates decisions** for both sides, the five tests of A16.1: a trade-off, information, counterplay, attribution and state-dependence.
4. **The −35% floor would make it pointless.** At half pace a unit spends twice as long under fire; at 35% less damage it takes 0.65 × 2 = **1.3×** the damage per lane length. The tortoise needs more than the floor allows (5.5).
5. **No new always-visible control** (A16.1), and the game has no unit commands.

### 2.6 What the overlay says (indicative)

The proposed rules (5.2) ran beside real matches on the sim's own positions and targets, tracking Bronze infantry (the Hoplite in the baseline plans):

| Setup (tier VII Echo, baseline plans) | Closed share of a unit's life | Closes per unit | Closed spell median / p90 / max | Shots the shields stop, share of damage taken | Of it landing while closed | Damage the shields would save |
|---|---|---|---|---|---|---|
| One-age Bronze mirror (`w1.bronze`), n = 4 | 0.5% | 0.42 | 0.5 / 1.4 / 2.9 s | 10.3% | 2% | 0.2% |
| Short War mirror (Stone-Bronze-Medieval), n = 4 | 0.4% | 0.20 | 0.3 / 1.9 / 2.0 s | 4.0% | 5% | 0.1% |
| Attacker vs `turret_turtle`, `w1.bronze`, n = 6 | 0.1% | 0.27 | 0.5 / 2.2 / 2.2 s | 16.0% | 2% | 0.2% |
| Attacker vs `mono_ranged`, `w1.bronze`, n = 4 | 0.9% | 0.48 | 1.4 / 3.8 / 4.0 s | 33.0% | 8% | 2.0% |
| Attacker vs `longrange_turtle`, `w1.bronze`, n = 4 | 0.7% | 0.89 | 0.5 / 2.3 / 4.0 s | 17.0% | 4% | 0.4% |

What it says:

1. **The approach under fire is short in this game.** The window is about (the enemy's range − 50 lu) ÷ the closing speed: 1-4 s. Two advancing fronts close at about 160 lu/s, and turtles hold a melee line inside their turret cover, so attackers meet melee about 2 s after the first arrow.
2. **So the tortoise is situational.** It matters on the last stretch to a base whose army is broken, against Long range back lines, against ranged-heavy armies and when a held line is shelled. With half pace the closed spells would roughly double (no feedback here), still seconds.
3. **Powers deal 16-73% of the damage infantry takes**, and powers pass the shields by design, so the tortoise never makes anything immune.
4. **For the numbers:** the formation's stat budget is small (5-10%); the gate must prove it has teeth where it should (duels against Ranged) and that it never carries the card (5.6).

---

## 3. Lessons from history and from games

### 3.1 History

| Source | What it says | Lesson for Ageborn |
|---|---|---|
| Livy 44.9 and Polybius 28.11-12: Heracleum, 169 BC (Third Macedonian War) [1][2] | The first recorded testudo: a roof of locked shields, stepped down in height, practised as a display at the games and used as a living ramp to take a Macedonian town | The tortoise was born in Rome's wars with the Greek world: the Legion belongs in Hellas |
| Cassius Dio 49.30: Antony against the Parthians, 36 BC [3][4] | Shields locked into a roof that men could walk on and horses and carts could cross; two uses: assaulting walls, and kneeling together under archers so the enemy thinks them spent, then rising suddenly | Strong against missiles; a visible state that changes the enemy's behaviour; the break is a burst |
| Plutarch, Antony 45 [5] | The Parthians, seeing the kneeling Romans, dropped their bows and closed in; the Romans rose and drove them off with javelins | The tortoise invites close assault; opening at contact is historical |
| Cassius Dio 40.22-24; Plutarch, Crassus 25: Carrhae, 53 BC [1][6][7] | Locked shields kept arrows out but let the cataphracts charge in; opening ranks to meet them exposed the men to arrows again; strong composite-bow arrows pierced shields | The dilemma is the counterplay: missiles plus a charge beat it; close assault and charges break it |
| Tacitus, Histories 3.27-29: Cremona, AD 69 [8][9] | Defenders rolled heavy stones onto the testudo and pried its roof apart with poles and spears; finally they pushed their own ballista off the wall onto it | Heavy stones, artillery and close assault break it: blast and big splash pass the shields |
| General accounts [1][10] | Used against missile fire on open ground and to close on walls; it costs speed and mobility and cramps the men | Half pace; no attacks; a fatigue lever if a held tortoise stalls |

### 3.2 Games (quality references only; no names or shapes are copied)

| Game and mechanic | How it works | What works | What goes wrong | Lesson |
|---|---|---|---|---|
| Total War (Rome series), testudo [10][11][12] | A player-ordered formation for legionaries: much less missile damage, slow, turns slowly, cannot run, rear uncovered; mods add a melee penalty | The iconic image; a clean trade of missile safety for mobility | Players argue it should give "no benefits outside missile protection"; melee bonuses in one entry drew complaints; luring enemy archers onto a bait unit is debated as "cheese" | Missiles only; no melee bonus; slow; watch the bait-sponge use |
| Warcraft III, Footman Defend [13][14] | A toggle: −50% piercing damage (65% before patch 2.0.2), −30% move speed, a 25-30% chance to reflect | A readable shield stance tied to one damage type, with a cost | A micro chore toggled by hand; trimmed from 65% to 50% | Tie the shield to damage types; without unit commands, make it automatic |
| StarCraft II, Sentry's Guardian Shield [15] | A cast: allies in a 4.5 radius take 2 less damage per ranged hit for 12.86 s, for 75 energy | A timed zone that blunts ranged fire | Value hinges on timing | Option B would look like this: a timed zone, ranged only |
| Plants vs. Zombies, the Screen Door Zombie [16][17] | The door blocks straight shots; lobbed shots go over it | The counter reads from the shot type at a glance | | The attack's type decides, and it must show (our roof is the inverse: it stops falling arrows, not boulders) |
| Clash Royale, Guards, Royal Recruits, Dark Prince [18][19] | A shield pool absorbs the first hit or hits; excess damage is lost; the shield visibly breaks | A visible state with an obvious end | The Dark Prince's shield needed a 25% cut (2018) | A shield state must read and end clearly, and needs careful tuning |
| Stick War series, the Spearton's shield stance [20] | Speartons raise shields, stop moving and attacking, take about 37.5-40% less damage | The genre's own shield stance on one lane | Needs unit commands; all offence stops | A one-lane game can carry a shield state; ours must run by itself |
| Internal: `docs/research/a18-classics.md` | Stick War Legacy's Shield Wall is one of the upgrades players remember; "+10%" upgrades are not | | | A formation is remembered as a feature, not a percentage |

### 3.3 What makes a shield state fun, readable or degenerate

1. **Missiles only, and the shot type decides.** A player reads it: an arrow glances, a boulder, a fireball, a sunbeam or a power does not.
2. **A visible state with a tell and an end:** the lock (crouch, slam, clack), the shell silhouette, the break (shields out, a shout).
3. **A real cost:** slow, no attacks, never a melee bonus.
4. **Close assault breaks it.** It is historical, and it gives the opponent's melee a job.
5. **Without unit commands it must run by itself, predictably.** A toggle by hand is a chore; a rule is a read.
6. **Bounded:** never immune (powers, blast and lasers always hurt; at least 1 HP per hit), no stacking on top, a lone legionary cannot close, and a fatigue lever ready for a held tortoise.
7. **Public:** the opponent, the bots and the replay see the same state.
8. **Degenerate shapes to gate:** an unkillable blob (heals and shields on a closed tortoise), a missile sponge that stalls a held line, and a must-pick that every ranged-facing plan needs.

### 3.4 Sources

Search-result summaries; most pages could not be opened from this environment.

1. Wikipedia, Testudo formation: https://en.wikipedia.org/wiki/Testudo_formation
2. Livy 44.9 and Polybius 28.11-12 on Heracleum, as quoted in: https://www.romanarmytalk.com/rat/showthread.php?tid=19567 ; Grinnell College, columns exhibit, testudo: https://classics.sites.grinnell.edu/exhibits/show/columns-exhibit/comparative-sequences/testudo
3. Cassius Dio, Roman History 49.29-30 (Lexundria): https://lexundria.com/dio/49.30/cy ; https://lexundria.com/dio/49.29/cy
4. Smith's Dictionary of Greek and Roman Antiquities, Testudo (LacusCurtius): https://penelope.uchicago.edu/Thayer/E/Roman/Texts/secondary/SMIGRA*/Testudo.html
5. Plutarch, Antony 45, as quoted by Imperium Romanum: https://imperiumromanum.pl/en/roman-army/military-formations-of-ancient-romans/testudo/
6. Plutarch, Crassus 25 and Carrhae: https://www.thecollector.com/battle-of-carrhae-crassus/ ; https://historynet.com/what-we-learned-from-the-battle-of-carrhae/ ; https://penelope.uchicago.edu/encyclopaedia_romana/miscellanea/trivia/carrhae.html
7. War History, Rome's great rival in the east, Parthia: https://warhistory.org/article/romes-great-rival-in-the-east-parthia?amp=0
8. Tacitus, Histories 3.27-29 (Sacred Texts, Church and Brodribb): https://sacred-texts.com/cla/tac/h03030.htm
9. Universität Hamburg, Das Vierkaiserjahr, Einnahme Cremonas (Latin and German): https://emanualaltegeschichte.blogs.uni-hamburg.de/wp-content/uploads/Orginaltext-Das-Vierkaiserjahr-–-Einnahme-Cremonas.pdf
10. Tastes of History, About history: testudo: https://www.tastesofhistory.co.uk/post/about-history-testudo ; Rome II tactics blog: https://erp.blackboxoperations.com/blog/rome-2-total-war-battle
11. TWCenter, Rome: Total War unit guide and testudo thread: https://www.twcenter.net/threads/rtw-unit-guide-complete-thread-dont-post.224654/ ; https://www.twcenter.net/threads/testudo-formation.534699/
12. Steam, Total War: Attila discussion (testudo melee bonuses): https://steamcommunity.com/app/325610/discussions/0/618457398975804018/?ctp=2 ; Total War: Warhammer III discussion (bait units): https://steamcommunity.com/app/1142710/discussions/0/5635717345344101534 ; Rome II mod changelog (testudo melee penalty): https://steamcommunity.com/sharedfiles/filedetails/changelog/2490681903?p=5
13. Liquipedia, Warcraft III, Defend: https://liquipedia.net/warcraft/Defend
14. Warcraft Wiki, Footman (Warcraft III) and Patch 2.0.2: https://warcraft.wiki.gg/wiki/Footman_(Warcraft_III) ; https://warcraft.wiki.gg/wiki/Warcraft_III/Patch_2.0.2
15. Liquipedia, StarCraft II spells (Guardian Shield): https://liquipedia.net/starcraft2/Spells
16. Plants vs. Zombies Wiki, Lobbed shots: https://plantsvszombies.fandom.com/wiki/Lobbed_shots
17. Plants vs. Zombies Wiki, Kernel-pult: https://plantsvszombies.wiki.gg/wiki/Kernel-pult_(PvZ)
18. Liquipedia, Clash Royale, Guards and Dark Prince: https://liquipedia.net/clashroyale/Guards ; https://liquipedia.net/clashroyale/Dark_Prince
19. Sportskeeda, the Guards in Clash Royale: https://sportskeeda.com/esports/how-play-the-guards-clash-royale-abilities-strategies
20. Stick War Wiki, Spearton and Shield Wall: https://stick-war.fandom.com/wiki/Spearton ; https://stick-war.fandom.com/wiki/Shield_Wall

---

## 4. Options

### 4.0 Rules every option keeps

1. Nothing sold, no new currency; the card is earned like any card.
2. Public state: both sides, the bots and replays see the formation (A7.1).
3. Same rules for bots; difficulty changes behaviour, never stats.
4. Content is data in `src/content`; integer math; new state hashed only where it is used; every change sim-visible in one contract bump (shared with items 12 and 42).
5. No new always-visible control; a denied press says why; nothing flashes to nag (U11, U14).
6. Art through the ArtProvider and the manifest; the sim owns all timing; presentation offsets never change play.
7. Our own names and look; i18n keys for every string; nothing named after the classic Flash game or its units.

### 4.1 Option A: the Legion, an Epic squad that closes into a tortoise by itself (recommended)

**Idea.** A new Bronze Epic, `legion`: one card trains four legionaries (a squad of 4, each 2 pop and 50 gold of the card's 200). They fight as line infantry with a short sword behind a tall curved shield. A new ability kind, `formation`, closes the squad into a tortoise whenever a shot the shields stop is aimed at one of them, and opens it when an enemy closes in. The numbers are in 5.2.

**How the state machine reads** (each legionary carries it; linked legionaries switch together):

| State | Enters when | Does |
|---|---|---|
| Open | the start; after Opening | Plain infantry: walks, fights |
| Closing (0.4 s) | a covered shot is aimed at it or at a linked legionary (another of this card within 40 lu); no enemy ground unit within 50 lu; nothing in reach; not Falling back, stunned or alone; 2 s since it last opened | Half pace, not yet covered: the tell |
| Closed | Closing completes | Covered shots ×0.30; half pace; starts no attack |
| Opening (0.3 s) | an enemy ground unit within 50 lu; something in reach (a fort, the base, a unit); no covered shot aimed at the group for 1.5 s; alone; Fall back | Stands; not covered; no attack yet |
| (dropped) | a stun or a knockback, drag or pull on it | To Open at once; the 2 s relock wait starts when the stun ends |

**The decision it creates.**
- *In the War Plan:* the Legion competes for a Bronze troop slot with four other Epics (Scorpion, Wooden Horse, Amazon Rider, Minotaur).
- *In battle:* when to send it: to lead a push into arrow turrets, in front of your own ranged, to walk a Wooden Horse to the gate; and when not to: into an Onager, a Sun Mirror, a melee wall or a ready Home power.
- *For the opponent:* meet it with melee, switch the turret to Sun Mirror or Onager, cast a power on the slow shell, stun it or charge it apart; do not build Archer Towers against it.
- The five tests (A16.1): a trade-off (an Epic slot, half pace, no attacks while closed), information (the lock, the shell, the glance, the card text), counterplay (below), attribution (you see arrows glance and the shell break), state-dependence (the enemy's mix, its turrets, the distance to its line).

**The tell and the counterplay.** The lock is the tell: 0.4 s of crouch and slam, a rippling clack, a dust puff; then the shell silhouette with a small shield glyph over the squad. Every answer is visible: melee walks up and the shell opens; boulders, sunbeams, fire pots and every power hit at full force; a Gorgon gaze or Medusa's Gaze stuns it open; Chariot Rush and War Chariot charges knock it apart; Tragic Chorus, Net Caster, Sandstorm and Charybdis slow a shell that already crawls; Tidal Wave and Zeus Bolts hit all four packed legionaries; kill three and the fourth cannot close.

**How the AI plays it** (`src/ai`, same commands, public information):
- *Training:* through the counter matrix, regenerated on the real sim (`tools/counters.ts`): its duels against Javelineers, Slingers, Discus and Cretan Archers start 300 lu apart, so the tortoise is in the numbers and f_counter rises against ranged-heavy armies. Tiers 0-II pick it at random weight; III and up by counter scoring.
- *Pushing:* in the push gate's defence value D (A7.2), an enemy turret whose attack the shields stop counts 50% (150 instead of 300) while the bot's frontmost ground unit is a legionary, so a bot with a Legion pushes into arrow turrets it would otherwise bank against (tier V and up).
- *Generals:* Captain Kettle's Bronze plan takes the Legion in place of the Amazon Rider (infantry spam and squads), Rook's in place of the Discus Thrower (it counters ranged-heavy players); procedural Commanders draw it from Arena 4 under A6.8; Echo of You plays the player's plan. The existing source filter keeps bots to cards a player at that point could own.

**How the AI answers it:**
- *Training:* the same matrix rates melee and Heavies well against it (Heavy beats Infantry; the shell opens at contact).
- *Turrets:* `bestTurretCard` already boosts anti-air turrets when it sees flyers; it gains the same boost (+50%) for a loadout turret the shields do not stop (Sun Mirror, Onager, Gorgon Bust) once an enemy legionary has been seen (tier V and up; tier VII remembers it).
- *Powers:* a closed legionary counts ×1.2 in the power option's value (it cannot step out of a zone at half pace; tier V and up).
- *Mistakes:* a tier-scaled "builds an arrow turret against a scouted Legion".
- *Observation:* each unit gains `formation?: 'closing' | 'closed' | 'opening'`, as public as its HP.

**HUD and feedback.** No new control (A16.1). The Legion is a tray card; everything else lives on the lane.

```
+----------------------------------------------------------------------------------------+
| [Br] HP ########-- 92%      2:41  (:)    [AI][Br] HP #######--- 88% (o)(o)(R)  [||][1x]|  44
|      XP #####----- 610/1250                       XP ####------ 520/1250  [Scouted 4]  |
|        [<]  ====================@============|============o====================  [>]   |  24
| .----.            tok  tok    arrows glance off the shields and stick in them   .----. |
| | T  |          (U)          <- 10 px shield glyph over the squad while closed  | T  | |
| | T  |   r  r  [####]>   the Legion, closed: front, side and roof shields  j j  | T  | |  207
| |    |         ' ' '  dust at the shield feet on the lock (0.4 s)      <<< h    |    | |
| '----'                                                                          '----' |
+----------------------------------------------------------------------------------------+
| (o)640 +6/s  .----.----.----.----.----.----.----. .---.---.---. .--. .---. .---.       |
| Army 32/60   |50 I|75 R|150H|100A|110S|200I|75 R| |Chg|Hld|Bck| |Ft| |Hm | |Fd |       |  94
| (Cn)(Ev)     |Hopl|Jave|Char|Phal|Stan|Legi|Cret| '---'---'---' |  | |125| |100|       |
|              '----'----'----'----'----'----'----'               '--' '---' '---'       |
+----------------------------------------------------------------------------------------+
```

- *The card:* an Epic frame with the Infantry class icon (the Legion counts as Infantry for research); the portrait shows the four in a tortoise. The squad size is in the text ("Squad ×4"), as for every squad today.
- *Closing:* the members crouch and slam their shields in a 0-120 ms ripple (front, side, roof), `legion_lock` plays, dust puffs at the shield feet; a 10 px shield glyph fades in over the squad, where its health bar sits (both sides see it).
- *Closed:* a covered hit shows `fx.shield_glance` at the shield instead of the body spark: a short bright tick and the arrow flipping off, or the arrow sticking in the shield for 1.2-1.9 s (the item 38 `fx.stuck`, anchored on the shield); `legion_glance` plays, rate-limited; with "All" damage numbers the small numbers show in a muted grey. An uncovered hit (a boulder, a sunbeam, a power) lands on the body as today, so the difference is visible.
- *Opening:* the shields swing down and out, the swords come up, `legion_break` plays; the glyph fades out.
- *Teaching (U8):* a first-seen caption the first time any tortoise closes ("Tortoise! Arrows glance off; melee breaks it."); the adaptive hint, on the A8 limits (once per 30 s, three times a match), while an enemy tortoise is closed and the tray holds an answer by the counter matrix: "Tortoise! Send {card}."; a Result tip when the player's ranged fed a tortoise ("Their Legion shrugged off your arrows: try Sun Mirror or melee").
- *Long-press or hover tip:* "Legion · 200 · Squad ×4. Under arrows they lock shields: 70% less from arrows, javelins, stones and bolts, half pace, no attacks. Swords out when foes close in. Fire, boulders, explosions, powers and close combat still hurt."
- *Card detail and the live Info showcase (item 25):* "Strong vs" and "Weak vs" from the matrix; the showcase plays a tortoise beat (a dummy archer shoots, the four close, arrows glance, then they open and strike).

**Art (Blender, `art/blender/units/legion.py`).**
- *Rig and look:* the Bronze biped (`rigs_bronze.skeleton_v3`, `sandal_legs_v3` as caligae), about 68 lu. A tall curved rectangular scutum (team-coloured face with a cream wing emblem decal, bronze boss and rim: the team colour's large surface, at least 18% on every frame), a galea with cheek guards and a team crest, banded lorica in desaturated steel grey, a wine-plum tunic from the Bronze palette (the colour rule: no saturated red in the team bands), a short gladius. The rectangle of the scutum separates it at 32 px from the round hoplon, the oval thureos and the Phalangite's pike.
- *Base clips (cartoon kit v2, ANIM_SPEC):* idle (peeks over the rim, taps the gladius on the boss); walk (a G1 march at 81.25 lu/s, shield on the near forearm, sword at the hip, planted feet); attack A "boss punch and thrust" (the shield boss shoves, then a short thrust past its edge), attack B "low stab" (crouches behind the shield, stabs under the rim), attack C "step and stab" (steps in, shield high, stabs over the rim; a different body level at 62 px); hit (armoured: ducks behind the shield, the helmet clanks); die (kneels, then falls forward onto the shield, the helmet rolls: unlike the Shield Bearer's backward topple).
- *Formation clips, in three roles* (front, side, roof), on the extras sheet: `lock_<role>` (0.4 s: an anticipation dip, then the slam with a 0.9 / 1.1 squash; the roof shield swings overhead tilted about 20° toward the camera so its team face reads), `walk_<role>` (a covered shuffle with planted feet at the closed pace of 40.6 lu/s, shields steady with a 1-2 lu bob), `hold_<role>` (the closed idle: small grip shifts, a helmet peeks over the rim now and then), `break_<role>` (0.3 s: shields swing down and out, the sword comes up, a yell from the face kit), `glance` (a 2 lu shield shudder, no body flinch). Per-frame anchors `shieldFront`, `shieldSide` and `shieldRoof` place sparks and stuck arrows. Frames repeat through `sequence` reuse to stay inside the extras budget (ANIM_SPEC 5).
- *Roles and the shell (view only):* the battle view groups linked closed legionaries; in two depth rows the frontmost of the near row plays front, the rest of the near row side, the far row roof; it eases each member's drawn x up to 12 lu toward the group's centre over the 0.4 s lock (released over the 0.3 s break), so the shields tile into one shell. The minimap, camera and power zones keep the sim x (A11 melee-contact rules).
- *Portrait:* the four in a tortoise, one helmet peeking over the front shield (`gen_portraits.py`).

**Audio** (synthesised like the Bronze wave, `bronze` sheet, `match` group): `legion_lock` (four wooden-and-bronze clacks 60 ms apart and a low thud; 3 variants), `legion_glance` (a dull tock with a short bronze ping, pitch-varied, at most one per squad per 120 ms, quieter than body hits), `legion_break` (a shield whoosh, a scrape of swords drawn and a short low grunt), `gladius_thrust` (the attack: a short stab whoosh and a thud).

**Graphics Lite and Reduce motion.** Lite: one glance spark per hit, no flipping arrows, at most 6 stuck arrows per group, no dust on the lock. Reduce motion (U14 "replaces, never deletes"): the lock and the break become 150 ms cross-fades between the open and closed poses, no squash, shudder or dust; the shell, the glyph, the glance tick and every sound stay.

**On a phone at 844 × 390.** Infantry is about 62 px tall; the closed shell is a new silhouette (a dome of team-coloured shields) that must pass the 32 px silhouette strip and the A12 checklist (readable at 32 px, team colour on both presets, the colour rule). The glyph is 10 px over the HP pips, inside the lane band, never over the tray. No tray change. Playwright at 844 × 390, 844 × 340, 800 × 360 and 1280 × 720, plus a sandbox battle (`?dev=1&stage=1&source=real&opponent=ai&autoplay=1#sandbox`) where a Legion closes under arrows and opens at contact; frame time within the release window and the Safari memory budget with the bigger sheet.

**Effort:** about 9-12 agent-days (7.3). **Risks:** it closes rarely, so it can feel weak (the per-card row tunes the body; the `formation.off` row proves the mechanic matters); four sprites may not read as one shell (the P0 art spike; Option C is the fallback); the damage-floor exception (narrow, documented, 5.5); a held tortoise as a missile sponge (the `legion_screen` row; the fatigue lever); widening squads to four touches the generic squad code (spawn, bounty, f_role, the duel harness, the showcase), which existing tests cover.

### 4.2 Option B: "Testudo", a Bronze power card for infantry in a zone

**Idea.** A Bronze Field power, Epic, family `ward`, reach `army` like Aegis (no aim): "your 8 frontmost Infantry close ranks for 6 s": 60% less damage from the shots the shields stop (the same coverage rule), half pace, no attacks; each unit breaks out early when an enemy comes within 50 lu or it reaches a target. 75 gold, 30 s reload, 0.5 s telegraph with a horn call. It works on any Infantry on the lane, of any age.

- **The decision:** timing (cast it as you enter turret cover or before a volley lands), which infantry is in front, and Testudo or Aegis, Chariot Rush, Apollo's Arrow or Sandstorm in the Field slot.
- **Tell and counterplay:** the telegraph and horn, the shells and a 6 s ring over the group; answer it by waiting it out, by melee, blast, lasers and powers, or by a stun.
- **AI:** cast when the expected covered damage on its frontmost Infantry over 6 s (enemy ranged and arrow turrets in range) clears the tier's ROI bar (A2.9.9); tiers V and up; Tempest's and Rook's styles.
- **HUD:** the existing Field power button and drag; no new button.
- **Art:** every shield-bearing infantry that can stand on the lane while a Bronze power is castable needs a closed pose: the Hoplite, Shield Bearer and Phalangite, Stone units still alive after an evolve, Medieval units when the opponent is ahead. Either per-unit clips (10-20 units × 4 clips) or a code-drawn overlay of phantom team shields over the units, which is cheap but generic and is not "the classic Roman legionaries".
- **Audio, Lite and Reduce motion, phone:** as A, plus a horn call; the power drag is taught already.
- **Effort:** about 8-10 agent-days (a power effect kind and per-unit state, the AI cast rule, the A2.9.12 power gates, the overlay art).
- **Risks:** the owner's legionaries are missing unless A is built too; a fifth Field power in Bronze (roster shape 4 → 5 Field); the power gates are fragile (A2.9.12); a skill check that tier X bots time perfectly; cross-age oddities with older infantry.

### 4.3 Option C: the Cohort, one block unit (and other ideas weighed)

**Idea.** One Epic unit, size large (48 lu), one HP pool worth about four legionaries (780 HP), drawn as a block of six legionaries in one model. The same formation rules on one body, so there are no links and no squad change. Closed, it is one shell whose shields interlock exactly; at 66% and 33% HP a soldier drops out of the block (render only, the item 40 damage-stage idea).

- **Pros:** the simplest sim (no links, no epic squads, no count 4); the clearest silhouette, which is the classic image itself; one HP bar; one state; very readable on a phone.
- **Cons:** splash and powers hit it once where they hit a squad four times, so its main counters weaken; keeping "boulders crush it" needs one more rule (for example blast and splash of 40 lu or more ×1.5 against a closed Cohort); one big body is one attacker in the three-wide front, Heavy-like, and needs its own tuning against the counter triangle; it dies all at once; a six-figure rig is a heavier animation job.
- **Decision, tell, AI, HUD, audio, Lite, phone:** as A.
- **Effort:** about 8-10 agent-days.
- **Verdict:** the fallback if the P0 art spike shows four sprites cannot read as one shell at 62 px.

**Other ideas weighed and set aside:**

| Idea | Why not |
|---|---|
| Hold as the trigger (shields up while your side Holds) | Hold also stops the army at the flag, so the iconic advance under the roof is impossible; it couples an army-wide control to one card |
| A War Council pick (Infantry rank III "Testudo" for all Infantry) | Closed poses for every infantry of every age; it dilutes the legionaries and overlaps Shield Wall |
| Tap the squad to toggle (with item 28 direct control) | A hidden control in a game without unit commands; a chore by hand that bots would time perfectly; only if item 28 ever ships |
| A passive variant (always −X%) | That is Shield Wall again |
| Keep fighting while closed | The enemy's archers would be useless for the whole fight: the frustrating, unkillable anchor of 3.3 |
| Full immunity to missiles | No counterplay from ranged at all, and the "nothing works" frustration |

### 4.4 Side by side

| | A: the Legion (squad, automatic) | B: Testudo power | C: the Cohort (one block) |
|---|---|---|---|
| The owner's ask (legionaries plus the tortoise) | yes | the formation without legionaries | yes |
| Player decision | plan slot, when to send, how to answer | timing of each cast | as A |
| Tell and counterplay | the lock, the shell, the glance; melee, blast, lasers, powers, stuns, slows | the telegraph and the ring; wait it out | as A, weaker against splash and powers |
| New controls | none | none (the Field slot) | none |
| Sim work | an ability kind, links, epic squads of 4 | a power effect kind, per-unit state | an ability kind |
| Art | one unit, three roles of formation clips | closed poses for many units, or a generic overlay | one six-figure unit |
| AI | the matrix plus two small rules | a new cast rule | as A |
| Main risk | four sprites must read as one shell | power gates, the legionaries missing | weaker counters, Heavy-like tuning |
| Effort (agent-days) | 9-12 | 8-10 | 8-10 |

---

## 5. Recommendation and starting numbers

### 5.1 Recommendation: Option A, with C as the art fallback

1. **It is what the owner described:** classic legionaries who form the tortoise, as an option you choose in your plan.
2. **It needs no new control and no timing chore:** a rule anyone can predict, and the decisions sit where the game already puts them (the plan, when to send, how to answer).
3. **The counterplay is the history:** melee, artillery, fire and charges break it, exactly as at Carrhae and Cremona.
4. **It reuses built systems:** squads, the resist step, the counter matrix, the tools; the new sim code is one ability kind.
5. **It builds the mechanic a Roman age would need later** (A18.8.3 already foresees "one `AbilityDef` kind" for Rome's formations).

### 5.2 Starting numbers (for the prototype)

| Property | Value | Why |
|---|---|---|
| Card | `legion` "Legion", Epic, role Infantry (class Infantry for research), group `epic`, Bronze | A specialist Epic like the other X0 Epics; counts in the Infantry line |
| Cost, pop, train | **200 gold, 8 pop, 4.0 s** | The Epic template (A5.1) |
| Squad | **4 members**: 2 pop and 50 gold each (bounty 25, kill XP 35 per member) | Each member is worth an Infantry Common; 8 and 200 divide by 4, not by 3 |
| Member HP | **195** (1.05 × the Infantry line at P 1.16) | About a Hoplite (186) |
| Member attack | **21 / 1.0 s**, range 16, melee windup 40%, damage type pierce, Infantry mods (armored ×0.70) | A little under the Hoplite's 23 and no shield bash: the formation's budget; Heavy still beats it |
| Speed, size, tags | **65** (81.25 lu/s walking), small, light bio melee ground | I − 5, like the Shield Bearer |
| Covered shots | range ≥ 100 **and** damage type pierce, blunt or slash **and** single, pierce or chain, or a splash of radius ≤ 35 lu | Arrows, javelins, sling stones, bolts and arrow volleys; not bullets, lasers, blast, big splash, line or gate-zone attacks; never powers or Last Stand (5.3) |
| Cover while closed | **70% less** (×0.30) on covered shots, applied at pipeline step 4 **instead of** every other reduction | No stacking on top (5.5) |
| Pace while closing and closed | **50%**, after slows and before the Siege march | The cost and the tell; slows stack with it |
| Link | another legionary of this card within **40 lu** | Squads close together; one alone cannot close |
| Opens at | an enemy ground unit within **50 lu** (edge), or a target in reach | The break finishes as contact arrives |
| Closing, opening | **0.4 s** (8 ticks, half pace, not covered) / **0.3 s** (6 ticks, standing, not covered) | A tell, a window for counterplay |
| Quiet | open after **1.5 s** with no covered shot aimed at the group | Fire stops, swords out, full pace |
| Relock wait | **2.0 s** after opening | No flicker; a counterplay window after a charge |
| Dropped by | a stun, a knockback, drag or pull; Fall back keeps it open | Charges and stuns break the shell; retreats run |
| Attacks while closing, closed, opening | none start | The cost (and in a melee range of 16 lu, nothing is in reach anyway) |
| Siege | turret damage ×0.5, then ×0.30 if covered; the shell opens at the gate to hit the base | Assaults end stalled games |
| Overdrive | no interaction | |
| Sources | Time Capsules and Dust from Arena 4 (`cardArena`: E), like the X0 Epics | |

### 5.3 What the shields stop (the coverage rule on today's content)

| Age | Ranged attacks stopped | What passes the shields |
|---|---|---|
| Stone | 14 of 16 | Log Roller (a rolling log, line), Sapling Sling (blast, splash 50) |
| Bronze | 13 of 16 | **Sun Mirror** (a sunbeam, laser; a starter turret), **Onager** (blast, splash 50), **Gorgon Bust** (laser and a stun) |
| Medieval | 12 of 16 | Trebuchet, Mangonel Cart (blast, splash 50), Pitch Cauldron (gate zone), Alchemist (blast) |
| Gunpowder | 5 of 19 | every musket and rifle (bullet), cannon shell, mortar, rocket and grenade; stopped: Carronade and Chainshot Cannon (blunt round shot), Bagpiper, Drummer Boy, Mesmerist |
| Industrial | 3 of 20 | all but the Rivet Spitter, the Harpoon Gunner and the Bandmaster |
| Modern | 1 of 19 | all but the Anti-tank Gun |
| Future | 0 of 17 | all |
| Cosmic | 2 of 20 | all but the Shard Spitter and the Bio Weaver |

Answers in every age besides the turrets above: melee and Heavies, every Age Power, stuns, knockbacks and slows. Bronze's starter kit holds four answers (the Hoplite and War Chariot, Sun Mirror, Tidal Wave, Chariot Rush), so the "has-a-starter-answer" row (A16.17, "shields" is named there) passes. Two Gunpowder cannons with blunt round shot count as missiles: a two-age gap, rare, and acceptable; content can retag them later if a row says otherwise.

### 5.4 Fair in Short, Standard and Long wars, and against later ages

| Window | Bronze's place | Bronze stay (A18.3.1 target) | What a Legion meets |
|---|---|---|---|
| Short from Stone (Stone, Bronze, Medieval) | 2nd age | 90-105 s | Stone (14/16 stopped), Bronze (13/16), Medieval (12/16): its best window, still answered by every age's melee, artillery, lasers and powers |
| Short from Bronze (Era of the Week: Bronze, Medieval, Gunpowder) | 1st age | 60-75 s | an opponent who reaches Gunpowder first shoots straight through it |
| Standard (5 ages) and Long (7 ages) | 2nd age | 90-105 s | as Short, then ages where it stops almost nothing |
| One-age War Path window (`w1.bronze`, Siege at 4:30) | the only age | to the end | Bronze only: the per-card row's home |

Why this is fair:
- **Its reach is capped by the age, not the match.** The card trains only while its side is in Bronze, and Bronze lasts about as long in every format, so a longer war never means more Legions; its share of a war shrinks with length.
- **It compounds with nothing:** no Overdrive doubling, no research makes the cover stronger, nothing stacks on the ×0.30.
- **Later ages answer it by themselves:** from Gunpowder on almost every weapon passes the shields; a Bronze Legion lingering into Medieval still meets Footmen, Pikemen, knights, Trebuchets and the Alchemist.
- **Siege helps the game end:** arrow turrets do 15% to a closed shell in Siege, so an assault reaches the gate, where the shell must open to hit the base.
- **Cross-age matchups use the existing scale** (P 1.16 against Medieval's 1.35) and the underdog bounty, unchanged.

### 5.5 The damage-floor exception

A18.2 rule 4 floors damage taken at −35% for all summed sources (research, doctrines, relics, modifiers, weather, auras). The tortoise needs ×0.30, and the exception is written narrowly:

1. **Only a closed tortoise, and only covered shots.** Closing, opening and open legionaries take the normal pipeline, floor included; uncovered hits (boulders, sunbeams) take the normal pipeline even while closed.
2. **Nothing stacks on top.** When the factor applies, step 4's resist sum and Mail are skipped; mark (+20%) and phase mods still apply after it; shields (Aegis) absorb after the pipeline as today; every hit still deals at least 1 HP.
3. **It pays a hard cost:** half pace, no attacks, a tell, and a target for every answer in 5.3.
4. **Precedent:** forts already take ×0.5 from range ≥ 100 as a type mod outside the floor (A16.14.2), and DESIGN-12's Heavy Shot is a type mod outside the damage cap.
5. **Without it the mechanic inverts:** 0.65 × 2 = 1.3× the damage per lane length crossed. With it: 0.30 × 2 = 0.6×, a 40% saving on the approach, less the 0.4 s lock.
6. **Written down:** DESIGN A2.7 (pipeline step 4) and A18.2 rule 4 gain one sentence each, and `docs/decisions.md` records why.

### 5.6 Exploit proxies and the P0 go/no-go (written down before the run)

New proxies and rows (`tools/proxies.ts`, `tools/balance.ts`, `tools/exploits.ts`; tier VII at L7 unless noted; paired seeds; `w1.bronze`, Short and Standard every run, Long only at gates):

| Row | What it plays | Gate |
|---|---|---|
| `card.legion` | The A2.14 card test: the baseline plan with the Legion in place of the Support Rare vs the baseline plan, tier V mirrors | Within ±6 at smoke (400 paired), ±3 at full (2,000) |
| `formation.off` | `card.legion` with the formation switched off by `--patch` (cover 0, no pace change) | The formation adds **+2 to +8 points**: it has teeth and does not carry the card |
| Duels (static, real sim, L7, equal gold: for example 3 Legions against 8 Javelineers, 1 against 4 Hoplites) | Legion vs Javelineer, Rhodian Slingers, Discus Thrower, Cretan Archer and Belly Bowman; War Chariot, War Elephant and Minotaur vs Legion; Hoplite vs Legion | Legion vs each Ranged M ≥ 65; each Heavy vs Legion M ≥ 65 (the triangle holds); has-an-answer ≥ 55 (A2.14); Hoplite vs Legion 40-60 (plain infantry in melee) |
| `mono_legion` | Every Bronze train is the Legion (other ages their Infantry Common); no turrets; powers when full | ≤ 35% vs tier VII (the mono gate) |
| `legion_screen` | The `flag_ball` family: Hold flag at 800, Legions in front, Cretan Archers and Javelineers behind, the Standard Bearer aura | ≤ 45% vs tier VII; Final Bell share ≤ `flag_ball`'s + 5 |
| `legion_push` | Legions with Aegis on every reload and a Wooden Horse behind them, pushing into the turrets | ≤ 55% vs tier VII (other proxies) |
| Rules sanity (scripts only) | `rush` vs `mono_legion`; `mono_ranged` vs `mono_legion` | The melee rush wins ≥ 60%; mono Ranged wins ≤ 30% |
| `value.legion` | Tier VII with the Legion in its plan vs without | 50-62% at gate (the AI uses it) |
| Mirror with Legions | Tier VII mirror, a Legion in both plans | Final Bell Δ ≤ +2 (upper bound ≤ +5) and median length ≤ +30 s, Short and Standard |
| With items 12 and 42 (merged gate) | `legion_push` with Infantry rank III picks; `legion_screen` with Mints | As their rows |
| Static | A unit changes state at most once per 6 ticks; a closed legionary never starts an attack; the factor never meets another reduction; every covered hit ≥ 1 HP; the coverage table matches `cover_scan.mts` | Pass |
| B3 | A headless Full War | ≤ 850 ms |

**Go only if all of these hold at smoke size** (paired):
1. `card.legion` within ±6 in `w1.bronze`, Short and Standard.
2. `formation.off`: the formation adds +2 to +8 points.
3. The duel rows: Legion vs Ranged ≥ 65, Heavy vs Legion ≥ 65, has-an-answer ≥ 55, Hoplite vs Legion 40-60.
4. `mono_legion` ≤ 35%; `legion_screen` ≤ 45% with its Bell share ≤ `flag_ball` + 5; `legion_push` ≤ 55%.
5. The rules-sanity rows.
6. `value.legion` ≥ 47% at smoke.
7. The mirror's Bell and length rows.
8. B3 and the static checks.
9. **The art spike:** four legionary sprites, closed and gathered, read as one shell at 62 px on a phone screenshot (silhouette strip, team colour, the colour rule); if not, the build switches to Option C before P1.

### 5.7 Levers, in order (re-run after each)

- **Too strong** (card row above +6; mono, screen or push rows fail): cover 70 → 60%; pace 50 → 40%; closing 0.4 → 0.6 s; relock 2 → 3 s; member HP −5%.
- **A held tortoise stalls or sponges** (`legion_screen` or the Bell rows fail): fatigue (closed at most 12 s, then open for 4 s, with a 1 s shield tremble before as the tell); then no closing while the side Holds.
- **Too weak** (card row below −6, `formation.off` under +2): pace 50 → 60%; closing 0.4 → 0.25 s; open distance 50 → 35 lu; member damage +1; then cover 70 → 75%.
- **Four sprites do not read as one shell:** Option C.

Still failing: the lead reports to the owner with a proposal before P1.

---

## 6. Roman legionaries in a Greek-faced age

### 6.1 How the Legion fits Hellas

- **History puts Rome in this world.** Pyrrhus of Epirus fought Rome (280-275 BC); the legion broke the Macedonian phalanx at Cynoscephalae (197 BC) and Pydna (168 BC), the very matchup Bronze's Phalangite stands for; and the first recorded testudo was the assault on Heracleum in Macedonia in 169 BC [1][2].
- **The age is already a mix.** Rhodian, Cretan and Thracian mercenaries, Amazons, a Trojan horse, myth and history side by side, and two Roman engines by their Latin names (the Scorpion, the Onager).
- **The framing:** "the legions come to Hellas". The age keeps its name and its Greek face; the Legion is the rising power from the west that its phalanx had to face. A18.8.1 keeps "a separate Greek age" rejected (Bronze is Hellas), and nothing here changes that.

### 6.2 Name, look and lore line

- **Name:** "Legion" (6 letters; the X0 rule is at most two words of at most 10 letters, and "Legionaries" has 11). The troops are "legionaries" in text. It echoes the Cosmic Star Legionnaire without colliding with it. No conflict with the classic's unit names (CONTENT_PLAN 1's list).
- **Look:** 6.1's silhouette (the curved rectangular scutum, the galea's cheek guards and crest, the banded lorica, the gladius) against the Hoplite's round hoplon and Corinthian helmet, the Shield Bearer's oval thureos and pilos and the Phalangite's pike; Bronze palette (plum and wine cloth, desaturated metal, bronze accents ≤ 10%), team colour on the shield faces and crests.
- **Card text** (`card.legion.desc`, English now; translations come last, owner decision 2026-10-06): "Squad ×4: Roman legionaries. Under arrows they lock shields into a tortoise: 70% less damage from arrows, javelins, stones and bolts, at half pace and without attacking. Melee, fire, boulders and powers break them."
- **Lore line**, one optional string change: the Bronze age flavour "Hoplites, gorgons and bronze giants under the eyes of the old gods." gains "and, from the west, the first legions." The age card, VS lines and War Path region text read it.

### 6.3 Roster shape, capsules, odds, album and i18n

| What | Change |
|---|---|
| Roster shape (`src/content/rosterShape.ts`) | Bronze `units.epic` 4 → 5 (8 / 6 / 5 / 2); the table exists so that seasons "only edit numbers"; every count check reads it; Bronze becomes the one age with five Epics |
| Schema (`src/content/schema.ts`) | Squads may be `epic` group cards when pop and cost divide by the count; the count picklist gains 4; the `formation` ability is validated (cover ≤ 8,000 bp, pace ≥ 3,000 bp, link < open, times ≥ 1 tick); `released: false` counts in the shape as today |
| Album (`src/content/album.ts`) | `legion` appended as No. 321, shown under Bronze (numbers never change); "Bronze 20 of 21" style counts update; a Bronze set banner already granted stays owned |
| Capsules and odds | The Epic pool grows 40 → 41 (208 → 209 cards in all), so each other Epic's share drops about 2.4%; rarity odds unchanged; the disclosed odds panel reads the pool; new-card protection and unowned weighting apply (A6.4-A6.5); `sim:drops` and `sim:economy` re-run (all Epics take about 2.5% longer to complete; the median card unchanged) |
| Arena gating (`cardArena.ts`) | `legion: E` (Arena 4), like every X0 Epic; bots follow the same filter |
| i18n | `card.legion.name`, `card.legion.desc`; `hint.tortoise.first`; `hint.counter.tortoise` ("Tortoise! Send {card}."); `tip.result.tortoise`; the age flavour edit; no keyword (A16.17: one card is card text, a keyword needs two) |
| Counter matrix | Regenerated (`npm run content:counters`); its input hash changes |

### 6.4 Does Bronze need anything else, and what about a Roman age?

- **No new counter card is needed:** Bronze answers the tortoise in every slot (5.3).
- **Later, with the skins program:** an Epic Legion skin (for example praetorians in black and silver) as a Blender variant of `legion.py` (item 46's rule).
- **A Roman age:** A18.8.1 plans one (`rome`, P 1.22, "Legions, testudo, ballistae", signature "Formations"), frozen by A18.8.3 until a realistic restyle that the owner has since parked; item 15 (merge Future and Cosmic) would free a slot for a new age the owner picks from a shortlist. If Rome comes, it reuses the `formation` kind for its own roster (for example a Common pair of hastati and an Epic cohort), and the Bronze Legion stays where it is: moving a card breaks every War Plan that holds it, and nothing owned is removed (A16.17). Owner question 2.

---

## 7. What changes where, and the plan

### 7.1 Changes by work package (Option A)

| WP | Files | Change |
|---|---|---|
| WP0 (lead) | `src/contracts/{content,sim,events,observation}.ts`, `tests/fixtures/content`, `docs/DESIGN.md`, `docs/decisions.md` | `AbilityDef` + `{ kind: 'formation'; coverBp; covers: { minRange; dmgTypes; maxSplash }; paceBp; linkLu; openLu; closeMs; openMs; quietMs; relockMs }`; `UnitDef.squad.count` 2, 3 or 4; `UnitState.formation?` (state and tick); event `formationChanged { id, state }`; `hit.covered?: true`; `Observation.units[i].formation?`; `MatchStats` damage turned away by tortoises; the frozen fixture gains a formation card for golden 20; DESIGN A2.7 (step 4, the formation), A18.2 rule 4 (the exception), A17.9 (the card), A7 (AI), A11 and A12 (feel), A14.1 and A14.2 (ids); one bump shared with items 12 and 42 |
| WP1 | `src/content/{schema,compile,rosterShape,album,cardArena,generals}.ts`, `src/content/raw/bronze.ts`, `src/i18n/content.en.json` | The Legion row (`released: false` until art and sound ship), compile `UnitRules.formation`, the schema rules of 6.3, Bronze 8 / 6 / 5 / 2, album No. 321, Arena 4, Kettle's and Rook's plans, strings; regenerate counters |
| WP2 | `src/sim/systems/{abilities,combat,impacts,movement,status}.ts`, `src/sim/{damage,hashState,observe,stats,replay}.ts` | `formationSystem` in B3 step 7 (skipped when no formation unit lives: the aimed set from unit, turret and tower attacks, O(n), then links over formation units); no attack starts while closing, closed or opening; the step-4 factor for covered hits on closed units; stuns, knockbacks, drags and pulls drop it; pace after slows; formation fields hashed only for formation units (marker −8); golden `20-testudo.json`; unit tests |
| WP3 | `src/ai/{book,brain,counters,scoring,mistakes}.ts` | The push-gate rule (covered turrets at 50% with a legionary front, V+); the turret preference after a seen legionary (V+); closed legionaries ×1.2 in power value (V+); the mistake; tests (never an illegal command; answers `mono_legion`) |
| WP4 | `art/blender/units/legion.py`, `art/blender/render_all.py`, `src/visuals/{manifest.units,manifest}.ts`, `src/visuals/effects/recipes.ts` | The rig, base clips, the three-role formation clips and anchors, extras sheet, portrait; `fx.shield_glance`, `fx.tortoise_lock`, `icon.formation` |
| WP5 | `src/render/{battleView,eventMapper,combatFeel}.ts`, `src/render/feel.config.json`, `src/ui/hud/**`, `src/i18n/hud.en.json` | Clips per state and role; the gather into a shell (presentation offsets); glance and stuck arrows on shield anchors; the glyph; grey numbers; caption, adaptive hint and Result tip; Lite and Reduce motion; Playwright at four viewports; `docs/ui-plan.md` 4.7 through a request |
| WP6 | `src/audio/sounds.ts` | `legion_lock`, `legion_glance`, `legion_break`, `gladius_thrust` |
| WP7, WP8 | `src/meta/**`, `src/save/**` | Nothing beyond the pool growing (drops and odds read it); no save schema change |
| WP9 | `src/ui/screens/**`, `src/render/showcase/**` | Card detail; the showcase's fourth member and its tortoise beat |
| WP11 | `src/app/**`, `src/tutorial/**` | The first-seen caption and the adaptive hint on the A8 limits |
| WP12 | `tools/**`, `tests/**` | `mono_legion`, `legion_screen`, `legion_push`; the rows of 5.6; static checks; an e2e sandbox battle where a Legion closes under arrows and opens at contact |

### 7.2 SIM_VERSION, goldens, saves and replays

- **One contract bump with items 12 and 42** (their P1a). Formation fields hash only for formation units (the X0 M3 pattern) and count 4 changes nothing for existing squads, so goldens 01-17 keep their hashes; on its own this is a minor bump by the A2.9.11 / F3 policy (10.1.0); with item 12 it rides that bump, and the lead re-records deliberately.
- **New golden `20-testudo.json`** (DESIGN-12 reserved 18, DESIGN-42 19) on the fixture: a Legion closing under Javelineer and Archer Tower fire, glancing hits, an Onager boulder passing the shields, a Gorgon stun dropping the shell, a Chariot Rush knockback dropping one legionary, the relock wait, opening at contact, a lone survivor who cannot close, Fall back keeping it open, and the shell opening at the gate in Siege.
- **Saves:** no schema change (a new card id in the pool; War Plans and auto-fill unchanged). **Replays:** older replays keep their result card, labelled "Recorded on an older build" (D8). **Counters:** `counters.json` regenerated with its new input hash.
- **Release gate:** `released: false` keeps the Legion out of capsules, bots and screens until its art and sounds ship, so `main` stays playable through every phase.

### 7.3 Phased plan, merged with items 12 and 42

| Phase | Items 12 and 42 (DESIGN-12, DESIGN-42) | Item 45 adds | Merged | Ends with |
|---|---|---|---|---|
| **P0** one prototype gate (throwaway branch; runs when the machine is free) | 4.5 | 2.5 (WP2 1, WP1 0.25, WP3 0.25, WP12 0.5, WP4 art spike 0.5) | **7** | The go/no-go lists and the A-or-C art decision, told to the owner in plain words |
| **P1a** rules, one WP0 bump | 13 | 3.5 (WP0 0.5, WP1 0.5, WP2 1, WP3 0.75, WP12 0.75) | **16.5** | Smoke gates green, golden 20 |
| **P1b** behaviour picks (item 12) | 4 | 0 | **4** | Their rows |
| **P2** HUD, teaching, sources | 7 | 1.5 (WP5 1, WP9 0.25, WP11 0.25) | **8.5** | Screenshots reviewed at four viewports |
| **P3** art and sound | 7.5 | 2.5 (WP4 2, WP6 0.5) | **10** | Playwright, frame time and memory in budget |
| **Owner check** | | | | Short and Standard Wars with a Legion in the Bronze plan and against one |
| **P4** tuning at gate sizes | 4 | 1 | **5** | Every row green or reported to the owner |
| **Total** | 36-44 | **11 (about 9-12)** | **about 47-55** (2.5-3 weeks with 3-4 agents in parallel) | |

The Legion touches different code from the War Council and forts (abilities, damage step 4, squads), so it merges cleanly; the cross rows (Infantry rank III with Legions, Mints behind a tortoise screen) need the combined branch anyway. If items 12 and 42 wait on the owner's answers, item 45 can run its own small gate and bump first for about 1.5-2 agent-days more.

### 7.4 What to cut, in this order

1. The AI's turret preference and the power ×1.2 (keep the matrix and the push-gate rule).
2. The Result tip and the "damage turned away" stat.
3. The showcase's tortoise beat (keep the fourth member).
4. The side role (front and roof only).
5. The per-member ripple on the lock (lock in unison).
6. Attack C (keep A and B).
7. The view's gather into a shell, only if the art spike passes without it.

Never cut: the P0 gate with its "has teeth" and "no must-pick" rows, the tell (lock clip, shell, clack, glance), every counter in 5.3, the AI's use and answer through the matrix, and `released: false` until the art ships.

**Rejected:** a player toggle on the unit (no unit commands); the Bronze power as the recommended form (Option B: no legionaries, art for many units, a fifth Field power); a passive variant; fighting while closed; immunity; moving the card into a later Roman age.

---

## 8. Questions for the owner

1. **Should the tortoise come by itself, or should you trigger it?** By itself: the legionaries lock shields when arrows come at them and open when enemies get close. Or as a Bronze power card, "Testudo", that you cast to make your front infantry lock shields for 6 seconds. **Recommended: by itself.** The game has no unit commands, so a rule you can predict is clearer than one more thing to press; you still decide when to bring and send the Legion, and your opponent can answer it. A power card would also need a "shields up" look for every infantry unit, not just Roman legionaries.
2. **Should the Romans join the Bronze age now, or wait for a Roman age?** The game has no Roman age. Bronze is ancient Greece, and Rome fought there: the first recorded tortoise was a Roman attack on a Greek town in 169 BC, and two of Bronze's war machines already have Roman names (Scorpion, Onager). A Roman age of its own is in the long-term plan and could come with item 15 (merging Future and Cosmic frees a place). **Recommended: the Bronze age now.** It is what you asked for and it is cheap; if a Roman age comes later, it reuses the tortoise rule, and the Legion stays in Bronze (moving it would break war plans).
3. **Four legionaries who close up, or one big block?** **Recommended: four legionaries** who march and fight as soldiers and close into one tortoise. They fall one by one, and splash and powers hit all four, which is the tortoise's weakness. We first check at phone size that four figures read as one shell; if they don't, we make it one block of six soldiers drawn as one figure.

---

## 9. Kort på dansk

Du ønskede skildpaddeformationen (testudo) med de klassiske romerske legionærer.

Spillet har ingen romersk tidsalder. Mit forslag er derfor et nyt Epic-kort i bronzealderen, som hedder Legion. Ét kort træner fire romerske legionærer. Når fjenden sigter på dem med pile, spyd, slyngesten eller bolte, låser de selv skjoldene sammen: skjolde foran, på siden og over hovedet, ligesom på de gamle billeder. Så tager de 70 procent mindre skade fra den slags skud, men de går kun halvt så hurtigt og slår ikke. Når fjenden kommer tæt på, slår de skjoldene op og kæmper som almindeligt fodfolk.

Man kan se og høre det. De dukker sig, skjoldene smækker sammen med et klak, pilene preller af og bliver siddende i skjoldene, og når de åbner, råber de og trækker sværdene.

Det kan besvares. Nærkamp, ild, kampesten, eksplosioner, solstråler og laservåben går lige igennem skjoldene, og det gør alle Age Powers også. Lammelser og skub bryder formationen, og en legionær alene kan ikke danne skildpadden. I bronzealderen klarer Sun Mirror, Onager, Gorgon Bust, nærkampstropperne og kraftkortene det. Fra krudtalderen stopper skjoldene næsten ingenting, ligesom i virkeligheden.

Computeren bruger kortet og svarer igen efter de samme regler som dig. Der kommer ingen nye knapper.

En hurtig måling viser, at hærene mødes så hurtigt, at skildpadden kun er lukket i nogle få sekunder ad gangen. Den bliver altså et redskab til angreb på forsvarede baser og mod mange bueskytter, ikke et kort, man altid skal have. Legionærerne passer ind i den græske bronzealder, fordi Rom kæmpede netop der, og den første skildpadde, vi kender, var et romersk angreb på en græsk by i år 169 før vor tidsregning.

Vi bygger først en prøve sammen med punkt 12 og 42 og måler den med testværktøjerne, før noget kommer med i spillet.

Tre spørgsmål til dig:

1. Skal skildpadden komme af sig selv (min anbefaling), eller skal du selv udløse den med et kraftkort?
2. Skal romerne med i bronzealderen nu (min anbefaling), eller skal vi vente på en egen romersk tidsalder?
3. Skal det være fire legionærer, der lukker sig sammen til én skildpadde (min anbefaling), eller én stor blok af soldater?
