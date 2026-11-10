# Unit abilities and attack types across games: a catalogue for a one-lane tug-of-war

**Status.** Research note for queue item 51 (a signature for every troop) and its owner addendum of 2026-11-03: "Research thoroughly, from other games and your own brainstorm, what kinds of unique abilities and attacks exist. Then give them to the existing troops, and you may make new ones. The point is to make it even more tactical, so the different troops counter each other better." Nothing here is decided; the design that uses it is `docs/design-history/item51-signatures.md`. The companion note on synergies and formations (queue item 52) is `docs/research/unit-synergies.md`.

**Method.** Web searches on 2026-11-03 through the session's search tool (sources at the end; mostly fan wikis and Liquipedia, so exact numbers vary by game version and are quoted only as illustrations). Where a statement rests on my own knowledge of a game rather than a fetched page, it says "(own knowledge)". Earlier internal research is reused, not repeated: `genre-peers.md`, `depth-benchmarks.md` (keywords, trade economy), `depth-audit.md` (what the sim showed), `docs/design-history/item45-testudo.md` (shield states, coverage by shot type).

**Our constraints, for every judgement below.** One lane, 1D simulation, units spawned one by one at the gate and walking at 70-125 lu/s on a 2,000 lu lane; up to 80 units and 150 projectiles on screen; phone landscape 844 x 390 with units about 40-110 device px tall; deterministic integer sim (no `Math.random`, seeded RNG only for a few listed effects); the whole tray of 7 cards is always available (no hand cycle), so in-match counter-picking is easy and depth must come from the War Plan, timing and interactions (`depth-audit.md` finding 6).

---

## 0. Key findings

