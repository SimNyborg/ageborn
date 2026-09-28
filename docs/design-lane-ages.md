# Ageborn design addendum: a longer lane and eight ages (to be merged as DESIGN A17)

**Status.** Written 2026-09-28 from the owner's two requests of the same day: (1) a longer lane that the player scrolls back and forth, as in the classic Flash games of the genre; (2) more ages. The agreed direction: a longer lane with a scrolling camera, bigger units on screen, a minimap strip, a camera that follows the fight when the player is not scrolling, pacing kept fun, and 8 ages (Stone, Bronze, Medieval, Gunpowder, Industrial, Modern, Future, Cosmic) with formats that use a range of ages. Nothing here is built yet. The raw tables for the three new ages exist, unwired, in `src/content/raw/bronze.ts`, `industrial.ts` and `cosmic.ts`. Where this section and A1-A16 differ, this section wins once merged; A17.16 lists the edits to other sections.

## A17. A longer lane and eight ages

### A17.1 Summary and principles

| Change | Now | A17 |
|---|---|---|
| Lane, gate to gate | 1,200 lu | 2,000 lu |
| Unit walking speed | table speed | table speed × 1.25 (one economy number) |
| Standard infantry crossing | ~17 s | ~23 s |
| Camera | whole world fits; no scrolling | about 40% (phone) to 60% (desktop) of the world visible; drag, swipe, wheel, keys and edge scroll; auto-follow |
| Infantry height on an 844 × 390 phone | ~37 px | ~62 px |
| Overview | a front-line strip | a minimap strip with units, bases, fronts, powers and the camera window |
| Ages | 5 | 8 |
| Formats | Short 3 ages, Standard 4, Full 5 | Short 4 ages, Standard 6, Full 8 |
| Cards | 35 units, 20 turrets, 10 powers | 56 units, 32 turrets, 16 powers |

**Principles.**

1. **The sim stays simple.** The lane is longer and units walk faster; every other combat number keeps its meaning. The camera, minimap and indicators are view-only and never touch the sim.
2. **Turrets defend home; the middle belongs to units.** Turret range (480 lu cap), the hold line (320) and Last Stand (450) keep their absolute sizes, so a real no-man's-land of 1,040 lu opens between the two turret covers (240 lu today).
3. **Information stays equal.** Bots read the whole lane through `Observation` (A7.1). The player keeps the whole lane through the minimap, so scrolling never hides anything a bot knows.
4. **Existing cards keep their numbers.** The three new ages slot between (Bronze, Industrial) and after (Cosmic) the existing ones. The 35 tuned units, 20 turrets and 10 powers are unchanged.
5. **New ages reuse existing ability kinds.** The 39 new cards need no new `AbilityDef` kind and no new `AttackDef` field (A17.15).
6. **Short matches stay short.** Short War gains one early half-step age and keeps a ~4:45 median.

### A17.2 Lane length and pacing

**Options considered** (infantry at table speed 70 lu/s; phone view from A17.7):

| Option | Lane | Speed scale | Infantry crossing | Gap between turret covers | World on a phone | Verdict |
|---|---|---|---|---|---|---|
| Today | 1,200 | ×1.00 | 17 s | 240 lu | 1 screen, no scrolling | Units too small on phones; fights happen inside turret cover |
| A | 1,600 | ×1.10 | 21 s | 640 lu | 2.1 screens | Too little room to feel the scroll |
| **B (chosen)** | **2,000** | **×1.25** | **23 s** | **1,040 lu** | **2.6 screens (1.7 on desktop)** | A real middle ground; crossing only 6 s longer |
| C | 2,400 | ×1.25 | 27 s | 1,440 lu | 3.0 screens | Long reinforcement walks feed stalemates (A16.4) |

**Why 2,000 lu with ×1.25 speed.**

- The scroll only matters when there is somewhere to scroll to. At 2,000 lu a phone sees about a third of the lane and a desktop about 60% of it, which gives the back-and-forth feel the owner asked for without making the far base a mystery.
- Faster walking keeps the first clash near ~0:13 (today ~0:10) and the attacker's reinforcement walk at ~23 s (today ~17 s). A longer walk strengthens defence, which is already the main cause of Final Bells (A16.4), so A17.3 adds a Siege forced march that brings the late walk back to ~19 s.
- Ranges, sizes, spacing and projectile speeds are unchanged, so every duel and counter keeps its meaning. The one balance shift: a ranged unit gets 20% less free shooting time against a melee unit walking toward it. The A2.14 rerun (A17.14) checks it.

**Effective speeds** (table speed × 1.25, compiled to milli-lu per tick, B3):

| Table speed (lu/s) | 35 | 40 | 45 | 50 | 55 | 60 | 65 | 70 | 72 | 75 | 80 | 85 | 100 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Effective (lu/s) | 43.75 | 50 | 56.25 | 62.5 | 68.75 | 75 | 81.25 | 87.5 | 90 | 93.75 | 100 | 106.25 | 125 |
| Crossing 2,000 lu | 46 s | 40 s | 36 s | 32 s | 29 s | 27 s | 25 s | 23 s | 22 s | 21 s | 20 s | 19 s | 16 s |

Tables in A5 and A17.9-A17.11 keep listing table speeds; the ×1.25 is applied once at compile time.

**Match length targets per format** (replacing the A2.10 clocks and the A2.14 median rows; derivation in A17.8):

| Format | Ages | Last evolve (expected) | Overdrive | Siege | Final Bell | Median target | 80% of matches |
|---|---|---|---|---|---|---|---|
| Tutorial | Stone, Medieval, Gunpowder, Modern, Future | scripted | none | none | none | ~6 min as today | - |
| Short War | Stone to Gunpowder (4) | ~2:25 | 3:45 | 4:45 | 6:15 | 4:45 | 3:45-6:00 |
| Standard War | Stone to Modern (6) | ~4:00 | 5:00 | 6:45 | 8:30 | 6:30 | 5:00-8:00 |
| Full War | Stone to Cosmic (8) | ~6:30 | 6:45 | 8:45 | 10:45 | 8:30 | 6:45-10:15 |

If Phase 3 adopts the shorter Short War clock (A16.4 lever L2), it becomes Overdrive 3:15, Siege 4:00, Final Bell 5:15, median 4:15 ± 0:20.

### A17.3 What scales with the lane

Let L = 2,000 (the lane length). Rules that are about home defence keep their absolute size; rules about the whole lane scale with L.

| Rule | Today | A17 | Why |
|---|---|---|---|
| Lane length | 1,200 | 2,000 | A17.2 |
| Base depth behind the gate | 140 | 140 | Art size |
| World width (lane, bases, 40 lu margins) | 1,560 (x −180 to 1,380) | 2,360 (x −180 to 2,180) | Derived |
| Spawn | p = 20 | p = 20 | Home |
| Hold line | p = 320 | p = 320 | Stays inside turret cover |
| Turret range cap | 480 | 480 (24% of the lane) | Turrets defend home |
| Last Stand radius | 450 | 450 | Home |
| Fort pads (A16.14) | p 240, 360, 460 | unchanged | Inside turret cover |
| Mid-lane | p = 600 | p = 1,000 (L/2) | Scales |
| Power zone centre clamp | p ∈ [150, 1,050] | p ∈ [150, 1,850] (L − 150) | Scales |
| Age Power auto-aim (`densest` scan) | p 150-1,050 | p 150-1,850 | Scales |
| Paratroopers and Warp Strike | clamp p ≤ 1,050; fallback p = 600 | clamp p ≤ 1,850; fallback p = 1,000 | Scales |
| Stampede and Iron Horse start fallback | p = 200 | p = 200 | Home |
| Support follower alone (`soloMaxP`) | p = 200 | p = 200 | Home |
| Unit walking speed | table | table × 1.25 (`economy.marchSpeedBp` 12,500) | A17.2 |
| Hold retreat speed | 70% of speed | 70% of walking speed | Unchanged rule |
| Siege | turret damage −50%, base damage ×2, decay 0.5%/s | as today, plus **forced march**: unit movement ×1.2 (`economy.siege.moveSpeedBp` 12,000) | Keeps the late reinforcement walk at ~19 s |
| Split-age seam (A11) | x = 600, clamp [450, 750], 240 lu blend, drift ≤ 20 lu/s | x = 1,000, clamp [700, 1,300], 300 lu blend, drift ≤ 30 lu/s | Scales |
| Evolve backdrop wipe | 1.5 s | 2.0 s | Longer half |
| Battlefield trenches (A16.9) | own p 600-700 | own p 1,300-1,400 (enemy turret cover starts at own p 1,520) | Stated from the enemy gate |
| Tunneler surfacing (A16.15) | p ≥ 560 trigger; p 880 | p ≥ 1,360 (L − 640); p 1,680 (the enemy hold line, L − 320) | Stated from the enemy gate |
| Kill bounty, loss XP, base-damage XP, passive gold and XP | as A2.3-A2.4 | unchanged | Flat per event; A17.8 retunes thresholds instead |
| B3 tick cap | Full War ≤ 11,400 ticks | ≤ 12,900 ticks (10:45) | Longer Full War |

