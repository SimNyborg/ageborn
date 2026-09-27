# Depth features: how they fit the architecture

**Status.** Research note, 2026-09-27. Input for the orchestrator's battle-depth design. Nothing here is decided until it is merged into `docs/DESIGN.md`.

**Scope.** For each of the owner's directions (evolve choices, lane features and weather, underground layer, fortifications, a large card pool with a keyword system, an ultra-rare tier and shiny variants, draft/random/boss/endless modes, commanders, Battle Puzzles, the advantage graph, ghost battles and share links, emotes and quips, the home village, clans and reinforcements): which contracts, sim systems, content tables, save fields, meta rules, AI changes, screens and art it needs; what can be pure data; what it does to determinism and replays; the share-link payload sizes; and a rough size.

**Read for this note.** DESIGN A2, A3, A5, A6.4-A6.6, A7, B2-B5, B8, B9, B15, D1; `docs/design-engagement.md` (A15, binding); the built code in `src/sim`, `src/content`, `src/contracts`, `src/ai`, and the parts of `src/render`, `src/visuals` and `src/ui` that touch these topics. `src/meta` and `src/save` are still empty. I also ran 36 headless bot matches (18 tier VII mirrors, 18 tier V vs VIII) to measure real replay sizes (section 5).

**Size scale** (A15.19, plus XL): **XS** strings or one value. **S** one or two WPs, mostly data, no frozen-contract change. **M** a frozen-contract change, three or more WPs, or a new screen or rule set. **L** several WPs with new art, content authoring, contract changes and an economy or balance re-run. **XL** needs a server, or a new dimension in the sim.

---

## 0. Key findings

1. **Abilities are closed, hand-coded kinds today.** `AbilityDef` is a 16-member union. `rules.ts` compiles each kind into one nullable field on `UnitRules`, so a card can hold only one ability of each kind, and each kind is read by its own system file. A new behaviour means touching the contract, schema, rules, a system, the event mapper and tests. Of the 35 v1 units, 8 needed a one-off active ability in code (Sabertooth, Matriarch, Battering Ram, Ursa Paladin, Balloon Admiral, Radio Operator, EMP Saboteur, Chrono Titan), and 3 more have a single-card passive kind (innate shield, Shield Wall, Brace). The rest are already pure data, thanks to the rich `AttackDef` (7 area shapes, on-hit statuses, damage mods, priority, drag and pull).
2. **A keyword engine** (trigger, selector, effect, plus static traits) would turn about 9 in 10 future cards into data. It sits alongside the old kinds, so v1 golden replays keep passing (section 3).
3. **One "rule mods" engine unlocks six directions.** Doctrines, lane features, weather, commanders, synergies, and boss or endless handicaps are all "change a number for a side, a group or a zone". Today `MatchMods` is match-wide and has 6 hard-coded fields. Build a data-driven ModEffect vocabulary once (F1).
4. **Bug risk, fix in v1 (S).** The sim ignores the modifier effects in content. `src/sim/modifiers.ts` hard-codes `DAILY_MODIFIERS`, while `src/content/dailyModifiers.ts` holds the same numbers as data. They have already drifted in sign: `siegeShift ms: -75000` in content against `siegeEarlierMs: 75000` in the sim. A Phase 3 tuning of the content numbers would change `contentHash` but not the game.
5. **The replay compatibility key is too coarse for a growing card pool.** `contentHash` covers every card (`compile.ts` `hashedSlice`), so each new card or season makes every stored and shared replay "from an older version". `replayMatch` checks only `contentHash` and never `SIM_VERSION`, so a sim-only change silently breaks old replays. Fix: a per-match hash over the rules plus only the cards in play, and a semver rule on `SIM_VERSION` (F3, S).
6. **The share payloads are small.** Measured: 44-391 commands per bot match, about 2.2 bytes per command when bit-packed, and 214-544 bytes after deflate. A full replay link is about 0.4-0.9 K characters for bot-like play and about 2.5-3 K for a very busy human. A War Plan code is 51-66 characters; a ghost challenge about 83-100 (section 5).
7. **Several things are hard-wired and block growth:** the `Rarity`, `EmoteId`, `FormatId` and `Tag` unions; the `Command` slot literals `0|1|2|3|4` and `0|1`, with 5 hard-coded slot checks; `Loadout` lengths 5 and 2; and `UnitState.air: boolean`, which about 50 lines in 8 sim files read. The underground layer should start with a `canHitLayer` refactor.
8. **Fortifications fit best as stationary units** with a `structure` trait (targeting, damage, deaths, hashing, views and events all reused), not as a new entity type. A fun-gate prototype is S: one trait plus a sandbox button.
9. **Keep the lane free of hidden information.** The renderer draws the full `SimState`, and bots must see what humans see (A7.1). Traps, tunnels and fog must be visible to both sides; otherwise they need a per-side visibility system (L). Visible and telegraphed is also more honest and more readable on a phone.
10. **Offline social play needs no server.** Deterministic replays plus text codes (Poki-safe) and URL fragments (GitHub Pages builds) give challenge codes, "AI · Echo of ..." battles, replay links and puzzle scores. Real-time play, friends, clans and reinforcements need the relay server milestone. Workers Free CPU limits (milliseconds per request; check at the time) rule out re-simulating replays on the server, so verification must be done by peers or offline.
11. **The village fits as DOM hotspots over images from a new `ArtProvider.building()` method** (like `portrait()`). Building stages come purely from existing save progress, so v1-lite needs no save field and no migration. The "resource trickle on a clock" conflicts with A15 engagement rule 1 and should be earned by play.
12. **Measured side notes for the depth team** (36 untuned bot matches):
    - Tier VII bots toggled stance up to 116 times per Full War, 22-35% of all their commands in 4 of 6 matches.
    - 20 of 36 matches ran to the Final Bell (target < 3%).
    - Both matter for the anti-spam and anti-turtle work; Phase 3 tuning may change them.

---

## 1. What exists today (as built)

### 1.1 Simulation shape

- `step.ts` runs the B3 pipeline in 17 fixed steps. State is integer-only (`state.ts`: milli-lu, centi-HP, milli-gold, ppm, bp). The sim RNG (`s.rng`, sfc32) is used only for power jitter, Congreve scatter and Smoke Screen misses.
- All entities live in one id-ordered `units` array. Turrets are slots on `SideState`, not entities.
- `hashState.ts` hashes an explicit field list every 20 ticks. The golden replays in `src/sim/test/golden/` run against the frozen fixture content, so content tuning never breaks them; only sim behaviour changes do.
- `createSim` logs every applied command, bot commands included, so a replay needs no AI code to play back.

### 1.2 How abilities are implemented

