**Ageborn v1 design doc: implementer review (prioritized)**

Numbers were checked by hand and with a Monte Carlo run of the A6.4 roll algorithm (400k rolls per tier mix).

---

## P0: blockers. Fix before WP0 freezes contracts, or the build will deadlock, be biased or diverge

**1. Allies can never overtake each other, so melee gets stuck behind ranged (A2.7).**
- The sort by p plus "unit 2 may walk up to unit 1's position" plus the 0.3 spacing means order is fixed by spawn order.
- A Pebbler, Grenadier, Tankette (90), Bronze Cannon (320) or Behemoth (300) that is frontmost stops when a target is in range. Every melee unit behind it is then capped and never reaches the fight.
- Fix: ally caps (front-rank cap and spacing) apply only against an ally ahead that is moving, or whose max range is ≤ the mover's max range. A unit may pass a stationary, attacking, longer-range ally. Re-sort next tick with the tie-break p desc, then id asc.

**2. followSupport deadlock.**
- A support unit that is itself the frontmost friendly ground unit (for example trained first or alone) is capped at its own p − 60, so it never moves. The Repair Drone is air and has the same undefined case.
- Fix: compute "frontmost" over non-followSupport ground allies only. If none exist, followers advance to at most p = 200.

**3. Structural side-0 bias in the tick pipeline (B3). This breaks the 47-53% first-mover target, and mirrored seeds cannot cancel it.**
- (a) Step 8 applies damage immediately in id order, and dying units act no further. Side 0's commands apply first, so same-tick spawns give side 0 lower ids, and side 0 wins every same-tick mutual kill.
- (b) Step 14 moves side 0 first, so when fronts close, side 0 takes the whole gap (up to 3.5 lu per contact at 70 lu/s).
- Fix:
  - Two-phase impacts: collect every impact due this tick, then apply them all. A unit that dies this tick still delivers impacts already scheduled for this tick.
  - Movement: compute both sides' desired moves from pre-move positions. If opposing fronts would overlap, each side gets half of the remaining gap.

**4. Multi-attack units cannot be represented.**
- `UnitDef.attacks[]`, the Matriarch riders and the Behemoth's "two independent attacks" all conflict with `UnitState`, which has a single `targetId`, `impactTick`, `nextAttackTick` and `lastAttackTick`.
- Fix: `UnitState.attacks: {targetId, impactTick, nextAttackTick, lastAttackTick}[]`, indexed like `UnitDef.attacks`, with riders appended.
- Movement stops only when attack[0] has a target in range. Secondary attacks fire opportunistically.

**5. Overlap is undefined, yet many rules create it.**
- An enemy melee unit at our gate stands at our p ≈ 24 (small) to 60 (huge). That overlaps the spawn point at p = 20.
- Paratrooper landings, pounce landings, Toad drag, Gravity Well pull and knockback into allies all create overlap too.
- Fix, as one general rule:
  - Transient overlap is legal.
  - Movement may never increase overlap with an enemy.
  - An overlapping enemy counts as blocking, at edge distance 0.
  - Spawn stays at p = 20.

**6. Integer math is unimplementable as written.**
- "trunc at the end" over up to 6 bp factors overflows 2^31 and even 2^53 (650 × 14,500 × 20,000 × 13,000 × 12,000 × 20,000).
- Level scaling truncates away on small numbers:
  - Angry Beehive's 5 damage stays 5 at L2-L4 (5.25, 5.5, 5.75).
  - Drum Shaman's 8 stays 8 at L2.
  - Blunt ×0.70 on 5 gives 3 (−40%).
- Siege decay of 0.5%/s is 0.375 HP per tick on a 1,500 HP base, which truncates to 0 every tick.
- Fix:
  - Sequential `d = trunc(d × f / 10000)` in the fixed order level → typeMod → buffs → mark → phase → legendary, minimum 1.
  - Store HP, damage, heals and shields in centi-units (×100).
  - Base HP in milli-HP, or apply decay every 20 ticks with carry.