1. **Counters come in five kinds across the genre, and only two of them are learnable at a glance.** (a) Damage-type tables (Warcraft III attack versus armour types, Advance Wars' per-pair table, Age of Empires II's hidden armour classes, StarCraft II's attribute bonuses); (b) triangles (Fire Emblem's weapon triangle and "effective" weapons); (c) trait and immunity webs (Battle Cats traits, Bloons properties); (d) **shot geometry** (Plants vs. Zombies: a screen door stops straight shots, lobbed shots pass over it); (e) **mechanical interactions** (Clash Royale: a stun resets an Inferno's ramp, swarms soak single-target hitters, splash kills swarms). Players learn (d) and (e) by watching; (a)-(c) need tables. Ageborn already has a small (a) and (b) layer (the A2.6 triangle and type mods); the new depth should come mainly from (d) and (e).
2. **The strongest counters are resets and blocks, not percentages.** Clash Royale's stun resets a ramping beam (Supercell's own notes: Inferno Tower and Inferno Dragon "will still be reset by stun/freeze effects"); a building-targeter is pulled by a cheap building; a cheap unit eats an expensive single shot. Each is visible and cheap, which is what makes a "positive trade".
3. **Multipliers should stay modest outside the core triangle.** Fire Emblem's effective weapons run from x1.5 (Heroes) to x3 (Gaiden); Warcraft III tops out near x2; our A16.17 rule already caps new type multipliers at +-25% so a plan screen never decides a match. Big swings belong to mechanics with a tell (a charge, an aimed shot), which the opponent can see and answer.
4. **Hard immunities make walls, partial ones make choices.** Bloons uses immunities (lead pops to no sharp attack; black to no explosion; camo cannot be targeted without detection), which works in tower defence where the player builds the answer over many rounds. In a duel they create "I lost at the plan screen". We use partial reductions with a floor (A18.2: no unit takes less than 65% of a hit) and keep one true immunity type only where it is the whole point and has a clear answer (burrowed units, A16.15).
5. **Random procs do not fit.** Battle Cats' abilities fire on chances (for example "30% chance to freeze, slow, weaken or knock back"), and Warcraft III has evasion and critical strikes. They are fine for a slow-paced collection game but unreadable as counters and against our deterministic, learnable rule set. Every mechanic below is deterministic: it triggers on a rule the player can see (every third hit, after a run-up, below half health).
6. **Crowd control families are well mapped by MOBAs.** Dota 2 separates stun (no move, no attack, no cast), root (no move), silence (no cast), disarm (no attack), hex (all of them), break (no passives) and forced movement (knockback, pull). We already have stun, slow, snare, knockback, pull and drag; root, disarm and break are worth one or two cards each at most, because our troops have few active abilities to silence.
7. **Anti-heal is the standard answer to sustain.** League of Legends' Grievous Wounds cuts healing received by 40% (more with some items). Ageborn has six healers and a periodic shield on several cards, and no anti-heal at all today; a burn status that halves healing gives the healers a counter that is not "kill the healer".
8. **Shields and armour have opposite counters, and players learn the pair quickly.** A shield pool (Clash Royale's Guards and Dark Prince) breaks under any damage and is countered by many small hits; flat armour per hit (Age of Empires, Warcraft III, StarCraft II armour) shrugs off many small hits and is countered by big ones. Two defensive families with mirrored answers are one of the cheapest ways to make two otherwise similar heavies counter differently.
9. **Our lane allows mechanics no grid or arena game has**, because everything happens on one line with a contact point that moves: a run-up charge that needs free lane, a unit that slips through the enemy's shooters but not its melee, an overrun that small units cannot block, a hop back along the line, the Hold flag as a launch point, pushing the contact point (territory), and threats from above (arcs) versus along the line (straight shots). Section 3 lists them.
10. **Readability on a phone favours event tells over status icons.** With up to 80 units, a mechanic is readable if it shows as a short, distinct event (a dust trail, a sight line, a glancing arrow, a hop) or as a pose; persistent rings and icons must be rare. Section 4 gives the rules.

---

## 1. How games make counters: five systems compared

| System | Example | How it works | Learnable by watching? | Lesson for Ageborn |
|---|---|---|---|---|
| Damage-type x armour-type table | Warcraft III | Every attack has a type (Normal, Pierce, Siege, Magic, Chaos, Hero) and every unit an armour type (Light, Medium, Heavy, Fortified, Hero, Unarmored); a table sets a multiplier before armour (for example Normal x1.5 against Medium, Pierce x2 against Light in the Reforged chart, Siege x1.5 against Fortified, Chaos x1 against all). Values differ between versions | No: players read tooltips and memorise the table | Our A2.6 `mods` lists are this system in miniature. Keep it small: the triangle and a few named exceptions |
| Per-pair damage chart | Advance Wars | A base-damage table for every attacker and defender pair (Anti-Air deals 105 to Infantry and 25 to Tanks in one fan transcription), modified by terrain and commanders | Partly: the extremes are obvious (anti-air shreds infantry) | Our counter matrix (`counters.json`) is such a chart, measured on the sim. It is good for bots and for "Strong vs / Weak vs" lines, not as the rule players learn |
| Hidden armour classes with flat bonus damage | Age of Empires II | Units belong to several hidden armour classes; attacks carry flat bonuses per class that stack (the Halberdier's bonus applies against both Cavalry and War Elephant classes); bonus damage is not shown in game | No (the system "is not directly displayed in-game") | A warning: power hidden in classes reads as "random" to most players |
| Attributes with bonus damage before armour | StarCraft II | Units carry attributes (Light, Armored, Biological, Mechanical, Massive); an attack may add bonus damage against one (the Colossus against Light, the Thor and Tempest against Massive), applied before armour | Partly: shown on the unit card | Our tags (light, armored, bio, mech, air) already do this; Brace-like attributes (Massive cannot be lifted) are a good model for "cannot be knocked back" |
| Weapon triangle and effective weapons | Fire Emblem | Sword beats axe beats lance beats sword; bows are effective against fliers, hammers and armour-slayers against armoured units, at x1.5 to x3 depending on the game | Yes, once named: three symbols and a few effective weapons | Our Heavy > Infantry > Anti-heavy > Heavy triangle is this; Long range and Air are the "effective weapon" exceptions |
| Traits and immunities | Battle Cats; Bloons TD 6 | Battle Cats: enemies carry traits (Red, Floating, Black, Metal, Angel, Alien, Zombie, ...); cats have abilities against traits (Strong Against, Massive Damage, Resistant) and procs (freeze, slow, weaken, knockback, curse), plus counters to special enemy rules (Zombie Killer stops revives, Barrier Breaker breaks barriers). Bloons: lead is immune to sharp attacks, black to explosions, purple to energy and fire, camo cannot be targeted without detection | Partly: the trait colour is visible, the procs are not | Trait webs give collections depth (a reason to own many units). We borrow the *answers to special rules* (a barrier breaker, a revive killer, a detector), not the colour traits or the procs |
| Shot geometry | Plants vs. Zombies | Straight shots hit the first thing in the lane; a Screen Door or Ladder stops them; catapult plants lob over shields and hit the zombie behind; the Parasol Zombie (PvZ 2) deflects lobbed shots instead; Melon-pult can hit almost everything except fliers and diggers | **Yes**: you see the shot fly and stop | The best fit for a lane: "straight shots" versus "arcs" is already in our art; making the sim read it gives shields and lobbers a clear duel |
| Mechanical interactions | Clash Royale | Stuns reset a ramping beam; small units distract a single-target heavy; buildings pull building-targeters; splash clears swarms; a knockback (the Log, Bowler) resets charges | **Yes**, after one or two games | Our main source: resets, blocks, baits and shapes |

---

## 2. Catalogue of mechanics

Each row: where the mechanic comes from, what it does, how it creates a counter (what it beats, what beats it), how readable it would be in our lane at phone scale, and the verdict for Ageborn (**Use**, **Have** (we already have it), **Adapt**, **Later**, **Reject**). "Ours" points to the family name used in `item51-signatures.md`.

### 2.1 Getting to the fight (movement)

| Mechanic | From | What it does | Counter it creates | Readability in our lane | Verdict |
|---|---|---|---|---|---|
| Charge after a run-up | Clash Royale's Prince and Dark Prince (charge after walking a distance, double damage, own knowledge); Total War cavalry charge bonus; Age of Empires knights | Speeds up and hits hard once it has run freely; stopping cancels it | Beats whatever it meets first in open lane (often shooters at the back of a broken army); beaten by braced spears, cheap units that eat the charge, slows that stop the run-up | **High**: lowered lance, dust trail, speed lines, an impact | **Use** (ours: Momentum; replaces "first hit of each engagement") |
| Jump over the front | Clash Royale Hog Rider (jumps the river), Mega Knight (jump attack), Plants vs. Zombies Pole Vaulting Zombie (jumps the first plant, which a cheap plant can bait) | Skips the blocker to reach the back | Beats shooters and supports; beaten by melee near the back, stuns on landing, a cheap decoy that eats the jump | High: an arc and a landing puff | **Have** (pounce, five Epics; ours: Leap) |
| Dash with untargetable time | Clash Royale Bandit (dash, briefly untargetable, own knowledge); Dota blinks | Closes a gap without taking hits | Same as a jump | High | **Have** (the leap is untargetable by melee) |
| Burrow and surface | Clash Royale Miner (appears anywhere, own knowledge); Plants vs. Zombies Digger Zombie (tunnels to the back of the lawn); StarCraft II burrow; Bloons camo needs detection | Travels unseen or untargetable, surfaces behind the defence | Beats walls, turtles and back lines; beaten by detectors, units at the surfacing spot, the surfacing telegraph | Medium-high: a dirt mound and dust trail along the lane, a surfacing crack | **Use** narrowly (ours: Tunnel, one Epic; full class in item 8 / A16.15) |
| Overrun / trample | Total War elephants and chariots (own knowledge); Clash Royale's Mega Knight jump and Giant's indifference to troops (own knowledge) | Small enemies do not stop it | Beats swarms and lines of light troops; beaten by large or braced units that block it | High: small units tumble aside | **Use** on two showpieces (ours: Overrun) |
| Kite / step back | StarCraft II stutter-step micro (own knowledge); Polytopia's Escape skill (move again after attacking); Total War skirmish mode (missile units fall back from melee, own knowledge) | A shooter steps away when melee comes close | Beats slow melee; beaten by fast melee, divers, ranged fire, pulls | High: a hop back with dust | **Use** on skirmishers (ours: Backstep) |
| Building-targeting runner | Clash Royale Hog Rider, Giant, Ram Rider, Balloon (target buildings only, own knowledge) | Ignores troops and goes for the base | Beats turtles and players who do not defend; beaten by anything that blocks it and by buildings that pull it | High | **Have** (siegeOnly); **Adapt** for raiders (ours: Raider runs past shooters, melee stops it) |
| Flying | Every RTS; Kingdom Rush fliers ignore barracks; Plants vs. Zombies Balloon Zombie | Ignores blocking; only anti-air can hit it | Beats melee-only armies; beaten by anything that hits air | High | **Have** (gunships and bombers) |
| Dive bombing | Own knowledge (classic air attack); Clash Royale's Balloon death bomb | A telegraphed dive on a clump | Punishes clumps; beaten by anti-air and spreading out | High: shadow on the ground, a whistle, a dive | **Adapt** (ours: a bomber variant for the Dive Bomber) |
| Blink / teleport | StarCraft II Stalker blink, Dota blink dagger (own knowledge) | Instant relocation | As a jump | Medium (a flash at both ends) | **Have** (the Warp Stalker's blink) |

### 2.2 How it hits (shapes and rhythm)

| Mechanic | From | What it does | Counter it creates | Readability | Verdict |
|---|---|---|---|---|---|
| Splash | Everywhere (Kingdom Rush artillery, Clash Royale Wizard, Bloons bombs) | Damage around the impact | Beats swarms and formations; beaten by spread-out units, by reaching the splasher | High | **Have** |
| Chain / ricochet | Warcraft III Chain Lightning, Clash Royale Electro Wizard (own knowledge), Bloons | Bounces to nearby enemies | Beats squads; beaten by tanks and spacing | High | **Have** (Pebbler, Discus, Ion Ranger) |
| Pierce / line | Bloons pierce, Clash Royale Magic Archer (own knowledge), Kingdom Rush | Hits everything in a line | Beats lines (a lane is a line); beaten by shields that stop the first shot | High | **Have** |
| Cleave / sweep | Total War, Dota cleave (own knowledge) | Hits the target and its neighbours | Beats packs at the front; beaten by ranged | Medium | **Have** |
| Cone | Clash Royale Hunter-style short burst (own knowledge); our Blunderbuss | Hits the target and those behind it | Beats clumps up close; beaten by range | High | **Have** |
| Lobbed (arcing) shot | Plants vs. Zombies catapults; Age of Empires mangonels | Flies over the front and hits a spot | Beats shields that stop straight shots and units hiding behind a front; beaten by moving targets (splash lands where the target stood), divers, air | **High**: the arc is drawn | **Have** in art; **Use** in rules (the sim does not read `arc` today) |
| Very long range artillery | Age of Empires trebuchets; Clash Royale X-Bow and Mortar (own knowledge); our item 5 | Hits from far behind with a minimum range | Beats turtles and held lines; beaten by divers, raiders, air, anything inside its minimum range | High with a landing marker (built) | **Use** (ours: Siege range, item 5 folded in) |
| Volley with scatter | Total War rocket units, our Congreve Rack and Rocket Cart | Several shots around a point | Beats groups; beaten by tanks | High | **Have** |
| Reach (second rank) | Total War pikes; Fire Emblem lances; our Spear Hunter | Attacks over the ally in front | Beats a melee scrum from behind; beaten by ranged and by anything that reaches it | Medium: a long weapon over a shoulder | **Have** |
| Ramp on one target | Clash Royale Inferno Tower and Inferno Dragon; reset by stuns per Supercell's notes | Damage rises while it keeps hitting the same target | Beats tanks and Legendaries; beaten by swarms (it wastes the ramp on chaff), stuns and knockback (reset), decoys | **High**: a beam or weapon that glows hotter | **Use** (ours: Focus) |
| Charge-up shot | Clash Royale Sparky (long charge, reset by stuns, own knowledge); sniper "aim" in shooters | A long visible aim, then one huge shot | Beats big targets; beaten by stuns and knockback (spoil the aim), a cheap unit that eats the shot, a shield pool | **High**: a sight line during the aim | **Use** (ours: Aimed Shot; the sim already cancels a windup on stun or knockback) |
| Burst then reload | Total War reload, Clash Royale-style burst shooters (own knowledge) | Several quick shots, then a long reload | Beaten by pushing during the reload | Medium (needs a reload pose) | **Later** (cut: one more rhythm rule with little counter value) |
| Execute (bonus against low health) | League of Legends and Dota executes (own knowledge) | Extra damage to wounded targets | Beaten by high health and shields | Low: the bonus looks like a random big number | **Reject** for now |
| Grows with kills | Dota stacking abilities, Polytopia Persist (a unit that kills may attack again) | Each kill makes it stronger | Beats swarms (it feeds on them); beaten by early burst and by not feeding it | Medium-high with a visible growth | **Use** once, on a Legendary (ours: Rampage, the Hydra) |

### 2.3 What a hit does (on-hit effects and crowd control)

| Mechanic | From | What it does | Counter it creates | Readability | Verdict |
|---|---|---|---|---|---|
| Stun | Dota (no move, no attack, no cast); Warcraft III War Stomp; Clash Royale Electro Wizard (own knowledge) | Stops everything briefly; resets windups | Beats ramps, aims and charges; beaten by spreading out and by range | High (stars, daze) | **Have** (Daze, Time Stop, EMP, turret stuns) |
| Slow / snare | Battle Cats Slow, Warcraft III frost, Dota | Less speed (snare: also attack speed) | Beats chargers, runners and divers; beaten by ranged that outranges the slower | Medium | **Have** (Snag, Dread) |
| Root | Dota (no movement, can attack) | Holds in place | Beats runners | Medium | **Later** |
| Disarm | Dota (no attacks) | Stops attacks only | Beats single big hitters | Low | **Reject** (a stun reads better) |
| Silence / break / curse | Dota silence and break (passives off); Battle Cats Curse (target loses its abilities) | Switches off abilities | The natural counter to signatures | Medium | **Later** (EMP already switches off shields; a "curse" card is a v1.1 idea once every troop has a signature) |
| Knockback | Battle Cats knockback, Clash Royale Bowler and Log (own knowledge), Dota forced movement | Pushes the target back, cancels its windup | Beats aims, ramps and chargers; pushes the contact point; beaten by braced and large units | High | **Have** (first hit); **Use** as "every third hit" (ours: Shove) |
| Pull / hook / drag | Dota Pudge hook (own knowledge); Clash Royale Fisherman (own knowledge); our Grumpy Toad and Grapple Crane | Drags an enemy out of its formation into yours | Beats shooters and supports behind a front; beaten by braced, large and armoured units | High: a line and a drag | **Have** (Corsair, Harpoon); **Use** more |
| Mark / armour break | League of Legends armour shred, Dota armour reduction, Bloons Embrittlement (lets other towers pop lead) | The target takes more from everyone | A force multiplier; beaten by killing the marker | Medium (a reticle) | **Have** (Sunder: Warhammer Sergeant, Flare Spotter) |
| Burn (damage over time) | Warcraft III, Bloons fire | Damage keeps ticking after the hit | Beats healers (with anti-heal) and low-health swarms; beaten by shield pools and high health | High (flames) | **Use** (ours: Burn, shared with item 12's Fire Arrows) |
| Anti-heal | League of Legends Grievous Wounds (40% less healing) | Less healing received | The answer to sustain | Medium (only with a visible burn) | **Use** inside Burn |
| Delayed blast | Clash Royale Poison and bomb carriers (own knowledge); sticky bombs in shooters | A charge that explodes later | Beats tanks; telegraphed, so it can be healed or shielded against | High (a blinking charge) | **Use** once (ours: Fuse, the Sticky Bomber) |
| Weaken (target deals less) | Battle Cats Weaken | Lowers the target's damage | A soft counter to big hitters | Low | **Reject** (invisible) |
| Freeze (time stop) | Battle Cats freeze; Dota Chronosphere (own knowledge); Clash Royale Freeze | Everything in an area stops | Beats clumps and combos | High | **Have** (Time Stop, Medusa's Gaze) |

### 2.4 How it survives (defence)

| Mechanic | From | What it does | Counter it creates | Readability | Verdict |
|---|---|---|---|---|---|
| Shield pool that breaks | Clash Royale Guards, Dark Prince (own knowledge; see item 45's sources); Battle Cats Barrier (needs Barrier Breaker) | Absorbs the first damage; regrows | Beats big single hits; beaten by many small hits and shield breakers | High (a bubble that pops) | **Have** (Photon Knight); **Use** more (ours: Barrier) |
| Flat armour per hit | Age of Empires, Warcraft III and StarCraft II armour (a fixed cut per hit, so rapid weak attacks suffer most, own knowledge for the rapid-fire effect) | Each hit is a fixed amount weaker | Beats swarms and rapid fire; beaten by big hits and armour breakers | Medium-high (a clink and a small damage number) | **Use** (ours: Hardened; reuses the Mail research code) |
| Resist against a damage source | Battle Cats Resistant; Kingdom Rush armour and magic resistance; our Guard (-25% from range 100+) | Takes less from one kind of attack | Beats that kind; beaten by the other kind | Low when passive | **Adapt** into Cover (below) |
| Cover against straight shots | Total War shields against missiles; Plants vs. Zombies Screen Door (stops straight shots, lobbed shots pass); Stick War's Shield Wall (70% less damage while blocking in Legacy, per its wiki) | Stops straight shots for itself and those behind it | Beats archers, rifles and lasers; beaten by arcs, blasts, powers, melee and shield breakers | **High**: shots glance off the shield | **Use** (ours: Cover; the coverage rule is shared with item 45) |
| Evasion / miss chance | Warcraft III evasion, our Smoke Screen power | Some attacks miss | Unreadable as a unit trait | Low | **Reject** for units (RNG) |
| Stealth / camouflage | Bloons camo, StarCraft II cloak, Clash Royale Royal Ghost (own knowledge) | Cannot be targeted until revealed | Needs detection | **Low** in a crowd of 80 | **Reject** (a translucent unit among 80 reads as a bug) |
| Rage when hurt | Dota Berserker-style passives (own knowledge) | Stronger when low | Beats long fights; beaten by burst and stuns | High (red glow) | **Have** (Frenzy) |
| Lifesteal | Dota, League of Legends, Warcraft III Vampiric Aura | Heals from damage dealt | Snowballs; beaten by burst and anti-heal | Medium | **Reject** for now (snowball risk on a lane that already amplifies small edges) |
| Thorns / damage return | League of Legends Thornmail, Dota Blade Mail (own knowledge) | Melee attackers take damage back | Beats swarms of melee; beaten by ranged | Low (invisible until numbers) | **Later** |
| Revive / second life | Battle Cats Zombies (revive unless hit by Zombie Killer); Clash Royale Golem and Lava Hound split on death (own knowledge) | Comes back or splits | Beats single burst; beaten by splash and "revive killers" | High | **Have** (riders that bail out); a revive is item 12's Miracle |

### 2.5 What it does for its side (team effects)

| Mechanic | From | What it does | Counter it creates | Readability | Verdict |
|---|---|---|---|---|---|
| Aura | Warcraft III Devotion, Endurance, Trueshot, Command and Unholy auras (the same aura does not stack with itself, different ones do, per modding-community notes) | A constant buff near the source | Beats even fights; beaten by killing or outranging the source | Low (invisible) unless drawn | **Have** (A2.7: auras never stack, the strongest applies) |
| Periodic war cry | Warcraft III Roar and Dota Warcry-style shouts (own knowledge) | A timed burst buff every few seconds | Same as an aura, but readable and timeable | **High**: a horn blast or ring | **Use** (ours: War Cry, generalising today's periodic shield) |
| Heal | Warcraft III Priests, Clash Royale Battle Healer (own knowledge), Kingdom Rush | Restores health | Beats chip damage; beaten by burst, divers and anti-heal | Medium | **Have** |
| Summon / spawner | Clash Royale Witch, Tombstone (own knowledge); Kingdom Rush barracks (soldiers block enemies in tower range) | Free extra bodies | Beats single-target hitters; beaten by splash | High | **Have** |
| Decoy | Warcraft III Mirror Image (own knowledge); our Holo Projector | Bodies that draw fire | Beats aimed shots and single big hitters | High | **Have** |
| Called strike | StarCraft II nukes and Dota global spells (own knowledge); our Radio Operator | A delayed hit from above | Beats clumps and shields; beaten by moving out and by the caller's death | High (marker on the ground) | **Have** |
| Riders / crew | Total War chariots and elephants with crew (own knowledge); our Matriarch, Belfry, Sky Fortress | Extra attackers on a big body, bail out on death | Beats single-target answers | High | **Have** |
| Economy on hit | Battle Cats "Double Cash" and Money Up combos; Dota Alchemist (own knowledge) | Gold from fighting | A greed choice | High (coins) | **Use** once (ours: Plunder, the Brigand) |
| Spotting / detection | Bloons detection (camo becomes targetable near certain towers); StarCraft II detectors (own knowledge) | Lets allies hit what they could not | A team role; beaten by killing the spotter | Medium (a flare, a line) | **Adapt** (marked targets can be shelled from further away; see synergies) |

### 2.6 Life cycle

| Mechanic | From | What it does | Counter it creates | Readability | Verdict |
|---|---|---|---|---|---|
| Death explosion | Clash Royale Golem, Balloon, Giant Skeleton (own knowledge); StarCraft II Baneling | Hurts nearby enemies when it dies | Punishes melee crowding; beaten by ranged | High | **Have** |
| Death spawn | Clash Royale Golem, Lava Hound (own knowledge); our riders | Smaller units appear | Beats burst; beaten by splash | High | **Have** |
| Avenge (buff on death) | Clash Royale Lumberjack drops Rage when it dies, which speeds up a Balloon behind it (LumberLoon guides) | Allies near it get a buff when it falls | Punishes killing it in a crowd | High | **Later** (a v1.1 keyword) |
| Squad | Clash Royale Barbarians, Minions; our X0 squads | One card, several bodies | Beats single-target; beaten by splash | High | **Have** |

---

## 3. Our own brainstorm: mechanics that only a one-lane tug-of-war can have

These come from the shape of our lane rather than from other games. Each says what it needs from the sim.

| Idea | What it does | Why it fits our lane | Counter | Sim need | Verdict |
|---|---|---|---|---|---|
| **Run-up charge** | Momentum builds only while walking freely; a stop, a slow or a knockback empties it | Our units walk a long lane in a file; the front stops and starts constantly; the Hold flag is a natural launch line ("hold, then charge") | Slows, braced units, cheap units in front | One integer per unit (distance walked since it last stopped) | **Use** |
| **Slip through shooters** | A raider is not blocked by enemy shooters and supports, only by melee and forts, and runs for the base | The file has a melee front with ranks behind it (A2.7 ranks); "only melee stops it" is one rule a player learns | Any melee unit, slows, turrets | A blocking filter in movement (shared with Overrun) | **Use** |
| **Overrun small units** | Small and medium enemies do not block it; it tramples each it passes | One line means a big beast must otherwise stop at the first goblin; this is the iconic image of mammoths and bulldozers | Large or braced units block it | Movement exception and a trampled-set per overrunner | **Use** (two cards) |
| **Push the contact point** | Every third hit shoves the target back | Ground matters in a tug-of-war (the falling gate, turret cover, the Siege rope) | Braced and large units | A hit counter per attack | **Use** |
| **Hop back along the line** | A skirmisher hops back when melee comes close | Units cannot step aside; only backward is possible, and that is readable | Fast melee, divers, hooks, ranged | A cooldown and a self-knockback | **Use** |
| **Straight versus arcing shots** | Shields stop straight shots; arcs pass over | Every ranged attack already has a straight or arc projectile in the art | Arcs, blasts, powers | The sim reads `projectile.arc` and the damage type | **Use** |
| **Surface behind the line** | A tunneler travels under the fight and surfaces at the gate with a telegraph | One lane has one "behind": the base | Defenders at the gate, turrets | A burrowed state, a targeting filter | **Use** once |
| **Formation by adjacency** | Same troops side by side in the file form a formation with a pose | The sim already sorts each side's file every tick | Splash, arcs, divers, knockback | One O(n) pass per side | **Use** (see `unit-synergies.md`) |
| **Reset by stagger** | Knockback and stuns cancel windups (built) and empty ramps and aims | Our attack cycle has explicit windups (A2.7) | A built rule; new families read it | none | **Use** |
| **Gate-only effects** | Something that matters only near a gate (the falling gate is built) | Turtling at the gate is the genre's oldest problem | Arcs and siege | none new | **Have** |
| **Spawn-order combos** | A card that buffs the next card trained after it | Our queue is visible and ordered | Hard to read on the lane | Queue state | **Reject** (invisible on the lane) |
| **Age seam effects** | Units of an older age weaker against newer ones | Already the underdog bounty | | | **Have** |

---

## 4. Readability at phone scale: rules for every mechanic

Measured context: on a phone (844 x 390) the lane band is about 265 px tall and shows about 40% of the lane; a small unit is about 40-60 device px tall; up to 80 units and 150 projectiles share the screen (B16).

1. **One mechanic, one tell.** Every signature has a short event tell (at most about 400 ms: a dust trail, a sight line, a glancing spark, a hop, a ring) and, when it changes how to fight it, a pose (a raised shield, a lowered lance, a kneeling shooter).
2. **Persistent state only when it decides the fight**, at most one state icon per unit (priority: burrowed > aiming > charging > burning > shielded > raging), drawn only on units in view; everything else is an event.
3. **Telegraph the big hits**: aimed shots show the sight line for their whole aim; a surfacing tunneler shows a crack ring for 1.5 s; a dive bomber shows a shadow and a whistle; called strikes already show a marker.
4. **Shot geometry must be visible**: arcs stay drawn as arcs (built), straight shots as straight; a shield that stops a straight shot shows the shot glance off.
5. **Never colour alone**: team colour plus shape; status by shape and motion (flames, stars, glints).
6. **Lite and Reduce motion**: Lite keeps the tells as sprites without particles; Reduce motion keeps poses and icons, drops shake and trails.
7. **Text never carries the rule on the lane**: the card's one-line text and the Info preview (item 25) teach it; the lane only shows it happening.

---

## 5. What we take, and what we reject

**Take (as families in item 51):** run-up charge (Momentum), jump (Leap, have), tunnel (Tunnel, one card), overrun (Overrun), kite (Backstep), raider rule (Raider), arcs versus straight shots (Cover and arcs), siege-range artillery (item 5), ramp (Focus), charge-up shot (Aimed Shot), shove every third hit (Shove), hook (Hook, have), mark (Sunder, have), burn with anti-heal (Burn), delayed blast (Fuse), shield pool (Barrier), flat armour (Hardened), shield breaker (Shatter), rage (Frenzy, have), grow with kills (Rampage), war cry (War Cry), economy on hit (Plunder), plus every family we already have.

**Reject, with the reason:**

| Mechanic | Why not |
|---|---|
| Random procs (chance to freeze, crit, evade) | Unlearnable as counters; we keep the sim deterministic and readable |
| Hard immunities to whole damage types | Make plan-screen losses; we use partial reductions with the 35% floor |
| Hidden armour classes | Read as random; our classes and tags are shown on every card |
| Stealth | Unreadable among 80 units on a phone |
| Lifesteal | Snowballs on a lane where +5% stats is about +20 win points (`depth-audit.md` 2.7) |
| Execute | The bonus reads as a random big number |
| Disarm, weaken | Invisible; a stun or a shove reads better |
| Spawn-order combos | Happen in the queue, not on the lane |
| Burst and reload | Little counter value for one more rule; kept as a later option |

**Later (v1.1 candidates):** Avenge (buff on death), a "curse" that switches off a signature for a few seconds, root, thorns.

---

## Sources

Fetched through web search on 2026-11-03 (fan wikis unless noted; numbers vary by version):

- Battle Cats terminology (ability categories, traits, procs): https://thanksfeanor.pythonanywhere.com/guides/documents/terminology.html
- Battle Cats Wiki, Enemy Units (traits): https://battle-cats.fandom.com/wiki/Enemy_Units
- Age of Empires II armour classes and bonus damage: https://ageofempires.fandom.com/wiki/Armor_class_(Age_of_Empires_II) ; https://divy1211.github.io/AoE2DE_UGC_Guide/general/damage_calculation/ ; https://ageofempires.fandom.com/wiki/Armor_class:_Spearman
- Warcraft III armour and attack types: https://warcraft.wiki.gg/wiki/Warcraft_III_armor_and_attack_types ; https://liquipedia.net/warcraft/Damage_Calculation
- Bloons properties: https://www.bloonswiki.com/Lead ; https://www.bloonswiki.com/Black_Bloon_(BTD6) ; https://bloons.fandom.com/wiki/Purple_Bloon ; https://www.bloonswiki.com/Camo_Bloon_(BTD6)
- StarCraft II armour and attributes: https://liquipedia.net/starcraft2/Armor ; https://liquipedia.net/starcraft2/Terran_Unit_Statistics
- Advance Wars damage: https://advancewars.fandom.com/wiki/Damage_Formula ; https://www.engadget.com/2008/01/24/advance-wars-chart-of-damage/
- Fire Emblem effective weapons and the triangle: https://fireemblemwiki.org/wiki/Effective ; https://gamepress.gg/feheroes/how-weapon-advantage-works
- The Battle of Polytopia unit skills: https://polytopia.fandom.com/wiki/Unit ; https://www.pocketgamer.com/the-battle-of-polytopia/the-battle-of-polytopia-cheats-and-tips-list-of-every-unit-and-tribe/
- Clash Royale Inferno, Electro Wizard, resets: https://www.clasher.us/clash-royale/card/Inferno_Tower ; https://clasher.us/clash-royale/card/Electro_Wizard ; https://clashroyale.com/blog/release-notes/balance-changes-coming-2.html
- Dota 2 disables: https://www.liquipedia.net/dota2/Disabling ; https://liquipedia.net/dota2/Stun ; https://dota2.fandom.com/wiki/Disable
- Plants vs. Zombies shields, lobbed shots, vaulting: https://plantsvszombies.wiki.gg/wiki/Zombies_(PvZ) ; https://plantsvszombies.fandom.com/wiki/Melon-pult_(PvZ) ; https://plantsvszombies.wiki.gg/wiki/Vaulting_Zombies ; https://plantsvszombies.wiki.gg/wiki/Parasol_Zombie
- Kingdom Rush barracks, armour, magic resistance: https://kingdomrushtd.fandom.com/wiki/Encyclopedia ; https://tvtropes.org/pmwiki/pmwiki.php/Characters/KingdomRushTowers
- Stick War Shield Wall: https://stick-war.fandom.com/wiki/Shield_Wall ; https://stick-war.fandom.com/wiki/Spearton/Strategies
- League of Legends Grievous Wounds: https://wiki.leagueoflegends.com/en-us/Grievous_Wounds ; https://blog.loltheory.gg/grievous-wounds-lol/
- Mechabellum counters ("everything has multiple counters", lists differ by source): https://progameguides.com/mechabellum/all-mechabellum-unit-counters-list/ ; https://www.gamepressure.com/newsroom/mechabellum-counter-list-for-each-unit/zf562b
- Warcraft III aura stacking (community knowledge): https://www.hiveworkshop.com/threads/about-stacking-and-not-stacking.265614

Internal: `docs/research/genre-peers.md`, `depth-benchmarks.md`, `depth-audit.md`, `depth-architecture.md` (the keyword engine proposal), `docs/design-history/item45-testudo.md` (shield states, coverage by shot type, sources on Clash Royale Guards, Warcraft III Defend and Stick War).
