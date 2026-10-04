# Progress

Newest entry first. Each session appends what it finished, what is next, and anything the owner must do.

## 2026-10-04: the Future content wave ships (cloud session, not yet published)

The seventh content wave is in: 13 new Future troops (Android Pair, Barrier Trooper, Hover Biker, Needle Gunner, Crab Mech, Arc Lobber, Plasma Lancer, Overclock Engineer, Holo Projector, Jetpack Trooper, Particle Cannon, Overload Android, Drone Carrier), the Holo Decoy and the flying Attack Drone they summon, 2 turrets (Cryo Pod, Tractor Beam), 2 powers (Target Painter, Nano Mesh), 2 forts (Skyguard Pylon, Mech Bay) and 3 skins (Space Cadet, Chrome Rail, Grandfather Clock), each with a cartoon sprite sheet (2-3 attacks, walk by gait, KO death), card portrait, sounds and effects; the four older Future forts are redrawn in the cartoon style. Bots use the new cards (every new troop, turret and power except the Legendary sits in a General's Future plan, as in the earlier waves; the counter matrix is regenerated; forts are player picks). No sim rule changed. Numbers and details: `docs/decisions.md` ("X0 Future wave shipped"); table in DESIGN A5.6.

**Checks (2026-10-04):** typecheck clean, production build OK; lint has one error in `src/content/rosterShape.ts` from the Cosmic wave in progress. Unit tests 6,200 pass, 34 fail, none in Future rows: the Cosmic wave in progress (its table rows, attack mapping and the counters file), the arena/format change in progress elsewhere (meta, Last Base, matchmaking and mode-picker tests), the known boot sound budget and the turret-turtle proxy.

**Still open:** the Needle Gunner reads +14 in the two-age window (the plan without the Pulse Trooper wins more there: even a near-harmless Needle Gunner reads +9; one-age window +4.5); the Tractor Beam row measures nothing (the bot never builds the rare-turret mount); the capsule economy re-tune is overdue (Common and Rare no longer reach max in a year, `docs/requests/content-economy-retune.md`).

**What the owner should try** (once published): put the Drone Carrier, the Crab Mech and the Holo Projector in your Future War Plan, throw a Nano Mesh over a crowd (it catches fliers too), and build a Skyguard Pylon.

## 2026-10-03/04: the Modern content wave ships (cloud session, not yet published)

The sixth content wave is in: 13 new Modern troops (Commando, Sandbag Carrier, SMG Squad, Rifle Grenadier, Assault Gun, Mortar Team, Sticky Bomber, Combat Medic, Bulldog Sergeant, Dive Bomber, Bulldozer, Ghillie Sniper, Sky Fortress), 2 turrets (Anti-Tank Gun, Rocket Battery), 2 powers (Creeping Barrage, Concussion Shells), 2 forts (Rifle Depot with its Rifle Levy, Wire Snare) and 3 skins (Desert Raider, Tin Tankette, Origami Fortress), each with a cartoon sprite sheet (2-3 attacks, walk by gait, KO death), card portrait, sounds and effects; the four older Modern forts are redrawn in the cartoon style. One sim rule: a bomber's riders shoot their own targets (the Sky Fortress's waist gunners; SIM_VERSION 7.3.0, goldens re-recorded). Bots use every new card (Generals' plans and the counter matrix). Sources: capsules by arena (`cardArena.ts`), Trophy Road 3,700 (Creeping Barrage) and 4,600 (Concussion Shells, Rifle Depot, Wire Snare). Numbers and details: `docs/decisions.md` ("X0 Modern wave shipped"); table in DESIGN A5.5.

**Checks (2026-10-04, after a container restart):** typecheck and lint clean, production build OK. Unit tests 6,190 pass, 27 fail, none in Modern rows: the Future wave's unit-table rows, the Nano Mesh control cap and the content-hash snapshot (Future numbers moved after the snapshot), the arena/format change in progress elsewhere (meta, Last Base, matchmaking and mode-picker tests), the known boot sound budget and the turret-turtle proxy. Battle screenshots in the session scratchpad `content/modern/`.

**Still open:** SMG Squad reads +10 in the two-age window (the plan without the Rifleman wins more; one-age window +2.7); Combat Medic +5.1 and Sticky Bomber / Concussion Shells about -5 to -6 in the two-age window; Creeping Barrage sits at the lane caps (-25 / -17) like every lane volley; the capsule economy re-tune is overdue (Common and Rare no longer reach max in a year; `docs/requests/content-economy-retune.md`).

**What the owner should try** (once published): put the Sky Fortress, the Ghillie Sniper and the Bulldozer in your Modern War Plan, stun a crowd with Concussion Shells, and lay a Wire Snare in front of your gate.

## 2026-10-03: the Industrial content wave ships (cloud session, not yet published)

The fifth content wave is in: 13 new Industrial troops (Coal Miners, Iron Mantlet, Dispatch Rider, Bomb Bowler, Steam Tractor, Trench Mortar, Steam Driller, Bandmaster, Clockwork Tinker, Armoured Car, Alpine Climber, Spark Scientist, Armoured Train), the Tinker's Clockwork Soldier, 2 turrets (Rivet Spitter, Steam Hammer), 2 powers (Shrapnel Shells, Great Magnet), 2 forts (Rail Barricade, Tesla Pylon) and 3 skins, each with a cartoon sprite sheet (2-3 attacks, walk by gait, KO death), card portrait, sounds and effects; the four older Industrial forts are redrawn in the cartoon style. Bots use every new card (Generals' plans and the counter matrix). No sim rule changed. Numbers and details: `docs/decisions.md` ("X0 Industrial wave shipped"); table in DESIGN A5.4.

**Checks:** typecheck and lint clean, production build OK. Unit tests: the Industrial rows pass; remaining failures belong to the in-progress Modern wave (its Rifle Levy and newly installed sheets), the arena/format change in progress elsewhere (meta, Last Base and mode-picker tests), the known boot sound budget and the turret-turtle proxy.

**Still open:** the two-age window reads about +8 to +11 for the Dispatch Rider, Trench Mortar and Bomb Bowler (the plan without the Riveter or Carbineer wins more; one-age window within ±5); Shrapnel Shells sits at the lane caps (-25 / -24); the capsule economy re-tune is now due (Common 203 / Rare 226 days to max).

**What the owner should try** (once published): put the Armoured Train, the Clockwork Tinker and the Spark Scientist in your Industrial War Plan, drop the Great Magnet on a crowd, and build a Tesla Pylon.

## 2026-10-03: the Bronze content wave ships (cloud session, not yet published)