**7. The contracts cannot be frozen because about 25 referenced types are undefined.**
- Missing: TurretView, BaseView, BackdropView, EffectView, TeamPreset, Pt, ClipRef, HudModel, ActiveStatus, TurretState, ProjectileState, PowerCastState, CompiledTicks, ReplayDoc, CapsuleContents, CapsuleReveal, WardrobeReveal, PendingCrate, RewardStep, PlanIssue, Result, QuestState, ProfileStats, Settings, AvatarSpec and SkirmishOptions. feel.ts, i18n.ts and platform are also empty.
- The WP4/WP5 split depends on exactly these:
  - BaseView: `mountPoints()`, `setCrumble(stage)`, `morphTo(age, ms)`, `lastStandGlow()`.
  - BackdropView: `setSeam(x)`, `wipe(side, age, ms)`.
  - EffectView for projectiles: `fly(from, to, travelMs, arc)`.
- `session.ts` references HudModel from `render/`, which breaks "contracts import nothing".
- Fix: WP0 defines all of these in B15, and moves HudModel into contracts.

**8. Bot honesty is not enforced by the code.**
- `BotController.onTick(sim: Sim)` hands the AI the full state: opponent gold, queue and plan.
- Fix: `onTick(obs: Observation): Command[]`. The session keeps the observation ring buffer. Also delete the duplicate `sim.observe(side, delayTicks)`, because B10 and B15 both claim this job.
- The Observation lacks things the rules assume bots use:
  - `foe.lastStand` (the doc says attackers can "play around it")
  - `foe.stance`
  - `foe.treasury` (needed by the gold estimator)
  - active power telegraphs
  - own queue contents
  - unit level, maxHp and shield

**9. The tutorial needs sim hooks that do not exist.**
- The 150-gold gift, the "Bonker only" tray and the Pebbler "sliding in" at 0:20 have no Command or MatchConfig field.
- "First kill at 0:08" is impossible. The spawn is at about 0:04, the fronts meet about 8 s later, and a Bonker needs 8 hits to kill a Bonker, so the first kill lands at about 0:20 or later.
- Fix:
  - `MatchConfig.training.script: {tick, grantGold?, unlockSlot?}[]`, applied in step 1 and recorded in the replay.
  - Grogg's first units are a 40 HP "Training Dummy" card.
  - Retime the A8 beats from a scripted sim run.

---

## P1: numbers that contradict each other or the targets

**10. The first evolve at 0:55 is unreachable.**
- No kills happen before about 0:17, so the first 15 s give only 60 passive XP.
- Reaching 900 XP by 0:55 needs about 21 XP/s from 0:15, which is above the claimed 16.
- Even 16 XP/s requires about 8.6 gold/s of losses per side (16 = 4 + 1.4K). That means about 77% of income dying continuously, which does not happen in minute one.
- At 16 XP/s you have about 700 XP at 0:55, so Medieval lands around 1:07.
- The targets also disagree: A2.4 with A2.14 says 0:55 ± 15 s (40-70 s), while A2.14 also says a median of 55-75 s.
- Fix: Medieval threshold 900 → 700. Use one target: median 60 ± 10 s.

**11. Base HP is far too low for a 7:00 median, and there is no time-to-kill target.**
- At the gate, only the 2 front-rank melee units plus reach and ranged units can hit (unit 3 stands 14.4 lu back, beyond melee range 12).
- A modest push kills a Stone base (1,500 HP) in about 11 s: 2 Bonkers (40 DPS) + 2 Spear Hunters (43) + 4 Pebblers (51) = 134 DPS.
- TTK is the same in every age, so any push that gets through ends the match.
- Fix: add an A2.14 row: "an unopposed same-age army of 20 pop needs ≥ 40 s to kill a full base". Get there with base HP about 4× (6,000 × P), or units deal ×0.35 to bases (Ram vsBase and Siege ×2 unchanged).

**12. Three default powers break their own A2.9 target (60-100% of a Light unit, 15-35% of a Heavy).** Coverage is count × 2r / zone.
- Meteor: 2.8 hits × 70 = 196, which is 123% of a Bonker.
- Carpet Bomber: 2.4 × 240 = 576, which is 146% of a Trench Raider and 42% of a Tankette.
- Orbital Lance: 650, which is 116% of a Photon Knight (470 + 90 shield).
- Fix: Meteor 50, Carpet 150, Lance 450.
- Define "Light unit" as that age's Infantry common at L1.
- Define barrage sequencing: impact i at `telegraphEnd + floor(i × durTicks / count)`, at x = `zoneStart + (i + 0.5) × zone / count + jitter`, ordered from the caster's side.

