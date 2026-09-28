# Ageborn v1: definitive design document

This document is the single source of truth for the v1 build. Version 1.2, 2026-09-28: A15 and A16 merged, with the owner's decisions of 2026-09-28.

The document has four parts plus an appendix:

- **Part A:** game design. It ends with A15 (engagement and long-term progression) and A16 (strategic depth, variety and long-term play), which also hold the ranked wishlist after v1 (A16.24).
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
4. **Honesty.** Bots follow the player's rules and are labeled AI. Capsule odds, pity counters and bot difficulty are always visible. Nothing is for sale. Every promise on screen is literally true. Nothing a player has earned is ever taken away, and stopping, whether mid-match or for a month, never costs anything the player owns (A15.1).
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
  - Under review: the two-wide front is a main cause of stalls (A16.4). Phase 2b measures a third rank that closes to contact (lever L3) and a three-wide front (L4). If L3 is not adopted, the "third position" sentences above are deleted; if L4 is adopted, this rule changes to three wide.
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

From Arena 2 the player picks any unlocked format before each ladder match. Trophies and Amber per win depend on the format from Arena 3 (A15.8). The Short War clock may change in Phase 3 (A16.4, lever L2: Overdrive 3:00, Siege 3:45, Final Bell 5:00).

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

All card tests use both sides at tier V with the Balanced brain and every card at L7. Exploit tests use the scripted proxy against a tier VII Balanced bot at L7, in Short and Full War, with at least 400 matches per proxy; proxies decide every 0.5 s from the delayed `Observation` (A16.5). Rules-sanity tests run scripts against scripts, with no bot.

| Metric | Target |
|---|---|
| Full War median length | 7:00; 80% between 5:00 and 9:00 |
| Short War median | 4:30 (4:00 ± 0:20 if Phase 3 adopts the shorter Short War clock, A16.4) |
| Final Bell, tier VII mirror, baseline plan | ≤ 10% of Short Wars, ≤ 5% of Full Wars |
| Final Bell, tier VII mirror, a Legendary in each plan | Reported |
| First evolve | Median 60 ± 10 s |
| Later evolves | Balanced mirror within ±20 s of A2.4; every scripted strategy reaches Future (Full War) between 4:00 and 6:15 |
| Per-card win-rate delta vs baseline | The 95% confidence interval lies within ±3 points; 2,000 mirrored matches per card (smoke run: 400 matches, ±6) |
| Per-card Final Bell delta | Reported |
| First-mover advantage (side 0 vs side 1, mirrored) | 47-53% |
| Turret share of kills | Reported only |
| Cheapest-unit spam vs tier VII | Wins ≤ 20% |
| Random spam vs tier VII | Wins ≤ 15% |
| Mono family (Heavy, AA, Ranged), worst mix | Each group wins ≤ 35% |
| Bait-and-switch vs tier VII | Wins ≤ 35% |
| 4-turret turtle proxy (Hold) vs tier VII | Wins 35-45%, with ≤ 50% of its matches at the Final Bell |
| Heavy plus mass Ranged vs tier VII | Wins ≤ 55%; its mirror's Bell share reported |
| Other exploit proxies (B12) vs tier VII | Each wins ≤ 55% |
| Save-and-counter mirror; Save-and-counter vs turtle | Bell share reported |
| Rules sanity: counter-picker vs each mono spam | ≥ 80% |
| Rules sanity: triangle, mono vs mono (Heavy > Infantry, AA > Heavy, Infantry > AA) | Each ≥ 70% |
| Rules sanity: skill gradient (Save-and-counter vs Balanced script; Balanced script vs cheapest spam) | Each ≥ 80% |
| Has-an-answer (static, `counters.json`) | A same-age card scores ≥ 55% at equal gold against every non-Legendary card; Legendaries reported |
| Has-a-starter-answer (static) | Reported |
| Bot tier gaps (VII vs V, X vs V, VII vs III); attention gap; level edge +1 | Reported |
| Base time to kill | A full army (60 pop) of same-age L1 Commons with no opposition needs 40-60 s to destroy a full same-age base |
| Power damage per unit in zone | Within the A2.9 target for every damaging power |
| Damage per gold per card | Reported per age; not gated |

The targets that tighten after v1 are in A16.5. **Release rule for the Bell rows:** if Phase 3 cannot meet a v1 Final Bell target after the A16.4 levers, the lead records the measured value in `docs/balance-log.md`, tells the owner in plain words, and the row becomes the first v1.1 task. The Bell rows alone do not block the v1 release; every other row does (C4).

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
  - 3 War Plan presets, each renamable. From v1.1 up to 5, and the player picks one after the battlefield is revealed on the VS screen (A16.9). New presets start empty.
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

Counts: 4 Rare, 4 Epic, 4 Legendary. The Wardrobe Crate pool holds the first 11. The top tier, Mythic, arrives in v1.2 as Ascended forms: cosmetic prestige variants of Legendary units with no extra power, with their own odds, pity and crafting path (A16.18).

**Foil variants.** Every card has three cosmetic foil frames: Bronze foil, Silver foil and Holo. They come from capsule stacks (A6.4) and show on the card in the tray, the War Plan and the collection. Foils never change stats and never appear in the lane in v1. From v1.2 only Holo appears in the lane, as a shimmer on the unit's non-team parts and a sparkle on spawn, visible to both sides; Bronze and Silver stay on the card frame (A16.18).

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
  - highest AI tier beaten (never goes down, A15.9)
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
| Dust | Crafting card copies and skins (and foils after L10, A15.11 stretch) | Jade capsules, Trophy Road, quests, Conquest, feats (A15.10), copies past L10, duplicate skins, Amber after max (A15.11 stretch) |
| Trophies | Ladder rank | Ladder wins |
| Codex points | Codex Level | Upgrades |

The **Clay meter** is not a currency: a 3-pip bar on Home that turns into a Clay capsule when full (A6.3).

### A6.3 Trophies, arenas and match rewards

Ladder results:

| Result | Trophies | Amber | Other |
|---|---|---|---|
| Win | +30 (by format from Arena 3: A15.8) | 20, or 40 if no capsule charge (by format from Arena 3: A15.8) | Win Capsule if a charge is available; otherwise +1 Clay meter pip |
| Loss | −20 (0 below 400; never below the current arena gate) | 15 | +1 Clay meter pip |
| Draw | 0 | 15 | +1 Clay meter pip |

- **Capsule charges.** A new save starts with 12. +1 charge every 6 h, continuously, banking up to 28 (7 days). A full bank stops filling and says so. The first 10 capsules of a save never use a charge. Only ladder wins use charges.
- **Clay meter.** 3 pips make a Clay capsule without using a charge. There is no cap on how many it can produce.
- **Supply Capsule** (replaces the Daily Capsule, A15.4). An allowance of +1 per day at local 04:00 banks up to 7. Every 3rd finished match (`matchesPlayed`: the 3rd, 6th, 9th …, any mode except the tutorial, a Retreat included) turns one banked allowance into a Supply Capsule; with no allowance banked, nothing happens. The first Supply Capsule is granted right after capsule 2 is opened, with no matches needed.
- **War Chest** (replaces the weekly quest, A15.5). Every counting win adds 1; at 20 it grants a Wardrobe Crate and an Age Capsule at once and restarts at 0. It never resets and has no weekly gate.
- **Void matches.** A match that never reaches its end (tab closed or reloaded, device off, crash) changes nothing: no trophies, MMR, rewards, charge use, quest or War Chest progress, loss streak or Clay pip. Retreat is a choice and still counts as a loss (A15.6).
- **Loss protection.** After 3 ladder losses in a row, the next opponent is one tier lower (minimum tier 0) and the VS screen says "Warm-up match". The same Result shows the tilt card (A15.6).
- **Other modes.** Daily Challenge: A9.1 and A15.7. Conquest: A6.10. Skirmish: 5 Amber per win, no trophies, no capsules.
- **Clock.** All daily timers reset at local 04:00, capped by the banks. Every bank holds at least 7 days and nothing earned expires (A15.4). Clock tampering is accepted because no money is involved.

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
- **Supply Capsule.** Rolls independently: Bronze 78%, Silver 15%, Jade 5%, Aeon 2%.
- **Honesty line** on the first capsule and every odds panel: "The result was decided when you earned this capsule. Tapping only reveals it." Scripted capsules show "Set contents" instead of bag odds (A15.3).
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
| Supply Capsule | Every 3rd finished match turns one banked daily allowance into one (A6.3, A15.4) | Tier table above; climb starts at Bronze |
| Trophy Road Capsule | Road nodes and gates | Fixed tier, no climb (reveal starts at step 4) |
| Clay meter capsule | 3 meter pips | Clay tier, climb from Clay (no climbs) |
| Age Capsule | Quests, Daily Challenge, Conquest, War Chest | Silver-sized (4 stacks, Silver copies), all from one age picked in a dialog when granted, ≥ 1 Epic stack |
| Codex Capsule | Every 10th Codex Level from 5 | Silver tier, fixed |
| Age Unlock Capsule | Arena 2 gate | Fixed contents (A6.3) |
| Wardrobe Crate | Every 10th Codex Level from 10, War Chest, Trophy Road | 1 skin: Rare 78%, Epic 18%, Legendary 4%; no duplicate until all crate skins of that rarity are owned. Revealed with the card flip (A10); there is no reel |

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
- **Daily quests.** At 04:00, 3 new quests join the back of a queue of up to 21. Only the first 3 are active and progress; the rest wait unseen, and the quest panel never shows the queue length (A15.4, A15.13). A claimed quest leaves the queue and the next one becomes active. The free daily reroll replaces one active quest. The panel says "New quests arrive each day. Up to 21 can wait for you." Skirmish matches count only for "Play 3 battles" and "Train 30 units".
- **Weights.** Quests that pay only for activity (Play 3 battles, Train 30 units, Upgrade 2 cards) have weight 1; skill and variety quests have weight 2. Pool:

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

- **War Chest** (replaces the weekly quest "Win 15 battles", A15.5). Every counting win adds 1; at 20 (`winsPerChest`, data, 15-25 after the Phase 3 run) it grants a Wardrobe Crate and an Age Capsule at once and restarts at 0. It never resets and has no weekly gate or cap. A counting win is a win in Ladder or the Daily Challenge, or a Conquest win that earns a star or beats a General whose tier is at least the player's skill tier minus 2 (A15.9). Skirmish and tutorial matches never count. Home shows "War Chest 13/20".

### A6.8 Matchmaking fairness (AI ladder)

- **Bot level follows the arena, not the player.** Every bot card plays at the arena's bot level (A6.3). Each procedural commander rolls −1 / 0 / +1 (25 / 50 / 25%) from its seed. Upgrades therefore always make the player stronger against the ladder, and a plan cannot be sandbagged.
- **Rarity allowance.** Arena 1 bots use Commons and Rares. Epics appear from Arena 2. A bot fields a Legendary only when the player's War Plan for that format contains one, and plays it at the player's Legendary level. The Warden is the only exception (A7.4), and the VS screen discloses it.
- **Tier choice.** Hidden MMR (Elo, K = 32, start 1,000). Tier rating = 800 + 100 × tier (0 = 800, I = 900 … X = 1,800). Tier = clamp(round((MMR − 870) / 100), arena min, arena max), which targets a 60% expected player win rate.
- **New players.** In the first 20 matches every bot's mistake rate is +10 points, which targets about 65%. The VS screen discloses it: "Rookie AI: makes extra mistakes while you learn" (A15.3).
- **Skill tier** = clamp(round((MMR − 870) / 100), 0, 10), the tier formula without the arena clamp. It stays internal; it sets the default Daily difficulty and defines counting wins (A15.5, A15.9).
- **Standard levels.** Skirmish has a toggle that puts every card on both sides at L7. The Daily Challenge always plays at L7 on both sides (A15.7), as do the later modes listed in A16.7.
- **Fairness is the only tuning target.** MMR and bot tuning may target win rate only, never session length, return rate or retention (A15.1 rule 10).
- **Later PvP (designed now):** ranked sets every card to exactly L8, whatever its level (A16.7), and shows both trophies and a visible Glicko-2 rating (A16.21). The AI ladder and Conquest keep this section's level matching.

### A6.9 Pacing check (engaged player: 4 charged ladder wins at 60%, Supply Capsule, 3 quests)

| Measure | Value |
|---|---|
| Copies per bag capsule (expected) | 9.1 |
| Amber per bag capsule (expected) | 227 |
| Capsules per day | 4 win + 1 Supply + ~0.9 Clay meter |
| Daily income | ~48 copies and ~1,700 Amber |
| Common to max (153 copies) | ~4.5 months (~1.1 copies per card per day) |
| Rare to max (130 copies) | ~4.3 months (~1.0 per card per day) |
| Epic to max (44 copies) | ~3 months (~0.5 per card per day) |
| All 5 Legendaries owned | ~2 weeks (script, pity, no duplicates) |
| Legendary to max (11 copies each) | ~4.5 months |
| Focused War Plan at L7 | ~6 weeks, faster with Dust crafting |
| Whole collection maxed | ~5-5.5 months: copies run out at ~135 days and Amber (273,350 total) at ~160 days |

A 365-day economy sim (B12) MUST confirm these figures within ±20% and keep the gap between the copy and Amber finish dates under 30 days before release. Phase 3 re-runs it with the A15 sources (Supply Capsules, charges banking 28, the War Chest at 20, rewards by format, Dust from feats); these gates stay and nothing new is gated (A15.20).

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
  - Help text: "Your first 20 opponents make extra mistakes while you learn. After that, opponent difficulty adapts to your recent results." (A15.3)
  - VS screen in the first 20 matches of a save: "Rookie AI: makes extra mistakes while you learn", through `OpponentSpec.disclosures`
  - Echo of You: "AI · Echo of You: an AI playing your War Plan". A friend's plan (v1.1 codes) reads "AI · Echo of Chief-4821", never "ghost" (A15.15)

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

**Answering spam (A16.3, v1).**

- **Save for a counter.** `trainCandidates` scores every tray card, affordable or not; an unaffordable card can only set a goal, never be trained. When the best counter score over the whole tray, ignoring gold, beats the best affordable card by at least 0.15, the bot sets a saving goal for that card's cost (the Legendary saving-goal code). The goal lapses after 8 s, or when an enemy unit comes within 300 lu of the bot's gate.
- **Answer one-type armies, smoothly.** Let s be the largest role-group share of visible enemy army value. The counter weight is multiplied by 1 + 2.5 × max(0, s − 0.4), capped at 2 (×1 at 40%, ×1.5 at 60%, ×2 at 80%). The diversity term and the gold float target shrink by the same factor.
- **No Legendary saving goal while the push gate fails.**
- The bot does not build turrets toward its tier maximum: the turret share of kills is reported only (A16.5).

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
- **Evolve delay (A16.3 rule 2).** Below tier VII the evolve-delay column applies as written and there is no safe-window check. From tier VII the bot waits for a safe window (no enemy ground unit within 300 lu of its gate) for at most the listed cap (2 s at VII, 0.5 s at X), then evolves anyway.
- Later (v1.1, AI only): from tier VIII the bot plays the wave game (A16.3).
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
| ~10:00 | Home appears: editable auto name, Trophy Road reveal, first Supply Capsule (granted right after capsule 2, no matches needed; A15.4); the Battle button pulses once | none |
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
- "Save gold, then send them together." (the trickle detector, A16.6)

The failure-pattern detectors keep running after onboarding; only their in-battle hints stop. After a loss they feed one Result tip (A15.12, A16.6).