The second content wave is in: 13 new Bronze troops (Shield Bearer, Thracian Raider, Rhodian Slingers, Discus Thrower, War Elephant, Cretan Archer, Belly Bowman, Aulos Piper, Tragic Chorus, Wooden Horse, Amazon Rider, Minotaur, Hydra), 2 turrets (Net Caster, Polybolos), 2 powers (Sandstorm, Charybdis), 2 forts (Hoplon Line, Skirmisher Camp) and 3 skins, each with a cartoon sprite sheet (2-3 attacks, walk by gait, KO death), card portrait, sounds and effects; the four older Bronze forts are redrawn in the cartoon style. New sim rule: the Dread aura (the Tragic Chorus slows nearby enemies) and a speed aura (the Aulos Piper), SIM_VERSION 7.1.0, golden 17. Numbers and misses in `docs/decisions.md`; tables in DESIGN A17.9.

**Checks:** typecheck and lint clean, production build OK. Unit tests: the Bronze rows pass; remaining failures belong to the in-progress Industrial wave (its gated cards, sheets, sounds and an emptied `pausedWave` set), an arena/format change in progress elsewhere (meta and mode-picker tests), the boot sound budget and the turret-turtle proxy.

**Still open:** Rhodian Slingers and Discus Thrower read about +11 in the two-age window (the plan without the Javelineer wins more whatever the replacement; one-age window within ±5); the Hydra and Charybdis windows disagree (about -0 / +6 and -6 / +4); Sandstorm sits at the lane caps (-6.6 / -1.1); the capsule economy needs the CONTENT_PLAN 8 re-tune (time to max 176 / 194 / 116 / 163 days, request updated).

**What the owner should try** (once published): put the Hydra, the War Elephant and the Tragic Chorus in your Bronze War Plan, cast Charybdis on a crowd, and watch the Wooden Horse ram the gate and spill out two Hoplites.

## 2026-10-03: the Gunpowder content wave ships (cloud session, not yet published)

