# Ageborn v1: definitive design document

Single source of truth for the v1 build. Version 1.0, 2026-09-27.

The document has four parts:

- **Part A:** game design.
- **Part B:** technical architecture.
- **Part C:** build plan for parallel agents.
- **Part D:** roadmap and risks.

**Conventions**

- "MUST" marks a hard requirement. "SHOULD" marks a default that may be tuned.
- Every number is a starting value. Numbers live in data files, and the headless balance sim (B12) checks them against the targets in A2.14 before anyone judges them by feel.
- Units:
  - lu = lane unit.
  - tick = 50 ms (20 Hz).
  - bp = basis points (10,000 = 100%).
  - P = age power scale.
  - L = card level.
- Card IDs are the snake_case slugs in the content tables (for example `spear_hunter`). Visual IDs are `unit.<slug>`, `turret.<slug>`, `power.<slug>`, `base.<age>`, `backdrop.<age>`, `proj.<name>` and `fx.<name>`. Sound IDs are listed in A13.

---

## 0. Proposal review and synthesis

### 0.1 Scores (1-5)

| Criterion | nostalgia-core | meta-collection | feel-and-ship |
|---|---|---|---|
| Fun (moment to moment and meta) | 4.5: queue, stance, split-age lane, Last Stand, strong evolve beat | 4.0: deepest deck and meta layer, but no training queue and a scrolling camera weaken the classic feel | 4.0: excellent juice spec; evolve gold cost adds tension; loses air and a fifth age |
| Fidelity to brief (Stone to Future, cases, decks per age, skins, bots, swappable art) | 5.0 | 4.0: replaces the Modern age with Bronze and adds systems the brief did not ask for | 3.5: 4 ages, no air, 4 specials |
| Clarity and precision (implementable numbers) | 5.0: every card has full stats, archetype baselines are consistent, flows are exact | 4.0: full tables, but the damage-type matrix and supply rules add ambiguity | 4.5: very clear, with good juice and bot parameter tables |
| Feasibility of a fully working polished v1 by AI agents | 3.5: 55 cards and 27 skins on 5 shared rigs is a lot, but it is data-driven | 2.5: 70 cards, 33 skins, relic shop, star levels, 40 achievements, 12 generals, 4 formats | 4.5: 40 cards and 6 rigs, frozen scope |
| Extensibility (online, art swap, new ages) | 4.5 | 4.5 | 4.0 |
| **Total (of 25)** | **22.5** | **19.0** | **20.5** |

### 0.2 Decision

The backbone is **nostalgia-core**. It fits the brief best, and its numbers are internally consistent: flat role prices, stats scaled by P, and a base HP that scales with P so that time-to-kill stays the same in every age.

The following ideas are grafted in:

| From | Graft | Where |
|---|---|---|
| meta-collection | Match formats (Short War 3 ages, Standard 4 ages, Full War 5 ages), gated by arena, so new players get short matches first | A2.10, A6.3 |
| meta-collection | Time Capsule tier drawn from a 100-slot shuffle bag (exactly 50/28/15/5/2 per 100), which is honest and low-variance | A6.4 |
| meta-collection | New-card protection, a scripted first Legendary walkout (Mammoth Matriarch at capsule 10), Age Unlock Capsules | A6.5, A8 |
| meta-collection | Deck advisor warnings, "Scouted" strip of opponent cards, "Echo of You" mirror bot, Legendaries take 50% power damage | A4, A7, A2.9 |
| meta-collection | Age Power charge carries over an evolve, capped at 50% (a middle ground between reset and full carry) | A2.4 |
| feel-and-ship | Event-by-event juice table, "soft single file" spacing plus two-wide front rank, targeting priorities, support units that follow the front | A12, A2.7 |
| feel-and-ship | Bot "attack clock" (never stall), counter-hint rules, local instrumentation log, skin silhouette parity check | A7, A8, A11 |
| feel-and-ship | Strict v1 scope discipline: achievements, campaign, clip mode and a sixth age move to v1.x | Part D |
| Brief | Save lives in localStorage with a versioned schema and migrations (IndexedDB is deferred behind the same interface) | B8 |

Also changed from the backbone:

- **Melee ranges shortened.** Melee is 12-20 lu so fighters visibly touch; reach is 55-70 lu. Range is always measured edge to edge.
- **Simpler repo.** A single npm package with folder layering replaces the pnpm multi-package workspace. It means fewer tooling failures for agents; the layering is still enforced by lint.
- **Starter kit changed.** It holds every common plus each age's Anti-armor Rare (granted by script and Age Unlock Capsules). A new player therefore always has a full counter triangle.

---

# Part A. Game design

## A1. Vision and pillars

**Working title: Ageborn.** Tagline: "From clubs to lasers in one battle."

Ageborn is a one-lane tug-of-war battler. Two bases face each other, warriors walk and fight on their own, and turrets sit on the base. XP pushes you into the next age, and one big Age Power fires per age. Around the battle sits a Clash Royale-style meta:

- a War Plan (one loadout per age)
- a collection with rarities
- Time Capsules with an exciting, honest reveal
- upgrades, skins and a Trophy Road

No real money exists anywhere in the game.

Before public use, the name needs a TMview (EUIPO/USPTO) and domain check. "Age of War" never appears in the title, tags or keywords.

**Pillars (priority order)**

1. **Familiar in 10 seconds.** Tap a card and a warrior walks out and fights. Match one asks for nothing new.
2. **Evolving is the best moment of every match.** It brings a big visual transformation, a clear power spike and a music key change.
3. **A decision every 5-10 seconds.** Which unit, save or spend, turret or army, evolve now or fire the power first.
4. **Honesty.** Bots follow the player's rules and are labeled AI. Capsule odds and pity counters are always visible. Nothing is for sale.
5. **Readable chaos.** Juice scales with how much an event matters, and it never hides the state of the lane.

A sixth, technical pillar: art, sound and balance are data. The simulation owns all timing, so swapping art can never change balance.

**What we keep and what we fix from the classics**

| Classic element | v1 decision |
|---|---|
| One lane, two bases, tap only | Keep |
| Units walk and fight automatically | Keep, plus a Charge/Hold stance |
| XP to evolve through 5 ages | Keep: Stone, Medieval, Gunpowder, Modern, Future |
| Training queue of 5 | Keep |
| 4 turret slots, 50% sell refund | Keep. Range capped at 480 lu (40% of the lane); turrets never hit bases |
| Kill bounty 130% of cost (AoW1) | 60% of cost |
| XP when your own unit dies | Keep at 40% of cost |
| Free special on a cooldown | Keep as a charge meter; it never costs XP |
| Unit prices inflating 15 → 150,000 | Flat prices by role; power comes from age and card level |
| AI with free gold and timer evolution | Bots use the same economy and the same command API |
| Turtling, AFK farming, 40-minute stalemates | Match clock with Overdrive, Siege and Final Bell; XP from base damage; turret caps |
| Queued units idle behind the front | Two-wide melee front rank; reach and ranged units attack from behind |
| Slow walking, no pause, mute or save | ~17 s lane crossing, 1x/1.5x/2x speed, pause, 4 volume buses, autosave plus export |
| Flashing evolve reminder | Steady glow only |
| Army of Ages wiping units on evolve | Units and turrets survive evolving |

## A2. Core battle rules

### A2.1 Lane, coordinates, camera

- **Lane.** 1,200 lu from the left gate (world x = 0) to the right gate (x = 1,200).
  - The player (side 0) is on the left, faces right and plays blue. The opponent (side 1) is on the right, faces left and plays orange.
  - Each base occupies 140 lu behind its gate, outside the fighting area.
- **Progress.** Each side measures progress p from its own gate: side 0 has p = x, side 1 has p = 1,200 - x. Rules below use p unless stated.
- **Key positions:**
  - spawn at p = 20
  - hold line at p = 420
  - turret range cap 480 lu, measured from the own gate
  - mid-lane at p = 600
  - power zone centres clamped to p ∈ [150, 1,050]
- **Crossing time.** Speeds run 35-100 lu/s. Standard infantry (70 lu/s) crosses in ~17 s.
- **Camera.**
  - The whole world (1,200 lu lane plus both bases plus a 40 lu margin, 1,560 lu) fits the lane band of the screen by default. There is no scrolling.
  - On screens narrower than 900 CSS px, a pinch zooms up to 1.6x with a camera that follows the midpoint of the two front lines (lerp k = 0.08 per frame at 60 fps, scaled by dt). A double tap resets it.
- **Screen layout (landscape, v1 is landscape only):** top bar 9% of height, lane band 67%, bottom tray 24%. Portrait shows a "Rotate your device" overlay.
- **Depth.** The sim is 1D. The view gives each unit a y offset (the two front-rank units get -6 and +6 lu; the others get a cosmetic `hash(id) % 13 - 6`) and depth-sorts by y.

### A2.2 Bases and the age power scale

| Age index | Age | P | P (bp) | Base max HP |
|---|---|---|---|---|
| 0 | Stone | 1.00 | 10,000 | 1,500 |
| 1 | Medieval | 1.35 | 13,500 | 2,025 |
| 2 | Gunpowder | 1.82 | 18,200 | 2,730 |
| 3 | Modern | 2.46 | 24,600 | 3,690 |
| 4 | Future | 3.32 | 33,200 | 4,980 |

- P is already baked into every card stat in A5 (tables list final level-1 values for their age).
- Base max HP follows the owner's current age.
- On evolve the base keeps its HP percentage and then heals 5% of the new max, capped at max.
- An age-N unit beats its age N-1 counterpart one-on-one with about half its HP left. A same-gold army is ~1.8x stronger: a real edge that turrets and the defender's short walk can hold for 20-40 s.
- Bases do not attack, except Last Stand (A2.11).

### A2.3 Gold (in battle)

Gold and XP are stored internally in milli-units.

| Rule | Value |
|---|---|
| Starting gold | 175 |
| Passive income | 6 gold/s |
| Treasury upgrade | 3 levels, each +2 gold/s; costs 150 / 250 / 400 (payback 75 / 125 / 200 s). The art changes per age (gatherers, farm, trade cart, factory, fusion core); the numbers do not |
| Kill bounty | 60% of victim's card cost, credited to the killing side (units, turrets, powers, Last Stand) |
| Underdog bounty | +50% gold and XP when the victim's card age index is higher than the killer side's current age index |
| Summoned units (riders, paratroopers) | Bounty from their own card cost |
| Unit and turret prices | Flat across ages (A5) |
| Turret sell refund | 50% of turret cost (slot purchases are never refunded) |
| Turret slots | Mount 1 free; mounts 2 / 3 / 4 cost 150 / 350 / 700 |

### A2.4 XP and evolving

| XP source | Value |
|---|---|
| Passive trickle | 4 XP/s |
| Killing an enemy unit | 100% of its card cost (+50% underdog) |
| Losing your own unit | 40% of its card cost |
| Damaging the enemy base | 12 XP per 1% of that base's current max HP (XP = damage × 1,200 / maxHp) |

- **Thresholds.** Medieval 900, Gunpowder 1,100, Modern 1,350, Future 1,650. Excess XP carries over.
- **Expected timing.** In active play ~16 XP/s, so evolutions land near 0:55, 2:05, 3:30 and 5:10. Passive XP alone reaches Medieval at 3:45, so nobody is frozen in an age.
- **Evolve command:**
  - Valid when XP ≥ threshold, current age < the format's max age, and not already ascending.
  - A 2.5 s Ascension (50 ticks) follows. The training timer pauses and turrets keep firing.
  - At the end: age +1, XP −= threshold, base HP rescaled (A2.2).
  - Age Power charge becomes min(charge, 50%).
  - The tray swaps to the new age's loadout. Queued units keep their original card.
- **Units and turrets already built are unchanged.** Old turrets keep their original stats.
- **Final age of the format.** XP turns into Overcharge: every 400 XP is consumed and adds +25% Age Power charge.
- **Visibility.** Both XP bars (with age icons) are always visible, so the evolve race is part of the show. The Evolve button glows steadily when ready and never flashes.

### A2.5 Ages in v1

| Age | New mechanic introduced |
|---|---|
| Stone | Basics: melee, ranged, heavy, knockback, first-hit charges |
| Medieval | Reach (second-rank attacks), shields, siege damage to bases |
| Gunpowder | Splash artillery, the Mech tag, first Air unit (Legendary bomber) |
| Modern | Air as a regular option, marking, called strikes |
| Future | Energy shields, EMP stuns, time control |

Ages are data. A sixth age (Bronze/Antiquity between Stone and Medieval) is planned for v1.x and MUST require only content, visuals and audio entries.

### A2.6 Roles, tags and damage modifiers

**Tags:** `light`, `armored`, `bio`, `mech`, `ground`, `air`, `legendary`, `support`, `ranged`, `melee`.

**Roles:** Infantry, Ranged, Heavy, Anti-armor (AA), Support, plus Epic and Legendary specialists.

Each attack carries an ordered `mods` list. The **first** mod whose tag the target has applies; otherwise the multiplier is ×1.0. Role defaults:

| Attacker role / attack | Mods (in order) |
|---|---|
| Infantry melee ("blunt") | armored ×0.70 |
| Anti-armor | armored ×2.0, mech ×2.0, light ×0.75 (Grenadier: armored ×1.5, mech ×1.5, light ×0.75) |
| Everything else | none (×1.0) |
| Flak Gun | air ×2.0 |
| Congreve Rack | air ×1.5 |

Other rules:

- Melee attacks cannot hit Air.
- Every attack with range ≥ 100, and every turret, can hit Air unless the tables say "ground only".

**Counter triangle:**

- Heavy beats Infantry (armor).
- Anti-armor beats Heavy.
- Infantry beats Anti-armor (cheap, and takes only ×0.75).
- Ranged supports everything but dies fast once reached.
- Splash punishes clumps. Air punishes melee-only armies.

Every card detail screen shows "Strong vs" and "Weak vs".

### A2.7 Combat rules (simulation level)

**Sizes (collision width).** small 24, medium 32, large 48, huge 80 lu.

Edge distance between two entities = |xA − xB| − (wA + wB)/2, minimum 0. All ranges are edge distances. Range to a base is the edge distance from the unit to the enemy gate.

**Movement (ground):**

- A unit advances at its speed unless it has a valid target in range.
- A unit cannot overlap the nearest **enemy** ground unit ahead of it (it stops at edge distance 0).
- **Soft single file with a two-wide front.** Sort a side's ground units by p, highest first. Unit 1 and unit 2 form the front rank: unit 2 may walk up to unit 1's position. From unit 3 on, a unit may not come closer than (wA + wB) × 0.3 centre to centre behind the ally directly ahead.
  - The result: two melee units fight side by side, and reach units (range ≥ 55) hit from the third position.
- **Support followers.** Units with the `followSupport` ability never advance beyond (frontmost friendly ground p − 60 lu).

**Air units:**

- They ignore all blocking and fly at their speed.
- Gunships stop when a valid target is in range.
- The bomber never stops. It drops bombs every interval if any ground enemy is within ±40 lu of its x, and stops only at the enemy gate to bomb the base.
- Air units are immune to knockback.

**Stance (per side, 2 s toggle cooldown):**

- **Charge** (default): advance.
- **Hold:** units with p > 420 that have no target in range walk back to 420 at 70% speed. Units at or below 420 do not advance past it. Engaged units keep fighting. Air units obey stance.

**Targeting (sticky):**

- A unit keeps its target until the target dies, leaves range (+20 lu leash) or becomes unhittable.
- Candidates are enemy units in range that the attack can hit (either direction). The enemy base is a candidate only when no unit candidate exists.
- Priority:
  - `front`: minimum edge distance, ties to the lower id.
  - `armored`: armored or mech first, then front.
  - `backline`: ranged or support first.
  - `air`: air first.
  - `densest`: the x that maximises summed enemy cost within the splash radius, scanned in 10 lu steps.
- Turrets use `front` measured from their own gate (the enemy with the highest p toward us) unless the table says otherwise.

**Attack cycle:**

1. When a target is valid and `tick ≥ nextAttack`, the attack starts:
   - `impactTick = tick + windup`, where windup = round(interval × windupPct).
   - Melee windupPct 40%, ranged 50%, turrets 0%.
   - `nextAttack = tick + interval` (interval scaled by attack speed buffs).
2. At impactTick, if the target is still valid:
   - Melee damage applies.
   - A ranged or turret attack spawns a projectile.
3. Otherwise the attack whiffs and the cooldown is still spent.

**Projectiles:**

- Travel ticks = ceil(distance / speed / 0.05). `instant` means impact on the next tick.
- Single-target projectiles home and never miss (they hit if the target is alive on the impact tick).
- Splash projectiles aim at the target's x at fire time and hit every valid enemy whose centre lies within the radius at impact.
- Pierce hits the first N enemies within the pierce length, starting at the target. Chain hops to the nearest unhit enemy within hop range.

**Damage formula (integer, basis points, trunc at the end, minimum 1):**

damage = base × levelMult × typeMod × attackerDamageBuffs × (mark ? 1.2 : 1) × phaseMods × (legendary target and source is power or Last Stand ? 0.5 : 1)

- Damage is absorbed by a temporary shield first, then an innate shield, then HP.
- `phaseMods`: turret damage ×0.5 in Siege; damage to bases ×2 in Siege.
- Damage applies immediately in entity-id order. A unit reaching 0 HP is marked dying, takes no further actions that tick, and is removed in the death step.

**Knockback:**

- p −= knockback × (100 − resist) / 100, clamped at the unit's own gate (p ≥ 0).
- Resist values: small and medium 0%, large and huge 50%, Brace 100%, Air 100%.
- Knockback cancels a pending windup.

**First-hit bonus.** "First hit of each engagement" means the first attack started after ≥ 2 s without attacking. Brace units ignore attackers' first-hit bonuses.

**Status effects:**

| Status | Effect |
|---|---|
| stun | No movement, no attack starts; a pending windup is cancelled |
| slow | Move speed × (1 − s) |
| timeSlow | Move and attack interval |
| mark | +20% damage taken |
| shield | Temporary HP pool |
| damageBuff, speedBuff, attackSpeedBuff | As named |

Status rules:

- Reapplying the same status refreshes the duration and keeps the stronger magnitude.
- Different statuses coexist.
- Auras never stack: the strongest applies.
- Shields: a new shield sets pool = max(current, new) with the later expiry.

**Heal.** A heal pulses every 0.5 s to the N allies with the lowest HP% within radius (full-HP units excluded). It never exceeds max HP.

**Training:**

- One shared queue of 5. Gold is paid on enqueue.
- `cancelTrain` removes the last queued item with a full refund.
- The head item trains for its train time. On completion it spawns at p = 20 if pop + unit pop ≤ 20; otherwise it waits at 100% and its card shows "ARMY FULL".
- Train times: Infantry 1.5 s, Ranged 2.0 s, AA 2.5 s, Support 3.0 s, Heavy and Epic 4.0 s, Legendary 7.0 s.

**Population cap.** 20 per side. Pop is 1 for Infantry, Ranged, AA and Support; 2 for Heavy and Epic; 3 for Legendary. Summoned riders and paratroopers do not count. The HUD shows "Army 14/20".

**Legendary limit.** At most one Legendary alive **or** queued per side. The card shows "LEGENDARY IN FIELD".

### A2.8 Turrets

- **Building.** Tap an empty mount, then pick one of the two turret cards in the current age loadout. Building takes 1 s (drop-in animation, no firing during it).
- **Selling.** Selling takes 1 s and refunds 50%.
- **Rules:**
  - Turrets are invulnerable.
  - They never target bases.
  - Range is measured from their own gate, capped at 480 lu.
  - Damage ×0.5 during Siege.
  - Turrets from older ages keep firing at their original stats. Rebuilding after an evolve is a gold decision.
