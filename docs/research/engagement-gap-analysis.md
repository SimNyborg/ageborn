# Engagement gap analysis: what the Ageborn design already does, where it runs out, and what is grey

Research report, 2026-09-27. It answers the owner's request that Ageborn use everything that absorbs people in games: competition, rare collectibles, the joy of random rewards, treasure hunting (the Pokémon GO pull), whatever makes TikTok gripping, and the Clash of Clans / Hay Day feeling of improving for years without getting bored.

This report is the **gap analysis**. Two sibling reports were written in parallel today, and this one does not repeat them:

- `engagement-psychology.md`: the levers, the evidence and the DK/EU rules. Its ideas are cited here as **Psy-A** to **Psy-K**, and its audit rows as **Psy-audit #n**.
- `engagement-benchmarks.md`: what Clash of Clans, Hay Day, Pokémon GO, TikTok and others do. Its proposals are cited as **E1** to **E21**.

Earlier reports (`meta-collection.md`, `feel-ux.md`, `genre-peers.md`, `market-portals.md`) and `docs/design-history/` are used where relevant. Section numbers such as A6.3 refer to `docs/DESIGN.md` v1.1. New proposals made in this report are numbered **N1** to **N15**.

**Method.**
1. Every engagement mechanic in DESIGN A1-A12, A2.10-A2.13, D1 and D2 is listed with its lever, time scale, strength and horizon (section 2).
2. The horizon of each progression track is computed from the DESIGN numbers (A6.3-A6.9). A small Monte Carlo of the A6.4 roll algorithm adds the dates DESIGN does not state: when every card is owned, when the foil sets complete, and how much Dust arrives after the collection is maxed. The assumptions are in section 9.
3. The gaps are then analysed along the seven dimensions in the brief (section 4), plus cross-cutting design issues (section 5) and a grey and red-line audit (section 6).

---

## 0. Key findings

1. **The design is excellent from seconds to about week 6, and thin after that.** Every lever rated 5 of 5 in the inventory sits at the moment, match or session scale: the tap-to-spawn response, the evolve show, the decision every 5-10 s, the capsule reveal and the first-time Legendary walkout. At the week, season and year scales nothing rates above 3. There is exactly one weekly mechanic (a "Win 15" quest) and no monthly or seasonal layer at all.
2. **There are three cliffs, not one.**
   - **Novelty cliff, around weeks 6-8.** By then an engaged player has seen almost everything: all 55 cards are owned by about day 9-21, all 5 first-time Legendary walkouts and all 10 Epic mini-walkouts are done by about week 2, all 6 daily modifiers by about week 2, all alternate powers by day 3, and all Generals and arenas their skill allows by month 2.
   - **Progression cliff, around months 5-6.** Seven tracks end within about six weeks of each other: card levels, Codex Level, the last Amber sink, the value of quest rewards, the value of capsule copies, the Clay meter and the Dust sink.
   - **Mastery ceiling.** AI tier X and The Warden at L9 are the hardest things in the game. Nothing gets harder after that.
3. **After month 6, every reward pays in a currency with no use.** An engaged player earns about 1,700 Amber and about 1,200 Dust a day (model) with nothing to spend them on once the 11 crate skins are crafted. This is worse than "no new content": the capsule opening, the game's signature variable reward, turns into a Dust counter.
4. **Foils are the only open collection after month 6, and the math makes them unreachable.** With no pity and no crafting path, the model gives a Bronze-or-better foil on every card at about 15 months, Silver-or-better at about 4-5 years, and Holo on every card at more than 10 years. `engagement-psychology.md` calls foils healthy because completion is "reachable". At these rates it is not. The fix is E21 (foil crafting with Dust) with pricing (N2): it also solves finding 3.
5. **Treasure hunting and discovery are nearly absent.** Pillar 4 has been applied to content as well as to odds. Everything is visible from day 1: all 55 silhouettes, every Trophy Road node, the full Conquest board. There is no lore, no hidden item and no space to explore. The rule should be **hide content, never odds**.
6. **Competition is weakly signalled.** Hidden MMR aims every player at a 60% win rate, so trophies inside an arena band measure matches played more than skill; the real skill number is hidden. The one thing all players share on a day (the Daily Challenge modifier) is not comparable, because opponents, levels and pause use differ. Trophies stop meaning anything at 4,000, and there are no seasons.
7. **v1 has no sharing surface at all.** Clip Mode was moved to v1.1, although `market-portals.md` recommended building it "from day one". The portal launch window, when new games get their initial boost, passes with nothing to share. Worse, every balance patch makes all saved replays unplayable (the `contentHash` rule, B3), and the replay ring keeps only the last 20 matches, so the player's best comeback is gone within a few sessions.
8. **Session design is strong at the start and has no end.** Start time is best in class (3 s, a live title screen, no menus). But the natural stopping point already exists and is silent: once charges run out, the value of a win drops by about 88% (copies) and 76% (Amber). Also missing: resuming a match after the browser tab is killed (common on phones), a unit of play shorter than about 4.5 minutes, and portrait play.
9. **One structural reward bug pushes players away from the signature content.** A2.10 pays the same trophies and rewards in every format, so Short War (median 4:30, Stone to Gunpowder) earns about 55% more per minute than Full War (median 7:00, the only format with the Future Age). Players will, in Soren Johnson's phrase, "optimize the fun out" of the game by never playing to the Future Age on the ladder [K1].
10. **Grey and red audit.** The DESIGN has **no red line**. Eight items are grey and need a fix or a guardrail before a public launch:
    - Wardrobe reel on by default (CS-case imagery)
    - tap strikes that suggest control over a pre-rolled result
    - scripted starter capsules that are not labelled
    - the undisclosed new-player bot boost
    - the only unbanked daily reward (Daily Challenge)
    - weekly quest reset rules that are not specified
    - an unreachable foil chase
    - no stopping cue or play-time tools

    Two sibling proposals should be tightened: E11 (a 2× foil-odds weekend) and E12 (6-hour time windows). Psy-K's bank of 28 charges trades appointment pressure for binge pressure.
11. **The build capacity itself is a horizon.** The cloud credit that builds Ageborn expires on 2026-11-05 (`PROGRESS.md`). Any "years" plan that needs monthly content work is fragile. The renewable engines (a date-seeded calendar, puzzles mined from the headless sim, Heat ladders and crafting sinks) should be built into v1.1 as code plus data that runs for 12-24 months without new builds (N6, N7).

**What the owner asked for, and where it stands:**

| Owner's wish | v1 status | Main gap | Closed by |
|---|---|---|---|
| Competition | AI ladder, arenas, Conquest, Warden: strong for about 2 months | No human comparison, trophies measure hours, no seasons, AI ceiling | N5, N10, E4, E5, Psy-D / E8, E7; later PvP |
| Collecting rare things | 55 cards, 12 skins, foils: strong for about 3 weeks (new cards) and about 6 months (levels) | Foil chase unreachable; currencies without sinks | N2 (E21), E6, E13, N13 |
| Joy of random rewards | Capsules are best in class and honest | Payoff collapses after month 6 | N2; relic pools in E12 |
| Treasure hunting | Almost none | No space, no hidden content, no shared discoveries | E12 / Psy-A (tightened), N6, N13, E14 |
| TikTok grip | Instant start, short matches | No sharing, no sub-2-minute unit, no stopping cue | N4, N6, N12, E1, E4, Clip Mode |
| Clash of Clans / Hay Day "for years" | Parallel medium goals until month 5 | No growing place, no yearly step, no group | Psy-F (Hall of Ages), N7, E7, D1 new ages |

---

## 1. How items are rated