**13. Capsule totals and the whole A6.9 pacing table are wrong.**
- "Total copies" is only reached when a Common stack exists. Simulated averages:

  | Tier | Stated total | Simulated average | Minimum |
  |---|---|---|---|
  | Clay | 4 | 3.8 | 2 |
  | Bronze | 8 | 7.8 | 4 |
  | Silver | 16 | 14.2 | 8 |
  | Gold | 36 | 27.0 | 11 (the 25% Legendary eats the only Common stack) |
  | Aeon | 50 | 49.3 | 9 |

- Copies per bag capsule are 8.55, not 9.4. Per day (4 wins + daily) the total is 44.8, not 47-55.
- Commons get 1.10 copies per card per day, not 1.4. Maxing a Common (276 copies) therefore takes about 250 days, not 6-7 months.
- Total Amber to max everything is 194,250 (25×3,585 + 15×3,575 + 10×3,500 + 5×3,200). At about 1,350 per day that is about 145 days, so Amber runs out about 100 days before copies. The claim "running out at about the same time" is false.
- Fix:
  - Fixed Common copies per Common stack: Clay 2, Bronze 3, Silver 5, Gold 10, Aeon 12.
  - Gold's Legendary upgrade always converts a Rare stack.
  - Common upgrade copies 2/3/5/8/12/18/25/35/45 (153 total).
  - Rerun sim:economy.

**14. Turrets are structurally strong, and the A2.14 turret metric is undefined.**
- "Damage per gold over 90 s" does not say how a unit's number is measured:
  - Rock Tosser: 12 damage per gold.
  - Bonker, if it lived 90 s: 36.
  - Bonker, realistic lifetime: about 2.4.
  - So the test either always passes or always fails.
- Pitch Cauldron (175 gold, invulnerable) does 40 DPS to every ground enemy within 130 lu, which covers every melee attacker at the gate. Four of them kill a Footman in 1.35 s.
- Fix:
  - Metric = card's total damage in the balance sim ÷ gold spent on that card, per age. Turrets ≤ 1.3× the unit median.
  - Pitch Cauldron: 12 per 0.5 s, maximum 4 targets.

**15. Legendary drop rules contradict each other in Arena 1.**
- Arena 1 says "no random Legendaries", but Aeon guarantees a Legendary stack, Gold has a 25% Legendary chance, pity guarantees one at capsule 40, and the script grants the Matriarch at capsule 10.
- Nothing says which capsule kinds (win, daily, road, age, ageUnlock, collection) count toward pity counters or script indices.
- Fix:
  - "No random" disables only the 1% per-stack roll. Aeon, Gold and pity draw from the ages 1-3 Legendaries.
  - Pity and script count every opened capsule except Age Unlock.
  - The daily bank starts at 0 until after capsule 2.

**16. The balance test is statistically unsound.**
- ±3 points with 400 matches has a standard error of 2.5 points. A perfectly balanced card fails about 23% of the time, so across 55 cards the suite essentially always fails.
- "Archetype baseline" and "turret-heavy War Plan" are undefined.
- Fix:
  - 2,000 mirrored matches per card. Fail only when the 95% confidence interval lies outside ±3. Smoke run: 400 matches, ±6.
  - Baseline per age = 3 Commons + the AA Rare + default turrets and power. The test plan swaps the card into its same-role slot.
  - Both sides play tier V with the Balanced brain at L7.

**17. The performance target is fantasy and does not matter anyway.**
- 12,000 ticks in 50 ms is 4.2 µs per tick, with 80 units, densest-point scans and bots deciding every 10-32 ticks.
- Fix: ≤ 400 ms per headless Full War. Run the matrix on worker_threads (55 cards × 2,000 × 0.4 s ÷ 8 workers ≈ 1.5 h nightly).

**18. Golden replays break on every Phase 3 tuning change** because `contentHash` changes.
- Fix: golden replays run against a frozen test-content fixture, not live content.

---

## P1: rules that are too vague to code

**19. The hit-air rule is stated twice and the two versions conflict.** "Range ≥ 100 hits air" coexists with ad-hoc "air" markers.
- Ambiguous cases:
  - Flak: does it hit ground?
  - Gravity Well damage vs air
  - Behemoth MG "(air)": air only?
  - Grapeshot's 90 lu tail
  - Time Stop and EMP vs air mech
- Fix: explicit `hitsGround` and `hitsAir` on every attack, with a table column. Delete the implicit rule.

**20. Counts are ambiguous:** "pierces 2", "bounces to 3", "chains to 3", "cleave 3 / up to 3 within 60", "1 enemy within 40 behind".
- Fix: the count includes the primary target, and reach is measured from the primary target's centre, away from the attacker.
- Totals: Rail 2, Chainshot 4, Honk 3, Arc 3, Ursa 2, Chrono 3.