- **Prices.** Flat by rarity: Commons 150 / 175, Rare 250, Epic 300. There are no Legendary turrets in v1.
- **Mounts.** 4 mounts stacked vertically on the base. The mount index is visual only.

### A2.9 Age Powers

- One power is equipped per age loadout (default or alternate).
- **Charge:**
  - 0 → 100% over 50 s (10 bp per tick); ×1.5 during Overdrive.
  - Capped at 50% across an evolve.
  - The opponent's charge ring is visible.
- **Casting:**
  - Tap to auto-aim (the `densest` scan over p 150-1,050) or drag to place.
  - A 1.0 s telegraph (ground marker plus sound) is visible to both sides.
  - The effect then plays out.
- **Limits:**
  - Powers hit units only, never bases or turrets.
  - Legendary units take 50% power damage.
  - Powers have no card levels.
- **Tuning target:** an average cast removes 60-100% of a same-age Light unit's HP and 15-35% of a Heavy's.

### A2.10 Match formats and clock

| Format | Ages | Overdrive | Siege | Final Bell | Retreat unlocks | Used in |
|---|---|---|---|---|---|---|
| Tutorial | Stone, Medieval | none | none | none | never | Onboarding match 1 |
| Short War | Stone to Gunpowder | 3:30 | 4:30 | 6:00 | 1:00 | Arena 1, Skirmish |
| Standard War | Stone to Modern | 4:45 | 6:00 | 7:30 | 1:00 | Arena 2, Daily Challenge, Skirmish |
| Full War | Stone to Future | 6:00 | 8:00 | 10:00 | 1:00 | Arena 3+, Skirmish |

| Phase | Effect |
|---|---|
| Regulation | Normal rules |
| Overdrive | Passive gold and passive XP ×2, Age Power charge ×1.5, faster music layer, gold frame pulse |
| Siege | Turret damage −50%, all damage to bases ×2, each base loses 0.5% of its max HP per second, siege bell, red vignette |
| Final Bell | Higher base HP% wins; a gap ≤ 0.5% (50 bp) is a draw |

**Wins:** destroy the enemy base (both destroyed on the same tick counts as a draw). Retreat counts as a loss.

| Classic exploit | Countermeasure |
|---|---|
| Turtling behind 4 turrets | Range cap, no base targeting, Siege halves turret damage, 60% bounty |
| Staying in the Stone Age to farm | Flat prices, bounty follows cost not age, underdog bonus is only 50% |
| Going AFK | Passive gold is small; the clock ends the match |
| Stuck in an age | Passive XP, XP from base damage and from losses |
| Endless fighting at the gate | Siege decay and ×2 base damage |
| Special every cooldown for free gold | Lower bounty, telegraph, 50% carry cap on evolve |

### A2.11 Comeback tools (visible and counterable)

- XP from your own losses (40% of cost).
- Underdog bounty (+50% gold and XP).
- Defender's advantage: short reinforcement walk plus turret cover.
- The 50% power carry cap, which stops a leader chaining specials across an evolve.
- **Last Stand (once per match):**
  - Unlocks when your base is at or below 25% HP.
  - Tap it: 1.0 s charge (horn, glow), then a volley hits every enemy unit (ground and air) within 450 lu of your gate for 200 × P(your current age) damage (Legendaries 50%) and knocks ground units back 80 lu.
  - If unused, it fires automatically at 10% HP.
  - The attacker can play around it by holding back.
- There is no hidden rubber-banding of any kind.

### A2.12 Player controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Train unit (4 cards) | Tap card | 1-4 |
| Cancel last queued | Right-click / long-press card | Backspace |
| Build turret | Tap mount, then a card | Q / W (next free mount) |
| Sell turret | Long-press mount, confirm | Shift + click |
| Buy mount | Tap the "+" mount | B |
| Treasury | Tap coin button | T |
| Evolve | Tap Evolve | E |
| Age Power | Tap = auto-aim, drag = place | Space (auto-aim) |
| Stance Charge/Hold | Tap flag | S |
| Last Stand | Tap when unlocked | L |
| Emote (6) | Emote button | none |
| Pause | Top-right button | P (never Esc) |
| Speed 1x / 1.5x / 2x | Button (all v1 modes) | F |

Speed and pause are allowed in every v1 mode because all opponents are AI. They are removed for PvP later. Default speed is 1x.

### A2.13 Expected match flow (Full War, two mid-tier players)

| Time | What typically happens |
|---|---|
| 0:00-0:10 | Both open with 2-3 units; first clash near mid-lane at ~0:09 |
| 0:30 | First turret; greedy players buy Treasury |
| 0:50 | Stone power ready; fired just before evolving |
| ~0:55 | Medieval |
| ~2:05 | Gunpowder; first Epics |
| ~3:30 | Modern; turret rebuilds; first Legendary pushes |
| ~5:10 | Future |
| 6:00 | Overdrive: big pushes |
| 6:30-8:30 | Most matches end |
| 8:00-10:00 | Siege; Final Bell is rare |

### A2.14 Balance targets (checked by the headless sim, B12)

| Metric | Target |
|---|---|
| Full War median length | 7:00; 80% between 5:00 and 9:00; < 3% reach Final Bell |
| Short War median | 4:30; < 3% reach Final Bell |
| First evolve | Median 55-75 s |
| Per-card win-rate delta vs archetype baseline | Within ±3 points (400 matches per matchup, equal levels) |
| Turret-heavy War Plan vs tier VII | Wins < 40% |
| First-mover advantage (side 0 vs side 1, mirrored) | 47-53% |
| Evolve timings | Within ±15 s of A2.4 |
| Turret damage per gold over 90 s | ≤ 1.3× the median same-age unit |

## A3. Deck rules: the War Plan

- **Structure.** A War Plan is five Age Loadouts, one per age. A loadout is exactly 4 unit slots, 2 turret slots and 1 Age Power, all from that age, all owned, with no duplicates.
- **Minimum to play:** 3 units and 1 turret per age used by the format. The starter kit always satisfies it.
- **Tray.** In battle all 4 unit cards of the current age are always available; there is no hand cycling. On evolve the cards flip over (300 ms) to the next loadout.
- **Scouted strip.** Each opponent card appears in a "Scouted" strip on the HUD the first time the opponent plays it. Nobody sees the full enemy plan in advance.
- **Starter kit** (owned from the first launch, all at start level):
  - every Common (3 units and 2 turrets per age)
  - each age's default Age Power
  - each age's Anti-armor Rare, granted as follows:
    - Spear Hunter: capsule 1
    - Pikeman and Grenadier: capsule 2
    - Bazooka Trooper: Age Unlock Capsule at Arena 2
    - Rail Gunner: Age Unlock Capsule at Arena 3

  Until an AA Rare is granted, that loadout plays with 3 units. Skirmish shows a note on that age.
- **Chase cards** (from capsules): per age, the Support Rare, the Rare turret, the Epic unit, the Epic turret and the Legendary unit. Alternate Age Powers come from Trophy Road arenas 2-6.
- **Presets and helpers:**
  - 3 War Plan presets, each renamable.
  - Auto-fill picks the highest-level card per slot while keeping at least one Heavy or Legendary, one Ranged and one AA per age, plus an air-hitter from Gunpowder on.
  - The builder shows each loadout's average level and the War Plan average (over the ages the next format uses).
- **Deck advisor.** Warnings, never blockers:
  - "Stone has no anti-armor"
  - "Modern cannot hit air" (no ranged unit, no air-hitting turret)
  - "Medieval has only 3 units"
  - "No splash anywhere: swarms will hurt"
- **Rarity is a sidegrade.** At equal level, Rare, Epic and Legendary cards are more specialised, not more efficient. Balance rule: ±3 win-rate points versus archetype baseline.
- **Unlock order.** Match 1 uses 2 Stone cards and then 2 Medieval cards. Match 2 uses the full Short War starter plan. The War Plan screen opens after match 3.

## A4. (Reserved: formats are in A2.10)

## A5. v1 content

### A5.1 Conventions and archetype baselines (P = 1, level 1)

- Actual stat = table value × (10,000 + 500 × (L − 1)) / 10,000, truncated. That is +5% per level, additive; L10 = +45%.
- Level scaling applies to HP, damage, heals, shields and ability damage. It never applies to cost, speed, range, intervals, durations or powers.
- Start levels: Common 1, Rare 2, Epic 4, Legendary 6. Max level 10.
- Killer bounty = 60% cost in gold and 100% cost in XP. The owner gets 40% cost in XP on death.

| Archetype | Cost | Train | Pop | HP | Damage / interval | DPS | Range | Speed | Size |
|---|---|---|---|---|---|---|---|---|---|
| Infantry | 50 | 1.5 s | 1 | 160 | 20 / 1.0 s | 20 | 12 | 70 | small |
| Ranged | 75 | 2.0 s | 1 | 95 | 18 / 1.4 s | 12.9 | 200 | 65 | small |
| Heavy | 150 | 4.0 s | 2 | 560 | 42 / 1.5 s | 28 | 16 | 55 | large |
| Anti-armor | 100 | 2.5 s | 1 | 200 | 26 / 1.2 s | 21.7 | 60 | 70 | medium |
| Support | 110 | 3.0 s | 1 | 130 | heal 30/s or aura | - | 150 | 65 | small |
| Epic | 200 | 4.0 s | 2 | varies | varies | - | - | - | varies |
| Legendary | 350 | 7.0 s | 3 | ~3× Heavy | ~1.5-2× Heavy DPS plus a trait | - | - | - | huge |

**Collection:** 35 units + 20 turrets = 55 cards (25 Common, 15 Rare, 10 Epic, 5 Legendary), plus 10 Age Powers (Trophy Road, not capsules) and 27 skins.

**Default projectile speeds (lu/s):** rock 500, arrow 650, musket 1,500, bullet 1,500, shell 1,200, rocket 900, arc/lob 450, plasma bolt 1,800. Lasers and rails are instant.

Table key: C/R/E/L = rarity; S/M/L/H = size; "Blunt" = armored ×0.70; "AA mods" = armored ×2.0, mech ×2.0, light ×0.75; "air" = hits air.

### A5.2 Stone Age (P 1.00)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bonker | Bonker | C | Infantry | 50 | 160 | 20 / 1.0 s | 12 | 70 | S | light bio melee | Blunt |
| pebbler | Pebbler | C | Ranged | 75 | 95 | 18 / 1.4 s | 200 | 65 | S | light bio ranged | Rock projectile; air |
| tuskback | Tuskback | C | Heavy | 150 | 560 | 42 / 1.5 s | 16 | 55 | L | armored bio melee | Gore: first hit of each engagement ×2 and 30 lu knockback |
| spear_hunter | Spear Hunter | R | Anti-armor | 100 | 200 | 26 / 1.2 s | 60 | 70 | M | light bio melee | Reach; AA mods; priority armored |
| drum_shaman | Drum Shaman | R | Support | 110 | 130 | 8 / 1.2 s | 150 | 65 | S | light bio support ranged | Aura: allies within 160 lu get +20% attack speed; followSupport; air |
| sabertooth | Sabertooth | E | Skirmisher | 200 | 380 | 34 / 0.8 s | 12 | 100 | M | light bio melee | Pounce (10 s cooldown): when blocked by an enemy ground unit, leaps (0.5 s, untargetable by melee) to just in front of the nearest enemy ranged or support unit within 150 lu beyond the blocker; first bite ×2 |
| mammoth_matriarch | Mammoth Matriarch | L | Siege heavy | 350 | 1,700 | 60 splash r60 / 2.0 s | 20 | 40 | H | armored bio melee legendary | Two riders each shoot 12 / 1.4 s at range 200 (air); on death the riders jump off as 2 Pebblers (summoned, no pop) |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Notes |
|---|---|---|---|---|---|---|
| rock_tosser | Rock Tosser | C | 150 | 30 / 1.5 s | 360 | Single target, arc; air |
| angry_beehive | Angry Beehive | C | 175 | 5 / 0.2 s | 220 | Bee stream, high chip DPS, short range; air. Our comic signature turret |
| log_roller | Log Roller | R | 250 | 45 / 4.0 s | 300 | Rolls a log hitting every ground enemy with p ≤ 300 from your gate |
| grumpy_toad | Grumpy Toad | E | 300 | 40 / 6.0 s | 420 | Tongue grabs the nearest enemy ranged or support unit in range (else the frontmost small or medium unit) and drags it 120 lu toward your gate, no further than the enemy's frontmost ground unit |

### A5.3 Medieval Age (P 1.35)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|
| footman | Footman | C | Infantry | 50 | 216 | 27 / 1.0 s | 12 | 70 | S | light bio melee | Blunt |
| longbowman | Longbowman | C | Ranged | 75 | 128 | 24 / 1.4 s | 230 | 65 | S | light bio ranged | Arrow; air |
| destrier_knight | Destrier Knight | C | Heavy | 150 | 756 | 57 / 1.5 s | 16 | 60 | L | armored bio melee | Lance charge: first hit ×2 and 30 lu knockback |
| pikeman | Pikeman | R | Anti-armor | 100 | 270 | 35 / 1.2 s | 70 | 70 | M | light bio melee | Reach; AA mods; priority armored; Brace (immune to knockback and to first-hit bonuses) |
| friar | Friar | R | Support | 110 | 175 | 11 / 1.2 s | 150 | 65 | S | light bio support ranged | Heals 40 HP/s split between the 2 most-damaged allies within 160 lu; followSupport; air |
| battering_ram | Battering Ram | E | Siege | 200 | 1,000 | 160 vs base / 2.0 s (10 vs units) | 12 | 45 | L | armored mech melee | siegeOnly: targets the base; attacks units only while blocked |
| ursa_paladin | Ursa Paladin | L | Siege heavy | 350 | 2,300 | 70 / 1.4 s, cleave | 20 | 55 | H | armored bio melee legendary | Cleave: also hits 1 enemy within 40 lu behind the target. Roar every 12 s: allies within 200 lu get an 80 HP shield for 6 s |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Notes |
|---|---|---|---|---|---|---|
| crossbow_nest | Crossbow Nest | C | 150 | 40 / 1.5 s | 380 | Single target; air |
| pitch_cauldron | Pitch Cauldron | C | 175 | 20 / 0.5 s | 130 | Hits every ground enemy within 130 lu of your gate |
| trebuchet | Trebuchet | R | 250 | 110 splash r50 / 4.5 s | 480 (min 150) | Arc; ground only |
| honk_ballista | Honk Ballista | E | 300 | 45 / 3.5 s | 400 | Goose bounces to 3 targets (each ≤ 80 lu from the previous); 30% slow for 2 s; air |

### A5.4 Gunpowder Age (P 1.82)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|
| corsair | Corsair | C | Infantry | 50 | 291 | 36 / 1.0 s | 12 | 72 | S | light bio melee | Blunt |
| fusilier | Fusilier | C | Ranged | 75 | 173 | 47 / 2.0 s | 240 | 65 | S | light bio ranged | Musket; air |
| cuirassier | Cuirassier | C | Heavy | 150 | 1,019 | 76 / 1.5 s | 16 | 60 | L | armored bio melee | Charge: first hit ×2 and 30 lu knockback |
| grenadier | Grenadier | R | Anti-armor | 100 | 364 | 70 splash r35 / 1.8 s | 150 | 68 | M | light bio ranged | Lob over allies; armored ×1.5, mech ×1.5, light ×0.75; ground only |
| field_surgeon | Field Surgeon | R | Support | 110 | 237 | 15 / 1.2 s | 150 | 65 | S | light bio support ranged | Heals 55 HP/s split between 2 most-damaged allies within 160 lu; followSupport; air |
| bronze_cannon | Bronze Cannon | E | Artillery | 200 | 500 | 130 splash r60 / 3.5 s | 320 (min 80) | 45 | L | light mech ranged | Arc; ground only |
| balloon_admiral | Balloon Admiral | L | Air bomber | 350 | 1,500 | 110 splash r50 / 1.6 s | bombs below (±40 lu) | 45 | H | air legendary | Bomber; on death crashes for 250 splash r70 on ground enemies |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Notes |
|---|---|---|---|---|---|---|
| swivel_gun | Swivel Gun | C | 150 | 22 / 0.6 s | 340 | Single target; air |
| grapeshot_gun | Grapeshot Gun | C | 175 | 50 / 2.0 s | 220 | Hits the frontmost enemy in range and every enemy within 90 lu behind it; air |
| congreve_rack | Congreve Rack | R | 250 | 4 rockets × 55 splash r30 / 5.0 s | 460 | Scatter ±40 lu (sim RNG); air ×1.5; air |
| chainshot_cannon | Chainshot Cannon | E | 300 | 75 / 4.0 s | 400 | Pierces the first 4 enemies within 200 lu starting at the frontmost; ground only |

### A5.5 Modern Age (P 2.46)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|
| trench_raider | Trench Raider | C | Infantry | 50 | 394 | 49 / 1.0 s | 12 | 75 | S | light bio melee | Blunt |
| rifleman | Rifleman | C | Ranged | 75 | 234 | 32 / 1.0 s | 260 | 65 | S | light bio ranged | Bullet; air |
| tankette | Tankette | C | Heavy | 150 | 1,378 | 104 / 1.5 s | 90 | 50 | L | armored mech ranged | Shell; ground only |
| bazooka_trooper | Bazooka Trooper | R | Anti-armor | 100 | 492 | 64 / 1.2 s | 200 | 65 | M | light bio ranged | Rocket; AA mods; priority armored; air |
| radio_operator | Radio Operator | R | Support | 110 | 320 | 20 / 1.2 s | 200 | 65 | S | light bio support ranged | Every 6 s calls a shell on the nearest enemy ground unit within 400 lu: lands after 1.0 s, 150 splash r50; followSupport; air |
| gyrocopter | Gyrocopter | E | Air gunship | 200 | 740 | 20 / 0.3 s | 150 | 80 | M | air mech | Hits ground and air |
| behemoth_tank | Behemoth Tank | L | Siege heavy | 350 | 4,100 | Main gun 200 splash r50 / 2.5 s (ground only) plus MG 20 / 0.4 s at range 150 (air) | 300 | 35 | H | armored mech legendary | Two independent attacks |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Notes |
|---|---|---|---|---|---|---|
| mg_nest | MG Nest | C | 150 | 15 / 0.3 s | 340 | Single target; air |
| flak_gun | Flak Gun | C | 175 | 60 splash r40 / 1.5 s | 420 | Air ×2.0; priority air |
| howitzer | Howitzer | R | 250 | 270 splash r60 / 5.0 s | 480 (min 180) | Arc; ground only |
| searchlight_sniper | Searchlight Sniper | E | 300 | 280 / 4.0 s | 480 | Priority armored; Mark: target takes +20% damage from all sources for 4 s; air |