**Forced march** multiplies with slows and speed buffs in the usual order (A2.7) and applies to ground and air units, not to knockback, pulls, pounces, projectiles or power runners. It is announced with the Siege banner ("Siege! Forced march").

Rules stated in p from the enemy gate (trenches, surfacing, AI zones) are written as `L − x` from now on, so a later lane change needs no rule edits.

### A17.4 Camera

**World scale.** The camera shows a window of the world at a fixed world scale s (px per lu) chosen by device class (A17.7) and an optional zoom z ∈ [0.8, 1.25] (pinch or Ctrl + wheel; a double tap resets it). Visible width V = screen width / (s × z).

**Clamps.** The camera centre stays in [−180 + V/2, 2,180 − V/2]. If V ≥ 2,360 (very wide screens) the centre is fixed at x = 1,000 and nothing scrolls. Overscroll shows a 40 px rubber band that springs back in 200 ms.

**Opening view.** The match starts with the player's base at the left edge (centre = −180 + V/2) and auto-follow on, so the camera walks out with the first wave.

**Manual controls:**

| Input | Effect |
|---|---|
| One-finger or mouse drag on the lane band | Pans 1:1 (the world follows the pointer). A press becomes a drag after 10 px of travel; below 10 px and 350 ms it stays a tap (mounts) |
| Swipe (release while moving) | Momentum: release velocity = average over the last 100 ms, capped at 3,000 lu/s, decaying by e^(−4 t) (half every 0.17 s), stopping below 20 lu/s |
| Mouse wheel, trackpad | Horizontal pan: deltaX or deltaY in px (line mode × 40 px) moves the view by the same screen distance. Ctrl + wheel zooms |
| ← and → | Pan at 1,000 lu/s (Shift: 2,000), reaching full speed in 150 ms |
| Edge scroll (desktop, fine pointer only) | Pointer inside the lane band within 32 px of the left or right window edge pans at 300 lu/s, rising to 1,200 lu/s at the edge. Off while a popover is open or the pointer is outside the window. Setting, default On |
| Base button (left end of the minimap), H or Home | Eases (350 ms) to the opening view: own base at the left edge. Camera goes Manual |
| Front button (right end of the minimap), J or End | Eases to the follow target and turns auto-follow on |
| Tap or drag on the minimap | Centres the camera on that x (300 ms ease) or scrubs it 1:1 in minimap scale. Camera goes Manual |
| Double tap on the lane band | Resets zoom and turns auto-follow on |

Keys D (A16.14 forts), Q, W, B, T, E, S, L, P, F, Space, 1-5 and Backspace keep their A2.12 meanings.

**Auto-follow (default On).** Each frame, from interpolated view positions:

1. **Fronts.** Each side's front is its frontmost ground unit (by own p). A side with only air units uses its frontmost air unit.
2. **Focus x.**
   - Both sides have units: focus = own front + min(gap / 2, 0.3 V), where gap = the distance from the own front to the enemy front (0 if they touch). In contact this is the midpoint; with a wide gap it looks 0.3 V ahead of your own front.
   - Only enemy units: focus = the enemy front.
   - Only own units: focus = own front + 0.3 V.
   - No units: the opening view.
3. **Framing.** The target centre = focus − 0.05 V, so the focus sits at 55% of the view from the player's side and slightly more of the player's own reinforcements show.
4. **Priority moments** (only while following): the player's own power zone, from cast to the end of its effect (at most 3.5 s); an enemy power zone that overlaps the player's units, for its telegraph and effect; the player's Last Stand (pan to the own gate for 1.5 s).
5. **Motion.** A dead zone of ±8% of V: the camera does not move while the target is that close. Outside it, a critically damped spring with a 350 ms half-life, capped at 900 lu/s × game speed.

**Yielding to the player.** Any manual camera input (drag, swipe, wheel, arrow keys, edge scroll, base button, minimap) switches to Manual at once. Auto-follow resumes after 5 s with no camera input, but never while a pointer is down, a mount popover is open or a power is being dragged; it eases back over 600 ms. The front button, J and a double tap resume it at once. While Manual, the front button shows a soft outline ("Follow"). Setting "Auto camera": On (default) or Off; with Off, follow never resumes by itself and the front button jumps once without re-enabling it.

**Pause and replays.** The camera pans freely while paused (scouting the lane is allowed; bots are paused too). Replays use the same camera; a spectator follow uses the midpoint of both fronts with 0% bias.

**Camera moments (A12).** The own-evolve push-in (1.3×) runs only if the own base is inside the view; otherwise the banner and a minimap base flash replace it. A destroyed base always pans (500 ms) to the base and pushes in (1.45×), as today. Pushes never show past the world ends.

**Reduce motion.** No momentum, no rubber band, 150 ms eases, spring half-life 200 ms.

### A17.5 Minimap strip and off-screen indicators

**Minimap strip.** It replaces the front-line strip under the match clock in the top bar (A9.2).

- **Size.** 40% of the screen width (min 280 px, max 560 px); 16 px tall on phones, 22 px otherwise, with an invisible hit area at least 32 px tall. The base button (house icon) sits at its left end and the front button (crossed swords) at its right end, 32 px on phones and 36 px otherwise.
- **Scale.** The whole world, x −180 to 2,180, linearly.
- **Content, back to front:**
  1. Territory: own colour from the own gate to the own front, enemy colour from the enemy gate to the enemy front, neutral between (what the front-line strip showed).
  2. Turret cover: a thin bracket 480 lu from each gate while that side owns at least one turret.
  3. Bases: the age icon in team colour at each end with a thin HP fill; it flashes red for 1 s when hit (at most once per 2 s).
  4. Units: own units as circles, enemy units as diamonds (the A11 ring cue): 3 px for Infantry, Ranged, Anti-armor and Support, 4 px for Heavy and Epic, 6 px with a white ring for Legendaries (4, 5 and 7 px on desktop). Air units sit on a row above the ground row. Summons look like any unit. At most 80 dots (the B16 on-screen cap).
  5. Fronts: a 2 px vertical tick in team colour at each side's front.
  6. Power telegraphs and zones: a pulsing segment in the caster's colour.
  7. Camera window: a white rounded rectangle, 2 px outline and 15% white fill, covering the visible range.
- **Updates.** Redrawn at 10 Hz on a small DOM canvas from the view's interpolated positions (cheap: at most 80 dots).
- **Colourblind presets** recolour it like everything else; the circle and diamond shapes keep sides apart without colour.

**Off-screen indicators.** Round 44 px badges with a chevron at the left or right edge of the lane band, at 35% of the band height, stacking up to 3 per edge (newest on top, 12 px apart). They never cover the centre 70% of the band, and they are transient, so A9.2's "no persistent control covers the lane band" still holds. Tapping a badge jumps the camera there (Manual).