| Layer | What it does today |
|---|---|
| Contract `AbilityDef` (`contracts/content.ts`) | A closed union: `firstHitBonus`, `aura`, `heal`, `pounce`, `riders`, `onDeathExplode`, `periodicShieldAura`, `callStrike`, `emp`, `timeStop`, `innateShield`, `resist`, `brace`, `siegeOnly`, `bomber`, `followSupport` |
| Compile (`sim/rules.ts` `unitRules`) | A `switch` fills one nullable field per kind on `UnitRules` (`r.aura`, `r.roar`, `r.strike`, ...). A second ability of the same kind overwrites the first. Periodic kinds keep their cooldown in `u.timers[slot]` |
| Dispatch | Spread across systems: `abilities.ts` (heal pulse, roar, strike, emp, timeStop, pounce), `status.ts` (aura, innate), `combat.ts`, `impacts.ts` and `damage.ts` (firstHit, brace, resist), `deaths.ts` (riders, deathExplode), `targeting.ts` (siegeOnly, bomber), `movement.ts` (follow, bomber) |
| Events and view | `abilityUsed { ability: AbilityDef['kind'] }`. `render/eventMapper.ts:323` special-cases `callStrike` and `pounce` by name |
| AI | `ai/book.ts` knows cost, group, range, air and hits-air, plus the counter matrix M[a][b] from `content:counters` duels. The bot scores cards by counters, so a new card gets sensible AI play as soon as the matrix is regenerated |
| Already data | Everything in `AttackDef`: splash, pierce, cleave, chain, line, gate zone, follow-behind, volley, scatter, min range, `mods`, `priority`, `onHit` statuses (8 kinds), drag, pull, `vsBaseDamage`. Powers are 6 effect kinds with numbers |

**Cost of a new behaviour today:** a union member in the frozen contract, a Valibot schema branch, a `rules.ts` field, system code at the right pipeline step, hashing of any new state, event mapping, a clip, a test, and a golden re-record (with a `SIM_VERSION` bump) if it touches a shared path.

### 1.3 Modifiers are code, not data

`matchMods()` (`sim/modifiers.ts`) maps modifier ids to hard-coded functions. The content table `dailyModifiers.list[id].effect` (typed `ModifierEffect`) is validated and hashed but never read by the sim. The sim cannot import `content` (B2) and `CompiledContent.dailyModifiers` is typed `unknown`, which is why the duplicate exists.

**Fix (S, WP0 + WP2):** move `ModifierEffect` into `contracts/content.ts` and have the sim read the effects through a narrow structural type. This is the seed of F1.

### 1.4 Replay compatibility

- `ReplayDoc` stamps `simVersion: '1.0.0'` and `contentHash`. `replayMatch` rejects only a `contentHash` mismatch.
- `contentHash` covers ages, formats, economy, battle rules, **all** units, turrets and powers, and the modifier list (`compile.ts` `hashedSlice`). Presentation fields and meta tables are stripped, which is good.
- Consequence: every new card, and every balance change to any card, invalidates every replay, including ones that never used the changed card.

### 1.5 Hard-wired shapes that block growth

| Shape | Where | Blocks |
|---|---|---|
| `Rarity` 4 values; `Record<Rarity, …>` in rarity, capsule and pity tables | `contracts/ids.ts`, `content/types.ts` | Ultra-rare tier |
| `Foil` 4 values; foils "never appear in the lane" (A5.8) | ids, A6.4 step 5 | Shiny variants in the lane |
| `EmoteId` 6 literals, carried by the `emote` command and event | ids, commands, events | Collectible emotes and quips |
| `FormatId` 4 literals | ids | New short formats (Blitz), endless |
| `Tag` 10 literals | ids | `structure`, `under`, set or family tags |
| `train.slot: 0-4`, `buildTurret.slot: 0-1`, `mount: 0-3`; `isSlot(c.slot, 5)` | `contracts/commands.ts`, `sim/commands.ts`, `ai/actions.ts` | More loadout slots, structure slots |
| `Loadout.units` length 5, `turrets` length 2 | `contracts/sim.ts`, A3 | Larger War Plans |
| `UnitState.air: boolean`; about 50 lines in 8 sim files read air, hitsAir or hitsGround | sim | Underground layer |
| `MatchMods`: match-wide, 6 fixed fields | `sim/modifiers.ts` | Per-side, per-group and per-zone rules |

---

## 2. Five foundations (build once, unlock many)

| # | Foundation | Unlocks | Size |
|---|---|---|---|
| F1 | **Rule mods engine**: `ModEffect` data with a scope, applied at match, side or zone level | Weather, lane features, doctrines, commanders, synergies, boss, endless, Daily pairs | M |
| F2 | **Keyword engine** (section 3) | Card pool growth, underground, traps and mines, reinforcements, boss phases | L |
| F3 | **Match hash, version policy and share codec** | Share codes, ghost battles, replay links, puzzles, clips, clan wars | S (hash + policy) + S (codec) |
| F4 | **Scenario start**: set a state at tick 0 from data | Battle Puzzles, boss setups, better tutorials | S |
| F5 | **Data-driven slots and layers**: slot counts in `EconomyRules`, `number` slots in `Command`, a `layer` on units | More loadout slots, structure and commander slots, underground | M |

### F1 Rule mods engine

```ts
// contracts/content.ts (new, optional use)
interface ModScope { side?: 'self' | 'foe' | 'both'; groups?: RoleGroup[]; tags?: Tag[]; cards?: CardId[];
  zone?: { p0: number; p1: number; mirrored: boolean } }            // lu, own-side progress
type ModEffect =
  | { k: 'passiveGold' | 'passiveXp' | 'treasuryIncome' | 'powerCharge' | 'xpThreshold' | 'baseHp'; bp: number }
  | { k: 'unitCost' | 'unitHp' | 'unitDamage' | 'damageTaken' | 'moveSpeed' | 'attackSpeed' | 'range' | 'trainTime'; bp: number; scope?: ModScope }
  | { k: 'turretDamage' | 'turretRange'; bp: number }
  | { k: 'popCap' | 'queueMax' | 'frontWidth'; add: number; scope?: ModScope }
  | { k: 'siegeShift'; ms: number }
  | { k: 'grantKeyword'; keyword: KeywordRef; scope: ModScope };     // needs F2
```