### A5.6 Future Age (P 3.32)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|
| photon_knight | Photon Knight | C | Infantry | 50 | 470 (+90 shield) | 66 / 1.0 s | 12 | 75 | S | light bio melee | Blunt; innate shield 90, regenerates 30/s after 3 s without damage |
| pulse_trooper | Pulse Trooper | C | Ranged | 75 | 315 | 43 / 1.0 s | 260 | 65 | S | light bio ranged | Plasma bolt; air |
| walker_mech | Walker Mech | C | Heavy | 150 | 1,860 | 140 / 1.5 s | 60 | 50 | L | armored mech melee | Reach |
| rail_gunner | Rail Gunner | R | Anti-armor | 100 | 664 | 86 / 1.2 s | 280 | 65 | M | light bio ranged | Instant rail; pierces 2 within 150 lu; AA mods; priority armored; air |
| repair_drone | Repair Drone | R | Support | 110 | 430 | none | 160 | 70 | S | air mech support | Heals 100 HP/s split between 2 most-damaged allies within 160 lu; followSupport |
| emp_saboteur | EMP Saboteur | E | Anti-mech | 200 | 700 | 50 / 1.0 s | 12 | 85 | M | light bio melee | EMP every 8 s when an enemy is within 120 lu: mech enemies within 120 lu are stunned 1.5 s and all shields are stripped |
| chrono_titan | Chrono Titan | L | Siege heavy | 350 | 5,600 | 230 / 1.6 s, cleave 3 | 60 | 35 | H | armored mech melee legendary | Cleave hits up to 3 enemies within 60 lu. Time Stop on first contact and every 15 s: enemies within 200 lu frozen 1.5 s (Legendaries 0.75 s) |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Notes |
|---|---|---|---|---|---|---|
| pulse_laser | Pulse Laser | C | 150 | 20 / 0.3 s | 360 | Instant beam; air |
| arc_coil | Arc Coil | C | 175 | 60 / 1.8 s | 260 | Chains to 3 targets (each ≤ 100 lu from the previous); air |
| plasma_mortar | Plasma Mortar | R | 250 | 360 splash r60 / 5.0 s | 480 (min 180) | Arc; ground only |
| gravity_well | Gravity Well | E | 300 | 60 / 7.0 s | 400 | Priority densest. Ground enemies within 90 lu of impact are pulled 60% of the way to the centre and slowed 50% for 2.5 s |

### A5.7 Age Powers

All values are final numbers at that age's P. Every power has a 1.0 s telegraph first.

| Slug | Age | Type | Source | Effect |
|---|---|---|---|---|
| meteor_shower | Stone | Default | Starter | 14 meteors over 3.0 s across a 400 lu zone (evenly spaced, ±20 lu seeded jitter); each 70 damage, splash r40, ground only |
| stampede | Stone | Alternate | Arena 2 | 5 spirit aurochs, 0.4 s apart, run 500 lu forward at 400 lu/s from your frontmost unit (or p = 200); 50 damage and 40 lu knockback per hit; max 3 hits per enemy per cast; ground only |
| arrow_storm | Medieval | Default | Starter | 40 arrows over 2.5 s across 450 lu; each 40 damage, splash r20; hits air |
| royal_decree | Medieval | Alternate | Arena 3 | All your units get +30% damage and +25% move speed for 8 s (no zone) |
| broadside | Gunpowder | Default | Starter | 10 cannonballs over 3.0 s across 450 lu; each 120 damage, splash r45; ground only |
| smoke_screen | Gunpowder | Alternate | Arena 4 | 350 lu cloud for 7 s: enemy ranged and turret attacks fired from or into it miss 50% (sim RNG); your units inside deal +20% damage |
| carpet_bomber | Modern | Default | Starter | 12 bombs evenly along a 500 lu line over 1.5 s; each 240 damage, splash r50; ground only |
| paratroopers | Modern | Alternate | Arena 5 | 4 Riflemen at your Rifleman level land 150 lu beyond the enemy's frontmost ground unit (clamped to p ≤ 1,050); summoned, no pop |
| orbital_lance | Future | Default | Starter | A beam sweeps a 500 lu zone over 2.0 s, dealing 650 once to each enemy it touches (±20 lu); hits air |
| nanite_surge | Future | Alternate | Arena 6 | All your units heal 40% of max HP over 4 s and gain a 150 shield for 6 s (no zone) |

### A5.8 Skins

**Clarity parity (MUST).** A skin never changes silhouette, size, weapon type, team-colour zones, facing or stats. It may change:

- the palette outside team zones
- overlay parts
- the idle flourish
- the death prop
- attack effect colour
- sound overrides

The gallery test compares each skin's silhouette mask with the base visual and requires IoU ≥ 0.85.

| Slug | Skin | For | Rarity | Look |
|---|---|---|---|---|
| pumpkin_head | Pumpkin Head | bonker | Rare | Carved gourd helmet |
| punk_pebbler | Punk Pebbler | pebbler | Rare | Mohawk, spiked belt |
| woolly_tuskback | Woolly Tuskback | tuskback | Epic | Shaggy coat, frosty breath puffs |
| frost_matriarch | Frost Matriarch | mammoth_matriarch | Legendary | Ice tusks, snow aura |
| wasp_nest | Wasp Nest | angry_beehive | Rare | Striped paper nest |
| tin_can | Tin Can | footman | Rare | Dented bucket armour |
| jester_bow | Jester Bow | longbowman | Epic | Bell hat, confetti arrow trails |
| parade_knight | Parade Knight | destrier_knight | Epic | Plumes and ribbons |
| panda_paladin | Panda Paladin | ursa_paladin | Legendary | Panda mount, bamboo banner |
| cake_launcher | Cake Launcher | trebuchet | Epic | Lobs cakes (same hitbox) |
| ghost_corsair | Ghost Corsair | corsair | Epic | Translucent body with glow |
| toy_soldier | Toy Soldier | fusilier | Rare | Wind-up key on the back |
| brass_dragon | Brass Dragon | swivel_gun | Rare | Dragon-head muzzle |
| candy_balloon | Candy Balloon | balloon_admiral | Legendary | Striped candy envelope |
| arctic_rifleman | Arctic Rifleman | rifleman | Rare | Winter whites |
| sprinkle_camo | Sprinkle Camo | tankette | Epic | Ice-cream colours |
| shark_mouth | Shark Mouth | gyrocopter | Epic | Painted nose art |
| golden_behemoth | Golden Behemoth | behemoth_tank | Mythic | Gold plating, coin sparks |
| synthwave | Synthwave | photon_knight | Epic | Neon grid visor |
| kaiju_walker | Kaiju Walker | walker_mech | Legendary | Dinosaur-head plating |
| clockwork_titan | Clockwork Titan | chrono_titan | Mythic | Brass gears, ticking sound layer |
| disco_laser | Disco Laser | pulse_laser | Legendary | Rainbow beam |
| cozy_cave | Cozy Cave | base.stone | Rare | Hanging laundry, chimney |
| candy_keep | Candy Keep | base.medieval | Epic | Gingerbread walls |
| pirate_fort | Pirate Fort | base.gunpowder | Epic | Jolly flags, figurehead |
| bunker_9 | Bunker 9 | base.modern | Rare | Stencils, sandbags |
| crystal_spire | Crystal Spire | base.future | Legendary | Faceted glass, prism glints (Arena 8 reward) |

Counts: 9 Rare, 10 Epic, 6 Legendary, 2 Mythic. Mythic drops only from Wardrobe Crates and Aeon capsules and can't be crafted.

**Other cosmetics:**

- **8 banners:** Tar Pit, Frostfang, Moat, Harbor, Barbed, Neon, Starfield, Rift. Each is the arena gate reward.
- **8 frames:** Collection Levels 5, 15, 25, 35, 45, 55, 65, 75.
- **12 titles:**

  | Title | Unlocked by |
  |---|---|
  | Recruit | start |
  | Firestarter | first win |
  | Evolver | first Future Age |
  | Mammoth Tamer | own Matriarch |
  | Collector | Collection Lv 10 |
  | Siege Scholar | Arena 4 |
  | Last Stander | win after your Last Stand |
  | Speedrunner | final age before 5:00 in Full War |
  | Veteran | 100 wins |
  | Curator | Collection Lv 40 |
  | Warden's Bane | beat The Warden |
  | Ageborn | Arena 8 |

- **6 emotes:** Laugh, Salute, Cry, Angry, Thumbs up, GG. There is no text chat anywhere.

## A6. Meta progression

### A6.1 Profile

- **Name.** Auto-generated ("Chief-4821"), editable any time, never required.
- **Look.** Procedural face avatar built from parts (or a portrait of any owned unit), banner, frame, title.
- **Stats:**
  - trophies (current and best) and arena
  - wins and losses by AI tier
  - favourite card (most trained)
  - collection % and Collection Level
  - fastest win
  - Future Age reached count
  - Legendaries owned
- **History.** Last 20 matches, each with a replay and an "AI" marker.
- No login and no account in v1.

### A6.2 Currencies (all earned; nothing is sold; no store, no payment code in the repo)

| Currency | Use | Sources |
|---|---|---|
| Gold | In battle only, resets each match | Income, bounties |
| Amber | Card upgrades | Capsules, wins, quests, Trophy Road, Collection Level |
| Copies (per card) | Upgrading that card | Capsules |
| Wild Shards (Rare / Epic / Legendary) | Count as one copy of any card of that rarity | Gold and Aeon capsules, Trophy Road, quests |
| Dust | Crafting specific cards and skins | Copies past max level, duplicate skins |
| Trophies | Ladder rank | Wins |
| Collection XP | Collection Level | Upgrades |

### A6.3 Trophies, arenas and match rewards

| Result | Trophies | Amber | Other |
|---|---|---|---|
| Win | +30 | 20, or 40 if no capsule charge | Win Capsule if a charge is available |
| Loss | −20 (0 below 400; never below the current arena gate) | 8 | none |
| Draw | 0 | 12 | none |

- **Capsule charges.** 4 per day, banking up to 12. Nothing expires.
- **Daily Capsule.** One every 24 h, banking up to 3.
- **Loss protection.** After 3 losses in a row, the next opponent is one tier lower and the VS screen says "Warm-up match".
- **Clock.** All timers use the local clock, capped by the banks. Tampering is accepted because no money is involved.

| # | Arena | Trophies | Format | Drop pool | Bot tiers | Gate rewards |
|---|---|---|---|---|---|---|
| 1 | Tar Pits | 0 | Short War | Ages 1-3, no random Legendaries | I-II | Starter War Plan |
| 2 | Frostfang Pass | 300 | Standard War | Ages 1-4, Legendaries on | II-III | Stampede, Age Unlock Capsule (Modern), banner, Gold Capsule |
| 3 | Kingsmoat | 700 | Full War | All | III-IV | Royal Decree, Age Unlock Capsule (Future), banner, Gold Capsule |
| 4 | Powder Bay | 1,200 | Full War | All | IV-V | Smoke Screen, banner, Gold Capsule |
| 5 | Iron Front | 1,800 | Full War | All | V-VI | Paratroopers, banner, Gold Capsule |
| 6 | Neon Harbor | 2,500 | Full War | All | VI-VII | Nanite Surge, banner, Gold Capsule |
| 7 | Orbital Ring | 3,300 | Full War | All | VII-VIII | Banner, Aeon Capsule |
| 8 | Chrono Rift | 4,200 | Full War | All | IX-X | The Warden rematches, Crystal Spire skin, banner, Aeon Capsule |

- An arena changes the ground and weather layer. Skyline layers still follow each player's age.
- **Trophy Road.** A node every 100 trophies from 100 to 4,500 (45 nodes):
  - Arena gate nodes give the gate rewards above.
  - Other multiples of 500 give a Silver Capsule (≤ 2,000) or a Gold Capsule (> 2,000).
  - The remaining nodes alternate between Amber (100 + 20 × trophies/100) and a Wild Shard (Rare below 1,500; Epic from 1,500, every other one).
- **Age Unlock Capsule:** that age's AA Rare, plus 4 copies of each of that age's 3 common units.

### A6.4 Time Capsules (card cases)

- **Pre-rolled.** The result is rolled the moment a capsule is granted and saved before any animation plays. The opening only reveals it.
- **Tier source.** Win Capsule tiers come from a 100-slot shuffle bag holding exactly 50 Clay, 28 Bronze, 15 Silver, 5 Gold and 2 Aeon, drawn without replacement and refilled when empty. The odds screen says: "Exactly 2 Aeon in every 100 Win Capsules."
- **Daily Capsule.** Rolls independently: Bronze 78%, Silver 15%, Gold 5%, Aeon 2%.
- **Scripted capsules** (A6.5) bypass the bag.

| Tier | Stacks | Total copies | Rare copies / stack | Epic copies / stack | Amber | Guarantees and extras |
|---|---|---|---|---|---|---|
| Clay | 2 | 4 | 1 | 1 | 60 | none |
| Bronze | 3 | 8 | 2 | 1 | 120 | ≥ 1 Rare stack |
| Silver | 4 | 16 | 3 | 1 | 300 | ≥ 2 Rare and ≥ 1 Epic stack |
| Gold | 5 | 36 | 5 | 2 | 800 | ≥ 2 Rare and ≥ 2 Epic stacks; 25% one stack becomes Legendary; +1 Rare Wild Shard |
| Aeon | 6 | 50 | 6 | 2 | 1,500 | 1 Legendary stack (unowned first), ≥ 2 Epic stacks; 30% chance of a skin (Wardrobe odds) |

**Roll algorithm (MUST be implemented exactly):**

1. Build the stack rarity list:
   1. Guaranteed rarities first.
   2. Remaining stacks roll Common 72%, Rare 22%, Epic 5%, Legendary 1%. In an arena without random Legendaries, Legendary moves to Common.
2. Apply pity (A6.5) by upgrading the lowest-rarity stack.
3. Copies:
   - Legendary stack = 1 copy.
   - Epic and Rare stacks use the per-tier numbers above.
   - Common stacks share what remains of the total evenly (remainder to the first).
   - If no Common stack exists, the total is the sum of the others.
4. Pick distinct cards per stack from the arena's drop pool of that rarity:
   - Unowned cards weigh ×3.
   - No duplicate Legendary until every Legendary in the pool is owned.
5. Owned cards at max level convert their copies to Dust at reveal time (shown on the card).

**Other capsule types:**

| Type | Source | Contents |
|---|---|---|
| Daily Capsule | Every 24 h | Tier table above; climb starts at Bronze |
| Trophy Road Capsule | Road nodes | Fixed tier, no climb (reveal starts at step 4) |
| Age Capsule | Quests, Daily Challenge | Silver-sized (16 copies, 4 stacks), all from an age you choose, ≥ 1 Epic stack |
| Age Unlock Capsule | Arena 2 and 3 gates | Fixed contents (A6.3) |
| Wardrobe Crate | Every 5 Collection Levels, weekly quest | 1 skin: Rare 80%, Epic 16%, Legendary 3.4%, Mythic 0.6%; no duplicate until all skins of that rarity are owned |

### A6.5 Pity, protection and the onboarding script (all counters visible on every capsule screen)

- **Epic pity:** at least one Epic stack every 10 capsules.
- **Legendary pity:** after 25 capsules without a Legendary, the Legendary chance per capsule rises by +5 percentage points (applied as "upgrade one stack to Legendary"). Capsule 40 guarantees one.
- **New-card protection:** at least one unowned card every 5 capsules while unowned cards exist in the pool.
- **Wardrobe pity:** Epic or better at least every 5 crates; Legendary or better at least every 25.

**Onboarding script (overrides the bag):**

| Capsule | Tier | Guaranteed contents |
|---|---|---|
| 1 | Bronze | Spear Hunter NEW |
| 2 | Silver | Pikeman NEW, Grenadier NEW |
| 3 | Bronze | Log Roller NEW |
| 5 | Silver | First Epic (random, unowned) |
| 10 | Aeon | Mammoth Matriarch, full walkout |

### A6.6 Upgrades and duplicates

All rarities share one level scale. Each level adds +5% HP, damage, heals and shields. Turrets level the same way. The level cap is fixed at 10 forever; the game grows sideways.

| To level | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Common copies | 2 | 4 | 8 | 12 | 20 | 30 | 45 | 65 | 90 | 276 |
| Rare copies | - | 2 | 4 | 6 | 10 | 15 | 22 | 30 | 40 | 129 |
| Epic copies | - | - | - | 2 | 3 | 5 | 7 | 10 | 14 | 41 |
| Legendary copies | - | - | - | - | - | 1 | 2 | 3 | 4 | 10 |
| Amber | 10 | 25 | 50 | 100 | 200 | 350 | 550 | 900 | 1,400 | 3,585 |

**Dust rates:**

| | Common | Rare | Epic | Legendary | Mythic |
|---|---|---|---|---|---|
| Card copy past L10 → Dust | 5 | 20 | 100 | 400 | - |
| Craft one card copy (also unlocks an unowned card) | 40 | 100 | 400 | 1,600 | - |
| Duplicate skin → Dust | - | 50 | 200 | 800 | 2,000 |
| Craft a skin | - | 200 | 800 | 3,000 | not craftable |

The upgrade itself is a reward moment: hammer slam, level count-up, stat bars growing, +Collection XP.

### A6.7 Collection Level and quests

- **Collection XP per upgrade:** +1 Common, +2 Rare, +4 Epic, +8 Legendary. A level takes 10 Collection XP (about 86 levels in total).
- **Level rewards:**
  - every level: 100 Amber
  - every 5th level: a Silver Capsule, alternating with a Wardrobe Crate
  - frames at 5, 15, 25 and onward
- **Daily quests.** 3 per day with 1 free reroll; they bank up to 6 unclaimed. Pool:

| Quest | Reward |
|---|---|
| Win 2 battles | 100 Amber |
| Play 3 battles | 100 Amber |
| Train 30 units | 100 Amber |
| Evolve 6 times | 100 Amber |
| Reach your format's final age before 5:30 (Full) or 3:00 (Short) | 150 Amber |
| Kill 20 units with turrets | 150 Amber |
| Win without buying Treasury | 150 Amber |
| Hit 5+ enemies with one Age Power | 150 Amber |
| Deal 3,000 damage to enemy bases | 100 Amber |
| Kill 5 Heavies with Anti-armor units | 150 Amber |
| Win with a Legendary in your War Plan (only offered if you own one) | 1 Rare Wild Shard |
| Destroy a base before 6:00 | 200 Amber |
| Win after using Last Stand | 200 Amber |
| Upgrade 2 cards | 100 Amber |
| Win a Daily Challenge | Age Capsule |

- **Weekly quest:** "Win 15 battles" → Wardrobe Crate and Age Capsule.

### A6.8 Matchmaking fairness (AI ladder)

- **Level target.** Bot level target = floor(player War Plan average level over the ages in the format).
  - The bot only fields cards whose rarity start level ≤ target + 1.
  - All bot cards play at max(start level, target).
  - If the bot's resulting average exceeds the player's, swap its highest-level card for a Common of the same role.
  - A new player therefore never meets Legendaries until their own average reaches ~5.
- **Tier choice.** Hidden MMR (Elo, K = 32, start 1,000) picks the AI tier inside the arena's band. Tier rating = 800 + 100 × tier (I = 900 … X = 1,800).
- **Standard levels.** Skirmish has a toggle that puts every card on both sides at L7.
- **Later PvP (designed now):** Ranked caps all cards at L8; the trophy ladder prefers opponents within ±1 average level.

### A6.9 Pacing check (engaged player: 4 charged wins, daily capsule, 3 quests)

| Measure | Value |
|---|---|
| Copies per capsule (expected) | 9.4 |
| Amber per capsule (expected) | ~180 |
| Daily income | ~47-55 copies and ~1,300 Amber |
| Common to max | ~6-7 months (~1.4 copies per card per day) |
| Epic to max | ~5 months |
| All 5 Legendaries | ~2-3 weeks (pity plus script) |
| Focused War Plan at L7-8 | ~6-8 weeks with Wild Shards |
| Whole collection maxed | ~6-8 months, with Amber and copies running out at about the same time |

A 365-day economy sim (B12) MUST confirm these figures within ±20% before release.

## A7. Bot opponents: AI Generals

### A7.1 Honesty rules (enforced in code)

