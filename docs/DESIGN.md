# Ageborn v1: definitive design document

This document is the single source of truth for the v1 build. Version 1.1, 2026-09-27.

The document has four parts plus an appendix:

- **Part A:** game design.
- **Part B:** technical architecture.
- **Part C:** build plan for parallel agents.
- **Part D:** roadmap and risks.
- **Appendix:** rejected critique points.

**Conventions**

- "MUST" marks a hard requirement. "SHOULD" marks a default that may be tuned.
- Every number is a starting value. Numbers live in data files. The headless balance sim (B12) checks them against the targets in A2.14 before anyone judges them by feel.
- Units:
  - lu = lane unit.
  - tick = 50 ms (20 Hz).
  - bp = basis points (10,000 = 100%).
  - P = age power scale.
  - L = card level.
- Card IDs are the snake_case slugs in the content tables (for example `spear_hunter`). Every visual, effect, sound and music ID is listed in A14.

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

The backbone is **nostalgia-core**. It fits the brief best, and its numbers hang together: flat role prices, stats scaled by P, and a base HP that scales with P, so time-to-kill stays the same in every age.

The following ideas are grafted in:

| From | Graft | Where |
|---|---|---|
| meta-collection | Match formats (Short War 3 ages, Standard 4 ages, Full War 5 ages), gated by arena, so new players get short matches first | A2.10, A6.3 |
| meta-collection | Time Capsule tier drawn from a 100-slot shuffle bag (exactly 30/40/20/7/3 per 100), which is honest and low-variance | A6.4 |
| meta-collection | New-card protection, a scripted first Legendary walkout (Mammoth Matriarch at capsule 5), Age Unlock Capsules | A6.5, A8 |
| meta-collection | Deck advisor warnings, "Scouted" list of opponent cards, "Echo of You" mirror bot, Legendaries take 50% power damage | A3, A7, A2.9 |
| meta-collection | Age Power charge carries over an evolve, capped at 50% (a middle ground between reset and full carry) | A2.4 |
| feel-and-ship | Event-by-event juice table, "soft single file" spacing plus two-wide front rank, targeting priorities, support units that follow the front | A12, A2.7 |
| feel-and-ship | Bot attack clock, counter-hint rules, local instrumentation log, skin silhouette parity check | A7, A8, A11 |
| feel-and-ship | Strict v1 scope discipline: achievements, campaign, clip mode and a sixth age move to v1.x | Part D |
| Brief | Save lives in localStorage with a versioned schema and migrations (IndexedDB is deferred behind the same interface) | B8 |

Also changed from the backbone:

- **Melee ranges shortened.** Melee is 12-20 lu so fighters visibly touch; reach is 55-70 lu. Range is always measured edge to edge.
- **Simpler repo.** A single npm package with folder layering replaces the pnpm multi-package workspace. Agents hit fewer tooling failures, and lint still enforces the layering.
- **Starter kit changed.** It holds every common plus each age's Anti-armor Rare (granted by script and Age Unlock Capsules). A new player therefore always has a full counter triangle.

### 0.3 Review round

Version 1.1 applies three critiques (player, builder, balance). Points that were rejected, merged with another critique's version, or implemented differently are listed in the appendix.

---

# Part A. Game design

## A1. Vision and pillars

**Working title: Ageborn.** Tagline: "From clubs to lasers in one battle."

Ageborn is a one-lane tug-of-war battler. Two bases face each other, warriors walk and fight on their own, and turrets sit on the base. XP pushes you into the next age, and each age has one big Age Power. Around the battle sits a Clash Royale-style meta:

- a War Plan (one loadout per age)
- a collection with rarities and foil variants
- Time Capsules with an exciting, honest reveal
- upgrades, skins, a Trophy Road and a Conquest board

No real money exists anywhere in the game.

Before public use, the name needs a TMview (EUIPO/USPTO) and domain check. "Age of War" never appears in the title, tags or keywords.

**Pillars (priority order)**

1. **Familiar in 10 seconds.** Tap a card and a warrior walks out and fights. Match one teaches by doing and ends with lasers.
2. **Evolving is the best moment of every match.** It brings a big visual transformation, new-age troops on the lane at once, and a music key change.
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
| Training queue of 5 | Keep; queued units upgrade to the new age on evolve |
| 4 turret slots, 50% sell refund | Keep, plus one-tap Modernise. Range capped at 480 lu (40% of the lane); turrets never hit bases |
| Kill bounty 130% of cost (AoW1) | 60% of cost; kills by powers pay 30% and no XP |
| XP when your own unit dies | Keep at 40% of cost |
| Free special on a cooldown | Keep as a charge meter; it never costs XP |
| Unit prices inflating 15 → 150,000 | Flat prices by role; power comes from age and card level |
| AI with free gold and timer evolution | Bots use the same economy, the same command API and only a limited observation |
| Turtling, AFK farming, 40-minute stalemates | Match clock with Overdrive, Siege and Final Bell; XP from base damage; turret caps; bots that refuse to feed turrets |
| Queued units idle behind the front | Two-wide melee front rank; reach and ranged units attack from behind; faster units overtake parked ranged units |
| Slow walking, no pause, mute or save | ~17 s lane crossing, 1x/1.5x/2x speed, pause, 4 volume buses, autosave plus export |
| Flashing evolve reminder | Steady glow only |
| Army of Ages wiping units on evolve | Units and turrets survive evolving |

## A2. Core battle rules

### A2.1 Lane, coordinates, camera

- **Lane.** 1,200 lu from the left gate (world x = 0) to the right gate (x = 1,200).
  - The player (side 0) is on the left, faces right and plays blue. The opponent (side 1) is on the right, faces left and plays orange.
  - Each base occupies 140 lu behind its gate, outside the fighting area.
- **Progress.** Each side measures progress p from its own gate: side 0 has p = x, side 1 has p = 1,200 − x. Rules below use p unless stated.
- **Key positions:**
  - spawn at p = 20
  - hold line at p = 320
  - turret range cap 480 lu, measured from the own gate
  - mid-lane at p = 600
  - power zone centres clamped to p ∈ [150, 1,050]
- **Crossing time.** Speeds run 35-100 lu/s. Standard infantry (70 lu/s) crosses in ~17 s.
- **Camera.**
  - The whole world (1,200 lu lane plus both bases plus a 40 lu margin, 1,560 lu) fits the lane band of the screen by default, using one world scale (px per lu = lane band width / 1,560). There is no scrolling.
  - On screens narrower than 900 CSS px, a pinch zooms up to 1.6x with a camera that follows the midpoint of the two front lines (lerp k = 0.08 per frame at 60 fps, scaled by dt). A double tap resets it.
- **Screen layout (landscape, v1 is landscape only):** top bar 12% of height, lane band 64%, bottom tray 24%. Portrait shows a "Rotate your device" overlay.
- **Depth.** The sim is 1D. The view places units in three depth rows by their rank in the side's order: the two front-rank units get y = −8 and +8 lu, and every other unit gets y = −16, 0 or +16 lu by (rank index mod 3). The view depth-sorts by y. The sim spacing is unaffected.

### A2.2 Bases and the age power scale

| Age index | Age | P | P (bp) | Base max HP |
|---|---|---|---|---|
| 0 | Stone | 1.00 | 10,000 | 10,000 |
| 1 | Medieval | 1.35 | 13,500 | 13,500 |
| 2 | Gunpowder | 1.82 | 18,200 | 18,200 |
| 3 | Modern | 2.46 | 24,600 | 24,600 |
| 4 | Future | 3.32 | 33,200 | 33,200 |

- Base max HP equals 10,000 × P. A2.14 checks that a full unopposed army needs 40-60 s to destroy a base.
- P is already baked into every card stat in A5 (tables list final level-1 values for their age).
- Base max HP follows the owner's current age.
- On evolve the base keeps its HP percentage and then heals 5% of the new max, capped at max.
- An age-N unit beats its age N−1 counterpart one-on-one with about half its HP left. A same-gold army is ~1.8x stronger: a real edge that turrets and the defender's short walk can hold for 20-40 s.
- Bases do not attack, except Last Stand (A2.11).
- Each base shows its Treasury level (gatherer count) and, while Last Stand is armed, a horn icon.

### A2.3 Gold (in battle)

Gold and XP are stored internally in milli-units.

| Rule | Value |
|---|---|
| Starting gold | 175 |
| Passive income | 6 gold/s (×2 in Overdrive and Siege) |
| Treasury upgrade | 3 levels, each +1.5 gold/s; costs 200 / 350 / 550 (payback 133 / 233 / 367 s). Treasury income is never doubled by Overdrive. The art changes per age (gatherers, farm, trade cart, factory, fusion core); the numbers do not |
| Kill bounty | 60% of the victim's card cost, credited to the killing side for kills by units, turrets and unit abilities |
| Power and Last Stand kills | 30% of the victim's card cost in gold, no XP |
| Underdog bounty | +50% gold and XP when the victim's card age index is higher than the killer side's current age index. It is off while the killer side's Evolve is available |
| Summoned units (riders, Paratroopers, Vanguard) | No bounty and no loss XP for either side |
| Unit and turret prices | Flat across ages (A5) |
| Turret sell refund | 50% of turret cost (slot purchases are never refunded) |
| Modernise | New turret price minus 50% of the old turret's price |
| Turret slots | Mount 1 free; mounts 2 / 3 / 4 cost 150 / 350 / 700 |

### A2.4 XP and evolving

| XP source | Value |
|---|---|
| Passive trickle | 4 XP/s (×2 in Overdrive and Siege) |
| Killing an enemy unit with a unit, turret or unit ability | 100% of its card cost (+50% underdog) |
| Killing with an Age Power or Last Stand | 0 |
| Losing your own unit (not summons) | 40% of its card cost |
| Damaging the enemy base | 12 XP per 1% of that base's current max HP (XP = damage × 1,200 / maxHp) |

- **Thresholds.** Medieval 700, Gunpowder 1,000, Modern 1,200, Future 1,500. Excess XP carries over.
- **XP cap.** XP never exceeds 1.5× the current threshold (1,050 in Stone). In the final age of the format the cap is 1,200.
- **Expected timing.** Active play earns 14-17 XP/s, so evolutions land near 1:00, 2:05, 3:20 and 4:50. Passive XP alone reaches Medieval at 2:55, so nobody is frozen in an age.
- **Evolve command:**
  - Valid when XP ≥ threshold, current age < the format's max age, and not already ascending.
  - A 2.5 s Ascension (50 ticks) follows. The training timer pauses and turrets keep firing. Every other command stays legal; anything built or trained during Ascension uses the old age.
  - At the end (`ageUp`): age +1, XP −= threshold, base HP rescaled (A2.2).
  - Age Power charge becomes min(charge, 50%).
  - The tray swaps to the new age's loadout.
  - **Queue conversion.** Each queued item converts to the new loadout's card of the same role group (Infantry, Ranged, Heavy, Anti-armor, Support, Epic, Legendary), keeping its training progress. Prices are flat within a group, so nothing is charged or refunded. If the new loadout has no card of that group, the item keeps its original card.
  - **Vanguard.** 2 of the new age's Common Infantry spawn free at p = 20 at the side's level for that card. They are summoned: no pop, no bounty.
- **Units and turrets already built are unchanged.** Old turrets keep their original stats and show a Modernise arrow.
- **Final age of the format (Overcharge).** While Age Power charge is below 100%, every 1,200 XP is consumed and adds +25% charge.
- **Visibility.** Both XP bars (with age icons) are always visible, so the evolve race is part of the show. The Evolve button sits on your own XP bar and glows steadily when ready. It never flashes.

### A2.5 Ages in v1

| Age | New mechanic introduced |
|---|---|
| Stone | Basics: melee, ranged, heavy, knockback, first-hit charges, ricochet |
| Medieval | Reach (second-rank attacks), shields, damage resistance, siege damage to bases |
| Gunpowder | Splash artillery, pulls, the Mech tag, first Air unit (Legendary bomber) |
| Modern | Air as a regular option, suppression, marking, called strikes |
| Future | Energy shields, EMP stuns, time control |

Ages are data. A sixth age (Bronze/Antiquity between Stone and Medieval) is planned for v1.x and MUST require only content, visuals and audio entries.

### A2.6 Roles, tags and damage modifiers

**Tags:** `light`, `armored`, `bio`, `mech`, `ground`, `air`, `legendary`, `support`, `ranged`, `melee`.

**Roles:** Infantry, Ranged, Heavy, Anti-armor (AA), Support, plus Epic and Legendary specialists. Each card also has a **role group** (Infantry, Ranged, Heavy, Anti-armor, Support, Epic, Legendary) used by pop, queue conversion and bot scoring.

Each attack carries an ordered `mods` list. The **first** mod whose tag the target has applies; otherwise the multiplier is ×1.0. Role defaults:

| Attacker role / attack | Mods (in order) |
|---|---|
| Infantry melee ("blunt") | armored ×0.70 |
| Melee Anti-armor (Spear Hunter, Pikeman) | armored ×2.0, mech ×2.0, light ×0.75 |
| Ranged Anti-armor (Bazooka Trooper, Rail Gunner) | armored ×2.0, mech ×2.0, light ×0.5 |
| Grenadier | armored ×1.5, mech ×1.5, light ×0.5 |
| Everything else | none (×1.0) |
| Flak Gun | air ×2.0 |
| Congreve Rack | air ×1.5 |

**Hitting air.** Every attack states `hitsGround` and `hitsAir` explicitly (the "Hits" column in A5: G, A or G+A). There is no implicit rule. Melee attacks never hit air.

**Area attacks.** Splash, cleave, chain, pierce, line, gate zone and follow-behind attacks deal 100% to the primary target and 50% to every other target, and hit at most 4 targets in total unless the card says otherwise. Target counts always include the primary. Reach for cleave, pierce and follow-behind is measured from the primary target's centre, away from the attacker; chain hops are measured from the previous target. For splash aimed at a point, the primary is the enemy whose centre is nearest the impact. Age Powers, Last Stand and death explosions are exempt, because they are tuned by coverage (A2.9).

**Counter triangle:**

- Heavy beats Infantry (armor).
- Anti-armor beats Heavy.
- Infantry beats Anti-armor (cheap, and takes reduced damage).
- Ranged supports everything but dies fast once reached.
- Splash punishes clumps. Air punishes melee-only armies.

Every card detail screen shows "Strong vs" and "Weak vs", derived from the counter matrix (B4).

### A2.7 Combat rules (simulation level)

**Sizes (collision width).** small 24, medium 32, large 48, huge 80 lu.

Edge distance between two entities = |xA − xB| − (wA + wB)/2, minimum 0. All ranges are edge distances. Range to a base is the edge distance from the unit to the enemy gate line.

**Overlap.** Transient overlap is legal (spawns, landings, pulls, drags, knockback). Movement may never increase overlap with an enemy. An overlapping enemy counts as blocking at edge distance 0. Spawn always happens at p = 20.

**Movement (ground):**

- A unit advances at its speed unless it has a valid target in range for its first attack.
- A unit cannot move into the nearest enemy ground unit ahead of it (it stops at edge distance 0).
- **Soft single file with a two-wide front.** Each tick, sort a side's ground units by p descending, then id ascending. Unit 1 and unit 2 form the front rank: unit 2 may walk up to unit 1's position. From unit 3 on, a unit may not come closer than (wA + wB) × 0.3 centre to centre behind the ally directly ahead.
  - The result: two melee units fight side by side, reach units (range ≥ 55) hit from the third position, and Infantry (range 16) can hit from the third position against small targets.
- **Overtaking.** These ally caps apply only against an ally ahead that is moving, or whose longest attack range is ≤ the mover's longest attack range. A unit may pass a stationary ally with a longer range, so melee is never stuck behind parked ranged units or artillery.
- **Symmetric resolution.** Both sides' desired moves are computed from pre-move positions. If the two fronts would overlap, each side gets floor(gap / 2) of the remaining gap.
- **Support followers.** Units with `followSupport` never advance beyond (frontmost friendly non-follower ground unit p − 60 lu). If no such unit exists, they advance to at most p = 200.

**Air units:**

- They ignore all blocking and fly at their speed.
- Gunships stop when a valid target is in range and obey stance.
- The bomber never stops and ignores Hold. It drops bombs every interval if any ground enemy is within ±40 lu of its x, and stops only at the enemy gate to bomb the base.
- Air units are immune to knockback and pulls.
- A Repair Drone follows the support rule above.

**Stance (per side, 2 s toggle cooldown):**

- **Charge** (default): advance.
- **Hold:** ground units with p > 320 that have no target in range walk back to 320 at 70% speed. Units at or below 320 do not advance past it. Engaged units keep fighting. Gunships obey stance; the bomber does not.

**Targeting:**

- Candidates are enemy units in range that the attack can hit (either direction). The enemy base (`targetId = −1`) is a candidate only when no unit candidate exists.
- Priority:
  - `front`: minimum edge distance, ties to the lower id.
  - `armored`: armored or mech first, then front.
  - `backline`: ranged or support first.
  - `air`: air first.
  - `densest`: the x that maximises summed enemy cost within the splash radius, scanned in 10 lu steps.
- **Stickiness.** A unit keeps its target until the target dies, leaves range (+20 lu leash) or becomes unhittable. Every 1.0 s it re-checks and switches if a candidate has a higher priority class or is at least 60 lu closer.
- **Self-defence.** A ranged unit switches at once to any enemy within 30 lu (edge distance) of itself.
- Turrets use `front` measured from their own gate (the enemy with the highest p toward us) unless the table says otherwise.

**Attack cycle (per attack; a unit may have several, B15 `UnitState.attacks`):**

1. When a target is valid and `tick ≥ nextAttack`, the attack starts:
   - `impactTick = tick + windup`, where windup = round(interval × windupPct).
   - Melee windupPct 40%, ranged 50%, turrets 0%.
   - `nextAttack = tick + interval`, where interval = round(baseTicks × 10,000 / (10,000 + attackSpeedBp)), fixed at attack start.
2. At impactTick, if the target is still valid, melee damage is scheduled as an impact, or a ranged or turret attack spawns a projectile.
3. Otherwise the attack whiffs and the cooldown is still spent.

Only the first attack (index 0) stops movement. Secondary attacks (riders, the Behemoth MG) fire whenever they have a target.

**Projectiles:**

- Travel ticks = ceil(distance / speed / 0.05). `instant` means impact on the next tick.
- Single-target projectiles home and never miss (they hit if the target is alive on the impact tick).
- Splash projectiles aim at the target's x at fire time and hit valid enemies whose centre lies within the radius at impact.
- Pierce hits up to its count within the pierce length, starting at the target. Chain hops to the nearest unhit enemy within hop range.

**Impact resolution (two-phase).** All impacts due in a tick (melee, projectiles, powers, called strikes, Last Stand) are collected first and then applied together (B3 step 13). A unit that dies this tick still delivers impacts already scheduled for this tick. Knockback and pulls apply after all damage.

**Damage (integer; HP, damage, heals and shields are stored in centi-units, ×100):**

The pipeline truncates after each step, in this fixed order, with a minimum of 1 HP (100 centi):

1. base × levelMult
2. × typeMod (first matching mod)
3. × areaSecondary (50% for non-primary area targets)
4. × target resist (Shield Wall)
5. × attacker damage buffs (strongest damageBuff)
6. × mark (1.2)
7. × phase mods (turret damage ×0.5 in Siege; damage to bases ×2 in Siege)
8. × Legendary target of a power or Last Stand (0.5)

Damage is absorbed by a temporary shield first, then an innate shield, then HP.

**Bases take damage only from attacks that targeted them,** using `vsBaseDamage` if set, else the listed damage. Splash never damages a base.

**Knockback and pulls:**

- p −= knockback × (100 − resist) / 100, clamped at the unit's own gate (p ≥ 0). Negative knockback pulls toward the attacker.
- Resist values: small and medium 0%, large and huge 50%, Brace 100%, Air 100%.
- Knockback cancels a pending windup.

**First-hit bonus.** "First hit of each engagement" means the first attack started after ≥ 2 s without attacking. Brace units ignore attackers' first-hit bonuses (multiplier and knockback).

**Status effects:**

| Status | Effect |
|---|---|
| stun | No movement, no attack starts; a pending windup is cancelled. Time Stop is a stun with a `frozen` visual flag |
| slow | Move speed × (1 − s) |
| mark | +20% damage taken |
| shield | Temporary HP pool |
| regen | Heals a set amount over its duration |
| damageBuff, speedBuff, attackSpeedBuff | As named |

Status rules:

- Reapplying a status sets magnitude = max(old, new) and expiry = max(old, new).
- Different statuses coexist.
- Auras never stack: the strongest applies.
- Shields: a new shield sets pool = max(current, new) and expiry = max(old, new).

**Heal.** Heals pulse every 0.5 s on a shared 10-tick grid.

- Per-pulse pool = hpPerSec × pulseMs / 1,000 × levelMult.
- The pool is split equally over up to N damaged allies within the radius, ranked by lowest HP bp, ties to the lower id. Overflow is lost.
- A unit receives only its single largest heal per pulse, so healers never stack.
- Legendaries receive 50% of all healing (heals, regen).
- Healing never exceeds max HP.

**Periodic abilities** (Roar, called strikes, EMP, Time Stop, pounce) are ready at spawn and fire on the first tick their condition holds. The cooldown runs from the fire tick.

**Training:**

- One shared queue of 5. Gold is paid on enqueue.
- `cancelTrain { slot }` removes the last queued instance of that card with a full refund. `cancelTrain` without a slot removes the last item.
- Training advances the first queued item that is not waiting. A finished item spawns at p = 20 if pop + unit pop ≤ 60. Otherwise it waits at 100% with "ARMY FULL" on its card, and the next item starts training. Each tick, finished items spawn in queue order as soon as they fit.
- Train times: Infantry 1.5 s, Ranged 2.0 s, AA 2.5 s, Support 3.0 s, Heavy and Epic 4.0 s, Legendary 7.0 s.

**Population cap.** 60 per side. Pop follows cost in 25-gold steps: Infantry 2, Ranged 3, AA 4, Support 4, Heavy 6, Epic 8, Legendary 14. Summoned units do not count. The HUD shows "Army 44/60".

**Legendary limit.** At most one Legendary alive **or** queued per side. The card shows "LEGENDARY IN FIELD".

### A2.8 Turrets

- **Building.** Tap an empty mount, then pick one of the turret cards in the current age loadout. Gold is paid at the start. Building takes 1 s (drop-in animation, no firing) and cannot be cancelled.
- **Selling.** A selling turret stops firing at once. After 1 s the mount is free and 50% of the cost is refunded.
- **Modernise.** Tapping a mount that holds an older-age turret (it shows a glowing arrow) offers the current age's turret cards. Modernising costs the new price minus 50% of the old price and takes 1 s. The old turret stops firing at once.
- **Rules:**
  - Turrets are invulnerable.
  - They never target bases.
  - Range is measured from their own gate, capped at 480 lu.
  - Damage ×0.5 during Siege.
  - Turrets from older ages keep firing at their original stats.
- **Prices.** Commons 150 / 175, Rare 250, Epic 250. There are no Legendary turrets in v1.
- **Mounts.** 4 mounts stacked vertically on the base. The mount index is visual only.

### A2.9 Age Powers

- One power is equipped per age loadout (default or alternate).
- **Charge:**
  - 0 → 100% over 50 s, stored in parts per million (1,000 per tick); ×1.25 in Overdrive and Siege.
  - Capped at 50% across an evolve.
  - The opponent's charge ring is visible.
- **Casting:**
  - Tap to auto-aim (the `densest` scan over p 150-1,050) or drag to place.
  - A 1.0 s telegraph (ground marker plus sound) is visible to both sides.
  - The effect then plays out.
- **Barrage sequencing.** Impact i (0-based) lands at `telegraphEnd + floor(i × durationTicks / count)` at x = `zoneStart + (i + 0.5) × zone / count + jitter`, where zoneStart is the zone edge nearer the caster's gate and jitter comes from the sim RNG within ±jitter (0 for line patterns).
- **Limits:**
  - Powers hit units only, never bases or turrets.
  - Legendary units take 50% power damage.
  - Kills by powers pay 30% gold and no XP.
- **Level scaling.** Powers have no level of their own. Their damage, heals and shields scale with the caster's loadout multiplier: the average of (10,000 + 500 × (L − 1)) over the unit cards in the caster's current age loadout, in bp. Paratroopers use the caster's Rifleman level.
- **Tuning target.** Damage per unit in the zone, at A2.7 spacing, is 60-100% of the age's Infantry common at L1 (the "Light unit") and 15-35% of the age's Heavy common at L1. Coverage = count × 2 × radius / zone hits per unit.