| Badge | Shows when | Look | Sound | Lasts |
|---|---|---|---|---|
| Base under attack | The own base took damage in the last 2 s and the own gate is off-screen | Red pulse, base icon | `alert_base` once, then at most once per 10 s | Until 3 s after the last hit |
| Power incoming | Either side's power zone lies fully off-screen | Caster's colour, power icon, a 1.0 s countdown ring during the telegraph | `power_telegraph` as usual (panned, A17.7) | Telegraph plus effect |
| Enemy Legendary | An enemy Legendary spawns off-screen | Legendary icon, enemy colour frame | none | 4 s |

### A17.6 Acting on things off-screen

- **Training.** Unchanged: units spawn at the own gate and auto-follow shows them walking out.
- **Turrets.** Mounts are still tapped on the base in the canvas. When the own base is off-screen:
  - the base button (or H) brings the base into view and stays Manual while the mount popover is open;
  - Q, W and B work from anywhere with no camera move (A2.12);
  - the base button shows a small hammer badge while an owned mount is empty and the player can afford the cheapest turret in the loadout;
  - an open mount popover or hover card closes when its anchor scrolls off-screen.
- **Age Power.**
  - Tap = auto-aim over p 150-1,850 whatever the view. While following, the camera frames the zone (A17.4); while Manual, a "Power incoming" badge points at it.
  - Drag from the power button into the lane band places the zone as today. Within 48 px of the band's left or right edge the camera edge-scrolls at up to 1,200 lu/s during the drag, on touch too, so any point of the lane can be reached in one drag.
  - Drag onto the minimap: the zone preview shows on the minimap (and in the lane where visible); releasing casts at that p. Dragging back onto the button cancels, as today.
  - Space auto-aims.
- **Evolve, stance, Treasury, Last Stand, emotes.** HUD controls; no camera needed.
- **Tutorial (A8).** A beat that points at something off-screen (a mount, a power zone, the enemy base) first moves the camera there (350 ms) and pauses auto-follow until the beat ends. `retime.test.ts` reruns with the longer walk.

### A17.7 Screen layouts, rendering and sound

**Device classes** (landscape; portrait keeps the "Rotate your device" overlay):

| Class | Test (CSS px) | Top bar / lane band / tray | World scale s | Visible width at z = 1 |
|---|---|---|---|---|
| Phone | height < 500 | 10% (min 36 px) / 68% / 22% | lane band height / 290 | ~760-930 lu |
| Tablet and small laptop | not a phone, width < 1,280 | 12% / 64% / 24% | min(width / 1,100, band / 330) | ~1,100 lu |
| Desktop | width ≥ 1,280 | 12% / 64% / 24% | min(width / 1,400, band / 330) | ~1,400 lu |

The phone value 290 lu is the world height the lane band shows: 232 lu above the ground line (the ground sits at 80% of the band), enough for Legendaries (170-220 lu, A11). Taller art (base towers, auras) may draw up under the translucent top bar.

| Screen | Class | s (px/lu) | Infantry (68 lu) | Visible | Share of the 2,360 lu world |
|---|---|---|---|---|---|
| 667 × 375 phone | Phone | 0.88 | 60 px | 760 lu | 32% |
| 844 × 390 phone | Phone | 0.91 | 62 px | 923 lu | 39% |
| 932 × 430 phone | Phone | 1.01 | 69 px | 925 lu | 39% |
| 1024 × 768 tablet | Tablet | 0.93 | 63 px | 1,100 lu | 47% |
| 1280 × 720 laptop | Desktop | 0.91 | 62 px | 1,400 lu | 59% |
| 1920 × 1080 desktop | Desktop | 1.37 | 93 px | 1,400 lu | 59% |

**Phone tray.** At 22% of 390 px the tray is 86 px: the 72 px cards (A9.2) fit with their name ribbon; the Army counter and stance flag shrink to one 40 px column. The top bar at 39 px holds a 20 px row (HP, XP, clock, enemy panel) over the 16 px minimap row.

**Rendering.**

- **Culling.** Display objects, projectiles and particle emitters more than 150 lu outside the view are not drawn or emitted; their state still updates, so nothing pops when scrolled into view. The minimap and indicators still show them.
- **Parallax.** The backdrop's 3 layers scroll at 0.05 (sky), 0.25 (silhouettes) and 0.55 (mid-ground) of the camera movement, the ground at 1.0. Each layer is built wide enough for its factor (V + (2,360 − V) × factor). Scrolling now shows the depth the layers were built for.
- **Sprite sharpness.** Unit sheets are rendered at 1.23 px per lu. At s × DPR up to 2.7 on desktop they would be upscaled about 2×. WP4 renders a sharper tier at 1.8 px per lu, loaded when s × DPR > 1.6, and streams sheets per age as each side reaches it (A17.17, size risk).

**Sound (A13 addition).** World sounds pan by screen position (StereoPanner, pan = clamped offset from the screen centre × 0.6) and fade outside the view: −1 dB per 50 lu beyond the view edge, down to −12 dB. UI sounds, alerts, the player's own evolve, power impacts and hits on the own base are never faded.

### A17.8 Eight ages: power scale, XP and formats

**Power scale (replaces the A2.2 table).**

| Index | Age | P | P (bp) | Base max HP | Step from the previous age |
|---|---|---|---|---|---|
| 0 | Stone | 1.00 | 10,000 | 10,000 | - |
| 1 | Bronze | 1.16 | 11,600 | 11,600 | ×1.16 (half step) |
| 2 | Medieval | 1.35 | 13,500 | 13,500 | ×1.16 (half step) |
| 3 | Gunpowder | 1.82 | 18,200 | 18,200 | ×1.35 |
| 4 | Industrial | 2.12 | 21,200 | 21,200 | ×1.16 (half step) |
| 5 | Modern | 2.46 | 24,600 | 24,600 | ×1.16 (half step) |
| 6 | Future | 3.32 | 33,200 | 33,200 | ×1.35 |
| 7 | Cosmic | 4.48 | 44,800 | 44,800 | ×1.35 |

- Bronze and Industrial sit at the geometric midpoint of their neighbours (√1.35 ≈ 1.16), so the existing ages keep their P and every existing card keeps its numbers. Cosmic continues the ×1.35 step after Future.
- A half-step unit beats its previous-age counterpart one-on-one with about a quarter of its HP left (1 − 1/1.16²); a ×1.35 step leaves about half (1 − 1/1.35²), as A2.2 says today.
- A uniform ×1.24 chain (1.00, 1.24, 1.54, 1.90, 2.36, 2.92, 3.62, 4.48) was considered and rejected: it changes every existing table and every tuned number.
- Rest of A2.2 unchanged: base HP follows the owner's age; on evolve it keeps its HP percentage and heals 5% of the new max.

**XP thresholds (replaces the A2.4 thresholds).** Small steps cost less XP, big steps more.

| Evolve into | XP needed (threshold of the age before) | Expected time, active play | Stay in the age before |
|---|---|---|---|
| Bronze | 550 | ~0:52 | 52 s |
| Medieval | 500 | ~1:25 | 33 s |
| Gunpowder | 900 | ~2:25 | 60 s |
| Industrial | 700 | ~3:10 | 45 s |
| Modern | 800 | ~4:00 | 50 s |
| Future | 1,200 | ~5:10 | 70 s |
| Cosmic | 1,300 | ~6:30 | 80 s |