**Class.** This report reuses the siblings' tests (benchmarks section 1, T1-T5; psychology section 1.3) rather than inventing new ones:

- **Healthy (H):** it works when fully explained, stopping costs nothing, and it is fine for a 10-year-old.
- **Grey (G):** allowed only with named guardrails.
- **Red (R):** deceives, punishes absence, pressures through scarcity or social obligation, or conflicts with DK/EU direction.

**Strength (1-5):** how much the mechanic makes an engaged player want to play, judged against genre peers.

| Score | Meaning |
|---|---|
| 5 | A signature driver: players would name it as why they play |
| 4 | Strong, felt every session |
| 3 | A solid supporting loop |
| 2 | Present but background |
| 1 | Nominal |

**Horizon:** how long the mechanic keeps pulling for an engaged player, as profiled in A6.9 (about 6.7 ladder matches a day, 4 charged wins, the Daily Capsule, 3 quests).

---

## 2. Inventory: every engagement mechanic already designed

### 2.1 Moment (seconds)

| # | Mechanic | Ref | Lever | Str. | Horizon | Class |
|---|---|---|---|---|---|---|
| M1 | Tap a card and a warrior walks out: one input, instant visible result | A2.12, A8 | Agency and competence (SDT); immediate feedback | 5 | Unlimited | H |
| M2 | Juice scaled by importance: hitstop, trauma shake, sparks, death fling, coins flying to the counter, `coin_gain` pitch rising on multi-kills | A12, A13 | Sensory reward; small prediction errors inside play | 4 | Unlimited (importance scaling limits fatigue) | H |
| M3 | Effective and resisted sparks | A12 | Informational feedback; learning the counter triangle | 3 | Teaches for weeks, then confirms | H |
| M4 | Evolve show: steady glow, freeze, light pillar, base morph, 2 Vanguard units, tray flip, music up +2/+2/+1/+1 semitones | A2.4, A12, A13, Pillar 2 | Anticipation, then payoff; escalation; progress inside the match | 5 | Unlimited. The spectacle of each age fades after about 20 matches; the power spike does not | H |
| M5 | Age Power: charge ring, telegraph, global impact freeze | A2.9, A12 | Anticipation, agency, spectacle | 4 | Unlimited | H |
| M6 | Last Stand: horn icon, 1 s charge, volley, knockback | A2.11 | Hope, drama, comeback | 4 (rare) | Unlimited | H |
| M7 | Legendary on the field (white aura), Legendary death freeze | A12 | Status, spectacle | 3 | Unlimited | H |
| M8 | 6 emotes; the AI replies only with GG, Salute or Thumbs up | A5.8, A7.2 | Expression; faint relatedness | 1 | Weak against AI | H |

### 2.2 Match (minutes)