### A2.10 Match formats and clock

| Format | Ages | Overdrive | Siege | Final Bell | Retreat unlocks | Used in |
|---|---|---|---|---|---|---|
| Tutorial | Stone to Future (thresholds 250 / 300 / 350 / 400) | none | none | none | never | Onboarding match 1 |
| Short War | Stone to Gunpowder | 3:30 | 4:30 | 6:00 | 1:00 | Ladder (all arenas), Skirmish |
| Standard War | Stone to Modern | 4:30 | 6:00 | 7:30 | 1:00 | Ladder from Arena 2, Daily Challenge, Skirmish |
| Full War | Stone to Future | 5:30 | 7:30 | 9:30 | 1:00 | Ladder from Arena 3, Conquest, Skirmish |

From Arena 2 the player picks any unlocked format before each ladder match. Trophies and rewards are the same for every format.

| Phase | Effect |
|---|---|
| Regulation | Normal rules |
| Overdrive | Base passive gold (6/s) and passive XP ×2 (Treasury income unchanged), Age Power charge ×1.25, faster music layer, gold frame pulse |
| Siege | Overdrive effects continue; turret damage −50%, all damage to bases ×2, each base loses 0.5% of its max HP per second (applied every 20 ticks), siege bell, red vignette |
| Final Bell | Higher base HP% wins; a gap ≤ 0.5% (50 bp) is a draw |

**Wins:** destroy the enemy base. Both bases destroyed on the same tick is a draw. Retreat counts as a loss.

| Classic exploit | Countermeasure |
|---|---|
| Turtling behind 4 turrets | Range cap, no base targeting, Siege halves turret damage, 60% bounty, bots that refuse to feed turrets (A7.2) |
| Staying in the Stone Age to farm | Flat prices, bounty follows cost not age, underdog bonus is only 50% and off while Evolve is available, XP cap |
| Going AFK | Passive gold is small; the clock ends the match |
| Stuck in an age | Passive XP, XP from base damage and from losses |
| Endless fighting at the gate | Siege decay and ×2 base damage |
| Special every cooldown for free gold | Power kills pay 30% gold and no XP, telegraph, 50% carry cap on evolve, slow Overcharge |

### A2.11 Comeback tools (visible and counterable)

- XP from your own losses (40% of cost).
- Underdog bounty (+50% gold and XP).
- Defender's advantage: short reinforcement walk plus turret cover at the hold line.
- The 50% power carry cap, which stops a leader chaining specials across an evolve.
- **Last Stand (once per match):**
  - Arms when your base is at or below 25% HP. Both sides see a horn icon on the armed base.
  - Tap it: 1.0 s charge (horn, glow), then a volley hits every enemy unit (ground and air) within 450 lu of your gate for 200 × P(your current age) × your loadout multiplier (Legendaries 50%) and knocks ground units back 80 lu.
  - If unused, it fires automatically at 10% HP.
  - Kills pay 30% gold and no XP.
  - In the player's first 4 matches the button is hidden and Last Stand is automatic only (A8).
  - The attacker can play around it by holding back.
- There is no hidden rubber-banding of any kind.

### A2.12 Player controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Train unit (5 cards) | Tap card | 1-5 |
| Cancel | Right-click or long-press a card cancels its last queued instance | Backspace (last item) |
| Build turret | Tap an empty mount, then a card | Q / W (next free mount, or the oldest outdated turret when none is free) |
| Modernise or sell turret | Tap an occupied mount: popover with Modernise cards and Sell (confirm) | Shift + click mount to sell |
| Buy mount | Tap the "+" mount | B |
| Treasury | Tap the gold counter | T |
| Evolve | Tap Evolve on your XP bar | E |
| Age Power | Tap = auto-aim, drag = place | Space (auto-aim) |
| Stance Charge/Hold | Tap flag | S |
| Last Stand | Tap when armed | L |
| Emote (6) | Emote button in the top bar | none |
| Pause | Top-right button | P (never Esc) |
| Speed 1x / 1.5x / 2x | Button (all v1 modes) | F |

Speed and pause are allowed in every v1 mode because all opponents are AI. They are removed for PvP later. Default speed is 1x.

### A2.13 Expected match flow (Full War, two mid-tier players)

| Time | What typically happens |
|---|---|
| 0:00-0:12 | Both open with 2-3 units; first clash near mid-lane at ~0:10 |
| 0:30 | First turret; greedy players buy Treasury |
| 0:50 | Stone power ready; fired just before evolving |
| ~1:00 | Medieval; 2 Vanguard Footmen march out |
| ~2:05 | Gunpowder; first Epics |
| ~3:20 | Modern; turrets modernised; first Legendary pushes |
| ~4:50 | Future |
| 5:30 | Overdrive: big pushes |
| 6:00-8:30 | Most matches end |
| 7:30-9:30 | Siege; Final Bell is rare |

### A2.14 Balance targets (checked by the headless sim, B12)

All card tests use both sides at tier V with the Balanced brain and every card at L7. Exploit tests use the scripted proxy against a tier VII Balanced bot at L7.

| Metric | Target |
|---|---|
| Full War median length | 7:00; 80% between 5:00 and 9:00; < 3% reach Final Bell |
| Short War median | 4:30; < 3% reach Final Bell |
| First evolve | Median 60 ± 10 s |
| Later evolves | Balanced mirror within ±20 s of A2.4; every scripted strategy reaches Future (Full War) between 4:00 and 6:15 |
| Per-card win-rate delta vs baseline | The 95% confidence interval lies within ±3 points; 2,000 mirrored matches per card (smoke run: 400 matches, ±6) |
| First-mover advantage (side 0 vs side 1, mirrored) | 47-53% |
| Turret share of kills | 20-35% of all kills in the Balanced mirror |
| 4-turret turtle proxy (Hold) vs tier VII | Wins 35-45% |
| Other exploit proxies (B12) vs tier VII | Each wins ≤ 55% |
| Base time to kill | A full army (60 pop) of same-age L1 Commons with no opposition needs 40-60 s to destroy a full same-age base |
| Power damage per unit in zone | Within the A2.9 target for every damaging power |
| Damage per gold per card | Reported per age; not gated |

**Baseline plan per age:** the 3 Commons, the AA Rare and the Support Rare, both Common turrets and the default power. A tested Rare replaces its same-role card; a tested Epic or Legendary replaces the Support Rare; a tested turret replaces the same-rarity-slot Common turret (the second slot for Rare and Epic turrets).

## A3. Deck rules: the War Plan

- **Structure.** A War Plan is five Age Loadouts, one per age. A loadout has 5 unit slots, 2 turret slots and 1 Age Power, all from that age, all owned, with no duplicates. Slots may be empty. A train command on an empty slot is rejected.
- **Minimum to play:** 3 units and 1 turret per age used by the format. The starter kit always satisfies it.
- **Tray.** In battle all unit cards of the current age are always available; there is no hand cycling. On evolve the cards flip over (300 ms) to the next loadout.
- **Scouted list.** Each opponent card joins a "Scouted" list the first time the opponent plays it. It opens from a chip in the top bar and in the pause menu. Nobody sees the full enemy plan in advance.
- **Starter kit.** From the first launch the player owns every Common (3 units and 2 turrets per age) and each age's default Age Power, all at L1. Each age's Anti-armor Rare arrives by script:
  - Spear Hunter: capsule 1
  - Pikeman and Grenadier: capsule 2
  - Bazooka Trooper and Rail Gunner: Age Unlock Capsules at Arena 2

  Until an AA Rare arrives, that loadout plays with 3 units. Skirmish shows a note on that age.
- **Chase cards** (from capsules): per age, the Support Rare, the Rare turret, the Epic unit, the Epic turret and the Legendary unit. Alternate Age Powers come from Trophy Road nodes at 100-500 trophies (A6.3).
- **Presets and helpers:**
  - 3 War Plan presets, each renamable.
  - Auto-fill picks the highest-level card per slot while keeping at least one Heavy or Legendary, one Ranged and one AA per age, plus an air-hitter from Gunpowder on.
  - The builder shows each loadout's average level and the War Plan average (over the ages the next format uses).
  - After a capsule, the summary offers "Equip now" for a new card: it fills an empty slot, else the same-role slot, else the lowest-level slot.
- **Deck advisor.** Warnings, never blockers:
  - "Stone has no anti-armor"
  - "Modern cannot hit air" (no air-hitting unit or turret)
  - "Medieval has only 3 units"
  - "No splash anywhere: swarms will hurt"
- **Rarity is a sidegrade.** Every card starts at L1 and gains the same +5% per level. At equal level, Rare, Epic and Legendary cards are more specialised, not more efficient. Balance rule: A2.14.
- **Unlock order.** Match 1 uses scripted trays. Match 2 uses the full Short War starter plan. The War Plan screen and Skirmish open after match 3. The stance flag appears in match 4 and the manual Last Stand button in match 5.

## A4. (Reserved: formats are in A2.10)

## A5. v1 content

### A5.1 Conventions and archetype baselines (P = 1, level 1)

- Actual stat = table value × (10,000 + 500 × (L − 1)) / 10,000, as one integer step in centi-units. That is +5% per level, additive; L10 = +45%.
- Level scaling applies to HP, damage, heals, shields and ability damage. It never applies to cost, speed, range, intervals or durations. Powers scale through the loadout multiplier (A2.9).
- Every card starts at L1. Max level 10.
- Killer bounty = 60% cost in gold and 100% cost in XP. The owner gets 40% cost in XP on death. Summons pay nothing.

| Archetype | Cost | Train | Pop | HP | Damage / interval | DPS | Range | Speed | Size |
|---|---|---|---|---|---|---|---|---|---|
| Infantry | 50 | 1.5 s | 2 | 160 | 20 / 1.0 s | 20 | 16 | 70 | small |
| Ranged | 75 | 2.0 s | 3 | 95 | 18 / 1.4 s | 12.9 | 200 | 65 | small |
| Heavy | 150 | 4.0 s | 6 | 560 | 42 / 1.5 s | 28 | 16 | 55 | large |
| Anti-armor (melee reach) | 100 | 2.5 s | 4 | 200 | 26 / 1.2 s | 21.7 | 60 | 70 | medium |
| Anti-armor (ranged) | 100 | 2.5 s | 4 | ~120 | per card | per card | 150-240 | 65 | medium |
| Support | 110 | 3.0 s | 4 | 130 | heal 30/s or aura | - | 150 | 65 | small |
| Epic | 200 | 4.0 s | 8 | varies | varies | - | - | - | varies |
| Legendary | 350 | 7.0 s | 14 | ~3× Heavy | ~1.5-2× Heavy DPS plus a trait | - | - | - | huge |

**Collection:** 35 units + 20 turrets = 55 cards (25 Common, 15 Rare, 10 Epic, 5 Legendary), plus 10 Age Powers (starter and Trophy Road, not capsules), 12 skins and 3 foil variants per card. The tutorial-only Training Dummy is hidden and not collectable.

**Default projectile speeds (lu/s):** rock 500, arrow 650, musket 1,500, bullet 1,500, shell 1,200, rocket 900, arc/lob 450, plasma bolt 1,800. Lasers and rails are instant.

Table key: C/R/E/L = rarity; S/M/L/H = size; Hits: G = ground, A = air; "Blunt" = armored ×0.70; "AA mods" per A2.6. Per-card projectile, sound and damage type are in A14.2.

### A5.2 Stone Age (P 1.00)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bonker | Bonker | C | Infantry | 50 | 160 | 20 / 1.0 s | 16 | 70 | S | G | light bio melee | Blunt |
| pebbler | Pebbler | C | Ranged | 75 | 95 | 18 / 1.4 s | 200 | 65 | S | G+A | light bio ranged | Rock. Ricochet: the rock bounces to 1 more enemy within 40 lu (chain, 2 targets total) |
| tuskback | Tuskback | C | Heavy | 150 | 560 | 42 / 1.5 s | 16 | 55 | L | G | armored bio melee | Gore: first hit of each engagement ×2 and 30 lu knockback |
| spear_hunter | Spear Hunter | R | Anti-armor | 100 | 200 | 26 / 1.2 s | 60 | 70 | M | G | light bio melee | Reach; melee AA mods; priority armored |
| drum_shaman | Drum Shaman | R | Support | 110 | 130 | 8 / 1.2 s | 150 | 65 | S | G+A | light bio support ranged | Aura: allies within 160 lu get +20% attack speed; followSupport |
| sabertooth | Sabertooth | E | Skirmisher | 200 | 380 | 34 / 0.8 s | 12 | 100 | M | G | light bio melee | Pounce (10 s cooldown): when blocked by an enemy ground unit, leaps (0.5 s, untargetable by melee) to the nearest enemy ranged or support unit within 150 lu beyond the blocker, landing at the target's centre − (wT + wS)/2 on the near side; first bite ×2. No target: no leap and no cooldown |
| mammoth_matriarch | Mammoth Matriarch | L | Siege heavy | 350 | 1,700 | 55 splash r40 / 2.0 s | 20 | 40 | H | G | armored bio melee legendary | Two riders each shoot 12 / 1.4 s at range 200 (G+A); on death the riders jump off as 2 Pebblers (summoned) |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| rock_tosser | Rock Tosser | C | 150 | 30 / 1.5 s | 360 | G+A | Single target, arc |
| angry_beehive | Angry Beehive | C | 175 | 5 / 0.2 s | 220 | G+A | Bee stream, high chip DPS, short range. Our comic signature turret |
| log_roller | Log Roller | R | 250 | 45 / 4.0 s | 300 | G | Rolls a log that hits ground enemies within 300 lu of your gate, nearest to the gate first; max 6 targets |
| grumpy_toad | Grumpy Toad | E | 250 | 60 / 5.0 s | 420 | G | Tongue grabs the nearest enemy ranged or support ground unit in range, else the second-frontmost small or medium ground enemy, and drags it 120 lu toward your gate. The drag stops at the enemy's frontmost ground unit and short of your nearest ground unit |

### A5.3 Medieval Age (P 1.35)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| footman | Footman | C | Infantry | 50 | 216 | 27 / 1.0 s | 16 | 70 | S | G | light bio melee | Blunt. Shield Wall: takes 25% less damage from attacks with range ≥ 100 (not powers) |
| longbowman | Longbowman | C | Ranged | 75 | 128 | 24 / 1.4 s | 230 | 65 | S | G+A | light bio ranged | Arrow |
| destrier_knight | Destrier Knight | C | Heavy | 150 | 756 | 57 / 1.5 s | 16 | 60 | L | G | armored bio melee | Lance charge: first hit ×2 and 30 lu knockback |
| pikeman | Pikeman | R | Anti-armor | 100 | 270 | 35 / 1.2 s | 70 | 70 | M | G | light bio melee | Reach; melee AA mods; priority armored; Brace (immune to knockback and to first-hit bonuses) |
| friar | Friar | R | Support | 110 | 175 | 11 / 1.2 s | 150 | 65 | S | G+A | light bio support ranged | Heals 40 HP/s split between the 2 lowest-HP% allies within 160 lu; followSupport |
| battering_ram | Battering Ram | E | Siege | 200 | 900 | 160 vs base / 2.0 s (10 vs units) | 12 | 45 | L | G | armored mech melee | siegeOnly: targets the base; attacks units only while blocked |
| ursa_paladin | Ursa Paladin | L | Siege heavy | 350 | 2,300 | 70 / 1.4 s, cleave | 20 | 55 | H | G | armored bio melee legendary | Cleave: 2 targets total, the second within 40 lu behind the primary. Roar every 15 s while it has a target: the nearest 8 allies within 200 lu get a 60 HP shield for 6 s |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| crossbow_nest | Crossbow Nest | C | 150 | 40 / 1.5 s | 380 | G+A | Single target |
| pitch_cauldron | Pitch Cauldron | C | 175 | 14 / 0.5 s | 130 | G | Gate zone: ground enemies within 130 lu of your gate; max 4 targets |
| trebuchet | Trebuchet | R | 250 | 110 splash r50 / 4.5 s | 480 (min 150) | G | Arc |
| honk_ballista | Honk Ballista | E | 250 | 70 / 3.0 s | 400 | G+A | Goose chains to 3 targets total (each ≤ 80 lu from the previous); 30% slow for 2 s |

### A5.4 Gunpowder Age (P 1.82)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| corsair | Corsair | C | Infantry | 50 | 291 | 36 / 1.0 s | 16 | 72 | S | G | light bio melee | Blunt. Boarding Hook: first hit of each engagement pulls the target 20 lu toward the Corsair |
| fusilier | Fusilier | C | Ranged | 75 | 173 | 47 / 2.0 s | 240 | 65 | S | G+A | light bio ranged | Musket |
| cuirassier | Cuirassier | C | Heavy | 150 | 1,019 | 76 / 1.5 s | 16 | 60 | L | G | armored bio melee | Charge: first hit ×2 and 30 lu knockback |
| grenadier | Grenadier | R | Anti-armor | 100 | 230 | 50 splash r35 / 1.8 s | 150 | 68 | M | G | light bio ranged | Lob over allies; armored ×1.5, mech ×1.5, light ×0.5; priority armored |
| field_surgeon | Field Surgeon | R | Support | 110 | 237 | 15 / 1.2 s | 150 | 65 | S | G+A | light bio support ranged | Heals 55 HP/s split between the 2 lowest-HP% allies within 160 lu; followSupport |
| bronze_cannon | Bronze Cannon | E | Artillery | 200 | 500 | 110 splash r50 / 3.5 s | 280 (min 80) | 45 | L | G | light mech ranged | Arc |
| balloon_admiral | Balloon Admiral | L | Air bomber | 350 | 1,500 | 110 splash r50 / 1.6 s | bombs below (±40 lu) | 45 | H | G | air legendary | Bomber; bombs the base at the enemy gate (110 per bomb); on death crashes for 250 splash r70 on ground enemies |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| swivel_gun | Swivel Gun | C | 150 | 22 / 0.6 s | 340 | G+A | Single target |
| grapeshot_gun | Grapeshot Gun | C | 175 | 50 / 2.0 s | 220 | G+A | Hits the frontmost enemy in range and enemies within 90 lu behind it; max 4 targets |
| congreve_rack | Congreve Rack | R | 250 | 4 rockets × 55 splash r30 / 5.0 s | 460 | G+A | Scatter ±40 lu (sim RNG); air ×1.5 |
| chainshot_cannon | Chainshot Cannon | E | 250 | 75 / 4.0 s | 400 | G | Pierces 4 targets total within 200 lu, starting at the frontmost |

### A5.5 Modern Age (P 2.46)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| trench_raider | Trench Raider | C | Infantry | 50 | 394 | 49 / 1.0 s | 16 | 75 | S | G | light bio melee | Blunt |
| rifleman | Rifleman | C | Ranged | 75 | 234 | 32 / 1.0 s | 260 | 65 | S | G+A | light bio ranged | Bullet. Suppressing Fire: hits slow the target's move speed 15% for 1.0 s |
| tankette | Tankette | C | Heavy | 150 | 1,378 | 104 / 1.5 s | 90 | 50 | L | G | armored mech ranged | Shell |
| bazooka_trooper | Bazooka Trooper | R | Anti-armor | 100 | 300 | 64 / 1.2 s | 200 | 65 | M | G+A | light bio ranged | Rocket; ranged AA mods; priority armored |
| radio_operator | Radio Operator | R | Support | 110 | 320 | 20 / 1.2 s (G+A) | 200 | 65 | S | G+A | light bio support ranged | Every 8 s calls a shell on the nearest enemy ground unit within 400 lu: lands after 1.0 s, 120 splash r50 (area rule). One call-in per side per 3 s. followSupport |
| gyrocopter | Gyrocopter | E | Air gunship | 200 | 740 | 20 / 0.3 s | 150 | 80 | M | G+A | air mech | Obeys stance |
| behemoth_tank | Behemoth Tank | L | Siege heavy | 350 | 4,100 | Main gun 170 splash r40 / 2.5 s at range 240 (G) plus MG 20 / 0.4 s at range 150 (G+A, priority air) | 240 | 35 | H | G / G+A | armored mech legendary | Two independent attacks; only the main gun stops movement |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| mg_nest | MG Nest | C | 150 | 15 / 0.3 s | 340 | G+A | Single target |
| flak_gun | Flak Gun | C | 175 | 60 splash r40 / 1.5 s | 420 | G+A | Air ×2.0; priority air |
| howitzer | Howitzer | R | 250 | 200 splash r60 / 5.0 s | 480 (min 180) | G | Arc |
| searchlight_sniper | Searchlight Sniper | E | 250 | 280 / 4.0 s | 480 | G+A | Priority armored; Mark: target takes +20% damage from all sources for 4 s |

### A5.6 Future Age (P 3.32)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| photon_knight | Photon Knight | C | Infantry | 50 | 470 (+90 shield) | 66 / 1.0 s | 16 | 75 | S | G | light bio melee | Blunt; innate shield 90, regenerates 30/s after 3 s without damage |
| pulse_trooper | Pulse Trooper | C | Ranged | 75 | 315 | 43 / 1.0 s | 260 | 65 | S | G+A | light bio ranged | Plasma bolt |
| walker_mech | Walker Mech | C | Heavy | 150 | 1,860 | 140 / 1.5 s | 60 | 50 | L | G | armored mech melee | Reach |
| rail_gunner | Rail Gunner | R | Anti-armor | 100 | 400 | 86 / 1.2 s | 240 | 65 | M | G+A | light bio ranged | Instant rail; pierces 2 targets total within 150 lu; ranged AA mods; priority armored |
| repair_drone | Repair Drone | R | Support | 110 | 430 | none | 160 | 70 | S | none | air mech support | Heals 100 HP/s split between the 2 lowest-HP% allies within 160 lu; followSupport |
| emp_saboteur | EMP Saboteur | E | Anti-mech | 200 | 700 | 50 / 1.0 s | 12 | 85 | M | G | light bio melee | EMP every 8 s when an enemy is within 120 lu: strips temporary and innate shields from all enemies within 120 lu (restarting their regen delay) and stuns mech enemies within 120 lu, air included, for 1.5 s |
| chrono_titan | Chrono Titan | L | Siege heavy | 350 | 5,600 | 230 / 1.6 s, cleave | 60 | 35 | H | G | armored mech melee legendary | Cleave: 3 targets total within 60 lu. Time Stop when an enemy first comes within 200 lu and every 15 s after: enemies within 200 lu (air included) are frozen 1.5 s (Legendaries 0.75 s) |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| pulse_laser | Pulse Laser | C | 150 | 20 / 0.3 s | 360 | G+A | Instant beam |
| arc_coil | Arc Coil | C | 175 | 60 / 1.8 s | 260 | G+A | Chains to 3 targets total (each ≤ 100 lu from the previous) |
| plasma_mortar | Plasma Mortar | R | 250 | 270 splash r60 / 5.0 s | 480 (min 180) | G | Arc |
| gravity_well | Gravity Well | E | 250 | 60 / 7.0 s | 400 | G | Priority densest. Damage hits up to 4 ground enemies within 90 lu of impact (area rule). Every ground enemy within 90 lu is pulled 60% of the way to the centre and slowed 50% for 2.5 s |

**Tutorial only (hidden):** `training_dummy`, Training Dummy: cost 50 (for bounty), HP 40, 4 / 1.0 s, range 16, speed 50, small, G, light bio melee.

### A5.7 Age Powers

All values are final numbers at that age's P and L1 loadouts. Every power has a 1.0 s telegraph first. "Per unit" is the coverage estimate from A2.9 against that age's L1 Infantry and Heavy commons.