- The times assume ~10.5 XP/s before the first evolve and 15-17 XP/s after (A2.4's active-play rate); Overdrive (6:45) comes after Cosmic.
- **One power per age.** Charge carries at most 50% across an evolve and refills the rest in 25 s (A2.9). Every age's threshold is at least 500 XP (≥ 28 s at 18 XP/s), so a player can fire each age's power once before evolving on. Stone's 550 lets the Stone power (ready at 0:50) fire just before Bronze.
- XP cap: 1.5 × the current threshold (825 in Stone); 1,200 in the format's final age. Overcharge unchanged.
- Passive XP alone reaches Bronze at 2:18, so nobody is frozen in an age.
- Queue conversion and Vanguard unchanged. Full War now has 7 Vanguard pairs instead of 4; both sides get them.
- **Music key changes (A13).** Own evolves transpose by +2, +2, +1, +1, +1, +1, +1 semitones (+9 at Cosmic). Once the total passes +6 the lead drops one octave so the register stays comfortable; each age still has its own arrangement.

**New mechanics by age (replaces the A2.5 table).**

| Age | New mechanic introduced |
|---|---|
| Stone | Basics: melee, ranged, heavy, knockback, first-hit charges, ricochet |
| Bronze | Piercing throws (Javelineer, Scorpion), damage auras, turret stuns, the sweep power |
| Medieval | Reach (second-rank attacks), shields, damage resistance, siege damage to bases |
| Gunpowder | Splash artillery, pulls, the Mech tag, first Air unit (Legendary bomber) |
| Industrial | Mech Heavies, marking support, runners that explode, stun chains, crewed Legendary |
| Modern | Air as a regular option, suppression, called strikes |
| Future | Energy shields, EMP stuns, time control |
| Cosmic | Blink skirmisher, shield projector, an air Legendary with called strikes |

The A2.5 sentence on a sixth age becomes: "Ages are data. New ages need only content, visuals and audio entries plus one `AgeId` entry (A17.15)."

**Formats (replaces the A2.10 table).**

| Format | Ages | Overdrive | Siege | Final Bell | Retreat unlocks | Used in |
|---|---|---|---|---|---|---|
| Tutorial | Stone, Medieval, Gunpowder, Modern, Future (thresholds 250 / 300 / 350 / 400) | none | none | none | never | Onboarding match 1 |
| Short War | Stone to Gunpowder (4 ages) | 3:45 | 4:45 | 6:15 | 1:00 | Ladder (all arenas), Skirmish |
| Standard War | Stone to Modern (6 ages) | 5:00 | 6:45 | 8:30 | 1:00 | Ladder from Arena 2, Daily Challenge, Skirmish |
| Full War | Stone to Cosmic (8 ages) | 6:45 | 8:45 | 10:45 | 1:00 | Ladder from Arena 3, Conquest, Skirmish |

- Every ladder format is a range of consecutive ages from Stone. The tutorial alone skips ages: it keeps today's five-age highlight run ("ends with lasers") with its own thresholds, so match 1 is unchanged.
- The start screen's format labels read "up to 6 min", "up to 9 min" and "up to 11 min" (the Final Bell rounded up).

**Expected match flow (replaces A2.13; Full War, two mid-tier players).**

| Time | What typically happens |
|---|---|
| 0:00-0:15 | Both open with 2-3 units; the camera walks out with them; first clash near mid-lane (p ≈ 1,000) at ~0:13 |
| 0:30 | First turret; greedy players buy Treasury |
| 0:50 | Stone power ready; fired just before evolving |
| ~0:52 | Bronze; 2 Vanguard Hoplites march out |
| ~1:25 | Medieval |
| ~2:25 | Gunpowder; first Epics |
| ~3:10 | Industrial; first mech Heavies |
| ~4:00 | Modern; turrets modernised; first Legendary pushes |
| ~5:10 | Future |
| ~6:30 | Cosmic |
| 6:45 | Overdrive: big pushes |
| 7:30-10:00 | Most matches end |
| 8:45-10:45 | Siege with forced march; Final Bell is rare |

### A17.9 Bronze Age (P 1.16)

Theme: antiquity (hoplites, chariots, bolt-throwers, myths in bronze). Values are final level-1 numbers at P 1.16 (A5.1 conventions). Raw file: `src/content/raw/bronze.ts`.

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hoplite | Hoplite | C | Infantry | 50 | 186 | 23 / 1.0 s | 16 | 70 | S | G | light bio melee | Blunt. Shield Bash: the first hit of each engagement knocks the target back 15 lu (no damage bonus) |
| javelineer | Javelineer | C | Ranged | 75 | 110 | 20 / 1.4 s | 210 | 65 | S | G+A | light bio ranged | Javelin; pierces 2 targets total within 50 lu |
| war_chariot | War Chariot | C | Heavy | 150 | 630 | 49 / 1.5 s | 16 | 65 | L | G | armored bio melee | Scythe Charge: first hit ×2 and 30 lu knockback. The fastest Common Heavy, with 3% less HP |
| phalangite | Phalangite | R | Anti-armor | 100 | 232 | 30 / 1.2 s | 65 | 70 | M | G | light bio melee | Reach; melee AA mods; priority armored |
| standard_bearer | Standard Bearer | R | Support | 110 | 151 | 9 / 1.2 s | 150 | 65 | S | G+A | light bio support ranged | Aura: allies within 160 lu deal +15% damage; followSupport |
| scorpion | Scorpion | E | Artillery | 200 | 330 | 64 / 3.0 s | 290 (min 60) | 45 | L | G | light mech ranged | Bolt pierces 3 targets total within 150 lu |
| bronze_colossus | Bronze Colossus | L | Siege heavy | 350 | 2,050 | 64 splash r45 / 2.0 s | 20 | 40 | H | G | armored mech melee legendary | Stomp: every enemy hit is slowed 20% for 1.5 s. Molten Heart: on death bursts for 160 splash r70 on ground enemies |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| archer_tower | Archer Tower | C | 150 | 35 / 1.5 s | 370 | G+A | Single target |
| sun_mirror | Sun Mirror | C | 175 | 9 / 0.3 s | 230 | G+A | Instant beam of focused sunlight; high chip DPS, short range |
| onager | Onager | R | 250 | 95 splash r50 / 4.5 s | 480 (min 150) | G | Arc |
| gorgon_bust | Gorgon Bust | E | 250 | 55 / 6.0 s | 380 | G+A | Priority armored. Stone Gaze: stuns the target 1.5 s |

### A17.10 Industrial Age (P 2.12)

Theme: steam, rivets, rail and the first electric light, roughly 1850-1915. No gas weapons. Raw file: `src/content/raw/industrial.ts`.

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| riveter | Riveter | C | Infantry | 50 | 330 | 42 / 1.0 s | 16 | 72 | S | G | light bio melee | Blunt. Big Wrench: the first hit of each engagement deals ×1.5 |
| carbineer | Carbineer | C | Ranged | 75 | 201 | 33 / 1.2 s | 250 | 65 | S | G+A | light bio ranged | Bullet |
| steam_golem | Steam Golem | C | Heavy | 150 | 1,187 | 89 / 1.5 s | 16 | 55 | L | G | armored mech melee | Piston Punch: first hit ×2 and 30 lu knockback |
| harpoon_gunner | Harpoon Gunner | R | Anti-armor | 100 | 260 | 55 / 1.2 s | 210 | 65 | M | G+A | light bio ranged | Harpoon; ranged AA mods; priority armored. Reel In: the first hit of each engagement pulls the target 25 lu toward the gunner |
| flare_spotter | Flare Spotter | R | Support | 110 | 276 | 17 / 1.2 s | 200 | 65 | S | G+A | light bio support ranged | Priority armored. Every hit marks the target (+20% damage taken from all sources) for 3 s; followSupport |
| sapper | Sapper | E | Siege | 200 | 560 | 240 vs base / 2.0 s (12 vs units) | 12 | 85 | M | G | light bio melee | siegeOnly. Short Fuse: on death the charge goes off for 180 splash r60 on ground enemies (never the base) |
| land_dreadnought | Land Dreadnought | L | Siege heavy | 350 | 3,600 | 130 splash r40 / 2.2 s | 160 | 35 | H | G | armored mech ranged legendary | Two sponson gunners (riders) each shoot 10 / 0.5 s at range 160 (G+A); on death the crew bails out as 2 Carbineers (summoned) |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| gatling_gun | Gatling Gun | C | 150 | 13 / 0.3 s | 350 | G+A | Single target |
| mortar_pit | Mortar Pit | C | 175 | 68 splash r40 / 2.0 s | 300 (min 60) | G | Arc; short-range swarm breaker |
| boiler_mortar | Boiler Mortar | R | 250 | 172 splash r55 / 5.0 s | 480 (min 170) | G | Arc |
| tesla_tower | Tesla Tower | E | 250 | 130 / 4.5 s | 380 | G+A | Chains to 4 targets total (each ≤ 90 lu from the previous); every target hit is stunned 0.5 s |

### A17.11 Cosmic Age (P 4.48)

Theme: space opera beyond the Future (star legions, warp, motherships). Raw file: `src/content/raw/cosmic.ts`.

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| star_legionnaire | Star Legionnaire | C | Infantry | 50 | 700 | 90 / 1.0 s | 16 | 75 | S | G | light bio melee | Blunt. Deflector: takes 20% less damage from attacks with range ≥ 100 (not powers) |
| ion_ranger | Ion Ranger | C | Ranged | 75 | 426 | 54 / 1.0 s | 270 | 65 | S | G+A | light bio ranged | Ion bolt; arcs to 1 more enemy within 50 lu (chain, 2 targets total) |
| hover_tank | Hover Tank | C | Heavy | 150 | 2,509 | 188 / 1.5 s | 90 | 55 | L | G | armored mech ranged | Plasma cannon. Hovers, but is a ground unit (blocks and is blocked) |
| graviton_halberdier | Graviton Halberdier | R | Anti-armor | 100 | 896 | 116 / 1.2 s | 70 | 70 | M | G | light bio melee | Reach; melee AA mods; priority armored; Brace |
| starwarden | Starwarden | R | Support | 110 | 582 | 36 / 1.2 s | 150 | 65 | S | G+A | light bio support ranged | Shield Beacon every 8 s while it has a target: the nearest 4 allies within 180 lu get a 200 shield for 5 s; followSupport |
| warp_stalker | Warp Stalker | E | Skirmisher | 200 | 1,600 | 140 / 0.8 s | 12 | 100 | M | G | light bio melee | Blink (10 s cooldown): when blocked, warps (0.4 s, untargetable by melee) to the nearest enemy ranged or support unit within 200 lu beyond the blocker; first strike ×2 (the pounce rule) |
| mothership | Mothership | L | Air gunship | 350 | 3,700 | 80 / 0.6 s | 180 | 40 | H | G+A | air mech legendary | Obeys stance. Drone Strike every 6 s: the nearest enemy ground unit within 400 lu gets a strike after 1.0 s for 300 splash r50 (one call-in per side per 3 s). On death crashes for 350 splash r80 on ground enemies |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| ion_turret | Ion Turret | C | 150 | 27 / 0.3 s | 370 | G+A | Instant beam, single target |
| starburst_gun | Starburst Gun | C | 175 | 123 / 2.0 s | 240 | G+A | Hits the frontmost enemy in range and enemies within 90 lu behind it; max 4 targets |
| starfall_battery | Starfall Battery | R | 250 | 363 splash r60 / 5.0 s | 480 (min 180) | G | Arc |
| tachyon_lance | Tachyon Lance | E | 250 | 184 / 4.0 s | 420 | G+A | Instant; pierces 4 targets total within 250 lu |

**Age Powers of the new ages (join the A5.7 table).** Final numbers at the age's P and L1 loadouts; every power has a 1.0 s telegraph. "Per unit" follows A2.9 against the age's L1 Infantry and Heavy Commons.

| Slug | Age | Slot | Source | Effect | Per unit |
|---|---|---|---|---|---|
| tidal_wave | Bronze | Default | Starter | A wave sweeps a 450 lu zone over 2.0 s, dealing 130 once to each ground enemy it touches (±20 lu); ground only | 130: 70% / 21% |
| aegis | Bronze | Alternate | Road 200 | All your units get an 80 shield and +15% damage for 6 s (no zone) | - |
| iron_horse | Industrial | Default | Starter | 3 runaway armoured engines, 0.5 s apart, run 600 lu forward at 450 lu/s from your frontmost unit (or p = 200); 150 damage and 50 lu knockback per hit; max 2 hits per enemy per cast; ground only | ≤ 300: 91% / 25% |
| zeppelin_raid | Industrial | Alternate | Road 350 | 10 bombs along a 480 lu line over 2.0 s (line pattern); each 150 damage, splash r45; ground only | ~281: 85% / 24% |
| starfall | Cosmic | Default | Starter | 6 star shards over 2.0 s across 450 lu (even pattern, ±20 lu jitter); each 380 damage, splash r60; hits air | ~608: 87% / 24% |
| warp_strike | Cosmic | Alternate | Road 500 | 3 Star Legionnaires at your Star Legionnaire level warp in 150 lu beyond the enemy's frontmost ground unit (clamped to p ≤ 1,850; p = 1,000 if the enemy has no ground units); summoned, no pop, no bounty | - |

**Curve check** (value ÷ P; the existing ages set the curve):

| Stat ÷ P | Stone | Bronze | Medieval | Gunpowder | Industrial | Modern | Future | Cosmic |
|---|---|---|---|---|---|---|---|---|
| Infantry HP | 160 | 160 | 160 | 160 | 156 (+first hit ×1.5) | 160 | 142 (+27 shield) | 156 (+20% resist) |
| Infantry damage | 20 | 19.8 | 20 | 19.8 | 19.8 | 19.9 | 19.9 | 20.1 |
| Heavy HP | 560 | 543 (faster) | 560 | 560 | 560 | 560 | 560 | 560 |
| Anti-armor Rare HP | 200 | 200 | 200 | 126 (ranged) | 123 (ranged) | 122 (ranged) | 120 (ranged) | 200 |
| Legendary HP (ground) | 1,700 | 1,767 | 1,704 | air 824 | 1,698 | 1,667 | 1,687 | air 826 |
| C150 turret DPS | 20.0 | 20.1 | 19.8 | 20.1 | 20.4 | 20.3 | 20.1 | 20.1 |
| Rare arc turret damage per shot | 45 (log) | 81.9 | 81.5 | 30 (4 rockets) | 81.1 | 81.3 | 81.3 | 81.0 |

**Rarity stays a sidegrade.** Rares, Epics and Legendaries follow the same per-P budgets as the existing ages (A5.1 archetypes); their extras are specialisation (reach, pierce, marks, stuns, siege), paid for with lower HP or DPS elsewhere. Every new Legendary has an in-age answer to check in Phase 3 (A16.4 "Legendary tuning"): Phalangite for the Bronze Colossus, Harpoon Gunner and Sapper's burst for the Land Dreadnought, Ion Ranger, Ion Turret and Tachyon Lance for the Mothership (the Cosmic Anti-armor Rare is melee and cannot hit air, by design).

### A17.12 Art, sound and IDs for the new ages

**Age palettes (join the A11 table; the colour rule applies).**

| Age | Large-area colours | Accents |
|---|---|---|
| Bronze | sandstone #CDBE9E, verdigris #4F8F7F, dusk plum #6A5566 | polished bronze #B8863B |
| Industrial | iron #5B6168, coal #2B2A2E, smoke cream #DCD6C8, muted brick #8A6A63 | copper #B06A3B |
| Cosmic | void #1E1830, nebula violet #8E44C8, star white #F2F0FF | mint #3FE0B0 |

Polished bronze and copper sit in the orange band (350°-81°) and stay accents (≤ 10% of a silhouette). Sun beams, flares and fuse sparks use white-hot cores at low saturation; the Flare Spotter's flare is white-magenta, never red. Nebula violet (276°) sits outside the blue band.

**Bases, backdrops and Treasury art.**

| Age | Base (4 mounts, crumble states, evolve morph per A11) | Backdrop silhouettes | Treasury art |
|---|---|---|---|
| Bronze | Ziggurat: stepped stone with bronze doors and braziers | Stepped temples, colonnades, olive hills, a distant volcano | Granary and trade barge |
| Industrial | Foundry: brick works with a clock tower, chimney and gantry crane | Chimneys, gas holders, rail viaducts, smoke plumes | Steam mill |
| Cosmic | Star Ark: a grounded starship hull with a landing ring | Ringed planets, nebula clouds, drifting asteroids | Star forge |

A11's skyline chain becomes: mountains → temples → castles → windmills and masts → chimneys and viaducts → city → megastructures → planets and nebulae.

**Units: rigs, silhouettes and signature clips** (A11 scale: infantry ~68 lu, heavies 100-120 lu, Legendaries 170-220 lu; team colour on large parts).

| Slug | Rig | Silhouette and art notes | Ability clip |
|---|---|---|---|
| hoplite | biped | Round shield (team face), crested helmet (team crest), short spear | Shield bash shove |
| javelineer | biped | Light tunic, a bundle of javelins on the back, throwing arm cocked | Wind-up throw |
| war_chariot | rider | Charioteer on a two-wheeled cart pulled by one stocky horse; scythed hubs; team pennant on the cart | Charge lean, wheel sparks |
| phalangite | biped | Very long sarissa (reads as reach), small shield, tall helmet | Braced thrust |
| standard_bearer | biped | Tall eagle standard with a team banner, drum at the hip | Banner wave (aura ring) |
| scorpion | vehicle | Wheeled torsion bolt-thrower with one crew member cranking | Crank and recoil |
| bronze_colossus | walker | Huge bronze statue with a team sash and crest; glowing white-hot seams | Ground stomp ring; molten burst on death |
| riveter | biped | Cap, overalls with a team bib, oversized wrench | Wrench wind-up |
| carbineer | biped | Brimmed hat, long team-colour coat, short carbine | Lever cock |
| steam_golem | walker | Boiler belly, piston arms, a chimney that puffs in idle | Piston punch with a steam burst |
| harpoon_gunner | biped | Shoulder harpoon gun, rope coil, goggles | Reel-in yank |
| flare_spotter | biped | Binoculars, flare pistol, team armband | Flare arc and mark reticle |
| sapper | biped | Running crouch, striped charge box on the back, lit fuse sparkle | Fuse sparkle; blast on death |
| land_dreadnought | vehicle | Rhomboid landship with full-length treads, two side sponsons with visible gunners, team roundel | Crew bails out on death |
| star_legionnaire | biped | Sleek helmet with a visor, energy blade, deflector disc on the forearm | Deflector flare on ranged hits |
| ion_ranger | biped | Long rifle with glowing coil rings | Coil charge-up |
| hover_tank | vehicle | Low wedge hull on glowing hover pads, no wheels, bobbing idle | Recoil and pad flare |
| graviton_halberdier | biped | Long halberd with a floating gravity orb in the head | Brace plant |
| starwarden | biped | Robed figure with a staff that holds a floating beacon | Beacon pulse ring |
| warp_stalker | biped | Lean, hooded, a cloak with a starry lining | Blink out and in |
| mothership | flyer | Huge disc ship with a tractor ring, launch bays and team hull stripes | Drone launch; crash on death |

**Turrets (turret rig: base, pivot, barrel).** Archer Tower (wooden tower, archer inside), Sun Mirror (bronze dish on a tripod), Onager (torsion catapult), Gorgon Bust (stone head with snake hair on a plinth; eyes glow white on fire), Gatling Gun (crank-fed multi-barrel), Mortar Pit (sandbag ring with a squat tube), Boiler Mortar (heavy mortar on a boiler with a steam vent), Tesla Tower (coil tower with a sparking globe), Ion Turret (compact emitter), Starburst Gun (fan-barrelled blaster), Starfall Battery (shard launcher on a dish), Tachyon Lance (long prism barrel).

**Attack mapping (joins A14.2).**

| Card | Projectile / effect | Attack SFX | Damage type |
|---|---|---|---|
| hoplite | melee | swing_whoosh | pierce |
| javelineer | proj.javelin | shot_javelin | pierce |
| war_chariot | melee | swing_whoosh | slash |
| phalangite | melee | swing_whoosh | pierce |
| standard_bearer | proj.javelin | shot_javelin | pierce |
| scorpion | proj.scorpion_bolt | shot_scorpion | pierce |
| bronze_colossus | melee; death fx.explosion_m | stomp_colossus; explosion_m | blast |
| archer_tower | proj.arrow | shot_bow | pierce |
| sun_mirror | fx.sun_beam | mirror_beam | laser |
| onager | proj.boulder | shot_catapult | blast |
| gorgon_bust | fx.gorgon_gaze | gorgon_gaze | laser |
| riveter | melee | swing_whoosh | blunt |
| carbineer | proj.bullet | shot_carbine | bullet |
| steam_golem | melee | swing_whoosh | blunt |
| harpoon_gunner | proj.harpoon | shot_harpoon | pierce |
| flare_spotter | proj.flare | flare_pop | blast |
| sapper | melee; death fx.explosion_m | fuse_hiss; explosion_m | blast |
| land_dreadnought | proj.shell; riders proj.bullet | shot_cannon; shot_gatling | blast; bullet |
| gatling_gun | proj.bullet | shot_gatling | bullet |
| mortar_pit | proj.lob | shot_lob | blast |
| boiler_mortar | proj.shell | shot_cannon | blast |
| tesla_tower | fx.tesla_arc | tesla_zap | laser |
| star_legionnaire | melee | swing_whoosh | laser |
| ion_ranger | proj.ion | shot_ion | laser |
| hover_tank | proj.plasma | shot_plasma | blast |
| graviton_halberdier | melee | swing_whoosh | laser |
| starwarden | proj.ion; beacon fx.beacon_ring | shot_ion; shield_up | laser |
| warp_stalker | melee; blink fx.blink | swing_whoosh; blink_warp | slash |
| mothership | fx.beam_void; strike proj.star_shard | shot_void; drone_launch | laser; blast |
| ion_turret | fx.beam_ion | shot_ion | laser |
| starburst_gun | proj.starburst | shot_starburst | laser |
| starfall_battery | proj.star_shard | shot_plasma | blast |
| tachyon_lance | fx.beam_tachyon | shot_tachyon | laser |

Spawn and death sounds follow the A14.2 defaults.

**New IDs (join A14).**

- Cards: 21 `unit.<slug>`, 12 `turret.<slug>`, 6 `power.<slug>`.
- World: `base.bronze`, `base.industrial`, `base.cosmic`; `backdrop.bronze`, `backdrop.industrial`, `backdrop.cosmic`; `icon.age.bronze`, `icon.age.industrial`, `icon.age.cosmic`.
- Projectiles: `proj.javelin`, `proj.scorpion_bolt`, `proj.harpoon`, `proj.flare`, `proj.ion`, `proj.starburst`, `proj.star_shard`.
- Instant effects: `fx.sun_beam`, `fx.gorgon_gaze`, `fx.tesla_arc`, `fx.beam_void`, `fx.beam_ion`, `fx.beam_tachyon`.
- Ability effects: `fx.stomp_ring`, `fx.fuse_spark`, `fx.beacon_ring`, `fx.blink`.
- Power effects: `fx.tidal_wave`, `fx.aegis_glow`, `fx.iron_horse`, `fx.zeppelin`, `fx.star_shard_rain`, `fx.warp_portal`.
- Camera UI: `icon.chevron`, `icon.base_alert`, `icon.follow`.
- Sounds (A13): `shot_javelin`, `shot_scorpion`, `stomp_colossus`, `mirror_beam`, `gorgon_gaze`, `shot_carbine`, `shot_harpoon`, `flare_pop`, `fuse_hiss`, `shot_gatling`, `tesla_zap`, `shot_ion`, `shot_void`, `shot_starburst`, `shot_tachyon`, `blink_warp`, `drone_launch`, `pw_wave`, `pw_aegis`, `pw_iron_horse`, `pw_zeppelin`, `pw_starfall`, `pw_warp`, `evolve_fanfare_bronze`, `evolve_fanfare_industrial`, `evolve_fanfare_cosmic`, `alert_base`.
- Music (A14.3): `music.bronze`, `music.industrial`, `music.cosmic`.

**Arrangements (join the A13 table).**

| Arrangement | Instruments |
|---|---|
| Bronze | plucked lyre, frame drum, reed pipe (square wave with vibrato) |
| Industrial | brass band (tuba bass, cornet lead), anvil and piston percussion |
| Cosmic | choir pad (formant-filtered saw), deep sub pulse, bell arpeggios |

**Skins.** None for the new ages now. The skin rules (A5.8) apply unchanged when they come.

### A17.13 Meta, AI and other systems for 8 ages

**War Plan (A3).**

- A War Plan is **eight** Age Loadouts, one per age. The minimum to play stays 3 units and 1 turret per age used by the format.
- The starter kit holds every Common of all 8 ages (3 units and 2 turrets each) and each age's default power, all at L1.
- AA Rares by script: Spear Hunter and Phalangite in capsule 1; Pikeman and Grenadier in capsule 2; Harpoon Gunner and Bazooka Trooper in the Age Unlock Capsules at Arena 2; Rail Gunner and Graviton Halberdier in new Age Unlock Capsules at Arena 3.
- The builder shows age tabs (one loadout visible at a time on phones) and the plan average over the ages the next format uses. Auto-fill, presets, "Equip now" and the deck advisor are unchanged.
- Save migration (WP8): every stored War Plan gains Bronze, Industrial and Cosmic loadouts filled with that age's starter Commons, both Common turrets and the default power; the collection gains the 15 new starter Commons at L1 and the 3 default powers. Nothing owned is lost (A15.1).

**Collection (A5.1).** 56 units + 32 turrets = 88 cards (40 Common, 24 Rare, 16 Epic, 8 Legendary), 16 Age Powers. Schema checks per age stay (7 units, 4 turrets, 2 powers); the totals move to these numbers.

**Arenas and capsules (A6.3-A6.5).**

| Arena | Ladder formats | Drop pool (was) | Drop pool (A17) | Gate rewards change |
|---|---|---|---|---|
| 1 Tar Pits | Short | Ages 1-3 | Stone to Gunpowder (4 ages), no random Legendaries | none |
| 2 Frostfang Pass | Short, Standard | Ages 1-4 | Stone to Modern (6 ages) | Age Unlock Capsules: Industrial and Modern (was Modern and Future) |
| 3 Kingsmoat and up | All | All | All 8 ages | Gate 3 adds Age Unlock Capsules for Future and Cosmic |

- Onboarding script: capsule 1 (Bronze tier) guarantees Spear Hunter NEW and Phalangite NEW; capsules 2-5 unchanged.
- Age Capsules pick from 8 ages in the grant dialog. Roll algorithm, pity and odds unchanged.
- **Pacing.** The pool grows 60% (55 → 88 cards), so each card gets ~37% fewer copies per day. The A6.9 economy sim reruns; its targets (Common max ~4.5 months, copy and Amber finish within 30 days) hold only if stacks carry more copies. Recommended: copies per stack ×1.4 (Commons and Rares), decided by the economy sim in Phase 3 (A17.18 question 5).

**Trophy Road (A6.3).** Alternate powers move so each unlocks near the arena that brings its age:

| Node | 100 | 150 | 200 | 250 | 300 | 350 | 400 | 450 | 500 |
|---|---|---|---|---|---|---|---|---|---|
| Today | Meteor Shower | Gate 2 | Royal Decree | Silver | Broadside | 100 D | Gate 3 + Carpet Bomber | 190 A | Nanite Surge |
| A17 | Meteor Shower | Gate 2 | Aegis | Royal Decree | Broadside | Zeppelin Raid | Gate 3 + Carpet Bomber | Nanite Surge | Warp Strike |

The displaced Silver Capsule, 100 Dust and 190 Amber join the 550, 600 and 650 nodes as second items, so no reward is lost.

**Timings that follow the formats.**

| Item | Today | A17 |
|---|---|---|
| Quest "Reach your format's final age before" | 2:20 / 3:40 / 5:00 | 2:40 / 4:15 / 6:45 |
| Quest "Destroy a base before" | 6:00 | 6:00 (Short and Standard make it reachable) |
| Conquest star 3 (Full War) | win before 6:00 | win before 7:30 |
| Title Evolver | first Future Age | first Cosmic Age |
| Title Speedrunner | final age before 4:30 in Full War | Cosmic before 6:15 in Full War |
| Rewards by format (A15.8) | from today's medians | re-derived from the A17.2 medians (trophies per minute within ±5% across formats) |
| Codex Levels (A6.7) | ~81 levels | ~130 levels at the same 15 points per level |
| B5 procedural bake at boot | ages 0-1 | Stone and Bronze; the rest lazily |

**AI (WP3).**

- `src/ai/book.ts` already builds the age order from content, so the new ages need no brain code. Generals' personal War Plans (`src/content/generals.ts`) and procedural commanders gain the 3 new loadouts; ladder bots pick from the arena's drop pool as today.
- Lane constants in `src/ai/brain.ts` (gate zone, push gate, hold decisions) become lane-relative (offsets from the own gate for home rules, `L − x` for enemy-side rules) and are retuned once on the 2,000 lu lane.
- Evolve policy: "fire the power, then evolve" becomes the normal pattern with 7 evolves and the one-power-per-age thresholds; the existing evolve-vs-power scoring covers it.
- New cards score through existing ability kinds: Sapper like the Battering Ram (siege), Mothership like an air Legendary (the air-answer check), Scorpion like the Bronze Cannon (artillery), Flare Spotter through its mark, Gorgon Bust and Tesla Tower through their stuns.
- `Observation` is unchanged. Bots have no camera; the minimap gives the player the same whole-lane information (A17.1 principle 3).

**Daily Challenge, Skirmish, replays.** The Daily Challenge plays Standard War (now 6 ages). Skirmish offers all three formats. Old replays carry an older `contentHash` and show "from an older version" (B3), as today.

### A17.14 A2.14 targets (changes)

| Metric | Target today | A17 target |
|---|---|---|
| Full War median length | 7:00; 80% 5:00-9:00 | 8:30; 80% 6:45-10:15 |
| Standard War median | not listed | 6:30; 80% 5:00-8:00 |
| Short War median | 4:30 | 4:45 (4:15 ± 0:20 with the shorter clock) |
| First evolve | median 60 ± 10 s | median 52 ± 10 s |
| Later evolves | within ±20 s of A2.4; every scripted strategy reaches Future (Full War) between 4:00 and 6:15 | within ±20 s of A17.8; every scripted strategy reaches Cosmic (Full War) between 5:45 and 7:30 |
| One power per age (new) | - | In the Balanced mirror, ≥ 70% of age stays (Stone to the second-to-last age) include one power cast |
| First clash (new) | - | Median 0:11-0:16 |
| Contact in the middle (new) | - | Reported: share of match time the contact point lies between the two turret covers (p 480 to L − 480) |
| Camera (new, e2e) | - | Auto-follow keeps the contact point on screen ≥ 90% of match time in a 10-match bot-vs-bot run on an 844 × 390 viewport |
| Has-an-answer | as today | adds the 3 new Legendaries (A17.11) |
| Power damage per unit in zone | every damaging power | adds Tidal Wave, Iron Horse, Zeppelin Raid, Starfall |
| B3 performance | headless Full War ≤ 400 ms | ≤ 500 ms (up to 12,900 ticks) |

All other rows stay, including the Final Bell rows and their release rule. The whole table reruns after step 1 (lane) and again after step 4 (ages) of A17.16.

### A17.15 Genuinely new rules (everything else reuses existing kinds)

1. **Lane length 2,000 lu.** `LANE_MLU` in `src/core/fixed.ts` becomes 2,000,000; `battle.laneLength` and `battle.midLane` follow, and a content test asserts they match. Render derives its lane from core instead of its own `LANE_LU`.
2. **March speed.** New `EconomyRules.marchSpeedBp` (12,500): unit speed in milli-lu per tick = trunc(speed × 1,000 / 20 × marchSpeedBp / 10,000), applied once in the compile step (`src/sim/rules.ts`).
3. **Siege forced march.** New `EconomyRules.siege.moveSpeedBp` (12,000), applied to unit movement while the phase is Siege.
4. **Formats may skip ages (tutorial only).** The schema check becomes "ages in increasing order from Stone". The underdog bounty compares `AgeDef.index` values (global), never the position in the format; WP2 verifies this.
5. **New ages as data.** `AgeId` gains `'bronze' | 'industrial' | 'cosmic'` (contract request to WP0).

First-time combinations of existing kinds, each needing one WP2 unit test and no new code if the test passes:

| Card | Combination |
|---|---|
| Gorgon Bust, Tesla Tower | `onHit` stun from a turret; Tesla's stun on every chain target |
| Bronze Colossus | `onHit` slow on a melee splash attack; `onDeathExplode` on a ground Legendary |
| Harpoon Gunner | `firstHitBonus` pull on a ranged unit |
| Starwarden | `periodicShieldAura` on a `followSupport` unit ("while it has a target") |
| Mothership | `callStrike` and `onDeathExplode` on an air gunship; the strike search starts at its x |
| Sapper | `siegeOnly` plus `onDeathExplode` (the burst never hits the base) |
| Land Dreadnought | `riders` on a ranged Legendary, bailing out as Carbineers |
| Warp Stalker | `pounce` with a 200 lu search |
| Tidal Wave | `sweep` with `hitsAir: false` |
| Warp Strike | `paradrop` of a melee card |

Camera, minimap, indicators, culling and sound panning are view rules only. They never read or change sim state beyond what the view already reads.

### A17.16 Build plan

**Recommended order.** Step 1 first, with the existing 5 ages, so the owner can feel the long lane before any art money is spent on new ages.

| Step | What | Work packages and main files | Golden replays | Size |
|---|---|---|---|---|
| 1. Long lane and camera | Lane 2,000 lu, march speed, Siege forced march, lane-derived clamps; device classes, camera, controls, auto-follow, minimap, indicators, off-screen actions, culling, parallax, sound panning, settings | WP0 request: `src/core/fixed.ts`, `src/contracts/content.ts` (2 fields), `src/contracts/save.ts` (settings: auto camera, edge scroll). WP1: `raw/economy.ts` (`battle`, `economy`), `raw/powers.ts` (Paratroopers fallback 1,000), `compile.ts`, `schema.ts`. WP2: `sim/rules.ts`, `sim/systems/movement.ts`, `sim/replay.ts`. WP3: `ai/brain.ts`. WP5: `render/layout.ts`, `camera.ts`, `input.ts`, `seam.ts`, `powerTargeting.ts`, `eventMapper.ts`, `battleView.ts`, `ui/hud/*` (minimap, jump buttons, badges). WP4: `visuals/backdrops/*`, `manifest.world.ts`. WP6: `audio/mixer.ts`, `service.ts` (pan and fade, `alert_base`). WP9: settings screen. WP11: tutorial beats that move the camera. WP12: goldens, e2e (pan, minimap tap, badge), A2.14 rerun | **All invalidated** (lane, speeds). `SIM_VERSION` 2.0.0; re-record once | M-L |
| Owner check | Play Short and Full War on phone and PC | - | - | - |
| 2. Eight ages as data | Wire the three raw files; new thresholds and formats; meta tables; save migration; AI plans; strings; placeholder and procedural visuals and ZzFX sounds so every ID exists | WP0 request: `contracts/ids.ts` (`AgeId`), `contracts/save.ts` (version). WP1: `raw/index.ts`, `raw/economy.ts` (`ageScale`, formats), `raw/powers.ts` or the three files' powers, `ages.ts` (`AGE_ORDER`), `schema.ts` (totals, format check), `arenas.ts`, `trophyRoad.ts`, `capsules.ts` (script), `cosmetics.ts` (titles), `quests.ts`, `generals.ts`, `i18n/content.en.json`, `generated/counters.json`. WP7: Age Unlock at Gate 3, quest and Conquest times. WP8: migration. WP9: War Plan tabs, collection filters. WP10: 8-age Age Capsule dialog. WP3: plans. WP4: manifest entries, procedural puppets and parts for 3 ages. WP6: sounds, 3 arrangements, 3 fanfares, key-change rule. WP12: integrity tests, unit tests of A17.15 | Unchanged if the sim code is unchanged (goldens use the frozen fixture content). If the underdog check or a combination test needs a sim fix: `SIM_VERSION` 2.1.0 and re-record | L |
| 3. Art for the new ages | 3D sprite sheets for 21 units (Blender rigs per age), 12 turrets, 3 bases; 3 backdrops; effects for 6 powers and new projectiles; the sharper sheet tier for the long-lane scale | WP4: `art/blender/ageborn_art/rigs_bronze.py`, `rigs_industrial.py`, `rigs_cosmic.py`; `art/blender/units/<slug>.py` (21); `art/blender/world` (turrets, bases); `public/art/units/<age>/`, `public/art/turrets`, `public/art/bases`; `gen_unit_manifest.mjs` → `unitSheets.gen.ts`; `visuals/backdrops/*`, `visuals/effects/*` | None | XL (~50 agent hours units, ~10 turrets, ~12 bases and backdrops, ~10 effects) |
| 4. Balance and economy | A2.14 rerun for 8 ages, per-card deltas for 39 new cards, has-an-answer, power coverage, A6.9 economy sim (copies per stack) | Phase 3 tuning agent: `src/content/raw/*` numbers only; `tools/` runs; `docs/balance-log.md` | None (numbers only; goldens use the fixture) | M |

**Notes.**

- Step 1 touches files of many WPs at once; run it as one orchestrated phase with the usual requests in `docs/requests/`, as Phase 2a did.
- Step 2 is playable with procedural art; step 3 can follow age by age (Bronze first, since Short War uses it).
- Other sections to edit when merging A17: A1 (table rows on crossing time, ages, turret range share), A2.1, A2.2, A2.4, A2.5, A2.9 (scan band), A2.10, A2.12 (camera keys), A2.13, A2.14, A3, A5.1 (counts), A5.7 (Paratroopers clamp, new powers), A5.8 (titles), A6.3-A6.5, A6.7, A6.10, A8 (camera in beats), A9.2 (phone split, minimap), A11 (palettes, seam, bases, skyline), A12 (camera moments), A13 (sounds, arrangements, key changes, panning), A14, A16.9, A16.15, A16.17 (Season 3 "The Bronze Age" is absorbed), B3, B5, B16, D1 (the sixth-age line).

### A17.17 Risks

| Risk | Mitigation |
|---|---|
| A longer walk strengthens defence; Final Bells are already too common (PROGRESS: ~50% of Full War mirrors) | Walking ×1.25, Siege forced march ×1.2, turrets cover less of the lane; the A16.4 levers still apply and are measured on the new lane |
| Players miss fights while scrolled away | Auto-follow by default, the minimap, off-screen badges, the base button's hammer badge |
| Full War at ~8:30 feels long | Short War stays ~4:45 and Standard ~6:30; Full War is the chosen epic format; owner question 2 |
| Bigger units look soft on desktop; more pixels cost frame time | A sharper sheet tier at 1.8 px per lu, streamed per age; culling outside the view; a check on a real mid-range phone |
| Download size: 21 new unit sheets at the sharper tier | Sheets load per age as each side reaches it; the initial chunk stays under 3 MB; the 16 MB total warning is reviewed |
| Art volume for 39 cards, 3 bases, 3 backdrops is the largest cost | Step 1 first; step 3 age by age; procedural art keeps the game playable meanwhile |
| The collection grows 60%, so upgrades per card slow down | The economy sim sets copies per stack (A17.13) |
| "Bronze" is also a capsule tier and a foil name | UI always says "Bronze Age" for the age; ids are prefixed (`icon.age.bronze`, `capsuleTier.bronze`) |
| Half-step evolves feel smaller | Each evolve keeps the full A12 moment, a new arrangement and new cards; the P step is only one part of the thrill |

### A17.18 Open questions for the owner

1. **Lane length.** Try 2,000 lu with 25% faster walking first? (Recommended. 1,800 lu is the fallback if it feels too long.)
2. **Full War length.** Is a ~8:30 typical Full War (up to 10:45) fine, now that it holds all 8 ages?
3. **Conquest.** Keep Conquest in Full War (~8:30), or move it to Standard War (~6:30)?
4. **Auto camera.** On by default for everyone, with a setting to turn it off? (Recommended.)
5. **Upgrade pace.** With 60% more cards, keep today's time to max a card (more copies per capsule), or let collecting take longer? (Recommended: keep today's pace.)
6. **Later.** A "Late War" format that starts in the Industrial Age, for players who want lasers fast? (Not in this plan.)