- **Compile:** `createCtx` resolves every active mod source (Daily modifiers, battlefield, weather schedule, each side's commander, doctrines picked so far, synergies, boss rules) into per-side integer tables (`costBp[group]`, `hpBp[tagMask]`, …) plus a short list of zones.
- **Hot points** (all exist): `unitCost`, `spawnUnit` HP, the damage pipeline (A2.7 steps 4-5), `speedOf`, the attack range in targeting, the turret attack, the economy tick and the thresholds.
- **Zones:** at most 4, checked per unit per tick in step 6 (statuses), with the result cached on `UnitRt` (`rangeBonusBp`, `speedBp`, `takenBp`).
- **Golden-safe:** a neutral bp gives `trunc(v × 10000 / 10000) = v`, so existing replays keep their hashes.
- **Timed mods** (weather fronts, doctrines from the moment they are picked) live in `SideRt`/`SimStateRt` and are hashed only when non-empty.

### F3 Match hash and version policy

- **`matchHash`** = hash(rules slice + the defs of every card in either `SideConfig.loadouts`, plus summon sources such as the Paradrop card, Matriarch riders and Vanguard). Compute `cardHash[id]` once at compile time. A new season's cards then never break old replays; a balance change breaks only replays that used the changed card.
- `ReplayDoc` becomes `v: 2` with `matchHash`. The 20-slot local ring can simply drop v1 entries.
- **`SIM_VERSION` semver.** Major = any change that alters a golden hash. Minor = an inert addition proved by unchanged goldens. `replayMatch` requires the same major.
- **Versioned player builds.** Each release copies its build to `/ageborn/v/<major>/` on GitHub Pages (static and free; about 2-5 MB each). A link to an older replay opens there: "This replay is from version 2. Open it in the version 2 player."

### Determinism rules for every extension ("inert extension")

1. Never draw from `s.rng` in a new code path that runs for old content. Derive new randomness from `xmur3(seed + ':' + purpose)` into its own hashed state, or use a pure `hash(seed, tick, id)`.
2. New state fields are hashed only when non-empty or non-default.
3. New systems are no-ops unless content or config uses them. A golden test proves it (goldens unchanged gives a minor bump).
4. New commands are appended to the `Command` union; old replays never contain them.
5. All keyword and mod parameters are integers (bp, ms, lu); the schema rejects fractions.
6. Iteration stays in id order; new entity kinds join `units` so they share `nextId` order.

---

## 3. Keyword system proposal

### 3.1 Model

A card keeps its stats and attacks and gains `keywords: KeywordUse[]`. Each keyword is a named, player-facing macro (Gore, Ricochet, Tunnel, …) that the content compiler expands into **triggers** and **traits**.

```ts
type Trigger =
  | { on: 'spawn' } | { on: 'death' } | { on: 'kill' } | { on: 'hit' } | { on: 'firstHit' }
  | { on: 'every'; ms: number; while?: 'engaged' | 'enemyWithin'; radius?: number }
  | { on: 'enemyWithin'; radius: number; once?: boolean }
  | { on: 'hpBelow'; bp: number }                              // once
  | { on: 'blocked' } | { on: 'ageUp' } | { on: 'phase'; phase: 'overdrive' | 'siege' };
interface Selector { who: 'self' | 'allies' | 'enemies' | 'target' | 'point'; radius?: number; max?: number;
  order?: 'nearest' | 'lowestHpBp' | 'front' | 'backline' | 'densest'; tags?: Tag[]; notTags?: Tag[];
  layer?: 'ground' | 'air' | 'under' | 'any' }
type Effect =
  | { do: 'damage'; amount: number; area?: 'blast' | 'rule'; knockback?: number; delayMs?: number }
  | { do: 'status'; status: StatusApply } | { do: 'heal'; amount: number } | { do: 'shield'; amount: number; ms: number }
  | { do: 'strip'; what: 'shields' } | { do: 'summon'; card: CardId; count: number; at: 'self' | 'front' | 'beyondFront' }
  | { do: 'gold' | 'xp'; amount: number } | { do: 'burrow' | 'surface' } | { do: 'selfDestroy' };
type Trait = 'brace' | 'siegeOnly' | 'followSupport' | 'structure' | 'allyPassable' | 'untargetable'
  | 'detector' | 'interceptProjectiles' | 'noPowerDamage';
interface TriggerDef { trigger: Trigger; select: Selector; effects: Effect[]; cooldownMs?: number;
  charges?: number; sideLockoutMs?: number; fx?: EffectId }
```

### 3.2 Existing abilities as keywords (the vocabulary covers v1)

| v1 card behaviour | As keyword data |
|---|---|
| Gore, Lance charge, Charge, Boarding Hook | `firstHit` → target: damage ×bp, knockback ± |
| Ursa Roar | `every 15 s while engaged` → allies r200 max 8 nearest: shield 60, 6 s |
| Radio Operator call-in | `every 8 s` → enemies r400 nearest ground: damage 120 splash r50, delay 1 s, side lockout 3 s |
| EMP | `every 8 s, enemyWithin 120` → enemies r120: strip shields; tags mech: stun 1.5 s |
| Time Stop | `enemyWithin 200`, then every 15 s → enemies r200: stun (frozen) 1.5 s, Legendaries 0.75 s |
| Balloon crash | `death` → enemies ground r70: damage 250 blast |
| Matriarch riders jumping off | `death` → summon 2 Pebblers at self |
| Aura, heal, innate shield, resist | Keep as trait-like keywords with numbers |
| Pounce, bomber, riders' extra attacks | Stay special traits (movement or attack-model code) |

**New cards that become data:**

- "On death: summon 3 Bonkers"
- "Plunder: +5 gold per kill"
- "Rally: on spawn, allies within 150 gain +20% speed for 4 s"
- "Enrage below 50% HP: +30% attack speed"
- "Detector: its attacks can hit burrowed units"
- "Minefield: 3 charges, enemyWithin 40, damage 150"
- "Sapper: siege mods vs `structure`"

### 3.3 Runtime

- **Content (WP1):** `keywords.ts` holds macro definitions, glossary string keys, a default effect and sound, and AI hints. The compiler expands uses into `TriggerDef[]` and validates them: integers only; no summon cycles (a card that summons itself on death); at most 4 triggers per card.
- **Sim (WP2):** `rules.ts` compiles triggers into buckets per trigger kind, so each system scans only units that have that bucket.
  - Placement in B3: `spawn` after step 5; `every`, `enemyWithin` and `hpBelow` in step 7 (after the old kinds, so old order is unchanged); `hit` and `firstHit` in step 13; `death` and `kill` in step 14 (the existing up-to-8-pass death loop). Summons made during a death pass fire their `spawn` triggers on the next tick.
  - Ordering: unit id, then trigger index. Per-tick caps (for example 64 keyword effects per side) stop runaway chains.
- **Events:** a new `{ e: 'keyword'; id; kw: KeywordId; x; targets: number }`. `feel.config.json` maps keyword ids to clip, effect and sound (data), with a per-card `fx` override. `eventMapper` stops special-casing names.
- **Strings:** card descriptions are composed from glossary templates (`t('kw.gore', { mult: 2, kb: 30 })`), so a new card needs only a name key. Danish translates the glossary once.
- **AI (WP3):** the counter matrix still carries most of the value; regenerate it with `content:counters`. `book.ts` adds keyword hints (`aiHint: { vsSwarm, vsStructure, detector }`) for the few things duels miss.
- **Tests:** one unit test per trigger kind and effect kind (not per card). A generated test runs every card's keywords in a duel with no throws and with invariants.

### 3.4 Migration

The engine runs alongside the 16 old kinds. New cards use keywords; old cards keep their code, and goldens stay green (a minor bump). Port the old kinds only at a planned `SIM_VERSION` major bump, together with some other behaviour change, and re-record the goldens once.

### 3.5 What stays code

A new trigger, selector or effect kind; a new layer; a new entity or movement model (pounce, bomber, burrowing travel); anything that needs hidden information. My estimate from the v1 table (8 of 35 units needed one-off code, and about half of those, namely Roar, call-in, EMP, Time Stop and the Ram's siegeOnly trait, become keyword data): about **1 new card in 10** needs a new keyword kind (roughly a day of sim work plus tests). The other 9 are data plus art plus strings.

### 3.6 Pool growth costs besides the sim

- **Art:** today's procedural puppets cost about 80 lines of SVG part and puppet code per unit. 100 new cards is about 8,000 lines.
- **Baking:** bake per match roster (at most 2 × 40 cards) instead of per age, or bake time grows with the pool.
- **Balance runs:** `sim:balance` at 2,000 mirrored matches per card is about 1.5 h on 8 workers for 55 cards, about 4 h for 150. Run it only for cards whose `cardHash` changed.
- **Counter matrix:** stays O(n²) duels but only for the same and adjacent ages. It is cheap.

---

## 4. Direction by direction

### 4.1 Evolve choices (doctrines and techs)

- **Recommended rule:** at each evolve both sides get the same 2 doctrine options for the new age, derived from `hash(seed, 'doctrine', ageIndex)`. That is symmetric, visible and deterministic.
  - The pick is public, so the side that evolves second can counter-pick. That is a real tempo trade: evolve first for power, or later to answer.
  - A deck-built version (doctrine cards in the War Plan) can come later as a collection layer.
- **Contracts (WP0):** `evolve` command + optional `pick?: 0 | 1` (default 0). `Observation.foe.doctrines` and `me.doctrineOffer`. `HudModel.me.doctrineOffer`.
- **Sim (WP2):** offers are computed at `ageUp`; the pick is applied as side mods (F1). `SideRt.doctrines: CardId[]` is hashed when non-empty.
- **Content (WP1):** `doctrines.ts`: id, age (or any), `ModEffect[]` or `grantKeyword`, strings, icon `visualId`, `aiHint`. **Pure data after F1.**
- **Save/meta:** none (all in-match). Feats and card stars can reference doctrines later.
- **AI (WP3):** a `choose` scoring term: aiHint · personality weights + counter value vs the foe's scouted cards and doctrines. Tier-scaled mistakes apply.
- **Screens and art:** two cards flip up on the Evolve button during Ascension (one tap, no timer, since the default applies if untouched). The foe's pick shows as a banner on its base and in the Scouted list. One icon per doctrine (procedural glyph).
- **Replays:** the pick is in the command, so it replays exactly. Goldens are unaffected (no doctrines in fixture content), so this is a minor bump.
- **Size: M** (after F1). Balance: A2.14 per-doctrine win-rate delta, ±3 points like cards.

### 4.2 Lane features and weather (APPROVED)

- **Battlefields** per arena, as data: features must be mirror-symmetric around mid-lane, which keeps first-mover fairness automatic.
  - High ground at p 380-460 on each side: ranged units standing on it get `range` +15%. It pairs with the turret line.
  - Bridge at mid-lane: `frontWidth` 1, so single file and a chokepoint.
  - Mud, forest cover (`damageTaken` −20% vs ranged), river ford (`moveSpeed` −25%).
- **Weather:** a schedule per match, from `xmur3(seed + ':weather')` or authored per arena. It is shown on the VS screen and telegraphed 10 s ahead in the HUD (A15 rule 4). Examples:
  - Rain: fire and blast damage −15%.
  - Fog: every ranged and turret range capped at 300, which is an anti-turtle window.
  - Tailwind: projectile range +10% for one side's direction, alternating.
  - Snow: `moveSpeed` −10%.
  - No "night" that hides units (finding 9).
- **Contracts:**
  - `MatchConfig.battlefield?: string` and `ReplayDoc.battlefield?` (optional). Weather derives from seed and battlefield, so it needs no field.
  - `Observation.field` (static) plus `weather` (current and next).
  - `ArtProvider.createBackdrop` + `features?` and `BackdropView.setWeather?(id, intensity)`, both optional so the 4 adapters keep compiling.
- **Sim:** F1 zones plus timed mods; `frontWidth` needs a small change to the movement rule (soft single file, A2.7).
- **Content:** `battlefields.ts` (features per arena, weather table), strings. **Pure data after F1**, except a new feature *kind* such as a teleporter.
- **Save/meta:** none; the arena picks the battlefield. The Daily can pick a battlefield from its seed.
- **AI:** read `field` from `Observation`. The hold line moves to the own high ground when there is one; bots prefer ranged cards during fog-free phases. That is a small scoring change.
- **Art (WP4):** feature decals and props per arena on the ground layer (backdrops are already per arena), and weather particle overlays through `createEffect('weather.rain')`, which is plain effect ids. Audio: weather loops.
- **Replays:** deterministic, and a minor bump.
- **Size: M** (engine + 3 features + 3 weathers), plus art M.

### 4.3 Underground layer (APPROVED)

- **Rule:** tunnelers burrow after spawn, travel under the lane ignoring blocking and walls, and surface at a trigger (reaching the enemy's frontmost structure, their first ranged unit, or p = 700).
  - Surfacing has a 1 s telegraph (a dust plume) visible to both sides.
  - While burrowed they are hit only by attacks with `hitsUnder` (detector keyword, seismic turret).
  - A dust trail is always visible (finding 9).
- **Prerequisite refactor (S, WP2):** replace the roughly 50 ad-hoc air, hitsAir and hitsGround checks with `layerOf(u)` and `canHitLayer(attack, u)`. Make it behaviour-neutral, proved by goldens.
- **Contracts:**
  - Runtime `UnitRt.layer`.
  - `UnitState` + `burrowed?: boolean`.
  - `AttackDef` + `hitsUnder?: boolean`.
  - `Observation.units[]` + `burrowed?`.
  - `Tag` + `'under'` (optional).
  - `UnitPose` + `burrowed` for the view.
- **Sim:** movement moves burrowed units like air (no blocking) at ground speed. Targeting, powers and Last Stand skip burrowed units unless `hitsUnder`. Surfacing is an `effect` of the keyword engine (F2).
- **Content:** tunneler cards (one per age from Gunpowder: sapper, tunnel rat, mole drill, …) and detector turrets. Data after F2 + this layer.
- **AI:** the counter matrix covers duels; the book adds `burrows` and `detects`. Bots answer surfacing telegraphs with melee near the gate. Small.
- **Art:** `burrow` and `surface` clips, a dust-trail effect, and a burrowed pose (mound). The render already has a ground-decals layer.
- **Size: M** (after F2).

### 4.4 Fortifications as a new card type (prototype first)

- **Model:** a structure is a unit with speed 0 and the traits `structure`, `allyPassable` and `noPowerDamage`.
  - Enemy ground units stop at it (the existing "cannot move into the nearest enemy ground unit" rule) and must break it.
  - Own ranged units fire over it for free, because ranges are edge distances.
  - Air ignores it; tunnelers pass under.
  - Targeting, damage, deaths, bounty, hashing, `unitSpawned`/`died` events and `createUnit` views are all reused.
- **Kinds per age** as keyword data:
  - wall (blocks)
  - minefield (`untargetable`, `enemyWithin` → damage, 3 charges)
  - spike trap (slow)
  - bunker (wall + resist aura for allies within 60 lu, instead of garrison code)
  - energy shield (Future: `interceptProjectiles`, which is code, M)
- **Anti-turtle rules** (all data in `EconomyRules` and card defs):
  - own half only, p 120-540
  - `structureMax` 2 per side, no pop
  - decay 1%/s after 60 s, ×2 in Siege
  - Siege-phase damage ×2 as for bases
  - Heavy, siege and Legendary attacks carry `mods: [{ vs: 'structure', bp: 20000 }]`
  - kill bounty 30%
  - the turtle proxy stays at 35-45%, and a new "wall + ranged" proxy is added to `sim:exploits`
- **Contracts:**
  - `Loadout.structures?: (CardId | null)[]` (length 1)
  - Command `{ t: 'place'; side; slot: number; p: number }`
  - `StructureDef` or a `UnitDef` + `structure` block (`place: {minP, maxP}`, `decay`)
  - `Tag` + `'structure'`
  - HUD: a structure card with drag placement (reusing power-drag targeting)
- **AI:** a new `place` action: under pressure, place just ahead of turret cover (p ≈ 300-420); siege units prefer structures via mods.
- **Art:** about 3 visuals per age × 5 ages; static rigs with hit, crumble and build clips. Cheap in procedural parts.
- **Save/meta:** a new card type in collection, capsule pools, the War Plan UI and the advisor ("No siege answer"). Rarity rules as other cards.
- **Checkpoint A prototype (S):**
  - One `AbilityDef` addition `{ kind: 'structure'; allyPassable: true }`.
  - A movement exception: own units ignore it in the spacing rule. Without it, own melee is stuck behind its own wall, because the overtaking rule only passes allies with a *longer* range.
  - A hidden `palisade` card and a sandbox "Place wall at p" button using `devSpawn`.
  - No command, no AI and no real mode until the fun gate decides.
- **Full size: L.**

### 4.5 Card pool growth, sets, album and more slots

- **Content:**
  - Split `raw/<age>.ts` into sets (`content/sets/<setId>/<age>.ts`).
  - Each card gets a permanent `num` (a dex number, never reused) for share codes, and a `set` and `family` field (synergies, album).
  - Schema count checks become per-set.
  - `ContentOrder` gains sets.
  - Retired cards stay in content as `retired: true` so saves and codes still resolve.
- **Contracts:** none for cards themselves (records keyed by `CardId`). More slots need F5:
  - `EconomyRules.loadoutSlots { units, turrets, structures }`
  - `Command.slot: number`
  - `Loadout` lengths from data
  - `HudModel` already takes any card count
  - keyboard 1-N, and the AI `toCommand` casts
- **Save:** `collection` scales (150 cards is about 8 KB JSON). An album needs no field; completion is derived. Set rewards use `cosmetics.owned`.
- **Meta:** drop pools by set and arena (`dropAges` becomes pools); new-card protection already scales. Economy re-run each season (A6.9 gates).
- **Screens:** Collection filters by set, keyword and rarity; album pages per set (the A15.16 age sets generalise to sets); War Plan search.
- **Tray size:** the tray should stay at 5-6 cards for phone readability and to avoid click-speed play. Grow the War Plan's *choice space* (doctrines, structures, a commander, sets) rather than the tray.
- **Size: L** as a system (M for F5 + sets; each batch of about 10 cards is S-M content + M art).

### 4.6 Ultra-rare tier and shiny variants

- **Tier ("Mythic", name open):**
  - `Rarity` + `'mythic'` (contract).
  - Every `Record<Rarity, …>` table gains a row (upgrade copies, codex points, dust, craft, capsule copies).
  - The A6.4 roll gains a mythic roll and A6.5 a visible pity (`pity.sinceMythic`, a save migration).
  - `sim:drops` chi-square and pity boundary tests.
  - Sidegrade rule unchanged (same level curve, A2.14 gates). A mythic counts as Legendary for the one-alive limit (`group: 'legendary'`).
  - Size **M** (+ economy re-run).
- **Shiny in the lane:**
  - Add a top foil (`Foil` + `'prismatic'`) that also shows in the lane as a shimmer overlay, obeying A5.8 clarity parity (outside team zones, silhouette unchanged).
  - `SideConfig` + `foils?: Record<CardId, Foil>` (cosmetic; the sim ignores it and hashes do not cover it).
  - `ArtProvider.createUnit` + `foil?`.
  - A15.22 rejected the holo compass and odds boosts, so the only deterministic path is Dust crafting at a very high price (A15.11 extended).
  - Size **M** (mostly art: one shimmer filter reused by all rigs).
- **No trading, ever** (red line 2), so neither item gives items value outside the save.

### 4.7 Modes: draft, random armies, boss, endless

| Mode | Fit | Sim change | Size |
|---|---|---|---|
| Draft War (A15.17) | `meta/draft.ts` builds seeded offers from the full pool; `ai/draft.ts` makes the bot's picks; a player-side override (plan and levels) from meta to `BattleSession`; `MatchResultInput.mode` + `draft` | none | S-M |
| Random armies | Meta generates both plans from the seed at standard levels | none | S |
| Boss | A disclosed asymmetric side: `SideConfig.mods?: ModEffect[]` (F1, for example base HP ×3), a hidden boss card with `hpBelow` phase triggers (F2: summon waves, enrage), shown in full on the VS screen | F1 + F2 | M |
| Endless (Horde) | `training.noClock` exists; waves come from a new `TrainingEvent.spawn?: { card; count; level }` generated by meta from the seed; escalation via side mods; score = waves. A15 rule 5: each run ends when the base falls, there are no per-wave rewards, and the run caps at wave 30 with a finish screen. Ticks are capped for replay size | small | M |

- **Rotation:** keep every mode always available in Skirmish (A15.17: core modes permanent). "Featured mode today" comes from the date seed, with no expiry and no calendar authoring (rule 9).

### 4.8 Commanders (heroes) and card synergies

- **Commander** = passive side mods (F1) + one active ability on a cooldown (a second power slot) + an optional hero unit (a unique card with `death` → respawn after 30 s).
  - Contracts: `SideConfig.commander?: string`; command `{ t: 'command'; side; p? }`; `Observation.foe.commander` (public, shown on VS); HUD button.
  - Content: `commanders.ts` (data after F1 and F2); the War Plan gets a commander slot (save: `warPlans[].commander?`, migration).
  - AI: the brain gets the commander active as a power-like action.
  - Art: portrait + in-lane hero rig: the best "beauty" payoff, and the biggest art cost.
  - Ranked: commanders never level; every commander is equal in power.
  - Size **L**.
- **Synergies:** a table of "if the loadout holds ≥ N cards of family F, then ModEffect or keyword grant for that group". Evaluated once in `createCtx` from `SideConfig.loadouts`, shown on the War Plan and VS screens. **Data after F1**; size **S**.

### 4.9 Tempo, commitment and ranked fairness (brief)

- **Knobs as `EconomyRules` data** (golden-safe at neutral values):
  - `cancelRefundBp` (today a full refund makes cancel-spam free)
  - per-group spawn cooldown (`SideRt.groupReadyTick[group]`)
  - `queueMax` (exists)
  - `stanceCooldownMs` (exists; bots flip stance up to 116 times per Full War, so a longer cooldown or a hold commitment matters)
  - formation as a second stance axis (per-side `spacingBp`)
- **Proxies:** the "random spam" and "cheapest spam at ≤ 20%" proxies are `ScriptedController` scripts in WP12's `tools/exploits.ts`, which is not built yet. **S**.
- **Ranked level cap:** clamp `SideConfig.levels` in `BattleSession` (`standardLevels` already exists). **S**.
- **Visible rating conflicts with A15.9** (one moving rank). Keep trophies as the only rank against AI; an Elo rating belongs to online PvP.

### 4.10 Battle Puzzles (daily, deterministic)

- **Engine (F4, S, WP2):** `MatchConfig.training.scenario?: { sides: [{ gold, xp, ageIndex, baseHpBp, treasury, mountsOwned, turrets: [{ mount, card }], powerPpm, units: [{ card, p, hpBp, level }] }], clockMs? }`, applied in `createCtx` at tick 0. `training` is already stored in `ReplayDoc`, so puzzle replays work unchanged.
- **Opponent:** a fixed command script through the existing `ScriptedController` (Grogg's machinery), or a bot at a fixed tier (still deterministic given the player's inputs).
- **Goal and score:** reuse the A15.10 feat predicate kinds over outcome, `MatchStats` and events ("win before 1:30", "survive to Siege", "spend ≤ 400 gold"); 1-3 stars and a score.
- **Content:** `puzzles.ts` (id, scenario, opponent script, goals, `num` for sharing, the `matchHash` it was authored on, a solution replay).
  - `tools/puzzles.ts verify` re-plays every stored solution in CI, so a balance patch never silently breaks a puzzle (A15.17 stable ids).
  - When a puzzle breaks, either re-author it or freeze its rules slice in the puzzle file (the sim runs on any `CompiledContent`).
- **Meta:** the daily pick is `hash('puzzle' + YYYYMMDD) mod pool`. Every past puzzle stays playable (no expiry). Save: `puzzles?: Record<id, { stars: 0-3; best: number }>`.
- **Screens:** a Puzzle screen (brief, goal chips, retry) and a result line to copy. Art: none new.
- **Size: M** + ongoing authoring (S per 10 puzzles). A15.17's mined "Clutch Puzzles" can reuse this with a replay prefix instead of a scenario.

### 4.11 Advantage graph and key moments

- **Where:** `src/sim/analysis.ts` (pure; WP2) re-simulates a replay with `replayMatch` and samples full state every 20 ticks (post-match, so full information is fair).
- **Evaluation:** `eval(state) → bp for side 0` = logistic(Σ wᵢ fᵢ) through an integer look-up table. Features: army value × HP%, base HP, age difference, XP, gold, Treasury, turrets, power charge. Coefficients are content data fitted offline by `tools/fitEval.ts` on a corpus of headless bot matches (a chess-style eval bar).
- **Key moments:** the top 3 swings over 5 s windows, each labelled with its dominant event (Legendary spawn, power cast with N kills, evolve, Last Stand, walls broken). Each opens the replay at that tick (the D1 seek bar).
- **Performance:** a Full War re-sim is ≤ 400 ms on desktop and roughly 1-3 s on a phone. Run it in a Web Worker (the sim is pure and worker-safe) or in idle chunks.
- **Screens:** an "Analysis" button on Result and in replays. It is not a staged Result step (A15.13); A15.12 result tips can reuse the moments.
- **Size: M.** No contract change except an exported type; no replay impact.

### 4.12 Ghost battles, share links and clips (offline)

- **"AI · Echo of Chief-4821"** (the A15.15 wording; never "a friend's ghost").
  - The code carries the creator's War Plan, a style vector and a seed.
  - The friend plays against `createBot` with the Balanced brain, the style weights and that plan, labelled AI on every A7.1 surface.
  - Style extraction is pure `meta/style.ts` over the last N `MatchStats`. It needs a few new stats fields (hold time share, evolve times, turret and Treasury timing), which are pure additions to `sim/stats.ts`.
  - Ghost codes do **not** need matching versions: they re-simulate live on current rules.
- **Replay links:** replays need the same `SIM_VERSION` major and a matching `matchHash` (F3). Older ones redirect to the versioned player build.
- **Formats:** plain-text `AGB1-…` codes (Crockford base32 + CRC-16) that paste into the game work in every build, Poki included. Non-Poki builds also offer `https://…/ageborn/#c=…`: the fragment never reaches the server, so GitHub Pages logs no payload.
- **Code:** `src/core/codes.ts` (bit writer and reader, base32, CRC; pure), `src/sim/replayCodec.ts` (the binary command codec of section 5), `meta/share.ts` (import validation; unowned cards show "Not owned"), and `SkirmishOptions` + `challenge?` (A15.18 v1.1).
- **Rules:** no rewards for sharing, and no "used n times" counter (red line 9). No names unless the player adds the auto name.
- **Clips:** D1 Clip Mode renders a replay offscreen to MediaRecorder. It is independent of codes. Size L.
- **Size:** codes + ghost **M**; replay links **S** on top of F3.

### 4.13 Emotes and quips (APPROVED)

- **Contracts:** `EmoteId` becomes `string`, validated against content (commands, events, `HudModel`). The sim still checks only the cooldown and gains a per-match cap (`emoteMaxPerMatch`, for example 8). The session checks ownership offline; the relay does it online.
- **Content:** `emotes.ts`: id, kind (`emote` | `quip`), rarity, `visualId` (an animated sticker rig), `soundId`, and `textKey` for quips (fixed i18n lines, never free text), plus `botAllowed`.
- **Save:** `cosmetics.owned` already holds string ids. Add `profile.emotes?: string[]` (the equipped 4-8), a migration.
- **Sources:** Trophy Road, feats, Conquest and crafting; optionally the existing Wardrobe Crate path with its visible odds and pity. Never a new random source.
- **Mute:** per opponent in the HUD (session state), plus the existing `Settings.mutedEmotes`. Online: a persistent per-friend mute.
- **Art:** sticker rigs through a new `ArtProvider.createEmote?(id)` or `portrait`-style baked frames; about 20-40 at launch.
- **Replays:** emotes are commands, so they replay. **Size: M.**

### 4.14 Home village (APPROVED direction; v1-lite)

- **Architecture:** the Home screen (WP9) shows a DOM layer of building hotspots over baked images from a new `ArtProvider.building(o: { id; stage; age; skin?; size }): Promise<string>` (data URL, cached like `portrait`).
  - Idle life (smoke, flags, sparkles) comes from separate small layers animated with CSS.
  - The UI never draws art (CLAUDE.md), painted art can replace procedural later, and hit areas stay accessible DOM.
  - The big Battle button stays DOM and loads first (B16: Play ≤ 3 s), and the village chunk loads lazily.
- **Buildings:** arena gate → battle, vault → capsules, barracks → War Plan, forge → upgrades, museum → collection, feats and album. The clan hall comes later.
- **Growth:** `meta/village.ts` `villageStages(save, content)` is a pure function of existing progress. For example: forge from total card levels, museum from collection count, gate from arena index, base age from the A15.16 milestones.
  - **No save field and no migration in v1-lite.**
  - Badges only for things ready (A15.13: "Open (3)" yes, backlog counts no).
- **Base cosmetics:** base skins already exist (`base.<age>` skins in `SideConfig.skins`). Add `SideConfig.cosmetics?: { banner; title }` for the banner on the lane base (A15.17 identity in the lane), cosmetic and unhashed.
- **Later:**
  - Free placement: save `village?: { placed: { id; x; y }[] }`.
  - Wonders: derived from feats and stars counts; no timer.
  - A defence layout: a fortification placement inside the ghost code, about +10 bytes.
- **A15 conflict:** a "light resource trickle" on a clock breaks engagement rule 1 (only existing banks refill on a clock) and rule 8 (new systems pay Dust or cosmetics). Make it play-accrued (per finished match, capped, never decays), or drop it.
- **Size: v1-lite L** (M engineering + L art: 6 buildings × 3 stages ≈ 18 drawings plus animation layers). Cheapest honest version: 6 buildings × 3 stages, 1 era palette per base age.

### 4.15 Online: relay, friends, spectating, clans, reinforcements

- **Relay (D1):**
  - One room per match on the server: it stamps commands at `tick + 4` and broadcasts them. Clients simulate and compare `state.hashes` every 20 ticks, which already exists.
  - Traffic is tiny: a Full War is about 300-1,000 commands at about 20 bytes as JSON.
  - A Cloudflare Durable Object per room with WebSocket hibernation fits the free tier at small scale. Check the current request and duration limits before the milestone.
  - Needs cross-browser determinism proof: run the golden replays in Chromium and WebKit e2e first (B13).
- **Friends:** anonymous device-key accounts; server-issued friend codes exchanged out of band; no search and no stranger contact (A15 red line 11); a friends list; unranked friendlies with emotes only; a friend leaderboard on relative ranks.
  - `PlatformAdapter` is unchanged. A new `NetService` interface is injected into `app`, never into the sim.
- **Spectating:** relay fan-out with a 30 s delay against ghosting; the client sims from the command stream. S on top of the relay.
- **Clans (APPROVED):**
  - A DO per clan: members, clan level from cooperative goals, the donation ledger and war state.
  - Invite codes only; names from word lists; emblems from preset parts; preset messages only.
  - No per-member contribution display (red line 11) and no "last seen".
  - Age and consent rules for accounts go to the lawyer review (A15.1).
- **Reinforcements:**
  - `SideConfig.reinforcement?: { card; level }` (a server-signed token, valid once) and command `{ t: 'reinforce'; side }`, spawned through the summon path (like Paradrop) and hashed.
  - Level capped in any trophy mode. Offered to both sides in friendlies and clan wars; never in the AI ladder.
  - Sim part **S**.
- **Async clan wars:**
  - Each member publishes a defence = a ghost code (War Plan + style + structure layout, about 100 bytes).
  - Attackers fight locally against "AI · Echo of …" and submit result + replay code (about 1-3 KB).
  - Verification: Workers Free CPU limits (milliseconds per request) cannot re-simulate a 400 ms match. Use peer re-simulation when clanmates view the war log, and optionally a scheduled GitHub Actions job (free on a public repo). There are no prizes of money value, so light verification is acceptable.
- **2v2** (co-op vs AI Generals first) needs "players" separate from `Side`, with per-player gold, XP and age: **XL** in the sim.
- **Sizes:** relay + friendlies **L**; friends list + spectating **M**; clans **XL**; reinforcements **S** sim + part of clans.

### 4.16 One lane, and a two-lane experiment

- **Keep one lane** (as decided). The sim is 1D by construction. Depth inside one lane comes from layers (air, ground, under), fortifications, battlefield features, stance, formation and doctrines, all covered above.
- **Revisit trigger:** after the owner's Checkpoint A/B playtest, if matches feel like "one blob pushing", or `sim:balance` shows fewer than about 3 viable strategies per age.
- **Two-lane sketch (experiment only, XL):**
  - `lane: 0 | 1` on units and in the `train` and `power` commands.
  - Shared `SideState` (gold, XP, age, Treasury) across two lane slices; per-lane movement, targeting and turret ranges; two lane bands in the view (0.5× height each, unreadable in portrait).
  - Its own format id and balance targets.
  - Behind a dev flag, never mixed into ranked.

---

## 5. Share-link payload sizes

### 5.1 Measured (this session, 36 bot-vs-bot matches, tiers V-VIII)

| Encoding | Full War (9:30 cap) | Standard | Short |
|---|---|---|---|
| Commands per match | 44-391 | 44-325 | 43-232 |
| `ReplayDoc` JSON as stored today | 7-31 KB (of which `hashes` about 20% and `sides` 3.1-3.8 KB, because `levels` lists every owned card) | 7-26 KB | 7-20 KB |
| Minimal JSON (seed, format, plans, commands) + deflate | 1.1-1.9 KB | 1.1-1.7 KB | 1.2-1.4 KB |
| Bit-packed commands (varint tick delta, side + op + arg byte, 2 bytes for power p) | 228-689 B (about 2.2 B/command) | 251-542 B | 300-441 B |
| … + deflate | 214-544 B | 227-444 B | 265-343 B |

### 5.2 Link and code budgets

| Payload | Contents | Raw bytes | Base32 code (AGB1-) | Base64url in URL |
|---|---|---|---|---|
| War Plan, v1 (65 cards, 7-bit card numbers) | 5 ages × (5 units + 2 turrets + 1 power) = 40 × 7 bits, version, CRC-16 | 38 | about 66 chars | about 51 chars |
| War Plan, future-proof (10-bit numbers; 6 units, 3 turrets, 1 power, 1 structure, 1 commander per plan) | 56 slots × 10 bits + header | about 73 | about 122 | about 98 |
| Ghost challenge (Echo) | v1 plan + style (7 weights + opening, 8 B) + seed 4 + format, battlefield, mods 3 + level mode 1 + creator's result 3 + cosmetics 3 + CRC | about 62 | about 105 | about 83 |
| Puzzle score | puzzle num 2 + score 2 + stars + date 3 + CRC | about 8 | about 18 | about 11 |
| Puzzle score + solution (60-90 s of play) | + about 60-150 commands | about 150-350 | about 250-570 | about 200-470 |
| Replay link, bot-like play | header 22 (versions, matchHash, seed, format, levels mode, outcome, finalHash) + 2 plans 76 + deflated commands 214-544 | about 310-640 | about 500-1,030 | about 415-855 |
| Replay link, very busy human (about 1,000 commands, about 105/min) | same, commands about 2.2 KB → about 1.8 KB deflated | about 1,900 | about 3,050 | about 2,550 |
| Replay with non-standard levels | + 4 bits per card in the two plans | + 40 | + 64 | + 54 |

- **No `hashes` in links.** Verification re-simulates and compares `finalHash` (4 B) and the outcome.
- **Where each fits:** plans, ghosts and puzzle scores fit in a chat message, a QR code (≤ about 150 bytes is comfortable) and a paste box. Replay links fit any browser URL (tens of thousands of characters are fine) and chat apps, but not a QR code. Poki builds use pasted text codes only.
- **Cheapest first version (S):** deflated minimal JSON with fflate, which is already a dependency (B8), gives 1.1-1.9 KB, about 1.5-2.6 K characters for bot-like play. Switch to the bit-packed codec (about 3× smaller) when QR codes or short links matter.

---

## 6. Summary: sizes, dependencies and phasing

| Item | Depends on | Pure data after it? | Replay impact | Size | Suggested phase |
|---|---|---|---|---|---|
| Fix modifier duplication (sim reads content effects) | none | yes | minor bump | S | **v1 (before Phase 3 tuning)** |
| Wall prototype for the Checkpoint A fun gate | none | n/a | none (dev spawn is not replayable) | S | **v1, Phase 2a sandbox** |
| F3 match hash + SIM_VERSION policy | none | n/a | ReplayDoc v2 | S | v1.1, with share codes |
| F1 rule mods engine | fix above | yes | minor | M | v1.1 |
| Lane features + weather | F1 | yes | minor | M + art M | v1.1 (approved) |
| Evolve doctrines | F1 | yes | minor | M | v1.1 |
| Synergies | F1, card `family` | yes | minor | S | v1.1-1.2 |
| Share codes + Echo ghost battles | F3 | n/a | none | M | v1.1 (A15 v1.1-4) |
| Replay links | F3 + codec | n/a | none | S | v1.1 |
| Advantage graph + key moments | none (seek bar helps) | coefficients | none | M | v1.1 |
| Battle Puzzles | F4 | yes | minor | M + authoring | v1.1-1.2 |
| Village v1-lite | `ArtProvider.building` | stages derived | none | L (art) | v1 stretch or v1.1, per owner |
| Emotes and quips as collectibles | contract change | yes | none | M | v1.1 (offline); online mute |
| F2 keyword engine | none | yes | minor (strangler) | L | v1.2 |
| F5 data-driven slots | none | yes | major if the tray changes | M | v1.2, with sets |
| Card pool growth, sets, album | F2, F5, `num` | mostly | per season: none with F3 | L (ongoing) | v1.2 onward |
| Fortifications (full) | F2, F5, prototype verdict | yes | minor | L | v1.2 |
| Underground layer | layer refactor, F2 | yes | minor | M | v1.2 |
| Ultra-rare tier | rarity contract | yes | none | M + economy run | v1.2 |
| Shiny lane variant | foil contract | yes | none | M (art) | v1.2 |
| Draft / random / boss / endless | meta overrides; F1, F2 for boss and endless | yes | minor | S-M / S / M / M | v1.2 |
| Commanders | F1, F2 | yes | minor | L | v1.2+ |
| Tempo knobs, spam proxies, ranked level cap | none | yes | none at neutral | S each | when Checkpoint A shows spam |
| Relay, friendlies, friends, spectating | server | n/a | none | L + M | online milestone |
| Clans + reinforcements + clan wars | relay, accounts, ghost codes | n/a | minor (reinforce command) | XL | online, later |
| 2v2 | players ≠ sides | n/a | major | XL | later |
| Two-lane mode | new sim dimension | n/a | major, separate format | XL | experiment only |

**Contract amendment batches.** Follow A15.18's rule: optional fields only, fakes and fixture updated in the same change, one batch per phase.

- **v1.1 batch:** `ModEffect` in contracts; `MatchConfig.battlefield?`; `evolve.pick?`; `Observation.field/weather/doctrines`; `ReplayDoc v2` + `matchHash`; `SkirmishOptions.challenge?`; `EmoteId` → string with `emoteMaxPerMatch`; `ArtProvider.building?`, `createEmote?`, and `createBackdrop` + `features?` with `setWeather?`.
- **v1.2 batch:** `AbilityDef` + keyword triggers and traits; `Tag` + `structure`, `under`; `AttackDef.hitsUnder?`; `Loadout.structures?` and data-driven slot counts (`Command.slot: number`); `place` and `command` commands; `SideConfig.commander?`, `foils?`, `mods?`, `cosmetics?`; `Rarity` + `mythic`; `Foil` + `prismatic`; `TrainingEvent.spawn?`; `training.scenario?`.

**No hooks in v1** for any of this (A15.19 step 7), except the two v1 items at the top of the table.

---

## 7. Risks and open questions

1. **Balance surface grows multiplicatively.** Cards × doctrines × battlefields × weather × commanders. Gate each axis separately in A2.14 (per-item win-rate delta within ±3 points in mirrored runs), and keep weather and battlefields symmetric so first-mover fairness holds by construction.
2. **Credit.** F2 and the card pool are the expensive, long-lived bets; the art cost per card dominates the sim cost. Consider the D1 art tiers (painted or AI-assisted parts in the same rigs) before a 100-card push.
3. **Golden discipline.** Every foundation must land as an inert extension with unchanged goldens. Porting the 16 old ability kinds is one deliberate major bump, not a drift.
4. **Hidden information** (hidden traps, night, fog-of-war) needs per-side view filtering in render and HUD, bot observations to match, and spectator rules. Avoid it until online, if ever.
5. **Naming.** A15.15 forbids calling Echo opponents "a friend's ghost". The UI should say "AI · Echo of …", and "ghost" stays an internal term.
6. **A15 conflicts to resolve with the owner:** the village resource trickle (rule 1), a visible rating vs A15.9's one moving rank, and rotating modes vs permanent core modes.
7. **Open:** doctrine options symmetric (recommended) or deck-built; the mythic name; whether reinforcements ever touch trophies (recommended: never).