| Slug | Age | Slot | Source | Effect | Per unit |
|---|---|---|---|---|---|
| stampede | Stone | Default | Starter | 5 spirit aurochs, 0.4 s apart, run 500 lu forward at 400 lu/s from your frontmost unit (or p = 200); 50 damage and 40 lu knockback per hit; max 3 hits per enemy per cast; ground only | ≤ 150: 94% / 27% |
| meteor_shower | Stone | Alternate | Road 100 | 14 meteors over 3.0 s across a 400 lu zone (even pattern, ±20 lu jitter); each 50 damage, splash r40, ground only | ~140: 88% / 25% |
| arrow_storm | Medieval | Default | Starter | 40 arrows over 2.5 s across 450 lu; each 40 damage, splash r20; hits air | ~142: 66% / 19% |
| royal_decree | Medieval | Alternate | Road 200 | All your units get +30% damage and +25% move speed for 8 s (no zone) | - |
| smoke_screen | Gunpowder | Default | Starter | 350 lu cloud for 7 s: enemy ranged and turret attacks fired from or into it miss 50% (sim RNG); your units inside deal +20% damage | - |
| broadside | Gunpowder | Alternate | Road 300 | 10 cannonballs over 3.0 s across 450 lu; each 120 damage, splash r45; ground only | ~240: 82% / 24% |
| paratroopers | Modern | Default | Starter | 4 Riflemen at your Rifleman level land 150 lu beyond the enemy's frontmost ground unit (clamped to p ≤ 1,050; p = 600 if the enemy has no ground units); summoned, no pop, no bounty | - |
| carpet_bomber | Modern | Alternate | Road 400 | 12 bombs along a 500 lu line over 1.5 s (line pattern); each 150 damage, splash r50; ground only | ~360: 91% / 26% |
| orbital_lance | Future | Default | Starter | A beam sweeps a 500 lu zone over 2.0 s, dealing 450 once to each enemy it touches (±20 lu); hits air | 450: 80% / 24% |
| nanite_surge | Future | Alternate | Road 500 | All your units get a regen of 40% of max HP over 4 s and a 150 shield for 6 s (no zone) | - |

### A5.8 Skins

**Clarity parity (MUST).** A skin never changes silhouette, size, weapon type, team-colour zones, facing or stats. It may change:

- the palette outside team zones (subject to the colour rule in A11)
- overlay parts
- the idle flourish
- the death prop
- attack effect colour, and the projectile visual as long as size and hitbox stay the same
- whole-body translucency down to 70% alpha, with the outline kept
- sound overrides

The gallery test compares each skin's silhouette mask with the base visual and requires IoU ≥ 0.85. Each skin is its own manifest entry (`unit.<slug>@<skin>`, B5).

| Slug | Skin | For | Rarity | Look |
|---|---|---|---|---|
| pumpkin_head | Pumpkin Head | bonker | Rare | Carved gourd helmet |
| woolly_tuskback | Woolly Tuskback | tuskback | Epic | Shaggy coat, frosty breath puffs |
| frost_matriarch | Frost Matriarch | mammoth_matriarch | Legendary | Ice tusks, snow aura |
| tin_can | Tin Can | footman | Rare | Dented bucket armour |
| panda_paladin | Panda Paladin | ursa_paladin | Legendary | Panda mount, bamboo banner |
| toy_soldier | Toy Soldier | fusilier | Rare | Wind-up key on the back |
| ghost_corsair | Ghost Corsair | corsair | Epic | 70% translucent body with a pale glow |
| arctic_rifleman | Arctic Rifleman | rifleman | Rare | Winter whites |
| shark_mouth | Shark Mouth | gyrocopter | Epic | Painted nose art |
| synthwave | Synthwave | photon_knight | Epic | Neon grid visor |
| kaiju_walker | Kaiju Walker | walker_mech | Legendary | Dinosaur-head plating |
| crystal_spire | Crystal Spire | base.future | Legendary | Faceted glass, prism glints (Arena 8 reward only, not in the crate pool, not craftable) |

Counts: 4 Rare, 4 Epic, 4 Legendary. The Wardrobe Crate pool holds the first 11. The Mythic tier arrives in v1.1 (D1).

**Foil variants.** Every card has three cosmetic foil frames: Bronze foil, Silver foil and Holo. They come from capsule stacks (A6.4) and show on the card in the tray, the War Plan and the collection. Foils never change stats and never appear in the lane.

**Other cosmetics:**

- **8 banners:** Tar Pit, Frostfang, Moat, Harbor, Barbed, Neon, Starfield, Rift. Each is an arena gate reward (Tar Pit is given at the start).
- **8 frames:** Codex Levels 5, 15, 25, 35, 45, 55, 65, 75.
- **13 titles:**

  | Title | Unlocked by |
  |---|---|
  | Recruit | start |
  | Firestarter | first win |
  | Evolver | first Future Age |
  | Mammoth Tamer | own Matriarch |
  | Collector | Codex Lv 10 |
  | Siege Scholar | Arena 4 |
  | Last Stander | win after your Last Stand |
  | Speedrunner | final age before 4:30 in Full War |
  | Veteran | 100 wins |
  | Curator | Codex Lv 40 |
  | Warden's Bane | beat The Warden |
  | Conqueror | 27 Conquest stars |
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
  - collection %, foils owned and Codex Level
  - Conquest stars
  - fastest win
  - Future Age reached count
  - Legendaries owned
- **History.** Last 20 matches, each with a replay and an "AI" marker.
- No login and no account in v1.

### A6.2 Currencies (all earned; nothing is sold; no store, no payment code in the repo)

| Currency | Use | Sources |
|---|---|---|
| Gold | In battle only, resets each match | Income, bounties |
| Amber | Card upgrades | Capsules, matches, quests, Trophy Road, Codex Level, Conquest |
| Copies (per card) | Upgrading that card | Capsules |
| Dust | Crafting card copies and skins | Jade capsules, Trophy Road, quests, Conquest, copies past L10, duplicate skins |
| Trophies | Ladder rank | Ladder wins |
| Codex points | Codex Level | Upgrades |

The **Clay meter** is not a currency: a 3-pip bar on Home that turns into a Clay capsule when full (A6.3).

### A6.3 Trophies, arenas and match rewards

Ladder results:

| Result | Trophies | Amber | Other |
|---|---|---|---|
| Win | +30 | 20, or 40 if no capsule charge | Win Capsule if a charge is available; otherwise +1 Clay meter pip |
| Loss | −20 (0 below 400; never below the current arena gate) | 15 | +1 Clay meter pip |
| Draw | 0 | 15 | +1 Clay meter pip |

- **Capsule charges.** A new save starts with 12. +1 charge every 6 h, continuously, banking up to 12. The first 10 capsules of a save never use a charge. Only ladder wins use charges.
- **Clay meter.** 3 pips make a Clay capsule without using a charge. There is no cap on how many it can produce.
- **Daily Capsule.** The first becomes available right after capsule 2 is opened. After that, one per day (reset at local 04:00), banking up to 3.
- **Loss protection.** After 3 ladder losses in a row, the next opponent is one tier lower (minimum tier 0) and the VS screen says "Warm-up match".
- **Other modes.** Daily Challenge: A9.1. Conquest: A6.10. Skirmish: 5 Amber per win, no trophies, no capsules.
- **Clock.** All daily timers reset at local 04:00, capped by the banks. Clock tampering is accepted because no money is involved.

| # | Arena | Trophies | Ladder formats | Drop pool | Bot tiers | Bot level | Gate rewards |
|---|---|---|---|---|---|---|---|
| 1 | Tar Pits | 0 | Short | Ages 1-3, no random Legendaries | 0-II | 1 | Starter War Plan, Tar Pit banner |
| 2 | Frostfang Pass | 150 | Short, Standard | Ages 1-4 | I-III | 2 | Age Unlock Capsules (Modern and Future), Frostfang banner, Silver Capsule |
| 3 | Kingsmoat | 400 | All | All | II-IV | 3 | Moat banner, Jade Capsule, Conquest unlocked |
| 4 | Powder Bay | 800 | All | All | III-V | 4 | Harbor banner, Jade Capsule |
| 5 | Iron Front | 1,300 | All | All | IV-VI | 5 | Barbed banner, Jade Capsule |
| 6 | Neon Harbor | 1,900 | All | All | V-VII | 6 | Neon banner, Jade Capsule |
| 7 | Orbital Ring | 2,600 | All | All | VI-VIII | 7 | Starfield banner, Aeon Capsule |
| 8 | Chrono Rift | 3,400 | All | All | VIII-X | 8 | Rift banner, Aeon Capsule, Crystal Spire skin; The Warden joins the ladder |

- An arena changes the ground and weather layer. Skyline layers still follow each player's age.
- **Age Unlock Capsule:** that age's AA Rare, plus 4 copies of each of that age's 3 common units.

**Trophy Road.** 60 nodes: every 50 trophies from 50 to 2,000, then every 100 from 2,100 to 4,000. Node trophies = row base + column offset. "Gate N" gives the arena gate rewards above. "A" = Amber, "D" = Dust.

| Base | +50 | +100 | +150 | +200 | +250 | +300 | +350 | +400 | +450 | +500 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 110 A | Meteor Shower | Gate 2 | Royal Decree | Silver | Broadside | 100 D | Gate 3 + Carpet Bomber | 190 A | Nanite Surge |
| 500 | 100 D | 220 A | Silver | 240 A | 100 D | Gate 4 | 270 A | Silver | 100 D | Wardrobe Crate |
| 1,000 | 310 A | 100 D | Silver | 340 A | 100 D | Gate 5 | 370 A | Silver | 100 D | Jade |
| 1,500 | 410 A | 400 D | Silver | 440 A | 400 D | Silver | 470 A | Gate 6 | 400 D | Wardrobe Crate |

| Base | +100 | +200 | +300 | +400 | +500 | +600 | +700 | +800 | +900 | +1,000 |
|---|---|---|---|---|---|---|---|---|---|---|
| 2,000 | 520 A | Jade | 400 D | 580 A | Jade | Gate 7 | 640 A | 400 D | Jade | Wardrobe Crate |
| 3,000 | 720 A | 400 D | Jade | Gate 8 | 800 A | 400 D | Jade | 860 A | 400 D | Aeon |

Amber nodes pay 100 + 20 × (trophies / 100). Road capsules have a fixed tier and no climb.

### A6.4 Time Capsules (card cases)

- **Pre-rolled.** The result is rolled the moment a capsule is granted and saved before any animation plays. The opening only reveals it.
- **Tier source.** Win Capsule tiers come from a 100-slot shuffle bag holding exactly 30 Clay, 40 Bronze, 20 Silver, 7 Jade and 3 Aeon, drawn without replacement and refilled when empty. The odds screen says: "Exactly 3 Aeon in every 100 Win Capsules."
- **Daily Capsule.** Rolls independently: Bronze 78%, Silver 15%, Jade 5%, Aeon 2%.
- **Scripted capsules** (A6.5) bypass the bag.

| Tier | Stacks | Copies per stack: Common / Rare / Epic / Legendary | Guarantees and extras | Amber | Expected copies |
|---|---|---|---|---|---|
| Clay | 2 | 2 / 1 / 1 / 1 | none | 60 | 3.4 |
| Bronze | 3 | 3 / 1 / 1 / 1 | ≥ 1 Rare stack | 120 | 5.9 |
| Silver | 4 | 6 / 3 / 1 / 1 | ≥ 2 Rare and ≥ 1 Epic stack | 300 | 12.0 |
| Jade | 5 | 14 / 6 / 3 / 1 | ≥ 2 Rare and ≥ 2 Epic stacks; 25% one Rare stack becomes Legendary; +100 Dust | 800 | 28.3 |
| Aeon | 6 | 15 / 6 / 3 / 1 | 1 Legendary stack (unowned first), ≥ 2 Epic stacks; 30% chance of a skin (Wardrobe odds) | 1,500 | 43.8 |

Expected values per bag capsule, before pity: 9.1 copies and 227 Amber.

**Roll algorithm (MUST be implemented exactly):**

1. Build the stack rarity list:
   1. Guaranteed rarities first.
   2. Remaining stacks roll Common 72%, Rare 22%, Epic 5%, Legendary 1%. In an arena without random Legendaries, only this 1% roll moves to Common. Guarantees and pity still give Legendaries, drawn from the pool's ages.
   3. Jade: a 25% roll converts one guaranteed Rare stack to Legendary.
2. Apply pity in this order: Legendary pity, Epic pity, new-card protection (A6.5). Each upgrades the lowest-rarity non-guaranteed stack (ties: the last stack).
3. Copies per stack come from the tier table by the stack's rarity.
4. Pick distinct cards per stack from the arena's drop pool of that rarity:
   - Unowned cards weigh ×3.
   - No duplicate Legendary until every Legendary in the pool is owned.
   - A stack set by new-card protection picks only unowned cards.
5. Each stack rolls a foil on a 10,000-bp scale: Holo 25 bp (0.25%), Silver foil 100 bp (1%), Bronze foil 400 bp (4%), else none. A foil unlocks for that card if it beats the one owned.
6. Owned cards at max level convert their copies to Dust at reveal time (shown on the card).

**Other capsule types:**

| Type | Source | Contents |
|---|---|---|
| Daily Capsule | Once per day | Tier table above; climb starts at Bronze |
| Trophy Road Capsule | Road nodes and gates | Fixed tier, no climb (reveal starts at step 4) |
| Clay meter capsule | 3 meter pips | Clay tier, climb from Clay (no climbs) |
| Age Capsule | Quests, Daily Challenge, Conquest | Silver-sized (4 stacks, Silver copies), all from one age picked in a dialog when granted, ≥ 1 Epic stack |
| Codex Capsule | Every 10th Codex Level from 5 | Silver tier, fixed |
| Age Unlock Capsule | Arena 2 gate | Fixed contents (A6.3) |
| Wardrobe Crate | Every 10th Codex Level from 10, weekly quest, Trophy Road | 1 skin: Rare 78%, Epic 18%, Legendary 4%; no duplicate until all crate skins of that rarity are owned |

### A6.5 Pity, protection and the onboarding script (all counters visible on every capsule screen)

Pity and script indices count every opened capsule except Age Unlock Capsules. Wardrobe Crates have their own counters.

- **Epic pity:** at least one Epic stack every 10 capsules.
- **Legendary pity:** let n be the capsule's count since the last Legendary, including this one. For n ≤ 25 there is no bonus. For 26 ≤ n ≤ 39, one stack upgrades to Legendary with probability (n − 25) × 5%. Capsule n = 40 guarantees one.
- **New-card protection:** at least one unowned card every 5 capsules while unowned cards exist in the pool. If no stack's rarity has unowned cards, the lowest non-guaranteed stack upgrades to the lowest rarity that does.
- **Wardrobe pity:** Epic or better at least every 5 crates; Legendary at least every 25.

**Onboarding script (overrides the bag and uses no charges):**

| Capsule | Tier | Guaranteed contents |
|---|---|---|
| 1 | Bronze | Spear Hunter NEW |
| 2 | Silver | Pikeman NEW, Grenadier NEW |
| 3 | Bronze | Log Roller NEW |
| 4 | Silver | First Epic (random, unowned, from the pool) |
| 5 | Aeon | Mammoth Matriarch, full walkout (~35-40 minutes into a new save) |

### A6.6 Upgrades and duplicates

All rarities share one level scale: every card starts at L1, and each level adds +5% HP, damage, heals and shields. Turrets level the same way. The level cap is fixed at 10 forever; the game grows sideways.

| To level | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Common copies | 2 | 3 | 5 | 8 | 12 | 18 | 25 | 35 | 45 | 153 |
| Rare copies | 1 | 2 | 4 | 6 | 10 | 15 | 22 | 30 | 40 | 130 |
| Epic copies | 1 | 1 | 1 | 2 | 3 | 5 | 7 | 10 | 14 | 44 |
| Legendary copies | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 11 |
| Amber | 20 | 50 | 100 | 200 | 350 | 550 | 800 | 1,200 | 1,700 | 4,970 |

**Dust rates:**

| | Common | Rare | Epic | Legendary |
|---|---|---|---|---|
| Card copy past L10 → Dust | 5 | 20 | 100 | 400 |
| Craft one card copy (also unlocks an unowned card) | 40 | 100 | 400 | 1,600 |
| Duplicate skin → Dust | - | 50 | 200 | 800 |
| Craft a crate skin | - | 200 | 800 | 3,000 |

The upgrade itself is a reward moment: hammer slam, level count-up, stat bars growing, +Codex points.

In battle, a unit's level shows as a trim on its ground ring: bronze at L4-6, silver at L7-9, gold at L10.

### A6.7 Codex Level and quests

- **Codex points per upgrade:** +1 Common, +2 Rare, +4 Epic, +8 Legendary. A level takes 15 points (about 81 levels in total).
- **Level rewards:**
  - every level: 100 Amber
  - every 5th level: a Silver Codex Capsule (levels 5, 15, 25 ...) alternating with a Wardrobe Crate (levels 10, 20, 30 ...)
  - frames at 5, 15, 25 and onward
- **Daily quests.** 3 per day with 1 free reroll; they bank up to 6 unclaimed. Skirmish matches count only for "Play 3 battles" and "Train 30 units". Pool:

| Quest | Reward |
|---|---|
| Win 2 battles | 100 Amber |
| Play 3 battles | 100 Amber |
| Train 30 units | 100 Amber |
| Evolve 6 times | 100 Amber |
| Reach your format's final age before 2:20 (Short), 3:40 (Standard) or 5:00 (Full) | 150 Amber |
| Kill 20 units with turrets | 150 Amber |
| Win without buying Treasury | 150 Amber |
| Hit 5+ enemies with one Age Power | 150 Amber |
| Deal 15,000 damage to enemy bases | 100 Amber |
| Kill 5 Heavies with Anti-armor units | 150 Amber |
| Win with a Legendary in your War Plan (only offered if you own one) | 100 Dust |
| Destroy a base before 6:00 | 200 Amber |
| Win after using Last Stand (from match 5) | 200 Amber |
| Upgrade 2 cards | 100 Amber |
| Win a Daily Challenge | Age Capsule |

- **Weekly quest:** "Win 15 battles" gives a Wardrobe Crate and an Age Capsule.

### A6.8 Matchmaking fairness (AI ladder)

- **Bot level follows the arena, not the player.** Every bot card plays at the arena's bot level (A6.3). Each procedural commander rolls −1 / 0 / +1 (25 / 50 / 25%) from its seed. Upgrades therefore always make the player stronger against the ladder, and a plan cannot be sandbagged.
- **Rarity allowance.** Arena 1 bots use Commons and Rares. Epics appear from Arena 2. A bot fields a Legendary only when the player's War Plan for that format contains one, and plays it at the player's Legendary level. The Warden is the only exception (A7.4), and the VS screen discloses it.
- **Tier choice.** Hidden MMR (Elo, K = 32, start 1,000). Tier rating = 800 + 100 × tier (0 = 800, I = 900 … X = 1,800). Tier = clamp(round((MMR − 870) / 100), arena min, arena max), which targets a 60% expected player win rate.
- **New players.** In the first 20 matches every bot's mistake rate is +10 points, which targets about 65%.
- **Standard levels.** Skirmish has a toggle that puts every card on both sides at L7.
- **Later PvP (designed now):** Ranked caps all cards at L8; the trophy ladder prefers opponents within ±1 average level.

### A6.9 Pacing check (engaged player: 4 charged ladder wins at 60%, daily capsule, 3 quests)

| Measure | Value |
|---|---|
| Copies per bag capsule (expected) | 9.1 |
| Amber per bag capsule (expected) | 227 |
| Capsules per day | 4 win + 1 daily + ~0.9 Clay meter |
| Daily income | ~48 copies and ~1,700 Amber |
| Common to max (153 copies) | ~4.5 months (~1.1 copies per card per day) |
| Rare to max (130 copies) | ~4.3 months (~1.0 per card per day) |
| Epic to max (44 copies) | ~3 months (~0.5 per card per day) |
| All 5 Legendaries owned | ~2 weeks (script, pity, no duplicates) |
| Legendary to max (11 copies each) | ~4.5 months |
| Focused War Plan at L7 | ~6 weeks, faster with Dust crafting |
| Whole collection maxed | ~5-5.5 months: copies run out at ~135 days and Amber (273,350 total) at ~160 days |

A 365-day economy sim (B12) MUST confirm these figures within ±20% and keep the gap between the copy and Amber finish dates under 30 days before release.

### A6.10 Conquest (mastery board)

- **Unlock.** Arena 3. The board lists 9 Generals in a fixed order; each opens after the previous one is beaten once.
- **Matches.** Full War against the General's personal War Plan at a fixed tier and level:

  | General | Tier | Bot level |
  |---|---|---|
  | Pip Quickstep | I | 1 |
  | Captain Kettle | II | 2 |
  | Mama Moss | III | 3 |
  | Baroness Ledger | IV | 4 |
  | Sgt. Boomsworth | V | 5 |
  | Ada & Ivo | VI | 6 |
  | Rook | VII | 7 |
  | Madame Tempest | VIII | 8 |
  | The Warden | X | 9 |

- **Stars (one-time rewards per General):**
  - Star 1, win: 200 Amber.
  - Star 2, win with your base above 50% HP: 100 Dust.
  - Star 3, win before 6:00: an Age Capsule.
- **Milestones:** 9 stars give a Jade Capsule, 18 stars a Jade Capsule, 27 stars an Aeon Capsule and the title Conqueror.
- Conquest matches use no charges, change no trophies and do not move MMR.

## A7. Bot opponents: AI Generals

### A7.1 Honesty rules (enforced in code)

- **Same rules.** Bots issue commands through the same `Command` API as the player: same gold, XP, prices, cooldowns and levels. No stat multipliers at any tier, and no timer-based evolving.
- **Same information.** A bot controller receives only an `Observation` (B15), never the `Sim`. The observation holds the lane, both bases, turrets, both ages and XP percentages, both power charge rings, visible telegraphs, the opponent's stance, Treasury level and Last Stand state, the Scouted list, and the bot's own gold and queue. Bots never see the player's gold or War Plan; they estimate gold from time, Treasury level and kills.
- **Disclosed modifiers.** Any Daily Challenge modifier is symmetric and shown on the VS screen.
- **Labeling:**
  - robot icon and "AI" chip on every nameplate
  - "AI General" on the VS screen
  - "Plays by the same rules as you" on the bot profile card
  - "AI" in match history
  - Settings > About: "All opponents in this version are AI."
  - Help text: "Opponent difficulty adapts to your recent results."

### A7.2 Decision model (utility AI)

- **Timing.** Every decision interval, the bot reads the observation from `tick − snapshotDelay` (the session keeps the ring buffer, B6) and scores every legal action.
- **Weights.** Each personality weight w (0-100) becomes a multiplier m = 0.5 + w / 100. Every scoring term f is clamped to [0, 1].
- **Values.** V(u) = card cost of unit u. myArmy and foeArmy = summed V of each side's units.