- **Same rules.** Bots issue commands through the same `Command` API as the player: same gold, XP, prices, cooldowns and levels. No stat multipliers at any tier, and no timer-based evolving.
- **Same information.** Bots read only an `Observation`: the lane, both bases, turrets, both ages and XP percentages, both power charge rings, the Scouted strip and their own gold. They never see the player's gold or War Plan; they estimate gold from time and kills.
- **Disclosed modifiers.** Any Daily Challenge modifier is symmetric and shown on the VS screen.
- **Labeling:**
  - robot icon and "AI" chip on every nameplate
  - "AI General" on the VS screen
  - "Plays by the same rules as you" on the bot profile card
  - "AI" in match history
  - Settings > About: "All opponents in this version are AI."
  - Help text: "Opponent difficulty adapts to your recent results."

### A7.2 Decision model (utility AI)

- **Timing.** Every decision interval, the bot reads an observation from `tick − snapshotDelay` and scores every legal action:

| Action | Score |
|---|---|
| Train card | Counter value against enemies within 500 lu of its front, plus push value from the army-value ratio, plus personality weight, minus a saving-goal penalty |
| Build turret or buy mount | Pressure near own base × spare gold × turret bias |
| Treasury | Before 3:00, lane quiet, level < tier cap |
| Evolve | XP full and no enemy within 300 lu of own gate (greedy personalities ignore the second condition); delayed by the tier's evolve delay |
| Power | Enemy cost value in the best zone ≥ tier threshold, or own base under attack; aim error applied |
| Stance | Hold when army value < 0.7 × enemy's and ≥ 2 turrets built (tiers V+); otherwise Charge |
| Last Stand | ≥ 4 enemies within 450 lu |
| Emote | After a big trade or at the end; at most 1 per 20 s; muteable |

- **Saving goals.** "Bank 350 for a Legendary" or "bank for Treasury" pause training, so the player sees a lull before a push.
- **Choice.** With probability (1 − mistake rate) the bot takes the best action. Otherwise it picks a plausible human error from a list:
  - over-commit into turret range
  - evolve just before an enemy push
  - fire the power on 1-2 units
  - leave a mount empty
  - float gold
  - forget anti-air

  It never makes "computer-stupid" moves such as selling every turret.
- **Attack clock (never stall).** If none of the bot's ground units has passed mid-lane for 60 s, Charge and train scores rise 10% per 5 s until it pushes.
- **Openings.** Each personality has an opening build (first 3-4 actions) with seeded variation.
- **Determinism.** The bot RNG is seeded from `hash(matchSeed, side)`. Bot commands are recorded in the replay like human commands.

### A7.3 Tiers

| Tier | Decision interval | Snapshot delay | Mistake rate | Max actions / 10 s | Counter model | Evolve delay | Power aim error | Power threshold (enemy cost in zone) | Treasury max | Gold float target | Hold / turret rebuild |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I | 1.6 s | 900 ms | 35% | 3 | None (weighted random from its loadout) | 8 s | ±200 lu | 2+ enemies | 0 | 400 | no / no |
| III | 1.35 s | 770 ms | 25% | 5 | Reacts to the enemy front unit | 5 s | ±140 lu | 250 | 1 | 250 | no / no |
| V | 1.1 s | 640 ms | 16% | 7 | Counters the front 3 units | 3 s | ±90 lu | 350 | 2 | 180 | yes / yes |
| VII | 0.85 s | 510 ms | 9% | 9 | Full matrix, remembers composition | Safe window, ≤ 2 s | ±50 lu | 450 | 3 | 120 | yes / yes |
| X | 0.5 s | 300 ms | 3% | 12 | Full matrix plus predicts next enemy age | Safe window, ≤ 0.5 s | ±20 lu | 600, or clutch | 3 | 80 | yes / yes |

- Tiers II, IV, VI, VIII and IX interpolate linearly. No bot reacts faster than 300 ms.
- **Difficulty assignment:**
  - First 10 matches: shifted one tier down, targeting ~70% player win rate.
  - After that: target 50-55%.
  - Adaptation happens only between matches.

### A7.4 Generals

Personality weights (0-100) feed the scoring.

| General | Personality | Tiers | Aggr | Turret | Economy | Evolve greed | Power patience | Legendary | Hold | Signature | VS line |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Old Grogg | Tutorial trainer | Training | scripted | | | | | | | Barely attacks; base starts at 50% (disclosed "Training match") | "Grogg ready. Grogg nap first." |
| Pip Quickstep | Balanced beginner | I-II | 50 | 40 | 30 | 40 | 30 | 20 | 20 | Always opens Ranged then Infantry | "Ready when you are!" |
| Captain Kettle | Rusher | I-V | 90 | 15 | 10 | 20 | 20 | 30 | 0 | Infantry spam, all-in before each evolve | "Tea's getting cold. Charge!" |
| Mama Moss | Turtle | II-IV | 25 | 90 | 40 | 40 | 50 | 30 | 80 | Early turrets, Hold, pushes in Overdrive | "Nobody gets past my garden." |
| Baroness Ledger | Greedy evolver | III-VI | 40 | 40 | 95 | 95 | 40 | 40 | 40 | Treasury 3 by 1:30, evolves first, weak before 1:00 | "Money first. Manners later." |
| Sgt. Boomsworth | Artillery | IV-VII | 50 | 70 | 50 | 50 | 50 | 40 | 50 | Trebuchet, Bronze Cannon, Howitzer, Grenadier | "Stand still, please." |
| Ada & Ivo, "The Twins" | Balanced counters | V-VIII | 60 | 50 | 50 | 60 | 60 | 50 | 40 | Two portraits on one bot | "Two heads, one plan." |
| Rook | Counter-picker | VI-IX | 60 | 50 | 50 | 60 | 50 | 50 | 30 | Counter weight ×1.5, switches within seconds | "I see what you brought." |
| Madame Tempest | Power timing | VII-IX | 60 | 40 | 50 | 70 | 95 | 50 | 40 | Banks powers for evolve moments and clumps | "Wait for it..." |
| The Warden | All-round boss | X | 70 | 60 | 60 | 70 | 80 | 90 | 40 | Final boss of Arena 8, brings all five Legendaries | "Every age ends. Yours ends here." |
| Echo of You | Mirror | Any (Skirmish) | derived | | | | | | | Plays your own active War Plan with the Balanced brain | "Let's see how you like it." |

- **Procedural AI Commanders** fill the ladder between Generals.
  - Names come from syllable tables and always carry the prefix "AI · " (for example "AI · Brakka Stonejaw").
  - Each has a stable seeded profile: personality, favourite card, and a War Plan built from the pool under A6.8.
- **Readable intent.** Saving lulls, holding at the line, and a burst of spawns right after an evolve all telegraph the plan.

## A8. Onboarding: the first 10 minutes

On-screen text is at most 8 words. No menu, name prompt or account screen appears before the first win.

| Time | Beat | Text |
|---|---|---|
| 0:00 | Click Play. Load ≤ 3 s. Title screen is the live battlefield with one Play button | "Play" |
| 0:03 | Match 1 (Tutorial format) vs Old Grogg (AI, Training match: no clock, his base at 50%). Tray: Bonker only; the gold counter pulses when affordable | "Tap to send a Bonker" |
| 0:08 | First kill; "+30" flies to the gold counter | "Kills earn gold" |
| 0:20 | Pebbler card slides in | "Pebblers shoot over friends" |
| 0:40 | Grogg sends a Tuskback; a 150 gold gift appears and the empty mount pulses | "Build a Rock Tosser" |
| 0:55 | Tutorial XP (400) fills; Evolve glows steadily | "Evolve!" |
| 1:00 | Full Ascension show; tray flips to Footman and Longbowman; Grogg stays in the Stone Age for comedy | none |
| 1:25 | Arrow Storm ready; an animated hand drags it onto enemies | "Drag the arrows onto them" |
| ~2:10 | Grogg's base falls: slow motion, coins, staged rewards | none |
| 2:20 | Capsule 1: guided taps, scripted climb to Bronze, Spear Hunter NEW (short walkout); auto-equipped | "Tap to crack it" |
| 3:00 | Match 2: Short War vs Pip Quickstep (AI, tier I). Starter plan. At 0:20: "Treasury: more gold per second." Pip leans on Tuskbacks | "Heavies stop Bonkers. Try Spear Hunter." (adaptive) |
| ~7:30 | Win (a loss still gives rewards plus a retry). Capsule 2: Pikeman and Grenadier NEW. One forced upgrade: Bonker to L2 (hammer slam) | "+5% HP and damage" |
| 8:30 | Home appears: editable auto name, Trophy Road reveal; the Battle button pulses once | none |
| 8:45 | Match 3: Ladder, Short War vs Captain Kettle (tier I) | none |
| After match 3 | War Plan screen unlocks with a prompt to review the Stone loadout | "Your army, your plan" |

**Adaptive hints** fire at most once per 30 s, only on failure patterns, and at most 3 times each:

- "Their turret shreds melee. Try Pebblers."
- "Heavies stop Bonkers. Try a Spear Hunter."
- "Your power is ready."
- "Evolve before they do."
- "Buy another turret mount."
- "Hold: gather at the line, then push."

**Instrumentation.** A local event log (ring buffer of 500 events) records each onboarding step's timestamp and drop-off. It can be exported from Settings for playtests. It never leaves the device.

## A9. Screens and UI flow

```
Boot (≤3 s) ─first launch─> Tutorial match 1 ─> Capsule 1 ─> Match 2 ─> Capsule 2 + upgrade ─> Home
Home: [BATTLE] | War Plan | Collection | Capsules | Trophy Road | Profile | Settings(gear)
BATTLE ─> Mode (Ladder / Skirmish / Daily Challenge) ─> VS (2 s, skippable, AI badge) ─> Battle ─> Pause
Battle ─> Result (rewards staged) ─> Capsule opening (if earned) ─> Home or Next battle
```

| # | Screen | Contents |
|---|---|---|
| 1 | Boot | Logo ≤ 1 s, progress bar; Stone assets first, the rest streams in during the tutorial or the menu |
| 2 | Home | Big Battle button with the next opponent preview; Trophy Road bar with the next reward; capsule tray ("Open (3)", "Open all"); daily quests; profile chip; settings gear |
| 3 | Mode select | Ladder; Skirmish (choose General or Echo, tier I-X, format, speed, "Standard levels" toggle; small Amber reward only, no trophies or capsules); Daily Challenge (A9.1) |
| 4 | VS | Your card vs the AI General card: AI badge, tier, War Plan level ("Plan Lv 4.2 vs Lv 4.0"), format, personality line, modifiers |
| 5 | Battle HUD | See A9.2 |
| 6 | Pause | Resume, Settings, Retreat (after 1:00), Quit Skirmish |
| 7 | Result | Victory/Defeat/Draw banner; recap (units trained and killed, base damage, time per age, MVP card); rewards staged one at a time (trophies tick, Amber, capsule drop, Collection XP, quest progress); Next battle, Watch replay, Home |
| 8 | Capsule opening | A10, with the odds and pity panel on every capsule |
| 9 | War Plan | Preset tabs A/B/C; 5 age tabs; 4 unit + 2 turret + 1 power slots; collection filtered to the age; average level; auto-fill; advisor warnings; skin picker per card |
| 10 | Collection | Grid filterable by age, role and rarity, with owned/unowned toggle; silhouettes for unowned; copies bar per card; Skins tab; crafting with Dust |
| 11 | Card detail | Animated idle on a stage; full stats (HP, damage, interval, DPS, range, speed, pop, train time, size, tags, mods, abilities); Strong vs / Weak vs; next-level preview; Upgrade; skin carousel |
| 12 | Trophy Road | Vertical path, arena gates, claimable nodes |
| 13 | Profile | A6.1 plus match history with replay buttons |
| 14 | Replay viewer | Play/pause, 1x/2x/4x, seek bar (seek re-simulates from tick 0), side toggle for which HUD to show |
| 15 | Settings | Master/Music/SFX/UI volume; graphics preset (Auto/High/Lite); reduce motion; shake slider; hitstop on/off; damage numbers (Off/Important/All); colourblind preset (Default, Blue/Yellow, High contrast); language (EN/DA); default speed; save export/import/reset; odds overview; About; credits; export event log |
| 16 | Dev (`?dev=1`) | Art gallery, soundboard, feel tuner, spawn sandbox, time scale, replay debugger, capsule test bench, bot-vs-bot viewer |

### A9.1 Daily Challenge

- **Format:** Standard War. The opponent tier equals your ladder tier.
- **Modifier:** one symmetric modifier per day, seeded by the local date (`YYYYMMDD`):

| # | Modifier | Effect |
|---|---|---|
| 1 | Gold Rush | Passive gold ×1.5 |
| 2 | Glass Armies | Unit HP ×0.7 |
| 3 | Turret Holiday | Mounts disabled |
| 4 | Power Hour | Age Power charge ×2 |
| 5 | Fast Forward | XP thresholds ×0.7 |
| 6 | Heavy Metal | Heavy and Legendary cost −30% |
| 7 | Sudden Siege | Siege starts 1:15 earlier |
| 8 | Mirror Match | Both sides use your War Plan |

- **Reward:** the first win of the day gives an Age Capsule. Other wins pay normal Amber, with no trophies.

### A9.2 Battle HUD (DOM overlay over the canvas)

- **Top bar:**
  - Left: your base HP bar, age icon and XP bar.
  - Centre: match clock with a phase marker (Overdrive/Siege ticks on the timeline).
  - Right: the opponent's base HP, age icon, XP bar and power charge ring; then pause and speed.
  - Under the right side: the Scouted strip.
- **Bottom tray (24% of height), left to right:**
  1. Gold counter with income per second.
  2. Treasury coin (shows next cost).
  3. 4 unit cards: 88 px targets showing cost, queue count, radial training fill, affordable glow, and "ARMY FULL" / "LEGENDARY IN FIELD" states.
  4. Divider.
  5. Army counter ("Army 14/20") and stance flag.
  6. Evolve button (XP ring and cost-free label).
  7. Large round Age Power button (charge ring).
  8. Last Stand button (appears only when unlocked).
  9. Emote button.
- Turret mounts are tapped directly on the base in the canvas. The build picker is a small DOM popover showing the 2 turret cards.
- No control ever covers the lane band.
- **Denied press:** red flash, 2-frame shake, `ui_deny` sound.
- **Low base HP (< 25%):** red vignette pulse every 1.2 s.

## A10. Capsule opening storyboard

The result is rolled and saved before step 1, so a reload can't re-roll it. The sequence never fakes a near miss.

**The capsule.** A carved stone-and-brass drum with 5 age rings that light up as it climbs. Tier colours:

| Tier | Colour |
|---|---|
| Clay | #9C6B4A |
| Bronze | #C27C3A |
| Silver | #C9D1DC |
| Gold | #F5B82E |
| Aeon | Violet #8B5CF6 with a gold rim |

| Step | Time | Visual | Audio | Input |
|---|---|---|---|---|
| 1. Arrival | 0-0.5 s | Capsule drops on a pedestal, squash bounce, dust ring | `cap_thud` | none |
| 2. Charge | 0.5-2.0 s | Shaking, cracks leak light in the current tier colour, 4 strike pips, "Tap!" | `cap_riser` | none |
| 3. Strikes (4) | ~0.6 s each | Each tap is a hammer strike. The number of climbs equals the pre-rolled tier index above the start tier; the cosmetic RNG picks which strikes climb. A climb brings a colour step, a flash, +0.25 trauma and a lit pip. A non-climb gives a small dust puff | `cap_climb_1..4` (each a step higher) or `cap_clunk` (never a penalty sound) | Tap, or auto after 1.5 s idle |
| 4. Burst | 0.3 s | White flash, god-rays in the final colour, halves fly apart, Amber pours into the counter | `cap_burst` plus a tier stinger | none |
| 5. Cards | 0.15-0.8 s each | Cards fan out face down, rarest last. Each back glows in its rarity colour for 0.3 s (an honest pre-signal), then flips: Common 0.15 s (auto), Rare 0.4 s with a blue shimmer, Epic 0.8 s with violet lightning. New cards get a "NEW" stamp and a silhouette-fill reveal | `rarity_common/rare/epic`, `card_flip` | Tap flips faster; hold fast-forwards |
| 6. Legendary walkout | 8-10 s the first time, 3 s after | Screen dims to a spotlight, rings spin. Reveal order: age glyph, role icon, gold-rimmed silhouette. Bass drop, the unit bursts into colour and performs its signature move across a lane backdrop, then its victory pose. Name banner, "LEGENDARY", confetti, "NEW!" or the duplicate bar | `walkout_bass`, `rarity_legendary` | Skippable after the first time that card is revealed |
| 7. Duplicates | 0.5 s per card | Each stack flies into its copies bar, which fills with ticks ("3/4" → "UPGRADE READY" badge bounces) | `copy_tick`, `upgrade_ready` | none |
| 8. Summary | Until closed | Grid of everything, new items highlighted, Amber total, updated pity counters | none | Upgrade (jumps to the best ready upgrade), Open next (N), Done |

Rules:

- Nothing runs longer than 10 s without a skip (except a first-ever Legendary walkout, capped at 10 s).
- "Open all" shows the summary plus any Epic-or-better reveals.
- Rarity colours appear in UI only and never collide with team colours: Common #B8C0CC, Rare #3D8BFF, Epic #A855F7, Legendary #F5B82E, Mythic a red-to-magenta prismatic shimmer.

### A10.1 Wardrobe Crate reel (CS-style, behind `platform.features.reelReveal`, default on)

- 50 tiles scroll horizontally, with the winning tile placed at index 45.
- Filler tiles are drawn from the true odds using the cosmetic RNG. The reel never places a rarer item directly after the winner, so there is no staged near miss.
- The reel runs 5.5 s with quintic ease-out. `reel_tick` plays per tile crossing the pointer, falling slightly in pitch.
- The stop offset is random within the winning tile. The winner zooms with a colour burst, name, rarity and target unit.
- When the flag is off (for example a future Poki build), a card-flip reveal replaces the reel.

## A11. Art direction and animation (code-drawn now, swappable later)

**Style: chunky cartoon cutout.**

- Flat fills, two-tone cel shading (shadow = fill darkened 18%) and one highlight shape per part.
- 3 px outlines at 720p in the fill colour darkened 45% (not black).
- Rounded shapes, heads about a third of body height, short legs, oversized weapons that read the role (bow = ranged, big shield = heavy, polearm = reach).
- No blood: units pop into dust, KO stars and coins.

**Scale at 720p:** infantry ~56 px tall, heavies 80-100 px, Legendaries 140-180 px. Consistent across ages.

**Team readability:**

- Player blue #2F7DF6, opponent orange #F28A1E (different value), on large parts: tabard, shield face, plume, pennant.
- Redundant cues:
  - facing direction
  - ground ring (circle for you, diamond for the enemy)
  - pennant on heavies
  - health bar colour
- Colourblind presets:
  - Blue/Yellow: #2F7DF6 / #F2C21E
  - High contrast: #1F5FD6 / #FF6A00, plus a stripe pattern on banners
- Health bars appear only once a unit is damaged, with a ghost segment that drains 300 ms after each hit.

**Age palettes:**

| Age | Colours |
|---|---|
| Stone | ochre #C98A3D, moss #6E8B3D, bone #EDE3C8 |
| Medieval | slate #6B7682, banner red #B3282D, gold #D4A437 |
| Gunpowder | navy #22345C, brass #C9A227, cream #EFE6CF |
| Modern | olive #5F6B3A, khaki #B8A67A, gunmetal #3A3F45 |
| Future | charcoal #23262E, cyan #29E3F5, magenta #F03AA8, white |

