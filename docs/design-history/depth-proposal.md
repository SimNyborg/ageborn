# Ageborn depth and variety: proposal

**Status.** Proposal, 2026-09-27, kept in `docs/design-history/`. Nothing here is decided until the owner approves it and the orchestrator merges the adopted parts into `docs/DESIGN.md` (and into A15 where engagement is touched). Items the owner marked APPROVED are decided in direction; their rules and numbers below are still proposals.

**What it answers.** The owner's seven directions of 2026-09-27: (1) battle variety, (2) a much larger card pool with a deeper rarity ladder, (3) strategic depth instead of spam-clicking, (4) lane fortifications, (5) lanes, (6) social play, (7) a home village. Across all of them: the game must look beautiful and be well animated.

**Sources.**

- `docs/research/depth-audit.md`: about 12,000 headless matches in the real sim; proposals P1-P10.
- `docs/research/depth-architecture.md`: how each direction fits the code; foundations F1-F5; share-payload sizes.
- `docs/research/depth-benchmarks.md`: 20 ranked ideas and a "do not copy" list.
- `art/blender/SPIKE_REPORT.md`: cost and size per unit for the 3D sprite art tier.
- Binding frame: `docs/design-engagement.md` (A15): engagement rules 1-10, the five tests, red lines 1-13, the counter budget (A15.13).

DESIGN sections are cited as A2.7, B15 and so on.

**Funding.** A15's funding note applies. Only v1 is funded, and the cloud credit ends 2026-11-05. The v1 part of this proposal is kept small on purpose (section 13). Everything marked v1.1, v1.2 or online is a ranked wishlist for later build sessions, not a promise to players or to the owner.

**IDs.** Systems are DP-1 to DP-36. Every number is a starting value that lives in content data and is checked by the headless sims (B12).

**Sizes** (A15.19 plus XL):

- **XS:** strings or one value.
- **S:** one or two WPs, mostly data, no frozen-contract change.
- **M:** a frozen-contract change, three or more WPs, or a new screen or rule set.
- **L:** several WPs with new art, content authoring, contract changes and a balance or economy re-run.
- **XL:** needs a server, or a new dimension in the sim.

**Phases.**

- **v1 Phase 2a:** used only for the Checkpoint A wall prototype and one bot request.
- **v1 Phase 2b.**
- **v1 Phase 3:** numbers only, as C2 requires.
- **v1.1, v1.2.**
- **Online:** the D1 server milestone.

**System cards.** Each system has a card with these rows:

- **Fantasy:** what the player should feel.
- **Class:** healthy, grey or red line, as defined in A15.1.
- **Decisions:** which decisions it creates and why they are meaningful.
- **Counterplay** and **AI:** how the opponent and the bots respond.
- **Architecture** and **Art:** what it needs to build.
- **Battle link:** how it sends the player back into battles.
- **Size, phase, owners.**

Its rules follow the card.

---

## 0. Summary

### 0.1 The shape

Five ideas carry the whole proposal.

1. **Depth comes first from the rules we already have, and from the bot.**
   - The audit shows the counter triangle holds: a 20-line counter-picking script beats every one-type army 92-100% of the time.
   - The tier VII bot loses to cheapest-unit spam (54-60%) only because of two bugs.
   - The biggest depth gain per credit, and all of it v1-sized (DP-1 to DP-5):
     - fix the bot;
     - gate spam at ≤ 20%;
     - fix stalemates;
     - teach "bank gold, then send a wave".
2. **Variety comes from seeds, not calendars.**
   - One data-driven rule-mods engine (F1) delivers battlefields, weather, evolve doctrines, bonds, commanders and boss rules.
   - Each match draws its weather and doctrine offers from its seed, and each arena fights differently.
   - Nothing rotates out and nothing expires (A15 rule 9).
3. **Content grows in funded seasons, on a keyword engine.**
   - A keyword system (F2) turns about 9 in 10 new cards into pure data.
   - About 150 collectibles is reachable after four content seasons, but only if each season is funded.
   - The limit is art per card, not code (DP-26).
4. **One lane, with more layers.**
   - Ground, air and a new underground layer; terrain features; fortifications on fixed pads; a movable hold line.
   - A two-lane mode stays an experiment behind a trigger (DP-18).
5. **Honest rarity, and people without pressure.**
   - A Mythic tier with published odds and a 150-capsule pity. Holo cards that shine in the lane. No trading, ever.
   - Social play starts with text codes and "AI · Echo" battles, then friends and clans on the relay.
   - No chat, no quotas, no deadlines.

The home village becomes Home itself:

- tapping a building opens a feature;
- the Battle button is always there;
- buildings grow from progress the save already records (DP-36).

### 0.2 The owner's directions and where they land

| Direction | v1 (funded) | v1.1 | v1.2 | Online |
|---|---|---|---|---|
| 1. Battle variety | Modifier fix (DP-11) | Mods engine; battlefields and weather (APPROVED); doctrines; featured rotation | Bonds; commanders; boss and endless modes | Friendly variants |
| 2. Card pool and rarity | Keyword chips in Card detail (DP-25) | No new cards; seeds carry the variety | Keyword engine; Season 1 (+21); Mythic tier; Holo in the lane | Server-rolled capsules (A15.17) |
| 3. Strategic depth | Bot fixes; strict A2.14; stalemate package; teach the wave; power ring overflow | Movable hold line; reveal-then-pick; Puzzles; Review | Repeat order if needed | Ranked at standard levels; visible rating |
| 4. Fortifications | Sandbox prototype for the fun gate | none | Fort card type with anti-turtle rules | Defence layouts |
| 5. Lanes | One lane decided; revisit trigger | Terrain inside the lane | Underground layer (APPROVED) | Two-lane experiment only if triggered |
| 6. Social | none | Codes, Echo challenges, replay links, emotes and quips (APPROVED) | Clip and save image (A15) | Friends, friendlies, spectating; clans (APPROVED), reinforcements, raids; 2v2 later |
| 7. Village | Stretch: village v0 as the Home layout | Growth stages, trophy shelf, lane banner, supply wagon | Free placement, monuments, Wonders | Clan Hall, defence layout, visits |

### 0.3 Where this proposal disagrees with the directions

| Direction as given | What the data or A15 says | Proposal |
|---|---|---|
| Queue limits or spawn cooldowns against spam | Audit V3: per-card recharge throttled the *answer* more than the spam (counter-picker vs spam fell from 100% to 58%, with 83% of matches at the Final Bell). The queue of 5 never binds; gold is the only brake | Trades, the bot fix and strict proxies (DP-1, DP-2). Recharges only on fortifications (DP-6, DP-19) |
| A price or delay on evolving | Audit V2 and V9: spam rose to 83-92%, and stalemates rose | Keep evolving fast (Pillar 2). Add a choice of *what* (doctrines, DP-14) |
| 150+ cards within year one | Unfunded. About 1 card in 10 needs new sim code, and art is the main cost per card. Hearthstone cancelled Twist in 2026; Snap's power creep hurt it | Seed-driven variety first (v1.1). Then four seasons of 20-26 collectibles reach about 150, if each is funded (DP-26) |
| More loadout slots as the pool grows | The tray needs about 700 of the 756 px on an 844 px phone. Clash Royale cut its special slots from 4 to 3 in 2026 | A Fort slot, a Commander per plan and 5 presets. No sixth tray card (DP-27) |
| A visible chess-style rating | A15.9 allows one moving rank; A15.22 rejects a live skill chip | Glicko-2 in online ranked only. Offline keeps trophies and "Highest AI tier beaten" (DP-24) |
| Rotating modes | A15.17 keeps core modes always available | A "Featured today" spotlight from the date seed. Nothing leaves (DP-17) |
| Village resource trickle on a clock | A15 rule 1: only existing banks refill on a clock. Rule 8: new systems pay Dust and cosmetics | The existing Supply allowance (A15.4) is drawn as a supply wagon at the Vault. No new currency (DP-36) |
| "Ghost" battles | A15.15: never "a friend's ghost" | "AI · Echo of Chief-4821". "Ghost" stays an internal word |
| Traps, night or fog that hide things | A7.1 gives bots the same information as the player; hidden state needs per-side views (L) | Everything is visible and telegraphed |
| More power from rarer cards | Levels already beat skill (+1 level is about +20 points) | Rarity stays a sidegrade. Mythics play at your Legendary's level (DP-28) |

### 0.4 System index

| ID | System | Class | Size | Phase |
|---|---|---|---|---|
| DP-1 | Bot answers spam and evolves on time | Healthy | S | v1 Phase 2a/2b |
| DP-2 | A2.14 depth targets and exploit proxies | Healthy | S | v1 Phase 2b (tools), Phase 3 (gates) |
| DP-3 | Stalemate package | Healthy | S | v1 Phase 2b (fields), Phase 3 (numbers) |
| DP-4 | Teach the wave | Healthy | XS | v1 Phase 2b |
| DP-5 | Power ring overflow | Healthy | S | v1 Phase 2b (field), Phase 3 (value) |
| DP-6 | Anti-spam tools we do not add | Decision | XS | v1 |
| DP-7 | Movable hold line | Healthy | S-M | v1.1 |
| DP-8 | Repeat order | Healthy | S | Online (v1.1 candidate) |
| DP-9 | Standard levels wherever skill is measured | Healthy | XS / S | v1 rule; online ranked |
| DP-10 | Reveal, then pick a preset; 5 presets | Healthy | S | v1.1 |
| DP-11 | Rule mods engine (F1) and the v1 modifier fix | Foundation | S (v1) + M (v1.1) | v1 Phase 2b; v1.1 |
| DP-12 | Battlefields (APPROVED) | Healthy | M + art M | v1.1 |
| DP-13 | Weather (APPROVED) | Healthy | in DP-12 | v1.1 |
| DP-14 | Evolve doctrines | Healthy | M | v1.1 |
| DP-15 | Bonds (card synergies) | Healthy | S | v1.2 |
| DP-16 | Commanders | Healthy | L | v1.2 or later |
| DP-17 | Seeded rotation and content seasons | Healthy | S | v1.1 onward |
| DP-18 | One lane: decision, trigger, two-lane sketch | Decision | XS; XL experiment | v1; later |
| DP-19 | Fortifications | Healthy | S prototype; L full | v1 Phase 2a; v1.2 |
| DP-20 | Underground layer (APPROVED) | Healthy | M | v1.2 |
| DP-21 | Mode lineup | Healthy | XS-M each | v1.1-v1.2 |
| DP-22 | Battle Puzzles | Healthy | M | v1.1 |
| DP-23 | Review: advantage graph and key moments | Healthy | M | v1.1 |
| DP-24 | Ratings: what is visible where | Grey online | XS; M | Online |
| DP-25 | Keywords | Healthy | S (v1 glossary); L (engine) | v1 Phase 2b; v1.2 |
| DP-26 | Content roadmap from 65 to 150+ | Healthy | L per season | v1.2 onward |
| DP-27 | Slots, sets and the album | Healthy | S-M | v1.1-v1.2 |
| DP-28 | Mythic tier | Grey, safeguarded | M | v1.2 |
| DP-29 | Holo in the lane (shiny) | Grey, safeguarded | M | v1.2 |
| DP-30 | Codes, Echo challenges, replay links, clips | Healthy | M | v1.1 |
| DP-31 | Emotes and quips (APPROVED) | Healthy offline, grey online | M | v1.1; online |
| DP-32 | Friends, friendlies, spectating, ranked | Grey, safeguarded | L + M | Online |
| DP-33 | Clans, reinforcements, clan raids (clans APPROVED) | Grey, safeguarded | XL | Online, later |
| DP-34 | 2v2 | Grey, safeguarded | XL | Later |
| DP-35 | Safety rules for minors | Required | S | Online |
| DP-36 | Village (APPROVED direction) | Healthy | M / L / L | v1 stretch; v1.1; v1.2; online |

---

## 1. Principles

### 1.1 What makes a decision meaningful

A decision counts only when all five tests hold (benchmarks section 1):

1. **Trade-off:** every option costs something, and none is best in every state.
2. **Information:** the player sees enough to act before committing.
3. **Counterplay:** the opponent sees the choice and can respond.
4. **Attribution:** afterwards the player can trace the result back to the choice.
5. **State-dependence:** no rule of thumb such as "always X" solves it.

Today's rules pass for waves (banking), turrets against attackers and Treasury. They fail for evolve timing (always evolve at once) and for in-match counter-picking against mixed armies (a script solves it). This proposal adds decisions only where the five tests can hold.

### 1.2 Complexity budget

- **The tray keeps 5 unit cards.**
  - At most one new in-battle control per release: doctrine halves on the Evolve button (v1.1), a Fort button (v1.2), a commander portrait (v1.2 or later).
  - The Army counter becomes a badge on the stance flag. That frees about 60 px for the Fort button.
- **Everything is visible before it matters.** Battlefields and weather appear on the VS screen and on the match-clock timeline. Doctrine picks, bonds and commanders are public. Nothing in the lane is hidden.
- **Every new axis is symmetric or mirrored,** so first-mover fairness holds by construction.
- **Each axis is gated on its own in A2.14** (section 11), so the balance surface does not multiply unchecked.

### 1.3 Reuse before new systems

| Need | Reuse |
|---|---|
| Rule changes per side, group, zone or time | F1 rule mods (weather, terrain, doctrines, bonds, commanders, bosses, Daily modifiers) |
| New card behaviour | F2 keywords (fortifications, tunnelers, detectors, Mythics, boss phases) |
| Goals and star conditions | A15.10 feat predicate kinds (puzzles, bosses, card stars) |
| Friends fighting your plan | A15.15 Echo codes (Echo challenges, defence layouts, clan raids) |
| A "trickle" | A15.4 Supply allowance (the village wagon) |
| Currencies | Dust and cosmetics only (A15 rule 8). **This proposal adds no currency** |
| One tracker per time scale | Puzzles, Review and modes add no Home widget or Result step (A15.13) |