| Action | Score |
|---|---|
| Train card c | 1.0 · f_counter(c) + 0.6 · m_aggr · f_push + 0.4 · f_role(c) + 0.3 · m_legendary · [c is Legendary] + 0.3 · [banking and c's range ≥ 250] − 0.8 · f_save(c) |
| Build turret on an empty mount | m_turret · f_pressure · f_spare |
| Buy mount (all owned mounts filled) | 0.8 · m_turret · f_pressure · f_spare |
| Modernise | 0.8 · m_turret · [turret age < current age] · f_spare |
| Treasury | m_econ · [before 3:00] · [no enemy within 600 lu of own gate] · [level < tier max] · f_spare |
| Evolve | 1.2 when XP ≥ threshold and (no enemy ground unit within 300 lu of own gate, or m_greed ≥ 1.3), after the tier's evolve delay |
| Power | 1.0 when the best zone's enemy value ≥ tier threshold × m_patience, or own base took damage in the last 3 s and zone value ≥ 100; aim error applied |
| Stance | Hold when the tier allows it, myArmy < 0.7 × foeArmy and ≥ 2 turrets are built, or when the push gate fails; otherwise Charge |
| Last Stand | When armed and ≥ 4 enemies are within 450 lu |
| Emote | See the emote rule below |

Terms:

- f_counter(c) = Σ M[c][e] · V(e) / Σ V(e) over enemy units within 500 lu of the bot's front (all enemies if none), limited to the first *counter depth* enemies by p. M is the compile-time counter matrix (B4). With no enemies, 0.5.
- f_push = 0.5 + (myArmy − foeArmy) / (2 × max(myArmy, foeArmy, 300)).
- f_role(c) = 1 / (1 + number of own alive units in c's role group).
- f_save(c) = 1 when a saving goal is active and gold − cost(c) would drop below it.
- f_pressure = enemy value within 480 lu of own gate / 400.
- f_spare = (gold − cost) / 300.

**Saving goals.** "Bank 350 for a Legendary" or "bank for Treasury" pause training, so the player sees a lull before a push.

**Push gate (anti-turtle).** Defence value D = enemy army value within 500 lu of their gate + 300 per enemy turret. The bot Charges past mid-lane only when myArmy ≥ 1.3 × D. Otherwise it banks: it sets a Treasury saving goal (if below its cap), prefers units with range ≥ 250, and holds at the line if its tier allows Hold. From Overdrive onward the gate uses 1.0 × D, and in Siege the bot always Charges.

**Attack clock.** If none of the bot's ground units has passed mid-lane for 60 s, train scores rise 10% per 5 s until it pushes, subject to the push gate.

**Choice.** With probability (1 − mistake rate) the bot takes the best action. Otherwise it picks a plausible human error from a list:

- over-commit into turret range
- evolve just before an enemy push
- fire the power on 1-2 units
- leave a mount empty
- float gold
- forget anti-air

It never makes "computer-stupid" moves such as selling every turret.

**Emotes.** Bots use only GG, Salute and Thumbs up, at most once per match. If the player emotes first, the bot may reply with those three at most once per 20 s. All bot emotes are muteable.

**Openings.** Each personality has an opening build (first 3-4 actions) with seeded variation.

**Determinism.** The bot RNG is seeded from `hash(matchSeed, side)`. Bot commands are recorded in the replay like human commands.

### A7.3 Tiers

| Tier | Decision interval | Snapshot delay | Mistake rate | Max actions / 10 s | Counter depth | Remembers composition | Predicts next enemy age | Evolve delay | Power aim error | Power threshold (gold in zone) | Treasury max | Gold float target | Hold / turret rebuild | Max turrets |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 2.0 s | 1,000 ms | 45% | 2 | 0 | no | no | 10 s | ±250 lu | 100 | 0 | 450 | no / no | 1 |
| I | 1.6 s | 900 ms | 35% | 3 | 0 | no | no | 8 s | ±200 lu | 100 | 0 | 400 | no / no | 4 |
| III | 1.35 s | 770 ms | 25% | 5 | 1 | no | no | 5 s | ±140 lu | 250 | 1 | 250 | no / no | 4 |
| V | 1.1 s | 640 ms | 16% | 7 | 3 | no | no | 3 s | ±90 lu | 350 | 2 | 180 | yes / yes | 4 |
| VII | 0.85 s | 510 ms | 9% | 9 | all | yes | no | safe window, ≤ 2 s | ±50 lu | 450 | 3 | 120 | yes / yes | 4 |
| X | 0.5 s | 300 ms | 3% | 12 | all | yes | yes | safe window, ≤ 0.5 s | ±20 lu | 600, or any value when own base < 25% | 3 | 80 | yes / yes | 4 |

- Numeric columns interpolate linearly for tiers II, IV, VI, VIII and IX. Counter depth takes the lower listed tier's value. Yes/no columns switch on at the listed tier.
- Counter depth 0 means weighted random choice from the loadout.
- No bot reacts faster than 300 ms.
- Adaptation happens only between matches.

### A7.4 Generals

Personality weights (0-100) feed the scoring.

| General | Personality | Tiers | Aggr | Turret | Economy | Evolve greed | Power patience | Legendary | Hold | Signature | VS line |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Old Grogg | Tutorial trainer | Training | scripted | | | | | | | Sends Training Dummies, never evolves; base starts at 50% (disclosed "Training match") | "Grogg ready. Grogg nap first." |
| Pip Quickstep | Balanced beginner | 0-II | 50 | 40 | 30 | 40 | 30 | 20 | 20 | Opens Ranged then Infantry, then leans on Heavies | "Ready when you are!" |
| Captain Kettle | Rusher | I-V | 90 | 15 | 10 | 20 | 20 | 30 | 0 | Infantry spam, all-in before each evolve | "Tea's getting cold. Charge!" |
| Mama Moss | Turtle | II-IV | 25 | 90 | 40 | 40 | 50 | 30 | 80 | Early turrets, Hold, pushes in Overdrive | "Nobody gets past my garden." |
| Baroness Ledger | Greedy evolver | III-VI | 40 | 40 | 95 | 95 | 40 | 40 | 40 | Treasury 3 by 2:30, evolves first, weak before 1:00 | "Money first. Manners later." |
| Sgt. Boomsworth | Artillery | IV-VII | 50 | 70 | 50 | 50 | 50 | 40 | 50 | Trebuchet, Bronze Cannon, Howitzer, Grenadier | "Stand still, please." |
| Ada & Ivo, "The Twins" | Balanced counters | V-VIII | 60 | 50 | 50 | 60 | 60 | 50 | 40 | Two portraits on one bot | "Two heads, one plan." |
| Rook | Counter-picker | VI-IX | 60 | 50 | 50 | 60 | 50 | 50 | 30 | Counter weight ×1.5, switches within seconds | "I see what you brought." |
| Madame Tempest | Power timing | VII-IX | 60 | 40 | 50 | 70 | 95 | 50 | 40 | Banks powers for evolve moments and clumps | "Wait for it..." |
| The Warden | All-round boss | X | 70 | 60 | 60 | 70 | 80 | 90 | 40 | Final boss of Arena 8 and Conquest; brings all five Legendaries at L9 (disclosed on VS). Appears in 1 of 5 Arena 8 ladder matches | "Every age ends. Yours ends here." |
| Echo of You | Mirror | Any (Skirmish) | derived | | | | | | | Plays your own active War Plan with the Balanced brain | "Let's see how you like it." |

- **Procedural AI Commanders** fill the ladder between Generals.
  - Names come from syllable tables in `content/names.ts` and always carry the prefix "AI · " (for example "AI · Brakka Stonejaw").
  - Each has a stable seeded profile: personality, favourite card, and a War Plan built from the pool under A6.8.
- **Readable intent.** Saving lulls, holding at the line, and a burst of spawns right after an evolve all telegraph the plan.

## A8. Onboarding: the first 40 minutes

On-screen text is at most 8 words. No menu, name prompt or account screen appears before the first win. The times below are targets; WP11 retimes every beat from a scripted sim run, and `tutorial/scripts.ts` holds the exact ticks.

| Time | Beat | Text |
|---|---|---|
| 0:00 | Click Play. Load ≤ 3 s. The title screen is the live battlefield with one Play button | "Play" |
| 0:03 | Match 1 (Tutorial format, Stone to Future) vs Old Grogg (AI, Training match: no clock, his base at 50%). Tray: Bonker only; the gold counter pulses when affordable. Grogg sends Training Dummies | "Tap to send a Bonker" |
| ~0:17 | First kill; "+30" flies to the gold counter | "Kills earn gold" |
| 0:20 | Pebbler card slides in (script `unlockSlot`) | "Pebblers shoot over friends" |
| 0:40 | Grogg sends a Tuskback; the script grants 150 gold and the empty mount pulses | "Build a Rock Tosser" |
| ~0:50 | Tutorial XP (250) fills; Evolve glows steadily on the XP bar | "Evolve!" |
| ~0:55 | Full Ascension show; 2 Vanguard Footmen march out; tray flips to Footman and Longbowman; Grogg stays in the Stone Age for comedy | none |
| ~1:20 | Arrow Storm ready; an animated hand drags it onto enemies | "Drag the arrows onto them" |
| ~1:30 / ~2:00 / ~2:35 | Gunpowder, Modern and Future, each with the full evolve show and that age's Infantry and Ranged commons in the tray | Future: "From clubs to lasers!" |
| ~3:00 | Grogg's base falls: slow motion, coins, staged rewards | none |
| ~3:10 | Capsule 1: guided taps, scripted climb to Bronze, Spear Hunter NEW (short walkout); auto-equipped | "Tap to crack it" |
| ~3:50 | Match 2: Short War vs Pip Quickstep (AI, tier 0), starter plan. Stone teaches Treasury; Medieval teaches the second mount. Pip opens Ranged then Infantry, then leans on Tuskbacks | "Tap your gold for Treasury"; "Buy a second turret mount"; "Heavies stop Bonkers. Try Spear Hunter." (adaptive) |
| ~9:00 | Win (a loss still gives rewards plus a retry). Capsule 2: Pikeman and Grenadier NEW. One forced upgrade: Bonker to L2 (hammer slam) | "+5% HP and damage" |
| ~10:00 | Home appears: editable auto name, Trophy Road reveal, first Daily Capsule; the Battle button pulses once | none |
| ~10:15 | Match 3: Ladder, Short War vs Captain Kettle (tier I) | none |
| After match 3 | War Plan screen and Skirmish unlock, with a prompt to review the Stone loadout | "Your army, your plan" |
| Match 4 | Stance flag appears | "Hold: gather at the line, then push." |
| Match 5 | Manual Last Stand button appears | "Low base? Tap Last Stand." |
| ~35-40 min | Capsule 5: Mammoth Matriarch, full Legendary walkout | none |

**Adaptive hints** fire at most once per 30 s, only on failure patterns, and at most 3 times each:

- "Their turret shreds melee. Try Pebblers."
- "Heavies stop Bonkers. Try a Spear Hunter."
- "Your power is ready."
- "Evolve before they do."
- "Buy another turret mount."
- "Hold: gather at the line, then push."
- "Old turret? Tap it to modernise."

**Instrumentation.** A local event log (ring buffer of 500 events) records each onboarding step's timestamp and drop-off. It can be exported from Settings for playtests. It never leaves the device.

## A9. Screens and UI flow

```
Boot (≤3 s) ─first launch─> Tutorial match 1 ─> Capsule 1 ─> Match 2 ─> Capsule 2 + upgrade ─> Home
Home: [BATTLE] | War Plan | Collection | Capsules | Trophy Road | Conquest | Profile | Settings(gear)
BATTLE ─> Mode (Ladder / Conquest / Skirmish / Daily Challenge) ─> VS (2 s, skippable, AI badge) ─> Battle ─> Pause
Battle ─> Result (rewards staged, tap to skip) ─> Capsule opening (if earned) ─> Home or Next battle
```

| # | Screen | Contents |
|---|---|---|
| 1 | Boot | Logo ≤ 1 s, progress bar; Stone assets first, the rest streams in during the tutorial or the menu |
| 2 | Home | Big Battle button with the next opponent preview; Trophy Road bar with the next reward; capsule tray ("Open (3)", "Open all"); Clay meter; charges; daily quests; profile chip; settings gear |
| 3 | Mode select | Ladder (format picker from Arena 2); Conquest (from Arena 3); Skirmish (from match 4: choose General or Echo, tier 0-X, format, speed, "Standard levels" toggle; 5 Amber per win); Daily Challenge (A9.1) |
| 4 | VS | Your card vs the AI General card: AI badge, tier, levels ("Plan Lv 3.4 vs Lv 3"), format, personality line, modifiers, boss disclosures |
| 5 | Battle HUD | See A9.2 |
| 6 | Pause | Resume, Scouted list, Settings, Retreat (after 1:00), Quit Skirmish |
| 7 | Result | Victory/Defeat/Draw banner; recap (units trained and killed, base damage, time per age, MVP card); rewards staged one at a time (trophies tick, Amber, capsule or Clay pip, Codex points, quest progress), each skippable with a tap; Next battle, Watch replay, Home |
| 8 | Capsule opening | A10, with the odds and pity panel on every capsule |
| 9 | War Plan | Preset tabs A/B/C; 5 age tabs; 5 unit + 2 turret + 1 power slots; collection filtered to the age; average level; auto-fill; advisor warnings; skin picker per card |
| 10 | Collection | Grid filterable by age, role and rarity, with owned/unowned toggle; silhouettes for unowned; copies bar and foil badges per card; Skins tab; crafting with Dust |
| 11 | Card detail | Animated idle on a stage; full stats (HP, damage, interval, DPS, range, speed, pop, train time, size, hits, tags, mods, abilities); Strong vs / Weak vs; next-level preview; Upgrade; skin carousel; foil frames owned |
| 12 | Trophy Road | Vertical path, arena gates, claimable nodes |
| 13 | Profile | A6.1 plus match history with replay buttons |
| 14 | Replay viewer | Play/pause, 1x/2x/4x, restart, side toggle for which HUD to show (seek arrives in v1.1) |
| 15 | Settings | Master/Music/SFX/UI volume; graphics preset (Auto/High/Lite); reduce motion; shake slider; hitstop on/off; damage numbers (Off/Important/All); colourblind preset (Default, Blue/Yellow, High contrast); language (EN in v1; DA in v1.1); default speed; save export/import/reset; odds overview; About; credits; export event log |
| 16 | Dev (`?dev=1`) | Art gallery, soundboard, feel tuner, spawn sandbox, time scale, replay debugger, capsule test bench, bot-vs-bot viewer |
| 17 | Conquest | Board of 9 Generals with stars, rewards and milestones (A6.10) |

### A9.1 Daily Challenge

- **Format:** Standard War. The opponent tier equals your ladder tier.
- **Modifier:** one symmetric modifier per day, seeded by the local date (`YYYYMMDD`, day starting 04:00):

| # | Modifier | Effect |
|---|---|---|
| 1 | Gold Rush | Passive gold ×1.5 |
| 2 | Glass Armies | Unit HP ×0.7 |
| 3 | Power Hour | Age Power charge ×2 |
| 4 | Fast Forward | XP thresholds ×0.7 |
| 5 | Heavy Metal | Heavy and Legendary cost −30% |
| 6 | Sudden Siege | Siege starts 1:15 earlier |

- **Reward:** the first win of the day gives an Age Capsule. Other wins pay 20 Amber. Daily matches use no charges and change no trophies.

### A9.2 Battle HUD (DOM overlay over the canvas)

- **Top bar (12% of height):**
  - Left: your base HP bar, age icon and XP bar, with the Evolve button attached to the XP bar.
  - Centre: match clock with a phase marker (Overdrive/Siege ticks on the timeline) and the emote button.
  - Right: the opponent's base HP, age icon, XP bar, power charge ring and a horn icon while their Last Stand is armed; a "Scouted (n)" chip; pause and speed.
  - Tapping the Scouted chip opens a drop-down list that collapses after 3 s. It is the only element that may briefly cover the lane band, and only on request.
- **Bottom tray (24% of height), left to right:**
  1. Gold counter with income per second and the next Treasury cost; tapping it buys Treasury.
  2. 5 unit cards: 88 px targets on screens ≥ 900 px wide, 72 px below. Each shows cost, queue count, radial training fill, affordable glow, foil frame, and the "ARMY FULL" / "LEGENDARY IN FIELD" states.
  3. Army counter ("Army 44/60") and stance flag (from match 4).
  4. Large round Age Power button (charge ring).
  5. Last Stand button (only when armed, from match 5).
- On an 844 px landscape phone (about 756 px usable after safe areas) the tray needs about 700 px.
- Turret mounts are tapped directly on the base in the canvas. The build, Modernise and Sell picker is a small DOM popover.
- No persistent control covers the lane band.
- **Denied press:** red flash, 2-frame shake, `ui_deny` sound.
- **Low base HP (< 25%):** red vignette pulse every 1.2 s.

## A10. Capsule opening storyboard

The result is rolled and saved before step 1, so a reload can't re-roll it. The sequence never fakes a near miss.

**The capsule.** A carved stone-and-brass drum with 5 age rings that light up as it climbs. Tier colours (none of them is a rarity colour):

| Tier | Colour |
|---|---|
| Clay | #9C6B4A |
| Bronze | #C27C3A |
| Silver | #C9D1DC |
| Jade | #2FBF71 |
| Aeon | Violet #8B5CF6 with a gold rim (every Aeon holds a Legendary) |

| Step | Time | Visual | Audio | Input |
|---|---|---|---|---|
| 1. Arrival | 0-0.5 s | Capsule drops on a pedestal, squash bounce, dust ring | `cap_thud` | none |
| 2. Charge | 0.5-2.0 s | Shaking, cracks leak light in the current tier colour, 4 strike pips, "Tap!" | `cap_riser` | none |
| 3. Strikes (4) | ~0.6 s each | Each tap is a hammer strike. The number of climbs k equals the pre-rolled tier index above the start tier. The first 4 − k strikes never climb and the last k strikes always climb, so a climb is never followed by a non-climb. A climb brings a colour step, a flash, +0.25 trauma and a lit pip. A non-climb gives a small dust puff | `cap_climb_1..4` (each a step higher) or `cap_clunk` (never a penalty sound) | Tap, or auto after 1.5 s idle |
| 4. Burst | 0.3 s | White flash, god-rays in the final colour, halves fly apart, Amber pours into the counter | `cap_burst` plus a tier stinger | none |
| 5. Cards | 0.15-0.8 s each | Cards fan out face down, rarest last. Each back glows in its rarity colour for 0.3 s (an honest pre-signal), then flips: Common 0.15 s (auto), Rare 0.4 s with a cyan shimmer, Epic 0.8 s with violet lightning. A foil adds a 0.5 s shine sweep (Holo 1 s). New cards get a "NEW" stamp and a silhouette-fill reveal. A NEW Epic gets a 2 s mini-walkout | `rarity_common/rare/epic`, `card_flip`, `foil_shine` | Tap flips faster; hold fast-forwards |
| 6. Legendary walkout | 8-10 s the first time, 3 s after | Screen dims to a spotlight, rings spin. Reveal order: a Legendary rarity flare, then a gold-rimmed silhouette growing from 20% to full size, then a bass drop as the unit bursts into colour and performs its signature move across a lane backdrop, then its victory pose, and last the age glyph and name banner. "LEGENDARY", confetti, "NEW!" or the duplicate bar | `walkout_bass`, `rarity_legendary` | Skippable after the first time that card is revealed |
| 7. Duplicates | 0.5 s per card | Each stack flies into its copies bar, which fills with ticks ("3/4" → "UPGRADE READY" badge bounces) | `copy_tick`, `upgrade_ready` | none |
| 8. Summary | Until closed | Grid of everything, new items highlighted, Amber total, updated pity counters | none | Equip now (per new card), Upgrade (jumps to the best ready upgrade), Open next (N), Done |

Rules:

- Nothing runs longer than 10 s without a skip (except a first-ever Legendary walkout, capped at 10 s).
- "Open all" shows the summary plus any Epic-or-better reveals.
- Rarity colours appear in UI only: Common #B8C0CC, Rare #22B8CF, Epic #A855F7, Legendary #F5B82E. Legendary units in the lane get a neutral white aura instead.

### A10.1 Wardrobe Crate reel (CS-style, behind `platform.features.reelReveal`, default on)

- 50 tiles scroll horizontally, with the winning tile placed at index 45.
- Filler tiles are drawn from the true odds using the cosmetic RNG. The reel never places a rarer item directly after the winner, so there is no staged near miss.
- The reel runs 5.5 s with quintic ease-out. `reel_tick` plays per tile crossing the pointer, falling slightly in pitch.
- The stop offset is random within the winning tile. The winner zooms with a colour burst, name, rarity and target unit.
- When the flag is off (for example a future Poki build), a card-flip reveal replaces the reel.

## A11. Art direction and animation (code-drawn now, swappable later)

**Style: chunky cartoon cutout.**

- Flat fills, two-tone cel shading (shadow = fill darkened 18%) and one highlight shape per part.
- Outlines 3 px at 720p (about 3.7 lu) in the fill colour darkened 45% (not black).
- Rounded shapes, heads about a third of body height, short legs, oversized weapons that read the role (bow = ranged, big shield = heavy, polearm = reach).
- No blood: units pop into dust, KO stars and coins.

**Scale, authored in lu with one world scale:** infantry ~68 lu tall, heavies 100-120 lu, Legendaries 170-220 lu. At 1,280 px wide (0.82 px/lu) infantry is about 56 px. Visual width stays within 1.4× the collision width.

**Team readability:**

- Player blue #2F7DF6, opponent orange #F28A1E (different value), on large parts: tabard, shield face, plume, pennant.
- Redundant cues:
  - facing direction
  - ground ring (circle for you, diamond for the enemy) with a 12 px role glyph (at 720p)
  - pennant on heavies
  - health bar colour
- Colourblind presets:
  - Blue/Yellow: #2F7DF6 / #F2C21E
  - High contrast: #1F5FD6 / #FF6A00, plus a stripe pattern on banners
- Health bars appear only once a unit is damaged, with a ghost segment that drains 300 ms after each hit.
- **Colour rule (MUST, checked by a gallery test).** Non-team parts of units, turrets, projectiles and lane effects may not use a hue within ±35° of any team hue in any preset (the bands 350°-81° and 182°-254°) at HSV saturation above 40% for more than 10% of the silhouette. Level trims, Legendary auras (white) and effect flashes follow the same rule.
- **Counter feedback.** A hit whose type modifier is ≥ ×1.5 shows an orange-white "effective" spark (`fx.spark_effective`, `hit_effective`); a hit at ≤ ×0.75 shows a grey "resisted" puff.

**Age palettes.** Large-area colours respect the colour rule; accents cover at most 10% of a silhouette.

| Age | Large-area colours | Accents |
|---|---|---|
| Stone | stone brown #8C7B68, moss #6E8B3D, bone #EDE3C8 | ochre #C98A3D |
| Medieval | slate #6B7682, wine #8E2A4A, parchment #E8DFC8 | gold #D4A437 |
| Gunpowder | bottle green #2E5E4E, cream #EFE6CF, dark wood #4A3B2E | brass #C9A227 |
| Modern | olive #62664A, khaki #B8A67A, gunmetal #3A3F45 | signal red-violet #B0306A |
| Future | charcoal #23262E, magenta #F03AA8, mint #3AF0B4, white | cyan #29E3F5 |

**Split-age lane (signature visual).**

- Your half of the backdrop shows your age and the enemy's half shows theirs, blended over a 240 lu seam with 30% desaturation.
- The seam sits at x = 600 and drifts toward the midpoint of the two front lines at ≤ 20 lu/s, clamped to x ∈ [450, 750], so it is not a moving blend directly behind every fight.
- On evolve, that side's half wipes to the new age from the base outward over 1.5 s.
- Backdrops have 3 parallax layers per age from seeded noise:
  - sky gradient
  - silhouettes (mountains → castles → windmills and masts → city → megastructures)
  - mid-ground
- The arena controls the ground and weather layer. Backdrops stay desaturated and low contrast.

**Bases.** Cave Hold, Keep, Star Fort, Bunker, Spire. Each has 4 turret mounts stacked vertically, crumble states at 75%, 50% and 25%, a visible Treasury level and a horn icon while Last Stand is armed.

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
| stun | Dizzy stars (clock ripple when `frozen`) |
| die | Fling and spin along the knockback direction, dust poof, coins; hat, helmet or weapon drops and stays 6 s (pool of 40) |
| victory | Cheer hop, raised weapon |
| ability | Card-specific |

**Card-specific ability clips:**

- charge lean: Tuskback, Knight, Cuirassier
- hook throw: Corsair
- shield raise: Footman
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

**Turret clips:** build drop-in, idle scan, aim rotation toward the target, fire recoil (120 ms squash plus a 1-frame muzzle flash), modernise (old turret sinks, new one drops in), sell poof, outdated arrow glow.

**Base clips:** ambient idle (torches, flags, lights), hit shake with debris, crumble stages, evolve morph (1.8 s: squash, light pillar, rebuild), Last Stand horn and volley, destroyed collapse.

## A12. Game feel checklist

All values live in `src/render/feel.config.json` and can be tuned live from the dev feel panel.

**Hitstop:**

- Local hitstop is view-only (the clips of attacker and victim pause; the sim continues).
- Global freezes pause the session's sim accumulator in offline modes; this never changes the outcome. Online later, they become view-only.
- Only these events freeze globally: Legendary death, power impact, your own evolve, Last Stand and base destroyed.
- Global freezes total at most 150 ms per rolling 3 s (base destroyed is exempt).

**Screen shake (trauma model):**

- shake = trauma²; linear decay 1.2/s; Perlin noise at 18 Hz with separate seeds for x, y and rotation.
- Max offset 12 px, max rotation 2.5°, plus a small directional kick along the attack vector.

| Event | Hitstop | Trauma | Flash | Particles | Sound |
|---|---|---|---|---|---|
| Light hit | none | 0 | Victim 60 ms | 3 sparks by damage type (effective spark or resisted puff when modified) | `hit_*` (4 variants), `hit_effective` |
| Heavy hit (≥ 15% victim max HP) | Local: victim 70 ms, attacker 50 ms, 1-2 px jitter | +0.05 | 80 ms | 6 sparks and dust | `hit_heavy` (3 variants) |
| Unit death | Local 50 ms (Heavy and Epic 70 ms); Legendary death: global 80 ms | +0.1 (Heavy +0.15) | none | 10 dust, KO stars, 1-4 coins flying to the gold counter (player kills only) | `die_bio` / `die_mech` |
| Mech death | as above; 1 in 3 explodes (cosmetic RNG) | +0.12 | 60 ms | explosion ring | `explosion_s` |
| Turret shot | none | 0 | Muzzle, 1 frame | 3 smoke | per turret (A14.2) |
| Base hit | none | +0.2 (max once per 0.5 s) | Base 60 ms | 4 chunks | `base_hit` (3 variants) |
| Power telegraph | none | 0 | none | Pulsing zone outline in the caster's team colour | `power_telegraph` |
| Power lands | Global 120 ms | +0.5 | 1 frame at 30% white | Per-power preset | Power sound; music ducks 6 dB for 1.5 s |
| Evolve (own) | Global 100 ms | +0.4 | White 120 ms | Light pillar, ring, age-icon confetti; allied units cheer-hop; Vanguard march out | `evolve_riser`, `evolve_fanfare_<age>`, music key change |
| Evolve (enemy) | none | +0.1 | none | Smaller pillar on their side; banner on their XP bar | `evolve_enemy` |
| Last Stand armed (enemy) | none | 0 | none | Horn icon on their base | `last_stand_armed` |
| Last Stand fires | Global 150 ms | +0.5 | Red 100 ms | Shockwave ring | `last_stand_charge`, `last_stand_fire` |
| Base destroyed | 250 ms, then 0.3× slow motion for 1.2 s (view only; sim has ended) | 1.0 | 200 ms | 120 debris | `base_destroyed`, victory/defeat stinger |

**Other feel rules:**

- **Damage numbers.** Default "Important": powers, base damage chunks and your own turret kills, spread 20-40 px apart. "All" shows every hit. Gold popups always show.
- **Reduce motion preset:** shake ×0, hitstop ×0.5, softer flashes, no slow motion.
- **Particles:** pooled; caps of 600 on mobile and 1,500 on desktop; the lowest-priority emitters drop first.
- **VFX list** (IDs in A14.1):
  - hit sparks by damage type (blunt dust, slash arc, pierce spark, bullet spark, laser scorch, blast)
  - muzzle flashes
  - projectile trails (bright core, team-tinted tail)
  - splash rings
  - heal glyphs, shield bubbles
  - mark reticle, gravity swirl, smoke cloud, EMP ring, time-stop clock ripple
  - gold popups flying to the counter, XP sparkles flying to the XP bar
  - Overdrive gold frame pulse, Siege red vignette with crumbling particles
  - white idle aura on Legendary units and Legendary skins

**Checklist every card and event MUST pass before sign-off:**

1. Spawn pop and dust.
2. Walk cycle matches speed (no foot sliding beyond 3 px).
3. Attack impact frame lands on the sim impact tick (±1 frame).
4. Hit flash on the victim.
5. Death fling and poof.
6. Correct SFX with variation.
7. Readable at 32 px height.
8. Team colour visible on both teams and both colourblind presets; the colour rule passes.
9. Skin keeps its silhouette.
10. No effect lasts longer than its gameplay meaning.

## A13. Audio: SFX and music

All SFX are ZzFX definitions (3-5 variants each) pre-rendered to AudioBuffers at load and referenced by ID. The manifest can switch any ID to a file later.

| Group | Sound IDs |
|---|---|
| UI | `ui_click`, `ui_hover`, `ui_deny`, `ui_toggle`, `ui_tab`, `ui_confirm`, `meter_pip` |
| Spawn and movement | `spawn_pop`, `spawn_heavy`, `spawn_legendary`, `step_heavy`, `step_mech` |
| Attacks | `swing_whoosh`, `shot_sling`, `shot_bow`, `shot_crossbow`, `shot_catapult`, `shot_musket`, `shot_lob`, `shot_cannon`, `shot_grapeshot`, `shot_rifle`, `shot_mg`, `shot_flak`, `shot_rocket`, `shot_rail`, `shot_laser`, `shot_arc`, `shot_plasma`, `bee_buzz`, `log_roll`, `cauldron_pour`, `toad_tongue`, `goose_honk`, `bomb_whistle`, `radio_call`, `emp_pulse`, `time_stop`, `gravity_hum` |
| Hits and deaths | `hit_blunt`, `hit_slash`, `hit_pierce`, `hit_bullet`, `hit_laser`, `hit_heavy`, `hit_effective`, `explosion_s`, `explosion_m`, `explosion_l`, `die_bio`, `die_mech`, `prop_drop`, `heal_tick`, `shield_up` |
| Turrets and bases | `turret_build`, `turret_sell`, `turret_upgrade`, `slot_buy`, `base_hit`, `base_crumble`, `base_destroyed` |
| Economy | `coin_gain` (pitch climbs on multi-kills; throttled to 1 per 40 ms), `xp_tick`, `treasury_up` |
| Evolve | `evolve_ready` (single soft chime), `evolve_riser`, `evolve_fanfare_stone/medieval/gunpowder/modern/future`, `evolve_enemy` |
| Powers | `power_ready`, `power_telegraph`, `pw_stampede`, `pw_meteor`, `pw_arrows`, `pw_decree`, `pw_smoke`, `pw_broadside`, `pw_paratroop`, `pw_bomber`, `pw_lance`, `pw_nanite` |
| Match | `last_stand_armed`, `last_stand_charge`, `last_stand_fire`, `overdrive_horn`, `siege_bell`, `victory_jingle`, `defeat_jingle` (gentle, not mocking), `emote_pop` |
| Capsules | `cap_thud`, `cap_riser`, `cap_climb_1`, `cap_climb_2`, `cap_climb_3`, `cap_climb_4`, `cap_clunk`, `cap_burst`, `card_flip`, `foil_shine`, `rarity_common` (pluck), `rarity_rare` (two rising notes), `rarity_epic` (triad arpeggio plus shimmer), `rarity_legendary` (5-note fanfare, pad, sub drop), `walkout_bass`, `copy_tick`, `upgrade_ready`, `upgrade_slam`, `level_up`, `reel_tick` |

**Mixer:**

- Buses: master, music, sfx, ui.
- At most 4 voices per sound ID and a 40 ms minimum retrigger gap.
- Pitch ±8% and volume ±3 dB per play.
- Sounds caused by the player get priority.
- Music ducks 6 dB during powers, evolves and walkouts.
- The AudioContext is created or resumed on the first user gesture (iOS).
- `navigator.vibrate` fires on climbs and Legendaries (mobile, toggle).

**Music:**

- **Theme.** "Dawn March", our own 16-bar singable theme at 110 BPM, deliberately unlike "Glorious Morning". WP6 writes one melody as note data; the owner can ask for alternates in v1.1.
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
- **Key changes.** Own evolves transpose the music by +2, +2, +1 and +1 semitones in turn (+6 total at Future), so every evolve gets a lift.
- Any `musicCueId` can later point to a composed file through the manifest.

## A14. ID appendix

### A14.1 Visual and effect IDs

- **Cards:** `unit.<slug>` for the 35 units plus `unit.training_dummy`; `turret.<slug>` for the 20 turrets; `power.<slug>` for the 10 powers (HUD icon and cast root).
- **Skins:** `<target visualId>@<skin slug>`, for example `unit.bonker@pumpkin_head` and `base.future@crystal_spire`.
- **World:** `base.<age>` (5), `backdrop.<age>` (5), `ground.<arena>` for tar_pits, frostfang, kingsmoat, powder_bay, iron_front, neon_harbor, orbital_ring, chrono_rift.
- **Projectiles:** `proj.rock`, `proj.boulder`, `proj.bee`, `proj.log`, `proj.arrow`, `proj.bolt`, `proj.goose`, `proj.musket`, `proj.lob`, `proj.cannonball`, `proj.grapeshot`, `proj.rocket`, `proj.chainshot`, `proj.bomb`, `proj.bullet`, `proj.shell`, `proj.flak`, `proj.plasma`, `proj.plasma_mortar`, `proj.gravity_orb`.
- **Instant and attack effects:** `fx.beam_laser`, `fx.beam_rail`, `fx.arc_chain`, `fx.tongue`, `fx.pitch_pour`, `fx.heal_beam`.
- **Hit and death effects:** `fx.spark_blunt`, `fx.spark_slash`, `fx.spark_pierce`, `fx.spark_bullet`, `fx.scorch_laser`, `fx.blast`, `fx.spark_effective`, `fx.puff_resisted`, `fx.muzzle`, `fx.trail`, `fx.splash_ring`, `fx.explosion_s`, `fx.explosion_m`, `fx.explosion_l`, `fx.dust_poof`, `fx.ko_stars`, `fx.coin`, `fx.xp_sparkle`, `fx.debris`.
- **Status and ability effects:** `fx.heal_glyph`, `fx.shield_bubble`, `fx.mark_reticle`, `fx.gravity_swirl`, `fx.smoke_cloud`, `fx.emp_ring`, `fx.time_ripple`, `fx.roar_ring`, `fx.call_marker`, `fx.dizzy`, `fx.legendary_aura`.
- **Power effects:** `fx.telegraph_zone`, `fx.aurochs`, `fx.meteor`, `fx.arrow_rain`, `fx.decree_glow`, `fx.cannonball_rain`, `fx.plane_bomber`, `fx.parachute`, `fx.orbital_beam`, `fx.nanite_swarm`.
- **Match effects:** `fx.evolve_pillar`, `fx.last_stand_wave`, `fx.overdrive_frame`, `fx.siege_vignette`.
- **UI icons:** `icon.role.<group>`, `icon.age.<age>`, `icon.horn`, `trim.bronze`, `trim.silver`, `trim.gold`, `foil.bronze`, `foil.silver`, `foil.holo`.

### A14.2 Per-card attack mapping

Defaults: spawn sound `spawn_pop` (Infantry, Ranged, AA, Support), `spawn_heavy` (Heavy, Epic), `spawn_legendary` (Legendary); death sound `die_mech` for the mech tag, else `die_bio`; hit sound `hit_<dmgType>` (`explosion_s` for blast). Turrets use `turret_build` and `turret_sell`.

| Card | Projectile / effect | Attack SFX | Damage type |
|---|---|---|---|
| bonker | melee | swing_whoosh | blunt |
| pebbler | proj.rock | shot_sling | blunt |
| tuskback | melee | swing_whoosh | blunt |
| spear_hunter | melee | swing_whoosh | pierce |
| drum_shaman | proj.rock | shot_sling | blunt |
| sabertooth | melee | swing_whoosh | slash |
| mammoth_matriarch | melee; riders proj.rock | swing_whoosh; shot_sling | blast; blunt |
| rock_tosser | proj.boulder | shot_catapult | blunt |
| angry_beehive | proj.bee | bee_buzz | pierce |
| log_roller | proj.log | log_roll | blunt |
| grumpy_toad | fx.tongue | toad_tongue | blunt |
| footman | melee | swing_whoosh | slash |
| longbowman | proj.arrow | shot_bow | pierce |
| destrier_knight | melee | swing_whoosh | pierce |
| pikeman | melee | swing_whoosh | pierce |
| friar | proj.rock | shot_sling | blunt |
| battering_ram | melee | swing_whoosh | blast |
| ursa_paladin | melee | swing_whoosh | slash |
| crossbow_nest | proj.bolt | shot_crossbow | pierce |
| pitch_cauldron | fx.pitch_pour | cauldron_pour | blast |
| trebuchet | proj.boulder | shot_catapult | blast |
| honk_ballista | proj.goose | goose_honk | blunt |
| corsair | melee | swing_whoosh | slash |
| fusilier | proj.musket | shot_musket | bullet |
| cuirassier | melee | swing_whoosh | slash |
| grenadier | proj.lob | shot_lob | blast |
| field_surgeon | proj.musket | shot_musket | bullet |
| bronze_cannon | proj.cannonball | shot_cannon | blast |
| balloon_admiral | proj.bomb | bomb_whistle | blast |
| swivel_gun | proj.musket | shot_musket | bullet |
| grapeshot_gun | proj.grapeshot | shot_grapeshot | bullet |
| congreve_rack | proj.rocket | shot_rocket | blast |
| chainshot_cannon | proj.chainshot | shot_cannon | blunt |
| trench_raider | melee | swing_whoosh | slash |
| rifleman | proj.bullet | shot_rifle | bullet |
| tankette | proj.shell | shot_cannon | blast |
| bazooka_trooper | proj.rocket | shot_rocket | blast |
| radio_operator | proj.bullet; call-in proj.shell | shot_rifle; radio_call | bullet; blast |
| gyrocopter | proj.bullet | shot_mg | bullet |
| behemoth_tank | proj.shell; MG proj.bullet | shot_cannon; shot_mg | blast; bullet |
| mg_nest | proj.bullet | shot_mg | bullet |
| flak_gun | proj.flak | shot_flak | blast |
| howitzer | proj.shell | shot_cannon | blast |
| searchlight_sniper | proj.bullet | shot_rifle | bullet |
| photon_knight | melee | swing_whoosh | laser |
| pulse_trooper | proj.plasma | shot_plasma | laser |
| walker_mech | melee | swing_whoosh | blunt |
| rail_gunner | fx.beam_rail | shot_rail | laser |
| repair_drone | fx.heal_beam | heal_tick | none |
| emp_saboteur | melee; EMP fx.emp_ring | swing_whoosh; emp_pulse | laser |
| chrono_titan | melee; fx.time_ripple | swing_whoosh; time_stop | blunt |
| pulse_laser | fx.beam_laser | shot_laser | laser |
| arc_coil | fx.arc_chain | shot_arc | laser |
| plasma_mortar | proj.plasma_mortar | shot_plasma | blast |
| gravity_well | proj.gravity_orb | gravity_hum | blast |
| training_dummy | melee | swing_whoosh | blunt |

### A14.3 Music cues

`music.menu`, `music.capsule`, `music.stone`, `music.medieval`, `music.gunpowder`, `music.modern`, `music.future`, `stinger.victory`, `stinger.defeat`. Layers: `intensity`, `overdrive`, `siege`.

---

# Part B. Technical architecture

## B1. Stack

WP0 pins every dependency to an exact version (the latest stable release of each major listed below) at scaffold time and commits the lockfile.

| Area | Choice | Version policy |
|---|---|---|
| Runtime | Node.js 22 LTS (≥ 22.12) | `engines` field in package.json |
| Package manager | npm 10 (bundled with Node); single package | Lockfile committed |
| Language | TypeScript 6.0, `strict`, `noUncheckedIndexedAccess` | Exact pin. TS 7 (native) is evaluated in v1.x once typescript-eslint supports it |
| Build and dev server | Vite 8 with `@preact/preset-vite` | Exact pin; WP0 verifies the preset works on Vite 8 and falls back to Vite 7 if not |
| Battle and capsule renderer | PixiJS 8 | Exact pin ≥ 8.16 (required for spine-pixi-v8 later); `preference: 'webgl'`, WebGPU behind `?gpu=webgpu` |
| Meta UI and HUD | Preact 10 with @preact/signals 2, plain CSS modules | Exact pins |
| Schemas | Valibot 1 | Content, saves, replays |
| Audio | ZzFX (vendored MIT source) plus own mixer and sequencer | Vendored in `src/audio/vendor/zzfx.ts` |
| Compression | fflate 0.8 | Save export codes |
| Tests | Vitest 4, fast-check 4, Playwright 1 (e2e smoke) | Exact pins; Browser Mode screenshots in v1.x |
| Lint | ESLint 9 flat config, typescript-eslint 8 | Layer and determinism rules (B2) |
| Scripts | tsx 4 | Headless tools |

**Why PixiJS.**

- It is a renderer, not a framework. We own the fixed-step loop and the sim.
- Its nested Container tree maps directly onto cutout rigs.
- `GraphicsContext` sharing and its SVG parsing suit code-drawn art. Parts are authored as SVG path data, so the same source feeds rendering, handoff sheets and the silhouette test.
- AssetPack manifests and the official `spine-pixi-v8` runtime give the art swap path.
- It is ~120-130 KB gzipped, which fits the 5 MB portal bar.
- Phaser 4 is a valid runner-up, but its physics, scenes and input would go unused, and it is 345 KB. Godot web is ~9 MB and not agent-friendly for TS.

**Repo.**

- **Public** GitHub repository `SimNyborg/ageborn` (the owner chose public to keep hosting free). It already exists; WP0 does not create it.
- Hosting: GitHub Pages via GitHub Actions (`.github/workflows/pages.yml`) at https://simnyborg.github.io/ageborn/. Vite `base` MUST be `/ageborn/` for the Pages build. Every push to `main` deploys, so the owner can always play the latest build in a browser.
- Cost rule: the project must run on free tiers only (GitHub free, Pages, Actions minutes on a public repo). No paid services.
- Version note (checked 2026-09-27): current releases include Vite 8.3, PixiJS 8.21, Preact 10.29, Vitest 5, ESLint 10, TypeScript 7.0. Prefer the newest majors when typescript-eslint and the Vite preset support them; otherwise pin the versions in the table above.
- Local play:
  - `npm install`
  - `npm run dev` serves http://localhost:5173
  - `npm run play` builds and previews
- Nothing needs to be online.

## B2. Architecture overview and layering

```
UI input / keyboard ───────────────┐
Bot controllers <── Observation ring (delayed) ──┐
       │ Command[]                               │
       v                                         │
TimedCommand[] ──> sim.step()  (pure, deterministic, 20 Hz) ──> sim.observe(side)
                          │ SimState (read-only to others) + SimEvent[]
                          v
       render/BattleView: interpolation, UnitViews via injected ArtProvider,
       feel layer (hitstop, shake, VFX, numbers), injected AudioService
                          │ HudModel signal (15 Hz)
                          v
                       ui/hud (DOM)
MatchResult ──> meta (pure rules) ──> SaveDoc ──> save (localStorage) ; ui/screens read signals
```

**Allowed imports** (enforced by ESLint `no-restricted-imports` plus an import-graph test in `tests/integrity`):

| Layer | May import |
|---|---|
| `contracts` | nothing but itself |
| `core` | contracts |
| `i18n` | contracts |
| `content` | contracts, core |
| `sim` | contracts, core |
| `ai` | contracts, core |
| `meta` | contracts, core, content |
| `save` | contracts, core |
| `visuals` | contracts, core, pixi.js |
| `audio` | contracts, core |
| `render` | contracts, core, pixi.js (ArtProvider and AudioService arrive by injection) |
| `ui` | contracts, core, content (read-only), i18n, preact, signals; service instances only via `app/services` injection |
| `capsule` | contracts, core, i18n, pixi.js, preact (ArtProvider and AudioService injected) |
| `tutorial` | contracts, core, i18n |
| `platform` | contracts |
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

- **Tick:** 50 ms. `ms → ticks = max(1, round(ms / 50))`. A Full War is at most 11,400 ticks.
- **Integer state:**
  - Positions are world x in milli-lu (lane = 1,200,000); helpers convert to per-side p.
  - HP, shields, heals and damage are integers in centi-units (×100).
  - Gold and XP are milli-units. Power charge is in parts per million.
  - Multipliers are in bp and applied one at a time: `v = Math.trunc(v × f / 10000)`, in the fixed order of A2.7.
  - 32-bit hash math uses `Math.imul`.
  - Every intermediate value stays within ±2^31.
- **RNG.** sfc32 with 4×uint32 state stored in `SimState.rng`, seeded via xmur3 of `"${seed}"`. Sim randomness is used only for:
  - power jitter
  - Congreve scatter
  - Smoke Screen misses

  Views use a separate mulberry32 cosmetic RNG.
- **Entities.** Arrays with stable increasing ids (`nextId`), iterated in id order; removals compact at the end of the tick.
- **Tick pipeline (MUST be in this order):**
  1. Apply this tick's commands, sorted by (side, seq), and this tick's training script events. Invalid commands are ignored and emit `commandRejected` with a reason.
  2. Clock and phase: phase changes; Siege base decay every 20 ticks.
  3. Economy: passive gold and XP (× phase and modifier), XP cap, Overcharge conversion.
  4. Ascension timers (queue conversion and Vanguard at `ageUp`), stance cooldowns, turret build, sell and modernise timers.
  5. Training: advance the first non-waiting item; spawn finished items that fit, in queue order.
  6. Statuses: expire, tick regen, innate shield regen, recompute auras.
  7. Timed abilities: heals (applied here, strongest healer per unit), Roar, EMP, Time Stop, pounce triggers; called strikes schedule impacts.
  8. Unit attack state machines (retarget, windup start, due melee impacts collected), in id order.
  9. Turret attack state machines, mount order side 0 then side 1 (collect only).
  10. Projectiles: advance; arrivals add impacts.
  11. Power casts: telegraph countdowns; due impacts collected.
  12. Last Stand: arming, charge countdowns, blasts collected, auto-trigger at 10%.
  13. Impact resolution: apply every collected impact through the damage pipeline, then knockback and pulls.
  14. Deaths: bounties, XP, on-death effects (spawns, explosions), `died` events. Repeat in id order until no new deaths, at most 8 passes. Then compaction.
  15. Movement: symmetric resolution per A2.7, then air units.
  16. Win check: base HP ≤ 0, Final Bell, retreat.
  17. `prevX` bookkeeping for interpolation; every 20 ticks the FNV-1a state hash goes into `state.hashes`.
- **Commands** are stamped with the execution tick `sim.tick + 1` offline (online later: + 4). Human and bot commands go through the same queue and are all recorded.
- **Replays:** `ReplayDoc` (B15): `{ v: 1, simVersion, contentHash, seed, format, sides, modifiers, training, commands, result, finalHash, hashes }`, about 5-20 KB.
  - Verification re-simulates and compares `finalHash`.
  - A replay whose `contentHash` differs from the current build is shown as "from an older version" and cannot be played.
- **Match stats.** `sim/stats.ts` (WP2) is a pure reducer over `SimEvent`s that produces `MatchStats`, including MVP card, quest counters and power hit counts.
- **Performance:** a full headless Full War in ≤ 400 ms on desktop Node; average `step()` ≤ 0.5 ms on a mid-range phone.

## B4. Content pipeline

- **Location.** Content lives as typed TS modules in `src/content`:
  - `raw/` holds the Part A tables exactly as written (units and turrets per age, powers, economy). WP0 ships it in Phase 0.
  - The rest covers skins, cosmetics, rarities, capsules, arenas, formats, trophyRoad, generals, names, quests and dailyModifiers.
- **Stats.** Numbers are exactly the Part A tables (final level-1 values per age).
- **Validation.** `schema.ts` (Valibot) runs in tests and in dev boot. It checks:
  - unique IDs
  - cross-references (skin → card, loadout → age, power → age)
  - every attack has explicit `hitsGround` and `hitsAir`
  - every `visualId`, `effectId` and `soundId` exists in the manifests (these checks live in `tests/integrity`, WP12)
- **Compilation.** `compile.ts` converts ms to ticks, speeds to milli-lu per tick, HP and damage to centi-units and percentages to bp, derives bounty values and pop, and computes `contentHash` (FNV-1a over canonical JSON). The result is a frozen `CompiledContent` object.
- **Counter matrix.** `npm run content:counters` runs equal-gold 1v1 duels of every unit pair at L1 on a flat lane and writes `src/content/generated/counters.json`: M[a][b] = clamp(0.5 + (hpLeft_a − hpLeft_b) / 2, 0, 1), with hpLeft as a fraction of starting HP. `strongVs` and `weakVs` are the top and bottom 3 opponents of the same or adjacent age. CI fails if the file is stale.
- **Spreadsheets.** `tools/csv.ts` exports the unit, turret and power tables to CSV and imports them back, so balance can be tuned in a spreadsheet.
- **Strings.** Cards reference `nameKey` and `descKey` in `src/i18n/content.en.json`. Danish files with the same keys arrive in v1.1; the loader falls back to EN.

## B5. Art provider and visual manifest (the swap contract)

- Gameplay data references only `visualId`. The visual manifest `src/visuals/manifest.ts` maps each `visualId` (including skin entries such as `unit.bonker@pumpkin_head`) to a `VisualDef`.
- `ArtProvider` picks an adapter by `kind`:

| Kind | Adapter | When |
|---|---|---|
| `placeholder` | `PlaceholderView`: role-shaped capsule silhouettes in team colour | Day 1, so render work never blocks on art |
| `procedural` | `ProceduralPuppetView` | v1 |
| `atlas` | `AtlasAnimView`, via Pixi Assets bundles built by AssetPack | Later |
| `spine` | `SpineView` via `@esotericsoftware/spine-pixi-v8` | Later |

- **Team colour contract.** Every adapter provides a team tint layer: named part zones (procedural), per-part mask textures (atlas) or `team_*` slots (Spine). `VisualDef.team` says which.
- **The sim owns timing.** The view receives `attackStarted { windupTicks }` and time-scales the attack clip so its `impactAt` lands on the impact tick. Replacing art can never change balance.
- **Procedural v1 (tier 0):**
  - Parts are SVG path data in `src/visuals/parts/<age>.ts`, authored in lu.
  - They are baked once at load into a runtime texture atlas at `min(devicePixelRatio, 2)` (1 in Lite).
  - They are rendered as Sprites in a Container tree per rig.
  - Clips are JSON-style keyframes on bone rotation, offset and scale, plus procedural helpers (walk cycle, bob, squash).
  - Skins are manifest entries with their own palette (non-team zones), overlays, filters (including alpha), projectile visual and particle aura.
  - Age 0-1 parts bake at boot; ages 2-4 bake during the tutorial or the menu (idle callback).
- **Later tiers:**
  - AI-generated or painted static parts drop into the same rigs at the same pivots (with a defringe step for alpha halos).
  - Then AssetPack atlases (`assets-src/**/{tps}`), then Spine.
  - Units swap one at a time by editing their manifest entry. Tiers can mix in one match.
  - A URL override `?art=placeholder|procedural|atlas` forces a tier for comparison.
- **Art gallery** (`?dev=1#gallery`) renders every visualId × clip × skin × team × colourblind preset.
  - It is the review sheet and the screenshot-test target.
  - It exports the SVG part sources as handoff sheets for artists or image generators.
  - It hosts the silhouette IoU test and the colour-rule test, both rasterising the same SVG data.
- **Portraits for DOM UI.** `ArtProvider.portrait()` renders a rig pose to an offscreen canvas and caches a data URL keyed by (card, skin, size).

## B6. Renderer, feel layer and HUD

**Pixi Application:**

- One persistent canvas for the battle, the capsule stage and card stages.
- Stage layers: backdrop, ground decals, units (depth-sorted by y), projectiles, VFX, floating text, telegraphs, screen flash.

**Interpolation.** `alpha = acc / DT`. The view position is lerp(prevX, x, alpha). Frame time is clamped to 250 ms.

**Loop (in `app/session.ts`):**

```
acc += min(frameMs, 250) × speed × (freeze ? 0 : 1)
while acc ≥ 50:
  for each bot side: obsRing[side].push(sim.observe(side))
  cmds = humanCmds + stamp(bot.onTick(obsRing[side].at(bot.snapshotDelayTicks)))
  events = sim.step(cmds); view.onEvents(events); acc −= 50
view.render(alpha, frameMs)
```

Global freezes set `freeze` for their duration, within the A12 cap.

**Event mapper.** `render/eventMapper.ts` turns `SimEvent`s into view actions using `feel.config.json` rules: clips, flashes, hitstop, trauma, particles, numbers, sounds, music intensity.

**HUD** is a Preact DOM overlay fed by a `HudModel` signal (type in contracts) updated at 15 Hz. It also covers card states, turret mount hit areas (canvas pointer events mapped to mounts) and power drag targeting (a canvas overlay that shows the zone).

**Graphics presets:**

| Preset | DPR | Particle cap | Parallax layers | Shadows | Legendary auras | Draw call budget |
|---|---|---|---|---|---|---|
| Lite | 1 | 300 | 2 | off | off | ≤ 40 |
| High | 2 | 1,500 | 3 | on | on | ≤ 80 |
| Auto | High on desktop, Lite on mobile or when the average frame time over 3 s exceeds 20 ms | | | | | |

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
  - Quota errors are caught and shown to the player.
- **Capsule rolls** use a meta RNG stream stored in the save (`rng.capsule`, sfc32 state). The result is written before any animation.
- **Local clocks** drive daily timers (reset 04:00), limited by the bank caps.

## B9. Meta services (pure TS)

- **Signature style.** Every meta function is `(save, content, clock, …) → { save, outcome }`: no mutation, no I/O.
- **Covers:**
  - rewards, charges and the Clay meter
  - capsule bag, roll, pity, foil and script
  - wardrobe
  - upgrades, crafting and Dust
  - War Plan validation, auto-fill, Equip now and advisor
  - trophies, arenas and the road
  - quests (progress from `MatchStats`)
  - Codex Level
  - Conquest
  - MMR, tier and opponent selection (arena level curve)
  - Daily Challenge modifier selection
  - economy pacing sim entry points
- The app layer holds the current `SaveDoc` in a signal and calls `saveStore.save` after each meta transition.

## B10. AI module

- `createBot(profile, side, seed, content)` returns a `BotController` with `onTick(obs: Observation): Command[]`. The session stamps tick and seq.
- The controller runs the brain every `decisionIntervalTicks` and enforces the action cap. The observation ring buffer lives in the session (B6), so a controller cannot reach undelayed state.
- Brains are pure given (observation, rng, profile, content). Scoring follows A7.2.
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
- **`BattleSession`:** builds `MatchConfig` from the save plus the opponent spec, creates the sim, bots, observation rings, view and HUD model, runs the loop, records the replay, and on end calls meta rewards then saves.
- **`PlatformAdapter`:** v1 ships `NonePlatform` (no ads, `reelReveal: true`). Poki, CrazyGames and Y8 adapters come later.

## B12. Headless tools (`tools/`, run with tsx)

| Command | Does |
|---|---|
| `npm run sim:balance` | Runs on worker_threads. Per card: 2,000 mirrored-seed matches of the test plan vs the baseline plan (A2.14), both tier V Balanced at L7; passes when the 95% CI of the win-rate delta lies within ±3. Smoke mode (CI): 400 matches per card, ±6. Also reports match length distribution, evolve timings per strategy, Final Bell rate, first-mover rate, turret kill share, base time-to-kill and power coverage. Exits non-zero when an A2.14 target fails. Full run ≈ 1.5 h on 8 workers (nightly or manual) |
| `npm run sim:exploits` | Scripted player proxies vs a tier VII Balanced bot at L7: (1) Treasury 3 greed, (2) 4-turret turtle with Hold (target 35-45%), (3) cheapest-unit spam, (4) Heavy plus mass Ranged at the pop cap, (5) mass splash (Grenadier, Bronze Cannon, Radio Operator), (6) heal stacking, (7) XP bank and double evolve, (8) power saved for evolve moments. Targets per A2.14 |
| `npm run sim:economy` | 365-day player model (4 charged ladder wins per day at 60%, daily capsule, Clay meter, quests); checks A6.9 within ±20% and the copy/Amber finish gap ≤ 30 days |
| `npm run sim:drops` | 10^6 capsule openings; chi-square against published odds; bag totals; pity boundary checks |
| `npm run replay:verify <file>` | Re-simulates a replay and compares hashes |
| `npm run content:csv -- export\|import` | Balance CSV round trip |
| `npm run content:counters` | Regenerates the counter matrix (B4) |

## B13. Testing

- **Core:** RNG known-answer vectors, hash vectors, fixed-point helpers.
- **Sim:**
  - A unit test per formula and system: spacing, overtaking, followSupport, overlap, symmetric movement, two-phase impacts, targeting priorities and retargeting, knockback and pulls, first-hit bonus, pop cap, queue skipping, legendary limit, turret range cap, area rule, heal split and strongest-healer rule, Siege mods, Last Stand, evolve rescale, queue conversion, Vanguard, XP cap, Overcharge, every power and ability.
  - 10 golden replays with known final hashes, run against a frozen fixture content set (`tests/fixtures/content`), so tuning never breaks them.
  - Determinism: run twice, compare hashes.
  - fast-check invariants:
    - HP ≤ max
    - gold ≥ 0
    - no unit beyond a gate
    - pop ≤ 60
    - at most 1 Legendary alive or queued
    - phase order monotonic
  - Benchmark (`vitest bench`): a headless Full War ≤ 400 ms.
- **AI:** a bot never issues illegal commands (fuzz 500 matches); respects the action cap; receives only `Observation` (type test); tier X beats tier I ≥ 90%, VII beats III ≥ 75%, I beats 0 ≥ 65% (400 matches each).
- **Meta:** bag totals exactly 30/40/20/7/3 per 100; Epic pity at 10; Legendary pity curve 26-40; duplicate-Legendary protection; new-card protection; foil rates; script at capsules 1-5; charges and the Clay meter; upgrade costs; Dust; quest progress; MMR and tier formula; arena bot levels; Conquest stars.
- **Save:** migration fixtures for every version (v1 fixture from day one); checksum fallback; export/import round trip; quota error.
- **Schemas:** `expectTypeOf<InferOutput<typeof S>>().toEqualTypeOf<T>()` for every schema/type pair (SaveDoc, content defs, ReplayDoc).
- **Integrity:** every content visualId, effectId, soundId and musicCueId resolves; the import-layer graph obeys B2; every string key used in code exists in the EN files; no hard-coded UI strings.
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
  docs/design.md            (this document)   docs/art-style.md   docs/contracts.md   docs/balance-log.md
  docs/requests/            (change requests between work packages)
  public/                   (favicon, fonts bundled, no external requests)
  src/
    contracts/              ids.ts content.ts commands.ts events.ts sim.ts observation.ts bot.ts
                            art.ts audio.ts hud.ts save.ts meta.ts session.ts platform.ts feel.ts i18n.ts
                            index.ts  fakes/{content.ts,art.ts,audio.ts,saveStore.ts,clock.ts,sim.ts}
    core/                   fixed.ts rng.ts hash.ts ids.ts assert.ts ring.ts
    i18n/                   index.ts content.en.json ui.en.json hud.en.json capsule.en.json tutorial.en.json
    content/                raw/{stone,medieval,gunpowder,modern,future,powers,economy}.ts
                            ages.ts formats.ts rarities.ts skins.ts cosmetics.ts capsules.ts arenas.ts
                            trophyRoad.ts generals.ts names.ts quests.ts dailyModifiers.ts
                            generated/counters.json  schema.ts compile.ts index.ts
    sim/                    createSim.ts state.ts step.ts commands.ts events.ts observe.ts stats.ts
                            replay.ts hashState.ts geometry.ts damage.ts
                            systems/{clock,economy,ascend,training,status,abilities,targeting,combat,
                                     turrets,projectiles,powers,laststand,impacts,deaths,movement,win}.ts
                            test/
    ai/                     createBot.ts controller.ts brain.ts scoring.ts counters.ts
                            personalities.ts tiers.ts openings.ts estimate.ts mistakes.ts
                            scripted.ts test/
    meta/                   rewards.ts charges.ts capsules/{bag,roll,pity,script,foil,wardrobe}.ts
                            upgrades.ts dust.ts warplan.ts advisor.ts trophies.ts quests.ts codex.ts
                            conquest.ts mmr.ts matchmaking.ts daily.ts newSave.ts test/
    save/                   schema.ts defaults.ts store.localStorage.ts slots.ts checksum.ts
                            exportImport.ts migrations/{index.ts,v1.ts} test/
    visuals/                provider.ts manifest.ts style.ts palette.ts bake.ts portraits.ts
                            rigs/{biped,quadruped,rider,vehicle,walker,flyer,turret,base}.ts
                            parts/{shared,stone,medieval,gunpowder,modern,future}.ts
                            clips/{common,abilities}.ts skins.ts backdrops/{sky,silhouettes,ground}.ts
                            effects/{particles,projectiles,powers}.ts
                            adapters/{placeholder,procedural,atlas,spine}.ts test/
    render/                 battleView.ts layers.ts interpolate.ts camera.ts eventMapper.ts
                            hudModel.ts powerTargeting.ts mounts.ts healthbars.ts
                            feel/{hitstop,shake,flash,numbers,particlePool,director}.ts
                            feel.config.json
    audio/                  service.ts mixer.ts sounds.ts music.ts sequencer.ts unlock.ts
                            scores/{dawnMarch,arrangements,stingers}.ts
                            vendor/zzfx.ts
    ui/                     router.ts theme.css components/** screens/{home,modeSelect,vs,result,
                            warplan,collection,cardDetail,trophyRoad,conquest,profile,settings,pause}/**
                            hud/**
    capsule/                capsuleStage.ts climb.ts cardFan.ts walkout.ts reel.ts summary.tsx
                            CapsuleScreen.tsx
    tutorial/               director.ts scripts.ts hints.ts
    app/                    main.tsx boot.ts services.ts session.ts replayPlayer.ts eventLog.ts
                            screens/replay/**
    platform/               adapter.ts none.ts
    dev/                    router.tsx (import.meta.glob of dev/*/page.tsx)
                            gallery/ soundboard/ feel/ sandbox/ capsuleBench/ botViewer/ replayDebug/
  tools/                    sim-cli.ts balance.ts exploits.ts proxies.ts economy.ts drops.ts
                            replayVerify.ts csv.ts counters.ts report.ts
  tests/                    integrity/*.test.ts  e2e/*.spec.ts  fixtures/content/**
  assets-src/               (empty in v1; AssetPack input later)
```

## B15. Key contracts (`src/contracts`, owned by WP0, frozen after Phase 0)

Changes to these files go through the integration lead (C1). Every type referenced below is defined here.

```ts
// ids.ts
export type Side = 0 | 1;
export type AgeId = 'stone' | 'medieval' | 'gunpowder' | 'modern' | 'future';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type SkinRarity = 'rare' | 'epic' | 'legendary';                 // 'mythic' arrives in v1.1
export type CardId = string; export type SkinId = string; export type VisualId = string; export type EffectId = string;
export type SoundId = string; export type MusicCueId = string;
export type EmoteId = 'laugh' | 'salute' | 'cry' | 'angry' | 'thumbsUp' | 'gg';
export type FormatId = 'tutorial' | 'short' | 'standard' | 'full';
export type CapsuleTier = 'clay' | 'bronze' | 'silver' | 'jade' | 'aeon';
export type Foil = 'none' | 'bronze' | 'silver' | 'holo';
export type TeamPreset = 'default' | 'blueYellow' | 'highContrast';
export type Tag = 'light'|'armored'|'bio'|'mech'|'ground'|'air'|'legendary'|'support'|'ranged'|'melee';
export type Role = 'infantry'|'ranged'|'heavy'|'antiArmor'|'support'|'skirmisher'|'siege'
  |'artillery'|'airBomber'|'airGunship'|'antiMech'|'siegeHeavy';
export type RoleGroup = 'infantry'|'ranged'|'heavy'|'antiArmor'|'support'|'epic'|'legendary';
export type DmgType = 'blunt' | 'slash' | 'pierce' | 'bullet' | 'laser' | 'blast';
export interface Pt { x: number; y: number }
export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
```

```ts
// content.ts
export interface DamageMod { vs: Tag; bp: number }
export type TargetPriority = 'front' | 'armored' | 'backline' | 'air' | 'densest';
export type StatusKind = 'stun'|'slow'|'mark'|'shield'|'regen'|'damageBuff'|'speedBuff'|'attackSpeedBuff';
export interface StatusApply { kind: StatusKind; magnitudeBp: number; durationMs: number; amount?: number; frozen?: boolean }
export interface AttackDef {
  damage: number; intervalMs: number; windupPct?: number;               // default 40 melee / 50 ranged / 0 turret
  range: number; minRange?: number; hitsGround: boolean; hitsAir: boolean;
  projectile?: { speed: number; arc?: boolean; visualId: VisualId } | { instant: true; effectId: EffectId };
  dmgType: DmgType; sfx: SoundId;
  splashRadius?: number; pierce?: { count: number; length: number };   // counts include the primary target
  cleave?: { count: number; reach: number }; chain?: { count: number; hop: number };
  line?: { fromGate: number }; gateZone?: { radius: number }; followBehind?: number;
  volley?: number; scatter?: number; maxTargets?: number;               // area default: economy.areaMaxTargets
  mods?: DamageMod[]; vsBaseDamage?: number; priority?: TargetPriority;
  onHit?: StatusApply[]; drag?: { distance: number }; pull?: { radius: number; fractionBp: number };
}
export type AbilityDef =
  | { kind: 'firstHitBonus'; multBp: number; knockback: number; idleResetMs: number }   // negative knockback pulls
  | { kind: 'aura'; radius: number; status: StatusApply }
  | { kind: 'heal'; hpPerSec: number; radius: number; targets: number; pulseMs: number }
  | { kind: 'pounce'; searchRange: number; cooldownMs: number; leapMs: number; firstBiteBp: number }
  | { kind: 'riders'; count: number; attack: AttackDef; onDeathSpawn: CardId }
  | { kind: 'onDeathExplode'; damage: number; radius: number }
  | { kind: 'periodicShieldAura'; everyMs: number; radius: number; maxTargets: number; shield: number; durationMs: number }
  | { kind: 'callStrike'; everyMs: number; searchRange: number; delayMs: number; damage: number; radius: number; sideLockoutMs: number }
  | { kind: 'emp'; everyMs: number; triggerRadius: number; radius: number; stunMs: number }
  | { kind: 'timeStop'; everyMs: number; radius: number; freezeMs: number; legendaryFreezeMs: number }
  | { kind: 'innateShield'; amount: number; regenPerSec: number; delayMs: number }
  | { kind: 'resist'; minSourceRange: number; bp: number }
  | { kind: 'brace' } | { kind: 'siegeOnly' }
  | { kind: 'bomber'; dropWindow: number }
  | { kind: 'followSupport'; behindFront: number; soloMaxP: number };
export interface UnitDef {
  id: CardId; kind: 'unit'; age: AgeId; rarity: Rarity; role: Role; group: RoleGroup;
  cost: number; trainMs: number; pop: number; hp: number; speed: number;
  size: 'small' | 'medium' | 'large' | 'huge'; tags: Tag[];
  attacks: AttackDef[]; abilities: AbilityDef[];
  visualId: VisualId; sfx: { spawn: SoundId; die: SoundId };
  nameKey: string; descKey: string; strongVs: CardId[]; weakVs: CardId[]; hidden?: boolean;
}
export interface TurretDef {
  id: CardId; kind: 'turret'; age: AgeId; rarity: Exclude<Rarity, 'legendary'>; cost: number;
  attack: AttackDef; visualId: VisualId; nameKey: string; descKey: string;
}
export type PowerEffect =
  | { kind: 'barrage'; count: number; durationMs: number; zone: number; damage: number; radius: number;
      jitter: number; hitsAir: boolean; pattern: 'even' | 'line' }
  | { kind: 'sweep'; zone: number; durationMs: number; damage: number; width: number; hitsAir: boolean }
  | { kind: 'stampede'; runners: number; spacingMs: number; distance: number; speed: number;
      damage: number; knockback: number; maxHitsPerEnemy: number }
  | { kind: 'buffAll'; statuses: StatusApply[] }
  | { kind: 'cloud'; width: number; durationMs: number; enemyMissBp: number; allyDamageBp: number }
  | { kind: 'paradrop'; card: CardId; count: number; beyondFront: number; fallbackP: number };
export interface PowerDef { id: CardId; kind: 'power'; age: AgeId; slot: 'default' | 'alternate';
  telegraphMs: number; effect: PowerEffect; visualId: VisualId; sfx: SoundId; nameKey: string; descKey: string }
export interface AgeDef { id: AgeId; index: number; pBp: number; baseHp: number; xpToNext: number | null;
  paletteId: string; baseVisualId: VisualId; backdropVisualId: VisualId; musicCue: MusicCueId }
export interface FormatDef { id: FormatId; ages: AgeId[]; overdriveMs: number | null; siegeMs: number | null;
  finalBellMs: number | null; retreatAfterMs: number | null; xpToNextOverride?: number[] }
export interface EconomyRules {
  startGold: number; passiveGoldPerSec: number; passiveXpPerSec: number;
  treasuryCosts: number[]; treasuryMilliGoldPerSecPerLevel: number; mountCosts: number[];
  bountyGoldBp: number; bountyXpBp: number; powerKillGoldBp: number; powerKillXpBp: number;
  ownLossXpBp: number; underdogBp: number; baseDamageXpPerPct: number; xpCapBp: number;
  popCap: number; popByGroup: Record<RoleGroup, number>; queueMax: number; legendaryLimit: number;
  sellRefundBp: number; turretRangeCap: number; turretBuildMs: number; turretSellMs: number;
  ascendMs: number; evolveHealBp: number; vanguardCount: number;
  powerChargeMs: number; powerCarryCapBp: number; overchargeXp: number; overchargeBp: number;
  overdrive: { baseGoldBp: number; xpBp: number; powerBp: number };
  siege: { turretDamageBp: number; baseDamageBp: number; decayBpPerSec: number };
  lastStand: { thresholdBp: number; autoBp: number; radius: number; damagePerP: number; knockback: number; chargeMs: number };
  spawnP: number; holdLine: number; holdRetreatSpeedBp: number; leash: number; spacingBp: number;
  retargetMs: number; retargetCloserLu: number; rangedSelfDefenseLu: number; firstHitIdleMs: number;
  stanceCooldownMs: number; sizes: Record<'small'|'medium'|'large'|'huge', number>;
  knockbackResistBp: Record<'small'|'medium'|'large'|'huge', number>;
  areaSecondaryBp: number; areaMaxTargets: number; healLegendaryBp: number; legendaryPowerDamageBp: number;
  powerZoneClamp: [number, number]; emoteCooldownMs: number; drawGapBp: number; levelStepBp: number; maxLevel: number }
export interface SkinDef { id: SkinId; target: CardId | `base.${AgeId}`; rarity: SkinRarity; visualId: VisualId;
  inCratePool: boolean; craftable: boolean; sfxOverrides?: Record<string, SoundId>; nameKey: string }
export interface CompiledTicks { ascend: number; powerCharge: number; turretBuild: number; turretSell: number;
  stanceCooldown: number; retarget: number; healPulse: number; firstHitIdle: number; lastStandCharge: number }
export interface CompiledContent { hash: string; ages: Record<AgeId, AgeDef>; formats: Record<FormatId, FormatDef>;
  economy: EconomyRules; units: Record<CardId, UnitDef>; turrets: Record<CardId, TurretDef>;
  powers: Record<CardId, PowerDef>; skins: Record<SkinId, SkinDef>; rarities: unknown; capsules: unknown;
  arenas: unknown; trophyRoad: unknown; generals: unknown; names: unknown; quests: unknown;
  dailyModifiers: unknown; cosmetics: unknown;                // concrete types in content/*.ts, re-exported here
  counters: Record<CardId, Record<CardId, number>>; ticks: CompiledTicks }
```

```ts
// commands.ts
export type Command =
  | { t: 'train'; side: Side; slot: 0 | 1 | 2 | 3 | 4 }
  | { t: 'cancelTrain'; side: Side; slot?: 0 | 1 | 2 | 3 | 4 }   // no slot = last item
  | { t: 'buildTurret'; side: Side; mount: 0 | 1 | 2 | 3; slot: 0 | 1 }
  | { t: 'replaceTurret'; side: Side; mount: 0 | 1 | 2 | 3; slot: 0 | 1 }
  | { t: 'sellTurret'; side: Side; mount: 0 | 1 | 2 | 3 }
  | { t: 'buyMount'; side: Side }
  | { t: 'treasury'; side: Side }
  | { t: 'evolve'; side: Side }
  | { t: 'power'; side: Side; p?: number }                        // own-side progress in lu; omitted = auto-aim
  | { t: 'stance'; side: Side; stance: 'charge' | 'hold' }
  | { t: 'lastStand'; side: Side }
  | { t: 'emote'; side: Side; emote: EmoteId }
  | { t: 'retreat'; side: Side };
export type TimedCommand = Command & { tick: number; seq: number };
```

```ts
// events.ts
export type KillerKind = 'unit' | 'turret' | 'power' | 'lastStand' | 'ability' | 'decay';
type EventBody =
  | { e: 'unitSpawned'; id: number; side: Side; card: CardId; x: number; summoned: boolean; level: number }
  | { e: 'attackStarted'; id: number; targetId: number; windupTicks: number; attackIndex: number }
  | { e: 'projectileFired'; pid: number; from: number; targetId: number; toX: number; travelTicks: number; visualId: VisualId }
  | { e: 'hit'; targetId: number; sourceId: number; sourceCard: CardId; castId: number | null;
      sourceKind: KillerKind; damage: number; shieldAbsorbed: number; heavy: boolean; modBp: number; x: number; dmgType: DmgType }
  | { e: 'healed'; id: number; amount: number } | { e: 'statusApplied'; id: number; kind: StatusKind; ms: number; frozen: boolean }
  | { e: 'knockback'; id: number; fromX: number; toX: number }
  | { e: 'abilityUsed'; id: number; ability: AbilityDef['kind']; x: number }
  | { e: 'died'; id: number; side: Side; card: CardId; killerId: number | null; killerCard: CardId | null;
      killerKind: KillerKind | null; killerSide: Side | null; bountyGold: number; bountyXp: number; x: number }
  | { e: 'turretBuildStart' | 'turretBuilt' | 'turretSold' | 'turretReplaced'; side: Side; mount: number; card: CardId }
  | { e: 'turretFired'; side: Side; mount: number; targetId: number }
  | { e: 'baseDamaged'; side: Side; sourceId: number | null; damage: number; hp: number; maxHp: number }
  | { e: 'goldEarned'; side: Side; amount: number; reason: 'bounty' | 'passive'; x?: number }
  | { e: 'xpEarned'; side: Side; amount: number; reason: 'passive' | 'kill' | 'loss' | 'base' }
  | { e: 'queueChanged'; side: Side } | { e: 'queueConverted'; side: Side; from: CardId; to: CardId }
  | { e: 'mountBought'; side: Side; mount: number } | { e: 'treasuryUp'; side: Side; level: number }
  | { e: 'ascendStart' | 'ageUp'; side: Side; age: AgeId }
  | { e: 'powerReady'; side: Side } | { e: 'powerTelegraph'; side: Side; power: CardId; castId: number; x: number; zone: number }
  | { e: 'powerImpact'; side: Side; power: CardId; castId: number; x: number; index: number }
  | { e: 'stanceChanged'; side: Side; stance: 'charge' | 'hold' }
  | { e: 'lastStandArmed' | 'lastStandCharge' | 'lastStandFire'; side: Side }
  | { e: 'phaseChanged'; phase: 'regulation' | 'overdrive' | 'siege' }
  | { e: 'emote'; side: Side; emote: EmoteId }
  | { e: 'commandRejected'; side: Side; t: Command['t']; reason: string }
  | { e: 'matchEnded'; result: MatchOutcome };
export type SimEvent = EventBody & { tick: number };
export interface MatchOutcome { winner: Side | null;                  // null = draw
  reason: 'baseDestroyed' | 'bothDestroyed' | 'finalBell' | 'retreat'; tick: number; baseHpBp: [number, number] }
```

```ts
// sim.ts
export interface Loadout { units: (CardId | null)[]; turrets: (CardId | null)[]; power: CardId }   // lengths 5 and 2
export interface SideConfig { label: string; isBot: boolean; loadouts: Partial<Record<AgeId, Loadout>>;
  levels: Record<CardId, number>;                                 // every owned card, including summon sources
  skins: Record<string, SkinId> }
export interface TrainingEvent { tick: number; side: Side; grantGold?: number; unlockSlot?: number; setPowerPpm?: number }
export interface MatchConfig { seed: number; format: FormatId; content: CompiledContent;
  sides: [SideConfig, SideConfig]; modifiers?: string[];
  training?: { enemyBaseStartBp?: number; noClock?: boolean; script?: TrainingEvent[];
               manualLastStand?: [boolean, boolean]; stanceEnabled?: [boolean, boolean]; trays?: Partial<Record<AgeId, number[]>> } }
export interface AttackState { targetId: number; impactTick: number; nextAttackTick: number; lastAttackTick: number }
export interface ActiveStatus { kind: StatusKind; magnitudeBp: number; untilTick: number; amount: number; frozen: boolean; sourceId: number }
export interface UnitState { id: number; side: Side; card: CardId; level: number; x: number; prevX: number;
  hp: number; maxHp: number; shield: number; innateShield: number; mode: 'walk'|'attack'|'hold'|'retreat'|'leap'|'dying';
  attacks: AttackState[];                                         // indexed like UnitDef.attacks, riders appended
  statuses: ActiveStatus[]; air: boolean; summoned: boolean; timers: number[]; lastDamageTick: number }
export interface QueueItem { card: CardId; group: RoleGroup; progress: number; total: number; waiting: boolean }
export interface TurretState { card: CardId; age: AgeId; level: number; state: 'building' | 'active' | 'selling' | 'replacing';
  readyTick: number; attack: AttackState }
export interface ProjectileState { pid: number; side: Side; sourceId: number; sourceCard: CardId; targetId: number;
  x: number; toX: number; impactTick: number; attackIndex: number; visualId: VisualId }
export interface PowerCastState { castId: number; side: Side; power: CardId; startTick: number; x: number; zone: number;
  nextIndex: number; levelBp: number }
export interface SideState { gold: number; xp: number; ageIndex: number; ascendUntil: number;
  queue: QueueItem[]; pop: number; treasury: number; mountsOwned: number;
  turrets: (TurretState | null)[]; powerPpm: number; stance: 'charge' | 'hold'; stanceReadyTick: number;
  baseHp: number; baseMaxHp: number; lastStand: 'locked' | 'armed' | 'charging' | 'used'; retreated: boolean;
  callStrikeReadyTick: number }
export interface SimState { tick: number; phase: 'regulation' | 'overdrive' | 'siege' | 'ended'; sides: [SideState, SideState];
  units: UnitState[]; projectiles: ProjectileState[]; casts: PowerCastState[]; rng: [number, number, number, number];
  nextId: number; outcome: MatchOutcome | null; hashes: number[] }
export interface ReplayDoc { v: 1; simVersion: string; contentHash: string; seed: number; format: FormatId;
  sides: [SideConfig, SideConfig]; modifiers: string[]; training: MatchConfig['training'] | null;
  commands: TimedCommand[]; result: MatchOutcome; finalHash: number; hashes: number[] }
export interface Sim { readonly state: Readonly<SimState>; readonly config: Readonly<MatchConfig>;
  step(cmds: readonly TimedCommand[]): readonly SimEvent[]; hash(): number; observe(side: Side): Observation }
export declare function createSim(cfg: MatchConfig): Sim;
export declare function replayMatch(r: ReplayDoc, content: CompiledContent, toTick?: number): Sim;
```

```ts
// observation.ts and bot.ts
export interface Observation { tick: number; side: Side; phase: SimState['phase'];
  me: { gold: number; xpBp: number; ageIndex: number; queue: CardId[]; pop: number; treasury: number; mountsOwned: number;
        turrets: ({ card: CardId; age: AgeId } | null)[]; powerPpm: number; stance: 'charge' | 'hold'; baseHpBp: number;
        lastStand: SideState['lastStand']; tray: (CardId | null)[]; turretCards: (CardId | null)[]; power: CardId };
  foe: { ageIndex: number; xpBp: number; powerPpm: number; turrets: ({ card: CardId; age: AgeId } | null)[]; baseHpBp: number;
         stance: 'charge' | 'hold'; treasury: number; lastStand: SideState['lastStand']; scouted: CardId[] };
  telegraphs: { side: Side; power: CardId; p: number; zone: number; impactTick: number }[];
  units: { id: number; side: Side; card: CardId; level: number; p: number; hp: number; maxHp: number; shield: number;
           air: boolean }[] }                                     // p relative to the observer
export interface BotProfile { generalId: string; tier: number; mistakeBonusBp: number;
  weights: { aggr: number; turret: number; economy: number; greed: number; patience: number; legendary: number; hold: number };
  openings: string[] }
export interface BotController { readonly snapshotDelayTicks: number; onTick(obs: Observation): Command[] }
export declare function createBot(profile: BotProfile, side: Side, seed: number, content: CompiledContent): BotController;
```

```ts
// art.ts (implemented by visuals, consumed by render and capsule through injection)
export type ClipName = 'spawn'|'idle'|'walk'|'attack'|'hit'|'stun'|'die'|'victory'|'ability';
export interface ClipRef { kind: 'keyframes' | 'atlas' | 'spine'; ref: string; durationMs: number; loop: boolean }
export interface Anchors { feet: Pt; head: Pt; muzzle: Pt; hitCenter: Pt }
export type TeamSpec = { kind: 'zones'; zones: string[] } | { kind: 'mask'; maskTextures: string[] } | { kind: 'slots'; slots: string[] };
export interface VisualDef { kind: 'placeholder' | 'procedural' | 'atlas' | 'spine'; source: string; anchors: Anchors;
  heightLu: number; team: TeamSpec; clips: Partial<Record<ClipName | string, ClipRef>>; events: { attack: { impactAt: number } };
  projectileVisualId?: VisualId; filters?: { alpha?: number; glow?: string } }
export interface UnitPose { x: number; y: number; facing: 1 | -1; hpBp: number; shieldBp: number; stunned: boolean;
  frozen: boolean; alpha: number; levelTrim: 'none' | 'bronze' | 'silver' | 'gold'; roleGlyph: RoleGroup }
export interface UnitView { readonly root: import('pixi.js').Container; readonly anchors: Anchors;
  setPose(p: UnitPose): void; play(clip: ClipName | string, o?: { durationMs?: number; impactAtMs?: number; loop?: boolean }): void;
  freeze(ms: number): void; flash(ms: number, color?: number): void; update(dtMs: number): void; destroy(): void }
export interface TurretView { readonly root: import('pixi.js').Container; aimAt(x: number): void;
  play(clip: 'build' | 'idle' | 'fire' | 'sell' | 'modernise'): void; setOutdated(on: boolean): void; update(dtMs: number): void; destroy(): void }
export interface BaseView { readonly root: import('pixi.js').Container; mountPoints(): Pt[]; setCrumble(stage: 0 | 1 | 2 | 3): void;
  setTreasury(level: number): void; morphTo(age: AgeId, ms: number): void; lastStandGlow(on: boolean): void;
  hit(): void; collapse(): void; update(dtMs: number): void; destroy(): void }
export interface BackdropView { readonly root: import('pixi.js').Container; setSeam(x: number): void;
  wipe(side: Side, age: AgeId, ms: number): void; update(dtMs: number): void; destroy(): void }
export interface EffectView { readonly root: import('pixi.js').Container;
  fly(from: Pt, to: Pt, travelMs: number, arc: boolean): void; playAt(at: Pt, o?: Record<string, number>): void;
  readonly done: boolean; update(dtMs: number): void; destroy(): void }
export interface ArtProvider {
  preload(ages: AgeId[]): Promise<void>;
  createUnit(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): UnitView;
  createTurret(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): TurretView;
  createBase(o: { age: AgeId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): BaseView;
  createBackdrop(o: { left: AgeId; right: AgeId; arena: string }): BackdropView;
  createProjectile(visualId: VisualId, side: Side): EffectView;
  createEffect(effectId: EffectId, o?: Record<string, number>): EffectView;
  portrait(o: { card: CardId; skin?: SkinId; foil?: Foil; size: number; side?: Side }): Promise<string>;   // data URL
}
```

```ts
// audio.ts
export type Bus = 'master' | 'music' | 'sfx' | 'ui';
export type MusicLayer = 'intensity' | 'overdrive' | 'siege';
export interface AudioService { unlock(): Promise<void>;
  play(id: SoundId, o?: { pitchBp?: number; volumeDb?: number; pan?: number; priority?: number }): void;
  setBusVolume(bus: Bus, v01: number): void;
  music: { setCue(cue: MusicCueId, o?: { fadeMs?: number }): void; setLayer(l: MusicLayer, v01: number): void;
           transpose(semitones: number): void; duck(db: number, ms: number): void; stop(fadeMs?: number): void } }
```

```ts
// hud.ts
export type CardState = 'ready' | 'unaffordable' | 'armyFull' | 'legendaryInField' | 'empty';
export interface HudCard { slot: number; card: CardId | null; cost: number; queued: number; trainFillBp: number;
  state: CardState; foil: Foil }
export interface HudModel { clockMs: number; phase: SimState['phase']; phaseMarks: { overdriveMs: number | null; siegeMs: number | null; finalBellMs: number | null };
  me: { gold: number; goldPerSec: number; nextTreasuryCost: number | null; baseHpBp: number; ageIndex: number; xpBp: number;
        evolveReady: boolean; ascending: boolean; pop: number; popCap: number; stance: 'charge' | 'hold'; stanceVisible: boolean;
        powerPpm: number; power: CardId; lastStand: SideState['lastStand']; lastStandManual: boolean; cards: HudCard[] };
  foe: { label: string; isAI: true; baseHpBp: number; ageIndex: number; xpBp: number; powerPpm: number;
         lastStandArmed: boolean;
         scouted: CardId[] };
  mounts: { index: number; owned: boolean; card: CardId | null; outdated: boolean; state: TurretState['state'] | 'empty' }[];
  speed: 1 | 1.5 | 2; paused: boolean; canRetreat: boolean }
```

```ts
// feel.ts
export interface FeelRule { hitstopLocalMs?: { victim: number; attacker: number }; hitstopGlobalMs?: number; trauma?: number;
  flashMs?: number; flashColor?: number; particles?: { effectId: EffectId; count: number; priority: number }[];
  sound?: SoundId; duckDb?: number; duckMs?: number }
export interface FeelConfig { shake: { decayPerSec: number; noiseHz: number; maxOffsetPx: number; maxRotDeg: number };
  globalFreezeCapMs: number; globalFreezeWindowMs: number; heavyHitBp: number;
  damageNumbers: 'off' | 'important' | 'all'; particleCaps: { mobile: number; desktop: number };
  events: Record<string, FeelRule> }
```

```ts
// i18n.ts
export type Locale = 'en' | 'da';                                  // 'da' files ship in v1.1
export interface I18n { readonly locale: Locale; setLocale(l: Locale): void;
  t(key: string, params?: Record<string, string | number>): string; has(key: string): boolean }
```

```ts
// save.ts
export interface AvatarSpec { seed: number; parts: Record<string, number>; portraitCard?: CardId }
export interface Settings { volume: Record<Bus, number>; graphics: 'auto' | 'high' | 'lite'; reduceMotion: boolean;
  shake: number; hitstop: boolean; damageNumbers: 'off' | 'important' | 'all'; teamPreset: TeamPreset; locale: Locale;
  defaultSpeed: 1 | 1.5 | 2; vibrate: boolean; mutedEmotes: boolean }
export interface ProfileStats { matches: number; wins: number; losses: number; draws: number; winsByTier: number[];
  lossesByTier: number[]; trainedByCard: Record<CardId, number>; fastestWinMs: number | null; futureReached: number }
export interface QuestSlot { id: string; progress: number; claimed: boolean }
export interface QuestState { daily: QuestSlot[]; rerollUsed: boolean; dayKey: string; weekly: QuestSlot; weekKey: string }
export interface CapsuleStack { card: CardId; rarity: Rarity; copies: number; isNew: boolean; foil: Foil; dust: number }
export interface CapsuleContents { stacks: CapsuleStack[]; amber: number; dust: number; skin: SkinId | null }
export interface PendingCapsule { id: string;
  kind: 'win' | 'daily' | 'road' | 'meter' | 'age' | 'codex' | 'conquest' | 'ageUnlock';
  tier: CapsuleTier; startTier: CapsuleTier; scriptIndex: number | null; age: AgeId | null;
  contents: CapsuleContents; createdAt: number }                  // rolled at grant time
export interface PendingCrate { id: string; source: 'codex' | 'weekly' | 'road' | 'aeon'; skin: SkinId;
  rarity: SkinRarity; duplicateDust: number; createdAt: number }  // rolled at grant time
export interface CapsuleReveal { capsule: PendingCapsule; climbs: number; strikeClimbs: boolean[];
  pityBefore: SaveDoc['pity']; pityAfter: SaveDoc['pity']; firstLegendaryReveal: CardId[] }
export interface WardrobeReveal { crate: PendingCrate; reelTiles: SkinId[]; winnerIndex: 45; stopOffsetBp: number }
export interface SaveDoc { v: number; createdAt: number;
  profile: { name: string; avatar: AvatarSpec; banner: string; frame: string; title: string };
  currencies: { amber: number; dust: number };
  trophies: { current: number; best: number; roadClaimed: number[] }; arenaIndex: number;
  collection: Record<CardId, { level: number; copies: number; isNew: boolean; foil: Foil }>;
  powersOwned: CardId[];
  skins: { owned: SkinId[]; equipped: Record<string, SkinId> }; cosmetics: { owned: string[] };
  warPlans: { name: string; loadouts: Record<AgeId, Loadout> }[]; activePlan: number;
  capsules: { pending: PendingCapsule[]; charges: number; chargesUpdatedAt: number; freeCapsulesLeft: number;
              clayMeter: number; dailyBank: number; dailyNextAt: number | null; bag: number[]; wardrobe: PendingCrate[] };
  pity: { sinceEpic: number; sinceLegendary: number; sinceNewCard: number; opened: number;
          wardrobeSinceEpic: number; wardrobeSinceLegendary: number };
  rng: { capsule: [number, number, number, number] }; scriptStep: number;
  quests: QuestState; codexPoints: number; codexLevel: number;
  mmr: number; lossStreak: number; matchesPlayed: number;
  daily: { dayKey: string; won: boolean };
  conquest: { stars: Record<string, [boolean, boolean, boolean]>; milestonesClaimed: number[] };
  stats: ProfileStats; settings: Settings; tutorial: { step: number; hintsShown: Record<string, number> };
  lastExportAt: number | null; flags: Record<string, boolean> }
export interface SaveStore { load(): Promise<SaveDoc | null>; save(doc: SaveDoc, o?: { immediate?: boolean }): Promise<void>;
  exportCode(doc: SaveDoc): string; importCode(code: string): Result<SaveDoc>;
  loadReplays(): ReplayDoc[]; pushReplay(r: ReplayDoc): void }
export type Migration = (doc: unknown) => unknown;
```

```ts
// meta.ts (pure; Clock injected)
export interface Clock { now(): number }
export interface MatchStats { trained: number; kills: number; turretKills: number; evolves: number; reachedFinalAgeAtMs: number | null;
  powerMaxHits: number; baseDamage: number; heavyKillsByAA: number; usedTreasury: boolean; usedLastStand: boolean;
  ownBaseHpBpAtEnd: number; durationMs: number; mvpCard: CardId | null }
export interface OpponentSpec { generalId: string; displayName: string; isAI: true; tier: number; level: number; format: FormatId;
  side: SideConfig; modifiers: string[]; seed: number; warmUp: boolean; disclosures: string[] }
export interface MatchResultInput { mode: 'ladder' | 'conquest' | 'skirmish' | 'daily' | 'tutorial'; outcome: MatchOutcome;
  mySide: Side; opponent: OpponentSpec; stats: MatchStats }
export type RewardStep =
  | { kind: 'trophies'; delta: number } | { kind: 'amber'; amount: number } | { kind: 'dust'; amount: number }
  | { kind: 'capsule'; capsuleId: string } | { kind: 'clayPip'; meter: number } | { kind: 'codex'; points: number; levelUp: boolean }
  | { kind: 'quest'; questId: string; progress: number; done: boolean } | { kind: 'star'; generalId: string; star: 1 | 2 | 3 }
  | { kind: 'arena'; arenaIndex: number } | { kind: 'title'; title: string };
export interface PlanIssue { age: AgeId; severity: 'error' | 'warning'; code: string; messageKey: string }
export interface SkirmishOptions { generalId: string | 'echo'; tier: number; format: FormatId; standardLevels: boolean }
export interface Meta {
  newSave(content: CompiledContent, clock: Clock, seed: number): SaveDoc;
  applyMatchResult(s: SaveDoc, r: MatchResultInput, c: CompiledContent, clock: Clock): { save: SaveDoc; rewards: RewardStep[] };
  grantCapsule(s: SaveDoc, kind: PendingCapsule['kind'], c: CompiledContent, clock: Clock, o?: { tier?: CapsuleTier; age?: AgeId }): SaveDoc;
  openCapsule(s: SaveDoc, id: string): { save: SaveDoc; reveal: CapsuleReveal };
  openWardrobe(s: SaveDoc, id: string): { save: SaveDoc; reveal: WardrobeReveal };
  upgrade(s: SaveDoc, card: CardId, c: CompiledContent): Result<SaveDoc>;
  craft(s: SaveDoc, id: string, c: CompiledContent): Result<SaveDoc>;
  validatePlan(plan: SaveDoc['warPlans'][number], s: SaveDoc, c: CompiledContent, format: FormatId): PlanIssue[];
  autoFill(s: SaveDoc, c: CompiledContent): SaveDoc['warPlans'][number];
  equipNow(s: SaveDoc, card: CardId, c: CompiledContent): SaveDoc;
  claimRoadNode(s: SaveDoc, trophies: number, c: CompiledContent, clock: Clock): Result<SaveDoc>;
  pickOpponent(s: SaveDoc, mode: MatchResultInput['mode'], c: CompiledContent, clock: Clock,
               o?: { format?: FormatId; conquestGeneral?: string; skirmish?: SkirmishOptions }): OpponentSpec;
  tickTimers(s: SaveDoc, clock: Clock): SaveDoc;                  // charges, daily capsule, quests reset at 04:00
}
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
| Draw calls in battle | ≤ 80 on High, ≤ 40 on Lite, measured in the sandbox |
| Sim step | ≤ 0.5 ms average on mobile; headless Full War ≤ 400 ms on desktop Node |
| Procedural bake | Ages 0-1 ≤ 400 ms at boot; others lazily |
| Audio pre-render | < 300 ms at boot |
| JS heap | ≤ 150 MB |
| DPR | Capped at 2 (1 in Lite) |

CI fails the build if the initial chunk exceeds 3 MB gzipped.

---

# Part C. v1 build plan

## C1. Principles for parallel work

- **Contracts first.** WP0 lands `src/contracts`, `src/core`, `src/i18n/index.ts` and `src/content/raw` before anything else. Every other package codes against the contracts and tests with the fakes in `src/contracts/fakes`. No package imports another package's internals.
- **One owner per file.** Each WP owns the paths listed below. Nobody edits another WP's files.
  - A needed change is requested as a short note in `docs/requests/<wp>-<topic>.md`, which the owner or the integration lead applies.
  - Contract changes are made only by the integration lead (the WP0 agent, which stays on as lead).
- **Dev pages without shared registries.** `src/dev/router.tsx` discovers pages with `import.meta.glob('./*/page.tsx')`. String files are split per WP.
- **Content is authoritative.** The raw tables in `content/raw` and the ID appendix (A14) let WP2, WP3, WP4 and WP6 build before WP1 finishes.
- **Every WP ends green:** typecheck, lint and its own tests all pass, and it keeps a dev page where relevant.

## C2. Work packages

### WP0: Foundation, contracts, repo (integration lead; Phase 0; serial)

**Owns:**

- root configs, `index.html`, `.github/workflows/ci.yml` (until Phase 1), `README.md`, `docs/**`
- `src/contracts/**`, `src/core/**`, `src/i18n/index.ts`
- `src/content/raw/**`
- `tests/fixtures/content/**`
- `src/dev/router.tsx`
- `src/app/main.tsx` stub (handed to WP11 at Phase 1 start)

**Tasks:**

1. The public repo `SimNyborg/ageborn` already exists with the docs. Add the GitHub Pages deploy workflow (B1) next to CI, so every push to `main` publishes the current build.
2. Scaffold Vite + TS + Preact + Pixi with exact version pins; confirm `@preact/preset-vite` on Vite 8. Set up ESLint layer and determinism rules, Vitest and Playwright.
3. Write CI: typecheck, lint, unit tests, build, size gate.
4. Write every contract in B15, with JSDoc.
5. Write the fakes: a mini content set with 2 ages × 3 units, a fake ArtProvider drawing rectangles, a recording FakeAudio, an in-memory SaveStore, a fixed Clock, and a fake sim that replays a canned event stream.
6. Implement `core` (sfc32 + xmur3, mulberry32, FNV-1a, bp math helpers, ring buffer, assert) with known-answer tests.
7. Implement the i18n loader with EN fallback.
8. Encode the Part A unit, turret, power and economy tables as `src/content/raw/*.ts`, and freeze a copy as the test fixture content.
9. This document already lives at `docs/DESIGN.md`; keep it there.

**DoD:** `npm run dev` shows a Pixi canvas with a Preact shell and a `?dev=1` page list; `npm test` and `npm run lint` pass; CI is green on GitHub.

### WP1: Content schema, compiler, strings, counters (Phase 1)

**Owns:** `src/content/**` except `raw/`, `src/i18n/content.en.json`, `tools/counters.ts`

**Tasks:**

- Encode every remaining Part A table: 5 ages, 4 formats, 12 skins, cosmetics, capsule tables and bag, rarities, arenas, the 60-node Trophy Road, 10 generals plus Echo, name tables, quests, 6 daily modifiers.
- Write `schema.ts` and `compile.ts` (ticks, centi-units, bp, pop, hash).
- Write the counter-matrix generator and commit `generated/counters.json`.
- Write English strings for all content. Keys are final; Danish files follow in v1.1.

**Provides:** `CompiledContent` via `import { content } from '@/content'`.

**DoD:**

- Schema tests pass.
- A snapshot test of `contentHash`.
- A table-driven test that every card in A5 exists with the listed numbers.
- The counter matrix is up to date.

### WP2: Simulation (Phase 1; critical path)

**Owns:** `src/sim/**`

**Tasks:**

- Implement B3 completely: all A2 rules (overtaking, overlap, symmetric movement, two-phase impacts, area rule, heals, queue skipping and conversion, Vanguard), every ability and power in A5, formats and phases, Last Stand, training scripts, observation projection, replay record and replay, state hash.
- Implement `sim/stats.ts` (MatchStats reducer).
- Use `content/raw` through a local compile shim until WP1 lands, then switch to the real content.

**Provides:** `createSim`, `replayMatch`, `Observation`, the `SimEvent` stream, `MatchStats`.

**DoD:**

- All B13 sim tests pass: 10 golden replays on fixture content, determinism, invariants, benchmark ≤ 400 ms.
- A sandbox panel (`src/dev/sandbox/simPanel.tsx`) can spawn any card on either side and step the sim.

### WP3: AI generals (Phase 1, from the WP0 contracts)

**Owns:** `src/ai/**`, `src/dev/botViewer/**`

**Tasks:**

- Implement the A7.2 utility AI with its formulas, tiers 0-X (interpolated), personalities, openings, mistakes, the push gate, the attack clock, the gold estimator, the emote rule, the scripted Grogg brain and the Echo brain.

**DoD:**

- Fuzz test: no illegal commands in 500 matches.
- Tier ordering: X beats I ≥ 90%, VII beats III ≥ 75%, I beats 0 ≥ 65%.
- Bot-vs-bot viewer page renders a match (headless summary if WP5 is not ready).

### WP4: Visuals and art provider (Phase 1)

**Owns:** `src/visuals/**`, `src/dev/gallery/**`, `docs/art-style.md`

**Tasks:**

- Deliver the placeholder adapter on day one.
- Build the procedural adapter:
  - 7 rigs and SVG-path part libraries for 5 ages, authored in lu
  - all 35 units, 20 turrets and the Training Dummy
  - 5 bases with crumble states, Treasury levels and horn icon
  - 5 × 3-layer backdrops with the fixed-drift seam, plus 8 arena ground layers
  - projectiles and effects for every A14.1 ID
  - 12 skins as manifest entries, foil frames for portraits
  - team presets, colourblind presets, role glyphs and level trims
  - bake to atlas, portraits
- Leave stubs for the atlas and spine adapters with the same interface.

**DoD:**

- The gallery shows every visualId × clip × skin × team × preset.
- The silhouette IoU test (≥ 0.85) and the colour-rule test pass on the SVG sources.
- Bake budgets are met.
- `docs/art-style.md` records the palette, colour rule, outline, lu proportions and pivot conventions for future artists.

### WP5: Battle view, feel layer, HUD (Phase 1 against fakes; Phase 2 integration)

**Owns:** `src/render/**`, `src/ui/hud/**`, `src/i18n/hud.en.json`, `src/dev/feel/**`, `src/dev/sandbox/page.tsx`, `src/dev/sandbox/view*.tsx`

**Tasks:**

- `BattleView`: layers, interpolation, camera (fit plus mobile pinch-follow), depth rows, event mapper, hitstop with the global cap, shake, flash, numbers, effective/resisted sparks, particle pool, health bars with ghost segments, power drag targeting, mount interaction (build, Modernise, sell).
- Split-age backdrop control and the evolve sequence.
- The full A12 juice table in `feel.config.json`.
- The DOM HUD from A9.2 with every card state, the Scouted drop-down, the phase timeline, and the pause and speed buttons.
- Graphics presets and the Auto fallback.

**DoD:**

- Phase 1: the sandbox renders the fake event stream with fake art at 60 fps, and the HUD renders every state.
- Phase 2: the sandbox renders a full bot-vs-bot Full War with real sim, AI and procedural art at 60 fps on desktop, with every event mapped (A12 checklist items 1-6 verified on 5 sample cards).

### WP6: Audio (Phase 1)

**Owns:** `src/audio/**`, `src/dev/soundboard/**`

**Tasks:**

- WebAudio service, mixer (buses, voice limits, retrigger gap, variation, ducking), iOS unlock.
- ZzFX definitions for every sound ID in A13.
- Sequencer, one "Dawn March" theme, 5 age arrangements, menu and capsule loops, stingers, layers, the +2/+2/+1/+1 transposition.

**DoD:**

- Soundboard plays every ID and cue.
- Pre-render < 300 ms for boot sets.
- No clipping with 40 simultaneous hits (limiter on master).

### WP7: Meta rules (Phase 1)

**Owns:** `src/meta/**`

**Tasks:** everything in B9 and A6: new save (12 charges, 10 free capsules), rewards, charges and the Clay meter, daily timers at 04:00, bag, roll, pity, foil, script, wardrobe, upgrades, crafting, Dust, War Plan validation, auto-fill, Equip now and advisor, trophies, arenas and road, quests, Codex Level, Conquest, MMR, tier choice and opponent picking (A6.8), daily modifiers.

**DoD:** all meta tests in B13 pass, including 10^6-opening statistics (run in `tools/drops.ts`, with a 10^5 variant in unit tests).

### WP8: Save system (Phase 1)

**Owns:** `src/save/**`

**Tasks:** Valibot schema for SaveDoc (with the type-parity test), defaults, localStorage store with dual slots and checksums, debounce and flush hooks, migrations framework with the v1 fixture, export/import codes and files, replay ring, event log store, `persist()` helper.

**DoD:** round-trip, corruption-fallback and migration tests pass; quota errors are caught with a user-facing message.

### WP9: Meta UI screens (Phase 1 against fakes; Phase 2 wiring)

**Owns:** `src/ui/router.ts`, `src/ui/theme.css`, `src/ui/components/**`, `src/ui/screens/**` (except `hud`), `src/i18n/ui.en.json`

**Tasks:**

- Screens 2-4, 6-7, 9-13, 15 and 17 (A9).
- Components: card tile with foil frames, copies bar, rarity frames, currency chips, Clay meter, buttons, modal, tabs, odds sheet, toasts, age picker.
- Responsive landscape layout and the portrait rotate overlay.
- All text through i18n. Touch targets ≥ 48 px.

**DoD:** every screen renders with the fake save in the states new player, mid-game and maxed; keyboard navigation works; EN strings are complete.

### WP10: Capsule and crate show (Phase 1)

**Owns:** `src/capsule/**`, `src/i18n/capsule.en.json`, `src/dev/capsuleBench/**`

**Tasks:** the full A10 storyboard in Pixi plus DOM (back-loaded climbs, burst, card fan, rarity pre-signal, foil shine, Epic mini-walkout, Legendary walkout, duplicates, summary with Equip now, Open all) and the Wardrobe reel with the `reelReveal` flag. It consumes the `CapsuleReveal` and `WardrobeReveal` data only.

**DoD:**

- The bench page can play every tier and start tier, a first-time and a repeat Legendary, a NEW Epic, each foil, and a 10-capsule "Open all".
- A climb is never followed by a non-climb in any bench case.
- No step exceeds the time limits. Skip and fast-forward work.

### WP11: App integration, session, onboarding, platform, replay viewer (Phase 1 scaffolding, Phase 2 integration)

**Owns:** `src/app/**` (including `src/app/screens/replay/**`), `src/platform/**`, `src/tutorial/**`, `src/i18n/tutorial.en.json`

**Tasks:**

- Boot sequence and service wiring (`services.ts` builds real or fake implementations and injects ArtProvider and AudioService).
- `BattleSession` loop (B6) with observation rings, bots, pause, speed and freezes.
- Result → meta → save flow with tap-to-skip reward staging.
- Tutorial director with scripts (A8, retimed from a scripted sim run), staged unlocks for stance and Last Stand, adaptive hints and the event log.
- Replay recording and the viewer (play, pause, speeds, restart; no seek).
- Ladder format picker, Conquest, Daily Challenge wiring and platform adapter `none`.
- Visibility pause (auto-pause when the tab is hidden).

**DoD:**

- A fresh profile plays A8 end to end.
- Ladder, Conquest, Skirmish and Daily modes work.
- Replays of the last 20 matches play back with an identical outcome.

### WP12: Tools, integrity tests, CI, e2e (Phase 1 start, Phase 3 lead)

**Owns:** `tools/**` except `tools/counters.ts`, `tests/**` except `tests/fixtures/content`, `.github/workflows/ci.yml` (from Phase 1 on)

**Tasks:**

- `sim-cli` balance matrix on worker_threads, exploit proxies, economy sim, drop stats, replay verify, CSV round trip.
- Integrity tests (IDs, string keys, layer graph, hard-coded strings).
- Playwright smoke.
- CI stages: smoke balance on push; full balance and exploits via nightly or manual `workflow_dispatch`.
- The autopilot URL flag (in coordination with WP11).

**DoD:** all tools run and produce reports under `reports/` (git-ignored); CI is green.

### Phase 3: balance and polish (one tuning agent plus the lead)

- **Ownership.** After Phase 2 the tuning agent takes ownership of the numbers in `src/content/raw/**` and `economy`.
- **Loop:** run the full matrix and the exploit proxies → change numbers only (never rules) → rerun, until the A2.14 targets pass.
- **Record.** Each tuning change is logged with before and after metrics in `docs/balance-log.md`.
- **Polish.** In parallel, WP4, WP5 and WP6 owners run a polish pass against the A12 checklist and the manual checklist (C5).

## C3. Dependency order and checkpoints

```
Phase 0:  WP0 (contracts, core, i18n loader, raw content, fixtures) ─────────────────────┐
Phase 1:  WP1  WP2  WP3  WP4  WP6  WP7  WP8  WP9  WP10  WP12(tools skeleton)  WP5 (fakes)  WP11 (scaffold)
Phase 2:  WP5 + WP11 integrate real sim/content/visuals/audio; WP9 + WP10 wired to meta/save; WP12 integrity + e2e
Phase 3:  Balance tuning (content numbers) + polish pass
Phase 4:  Release candidate: manual checklist, perf on real phone + Safari, bug bash
```

**Critical path:** WP0 → WP2 → WP3 → WP12 matrix → Phase 3 tuning. The second chain is WP4 → WP5 → WP11.

**Owner test checkpoints** (each one is playable with `npm run dev`):

| Checkpoint | Contents | Needs |
|---|---|---|
| A: battle slice | "Quick Battle" dev route; Short War vs a tier III bot; placeholder art allowed; HUD, evolve with Vanguard, turrets with Modernise, one power, sounds | WP2, WP3 basic, WP5, WP4 placeholder, WP6 basic |
| B: full battle | All 5 ages and 55 cards, all powers, phases, Last Stand, procedural art, music | Phase 1 complete, Phase 2 battle integration |
| C: full loop | Onboarding, capsules, War Plan, collection, upgrades, Trophy Road, Conquest, quests, save/export, replays | Phase 2 complete |
| D: release candidate | Balanced, polished, checklist passed | Phases 3-4 |

Checkpoint A is the fun gate. If the core loop does not feel good there, feel and rule tuning comes before more meta work.

## C4. Definition of done (v1)

1. **Code health.** `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` and `npm run build` all pass locally and in CI. The initial chunk is ≤ 3 MB gzipped.
2. **Content.** Every card, power, skin and cosmetic in Part A exists, validates, has a procedural visual with all clips and sounds, and has EN strings. Every string key is ready for the v1.1 Danish files.
3. **Rules.** Every rule in A2 has at least one unit test. The 10 golden replays pass. Determinism holds across two runs and across Chromium and WebKit e2e.
4. **Balance.** The A2.14 targets pass in a full run (2,000 matches per card plus the exploit proxies), with the report committed to `docs/balance-log.md`.
5. **Meta honesty.** Published odds pass the chi-square test at p > 0.01; pity boundaries, foil rates and the onboarding script are verified; capsule results persist before animation.
6. **Bots.** AI labeling appears on every surface listed in A7.1. Bot controllers receive only `Observation` (enforced by type and test).
7. **Save durability.** Survives reload, a corrupt slot and an export/import round trip; the v1 migration fixture exists.
8. **Performance.** B16 budgets are met on a mid-range Android phone (Chrome) and an iPhone (Safari), measured on the Full War sandbox with 80 units.
9. **Manual test.** The C5 checklist passes with no blocker or major bugs open.

## C5. Manual test checklist

**First session**

1. Fresh profile: page load to the Play button ≤ 3 s on desktop; one tap into match 1; the first Bonker spawns ≤ 10 s after the click.
2. Tutorial beats from A8 appear in order, text ≤ 8 words, each hint at most once; match 1 reaches the Future age and Grogg stays in Stone.
3. The first evolve shows the full sequence: freeze, flash, pillar, base morph, backdrop wipe from the base, banner, music key lift, allied cheer hop, 2 Vanguard units.
4. Arrow Storm drag shows the zone and telegraph, then hits.
5. Capsule 1 climbs to Bronze and reveals Spear Hunter NEW, auto-equipped.
6. Capsule 2 gives Pikeman and Grenadier; the forced Bonker upgrade plays the slam.
7. Stance appears in match 4, the Last Stand button in match 5, and capsule 5 plays the Matriarch walkout.

**Battle rules**

8. Two melee units fight side by side; a Spear Hunter hits from behind them; Pebblers fire over allies; melee units pass a parked Bronze Cannon.
9. Train 5 units quickly: the queue shows 5, a 6th tap is denied with the deny feedback, and right-click cancels the last instance of that card with a refund.
10. Reach 60 pop: a Heavy that does not fit shows ARMY FULL while a smaller queued unit behind it still trains and spawns.
11. Units queued during an evolve come out as the new age's cards.
12. A second Legendary cannot be queued while one is alive or queued.
13. Buy mounts 2-4 at 150/350/700; build and sell turrets (50% refund); old-age turrets keep firing after an evolve and show the Modernise arrow; Modernise charges the new price minus half the old one.
14. Turrets never hit the base; no turret shot lands beyond 480 lu from its gate.
15. Hold stance pulls units back to the hold line (320); Charge sends them forward; the 2 s toggle cooldown works.
16. Power charge carries at most 50% across an evolve; the telegraph is visible to both sides; Legendaries take half power damage; power kills show reduced gold and no XP.
17. Overdrive, Siege and Final Bell trigger at the format times with their visuals and sounds; Siege decay is visible on both bases.
18. Last Stand arms at 25% with a horn icon visible to both sides, fires on tap after 1 s, auto-fires at 10%, and only once.
19. Retreat is unavailable before 1:00 and counts as a loss.
20. Pause stops everything; 1.5x and 2x speed work; hiding the tab auto-pauses.
21. Air: the Balloon Admiral ignores melee, ignores Hold and bombs; Flak prioritises air; melee cannot hit air; ranged units retarget an air unit overhead.
22. Each trait and ability works as written: ricochet, Shield Wall, Boarding Hook, suppression, pounce, stomp and riders, Ram siege, Roar shields, crash, Time Stop, EMP, called strikes, mark, gravity pull, toad drag.
23. Hits show the effective spark and the resisted puff for modified damage.

**Meta**

24. A new save starts with 12 charges; the first 10 capsules use none; charges refill at 1 per 6 h and bank to 12.
25. A ladder win grants trophies, Amber and a capsule while charges are available, and 40 Amber plus a Clay pip when none are; losses give 15 Amber and a pip; 3 pips give a Clay capsule.
26. The daily capsule banks to 3; quests reset at 04:00; loss protection "Warm-up match" appears after 3 losses.
27. The odds sheet shows the bag state (30/40/20/7/3) and pity counters, and the counters match what happens.
28. Capsule strikes never show a non-climb after a climb.
29. "Open all" works for 10 capsules; reloading mid-animation keeps the same result.
30. An upgrade spends copies and Amber, raises stats by +5% (card detail preview matches), and grants Codex points.
31. A copy past L10 becomes Dust; crafting a card and a crate skin works; Crystal Spire cannot be crafted.
32. The War Plan builder enforces the rules, shows advisor warnings, and auto-fill and Equip now work; presets save.
33. The Trophy Road claims nodes; 150 trophies unlocks Standard War, the ladder format picker and the Modern and Future Age Unlock Capsules; alternate powers unlock at 100-500.
34. Conquest opens at Arena 3; stars and milestones pay once.
35. Quests progress from real matches; Skirmish counts only for Play and Train; reroll works once per day.
36. The Wardrobe Crate reel stops on the pre-rolled skin; the flag-off card flip also works.
37. Foils appear on reveal and on the card in the tray.

**Presentation and platform**

38. Every opponent shows the AI badge on VS, the HUD nameplate, the result screen and history. About says "All opponents in this version are AI."
39. Colourblind presets and reduce motion change visuals as specified; volume buses work separately.
40. No hard-coded UI strings (integrity test); the language setting shows EN.
41. Save export code and file both import on a fresh browser profile.
42. A replay from history plays to the same result.
43. Performance: Full War sandbox at 60 fps on desktop and ≥ 30 fps in Lite on a mid-range phone; no console errors.
44. iPhone Safari: sound plays after the first tap; the layout respects safe areas; the tray fits on an 844 px landscape phone; portrait shows the rotate overlay.

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
- Danish language files (keys already exist).
- Replay seek bar.
- Mythic skin tier with a hard pity at 40 crates, plus more skins.
- Daily modifiers Turret Holiday and Mirror Match.
- Alternate Dawn March melodies for the owner to choose from.
- "Ghost of You" local ghosts (your recorded War Plan and behaviour profile, labeled as ghosts).
- About 20 achievements.
- More quests.
- The "Who wins?" sandbox (for example 100 Bonkers vs 1 Chrono Titan).
- Screenshot tests for the gallery.

**v1.2: content and modes**

- The sixth age, Bronze/Antiquity (+11 cards, 2 powers, base, backdrop, arrangement), inserted as data.
- 1-2 extra cards per age, designed as role sidegrades, not new roles.
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
- Pop cap 42 per player.
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
| First session doesn't hook | Early churn | Match 1 reaches lasers by minute 3; Legendary walkout at ~35-40 min; 12 starting charges; Clay meter on losses |
| Procedural art looks cheap | Weak first impression | Strict style guide and colour rule, 7 shared rigs polished well, effort focused on the evolve moment and capsules, swap path ready from day one |
| Content volume (55 cards, 12 skins, 5 bases) overruns | Late v1 | Shared rigs and part libraries, skins as manifest overlays, the gallery for fast review, and the cut order below |
| Balance across 55 cards and 5 ages | Dominant strategy | Headless matrix with confidence intervals, exploit proxies, area rule, turret range cap, no Legendary turrets, numbers-only tuning phase |
| Bots feel dumb, repetitive, unfair or farmable | Churn, distrust | Personalities, 11 tiers, openings with seeded variation, intelligent mistakes, push gate against turtles, identical rules, observation-only input, visible AI labels |
| Determinism breaks across browsers | Replays break; online blocked later | Integer-only sim, lint bans, golden replays on fixture content in Chromium and WebKit from Phase 1 |
| Parallel agents collide on files or contracts | Integration churn | Single ownership per path, frozen and complete contracts, raw content in Phase 0, request notes, glob-based dev routing, per-WP string files |
| Save loss (Safari 7-day eviction, cleared data) | Lost trust | Dual slots with checksum, export/import, backup reminder, `persist()`; Capacitor native storage later |
| Capsules read as gambling | Portal rejection, backlash | Earn-only forever, no store or payment code, published bag odds, visible pity, pre-rolled results, back-loaded climbs with no near misses, reel behind a flag |
| Economy pacing too fast or too slow | Boredom or grind | 365-day economy sim with ±20% gates; every reward is a data knob |
| Match length drifts | Stalemates or abrupt games | Format clocks set hard limits; base time-to-kill target; CI checks the length distribution |
| iOS audio unlock and mute switch | Silent game on iPhones | Unlock on first gesture; a Settings note about the mute switch |
| TypeScript or tooling version churn (TS 7, Vite 8) | Broken builds | Exact version pins, lockfile committed, TS 7 deferred, Vite 7 fallback |
| Name or trademark conflict | Forced rename | TMview and domain checks before any public link; the name lives in one config constant and the i18n files |
| Too close to the classics | "Reskin" reputation | Own names, art and sound; swapped default powers; signature traits on commons; split-age lane, Last Stand and capsules as identity |
| PvP population small later | Empty queues | PvE, Conquest, AI Generals, Echo and Ghost modes carry the game; PvP is never the only fun mode |

**Cut order if v1 slips.** Cut from the top of this list. Never cut the 5 ages, the 55 cards, capsules, upgrades, bots or the evolve sequence.

1. Wardrobe reel (the card-flip reveal remains).
2. Daily modifiers beyond 3.
3. Replay viewer UI (recording and verify stay).
4. Foil shine animation (static foil frames stay).
5. Skins down to 6 (one per age plus Crystal Spire).
6. Conquest stars 2 and 3 (wins stay).
7. Dev pages: bot viewer and replay debugger.
8. Echo of You.

---

# Appendix. Rejected critique points

**Rejected**

- **Builder 49, cut to 6 generals.** Generals are data plus a procedural portrait, and the Conquest board (A6.10) needs all of them.
- **Builder 14, turret metric "damage per gold ≤ 1.3× the unit median".** Invulnerable turrets accumulate damage over the whole match, so a fair turret cannot meet it. The balance critique's kill-share and turtle targets replace it; damage per gold is still reported.
- **Balance 8, Balloon Admiral base damage 110 → 55.** Base HP rose to 10,000 × P (Gunpowder 2,730 → 18,200), which already cuts the Balloon's share of a base by more than half.
- **Balance 14, Battering Ram base damage 160 → 110.** Same reason: a Ram trip now takes about 10% of a Medieval base instead of 77%. The HP cut (1,000 → 900) is applied.
- **Balance 10, bot level from the player's 3 best cards.** Superseded by the player critique's arena level curve (A6.8), which removes sandbagging entirely. The sandbag exploit proxy is dropped for the same reason.
- **Builder P3, start gold 125 if a Treasury opener dominates.** Treasury level 1 now costs 200, more than the 175 starting gold, so the opener cannot happen.

**Merged or implemented differently**

- **Power damage and kill rewards.** Player (50% gold and XP) and balance (30% gold, 0 XP) conflicted; the balance version is used together with lower thresholds. Orbital Lance uses 450 (player and builder) rather than 480 (balance).
- **Overcharge.** The player's +10% per 400 XP and the balance critique's 1,200 XP per +25% are close; the balance version is used, with the Overdrive charge ×1.25 from the player critique.
- **XP thresholds.** Player (700 / 1,000), builder (700) and balance (800 / 1,000 / 1,200 / 1,500) merge into 700 / 1,000 / 1,200 / 1,500.
- **Base time-to-kill.** The builder offered base HP ×4 or unit damage ×0.35 to bases; base HP = 10,000 × P is used and checked by the 40-60 s target.
- **Summon bounty.** The builder's 50% bounty is replaced by the balance critique's 0 for both sides, which also covers Vanguard.
- **Overdrive and Treasury.** The builder's "Treasury counts as passive" is replaced by the balance rule that Overdrive doubles only base income.
- **Pitch Cauldron.** The builder's 12 × 4 targets is replaced by 14 under the global area rule.
- **Rarity normalisation (balance 6).** Implemented as "every card starts at L1" instead of the start-level formula. The effect is the same (a new card of any rarity is baseline, every card reaches +45%) with simpler integer math.
- **Loss shards and every-3rd-win Clay capsules (player 1 and 9).** Merged into one 3-pip Clay meter to avoid another currency.
- **Balance statistics.** The builder's 2,000 matches per card is used over the balance critique's 1,600.
- **Scope cuts (builder 49).** Applied: no Mythic, one Dawn March, Danish in v1.1, no replay seek. Modified: 12 skins instead of 10 (each age gets 2 or more and Arena 8 keeps its reward) and 6 daily modifiers instead of 3 (all six are plain number changes).
- **Mythic hard pity at 40 crates (player 17).** Recorded for v1.1, when the Mythic tier arrives.
- **New mechanics on commons (player 20).** Applied to one common per age from Stone to Modern (ricochet, Shield Wall, Boarding Hook, suppression). Future already has the Photon Knight shield. Only the three named default powers are swapped; Arrow Storm stays the Medieval default because the tutorial teaches dragging with it.