**Split-age lane (signature visual).**

- Your half of the backdrop shows your age and the enemy's half shows theirs, blended over a 160 lu seam at the midpoint of the two front lines.
- On evolve, that side's half wipes to the new age from the base outward over 1.5 s.
- Backdrops have 3 parallax layers per age from seeded noise:
  - sky gradient
  - silhouettes (mountains → castles → windmills and masts → city → megastructures)
  - mid-ground
- The arena controls the ground and weather layer. Backdrops stay desaturated and low contrast.

**Bases.** Cave Hold, Keep, Star Fort, Bunker, Spire. Each has 4 turret mounts stacked vertically and crumble states at 75%, 50% and 25%.

**Rigs.** Seven shared rigs cover every card:

| Rig | Parts / used for |
|---|---|
| biped | head, torso, pelvis, upper/lower arm ×2, weapon, off-hand, upper/lower leg ×2 |
| quadruped | boar, sabertooth, bear, mammoth |
| rider | biped on quadruped or horse: Knight, Cuirassier, Ursa Paladin |
| vehicle | hull, wheels or treads, turret, barrel: Ram, Cannon, Tankette, Behemoth |
| walker | Walker Mech, Chrono Titan |
| flyer | body, rotor or balloon, gondola: Balloon, Gyrocopter, Drone |
| turret | base, pivot, barrel |

**Clip contract (every visual implements these names):**

| Clip | Default treatment |
|---|---|
| spawn | Scale 0 → 1.15 → 1 over 180 ms (ease-out-back) plus dust puff |
| idle | 1.2 s breathing bob of 2 px, blink, weapon twirl every 6-10 s |
| walk | Legs ±25°, 3 px bob, 0.5 s cycle at 80 lu/s scaled by speed; vehicles bounce and treads scroll |
| attack | Wind-up with squash 0.9/1.1 (60% of windup), strike at `impactAt`, short recovery |
| hit | 80 ms white flash, 4 px recoil along the hit direction |
| stun | Dizzy stars |
| die | Fling and spin along the knockback direction, dust poof, coins; hat, helmet or weapon drops and stays 6 s (pool of 40) |
| victory | Cheer hop, raised weapon |
| ability | Card-specific |

**Card-specific ability clips:**

- charge lean: Tuskback, Knight, Cuirassier
- pounce arc: Sabertooth
- stomp and riders jumping off: Matriarch
- roar ring: Ursa
- swing: Ram
- recoil: Cannon, Tankette, Behemoth
- bomb drop and crash: Balloon
- rotor tilt: Gyrocopter
- radio call: Radio Operator
- repair beam: Repair Drone
- EMP ring: EMP Saboteur
- Time Stop pose with a clock-face shockwave: Chrono Titan

**Turret clips:** build drop-in, idle scan, aim rotation toward the target, fire recoil (120 ms squash plus a 1-frame muzzle flash), sell poof.

**Base clips:** ambient idle (torches, flags, lights), hit shake with debris, crumble stages, evolve morph (1.8 s: squash, light pillar, rebuild), Last Stand glow and volley, destroyed collapse.

## A12. Game feel checklist

All values live in `src/render/feel.config.json` and can be tuned live from the dev feel panel.

**Hitstop:**

- Local hitstop is view-only (the clips of attacker and victim pause; the sim continues).
- Global freezes pause the session's sim accumulator in offline modes; this never changes the outcome. Online later, they become view-only.
- At most one global freeze per 0.5 s.

**Screen shake (trauma model):**

- shake = trauma²; linear decay 1.2/s; Perlin noise at 18 Hz with separate seeds for x, y and rotation.
- Max offset 12 px, max rotation 2.5°, plus a small directional kick along the attack vector.

| Event | Hitstop | Trauma | Flash | Particles | Sound |
|---|---|---|---|---|---|
| Light hit | none | 0 | Victim 60 ms | 3 sparks by damage type | `hit_*` (4 variants) |
| Heavy hit (≥ 15% victim max HP) | Local: victim 70 ms, attacker 50 ms, 1-2 px jitter | +0.05 | 80 ms | 6 sparks and dust | `hit_heavy` (3 variants) |
| Unit death | Local 50 ms; heavy or Legendary death: global 80 ms | +0.1 (heavy +0.15) | none | 10 dust, KO stars, 1-4 coins flying to the gold counter (player kills only) | `die_bio` / `die_mech` |
| Mech death | as above; 1 in 3 explodes (cosmetic RNG) | +0.12 | 60 ms | explosion ring | `explosion_s` |
| Turret shot | none | 0 | Muzzle, 1 frame | 3 smoke | per turret |
| Base hit | none | +0.2 (max once per 0.5 s) | Base 60 ms | 4 chunks | `base_hit` (3 variants) |
| Power telegraph | none | 0 | none | Pulsing zone outline in the caster's team colour | `power_telegraph` |
| Power lands | Global 120 ms | +0.5 | 1 frame at 30% white | Per-power preset | Power sound; music ducks 6 dB for 1.5 s |
| Evolve (own) | Global 100 ms | +0.4 | White 120 ms | Light pillar, ring, age-icon confetti; allied units cheer-hop | `evolve_riser`, `evolve_fanfare_<age>`, music key change |
| Evolve (enemy) | none | +0.1 | none | Smaller pillar on their side; banner on their XP bar | `evolve_enemy` |
| Last Stand | Global 150 ms | +0.5 | Red 100 ms | Shockwave ring | `last_stand_charge`, `last_stand_fire` |
| Base destroyed | 250 ms, then 0.3× slow motion for 1.2 s (view only; sim has ended) | 1.0 | 200 ms | 120 debris | `base_destroyed`, victory/defeat stinger |

**Other feel rules:**

- **Damage numbers.** Default "Important": powers, base damage chunks and your own turret kills, spread 20-40 px apart. "All" shows every hit. Gold "+30" popups always show.
- **Reduce motion preset:** shake ×0, hitstop ×0.5, softer flashes, no slow motion.
- **Particles:** pooled; caps of 600 on mobile and 1,500 on desktop; the lowest-priority emitters drop first.
- **VFX list:**
  - hit sparks by damage type (blunt dust, slash arc, pierce spark, bullet spark, laser scorch)
  - muzzle flashes
  - projectile trails (bright core, team-tinted tail)
  - splash rings
  - heal glyphs, shield bubbles
  - mark reticle, gravity swirl, smoke cloud, EMP ring, time-stop clock ripple
  - gold popups flying to the counter, XP sparkles flying to the XP bar
  - Overdrive gold frame pulse, Siege red vignette with crumbling particles
  - idle aura on Legendary units and Legendary skins

**Checklist every card and event MUST pass before sign-off:**

1. Spawn pop and dust.
2. Walk cycle matches speed (no foot sliding beyond 3 px).
3. Attack impact frame lands on the sim impact tick (±1 frame).
4. Hit flash on the victim.
5. Death fling and poof.
6. Correct SFX with variation.
7. Readable at 32 px height.
8. Team colour visible on both teams and both colourblind presets.
9. Skin keeps its silhouette.
10. No effect lasts longer than its gameplay meaning.

## A13. Audio: SFX and music

All SFX are ZzFX definitions (3-5 variants each) pre-rendered to AudioBuffers at load and referenced by ID. The manifest can switch any ID to a file later.

| Group | Sound IDs |
|---|---|
| UI | `ui_click`, `ui_hover`, `ui_deny`, `ui_toggle`, `ui_tab`, `ui_confirm` |
| Spawn and movement | `spawn_pop`, `spawn_heavy`, `spawn_legendary`, `step_heavy`, `step_mech` |
| Attacks | `swing_whoosh`, `shot_sling`, `shot_bow`, `shot_crossbow`, `shot_musket`, `shot_cannon`, `shot_rifle`, `shot_mg`, `shot_rocket`, `shot_rail`, `shot_laser`, `shot_plasma`, `bee_buzz`, `toad_tongue`, `goose_honk`, `radio_call`, `emp_pulse`, `time_stop` |
| Hits and deaths | `hit_blunt`, `hit_slash`, `hit_pierce`, `hit_bullet`, `hit_laser`, `hit_heavy`, `explosion_s`, `explosion_m`, `explosion_l`, `die_bio`, `die_mech`, `prop_drop`, `heal_tick`, `shield_up` |
| Turrets and bases | `turret_build`, `turret_sell`, `slot_buy`, `base_hit`, `base_crumble`, `base_destroyed` |
| Economy | `coin_gain` (pitch climbs on multi-kills; throttled to 1 per 40 ms), `xp_tick`, `treasury_up` |
| Evolve | `evolve_ready` (single soft chime), `evolve_riser`, `evolve_fanfare_stone/medieval/gunpowder/modern/future`, `evolve_enemy` |
| Powers | `power_ready`, `power_telegraph`, `pw_meteor`, `pw_stampede`, `pw_arrows`, `pw_decree`, `pw_broadside`, `pw_smoke`, `pw_bomber`, `pw_paratroop`, `pw_lance`, `pw_nanite` |
| Match | `last_stand_charge`, `last_stand_fire`, `overdrive_horn`, `siege_bell`, `victory_jingle`, `defeat_jingle` (gentle, not mocking), `emote_pop` |
| Capsules | `cap_thud`, `cap_riser`, `cap_climb_1`, `cap_climb_2`, `cap_climb_3`, `cap_climb_4`, `cap_clunk`, `cap_burst`, `card_flip`, `rarity_common` (pluck), `rarity_rare` (two rising notes), `rarity_epic` (triad arpeggio plus shimmer), `rarity_legendary` (5-note fanfare, pad, sub drop), `walkout_bass`, `copy_tick`, `upgrade_ready`, `upgrade_slam`, `level_up`, `reel_tick` |

**Mixer:**

- Buses: master, music, sfx, ui.
- At most 4 voices per sound ID and a 40 ms minimum retrigger gap.
- Pitch ±8% and volume ±3 dB per play.
- Sounds caused by the player get priority.
- Music ducks 6 dB during powers, evolves and walkouts.
- The AudioContext is created or resumed on the first user gesture (iOS).
- `navigator.vibrate` fires on climbs and Legendaries (mobile, toggle).

**Music:**

- **Theme.** "Dawn March", our own 16-bar singable theme at 110 BPM, deliberately unlike "Glorious Morning". WP6 writes three melody candidates as note data; the owner picks one (candidate A is the default until then).
- **Engine.** A small step sequencer with synthesized instruments (oscillators, noise, simple envelopes and filters).
- **Arrangements:**

  | Arrangement | Instruments |
  |---|---|
  | Stone | drums, breathy square flute |
  | Medieval | plucked lute, horn |
  | Gunpowder | fife, snare march |
  | Modern | brass stabs, synth bass |
  | Future | arpeggiated synths, sidechain pump |
  | Menu | slow version |
  | Capsule room | loop |

  Plus victory and defeat stingers on the motif.
- **Layers:**
  - base loop
  - intensity layer, driven by a view-side estimate from nearby damage and deaths (decays 0.2/s)
  - Overdrive layer (+8 BPM feel, double-time percussion)
  - Siege heartbeat bass
- **Key changes.** Each own evolve modulates the key up a whole step, capped at 2 steps above the start.
- Any `musicCueId` can later point to a composed file through the manifest.

---

# Part B. Technical architecture

## B1. Stack

| Area | Choice | Version policy |
|---|---|---|
| Runtime | Node.js 22 LTS (≥ 22.12) | `engines` field in package.json |
| Package manager | npm 10 (bundled with Node); single package | Lockfile committed |
| Language | TypeScript, `strict`, `noUncheckedIndexedAccess` | Pin the latest 6.0.x exactly. TS 7 (native) is evaluated in v1.x once typescript-eslint supports it |
| Build and dev server | Vite 8 with `@preact/preset-vite` | ^8 |
| Battle and capsule renderer | PixiJS 8 | ^8.21 (≥ 8.16 required for spine-pixi-v8 later); `preference: 'webgl'`, WebGPU behind `?gpu=webgpu` |
| Meta UI and HUD | Preact 10 with @preact/signals 2, plain CSS modules | ^10 / ^2 |
| Schemas | Valibot 1 | Content, saves, replays |
| Audio | ZzFX (vendored MIT source) plus own mixer and sequencer | Vendored in `src/audio/vendor/zzfx.ts` |
| Compression | fflate 0.8 | Save export codes |
| Tests | Vitest 4.1 (node env), fast-check 4, Playwright 1.5x (e2e smoke) | Browser Mode screenshots in v1.x |
| Lint | ESLint 9 flat config, typescript-eslint 8 | Layer and determinism rules (B2) |
| Scripts | tsx 4 | Headless tools |

**Why PixiJS.**

- It is a renderer, not a framework. We own the fixed-step loop and the sim.
- Its nested Container tree maps directly onto cutout rigs.
- `GraphicsContext` sharing and SVG parsing suit code-drawn art, and `graphicsContextToSvg()` exports parts as reference sheets.
- AssetPack manifests and the official `spine-pixi-v8` runtime give the art swap path.
- It is ~120-130 KB gzipped, which fits the 5 MB portal bar.
- Phaser 4 is a valid runner-up, but its physics, scenes and input would go unused, and it is 345 KB. Godot web is ~9 MB and not agent-friendly for TS.

**Repo.**

- New private GitHub repository `ageborn`, created by WP0 at the owner's request. `main` is protected once CI is green.
- Local play:
  - `npm install`
  - `npm run dev` serves http://localhost:5173
  - `npm run play` builds and previews
- Nothing needs to be online.

## B2. Architecture overview and layering

```
UI input / keyboard ─┐
Bot controllers ─────┼─> TimedCommand[] ──> sim.step()  (pure, deterministic, 20 Hz)
                     │                          │ SimState (read-only to others) + SimEvent[]
                     │                          v
                     │     render/BattleView: interpolation, UnitViews via ArtProvider,
                     │     feel layer (hitstop, shake, VFX, numbers), AudioService calls
                     │                          │ HudModel signal (15 Hz)
                     └──────────────────────── ui/hud (DOM)
MatchResult ──> meta (pure rules) ──> SaveDoc ──> save (localStorage) ; ui/screens read signals
```

**Allowed imports** (enforced by ESLint `no-restricted-imports` plus an import-graph test in `tests/integrity`):

| Layer | May import |
|---|---|
| `contracts` | nothing but itself |
| `core` | contracts |
| `content` | contracts, core |
| `sim` | contracts, core, content types |
| `ai` | contracts, core (sim only through the `Observation` type) |
| `meta` | contracts, core, content |
| `save` | contracts, core, meta types |
| `visuals` | contracts, core, pixi.js |
| `audio` | contracts, core |
| `render` | contracts, core, visuals (through the ArtProvider interface), audio (through the interface), pixi.js |
| `ui` | contracts, core, preact, signals; service instances only via `app/services` injection |
| `capsule` | contracts, core, visuals, audio, pixi.js, preact |
| `tutorial` | contracts, core |
| `app` | everything |
| `dev` | everything |

**Determinism lint.** In `sim`, `ai`, `meta`, `core` and `content` the following are banned:

- `Math.random`, `Date`, `performance`
- `Math.sin/cos/tan/pow/exp/log/sqrt/atan2`
- `setTimeout`, `setInterval`
- floating-point literals in stat math
- `for...in` over objects
- DOM globals
- `pixi.js`, `preact`

Meta gets time only through an injected `Clock`.

## B3. Simulation specification

- **Tick:** 50 ms. `ms → ticks = max(1, round(ms / 50))`. A Full War is 12,000 ticks.
- **Integer state:**
  - Positions are world x in milli-lu (lane = 1,200,000); helpers convert to per-side p.
  - HP, shields and damage are integers.
  - Gold and XP are milli-units.
  - Multipliers are in bp.
  - Division uses `Math.trunc`; 32-bit hash math uses `Math.imul`.
  - All values stay within ±2^31.
- **RNG.** sfc32 with 4×uint32 state stored in `SimState.rng`, seeded via xmur3 of `"${seed}"`. Sim randomness is used only for:
  - meteor jitter
  - Congreve scatter
  - Smoke Screen misses
  - bot-independent tie-breaks (should be none)

  Views use a separate mulberry32 cosmetic RNG.
- **Entities.** Arrays with stable increasing ids (`nextId`), iterated in id order; removals compact at the end of the tick.
- **Tick pipeline (MUST be in this order):**
  1. Apply this tick's commands, sorted by (side, seq). Invalid commands are ignored and emit `commandRejected` with a reason.
  2. Clock and phase: phase changes, Siege base decay.
  3. Economy: passive gold and XP (× phase and modifier), Overcharge conversion.
  4. Ascension timers, stance cooldowns, turret build/sell timers.
  5. Training: advance the head item, spawn when done and allowed.
  6. Statuses: expire, tick heal-over-time, innate shield regen, recompute auras.
  7. Timed abilities: heals, Roar, callStrike, EMP, Time Stop, pounce triggers.
  8. Unit attack state machines (acquire, windup start, impacts), in id order.
  9. Turret attack state machines, mount order side 0 then side 1.
  10. Projectiles: advance, resolve impacts.
  11. Power casts: telegraph countdowns, impact sequences.
  12. Last Stand: charge countdowns, blasts, auto-trigger at 10%.
  13. Deaths: bounties, XP, on-death effects (spawns, explosions), `died` events, compaction.
  14. Movement: per side, units sorted by p descending (A2.7), then air units.
  15. Win check: base HP ≤ 0, Final Bell, retreat.
  16. `prevX` bookkeeping for interpolation; every 20 ticks the FNV-1a state hash goes into `state.hashes`.
- **Commands** are stamped with the execution tick `sim.tick + 1` offline (online later: + 4). Human and bot commands go through the same queue and are all recorded.
- **Replays:** `{ v: 1, simVersion, contentHash, seed, format, sides: SideConfig[], modifiers, commands: TimedCommand[], result, finalHash, hashes }`, about 5-20 KB.
  - Verification re-simulates and compares `finalHash`.
  - A replay whose `contentHash` differs from the current build is shown as "from an older version" and cannot be played.
- **Performance:** a full headless 10-minute match in under 50 ms on desktop Node; average `step()` ≤ 0.5 ms on a mid-range phone.

## B4. Content pipeline

- **Location.** Content lives as typed TS modules in `src/content`: one file per age for units and turrets, plus powers, skins, cosmetics, rarities, capsules, arenas, formats, economy, generals, quests, dailyModifiers and trophyRoad.
- **Stats.** Numbers are exactly the Part A tables (final level-1 values per age).
- **Validation.** `schema.ts` (Valibot) runs in tests and in dev boot. It checks:
  - unique IDs
  - cross-references (skin → card, loadout → age, power → age)
  - every `visualId` exists in the visual manifest
  - every `soundId` exists in the sound manifest

  The last two checks live in `tests/integrity` (WP12).
- **Compilation.** `compile.ts` converts ms to ticks, speeds to milli-lu per tick and percentages to bp, derives bounty values, and computes `contentHash` (FNV-1a over canonical JSON). The result is a frozen `CompiledContent` object.
- **Spreadsheets.** `tools/csv.ts` exports the unit, turret and power tables to CSV and imports them back, so balance can be tuned in a spreadsheet.
- **Strings.** Cards reference `nameKey` and `descKey` in `src/i18n/content.en.json` and `content.da.json`.

## B5. Art provider and visual manifest (the swap contract)

- Gameplay data references only `visualId`. The visual manifest `src/visuals/manifest.ts` maps each `visualId` to a `VisualDef`.
- `ArtProvider` picks an adapter by `kind`:

| Kind | Adapter | When |
|---|---|---|
| `placeholder` | `PlaceholderView`: role-shaped capsule silhouettes in team colour | Day 1, so render work never blocks on art |
| `procedural` | `ProceduralPuppetView` | v1 |
| `atlas` | `AtlasAnimView`, via Pixi Assets bundles built by AssetPack | Later |
| `spine` | `SpineView` via `@esotericsoftware/spine-pixi-v8` | Later |

- **The sim owns timing.** The view receives `attackStarted { windupTicks }` and time-scales the attack clip so its `impactAt` lands on the impact tick. Replacing art can never change balance.
- **Procedural v1 (tier 0):**
  - Parts are defined as SVG path data or Pixi Graphics drawing functions in `src/visuals/parts/<age>.ts`.
  - They are baked once at load into a runtime texture atlas at `min(devicePixelRatio, 2)` (1 in Lite).
  - They are rendered as Sprites in a Container tree per rig.
  - Clips are JSON-style keyframes on bone rotation, offset and scale, plus procedural helpers (walk cycle, bob, squash).
  - Skins are palette swaps (non-team zones only), overlay parts, filters and particle auras.
  - Age 0-1 parts bake at boot; ages 2-4 bake during the tutorial or the menu (idle callback).
- **Later tiers:**
  - AI-generated or painted static parts drop into the same rigs at the same pivots (with a defringe step for alpha halos).
  - Then AssetPack atlases (`assets-src/**/{tps}`), then Spine.
  - Units swap one at a time by editing their manifest entry. Tiers can mix in one match.
  - A URL override `?art=placeholder|procedural|atlas` forces a tier for comparison.
- **Art gallery** (`?dev=1#gallery`) renders every visualId × clip × skin × team × colourblind preset.
  - It is the review sheet and the screenshot-test target.
  - It can export parts as SVG (`graphicsContextToSvg`) as handoff sheets for artists or image generators.
- **Portraits for DOM UI.** `ArtProvider.portrait()` renders a rig pose to an offscreen canvas and caches a data URL keyed by (card, skin, size).

## B6. Renderer, feel layer and HUD

**Pixi Application:**

- One persistent canvas for the battle, the capsule stage and card stages.
- Stage layers: backdrop, ground decals, units (depth-sorted by y), projectiles, VFX, floating text, telegraphs, screen flash.

**Interpolation.** `alpha = acc / DT`. The view position is lerp(prevX, x, alpha). Frame time is clamped to 250 ms.

**Loop (in `app/session.ts`):**

```
acc += min(frameMs, 250) × speed × (freeze ? 0 : 1)
while acc ≥ 50: bots add commands; sim.step(cmds); events → view.onEvents(); acc −= 50
view.render(alpha, frameMs)
```

Global freezes set `freeze` for their duration.

**Event mapper.** `render/eventMapper.ts` turns `SimEvent`s into view actions using `feel.config.json` rules: clips, flashes, hitstop, trauma, particles, numbers, sounds, music intensity.

**HUD** is a Preact DOM overlay fed by a `HudModel` signal updated at 15 Hz. It also covers card states, turret mount hit areas (canvas pointer events mapped to mounts) and power drag targeting (a canvas overlay that shows the zone).

**Graphics presets:**

| Preset | DPR | Particle cap | Parallax layers | Shadows | Legendary auras |
|---|---|---|---|---|---|
| Lite | 1 | 300 | 2 | off | off |
| High | 2 | 1,500 | 3 | on | on |
| Auto | High on desktop, Lite on mobile or when the average frame time over 3 s exceeds 20 ms | | | | |

## B7. Audio

- The `AudioService` interface is implemented by `WebAudioService`.
- The sound manifest `src/audio/sounds.ts` maps `SoundId → { kind: 'zzfx', variants: number[][] } | { kind: 'file', src }`.
- The music manifest `src/audio/music.ts` maps `MusicCueId → { kind: 'seq', score } | { kind: 'file', src, layers }`.
- Buffers pre-render at boot for UI, Stone and Medieval (< 300 ms budget); the rest render lazily.
- Tests run against a `FakeAudioService` that records calls.

## B8. Save system

- **Storage.** localStorage (per brief), behind the `SaveStore` interface so IndexedDB, Capacitor Preferences or cloud stores can replace it later.
- **Keys:**
  - `ageborn.save.A`, `ageborn.save.B`: two alternating slots, each `{ v, writtenAt, checksum (FNV-1a of payload), payload }`
  - `ageborn.replays` (ring of 20)
  - `ageborn.eventlog`
  - `ageborn.backup.pre-v<N>` (before each migration)
- **Writes** are debounced by 2 s, flushed on `visibilitychange` (hidden) and `pagehide`, and immediately after a capsule roll or upgrade.
- **Load order:**
  1. Read both slots.
  2. Pick the newest valid checksum.
  3. Run migrations `m[v] : (doc_v) → doc_{v+1}` in sequence (pure functions).
  4. Validate against the Valibot schema.
  5. If invalid, fall back to the other slot, then to a fresh save with a banner "Save could not be read. Import a backup?"
- **Export/import:** JSON → fflate deflate → base64url code (copyable), plus a `.ageborn` file download. Import validates and migrates.
- **Durability:**
  - Call `navigator.storage.persist()` on the first win.
  - Settings shows a gentle "Back up your progress" reminder when the last export is more than 5 days old.
- **Capsule rolls** use a meta RNG stream stored in the save (`rng.capsule`, sfc32 state). The result is written before any animation.
- **Local clocks** drive daily timers, limited by the bank caps.

## B9. Meta services (pure TS)

- **Signature style.** Every meta function is `(save, content, clock, …) → { save, outcome }`: no mutation, no I/O.
- **Covers:**
  - rewards
  - capsule bag, roll, pity and script
  - wardrobe
  - upgrades, crafting and dust
  - War Plan validation, auto-fill and advisor
  - trophies and arenas
  - quests (progress from `MatchStats`)
  - Collection Level
  - MMR and opponent selection
  - Daily Challenge modifier selection
  - economy pacing sim entry points
- The app layer holds the current `SaveDoc` in a signal and calls `saveStore.save` after each meta transition.

## B10. AI module

- `createBot(profile, side, seed)` returns a `BotController`.
- The controller keeps a ring buffer of observations so it can decide on `tick − snapshotDelayTicks`. It runs the brain every `decisionIntervalTicks` and enforces the action cap.
- Brains are pure given (observation, rng, profile).
- The Grogg tutorial brain is scripted from `tutorial/scripts.ts` data through the same command API.

## B11. App shell, session and platform

- **Boot:**
  1. load the save
  2. apply settings
  3. init the platform adapter
  4. init Pixi and pre-bake Stone/Medieval
  5. audio unlock on the first gesture
  6. route to the tutorial or Home
- **Router.** Signal-based, with screen IDs. Browser history is used only for `?dev` routes.
- **`BattleSession`:** builds `MatchConfig` from the save plus the opponent spec, creates the sim, bots, view and HUD model, runs the loop, records the replay, and on end calls meta rewards then saves.
- **`PlatformAdapter`:** v1 ships `NonePlatform` (no ads, `reelReveal: true`). Poki, CrazyGames and Y8 adapters come later.

## B12. Headless tools (`tools/`, run with tsx)

| Command | Does |
|---|---|
| `npm run sim:balance` | Bot-vs-bot matrix. Smoke: 50 matches per pairing (CI). Full: 400 per matchup (nightly or manual). Mirrored seeds and sides. Reports CSV and markdown: win rates by card (included vs baseline), match length distribution, evolve timings, Final Bell rate, first-mover rate, turret damage per gold. Exits non-zero when an A2.14 target fails (smoke uses wider tolerances) |
| `npm run sim:economy` | 365-day player model (4 charged wins per day at 55%, daily capsule, quests); checks A6.9 milestones within ±20% |
| `npm run sim:drops` | 10^6 capsule openings; chi-square against published odds; pity boundary checks |
| `npm run replay:verify <file>` | Re-simulates a replay and compares hashes |
| `npm run content:csv -- export\|import` | Balance CSV round trip |

## B13. Testing

- **Core:** RNG known-answer vectors, hash vectors, fixed-point helpers.
- **Sim:**
  - A unit test per formula and system (spacing, targeting priorities, knockback clamp, first-hit bonus, pop cap, legendary limit, turret range cap, Siege mods, Last Stand, evolve rescale, Overcharge, powers).
  - 10 golden replays with known final hashes.
  - Determinism: run twice, compare hashes.
  - fast-check invariants:
    - HP ≤ max
    - gold ≥ 0
    - no unit beyond a gate
    - pop ≤ 20
    - at most 1 Legendary alive or queued
    - phase order monotonic
  - Benchmark (`vitest bench`): a Full War headless match < 50 ms.
- **AI:** bot never issues illegal commands (fuzz 500 matches); respects the action cap; tier I loses to tier X ≥ 90% (400 matches).
- **Meta:** bag totals exactly 50/28/15/5/2 per 100; pity at 10/25/40; duplicate-Legendary protection; new-card protection; upgrade costs; dust; quest progress; MMR.
- **Save:** migration fixtures for every version (v1 fixture from day one); checksum fallback; export/import round trip.
- **Integrity:** every content visualId and soundId resolves; the import-layer graph obeys B2; all string keys exist in EN and DA.
- **E2E (Playwright, Chromium and WebKit):**
  1. boot
  2. tutorial match 1 on autopilot (`?dev=1&autopilot=1` issues scripted commands)
  3. capsule 1 opens
  4. reload keeps state
  5. Home renders
  6. a Skirmish starts and ends via dev fast-forward
- **Screenshot tests** of the gallery: v1.x.

## B14. Folder structure

```
ageborn/
  package.json  package-lock.json  tsconfig.json  vite.config.ts  vitest.config.ts
  eslint.config.js  playwright.config.ts  index.html  README.md
  .github/workflows/ci.yml
  docs/design.md            (this document)   docs/art-style.md   docs/contracts.md
  public/                   (favicon, fonts bundled, no external requests)
  src/
    contracts/              ids.ts content.ts commands.ts events.ts sim.ts observation.ts bot.ts
                            art.ts audio.ts save.ts meta.ts session.ts platform.ts feel.ts i18n.ts
                            index.ts  fakes/{content.ts,art.ts,audio.ts,saveStore.ts,clock.ts}
    core/                   fixed.ts rng.ts hash.ts ids.ts assert.ts ring.ts
    content/                ages.ts formats.ts economy.ts rarities.ts
                            units/{stone,medieval,gunpowder,modern,future}.ts
                            turrets/{stone,medieval,gunpowder,modern,future}.ts
                            powers.ts skins.ts cosmetics.ts capsules.ts arenas.ts trophyRoad.ts
                            generals.ts quests.ts dailyModifiers.ts schema.ts compile.ts index.ts
    i18n/                   index.ts content.{en,da}.json ui.{en,da}.json hud.{en,da}.json
                            capsule.{en,da}.json tutorial.{en,da}.json
    sim/                    createSim.ts state.ts step.ts commands.ts events.ts observe.ts
                            replay.ts hashState.ts geometry.ts damage.ts
                            systems/{clock,economy,training,status,abilities,targeting,combat,
                                     turrets,projectiles,powers,laststand,deaths,movement,win}.ts
                            test/
    ai/                     createBot.ts controller.ts brain.ts scoring.ts counters.ts
                            personalities.ts tiers.ts openings.ts estimate.ts mistakes.ts
                            names.ts scripted.ts test/
    meta/                   rewards.ts capsules/{bag,roll,pity,script,wardrobe}.ts upgrades.ts
                            dust.ts warplan.ts advisor.ts trophies.ts quests.ts collectionLevel.ts
                            mmr.ts matchmaking.ts daily.ts newSave.ts test/
    save/                   schema.ts defaults.ts store.localStorage.ts slots.ts checksum.ts
                            exportImport.ts migrations/{index.ts,v1.ts} test/
    visuals/                provider.ts manifest.ts style.ts palette.ts bake.ts portraits.ts
                            rigs/{biped,quadruped,rider,vehicle,walker,flyer,turret,base}.ts
                            parts/{shared,stone,medieval,gunpowder,modern,future}.ts
                            clips/{common,abilities}.ts skins.ts backdrops/{sky,silhouettes,ground}.ts
                            effects/{particles,projectiles,powers}.ts
                            adapters/{placeholder,procedural,atlas,spine}.ts
    render/                 battleView.ts layers.ts interpolate.ts camera.ts eventMapper.ts
                            hudModel.ts powerTargeting.ts mounts.ts healthbars.ts
                            feel/{hitstop,shake,flash,numbers,particlePool,director}.ts
                            feel.config.json
    audio/                  service.ts mixer.ts sounds.ts music.ts sequencer.ts unlock.ts
                            scores/{dawnMarchA,dawnMarchB,dawnMarchC,arrangements,stingers}.ts
                            vendor/zzfx.ts
    ui/                     router.ts theme.css components/** screens/{home,modeSelect,vs,result,
                            warplan,collection,cardDetail,trophyRoad,profile,settings,pause}/**
                            hud/**
    capsule/                capsuleStage.ts climb.ts cardFan.ts walkout.ts reel.ts summary.tsx
                            CapsuleScreen.tsx
    tutorial/               director.ts scripts.ts hints.ts
    app/                    main.tsx boot.ts services.ts session.ts replayPlayer.ts
                            screens/replay/**  eventLog.ts
    platform/               adapter.ts none.ts
    dev/                    gallery/ soundboard/ feel/ sandbox/ capsuleBench/ botViewer/ replayDebug/
                            router.tsx (import.meta.glob of dev/*/page.tsx)
  tools/                    sim-cli.ts balance.ts economy.ts drops.ts replayVerify.ts csv.ts report.ts
  tests/                    integrity/*.test.ts  e2e/*.spec.ts
  assets-src/               (empty in v1; AssetPack input later)
```

## B15. Key contracts (`src/contracts`, owned by WP0, frozen after Phase 0)

Changes to these files go through the integration lead (C1).

```ts
// ids.ts
export type Side = 0 | 1;
export type AgeId = 'stone' | 'medieval' | 'gunpowder' | 'modern' | 'future';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CosmeticRarity = Rarity | 'mythic';
export type CardId = string; export type SkinId = string; export type VisualId = string;
export type SoundId = string; export type MusicCueId = string; export type EmoteId = string;
export type FormatId = 'tutorial' | 'short' | 'standard' | 'full';
export type Tag = 'light'|'armored'|'bio'|'mech'|'ground'|'air'|'legendary'|'support'|'ranged'|'melee';
export type Role = 'infantry'|'ranged'|'heavy'|'antiArmor'|'support'|'skirmisher'|'siege'
  |'artillery'|'airBomber'|'airGunship'|'antiMech'|'siegeHeavy';
```

```ts
// content.ts
export interface DamageMod { vs: Tag; bp: number }
export type TargetPriority = 'front' | 'armored' | 'backline' | 'air' | 'densest';
export type StatusKind = 'stun'|'slow'|'timeSlow'|'mark'|'shield'|'damageBuff'|'speedBuff'|'attackSpeedBuff';
export interface StatusApply { kind: StatusKind; magnitudeBp: number; durationMs: number; amount?: number }
export interface AttackDef {
  damage: number; intervalMs: number; windupPct?: number;            // default 40 melee / 50 ranged / 0 turret
  range: number; minRange?: number; hitsGround?: boolean; hitsAir: boolean;
  projectile?: { speed: number; arc?: boolean; visualId: VisualId } | 'instant';
  splashRadius?: number; pierce?: { count: number; length: number };
  cleave?: { extraTargets: number; reach: number }; chain?: { jumps: number; hop: number };
  line?: { fromGate: number };                                        // Log Roller
  gateZone?: { radius: number };                                      // Pitch Cauldron
  followBehind?: number;                                              // Grapeshot: hits all within N behind target
  scatter?: number; volley?: number;                                  // Congreve
  mods?: DamageMod[]; vsBaseDamage?: number; priority?: TargetPriority;
  onHit?: StatusApply[]; drag?: { distance: number };                 // Toad
  pull?: { radius: number; fractionBp: number };                      // Gravity Well
}
export type AbilityDef =
  | { kind: 'firstHitBonus'; multBp: number; knockback: number; idleResetMs: number }
  | { kind: 'aura'; radius: number; status: StatusApply }
  | { kind: 'heal'; hpPerSec: number; radius: number; targets: number; pulseMs: number }
  | { kind: 'pounce'; searchRange: number; cooldownMs: number; leapMs: number; firstBiteBp: number }
  | { kind: 'riders'; count: number; attack: AttackDef; onDeathSpawn: CardId }
  | { kind: 'onDeathExplode'; damage: number; radius: number }
  | { kind: 'periodicShieldAura'; everyMs: number; radius: number; shield: number; durationMs: number }
  | { kind: 'callStrike'; everyMs: number; searchRange: number; delayMs: number; damage: number; radius: number }
  | { kind: 'emp'; everyMs: number; radius: number; stunMs: number }
  | { kind: 'timeStop'; everyMs: number; radius: number; freezeMs: number; legendaryFreezeMs: number }
  | { kind: 'innateShield'; amount: number; regenPerSec: number; delayMs: number }
  | { kind: 'brace' } | { kind: 'siegeOnly' }
  | { kind: 'bomber'; dropWindow: number }
  | { kind: 'followSupport'; behindFront: number };
export interface UnitDef {
  id: CardId; kind: 'unit'; age: AgeId; rarity: Rarity; role: Role;
  cost: number; trainMs: number; pop: 1 | 2 | 3; hp: number; speed: number;
  size: 'small' | 'medium' | 'large' | 'huge'; tags: Tag[];
  attacks: AttackDef[]; abilities: AbilityDef[];
  visualId: VisualId; sfx: { spawn: SoundId; attack: SoundId; hit: SoundId; die: SoundId };
  nameKey: string; descKey: string; strongVs: CardId[]; weakVs: CardId[];
}
export interface TurretDef {
  id: CardId; kind: 'turret'; age: AgeId; rarity: Exclude<Rarity, 'legendary'>; cost: number;
  attack: AttackDef; visualId: VisualId; sfx: { fire: SoundId; hit: SoundId }; nameKey: string; descKey: string;
}
export type PowerEffect =
  | { kind: 'barrage'; count: number; durationMs: number; zone: number; damage: number; radius: number;
      jitter: number; hitsAir: boolean; pattern: 'even' | 'line' }
  | { kind: 'sweep'; zone: number; durationMs: number; damage: number; width: number; hitsAir: boolean }
  | { kind: 'stampede'; runners: number; spacingMs: number; distance: number; speed: number;
      damage: number; knockback: number; maxHitsPerEnemy: number }
  | { kind: 'buffAll'; statuses: StatusApply[] }
  | { kind: 'cloud'; width: number; durationMs: number; enemyMissBp: number; allyDamageBp: number }
  | { kind: 'paradrop'; card: CardId; count: number; beyondFront: number };
export interface PowerDef { id: CardId; kind: 'power'; age: AgeId; slot: 'default' | 'alternate';
  telegraphMs: number; effect: PowerEffect; visualId: VisualId; sfx: SoundId; nameKey: string; descKey: string }
export interface AgeDef { id: AgeId; index: number; pBp: number; baseHp: number; xpToNext: number | null;
  paletteId: string; baseVisualId: VisualId; backdropVisualId: VisualId; musicCue: MusicCueId }
export interface FormatDef { id: FormatId; ages: AgeId[]; overdriveMs: number | null; siegeMs: number | null;
  finalBellMs: number | null; retreatAfterMs: number | null; tutorialXpToNext?: number }
export interface EconomyRules { startGold: number; passiveGoldPerSec: number; passiveXpPerSec: number;
  treasuryCosts: number[]; treasuryGoldPerSecPerLevel: number; mountCosts: number[];
  bountyGoldBp: number; bountyXpBp: number; ownLossXpBp: number; underdogBp: number; baseDamageXpPerPct: number;
  popCap: number; queueMax: number; sellRefundBp: number; turretRangeCap: number;
  ascendMs: number; evolveHealBp: number; powerChargeMs: number; powerCarryCapBp: number;
  overchargeXp: number; overchargeBp: number; overdrive: { goldBp: number; xpBp: number; powerBp: number };
  siege: { turretDamageBp: number; baseDamageBp: number; decayBpPerSec: number };
  lastStand: { thresholdBp: number; autoBp: number; radius: number; damagePerP: number; knockback: number; chargeMs: number };
  holdLine: number; drawGapBp: number; levelStepBp: number; legendaryPowerDamageBp: number }
export interface SkinDef { id: SkinId; target: CardId | `base.${AgeId}`; rarity: CosmeticRarity;
  visualPatch: { palette?: Record<string, string>; overlays?: string[]; aura?: string }; sfxOverrides?: Record<string, SoundId>; nameKey: string }
export interface CompiledContent { hash: string; ages: Record<AgeId, AgeDef>; formats: Record<FormatId, FormatDef>;
  economy: EconomyRules; units: Record<CardId, UnitDef>; turrets: Record<CardId, TurretDef>;
  powers: Record<CardId, PowerDef>; skins: Record<SkinId, SkinDef>; /* + rarities, capsules, arenas,
  trophyRoad, generals, quests, dailyModifiers, cosmetics */ ticks: CompiledTicks }
```

