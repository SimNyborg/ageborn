# DESIGN-40: visible battle damage (queue item 40), with item 38 Phase B refreshed

> Kept in the repo on 2026-10-26 (copied from the orchestrating session's scratch folder). Paths under `/tmp/claude-0/...` or `scratchpad/...` inside point at that session's working files (captures, scripts) and may no longer exist. The owner questions are tracked in `docs/owner-queue.md`; until answered, the recommended defaults apply.

2026-10-25. Designer pass, read-only on the repository at `bed41b9` (item 38 Phase A merged, the WebKit fade fix on top). Nothing was built. Everything written for this pass lives under D = `/tmp/claude-0/-home-user-ageborn/e9e6071d-3409-58a6-a28d-0aba492052fd/scratchpad/design40`.

I did not run a dev server: the machine sat at a load of 11 on four cores (three agents, Blender renders). Today's battle was judged from Phase A's frame-exact captures (`scratchpad/combat/phaseA/B/ev2/`, `scratchpad/combat/reviewA/pairs/`). A still mock-up of the damage stages, composited from the shipped HD sheets, is in `D/mock/damage_mock.png` (script `D/bin/mock.py`, read-only on `public/art/units/**`).

## Short version

- **Three damage stages at 75%, 50% and 25% HP** on all 167 unit sheets (and on skins, which are drawn as puppets). These are the bases' own crumble thresholds (A11), so the game speaks one damage language. A heal steps back with a 5-point hysteresis.
- **What a stage shows depends on what the unit is made of.** Machines dent, crack, lose plates, then smoke, spark and burn with pale flames. Soldiers get torn, sooty clothes, dented helmets and cracked shields, and move wearily at the last stage. Beasts get dusty and scuffed, their barding tears, horns and tusks crack, and they breathe heavily. Flyers trail smoke, mechs spark at the joints and energy units flicker. **No blood:** the damage goes on clothes, armour, shields and machines. Soot never goes on faces or skin.
- **A step reads as a moment.** At the spot of the new mark, a short burst plays that matches the blow (a slash tears, a blunt blow dents, a shot punches a hole, a blast scorches), with a quiet material sound. It adds no hit-stop, shake or kick, and it is rate-limited.
- **How to build it (recommended): option (a) plus option (c).** Damage marks are small procedural decals drawn on top of each unit at per-frame spots that the Blender pipeline writes. A new anchors-only mode does this without running Cycles. On top come a scorch tint and per-family emitters for smoke, fire, sparks, steam, breath and motes through the shared particle pool. It costs **0 MB of the 320 MB unit sheet budget and at most about 4 MB in total**, adds no per-object render pass (WebKit) and an estimated +0.3 to +0.6 ms per frame at CPU 4x in the 80-unit stress battle. Baked damaged sheets (option b) would double to quadruple sheet memory, which an iPhone cannot hold.
- **Item 38 Phase B shrinks from 27-36 agent-days to about 5-7 committed days** (plus 6-9 optional), because Phase A's runtime staging, reactions and deaths already deliver most of what B1-B4 aimed at. What remains is a targeted art fix list (B1′, about 10-15 units whose clips themselves miss) and a new data step (B0): per-frame torso and head trackers from the same anchors-only pass, which fix Phase A's open staging cases with no re-render. Every Phase B re-render writes the damage spots in the same run, so each unit is rendered at most once for both items.
- **Effort for item 40: about 17 agent-days** (range 15-19), shipped in three waves, the most-seen units first. Wave 1 (82 units) is Stone, Bronze, the tutorial's starter cards and every vehicle and flyer. The owner reviews a video after wave 1.
- **Two owner questions:** blood (recommended: none), and how strong the damage looks should be (recommended: clear).

---

## 1. The goal, and what "done" means

**The owner, 2026-10-18 (queue item 40):** "when the troops get more and more damaged, you must be able to see it on them. For example the tank starts to get dents, cracks, smoke, fire, the soldiers bleed, and so on. It must be like that with all the figures."

**Reading.** At a glance, a player sees how hurt every unit is, without reading a bar. The damage builds up on the unit as HP falls, in a way that fits what the unit is made of. Within the A11 cartoon style, "damage" means believable wear and consequence, not gore. The owner asked for "bleed"; that is open as question 1 (section 8), and everything below assumes the recommended answer (no blood).

**Done means:**

1. Every one of the 167 unit sheets, plus every skin drawn as a puppet, shows its damage stage in battle at 75%, 50% and 25% HP, by family (section 3). There is no blood (unless the owner chooses otherwise) and no mark on faces or skin.
2. Crossing a step reads as a short moment, a burst and a sound keyed to the blow. It adds no hit-stop, shake or kick, and is rate-limited in big fights. Healing above a step mends visibly.
3. **Readable at 844 × 390:** at game scale (1.83 device px per lu at DPR 2), stage 2 is distinguishable from stage 0 at a glance for every family. The HP bar is never covered and stays the exact readout.
4. **Presentation only:** the sim's event streams are identical with and without the feature, replays are pixel-identical between two films, there is no `Math.random`, and live (Ranked) matches gain no freeze.
5. **Budgets hold:** frame time is inside the +1 ms gate (PERF-A's method, the 80-unit stress battle) and the first-contact window gets no worse; draw calls stay at or under 80 (High) and 40 (Lite); particles stay within their caps; `tests/e2e/memory.spec.ts` (600 MB at DPR 2) passes with at most about 4 MB more; CI's WebKit job is green, the long wars included.
6. Reduce motion and Graphics Lite versions behave as in section 6. The A11 colour rule and the 18% team coverage hold on composited stage-3 frames. A12's checklist gains the damage item.
7. The owner has seen and approved the wave-1 video.

## 2. What exists today, and its limits

| What | As built (code) | Limit for item 40 |
|---|---|---|
| **HP bars** | `src/render/healthbars.ts`: shown once a unit is damaged, in team colour, 5 px tall, `barWidthLu` 30-84 lu by size (an infantry bar is about 29 CSS px on a phone), 12 lu over the head anchor; a ghost segment holds 300 ms and drains over 350 ms; a shield strip. In a crowd (more than 10 units, `BAR_CROWD_UNITS`) only each side's 3 frontmost units and units hit a moment ago show a bar (`battleView.drawBars`). Bars draw in their own layer above the VFX (`render/layers.ts`). | Exact but tiny. In a big battle most damaged units have no visible bar, so their state is invisible. A soldier and a tank look the same. |
| **Hit feedback** (item 38 Phase A) | A white flash of 60-90 ms by tier; `react(tier, dir)` (an additive push, a tilt with the head snapping back and a squash, from 3 lu / 4.5° to 13 lu / 15°); a 72 ms hit-pose insert or the hit clip; contact sparks by kind and tier; `mat_armour` / `mat_wood` under hits on metal or wood; stuck arrows and javelins (1.2-1.9 s); hit-stop of 35-110 ms; kicks on heavy hits and kills. | All transient: everything is gone within 2 s. Nothing accumulates, so 0.3 s after its last hit a unit at 10% HP looks like a fresh one. |
| **Deaths** | `dieWith`: the body falls along the blow, lands, lies 2 s and fades 0.6 s (one picture for at most 4 bodies at once, the WebKit fix); seeded bits lie 5 s (at most 40 on the field); KO stars. | The consequence comes only at death. |
| **Bases** | `atlasBaseView.ts`: four baked body frames, one per crumble stage (75/50/25%), debris on a stage change, smoke from stage 2 at the sheet's `smokeLu` spots (about 1.1 puffs a second per spot), lights and the aura dim; the A11 collapse. | Baking stages works here because a base is **one static frame per stage** (4 frames). On a unit the same trick multiplies 47-65 animated frames per stage (section 4b). |
| **Forts** | `atlasFortView.ts`: crumble frames at 66/33/12% (`fortCrumble`), a decay crack overlay drawn as `Graphics`, a crumble burst (shake, flash, chips, dust) and `fort_crumble`. | Static bodies only; Graphics cracks cannot follow animated frames. |
| **Units** | `UnitPose.hpBp` already reaches every unit view every frame (`battleView.writePose`: `p.hpBp = e.bar.hpBp`). The atlas view (`visuals/adapters/atlas.ts` `setPose`) ignores it, and so do the procedural puppets. | Nothing shows. This is the gap item 40 fills, and the data it needs is already at the view. |

## 3. Damage states

### 3.1 How polished family games show damage (research, with sources)

| Game (rating) | What it shows | Lesson for us |
|---|---|---|
| Bloons TD 6 (family game) | A MOAB-class blimp shows more damage **at each quarter of its health**: rips and tears in its skin that grow until it pops ([Bloons Wiki](https://bloons.fandom.com/wiki/Massive_Ornary_Air_Blimp_(MOAB)), [bloonswiki.com](https://www.bloonswiki.com/MOAB_(BTD6))) | Equal steps; damage drawn on the object's skin, never on a body; the step itself is readable. |
| Plants vs. Zombies (family game) | Armour (cone, bucket) absorbs damage before the zombie and visibly wears in stages before it falls off ([PvZ wiki, Zombies](https://plantsvszombies.wiki.gg/wiki/Zombies_(PvZ))); the PvZ2 arcade machine changes its look at 280, 560, 840 and 1,120 damage before it breaks at 1,200 ([PvZ wiki](https://plantsvszombies.wiki.gg/wiki/Arcade_machine)) | Wear goes on the gear (helmets, shields, buckets), in equal steps. |
| Angry Birds (family game) | Wooden blocks show ruptures as they take more damage ([Angry Birds wiki](https://angrybirds.fandom.com/wiki/File:INGAME_BLOCKS_BASIC_1_(17).png)) | Material decides the mark: wood splinters, stone cracks. |
| Asterix & Obelix: Slap Them All! 2 (**PEGI 7**) | Comical violence against human characters, comic-book "Pow" bubbles when they fall, **no visible injuries** ([PEGI listing](https://pegi.info/bg/search-pegi?q=Obelix)) | Cartoon soldiers can be beaten up at PEGI 7 as long as no injuries show. |
| Splatoon (PEGI 7 / E10+, Cartoon Violence) | A splatted player bursts into ink; no wounds or blood ([AskAboutGames](https://www.askaboutgames.com/parents-guide-to-splatoon-pegi-7), [ESRB](https://www.esrb.org/ratings/33883/splatoon/)) | A stylised hit burst can replace blood when it is clearly not a body fluid. |
| Vehicle and turret games: "Damage Is Fire" | Vehicles start smoking and sparking when damaged, and fire marks "about to blow"; Team Fortress 2's sentry guns smoke and spark, then burn ([TV Tropes](https://www.tvtropes.org/pmwiki/pmwiki.php/Main/DamageIsFire)); StarCraft's damaged buildings catch fire at low health ([StarCraft Wiki](https://starcraft.fandom.com/wiki/Fire)) | Smoke, then sparks, then fire is the language every player already reads for machines. |
| Halo (visual language only; not a family rating) | Energy shields flicker when hit and flare when they collapse ([Halopedia](https://www.halopedia.org/Sangheili_personal_energy_shield)) | Energy bodies show damage as an unstable flicker. |
| Monster Hunter (visual language only) | Broken horns and severed tails change the monster's model ([Partbreaker, Fextralife](https://monsterhunterworld.wiki.fextralife.com/Partbreaker)) | A chipped horn or tusk on a beast reads as damage with no wound. |
| Clash Royale, Kingdom Rush (the genre's leaders; DIAGNOSIS section 2) | Units show HP bars and flashes, no damage states | Damage states would set Ageborn apart in its own genre. |

**What the evidence says:** family games put progressive damage on armour, gear, objects and machines, not on bodies; they use equal steps; smoke, sparks and fire mean "badly damaged" for machines; energy flickers. That is the plan below.

### 3.2 The steps

| | Stage 1, "scuffed" | Stage 2, "battered" | Stage 3, "wrecked" |
|---|---|---|---|
| Enters at (damage) | HP ≤ 75% | HP ≤ 50% | HP ≤ 25% |
| Leaves at (heal, hysteresis) | HP > 80% | HP > 55% | HP > 30% |
| Marks shown | 1 | 2-3 | 3-4 |
| Persistent effects | none (a light tint on machines) | thin smoke or steam on machines; sparks on mechs; flicker on energy units | smoke column, small pale fire and sparks on machines; smoke trail on flyers; weary motion on soldiers and beasts |

- **Why 75/50/25 and not the forts' 66/33/12.** These are the bases' thresholds, so players learn one rule. They also give stage 3 enough life to be seen. An infantry blow does about 12.5% of an infantry unit's HP (DIAGNOSIS P2), so each stage lasts about two blows. At 12% the richest look would last one blow. Heavies and Legendaries take many smaller hits and hold each stage much longer; that is right, because they are the units people watch.
- **Rules.** The stage comes from `UnitPose.hpBp` (the sim's HP; shields count for nothing). Marks accumulate: a stage adds marks and never moves the old ones. A hit that crosses two steps shows the deeper stage with one burst. **The killing blow changes nothing:** the body falls with the stage it had, and the death has its own beats. A frozen (time-stopped) unit takes its new marks silently. Healing above the hysteresis line removes the newest marks (section 3.4).
- **Variety and keying.** Each unit draws its own order of spots and mark variants from its view seed (`(unit id ^ match seed)`, already passed by `setIdentity`), so two Footmen never look identical. The mark a step adds matches the blow that crossed it whenever the spot's material allows: slash makes a tear or scratch, blunt a dent or crack, pierce or bullet a hole, blast or laser scorch and soot, an effective counter hit (×1.5 or more) the bigger variant. Otherwise the material's default mark is used. The hit's kind already exists in the event mapper (`sparkKind`).

### 3.3 What each family shows

The 167 sheets fall into eight families (the full list is in Appendix A): 86 soldiers, 12 armoured troops, 13 beasts, 13 riders, 19 vehicles and machines, 9 flyers, 9 mechs and constructs, and 6 energy units. Marks are drawn per material: cloth, hide and fur, metal, wood, stone and crystal and bone, glass and visor, energy.

**Soldiers, by age** (all soldiers: no marks on faces or skin; soot on clothes, armour and gear only):

| Age | Materials | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|---|
| Stone | hide, fur, bone, wood | dust on the hide, a scuff | a torn hide edge with a hanging strip; a cracked wooden club or hide shield | torn and singed, a chipped bone ornament, dust coat |
| Bronze | linen, polished bronze, round shields | a dented helmet, a scratched shield | a cracked shield, a torn chiton with a hanging strip | the shield nearly split, soot on the bronze, a torn cloak |
| Medieval | mail, plate, tabards, kite shields | a dented helmet, a scuffed shield | a crack across the shield, a torn tabard with a hanging strip, soot on the helmet | a second crack (the shield nearly split), two strips, sooty armour |
| Gunpowder | coats, tricorns, sashes | powder soot on the coat | a torn sleeve or coat tail, a hole through the hat | a powder-blackened coat, frayed sash, two strips |
| Industrial | work clothes, overalls, goggles | coal smudges | torn overalls, a dented helmet | sooty and torn, cracked goggles |
| Modern | olive uniform, helmet, webbing | mud and dust on the uniform | a torn sleeve, a scraped helmet | sooty, torn, a strap hanging loose |
| Future | white and charcoal armour, visors | a scuffed panel | a cracked visor, a laser scorch | cracked panels, a sparking seam, a glitching visor light |
| Cosmic | void suits, crystal, star-white trims | a scuff | cracked crystal or visor | shattered crystal facets, motes drifting off |

All soldiers at stage 3 get **weary motion** (section 3.5). **Armoured troops** (Footman, Hoplite, Phalangite, Shield Bearer, Hide Shield, Greatsword Knight, Warhammer Sergeant, Iron Mantlet, Sandbag Carrier, Barrier Trooper, Photon Knight, Star Legionnaire) lean on metal and shields: dents at stage 1, cracks at stage 2, and at stage 3 a plate or shield chip flies off at the step and a hole stays where it was, which is how "armour that loses plates" reads.

**The other families:**

| Family | Stage 1 | Stage 2 | Stage 3 | Burst at a step |
|---|---|---|---|---|
| **Beasts** (13) | dust on the legs, pale scuffs on the hide | the team barding or blanket tears and a strip hangs loose; a crack in a horn or tusk; more scuffs | a second tear, a heavy dust coat; tired: a heaving breath, a vapour puff from the nose, dust at the feet when it walks | a puff of fur and dust; at stage 2 a horn or tusk chip flies off (the Monster Hunter idea) |
| **Riders** (13) | the rider as a soldier of its age **and** the mount as a beast or machine: a helmet dent and dusty legs | a torn tabard and torn barding | rider weary, mount tired (breath puffs); bikes and boards as small machines | both parts' bursts, at the mark that is new |
| **Vehicles and machines** (19) | dents and two or three bullet holes (wood: chips and scratches) | a crack, a **missing plate** (dark hole with ribs and rivets; the plate tumbles off at the step), soot, thin grey smoke from the engine (steam machines: white steam) | more holes, strong scorch darkening, a dark smoke column, **small pale flames**, sparks, an engine sputter (exhaust puffs and a slight judder); wooden engines: broken planks, scorch and burning wood | sparks, a plate or plank flying off, a puff of dark smoke; at stage 3 a quiet "whump" as the fire catches |
| **Flyers** (9) | dents, holes | a thin smoke trail; the balloon's envelope tears and a rope dangles | a thick trail, a sputtering engine (an irregular bob, 2-3° nose down), sparks | sparks and a puff that stays behind in the air |
| **Mechs and constructs** (9) | a dent, scratches | a cracked visor or plate, holes, sparks from a joint now and then | a missing panel with cables, smoke from the back (steam on the Steam Golem), sparks, a hitch on one leg, flickering eye lights; stone and crystal golems shed pebbles | a shower of sparks, a panel flying off |
| **Energy units** (6) | a short glitch now and then | cracked crystal or visor, a flicker (a mint pulse of 40 ms) every 1.2-2.4 s | frequent flicker (0.7-1.4 s), motes drifting off | a crackle of mint arcs and shard flakes |

**Colour rule (A11, MUST).** Marks are colour-neutral: near-black cores (about #2B2420 at 80-90%), pale rims and highlights (#F4EBD8 at 55-75%), soot at 35-60%. They read on any material and every team preset; the forts' cracks already work this way. Hanging strips use the team colour dulled 30% toward dust, like the death bits' cloth scrap. **Fire is pale:** a cream core, a peach body and a brown rim under 40% saturation, the same recipe as today's explosion lobes (`effects/recipes.ts`), because saturated orange is the orange team's hue. Sparks are pale yellow-white, flicker is mint or white, and nothing is lilac (the frozen tint) or blue.

**Never confusable with** stun (dizzy stars), slow (a dark puddle at the feet), snare (pale bands at the shins), frozen (a lilac tint and the clock), shields (the bubble), heals (mint glyphs), the Legendary aura (white) or the levy pennant. So: no stars, no dark marks on the ground under a damaged unit, no lilac or blue tint.

### 3.4 The step change, the moment itself

- **Where and when.** The step is detected in the frame the HP drops, which is the frame of the blow's impact. The burst plays **at the spot of the new mark** (or at the contact point if the unit has no spots yet). The blow's own spark, flash and reaction play as today.
- **Beats (about 250-450 ms).** The hit's own white flash (60-90 ms) is the anticipation. As it ends, the new mark scales in 1.25× → 1.0 over 90 ms with an overshoot, so the eye catches it appearing. Pieces fly back along the blow: 1-3 bits from the material kit (splinters, a plate, a chip, threads, fur). They land and lie 2 s, counted against the existing 40-bit cap. A small puff (dust, fibres, smoke or steam) follows.
- **Sound.** A short material layer: `dmg_rip` (cloth, hide), `dmg_clank` (a metal dent or a plate off), `dmg_splinter` (wood), `dmg_crunch` (stone, crystal, bone), `dmg_zap` (energy, electrics), and `dmg_ignite` for a machine's stage 3. Each has 3 variants, plays 4 dB under the hit (so the hit stays the loudest beat, A13), is panned and faded like every world sound, and passes the battle trim.
- **Restraint in big fights.** No hit-stop, shake, kick or flash is added. Bursts are limited to 3 per 250 ms on screen; the rest apply silently. Step sounds play for large and huge bodies, and for small and medium bodies only at stage 3; at most one per 200 ms per material, at low priority in the stacking and burst limiter.
- **Mending.** When a heal lifts a unit above a hysteresis line, its newest marks fade out over 300 ms with a small mint glint (the heal colour), and machines get a spanner-like sparkle under the Repair Drone. Healers become visible in a new way.

### 3.5 Motion at stage 3 (presentation only; timing untouched)

- **Soldiers: weary, not wounded.** The idle plays at 0.85× (slower, heavier breathing) with a 2% breath squash, and every second walk contact step dips 1.2-1.8 lu (a stumble, from the sheet's walk `contacts`). There is **no limp**: PEGI 12 allows no "emphasis on pain" on human characters ([AskAboutGames](https://www.askaboutgames.com/pegi-ratings)), and a limp reads as an injured leg. Weariness reads as exhaustion.
- **Beasts: tired.** A heaving breath, the idle at 0.85×, a vapour puff from the nose every 1.1-1.5 s (seeded), and dust at the feet on walk contacts.
- **Machines:** an engine sputter every 1.2-1.8 s (a 140 ms judder of 0.6 lu and a dark exhaust puff). **Mechs:** a hitch on one leg's contact step and joint sparks. **Flyers:** a sputter dip of 2 lu every ~1.5 s and 2-3° nose down. **Energy:** a 40 ms x-shift of 1.5 lu with the mint pulse.
- Walk speed, attack timing and the impact frame never change: the walk is still retimed to the drawn velocity (planted feet), and attacks stay on the sim's ticks (A12 checklist 3).

### 3.6 Readable next to the HP bar at 844 × 390

- **Scale.** Infantry stands about 62 CSS px tall on a phone (0.915 CSS px per lu, 1.83 device px per lu at DPR 2). The mock-up showed that marks under about 5 lu vanish at phone size: see `D/mock/damage_mock_v1_too_subtle.png` against `D/mock/damage_mock.png`. The rules that follow from it:
  - stage-2 and stage-3 marks are 6-9 lu across (5-8 CSS px);
  - crack lines are at least 1.8 lu wide;
  - marks have near-black cores;
  - at least one stage-2 mark sits on the largest camera-facing part (shield face, tunic, hull side);
  - soldiers get a moving cue (the hanging strip sways; weary motion at stage 3), because motion reads where 6 px of texture does not.
- **What the mock-up shows** at 1.83 device px per lu: stage 2 and 3 are clear on the Footman (soot on the hat, the crack across the shield, a tear with a hanging strip), on the Tankette (holes, the missing plate, darkening, smoke and fire) and on the Walker Mech (cracked visor, holes, smoke). At true phone size the Tankette's and the Mech's smoke and scorch still read; the Footman's marks read as "battered" at a second glance. That is why stage 3 adds motion for soldiers and why the burst marks the step.
- **The bar stays the exact readout,** the body shows the band, and both come from the same `hpBp`, so they never disagree. Damage looks show on every unit, including the many whose bars the crowd rule hides, which is a real readability gain in big battles.
- **Nothing covers the bar.**
  - Bars draw above the VFX layer (`layers.ts`).
  - Smoke starts at the back of the body, drifts away from the facing and fades before it reaches the bar's height, at no more than 0.6 alpha.
  - Fire stays on the hull, and sparks live under 200 ms.
  - No damage element sits between the head anchor and the bar, except the step burst's pieces for a moment.

### 3.7 Blood: the owner's options

| Option | What it means on screen | PEGI and the portals | Recommendation |
|---|---|---|---|
| **1. None** | As above: torn and sooty clothes, dented helmets, cracked shields, weary motion, machines that smoke and burn. Soldiers look beaten up, never wounded. | Unchanged. Comical violence against human characters with no visible injuries is PEGI 7 (Asterix & Obelix: Slap Them All! 2); PEGI 12 at most. Fits Poki's "family-friendly, no graphic violence" ([Poki quality guidelines](https://sdk.poki.com/poki-quality-guidelines); `docs/research/market-portals.md`: "no graphic violence or visible body fluids") and CrazyGames' PEGI 12 cap. Fits the lower App Store tiers ([Apple](https://developer.apple.com/help/app-store-connect/reference/age-ratings)). | **Recommended.** |
| **2. A stylised hit burst, not red, not a liquid** | A stronger comic impact on soldiers at a step: a cream impact star and a puff of dust and threads that burst **from the blow, not from the body**. | Unchanged, as long as it never reads as a body fluid. A coloured splash (green or purple "ink") would: the ESRB lists "discolored and/or unrealistic depictions of blood" as Animated Blood ([ESRB descriptors](https://strategywiki.org/wiki/ESRB)), and the colour rule leaves only green, purple, white or grey for such a splash anyway, which reads as alien blood on a human. | Acceptable but adds little; part of it is in option 1's burst already. |
| **3. Blood as a setting, off by default** | Red drops on hits and red stains on soldiers' clothes and on the fallen, only once the player turns it on. | The game then contains blood and injuries on human characters: **PEGI 16** for the whole game (PEGI 12 allows no sight of blood or injuries on humans; PEGI 16 does, [AskAboutGames](https://www.askaboutgames.com/pegi-ratings)). A toggle does not lower the rating: games with blood toggles such as Elden Ring and Call of Duty: Vanguard keep their blood descriptors ([1](https://expertbeacon.com/can-you-disable-blood-and-gore-in-elden-ring/), [2](https://www.gameslearningsociety.org/wiki/is-there-blood-in-call-of-duty-vanguard/); secondary sources). Poki and CrazyGames would likely refuse it or need a separate build without the code and art. It also breaks A11 ("No blood") and the colour rule: red sits within ±35° of the orange team hue, so only a dull brownish red is allowed, which reads as dirt. It costs a settings row, portal build flags and tests that portal builds ship none of it. | Not recommended. |

## 4. How to build it: options and costs

Reference numbers for the memory budget (decisions.md, the memory round):
- The unit sheet governor plans at most **320 MB** of unit sheets, HD and 1x copies together.
- A war must stay under **600 MB** decoded at DPR 2.
- A new player's 16 sheets are 293 MB in HD, which fits.
- The test profile's war peaks at about 479 MB; Long Wars at 490-527 MB.
- Shipped sheets (`D/bin/sheetstats.cjs` over `unitSheetPixels.gen.ts`): the median unit is **11.0 MB in HD** (p75 21 MB, max 92 MB) and 2.9 MB at 1x. The whole roster is 2,963 MB in HD; extras sheets are 24% of it.
- Render times from 51 recent unit renders: median 118 s, mean 172 s, max 439 s a unit, at 2 threads.

### (a) Decal overlays: a shared damage kit per material, placed by per-frame spots the pipeline writes

- **Art pipeline.**
  - New `rig.damage_spot(name, joint, pos, normal, radius, material, kind)` in `ageborn_art` (kind: `mark`, `strip` or `emit`), declared next to the existing `rig.track` lines, with family helpers per rig (for example `kit_medieval.damage_spots(rig, helmet=…, torso=…, shield=…, hem=…)`).
  - For every frame of every clip, `render.render_clips` already poses the rig and reads its trackers. It writes each spot as `[x, y, rotDeg, scalePct, visPct]`:
    - position as screen lu from the feet;
    - in-plane rotation from the joint;
    - foreshortening from the normal against the view;
    - visibility from 5 camera ray casts across the spot, the technique `face.py` already uses, so an arm passing in front of the torso hides the torso's mark for that frame.
  - **An anchors-only mode** (`render_all.py --anchors-only`) builds the rig, steps through the clips and skips Cycles and the 2D passes. It takes about 10-20 s a unit, so 30-60 minutes for all 167 on one process, light enough to run beside other agents' renders.
  - It checks itself: the re-posed weapon tips, muzzles and per-frame silhouette boxes must match the shipped sheet within 0.3 lu (tips) and 2 lu (boxes). A unit whose script no longer reproduces its frames goes on Phase B's re-render list instead of getting wrong spots.
  - The output is one small bundle per age, `public/art/units/<age>/damage.json` (about 8 KB a unit, about 35 KB gzip per age, Appendix B), loaded with the age's sheets. The shipped sheet JSONs stay byte-identical, so Home's kept troop strips (keyed by the sheet bytes) are not invalidated and the governor sees nothing new.
  - The same pass also writes per-frame **torso and head** trackers for Phase B's B0 (section 5).
- **The damage kit.**
  - About 35-40 procedural parts, drawn in the A11 style like Phase A's combat bits: per material 4-6 marks (scuff, scratch, dent, crack, hole, tear, plate hole, soot, chip) plus 3-4 hanging strips with a team layer.
  - They are baked at runtime into one 512 px part page (1 MB), in idle time after the battle's first hit (as `warmBits` does today), with no download.
  - Swappable: the kit is a manifest entry per material (`damage.<material>`), so a Blender-rendered kit can replace it later.
- **Runtime.** The atlas view holds 0-4 mark sprites and 0-1 strip sprite inside its `body` container (after the base sprite, before the ghosts and the flash, so the hit flash covers them). Each is placed from the spot table when the shown frame changes. The skin puppets parent the same parts to their bones.

### (b) Damaged variants baked into the sheets

Every unit is rendered again with damage geometry, once per stage, and the view swaps to the damaged sheet at a step. This is how bases work.
- **Memory:** each baked stage adds a full copy of each held sheet, **+100%** (a median unit +11 MB HD).
  - A 16-card war goes from 293 to 586 MB of unit sheets for one baked stage, and 1,172 MB for three.
  - Even with 1x copies only, it is +73 MB per stage for 16 cards (+220 MB for three): over the 320 MB budget, so the governor would push most of the deck to blurry 1x copies, or the war would pass 600 MB.
- **Frame time:** free per frame, but every step swaps in another sheet. That means a GPU upload of 2-90 MB in the middle of a fight, the hitch the governor spaces big uploads 750 ms apart to avoid.
- **Art:** damage geometry per unit (about 20-30 min of agent time each, so 7-10 agent-days), then three full re-renders of the roster. That is about 25 process-hours, roughly 12-13 h wall with 2 processes on a quiet machine and much longer on a shared one, and about 2,000 new sheet files.
- Not viable.

### (b′) A baked, sparse damage layer (a variant of b)

The marks are rendered in Blender as their own pass over every frame, like the team layer, and shown at stage 2+.
- **Memory:** the Footman's team layer is 51% of its base frames' area, and marks spread from helmet to tunic make a layer of about **+34% of each sheet**: about +3.7 MB per median unit in HD.
  - For a 16-card war: HD +100 MB per layer, which is impossible; at 1x +25 MB per layer, or +50 MB for two layers (stages 2 and 3).
  - +50 MB means 344 MB of unit sheets, over the 320 MB budget, so two or three units drop to 1x.
- **Art:** the same geometry work as (b), plus one full re-render of the roster with an extra pass (about 1.5× today: ≈12.5 process-hours, ≈6-7 h wall on 2 processes); governor changes. Every unit of a type shows the identical damage. It fails for skins, which are puppets, and it is only worth it when riding on a re-render that happens anyway (B3′ for the 16 Legendaries, section 5).
- A later option, not the base.

### (c) Effects only: tint, smoke, sparks, fire

A scorch tint (`baseSprite.tint`, a vertex colour: free, no batch break) and per-family emitters at a few static spots per sheet (from `hitCenter`, `head` or a small hand table).
- **Memory:** about 0 MB. **Frame time:** emitters only, about +0.2-0.4 ms at 4x. **Art:** no Blender; 3-5 agent-days.
- It gives the owner's tank its smoke and fire, but soldiers and beasts get only a darker tint, which reads as shadow, not damage. It fails "the soldiers ... It must be like that with all the figures".
- Good as the machine layer, and as the fallback for any unit whose spots are not written yet.

### Comparison (at DPR 2)

| | (a) decals on per-frame spots | (b) baked variants | (b′) baked sparse layer | (c) effects only | **(a) + (c), recommended** |
|---|---|---|---|---|---|
| Unit sheet memory (320 MB budget) | **0 MB** | +100% per stage (a 16-card war 586-1,172 MB) | +25-50 MB at 1x for 16 cards | 0 MB | **0 MB** |
| Other memory (600 MB total) | +1 MB part page, ≤3 MB spot bundles in the JS heap | as left | as left | ≤1 MB | **≤4 MB** |
| Frame time per damaged unit (CPU 4x, estimate) | 3-6 µs (2-4 sprites in the existing batch) | ~0, plus upload hitches at steps | ~1 µs | emitters only | 3-6 µs plus capped emitters |
| 80-unit stress battle, CPU 4x (estimate) | +0.15-0.25 ms | ~0 per frame, hitches | +0.05-0.1 ms | +0.2-0.4 ms | **+0.3-0.6 ms** (gate +1 ms) |
| Draw calls | +0-1 (one part page) | 0 | 0 | +1-2 | **+1-3** (High ≤ 80, Lite ≤ 40) |
| Render passes per object (WebKit) | none | none | none | none | **none** |
| Blender time | ~30-60 min total, no Cycles | ~25 process-hours | ~12.5 process-hours | none | **~30-60 min, no Cycles** |
| Agent effort | ~12 days | ~14-18 days, and memory kills it | ~12-14 days | 3-5 days | **~17 days with verification** |
| Files | ~170 unit scripts (+3-8 lines or one helper call), 4 pipeline files, a preview tool, 8 per-age bundles, ~10 runtime files, one sound sheet | every unit script, ~2,000 new sheet files, variant switching in the provider | every unit script, a new layer in all 668 sheet files, the governor | ~6 runtime files, a small spot table | as (a) |
| Per-unit variety, keyed marks, skins | yes, yes, yes | no, no, no | no, no, no | n/a | **yes, yes, yes** |
| Pipeline change | spot API, anchors-only mode, per-age bundle | damage geometry, 3 renders, variant sheets | damage pass, a layer per sheet, governor | none | as (a) |

**WebKit and iPhones** (the "Fading bodies" lesson: each picture is a render pass, a pooled texture and a render group, very costly in WebKit). The recommended build uses:
- no filters (desaturation would need a ColorMatrixFilter, so the tint only darkens and warms);
- no masks, no render textures, no `cacheAsTexture` beyond today's capped body fade (which simply includes the marks, as children of the body);
- no persistent additive layer on a unit: an always-on additive "dust coat" through the flash sprite would interleave blend modes per unit and break two batches per unit;
- marks and strips in normal blend from one part page;
- persistent emitters drawn in normal blend (the pale cel flame lobes already are), so only short bursts use additive parts, grouped in the VFX layer.

**Recommendation: (a) + (c).** Decals on per-frame spots, a scorch tint by family, and family emitters through the shared particle pool. Units without spots yet fall back to (c), so every unit shows its stage from the first release. (b′) stays a later option for the 16 Legendaries, if the owner ever wants richer "hero damage", and only on the back of B3′'s re-render.

**Risks of the recommendation, and what answers each:**

1. *Marks that look like stickers on parts that turn.*
   - Rotation, foreshortening and visibility come per frame from Blender.
   - Marks stay within 70% of their part's radius, so they never cross the outline.
   - The preview tool's contact sheets cover every clip.
   - Answer of last resort: (b′) for the Legendaries.
2. *A unit script that no longer reproduces its shipped frames.* The self-check catches it, and the unit goes to B1′'s re-render list or to the (c) fallback.
3. *Clutter in big battles.* Emitter caps, the pool's lowest priority, rate-limited bursts and sounds, and the owner's choice of intensity (question 2).
4. *Frame time.* The estimate is under the gate. If not, the levers are: an emitter cap of 12 → 6, marks per unit 4 → 3, emitter rates halved.
5. *Soldiers at true phone size.* Bold marks and motion cues; the owner judges wave 1 on a real phone.

### Ownership and contracts (recommended build)

- **No contract change.** `UnitPose.hpBp` exists. The view adds duck-typed extras as Phase A's `CombatView` did: a `damageStage` getter, `onDamageStep(cb)`, `damageFx()` (the current emitter spots) and an optional third argument `kind` to `react`.
- **WP4 visuals:**
  - `art/blender` (the spot API, anchors-only mode, preview tool, spots in unit scripts);
  - `src/visuals/damage/*` (pure stage logic and hysteresis, mark selection, the family table);
  - the kit parts and recipes;
  - `atlas.ts` (marks, strip, tint, motion);
  - the procedural unit view;
  - a damage-stage control in the art gallery.
- **WP5 render:** `battleView.ts` (kind on `unitClip`, bursts and emitters through the particle pool with caps, rate limits, Lite and Reduce, the fast-forward guard), `eventMapper.ts`, `feel.config.json` (`tuning.damage`, rules `damage.step.<material>.<stage>`, `damage.mend`, `damage.ignite`).
- **WP6 audio:** six sounds through `tools/audio/sfx`.
- **WP12:** e2e and gallery checks.
- **Docs:** A11, A12, A13, A14.1, B5 and B16 updates.
- No i18n strings, no content change, no save change, no `SIM_VERSION` bump.

## 5. Item 38 Phase B, refreshed

Phase A (merged, `25cab81` and fixes) built at runtime most of what Phase B was meant to fix in the art:
- the contact stand-off: soldier torsos clear at 97% of impact frames, the tip inside the victim at 96%;
- lunge compensation;
- A9a's de-phasing: same-tick mirror exchanges 39.0% → 3.3% in AI battles;
- reactions on 100% of hits;
- weighted deaths with bits, and pounce and knockback arcs.

What is still open is in decisions.md ("Kept open", "Frame time, settled") and review A.

| Step | Original plan (DIAGNOSIS 4) | What Phase A already does | What is still open | Keep? New scope | Effort |
|---|---|---|---|---|---|
| **B0 (new): data, not renders** | n/a | Staging measures the torso from the team layer's box | Mount torso layers span the whole barding (the Destrier Knight's is 82.5 lu); heads graze in the now-rare mirror exchanges; part of the 57 units with "odd data" | **Yes, first, shared with item 40:** the anchors-only pass also writes per-frame torso and head trackers for every unit; `render/contact.ts` uses them instead of the team-layer estimate | 1-1.5 (the pipeline is item 40's P0) |
| **B1 contact-calibrated attacks** | Re-render A/B/C impact poses of about 40 units + a reach gate (12-16 days) | Runtime stand-off and lunge compensation solve the reach of almost every unit | Clips whose impact frame is not the contact: the Bonker's `attack_b` shows the club high and contacts two frames later; U's survey lists 8 tossed and 7 "tip high" impact clips. Weapons too short for the body: the War Chariot's 23 lu blade swings short. Riders and long weapons that lunge over 25 lu (Pikeman, Cuirassier, Grand Marshal, Amazon Rider, Ursa Paladin B, Elk Chieftain C, EMP Saboteur A). Big bodies trade reach for room (heavies' blows inside the victim's box 16/16 → 13/16). | **Yes, as B1′: a targeted list of about 10-15 units, most-seen first** (Bonker, War Chariot, Pikeman, Cuirassier, Amazon Rider, Elk Chieftain, the tossed clips of Woolly Rhino, Corsair, Thracian Raider, Flailman C, Squire Pair C, Star Legionnaire B, Steam Golem B), checked against the films. Clips that only show the wrong frame at the impact get a data-only re-split of their step durations (`durationMs` and `impactAt` unchanged), with no render. Add the reach gate to `check_timing.mjs` so new art cannot regress. | 4-6 |
| **B2 hit clips with real poses** | Two reactions per unit, all 167 (6-8 days; +6-9% sheet area) | `react()` gives every hit a push, tilt and squash; inserts and the hit clip show the shared pose | One shared 5-frame hit shape that barely leaves the idle silhouette for most melee sheets | **Optional, after the owner has seen item 40 and B1′.** If done: a light flinch **replacing** the current hit clip (same frame budget, no memory growth) for the ~45 most-seen units (the Commons and Heavies of every age); a heavy stagger only for Heavies, Epics and Legendaries, in the lazily loaded extras sheet. | 4-6 (optional) |
| **B3 deaths with weight** | New death clips and prop sprites for all units (6-8 days) | `dieWith` throws or crumples along the blow, lands with a squash and a thud, lies 2 s and fades; seeded bits lie 5 s | No ground-contact frame in the art (the squash is code); generic bits instead of the unit's own helmet | **Cut as a batch.** Optional B3′: the 16 Legendaries only (their deaths play in slow motion), a ground-contact frame and a settle | 2-3 (optional) |
| **B4 charges and pounces** | Gallop acceleration, rear-up, pounce frames (3-4 days) | The pounce arc (take-off stretch, nose dip, strike pose on touch-down) and the knockback hop are in code | Rider gallop and rear-up frames | **Cut.** The riders' lunge fixes are in B1′ | 0 |

- **Order.**
  1. B0, together with item 40's P0.
  2. Item 40's runtime and wave 1.
  3. B1′.
  4. Item 40's waves 2-3.
  5. Then, if the owner wants more, B2′ and B3′.
- **Rendering each unit once for both items.** Item 40's recommended build needs **no re-render**: the anchors-only pass writes the spots. The rule is simple. A unit's damage spots go into its script before any Phase B re-render touches it, and the pipeline writes the spots (and the torso and head trackers) on every render. So a B1′, B2′ or B3′ re-render produces the new sheet and its damage data in the same run, and the anchors-only pass runs only for units that are not re-rendered. If (b′) is ever wanted for the Legendaries, it rides on B3′'s re-render.
- **Machine time.** B1′ is about 12 units × 3-5 min, about 1 process-hour. B2′ re-renders about 45 whole units (the pipeline packs every clip from fresh frames), about 3 process-hours, roughly 1.5 h wall on 2 processes on a quiet machine.
- **Effort.** Committed about **5-7 agent-days** (B0 and B1′), optional 6-9 (B2′ and B3′), against 27-36 before. The open frame-time hot spot from Phase A (about +7 ms per frame for some 6 s when two big armies first meet, at 4x) is not an art question; it should be profiled before item 40's emitters land (section 7, P1).

## 6. Presentation only

- **The sim and its timing never change.** No sim, content, AI, save or contract change; no `SIM_VERSION` bump; goldens and replays untouched. The stage is read from `hpBp`, which is sim state. Step bursts and emitters add no hit-stop, freeze, shake or kick, so live (Ranked) matches, which already run no global freeze, are unaffected. Impact frames stay on their ticks (A12 checklist 3): the weary motion changes only the idle playback and adds vertical dips, and the walk keeps its planted feet.
- **Determinism.**
  - Mark order, mark variants and strip shapes come from the view seed `(unit id ^ match seed)`; keyed marks come from the hit's kind in the sim event.
  - Emitter timing runs on game time (a replay at 2× looks the same per game second).
  - Particle jitter uses the pool's or the view's seeded RNG, the sputter and flicker phases the view seed. There is no `Math.random`.
  - Two films of the same battle must be pixel-identical (as review A checked for Phase A).
  - The only frame-rate dependent rule is the fast-forward guard: a frame whose game time exceeds 100 ms skips bursts and caps emitter spawns, the same kind of rule as the WebKit picture fade. Marks, tint and stages never depend on frame rate.
- **Reduce motion** (motion only; damage stays visible):
  - marks and the tint stay as they are;
  - bursts: no flying pieces or sparks, a soft puff, and the mark fades in over 150 ms instead of popping;
  - smoke rises at half speed and half rate, flames are steady, and there are no sparks;
  - strips hang still;
  - weary motion is at half amplitude, with no judder, no flyer dips and no glitch shift (a slow 200 ms pulse instead);
  - no new flashes.
  - Flicker is never faster than about 1.5 Hz in any mode, well under the three-flashes limit ([WCAG 2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html)).
- **Graphics Lite:**
  - at most the 2 newest marks per unit, and the tint;
  - emitters on at most 4 units at half rate; bursts with half the pieces;
  - no sparks outside bursts, no strip sway;
  - parts bake at DPR 1 like every Lite part.
- **Caps on High:**
  - emitters on at most 12 units on desktop and 8 on mobile, chosen by size and closeness to the screen centre; units off view emit nothing (A17.7);
  - damage smoke is the lowest priority in the pool, so it drops first under load;
  - at most 4 marks and 1 strip per unit.

## 7. The plan

Agent-days, with three agents in parallel where the tracks allow.

| Phase | What | Owner (WP) | Agent-days |
|---|---|---|---|
| **P0 Foundations** (parallel) | Spot API, anchors-only mode with its self-check, per-age bundles, torso and head trackers (B0) | WP4 art | 1.5 |
| | Preview tool: composites stages onto shipped frames per clip, checks team coverage, the colour rule and a visibility score | WP4 art | 1 |
| | Damage kit v1 (35-40 parts), colour-rule tests | WP4 visuals | 1.5 |
| **P1 Runtime** | `visuals/damage` stage logic, marks and strips on the atlas view and the puppets, tint, motion, effect recipes, gallery control, tests | WP4 | 3-3.5 |
| | Battle view wiring: kind, bursts and emitters through the pool with caps and rate limits, Lite and Reduce, the fast-forward guard, feel rules, tests; profile Phase A's first-contact hot spot first | WP5 | 2 |
| | Six step sounds (ZzFX fallbacks + rendered sheet) | WP6 | 0.5-1 |
| **P2 Wave 1** | Spots for Stone and Bronze (every default window starts there; 42 units), the starter cards of the tutorial's other ages (Medieval, Gunpowder, Modern, Future; 15), and every later vehicle and flyer (the owner's example; smoke reads at any size; 25): 82 units | WP4 art | 2.5 |
| | **Owner review:** a before/after video, same seeds, 844 × 390 and 1280 × 720 | orchestrator | |
| **B0 + B1′** | Torso and head trackers in the staging; the targeted reach fixes (re-renders carry the spots) | WP5, WP4 art | 5-7 (Phase B) |
| **P3 Waves 2-3** | The rest of Medieval, Gunpowder and Industrial (44 units); the rest of Modern, Future and Cosmic (41 units) | WP4 art | 2 |
| **P4 Verification and review** | Below | reviewer, WP12 | 2.5 |
| **Item 40 total** | P0 4, P1 6, P2 2.5, P3 2, P4 2.5 | | **about 17 (15-19)** |

**Verification (P4, and on every wave):**

1. Unit tests: stage logic and hysteresis, determinism (same seed → same marks), keyed marks, Lite and Reduce counts, the kit's colour rule, the bundle schema, every sheet with a bundle entry or an explicit fallback.
2. The preview tool on every unit: every clip × stage contact sheet looked at by the art agent; team coverage at least 18% and the colour rule on composited stage-3 frames; spots hidden where occluded.
3. Frame-exact captures (`?dev=1#capture`) of the diagnosis's seeds (duel, Medieval melee, volley, cavalry, Modern mix, heavies, clash, the two real AI battles) plus a damage gallery of every family at each stage. Playwright screenshots at 844 × 390 and 1280 × 720.
4. Two films pixel-identical; every film's sim event stream identical to the headless sim.
5. Frame time by PERF-A's method (the 80-unit stress battle, 844 × 390, CPU 4x, High, 8 paired 60 s runs over a fixed tick range): inside +1 ms mean and median. The first-contact window must not get more than 1 ms worse, and a Lite pair must be measured. Draw calls must stay at or under 80 (High) and 40 (Lite), and particle peaks within their caps.
6. `tests/e2e/memory.spec.ts` at DPR 2 (both wars): at most about 4 MB more.
7. WebKit: the fast-forward step time of G7's war in the local WebKitGTK MiniBrowser (the recipe in the "Fading bodies" decision) must not regress before anything is pushed; CI's WebKit job green, with the long wars inside their time budgets.
8. Reduce motion and Lite films; a unit test that live matches get no freeze from damage; the strict review; the owner's look at the wave-1 video.

**Cut list if time runs short** (cut from the top):

1. B2′ and B3′.
2. Energy glitch motion and the mech hitch.
3. Weary motion.
4. Mending visuals (stages still step back, without the glint).
5. Keyed marks (marks by material only).
6. Strip sway (strips hang still).
7. Waves 2-3: those units fall back to (c), so machines still smoke and burn and every unit still shows its stage through tint and bursts.

**Never cut:** the stage logic and tint for every unit, machine smoke and fire, the step burst, Reduce motion and Lite, determinism, and the frame-time and memory gates.

## 8. Questions for the owner

1. **Blood.** (a) None: the damage shows on clothes, armour, shields and machines. (b) A stylised comic hit burst on soldiers (not red, not a liquid). (c) Blood as a setting, off by default, which makes the whole game PEGI 16 and would likely keep it off Poki and CrazyGames. **Recommended: (a).**
2. **How strong should the damage look?** (a) Subtle: marks only, no smoke or fire. (b) Clear: marks, smoke and small pale fire on machines, weary motion at the last stage. (c) Strong: big fires and smoke columns, which clutter big fights and cost more frame time. **Recommended: (b).**

## 9. Kort resumé til ejeren

Du ønsker, at man kan se på alle figurer, at de bliver mere og mere skadet. Sådan vil vi gøre det.

Det kommer man til at se:

- Hver enhed får tre skadetrin, ved 75 %, 50 % og 25 % liv. Det er de samme trin, som baserne allerede har.
- Kampvogne og andre maskiner får buler, huller og revner og mister plader. Til sidst ryger de, slår gnister og brænder med små flammer.
- Soldater får flænget og snavset tøj, sod på rustning og hjelm, buler i hjelmen og revner i skjoldet. På sidste trin bevæger de sig tungt og ser trætte ud. Der kommer aldrig sod i ansigtet.
- Dyr bliver støvede og skrammede, deres dækken flænges, horn og stødtænder får revner, og til sidst puster de tungt.
- Flyvere trækker en røgstribe efter sig, robotter slår gnister og ryger, og energifigurer flimrer.
- Når en enhed når et nyt trin, kommer der et lille udbrud lige dér, hvor den blev ramt, med splinter, gnister eller stofstumper og en kort lyd. Bliver enheden helbredt, forsvinder skaderne igen med et lille grønt glimt.
- Livsbjælken viser stadig det præcise liv. Skaderne på selve figuren kan ses på alle enheder, også i store slag, hvor de fleste livsbjælker er skjult.

Sådan bygger vi det:

- Skaderne tegnes som små mærker oven på figurerne, og Blender skriver for hvert billede i animationerne, hvor mærkerne skal sidde. Det kræver ingen nye store billedark, så det bruger under 4 MB ekstra hukommelse, og en iPhone kan stadig klare kampene. At tegne alle figurer om i skadede udgaver ville bruge to til fire gange så meget hukommelse, og det kan en iPhone ikke klare.
- Spillets regler og tid ændres ikke. Det er kun udseende, og indstillingerne "Reduce motion" og "Lite" dæmper det.
- Det tager cirka 17 arbejdsdage for agenterne. De figurer, man ser mest, kommer først: stenalderen, bronzealderen, figurerne fra introduktionen og alle køretøjer og flyvere. Du får en video at se, før vi laver resten.
- Den anden del af kampanimationerne (punkt 38, fase B) bliver meget mindre end planlagt, fordi fase A allerede løste det meste. Vi skal kun tegne de angreb om, hvor tegningen selv rammer forbi, cirka 5 til 7 arbejdsdage i stedet for 27 til 36.

Et testbillede med fire figurer på alle trin ligger her: `docs/design-history/item40-damage-mock.jpg`

To spørgsmål til dig:

1. Blod. Jeg anbefaler intet blod, så skaden vises på tøj, rustning, skjolde og maskiner. Alternativet er et lille tegneserieagtigt slagglimt på soldaterne, som hverken er rødt eller ligner blod. Blod som en indstilling, der er slået fra som udgangspunkt, giver hele spillet aldersgrænsen 16 hos PEGI, også når indstillingen er slået fra, og spilportaler som Poki og CrazyGames vil sandsynligvis sige nej til det.
2. Hvor kraftige skal skaderne være? Jeg anbefaler en mellemting: tydelige mærker, røg og små flammer på maskiner og trætte bevægelser på sidste trin. Alternativerne er diskret (kun mærker, ingen røg eller ild) eller kraftig (store flammer og meget røg, som roder i store slag og koster mere kraft).

---

## Appendix A. The families (all 167 sheets)

Generated from the content dump plus the six summon sheets (`D/families.json`).

| Family | Count | Units |
|---|---|---|
| Soldiers | 86 | Stone: atlatl_thrower, beast_caller, bolas_thrower, bonker, boulder_hurler, drum_shaman, herbalist, pebbler, pelt_rager, rockfall_shaman, spear_hunter, torch_runner, training_dummy. Bronze: aulos_piper, belly_bowman, cretan_archer, discus_thrower, javelineer, rhodian_slingers, standard_bearer, thracian_raider, tragic_chorus. Medieval: alchemist, brigand, crossbowman, flailman, friar, herald, kennel_master, longbowman, pikeman, squire_pair, yeoman_archer. Gunpowder: bagpiper, blunderbuss, coehorn_crew, corsair, drummer_boy, field_surgeon, fusilier, grand_marshal, grenadier, highlander, mesmerist, powder_monkey, voltigeurs, wall_gunner. Industrial: alpine_climber, bandmaster, bomb_bowler, carbineer, clockwork_tinker, coal_miners, flare_spotter, harpoon_gunner, riveter, sapper, spark_scientist, steam_driller, trench_mortar. Modern: bazooka_trooper, bulldog_sergeant, combat_medic, commando, ghillie_sniper, mortar_team, radio_operator, rifle_grenadier, rifleman, smg_squad, sticky_bomber, trench_raider. Future: arc_lobber, emp_saboteur, needle_gunner, overclock_engineer, plasma_lancer, pulse_trooper, rail_gunner. Cosmic: antimatter_rifler, bio_weaver, graviton_halberdier, ion_ranger, nova_thrower, star_mortar, starwarden |
| Armoured troops | 12 | hide_shield, hoplite, phalangite, shield_bearer, footman, greatsword_knight, warhammer_sergeant, iron_mantlet, sandbag_carrier, barrier_trooper, photon_knight, star_legionnaire |
| Beasts | 13 | cave_bear, cave_pup, hunting_wolves, sabertooth, tuskback, woolly_rhino, hydra, minotaur, lindworm, war_hound, moonlings, swarm_matron, swarmling |
| Riders | 13 | elk_chieftain, mammoth_matriarch, amazon_rider, war_elephant, destrier_knight, ursa_paladin, cuirassier, dragoon, hussar, dispatch_rider, hover_bike, star_leviathan, void_skimmer |
| Vehicles and machines | 19 | scorpion, war_chariot, wooden_horse, battering_ram, mangonel_cart, siege_belfry, bronze_cannon, rocket_cart, armoured_car, armoured_train, land_dreadnought, steam_tractor, assault_gun, behemoth_tank, bulldozer, tankette, drone_carrier, particle_cannon, hover_tank |
| Flyers | 9 | balloon_admiral, dive_bomber, gyrocopter, sky_fortress, attack_drone, jetpack_trooper, repair_drone, mothership, star_fighter |
| Mechs and constructs | 9 | bronze_colossus, clockwork_soldier, steam_golem, android_pair, chrono_titan, crab_mech, overload_android, walker_mech, asteroid_golem |
| Energy units | 6 | holo_decoy, holo_projector, crystal_guard, gravity_sage, void_whisperer, warp_stalker |

Levies draw an age's infantry sheet at 0.85 scale and inherit its spots.

## Appendix B. Data and runtime sketch

**Per-age bundle** (`public/art/units/<age>/damage.json`, written by the pipeline on every render and by `--anchors-only`; numbers rounded to 0.1 lu, 1° and 1%):

```json
{ "v": 1, "units": { "footman": {
  "family": "armoured",
  "spots": [ { "id": "helmet", "kind": "mark", "mat": "metal", "r": 5.5 },
             { "id": "shield", "kind": "mark", "mat": "wood", "r": 8 },
             { "id": "tunic", "kind": "mark", "mat": "cloth", "r": 6, "team": true },
             { "id": "hem", "kind": "strip", "mat": "cloth" },
             { "id": "back", "kind": "emit" } ],
  "clips": { "idle": { "helmet": [[x, y, rot, scale, vis], ...one per unique frame], "...": [] },
             "walk": {}, "attack": {}, "attack_b": {}, "hit": {}, "die": {} },
  "torso": { "idle": [[x0, y0, x1, y1], ...] }, "head": { "idle": [[x, y], ...] } } } }
```

Frames are indexed like `anchorsLu` (per unique frame; the runtime maps a step to its frame through `sequence`). That is about 1,200 numbers per unit and about 8 KB of JSON. Extras clips (`attack_b`, `attack_c`, `attack_alt`) are included, and both densities share it.

**View** (duck-typed, WP4; no contract change):
- `setPose` computes the stage from `hpBp` with hysteresis;
- `react(tier, dir, kind?)` remembers the kind for the next step;
- `damageStage`;
- `onDamageStep(cb)` fires `{ stage, prev, spot, mat, kind }` the frame a step happens;
- `damageFx()` returns the live emitter spots `{ kind, x, y, rate }` in local lu.

**Battle view** (WP5): passes `kind` with `unitClip`, plays `damage.step.<mat>.<stage>` and the sound through the rules and limits of section 3.4, and emits the emitters' particles in world space through the `ParticlePool` (trails stay behind flyers) at the lowest priority.

## Appendix C. Evidence and files

- Mock-up: `D/mock/damage_mock.png` (bold marks, the design), `D/mock/damage_mock_v1_too_subtle.png` (the first attempt, marks under 5 lu; it shows why the size rules exist), script `D/bin/mock.py` (+ `D/bin/sheet.py`).
- Sheet memory statistics: `D/bin/sheetstats.cjs`. Families: `D/families.json`.
- Sources read: `docs/owner-queue.md` (items 38, 40), `docs/decisions.md` (Owner answers 2026-10-18, item 38 Phase A including "Fading bodies in WebKit", the memory round), `docs/DESIGN.md` (A11, A12, A13, A14.1, A16.14.8, A18.3.4, B5, B6, B16, B15 `UnitPose`), `art/blender/README.md`, `art/blender/world/README.md`, `scratchpad/combat/DIAGNOSIS.md`, `phaseA/reports/{U,S,B,X}.md`, `phaseA/U/reach_odd.md`, `reviewA/REVIEW.md`, and the code in `src/visuals/adapters/atlas.ts`, `atlasCombat.ts`, `src/visuals/effects/combat.ts`, `recipes.ts`, `sprites.ts`, `src/visuals/bake.ts`, `src/visuals/skins.ts`, `src/visuals/sheetBudget.ts`, `src/visuals/fortViews/atlasFortView.ts`, `src/visuals/adapters/world/atlasBaseView.ts`, `src/render/battleView.ts`, `eventMapper.ts`, `healthbars.ts`, `layers.ts`, `fortViews.ts`, `combatFeel.ts`, `feel/particlePool.ts`, `feel.config.json`, `art/blender/ageborn_art/{render,rig,pipeline}.py`, and the research notes `battle-feel-audit.md`, `tech-art.md`, `market-portals.md` and `engagement-law-ethics.md`.
- Web sources are linked where they are used (sections 3.1, 3.5, 3.7 and 6). The PEGI, Poki and toggle points rest on search-result extracts, because this environment cannot fetch those pages; the ratings claims should be re-checked on the official pages before any store submission.