### 1.4 Balance discipline for a growing game

- **Vanilla line.** Each age's Commons are the reference. A new card may not beat them on stats per gold at equal level.
- **Per-item gates.** Cards stay within ±3 points of win-rate delta. Doctrines stay within ±5. A card's test plan may raise the Final Bell rate by at most 5 points.
- **Has-an-answer.** Every card has a same-age card that scores at least 55% against it in `counters.json`.
- **Soft multipliers.** New keywords stay within ±25%; only the existing triangle keeps ×2.
- **Numbers-only patches.** Each season carries a numbers-only balance patch.
- **Nothing owned is removed** from a mode it was earned for.

### 1.5 Beauty budget

The owner cares most that the game looks beautiful and moves well. Art spend goes where players look most often:

1. **The evolve moment.** It exists already; protect it. Doctrine cards flip up inside the Ascension show; they do not interrupt it.
2. **Battlefields and weather.** They are seen in every match: rain, snow, fog, wind, cliffs, bridges, trenches (DP-12, DP-13).
3. **The village Home.** Seen every session (DP-36).
4. **Mythic walkouts and the Holo shimmer.** The rarity thrill (DP-28, DP-29).
5. **Readable keyword effects.** One effect per keyword, reused by every card (DP-25).

**One decision gates all card growth:** stay on procedural puppets, or move units to the 3D sprite tier from the spike report. The spike estimates 1-2 agent hours per unit and 70-300 KB per unit at 1.5x. That choice sets the cost per card in DP-26. It is item A10 at the fun gate (section 14).

---

## 2. Strategic depth: battle rule changes (direction 3)

### DP-1 The bot answers spam and evolves on time

| | |
|---|---|
| Fantasy | "Spamming cheap units against a good general just feeds them." |
| Class | Healthy: fairness is the only tuning target (A15 rule 10) |
| Decisions | Blind spam stops paying. The player must read the lane and trade |
| Counterplay | The same rules for both sides; bots still make tier-scaled human mistakes (A7.2) |
| AI | This is the AI change |
| Architecture | `src/ai` only: `brain.ts` and `scoring.ts`. No contract change |
| Art | none |
| Battle link | Every ladder match |
| Size, phase, owners | S · v1 Phase 2a, as a request to WP3 now while Phase 1 edits the bot, so the owner's Checkpoint A test is against an honest bot · WP3 |

**Rules** (A7.2 and A7.3 amendments, from audit P1):

1. **Save for a counter.**
   - When the best counter score over the whole tray, ignoring gold, beats the best affordable card by at least 0.15, the bot sets a saving goal for that card's cost. It reuses the Legendary saving-goal code.
   - The goal lapses after 8 s, or when an enemy unit comes within 300 lu of the bot's gate. The lapse is new and needs testing; it stops a bot from starving while it saves.
2. **Evolve on time.**
   - The safe-window check applies only from tier VII and is capped at 2 s (tier X: 0.5 s), as A7.3 already says.
   - Below tier VII, the evolve-delay column applies as written.
3. **Answer one-type armies.**
   - When at least 60% of the visible enemy army value is one role group:
     - counter weight ×2;
     - diversity term off;
     - gold float target 0.
4. **Build turrets** toward the tier's maximum turrets (A7.3), so the turret share of kills (20-35%) can pass.
5. **Drop the Legendary saving goal while the push gate fails** (part of DP-3).

**Measured on a scratch copy** of the bot with rules 1 and 2 (audit 2.3), against tier VII:

| Proxy | Before | After |
|---|---|---|
| Cheapest-unit spam | 54-60% | 0-3% |
| Random spam | 28-30% | 11-13% |
| Heavy spam | 98% | 35% |

Rules 3 and 4 target Heavy spam and the turret share.

### DP-2 A2.14 depth targets and exploit proxies

| | |
|---|---|
| Fantasy | none. It makes "skill, not spam" a CI fact |
| Class | Healthy |
| Decisions | Protects every decision in this section from regressions |
| Architecture | `tools/exploits.ts`: scripted controllers that read only the delayed `Observation` and decide every 0.25 s (audit section 5); `sim:exploits` report; static "has-an-answer" check over `counters.json` |
| Size, phase, owners | S · v1 Phase 2b (tools), Phase 3 (gates) · WP12, lead (A2.14 and B12 text) |

**A2.14 replacement rows.** Exploit rows run against the tier VII Balanced bot at L7, in Short and Full War, with at least 400 matches per proxy. Rules-sanity rows run scripts against scripts, with no bot.

| Metric | Old target | New target | Gated in |
|---|---|---|---|
| Cheapest-unit spam | ≤ 55% | **≤ 20%** | v1 |
| Random spam (new): a uniformly random affordable tray unit | none | **≤ 15%** | v1 |
| Mono spam, Heavy / AA / Ranged (new, each) | none | **≤ 25%** | v1 |
| 4-turret turtle with Hold | 35-45% | 35-45% **and ≤ 15% of its matches at the Final Bell** | v1 |
| Heavy plus mass Ranged (B12 proxy 4) | ≤ 55% | ≤ 55% **and its own mirror ≤ 20% at the Bell** | v1 |
| Other B12 proxies (greed, splash, heal stacking, double evolve, power saving) | ≤ 55% | ≤ 55% (unchanged) | v1 |
| Counter-picker vs each mono spam (rules sanity, new) | none | ≥ 80% | v1 |
| Triangle, mono vs mono (rules sanity, new): Heavy beats Infantry, AA beats Heavy, Infantry beats AA | none | each ≥ 70% | v1 |
| Final Bell, tier VII mirror | < 3% | < 3% Full, **< 5% Short**, also with a Legendary in each plan | v1 |
| Per-card Final Bell delta (new) | none | a card's test plan raises the Bell rate by ≤ 5 points | v1 |
| Has-an-answer (new, static) | none | every card has a same-age card scoring ≥ 55% against it; Legendaries reported | v1 |
| Turret share of kills | 20-35% | 20-35% (needs DP-1 rule 4) | v1 |
| Skill gap (new) | none | VII vs V ≥ 65%, X vs V ≥ 65%, VII vs III ≥ 80% | reported in v1, gated from v1.1 |
| Attention gap (new): the Balanced script deciding every 1 s vs every 3 s, each vs tier VII | none | ≤ 10 points (≤ 5 with DP-8) | reported in v1, gated from v1.1 |
| Power timing (new, after DP-5): firing at a ≥ 450-gold zone vs firing when full | none | the zone rule wins by ≥ 5 points | v1 if DP-5 is adopted |
| Level edge +1 (report only) | none | reported each release | never gated |

The skill and attention gaps are reported, not gated, in v1. Phase 3 changes numbers only and cannot close them; the v1.1 depth systems should. The benchmarks' extra "spend-as-soon-as-possible ≤ 40%" row is not needed: the Balanced script already spends at once and wins 10-25%.

### DP-3 Stalemate package

| | |
|---|---|
| Fantasy | "Siege is the final assault. Somebody breaks." |
| Class | Healthy |
| Decisions | Defending forever stops being safe. Late pushes and power timing decide matches instead of the Bell |
| Counterplay | Symmetric: both sides' units become fragile in Siege |
| AI | Drops its Legendary saving goal while the push gate fails; in Siege it always Charges (A7.2, unchanged) |
| Architecture | Two optional `EconomyRules` fields with neutral defaults, so goldens do not change (a minor `SIM_VERSION` bump), applied in A2.7 damage step 7. Per-card Bell report in `sim:balance` |
| Art | none (Siege already has a vignette and a bell) |
| Size, phase, owners | S · v1 Phase 2b (fields, bot), v1 Phase 3 (values, Legendary tuning) · WP0 (field types), WP2, WP3, WP1, WP12 |

**Why.** Stalemates come from defensive compositions at equal strength, not from the clock (audit 3.7):

- Short War Bells: 22-33% in the tier VII mirror.
- With a Legendary in each plan: 55% (Short) and 83% (Full).
- Heavy plus Ranged mirror: 100%.
- More than ten clock, economy and Siege variants failed. Only lower unit HP (the `glass_armies` modifier, ×0.7) moved the Bell rate: 28% → 8%, and the turtle's 95% → 46%.

**Rules.**

1. `EconomyRules.siege.unitDamageTakenBp` (default 10,000):
   - In Siege every unit takes damage × this value / 10,000, applied after the other phase mods.
   - Bases keep ×2. Structures take ×2 (DP-19).
   - Phase 3 starts its search at **14,000 (+40%)**.
2. `EconomyRules.overdrive.unitDamageTakenBp` (default 10,000): a second knob, used only if Siege alone cannot reach the target.
3. **Legendary tuning** (Phase 3, numbers only): each Legendary's age must contain a counter that beats it at equal gold, at least 55%.
   - Today Mammoth Matriarch beats Spear Hunter 76%, Ursa Paladin beats Pikeman 73%, Behemoth beats Bazooka 90%.
   - Also fix Balloon Admiral (no unit answer in Gunpowder) and EMP Saboteur (loses to the mechs it should counter).
4. **Bot:** no Legendary saving goal while its push gate fails (DP-1 rule 5).
5. **Kill bounty stays 60%.** Recorded in `docs/decisions.md` as the dial between spam and stalemate: 45% lets spam win 88-92%; 75% raises Full War Bells from 8% to 21%.

**Targets:** Final Bell < 5% in the tier VII mirror (baseline plan and plans with a Legendary), ≤ 15% in turtle matches, while cheapest-unit spam stays ≤ 20%.

### DP-4 Teach the wave

| | |
|---|---|
| Fantasy | "I held my gold, waited for the lull, and hit them with everything at once." |
| Class | Healthy (informative feedback, A15.12) |
| Decisions | Banking 300-800 gold and releasing a wave beats spending as you go by 21-48 points among scripts, and by 10% → 36% against tier VII (audit 2.5). It is the deepest decision in the rules, and nothing shows it |
| Counterplay | Enemy gold stays hidden; reading a lull is the skill. A wave can be met with a power, a Hold or a turret |
| AI | Personalities make intent readable (A7.4): Mama Moss and Madame Tempest visibly bank, Hold, then Charge |
| Architecture | One new A8 failure-pattern detector in WP11; strings |
| Art | none |
| Size, phase, owners | XS · v1 Phase 2b · WP11, WP1 (strings), WP3 |

**Rules.**

- **Detector "trickle":** in the last 30 s the player spawned at least 6 units, no two within 2 s of each other, while the enemy army value on the lane exceeded the player's by at least 50%.
- **A8 adaptive hint** (≤ 8 words): "Save gold, then send them together."
- **A15.12 loss tip:** "Tip: units sent one by one fall one by one. Bank gold, then send a wave."
- The Review screen (DP-23) later names the same pattern as a key moment.

### DP-5 Power ring overflow