```ts
// commands.ts
export type Command =
  | { t: 'train'; side: Side; slot: 0 | 1 | 2 | 3 }
  | { t: 'cancelTrain'; side: Side }
  | { t: 'buildTurret'; side: Side; mount: 0 | 1 | 2 | 3; slot: 0 | 1 }
  | { t: 'sellTurret'; side: Side; mount: 0 | 1 | 2 | 3 }
  | { t: 'buyMount'; side: Side }
  | { t: 'treasury'; side: Side }
  | { t: 'evolve'; side: Side }
  | { t: 'power'; side: Side; p?: number }          // own-side progress in lu; omitted = auto-aim
  | { t: 'stance'; side: Side; stance: 'charge' | 'hold' }
  | { t: 'lastStand'; side: Side }
  | { t: 'emote'; side: Side; emote: EmoteId }
  | { t: 'retreat'; side: Side };
export type TimedCommand = Command & { tick: number; seq: number };
```

```ts
// events.ts (all carry tick)
export type SimEvent =
  | { e: 'unitSpawned'; id: number; side: Side; card: CardId; x: number; summoned: boolean }
  | { e: 'attackStarted'; id: number; targetId: number; windupTicks: number; attackIndex: number }
  | { e: 'projectileFired'; pid: number; from: number; targetId: number; toX: number; travelTicks: number; visualId: VisualId }
  | { e: 'hit'; targetId: number; sourceId: number; sourceKind: 'unit'|'turret'|'power'|'lastStand'|'ability';
      damage: number; shieldAbsorbed: number; heavy: boolean; x: number; dmgType: 'blunt'|'slash'|'pierce'|'bullet'|'laser'|'blast' }
  | { e: 'healed'; id: number; amount: number } | { e: 'statusApplied'; id: number; kind: StatusKind; ms: number }
  | { e: 'knockback'; id: number; fromX: number; toX: number }
  | { e: 'abilityUsed'; id: number; ability: AbilityDef['kind']; x: number }
  | { e: 'died'; id: number; side: Side; card: CardId; killerSide: Side; killerKind: string; bountyGold: number; bountyXp: number; x: number }
  | { e: 'turretBuildStart' | 'turretBuilt' | 'turretSold'; side: Side; mount: number; card: CardId }
  | { e: 'turretFired'; side: Side; mount: number; targetId: number }
  | { e: 'baseDamaged'; side: Side; damage: number; hp: number; maxHp: number }
  | { e: 'goldEarned'; side: Side; amount: number; reason: 'bounty'|'passive'; x?: number }
  | { e: 'xpEarned'; side: Side; amount: number; reason: string }
  | { e: 'queueChanged'; side: Side } | { e: 'mountBought'; side: Side; mount: number }
  | { e: 'treasuryUp'; side: Side; level: number }
  | { e: 'ascendStart' | 'ageUp'; side: Side; age: AgeId }
  | { e: 'powerReady'; side: Side } | { e: 'powerTelegraph'; side: Side; power: CardId; x: number; zone: number }
  | { e: 'powerImpact'; side: Side; power: CardId; x: number; index: number }
  | { e: 'stanceChanged'; side: Side; stance: 'charge' | 'hold' }
  | { e: 'lastStandReady' | 'lastStandCharge' | 'lastStandFire'; side: Side }
  | { e: 'phaseChanged'; phase: 'regulation' | 'overdrive' | 'siege' }
  | { e: 'emote'; side: Side; emote: EmoteId }
  | { e: 'commandRejected'; side: Side; t: Command['t']; reason: string }
  | { e: 'matchEnded'; result: MatchOutcome };
export interface MatchOutcome { winner: Side | null; reason: 'baseDestroyed' | 'finalBell' | 'retreat' | 'draw'; tick: number;
  baseHpBp: [number, number] }
```

```ts
// sim.ts
export interface SideConfig { label: string; isBot: boolean; loadouts: Partial<Record<AgeId, Loadout>>;
  levels: Record<CardId, number>; skins: Record<string, SkinId> }
export interface Loadout { units: CardId[]; turrets: CardId[]; power: CardId }
export interface MatchConfig { seed: number; format: FormatId; content: CompiledContent;
  sides: [SideConfig, SideConfig]; modifiers?: string[]; training?: { enemyBaseStartBp?: number; noClock?: boolean } }
export interface UnitState { id: number; side: Side; card: CardId; level: number; x: number; prevX: number;
  hp: number; maxHp: number; shield: number; innateShield: number; mode: 'walk'|'attack'|'hold'|'retreat'|'leap'|'dying';
  targetId: number; impactTick: number; nextAttackTick: number; lastAttackTick: number; statuses: ActiveStatus[];
  air: boolean; summoned: boolean; timers: number[] }
export interface SideState { gold: number; xp: number; ageIndex: number; ascendUntil: number;
  queue: { card: CardId; progress: number; total: number }[]; pop: number; treasury: number; mountsOwned: number;
  turrets: (TurretState | null)[]; powerBp: number; stance: 'charge'|'hold'; stanceReadyTick: number;
  baseHp: number; baseMaxHp: number; lastStand: 'locked'|'ready'|'charging'|'used'; retreated: boolean }
export interface SimState { tick: number; phase: 'regulation'|'overdrive'|'siege'|'ended'; sides: [SideState, SideState];
  units: UnitState[]; projectiles: ProjectileState[]; casts: PowerCastState[]; rng: [number, number, number, number];
  nextId: number; outcome: MatchOutcome | null; hashes: number[] }
export interface Sim { readonly state: Readonly<SimState>; readonly config: Readonly<MatchConfig>;
  step(cmds: readonly TimedCommand[]): readonly SimEvent[]; hash(): number; observe(side: Side, delayTicks?: number): Observation }
export declare function createSim(cfg: MatchConfig): Sim;
export declare function replayMatch(r: ReplayDoc, content: CompiledContent, toTick?: number): Sim;
```

```ts
// observation.ts and bot.ts
export interface Observation { tick: number; side: Side; phase: SimState['phase'];
  me: { gold: number; xpBp: number; ageIndex: number; queueLen: number; pop: number; treasury: number; mountsOwned: number;
        turrets: (CardId | null)[]; powerBp: number; stance: 'charge'|'hold'; baseHpBp: number; lastStand: SideState['lastStand'];
        tray: CardId[]; turretCards: CardId[]; power: CardId };
  foe: { ageIndex: number; xpBp: number; powerBp: number; turrets: (CardId | null)[]; baseHpBp: number; scouted: CardId[] };
  units: { id: number; side: Side; card: CardId; p: number; hpBp: number; air: boolean }[] }   // p relative to observer
export interface BotProfile { generalId: string; tier: number; weights: Record<string, number>; openings: string[] }
export interface BotController { onTick(sim: Sim): TimedCommand[] }
export declare function createBot(profile: BotProfile, side: Side, seed: number, content: CompiledContent): BotController;
```

```ts
// art.ts (implemented by visuals, consumed by render and capsule)
export type ClipName = 'spawn'|'idle'|'walk'|'attack'|'hit'|'stun'|'die'|'victory'|'ability';
export interface Anchors { feet: Pt; head: Pt; muzzle: Pt; hitCenter: Pt }
export interface VisualDef { kind: 'placeholder'|'procedural'|'atlas'|'spine'; source: string; anchors: Anchors;
  scale: number; teamZones: string[]; clips: Partial<Record<ClipName | string, ClipRef>>; events: { attack: { impactAt: number } } }
export interface UnitPose { x: number; y: number; facing: 1 | -1; hpBp: number; shieldBp: number; stunned: boolean; alpha: number }
export interface UnitView { readonly root: import('pixi.js').Container; readonly anchors: Anchors;
  setPose(p: UnitPose): void; play(clip: ClipName | string, o?: { durationMs?: number; impactAtMs?: number; loop?: boolean }): void;
  freeze(ms: number): void; flash(ms: number, color?: number): void; update(dtMs: number): void; destroy(): void }
export interface ArtProvider {
  preload(ages: AgeId[]): Promise<void>;
  createUnit(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): UnitView;
  createTurret(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): TurretView;
  createBase(o: { age: AgeId; skin?: SkinId; side: Side }): BaseView;
  createBackdrop(o: { left: AgeId; right: AgeId; arena: string }): BackdropView;
  createProjectile(visualId: VisualId, side: Side): EffectView;
  createEffect(effectId: string, o?: Record<string, number>): EffectView;
  portrait(o: { card: CardId; skin?: SkinId; size: number; side?: Side }): Promise<string>; // data URL
}
```

```ts
// audio.ts
export type Bus = 'master' | 'music' | 'sfx' | 'ui';
export interface AudioService { unlock(): Promise<void>;
  play(id: SoundId, o?: { pitchBp?: number; volumeDb?: number; pan?: number; priority?: number }): void;
  setBusVolume(bus: Bus, v01: number): void;
  music: { setCue(cue: MusicCueId, o?: { fadeMs?: number }): void; setLayer(l: 'intensity'|'overdrive'|'siege', v01: number): void;
           transpose(semitones: number): void; duck(db: number, ms: number): void; stop(fadeMs?: number): void } }
```

```ts
// save.ts
export interface SaveDoc { v: number; createdAt: number; profile: { name: string; avatar: AvatarSpec; banner: string; frame: string; title: string };
  currencies: { amber: number; dust: number; wild: { rare: number; epic: number; legendary: number } };
  trophies: { current: number; best: number; roadClaimed: number[] }; arenaIndex: number;
  collection: Record<CardId, { level: number; copies: number; isNew: boolean }>;
  skins: { owned: SkinId[]; equipped: Record<string, SkinId> }; cosmetics: { owned: string[] };
  warPlans: { name: string; loadouts: Record<AgeId, Loadout> }[]; activePlan: number;
  capsules: { pending: PendingCapsule[]; charges: number; chargesUpdatedAt: number; dailyBank: number; dailyNextAt: number;
              bag: number[]; wardrobe: PendingCrate[] };
  pity: { sinceEpic: number; sinceLegendary: number; sinceNewCard: number; opened: number; wardrobeSinceEpic: number; wardrobeSinceLegendary: number };
  rng: { capsule: [number, number, number, number] }; scriptStep: number;
  quests: QuestState; collectionXp: number; collectionLevel: number; mmr: number; lossStreak: number;
  stats: ProfileStats; settings: Settings; tutorial: { step: number; hintsShown: Record<string, number> };
  lastExportAt: number | null; flags: Record<string, boolean> }
export interface PendingCapsule { id: string; kind: 'win'|'daily'|'road'|'age'|'ageUnlock'; tier: 'clay'|'bronze'|'silver'|'gold'|'aeon';
  startTier: string; contents: CapsuleContents; createdAt: number }   // rolled at grant time
export interface SaveStore { load(): Promise<SaveDoc | null>; save(doc: SaveDoc, o?: { immediate?: boolean }): Promise<void>;
  exportCode(doc: SaveDoc): string; importCode(code: string): SaveDoc; loadReplays(): ReplayDoc[]; pushReplay(r: ReplayDoc): void }
export type Migration = (doc: unknown) => unknown;
```

```ts
// meta.ts (pure; Clock injected)
export interface Clock { now(): number }
export interface MatchStats { trained: number; kills: number; turretKills: number; evolves: number; reachedFinalAgeAtMs: number | null;
  powerMaxHits: number; baseDamage: number; heavyKillsByAA: number; usedTreasury: boolean; usedLastStand: boolean; mvpCard: CardId | null }
export interface MatchResultInput { mode: 'ladder'|'skirmish'|'daily'|'tutorial'; outcome: MatchOutcome; mySide: Side; opponent: OpponentSpec; stats: MatchStats }
export interface Meta {
  newSave(content: CompiledContent, clock: Clock, seed: number): SaveDoc;
  applyMatchResult(s: SaveDoc, r: MatchResultInput, c: CompiledContent, clock: Clock): { save: SaveDoc; rewards: RewardStep[] };
  grantCapsule(s: SaveDoc, kind: PendingCapsule['kind'], c: CompiledContent, clock: Clock, o?: { tier?: string; age?: AgeId }): SaveDoc;
  openCapsule(s: SaveDoc, id: string): { save: SaveDoc; reveal: CapsuleReveal };
  openWardrobe(s: SaveDoc, id: string): { save: SaveDoc; reveal: WardrobeReveal };
  upgrade(s: SaveDoc, card: CardId, c: CompiledContent): Result<SaveDoc>;  craft(s: SaveDoc, id: string, c: CompiledContent): Result<SaveDoc>;
  validatePlan(plan: SaveDoc['warPlans'][number], s: SaveDoc, c: CompiledContent, format: FormatId): PlanIssue[];
  autoFill(s: SaveDoc, c: CompiledContent): SaveDoc['warPlans'][number];
  pickOpponent(s: SaveDoc, mode: MatchResultInput['mode'], c: CompiledContent, clock: Clock, o?: SkirmishOptions): OpponentSpec;
  tickTimers(s: SaveDoc, clock: Clock): SaveDoc;   // charges, daily capsule, quests reset
}
export interface OpponentSpec { generalId: string; displayName: string; isAI: true; tier: number; format: FormatId;
  side: SideConfig; modifiers: string[]; seed: number; warmUp: boolean }
```

```ts
// session.ts and platform.ts
export interface BattleSession { start(): void; pause(): void; resume(): void; setSpeed(s: 1 | 1.5 | 2): void;
  issue(c: Command): void; readonly hud: import('@preact/signals').ReadonlySignal<HudModel>;
  onEnd(cb: (r: MatchResultInput, replay: ReplayDoc) => void): void; dispose(): void }
export interface PlatformAdapter { init(): Promise<void>; loadingFinished(): void; gameplayStart(): void; gameplayStop(): void;
  commercialBreak(): Promise<void>; features: { reelReveal: boolean; externalLinks: boolean } }
```

## B16. Performance budget

| Item | Budget |
|---|---|
| Initial download | ≤ 3 MB gzipped (target 1.5 MB); total ≤ 8 MB |
| First frame / Play button | ≤ 3 s desktop, ≤ 5 s mid-range phone on 4G |
| Click to first spawn in the tutorial | ≤ 10 s |
| Frame rate | 60 fps on a 3-year-old mid-range phone and a 4 GB Chromebook; 30 fps floor in Lite |
| On screen | 80 units (with summons), 150 projectiles |
| Particles | 600 mobile, 1,500 desktop |
| Draw calls in battle | ≤ 25 |
| Sim step | ≤ 0.5 ms average on mobile; headless Full War < 50 ms desktop |
| Procedural bake | Ages 0-1 ≤ 400 ms at boot; others lazily |
| Audio pre-render | < 300 ms at boot |
| JS heap | ≤ 150 MB |
| DPR | Capped at 2 (1 in Lite) |

CI fails the build if the initial chunk exceeds 3 MB gzipped.

---

# Part C. v1 build plan

## C1. Principles for parallel work

- **Contracts first.** WP0 lands `src/contracts` and `src/core` before anything else. Every other package codes against the contracts and tests with the fakes in `src/contracts/fakes`. No package imports another package's internals.
- **One owner per file.** Each WP owns the paths listed below. Nobody edits another WP's files.
  - A needed change is requested as a short note in `docs/requests/<wp>-<topic>.md`, which the owner or the integration lead applies.
  - Contract changes are made only by the integration lead (the WP0 agent, which stays on as lead).
- **Dev pages without shared registries.** `src/dev/router.tsx` discovers pages with `import.meta.glob('./*/page.tsx')`. String namespaces are split per WP.
- **Content is authoritative.** WP2, WP3, WP4 and WP6 read card IDs, visual IDs and sound IDs from Part A. They can build before WP1 finishes.
- **Every WP ends green:** typecheck, lint and its own tests all pass, and it keeps a dev page where relevant.

## C2. Work packages

### WP0: Foundation, contracts, repo (integration lead; Phase 0; serial)

**Owns:**

- root configs, `index.html`, `.github/workflows/ci.yml`, `README.md`, `docs/**`
- `src/contracts/**`, `src/core/**`
- `src/dev/router.tsx`
- `src/app/main.tsx` stub (handed to WP11 at Phase 1 start)

**Tasks:**

1. `git init`. Create the private GitHub repo `ageborn` with `gh repo create ageborn --private` (the owner asked for a new repo) and push.
2. Scaffold Vite + TS + Preact + Pixi; set up ESLint layer and determinism rules, Vitest, Playwright.
3. Write CI: typecheck, lint, unit tests, build, size gate.
4. Write every contract in B15, with JSDoc.
5. Write the fakes: a mini content set with 2 ages × 3 units, a fake ArtProvider drawing rectangles, a recording FakeAudio, an in-memory SaveStore, a fixed Clock.
6. Implement `core` (sfc32 + xmur3, mulberry32, FNV-1a, bp math helpers, ring buffer, assert) with known-answer tests.
7. Copy this document to `docs/design.md`.

**DoD:** `npm run dev` shows a Pixi canvas with a Preact shell and a `?dev=1` page list; `npm test` and `npm run lint` pass; CI is green on GitHub.

### WP1: Content, strings, schema, compiler (Phase 1)

**Owns:** `src/content/**`, `src/i18n/index.ts`, `src/i18n/content.{en,da}.json`

**Tasks:**

- Encode every table in Part A exactly:
  - 5 ages, 4 formats, economy
  - 35 units, 20 turrets, 10 powers, 27 skins, cosmetics
  - capsule tables and bag, rarities, arenas, Trophy Road, 10 generals plus Echo, quests, daily modifiers
- Write `schema.ts`, `compile.ts` (ticks, bp, hash) and the i18n loader with fallback to EN.
- Write Danish strings for all content (names can stay English where they are proper nouns; descriptions are translated).

**Provides:** `CompiledContent` via `import { content } from '@/content'`.

**DoD:**

- Schema tests pass.
- A snapshot test of `contentHash`.
- A test that every card in A5 exists with the listed numbers (table-driven test file).

### WP2: Simulation (Phase 1; critical path)

**Owns:** `src/sim/**`

**Tasks:**