The fourth content wave is in: 13 new Gunpowder troops (Highlander, Powder Monkey, Voltigeurs, Blunderbuss, Dragoon, Coehorn Crew, Wall Gunner, Drummer Boy, Bagpiper, Rocket Cart, Hussar, Mesmerist, Grand Marshal), 2 turrets (Carronade, Sea Mortar), 2 powers (Rocket Volley, Cannon Salute), 2 forts (Cavalry Picket, Fougasse) and 3 skins, each with a cartoon sprite sheet (2-3 attacks, walk by gait, KO death), card portrait, sounds and effects; all six Gunpowder forts are redrawn in the cartoon style. Bots use every new card (Generals' plans and the counter matrix). One small sim rule: the Rocket Cart's rockets scatter like the Congreve Rack's (SIM 7.2.0, replays of older matches stay valid). Numbers and details: `docs/decisions.md` ("X0 Gunpowder wave shipped").

**Checks:** typecheck and lint clean, production build OK. Unit tests: the remaining failures belong to the gated Bronze wave (its table rows and its new wall) plus the known boot sound budget (476 of 300 ms) and the turret-turtle proxy test (not from this wave).

**Still open:** the Wall Gunner row reads +15 (it measures the plan without the Grenadier, not the card); Rocket Volley's two windows disagree (-4.7 / +9.5); the Cavalry Picket is 7 points stronger than the Militia Muster on the same seeds; the capsule economy re-tune (`docs/requests/content-economy-retune.md`) is now more urgent (Common 153 / Rare 169 days to max).

**What the owner should try** (once published): put the Grand Marshal, the Hussar and the Rocket Cart in your Gunpowder War Plan, fire the Cannon Salute into a crowd, and listen to the Bagpiper slow the enemy down.

## 2026-10-03: the Medieval content wave ships (cloud session, not yet published)

The third content wave is in: 13 new Medieval troops (plus the Kennel Master's War Hound), 2 turrets, 2 powers, 2 forts and 3 skins, each with a cartoon sprite sheet (2-3 attacks, walk by gait, KO death), card portrait, sounds and effects; all six Medieval forts are redrawn in the cartoon style. Numbers and measurements: `docs/decisions.md` ("X0 Medieval wave shipped").

**Checks:** typecheck and lint clean, production build OK. Unit tests: the remaining failures belong to the gated Bronze wave (its table rows, levy, forts) plus two shared items: the boot sound budget (476 of 300 ms, request filed) and the turret-turtle proxy (3 of 4 mounts at 800 s; baseline plans do not use the new cards).

**Still open:** Longbow Volley sits at every lane-power limit and measures about -17 (like Pebble Hail: relax the budget or accept a niche card); the Lindworm's one-age and two-age windows disagree (-3.6 / +5.8); the capsule economy needs the CONTENT_PLAN re-tune (Common/Rare/Epic now 140/146/88 days to max; a measured fix is in `docs/requests/content-economy-retune.md`, best applied once after the Bronze wave).

**What the owner should try** (once published): put the Lindworm, the Greatsword Knight and the Mangonel in your Medieval War Plan, ring the Great Bell on a crowd, and watch the Siege Belfry drop its drawbridge.

## 2026-10-03: the Stone content wave ships (cloud session, not yet published)

The first content wave is in: 13 new Stone troops (plus the Beast Caller's Cave Pup), 2 turrets, 2 powers, 2 forts and 3 skins, each with a cartoon sprite sheet (2-3 attacks, walk by gait, KO death), card portrait, sounds and effects; all six Stone forts are redrawn in the cartoon style. Numbers and measurements: `docs/decisions.md` ("X0 Stone wave shipped").

**Still open:** Bolas Thrower (+12.0 one-age, -7.8 two-age) and Torch Runner (+7.0) sit outside ±5; Pebble Hail is held to the lane-power budget and measures -30.6 / -10.1 against Stampede (a design call: relax the budget for it or accept a niche card); support-slot Epics and the second turret mount barely get used by the Balanced bot, so their deltas say little; the whole-collection capsule time grew from 194 to 222 days (the CONTENT_PLAN re-tune waits for the Bronze wave); the boot sound budget (request filed); equipped skins draw procedural puppets instead of the 3D sheets (as before).

**What the owner should try** (once published): start a Stone battle, put Hunting Wolves, Woolly Rhino and the Elk Chieftain in your War Plan, and cast Tangle Vines on a crowd.

## 2026-10-02: unit animations in every age and the Siege rope, release check (cloud session, not yet published)

All 56 shipped troops in all eight ages now walk with their feet on the ground and have 2-3 different attacks (A plus B, most melee units also C); the Siege rope is in Short, Medium and Long War. Details per age and for the rope in `docs/decisions.md` (2026-10-02 entries).

**Checks (whole tree):** typecheck clean, lint clean, 4,704 unit tests pass (241 files, 1 skipped), production build OK, full e2e suite 286 of 286 pass (Chromium), initial download 964 KB gzip (limit 3 MB).

**Played and measured:**

- **Every age, both sizes (844x390 and 1280x720):** one battle per age (real AI vs autoplayer forced into the age, plus all seven units of the age dev-spawned on both sides, 36 s each). Moving units show their walk on 94-97% of frames in every age; every unit played at least two attack variants (Repair Drone has no attack, it heals). No console errors, no failed requests.
- **Siege rope, live in a Ladder battle from Home (Arena 3 profile), Short, Medium and Long at both sizes:** VS shows "Push or crumble · Siege from 6:30 / 10:00 / 14:30", the clock turns to Siege and Siege II at the right time, tapping it opens the schedule, the side fighting in its own half gets the Crumbling chip and cracked bar, and the Result says "Your walls crumbled at 7:18" or "They led at the Final Bell". No console errors.
- **Balance gates rerun on this tree (same seeds, identical to the rope report):** tier VII Final Bell 8.0 / 5.0 / 4.0% (targets 10 / 8 / 5), no draws, medians 7:39 / 10:58 / 15:21, first mover 48.5 / 53.3 / 51.8%; tier V Bell 8.5 / 9.0 / 5.0%; flag ball 41.0 / 16.5 / 39.5% (limit 45); turtles 0% in every format. Last Base Standing unchanged (median 16:13, already open).
- **Frame cost:** the same as before the animation work (production build, 40 units, Stone and Future): about 3-7 ms of JS per frame median.
- **Download:** unit sheets grew about 37% (phone sheets 11.2 → 15.4 MB in all, 1.7-2.6 MB per age; HD 26 → 36 MB). They load per age, so the first download is unchanged.

**Blocker before this tree goes to `main`:** the paused content expansion (new Stone cards) is live in the content but has no art or sounds yet. AI Generals' Stone War Plans already use these cards, so in a Ladder battle the enemy fields plain team-coloured placeholder shapes (seen vs Captain Kettle), and from Arena 2 the cards can drop from capsules. The published `main` does not have this. Gate the wave (or ship its art) before publishing.

**Still open:**

- Balance: medians are set by age pacing, not the rope (Short 7:39 vs 7:00); the turtle band in A2.14 should become a ceiling (turtles win 0%); tier V Medium Final Bell 9.0% (target 8%); Last Base Standing median 16:13 (band 17:00-23:00).
- Art: Feet-apart gate met by few bipeds (accepted per age); vehicle motion gate 0.23-0.29 on tanks, Cannon, Ram (gate 0.30); Graviton Halberdier 0.89 MB (cap 0.75); some variant muzzles beyond 25 lu (Flare Spotter B, Behemoth B, Starwarden B; deliberate); Repair Drone's heal clips never play (its heal has no clip trigger); the Balloon Admiral and Mothership play attacks while drifting (about 25% / 12% of moving frames).
- Performance: in big Stone fights draw calls reach 100-290 (budget 80); the build before the animation work does the same.

**What the owner should try** (once published)

1. Play a Short War on your phone and watch your troops: they should walk, not slide, and swing in a few different ways.
2. Hold back until 6:30 in a Short War: the clock says Siege, your HP bar cracks and "Crumbling" shows while the fight is in your half. Tap the clock to read the schedule.

## MVP pass 2026-10-01: release check (cloud session, not yet published)

All three MVP tracks (bug hunt and first 30 minutes, sounds/effects/loading, balance) are in the tree and checked together.

**Checks (whole tree, after the last fix):** typecheck clean, lint clean, 4,569 unit tests pass (237 files, 1 skipped), production build OK (initial download 944 KB gzip; the size tool still warns that all art and audio together exceed the 16 MB total budget), full e2e suite 285 of 285 pass (Chromium).

**Playthroughs re-run on phone (844x390) and desktop (1280x720):**

- New player: match 1 works; tapping Hold and waiting brings the "Tap Charge to attack their base!" hand after about 10 s, and Charge clears it. The Arrow Storm drag lands. Match 1 took 2:27-4:11 of game time with the scripted players. Capsule 1 fills the empty slots; match 2's Council hint follows the taps (Council, Economy, Granary, tap again); capsule 2 gives Friar and Onager; Home after match 2 shows the Ladder and War Path unlock.
- Match 2 after the balance pass: headless, a random tapper still wins 100% vs Pip (median 3:33), power spam 100%, "a few, then evolve" 93%. In the browser an active tapper won in 6:08; a very slow scripted tapper (13-16 units in 7 minutes) lost twice.
- Returning player (Arena 2 save): Home, Modes, Army, Capsules, the Daily plate (names the General), a Ladder battle with emote picker (Esc closes it, no pause), the compact Pause card, a reload after 1:00 (toast "counts as a Retreat"; no trophies lost below 400, as the rules say), a full Ladder win (Arena 3 reached), the replay viewer (Esc leaves). No console errors.

**Fixed in this check:**

- The balance pass made Arrow Storm cost 125, but match 1 still granted 100 with its beat, so the "free" first cast cost the player 25 gold. It now grants 125, and a test ties it to the price.
- "AI · " no longer doubles the AI chip on the Home opponent plate and in the replay badge.
- On phones a long AI name in the battle top bar was cut mid-word ("Tessric Bone"). It now refits when space changes, and shows the first name only ("Tessric") when the full name cannot fit.
- DESIGN "Void matches" now mentions the new reload-counts-as-Retreat rule.

**What is left for MVP**

- Balance: tier VII Short War still ends at the Final Bell 23.8% of the time (target 10%; the "rope" idea needs the owner's yes); powers still do 17-20% of the killing (target 5-12%); "no research" wins 41% in Short War (limit 30%); the early-capsule Amber flood; the first Ladder match vs Kettle is still often lost by weak play.
- First 30 minutes: a reload right after losing match 2 skips "Try again"; the War Path teaching order and L2 title; a guided second upgrade; the editable auto name; the trophy count still running when the main button appears.
- Performance: renderer memory in long sessions needs a real-phone check; the boot sound fallback is at the edge of its 300 ms budget.
- Art: the 32 forts are still in the old realistic style.
- Minor: "Watch replay" returns to Home, not to the Result; the "Drag the flag" bubble can sit half off the left edge.

**What the owner should try** (once published)

1. Settings, Reset, then play the training match. When the Charge/Hold tip shows, tap Hold and wait 10 seconds: a hand should point at Charge.
2. Play match 2 and follow the Council hint; you should win if you keep training troops.
3. On your phone, in a Ladder battle, check that the enemy's name at the top right is readable.

## 2026-10-01: MVP pass, sounds, effects and loading speed (cloud session, not yet published)

- The game opens much faster: a splash shows at once and Home shows after about 4 s on a phone over 4G (was 9 s; 10 s on slow 4G, was 32 s). Battle art loads behind Home and per match, so no other age downloads at start (about 9 MB saved). Mid-battle hitches from first-time effects are much smaller (texture upload time in a heavy battle 700 → 200 ms a minute).
- 31 new sounds: real UI sounds instead of stand-ins (unlocks, region opening, stars that climb, cards, sheets), the War Council, a cue per stance, rising Last Base Standing horns and the crumble beat, a "Heavy incoming" warning, the Anti-heavy armour crack, thunder in the Thunderstorm skin, the VS slam, the Sundial claim, and their own sounds for the energy forts. Album and Customize taps now answer.
- New effects: stance cues on the troops, a mark on slowed or snared units, the Brace plant, a research glint at the base, a pennant over levies, a bigger fort-finished pop.
- Checks: typecheck, lint, 4,567 unit tests, build and size (943 KB initial). Details and what is still open in `docs/decisions.md` ("MVP pass: sounds, effects and load performance").

## 2026-10-01: MVP pass, bug hunt and first-30-minutes fixes (cloud session, not yet published)

**What works**

- Match 1 can no longer stall: the stance hint points at Charge, and whenever the army is off Charge for 10 s a hand on Charge says "Tap Charge to attack their base!". The Arrow Storm hand drags to a legal spot in your half, and the line says powers cost gold. No adaptive hints in match 1, at most 2 per match after that.
- Match 2: the Council hint follows your taps (Council, Economy, Granary, tap again) and only one hint shows at a time. Pip's Rookie handicap is stronger (a random-tapping new player won 43% before, 100% now; about 5 minutes).
- Following the main button after a win now leads Home while an unlock waits, and the capsule summary always offers Home. Capsule 1's new cards fill the empty troop slots; capsule 2 brings Friar and the Onager (both play in a Short War). The Starter Capsule show is simpler. The welcome crate holds a Bonker skin.
- The Field power slot works in battle (it said "Coming soon"), and War Path first clears pay their powers. The Daily no longer hands out forts or Field powers before they are taught.
- Reloading during a Ladder battle (after 1:00) counts as a Retreat, with a toast.
- Fixed on phone and desktop: blank Bronze/Industrial/Cosmic badges, the Age Capsule picker, the pause card (lane stays visible, enemy cards in enemy colours), the emote picker, the replay viewer (Esc and Back), AI names, Army's Available cards, the Capsules tab, Settings, Quick Battle's name, the Daily plate (names the General), the same Ladder opponent in every length, and several copy fixes. The first screen shows the game's name.
- Details and the measurements: `docs/decisions.md` ("MVP pass: bug hunt and first-30-minutes fixes").

**Still open**

- Balance track: early capsules give a lot of Amber; the first Ladder match vs Kettle (tier I) is still often lost by weak play.
- Performance track: renderer memory in long sessions needs a real-phone check.
- A reload right after losing match 2 opens capsule 2 instead of offering "Try again"; the War Path's teaching order (L2 "Hold the Line"); a guided second upgrade; the editable auto name.

**What the owner should try** (once published)

1. Start a fresh game (Settings, Reset) and play the training match. When "Charge attacks. Hold guards your base." shows, tap Hold and wait 10 seconds: a hand should point at Charge.
2. Play match 2 and follow the Council hint.
3. After a Ladder win, open the capsule and press the gold button: it should take you Home when something new has opened.

## 2026-10-01: Online-first Home and four battle lengths (cloud session, not yet published)

**What works**

- Home is laid out as the lobby of a 2-player game: Battle plays the mode shown on the switcher next to it ("Ladder · vs AI"); the Modes panel picks a mode and lists "vs players" first. The plate over Battle shows exactly who you fight (always with the AI chip) and the one choice the mode needs.
- Four lengths on the plate from Arena 2: Short (up to 8½ min), Medium (12½), Long (17½) and No clock ("Last Base Standing", from Arena 3, no trophies). No clock has no Final Bell: Siege rises every 2½ min from 14:30 and from 23:00 the side fighting in its own half crumbles, so a base always falls by 25:44.
- Friend Duel is shown on Home as a locked "Later" chip (owner decision: MVP first, online after). The online search, the friend room and the online VS exist only as dev mocks.
- Checks: typecheck, lint, 4,552 unit tests (236 files, 1 skipped), build, the full e2e suite (see the session report), and the Last Base Standing gate at full size (every row passes but the B3 time, which is at this machine's noise floor).

**Still open**

- B3: the longest Last Base Standing war takes about 1.2-1.4 s headless against 1.3 s (the lead decides: profile late Siege or re-baseline per tick).
- Not built yet: the rope marker on the minimap, dedicated escalation and crumble sounds, the length picker's collapse-to-chip fallback for a clipping locale.

**What the owner should try** (once published)

1. On Home, tap the switcher (left of Battle) and pick a mode; Battle then plays it. Tap the "Friend Duel · Later" chip to read what is coming.
2. At Arena 3 or higher, pick "No clock" on the plate and play a war to the end (it lasts at most about 26 minutes).
3. See the online mocks: open https://simnyborg.github.io/ageborn/?dev=1#screens/home-online/mid/844x390 and change `home-online` to `home-online-search`, `home-online-wait`, `home-online-found`, `home-friend`, `home-room`, `home-room-joined`, `home-join` or `vs-online`.

## 2026-09-30: Heavy counter review fixes (cloud session, not yet published)

- Heavy spam is now countered in every age, checked per age (new gate in `sim:exploits`): mono Heavy beats the tier VII bot at most 6.3% in any one-age window (Industrial was 87.5%), and mono Anti-heavy beats mono Heavy in every age (Modern was 0%). Harpoon Gunner ×3.0 and HP 286, Bazooka Trooper HP 363, Grenadier damage 55; the bot's anti-camp turret now reaches Heavies at its gate and it saves for it.
- Match 1: the Spear Hunter comes with its 100 gold, the prompt waits until the Tuskback is on screen and ends when the Spear Hunter walks on; a second (level-10) Tuskback meets it at Grogg's gate.
- The loss tip "Add {card} to {age}: it beats Heavies." is visible on the Result screen with an Open Army button.
- Checks: typecheck, lint, 4,183 unit tests (215 files, 1 skipped), build, 186 e2e tests pass. Exploit smoke has no new failure.
- Open for the owner: the Standard War Final Bell is still high (tier V 41.5%, VII 58%); bots that bank for Heavies still win more mirrors. Details in `docs/decisions.md` ("Heavy counter review fixes").

## 2026-09-29: A18 phases 0-3: longer matches, War Council, three stances (cloud session, not yet published)

**What works**

- Longer ages and matches (DESIGN A18.3): the first evolve comes at about 1:14 and every later age lasts about 1:40-1:55. Formats are age windows: Short War is Stone to Medieval (Final Bell 8:30), Standard War is Stone to Industrial (12:30) and Full War is Stone to Future (17:30). Mode select shows what each format plays. `SIM_VERSION` 3.0.0; old replays keep their result but no longer play.
- The War Council replaces the Treasury (A18.5): a round button right of the gold (key G) opens a sheet with four tracks: Troops per class, Defences, Economy and Command. There are 28 picks, one research at a time, and each pick is a choice of 1 of 2. Research is public (the enemy's ring and their finished picks show in the top bar). The side that is behind pays 20% less. Troop research only helps units trained after it finishes.
- Three stances (A18.4): Charge, Hold at a flag you can drag (or move with arrow buttons) from 320 to 800, and Fall back. There is a 3 s wait between changes. Keys: S and Shift+S.
- Six troop slots in battle and in the War Plan. The War Plan shows which Council troop lines each age can use.
- The AI researches, holds, moves its flag and falls back by tier. From Normal it punishes a thin army.
- Checks: typecheck, lint, 3,615 unit tests (190 files), build and size (527 KB initial) pass. The golden replays re-simulate identically in Chromium. CI now also checks them in Firefox (Online M1).

**Measured** (tier V Balanced mirror, 200 matches per format; exploit proxies vs tier VII, 100 per format)

| | Short | Standard | Full | Target |
|---|---|---|---|---|
| Median length | 8:30 | 11:37 | 14:50 | 7:00 / 10:30 / 15:00 |
| In the 80% band | 97.5% | 82% | 22% | ≥ 80% |
| Final Bell | 52% | 38.5% | 20.5% | ≤ 10 / 8 / 5% |
| Research share of gold | 14.9% | 16.1% | 16.8% | 15-25% |
| "A few soldiers, then evolve" wins vs Normal / Hard | 2.5% / 0% | 8% / 0% | 5% / 1% | ≤ 10% / ≤ 2% |
| No research wins vs a researching player | 20% | 13% | 10% | ≤ 30% |
| Mono Heavy spam | 44% | 44% | 42% | ≤ 35% |

- In the browser, a scripted player that spends all its gold, evolves at once and uses the Council beat Normal in a Standard War (6:10) and lost to Normal in a Short War. It lost to Hard in 4:03 without damaging the AI base.

**Still open**

- Too many matches end at the Final Bell, above all when two equal AIs meet. Stronger Siege damage, weaker Siege turrets and a harsher falling gate barely changed it, and faster decay only turns the Bell into a decay loss. By the A2.14 release rule this goes to the owner check: if the owner also sees standoffs, the Supply Cache (A18.3.5) comes next.
- Full War lengths split in two: about a third end early (4-8 min) and a quarter at the Bell. Mono Heavy spam wins too often (44%). The turtle proxies win far too rarely (the safe side).
- Not built yet: the start-era picker in Quick Battle and Skirmish, the "Suggested" research hint on Easy, the workshop icon over the base (waits for badge art, `docs/requests/wp4-council-badges.md`) and the AI's own flag placement in the HUD (phase 4).

**What the owner should try** (once published)

1. Play a Short War and a Standard War on Normal, then on Hard. Are the matches long enough, and does Hard feel clearly harder?
2. In a battle, press the Council button next to your gold (or G), pick a research, and watch the ring count down. Try both picks of a pair in different matches.
3. Press Hold, drag the flag forward, then try Fall back when their army is bigger. Tell us if matches get stuck with both sides waiting (that decides whether we add the Supply Cache).

## 2026-09-28 night: owner feedback batch 1 (published 7d0452b)

- Home is the hub right after the training match: big Battle button and entries for War Plan, Collection, Capsules, Customize (new), Trophy Road and Conquest; War Plan, Customize, Skirmish and Quick Battle unlock after match 1; a Wardrobe Crate is granted for the first win.
- Charge/Hold stance from match 1, Last Stand from match 2.
- Difficulty picker (Easy II, Normal IV, Hard VI, Expert VIII, Legendary X) for Quick Battle and Skirmish; the Rookie handicap only in the 2 onboarding matches; tiers VI-X play much stronger (waves, economy, turrets, power use).
- Class icons and Strong vs / Weak vs counters on every card surface; class filter in Collection; counter legend in War Plan.
- The Age Power is dragged onto the field (ghost, highlights, cancel, aiming mode on tap).
- Capsule opening rebuilt for impact; base upgrades (evolve, Treasury, new slot, turret build, Modernise) rebuilt for impact.
- Checks: typecheck, lint, 3,493 unit tests and build green on a clean worktree; headless new-player flow OK.

**Running:** A18 phases 0-3 (pacing, War Council, stances), cosmetics collections, UI master plan, ultra-realistic art exploration. See docs/night-plan.md.

## 2026-09-28: A17 step 1, review fixes: long lane, camera, fewer Final Bells (cloud session)

**What works**

- Tutorial: after the first evolve the tray shows the Medieval cards again (Footman, Longbowman, Arrow Storm). The HUD and the battle view now read each side's age from the match format, which skips Bronze in the tutorial. A test covers it.
- Fewer stalled matches: new rule "the falling gate". In Overdrive and Siege, a unit that dies within 120 lu of its own gate costs its base the unit's max HP. A beaten side that keeps spawning into a parked army now loses its base instead of feeding bounties. Golden replays are unchanged; `SIM_VERSION` 2.2.0.
- Pause: the pause panel is a small card under the minimap. The lane stays visible and can be dragged or scouted with the minimap while paused.
- Replays: the viewer has the minimap, the off-screen badges and a camera that follows the middle of the fight.
- HUD: key badges no longer hide card names; gold popups that land together show one sum ("+120", not "+3090"); the base-under-attack badge plays its `alert_base` alarm.
- The "Evolve!" bubble and hand no longer cover the minimap's base button. Tutorial match 1 timings are re-pinned; the Pebbler beat shows again.
- Tools: the balance mirror includes Standard War; `--out` folders are created. New e2e test `tests/e2e/camera.spec.ts` (A17.14 camera row).

**Measured** (Balanced mirror, 200 matches per format; proxies vs tier VII, 200 per format)

| | Before (review) | After | Target |
|---|---|---|---|
| Final Bell, Full War | 17.5-21% | 11.5% | ≤ 5% |
| Final Bell, Standard War | 16% | 10.0% | reported |
| Final Bell, Short War | 9.0% | 9.0% | ≤ 10% |
| Full War median | 9:07-9:14 | 8:39 | 8:30 ± 0:30 |
| Full War in 6:45-10:15 | 46-51% | 55.5% | ≥ 80% |
| Standard War median / in 5:00-8:00 | 7:20 / 79% | 6:59 / 85.5% | 6:30 ± 0:30 / 80% |
| Short War median | 5:06 | 4:58 | 4:45 ± 0:30 |
| Turtle wins, Short / Full (share at the Bell) | 29% / 11% (76% / 99%) | 16% / 8% (74% / 98%) | 35-45% (≤ 50%) |
| Heavy + mass Ranged at the Bell, Short / Full | 83% / 91% | 64% / 75% | reported |
| Mono Heavy, Short / Full | 38.5% / 26% | 43% / 31.5% | ≤ 35% |
| Random spam, Short / Full | 29.5% / 18% | 25% / 17% | ≤ 15% |

- First clash 0:13; contact between the turret covers 66-72% of the time.
- Camera e2e on 844 × 390: the contact point was on screen 96.5% of the time (2 bot matches; target ≥ 90%).
- Checks: `npm run typecheck`, `npm run lint`, `npm run build` and `npm run size` (446 KB initial) pass. `npm test`: 3,386 passed, 7 failed, all from other work in progress: the fake sim stream, the wall prototype (3), the real-sim render map and two eight-age sound and music id checks (`tests/integrity/ids.test.ts`, waiting for the DESIGN merge). The e2e boot, flows and camera specs pass (14 tests) against a local preview.

**Still open**

- The Full War Final Bell (11.5%) and the turtle band still fail. The turtle proxy never attacks, so it can only win at the Bell; in Full War the bot does not attack a 4-turret turtle until Siege (an AI change, WP3). By the release rule these go to the owner.
- Base time to kill in the no-defender scenario is 104-128 s (target 40-60 s). A built but unused lever ("the open gate", `economy.openGateLu`) gets it to 40-70 s but makes Full Wars end at a 7:19 median. Phase 3 and the owner choose.
- The meta Pause screen (ladder, Daily, Conquest, Skirmish) still covers the lane: `docs/requests/wp9-a17-pause-scout.md`.
- Grogg falls at about 2:30 instead of A8's 3:00. The Result screen cuts off the "Also earned" row on phones (WP9). Frame rate and swipe feel need a real phone.

**What the owner should try** (once this is pushed and deployed)

1. On your phone (sideways), play the tutorial. After the first "Evolve!", the cards should change to Footman and Longbowman.
2. In any battle, press pause, then drag the battlefield or tap the map strip at the top: you can look around while paused.
3. Play a Full War to the end. Tell us if matches still end at the Final Bell too often, and whether a match that is clearly won now ends quickly.

## 2026-09-28: Eight-age playtest in the browser (cloud session)

**What works**

- Headless Chromium with the dev autopilot (production build, desktop 1280 x 720 and iPhone 13 landscape): Full War plays Stone, Bronze, Medieval, Gunpowder, Industrial, Modern, Future, Cosmic in that order; Standard War stops at Modern (6 ages), Short War at Gunpowder (4). Every evolve switches to that age's music cue (`music.bronze` ... `music.cosmic`), the stinger plays, the result screen appears, and there were no console errors or failed requests in 8 runs. Every age draws its own units, tray cards, power and backdrop.
- Fixed: the app now bakes Stone and Bronze at boot; the A17 id lists are merged into DESIGN A13, A14.1 and A14.3; two stale tests (fake sim, wall prototype) follow the long lane and eight ages.
- Checks: typecheck, lint, build and size pass (initial download 446 KB). Tests: 3,392 pass, 1 fails (`src/render/test/realSim.test.ts`, the render package's own five-age sound list; already requested in `docs/requests/wp5-a17-eight-ages.md`).

**Still open**

- HUD: the age badge next to each side's health bar is empty for Bronze, Industrial and Cosmic (`AgeGlyph` in `src/ui/hud/icons.tsx` has no case for them; `docs/requests/wp5-a17-eight-ages.md`).
- The old-key music re-render and the balance numbers in the entries below. (A17 and A18 are merged into DESIGN as version 1.3, 2026-09-28.)

## 2026-09-28: A17 art and sound registered for Bronze, Industrial and Cosmic (cloud session)

**What works**

- The 21 new units, 12 turrets and 3 bases draw with their 3D sprite sheets; each also has a procedural puppet in the house style as fallback and card art. All 8 ages load per age (Stone and Bronze baked at boot: 59 ms of the 400 ms budget).
- Code-painted backdrops: Bronze (temples, colonnade, olive hills, volcano), Industrial (chimneys, gas holders, viaduct with a train, smog), Cosmic (nebulae, ringed planet, crystal spires, asteroids). The split-age seam blends them with the old ages.
- Effects: 7 projectiles, 6 beams, 4 ability and 6 power effects; age icons for all 8 ages, the 6 power icons, the 3 camera icons; 4 new signature animations (Colossus stomp, Warp Stalker blink, Starwarden beacon, Harpoon reel).
- Sound: the recorded Bronze, Industrial and Cosmic effect sheets, music and intensity layers, stingers in every key; ZzFX and sequenced fallbacks for all of them; key changes follow +2, +2, +1, +1, +1, +1, +1 with the lead dropping an octave past +6.
- Checks: typecheck and build pass; initial download 446 KB. Visuals (1,105) and audio (152) tests pass except the unit-sheet summary whenever the art task re-renders a unit (rerun the generator). The in-browser art checks pass (136 visuals, 66 effects), and a live bot match shows Bronze and the seam with no console errors.

**Still open**

- Other packages: power and ability effects and the eight-age key steps in the battle view (`docs/requests/wp5-a17-new-age-fx.md`), the app's boot ages (`docs/requests/wp11-a17-boot-ages.md`), the art pipeline's age lists, Riveter and Sapper card stills and a pre-rendered backdrop for the new ages (`docs/requests/art-a17-pipeline-ages.md`), and the DESIGN merge of A17 for `tests/integrity/ids.test.ts`. Lint fails on one unused import in `src/ui/hud/model.ts` (HUD work in progress).
- Audio: the Medieval, Gunpowder, Modern and Future music files are recorded in their old five-age keys, so in an 8-age match the music does not rise at the Medieval evolve and drops a semitone at Modern. They need a re-render in E, F, G and G# (`tools/audio`).
- The gallery's world view shows the backdrop only over the first ~1,460 lu of the long lane (pre-existing since the long lane).

## 2026-09-28: A17 step 2, eight ages as data (cloud session)

**What works**

- Bronze, Industrial and Cosmic are real ages: 56 units, 32 turrets, 16 Age Powers. Short War plays Stone to Gunpowder (4 ages), Standard War Stone to Modern (6), Full War all 8. Conquest plays Standard War (owner decision). The tutorial keeps its five ages.
- Content, strings, schema, counter matrix, the eight Generals' War Plans (The Warden brings all eight Legendaries), arenas and drop pools, Trophy Road, quests, titles and feats follow A17.13. Capsules carry about 1.75 times more copies and Amber so a card takes as long to max as before (owner decision).
- Save version 2: old saves get Bronze, Industrial and Cosmic starter loadouts and cards; nothing owned is lost.
- Sim: every new ability combination has a test; the Harpoon Gunner's Reel In needed a fix. `SIM_VERSION` 2.1.0, golden replays re-recorded (hashes unchanged).
- Checks: typecheck and lint pass. Content, sim, AI, meta, save, tools, UI screens, app, capsule and tutorial tests pass except the known retime test.

**Measured** (tier VII Balanced mirror, 200 per format; proxies 100 per format)

- Full War median 9:07 (target 8:30), 51% in 6:45-10:15 (target 80%), Final Bell 17.5% (gate 5%); Short War median 5:06, Final Bell 9.0%; first clash 0:13.
- Evolves 1:12, 2:08, 2:57, 3:28, 4:06, 4:54, 5:43 (targets 0:52 ... 6:30): early evolves are slow and late ones fast.
- New Legendaries are too strong in the per-card test: Bronze Colossus +14.5, Land Dreadnought +14.0, Mothership +15.0 points; Warp Strike -9.5. Base time to kill 104-128 s (target 40-60 s).
- Exploit proxies: random spam 29.5% / 18.0% and mono Heavy 38.5% / 26.0% (Short / Full); the turtle 29% / 11% with 76% / 99% at the Bell.
- Economy: median card to max 119 / 108 / 68 / 109 days (before A17: 114 / 114 / 71 / 109). Drop tool: 10 of 10 pass.

**Known issues**

- No art or sound for the new ages yet: their units, turrets, bases and backdrops draw placeholders, and the visuals manifest, sound and id tests fail (requests for WP4 and WP6). The DESIGN merge of A17 (A13, A14.1, A14.3 lists) is also needed for `tests/integrity/ids.test.ts`.
- The HUD and battle view read the wrong age in the tutorial, which now skips ages (request `docs/requests/wp5-a17-eight-ages.md`), and their tests still expect the old thresholds.
- Balance for eight ages (A17.16 step 4) is Phase 3 work: the numbers above.

**Next:** WP4, WP5 and WP6 requests, merge A17 into DESIGN, then Phase 3 balance.

## 2026-09-28: Phase 2b meta loop, review fixes (cloud session)

**What works**

- The full meta loop is wired: Home, capsules and the capsule show, Supply Capsule, War Chest, onboarding, Daily Challenge 2.0, feats, stopping cards, ladder, Conquest, Skirmish, replays and AI anti-spam.
- The Phase 2b review found 20 problems. All are fixed, each with a test where possible:
  - Result screen: a War Chest grant shows its bar full, and every extra capsule (Supply, the chest's Age Capsule, a Conquest milestone), the Wardrobe Crate and Clay pips show in the "Also earned" row. The reward list has a new `crate` reward step.
  - Age Capsules: a dialog now asks which age to pick when a match or a quest grants an Age Capsule (Daily first win, Conquest star 3, full War Chest, the Daily quest).
  - Honest copy: the Supply Capsule is never called "Daily Capsule". Every odds panel uses the A15.3 honesty line. Echo of You has its exact AI label. The Warden's Legendaries are disclosed at Standard levels too. The claims "free" and "offline" are gone. The Legendary line reads "Next capsule you earn" and counts capsules already in the tray. A lost Daily copies as "Lost at 6:10". Stale comments about the reel are corrected.
  - First session: the title shows only one Play button until onboarding is done. Every title opponent shows its tier and the Rookie AI line. A Settings gear on the title opens Settings (import, For parents, break reminder) during onboarding. An unreadable save shows a banner with an Import button. "Your army, your plan" appears once after match 3. The "Blocked at their gate" callout is off in scripted matches and uses at most 8 words. The onboarding Result offers only Next or Retry, and its other buttons have text labels. The Daily VS screen shows both sides at Lv 7.
  - Durability: a capsule show saved by another build, or one this build cannot play, is dropped instead of blanking the app. The save already holds the result, so only the animation is lost.
- Checks: `npm run typecheck`, `npm run lint`, `npm run build` and `npm run size` (421 KB initial gzip) pass. Unit tests and e2e pass for everything this step touched; see the known issues for the failures from work in progress.

**Known issues**

- Other agents are changing the sim, content counters, audio and art while this step runs. Their unfinished work makes these tests fail for now (9 unit tests out of 2,919, plus the e2e golden-replay determinism check): the match 1 retime, the wall prototype, the real-sim render map, the fake sim stream, the unit sprite sheet summary and the balance window. The orchestrator must get them green before the phase is committed as done.
- The onboarding Result still looks different from the Ladder Result, although its buttons are fixed. The two should be unified in Phase 3.
- The pause panel in the onboarding battles has no Settings entry; Settings is reachable from the title.
- If the tab is closed while the Age Capsule dialog is open, that match's result is lost (the result is saved once the age is picked).
- The total download (lazy art and audio) is about 55 MB, above the 16 MB budget (B16). This is only a warning from the size check.

**What the owner should try** (once this is pushed and deployed)

1. Open the game in a private window and play the two tutorial matches. The title should show only one Play button and a gear icon in the corner.
2. Tap the gear: Settings should open. Press Back to return.
3. After match 3, look for "Your army, your plan" on Home.
4. Win a Daily Challenge: a window asks which age the Age Capsule should come from.
5. Tell us if anything looks wrong or confusing.

**Next:** get the in-progress sim, content and audio work green, then Phase 3 (`ageborn-phase3-polish`).

## 2026-09-28: Phase 2a playable battle, Checkpoint A/B (cloud session)

**What works**

- A full battle in the browser: the real sim, AI generals, procedural visuals, feel layer, HUD and audio all run together. Quick Battle (Short, Standard and Full War) against an AI-labelled General works from the title screen, as does tutorial match 1.
- Three automated playtests (rules, feel, robustness) played real matches in headless Chromium and fixed what they found:
  - Rules: tapping a card marked ARMY FULL now queues another copy, as the sim allows (C5 #10, A2.7). The HUD now applies Daily Challenge modifiers (XP threshold, prices, income, Siege time); the modifier rules moved to `src/core/modifiers.ts` so render can use them (B2), and `src/sim/modifiers.ts` re-exports them. Golden replays are unchanged. Logged in `docs/decisions.md`.
  - Feel: new Tar Pits ground (uneven glossy tar pools, pebbles, bones, grass, depth scaling) and a new result screen (outcome tint, sunburst on a win, staged recap; reduce-motion respected).
  - Robustness: 10 bot-vs-bot Full Wars at 2x with pause, tab-hide, restart and Play again; no console errors, no stuck matches. Fixed a memory leak of about 0.75 MB per match (backdrop strip textures kept every battle alive); new test `src/visuals/test/backdropDestroy.test.ts`. JS per frame is well within budget (p95 about 11 ms, at most 5 draw calls).
- Checks C5 #8-23 were checked in the browser (phase times, bounties, XP cap, evolve, pop/queue/Legendary limits, turrets, Hold line, Last Stand, keys, pause and speed, auto-pause on tab hide).
- Final gate: `npm run typecheck`, `npm run lint`, `npm test` (2,617 passed, 1 skipped), `npm run build`, `npm run size` (440 KB gzip initial, limit 3 MB) and `npm run test:e2e` (11 passed, 4 skipped until Phase 2b; includes booting at `/ageborn/` and a Quick Battle with no console errors) all pass.

**Known issues**

- Matches drag on: about half of Full War mirror matches end at the Final Bell, often 40%/40%. At the gate only about 3 units can reach the enemy base, so base time-to-kill is 128-167 s against a 40-60 s target (`reports/balance.md`). Phase 3 must decide whether the movement rule or the target changes.
- Units are small on a phone (about 35-40 px tall in landscape), because the whole lane fits on screen (A2.1). Design decision pending.
- Art details: pale blotches on skin at battle size; the pumpkin-head skin hides the blue team colour; the mount price label shows on the title screen.
- The result screen covers the battle instead of showing its last frame.
- Speed resets to 1x on Restart and Play again.
- 60 fps is not confirmed: this machine renders WebGL in software. It needs a check on a real phone.
- About 0.3 MB of heap growth per match remains (looks bounded).
- Quick Battle shows the stance flag and Last Stand button on a fresh profile; the real onboarding flow (Phase 2b) must hide them until matches 4 and 5.
- The AI ignores Daily Challenge modifiers; Daily Challenge itself is not wired yet.
- Congreve Rack rockets can land about 521 lu from the gate (designed scatter) while C5 #14 says 480.

**What the owner should try** (once this is pushed and the Pages deploy has finished)

1. Open https://simnyborg.github.io/ageborn/ on your PC and on your phone (turn the phone sideways).
2. On the title screen pick Short War and press Quick Battle.
3. Tap unit cards to train units, press Evolve when it lights up, try a power, build a turret on your base.
4. Try pause, the speed buttons, and switching to another tab and back (the game should pause).
5. Play to the end and look at the result screen, then press Play again.
6. Tell us: does it look good, does it feel fast enough, and is anything confusing or broken? On the phone: are the units big enough?

**Next:** Phase 2b (`ageborn-phase2-loop`): the full meta loop (onboarding, capsules, War Plan, collection, road, quests, save, replays).

## 2026-09-28: Phase 1 work packages (cloud session)

- All 12 work packages built and each independently reviewed against DESIGN (run as three parallel tracks): content compiler (WP1), simulation with golden replays (WP2), AI generals (WP3), procedural visuals plus a working sprite-sheet tier (WP4), battle view, feel layer and HUD (WP5), audio (WP6), meta rules (WP7), save system (WP8), meta UI screens (WP9), capsule show (WP10), app scaffold, session, onboarding and replay (WP11), tools, integrity tests and e2e skeleton (WP12).
- Whole tree green: typecheck, lint, 2,609 unit tests, build. The production build boots at `/ageborn/` with no console errors; `?dev=1` lists 11 dev pages.
- Design work done alongside: engagement research and addendum `docs/design-engagement.md` (A15), depth and variety research and addendum `docs/design-depth.md` (A16), and a 3D sprite pipeline spike in `art/blender/` (report in `art/blender/SPIKE_REPORT.md`). A15 and A16 are merged into DESIGN.md after the owner's decisions.
- 40 change requests in `docs/requests/`, mostly app wiring; they are applied in Phase 2a (battle) and Phase 2b (meta loop).

**Next:** Phase 2a (`ageborn-phase2-battle`): wire the real sim, AI, visuals, audio and HUD into a playable battle.

## 2026-09-27: Phase 0 foundation (cloud session)

- Scaffold: Vite 8 + TypeScript 6 + Preact + PixiJS 8 with exact pins, ESLint layer and determinism rules, Vitest, Playwright (Chromium), size gate. `npm run dev` shows a Pixi canvas with a Preact shell; `?dev=1` lists dev pages. The build uses base `/ageborn/`.
- All B15 contracts in `src/contracts` (checked type-for-type against DESIGN), fakes for tests and dev pages, `docs/contracts.md`.
- `src/core` (sfc32, xmur3, mulberry32, FNV-1a, bp math, ring buffer, assert) with known-answer tests; i18n loader with EN fallback.
- All Part A tables in `src/content/raw` (35 units, the hidden Training Dummy, 20 turrets, 10 powers, economy, formats), cross-checked against A2, A5 and A14.2; frozen copy in `tests/fixtures/content`.
- Independent verification: typecheck, lint, 171 unit tests, build and size gate (about 134 KB gzip initial) all pass; headless Chromium showed no console errors on dev or on the `/ageborn/` preview. A lint test proves `pixi.js` in `src/sim` is rejected.

**Open:** no e2e specs yet (WP12); WebKit e2e not configured (only Chromium is available here); `emoteCooldownMs` is a placeholder 3 s (WP1 decides).

**Next:** Phase 1 (`ageborn-phase1-packages`).

**Resuming elsewhere (for example on the owner's PC when the cloud credit runs out):** the cloud session works on branch `main-ipy06f` (draft PR #1) and fast-forwards `main` after each green phase. Commits named `WIP ...` are mid-phase snapshots. To resume: `git pull`, check out `main-ipy06f` if it is ahead of `main`, run `npm ci`, then continue with the next workflow named above.

## 2026-09-27: research and design (local session)

- Researched the genre (Age of War 1+2, Stick War, Battle Cats, Clash Royale meta, case-opening presentation, game feel, tech stack, web portals). Reports in `docs/research/`.
- Three design proposals, a synthesis, three critiques (player, builder, balance) and a revision produced `docs/DESIGN.md` v1.1.
- Created the public repo `SimNyborg/ageborn` and a GitHub Pages workflow that shows a placeholder page until the game builds.
- Wrote `CLAUDE.md`, `docs/BUILD_PLAN.md` and the saved workflows in `.claude/workflows/`.

**Next:** Phase 0 (`ageborn-phase0-foundation`), then Phase 1, then Phase 2a so the owner can play a battle. The build is meant to run in a Claude Code cloud session (the owner has promotional cloud credit that expires 2026-11-05).

## 2026-09-30 night: published b1f59be

Published to main after typecheck, lint, 4,121 unit tests, build, 166 e2e tests and a production boot check (no console errors, phone and desktop):

- UI rebuild (docs/ui-plan.md UI-0 to UI-4): design system and motion tokens, War Path Home with an 80-level campaign, six-card battle HUD, Army deck builder, review fixes.
- Capsule tiers v2: Clay, Bronze, Silver, Jade, Gold, Platinum, Aeon; 200-slot Win bag (Aeon exactly 1 in 200); summit strikes; migration of old Aeons to Gold.
- Power rework (A2.9): gold cost and reload, Home and Field slots, target caps, 48 powers, AI, HUD, effects. Open: some balance gates are not met yet (tier VII vs V 57-58% vs 60% target, power share of kills, bait edge, turtle Bell rate).
- Timed hammer strike in the capsule show (Perfect ±60 ms, Good ±140 ms, cosmetic only).
- Realistic Stone Age art (units, turrets, base, backdrop).

Next: heavy counter class, free capsule every 5 h (Field Cache), stationary Fort class, realistic restyle of the other 7 ages.

## Known issues for the MVP pass (2026-10-01)

- Audio: an intermittent page error when two music fades are scheduled on the same gain at the same moment (`src/audio/musicEngine.ts`, `equalPowerRamp`). Seen once in e2e (ux spec); passes on rerun.
- Performance: the longest Last Base Standing war simulates in about 1.2-1.4 s headless against a 1.3 s budget (see decisions, "Last Base Standing timing row").
- Balance: Final Bell share in Standard is too high; bots use forts too little; some cards, powers and forts sit outside their win-delta band.