**21. Status semantics are incomplete.**
- The attack-speed formula is unspecified.
- `timeSlow` is unused.
- "Frozen" (Time Stop) has no status kind.
- Nanite heal-over-time has no status kind.
- It is unclear whether a weaker reapply refreshes the stronger status.
- Fix:
  - `interval = round(baseTicks × 10000 / (10000 + bp))`, applied at attack start.
  - Delete `timeSlow`.
  - Time Stop = stun with a visual flag.
  - Add a `regen` status.
  - Reapply: magnitude = max, expiry = max.

**22. Heal split is undefined.**
- "40 HP/s split between 2": with only one damaged ally, does it get 20 or 10 per pulse? Is "most-damaged" by % or by absolute HP?
- Fix: per-pulse pool = hpPerSec × pulseMs / 1000, level-scaled. Split it equally over up to N targets ranked by lowest HP bp, ties to the lower id. Overflow is lost.

**23. Periodic abilities have no common trigger rule.**
- Roar, callStrike, EMP and Time Stop ("first contact and every 15 s") all lack one.
- The contract also lacks EMP's trigger radius and shield-strip scope.
- Fix:
  - All periodic abilities are ready at spawn and fire on the first tick their condition holds. Cooldown runs from the fire tick.
  - EMP strips temporary and innate shields of all enemies within 120 lu, stuns mech only (air mech included), and restarts the innate-shield regen delay.

**24. Bomber and base targeting are unspecified.**
- "Air obeys stance" conflicts with "bomber never stops".
- Bomb damage to the base is not given, and nothing says whether splash hits bases.
- Fix:
  - The bomber ignores Hold.
  - Base target = `targetId −1`.
  - A base takes damage only from attacks that targeted it (vsBaseDamage, else the listed damage). Splash never damages a base.

**25. Summons are underspecified.**
- The Paratroopers' level source is unclear. `SideConfig.levels` must hold every owned card.
- No fallback when the enemy has no ground unit.
- Bounty is lopsided: one Paratroopers cast hands the enemy 180 gold and 300 XP.
- Fix: land at p = 600 when there are no enemy ground units. Summons give 50% bounty and 0 owner loss-XP.

**26. Pounce and Toad have edge-case gaps.**
- Pounce: the landing point is undefined. Fix: target centre − (wT + wS)/2. If there is no target, no leap and no cooldown.
- Toad: the fallback "frontmost small/medium" is dragged 0 lu by the "no further than their frontmost" clamp, and a drag can pass through our blockers. Fix: the fallback is the second-frontmost enemy, and the drag is clamped short of our nearest ground unit.

**27. Ascension, Overcharge and phases leave open questions.**
- During the 2.5 s Ascension it is unclear whether the player can enqueue, cast, build, sell, use Last Stand or change stance.
- Overcharge at 100% charge is undefined.
- The phase is a single enum, so does Siege keep Overdrive's ×2 and ×1.5? Is Treasury income "passive"?
- Fix:
  - Everything except evolve is allowed during Ascension, and builds use the old age until `ageUp`.
  - XP converts only while charge < 100%.
  - Siege includes Overdrive effects, and Treasury income counts as passive.

**28. Events cannot feed quests or the MVP card.**
- `died` lacks `killerId`/`killerCard`, and `hit.sourceId` is ambiguous for powers.
- "5 Heavies with AA", "Hit 5+ with one power" and the MVP card are therefore not computable.
- Fix: `died {killerId, killerCard, killerKind}` and `hit {sourceCard, castId}`, where the killer is the last hit. MatchStats is an event reducer in `sim/stats.ts`, owned by WP2.

**29. Death cascades (Balloon crash, rider spawns) are undefined.**
- Fix: step 13 loops in id order until stable, capped at 8 passes.

**30. Deck size contradicts itself.**
- "Exactly 4 units, 2 turrets" conflicts with "minimum 3 units, 1 turret" and with the 2-unit tutorial.
- Fix: 1-4 units and 1-2 turrets, with null slots. A train command on an empty slot is rejected.

**31. Cancel acts on the wrong card.**
- Right-click on a card cancels the *last queued item*, which may be a different card.
- Fix: `cancelTrain {slot?}` removes the last instance of that card. Backspace removes the last item overall.