- Implement B3 completely: all A2 rules, every ability and power in A5, formats and phases, Last Stand, observation projection, replay record/replay, state hash.
- Use the WP0 fake content until WP1 lands, then switch to the real content.

**Provides:** `createSim`, `replayMatch`, `Observation`, the `SimEvent` stream.

**DoD:**

- All B13 sim tests pass: 10 golden replays, determinism, invariants, benchmark < 50 ms.
- A sandbox dev page (`src/dev/sandbox`, co-owned with WP5 via separate files `sandbox/simPanel.tsx`) can spawn any card on either side and step the sim.

### WP3: AI generals (Phase 1, after WP2's observation type exists; the contract is enough)

**Owns:** `src/ai/**`, `src/dev/botViewer/**`

**Tasks:**

- Implement the utility AI, the 10 tiers (interpolated), personalities, openings, mistakes, the attack clock, the gold estimator, the scripted Grogg brain, procedural commander names, and the Echo brain.

**DoD:**

- Fuzz test: no illegal commands in 500 matches.
- Tier ordering test: X beats I ≥ 90%, VII beats III ≥ 75%.
- Bot-vs-bot viewer page renders a match (headless summary if WP5 is not ready).

### WP4: Visuals and art provider (Phase 1)

**Owns:** `src/visuals/**`, `src/dev/gallery/**`, `docs/art-style.md`

**Tasks:**

- Deliver the placeholder adapter on day one.
- Build the procedural adapter:
  - 7 rigs, part libraries for 5 ages, all 35 units, 20 turrets, 5 bases with crumble states, 5 × 3-layer backdrops plus 8 arena ground layers
  - projectiles and effects for every attack and power
  - all 27 skins
  - team presets and colourblind presets
  - bake to atlas, portraits
- Leave stubs for the atlas and spine adapters with the same interface.

**DoD:**

- The gallery shows every visualId × clip × skin × team.
- The silhouette IoU check for skins (≥ 0.85) runs as a test on baked masks.
- Bake budgets are met.
- `docs/art-style.md` records the palette, outline, proportion and pivot conventions for future artists.

### WP5: Battle view, feel layer, HUD (Phase 1, against fakes; integrates WP2/WP4/WP6 in Phase 2)

**Owns:** `src/render/**`, `src/ui/hud/**`, `src/i18n/hud.{en,da}.json`, `src/dev/feel/**`, `src/dev/sandbox/view*.tsx`

**Tasks:**

- `BattleView`: layers, interpolation, camera (fit plus mobile pinch-follow), event mapper, hitstop, shake, flash, numbers, particle pool, health bars with ghost segments, power drag targeting, mount interaction.
- Split-age backdrop control and the evolve sequence.
- The full A12 juice table in `feel.config.json`.
- The DOM HUD from A9.2 with every card state, the Scouted strip, the phase timeline, and the pause and speed buttons.
- Graphics presets and the Auto fallback.

**DoD:** the sandbox renders a full bot-vs-bot Full War at 60 fps on desktop, with every event mapped (checklist A12 items 1-6 verified on 5 sample cards).

### WP6: Audio (Phase 1)

**Owns:** `src/audio/**`, `src/dev/soundboard/**`

**Tasks:**

- WebAudio service, mixer (buses, voice limits, retrigger gap, variation, ducking), iOS unlock.
- ZzFX definitions for every sound ID in A13.
- Sequencer, three "Dawn March" candidates, 5 age arrangements, menu and capsule loops, stingers, layers, transposition.

**DoD:**

- Soundboard plays every ID and cue.
- Pre-render < 300 ms for boot sets.
- No clipping with 40 simultaneous hits (limiter on master).

### WP7: Meta rules (Phase 1)

**Owns:** `src/meta/**`

**Tasks:** everything in B9 and A6: new save, rewards, charges and daily timers, bag, roll, pity, script, wardrobe, upgrades, crafting, dust, War Plan validation, auto-fill and advisor, trophies and arenas and road, quests, Collection Level, MMR and opponent picking (with A6.8 level rules), daily modifiers.

**DoD:** all meta tests in B13 pass, including 10^6-opening statistics (run in `tools/drops.ts`, with a 10^5 variant in unit tests).

### WP8: Save system (Phase 1)

**Owns:** `src/save/**`

**Tasks:** schema (Valibot) for SaveDoc, defaults, localStorage store with dual slots and checksums, debounce and flush hooks, migrations framework with the v1 fixture, export/import codes and files, replay ring, event log store, `persist()` call helper.

**DoD:** round-trip, corruption-fallback and migration tests pass; quota errors are caught with a user-facing message.

### WP9: Meta UI screens (Phase 1 against fakes; Phase 2 wiring)

**Owns:** `src/ui/router.ts`, `src/ui/theme.css`, `src/ui/components/**`, `src/ui/screens/**` (except `hud` and `replay`), `src/i18n/ui.{en,da}.json`

**Tasks:**

- Screens 2-4, 6-7 and 9-13, plus 15 (A9).
- Components: card tile, copies bar, rarity frames, currency chips, buttons, modal, tabs, odds sheet, toasts.
- Responsive landscape layout and the portrait rotate overlay.
- All text through i18n. Touch targets ≥ 48 px.

**DoD:** every screen renders with the fake save in states new player, mid-game and maxed; keyboard navigation works; EN and DA strings are complete.

### WP10: Capsule and crate show (Phase 1)

**Owns:** `src/capsule/**`, `src/i18n/capsule.{en,da}.json`, `src/dev/capsuleBench/**`

**Tasks:** the full A10 storyboard in Pixi plus DOM (climb, burst, card fan, rarity pre-signal, walkout, duplicates, summary, Open all) and the Wardrobe reel with the `reelReveal` flag. It consumes the `CapsuleReveal` and `WardrobeReveal` data only.

**DoD:**

- The bench page can play every tier, a first-time and a repeat Legendary, and 10-capsule "Open all".
- No step exceeds the time limits.
- Skip and fast-forward work.

### WP11: App integration, session, onboarding, platform, replay viewer (Phase 1 scaffolding, Phase 2 integration)

**Owns:** `src/app/**`, `src/platform/**`, `src/tutorial/**`, `src/i18n/tutorial.{en,da}.json`, `src/ui/screens/replay/**` (lives in `src/app/screens/replay`)

**Tasks:**

- Boot sequence and service wiring (`services.ts` builds real or fake implementations).
- `BattleSession` loop (B6) with bots, pause, speed and freezes.
- Result → meta → save flow.
- Tutorial director with scripts (A8), adaptive hints and the event log.
- Replay recording and the viewer.
- Daily Challenge wiring and platform adapter `none`.
- Visibility pause (auto-pause when the tab is hidden).

**DoD:**

- A fresh profile plays A8 end to end.
- Ladder, Skirmish and Daily modes work.
- Replays of the last 20 matches play back with an identical outcome.

### WP12: Tools, integrity tests, CI, e2e (Phase 1 start, Phase 3 lead)

**Owns:** `tools/**`, `tests/**`, `.github/workflows/ci.yml` (from Phase 1 on)

**Tasks:**

- `sim-cli` balance matrix, economy sim, drop stats, replay verify, CSV round trip.
- Integrity tests (IDs, i18n keys, layer graph).
- Playwright smoke.
- CI stages (smoke balance on push; full balance via manual workflow_dispatch).
- The autopilot URL flag (in coordination with WP11).

**DoD:** all tools run and produce reports under `reports/` (git-ignored); CI is green.

### Phase 3: balance and polish (one tuning agent plus the lead)

- **Ownership.** After Phase 2 the tuning agent takes ownership of the numbers in `src/content/units/**`, `turrets/**`, `powers.ts` and `economy.ts`.
- **Loop:** run the full matrix → change numbers only (never rules) → rerun, until the A2.14 targets pass.
- **Record.** Each tuning change is logged with before and after metrics in `docs/balance-log.md`.
- **Polish.** In parallel, WP4, WP5 and WP6 owners run a polish pass against the A12 checklist and the manual checklist (C5).

## C3. Dependency order and checkpoints

```
Phase 0:  WP0 ───────────────────────────────────────────────┐
Phase 1:  WP1  WP2  WP4  WP6  WP7  WP8  WP9  WP10  WP12(tools skeleton)  WP3 (from WP2 contract)  WP5 (fakes)  WP11 (scaffold)
Phase 2:  WP5 + WP11 integrate real sim/content/visuals/audio; WP9 + WP10 wired to meta/save; WP12 integrity + e2e
Phase 3:  Balance tuning (content numbers) + polish pass
Phase 4:  Release candidate: manual checklist, perf on real phone + Safari, bug bash
```

**Critical path:** WP0 → WP2 → WP3 → WP12 matrix → Phase 3 tuning. The second chain is WP4 → WP5 → WP11.

**Owner test checkpoints** (each one is playable with `npm run dev`):

| Checkpoint | Contents | Needs |
|---|---|---|
| A: battle slice | "Quick Battle" dev route; Short War vs a tier III bot; placeholder art allowed; HUD, evolve, turrets, one power, sounds | WP2, WP3 basic, WP5, WP4 placeholder, WP6 basic |
| B: full battle | All 5 ages and 55 cards, all powers, phases, Last Stand, procedural art, music | Phase 1 complete, Phase 2 battle integration |
| C: full loop | Onboarding, capsules, War Plan, collection, upgrades, Trophy Road, quests, save/export, replays | Phase 2 complete |
| D: release candidate | Balanced, polished, checklist passed | Phases 3-4 |

Checkpoint A is the fun gate. If the core loop does not feel good there, feel and rule tuning comes before more meta work.

## C4. Definition of done (v1)

1. **Code health.** `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` and `npm run build` all pass locally and in CI. The initial chunk is ≤ 3 MB gzipped.
2. **Content.** Every card, power, skin and cosmetic in Part A exists, validates, has a procedural visual with all clips and sounds, and has EN and DA strings.
3. **Rules.** Every rule in A2 has at least one unit test. The 10 golden replays pass. Determinism holds across two runs and across Chromium and WebKit e2e.
4. **Balance.** The A2.14 targets pass in a 400-match full run (report committed to `docs/balance-log.md`).
5. **Meta honesty.** Published odds pass the chi-square test at p > 0.01; pity boundaries and the onboarding script are verified; capsule results persist before animation.
6. **Bots.** AI labeling appears on every surface listed in A7.1. No bot uses information outside `Observation`.
7. **Save durability.** Survives reload, a corrupt slot and an export/import round trip; the v1 migration fixture exists.
8. **Performance.** B16 budgets are met on a mid-range Android phone (Chrome) and an iPhone (Safari), measured on the Full War sandbox with 80 units.
9. **Manual test.** The C5 checklist passes with no blocker or major bugs open.

## C5. Manual test checklist

**First session**

1. Fresh profile: page load to the Play button ≤ 3 s on desktop; one tap into match 1; the first Bonker spawns ≤ 10 s after the click.
2. Tutorial beats from A8 appear in order, text ≤ 8 words, each hint at most once.
3. The first evolve shows the full sequence: freeze, flash, pillar, base morph, backdrop wipe from the base, banner, music key lift, allied cheer hop.
4. Arrow Storm drag shows the zone and telegraph, then hits.
5. Capsule 1 climbs to Bronze and reveals Spear Hunter NEW, auto-equipped.
6. Capsule 2 gives Pikeman and Grenadier; the forced Bonker upgrade plays the slam.

**Battle rules**

7. Two melee units fight side by side; a Spear Hunter hits from behind them; Pebblers fire over allies.
8. Train 5 units quickly: the queue shows 5, a 6th tap is denied with the deny feedback, and cancel refunds.
9. Reach 20 pop: the card shows ARMY FULL and the queue head waits.
10. A second Legendary cannot be queued while one is alive or queued.
11. Buy mounts 2-4 at 150/350/700; build and sell turrets (50% refund); old-age turrets keep firing after an evolve.
12. Turrets never hit the base; no turret shot lands beyond 480 lu from its gate.
13. Hold stance pulls units back to the hold line; Charge sends them forward; the 2 s toggle cooldown works.
14. Power charge carries at most 50% across an evolve; the telegraph is visible to both sides; Legendaries take half power damage.
15. Overdrive, Siege and Final Bell trigger at the format times with their visuals and sounds; Siege decay is visible on both bases.
16. Last Stand unlocks at 25%, fires on tap after 1 s, auto-fires at 10%, and only once.
17. Retreat is unavailable before 1:00 and counts as a loss.
18. Pause stops everything; 1.5x and 2x speed work; hiding the tab auto-pauses.
19. Air: the Balloon Admiral ignores melee and bombs; Flak prioritises air; melee cannot hit air.
20. Each Epic and Legendary ability works as written: pounce, stomp and riders, Ram siege, Roar shields, crash, Time Stop, EMP, called strikes, mark, gravity pull, toad drag.

**Meta**

21. A win grants trophies, Amber and a capsule while charges are available, and 40 Amber when none are.
22. Charges bank to 12; the daily capsule banks to 3; the loss protection "Warm-up match" appears after 3 losses.
23. The odds sheet shows the bag state and pity counters, and the counters match what happens.
24. "Open all" works for 10 capsules; reloading mid-animation keeps the same result.
25. An upgrade spends copies and Amber, raises stats by +5% (card detail preview matches), and grants Collection XP.
26. A copy past L10 becomes Dust; crafting a card and a skin works; Mythic cannot be crafted.
27. The War Plan builder enforces the rules, shows advisor warnings, and auto-fill works; presets save.
28. The Trophy Road claims nodes; Arena 2 unlocks the Standard format, Stampede and the Modern Age Unlock Capsule.
29. Quests progress from real matches; reroll works once per day.
30. The Wardrobe Crate reel stops on the pre-rolled skin; the flag-off card flip also works.

**Presentation and platform**

31. Every opponent shows the AI badge on VS, the HUD nameplate, the result screen and history. About says "All opponents in this version are AI."
32. Colourblind presets and reduce motion change visuals as specified; volume buses work separately.
33. DA language switches every screen, with no missing keys.
34. Save export code and file both import on a fresh browser profile.
35. A replay from history plays to the same result; seeking works.
36. Performance: Full War sandbox at 60 fps on desktop and ≥ 30 fps in Lite on a mid-range phone; no console errors.
37. iPhone Safari: sound plays after the first tap; the layout respects safe areas; portrait shows the rotate overlay.

---

# Part D. Roadmap and risks

## D1. Roadmap after v1

**v1.1: retention and clips (next iteration)**

- **Clip Mode:**
  - a 9:16 follow camera and a no-UI or big-UI toggle
  - a rolling 30 s `canvas.captureStream` + MediaRecorder buffer
  - automatic highlight triggers (evolve, Legendary pull, comeback from < 25% base HP, multi-kill ≥ 5 in 2 s)
  - a small watermark
- **Replay-to-clip renderer:** re-simulates a replay offscreen at any aspect ratio and speed. It also produces a "Stone to Future in 30 s" montage.
- **Marketing workflow.** Claude drafts clips and captions into an approval queue. The owner approves each post with one click, and nothing ever posts without that approval.
- "Ghost of You" local ghosts (your recorded War Plan and behaviour profile, labeled as ghosts).
- About 20 achievements.
- More quests.
- The "Who wins?" sandbox (for example 100 Bonkers vs 1 Chrono Titan).
- Screenshot tests for the gallery.

**v1.2: content and modes**

- The sixth age, Bronze/Antiquity (+11 cards, 2 powers, base, backdrop, arrangement), inserted as data.
- 1-2 extra cards per age.
- The "Chronicle" campaign (~30 levels with disclosed modifiers).
- Endless Horde mode.
- Weekly events (kaiju boss).
- Portrait layout.
- PWA install (manifest plus service worker cache).
- Star levels (cosmetic prestige for L10 cards).

**Online 1v1 (first multiplayer milestone)**

- **Server.** Colyseus 0.17 room in `server/` hosting the same `src/sim` code (split into a workspace package at that point).
- **Netcode:**
  - Authoritative input relay: the server stamps commands at the execution tick now + 4 (200 ms, hidden by the spawn gate animation).
  - Clients simulate deterministically; hashes are compared every 20 ticks.
  - On mismatch or reconnect, the server sends a snapshot; the server keeps the command log for verification.
- **Rules for PvP:**
  - No pause or speed.
  - Global hitstop becomes view-only.
  - Ranked caps cards at L8.
  - The trophy ladder matches within ±1 average level.
  - AI Generals remain on the ladder with their AI labels when queues are thin.
- **Infrastructure:** accounts (optional sign-in), cloud save behind `SaveStore`, and anti-tamper, meaning the server rolls capsules for online accounts.

**2v2**

- One lane; each team shares one base (HP ×1.6) and 4 mounts (2 per player).
- Gold, XP, War Plans and ages stay individual. The team base's age is the highest age on the team.
- Pop cap 14 per player.
- Emotes only; no chat.
- Bot fill for missing players, labeled AI.

**Mobile app**

- Capacitor 8 wrapper with native storage (Preferences/SQLite) behind `SaveStore`, haptics and store assets.
- The same web build otherwise.
- Portal SDK adapters (Poki or CrazyGames/Y8). The Poki exclusivity decision is made before any portal launch; a Poki build disables the reel.

**Art upgrades (any time)**

- Tier 1: AI-generated or painted parts in the same rigs.
- Tier 2: AssetPack atlases.
- Tier 3: Spine.
- Units swap one at a time through the visual manifest. The gallery before/after doubles as devlog content.

## D2. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Core loop not fun enough (Clash Mini died of this) | Fatal | Checkpoint A is a fun gate before meta polish; feel values are tunable live; owner playtests every checkpoint |
| Procedural art looks cheap | Weak first impression | Strict style guide, 7 shared rigs polished well, effort focused on the evolve moment and capsules, swap path ready from day one |
| Content volume (55 cards, 27 skins, 5 bases) overruns | Late v1 | Shared rigs and part libraries, skins as overlays, the gallery for fast review; fallback: ship skins in v1.1 before cutting any card |
| Balance across 55 cards and 5 ages | Dominant strategy | Headless matrix in CI, ±3 point rule, turret range cap, no Legendary turrets, numbers-only tuning phase |
| Bots feel dumb, repetitive or unfair | Churn, distrust | Personalities, 10 tiers, openings with seeded variation, intelligent mistakes, attack clock, identical rules, visible AI labels |
| Determinism breaks across browsers | Replays break; online blocked later | Integer-only sim, lint bans, golden replays in Chromium and WebKit from Phase 1 |
| Parallel agents collide on files or contracts | Integration churn | Single ownership per path, frozen contracts, request notes, glob-based dev routing, namespaced string files |
| Save loss (Safari 7-day eviction, cleared data) | Lost trust | Dual slots with checksum, export/import, backup reminder, `persist()`; Capacitor native storage later |
| Capsules read as gambling | Portal rejection, backlash | Earn-only forever, no store or payment code, published bag odds, visible pity, pre-rolled results, no staged near misses, reel behind a flag |
| Economy pacing too fast or too slow | Boredom or grind | 365-day economy sim with ±20% gates; every reward is a data knob |
| Match length drifts | Stalemates or abrupt games | Format clocks set hard limits; CI checks the length distribution |
| iOS audio unlock and mute switch | Silent game on iPhones | Unlock on first gesture; a Settings note about the mute switch |
| TypeScript or tooling version churn (TS 7, Vite 8) | Broken builds | Exact version pins, lockfile committed, TS 7 deferred |
| Name or trademark conflict | Forced rename | TMview and domain checks before any public link; the name lives in one config constant and the i18n files |
| PvP population small later | Empty queues | PvE, AI Generals, Echo and Ghost modes carry the game; PvP is never the only fun mode |