| # | Mechanic | Ref | Lever | Str. | Horizon | Class |
|---|---|---|---|---|---|---|
| G1 | A decision every 5-10 s (unit, save or spend, turret, evolve, power, stance, Treasury) | Pillar 3, A2 | Flow, competence, autonomy | 5 | Until the mastery ceiling (4.1) | H |
| G2 | Tug-of-war swings; visible comeback tools (XP from own losses, underdog bounty, defender's advantage, Last Stand); no hidden rubber-banding | A2.11 | Close outcomes, which players rate most enjoyable (Psy finding 2) | 4 | Unlimited | H |
| G3 | Clock phases (Overdrive, Siege, Final Bell) with music layers | A2.10, A13 | Escalation, decisive ending, peak-end | 4 | Unlimited | H |
| G4 | Split-age lane: each side's backdrop and skyline follow its age | A1, A11 | Visible in-match progress and comparison | 3 | Unlimited | H |
| G5 | AI Generals: personalities, VS lines, seeded openings, readable intent (saving lulls, holds) | A7.2-A7.4 | Novelty, character, reading an opponent | 3 | Named Generals learned in 1-2 months. Procedural commanders reuse the same personality set, so they feel alike (the "10,000 bowls of oatmeal" problem [K2]) | H |
| G6 | Scouted list of the opponent's cards | A3 | Information discovery | 2 | Unlimited | H |
| G7 | Hidden MMR aiming at 60% wins (65% in the first 20 matches); warm-up after 3 losses; trophy floors at arena gates | A6.3, A6.8 | Competence, flow, loss softening | 5 | Until tier X | H. The new-player boost is grey (section 6) |
| G8 | Format choice (Short, Standard, Full) from Arena 2 | A2.10 | Autonomy, session fit | 3 | Unlimited, but equal rewards make Short dominant (5.1) | H |
| G9 | Result screen: rewards staged one by one, recap, MVP card, Watch replay | A9 #7 | Peak-end, informational feedback | 4 | Until the rewards lose value (months 5-6) | H |
| G10 | The Warden: disclosed boss with all five Legendaries at L9, 1 in 5 Arena 8 matches | A7.4 | Challenge, spectacle | 4 | Until beaten reliably | H |

### 2.3 Session (15-45 minutes)

| # | Mechanic | Ref | Lever | Str. | Horizon | Class |
|---|---|---|---|---|---|---|
| S1 | Capsule opening: pre-rolled, 4-strike back-loaded climb, rarity pre-signal, NEW stamp, foil shine, summary | A6.4, A10 | Variable reward, anticipation, honest pre-signal | 5 | Peak until week 2-3 (new cards); solid until months 5-6 (copies matter); weak after (Dust) | G (free and disclosed; see section 6 for the taps) |
| S2 | First-time Legendary walkout (8-10 s) | A10 step 6 | Peak moment | 5 | Only 5 ever. The first is scripted at about 40 minutes; all 5 by about week 2. Later ones are 3 s duplicates | H |
| S3 | NEW Epic mini-walkout (2 s) | A10 step 5 | Peak | 4 | 10 ever, by about week 2 | H |
| S4 | Upgrade: hammer slam, level count-up, stat bars, Codex points; choosing where Amber goes | A6.6 | Competence, visible growth, allocation choice | 4 | Months 5-6 | H |
| S5 | Copies bars ("3/4", then an "UPGRADE READY" bounce) | A10 step 7 | Goal gradient, resumption urge | 4 | Months 5-6 | H |
| S6 | Clay meter: 3 pips from uncharged wins, losses and draws make a Clay capsule; no cap | A6.3 | Loss softening, goal gradient | 3 | Months 5-6 | H |
| S7 | Capsule tray on Home ("Open (3)", "Open all") | A9 #2 | Resumption, autonomy | 3 | Months 5-6 | H |
| S8 | Trophy tick and Trophy Road bar showing the next reward | A6.3 | Goal gradient, endowed progress | 4 | About 2 months for a strong player, then the road ends; others stop at their arena wall | H |
| S9 | Quest progress on the result screen | A6.7 | Goal gradient | 3 | Months 5-6 (Amber loses value) | H |
| S10 | War Plan: presets, auto-fill, advisor, Equip now, skin picker | A3, A9 #9 | Autonomy, IKEA effect, strategic expression | 4 | Strong while cards and levels arrive | H |
| S11 | "Next battle" and the next-opponent preview on Home | A9 | Low friction, curiosity | 3 | Unlimited | G (no stopping cue; 4.7) |
| S12 | Speed 1x/1.5x/2x and pause in every v1 mode | A2.12 | Autonomy, control of session length | 3 | Unlimited | H |

### 2.4 Day

| # | Mechanic | Ref | Lever | Str. | Horizon | Class |
|---|---|---|---|---|---|---|
| D1 | Capsule charges: +1 per 6 h, bank 12; 12 at start; first 10 capsules free | A6.3 | Banked appointment; pacing | 4 | Months 5-6 | G (healthy form) |
| D2 | Daily Capsule, bank 3 | A6.3 | Banked appointment; variable reward | 3 | Months 5-6 | G (healthy form) |
| D3 | Daily quests: 3 a day, bank 6, 1 reroll, many skill and variety goals | A6.7 | Goals, variety, autonomy | 3 | Months 5-6 (13 of 15 pay Amber) | H |
| D4 | Daily Challenge: one symmetric modifier a day (6 in total), first win gives an Age Capsule | A9.1 | Novelty, appointment | 3 | Modifier novelty about 2 weeks; reward until months 5-6 | G (not banked) |

### 2.5 Week, season, month

| # | Mechanic | Ref | Lever | Str. | Horizon | Class |
|---|---|---|---|---|---|---|
| W1 | Weekly quest: "Win 15 battles" gives a Wardrobe Crate and an Age Capsule | A6.7 | Goal gradient, cosmetic variable reward | 2 | Until all skins are owned (months 6-7) | G (reset rule not specified) |
| none | Seasons, events, rotating modes, calendars | none in v1 (D1 v1.2 has "weekly events") | | 0 | | |

Arena progression works as a one-time "season" in months 1-3, but it never resets.

### 2.6 Months

| # | Mechanic | Ref | Lever | Str. | Horizon | Class |
|---|---|---|---|---|---|---|
| L1 | Collection of 55 cards: silhouettes for unowned cards, unowned weighted ×3, new-card protection | A3, A6.4, A9 #10 | Collection, curiosity | 4 | All owned by about day 9-12 (engaged) or about day 21 (casual; model) | H |
| L2 | Card levels L1-L10, fixed cap, level trim on the ground ring | A6.6 | Competence, investment, visible power | 5 | Months 5-6 | H |
| L3 | Codex Level (about 81): 100 Amber a level, a capsule or crate every 5, 8 frames | A6.7 | Endowed progress | 4 | Months 5-6 (it only counts upgrades) | H |
| L4 | Arenas 1-8: ground and weather layer, banner, gate rewards | A6.3 | Status, milestones, place novelty | 4 | About 2 months, or the player's skill wall | H |
| L5 | Trophy Road: 60 nodes, alternate powers at 100-500 trophies | A6.3 | Goal gradient | 4 | About 2 months; the 5 powers by day 3 | H |
| L6 | Conquest: 9 Generals × 3 stars, milestones, Conqueror title | A6.10 | Mastery, completion, character | 4 | Weeks to months (skill) | H |
| L7 | 13 titles, 8 frames, 8 banners | A5.8 | Identity, achievement | 2 | Months | H |
| L8 | 12 skins: Wardrobe Crate reel, crate pity, Aeon 30% skin chance | A5.8, A6.4, A10.1 | Identity, collection, variable reward | 3 | Months 6-7 (with Dust) | G (reel) |
| L9 | Dust crafting of copies and skins | A6.6 | Autonomy, bad-luck protection | 3 | Until all skins are crafted (about 2 weeks after the collection maxes) | H |
| L10 | Profile stats, fastest win, last 20 replays | A6.1 | Self-comparison | 2 | Thin | H |
| L11 | Skirmish: any General, any tier, Echo of You, Standard levels toggle | A9 #3 | Practice, self-competition | 2 | Unlimited, but it pays only 5 Amber a win | H |

### 2.7 Year and beyond

| # | Mechanic | Ref | Lever | Str. | Horizon | Class |
|---|---|---|---|---|---|---|
| Y1 | Foils (Bronze 4%, Silver 1%, Holo 0.25% per stack) | A5.8, A6.4 | Rare-variant ("shiny") hunt, status in the tray | 3 | Bronze set about 15 months; Silver about 4-5 years; Holo more than 10 years (model) | G (section 6) |
| Y2 | Tier X ladder and The Warden | A7.3, A7.4 | Mastery | 3 | Until beaten consistently | H |
| Y3 | D1 content waves (sixth age, extra cards, Chronicle, Endless Horde, events) | D1 | Novelty | n/a | Not scheduled; depends on build capacity (5.6) | n/a |

**Reading the inventory.** The 5-rated levers (M1, M4, G1, G7, S1, S2, L2) cover seconds to months. Every lever that renews itself (G1-G3, M1-M6) lives inside a match. Everything outside a match is a finite track, and the tracks end together (section 3).

---

## 3. The horizon map

### 3.1 Timeline for an engaged player (A6.9 profile)

| When | What happens or ends | Source |
|---|---|---|
| Minute 3 | Future Age reached in tutorial match 1 | A8 |
| About 40 min | Scripted Matriarch walkout (capsule 5) | A6.5 |
| Days 1-3 | Arena 3 (Conquest, Full War); all 5 alternate powers (100-500 trophies) | A6.3; about 20 matches at +19.5 trophies each below 400 |
| About 2 weeks | All 6 daily modifiers seen (expected 14.7 days if the day's modifier is drawn uniformly) | A9.1 |
| Days 9-21 | All 55 cards owned; the last NEW stamp, the last Epic mini-walkout, the last first-time Legendary walkout | Model; A6.9 says Legendaries in about 2 weeks |
| About 4 weeks | "Veteran" (100 wins) | A5.8 |
| About 6 weeks | A focused War Plan at L7 | A6.9 |
| About 2 months | Arena 8 at 3,400 and the Trophy Road end at 4,000, for players who beat tier VIII+ (about 300 matches at +10 each above 400). Others meet their wall at Arena 5-7, where the arena's minimum bot tier exceeds their skill | A6.3, A6.8 |
| About 3 months | Epics maxed | A6.9 |
| Months 4.5-5.5 | Commons, Rares and Legendaries maxed; Codex Level about 81; last frame | A6.7, A6.9 |
| Months 5-6 | Amber's only sink closes (273,350 total). From here every daily quest, every match and every capsule pays Amber or Dust | A6.9 |
| About 2 weeks later | Dust buys the remaining crate skins (about 13,000 Dust at about 1,200 a day), then Dust has no sink either | A6.6; model |
| About 15 months | A Bronze-or-better foil on every card | Model |
| About 4-5 years | Silver-or-better on every card (a long tail passes 10 years) | Model |
| More than 10 years | Holo on every card (about 50 of 55 after 10 years) | Model |

A casual player (about 3 matches a day) moves roughly half as fast: every card owned by about day 21, the collection maxed at about 12 months, the Bronze foil set at about 2.5 years.

### 3.2 The three cliffs

| Cliff | When | What is gone | Main evidence of harm |
|---|---|---|---|
| **Novelty** | Weeks 6-8 | New cards, walkouts, powers, modifiers, Generals and arenas within the player's skill | Pokémon GO's step gains faded by week 6 (Psy 4.1); Fall Guys and Brawl Stars stagnation (benchmarks section 4) |
| **Progression** | Months 5-6 | Levels, Codex, Amber value, quest value, capsule value, Clay meter value, then Dust value | CoC's lesson that one giant goal burns players out; parallel medium goals keep them (benchmarks section 4). Here the parallel goals all finish together |
| **Mastery ceiling** | When tier X / The Warden is beaten | Any harder opponent. Bots cannot exceed tier X by design (A7.3: 3% mistake rate, 300 ms reaction floor) | Chess-style engagement needs an uncapped rating; an AI ladder has a cap |

### 3.3 Currencies after the progression cliff

| Currency | Daily income after max (engaged) | Sink after max |
|---|---|---|
| Amber | About 1,700 (A6.9) | None |
| Copies | About 48 | Auto-convert to Dust |
| Dust | About 1,200 (model; an upper bound) | 11 crate skins (13,000 total), then none |
| Trophies | +10 per match | None past 4,000 |
| Codex points | 0 (nothing left to upgrade) | None |

**Consequence.** From month 6 the capsule, the result screen and the quest board all pay in currencies that buy nothing. Variable reward only works while the reward has value. This is the single most important structural gap, because it turns the game's best lever (S1) into a visible counter of pointlessness.

---

## 4. Gaps by dimension

### 4.1 Long-term progression: after 3 months, after a year, and the endgame

**After 3 months** the player is still well served. Cards go from L7 to L10, some Conquest stars remain, the arena wall is a real goal, and foils trickle in. The three-month problem is **novelty**, not progression.

**After 6 months** every number is done (3.3). **After a year** only foils, the Daily Challenge (6 modifiers, rewards without value) and self-set goals remain. **There is no endgame.** DESIGN's stated answer is "the game grows sideways" (A6.6), but the D1 waves have no dates and depend on build capacity (5.6).

**Clash of Clans / Hay Day "improve for years", taken apart:**

| Ingredient | CoC / Hay Day | Ageborn v1 |
|---|---|---|
| Many parallel medium goals | Yes, for years | Yes, until month 5; then all end together |
| A place that visibly grows with your effort | Village, farm | **No.** Home is a menu, and nothing on the battlefield shows accumulated effort except level trims |
| A new top step at a regular rhythm | A Town Hall every November (benchmarks finding 1) | **No** (the L10 cap is correct; new ages are unscheduled) |
| A group | Clans, neighbourhoods | **No** (v1 offline) |
| Timers with paid skips | Yes | Correctly rejected (Psy 4.3) |

**Already proposed by the siblings:**
- mastery ladders: E7 Chrono Heat, Psy-G Conquest+
- card feats: E6 Card Records, Psy-E mastery badges
- seasons: Psy-D, E8
- a place to decorate: Psy-F Hall of Ages
- veteran cosmetics: E21
- people: later PvP and clans

These are the right engines. What this report adds:

1. **Design the sinks before month 5, with numbers (N2).** Two sinks absorb the surplus:
   - **Dust buys foils (E21), priced to last about 1.5-2 years.** Starting prices: Bronze foil 500 / 1,000 / 3,000 / 8,000 Dust for Common / Rare / Epic / Legendary, Silver ×4, Holo ×10.
     - At about 1,200 Dust a day, the Bronze set costs about 80 days and the Silver set about 11 months.
     - Holo stays mostly luck, with a visible **Holo compass**: every 200 stacks without a new Holo guarantee one on a card that lacks it. Worst case, all 55 Holos arrive in about 20 months.
     - Everything becomes reachable, and the collection horizon moves from "never" to about year 2.
   - **Amber buys star levels (D1 v1.2; move to v1.1).** These are cosmetic prestige for L10 cards: for example 3 stars at 2,000 / 5,000 / 10,000 Amber. That is about 935,000 Amber for all 55 cards, or about 18 months of surplus.
   - Both sinks are finite, visible, cosmetic and earned: healthy.
2. **Make the horizon a tested number (N1).** B12 already requires a 365-day economy sim. Extend it into a horizon report for WP12 tools:
   - the end date of each track
   - the daily balance growth of each currency after day 180
   - the distribution of "days since the last new item"
   - foil completion dates

   Suggested gates:
   - no more than 3 tracks end in the same 30-day window
   - every currency has a sink on day 365
   - an engaged player never goes more than 21 days without a new collectible
3. **Make "harder" uncapped without smarter bots.** Tier X is a hard ceiling (A7.3). The only uncapped challenges are rules and handicaps:
   - Heat (E7), which reuses the A9.1 modifiers
   - player-chosen handicaps recorded as feats: "win at Plan Lv 1", "no turrets", "Stone-only units"
   - human comparison (4.3)

   Heat modifiers must stay symmetric or apply to the player only, so A7.1 holds.

### 4.2 Treasure hunting, exploration and discovery

**Exists:**
- capsule contents
- unowned-card silhouettes
- the Scouted list
- foils (the shiny layer)
- the next-opponent preview
- eight named places (Tar Pits … Chrono Rift) that only change the ground layer

**Gaps:**
- **No space to search.** The arenas are a linear road, not a world.
- **Nothing is hidden.** All 55 silhouettes, all Trophy Road nodes and all Generals are visible from the start. DESIGN contains no lore text at all.
- **No shared discovery.** The only date seed is the daily modifier, so there is nothing for a community to map together, which is Pokémon GO's nest-mapping pull (benchmarks finding 5).
- **No surprise inside battles.** This is deliberate: readable chaos, Pillar 5.

**Principle: hide content, never odds.** Pillar 4 is about probabilities, pity and bots. It does not require showing every collectible in advance. Pokémon's "???" dex entries, Vampire Survivors' secrets and Old School RuneScape's Collection Log [K3] all hide *what* exists while being honest about *how* to get it.

**Already proposed:**
- expedition maps: E12 Rift Expedition, Psy-A
- museum sets: E13
- secrets: E14
- rare sightings in battle: Psy-J

**Assessment:**
- **E12 is the right headline, but drop its 6-hour local-time windows.** They add an appointment axis ("come back this evening for the night pool"). That is exactly the kind of time pressure the KIDS Act proposal and the CPC principles target for minors (Psy section 2). Keep the other two axes, place (arena) and weather (the day's modifier), plus the shared date seed. That preserves "everyone has the same map today" without clock pressure. Psy-A's "nothing is timed" rule is the better default.
- **Psy-J (a neutral relic beast in battle) is risky for Pillar 5 and A2.14.** It adds lane clutter and outcome variance. Keep it out of the ladder until the headless matrix shows no effect on win rates. Its natural home is Expedition or Chronicle battles.
- **New: anachronism feats (N13).** This is a hidden list of about 30 cross-age feats, shown as "???" with a one-line riddle. Examples: "A Bonker lands the killing blow on a Future unit"; "a Mammoth tramples a tank". Rewards are a lore page, a title or an emote.
  - They are detected from the `SimEvent` stream (killer age vs victim age), so no sim change is needed.
  - They turn the genre's funniest clip moment ("caveman beats tank", `market-portals.md` section 9) into a discovery hunt.
  - This is where D1's "about 20 achievements" should go.
- **New: Clutch Puzzles (N6)** are discovery with a TikTok-sized session (4.7).

### 4.3 Competition and social comparison while v1 is offline

**Exists:**
- trophies and arenas against AI
- the AI tier shown on the VS screen
- wins and losses by tier on the profile
- Conquest stars
- skill titles: Speedrunner, Last Stander, Warden's Bane, Ageborn
- fastest win
- Echo of You

**Gaps:**
1. **The displayed rank measures volume.** MMR keeps the expected win rate at 60% inside an arena band, so trophies grow at about +10 per match whatever the skill. Skill shows only at arena walls. The critique-player review (#10) raised this, and Conquest answered it only partly. The honest skill number (the tier you face) is buried on the VS screen.
2. **No comparison with any other human.** v1 has no network, by design.
3. **The one shared daily thing is not comparable.** A9.1 seeds only the modifier. The opponent, both sides' levels, the arena and use of pause all differ between players.
4. **Ceiling and no fresh start:** tier X, a road that ends at 4,000, and no seasons.

**Already proposed:**
- seasons: Psy-D, E8
- a Wordle-style share line: E4, Psy-C
- friend War Plan ghosts: E5, Psy-B
- Nemesis: E10
- Heat: E7
- AI Rival League: E18, grey

**What this report adds:**
- **N5: a shared-seed Daily Challenge at Standard levels.** Seed the opponent (General or commander profile and War Plan) and the arena from the date, as well as the modifier, and play at the existing "Standard levels" toggle (L7 on both sides, A6.8).
  - Every player on Earth then faces the same fair puzzle that day with no server. This is the Spelunky Daily Challenge and Slay the Spire Daily Climb pattern [K4], moved offline and made shareable through E4.
  - Record pause count and speed in the replay metadata. The share line should say "no pauses", because pause is allowed in all v1 modes (A2.12) and would otherwise make comparisons meaningless.
- **N10: a visible skill rank plus a Hall of Generals.**
  - Show "Rank: Tier VI" (the MMR tier, already computed in A6.8) and "Highest tier beaten" per format on Home and the profile.
  - Present Conquest as a ranked ladder of named characters, with the player's portrait inserted above the highest General beaten. This is the Pokémon Elite Four / Punch-Out!! circuit pattern [K5]: an honest leaderboard made of characters, not fake players.
  - It gives E18's "league" feeling without E18's grey part (AI rows that pose as a population). This report recommends N10 over E18 until real players exist.
- **Later, and grey (N14, N15):** real humans without a server. See section 7.

**Guardrail:** the comparisons stay relative and friend-scale, never a public bottom rank (Psy 3.12). For kid-focused portal builds, comparison stays local and share-only.

### 4.4 Novelty over time

**Exists:**
- 6 daily modifiers
- procedural AI commanders
- 3 formats
- 8 arena ground layers
- 10 Generals

Most of this has been seen by weeks 6-8 (3.1). Procedural commanders draw names and plans from a fixed personality set, so they deliver mathematical rather than perceived novelty [K2].

**Gaps:**
- There are no events, seasons, rotating modes or calendar in v1.
- D1 v1.2's weekly events and new ages need new builds.
- The build pipeline is an AI agent workflow funded by promotional credit that expires on 2026-11-05 (`PROGRESS.md`). The owner is not a developer. **Novelty that needs monthly work is the most fragile engine in the plan.**

**Already proposed** (all good content ideas):
- E8 Seasonal Road
- E9 guest General of the month
- E11 Age Festival
- E17 featured-mode rotation
- Psy-D seasons

**What this report adds:**
- **N7: a self-running calendar.** Author the rotation once as a content table for 24 months, keyed by ISO week and month. Every date-derived choice is deterministic, like A9.1. Each week and month sets:
  - a featured format
  - a curated modifier pair (6 modifiers give 15 pairs plus 6 singles; D1's 2 extra modifiers give 36 combinations)
  - a guest General's personality skin (E9)
  - a featured age (Home music and backdrop)
  - the Expedition seed
  - the week's Clutch Puzzles (N6)

  Curate the table instead of randomising it, so no two adjacent weeks feel alike. It ships once and runs offline for two years. New builds become a bonus, not a requirement.
- **Tighten E11 (Age Festival).** A 48-hour weekend with 2× foil odds is a time-limited odds boost on the game's longest chase. That concentrates play into weekend windows and is the "time-limited pressure" pattern the CPC principles flag for children. Keep the festival cosmetic (frame, music, backdrop). If the odds boost stays, bank it as "festival stamps" usable any day of the following week.
- **Tighten E8 (Seasonal Road).** "Stage II bans your 8 most-used cards" forces variety by taking away the player's identity cards. Make it a bonus instead ("+50% seasonal trophies with cards you have not used this season").

### 4.5 Identity and self-expression

**Exists:**
- a free-text name
- a procedural avatar or unit portrait
- banner, frame and title
- 12 skins and foils
- 6 emotes
- 3 renamable War Plan presets

**Gaps:**
1. **Identity has no audience.** Offline, the only viewers are the player and an AI on the VS screen. Self-expression without an audience is weak (Psy 3.19). The sharing features in 4.6 are therefore also identity features.
2. **Identity barely appears on the battlefield.** Banners, frames and titles live on the profile and VS screen only (A5.8, A6.1). The base, on screen for the whole of every match, has one skin in the entire game (Crystal Spire, Arena 8). The battlefield, and later every clip, shows almost nothing of who the player is.
3. **No playstyle identity.** The game records rich `MatchStats` but never tells players what kind of commander they are.
4. **No trophy cabinet of moments.** The replay ring evicts the player's best match after 20 more (5.2).

**Already proposed:**
- Hall of Ages: Psy-F
- yearly recap: E16
- plan codes: E5
- card records and mastery: E6, Psy-E

**What this report adds:**
- **N8: a playstyle mirror.**
  - Compute a commander style from local stats: Rusher, Turtle, Economist, Artillery, Power-timer, Balanced. These are the same axes as the General personalities (A7.4).
  - Show it on the profile and the VS screen ("Turtle vs Captain Kettle, Rusher").
  - Offer style titles. It is a mirror, not a judgement, and costs strings plus a small meta function.
- **N9: identity in the lane.**
  - The player's banner flies from their base.
  - The title plate sits under the base HP bar.
  - Conquest trophies and Hall of Ages pieces appear as view-only décor on the player's base in every age.
  - All of it follows the clarity rules (A5.8, A11): outside team-colour zones, never over the lane band, and a gallery test for each piece.
  - This is the "village" people see, and it shows up in every future clip.
- **N4: pinned moments** (5.2).

### 4.6 Sharing and virality

**Exists in v1: nothing the player can share.** The save export code is a backup, not a share. Replays are local. Clip Mode, replay-to-clip and the owner's approval workflow are all v1.1 (D1), although `market-portals.md` recommendation 8 said to build clip tooling from day one.

**Constraints to design around:**
- **Poki forbids outgoing links and requires web exclusivity** (`market-portals.md` sections 1-2). A share link pointing to the GitHub Pages build would conflict with a Poki path. Share codes must therefore be plain text that pastes back into the game; URL forms can exist only in non-Poki builds.
- **Replays are 5-20 KB (B3), too large for chat links, and die on every balance patch** (5.2). Share codes should be built from small, version-robust data: seeds, War Plan card IDs, format, results.
- **No rewards for sharing, ever.** Rewards for invites and shares are the EU's named TikTok Lite red line (benchmarks [TT2]).
- **The free-text name** must stay out of share artefacts by default (minors, moderation). Use the auto-generated name.

**Cheapest v1 items** (strings plus a small component each):
- the E4 "Copy result" text line for the Daily Challenge
- "Save image" on the Legendary walkout and the result card: `canvas.toBlob` then a download, with no network
- War Plan codes (E5), about 40 card IDs, around 100 characters: the Clash of Clans layout-link pattern [K6]

**v1.1:** Clip Mode and the "Stone to Future in 30 s" montage (D1), which is the strongest viral asset the game has.

**Also add:** N6 Clutch Puzzles as ready-made clip bait ("can you save this base?"), and N13 feats that create caveman-beats-tank moments.

### 4.7 Session design: instant start, short sessions, natural stopping points

**Exists:**
- a start of 3 s or less; the title screen is a live battle; no menus before the first win (A8)
- Short War median 4:30; Full War 7:00 (A2.14)
- skippable staging everywhere, "Open all", 10 s caps (A10)
- pause and 2× speed
- banks on every timer

**Gaps:**
1. **The natural stopping point is silent.** Once capsule charges are used up, a win's value drops by about 88% for copies (9.1 per capsule becomes about 1.1 through the Clay meter) and 76% for Amber (247 becomes about 60). That is the right place to end a session, but neither Home nor the result screen says so. Close with N12, a specific version of E1 / Psy-I:
   - "Capsule charges used. Next one in 5 h. Wins now give Amber and Clay pips."
   - the day's highlights
   - tomorrow's modifier as a preview ("Tomorrow: Glass Armies"): anticipation without pressure, since A9.1 is deterministic
   - "Next battle" stays available; "Home" is the emphasised button
2. **No resume after an interruption.** Mobile browsers kill background tabs. DESIGN specifies auto-pause on hide (WP11) but no persistence of a match in progress, and does not say what an abandoned match counts as. A 7-9 minute Full War lost to a phone call is a frustration quit. N11 fixes it:
   - persist `{seed, format, sides, tick, commands}` on `visibilitychange`
   - on boot, offer "Resume battle", rebuilding the match with the existing `replayMatch(r, content, toTick)` (B15) and re-running the bots through the log so their state rebuilds deterministically
   - if bot state cannot be rebuilt, count the match as "Abandoned" with no trophy change and a Clay pip
3. **No unit of play shorter than about 4.5 minutes.** TikTok's grip comes partly from 15-60 s units (benchmarks section 6). N6 Clutch Puzzles (30-90 s) fill this slot healthily, because each puzzle ends.
4. **Landscape only** (A2.1), with portrait deferred to v1.2. Phone users arriving from portrait feeds must rotate first. This is known and correctly scheduled; it is listed here because it is session friction.
5. **Bank size trades appointment pressure for binge pressure.**
   - A 12-charge bank means a player who returns every 3 days has a long session of about 20 matches waiting.
   - Psy-K's minor-safe profile (28 charges) would invite a Sunday session of about 45 matches: exactly the long, late session its own warning signs describe.
   - Keep 12, and use the rest bonus (Psy-H, E3) to reward coming back without enlarging the bank.
6. **Format parity** pushes players to the shortest format (5.1). That is good for session length but bad for Pillar 2.
7. **No play-time tools** (Psy-audit #22, E20).
8. **Spec gap:** A2.14 gives no target median for Standard War. It is the Daily Challenge format, so its length matters for the daily session.

### 4.8 People (relatedness)

v1 has no human contact at all, which is correct for an offline, kid-accessible v1. The siblings cover friend ghosts (E5, Psy-B) and later clans. Two server-free options exist that neither sibling lists. They are recorded as grey, later items in section 7 (N14): a friends-only real-time duel over peer-to-peer WebRTC with copy-paste codes, and a same-device "Couch War".

---

## 5. Cross-cutting design issues found

### 5.1 Equal rewards per format make the signature content economically worse

A2.10: "Trophies and rewards are the same for every format." At the target 60% win rate a match earns about +10 trophies, and capsule charges are consumed by wins in any format:

| Format | Median length | Trophies per minute | Ages reached |
|---|---|---|---|
| Short War | 4:30 | About 2.2 | Stone to Gunpowder |
| Full War | 7:00 | About 1.4 | Stone to Future |

A reward-seeking player plays Short War. They never see Modern or Future on the ladder, and their Modern and Future cards and upgrades lose purpose. That undermines Pillar 2 and the tagline "From clubs to lasers in one battle". This is a data-level fix (N3), and the design lead should choose the mechanism:
- equalise reward per minute within ±15%, for example +1 Clay pip on every Full War result and 1.5× win Amber, or
- let Full War wins count double for quests

**Healthy:** it rewards per minute played, not more minutes.

### 5.2 Every balance patch erases every replay; the ring erases the rest

- B3: a replay whose `contentHash` differs from the build "cannot be played".
- `decisions.md` (2026-09-27, hash) limits the hash to the battle slice, which is good.
- But the Phase 3 tuning loop and every later balance change touch exactly that slice.
- The replay ring keeps 20 matches (B8).

Together this means the player owns no durable artifact of their best moments, and every replay-based feature (ghosts, puzzles, share codes, the Daily result) breaks on each patch. N4 fixes it:
- **Pin up to 5 replays**, exempt from the ring.
- **Keep old battle content by hash** as a lazy-loaded chunk. Compiled battle data is small, and `simVersion` changes are rarer than content changes. Pinned replays of older content then stay playable. When `simVersion` itself changes, offer "Export as clip" (v1.1) before updating.
- **Build share codes from version-robust data** (seed, War Plans, format, result), not from command logs.

### 5.3 The foil math

A5.8 and A6.4 make foils the long-tail chase: a Bronze, Silver or Holo roll per stack, a foil unlocks when it beats the one owned, there is no pity, and Dust cannot craft them.

| Foil set complete (every card) | Engaged (model median) | Casual |
|---|---|---|
| Bronze or better | About 15 months | About 2.5 years |
| Silver or better | About 4-5 years (some simulated players are still missing one after 10 years) | Often not within 10 years |
| Holo | More than 10 years (about 50 of 55 owned after 10 years) | Not within 10 years |

The bottleneck is always the Legendaries. There are 5 of them, and each gets about 0.07 stacks a day. A Holo on one specific Legendary is therefore expected once in about 15 years.

A deliberately unfinishable, pure-luck chase is the collecting pattern most linked to "having to" play (Psy 3.9). It is not a red line (it is free and has no deadline). It is grey, and the fix doubles as the missing Dust sink (N2).

### 5.4 The weekly quest reset is not specified

A6.7 defines "Win 15 battles" but not what happens to partial progress when the week ends. The save contract has a `weekKey` (`src/contracts/save.ts`), which suggests a reset. If 14 of 15 wins vanish on Monday, that is a loss of progress for being away, which PEGI's June 2026 criteria rate at 12 (benchmarks [REG2]). Specify one of two rules: progress carries over until claimed, or E2's stamp card applies (any 5 of 7 days, nothing resets).

### 5.5 Rewards inform better than they bribe, and the quest pool leans on bribes

Psy finding 14 already covers this: "Play 3 battles" and "Train 30 units" pay for doing, not for doing well. After month 6 every quest pays Amber that has no use (13 of 15 quests), so the quest board becomes a to-do list with no payoff. With N2 in place, quests should pay into the long sinks: Dust, star progress and Expedition digs.

### 5.6 Build capacity is a horizon too

The cloud credit ends on 2026-11-05, and after that each build session costs the owner. Every renewable engine proposed here and by the siblings is either:
- code plus a data table that runs itself (N6, N7, E7 Heat, N2 sinks, E12 date seeds), or
- a steady content stream (new ages, monthly events).

**Build the first kind before the credit ends**, so that the second kind becomes optional data drops. This also fits the hard rule "Content is data".

### 5.7 Measure the horizon, not just playtime

The local event log (A8) tracks onboarding. For the years question it should also record, locally and exportable:
- days since the last new collectible
- Amber and Dust balance growth
- the share of ladder matches by format (catches 5.1)
- sessions ending right after a charge-empty result (catches 4.7 gap 1)
- the Psy 9.2 warning signs (very long sessions, late-night play)

Portal dashboards reward average playtime. These signals check that the time is well spent.

---

## 6. Grey and red-line audit of the current design

**No item in DESIGN v1.1 is a red line.** The hard rules (nothing sold, no store, no ads SDK, AI labels, no chat, banked timers, pre-rolled results, visible pity) remove the classic dark patterns.

| # | Item | Ref | Class | Why | Fix (owner) | Also in |
|---|---|---|---|---|---|---|
| 1 | Wardrobe reel, CS:GO-style, **on by default** | A10.1, B11 `reelReveal: true` | **Grey, closest to red** | The case reel with a falling-pitch `reel_tick` is the visual grammar of skin gambling. The benchmarks red-line list (#10) names "casino or claw-machine framing"; Poki bans gambling themes; D2 lists "capsules read as gambling" | Default off in every build; keep it as an opt-in Settings toggle, off in the minor-safe profile; the card-flip reveal is the default (WP10, WP11) | Psy-audit #4 |
| 2 | Four tap "strikes" on a pre-rolled capsule | A10 step 3 | Grey | Illusion of control | "Decided when earned. Tapping reveals it." on the first capsule and the odds panel (WP10, i18n) | Psy-audit #2 |
| 3 | Scripted capsules 1-5 look like ordinary capsules while the panel shows bag odds | A6.5 | Grey (Pillar 4) | Odds shown do not apply to these capsules | Label them "Starter Capsule: contents set to get you started" (WP10, WP9) | Psy-audit #5 |
| 4 | New players' bots get +10 points of mistake rate for 20 matches | A6.8 | Grey (Pillar 4) | Adaptation by match count is not covered by the disclosed text "difficulty adapts to your recent results" (A7.1) | Add "Rookie AI" to the VS tier line in those matches, or add one Help sentence (WP9, WP11 strings) | New |
| 5 | Daily Challenge first-win reward is not banked | A9.1 | Grey | The only daily reward that is lost by being away | Last 3 days playable, each with its first-win reward | Psy-audit #9 |
| 6 | Weekly quest partial progress may reset | A6.7, `weekKey` | Grey; **red if progress wipes** | Loss of progress for absence (PEGI 12 criterion) | Specify carry-over or the E2 stamp card (5.4) (WP7) | New |
| 7 | Foil chase with no pity or crafting; completion in years or decades | A5.8, A6.4 | Grey | A deliberately unfinishable pure-luck chase feeds obsessive collecting | N2 (E21 pricing plus a Holo compass); show expected odds per card | New (disagrees with Psy 3.9) |
| 8 | "Next battle" with no stopping cue; no play-time or break tools | A9 #7, #15 | Grey | TikTok's missing stopping point, in mild form | N12 / E1 / Psy-I; E20 / Psy-audit #22 | Siblings |
| 9 | Charges regenerate to a bank of 12 | A6.3 | Grey (healthy form) | An appointment pull every 3 days | Keep; never show "wasted" or "full" as a loss; keep 12 rather than 28 (4.7 gap 5) | Psy-audit #6 |
| 10 | `navigator.vibrate` on climbs and Legendaries | A13 | Grey (minor) | Haptic reinforcement of random rewards | Default off in the minor-safe profile | New |
| 11 | Free-text player name | A6.1 | Healthy offline; grey once anything is shared | Moderation and minors' identifying information | Share artefacts use the auto name by default (4.6) | New |
| 12 | "Login streak" in the D1 hooks of `market-portals.md` | Research, not DESIGN | **Red** | Streaks that penalise absence (Jutland Declaration, KIDS Act proposal, PEGI) | Never adopt; use the rest bonus | Psy-audit #25 |
| 13 | Random capsules for minors | A6.4 | Grey (regulatory future) | The KIDS Act proposal may restrict variable rewards for minors even when free | Keep the data switch ready (Psy 9.3) | Siblings |

**Sibling proposals that need tightening:**

| Proposal | Issue | Adjustment |
|---|---|---|
| E12, 6-hour local-time relic windows | Adds time-of-day appointments | Drop the time axis; keep place, weather and the shared date seed |
| E11, 2× foil odds weekends | Time-limited odds on the longest chase | Cosmetic festival, or bank the boost for a week |
| E8, ban the 8 most-used cards | Removes identity cards | Make it a variety bonus instead of a ban |
| E18, AI Rival League | AI rows imitating a population | Prefer N10 (Hall of Generals) until real players exist |
| Psy-K, 28-charge bank | Invites binge sessions | Keep 12 plus the rest bonus |

---

## 7. New proposals in this report (not in the sibling catalogues)

Class, time scale, cost, the DESIGN hook and a suggested phase. "Request" means a note in `docs/requests/` to the owning WP, because this report may not edit other files.

| ID | Proposal | Lever | Time scale | Class | Cost | Hook / owner | Phase |
|---|---|---|---|---|---|---|---|
| N1 | **Horizon report and CI gate** in the economy sim: track end dates, currency balance growth, days since the last new item, foil completion; gates as in 4.1 | Protects every long-term lever | Years | H | Small (tools) | B12, WP12 | v1 (tools only) |
| N2 | **Post-max sinks with numbers:** Dust buys foils (E21, priced in 4.1), a Holo compass every 200 stacks, Amber buys star levels (D1, moved up) | Collection, competence, reachable completion | Months to 2 years | H | Medium (meta, UI, data) | A6.6, A9 #10-11, WP7 / WP9 | v1.1 (before launch plus 5 months) |
| N3 | **Reward parity per minute across formats** | Keeps Pillar 2 content in play | Match | H | Tiny (data) | A2.10, A6.3, WP1 / WP7 | v1 candidate (request) |
| N4 | **Durable moments:** pin 5 replays; keep old battle content by hash; share codes from seeds and War Plans; "Save image" on walkout and result | Identity, sharing | Months | H | Small to medium | B3, B8, WP8 / WP11 | v1: image export; v1.1: the rest |
| N5 | **Shared-seed Daily Challenge at Standard levels,** with a pause and speed flag in the replay and the E4 share line | Fair competition, relatedness | Day | H | Small (meta seed plus strings) | A9.1, A6.8, WP7 / WP9 | v1 candidate (seeding); v1.1 (share) |
| N6 | **Clutch Puzzles:** the headless sim mines bot-vs-bot matches for dramatic positions (for example a side below 15% base HP that later won). Each is shipped as data (seed, command prefix, tick); the player takes over at that tick with `replayMatch(…, toTick)` against a bot; 30-90 s, 3 stars, a weekly set from a pool of hundreds. `tools/` re-mines the pool automatically after each balance patch | Puzzle and discovery, competence, TikTok-sized unit, clip bait | Session / week | H | Medium (sim fork, tool, screen) | B12, B15, WP2 / WP11 / WP12 | v1.2 |
| N7 | **A self-running novelty calendar:** a curated 24-month content table keyed by ISO week or month (format, modifier pair, guest General, featured age, Expedition seed, puzzle set); calendar shows the next 3 entries; every entry recurs | Novelty, anticipation without pressure | Week / month / year | H | Small code, curated data | A9.1 pattern, `src/content`, WP1 / WP7 | v1.1 |
| N8 | **Playstyle mirror:** commander style from local stats, shown on profile and VS, with style titles | Identity, self-knowledge | Months | H | Small | A6.1, A7.4 axes, WP7 / WP9 | v1.1 |
| N9 | **Identity in the lane:** banner on the player's base, title plate, view-only décor from Conquest and the Hall of Ages; clarity tests apply | Identity with an audience (clips) | Always | H | Medium (visuals, manifest) | A5.8, A11, B5, WP4 / WP5 | v1.1 |
| N10 | **Visible skill rank plus Hall of Generals:** "Rank: Tier VI" and highest tier beaten per format; Conquest shown as a ladder of characters with the player inserted | Competence, honest status | Months | H | Small (UI, strings) | A6.8, A6.10, WP9 | v1 candidate |
| N11 | **Resume an interrupted battle** from a persisted command log; "Abandoned" as a no-penalty fallback | Session control, no frustration quits | Session | H | Small to medium | B8, B11, B15, WP8 / WP11 / WP3 | v1 candidate |
| N12 | **Charge-empty session close:** explicit copy, day highlights, tomorrow's modifier preview; Home emphasised, Next battle available | Peak-end, natural stopping point, healthy anticipation | Session / day | H | Tiny (strings, component) | A6.3, A9 #7, WP9 | v1 candidate |
| N13 | **Anachronism feats:** about 30 hidden cross-age feats shown as "???" with riddles, detected from `SimEvent`s; rewards are lore pages, titles and emotes | Discovery, curiosity, clip moments | Months | H | Small (meta, strings) | D1 "about 20 achievements", WP7 / WP9 | v1.1 |
| N14 | **Friends without a server** (later): (a) a real-time friends duel over WebRTC with copy-paste connection codes and lockstep on the deterministic sim; unranked; no matchmaking, so no stranger contact; emotes only. (b) "Couch War", same-device 1v1 on desktop and tablet | Relatedness, real competition | Anytime | G | Large. Some networks fail without a relay server; PvP rules as in D1 | D1 PvP rules | After v1.2 |
| N15 | **A community board verified by GitHub** (optional experiment): players paste a Daily result code into a GitHub Issue form; an Action runs `replay:verify` against that day's seed and publishes a static board on Pages | Human comparison with no server cost | Day / week | G | Medium; the owner moderates | B12 `replay:verify`; free Actions on the public repo | Experiment after v1.1 |

N15 is grey because GitHub accounts require age 13 or over [K7], usernames are public, bots or tool-assisted inputs cannot be excluded, and it conflicts with a Poki-exclusive path. It is out-of-game and opt-in.

---

## 8. Prioritised path

**v1, now: small requests that close the grey items and cheap gaps**

- Grey fixes 1-6 in section 6. These are mostly strings and flags. Item 1 (reel default) and item 6 (weekly reset spec) are the most important.
- N3 (format parity, data), N12 (charge-empty close), N10 (visible rank), N11 (resume), and the seeding half of N5.
- N1 in `tools/`, so the Phase 3 economy run reports the horizon, not just the pacing.
- "Save image" on the walkout and result (N4, first part) and E19 ("Nothing expires" copy).

**v1.1: the long-term engines (before about month 5 after launch, and ideally before 2026-11-05)**

- N2 sinks (with E21) and star levels moved up from v1.2.
- N7 calendar with E9 guest Generals, E8 / Psy-D seasons (tightened), and E7 / Psy-G Heat.
- E4 / N5 share line, E5 War Plan codes, Clip Mode (D1), and the rest of N4.
- N8, N9, N13; E1 / E20 time tools; Psy-H / E3 rest bonus; E2 stamp card.

**v1.2: treasure and place**

- E12 Rift Expedition (without time windows) together with E13 Museum and Psy-F Hall of Ages, which N9 renders in the lane.
- N6 Clutch Puzzles.
- Portrait layout (D1).

**Later:** online 1v1 (D1), N14, N15, clans with emote-only communication.

After v1.1 the time-scale map would read:

| Scale | Main levers |
|---|---|
| Seconds and match | Unchanged |
| Session | Matches, capsules, a puzzle, the charge-empty close |
| Day | Charges, Daily Capsule, quests, a shared-seed Daily with a share line |
| Week | Stamp card, featured mode, puzzle set |
| Month | Season, guest General, festival (cosmetic) |
| Years | Foil and star sinks, Heat, feats, new ages when they arrive, and later people |

---

## 9. Evidence notes, assumptions and open questions

**Model assumptions (Monte Carlo, 12-20 seeds per case, 10 simulated years):**
- The A6.4 roll algorithm is implemented exactly as specified: the 100-slot bag, the Daily Capsule odds, stack guarantees, the Jade 25% Legendary conversion, random stack rarities, Epic and Legendary pity, unowned ×3 weighting, and no duplicate Legendary until all are owned. Foil rolls use 25 / 100 / 400 bp.
- The starter kit owns 25 Commons plus the 5 AA Rares. All 5 ages are in the drop pool from day 1, which makes early dates slightly optimistic.
- **Engaged:** 4.9 bag capsules plus 1 Daily Capsule a day (A6.9), and a variant with 6.4 to stand in for Age, Codex and Road capsules. **Casual:** 2 plus 1.
- Maxing counts copies only (Amber ignored). Dust counts every copy beyond the L10 requirement, so it is an upper bound.
- New-card protection is not modelled (it only speeds up the date when every card is owned).
- Results: all cards owned at days 9-12 (engaged) and about 21 (casual). Copies maxed at days 148-185, bracketing A6.9's "about 135 days for copies" (which counts all capsule sources). Dust after max is about 1,170 a day. Foil dates are as in 5.3.
- The dates are order-of-magnitude guides. The in-repo economy sim (B12, N1) should replace them.

**Trophy pace** uses A6.3 and A6.8 directly: +30 / −20, 0 loss below 400, a 60-65% target, and about 6.7 matches a day. It ignores the arena minimum tier clamp, which slows players below tier VIII.

**Web access.** Web search and fetch were not available in this session (the search budget was used up and outbound fetches were blocked). Every external claim beyond DESIGN and the in-repo reports is marked **[K]**: it comes from background knowledge and was not re-verified here. None of the key findings depends on a [K] source. They rest on DESIGN's own numbers and on the sibling reports' sourced evidence.

**Open questions for the owner** (for the orchestrator to put in plain Danish):
1. Should the Wardrobe reel be off by default (section 6, item 1)? It looks like a gambling "case opening", and a kid-friendly portal would likely refuse it.
2. Should Full War pay more per match so that playing all the way to the Future Age is worth it on the ladder (N3)?
3. Is it acceptable that the game "runs itself" for 1-2 years from a pre-written calendar (N7), with new ages as a bonus when there is time and money for build sessions?
4. Should an optional community board be tried later, where players post their daily result on GitHub (N15)? It is only for players aged 13 and over with a GitHub account.

---

## Sources

**In this repository**
- `docs/DESIGN.md` v1.1: A1, A2.4, A2.9-A2.14, A3, A5.8, A6.1-A6.10, A7.1-A7.4, A8, A9, A9.1, A10, A10.1, A11, A12, A13, B3, B8, B11, B12, B15, D1, D2, Appendix.
- `docs/research/engagement-psychology.md` (2026-09-27): levers, DK/EU rules (section 2), audit (section 6), ideas A-K (section 7), minor-safe profile (section 9.3).
- `docs/research/engagement-benchmarks.md` (2026-09-27): engines (section 4), treasure-hunt pattern (section 5), TikTok rules (section 6), proposals E1-E21 (section 7), red lines (section 8); source keys such as [REG2], [TT2] and [CR5] resolve there.
- `docs/research/meta-collection.md`, `market-portals.md` (sections 1-4, 8, 9), `feel-ux.md` (sections 6-7), `genre-peers.md`.
- `docs/design-history/critique-player.md` (#1, #10, #17), `design-meta-collection.md` (Essence, star levels, 40 achievements), `design-feel-and-ship.md` (scope discipline).
- `docs/decisions.md` (2026-09-27 "hash" and "capsules" entries), `docs/PROGRESS.md` (credit expiry 2026-11-05), `src/contracts/save.ts` (`weekKey`), `src/content/quests.ts` (weekly quest).

**Background references [K]** (not re-verified in this session)
- [K1] Soren Johnson, "Water Finds a Crack" (Game Developer column, about 2010; designer-notes.com): "Given the opportunity, players will optimize the fun out of a game."
- [K2] Kate Compton, "So you want to build a generator" (2016): the "10,000 bowls of oatmeal" problem, where outputs that are mathematically unique are perceived as the same.
- [K3] Old School RuneScape Collection Log (added 2019; oldschool.runescape.wiki/w/Collection_log): a years-long log of unique drops that shows what exists and what is missing.
- [K4] Spelunky's Daily Challenge (one attempt a day on the same seed for everyone, with a leaderboard) and Slay the Spire's Daily Climb (a shared seed with modifiers): daily shared-seed competition.
- [K5] Pokémon's Elite Four and Punch-Out!!'s circuits: competitive ladders made of named AI characters.
- [K6] Wordle's shared result grid (see also benchmarks [OT2]) and Clash of Clans layout links (benchmarks [CoC6]): small, spoiler-free share artefacts.
- [K7] GitHub Terms of Service: accounts require age 13 or over.