**32. Turret build/sell details are missing.**
- Does a selling turret fire? Can a mount be rebuilt during the 1 s sell?
- Fix: a selling turret stops firing at once, and the mount frees at the end. Gold is paid at build start, and a build is not cancellable.

**33. The MMR-to-tier mapping is undefined, and categorical tier columns cannot be "interpolated linearly".**
- "First 10 matches one tier down" gives tier 0 in Arena 1 (band I-II).
- Fix:
  - tier = clamp(round((MMR − 835) / 100), arenaMin, arenaMax), where 35 Elo ≈ 55% expected.
  - The first-10 handicap becomes +10 percentage points of mistake rate instead of a tier shift.
  - Make every tier column numeric: counterDepth 0/1/3/99, power threshold in cost 100/250/350/450/600.

**34. The AI brain has no formulas.**
- Counter value, push value, personality weights and the "full matrix" are all undefined, so WP3 will invent the game's difficulty.
- Fix:
  - score = Σ wᵢ fᵢ with each fᵢ in [0,1], and write out the fᵢ formulas.
  - Weight multiplier = 0.5 + w/100.
  - A counter matrix computed at compile time from 1v1 duels of every unit pair. The same matrix auto-derives `strongVs` and `weakVs`, which Part A never lists yet UnitDef requires.

**35. The A6.8 swap rule has nothing to swap in.**
- "Swap for a Common of the same role" is impossible for AA, Support, Epic and Legendary.
- Fix: swap in that age's starter card for the slot. If that is not possible, drop the card to the target level.

**36. Meta clocks are unspecified.**
- Capsule-charge accrual, quest and daily boundaries, whether Daily and Skirmish wins consume charges, the Skirmish Amber amount, and whether Skirmish counts for quests (farmable at tier I on 2x).
- Fix:
  - +1 charge per 6 h, continuous.
  - All dailies reset at local 04:00.
  - Skirmish pays 5 Amber and counts only for the Play and Train quests.

**37. Capsule roll edge cases.**
- Age Capsule: "age you choose" must be chosen at grant (a picker), then rolled.
- Pity order and new-card protection when no stack has the unowned rarity. Fix: Legendary pity → Epic pity → new-card, which upgrades the lowest non-guaranteed stack to the cheapest unowned card's rarity.
- Legendary pity probability: p = min(1, (n − 25) × 0.05).

**38. Content gaps.**
- Trophy Road alternation and "Epic every other one" are ambiguous. Fix: publish all 45 nodes as a table.
- Arena 1's banner is missing from its gate rewards.
- "The Warden rematches" and how you ever face the Warden are undefined, which makes Warden's Bane unobtainable.
- Nothing says whether Crystal Spire is in the crate pool.

---

## P1: architecture and the art-swap path

**39. Skins are procedural-only, so the swap path is not real for them.**
- `visualPatch {palette, overlays, aura}` means nothing to atlas or Spine art.
- Cake Launcher (a different projectile) and Ghost Corsair (translucency) cannot be expressed, and both violate the "may change" list.
- Fix:
  - Skins resolve to their own manifest entry (`unit.bonker@pumpkin_head`) with adapter-specific data.
  - Add `projectileVisualId` and `filters` to the skin data.
  - Team colour via a tint-mask layer that every adapter must provide: per-part mask textures for atlas, `team_*` slots for Spine. `teamZones: string[]` is procedural-only.

**40. Art is sized in px@720p while the world is in lu.**
- The lane scale follows width: 0.82 px/lu at 1,280 px wide and 0.54 on an 844 px phone.
- On 4:3 screens units therefore draw about 1.6× wider than their collision width.
- Fix: author all art in lu (infantry about 68 lu tall, heavy 100-120, Legendary 170-220) with one world scale.

**41. `graphicsContextToSvg()` may not be a real Pixi v8 API.**
- Fix: author every part as SVG path data. Export is then the source itself, and the IoU mask test rasterises the same data.

**42. ≤ 25 draw calls is not credible** with Graphics health bars, filters, BitmapText, a split backdrop with a seam mask and vignettes.
- Fix: ≤ 80 on High and ≤ 40 on Lite, measured in the sandbox.

**43. Rarity colours collide with team colours.**
- Rare #3D8BFF vs player blue #2F7DF6.
- Legendary #F5B82E vs the Blue/Yellow preset's opponent colour #F2C21E.
- The Legendary battlefield aura puts rarity colour in the lane anyway.
- Fix: Rare UI colour #22B8CF, and a neutral white shimmer for the Legendary aura.

