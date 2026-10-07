# Ageborn v1: definitive design document

This document is the single source of truth for the v1 build. Version 1.3, 2026-09-28: A17 (a longer lane and eight ages, mostly built) and A18 (harder, longer, deeper: pacing, the War Council, stances, difficulty, the War Path, more ages, new classes and the road to online; decided, not yet built) merged, with the owner's decisions of 2026-09-28. Version 1.2 merged A15 and A16.

Changes since 1.3: 2026-09-29, owner request "more capsule tiers": the capsule ladder has 7 tiers (Clay, Bronze, Silver, Jade, Gold, Platinum, Aeon), a 200-slot Win Capsule bag with exactly 1 Aeon, 2 Platinum and 4 Gold per 200, new Supply odds, the Aeon Collection (craftable after a first Aeon), summit strikes, climbing capsules that hide their tier until opened, and a save migration (A6.3, A6.4, A6.5, A6.9, A9, A10; one-line follow-ups in A6.2, A13, A15.4, A16.18, A17.13, B8, B13, B15 and C5; reasons and the review round in `docs/decisions.md`; per-package requests in `docs/requests/capsule-tiers-*.md`).

Changes since 1.3: 2026-09-29, owner request "powers cost gold, reload, more powers, own-half limits" (the power rework; decided, not built): every Age Power costs gold and reloads on its own; each age loadout has a Home slot (powers that touch only enemies in your own half) and a Field slot (near your army, precise strikes, buffs, drops, turret suppression); one cast affects at most 1-6 enemy units, and only the enemies nearest the caster's gate (the screen); buffs affect at most 8 own units; 48 powers instead of 16, from starters, the Trophy Road and the War Path, never capsules; the combined rules are measured in build phase P0 before any contract change (A2.9 and A5.7 rewritten; one-line follow-ups in A1, A2.1, A2.3, A2.4, A2.6, A2.7, A2.10-A2.14, A3, A5.1, A6.3, A7.1-A7.4, A9.1, A9.2, A13, A14.1, A16.10, A16.11, A16.14, A17.4-A17.6, A17.8, A17.11, A17.13, A17.14, A18.2, A18.3.1, A18.5.5, A18.7.5-A18.7.8, A18.9.2, A18.9.3, A18.12, A18.13, B3, B15 and C5; reasons in `docs/decisions.md`; requests in `docs/requests/powers-sources.md`, `docs/requests/powers-hud-army.md` and `docs/requests/powers-p1-compat.md`). Where A2.9 and an older mention of the power charge, the power ring or "one power per age" differ, A2.9 wins.

Changes since 1.3: 2026-09-30, owner request "a free capsule every 5 hours" (2026-09-29): the Sundial readies a capsule every 5 hours, holds 34 (7 days), and any finished match but the tutorial or a Retreat claims one, win or lose; it replaces capsule charges and the Supply allowance, the Win Capsule is now called the Sundial Capsule (same bag), and the Clay meter needs 2 pips (A6.3, A15.4; follow-ups in A6.2, A6.4, A6.5, A6.9, A6.10, A9, A15.2, A15.3, A15.6, A15.7, A15.8, A15.13, A15.14, A15.18, A15.20, B8, C5; reasons and measurements in `docs/decisions.md`).

Changes since 1.3: 2026-09-30, owner request "a class of fixed structures on the lane" (2026-09-29; decided, not built): the Fort class of A16.14 gets four kinds per age (walls, towers that shoot but stand still, camps that send free, very weak levies, traps; 32 cards), one Fort slot per age loadout, Home pads for every kind and Field pads for camps, Siege crumbles forts, never capsules; an indicative emulation on the current build (A16.14.1-A16.14.9; revision 2 the same day after a critic pass: Home pads moved into turret cover at 160, 230 and 300, tower cover capped at p 560, fast decay from the start of Siege, hidden twin unit cards and a complete contract list, levies cost 0 and rank last in power caps, a 5-attacker contact cap, ranged attacks prefer the base over forts, safe pads for the AI, bots limited to forts the player could own, no pre-placed boss fort, and F0 re-measures everything before the go/no-go; follow-ups in A18.5.3, A18.7.5, A18.7.8, A18.9, A18.9.3, A18.11, A18.12, A18.13; reasons in `docs/decisions.md`).

The document has four parts plus an appendix:

- **Part A:** game design. It ends with A15 (engagement and long-term progression), A16 (strategic depth, variety and long-term play, with the ranked wishlist after v1 in A16.24), A17 (a longer lane and eight ages) and A18 (harder, longer, deeper). Where A18 and an older section differ, A18 wins; the older text is updated and points to it. A rule marked "A18" takes effect in the build with its A18.13 phase; until then the build follows the older rule, which is kept beside it.
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
- **Starter kit changed.** It holds every common plus each age's Anti-armor (Anti-heavy) Rare from the first launch, in slot 4 of every starter loadout (build phase H3, 2026-09-30; A5.1, A6.5). A new player therefore always has a full counter triangle.

### 0.3 Review round

Version 1.1 applies three critiques (player, builder, balance). Points that were rejected, merged with another critique's version, or implemented differently are listed in the appendix.

---

# Part A. Game design

## A1. Vision and pillars

**Working title: Ageborn.** Tagline: "From clubs to lasers in one battle."

Ageborn is a one-lane tug-of-war battler. Two bases face each other, warriors walk and fight on their own, and turrets sit on the base. XP pushes you into the next age, and each age brings its Age Powers, two in every battle loadout, each paid in gold and reloading on its own (A2.9). Around the battle sits a Clash Royale-style meta:

- a War Plan (one loadout per age)
- a collection with rarities and foil variants
- Time Capsules with an exciting, honest reveal
- upgrades, skins and cosmetic collections, a Trophy Road, and the War Path, a saga-map campaign against AI Generals at the centre of Home (A18.7; it absorbs the old Conquest board)

No real money exists anywhere in the game.

Before public use, the name needs a TMview (EUIPO/USPTO) and domain check. "Age of War" never appears in the title, tags or keywords.

**Pillars (priority order)**

1. **Familiar in 10 seconds.** Tap a card and a warrior walks out and fights. Match one teaches by doing and ends with lasers.
2. **Evolving is the best moment of every match.** It brings a big visual transformation, new-age troops on the lane at once, and a music key change. Since A18 (owner decision D1) evolves are rarer: every age has an arrival, a middle and a push (about 60-125 s per age, A18.3.1), and each evolve also opens new research ranks (A18.5).
3. **A decision every 5-10 seconds.** Which unit, save or spend, turret or army, evolve now or fire the power first.
4. **Honesty.** Bots follow the player's rules and are labeled AI. Capsule odds, pity counters and bot difficulty are always visible. Nothing is for sale. Every promise on screen is literally true. Nothing a player has earned is ever taken away, and stopping, whether mid-match or for a month, never costs anything the player owns (A15.1).
5. **Readable chaos.** Juice scales with how much an event matters, and it never hides the state of the lane.

A sixth, technical pillar: art, sound and balance are data. The simulation owns all timing, so swapping art can never change balance.

**What we keep and what we fix from the classics**

| Classic element | v1 decision |
|---|---|
| One lane, two bases, tap only | Keep |
| Units walk and fight automatically | Keep, plus three stances: Charge, Hold at a draggable flag, Fall back (A18.4) |
| XP to evolve through 5 ages | 8 ages built (Stone, Bronze, Medieval, Gunpowder, Industrial, Modern, Future, Cosmic, A17); 13 as the target (A18.8). A match plays a window of 3, 5 or 7 consecutive ages (A18.3.4) |
| Training queue of 5 | Keep; queued units upgrade to the new age on evolve |
| 4 turret slots, 50% sell refund | Keep, plus one-tap Modernise. Range capped at 480 lu (24% of the 2,000 lu lane); research may add range up to a hard cap of 560 lu (A18.5.3); turrets never hit bases |
| Kill bounty 130% of cost (AoW1) | 50% of cost (A18.3.3; 60% until A18 phase 1); kills by powers pay 30% and no XP |
| XP when your own unit dies | 50% of cost (A18.3.2; 40% until A18 phase 1) |
| Money upgrades that are a linear buy | The War Council: in-battle research with 1-of-2 picks in four tracks (A18.5) |
| Free special on a cooldown | Keep as a charge meter; it never costs XP |
| Unit prices inflating 15 → 150,000 | Flat prices by role; power comes from age and card level |
| AI with free gold and timer evolution | Bots use the same economy, the same command API and only a limited observation |
| Turtling, AFK farming, 40-minute stalemates | Match clock with Overdrive, Siege and Final Bell; XP from base damage; turret caps; bots that refuse to feed turrets |
| Queued units idle behind the front | Three-wide melee front rank (A17.3); reach and ranged units attack from behind; faster units overtake parked ranged units |
| A long lane you scroll along | 2,000 lu lane with a scrolling, auto-following camera and a minimap (A17) |
| Slow walking, no pause, mute or save | ~23 s lane crossing (A17.2), 1x/1.5x/2x speed, pause, 4 volume buses, autosave plus export |
| Flashing evolve reminder | Steady glow only |
| Army of Ages wiping units on evolve | Units and turrets survive evolving |

## A2. Core battle rules

### A2.1 Lane, coordinates, camera

- **Lane.** 2,000 lu from the left gate (world x = 0) to the right gate (x = 2,000) since A17 (was 1,200). L = 2,000 below; rules about the whole lane scale with L, rules about home defence keep their size (A17.3).
  - The player (side 0) is on the left, faces right and plays blue. The opponent (side 1) is on the right, faces left and plays orange.
  - Each base occupies 140 lu behind its gate, outside the fighting area.
- **Progress.** Each side measures progress p from its own gate: side 0 has p = x, side 1 has p = 2,000 − x. Rules below use p unless stated. Rules stated from the enemy gate are written `L − x`.
- **Key positions:**
  - spawn at p = 20
  - hold line at p = 320
  - turret range cap 480 lu, measured from the own gate
  - mid-lane at p = 1,000 (L / 2)
  - power zone centres clamped to p ∈ [150, 1,850] (L − 150); the Home line at p = 1,000 (mid-lane): a Home power's whole zone lies on your side of it (A2.9.4)
  - the Hold flag range [320, 800] (A18.4.2)
- **Crossing time.** Table speeds run 35-100 lu/s; every unit walks at table speed × 1.25 (`economy.marchSpeedBp` 12,500, A17.2). Standard infantry (70 lu/s) crosses in ~23 s.
- **Camera (A17.4-A17.7).** The world is 2,360 lu (x −180 to 2,180). The camera shows a window of it at a world scale set by device class (about 40% of the world on a phone, 60% on a desktop), with zoom 0.8-1.25. The player drags, swipes, scrolls, uses the arrow keys or edge scroll, or taps the minimap; auto-follow (default On, a setting) frames the fight whenever the player is not scrolling. A minimap strip shows the whole lane, and off-screen badges warn of attacks on the base, powers and enemy Legendaries. The camera is view-only and never touches the sim.
- **Screen layout (landscape, v1 is landscape only):** by device class (A17.7): phones (height < 500 CSS px) top bar 10% (min 36 px), lane band 68%, tray 22%; tablets and desktops 12% / 64% / 24%. Portrait shows a "Rotate your device" overlay.
- **Depth.** The sim is 1D. The view places units in depth rows by their rank in the side's order: the three front-rank units get y = −12, 0 and +12 lu (A17.3: three-wide front), and every other unit gets y = −16, 0 or +16 lu by (rank index mod 3). In the Siege crowd (own p ≥ L − 90) units spread over seven rows (−20, 8, −6, 20, −26, 14, 0), each later round 4 lu further back. The view depth-sorts by y. The sim spacing is unaffected.

### A2.2 Bases and the age power scale

| Age index | Age | P | P (bp) | Base max HP |
|---|---|---|---|---|
| 0 | Stone | 1.00 | 10,000 | 10,000 |
| 1 | Bronze (A17) | 1.16 | 11,600 | 11,600 |
| 2 | Medieval | 1.35 | 13,500 | 13,500 |
| 3 | Gunpowder | 1.82 | 18,200 | 18,200 |
| 4 | Industrial (A17) | 2.12 | 21,200 | 21,200 |
| 5 | Modern | 2.46 | 24,600 | 24,600 |
| 6 | Future | 3.32 | 33,200 | 33,200 |
| 7 | Cosmic (A17) | 4.48 | 44,800 | 44,800 |

Bronze and Industrial are half steps (×1.16, the geometric midpoint of their neighbours); the others are ×1.35 steps (A17.8). A18.8 adds five more ages at geometric steps between these (Nile 1.08, Rome 1.22, Norse 1.28, Shogun 1.49, Renaissance 1.65), which shifts `AgeDef.index` but changes no existing P. A match may start in a later age (A18.3.4): its base starts at that age's P and HP.

- Base max HP equals **8,000 × P** (MVP balance pass 2026-10-01; was 10,000 × P, at which a full 60-pop army needed 126 s). A2.14 checks that a full unopposed army needs 40-60 s to destroy a base.
- P is already baked into every card stat in A5 (tables list final level-1 values for their age).
- Base max HP follows the owner's current age.
- On evolve the base keeps its HP percentage and then heals 5% of the new max, capped at max.
- An age-N unit beats its previous-age counterpart one-on-one with about half its HP left after a ×1.35 step and about a quarter after a half step. A same-gold army is ~1.8x stronger after a ×1.35 step: a real edge that turrets and the defender's short walk can hold for 20-40 s.
- Bases do not attack, except Last Stand (A2.11).
- Each base shows its Treasury level (gatherer count) and, while Last Stand is armed, a horn icon. From A18.5 the Treasury is gone; the base shows the War Council workshop glyph with the current research icon and its progress ring instead.

### A2.3 Gold (in battle)

Gold and XP are stored internally in milli-units.

| Rule | Value |
|---|---|
| Starting gold | 175 |
| Passive income | 6 gold/s (×2 in Overdrive and Siege) |
| Treasury upgrade | **Replaced by the War Council's Economy track (A18.5.4, owner decision D3).** Until A18 phase 3: 3 levels, each +1.5 gold/s; costs 200 / 350 / 550 (payback 133 / 233 / 367 s). Treasury income is never doubled by Overdrive. The art changes per age (gatherers, farm, trade cart, factory, fusion core); the numbers do not |
| War Council research (A18.5) | Gold spent on one research item at a time in four tracks (Troops, Defences, Economy, Command); rank I 150, rank II 300, rank III 450-500; −20% for the side that is behind. Economy income is never doubled by Overdrive |
| Kill bounty | 50% of the victim's card cost (A18.3.3; 60% until A18 phase 1), credited to the killing side for kills by units, turrets and unit abilities |
| Power and Last Stand kills | 30% of the victim's card cost in gold, no XP |
| Age Power casts (power rework, A2.9.2) | Each cast costs its power's gold (75-150, strikes 50-150, flat across ages), paid when the command is accepted, never refunded. Until build phase P1 powers are free |
| Underdog bounty | +50% gold and XP when the victim's card age index is higher than the killer side's current age index. It is off while the killer side's Evolve is available |
| Summoned units (riders, Paratroopers, Vanguard) | No bounty and no loss XP for either side |
| Falling gate (A17.3, built) | In Overdrive and Siege, a unit killed within **300 lu** of its own gate (MVP balance pass 2026-10-01; was 120) by an enemy unit, turret or unit ability costs its base the unit's max HP as base damage by the killer |
| Unit and turret prices | Flat across ages (A5) |
| Turret sell refund | 50% of turret cost (slot purchases are never refunded) |
| Modernise | New turret price minus 50% of the old turret's price (the Engineers research halves this price, A18.5.3) |
| Turret slots | Mount 1 free; mounts 2 / 3 / 4 cost 150 / 350 / 700 |

### A2.4 XP and evolving

**Superseded by A18.3.2 (owner decision D1: slower evolving).** The table shows the A18 values; the build uses the "Until A18 phase 1" column until the pacing data switch ships with the War Council (A18.13 phases 1 and 3).

| XP source | A18 | Until A18 phase 1 |
|---|---|---|
| Passive trickle | 5 XP/s (×2 in Overdrive and Siege) | 4 XP/s |
| Killing an enemy unit with a unit, turret or unit ability | 70% of its card cost (+50% underdog) | 100% |
| Killing with an Age Power or Last Stand | 0 | 0 |
| Losing your own unit (not summons) | 50% of its card cost | 40% |
| Damaging the enemy base | 8 XP per 1% of that base's current max HP (XP = damage × 800 / maxHp) | 12 XP per 1% |

- **Thresholds (A18.3.2).** They follow the position in the match's age window, not the age: evolving out of the window's 1st age costs 700 XP, then 1,250, 1,350, 1,450, 1,550 and 1,650 (`FormatDef.xpToNextOverride`). Excess XP carries over. The tutorial keeps its own thresholds (built: 680 / 690 / 520 / 700). Until A18 phase 1 the build uses the per-age thresholds of A17.8 (Bronze 550, Medieval 500, Gunpowder 900, Industrial 700, Modern 800, Future 1,200, Cosmic 1,300).
- **XP cap.** XP never exceeds 1.5× the current threshold. In the final age of the window, Overcharge uses 1,650 XP per +25% charge (A18; 1,200 until phase 1).
- **Expected timing (A18.3.1).** The first age lasts ~70 s and each later one ~100-122 s (Balanced mirror); no age after the first has a median stay under 75 s. Passive XP alone reaches the second age at 2:20, so nobody is frozen in an age.
- **Evolve command:**
  - Valid when XP ≥ threshold, current age < the format's max age, and not already ascending.
  - A 2.5 s Ascension (50 ticks) follows. The training timer pauses and turrets keep firing. Every other command stays legal; anything built or trained during Ascension uses the old age.
  - At the end (`ageUp`): age +1, XP −= threshold, base HP rescaled (A2.2).
  - Age Power charge becomes min(charge, 50%). With the power rework (A2.9.3): each power slot's reload progress becomes min(progress, 75%) and passes to the new age's power in that slot.
  - The tray swaps to the new age's loadout.
  - **Queue conversion.** Each queued item converts to the new loadout's card of the same role group (Infantry, Ranged, Heavy, Anti-armor, Support, Epic, Legendary), keeping its training progress. Prices are flat within a group, so nothing is charged or refunded. If the new loadout has no card of that group, the item keeps its original card.
  - **Vanguard.** 2 of the new age's Common Infantry spawn free at p = 20 at the side's level for that card. They are summoned: no pop, no bounty.
  - **Research carries over (A18.5).** Owned War Council picks are kept across evolves and apply to later units of the same class; research in progress continues through Ascension.
- **Units and turrets already built are unchanged.** Old turrets keep their original stats and show a Modernise arrow. "Older" compares the global `AgeDef.index`, never the position in the format (A17.15 rule 4).
- **Final age of the format (Overcharge).** While Age Power charge is below 100%, every 1,650 XP (A18; 1,200 until A18 phase 1) is consumed and adds +25% charge. With the power rework (A2.9.3) it adds 25% to the less-reloaded equipped power slot and never gives gold.
- **Visibility.** Both XP bars (with age icons) are always visible, so the evolve race is part of the show. The Evolve button sits on your own XP bar and glows steadily when ready. It never flashes.

### A2.5 Ages in v1

Eight ages are built (A17.8):

| Age | New mechanic introduced |
|---|---|
| Stone | Basics: melee, ranged, heavy, knockback, first-hit charges, ricochet |
| Bronze (A17.9; shown as "Bronze Age: Hellas", A18.8.2) | Piercing throws, damage auras, turret stuns, the sweep power |
| Medieval | Reach (second-rank attacks), shields, damage resistance, siege damage to bases |
| Gunpowder (shown as "Age of Muskets") | Splash artillery, pulls, the Mech tag, first Air unit (Legendary bomber) |
| Industrial (A17.10; shown with Great War flavour) | Mech Heavies, marking support, runners that explode, stun chains, crewed Legendary |
| Modern | Air as a regular option, suppression, called strikes |
| Future | Energy shields, EMP stuns, time control |
| Cosmic (A17.11) | Blink skirmisher, shield projector, an air Legendary with called strikes |

Ages are data. New ages need only content, visuals and audio entries plus one `AgeId` entry (A17.15). The target is 13 ages (A18.8.1: Nile, Rome, Norse, Shogun and Renaissance join), built in waves once the realistic restyle is proven on Stone (A18.8.3, owner decision D4). Every new age brings a visibly new mechanic.

### A2.6 Roles, tags and damage modifiers

**Tags:** `light`, `armored`, `bio`, `mech`, `ground`, `air`, `legendary`, `support`, `ranged`, `melee`.

**Roles:** Infantry, Ranged, Heavy, Anti-armor (AA; shown to players as **Anti-heavy**, below), Support, plus Epic and Legendary specialists. Each card also has a **role group** (Infantry, Ranged, Heavy, Anti-armor, Support, Epic, Legendary) used by pop, queue conversion and bot scoring.

**Classes (A18.9).** Every card shows its class with an icon and a label (A18.9.1). Research lines (A18.5.2) are bought per class; Epics and Legendaries count in their base role's class. Three classes join later: **Air** as a full class with its own counters and research line (phase 8; air units already exist), **Underground** tunnelers (A16.15, phase 8) and the stationary **Fort** card type (A16.14, phase 6).

**Anti-heavy (owner feedback 2026-09-29: "Heavy is very strong; we need a class that counters it"; decided, build phases H1-H5 in `docs/decisions.md`).** The Anti-armor role keeps its ids (`antiArmor`) but its player-facing class is **Anti-heavy**, drawn as the Heavy class's kite shield split by a spear, so the two icons read as a pair. Measured before (tree `9f427999`): a single Anti-armor lost to a single Heavy in every age (1v1 M 7-28), groups won only narrowly (6v4 M 41-80, Modern 41), no card or hint named Heavy as its prey, the bots' counter table rated the pair a coin flip in six ages, mono Anti-armor lost to mono Heavy in 100% of matches, and mono Heavy beat the tier VII bot 73%. It needed no new category, only numbers, a name, availability and an AI rule:

- **Brace for the whole class:** every Anti-heavy card is immune to knockback and first-hit bonuses (so a Heavy's charge does not apply to it).
- **Numbers** (A5 tables): armored and mech ×3.0 for the melee cards, the Bazooka Trooper and the Harpoon Gunner, ×2.5 for the Grenadier, ×2.0 kept for the Rail Gunner (it pierces); a first `legendary` entry keeps every armored or mech Legendary at today's multiplier (×2.0; Grenadier ×1.5). The one exception: the Balloon Admiral (air, no armor) took ×1.0 from ranged Anti-heavy attacks and now takes ×2.0 from the Harpoon Gunner and the Bazooka Trooper (later-age cards only; on the sim at equal gold they score 52.7 and 60.2 against it; its own age's answers are unchanged). HP +10% for every Anti-heavy card (the Harpoon Gunner and the Bazooka Trooper after the review of 2026-09-30, Bazooka Trooper 330 → 363), Grenadier damage 50 → 55. The review found the aggregate rows hid two ages: in the one-age windows mono Heavy still beat tier VII 87.5% in Industrial and mono Anti-heavy lost 100% in Modern; the per-age lane gate (B12 `sim:exploits`, A2.14) now holds every age.
- **Available from the start:** every age's Anti-heavy Rare is in the starter kit and the starter loadouts (A3).
- **Told everywhere:** "Strong vs Heavy" on every Anti-heavy card and "Weak vs Anti-heavy" on every Heavy card (A18.9.1), the counter table regenerated on the real sim (B4), a battle hint when the enemy fields Heavies (A9.2), and the bots answer Heavy with it (A7.2).

Each attack carries an ordered `mods` list. The **first** mod whose tag the target has applies; otherwise the multiplier is ×1.0. Role defaults:

| Attacker role / attack | Mods (in order) |
|---|---|
| Infantry melee ("blunt") | armored ×0.70 |
| Melee Anti-heavy (Spear Hunter, Phalangite, Pikeman, Graviton Halberdier) | legendary ×2.0, armored ×3.0, mech ×3.0, light ×0.75 (was armored ×2.0, mech ×2.0, light ×0.75) |
| Ranged Anti-heavy: Bazooka Trooper | legendary ×2.0, armored ×3.0, mech ×3.0, light ×0.5 |
| Ranged Anti-heavy: Harpoon Gunner | legendary ×2.0, armored ×3.0, mech ×3.0, light ×0.5 (armored and mech were ×2.5 until the review of 2026-09-30) |
| Ranged Anti-heavy: Rail Gunner | armored ×2.0, mech ×2.0, light ×0.5 (unchanged; pierces 2) |
| Grenadier | legendary ×1.5, armored ×2.5, mech ×2.5, light ×0.5 (was armored ×1.5, mech ×1.5) |
| Everything else | none (×1.0) |
| Flak Gun | air ×2.0 |
| Congreve Rack | air ×1.5 |

**Hitting air.** Every attack states `hitsGround` and `hitsAir` explicitly (the "Hits" column in A5: G, A or G+A). There is no implicit rule. Melee attacks never hit air.

**Area attacks.** Splash, cleave, chain, pierce, line, gate zone and follow-behind attacks deal 100% to the primary target and 50% to every other target, and hit at most 4 targets in total unless the card says otherwise. Target counts always include the primary. Reach for cleave, pierce and follow-behind is measured from the primary target's centre, away from the attacker; chain hops are measured from the previous target. For splash aimed at a point, the primary is the enemy whose centre is nearest the impact. Last Stand and death explosions are exempt. Age Powers are exempt from the 4-target rule but, with the power rework, obey their own cap: one cast affects at most its `maxTargets` enemy units (1-6), and only the enemies nearest the caster's gate in its reach area are eligible (the screen, A2.9.5).

**Counter triangle** (targets measured on the real sim at L7, equal gold, M = 50 + (HP left by the first side − HP left by the second) / 2; 50 is even):

- Heavy beats Infantry (armor): M ≥ 65 in every age (measured 66-84, unchanged by the Anti-heavy numbers).
- Anti-heavy beats Heavy: M 65-85 in every age at 6 v 4 and 3 v 2 (measured 72-84 and 68-83, and 89 for the splash Grenadier against a clump of four; before 41-80 and 36-78), ≥ 60 when swapped in for the Heavies of an Infantry mix (59-78), and one Anti-heavy (100 gold) trades about evenly with one Heavy (150 gold) in the melee ages (M 49-52; the ranged cards 25-42: glass, they win in groups).
- Infantry beats Anti-heavy (cheap, and takes reduced damage): M ≥ 65 (measured 73-84).
- Ranged supports everything but dies fast once reached. **Long range** Ranged units (A5.1) outrange the other Ranged units and fire slow arcs; air, Rare arc turrets and anything that reaches them beat them.
- Splash punishes clumps. Air punishes melee-only armies.

Every card detail screen shows "Strong vs" and "Weak vs", derived from the counter matrix (B4), with the class legend as a floor (A18.9.1).

### A2.7 Combat rules (simulation level)

**Sizes (collision width).** small 24, medium 32, large 48, huge 80 lu.

Edge distance between two entities = |xA − xB| − (wA + wB)/2, minimum 0. All ranges are edge distances. Range to a base is the edge distance from the unit to the enemy gate line.

**Overlap.** Transient overlap is legal (spawns, landings, pulls, drags, knockback). Movement may never increase overlap with an enemy. An overlapping enemy counts as blocking at edge distance 0. Spawn always happens at p = 20.

**Movement (ground):**

- A unit advances at its speed unless it has a valid target in range for its first attack.
- A unit cannot move into the nearest enemy ground unit ahead of it (it stops at edge distance 0).
- **Soft single file with a three-wide front** (`economy.frontWidth` 3; A16.4 lever L4, adopted and built with A17 step 1). Each tick, sort a side's ground units by p descending, then id ascending. Units 1 to 3 form the front rank: units 2 and 3 may walk up to unit 1's position. From unit 4 on, a unit may not come closer than (wA + wB) × 0.3 centre to centre behind the ally directly ahead.
  - The result: three melee units fight side by side. Units behind the front rank fight only if their range covers the gap (ranged units, which also overtake parked melee). Lever L3 (melee closes to contact so a rear rank reaches) was measured and not built, so the old "third position" claims are removed.
  - **Siege crowd** (`economy.siege.gateCrowdLu` 60, built): in Siege a unit may stand level with the ally ahead once that ally is within 60 lu of the enemy gate, so an army at the gate hits the base with every unit.
- **Overtaking.** These ally caps apply only against an ally ahead that is moving, or whose longest attack range is ≤ the mover's longest attack range. A unit may pass a stationary ally with a longer range, so melee is never stuck behind parked ranged units or artillery.
- **Symmetric resolution.** Both sides' desired moves are computed from pre-move positions. If the two fronts would overlap, each side gets floor(gap / 2) of the remaining gap.
- **Support followers.** Units with `followSupport` never advance beyond (frontmost friendly non-follower ground unit p − 60 lu). If no such unit exists, they advance to at most p = 200.

**Air units:**

- They ignore all blocking and fly at their speed.
- Gunships stop when a valid target is in range and obey stance.
- The bomber never stops and ignores Hold. It drops bombs every interval if any ground enemy is within ±40 lu of its x, and stops only at the enemy gate to bomb the base.
- Air units are immune to knockback and pulls.
- A Repair Drone follows the support rule above.

**Stance (per side; superseded by A18.4, owner decision D6).** A18 gives three stances and a Hold flag:

- **Charge** (default): advance.
- **Hold:** ground units hold at the side's Hold flag (default p = 320; the player drags it to any p in [320, 800], snapped to 20 lu). Units beyond it with no target walk back at 70% speed; units behind it do not pass it. Engaged units keep fighting.
- **Fall back:** ground units with no target walk back to p = 200 at full speed and hold there; engaged units keep fighting until their target dies or leaves range.
- A stance change is accepted at most once per 3 s (`battle.stanceCooldownMs`), a flag move once per 1 s. Gunships obey stance; the bomber does not.
- Until A18 phases 2 and 4: two stances (Charge and Hold at p = 320) with a 2 s toggle cooldown.

**Targeting:**

- Candidates are enemy units in range that the attack can hit (either direction). The enemy base (`targetId = −1`) is a candidate only when no unit candidate exists. Forts (A16.14.2, phase 6): attacks with range < 100 take them like units; attacks with range ≥ 100 take units, then the base, then forts.
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

**Stacking caps (A18.2 rule 4).** All sources summed in bp (research, doctrines, relics, modifiers, weather, auras): damage dealt ≤ +35%; damage taken ≥ −35% (no unit ever takes less than 65% of a hit); max HP ≤ +30%; attack speed ≤ +25%; move speed ≤ +20% (forced march and slows apply after); unit range ≤ +60 lu. Research applies to units spawned after it completes, never to units already on the lane.

**Bases take damage only from attacks that targeted them,** using `vsBaseDamage` if set, else the listed damage. Splash never damages a base.

**Knockback and pulls:**

- p −= knockback × (100 − resist) / 100, clamped at the unit's own gate (p ≥ 0). Negative knockback pulls toward the attacker.
- Resist values: small and medium 0%, large and huge 50%, Brace 100%, Air 100%.
- Knockback cancels a pending windup.

**First-hit bonus.** "First hit of each engagement" means the first attack started after ≥ 2 s without attacking. From A18 phase 2 it follows **engagement freshness** (A18.4.2): a unit is fresh after 4 s with no target, its first hit then is the engagement's first hit, and stance changes never reset it. Brace units ignore attackers' first-hit bonuses (multiplier and knockback). A ranged first-hit bonus rides on the first projectile of the attack (built with A17 step 2 for the Harpoon Gunner).

**Status effects:**

| Status | Effect |
|---|---|
| stun | No movement, no attack starts; a pending windup is cancelled. Time Stop is a stun with a `frozen` visual flag |
| slow | Move speed × (1 − s) |
| snare | Move speed and attack speed × (1 − s); power rework only (A2.9.6), applied after the A18.2 caps like slows |
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

- One shared queue of 5 (4 with the Guildhall research, A18.5.4). Gold is paid on enqueue. The tray holds 6 unit cards from A18 phase 2 (A18.9; 5 before).
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
  - Range is measured from their own gate, capped at 480 lu on the card. Research (Watchtowers +40 lu, A18.5.3), relics and modifiers may add range up to a hard cap of **560 lu** (`turretRangeHardCapLu`, A18.2), so the gap between the two covers never falls below 880 lu. Field towers (A16.14, phase 6) obey the same line: a tower's far reach never passes own-frame p 560, and Fog, Night and every other turret-range rule apply to "turrets and field towers".
  - Turret attack speed and damage research (Quick Loaders, Arsenal) applies at once, within the A18.2 caps.
  - Damage ×0.5 during Siege.
  - Turrets from older ages keep firing at their original stats.
- **Prices.** Commons 150 / 175, Rare 250, Epic 250. There are no Legendary turrets in v1.
- **Mounts.** 4 mounts stacked vertically on the base. The mount index is visual only.

### A2.9 Age Powers

**Status: the power rework (owner request 2026-09-29), decided, not built; the combined rule set is not measured yet (build phase P0 measures it first, A2.9.13).** "Speciallen burde koste penge og have reload time, der skal være mange flere specials og nogle af dem f.eks. begrænset til egen banehalvdel så man ikke bare kan vente på, at modstanderen har bygget en hær som man så bare ødelægger på en gang." Money means in-battle gold; there is no real money, ever. The rules below take effect with build phase P1 (A2.9.13); until then the build follows A2.9.14. Where this section and an older mention of the power charge, the power ring or "one power per age" differ, this section wins. The roster is A5.7; the decision record and the review of the three proposals are in `docs/decisions.md` ("Owner request 2026-09-29: powers cost gold, reload, more powers, own-half limits" and "Power rework: review fixes").

| | Before (built) | After |
|---|---|---|
| Price | Free | Each cast costs gold, 75-150 (strikes 50-150), flat across ages |
| Timing | One charge meter, 0-100% over 50 s | Each slot reloads on its own, 25-60 s by power (strikes 15-60 s); starts 25% reloaded |
| Slots | 1 per age loadout | 2 typed slots per age loadout: **Home** and **Field** |
| Where | Anywhere on p 150-1,850 | Home: only enemies in your half. Field: near your army (Front), precise strikes Anywhere, or no aim (Army buffs, drops) |
| How many hit | Everything in the zone (measured: 71-82% of the enemy army) | At most `maxTargets` enemy units per cast (1-6), and only the enemies nearest your gate (the screen) |
| Buffs | All your units | At most 8 of your units, the frontmost first |
| Evolve | Charge min(charge, 50%) | Each slot's progress min(progress, 75%) |
| Overdrive and Siege | Charge ×1.25 | No reload bonus |
| Roster | 16 | 48: 6 per age, 3 Home and 3 Field (A5.7) |

**Why (measured on the build `013d958`, `SIM_VERSION` 3.0.0).** Free powers are the main stall engine: Standard War tier V mirror Final Bell 37-39% with powers and 1-5% without. A cast zone holds 71-82% of the enemy's on-lane army, and power kills were 19-21% of all enemy value killed in Standard and Full War. Reach alone backfires: a Home-only rule without a cap sent a hoarding turtle to the Bell in 60% of matches (19% today), and "own half" alone made the largest single casts bigger (max 675 → 810 gold killed). Hence cost, reload, reach and the cap together. **Not yet measured:** priced Home-only prototypes gave a 15-17% Bell and a 10:14-10:35 median, but without a cap and without an adapted AI; with an unadapted AI, 100-gold Home powers lost to no powers (38%) and a paying side won 1 of 80 against a free one. The combined rule set (cost, reload, reach, cap, screen and the ROI AI) is measured in P0 before any contract change.

#### A2.9.1 Slots

- An age loadout holds `powers: { home: CardId | null; field: CardId | null }`. A Home power fits only the Home slot and a Field power only the Field slot; both from that age, owned, no duplicates. Empty slots are legal; a cast from an empty slot is rejected (`noPower`).
- **Home** (house glyph, shield frame): defence; every Home power has reach `home`. **Field** (flag glyph, banner frame): attack and support; reach `front`, `anywhere` or `army`. One power per slot, so a full loadout always has one defensive and one offensive or support tool. It can hold two area powers (a Home bombard or sweep and a Field charge or front barrage, such as Future's Orbital Lance and Drone Swarm); the cap bounds each, and `lockMs` is the lever if the pair dominates.
- **Unlock.** The Home slot is there from match 1. The Field slot unlocks at the first of: the first clear of War Path Stone L5, or 150 trophies (Gate 2); existing saves that have played a match get it at once (A2.9.8). Until then the HUD draws one button and Army shows the Field slot with a padlock and its unlock line. One unlock ceremony (MR-40): "A second power: Field!"
- **Locked means empty in the sim.** The sim knows no meta unlock: while the player's Field slot is locked, `meta` sends `field: null` in the player's `SideConfig` and in every bot's, so no key or command can cast a hidden Field power (the sim answers `noPower`). The HUD model calls the progression state `slotLocked`.
- **Match rule.** Both sides always play with the same set of slots; the tutorial and War Path Stone L1-L5 play with the Home slot only. **The Daily Challenge** (A9.1: everyone plays the same match) always plays both slots: a player whose Field slot is still locked gets each age's Field starter in that slot for Daily matches only.
- Casting stays legal during the Ascension and uses the old age's loadout until `ageUp`.

#### A2.9.2 Gold cost

- `PowerDef.cost` in whole gold, flat across ages: 75-150, a strike 50-150 (MVP balance pass 2026-10-01: a strike's damage is pinned at 55-65% of the Heavy, so price and reload are its levers; the five War Path strikes cost 50 and reload in 15 s). Paid in full on the tick the `power` command is accepted, before the telegraph. **No refund**, even for a zone that ends up hitting nothing: the telegraph is a commitment, which is what makes baiting work (an auto-aimed damage or control cast with no target at all is rejected before payment, A2.9.4). Gold < effective cost: rejected with `noGold`, nothing paid, reload kept.
- Power kills still pay 30% gold and no XP, as built: the underdog bonus applies, Forage and Bounty Hunters never do. Summons pay no bounty; the victim's side keeps its 50% loss XP. Farming gold with powers does not pay on average: a cast returns its cost only when it kills about 3.3× its cost in card value.
- Disclosed price modifiers only (integer, truncated to whole gold): Quartermasters research −20% (v1.1, A18.5.5), Power Hour −50% (A9.1, A18.7.7). Cost modifiers **multiply** (both: −60%). The observation and the HUD show the effective cost, which the sim charges.

#### A2.9.3 Reload

- `PowerDef.reloadMs` is data, 25-60 s (a strike 15-60 s, A2.9.2). Each slot keeps its progress in ppm and a remainder, `SideState.powerPpm: [home, field]` and `powerRem: [home, field]`. Per tick: num = 1,000,000 × `rateBp` + rem, den = reloadTicks × 10,000, gain = trunc(num ÷ den), rem = num − gain × den; capped at 1,000,000 (rem then 0), so every reload is exact (a 30 s power fills on tick 600). `rateBp` = 10,000 + Signal Fires 1,500 + Power Hour 10,000 + Zealots 2,500 (v1.1); rate bonuses add. A cast sets its slot to 0. **An empty slot still accrues** (at `economy.power.emptyReloadMs` 40,000) and carries. `powerReady { side, slot }` fires when a slot with an equipped power fills. The HUD's seconds and the observation use `reloadTicksLeft()` (`core/powerReach.ts`), the same formula, at the effective rate.
- **Match start:** every slot starts at 25% (`economy.power.startBp` 2,500): a 40 s power is ready at 0:30.
- **Evolve:** at `ageUp` each slot's progress becomes min(progress, 75%) (`economy.powerCarryCapBp` 7,500, was 5,000); the fraction passes to the new age's power in that slot, so a new-age power is at least a quarter of its reload away. A leader cannot cast one power just before and one just after an evolve (A2.11).
- **Overdrive and Siege:** no reload bonus (`economy.overdrive.powerBp` 10,000, was 12,500).
- **Overcharge** (final age of the window): every 1,650 XP (1,200 until A18 phase 1) adds 25% to the less-reloaded equipped slot (ties: Home); XP is consumed only while an equipped slot is below 100%.
- No stored charges and no overflow (A16.11 is superseded): a ready power never gets better by waiting.
- **Lever only:** `economy.power.lockMs` (default 0) rejects the other slot with `powerLockout` until `SideState.powerLockoutUntil`.

#### A2.9.4 Reach

Positions are the caster's own-side p, integers. One pure helper, `src/core/powerReach.ts`, serves the sim, the AI, the renderer and the HUD.

**The front F** is the p of the caster's `power.frontRank`-th frontmost own unit (1; a lever: 2) that is alive, on the ground and surfaced (not burrowed, A16.15), trained (not a summon: Vanguard, riders, drops), not a structure (forts, A16.14) and not mid-leap (a pounce or blink in progress). Without one, F is "none".

| Reach | Zone centre may be | Reach area (whom it may touch) | Used by | Label |
|---|---|---|---|---|
| `home` | [150, `homeLineP` − ⌊zone / 2⌋] with `homeLineP` 1,000 | enemies with own-frame centre p ≤ 1,000 (inclusive: a unit exactly at 1,000 can be hit by both sides) | every Home power | "Your half" |
| `front` | [150, min(1,850, max(F, 480) + 150)] (`frontFloorP` 480, the turret cover edge, so a Front power can always defend home; `frontReachLu` 150; F none counts as 480) | p ≤ the band maximum + ⌊zone / 2⌋ | aimed Field powers: front barrages, the cloud | "Near your army" |
| `front`, no aim | Charges start at F (p 200 without one) and run their distance. Suppress is legal only while F ≥ L − `turretRangeCap` − `frontReachLu` = 1,370 | the run | charges, Suppress | "From your front" |
| `anywhere` | [150, 1,850] | one picked target | strikes (aimed, one target); drops (no aim: 150 lu beyond the enemy's frontmost ground unit, as before) | "Anywhere", "Drop" |
| `army` | no aim; your own units | your 8 frontmost units | buffs | "Your army" |
| `lane` (owner feedback 2026-09-30; decided, not built: build phase H7) | no aim | the whole lane: the `maxTargets` hittable enemies nearest your gate anywhere (the screen, A2.9.5), so it always hits the enemy's front and never reaches past it to a staged army | lane volleys and signals (A5.7) | "Whole lane" |

- **The reach area is a hard mask:** an effect never touches an enemy outside it, whatever the blast radius, jitter or sweep width (without it, Home effects reached 29-60 lu past mid-lane at the band's edge). The HUD draws a blast radius clipped at the line. The mask is checked at every hit, not only when the cast picks its targets: a unit in `hitIds` that has been pushed or has walked out of the area (past the home line) is not hit again (fix pass 2026-09-30, `SIM_VERSION` 4.1.0; `inCastArea()` in `sim/systems/powers.ts`; a charge checks body overlap).
- **Aim is clamped, never rejected for its position**; the HUD never sends an illegal drop. **Auto-aim** (no `p`; Space and X, bots): centres over the band in 10 lu steps, score = the capped value (the card cost of the eligible enemies inside the zone, A2.9.5), best score, ties to the lower p. **A damage or control power whose best score is 0 is rejected with `powerNoTarget` before payment** ("No target there"); manual drops still pay. A strike auto-aims by the strike ranking (A2.9.6) over the whole lane.
- **Schema rule:** area damage (a barrage with `maxTargets` ≥ 2, a sweep, a charge, a field with `damagePerPulse` > 0) is `home` or `front`, or `lane` under the lane budget; `anywhere` is only for `strike` and `paradrop`; a Home zone is at most 850 lu. **Lane budget:** a one-pulse `field` with zone = L, `maxTargets` ≤ 8, per unit ≤ 30% of the age's L1 Infantry HP and ≤ 10% of its Heavy, statuses at most a 30% snare for 3 s or a mark for 6 s, cost ≤ 75. So one cast deals at most 8 × 25-30% of an Infantry (a Home sweep deals 5 × 80-100%), never kills a full-HP unit, and a massed army loses a quarter of the HP of its first eight units and nothing else: the wait-and-wipe fix holds. `core/powerReach.ts`: `reachBand('lane')` is null (no aim, the centre is L / 2) and `reachAreaMax('lane')` is L. The new `PowerReach` value is a contract change: **`SIM_VERSION` 4.1.0 → 4.2.0**, the golden replays re-verified and re-recorded deliberately (none holds a lane power, so results and commands stay), plus a golden `12-lane-and-long-range.json` with a lane cast and Long range arcs.

#### A2.9.5 Target cap and the screen

- Every power that damages or controls enemy units has `maxTargets` (1-6): **one cast affects at most that many distinct enemy units.**
- **The screen: only the enemies nearest your gate are eligible**, decided over the whole reach area, not the zone. Cap order = lowest own-frame p first (nearest the caster's gate), ties to the lower id; from forts (phase 6) a `capRank` key comes first, 1 for a camp's levies and 0 for every other unit, so levies rank last (A16.14.3). At every target pick the eligible set is the units already in the cast's `hitIds` plus the first (`maxTargets` − |`hitIds`|) other hittable enemies in the reach area in cap order; the zone, run or blast only decides which of them are touched, and an eligible unit that is not touched does not join `hitIds`. So a Home power spends its cap on the enemies deepest in your half, and cheap units in front really screen the Heavies behind them, for the player, the auto-aim and the bots alike.
- Hittable: alive, matching the power's air and ground flags, never a structure (forts are never eligible anywhere: targets, cap slots, auto-aim value or F), not burrowed except that ground area powers may touch burrowed units for 50% (A16.15); strikes never lock burrowed units.
- One rule for every kind: a unit in `hitIds` stays eligible and a dead one keeps its place; non-eligible units are skipped for damage, knockback, statuses and pulls alike. Within one impact candidates are taken in cap order; impacts of one cast due in the same tick resolve in schedule order. Barrage blasts pick at impact resolution (B3 step 13, through `castId`); sweeps, charges, fields and strikes when they select targets (step 11). Summons and Legendaries count, so a drop can soak a Home power (a legitimate bait); a fort's levies never do while a trained unit is eligible (they are free and always march).
- **Own-unit caps:** a buff affects at most 8 of the caster's units (`buffAll.maxTargets` 8), its frontmost (highest own-frame p, ties to the lower id) at the telegraph end, air and summons included, levies last (`capRank`). The cloud's ally damage bonus applies to at most 8 own units inside it, frontmost first and levies last, re-picked each tick; its miss chance is bounded by its zone and duration. Drops and Suppress have no unit cap.
- A2.6's area rule no longer exempts powers: coverage sets the damage per unit; the cap and the screen set how many and which units. A bigger army gives neither a bigger kill nor a bigger buff, so massing (by either side) earns nothing. The ghost numbers the eligible units 1..N and highlights those the zone covers; the pips are a prediction (units move, barrage jitter), and the cap is never exceeded.

#### A2.9.6 Telegraph, effects and limits

- **Telegraph** (data, visible to both sides with its ground marker and sound): 1.0 s for area damage, charges, controls, clouds and drops; 0.5 s for Army buffs and Flak; 1.5 s for strikes (Railway Gun 2.0 s) and Suppress. A strike shows a lock ring on its target; Suppress shows a jam mark over each enemy mount.
- **Powers hit units only**, never bases, turrets or forts; Suppress stops turrets from starting attacks and deals no damage. Air is immune to knockback and pulls (A2.7).
- **Legendaries** take 50% power damage and 50% of a power's stun, snare, slow and mark duration and pull distance (`economy.power.legendaryControlBp` 5,000). **Epics take 50% from strikes** (`economy.power.strikeEpicBp` 5,000; Legendaries keep their 50%, not stacked): otherwise four strikes killed their age's Epic in one cast.
- **Level scaling** unchanged: damage, heals and shields × the caster's loadout multiplier, the average of (10,000 + 500 × (L − 1)) over the unit cards of the current age loadout; drops use the dropped card's level.
- **Barrage sequencing** unchanged: impact i lands at `telegraphEnd + floor(i × durationTicks / count)` at x = `zoneStart + (i + 0.5) × zone / count + jitter` (zoneStart = the zone edge nearer the caster's gate; sim RNG jitter, 0 for line patterns).
- **Effect kinds.** `barrage` (new optional `hitsGround`, default true; false = air only), `sweep`, `stampede`, `cloud`, `buffAll` (new `maxTargets`) and `paradrop` are reused. New status **`snare`**: move speed and attack speed × (1 − s), applied after the A18.2 caps like slows (`slow` keeps its move-only meaning for every unit). New kinds:
  - **`field`** `{ zone, durationMs, hitsAir, statuses?, damagePerPulse?, pullBp? }`: pulse k lands at telegraphEnd + 10 k, for max(1, durationMs ÷ 500) pulses (a 6 s field pulses 12 times; `durationMs` 0 = one pulse). Each pulse affects the eligible enemies within zone / 2 of the centre: damage, then statuses (each with its own duration, so a 1.0 s snare lingers 1 s after leaving), and on the first pulse only a pull of `pullBp` of the distance to the centre, with knockback resist.
  - **`strike`** `{ shots, intervalMs, damage, hitsAir }`: a **manual** aim locks the eligible enemy (hittable, never burrowed or a structure) nearest the aim within `power.strikePickLu` 80 (ties: higher card cost, then lower id), so the player's aim is never overridden. **Auto-aim and bots** rank every eligible enemy on the lane by strike value (the A2.9.9 value: a kill counts cost × 1.3, else 0.4 × cost × damage ÷ current HP; Epic and Legendary damage halved), best first (ties: lower own-frame p, then lower id); bots apply their aim error as a choice among the best k (A2.9.9). None → `powerNoTarget`, nothing paid. Shot i lands at telegraphEnd + i × interval on the locked unit if alive and hittable (homing); otherwise it fizzles. Always 1 target. `strikePick()` is in `core/powerReach.ts`.
  - **`suppress`** `{ durationMs }`: at the telegraph end every enemy **mount** (built or empty; a boss's extra mount and a `target` victory turret included) gets `mountSilencedUntil`; a turret on a silenced mount starts no attack until then. The silence belongs to the mount, so selling, rebuilding or Modernising does not clear it. `suppressLegal()` is in `core/powerReach.ts`.
- **Combos:** a Home stun plus a Field power on the same units is possible (traps cannot stun, A16.14); both are capped, priced and reloaded, and `lockMs` is the lever.
- **Tuning targets per family** (I and H = the age's L1 Infantry and Heavy Common HP; coverage = count × 2 × radius / zone hits per unit; the static check uses the sim's own formulas, pulse counts included): Home bombard and sweep 80-100% of I and 20-30% of H per unit; front barrage and charge 60-95% of I and 15-27% of H (a charge's maximum); strike 55-65% of the age's Heavy and never kills a full-HP same-age Heavy or non-Legendary Epic; control ≥ 12 disabled unit-seconds per 100 gold at the cap if the targets stay (a stun second counts 1, a snare second its magnitude, a move-only slow 0), total damage ≤ 45% of I (snares and pulls 30-40%); Flak: an air unit at the centre takes at most 100% of the age's air Epic; buffs: shields plus heals ≤ 70% of I per target, other stats within the A18.2 caps.
- **Stances.** Charge moves your front and your Front reach with it. The whole Hold flag range lies in your half, so a holding side covers its line with its Home power (bounded by the cap, the screen, the price, the reload and the `home_turtle` gate). Fall back makes the enemy cross your whole half and shrinks your Front reach to the 630 floor. In Overdrive and Siege reloads are unchanged; Suppress (Medieval and Future War Path powers) is a situational turret tool, not a Bell answer. Last Stand is unchanged: free, once, separate from powers.

#### A2.9.7 Commands, events and visibility

- **Command** `{ t: 'power'; side; slot: 'home' | 'field'; p? }`. Validation order: `badCommand` → `noPower` (empty slot; a locked slot arrives empty) → `powerReloading` (replaces `powerNotReady`) → `powerLockout` (only with `lockMs` > 0) → `powerOutOfReach` (Suppress) → `powerNoTarget` (a strike with no pick, or an auto-aimed damage or control power with nothing eligible in its band) → `noGold` (effective cost) → accept: pay, clamp or auto-aim, lock a strike target, set the slot to 0, start the cast.
- **Events:** `powerReady { side, slot }`; `powerTelegraph { side, slot, power, castId, x, zone, cost, targetId, telegraphMs }` (`targetId` −1 unless a strike); `powerImpact` unchanged; new `turretSilenced { side, mount, untilTick }`.
- **Visibility.** Both sides always see both of each other's reload rings and every telegraph (with the lock ring). **Ring speed is public** for bots and players alike: its fill speed shows the reload (15-60 s), so a careful player can guess the family before the first cast. An enemy power's icon is "?" until its first cast; then it joins the Scouted list with its cost and reach. **Gold stays hidden**, so a full enemy ring means "can cast if they have the gold": baiting is a read, not a certainty. Bots see exactly this (A7.1).

#### A2.9.8 Sources

- **Starters** (16, owned from the first launch): the 8 existing defaults and 8 new starters, one Home and one Field starter per age. Code finds them by `source: 'starter'` plus `slot`, never by `slot === 'default'`. **Trophy Road** 100-500: the 8 existing alternates, nodes unchanged (A17.13). **War Path** (24): each region's L5 (Rare), L7 and L9 (Epic) first clear, shown on the node before the fight (A18.7.8). **Trophy Road fallback:** the same 24 as extra items on nodes 550-1,950 in region order (skipping gates, Wardrobe nodes and 1,500); whichever source comes first grants the power, the other then pays 60 Amber ("Owned: 60 Amber"). Nodes per power: A5.7.
- **No capsules, no copies, no levels, no Dust.** Powers scale through the loadout multiplier; capsule tables, odds, pity and the economy pacing are untouched.
- **Bots** use only powers a player at that point could own, by either source: starters; Road powers (alternates and fallback items) whose node is ≤ the player's best trophies + 100; War Path powers whose granting level the player has first-cleared. A General's plan substitutes the age's starter of that slot for a power it may not use. War Path level bots may use their region's powers. While the player's Field slot is locked every bot's is empty (the Daily excepted, A2.9.1).
- **Save** (the next `SaveDoc` version after the newest at build time; ships in P1 with the contract bump): each loadout's `power` moves into the slot its card belongs to and the other slot gets that age's starter. The Field slot flag `flags['power.field']` is set for every save with `matchesPlayed` ≥ 1 or that cleared `wp.stone.l05` or has best trophies ≥ 150, because eight built powers move to the Field slot (Stampede, Smoke Screen, Iron Horse, Paratroopers, Aegis, Royal Decree, Nanite Surge, Warp Strike) and a player keeps the power they know in battle; the MR-40 ceremony plays once. `powersOwned` gains the 8 new starters, every War Path power whose level was first-cleared, and the new power item of every already claimed Trophy Road node ≥ 550 (claimed nodes are stored as whole values and would never offer it), granted directly and idempotently; a power granted by both pays 60 Amber once for the second. Nothing is removed (A15.1). Fixtures: fresh, default power equipped, a Road alternate equipped, "Stampede equipped, 50 trophies", War Path Stone L7 cleared, "road claimed to 1,000", 160 trophies; each asserts no lost id, both slots set by the rule, no double grant and idempotence.

#### A2.9.9 AI (A7.2-A7.4)

- **Per slot**, when reloaded and affordable, over the eligible targets the zone covers (the shared `core/powerReach.ts` helpers): aim over the legal band (tier positional aim error, then clamped back; strikes pick among the tier's best k instead); **value** in whole gold: damage and strikes, kill-weighted = per target card cost × 1.3 if the expected damage kills it (card plus bounty), else 0.4 × card cost × expected damage ÷ current HP (Legendaries, and Epics for strikes, halved), ×1.25 for a target within p ≤ 480 of the bot's gate; control = Σ capped targets within 300 lu of an own unit or inside own turret cover: cost × `aiValueBp` (fix pass 2026-09-30: snare 4,500, pull 5,000, stun 5,000; Medusa's mark included; was 2,500 / 3,000 / 4,000); buff = Σ over the 8 frontmost own units that are in contact or within 600 lu behind an own unit in contact (the wave about to join the fight): cost × `aiValueBp` (Hunt Cry, Aegis, Royal Decree, Field Hospital 7,000, Nanite Surge 8,000; was 2,500-4,000 and counted only units within 300 lu of an enemy, so buffs almost never passed the bar); cloud = (enemy ranged value inside + 150 per enemy turret covering it) × 40%; drop = summoned value × 0.8 when an enemy ranged or support unit is within 300 lu beyond the enemy front, else × 0.4; Suppress = legal with 80 lu of slack (the bot's front must be ≥ 80 lu past the reach line, so one knockback does not turn the cast into `powerOutOfReach`), not while the enemy's Last Stand is charging, ≥ 2 enemy turrets, own army value within 600 lu of the enemy gate × 0.5.
- **ROI** = value × 10,000 ÷ effective cost; cast when ROI ≥ the tier bar + (power patience − 50) × 40 bp (Tempest +1,800, Kettle −1,200; Ledger +2,000 more). Several castable slots: the highest value − cost; one cast per decision. Overrides: base damaged in the last 3 s and value ≥ 100; tier X any value below 25% base. A cast that would break an active saving goal raises the bar by 5,000 unless the base was just hit. The A7.2 mistake "fire the power on 1-2 units" casts a Home power whose covered eligible targets number 1-2.
- **Tiers** (replace the A7.3 "Power threshold" column): ROI bar (starting values, calibrated in P1 so that the tier V median is 1.5-3.5 casts per side per age and tier VII casts on covered values < 200 at most half as often as tier V) 6,000 / 8,000 / 10,000 / 12,000 / 15,000 / 18,000 at 0 / I / III / V / VII / X (interpolated between); strike pick among the best k = 3 / 3 / 2 / 2 / 1 / 1. Tiers 0-II use the Home slot only. From V: a Home reserve (while the Home slot is ≥ 75% reloaded and the enemy army on the lane is worth ≥ 300, its cost joins the gold float), and the push gate asks 20% more army value while a scouted enemy Home damage power is ready. **Bait discipline** (VII-X): no Home cast on covered targets worth < 200 card value unless the base took damage in the last 3 s; so a 3-Infantry bait softened by turrets draws a tier V cast (≈ 244 → ROI 24,400) and not a tier VII one. VII-X **bait, then wave**: with the enemy's Home ring full (a scouted bombard or sweep, or an unscouted card, which is the common case) and ≥ 300 gold banked on a passing push gate (fix pass 2026-09-30; at 500 the bait never fired in practice), the bot sends its cheapest units worth ≤ 150 across mid-lane, trains nothing else, and releases the bank when the enemy casts or after 12 s (the Home reload is shorter than the time to bank a wave, so the bank comes first). X also raises its Home bar by 3,000 while the enemy is banking (no enemy unit in its half, enemy army < 300), saving the power for the committed wave. **Anti-stall banking** (fix pass 2026-09-30): a bot banks for a wave only up to the gold its free population can still spend (25 gold per free pop, less the pop-cap margin), so a bot at the pop cap stops banking and pushes; a wave launched at the pop cap ends only when it has lost half its peak value, not when it falls below the defence estimate. Without this, a Home power turtle stalled tier VII into a Bell draw.
- **Generals** (each "where the age has one and the bot may use it", else the age's starter of that slot): Pip starters; Kettle charges and Rally; Moss Home controls and bombards, Ward and Mend; Ledger the 75 g powers and buffs; Boomsworth bombards, strikes and front barrages; Ada & Ivo counters; Rook Flak vs air, Suppress vs 3+ turrets (Medieval, Future), strikes vs Rares and damaged Epics; Tempest bombards and sweeps with bait-and-wave; The Warden its region's War Path powers on the War Path, the ladder filter elsewhere. Boss phase: "casts its best ready, affordable power whose ROI passes its bar".
- Files: `ai/scoring.ts`, `brain.ts`, `tiers.ts`, `book.ts`, `ledger.ts`, `memory.ts`, `view.ts` (`powerReady` per slot), `estimate.ts` (telegraph threat with the cap, the screen and the new kinds), `personalities.ts`, `scripted.ts`, `actions.ts` (`slot`), `openings.ts`, `content/generals.ts`. Bots never see the player's gold and see the player's powers only once scouted; they stay labelled AI everywhere.

#### A2.9.10 HUD, targeting, Army and teaching

- **Power dock** (A9.2 tray item 4): two round buttons, Home left, Field right; 64 px each and 6 px apart on phones, 96 px on desktop. Width at 844 × 390 (750 usable, keeping ≥ 16 px slack): until forts ship the reserved Fort space goes to the dock, 100 + 8 + 402 + 6 + 56 + 8 + 134 = 714; below 820 px, 644 of 686. With forts (A18 phase 6): the Fort button joins the dock (a placement dock: stance | Fort | Home | Field, all dragged onto the lane, A16.14.7); at 844, cards 58 × 78 with 4 px gaps, stance 56, Fort 58 and two 58 px buttons, 100 + 8 + 368 + 6 + 56 + 8 + 58 + 6 + 122 = 732; below 820 px, cards 52 × 70, stance 48, Fort 52 and two 52 px buttons, 657 of 686 (`docs/ui-plan.md` 4.7 owns the numbers and is updated to these in fort phase F2). Last Stand floats above the Home button while armed.
- **Button:** icon; a 5 px reload arc; the seconds left in the centre while reloading (icon at 40%); a cost chip top-left with the effective cost, red with a filling gold underline while unaffordable; a reach glyph bottom-right (house, flag, crosshair, banner, parachute; a double arrow for `lane`). Castable (reloaded and affordable): MR-69 sweep, lift, glow; it breathes only if it holds the one pulse (tutorial, Evolve, the first castable slot with Home before Field, a mount). A lockout (the lever, `lockoutUntil`) dims the icon with a thin lock arc. A locked Field slot (`slotLocked`) is not drawn and leaves an empty gap. Denied presses say why (MR-03): "Ready in 12 s", "Need 40 gold", "No target there", "Get closer to their turrets". **Keys:** Space = Home, X = Field (auto-aim; no target is denied before payment); Enter on a focused button. Long-press or hover: name, family, reach, cost, reload, "Hits up to 5" ("Your 8 frontmost units" for buffs), the per-unit line.
- **Targeting** (extends A18.9.2): on pick-up the legal band is washed in team colour at 18% with a 2 px edge, chevrons and a label ("Your half", "Near your army"; the Front edge follows your front live; the minimap shows the same tint). The eligible enemies (the first N nearest your gate in the reach area) carry number pips 1..N wherever the zone is; those the zone covers get the highlight ring, other enemies in the zone a faint "not hit" outline; the token reads "Hits 4 of 5 · −100" (covered of eligible); a blast radius is drawn clipped at the Home line; a strike shows a lock ring on the unit nearest the aim ("No target" when none). Past the band the ghost sticks to the edge for up to 120 lu of overshoot (a 1.04 → 1 bump and a tick haptic on first contact); beyond that it turns red and hatched ("Only in your half") and a release puts the power back with nothing paid. Charges, drops, buffs and Suppress keep drop-anywhere casting with a ghost of where they act; a lane power (reach `lane`, glyph a double arrow) lights the whole lane at 18%, numbers its eligible enemies 1..N and drops anywhere.
- **Opponent:** two 22 px mini-rings inside the enemy block, between the age icon and the bars (the bars shrink 140 → 112): "?" until scouted, a steady orange rim when ready, never a pulse; drained on a cast; long-press for name, cost, reach, seconds. The top band is 734 of 750 at 844 px with the A18.5.7 research icon, 654 of 686 below 820 px. The off-screen "power incoming" badge (A17.5) counts down the power's own `telegraphMs`.
- **Feel by family** (A12, inside the 150 ms per 3 s freeze budget): Home bombard and sweep 120 ms global hitstop, trauma +0.5, a 30% one-frame flash, 6 dB duck; charges and front barrages 60 ms, +0.3, 3 dB; strikes victim-local 70 ms, +0.15; fields and Flak +0.1, stuns freeze locally; buffs a shimmer along the 8 buffed units; drops a landing thud; Suppress sparks and a jammed icon. **MR-70b** (cast committed): the ghost contracts to 0.9, the gold counter floats "−100" and counts down, the ring drains, the icon dips, `power_cast` plays (replaces `ui_confirm` for powers). **MR-69** per slot: `power_ready` plays when a slot first becomes castable (reloaded and affordable) after its last cast, at most once per 3 s across both slots.
- **Army** (A18.9.3): each age shows a Home and a Field power slot (watermarks; the Field slot padlocked with "War Path Stone 5 or 150 trophies" until unlocked). Layout (built 2026-09-30, the In battle band of A18.9.3): all slots in one row grouped Troops | Turrets | Powers (58 px slots on phones: 657 of the 794 px row), and from phase 6 a Fort group after Powers (736 of 794, with the advisor and Avg Lv moved to the band's title row below 480 px height, A16.14.7) (`docs/ui-plan.md` 4.2 owns the numbers and is updated in fort phase F2). Power tile: icon, name, rarity frame, cost chip top-left, reach glyph top-right, "⟳ 40 s" at the bottom; a power dropped on the wrong slot bounces back with "Home powers go in the Home slot". Filters: the Power chip opens Home / Field. Card detail: a lane diagram with the reach band and the zone to scale, cost, reload, "Hits up to N", the per-unit line, ground/air, the source. Advisor: "Empty power slot", the air check counts powers, "No Home power in Cosmic". Auto-fill: the two starters.
- **Teaching:** match 1 keeps the Arrow Storm beat (the script grants 100 gold and sets the Home slot ready); War Path Stone L4 teaches the Home power ("Powers cost gold, then reload."; the band teaches "your half", the pips "the first few"); the Stone L5 first clear (or 150 trophies) brings the Field slot; loss tips (A15.12): "Their Home power was reloading. Push in that gap." and "Lead with cheap units: powers hit the first few." (true by the screen rule). The `power_hits_5` quest stays at 5; its text names the powers that can do it (bombards, sweeps, charges, front barrages, snares, pulls and stuns; not strikes or Flak).
- **Ids and strings** (A13, A14): `power.<slug>` and the effect and sound ids in A5.7 (P1 registers placeholder manifest entries and template sounds for the 8 new starters); shared `fx.field_zone`, `fx.target_lock`, `fx.turret_jammed`, `fx.reach_band`, `fx.target_pip`, `fx.power_cast_cue`; sounds `power_cast`, `power_lock`, `turret_jammed`. i18n: `card.<slug>.name|desc` for the 32 new powers, `power.slot.*`, `power.reach.*`, `power.family.*`, `power.hits`, `power.hitsOwn`, `power.reload`, `hud.deny.power{Reload,Gold,NoTarget,OutOfReach,Lockout}`, `hud.powerAim.{hits,cost,home,front,onlyHome,onlyFront,noTarget}`, `hud.key.x`, `army.powerSlot.{home,field,locked,wrong}`, `unlock.powerField`, `tutorial.power.cost`, `advisor.noHomePower`, `result.tip.{powerReloadGap,powerScreen}`, the `power_hits_5` quest text, `power.source.{warPath,road}`, `road.ownedAmber`.

#### A2.9.11 Contracts, save, `SIM_VERSION` and replays (one WP0 bump, in P1)

- **`PowerDef`:** `slot: 'home' | 'field'` (was `'default' | 'alternate'`), `reach: 'home' | 'front' | 'anywhere' | 'army'`, `family`, `rarity: 'common' | 'rare' | 'epic'`, `source: 'starter' | 'road' | 'warPath'`, `cost`, `reloadMs`, `telegraphMs`, `maxTargets?` (required for `barrage`, `sweep`, `stampede`, `field`, `buffAll`), `aiValueBp?`. `PowerEffect`: `barrage.hitsGround?`, `buffAll.maxTargets`, new `field`, `strike`, `suppress`. `StatusKind` gains `'snare'`.
- **`EconomyRules`:** drop `powerChargeMs` (and `CompiledTicks.powerCharge`); `powerCarryCapBp` 7,500; `overdrive.powerBp` 10,000; new `power: { startBp 2500, emptyReloadMs 40000, homeLineP 1000, frontReachLu 150, frontFloorP 480, frontRank 1, strikePickLu 80, strikeEpicBp 5000, legendaryControlBp 5000, lockMs 0 }`. `ResearchEffect` `powerCharge` → `powerReload { bp }`; new `powerCost { bp }` (v1.1). `core/modifiers.ts`: Power Hour = reload +10,000 bp and cost −5,000 bp.
- **Sim state and commands:** `Loadout.powers`; `SideState.powerPpm: [home, field]`, `powerRem: [home, field]`, `powerLockoutUntil`, `mountSilencedUntil: number[]`; `PowerCastState` gains `slot` and `targetId`; `Command.power` gains `slot`; `TrainingEvent.setPowerPpm` → `{ slot, ppm }`. Reject codes `powerReloading` (replaces `powerNotReady`), `powerLockout`, `powerOutOfReach`, `powerNoTarget`. All new state is hashed. `MatchStats` gains power gold spent, casts per slot, units affected per cast and the eligible count per cast.
- **`Observation` and `HudModel`:** `me.powers.{home,field}` = `{ card, ppm, cost, reloadMs } | null` (effective cost and reload); `foe.powers.{home,field}` = `{ card: CardId | null (until scouted), ppm } | null`; the HUD adds `affordable`, `secondsLeft`, `reach`, `family`, `maxTargets`, `zone`, `lockoutUntil` and `slotLocked` (the meta unlock, from the match config).
- **New core helper** `src/core/powerReach.ts`: `frontP`, `reachBand`, `reachArea`, `capOrder`, `eligibleTargets`, `strikePick`, `strikeRank`, `suppressLegal`, `reloadStep`, `reloadTicksLeft`, `effectiveCost`; integer and pure.
- **Content:** the schema checks the family template per age (A5.7), one starter per slot by `source`, and road `power` items by source (100-500 `road`, 550+ `warPath`; replaces "must be an alternate"); `compile.ts` orders powers starters first, then by slot and source.
- **`SIM_VERSION` 3.0.0 → 4.0.0.** Replay policy as at 3.0.0: the 10 golden replays are re-recorded once on the frozen fixture content, which gains a frozen copy of the new `PowerDef` fields and one power of each new kind; a new golden `11-standard-powers.json` covers both slots, the cap and the screen, a field, a strike and Suppress; `replay-verify` and the browser determinism e2e rerun. 3.x replays load through the legacy replay schema (their `power` commands have no slot), keep their result card ("Recorded on an older build") and no longer play; resume logs from before 4.0.0 cannot resume.

#### A2.9.12 Balance targets, proxies and levers

**Setups** (one statement for every power gate; these rows join A2.14 and A18.12): mirrors use the Balanced brain at L7 with **starters only** (the baseline plan), 200 matches per format; the P0 and P1 Bell comparisons use **tier V** mirrors (the setup of today's measure) and the release Bell targets are the A2.14 **tier VII** rows. Exploit proxies run vs tier VII in **Short, Standard and Full War**, 400 per proxy at gates (100 smoke). Per-power rows use 2,000 mirrored matches (smoke 400); situational powers are gated in a matchup and only reported on the baseline: Flak vs an opponent plan whose Support Rare slot holds the age's air Epic, Suppress vs a 4-turret Hold opponent; every other power, controls included, on the baseline.

| Metric | Target |
|---|---|
| P0 go/no-go (before any contract change) | Standard tier V mirror Bell ≤ 25%; Short not above today; `no_power` loses ≥ 55%; `power_hoarder` wins ≤ 45%; Home starters' value per gold median ≥ 1.0 |
| Final Bell, tier V mirror | Not above today (Short 52%, Standard 38.5%, Full 20.5%) at P1; Standard ≤ 20% before P2; release: the A2.14 tier VII targets with the A16.4 levers |
| Median lengths | The A18.12 bands; Full War median ≥ 12:00 (both prototypes shortened Full War to 8:27-9:58) |
| Power share of gold | 8-16% per format |
| Power share of enemy value killed (no summons) | 5-12% per format (today 9% / 19% / 21%) |
| Share of the enemy's on-lane army **value** touched by one cast, when that army is worth ≥ 750 | p50 ≤ 40% (today ~80%); the unit share reported |
| Largest single cast (card value killed) | p99 ≤ 350 (today 475-760) |
| Casts per side per age stay | Median 1.5-3.5; ≥ 70% of age stays include a cast (replaces the A17.14 one-power-per-age row); the Field slot used in ≥ 50% of the stays where it is equipped; per match reported (Short 5-11, Standard 9-18, Full 13-26) |
| `power_hoarder` (Hold at 480, 4 turrets, Home casts, auto-aimed, only when the covered eligible value is ≥ 150 or its base was hit in the last 3 s) | Wins ≤ 40%, ≤ 20% of its matches at the Bell (the A16.11 gate) |
| `bait_wave` minus `plain_wave`, each vs `power_hoarder` (bait ≤ 150 g after banking ≥ 500; release on the cast or after 12 s) | +5 to +20 points (a skill, not a must) |
| `bait_wave` minus `plain_wave` vs tier V and vs tier VII bots | Reported; expected positive vs V, about 0 vs VII (bait discipline) |
| `power_spam` (both slots on every reload, auto-aim) | ≤ 45% |
| `no_power` vs the Balanced script | Loses 60-80% |
| `home_turtle` (Hold at 320, 4 turrets, the age's Home damage starter and its Field starter cast on every wave, the Field one when it can reach) | Turtle band 35-45%, ≤ 50% at the Bell |
| `drop_spam`, `runner_reach` (a lone runner forward, then Front powers at the enemy's staging area) | Each ≤ 45% |
| `gate_sniper` (strikes only at the enemy rear) | Value per gold reported |
| Existing proxies (`tools/proxies.ts`) | Slot-aware: the Home slot where they cast "the power", the Field slot by the same trigger when equipped; zone-value triggers read the covered eligible value |
| Per-power win-rate delta vs its slot's starter | 95% CI within ±3 in its setup |
| Each age's three Home and three Field options | Within ±5 points of each other in their setups; pick-flip ≥ 30% reported |
| Static per-power checks; value per gold | Within the family targets (A2.9.6) for every power (per-unit damage; strikes never kill a full-HP same-age Heavy or non-Legendary Epic; controls ≥ 12 disabled unit-seconds per 100 gold; buffs ≤ 70% of I per target; pulse counts by the sim's formula); median value per gold 1.2-2.0 per damaging power; buffs and the cloud reported (enemy value killed by the affected units while the effect lasts, ÷ cost) and gated by the ±3 row |
| AI | Every `strength` gate holds; tier VII with bait beats tier V ≥ 60%; P1 calibration: tier V median 1.5-3.5 casts per age, tier VII casts on covered values < 200 at most half as often as tier V |
| Reach and cap sanity (tests, on hit positions) | Every unit a Home effect touches has own-frame p ≤ 1,000 at the hit; no area damage is `anywhere`; a cast never affects more than `maxTargets`; every unit touched was eligible; a strike never affects 2 units; a buff never affects more than 8 |
| B3 performance | Full War ≤ 850 ms headless, field pulses and eligibility sorts included |

**Levers in order (data first):** `maxTargets` ±1 by family; Home cost ±25 or reload ±10 s (Home 100 → 75 first if Full War runs short); `homeLineP` 1,000 → 900; `frontReachLu` 150 → 100 or `frontRank` 2; power-kill bounty 30% → 50%; `overdrive.powerBp` back to 12,500; `lockMs` 5,000; buff cap 8 → 6.

#### A2.9.13 Build plan (joins A18.13)

| Phase | What | Size | Owners |
|---|---|---|---|
| P0 Prototype gate | No shipped code: a `--patch` or harness branch with the full rule set (cost, reload, reach and mask, cap and screen, the Epic strike rule, the 8 new starters as patched data, a minimal per-slot ROI AI); Short and Standard tier V mirrors (200 each), `no_power` and one `power_hoarder` row; the pre-registered go/no-go of A2.9.12. On a fail, in order and re-run after each: Home 100 → 75 g, caps +1, power bounty 30 → 50%; still failing, the lead reports to the owner with a proposal before P1. The owner hears the numbers in plain words | S | WP12, lead |
| P1 Rules, contracts, save and compatibility | Starts after the UI rebuild's in-flight HUD and War Plan edits are committed; requests sent now (`docs/requests/powers-p1-compat.md`). One contract bump (A2.9.11), `core/powerReach.ts`; sim (slots, cost, reload, reach and mask, cap and screen, `field`, `strike`, `suppress`, `snare`, `hitsGround`, buff caps, the data levers); the 16 existing powers retagged and priced and the 8 new starters as data; **the save migration (A2.9.8) with fixtures and tests**; **compatibility adapters** so `main` plays with one button until P2: `meta` sends `field: null` for both sides in every match, `render/hudModel.ts` maps the Home slot onto the single-button fields read by `ui/hud/{PowerButton,Hud,TopBar,model}` and `render/{eventMapper,battleView}`, `app/{matchSetup,fallbackBot,capsules/CapsuleHost}`, `ui/screens/model/plan.ts` and `WarPlanScreen.tsx` (the Home slot as the one power slot), `ui/screens/fixtures`, `meta/{tables,warplan,advisor,feats,matchmaking}`, `tutorial/{scripts,director,autopilot,hints}`, the dev pages; starter lookups by `source` (`meta/tables.ts`, `tools/lib/plans.ts`, `tutorial/scripts.ts`, `ui/screens/model/plan.ts`, `content/compile.ts`, `content/schema.ts`); placeholder manifest entries and template sounds for the 8 new starters (the ids test); AI v1 (A2.9.9, with `ai/view.ts` and `ai/estimate.ts`) and its calibration; metrics and proxies (A2.9.12), every existing proxy slot-aware; `SIM_VERSION` 4.0.0 and the golden re-record; measure the gates and tell the owner in plain words | L | WP0, WP2, WP1, WP3, WP8, WP12; adapters WP5, WP9, WP11, WP7, WP4, WP6 |
| P2 HUD, Army, teaching; Field slot on | Dock, band, pips, lock ring, enemy rings, deny reasons, keys; Army slots and power tiles; tutorial script and retime; the Field slot ceremony; strings; last, `meta` sends each side's Field power by the unlock flag (and in the Daily) | M | WP5, WP9, WP11, WP7, WP1 |
| P3 Starter art and sound | Effects, icons and sounds of the 8 new starters and the shared cues, polished; Playwright review at 844 × 390 and 1280 × 720 | M | WP4, WP6, WP5 |
| Owner check | Short and Standard War on Normal and Hard with both slots | | owner |
| P4 War Path powers | The 24 War Path powers (data, effects, icons, sounds, strings); War Path and Trophy Road sources (`docs/requests/powers-sources.md`); Generals' plans; card detail diagrams | L | WP1, WP4, WP6, WP7, WP3, WP9 |
| P5 Tuning | Full balance matrix, per-power ±3, proxies; Full War pacing tuned together with the power economy | M | tuning agent, lead |

Every phase keeps `main` playable. Between P1 and P2 every match plays the Home slot only (Rockslide in Stone; Stampede, now a Field power, returns in P2). HUD and Army requests: `docs/requests/powers-hud-army.md`.

#### A2.9.14 Until the rework ships (the built rules)

- One power per age loadout (default or alternate). Charge 0 → 100% over 50 s in ppm (1,000 per tick), ×1.25 in Overdrive and Siege, Signal Fires +15%; capped at 50% across an evolve (70% with Reserve Charge, v1.1); the opponent's charge ring is visible.
- Casting: drag from the button onto the lane or the minimap (A18.9.2); a tap starts aiming; Space auto-aims (the `densest` scan over p 150-1,850); a 1.0 s telegraph visible to both sides.
- Limits: units only, never bases or turrets; Legendaries take 50%; kills pay 30% gold and no XP; exempt from the A2.6 area rule. Level scaling and barrage sequencing as in A2.9.6. Tuning target: 60-100% of the age's L1 Infantry Common and 15-35% of its Heavy Common per unit in the zone.

### A2.10 Match formats and clock

**Formats are age windows (A18.3.4, owner decision D2).** A format is a window of consecutive ages; `FormatId` is an open string key into `content.formats`. The target formats:

| Format | Ages in the window | Overdrive | Siege | Final Bell | Median target | Retreat unlocks | Used in |
|---|---|---|---|---|---|---|---|
| Tutorial | Stone, Medieval, Gunpowder, Modern, Future (scripted; thresholds 680 / 690 / 520 / 700) | none | none | none | ~2:30-3:00 | never | Onboarding match 1 (War Path Stone L1) |
| Short War | 3 | 5:00 | 6:30 | 8:30 | 7:00 | 1:00 | Ladder (all arenas), Quick Battle, Skirmish |
| Standard War | 5 | 8:00 | 10:00 | 12:30 | 10:30 | 1:00 | Ladder (all arenas since the owner request of 2026-10-03; was from Arena 2), Daily Challenge, Skirmish |
| Full War | 7 | 12:00 | 14:30 | 17:30 | 15:00 | 1:00 | Ladder (all arenas since 2026-10-03; was from Arena 3), Skirmish; never on the War Path |
| Last Base Standing (`last`; A2.10.1) | 7 | 12:00 | Siege I 14:30, rising every 2:30; Crumble from 23:00 | **none** | ~19:50 (tier VII mirror median); a base always falls by 25:44 | 1:00 | Ladder (all arenas since 2026-10-03; was from Arena 3; unranked: no trophies), Skirmish, Friend Duel (M2); never on the War Path or in online queues |

**Player names (owner request 2026-10-01: "a short, a medium and a long battle, and one with no time limit").** Players see **Short War, Medium War, Long War** and **Last Base Standing** (DA v1.1: Kort, Mellem, Lang, Til sidste base). The ids `short`, `standard` and `full` and their clocks are unchanged, and this document keeps saying Standard and Full War for them. The rename also frees "Standard" for "Standard levels" (L8), which matters online. The plate's length picker quotes each length's upper bound ("up to 8½ min"), which is always true, not its median.

Shorter windows (War Path levels, custom) use the clocks in A18.3.4. **Which window:** Quick Battle and Skirmish let the player pick a start era (default Stone); ladder Arenas 1-2 start at Stone and from Arena 3 the window is the seeded Era of the Week; the Daily Challenge has its own seeded window of Standard length; War Path levels have fixed windows (A18.7.2). A match that starts in a later age starts its base at that age's P and HP.

**Built today (until A18 phase 1):** Short War Stone to Gunpowder (4 ages; 3:45 / 4:45 / 6:15), Standard War Stone to Modern (6 ages; 5:00 / 6:45 / 8:30; also Conquest), Full War Stone to Cosmic (8 ages; 6:45 / 8:45 / 10:45), per A17.8.

After the onboarding the player picks any length before each ladder match on the Home plate's length picker (Short, Medium, Long, No clock). **Owner request 2026-10-03:** every length is on the Ladder from Arena 1 (`ladderFormats` lists all four in every arena; before, Medium opened in Arena 2 and Long and No clock in Arena 3). The picker still shows a padlock and the opening arena for a length an arena does not list. Trophies and Amber per win depend on the format from Arena 3 (A15.8). Last Base Standing moves no trophies (A2.10.1).

| Phase | Effect |
|---|---|
| Regulation | Normal rules |
| Overdrive | Base passive gold (6/s) and passive XP ×2 (Treasury and Economy research income unchanged), Age Power charge ×1.25 (the power rework drops this bonus: reloads run at their normal rate, A2.9.3), faster music layer, gold frame pulse; the falling gate is on (A17.3) |
| Siege | Overdrive effects continue; turret damage −50%, all damage to bases ×2, forced march (unit movement ×1.2), the siege crowd at the gate (A17.3), siege bell, red vignette. **Short, Medium and Long War (every start era): the Siege rope (A2.10.2)**: each second the side fighting in its own half loses a share of its base's max HP, and the rope tightens once. Shorter War Path and custom windows: each base loses 0.5% of its max HP per second (applied every 20 ticks) |
| Final Bell | Higher base HP% wins; a gap ≤ 0.5% (50 bp) is a draw |

**Wins:** destroy the enemy base. Both bases destroyed on the same tick is a draw. Retreat counts as a loss. War Path levels may set another victory rule (`MatchConfig.victory`: hold out until a time, or destroy a marked turret; a marked fort needs a pre-placed fort and is a later proposal, A16.14.5; A18.7.3).

| Classic exploit | Countermeasure |
|---|---|
| Turtling behind 4 turrets | Range cap (560 lu hard cap with research), no base targeting, Siege halves turret damage, the falling gate, bots that refuse to feed turrets (A7.2), turtle proxies gated (A18.12) |
| Staying in the Stone Age to farm | Flat prices, bounty follows cost not age, underdog bonus is only 50% and off while Evolve is available, XP cap |
| Going AFK | Passive gold is small; the clock ends the match |
| Stuck in an age | Passive XP, XP from base damage and from losses |
| Endless fighting at the gate | ×2 base damage in Siege, the Siege rope in Short, Medium and Long War (A2.10.2; Siege decay in the shorter windows) |
| Special every cooldown for free gold | Power kills pay 30% gold and no XP, telegraph, 50% carry cap on evolve, slow Overcharge. With the power rework (A2.9): every cast costs gold and each slot reloads, a cast affects at most 1-6 units, Home powers land only in your own half, the evolve carry is capped at 75% |
| Waiting for the enemy to mass an army, then wiping it (owner, 2026-09-29) | The power rework (A2.9): the target cap makes a big army worth no more than a small one, and only the enemies nearest the caster's gate are eligible (the screen), Home reach cannot touch an army staging in its own half, Front reach needs your army nearby, and the price and reload make an idle ready power lost value |
| Stalling a war that has no Final Bell (Last Base Standing) | Rising Siege steps and the Crumble rope (A2.10.1); a guaranteed end by 25:44 |

#### A2.10.1 Last Base Standing: the war with no clock (owner request 2026-10-01; spec in the session scratchpad `online-home/SPEC.md`)

The war has no Final Bell, no countdown and no win on HP: it ends only when a base falls (or both on the same tick: a draw), or by Retreat (a loss). Pressure rises in steps instead, so it always ends. All values are content data in `FormatDef.escalation`.

| Step | At | Effect (symmetric) |
|---|---|---|
| Regulation | 0:00 | Normal rules |
| Overdrive | 12:00 | As in every format |
| Siege I | 14:30 | Today's Siege (turret damage ×0.5, base damage ×2, forced march, siege crowd, the forts' Siege switch), **with no base decay** |
| Siege II | 17:00 | Base damage ×3.5, turret damage ×0.3 |
| Siege III | 19:30 | Base damage ×5, turret damage ×0.2 |
| Crumble | 23:00 | Siege III, plus the **rope**: each second the side whose own half holds the fight loses 1% of its base's max HP |
| Crumble II | 24:30 | The rope takes 1.5% per second |

Tuned at gate size on 2026-10-01 (fixer review; first values ×3/×4 and ×0.35/×0.25, Crumble 22:00 at 0.5%/s, Crumble II 1%/s, end by 26:35).

- **The rope.**
  - Every decay step, each side's front is the own-frame progress of its most advanced live ground unit. Forts, levies, summons and air units do not count; a side with none has front 0.
  - The side whose front is more than 40 lu behind the other's crumbles. Within 40 lu, or with both sides empty, both crumble.
  - The damage goes through `damageBase`, so Last Stand arms and fires as usual.
  - From Crumble on, evolving keeps the base HP percentage but does not heal.
- **Guaranteed end.**
  - Even from two full bases at 23:00, the rope removes at least 90 percentage points of combined HP by 24:30, then at least 1.5 points per second.
  - So a base falls by **25:44** (`FormatDef.endByMs` 1,544,000, derived from the steps by a content test).
  - The online relay's cap for this format is `endByMs` + 2 min (A18.10).
- **Window.** 7 ages: `last` (Stone to Future); Skirmish also offers `last.bronze`.
- **Rewards.** Unranked: no trophies won or lost. Win 35 Amber (70 without a Sundial capsule); loss or draw 15; **a Retreat pays 0 Amber** (it costs no trophies, so loss Amber for a Retreat at 1:00 would be a free farm at every trophy count). Otherwise it is a Ladder match: a Sundial claim, or a Clay pip (never on a Retreat); a counting win; hidden MMR; loss protection (A6.3, A15.8).
- **Result (A9 #7).** A reason line under the opponent ("Their base fell at 15:02", "Your walls crumbled at 23:41" when the base fell in a Crumble step, "Both bases fell together", "You retreated"), and the trophy row reads "Unranked · stays at N".
- **HUD (A9.2).**
  - The clock counts up.
  - The timeline becomes a 6-pip escalation meter (Overdrive, Siege I-III, Crumble I-II) with the step's name under the clock. A tap shows the schedule as a drop-down that never pauses.
  - Each step plays a 1.2 s banner and a drum hit.
  - The crumbling side gets a "Crumbling" chip, a cracked HP bar and falling-stone dust. A rope marker sits at mid-lane on the minimap.
  - VS: "No clock · Siege rises every 2½ min from 14:30 · Crumble from 23:00" (built from the steps).
- **AI (A7).** As built (fixer review, 2026-10-01; the earlier draft asked for more):
  - Research stays allowed in Siege I-III when the format has no Bell, and the bot reads no Bell from the shared 7-age window.
  - Forts follow today's Siege switch: no new fort from Siege I on, in every format (the sim refuses the command), so there is no fort-turtle row in `sim-cli lbs`.
  - Bots already Charge in every Siege step (forced march), so the push value needs no per-step term, and no separate "hold the front past mid-lane before Crumble" rule is built.
  - A bot crumbling alone goes all-in (its low-base-HP branch).
  - Revisit these three only if the owner check or the gates show bots stalling into Crumble.
- **Why this shape.** Measured on an emulation (tier VII Echo mirrors, baseline plans at L7, 7 ages; indicative until the gates re-measure the real rule):
  - Only removing the Bell (today's decay continues) ended like a Full War, with **20% draws** from both bases decaying to 0 on one tick.
  - Siege with no decay left 1 of 40 Full-window and **16 of 40** Standard-window wars running at 60:00.
  - The chosen steps: median 19:35, p90 25:20, longest 26:14, 0 draws, 30% ending in Crumble, first-mover 41/39 (n = 80). A turret turtle won 0 of 40; cheap spam 0 of 40.
  - **The real rule at gate size** (`sim-cli lbs --mode full`, 400 tier VII mirrors, seeds 9001+): the first values ended **41.3%** of mirrors in Crumble (43.8% on 80 smoke seeds 31001+). Levers, each n = 400: Crumble 30 s later 39.8%; Siege II-III 30 s earlier 42.0%; Siege II-III ×3.5/×5 with turrets ×0.3/×0.2 36.8%; that plus Crumble 22:30 34.8% (37.0% on seeds 31001+); ×4/×6 38.3%; Crumble 23:00 at 1%/s and 1.5%/s alone 37.3% (35.8%). The tier VII mirror stalls mid-lane (the Full War's Bell problem, A2.14), so no single lever moves it far.
  - **Chosen** (the last two together): median 19:53, p90 24:44, longest 25:36, 0 draws, **32.5%** in Crumble (35.0% on seeds 31001+), first-mover 49.3%; every turtle proxy, `rope_runner`, `cheap_spam` and `few_then_evolve` won 0 of 80, and `idle` lost 80 of 80. Wars end across every step: 56 / 56 / 76 / 82 / 75 / 55 in Regulation and Overdrive, Siege I, II, III, Crumble, Crumble II.
  - **B3 time.** The longest war (about 30,700 ticks) takes 1.17-1.37 s headless with bots on the shared 4-core cloud machine (best of 3 solo runs; 1.3-1.9 s across single runs), against 1,300 ms; the Full War at its Bell (21,000 ticks) takes 0.81-1.02 s there against its 850 ms. Late Siege costs about 10% more per tick than a Full War. Open for the lead: profile late Siege, or re-baseline the target per tick.
- **Gates (L5).**

  | Metric | Target |
  |---|---|
  | Tier VII mirror length | Median 17:00-23:00; p90 ≤ 26:00; none past `endByMs`; ≤ 35% ending in Crumble |
  | Draws | ≤ 2% |
  | First-mover | 47-53% |
  | Turtle proxies (turret, home, fallback, tech; no fort turtle, see AI) and `rope_runner` vs tier VII | Each ≤ 45% |
  | `cheap_spam` | ≤ 20% |
  | `idle` | Loses 100% |
  | Goldens 01-14 | Bit-identical (the timed formats are untouched) |

  Levers: step times ±30 s, the rope's rate, the dead band, and a front taken as the army-value centroid instead of the lead unit.

#### A2.10.2 The Siege rope in Short, Medium and Long War (owner decision 2026-10-02)

The owner said yes to the audit's "rope" in the timed formats: the side pushed back into its own half slowly loses base HP, like Last Base Standing's Crumble. It rewards the side that presses and stops a war being won by hiding in defence until the Final Bell. All values are content data (`FormatDef.escalation`, built from `TIMED_ROPE` in `raw/economy.ts`); the sim rule is A2.10.1's, unchanged.

- **Where.** Every Short, Medium and Long War window (any start era, so also the Daily Challenge and Skirmish windows of those lengths). The shorter War Path and custom windows (1, 2 and 4 ages) keep today's Siege with its symmetric decay.
- **What changes in Siege.** No symmetric 0.5%/s decay. Instead, on each 1 s decay beat, the side whose front (its most advanced live trained ground unit) is more than 40 lu behind the other's loses the step's rate of its base's max HP; within 40 lu, or with both lanes empty, both lose it (A2.10.1 "The rope"). It goes through `damageBase`, so Last Stand arms and fires as usual. Turret ×0.5, base damage ×2, forced march and the siege crowd stay.
- **Steps** (Siege I = Siege; the second step is "Siege II"):

  | Format | Siege (rope) | Siege II | Final Bell |
  |---|---|---|---|
  | Short War | 6:30, 0.6%/s | 7:15, 1.1%/s, base damage ×3, turret damage ×0.35 | 8:30 |
  | Medium War | 10:00, 0.55%/s | 11:00, 1.05%/s | 12:30 |
  | Long War | 14:30, 0.4%/s | 15:30, 0.85%/s | 17:30 |

  Short's Siege lasts only 2:00, so its rope is stronger and its second step also hits bases harder.
- **The Final Bell stays.** Higher base HP% wins; a gap ≤ 0.5% is a draw. From the rope's first step evolving keeps the base HP percentage but does not heal (A2.10.1 rule).
- **HUD (A9.2).** The countdown and timeline stay; a cracked-stone mark on the timeline shows where the rope tightens, and the phase tag reads "Siege", then "Siege II". The clock is a button: a tap drops the schedule down (Overdrive, Siege with its rope, Siege II, Final Bell; folds after 3 s, never pauses). The Siege banner says "The side in its own half crumbles"; Siege II has its own 1.2 s banner ("Crumbling speeds up to 1.05% a second"; Short: "Bases take ×3 damage · crumbling 1.1% a second"). The crumbling side gets the "Crumbling" chip, the cracked HP bar and falling stones (MR-126), as in Last Base Standing.
- **Teaching.** A new adaptive hint (A8): after 4 rope beats on your base within 20 s, "Your base crumbles. Push past the middle!" pointing at the stance control (the usual limits: 30 s gap, 2 a match, 3 per profile). The search tip reads "In Siege the side fighting in its own half crumbles. Push!".
- **VS and Result.** VS shows "Push or crumble · Siege from 6:30: the side fighting in its own half crumbles". The Result's reason line, as in Last Base Standing: "Their base fell at 5:31" before Siege, "Their walls crumbled at 7:41" / "Your walls crumbled at 7:41" in Siege, "You led at the Final Bell" / "They led at the Final Bell" / "Even at the Final Bell", "Both bases fell together", "You retreated".
- **AI (bots know the rope).**
  - `Observation.escalation` also carries `finalBellTick` (null in Last Base Standing), so a bot keeps the Bell's research horizon and stops research in a timed Siege while it reads the rope and who crumbles.
  - In the last 30 s before a rope that runs from Siege, a Holding bot stages its flag forward (short of mid-lane and of the enemy) instead of inside its turret cover, so Siege's charge meets the enemy near mid-lane rather than at its own gate.
  - The Last Base Standing all-in of a bot crumbling alone is not used in a timed war: the Bell still decides there, and feeding every coin into a stronger line lost faster (`flag_ball`, Short War: 52% with neither rule, 47% with the staging, 41.5% with both).
  - Bots already Charge in Siege and never fall back from Overdrive on.
- **Contracts and replays.** One additive contract field (`ObservedEscalation.finalBellTick`); the observation is not hashed and the sim rule is unchanged, so `SIM_VERSION` stays 6.0.0 and goldens 01-15 keep their hashes (they play the frozen fixture). The content hash changes, so older replays of timed formats show their result card only (A18 "Replays").
- **Measured** (mirror lab, tier VII Echo mirrors with each age's bot Fort card, baseline plans at L7, seeds 1-400 per format; tier V seeds 1-200; exploit rows `sim-cli exploits`, n = 200 per proxy and format, mirrored seats):

  | Row (Short / Medium / Long) | Before (symmetric decay) | After (rope and AI) |
  |---|---|---|
  | Final Bell, tier VII (target 10 / 8 / 5%) | 23.8 / 8.8 / 3.8% | **8.0 / 5.0 / 4.0%** |
  | Draws, tier VII | 9.0 / 2.8 / 1.5% | **0 / 0 / 0%** |
  | Medians, tier VII (targets 7:00 / 10:30 / 15:00) | 7:49 / 10:52 / 15:14 | 7:39 / 10:58 / 15:21 |
  | First-mover, tier VII | 55.0 / 54.9 / 50.5% | 48.5 / 53.3 / 51.8% |
  | Final Bell, tier V (draws) | 14.8 / 14.0 / 1.8% (0 / 1.8 / 0.3%) | 8.5 / 9.0 / 5.0% (0 / 0 / 0.5%) |
  | `flag_ball` vs tier VII, Short / Medium (≤ 45%) | 29.3 / 13.0% (16.5% draws in Short) | 41.0 / 16.5% |
  | `fallback_turtle`, Short / Medium (Bell share) | 0 / 0% (6 / 10%) | 0 / 0% (0 / 0%) |
  | `turret_turtle`, `tech_turtle`, Short / Medium | 0.3 / 2.0%, 0.5 / 3.3% | 0 / 0%, 0 / 0% |

  How it was tuned (tier VII Bell %, Short / Medium / Long):
  - With the bots as they were: the audit's 1 → 1.5%/s everywhere 4.5 / 0 / 0 (every stall crumbles out); 0.5 → 1%/s in Medium and Long 12.5 / 3.5 (milder than the symmetric decay it replaces); Short 0.75 → 1.25%/s 10.5, 0.85 → 1.35%/s 7.8 (n = 400).
  - `flag_ball` then won **52%** of Short Wars (gate ≤ 45%) at every rope rate: it used to stall at the bot's gate until the Bell (40% to 40%, a draw), and the rope gave those wars to it. A wider dead band (120 or 200 lu) changed nothing (46-47%); the two AI rules above brought it to 41%.
  - With those AI rules mirrors stall less: 0.85 / 0.65 / 0.6%/s fell to 3.5 / 2.5 / 0.3%, so the rope was eased to the values above (0.7 / 0.5 / 0.45%/s: 6.5 / 8.5 / 1.5%; 0.6 / 0.45 / 0.4%/s: 8.5 / 9.5 / 3.5%; n = 200).
  - The rope barely moves the medians: they come from the age pacing (A18.3.1), which stays open.

### A2.11 Comeback tools (visible and counterable)

- XP from your own losses (50% of cost from A18 phase 1; 40% before).
- Underdog bounty (+50% gold and XP).
- Underdog research discount (A18.5.1): a side whose age position is lower than the enemy's, or whose base HP is 20 or more percentage points lower, pays −20% for research started while that holds.
- A smaller kill bounty (50%) and less kill XP (70%), so the winner is not paid twice (A18.2 rule 6).
- Defender's advantage: short reinforcement walk plus turret cover at the hold line.
- The 50% power carry cap, which stops a leader chaining specials across an evolve (70% with the Reserve Charge research, v1.1). With the power rework: each slot's progress is capped at 75% across an evolve, and Home powers are strongest for the side being pushed into its own half (A2.9.3, A2.9.4).
- **Last Stand (once per match):**
  - Arms when your base is at or below 25% HP. Both sides see a horn icon on the armed base.
  - Tap it: 1.0 s charge (horn, glow), then a volley hits every enemy unit (ground and air) within 450 lu of your gate for 200 × P(your current age) × your loadout multiplier (Legendaries 50%) and knocks ground units back 80 lu.
  - If unused, it fires automatically at 10% HP.
  - Kills pay 30% gold and no XP.
  - In match 1 the button is hidden and Last Stand is automatic only; the manual button appears from match 2 (built 2026-09-28; A8 had match 5). The Last Stand Drill research (v1.1) arms it at 35% base HP and makes it hit 20% harder.
  - The attacker can play around it by holding back.
- There is no hidden rubber-banding of any kind.

### A2.12 Player controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Train unit (6 cards from A18 phase 2; 5 before) | Tap card | 1-6 |
| Cancel | Right-click or long-press a card cancels its last queued instance | Backspace (last item) |
| Build turret | Tap an empty mount, then a card | Q / W (next free mount, or the oldest outdated turret when none is free) |
| Modernise or sell turret | Tap an occupied mount: popover with Modernise cards and Sell (confirm) | Shift + click mount to sell |
| Buy mount | Tap the "+" mount | B |
| War Council (A18.5; replaces Treasury) | Tap the round button right of the gold counter; a bottom sheet opens | G (T is freed). Until A18 phase 3: Treasury, tap the gold counter, T |
| Evolve | Tap Evolve on your XP bar | E |
| Age Power | Drag from the button onto the lane or the minimap; a tap starts aiming, then tap the lane (A18.9.2). Power rework (A2.9.10): two buttons, Home and Field, each dragged the same way inside its legal band | Space (auto-aim). Power rework: Space = Home, X = Field, each auto-aimed |
| Stance Charge / Hold / Fall back (A18.4) | Three-segment control above the tray; drag the Hold flag on the lane or minimap while Holding | S toggles Charge and Hold; Shift+S Fall back |
| Camera (A17.4) | Drag or swipe the lane, wheel, tap or drag the minimap, base and front buttons, double tap resets | ← / → pan (Shift faster); H or Home: own base; J or End: follow the front |
| Last Stand | Tap when armed | L |
| Emote (6) | Emote button in the top bar | none |
| Pause | Top-right button | P (never Esc) |
| Speed 1x / 1.5x / 2x | Button (all v1 modes) | F |

Speed and pause are allowed in every v1 mode because all opponents are AI. They are removed for PvP later. Default speed is 1x. While paused, the camera still pans, so the player may scout the lane (A17.4).

### A2.13 Expected match flow (Standard War, two mid-tier players; A18)

| Time | What typically happens |
|---|---|
| 0:00-0:15 | Both open with 2-3 units; the camera walks out with them; first clash near mid-lane (p ≈ 1,000) at ~0:13 |
| 0:30-0:50 | First turret; first research (Granary or Forage, or a Troops rank I) |
| 0:50 | First-age power ready; cast in the age's middle. Power rework (A2.9): the Home power is ready at ~0:30 (it starts 25% reloaded) and costs 75-100 gold, so its first cast competes with a unit or a turret |
| ~1:10 | Second age; 2 Vanguard Infantry march out; rank II research opens |
| 1:30-2:40 | One research, the first fight with the new troops, one power cast (power rework: 1.5-3.5 paid casts per age over both slots, A2.9.12); the push to evolve is timed against the enemy's research and power rings |
| ~2:50 | Third age; first Epics |
| ~4:35 | Fourth age; rank III opens (v1.1); turrets modernised; first Legendary pushes |
| ~6:25 | Fifth and final age; Overcharge |
| 8:00 | Overdrive: big pushes |
| 8:30-12:30 | Most matches end (median 10:30) |
| 10:00-12:30 | Siege with forced march; Final Bell is rare (≤ 8%) |

Every age has an arrival (15-20 s), a middle (40-60 s) and a push (20-35 s), A18.3.1. The built A17 flow (Full War, 8 ages, evolves every ~30-80 s) is in A17.8 and holds until A18 phases 1 and 3.

### A2.14 Balance targets (checked by the headless sim, B12)

**Status (MVP balance pass, 2026-10-01; `docs/decisions.md` "MVP pass: balance").** The power trim (Home bombards and sweeps 125 gold and one target fewer, Field charges and front barrages one target fewer), base HP 8,000 × P, the falling gate at 300 lu, seven Legendaries, fourteen War Path and Road powers, and AI rules (a set ball in the push gate, A7.2; fort placement; the Last Stand margin). Bots carry their Fort card; n = 400 per format:

| Mirror (Short / Standard / Full) | Final Bell before | Final Bell after | Draws after | Medians after |
|---|---|---|---|---|
| Tier V | 38.7 / 42.7 / 21.3% | **14.8 / 14.0 / 1.8%** | 0 / 1.8 / 0.3% | 7:27 / 10:26 / 14:53 |
| Tier VII (release row) | 48.0 / 57.3 / 32.3% | **23.8 / 8.8 / 3.8%** | 9.0 / 2.8 / 1.5% | 7:49 / 10:52 / 15:14 |
| Tier VII, no forts | 48.7 / 58.0 / 32.3% | 28.0 / 9.3 / 4.5% | 10.3 / 1.5 / 2.3% | 7:55 / 10:45 / 15:24 |

The release targets below hold in Standard (8.8% against 8%, within noise) and Full; tier VII Short War (23.8% against 10%) was the open Bell row until **the Siege rope (A2.10.2, owner decision 2026-10-02): tier VII Final Bell 8.0 / 5.0 / 4.0%, draws 0 / 0 / 0%, medians 7:39 / 10:58 / 15:21 (n = 400 per format)**. The balanced-mirror tool row (tier V, starters only, no forts, n = 200): Bell 15.0 / 17.5 / 3.5% (was 46 / 42 / 16.5%), medians 7:34 / 10:33 / 14:37, power share of enemy value killed 17.9 / 19.7 / 17.4% (was 19.9-22.4%; target 5-12%, open), one cast touches 36.7 / 40.0 / 33.3% of a big army (was 45-47%), base time to kill 63-103 s (was 126 s; target 40-60 s, open).

All card tests use both sides at tier V with the Balanced brain and every card at L7. Exploit tests use the scripted proxy against a tier VII Balanced bot at L7, in Short and Full War, with at least 400 matches per proxy; proxies decide every 0.5 s from the delayed `Observation` (A16.5). Rules-sanity tests run scripts against scripts, with no bot. The power rework gates (A2.9.12) use these setups too, with one statement for all of them: exploit proxies vs tier VII in Short, Standard and Full War; mirrors with starters only; the P0 and P1 Bell comparisons use tier V mirrors (the setup of today's measure), and the release Bell targets are the tier VII rows below.

| Metric | Target |
|---|---|
| Short / Standard / Full War median (A18.12) | 7:00 / 10:30 / 15:00; 80% of matches in 5:30-8:30 / 8:30-12:30 / 12:00-17:00. Until A18 phase 1 (A17.14): Short 4:45, Standard 6:30 (80% 5:00-8:00), Full 8:30 (80% 6:45-10:15) |
| Final Bell, tier VII mirror, baseline plan | ≤ 10% of Short Wars, ≤ 8% of Standard Wars (A18.12), ≤ 5% of Full Wars |
| Final Bell, tier VII mirror, a Legendary in each plan | Reported |
| First evolve | A18.3.1: median stay in the first age 60-75 s. Until A18 phase 1 (A17.14): median 52 ± 10 s |
| Later evolves | A18.12: median stay per age per A18.3.1; no age after the first under 75 s; the winner's evolve lead at the 3rd evolve ≤ 30 s. Until A18 phase 1: within ±20 s of A17.8 and every scripted strategy reaches Cosmic (Full War) between 5:45 and 7:30 |
| First clash, contact in the middle, camera, one power per age (A17.14) | First clash median 0:11-0:16; contact share between the turret covers reported; auto-follow keeps the contact on screen ≥ 90% (e2e); ≥ 70% of age stays include a power cast (power rework: plus the casts-per-age row of A2.9.12) |
| Age Powers (power rework, A2.9.12) | P0 go/no-go before any contract change; power share of gold 8-16%; power share of enemy value killed 5-12%; one cast touches ≤ 40% (p50) of the value of an enemy army worth ≥ 750; p99 of card value killed per cast ≤ 350; median 1.5-3.5 casts per side per age; `power_hoarder` ≤ 40% with ≤ 20% at the Bell; `bait_wave` beats `plain_wave` against it by 5-20 points; `power_spam`, `drop_spam`, `runner_reach` ≤ 45%; `no_power` loses 60-80%; `home_turtle` in the turtle band; per power ±3 against its slot's starter in its setup (Flak and Suppress in a matchup); each age's three options per slot within ±5 points; static family targets for every power; Full War median ≥ 12:00 |
| War Council, stances, difficulty, War Path (A18.12) | Research share of gold 15-25%; 5-8 items per Standard War; `no_research` loses ≥ 70%; `few_then_evolve` wins ≤ 10% vs Normal and ≤ 2% vs Hard; each pick pair within ±5 points with pick-flip ≥ 30%; `flag_ball` ≤ 45% vs tier VII; `stance_toggler` no better than without toggling; War Path levels in their role bands (A18.7.2) |
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
| Anti-heavy duels (static, real sim, L7, equal gold; owner feedback 2026-09-29) | Anti-heavy vs Heavy M 65-85 in every age at 6 v 4 and 3 v 2; ≥ 60 swapped into an Infantry mix; 1 v 1 ≥ 40 in the melee ages; Heavy vs Infantry and Infantry vs Anti-heavy ≥ 65. Measured with the A2.6 numbers: 72-89, 68-83, 59-78, 49-52, 66-84, 73-84 (before: 41-80, 36-78, 46-74, 19-28, 66-84, 72-85) |
| Anti-heavy per-age lane gate (review 2026-09-30) | In every one-age window `w1.<age>`: mono Heavy vs tier VII ≤ 35% and mono Anti-heavy vs mono Heavy ≥ 70% (40 matches per row and age in the smoke run). Measured: mono Heavy 0 / 0 / 0 / 2.5 / 5.0 / 0 / 6.3 / 0% (Stone to Cosmic; Industrial was 87.5%), mono Anti-heavy 100% in every age except Gunpowder 75% (Modern was 0%) |
| Anti-heavy package guard | Mono Heavy vs tier VII ≤ 35% in Short and Standard (as built: **14.0 / 26.5%**, after the review fixes **0 / 0%**; 73.5 / 73.0% before); the Standard War mirror Bell not above today's (tier V 23.0%, tier VII 40.0%; as built **35.5 and 53.0%**, open; after the review fixes of 2026-09-30 **41.5 and 58.0%** (tier X 51.5%; ±7 points at 200 matches), still open: the fixed Industrial counter did not bring it down, and restoring the old Harpoon Gunner numbers alone gave 36.5% at tier V while mono Heavy won 72.5% in Industrial again; Short 47.0 → 45.0 and 57.0 → 50.0%; 200 matches each). Measured Standard levers on the built package (tier V / VII): Gunpowder and Industrial back to ×2.0 with Brace and no HP 31.0 / 52.0% (and mono Heavy 36.5%), the Harpoon Gunner alone at ×2.0 34.0 / 46.0%, Siege base damage ×3 33.0 / 49.0%, ×4 31.0 / 45.5%: none closes it, so the Gunpowder and Industrial lines stay and the Standard grind goes to the owner with the Supply Cache (A18.3.5) as the next step |
| Rules sanity: skill gradient (Save-and-counter vs Balanced script; Balanced script vs cheapest spam) | Each ≥ 80% |
| Has-an-answer (static, `counters.json`) | A same-age card scores ≥ 55% at equal gold against every non-Legendary card; Legendaries reported, including the three A17 Legendaries (A17.11) |
| Has-a-starter-answer (static) | Reported |
| Bot tier gaps (VII vs V, X vs V, VII vs III); attention gap; level edge +1 | Reported |
| Base time to kill | A full army (60 pop) of same-age L1 Commons with no opposition needs 40-60 s to destroy a full same-age base |
| Power damage per unit in zone | Within the A2.9 target for every damaging power (including Tidal Wave, Iron Horse, Zeppelin Raid and Starfall); with the power rework, within its family's target (A2.9.6) |
| B3 performance | Headless Full War ≤ 500 ms (A17, 12,900 ticks); ≤ 850 ms from A18 (21,000 ticks) |
| Damage per gold per card | Reported per age; not gated |

The targets that tighten after v1 are in A16.5. **Release rule for the Bell rows:** if Phase 3 cannot meet a v1 Final Bell target after the A16.4 levers, the lead records the measured value in `docs/balance-log.md`, tells the owner in plain words, and the row becomes the first v1.1 task. The Bell rows alone do not block the v1 release; every other row does (C4).

**Baseline plan per age:** the 3 Commons, the AA Rare and the Support Rare, both Common turrets and the default power (with the power rework: both starter powers, Home and Field; a tested power replaces the starter of its slot). A tested Rare replaces its same-role card; a tested Epic or Legendary replaces the Support Rare; a tested turret replaces the same-rarity-slot Common turret (the second slot for Rare and Epic turrets).

## A3. Deck rules: the War Plan

- **Structure.** A War Plan holds one Age Loadout per age (eight since A17, thirteen at the A18.8 target). A loadout has **6 unit slots** (A18.9, owner direction; 5 until A18 phase 2), 2 turret slots and 1 Age Power, and later 1 Fort slot (A18.9, phase 6), all from that age, all owned, with no duplicates. Slots may be empty. A train command on an empty slot is rejected. Save v3 fills the new sixth slot automatically. **Power rework (A2.9.1):** the 1 Age Power becomes 2 typed power slots, **Home** and **Field**; a Home power fits only the Home slot. The Field slot unlocks at the first clear of War Path Stone L5 or at 150 trophies, and both sides of a match always play the same slots.
- **Minimum to play:** 3 units and 1 turret per age used by the format. The starter kit always satisfies it. A match uses only the loadouts of its age window (A18.3.4); auto-fill fills a missing loadout from starter Commons, so a plan is never unplayable.
- **Tray.** In battle all unit cards of the current age are always available; there is no hand cycling. On evolve the cards flip over (300 ms) to the next loadout.
- **Scouted list.** Each opponent card joins a "Scouted" list the first time the opponent plays it. It opens from a chip in the top bar and in the pause menu. Nobody sees the full enemy plan in advance.
- **Starter kit.** From the first launch the player owns every Common (3 units and 2 turrets per age), **every age's Anti-heavy Rare** (owner feedback 2026-09-29, build phase H3) and each age's default Age Power, all at L1 (with the power rework: each age's two starter powers, one Home and one Field, A5.7). The starter loadout of each age holds its 3 Common units and its Anti-heavy card (slot 4). The Anti-heavy cards stay Rare (copies and upgrades as before). Before this change they arrived by script (A17.13: Spear Hunter and Phalangite in capsule 1, equipped for you; Pikeman and Grenadier in capsule 2, **not** equipped; Harpoon Gunner and Bazooka Trooper at the Arena 2 gate; Rail Gunner and Graviton Halberdier at Arena 3), so a new player's Medieval played Short War with no answer to Heavies while every bot plan held one. The scripted capsules now bring the Support Rares (capsule 1 Drum Shaman and Standard Bearer, capsule 2 Friar and Field Surgeon) and each Age Unlock Capsule holds its age's Support Rare ×1 and its 3 Common units ×4. **Save migration** (additive, idempotent, with fixtures): grant each missing Anti-heavy Rare at L1 and put it into an empty unit slot of its age in every War Plan, never replacing a card; a save that already owns one keeps its level and copies.
- **Chase cards** (from capsules): per age, the Support Rare (also scripted, above), the Long range Rare (A5.1), the Rare turret, the Epic unit, the Epic turret and the Legendary unit. Alternate Age Powers come from Trophy Road nodes at 100-500 trophies (A6.3). With the power rework, 24 more powers come from War Path first clears (each region's L5, L7 and L9), with a Trophy Road fallback on nodes 550-1,950; powers are never in capsules, have no copies and no levels (A2.9.8, A5.7).
- **Presets and helpers:**
  - 3 War Plan presets, each renamable. From v1.1 up to 5, and the player picks one after the battlefield is revealed on the VS screen (A16.9). New presets start empty.
  - Auto-fill picks the highest-level card per slot while keeping at least one Heavy or Legendary, one Ranged and one AA per age, plus an air-hitter from Gunpowder on.
  - The builder shows each loadout's average level and the War Plan average (over the ages the next format uses).
  - The builder is a clear deck builder (A18.9.3): age tabs, drag or tap into slots, the counter legend and class icons (A18.9.1). Per age it shows In battle, Available and Locked top to bottom (owner request 2026-09-30); every age's cards are in the Card Album (A9 #10).
  - **Research compatibility (A18.5.2).** The builder shows, per age loadout, which classes it holds, so a player sees that a Troops research line is wasted in an age with no card of that class.
  - After a capsule, the summary offers "Equip now" for a new card: it fills an empty slot, else the same-role slot, else the lowest-level slot.
- **Deck advisor.** Warnings, never blockers:
  - "Stone has no anti-heavy" (the class name, A2.6)
  - "Modern cannot hit air" (no air-hitting unit or turret)
  - "Medieval has only 3 units"
  - "No splash anywhere: swarms will hurt"
- **Rarity is a sidegrade.** Every card starts at L1 and gains the same +5% per level. At equal level, Rare, Epic and Legendary cards are more specialised, not more efficient. Balance rule: A2.14.
- **Unlock order (built 2026-09-28).** Match 1 uses scripted trays. Match 2 uses the full Short War starter plan. The War Plan screen, Customize, Quick Battle and Skirmish open after match 1 (was match 3). The stance flag is there from match 1 and the manual Last Stand button from match 2 (was matches 4 and 5). With the War Path (A18.7.5) the War Council, Fall back and the Hold flag are taught on its nodes.

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
| Anti-heavy (melee reach; Anti-armor role) | 100 | 2.5 s | 4 | 220 (was 200) | 26 / 1.2 s, ×3.0 vs armored and mech | 21.7 (65 vs Heavy) | 60 | 70 | medium |
| Anti-heavy (ranged) | 100 | 2.5 s | 4 | ~130 (was ~120) | per card, ×2.5-3.0 vs armored and mech | per card | 150-240 | 65 | medium |
| **Long range** (Ranged class, Rare; owner feedback 2026-09-30, build phase H6) | 75 | 2.0 s | 3 | 85 | 34 splash r35 / 2.6 s, arc | 13.1 (+50% to up to 3 more) | the age's Ranged Common + 120 (320-390), min 90 | 60 | small |
| Support | 110 | 3.0 s | 4 | 130 | heal 30/s or aura | - | 150 | 65 | small |
| Epic | 200 | 4.0 s | 8 | varies | varies | - | - | - | varies |
| Legendary | 350 | 7.0 s | 14 | ~3× Heavy | ~1.5-2× Heavy DPS plus a trait | - | - | - | huge |

**Collection:** 56 units + 32 turrets = 88 cards (40 Common, 24 Rare, 16 Epic, 8 Legendary) over 8 ages since A17 (A17.13; was 55); with the Long range Rares (build phase H6) 64 units and 96 cards (32 Rare), 8 units per age in the schema, album numbers appended after the last (A18.9.3); plus 16 Age Powers (starter and Trophy Road, not capsules), 12 skins and 3 foil variants per card. Schema checks per age: 7 units, 4 turrets, 2 powers. With the power rework (A5.7): **48 Age Powers** (16 Common, 16 Rare, 16 Epic; starters, Trophy Road and War Path, never capsules) and 6 powers per age in the schema (3 Home, 3 Field). The tables A5.2-A5.6 hold the five original ages; Bronze, Industrial and Cosmic are in A17.9-A17.11. Each A18 age adds the same per-age set plus 1 fort card once forts exist (A18.8.3). The tutorial-only Training Dummy is hidden and not collectable.

**Anti-heavy class traits** (A2.6): every card has Brace (immune to knockback and first-hit bonuses); its mods start with `legendary` at the old multiplier, so Legendary matchups do not change.

**Long range** (owner feedback 2026-09-30: "krigere i skyde-klassen som kan skyde en del længere men f.eks. angriber langsommere, f.eks. longbow mænd der skyder i en parabel"; decided, not built; build phase H6). Ranged class with a "Long range" trait (the Ranged badge plus an arc glyph); role and group `ranged`, so pop, research lines and queue conversion treat it as Ranged (conversion prefers the new loadout's card with the same trait, else the group's first card; prices are flat within the group). One Rare per age from capsules. Ground only (arcs never hit air), `vsBaseDamage` 50%, priority front. The projectile is an **arc** at 300 lu/s (1.1-1.3 s in the air at range) with splash aimed at the target's position at fire time (A2.7), so a walking unit steps out of the 35 lu circle and a fighting one does not; the renderer draws the parabola and a **landing marker** at `projectileFired.toX` that closes over `travelTicks` (view only; no sim change). Range stays ≤ 390, at least 90 lu inside every Rare arc turret (480) and within 20-40 lu of the single-target Common turrets. Counters: air, Rare arc turrets, anything that reaches it (min range 90, 85×P HP: a breakthrough, a Field charge running 450-600 lu, a drop, a strike) and Ranged units that walk inside 90 lu; divers only if their leap search reaches the back line (option: Sabertooth pounce search 150 → 350, Warp Stalker 200 → 400, each gated by its per-card ±3 row). Measured on a prototype (A2.14 per-card rows, 200 matches, replacing the age's Ranged Common): Yeoman Archer −1.8 [−8.0, 4.5], Atlatl Thrower −8.5 [−15.2, −1.8]; the gate is the ±3 row, levers in order interval, splash radius, damage; new proxies `mono_longrange` (≤ 35%) and `longrange_turtle` (the turtle band).

| Age | Card (id) | HP | Damage (splash r35 / 2.6 s) | Range (min 90) | Look |
|---|---|---|---|---|---|
| Stone | Atlatl Thrower (`atlatl_thrower`) | 85 | 34 | 320 | a spear-thrower hurling long darts high |
| Bronze | Cretan Archer (`cretan_archer`) | 99 | 39 | 330 | a tall recurve bow aimed skyward |
| Medieval | Yeoman Archer (`yeoman_archer`) | 115 | 46 | 350 | the owner's longbowmen: a great longbow, volleys in a high arc |
| Gunpowder | Coehorn Crew (`coehorn_crew`) | 155 | 62 | 360 | a two-man hand mortar |
| Industrial | Trench Mortar (`trench_mortar`) | 180 | 72 | 370 | a stovepipe mortar and a loader |
| Modern | Mortar Team (`mortar_team`) | 209 | 84 | 380 | a light mortar on a bipod |
| Future | Arc Lobber (`arc_lobber`) | 282 | 113 | 380 | a plasma lobber with a glowing shell |
| Cosmic | Star Mortar (`star_mortar`) | 381 | 152 | 390 | a gravity mortar that lobs a small star |

**Default projectile speeds (lu/s):** rock 500, arrow 650, musket 1,500, bullet 1,500, shell 1,200, rocket 900, arc/lob 450, plasma bolt 1,800. Lasers and rails are instant.

Table key: C/R/E/L = rarity; S/M/L/H = size; Hits: G = ground, A = air; "Blunt" = armored ×0.70; "AA mods" per A2.6. Per-card projectile, sound and damage type are in A14.2.

### A5.2 Stone Age (P 1.00)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bonker | Bonker | C | Infantry | 50 | 160 | 20 / 1.0 s | 16 | 70 | S | G | light bio melee | Blunt |
| pebbler | Pebbler | C | Ranged | 75 | 95 | 18 / 1.4 s | 200 | 65 | S | G+A | light bio ranged | Rock. Ricochet: the rock bounces to 1 more enemy within 40 lu (chain, 2 targets total) |
| tuskback | Tuskback | C | Heavy | 150 | 560 | 42 / 1.5 s | 16 | 55 | L | G | armored bio melee | Gore: first hit of each engagement ×2 and 30 lu knockback |
| spear_hunter | Spear Hunter | R | Anti-heavy | 100 | 220 (was 200) | 26 / 1.2 s | 60 | 70 | M | G | light bio melee | Reach; melee Anti-heavy mods (armored ×3.0); priority armored; Brace (new); starter kit |
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
| pikeman | Pikeman | R | Anti-heavy | 100 | 297 (was 270) | 35 / 1.2 s | 70 | 70 | M | G | light bio melee | Reach; melee Anti-heavy mods (armored ×3.0); priority armored; Brace (immune to knockback and to first-hit bonuses); starter kit |
| friar | Friar | R | Support | 110 | 175 | 11 / 1.2 s | 150 | 65 | S | G+A | light bio support ranged | Heals 40 HP/s split between the 2 lowest-HP% allies within 160 lu; followSupport |
| battering_ram | Battering Ram | E | Siege | 200 | 900 | 160 vs base / 2.0 s (10 vs units) | 12 | 45 | L | G | armored mech melee | siegeOnly: targets the base; attacks units only while blocked |
| ursa_paladin | Ursa Paladin | L | Siege heavy | 350 | **2,150** | 70 / **2.0 s**, cleave | 20 | 55 | H | G | armored bio melee legendary | Cleave: 2 targets total, the second within 40 lu behind the primary. Roar every 15 s while it has a target: the nearest 8 allies within 200 lu get a **35** HP shield for 6 s (MVP balance pass 2026-10-01: was 2,300 HP, 1.4 s, 60 shield; +8.8 → +2.5 points) |

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
| grenadier | Grenadier | R | Anti-heavy | 100 | 253 (was 230) | 55 splash r35 / 1.8 s (was 50) | 150 | 68 | M | G | light bio ranged | Lob over allies; legendary ×1.5, armored ×2.5, mech ×2.5 (were ×1.5), light ×0.5; priority armored; Brace (new); starter kit |
| field_surgeon | Field Surgeon | R | Support | 110 | 237 | 15 / 1.2 s | 150 | 65 | S | G+A | light bio support ranged | Heals 55 HP/s split between the 2 lowest-HP% allies within 160 lu; followSupport |
| bronze_cannon | Bronze Cannon | E | Artillery | 200 | 500 | 110 splash r50 / 3.5 s | 280 (min 80) | 45 | L | G | light mech ranged | Arc |
| balloon_admiral | Balloon Admiral | L | Air bomber | 350 | **1,200** | **85** splash r50 / 1.6 s | bombs below (±40 lu) | 45 | H | G | air legendary | Bomber; bombs the base at the enemy gate (110 per bomb); on death crashes for **200** splash r70 on ground enemies (MVP balance pass 2026-10-01: was 1,500 HP, 110, 250; +5.2 → −1.6 points) |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| swivel_gun | Swivel Gun | C | 150 | 22 / 0.6 s | 340 | G+A | Single target |
| grapeshot_gun | Grapeshot Gun | C | 175 | 50 / 2.0 s | 220 | G+A | Hits the frontmost enemy in range and enemies within 90 lu behind it; max 4 targets |
| congreve_rack | Congreve Rack | R | 250 | 4 rockets × 55 splash r30 / 5.0 s | 460 | G+A | Scatter ±40 lu (sim RNG); air ×1.5 |
| chainshot_cannon | Chainshot Cannon | E | 250 | 75 / 4.0 s | 400 | G | Pierces 4 targets total within 200 lu, starting at the frontmost |

**W4 Gunpowder wave (X0, CONTENT_PLAN 5.4; released 2026-10-03; measured numbers, docs/decisions.md).** Capsule cards: Commons from Arena 2, Rares 3, Epics 4, the Legendary 5.

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|
| highlander | Highlander | C | Infantry | 50 | 380 | 25 / 1.0 s | 16 | 67 | S | G | Blunt; Guard (the targe takes 25% less from attacks with range ≥ 100) |
| powder_monkey | Powder Monkey | C | Infantry | 50 | 262 | 34 / 1.0 s | 16 | 100 | S | G | Raider (base 68); bursts on death for 40 splash r35 |
| voltigeurs | Voltigeurs | C | Ranged | 75 | 3 × 69 | 19 / 2.0 s | 210 | 65 | S | G+A | Squad of 3 (M1) |
| blunderbuss | Blunderbuss | C | Ranged | 75 | 164 | 57 / 2.6 s | 120 | 65 | S | G+A | Cone: the target and up to 2 enemies within 60 lu behind it (instant `fx.blunderbuss_spray`) |
| dragoon | Dragoon | C | Heavy | 150 | 820 | 52 splash r30 / 1.5 s | 90 | 55 | L | G | Mounted carbine; armored |
| coehorn_crew | Coehorn Crew | R | Ranged (Long range, H6) | 75 | 210 | 80 splash r35 / 2.6 s | 360 (min 90) | 60 | S | G | Arc 300 lu/s (`proj.mortar_shell`); half damage to bases |
| wall_gunner | Wall Gunner | R | Anti-heavy | 100 | 210 | 40 / 2.0 s | 220 | 65 | M | G | Ranged Anti-heavy mods; priority armored; Brace |
| drummer_boy | Drummer Boy | R | Support | 110 | 340 | 32 / 1.2 s | 150 | 65 | S | G+A | Aura: allies within 160 lu attack 25% faster; followSupport |
| bagpiper | Bagpiper | R | Support | 110 | 420 | 40 / 1.2 s | 150 | 60 | S | G+A | Dread aura (M4): enemies within 140 lu move 35% slower |
| rocket_cart | Rocket Cart | E | Artillery | 200 | 1,300 | 4 rockets × 70 splash r30 / 3.5 s | 330 (min 90) | 45 | L | G | Volley with scatter ±40 lu (seeded sim RNG, SIM 7.2.0) |
| hussar | Hussar | E | Skirmisher | 200 | 1,000 | 78 / 0.9 s | 16 | 95 | L | G | Pounce: leaps to the back line within 180 lu (12 s cooldown) |
| mesmerist | Mesmerist | E | Support | 200 | 1,050 | 58 / 1.2 s | 170 | 60 | S | G+A | Every 12 s entrances enemies within 140 lu (a stop, not the clock freeze, M5) |
| grand_marshal | Grand Marshal | L | Heavy | 350 | 1,500 | 80 / 1.5 s, cleave 2 | 20 | 55 | H | G | Aura: allies within 200 lu deal 15% more; every 10 s calls a battery strike (120 splash r50) within 400 lu |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| carronade | Carronade | C | 175 | 66 / 2.5 s | 320 | G | Priority armored; the short "smasher" |
| sea_mortar | Sea Mortar | R | 250 | 149 splash r50 / 4.5 s | 480 (min 150) | G | Arc 450 lu/s |

Powers (A5.7): Rocket Volley (Field lane volley, War Path L3 / Road 3,300; 80 on up to 8, 50 gold, 25 s) and Cannon Salute (Home stun, War Path s1 / Road 4,400; 130 and a 2 s stun on up to 6 in a 350 lu zone, 75 gold, 35 s). Forts (A16.14): Cavalry Picket (camp; its levy, the Picket Rider, is 25% of the Cuirassier every 18 s, one at a time; War Path s2) and Fougasse (trap; 2 charges × 131 splash r45; the 20-star milestone). Skins (A5.8): Parade Cuirassier (Rare), Fireworks Grenadier (Epic), Pufferfish Balloon (Legendary).

**W5 Industrial wave (X0, CONTENT_PLAN 5.5; released 2026-10-03; measured numbers, docs/decisions.md).** Capsule cards: Commons from Arena 2, Rares 3, Epics 4, the Legendary 5.

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|
| coal_miners | Coal Miners | C | Infantry | 50 | 2 × 194 | 24 / 1.0 s | 16 | 82 | S | G | Pair (M1 squad of 2); Blunt |
| iron_mantlet | Iron Mantlet | C | Infantry | 50 | 420 | 28 / 1.0 s | 16 | 67 | S | G | Guard (the wheeled shield takes 25% less from attacks with range ≥ 100); Blunt |
| dispatch_rider | Dispatch Rider | C | Infantry | 50 | 325 | 42 / 1.0 s | 16 | 110 | M | G | Raider on a motorbike (base 84); the fastest Common |
| bomb_bowler | Bomb Bowler | C | Ranged | 75 | 191 | 24 splash r30 / 1.5 s | 220 | 65 | S | G | Arc 450 lu/s (`proj.bowl_bomb`) |
| steam_tractor | Steam Tractor | C | Heavy | 150 | 1,200 | 66 / 1.5 s, cleave 2 (reach 30) | 20 | 50 | L | G | Armored mech; plough blade |
| trench_mortar | Trench Mortar | R | Ranged (Long range, H6) | 75 | 266 | 118 splash r35 / 2.6 s | 370 (min 90) | 60 | S | G | Arc 300 lu/s (`proj.mortar_shell`); half damage to bases |
| steam_driller | Steam Driller | R | Anti-heavy | 100 | 490 | 50 / 1.2 s | 40 | 70 | M | G | Melee Anti-heavy mods; priority armored; Brace |
| bandmaster | Bandmaster | R | Support | 110 | 390 | 36 / 1.2 s | 150 | 65 | S | G+A | Aura: allies within 160 lu deal 20% more; followSupport |
| clockwork_tinker | Clockwork Tinker | R | Support | 110 | 275 | 17 / 1.2 s | 40 | 65 | S | G | Summoner (M3): a Clockwork Soldier (168 HP, 16 / 1.0 s) every 8 s, at most 3; followSupport |
| armoured_car | Armoured Car | E | Siege | 200 | 1,400 | 18 / 0.3 s | 150 | 55 | L | G+A | Armored mech; turret machine gun |
| alpine_climber | Alpine Climber | E | Skirmisher | 200 | 980 | 80 / 0.9 s | 16 | 85 | M | G | Pounce: swings to the back line within 180 lu (12 s cooldown), first strike ×2 |
| spark_scientist | Spark Scientist | E | Support | 200 | 1,200 | 55 / 1.2 s, chain 2 (hop 70) | 170 | 60 | S | G+A | Every 12 s stuns enemies within 120 lu for 1.0 s (Legendaries 0.5 s; M5, not the clock freeze) |
| armoured_train | Armoured Train | L | Siege heavy | 350 | 1,520 | 90 splash r45 / 2.4 s and 10 / 0.4 s (G+A, priority air) | 220 / 150 | 40 | H | G | Overpressure (M2 frenzy): below 50% HP +20% damage and +25% attack speed |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| rivet_spitter | Rivet Spitter | C | 175 | 3 rivets × 19 / 1.5 s | 280 | G+A | Each rivet pierces 2 (within 60 lu) |
| steam_hammer | Steam Hammer | R | 250 | 57 / 1.0 s | 150 | G | Gate zone 150 lu, up to 4 targets, each slowed 30% for 1 s |

Powers (A5.7): Shrapnel Shells (Field lane volley, War Path L3 / Road 3,500; 99 on up to 8, 50 gold, 25 s) and Great Magnet (Home pull, War Path s1 / Road 4,500; a 300 lu zone for 4 s, pull 40%, 14 per pulse, snare 40% for 1 s, cap 6, 75 gold, 30 s). Forts (A16.14): Rail Barricade (heavy wall, 1.4 × HP, 175 gold; War Path s2) and Tesla Pylon (chain tower, × 0.75 damage, the bolt jumps to a second foe within 80 lu; the 20-star milestone). Skins (A5.8): Chimney Sweep (Rare, Riveter), Teapot Golem (Epic, Steam Golem), Circus Train (Legendary, Armoured Train).

### A5.5 Modern Age (P 2.46)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| trench_raider | Trench Raider | C | Infantry | 50 | 394 | 49 / 1.0 s | 16 | 75 | S | G | light bio melee | Blunt |
| rifleman | Rifleman | C | Ranged | 75 | 234 | 32 / 1.0 s | 260 | 65 | S | G+A | light bio ranged | Bullet. Suppressing Fire: hits slow the target's move speed 15% for 1.0 s |
| tankette | Tankette | C | Heavy | 150 | 1,378 | 104 / 1.5 s | 90 | 50 | L | G | armored mech ranged | Shell |
| bazooka_trooper | Bazooka Trooper | R | Anti-heavy | 100 | 363 (was 300, then 330) | 64 / 1.2 s | 200 | 65 | M | G+A | light bio ranged | Rocket; ranged Anti-heavy mods, armored ×3.0; priority armored; Brace (new); starter kit |
| radio_operator | Radio Operator | R | Support | 110 | 320 | 20 / 1.2 s (G+A) | 200 | 65 | S | G+A | light bio support ranged | Every 8 s calls a shell on the nearest enemy ground unit within 400 lu: lands after 1.0 s, 120 splash r50 (area rule). One call-in per side per 3 s. followSupport |
| gyrocopter | Gyrocopter | E | Air gunship | 200 | 740 | 20 / 0.3 s | 150 | 80 | M | G+A | air mech | Obeys stance |
| behemoth_tank | Behemoth Tank | L | Siege heavy | 350 | **2,500** | Main gun **130** splash r40 / **3.5 s** at range 240 (G) plus MG **14** / 0.4 s at range 150 (G+A, priority air) | 240 | 35 | H | G / G+A | armored mech legendary | Two independent attacks; only the main gun stops movement (MVP balance pass 2026-10-01: was 4,100 HP, 170 / 2.5 s, MG 20; +19.0 → about +4 points) |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| mg_nest | MG Nest | C | 150 | 15 / 0.3 s | 340 | G+A | Single target |
| flak_gun | Flak Gun | C | 175 | 60 splash r40 / 1.5 s | 420 | G+A | Air ×2.0; priority air |
| howitzer | Howitzer | R | 250 | 200 splash r60 / 5.0 s | 480 (min 180) | G | Arc |
| searchlight_sniper | Searchlight Sniper | E | 250 | 280 / 4.0 s | 480 | G+A | Priority armored; Mark: target takes +20% damage from all sources for 4 s |

**W6 Modern wave (X0, CONTENT_PLAN 5.6; released 2026-10-03; measured numbers, docs/decisions.md).** Capsule cards: Commons from Arena 2, Rares 3, Epics 4, the Legendary 5.

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|
| commando | Commando | C | Infantry | 50 | 380 | 48 / 1.0 s | 16 | 110 | S | G | Raider (base 84); the fastest Modern Common |
| sandbag_carrier | Sandbag Carrier | C | Infantry | 50 | 455 | 33 / 1.0 s | 16 | 70 | S | G | Guard (the shoulder sandbag takes 20% less from attacks with range ≥ 100); Blunt |
| smg_squad | SMG Squad | C | Ranged | 75 | 3 × 74 | 11 / 1.0 s | 170 | 65 | S | G+A | Trio (M1 squad of 3) |
| rifle_grenadier | Rifle Grenadier | C | Ranged | 75 | 210 | 42 splash r30 / 1.5 s | 230 | 65 | S | G | Arc (`proj.rifle_grenade`) |
| assault_gun | Assault Gun | C | Heavy | 150 | 1,350 | 88 splash r30 / 1.5 s | 90 | 45 | L | G | Armored mech; a turretless casemate gun |
| mortar_team | Mortar Team | R | Ranged (Long range, H6) | 75 | 266 | 124 splash r35 / 2.6 s | 380 (min 90) | 60 | S | G | Arc 300 lu/s (`proj.mortar_shell`); half damage to bases |
| sticky_bomber | Sticky Bomber | R | Anti-heavy | 100 | 580 | 124 / 2.0 s | 16 | 70 | M | G | Melee Anti-heavy mods; priority armored; Brace |
| combat_medic | Combat Medic | R | Support | 110 | 330 | 22 / 1.2 s | 150 | 65 | S | G+A | Heals 65 HP/s split between the 2 lowest-HP% allies within 160 lu; followSupport; a plain cream disc, never a red cross |
| bulldog_sergeant | Bulldog Sergeant | R | Infantry | 50 | 415 | 42 / 1.0 s | 16 | 75 | S | G | Frenzy (M2): below 50% HP +30% damage and +20% attack speed |
| dive_bomber | Dive Bomber | E | Air bomber | 200 | 800 | 66 splash r40 / 2.0 s (base 80) | ±40 drop window | 80 | M | G | Air mech; never stops; bombs only inside the window |
| bulldozer | Bulldozer | E | Siege | 200 | 1,600 | 28 / 2.0 s (base and forts 220) | 12 | 45 | L | G | Armored mech; siege only |
| ghillie_sniper | Ghillie Sniper | E | Sniper | 200 | 640 | 180 / 4.0 s | 360 | 55 | S | G+A | Priority back line (ranged and support) |
| sky_fortress | Sky Fortress | L | Air bomber | 350 | 1,270 | 70 splash r50 / 1.6 s (base 130) and 2 waist gunners 6 / 0.6 s (range 160, G+A, priority air) | ±40 drop window | 40 | H | G | Never stops; crashes for 270 splash r70 and the gunners bail out as 2 Riflemen (sim 7.3.0: riders of a bomber shoot their own targets) |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| anti_tank_gun | Anti-Tank Gun | C | 175 | 110 / 2.5 s | 320 | G | Priority armored; the shell pierces |
| rocket_battery | Rocket Battery | R | 250 | 6 rockets × 74 splash r35 / 6.0 s | 460 | G | Scatter 50 lu |

Powers (A5.7): Creeping Barrage (Field lane volley, War Path L3 / Road 3,700; 110 on up to 8, 50 gold, 25 s) and Concussion Shells (Home stun, War Path s1 / Road 4,600; 177 and a 2.5 s stun on up to 6 in a 350 lu zone, 75 gold, 35 s). Forts (A16.14): Rifle Depot (camp; its levy, the Rifle Levy, is 35% of the Rifleman every 12 s, one at a time; War Path s2) and Wire Snare (trap; 4 charges × 79, each slowing 40% for 2 s; the Modern 20-star milestone). Skins (A5.8): Desert Raider (Trench Raider, rare), Tin Tankette (Tankette, epic), Origami Fortress (Sky Fortress, legendary).

### A5.6 Future Age (P 3.32)

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| photon_knight | Photon Knight | C | Infantry | 50 | 470 (+90 shield) | 66 / 1.0 s | 16 | 75 | S | G | light bio melee | Blunt; innate shield 90, regenerates 30/s after 3 s without damage |
| pulse_trooper | Pulse Trooper | C | Ranged | 75 | 315 | 43 / 1.0 s | 260 | 65 | S | G+A | light bio ranged | Plasma bolt |
| walker_mech | Walker Mech | C | Heavy | 150 | 1,860 | 140 / 1.5 s | 60 | 50 | L | G | armored mech melee | Reach |
| rail_gunner | Rail Gunner | R | Anti-heavy | 100 | 440 (was 400) | 86 / 1.2 s | 240 | 65 | M | G+A | light bio ranged | Instant rail; pierces 2 targets total within 150 lu; ranged mods, armored ×2.0 (unchanged); priority armored; Brace (new); starter kit |
| repair_drone | Repair Drone | R | Support | 110 | 430 | none | 160 | 70 | S | none | air mech support | Heals 100 HP/s split between the 2 lowest-HP% allies within 160 lu; followSupport |
| emp_saboteur | EMP Saboteur | E | Anti-mech | 200 | 700 | 50 / 1.0 s | 12 | 85 | M | G | light bio melee | EMP every 8 s when an enemy is within 120 lu: strips temporary and innate shields from all enemies within 120 lu (restarting their regen delay) and stuns mech enemies within 120 lu, air included, for 1.5 s |
| chrono_titan | Chrono Titan | L | Siege heavy | 350 | **4,500** | **190** / 1.6 s, cleave | 60 | 35 | H | G | armored mech melee legendary | Cleave: 3 targets total within 60 lu. Time Stop when an enemy first comes within 200 lu and every **20 s** after: enemies within 200 lu (air included) are frozen 1.5 s (Legendaries 0.75 s) (MVP balance pass 2026-10-01: was 5,600 HP, 230, every 15 s; +12.3 → +2.5 points) |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| pulse_laser | Pulse Laser | C | 150 | 20 / 0.3 s | 360 | G+A | Instant beam |
| arc_coil | Arc Coil | C | 175 | 60 / 1.8 s | 260 | G+A | Chains to 3 targets total (each ≤ 100 lu from the previous) |
| plasma_mortar | Plasma Mortar | R | 250 | 270 splash r60 / 5.0 s | 480 (min 180) | G | Arc |
| gravity_well | Gravity Well | E | 250 | 60 / 7.0 s | 400 | G | Priority densest. Damage hits up to 4 ground enemies within 90 lu of impact (area rule). Every ground enemy within 90 lu is pulled 60% of the way to the centre and slowed 50% for 2.5 s |

**Tutorial only (hidden):** `training_dummy`, Training Dummy: cost 50 (for bounty), HP 40, 4 / 1.0 s, range 16, speed 50, small, G, light bio melee.

**W7 Future wave (X0, CONTENT_PLAN 5.7; released 2026-10-03; measured numbers, docs/decisions.md).** Capsule cards: Commons from Arena 2, Rares 3, Epics 4, the Legendary 5.

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|
| android_pair | Android Pair | C | Infantry | 50 | 2 × 328 | 40 / 1.0 s | 16 | 85 | S | G | Pair (M1 squad of 2); Blunt; light bio (synthetic, not a mech for the Anti-heavy and EMP rules) |
| barrier_trooper | Barrier Trooper | C | Infantry | 50 | 650 | 47 / 1.0 s | 16 | 70 | S | G | Guard (the hardlight shield takes 25% less from attacks with range ≥ 100) |
| hover_bike | Hover Biker | C | Infantry | 50 | 545 | 66 / 1.0 s (base 100) | 16 | 110 | M | G | Raider; the fastest Future Common |
| needle_gunner | Needle Gunner | C | Ranged | 75 | 250 | 13 / 0.5 s | 220 | 75 | S | G+A | Fast light needles (`proj.needle`) |
| crab_mech | Crab Mech | C | Heavy | 150 | 2,000 | 112 / 1.5 s, cleave 2 | 20 | 45 | L | G | Armored mech; both pincers snap on 2 targets within 30 lu |
| arc_lobber | Arc Lobber | R | Ranged (Long range, H6) | 75 | 360 | 172 splash r35 / 2.6 s | 380 (min 90) | 60 | S | G | Arc 300 lu/s (`proj.arc_shell`); half damage to bases |
| plasma_lancer | Plasma Lancer | R | Anti-heavy | 100 | 800 | 100 / 1.2 s | 60 | 70 | M | G | Melee Anti-heavy mods; priority armored; Brace |
| overclock_engineer | Overclock Engineer | R | Support | 110 | 610 | 56 / 1.2 s (`fx.zap_beam`) | 150 | 65 | S | G+A | Aura: allies within 160 lu attack 20% faster; followSupport |
| holo_projector | Holo Projector | R | Support | 110 | 430 | 40 / 1.2 s | 150 | 65 | S | G+A | Summoner (M3): a Holo Decoy (320 HP, 1 damage, light mech) after 2 s, then every 6 s, up to 3 |
| jetpack_trooper | Jetpack Trooper | E | Air gunship | 200 | 950 | 46 / 0.6 s | 160 | 80 | M | G+A | Air bio; obeys stance |
| particle_cannon | Particle Cannon | E | Siege | 200 | 1,500 | 200 / 3.5 s (`fx.particle_beam`), pierces 3 within 200 lu | 300 (min 60) | 45 | L | G | Armored mech artillery |
| overload_android | Overload Android | E | Skirmisher | 200 | 1,700 | 90 / 0.9 s | 16 | 60 | M | G | Armored mech; Frenzy (M2): below 50% HP +35% damage and +25% attack speed |
| drone_carrier | Drone Carrier | L | Siege heavy | 350 | 1,900 | 40 / 0.5 s point-defence laser | 200 | 35 | H | G+A | Summoner (M3) of flying Attack Drones (300 HP, 8 / 0.3 s, range 150, G+A) after 2 s, then every 7 s, up to 2; a ground summoner with an air summon (no new mechanic) |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| cryo_pod | Cryo Pod | C | 175 | 80 / 1.5 s | 320 | G+A | Frost orb (`proj.frost`): the target is slowed 30% for 2 s |
| tractor_beam | Tractor Beam | R | 250 | 166 / 5.0 s | 380 | G | Priority armored; drags its target 100 lu toward your gate (large units resist 50%) |

Powers (A5.7): Target Painter (Field lane signal, War Path L3 / Road 3,900; 56 on up to 8 and a +20% damage mark for 6 s, 50 gold, 25 s) and Nano Mesh (Home snare, War Path s1 / Road 4,700; a 350 lu zone for 6 s that hits air, 15 a pulse (38% of the Photon Knight, the snare family cap) and a 50% snare, up to 6, 75 gold, 30 s). Forts (A16.14): Skyguard Pylon (tower; the Ranged Common × 1.5, priority air, air ×1.5; War Path s2) and Mech Bay (camp; its levy, the Mini Mech, is 25% of the Walker Mech every 16 s, one at a time; the Future 20-star milestone). The age's four classic forts (Hardlight Barrier, Sentry Pylon, Clone Bay, Grav Mire) are redrawn in the cartoon style. Skins (A5.8): Space Cadet (Pulse Trooper, rare), Chrome Rail (Rail Gunner, epic), Grandfather Clock (Chrono Titan, legendary).

**W8 Cosmic wave (X0, CONTENT_PLAN 5.8; released 2026-10-04; measured numbers, docs/decisions.md).** Capsule cards: Commons from Arena 3, Rares 3, Epics 4, the Legendary 5. No new mechanic (M1 squads, M3 summons, M4 auras, M5 non-freezing stuns, riders and `onDeathSpawn` exist); no SIM_VERSION change.

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|
| crystal_guard | Crystal Guard | C | Infantry | 50 | 890 | 67 / 1.0 s | 16 | 70 | S | G | Guard (the crystal body takes 25% less from attacks with range ≥ 100); Blunt |
| void_skimmer | Void Skimmer | C | Infantry | 50 | 670 | 94 / 1.0 s (base 90) | 16 | 110 | S | G | Raider; the fastest Cosmic Common |
| moonlings | Moonlings | C | Ranged | 75 | 3 × 172 | 21 / 1.0 s (`proj.moon_pellet`) | 230 | 65 | S | G+A | Trio (M1 squad of 3) |
| nova_thrower | Nova Thrower | C | Ranged | 75 | 440 | 62 splash r30 / 1.15 s | 240 | 65 | S | G | Lobbed nova orb (`proj.nova_orb`, arc 450 lu/s) |
| asteroid_golem | Asteroid Golem | C | Heavy | 150 | 2,950 | 150 / 1.5 s, cleave 2 | 20 | 50 | L | G | Armored mech rock construct; the uppercut hits 2 targets within 30 lu |
| star_mortar | Star Mortar | R | Ranged (Long range, H6) | 75 | 470 | 190 splash r35 / 2.6 s | 390 (min 90) | 60 | S | G | Arc 300 lu/s (`proj.mini_star`); half damage to bases |
| antimatter_rifler | Antimatter Rifler | R | Anti-heavy | 100 | 700 | 140 / 1.6 s | 220 | 65 | M | G | Ranged Anti-heavy mods; priority armored; Brace |
| bio_weaver | Bio-Weaver | R | Support | 110 | 580 | 36 / 1.2 s (`fx.tendril_lash`) | 150 | 65 | S | G+A | Heal 135 HP/s split between the 2 most hurt allies within 160 lu; followSupport |
| void_whisperer | Void Whisperer | R | Support | 110 | 760 | 48 / 1.2 s (`fx.void_ripple`) | 150 | 60 | S | G+A | Dread aura (M4): enemy ground units within 130 lu move 20% slower; followSupport |
| star_fighter | Star Fighter | E | Air gunship | 200 | 1,250 | 48 / 0.5 s twin lasers | 170 | 85 | M | G+A | Air mech; obeys stance |
| swarm_matron | Swarm Matron | E | Support | 200 | 1,300 | 50 / 1.2 s | 150 | 60 | M | G+A | Summoner (M3): a Swarmling (250 HP, 30 / 1.0 s, speed 95) after 2 s, then every 7 s, up to 3 |
| gravity_sage | Gravity Sage | E | Support | 200 | 1,700 | 70 / 1.2 s | 160 | 60 | S | G+A | Collapse (M5, not frozen): every 14 s enemies within 120 lu are stunned 1 s (Legendaries 0.5 s); followSupport |
| star_leviathan | Star Leviathan | L | Heavy | 350 | 2,800 | 118 / 2.0 s song (`fx.song_wave`), the target and up to 4 within 100 lu behind | 90 | 40 | H | G | Two Moonling riders (20 / 1.4 s, range 200, G+A); when it falls they hop off as 2 Moonlings |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| shard_spitter | Shard Spitter | C | 175 | 40 × 3 / 1.5 s | 280 | G+A | A volley of 3 crystal shards (`proj.shard`), each piercing 2 within 60 lu |
| event_horizon | Event Horizon | R | 250 | 120 / 1.0 s | 150 | G | Gate zone 150 lu, up to 4 targets, slowed 30% for 1 s (`fx.horizon_pulse`) |

Powers (A5.7): Meteor Drizzle (Field lane volley, War Path L3 / Road 4,900; 210 on the 8 hittable enemies nearest your gate, ground and air, 50 gold, 25 s; the lane cap and the price and reload floors keep it below the ±5 window, an accepted miss) and Pulsar Pulse (Home stun, War Path s1 / Road 4,800; a 350 lu zone, 165 and a 2 s stun, up to 6, ground and air, 75 gold, 35 s). Forts (A16.14): Star Bulwark (wall, bunker family: cover 20% less ranged damage within 60 lu behind; War Path s2) and Stardust Snare (trap, 4 charges of 140 and a 40% slow for 2 s; the Cosmic 20-star milestone). The age's four classic forts (Void Rampart, Ion Spire, Warp Barracks, Void Mine) are redrawn in the cartoon style. Skins (A5.8): Starlight Legionnaire (Star Legionnaire, rare), Shadow Stalker (Warp Stalker, epic, 72% opaque), Classic Saucer (Mothership, legendary).

### A5.7 Age Powers

**The power rework roster (owner request 2026-09-29; rules in A2.9; decided, not built).** 48 powers, 6 per age: 3 **Home** (an area damage power, a second one of the other area family, and a control; in Modern, an air age, Flak fills the control role) and 3 **Field** (an assault: charge or front barrage; a strike or Suppress; a support: buff, cloud or drop). The schema checks this template per age. Per age: 2 starters (one per slot), 1 Trophy Road power, 3 War Path powers. This table replaces the old A5.7 table and the A17.11 power table; the 16 built powers keep their effects except where marked ✎ (the old value is given as "was"), and until build phase P1 the build plays them as before (A2.9.14).

**Families** (flat across ages, like every card price):

| Family | Slot · reach | Kind | Cost | Reload | Telegraph | Cap |
|---|---|---|---|---|---|---|
| Bombard | Home | `barrage` (even or line) | 100 | 40 s | 1.0 s | 4 (was 5; fix pass 2026-09-30) |
| Sweep | Home | `sweep` | 100 | 40 s | 1.0 s | 5 (was 6; Solar Flare 4, Boiling Oil 3) |
| Snare | Home | `field` (snare, chip damage) | 75 | 30 s | 1.0 s | 6 |
| Pull | Home | `field` (pull, snare, chip damage) | 75 | 30 s | 1.0 s | 6 |
| Stun | Home | `field`, one pulse, 2.0 s | 75 | 35 s | 1.0 s | 5 (Stasis Field 6) |
| Flak | Home | `barrage`, air only | 75 | 25 s | 0.5 s | 3 |
| Charge | Field · front (from your front) | `stampede` | 100 | 40 s | 1.0 s | 6 |
| Front barrage | Field · front | `barrage` | 100 | 35 s | 1.0 s | 5 |
| Strike | Field · anywhere | `strike` | 75 | 30 s (Sniper Team, Ion Cannon 25 s) | 1.5 s (Railway Gun 2.0 s) | 1 |
| Suppress | Field · front (no aim) | `suppress`, 5 s | 125 | 60 s | 1.5 s | all enemy mounts |
| Rally, Ward, Mend | Field · army | `buffAll` | 125 (Nanite Surge 150) | 45 s (Nanite Surge 50 s) | 0.5 s | 8 own units |
| Cloud | Field · front | `cloud` | 100 | 40 s | 1.0 s | ally bonus: 8 own units |
| Drop | Field · anywhere (no aim) | `paradrop` | 150 | 60 s | 1.0 s | - |
| **Lane volley** (owner feedback 2026-09-30; build phase H7) | Field · lane (no aim) | `field`, one pulse, zone L | 50 | 25 s | 1.0 s | 8 |
| **Lane signal** (same) | Field · lane (no aim) | `field`, one pulse, zone L, a light status | 50 | 25 s | 1.0 s | 8 |

A good cast returns about 1.3-2.0× its cost in enemy value; the prototypes put the Home sweet spot at 75-100 gold (the Bell rose again at 60).

Values are final at the age's P and L1 loadouts (A5.1), × the loadout multiplier in play. "Per unit" is the A2.9 coverage estimate against the age's L1 Infantry and Heavy Common; for controls, the disabled unit-seconds (d·s) at the cap. **Bold** = new power. Sources: **S** starter; **Road n** Trophy Road node (A17.13); **WP Lk** first clear of that region's War Path level k, with its Trophy Road fallback node in brackets (A2.9.8). Every power's visual id is `power.<slug>`. Buffs affect your 8 frontmost units; strikes deal 50% to Epics (A2.9.6).

**Stone (P 1.00; Infantry 160, Heavy 560; Epic Sabertooth 380)**

| Slug | Name | Slot · family | Rar | Source | Cost · reload · telegraph | Cap | Effect | Per unit | FX · sound |
|---|---|---|---|---|---|---|---|---|---|
| `rockslide` | **Rockslide** | Home · sweep | C | S | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **4** (was 5) | sweep: zone 450, 1.5 s, **150** (was 130) once per ground enemy touched, width 40, ground only | 150: 94% / 27% | `fx.rockslide` · `pw_rockslide` |
| `meteor_shower` | Meteor Shower | Home · bombard | R | Road 100 | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **3** (was 4) | barrage: 14 over 3.0 s, zone 400, 50, r40, ±20, even, ground only | ~140: 88% / 25% | `fx.meteor` · `pw_meteor` |
| `sticky_tar` | **Sticky Tar** | Home · snare | R | WP L5 (Road 550) | 75 · 30 s · 1.0 s | 6 | field: zone 300, 6 s (12 pulses), ground only; each pulse 5 damage and snare 40% for 1.0 s | 60: 38% of Infantry; 14.4 d·s | `fx.sticky_tar` · `pw_tar` |
| `stampede` | Stampede | Field · charge | C | S | 100 · 40 s · 1.0 s | **5** (was 6) | stampede: 5 aurochs 0.4 s apart, 500 lu at 400 lu/s from your front (or p 200), 50 and 40 lu knockback per hit, max 3 hits per enemy, ground only | ≤ 150: 94% / 27% | `fx.aurochs` · `pw_stampede` |
| `hunt_cry` | **Hunt Cry** | Field · rally | E | WP L7 (Road 600) | 125 · 45 s · 0.5 s | 8 own | buffAll: your 8 frontmost units +20% move speed and +15% attack speed for 6 s | within the A18.2 caps | `fx.hunt_cry` · `pw_huntcry` |
| `hunters_spear` | **Hunter's Spear** | Field · strike | E | WP L9 (Road 650) | **50** · **15 s** · 1.5 s (MVP balance pass; was 75 · 30 s) | 1 | strike: 1 spear, 340, ground and air | 61% of the Heavy; kills a Pebbler, Drum Shaman or Spear Hunter; the Sabertooth takes 170 | `fx.spear_throw` · `pw_spear` |

**Bronze Age: Hellas (P 1.16; Infantry 186, Heavy 630; Epic Scorpion 330)**

| Slug | Name | Slot · family | Rar | Source | Cost · reload · telegraph | Cap | Effect | Per unit | FX · sound |
|---|---|---|---|---|---|---|---|---|---|
| `tidal_wave` | Tidal Wave ✎ | Home · sweep | C | S | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **4** (was 5) | sweep: zone 450, 2.0 s, **170** (was 130) once, width 40, ground only | 170: 91% / 27% | `fx.tidal_wave` · `pw_wave` |
| `zeus_bolts` | **Zeus's Bolts** | Home · bombard | R | WP L5 (Road 700) | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **3** (was 4) | barrage: 6 over 1.5 s, zone 400, 120, r45, ±20, even, ground only | 162: 87% / 26% | `fx.lightning_bolt` · `pw_bolts` |
| `medusa_gaze` | **Medusa's Gaze** | Home · stun | E | WP L9 (Road 850) | 75 · 35 s · 1.0 s | 5 | field: zone **350** (MVP balance pass; was 300), one pulse, ground only; stun 2.0 s (frozen look) and mark (+20% damage taken) 4 s | 10 d·s (13.3 per 100 g) | `fx.medusa_gaze` · `pw_gaze` |
| `charybdis` | **Charybdis** | Home · pull | E | WP Bronze s1 (Road 4,200) | 75 · 30 s · 1.0 s | 6 | field: zone 300, 4 s (8 pulses), ground only; first pulse pulls 40% of the way to the centre; each pulse 9 and snare 45% for 1 s (X0 Bronze wave, built) | 72 per unit over the field | `fx.whirlpool` · `pw_whirlpool` |
| `chariot_rush` | **Chariot Rush** | Field · charge | C | S | 100 · 40 s · 1.0 s | **5** (was 6) | stampede: 3 chariots 0.5 s apart, 500 lu at 450 lu/s from your front, 80 and 40 lu knockback, max 2 hits, ground only | ≤ 160: 86% / 25% | `fx.chariot_rush` · `pw_chariots` |
| `aegis` | Aegis ✎ | Field · ward | R | Road 200 | **75** · **30 s** · 0.5 s (MVP balance pass; was 125 · 45 s) | 8 own | buffAll: your 8 frontmost units (was: all) a **120** shield and **+25%** damage for **8 s** (MVP balance pass; was 80, +15%, 6 s) | shield 43% of Infantry | `fx.aegis_glow` · `pw_aegis` |
| `apollo_arrow` | **Apollo's Arrow** | Field · strike | E | WP L7 (Road 750) | **50** · **15 s** · 1.5 s (MVP balance pass; was 75 · 30 s) | 1 | strike: 1 golden arrow, 380, ground and air | 60% of the Heavy; the Scorpion takes 190 | `fx.golden_arrow` · `pw_apollo` |

**Medieval (P 1.35; Infantry 216, Heavy 756; Epic Battering Ram 900)**

| Slug | Name | Slot · family | Rar | Source | Cost · reload · telegraph | Cap | Effect | Per unit | FX · sound |
|---|---|---|---|---|---|---|---|---|---|
| `arrow_storm` | Arrow Storm ✎ | Home · bombard | C | S | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **3** (was 4) | barrage: 40 over 2.5 s, zone 450, **55** (was 40), r20, ±20, even, ground and air | ~196: 91% / 26% | `fx.arrow_rain` · `pw_arrows` |
| `caltrops` | **Caltrops** | Home · snare | R | WP L5 (Road 900) | 75 · 30 s · 1.0 s | 6 | field: zone 300, 8 s (16 pulses), ground only; each pulse 5 damage and snare 35% for 1.0 s | 80: 37% of Infantry; 16.8 d·s | `fx.caltrops` · `pw_caltrops` |
| `boiling_oil` | **Boiling Oil** | Home · sweep | E | WP L9 (Road 1,050) | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **2** (was 3) | sweep: zone 250, 1.0 s, 200 once, width 40, ground only | 200: 93% / 26% | `fx.boiling_oil` · `pw_oil` |
| `knights_charge` | **Knights' Charge** | Field · charge | C | S | 100 · 40 s · 1.0 s | **5** (was 6) | stampede: 3 lances 0.5 s apart, 450 lu at 400 lu/s from your front, 90 and 40 lu knockback, max 2 hits, ground only | ≤ 180: 83% / 24% | `fx.knights_charge` · `pw_knights` |
| `royal_decree` | Royal Decree ✎ | Field · rally | R | Road 250 | **75** · **30 s** · 0.5 s (MVP balance pass; was 125 · 45 s) | 8 own | buffAll: your 8 frontmost units (was: all) **+35%** damage, **+25% attack speed** and **+20%** move speed for **15 s** (MVP balance pass; was +30% damage and +20% speed for 8 s; the speed was 25% before the A18.2 cap) | within the A18.2 caps | `fx.decree_glow` · `pw_decree` |
| `undermine` | **Undermine** | Field · suppress | E | WP L7 (Road 950) | 125 · 60 s · 1.5 s | all mounts | suppress: enemy turrets start no attack for 5 s; needs your front ≥ p 1,370 | - | `fx.undermine` · `pw_undermine` |

**Age of Muskets, `gunpowder` (P 1.82; Infantry 291, Heavy 1,019; Epic Bronze Cannon 500)**

| Slug | Name | Slot · family | Rar | Source | Cost · reload · telegraph | Cap | Effect | Per unit | FX · sound |
|---|---|---|---|---|---|---|---|---|---|
| `volley_fire` | **Volley Fire** | Home · sweep | C | S | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **4** (was 5) | sweep: zone 400, 1.0 s, 240 once, width 40, ground and air | 240: 82% / 24%; the Balloon Admiral takes 120 | `fx.volley_fire` · `pw_volley` |
| `broadside` | Broadside | Home · bombard | R | Road 300 | 100 · 40 s · 1.0 s | 4 | barrage: 10 over 3.0 s, zone 450, **135** (MVP balance pass; was 120; kept out of the power trim at 100 gold and cap 4), r45, ±20, even, ground only | ~270: 92% / 27% | `fx.cannonball_rain` · `pw_broadside` |
| `boarding_nets` | **Boarding Nets** | Home · pull | R | WP L5 (Road 1,100) | 75 · 30 s · 1.0 s | 6 | field: zone 300, 4 s (8 pulses), ground only; first pulse pulls 40% of the way to the centre; each pulse 12 damage and snare 40% for 1.0 s | 96: 33% of Infantry; 9.6 d·s (12.8 per 100 g); clumps them for splash | `fx.boarding_nets` · `pw_nets` |
| `smoke_screen` | Smoke Screen ✎ | Field · cloud | C | S | 100 · 40 s · 1.0 s | ally bonus 8 | cloud (Front reach): 350 lu for **6 s** (was 7); enemy ranged and turret attacks from or into it miss 50% (sim RNG); up to 8 of your units inside +20% damage | - | `fx.smoke_cloud` · `pw_smoke` |
| `horse_artillery` | **Horse Artillery** | Field · front barrage | E | WP L7 (Road 1,150) | 100 · 35 s · 1.0 s | **4** (was 5) | barrage (Front reach): 6 over 1.5 s, zone 300, **115** (MVP balance pass; was 120, with cap 4 after the trim), r50, ±20, even, ground only | 240: 82% / 24% | `fx.horse_artillery` · `pw_horse_art` |
| `sharpshooter` | **Sharpshooter** | Field · strike | E | WP L9 (Road 1,200) | 75 · 30 s · 1.5 s | 1 | strike: 2 shots 0.3 s apart, 305 each, ground and air | 610: 60% of the Heavy; the Bronze Cannon takes 305 | `fx.sharpshot` · `pw_sharpshooter` |

**Great War, `industrial` (P 2.12; Infantry 330, Heavy 1,187; Epic Sapper 560)**

| Slug | Name | Slot · family | Rar | Source | Cost · reload · telegraph | Cap | Effect | Per unit | FX · sound |
|---|---|---|---|---|---|---|---|---|---|
| `gun_line` | **Gun Line** | Home · sweep | C | S | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **4** (was 5) | sweep: zone 400, 1.5 s, 280 once, width 40, ground only | 280: 85% / 24% | `fx.gun_line` · `pw_gunline` |
| `zeppelin_raid` | Zeppelin Raid | Home · bombard | R | Road 350 | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **3** (was 4) | barrage: 10 along a 480 lu line over 2.0 s, 150, r45, line, ground only (centre ≤ 760) | ~281: 85% / 24% | `fx.zeppelin` · `pw_zeppelin` |
| `barbed_wire` | **Barbed Wire** | Home · snare | R | WP L5 (Road 1,250) | 75 · 30 s · 1.0 s | 6 | field: zone 350, 6 s (12 pulses), ground only; each pulse 10 damage and snare 40% for 1.0 s | 120: 36% of Infantry; 14.4 d·s | `fx.barbed_wire` · `pw_wire` |
| `iron_horse` | Iron Horse ✎ | Field · charge | C | S | 100 · 40 s · 1.0 s | **5** (was 6) | stampede: 3 engines 0.5 s apart, 600 lu at 450 lu/s from your front, **130** (was 150) and 50 lu knockback, max 2 hits, ground only | ≤ 260: 79% / 22% | `fx.iron_horse` · `pw_iron_horse` |
| `railway_gun` | **Railway Gun** | Field · strike | E | WP L7 (Road 1,350) | **50** · **15 s** · 2.0 s (MVP balance pass; was 75 · 30 s) | 1 | strike: 1 shell, 710, ground only | 60% of the Heavy; the Sapper takes 355 | `fx.railway_shell` · `pw_railgun` |
| `field_hospital` | **Field Hospital** | Field · mend | E | WP L9 (Road 1,400) | **75** · **30 s** · 0.5 s (MVP balance pass; was 125 · 45 s) | 8 own | buffAll: your 8 frontmost units get a **110 shield for 6 s** and regen 35% of max HP over 4 s (MVP balance pass: a pure heal lost 9-15 points to Iron Horse whatever its numbers; −3.0 as shipped) | 226: 68% of Infantry | `fx.field_hospital` · `pw_hospital` |

**Modern (P 2.46; Infantry 394, Heavy 1,378; Epic Gyrocopter 740, air)**

| Slug | Name | Slot · family | Rar | Source | Cost · reload · telegraph | Cap | Effect | Per unit | FX · sound |
|---|---|---|---|---|---|---|---|---|---|
| `strafing_run` | **Strafing Run** | Home · sweep | C | S | 100 · 40 s · 1.0 s (MVP balance pass: the one Home starter kept at 100 gold; at 125 the Modern Anti-heavy lane row fell to 0%) | **4** (was 5) | sweep: zone 450, 1.5 s, **360** (was 330) once, width 40, ground only | 360: 91% / 26% | `fx.strafing_run` · `pw_strafe` |
| `carpet_bomber` | Carpet Bomber | Home · bombard | R | Road 400 | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **3** (was 4) | barrage: 12 along a 500 lu line over 1.5 s, 150, r50, line, ground only (centre ≤ 750) | ~360: 91% / 26% | `fx.plane_bomber` · `pw_bomber` |
| `aa_screen` | **AA Screen** | Home · flak (the control role) | R | WP L5 (Road 1,450) | 75 · 25 s · 0.5 s | 3 | barrage: 3 bursts over 0.6 s, zone 160, 240, r80, no jitter, even, air only (`hitsGround` false) | 720 on an air unit at the centre; a Gyrocopter (740) survives with 20 | `fx.flak_burst` · `pw_flak` |
| `paratroopers` | Paratroopers ✎ | Field · drop | C | S | 150 · 60 s · 1.0 s | - | paradrop: **3** Riflemen (was 4) at your Rifleman level, 150 lu beyond the enemy's frontmost ground unit (p ≤ 1,850; p 1,000 without one); summoned, no pop, no bounty | 225 card value | `fx.parachute` · `pw_paratroop` |
| `tank_rush` | **Tank Rush** | Field · charge | E | WP L7 (Road 1,550) | 100 · 40 s · 1.0 s | **5** (was 6) | stampede: 2 tanks 0.6 s apart, 600 lu at 350 lu/s from your front, 170 and 50 lu knockback, max 2 hits, ground only | ≤ 340: 86% / 25% | `fx.tank_rush` · `pw_tanks` |
| `sniper_team` | **Sniper Team** | Field · strike | E | WP L9 (Road 1,600) | **50** · **15 s** · **1.0 s** (MVP balance pass; was 75 · 25 s · 1.5 s) | 1 | strike: 1 shot, **895** (was 830), ground and air | 65% of the Heavy; the Gyrocopter takes 447 | `fx.sniper_trace` · `pw_sniper` |

**Future (P 3.32; Infantry 470 + 90 shield = 560, Heavy 1,860; Epic EMP Saboteur 700)**

| Slug | Name | Slot · family | Rar | Source | Cost · reload · telegraph | Cap | Effect | Per unit | FX · sound |
|---|---|---|---|---|---|---|---|---|---|
| `orbital_lance` | Orbital Lance | Home · sweep | C | S | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **4** (was 5) | sweep: zone 500, 2.0 s, 450 once, width 40, ground and air | 450: 80% / 24% | `fx.orbital_beam` · `pw_lance` |
| `point_defense` | **Point Defense Grid** | Home · bombard | R | WP L5 (Road 1,650) | 100 · 40 s · 1.0 s | 4 | barrage: 20 micro-missiles over 2.0 s, zone 400, **135** (was 115, then 125; MVP balance pass: kept out of the power trim at 100 gold and cap 4), r40, ±20, even, ground and air | ~500: 89% / 27% | `fx.point_defense` · `pw_pdg` |
| `stasis_field` | **Stasis Field** | Home · stun | E | WP L9 (Road 1,750) | 75 · 35 s · 1.0 s | **6** (was 5) | field: zone **300**, one pulse, ground and air; stun **3.0 s** (frozen look) (MVP balance pass; was 250 lu, 2.0 s) | 18 d·s (24 per 100 g) | `fx.stasis_dome` · `pw_stasis` |
| `drone_swarm` | **Drone Swarm** | Field · front barrage | C | S | 100 · 35 s · 1.0 s | **4** (was 5) | barrage (Front reach): 10 over 2.0 s, zone 300, 150, r35, ±20, even, ground and air | ~350: 63% / 19% | `fx.drone_swarm` · `pw_drones` |
| `nanite_surge` | Nanite Surge ✎ | Field · mend | R | Road 450 | 150 · 50 s · 0.5 s | 8 own | buffAll: your 8 frontmost units (was: all) regen 40% of max HP over 4 s and a 150 shield for 6 s | 338: 60% of Infantry | `fx.nanite_swarm` · `pw_nanite` |
| `emp_blackout` | **EMP Blackout** | Field · suppress | E | WP L7 (Road 1,700) | 125 · 60 s · 1.5 s | all mounts | suppress: 5 s; needs your front ≥ p 1,370 | - | `fx.emp_blackout` · `pw_emp` |

**Cosmic (P 4.48; Infantry 700, Heavy 2,509; Epic Warp Stalker 1,600)**

| Slug | Name | Slot · family | Rar | Source | Cost · reload · telegraph | Cap | Effect | Per unit | FX · sound |
|---|---|---|---|---|---|---|---|---|---|
| `starfall` | Starfall | Home · bombard | C | S | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **3** (was 4) | barrage: 6 over 2.0 s, zone 450, 380, r60, ±20, even, ground and air | ~608: 87% / 24% | `fx.star_shard_rain` · `pw_starfall` |
| `singularity` | **Singularity** | Home · pull | R | WP L5 (Road 1,800) | **100** · 30 s · 1.0 s (MVP balance pass; was 75 · 30 s) | 6 | field: zone 350, 4 s (8 pulses), ground only; first pulse pulls **40%** of the way to the centre; each pulse **27** damage and snare **50%** for 1.0 s (MVP balance pass; was 60%, 30, 40% at 75 gold: +7 points over Starfall) | 216: 31% of Infantry; 12 d·s (12 per 100 g) | `fx.singularity` · `pw_singularity` |
| `solar_flare` | **Solar Flare** | Home · sweep | E | WP L9 (Road 1,950) | **125** · 40 s · 1.0 s (MVP balance pass; was 100 · 40 s) | **3** (was 4) | sweep: zone 450, 1.5 s, **560** (was 600) once, width 40, ground and air | 560: 80% / 22% | `fx.solar_flare` · `pw_flare` |
| `comet_run` | **Comet Run** | Field · charge | C | S | 100 · 40 s · 1.0 s | **5** (was 6) | stampede: 3 comets 0.4 s apart, 500 lu at 500 lu/s from your front, 300 and 40 lu knockback, max 2 hits, ground only | ≤ 600: 86% / 24% | `fx.comet_run` · `pw_comet` |
| `warp_strike` | Warp Strike ✎ | Field · drop | R | Road 500 | 150 · 60 s · 1.0 s | - | paradrop: **4** Star Legionnaires (was 3) at your level, 150 lu beyond the enemy's frontmost ground unit; summoned | 200 card value | `fx.warp_portal` · `pw_warp` |
| `ion_cannon` | **Ion Cannon** | Field · strike | E | WP L7 (Road 1,850) | **50** · **15 s** · 1.5 s (MVP balance pass; was 75 · 25 s) | 1 | strike: 1 shot, 1,500, ground and air | 60% of the Heavy; the Warp Stalker takes 750 | `fx.ion_cannon` · `pw_ion` |

**Whole-lane powers** (owner feedback 2026-09-30: "specials, som kan angribe på hele banen, men som ikke skader så meget"; decided, not built; build phase H7). One per age, Field slot, reach `lane` (A2.9.4): no aim; the cast touches the 8 hittable enemies nearest your gate anywhere on the lane (the screen), ground and air, for a quarter of an Infantry, and one arrow, shell or bolt falls on each of them (what you see is what is hit). A volley deals 25% of the age's L1 Infantry HP per unit (≈ 7% of its Heavy); a signal 10% plus a light status. Rare; source: that region's War Path L3 first clear, Trophy Road fallback on the next free item nodes after 1,950 (WP7). Static: per unit ≤ 30% of I and ≤ 10% of H, value per gold median 0.5-1.2 (below the 1.2-2.0 of the damaging families, so a lane power never replaces an area power), the A2.9.12 ±3 row against its slot's starter. Measured on a prototype (the same effect as `anywhere` with a 4,000 lu one-pulse field; 200 matches, replacing the Field starter): Longbow Volley +1.0 [−5.5, 7.5], Pebble Hail −11.5 [−17.9, −5.1] against Stampede; value per gold 0.66-0.77 and 271-367 casts per 200 matches (an earlier draft at 75 gold and 20% of I was ignored by the bots: 0.07-0.32).

| Age | Slug | Name | Family | Per unit | FX · sound (planned, A14.4) |
|---|---|---|---|---|---|
| Stone | `pebble_hail` | **Pebble Hail** | volley | 48 (the 30% cap; X0 Stone wave, built) | `fx.pebble_hail` · `pw_hail` |
| Bronze | `sandstorm` | **Sandstorm** | signal | 55 (the 30% cap) and snare 30% for 3 s (the lane status cap; X0 Bronze wave, built; 50 gold, 25 s, War Path Bronze L3) | `fx.sandstorm` · `pw_sandstorm` |
| Medieval | `longbow_volley` | **Longbow Volley** | volley | 64 (the 30% cap; X0 Medieval wave, built) | `fx.longbow_volley` · `pw_longbow` |
| Gunpowder | `rocket_volley` | **Rocket Volley** | volley | 73 | `fx.rocket_volley` · `pw_rockets` |
| Industrial | `shrapnel_shells` | **Shrapnel Shells** | volley | 83 | `fx.shrapnel` · `pw_shrapnel` |
| Modern | `creeping_barrage` | **Creeping Barrage** | volley | 110 (X0 Modern wave, built) | `fx.creeping_barrage` · `pw_barrage` |
| Future | `target_painter` | **Target Painter** | signal | 56 and mark +20% for 6 s (X0 Future wave, built) | `fx.target_paint` · `pw_painter` |
| Cosmic | `meteor_drizzle` | **Meteor Drizzle** | volley | 210 (the 30% cap; X0 Cosmic wave, built) | `fx.meteor_drizzle` · `pw_drizzle` |

- **Totals:** 48 powers (16 built, 32 new), 24 Home and 24 Field (56 and 32 Field with the 8 lane powers); 16 Common (the starters), 16 Rare (the 8 Road powers and the 8 War Path L5 powers), 16 Epic (the War Path L7 and L9 powers). No Legendary powers. Rarity is a sidegrade (A3): every power follows its family's budget; rarity marks the source and the specialisation.
- **Coverage:** every age has a Home area damage starter and a Field starter; Suppress exists in Medieval and Future (War Path Epics) as a situational turret tool, not a Bell mitigation (Bell gates run with starters only); every age with air units has powers that hit air.
- **Schema checks per age:** 6 powers, 3 Home and 3 Field (7 and 4 Field with the lane power, build phase H7), 1 starter per slot (by `source`), 1 Road, 3 War Path (4 with the lane power); the family template above; the reach, cap and screen rules of A2.9.4-A2.9.5; the static family targets of A2.9.6.
- **Bench** (not in the 48): Barricade (a summoned wall; waits for the fort entity, A18 phase 6), Tremor (surfaces burrowed units; waits for the Underground class, phase 8), Minefield, Star Shells, a Trojan Horse drop. New ages (A18.8) ship 6 powers each by the same template.
- Research can widen aimed zones (Survey Corps; a Home power still touches only enemies in your half) or raise power damage and heals (Master Gunners), both v1.1 (A18.5.5).

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
  | Evolver | first Cosmic Age (A17; was Future) |
  | Mammoth Tamer | own Matriarch |
  | Collector | Codex Lv 10 |
  | Siege Scholar | Arena 4 |
  | Last Stander | win after your Last Stand |
  | Speedrunner | Cosmic before 6:15 in Full War (A17; retimed with A18's clocks). A18: "reach the last age of your window" wording |
  | Veteran | 100 wins |
  | Curator | Codex Lv 40 |
  | Warden's Bane | beat The Warden |
  | Conqueror | 27 Conquest stars; with A18.7.10 the carried-over War Path boss stars count (titles "Pathfinder", "Veteran", "Legend" and "Crowned" join in v1.1) |
  | Ageborn | Arena 8 |

- **4 collection milestone titles** (content re-tune 2026-10-04: long-term goals for the 208-card pool; earned only by opening capsules and upgrading; nothing is sold). They count released troop and turret cards (the Card Album's cards without powers and forts). Profile lists all four with progress ("62/208") under "Collection milestones", done ones with a green check; an earned title is never taken away when a later release adds cards. Unlock kinds `cardsOwned`, `albumComplete`, `cardsMaxed`, `collectionMaxed` (`src/meta/titles.ts`; checked when a capsule opens, after a craft and when a card reaches L10). Engaged player (A6.9 model, 30 seeds): days 3, 24, 133 and 224.5.

  | Title | Unlocked by |
  |---|---|
  | Card Scout | own 100 troop and turret cards |
  | Archivist | own every troop and turret card |
  | Master Smith | 50 troop and turret cards at L10 |
  | Grand Curator | every troop and turret card at L10 |

- **6 emotes:** Laugh, Salute, Cry, Angry, Thumbs up, GG. There is no text chat anywhere.
- **Cosmetic collections (A18.9.4, owner direction):** emotes, quotes, base flags, national flags, base skins, base decorations and battle backdrops (a themed background for your half of the lane, owner request 2026-09-30), all earned, with rarities and completion counts, equipped in the Customize screen.

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
| Dust | Crafting card copies and skins (and foils after L10, A15.11 stretch) | Jade, Gold, Platinum and Aeon capsules, Trophy Road, quests, Conquest, feats (A15.10), copies past L10, duplicate skins, Amber after max (A15.11 stretch) |
| Trophies | Ladder rank | Ladder wins |
| Codex points | Codex Level | Upgrades |

The **Clay meter** is not a currency: a 2-pip bar on Home (3 until 2026-09-30) that turns into a Clay capsule when full (A6.3).

### A6.3 Trophies, arenas and match rewards

Ladder results:

| Result | Trophies | Amber | Other |
|---|---|---|---|
| Win | +30 (by format from Arena 3: A15.8) | 20 with a Sundial Capsule, 40 without one (by format from Arena 3: A15.8) | A Sundial Capsule if the Sundial has one ready; otherwise +1 Clay meter pip |
| Loss | −20 (0 below 400; never below the current arena gate) | 15 | A Sundial Capsule if one is ready; otherwise +1 Clay meter pip. A Retreat claims no capsule and adds no pip |
| Draw | 0 | 15 | As a loss |

- **The Sundial** (owner request 2026-09-29, "come back every 5 hours to open a free capsule"; built 2026-09-30 in the healthy form, A15.4; it replaces capsule charges and the Supply Capsule's allowance). The Sundial readies one capsule every 5 h (18,000,000 ms), continuously, and holds up to 34 (170 h, 7 days 2 hours: the smallest bank of 5 h steps that holds 7 days, A15.1 rule 3). A full Sundial stops filling and says so. A new save starts with 12 ready.
  - **Claiming.** Each finished match in any mode except the tutorial claims one ready capsule, win or lose: a **Sundial Capsule** from the 200-slot bag (A6.4; kind `win`, called Win Capsule until 2026-09-30). One match claims at most one. A Retreat and a void match claim nothing, so every Sundial Capsule needs a played match, never a login. The first 10 capsules of a save need no Sundial (free capsules are used first).
  - **Showing it.** The Capsules tab shows the dial, "3 of 34 ready" and the clock time of the next one ("Next one at 17:40"; never a running countdown). Home shows only the Sundial glyph, in colour while one is ready and grey when none is: no number, no glow, no time and no motion (A15.13); it opens the Capsules tab. The game never notifies (A15.1 red line 4).
  - **Data.** Save fields `capsules.charges` (ready count) and `chargesUpdatedAt` (start of the current 5 h period); content `capsules.charges` { start 12, max 34, regenMs 18,000,000, freeCapsules 10 }.
- **Clay meter.** Every Ladder match that brings no capsule because the Sundial is empty adds a pip. A Retreat adds none (every reward needs play, A15.4; with 2 pips a Retreat pip would pay a Clay capsule every two early Retreats). **2 pips** (3 until 2026-09-30; lowered to keep a 7-match day's income, A15.4) make a Clay capsule without using the Sundial. There is no cap on how many it can produce. A meter already at or above 2 pips when the change lands turns into a Clay capsule at the next timer tick.
- **Supply Capsule** (replaced the Daily Capsule, A15.4; **retired 2026-09-30**, folded into the Sundial). No new allowance accrues. An allowance banked before the change still turns into a Supply Capsule on every 3rd finished match (`matchesPlayed`: the 3rd, 6th, 9th …, any mode except the tutorial, a Retreat included) until the bank is empty, and unopened Supply Capsules keep their contents. The one-time capsule granted right after capsule 2 is opened stays (it is scripted capsule 3, A6.5; the A8 beat is unchanged).
- **War Chest** (replaces the weekly quest, A15.5). Every counting win adds 1; at 20 it grants a Wardrobe Crate and an Age Capsule at once and restarts at 0. It never resets and has no weekly gate.
- **Void matches.** A match that never reaches its end (tab closed or reloaded, device off, crash) changes nothing: no trophies, MMR, rewards, Sundial claim, quest or War Chest progress, loss streak or Clay pip. Retreat is a choice and still counts as a loss (A15.6). Exception (MVP pass 2026-10-01, bug hunt #9): a Ladder battle left after Retreat opens (1:00) counts as that Retreat on the next boot, with a one-line notice (`src/app/abandon.ts`), so reloading cannot dodge a loss.
- **Loss protection.** After 3 ladder losses in a row, the next opponent is one tier lower (minimum tier 0) and the VS screen says "Warm-up match". The same Result shows the tilt card (A15.6).
- **Other modes.** Daily Challenge: A9.1 and A15.7. War Path (A18.7; replaces Conquest, A6.10): first-clear Amber, card unlocks and boss capsules. Quick Battle (a Short War Skirmish at a picked difficulty) and Skirmish: 5 Amber per win, no trophies. In every mode but the tutorial a finished match also claims a ready Sundial Capsule; only Ladder matches add Clay pips.
- **Ladder window (A18.3.4).** Arenas 1-2 play windows that start at Stone. From Arena 3 the window is the **Era of the Week**, seeded weekly in `meta` from the date and shown on Mode select a week ahead.
- **Last Base Standing (A2.10.1; 2026-10-01).** A Ladder length (from Arena 1 since the owner request of 2026-10-03; was Arena 3) that moves no trophies (win, loss or draw). It pays Amber like a Full War win (35, or 70 without a Sundial capsule; 15 on a loss or draw; 0 on a Retreat, which would otherwise be a free Amber farm). Like any Ladder match it claims a ready Sundial capsule or adds a Clay pip, counts its wins (A15.5), moves the hidden MMR and counts for loss protection. Data: `ladderFormats` gains `last` from Arena 3; `arenas.ladder.byFormat.last` = 0 trophies, 35 / 70 Amber, and a loss of 0 trophies.
- **Clock.** Daily timers reset at local 04:00, capped by the banks. The Sundial runs on epoch ms, independent of time zone and 04:00. Every bank holds at least 7 days and nothing earned expires (A15.4). Clock tampering is accepted because no money is involved: a clock moved backwards restarts the current period and never removes a ready capsule; moved forwards, it fills at most to the cap.

| # | Arena | Trophies | Ladder formats | Drop pool | Bot tiers | Bot level | Gate rewards |
|---|---|---|---|---|---|---|---|
| 1 | Tar Pits | 0 | All (owner request 2026-10-03; was Short) | Stone to Gunpowder (4 ages, A17.13), no random Legendaries | 0-II | 1 | Starter War Plan, Tar Pit banner |
| 2 | Frostfang Pass | 150 | All (was Short, Standard) | Stone to Modern (6 ages) | I-III | 2 | Age Unlock Capsules (Industrial and Modern), Frostfang banner, Silver Capsule |
| 3 | Kingsmoat | 400 | All | All 8 ages | II-IV | 3 | Age Unlock Capsules (Future and Cosmic), Moat banner, Jade Capsule, Conquest unlocked (the War Path is open from the start once A18.7 ships) |
| 4 | Powder Bay | 800 | All | All | III-V | 4 | Harbor banner, Jade Capsule |
| 5 | Iron Front | 1,300 | All | All | IV-VI | 5 | Barbed banner, Jade Capsule |
| 6 | Neon Harbor | 1,900 | All | All | V-VII | 6 | Neon banner, Jade Capsule |
| 7 | Orbital Ring | 2,600 | All | All | VI-VIII | 7 | Starfield banner, Gold Capsule (the old Aeon's contents; was Aeon until 2026-09-29) |
| 8 | Chrono Rift | 3,400 | All | All | VIII-X | 8 | Rift banner, Platinum Capsule (was Aeon until 2026-09-29), Crystal Spire skin; The Warden joins the ladder |

- An arena changes the ground and weather layer. Skyline layers still follow each player's age.
- **Age Unlock Capsule:** that age's Support Rare (the Anti-heavy Rare is in the starter kit since build phase H3), plus 4 copies of each of that age's 3 common units.

**Trophy Road.** 60 nodes: every 50 trophies from 50 to 2,000, then every 100 from 2,100 to 4,000. Node trophies = row base + column offset. "Gate N" gives the arena gate rewards above. "A" = Amber, "D" = Dust.

| Base | +50 | +100 | +150 | +200 | +250 | +300 | +350 | +400 | +450 | +500 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 110 A | Meteor Shower | Gate 2 | Aegis | Royal Decree | Broadside | Zeppelin Raid | Gate 3 + Carpet Bomber | Nanite Surge | Warp Strike |
| 500 | 100 D | 220 A | Silver | 240 A | 100 D | Gate 4 | 270 A | Silver | 100 D | Wardrobe Crate |
| 1,000 | 310 A | 100 D | Silver | 340 A | 100 D | Gate 5 | 370 A | Silver | 100 D | Jade |
| 1,500 | 410 A | 400 D | Silver | 440 A | 400 D | Silver | 470 A | Gate 6 | 400 D | Wardrobe Crate |

| Base | +100 | +200 | +300 | +400 | +500 | +600 | +700 | +800 | +900 | +1,000 |
|---|---|---|---|---|---|---|---|---|---|---|
| 2,000 | 520 A | Jade | 400 D | 580 A | Jade | Gate 7 | 640 A | 400 D | Jade | Wardrobe Crate |
| 3,000 | 720 A | 400 D | Jade | Gate 8 | 800 A | 400 D | Jade | 860 A | 400 D | Aeon |

Amber nodes pay 100 + 20 × (trophies / 100). Road capsules have a fixed tier and no climb. The 4,000 summit gives the Aeon Capsule, the top tier of the A6.4 ladder since 2026-09-29 (3 Legendaries), so every player can earn an Aeon by skill; the War Path finale (Cosmic boss, A18.7.8) and Conquest's 27 stars (A6.10) are the other two. A save that claimed one of these three before the ladder update got an old Aeon (now called Gold) there, so it gets one new Aeon per claimed source, once (save migration, B8). Since A17 the first row places the three new alternate powers; the Silver Capsule, 100 Dust and Amber it displaced are second items on the 550, 600 and 650 nodes (the Amber pays the formula at its new place, 230), so no reward is lost. The power rework (A2.9.8) adds the 24 War Path powers as extra items on nodes 550-1,950 in region order (skipping gates, Wardrobe nodes and 1,500; nodes per power in A5.7); a power already owned from the War Path pays 60 Amber there instead.

### A6.4 Time Capsules (card cases)

- **Pre-rolled.** The result is rolled the moment a capsule is granted and saved before any animation plays. The opening only reveals it.
- **Tier ladder** (owner request 2026-09-29: more tiers, so the top capsules are truly rare and coveted). Seven tiers, lowest first: Clay, Bronze, Silver, Jade, **Gold**, **Platinum**, **Aeon** (index 0-6; ids `clay` … `aeon`). Gold, Platinum and Aeon are the Legendary capsules: they always hold 1, 2 and 3 Legendaries. Gold is the old Aeon with +100 Dust.
- **Tier source.** Sundial Capsule tiers (Win Capsule until 2026-09-30, A6.3) come from a 200-slot shuffle bag holding exactly 60 Clay, 80 Bronze, 40 Silver, 13 Jade, 4 Gold, 2 Platinum and 1 Aeon, drawn without replacement and refilled when empty. Clay, Bronze and Silver keep their shares, and Jade or better stays exactly 10%. There is no tier pity: the bag is the guarantee (at most 399 Sundial Capsules between two bag Aeons, 200 on average). The odds screen builds its line from the bag data: "Exactly 1 Aeon, 2 Platinum and 4 Gold in every 200 Sundial Capsules." (The 100-slot bag of 30/40/20/7/3 applied until 2026-09-29.)
- **Hidden until opened.** A capsule that climbs (Sundial, Supply, Clay meter) shows only its start tier and its kind name ("Sundial Capsule", "Supply Capsule", "Starter Capsule") until it is opened, everywhere (A9, A10); fixed-tier capsules show their tier. The odds panel says: "Sundial and Supply Capsules show their tier when you open them."
- **Supply Capsule** (retired 2026-09-30; only allowances banked before then still make them, A6.3). Rolls independently: Bronze 78%, Silver 15%, Jade 5%, Gold 1.5%, Platinum 0.35%, Aeon 0.15% (bp 7800 / 1500 / 500 / 150 / 35 / 15; the old 2% Aeon share, split).
- **The bag in progress at the update** finishes with its old mix, and each Aeon left in it is the new Aeon. The save keeps `capsules.bagSize` (100 for that bag, 200 after), so "N of 100 left" stays true, and the odds panel says "Your current bag was filled before Gold and Platinum arrived, so it finishes with its old mix. Each Aeon left in it is the new Aeon." Unopened Aeon Capsules keep their contents, get +100 Dust and are relabelled Gold, whose table they now match (save migration, B8).
- **Honesty line** on the first capsule and every odds panel: "The result was decided when you earned this capsule. Tapping only reveals it." Scripted capsules show "Set contents" instead of bag odds (A15.3).
- **Scripted capsules** (A6.5) bypass the bag.

| Tier | Stacks | Copies per stack: Common / Rare / Epic / Legendary | Guarantees and extras | Amber | Dust | Expected copies |
|---|---|---|---|---|---|---|
| Clay | 2 | 4 / 1 / 1 / 1 | none | 105 | - | 6.3 |
| Bronze | 3 | 5 / 2 / 2 / 1 | ≥ 1 Rare stack | 210 | - | 10.3 |
| Silver | 4 | 10 / 5 / 2 / 1 | ≥ 2 Rare and ≥ 1 Epic stack | 530 | - | 20.4 |
| Jade | 5 | 24 / 10 / 5 / 2 | ≥ 2 Rare and ≥ 2 Epic stacks (the 25% Rare-to-Legendary conversion was removed 2026-09-29) | 1,400 | 100 | 49.8 |
| Gold | 6 | 26 / 10 / 5 / 2 | 1 Legendary stack (unowned first), ≥ 2 Epic stacks; 30% chance of a skin (Wardrobe odds) | 2,640 | 100 | 75.6 |
| Platinum | 7 | 26 / 12 / 5 / 2; the 2nd Legendary stack holds 1 copy | 2 Legendary stacks (different cards, unowned first), ≥ 2 Epic stacks; 1 skin (Wardrobe odds) | 2,800 | 200 | 77.9 |
| Aeon | 8 | 40 / 14 / 6 / 2; the 2nd and 3rd Legendary stacks hold 1 copy | 3 Legendary stacks (different cards, unowned first), ≥ 3 Epic stacks; 1 skin, Epic or better; 1 Aeon Collection item | 3,600 | 500 | 86.4 |

**All-ages table (content re-tune 2026-10-04; CONTENT_PLAN 8 option B, data `capsules.allAges`).** The content waves (A17.9, A5.4-A5.7) grew the capsule pool from 88 to 208 cards (Common 40 → 88, Rare 24 → 64, Epic 16 → 40, Legendary 8 → 16). From **Arena 3 (Kingsmoat)**, where all eight ages drop and 176-208 of the 208 cards are in the pool, every tier holds one more stack and more copies and Amber, so the time to max a card stays on the A6.9 targets. Arenas 1-2 (pools of 44 and 102 cards, the first 3-8 days of an engaged player) and the onboarding script (A6.5) keep the table above exactly. Guarantees, the stack roll, pity, Dust, skins, collection items and the bag do not change. The odds panel shows the table of the player's arena and says either "Every age drops in your arena, so each capsule holds one more stack and more copies and Amber" or "From Arena 3, where every age drops, …". Lookups go through `capsuleTierFor(capsules, tier, arenaIndex)` (`src/content/capsuleTiers.ts`), shared by the roll (`meta`), the odds panel and the tools.

| Tier (Arena 3 and up) | Stacks | Copies per stack: Common / Rare / Epic / Legendary | Amber | Expected copies |
|---|---|---|---|---|
| Clay | 3 | 6 / 2 / 2 / 2 | 181 | 14.6 |
| Bronze | 4 | 7 / 5 / 5 / 2 | 363 | 24.2 |
| Silver | 5 | 13 / 12 / 5 / 2 | 916 | 53.5 |
| Jade | 6 | 32 / 23 / 12 / 4 | 2,419 | 127.5 |
| Gold | 7 | 34 / 23 / 12 / 4 | 4,562 | 148.7 |
| Platinum | 8 | 34 / 28 / 12 / 4; the 2nd Legendary stack holds 1 copy | 4,838 | 154.1 |
| Aeon | 9 | 53 / 32 / 14 / 4; the 2nd and 3rd Legendary stacks hold 1 copy | 6,221 | 185.8 |

Expected per bag capsule before pity on the all-ages table: 38.5 copies and 710.7 Amber (16.1 and 411.3 on the base table). An Age Capsule from Arena 3 has 5 stacks (`allAges.ageCapsuleStacks`) with the all-ages Silver copies and Amber. The values come from the plan's option B (one more stack on every tier; copies ×1.4 / 2.3 / 2.3 / 2.0, Amber ×1.8) tuned on the real released pool: Common copies ×0.95 and Amber ×0.96 of option B, so the median card sits within 5% of the pre-wave measured medians and the copy and Amber finish dates stay within 30 days (A6.9). Every column still rises or stays going up the ladder, and no all-ages value is below the base table (schema checks). **Per content release:** add the cards, run `npx tsx tools/sim-cli.ts economy --seeds 30` and `drops --mode smoke`, and if a rarity's median card drifts more than 5% from the pre-wave medians (107 / 100.5 / 63.75 / 101.5 days) or the copy-Amber gap reaches 30 days, move that rarity's all-ages copies by ±1 per stack and the Amber by ±5%, then log the numbers in `docs/decisions.md`.

Stacks, Legendaries, Epic guarantees, Amber, Dust and skin chance never fall going up the ladder. Foils stay purely rolled on every stack: no tier has a foil floor (A15.11, A15.22). Tier data fields (`CapsuleTierDef`): `extraLegendaryCopies` (1 for Platinum and Aeon), `skinChanceBp` (Gold 3,000, Platinum and Aeon 10,000), `skinMinRarity` (Aeon `epic`), `exclusiveItems` (Aeon); tables: `summitAbove: 'gold'`, `legendaryCatchUp: true`, `exclusiveCompleteDust: 500`, `exclusiveCraftDust: 3000`. The content bag size is the sum of the bag counts. The collection item chance (`capsuleChanceBp`, A18.9.4) is Clay 800, Bronze 1,200, Silver 2,000, Jade 3,500, Gold 6,000, Platinum 8,000, Aeon 10,000 bp.

Copies and Amber are the A17 values (built): with 88 cards instead of 55, capsules carry about ×1.75 copies and Amber so the time to max a card stays as before (A17.13). The 2026-09-29 ladder was checked with the economy sim over 100 seeds on the shipped code (median days to max Common / Rare / Epic / Legendary 108.5 / 97.3 / 66 / 111.5 against 110.3 / 101 / 69 / 111.5 before; details in `docs/decisions.md`). Expected values per bag capsule, before pity: 16.1 copies, 411 Amber and 13 Dust (was 15.7, 399 and 7; before A17 9.1 and 227). The per-tier expected copies come from `meta/economy.ts`.

**Aeon Collection** (the top-tier exclusive, A18.9.4 items with source `{ kind: 'capsuleTier', tier: 'aeon' }`, rarity Legendary): Aeon Hourglass (decoration), Eternal Dawn (base flag), Frozen Moment (emote, `frozen_moment`) and the quote "Well met, across the ages!". They come from Aeon Capsules, one the player lacks in each Aeon until the set is complete. Once the save has opened an Aeon (`flags['capsule.first.aeon']`), each can also be crafted for 3,000 Dust (the Legendary crate-skin price), so the set keeps A15.1 rule 2's crafting path. They are never tradable or sold and never leave the game. An engaged player completes the set in about 2-3 months, mostly through the skill Aeons; a casual player opens a first Aeon after about 6 months and can then craft the rest. Class: Grey (a random cosmetic); safeguards: earned, pre-rolled, no duplicates, the bag and three skill Aeons guarantee access, a crafting path, set progress on the odds panel, no value number.

**Age weighting (A18.7.8, v1.1).** Age Capsules and card drops that pick an age weight the current War Path region's age ×2 and the Era of the Week ×2, disclosed on the odds screen.

**Roll algorithm (MUST be implemented exactly):**

1. Build the stack rarity list:
   1. Guaranteed rarities first.
   2. Remaining stacks roll Common 72%, Rare 22%, Epic 5%, Legendary 1%. In an arena without random Legendaries, only this 1% roll moves to Common. Guarantees and pity still give Legendaries, drawn from the pool's ages.
   3. (Removed 2026-09-29: Jade's 25% Rare-to-Legendary conversion. `rareToLegendaryBp` stays in the data at 0.)
2. Apply pity in this order: Legendary pity, Epic pity, new-card protection (A6.5). Each upgrades the lowest-rarity non-guaranteed stack (ties: the last stack).
3. Copies per stack come from the tier table by the stack's rarity. The 2nd and later guaranteed Legendary stacks hold `extraLegendaryCopies`.
4. Pick distinct cards per stack from the arena's drop pool of that rarity:
   - Unowned cards weigh ×3.
   - No duplicate Legendary until every Legendary in the pool is owned. Cards already picked in this capsule count as owned for this rule, so a 2nd or 3rd Legendary stack picks an owned Legendary when no unowned one is left; it never falls back to Epic while the pool has a Legendary not yet in this capsule. Every arena pool holds at least 4 Legendaries.
   - **Legendary catch-up:** a Legendary pick uses it whenever every Legendary in the pool is owned, waiting in an unopened capsule, or already picked in this capsule (so it can apply to the 2nd and 3rd stacks of the capsule whose 1st stack took the last unowned one). Each candidate then weighs 1 + the copies that card still needs to reach L10 after its unopened capsules (a maxed card weighs 1). The rarity odds never change, only which Legendary. The odds panel says: "Once you own every Legendary here, Legendary stacks favour the ones you are furthest from maxing."
   - A stack set by new-card protection picks only unowned cards.
5. Each stack rolls a foil on a 10,000-bp scale: Holo 25 bp (0.25%), Silver foil 100 bp (1%), Bronze foil 400 bp (4%), else none. A foil unlocks for that card if it beats the one owned. No tier sets a foil floor.
6. Owned cards at max level convert their copies to Dust at reveal time (shown on the card).
7. Skin: with the tier's skin chance, one crate skin at Wardrobe odds from `skinMinRarity` up, renormalised (Gold and Platinum: Rare 78%, Epic 18%, Legendary 4%; Aeon: the Wardrobe weights 1,800 : 400, so Epic 81.82% and Legendary 18.18%, exactly 9 : 2); no duplicate until every crate skin of that rarity is owned. Capsule skins never read or advance the Wardrobe pity counters. The odds panel prints each tier's split next to its skin line, from the same weights.
8. Aeon Collection item (on the `rng.cosmetic` stream, so the cards never change): while the player lacks an Aeon Collection item that no unopened capsule holds, the Aeon's collection item is one of those (uniform). Once all 4 are owned, it rolls the normal capsule collection pool and adds 500 Dust.

**Other capsule types:**

| Type | Source | Contents |
|---|---|---|
| Sundial Capsule | Any finished match but the tutorial or a Retreat, while the Sundial has one ready (A6.3, A15.4) | The 200-slot bag; climb starts at Clay (A10). Kind `win` |
| Supply Capsule (retired 2026-09-30) | Every 3rd finished match turns one allowance banked before 2026-09-30 into one (A6.3, A15.4) | Tier table above; climb starts at Bronze (summit strikes above Gold, A10) |
| Trophy Road Capsule | Road nodes and gates | Fixed tier, no climb (reveal starts at step 4). Gate 7 Gold, Gate 8 Platinum, the 4,000 node Aeon |
| Clay meter capsule | 2 meter pips (3 until 2026-09-30) | Clay tier, climb from Clay (no climbs) |
| Age Capsule | Quests, Daily Challenge, Conquest (War Path from A18.7), War Chest | Silver-sized (4 stacks, Silver copies; from Arena 3 5 stacks and the all-ages Silver copies and Amber), all from one age picked in a dialog (8 ages) when granted, ≥ 1 Epic stack |
| Codex Capsule | Every 10th Codex Level from 5 | Silver tier, fixed |
| Age Unlock Capsule | Arena 2 and Arena 3 gates (A17.13) | Fixed contents (A6.3) |
| Wardrobe Crate | Every 10th Codex Level from 10, War Chest, Trophy Road | 1 skin: Rare 78%, Epic 18%, Legendary 4%; no duplicate until all crate skins of that rarity are owned. Revealed with the card flip (A10); there is no reel |

### A6.5 Pity, protection and the onboarding script (all counters visible on every capsule screen)

Pity and script indices count every opened capsule except Age Unlock Capsules. Wardrobe Crates have their own counters.

- **Epic pity:** at least one Epic stack every 10 capsules.
- **Legendary pity:** let n be the capsule's count since the last Legendary, including this one. For n ≤ 25 there is no bonus. For 26 ≤ n ≤ 39, one stack upgrades to Legendary with probability (n − 25) × 5%. Capsule n = 40 guarantees one.
- **New-card protection:** at least one unowned card every 5 capsules while unowned cards exist in the pool. If no stack's rarity has unowned cards, the lowest non-guaranteed stack upgrades to the lowest rarity that does.
- **Wardrobe pity:** Epic or better at least every 5 crates; Legendary at least every 25.
- **No tier pity.** The Sundial Capsule bag is the tier guarantee (exactly 1 Aeon, 2 Platinum and 4 Gold in every 200, A6.4), so no counter for tiers is added (A15.13 counter budget). The Legendary catch-up rule (A6.4 step 4) protects the unluckiest Legendary once all are owned.

**Onboarding script (overrides the bag and uses no Sundial):**

| Capsule | Tier | Guaranteed contents |
|---|---|---|
| 1 | Bronze | Drum Shaman NEW, Standard Bearer NEW (not auto-equipped; were Spear Hunter and Phalangite until build phase H3, which moved every Anti-heavy Rare into the starter kit) |
| 2 | Silver | Friar NEW, Field Surgeon NEW (were Pikeman and Grenadier) |
| 3 | Bronze | Log Roller NEW |
| 4 | Silver | First Epic (random, unowned, from the pool) |
| 5 | Gold (was Aeon until 2026-09-29; same contents plus 100 Dust) | Mammoth Matriarch, full walkout (~35-40 minutes into a new save). The climb from Clay still uses all 4 strikes. The first Platinum and Aeon are always earned, never scripted |

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

- **Codex points per upgrade:** +1 Common, +2 Rare, +4 Epic, +8 Legendary. A level takes 15 points (about 130 levels in total with the 88 cards of A17; was about 81).
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
| Reach your format's final age before 2:40 (Short), 4:15 (Standard) or 6:45 (Full) (A17; A18 retimes these to its window clocks and says "the last age of your window") | 150 Amber |
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

- **War Chest** (replaces the weekly quest "Win 15 battles", A15.5). Every counting win adds 1; at 20 (`winsPerChest`, data, 15-25 after the Phase 3 run) it grants a Wardrobe Crate and an Age Capsule at once and restarts at 0. It never resets and has no weekly gate or cap. A counting win is a win in Ladder or the Daily Challenge, or a Conquest (from A18.7: War Path) win that earns a star or beats a General whose tier is at least the player's skill tier minus 2 (A15.9). Skirmish and tutorial matches never count. Home shows "War Chest 13/20".

### A6.8 Matchmaking fairness (AI ladder)

- **Bot level follows the arena, not the player.** Every bot card plays at the arena's bot level (A6.3). Each procedural commander rolls −1 / 0 / +1 (25 / 50 / 25%) from its seed. Upgrades therefore always make the player stronger against the ladder, and a plan cannot be sandbagged.
- **Rarity allowance.** Arena 1 bots use Commons and Rares. Epics appear from Arena 2. A bot fields a Legendary only when the player's War Plan for that format contains one, and plays it at the player's Legendary level. The Warden is the only exception (A7.4), and the VS screen discloses it.
- **Tier choice.** Hidden MMR (Elo, K = 32, start 1,000). Tier rating = 800 + 100 × tier (0 = 800, I = 900 … X = 1,800). Tier = clamp(round((MMR − 870) / 100), arena min, arena max), which targets a 60% expected player win rate.
- **New players.** In the first 20 matches every bot's mistake rate is +10 points, which targets about 65%. The VS screen discloses it: "Rookie AI: makes extra mistakes while you learn" (A15.3).
- **Skill tier** = clamp(round((MMR − 870) / 100), 0, 10), the tier formula without the arena clamp. It stays internal; it sets the default Daily difficulty and defines counting wins (A15.5, A15.9).
- **Standard levels.** Skirmish has a toggle that puts every card on both sides at L7. The Daily Challenge always plays at L7 on both sides (A15.7), as do the later modes listed in A16.7.
- **Fairness is the only tuning target.** MMR and bot tuning may target win rate only, never session length, return rate or retention (A15.1 rule 10).
- **Later PvP (designed now):** ranked sets every card to exactly L8, whatever its level (A16.7), and shows both trophies and a visible Glicko-2 rating (A16.21). The AI ladder and Conquest keep this section's level matching.

### A6.9 Pacing check (engaged player: 7 finished ladder matches a day at 60% wins, the Sundial, 3 quests; until 2026-09-30: 4 charged ladder wins and the Supply Capsule)

Rebased 2026-09-29 on the measured values (88 cards, A17; the capsule ladder, A6.4). "Measured" is the median of 100 seeds (1-100) of `tools/economy.ts` on the shipped code with the 2026-09-29 ladder (re-measured in the review fixes; the first figures came from a prototype that consumed the RNG differently). The time-to-max targets are today's measured medians, because the owner's rule is "keep today's time to max a card" (A17.18 question 5); the old 55-card values (9.1 copies, 227 Amber, ~48 copies a day) are retired.

**The Sundial (2026-09-30, A6.3, A15.4).** Measured before the build with the `tools/economy.ts` player model and the real meta rules (the Sundial run as a harness around them; the unchanged model reproduces the shipped tool exactly), median of 100 seeds, blocks 1-100 and 101-200, for the same player before and after: 7 finished ladder matches a day at 60% wins. Before → after: Common to max 105.75 / 106.25 → 106 / 107 days (+0.5%), Rare 96.5 / 95.75 → 97.5 / 98.75 (+2.1%), Epic 63.75 / 65 → 63 / 62.5 (−2.5%), Legendary 107.25 / 110 → 106 / 104.25 (−3.2%); copies a day 100.4 → 97.4 (−3.0%), Amber a day 3,102 → 3,055 (−1.5%); whole collection 188.5 → 193 days (+2.4%), Amber done 139 → 140, focused plan at L7 77.75 → 77.5. The table's targets stay; `tools/economy.ts` changes its player from "play until 4 wins used a charge" to "play 7 finished ladder matches a day" (that old player never spent its 12 starting charges, which made the old baseline about 3 days slower on Epic and Legendary), and reports Sundial and Clay capsules per day instead of Win and Supply.

**The Sundial as built (review fixes 2026-09-30).** Same player and seeds on the built code: Common 106 / 106.75 (+0.4%), Rare 99.5 / 99.5 (+3.5%), Epic 63.25 / 62.5 (−2.3%), Legendary 105 / 104.5 (−3.6%); copies a day −2.9%, Amber −1.5%; whole collection 188.5 → 195 days (+3.4%). **Deviation, accepted and logged:** Rare, Legendary and the collection sit 0.4-0.6 points past the brief's "about 3%". The cause is the rarity mix, not the income: bag capsules replace the Bronze-heavy Supply Capsule, so Rare slows while Epic and Legendary speed up, and any income lever (period, bank, Clay pips) moves all four the same way, fixing one side only by pushing the other past 3%. The casual player (3 matches a day; `sim:economy` now runs it over 730 days so every rarity finishes; 50 seeds): copies 55.3 → 57.3 a day (+3.6%), Common 204.75 → 200 (−2.3%), Rare 180 → 168.75 (−6.3%), Epic 129.5 → 114.25 (−11.8%), Legendary 211.75 → 185 (−12.6%), whole collection 357.5 → 369 days (+3.2%). That player gains on purpose: the Supply Capsule was theirs, and each of their matches now claims a bag capsule. All A6.9 ±20% gates pass as before.

**Content re-tune (2026-10-04, the 208-card pool; CONTENT_PLAN 8).** The eight content waves grew the capsule pool from 88 to 208 cards. With every wave released and the old table, the same engaged player (30 seeds, 365 days) no longer maxed a median Common or Rare in a year (a 730-day run: 245.5 and 289 days), Epic took 187.5 days and Legendary 222.75 (targets 110 / 101 / 69 / 112), the focused War Plan reached L7 on day 199.5 and the whole collection on day 490.5. The all-ages table (A6.4, from Arena 3) brings them back: Common 105, Rare 97, Epic 62.25, Legendary 106.5 days, each within 5% of the pre-wave measured medians (107 / 100.5 / 63.75 / 101.5: −1.9%, −3.5%, −2.4%, +4.9%), plan L7 94 days, copies done 224.5 and Amber done 210 days (gap 15), whole collection 224.5 days (7.4 months). Every capsule card is owned on day 24 (25 before) and all 16 Legendaries on day 24. The casual player (3 matches a day, 730 days) maxes a median card in 196 / 165.25 / 114.25 / 186.25 days and the collection in 418.5 (before: Common and Rare not in 730 days, Epic 300.5, Legendary 386.75). `drops --mode smoke` passes 17 of 17 before and after. Income rows are rebased on the all-ages table, where the player spends nearly the whole year (Arena 3 arrives in the first week); time-to-max targets stay. **Dust** rises with the copies (214 → 498 a day in days 11-120; 0.32 → 1.41 million in a year, mostly copies past L10 once cards max), and its prices stay: the sinks grew too (36 skins, about 48,000 Dust to craft, against 12 for about 16,000; 173 collection items), so Wardrobe completion by Dust takes about as long as before. **Pity** stays: the Epic pity, the Legendary pity (all 16 Legendaries on day 24) and new-card protection (every card on day 24) already fit the bigger pool.

| Measure | Target (±20%) | Measured (old table, all waves) | Measured (re-tune) |
|---|---|---|---|
| Copies per bag capsule | 38 (16.0 for 88 cards) | 16.0 | 38.2 (38.5 expected before pity) |
| Amber per bag capsule | 710 (411) | 411 | 708 (710.7 expected) |
| Capsules per day | 4.8 Sundial + ~1.1 Clay meter | 4.8 and 1.1 | 4.8 and 1.1 |
| Daily income | ~240 copies and ~5,150 Amber (~98 and ~3,030) | 100 and 3,279 | 240 and 5,156 |
| Common to max (153 copies) | 110 days | not in 365 days (245.5 in 730) | 105 |
| Rare to max (130 copies) | 101 days | not in 365 days (289 in 730) | 97 |
| Epic to max (44 copies) | 69 days | 187.5 | 62.25 |
| Legendary to max (11 copies each) | 112 days | 222.75 | 106.5 |
| All Legendaries owned (16; 8 before) | ~3 weeks (~2 weeks for 8) | 25 days | 24 days |
| Focused War Plan at L7 | ~6 weeks, faster with Dust crafting | 199.5 days | 94 days (open: Phase 3, as before) |
| Whole collection maxed | ~7-7.5 months (~5-5.5 for 88 cards), copies and Amber finishing within 30 days of each other | not in 365 days (490.5 in 730) | 224.5 days; copies 224.5, Amber 210 (gap 15) |
| Collection milestones (A5.8 titles; reported) | none | 100 cards day 3, every card day 25 | 100 cards day 3, every card day 24, 50 cards maxed day 133, everything day 224.5 |
| Dust a day, days 11-120 (reported) | none | 214 | 498 |

**Before the content waves (2026-09-29 ladder, 88 cards; kept for reference):**

| Measure | Target (±20%) | Measured |
|---|---|---|
| Copies per bag capsule | 16.0 | 15.9 (16.05 expected before pity) |
| Amber per bag capsule | 411 | 411 |
| Capsules per day | 4.8 Sundial + ~1.1 Clay meter (until 2026-09-30: 4 win + 1 Supply + ~0.9 Clay meter) | 4.8 and 1.1 (Sundial prototype) |
| Daily income | ~98 copies and ~3,030 Amber | 97.6 and 3,036 |
| Common to max (153 copies) | 110 days | 108.5 |
| Rare to max (130 copies) | 101 days | 97.3 |
| Epic to max (44 copies) | 69 days | 66 |
| Legendary to max (11 copies each) | 112 days | 111.5 (p10-p90 97-124; worst year 138) |
| All 8 Legendaries owned | ~2 weeks (script, pity, no duplicates) | 9 days (open: Phase 3) |
| Focused War Plan at L7 | ~6 weeks, faster with Dust crafting | 82.5 days (78 before the ladder; open: Phase 3) |
| Whole collection maxed | ~5-5.5 months, copies and Amber finishing within 30 days of each other | copies at 200 days (p90 227, worst 310), Amber at 143 (gap 57 days; open: Phase 3) |

A 365-day economy sim (B12) MUST confirm these figures within ±20%, gating on the median of 30 seeds (one seed is too noisy: today's seed 1 misses the old Rare band on its own), and keep the gap between the copy and Amber finish dates under 30 days before release. The four rows marked open missed before the ladder too; they are Phase 3 tuning items. One of them moved: the Legendary catch-up (A6.4 step 4) makes the focused War Plan reach L7 about 3.5 days later (79 days without catch-up, 82.5 with, same 100 seeds; 78 before the ladder). Once every Legendary is owned, catch-up aims Legendary copies at the Legendaries furthest from max, and those are not the War Plan's (the plan's cards are upgraded first). Accepted: the row misses its 6-week target by far either way, and catch-up is what brings the whole collection in 8.5 days sooner (208.5 → 200 days; p90 248 → 227). Phase 3 re-runs it with the A15 sources (Supply Capsules, charges banking 28, the War Chest at 20, rewards by format, Dust from feats); these gates stay and nothing new is gated (A15.20).

### A6.10 Conquest (mastery board)

**Superseded by the War Path (A18.7.10, owner decision D5).** Conquest folds into the War Path: its Generals become the boss and Lieutenant nodes; each Conquest star becomes the matching star on that General's boss node; the 9, 18 and 27 star milestones become star-chest credit; the Conquest tab leaves Mode select and Home. Nothing earned is lost (A15.1). The rules below are the built Conquest, which stays until A18 phase 5.

- **Unlock.** Arena 3. The board lists 9 Generals in a fixed order; each opens after the previous one is beaten once.
- **Matches.** Standard War (owner decision with A17; was Full War) against the General's personal War Plan at a fixed tier and level:

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
  - Star 3, win before 5:45 (A17; was 6:00 in Full War): an Age Capsule.
- **Milestones:** 9 stars give a Jade Capsule, 18 stars a Jade Capsule, 27 stars an Aeon Capsule and the title Conqueror.
- Conquest matches change no trophies and do not move MMR; like every finished match they claim a ready Sundial Capsule (A6.3).

## A7. Bot opponents: AI Generals

### A7.1 Honesty rules (enforced in code)

- **Same rules.** Bots issue commands through the same `Command` API as the player: same gold, XP, prices, cooldowns and levels. No stat multipliers at any tier, and no timer-based evolving.
- **Same information.** A bot controller receives only an `Observation` (B15), never the `Sim`. The observation holds the whole lane (bots have no camera; the player sees the whole lane on the minimap, A17.1), both bases, turrets, both ages and XP percentages, both power charge rings (with the power rework: both sides' two reload rings, and an enemy power's card only after its first cast, A2.9.7), visible telegraphs, the opponent's stance (and Hold flag, A18.4), Treasury level (from A18.5: both sides' research, which is public: owned picks, the current item and its progress) and Last Stand state, the Scouted list, and the bot's own gold and queue. Bots never see the player's gold or War Plan; they estimate gold from time, Treasury level or research and kills.
- **Disclosed modifiers.** Any Daily Challenge modifier is symmetric and shown on the VS screen. Difficulty changes how a bot plays, never its stats (A18.2 rule 5). The only stat differences between sides are disclosed on the node and the VS screen: a War Path boss's base HP and extra turret, The Warden's L9 Legendaries, and the player's War Relics in single player (A18.7).
- **Labeling:**
  - robot icon and "AI" chip on every nameplate
  - "AI General" on the VS screen
  - "Plays by the same rules as you" on the bot profile card
  - "AI" in match history
  - Settings > About: "All opponents in this version are AI."
  - Help text: "Your first 20 opponents make extra mistakes while you learn. After that, opponent difficulty adapts to your recent results." (A15.3)
  - VS screen in the first 20 matches of a save: "Rookie AI: makes extra mistakes while you learn", through `OpponentSpec.disclosures` (built 2026-09-28: only in the onboarding matches, `arenas.ladder.newPlayer.matches` 2, and never when the player picked a difficulty)
  - Difficulty and War Path: the node and the VS screen show the resulting tier ("AI · Rook · Tier IX"); every War Path boss is labelled "AI General" (A18.6, A18.7.6)
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
| Treasury (until A18 phase 3) | m_econ · [before 3:00] · [no enemy unit on the bot's own half] (A17 retune; was "within 600 lu of own gate") · [level < tier max] · f_spare |
| Research (A18.5.8, replaces Treasury) | personality weight by track × (value over the rest of the age − value of the units the gold would buy now) + counter value against scouted enemy classes + a timing bonus for a push planned at completion; gated by the tier's research columns below |
| Evolve | 1.2 when XP ≥ threshold and (no enemy ground unit within 300 lu of own gate, or m_greed ≥ 1.3), after the tier's evolve delay |
| Power | 1.0 when the best zone's enemy value ≥ tier threshold × m_patience, or own base took damage in the last 3 s and zone value ≥ 100; aim error applied. Power rework (A2.9.9): per slot, value per gold (ROI) over the capped targets in the legal band ≥ the tier's ROI bar, with a gold ledger, a Home reserve from tier V and bait-then-wave from tier VII |
| Stance | Hold when the tier allows it, myArmy < 0.7 × foeArmy and ≥ 2 turrets are built, or when the push gate fails; otherwise Charge. A17 addition: also Hold without turrets against a one-type army worth 450+ gold while weaker. A18.4.2: the flag goes where its turrets cover or its army value is highest (tiers 0-II never move it); Fall back when its army is under 0.5× the enemy's and the enemy is past mid-lane (tiers V and up) |
| Last Stand | When armed and ≥ 4 enemies are within 450 lu, unless the base may reach the 10% auto trigger before the command runs: the margin is the worst recent base loss plus, in Overdrive and Siege, the falling-gate risk (the max HP of its own units within 300 lu of the gate, at the Siege multiplier; MVP balance pass 2026-10-01) |
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
- **Answer Heavy with Anti-heavy (owner feedback 2026-09-29; build phase H5, built; tiers III+).** While Heavy-group units are at least half the value of the visible enemy army and that army is worth ≥ 300: (a) a counter-saving goal does not lapse when enemies come within 300 lu of the gate (it still lapses after 8 s), and may be set while they are there; (b) the bot does not train a card whose counter score against that army is below 0.40 while a card at 0.65 or more is in its tray, so it banks for Anti-heavy cards instead of trickling Infantry into Heavies; (c) with Heavies camped within 600 lu of the gate and no turret up, it banks for a first turret on a free mount (ahead of Treasury, Legendary and research goals; a counter goal for an out-of-reach Anti-heavy card may still join it) (the build trace showed Heavies parked at the gate killing every unit on spawn while the bot never built a turret in the first two minutes); (d) while its tray holds an Anti-heavy card whose Troops line can start, it researches only that line or non-Troops picks (it had bought Heavy Weapons at 0:30 against mono Heavy). Review 2026-09-30: the (c) turret must reach the campers (a turret whose minimum range lies beyond the nearest camping Heavy is chosen only when nothing else fits; the goal had picked the Industrial Mortar Pit, min 60 lu, against Steam Golems 24 lu out), and while the bot banks for it the trains wait even under pressure (units trained one at a time spawned into the campers and died, so the goal was never reached). With this, mono Heavy wins 0% against tier VII in Short and Standard (smoke, 200 each) and ≤ 6.3% in every one-age window. Measured as built (tier VII vs mono Heavy, 100 per format, with the A2.6 numbers and the real-sim counter table): mono Heavy wins **14.0% Short and 26.5% Standard** (73.5 and 73.0% before; 47% with the numbers alone; 32 / 41% with (a) and (b) only); the bot's Anti-heavy share of unit gold 41% → 77-78%, Infantry 46% → 10-12%. On today's numbers (a) and (b) alone made things worse (the bot won 8%), so the rule ships with the numbers.
- The bot does not build turrets toward its tier maximum: the turret share of kills is reported only (A16.5).

**Push gate (anti-turtle).** Defence value D = enemy army value within 500 lu of their gate + 300 per enemy turret (enemy units in their gate zone count only after the 30 s opening, A17 retune). The bot Charges past mid-lane only when myArmy ≥ 1.3 × D. Otherwise it banks: it sets a Treasury saving goal (if below its cap; a research goal from A18.5), prefers units with range ≥ 250, and holds at the line if its tier allows Hold. From Overdrive onward the gate uses 1.0 × D, and in Siege the bot always Charges. Lane constants are lane-relative (offsets from the own gate, `L − x` for enemy-side rules, A17.13).

**A set ball (MVP balance pass 2026-10-01, tier VI+).** A held enemy line (the enemy Holds with ground units in its own half, short of the gate zone) counts in D at its card value; once the enemy has held for 20 s it counts ×1.5, because a ball that has massed in place fights on its own ground with its guard research. A bot's pause between waves never reaches 20 s, so mirrors are unchanged (tier VII Short Bell 24.8% with and without the rule, n = 400), while `flag_ball` fell from 47.5 / 32.5% to 29.3 / 13.0% (Short / Standard, n = 200). A flat ×1.3-×1.5 on every held line raised the mirror's Short Bell by 6 points; reading the enemy's guard research did nothing (a Short War flag ball owns none of it).

**Punish a thin army (A18.6).** From Normal difficulty up, the bot pushes when its army value is ≥ 1.5× the player's, so a player who only sends a few units loses (`few_then_evolve` proxy, A18.12).

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
- **Power rework (A2.9.9).** The "Power threshold" column becomes a **Power ROI bar** (kill-weighted value × 10,000 ÷ cost; starting values calibrated in P1): 6,000 / 8,000 / 10,000 / 12,000 / 15,000 / 18,000 at tiers 0 / I / III / V / VII / X (X: any value when its own base is below 25%). Strikes use no positional aim error: the bot picks among its best 3 / 3 / 2 / 2 / 1 / 1 targets. Tiers 0-II cast from the Home slot only; from V the bot keeps a Home reserve and reads the enemy's rings; from VII it keeps bait discipline (no Home cast on targets worth < 200 unless its base was hit) and baits, then waves.
- **Treasury max** is removed with the Treasury (A18.5.4). **Research columns (A18.5.8):** tiers 0-I research first after 1:30 and then every ~90 s, seeded random among affordable picks; II-IV after 1:00 by the pick's `aiHint`; V-VI after 0:45 by counter scoring and push when their own Troops rank completes; VII-X from 0:30 by counter scoring and time pushes and evolves to their completions and away from the enemy's.
- **Difficulty (A18.6).** Quick Battle and Skirmish map Easy, Normal, Hard, Expert and Legendary to tiers II, IV, VI, VIII and X (built). The War Path adds a region base tier, a level offset, a difficulty offset and behaviour flags per difficulty (A18.6.2).
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
| Baroness Ledger | Greedy evolver | III-VI | 40 | 40 | 95 | 95 | 40 | 40 | 40 | Treasury 3 by 2:30 (from A18.5: Economy research first, Guildhall), evolves first, weak before 1:00 | "Money first. Manners later." |
| Sgt. Boomsworth | Artillery | IV-VII | 50 | 70 | 50 | 50 | 50 | 40 | 50 | Trebuchet, Bronze Cannon, Howitzer, Grenadier | "Stand still, please." |
| Ada & Ivo, "The Twins" | Balanced counters | V-VIII | 60 | 50 | 50 | 60 | 60 | 50 | 40 | Two portraits on one bot | "Two heads, one plan." |
| Rook | Counter-picker | VI-IX | 60 | 50 | 50 | 60 | 50 | 50 | 30 | Counter weight ×1.5, switches within seconds | "I see what you brought." |
| Madame Tempest | Power timing | VII-IX | 60 | 40 | 50 | 70 | 95 | 50 | 40 | Banks powers for evolve moments and clumps (power rework: times powers to evolves and baits your Home power, then waves; a clump is worth no more than the cap, A2.9.5) | "Wait for it..." |
| The Warden | All-round boss | X | 70 | 60 | 60 | 70 | 80 | 90 | 40 | Final boss of Arena 8 and Conquest (the Cosmic War Path boss from A18.7.6); brings all eight Legendaries at L9 (disclosed on VS). Appears in 1 of 5 Arena 8 ladder matches | "Every age ends. Yours ends here." |
| Echo of You | Mirror | Any (Skirmish) | derived | | | | | | | Plays your own active War Plan with the Balanced brain | "Let's see how you like it." |

- **Procedural AI Commanders** fill the ladder between Generals.
  - Names come from syllable tables in `content/names.ts` and always carry the prefix "AI · " (for example "AI · Brakka Stonejaw").
  - Each has a stable seeded profile: personality, favourite card, and a War Plan built from the pool under A6.8.
- **Readable intent.** Saving lulls, holding at the line, and a burst of spawns right after an evolve all telegraph the plan.
- **Plans for 8 ages (A17.13, built).** Every General but Grogg has all 8 loadouts; procedural commanders build theirs from the arena's drop pool.
- **Research styles (A18.5.8):** Captain Kettle: Infantry Rush, never Forage; Mama Moss: Defences first; Baroness Ledger: Economy first, Guildhall; Sgt. Boomsworth: Command and Ranged; Madame Tempest: Signal Fires, Reserve Charge (Quartermasters with the power rework); Rook: counters your scouted classes.
- **Power styles (power rework, A2.9.9; each "where the age has one and the bot may use it", else the age's starter of that slot):** Pip starters; Kettle charges and Rally; Moss Home controls and bombards; Ledger the 75-gold powers and buffs (ROI bar +2,000); Boomsworth bombards, strikes and front barrages; Ada & Ivo counters; Rook Flak vs air, Suppress vs 3+ turrets (Medieval and Future), strikes vs Rares and damaged Epics; Tempest bombards and sweeps with bait-and-wave (power patience 95: ROI bar +1,800); The Warden its region's War Path powers on the War Path, the ladder filter elsewhere (A2.9.8).
- **War Path bosses (A18.7.6).** The Generals above are the region bosses and Lieutenants; new Generals join with the new ages (Queen Sethra, Legate Varro Ironhand, Jarl Ingrid Stormaxe, Lady Kaede). A boss has +50% base HP and one extra turret (disclosed) and an enrage phase at 50% base HP.

## A8. Onboarding: the first 40 minutes

On-screen text is at most 8 words. No menu, name prompt or account screen appears before the first win. The times below are targets; WP11 retimes every beat from a scripted sim run, and `tutorial/scripts.ts` holds the exact ticks.

| Time | Beat | Text |
|---|---|---|
| 0:00 | Click Play. Load ≤ 3 s. The title screen is the live battlefield with one Play button | "Play" |
| 0:03 | Match 1 (Tutorial format, Stone to Future) vs Old Grogg (AI, Training match: no clock, his base at 90%). Tray: Bonker only; the gold counter pulses when affordable. Grogg sends Training Dummies | "Tap to send a Bonker" |
| ~0:17 | First kill; "+30" flies to the gold counter | "Kills earn gold" |
| 0:20 | Pebbler card slides in (script `unlockSlot`) | "Pebblers shoot over friends" |
| 0:40 | Grogg sends a Tuskback; the script grants 150 gold and the empty mount pulses | "Build a Rock Tosser" |
| ~0:37 / ~0:39 (Anti-heavy, build phase H3, reworked after review 2026-09-30) | As Grogg's Tuskback walks on (0:37) the Spear Hunter card slides in with its "Beats Heavy" chip and the script grants its price, 100 gold (`unlockSlot` + `grantGold`). After the Rock Tosser beat the hand points at the card while the Tuskback is within 500 lu of the player's front (on screen with the follow camera; trigger `foeHeavy`), and the beat ends when the Spear Hunter walks on, not when it is queued (done `spawned`, 20 s timeout). Grogg's Tuskbacks are level 10 (+45%, `MATCH1_GROGG_LEVELS`): the first fights the Bonkers camped at his gate until ~0:51; a second walks on at ~0:59 as the Spear Hunter reaches the gate, and the Spear Hunter kills it (~1:07). Retimed: Medieval 0:57, Gunpowder 1:27, Modern 1:46, Future 2:19, Grogg falls 2:25 | "Spear Hunters beat Heavies" |
| ~0:50 | Tutorial XP (built: 680) fills; Evolve glows steadily on the XP bar | "Evolve!" |
| ~0:55 | Full Ascension show; 2 Vanguard Footmen march out; tray flips to Footman and Longbowman; Grogg stays in the Stone Age for comedy | none |
| ~1:20 | Arrow Storm ready; an animated hand drags it onto enemies | "Drag the arrows onto them" |
| ~1:30 / ~2:00 / ~2:35 | Gunpowder, Modern and Future, each with the full evolve show and that age's Infantry and Ranged commons in the tray | Future: "From clubs to lasers!" |
| ~3:00 (built: ~2:30 on the long lane) | Grogg's base falls: slow motion, coins, staged rewards. Winning also grants one Wardrobe Crate (built) | none |
| ~3:10 | Capsule 1: guided taps, scripted climb to Bronze, Drum Shaman NEW (short walkout; was the Spear Hunter, now in the starter kit, A3); not auto-equipped (the summary offers Equip now; auto-equipped, the extra Support card made the onboarding autopilot lose match 2 to Pip in 2 of 4 seeds) | "Tap to crack it" |
| ~3:50 | Match 2: Short War vs Pip Quickstep (AI, tier 0), starter plan. Stone teaches Treasury; Medieval teaches the second mount. Pip opens Ranged then Infantry, then leans on Tuskbacks; Pip's plan holds no Anti-heavy card (owner feedback 2026-09-29: with the Anti-heavy numbers a Pip with them cut the onboarding autopilot's match 2 wins from 90% to 84% of 80 seeds; without them 94%) | "Tap your gold for Treasury"; "Buy a second turret mount"; "Heavies! Send Spear Hunters." (adaptive; per age the age's Anti-heavy card) |
| ~9:00 | Win (a loss still gives rewards plus a retry). Capsule 2: Friar and Field Surgeon NEW (were Pikeman and Grenadier, now in the starter kit). One forced upgrade: Bonker to L2 (hammer slam) | "+5% HP and damage" |
| ~10:00 | Home appears: editable auto name, Trophy Road reveal, first Supply Capsule (granted right after capsule 2, no matches needed; A15.4); the Battle button pulses once | none |
| ~10:15 | Match 3: Ladder, Short War vs Captain Kettle (tier I) | none |
| After match 3 (built: after match 1) | War Plan, Customize, Quick Battle and Skirmish unlock, with a prompt to review the Stone loadout | "Your army, your plan" |
| Match 4 (built: match 1) | Stance flag appears | "Hold: gather at the line, then push." |
| Match 5 (built: match 2) | Manual Last Stand button appears | "Low base? Tap Last Stand." |
| ~35-40 min | Capsule 5: Mammoth Matriarch, full Legendary walkout | none |

**Built changes (2026-09-28).** After match 1 and capsule 1 the player lands on Home, whose Battle button says "Next: Pip Quickstep · AI" and starts match 2 through VS; a reload at that step goes to Home. Locked Home entries say "Unlocks after the training match". One short first-time pointer (at most 8 words) sits over one unopened Home entry at a time (War Plan, Collection, Capsules, Customize, Trophy Road). Match 2 adds a camera beat, "Drag the field or tap the map", pointing at the minimap at 0:20 (A17.6); beats that point at something off-screen first move the camera there and hold it (A17.6).

**The War Path takes over onboarding (A18.7.5, A18.7.10).** Once the War Path ships, the first 40 minutes are War Path Stone L1-L6: L1 is today's training match vs Old Grogg, L2 teaches stance (the enemy rushes; winning needs Hold, then Charge), L3 a turret, L4 the Age Power dragged onto the lane, L6 the War Council's Economy track, L7 Troops rank I, L8 Defences, L10 the first boss (Pip Quickstep). The beats above move onto those nodes; the Treasury beat of match 2 becomes the Economy beat on L6. Evolving is taught at Bronze L1 (the first 2-age window).

**Adaptive hints** fire at most once per 30 s, only on failure patterns, and at most 3 times each:

- "Their turret shreds melee. Try Pebblers."
- "Heavies! Send {Anti-heavy card}." (was "Heavies stop Bonkers. Try a Spear Hunter."; every age, from match 2; the in-battle counter hint, A9.2)
- "Your power is ready."
- "Evolve before they do."
- "Buy another turret mount."
- "Hold: gather at the line, then push."
- "Research is ready. Open the War Council." (from A18.5; War Path regions 1-2 and Easy only)
- "Old turret? Tap it to modernise."
- "Save gold, then send them together." (the trickle detector, A16.6)

The failure-pattern detectors keep running after onboarding; only their in-battle hints stop. After a loss they feed one Result tip (A15.12, A16.6).

**Instrumentation.** A local event log (ring buffer of 500 events) records each onboarding step's timestamp and drop-off, plus the healthy-play signals in A15.20. It can be exported from Settings for playtests. It never leaves the device.

## A9. Screens and UI flow

```
Boot (≤3 s) ─first launch─> Tutorial match 1 ─> Capsule 1 ─> Home ─> Match 2 ─> Capsule 2 + upgrade ─> Home
Home: [BATTLE] | War Plan | Collection | Capsules | Customize | Trophy Road | Conquest | Profile | Settings(gear)
BATTLE ─> Mode (Quick Battle / Ladder / Conquest / Skirmish / Daily Challenge) ─> VS (2 s, skippable, AI badge) ─> Battle ─> Pause
Battle ─> Result (rewards staged, tap to skip) ─> Capsule opening (if earned) ─> Home or Next battle
```

The flow above is built (2026-09-28). **Owner decision 2026-09-30:** Home is the **Battle hub**, the 1v1 screen: the game's main point is the 2-player online battle (A18.10), which is the Ladder against labelled AI opponents until online play ships, so it is the first thing a player sees. The War Path (A18.7) is the offline side road for cards and currency: a sub-screen of Home reached from its Campaign card, no longer Home itself (it was from 2026-09-28 to 2026-09-30). Five tabs: Army, Capsules, **Battle** (Home, centre), Progress, Customize. Features open with wins in any mode, not with War Path levels (ui-plan 2.6). The whole UI is built on a shared design system and motion catalogue (`docs/ui-plan.md`, 2.3 and 4.1 for Home and the map).

**Online-first Battle hub (owner request 2026-10-01; spec `online-home/SPEC.md` in the session scratchpad).** Home is laid out as the lobby of a 2-player online game, taking Clash Royale's principles and never its names, art, positions or wording:

```
Home: [mode switcher ▾] [BATTLE]   the plate over Battle shows exactly what Battle will do
BATTLE (Ladder, Quick, Daily, Skirmish: vs labelled AI) ─> VS ─> Battle ─> Result ─> Next battle | Home
BATTLE (Online Battle, M4) ─> Searching (Home state; Battle becomes Cancel) ─> Found ─> VS (Player chip) ─> Battle
                                 └─ 25 s: [Play an AI General] offered while the search goes on (a choice, never a swap)
Create room (Friend Duel, M2) ─> Room (code, Share, length, Ready) ─> VS ─> Battle ─> Result ─> Rematch | Home
```

- **The Modes tile becomes the mode switcher.**
  - It shows the selected mode ("Ladder · vs AI").
  - Its panel *selects* a mode and never starts one; the choice is remembered in the UI flag `ui-homeMode.<id>`.
  - Battle plays what the switcher shows: 1 tap for the remembered mode, 2 more to change it.
- **The match plate is the lobby card.**
  - It shows the opponent: a labelled AI General, or online a neutral silhouette until a player is found.
  - Below that sits the one choice the mode needs: the length for Ladder, Online and Friend Duel; the difficulty for Quick Battle and Daily.
  - One line gives the ages, the "up to" minutes and the reward.
- **Not shown before it works.** No online control appears before its milestone works (U8, U15). The online states exist behind `?dev=1` for screenshots only.
- **Search honesty.** An AI match never shows a search. No player counts are shown anywhere.

| # | Screen | Contents |
|---|---|---|
| 1 | Boot | Logo ≤ 1 s, progress bar; Stone assets first, the rest streams in during the tutorial or the menu |
| 2 | Home (the Battle hub, owner decision 2026-09-30) | The arena diorama in the centre (your base and the AI's across the lane, the arena's landmark; art through the ArtProvider) with the arena's name and the trophy bar to the next Trophy Road reward under it; the match plate over the big **Battle** button (the only primary, bottom-right): the next opponent's portrait with the AI badge and tier, and the ladder format picker from Arena 2; Battle starts a Ladder match in one tap (the onboarding matches while they are due); Modes beside it (Quick Battle, Daily, Skirmish, Conquest). **From 2026-10-01** the Modes tile is the **mode switcher** ("Ladder · vs AI"), and Battle plays the selected mode. The plate shows exactly what Battle will do, in one state per situation: Training; Ladder at Arena 1 (no picker) and from Arena 2 (the **length picker** Short, Medium, Long, No clock, with locked lengths naming their arena); Last Base Standing; Quick Battle (difficulty); Daily (Recruit / Veteran / Warlord); Skirmish (summary and Change). Later states: Online idle (a neutral silhouette, "A player · found when you press Battle"); Searching (elapsed time counting up, the AI choice after 25 s); Found; Friend Duel (Enter a code; Battle reads "Create room"); No connection, Online full and Update needed (each with "Play vs AI"). On phones the fourth length segment stacks the Last Base Standing glyph over "No clock" in 11 px type (each segment ≥ 48 px); if a locale clips, the picker becomes one chip that opens a 4-row popover. The diorama's far base is the AI's; online it is a "?" silhouette, fogged while searching, and it resolves into the found opponent's base. Left: the Campaign card (the War Path: region art, next level, stars, "Solo battles vs AI, earn cards") and four capsule slots (one tap opens). Top: profile chip with trophies, the Sundial glyph (no number: in colour while a capsule is ready, A6.3, A15.13), Amber and Dust chips, gear. Quests, the War Chest and the Trophy Road screen live in Progress; charges, Supply and Clay in Capsules. No timers and no backlog counts on Home; nothing online is playable until it exists (A15.13). **The one exception (owner decision 2026-10-01, "the friend entry shown as coming later"):** a quiet, locked "Friend Duel · Later" chip left of the switcher (desktop: "Arrives with online play"); a tap opens the Modes panel on the Friend Duel card's note, and it never starts or selects anything. The Modes panel lists "vs players" first |
| 3 | Mode select | Quick Battle (built; first card: a Short War Skirmish at a picked difficulty, Easy II to Legendary X, vs the first ladder General whose tier range holds it; 5 Amber per win); Ladder (format picker from Arena 2; it shows each format's reward, A15.8; the Era of the Week from Arena 3, A18.3.4); Conquest (from Arena 3; leaves with A18.7.10); Skirmish (from match 2: choose General or Echo, the difficulty picker, format, start era (A18.3.4), speed, "Standard levels" toggle; 5 Amber per win); Daily Challenge (difficulty picker Recruit / Veteran / Warlord, A9.1). **From 2026-10-01 the Modes panel is the mode switcher's chooser.** It has one card per row: icon, name, one line, the reward line, and a check on the selected card. A tap selects the mode and closes the panel; Battle then plays it. The Ladder returns as a card (the default). Skirmish keeps "Set up", and its setup's Play starts the match and selects Skirmish. Online cards join when they work: Friend Duel (M2), Online Battle (M4), Ranked (M5), under a "vs players" header with the AI modes under "vs AI". The War Path is not a mode (its Home card). Events arrive as cards without timers |
| 4 | VS | Your card vs the AI General card: AI badge, tier, levels ("Plan Lv 3.4 vs Lv 3"), format, personality line, modifiers, boss disclosures. Last Base Standing adds "No clock · Siege rises every 2½ min from 14:30 · Crumble from 23:00". **Online (M2+):** both nameplates show avatar, name, banner, arena and trophies, plus a **Player** chip on a human or the **AI** chip on a bot (a bot never gets a person's name, avatar or chip). Also shown: the length, "All cards at level 8", 1-3 connection bars, and block and report on the opponent's plate. VS lasts 3 s and cannot be skipped |
| 5 | Battle HUD | See A9.2 |
| 6 | Pause | Resume, Scouted list, Settings, Retreat (after 1:00), Quit Skirmish |
| 7 | Result | Victory/Defeat/Draw banner; recap (units trained and killed, base damage, time per age, MVP card). At most 3 staged steps (A15.13): (1) the result with trophies, (2) the main reward (a capsule, an Age Capsule or a Clay pip), (3) one progress bar, whichever of the next Trophy Road node, the War Chest or a Conquest star is closest to done. A found feat adds its own step (A15.10). Everything else (Amber, Codex points, quest and Supply progress, one result or loss tip, A15.12, A16.6) sits in one summary row that expands on tap. Tap to skip works. Then at most one card (tilt, break or wrap, A15.6) and the night line after 22:00. Daily: Copy result (A15.7). Buttons: Next battle, Watch replay, Home |
| 8 | Capsule opening | A10, with the odds and pity panel on every capsule |
| 9 | War Plan | Preset tabs A/B/C; one tab per age (8); 6 unit (5 until A18 phase 2) + 2 turret + 1 power slots, later 1 Fort slot; collection filtered to the age; class icons, filters and the counter legend; research compatibility marks; average level; auto-fill; advisor warnings; skin picker per card. A clear deck builder: drag or tap into slots (A18.9.3) |
| 10 | Collection (the Card Album since 2026-09-30) | A long scroll like a Pokedex: every card numbered, grouped by age with a sticky age header and completion bar, owned in colour with level and copies, missing as a "?" silhouette with its source; Have / Missing, rarity and class filters; age jump chips; a total count (A18.9.3); Skins tab; Feats tab (12 feats, "???" and a riddle until found, a Show hint button; A15.10); crafting with Dust |
| 11 | Card detail | Animated idle on a stage; full stats (HP, damage, interval, DPS, range, speed, pop, train time, size, hits, tags, mods, abilities); Strong vs / Weak vs; next-level preview; Upgrade; skin carousel; foil frames owned; for L10 cards a foil crafting button (A15.11, stretch) |
| 12 | Trophy Road | Vertical path, arena gates, claimable nodes |
| 13 | Profile | A6.1, including "Highest AI tier beaten" (A15.9), plus match history with replay buttons |
| 14 | Replay viewer | Play/pause, 1x/2x/4x, restart, side toggle for which HUD to show (seek arrives in v1.1) |
| 15 | Settings | Master/Music/SFX/UI volume; graphics preset (Auto/High/Lite); reduce motion; shake slider; hitstop on/off; damage numbers (Off/Important/All); colourblind preset (Default, Blue/Yellow, High contrast); language (EN in v1; DA in v1.1); default speed; vibration (default Off); break reminder (On at 60 min by default, or Off); quick reveal (default Off); save export/import/reset; odds overview; About; For parents (A15.6); credits; export event log |
| 16 | Dev (`?dev=1`) | Art gallery, soundboard, feel tuner, spawn sandbox, time scale, replay debugger, capsule test bench, bot-vs-bot viewer |
| 17 | Conquest | The 9 Generals drawn as a vertical ladder ordered by tier, each with its AI badge, stars, rewards and milestones (A6.10); the player's portrait sits just above the highest General beaten in Conquest (A15.9). Replaced by the War Path (A18.7.10) |
| 18 | War Path (A18.7; a sub-screen of Home since 2026-09-30) | A scrolling saga map with parallax (far skyline, ground, near silhouettes), one themed region per age with 10 levels (2 side nodes each later): hills, water (a lake, a shore with boats, a river), two landmark set pieces per region, props, lanterns along the road, clouds and birds, all animated and still under reduce motion. Node kinds: battle (disc), elite (Hard shield with crossed swords), treasure (a chest on the node; a named card), story (a scroll; the level teaches something) and boss (the General's portrait in its lair). Beaten nodes show stars and crowns; the current node has a marker, rings and the banner-bearer; a new node bursts free of its padlock and drops in (MR-41). Back top-left; the next level under a big Play button; the Level preview has the difficulty picker; boss nodes show their disclosures; "New region" marks on inserted ages |
| 19 | Customize (built) | Tabs Troops, Bases, Banner & title, Emotes: skin tiles (equip, craft with Dust, crate only) and the profile look fields; nothing can be bought. A18.9.4 adds Quotes, Flags (base and national) and base decorations |
| 20 | Friend room (M2; a panel over Home) | "Play a friend": the 6-character room code (no look-alike characters), Copy and Share, the length picker (the host may change it while waiting, which clears the guest's Ready; the guest sees it read-only, all four lengths), "Waiting for your friend…" with elapsed time, Ready (gold, once both are present) and Leave room. Enter a code: six boxes, paste, Join. No friend search before M6. Friend Duels pay nothing (no Amber, Sundial claim, quest or War Chest progress) and move no trophies; their Result offers Rematch (both press) and Home |
| 21 | Online search (M4; a Home state, not a screen) | Battle becomes Cancel (slate, same place, instant, nothing lost; Esc and back too). The plate shows a compass, "Searching for a player" and elapsed time counting up (never a countdown), with one tip line. The far base fogs over. The tab bar dims and does not respond. After 25 s the plate offers "Play an AI General" while the search continues. AI fill is labelled AI, pays Ladder-vs-AI rewards and never moves a rating. On Found, the plate flashes the opponent with the Player chip for 0.6 s, the fog clears into their base, and VS follows. In battle online: no pause or speed (a Menu with sound, mute opponent emotes, Surrender after 1:00); disconnect grace is 60 s, then a forfeit, shown without seconds |

**Unopened capsules on every screen (2026-09-29, A6.4, A10).** A capsule that climbs (Sundial, Supply, Clay meter) is shown by its start tier and its kind name until it is opened: in the Home tray, on the Capsules shelf and stage, on the Result (screen 7), in aria labels and in the odds panel. It never shows its rolled tier, tier name or Legendary crests, and shelves never sort by the rolled tier (they sort by the tier shown, then by when the capsule was earned). Fixed-tier capsules (Trophy Road, gates, War Path, Conquest, Codex, Age) show their tier, name and crests. The one-time "Two new capsule tiers" notice is a closable card in the Capsules tab, not a Home widget (A15.13).

### A9.1 Daily Challenge

Full rules: A15.7 (Daily Challenge 2.0).

- **Shared seed.** `dailySeed = xmur3('daily' + YYYYMMDD)` for the local day starting 04:00. Everyone gets the same modifier, the same opponent (one of the 8 ladder Generals from Pip Quickstep to Madame Tempest, with its personal War Plan) and the same match seed on that date. With the power rework the Daily always plays both power slots; a player whose Field slot is still locked gets each age's Field starter there for Daily matches only (A2.9.1).
- **Format:** Standard War, with every card on both sides at L7. From A18.3.4: its own seeded window of Standard length (5 ages).
- **Difficulty,** chosen before the match: Recruit (tier II), Veteran (tier V) or Warlord (tier VIII). The default is the one nearest the player's skill tier (A6.8).
- **Modifier:** one symmetric modifier per day from the Daily seed:

| # | Modifier | Effect |
|---|---|---|
| 1 | Gold Rush | Passive gold ×1.5 |
| 2 | Glass Armies | Unit HP ×0.7 |
| 3 | Power Hour | Age Power charge ×2 (power rework: reloads twice as fast and powers cost 50% less, A2.9.2-A2.9.3) |
| 4 | Fast Forward | XP thresholds ×0.7 |
| 5 | Heavy Metal | Heavy and Legendary cost −30% |
| 6 | Sudden Siege | Siege starts 1:15 earlier |

- **Reward:** a bank of Daily rewards gains +1 at each 04:00 and holds up to 7; a new save starts with 1. A win at any difficulty uses one banked reward and pays an Age Capsule. Other wins pay 20 Amber. Daily matches change no trophies or MMR; like every finished match they claim a ready Sundial Capsule (A6.3).
- **Copy result:** after a finished Daily, one button copies a plain-text line with no name, for example `Ageborn Daily 2026-10-03 · Glass Armies · Veteran · Won in 5:42 · Base 63%`. Copying pays nothing. There is no streak counter.

### A9.2 Battle HUD (DOM overlay over the canvas)

- **Top bar (12% of height; 10% on phones, A17.7):**
  - Left: your base HP bar, age icon and XP bar, with the Evolve button attached to the XP bar.
  - Centre: match clock with a phase marker (Overdrive/Siege ticks on the timeline) and the emote button. In a format with no Final Bell (Last Base Standing, A2.10.1) the clock counts up and the timeline becomes a 6-pip escalation meter (Overdrive, Siege I-III, Crumble I-II) with the step's name under the clock; a tap shows the schedule as a drop-down that never pauses. Under it, the **minimap strip** (A17.5) replaces the front-line strip, with the base button at its left end and the front button at its right end.
  - Right: the opponent's base HP, age icon, XP bar, power charge ring (power rework: two 22 px reload rings inside the enemy block, "?" until each power is first cast, A2.9.10) and a horn icon while their Last Stand is armed; from A18.5 their research icon and ring; a "Scouted (n)" chip (finished enemy research picks join it); pause and speed.
  - Tapping the Scouted chip opens a drop-down list that collapses after 3 s. It is the only element that may briefly cover the lane band, and only on request.
- **Bottom tray (24% of height), left to right:**
  1. Gold counter with income per second and the next Treasury cost; tapping it buys Treasury. From A18.5: the round War Council button right of the gold counter (a ring while research runs, a dot when something is affordable) opens a bottom sheet over the tray, never the lane, with four track cards; the game keeps running.
  2. 5 unit cards (6 from A18 phase 2): 88 px targets on screens ≥ 900 px wide, 72 px below. Each shows cost, queue count, radial training fill, affordable glow, foil frame, class icon (A18.9.1), and the "ARMY FULL" / "LEGENDARY IN FIELD" states. **Counter hint (Anti-heavy, build phase H1):** while the enemy has 2+ Heavy-group units on the lane, or Heavies are 40%+ of the visible enemy value, each Anti-heavy card in the tray shows a "Beats Heavy" chip with the shield-and-spear glyph and lifts once (MR-69: a lift and a glow, never a flash); the adaptive hint "Heavies! Send {card}." follows the A8 limits (once per 30 s, 3 times per match). With no Anti-heavy card in the age, the Result tip reads "Add {card} to {age}: it beats Heavies." and the War Plan advisor repeats it. Reviewed with Playwright at 844 × 390 and 1280 × 720.
  3. Army counter ("Army 44/60") and stance flag (from match 1; from A18.4 a three-segment Charge / Hold / Fall back control, 48 px tall on phones, and a small flag over the own front).
  4. Large round Age Power button (charge ring); dragged onto the lane (A18.9.2). Power rework (A2.9.10): a dock of two round buttons, Home and Field (64 px on phones, 96 px on desktop), each with a reload ring and seconds, a cost chip and a reach glyph; until forts ship the dock uses the reserved Fort space.
  5. Last Stand button (only when armed, from match 2).
- On an 844 px landscape phone (about 756 px usable after safe areas) the tray needs about 700 px.
- Turret mounts are tapped directly on the base in the canvas. The build, Modernise and Sell picker is a small DOM popover.
- No persistent control covers the lane band. Off-screen badges (A17.5) are transient and stay out of the centre 70% of the band.
- **Denied press:** red flash, 2-frame shake, `ui_deny` sound.
- **Low base HP (< 25%):** red vignette pulse every 1.2 s.

## A10. Capsule opening storyboard

The result is rolled and saved before step 1, so a reload can't re-roll it. The sequence never fakes a near miss.

**The capsule.** A carved stone-and-brass drum with 5 carved rings (as built), now for Clay, Bronze, Silver, Jade and Gold: reaching tier i (0-4) lights rings 1 to i + 1. Each lit ring's front gem glows in its own tier's colour, so every drum shows the ladder bottom-up; unlit rings are carved stone, part of the drum as built. Platinum and Aeon are **summit tiers**: before each summit strike one summit gem rises out of the cap and settles in the stone cap band, and the strike ignites it in the new tier's colour. A Gold-or-lower drum has a plain stone cap with no sockets, so nothing above the result is ever drawn empty. The body material and the crack light change with every climb. **Legendary crests** replace the old Aeon gold rim: one crest per guaranteed Legendary (Gold 1, Platinum 2, Aeon 3) stamps onto the upper brass band (widened to about 22 px on every drum) when the climb reaches that tier. A crest is the Legendary star gem (#F5B82E, ui-plan 3.5's star shape) on a dark enamel shield (#1D1405) with a white-gold rim (#F4ECD8): the star has 10.2:1 on its shield (1.36:1 straight on the brass, which is why the shield exists), and the shield has 7.5:1 on the brass band. It is the one rarity colour allowed on a capsule, it is always true because it shows a tier already revealed, and it is never drawn as an empty outline.

Tier colours (none of them is a rarity colour). Every new or changed key (Gold, Platinum, Aeon), and the mid-tone and highlight pixels sampled from its rendered drum body (not the brass fittings every drum shares), is at least ΔE2000 12 from every rarity colour (Epic text #B77BF9 included), every team colour in every preset (#2F7DF6, #5B9BFF, #F28A1E, #F2C21E, #1F5FD6, #FF6A00), the button faces (#F2B52C, #FFD466, #B7801A, #3CC46B, #C9392F) and every other tier. The older keys keep known exceptions: Silver vs Common (4.2), Jade vs progress green (2.4, separated by object), Bronze vs the primary lip (8.3) and foe orange (10.1), Clay vs Bronze (11.4). A WP10 unit test checks the table and the sampled drum pixels. Tier colours are fills, glows and gems, never text: the tier name always sits in the normal text colour next to the icon. Every tier icon carries a 1.5 px parchment outline (#F4ECD8 at 60%) on every surface (at least 4.63:1 on surface-1 to surface-3), because some fills alone are below 3:1.

| Tier | Colour | Drum material (code-drawn through the ArtProvider) |
|---|---|---|
| Clay | #9C6B4A | matte fired terracotta |
| Bronze | #C27C3A | cast bronze, verdigris in the grooves |
| Silver | #C9D1DC | polished sterling |
| Jade | #2FBF71 | carved translucent jade, brass fittings |
| Gold | #EFE0B0 champagne (ΔE 12.3 from the primary button light, 17.8 from Legendary) | polished gold (ramp #FFF6DC / #EFE0B0 / #BCA45A / #6B5A2A: a narrow specular band over the champagne key, then a deep old-gold mid-tone and a dark shadow, so it reads as metal and not as ivory; key and mid-tone stay ≥ 12 from Legendary and every button gold, the mid-tone ≥ 12 from the UI parchment), lapis enamel (#2B4C9B) in the ring grooves; 1 crest |
| Platinum | #C4F2EA ice platinum | brushed platinum with streak highlights and a thin-film prismatic edge (ramp #F2FFFC / #C4F2EA / #A6D4CD / #7E9E99); 2 crests; the first summit gem |
| Aeon | #5D3DFF electric indigo (was violet #8B5CF6, ΔE 5 from Epic; now 13.2 from Epic and 13.1 from the nearest team blue) | faceted time crystal: a midnight body (#241C4A) with a drifting starfield, indigo facets (#3A2A9E, #5D3DFF), highlights #B8AAFF and white-gold filigree; 3 crests; the second summit gem |

| Step | Time | Visual | Audio | Input |
|---|---|---|---|---|
| 1. Arrival | 0-0.5 s | Capsule drops on a pedestal, squash bounce, dust ring | `cap_thud` | none |
| 2. Charge | 0.5-2.0 s | Shaking, cracks leak light in the current tier colour, 4 strike pips, "Tap on the beat!" (from 60%, left of the drum, until the first tap on a strike). Steps 1-2 show the start tier only; no text or aria label names a tier | `cap_riser` | none |
| 3. Strikes (4) | 0.8 s each, on a steady beat | The 4 main strikes climb at most to Gold (`summitAbove`): k = min(rolled tier, Gold) − start tier. The first 4 − k strikes never climb and the last k strikes always climb, so a climb is never followed by a non-climb (from Clay, Gold and up climb on all 4; a Supply Capsule from Bronze reaches Gold with one miss and 3 climbs). A climb brings a colour step, the next ring lit, a flash, +0.25 trauma and a lit pip; reaching Gold stamps its crest. A non-climb gives a small dust puff. **Timing (owner request 2026-09-29).** Each strike is one bar of four 200 ms beats: three rising count-in ticks (0, 200, 400 ms) while the hand lifts the hammer a notch per tick, a glint on the head on the third, a short pull back, a 100 ms swing and the hit on the fourth beat (600 ms), then the hammer rests on the drum (100-130 ms, so a Perfect tapped just after the hit still finds it there) and bounces up into the next count-in. A neutral warm-white ring closes on the hit point over the count-in and meets the target ring on the beat; three beads on it light with the ticks (never a tier colour). The strike lands on its beat whether or not the player taps. A tap is graded against the hit, latency-corrected by +30 ms: **Perfect ±60 ms, Good ±140 ms**; the first tap from 180 ms before the hit (after the third tick, so tapping along with the ticks keeps the strike for the beat) is the strike's one judged tap, a judged tap less than 150 ms after the previous tap is a miss (mashing cannot farm Perfects), and a reaction after the hit (≥ 170 ms) is outside the window. The centre moves later by half the device's audio output latency (at most +25 ms). Every tap on a blow gets a neutral tick on the timing ring (no text, no penalty). Perfect: a 110 ms hit-stop (effects creep at 12%), the head pinned on the drum, a white star and a local additive bloom at the hit point (no screen flash: that is a climb's), a short pulse of crack light that stays below a climb's and fades within about 250 ms, two rings at the hit point, 30 sparks, stars and shell chips, a camera punch, a haptic pulse [30, 20, 45] and a "Perfect!" pop high above the drum, clear of its silhouette and crest. Good: the same at about half (60 ms, a dimmer bloom, "Good!"). A grade never pops a pip, flashes the screen, flares the back rays or leaves the capsule looking more charged: those are a climb's signals. A miss or an early tap strikes normally: no penalty sound or text. Consecutive Perfects (summit strikes included) make a cosmetic combo: "×N" under the pop, a ring of stars, and the Perfect ring a step higher on a major scale. The grade is feel only: it never changes a tier, a climb, the contents or the timeline (tested), and the flourish is the same size on a climb and a non-climb, so it never reads as a result or a near miss | `cap_strike_tick` ×3 (+0, +2, +4 semitones), then `cap_climb_1..6` (the index of the tier reached: 1 Bronze … 4 Gold, 5 Platinum, 6 Aeon) or `cap_clunk` (never a penalty sound); on a graded tap `cap_strike_perfect` (anvil clang, low punch and a bright C7 bell ring, pitched up with the combo) or `cap_strike_good` | Tap on the beat (optional); the strike lands on its beat either way |
| 3b. Summit strikes (Platinum 1, Aeon 2) | 0.4 s rise + 1.02 s strike each | Only for a tier above Gold. The step after strike 4 starts at the same moment for every tier: the burst build for Gold and below, a summit gem rising out of the drum's cap for Platinum and Aeon. A summit gem is never drawn in advance and never drawn empty; it rises only when its strike will climb (Aeon's second rises after the first lands). The hammer is held up high and heats neutral white (never the next tier's colour); the same count-in as a strike (two notches up, the ring closing), a slow descent over the last beat (its last 60% at half speed), impact on the fourth beat (600 ms), a 120 ms hold, a shockwave, a top-down transmutation into the new material; the summit gem ignites in the new tier's colour and one more crest stamps. Graded like a strike (the flourish white-hot) | `cap_strike_tick` ×3, `cap_summit_rise`, then `cap_climb_5` / `cap_climb_6` with `upgrade_slam` at −6 dB | Tap on the hit (optional); it lands on its beat either way |
| 4. Burst | 0.3 s pop after a build of 200 / 260 / 360 / 560 / 820 / 1,000 / 1,200 ms (Clay … Aeon) | White flash, god-rays in the final colour, halves fly apart, Amber pours into the counter. Staging follows the tier already shown: Gold, sunlight god-rays and falling champagne gold leaf; Platinum, the room dims to 60%, a cold spotlight and prismatic glints, ice splinters and a frost ring; Aeon, the room dims to 35%, the drum lifts 12 px, the starfield spills behind it and the age glyphs of the content age list appear in a halo within 900 ms (stagger = 900 / ages), then star dust (≤ 160 sprites, Lite 80) | `cap_burst` plus a tier stinger (Clay to Gold: the final climb note; Platinum `cap_burst_platinum`; Aeon `cap_burst_aeon`); music ducks −6 dB for Platinum and Aeon | none |
| 4b. First of a tier | 1.0 s, its own step after the pop | Only the first Gold, Platinum and Aeon a save opens (`CapsuleReveal.firstOfTier`): the banner "Your first Aeon Capsule" over the settling debris | the stinger's tail | Skippable |
| 5. Cards | 0.15-0.8 s each | Cards fan out face down, rarest last. Each back glows in its rarity colour for 0.3 s (an honest pre-signal), then flips: Common 0.15 s (auto), Rare 0.4 s with a cyan shimmer, Epic 0.8 s with violet lightning. A foil adds a 0.5 s shine sweep (Holo 1 s). New cards get a "NEW" stamp and a silhouette-fill reveal. A NEW Epic gets a 2 s mini-walkout | `rarity_common/rare/epic`, `card_flip`, `foil_shine` | Tap flips faster; hold fast-forwards |
| 6. Legendary walkout | 8-10 s the first time, 3 s after | Screen dims to a spotlight, rings spin. Reveal order: a Legendary rarity flare, then a gold-rimmed silhouette growing from 20% to full size, then a bass drop as the unit bursts into colour and performs its signature move across a lane backdrop, then its victory pose, and last the age glyph and name banner. "LEGENDARY", confetti, "NEW!" or the duplicate bar | `walkout_bass`, `rarity_legendary` | Skippable after the first time that card is revealed, and always after the first full walkout of the same opening |
| 7. Duplicates | 0.5 s per card | Each stack flies into its copies bar, which fills with ticks ("3/4" → "UPGRADE READY" badge bounces) | `copy_tick`, `upgrade_ready` | none |
| 8. Summary | Until closed | Grid of everything, new items highlighted, Amber total, updated pity counters | none | Equip now (per new card), Upgrade (jumps to the best ready upgrade), Open next (N), Done |

Rules:

- Nothing runs longer than 10 s without a skip (except a first-ever Legendary walkout, capped at 10 s). The longest climb, an Aeon from Clay (strikes on the beat, tapped or not), reaches the pop in 9.6 s, all of it skippable and fast-forwardable; the skippable first-of-tier step follows it. `SHOW_LIMITS`: `strike` 800, `burst` 1,600, `summitRise` 400, `summitStrike` 1,100, `firstTier` 1,000.
- **Several Legendaries in one opening** (a single show or one Open all batch): rarest last; only the first NEW Legendary gets the full walkout (the only unskippable step); every other Legendary walkout is 3 s and skippable, even the first time that card is revealed. A plan test asserts at most one unskippable step per show and per batch.
- **Honest climb invariants** (tested for every start and final tier): a climb is never followed by a non-climb, summit strikes included; a summit gem appears only when the tier is above Gold; the climbs add up to the rolled climb count and the last tier shown is the rolled tier; rings, summit gems and crests are drawn only when earned, never as empty sockets or outlines. `CapsuleReveal.strikeClimbs` holds the 4 main strikes and `climbs` the total, so summit strikes = `climbs` − the main climbs. No coin cascades, reels, slot sounds or "jackpot" copy.
- **Hidden until opened** (A6.4, A9): before the show, a climbing capsule is drawn and named by its start tier and kind everywhere; no tray, shelf, Result, aria label or odds panel reveals its rolled tier, and nothing sorts by it. Fixed-tier capsules show their tier and crests.
- "Open all" shows the summary plus any Epic-or-better reveals. A batch holding a Platinum or Aeon ends its volley with that tier's stinger and a 600 ms flare, and a batch with first-of-tier capsules shows one combined banner for the highest first tier (all within 2 s).
- Rarity colours appear in UI only: Common #B8C0CC, Rare #22B8CF, Epic #A855F7, Legendary #F5B82E. Legendary units in the lane get a neutral white aura instead.
- **Quick reveal** (Settings, default Off, A15.6): when on, every capsule opens at step 4 (burst), as Trophy Road capsules do. Rarity pre-signals, walkouts and skips are unchanged; summit strikes are skipped, and the tier's crests, stinger and first-of-tier step stay.
- **Reduce motion:** rings, summit gems and crests fade in over 150 ms; no push, tilt or shake; at most 3 flashes a second at ≤ 20%. The drum's own white-out counts as a flash (capped at 20%, sharing the 3-a-second budget). The strike timing cue stays (the closing ring, the beads, the ticks and the hammer's notches); a graded hit adds no flash, shake, punch, smear or squash, its hit-stop is halved and "Perfect!" fades in without a pop.
- **Ring gems and crests on a phone:** each lit ring's gem face is its tier's key colour (no white core), so the rings read brown, bronze, silver, green, champagne on every drum. On a small stage crests and summit gems draw up to 1.5× larger, so a crest shield is at least 14 CSS px; a crest stamps after the strike's white-out has faded.
- **Capsule icon** (tray, road nodes, odds sheet, Result): from 32 px a mini drum with its lit ring ticks (1-5) in tier colours, 0-2 summit gems on the cap and, for Gold and up, 1-3 crest stars; below 32 px a flat drum in the tier colour with the parchment outline and a "★n" crest badge for Gold and up. Always with the name beside it; for an unopened climbing capsule, its start tier and kind name, with no crests.
- **Honesty lines** (A15.3): the first capsule and every odds panel say "The result was decided when you earned this capsule. Tapping only reveals it." Scripted capsules 1-5 are labelled "Starter Capsule · contents set to get you started" and their odds panel shows "Set contents".
- **Wardrobe Crate.** The crate uses the card-flip reveal (steps 4-5 with one skin card) everywhere. There is no reel, and players cannot switch one on (A15.3). `WardrobeReveal.reelTiles` may be empty.

## A11. Art direction and animation (code-drawn now, swappable later)

**Direction: ultra-realistic (owner decision 2026-09-28; A18.9.5).** The target look has realistic proportions and anatomy, physically based materials, realistic lighting and weighty, natural motion. It replaces the chunky cartoon cutout style below for every unit, turret, base and backdrop. The restyle runs age by age, Stone first, and new ages wait until Stone ships in the new style with a measured hours figure (A18.8.3). The readability rules in this section still apply at in-game size: a clear silhouette, team colour on large parts, an outline or rim light, the colour rule, the scale bands and the clip contract. No blood stays. Everything goes through the ArtProvider and the manifest, so the restyle never changes balance.

**Style of the built art (until the restyle): chunky cartoon cutout.**

- Flat fills, two-tone cel shading (shadow = fill darkened 18%) and one highlight shape per part.
- Outlines 3 px at 720p (about 3.7 lu) in the fill colour darkened 45% (not black).
- Rounded shapes, heads about a third of body height, short legs, oversized weapons that read the role (bow = ranged, big shield = heavy, polearm = reach).
- No blood: units pop into dust, KO stars and coins.

**Scale, authored in lu with one world scale:** infantry ~68 lu tall, heavies 100-120 lu, Legendaries 170-220 lu. Since A17 the world scale follows the device class (A17.7): infantry is about 62 px on an 844 × 390 phone and on a 1280 × 720 laptop, and 93 px at 1920 × 1080. Visual width stays within 1.4× the collision width.

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

Bronze, Industrial and Cosmic palettes are in A17.12 (on units the Cosmic cloth is #33264C and Bronze metal #B09C78/#7A6C54 to pass the colour rule).

**Split-age lane (signature visual).**

- Your half of the backdrop shows your age and the enemy's half shows theirs, blended over a 300 lu seam with 30% desaturation (A17.3; was 240 lu on the 1,200 lu lane).
- The seam sits at x = 1,000 and drifts toward the midpoint of the two front lines at ≤ 30 lu/s, clamped to x ∈ [700, 1,300], so it is not a moving blend directly behind every fight.
- On evolve, that side's half wipes to the new age from the base outward over 2.0 s.
- Backdrops have 3 parallax layers per age from seeded noise, scrolling at 0.05 (sky), 0.25 (silhouettes) and 0.55 (mid-ground) of the camera movement (A17.7):
  - sky gradient
  - silhouettes (mountains → temples → castles → windmills and masts → chimneys and viaducts → city → megastructures → planets and nebulae)
  - mid-ground
- The arena controls the ground and weather layer. Backdrops stay desaturated and low contrast.

**Bases.** Cave Hold, Ziggurat (Bronze), Keep, Star Fort, Foundry (Industrial), Bunker, Spire, Star Ark (Cosmic) (A17.12). Each has 4 turret mounts stacked vertically, crumble states at 75%, 50% and 25%, a visible Treasury level (from A18.5 the War Council workshop glyph with a progress ring) and a horn icon while Last Stand is armed. Base skins and decorations (A18.9.4) keep the mounts, size and crumble states.

**Research looks (A18.5.7).** v1: one badge per pick plus a class-coloured shimmer along affected units on completion (visual only). Later: per-age looks through the manifest (`research.<id>.<ageId>`, falling back to `research.<id>`). Art never changes numbers.

**Presentation names (A18.8.2).** Bronze is shown as "Bronze Age: Hellas", Gunpowder as "Age of Muskets", Industrial with Great War flavour (age card titles, flavour lines, VS lines, War Path region names, music titles). Strings and content only; ids unchanged.

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
| Research done (A18.5.7) | none | 0 | none | Shimmer along affected units, class badge pop, workshop glyph burst (visual only) | completion stinger |

**Camera moments (A17.4).** The own-evolve push-in (1.3×) runs only when the own base is in view; otherwise the banner and a minimap base flash (gold) replace it. As built, the push holds for the Ascension plus 1,400 ms so it stays in through the base's build-up, beat and assembly. A destroyed base always pans (500 ms) to the base and pushes in (1.45×). Pushes never show past the world ends. Culled units off-screen emit no particles (A17.7).

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
| Attacks | `swing_whoosh`, `shot_sling`, `shot_bow`, `shot_crossbow`, `shot_catapult`, `shot_musket`, `shot_lob`, `shot_cannon`, `shot_grapeshot`, `shot_rifle`, `shot_mg`, `shot_flak`, `shot_rocket`, `shot_rail`, `shot_laser`, `shot_arc`, `shot_plasma`, `bee_buzz`, `log_roll`, `cauldron_pour`, `toad_tongue`, `goose_honk`, `bomb_whistle`, `radio_call`, `emp_pulse`, `time_stop`, `gravity_hum`, `shot_javelin`, `shot_scorpion`, `stomp_colossus`, `mirror_beam`, `gorgon_gaze`, `shot_carbine`, `shot_harpoon`, `flare_pop`, `fuse_hiss`, `shot_gatling`, `tesla_zap`, `shot_ion`, `shot_void`, `shot_starburst`, `shot_tachyon`, `blink_warp`, `drone_launch` |
| Hits and deaths | `hit_blunt`, `hit_slash`, `hit_pierce`, `hit_bullet`, `hit_laser`, `hit_heavy`, `hit_effective`, `explosion_s`, `explosion_m`, `explosion_l`, `die_bio`, `die_mech`, `prop_drop`, `heal_tick`, `shield_up` |
| Turrets and bases | `turret_build`, `turret_sell`, `turret_upgrade`, `slot_buy`, `base_hit`, `base_crumble`, `base_destroyed` |
| Economy | `coin_gain` (pitch climbs on multi-kills; throttled to 1 per 40 ms), `xp_tick`, `treasury_up` |
| Evolve | `evolve_ready` (single soft chime), `evolve_riser`, `evolve_fanfare_stone/bronze/medieval/gunpowder/industrial/modern/future/cosmic`, `evolve_enemy` |
| Powers | `power_ready`, `power_telegraph`, `pw_stampede`, `pw_meteor`, `pw_arrows`, `pw_decree`, `pw_smoke`, `pw_broadside`, `pw_paratroop`, `pw_bomber`, `pw_lance`, `pw_nanite`, `pw_wave`, `pw_aegis`, `pw_iron_horse`, `pw_zeppelin`, `pw_starfall`, `pw_warp`; the power rework (A5.7; rendered by the audio tools): `pw_rockslide`, `pw_tar`, `pw_huntcry`, `pw_spear`, `pw_bolts`, `pw_gaze`, `pw_chariots`, `pw_apollo`, `pw_caltrops`, `pw_oil`, `pw_knights`, `pw_undermine`, `pw_volley`, `pw_nets`, `pw_horse_art`, `pw_sharpshooter`, `pw_gunline`, `pw_wire`, `pw_railgun`, `pw_hospital`, `pw_strafe`, `pw_flak`, `pw_tanks`, `pw_sniper`, `pw_pdg`, `pw_stasis`, `pw_drones`, `pw_emp`, `pw_singularity`, `pw_flare`, `pw_comet`, `pw_ion`, and the power cues `power_cast` (a cast committed, MR-70b), `power_lock` (a strike's telegraph) and `turret_jammed` (a mount silenced by Suppress) |
| Match | `last_stand_armed`, `last_stand_charge`, `last_stand_fire`, `overdrive_horn`, `siege_bell`, `victory_jingle`, `defeat_jingle` (gentle, not mocking), `emote_pop`, `alert_base` |
| Capsules | `cap_thud`, `cap_riser`, `cap_climb_1`, `cap_climb_2`, `cap_climb_3`, `cap_climb_4`, `cap_climb_5` (Platinum: a glass-bell partial), `cap_climb_6` (Aeon: richer and lower, a choir pad and a clock tick), `cap_summit_rise` (a summit gem rising out of the capsule's cap: stone grind and a rising glass chime, 400 ms), `cap_strike_tick` (the hammer's count-in: a dry woodblock and brass tick, pitched by the plan), `cap_strike_perfect` (a Perfect hit: anvil clang, low punch, a bright C7 bell ring; pitched up with the combo), `cap_strike_good` (a Good hit: a light knock and a G6 ring), `cap_clunk`, `cap_burst`, `cap_burst_platinum` (a struck glass-bell chord), `cap_burst_aeon` (a deep bell, a choir chord and a clock chime, 2 s star-glitter tail), `card_flip`, `foil_shine`, `rarity_common` (pluck), `rarity_rare` (two rising notes), `rarity_epic` (triad arpeggio plus shimmer), `rarity_legendary` (5-note fanfare, pad, sub drop), `walkout_bass`, `copy_tick`, `upgrade_ready`, `upgrade_slam`, `level_up`, `reel_tick` (kept as an ID but unused: there is no reel, A15.3) |
| MVP pass (2026-10-01, built) | UI (ui-plan 5.4, the War Path map): `ui_sheet`, `ui_pop`, `ui_whoosh`, `ui_stamp` (claims, equips), `card_lift`, `card_place`, `star_stamp` (pitched up a step per star by the caller), `path_draw`, `node_drop`, `region_open`, `ui_unlock`, `reward_fly`, `council_open`, `council_pick`, `vs_slam`, `sundial_claim`, `glyph_light`. Battle: `stance_charge` (war drums and a brass stab), `stance_hold` (shield clank), `stance_fallback` (a falling bugle; the enemy's stance plays 9 dB softer), `research_done` (the Council completion stinger), `alert_heavy` (an enemy Heavy enters, at most every 8 s), `hit_armor_crack` (layered on an Anti-heavy hit of ×2.5 or more on a Heavy), `brace_clank`, `thunder` (Thunderstorm lightning), `escalate_horn` (Last Base Standing steps 2+, the caller raises it 2, 4, 7, 9 semitones), `crumble_pulse` (the crumble beat). Energy forts (Future, Cosmic): `fort_build_energy`, `camp_warp`, `levy_warp`, `trap_blast_energy` |
| Stone wave (X0, 2026-10-03, built) | Attacks: `wolf_bite` (Hunting Wolves, Cave Pup), `shield_bash` (Hide Shield), `torch_jab` (Torch Runner), `horn_hook` (Woolly Rhino), `bear_swipe` (Cave Bear), `antler_sweep` (Elk Chieftain), `shot_bolas`, `shot_atlatl`, `shot_heave` (Boulder Hurler), `herb_puff` (Herbalist). Turrets: `quill_fan` (Quill Porcupine), `shot_sapling` (Sapling Sling). Powers: `pw_hail` (Pebble Hail), `pw_vines` (Tangle Vines) |
| Medieval wave (X0, 2026-10-03, built) | Attacks: `squire_jab` (Squires), `flail_smash` (Flailman), `dagger_stab` (Brigand), `greatsword_sweep` (Greatsword Knight), `hammer_clang` (Warhammer Sergeant), `whip_crack` (Kennel Master), `hound_bite` (War Hound), `drawbridge_slam` (Siege Belfry), `wyrm_breath` (Lindworm), `shot_windlass` (Crossbowman), `shot_longbow` (Yeoman Archer), `trumpet_toot` (Herald), `shot_mangonel` (Mangonel), `vial_toss` (Alchemist). Turrets: `shot_springald` (Springald), `crane_hook` (Grapple Crane). Powers: `pw_longbow` (Longbow Volley), `pw_bell` (Great Bell) |
| Gunpowder wave (X0, 2026-10-03, built) | Attacks: `claymore_chop` (Highlander), `scoop_swing` (Powder Monkey), `sabre_slash` (Hussar), `marshal_sweep` (Grand Marshal), `shot_blunderbuss` (Blunderbuss), `shot_dragoon` (Dragoon), `shot_coehorn` (Coehorn Crew), `shot_wallgun` (Wall Gunner), `drum_roll` (Drummer Boy), `pipe_drone` (Bagpiper), `mesmer_chime` (Mesmerist); the Voltigeurs reuse `shot_musket` and the Rocket Cart `shot_rocket`. Turrets: `shot_carronade` (Carronade), `shot_sea_mortar` (Sea Mortar). Powers: `pw_rockets` (Rocket Volley), `pw_salute` (Cannon Salute) |
| Industrial wave (X0, 2026-10-03, built) | Attacks: `pickaxe_clink` (Coal Miners), `mantlet_jab` (Iron Mantlet), `bike_skid` (Dispatch Rider), `plough_scoop` (Steam Tractor), `drill_spin` (Steam Driller), `key_whack` (Clockwork Tinker), `ice_axe_chop` (Alpine Climber), `toy_bayonet` (Clockwork Soldier), `shot_bowl` (Bomb Bowler), `shot_trench_mortar` (Trench Mortar), `cornet_blast` (Bandmaster, in F#), `car_mg` (Armoured Car), `coil_zap` (Spark Scientist), `train_gun` (Armoured Train's turret gun; its roof machine gun reuses `shot_gatling`). Turrets: `shot_rivet` (Rivet Spitter), `hammer_slam` (Steam Hammer). Powers: `pw_shrapnel` (Shrapnel Shells), `pw_magnet` (Great Magnet) |
| Modern wave (X0, 2026-10-03, built) | Attacks: `butt_stroke` (Commando), `sandbag_slam` (Sandbag Carrier), `shot_smg` (SMG Squad), `shot_rifle_grenade` (Rifle Grenadier), `shot_assault_gun` (Assault Gun), `shot_mortar_team` (Mortar Team), `sticky_thunk` (Sticky Bomber), `shot_pistol` (Combat Medic), `boxing_jab` (Bulldog Sergeant), `dive_whistle` (Dive Bomber), `dozer_shove` (Bulldozer), `shot_ghillie` (Ghillie Sniper), `bomb_stick` (Sky Fortress; its waist gunners reuse `shot_mg`). Turrets: `shot_at_gun` (Anti-Tank Gun), `rocket_ripple` (Rocket Battery). Powers: `pw_barrage` (Creeping Barrage), `pw_concussion` (Concussion Shells) |
| Future wave (X0, 2026-10-03, built) | Attacks: `baton_spin` (Android Pair), `shield_pulse` (Barrier Trooper), `lance_swipe` (Hover Bike), `shot_needle` (Needle Gunner), `pincer_snap` (Crab Mech), `shot_lobber` (Arc Lobber), `lance_crackle` (Plasma Lancer), `multitool_zap` (Overclock Engineer), `shot_holo` (Holo Projector), `shot_jet_beam` (Jetpack Trooper), `shot_particle` (Particle Cannon), `robot_punch` (Overload Android), `shot_pd_laser` (Drone Carrier), `holo_flicker` (Holo Decoy), `shot_drone` (Attack Drone). Turrets: `shot_cryo` (Cryo Pod), `tractor_hum` (Tractor Beam). Powers: `pw_painter` (Target Painter), `pw_nanomesh` (Nano Mesh) |
| Cosmic wave (X0, 2026-10-04, built) | Attacks: `crystal_slam` (Crystal Guard), `board_kick` (Void Skimmer), `moon_spit` (Moonlings and the Star Leviathan's riders), `nova_lob` (Nova Thrower), `golem_uppercut` (Asteroid Golem), `shot_star_mortar` (Star Mortar), `shot_antimatter` (Antimatter Rifler), `tendril_flick` (Bio-Weaver), `void_whisper` (Void Whisperer), `shot_twin_laser` (Star Fighter), `matron_spit` (Swarm Matron), `sage_orb` (Gravity Sage), `leviathan_song` (Star Leviathan), `swarm_bite` (Swarmling). Turrets: `shot_shard` (Shard Spitter), `horizon_pulse` (Event Horizon). Powers: `pw_drizzle` (Meteor Drizzle), `pw_pulsar` (Pulsar Pulse) |
| Bronze wave (X0, 2026-10-03, built) | Attacks: `kopis_hack` (Shield Bearer), `rhomphaia_cut` (Thracian Raider), `trunk_lash` (War Elephant), `sagaris_sweep` (Amazon Rider), `labrys_chop` (Minotaur), `hydra_bite` (Hydra), `horse_ram` (Wooden Horse; its riders keep `swing_whoosh`), `shot_discus` (Discus Thrower), `shot_belly_bow` (Belly Bowman), `aulos_note` (Aulos Piper, in D), `chorus_wail` (Tragic Chorus, D minor); the Slingers reuse `shot_sling` and the Cretan Archer `shot_bow`. Turrets: `net_cast` (Net Caster), `shot_polybolos` (Polybolos). Powers: `pw_sandstorm` (Sandstorm), `pw_whirlpool` (Charybdis) |

**Mixer:**

- Buses: master, music, sfx, ui.
- At most 4 voices per sound ID and a 40 ms minimum retrigger gap.
- Pitch ±8% and volume ±3 dB per play.
- Sounds caused by the player get priority.
- Music ducks 6 dB during powers, evolves and walkouts.
- The AudioContext is created or resumed on the first user gesture (iOS).
- `navigator.vibrate` fires on climbs and Legendaries (mobile, toggle, default Off; A15.6).
- **Panning and off-view fading (A17.7, not built yet).** World sounds pan by screen position (StereoPanner, pan = clamped offset from the screen centre × 0.6) and fade outside the view: −1 dB per 50 lu beyond the view edge, down to −12 dB. UI sounds, alerts, the player's own evolve, power impacts and hits on the own base are never faded.
- **Boot groups (A17.13, built).** UI, battle, Stone and Bronze render at boot; the other ages' ZzFX fallbacks render right after, and music cues stream one age ahead.
- **Planned sounds (A18).** Built in the MVP pass (the row above): the War Council's open, pick stamp and completion stinger, a cue per stance, and the War Path's node, star and region sounds. Still planned: a quiet loop under lingering field powers, and more variants for the War Path powers (one each today). The realistic restyle (A11) may move sounds toward recorded, less chiptune timbres through the manifest; ids stay.

**Music:**

- **Theme.** "Dawn March", our own 16-bar singable theme at 110 BPM, deliberately unlike "Glorious Morning". WP6 writes one melody as note data; the owner can ask for alternates in v1.1.
- **Engine.** A small step sequencer with synthesized instruments (oscillators, noise, simple envelopes and filters).
- **Arrangements:**

  | Arrangement | Instruments |
  |---|---|
  | Stone | drums, breathy square flute |
  | Bronze | plucked lyre, frame drum, reed pipe (square wave with vibrato) |
  | Medieval | plucked lute, horn |
  | Gunpowder | fife, snare march |
  | Industrial | brass band (tuba bass, cornet lead), anvil and piston percussion |
  | Modern | brass stabs, synth bass |
  | Future | arpeggiated synths, sidechain pump |
  | Cosmic | choir pad (formant-filtered saw), deep sub pulse, bell arpeggios |
  | Menu | slow version |
  | Capsule room | loop |

  Plus victory and defeat stingers on the motif.
- **Layers:**
  - base loop
  - intensity layer, driven by a view-side estimate from nearby damage and deaths (decays 0.2/s)
  - Overdrive layer (+8 BPM feel, double-time percussion)
  - Siege heartbeat bass
- **Key changes.** Own evolves transpose the music by +2, +2, +1, +1, +1, +1, +1 semitones in turn (+9 total at Cosmic, A17), so every evolve gets a lift. Once the total passes +6 the lead drops one octave so the register stays comfortable.
- Any `musicCueId` can later point to a composed file through the manifest.

## A14. ID appendix

### A14.1 Visual and effect IDs

- **Cards:** `unit.<slug>` for the 56 units plus `unit.training_dummy`; `turret.<slug>` for the 32 turrets; `power.<slug>` for the 16 powers (HUD icon and cast root); 48 with the power rework (A5.7).
- **Skins:** `<target visualId>@<skin slug>`, for example `unit.bonker@pumpkin_head` and `base.future@crystal_spire`.
- **World:** `base.<age>` (8), `backdrop.<age>` (8), `ground.<arena>` for tar_pits, frostfang, kingsmoat, powder_bay, iron_front, neon_harbor, orbital_ring, chrono_rift.
- **Projectiles:** `proj.rock`, `proj.boulder`, `proj.bee`, `proj.log`, `proj.arrow`, `proj.bolt`, `proj.goose`, `proj.musket`, `proj.lob`, `proj.cannonball`, `proj.grapeshot`, `proj.rocket`, `proj.chainshot`, `proj.bomb`, `proj.bullet`, `proj.shell`, `proj.flak`, `proj.plasma`, `proj.plasma_mortar`, `proj.gravity_orb`, `proj.javelin`, `proj.scorpion_bolt`, `proj.harpoon`, `proj.flare`, `proj.ion`, `proj.starburst`, `proj.star_shard`.
- **Instant and attack effects:** `fx.beam_laser`, `fx.beam_rail`, `fx.arc_chain`, `fx.tongue`, `fx.pitch_pour`, `fx.heal_beam`, `fx.sun_beam`, `fx.gorgon_gaze`, `fx.tesla_arc`, `fx.beam_void`, `fx.beam_ion`, `fx.beam_tachyon`.
- **Hit and death effects:** `fx.spark_blunt`, `fx.spark_slash`, `fx.spark_pierce`, `fx.spark_bullet`, `fx.scorch_laser`, `fx.blast`, `fx.spark_effective`, `fx.puff_resisted`, `fx.muzzle`, `fx.trail`, `fx.splash_ring`, `fx.explosion_s`, `fx.explosion_m`, `fx.explosion_l`, `fx.dust_poof`, `fx.ko_stars`, `fx.coin`, `fx.xp_sparkle`, `fx.debris`.
- **Status and ability effects:** `fx.heal_glyph`, `fx.shield_bubble`, `fx.mark_reticle`, `fx.gravity_swirl`, `fx.smoke_cloud`, `fx.emp_ring`, `fx.time_ripple`, `fx.roar_ring`, `fx.call_marker`, `fx.dizzy`, `fx.legendary_aura`, `fx.stomp_ring`, `fx.fuse_spark`, `fx.beacon_ring`, `fx.blink`.
- **Power effects:** `fx.telegraph_zone`, `fx.aurochs`, `fx.meteor`, `fx.arrow_rain`, `fx.decree_glow`, `fx.cannonball_rain`, `fx.plane_bomber`, `fx.parachute`, `fx.orbital_beam`, `fx.nanite_swarm`, `fx.tidal_wave`, `fx.aegis_glow`, `fx.iron_horse`, `fx.zeppelin`, `fx.star_shard_rain`, `fx.warp_portal`. The power rework (A5.7): `fx.rockslide`, `fx.sticky_tar`, `fx.hunt_cry`, `fx.spear_throw`, `fx.lightning_bolt`, `fx.medusa_gaze`, `fx.chariot_rush`, `fx.golden_arrow`, `fx.caltrops`, `fx.boiling_oil`, `fx.knights_charge`, `fx.undermine`, `fx.volley_fire`, `fx.boarding_nets`, `fx.horse_artillery`, `fx.sharpshot`, `fx.gun_line`, `fx.barbed_wire`, `fx.railway_shell`, `fx.field_hospital`, `fx.strafing_run`, `fx.flak_burst`, `fx.tank_rush`, `fx.sniper_trace`, `fx.point_defense`, `fx.stasis_dome`, `fx.drone_swarm`, `fx.emp_blackout`, `fx.singularity`, `fx.solar_flare`, `fx.comet_run`, `fx.ion_cannon`; the shared `fx.field_zone`, `fx.target_lock`, `fx.turret_jammed`, `fx.power_cast_cue`; their parts `fx.tele_shadow`, `fx.tele_rumble`, `fx.tele_glint`, `fx.tele_gather`, `fx.tele_rally`, `fx.tele_sap`, `fx.tele_charge`, `fx.tele_flak` (telegraph decorations), `fx.storm_cloud`, `fx.dirt_blast`, `fx.plasma_pop`, `fx.drone_cloud` and `fx.jammed_rubble`. The reach band and target pip ids are still planned in A14.4.
- **Match effects:** `fx.evolve_pillar`, `fx.last_stand_wave`, `fx.overdrive_frame`, `fx.siege_vignette`.
- **MVP pass effects (2026-10-01, built):** `fx.stance_charge`, `fx.stance_hold`, `fx.stance_fallback` (on a side's 8 frontmost units, 6 for the enemy), `fx.status_slow` and `fx.status_snare` (on the unit for as long as the status lasts), `fx.brace_plant`, `fx.research_done` (Defences, Economy and Command picks, at the base), `fx.levy_marker` (a team pennant over every levy).
- **Stone wave effects (X0, 2026-10-03, built):** `fx.pebble_hail` (pebbles drop on each unit Pebble Hail screens, from the `power.fx.<id>.hit` rule) with its `fx.pebble_pop` landing, and `fx.tangle_vines` (a root bed and thorny tendrils for the field's 4 s).
- **Medieval wave effects (X0, 2026-10-03, built):** `fx.longbow_volley` (long arrows drop on each unit the volley screens, from the `power.fx.<id>.hit` rule) with its `fx.arrow_thud` landing, `fx.great_bell` (rings of sound and notes over the stun zone), the instant attacks `fx.lindworm_breath` (green marsh fire) and `fx.grapple_hook` (rope and hook), and the projectiles `proj.longarrow`, `proj.note`, `proj.vial` and `proj.spear_bolt`.
- **Gunpowder wave effects (X0, 2026-10-03, built):** `fx.rocket_volley` (war rockets streak down on each unit the volley screens, from the `power.fx.<id>.hit` rule) with its `fx.rocket_pop` landing, `fx.cannon_salute` (a ring of saluting guns: shock rings and rolling white smoke over the stun zone), the instant attacks `fx.blunderbuss_spray` (a cone of shot), `fx.drum_boom`, `fx.pipe_drone` and `fx.mesmer_spiral`, and the projectile `proj.mortar_shell` (the Coehorn Crew's lit shell on its high arc). The Rocket Cart's volley of 4 lands spread by its `scatter` (±40 lu, seeded; SIM_VERSION 7.2.0).
- **Industrial wave effects (X0, 2026-10-03, built):** `fx.shrapnel_shells` (a shell whistles down over each unit the volley screens, from the `power.fx.<id>.hit` rule) with its `fx.shrapnel_burst` air burst, `fx.great_magnet` (a giant horseshoe magnet swings down over the pull zone, sparks and filings streaming in), the instant attacks `fx.coil_arc` (the Spark Scientist's lilac arc that jumps to a second foe) and `fx.hammer_shock` (the Steam Hammer's ground shock at its gate), and the projectiles `proj.bowl_bomb` (the Bomb Bowler's banded bomb, fuse sparking) and `proj.rivet` (the Rivet Spitter's hot rivet). Medallions `power.shrapnel_shells` and `power.great_magnet`.
- **Modern wave effects (X0, 2026-10-03, built):** `fx.creeping_barrage` (a shell screams down onto each unit the volley screens, from the `power.fx.<id>.hit` rule) with its `fx.barrage_burst` ground burst, `fx.concussion_shells` (three shock rings and grey smoke over the stun zone; the stunned units wobble under the dizzy status) and the projectile `proj.rifle_grenade` (the finned rifle grenade, a short smoky arc). Medallions `power.creeping_barrage` and `power.concussion_shells`.
- **Future wave effects (X0, 2026-10-03, built):** `fx.zap_beam` (the Overclock Engineer's short crackling multitool arc), `fx.particle_beam` (the Particle Cannon's thick white-mint lance with a bloom at the muzzle), `fx.tractor_beam` (the Tractor Beam's pull ray, a lingering mint beam with drifting nanites), `fx.target_paint` (Target Painter: a spotter drone sweeps a scan line over the zone and reticles lock on) and `fx.nano_mesh` (Nano Mesh: a hex dome and glittering nanite threads over the snare zone; it catches fliers too), and the projectiles `proj.needle` (a mint flechette streak), `proj.arc_shell` (a glowing canister on the high arc) and `proj.frost` (the Cryo Pod's frost orb shedding flakes). Medallions `power.target_painter` and `power.nano_mesh`.
- **Cosmic wave effects (X0, 2026-10-04, built):** instant `fx.tendril_lash` (the Bio-Weaver's living tendril whip), `fx.void_ripple` (the Void Whisperer's violet ripple), `fx.song_wave` (the Star Leviathan's sonic cone of rings and notes) and `fx.horizon_pulse` (the Event Horizon's inward-collapsing violet ring); the projectiles `proj.moon_pellet` (a glowing moon-grey pellet), `proj.nova_orb` (a mint nova orb on the lob), `proj.mini_star` (the Star Mortar's tiny star on the high arc), `proj.antimatter` (a dark core with a violet halo), `proj.twin_laser` (two short mint bolts), `proj.swarm_glob` (a lilac glob), `proj.sage_orb` (a small gravity orb) and `proj.shard` (a lilac crystal shard); `fx.meteor_drizzle` (a small meteor falls on each unit the volley screens, from the `power.fx.<id>.hit` rule) with its `fx.meteor_pop` landing, and `fx.pulsar_pulse` (a pulsar beam sweeps the zone and it flashes violet). Medallions `power.meteor_drizzle` and `power.pulsar_pulse`.
- **Bronze wave effects (X0, 2026-10-03, built):** projectiles `proj.discus` (a spinning bronze discus), `proj.net` (a weighted net) and `proj.arrow_arc` (the arrow with a longer trail for the Cretan Archer's high arc); instant `fx.note_pop` (a mint note ribbon and floating notes) and `fx.wail_ring` (lilac rings and a soft beam); power effects `fx.sandstorm` (a pale sand wall rolling down the whole lane with grit streaks, on the power's first impact) and `fx.whirlpool` (a churning ring of water and foam over `fx.field_zone` for Charybdis's 4 s); icons `power.sandstorm`, `power.charybdis`. The Dread aura's slow shows through the existing slow status mark on each victim (the aura re-emits it on the heal-grid pulse).
- **UI icons:** `icon.role.<group>`, `icon.age.<age>`, `icon.horn`, `icon.chevron`, `icon.base_alert`, `icon.follow`, `trim.bronze`, `trim.silver`, `trim.gold`, `foil.bronze`, `foil.silver`, `foil.holo`.

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

The 33 cards of Bronze, Industrial and Cosmic are mapped in A17.12 ("Attack mapping").

### A14.3 Music cues

`music.menu`, `music.capsule`, `music.stone`, `music.bronze`, `music.medieval`, `music.gunpowder`, `music.industrial`, `music.modern`, `music.future`, `music.cosmic`, `stinger.victory`, `stinger.defeat`. Layers: `intensity`, `overdrive`, `siege`.

### A14.4 Planned ids (A18, not in the manifest yet)

These id families join A14.1, A13 and A14.3 when their A18 phase is built, so the integrity test (B13) keeps checking only ids that exist:

- **Research:** `research.<pickId>` (badge and shimmer), later `research.<pickId>.<ageId>`; a workshop glyph on the base; an icon per track.
- **Stances:** icons for Charge, Hold and Fall back and the Hold flag.
- **Classes:** icons for Air, Underground and Fort beside `icon.role.<group>` (A18.9.1).
- **War Path:** region maps per age, node, star and crown art, portraits and VS art for the new Generals; level ids `wp.<ageId>.l01` to `l10` and `wp.<ageId>.s1`, `s2` are content ids, stable forever.
- **Cosmetics:** `cosmetic.<collection>.<id>` for quotes, base flags, national flags, base skins and base decorations (A18.9.4).
- **New ages (A18.8):** for `nile`, `rome`, `norse`, `shogun` and `renaissance`: the base, backdrop, age icon, music cue, evolve fanfare and card ids, as A17.12 set the pattern.
- **Anti-heavy, Long range and lane powers (owner feedback 2026-09-29 and 2026-09-30):** the Anti-heavy class glyph replaces the Anti-armor one under `icon.role.antiArmor` (id unchanged); `unit.<slug>` with idle, walk, attack, hit and death clips, portraits and card art for the 8 Long range cards (A5.1) and their arc projectiles `proj.dart_arc`, `proj.arrow_arc`, `proj.mortar_shell`, `proj.plasma_lob`, `proj.star_lob`, plus the shared `fx.arc_landing_marker` (a ground ring that closes over the flight time); sounds `shot_arc_bow`, `shot_mortar`, `shell_whistle`; `power.<slug>` and the effect and sound ids of the 8 lane powers (A5.7) and `icon.reach.lane`. Cartoon style (A18.9.5), reviewed with Playwright at 844 × 390 and 1280 × 720.
- **Power rework (A2.9, A5.7):** `power.<slug>` for the 32 new powers and their `pw_*` sounds joined A14.1 and A13 with the P1 content (placeholder medallions and ZzFX); their effect ids (A5.7) and the shared `fx.field_zone`, `fx.target_lock`, `fx.turret_jammed` and `fx.power_cast_cue` joined A14.1 with P3/P4, and the sounds `power_cast`, `power_lock` and `turret_jammed` joined A13; still planned: `fx.reach_band` and `fx.target_pip` (drawn by the render overlay today).

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
| Session (15-40 min) | 3-6 matches, open capsules, upgrade | Bounded variable reward, goal gradient, autonomy (3.4, 3.7) | A6; wrap, tilt and break cards (A15.6) | Wrap card when the Sundial runs empty or after 30 min; break card at 60 min | The Sundial (capsule charges until 2026-09-30) |
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
   | Under each bank | "Holds up to N. When full, it stops filling." (the Sundial 34, Daily rewards 7; the Supply 7 until 2026-09-30) |
   | Sundial card (Capsules tab only) | "3 of 34 ready" and "Next one at 17:40" (the local clock time of the next capsule; never a running countdown); when full, "Full: it has stopped filling." Rule: "Every 5 hours the Sundial readies a capsule. Finish any battle to claim it, win or lose." |
   | Quest panel | "New quests arrive each day. Up to 21 can wait for you." |
   | Settings > About, For parents, Home help | "Nothing you have earned is ever taken away." |
   | Echo of You (Skirmish) | "AI · Echo of You: an AI playing your War Plan" |

3. "Nothing expires" appears only where it is literally true: owned items, currencies, pending capsules and crates, War Chest progress and found feats.
4. **Forbidden copy:** "Nothing is lost while you're away" and "Everything waits for you" (both false once a bank is full), "we missed you", "last chance", and any countdown to a reward. The Sundial's "Next one at 17:40" on the Capsules tab is a clock time, not a countdown: it does not tick, has no seconds and never appears on Home, the Result or in a notification.
5. `docs/decisions.md` records engagement rule 10 (fairness is the only tuning target).

### A15.4 Banks, the Sundial and the walk-away rule (v1)

| | |
|---|---|
| Class | Grey: clock refill rates and random capsules for players who may be minors. Safeguards: every reward needs play (a finished match, never a login or a Retreat); banks hold 7 days; the copy says when a bank is full; no countdown anywhere and no timer on Home (the Capsules tab shows a clock time); no notifications; capsule odds, pity and crafting as A6.4-A6.6 |
| Levers | Banked appointment (3.17) without pressure; goal gradient (3.7) |
| Size, phase, owners | S · Phase 2b · WP1 (numbers), WP7 (rules), WP8 (schema limits), WP9 (tray, quest panel). The Sundial (2026-09-30): M · WP1, WP7, WP8 (v10), WP9, WP11, WP12; spec in `docs/decisions.md` |
| From | PE 2.1, 2.4, 2.13, 1.1, 0.5; BS 2.9; law 4.4 (items D1-D4), P-2; psychology 9.3; owner request 2026-09-29 (the Sundial) |

The old Daily Capsule was the only reward in the game that needed no play: a random reward for opening the app on a calendar day, which is both the "login bonus" and the "variable reward for minors" the KIDS Act proposal is reported to target. It became the Supply Capsule. On 2026-09-29 the owner asked for "a free capsule every 5 hours" ("kom tilbage hver 5 time for at åbne en gratis kapsel"). Its healthy form is **the Sundial** (2026-09-30), which replaces both capsule charges and the Supply allowance: one clock, one bank, and every capsule it gives needs a finished match.

| Bank | Before | Now |
|---|---|---|
| Capsule charges, now **the Sundial** | +1 charge per 6 h, holds 12, then 28 (7 days); a Ladder win used one for a Win Capsule | One capsule ready every **5 h**, holds **34** (7 days 2 hours). Any finished match but the tutorial or a Retreat claims one, win or lose: a Sundial Capsule from the bag (A6.4). A new save starts with 12 ready |
| Daily Capsule, then **Supply Capsule** | 1 per day for opening the game, holds 3; then an allowance +1 per day, holds 7, and every 3rd finished match turned one into a Supply Capsule | **Retired**: no new allowance. One banked before 2026-09-30 still turns into a Supply Capsule on every 3rd finished match. The one-time capsule after capsule 2 stays (A8) |
| Clay meter | 3 pips (losses, draws, wins without a charge) | **2 pips**, from every Ladder match that brings no capsule |
| Daily quests | 3 a day, up to 6 unclaimed | 3 a day join a queue of up to **21**; the first 3 are active, the rest wait unseen |
| Daily Challenge reward | The first win of the day only | A bank of Daily rewards, +1 a day, holds **7** (A15.7) |

**Rules**

- **The Sundial** (A6.3 has the rule text and data).
  - The clock: +1 ready capsule every 5 h (18,000,000 ms) from `chargesUpdatedAt`, continuous and integer; epoch time, so time zones, 04:00 and daylight saving never move it. Full at 34: it stops filling and says so; when a capsule is claimed from a full Sundial, the next one takes a full 5 h (as charges did).
  - Claiming: when a finished match's result is applied, the Sundial is brought up to that moment, then one ready capsule becomes a pending Sundial Capsule, rolled at once (A6.4). A match that started before the capsule was ready but finished after claims it. One match claims at most one. Free capsules (the first 10 of a save) are used first.
  - What counts: a finished match in any mode except the tutorial (Ladder, Daily Challenge, War Path, Quick Battle, Skirmish). A Retreat claims nothing and adds no Clay pip (it is still a loss for trophies, MMR and the 15 loss Amber), so opening a match and leaving at once never pays a capsule; a void match changes nothing (A6.3).
  - Why 34 and not a small cap: a bank of 2 or 3 (the genre's free chest) fills in 10-15 hours and then stops, so it rewards coming back on a timer and quietly costs the player who does not. That is the appointment pressure A15.1 rule 3 and the walk-away test forbid (A15.22). 34 is the smallest whole number of 5-hour steps that holds 7 days (34 × 5 h = 170 h).
  - Why it replaces charges instead of adding to them: a separate capsule every 5 h that one match can claim is 4.8 capsules a day for an engaged player, about a third of today's income even at Clay. Measured (the `tools/economy.ts` player, 100 seeds): a Clay-only extra capsule funded by retiring the Supply Capsule and slowing charges to 8 h left copies per day at −4%, but moved Rare to max +46%, Epic +36% and Common −11%, because Clay is nearly all Commons; added on top it made cards 7-33% faster (Common and Legendary about a third). Only a capsule from the same bag keeps the rarity mix, and at one per 5 h that is the charge budget itself.
  - Why any match, not only a win: keeping charges for Ladder wins at 5 h and retiring the Supply Capsule is neutral for the engaged player but costs a player of 3 matches a day 28% of their copies (the Supply Capsule was theirs). Claiming by any finished match gives that player +3.6% copies (and faster Epics and Legendaries, A6.9) and makes the owner's "free capsule" literally one played match away. Wins keep their own rewards: trophies, more Amber (20, or 40 when no capsule was claimed), War Chest progress, quests and the peak rank.
  - Showing it: the Capsules tab has the Sundial card (dial, "3 of 34 ready", "Next one at 17:40" as a local clock time, the weekday in the game's language; "Full: it has stopped filling." when full, with the cap line "Holds up to 34. When full, it stops filling." in the info panel). Home has only the Sundial glyph, in colour while a capsule is ready and grey when none is: no number, no time, no count of anything waiting, no glow and no motion loop (a "34/34" would read as a backlog and a pull cue). No notification of any kind (red line 4).
- **Supply Capsule (retired 2026-09-30).**
  - Odds as A6.4: Bronze 78%, Silver 15%, Jade 5%, Gold 1.5%, Platinum 0.35%, Aeon 0.15% (until 2026-09-29 the old Daily Capsule's Bronze 78%, Silver 15%, Jade 5%, Aeon 2%); the climb starts at Bronze.
  - No new allowance accrues (content `supply.accrues: false`). An allowance banked before the change keeps its promise: the 3rd, 6th, 9th … finished match (`matchesPlayed`, any mode but the tutorial, a Retreat included) turns one into a Supply Capsule until the bank is empty. The Capsules tab shows "Supply allowance left: 2 · next in 1 match" only while one is banked.
  - The first capsule right after capsule 2 is opened stays (kind `daily`, scripted capsule 3), so the A8 beat at about 10:00 is unchanged.
- **Quest queue.**
  - At 04:00, 3 new quests join the back of the queue, up to 21. Only the first 3 are active and progress.
  - A claimed quest leaves the queue and the next one becomes active. The free daily reroll replaces one active quest.
  - The quest panel never shows the queue length (A15.13).
- **Quest weights.** Quests that pay only for activity (Play 3 battles, Train 30 units, Upgrade 2 cards) have weight 1. Skill and variety quests have weight 2 (psychology finding 14: informative goals beat bribes).
- **Why 34 is safe.** The Sundial never decays, so there is no reason to empty it in one sitting. Claiming 34 takes 34 finished matches, several hours of play; the wrap and break cards (A15.6) cover long sessions.
- **Walk-away rule (tested, A15.20).**
  - A save left alone for 30 days loses nothing it owns: currencies, cards, pending capsules and crates, War Chest progress and found feats are unchanged, and each bank sits at its cap.
  - A player who plays the same matches once a week earns within about 15% of one who spreads them over 7 days. `sim:economy` reports this; it is a design target, not a player-facing promise. With the Sundial a weekly player who returns to 34 ready capsules claims all of them over the week's matches.
- **Economy** (measured on the built code 2026-09-30, details in A6.9 and `docs/decisions.md`). Same player before and after (7 finished ladder matches a day, 60% wins, 200 seeds): time to max Common +0.4%, Rare +3.5%, Epic −2.3%, Legendary −3.6%; copies a day −2.9%, Amber −1.5%; whole collection 188.5 → 195 days (+3.4%). That is slightly past the "about 3%" target on Rare, Legendary and the collection, and it is accepted: the shift is the rarity mix (bag capsules replace the Bronze-heavy Supply Capsule), so Rare and Legendary move in opposite directions and no income lever brings both closer. A player of 3 matches a day (730-day run, 50 seeds): copies +3.6%, Common −2.3%, Rare −6.3%, Epic −11.8%, Legendary −12.6% (faster), whole collection 357.5 → 369 days (+3.2%); the Sundial favours the casual player on purpose (the Supply Capsule was theirs). Weekly players earn within 1% of daily ones (28-day test). The bag, its odds and `tools/drops.ts` are unchanged (smoke run: 17 of 17 checks pass).

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
| Wrap | Once per session: the Result of the match that claimed the Sundial's last ready capsule, or the first Result after 30 min of active play with at least 3 finished matches | 1. Summary: "3 wins · 1 loss · Pikeman reached L6 · 2 new cards". 2. Best moment: the win with the lowest own base HP, or a feat found, with Watch. 3. Only when the Sundial ran empty: "The Sundial is empty. Ladder battles still pay Amber and a Clay pip." 4. One forward line with no number or clock: "Next on your road: Kingsmoat banner." | Home (primary), Next battle |
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
  - The Daily changes no trophies or MMR. A finished Daily match claims a ready Sundial Capsule like any match (A6.3).
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

| Format | Win trophies | Win Amber (without a Sundial Capsule) | Loss |
|---|---|---|---|
| Short War | +26 | 20 (40) | −20 |
| Standard War | +31 | 27 (54) | −20 |
| Full War | +36 | 35 (70) | −20 |
| Last Base Standing (A2.10.1) | 0 (unranked) | 35 (70) | 0 |

Last Base Standing is unranked because its length varies, so trophies per minute could not be equal. Retreat counts as a loss, so a long war must never be the price of keeping your trophies. And it would split the ranked online queue. It pays the Full War's Amber per win and nothing per minute, so it pays less per minute than the Full War.

These are the A17 values (built; re-derived from the A17.2 medians at a 60% win rate: 1.60 / 1.63 / 1.60 trophies per minute). The Amber in brackets doubles the win Amber as before. A18's longer formats (A18.3.4) re-derive the table from the A18.12 medians with the same ±5% rule.

- The table applies from 400 trophies (Arena 3, where every format is open). Below 400, every format pays +30 and 20 (40) Amber, as A6.3 does today, so onboarding is not slowed.
- Loss rules (0 below 400, never below the arena gate), MMR, capsules and the Sundial are unchanged.
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
- **Home:** the War Chest bar replaces the weekly quest line, and Supply progress lives inside the capsule tray. There is no other new widget in v1, with one exception the owner asked for (2026-09-30, a calm "ready" badge): the Sundial glyph in the top bar, in colour while a capsule is ready and grey when none is. It shows no number, count, time, glow or motion, and it opens the Capsules tab. (Home had no charges counter before it, so it is an addition, not a swap.)
- **No backlog counts.** Counts of things ready to open ("Open (3)") are fine. Counts of things not yet done ("Unfinished maps (7)", "Dailies (5)", the quest queue) are not.
- **No timers on Home.** The Sundial glyph shows no number and no time. "12 of 34 ready", the rule "one every 5 hours" and the clock time of the next one sit in the Capsules tab only.
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
- Retries are free: no trophies or MMR, as in Conquest (a finished retry claims a ready Sundial Capsule like any match, A6.3).
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

- `capsules.charges`: bank maximum 28 (from 2026-09-30 the Sundial's ready capsules, maximum 34, A6.3).
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
- Capsule and economy rules: `chargesMax` 28; `supply` with `matchesPerCapsule` 3 and `allowanceMax` 7, replacing the Daily Capsule's bank of 3. (2026-09-30: charges max 34 and `regenMs` 5 h as the Sundial, `supply.accrues` false, `clayMeterPips` 2; A6.3.)
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

45. The first Supply Capsule appears after capsule 2; from 2026-09-30 no new allowance accrues and an allowance already banked still needs 3 finished matches; the Sundial holds 34 (was: the allowance banks 7, charges bank 28). The quest panel shows 3 quests.
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
- Play-accrued banks: +1 Sundial capsule per 2 finished matches instead of per 5 h, and +1 Daily reward per 3 finished matches instead of per day.

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

**Status (v1.3).** Measured on the 2,000 lu lane with A17 step 1. Adopted and built: L4 (a three-wide front), the siege crowd, and the falling gate in Overdrive and Siege; the open gate is built but off. L3, L5 and L6 were measured and not built (`docs/decisions.md`, "A17 step 1"; A17.3). A18 adds longer clocks, the War Council and a stronger AI as the next answers to stalls, and the Supply Cache if standoffs remain (A18.3.5).

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
| Trenches | Each side's approach, own p 1,300-1,400 on the 2,000 lu lane (just outside the enemy turret cover, which starts at own p 1,520; A17.3; was 600-700 on the 1,200 lu lane) | Your ground units in your trench take −20% damage from attackers with tag `ranged` | A staging area for a wave; only the side winning mid-lane can use it |
| Bridge | Central, x 560-640 | Front width 1 on the span: armies meet in single file, so splash and pierce shine | **Measured before any art:** its Bell rows must stay within +5 points of the flat field. If not, it becomes a **Causeway**: ground units on x 520-680 move +15%, which speeds pushes through the middle |
| Ford | Central, x 520-680 | Ground units inside move −25%; air is unaffected | Same measurement. If it fails, the feature is dropped and the arena gets a Ridge |

Features never change bases, turret rules, spawns, powers or Last Stand. The old "Cover" on each side's own half is not built.

**Weather.** A battlefield lists 0-4 kinds. When the list is not empty, a match draws its fronts from its seed: 0 fronts 30%, 1 front 50%, 2 fronts 20%. Each front lasts 40 s, starts on a 5 s grid between 1:00 and 40 s before Overdrive, and two fronts start at least 60 s apart.

| Weather | Effect |
|---|---|
| Rain | Units with tag `ranged` and turrets deal −15% damage; ground units move −10% |
| Fog | Units with tag `ranged`, turrets and field towers (A16.14) have −35% range: a public push window against turtles |
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

**Relation to the War Council (A18.5.6).** Doctrines stay the free pick at evolve. A doctrine may not duplicate a research pick, and both obey the A18.2 stacking caps. With the War Path they are taught at Medieval L1 and scheduled with A18.13 phase 7.

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
| Zealots | Age Power charge +25% (power rework: power reloads run 25% faster, A2.9.3) | Unit damage −5% | The enemy banks for waves (power rework: bunching no longer matters, the cap and the screen do, A2.9.5) |
| Supply Lines | Passive gold +1 per second | Pop cap −6 | Early in the age, before armies fill up |
| Drill | Units +8% attack speed | Unit cost +10% gold | Few, strong units; cut if it fails the pick-flip gate |
| Breakers | Damage to bases +20% | Damage to units −5% | The enemy turtles, or Siege is near |

**Cut from the proposal:** Plunder (the bounty dial, a turtle income engine), Engineers (a second turtle doctrine), Swarm and Veterans (fake train-time costs), Loose Order, Field Medics and Siegecraft (new effect kinds).

**Gates:**

- each doctrine within ±5 points in mirrored runs;
- **pick-flip:** across sampled lane states, each offered pair's better pick must flip in at least 30% of states; a pair that never flips is not a decision and is removed from the draw;
- `sim:combos` with doctrines, battlefields and weather together.

### A16.11 Power ring overflow (v1.1 experiment)

**Superseded by the power rework (A2.9, 2026-09-29).** There is no charge meter left to overflow: every cast costs gold and each slot reloads, and the target cap makes waiting for a bigger clump worthless. The three adoption gates below became A2.9.12 rows (`power_hoarder` at the Bell ≤ 20%; `bait_wave` beats `plain_wave` by ≥ 5 points). The text is kept as history.

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

### A16.14 Fortifications: the Fort class (walls, towers, camps, traps; A18.13 phase 6)

**Rescheduled by A18.9 (owner direction: a stationary class, early) and widened by the owner request of 2026-09-29 (walls, a camp that spawns free weak troops, towers that shoot but stand still).** The Fort card type ships as A18.13 phase 6, right after the War Path, with the rules in A16.14.1-A16.14.9 below: four kinds (Wall, Tower, Camp, Trap), 1 Fort slot in each age loadout beside its 6 units, placed by dragging onto a pad (the power drag), the wall pick is Engineers in the War Council's Defences track, and the turtle and mirror gates of A16.14.9 apply. Home pads move to p 160, 230 and 300 (revision 2, 2026-09-30): the old 360 and 460 stopped a wave at p 384-484, outside every Common turret's reach, so a wall there could not do its job; camps may also use two Field pads (640, 820). Forts are taught at Bronze L4 (Nile L4 once Nile exists). Status: decided, not built; an indicative emulation exists (A16.14.9) and F0 re-measures with the full rules before the go/no-go.

| | |
|---|---|
| Class | Healthy |
| Decisions | Gold and pop into a wall (defence) or into units (attack); which pad; when to commit, given the build time and the 25 s recharge. For the attacker: bring Heavies, siege units, tunnelers or air, wait for decay, or push in Fog |
| Counterplay | A fort is a visible commitment: it scaffolds for 5 s before it blocks, and can be hit meanwhile. Heavy, siege, artillery and Legendary attacks deal ×2 to it; up to 5 blocked attackers can hit it at once; ranged attacks prefer the base over it; it decays, takes ×2 in Siege and crumbles fast once Siege starts; tunnelers pass under and air flies over |
| AI | A `fort { pad }` action (A16.14.7), planned in the bot's gold ledger: walls, towers and traps only against a real, non-Heavy wave in the bot's half, on a pad that completes before the enemy arrives; camps once per age while Charging. Forts **count** in the push-gate defence value D (a wall or tower adds 2 × its cost), never as army, and the bot answers them with Heavy, siege, artillery and Legendary picks through `aiHint.vsStructure`, because the counter matrix (equal-gold duels on a flat lane) cannot value forts. Bots use only fort cards a player at that point could own |
| Size, phase, owners | Prototype S · v1 Phase 2a, dev page only (built as `?dev=1#walls`) · WP5, WP12 · `docs/requests/wp5-wall-sandbox.md`. Card type L+ · A18.13 phase 6 (F0-F5, A16.14.9) · WP0, WP1, WP2, WP3, WP4, WP5, WP6, WP7, WP8, WP9, WP11, WP12 |
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

Emulated 2026-09-30 (A16.14.9, indicative only): the worst case won 0-4% against tier VII in Short, Standard and Full War, but on the old pads, with rules missing and some Bell rows already over their gates. The owner decided early (A18.9); the burden of proof is carried by the F0 rows of A16.14.9 on the full rules, and the owner check after F3 asks "fun, or turtle-y?".

**Card type rules (the Fort class; A18.13 phase 6; owner request 2026-09-29, `docs/decisions.md` "Owner request 2026-09-29: stationary class (walls, spawners, towers)").** "Der skal også være en klasse af "krigere" som er faste strukturer, som man kan stille på banen, f.eks. et palisadehegn, en militærbase der spawner gratis meget svage tropper hver x sekund, tårne der kan skyde men som står stille." The class has four kinds: **Wall**, **Tower** (a stationary shooter, never a mount), **Camp** (the spawner) and **Trap**. These rules replace the earlier v1.2 list; the prototype above and its gate stay as history.

#### A16.14.1 Kinds, slot and pads

| Kind | Rarity | Cost | Pop | Size | Pads | Role | Strong vs | Weak vs (the answer) |
|---|---|---|---|---|---|---|---|---|
| Wall | Common | 125 (Bunker 175) | 6 | large | Home | Stops a wave inside turret cover; buys time for turrets, the Home power and the next units | Infantry and Ranged waves (ranged deals ×0.5) | Heavy, Legendary, siege and artillery (×2), air, a drop landing behind it, waiting (decay) |
| Tower | Epic | 150 | 6 | medium | Home | A stationary archer in front of the base: ground and air | Ranged units, runners, light air | Heavy (×2), an Infantry rush that reaches it, artillery that outranges it, Siege; in Medieval and Future also Suppress (silenced) |
| Camp | Rare | 150 | 6 | large | Home or Field | Sends a free, very weak Levy every 10 s (1 alive at most) that always marches: pressure and a turret soak, never a defence | Turtles; armies without splash | Splash and cleave, Heavy (×2 on the camp), Siege (it stops) |
| Trap | Rare | 100 | 3 | a 60 lu patch | Home | Untargetable, non-blocking, always visible; fires when an enemy ground unit steps on it | Ground waves on a known path | Air and burrowed units, a cheap unit sent first, waiting (it expires) |

- **Slot.** Each age loadout has **1 Fort slot** beside its 6 units, 2 turrets and 2 powers; the four kinds compete for it (a real deck choice per age; one tray button fits the HUD budget, A2.9.10). Empty is legal.
- **Pads** (own-frame p, `economy.fort.pads`): **Home pads** 160, 230, 300 and **Field pads** 640, 820 (own half, beyond cover). A large fort on pad 300 stops attackers with their near edge at p 324, inside every age's 150-gold Common turret (340-380 lu); pad 160 (edge 184) is covered by every Common but the Pitch Cauldron (130). A static test asserts max Home pad + 24 + 12 ≤ each age's 150-gold Common range. Walls, towers and traps use Home pads only; a Camp may also use a Field pad while the own front at **rank 2** (`fieldFrontRank`; `frontP(own, 2)`, A2.9.4: the second frontmost own trained, ground, surfaced, non-structure unit, not mid-leap) stands at p ≥ pad + 100 (`fieldBehindLu`), so levies start near the fight and one runner cannot open a Field pad.
- **Cover invariant (A2.8).** Turret and field-tower cover never reaches past own-frame p 560 (`towerReachMaxP` = `turretRangeHardCapLu`), so the gap between the two covers stays ≥ 880 lu. A tower's range is min(card range, 560 − pad − 16): on pads 160 and 230 every tower keeps its card range, on pad 300 at most 244. This is also why towers can never stand on Field pads (pad 640 would reach p 926); the emulated Field-tower rows (A16.14.9) pointed the same way but were confounded by placement volume.
- **Legal pad** (checked on the accepting tick): the kind may use it; no own fort, scaffold or trap stands on it; no enemy ground unit (alive, not burrowed, levies included) has its centre within 120 lu (`padClearLu`); a Field pad also needs the rank-2 front as above.
- **Safe pad** (the AI and Key D only; a player may drag onto any legal pad, and the HUD rings the unsafe ones amber, "Builds under fire"): a legal pad that every enemy ground unit needs at least scaffold time + 1 s to reach (edge distance × 20 ÷ current speed ≥ scaffold ticks + 20; standing units at card speed), and for a Home pad one inside own cover (the longest range among own built turrets − 24 − 12; with no turret only pad 160). `mostForwardSafePad` falls back to the most rearward legal pad.
- **Placement** also needs: the slot recharged (**25 s** after each placement, first ready at **0:20**, evolve does not reset it); gold ≥ cost (paid on acceptance, never refunded); pop + the fort's pop ≤ 60 (scaffolds count); fewer than **1** own fort alive (`maxAlive`; scaffolds and traps count; 2 until the review fixes of 2026-10-01), one per pad; for a Camp, no own Camp alive; **not in Siege**; a Fort card in the loadout. Legal during Ascension with the old age's card until `ageUp`.
- **Command** `{ t: 'fort'; side; pad: 0..4 }`. Validation order: `badCommand` → `noFort` (empty or meta-locked slot) → `fortSiege` → `fortRecharge` → `fortMax` → `fortCampMax` → `fortPadKind` → `fortPadTaken` → `fortPadEnemy` → `fortPadField` → `popFull` → `noGold` → accept: pay, reserve pop, spawn the scaffold (or the unarmed trap), restart the recharge. **`src/core/fortPads.ts`** (`padKind`, `padLegal`, `legalPads`, `safePads`, `mostForwardSafePad`, `towerRangeOnPad`, `fortDenyReason`; pure integer) serves the sim, the AI, the HUD and the tools, as `core/powerReach.ts` does for powers.

#### A16.14.2 Shared rules

- **Scaffold.** A placed fort starts at 50% of its max HP (`scaffoldHpBp` 5,000) and completes after **5 s** (`scaffoldMs`; Engineers: 3 s). It is visible and hittable but does not block; a tower does not fire, a camp does not spawn. At completion it gains the other 50% (damage kept), blocks, and its decay clock starts; enemy units overlapping it then pass if their centre is past the fort's centre and are otherwise set to its near edge. A scaffold destroyed early pays the normal bounty. Traps arm after 2 s and are untargetable from the start.
- **Level.** Forts have no card level. HP and damage scale with the **loadout multiplier** of the age loadout the fort came from (the average of 10,000 + 500 × (L − 1) over its unit cards; the power rule, A2.9.6); levies use their camp's multiplier.
- **No modifiers on forts.** Forts and traps ignore every unit and side modifier (`glass_armies` and other `unitHp` effects, `unitCost` groups, boss and relic `sideMods` stats), every doctrine and all research except Engineers' scaffold time. Levies are units and take all of them.
- **Blocking.** Enemy ground units stop at a Wall, Tower or Camp. Own units always walk through their own forts (a fort is never an "ally ahead"). Air ignores forts; burrowed units pass under (A16.15). Traps never block.
- **Contact rule.** While a fort blocks the enemy front, up to **5** enemy ground units (`contactMax`) may attack it with attack index 0 as if in range, and the cap is a hard limit on its short-range attackers (compiled range < 100): a unit outside the set may not target that fort at all, so reach units (range 60-90) cannot bypass it (`SIM_VERSION` 5.1.0): the blocked front rank first, then others whose centre is within 60 lu (`contactLu`) behind the blocked front unit, nearest first, ties to the lower id, re-picked each tick. A wall holds about H ÷ (5 × Infantry DPS) ≈ 5.6 s against a blob of same-level Infantry in every age (the uncapped rule gave about 4 s with 7 attackers).
- **Formations.** Forts are outside every own-side formation and anchor: the three-wide front rank and single-file spacing (A2.7), `followSupport`, stance targets and the Hold flag, the siege crowd rule, the camera's auto-follow front and the Front button (A17.4), the open gate test, and the Supply Cache claim (A18.3.5). Summons (levies, drops, riders) cannot claim a Supply Cache either.
- **Targeting** (extends A2.7). An attack whose compiled base range is < 100 treats forts as ordinary candidates beside units (in practice: the fort blocking it), then the base. An attack with range ≥ 100 picks units first, **then the base**, then forts, so a fort never shields the base from fire; a ranged unit with only a fort in range stops and shoots it. Turrets never target forts; towers never target bases or forts. Forts are never F, never eligible for powers (targets, cap slots, auto-aim value, strike picks) and never picked by buffs; a drop still measures "150 lu beyond the enemy's frontmost ground unit" with forts included, so it can land behind a wall.
- **Special attacks vs forts.** Bomber drops treat a fort under the bomber (±40 lu) as a ground enemy after units, and the Balloon Admiral's drops deal ×2 (Legendary). Death explosions hit forts in their radius as area damage with the exploding unit's mods (the Sapper's blast uses its listed damage). Unit call-ins and strikes (Mothership, Radio Operator) pick units first and a fort only when no unit is eligible. Chain, pierce and cleave hops skip forts (a fort can be a primary, never a secondary hop). Splash hits forts with the area secondary 50%.
- **Damage to a fort** (the A2.7 pipeline): step 2 uses the attack's `structure` mod (×2) if it has one, else ×0.5 when the attack's compiled base range ≥ 100 (`rangedTakenBp` 5,000; a type mod, so it sits outside the −35% floor), else ×1.0; forts carry only the tags `structure` and `ground` (Anti-heavy mods do not apply); forts ignore every status, aura, heal, shield, knockback and pull; step 7 adds **×2 in Siege** (`siegeTakenBp`). The compiler puts `{ vs: 'structure', bp: economy.fort.structureBp }` (20,000) first in every attack of Heavy-group and Legendary-group units and of roles `siege`, `siegeHeavy` and `artillery` (Scorpion, Bronze Cannon; they outrange every tower, a deliberate answer), riders included, so no card table changes. Units with `siegeOnly` (Battering Ram, Sapper) use their `vsBaseDamage` against forts with no further ×2. Age Powers and Last Stand never hit forts. Heavy Breaker (A18.5.2, v1.1) adds +25%.
- **Decay.** From 60 s after completion (`doneTick + decayStartTicks`), every 20 ticks −1% of max HP (`decayBpPerSec` 100): about 165 s of life untouched from placement. **When Siege starts, every completed fort switches at once to −2% every 20 ticks from the Siege start tick** (a scaffold completing in Siege from its completion), whatever its own clock, and Hardlight regen stops: a fort lives at most 5 + 50 = 55 s into Siege, less than the shortest Siege (90 s, the 1-age window, A18.3.4). A static test checks this against every `FormatDef`, window clock and Siege-moving modifier (`sudden_siege`, Short Fuse). Decay runs in the damage step after impacts. A fort that decays to 0 is removed (`fortDecayed`), pop freed, no death explosion; if an enemy damaged it in the last 3 s (`decayCreditMs`), that last enemy damager gets the bounty, otherwise nobody does. Traps expire 120 s after arming, when spent, or when Siege starts.
- **Siege: forts crumble.** No placing, the Siege decay switch, damage taken ×2, camps stop spawning, towers deal ×0.5 (the turret rule). The HUD greys the Fort card with "Siege: forts crumble".
- **Bounty.** A destroyed fort or scaffold pays the killer the unit rates: 50% of its cost in gold and 70% in XP (underdog +50%, Forage and Bounty Hunters as for units). The owner gets **no loss XP**. Decayed forts (outside the 3 s credit), levies (cost 0) and traps pay nothing. A levy's own kills and base damage pay its owner normally. The emulated "lower bounty raised the Bell by 5 points" was within noise, so a lower fort bounty is unmeasured, not rejected.
- Forts never queue, convert on evolve, modernise or sell; an older-age fort keeps its stats. The falling gate never applies to forts; Miracle (v1.1) never revives a fort or a summon.
- **Determinism notes (B3).** Placement is a command (step 1); scaffold completion, camp spawns and trap arming run in the spawn step; decay in the damage step after impacts. Camp timer: `campNextTick` = completion + 40, then last spawn + 160; a levy spawns on the first tick at or after it with fewer than 2 of that camp's levies alive, and the timer never banks a second spawn. Trap primary: the nearest centre within 30 lu, ties to the lower id. "Range ≥ 100" is always the compiled base range, never the range after research, auras, Fog or Night. Hardlight regen runs only between completion and decay start.

#### A16.14.3 Kind rules

- **Wall.** HP = 1 × the age's Heavy Common HP (A16.14.4). No attack. **Sandbag Bunker** (Modern, 175 gold): own ground units within 60 lu behind it take −20% damage from attacks with range ≥ 100 (a guard aura: the strongest applies, inside the −35% floor). **Hardlight Barrier** (Future): regenerates 1% of max HP per second after 3 s without damage, only from completion until its decay starts (never in Siege).
- **Tower** (a field tower, never a mount). HP = 50% of the age's Heavy Common HP, size medium. One attack: the age's Ranged Common attack with damage ×1.5 (truncated), the same interval, projectile and G/A flags, range = min(card range, 560 − pad − 16) (the cover invariant, A16.14.1), single target, priority `front` from the tower, windup 0% (the renderer plays a 200 ms anticipation pose from the view's `nextAttackTick`; art never changes timing). Fog, Night and every other rule that changes turret range name "turrets and field towers" and apply after the clamp; nothing adds range to a tower. Distinct from turrets: pads not mounts, HP, pop and decay, never targets bases or forts, takes no research of any track (Watchtowers, Quick Loaders, Arsenal and every Troops line, Ranged included), no doctrine, relic, aura or side modifier, cannot be sold or modernised, and **Suppress** (A2.9.6) silences towers as well as mounts (`fort.silencedUntilTick`, event `towerSilenced`). ×0.5 in Siege.
- **Camp and Levy.** Camp HP = 60% of the age's Heavy Common HP, size large, no attack. A **Levy** is a hidden unit card per age (`UnitDef.hidden`, `levy: true`) cloned from the age's Infantry Common with **35%** of its HP and damage (truncated, min 1; 40% until the fort review fixes of 2026-10-01, then 30% until the MVP balance pass), its speed, range, interval, size and tags, no abilities, **cost 0** (no bounty, no power auto-aim value) and `aiValue` 8 (16% of the Infantry cost; AI threat estimates only). The first levy comes 2 s after completion, then one every **10 s** (`camp.everyMs`) while fewer than **1** of that camp's levies live (`camp.maxAlive`; 8 s and 2 until 2026-10-01), exactly at the camp's p (no Sally Port offset). Levies are **summons**: no pop, never F, never queued. They are Infantry for War Council research, take buffs, heals and modifiers like any unit, and **always march** (they ignore Hold, Fall back and the flag, so a camp can never be a free standing screen). **Every power cap ranks levies last** (A2.9.5 `capRank`): enemy caps and own buffs alike, so free levies can neither soak a Home power nor eat the caster's Hunt Cry; drops and other summons keep their place. The AI never lets summons or forts set its attack clock (`pastMidTick`), its quiet-lane test (`foeOnMyHalfTick`), its composition memory or its counter scoring. A camp stops spawning in Siege and when destroyed or decayed; live levies stay. A levy has 12% of an Infantry's HP × damage; a camp's whole life (at most ≈ 16 levies, one at a time) is worth under 2 Infantry if every levy fights.
- **Trap.** Not a unit (`SimState.traps`). Untargetable, non-blocking, always visible to both sides (a marked patch with charge pips), 3 pop, no HP. Fires when an enemy ground unit's centre comes within 30 lu, 1 s between charges, on the primary plus its area (A2.6: at most 4 targets, 50% secondary). Air and burrowed units never trigger it and are never hit. **No trap stuns, snares, pulls or knocks back** (a trap plus a power telegraph is never a guaranteed hit). **Budget** (static check): summed primary damage over all charges 0.6-1.2 × the age's L1 Infantry HP; splash radius ≤ 60; slows ≤ 60% for ≤ 3 s (a control trap may go below the damage floor).

#### A16.14.4 Roster (32 cards, 8 levies; L1)

| Age | Wall (Common) | Tower (Epic) | Camp (Rare) → Levy | Trap (Rare) |
|---|---|---|---|---|
| Stone | Palisade (`palisade`) 560 | Sling Perch (`sling_perch`) 280 HP, 27 / 1.4 s, r200 | War Camp (`war_camp`) 336 → Cave Youth (`cave_youth`) 56 HP, 7 / 1.0 s | Spike Pit (`spike_pit`): 3 × (40 and 40% slow 2 s) |
| Bronze | Cyclopean Wall (`cyclopean_wall`) 630 | Pyrgos Tower (`pyrgos_tower`) 315, 30 / 1.4 s, r210 | Muster Tents (`muster_tents`) 378 → Citizen Levy (`citizen_levy`) 65, 8 | Hidden Stakes (`hidden_stakes`): 3 × (46 and 40% slow 2 s) |
| Medieval | Shield Barricade (`shield_barricade`) 756 | Longbow Tower (`longbow_tower`) 378, 36 / 1.4 s, r230 | Levy Camp (`levy_camp`) 453 → Peasant Levy (`peasant_levy`) 75, 9 | Wolf Pits (`wolf_pits`): 3 × (54 and 50% slow 3 s) |
| Gunpowder | Gabion Wall (`gabion_wall`) 1,019 | Musket Redoubt (`musket_redoubt`) 509, 70 / 2.0 s, r240 | Militia Muster (`militia_muster`) 611 → Militiaman (`militiaman`) 101, 12 | Powder Keg (`powder_keg`): 1 × 230 splash r60 |
| Industrial | Trench Parapet (`trench_parapet`) 1,187 | Sniper Nest (`sniper_nest`) 593, 49 / 1.2 s, r250 | Recruiting Depot (`recruiting_depot`) 712 → Volunteer (`volunteer`) 115, 14 | Tripwire Charge (`tripwire_charge`): 1 × 200 splash r40 |
| Modern | Sandbag Bunker (`sandbag_bunker`, 175 g) 1,378 | Pillbox (`pillbox`) 689, 48 / 1.0 s, r260 | Forward Base (`forward_base`) 826 → Conscript (`conscript`) 137, 17 | Minefield (`minefield`): 2 × 130 splash r40 |
| Future | Hardlight Barrier (`hardlight_barrier`) 1,860 | Sentry Pylon (`sentry_pylon`) 930, 64 / 1.0 s, r260 | Clone Bay (`clone_bay`) 1,116 → Clone Cadet (`clone_cadet`) 164, 23 | Grav Mire (`grav_mire`): 1 × (110 and 60% slow 3 s, splash r60: the primary 110, up to 3 more at 55) |
| Cosmic | Void Rampart (`void_rampart`) 2,509 | Ion Spire (`ion_spire`) 1,254, 81 / 1.0 s, r270 | Warp Barracks (`warp_barracks`) 1,505 → Star Recruit (`star_recruit`) 245, 31 | Void Mine (`void_mine`): 1 × 430 splash r50 |

**W2 Bronze wave variants (X0, CONTENT_PLAN 5.2, built 2026-10-03):** Hoplon Line (`hoplon_line`, Common wall, 175 gold, 630 HP; cover: own ground units within 60 lu behind it take 20% less from attacks with range ≥ 100; War Path Bronze s2, Road 4,200) and Slinger Camp (`slinger_camp`, Rare camp, 150 gold; shown as **Skirmisher Camp**: its levy `slinger_levy`, shown as **Skirmisher Levy**, is 35% of the Bronze ranged Common, the Javelineer, every 12 s, one alive; the Bronze 20-star milestone, Road 4,200). Bots keep bringing the age's first wall and camp (`botFortCard` takes the first by id), so neither variant is a bot pick.

Towers hit ground and air; tower ranges are card values, clamped to 244 on pad 300 by the cover invariant. Trap budget (primary damage ÷ I): 0.75, 0.74, 0.75, 0.79, 0.61, 0.66, control, 0.61. Levies (review fixes 2026-10-01) are 30% of the Infantry Common: Cave Youth 48, 6; Citizen Levy 55, 6; Peasant Levy 64, 8; Militiaman 87, 10; Volunteer 99, 12; Conscript 118, 14; Clone Cadet 141, 19; Star Recruit 210, 27. `caltrops` and `barbed_wire` are power ids since the power rework, so those trap names moved to Wolf Pits and Tripwire Charge; Grav Snare became Grav Mire (r60 inside the budget; it slows, and "snare" is a power status traps may not apply). Collection: 32 Fort cards (8 Common, 16 Rare, 8 Epic) plus 8 hidden levies and 24 hidden fort twins (A16.14.8); the schema wants exactly one fort of each kind per age and the wall as `source: 'starter'`; album numbers continue after the last card (A18.9.3).

#### A16.14.5 Interplay

- **Stances (A18.4):** forts ignore stance and every formation (A16.14.2); levies always march; Fall back leaves a Field-pad camp exposed.
- **War Council:** the wall pick is **Engineers** (Defences rank II): scaffolds 5 → 3 s (A18.5.3). No other research of any track applies to forts or towers. Infantry lines apply to levies. Heavy Breaker (v1.1) +25% vs structures. No other fort research until the A16.14.9 gates hold in production.
- **Powers (A2.9):** never hit forts; forts are never eligible, never F; Suppress silences towers; drops can land behind a wall; levies rank last in every cap (A2.9.5); buffs never pick forts.
- **Weather and modifiers:** Fog and Night (A16, A18.7.7) shorten tower range as they shorten turret range; unit modifiers skip forts and hit levies.
- **Air:** flies over; air attacks follow the fort targeting order (A16.14.2); the Balloon Admiral's drops deal ×2 (Legendary); towers shoot air.
- **Siege units, Legendaries, Heavies, artillery:** ×2 (siege-only units use their base damage). The Heavy Common of every age is the starter answer. Anti-heavy deals ×1 (forts are not armored); the counter legend gains "Heavy beats Fort".
- **Overdrive:** unchanged rules. **Siege:** forts crumble. **Evolve:** the Fort slot flips to the new age's card; the recharge carries; built forts keep their age.
- **Underground (A16.15, later):** burrowed units pass under and never trigger traps. **Victory rules (A18.7.3):** not in phase 6; "Take the tower" marks a turret only. A fort target needs `SideMods.preFort` (a pre-placed fort exempt from decay and the cap) and `VictoryRule.target { fortPad }`, a later proposal. **Last Stand, the falling gate and Miracle** never touch forts; Miracle skips summons.

#### A16.14.6 Sources, unlock and save

- **Unlock set:** the 8 walls **and the Stone Camp, Trap and Tower** (War Camp, Spike Pit, Sling Perch), granted when the Fort slot unlocks, for War Path and ladder players alike. **War Path first clears** (A18.7.8; L3 is a unit, L5/L7/L9 powers, L10 the boss), Bronze to Cosmic: each region's **L4** grants its Camp, **L6** its Trap, **L8** its Tower, shown on the node. Stone L4, L6 and L8 grant no fort, and no fort reward is shown anywhere before the unlock; a Bronze-or-later clear from before the unlock grants its fort when the slot opens. **Trophy Road fallback:** one **fort set** per region (its Camp, Trap and Tower; three `fort` items shown as one tile) on plain nodes only (never a gate, a Wardrobe or a cosmetic node): 2,200 Bronze, 2,300 Medieval, 2,500 Gunpowder, 2,700 Industrial, 2,900 Modern, 3,100 Future, 3,200 Cosmic; whichever source comes first grants a card, the other pays 60 Amber for it.
- **Never capsules; no copies, levels or Dust.** Adding 24-32 cards to the drop pools would stretch time-to-max for every card and move the A6.9 targets and the 2026-09-29 capsule ladder, so the capsule economy stays exactly as tested. Revisit only with an economy-sim run within ±5% of today's median days to max.
- **Unlock:** the first clear of War Path Bronze L4 or 400 trophies (Arena 3), whichever first; one ceremony ("Forts! Build on the lane."). While locked, `meta` sends `fort: null` for both sides, bots included (`noFort`). At the unlock every empty Fort slot of every age in every War Plan preset (A, B, C) gets its age's wall; War Path `fixedPlan` loadouts carry an explicit `fort` (a card or `null`). The tutorial and War Path levels before Bronze L4 play without forts. A player who unlocks by trophies gets a one-time in-battle hint in the first match with the slot ("Drag a wall onto a glowing pad"). The Daily Challenge always plays the Fort slot; a player whose slot is locked gets each age's wall for Daily matches only.
- **Bots** (the A2.9.8 rule): once the player's slot is open, bots may use the walls and the Stone set; a Bronze-or-later camp, trap or tower only when the player has first-cleared its granting level or its Road node is ≤ best trophies + 100. War Path level bots may use their region's forts; the Daily uses the ladder filter.
- **Save** (the next `SaveDoc` version after the newest at build time; v11 today, after the Sundial's v10), additive and idempotent: every loadout of every preset gains `fort: null`; `fortsOwned`; `flags['fort.slot']` for saves with `wp.bronze.l04` cleared or best trophies ≥ 400, which also grants the 8 walls and the Stone set and fills each empty `fort` with its age's wall; with the flag, the forts of every cleared Bronze-to-Cosmic L4/L6/L8 node and every claimed fort-set Road node are granted (a double grant pays 60 Amber once). Fixtures: fresh; Stone-only War Path with L4, L6 and L8 cleared (no forts); Bronze L4 cleared; 450 trophies ladder-only; War Path to Medieval; road claimed to 2,500; presets B and C with empty slots. Each asserts no lost id, the slot rule, no double grant, all presets filled and idempotence.

#### A16.14.7 Army, HUD and AI

- **Army (A18.9.3, ui-plan 4.2):** the In battle band gains a **Fort 1/1** group with one slot after Powers. Budget from the built `warplan.css` (measured with Playwright at 844 × 390): the band row is 794 px, today's three groups take 657 (58 px slots, 5 px gaps, 10 px group gap plus 11 px divider padding), the Fort group adds 79: **736 of 794**. That leaves too little for the advisor / Avg Lv column (96 + 8), so below 480 px height the advisor chip and Avg Lv move to the right end of the band's title row; desktop keeps them in the row. F2 asserts no horizontal overflow at 844 × 390 and 1280 × 720. The slot shows the kind glyph, cost and pop in the fort stone frame, a dashed "+ Fort" when empty, a padlock and "War Path Bronze 4 or 400 trophies" when locked; forts join Available and Locked with their source; a fort dropped on another slot bounces back ("Forts go in the Fort slot"). Card detail: a lane diagram with the five pads, the kind's legal pads lit and a tower's reach from each, the numbers, "Crumbles after 60 s", "Heavies break it ×2", "Siege: forts crumble"; Weak vs lists are age-specific (Suppress only in Medieval and Future). Auto-fill picks the wall; no advisor warning for an empty Fort slot.
- **HUD (A9.2, A2.9.10, ui-plan 4.7):** the Fort button sits in the **placement dock** with the two powers (all three are dragged onto the lane), after the stance button: left cluster | six cards | stance | Fort | Home | Field; at 844: 100 + 8 + 368 + 6 + 56 + 8 + 58 + 6 + 122 = 732 of 750 px; below 820: 657 of 686. It is a rounded square with a **stone frame** and a pad glyph, never a rarity frame, so it cannot be mistaken for a unit card; a tap starts aiming and never trains (the stance button separates it from the train-on-release row). Face: art, kind glyph, cost chip, recharge arc and seconds, "2/2" at the cap. **Drag onto a pad** (the shared power drag, `src/ui/components/drag.ts`): on pick-up the pads the kind may use light (Field pads are not drawn for walls, towers and traps); legal pads show a green ring and a ghost of the fort to scale (a tower with its reach), legal pads the enemy reaches before completion an amber ring and "Builds under fire", illegal pads grey with a reason ("Enemy near", "Army first", "Taken"); the ghost snaps to a legal pad within 24 px with a small bump and haptic tick; the camera edge-scrolls; release on a legal pad places (MR-70b: the gold floats "−150", the ring drains, the scaffold rises in dust); release elsewhere or over the HUD cancels at no cost. Tap starts aiming; a tap on a lane pad places, and a tap on the minimap while aiming snaps to the nearest legal pad (pad ticks are 20-40 px apart on a phone minimap). **Key D:** the most forward **safe** pad. Denied presses say why: "Ready in 12 s", "Need 40 gold", "Army full", "2 forts up", "One camp at a time", "No clear pad", "Siege: forts crumble", "Camps only", "No fort in this age's plan". Forts show HP bars (scaffolds striped), decay cracks, a jammed icon while silenced, and traps their charge pips; an enemy fort joins Scouted on first placement. **The enemy's fort recharge is public**, like their power rings (A2.9.7): once scouted, the Scouted chip carries a small fort glyph with its recharge ring (a steady rim when ready, never a pulse); the top band width does not change, and bots read the same ring. Feel (A12, inside the freeze budget): placing thud and dust, completion squash-and-stretch and a flag unfurl, hits shake with material chips, crumble stages at 66% and 33%, collapse debris and trauma +0.2, a 200 ms tower anticipation pose from the view's `nextAttackTick`, trap snap with a 60 ms victim-local freeze, levy spawn puff and a small horn; Reduce motion fades. Reviewed with Playwright at 844 × 390 and 1280 × 720.
- **AI (A7.2-A7.4):** action `fort { pad }`, planned **inside the bot's gold ledger**, when the slot is ready, a safe pad exists and gold ≥ cost + the gold float. Wall, Tower and Trap: only when enemy ground value in the bot's half is ≥ 300, ≥ 1.2 × the bot's own army there, and less than half of it Heavy, siege, artillery or Legendary (a fort in front of Heavies feeds them): the most forward safe Home pad inside own cover. Camp: once per age stay after the opening, while Charging with 2+ trained units out: the most forward safe pad, Field when legal. Values count trained units at cost, levies at their `aiValue` and forts never as army. Push gate D: each live enemy wall or tower within 500 lu of their gate adds 2 × its cost, a camp or visible trap 1 ×; `gateUnits` excludes forts, so nothing counts twice. Summons and forts never feed `pastMidTick`, `foeOnMyHalfTick`, the composition memory or counter scoring, and `ai/view.ts` lists forts apart from units. Answering forts: f_counter values a fort at 2 × its cost with a structure row (Heavy, siege, artillery, Legendary ×2; other range ≥ 100 ×0.5) through `aiHint.vsStructure`. Tiers 0-I never place forts, II-IV walls and traps only, V-X every kind; VII-X place no fort while banking for a wave. Every bot obeys the source filter (A16.14.6). Generals: a preferred kind overrides the tier's kind list, never the source filter (else the wall): Mama Moss walls and traps, Captain Kettle camps, Sgt. Boomsworth towers, Rook answers forts with Heavies, siege and artillery, Baroness Ledger never towers, The Warden any. Mistake list: "place a wall in front of Heavies". Bots see enemy forts as players do (visible forts, traps and the public ring), never gold, and stay labelled AI.

#### A16.14.8 Art, sound, strings, contracts

- **Art** (cartoon, A18.9.5; through the manifest, the sim owns timing): `fort.<slug>` for the 32 forts, drawn through `ArtProvider.createFort` (static rigs with `scaffold`, `build`, `idle`, `hit`, `crumble1-3`, `collapse`, a `decay` crack overlay driven by HP; towers `windup` (the 200 ms anticipation keyed to the view), `attack` and `jammed`; traps `armed`, `trigger`, `spent`); `unit.<levy slug>` for the 8 levies (the age's Infantry puppet at 0.85 scale in a plain levy outfit with a team sash); shared `fx.fort_pad`, `fx.fort_ghost`, `fx.fort_reach`, `fx.fort_scaffold_dust`, `fx.fort_build_pop`, `fx.fort_debris_{wood,stone,metal,energy}`, `fx.trap_snap`, `fx.levy_spawn`; icons `icon.role.fort` (a crenellated wall), `icon.fort.{wall,tower,camp,trap,pad}` and the tray frame `ui.frame.fort`; tower projectiles reuse the age's Ranged Common projectile. Team colour on banners, sashes and trims (≥ 18% of a frame), idle life on every fort, anticipation before every tower shot, squash and stretch on build and collapse. About 1 agent hour per rig.
- **Sounds (A13):** `fort_place`, `fort_build`, `fort_complete`, `fort_hit_{wood,stone,metal,energy}`, `fort_crumble`, `fort_collapse`, `fort_decay`, `trap_arm`, `trap_snap`, `trap_blast`, `camp_horn`, `levy_spawn`, `fort_denied` (`ui_deny` until drawn); towers use their Ranged Common's shot.
- **Strings:** `card.<slug>.name|desc` (32 forts, 8 levies), `class.fort`, `fort.kind.*`, `fort.pad.{home,field}`, `fort.trait.{structure,decay,siege,heavyX2,rangedHalf,levyMarch,trapVisible,cover,regen,silenced,powerImmune}`, `fort.stat.*` (with `reach`), `hud.fort.*` (with `underFire`, `enemyRing`), `hud.deny.fort{Recharge,Gold,Pop,Max,CampMax,NoPad,EnemyNear,ArmyFirst,Taken,Siege,PadKind,Empty}`, `hud.key.d`, `army.fortSlot.*`, `legend.heavyBeatsFort`, `unlock.forts.*`, `tutorial.fort.{drag,pads,heavy,decay,hint}`, `result.tip.{fortHeavy,fortFeed}`, `fort.source.{warPath,road,unlock}`, `road.fortSet`.
- **Contracts (one WP0 bump, complete; F1 must not need a second):**
  - `FortDef` in `CompiledContent.forts` (`kind: 'fort'`, `age`, `rarity`, `fortKind`, `source: 'starter' | 'unlock' | 'warPath'`, `road?`, `cost`, `pop`, `hp`, `size` (tower medium, wall and camp large, trap none), `pads: 'home' | 'any'`, `attack?`, `camp?`, `trap?`, `cover?`, `regen?`, `visualId`, `sfx`, name and desc keys, `strongVs`, `weakVs`).
  - **Hidden twin units:** the compiler turns every wall, tower and camp into a hidden `UnitDef` in `content.units` with the same id (`role` and `group` `'fort'`, speed 0, `trainMs` 0, the fort's size, HP, cost and pop, tags `structure` and `ground`, the tower attack or `attacks: []`, `hidden: true`, `fort: { kind }`), so the ~75 `content.units[u.card]` lookups in ~40 files (sim, ai, render, meta) resolve; hidden keeps twins out of capsules, pools, the album, counters and trays; the id-uniqueness check treats a `FortDef` and its twin as one card. Levies are hidden `UnitDef`s with `levy: true`, cost 0 and `aiValue`. `Tag` + `'structure'`; `Role` and `RoleGroup` + `'fort'` (pop, the queue, `unitCost` groups and `UnitPose.roleGlyph` read it); `UnitDef` + `fort?`, `levy?`, `aiValue?`.
  - `EconomyRules.fort { pads [160, 230, 300, 640, 820], homePads 3, padClearLu 120, fieldBehindLu 100, fieldFrontRank 2, maxAlive 1 (was 2), maxCamps 1, maxTowers 2 (a lever), rechargeMs 25000, firstReadyMs 20000, scaffoldMs 5000, scaffoldHpBp 5000, safeMarginMs 1000, decayStartMs 60000, decayBpPerSec 100, siegeDecayBp 20000, decayCreditMs 3000, siegeTakenBp 20000, rangedTakenBp 5000, rangedMinLu 100, structureBp 20000, bountyGoldBp 5000, bountyXpBp 7000, towerReachMaxP 560, contactLu 60, contactMax 5 }`.
  - Sim: walls, towers and camps are `UnitState` entries (their twins) with `fort?` state (pad, kind, completion tick, decay-from tick, camp timer and levy ids, multiplier, `silencedUntilTick`, last enemy hit tick and damager); **traps are not units**: `SimState.traps: TrapState[]` (hashed) and `Observation.traps`; `SideState.fortReadyTick`; `Loadout.fort?: CardId | null`; `Command.fort`; the reject codes above; `CapCandidate.capRank`. `SideMods` and `VictoryRule` unchanged in phase 6.
  - Events `fortPlaced`, `fortBuilt`, `fortDecayed { id, creditedTo? }`, `trapArmed`, `trapTriggered`, `trapExpired`, `towerSilenced { side, id, untilTick }` (destruction uses `died`, levies `unitSpawned { summoned, from }`).
  - `Observation.me.fort` (card, cost, ready ticks, alive, legal and safe pads with reasons and tower range) and `foe.fort { card | null until scouted, readyTicks }`; `HudModel.fort` (+ `affordable`, `secondsLeft`, `cap`, `slotLocked`, `siege`, `foeRing`); `MatchStats` fort counts, fort gold and bounty paid, levies and levy damage.
  - Art: `ArtProvider.createFort → FortView` with `setPose(FortPose { x, y, hpBp, scaffoldBp, decayBp, crumbleStage, charges?, silenced, nextAttackInMs? })`, `play`, `freeze`, `flash`, `update`, `destroy`; `render/battleView.ts` makes a `FortView` for units with `def.fort` and for traps.
  - Replay and save schemas (WP8, same bump): `src/save/replaySchema.ts` gains the `fort` command and the optional `fort` in `ReplayLoadoutSchema`; `src/save/schema.ts` gains `Loadout.fort`, `fortsOwned` and the preset fields. Valibot `v.object` strips unknown keys, so without them stored replays and resume logs would silently drop fort commands; a round-trip test stores every fort command, reloads through both schemas and replays to the same hash.
  - All new state is hashed. **`SIM_VERSION` → 5.0.0** (the next major at build time): the golden replays are re-recorded once, deliberately, on frozen fixture content that gains `FortDef`, the twins, `economy.fort` and one fort of each kind; the fort goldens `12-forts.json`, `13-forts-cases.json` and `14-forts-scaffold.json` (5.1.0; together, asserted by one coverage test) cover all four kinds, a destroyed scaffold, a decay removal with and without the bounty credit, a trap charge, a levy stream stopping in Siege, the Siege decay switch, a Heavy breaking a wall, the contact cap and a silenced tower; `replay-verify` and the browser determinism e2e rerun; 4.x replays keep their result card and no longer play.

#### A16.14.9 Measured, gates and levers

**Status (MVP balance pass, 2026-10-01; tier VII, paired seeds, n = 400 per row).** The bot places walls, towers and traps once a wave is in its half (`FORT_APPROACH` 0; read from 500 lu out, half its walls decayed unhit) and a camp only on top of a push worth 1.5× the enemy army (`CAMP_AHEAD_BP`); levies are 35% of the Infantry Common (30% left camps 6-7 points under the wall in Bronze and Gunpowder). Fort AI value (with vs without the card, Short / Standard): walls 47.4 / 50.3%, towers 47.8 / 53.1%, traps 49.8 / 53.3% (0.18-0.42 placements a match, so the Short rows sit within noise of 50%), camps 48.0 / 46.6% (was 40% in Standard at the audit): the camp row is the open floor. Per card vs the wall in the one-age windows every fort is within ±5 except the Cosmic ones (camp +7.2, trap +6.5, tower −5.1).

**Emulated (2026-09-30, `SIM_VERSION` 4.1.0, about 28,000 headless matches; indicative only).** Forts were emulated on the current build: a patched content added per-age stationary hidden units with these formulas, the `structure` tag and the ×2 mod, and a per-tick driver placed them through the sim's dev helpers with pads, legality, the scaffold as a delayed spawn, pop, recharge, the caps, decay, no placing in Siege and camps with levies, paying from the placer's gold. Tier VII Balanced at L7, 200 per row and format (Full 100). **These numbers motivated the rules; they pass or fail nothing**, for five reasons:

- **Old pads.** The main rows used Home pads 240, 360, 460, mostly outside turret cover.
- **Rules not modelled:** a scaffold that can be hit and pays bounty; the contact rule; ranged ×0.5 outside the floor (×0.65 was used); the targeting order (ranged enemies shot forts before the base); always-marching, cost-0 levies and the AI memory exclusions (levies obeyed stance and counted as 50-gold Infantry); D at 2× (the bot counted forts at 1× in `gateUnits`); the Siege decay switch (only in the last smoke); tower windup and ×0.5 in Siege; the section 9 camp rule (the driver re-placed a camp whenever none was alive); no loss XP; enemy powers could touch forts.
- **Too few placements.** In the fort-AI mirrors a side placed 0.79 / 1.36 / 1.95 walls and 0.47 / 0.94 / 1.45 Home towers per match (Short / Standard / Full).
- **Confounded towers.** Field towers were placed whenever the army was forward (4.3-10.4 per match), Home towers only under pressure (0.47-0.94); towers stay home by the cover invariant, not by this row.
- **Noise and empty checks.** At n = 200 a Bell share is ±7 points and a difference ±10; one configuration read 34.5% and 41.0% in two runs, so the "lower bounty raised the Bell by 5 points" reading is noise (unmeasured). The Balanced script loses 97-100% to tier VII, so a `fort_spam` row on it cannot fail, and every turtle wins 0-7%, so "wins ≤ 45%" cannot fail either.

| Tier VII mirror, both sides use (placements per side) | Short: Bell, median | Standard | Full (100) |
|---|---|---|---|
| No forts | 52.0%, 8:30 | 58.0%, 12:30 | 40%, 16:57 |
| Walls, old pads | 41.0%, 8:13 (0.79) | 48.0%, 12:26 (1.36) | 28%, 16:05 (1.95) |
| Camps, old pads | 38.5%, 8:01 (3.00) | 52.5%, 12:30 (4.41) | 26%, 15:45 (5.99) |
| Towers on Home pads, old pads | 43.0%, 8:15 (0.47) | 49.0%, 12:25 (0.94) | **44%**, 17:19 (1.45) |
| Towers also on Field pads (4.3-10.4 placements) | 56.5% | 78.0% | |
| Walls, new pads | 40.0%, 8:09 (0.70) | 55.5%, 12:30 (1.39) | |
| Towers, new pads | 44.0%, 8:19 (0.47) | 50.0%, 12:30 (0.95) | |

| Vs tier VII (win %, Bell %) | Short | Standard | Full (100) |
|---|---|---|---|
| `turret_turtle` | 0, 20.0 | 3.5, 33.0 | 3, 71 |
| + walls, old pads (`wall_turtle`) | 0, 4.0 | 0, 5.0 | 4, **17** |
| + camps / + towers, old pads | 0, 9.5 / 0, 4.0 | 1.0, 8.5 / 1.0, 10.5 | 2, **20** / 2, 11 |
| + walls / camps / towers, new pads | 0, 11.0 / 0, 13.5 / 0, 11.5 | 0.5, 8.0 / 3.0, **17.0** / 2.0, **18.5** | |
| + walls / camps / towers, new pads and the Siege decay switch | 0, 8.5 / 0, 13.5 / 0, 10.5 | 0, 6.5 / 2.0, **16.5** / 2.0, **18.5** | |
| + towers, new pads, Siege switch, `maxTowers` 1 | 0, 11.5 | 0.5, **20.0** | |
| `home_turtle` | 0, 22.5 | 7.0, 42.0 | |
| + walls / camps / towers, old pads | 0, 9.0 / 0, 20.0 / 0, 12.0 | 1.5, 11.5 / 4.0, 21.0 / 0.5, 13.0 | |

**Read, plainly.** Gates already fail on this emulation: on the old pads `camp_turtle` (20%) and `wall_turtle` (17%) in Full War, and Home towers' Full War mirror Bell (+4); on the new pads, where walls stand inside turret cover as intended, `tower_turtle` (18.5%) and `camp_turtle` (16.5-17%) in Standard War. Forts still feed the bot (each fallen wall paid 62 gold and 87 XP), so no turtle wins, but the Bell limit binds. Several missing rules cut against the turtle (the hittable scaffold, the contact rule, ranged attacks preferring the base), others help it (ranged ×0.5, levies that march away instead of screening); F0 models them all. The fort AI value (26.5-43%) says nothing about the kinds: the bolt-on driver spent the bot's gold behind its back and the bot counted its forts as army.

**Gates** (pre-registered; F0 at smoke size, F5 at full size). Method: tier VII at L7, baseline plans, **paired seeds** (every "with forts" row plays the seeds of its "without" row, and gates read the paired difference with its 95% interval); mirrors 1,000 per format (Full 400); proxies 400 per row in Short, Standard and Full (smoke 100); every row prints placements per side per match, forts destroyed and decayed, and levies beside its Bell.

| Row | Target |
|---|---|
| `placebo` (the fort driver on, never placing) vs no driver | Paired Bell and win within ±2 points |
| `wall_turtle`, `camp_turtle`, `tower_turtle` (4 turrets, Hold at 320, the fort re-placed on every recharge on the most forward safe Home pad) | ≤ 15% of matches at the Bell in every format; win % ≤ `turret_turtle` + 5 (paired); wins ≤ 45% (sanity, not binding) |
| `home_turtle` + each kind | Turtle band ceiling 45%, Bell ≤ 50%, ≤ +5 points over `home_turtle` (paired) |
| `camp_hold_mirror` (both tier VII sides Hold with camps) | The attack clock still fires (logged); Bell ≤ the no-fort Hold mirror + 2 (paired) |
| `flag_ball` + towers | Within the `flag_ball` band; ≤ +5 points over `flag_ball` |
| `runner_camp` (one runner past mid-lane, then a Field-pad camp) | Field pads stay illegal with one unit forward (static); the row ≤ its no-fort version + 2 |
| `fort_spam` (the **tier VII** brain plus its kind forced on every recharge on any legal pad, paid from its ledger) vs tier VII without forts | ≤ 55% |
| Forced-placement mirror (both tier VII sides re-place kind X on every recharge on the most forward safe pad) and the fort-AI mirror | Paired Bell difference ≤ +2 points with the 95% upper bound ≤ +5; **mean** match length not more than 30 s longer (shorter is fine; the median is pinned at the Bell cap while more than half of Standard mirrors reach the Bell, so a median gate cannot fail there; fixer 2026-10-01) and inside the A18.12 format bands |
| Fort AI value (tier VII with forts vs without) | 50-62% once the AI plans forts in its ledger |
| Per fort card vs its age's wall (1,000 paired per card) | 95% CI within ±3 points; Bell delta ≤ 5 |
| Static | Trap budget; tower reach pad + 16 + range ≤ 560 on every legal pad; blocked front in cover (max Home pad + 24 + 12 ≤ each age's 150-gold Common range); a wall holds ≥ 5 s against 10 same-level Infantry in every age at `contactMax`; the longest fort life in Siege < the shortest Siege over every `FormatDef`, window clock and Siege-moving modifier; levies pay 0 gold and XP, ≤ 2 per camp, none in Siege; the Heavy Common carries ×2 in every age (has-a-starter-answer) |
| Unchanged without forts | `turret_turtle`, `power_hoarder`, `home_turtle`, `tech_turtle`, `fallback_turtle` within ±3 points |
| B3 | Full War ≤ 850 ms headless with forts |

**Go or no-go (end of F0).** F0 first adds every rule listed above as not modelled, the new pads, safe pads and the tower clamp, then runs every row at smoke size; the owner hears the numbers in plain words; a failing turtle or mirror row goes through the levers before F1 starts.

**Levers, data first.** If forts turtle or stall: decay start 60 → 45 s; recharge 25 → 30 s; tower HP 50 → 40%; wall HP 1.0 → 0.8 × H; camp interval 8 → 10 s or levy cap 2 → 1; `maxAlive` 2 → 1; `maxTowers` 1 last (on the emulation it did not move the tower turtle: 20.0% against 18.5%, because fewer towers also fed the bot less). If forts are too weak (once the AI plans them): `contactMax` 5 → 3; scaffold 5 → 4 s; wall 125 → 100 gold; levy stats 40 → 50%; trap charges +1; camp interval 8 → 7 s. Never: towers on Field pads (they break the cover invariant), levies that obey Hold. A lower fort bounty is unmeasured and may be tried only as a measured lever. Every lever is re-run against the turtle and mirror rows before it ships.

**Build (A18.13 phase 6, split like the power rework):** F0 prototype gate (no shipped code: the emulation moved into `tools/` as `--patch` data plus a driver hook, extended with the missing rules; the placebo, forced-placement, fort-AI, turtle, `camp_hold_mirror`, `flag_ball` + towers, `runner_camp` and tier VII `fort_spam` rows at smoke size with paired seeds; the owner hears the numbers) · F1 rules, the complete contract bump, the save step (v11 today), AI v1 in the ledger, `SIM_VERSION` 5.0.0 with `fort: null` sent until F2 · F2 HUD, Army, `docs/ui-plan.md` 4.2 and 4.7, Bronze L4 teaching, the trophy-unlock hint, the unlock; then `meta` sends forts · F3 art and sound (Playwright at 844 × 390 and 1280 × 720) · owner check · F4 War Path, unlock-set and Road sources, the bot source filter · F5 tuning at the gate sizes.

### A16.15 Underground layer (APPROVED; v1.2)

**Rescheduled by A18.9.** Underground is a full class with its own icon, counters and Troops research line (Quick Dig or Shoring, then Surprise or Deep Tunnel), built in A18.13 phase 8 after forts and the Air class, and taught at Gunpowder L1 on the War Path.

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
- **Surfacing** at the first of: its centre within 20 lu of an enemy ranged or support ground unit at p ≥ 1,360 (L − 640); or p 1,680 (the enemy's hold line, L − 320). These are the A17.3 values for the 2,000 lu lane (were p ≥ 560 and p 880). Surfacing takes 1 s with a dust plume visible to both sides; the unit can be hit during it and never burrows again.
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
| Season 3: "The Bronze Age" (D1's sixth age) | Absorbed by A17: Bronze, Industrial and Cosmic arrived as data in v1 (39 new cards). The season slot now holds A18's new ages in waves (Nile and Rome first, A18.8.3), each 7 units, 4 turrets, 2 powers and a fort card | - | Ascended forms for the new Legendaries | L-XL per wave |
| Season 4: "Beasts and Machines" | 12 units (2 per age), 6 turrets, 6 forts | 140 | Forms for any new Legendaries | L |
| Season 5 | 12 units, 6 turrets | 158 | Forms for any new Legendaries | L |

The card totals in this table predate A17's 88 cards and 16 powers; the season order still holds. If forts are parked, each season swaps its forts for sidegrade units and turrets; the totals stay the same. At one funded season per quarter, 150+ cards arrive about 15 months after v1, not in year one. Seeds (battlefields × weather × doctrines × modifiers × modes) give far more variety per credit, so v1.1 spends on them first.

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

  | Tier | Clay | Bronze | Silver | Jade | Gold | Platinum | Aeon |
  |---|---|---|---|---|---|---|---|
  | Mythic chance | 0 | 25 bp | 50 bp | 150 bp | 500 bp | set by `sim:drops` | set by `sim:drops` |

  (Capsule ladder, 2026-09-29: the 500 bp column was the old Aeon, now called Gold. Platinum and the new Aeon get values of at least 500 bp, non-decreasing, when Mythic is built, chosen so the expected rate below still holds.)

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
- About 1 Holo per 127 bag capsules (about 3 weeks for the engaged profile; 128 before the 2026-09-29 capsule ladder, whose foils stay purely rolled).

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

**Superseded in part by A18.10.** The milestones are M0-M8 in A18.10 (M1 cross-browser golden replays now, M2 Friend Duel after the War Path), with free-tier capacity per format and the owner's exact Cloudflare steps. The relay rules below stay; D1's Colyseus line (Part D) is superseded by the Durable Object relay.

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

## A17. A longer lane and eight ages

**Status (v1.3).** Written 2026-09-28 from the owner's two requests of the same day: a longer lane that the player scrolls back and forth, as in the classic Flash games of the genre, and more ages. Steps 1 and 2 of A17.16 are built (`SIM_VERSION` 2.0.0 to 2.2.0) and the assets of the three new ages are registered; balance work (step 4) is open. The values below are what was built. Where the build changed a number during implementation, this section states the built value and says so (the log is `docs/decisions.md`, "A17 step 1" and "A17 step 2"). A18 later replaces several A17 rules: formats become age windows and the XP thresholds follow the position in the window (A18.3), the Treasury becomes the War Council's Economy track (A18.5), stance gains a third mode and a flag (A18.4), and Conquest folds into the War Path (A18.7.10). Those places are marked "superseded by A18" below; until the A18 phase that replaces them is built, the build follows A17.


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
| Formats | Short 3 ages, Standard 4, Full 5 | Short 4 ages, Standard 6, Full 8 (superseded by A18.3.4: formats are windows of 3, 5 and 7 consecutive ages) |
| Cards | 35 units, 20 turrets, 10 powers | 56 units, 32 turrets, 16 powers |
| Front rank (built with step 1, A16.4 lever L4) | two wide | three wide |
| Siege (built with step 1) | turret damage −50%, base damage ×2, decay | also a forced march, a siege crowd at the gate and a falling gate (A17.3) |

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

**Superseded by A18.3.4.** A18 (owner decision D2) makes formats windows of 3, 5 and 7 ages with medians of about 7:00, 10:30 and 15:00. The clocks above are what the build uses until A18 phase 1 lands.

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
| Fort pads (A16.14) | p 240, 360, 460 | Home 160, 230, 300; Field 640, 820 (camps only) | Moved 2026-09-30 (A16.14 revision 2): a wall on 360 or 460 stopped the wave outside every Common turret's reach; on 300 it stops it at p 324, inside the 340-380 lu Commons |
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
| B3 tick cap | Full War ≤ 11,400 ticks | ≤ 12,900 ticks (10:45) | Longer Full War (A18.3.4 raises it to 21,000 ticks) |
| Front rank (built) | two wide | three wide: `economy.frontWidth` 3; the first three units of a file stand side by side (A2.7) | A16.4 lever L4: mirror Final Bell cut most, spam kept in check |
| Siege crowd (built) | none | `economy.siege.gateCrowdLu` 60: in Siege a unit may stand level with the ally ahead once that ally is within 60 lu of the enemy gate, so an army at the gate hits the base with every unit | The single file made a defended base unkillable |
| Falling gate (built, `SIM_VERSION` 2.2.0) | none | `economy.gateFall` { lu 120 → **300** (MVP balance pass 2026-10-01), hpBp 10,000 }: in Overdrive and Siege, a unit killed by an enemy unit, turret or unit ability within that distance of its own gate costs its base the unit's max HP, dealt as base damage by the killer (Siege ×2 applies; base-damage XP to the killer; never for summons, power or Last Stand kills, or in the tutorial) | A decided match ends instead of feeding bounties; Full War Bell 21% → 11.5% |
| Open gate (built, off) | none | `economy.openGateLu`: while a side has no ground unit within that distance of its gate, attackers close up as in the siege crowd in every phase. Off in the game content | Shortens Full War too much (median 7:19); Phase 3 decides with the owner |

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

Keys D (A16.14 forts), Q, W, B, T, E, S, L, P, F, Space, X (the Field power, power rework), 1-6 (1-5 until A18 phase 2) and Backspace keep their A2.12 meanings.

**Auto-follow (default On).** Each frame, from interpolated view positions:

1. **Fronts.** Each side's front is its frontmost ground unit (by own p). A side with only air units uses its frontmost air unit.
2. **Focus x.**
   - Both sides have units: focus = own front + min(gap / 2, 0.3 V), where gap = the distance from the own front to the enemy front (0 if they touch). In contact this is the midpoint; with a wide gap it looks 0.3 V ahead of your own front.
   - Only enemy units: focus = the enemy front. As built, while that front is still on the enemy's half the focus is the opening view, so the bot's first spawn does not fly the camera across the lane.
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
- **Updates.** Redrawn at 10 Hz or more (built: up to 30 Hz, which keeps the camera window smooth) on a small DOM canvas from the view's interpolated positions (cheap: at most 80 dots). As built, the fronts are drawn under the dots so the frontmost unit stays visible, and the bases are DOM medallions with an HP ring.
- **Colourblind presets** recolour it like everything else; the circle and diamond shapes keep sides apart without colour.

**Off-screen indicators.** Round 44 px badges with a chevron at the left or right edge of the lane band, at 35% of the band height, stacking up to 3 per edge (newest on top, 12 px apart). They never cover the centre 70% of the band, and they are transient, so A9.2's "no persistent control covers the lane band" still holds. Tapping a badge jumps the camera there (Manual).

| Badge | Shows when | Look | Sound | Lasts |
|---|---|---|---|---|
| Base under attack | The own base took damage in the last 2 s and the own gate is off-screen | Red pulse, base icon | `alert_base` once, then at most once per 10 s | Until 3 s after the last hit |
| Power incoming | Either side's power zone lies fully off-screen | Caster's colour, power icon, a countdown ring over the power's own telegraph (`telegraphMs`: 1.0 s built; 0.5-2.0 s with the power rework) | `power_telegraph` as usual (panned, A17.7) | Telegraph plus effect |
| Enemy Legendary | An enemy Legendary spawns off-screen | Legendary icon, enemy colour frame | none | 4 s |

### A17.6 Acting on things off-screen

- **Training.** Unchanged: units spawn at the own gate and auto-follow shows them walking out.
- **Turrets.** Mounts are still tapped on the base in the canvas. When the own base is off-screen:
  - the base button (or H) brings the base into view and stays Manual while the mount popover is open;
  - Q, W and B work from anywhere with no camera move (A2.12);
  - the base button shows a small hammer badge while an owned mount is empty and the player can afford the cheapest turret in the loadout;
  - an open mount popover or hover card closes when its anchor scrolls off-screen.
- **Age Power.**
  - Tap = auto-aim over p 150-1,850 whatever the view (superseded by A18.9.2: a tap starts aiming; power rework: aim and auto-aim stay inside the slot's legal band, A2.9.4). While following, the camera frames the zone (A17.4); while Manual, a "Power incoming" badge points at it.
  - Drag from the power button into the lane band places the zone as today. Within 48 px of the band's left or right edge the camera edge-scrolls at up to 1,200 lu/s during the drag, on touch too, so any point of the lane can be reached in one drag.
  - Drag onto the minimap: the zone preview shows on the minimap (and in the lane where visible); releasing casts at that p. Dragging back onto the button cancels, as today.
  - Space auto-aims (power rework: Space = Home, X = Field, each inside its band; no target is denied before payment).
- **Evolve, stance, Treasury (the War Council from A18.5), Last Stand, emotes.** HUD controls; no camera needed. The Hold flag (A18.4.2) can also be dragged on the minimap.
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

**Phone tray.** At 22% of 390 px the tray is 86 px: the 72 px cards (A9.2) fit with their name ribbon; the Army counter and stance flag shrink to one 40 px column. The planned top bar (a 20 px row over a 16 px minimap row inside 39 px) did not fit beside the Evolve button. As built, the minimap strip sits just under the top bar (10 px down on desktop, 6 px on phones) and overlaps the top of the phone's lane band, which is sky; the side panels shrink to 30 px and 26% of the width on phones. Six tray cards (A18.9) need the tray layout rechecked on 667 × 375.

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

**XP thresholds (replaces the A2.4 thresholds; superseded by A18.3.2).** Small steps cost less XP, big steps more. These are the built values. A18 (owner decision D1) replaces them with thresholds by position in the window (700, 1,250, 1,350, 1,450, 1,550, 1,650) and new XP sources, from A18 phase 1.

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
- **One power per age.** Superseded by the power rework (A2.9): two slots reload on their own, 1.5-3.5 paid casts per age are the target (A2.9.12), and the evolve carry is 75% per slot. The built rule: charge carries at most 50% across an evolve and refills the rest in 25 s (A2.9.14). Every age's threshold is at least 500 XP (≥ 28 s at 18 XP/s), so a player can fire each age's power once before evolving on. Stone's 550 lets the Stone power (ready at 0:50) fire just before Bronze.
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
| Tutorial | Stone, Medieval, Gunpowder, Modern, Future (built thresholds 680 / 690 / 520 / 700, retimed for the long lane) | none | none | none | never | Onboarding match 1 |
| Short War | Stone to Gunpowder (4 ages) | 3:45 | 4:45 | 6:15 | 1:00 | Ladder (all arenas), Skirmish, Quick Battle |
| Standard War | Stone to Modern (6 ages) | 5:00 | 6:45 | 8:30 | 1:00 | Ladder from Arena 2, Daily Challenge, Conquest (owner decision), Skirmish |
| Full War | Stone to Cosmic (8 ages) | 6:45 | 8:45 | 10:45 | 1:00 | Ladder from Arena 3, Skirmish |

This table is the built state. **Superseded by A18.3.4:** formats become windows of 3, 5 and 7 consecutive ages with longer clocks, and Conquest folds into the War Path (A18.7.10).

- Every ladder format is a range of consecutive ages from Stone. The tutorial alone skips ages: it keeps today's five-age highlight run ("ends with lasers") with its own thresholds, so match 1 is unchanged. The schema check is "increasing ages from Stone" for every format and "consecutive from Stone" for ladder formats (A18 relaxes "from Stone" to any window).
- The start screen's format labels read "up to 6 min", "up to 9 min" and "up to 11 min" (the Final Bell rounded up).

**Expected match flow (replaces A2.13; Full War, two mid-tier players).**

| Time | What typically happens |
|---|---|
| 0:00-0:15 | Both open with 2-3 units; the camera walks out with them; first clash near mid-lane (p ≈ 1,000) at ~0:13 |
| 0:30 | First turret; greedy players buy Treasury (the Economy track from A18.5) |
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
| phalangite | Phalangite | R | Anti-heavy | 100 | 255 (was 232) | 30 / 1.2 s | 65 | 70 | M | G | light bio melee | Reach; melee Anti-heavy mods (armored ×3.0); priority armored; Brace (new); starter kit |
| standard_bearer | Standard Bearer | R | Support | 110 | 151 | 9 / 1.2 s | 150 | 65 | S | G+A | light bio support ranged | Aura: allies within 160 lu deal +15% damage; followSupport |
| scorpion | Scorpion | E | Artillery | 200 | 330 | 64 / 3.0 s | 290 (min 60) | 45 | L | G | light mech ranged | Bolt pierces 3 targets total within 150 lu |
| bronze_colossus | Bronze Colossus | L | Siege heavy | 350 | **1,700** | 64 splash r45 / 2.0 s | 20 | 40 | H | G | armored mech melee legendary | Stomp: every enemy hit is slowed 20% for 1.5 s. Molten Heart: on death bursts for **100** splash r70 on ground enemies (MVP balance pass 2026-10-01: was 2,050 HP, 160; +14.2 → +1.6 points) |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| archer_tower | Archer Tower | C | 150 | 35 / 1.5 s | 370 | G+A | Single target |
| sun_mirror | Sun Mirror | C | 175 | 9 / 0.3 s | 230 | G+A | Instant beam of focused sunlight; high chip DPS, short range |
| onager | Onager | R | 250 | 95 splash r50 / 4.5 s | 480 (min 150) | G | Arc |
| gorgon_bust | Gorgon Bust | E | 250 | 55 / 6.0 s | 380 | G+A | Priority armored. Stone Gaze: stuns the target 1.5 s |

**W2 Bronze wave (X0, CONTENT_PLAN 5.2; released 2026-10-03; measured numbers, docs/decisions.md).** Capsule cards: Commons from Arena 2, Rares 3, Epics 4, the Legendary 5. New sim rule: the Dread aura (M4, `aura.foe`) and the ally speed aura (SIM_VERSION 7.1.0).

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|
| shield_bearer | Shield Bearer | C | Infantry | 50 | 240 | 16 / 1.0 s | 16 | 65 | S | G | Blunt; Guard (the oval shield takes 25% less from attacks with range ≥ 100) |
| thracian_raider | Thracian Raider | C | Infantry | 50 | 190 | 22 / 1.0 s | 16 | 90 | S | G | Raider (base 41) |
| rhodian_slingers | Rhodian Slingers | C | Ranged | 75 | 3 × 36 | 6 / 1.6 s | 180 | 65 | S | G+A | Squad of 3 (M1) |
| discus_thrower | Discus Thrower | C | Ranged | 75 | 90 | 12 / 1.6 s | 200 | 65 | S | G+A | Chain: the discus skips to 1 more enemy within 50 lu (`proj.discus`) |
| war_elephant | War Elephant | C | Heavy | 150 | 690 | 40 / 1.8 s | 20 | 60 | L | G | Cleave 2 (reach 30); armored; no charge bonus |
| cretan_archer | Cretan Archer | R | Ranged (Long range, H6) | 75 | 99 | 38 splash r35 / 2.4 s | 330 (min 90) | 60 | S | G | Arc 300 lu/s (`proj.arrow_arc`); half damage to bases |
| belly_bowman | Belly Bowman | R | Anti-heavy | 100 | 220 | 40 / 1.2 s | 200 | 65 | M | G | Ranged Anti-heavy mods; priority armored; Brace |
| aulos_piper | Aulos Piper | R | Support | 110 | 151 | 9 / 1.2 s | 150 | 65 | S | G+A | Aura: allies within 160 lu move 15% faster (instant `fx.note_pop`); followSupport |
| tragic_chorus | Tragic Chorus | R | Support | 110 | 166 | 9 / 1.2 s | 150 | 60 | S | G+A | Dread aura (M4): enemy ground units within 130 lu move 20% slower (instant `fx.wail_ring`); followSupport |
| wooden_horse | Wooden Horse | E | Siege | 200 | 800 | 12 (140 vs base) / 2.0 s | 12 | 45 | L | G | Siege only; riders: 2 spearmen poke 6 / 1.2 s (r40); on death 2 Hoplites jump out |
| amazon_rider | Amazon Rider | E | Skirmisher | 200 | 500 | 40 / 0.9 s | 16 | 95 | L | G | Pounce (search 180): rides around the blocker to a ranged or support unit, first strike ×2 |
| minotaur | Minotaur | E | Heavy (brawler) | 200 | 880 | 45 / 1.6 s | 18 | 60 | L | G | First hit ×2 and 40 lu knockback; Frenzy (M2) below 50% HP: +30% damage, +20% attack speed |
| hydra | Hydra | L | Heavy (legendary) | 350 | 1,230 | 48 / 2.2 s | 40 | 45 | H | G | Cleave 3 (reach 40; the three heads); every bite slows 20% for 1.5 s |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| net_caster | Net Caster | C | 175 | 28 / 1.5 s | 320 | G+A | `proj.net`; slows the target 30% for 2 s |
| polybolos | Polybolos | R | 250 | 3 bolts × 35 / 3.0 s | 420 | G+A | Volley 3 (`proj.bolt`) |

**Aura rules (SIM_VERSION 7.1.0).** `aura` takes `foe: true` for a Dread aura (M4): every tick the sim clears and recomputes the aura fields, so an aura ends the tick its victim leaves the radius (edge distance) or its source dies. A Dread aura with a `slow` (or `mark`) status sets the strongest such value on each enemy ground, non-fort unit within its radius; it never touches allies, air or the source, never stacks with another Dread aura, and a timed status of the same kind applies only when stronger (the timed one keeps its own duration). Each heal-grid pulse re-emits `statusApplied` for the victims so the slow mark shows. An ally aura now also takes `speedBuff` (the Aulos Piper): the stronger of it and a timed speed buff applies. Slows never stack with snares beyond the existing `max` rule.

Powers: Sandstorm (A5.7 whole-lane table) and Charybdis (A5.7). Forts: Hoplon Line and Slinger Camp (A16.14.4). Skins: Marble Hoplite, Sun Chariot, Obsidian Colossus (A5.8; procedural puppets like the other wave skins).

### A17.10 Industrial Age (P 2.12)

Theme: steam, rivets, rail and the first electric light, roughly 1850-1915. No gas weapons. Raw file: `src/content/raw/industrial.ts`.

| Slug | Name | Rar | Role | Cost | HP | Damage / interval | Range | Speed | Size | Hits | Tags | Traits and abilities |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| riveter | Riveter | C | Infantry | 50 | 330 | 42 / 1.0 s | 16 | 72 | S | G | light bio melee | Blunt. Big Wrench: the first hit of each engagement deals ×1.5 |
| carbineer | Carbineer | C | Ranged | 75 | 201 | 33 / 1.2 s | 250 | 65 | S | G+A | light bio ranged | Bullet |
| steam_golem | Steam Golem | C | Heavy | 150 | 1,187 | 89 / 1.5 s | 16 | 55 | L | G | armored mech melee | Piston Punch: first hit ×2 and 30 lu knockback |
| harpoon_gunner | Harpoon Gunner | R | Anti-heavy | 100 | 286 (was 260) | 55 / 1.2 s | 210 | 65 | M | G+A | light bio ranged | Harpoon; ranged Anti-heavy mods, armored ×3.0 (was 2.0, then 2.5 until the review of 2026-09-30); priority armored; Brace (new); starter kit. Reel In: the first hit of each engagement pulls the target 25 lu toward the gunner |
| flare_spotter | Flare Spotter | R | Support | 110 | 276 | 17 / 1.2 s | 200 | 65 | S | G+A | light bio support ranged | Priority armored. Every hit marks the target (+20% damage taken from all sources) for 3 s; followSupport |
| sapper | Sapper | E | Siege | 200 | 560 | 240 vs base / 2.0 s (12 vs units) | 12 | 85 | M | G | light bio melee | siegeOnly. Short Fuse: on death the charge goes off for 180 splash r60 on ground enemies (never the base) |
| land_dreadnought | Land Dreadnought | L | Siege heavy | 350 | **1,800** | **85** splash r40 / 2.2 s | 160 | 35 | H | G | armored mech ranged legendary | Two sponson gunners (riders) each shoot **6** / 0.5 s at range 160 (G+A); on death the crew bails out as 2 Carbineers (summoned) (MVP balance pass 2026-10-01: was 3,600 HP, 130, riders 10; +8.5 → +2.0 points) |

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
| graviton_halberdier | Graviton Halberdier | R | Anti-heavy | 100 | 985 (was 896) | 116 / 1.2 s | 70 | 70 | M | G | light bio melee | Reach; melee Anti-heavy mods (armored ×3.0); priority armored; Brace; starter kit |
| starwarden | Starwarden | R | Support | 110 | 582 | 36 / 1.2 s | 150 | 65 | S | G+A | light bio support ranged | Shield Beacon every 8 s while it has a target: the nearest 4 allies within 180 lu get a 200 shield for 5 s; followSupport |
| warp_stalker | Warp Stalker | E | Skirmisher | 200 | 1,600 | 140 / 0.8 s | 12 | 100 | M | G | light bio melee | Blink (10 s cooldown): when blocked, warps (0.4 s, untargetable by melee) to the nearest enemy ranged or support unit within 200 lu beyond the blocker; first strike ×2 (the pounce rule) |
| mothership | Mothership | L | Air gunship | 350 | **2,100** | **40** / 0.6 s | 180 | 40 | H | G+A | air mech legendary | Obeys stance. Drone Strike every **10 s**: the nearest enemy ground unit within 400 lu gets a strike after 1.0 s for **150** splash r50 (one call-in per side per 3 s). On death crashes for 350 splash r80 on ground enemies (MVP balance pass 2026-10-01: was 3,700 HP, 80, every 6 s for 300; +26.0 → +1.9 points) |

| Slug | Turret | Rar | Cost | Damage / interval | Range | Hits | Notes |
|---|---|---|---|---|---|---|---|
| ion_turret | Ion Turret | C | 150 | 27 / 0.3 s | 370 | G+A | Instant beam, single target |
| starburst_gun | Starburst Gun | C | 175 | 123 / 2.0 s | 240 | G+A | Hits the frontmost enemy in range and enemies within 90 lu behind it; max 4 targets |
| starfall_battery | Starfall Battery | R | 250 | 363 splash r60 / 5.0 s | 480 (min 180) | G | Arc |
| tachyon_lance | Tachyon Lance | E | 250 | 184 / 4.0 s | 420 | G+A | Instant; pierces 4 targets total within 250 lu |

**Age Powers of the new ages (join the A5.7 table).** Superseded by the power rework roster in A5.7 (2026-09-29), which lists all 48 powers with costs, reloads, slots and caps; the table below is the built state. Final numbers at the age's P and L1 loadouts; every power has a 1.0 s telegraph. "Per unit" follows A2.9 against the age's L1 Infantry and Heavy Commons.

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

**Bases, backdrops and Treasury art.** (The Treasury art is replaced by the War Council workshop glyph when A18.5 ships.)

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

**Art direction.** The palettes, silhouettes and clips above were written for the A11 house style and are what the built procedural puppets and sheets use (the Cosmic `cloth` zone is `#33264C` and Bronze `metal` is `#B09C78`/`#7A6C54` on units, to pass the colour rule; `docs/art-style.md`). The owner has since chosen an ultra-realistic direction (A11, A18.8.3); the restyle keeps the readability rules and the ids.

### A17.13 Meta, AI and other systems for 8 ages

**War Plan (A3).**

- A War Plan is **eight** Age Loadouts, one per age. The minimum to play stays 3 units and 1 turret per age used by the format.
- The starter kit holds every Common of all 8 ages (3 units and 2 turrets each) and each age's default power, all at L1.
- AA Rares: in the starter kit and slot 4 of every starter loadout since build phase H3 (2026-09-30; A5.1). Before that they came by script (Spear Hunter and Phalangite in capsule 1; Pikeman and Grenadier in capsule 2; Harpoon Gunner and Bazooka Trooper in the Age Unlock Capsules at Arena 2; Rail Gunner and Graviton Halberdier at Arena 3); the scripted capsules and Age Unlock Capsules now bring the Support Rares.
- The builder shows age tabs (one loadout visible at a time on phones) and the plan average over the ages the next format uses. Auto-fill, presets, "Equip now" and the deck advisor are unchanged.
- Save migration (WP8): every stored War Plan gains Bronze, Industrial and Cosmic loadouts filled with that age's starter Commons, both Common turrets and the default power; the collection gains the 15 new starter Commons at L1 and the 3 default powers. Nothing owned is lost (A15.1).

**Collection (A5.1).** 56 units + 32 turrets = 88 cards (40 Common, 24 Rare, 16 Epic, 8 Legendary), 16 Age Powers. Schema checks per age stay (7 units, 4 turrets, 2 powers); the totals move to these numbers. The power rework makes it 48 Age Powers, 6 per age (A5.7).

**Arenas and capsules (A6.3-A6.5).**

| Arena | Ladder formats | Drop pool (was) | Drop pool (A17) | Gate rewards change |
|---|---|---|---|---|
| 1 Tar Pits | Short | Ages 1-3 | Stone to Gunpowder (4 ages), no random Legendaries | none |
| 2 Frostfang Pass | Short, Standard | Ages 1-4 | Stone to Modern (6 ages) | Age Unlock Capsules: Industrial and Modern (was Modern and Future) |
| 3 Kingsmoat and up | All | All | All 8 ages | Gate 3 adds Age Unlock Capsules for Future and Cosmic |

- Onboarding script: capsule 1 (Bronze tier) guarantees Drum Shaman NEW and Standard Bearer NEW (Spear Hunter and Phalangite before build phase H3); capsules 2-5 as in A6.5.
- Age Capsules pick from 8 ages in the grant dialog. Roll algorithm, pity and odds unchanged.
- **Pacing.** The pool grows 60% (55 → 88 cards), so each card gets ~37% fewer copies per day. The owner chose to keep today's time to max a card (A17.18 question 5). The economy sim needed more than the ×1.4 first estimated: capsules carry about **×1.75** copies and Amber (built). Tiers (Common / Rare / Epic / Legendary copies, then Amber): Clay 4 / 1 / 1 / 1 and 105, Bronze 5 / 2 / 2 / 1 and 210, Silver 10 / 5 / 2 / 1 and 530, Jade 24 / 10 / 5 / 2 and 1,400, Aeon 26 / 10 / 5 / 2 and 2,640 (this row is the tier called Gold since 2026-09-29; the current ladder is A6.4). Median days to max a card by rarity: 119 / 108 / 68 / 109 (before A17: 114 / 114 / 71 / 109). Bag average 15.7 copies and 398.7 Amber. Upgrade costs are unchanged.

**Trophy Road (A6.3).** Alternate powers move so each unlocks near the arena that brings its age:

| Node | 100 | 150 | 200 | 250 | 300 | 350 | 400 | 450 | 500 |
|---|---|---|---|---|---|---|---|---|---|
| Today | Meteor Shower | Gate 2 | Royal Decree | Silver | Broadside | 100 D | Gate 3 + Carpet Bomber | 190 A | Nanite Surge |
| A17 | Meteor Shower | Gate 2 | Aegis | Royal Decree | Broadside | Zeppelin Raid | Gate 3 + Carpet Bomber | Nanite Surge | Warp Strike |

The displaced Silver Capsule, 100 Dust and Amber node join the 550, 600 and 650 nodes as second items, so no reward is lost. The Amber at its new place pays the node formula (230, not 190).

**Timings that follow the formats.**

| Item | Today | A17 |
|---|---|---|
| Quest "Reach your format's final age before" | 2:20 / 3:40 / 5:00 | 2:40 / 4:15 / 6:45 |
| Quest "Destroy a base before" | 6:00 | 6:00 (Short and Standard make it reachable) |
| Conquest star 3 | win before 6:00 (Full War) | Conquest plays Standard War (owner decision): win before 5:45. Superseded by A18.7.10 (Conquest folds into the War Path) |
| Title Evolver | first Future Age | first Cosmic Age |
| Title Speedrunner | final age before 4:30 in Full War | Cosmic before 6:15 in Full War |
| Feat Lightspeed | - | Future before 4:10 |
| Rewards by format (A15.8) | from today's medians | re-derived from the A17.2 medians at a 60% win rate: +26 / +31 / +36 trophies (1.60 / 1.63 / 1.60 per minute), Amber 20 / 27 / 35 |
| `ProfileStats.futureReached` | Future reached | counts matches that reached the game's last age (Cosmic); the field name stays, its label reads "Cosmic Age reached" |
| Codex Levels (A6.7) | ~81 levels | ~130 levels at the same 15 points per level |
| B5 procedural bake at boot | ages 0-1 | Stone and Bronze; the rest lazily |

**AI (WP3).**

- `src/ai/book.ts` already builds the age order from content, so the new ages need no brain code. Generals' personal War Plans (`src/content/generals.ts`) and procedural commanders gain the 3 new loadouts; ladder bots pick from the arena's drop pool as today.
- Lane constants in `src/ai/brain.ts` (gate zone, push gate, hold decisions) become lane-relative (offsets from the own gate for home rules, `L − x` for enemy-side rules) and are retuned once on the 2,000 lu lane.
- Evolve policy: "fire the power, then evolve" becomes the normal pattern with 7 evolves and the one-power-per-age thresholds; the existing evolve-vs-power scoring covers it.
- New cards score through existing ability kinds: Sapper like the Battering Ram (siege), Mothership like an air Legendary (the air-answer check), Scorpion like the Bronze Cannon (artillery), Flare Spotter through its mark, Gorgon Bust and Tesla Tower through their stuns.
- `Observation` is unchanged. Bots have no camera; the minimap gives the player the same whole-lane information (A17.1 principle 3).

**Daily Challenge, Skirmish, replays.** The Daily Challenge plays Standard War (now 6 ages; a seeded window of Standard length from A18.3.4). Skirmish offers all three formats. Old replays carry an older `contentHash` and show "from an older version" (B3), as today.

### A17.14 A2.14 targets (changes)

| Metric | Target today | A17 target |
|---|---|---|
| Full War median length | 7:00; 80% 5:00-9:00 | 8:30; 80% 6:45-10:15 |
| Standard War median | not listed | 6:30; 80% 5:00-8:00 |
| Short War median | 4:30 | 4:45 (4:15 ± 0:20 with the shorter clock) |
| First evolve | median 60 ± 10 s | median 52 ± 10 s |
| Later evolves | within ±20 s of A2.4; every scripted strategy reaches Future (Full War) between 4:00 and 6:15 | within ±20 s of A17.8; every scripted strategy reaches Cosmic (Full War) between 5:45 and 7:30 |
| One power per age (new) | - | In the Balanced mirror, ≥ 70% of age stays (Stone to the second-to-last age) include one power cast. Power rework: replaced by the casts-per-age row of A2.9.12 |
| First clash (new) | - | Median 0:11-0:16 |
| Contact in the middle (new) | - | Reported: share of match time the contact point lies between the two turret covers (p 480 to L − 480) |
| Camera (new, e2e) | - | Auto-follow keeps the contact point on screen ≥ 90% of match time in a 10-match bot-vs-bot run on an 844 × 390 viewport |
| Has-an-answer | as today | adds the 3 new Legendaries (A17.11) |
| Power damage per unit in zone | every damaging power | adds Tidal Wave, Iron Horse, Zeppelin Raid, Starfall |
| B3 performance | headless Full War ≤ 400 ms | ≤ 500 ms (up to 12,900 ticks) |

All other rows stay, including the Final Bell rows and their release rule. The whole table reruns after step 1 (lane) and again after step 4 (ages) of A17.16. A18.12 replaces the length, evolve and Bell rows when A18 phase 1 and 3 land.

**Measured after steps 1-2 and the falling gate (tier V Balanced mirror, 200 matches per format):** Final Bell Full 11.5% (gate ≤ 5%), Standard 10.0%, Short 9.0%; Full median 8:39 (passes 8:30 ± 0:30), 55.5% of Full Wars in 6:45-10:15 (target 80%); Standard median 6:59; first clash 0:13; camera e2e 96.5% of samples keep the contact on screen. Still open for Phase 3 and reported to the owner under the A16.5 release rule: the Full War Bell, the turtle band (35-45%), first evolve 1:12 (target 0:52) and Cosmic at 5:43 (target 6:30).

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

**Status (2026-09-28).** Step 1 built (`SIM_VERSION` 2.0.0; lane, march, forced march, three-wide front, siege crowd, camera, minimap, badges, culling, parallax, settings). Step 2 built (`SIM_VERSION` 2.1.0, then 2.2.0 with the falling gate; save v2). Step 3: the 21 unit, 12 turret and 3 base sheets and the backdrops, effects, sounds and music of the three ages are registered. Not done yet: sound panning and off-view fading (A17.7), the sharper 1.8 px/lu sheet tier, and step 4 (balance).

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
- Other sections edited when A17 was merged into this document (v1.3): A1 (table rows on crossing time, ages, turret range share), A2.1, A2.2, A2.4, A2.5, A2.9 (scan band), A2.10, A2.12 (camera keys), A2.13, A2.14, A3, A5.1 (counts), A5.7 (Paratroopers clamp, new powers), A5.8 (titles), A6.3-A6.5, A6.7, A6.10, A8 (camera in beats), A9.2 (phone split, minimap), A11 (palettes, seam, bases, skyline), A12 (camera moments), A13 (sounds, arrangements, key changes, panning), A14, A16.9, A16.15, A16.17 (Season 3 "The Bronze Age" is absorbed), B3, B5, B16, D1 (the sixth-age line).

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

All six were answered on 2026-09-28:

1. **Lane length.** Try 2,000 lu with 25% faster walking first? **Yes, built.** (1,800 lu stays the fallback.)
2. **Full War length.** Is a ~8:30 typical Full War (up to 10:45) fine, now that it holds all 8 ages? **Yes.** A18 later lengthens every format (D2).
3. **Conquest.** Keep Conquest in Full War, or move it to Standard War? **Standard War, built.** A18 then folds Conquest into the War Path (D5).
4. **Auto camera.** On by default for everyone, with a setting to turn it off? **Yes, built** (`Settings.autoCamera`, `Settings.edgeScroll`).
5. **Upgrade pace.** Keep today's time to max a card? **Yes:** capsules carry ×1.75 copies and Amber (A17.13).
6. **Later.** A "Late War" format that starts in the Industrial Age? **Answered by A18.3.4:** any window of consecutive ages is a format, and the player picks a start era in Quick Battle and Skirmish.

---

## A18. Harder, longer, deeper: pacing, ages, upgrades, difficulty, campaign and the road to online

**Status (v1.3).** Design, written 2026-09-28 from the owner's playtest feedback of the same day and the owner directions in `docs/decisions.md` (2026-09-28 evening and late). It replaces the proposal in `docs/design-history/a18-proposal.md` and resolves both reviews of it (A18.15). Inputs: `docs/research/a18-classics.md`, `docs/research/a18-upgrades-pacing.md`, `docs/research/a18-campaign-online.md`, DESIGN A1-A17. The owner delegated the open decisions; D1-D8 (A18.16) were taken as recommended on 2026-09-28. **This section wins over A1-A17 where they differ.** The edits A18.14 lists are applied to those sections, each marked with a pointer to A18. Nothing in A18 is built yet except the items in the next paragraph; each rule takes effect in the build with its phase in A18.13, and until then the build follows the older rule.

**Already built before A18 (2026-09-28).** Home is the hub from match 2 on; War Plan, Customize, Quick Battle and Skirmish open after match 1; the Charge/Hold flag is there from match 1 and the manual Last Stand button from match 2 (this is A18.13 phase 0's stance item); Quick Battle and Skirmish use the difficulty picker (Easy II, Normal IV, Hard VI, Expert VIII, Legendary X; `content.generals.difficulty`); the Rookie AI mistake bonus applies only in the onboarding matches and never when the player picked a difficulty. A18 does not redesign those. It says how the War Path and the War Council use them (A18.6, A18.7).

**Hard rules kept.** No real money, no energy, no lives, no timers. Bots are labelled AI everywhere (A7.1). The sim stays integer, seeded and deterministic; every new number is content data. Art goes through the ArtProvider and the visual manifest; the sim owns all timing. The name of the classic Flash game is never used.

---

### A18.1 The owner's points and where each is answered

| Owner point (2026-09-28) | Root cause (measured) | Answer | Section |
|---|---|---|---|
| "Too easy", "single player needs difficulty levels" | Tier II-V AI loses to a human-like script 88-100% | The picker (in flight), a War Path difficulty that stays meaningful in every region, AI research and stance use, a "few soldiers" proxy that must lose | A18.6 |
| "You win by just spawning a few soldiers" | The AI does not punish a thin army | Normal and up push when their army is ≥ 1.5× yours; `few_then_evolve` wins ≤ 10% vs Normal | A18.6, A18.12 |
| "You evolve far too fast", "you climb very quickly" | Middle ages last 31-37 s; kill XP snowballs for the winner | XP by position in the match, less kill XP, more passive XP; 60-125 s per age | A18.3 |
| "Matches finish too fast" | Endings follow lane combat; nothing to spend on besides units | Longer clocks, plus the War Council, plus a stronger AI | A18.3, A18.5 |
| "Too few ages, many missing" | 8 ages | 13 ages as the target; presentation themes now; new ages after the realistic art pipeline is proven | A18.8 |
| "Upgrades with money are boring; troops, abilities, turret range, money generation" | Treasury and mounts are linear buy-once numbers | The **War Council**: four tracks of 1-of-2 picks that differ in kind, visible to both sides | A18.5 |
| "Maybe add the hold/attack option" | Stance exists but is hidden until match 4 | Visible from match 1 now; then three stances and a Hold flag | A18.4 |
| "A level map like Candy Crush ... cool opponents" | Conquest is 9 matches | The **War Path**: one region per age, 10 levels each, short windows, objective variety, boss Generals | A18.7 |
| "Online multiplayer is the final goal" | Spike only (`server/`) | Milestones M0-M8; M1 now, M2 after the War Path | A18.10 |
| Earlier wishes: forts, underground, air, six troops, collection, lane features, clans, village, beautiful art | Partly designed in A16 | Scheduled in A18.9 and A18.13 | A18.9 |

**Design stance.** Longer matches are good only if every extra minute holds a decision. Slower XP alone removes ages from a match (Full War 8:48 today, 8:39 at 1.5× thresholds) and adds Final Bells. So pacing (A18.3) and the War Council (A18.5) ship together, never pacing alone.

**Pillar 2 (owner decision D1).** A1 Pillar 2 and A16.2 say "evolving is the best moment; keep it fast". A18 keeps every evolve a big moment (the A12 show, a new tray, new research ranks, a doctrine pick later, and a new mechanic in every new age, A18.8.3) but makes evolves rarer, and gives every age a middle.

---

### A18.2 Principles and budgets

1. **A decision in every minute.** In the middle of an age a player has at least: spawn choices, one research about every 60-90 s, a stance or flag choice, and an Age Power cast (with the power rework: one or two power decisions, which slot, where and whether it is worth the gold, A2.9). If playtests show standoffs, the Supply Cache (A18.3.5) adds a timed objective.
2. **Research is never retroactive.** A finished pick applies to units spawned after it completes; units already on the lane keep their stats. The completion shimmer on existing units is visual only and marks the timing.
3. **Picks differ in kind.** Two picks of a pair never differ only in size (+10% damage vs +12% HP). One answers swarms, the other Heavies; one pays in quiet games, the other in busy ones.
4. **Hard stacking caps** (all sources summed in bp: research, doctrines, relics, modifiers, weather, auras): damage dealt ≤ +35%; damage taken ≥ −35% (a floor: no unit ever takes less than 65% of a hit); max HP ≤ +30%; attack speed ≤ +25%; move speed ≤ +20% (forced march and slows apply after); unit range ≤ +60 lu; turret range hard cap **560 lu** from the own gate. The A16.1 budget (±20% additive, range +15%) still limits doctrines, weather and modifiers among themselves.
5. **Disclosed modifiers are allowed; hidden ones never.** Difficulty changes behaviour, not stats. The only stat differences between sides are disclosed on the node and the VS screen (boss base HP, extra turret, The Warden's L9 Legendaries, relics in single player).
6. **The winner is not paid twice.** Kill XP and base-damage XP are cut; bounty is cut; the side behind gets cheaper research.
7. **Content is data.** Every pick, threshold, clock, level, objective and boss rule is a table in `src/content`. The only new sim code is listed in A18.11.

---

### A18.3 Pacing: longer ages, longer matches

#### A18.3.1 What an age should feel like

| Beat | Length | What happens |
|---|---|---|
| Arrival | 15-20 s | New tray, Vanguard pair, new units march out, the next research rank may open |
| Middle | 40-60 s | One research, the first fight with the new troops, one Age Power cast (power rework: 1.5-3.5 paid casts per age over the Home and Field slots, A2.9.12) |
| Push | 20-35 s | Saving for the evolve, timing it against the enemy's research ring and power ring |

| Position in the match's age window | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th (final) |
|---|---|---|---|---|---|---|---|
| Target median stay (Balanced mirror) | 60-75 s | 90-105 s | 95-110 s | 100-115 s | 105-120 s | 110-125 s | to the end |
| Today (tier V mirror, Full War) | 72 s | 55 s | 50 s | 31 s | 35 s | 50 s | 49 s |

The first age stays shortest, so a new player sees the first evolve by about 1:10. No age after the first may have a median stay under 75 s.

#### A18.3.2 XP rules (replace the A2.4 source table and the A17.8 thresholds)

| XP source | Today | A18 |
|---|---|---|
| Passive trickle | 4 XP/s | **5 XP/s** (×2 in Overdrive and Siege, unchanged) |
| Kill by a unit, turret or unit ability | 100% of the victim's card cost | **70%** |
| Losing your own unit (not summons) | 40% | **50%** |
| Damage to the enemy base | 12 XP per 1% of its max HP | **8 XP per 1%** |
| Kills by powers or Last Stand | 0 | 0 |
| Underdog bonus | +50% | +50% |

**Thresholds follow the position in the window, not the age.** Every card costs the same in every age (A2.3), so XP income does not depend on the age. `FormatDef.xpToNextOverride` holds them per format:

| Evolve out of the window's | 1st age | 2nd | 3rd | 4th | 5th | 6th |
|---|---|---|---|---|---|---|
| XP needed | **700** | **1,250** | **1,350** | **1,450** | **1,550** | **1,650** |
| Expected rate (XP/s, active play) | ~10 | ~12.5 | ~13 | ~13 | ~13.5 | ~13.5 |
| Expected stay | ~70 s | ~100 s | ~104 s | ~111 s | ~115 s | ~122 s |

- These are starting values between the measured `x15kc` and `x15p` patches, with the first age protected (1.5× on Stone made the first evolve 2:02). They are tuned once, after the War Council is in (A18.13 phase 3), never before: slowing XP fully and then adding research overshoots.
- The XP cap stays 1.5× the current threshold. In the final age Overcharge (A2.4) uses 1,650 XP per +25% charge.
- Passive XP alone reaches the second age at 2:20, so nobody is frozen in an age.
- The tutorial keeps its own thresholds (250 / 300 / 350 / 400).

#### A18.3.3 Gold (changes to A2.3)

| Rule | Today | A18 | Why |
|---|---|---|---|
| Starting gold | 175 | 175 | |
| Passive income | 6 gold/s | 6 gold/s | Longer matches already give more gold; research absorbs it |
| Treasury | 3 levels, +1.5 gold/s each | **Replaced by the Economy track** (A18.5.5) | Choices instead of a linear buy |
| Kill bounty | 60% of cost | **50%** | Longer matches pay more kills; the leader must not buy research first on the winner's gold |
| Evolve price | none | none | A gold price made spam win 83-92% (A16.2) |

Expected gold per side: Short ~6,500, Standard ~9,800, Full ~14,000. Research takes 15-25% of it (A18.12).

#### A18.3.4 Formats become age windows (replace the A17.8 format table)

A format is a **window of consecutive ages**. `FormatId` becomes an open string key into `content.formats`; each `FormatDef` already lists its ages, and the sim already advances by position (`ctx.fmt.ages[s.ageIndex]`). A Rome-to-Medieval window is one more `FormatDef`. `ReplayDoc` already stores the format key, and the content hash makes a replay self-describing.

| Format | Ages in the window | Evolves (expected) | Overdrive | Siege | Final Bell | Median target | 80% of matches | Start screen label |
|---|---|---|---|---|---|---|---|---|
| Tutorial | Stone, Medieval, Gunpowder, Modern, Future (scripted) | scripted | none | none | none | ~2:30-3:00 | | |
| Short War | 3 | ~1:10, ~2:50 | 5:00 | 6:30 | 8:30 | **7:00** | 5:30-8:30 | "about 7 min" |
| Standard War | 5 | ~1:10, 2:50, 4:35, 6:25 | 8:00 | 10:00 | 12:30 | **10:30** | 8:30-12:30 | "about 10 min" |
| Full War | 7 | ~1:10, 2:50, 4:35, 6:25, 8:20, 10:20 | 12:00 | 14:30 | 17:30 | **15:00** | 12:00-17:00 | "about 15 min" |
| Last Base Standing (`last`, kind `untimed`; A2.10.1) | 7 | as Full War | 12:00 | 14:30 (Siege I; II 17:00, III 19:30, Crumble 23:00, Crumble II 24:30) | **none** (a base falls by 25:44) | ~19:50 (measured) | ~11:00-25:30 | "no clock" |

**Plate labels (2026-10-01).** The Home length picker names these Short, Medium, Long and No clock, and the line under it quotes the upper bound: "3 ages · up to 8½ min", "5 ages · up to 12½ min", "7 ages · up to 17½ min", "7 ages · no clock" ("no trophies" is in the info panel, so the line never wraps on a phone). The "about N min" labels above stay in info panels. The upper bound is what the plate promises because the Standard mirror reaches the Bell in about 59% of tier VII matches today (A16.14.9 review), so "about 10 min" would mislead.

Shorter windows (War Path, Daily, custom) use these clocks:

| Window length | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Overdrive / Siege / Final Bell | 3:30 / 4:30 / 6:00 | 4:15 / 5:30 / 7:15 | Short War | 6:30 / 8:15 / 10:30 | Standard War |
| Median target | ~4:30 | ~5:45 | 7:00 | ~8:45 | 10:30 |

- **Which window.** Quick Battle and Skirmish: the player picks the format and a start era (default Stone). Ladder: Arenas 1-2 start at Stone; from Arena 3 the window is the **Era of the Week**, seeded weekly in `meta` from the date and shown on Mode select a week ahead; the sim only receives the resolved format key. Daily Challenge: its own seeded window, Standard length. War Path: fixed per level (A18.7.3).
- **Starting in a later age.** The base starts at that age's P and HP; everything else is as at 0:00. Underdog, older-age turrets and Modernise compare global `AgeDef.index` (A17.15 rule 4).
- **War Plan.** A plan holds one loadout per age; a match uses only the loadouts of its window. Auto-fill fills a missing loadout from starter Commons, so a plan is never unplayable.
- **Old names.** "Full War" no longer means "all ages". Titles that say "reach Cosmic" become "reach the last age of your window".
- **Performance (B3).** Full War up to 17:30 is 21,000 ticks; the headless budget becomes ≤ 850 ms per Full War on desktop Node. Balance tools measure Short and Standard on every run and Full only at gates.

#### A18.3.5 The Supply Cache (a mid-age event, built only if needed)

If the owner playtest after phase 3 (A18.13) shows standoffs in the 880 lu gap, the Supply Cache ships:

- A crate drops at p = 1,000 at fixed match times from content (Short 2:30 and 4:30; Standard every 2:30 from 2:30; Full every 2:30 from 2:30), announced 5 s ahead on both minimaps.
- The first side with ground units alone within 60 lu of it for 5 s gains **150 gold** (flat, no XP). Air, powers and burrowed units cannot claim it. Unclaimed after 30 s, it vanishes.
- Gate: Final Bell unchanged or lower; turtle proxy still in its band; median decisions per minute in the middle of an age (spawns, research, stance, power) ≥ 6.

---

### A18.4 Stance and the Hold flag (replace the A2.7 stance rules and the A2.12 row)

#### A18.4.1 Now: the toggle from match 1

The existing Charge/Hold toggle ships visible from match 1 by flipping `training.stanceEnabled` in onboarding. No sim change, no contract change (A18.13 phase 0). **Built 2026-09-28**, with one hint in match 1.

#### A18.4.2 Three stances

| Stance | Behaviour | Button |
|---|---|---|
| **Charge** (default) | As today: units advance and fight | Crossed swords |
| **Hold** | Ground units hold at the side's **Hold flag**: units beyond it with no target walk back at 70% speed; units behind it do not pass it; engaged units keep fighting | Flag |
| **Fall back** | Ground units with no target walk back to p = 200 at full speed, then hold there; engaged units keep fighting until their target dies or leaves range | Shield |

- **The Hold flag.** Default p = 320. While Hold is active the player drags the flag on the lane or the minimap to any p in **[320, 800]**, snapped to 20 lu. Every modifier that moves the flag (Sally Port) is clamped to the same range. Command `stance { mode, holdP? }`; the sim clamps `holdP`.
- **Stance cooldown.** A stance change is accepted at most once per **3 s** (`battle.stanceCooldownMs` 3,000); a flag move is accepted at most once per 1 s. A rejected change is shown on the control with a short fill.
- **Engagement.** A unit is "fresh" after 4 s with no target. A fresh unit's first hit is its engagement's first hit; after that the unit is fresh again only after 4 s with no target. Stance changes never reset it. All "first hit" bonuses (Rush, Ambush) read this flag, so toggling stance gains nothing.
- **Controls.** A three-segment control above the tray on the right, 48 px tall on phones; **S** toggles Charge and Hold, **Shift+S** is Fall back. A small flag shows over the own front. Air gunships obey stance; the bomber does not.
- **AI.** Hold at the flag when the push gate fails, placed where its turrets cover or where its army value is highest; Fall back when its army is under 0.5× the enemy's and the enemy is past mid-lane. Tiers 0-II never move the flag; tiers V and up use Fall back.
- **Taught** at War Path Stone L2 (A18.7.5).

---

### A18.5 The War Council: in-battle upgrades with real choices

A round button right of the gold counter (it replaces the Treasury tap target) opens the **War Council**. It has four tracks. Research runs in **one slot**, one item at a time. Owned picks are kept across evolves and apply to later units of the same class.

#### A18.5.1 Rules

- **Command.** `research { track, group?, rank, pick }`, replacing `treasury`. Valid when the rank is unlocked, the previous rank of that track (and class group) is owned, the slot is free and gold suffices. Gold is paid at the start. Validation lives in `sim/commands.ts` with reject codes like the others.
- **Time.** Rank I 10 s, rank II 14 s, rank III 18 s, in ticks. Research continues through Ascension. Cancel refunds 75%.
- **Underdog discount.** A side whose age position is lower than the enemy's, or whose base HP is 20 or more percentage points lower, pays **−20%** for research started while that holds (integer, rounded down).
- **Ranks unlock with the window:**

  | Window length | Rank I | Rank II | Rank III |
  |---|---|---|---|
  | 1 | from start | | |
  | 2 | from start | 2nd age | |
  | 3 | from start | 2nd age | 3rd age |
  | 4-5 | from start | 2nd age | 4th age |
  | 7 | from start | 3rd age | 5th age |

- **Applies from spawn.** A pick applies to units spawned after it completes (A18.2 rule 2). Turret, base and economy picks apply at once, since those objects are updated only by research, never by per-tick stat code.
- **Public.** The researching side's base shows a workshop glyph with a progress ring and the item's icon; the opponent's HUD shows it too, and finished picks join the Scouted list. Completion plays a stinger and a shimmer on affected units.
- **Math.** All integer bp. For a unit stat: final = card value at its level (A6.6) × (10,000 + Σ bp of research, doctrine, relic, modifier) / 10,000, truncated, then clamped to the A18.2 caps.
- **Never touches** XP, the clock, train time or Overdrive multipliers.
- **Hashing.** `SideState.research` is hashed as an owned-picks bitmask integer plus the current item and its end tick.

#### A18.5.2 Track 1: Troops (per class)

Each class has its own line, bought separately. Epics and Legendaries count in their base role's class. Rank I is a stat choice of different kinds; rank II an ability; rank III an elite pick (v1.1).

| Class | Rank I (150 g): 1 of 2 | Rank II (300 g), ability: 1 of 2 | Rank III (500 g, v1.1): 1 of 2 |
|---|---|---|---|
| Infantry | **Weapons**: +10% damage · **Mail**: each hit taken −N flat (N = 25% of that age's Infantry Common L1 damage; a hit never drops below 1) | **Shield Wall**: −20% damage from attackers with range ≥ 100, −8% speed · **Rush**: +15% speed, first hit of each engagement +30% | **Veterans**: +8% damage per kill, up to 3 stacks · **Second Rank**: the second rank strikes (reach 1) |
| Ranged | **Weapons**: +10% damage · **Long Draw**: +30 lu range, −8% attack speed | **Fire Arrows**: hits burn 3 s at 15% of hit damage per second · **Pierce**: shots also hit the next enemy within 40 lu for 50% | **Marksmen**: +25% damage vs Heavy · **Quick Nock**: +18% attack speed |
| Heavy | **Plating**: −15% damage taken from Infantry · **Weapons**: +10% damage | **Trample**: first hit knocks back 30 lu · **Bulwark**: allies within 60 lu behind it take −10% damage | **Juggernaut**: immune to knockback and pulls · **Breaker**: +25% damage to bases and structures |
| Anti-armor | **Hunters**: +12% damage vs armored · **Lightfoot**: +12% speed | **Ambush**: first hit of an engagement +40% while Holding · **Skirmish**: −20% damage taken from Infantry | **Tank Killers**: +20% damage vs mech · **Harriers**: +15% attack speed |
| Support | **Field Care**: heals and shields +20% · **Mail** (as Infantry) | **War Drums**: allies within 160 lu +8% attack speed · **Rally**: allies within 160 lu −10% damage taken | **Miracle**: once per age per side, the first own unit to die within 160 lu of a Support revives at 30% HP without Veterans stacks · **Banners**: aura radius +50% |
| Air (with the class, A18.9) | **Weapons**: +10% · **Evasion**: −20% damage from turrets | **Strafing Run**: +20% vs moving ground units · **Loiter**: +25% time over the target | **Aces**: +15% attack speed · **Heavy Payload**: bomb splash +30% |
| Underground (with the class, A18.9) | **Quick Dig**: +20% burrowed speed · **Shoring**: +15% HP | **Surprise**: first hit after surfacing +40% · **Deep Tunnel**: surfaces 120 lu further | later |

- **Budget.** One class to rank II costs 450 gold, to rank III 950. A Standard War research budget of ~1,500-2,500 gold buys 5-8 items, so a player specialises in 2-3 classes: that is the build.
- **Research compatibility.** The War Plan builder shows, per age loadout, which classes it holds, so a player sees that a Heavy line is wasted in an age with no Heavy. The Council marks a class with no unit in the current loadout "Not in this tray".
- **Kinds.** Rank I and II picks use existing kinds: stat bp, range, attack speed, speed, `firstHitBonus`, auras, `resist`, knockback, flat damage reduction (a new `resist` variant, part of the phase 2 sim work). Fire Arrows ships in v1 only if a damage-over-time status already exists; otherwise it moves to v1.1 with Pierce, Veterans, Miracle, Second Rank and Juggernaut.

#### A18.5.3 Track 2: Defences

| Rank | Pick A | Pick B |
|---|---|---|
| I (150 g) | **Watchtowers**: turret range +40 lu | **Quick Loaders**: turret attack speed +15% |
| II (300 g) | **Engineers**: Modernise costs −50% and takes 0.5 s; fort build time −40% | **Arsenal**: turret damage +12% |
| III (450 g, v1.1) | **Keep Walls**: base max HP +10% | **Sally Port**: units spawn 60 lu further forward and the Hold flag range becomes [380, 800] |

- Range comes from rank I only, so it cannot be stacked twice inside the Council. Relics and modifiers may add more, up to the 560 lu hard cap; the gap between the two covers never falls below 880 lu.
- Gate: the turtle and `tech_turtle` proxies stay in the turtle band (A2.14). If Watchtowers fails the pick-flip gate against Quick Loaders, Watchtowers becomes +30 lu.
- When forts ship (A18.9, A16.14): the wall pick is **Engineers** (scaffolds 5 → 3 s). Watchtowers, Quick Loaders and Arsenal stay mount research and never apply to field towers. No other fort research in phase 6; a fort line waits until the A16.14.9 gates hold in production.

#### A18.5.4 Track 3: Economy (replaces Treasury)

| Rank | Pick A | Pick B |
|---|---|---|
| I (150 g) | **Granary**: +1.5 gold/s | **Forage**: +40% kill bounty for kills made in your own half (p ≤ 1,000) |
| II (300 g) | **Market**: +2 gold/s | **Bounty Hunters**: kill bounty 50% → 65% everywhere |
| III (450 g, v1.1) | **Guildhall**: +2.5 gold/s, but your unit queue holds one fewer unit | **Levy**: Common units cost −12%, passive income −1 gold/s |

- Every rank-I price is 150 g in every track. Granary pays back in 100 s; Forage pays a defender under pressure; Bounty Hunters pays in busy games and Market in quiet ones. Guildhall trades burst spawning for income; Levy trades income for cheap Commons.
- Economy income is never doubled by Overdrive. There is **no second research slot** anywhere.
- Rejected: interest on banked gold, gold from XP, anything that multiplies with Overdrive.
- **Migration.** Treasury disappears as a control. Saved plans, AI profiles (`Treasury max` column in A7.3) and HUD switch to the Council.

#### A18.5.5 Track 4: Command

| Rank | Pick A | Pick B |
|---|---|---|
| I (150 g) | **Signal Fires**: Age Power charges 15% faster (power rework: both power slots reload 15% faster) | **War Horns**: while Charging, ground units +8% speed; while Holding with the flag at p ≤ 480, units at the flag +10% damage |
| II (300 g, v1.1) | **Survey Corps**: power zones +20% wider (power rework: aimed zones only; a Home zone still lies wholly in your half; caps unchanged) | **Master Gunners**: power damage and heals +12% (and shields) |
| III (450 g, v1.1) | **Reserve Charge**: power charge kept across an evolve 50% → 70%. Power rework: replaced by **Quartermasters**: Age Powers cost 20% less (the evolve carry is already 75%) | **Last Stand Drill**: Last Stand arms at 35% base HP and hits 20% harder |

Power kills still pay 30% gold and no XP. Reserve Charge and Last Stand Drill must pass the `fallback_turtle` and power-banking proxies; Quartermasters must pass the `power_hoarder` and `home_turtle` gates (A2.9.12). The research effect `powerCharge` becomes `powerReload` with the rework, and Quartermasters adds `powerCost` (A2.9.11).

#### A18.5.6 How it fits with card levels, doctrines and relics

| System | Relation |
|---|---|
| Card levels (A6.6) | Unchanged; research multiplies with them. Ranked and Daily use Standard levels (A16.7) |
| Evolve doctrines (A16.10) | Stay the free pick at evolve; may not duplicate a research pick; same caps |
| War Relics (A18.7.8) | Single player only; same caps |
| Modifiers (A16.8) | War Path and Daily may lock a track ("No Council") or discount one ("Cheap Drills"), always disclosed |

#### A18.5.7 UI

- **Button.** Round, right of the gold counter; a ring while research runs, a dot when something is affordable. **G** opens and closes it. T is freed.
- **Sheet.** A bottom sheet over the tray, never the lane; the game keeps running. Four track cards, each showing its next item (Troops shows the class icons with rank pips). Tap a card to flip it to its two picks: icon, name, one-line effect, cost, time. At most 2 decisions on screen (A15.13).
- **Advisor.** On Easy and in War Path regions 1-2, one pick is outlined "Suggested" with a reason ("They have many Heavies"). Never on Hard and up.
- **Enemy.** The enemy's research icon and ring show on their base and in the top-bar enemy panel.
- **Motion (A12).** The sheet slides up in 180 ms ease-out; the chosen pick stamps into the slot; completion sends a shimmer along affected units, a class badge pops, the workshop glyph bursts. Reduce motion uses fades.
- **Look.** v1: one badge per pick plus a class-coloured shimmer. Later, per-age looks through the manifest (`research.<id>.<ageId>`, falling back to `research.<id>`). Art never changes numbers.

#### A18.5.8 AI use

- **Utility (A7.2 addition).** Research score = personality weight by track × (value over the rest of the age − value of the units the gold would buy now) + counter value against scouted enemy classes + a timing bonus for a push planned at completion.
- **Tiers (A7.3 columns).** Research is public to every tier; tiers differ in how they use it.

  | Tier | First research | How it picks | Uses enemy research |
  |---|---|---|---|
  | 0-I | after 1:30, then every ~90 s | seeded random among affordable | no |
  | II-IV | after 1:00 | the pick's `aiHint` | no |
  | V-VI | after 0:45 | counter scoring | pushes when its own Troops rank completes |
  | VII-X | from 0:30 | counter scoring | times pushes and evolves to its completions and away from the enemy's |

- **Generals' research styles:** Captain Kettle: Infantry Rush, Forage never; Mama Moss: Defences first; Baroness Ledger: Economy first, Guildhall; Sgt. Boomsworth: Command and Ranged; Madame Tempest: Signal Fires, Reserve Charge (Quartermasters with the power rework); Rook: counters your scouted classes.

---

### A18.6 Difficulty in single player

**Principle.** Difficulty changes **how** the AI plays, never its stats (A18.2 rule 5). Easy to Normal is the smallest step.

#### A18.6.1 Quick Battle and Skirmish

They use the picker as it ships: Easy II, Normal IV, Hard VI, Expert VIII, Legendary X, plus the behaviour flags below.

#### A18.6.2 War Path

Each region has a Normal base tier; the level role adds `tierOffset` (A18.7.2); the difficulty adds its own offset; the result is clamped to [0, X]. Because tiers clamp at the top, every difficulty also carries **behaviour flags**, so each step changes play in every region.

| Region (8-age map) | Stone | Bronze | Medieval | Gunpowder | Industrial | Modern | Future | Cosmic |
|---|---|---|---|---|---|---|---|---|
| Normal base tier | 0 | I | II | III | IV | V | VI | VII |

With 13 regions the Normal bases run 0, 0, I, I, II, III, III, IV, V, V, VI, VII, VII in map order.

| Difficulty | Tier offset | Behaviour flags |
|---|---|---|
| Easy | −2 (min 0) | Never pushes before its first evolve; research late and random; never moves the flag; pauses 5 s after each of its pushes |
| Normal | 0 | Punishes a thin army: pushes when its army value is ≥ 1.5× yours; research by `aiHint` |
| Hard | +1 | As Normal, plus counter scoring for units and research, Hold flag use, saves gold for counters (A16.3) |
| Expert | +2 | As Hard, plus the wave game (A16.3) and push timing to research completions |
| Legendary | always X | As Expert, plus evolve timing against the player's research ring and a boss-phase plan on every level |

- In Cosmic this gives Easy V, Normal VII, Hard VIII, Expert IX, Legendary X. At Stone Easy and Normal are both tier 0 and differ by flags only.
- The node and the VS screen show the resulting tier ("AI · Rook · Tier IX").
- **No hidden bonus.** Opponents use Standard L8 levels; The Warden keeps its disclosed L9 Legendaries. If the owner later wants Legendary harder still, the only allowed lever is a disclosed head start (owner decision D7; recommended: not needed).
- **Rookie AI** (A7.1) still applies to the first 20 matches of a save and is still disclosed. Daily keeps Recruit, Veteran and Warlord mapped to Easy, Normal and Hard.

---

### A18.7 The War Path (saga-map campaign)

The War Path is the centre of Home (owner direction). A scrolling map in the Candy Crush style: a winding road through one landscape per age, each node a battle, the next node always under a big Play button with the difficulty picker (default Normal, remembered per save). Quick Battle, Daily and Ladder sit around it.

#### A18.7.1 Size

| | Now (8 ages) | With 10 | 12 | 13 |
|---|---|---|---|---|
| Regions | 8 | 10 | 12 | 13 |
| Main levels (10 per region) | 80 | 100 | 120 | 130 |
| Side nodes (2 per region, optional) | 16 | 20 | 24 | 26 |
| First pass (median level ~5:30) | ~7.5 h | ~9 h | ~11 h | ~12 h |

A new age's region is inserted at its place in history. Players past that point see it marked "New region" and may play it any time; nothing cleared is locked again. Level ids are stable forever (`wp.<ageId>.l05`, side nodes `wp.<ageId>.s1`).

#### A18.7.2 The sawtooth inside a region

| Level | Role | Tier offset | Window | Target win rate (tier-matched player bot, Normal) |
|---|---|---|---|---|
| 1 | Intro: the region's new thing | −1 | region age only | 85-95% |
| 2 | Practice | 0 | 2 ages | 65-80% |
| 3 | Mix (card unlock node) | 0 | 2 ages | 65-80% |
| 4 | Feature: a lane feature or special objective | 0 | 2 ages | 60-75% |
| 5 | **Lieutenant** (mini-boss, marked Hard) | +1 | 3 ages | 40-55% |
| 6 | Relief: a fun modifier | −1 | region age only | 80-90% |
| 7 | Ramp | 0 | 2 ages | 60-75% |
| 8 | Counter puzzle: the enemy plan punishes one class | +1 | 2 ages | 50-65% |
| 9 | **Spike** (marked Hard) | +1 | 2 ages | 35-50% |
| 10 | **Boss General** | +2 | 4 ages (fewer in regions 1-3) | 25-40% |

A window "of 2 ages" is the region's previous age and its own; windows never reach past the region's age, and in region 1 every window is Stone only. So the region's new age is on screen for most of every level. Bosses in regions 2 and 3 use 2 and 3 ages. No War Path level uses a 5-age or longer window.

#### A18.7.3 Objectives (data, so levels differ in kind)

| Objective | Rule | Where it lives |
|---|---|---|
| Destroy the base | Default | Sim (today) |
| Hold out | Win if your base stands at a set time (for example 4:00) | Sim: `MatchConfig.victory { kind: 'survive', atMs }` |
| Take the tower | Win by destroying one marked enemy turret (a marked fort is a later proposal: it needs `SideMods.preFort` and `VictoryRule.target { fortPad }`, A16.14.5) | Sim: `victory { kind: 'target', slot }` |
| Fixed loadout | You play a given War Plan: a puzzle | Meta (builds the `SideConfig`) |
| Mid-battle start | The level starts from a preset state: a seed plus a stored command prefix, simulated before the first frame | Meta, replay tools |
| Fast win | Win before a set time | Star goal (meta) |

Roles 4, 8 and at least two other levels per region use a non-default objective or start. "Hold mid-lane for 60 s" waits for v1.1.

#### A18.7.4 Stars, crowns and goals

- **★** win. **★★** win and meet the disclosed goal on the node (base above 50%, win before the Final Bell, at most 3 unit types, all turrets alive, no Legendary, at most 3 research items, and so on). **★★★** win and meet the goal on Hard or harder.
- **Crowns** record the highest difficulty beaten on the level (bronze Easy, silver Normal, gold Hard, jade Expert, star Legendary). Stars measure skill goals, crowns measure difficulty.
- Stars never block progress; the next region opens when its boss is beaten once on any difficulty.
- **Retry is free and instant.** After 3 losses in a row the result offers "Try Easy" and one A15.12 tip. A level never quietly gets easier.

#### A18.7.5 Teaching one thing at a time (8-age map)

| Where | New thing |
|---|---|
| Stone L1 | Train, the lane, destroy the base (today's training match vs Old Grogg) |
| Stone L2 | **Stance**: the enemy rushes; winning needs Hold, then Charge |
| Stone L3 | Turret on a mount |
| Stone L4 | Age Power, dragged onto the lane. Power rework: the Home power, its gold cost and its reload ("Powers cost gold, then reload."); the band teaches "your half" (A2.9.10) |
| Stone L5 first clear (or 150 trophies) | Power rework: the **Field slot** unlocks with its ceremony ("A second power: Field!"); L6 is the first level to use it |
| Stone L6 | **War Council: Economy** (the button appears with Granary and Forage) |
| Stone L7 | Troops rank I, advisor on |
| Stone L8 | Defences rank I (enemy Ranged outranges plain turrets) |
| Stone L10 | First boss: Pip Quickstep |
| Bronze L1 | **Evolving** (first 2-age window) |
| Bronze L3 | Troops rank II |
| Bronze L4 | **Forts** (once the card type ships): its first clear, or 400 trophies, unlocks the Fort slot with the 8 walls and the Stone Camp, Trap and Tower; the level teaches "drag a wall onto a pad" and "Heavies break walls" and nothing else (A16.14.6). A player who unlocks by trophies gets a one-time in-battle hint instead |
| Bronze L6 | Command track |
| Medieval L1 | Doctrines at evolve (when shipped) |
| Medieval L4 | The Hold flag and Fall back |
| Gunpowder L1 | **Underground** (when shipped) |
| Industrial L1 | **Air** as a full class (when shipped) |
| Modern L1 | Council rank III (v1.1) |
| Each region L4 | One lane feature (A15.16, A16.9) once they ship; in the region whose L4 teaches forts (Bronze, later Nile) the lane feature moves to L7 |

When Nile and Rome arrive, evolving moves to Nile L1 and forts to Nile L4 (A18.8).

#### A18.7.6 Boss Generals

Every boss is labelled "AI General", with its tier, its War Plan and its research style.

| Region | Boss | Style | New? |
|---|---|---|---|
| Stone | Pip Quickstep | Balanced beginner | exists |
| Nile | Queen Sethra of the Dunes | Monuments and walls, Holds, bursts out with chariots | new (with Nile) |
| Bronze (Hellas) | Captain Kettle | Rusher | exists |
| Rome | Legate Varro Ironhand | Two classes to rank III, Shield Wall, pushes on completions | new (with Rome) |
| Norse | Jarl Ingrid Stormaxe | Bounty Hunters, always Charges, pushes after evolves | new (with Norse) |
| Medieval | Mama Moss | Turtle | exists |
| Shogun | Lady Kaede | Ambush on Anti-armor, counter-times your evolve | new (D4: yes) |
| Renaissance | Baroness Ledger | Economy first | exists |
| Gunpowder | Sgt. Boomsworth | Artillery, Command | exists |
| Industrial | Ada & Ivo | Balanced counters | exists |
| Modern | Rook | Counter-picker | exists |
| Future | Madame Tempest | Power timing | exists |
| Cosmic | The Warden | Final boss, L9 Legendaries (disclosed) | exists |

On the 8-age map, Baroness Ledger is the Bronze Lieutenant and the Medieval region boss is Mama Moss; Captain Kettle holds Bronze.

**Boss rules.**

- **Boss base:** +50% base HP and one extra fixed turret of the boss's age, disclosed on the node and the VS screen. These are per-side modifiers (`SideConfig.sideMods`, A18.11), the one sim addition bosses need.
- **Phase at 50% base HP** (a bot-profile rule reading the `Observation`, no sim trigger): a banner "The General is enraged" and a 2 s warning. Then the boss casts its Age Power if charged and the zone holds at least its power threshold (power rework: its best ready, affordable power whose ROI passes its bar, A2.9.9), trains its signature Legendary if affordable, and switches to Charge only if its army value is ≥ 1.0× the player's; otherwise it Holds, banks and counters, and re-checks every 5 s. Stopping at 51% to build a kill zone gains nothing.
- A new General needs a portrait, a VS line, a plan per age and a profile entry: ~2 agent hours plus art.

#### A18.7.7 Modifiers

Disclosed on the node and the VS screen, from the A16.8 kinds: Gold Rush (passive gold ×1.5 both sides), Double Powers (the Daily's Power Hour; with the power rework: reloads twice as fast and powers cost 50% less), Iron Rain (enemy starts with a Rare turret), No Council, Cheap Drills (Troops −30%), Fog Window, Night (turret and field-tower range −20%), Mud (−15% speed), Short Fuse (Overdrive 1 min earlier). Each appears first in a relief level.

#### A18.7.8 Rewards (all earned, all shown before the fight)

| Reward | Rule | When |
|---|---|---|
| First clear | Amber (40; 60 on Hard-marked levels); boss: a fixed capsule shown on the node | v1 |
| **Card unlocks** | Level 3 of each region grants a named Rare of the region's age, the boss grants a named Epic, on first clear; a copy of a card already owned counts as a normal duplicate (A6) | v1 |
| **Power unlocks** (power rework) | The first clears of each region's L5, L7 and L9 grant that region's three War Path powers (A5.7); the Stone L5 first clear also unlocks the Field slot. A power already owned (from the Trophy Road fallback) pays 60 Amber instead. Exact edits: `docs/requests/powers-sources.md` | with the rework (P4) |
| **Fort unlocks** (A16.14.6) | The Fort slot unlock grants the 8 walls and the Stone Camp, Trap and Tower. From Bronze to Cosmic, the first clears of each region's L4, L6 and L8 grant its Camp, Trap and Tower, shown on the node; Stone L4, L6 and L8 grant no fort, and no fort reward shows before the unlock. Trophy Road fallback: one fort set per region on the plain nodes 2,200, 2,300, 2,500, 2,700, 2,900, 3,100 and 3,200; whichever comes second pays 60 Amber. Never capsules | with forts (phase 6, F4) |
| Star chests | Every 10 stars: Amber, Dust and one cosmetic from the collections | v1.1 |
| **War Relics** | 3 per region, earned by ★★ on levels 3, 6 and 9. Each is a trade-off ("Nile Charm: +5% Economy income, −5% turret damage"), within the A18.2 caps. **Single player only**: War Path, Skirmish, Quick Battle. `meta` never puts relic `sideMods` into Ladder, Daily, ranked or PvP configs, and a test proves it | v1.1 |
| Veteran and Legend Paths | After the Cosmic boss: the same map at +2 and +3 tier offset with one modifier or restriction per level; own stars | v1.1 |
| Boss rematch | After a region is done, the boss returns with a twist modifier | v1.1 |
| Titles | "Pathfinder", "Veteran", "Legend", "Crowned" | v1.1 |

No lives, energy, timers, boosters or paid anything (A15 red lines).

**Capsule age weighting.** Age Capsules and card drops that pick an age weight the current War Path region's age ×2 and the Era of the Week ×2 (disclosed on the odds screen), so cards arrive for the ages the player actually plays (v1.1, meta data).

#### A18.7.9 Resume a single-player match

Single-player matches save their seed, config and command log every 10 s and on page hide. After a reload, "Resume battle" re-simulates the log to the saved tick (deterministic, B3) and continues. Never in PvP. Size S-M, v1.1. Full War stays off the War Path either way.

#### A18.7.10 Conquest, onboarding, content and save

- **Conquest folds into the War Path** (owner decision D5). The boss and Lieutenant nodes are the Conquest Generals. On migration each Conquest star becomes the matching star on that General's boss node; Conquest milestones (9, 18, 27 stars) become star-chest credit; the Conquest tab leaves Mode select. Nothing earned is lost (A15.1).
- **Onboarding (A8).** The first 40 minutes are Stone L1-L6; A8's beats move onto the nodes; the stance is there from L2.
- **Content** (`src/content/raw/warPath.ts`):

```ts
interface WarPathLevel {
  id: string;                 // 'wp.bronze.l05', stable forever
  region: AgeId;
  index: number;              // 1..10, or side nodes 's1', 's2'
  role: 'intro' | 'practice' | 'mix' | 'feature' | 'lieutenant' | 'relief' | 'ramp' | 'puzzle' | 'spike' | 'boss' | 'side';
  format: string;             // a content FormatId: the window and its clocks
  general: GeneralId;         // labelled AI
  tierOffset: number;         // added to the region base and the difficulty offset, clamped [0, 10]
  victory?: VictoryRule;      // default: destroy the base
  start?: { seed: number; commands: string };  // mid-battle start
  fixedPlan?: WarPlanSpec;    // fixed loadout puzzle
  modifiers: ModifierId[];    // disclosed
  laneFeatures: LaneFeatureId[];
  goal2: StarGoal;            // the ★★ goal
  teaches?: MechanicId;
  reward: RewardSpec;         // first clear, card unlocks
  boss?: { sideMods: SideMods; phaseAtBp: number };
}
```

- **Save** (`SaveDoc` v3): `warPath: { path: 'normal' | 'veteran' | 'legend'; stars: Record<levelId, 0|1|2|3>; crowns: Record<levelId, 0..5>; relics: RelicId[]; difficulty: DifficultyId }`.
- **Headless check** (`tools/warPath.ts`): plays every level with the human-limited player bot (A15.17) at each difficulty and fails the build when a level misses its role band in A18.7.2 by more than 10 points.

---

### A18.8 More ages

#### A18.8.1 The target list: 13 ages

The existing 8 keep their ids, cards and P values. Five are inserted at geometric steps between their neighbours, so no existing card changes.

| # | Age (id) | Theme | P | Status | Signature mechanic |
|---|---|---|---|---|---|
| 0 | Stone (`stone`) | Tribes, beasts | 1.00 | exists | Basics |
| 1 | **Nile** (`nile`) | Ancient Egypt: chariots of the sun, sphinx, obelisks | 1.08 | new, wave 1 | Monuments (first fort card); sandstorm power |
| 2 | Bronze (`bronze`), shown as **"Bronze Age: Hellas"** | Ancient Greece: hoplites, gorgons, bronze giants | 1.16 | exists | Piercing throws, auras |
| 3 | **Rome** (`rome`) | Legions, testudo, ballistae | 1.22 | new, wave 1 | Formations: the front rank takes less damage; siege towers |
| 4 | **Norse** (`norse`) | Raiders, longships, berserkers | 1.28 | new, wave 2 | Rage: damage up as HP falls |
| 5 | Medieval (`medieval`) | Castles, knights | 1.35 | exists | Reach, shields, siege |
| 6 | **Shogun** (`shogun`) | Feudal Japan: samurai, ashigaru, fire arrows | 1.49 | new, wave 3 (D4: yes) | Duelists: first-strike counters |
| 7 | **Renaissance** (`renaissance`) | Pike and shot, inventors, war wagons, gliders | 1.65 | new, wave 2 | Inventions: a glider (light Air), a war wagon (mobile cover) |
| 8 | Gunpowder (`gunpowder`), shown as **"Age of Muskets"** | Napoleonic lines, sail-age cannon | 1.82 | exists | Splash artillery, first Air |
| 9 | Industrial (`industrial`), shown as **"Great War"** | Steam, rail, landships, trenches | 2.12 | exists | Mech Heavies, marks |
| 10 | Modern (`modern`) | Second World War to tanks and jets | 2.46 | exists | Air as a regular option |
| 11 | Future (`future`) | Mechs, energy shields | 3.32 | exists | EMP, time control |
| 12 | Cosmic (`cosmic`) | Star legions | 4.48 | exists | Blink, motherships |

- Nile = √1.16; Rome and Norse split Bronze to Medieval in three; Shogun and Renaissance split Medieval to Gunpowder in three. Without Shogun, Renaissance becomes √(1.35 × 1.82) ≈ 1.57.
- Small early steps are a feature (being one age ahead early matters less), paid for by a visibly new mechanic in every new age.
- Rejected: a separate Greek age (Bronze is Hellas), a separate Napoleonic age (Gunpowder is), a separate World War age (Industrial and Modern are), a Contemporary age (too close to Modern and Future). Shogun as a side branch instead of Medieval is rejected: it breaks queue conversion and the one-line P scale.

#### A18.8.2 Now: presentation themes (no new art)

Bronze is presented as "Bronze Age: Hellas", Gunpowder as "Age of Muskets", Industrial with Great War flavour: age card titles, flavour lines, VS lines, War Path region names and music titles. Strings and content data only, size XS (A18.13 phase 0). This answers the owner's Ancient Greece, Napoleonic and World War wishes at once.

#### A18.8.3 When new ages are built, and what they cost

The owner has chosen an **ultra-realistic** art direction; every existing age will be restyled. Building Nile and Rome before that pipeline is proven would pay for their art twice. So:

1. New ages are **frozen** until one existing age (Stone) ships in the realistic style, passes the screenshot review, and has a measured hours figure.
2. Each new age is then re-costed from that figure. Planning value until then: **75-150 agent hours per age** (1.5-3× the stylized 50 h), of which unit art is the largest part.
3. Waves: 1 Nile and Rome; 2 Norse and Renaissance; 3 Shogun (D4: yes).

Per age, as A17 set the standard: 7 units (3 Common, 2 Rare, 1 Epic, 1 Legendary), 4 turrets, 2 Age Powers, 1 fort card when forts exist, a base, a backdrop, a sound set and music arrangement, one boss General, and its War Path region (10 levels as data). Each signature mechanic that needs a new ability kind (Rome formation, Norse rage) is one `AbilityDef` kind with its own unit test, requested from WP0 and WP2 before content is written.

**Age index shift.** Inserting an age shifts `AgeDef.index`, which the sim reads for older-age turrets, Modernise and underdog. Saves persist only ids, so no migration is needed; a sim test proves these rules on a window with an inserted age.

---

### A18.9 Classes, forts and six troops

| Owner wish | Rule | When |
|---|---|---|
| **Six troops per battle** | A loadout has 6 unit slots; the tray shows 6 cards. The `train` and `cancelTrain` slot type widens from `0..4` to `0..5` | Phase 2 contract bump |
| **Stationary class (forts)** | The Fort class of A16.14 (owner request 2026-09-29: walls, a camp that spawns free weak troops, towers that shoot but stand still, plus traps). Four kinds per age (32 cards); 1 Fort slot per age loadout beside its 6 units; Home pads at p 160, 230, 300 inside turret cover (camps also Field pads 640, 820 behind your army); tower cover never past p 560; at most 2 alive and 1 camp; 5 s scaffold; 6 pop (traps 3); 25 s recharge; decay, fast from the start of Siege; ×2 from Heavy, siege, artillery and Legendary; bounty at the unit rates (50% gold, 70% XP). Placed by dragging onto a pad (the power drag). The wall pick is Engineers in the Defences track. Gates: the placebo, turtle, mirror, value and per-card rows of A16.14.9, measured first in F0 on the full rules | Phase 6 (F0-F5), right after the War Path (owner: early) |
| **Air as a full class** | Air units get their own class icon, counter row and Troops line (A18.5.2) | Phase 8 |
| **Underground class** | A16.15 rules (tunnelers, detectors, 1 s surfacing telegraph); own Troops line | Phase 8, after forts |
| **Class icons and counters, clear deck builder** | Owner directions of 2026-09-28; the builder also shows research compatibility (A18.5.2) | In flight / Phase 3 |
| **Cosmetic collections** (emotes, quotes, flags, base skins, decorations, national flags) | A18.9.4; the War Path pays into them through star chests | After the War Path and the new classes |
| **Lane features, battlefields** | One per region from L4 (A15.16, A16.9) | v1.1 |
| **Clans, friends** | Online M6 and M8 (A18.10) | Later |
| **Home village** | v1.1 as decided (A16.22); shares Home with the War Path map | v1.1 |
| **Beautiful art** | Realistic restyle (A18.8.3, A18.9.5); research picks add badges and later per-age looks | Art track |

#### A18.9.1 Card class and counters on every card (owner direction, in flight)

Every unit card (battle tray, War Plan, Collection, card detail, capsule reveal) shows its class with a role icon and a label: Infantry, Ranged (with a "Long range" trait and arc glyph for the Long range cards, A5.1), Heavy, **Anti-heavy** (was "Anti-armor"; owner feedback 2026-09-29, the ids stay `antiArmor`; its glyph is the Heavy class's kite shield split by a spear), Siege, Support, Air, Legendary, and Underground and Fort once those classes ship. The class comes from the existing roles and tags (A2.6). The card detail and a long-press or hover tooltip show "Strong vs" and "Weak vs" from the compiled counter lists (B4); the War Plan builder shows a small counter triangle legend. **The legend is a floor:** a class row never omits a legend pair, so every Anti-heavy card lists Heavy first under "Strong vs" and every Heavy card lists Anti-heavy under "Weak vs" (before, no Anti-armor card named its own age's Heavy). Colours are colourblind-safe and never carry meaning alone.

#### A18.9.2 Age Power targeting (owner direction, in flight)

Dragging the power from its button onto the lane is the primary, taught interaction. A tap no longer fires blind: it starts an aiming mode, and the next tap on the lane or the minimap casts; Space still auto-aims for keyboard players. The ready button invites dragging (a lift and a glow, never a flash); a large ghost of the power's area follows the finger with a valid or invalid tint and highlights the units it would hit; the camera edge-scrolls during the drag (A17.6); dropping on the minimap works; releasing over the HUD cancels. This replaces "tap = auto-aim" in A2.9 and A2.12. **Power rework (A2.9.10):** on pick-up the legal band (your half, or near your army) is washed in team colour with a labelled edge; the eligible enemies (the first N nearest your gate in the reach area) carry number pips 1..N and those the zone covers are highlighted ("Hits 4 of 5 · −100"; a prediction, units move); a strike shows a lock ring on the unit nearest the aim; the ghost sticks to the band's edge for 120 lu of overshoot and beyond that turns invalid, and a release there costs nothing.

#### A18.9.3 The deck builder (owner direction)

The War Plan becomes a clear deck builder: age tabs with the 6 unit slots, 2 turret slots, 1 power (2 with the power rework: Home and Field, A2.9.10) and (phase 6) 1 Fort slot of each age visible at once; drag or tap a card into a slot; the counter legend, the deck advisor (A3) and the research compatibility marks (A18.5.2) are visible without opening another screen. The layout and motion are specified in the UI plan (`docs/ui-plan.md`, A18.9.5).

**Owner request 2026-09-30 (simpler per age).** For the selected age the builder shows three plain sections top to bottom: **In battle** (a fixed band with the loadout's slots in one row, grouped Troops, Turrets, Powers and, from phase 6, Fort, each with its count, "Troops 5/6"; the Fort group is one 58 px slot after Powers, 736 of the 794 px band row at 844 with the advisor moved to the band's title row, A16.14.7), **Available** (the owned cards of that age that are not in battle; tap and Use, tap-tap or drag to swap one in) and **Locked** (the cards of that age not found yet, as greyed silhouettes with where they come from: Time Capsules, "from Arena N" when the current arena does not drop that age yet, a War Path level or a Trophy Road node for powers; with "You own 12 of 17 Stone cards"). The "All cards" view and the class, rarity and sort filters leave the builder: every age's cards live in the **Card Album** (A9 #10, the Collection route), a long scroll like a Pokedex grouped by age with a sticky age header and a completion bar per age, every card numbered (No. 001 is the first Stone troop; numbers never change with filters), owned cards in colour with level and copies, missing ones as a dark silhouette with a "?" and their source, filters Have / Missing, rarity and class, and a total ("110/136 found"). Army links to it from the Locked section.

#### A18.9.4 Cosmetic collections (owner direction)

Besides troop skins (A5.8), players collect:

| Collection | What it is | Shown |
|---|---|---|
| Emotes | Short animated reactions (A9.2 emote wheel) | In battle, both sides |
| Quotes | Curated one-liners, friendly or neutral only (A16.28: no taunts) | VS screen and the emote wheel |
| Base flags | A banner design on the base's flagpoles | In battle and on the VS screen |
| National flags | Country flags only (Denmark, England, USA and many more), drawn in our own style; no political or hate symbols; the pick is never inferred from location | On the base and the VS screen |
| Base skins | A full restyle of a base for one age, same size and mounts | In battle |
| Base decorations | Small attached props (banners, trophies, braziers) in fixed anchor spots that never cover mounts or HP | In battle |
| Backdrops (owner request 2026-09-30) | A battle background skin: a theme for your half of the lane in every age (Golden Dusk, Harvest Moon, Winterfall, Blossom Spring, Starry Night, Lantern Festival, Thunderstorm, Ember Sky, Northern Lights, Eclipse; 10 at launch, 2 Common, 3 Rare, 3 Epic, 2 Legendary). It re-grades the age's own sky, far and mid layers (palette, sky, a sun, moon, eclipse, stars or aurora, props along the rims such as snow, blossom, autumn leaves or festival lights) and adds weather behind the lane (snow, rain with distant lightning, petals, leaves, embers, sky lanterns, fireflies, motes, sparkles); the age's landmarks stay, so the age still reads | In battle, your half only: the enemy half keeps its own sky and the A11 seam (cross-fade and 30% haze) blends the two looks exactly like two ages. AI bots keep the classic sky |

- **Backdrop rules.** One equipped backdrop (`backdrop.<id>` or none = each age's classic sky), equipped in Customize's Backdrops tab with a live preview (the lane's own painters paint your half in the chosen age, the theme's weather moves over it, and your base stands in front; locked backdrops can be tried on, never equipped). Sources: the Time Capsule pool (Common to Epic, craftable with Dust), the Wardrobe Crate pool (Rare to Legendary) and Trophy Road nodes 2,100 and 3,500. Large-area theme colours stay desaturated (no in-band team hue above 40% HSV saturation unless dark, value ≤ 40%; checked by a test), the weather is drawn over the mid-ground and under the ground, units, bars and effects, and it follows Graphics Lite (half the particles) and Reduce motion (quieter weather, no lightning flash). Art goes through the manifest like unit skins (`backdrop.<age>@<id>`, B5); the sim never sees it (the look is presentation only and skipped by hashes). Save v8 adds `cosmetics.equipped.backdrop` (null for every existing save).
- **Rules.** All earned: capsules, the Wardrobe Crate, Trophy Road, War Path star chests, feats and events; nothing is sold (A6.2). Each item has a rarity; Collection shows completion counts per collection. Cosmetics never change numbers, hitboxes or readability (the A11 team-colour and silhouette rules apply).
- **Customize screen** (built as route 19 with tabs Troops, Bases, Banner & title, Emotes) gains tabs for Quotes and Flags and the base decoration anchors; the chosen base cosmetics and flag show in battle for both sides and on the VS screen.
- **Content and save.** Tables in `src/content/raw/cosmetics.ts` (id, collection, rarity, source, art id); drop tables join the capsule and crate tables with disclosed odds; `SaveDoc.cosmetics` gains owned and equipped ids per collection (additive migration; the backdrop in save v8). Art ids go through the manifest (`cosmetic.<collection>.<id>`).

#### A18.9.5 Art direction and UI (owner directions)

- **Ultra-realistic art (decided 2026-09-28).** The target is an ultra-realistic look: realistic proportions and anatomy, physically based materials, realistic lighting and weighty, natural motion. It replaces the stylized chunky cartoon direction of A11 for every unit, turret, base and backdrop, Stone first (A18.8.3). Readability at in-game size still rules: a clear silhouette, team colour on large parts, an outline or rim light, and the A11 colour rule. Free CC0 materials and models (Poly Haven, ambientCG, Quaternius) may be used once the owner allows those hosts. Art stays behind the ArtProvider and the manifest, so the restyle cannot change balance.
- **Cartoon style (owner decision 2026-09-30).** The owner prefers the earlier cartoon look to the realistic restyle, which is parked; the cartoon style stays and its quality rises (better animation, more detail per figure, distinct attack styles). Where this section and A11 disagree, the cartoon direction wins.
- **UI rebuild (owner decision 2026-09-30 supersedes 2026-09-28).** Home is the Battle hub: the 1v1 battle is the main point of the game (online later, the Ladder vs labelled AI now), so the big Battle button, the arena and the trophies are the centre of Home. The War Path is the offline side road, one tap away on the Campaign card, and its map is richly illustrated (themed regions with layered, animated backdrops, varied node types, decorations, parallax, a clear current node and an unlock burst). Five tabs: Army, Capsules, Battle (Home), Progress, Customize; Conquest leaves with A18.7.10. The match plate over Battle is where the online opponent will show once online play exists, so that mode needs no redesign. A shared design system and a motion catalogue apply across every screen and the HUD (`docs/ui-plan.md`). Every screen is reviewed with phone and desktop screenshots before release.
- **Online-first Battle hub and four lengths (owner request 2026-10-01).** "Set Home up so its layout is made for online battles; take inspiration from Clash Royale; the goal is 2 users playing each other; a short, a medium and a long battle, and one with no time limit that ends only when a base is destroyed."
  - The liked frame and the War Path card stay.
  - The Modes tile becomes the mode switcher whose choice Battle plays.
  - The plate becomes the lobby card: an honest opponent slot and the length picker.
  - The online flows (search with an AI choice, VS with Player and AI chips, the Friend room by code) are designed in A9 #20-21 and appear only when they work.
  - The lengths are Short, Medium and Long (the Short, Standard and Full War) and Last Base Standing (A2.10.1).

---

### A18.10 Online multiplayer: the final goal

Single player leads there directly: the sim is integer, seeded and hashed; replays are command logs; every War Path match is a determinism test; Generals become labelled AI fill; relics and card levels stay out of PvP (Standard L8).

**Netcode (A16.21 and the `server/` spike; D1's Colyseus line is superseded).** One Cloudflare Durable Object per match relays commands: stamped at server tick + 4 (200 ms, adaptive 4-8), frames every 2 ticks, state hashes compared every 20 ticks. On a mismatch the room re-simulates the log and the side that disagrees loses. Reconnect replays the stored log, 60 s grace. PvP: no pause, no speed, Standard L8; research and stance are public anyway.

**Free-tier capacity** (Durable Objects 13,000 GB-s and 100,000 requests a day; going over gives errors, never a bill). Longer matches reduce it:

| Online format | Median | GB-s per match | Matches a day | Use |
|---|---|---|---|---|
| Short War | 7:00 | ~53 | ~245 | Ranked |
| Standard War | 10:30 | ~79 | ~165 | Friend Duel, casual |
| Full War | 15:00 | ~113 | ~115 | Friend Duel only (2026-10-01: also the casual queue's Long length) |
| Last Base Standing (A2.10.1) | ~19:50 (measured); at most 25:44 | ~150 (at most ~195) | ~87 (~67 at the worst case) | Friend Duel only |

A client-clocked relay that lets the room hibernate roughly doubles these; M0 measures whether it is worth the code. A daily guard closes ranked near 90% of the budget; it counts Last Base Standing rooms at their worst case.

**Lengths online and the Home flow (2026-10-01).**
- **Both players always play the same length.**
  - The casual Online Battle (M4) has one queue per length: Short, Medium, Long.
  - Ranked (M5) has one length: Short once its A16.5 Bell rows pass, else Standard (A16.21).
  - In a Friend Duel (M2) the host picks any of the four lengths, and the guest sees it before Ready.
- **Relay.** The `MatchSpec` already carries the format key. The relay's hard cap becomes `(finalBellMs ?? endByMs) + 2 min` (`server/shared/match.ts maxTicksFor`), which is 27:44 for Last Base Standing, so a real game never meets it. A client whose content hash differs gets "A new version is ready. Reload to play online."
- **On Home** (A9 #2, #20, #21):
  - the mode switcher gains the online cards when they work;
  - the plate shows a neutral silhouette until a player is found;
  - the search shows elapsed time and offers a labelled AI General after 25 s, as a choice;
  - VS shows a Player chip or the AI chip.
- **Rewards.**
  - Friend Duels pay nothing (red line 9; no collusion farming).
  - The casual Online Battle pays the Ladder-vs-AI Amber, Sundial claim and Clay, with no trophies.
  - Ranked pays trophies and the Glicko-2 rating.
  - AI fill pays as the Ladder vs AI of its length and never moves a rating.
  - Recommendation for M5: one trophy count, and a cap on AI-Ladder trophies set then, so the top arenas mean beating people.

| # | Milestone | Size | Exit test | Owner action | When |
|---|---|---|---|---|---|
| M0 | Spike measurements | S | 100 bot matches, 0 desyncs; costs in `docs/online-spike.md` | None | In progress |
| M1 | Same results in Chromium, Firefox and WebKit: golden replays and fuzz in CI | M | CI green on 3 engines | None | **Now, beside phase 3** |
| M2 | Friend Duel by code, reconnect, desync disputes, capacity guard | L | Owner plays PC vs phone; 0 desyncs in 200 CI matches | Cloudflare account and two GitHub secrets (below) | After the War Path |
| M3 | Accounts and cloud save (device keys, transfer code) | M | Save moves between devices | None | After M2 |
| M4 | Casual matchmaking; labelled AI after 20-30 s; block and report; emotes only | M | Paired in 30 s or a labelled AI | Pick the public server name | |
| M5 | Ranked: Glicko-2 plus trophies, server-granted rewards | L | Rating moves only human vs human | Decide the review for minors | |
| M6 | Friends and leaderboards | M | An edited replay is rejected | None | |
| M7 | PWA install; store apps only if the owner pays | S | Browser and installed player finish a match | PWA or stores | |
| M8 | Clans, 2v2 vs AI, then 2v2 PvP | XL | Per A16.21 | None | |

**Owner steps for M2 (exact, when asked).**

1. Go to dash.cloudflare.com, sign up with your email and confirm it. Stay on the Free plan. Do not add a payment method.
2. In Cloudflare: My Profile, API Tokens, Create Token, template "Edit Cloudflare Workers", choose your account, Create. Copy the token. Copy the Account ID from the Workers & Pages overview.
3. On github.com/SimNyborg/ageborn: Settings, Secrets and variables, Actions, New repository secret. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. When told Friend Duel is live: open the game on PC and phone, press Online, Friend Duel, share the code, play, and report lag or anything out of sync.

---

### A18.11 Contract, save and content changes

All sim-visible contract changes land in **one** WP0 bump and one `SIM_VERSION` 3.0.0 with one golden re-record (phase 2). Pacing data (phase 1) changes only `contentHash`.

| Area | Change | Phase | Owner |
|---|---|---|---|
| Contracts | `FormatId` becomes an open string key into `content.formats` (was a closed union of 4); used by `MatchConfig.format` and `ReplayDoc.format` | 2 | WP0 |
| Contracts | `SideConfig.sideMods?` (per-side modifiers read at spawn and base init: base HP bp, extra fixed turret, unit stat bp) | 2 | WP0 |
| Contracts | `Command.research { track, group?, rank, pick }` replaces `treasury`; `research.cancel` | 2 | WP0 |
| Contracts | `Command.stance { mode: 'charge' \| 'hold' \| 'fallback', holdP? }` replaces the toggle | 2 | WP0 |
| Contracts | Tray slot type `0..5` in `train` and `cancelTrain` | 2 | WP0 |
| Contracts | `MatchConfig.victory?` (`survive`, `target`) | 2 | WP0 |
| Contracts | `Observation.me/foe.research` (owned picks, current item, progress), `stance`, `holdP`; `SimEvent` `researchStarted`, `researchDone`, `stanceChanged` | 2 | WP0 |
| Contracts | `AgeId` gains `nile`, `rome`, `norse`, `renaissance` (and `shogun`) | per age wave | WP0 |
| Sim | Research slot and timers, underdog discount, spawn-time application, A18.2 caps and damage-taken floor, flat per-hit reduction, turret cap 560, three stances, flag, stance cooldown, engagement freshness, `sideMods`, victory rules; `SideState.research` hashed | 2 | WP2 |
| Content | `raw/economy.ts`: XP sources, bounty 50%, thresholds by position, window formats and clocks, `stanceCooldownMs`, `turretRangeHardCapLu` | 1-2 | WP1 |
| Content | `raw/research.ts` (tracks, picks, bp, `aiHint`), `raw/warPath.ts`, later `raw/warRelics.ts` | 3, 5, 7 | WP1 |
| Content | Presentation names for Bronze, Gunpowder, Industrial | 0 | WP1, i18n |
| AI | Research utility, tier columns, Generals' styles, stance and flag, difficulty behaviour flags, boss phase | 3-5 | WP3 |
| Save | `SaveDoc` v3 migration: `warPath`, `difficulty`, 6-slot loadouts (a sixth slot auto-filled), Fort slot later, Conquest stars mapped to boss nodes; Treasury fields dropped | 5 | WP8 |
| Meta | War Path rules, stars, crowns, card unlocks, Era of the Week (seeded in meta), relic PvE switch and its test | 5, 7 | WP7 |
| Replays | Each tuning pass changes `contentHash`, and `replayPlayer` requires an exact match. Replays from an older build keep their result card and are labelled "Recorded on an older build"; they no longer play. Replays never promise to survive balance work | 2 | WP11 |
| Tools | Proxies and gates (A18.12), time-in-age rows, `tools/warPath.ts`, the 850 ms budget, fewer Full War runs | 1-5 | WP12 |
| CI | M1: golden replays on 3 browser engines | 3 | WP12 |
| Contracts, sim (forts, A16.14.8) | `FortDef` and `CompiledContent.forts`; hidden twin `UnitDef`s for walls, towers and camps (same id, `fort: { kind }`) so every `content.units[card]` lookup resolves; levies as hidden `UnitDef`s (`levy: true`, cost 0, `aiValue`); `Tag` + `structure`; `Role` and `RoleGroup` + `fort`; `EconomyRules.fort`; `Loadout.fort?`; `Command.fort { side, pad }` and its reject codes; fort state on `UnitState` (with `silencedUntilTick`); `SimState.traps` and `Observation.traps`; `SideState.fortReadyTick`; `CapCandidate.capRank`; events `fortPlaced`, `fortBuilt`, `fortDecayed`, `trapArmed`, `trapTriggered`, `trapExpired`, `towerSilenced`; `Observation.me.fort` and `foe.fort` (the public ring); `HudModel.fort`; `MatchStats` fort counts; art `createFort` and `FortView`; the `replaySchema.ts` and `save/schema.ts` mirrors with a round-trip test; `core/fortPads.ts`; one WP0 bump and `SIM_VERSION` 5.0.0 (the next major at build time) with a deliberate golden re-record and `13-forts.json` | 6 (F1) | WP0, WP2, WP12 |
| Contracts, sim, content (Last Base Standing, A2.10.1; one WP0 bump, `SIM_VERSION` 6.0.0) | `FormatKind` + `'untimed'`; `FormatDef.escalation?: { atMs, baseDamageBp, turretDamageBp, crumbleBpPerSec }[]` (the first entry is Siege I and equals `siegeMs`; `finalBellMs` null) and `FormatDef.endByMs?`; `EconomyRules.siege.ropeDeadBandLu` (40); `Observation.escalation { step, crumbling }`; `SimEvent` `escalated { step }` and `crumbled { side, amount }`; `HudModel.escalation?`. The sim derives the step from the tick (no new hashed state, so goldens 01-14 keep their hashes); base and turret damage read the step; no symmetric decay in an escalation format; the rope; no evolve heal in Crumble. Content: the `last` and `last.bronze` windows, `endByMs` derived by a test, `FORMAT_MODES.last`, arenas `ladderFormats` and `byFormat.last`. Golden `15-last-base.json` on the fixture plus a `last` format. Meta: `formatKind`/`rewardFormat` for `untimed`. No save change (`ui-homeMode.<id>` and `ui-ladderFormat.last` are UI flags) | L1 (2026-10-01) | WP0, WP1, WP2, WP7, WP12 |
| Contracts, content, AI, UI (the Siege rope in the timed formats, A2.10.2; no `SIM_VERSION` bump) | `ObservedEscalation.finalBellTick`; `HudModel.escalation` also in timed formats; `TIMED_ROPE` steps on every `short`, `standard` and `full` window; schema: Siege steps allowed in those formats with their Final Bell after the last step and no `endByMs`; `observedClock` keeps the Bell; HUD rope clock, Siege II banner, crumbling chip; VS rope row; Result reason line in timed formats; the `crumbling` adaptive hint | 2026-10-02 | WP0, WP1, WP3, WP5, WP9, WP11 |
| Content, save (forts) | 32 forts, 24 twins and 8 levies per A16.14.4 as data, the compiler's structure mod, twins and schema checks; the next save version at build time (v11 today, after the Sundial's v10): `Loadout.fort` in every preset, `fortsOwned`, `flags['fort.slot']`, the unlock set and grants by rule, with fixtures | 6 (F1, F4) | WP1, WP8, WP7 |

---

### A18.12 A2.14 targets, proxies and gates

**New proxies (B12):** `no_research`, `drill_rush`, `eco_greed`, `tech_turtle` (Defences first, Hold at home), `flag_ball` (Hold flag at 800 with Ranged, Support auras, Bulwark, Shield Wall), `fallback_turtle` (Fall back, Keep Walls, Last Stand Drill), `few_then_evolve` (the owner's "a few soldiers" player), `stance_toggler` (toggles on every engagement).

| Metric | Target |
|---|---|
| Median stay per age, Balanced mirror | A18.3.1; no age after the first under 75 s |
| Winner's evolve lead at the 3rd evolve | Median ≤ 30 s |
| Short / Standard / Full median | 7:00 / 10:30 / 15:00 (80% bands A18.3.4) |
| Final Bell (mirror) | ≤ 10% Short, ≤ 8% Standard, ≤ 5% Full |
| Research share of gold, Balanced mirror | 15-25% |
| Research items per Standard War | 5-8 median |
| `no_research` vs a researching Balanced script | Loses ≥ 70% |
| `few_then_evolve` | Wins ≤ 10% vs Normal, ≤ 2% vs Hard |
| Each pick pair | Pick-flip ≥ 30% of sampled lane states (A16.10) and the two picks within ±5 points of each other |
| Rank III | Buying it beats saving the gold by ≥ +4 points |
| `tech_turtle`, `fallback_turtle` | In the turtle band (A2.14) |
| `flag_ball` | ≤ 45% vs tier VII |
| `stance_toggler` | No better than the same bot without toggling (±2 points) |
| Underdog discount | Comeback share (A2.14) unchanged or higher; mirror win rate unchanged |
| War Path levels | Per-role bands in A18.7.2 |

If `flag_ball` fails, the flag cap drops from 800 to 700. MVP balance pass (2026-10-01): `flag_ball` won 45 / 47% (Short / Standard; 52-63% once the Bell fixes were in), and the 700 cap and smaller guard auras made it stronger (63%, 59-63%). It is answered in the AI instead (A7.2, a set ball): **29.3 / 13.0%** (n = 200 per format).

**Fort gates (A16.14.9)** join this table, on paired seeds: a `placebo` row within ±2 points; `wall_turtle`, `camp_turtle` and `tower_turtle` with ≤ 15% at the Bell in every format and ≤ +5 points over `turret_turtle` (wins ≤ 45% as a sanity check); `home_turtle` with each kind in the turtle band ceiling; `camp_hold_mirror`, `flag_ball` + towers and `runner_camp`; a tier VII `fort_spam` ≤ 55%; the forced-placement and fort-AI mirrors with a paired Bell difference ≤ +2 (upper bound ≤ +5) and a median not more than 30 s longer, at 1,000 per format; the fort AI value 50-62%; each fort card ±3 against its age's wall; the static trap, tower-reach, cover, wall-hold, Siege-life, levy and starter-answer checks. The 2026-09-30 emulation is indicative only (old pads, missing rules, few placements, noise); on it some Bell rows already fail (`camp_turtle` 20% and `wall_turtle` 17% in Full War on the old pads; `tower_turtle` 18.5% and `camp_turtle` 16.5% in Standard War on the new pads), so F0 re-measures on the full rules and the levers come first.

**Power rework gates (A2.9.12)** join this table (setups stated once in A2.9.12: proxies vs tier VII in Short, Standard and Full War; Bell comparisons at P0 and P1 on tier V mirrors, release on the tier VII rows): the P0 go/no-go, power share of gold and of kills, the per-cast army value share and largest cast, casts per age, the static family targets, and the `power_hoarder`, `bait_wave`, `plain_wave`, `power_spam`, `no_power`, `home_turtle`, `drop_spam`, `runner_reach` and `gate_sniper` proxies.

---

### A18.13 Build plan

Each phase keeps `main` playable and reruns `balance`, `exploits` and `strength`. Sizes: XS a few hours, S ≤ 1 day of agent work, M 1-3, L 3-6, XL more. Phases 0-3 give "harder, longer, more choices" with no new art.

| Phase | What | Size | Owning areas | Depends on |
|---|---|---|---|---|
| **0** | Stance toggle visible from match 1 (built); Hellas, Muskets and Great War presentation names | XS | app/onboarding (WP11), content and i18n (WP1) | Picker in flight |
| **1** | **Pacing as data**: XP sources, bounty 50%, thresholds by position, window clocks. Behind a content switch; measured with the stronger AI in flight | S | content (WP1), tools (WP12) | |
| **2** | **One contract bump**: open `FormatId`, `sideMods`, `research` replacing `treasury`, `stance { mode, holdP }`, six tray slots, `victory`, caps and floor, stance cooldown and engagement freshness; `SIM_VERSION` 3.0.0 and one golden re-record; age-index sim test | M | contracts (WP0), sim (WP2), tools (WP12) | |
| **3** | **War Council v1**: Economy I-II, Defences I-II, Troops I-II for the 5 existing classes, Command I (about 26 picks); AI utility and tiers; HUD button and sheet, enemy ring, badges and shimmer; deck-builder compatibility marks; proxies and gates; tune the phase 1 thresholds once. Ships with phase 1 switched on. M1 CI in parallel | L | content (WP1), AI (WP3), visuals (WP4), render and HUD (WP5), UI (WP9), tools (WP12) | 1, 2 |
| **4** | Hold flag and Fall back in the HUD and minimap; AI flag placement | M | render and HUD (WP5), AI (WP3) | 2 |
| **Owner check** | Owner plays Short and Standard War on Normal and Hard | | | 0-4 |
| **5** | **War Path v1** on the 8 ages: map screen, 80 levels and 16 side nodes as data, objectives, stars and crowns, card unlocks, first-clear rewards, the Generals as bosses with `sideMods` and the phase rule, Conquest migration in save v3, difficulty flags, `tools/warPath.ts` | L | meta (WP7), save (WP8), UI (WP9), content (WP1), AI (WP3), tools (WP12) | 3, Home in flight |
| **6** | **The Fort class** (A16.14: walls, towers, camps and traps, 32 cards; owner request 2026-09-29) with the Fort slot and the Engineers wall pick, in the power rework's shape: **F0** prototype gate (no shipped code: the emulation into `tools/`, extended with every rule the 2026-09-30 emulation lacked, the placebo, forced-placement, turtle and mirror rows at smoke size with paired seeds, owner told; failing rows go through the levers first) · **F1** rules, the complete contract bump (twins, traps state, `createFort`, schema mirrors), the save step (v11 today), AI v1 in the ledger, `SIM_VERSION` 5.0.0, `fort: null` sent until F2 · **F2** HUD Fort button in the placement dock and pad drag, Army Fort group, `docs/ui-plan.md` 4.2 and 4.7 updated, Bronze L4 teaching and the unlock, then `meta` sends forts · **F3** art and sound, Playwright at 844 × 390 and 1280 × 720 · owner check · **F4** War Path and Trophy Road sources · **F5** tuning at the A16.14.9 sizes. Supply Cache if the owner check showed standoffs | L (F0 S-M, F1 L, F2 M, F3 L, F4 S, F5 M) | WP0, WP1, WP2, WP3, WP4, WP5, WP6, WP7, WP8, WP9, WP11, WP12 | 5, P2 (the HUD dock), F0 gate |
| **7** | Council rank III, Command II-III, doctrines (A16.10), relics, star chests, Veteran and Legend Paths, boss rematches, match resume, capsule age weighting | M | WP1, WP2, WP3, WP7, WP8, WP9 | 3, 5 |
| **8** | Air as a full class, then the Underground class (A16.15) | M each | WP0, WP1, WP2, WP3, WP4, WP5 | 6 |
| **Art track** | Realistic restyle of the existing ages, Stone first, with measured hours per age | XL | art, visuals (WP4) | Parallel from now |
| **9+** | New ages, re-costed from the art track: wave 1 Nile and Rome, wave 2 Norse and Renaissance, wave 3 Shogun (D4: yes) | 2 × L-XL per wave | all content areas, art, audio (WP6) | Stone restyled and measured |
| **Online** | M1 with phase 3; M2 Friend Duel after phase 5; M3-M8 after | M, L | server, tools | Owner's Cloudflare steps for M2 |
| **H1** (online-first Home, 2026-10-01) | The mode switcher (tile and chooser panel, `ui-homeMode` flag), the plate states for Training, Ladder, Quick, Daily and Skirmish, the length picker (three segments until L4), the Short/Medium/Long renames, dev-only mock states for the online plate, search and Room, the budget spec and screenshots at the four viewports; ui-plan 2.3 and 4.1 and ui-principles-short rules 2-3 reworded to "Battle plays the mode on the switcher" | M | UI (WP9), strings (WP1), e2e (WP12) | none |
| **L1-L5** (Last Base Standing, A2.10.1) | L1 contracts, content, sim, golden 15, `SIM_VERSION` 6.0.0 · L2 AI · L3 HUD meter, banners, Crumble art and sound, VS and Result lines · L4 meta rewards, arenas, the fourth segment and its caption · L5 `sim-cli lbs` gates (A2.10.1) with the levers first. Owner check after L4 | M, S, M, S, S | WP0, WP1, WP2, WP3, WP4, WP5, WP6, WP7, WP9, WP12 | L1 parallel to H1 |
| **Powers P0-P5** (power rework, owner request 2026-09-29) | P0 prototype gate (the combined rules measured with pre-registered go/no-go, no shipped code); P1 rules, contracts, the 16 built powers retagged and 8 new starters, the save migration, one-button compatibility adapters, AI v1, proxies, `SIM_VERSION` 4.0.0; P2 HUD dock, Army slots, teaching, then the Field slot on; P3 starter art and sound; owner check; P4 the 24 War Path powers and their sources; P5 tuning with Full War pacing (A2.9.13) | S, L, M, M, L, M | WP0-WP12 per A2.9.13 | P0 now; P1 after P0 passes and the UI rebuild's in-flight HUD and War Plan edits are committed (adapters requested in `docs/requests/powers-p1-compat.md`); P2 after the UI rebuild's HUD and Army land; P4 after War Path v1 (phase 5) |

---

### A18.14 Edits to other sections (applied at the v1.3 merge)

Each edited place says that A18 supersedes it and names the A18 section. The sections: A1 (Pillar 2 wording, match lengths), A2.3 (Treasury to Economy, bounty 50%), A2.4 (XP sources, thresholds by position), A2.7 and A2.12 (three stances, flag, cooldown, keys S, Shift+S, G; T freed), A2.8 (turret cap 560, A18.2 caps), A2.10 and A17.8 (windows, clocks), A2.11 (underdog research discount, Reserve Charge), A2.13 (match flow), A2.14 and A17.14 (A18.12 rows), A3 (6 unit slots, Fort slot, loadouts per window, compatibility marks), A6.3 (ladder Era of the Week), A6.10 (Conquest into the War Path), A7.2-A7.4 (research utility, tier columns, Treasury column removed, Generals' styles, new Generals), A8 (onboarding on War Path nodes), A9 (War Path screen, Council, stance control), A11-A13 (realistic direction, badges, presentation names), A14 (ids), A16.10, A16.14, A16.15 (schedule), A16.21 and D1 (milestones, capacity), B3 (tick budget), B15 (contracts).

---

### A18.15 Review resolution

"Accepted" means applied as written; "Changed" means applied in a modified form, with the reason; "Rejected" gives the reason.

#### Player review (veteran lane-battler and Clash Royale player)

| Point | Verdict | Where, and why |
|---|---|---|
| Weapons vs Armour is not a decision | Changed | Armour becomes Mail, a flat per-hit reduction that beats swarms and burn ticks and loses to Heavies (A18.5.2) |
| Hunters vs Armour, Air Weapons vs Armour are the same fake pair | Accepted | Hunters vs Lightfoot; Air Weapons vs Evasion |
| Economy rank I has no choice; Granary is a forced opener | Accepted | Forage added: pays a defender under pressure (A18.5.4) |
| Market vs War Spoils is a profile choice | Changed | War Spoils replaced by Bounty Hunters (all kills): the choice reads how busy the lane is, a match decision |
| Guildhall's second slot is worthless; Levy too small | Accepted | No second slot anywhere; Guildhall costs a queue slot; Levy −12% Commons for −1 gold/s |
| Watchtowers beats Quick Loaders; range stacks twice | Accepted | Range only at rank I; rank II is Engineers vs Arsenal |
| Research wasted if the next loadout lacks the class | Accepted | Builder and Council show compatibility (A18.5.2) |
| `no_research` gate too lenient | Accepted | Loses ≥ 70% |
| `few_then_evolve` ≤ 20% too lenient | Accepted | ≤ 10% vs Normal, ≤ 2% vs Hard |
| Rank III ±5 gate contradicts itself | Accepted | Pairs within ±5 of each other; buying beats saving by ≥ +4 |
| Forward Hold ball | Accepted | Flag cap 800 (700 if the gate fails), War Horns' damage only with the flag at p ≤ 480, `flag_ball` proxy |
| Damage-reduction stacking | Accepted | Damage-taken floor −35% and the other A18.2 caps |
| Stance-toggle resets | Accepted | 3 s stance cooldown; engagement freshness by 4 s without a target; `stance_toggler` proxy |
| Fall back stalling | Accepted | `fallback_turtle` proxy; Fall back no longer disengages mid-fight |
| Gold snowball through research | Accepted | Bounty 60% → 50% and a −20% underdog research discount |
| Veterans plus Miracle ambiguity | Accepted | Miracle is once per age per side; revived units lose Veterans stacks; both are v1.1 behind gates |
| Boss enrage is exploitable | Accepted | The phase casts and trains, but Charges only when the army comparison favours the boss (A18.7.6) |
| Research eclipses small early age steps | Changed | Kept small steps; each new age must bring a visibly new mechanic, and research never touches the P step itself |
| Full War at 15 min is long; no checkpoints | Accepted | Full War stays off the War Path; match resume from the command log (A18.7.9) |
| Mid-age standoffs | Changed | The Supply Cache is designed and gated, built only if the owner playtest shows standoffs, since the stronger AI may already fill the middle |
| Difficulty spread collapses at the top | Accepted | Region bases lowered to 0-VII, offsets −2/0/+1/+2/X, and behaviour flags per difficulty (A18.6.2) |
| Some rules break "difficulty never changes stats" | Accepted | Principle restated: disclosed modifiers allowed, hidden never; Legendary uses Standard L8 |
| Every level is "destroy the base" | Accepted | Objective kinds as data (A18.7.3) |
| Levels too long; the region's age appears late | Accepted | Normal levels use 1-2 ages, Lieutenant 3, boss at most 4; mid-battle starts |
| Stars and crowns overlap | Accepted | ★★★ = the ★★ goal on Hard; crowns keep difficulty |
| Relics gated behind Hard reward the wrong players | Accepted | Relics on ★★ and as trade-offs; v1.1 |
| Rewards are generic; the map is a single line | Accepted | Card unlocks on L3 and the boss; 2 side nodes per region; boss rematches in v1.1 |
| One win-rate band for all levels | Accepted | Bands per role (A18.7.2) |
| G and T both open the Council | Accepted | G only; T freed |
| Flag plus Sally Port needs a clamp | Accepted | Clamped to [380, 800] |
| "Tiers VII-X know enemy research" is no distinction | Accepted | Tiers differ in how they use public research (A18.5.8) |
| Economy rank I costs 200 while others cost 150 | Accepted | All rank I cost 150 |
| Capsule drops for rarely played ages feel dead | Accepted | Region and Era of the Week weighted ×2, disclosed (v1.1) |

#### Engineering and producer review

| Point | Verdict | Where, and why |
|---|---|---|
| Pacing is already data; step 2 is S | Accepted | Phase 1 is S, content only |
| Open `FormatId` instead of `MatchConfig.window` | Accepted | A18.3.4, A18.11 |
| Modifiers are symmetric; bosses, relics and research need per-side modifiers | Accepted | `SideConfig.sideMods`, the one boss addition |
| Research raising units already on the lane is a replay risk | Accepted | Research applies from spawn; shimmer is visual only |
| Stance toggle is an XS onboarding flip; the flag is M | Accepted | Phase 0 and phases 2 and 4 |
| Treasury swap, stance shape and `sideMods` in one major bump | Accepted | Phase 2, with slots and `victory` too |
| Replays break on every tuning pass | Accepted | Old replays labelled and not played; no promise (owner decision D8) |
| Tray slots typed `0..4` | Accepted | Widened in the phase 2 bump |
| Saves are ready; keep ids stable; age index shift needs a sim test | Accepted | A18.8.3, A18.11 |
| Art cost priced wrong after the ultra-realistic decision | Accepted | New ages frozen until Stone is restyled and measured; 75-150 h planning value |
| Cheap answers to "too few ages" | Accepted | Presentation names in phase 0; windows and Era of the Week |
| Council v1 cut to ~26 picks from existing kinds | Accepted | Phase 3; Fire Arrows only if a DoT exists |
| Air and Underground lines wait for the classes; second slot waits | Changed | Lines wait (phase 8); the second slot is removed entirely (player review) |
| War Path v1 cut list | Changed | Relics, star chests, paths and crowns' extras move to v1.1; crowns and card unlocks stay in v1 because they are cheap meta data and answer the player review |
| Difficulty: no new layer beyond the picker | Changed | Quick Battle uses the picker as is; the War Path needs region-relative tiers and behaviour flags, because absolute tiers collapse at the top (player review). The flags live in `raw/difficulty` data and the bot profile |
| Online: only M1 now | Accepted | A18.10 |
| Balance tool run counts | Accepted | Full War only at gates |
| Corrections list (A18.2.3, A18.4.1, A18.6.5, A18.3.2, step splits, first-pass hours) | Accepted | All applied; first pass now ~7.5 h at the shorter War Path windows |

---

### A18.16 Owner decisions

The owner delegated these decisions; on 2026-09-28 the orchestrator took every one as recommended (`docs/decisions.md`, "A18 decisions D1-D8").

| # | Question | Recommendation | Decision |
|---|---|---|---|
| D1 | Slower evolving: ages of about 60-125 s instead of 30-70 s (changes Pillar 2)? | Yes | Yes |
| D2 | Match lengths: Short ~7, Standard ~10:30, Full ~15 minutes, formats as windows of 3, 5 and 7 ages? | Yes | Yes |
| D3 | Treasury disappears; money generation becomes the Economy track of the War Council? | Yes | Yes |
| D4 | New ages wait until the realistic art is proven on Stone; then Nile and Rome first. 12 ages, or 13 with Shogun? | Wait, then 13 | Wait, then 13 (Shogun included) |
| D5 | Fold Conquest into the War Path (Generals become bosses, stars carried over)? | Yes | Yes |
| D6 | Three stances (Charge, Hold at a draggable flag up to just before mid-lane, Fall back)? | Yes | Yes |
| D7 | Legendary: behaviour only, or also a disclosed head start for the AI? | Behaviour only | Behaviour only |
| D8 | Saved replays stop playing after a balance update (their result stays, labelled)? | Accept | Accept (from `SIM_VERSION` 3.0.0) |

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

- **Tick:** 50 ms. `ms → ticks = max(1, round(ms / 50))`. A Full War is at most 12,900 ticks (A17, Final Bell 10:45); from A18.3.4 at most 21,000 ticks (Final Bell 17:30).
- **Integer state:**
  - Positions are world x in milli-lu (lane `LANE_MLU` = 2,000,000 since A17; `battle.laneLength` and `battle.midLane` must match it, checked by a content test); helpers convert to per-side p. Render takes its lane from core.
  - Unit speed in milli-lu per tick = trunc(speed × 1,000 / 20 × `marchSpeedBp` / 10,000), applied once at compile time (A17.15).
  - HP, shields, heals and damage are integers in centi-units (×100).
  - Gold and XP are milli-units. Power charge is in parts per million (with the power rework: each power slot's reload progress, A2.9.3).
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
     (A18 phase 2 adds, in step 4, research timers and completions, and applies owned picks at spawn in step 5; stance cooldowns and engagement freshness follow A18.4.2.)
  3. Economy: passive gold and XP (× phase and modifier), XP cap, Overcharge conversion.
  4. Ascension timers (queue conversion and Vanguard at `ageUp`), stance cooldowns, turret build, sell and modernise timers.
  5. Training: advance the first non-waiting item; spawn finished items that fit, in queue order.
  6. Statuses: expire, tick regen, innate shield regen, recompute auras.
  7. Timed abilities: heals (applied here, strongest healer per unit), Roar, EMP, Time Stop, pounce triggers; called strikes schedule impacts.
  8. Unit attack state machines (retarget, windup start, due melee impacts collected), in id order.
  9. Turret attack state machines, mount order side 0 then side 1 (collect only).
  10. Projectiles: advance; arrivals add impacts.
  11. Power casts: telegraph countdowns; due impacts collected. With the power rework (A2.9.5-A2.9.6): field pulses every 10 ticks, strike shots on their locked target, Suppress timers, and the eligibility (the screen and the reach-area mask) and target cap for sweeps, charges, fields and strikes (barrage blasts pick in step 13).
  12. Last Stand: arming, charge countdowns, blasts collected, auto-trigger at 10%.
  13. Impact resolution: apply every collected impact through the damage pipeline, then knockback and pulls.
  14. Deaths: bounties, XP, on-death effects (spawns, explosions), `died` events. Repeat in id order until no new deaths, at most 8 passes. Then compaction.
  15. Movement: symmetric resolution per A2.7, then air units.
  16. Win check: base HP ≤ 0, Final Bell, retreat.
  17. `prevX` bookkeeping for interpolation; every 20 ticks the FNV-1a state hash goes into `state.hashes`.
- **Commands** are stamped with the execution tick `sim.tick + 1` offline (online later: + 4). Human and bot commands go through the same queue and are all recorded.
- **Replays:** `ReplayDoc` (B15): `{ v: 1, simVersion, contentHash, seed, format, sides, modifiers, training, commands, result, finalHash, hashes }`, about 5-20 KB.
  - Verification re-simulates and compares `finalHash`.
  - A replay whose `contentHash` differs from the current build is shown as "from an older version" and cannot be played. From A18 (owner decision D8) this is stated plainly: replays from an older build keep their result card, are labelled "Recorded on an older build" and no longer play; replays never promise to survive balance work.
  - **Versions.** `SIM_VERSION` 2.0.0 (A17 lane), 2.1.0 (ranged first-hit bonus), 2.2.0 (the falling gate). A18 phase 2 bundles every sim-visible contract change into one bump, `SIM_VERSION` 3.0.0, with one golden re-record (A18.11).
- **Single-player resume (A18.7.9, v1.1).** Single-player matches save seed, config and command log every 10 s and on page hide; "Resume battle" re-simulates the log to the saved tick. Never in PvP.
- **Match stats.** `sim/stats.ts` (WP2) is a pure reducer over `SimEvent`s that produces `MatchStats`, including MVP card, quest counters and power hit counts.
- **Performance:** a full headless Full War in ≤ 500 ms on desktop Node (A17; ≤ 850 ms for A18's 21,000-tick Full War, measured only at gates); average `step()` ≤ 0.5 ms on a mid-range phone.

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
- **Counter matrix.** `npm run content:counters` runs equal-gold 1v1 duels of every unit pair at L1 on a flat lane and writes `src/content/generated/counters.json`: M[a][b] = clamp(0.5 + (hpLeft_a − hpLeft_b) / 2, 0, 1), with hpLeft as a fraction of starting HP. `strongVs` and `weakVs` are the top and bottom 3 opponents of the same or adjacent age. CI fails if the file is stale. **The duels run on the sim itself** (`src/sim/duel.ts`; build phase H2, the open WP1 Phase 3 item, owner feedback 2026-09-29): the compact duel engine rated each age's Anti-armor against its own Heavy at 38-78 (a coin flip in six ages) where the sim gave 41-89, so the bots' `f_counter` and every Strong vs line disagreed with the game. The switch alone cut the tier V mirror Final Bell from 47.0 to 21.5% in Short War and the medians by about a minute (bots counter-pick with true numbers). The file's input hash includes `SIM_VERSION` (the hash cannot see sim code, so its version stands in; engine id 102 = the sim harness), the counters test re-duels a sample of pairs on the sim, and `npx tsx tools/counters.ts` regenerates it in about 15 s. On the sim, air bombers never trade with melee (they fly on to the gate), so they read as even against melee instead of 100%; the gunships still win.
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
  - Stone and Bronze parts bake at boot (`BOOT_AGES`, A17.13); the other ages bake during the tutorial or the menu (idle callback).
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
- **Pre-rendered 3D sheets (built).** Units, turrets and bases of every age use sprite sheets rendered from Blender rigs (`art/blender`, `public/art/**`, `unitSheets.gen.ts`) through the atlas adapter, with procedural puppets as the fallback. The A17 ages are wired the same way. On the long lane (A17.7) sheets load per age as each side reaches it, and a sharper 1.8 px/lu tier is planned for large screens.
- **Backdrop parallax (A17.7, built).** The backdrop view gets the camera window (`setView`, duck-typed) and places the sky, far and mid layers at 0.05 / 0.25 / 0.55 of the camera movement; the ground covers the 2,000 lu lane.
- **Backdrop skins (A18.9.4, built 2026-09-30).** `createBackdrop` takes optional `skins: { left, right }` (`backdrop.<id>` per half, left = side 0). The provider resolves each through the manifest (`backdrop.<age>@<id>`, one entry per age and theme, like unit skins) and an unknown skin warns once and draws the classic sky. The procedural tier re-grades the age's own layer textures once per layer, age and theme at bake time (`visuals/backdrops/themes.ts`) and draws the theme's weather over the mid-ground, under the ground (`backdropWeather.ts`); the backdrop view offers a duck-typed `setMotion({ reduce, lite })`. The UI shows the same painting through `cosmeticImageUrl('backdrop.<id>', { age })` (a painted still) and `{ layer: 'fx' }` (the weather as an animated SVG).
- **Ultra-realistic restyle (A11, A18.8.3).** The restyle replaces sheets per age behind the same manifest ids, Stone first, with the readability, colour and silhouette tests unchanged. Research looks (`research.<id>` and later `research.<id>.<ageId>`) and cosmetics (`cosmetic.<collection>.<id>`) are manifest entries too (A14.4).

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
- **Local clocks** drive daily timers (reset 04:00), limited by the bank caps (Daily rewards 7, quest queue 21; A15.4). The Sundial (5 h, holds 34; A6.3) runs on epoch time.
- **Settings defaults** (A15.6): `breakReminder` true, `quickReveal` false, `vibrate` false. The same defaults apply to every player; there is no separate minor-safe mode.
- **Schema version.** Every A15.18 shape change lands before the Checkpoint C push, so SaveDoc stays at version 1 with no migration. After that push, every shape change needs a migration.
- **Capsule ladder migration (2026-09-29, A6.4).** The next version after the newest one when it lands (re-read `src/save/migrations` first). `up`: (1) `capsules.bag` maps index 4 → 6, then sorts; `bagSize` = 100 if the bag is not empty, else 0; (2) pending capsules with tier `aeon` become `gold` (and `startTier` `aeon` → `gold`) with `contents.dust` + 100, nothing re-rolled; (3) sets `flags['capsule.legacySkillAeon']`, and meta's next `tickTimers` grants one new Aeon per skill source already claimed (Trophy Road 4,000, Conquest 27 stars, the War Path Cosmic boss) and deletes the flag; (4) sets `flags['notice.capsuleLadder']` when `pity.opened` > 5, a pending old Aeon was relabelled or a legacy Aeon is due. Tests: a named fixture outside the `fixtures/v*.json` glob (`capsule-ladder-pre.json`) plus the usual frozen `vN.json` (details: `docs/requests/capsule-tiers-wp8.md`).
- **Sundial migration (2026-09-30, A6.3; save v10).** No shape change. `capsules.charges` becomes the ready Sundial capsules one-for-one and `capsules.dailyBank` the Supply allowance left (it never grows again). `up` sets `flags['notice.sundial']` for a save with `matchesPlayed` > 0, and `flags['sundial.restart']` for a save at or above the old cap of 28: the old rule never moved `chargesUpdatedAt` while full, so without it the first tick would count every 5 h since the bank filled and turn 28 into up to 34. Meta's next `tickTimers` sets `chargesUpdatedAt` to that moment and deletes the flag. A Clay meter already at 2 pips becomes its Clay capsule at the same tick (rolling needs the content).

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
- **Meta:** bag totals exactly 60/80/40/13/4/2/1 per 200 (A6.4; the migrated old bag finishes its 30/40/20/7/3); 1 / 2 / 3 distinct Legendaries in Gold / Platinum / Aeon; the Legendary catch-up weights (including the 2nd and 3rd stacks); foils purely rolled on every stack; capsule skins leave Wardrobe pity untouched; honest climb and summit-strike invariants (no ring, summit gem or crest drawn before it is earned); no climbing capsule's rolled tier in any DOM, aria text or icon before it is opened; the legacy skill Aeon grant (once per claimed source); Epic pity at 10; Legendary pity curve 26-40; duplicate-Legendary protection; new-card protection; foil rates; script at capsules 1-5; charges and the Clay meter; upgrade costs; Dust; quest progress; MMR and tier formula; arena bot levels; Conquest stars.
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

**Changes since Phase 0.** The listing below is the Phase 0 snapshot; `src/contracts` is the truth. A17 added: `AgeId` gains `'bronze' | 'industrial' | 'cosmic'`; `EconomyRules.marchSpeedBp`, `siege.moveSpeedBp`, `frontWidth`, `siege.gateCrowdLu`, optional `gateFall` and `openGateLu`; `Settings.autoCamera` and `edgeScroll` (optional); `PendingCrate.source` gains `'welcome'`; save v2. A18 phase 2 makes one bump (A18.11): `FormatId` becomes an open string key into `content.formats`; `SideConfig.sideMods?`; `Command.research { track, group?, rank, pick }` and `research.cancel` replace `treasury`; `Command.stance { mode: 'charge' | 'hold' | 'fallback', holdP? }` replaces the toggle; tray slots `0..5` in `train` and `cancelTrain`; `MatchConfig.victory?`; `Observation.me/foe.research`, `stance`, `holdP`; `SimEvent` `researchStarted`, `researchDone`, `stanceChanged`; `SaveDoc` v3 (`warPath`, `difficulty`, 6-slot loadouts, later a Fort slot and cosmetics). Each new A18.8 age adds its `AgeId`. The power rework makes one more bump with `SIM_VERSION` 4.0.0 (A2.9.11): `PowerDef` gains `slot: 'home' | 'field'`, `reach`, `family`, `rarity`, `source`, `cost`, `reloadMs`, `maxTargets?`, `aiValueBp?`; `PowerEffect` gains `barrage.hitsGround?`, `buffAll.maxTargets`, `field`, `strike`, `suppress`; `StatusKind` gains `'snare'`; `EconomyRules` drops `powerChargeMs` and gains `power { ... }`; `Loadout.power` → `powers { home, field }`; `Command.power` gains `slot`; `SideState.powerPpm` and `powerRem` become pairs, plus `powerLockoutUntil` and `mountSilencedUntil[]`; `PowerCastState.slot` and `targetId`; `TrainingEvent.setPowerPpm { slot, ppm }`; events `powerReady { side, slot }`, `powerTelegraph` + `slot`, `cost`, `targetId`, `telegraphMs`, `turretSilenced`; reject codes `powerReloading`, `powerLockout`, `powerOutOfReach`, `powerNoTarget`; `Observation` and `HudModel` `me.powers` and `foe.powers` per slot; `ResearchEffect.powerReload` (was `powerCharge`) and `powerCost`; a new pure `src/core/powerReach.ts`.

```ts
// ids.ts
export type Side = 0 | 1;
export type AgeId = 'stone' | 'medieval' | 'gunpowder' | 'modern' | 'future'; // + 'bronze' | 'industrial' | 'cosmic' since A17
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type SkinRarity = 'rare' | 'epic' | 'legendary';                 // 'mythic' (Ascended forms) arrives in v1.2, A16.18
export type CardId = string; export type SkinId = string; export type VisualId = string; export type EffectId = string;
export type SoundId = string; export type MusicCueId = string;
export type EmoteId = 'laugh' | 'salute' | 'cry' | 'angry' | 'thumbsUp' | 'gg';
export type FormatId = 'tutorial' | 'short' | 'standard' | 'full';
export type CapsuleTier = 'clay' | 'bronze' | 'silver' | 'jade' | 'gold' | 'platinum' | 'aeon'; // gold, platinum: 2026-09-29 (A6.4)
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
  pityBefore: SaveDoc['pity']; pityAfter: SaveDoc['pity']; firstLegendaryReveal: CardId[];
  firstOfTier: boolean }   // 2026-09-29: climbs = the 4 main strikes' climbs + summit strikes (above
                           // capsules.summitAbove); strikeClimbs = the 4 main strikes only; firstOfTier:
                           // the save's first Gold, Platinum or Aeon (flag capsule.first.<tier>, A10 step 4b)
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
              clayMeter: number; dailyBank: number; dailyNextAt: number | null; bag: number[]; wardrobe: PendingCrate[];
              bagSize: number };  // 2026-09-29: bag = sorted tier indices left in the Win Capsule bag;
                                  // bagSize = the size of the bag they came from (100 legacy, 200 now), 0 when empty
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

- `capsules.charges`: bank maximum 28 (from 2026-09-30 the Sundial's ready capsules, maximum 34, A6.3).
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
| Sim step | ≤ 0.5 ms average on mobile; headless Full War ≤ 500 ms on desktop Node (A17), ≤ 850 ms from A18 |
| Procedural bake | Stone and Bronze (the first two ages of every format since A17) ≤ 400 ms at boot (measured 59 ms); others lazily |
| Audio pre-render | < 300 ms at boot (UI, battle, Stone and Bronze groups) |
| Unit sheets (A17.7) | Loaded per age as each side reaches it; a sharper 1.8 px/lu tier when s × DPR > 1.6; music ≤ 700 KB per age (loop plus stem), 7 MB total, streamed one age ahead |
| Off-view culling (A17.7) | Display objects, projectiles and emitters more than 150 lu outside the view are not drawn or emitted; state still updates |
| JS heap | ≤ 150 MB |
| DPR | Capped at 2 (1 in Lite) |

CI fails the build if the initial chunk exceeds 3 MB gzipped. The ultra-realistic restyle (A11) and 13 ages (A18.8) put pressure on the 8 MB total; the art track measures sheet sizes per age and the total is reviewed with the owner before it is raised.

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
5. **Meta honesty.** Published odds pass the chi-square test at p > 0.01 for the run as a whole: with k chi-square checks in one `sim:drops` run (Supply tiers, stack rarity, foils, each partial skin chance and each tier's skin rarity split), each check passes at p > 0.01 / k (Bonferroni), so a correct build fails a run by chance at most 1% of the time; pity boundaries, foil rates and the onboarding script are verified; capsule results persist before animation.
6. **Bots.** AI labeling appears on every surface listed in A7.1. Bot controllers receive only `Observation` (enforced by type and test).
7. **Save durability.** Survives reload, a corrupt slot and an export/import round trip; the v1 migration fixture exists.
8. **Performance.** B16 budgets are met on a mid-range Android phone (Chrome) and an iPhone (Safari), measured on the Full War sandbox with 80 units.
9. **Manual test.** The C5 checklist passes with no blocker or major bugs open. Items 69-88 (A18) count once their A18.13 phase is built, and item 89 once the capsule ladder is built.

## C5. Manual test checklist

**First session**

1. Fresh profile: page load to the Play button ≤ 3 s on desktop; one tap into match 1; the first Bonker spawns ≤ 10 s after the click.
2. Tutorial beats from A8 appear in order, text ≤ 8 words, each hint at most once; match 1 reaches the Future age and Grogg stays in Stone.
3. The first evolve shows the full sequence: freeze, flash, pillar, base morph, backdrop wipe from the base, banner, music key lift, allied cheer hop, 2 Vanguard units.
4. Arrow Storm drag shows the zone and telegraph, then hits.
5. Capsule 1 climbs to Bronze and reveals Drum Shaman NEW and Standard Bearer NEW (not auto-equipped; the summary offers Equip now). The Spear Hunter is already in the Stone loadout from the start, and match 1 taught it at the Tuskback beat.
6. Capsule 2 gives Friar and Field Surgeon; the forced Bonker upgrade plays the slam.
7. The stance flag is there from match 1 and the Last Stand button from match 2 (built 2026-09-28); after match 1 the player lands on Home, and War Plan, Customize, Quick Battle and Skirmish are open; capsule 5 plays the Matriarch walkout.

**Battle rules**

8. Three melee units fight side by side (A2.7); Pebblers fire over allies; melee units pass a parked Bronze Cannon.
9. Train 5 units quickly: the queue shows 5, a 6th tap is denied with the deny feedback, and right-click cancels the last instance of that card with a refund.
10. Reach 60 pop: a Heavy that does not fit shows ARMY FULL while a smaller queued unit behind it still trains and spawns.
11. Units queued during an evolve come out as the new age's cards.
12. A second Legendary cannot be queued while one is alive or queued.
13. Buy mounts 2-4 at 150/350/700; build and sell turrets (50% refund); old-age turrets keep firing after an evolve and show the Modernise arrow; Modernise charges the new price minus half the old one.
14. Turrets never hit the base; no turret shot lands beyond 480 lu from its gate (560 lu with range research, A18).
15. Hold stance pulls units back to the hold line (320); Charge sends them forward; the 2 s toggle cooldown works. (A18 phases 2 and 4 replace this with item 71.)
16. Power charge carries at most 50% across an evolve; the telegraph is visible to both sides; Legendaries take half power damage; power kills show reduced gold and no XP. With the power rework (A2.9): a cast pays its gold and starts its slot's reload; a Home power never touches an enemy past mid-lane; a cast never hits more units than its cap, and only eligible ones (the enemies nearest the caster's gate; the ghost's numbered pips show them); a buff never affects more than 8 units; each slot keeps at most 75% of its reload across an evolve; the Field slot appears after War Path Stone L5 or 150 trophies.
17. Overdrive, Siege and Final Bell trigger at the format times with their visuals and sounds; Siege decay is visible on both bases.
18. Last Stand arms at 25% with a horn icon visible to both sides, fires on tap after 1 s, auto-fires at 10%, and only once.
19. Retreat is unavailable before 1:00 and counts as a loss.
20. Pause stops everything; 1.5x and 2x speed work; hiding the tab auto-pauses.
21. Air: the Balloon Admiral ignores melee, ignores Hold and bombs; Flak prioritises air; melee cannot hit air; ranged units retarget an air unit overhead.
22. Each trait and ability works as written: ricochet, Shield Wall, Boarding Hook, suppression, pounce, stomp and riders, Ram siege, Roar shields, crash, Time Stop, EMP, called strikes, mark, gravity pull, toad drag.
23. Hits show the effective spark and the resisted puff for modified damage.

**Meta**

24. A new save starts with 12 ready Sundial capsules; the first 10 capsules use none; the Sundial readies 1 every 5 h and holds 34, a full Sundial says it has stopped filling, any finished match but the tutorial or a Retreat claims one, and Home shows no time (2026-09-30; was 1 per 6 h, 28, Ladder wins).
25. A ladder win grants trophies, 20 Amber and a Sundial Capsule while one is ready, and 40 Amber plus a Clay pip when none is; a loss gives 15 Amber and a ready Sundial Capsule, or a pip when none is; a Retreat gives 15 Amber, no capsule and no pip; 2 pips give a Clay capsule (2026-09-30; was: capsules while charges last, 3 pips).
26. The Supply allowance banks to 7; 3 new quests join the queue at 04:00; loss protection "Warm-up match" appears after 3 losses.
27. The odds sheet shows the bag state (60/80/40/13/4/2/1 per 200, "N of 200 left"; a migrated old bag says "of 100" and that it finishes its old mix) and pity counters, and the counters match what happens.
28. Capsule strikes never show a non-climb after a climb.
29. "Open all" works for 10 capsules; reloading mid-animation keeps the same result.
30. An upgrade spends copies and Amber, raises stats by +5% (card detail preview matches), and grants Codex points.
31. A copy past L10 becomes Dust; crafting a card and a crate skin works; Crystal Spire cannot be crafted.
32. The War Plan builder enforces the rules, shows advisor warnings, and auto-fill and Equip now work; presets save.
33. The Trophy Road claims nodes; 150 trophies unlocks Standard War, the ladder format picker and the Industrial and Modern Age Unlock Capsules; 400 trophies the Future and Cosmic ones; the eight alternate powers unlock at 100-500 (A17.13).
34. Conquest opens at Arena 3 and plays Standard War; stars and milestones pay once. (Replaced by item 80 when the War Path ships.)
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

45. The first Supply Capsule appears after capsule 2; from 2026-09-30 no new allowance accrues and an allowance already banked still needs 3 finished matches; the Sundial holds 34 (was: the allowance banks 7, charges bank 28). The quest panel shows 3 quests.
46. The War Chest fills from counting wins only (never Skirmish), grants at 20 and never resets.
47. The Daily offers three difficulties, shows the same opponent in two browsers set to the same date, pays from the bank, and Copy result copies the line with no name.
48. The wrap, tilt and break cards appear as specified, never in battle, with Home as the primary button. The night line appears after 22:00.
49. Closing the tab mid-match changes nothing. Retreat still counts as a loss.
50. Feats show "???" rows and Show hint; a found feat stages its own step and pays once.
51. The Wardrobe Crate uses the card flip and no reel exists. Quick reveal skips climbs.
52. Settings > For parents shows every line. Vibration is off by default.
53. Copy review: no string says "Nothing is lost while you're away", "Everything waits for you" or "we missed you", and none shows a countdown.

**Long lane and eight ages (A17)**

54. On an 844 × 390 phone infantry is about 62 px tall and about 40% of the world is visible; on a 1280 × 720 laptop about 60%. The match opens with the own base at the left edge and the camera walks out with the first wave.
55. Drag, swipe (with momentum), wheel, ← / → (Shift faster), edge scroll on desktop, H / Home and J / End, and minimap tap and scrub all move the camera; the rubber band springs back at both world ends; pinch or Ctrl + wheel zooms 0.8-1.25 and a double tap resets.
56. Any manual camera input stops auto-follow; it resumes by itself 5 s later (never while a finger is down, a mount popover is open or a power is dragged); the front button resumes it at once. With "Auto camera" Off it never resumes by itself. "Edge scroll" can be turned off.
57. The minimap shows territory, turret-cover brackets, both bases with HP, unit dots (circles yours, diamonds theirs, air above, Legendaries ringed), fronts, power zones and the camera window, and stays readable in both colourblind presets.
58. Off-screen badges appear for "base under attack", "power incoming" (with a countdown ring) and "enemy Legendary"; at most 3 per edge; tapping one jumps there; they never cover the centre of the lane.
59. With the base off-screen, the base button brings it into view (with a hammer badge when a mount is empty and affordable); Q, W and B build without moving the camera; a mount popover closes when its mount scrolls off.
60. A power dragged to the band's edge scrolls the camera; a power dropped on the minimap casts there; Space auto-aims anywhere on the lane.
61. The paused game still lets the player pan the camera and scout; replays use the spectator follow and show the minimap.
62. Short War plays Stone to Gunpowder (4 ages), Standard Stone to Modern (6), Full Stone to Cosmic (8); the tutorial still skips to Medieval, Gunpowder, Modern and Future, and its tray is right after every evolve.
63. Every card of Bronze, Industrial and Cosmic spawns, walks, attacks and dies with its own sheet (or the procedural fallback) and its sound; the three new bases morph on evolve; the backdrop parallax shows depth while scrolling and the split-age seam follows the fronts.
64. Each new ability works as written: Shield Bash, Javelineer and Scorpion pierce, Standard Bearer aura, Gorgon Bust and Tesla Tower stuns, Bronze Colossus slow and molten burst, Reel In, Flare Spotter mark, Sapper burst (never on the base), Land Dreadnought crew bail-out, Deflector, Ion Ranger chain, Starwarden beacon, Warp Stalker blink, Mothership drone strike and crash; the six new powers hit as described.
65. In Siege units march faster (banner "Siege! Forced march") and crowd the enemy gate so every unit hits the base; in Overdrive and Siege a unit killed next to its own gate damages its base.
66. Music transposes on each own evolve (+2, +2, +1, +1, +1, +1, +1) and drops the lead an octave past +6; each new age has its own arrangement and fanfare.
67. An old save (v1) loads with Bronze, Industrial and Cosmic loadouts filled from starter cards and the 15 new starter Commons at L1; nothing owned is lost. Capsule 1 of a new save gives Spear Hunter and Phalangite.
68. The Age Capsule dialog offers all 8 ages; Codex Level and quest timings match A17.13; the Evolver title needs Cosmic.

**Harder, longer, deeper (A18; each item is tested once its A18.13 phase is built)**

69. Pacing (phase 1): in a Standard War on Normal the first evolve lands near 1:10 and every later age lasts at least ~75 s; the match lasts about 10 minutes; kill XP, loss XP, base-damage XP and bounty follow A18.3.
70. Formats as windows (phase 2): Quick Battle and Skirmish offer a start era; a match that starts in a later age starts its base at that age's HP; the start screen labels read "about 7 min", "about 10 min" and "about 15 min"; the ladder shows the Era of the Week from Arena 3.
71. Stances (phases 2 and 4): Charge, Hold and Fall back work as in A18.4; the Hold flag drags on the lane and the minimap within [320, 800] in 20 lu steps; a second stance change within 3 s is refused with a short fill; toggling stance never re-arms a first-hit bonus; S and Shift+S work.
72. Six troops (phase 2): the tray shows 6 cards with keys 1-6 and fits on a 667 × 375 phone; old saves get a sixth slot filled automatically.
73. War Council (phase 3): the button right of the gold counter (and G) opens the sheet over the tray while the game runs; one item researches at a time; cancel refunds 75%; the side behind pays 20% less; picks apply only to units spawned after completion (with a shimmer on the others); owned picks survive an evolve; the enemy's research ring and picks are visible; the Treasury control is gone.
74. Council caps: no combination of research, doctrines and modifiers takes a unit past the A18.2 caps, and no turret shot lands beyond 560 lu from its gate.
75. The advisor outlines one "Suggested" pick with a reason on Easy and in War Path regions 1-2, never on Hard and up; the Council marks a class with no unit in the tray "Not in this tray"; the War Plan builder shows the classes each loadout holds.
76. Difficulty: Easy, Normal, Hard, Expert and Legendary change how the AI plays, never its stats; the VS screen shows "AI · <General> · Tier <n>"; a player who sends only a few units and evolves loses to Normal.
77. War Path (phase 5): Home centres on the map; the next level sits under Play with the difficulty picker (remembered); levels 1-10 per region follow the sawtooth with Lieutenant, Spike and Boss marked; objectives (hold out, take the tower, fixed loadout, mid-battle start) work; stars, crowns and first-clear rewards (Amber, card unlocks on L3 and the boss) pay once; after 3 losses in a row the result offers "Try Easy".
78. Boss Generals are labelled "AI General" with their tier, plan and research style; the boss's +50% base HP and extra turret are shown on the node and the VS screen; at 50% base HP the "enraged" banner and a 2 s warning appear.
79. Retry is instant and free; no lives, energy or timers exist anywhere on the map.
80. Conquest migration (phase 5): an old save's Conquest stars appear on the matching boss nodes and its milestones as star-chest credit; the Conquest tab is gone from Mode select and Home; nothing earned is lost.
81. Replays: after a balance update, an old replay keeps its result card, reads "Recorded on an older build" and does not play.
82. Card classes: every unit card in the tray, War Plan, Collection, card detail and capsule reveal shows its class icon and label; the card detail and a long-press or hover show "Strong vs" and "Weak vs"; nothing relies on colour alone.
83. Power targeting: dragging from the ready button shows a large ghost of the area with a valid or invalid tint and the units it would hit; a tap starts aiming and the next tap casts; releasing over the HUD cancels.
84. Presentation names: Bronze reads "Bronze Age: Hellas", Gunpowder "Age of Muskets", and Industrial carries Great War flavour on age cards, VS lines and region names; ids and saves are unchanged.
85. Forts (phase 6): a fort dragged onto a pad scaffolds for 5 s, at most 2 are alive, Heavy, siege and Legendary attacks deal ×2 to it, and the AI answers walls.
86. Cosmetics: emotes, quotes, base and national flags, base skins and decorations show in Collection with completion counts and equip in Customize; the chosen base cosmetics and flag show for both sides in battle and on the VS screen; nothing can be bought; no flag is picked from location.
87. War Relics (v1.1) apply only in War Path, Skirmish and Quick Battle, never in Ladder, Daily or PvP.
88. Online M1: the golden replays give the same hashes in Chromium, Firefox and WebKit in CI.
89. Capsule ladder (2026-09-29, A6.4, A10; counts once built): the odds panel lists 7 tiers and says "Exactly 1 Aeon, 2 Platinum and 4 Gold in every 200 Win Capsules" (Sundial Capsules from 2026-09-30) with "N of 200 left" (a migrated save shows "N of 100 left" and the legacy-bag line until that bag runs out); a Win or Supply Capsule shows only its start tier and "Win Capsule" / "Supply Capsule" in the tray, on the Capsules shelf and on the Result, and nothing sorts by its hidden tier; a Platinum from Clay plays 4 strikes, one summit gem rising, one summit strike and 2 crests, and a Gold shows no summit gem, socket or empty crest; the first Aeon shows the skippable "Your first Aeon Capsule" step; an Open all batch with two new Legendaries plays one full walkout and one 3 s skippable one; an old save's unopened Aeon opens as Gold with +100 Dust, and a save that had claimed Trophy Road 4,000 finds one new Aeon on its shelf; the one-time notice appears in the Capsules tab, not on Home; the Aeon Collection can be crafted for 3,000 Dust only after the first Aeon. **Copy scan** (automated with the C5 copy review, scoped to `capsule.*`, `capsuleTier.*`, `ui.odds.*`, `ui.capsules.*`, `ui.notice.capsuleLadder.*` and `cosmetic.set.aeon.*`): no "jackpot", "ultra rare", "rarest", "so close", "almost", "nearly", "lucky", "limited", "don't miss" or "only {n} left", and no countdown to a capsule; the bag state says "left", never "only".

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

- The sixth age, Bronze/Antiquity, inserted as data: done early by A17 (Bronze, Industrial and Cosmic are in v1). More ages follow A18.8: Nile and Rome, then Norse and Renaissance, then Shogun, once the realistic restyle is proven on Stone.
- 1-2 extra cards per age, designed as role sidegrades, not new roles.
- The "Chronicle" campaign (about 30 levels with disclosed modifiers): replaced by the War Path (A18.7): 10 levels and 2 side nodes per age region, built after the War Council (A18.13 phase 5).
- Endless Horde mode (A16.12).
- Boss Battles as a permanent numbered gallery (A16.12). The weekly kaiju event is dropped: no time-limited modes.
- Mythic tier as Ascended forms: cosmetic prestige variants of Legendary units with no extra power, pity at 150 eligible capsules, craftable (A16.18).
- Portrait layout.
- PWA install (manifest plus service worker cache), with no notifications of any kind (A15.1 red line 4).
- Card stars as challenges (A15.14) replace star levels.

**Online 1v1 (first multiplayer milestone)**

- **Server.** Superseded by A18.10: one Cloudflare Durable Object per match relays commands (free tier), clients simulate, and hashes are compared; milestones M0-M8. Earlier plan, kept as history: a Colyseus 0.17 room in `server/` hosting the same `src/sim` code.
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