**Instrumentation.** A local event log (ring buffer of 500 events) records each onboarding step's timestamp and drop-off, plus the healthy-play signals in A15.20. It can be exported from Settings for playtests. It never leaves the device.

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
| 2 | Home | Big Battle button with the next opponent preview; Trophy Road bar with the next reward; capsule tray ("Open (3)", "Open all", and "Supply Capsule: 2 more matches" while an allowance is banked); Clay meter; charges as "12/28" with no timer (the refill rule sits in the info panel); daily quests (the 3 active ones); War Chest bar ("War Chest 13/20", where the weekly quest line was); profile chip; settings gear. No timers and no backlog counts on Home; no other new widget in v1 (A15.13) |
| 3 | Mode select | Ladder (format picker from Arena 2; it shows each format's reward, A15.8); Conquest (from Arena 3); Skirmish (from match 4: choose General or Echo, tier 0-X, format, speed, "Standard levels" toggle; 5 Amber per win); Daily Challenge (difficulty picker Recruit / Veteran / Warlord, A9.1) |
| 4 | VS | Your card vs the AI General card: AI badge, tier, levels ("Plan Lv 3.4 vs Lv 3"), format, personality line, modifiers, boss disclosures |
| 5 | Battle HUD | See A9.2 |
| 6 | Pause | Resume, Scouted list, Settings, Retreat (after 1:00), Quit Skirmish |
| 7 | Result | Victory/Defeat/Draw banner; recap (units trained and killed, base damage, time per age, MVP card). At most 3 staged steps (A15.13): (1) the result with trophies, (2) the main reward (a capsule, an Age Capsule or a Clay pip), (3) one progress bar, whichever of the next Trophy Road node, the War Chest or a Conquest star is closest to done. A found feat adds its own step (A15.10). Everything else (Amber, Codex points, quest and Supply progress, one result or loss tip, A15.12, A16.6) sits in one summary row that expands on tap. Tap to skip works. Then at most one card (tilt, break or wrap, A15.6) and the night line after 22:00. Daily: Copy result (A15.7). Buttons: Next battle, Watch replay, Home |
| 8 | Capsule opening | A10, with the odds and pity panel on every capsule |
| 9 | War Plan | Preset tabs A/B/C; 5 age tabs; 5 unit + 2 turret + 1 power slots; collection filtered to the age; average level; auto-fill; advisor warnings; skin picker per card |
| 10 | Collection | Grid filterable by age, role and rarity, with owned/unowned toggle; silhouettes for unowned; copies bar and foil badges per card; Skins tab; Feats tab (12 feats, "???" and a riddle until found, a Show hint button; A15.10); crafting with Dust |
| 11 | Card detail | Animated idle on a stage; full stats (HP, damage, interval, DPS, range, speed, pop, train time, size, hits, tags, mods, abilities); Strong vs / Weak vs; next-level preview; Upgrade; skin carousel; foil frames owned; for L10 cards a foil crafting button (A15.11, stretch) |
| 12 | Trophy Road | Vertical path, arena gates, claimable nodes |
| 13 | Profile | A6.1, including "Highest AI tier beaten" (A15.9), plus match history with replay buttons |
| 14 | Replay viewer | Play/pause, 1x/2x/4x, restart, side toggle for which HUD to show (seek arrives in v1.1) |
| 15 | Settings | Master/Music/SFX/UI volume; graphics preset (Auto/High/Lite); reduce motion; shake slider; hitstop on/off; damage numbers (Off/Important/All); colourblind preset (Default, Blue/Yellow, High contrast); language (EN in v1; DA in v1.1); default speed; vibration (default Off); break reminder (On at 60 min by default, or Off); quick reveal (default Off); save export/import/reset; odds overview; About; For parents (A15.6); credits; export event log |
| 16 | Dev (`?dev=1`) | Art gallery, soundboard, feel tuner, spawn sandbox, time scale, replay debugger, capsule test bench, bot-vs-bot viewer |
| 17 | Conquest | The 9 Generals drawn as a vertical ladder ordered by tier, each with its AI badge, stars, rewards and milestones (A6.10); the player's portrait sits just above the highest General beaten in Conquest (A15.9) |

### A9.1 Daily Challenge

Full rules: A15.7 (Daily Challenge 2.0).

- **Shared seed.** `dailySeed = xmur3('daily' + YYYYMMDD)` for the local day starting 04:00. Everyone gets the same modifier, the same opponent (one of the 8 ladder Generals from Pip Quickstep to Madame Tempest, with its personal War Plan) and the same match seed on that date.
- **Format:** Standard War, with every card on both sides at L7.
- **Difficulty,** chosen before the match: Recruit (tier II), Veteran (tier V) or Warlord (tier VIII). The default is the one nearest the player's skill tier (A6.8).
- **Modifier:** one symmetric modifier per day from the Daily seed:

| # | Modifier | Effect |
|---|---|---|
| 1 | Gold Rush | Passive gold ×1.5 |
| 2 | Glass Armies | Unit HP ×0.7 |
| 3 | Power Hour | Age Power charge ×2 |
| 4 | Fast Forward | XP thresholds ×0.7 |
| 5 | Heavy Metal | Heavy and Legendary cost −30% |
| 6 | Sudden Siege | Siege starts 1:15 earlier |

- **Reward:** a bank of Daily rewards gains +1 at each 04:00 and holds up to 7; a new save starts with 1. A win at any difficulty uses one banked reward and pays an Age Capsule. Other wins pay 20 Amber. Daily matches use no charges and change no trophies or MMR.
- **Copy result:** after a finished Daily, one button copies a plain-text line with no name, for example `Ageborn Daily 2026-10-03 · Glass Armies · Veteran · Won in 5:42 · Base 63%`. Copying pays nothing. There is no streak counter.

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
- **Quick reveal** (Settings, default Off, A15.6): when on, every capsule opens at step 4 (burst), as Trophy Road capsules do. Rarity pre-signals, walkouts and skips are unchanged.
- **Honesty lines** (A15.3): the first capsule and every odds panel say "The result was decided when you earned this capsule. Tapping only reveals it." Scripted capsules 1-5 are labelled "Starter Capsule · contents set to get you started" and their odds panel shows "Set contents".
- **Wardrobe Crate.** The crate uses the card-flip reveal (steps 4-5 with one skin card) everywhere. There is no reel, and players cannot switch one on (A15.3). `WardrobeReveal.reelTiles` may be empty.

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
| Capsules | `cap_thud`, `cap_riser`, `cap_climb_1`, `cap_climb_2`, `cap_climb_3`, `cap_climb_4`, `cap_clunk`, `cap_burst`, `card_flip`, `foil_shine`, `rarity_common` (pluck), `rarity_rare` (two rising notes), `rarity_epic` (triad arpeggio plus shimmer), `rarity_legendary` (5-note fanfare, pad, sub drop), `walkout_bass`, `copy_tick`, `upgrade_ready`, `upgrade_slam`, `level_up`, `reel_tick` (kept as an ID but unused: there is no reel, A15.3) |

**Mixer:**

- Buses: master, music, sfx, ui.
- At most 4 voices per sound ID and a 40 ms minimum retrigger gap.
- Pitch ±8% and volume ±3 dB per play.
- Sounds caused by the player get priority.
- Music ducks 6 dB during powers, evolves and walkouts.
- The AudioContext is created or resumed on the first user gesture (iOS).
- `navigator.vibrate` fires on climbs and Legendaries (mobile, toggle, default Off; A15.6).

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

## A15. Engagement and long-term progression

**Status.** Written 2026-09-27 as an addendum and merged here on 2026-09-28, together with the edits to other sections listed in A15.19. The owner's decisions are applied: the Wardrobe reel is not built, the safe defaults apply to every player, and the 12-item v1 slice (A15.19) lands in Phase 2b. Phase 2b builds to this section.

**What it answers.** The owner asked for competition, collecting rare things, the joy of random rewards when opening packs, treasure hunting (the Pokémon GO pull), what makes TikTok gripping, and the Clash of Clans / Hay Day feeling of improving for years.

**Sources.** `docs/research/engagement-psychology.md`, `engagement-benchmarks.md`, `engagement-law-ethics.md` and `engagement-gap-analysis.md` (research IDs E1-E21, N1-N15, Psy-A to Psy-K, P-1 to P-9 are kept); the proposal `docs/design-history/engagement-proposal.md` (systems EL-1 to EL-31, kept as history); and two reviews of it, "player-ethics" (PE) and "builder-scope" (BS), resolved point by point in A15.21.

**Funding.** Only v1 is funded. The cloud credit that builds Ageborn ends 2026-11-05, and v1 still needs Phases 2a, 2b and 3. v1 is therefore designed as a finished game with honest end points. Everything marked v1.1, v1.2 or online is a ranked wishlist for any later build session (A16.24), not a promise to players or to the owner.

### A15.1 Principles, tests and red lines

**Goal: "wants to come back, easy to stop".** We do not design for "can't put it down", for three reasons:

1. **It lasts.** Players whose needs for competence, choice and connection are met play for years and feel better afterwards. Players who feel they *have to* play log more hours, enjoy them less and quit sooner (psychology 0.2, findings 1 and 13; benchmarks RES1-RES4).
2. **It is where the law is going.** Streaks, penalties for stopping, login rewards, autoplay, notifications and random rewards for minors are what the DSA minors guidelines, PEGI 2026, the Danish-led Jutland Declaration and the EU KIDS Act proposal (as reported) target (law 0.3-0.4).
3. **Our players include children.** Web portals are kid-heavy, and v1 cannot know anyone's age. The child-safe values are therefore the defaults for everyone (law S1).

**Pillar 4, extended.** A1 Pillar 4 now reads:

> 4. **Honesty.** Bots follow the player's rules and are labeled AI. Capsule odds, pity counters and bot difficulty are always visible. Nothing is for sale. Every promise on screen is literally true. Nothing a player has earned is ever taken away, and stopping, whether mid-match or for a month, never costs anything the player owns.

**Engagement rules.** Every system in this section follows them.

1. **Battle is the centre.** Tracks advance through finished matches or wins. Nothing advances by waiting, idling or tapping menus. The only clock elements are the refill rates of banks that already exist.
2. **Want to, not have to.** The pull comes from competence (skill, mastery), choice (plans, pacts, what to craft) and people (codes now, PvP later). Randomness appears only in its existing form: earned, pre-rolled, disclosed, with pity and a crafting path.
3. **Bank, never expire.** Anything that refills on a clock banks at least 7 days. A full bank stops filling and says so. Nothing earned expires.
4. **Hide content, never odds or difficulty.** Riddles, silhouettes and fog are fine. Odds, pity, bag state, scripted contents, adaptive difficulty and bot tier are always shown.
5. **End, don't loop.** Every loop has a visible end: the match clock, the wrap card, the Daily, the War Chest, a run. "Next battle" is a button, never a countdown. Home shows no timers.
6. **Invite, don't nag.** Home shows what is ready when the player opens the game. The game never reaches out.
7. **One tracker per time scale, and no backlog counts** (A15.13).
8. **New systems pay Dust and cosmetics,** never Amber or power. The progression that changes play is not shortened; the cosmetic tail grows.
9. **Finished once beats fed forever.** Prefer rules that run from seeds and existing content, keyed to play count, over calendar content that needs new authoring or new builds.
10. **Fairness is the only tuning target.** MMR and bot tuning may target win rate only, never session length, return rate or retention. This is recorded in `docs/decisions.md`.

**Classes.**

- **Healthy:** serves competence, choice or people; still works when fully explained; stopping costs nothing; fine for a 10-year-old. Use freely.
- **Grey:** effective, but with a known abuse path or regulatory attention (daily cadence, random rewards, comparison). Allowed only with the safeguards named in its Class line, and reviewed before each public release.
- **Red line:** deceives, punishes absence or stopping, pressures through scarcity, obligation or time, exploits minors, or conflicts with DK/EU law or its clear direction. Never shipped.

**The five tests.** Tests 1-4 come from psychology 1.3; test 5 comes from the reviews (PE 4.1, BS 2.6).

1. **Explain-it:** it still works if a screen explains exactly how it works to the player and a parent.
2. **Walk-away:** stopping for a day, a week or a month loses nothing the player had or was promised.
3. **Reflection:** after a session the player would say the time was well spent.
4. **Child:** it is fine for a 10-year-old on a school night.
5. **Meter:** it adds no counter to Home or the Result screen, or it removes one.

Failing test 1 or 2 is a red line. Failing test 3, 4 or 5 makes a system grey at best.

**How systems are checked.**

- Every system below has a **Class** line that names its grey parts and their safeguards.
- **Phase 2b:** the honesty review lens checks the build against A15.1 and the strings in A15.3. The rules-meta lens checks the bank, War Chest and Daily numbers (A15.4-A15.7).
- **Phase 3:** the copy review (C5) scans every string for guilt, urgency, loss framing, false "nothing expires" and "free" claims.
- **Before each public release:** a short risk note in `docs/decisions.md` that walks the red lines and the five tests (law S11; the KIDS Act as reported would make such a pre-market evaluation a duty).
- **Before any launch aimed at minors, any portal revenue deal or any app-store release:** review by a Danish games or consumer lawyer (law 8).

**Red lines.** Never, in v1 or later:

1. Selling anything, or any path from money or an ad view to a reward or a random reward.
2. Trading, gifting or marketplaces that give items value outside the save.
3. Penalties for absence: streaks, decay, expiring rewards or currency, decaying banks, collectibles gone for good, progress that resets on a calendar, "come back or lose it" copy.
4. Push, browser, e-mail or badge notifications to bring players back, including after PWA install and in the mobile app.
5. Autoplay, auto-queue, or any chain of matches or rewards with no end state.
6. Engagement-optimised personalisation of difficulty, odds, rewards or content.
7. Near misses, fake odds, staged rarity teases, and slot, roulette or case-opening framing (the Wardrobe reel included).
8. Bots presented as people, hidden bot difficulty, fake player counts or imitation populations.
9. Rewards for watching, liking, sharing, inviting or referring.
10. Real-world location, camera, microphone or health data.
11. Text chat, stranger contact, public "last seen", contribution quotas.
12. Countdown offers, time pressure, guilt copy, confirmshaming, friction when quitting or skipping.
13. Tournaments with entry fees or prizes of money value.

**The owner's wishes and where they land.**

| Wish | v1 (funded) | Later, if funded |
|---|---|---|
| Competition | Trophies and arenas against labelled AI; a shared Daily Challenge with three difficulties and a copyable result line; "Highest AI tier beaten", which never falls; the Conquest board drawn as a ladder of Generals | Chrono Heat pacts, seed-race challenge codes with friends, a named AI rival; ranked PvP online |
| Collecting rare things | 55 cards, foils, 12 skins, 12 hidden feats; foil crafting after max (stretch) | Card stars, 30 feats, age sets, relic sets |
| Joy of opening capsules | Time Capsules unchanged (earned, pre-rolled, odds and pity shown); War Chest; Supply Capsules for playing; card-flip crates | Unchanged |
| Treasure hunting | Hidden feats with riddles, two of them obscure enough for the community to hunt | Rift Expedition treasure map with per-player placement; secrets |
| TikTok grip | Instant start, short matches, a Wordle-style result line, clean stopping cues | Save image and clips (D1); Clutch Puzzles |
| Improving for years | Levels to L10, Trophy Road, Conquest, feats, foil sets (about 2 years of Dust, stretch) | Heat, card stars, Gauntlet runs, new ages (D1) |

### A15.2 Loop map and horizon

**Loops at every time scale.** One tracker per scale (A15.13).

| Scale | What the player does | Main levers (psychology section) | Systems (v1; later) | Natural end | Its tracker |
|---|---|---|---|---|---|
| Seconds | Read the lane; tap a card, turret or power | Competence, flow, feedback (3.1, 3.2) | A2, A12. No meta prompt ever appears inside a battle | Inside the match | none |
| Match (3-9 min) | Build, evolve 2-4 times, fire powers, push and defend | Anticipation and payoff, close outcomes, curiosity, peak-end (3.5, 3.14, 3.16) | A2, A10; feats (A15.10); result tips (A15.12) | Match clock, Final Bell | Base HP bars |
| Session (15-40 min) | 3-6 matches, open capsules, upgrade | Bounded variable reward, goal gradient, autonomy (3.4, 3.7) | A6; wrap, tilt and break cards (A15.6) | Wrap card when charges run out or after 30 min; break card at 60 min | Capsule charges |
| Day | Daily Challenge; Supply Capsule; quests | Novelty, a small ritual with an end, fair comparison, sharing (3.15, 3.18, 3.12) | A15.7, A15.4 | "Daily done"; banks hold 7 days | Daily Challenge |
| Every 20 wins (about a week when engaged) | Fill the War Chest | Goal gradient (3.7) | A15.5 | Chest granted; nothing resets | War Chest |
| Months | Trophy Road, arenas, Conquest, collection, feats | Collection, mastery, curiosity (3.9, 3.3, 3.14) | A6.3, A6.10, A15.10 | Road at 4,000; 27 stars; full collection; 12 feats | Trophy Road |
| Per card | Upgrade to L10, then foil it | Collection, ownership (3.9, 3.11) | A6.6, A15.11 | L10, then Holo | Level, then foil |
| Years (later) | Heat pacts, card stars, runs, relics, new ages | Mastery with rising challenge, discovery, people (3.3, 3.20, 3.1) | A15.14-A15.17, D1 | Gold trims per General; 3 stars per card; 7-win runs | Heat per General |

**The v1 horizon** for an engaged player (A6.9 profile):

| Track | Ends |
|---|---|
| New cards | Days 9-21 |
| Trophy Road | About month 2 (4,000 trophies) |
| Conquest stars | Weeks to months |
| Feats (12) | Most within 2-3 months; the two obscure ones when someone works them out |
| Card levels, Codex Level, Amber | Months 5-6 |
| Crate skins | About 2 weeks after max, sooner with the War Chest |
| Foil sets (stretch, A15.11) | Bronze set about 2.5 months after max, Silver about 7 months later, Holo about 14 months after that |
| Daily Challenge, War Chest | Never: 6 modifiers × 8 Generals × 3 difficulties; skins, then Dust |

Without a later build, v1's long tail is the Daily Challenge, the War Chest, the feats and foil crafting. The owner should know this plainly. The best next investments are ranked in A16.24.

### A15.3 Honesty and copy pack (v1)

| | |
|---|---|
| Class | Healthy. Closes grey items 1-5 of the gap audit (law P-4, P-5, P-6, P-9) |
| Levers | Trust (Pillar 4); removes the illusion of control (3.6) and casino imagery |
| Size, phase, owners | XS · Phase 2b · WP9, WP10 and WP1 strings; WP7 (Rookie disclosure); WP11 (`NonePlatform` value); lead (decisions.md) |
| From | EL-2; PE 1.1, 1.5, 2.6; BS EL-2, 2.9 |

**Rules**

1. **No reel.** The Wardrobe Crate uses the card-flip reveal everywhere.
   - The reel is not built. `NonePlatform.features.reelReveal` is `false`, WP10 does not build `reel.ts` (and deletes it if Phase 1 already made it), and players cannot switch it on.
   - `WardrobeReveal` keeps its fields for contract stability; `reelTiles` may be empty.
   - The former A10.1 (the reel storyboard) is deleted and the reel is gone from the D2 cut order. `reel_tick` stays an unused sound ID.
2. **Strings.**

   | Where | Text |
   |---|---|
   | First capsule and every odds panel | "The result was decided when you earned this capsule. Tapping only reveals it." |
   | Scripted capsules 1-5 | Label "Starter Capsule · contents set to get you started"; the odds panel shows "Set contents" instead of bag odds |
   | Amber and Dust info panels | "Amber can't be bought. It has no money value." The same for Dust |
   | VS screen, first 20 matches of a save | Disclosure "Rookie AI: makes extra mistakes while you learn" (A6.8's +10 mistake points), through `OpponentSpec.disclosures` |
   | Help | "Your first 20 opponents make extra mistakes while you learn. After that, opponent difficulty adapts to your recent results." |
   | Under each bank | "Holds up to N. When full, it stops filling." (charges 28, Supply 7, Daily rewards 7) |
   | Quest panel | "New quests arrive each day. Up to 21 can wait for you." |
   | Settings > About, For parents, Home help | "Nothing you have earned is ever taken away." |
   | Echo of You (Skirmish) | "AI · Echo of You: an AI playing your War Plan" |

3. "Nothing expires" appears only where it is literally true: owned items, currencies, pending capsules and crates, War Chest progress and found feats.
4. **Forbidden copy:** "Nothing is lost while you're away" and "Everything waits for you" (both false once a bank is full), "we missed you", "last chance", and any countdown to a reward.
5. `docs/decisions.md` records engagement rule 10 (fairness is the only tuning target).

### A15.4 Banks, the Supply Capsule and the walk-away rule (v1)

| | |
|---|---|
| Class | Grey: clock refill rates and random capsules for players who may be minors. Safeguards: every reward needs play; banks hold 7 days; the copy says when a bank is full; no countdown on Home; capsule odds, pity and crafting as A6.4-A6.6 |
| Levers | Banked appointment (3.17) without pressure; goal gradient (3.7) |
| Size, phase, owners | S · Phase 2b · WP1 (numbers), WP7 (rules), WP8 (schema limits), WP9 (tray, quest panel) |
| From | PE 2.1, 2.4, 2.13, 1.1, 0.5; BS 2.9; law 4.4 (items D1-D4), P-2; psychology 9.3 |

The old Daily Capsule was the only reward in the game that needed no play: a random reward for opening the app on a calendar day, which is both the "login bonus" and the "variable reward for minors" the KIDS Act proposal is reported to target. It becomes the Supply Capsule.

| Bank | Before | Now |
|---|---|---|
| Capsule charges | +1 per 6 h, holds 12 | +1 per 6 h, holds **28** (7 days). A new save still starts with 12 |
| Daily Capsule, now **Supply Capsule** | 1 per day for opening the game, holds 3 | Allowance +1 per day at 04:00, holds **7**. Every 3rd finished match turns one allowance into a Supply Capsule |
| Daily quests | 3 a day, up to 6 unclaimed | 3 a day join a queue of up to **21**; the first 3 are active, the rest wait unseen |
| Daily Challenge reward | The first win of the day only | A bank of Daily rewards, +1 a day, holds **7** (A15.7) |

**Rules**

- **Supply Capsule.**
  - Same odds as the old Daily Capsule: Bronze 78%, Silver 15%, Jade 5%, Aeon 2%; the climb starts at Bronze.
  - A finished match is any match that reaches its end (a Retreat included), in any mode except the tutorial. Skirmish counts; the allowance already caps the reward at one capsule per banked day.
  - The count uses `matchesPlayed`: the 3rd, 6th, 9th … finished match turns one banked allowance into a Supply Capsule. If no allowance is banked, nothing happens.
  - The first Supply Capsule is granted right after capsule 2 is opened, with no matches needed, so the A8 beat at about 10:00 is unchanged.
  - The capsule tray shows "Supply Capsule: 2 more matches" while an allowance is banked, and nothing when none is.
- **Quest queue.**
  - At 04:00, 3 new quests join the back of the queue, up to 21. Only the first 3 are active and progress.
  - A claimed quest leaves the queue and the next one becomes active. The free daily reroll replaces one active quest.
  - The quest panel never shows the queue length (A15.13).
- **Quest weights.** Quests that pay only for activity (Play 3 battles, Train 30 units, Upgrade 2 cards) have weight 1. Skill and variety quests have weight 2 (psychology finding 14: informative goals beat bribes).
- **Why 28 charges is safe.** The bank never decays, so there is no reason to empty it in one sitting. Using 28 charges takes 28 wins, about 47 matches. The wrap and break cards (A15.6) cover long sessions.
- **Walk-away rule (tested, A15.20).**
  - A save left alone for 30 days loses nothing it owns: currencies, cards, pending capsules and crates, War Chest progress and found feats are unchanged, and each bank sits at its cap.
  - A player who plays the same matches once a week earns within about 15% of one who spreads them over 7 days. `sim:economy` reports this; it is a design target, not a player-facing promise.
- **Economy.** No change for the engaged A6.9 profile, who empties every bank daily. Weekly players gain. The Phase 3 economy run includes it.

### A15.5 War Chest and counting wins (v1)

| | |
|---|---|
| Class | Healthy: play-based, never resets, no calendar gate |
| Levers | Goal gradient (3.7), competence (wins, not logins) |
| Size, phase, owners | XS · Phase 2b · WP1, WP7, WP9 |
| From | EL-4; PE 2.3, 4.2; BS EL-4 |

It replaces the weekly quest "Win 15 battles", whose Monday behaviour A6.7 never specified.

**Rules**

- Every **counting win** adds 1 to the War Chest. At **20** the chest is granted at once: a Wardrobe Crate and an Age Capsule, the old weekly reward. The bar restarts at 0.
- Progress never resets. There is no weekly gate and no cap.
- **A counting win** is:
  - a win in Ladder or the Daily Challenge; or
  - a Conquest win that earns a star, or that beats a General whose tier is at least the player's skill tier minus 2 (skill tier: A15.9).
  - Skirmish, tutorial and (later) code matches never count. This stops farming Pip Quickstep.
- Home shows "War Chest 13/20" where the weekly quest line was. There is no "Ready" state and no timer.
- **Data.**
  - `QuestState.weekly.progress` holds the count (0-19). `weekKey` is unused and kept. `tickTimers` never resets it.
  - `PendingCrate.source` stays `weekly`.
  - JSDoc and a decisions.md entry record the new meaning.
- **Economy.** An engaged player (about 35 counting wins a week) gets about 1.75 chests a week instead of 1; a casual player about 0.6 instead of 0. `winsPerChest` is data, and the Phase 3 run may set it between 15 and 25.

### A15.6 Stopping well (v1)

| | |
|---|---|
| Class | Healthy. These are the remedies regulators ask for (DSA guidelines, the KIDS Act time tools as reported, the EU's TikTok finding). No reward is attached, so they bribe neither stopping nor continuing |
| Levers | Peak-end rule (3.16), informative feedback (3.1), stopping cues (3.18) |
| Size, phase, owners | S · Phase 2b · WP11 (session counters, void rule), WP9 (card component, Settings, parents page), WP8 (defaults), strings |
| From | EL-1, EL-6, EL-11; PE 1.2, 1.6, 2.5, 2.7, 2.11, 2.12, 2.14; BS EL-1, EL-6, EL-11 |

**Session and active play.**

- A session begins at boot, or when the tab becomes visible after at least 20 minutes hidden.
- Active play is time with the tab visible while a battle runs unpaused, or while the player has given input in the last 60 s.
- The counters live in WP11 memory and are never saved.

**Cards on the Result screen.** At most one card per Result screen, in the priority tilt, break, wrap. A card appears after the staged rewards. None blocks input, starts a timer or advances by itself.

| Card | Trigger | Content | Buttons |
|---|---|---|---|
| Wrap | Once per session: the Result of the ladder win that used the last capsule charge, or the first Result after 30 min of active play with at least 3 finished matches | 1. Summary: "3 wins · 1 loss · Pikeman reached L6 · 2 new cards". 2. Best moment: the win with the lowest own base HP, or a feat found, with Watch. 3. Only when charges ran out: "Capsule charges used up. Wins still pay Amber and a Clay pip." 4. One forward line with no number or clock: "Next on your road: Kingsmoat banner." | Home (primary), Next battle |
| Tilt | Once per session: the Result of the 3rd ladder loss in a row (when the Warm-up rule fires, A6.3) | "Tough run. Watch the closest one, or call it here?" | Home (primary), Watch (the loss where the enemy base had the least HP left), Next battle (labelled "Warm-up match") |
| Break | Break reminder on (the default): the first Result after each 60 min of active play | "You've played for an hour. A good moment for a break? Everything you've earned is saved." | Home (primary), Keep playing |

**Night line.** A match that ends between 22:00 and 06:00 local time adds one Result line, "It's late. Everything you've earned is saved.", and makes Home the primary button. There is no setting for it.

**Void matches.**

- A match that never reaches its end (the tab is closed or reloaded, the device switches off, a crash) is void. It changes nothing: no trophies, MMR, rewards, charge use, quest or War Chest progress, loss streak or Clay pip.
- Retreat from the Pause menu is a choice and still counts as a loss (A2.10).
- Dodging a loss against AI this way harms no one, like clock tampering (A6.3). Online PvP will treat a disconnect as a loss (D1).
- v1 has no battle resume (A15.17).

**Settings.**

- **Break reminder:** On (60 min, the default) or Off. Field `Settings.breakReminder`.
- **Quick reveal:** Off (default) or On. When on, every capsule opens at A10 step 4 (burst), as Trophy Road capsules do. Rarity pre-signals, walkouts and skips are unchanged. Field `Settings.quickReveal`.
- **Vibration** on capsule climbs and Legendaries (A13) defaults to Off.

**For parents** (a Settings page, strings only):

- "Nothing in Ageborn can be bought, and it shows no ads." (A later build with portal ads changes this line.)
- "There is no chat. Players cannot contact each other. All opponents are AI."
- "No data leaves this device. Progress is saved in this browser."
- "Capsules are earned by playing. Each one is decided when it is earned, and its odds are shown."
- "A break reminder appears after 60 minutes of play. You can switch it off or on here."
- "Taking a break never takes away anything your child has earned."

### A15.7 Daily Challenge 2.0 (v1)

| | |
|---|---|
| Class | Grey (a daily cadence). Safeguards: a 7-day reward bank; no streak counter; no "don't miss it" copy; the same reward at every difficulty, so nobody is pushed into a hard mode; no reward for sharing; no name in the result line |
| Levers | Novelty (3.15), a small ritual with a natural end (3.18, the Wordle pattern), fair comparison (3.12), autonomy (difficulty) |
| Size, phase, owners | M · Phase 2b · WP7 (seed, opponent, bank), WP9 (difficulty picker, Copy result), WP11 (Standard levels in the session, clipboard), WP1 (data), WP0 (contract amendment) |
| From | EL-3; PE 1.7, 3; BS EL-3; law D3, P-3; E4, N5 |

**Rules**

- **Shared seed.** `dailySeed = xmur3('daily' + YYYYMMDD)` for the local day starting 04:00. From it, everyone gets the same on that date:
  - the modifier (A9.1)
  - the opponent: one of the 8 ladder Generals from Pip Quickstep to Madame Tempest, with its personal War Plan (A6.10)
  - the match seed
- **Levels.** Standard levels: every card on both sides at L7 (`OpponentSpec.standardLevels`). The format stays Standard War.
- **Difficulty,** chosen before the match: **Recruit** (tier II), **Veteran** (tier V), **Warlord** (tier VIII). The default is the one nearest the player's skill tier. On a given date, everyone at the same difficulty faces the same opponent (A6.8's Legendary rule still applies).
- **Rewards.**
  - The Daily bank gains +1 at each 04:00 and holds up to 7. A new save starts with 1.
  - A win at any difficulty uses one banked reward and pays an Age Capsule. Other wins pay 20 Amber.
  - The Daily uses no charges and changes no trophies or MMR.
- **Copy result.** After a finished Daily, one button copies a plain-text line:
  - a win: `Ageborn Daily 2026-10-03 · Glass Armies · Veteran · Won in 5:42 · Base 63%`
  - a loss: `Ageborn Daily 2026-10-03 · Glass Armies · Veteran · Lost at 6:10`
  - It carries no name. Builds with `externalLinks` may add the site address; Poki builds never do. Copying pays nothing.
- **Not in v1:**
  - a "No pauses" marker (it would shame the pause a child needs)
  - evolve squares (`MatchStats` has no evolve times for both sides)
  - guest opponents, a Warlord title, a 7-day row of past days
  - modifier pairs (v1.1, A15.16)

### A15.8 Rewards by format (v1)

| | |
|---|---|
| Class | Healthy: equal reward per minute, not more for playing longer |
| Levers | Protects Pillar 2 and the Future Age content |
| Size, phase, owners | XS · Phase 2b · WP1 (data in `arenas.ladder`), WP7, WP9 (the format picker shows the reward) |
| From | EL-5; N3; BS EL-5 |

Today Short War pays about 55% more trophies per minute than Full War, which pushes players away from the only format with the Future Age.

| Format | Win trophies | Win Amber (without a charge) | Loss |
|---|---|---|---|
| Short War | +26 | 20 (40) | −20 |
| Standard War | +30 | 25 (50) | −20 |
| Full War | +34 | 30 (60) | −20 |

- The table applies from 400 trophies (Arena 3, where every format is open). Below 400, every format pays +30 and 20 (40) Amber, as A6.3 does today, so onboarding is not slowed.
- Loss rules (0 below 400, never below the arena gate), MMR, capsules and charges are unchanged.
- The Standard War row is set from the measured Standard median in Phase 3. The aim is trophies per minute within ±5% across formats at a 60% win rate. A2.14 gets no new gated target.
- A2.10's sentence "Trophies and rewards are the same for every format" is replaced by a pointer to this table.

### A15.9 Peak rank and the Hall of Generals (v1)

| | |
|---|---|
| Class | Healthy: comparison only against named, labelled AI and the player's own past; the number never falls |
| Levers | Competence and status (3.1, 3.12), goal gradient to the next rung |
| Size, phase, owners | S · Phase 2b · WP9, WP7 |
| From | EL-7; N10; PE 3 (EL-7); BS EL-7 |

- **Profile:** "Highest AI tier beaten: VI". It comes from `stats.winsByTier`, which counts Ladder, Daily Challenge and Conquest wins only (Skirmish is practice). It never goes down.
- **Peak tier at even levels** (A16.7): a win raises "Highest AI tier beaten" only when the player's average level over the format's ages is at most 1 above the opponent's. The Daily always counts, since both sides play at L7. Offline, this is the one honest skill number, and it does not measure grind.
- **Conquest board** (A9 screen 17): drawn as a vertical ladder of the 9 Generals ordered by tier, each with its AI badge. The player's portrait sits just above the highest General beaten in Conquest.
- **Skill tier** = clamp(round((MMR − 870) / 100), 0, 10): A6.8's formula without the arena clamp. It stays internal. It picks the default Daily difficulty and defines counting wins (A15.5).
- There is no live rank chip on Home. Trophies are the one rank number that moves.

### A15.10 Hidden feats (v1)

| | |
|---|---|
| Class | Healthy. Cosmetic and Dust rewards; a hint button means nobody is locked out |
| Levers | Curiosity gap (3.14), discovery (3.20), mastery (3.3); the genre's funniest clip moments |
| Size, phase, owners | M · Phase 2b · WP1 (`feats.ts`, strings), WP7 (feat tracker), WP11 (feeds events), WP9 (Feats tab, result step), WP0 (contract amendment) |
| From | EL-10; N13, E14; PE 3 (EL-10); BS EL-10 |

This is the v1 treasure hunt.

**Rules**

- The Collection gets a **Feats** tab. Each feat shows "???" and a one-line riddle until it is found.
- A **Show hint** button turns a riddle into its plain condition, whenever the player chooses. The choice is stored in `flags['featHint.<id>']`.
- Feats count in every mode except the tutorial. Skirmish counts, so players can experiment.
- **Detection.**
  - A pure feat tracker in `meta` receives each tick's `SimEvent`s from the session, the way `sim/stats.ts` builds `MatchStats`. The session never buffers the whole event stream.
  - At the end the tracker's found ids go into `MatchResultInput.feats`.
  - `applyMatchResult` grants each new feat once, emits `{ kind: 'feat', featId }` and sets `flags['feat.<id>']`.
- **Reward:** 100 Dust each; four feats also give a title. A found feat is staged as its own Result step (A15.13).
- **Predicate kinds** are a closed list typed in `feats.ts`, holding only what these 12 feats need. A new feat of an existing kind is data; a new kind is code.

| Feat | Riddle | Condition | Title |
|---|---|---|---|
| Caveman Diplomacy | "Old bones, new tricks." | A Stone Age unit lands the killing blow on a Future Age unit | |
| Arrows into Tomorrow | "The sky of the past rains on the future." | One Arrow Storm cast kills 3 or more Modern or Future units | |
| Stubborn | "Some never leave the castle." | Win a Standard or Full War without evolving past Medieval | the Stubborn |
| No Walls | "Who needs towers?" | Win a Full War without building a turret | |
| Photo Finish | "By a hair." | Win at the Final Bell by 2% base HP or less | Photo Finisher |
| Horn of Legends | "One last blast." | One Last Stand volley kills 8 or more units | |
| Lightspeed | "Clubs to lasers, fast." | Reach the Future Age before 4:00 in a Full War | |
| Underdog | "Two ages behind, still standing." | Win after the opponent was two ages ahead of you | |
| Humble Beginnings | "Commons can conquer." | Win a Full War with only Common cards and default powers in the plan | |
| Back from the Brink | "Almost dust." | Win after your base fell below 5% HP | |
| Stone Cold (obscure) | "The first stone is the last." | A Stone Age unit deals the final blow to a base in the Future Age | Stone Cold |
| Old Guard (obscure) | "Five ages, one army." | Have living units from all 5 ages on your side at the same time | Keeper of Ages |

- **Data sources** (all existing): `died` (card, killer card and killer kind), `hit` with `castId`, `ageUp` for both sides, `turretBuilt`, `lastStandFire`, `baseDamaged` (own HP and the source unit), `unitSpawned` (entity id to card), the outcome and the War Plan.

### A15.11 Post-max sinks: foil crafting and Amber to Dust (v1 stretch)

| | |
|---|---|
| Class | Healthy: cosmetic, prices visible, no time limits, never in the lane |
| Levers | Collection with reachable completion (3.9), goal gradient (3.7), autonomy (which card to polish) |
| Size, phase, owners | S · Phase 2b if capacity allows, otherwise the first A15 item after v1 · WP1 (prices), WP7, WP9 (Card detail button). No contract change |
| From | EL-12 (foil part); E21, N2; PE 3 (EL-12); BS EL-12 |

It closes the gap analysis's most important structural gap: after months 5-6 every reward pays in currencies that buy nothing, and the capsule turns into a counter.

**Rules**

- **Foil crafting.** Only for L10 cards, so Dust goes to progression first. Crafting a higher foil than the one owned costs the difference between the two prices. It uses `Meta.craft(s, 'foil:<card>:<foil>', c)`.

  | Foil | Common | Rare | Epic | Legendary | Full set of 55 |
  |---|---|---|---|---|---|
  | Bronze | 500 | 1,000 | 3,000 | 8,000 | 97,500 |
  | Silver | 2,000 | 4,000 | 12,000 | 32,000 | 390,000 |
  | Holo | 5,000 | 10,000 | 30,000 | 80,000 | 975,000 |

- **Amber after max.** Once no upgrade is left to buy, Amber from every source is paid as Dust at 10 Amber = 1 Dust, shown as Dust on the reward (as copies past L10 are, A6.6). The Amber info panel explains it.
- **Pacing** at about 1,370 Dust a day after max (about 1,200 Dust plus 170 from Amber, gap analysis model): the Bronze set about 2.5 months, Silver about 7 months later, Holo about 14 months after that. Foils from capsules shorten this.
- Capsule foil odds (A6.4 step 5) are unchanged. There is no Holo compass.

### A15.12 Result tips (v1 stretch)

| | |
|---|---|
| Class | Healthy. Informative feedback supports motivation where rewards for playing do not; a useful line after a loss reduces tilt |
| Levers | Informative feedback (3.1, psychology finding 14) |
| Size, phase, owners | S · Phase 2b, cut first · WP11, WP9, WP1 strings |
| From | EL-8; PE 3 (EL-8), 5.5; BS EL-8 |

- **After a win:** one line when a stat passes a fixed threshold in content data. Priority: a new fastest win (`fastestWinMs`), 10 or more turret kills, one Age Power hitting 6 or more enemies, the final age reached before the quest time (A6.7), base above 80%. Example: "Your turrets held the line: 14 kills."
- **After a loss:** one tip from the A8 failure-pattern detector that fired most in this match. The detectors keep running after onboarding; only their in-battle hints stop. Example: "Tip: their turrets shred melee. Try Pebblers."
- There are no averages over past matches (the save keeps none) and no Records tab in v1.

### A15.13 Screen and counter budget (v1)

The reviews found that the proposal rejected the obvious dark patterns but rebuilt their pull as many meters and bars: rewards that crowd out the reason to play (overjustification), and a return that feels like a to-do list. These rules prevent that.

- **Result screen:**
  - At most 3 staged steps: (1) the result with trophies, (2) the main reward (a capsule, an Age Capsule or a Clay pip), (3) one progress bar: whichever of the next Trophy Road node, the War Chest or a Conquest star is closest to done.
  - A found feat adds its own step (there are 12 in all).
  - Everything else (Amber, Codex points, quest progress, Supply progress) sits in one summary row that expands on tap.
  - Tap to skip still works. This replaces the one-at-a-time list in A9 screen 7.
- **Home:** the War Chest bar replaces the weekly quest line, and Supply progress lives inside the capsule tray. There is no other new widget in v1.
- **No backlog counts.** Counts of things ready to open ("Open (3)") are fine. Counts of things not yet done ("Unfinished maps (7)", "Dailies (5)", the quest queue) are not.
- **No timers on Home.** Charges show "12/28". The rule "+1 every 6 hours" sits in the info panel.
- **No cross-feeds** in later phases: each new system pays into its own track plus Dust, never into several tracks at once.
- Any later system that adds a Home widget or a Result step must remove one or pass the meter test (A15.1).

### A15.14 Mastery after v1 (v1.1 wishlist)

#### Chrono Heat with a Pact menu

| | |
|---|---|
| Class | Healthy: opt-in; every condition is shown on the VS screen; bots keep every A7.1 rule |
| Levers | Mastery with rising challenge (3.3), flow (3.2), autonomy (the player chooses the conditions, as Hades does); the cheapest "forever" content (benchmarks finding 10) |
| Size, phase, owners | M · v1.1 · WP1 (`heat.ts`), WP7, WP9 (Pact picker, VS disclosures), WP8, WP0 (contract) |
| From | EL-15, E7, Psy-G; PE 3 (EL-15); BS EL-15 |

**Rules**

- Heat unlocks per General after its 3 Conquest stars. Before a Heat match the player picks any set of conditions. **Heat** is the sum of their points.
- Retries are free: no charges, trophies or MMR, as in Conquest.
- No condition changes the sim: no `SideConfig` rule, `SIM_VERSION` or `contentHash` change. Each one sets the opponent spec or the plan, or is checked from `MatchStats` and the outcome when the match ends.

| Condition | Points | How it works |
|---|---|---|
| Sharper: AI tier +1 per step, up to X | 1 per step | `OpponentSpec.tier` |
| Veterans: AI card level +1 per step, up to 10 | 1 per step | the bot's `SideConfig.levels` |
| Full armoury: the General brings a Legendary in every age at its level, as The Warden does (A7.4); not offered for The Warden | 3 | the bot's War Plan |
| No Treasury: win without buying Treasury | 2 | `stats.usedTreasury` |
| No horn: win without Last Stand | 1 | `stats.usedLastStand` |
| Swift: win before 6:00 | 2 | `stats.durationMs` |
| Unscathed: win with your base above 50% | 2 | `outcome.baseHpBp` |
| Old guard: your plan holds only Common and Rare cards | 2 | plan check before the match |
| Spice: add one Daily modifier (symmetric) | 0 | `modifiers`, for variety only |

- A Heat match is **cleared** when the player wins and every chosen condition holds. The Result says which condition failed: "Won, but Swift failed (6:12)."
- **Maximum Heat** runs from 30 (Pip Quickstep) to 10 (The Warden), 194 across all 9 Generals.
- **Rewards.**
  - Each new best Heat on a General pays 25 Dust and +1 Codex point per point gained.
  - Portrait trims for that General at a third, two thirds and all of its maximum (Bronze, Silver, Gold).
  - The title "Timebreaker" and a frame for Gold on all 9.
  - A Heat clear counts for the War Chest only when it sets a new best.
- **Data.** Save `conquest.heat?: Record<generalId, number>` (best cleared). Contract: `pickOpponent` option `pact?: string[]`; `OpponentSpec.pact?: string[]`.

#### Card stars as challenges

| | |
|---|---|
| Class | Healthy. A star says what you did with a card, not how long you used it |
| Levers | Mastery (3.3), variety against a stale meta (3.15), collection (3.9), curiosity |
| Size, phase, owners | M (mostly data authoring) · v1.1, after Heat · WP1 (`cardStars.ts`), WP7 (tracker counters), WP9 (pips in Collection, Card detail and War Plan; never in the battle tray), WP8 |
| From | EL-12 (stars), EL-14, E6, Psy-E; PE 3 (EL-12, EL-14); BS EL-12, EL-14 |

- Every card (55) and Age Power (10) has 3 stars:
  - **★1**, a role challenge from a template:
    - Infantry: one unit of the card kills 3 enemies.
    - Ranged: the card kills 8 enemies in one match.
    - Heavy: one unit of it reaches and hits the enemy base.
    - Anti-armor: it kills 3 Heavies in one match.
    - Support: one unit of it stays alive for 90 s.
    - Epic and Legendary units: it kills 10 enemies in one match.
    - Turrets: it kills 12 units in one match.
    - Powers: one cast hits 6 or more enemies.
  - **★2**, a card-specific challenge written as data with the feat predicate kinds (65 lines).
  - **★3**, win a Heat 5+ match with the card in your War Plan.
- Rewards: 50, 100 and 200 Dust and +5 Codex points per star. Stars never change stats.
- The feat tracker gains per-card counters from the event stream. `MatchStats` does not change.
- Save: `stars?: Record<CardId, 0 | 1 | 2 | 3>` (cards and powers).

#### Codex Level extended

| | |
|---|---|
| Class | Healthy: it never decreases, and there is no reset-for-bonus prestige |
| Levers | Endowed progress and long nested goals (3.7) |
| Size, phase, owners | S · v1.1, with stars · WP1, WP7 |
| From | EL-13; PE 3 (EL-13); BS EL-13 |

- New point sources: a card star 5; a new foil tier on a card, Bronze 1, Silver 2, Holo 4; a feat 3; each new best Heat point 1. A6.7 is otherwise unchanged.
- Codex is a background number on the Profile. Frames continue every 10 levels past 75, as data.
- No thresholds are published for systems that are not built. The Home base (A15.16) grows with achievements, not with Codex.

### A15.15 People without a server (v1.1 wishlist)

#### Share codes and custom challenges

| | |
|---|---|
| Class | Healthy. Opponents are labelled AI; no rewards for creating, sharing or redeeming a code; no "your code was used n times" counter; no name unless the player adds the auto name |
| Levers | Relatedness (3.1), friendly rivalry (3.12), creation (the healthy half of TikTok), the IKEA effect of a plan others fight (3.11) |
| Size, phase, owners | M · v1.1 · WP0 (`src/core/codes.ts`, contract), WP7 (import validation), WP9 (Enter code, Create challenge, share sheet), WP11 (seed and plan in the session), WP12 (round-trip tests) |
| From | EL-28, E5, Psy-B; PE 1.5, 3 (EL-28), 5.2; BS EL-28 |

**Rules**

- **Format:** `AGB1-` plus a Crockford base32 payload and a 2-character checksum. It is plain text that pastes into the game (Poki-safe). Builds with `externalLinks` also offer a URL form.
- **War Plan code** (about 60 characters): 5 ages × 8 slots × a 7-bit card index. Importing creates a new preset; unowned cards show as "Not owned".
- **Challenge code** (about 40-70 characters). It carries:
  - the format and a 32-bit match seed
  - the opponent: a General and tier, or "Echo" plus a War Plan
  - up to 2 Daily modifiers and any Pact conditions
  - the creator's result (time and base %)
- **The race.** Both sides play at Standard levels (L7) and the friend uses their own War Plan. The friend fights the same AI opponent from the same seed, like a time trial. The Result compares: "You: won in 5:02 · Code: 5:44".
- An Echo opponent reads "AI · Echo of Chief-4821: an AI playing Chief-4821's War Plan" (the Balanced brain, A7.4). It is never called a friend's ghost.
- **Create challenge** in Skirmish builds a code from any of these choices.
- **Rewards:** as Skirmish (5 Amber per win). No War Chest progress; feats count, as in Skirmish.
- No reply codes and no rivalry log: a friend answers with a new code.

#### Rival

| | |
|---|---|
| Class | Healthy: revenge against a labelled AI character, with no bounty and no shaming copy |
| Levers | Character (3.20), competence |
| Size, phase, owners | S · v1.1 · WP7, WP8, WP9 |
| From | E10; PE 5.3 |

- The Conquest ladder shows "Your rival: Madame Tempest (3-7)" for the General with the most losses against it in Ladder and Conquest (at least 3), with a Rematch button that starts a Skirmish against it.
- Save: `stats.vsGeneral?: Record<generalId, [wins, losses]>`.

### A15.16 Variety and place (v1.1 wishlist)

**Daily modifier pairs.** Healthy. S · WP1, WP7, WP12. From PE 3 (EL-3, EL-17).

- The Daily draws from 21 entries: the 6 modifiers and their 15 pairs. The sim already applies a list of modifiers (`matchMods`), so this is a meta and data change only.
- A date-seeded shuffle cycle shows each entry once every 21 days. Opponent personality (8) and difficulty (3) multiply the variety.
- Every pair passes a bot-vs-bot smoke run before it ships.

**Welcome card** (replaces the rest bonus). Healthy. S · WP7, WP8, WP9. From PE 2.13, 5.4.

- After at least 3 days with no finished match, Home shows once: "Welcome back, Chief. Today's Daily: Glass Armies vs Captain Kettle."
- No reward and no "we missed you". Save: `stats.lastMatchAt?`.

**Skirmish presets.** Healthy. XS, after codes · WP1, WP9. From EL-20; PE 5.7; BS EL-20.

- Blitz (Short War with Gold Rush and Fast Forward), Mirror (Echo of You), and plan constraints through Pact conditions ("Commons and Rares only").

**Age sets in the Collection.** Healthy. S · WP1, WP7, WP9. From EL-22; BS EL-22.

- Each age filter shows a header such as "Stone 9/11". At 11/11 the player gets that age's banner once, recorded in `cosmetics.owned`. No Album tab and no `museum` save field.

**Home base and trophy shelf.** Healthy. S-M · WP9, WP11, WP7. From EL-16; PE 3 (EL-16); BS EL-16. Built as the Keep of the home village in v1.1 (A16.22), which replaces this item in the wishlist.

- Home's backdrop shows the player's own base, using the existing base visuals and the equipped base skin, in the age of the highest milestone reached:

  | Base age | Milestone |
  |---|---|
  | Stone | New save |
  | Medieval | Arena 3 |
  | Gunpowder | All 55 cards owned |
  | Modern | 27 Conquest stars |
  | Future | Every card at L10 |

- Milestones are achievements, not time served.
- The Profile gets a trophy shelf: a grid of found feats, Conquest Generals beaten, arena banners and owned Legendary portraits (`ArtProvider.portrait`). When pinned replays exist (D1 clips), a shelf item opens the replay of the moment it was earned.

**Feats to 30 and secrets.** Healthy. S (data) · WP1, WP7, WP11.

- 18 more feats as data, plus about 5 with each new age wave (D1).
- 3 secrets outside battle, for example tapping the moon on the Future title skyline 7 times for an emote.

**Save image** joins D1's Clip Mode (v1.1), so one capture pipeline serves images and clips. M · WP5, WP9, WP11.

- Images of the first Legendary walkout, the Result card and a feat card, 1080 × 1350, with a small watermark.
- No name unless the player adds the auto name. No reward.

### A15.17 Runs, treasure and online (v1.2 and later wishlist)

#### Gauntlet: a run mode with Draft War

| | |
|---|---|
| Class | Healthy: a natural stop at 7 wins or 2 losses, a different run every time, levels do not matter, nothing time-limited |
| Levers | Mastery and flow (3.2, 3.3), novelty (3.15), autonomy; the roguelite "one more run" with an end (benchmarks 3.9) |
| Size, phase, owners | M-L · v1.2 · WP1 (`gauntlet.ts`), WP7 (draft, run state), WP9 (draft and run screens), WP11 (player-side plan and levels in the session), WP8, WP0 |
| From | EL-20, E17; PE 5.1, 3 (EL-20); BS EL-20 |

**Rules**

- **Draft War** is a permanent mode on Mode select, not a rotating one (benchmarks: keep core modes always on).
  - Standard War at L7.
  - For each age the player picks 5 units, each from 3 offers; 2 turrets, each from 2; 1 power from 2. Offers come from the full pool, owned or not.
  - The AI drafts the same way from its seed.
- **Gauntlet.**
  - Draft a plan, then fight up to 7 seeded AI opponents in a row at tiers II, III, IV, V, VI, VII and VIII, each with one Daily modifier.
  - After each win the player picks 1 of 3 boons: +1 level for one age's cards (max L10), redraft one slot from 3 offers, or one extra life (at most one).
  - Boons change only the plan and levels, never sim rules.
  - The run ends at 7 wins or 2 losses. A run in progress is saved and never expires.
- **Rewards:** 30 Dust per win; a badge the first time a run reaches 3, 5 and 7 wins; the best run on the Profile.
- **Daily Gauntlet:** a variant on the Daily seed, so friends can compare with a copy line.
- **Contract:** `MatchResultInput.mode` gains `gauntlet`; meta passes a player-side override (plan and levels) to `BattleSession`; save `gauntlet?`.

#### Rift Expedition, redesigned

| | |
|---|---|
| Class | Healthy: discovery with a disclosed, finite composition; no calendar; nothing lost; cosmetic; crafting fallback. The relic draw is a grey element, safeguarded by bags and crafting |
| Levers | Curiosity and discovery (3.14, 3.20), competence (reading trails), collection (3.9), a shared talking point |
| Size, phase, owners | L · v1.2 · WP1 (`relics.ts`, `expedition.ts`), WP7, WP9 (map screen), WP4 (relic and tile icons through a new `ArtProvider` icon method), WP8, WP0 |
| From | EL-23, E12, Psy-A, P-7; PE 0.9, 3 (EL-23); BS EL-23 |

**Rules**

- **Maps are numbered.** Map n's look (age layers, biome, "weather") comes from `hash('rift', n)` and is the same for everyone, so players can talk about "map 12". What lies under each tile comes from the save's seed and n, so a solution cannot be posted.
- **Grid:** 4 × 4 with the Camp revealed in one corner. The 15 hidden tiles hold, as shown on the map: 1 Gilded relic, 3 relics, 4 caches (60 Dust each) and 7 trails (each an arrow toward the Gilded tile).
- **Digs:** +1 per finished match in Ladder, Daily Challenge, Conquest, Heat or Gauntlet; none from Skirmish, codes or a Retreat. Digs bank with no cap. A dig reveals a hidden tile next to a revealed one.
- **Goal:** find the Gilded relic. ★★★ in 6 digs or fewer, ★★ in 9 or fewer, ★ otherwise. Revealing the rest of the map is optional.
- **Moving on** to the next map is the player's choice once the Gilded is found. Relics are drawn from per-save relic bags when a tile is dug, so leaving tiles behind never loses a relic.
- **Relics:** 5 ages × 2 sets × 6 relics, each with a gilded variant (120 items), drawn in code from a few shape families in each age's palette. A relic from a set the player has started can be crafted: relic 300 Dust, gilded 1,500 Dust.
- A `tools/` solver checks each map: trails should find the Gilded in about 5-6 digs, against about 8 at random.

#### Clutch Puzzles and battle resume (later)

- **Battle resume** (EL-11), M: a resume record under its own B8 key, and bots rebuilt by re-running their controllers from tick 0. Abandoning or letting the record expire voids the match (A15.6).
- **Clutch Puzzles** (EL-25), M, on the same infrastructure. Battle Puzzles (A16.16) replace and widen them; the constraints below still apply. Each puzzle is the last 30-90 s of a mined bot-vs-bot match in which the side at 20% base HP or less still wins.
  - Every mined position must be won again by a human-limited input bot (at least 300 ms per action, at most 12 actions per 10 s), so humans can solve it.
  - Puzzle ids are stable, and each puzzle keeps a copy of its battle rules, so a balance patch never orphans earned stars or shared puzzle numbers.
  - Sets of 5, with no auto-chaining across sets.

#### Guest Generals and identity in the lane (later)

- **Guest Generals** (EL-19), M: 4 guests as variants of weights, openings and War Plans. Quirks that weights cannot express ("never builds turrets") need hard constraints on `BotProfile` and in the brain (WP3). Each is labelled AI with its tier shown. After its first appearance a guest stays in Skirmish for good.
- **Identity in the lane** (EL-26), M, with clips: the equipped banner flies on the player's base and the title sits under the base HP bar. A gallery test runs for every banner on every base.

#### Online (the D1 server milestone)

- **Seasons with carry-over:**
  - The road is continuous; the monthly theme changes art, not progress.
  - Unreached nodes from past seasons stay claimable.
  - A season pennant records a month, and a missed one can be crafted later at Stone grade.
  - No rank decay. Seasonal cosmetics can be crafted all year after their first cycle.
- **Daily leaderboards** per difficulty. The server re-simulates each replay before listing it. Friends first and relative (you ± 10); pseudonymous auto names; opt-out.
- **Friend duels** by friend code: unranked, emotes only.
- **Warbands:** a shared Expedition map. Rewards go to everyone who dug at least one tile. No quotas, no "last seen", no contribution ranking; preset messages only.
- **Capsules:** rolled by the server for online accounts (D1), with the same odds.

### A15.18 Contract, save-schema and content-table changes by phase

#### v1 Phase 2b

**One amendment by the integration lead (WP0) at the start of Phase 2b.** Fakes and the v1 save fixture are updated in the same change. Item 1 changes a field; the rest are optional additions, so code already written still compiles.

| # | Contract | Change | For |
|---|---|---|---|
| 1 | `SaveDoc.daily` | `{ dayKey: string; won: boolean }` becomes `{ dayKey: string; bank: number }` | Daily reward bank (A15.7) |
| 2 | `Meta.pickOpponent` options | + `daily?: { difficulty: 'recruit' \| 'veteran' \| 'warlord' }` | A15.7 |
| 3 | `OpponentSpec` | + `standardLevels?: boolean`, used by the Daily and Skirmish | Tells `BattleSession` to put the player's side at L7 |
| 4 | `MatchResultInput` | + `feats?: string[]` | A15.10 |
| 5 | `RewardStep` | + `{ kind: 'feat'; featId: string }` | A15.10 |
| 6 | `Settings` | + `breakReminder?: boolean` (default true), `quickReveal?: boolean` (default false) | A15.6 |

**Meaning changes with no type change** (JSDoc plus a decisions.md entry):

- `capsules.charges`: bank maximum 28.
- `capsules.dailyBank`: the Supply allowance, maximum 7. `PendingCapsule.kind 'daily'` is shown as "Supply Capsule".
- `QuestState.daily`: a queue of up to 21; the first 3 are active.
- `QuestState.weekly`: War Chest progress, never reset; `weekKey` is unused.
- `ProfileStats.winsByTier`: Ladder, Daily Challenge and Conquest only.
- `WardrobeReveal.reelTiles`: may be empty (no reel).
- `NonePlatform.features.reelReveal`: `false` (a value, WP11).
- `Settings.vibrate`: default false (WP8 defaults).
- `flags['feat.<id>']` and `flags['featHint.<id>']`.

**Save schema.** All of this lands before the Checkpoint C push, so SaveDoc stays at version 1 with no migration. After that push, every shape change needs a migration (B8).

**Content tables** (WP1). They are typed on `Content`, not on the frozen `CompiledContent`. Meta tables sit outside `contentHash`, so replays are not affected.

- `arenas.ladder.win`: keyed by format, plus the 400-trophy rule (A15.8).
- `dailyModifiers.challenge`: `bankMax` 7; `difficulties` recruit 2, veteran 5, warlord 8; `standardLevel` 7; the opponent pool (8 Generals).
- Capsule and economy rules: `chargesMax` 28; `supply` with `matchesPerCapsule` 3 and `allowanceMax` 7, replacing the Daily Capsule's bank of 3.
- `quests`: `queueMax` 21, a `weight` per quest, and `warChest` with `winsPerChest` 20, replacing `weekly_win_15`.
- New `feats` table: 12 rows with predicate kind and parameters, reward, title and string keys; added to `MetaTables`.
- Stretch: foil crafting prices, `amberToDustRatio` 10, result-tip thresholds.
- Strings: the A15.3 pack, the Result cards and night line, the parents page, feats, Daily difficulty names and the copy line. WP1 owns content strings; WP9, WP10 and WP11 own their UI strings.

#### v1.1, if funded

SaveDoc v2 through migration m[1], which only adds optional fields with defaults.

| Change | For |
|---|---|
| Save `conquest.heat?`, `stars?`, `stats.vsGeneral?`, `stats.lastMatchAt?` | Heat, card stars, rival, welcome card |
| `pickOpponent` option `pact?: string[]`; `OpponentSpec.pact?: string[]` | Heat |
| `SkirmishOptions` + `plan?`, `seed?`, `modifiers?`, `pact?`, `challenge?`; the mode stays `skirmish` | Codes, presets |
| New `src/core/codes.ts` (pure encode, decode, checksum) | Codes |
| JSDoc for the `foil:<card>:<foil>` craft id, if A15.11 was not in v1 | Foil crafting |
| D1 Clip Mode: a `SaveStore` pin API, replay ids, a compressed copy of the battle rules inside pinned replays | Save image, clips |
| Content: `heat.ts`, `cardStars.ts`, Codex point sources, Daily entries with pairs, Skirmish presets, age-set rewards, 18 feats, secrets | |

v1.1 changes contracts only for F3, battlefields and weather, emotes and quips, the village `building?` method and, if the owner approves them, doctrines and power overflow, all in the one v1.1 batch (A16.23, owner decision O10).

#### v1.2, if funded

SaveDoc v3 through migration m[2].

| Change | For |
|---|---|
| Save `gauntlet?`, `expedition?` (map number, revealed mask, digs, bag states), `relics?` | Gauntlet, Expedition |
| `MatchResultInput.mode` + `gauntlet` | Gauntlet |
| A player-side override (plan and levels) from meta to `BattleSession` | Draft War, Gauntlet |
| An `ArtProvider` icon method (relics, map tiles) | Expedition |
| `BotProfile` hard constraints | Guests |
| A session that starts from a replay tick with bots rebuilt; a resume key in B8 | Battle resume, puzzles |
| Content: `gauntlet.ts`, `relics.ts`, `expedition.ts`, guests in `generals.ts`, `puzzles.generated.json` | |

**Rules for every amendment:** optional fields only; fakes and fixture updated in the same change; meaning documented in JSDoc; one batch per phase, not one per feature.

### A15.19 Build plan

**Sizes.** XS: strings or one value. S: one or two WPs, mostly data and a small component, no frozen-contract change. M: a frozen-contract change, three or more WPs, or a new screen or rule set. L: several WPs with new art, content authoring, contract changes and an economy re-run.

#### v1 Phase 2b

Everything lands in Phase 2b. Phase 3 stays numbers, polish and C5. Priority order; if time runs short, cut from the bottom.

| # | Item | Section | Size | Owners |
|---|---|---|---|---|
| 1 | Contract amendment (6 items), fakes, v1 fixture | A15.18 | S | WP0 lead, WP8 |
| 2 | Honesty pack; reel not built | A15.3 | XS | WP9, WP10, WP11, WP7, WP1 |
| 3 | Banks: charges 28, Supply Capsule, quest queue and weights | A15.4 | S | WP1, WP7, WP8, WP9 |
| 4 | War Chest and counting wins | A15.5 | XS | WP1, WP7, WP9 |
| 5 | Stopping well: wrap, tilt and break cards, night line, void rule, Settings, parents page | A15.6 | S | WP11, WP9, WP8 |
| 6 | Daily Challenge 2.0 | A15.7 | M | WP7, WP9, WP11, WP1 |
| 7 | Screen and counter budget | A15.13 | S | WP9 |
| 8 | Hidden feats (12) | A15.10 | M | WP1, WP7, WP11, WP9 |
| 9 | Rewards by format | A15.8 | XS | WP1, WP7, WP9 |
| 10 | Peak rank and the Conquest ladder layout | A15.9 | S | WP9, WP7 |
| 11 | Stretch: foil crafting and Amber to Dust | A15.11 | S | WP1, WP7, WP9 |
| 12 | Stretch: result tips | A15.12 | S | WP11, WP9, WP1 |

- **Items 1-5 are the must-do set.** They close the honesty and walk-away problems before any public build.
- **Items 6-10** carry the owner's wishes (fair competition, the treasure hunt).
- **Items 11-12** are cut first.

**Phase 3:** re-run `sim:economy` with the new sources (Supply Capsules, charges 28, the War Chest at 20, rewards by format, Dust from feats). The A6.9 gates stay. Add the C5 items and the copy review (A15.20).

**Landing status (2026-09-28).**

1. Done: the owner accepted the three questions (the reel is not built; the safe defaults apply to everyone; the v1 slice above).
2. Done: this section is merged into DESIGN, with the edits to A1 Pillar 4, A2.10, A6.1, A6.2, A6.3, A6.4, A6.7, A6.8, A6.9, A7.1, A8, A9, A9.1, A10 (A10.1 deleted), A13, B8, B9, B11, B14, B15 (new B15.1), C2, C5, D1, D2 and the appendix.
3. The reel is not built. If Phase 1 already made `src/capsule/reel.ts`, WP10 deletes it (`a15-wp10-reveal.md`).
4. Done: one request file per owner in `docs/requests/`: `a15-wp0-contracts.md`, `a15-wp1-content.md`, `a15-wp7-rules.md`, `a15-wp8-save.md`, `a15-wp9-screens.md`, `a15-wp10-reveal.md`, `a15-wp11-session.md`, `a15-wp12-tests.md`.
5. Open: update `ageborn-phase2-loop`:
   - Home and Result additions go to the meta-ui agent.
   - Daily, War Chest, bank and feat rules go to the modes agent.
   - Reel removal and quick reveal go to the capsules agent.
   - No separate "engagement" agent: it would edit the same screens as another agent.
   - The rules-meta and honesty lenses check A15.
6. Open: update `ageborn-phase3-polish` with the C5 additions and the economy re-run.
7. Keep the rest of the proposal as design history. Add no stubs or hooks for unbuilt systems.

#### After v1

The unfunded wishlist after v1 is one ranked list in A16.24. It keeps this section's items in their relative order and slots A16's items in. Systems that renew from seeds and existing content come first (engagement rule 9).

### A15.20 Measurement, tests and release notes

**Economy report** (WP12, `sim:economy`).

- v1 prints the day each v1 track ends (A15.2), a weekly player's income against a daily player's for the same matches (target within 15%), the Supply and War Chest rates, and Dust after max.
- The A6.9 gates (±20%, and a copy-to-Amber finish gap under 30 days) stay. Nothing new is gated.
- For later phases it also reports "days without a new collectible" (aim: never more than 21) and "days without something new to play" (aim: never more than 14).

**Unit tests** (WP7 unless noted).

- A 30-day absence: nothing owned changes, and each bank stops at its cap.
- Supply: the 3rd finished match turns one allowance into a capsule; void and tutorial matches do not count.
- War Chest: `tickTimers` never resets it; the counting-win rule holds; Skirmish never counts.
- Daily: the same opponent and seed for the same date and difficulty; the bank gains +1 a day up to 7.
- Feats: each fixture event stream triggers exactly its feats, and each feat pays once.
- Copy result grants nothing (WP9, WP12).

**C5 additions** (Phase 3 bug bash). Items 24, 26 and 36 change to match A15.4 and A15.3.

45. The first Supply Capsule appears after capsule 2; later ones need 3 finished matches each; the allowance banks 7. Charges bank 28. The quest panel shows 3 quests.
46. The War Chest fills from counting wins only (never Skirmish), grants at 20 and never resets.
47. The Daily offers three difficulties, shows the same opponent in two browsers set to the same date, pays from the bank, and Copy result copies the line with no name.
48. The wrap, tilt and break cards appear as specified, never in battle, with Home as the primary button. The night line appears after 22:00.
49. Closing the tab mid-match changes nothing. Retreat still counts as a loss.
50. Feats show "???" rows and Show hint; a found feat stages its own step and pays once.
51. The Wardrobe Crate uses the card flip and no reel exists. Quick reveal skips climbs.
52. Settings > For parents shows every line. Vibration is off by default.
53. Copy review: no string says "Nothing is lost while you're away", "Everything waits for you" or "we missed you", and none shows a countdown.

**Healthy-play signals** in the local event log (A8). None of this leaves the device.

- Sessions over 90 minutes.
- Sessions after 22:00.
- Sessions that end right after 3 losses.
- How often a session ends on a wrap, tilt or break card.

**Playtests.** After a session, ask one question: "Was that time well spent?" A change that raises playtime but lowers this answer does not ship.

**Release notes.** Before each public release, write the risk note (A15.1).

**Compliance switches** (designed, not built). They are built only if a final law or a platform requires them:

- `capsuleMode: 'disclosedCycle'`: the next 10 capsule tiers are shown in advance (law P-1).
- Play-accrued banks: +1 charge per 2 finished matches instead of per 6 h, and +1 Daily reward per 3 finished matches instead of per day.

### A15.21 Review resolution

Every point of both reviews, with its verdict. "Accepted" means applied as written; "Changed" means applied in a modified form, with the reason given.

#### Player-ethics review (PE)

| Point | Verdict | Where, and why |
|---|---|---|
| 0.1, 1.1 False "nothing is lost" copy | Accepted | A15.3 copy; banks enlarged so more of it is true (A15.4) |
| 0.2, 2.1 Daily Capsule is a login reward | Accepted | Supply Capsule for everyone; its bank is 7, not 3, to meet the 7-day rule (A15.4) |
| 0.3, 2.2 Seasons time box | Accepted as a constraint | Offline Seasons are dropped; online Seasons must carry over (A15.17) |
| 0.4, 2.3 War Chest weekly gate and 45 cap | Accepted | No gate, no cap; 20 wins per chest to hold the economy (A15.5) |
| 0.5, 1.3 "Once a week earns the same as daily" | Accepted | Never claimed to players; measured by `sim:economy` as within 15% (A15.4, A15.20) |
| 0.6, 4.1 Counter overload and cross-feeds | Accepted | A15.13 and the meter test (A15.1) |
| 0.7, 4.2 Farmable win counts | Accepted | Counting wins (A15.5); Heat counts only new bests |
| 0.8 The years engine is cosmetic polish | Accepted | Amber star levels and usage Mastery cut; Heat, codes and Gauntlet ranked first |
| 0.9 Expedition is Minesweeper without mines | Accepted, merged with BS | Per-save placement on numbered maps, 16 tiles, find the Gilded (A15.17) |
| 0.10, 4.6 Scope against capacity | Accepted | A 12-item v1 slice; everything after v1 is an unfunded ranked list (A15.19) |
| 1.2 Wrap card countdown and open loops | Accepted | One forward line with no number or clock; once per session (A15.6) |
| 1.4 "Tier ???" | Accepted, dropped entirely | Bot tier is always shown (A15.1 rule 4) |
| 1.5 Echo copy | Accepted | "an AI playing Chief-4821's War Plan" (A15.3, A15.15) |
| 1.6 Night note copy | Accepted | New copy, and Home as the primary button; no setting (A15.6) |
| 1.7 "No pauses" marker | Accepted | Not in the line (A15.7) |
| 2.4 Charges bank 28, drop the rest bonus | Accepted | A15.4 |
| 2.5 Safe defaults for everyone | Accepted | Break reminder on, vibration off, no names, no reel; compliance switches are design text only (A15.20) |
| 2.6 Cut the reel code | Accepted | A15.3 |
| 2.7 Quick reveal toggle | Accepted | A15.6 |
| 2.8 Sightings | Accepted: cut | The deterministic rebuild is not planned: it needs creature art and a new view channel for a small gain |
| 2.9 GitHub community board | Accepted: no | A15.22 |
| 2.10 WebRTC duels before the server | Accepted: red line | A15.22 |
| 2.11 Resume abandon and expiry | Accepted | The void rule applies in v1 already (A15.6) |
| 2.12 Parental controls | Changed | The page is in v1; a daily time limit is deferred, because it needs saved play time and enforcement |
| 2.13 Rest bonus | Accepted: cut | Welcome card with no reward (A15.16) |
| 2.14 Loss-chasing | Accepted | Tilt card (A15.6) |
| 2.15 Seasonal skins craftable | Accepted as a rule | For online seasons; v1 has no seasonal cosmetics (A15.17) |
| 3 Heat Pact menu | Changed | Only conditions that need no sim change (A15.14); bot-side rule changes and in-sim handicaps would change the sim (BS EL-15) |
| 3 Daily stacked modifiers; only today on Home | Accepted | Pairs in v1.1 (A15.16); a reward bank makes an "Earlier days" button unnecessary (A15.7) |
| 3 Obscure feats | Accepted | Stone Cold and Old Guard (A15.10) |
| 3 Clutch Puzzles solvable by humans, stable ids | Accepted as constraints | A15.17 |
| 3 Draft War permanent | Accepted | A15.17 |
| 3 Seed race as the core of codes | Accepted | A15.15 |
| 3 Peak tier first, current tier second | Changed | Peak tier accepted; the current tier is not shown, because it would be a second moving rank next to trophies (BS 2.5) |
| 3 Teaching loss lines | Accepted as stretch | From the A8 detectors (A15.12) |
| 3 Keep EL-26, EL-9, EL-29, EL-30 | Changed | Save image joins Clip Mode (v1.1); lane identity later; year recap later, because it needs yearly aggregates and old replays |
| 3 Stars as achievements; Amber to Dust | Accepted | A15.11, A15.14 |
| 3 Mastery as card challenges | Accepted, merged into stars | A15.14 |
| 3 Codex as a background number; tiers on achievements | Accepted | A15.14; Home base milestones (A15.16) |
| 3 Growing camp and trophy wall | Changed | The camp uses the existing base visuals instead of 6 new drawings (BS EL-16); shelf plaques open replays once pins exist (A15.16) |
| 3 Calendar as generated combinations | Accepted | No calendar; seeds and pairs (A15.16) |
| 3 Guests and playstyle are low priority | Accepted | Guests later (A15.17); playstyle cut (A15.22) |
| 4.3 New systems pay Dust | Accepted | Engagement rule 8 |
| 4.4 Backlog debt | Accepted | A15.13 |
| 4.5 "14 days without something new to play" gate | Accepted as a report | A15.20 |
| 5.1 Roguelite run mode | Accepted | Gauntlet, v1.2-1; boons without sim changes (A15.17) |
| 5.2 Custom challenge codes | Accepted | A15.15 |
| 5.3 Nemesis-lite | Accepted | Rival, with no bounty (A15.15) |
| 5.4 "While you were away" card | Accepted | Welcome card (A15.16) |
| 5.5 Teaching loss lines and tilt card | Accepted | A15.12, A15.6 |
| 5.6 More skins with each age wave | Accepted | A content rule for D1 age waves |
| 5.7 Weekly plan constraints | Changed | As a Pact condition and Skirmish presets (A15.14, A15.16), not a weekly slot |
| 5.8 Parent page | Accepted | A15.6 |
| 6 v1 must-do list and answers to the open questions | Accepted | A15.19 items 1-10; the reel is removed; safe defaults for all; no community board; v1.2 headline is Gauntlet, then the redesigned Expedition |

#### Builder-scope review (BS)

| Point | Verdict | Where, and why |
|---|---|---|
| Keep the reframe, the red lines and the honesty pack | Accepted | A15.1, A15.3 |
| 1 Facts (Phase 1 running, frozen contracts, existing slots) | Accepted | Used throughout A15.18 |
| 2.1 v1 as a finished game; the rest a wishlist | Accepted | Funding note; A15.19 |
| 2.2 Every v1 item in Phase 2b | Accepted | A15.19 |
| 2.3 Realistic sizes | Accepted | A15.19 size scale |
| 2.4 Contract table undercounts | Accepted | A15.18 is the complete list |
| 2.5 Duplicated tracks | Accepted | The War Chest is the only offline win-count track; stars absorb Mastery; one moving rank |
| 2.6 Screen and widget budget | Accepted | A15.13 |
| 2.7 Finished once over fed forever | Accepted | Engagement rule 9; no calendar |
| 2.8 No hooks for unbuilt systems | Accepted | No stubs; compliance switches are design text only |
| 2.9 Copy that breaks Pillar 4 | Accepted, merged with PE wording | A15.3 |
| 2.10 No new gated targets | Accepted | A15.8, A15.20 |
| EL-1 with EL-6 folded in | Changed | Plus tilt and break cards and the night line (PE 2.14, 2.5) |
| EL-2 | Accepted | A15.3 |
| EL-3 lite | Changed | Bank of 7 instead of 3, to meet the 7-day rule (A15.7) |
| EL-4 on the weekly slot with a 45 cap and weekly gate | Changed | The slot is used; cap and gate rejected as a calendar penalty (PE 2.3) |
| EL-5 as data; no A2.14 target; slower climb below 400 | Accepted | Rewards by format apply only from 400 trophies (A15.8) |
| EL-6 drop the settings and play-time stats | Changed | Two optional booleans kept (break reminder, quick reveal): the KIDS Act time tools as reported and the parents page need a switch. No play-time stat |
| EL-7 lite | Accepted | A15.9 |
| EL-8 optional, fixed thresholds | Accepted | A15.12 |
| EL-9 with Clip Mode | Accepted | v1.1 (A15.16) |
| EL-10 tracker, trimmed vocabulary, hint button, contract items | Accepted | A15.10 |
| EL-11 deferred | Accepted | The void rule meanwhile (A15.6) |
| EL-12 Amber star levels with a usage threshold; foil crafting; compass cut | Changed | Foil crafting and the compass cut accepted; stars become challenges (PE) and Amber converts to Dust (A15.11, A15.14) |
| EL-13 existing sources only | Accepted | A15.14 |
| EL-14 cut and merged into stars | Changed | Merged without the usage threshold, which is farmable and pushes play with disliked cards |
| EL-15 light, handicaps cut permanently | Changed | Sim handicaps stay cut; player constraints are checked at match end instead (A15.14) |
| EL-16 base by Codex tier plus trophy shelf | Changed | The base grows by achievements, not Codex (PE) (A15.16) |
| EL-17 cut as a system | Accepted | A15.16 |
| EL-18 deferred to online | Accepted | With PE's carry-over rules (A15.17) |
| EL-19 later, 4 guests, no "Tier ???" | Accepted | A15.17 |
| EL-20 later; Blitz and Mirror as Skirmish presets | Accepted | A15.16; Draft War permanent in v1.2 (A15.17) |
| EL-21 cut | Accepted | A15.22 |
| EL-22 folded into the Collection | Accepted | Age sets (A15.16) |
| EL-23 sequential maps, no guardians, procedural relics | Accepted, merged with PE | A15.17 |
| EL-24 cut | Accepted | A15.22 |
| EL-25 cut until start-at-tick exists | Accepted | A15.17 |
| EL-26 deferred | Accepted | A15.17 |
| EL-27 cut | Accepted | A15.22 |
| EL-28 lite | Changed | Plus PE's seed race and custom challenges (A15.15) |
| EL-29 per D1, pinned replays keep a rules copy | Accepted | A15.18 |
| EL-30 cut or much later | Accepted: later | Not in the ranked list |
| EL-31 cut as a separate profile | Accepted | A15.6, A15.20 |
| Section 13 horizon report and tests | Accepted | A15.20 |
| 4 v1 slice and WP split | Changed | Plus the Supply Capsule, bigger banks, the ungated War Chest, cards and parents page (PE) |
| 5 v1.1 order | Changed | Danish first as advised; Heat before stars, because ★3 needs Heat |
| 6.2 Amendment list | Changed | Plus the `Settings` item (A15.18) |
| 7 How to land it | Accepted | A15.19 |
| 8 Owner decisions | Answered | Confirmed by the owner on 2026-09-28: the reel is not built; safe defaults for all; the v1 slice in A15.19 |

### A15.22 Rejected mechanics

| Mechanic | From | Why rejected | Instead |
|---|---|---|---|
| Login streaks, streak flames, a stamp for the first win of each day | `market-portals.md` hook, E2 | Rewards regular logins and punishes breaks; PEGI 12, the Jutland Declaration, the KIDS Act as reported; linked to stress in teens | War Chest, 7-day banks |
| A capsule for opening the game each day | A6.3 Daily Capsule | A login reward with a random result | Supply Capsule (A15.4) |
| Rest bonus after 48 h away | EL-21, E3, Psy-H | Rewards an every-other-day pattern; worth about 30-60 Amber | Welcome card with no reward |
| War Chest with a weekly open and a 45-win cap | EL-4 | A calendar gate that silently drops wins | Ungated War Chest (A15.5) |
| Monthly Seasons before online | EL-18, E8, Psy-D | Unreached rewards lost at month end; duplicates the War Chest; the largest clock-tamper payoff | War Chest; online Seasons with carry-over |
| Banning the player's most-used cards | E8 | Takes away the player's identity | Pact conditions the player chooses |
| Wardrobe reel, including as an opt-in | Former A10.1, open question 1 | Case-opening look; Poki rejects it; the Danish loot-box debate | Card flip |
| Star levels as a 935,000 Amber sink | EL-12 | A counter of time served | Card stars as challenges; Amber to Dust |
| Card Mastery by usage points | EL-14, E6 | Farmable; pushes players to use cards they dislike in ranked play | Card stars |
| Holo compass | EL-12 | Changes the exact roll (A6.4 step 5) and adds a pity counter | Foil crafting |
| Rift Sightings | EL-24, Psy-J | A variable reward in battle with no agency | Feats, Expedition |
| Live skill-tier chip, rank decay, bottom-of-board displays | EL-7, law 4.1 (item C7) | A second moving rank; rank anxiety; shaming | Peak tier that never falls |
| "Tier ???" opponents | EL-19, E9 | Hides difficulty (Pillar 4) | Tiers always shown |
| AI Rival League imitating a population | E18 | Fake social proof | Conquest ladder, Rival |
| 2× foil-odds weekends | E11 | A time-limited odds boost | Fixed odds, crafting |
| Time-of-day relic windows; 7-day expiring map tiles | E12 | Appointments, night play, expiry | Numbered maps with no calendar |
| One shared weekly map with an archive and "Unfinished (n)" | EL-23 | Solved online within hours; a weekly gate; a backlog | Per-save placement (A15.17) |
| A curated 24-month calendar | EL-17, N7 | Authoring nobody is funded to do; year 2 repeats year 1 | Seeded combinations |
| Player handicaps inside the sim | EL-15 (v1.2) | Changes the sim, `SIM_VERSION` and `contentHash`; untested balance states | End-of-match Pact checks |
| Playstyle mirror | EL-27, N8 | Six new sim stats for one label | none |
| "No pauses" in the result line | EL-3 | Shames the pause a child needs | A plain line |
| "Nothing is lost while you're away", "Everything waits for you", "Your rewards will wait until tomorrow" | EL-2, EL-1, EL-6 | False or misleading once banks are full | A15.3 copy |
| A separate minor-safe mode | EL-31, Psy-K | Implies the default is unsafe; two economies to validate | Safe values for everyone |
| Community Daily board on GitHub | N15 | Makes the owner a GDPR controller; players 13+ only; moderation; conflicts with a Poki-exclusive deal | Copy line; online boards later |
| WebRTC friend duels before the server | N14 | Codes carry IP addresses; STUN is a third-party data flow; posted codes let strangers reach children | Friend duels online |
| Nemesis bounty (+100 Amber) | E10 | Pays Amber and turns revenge into a chore | Rival with no bounty |
| Rewards for sharing; "your code was used n times" | E4, E5 variants | Rewards for social actions (the TikTok Lite precedent) | Sharing pays nothing |
| Push, browser or e-mail notifications, including after PWA install | several | Red line 4 | Home shows what is ready |
| Autoplay, auto-queue, endless chains | TikTok pattern | Red line 5 | Buttons, cards, finite runs |
| Real location or GPS | Pokémon GO | Minors' data and physical safety | Seeds and numbered maps |
| Trading, gifting, anything for sale | Clash of Clans, Hay Day economies | Red lines 1-2 | Earn-only |
| Countdown offers, "last chance", guilt copy | general | Red line 12 | Neutral copy, Phase 3 review |

## A16. Strategic depth, variety and long-term play

**Status.** Written 2026-09-28 as an addendum and merged here the same day, together with the edits to other sections listed in A16.24. The owner's decisions are applied (A16.26): the new top rarity tier is Ascended forms, prestige variants of Legendaries with no extra power; the home village comes in v1.1; online ranked shows both trophies and a visible rating. The v1 items in A16.2-A16.7 and the wall prototype in A16.14 bind Phases 2a, 2b and 3.

**What it answers.** The owner's seven directions of 2026-09-27: (1) battle variety, (2) a much larger card pool with a deeper rarity ladder, (3) strategic depth instead of spam-clicking, (4) lane fortifications, (5) lanes, (6) social play, (7) a home village. Across all of them: the game must look beautiful and be well animated.

**Sources.**

- `docs/research/depth-audit.md`: about 12,000 headless matches in the real sim (sections and proposals P1-P10 are cited as "audit 2.3", "audit P6").
- `docs/research/depth-benchmarks.md` ("benchmarks") and `docs/research/depth-architecture.md` ("architecture", foundations F1-F5).
- `art/blender/SPIKE_REPORT.md`: cost and size of the 3D sprite art tier.
- The proposal `docs/design-history/depth-proposal.md` (systems DP-1 to DP-36, kept as history).
- Two reviews of it: "strategy-veteran" (SV, points C1-C12) and "builder-scope" (BS, sections 1-6). Every point is resolved in A16.27.
- The binding frame is A15: engagement rules 1-10, the classes, the five tests, red lines 1-13 and the counter budget (A15.13). A16 references A15 and does not repeat it.

**Funding.** A15's funding note applies unchanged. Only v1 is funded, and the cloud credit ends 2026-11-05. The v1 part of A16 is small on purpose: bot fixes, measurements, a sandbox prototype and a few strings (A16.24). Everything marked v1.1, v1.2 or online is a ranked wishlist, not a promise to players or to the owner.

**Sizes.** A15.19's scale, plus **XL**: needs a server, or a new dimension in the sim.

**Phases.** v1 Phase 2a, 2b and 3 (C3; Phase 3 changes numbers only). v1.1 and v1.2 (A15.19 wishlist). Online (the D1 server milestone). Later.

**Reading guide.** Builders of v1 need only A16.1-A16.7, the prototype part of A16.14, A16.23-A16.25 and the A2.14 rows in A16.5. Later subsections are wishlist cards in the style of A15.14-A15.17.

### A16.1 Principles and budgets

**Goal: skill beats spam, luck and levels.** Winning should come from reading the lane, committing to a plan and timing it, not from tapping faster, rolling better capsules or grinding levels. This is the owner's "like why online chess became popular".

**The five decision tests.** A decision is meaningful only when all five hold (benchmarks section 1). They are separate from A15's five engagement tests.

1. **Trade-off:** every option costs something, and none is best in every state.
2. **Information:** the player sees enough to act before committing.
3. **Counterplay:** the opponent sees the choice and can respond.
4. **Attribution:** afterwards the player can trace the result to the choice.
5. **State-dependence:** no rule of thumb ("always X") solves it.

**The core loop to protect.** The audit found one deep decision already in the rules: bank gold, then send a wave (audit 2.5). Around it sit the answers: a full power ring punishes a wave, baiting drains the ring, turrets punish walking in, and the clock ends the match. Every A16 system must feed this loop or stay out of its way.

**Depth from commitment, not reaction.** With a full tray, a visible lane and instant switching, in-match counter-picking is solved by a script (audit finding 6). New depth therefore comes from choices that commit: the War Plan, the preset picked after the battlefield is revealed, doctrines, and fortifications that take time to build.

**Complexity budget.**

- The tray keeps 5 unit cards. No sixth slot (A16.19).
- **The v1 battle HUD is the ceiling.** A later release may add at most one always-visible control, the Fort button (A16.14), and only by freeing room: the Army counter becomes a badge on the stance flag. Doctrine picks reuse the Evolve button. Repeat order is a gesture on a card (A16.21). Anything else must replace a control, not add one.
- Pillar 1 ("familiar in 10 seconds") still holds: the first 20 matches of a save use a flat battlefield with no weather and no doctrines.

**Stacking budget** (SV C3). One level (+5% HP and damage) swings about 20 points of win rate (audit 2.7), so modifiers must not stack unchecked.

- All rule-mod sources that apply to one side or one zone (battlefield features, doctrines, and later commanders or bosses) **add** in bp on the same stat of the same unit and **clamp at ±2,000 bp (±20%)**. Range clamps at +1,500 bp.
- **No range bonus inside your own turret cover.** A unit whose p ≤ 480 gets no positive range mod from any source, so nobody out-ranges the enemy from safety.
- Symmetric match-wide sources (Daily modifiers, weather) are exempt from the clamp: they change the match for both sides, not the matchup. They still add into the same sum.

**Gate the combinations, not only the axes.** Each axis gets its own gates, and a combination sweep plus an exploit search look for stacks and strategies that no single gate sees (A16.8).

**Resist tuning to the test** (SV C6). Rules-only rows (scripts against scripts, no bot) sit next to every bot row, spam proxies run as families with a mixing parameter, and bot tiers are never made weaker to widen a gap.

**Everything visible, everything mirrored.** Battlefields, weather schedules, doctrine offers and fortifications are shown before they matter and are the same for both sides. Nothing in the lane is hidden (A7.1: bots see what humans see).

**Reuse before new systems.**

| Need | Reuse |
|---|---|
| Rule changes per side, zone or time | One rule-mods engine (A16.8) for battlefields, weather, doctrines and bosses |
| New card behaviour | The keyword engine (F2, A16.17) for forts, tunnelers, detectors and boss phases |
| Goals and star conditions | A15.10 feat predicate kinds (puzzles, bosses) |
| A friend fighting your plan | A15.15 codes and "AI · Echo of ..." (Echo challenges, clan raids) |
| A village "trickle" | The A15.4 Supply allowance |
| Currencies | Dust and cosmetics only (A15 rule 8). **A16 adds no currency** |
| One tracker per time scale | Puzzles, Review and modes add no Home widget or Result step (A15.13) |

**Beauty budget.** The owner cares most that the game looks beautiful and moves well. Art money goes where players look most often:

1. **The evolve moment.** Protect it. A doctrine pick never interrupts the Ascension show.
2. **Battlefields and weather,** seen in every match (A16.9).
3. **The village Home,** seen every session (A16.22).
4. **Ascended walkouts and the Holo shimmer:** the rarity thrill (A16.18).
5. **One readable effect per keyword,** reused by every card (A16.17).

One decision sets the cost of every future card: stay on procedural puppets, or move units to the 3D sprite tier (spike report: about 1-2 agent hours and 70-300 KB per unit, plus about one WP for the in-game sprite renderer). The owner answers it at the fun gate (A16.25, task 5).

### A16.2 What the audit found, and the rule decisions (v1)

**Where optimal play is "spend as soon as possible" or "click fastest"** (audit 3):

| Rule | Optimal play today | Depth verdict | A16 decision |
|---|---|---|---|
| A2.3 Gold banks with no cap | Bank 300-800 gold, then release a wave. Trickling loses by 21-48 points | Real, and invisible | Teach it (A16.6) |
| A2.3 Treasury | Buy 1-2 levels early | Real, low stakes | Keep |
| A2.3 Kill bounty 60% | Punishes feeding; also funds a defender's replacements | The dial between spam and stalls | Keep 60% (45%: spam wins 88-92%; 75%: Full War Bells 8% → 21%) |
| A2.4 Evolve | Always at once | Dominated | Keep evolving fast (Pillar 2). Add a choice of *what* later (A16.10) |
| A2.7 Queue of 5 | Never binds; gold is the only brake | Neutral | No queue cap |
| A2.7 Two-wide front | Only 2 melee units per side ever fight (see `docs/requests/wp2-third-rank-reach.md`) | A main stall cause | Measured and fixed in A16.4 |
| A2.7 Stance | Bots toggle about 12 times per Full War; Hold feeds stalls | Clicking more than deciding | Keep as is. No movable hold line |
| A2.8 Turrets | Worth something only against an attacker that walks in | Fine as area denial | Turret share of kills becomes report-only (A16.5) |
| A2.9 Age Power | Fire at the first modest clump; a full ring wastes charge | Shallow "when" | Overflow experiment in v1.1 (A16.11) |
| A2.10 Clock | 22-33% of Short Wars end at the Bell | Open problem | A16.4 |
| A2.12 Controls | Spend promptly; no micro | Not click speed; a mild attention tax (1 s vs 3 s decisions: 13% vs 3%) | Repeat order for online PvP (A16.21) |
| A3 Tray | Counter-pick what you see | Solved by a script | Commitment lives in the War Plan and the preset pick |
| A5 Content | Legendaries beat their own counters; Balloon Admiral and EMP Saboteur lack answers | Numbers | Phase 3 tuning (A16.4) |
| A6.8 Levels | +1 level ≈ +20 points; the tier VII vs V gap is about 10 | Levels beat skill | Standard levels where skill is measured (A16.7) |
| A7 AI | Loses to cheap spam 54-60% and to Heavy spam 98%; freezes before evolving under pressure | Two bugs | A16.3 |

**Anti-spam tools we do not add.** Recorded in `docs/decisions.md` by the lead.

| Tool | Evidence | Verdict |
|---|---|---|
| Queue cap below 5 | Passive gold pays for one Infantry every 8.3 s; the queue never binds | Not needed |
| Per-card recharge on units | V3: the counter-picker against spam fell from 100% to 58%, with 83% of matches at the Bell | Rejected. Recharges only on fortifications (A16.14) |
| Evolve price | V2, V2b: spam 83-92%, more stalls | Rejected |
| Longer Ascension | V9: Short War Bells 50% | Rejected |
| Bounty 45% or 75% | V8, V11 | Keep 60% |
| Less loss XP, stronger splash, Overcharge changes, territory decay | No useful effect | Rejected |
| Direct unit control | Rewards click speed (Stick War) | Rejected |

### A16.3 The bot answers spam and evolves on time (v1)

| | |
|---|---|
| Class | Healthy: fairness is the only tuning target (A15 rule 10) |
| Decisions | Blind spam stops paying; the player must read the lane and trade |
| Counterplay | Same rules for both sides; tier-scaled human mistakes stay (A7.2) |
| Architecture | `src/ai` only (`brain.ts`, `scoring.ts`). No contract change. Rule 2 is an A7.3 spec-conformance bug; the rest amend A7.2 |
| Size, phase, owners | S · a request to WP3 now, so it lands in the Phase 1 integration pass and the owner's Checkpoint A test is against an honest bot · WP3 · `docs/requests/wp3-depth-answers.md` |
| From | DP-1; audit P1; SV C1, C6; BS 1, 2 |

**Rules** (A7.2 and A7.3 amendments):

1. **Save for a counter.** When the best counter score over the whole tray, ignoring gold, beats the best affordable card by at least 0.15, the bot sets a saving goal for that card's cost, reusing the Legendary saving-goal code. The goal lapses after 8 s, or when an enemy unit comes within 300 lu of the bot's gate. For this, `trainCandidates` scores every tray card; an unaffordable card can only set a goal, never be trained. Today it skips `gold < cost`, so a bot with a 120-gold float answers Infantry with Infantry and never reaches a 150-gold Heavy.
2. **Evolve on time.** The safe-window check applies only from tier VII and is capped at 2 s (tier X: 0.5 s), as A7.3 says. Below tier VII the evolve-delay column applies as written. Today the check has no timeout at any tier, so constant pressure at the gate froze the bot in the Stone Age until 2:00.
3. **Answer one-type armies, smoothly.** Let s be the largest role-group share of visible enemy army value. The counter weight is multiplied by 1 + 2.5 × max(0, s − 0.4), capped at 2 (×1 at 40%, ×1.5 at 60%, ×2 at 80%). The diversity term and the gold float target shrink by the same factor. There is no threshold cliff for a spammer to sit just under.
4. **No Legendary saving goal while the push gate fails.** The bots' mutual banking adds most of the Legendary-plan stalls (audit 3.7).
5. **Not adopted:** "build turrets toward the tier's maximum". The audit found 0 turrets did best (25%) and that turrets plus the push gate cause stalls. The turret share of kills becomes report-only (A16.5).

**Measured** on a scratch copy of the bot with rules 1 and 2 (audit 2.3), against tier VII:

| Proxy | Before | After |
|---|---|---|
| Cheapest-unit spam | 54-60% | 0-3% |
| Random spam | 28-30% | 11-13% |
| Heavy spam | 98% | 35% |

Rule 3 targets the remaining Heavy spam. **Acceptance:** the `sim:exploits` smoke run (A16.5 rows) and WP3's existing 400-match tier-ordering test.

**Later (v1.1, AI only):** from tier VIII the bot plays the wave game. It banks to a wave threshold (400 gold at VIII, 600 at X) while no enemy is within 480 lu of its gate, then releases; it holds its power while the enemy ring is at 80% or more and a wave is coming. The ceiling is in the rules (Save-and-counter wins 96% in the scripted round robin, audit 2.4); a top-tier bot must reach toward it, or experts farm it.

### A16.4 Stalemates (v1)

| | |
|---|---|
| Class | Healthy |
| Decisions | Defending forever stops being safe; late pushes and power timing decide matches instead of the Bell |
| Counterplay | Every lever is symmetric |
| Size, phase, owners | S to measure; S per adopted sim change · Phase 2b (measure and adopt), Phase 3 (numbers) · WP12 (harness), WP2 (sim branches), WP3, lead · `docs/requests/wp2-depth-sim.md`, `wp12-depth-proxies.md` |
| From | DP-3; audit 3.7, P6; SV C1; BS 2 |

**Why matches stall** (audit 3.7). At equal strength a defensive line beats an attack, and no clock rule changed that:

- the two-wide front caps melee damage, so a bigger army adds HP but not damage;
- ranged units behind a Heavy front shoot over it;
- each side replaces its losses from the 60% bounty;
- turrets cover only 480 lu and never reach a mid-lane front, and bots refuse to attack into them.

Measured Bell rates with the fixed bot: tier VII mirror 28% Short / 8% Full; with a Legendary in each plan 55% / 83%; Heavy plus Ranged scripted mirror 100%; turtle 95% / 55% of its matches. Once players learn waves, the expert meta is Save-and-counter against a defence, which reached the Bell in 63-68% of Short Wars against tier VII.

**The evidence is thin, so v1 measures before it builds.** Only lower unit HP for the whole match (`glass_armies`, ×0.7) moved the Bell rate (baseline Short 28% → 8%, turtle 95% → 46%), and even it made Legendary plans worse (55/83% → 67/96%). Siege-only lethality was never simulated.

**Step 1: measure (Phase 2b, first week; CPU, not credit).** WP12 adds `--patch <file>` to `sim:balance` and `sim:exploits` (a content override for `playJob`) and two harness hooks. The lead runs each lever on seven rows, Short and Full War, 200 matches per row, 400 for the finalists:

- rows: tier VII mirror (baseline plan), tier VII mirror (a Legendary in each plan), Save-and-counter mirror, Save-and-counter vs Turtle, Heavy plus Ranged mirror, Turtle vs tier VII, cheapest spam vs tier VII.

| # | Lever | How it is measured | Kind if adopted |
|---|---|---|---|
| L1 | Whole-match unit HP ×0.85 and ×0.75 | Content patch | Numbers (Phase 3) |
| L2 | Short War clock: Overdrive 3:00, Siege 3:45, Final Bell 5:00 (from 3:30 / 4:30 / 6:00) | Content patch | Numbers (Phase 3) |
| L3 | Melee closes to contact (option B of `wp2-third-rank-reach.md`), so the third rank really fights | WP2 branch | Sim rule (A2.7) |
| L4 | Three-wide front | WP2 branch | Sim rule (A2.7) |
| L5 | Siege lethality: all units take +40% damage in Siege | Harness hook | Sim field `EconomyRules.siege.unitDamageTakenBp?` |
| L6 | "The rope" as the Bell tie-breaker: in Siege the side losing the contact point loses 1% base HP per second instead of the symmetric decay | Harness hook | Sim rule (A2.10) |
| L7 | Bot drops its Legendary saving goal while the push gate fails | In WP3's request (A16.3 rule 4) | AI |

**Step 2: adopt by a fixed rule.** Rank lever combinations by the mean Bell share over the five stall rows. Adopt the best combination that keeps all of these:

- cheapest spam ≤ 20%;
- the turtle wins 35-45%;
- first-mover 47-53%;
- Full War median between 6:00 and 8:00;
- L1 only if the owner found faster deaths "better" or "the same" at the fun gate (A16.25, task 3).

At most two sim changes (from L3-L6) join the Phase 2b sim batch, with one `SIM_VERSION` major bump and re-recorded goldens for both. If L3 is not adopted, A2.7's "third position" sentences are deleted, as option A of the WP2 request says. Content levers go to Phase 3. `overdrive.unitDamageTakenBp` is not built.

**Step 3: numbers (Phase 3).**

- The adopted HP scale and the Short War clock. If the clock changes, A2.14's Short War median becomes 4:00 ± 0:20 and A15.8's Short War trophy row is re-derived from the new median (trophies per minute within ±5% across formats).
- Legendary tuning: each Legendary's age must contain a counter that beats it at equal gold at least 55%. Today Mammoth Matriarch beats Spear Hunter 76%, Ursa Paladin beats Pikeman 73%, Behemoth Tank beats Bazooka Trooper 90%.
- Balloon Admiral gets a unit answer in Gunpowder; EMP Saboteur beats the mechs it should counter.
- Kill bounty stays 60%.

**Targets:** A16.5.

### A16.5 A2.14 targets and exploit proxies (v1)

| | |
|---|---|
| Class | Healthy |
| Architecture | Extends the existing `tools/exploits.ts` and `tools/proxies.ts` (8 proxies, Full War only today). New proxies, a rules-sanity runner, Short War in the smoke run, `--patch`, and new `EXPLOIT_TARGETS` |
| Size, phase, owners | S · Phase 2b (tools), Phase 3 (gates) · WP12, lead (A2.14 and B12 text) · `docs/requests/wp12-depth-proxies.md` |
| From | DP-2; audit 5; SV C1, C6; BS 1, 2 |

**Proxy rules.** Every proxy reads only the delayed `Observation`, decides every **0.5 s** (as built; the audit used 0.25 s, so its numbers are re-baselined), casts Last Stand when armed, never sells turrets and draws from a seeded RNG. Exploit rows run against the tier VII Balanced bot at L7, in Short and Full War, with at least 400 matches per proxy. Rules-sanity rows run scripts against scripts with no bot.

**New proxies:**

- **Random spam:** a uniformly random affordable tray unit, no turrets, no Treasury, evolves at once, power on auto-aim when full.
- **Mono family** (Heavy, AA, Ranged): a mixing parameter m of 0, 20, 40, 60, 80 and 100% of that role group, the rest random. The gate applies to the worst m.
- **Bait-and-switch:** 60% Heavy until the bot's visible AA share reaches 30%, then Infantry only.
- **Save-and-counter:** counter-picks, banks to 300 gold and then spends it all; 2 turrets, Treasury 1, power when the zone holds 350 gold or more, evolves in a safe window of at most 2 s, smart Last Stand.
- **Counter-picker** and **Balanced script** (rules sanity).

**A2.14 rows** (replace the exploit rows and add the rest):

| Metric | Old target | v1 gate | Later |
|---|---|---|---|
| Cheapest-unit spam | ≤ 55% | **≤ 20%** | same |
| Random spam | none | **≤ 15%** | same |
| Mono family, worst m, each group | none | ≤ 35% | ≤ 25% from v1.1 |
| Bait-and-switch | none | ≤ 35% | ≤ 25% from v1.1 |
| 4-turret turtle with Hold | 35-45% | 35-45% **and ≤ 50% of its matches at the Bell** | Bell ≤ 15% from v1.1 |
| Heavy plus mass Ranged | ≤ 55% | ≤ 55%; its mirror's Bell reported | mirror Bell ≤ 20% from v1.1 |
| Other B12 proxies | ≤ 55% | ≤ 55% (unchanged) | same |
| Save-and-counter mirror, Bell share | none | reported | ≤ 20% from v1.1 |
| Save-and-counter vs Turtle, Bell share | none | reported | ≤ 20% from v1.1 |
| Final Bell, tier VII mirror, baseline plan | < 3% | **≤ 10% Short, ≤ 5% Full** | < 5% Short, < 3% Full from v1.1 |
| Final Bell, tier VII mirror, a Legendary in each plan | none | reported | ≤ 15% Short, ≤ 10% Full from v1.1 |
| Rules sanity: counter-picker vs each mono spam | none | ≥ 80% | same |
| Rules sanity: triangle, mono vs mono (Heavy > Infantry, AA > Heavy, Infantry > AA) | none | each ≥ 70% | same |
| Rules sanity: skill gradient (Save-and-counter vs Balanced script; Balanced script vs cheapest spam) | none | each ≥ 80% | same |
| Has-an-answer (static, `counters.json`): a same-age card scores ≥ 55% at equal gold | none | gated for every non-Legendary card; Legendaries reported | Legendaries gated from v1.1 |
| Has-a-starter-answer (static): every mechanic (air, burrowing, structure, shields) has a Common or starter-kit answer in its age | none | reported | gated from v1.2 |
| Per-card Final Bell delta | none | reported | ≤ 5 points from v1.2 |
| Turret share of kills | 20-35% | **reported only** | same |
| Bot tier gaps (VII vs V, X vs V, VII vs III) | none | reported | reported; the gated skill measure is the rules-only gradient |
| Attention gap (Balanced script at 1 s vs 3 s, each vs VII) | none | reported | ≤ 5 points once Repeat order exists |
| Level edge +1 | none | reported | never gated |
| First-mover advantage | 47-53% | unchanged | per battlefield from v1.1 |

**Release rule for the Bell rows.** The old Short War row (< 3%) fails today by 20-30 points and no numbers-only change is known to reach it. If Phase 3 cannot meet a v1 Bell gate after the A16.4 levers, the lead records the measured value in `docs/balance-log.md`, tells the owner in plain words, and the row becomes the first v1.1 task. Bell rows alone do not block the v1 release. Every other row does (C4).

### A16.6 Teaching the wave (v1)

| | |
|---|---|
| Class | Healthy (informative feedback, A15.12) |
| Decisions | Banking 300-800 gold, then releasing a wave, beats spending as you go by 21-48 points among scripts, and by 10% → 36% against tier VII. Nothing shows it today |
| Counterplay | Enemy gold stays hidden; reading a lull is the skill. A wave is met with a power, a Hold or turrets |
| AI | Mama Moss and Madame Tempest already bank, Hold, then Charge visibly (A7.4) |
| Size, phase, owners | XS · Phase 2b · WP11 (detector, hint), WP9 (Result line), WP1 (strings) · `docs/requests/wp11-depth-session.md` |
| From | DP-4; audit P4; BS 2 |

- **Detector "trickle":** in the last 30 s the player spawned at least 6 units, no two within 2 s of each other, while the enemy army value on the lane was at least 1.5 × the player's.
- **In-battle hint** (A8, onboarding matches only): "Save gold, then send them together."
- **Loss tip:** "Tip: units sent one by one fall one by one. Bank gold, then send a wave." This one tip ships even if A15.12 is cut: one line on the Result of a loss where the detector fired, inside A15.13's summary row.
- Review (A16.16) later names the same pattern as a key moment.

### A16.7 Fair measurement: standard levels, peak tier and ranked (v1 rule; online)

| | |
|---|---|
| Class | Healthy |
| Decisions | Protects every decision in A16 from being drowned by levels (+1 level ≈ +20 points) |
| AI | Bots play at the same standard levels in those modes (A7.1) |
| Architecture | `OpponentSpec.standardLevels?` (A15.18 item 3); clamp `SideConfig.levels` in `BattleSession` for ranked |
| Size, phase, owners | XS · v1 (text, peak-tier rule) · WP7; S · online · WP7, WP11 |
| From | DP-9; audit P10; SV C9 |

- **Standard L7 for both sides:** the Daily Challenge (A15.7), Echo and challenge codes (A15.15), puzzles, Random Armies, Boss Battles and Endless Horde.
- **Gauntlet and Draft War** set levels only through boons (A15.17).
- **Online ranked:** every card plays at exactly L8, whatever its level (A6.8 says "sets", not "caps").
- **The AI ladder and Conquest** keep A6.8 level matching; upgrades still matter there.
- **Peak tier at even levels** (v1, XS, amends A15.9): a win raises "Highest AI tier beaten" only when the player's average level over the format's ages is at most 1 above the opponent's. The Daily always counts (both sides L7). Offline, this is the one honest skill number, and it no longer measures grind. WP7, in `docs/requests/a15-wp7-rules.md`.

### A16.8 Rule-mods engine (F1-lite) and the balance tools (v1.1)

| | |
|---|---|
| Class | None (a foundation) |
| Architecture | `ModEffect` and `ModScope` in `contracts/content.ts`, with **only the kinds a shipping system uses**. `createCtx` compiles every active source into per-side integer tables plus at most 4 zones; a unit's zone result is cached per tick on its runtime record. Neutral values keep goldens unchanged (a minor bump). Timed mods are hashed only when non-empty. New gameplay tables join `compile.ts`'s `hashedSlice`, so two builds with different terrain never share a `contentHash` |
| Size, phase, owners | M · v1.1, with battlefields · WP0, WP2, WP1, WP12 |
| From | DP-11; architecture F1; SV C3; BS 1, 3 |

**Already done in v1.** The sim reads Daily modifier effects from compiled content (`src/sim/modifiers.ts`), with the sign normalised and a test that content and the frozen defaults agree. No v1 work remains here.

**v1.1 kinds** (for battlefields and weather): `moveSpeed`, `range`, `damageTaken` with an attacker-tag scope, `unitDamage` with an own-tag scope, `turretDamage`, `turretRange`, `frontWidth`. Scopes: side, own tags, attacker tags, zone. Doctrines, if adopted, add `vsTags` (damage against targets with a tag), `attackSpeed`, `baseDamage`, `popCap` and per-side `passiveGold` (A16.10).

**Zones** are written in each side's own progress p and mirrored: a zone "p 600-700" covers x 600-700 for the left side and x 500-600 for the right side, and it applies only to that side's units. This settles whose units a feature helps.

**Stacking budget:** as in A16.1 (±20% per stat, range +15%, no range bonus at p ≤ 480, symmetric match-wide sources exempt).

**Performance.** The phone step budget (B16) is re-measured on the 80-unit Full War sandbox with 4 zones and a weather front active.

**Balance tools (v1.1, WP12, S each; CPU on free Actions, not credit):**

- **`sim:combos`:** random full configurations (battlefield × weather schedule × Daily modifier × doctrine picks once they exist). It flags any configuration where a proxy moves by 10 points or more against the flat baseline.
- **`tools/exploitSearch.ts`:** a parameterised script family (composition weights, bank threshold, doctrine policy, fort use, power threshold), hill-climbed against tier VII. The exploit gates apply to the best configuration found, so degenerate strategies are found before players find them.
- **Plan-meta search** (from v1.2, when the pool grows): A16.17.

### A16.9 Battlefields and weather (APPROVED; v1.1)

| | |
|---|---|
| Class | Healthy: symmetric, visible, known before the match |
| Decisions | Which preset to bring, ranged against melee weight, when to push (a Fog window), where to fight (take the ridge, stage in your trench) |
| Counterplay | Features are mirrored or central; the whole weather schedule is public |
| AI | Reads `Observation.field` and `weather`. Small scoring terms: push into a Fog window (turtle personalities first), avoid buying range ≥ 250 in the 20 s before Fog, prefer splash on a Bridge. Re-passes WP3's tier-ordering test |
| Architecture | F1-lite zones and timed mods; `frontWidth` in movement (already present if L4 was adopted in v1); `MatchConfig.battlefield?`; `content/battlefields.ts` with the weather table (hashed); weather drawn from `xmur3(seed + ':weather')`; `ArtProvider.createBackdrop({ battlefield? })` and `BackdropView.setWeather?(id, intensity)`, both optional so every art adapter keeps compiling; weather effects through `createEffect('weather.<id>')` |
| Art | Per arena: feature props and ground decals, faint zone-edge markers. Four weather overlays (rain streaks, snow, a drifting fog band behind the units, wind streaks with bending grass and flags) and audio loops. Lite shows fewer particles. Art M |
| Size, phase, owners | M + art M · v1.1 · WP0, WP2, WP1, WP3, WP4, WP5, WP6, WP8, WP9, WP11, WP12 |
| From | DP-10, DP-12, DP-13; benchmarks idea 3; SV C5; BS 4 |

**Feature kinds.** At most one per battlefield. Home-half bonuses reward holding, so every feature is central or helps the side that advances.

| Feature | Zone | Effect | Why |
|---|---|---|---|
| Ridge (high ground) | Central, x 540-660 | Units with tag `ranged` whose centre is on it get range +10% | Contested: it helps whoever holds mid-lane |
| Trenches | Each side's approach, own p 600-700 (just outside the enemy turret cover, which starts at own p 720) | Your ground units in your trench take −20% damage from attackers with tag `ranged` | A staging area for a wave; only the side winning mid-lane can use it |
| Bridge | Central, x 560-640 | Front width 1 on the span: armies meet in single file, so splash and pierce shine | **Measured before any art:** its Bell rows must stay within +5 points of the flat field. If not, it becomes a **Causeway**: ground units on x 520-680 move +15%, which speeds pushes through the middle |
| Ford | Central, x 520-680 | Ground units inside move −25%; air is unaffected | Same measurement. If it fails, the feature is dropped and the arena gets a Ridge |

Features never change bases, turret rules, spawns, powers or Last Stand. The old "Cover" on each side's own half is not built.

**Weather.** A battlefield lists 0-4 kinds. When the list is not empty, a match draws its fronts from its seed: 0 fronts 30%, 1 front 50%, 2 fronts 20%. Each front lasts 40 s, starts on a 5 s grid between 1:00 and 40 s before Overdrive, and two fronts start at least 60 s apart.

| Weather | Effect |
|---|---|
| Rain | Units with tag `ranged` and turrets deal −15% damage; ground units move −10% |
| Fog | Units with tag `ranged` and turrets have −35% range: a public push window against turtles |
| Snow | Ground units move −20% |
| Gale | Air units move −30% |

- The full schedule is public: on the VS screen ("Fog 2:10-2:50") and as bands on the match-clock timeline next to the Overdrive and Siege ticks. The HUD weather chip lights up 10 s ahead, a rules telegraph like a power's.
- Weather never hides units and never touches powers, bases or Last Stand. There is no night.

**Per arena:**

| # | Arena | Feature | Weather kinds |
|---|---|---|---|
| 1 | Tar Pits | none (flat, for onboarding) | none |
| 2 | Frostfang Pass | Ford (snowdrift) | Snow |
| 3 | Kingsmoat | Bridge | Rain |
| 4 | Powder Bay | Ridge (sea cliffs) | Fog |
| 5 | Iron Front | Trenches | Rain, Fog |
| 6 | Neon Harbor | Bridge (drawbridge) | Rain, Gale |
| 7 | Orbital Ring | Ridge (docking pylons) | Gale, Fog |
| 8 | Chrono Rift | Ford (time eddy) | Rain, Snow, Fog, Gale |

**Which battlefield a match uses.**

- **Ladder:** drawn by seed, uniformly, from every arena unlocked so far, and shown on the VS screen. A player stays in one arena for weeks; a fixed map per arena would make the preset pick a lookup.
- The tutorial and the first 20 matches of a save: flat Tar Pits, no weather (Pillar 1).
- **Conquest:** each General's home field: Pip Quickstep flat; Captain Kettle Bridge; Mama Moss Trenches (garden hedges); Baroness Ledger Ford; Sgt. Boomsworth Ridge; Ada & Ivo Bridge with Rain; Rook flat; Madame Tempest Ridge with Fog and Gale; The Warden Ridge with every weather.
- **Daily:** drawn from the Daily seed. **Skirmish:** the player chooses.

**Reveal, then pick a preset.** The VS screen shows the battlefield, the weather schedule, the AI General (tier and AI badge) and any modifiers; the player then taps one of up to **5** presets (A3 has 3). The default is the last preset used in that format. New presets start empty; nothing is copied. No timer offline; online, a 15 s pick window applies the default (a match-flow limit, not a reward countdown).

**Gates** (per battlefield and per weather kind): first-mover 47-53%; every A16.5 Bell and exploit row; no weather kind moves a mono-family proxy by more than 10 points; `sim:combos` clean.

### A16.10 Evolve doctrines (owner decision; v1.1 or v1.2)

| | |
|---|---|
| Class | Healthy |
| Decisions | Evolve moves from *when* (dominated) to *what*. The offer is known one age ahead, so the pick shapes what you train; the side that evolves second sees the other's pick and can answer it |
| Counterplay | Identical offers for both sides; the active doctrine flies as a glyph banner on the base and joins the Scouted list |
| AI | A `choose` term: counter value against the enemy's scouted cards and doctrine, the weather ahead, and personality weights. Tiers 0-II pick by seeded chance, III-VI by the doctrine's `aiHint`, VII and up with full scoring. Re-passes the tier-ordering test |
| Architecture | `evolve` command + `pick?: 0 \| 1`; `Observation.me.doctrineOffer` and `foe.doctrine`; `SideState.doctrine`, hashed when set; `SimEvent` `doctrinePicked`; `HudModel` offer glyphs and banner; `content/doctrines.ts` (hashed); the F1 kinds listed in A16.8 |
| Art | 10 procedural glyphs; split halves on the Evolve button; a banner glyph; a pick sound. S |
| Size, phase, owners | M · after battlefields, **only if the owner says yes** at the fun gate (A16.25, task 5) and again after playing battlefields; otherwise v1.2 · WP0, WP2, WP1, WP3, WP5, WP6, WP8 |
| From | DP-14; audit P8; benchmarks idea 4; SV C4; BS 3, 4 |

**Rules.**

- **When.** From Arena 2, in every mode except the tutorial and the first 20 matches. Picks happen at 2 evolves per match: both evolves in Short War, the 1st and 3rd in Standard and Full War (about 2 pivots per match, as Battlegrounds trinkets show). "Every evolve" is a data switch the owner can turn on after playtests.
- **Offers.** 2 doctrines per pick, the same for both sides, drawn without replacement by `hash(seed, 'doctrine', ageIndex)`. **The next pick's offer is visible from the start of the current age** as two small glyphs beside the XP bar (long-press shows the rule), so the choice is made calmly, not at the fastest moment of the match.
- **Pick then evolve.** When Evolve is available at a pick moment, the button splits into two labelled halves; tapping one sends one `evolve { pick }` command that evolves and picks. Keyboard: E left, R right. There is no plain Evolve at a pick moment, so picking costs no extra tap. The Ascension show plays unchanged.
- **One doctrine at a time.** A new pick replaces the old at `ageUp`. Doctrines never change max HP, so every effect is read live and a swap is clean for units already on the lane.
- **Shape.** One bonus and one cost, each at most ±15% on one stat of one group, or a small economy trade. Costs are paid in gold, pop, damage or damage taken, never in train time (the queue never binds, so train time is a fake cost). No doctrine touches XP, the clock, bounty, turrets or Treasury.
- **Onboarding hint** (first pick only): "Choose how your new age fights."

**Pool of 10.** Most are worth more or less depending on what the enemy shows, the weather ahead or the phase:

| Doctrine | Bonus | Cost | Best when |
|---|---|---|---|
| Hunters | +12% damage vs `armored` | −8% damage vs `light` | The enemy fields Heavies and mechs |
| Skirmish Screen | +12% damage vs `light` | −8% damage vs `armored` | The enemy swarms |
| Flak Drill | Units and turrets +20% damage vs `air` | Ground units move −5% | The enemy has air, or its next age brings it |
| Shieldwall | Your `melee` units take −12% damage from `ranged` attackers | Your `melee` units move −10% | The enemy leans on ranged units |
| Forced March | Ground units move +12% | Units take +6% damage | A Fog window or Snow is coming |
| Wide Line | Front width 3 | Ground units move −10% | Melee against a dug-in line (the owner's formation direction) |
| Zealots | Age Power charge +25% | Unit damage −5% | The enemy bunches up or banks for waves |
| Supply Lines | Passive gold +1 per second | Pop cap −6 | Early in the age, before armies fill up |
| Drill | Units +8% attack speed | Unit cost +10% gold | Few, strong units; cut if it fails the pick-flip gate |
| Breakers | Damage to bases +20% | Damage to units −5% | The enemy turtles, or Siege is near |

**Cut from the proposal:** Plunder (the bounty dial, a turtle income engine), Engineers (a second turtle doctrine), Swarm and Veterans (fake train-time costs), Loose Order, Field Medics and Siegecraft (new effect kinds).

**Gates:**

- each doctrine within ±5 points in mirrored runs;
- **pick-flip:** across sampled lane states, each offered pair's better pick must flip in at least 30% of states; a pair that never flips is not a decision and is removed from the draw;
- `sim:combos` with doctrines, battlefields and weather together.

### A16.11 Power ring overflow (v1.1 experiment)

| | |
|---|---|
| Class | Healthy |
| Decisions | Today a full ring wastes charge, so the only real decision is to fire early. With overflow, *when* becomes a readable choice: hold for a clump, or bait the enemy's ring first |
| Counterplay | Both rings show the overflow arc; the opponent spreads out, holds back or baits |
| Architecture | `EconomyRules.power.chargeMaxPpm?` (default 1,000,000, today's behaviour); the sim clamp and `powerReady`; the AI's readiness test and final-age inference; the HUD ring |
| Size, phase, owners | S · v1.1, headless first · WP2, WP5, WP3, WP12, WP0 |
| From | DP-5; audit P5; SV C6; BS 2 |

**Rules if adopted** (A2.9 amendment): charge keeps filling past 100% at the same rate up to 150%; a cast uses 100%; the evolve carry stays min(charge, 50%), so overflow is lost on evolve; Overcharge adds charge only below 100%.

**Adopt only if all of these pass, and the owner agrees:**

- firing at a zone worth ≥ 450 gold beats firing when full by at least 5 points;
- a power-hoarding turtle proxy (Hold, fires only into a wave) reaches the Bell in at most 20% of its matches;
- "bait the power, then wave" beats a plain wave against a hoarding opponent by at least 5 points, so baiting is a real skill.

Reason for waiting: the v1 evidence (20% vs 10% at N = 40) is inside the audit's noise band, and the change touches four WPs.

### A16.12 Modes and seeded rotation

A15.17's rule stands: core modes are permanent. Every mode has a natural end (A15 rule 5) and pays Dust or cosmetics, never Amber or power (rule 8). Levels as in A16.7.

| Mode | Rules | Rewards | Class | Size · phase |
|---|---|---|---|---|
| Ladder, Daily, Conquest, Skirmish | As today; battlefields and weather from v1.1 | As today | As A15 | none |
| Blitz | A15.16 Skirmish preset | As Skirmish | Healthy | XS · v1.1 |
| Random Armies ("Ageborn 960") | Both plans generated per age from the seed and the full pool, owned or not. Each age is guaranteed a Heavy or Legendary, a Ranged, an Anti-armor, a splash source and, from Gunpowder, an air-hitter. A "mirror" toggle gives both sides the same plan | As Skirmish | Healthy | S · v1.1 (`SkirmishOptions.plan?`, A15.18) |
| Draft War and Gauntlet | A15.17, plus a first "Banner Group" pick per plan: a Legendary with 3 complementing cards (the Hearthstone Arena lesson). Online ranked "Arena" uses a mirrored variant: both players get the same offers (A16.21) | A15.17 | Healthy | M-L · v1.2 |
| Boss Battles | A permanent numbered gallery (D1's "weekly kaiju" is dropped). A boss is a disclosed asymmetric AI side: base HP ×3 and a boss unit with phase triggers below 66% and 33% HP (summon waves; enrage +30% attack speed), all shown on the VS screen. Stars for conditions, as Heat | First clear 100 Dust and a village monument; stars 25 Dust each | Healthy | M (F1 + F2) · v1.2 |
| Endless Horde | Your War Plan against seeded, escalating waves (`TrainingEvent.spawn?`). No clock. The run ends when the base falls or at wave 30, with a finish screen. No auto-restart and no per-wave rewards | 5 Dust per wave above your best; best wave on the Profile | Healthy | M · v1.2 |
| Battle Puzzles | A16.16 | A16.16 | Healthy | M · v1.2 |

**Rotation without taking anything away** (engagement rule 9):

1. **Per match:** weather fronts and doctrine offers come from the match seed; the ladder battlefield comes from the seed.
2. **Per day:** the Daily draws a battlefield, a modifier (or a pair, A15.16), an opponent and a seed. Mode select spotlights one "Featured today" mode from the date seed. Every mode stays available.
3. **Per content season:** new cards and a numbers-only balance patch shift the meta (A16.17).

**Never:** time-limited modes, a curated calendar (Hearthstone cancelled Twist in 2026), "featured odds" boosts (A15.22), or rotating owned cards out of any mode they were earned for.

**Commanders are deferred** (v1.3 or later, only after doctrines prove out). They add the largest new axis for little gain, since doctrines already give each match its asymmetry. If they are ever built: one passive of at most ±10% under the stacking budget, one single-use active, no stance-cooldown active (pure click speed), every summoned unit pays normal bounty, no instant-gold active, no hero unit in the lane at first, and no level-ups.

### A16.13 One lane: decision, revisit trigger and a two-lane sketch

**Decision (with the owner, 2026-09-27).** Ageborn keeps one lane:

- it is the genre's identity;
- it reads well on a phone in landscape;
- several real-time lanes reward click speed;
- the sim is one-dimensional by construction, and a second lane means rebuilding it.

**Depth inside the lane:**

| Source | Where |
|---|---|
| Layers: ground and air (exist), underground (APPROVED) | A16.15 |
| Ranks: the third rank really fighting, or a three-wide front | A16.4 (L3, L4) |
| Formation | The Wide Line doctrine (A16.10); the Bridge's single file (A16.9). No formation toggle: stance toggling is already more clicking than deciding |
| Terrain and weather | A16.9 |
| Fortifications on fixed pads | A16.14 |
| Stance | Charge and Hold as today. No movable hold line: with one feature per map the best line would be a per-map constant |

**Revisit trigger.**

- **v1:** the owner's feel. After at least 10 Full Wars at Checkpoint B, if the owner says matches feel like "one blob pushing", the experiment below is costed and offered.
- **From v1.1, measured on the expert meta, not on casual play:** after battlefields ship, if the Save-and-counter mirror still reaches the Bell in more than 20% of matches, or `tools/exploitSearch.ts` finds one plan family that wins at least 60% against every other family, the experiment is offered to the owner.

**Two-lane sketch: "Twin Fronts".** An experiment only: XL, behind a dev flag, never in ranked.

- Its own format id and its own A2.14 targets.
- `lane: 0 | 1` on units and in the `train` and `power` commands.
- Gold, XP, age, Treasury, power charge and pop (60) are shared; each lane has its own spawn, front and movement; turret mounts split 2 and 2.
- Two lane bands at half height: landscape only, unreadable in portrait.
- A 1-week internal prototype plus an owner playtest decides whether it lives on.

### A16.14 Fortifications (prototype v1; card type v1.2 if the gate passes)

| | |
|---|---|
| Class | Healthy |
| Decisions | Gold and pop into a wall (defence) or into units (attack); which pad; when to commit, given the build time and the 25 s recharge. For the attacker: bring Heavies, siege units, tunnelers or air, wait for decay, or push in Fog |
| Counterplay | A fort is a visible commitment: it scaffolds for 5 s before it blocks. Heavy, siege and Legendary attacks deal ×2 to it; every blocked attacker can hit it; it decays and takes ×2 in Siege; tunnelers pass under and air flies over |
| AI | A `place` action: under pressure, the most forward free legal pad inside turret cover (Mama Moss places more). Walls **count** in the push-gate defence value D (each live wall adds 2 × its cost), and the bot answers them with siege, tunneler and air picks through `aiHint.vsStructure`, because the counter matrix (equal-gold duels on a flat lane) cannot value walls |
| Size, phase, owners | Prototype S · v1 Phase 2a, dev page only · WP5, WP12 · `docs/requests/wp5-wall-sandbox.md`. Card type L+ · v1.2 · WP0, WP1, WP2, WP3, WP4, WP5, WP7, WP8, WP9, WP12 |
| From | DP-19; benchmarks idea 10; SV C2; BS 1, 5 |

**Checkpoint A prototype** (no sim, contract, content or art change).

- **Where:** the sandbox dev page (`src/dev/sandbox/viewSources.tsx`, WP5), which already runs the real sim, the real HUD, human commands and AI seats.
- **Walls toggle:** builds a clone of the compiled content that adds a `palisade`, copied from Tuskback's compiled def with: `speed: 0`; HP ×1 (the full rule; a ×2 switch for feel); `abilities: []`; tags `armored` and `ground`; `hidden: true`; `visualId: 'unit.palisade'` (the placeholder visual); one attack with `damage: 0`, `range: 2000`, `hitsGround: false`, `hitsAir: false`.
- **Why it works:** that attack is inert; the overtaking rule lets own units walk through a parked ally with a longer range; the enemy block rule stops enemies at the wall; `devSpawn(sim, side, 'palisade', { p, summoned: true })` means no pop and no bounty.
- **Placement:** pad buttons at p 240, 360 and 460 for either side, plus a free p slider, so "fixed pads or free placement" is tested in the same session.
- **Check:** a 20-line test proves own melee passes, enemy melee stops and attacks the wall, and Sabertooth pounces over.
- **Known gaps:** no scaffold, pop cost, contact rule or ranged ×0.5; enemy ranged units shoot the wall at full damage. The prototype is a worst case for turtling.
- **Headless number** (WP12): a wall-turtle proxy (4 turrets, Hold, Ranged-heavy) re-places 2 walls through a driver hook that calls `devSpawn` whenever the 25 s recharge allows and no enemy ground unit is within 120 lu of the pad; it counts 125 gold of its own spending per wall. Played 400 times against tier VII.

**Go or no-go** (A16.25, task 4). The owner's answer decides whether forts go on; the headless number sets the burden of proof:

- the owner finds walls fun and the worst case is ≤ 55%: build the card type in v1.2;
- fun but the worst case is > 55%: build the full rules sim-first in v1.2 and pass the wall-turtle gate before any fort art is made;
- not fun: park forts, and re-confirm the underground layer's scope with the owner (A16.15).

**Card type rules (v1.2).**

- **Slot and unlock.** Arena 3. Each age loadout gains 1 Fort slot: 5 units, 2 turrets, 1 fort, 1 power.
- **Pads.** 3 per side at p 240, 360 and 460, all inside turret cover (or free placement at p 200-460 if the owner preferred it). At most **2** forts alive per side, one per pad.
- **Commitment.** A pad is legal only when no enemy ground unit is within 120 lu of it. A placed fort is a **scaffold for 5 s**: visible to both sides, hittable, not blocking, traps unarmed. Only then does it block. A wall cannot be dropped as a panic button in front of a wave.
- **Pop.** A live fort (scaffold included) uses 6 pop, like a Heavy, so spare gold at 60/60 cannot flow into walls for free.
- **Recharge.** 25 s after placing; first ready at 0:20; evolving does not reset it.
- **Cost,** flat across ages like units: wall 125 gold, trap 75, bunker 175.
- **Wall HP** = 1 × the age's Heavy Common HP at L1: Stone 560, Medieval 756, Gunpowder 1,019, Modern 1,378, Future 1,860. Levels scale as for cards.
- **Contact rule.** Every enemy ground unit whose path the wall blocks, standing within 60 lu behind the blocked front unit, may start its first attack on the wall as if in range. Break time falls as the attack grows.
- **Damage taken:** ×2 from Heavy, siege-tagged and Legendary attacks (a `mods` entry `vs: 'structure'`); ×0.5 from attacks with range ≥ 100, which pick a fort only when no unit candidate is in range; ×2 during Siege; Age Powers and Last Stand never hit forts.
- **Decay.** From 60 s after placement, −1% of max HP per second, ×2 in Siege: about 160 s of life untouched, about 110 s in Siege.
- **Blocking.** Enemy ground units stop at a wall; own units walk through their own forts; air ignores forts; burrowed units pass under.
- **Bounty.** Destroying a fort pays 60% of its cost in gold and 100% in XP, like a unit. A decayed fort pays nothing.
- **Forts never** queue, convert on evolve or modernise.
- **Traps:** untargetable, non-blocking and always visible to both sides; they fire when an enemy ground unit's centre comes within 30 lu (1 s between charges); air and burrowed units never trigger them. **No trap stuns**, so a trap plus a power telegraph is never a guaranteed hit.
- **Keyboard:** D places on the most forward free legal pad. **HUD:** a Fort button with drag-to-pad (the power drag); on the phone, if the owner found the tray too tight (task 1), forts are placed by long-pressing a pad instead.

**Season 1 cards (10):**

| Age | Wall (Common) | Trap (Rare) |
|---|---|---|
| Stone | Palisade | Spike Pit: 3 charges, 40 damage and 40% slow for 2 s each |
| Medieval | Shield Barricade | Caltrops: 3 charges, 40 damage and 50% slow for 3 s each (×P) |
| Gunpowder | Gabion Wall | Powder Keg: 1 charge, 250 splash r60 (×P) |
| Modern | Sandbag Bunker (175 gold): a wall; allies within 60 lu behind it take −20% damage from ranged attacks | Minefield: 3 charges, 150 splash r40 each (×P) |
| Future | Hardlight Barrier: regenerates 1% per second after 3 s without damage, and still decays | Grav Snare: 1 charge, 60% slow for 3 s, r80 |

**Architecture (full):** forts are stationary units with the F2 traits `structure`, `allyPassable` and `noPowerDamage` (targeting, damage, deaths, hashing, events and views reused), plus scaffold, decay, pad legality and the contact rule; `Tag` + `structure`; `Loadout.structures?`; command `place { side, slot, pad }`; `EconomyRules.fort { pads, max, rechargeMs, firstReadyMs, scaffoldMs, decay }`; F2 for traps; F5 slot counts; a structure-aware counters generator; save loadout migration.

**Art:** 10 static rigs with scaffold, build, hit, three crumble stages and collapse; armed and spent trap states; subtle pad markings. About 1 agent hour each (code-drawn). Sounds: build thunk, crumble, trap snap.

**Gates:** wall-turtle proxy ≤ 45% with ≤ 15% of its matches at the Bell; the 4-turret turtle unchanged; each fort card within ±3 points and a Bell delta ≤ 5; has-a-starter-answer (the Heavy Common ×2 against structures qualifies).

### A16.15 Underground layer (APPROVED; v1.2)

| | |
|---|---|
| Class | Healthy: every tunnel is visible |
| Decisions | Tunnelers answer turtles and backline-heavy plans. The defender chooses a detector turret or a normal one, and how compact to keep the backline |
| Counterplay | A dust trail always shows the tunnel; surfacing has a 1 s telegraph; detectors hit burrowed units; ground powers and Last Stand hit them at 50%; melee near the backline punishes the surfacing |
| AI | The book gains `burrows` and `detects`. Bots with scouted tunnelers value detector turrets; burrowed units count in threat estimates |
| Architecture | First a behaviour-neutral refactor that replaces the ad-hoc `air`, `hitsAir` and `hitsGround` checks (53 lines in 14 sim files) with `layerOf(u)` and `canHitLayer(attack, u)`, proved by unchanged goldens (S-M). Then `UnitState.burrowed?`, `AttackDef.hitsUnder?`, `Observation.units[].burrowed?`, `Tag` + `under`, `UnitPose` + `burrowed`. Burrowed movement is like air (no blocking) at ground speed. Burrow and surface are F2 effects |
| Art | Burrow and surface clips, a moving mound pose, a dust trail on the ground-decal layer, 3 detector turret rigs. S-M |
| Size, phase, owners | M (after F2) · v1.2 · WP0, WP2, WP1, WP3, WP4, WP5 |
| From | DP-20; architecture 4.3; BS 3, 4 |

**Rules.**

- **Cards** (Season 1): Sapper (Gunpowder), Tunnel Rat (Modern), Mole Drill (Future). Role group Epic: cost 200, train 4 s, pop 8. They are fragile raiders with priority `backline` and ×1.5 against tag `ranged`. This makes a second Epic per age, so WP1's per-set count rules (A16.19) are a prerequisite.
- **Burrowing.** Spawns at p 20 and digs in over 1 s (hittable while digging), then travels burrowed at its speed and obeys stance.
- **While burrowed:** ignores blocking by units and forts; cannot attack; only `hitsUnder` attacks (the Detector keyword) can hit it; ground Age Powers and Last Stand deal it 50%.
- **Surfacing** at the first of: its centre within 20 lu of an enemy ranged or support ground unit at p ≥ 560; or p 880 (the enemy's hold line). Surfacing takes 1 s with a dust plume visible to both sides; the unit can be hit during it and never burrows again.
- **Detectors** (Season 1): one detector turret each in Gunpowder, Modern and Future.
- **Gate:** a "tunnel rush" proxy (tunnelers only, Infantry as fallback) ≤ 25%.
- **If forts are parked** (A16.14), the layer is still approved, but its main reason (passing under walls) is gone and it overlaps Sabertooth's pounce and the bombers. The orchestrator re-confirms the scope with the owner before building it.

### A16.16 The learning loop: Battle Puzzles and Review

Chess grew on a loop, not on content: short fair games, puzzles from real games, and analysis with key moments (benchmarks 2.11). Deterministic replays make all of it possible here.

#### Battle Puzzles (v1.2)

| | |
|---|---|
| Class | Healthy. The daily pick is a spotlight, not a bank or a streak; every puzzle stays playable forever |
| Decisions | Isolates the levers the audit found: hold the wave, time the power, Last Stand, Hold then Charge, and later fort placement |
| AI | The opponent is a bot at a fixed tier, rebuilt by re-running its controller from tick 0, so every attempt is deterministic given the player's inputs |
| Architecture | Built on A15.17's battle-resume infrastructure: a session that starts from tick T of a recorded match (`replayMatch(r, content, toTick)` exists) with bots rebuilt. Mined positions keep in-flight projectiles, statuses, timers and RNG state, which a tick-0 scenario would lose. F4 scenarios (`training.scenario?`) come later, only for hand-authored setups. `content/puzzles.ts` (outside `contentHash`): id, stable number, source replay and tick, player side, goal, stars, and a copy of its battle rules (A15.17). `tools/puzzles.ts mine` and `verify` (CI replays every stored solution). Save `puzzles?: Record<id, { stars; bestMs }>`. `MatchResultInput.mode` + `puzzle`. A Puzzle screen |
| Size, phase, owners | M + S per 10 puzzles of authoring, after battle resume · v1.2 · WP11, WP2, WP1, WP7, WP9, WP12, WP3, WP8. It replaces and widens A15.17's Clutch Puzzles |
| From | DP-22; A15.17; SV C10; BS 4 |

**Rules.**

- A puzzle is a position, an opponent, a clock limit of 30-120 s, one goal and three stars. Goals reuse A15.10's predicate kinds: destroy the base before T; survive to T with the base at X% or more; kill N units with one power; win spending at most N gold.
- **Themes,** not only clutch saves: Waves, Powers, Last Stands, Holds.
- **Levels:** standard L7 on both sides.
- **Attempts:** free and unlimited, instant retry; "Show idea" after 3 failed attempts.
- **Solvable by humans.** A human-limited input bot (at least 300 ms per action, at most 12 actions per 10 s; new WP12 and WP3 work) must solve every puzzle.
- **Tolerance test.** The stored solution must still reach its goal with every input shifted 400 ms earlier and, in a second run, 400 ms later. A puzzle that needs one exact tick is a reflex trial and is rejected.
- **Mining.** `tools/puzzles.ts mine` scans headless bot matches for positions where one decision flips the result; a human curates. A broken puzzle is re-authored or runs on its stored rules copy.
- **Pool:** 30 at launch in 3 numbered sets of 10; 10 more per content season.
- **Puzzle of the day:** `hash('puzzle' + YYYYMMDD) mod pool`, the same for everyone. Mode select shows "Today's puzzle: #37". No streak and no count of unsolved puzzles (A15.13).
- **Rewards:** first ★ 10 Dust, ★★ 10 more, ★★★ 20 more. A set of 10 at ★★★ pays a banner once. The daily pick pays nothing extra.
- **Copy line:** `Ageborn Puzzle #37 · ★★★ · 0:48`. No name; copying pays nothing.
- Difficulty shows as 1-5 pips per puzzle. There is no player puzzle rating (A15.9: one moving rank).

#### Review: advantage graph and key moments (v1.1; "What if" v1.2)

| | |
|---|---|
| Class | Healthy |
| Decisions | Attribution (decision test 4): the player traces results back to choices |
| Architecture | `src/sim/analysis.ts` (pure, WP2) re-simulates a replay with `replayMatch` in a Web Worker and samples every 20 ticks. Evaluation: P(side 0 wins) = logistic(Σ wᵢ fᵢ) through an integer look-up table. Features: army value × HP%, base HP, age difference, XP, gold, Treasury, turrets, power charge. Coefficients are content data fitted offline by `tools/fitEval.ts` on at least 5,000 headless matches. No contract change beyond an exported type |
| Art | A graph (the dataviz rules apply); no new game art |
| Size, phase, owners | M · v1.1, with D1's replay seek bar · WP2, WP1, WP12, WP9, WP11. "What if": M · v1.2, after battle resume |
| From | DP-23; SV C10 |

- **Where:** a "Review" button on the Result screen and in the replay viewer. Never a staged Result step (A15.13) and never live in battle.
- **Graph:** advantage from 0:00 to the end (blue above, orange below) with phase and weather ticks. Tapping a point opens the replay there. A note under it: "Estimated from AI games."
- **Key moments:** the 3 largest swings over 5 s windows. A swing is an *effect*; the mistake usually came earlier. Each key moment therefore shows its main event (a wave arriving, a power with N kills, an evolve, Last Stand, a wall broken) **and** any lever note that fired in the 60 s before it.
- **Lever notes** (at most 3, fixed thresholds in content): "You held 400+ gold for 40 s." "12 units arrived one at a time." "Your power hit 2 units." "You evolved 20 s after it was ready."
- **"What if" (v1.2).** At each key moment, re-simulate from 20 s before it with one alternative policy for the player's side (bank then wave; fire the power at the best zone) and show the difference in the evaluation. This is the real chess lesson, and deterministic re-simulation makes it cheap.

### A16.17 Keywords and content growth: from 65 to 150+

#### Keywords

| | |
|---|---|
| Class | Healthy |
| Decisions | Faster plan building and counter reading as the pool grows |
| Architecture | v1.1: `content/keywords.ts` maps existing ability kinds and attack fields to about 10 player-facing keywords, each with an icon and a one-line rule template (`t('kw.reach', { … })`); chips in Card detail; a Collection filter. No sim change. v1.2: the F2 engine (triggers, selectors, effects, traits; architecture 3) runs alongside the old kinds with goldens green; the old kinds are ported once, at a planned major bump; `keyword` events feed `feel.config.json`, so each keyword has one reusable effect and sound |
| Size, phase, owners | S · v1.1 · WP1, WP9, WP4 (10 glyphs). L · v1.2 · WP0, WP2, WP1, WP3, WP5, WP12 |
| From | DP-25; architecture 3; SV v1 slice 5; BS 2 |

- **v1:** no chips and no filter. Card descriptions already name each behaviour in words.
- **v1.1 glossary: only keywords that at least 2 v1 cards share.** Impact, Reach, Ricochet, Splash, Cleave, Pierce, Heal, Suppress, Flying, Drag. Behaviours found on one card (Pounce, Riders, Time Stop, EMP, Roar, Call-in and others) stay card text; that is card text, not a keyword system.
- **Rules for new cards:** at most 2 keywords per card; at most 2 new keywords per season, about 25 evergreen in the long run; keyword numbers vary per card but type multipliers stay within ±25% (only the existing triangle keeps ×2); no keyword may hide state.
- **Keyword stat budget.** Each keyword carries `budgetBp`: a fixed deduction from the vanilla line, priced from duel and smoke-run sims. A keyword card with vanilla stats would be strictly better than vanilla; the budget prevents that.
- **Synergy comes from keyword interactions** designed into content, not from a bonus system: Mark with big hitters, Drag with splash, slowing traps with powers.
- About 1 new card in 10 needs a new trigger or effect kind (about a day of sim work plus tests). The other 9 are data, art and strings.

#### Balance discipline for a growing game

| Rule | Check |
|---|---|
| **Vanilla line.** Each age's Commons are the reference; a new card may not beat them on stats per gold at equal level, after its keyword budget | Report per season |
| Per-card win-rate delta within ±3 points; Bell delta ≤ 5 | `sim:balance`, only for cards whose card hash changed |
| **Has-an-answer:** a same-age card scores ≥ 55% against it at equal gold | Static, `counters.json` |
| **Has-a-starter-answer:** every mechanic (air, burrowing, structure, shields) has a Common or starter-kit answer in its age, so rarity never decides whether a player has a hard answer | Static |
| **Plan-meta search** (`tools/metaSearch.ts`, WP12, from v1.2): an evolutionary population of 64 War Plans per format from the full pool, piloted by the Balanced brain. No plan wins more than 58% against the field, and the top 10 hold at least 5 distinct plans (differing by 3 or more cards) | Each season; CPU on free Actions |
| **Numbers-only patch** each season | A16.5 and the rows above re-run |
| **Nerf compensation.** When a patch lowers a card's win-rate delta by more than 3 points, every save that upgraded it gets, once, the Dust value of the copies it spent on that card (A6.6 "copy past L10" rates), and keeps its levels. No time limit. Nothing earned is taken away | WP7, WP1 (a meta table per patch, outside the hash), a `flags` entry; from the first patch after v1 |
| **Nothing owned is removed** from a mode it was earned for; `retired` is only for content fixes | Content integrity test |

#### Content roadmap

**Seasons are content releases, not reward seasons.** Each is a numbered set; nothing in it is time-limited; its cards join every capsule pool with A6.4-A6.5's unowned weighting and new-card protection. Each season is one funded build session. **None is funded today.**

| Release | New cards | Total cards | Also | Size |
|---|---|---|---|---|
| v1 (Checkpoint D) | 35 units, 20 turrets, 10 powers | 65 | | funded |
| v1.1 | none | 65 | 8 battlefields, 4 weathers, emotes and quips; 10 doctrines if adopted | M-L (systems) |
| Season 1 (v1.2): "Walls and Tunnels" | 10 forts, 3 tunnelers, 3 detector turrets | 81 | 5 Ascended forms (A16.18) | L, with F2 |
| Season 2: "Sidegrades" | 10 units (2 per age), 5 turrets, 5 powers (a third per age) | 101 | | L |
| Season 3: "The Bronze Age" (D1's sixth age) | 7 units, 4 turrets, 2 powers, 2 forts | 116 | The Bronze Legendary's Ascended form; a decision on which formats include Bronze | L-XL |
| Season 4: "Beasts and Machines" | 12 units (2 per age), 6 turrets, 6 forts | 140 | Forms for any new Legendaries | L |
| Season 5 | 12 units, 6 turrets | 158 | Forms for any new Legendaries | L |

If forts are parked, each season swaps its forts for sidegrade units and turrets; the totals stay the same. At one funded season per quarter, 150+ cards arrive about 15 months after v1, not in year one. Seeds (battlefields × weather × doctrines × modifiers × modes) give far more variety per credit, so v1.1 spends on them first.

**Cost per card** (estimates from the architecture report and the spike, not measurements):

| Kind | Data and strings | Art, procedural tier | Art, 3D sprite tier | Balance |
|---|---|---|---|---|
| Common or Rare unit on an existing rig | 0.5 h with keywords | About 80 lines of SVG parts and clips, about 1 agent hour | 1-2 agent hours; 70-200 KB per sheet at 1.5x | Smoke run (400 matches, about 1 min on 8 workers), then a full run for changed cards |
| Epic or Legendary unit | 1 h; about 1 in 3 needs a new keyword kind (+1 day of sim work) | + signature clip and walkout pose, 3-5 agent hours | 3-6 agent hours; up to 300 KB | As above, plus has-an-answer and Bell delta |
| New rig (a burrower, a new flyer) | none | + half a day | + half a day | none |
| Turret or fort | 0.5 h | 0.5-1 agent hour (code-drawn) | stays code-drawn | As above |
| Power | 1 h | 1-2 agent hours of effects | stays code-drawn | Power coverage check (A2.9) |

**Per season** (about 15-25 cards): about 25-60 agent hours of art, 10-15 hours of data, strings (English and Danish) and tests, an economy re-run (A6.9), the A15.20 "days without a new collectible" report, and a pick-rate report from bot drafts.

**Download size.** Sprite sheets load per match roster (at most 2 × 45 cards), never for the whole pool.

**Prerequisites before Season 1:** F3 (A16.20: otherwise every new card breaks every stored and shared replay, puzzle and Echo replay); WP1's per-set count rules (`src/content/schema.ts` hard-codes 35 units, 20 turrets, 7 units, one Epic and one Legendary per age, and rarity totals 25/15/10/5); new gameplay tables inside `hashedSlice`.

### A16.18 The rarity ladder: Ascended forms and Holo (v1.2)

**One ladder for every collectible:** Common, Rare, Epic, Legendary, and a new top tier, **Mythic**. Foils (Bronze, Silver, Holo) are a separate axis, as today.

#### Mythic as Ascended forms (owner decision O2)

| | |
|---|---|
| Class | **Grey:** a random cosmetic reward for players who may be minors. Safeguards: earned only; pre-rolled; odds and a pity counter on every capsule screen; a crafting path; no duplicates; no trading, gifting or selling (red lines 1-2); no "collection value" number; no rate-up events (A15.22); honest pre-signals only (red line 7); quick reveal honoured; walkouts ≤ 10 s |
| Decisions | Which Legendary to show off; nothing in battle changes |
| Architecture | `SkinRarity` + `mythic` (already planned in `contracts/ids.ts`). An Ascended form is a Mythic skin of a Legendary unit, applied through `SideConfig.skins` (exists), so the sim never sees it. A capsule-level roll and pity in A6.4-A6.5; save `pity.sinceMythic` and the skin-rarity picklist (migration); `sim:drops` chi-square and pity-boundary tests; a rarity colour token |
| Art | Per form: a walkout, a spawn effect, a lane idle flourish that keeps the silhouette and team zones (A5.8 clarity parity), a sound set, a Mythic frame. 5 at launch |
| Size, phase, owners | M + 5 forms of art · v1.2 (Season 1) · WP0, WP1, WP4, WP7, WP8, WP10, WP12 |
| From | DP-28; SV C7, C12; BS 4 |

**Why cosmetic.** The owner wants rarity to be "mostly a sidegrade: spectacle, uniqueness, not raw power". A Mythic *card* with a new signature would give lucky or long-playing players strategic options others lack, add a random reward that affects play for minors, and touch about 12 `Record<Rarity, …>` sites plus the balance gates, the AI and an economy re-run. An Ascended form gives the thrill and the uniqueness at the cost of art. New gameplay stays in Epics and Legendaries, which have pity at 40 and can be crafted. D1's "Mythic skin tier with a hard pity at 40 crates" becomes this tier.

**Rules.**

- **Pool.** One Ascended form per Legendary: 5 in Season 1, then one with each new Legendary.
- **Eligibility.** A capsule rolls for a Mythic only when the player owns a Legendary whose form is not yet owned; the form is picked among those. Pity counts only eligible capsules. So there are never duplicates, and a player who owns every eligible form simply stops rolling until a new Legendary arrives.
- **Roll** (a new A6.4 step after guarantees):

  | Tier | Clay | Bronze | Silver | Jade | Aeon |
  |---|---|---|---|---|---|
  | Mythic chance | 0 | 25 bp | 50 bp | 150 bp | 500 bp |

  Supply, Trophy Road and Codex capsules roll by their tier; Age Capsules roll 50 bp for that age's form; scripted, Age Unlock and Wardrobe capsules never roll. A Mythic is added to the capsule; it replaces no card stack.
- **Pity** (A6.5 style): n counts eligible capsules since the last Mythic, including this one. n ≤ 100: no bonus; 101-149: a Mythic with probability (n − 100) × 2%; **n = 150 guarantees one.** Every capsule screen shows "Mythic: 37/150".
- **Crafting:** 4,000 Dust for a form whose Legendary you own.
- **Expected rate** for the engaged A6.9 profile (about 6 capsules a day): about 1 in 220 capsules without pity, about 1 in 85 with it, never more than 150 (about 25 days). `sim:drops` confirms these.
- **Presentation.** UI colour #F0386B with an iridescent sweep. The card back glows Mythic for 0.3 s only when a Mythic is really there (A10 step 5); there is no teasing climb and no "almost Mythic". Walkout 10 s the first time and 3 s after, always skippable. The odds panel says: "Mythics can't be bought, traded or given away." Nothing is ever described as "the rarest object in the game".
- **Codex:** +16 points per form.

**Decided.** The owner chose Ascended forms: prestige variants of Legendary cards with no extra power. A Mythic card with its own power is rejected (A16.28).

#### Holo in the lane

| | |
|---|---|
| Class | **Grey:** a random cosmetic. Safeguards: odds unchanged and shown (A6.4 step 5: Holo 25 bp per stack); no foil pity (A15.22 rejected the Holo compass); crafting after L10 (A15.11); no value number; never tradable |
| Architecture | `SideConfig.foils?: Record<CardId, Foil>` (cosmetic; the sim ignores it and hashes skip it); `ArtProvider.createUnit` + `foil?`; one shared shimmer filter for every rig |
| Size, phase, owners | M (art) · v1.2 · WP0, WP4, WP5, WP11 |
| From | DP-29; SV C12 |

- A5.8's "Foils never appear in the lane" becomes: "Only Holo appears in the lane: a holographic shimmer on the unit's non-team parts and a sparkle on spawn, visible to both sides." Bronze and Silver stay on the card frame.
- Clarity parity holds: silhouette unchanged, team zones untouched, colour rule applied, gallery tests per rig. Lite shows a static holo trim.
- About 1 Holo per 128 bag capsules (about 3 weeks for the engaged profile).

### A16.19 Slots, sets and the album

| | |
|---|---|
| Class | Healthy |
| AI | The procedural plan generator (A7.4) draws from the growing pool under A6.8's rarity allowance; the counter matrix is regenerated each season (same and adjacent ages) |
| Architecture | Each card gets a permanent dex number `num` (v1.1, in a meta table outside the hash, for codes), then `set` and `family` on card defs (v1.2); content split into `content/sets/<set>/<age>.ts`; per-set count rules; F5 data-driven slot counts (`EconomyRules.loadoutSlots`, `Command.slot: number`) |
| Size, phase, owners | S (v1.1: presets, `num`) · M (v1.2: sets, F5) · WP1, WP0, WP2, WP9, WP7, WP8 |
| From | DP-27; SV C7; BS 3 |

- **Loadout per age:** 5 units, 2 turrets, 1 power; plus 1 fort from Season 1 if forts pass.
- **No sixth unit slot.** Every slot adds coverage, and coverage is what makes in-match counter-picking trivial; fewer slots mean more commitment. The tray also needs about 700 of the 756 usable px on an 844 px landscape phone.
- **Deck depth grows through the pool,** not the slots: from 13 cards per age (7 units, 4 turrets, 2 powers) to about 25-30 by Season 4.
- **Presets:** up to 5 from v1.1 (A16.9); new ones start empty.
- **Album.** The Museum (A16.22) and the Collection get album pages per set and per age. Unowned cards show as silhouettes. Completion is derived; no save field. Completing an age or a set pays a banner once (a village monument from v1.2), into `cosmetics.owned`. This generalises A15.16's age sets.
- **Deck tools** (v1.2): War Plan search; keyword, set and rarity filters.
- **No bonds.** Family bonuses of +5% would either define the meta or be invisible (one level ≈ 20 points), and they would push plans toward families instead of good answers. Synergy comes from keywords (A16.17).

### A16.20 People without a server (v1.1)

#### Codes, Echo challenges, replay links and clips

| | |
|---|---|
| Class | Healthy. Opponents are labelled AI; nothing is paid for creating, sharing or redeeming; no "used n times" counter (red line 9); no name unless the player adds the auto name |
| Decisions | The friend has to solve your plan; you design a plan that is hard to solve |
| AI | "AI · Echo of Chief-4821": the Balanced brain playing the creator's War Plan (A15.15). No style vector: it would need per-match history the save does not keep and new `MatchStats` fields that A15.22 rejected |
| Architecture | A15.15 codes (`src/core/codes.ts`). **F3:** `matchHash` = hash of the rules slice plus only the cards in either plan (and their summon sources), with `cardHash[id]` computed at compile time; `ReplayDoc` v2 with `matchHash`; `SIM_VERSION` semver (major = any change to a golden hash; minor = an inert addition proved by unchanged goldens); versioned player builds at `/ageborn/v/<major>/` (a `pages.yml` change, requested from the lead). `src/sim/replayCodec.ts` for replay links |
| Size, phase, owners | F3 S · codes and Echo M (A16.24 v1.1-5) · replay links S · v1.1 · WP0, WP2, WP7, WP8, WP9, WP11, WP12 |
| From | DP-30; architecture F3, 5; BS 1, 3 |

- **v1 already needs one piece (XS, WP2, Phase 2b):** `replayMatch` checks the `SIM_VERSION` major, not only `contentHash`. Today a sim-only fix after release would replay old local replays wrongly, and A15.6's "Watch" buttons depend on them.
- **Payloads:** War Plan code about 66 characters; Echo challenge about 105; puzzle score about 18; replay link about 0.5-1 K characters for bot-like play, about 3 K for a very busy human.
- Poki builds use pasted text codes only; GitHub Pages builds also offer `#c=` URL fragments, which never reach the server.
- **Clips and save image:** D1 Clip Mode and A15.16, independent of codes.
- Until F3 lands, every numbers patch invalidates every stored replay, so F3 comes before any sharing ships and before Season 1.

#### Emotes and quips (APPROVED)

| | |
|---|---|
| Class | Healthy offline (bots are labelled AI and keep A7.2's limits). Grey online (contact with strangers); safeguards in A16.21 |
| Architecture | `EmoteId` becomes `string`, validated against content in commands, events and `HudModel`; the sim checks the cooldown plus a per-match cap (`EconomyRules.emoteMaxPerMatch`); the session checks ownership offline, the relay online; `content/emotes.ts` (id, kind `emote` or `quip`, rarity, `visualId`, `soundId`, `textKey`, `botAllowed`); save `profile.emotes?` (the equipped 6); `ArtProvider.createEmote?`; WP8's replay schema accepts string emotes (today it hard-codes the 6 ids and would drop such replays) |
| Art | 20-30 small animated sticker rigs; quips are a speech bubble over your base. M |
| Size, phase, owners | M + art M · v1.1 · WP0, WP1, WP2, WP3, WP4, WP5, WP8, WP9 |
| From | DP-31; SV C12; BS 3 |

- **Kinds:** animated emotes, and quips: fixed one-liners in i18n. **Never free text.**
- **Tone:** only friendly or neutral quips, in every mode. No taunts, nothing about skill, looks or age. Every quip is reviewed for kindness in English and Danish. Examples: "Well played!", "That was close!", "Onward to the next age!", "My turrets salute you."
- **Rarity:** the same ladder as cards.
- **Sources:** Trophy Road nodes, feats, Conquest stars, Heat trims, puzzle sets and set completion; crafting with Dust (Common 100, Rare 300, Epic 800, Legendary 2,000); the Wardrobe Crate pool under its visible odds and pity. Never a new random source. The 6 v1 emotes stay free.
- **Equip:** 6 on the Profile.
- **In battle:** cooldown 3 s and at most 8 per side per match. A quip bubble shows for 2 s in the top-bar area and never covers the lane.
- **Mute:** a mute button on the opponent's nameplate for the match, and the existing Settings switch.
- **Bots:** each General gets 2-3 signature quips in the character of its VS line, at most once per match; replies at most once per 20 s (A7.2).

### A16.21 People online (the D1 server milestone and later)

| | |
|---|---|
| Class | Grey (people, possibly minors). Safeguards in "Safety for minors" below |
| Architecture | An input relay in one Cloudflare Durable Object per room (free tier; check the current limits before building). It stamps commands at tick + 4 and broadcasts them; clients simulate and compare `state.hashes` every 20 ticks. A `NetService` interface is injected into `app`, never into the sim. Anonymous device-key accounts. Cross-browser determinism is proved first: golden replays in Chromium and WebKit e2e (WebKit is not configured today). `OpponentSpec.isAI` and `HudModel.foe.isAI` change from the literal `true` to `boolean`, with A7.1 labelling logic. Verification by peer re-simulation or a scheduled GitHub Actions job (Workers' CPU limit rules out re-simulating on the server) |
| Size, phase, owners | Relay and friendlies L; friends list, friend leaderboard and spectating M; clans XL; 2v2 XL · online, later · a server WP, WP11, WP9, WP8, WP2 |
| From | DP-24, DP-32 to DP-35; SV C9, C11; BS 3 |

**Friends and friendlies.**

- Server-issued friend codes and invite links, exchanged out of band. No search. A friends list, with presence only when both friends opt in (default off).
- **Friendly battles:** unranked, no trophies, no pause or speed (D1), emotes and quips only, a Rematch button; battlefields, weather and standard levels as in Skirmish.
- **Friend leaderboard:** relative, among friends only: Daily results, puzzle stars, best Endless wave.
- **Spectating:** friends only, with a 30 s delay; clients simulate from the command stream.
- **Repeat order** (PvP has no pause): swipe up on a card (keyboard Shift + 1-5) to repeat it; at most one card at a time; the queue refills with it while gold and queue room allow. Bots have the same command (A7.1). It trickles, and trickling loses to waves, so it is a convenience with a cost.

**Ranked.**

- Every card at exactly L8 (A16.7).
- A visible **Glicko-2** rating, provisional ("1500?") until the rating deviation is below 110 (about 15-20 games). No decay; online seasons carry over (A15.17).
- **Trophies and a rating** (owner decision O3). Ranked PvP shows both. Trophies show progress: they pay the Trophy Road and arenas as in A6.3 and never fall below the current arena gate. The Glicko-2 rating is the skill number and drives matchmaking. The AI ladder keeps trophies only, with its hidden MMR (A15.9). Whether ranked and the AI ladder share one trophy count is settled at the online milestone.
- **Only human-against-human matches move Glicko.** AI Generals may fill thin queues, labelled AI (D1), but those matches never change a rating, so learning the bot cannot farm it.
- **Format:** Short War becomes the ranked default only after its A16.5 Bell rows pass; until then Standard War.
- **"Arena":** mirrored Draft War (both players get the same offers, as in Mechabellum) as a second ranked queue with no collection edge and no offer luck.

**Clans (APPROVED).**

- Joined by invite code only; at most 30 members; name from word lists; emblem from preset parts; preset messages only ("Good luck!", "Nice win!").
- **Clan level** rises from cooperative battle goals counted clan-wide ("300 wins together", "100 puzzle stars", "10 Boss Battles cleared"). No per-member numbers are shown. Levels unlock emblem parts and Clan Hall stages.
- No quotas, no per-member contribution display, no "last seen", **no deadlines**. Leaving costs nothing; kicked members keep everything; leaders cannot see member activity.
- **Reinforcements:** each member may set one standing "lend": a unit card, **never a Legendary**. It never pings anyone. In friendlies and clan raids only (never the AI ladder or ranked), a player may call one clanmate's lend once per battle. It spawns at p 20 at standard L7 with no pop, and it **pays normal bounty** to its killer, so it cannot bypass the anti-spam engine. Lending pays nothing and no lend counts are shown. Sim part S: `SideConfig.reinforcement?` (a server-signed single-use token) and a `reinforce` command through the summon path.
- **Clan raids (the owner's clan wars, made pressure-free).** The raid board shows another clan's published defences: each member's Echo code (War Plan, and fort layout once forts exist), played by "AI · Echo of <member>" at standard levels. Each member has **3 attacks per raid** (a limit, not a quota); **every attack uses a fresh seed**, so memorising inputs does not work. Stars add to a cooperative clan total. There is no race between clans, and the defending clan is never told it "lost". The raid ends when every member has used their attacks, or when the leader closes it after half the clan's attacks are used. Everyone who attacked at least once gets the raid banner; the clan gains level progress. Results are submitted as replay codes (1-3 KB) and verified by peers or a scheduled Action.

**2v2 (later).** Co-op against AI Generals and bosses first, then PvP. One lane; a shared team base with HP ×1.6; 2 mounts per player; individual gold, XP, plans and ages; pop 42 per player; **front width 3** (84 pop behind a two-wide front would stall); emotes only; bots fill empty seats, labelled AI. "Team base age = the highest on the team" invites one player going pure economy while the other defends, so a greed proxy is gated at ≤ 55%. XL: "players" must become separate from `Side` in the sim.

**Safety for minors** (every online system):

1. No free-text chat anywhere, ever. Emotes and curated quips only.
2. No contact from strangers by default: friend codes out of band, no search, no direct messages.
3. Block and report on every nameplate, the friends list and clan screens. Block also hides that player's emotes.
4. Privacy: pseudonymous auto names by default; no public "last seen"; presence only with mutual opt-in; no real-world location, camera, microphone or health data (red line 10); anonymous device-key accounts.
5. No rewards for inviting, sharing or social actions (red line 9).
6. A Danish games or consumer lawyer reviews age, consent and account rules before the online milestone (A15.1).
7. Settings > For parents gains a line for each online feature as it ships.

### A16.22 Home village (APPROVED; v1.1)

| | |
|---|---|
| Class | Healthy: no timers, no collecting taps, no decay, no raids that take anything, no guilt copy, no battle power in any mode |
| Decisions | Which decorations and Wonder to show (v1.2); which fort layout to publish as your defence (online) |
| Architecture | Home (WP9) becomes a DOM layer of building hotspots over baked images from `ArtProvider.building?(o: { id; stage; age; skin?; size })`, which returns a cached data URL like `portrait()`. The UI never draws the buildings; painted art can replace procedural art later; hit areas stay accessible DOM. Idle life (smoke, flags, sparkles) is small CSS-animated layers. `meta/village.ts` `villageStages(save, content)` is pure and derives every stage from existing progress, so v0 and v1.1 need **no save field**. The Battle button is DOM and loads first (B16: Play ≤ 3 s); the village chunk loads lazily |
| Size, phase, owners | v1.1: v0 M (engineering M, art M), then stages L (mostly art) · v1.2 L · online M · WP9, WP4, WP7, WP11, WP8 |
| From | DP-36; architecture 4.14; SV C12; BS 1, 2 |

**Rules.**

- **No walking avatar.** Tapping a building opens its feature directly. A large Battle button is always visible.
- **Badges** only for things that are ready ("Open (3)" on the Vault, "Upgrade ready" on the Forge, "New" on the Museum). Never backlog counts (A15.13).
- **Buildings grow from achievements, not time served.** Home never shows "next stage at X"; progress toward the next stage is shown only inside each building, so Home does not become a wall of meters (A15.13).
- **Reconciled with A15:** the Keep *is* A15.16's Home base (same milestones) and holds the A15.16 trophy shelf; the Hall of Generals is A15.9's Conquest ladder. A15.19's item v1.1-7 is replaced by this section.

| Building | Opens | Grows with |
|---|---|---|
| Keep (your base) | Profile and the trophy shelf | A15.16 milestones: Stone for a new save, Medieval at Arena 3, Gunpowder with all cards owned, Modern at 27 Conquest stars, Future with every card at L10 |
| Arena Gate | Mode select (the Battle button stays separate) | Arenas 1-3, 4-6, 7-8 |
| Barracks | War Plan | A win in Short, Standard and Full War |
| Vault | Capsules | First Legendary; all 5 Legendaries; first Ascended form |
| Forge | Upgrades (the Collection filtered to "upgrade ready") | 10 cards at L7+; 30 cards at L7+ |
| Museum | Collection, feats and album | Collection 50%, 100% |
| Hall of Generals | Conquest | Arena 3; 9 stars; 27 stars |
| Clan Hall (online) | Clan screens | Clan level |

- **The "trickle."** No new resource and no new clock. The existing Supply allowance (A15.4) is the village's production: a supply wagon appears at the Vault **only when a Supply Capsule is ready to open**. It never fills day by day, so it is neither a "come back tomorrow" cue nor loss framing when full. Owner decision O6.
- **Base cosmetics visible to opponents:** base skins already exist in v1 (A5.8, `SideConfig.skins`). The banner on your lane base follows A15.17 ("identity in the lane").

**Phases.**

| Phase | Content | Size |
|---|---|---|
| v1.1, v0 (owner decision O5: the village comes in v1.1) | Home laid out as the village: the Keep from the existing base visuals, 6 buildings with 1 stage each drawn procedurally from the part library in each age palette, small idle layers; the existing Home widgets stay as a thin DOM frame. v1 keeps today's Home (`src/ui/screens/home/`, with its animated arena backdrop). v0 lands the `ArtProvider.building?` method and the WP9 and WP4 work as one change | M |
| v1.1, after v0 | 3 growth stages per building (about 18 compositions from a shared part kit); the trophy shelf in the Keep | L (mostly art) |
| v1.2 | **Free placement** of decorations and monuments (save `village?: { placed: { id; x; y }[] }`, a migration). Decorations come from achievements (feats, set completion, puzzle sets, boss clears, Heat trims) and Dust crafting, with no new currency. **Wonders:** 5, one per age, each with 5 stages tied to achievement counts (for example "Sun Stones: a stage per 5 Conquest stars"), built over months with no timer. The chosen Wonder rises in your half of the battle backdrop skyline, seen by both sides, purely cosmetic | L |
| Online | The Clan Hall. A published **defence layout**: fort pads and War Plan inside your Echo code (about 10 more bytes), which friends and clanmates attack as "AI · Echo of you". Read-only visits to a friend's village | M |

### A16.23 Contract, save-schema and content-table changes by phase

A15.18's rules hold: optional fields only; fakes and the save fixture updated in the same change; meaning documented in JSDoc; one batch per phase; no stubs or hooks for unbuilt systems.

**Amendment to A15.18** (owner decision O10, applied there): v1.1 changes contracts only for F3, battlefields and weather, emotes and quips, the village `building?` method and, if the owner approves them, doctrines and power overflow, all in the one v1.1 batch.

**Hidden costs this list includes.** WP8's `src/save/replaySchema.ts` uses `v.object`, which strips unknown keys: every new `ReplayDoc`, `SideConfig`, `MatchConfig`, `training` or `Command` field must be mirrored there, or stored replays silently lose it and desync. The same file hard-codes the emote list, the slot literals and five-age `partialPerAge`. `src/save/schema.ts` enforces loadout lengths 5 and 2, five ages per War Plan and a four-value rarity list. `src/content/schema.ts` hard-codes the v1 card counts.

#### v1 Phase 2a

- Contracts, save and content: **none.**
- WP5: the wall sandbox (dev page only). WP3: A16.3. WP11: Quick Battle URL flags `&tier=` and `&mods=` (A16.25). WP12: the headless wall-turtle driver (tools only).

#### v1 Phase 2b (joins A15.18's one amendment, with the pending `MatchStats.ageTimesMs` and `Observation.foe.lastEmote` requests)

- **Sim, only if A16.4 adopts them** (at most two): L3 or L4 in `movement.ts` (no contract change); L5 as `EconomyRules.siege.unitDamageTakenBp?` (default 10,000; WP1 adds it to the Valibot economy schema and `raw/economy.ts`; WP2 shim-defaults it for the frozen fixture); L6 in `clock.ts`/`win.ts` (no contract change). One `SIM_VERSION` major bump; goldens re-recorded; the tutorial beat times re-pinned, as in `docs/requests/wp2-tutorial-retime.md`.
- WP2 (no contract change): `replayMatch` checks the `SIM_VERSION` major.
- WP8 schemas: none.
- WP12: the A16.5 proxies and rows, the rules-sanity runner, Short War in the smoke run, `--patch`, the two harness hooks.
- Strings: the trickle hint (WP11) and tip (WP1, WP9).
- WP7: the peak-tier rule (A16.7).

#### v1 Phase 3

- Numbers only: the adopted HP scale, the Short War clock (formats are content data), Siege lethality if adopted, the Legendary counters, Balloon Admiral, EMP Saboteur. Bounty stays 6,000 bp. No schema change.

#### v1.1

| Area | Change | For |
|---|---|---|
| Contracts | `ReplayDoc` v2 with `matchHash`; the `SIM_VERSION` semver rule | F3 |
| Contracts | `ModEffect`, `ModScope` (kinds in use only); `MatchConfig.battlefield?`, `ReplayDoc.battlefield?`, `OpponentSpec.battlefield?`, `SkirmishOptions.battlefield?`; `Observation.field`, `weather`; `SimState.weather?` (hashed when non-empty); `SimEvent` `weatherChanged`; `HudModel` weather chip and bands in the clock marks; `ArtProvider.createBackdrop({ battlefield? })`, `BackdropView.setWeather?` | Battlefields and weather |
| Contracts | `EmoteId` becomes `string`; `EconomyRules.emoteMaxPerMatch`; `ArtProvider.createEmote?` | Emotes and quips |
| Contracts | `ArtProvider.building?` | Village |
| Contracts, if adopted | `evolve.pick?`; `Observation.me.doctrineOffer`, `foe.doctrine`; `SideState.doctrine`; `SimEvent` `doctrinePicked`; `HudModel` offer and banner; F1 kinds `vsTags`, `attackSpeed`, `baseDamage`, `popCap`, per-side `passiveGold` | Doctrines |
| Contracts, if adopted | `EconomyRules.power.chargeMaxPpm?` | Power overflow |
| Contracts | `SkirmishOptions.plan?`, `seed?`, `modifiers?`, `pact?`, `challenge?` (A15.18) | Codes, Random Armies |
| Save m[1] | `profile.emotes?`; nerf-compensation flags (existing `flags`); presets up to 5 (the schema allows it; WP9 caps at 5); plus A15's v1.1 fields | |
| WP8 replay schema | `battlefield`; string emotes; v2 with `matchHash`; `evolve.pick` if doctrines | |
| WP1 content | `battlefields.ts` and the weather table (inside `hashedSlice`); arena and General to battlefield maps; `emotes.ts`; eval coefficients; the dex `num` table and nerf-compensation table (meta, outside the hash); the keyword glossary; `doctrines.ts` if adopted (inside the hash); Daily pair entries in the `ModifierId` union (A15.16) | |
| CI | A request to the lead for versioned builds in `pages.yml` | F3 |
| Not needed | F4 scenarios (puzzles use replay prefixes); `MatchStats` style fields (cut) | |

#### v1.2

| Area | Change | For |
|---|---|---|
| Contracts | F2 triggers, selectors, effects and traits beside `AbilityDef`; `Tag` + `structure`, `under`; `AttackDef.hitsUnder?`; `UnitState.burrowed?`; `UnitPose` + `burrowed`; `ClipName` + build, crumble, burrow, surface; `Observation.units[].burrowed?` and fort state | Keywords, forts, underground |
| Contracts | `Loadout.structures?`; command `place`; F5 `Command.slot: number` and `EconomyRules.loadoutSlots`; `EconomyRules.fort`; `HudModel` Fort card | Forts, slots |
| Contracts | `SkinRarity` + `mythic`; `SideConfig.foils?`; `ArtProvider.createUnit` + `foil?` | Ascended forms, Holo |
| Contracts | `SideConfig.mods?` (boss); `TrainingEvent.spawn?`; `MatchOutcome.reason` + `waveCap`; `MatchResultInput.mode` + `puzzle`, `boss`, `horde`, `draft`, `gauntlet`; a session that starts from a replay tick (A15.18) | Modes, puzzles |
| Contracts | `num`, `set`, `family`, `retired?` on card defs; `AgeId` + `bronze` (Season 3) | Sets |
| Save m[2] | Loadout lengths and `structures` (migration); `pity.sinceMythic` and the skin-rarity picklist; `puzzles?`; `village?`; `bosses?`, `horde?`; plus A15's `gauntlet?`, `expedition?`, `relics?`. Season 3: `AGE_IDS`, a `bronze` loadout in every War Plan, `partialPerAge` in the replay schema | |
| WP1 content | Per-set count rules replace the hard counts; `keywords.ts` with `budgetBp`; bosses and horde tables; a structure-aware counters generator; `puzzles.ts` (outside the hash) | |

#### Online

- `OpponentSpec.isAI` and `HudModel.foe.isAI` become `boolean`, with A7.1 labelling logic.
- `NetService` (app only); a cloud `SaveStore`; the `reinforce` command and `SideConfig.reinforcement?`; `MatchResultInput.mode` + `friendly`, `ranked`, `raid`.
- WebKit golden e2e before any relay work.

### A16.24 Build plan

#### v1

Every item is S or smaller and adds no screen, mode or currency. Cut from the bottom if time runs short.

| # | Item | Section | Size | Phase | Owners | Request file |
|---|---|---|---|---|---|---|
| 1 | Bot fixes: save for a counter, evolve on time, smooth answer to one-type armies, score unaffordable counters, no Legendary saving goal while the gate fails | A16.3 | S | Now, landing in the Phase 1 integration pass (before Phase 2a) | WP3 | `wp3-depth-answers.md` |
| 2 | Quick Battle flags `&tier=` and `&mods=` | A16.25 | XS | Phase 2a | WP11 | `wp11-depth-session.md` |
| 3 | Wall sandbox prototype | A16.14 | S | Phase 2a, before Checkpoint A | WP5 | `wp5-wall-sandbox.md` |
| 4 | Proxies, A2.14 rows, rules-sanity runner, `--patch`, harness hooks, Short War in smoke, headless wall-turtle number | A16.5, A16.4, A16.14 | S | Phase 2a (wall number) and Phase 2b start | WP12 | `wp12-depth-proxies.md` |
| 5 | Stalemate levers: measure, then adopt at most two sim changes | A16.4 | S + S per change | Phase 2b, first week | WP2, WP12, lead | `wp2-depth-sim.md` |
| 6 | `SIM_VERSION` major check in `replayMatch` | A16.20 | XS | Phase 2b | WP2 | `wp2-depth-sim.md` |
| 7 | Teach the wave: detector, hint, loss tip | A16.6 | XS | Phase 2b | WP11, WP9, WP1 | `wp11-depth-session.md` |
| 8 | Peak tier at even levels | A16.7 | XS | Phase 2b | WP7 | `a15-wp7-rules.md` |
| 9 | Numbers: HP scale, Short War clock, Legendary counters, Balloon Admiral, EMP Saboteur | A16.4 | numbers | Phase 3 | tuning agent | none |

**Landing status (2026-09-28).**

1. Open: write the A16 request files named in the table above (`wp3-depth-answers.md` first, since the bot fixes land before Phase 2a ends).
2. Done: A16 is merged into DESIGN, with the edits to A2.7 (a note until A16.4 picks the front rule), A2.10, A2.14 (A16.5 rows), A3, A5.8, A6.8, A7.2, A7.3, A8, A15.9, A15.18, A15.19, B12, C3 and D1 (Mythic tier as Ascended forms; weekly kaiju dropped).
3. Open: record in `docs/decisions.md` that the bounty stays 60% as the spam-stall dial, the tools we do not add (A16.2), and, after Phase 2b step 2, the adopted stalemate levers with their numbers.
4. Open: update `ageborn-phase2-battle` with the wall sandbox and the URL flags, `ageborn-phase2-loop` with items 4-8, and `ageborn-phase3-polish` with item 9 and the Bell release rule (A16.5).
5. Keep the proposal and both reviews as design history. Add no stubs or hooks for later systems.

#### After v1: one ranked wishlist (merges A15.19)

A15.19's own items keep their relative order; A16 items slot in. Systems that renew from seeds come first (A15 rule 9). Each line is a separate funded step. v1.1 as a whole is L to XL: its art alone (battlefield props for 8 arenas, 4 weather overlays, 20-30 emote rigs, village stages, glyphs) is roughly 60-110 agent hours, and every new string is written in English and Danish.

| Order | Item | Section | Size | Needs |
|---|---|---|---|---|
| v1.1-1 | Danish text | D1 | M | |
| v1.1-2 | Foil crafting and Amber to Dust, if not in v1 | A15.11 | S | |
| v1.1-3 | Any A16.5 Bell row that missed its v1 gate | A16.4, A16.5 | S-M | |
| v1.1-4 | Chrono Heat | A15.14 | M | |
| v1.1-5 | F3, then share codes and Echo challenges; replay links | A16.20, A15.15 | S + M + S | |
| v1.1-6 | Battlefields and weather, reveal-then-pick, 5 presets, F1-lite, `sim:combos` | A16.8, A16.9 | M + art M | F3 |
| v1.1-7 | Card stars and the Codex extension | A15.14 | M | Heat |
| v1.1-8 | Daily pairs, welcome card, Skirmish presets (Blitz, Random Armies), age sets | A15.16, A16.12 | S | |
| v1.1-9 | Village v0, then 3 stages and the trophy shelf (owner decision O5) | A16.22 | M, then L | |
| v1.1-10 | Emotes and quips | A16.20 | M + art M | |
| v1.1-11 | Review: graph, key moments, lever notes | A16.16 | M | D1 seek bar |
| v1.1-12 | Keyword glossary; dex numbers; nerf compensation (before the first patch) | A16.17, A16.19 | S | |
| v1.1-13 | Exploit search; bot wave play for tiers VIII+ | A16.8, A16.3 | S, S | |
| v1.1-14 | Rival, feats to 30, save image with Clip Mode | A15.15, A15.16 | S, S, M | |
| v1.1-15 | Evolve doctrines, **if the owner says yes** | A16.10 | M | Battlefields |
| v1.1-16 | Power ring overflow, headless first | A16.11 | S | |
| v1.2-1 | Battle resume, then Battle Puzzles | A15.17, A16.16 | M, then M | |
| v1.2-2 | Gauntlet and Draft War (Banner Group) | A15.17, A16.12 | M-L | |
| v1.2-3 | F2 keyword engine, layer refactor, F5 slots, per-set rules, sets | A16.15, A16.17, A16.19 | L | |
| v1.2-4 | Season 1: forts (if they passed), tunnelers, detectors; plan-meta search | A16.14, A16.15, A16.17 | L+ | v1.2-3 |
| v1.2-5 | Ascended forms and Holo in the lane | A16.18 | M + art | |
| v1.2-6 | Rift Expedition | A15.17 | L | |
| v1.2-7 | Boss Battles, Endless Horde | A16.12 | M, M | F1, F2 |
| v1.2-8 | Guest Generals, identity in the lane | A15.17 | M, M | |
| v1.2-9 | Village free placement and Wonders; Review "What if" | A16.22, A16.16 | L, M | Resume |
| Seasons 2-5 | Content seasons | A16.17 | L each | F3, F2 |
| Online-1 | Relay, friendlies, friends, spectating, ranked (trophies and Glicko, L8, Arena), Repeat order | A16.21 | L + M | WebKit goldens |
| Online-2 | A15.17 online items (seasons with carry-over, Daily leaderboards, Warbands) | A15.17 | L | Online-1 |
| Online-3 | Clans, reinforcements, clan raids | A16.21 | XL | Online-1 |
| Later | 2v2; commanders; the Twin Fronts experiment if triggered | A16.21, A16.12, A16.13 | XL each | |

### A16.25 Checkpoint A: the fun gate

The owner plays the battle slice (C3). The orchestrator gives exact steps in Danish, including the full links with the URL flags, and reports the `sim:exploits` smoke numbers and the headless wall-turtle number next to the owner's answers. Five tasks, about 1 hour in all:

| # | Task for the owner | Questions | If yes | If no |
|---|---|---|---|---|
| 1 | Play 5 Short Wars in Quick Battle, at least one on the phone in landscape | Does the battle feel good? Did any match drag at the end or stop at the Final Bell? Is Short War the right length? Is the phone tray comfortable? | Continue to Phase 2b | Feel and rules first (C3). Stalls weigh the A16.4 levers; length sets the Phase 3 clock; a tight tray moves fort placement to a long-press on the lane |
| 2 | Two matches at `&tier=7`: one pressing only the cheapest unit, one reacting to the bot and saving gold for waves | Does thinking beat spamming? Did saving gold and sending a wave feel like a real choice? | A16.3 confirmed; the wave hint stays as planned | WP3 fixes first, before Phase 2b ends; the hint becomes more visible |
| 3 | One match at `&tier=7&mods=glass_armies` (units have 30% less HP) | Better or worse when units die faster? | The HP lever (L1) may be adopted | L1 is excluded from A16.4 |
| 4 | 10 minutes in the wall sandbox: place walls for both sides, then push a Tuskback into a palisade with Pebblers behind it | Fun, or turtle-y and dull? Fixed spots or free placement? | Forts go on (A16.14 go or no-go, with the headless number) | Forts are parked; the underground scope is re-confirmed later |
| 5 | Two spoken questions and one look | Does the lane feel deep, or like "one blob pushing"? Would choosing one of two bonuses when you evolve be welcome? Looking at the 3D sprite GIF next to today's units: which style should future cards use? | Keep one lane; doctrines join the v1.1 list; the art tier sets the cost per card | Start the one-lane revisit (A16.13); doctrines wait for v1.2 or never; the art stays procedural |

### A16.26 Owner decisions

The owner answered on 2026-09-28 and accepted every recommendation, with the choices below (`docs/decisions.md`).

| # | Topic | Decision |
|---|---|---|
| O1 | 150+ cards needs about five funded content seasons (about 15 months after v1) | Seeds first in v1.1, then seasons as funding allows |
| O2 | The new top rarity tier | Ascended forms: prestige variants of Legendary cards with no extra power (A16.18) |
| O3 | Ranks in online ranked | Ranked shows trophies (progress) and a visible Glicko-2 rating (skill); the AI ladder keeps trophies only (A16.21) |
| O4 | Queue limits or unit cooldowns against spam | None: the data shows they hurt the answer more than the spam (A16.2) |
| O5 | When the home village comes | v1.1; v1 keeps today's Home (A16.22) |
| O6 | The village "trickle" | The existing Supply Capsule, shown as a wagon only when one is ready |
| O7 | Clan wars | Cooperative raids with no deadline and no race between clans (A16.21) |
| O8 | Naming a friend's plan played by the AI | "AI · Echo of Chief-4821", never "ghost" |
| O9 | Evolve doctrines | Only if the owner wants them after playing: asked at the fun gate (A16.25, task 5) and again after battlefields |
| O10 | v1.1 contract changes | v1.1 may change the battle engine for battlefields and weather, and the shared interfaces for share links, emotes and the village (A15.18) |
| O11 | Commanders | Put off until doctrines prove out (A16.12) |
| O12 | Bridge and Ford | They keep their rules only if they cause no more stalemates; otherwise the Bridge becomes a fast Causeway and the Ford is replaced (A16.9) |

Still open: O9, and whether future cards use the 3D sprite art tier. Both are decided after the owner has played the first battle (A16.25, task 5).

### A16.27 Review resolution

Every point of both reviews, with its verdict. "Accepted" means applied as written; "Changed" means applied in a modified form, with the reason; "Rejected" gives the reason.

#### Strategy-veteran review (SV)

| Point | Verdict | Where, and why |
|---|---|---|
| C1 The expert meta (waves into a defence) reaches the Bell, and the fix is untested | Accepted | A16.4 measures seven levers on the stall rows before anything is built |
| C1.1 Measure and gate the Save-and-counter mirror and Save-and-counter vs Turtle | Changed | Rows added and reported in v1, gated from v1.1 (A16.5): Phase 3 is numbers-only, so a v1 gate no known lever reaches would block release (BS 2) |
| C1.2 Whole-match lethality as the main lever, put to the owner as a feel question | Accepted | Lever L1; fun-gate task 3 |
| C1.3 Test a three-wide front | Accepted | Lever L4, beside L3 (WP2's third-rank request, the same stall cause) |
| C1.4 Fix Short War's clock | Changed | The numbers version (Overdrive 3:00, Siege 3:45, Bell 5:00) is lever L2 for Phase 3. "Overdrive once both sides reach the final age" is a rule change and waits until the numbers version is measured |
| C1.5 Keep the rope as the Bell tie-breaker | Changed | Lever L6, adopted only under A16.4's rule: it cut the turtle to 21-27%, below the owner's 35-45% band |
| C1.6 Report the turret share instead of gating it; reconsider "build turrets" | Accepted | A16.5; A16.3 rule 5 |
| C2 problem 1: break time does not grow with the attack | Accepted | Contact rule; wall HP 1 × Heavy (A16.14) |
| C2 problem 2: an instant stop button | Accepted | 5 s scaffold and 120 lu legality |
| C2 problem 3: outside pop | Accepted | 6 pop per fort |
| C2 problem 4: walls count 0 in D | Accepted | Walls count 2 × cost in D; answers through `aiHint.vsStructure` |
| C2 Wall bounty 60% | Accepted | A16.14 |
| C2 Headless wall-turtle number at Checkpoint A | Accepted | WP12 driver with emulated recharge, legality and cost. Pop, scaffold and contact cannot be emulated without sim code, so the number is a worst case with a burden-of-proof rule |
| C2 Traps are a rule of thumb; Stasis Mine plus a power is a sure combo | Changed | Traps stay as cheap variety under their own gates; no trap stuns, so the combo cannot exist |
| C3.1 Stacking budget | Changed | Additive, ±20%, range +15% (A16.1). Instead of deriving zone positions from the turret cap, no unit inside its own turret cover gets a range bonus: base ranges (up to 480) already cross mid-lane, and the rule targets out-ranging from safety directly |
| C3.2 Combination sweep in CI | Accepted | `sim:combos` (A16.8) |
| C3.3 Exploit search | Accepted | `tools/exploitSearch.ts` (A16.8), v1.1 |
| C4 Picks solvable before the match | Accepted | Pool rebuilt around the enemy's composition, weather and phase (A16.10) |
| C4 Fake train-time costs | Accepted | Costs in gold, pop, damage or damage taken only |
| C4 Plunder, Engineers | Accepted | Both cut |
| C4 Circular "pick matters" gate | Accepted | Pick-flip in ≥ 30% of sampled states |
| C4 Show the next offer from the start of the age | Accepted | A16.10 |
| C4 Wide Line as a formation doctrine | Accepted | A16.10 |
| C4 "+X while behind in age" | Rejected | Needs a new condition kind; the reactive pool already makes picks depend on the match |
| C5 Own-half features reward defence | Accepted | Cover dropped; the Ridge is central; Trenches sit on the approach (A16.9) |
| C5 Bridge and Ford at mid-lane tighten stalls | Accepted | Measured before any art, with fallbacks (O12) |
| C5 One fixed map per arena | Accepted | Ladder battlefields drawn by seed from every unlocked arena |
| C5 Whose units a zone helps | Accepted | Zones are in own progress and help only that side's units (A16.8) |
| C5 Keep the weather schedule | Accepted | A16.9 |
| C6 The mono gate can be passed at 55% | Accepted | A smooth answer rule (A16.3 rule 3) and the mono family gated at its worst mix |
| C6 Bait-and-switch | Accepted | Proxy gated ≤ 35% in v1, ≤ 25% from v1.1 |
| C6 The skill-gap gate can be met by weakening low tiers | Accepted | Bot tier gaps report-only; the rules-only skill gradient is gated |
| C6 Tiers VIII+ must play the wave game | Accepted | v1.1, AI only (A16.3) |
| C6 Standoff gates for power overflow | Accepted | Adoption conditions in A16.11 |
| C7 Keyword value is not costed | Accepted | `budgetBp` per keyword (A16.17) |
| C7 Plan-meta search | Accepted | `tools/metaSearch.ts`, gated from v1.2 |
| C7 Answers locked behind rarity | Accepted | Has-a-starter-answer |
| C7 Mythic as a cosmetic Ascended form | Accepted | Owner decision O2 (A16.18) |
| C7 Cut bonds | Accepted | A16.19 |
| C7 No sixth slot, for coverage reasons | Accepted | A16.19 |
| C7 Refund nerfed cards in Dust | Changed | Dust value of the copies spent, levels kept, no time limit: nothing earned is taken away and no deadline is created (A16.17) |
| C8 Cut the movable hold line | Accepted | A16.13 |
| C8 Defer commanders; no Twin Orders; summons pay bounty | Accepted | A16.12 |
| C8 Repeat order is fine | Accepted | Online, where there is no pause (A16.21) |
| C8 Hard cap on controls | Accepted | The v1 HUD is the ceiling, plus at most the Fort button (A16.1) |
| C9 Mirrored Draft War for ranked | Accepted | The "Arena" ranked queue (A16.21) |
| C9 AI fills must not move Glicko | Accepted | A16.21 |
| C9 Short War not the ranked default until its Bell rows pass | Accepted | A16.21 |
| C9 An honest offline skill number | Changed | Peak tier counts only wins where the player is at most 1 level above the opponent, rather than a separate track that would be a second number (A16.7) |
| C10 Puzzle tolerance test | Accepted | ±400 ms (A16.16) |
| C10 Counterfactual re-simulation; say the evaluation comes from AI games | Accepted | "What if" (v1.2); the graph note |
| C10 Review marks effects, not causes | Accepted | Lever notes attached to each key moment |
| C11 Raids become memorisation and a race of hours | Accepted | Fresh seed per attack, 3 attacks per member, cooperative total, no race (A16.21) |
| C11 No Legendary lends; lends pay bounty | Accepted | A16.21 |
| C11 2v2 front width and a greed proxy | Accepted | Front width 3; greed proxy ≤ 55% |
| C12 Supply wagon filling daily | Accepted | Shown only when a Supply Capsule is ready (A16.22) |
| C12 "Next stage at X" on Home | Accepted | Shown only inside each building |
| C12 Two moving ranks online | Changed | The owner chose to show both trophies (progress) and a visible rating in ranked (O3, A16.21). The rating is the only skill number there, and trophies never fall below the arena gate |
| C12 Taunt quips | Changed | Friendly or neutral quips only, in every mode, not only PvP: one rule is simpler to review |
| C12 "The rarest object in the game" | Accepted | Framing dropped (A16.18) |
| Keep as written (DP-1, DP-2, DP-4, DP-5, DP-6, DP-9, DP-10, Random Armies, Echo codes, the layer refactor, DP-11, DP-26 funding) | Accepted, two changed | DP-5 moves to a v1.1 experiment (BS 2); DP-11 is already done in code (BS 1) |
| v1 slice changes 1-5 | Accepted | A16.4, A16.5, A16.14, A16.17 |
| v1 slice change 6: village to v1.1 | Accepted | The owner chose v1.1 (O5) |
| "Can one lane last for years?" (four conditions) | Accepted | Used as the measured one-lane revisit trigger (A16.13) |

#### Builder-scope review (BS)

| Point | Verdict | Where, and why |
|---|---|---|
| 0 Verdict: trim the slice, fix sizes, resolve A15.18, list the breaking changes, fewer owner questions | Accepted | A16.23-A16.25 |
| 1 DP-11 already fixed | Accepted | Dropped (A16.8) |
| 1 DP-2 extends existing tools; pin the cadence | Accepted | 0.5 s pinned; audit numbers re-baselined (A16.5) |
| 1 DP-1 bugs are spec-conformance bugs | Accepted | A16.3 |
| 1 `standardLevels` arrives with A15.18 | Accepted | A16.7 |
| 1 The layer refactor is 53 lines in 14 files | Accepted | S-M (A16.15) |
| 1 Home is already built | Accepted | The village is extra cost (A16.22) |
| 1 `replayMatch` ignores `SIM_VERSION` | Accepted | XS major check in v1 (A16.20) |
| 1 A hidden palisade in shipped content breaks integrity tests | Accepted | Dev-page content clone (A16.14) |
| 2.1 Bot fixes on the critical path; measure turret rule | Accepted | A16.3; turret rule not adopted |
| 2.2 Siege field only if the harness supports it; cut the Overdrive field | Accepted | Lever L5; the Overdrive field is not built |
| 2.3 Fewer v1 gates | Changed | The Bell rows are reported or relaxed, with a release rule. Mono and bait-and-switch stay gated at 35%, near the measured fixed-bot value, because the smooth answer rule ships in v1 and needs a guard against tuning to the test (SV C6) |
| 2.4 Wall prototype on the dev page only | Accepted | A16.14 |
| 2.5 Drop DP-11 | Accepted | |
| 2.6 The trickle lesson reaches only onboarding | Accepted | The trickle loss tip ships even if A15.12 is cut (A16.6) |
| 2.7 Power overflow out of v1 | Accepted | A16.11 |
| 2.8 Keyword chips out of v1 | Accepted | v1.1, 10 shared keywords (A16.17) |
| 2.9 Standard-level rule | Accepted | A16.7 |
| 2.10a Village v0 out of Phase 2b; ask the owner at Checkpoint C | Accepted | The owner chose v1.1 (O5) |
| 2.10b Daily pairs out of v1 | Accepted | Stay A15.16 in v1.1 |
| 2 Three request files | Changed | Five, plus one line in A15's WP7 request: WP2 needs the version check and the lever branches, WP11 the URL flags and the hint |
| 3 Replay schema strips unknown keys | Accepted | A16.23 |
| 3 Save schema needs migrations | Accepted | A16.23 |
| 3 Cut the style vector | Accepted | A16.20 |
| 3 Presets up to 5, created empty | Accepted | A16.9 |
| 3 Content schema counts are a prerequisite | Accepted | A16.17 |
| 3 New gameplay tables inside `hashedSlice` | Accepted | A16.8 |
| 3 F1 touches every hot path | Accepted | F1-lite with only the kinds in use; phone budget re-measured |
| 3 Doctrine kinds F1 lacks | Accepted | Pool restricted; the few extra kinds listed |
| 3 Living units when a doctrine changes | Accepted | Doctrines never change max HP; all effects read live |
| 3 Full forts are L+ | Accepted | A16.14 |
| 3 Every AI axis re-passes tier ordering; the counter matrix cannot value walls | Accepted | A16.9, A16.10, A16.14 |
| 3 `isAI` literal types, new modes, `waveCap` | Accepted | A16.23 |
| 3 Art 60-110 hours; v1.1 is L-XL; v1.2 is several sessions | Accepted | A16.24 |
| 4 A15.18 says no sim change in v1.1 | Accepted | An explicit, narrow amendment (O10) |
| 4 v1.1 order | Changed | Danish, then A15's no-sim items and F3 before sharing, as advised; battlefields come before card stars because the owner approved them and they are seen in every match |
| 4 Puzzles from replay prefixes, after battle resume; the solver bot is new work | Accepted | A16.16 |
| 4 Merge only the v1 slice into DESIGN | Changed | A16 merges whole but is written compactly, with a merge note naming what v1 builders read; the proposal and reviews stay in history |
| 4 One doctrine pick flow | Accepted | Pick then evolve |
| 4 The one-lane trigger needs proxies that do not exist | Accepted | Owner feel in v1; a measured trigger from v1.1 (A16.13) |
| 4 Underground without forts | Accepted | Re-confirmed with the owner, since it is approved (A16.15) |
| 4 Cosmetic top tier | Accepted | O2 |
| 4 Quick Battle is hard-wired to tier III | Accepted | `&tier=` flag |
| 5 Wall recipe | Accepted | A16.14 |
| 5 `--patch` for data-only experiments | Accepted | A16.4 |
| 5 Five owner questions | Changed | Five tasks; one replaces the headless-only power question with SV's "units die faster" feel test, which costs nothing |
| 6 Contract list by phase | Accepted | A16.23 |

### A16.28 Rejected ideas

| Idea | Source | Why not | Instead |
|---|---|---|---|
| Per-card recharge on units, queue caps, an evolve price, a longer Ascension | Owner direction 3 | Audit V2, V3 and V9: they throttle the answer more than the spam, or add stalls | Trades, bot fixes, strict proxies |
| Kill bounty 45% or 75% | Audit | Spam wins, or Bells rise | 60% |
| A movable hold line | DP-7 | A per-map constant, another turtle tool and another control | Charge and Hold as today |
| A formation toggle | Owner direction 5 | More clicking than deciding | Wide Line doctrine, third-rank fix |
| Own-half Cover and high ground | DP-12 | Rewards holding, so both sides turtle | Central Ridge, forward Trenches |
| Bonds (card-family bonuses) | DP-15 | Meta-defining or invisible; pushes plans toward families | Keyword interactions |
| Plunder and Engineers doctrines; train-time costs | DP-14 | Turtle engines; fake costs | The A16.10 pool |
| Commanders now; Twin Orders; summons without bounty; instant gold | DP-16 | Largest axis, least need; click speed; bypasses anti-spam | Deferred with fixes |
| "Build turrets toward max" bot rule | DP-1 rule 4 | Turrets plus the push gate cause stalls | Turret share report-only |
| Gating bot tier gaps | DP-2 | Met by weakening low tiers | Rules-only skill gradient |
| `overdrive.unitDamageTakenBp` | DP-3 | No evidence | Levers L1-L6, measured |
| Power overflow in v1 | DP-5 | Evidence inside the noise band; 4 WPs | v1.1 experiment |
| Keyword chips and 25 glyphs in v1 | DP-25 | Cost in a full phase; most "keywords" are single-card text | 10 shared keywords in v1.1 |
| Daily modifier pairs in v1 | DP-36 stretch | `ModifierId` is a typed union; 15 smoke runs | A15.16 in v1.1 |
| Village v0 in Phase 2b | DP-36 | Home is already built; M art; A15.13 | The village in v1.1 (O5) |
| Instant walls, walls outside pop, walls at 2 × Heavy HP, walls ignored by the bot | DP-19 | Turtle engine and wave killer | Scaffold, pop, contact rule, 1 × HP, walls in D |
| Stunning traps | DP-19 | A trap plus a power telegraph is a sure hit | Damage and slow only |
| Hidden traps, night, fog of war | Owner direction 4 | A7.1 same information; per-side views are L | Visible traps and telegraphs |
| A sixth tray slot | Owner direction 2 | More coverage means less commitment; phone width | Fort slot, presets, a bigger pool |
| A Mythic card tier with its own power | DP-28 | Gives lucky or long-playing players options others lack; a random reward that affects play for minors | Ascended forms (O2) |
| Marketing a Holo Mythic as "the rarest object in the game" | DP-29 | Invites status chasing | Plain odds |
| A style vector for Echo | DP-30 | Needs saved history and new `MatchStats` fields A15.22 rejected | Balanced brain plus the plan |
| F4 scenarios for mined puzzles | DP-22 | Loses projectiles, statuses, timers and RNG state | Replay-prefix start |
| Taunting quips | DP-31 | Strangers may be minors | Friendly or neutral lines only |
| Timed clan wars, attack quotas, a race between clans | Clash of Clans; DP-33 | Obligation and deadline pressure (red lines 11-12) | Cooperative raids |
| Rewards for lending reinforcements; Legendary lends | Clash of Clans; DP-33 | Farming, pressure; free Legendaries | Lends pay nothing; no Legendaries |
| AI-filled matches moving a rating | D1 | Learning the bot farms rating | Only human matches move Glicko |
| Ranked at players' own levels | Clash Royale L16 | Levels beat skill | Standard L8 |
| A resource trickle on a clock; a wagon that fills daily | Owner direction 7; DP-36 | A15 rules 1 and 8; a "come back" cue and loss framing | Wagon shown only when a Supply Capsule is ready |
| "Next stage at X" meters on Home | DP-36 | A collage of meters (A15.13) | Progress inside each building |
| A curated rotating format; time-limited modes; offline monthly seasons | Hearthstone Twist; A15.22 | Cost; expiry | Seeded rotation; permanent modes |
| Holo odds boosts or a foil pity | A15.22 | Changes the exact roll | Crafting |
| Direct unit control | Stick War | Click speed | Doctrines, forts |
| Hero units in the lane at launch | Owner direction 1 | Largest art cost | Deferred with commanders |
| Two lanes in v1 | Owner direction 5 | Decided against with the owner | Revisit trigger and the Twin Fronts experiment |
| Stake or bet verbs | Marvel Snap | Grey for minors | Heat (A15.14) |
| In-session double-point streaks | lichess Arena | Rewards "one more" | none |

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
- **Local clocks** drive daily timers (reset 04:00), limited by the bank caps (charges 28, Supply allowance 7, Daily rewards 7, quest queue 21; A15.4).
- **Settings defaults** (A15.6): `breakReminder` true, `quickReveal` false, `vibrate` false. The same defaults apply to every player; there is no separate minor-safe mode.
- **Schema version.** Every A15.18 shape change lands before the Checkpoint C push, so SaveDoc stays at version 1 with no migration. After that push, every shape change needs a migration.

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
  - Daily Challenge seed, opponent, difficulty and reward bank (A15.7)
  - Supply allowance, quest queue and War Chest (A15.4, A15.5)
  - the feat tracker, fed each tick's `SimEvent`s by the session (A15.10)
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
- **`PlatformAdapter`:** v1 ships `NonePlatform` (no ads, `reelReveal: false`: there is no reel, A15.3). Poki, CrazyGames and Y8 adapters come later.
- **Session counters** (A15.6): session start, active play time and finished matches live in WP11 memory and are never saved. They drive the wrap, tilt and break cards and the night line. A match that never reaches its end is void.

## B12. Headless tools (`tools/`, run with tsx)

| Command | Does |
|---|---|
| `npm run sim:balance` | Runs on worker_threads. Per card: 2,000 mirrored-seed matches of the test plan vs the baseline plan (A2.14), both tier V Balanced at L7; passes when the 95% CI of the win-rate delta lies within ±3. Smoke mode (CI): 400 matches per card, ±6. Also reports match length distribution, evolve timings per strategy, Final Bell rate, first-mover rate, turret kill share, base time-to-kill and power coverage. Exits non-zero when an A2.14 target fails. Full run ≈ 1.5 h on 8 workers (nightly or manual) |
| `npm run sim:exploits` | Scripted player proxies vs a tier VII Balanced bot at L7, in Short and Full War (the smoke run includes Short War), at least 400 matches each, deciding every 0.5 s: (1) Treasury 3 greed, (2) 4-turret turtle with Hold (target 35-45%), (3) cheapest-unit spam, (4) Heavy plus mass Ranged at the pop cap, (5) mass splash (Grenadier, Bronze Cannon, Radio Operator), (6) heal stacking, (7) XP bank and double evolve, (8) power saved for evolve moments, plus the A16.5 proxies: random spam, the mono family (Heavy, AA, Ranged at mixes of 0-100%), bait-and-switch and Save-and-counter. A rules-sanity runner plays scripts against scripts (counter-picker, Balanced script). Targets per A2.14 |
| `--patch <file>` | On `sim:balance` and `sim:exploits`: a content override for data-only experiments, plus two harness hooks for the A16.4 stalemate levers and the wall-turtle driver (A16.14) |
| `npm run sim:economy` | 365-day player model (4 charged ladder wins per day at 60%, Supply Capsule, Clay meter, quests, War Chest, rewards by format, feats); checks A6.9 within ±20% and the copy/Amber finish gap ≤ 30 days. Also reports the day each v1 track ends, a weekly player's income against a daily player's for the same matches (target within 15%), the Supply and War Chest rates, and Dust after max (A15.20) |
| `npm run sim:drops` | 10^6 capsule openings; chi-square against published odds; bag totals; pity boundary checks |
| `npm run replay:verify <file>` | Re-simulates a replay and compares hashes |
| `npm run content:csv -- export\|import` | Balance CSV round trip |
| `npm run content:counters` | Regenerates the counter matrix (B4) |

Later tools (A16.8, A16.17): `sim:combos` (random full configurations of battlefield, weather, modifier and doctrine, v1.1), `tools/exploitSearch.ts` (a hill-climbed script family against tier VII, v1.1) and `tools/metaSearch.ts` (plan-meta search over the full pool, v1.2).

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
    capsule/                capsuleStage.ts climb.ts cardFan.ts walkout.ts summary.tsx
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
export type SkinRarity = 'rare' | 'epic' | 'legendary';                 // 'mythic' (Ascended forms) arrives in v1.2, A16.18
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

### B15.1 Phase 2b amendment (A15.18)

The code above is the frozen Phase 0 contract. At the start of Phase 2b the integration lead (WP0) makes one amendment, with the fakes and the v1 save fixture updated in the same change (request `docs/requests/a15-wp0-contracts.md`). Item 1 changes a field; the rest are optional additions, so code already written still compiles.

| # | Contract | Change | For |
|---|---|---|---|
| 1 | `SaveDoc.daily` | `{ dayKey: string; won: boolean }` becomes `{ dayKey: string; bank: number }` | Daily reward bank (A15.7) |
| 2 | `Meta.pickOpponent` options | + `daily?: { difficulty: 'recruit' \| 'veteran' \| 'warlord' }` | A15.7 |
| 3 | `OpponentSpec` | + `standardLevels?: boolean`, used by the Daily and Skirmish; tells `BattleSession` to put the player's side at L7 | A15.7, A16.7 |
| 4 | `MatchResultInput` | + `feats?: string[]` | A15.10 |
| 5 | `RewardStep` | + `{ kind: 'feat'; featId: string }` | A15.10 |
| 6 | `Settings` | + `breakReminder?: boolean` (default true), `quickReveal?: boolean` (default false) | A15.6 |

**Meaning changes with no type change** (JSDoc plus a `docs/decisions.md` entry):

- `capsules.charges`: bank maximum 28.
- `capsules.dailyBank`: the Supply allowance, maximum 7. `PendingCapsule.kind 'daily'` is shown as "Supply Capsule".
- `QuestState.daily`: a queue of up to 21; the first 3 are active.
- `QuestState.weekly`: War Chest progress (0-19), never reset; `weekKey` is unused. `PendingCrate.source` stays `weekly`.
- `ProfileStats.winsByTier`: Ladder, Daily Challenge and Conquest only.
- `WardrobeReveal.reelTiles`: may be empty (no reel).
- `NonePlatform.features.reelReveal`: `false` (a value, WP11).
- `Settings.vibrate`: default false (WP8 defaults).
- `flags['feat.<id>']` and `flags['featHint.<id>']`.
- `Meta.tickTimers`: charges, the Supply allowance, the Daily reward bank and the quest queue at 04:00; it never resets the War Chest.

The same Phase 2b batch carries the pending `MatchStats.ageTimesMs` and `Observation.foe.lastEmote` requests. A16 adds no contract change in v1; its only possible sim field is `EconomyRules.siege.unitDamageTakenBp?`, if lever L5 is adopted (A16.23). Later contract changes are listed in A15.18 and A16.23.

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

- root configs, `index.html`, `README.md`, `docs/**` (`.github/workflows/ci.yml` and `pages.yml` already exist; agents do not edit them)
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
10. Phase 2b, as lead: the one contract amendment in B15.1 (A15.18) with fakes and the v1 fixture; the decisions.md entries it names.

**DoD:** `npm run dev` shows a Pixi canvas with a Preact shell and a `?dev=1` page list; `npm test` and `npm run lint` pass; CI is green on GitHub.

### WP1: Content schema, compiler, strings, counters (Phase 1)

**Owns:** `src/content/**` except `raw/`, `src/i18n/content.en.json`, `tools/counters.ts`

**Tasks:**

- Encode every remaining Part A table: 5 ages, 4 formats, 12 skins, cosmetics, capsule tables and bag, rarities, arenas, the 60-node Trophy Road, 10 generals plus Echo, name tables, quests, 6 daily modifiers.
- Write `schema.ts` and `compile.ts` (ticks, centi-units, bp, pop, hash).
- Write the counter-matrix generator and commit `generated/counters.json`.
- Write English strings for all content. Keys are final; Danish files follow in v1.1.
- Phase 2b (A15.18, A16.6): rewards by format, the Daily table (bank, difficulties, standard level, opponent pool), charges 28, the Supply rules, the quest queue and weights, the War Chest, the `feats` table, stretch tables (foil prices, Amber to Dust, tip thresholds), the A15 strings and the trickle tip.

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
- Phase 2b (A16.4, A16.20): `replayMatch` checks the `SIM_VERSION` major; branches for the stalemate levers L3-L6; at most two adopted sim changes in one major bump with re-recorded goldens.

**Provides:** `createSim`, `replayMatch`, `Observation`, the `SimEvent` stream, `MatchStats`.

**DoD:**

- All B13 sim tests pass: 10 golden replays on fixture content, determinism, invariants, benchmark ≤ 400 ms.
- A sandbox panel (`src/dev/sandbox/simPanel.tsx`) can spawn any card on either side and step the sim.

### WP3: AI generals (Phase 1, from the WP0 contracts)

**Owns:** `src/ai/**`, `src/dev/botViewer/**`

**Tasks:**

- Implement the A7.2 utility AI with its formulas, tiers 0-X (interpolated), personalities, openings, mistakes, the push gate, the attack clock, the gold estimator, the emote rule, the scripted Grogg brain and the Echo brain.
- Before Phase 2a ends: the A16.3 fixes (save for a counter, evolve on time, the smooth answer to one-type armies, no Legendary saving goal while the push gate fails).

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
- Phase 2a: the wall sandbox prototype on the sandbox dev page (A16.14), with no sim, contract, content or art change.

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

**Tasks:** everything in B9 and A6: new save (12 charges, 10 free capsules), rewards, charges and the Clay meter, daily timers at 04:00, bag, roll, pity, foil, script, wardrobe, upgrades, crafting, Dust, War Plan validation, auto-fill, Equip now and advisor, trophies, arenas and road, quests, Codex Level, Conquest, MMR, tier choice and opponent picking (A6.8), daily modifiers. Phase 2b: the A15 rules (banks and the Supply Capsule, quest queue and weights, War Chest and counting wins, Daily Challenge 2.0, rewards by format, the feat tracker, peak tier at even levels, the Rookie disclosure; stretch: foil crafting and Amber to Dust).

**DoD:** all meta tests in B13 pass, including 10^6-opening statistics (run in `tools/drops.ts`, with a 10^5 variant in unit tests).

### WP8: Save system (Phase 1)

**Owns:** `src/save/**`

**Tasks:** Valibot schema for SaveDoc (with the type-parity test), defaults, localStorage store with dual slots and checksums, debounce and flush hooks, migrations framework with the v1 fixture, export/import codes and files, replay ring, event log store, `persist()` helper. Phase 2b: the B15.1 schema changes and the A15 settings defaults (B8), still at SaveDoc version 1.

**DoD:** round-trip, corruption-fallback and migration tests pass; quota errors are caught with a user-facing message.

### WP9: Meta UI screens (Phase 1 against fakes; Phase 2 wiring)

**Owns:** `src/ui/router.ts`, `src/ui/theme.css`, `src/ui/components/**`, `src/ui/screens/**` (except `hud`), `src/i18n/ui.en.json`

**Tasks:**

- Screens 2-4, 6-7, 9-13, 15 and 17 (A9).
- Components: card tile with foil frames, copies bar, rarity frames, currency chips, Clay meter, buttons, modal, tabs, odds sheet, toasts, age picker.
- Responsive landscape layout and the portrait rotate overlay.
- All text through i18n. Touch targets ≥ 48 px.
- Phase 2b (A15): Home (War Chest bar, Supply progress in the tray, charges without timers), the Result budget and cards (A15.13, A15.6), Settings (break reminder, quick reveal, For parents), the Daily difficulty picker and Copy result, the Feats tab, the Profile peak tier, the Conquest ladder, the format picker's rewards; stretch: the foil crafting button and result tips.

**DoD:** every screen renders with the fake save in the states new player, mid-game and maxed; keyboard navigation works; EN strings are complete.

### WP10: Capsule and crate show (Phase 1)

**Owns:** `src/capsule/**`, `src/i18n/capsule.en.json`, `src/dev/capsuleBench/**`

**Tasks:** the full A10 storyboard in Pixi plus DOM (back-loaded climbs, burst, card fan, rarity pre-signal, foil shine, Epic mini-walkout, Legendary walkout, duplicates, summary with Equip now, Open all), the card-flip reveal for the Wardrobe Crate (there is no reel; a `reel.ts` from Phase 1 is deleted), quick reveal and the A15.3 honesty lines. It consumes the `CapsuleReveal` and `WardrobeReveal` data only.

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
- Phase 2a: Quick Battle URL flags `&tier=` and `&mods=` (A16.25).
- Phase 2b: session counters, the wrap, tilt and break cards, the night line and the void rule (A15.6); `NonePlatform.features.reelReveal: false`; Standard levels in the session; feeding the feat tracker; the trickle detector and hint (A16.6).

**DoD:**

- A fresh profile plays A8 end to end.
- Ladder, Conquest, Skirmish and Daily modes work.
- Replays of the last 20 matches play back with an identical outcome.

### WP12: Tools, integrity tests, CI, e2e (Phase 1 start, Phase 3 lead)

**Owns:** `tools/**` except `tools/counters.ts`, `tests/**` except `tests/fixtures/content` (CI workflow changes go through `docs/requests/wp12-ci.md`)

**Tasks:**

- `sim-cli` balance matrix on worker_threads, exploit proxies, economy sim, drop stats, replay verify, CSV round trip.
- Integrity tests (IDs, string keys, layer graph, hard-coded strings).
- Playwright smoke.
- CI stages: smoke balance on push; full balance and exploits via nightly or manual `workflow_dispatch`.
- The autopilot URL flag (in coordination with WP11).
- Phase 2a and 2b (A16.5, A16.14): the headless wall-turtle number, the new proxies and A2.14 rows, the rules-sanity runner, Short War in the smoke run, `--patch` and the harness hooks. Phase 3: the `sim:economy` additions and tests in A15.20.

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

Checkpoint A is the fun gate. If the core loop does not feel good there, feel and rule tuning comes before more meta work. The owner plays five short tasks there (A16.25): Short Wars on desktop and phone, spam against thinking at `&tier=7`, a Glass Armies match, the wall sandbox, and three questions (one blob or deep, evolve doctrines, the 3D sprite art tier). The orchestrator gives exact steps in Danish and reports the `sim:exploits` smoke numbers and the headless wall-turtle number next to the answers.

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

24. A new save starts with 12 charges; the first 10 capsules use none; charges refill at 1 per 6 h and bank to 28, and a full bank says it has stopped filling.
25. A ladder win grants trophies, Amber and a capsule while charges are available, and 40 Amber plus a Clay pip when none are; losses give 15 Amber and a pip; 3 pips give a Clay capsule.
26. The Supply allowance banks to 7; 3 new quests join the queue at 04:00; loss protection "Warm-up match" appears after 3 losses.
27. The odds sheet shows the bag state (30/40/20/7/3) and pity counters, and the counters match what happens.
28. Capsule strikes never show a non-climb after a climb.
29. "Open all" works for 10 capsules; reloading mid-animation keeps the same result.
30. An upgrade spends copies and Amber, raises stats by +5% (card detail preview matches), and grants Codex points.
31. A copy past L10 becomes Dust; crafting a card and a crate skin works; Crystal Spire cannot be crafted.
32. The War Plan builder enforces the rules, shows advisor warnings, and auto-fill and Equip now work; presets save.
33. The Trophy Road claims nodes; 150 trophies unlocks Standard War, the ladder format picker and the Modern and Future Age Unlock Capsules; alternate powers unlock at 100-500.
34. Conquest opens at Arena 3; stars and milestones pay once.
35. Quests progress from real matches; Skirmish counts only for Play and Train; reroll works once per day.
36. The Wardrobe Crate reveals its pre-rolled skin with the card flip; no reel exists.
37. Foils appear on reveal and on the card in the tray.

**Presentation and platform**

38. Every opponent shows the AI badge on VS, the HUD nameplate, the result screen and history. About says "All opponents in this version are AI."
39. Colourblind presets and reduce motion change visuals as specified; volume buses work separately.
40. No hard-coded UI strings (integrity test); the language setting shows EN.
41. Save export code and file both import on a fresh browser profile.
42. A replay from history plays to the same result.
43. Performance: Full War sandbox at 60 fps on desktop and ≥ 30 fps in Lite on a mid-range phone; no console errors.
44. iPhone Safari: sound plays after the first tap; the layout respects safe areas; the tray fits on an 844 px landscape phone; portrait shows the rotate overlay.

**Engagement (A15.20)**

45. The first Supply Capsule appears after capsule 2; later ones need 3 finished matches each; the allowance banks 7. Charges bank 28. The quest panel shows 3 quests.
46. The War Chest fills from counting wins only (never Skirmish), grants at 20 and never resets.
47. The Daily offers three difficulties, shows the same opponent in two browsers set to the same date, pays from the bank, and Copy result copies the line with no name.
48. The wrap, tilt and break cards appear as specified, never in battle, with Home as the primary button. The night line appears after 22:00.
49. Closing the tab mid-match changes nothing. Retreat still counts as a loss.
50. Feats show "???" rows and Show hint; a found feat stages its own step and pays once.
51. The Wardrobe Crate uses the card flip and no reel exists. Quick reveal skips climbs.
52. Settings > For parents shows every line. Vibration is off by default.
53. Copy review: no string says "Nothing is lost while you're away", "Everything waits for you" or "we missed you", and none shows a countdown.

---

# Part D. Roadmap and risks

## D1. Roadmap after v1

This section is the original roadmap. The ranked wishlist after v1, which merges it with A15 and A16, is A16.24; where they differ, A15, A16 and A16.24 win. Nothing after v1 is funded.

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
- More skins. (The Mythic tier moved to v1.2 as Ascended forms, A16.18.)
- Daily modifiers Turret Holiday and Mirror Match.
- Alternate Dawn March melodies for the owner to choose from.
- Share codes and Echo challenges: a friend's War Plan played by "AI · Echo of Chief-4821", never called a ghost (A15.15, A16.20).
- Feats to 30 and secrets (A15.16), replacing the planned achievements.
- More quests.
- The "Who wins?" sandbox (for example 100 Bonkers vs 1 Chrono Titan).
- Screenshot tests for the gallery.

**v1.2: content and modes**

- The sixth age, Bronze/Antiquity (+11 cards, 2 powers, base, backdrop, arrangement), inserted as data.
- 1-2 extra cards per age, designed as role sidegrades, not new roles.
- The "Chronicle" campaign (~30 levels with disclosed modifiers).
- Endless Horde mode (A16.12).
- Boss Battles as a permanent numbered gallery (A16.12). The weekly kaiju event is dropped: no time-limited modes.
- Mythic tier as Ascended forms: cosmetic prestige variants of Legendary units with no extra power, pity at 150 eligible capsules, craftable (A16.18).
- Portrait layout.
- PWA install (manifest plus service worker cache), with no notifications of any kind (A15.1 red line 4).
- Card stars as challenges (A15.14) replace star levels.

**Online 1v1 (first multiplayer milestone)**

- **Server.** Colyseus 0.17 room in `server/` hosting the same `src/sim` code (split into a workspace package at that point).
- **Netcode:**
  - Authoritative input relay: the server stamps commands at the execution tick now + 4 (200 ms, hidden by the spawn gate animation).
  - Clients simulate deterministically; hashes are compared every 20 ticks.
  - On mismatch or reconnect, the server sends a snapshot; the server keeps the command log for verification.
- **Rules for PvP:**
  - No pause or speed.
  - Global hitstop becomes view-only.
  - Ranked sets every card to exactly L8 (A16.7).
  - Ranked shows trophies (progress) and a visible Glicko-2 rating (skill, matchmaking) (A16.21).
  - AI Generals remain on the ladder with their AI labels when queues are thin; those matches never move the rating.
  - Online systems follow the safety rules for minors in A16.21.
- **Infrastructure:** accounts (optional sign-in), cloud save behind `SaveStore`, and anti-tamper, meaning the server rolls capsules for online accounts.

**2v2**

- One lane; each team shares one base (HP ×1.6) and 4 mounts (2 per player).
- Gold, XP, War Plans and ages stay individual. The team base's age is the highest age on the team.
- Pop cap 42 per player; front width 3 (A16.21).
- Emotes only; no chat.
- Bot fill for missing players, labeled AI.

**Mobile app**

- Capacitor 8 wrapper with native storage (Preferences/SQLite) behind `SaveStore`, haptics and store assets.
- The same web build otherwise.
- Portal SDK adapters (Poki or CrazyGames/Y8). The Poki exclusivity decision is made before any portal launch. No build has a reel (A15.3).

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
| Capsules read as gambling | Portal rejection, backlash | Earn-only forever, no store or payment code, published bag odds, visible pity, pre-rolled results, back-loaded climbs with no near misses, no reel (card flip everywhere), honesty lines on every odds panel (A15.3) |
| Economy pacing too fast or too slow | Boredom or grind | 365-day economy sim with ±20% gates; every reward is a data knob |
| Match length drifts | Stalemates or abrupt games | Format clocks set hard limits; base time-to-kill target; CI checks the length distribution |
| iOS audio unlock and mute switch | Silent game on iPhones | Unlock on first gesture; a Settings note about the mute switch |
| TypeScript or tooling version churn (TS 7, Vite 8) | Broken builds | Exact version pins, lockfile committed, TS 7 deferred, Vite 7 fallback |
| Name or trademark conflict | Forced rename | TMview and domain checks before any public link; the name lives in one config constant and the i18n files |
| Too close to the classics | "Reskin" reputation | Own names, art and sound; swapped default powers; signature traits on commons; split-age lane, Last Stand and capsules as identity |
| PvP population small later | Empty queues | PvE, Conquest, AI Generals and Echo modes carry the game; PvP is never the only fun mode |

**Cut order if v1 slips.** Cut from the top of this list. Never cut the 5 ages, the 55 cards, capsules, upgrades, bots or the evolve sequence.

1. Daily modifiers beyond 3.
2. Replay viewer UI (recording and verify stay).
3. Foil shine animation (static foil frames stay).
4. Skins down to 6 (one per age plus Crystal Spire).
5. Conquest stars 2 and 3 (wins stay).
6. Dev pages: bot viewer and replay debugger.
7. Echo of You.

The Wardrobe reel is no longer on this list: it is not built (A15.3). The A15 v1 slice has its own cut order (A15.19).

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
- **Mythic hard pity at 40 crates (player 17).** Superseded: the Mythic tier arrives in v1.2 as Ascended forms, with pity at 150 eligible capsules (A16.18).
- **New mechanics on commons (player 20).** Applied to one common per age from Stone to Modern (ricochet, Shield Wall, Boarding Hook, suppression). Future already has the Photon Knight shield. Only the three named default powers are swapped; Arrow Storm stays the Medieval default because the tutorial teaches dragging with it.