**44. The layer table has holes.**
- `ui` cannot import `content` or `i18n`, yet the screens show stats, names and filters.
- `i18n` is missing from the table.
- `meta` must produce `OpponentSpec.displayName`, but the name tables live in `ai`.
- `render` "imports visuals via ArtProvider", but the interfaces live in contracts.
- Fix:
  - An i18n layer that imports contracts only.
  - `ui` may import content (read-only) and i18n.
  - Name tables move to content.
  - `render` never imports visuals.

**45. Types and schemas will drift.** SaveDoc and UnitDef exist twice: as TS in contracts and as Valibot schemas.
- Fix: `expectTypeOf<InferOutput<typeof S>>().toEqualTypeOf<T>()` tests for each pair.

**46. Ownership collisions and false parallelism.**
- `ui/screens/replay` vs `app/screens/replay` (WP9 vs WP11).
- `dev/sandbox/page.tsx` has no owner.
- `i18n/index.ts` is owned by WP1, but WP5, WP9 and WP10 need it on day 1. Move it to WP0.
- WP5's DoD needs WP2, WP3 and WP4, which is Phase 2 work inside a Phase 1 DoD.
- WP2's ability tests cannot run on the 2-age × 3-unit fakes.
- Fix: WP0 ships the raw A5 tables as `content/raw/*.ts`. WP1 adds only schema, compile and strings.

**47. ID enumerations are missing.**
- `proj.*`, `fx.*` and per-card sfx mappings are never listed. Log Roller, Pitch Cauldron, Gravity Well, Flak and Grapeshot have no fire sound in A13.
- "Read IDs from Part A" is therefore impossible.
- Fix: an ID appendix for every visualId, effectId, soundId and musicCueId.

**48. Many tunables are hard-coded outside `EconomyRules`.** This violates "numbers are data".
- Spawn p, leash, spacing 0.3, hold retreat 70%, first-hit idle 2 s, stance cooldown, knockback resist by size, turret build/sell 1 s, the Legendary limit and the emote cooldown.
- Fix: add them all to `EconomyRules`.

---

## P2: scope

**49. v1 is not achievable as "fully working and polished" at this size.**
- The list: 55 cards with 12 bespoke ability clips, 27 skins with an IoU test, 5 bases with crumble states and morphs, 15 backdrop layers plus 8 arena grounds, 11 generals, 10 tiers, Echo, 8 daily modifiers, replay seek, crafting and dust, Collection Level, 45 road nodes, 3 themes × 5 arrangements, about 115 sound IDs × 3-5 variants, EN and DA, 8 dev pages, and WebKit e2e.
- Keep all 5 ages, 55 cards, capsules and upgrades (they are core to the brief). Cut to:
  - 10 skins, no Mythic.
  - 3 modifiers.
  - 6 generals + Echo.
  - 1 Dawn March.
  - DA in v1.1 (keys stay).
  - Replay recording and verify only, no viewer seek.
- Put the cut order in D2 now.

---

## P3: minor

- **Broken cross-reference.** Section 0.2 points to "A4" for the deck advisor, but A4 is empty.
- **Starter kit wording.** "Owned from first launch" contradicts the AA Rares being granted later.
- **Key changes run out.** The music key change is capped at 2 steps, so evolves 3-4 get no key lift (pillar 2). Fix: +2, +2, +1, +1 semitones.
- **Tray overflows on phones.** On an 844 px landscape phone with safe areas (about 756 px) the tray needs about 832 px. Fix: 72 px cards below 900 px width, and move emote to the top bar.
- **Scouted strip sits in the lane band.** "Under the right side" of the top bar is inside the lane band, which contradicts "no control covers the lane".
- **Ambiguous draw reporting.** `MatchOutcome` 'draw' vs 'finalBell' with `winner = null` is ambiguous.
- **Event and history types.**
  - `SimEvent` has no tick field.
  - `killerKind` is an untyped string.
  - `PendingCapsule.kind` lacks 'collection', 'gate' and 'script'.
  - SaveDoc lacks owned powers, Daily Challenge state and matches played.
- **Treasury opener.** Treasury L1 at 0:00 is a likely dominant opener (175 start gold, 75 s payback). The sim should check it; if it dominates, start gold 125.
- **Versions.** Pin all versions exactly. "Playwright 1.5x" is not pinnable. Verify Vite 8 with `@preact/preset-vite` at WP0.