| | |
|---|---|
| Fantasy | "I let the storm build until their whole army bunched up." |
| Class | Healthy |
| Decisions | Today holding a full ring wastes charge, so the only real decision is to fire early (audit 2.5). With overflow, waiting costs nothing, so *when* becomes a real choice that the opponent can read |
| Counterplay | Both rings show the overflow. The opponent spreads out, holds back or baits the cast |
| AI | Unchanged thresholds. Madame Tempest's signature (banking for clumps) finally works as designed |
| Architecture | `EconomyRules.power.chargeMaxPpm` (default 1,000,000, today's behaviour); sim clamp; ring overflow arc in the HUD. Neutral default, so it is a minor bump |
| Art | An outer gold arc on both power rings, plus a soft hum at 150% |
| Size, phase, owners | S · v1 Phase 2b (field, ring), v1 Phase 3 (value) · WP0, WP2, WP5 |

**Rules** (A2.9 amendment):

- Charge keeps filling past 100% at the same rate, up to `chargeMaxPpm`. Phase 3 sets **1,500,000 (150%)** if the proxy passes and the owner agrees at Checkpoint A.
- A cast uses 100%.
- The evolve rule stays min(charge, 50%). Overflow is therefore lost on evolve, so "fire before you evolve" remains a decision.
- Overcharge (the final age) still adds charge only while it is below 100%.
- **Test:** firing at a zone worth ≥ 450 gold beats firing when full by at least 5 points.

### DP-6 Anti-spam tools we do not add

Record in `docs/decisions.md` (audit P7):

| Tool | Evidence | Verdict |
|---|---|---|
| Queue cap below 5 | The queue never binds: passive gold pays for one Infantry every 8.3 s | Not needed |
| Per-card recharge on units | V3: counter-picker vs spam fell 100% → 58%, with 83% at the Bell | Rejected. Recharges only on fortifications (PvZ model) |
| Evolve price | V2 and V2b: spam 83-92%, Bells up | Rejected |
| Longer Ascension | V9: Short War Bells 50% | Rejected |
| Bounty 45% or 75% | V8 and V11 | Keep 60% |
| Less loss XP, stronger splash, Overcharge changes, earlier Siege, territory decay | No useful effect | Rejected |
| Direct unit control | Rewards click speed (Stick War) | Rejected |

### DP-7 Movable hold line

| | |
|---|---|
| Fantasy | "Hold at the ridge." |
| Class | Healthy |
| Decisions | Where to hold: on high ground (range bonus), just behind a wall, deep in turret cover, or forward to contest mid-lane. It becomes a positioning decision once terrain exists (DP-12) |
| Counterplay | The line is visible to both sides. Artillery outranges it, tunnelers pass under it, and Fog and Siege weaken it |
| AI | Bots hold on their own high ground when a field has one, otherwise at 320 |
| Architecture | `stance` command + optional `p`; `SideState.holdP`, hashed when not 320; `Observation.foe.holdP` |
| Art | A small flag decal on the ground at the line |
| Size, phase, owners | S-M · v1.1, with battlefields · WP0, WP2, WP5, WP3 |

**Rules** (A2.7 amendment):

- Drag the stance flag left or right to set the hold line anywhere from p 200 to 440, in 20 lu steps. The default is 320. Tap still toggles Charge and Hold.
- Moving the line shares the stance cooldown of 2 s.
- The turtle gates (DP-2) run once per battlefield, so the line cannot become a turtle tool unnoticed.

### DP-8 Repeat order

| | |
|---|---|
| Fantasy | "Keep Bonkers coming while I watch the big fight." |
| Class | Healthy. It stays inside one match, so red line 5 is untouched |
| Decisions | Removes the attention tax: in the audit, a 3 s decision rhythm lost 13% → 3% because idle gold piled up. The cost is real: Repeat trickles, and trickling loses to waves (DP-4). It is a convenience with a trade-off, not a free win |
| AI | The same command exists for bots (A7.1) |
| Architecture | Command `repeat { slot \| null }`; a loop icon on the card |
| Size, phase, owners | S · v1.1 candidate if the owner finds the tray tiring at a checkpoint; required for online PvP, which has no pause · WP0, WP2, WP5, WP3 |

**Rules:** swipe up on a card (keyboard Shift+1-5) to toggle Repeat for that card. At most one card repeats at a time. The queue refills with it whenever gold and queue room allow. Right-click and long-press keep their cancel meaning (A2.12).

### DP-9 Standard levels wherever skill is measured

| | |
|---|---|
| Fantasy | "When it counts, only skill counts." |
| Class | Healthy |
| Decisions | Protects every decision in this proposal from being drowned out: one card level is worth about 20 points, while the tier VII vs V skill gap is about 10 |
| AI | Bots play at the same standard levels in those modes (A7.1: same rules) |
| Architecture | `OpponentSpec.standardLevels` exists (A15.18); for ranked, clamp `SideConfig.levels` in `BattleSession` |
| Size, phase, owners | XS (rule) · v1; S · online ranked · WP7, WP11 |

**Rules.**

- **Standard L7 for both sides:** the Daily Challenge (A15.7), puzzles, challenge and Echo codes (A15.15), Random Armies, Boss Battles and Endless Horde.
- **Gauntlet and Draft War** set levels only through boons (A15.17).
- **Online ranked:** every owned card plays at exactly L8, whatever its level. This replaces A6.8's "caps all cards at L8" with "sets".
- **The AI ladder and Conquest** keep A6.8 level matching. Upgrades must still matter against the ladder.

### DP-10 Reveal, then pick a preset; 5 presets

| | |
|---|---|
| Fantasy | "Kingsmoat, rain, Captain Kettle: I'm bringing my splash plan." |
| Class | Healthy |
| Decisions | Scouting and commitment before the match (the PvZ seed pick against shown zombies). Presets become strategic, not cosmetic |
| Counterplay | Bots use their personal plans. Online, both players pick blind after the same reveal |
| AI | none. Procedural AI commanders keep their seeded plans |
| Architecture | The VS screen gains a preset picker; save `warPlans` length 3 → 5 (a v1.1 migration that copies preset A into D and E) |
| Size, phase, owners | S · v1.1, with battlefields · WP9, WP11, WP8 |

**Rules.**

- The VS screen shows the battlefield, the weather schedule, the AI General (tier and AI badge) and any modifiers. The player then taps one of 5 presets. The default is the last preset used in that format.
- There is no timer offline. Online, a 15 s pick window applies the default. That is a match-flow limit, not a reward countdown.

---

## 3. Battle variety (direction 1)

### DP-11 Rule mods engine (F1) and the v1 modifier fix

| | |
|---|---|
| Fantasy | none (a foundation) |
| Class | none |
| Architecture | v1: move `ModifierEffect` into `contracts/content.ts`; the sim reads each Daily modifier's effect from compiled content through a narrow structural type; delete the hard-coded `DAILY_MODIFIERS` copy in `src/sim/modifiers.ts`. v1.1: the `ModEffect` vocabulary with a scope (side, groups, tags, cards, zone), compiled in `createCtx` into per-side integer tables. At most 4 zones, cached per unit per tick. Timed mods are hashed only when non-empty. Neutral values keep goldens unchanged |
| Size, phase, owners | S · v1 Phase 2b, before Phase 3 tuning · WP0, WP2, WP1. M · v1.1 · WP0, WP2, WP1, WP3, WP12 |

**Why the v1 fix matters now.**

- The sim ignores the modifier numbers in content, and the two copies already disagree in sign: `siegeShift ms: -75000` in content against `siegeEarlierMs: 75000` in the sim.
- Phase 3 tuning of the content numbers would change nothing in the game.

**v1.1 vocabulary** (architecture F1):

- **Economy:** `passiveGold`, `passiveXp`, `treasuryIncome`, `powerCharge`, `xpThreshold`, `baseHp`.
- **Units:** `unitCost`, `unitHp`, `unitDamage`, `damageTaken`, `moveSpeed`, `attackSpeed`, `range`, `trainTime`.
- **Turrets:** `turretDamage`, `turretRange`.
- **Counts:** `popCap`, `queueMax`, `frontWidth`.
- **Clock:** `siegeShift`.
- **Keywords:** `grantKeyword` (needs F2).
- **Two additions for this proposal:**
  - an attacker-tag scope, for Cover and Rain;
  - `bounty`, for the Plunder doctrine.

### DP-12 Battlefields (APPROVED)

| | |
|---|---|
| Fantasy | "Every arena fights differently: hold the cliffs at Powder Bay, choke the moat bridge at Kingsmoat." |
| Class | Healthy: symmetric, visible, known before the match |
| Decisions | Which preset to bring (DP-10), where to hold (DP-7), ranged versus melee weight, splash on a bridge, when to push through a ford |
| Counterplay | Features are mirror-symmetric around mid-lane, so both sides get the same terrain |
| AI | Reads `Observation.field`. Holds on its own high ground. Scores splash higher on a bridge field and ranged higher with a high-ground zone held. Small scoring terms only |
| Architecture | F1 zones; `MatchConfig.battlefield?` and `ReplayDoc.battlefield?`; `Observation.field`; a small movement change for `frontWidth` 1; `content/battlefields.ts`; `ArtProvider.createBackdrop` + optional `features` |
| Art | Per arena: ground decals and props for its feature and faint zone-edge markers. The ground layer is already per arena (A11). Audio: an ambient loop per arena. Art M |
| Battle link | It is the battle |
| Size, phase, owners | M + art M · v1.1 · WP0, WP2, WP1, WP3, WP4, WP5, WP6 |

**Feature kinds** (at most one feature per battlefield; symmetric around x = 600):

| Feature | Zone | Effect |
|---|---|---|
| High ground | p 380-460 on each side | Units with tag `ranged` whose centre is inside get range +15% |
| Bridge | x 540-660 | `frontWidth` 1: the front rank holds one unit instead of two, so armies meet in single file. Splash and pierce shine |
| Ford | x 520-680 | Ground units inside move −30%. Air is unaffected |
| Cover | p 250-330 on each side | Ground units inside take −20% damage from attackers with tag `ranged` and from turrets |

Features never change bases, turret rules, spawns, powers or Last Stand.

**Per arena:**

| # | Arena | Feature | Weather table (DP-13) |
|---|---|---|---|
| 1 | Tar Pits | none: flat, for onboarding | none |
| 2 | Frostfang Pass | Ford (snowdrift) | Snow |
| 3 | Kingsmoat | Bridge | Rain |
| 4 | Powder Bay | High ground (sea cliffs) | Fog |
| 5 | Iron Front | Cover (trenches) | Rain, Fog |
| 6 | Neon Harbor | Bridge (drawbridge) | Rain, Gale |
| 7 | Orbital Ring | High ground (docking pylons) | Gale, Fog |
| 8 | Chrono Rift | Ford (time eddy) | Rain, Snow, Fog, Gale |

**Other modes.**

- **The first 20 matches of a save and the tutorial** use flat Tar Pits with no weather (Pillar 1).
- **Conquest:** each General has a home battlefield:

  | General | Home battlefield |
  |---|---|
  | Pip Quickstep | flat |
  | Captain Kettle | Bridge |
  | Mama Moss | Cover (garden hedges) |
  | Baroness Ledger | Ford |
  | Sgt. Boomsworth | High ground |
  | Ada & Ivo | Bridge with Rain |
  | Rook | flat |
  | Madame Tempest | Fog and Gale |
  | The Warden | High ground with every weather |

- **The Daily** draws its battlefield from the Daily seed.
- **Skirmish** lets the player choose any battlefield.

**Gates** (section 11): first-mover 47-53% on every battlefield; the turtle and Bell targets per battlefield.

### DP-13 Weather (APPROVED)

| | |
|---|---|
| Fantasy | "The fog rolled in, their cannons went blind, and my knights charged." |
| Class | Healthy: the schedule comes from the seed and is shown in full before the match |
| Decisions | Time pushes around fronts. Fog is an anti-turtle window; Rain favours melee pushes; Snow buys time; Gale grounds the air game |
| Counterplay | Symmetric and fully visible in advance |
| AI | Sees the current and next front in `Observation.weather`. Turtle personalities push into Fog; bots avoid buying long-range artillery just before Fog |
| Architecture | F1 timed mods from `xmur3(seed + ':weather')`; `Observation.weather`; `BackdropView.setWeather?(id, intensity)` (optional, so all 4 art adapters keep compiling); effects through `createEffect('weather.<id>')`; no new `MatchConfig` field |
| Art | 4 particle and tint overlays (rain streaks, snow, a drifting fog layer, wind streaks with bending grass and flags); Lite shows fewer particles. Audio loops per kind. Art M, shared with DP-12 |
| Size, phase, owners | Part of DP-12 · v1.1 |

**Rules.**

- A battlefield lists 0-4 weather kinds. When the list is not empty, a match draws its fronts from its seed:

  | Fronts in the match | Chance |
  |---|---|
  | 0 | 30% |
  | 1 | 50% |
  | 2 | 20% |

- Each front lasts 40 s. It starts on a 5 s grid between 1:00 and 40 s before Overdrive. Two fronts start at least 60 s apart.
- **The full schedule is public.** It appears on the VS screen ("Fog 2:10-2:50") and as bands on the match-clock timeline next to the Overdrive and Siege ticks. The HUD weather chip lights up 10 s ahead: a rules telegraph, like a power's, not a reward countdown.
- **Weather kinds:**

  | Weather | Effect |
  |---|---|
  | Rain | Units with tag `ranged` and turrets deal −15% damage; ground units move −10% |
  | Fog | Units with tag `ranged` and turrets have −35% range |
  | Snow | Ground units move −20% |
  | Gale | Air units move −30% |

- Weather never hides units and never affects powers, bases or Last Stand. There is no night.

### DP-14 Evolve doctrines

| | |
|---|---|
| Fantasy | "Every time I evolve I choose how my people fight in the new age, and I see what they chose." |
| Class | Healthy |
| Decisions | Evolving first gives tempo; evolving second gives information for a counter-pick. The two offers are trade-offs, so neither is automatic. This moves the evolve decision from *when* (dominated: always at once, audit 2.5) to *what* |
| Counterplay | Offers are identical for both sides and public; the enemy's active doctrine flies as a banner on its base and joins the Scouted list |
| AI | A `choose` term: the doctrine's `aiHint` × personality weights + counter value against the enemy's scouted cards and doctrine. Tiers 0-II pick with seeded randomness, III-VI by `aiHint`, VII and up with full scoring |
| Architecture | `evolve` command + `pick?: 0 \| 1`; `Observation.me.doctrineOffer` and `foe.doctrine`; `HudModel.me.doctrineOffer`; `SideRt.doctrine`, hashed when set; `content/doctrines.ts` (ModEffect lists, strings, icon, `aiHint`). Pure data after F1 |
| Art | 12 procedural doctrine glyphs; two cards that flip up on the Evolve button; the banner reuses the banner rig with a glyph; a pick sound. S |
| Battle link | Every evolve in every match from Arena 2 |
| Size, phase, owners | M · v1.1, after F1 · WP0, WP2, WP1, WP3, WP5, WP6 |

**Rules.**

- **When.** From Arena 2, in every mode except the tutorial and the first 20 matches, each evolve offers the same 2 doctrines to both sides for that age index.
  - They are drawn without replacement from the pool by `hash(seed, 'doctrine', ageIndex)`.
  - Both offers show on the Evolve button as soon as Evolve is available. The opponent's button shows the same two.
- **How.** The Evolve button splits into two labelled halves; tapping one evolves and picks it. Keyboard: E for left, R for right. Long-press shows the rule. There is no plain Evolve, so picking costs zero extra taps.
- **One doctrine at a time.** A new pick replaces the old one at `ageUp`. The rules load stays constant, and each age brings a fresh decision.
- **Shape.** Each doctrine has one bonus and one cost, each at most ±15% on one stat of one group, or a small economy trade. No doctrine changes XP thresholds or the clock.
- **Onboarding.** The first doctrine shows the hint "Choose how your new age fights." (6 words).
- **Count.** A pick at every evolve means 2 picks in Short War and 4 in Full War. The benchmarks favour about 2 pivots per match. If playtests find 4 routine, the fallback is picks at the 1st and 3rd evolve only (Short War: 1st and 2nd). This is fun-gate item A7.

**Initial pool of 12** (usable in any age):

| Doctrine | Bonus | Cost |
|---|---|---|
| Shieldwall | Heavy and Legendary units +15% HP | Their move speed −15% |
| Forced March | Ground units +15% move speed | Unit HP −7% |
| Longshots | Ranged units +12% range | Ranged units −10% HP |
| Hunters | Anti-armor units +15% damage | Infantry −10% damage |
| Swarm | Infantry train time −30% | Heavy train time +30% |
| Engineers | Turret damage +20% | Treasury income −25% |
| Zealots | Age Power charge +30% | Unit damage −5% |
| Plunder | Your kills pay 75% of cost in gold instead of 60% | Passive gold 6 → 5 per second |
| Loose Order | Units take −25% damage as secondary targets of area attacks | Melee damage taken +10% |
| Field Medics | Heals +40% | Support units −15% HP |
| Siegecraft | Damage to bases and structures +25% | Damage to units −5% |
| Veterans | Units +10% attack speed | Train time +15% |

**Gates:** each doctrine's win-rate delta is within ±5 points in mirrored runs. "The pick matters": the better pick for the lane state, judged by the Balanced brain's score, wins by at least 5 points.

### DP-15 Bonds (card synergies)

| | |
|---|---|
| Fantasy | "My beasts move as one pack." |
| Class | Healthy |
| Decisions | Plan building: play a slightly weaker card to complete a bond, or take the best card per slot |
| Counterplay | Bonds are static and shown on the VS screen and in the Scouted list |
| AI | The procedural plan generator scores bonds; nothing changes in battle |
| Architecture | A `family` field per card; `content/bonds.ts`; evaluated once in `createCtx` from `SideConfig.loadouts`. Data after F1 |
| Art | Family glyphs; a glowing chip in the War Plan builder |
| Size, phase, owners | S · v1.2, with sets and families · WP1, WP2, WP9, WP3 |

**Rules.**

- An age loadout with at least 3 cards (units or turrets) of one family activates that family's bond for that age: one bonus of at most +5% on one stat.
  - Examples: Beasts +5% move speed; Gunners +5% range; Machines +5% HP; Healers +5% heal.
- At most one bond per age loadout. When two qualify, the one with more cards wins; ties go by family order.
- Only the current age's loadout counts, so bonds never stack across ages.
- **Gate:** each bond within ±3 points.

### DP-16 Commanders

| | |
|---|---|
| Fantasy | "I learned Mama Moss's garden tricks by beating her, and now I lead with them." |
| Class | Healthy: unlocked by play, never levelled, equal in power |
| Decisions | Plan identity (a passive), plus one single-use active per match. The active has a strong "when" decision, like Clash Royale's single-use hero abilities (2026) |
| Counterplay | The commander is shown on the VS screen; the active has a 1 s telegraph |
| AI | Generals use their own commander in Conquest and Heat (disclosed on VS). Procedural AI commanders pick one from their seed. The active is scored like a power |
| Architecture | `SideConfig.commander?`; command `{ t: 'command'; side; p? }`; `Observation.foe.commander`; `content/commanders.ts` (F1 passives, F2 actives); save `warPlans[].commander?` (migration) |
| Art | The 9 General portraits already exist and are reused; one VFX per active; the active lives on the player's portrait in the top bar, which keeps the tray unchanged. No hero unit in the lane at first: that is the largest art cost, and it can come with a later art tier |
| Battle link | Unlocked by 3 Conquest stars; used in every match |
| Size, phase, owners | L · v1.2 or later, only after doctrines prove out (complexity budget) · WP0, WP1, WP2, WP3, WP5, WP8, WP9 |

**Rules.**

- One Commander slot per War Plan, not per age. It may stay empty.
- Commander N unlocks with 3 Conquest stars against General N, so there are 9 in all.
- **Each commander has:**
  - one passive of at most ±10%;
  - one active, usable once per match.

  | Commander | Active |
  |---|---|
  | Pip Quickstep | Quickstep: all units +30% move speed for 6 s |
  | Captain Kettle | Tea Time: 3 Infantry of your age arrive at once (summoned) |
  | Mama Moss | Overgrowth: a Cover zone at your hold line for 20 s |
  | Baroness Ledger | Dividend: +150 gold |
  | Sgt. Boomsworth | Barrage: 6 shells on the densest point |
  | Ada & Ivo | Twin Orders: no stance cooldown for 10 s |
  | Rook | Insight: the enemy's current-age loadout joins your Scouted list |
  | Madame Tempest | Tempest: +50% power charge at once, up to the overflow cap |
  | The Warden | Last Order: your Last Stand arms at 35% instead of 25% |

- Commanders never level. Ranked allows any commander.
- **Gate:** each commander within ±3 points.

### DP-17 Seeded rotation and content seasons

| | |
|---|---|
| Fantasy | "Today the Daily is on the Kingsmoat bridge in the rain, and Random Armies is featured." |
| Class | Healthy: "finished once beats fed forever" (A15 rule 9) |
| Architecture | Date-seeded picks in `meta` from the Daily seed; no calendar table |
| Size, phase, owners | S · v1.1 onward · WP7, WP9, WP1 |

**The meta rotates without taking anything away:**

1. **Per match:** weather fronts and doctrine offers come from the match seed.
2. **Per day:** the Daily draws a battlefield, a modifier (or a pair, A15.16), an opponent and a seed. Mode select spotlights one "Featured today" mode. Every mode stays available.
3. **Per season:** each content release (DP-26) adds cards, doctrines and battlefields, and ships a numbers-only balance patch, so the meta shifts.

**Never:**

- time-limited modes;
- a curated calendar (Hearthstone cancelled Twist for its cost);
- "featured odds" boosts (A15.22);
- rotating owned cards out of any mode they were earned for.

---

## 4. Lanes, layers and fortifications (directions 4 and 5)

### DP-18 One lane: decision, revisit trigger and a two-lane sketch

**Decision (with the owner, 2026-09-27).** v1 keeps one lane, for four reasons:

- genre identity;
- readability on a phone in landscape;
- real-time play across several lanes rewards click speed;
- the sim is one-dimensional by construction.

Depth inside the lane comes from:

| Source | Where |
|---|---|
| Layers: ground and air (exist), underground | DP-20 |
| Terrain features and weather | DP-12, DP-13 |
| Fortifications on fixed pads | DP-19 |
| Hold line position | DP-7 |
| Ranks: a two-wide front, reach from the third position (exist) | A2.7 |
| Formation, through doctrines (Loose Order, Shieldwall) and the single-file bridge, instead of a new toggle (the audit found stance toggling to be clicking more than deciding) | DP-14, DP-12 |

**Revisit trigger.** Run the two-lane experiment only if, after the owner has played at least 10 Full Wars at Checkpoint B, any of these holds:

1. The owner says matches feel like "one blob pushing".
2. `sim:balance` shows fewer than 3 viable strategy families per age. Viable means a scripted family (wave, turtle, rush, air, artillery, counter-pick) wins at least 40% against tier VII.
3. After v1.1 terrain and doctrines, the same measure still shows fewer than 3.

**Two-lane sketch: "Twin Fronts".** An experiment only: XL, behind a dev flag, never in ranked.

- Its own format id and its own A2.14 targets.
- `lane: 0 | 1` on units and in the `train` and `power` commands.
- Gold, XP, age, Treasury, power charge and pop (60) are shared.
- Each lane has its own spawn, front, hold line and movement.
- Turret mounts split 2 and 2.
- Two lane bands at half height each: landscape only, and unreadable in portrait.
- A 1-week internal prototype plus an owner playtest decides whether it lives on.

### DP-19 Fortifications

| | |
|---|---|
| Fantasy | "Plants vs Zombies in my lane: a palisade holds their mammoth while my archers rain arrows over it." |
| Class | Healthy |
| Decisions | Gold into a wall (defensive tempo) or into units (attack). Which pad: forward on the high ground, or deep inside turret cover. When to place, given a 25 s recharge. Wall or trap. For the attacker: bring siege units, tunnelers or air, or wait for decay and Fog |
| Counterplay | Heavy, siege and Legendary attacks deal ×2 to structures, and ranged attacks only ×0.5. Structures decay, take ×2 in Siege and ignore powers. Tunnelers pass under and air flies over. Placement is visible |
| AI | A `place` action: under pressure, place on the most forward free pad inside turret cover. Mama Moss (turret weight 90) places more. Siege and Heavy cards gain counter value against structures (book `aiHint.vsStructure`). Walls count 0 in the push-gate defence value D, so bots never refuse to attack a wall and stall |
| Architecture | Prototype: one `AbilityDef` addition `{ kind: 'structure'; allyPassable: true }`, a movement exception (own units pass their own structure), a hidden `palisade` card and a sandbox "Place wall at p" button through `devSpawn`. Full: structures are stationary units with the traits `structure`, `allyPassable` and `noPowerDamage` (targeting, damage, deaths, hashing, events and views reused); `Loadout.structures?`; command `place { side, slot, pad }`; `Tag` + `structure`; `EconomyRules.fort { pads, max, rechargeMs, firstReadyMs, decay }`; F2 for traps; F5 slots; a Fort button with drag-to-pad (reusing the power drag) |
| Art | 10 static rigs (a wall and a trap per age) with build, hit, three crumble stages and collapse clips; armed and spent states for traps; subtle pad markings on the ground. About 1 agent hour each (static rigs, code-drawn). Sounds: build thunk, crumble, trap snap |
| Battle link | A new card type in every age loadout, collected from capsules |
| Size, phase, owners | Prototype S · v1 Phase 2a sandbox, dev-only · WP2 (with WP5 or WP11 for the button). Full L · v1.2 · WP0, WP1, WP2, WP3, WP4, WP5, WP9, WP7, WP12 |

**Rules** (full card type):

- **Unlock and slot.** Arena 3. Each age loadout gains 1 Fort slot: 5 units, 2 turrets, 1 fort, 1 power.
- **Pads.** 3 per side at p 240, 360 and 460, all inside turret cover. The hold line (320) sits just behind the middle pad. At most **2** structures alive per side; one per pad.
  - A pad is legal only when no enemy ground unit is within 60 lu of it. You cannot drop a wall on top of an army.
- **Recharge.** After placing, the Fort card recharges for **25 s**. It first becomes ready at 0:20. Evolving does not reset it.
- **Cost** (flat across ages, like units): wall 125 gold, trap 75, bunker 175.
- **Wall HP:** 2 × the age's Heavy Common HP at L1. Stone 1,120, Medieval 1,512, Gunpowder 2,038, Modern 2,756, Future 3,720. Level scaling as for cards.
  - Example: a Tuskback breaks a Stone palisade in about 20 s, and two Bonkers side by side in about 28 s.
- **Build:** 2 s. The structure blocks and can be hit from the moment it is placed.
- **Decay:** from 60 s after placement it loses 1% of max HP per second, ×2 in Siege. That caps an untouched wall's life at about 160 s, or about 110 s in Siege. A decayed structure pays no bounty.
- **Damage taken:**
  - attacks by Heavy units, units with the siege tag (Ram, Bronze Cannon, artillery) and Legendaries: ×2 (a `mods` entry `vs: structure`);
  - attacks with range ≥ 100: ×0.5 (arrows do not break walls);
  - ×2 during Siege, as for bases;
  - Age Powers and Last Stand never hit structures (powers hit units only, A2.9).
- **Blocking and targeting:**
  - Enemy ground units stop at a wall and must break it. Own units walk through their own structures. Air ignores structures; burrowed units pass under.
  - Unit attacks target a structure only when the attacker is blocked by it, when it is the only candidate in range, or when the attacker's priority is `structure` (siege units). Otherwise ranged units shoot past walls at the units behind them.
- **Bounty:** destroying a structure pays 30% of its cost in gold and 100% in XP. Breaking through should move you toward the next age.
- **No pop.** Structures never queue, never convert on evolve, and cannot be modernised.
- **Traps:**
  - untargetable, non-blocking and **always visible to both sides**;
  - fire when an enemy ground unit's centre comes within 30 lu, 1 s between charges;
  - air and burrowed units never trigger them.
- **Cards** (Season 1, 10):

  | Age | Wall (Common) | Trap (Rare) |
  |---|---|---|
  | Stone | Palisade | Spike Pit: 3 charges, each 40 damage and 40% slow for 2 s |
  | Medieval | Shield Barricade | Caltrops: 3 charges, each 40 damage and 50% slow for 3 s (×P) |
  | Gunpowder | Gabion Wall | Powder Keg: 1 charge, 250 splash r60 (×P) |
  | Modern | Sandbag Bunker (175 gold): a wall, and allies within 60 lu behind it take −20% damage from ranged attacks | Minefield: 3 charges, each 150 splash r40 (×P) |
  | Future | Hardlight Barrier: a wall that regenerates 1% per second after 3 s without damage, and still decays | Stasis Mine: 1 charge, stun 2 s r80 |

- **Keyboard:** D places on the most forward free legal pad.
- **Gates** (section 11):
  - the turtle proxy stays 35-45% with ≤ 15% of its matches at the Bell;
  - a new "wall turtle" proxy (2 walls re-placed on recharge, Ranged-heavy, Hold) ≤ 45% with ≤ 15% at the Bell;
  - each fort card within ±3 points, and it raises the Bell rate by ≤ 5.

**Checkpoint A prototype.** Only the sandbox button and the hidden palisade: no command, no AI, no card, no mode. The owner places walls for either side in the sandbox and plays against them. The fun gate (section 14, A6) decides whether the full card type goes ahead, and whether pads stay fixed.

### DP-20 Underground layer (APPROVED)

| | |
|---|---|
| Fantasy | "My sappers dig under their wall and burst up among their archers." |
| Class | Healthy: every tunnel is visible |
| Decisions | Tunnelers answer turtles and backline-heavy plans. The defender chooses a detector turret or a normal turret, and how compact to keep the backline |
| Counterplay | A dust trail always shows the tunnel. Surfacing is telegraphed for 1 s. Detector turrets hit burrowed units; ground Age Powers and Last Stand hit them at 50%; melee near the backline punishes the surfacing |
| AI | The book gains `burrows` and `detects`. Bots with scouted tunnelers value detector turrets. The existing retargeting answers a surfacing plume. Bots count burrowed units in threat estimates |
| Architecture | First a behaviour-neutral refactor (S) that replaces about 50 ad-hoc air, `hitsAir` and `hitsGround` checks with `layerOf(u)` and `canHitLayer(attack, u)`, proved by the goldens. Then `UnitState.burrowed?`, `AttackDef.hitsUnder?`, `Observation.units[].burrowed?`, `Tag` + `under`, `UnitPose` + `burrowed`. Burrowed movement is like air (no blocking) at ground speed. Burrow and surface are F2 effects |
| Art | Burrow and surface clips; a moving mound pose; a dust-trail effect on the ground-decal layer; 3 detector turret rigs. S-M |
| Battle link | New cards from Gunpowder to Future |
| Size, phase, owners | M (after F2) · v1.2 · WP0, WP2, WP1, WP3, WP4, WP5 |

**Rules.**

- **Cards** (Season 1): Sapper (Gunpowder), Tunnel Rat (Modern), Mole Drill (Future).
  - Role group Epic: cost 200, train 4 s, pop 8. This avoids a new queue-conversion group.
  - Fragile raiders with priority `backline` and ×1.5 against the `ranged` tag.
- **Burrowing.** The tunneler spawns at p 20 and digs in over 1 s; it can be hit while digging. It then travels burrowed at its speed and obeys stance.
- **While burrowed:**
  - it ignores blocking by units and structures;
  - it cannot attack;
  - unit and turret attacks can hit it only with `hitsUnder` (the Detector keyword);
  - ground Age Powers and Last Stand deal it 50%.
- **Surfacing** happens at the first of these:
  - its centre is within 20 lu of an enemy ranged or support ground unit at p ≥ 560;
  - it reaches p 880, the enemy's hold line.

  Surfacing takes 1 s. A dust plume is visible to both sides, and the unit can be hit during it. It never burrows again.
- **Detectors** (Season 1): one detector turret each in Gunpowder, Modern and Future. The Detector keyword can also be granted by later cards.
- **Gate:** a new "tunnel rush" proxy (tunnelers only, with Infantry as fallback) ≤ 25%.

---

## 5. Modes (direction 1)

### DP-21 Mode lineup

A15.17's rule stands: core modes are permanent. "Featured today" only spotlights a mode (DP-17). Every mode has a natural end (A15 rule 5) and pays Dust or cosmetics, never Amber or power (rule 8).

| Mode | Fantasy | Rules | Rewards | Class | Size · phase |
|---|---|---|---|---|---|
| Ladder, Daily, Conquest, Skirmish | As today | A6, A9.1, A15.7; battlefields and doctrines from v1.1 | As today | As A15 | none |
| **Blitz** | "Chess bullet" | Skirmish preset: Short War with Gold Rush and Fast Forward (A15.16) | As Skirmish | Healthy | XS · v1.1 |
| **Random Armies** | "Ageborn 960" | Both plans are generated per age from the seed and the full pool, owned or not. Each age is guaranteed a Heavy or Legendary, a Ranged, an Anti-armor, a splash source (unit or turret) and an air-hitter from Gunpowder on. Standard L7. A "mirror" toggle gives both sides the same plan | As Skirmish (5 Amber per win) | Healthy | S · v1.1 (needs `SkirmishOptions.plan?`, A15.18) |
| **Draft War and Gauntlet** | "Build as you go" | A15.17 unchanged, plus a first "Banner Group" pick per plan: a Legendary or Mythic with 3 complementing cards (the Hearthstone Arena lesson) | A15.17 | Healthy | M-L · v1.2 |
| **Boss Battles** | "The Kaiju of the Tar Pits" | A permanent numbered gallery; D1's "weekly kaiju" is dropped. A boss is a disclosed asymmetric AI side: base HP ×3 and a boss unit with phase triggers (below 66% and 33% HP: summon waves, enrage +30% attack speed), all shown on the VS screen. Standard L7 for the player. Stars for conditions, like Heat | First clear 100 Dust and a village monument; stars 25 Dust each | Healthy | M (F1 + F2) · v1.2 |
| **Endless Horde** | "How long can I hold?" | Your War Plan at L7 against seeded escalating waves (`TrainingEvent.spawn`). No clock. The run ends when the base falls or at wave 30 with a finish screen. No auto-restart and no per-wave rewards | 5 Dust per wave above your best; best wave on the Profile | Healthy | M · v1.2 |
| **Puzzles** | DP-22 | DP-22 | DP-22 | Healthy | M · v1.1 |
| **Co-op vs boss (2v2 PvE)** | "Me and my friend against the Warden" | DP-34 | none beyond Boss stars | Grey online | XL · later |

---

## 6. The learning loop: chess lessons (direction 3)

Chess grew on a loop, not on content: short fair games, a visible rating, puzzles mined from real games, and analysis with key moments (benchmarks 2.11). Ageborn's deterministic replays can do all of it.

### DP-22 Battle Puzzles

| | |
|---|---|
| Fantasy | "One position, one clever decision: hold the wave, time the power, win the clutch." |
| Class | Healthy. The daily pick is a spotlight, not a bank or a streak; every puzzle stays playable forever |
| Decisions | Isolates exactly the levers the audit found: waves, power timing, Last Stand, Hold then Charge, doctrine picks, and later fort placement |
| Counterplay | A scripted opponent (fixed commands) or a bot at a fixed tier and seed, so every attempt is deterministic given the player's inputs |
| AI | Reuses `ScriptedController` (Grogg's machinery) or a fixed-tier bot |
| Architecture | F4 scenario start (S, WP2): `MatchConfig.training.scenario?` sets both sides' gold, XP, age, base HP, Treasury, mounts, turrets, power charge and units (card, p, HP, level) at tick 0; `training` is already in `ReplayDoc`. `content/puzzles.ts` holds id, stable `num`, scenario, opponent, goal, stars, `matchHash` and a solution replay. `tools/puzzles.ts mine` and `verify`: CI replays every stored solution so a balance patch cannot silently break a puzzle. Save `puzzles?: Record<id, { stars; bestMs }>` (v1.1 migration). A Puzzle screen |
| Art | none new: a brief card and goal chips |
| Battle link | Puzzles are short battles and teach skills the ladder rewards |
| Size, phase, owners | M + S per 10 puzzles of authoring · v1.1. This replaces A15.17's Clutch Puzzles, which waited for battle resume · WP2, WP1, WP7, WP9, WP12, WP8 |

**Rules.**

- **Content.** A puzzle is a scenario, an opponent, a clock limit of 30-120 s, one goal and three stars.
  - Goals reuse A15.10's predicate kinds: destroy the base before T; survive to T with the base at X% or more; kill N units with one power; win spending no more than N gold.
- **Levels.** Standard L7 on both sides. No doctrines unless the puzzle sets one.
- **Attempts.** Free and unlimited, with an instant retry. "Show idea" appears after 3 failed attempts, as feats' "Show hint" does.
- **Solvable by humans.** A15.17's human-limited bot must solve every puzzle: at least 300 ms per action, at most 12 actions per 10 s.
- **Mining.** `tools/puzzles.ts mine` scans headless bot matches for positions where one decision flips the result; a human curates. Each puzzle keeps the `matchHash` it was authored on. A broken puzzle is re-authored, or pinned to a frozen rules slice.
- **Pool.** 30 at launch, in 3 numbered sets of 10 (Waves, Powers, Last Stands); 10 more per season.
- **Puzzle of the day.** `hash('puzzle' + YYYYMMDD) mod pool` picks one from the archive, the same for everyone. Mode select shows "Today's puzzle: #37". No streak and no count of unsolved puzzles (A15.13).
- **Rewards.** Per puzzle: the first ★ pays 10 Dust, ★★ 10 more, ★★★ 20 more (40 in all). All 10 puzzles of a set at ★★★ pay a title or banner once. The daily pick pays nothing extra. Launch value: 1,200 Dust.
- **Copy line.** `Ageborn Puzzle #37 · ★★★ · 0:48`. No name, and copying pays nothing.
- **Difficulty** shows as 1-5 pips per puzzle. There is no player puzzle rating (DP-24).

### DP-23 Review: advantage graph and key moments

| | |
|---|---|
| Fantasy | "Oh, that's where I lost it: I sat on 400 gold for 40 seconds." |
| Class | Healthy |
| Decisions | Attribution, the fourth test in 1.1: the player traces results to decisions |
| AI | none in v1.1. The fitted evaluation can later feed the bot's push and power scoring |
| Architecture | `src/sim/analysis.ts` (pure, WP2) re-simulates a replay with `replayMatch` in a Web Worker and samples every 20 ticks. Evaluation: P(side 0 wins) = logistic(Σ wᵢ fᵢ) through an integer look-up table. Features: army value × HP%, base HP, age difference, XP, gold, Treasury, turrets, power charge. Coefficients are content data fitted offline by `tools/fitEval.ts` on at least 5,000 headless matches. No contract change beyond an exported type; no replay impact |
| Art | A graph (the dataviz rules apply); no new game art |
| Battle link | "Watch from here" and "Play again" |
| Size, phase, owners | M · v1.1, with the D1 replay seek bar · WP2, WP1, WP12, WP9, WP11 |

**Rules.**

- **Where.** A "Review" button on the Result screen and in the replay viewer. It is never a staged Result step (A15.13) and never runs live in battle; post-match, full information is fair.
- **Graph.** Advantage from 0:00 to the end: blue above the line, orange below, with phase and weather ticks. Tap any point to open the replay at that tick.
- **Key moments.** The 3 largest swings over 5 s windows, each labelled with its main event: a Legendary spawn, a power cast with N kills, an evolve with its doctrine, Last Stand, a wall broken, a wave arriving. Each has "Watch from here".
- **Lever notes.** At most 3, on fixed thresholds in content:
  - "You held 400+ gold for 40 s."
  - "12 units arrived one at a time."
  - "Your power hit 2 units."
  - "You evolved 20 s after it was ready."
- **Reuse.** A15.12 result tips can draw on the same moments. The same evaluation can later improve the bots.

### DP-24 Ratings: what is visible where

| Where | Rank shown | Why |
|---|---|---|
| AI ladder (offline and online) | Trophies, plus "Highest AI tier beaten" (A15.9) | A15.9: one moving rank; peak tier never falls |
| Puzzles | Per-puzzle difficulty pips; no player rating | A second moving rank would add rank anxiety |
| Online ranked PvP | A visible **Glicko-2** rating, provisional ("1500?") until RD < 110 (about 15-20 games). Standard L8 (DP-9). Short War by default (the blitz format). No decay; online seasons carry over (A15.17) | The chess lesson; within its own mode it is the one moving rank |
| Friends | Relative leaderboard: you among your friends only | No global bottom-of-board display (A15.22) |

Class: grey (comparison), online only, safeguarded as above. Owner decision O2 (section 12).

---

## 7. Cards: keywords, pool growth and rarity (direction 2)

### DP-25 Keywords

| | |
|---|---|
| Fantasy | "I can read any card at a glance: Reach, Splash, Brace." |
| Class | Healthy |
| Decisions | Faster plan building and counter reading as the pool grows |
| Architecture | v1: `content/keywords.ts` maps the existing 16 ability kinds and attack fields to player-facing keywords, each with an icon and a one-line rule template (`t('kw.impact', { mult: 2, kb: 30 })`). Card detail shows chips; the Collection filters by keyword. No sim change. v1.2: the F2 engine (triggers, selectors, effects, traits; architecture 3.1-3.5) runs alongside the old kinds with goldens green (a minor bump); the old kinds are ported once, at a planned major bump; `keyword` events feed `feel.config.json`, so each keyword has one reusable effect and sound |
| Art | v1: about 25 small glyphs. v1.2: one effect per new keyword |
| Size, phase, owners | S · v1 Phase 2b stretch (WP1 data and strings, WP9 chips). L · v1.2 (WP0, WP2, WP1, WP3, WP5, WP12) |

**v1 glossary.** The names avoid "Charge" (the stance) and "Siege" (the phase).

| Keyword | One-line rule | v1 cards |
|---|---|---|
| Impact | First hit of each engagement ×N and knockback | Tuskback, Destrier Knight, Cuirassier |
| Hook | First hit pulls the target closer | Corsair |
| Reach | Attacks from the second rank | Spear Hunter, Pikeman, Walker Mech |
| Ricochet | Hits bounce to nearby enemies | Pebbler, Honk Ballista, Arc Coil |
| Splash | Damages enemies around the impact | Grenadier, Bronze Cannon, Behemoth, splash turrets |
| Cleave | Also hits enemies behind the target | Ursa Paladin, Chrono Titan |
| Pierce | Passes through enemies in a line | Rail Gunner, Chainshot Cannon |
| Shield Wall | Takes 25% less damage from ranged attacks | Footman |
| Brace | Immune to knockback and Impact | Pikeman |
| Energy Shield | A shield that regenerates | Photon Knight |
| Heal | Heals the most hurt nearby allies | Friar, Field Surgeon, Repair Drone |
| War Drum | Nearby allies attack faster | Drum Shaman |
| Roar | Shields nearby allies every 15 s | Ursa Paladin |
| Suppress | Hits slow the target | Rifleman, Honk Ballista |
| Mark | The target takes +20% damage | Searchlight Sniper |
| Call-in | Calls a delayed shell on a distant enemy | Radio Operator |
| Breacher | Goes for the base; fights units only when blocked | Battering Ram |
| Flying | Ignores blocking; only anti-air attacks hit it | Balloon Admiral, Gyrocopter, Repair Drone |
| Bomber | Flies over and bombs below | Balloon Admiral |
| Pounce | Leaps over the front to the backline | Sabertooth |
| Riders | Extra attackers who jump off on death | Mammoth Matriarch |
| Crash | Explodes on death | Balloon Admiral |
| EMP | Strips shields and stuns machines | EMP Saboteur |
| Time Stop | Freezes nearby enemies | Chrono Titan |
| Drag | Pulls an enemy toward your gate | Grumpy Toad, Gravity Well |

**Rules for new cards.**

- At most 2 keywords per new card.
- At most 2 new keywords per season. About 25 evergreen keywords, as Hearthstone keeps about 20.
- Keyword numbers vary per card (Impact ×2 or ×1.5); type multipliers stay within ±25%.
- No keyword may hide state.
- About 1 card in 10 needs a new trigger or effect kind: about a day of sim work plus tests (architecture 3.5). The other 9 are data, art and strings.

**Season 1 keywords** (examples): Structure, Trap, Tunnel, Detector, Siegebreaker (×2 vs structures), Plunder (+gold per kill), Rally Cry (on spawn, allies nearby +20% speed for 4 s), Enrage (below 50% HP, +30% attack speed), Last Rites (on death, summon N).

### DP-26 Content roadmap: from 65 to 150+

**Seasons are content releases, not reward seasons.**

- Each is a numbered set. Nothing in it is time-limited.
- Its cards join every capsule pool; unowned cards weigh ×3 and new-card protection applies (A6.4-A6.5).
- Each season is one funded build session. None is funded today.

| Release | New collectibles | Total | Size |
|---|---|---|---|
| v1 (Checkpoint D) | 35 units, 20 turrets, 10 powers | 65 | funded |
| v1.1 | No cards. Instead: 12 doctrines, 8 battlefields, 4 weathers, 30 puzzles, about 24 emotes and quips | 65 | M-L (systems) |
| Season 1 (v1.2): "Walls and Tunnels" | 10 forts, 3 tunnelers, 3 detector turrets, 5 Mythics | 86 | L (with the keyword engine) |
| Season 2: "Sidegrades" | 10 units (2 per age, keyword sidegrades of existing roles), 5 turrets, 5 powers (a third per age) | 106 | L |
| Season 3: "The Bronze Age" (D1's sixth age) | 7 units, 4 turrets, 2 powers, 2 forts, 1 Mythic | 122 | L-XL: first needs its own decision on which formats include Bronze, since match length grows |
| Season 4: "Beasts and Machines" | 12 units (2 per age, 6 ages), 6 turrets, 6 forts, 2 Mythics | 148 | L |
| Commanders (DP-16) | 9 | 157 collectibles | L |

At one season per quarter this reaches about 150 in the first year after v1. **But:**

- four funded sessions are needed;
- variety per credit is much higher from seeds (battlefields × weather × doctrines × modifiers × modes);
- so v1.1 spends on seeds first.

**Cost per card** (estimates from the architecture report and the art spike, not measurements):

| Kind | Data and strings | Art, procedural tier (v1) | Art, 3D sprite tier (spike) | Balance |
|---|---|---|---|---|
| Common or Rare unit on an existing rig | 0.5 h with keywords | About 80 lines of SVG parts and clips, about 1 agent hour | 1-2 agent hours; 70-200 KB per sheet at 1.5x | Smoke run of 400 matches (about 1 min on 8 workers); full run of 2,000 (about 2 min) for changed cards only |
| Epic, Legendary or Mythic unit | 1 h; about 1 in 3 needs a new keyword kind (+1 day of sim work) | +signature clip and walkout pose, 3-5 agent hours | 3-6 agent hours; up to 300 KB | As above, plus has-an-answer and Bell delta |
| New rig (for example a burrower or a new flyer) | none | +half a day | +half a day | none |
| Turret or fort | 0.5 h | 0.5-1 agent hour (static rig; stays code-drawn in the sprite plan) | stays code-drawn | As above |
| Power | 1 h | 1-2 agent hours of effects | stays code-drawn | Power coverage check (A2.9) |
| Every card | EN strings now, DA strings in v1.1; zzfx sounds (minutes); portrait generated from the rig; gallery silhouette and colour tests automatic | | | Counter matrix regenerated (same and adjacent ages) |

**Per season** (about 20-26 collectibles):

- about 25-60 agent hours of art;
- about 10-15 hours of data, strings and tests;
- an economy re-run (A6.9 gates);
- a pick-rate report from bot drafts (the StS metrics lesson);
- the A15.20 "days without a new collectible" report.

**Download size.** Load sprite sheets per match roster (at most 2 × 45 cards), not for the whole pool. The first download stays bounded while the hosted pool grows by about 0.1-0.2 MB per unit card in the sprite tier.

**Growth rules.**

- Every new card is a sidegrade: it holds the vanilla line and passes ±3, Bell ≤ 5 and has-an-answer.
- New roles are rare; most new cards are keyword variants of the five roles.
- The replay-hash fix (F3, `matchHash` over the rules plus only the cards in play) must land before Season 1. Otherwise every new card invalidates every stored and shared replay.

### DP-27 Slots, sets and the album

| | |
|---|---|
| Fantasy | "My collection is a museum, and each set has pages to complete." |
| Class | Healthy |
| AI | The procedural plan generator (A7.4) draws from the growing pool under A6.8's rarity allowance; the counter matrix is regenerated each season |
| Architecture | Each card gets a permanent `num` (a dex number, never reused), a `set` and a `family`; content is split into `content/sets/<set>/<age>.ts`; data-driven slot counts through F5 (`EconomyRules.loadoutSlots`, `Command.slot: number`); a `retired` flag is used only for content fixes, and owned cards stay usable everywhere they were earned |
| Size, phase, owners | S-M · presets v1.1, the rest v1.2 · WP1, WP0, WP2, WP9, WP7 |

**Rules.**

- **Loadout per age:** 5 units, 2 turrets and 1 power in v1; plus 1 fort from Season 1.
  - A Commander per plan from DP-16.
  - Presets go from 3 to 5 in v1.1 (DP-10).
  - **No sixth unit slot:** the tray already needs about 700 of the 756 usable px on an 844 px landscape phone. Revisit only if a portrait layout (D1) or a tray test proves room.
- **Deck depth grows through the pool,** not the slots: from 11 cards per age to about 25-30 by Season 4.
- **Album.** The Museum (DP-36) and the Collection get album pages per set and per age. Unowned cards show as silhouettes. Completion is derived, so no save field is needed.
  - Completing an age (A15.16) or a set pays a banner, or a village monument from v1.2, once, into `cosmetics.owned`.
- **Deck tools** (v1.2): War Plan search, keyword, family and set filters, and the bond chip.

### DP-28 Mythic tier

| | |
|---|---|
| Fantasy | "Nobody I know has the Kraken of the Moat. I got one after weeks of battles, and it walked out in a storm of light." |
| Class | **Grey:** a random reward for players who may be minors. Safeguards: earned only; pre-rolled; odds and a pity counter on every capsule screen; a crafting path; no duplicates until all are owned; no trading, gifting or selling (red lines 1-2); no "collection value" number anywhere; no rate-up events (A15.22); honest pre-signals only (red line 7); quick reveal honoured; walkouts ≤ 10 s |
| Decisions | Plan building: a Mythic takes the Legendary role in its age, as a sidegrade with a different signature |
| Counterplay | Counts as Legendary for every limit; every Mythic must have an answer in its age |
| AI | A6.8: a bot fields a Mythic only when the player's plan for that format holds a Legendary or Mythic, and plays it at the player's level for it. The Warden keeps his Legendaries |
| Architecture | `Rarity` + `mythic` (contract). A row in every `Record<Rarity, …>` table. A capsule-level Mythic roll and pity in A6.4-A6.5; save `pity.sinceMythic` (migration). `sim:drops` chi-square and pity-boundary tests. Rarity colour tokens |
| Art | 5 walkout-grade units (a signature clip each), a Mythic flare in the reveal, a UI colour |
| Battle link | Earned from capsules, which come from battles; used in battles |
| Size, phase, owners | M + economy re-run + 5 cards of art · v1.2 (Season 1) · WP0, WP1, WP7, WP8, WP10, WP4, WP12 |

**Rules** (A6.4 and A6.5 style):

- **Pool.** One Mythic per age in Season 1 (5), then 1-2 per season. Mythics drop from Arena 3.
  - Example concepts, to be finalised in Season 1 authoring: Stone "Great Auroch Spirit" (on death, a small stampede); Medieval "Kraken of the Moat" (drags the front enemy); Gunpowder "Clockwork Leviathan" (Tunnel); Modern "Iron Zeppelin" (Flying, Call-in); Future "Singularity Seraph" (Time Stop variant).
- **Level.**
  - A Mythic has no copies and no upgrades. It plays at the level of **your highest-level Legendary of the same age** (L1 if you own none), so it is never behind, and never a shortcut past your own progress.
  - Card detail says: "Plays at the level of your Mythic's age Legendary: L7."
- **Battle rules.** Counts as Legendary: one alive or queued per side; 50% power damage and heals; the underdog rule by age; pop 14; train 7 s; cost 350.
- **Roll** (new A6.4 step 1.4, after guarantees).
  - Each capsule rolls once for a Mythic by tier:

    | Tier | Mythic chance |
    |---|---|
    | Clay | 0 |
    | Bronze | 25 bp (0.25%) |
    | Silver | 50 bp |
    | Jade | 150 bp |
    | Aeon | 500 bp |

  - Other capsules: Supply, Trophy Road and Codex capsules roll by their tier. Age Capsules roll 50 bp, from that age's Mythic. Scripted, Age Unlock and Wardrobe capsules never roll.
  - On success, the lowest-rarity non-guaranteed stack becomes a Mythic stack of 1 copy.
- **Pity** (A6.5; applied first, then Legendary, Epic and new-card protection).
  - n = capsules opened since the last Mythic, including this one, counted as A6.5 counts.
  - n ≤ 100: no bonus. 101 ≤ n ≤ 149: one stack upgrades with probability (n − 100) × 2%. **n = 150 guarantees one.**
  - Every capsule screen shows "Mythic: 37/150".
- **Picking.** Unowned first. No duplicate Mythic until every Mythic in the pool is owned; after that, each duplicate pays 1,000 Dust.
- **Crafting.** An unowned Mythic costs 4,000 Dust (A15 rule 2: every random reward has a crafting path).
- **Expected rate.** For the engaged A6.9 profile at about 6 capsules a day:
  - without pity, about 1 in 220 capsules (0.455% per bag capsule);
  - with pity, about 1 in 85 (about 2 weeks);
  - never more than 150 (about 25 days);
  - the first 5 Mythics in about 2.5 months without crafting;
  - `sim:drops` confirms these numbers.
- **Codex:** +16 points when a Mythic is unlocked.
- **Presentation.**
  - UI colour Mythic #F0386B with an iridescent sweep. In the lane, the same neutral white aura as Legendaries, for clarity (A10).
  - The card back glows Mythic for 0.3 s only when a Mythic is really there (A10 step 5). There is no teasing climb, and no "almost Mythic" effect.
  - The walkout is 10 s the first time and 3 s after, skippable.
  - The odds panel says: "Mythics can't be bought, traded or given away."
- **Skins.** D1's planned Mythic skin tier (hard pity at 40 crates) uses the same name and colour: one rarity ladder for every collectible.

### DP-29 Holo in the lane (the shiny)

| | |
|---|---|
| Fantasy | "My Holo Tuskback shimmers in battle, and my opponent sees it." |
| Class | **Grey:** a random cosmetic. Safeguards: odds unchanged and shown (A6.4 step 5: Holo 0.25% per stack); no foil pity (A15.22 rejected the Holo compass); crafting after L10 (A15.11); no value number; never in trades |
| Architecture | `SideConfig.foils?: Record<CardId, Foil>` (cosmetic; the sim ignores it and hashes skip it); `ArtProvider.createUnit` + `foil?`; one shared shimmer filter for every rig |
| Art | One shimmer filter plus a spawn sparkle, checked by the gallery silhouette and colour tests. M |
| Battle link | Seen in every match you field it |
| Size, phase, owners | M · v1.2 (v1.1 if art has room) · WP0, WP4, WP5, WP11 |

**Rules** (A5.8 amendment).

- "Foils never appear in the lane" becomes: "Only Holo appears in the lane: a holographic shimmer on the unit's non-team parts and a sparkle on spawn, visible to both sides."
- Bronze and Silver foils stay on the card frame.
- Clarity parity holds: the silhouette is unchanged, team zones are untouched, and the colour rule applies. The Lite preset shows a static holo trim instead.
- **Rarity.** About 3.1 stacks per bag capsule, so about 1 Holo in 128 capsules (about 3 weeks for the engaged profile).
- **A Holo Mythic** (0.25% of Mythic stacks) is the rarest object in the game. Crafting it after its linked level reaches L10 costs 120,000 Dust.

---

## 8. People (direction 6)

### DP-30 Codes, Echo challenges, replay links and clips (no server)

| | |
|---|---|
| Fantasy | "Fight my army. Bet you can't beat it faster than I did." |
| Class | Healthy. Opponents are labelled AI; nothing is paid for creating, sharing or redeeming; no "used n times" counter (red line 9); no name unless the player adds the auto name |
| Decisions | The friend has to solve your plan; you design a plan that is hard to solve |
| AI | "AI · Echo of Chief-4821": the Balanced brain with your plan and a style vector (7 weights and an opening, extracted by `meta/style.ts` from your last 20 `MatchStats`, which gain a few pure stats such as hold-time share, evolve times and turret and Treasury timing) |
| Architecture | A15.15 codes (`src/core/codes.ts`: bit writer, Crockford base32, CRC); `src/sim/replayCodec.ts`; F3 (`matchHash`, `ReplayDoc` v2, `SIM_VERSION` semver with same-major playback; older replays open in a versioned player build at `/ageborn/v/<major>/`); `SkirmishOptions.challenge?` |
| Size, phase, owners | M (codes and Echo) + S (replay links on F3) · v1.1 (A15.19 v1.1-4) · WP0, WP2, WP7, WP9, WP11, WP12 |

**Payloads** (architecture section 5):

| Payload | Size |
|---|---|
| War Plan code | about 66 characters |
| Echo challenge (plan, style, seed, format, battlefield, modifiers, level mode, creator's result) | about 105 characters |
| Puzzle score | about 18 characters |
| Replay link, bot-like play | about 0.5-1 K characters |
| Replay link, a very busy human | about 3 K characters |

- Poki builds use pasted text codes only. GitHub Pages builds also offer `#c=` URL fragments, which never reach the server.
- **Clips and save image:** D1 Clip Mode and A15.16. They are independent of codes.

### DP-31 Emotes and quips (APPROVED)

| | |
|---|---|
| Fantasy | "My opponent's Tempest missed; I sent the Golden Shrug. Rare, and I earned it." |
| Class | Healthy offline (bots are labelled AI and keep A7.2's limits). Grey online (contact with strangers). Safeguards below |
| Architecture | `EmoteId` becomes `string`, validated against content in commands, events and `HudModel`; the sim checks the cooldown plus a new per-match cap (`emoteMaxPerMatch`); the session checks ownership offline, the relay online; `content/emotes.ts` (id, kind `emote` or `quip`, rarity, `visualId`, `soundId`, `textKey`, `botAllowed`); save `profile.emotes?` (the equipped 6); `ArtProvider.createEmote?` |
| Art | 20-30 small animated sticker rigs at launch; quips are a speech bubble over your base. M |
| Battle link | Earned in battle, used in battle |
| Size, phase, owners | M · v1.1 (offline) · online rules with the relay · WP0, WP1, WP2, WP5, WP8, WP9, WP4, WP3 |

**Rules.**

- **Kinds.**
  - Animated emotes.
  - Quips: fixed one-liners in i18n, curated and reviewed for kindness. Playful, never insulting, never about skill, looks or age. "Is that all your ages have?" passes; anything that mocks a person does not.
  - **Never free text.**
- **Rarity:** the same ladder as cards (DP-28).
- **Sources:**
  - Trophy Road nodes, feats, Conquest stars, Heat trims, puzzle sets, set completion;
  - crafting with Dust (Common 100, Rare 300, Epic 800, Legendary 2,000);
  - the Wardrobe Crate pool may include emotes, under its visible odds and pity. Never a new random source.
- **Equip:** 6 on the Profile. The 6 v1 emotes stay free.
- **In battle.**
  - Cooldown 3 s (`emoteCooldownMs`) and at most 8 per side per match.
  - A quip bubble shows for 2 s in the top-bar area and never covers the lane band.
- **Mute.** A mute button on the opponent's nameplate for the match; Settings "Opponent emotes: On/Off" (existing `mutedEmotes`). Online: a persistent per-friend mute, and quips from strangers off by default for everyone.
- **Bots.** Each General gets 2-3 signature quips (character on the VS line's model), at most once per match; replies at most once per 20 s (A7.2).

### DP-32 Friends, friendlies, spectating and ranked (online milestone)

| | |
|---|---|
| Fantasy | "Me and my brother, a real battle, right now." |
| Class | Grey (people, possibly minors). Safeguards in DP-35 |
| Architecture | A relay in one Cloudflare Durable Object per room (free tier; check the current limits before building). It stamps commands at tick + 4 and broadcasts them; clients simulate and compare `state.hashes` every 20 ticks. A `NetService` interface is injected into `app`, never into the sim. Anonymous device-key accounts. First proves cross-browser determinism (goldens in Chromium and WebKit, B13). Verification by peer re-simulation, or a scheduled GitHub Actions job (Workers' CPU limit rules out re-simulating on the server) |
| Size, phase, owners | Relay and friendlies L; friends list, friend leaderboard and spectating M · online · a server WP, WP11, WP9, WP8 |

**Rules.**

- **Friends.**
  - Server-issued friend codes and invite links, exchanged out of band.
  - No search, and no contact from strangers.
  - A friends list, with presence only when both friends opt in (default off).
- **Friendly battles.** Unranked, no trophies, no pause or speed (D1). Emotes and quips only. A Rematch button. Doctrines, battlefields and standard-level toggles as in Skirmish.
- **Friend leaderboard.** Relative, among friends only: Daily results, puzzle stars and best Endless wave.
- **Spectating.** Friends only, 30 s delay; clients simulate from the command stream.
- **Ranked.** DP-24 rating, DP-9 levels. AI Generals fill thin queues and stay labelled AI (D1).

### DP-33 Clans, reinforcements and clan raids (clans APPROVED)

| | |
|---|---|
| Fantasy | "Our clan's reinforcements turned the battle, and together we cracked the Iron Wolves' defences." |
| Class | **Grey** (social obligation). Safeguards: no quotas, no per-member contribution display, no "last seen", **no deadlines**, preset messages only, invite codes only; leaving costs nothing; kicked members keep everything; leaders cannot see member activity |
| Decisions | Which card you lend; when to call a reinforcement (once per battle); which rival defence to attack and with which preset |
| AI | Raid defences are played by "AI · Echo of <member>" with that member's plan, style and fort layout, at standard levels |
| Architecture | One Durable Object per clan (members, clan level, lend list, raid state). Reinforcement in the sim is S: `SideConfig.reinforcement?: { card; level }` (a server-signed, single-use token) and a `reinforce` command spawning through the summon path, hashed. Raid results are submitted as replay codes (1-3 KB) and verified by peers or a scheduled Action |
| Art | Emblems from preset parts; a Clan Hall building (DP-36); a raid board screen |
| Battle link | Everything a clan does is battles |
| Size, phase, owners | XL · online, after the relay and accounts · server WP, WP2, WP9, WP7, WP8 |

**Rules.**

- **Clan.** Joined by invite code only. At most 30 members. Name from word lists; emblem from preset parts. Preset messages only ("Good luck!", "Nice win!").
- **Clan level** rises from cooperative battle goals counted clan-wide:
  - examples: "300 wins together", "100 puzzle stars", "10 Boss Battles cleared";
  - no per-member numbers are shown;
  - levels unlock emblem parts and Clan Hall stages.
- **Reinforcements.**
  - Each member may set one unit card as their standing "lend". It is never a request that pings anyone.
  - In friendlies and clan raids only (never the AI ladder, never ranked), you may call one clanmate's lend once per battle.
  - It spawns at p 20 at Standard L7 and is summoned: no pop, no bounty.
  - Lending pays nothing and no lend counts are shown.
- **Clan raids** (the owner's "clan wars", made pressure-free).
  - The server pairs clans of similar level. The raid board shows each rival member's published defence: War Plan, style and fort layout, about 100 bytes.
  - Members attack any defence any number of times. The best result per defence counts, 1-3 stars.
  - The raid ends when one clan reaches the star target or clears the board. **There is no timer and no attack quota.**
  - Everyone who attacked at least once gets the raid banner, and the clan gains level progress (the A15.17 Warband rule).

### DP-34 2v2

Co-op against AI Generals and bosses first, then 2v2 PvP. D1's design stands:

- one lane;
- a shared team base with HP ×1.6;
- 2 mounts per player;
- individual gold, XP, plans and ages;
- the team base's age is the highest on the team;
- pop 42 per player;
- emotes only;
- bots fill empty seats and are labelled AI.

It is XL, because "players" must become separate from `Side` in the sim, and it comes later. Class grey, with DP-35 safeguards.

### DP-35 Safety rules for minors (every online system)

1. No free-text chat anywhere, ever. Emotes and curated quips only.
2. No contact from strangers by default: friend codes out of band, no search, no DMs.
3. Block and report on every nameplate, the friends list and clan screens. Block also hides that player's emotes.
4. Privacy:
   - pseudonymous auto names by default;
   - no public "last seen";
   - presence only with mutual opt-in;
   - no real-world location, camera, microphone or health data (red line 10);
   - accounts are anonymous device keys.
5. No rewards for inviting, sharing or social actions (red line 9).
6. A Danish games or consumer lawyer reviews age, consent and account rules before the online milestone (A15.1).
7. Settings > For parents gains lines for each online feature as it ships.

---

## 9. Home village (direction 7)

### DP-36 Village

| | |
|---|---|
| Fantasy | "From a campfire to a spire city: my village shows everything I have achieved, and every building opens a part of the game." |
| Class | Healthy: no timers, no collecting taps, no decay, no raids that take anything, no guilt copy, no battle power (not even outside ranked) |
| Decisions | Which decorations and Wonder to show (v1.2); which fort layout to publish as your defence (online) |
| Architecture | Home (WP9) is a DOM layer of building hotspots over baked images from `ArtProvider.building?(o: { id; stage; age; skin?; size })`, which returns a cached data URL like `portrait()`. The UI never draws art, painted art can replace procedural art later, and hit areas stay accessible DOM. Idle life (smoke, flags, sparkles) is small CSS-animated layers. `meta/village.ts` `villageStages(save, content)` is pure and derives every stage from existing progress, so v1 and v1.1 need **no save field**. The big Battle button is DOM and loads first (B16: Play ≤ 3 s); the village chunk loads lazily |
| Battle link | Every building opens a battle-facing feature, the Battle button is always visible, and every stage and decoration is won in battle |
| Size, phase, owners | See the phase table · WP9, WP4, WP7, WP11, WP8 (v1.2) |

**Buildings.** There is no walking avatar. A tap opens the feature directly.

| Building | Opens | Grows with (achievements, not time served) |
|---|---|---|
| Keep (your base, at its milestone age) | Profile and the trophy shelf (A15.16) | A15.16 milestones: Stone for a new save, Medieval at Arena 3, Gunpowder with all cards owned, Modern at 27 Conquest stars, Future with every card at L10 |
| Arena Gate | Mode select. The big Battle button stays separate and always visible | Arenas 1-3, 4-6, 7-8 |
| Barracks | War Plan | Won a Short War, a Standard War, a Full War |
| Vault | Capsules; the supply wagon | First Legendary; all 5 Legendaries (later: first Mythic) |
| Forge | Upgrades (the Collection filtered to "upgrade ready") | 10 cards at L7+; 30 cards at L7+ |
| Museum | Collection, feats, album (DP-27) | Collection 50%, 100% |
| Hall of Generals | Conquest (A15.9) | Unlocked at Arena 3; 9 stars; 27 stars |
| Clan Hall (online) | Clan screens | Clan level |

- **Badges:** things ready only, per A15.13. "Open (3)" on the Vault, "Upgrade ready" on the Forge, "New" on the Museum. Never backlog counts.
- **Base cosmetics.** The equipped base skin (A5.8) and, from v1.1, your banner flying on your lane base (A15.17 "identity in the lane"). Both are cosmetic and unhashed, and opponents see them.
- **The "trickle."** No new resource. The existing Supply allowance (A15.4: +1 a day, holds 7, turned into a capsule every 3rd finished match) is drawn as a supply wagon at the Vault that fills as the allowance banks. "Supply Capsule: 2 more matches" stays the only text. This satisfies A15 rules 1 and 8 and still gives the owner the feel of a village that produces something. Owner decision O6.

**Phases.**

| Phase | Content | Size |
|---|---|---|
| v1 Phase 2b, stretch (cut first) | "Village v0": Home laid out as the village. The Keep uses the existing base visuals (A15.16's Home base, pulled into v1); the 6 other buildings have 1 stage each, drawn procedurally from the existing part library in each age palette; small idle layers; the existing Home widgets (tray, charges, War Chest, Trophy Road bar) stay as a thin DOM frame. Building Home once as a village is cheaper than building a list Home and replacing it in v1.1. If cut, v1 ships the A9 list Home and v0 moves to v1.1 | M (engineering M, art M) |
| v1.1 | 3 growth stages per building (about 18 compositions from a shared part kit); the trophy shelf in the Keep; the banner on your lane base; the supply wagon | L (mostly art) |
| v1.2 | Free placement of decorations and monuments (save `village?: { placed: { id; x; y }[] }`, a migration). Decorations come from achievements (feats, set completion, puzzle sets, boss clears, Heat trims) and Dust crafting, with no new currency. **Wonders:** 5 (one per age), each with 5 stages tied to achievement counts (for example "Sun Stones: a stage per 5 Conquest stars"), built over months with no timer. The Wonder you choose rises in your half of the battle backdrop skyline, seen by both sides and purely cosmetic | L |
| Online | The Clan Hall. Your published **defence layout**: fort pads and War Plan inside your Echo code, about 10 more bytes, which friends and clanmates attack as "AI · Echo of you" (DP-30, DP-33). Read-only visits to a friend's village | M |

---

## 10. Architecture and contract changes by phase

A15.18's rules hold:

- optional fields only;
- fakes and the save fixture are updated in the same change;
- meaning is documented in JSDoc;
- one batch per phase;
- no stubs or hooks for unbuilt systems (A15.19 step 7).

The v1 items below either fix real behaviour or add neutral data fields that Phase 3 tunes.

| Phase | Contracts and sim | Save | Content and tools |
|---|---|---|---|
| v1 Phase 2a (dev-only) | `AbilityDef` + `{ kind: 'structure'; allyPassable: true }`; own-unit movement exception; `devSpawn` wall button (the prototype is not replayable) | none | Hidden `palisade` card |
| v1 Phase 2b (with the A15.18 batch) | `ModifierEffect` in contracts, and the sim reads content (DP-11); `EconomyRules.siege.unitDamageTakenBp?`, `overdrive.unitDamageTakenBp?`, `power.chargeMaxPpm?`, all neutral (DP-3, DP-5); a minor `SIM_VERSION` bump, goldens unchanged | none | `tools/exploits.ts` proxies (DP-2); keyword glossary (DP-25); the trickle detector and strings (DP-4) |
| v1.1 | F1 `ModEffect` with scopes; `MatchConfig.battlefield?`, `ReplayDoc.battlefield?`; `evolve.pick?`; `stance.p?`; `Observation.field`, `weather`, `me.doctrineOffer`, `foe.doctrine`, `foe.holdP`; F3 `ReplayDoc` v2 with `matchHash` and the semver rule; F4 `training.scenario?`; `SkirmishOptions.challenge?` and `plan?`; `EmoteId` → string, `emoteMaxPerMatch`; `ArtProvider.building?`, `createEmote?`, `createBackdrop` + `features?`, `BackdropView.setWeather?`; `SideConfig.cosmetics?` (banner) | v2 through m[1]: presets 5, `puzzles?`, `profile.emotes?`, plus A15's v1.1 fields | `battlefields.ts`, `doctrines.ts`, `puzzles.ts`, `emotes.ts`, eval coefficients; `tools/puzzles.ts`, `tools/fitEval.ts`; `src/core/codes.ts`, `src/sim/replayCodec.ts`, `src/sim/analysis.ts` |
| v1.2 | F2 keyword triggers and traits; the layer refactor, `Tag` + `structure` and `under`, `AttackDef.hitsUnder?`, `UnitState.burrowed?`; F5 slot counts, `Command.slot: number`, `Loadout.structures?`; commands `place`, `command`; `SideConfig.commander?`, `foils?`, `mods?` (boss); `Rarity` + `mythic`; `TrainingEvent.spawn?` | v3 through m[2]: `pity.sinceMythic`, `warPlans[].commander?`, `village?`, plus A15's v1.2 fields | Sets and `num`, `keywords.ts`, `bonds.ts`, `commanders.ts`, bosses, horde waves |
| Online | `NetService` (app only); `reinforce` command, `SideConfig.reinforcement?` | Cloud save behind `SaveStore` | Server package; verification job |

---

## 11. Balance gates for the new axes

Each axis is gated separately, with mirrored seeds. They are added to `sim:balance` and `sim:exploits` as each axis ships.

| Axis | Gate |
|---|---|
| Every card, including forts, tunnelers, detectors and Mythics | Win-rate delta within ±3; Bell delta ≤ 5; has-an-answer |
| Doctrines | Each within ±5; the better pick wins by ≥ 5 |
| Battlefields | First-mover 47-53% on each; Final Bell targets (DP-2) on each; turtle ≤ 45% with ≤ 15% at the Bell on each |
| Weather | Every Final Bell and exploit target holds with weather on; no weather kind shifts a mono-role proxy by more than 10 points |
| Bonds, commanders | Each within ±3 |
| Fortifications | Wall-turtle proxy ≤ 45% with ≤ 15% at the Bell; the 4-turret turtle unchanged |
| Underground | Tunnel-rush proxy ≤ 25% |
| Mythic, Holo | `sim:drops` chi-square at p > 0.01; pity boundaries at 100, 101, 149 and 150; no-duplicate rule |
| Puzzles | Every stored solution replays to its goal; every puzzle is solved by the human-limited bot |
| Economy | A6.9 gates and A15.20 reports re-run each season |

---

## 12. Owner decisions

These need the owner's answer. The orchestrator asks in Danish.

| # | Question | Recommendation |
|---|---|---|
| O1 | 150+ cards in year one needs four funded content seasons. Accept "seeds first (v1.1), then seasons as funding allows"? | Yes |
| O2 | A visible chess-style rating: online ranked only, with trophies staying the one rank against AI (A15.9)? | Yes |
| O3 | Rotating modes: "Featured today" spotlight, with every mode always available (A15.17)? | Yes |
| O4 | Queue limits and spawn cooldowns are not added against spam; the data shows they hurt the answer more than the spam (DP-6). Agree? | Yes |
| O5 | Mythic as a real card tier that plays at your Legendary's level (DP-28), or a purely cosmetic top tier (the Snap model)? | Card tier with level link |
| O6 | Village "trickle": the existing Supply allowance drawn as a wagon, instead of a new resource on a clock (A15 rules 1 and 8)? | Yes |
| O7 | Village v0 in v1 as a stretch (cut first), or straight to v1.1? | Stretch in v1 |
| O8 | Clan wars without deadlines ("clan raids") instead of timed wars? | Yes |
| O9 | "AI · Echo of Chief-4821" instead of "ghost" in the game's text (A15.15)? | Yes |
| O10 | Merge order for v1.1, after Danish (A15.19 v1.1-1): F1 + F3 → battlefields and weather → doctrines → codes and Echo → puzzles → Review → Heat → village stages → emotes and quips → the rest of A15's v1.1 list? | Yes |

---

## 13. (a) The smallest v1 slice with the biggest gain, in priority order

Everything is S or smaller. It adds no new screen, mode or currency. If time runs short, cut from the bottom.

| # | Item | Why it is worth it | Size | Phase, owners |
|---|---|---|---|---|
| 1 | **DP-1 bot fixes**: save for a counter, evolve on time, answer one-type armies, build turrets | Turns "spam wins" (54-60%) into "spam loses" (0-3%) against tier VII. The single largest depth gain. The owner's first test must not be against a spam-vulnerable bot | S | Phase 2a · request to WP3 now |
| 2 | **DP-3 stalemate package**: neutral Siege and Overdrive lethality fields, the bot's Legendary saving-goal fix, the Legendary counter tuning and the per-card Bell report | The biggest open rule problem: 22-33% of Short Wars and 55-83% of Legendary mirrors end at the Bell | S | Phase 2b (fields, bot) · Phase 3 (values) · WP2, WP3, WP1, WP12 |
| 3 | **DP-2 A2.14 targets and `tools/exploits.ts`** | Makes "skill, not spam" and "no stalemates" CI facts that Phase 3 tunes toward | S | Phase 2b tools · Phase 3 gates · WP12, lead |
| 4 | **DP-19 wall prototype** in the dev sandbox | The owner asked to judge fortifications at the fun gate. Dev-only, no command, AI or mode | S | Phase 2a, timed to Checkpoint A · WP2 (+WP5 or WP11) |
| 5 | **DP-11 v1 fix**: the sim reads Daily modifier effects from content | A real bug (the sign drift). Without it, Phase 3 tuning of modifiers does nothing. It is also the seed of F1 | S | Phase 2b · WP0, WP2, WP1 |
| 6 | **DP-4 teach the wave**: hint, loss tip, readable bot lulls | The deepest decision in the rules becomes visible | XS | Phase 2b · WP11, WP1, WP3 |
| 7 | **DP-5 power ring overflow** as a neutral data cap | Adds a real "when" decision at almost no cost. Phase 3 switches it to 150% only if the proxy and the owner agree | S | Phase 2b field and ring · Phase 3 value · WP0, WP2, WP5 |
| 8 | **DP-25 keyword chips** in Card detail and a keyword filter | Readability now, and the vocabulary for every future card | S | Phase 2b stretch · WP1, WP9 |
| 9 | **DP-9 standard-level rule** written into DESIGN | Protects skill wherever it is measured. The Daily already does it | XS | Merge · lead |
| 10 | **Stretch, cut first:** village v0 as the Home layout (DP-36); A15.16 Daily modifier pairs pulled forward once item 5 lands (21 Daily entries instead of 6, meta and data only) | The owner's beauty and variety wishes, at the lowest honest cost | M; S | Phase 2b stretch · WP9, WP4, WP7; WP1, WP7, WP12 |

**Suggested request files** (written by the orchestrator, not here):

- `wp3-depth-answers.md` (items 1, 2 and 6)
- `wp2-depth-rules.md` (items 2, 5 and 7)
- `wp2-wall-prototype.md` (item 4)
- `wp0-depth-contracts.md` (fields for items 2, 5 and 7)
- `wp12-depth-proxies.md` (item 3)
- `wp11-depth-hints.md` (item 6)
- `wp1-depth-content.md` (items 6 and 8)
- `wp9-keyword-chips.md` (item 8)
- `wp5-power-overflow-ring.md` (item 7)

---

## 14. (b) What to decide at the Checkpoint A fun gate

The owner plays the battle slice; the orchestrator gives exact steps in Danish. Each question has a test and the consequence of each answer.

| # | Question | How the owner tests it | If yes | If no |
|---|---|---|---|---|
| A1 | Does the core battle feel good? (C3) | 5 Short Wars against tier III and V | Continue to Phase 2b | Tune feel and rules before more meta (C3) |
| A2 | Does trading beat spamming? | 2 matches pressing only the cheapest unit, then 2 matches reacting to what the bot sends | DP-1 is confirmed | WP3 fixes first; gate spam at ≤ 20% before Phase 2b ends |
| A3 | Does banking gold and sending a wave feel like a real choice? | 1 match saving to about 400 gold before each push | Keep the DP-4 hint as planned | Make the hint more prominent; consider a gold-bank marker on the tray |
| A4 | Did any match stall to the Final Bell? Did Siege feel decisive? | Note Bell endings in the owner's matches; the orchestrator adds `sim:exploits` numbers | Phase 3 tunes DP-3's value | Raise the DP-3 start value; add the Overdrive knob |
| A5 | Power at 100% or with overflow to 150%? | Dev toggle: 2 matches each | Phase 3 sets 150% if the proxy agrees | Keep 100%; drop the power-timing gate |
| A6 | Walls: fun, or turtle-y and dull? Fixed pads or free placement? | Sandbox: place walls for both sides; fight a Tuskback push into a palisade with Pebblers behind it | Fortifications go into v1.2 (DP-19) | Park fortifications; the underground layer still ships, with detectors only |
| A7 | Is evolving still the best moment? Would a doctrine pick on the button add to it? | A dev mock of the split Evolve button with two doctrine names (no rules), used during real evolves | Doctrines in v1.1 at every evolve | Doctrines at 2 evolves per match only, or a pre-match doctrine |
| A8 | Does one lane feel deep, or like "one blob pushing"? | The owner's general impression, recorded for the Checkpoint B trigger (DP-18) | Keep one lane | Start the revisit clock (DP-18) |
| A9 | Is the phone tray comfortable? Is there room for one more button (Fort)? | Play on the owner's phone in landscape | The Fort button goes on the stance area (1.2) | Forts are placed from a long-press on the lane instead of a tray button |
| A10 | Is the art good enough, or should the 3D sprite tier (spike report) come before card growth? | Compare the procedural units with the spike's GIFs and review sheets | Stay procedural; per-card cost as DP-26 column 3 | Plan the atlas tier (about one WP) before Season 1; per-card cost as column 4 |
| A11 | Is Short War (about 4.5 minutes) the right "blitz" length? | 3 Short Wars | Blitz preset as specified | Tune Short War's clock in Phase 3 (numbers only) |

---

## Appendix A. Rejected or deferred ideas

| Idea | Source | Why not (or not yet) | Instead |
|---|---|---|---|
| Per-card recharge on units, queue caps, an evolve price, a longer Ascension | Owner direction 3; benchmarks idea 7 | Audit V2, V3 and V9 | Trades, DP-1, DP-5, doctrines |
| A sixth tray slot | Owner direction 2 | Phone tray width; the Clash Royale 2026 slot cut | Fort slot, commander, presets |
| Hidden traps, night, fog of war | Owner direction 4 | A7.1 same information; the per-side view system is L | Visible traps and telegraphs |
| A resource trickle on a clock | Owner direction 7 | A15 rules 1 and 8 | The supply wagon (existing bank) |
| Timed clan wars with daily attacks | Clash of Clans | Obligation and deadline pressure for minors (red lines 11-12) | Clan raids with no timer |
| Rewards for donating reinforcements | Clash of Clans | Farming and pressure; social rewards | Lending pays nothing |
| Ranked at players' own max levels | Clash Royale L16 Ranked | Levels beat skill | Standard L8 (DP-9) |
| A curated rotating format | Hearthstone Twist | Cost; cancelled in 2026 | Seeded rotation (DP-17) |
| Offline monthly seasons with rewards | A15.22 | Time-boxed rewards | Content seasons that never expire |
| Holo odds boosts or a foil pity | A15.22 | Changes the exact roll; time-limited boosts | Holo crafting (A15.11) |
| Direct unit control | Stick War | Click speed | Hold line, doctrines |
| A formation toggle | Owner direction 5 | Another button that is more clicking than deciding | Loose Order and Shieldwall doctrines; the bridge |
| Hero units in the lane at launch | Owner direction 1 | Largest art cost | Commanders without a lane hero first |
| Two lanes in v1 | Owner direction 5 | Decided against with the owner | DP-18 trigger and experiment |
| Stake or bet verbs (Snap cubes) | Benchmarks | Grey for minors | Heat (A15.14) |
| In-session double-point streaks | lichess Arena | Rewards "one more" | none |
