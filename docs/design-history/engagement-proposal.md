# Ageborn engagement layer: proposal

Proposal, 2026-09-27. It answers the owner's wish that Ageborn should use what people love about games (competition, collecting rare things, the thrill of opening packs, treasure hunting like Pokémon GO, what makes TikTok gripping, and the Clash of Clans / Hay Day feeling of improving for years) and turns the four engagement reports into one buildable design.

**Status.** This is a proposal for the owner and the design lead. Nothing here is in `docs/DESIGN.md` until the owner approves it. Each adopted item then becomes a DESIGN edit plus requests in `docs/requests/` to the work packages (WPs) that own the paths (DESIGN Part C).

**Builds on, does not repeat:** `docs/research/engagement-psychology.md` (levers and evidence), `engagement-benchmarks.md` (what other games do), `engagement-law-ethics.md` (DK/EU rules) and `engagement-gap-analysis.md` (where v1 runs out). Research IDs (E1-E21, N1-N15, Psy-A to Psy-K, P-1 to P-9) are kept so every decision can be traced; Appendix A lists what happened to each.

**IDs.** Systems in this document are **EL-1 to EL-31**. Section numbers such as A6.3 refer to `docs/DESIGN.md`. Every number is a starting value that lives in content data and is checked by the headless sims (B12, and the horizon report in section 13).

**Sizes.** XS: strings or one flag. S: one or two WPs, mostly data, strings and a small component. M: several WPs, a contract request, a new rule set or screen. L: several WPs, new screen with art, content authoring, contract changes and an economy re-run.

---

## 0. Summary

### 0.1 The reframe

The owner asked for a game people "can't put down". We design for **"wants to come back, easy to stop"** instead, for three reasons:

1. **It is what lasts.** Players whose needs for competence, choice and connection are met play for years and feel better afterwards; players who feel they *have to* play log more hours, enjoy them less and quit sooner (psychology report, 0.2 findings 1 and 13).
2. **It is where the law is going.** Streaks, penalties for staying away, autoplay, notifications and random rewards for minors are exactly what the DSA minors guidelines, PEGI 2026, the Danish-led Jutland Declaration and the EU KIDS Act proposal target (law report, 0.3-0.4). A Danish game will be judged first by Danish players, parents and press.
3. **Our players include children.** Web portals are kid-heavy. Everything here must pass the "10-year-old on a school night" test.

Everything the owner asked for is in this proposal. Only the harmful versions are left out (section 12).

### 0.2 The shape

- **The battle stays the centre.** Every new track advances through finished matches or wins. No system can be progressed by idling, waiting or tapping menus.
- **Three long engines, each with visible finish lines:**
  - **Mastery** (getting better): visible rank, seasons, Chrono Heat, Card Mastery, records, puzzles.
  - **Discovery and collection** (finding and completing): hidden feats, the Museum, the Rift Expedition treasure map, sightings, foil and star sinks.
  - **Identity and people** (being someone, sharing it): the Hall of Ages, your banner in the lane, playstyle, share codes and friend challenges, clips, the yearly recap. Online play and clans come later.
- **One rhythm:** the Daily Challenge every day, a treasure map and War Chest every week, a Season every month, an anniversary and returning themes every year, and a Codex Level that keeps rising for years.
- **Guardrails are part of the design:** everything banks, nothing expires, sessions end on a wrap card, optional play-time tools, and a kid-safe profile as data.
- **No new spendable currency.** Amber and Dust stay the only meta currencies. They get sinks that last 2-3 years.

### 0.3 The owner's wishes and our answers

| Wish | Our answer | Main systems |
|---|---|---|
| Competition | Honest skill rank against labelled AI, monthly seasons with a pennant for your best, a shared Daily Challenge you can compare with friends, friend challenges without a server, mastery ladders; ranked PvP when online arrives | EL-3, EL-7, EL-15, EL-18, EL-28; online (section 9) |
| Collecting rare things | Albums and sets with completion rewards, foils and star levels that take years, relics with rare gilded variants, feats, pennants; everything has a crafting path | EL-10, EL-12, EL-14, EL-22, EL-23 |
| Joy of random rewards when opening packs | Time Capsules stay the signature (earn-only, pre-rolled, visible odds and pity). New: payoffs keep their value after month 6, a Holo compass, rare sightings | EL-12, EL-24 |
| Treasure hunting (Pokémon GO) | A weekly **Rift Expedition** map that is the same for every player that week: fog of war, trail clues, relics, a hidden gilded relic, guardian battles. No GPS, no timers, nothing expires | EL-23, EL-24, EL-10 |
| What makes TikTok gripping | Instant start (exists), short units of play (30-90 s puzzles), constant variety (calendar, guests, featured modes), creation and sharing (clips, images, codes). Never autoplay, endless feeds or rewards for watching | EL-9, EL-17, EL-19, EL-20, EL-25, EL-29 |
| Improving for years (Clash of Clans / Hay Day) | A **Hall of Ages** you furnish with what you earn, a Codex Level that grows from ~81 to ~285 with prestige tiers, Heat ladders, stars and foils, seasons, a new age every year; nothing withers and there are no timers to wait on | EL-12 to EL-16, EL-18 |
| Never boring | Novelty at every scale from a self-running 24-month calendar that needs no new builds | EL-17 |

### 0.4 The five best additions for v1 (details in section 14)

1. **EL-1 Session wrap card** (S): a calm summary when capsule charges run out or after 30 minutes, ending every session on a high.
2. **EL-3 Daily Challenge 2.0** (S): the same opponent and seed for everyone that day at fair "Standard levels", three difficulties, a 7-day window so nothing is missed, and a Wordle-style "Copy result" line.
3. **EL-10 Hidden feats** (S): 12 secret "anachronism" feats ("a caveman fells a laser knight") as a first taste of treasure hunting in v1.
4. **EL-7 Visible rank and the Hall of Generals** (S): an honest skill number and the Conquest board shown as a ladder of named AI characters with the player on it.
5. **EL-9 Save image** (S): one tap saves the Legendary walkout, the result card or a feat as an image to share.

Plus a **must-fix pack** before any public launch (EL-2, EL-4, EL-5, EL-6): mostly strings, flags and data.

### 0.5 Phases at a glance

| Phase | What lands | Why then |
|---|---|---|
| v1 Phase 2b | EL-1, EL-2, EL-3 (seed, window, difficulty), EL-4, EL-5 | Small rule and string changes that are cheapest while the meta loop is being wired |
| v1 Phase 3 | EL-3 (share line), EL-6, EL-7, EL-8 (result line), EL-9, EL-10 (12 feats); EL-11 if capacity allows; horizon report (section 13) | Small UI and data additions in the polish pass |
| v1.1 | EL-8 (records), EL-10 (30 feats), EL-11, EL-12 to EL-15 (Heat light), EL-17 to EL-19, EL-21, EL-22 (age sets), EL-26 to EL-31 | **Must ship before the first players reach month 5**, when v1's progression tracks end |
| v1.2 | EL-15 (handicaps), EL-16, EL-20, EL-22 (relic sets), EL-23, EL-24, EL-25, with the Bronze Age (D1) | Treasure and place: the biggest content items |
| Online | Ranked PvP seasons, relative boards, Daily leaderboard, friend duels, Warbands with a shared map (section 9) | Needs the server milestone in D1 |

---

## 1. Principles and gates

### 1.1 Principles

1. **Battle is the centre.** Progress in every new system comes from finished matches or wins. The only non-battle actions are choices: where to dig, what to craft, where to place a statue.
2. **Want to, not have to.** Design for competence, autonomy and relatedness; use randomness and anticipation only in the free, bounded, disclosed forms the capsules already use.
3. **Bank, don't expire.** Anything timed waits. Past maps stay diggable, past Daily days stay playable for 7 days, season cosmetics return every year and can be crafted.
4. **Hide content, never odds.** Secrets, fog and silhouettes are fine; probabilities, pity, compositions and bot difficulty are always shown (Pillar 4).
5. **End, don't loop.** Every loop has a visible finish line: the match clock, the session wrap, the day's Daily, the week's map, the season road, the set. "Next" is always a button, never a countdown.
6. **Earn, don't buy.** Nothing is sold. Past L10 everything is cosmetic.
7. **Invite, don't nag.** Home shows what is ready when the player opens the game. The game never reaches out.
8. **Few currencies.** Amber and Dust remain the only spendable meta currencies (section 10).
9. **Renewable by data.** New novelty comes from seeds, curated calendar rows and mined puzzles, so the game keeps changing for 24 months without new builds (the cloud credit that builds Ageborn ends 2026-11-05).
10. **AI is always labelled** (A7.1), and every comparison is honest about who the opponent is.

### 1.2 The four tests every feature must pass

From the psychology report (1.3), unchanged:

1. **Explain-it:** would it still work if a screen explained exactly how it works to the player and a parent?
2. **Walk-away:** if the player stops for a day, a week or a month, do they lose anything they had or were promised?
3. **Reflection:** after a session, would the player say the time was well spent?
4. **Child:** is it fine for a 10-year-old on a school night?

Failing 1 or 2 is a red line. Failing 3 or 4 makes a feature grey at best. Each system below states its verdict and, for any grey element, the safeguard that makes it pass.

---

## 2. The loop map

### 2.1 Loops at every time scale (after this proposal)

| Scale | What the player does | Levers (psychology report section) | Where | Natural end |
|---|---|---|---|---|
| **10 seconds** | Read the lane, tap a card, turret or power; see the unit walk out, clash, gold tick in, coins fly | Instant feedback and competence (3.1), flow (3.2), small surprises inside play (3.4), autonomy | v1: Pillars 1, 3, 5; A2, A12. **Protected:** no meta prompt ever appears inside a battle | Inside a match |
| **Match (3-9 min)** | Build up, evolve 2-4 times, fire Age Powers, push and defend, clock phases, result | Anticipation then payoff (3.5), close outcomes (3.2), peak-end (3.16); new: informative feedback, curiosity (3.14) | v1: A2, A10; new: EL-8 "what went well", EL-10 feats, EL-14 mastery ticks, EL-24 sightings | The match clock (Final Bell) |
| **Session (5-40 min)** | 1-6 matches; open capsules; upgrade; quests; dig map tiles; a puzzle set; the Daily | Variable reward (3.4), goal gradient (3.7), autonomy (dig and upgrade choices), peak-end | v1: A6, A10; new: EL-1, EL-23, EL-25 | **EL-1 wrap card** when charges run out or after 30 min; EL-6 break reminder |
| **Day** | Daily Challenge (shared seed, choice of difficulty, share line); Daily Capsule; 3 quests; charges refill | Novelty (3.15), a small ritual with an end (3.18), fair comparison (3.12), banked appointment (3.17) | v1: A6.3, A6.7, A9.1; new: EL-3 | "Daily done"; every bank says "Nothing expires" |
| **Week** | War Chest (15 wins); the week's Expedition map and its 2 guardian battles; featured mode; puzzle set | Curiosity and discovery (3.14, 3.20), collection (3.9), variety (3.15), goal gradient | New: EL-4, EL-17, EL-20, EL-23, EL-25 | Map charted, chest opened, set done |
| **Season (month)** | Season Road (20 nodes); best AI tier beaten this month earns a pennant; a guest General; a featured age | Fresh start (3.17), status (3.12), goal gradient, character (3.20) | New: EL-18, EL-19, EL-17 | Road complete (about day 12 for an engaged player) |
| **Year** | Hall of Ages tier-ups; Heat ladders; star levels; foil and relic sets; anniversary recap; returning themes and guests; a new age wave | Mastery (3.3), IKEA effect and ownership (3.11), collection (3.9), nostalgia | New: EL-12 to EL-16, EL-22, EL-30; D1 new ages | Finite tracks with visible finish lines |
| **Multi-year** | Codex Level 100 to 250+ prestige; the Aeon Spire; "Timebreaker"; every Holo; every card at Mastery 5; later PvP and Warbands | Mastery with no hard cap (Heat, PvP), status, relatedness | New: EL-13, EL-15, EL-16; online (section 9) | Status markers that never decay when you stop |

### 2.2 The horizon after this proposal

The gap analysis found three cliffs: novelty at weeks 6-8, progression at months 5-6, and the mastery ceiling at tier X. This table shows what replaces them for an engaged player (A6.9 profile). Dates are targets for the horizon report (section 13).

| Track | v1 today | After this proposal |
|---|---|---|
| New collectibles | Last new card at about day 9-21 | Feats (v1), Mastery badges, pennants every month, relics every week (v1.2); gate: never more than 21 days without something new |
| Card levels | Maxed at months 5-6 | Unchanged: the L10 cap stays forever (A6.6) |
| Amber | No sink after month 5-6 | Star levels: about 935,000 Amber, about 18 months of surplus (EL-12) |
| Dust | No sink about 2 weeks after max | Foil crafting and relic crafting: Silver set at about month 16, Holo mostly by the compass by about month 24 (EL-12, EL-22) |
| Trophy Road | Ends at 4,000 (about month 2) | Unchanged, plus a Season Road every month (EL-18) |
| Conquest | 27 stars, weeks to months | Chrono Heat: 45 clears in v1.1, 90 in v1.2 (EL-15) |
| Codex Level | Ends at about 81 | About 285 with v1.2 content, +11 a year from renewables, about +40 per new age (EL-13) |
| Hardest opponent | Tier X, The Warden | Heat 10 on every General, then online PvP |
| Novelty | 6 modifiers seen by week 2 | A 24-month curated calendar of guests, featured modes, maps, puzzles and themes (EL-17) |

---

## 3. System catalogue

| ID | System | Scale | Main levers | Verdict | Size | Phase |
|---|---|---|---|---|---|---|
| EL-1 | Session wrap card | Session | Peak-end, stopping cue, feedback | Healthy | S | v1 Phase 2b |
| EL-2 | Honesty and "nothing expires" pack | All | Honesty (Pillar 4) | Healthy; closes 6 grey items | XS | v1 Phase 2b |
| EL-3 | Daily Challenge 2.0 | Day | Novelty, ritual, fair comparison, sharing | Grey (daily cadence), safeguarded | S | v1 Phase 2b + 3 |
| EL-4 | War Chest (weekly quest that never resets) | Week | Goal gradient | Healthy | XS | v1 Phase 2b |
| EL-5 | Reward parity across match formats | Match | Protects Pillar 2 | Healthy | XS | v1 Phase 2b |
| EL-6 | Play-time tools and night note | Session, day | Self-regulation | Healthy | S | v1 Phase 3 |
| EL-7 | Visible rank and the Hall of Generals | Months | Competence, status | Grey (comparison), safeguarded | S | v1 Phase 3 |
| EL-8 | "What went well" line and personal records | Match, months | Informative feedback, self-comparison | Healthy | S | v1 Phase 3 / v1.1 |
| EL-9 | Save image | Moment | Sharing, identity | Healthy | S | v1 Phase 3 |
| EL-10 | Hidden feats and secrets | Months | Curiosity, discovery, clip moments | Healthy | S | v1 Phase 3 (12) / v1.1 (30) |
| EL-11 | Battle resume | Session | Autonomy, fewer frustration quits | Healthy | M | v1 Phase 3 stretch / v1.1 |
| EL-12 | Post-max sinks: star levels, foil crafting, Holo compass | Months-years | Collection, goal gradient | Healthy | M | v1.1 |
| EL-13 | Codex Level extended with prestige | Years | Endowed progress, status | Healthy | S | v1.1 |
| EL-14 | Card Mastery | Months | Mastery, variety, collection | Healthy (grey part safeguarded) | M | v1.1 |
| EL-15 | Chrono Heat | Months-years | Mastery, flow | Healthy | S + M | v1.1 / v1.2 |
| EL-16 | Hall of Ages | Years | IKEA effect, identity, display | Healthy | L | v1.2 |
| EL-17 | Living Calendar | Week, month | Novelty, anticipation | Healthy | S + data | v1.1 |
| EL-18 | Seasons | Month | Fresh start, status, goal gradient | Grey (time-boxed), safeguarded | M | v1.1 |
| EL-19 | Guest General of the month | Month, year | Novelty, character | Healthy | S | v1.1 |
| EL-20 | Featured mode slot | Week | Novelty, autonomy | Healthy | M | v1.2 |
| EL-21 | Rest bonus | Return | Welcome without penalty | Healthy | S | v1.1 |
| EL-22 | Museum: albums and sets | Months-years | Collection, completion | Healthy | S / M | v1.1 / v1.2 |
| EL-23 | Rift Expedition (treasure map) | Session, week, years | Discovery, curiosity, collection, shared world | Healthy | L | v1.2 |
| EL-24 | Rift Sightings | Match | Rare-variant hunt | Grey, safeguarded | S | v1.2 (optional) |
| EL-25 | Clutch Puzzles | Session, week | Competence, short unit, clip bait | Healthy | M | v1.2 |
| EL-26 | Identity in the lane | Always | Identity with an audience | Healthy | M | v1.1 |
| EL-27 | Playstyle mirror | Months | Self-knowledge, identity | Healthy | S | v1.1 |
| EL-28 | Share codes and friend challenges | Anytime | Relatedness, rivalry | Healthy | M | v1.1 |
| EL-29 | Clips and kept moments | Anytime | Creation, sharing | Healthy | M | v1.1 |
| EL-30 | Your Year in Ageborn | Year | Nostalgia, identity, peak-end | Healthy | S | v1.1 |
| EL-31 | Minor-safe profile | All | Regulation insurance | Healthy | S | v1.1 |

Each entry below uses the same card: fantasy, rules and numbers, levers, ethics, offline fit, what it needs from the architecture, size and phase, and how it sends the player into battle.

---

## 4. Foundations for v1

### EL-1 Session wrap card

| | |
|---|---|
| Fantasy | "Good session. I can see what I achieved, and my stuff waits for me." |
| Levers | Peak-end rule (3.16), informative feedback (3.1), honest anticipation (3.5), stopping cue (3.18) |
| Ethics | **Healthy.** It is the remedy regulators ask for (DSA guidelines; the EU's TikTok finding). No reward is attached, so it is neither a bribe to stop nor to continue |
| Offline | Fully local |
| Needs | WP9: a card component on the Result screen (A9 #7). WP11: session start time and match count (not saved). Strings. No contract change |
| Size, phase | S · v1 Phase 2b |
| Battle link | It ends a battle session cleanly; "Next battle" stays one tap away |
| From | E1, N12, Psy-I, P-8 |

**Rules**

- **Triggers** (at most one wrap per 30 minutes):
  - (a) **Charges empty:** the Result screen of the ladder win that used the last capsule charge.
  - (b) **Long session:** at least 30 minutes of active play and at least 3 finished matches since the session began. A session begins at boot, or when the tab becomes visible after at least 20 minutes hidden.
- **Content** (at most 5 short lines, each skippable):
  1. Summary: "3 wins · 1 loss · Pikeman reached L6 · 2 new cards".
  2. Best moment: the win with the lowest own base HP, or a feat unlocked, with a Watch button.
  3. Next goal: the nearest of the next Trophy Road node, arena gate, Conquest star or (v1.1) Season node, with the distance ("68 trophies to Kingsmoat").
  4. Banks: "Capsule charges: 0 · next in 5 h · wins now pay 40 Amber and a Clay pip".
  5. Tomorrow: "Tomorrow's Daily: Glass Armies. Everything waits for you."
- **Buttons:** Home (primary) and Next battle (secondary). No countdown, no auto-advance, never blocks input.

### EL-2 Honesty and "nothing expires" pack

| | |
|---|---|
| Fantasy | "This game is straight with me." |
| Levers | Trust (Pillar 4); removes illusion of control (3.6) and casino imagery |
| Ethics | **Healthy.** Closes grey items 1-6 of the gap audit |
| Offline | Strings and one flag |
| Needs | WP11 (`NonePlatform` flag value), WP10 and WP9 strings, WP7 (new-player label), `docs/decisions.md` entry. No contract type change |
| Size, phase | XS each · v1 Phase 2b |
| From | P-4, P-5, P-6, P-9, E19, gap audit 1-6 |

**Rules**

1. `NonePlatform.features.reelReveal` defaults to **false**: the Wardrobe Crate uses the card-flip reveal. The reel code stays behind the flag; whether players may switch it on is open question 1 (section 15).
2. First capsule and every odds panel: "The result was decided when you earned this capsule. Tapping only reveals it."
3. Scripted capsules 1-5 are labelled "Starter Capsule · contents set to get you started", and their odds panel says "Set contents" instead of showing bag odds.
4. Amber and Dust info panels: "Amber can't be bought. It has no money value." (and the same for Dust).
5. In a new save's first 20 matches the VS tier line reads "Tier I · Rookie AI", and Help adds: "Your first 20 opponents make extra mistakes while you learn." (A6.8's +10 mistake points become disclosed.)
6. Under every bank: charges "Banks up to 12. Nothing is lost while you're away." The same line appears for the Daily Capsule, daily quests, the Daily Challenge window (EL-3) and the War Chest (EL-4).
7. `docs/decisions.md`: "MMR and bot tuning may target fairness (win rate) only; never session length, return rate or retention."

### EL-3 Daily Challenge 2.0

| | |
|---|---|
| Fantasy | "Today everyone fights the same battle. I beat it on Veteran with no pauses, and I can prove it to my friends." |
| Levers | Novelty (3.15), a small ritual with a natural end (3.18, the Wordle pattern), fair social comparison (3.12), relatedness through sharing (3.1), autonomy (difficulty) |
| Ethics | **Grey** (a daily cadence). Safeguards: a 7-day window so a missed day costs nothing; no streak counter; no "don't miss it" copy; no reward for sharing; the share line carries no name |
| Offline | The seed comes from the local date, like A9.1, so every player on Earth gets the same puzzle with no server |
| Needs | WP7: seeded `pickOpponent('daily', { dayKey, difficulty })`; WP9: Daily screen with a 7-day row and difficulty picker; WP11: record whether the match was paused; clipboard write. Contracts: `SaveDoc.daily` becomes `{ won: string[] }` (day keys won within the window); `OpponentSpec` gains `dayKey` and `standardLevels`; `MatchResultInput` gains `paused` |
| Size, phase | S · v1 Phase 2b (seed, window, difficulty), v1 Phase 3 (share line) |
| Battle link | It is a battle, and the day's modifier also sets the "weather" for Expedition guardians (EL-23) |
| From | N5, E4, Psy-C, P-3 |

**Rules**

- **Seed.** `dailySeed = hash('daily', YYYYMMDD)` for the local day starting 04:00 (A9.1). From it, the same for everyone that day:
  - the modifier (as now)
  - the opponent personality: one of the 8 ladder Generals' personalities, or this month's guest (EL-19) on the days the calendar picks
  - the opponent's War Plan, built by the procedural commander builder from the full pool without Legendaries, so it is the same fair plan for everyone
  - the arena backdrop and the match seed
- **Levels.** Standard levels (every card on both sides at L7, the existing A6.8 toggle). Format stays Standard War.
- **Difficulty** (chosen before the match; the default is the one nearest the player's skill tier, EL-7): **Recruit** (tier II), **Veteran** (tier V), **Warlord** (tier VIII). Everyone at the same difficulty on the same day faces the identical opponent.
- **Window.** Today and the previous 6 days are playable. Each day's first win, at any difficulty, pays that day's Age Capsule; other wins pay 20 Amber (as A9.1). Rewards are the same at every difficulty, so no one is pushed into a hard mode. Days older than 7 remain playable as practice without the capsule.
- **Share line** ("Copy result", v1 Phase 3). Example: `Ageborn Daily 2026-10-03 · Glass Armies · Veteran · Won 5:42 · Base 63% · No pauses · 🟩🟥🟩`. The three squares show who evolved first into Medieval, Gunpowder and Modern (🟩 you, 🟥 the AI, ⬛ not reached). It is spoiler-free and carries no player name.
- **Warlord mark.** 10 Warlord first-wins unlock the title "Daily Warlord" (cosmetic only).

### EL-4 War Chest (the weekly quest that never resets)

| | |
|---|---|
| Fantasy | "Every win fills my War Chest, and progress is never taken away." |
| Levers | Goal gradient (3.7), competence (wins, not logins) |
| Ethics | **Healthy.** It fixes gap audit item 6: A6.7 does not say what happens to 14 of 15 wins on Monday, and wiping them would be a PEGI 12 "punish not returning" pattern. It is play-based, so it is not a login reward under the KIDS Act as reported |
| Offline | Local |
| Needs | WP1 data, WP7 rule, WP9 widget. Contract: `SaveDoc.quests.weekly` and `weekKey` become `warChest: { wins: number; lastOpenedWeek: string }` |
| Size, phase | XS · v1 Phase 2b |
| Battle link | Only wins fill it |
| From | Replaces E2 (see below) |

**Rules**

- Wins in Ladder, Daily Challenge and Conquest (later also Guardian, Heat and Featured) add 1 to `wins`, up to 45 (three chests).
- At 15 wins a chest is full. One chest can be opened per ISO week (Monday 04:00 local); opening uses 15 wins. The reward is unchanged: a Wardrobe Crate and an Age Capsule.
- Progress never resets. Home shows "War Chest 12/15" and, when a chest is waiting, "Ready"; there is no countdown.
- **Why not E2's stamp card:** a stamp for "the first win of each day" is a reward for coming back on a calendar, the pattern the KIDS Act proposal targets. The War Chest keeps the forgiving part (nothing resets) and drops the daily gate.

### EL-5 Reward parity across match formats

| | |
|---|---|
| Fantasy | "Playing all the way to lasers is worth it." |
| Levers | Protects Pillar 2 (evolving) and the Future Age content |
| Ethics | **Healthy:** rewards per minute are equal, not higher for playing longer |
| Offline | Data |
| Needs | WP1: `formats` gain `trophyWin` and `amberWin`; WP7 reads them; WP9 shows them on the format picker; A2.10's "rewards are the same for every format" and A2.14 change (new Standard War median target of 5:40). Contract: two fields on the content format type |
| Size, phase | XS · v1 Phase 2b |
| From | N3 |

**Rules**

| Format | Median | Win trophies | Loss | Win Amber (no charge) | Trophies per minute at 60% wins |
|---|---|---|---|---|---|
| Short War | 4:30 | +26 | −20 | 20 (40) | 1.69 |
| Standard War | 5:40 (new target) | +30 | −20 | 25 (50) | 1.76 |
| Full War | 7:00 | +34 | −20 | 30 (60) | 1.77 |

Loss rules (0 below 400, never below the arena gate), MMR and charges are unchanged. Today Short War earns about 55% more trophies per minute than Full War; with this table the spread is under 5%.

### EL-6 Play-time tools and night note

| | |
|---|---|
| Fantasy | "The game respects my time." |
| Levers | Self-regulation; the "partition" effect that helps people stop (psychology 4.2) |
| Ethics | **Healthy.** Anticipated by the DSA guidelines and the KIDS Act proposal |
| Offline | Local clock only |
| Needs | WP9 Settings section and Result line; WP11 active-time counter. Contract: `Settings` gains `breakReminderMin: 0 \| 30 \| 60 \| 90` and `nightNote: boolean`; `SaveDoc.stats` gains `playTime: { dayKey: string; ms: number }` |
| Size, phase | S · v1 Phase 3 |
| From | E20, Psy-audit 22 |

**Rules**

- Settings > Wellbeing shows "Play time today: 47 min" (time the app is visible and not idle for more than 60 s; resets at 04:00).
- **Break reminder:** Off / 30 / 60 / 90 min (default Off; 60 in the minor-safe profile, EL-31). It appears only on a Result screen, never in battle: "You've played 60 minutes. A good moment for a break? Everything waits for you." Buttons: Home / Keep playing. It never locks the game.
- **Night note** (default On): a match that ends between 22:00 and 06:00 local adds one line to the Result screen: "Late battle. Your rewards will wait until tomorrow."

### EL-7 Visible rank and the Hall of Generals

| | |
|---|---|
| Fantasy | "I'm a Tier VI commander, and my portrait is up there between Rook and Madame Tempest." |
| Levers | Competence and status (3.1, 3.12), goal gradient to the next rung |
| Ethics | **Grey** (social comparison). Safeguards: comparison is against named, labelled AI characters and the player's own past, never an imitation population (E18 is rejected, section 12); no bottom ranks |
| Offline | Uses the existing hidden MMR (A6.8) |
| Needs | WP7: export a pure `skillTier(save)`; WP9: rank chip on Home and Profile, "ladder view" on the Conquest screen (A9 #17); strings |
| Size, phase | S · v1 Phase 3 |
| Battle link | Every rung is a General to beat |
| From | N10 |

**Rules**

- **Skill tier** = `clamp(round((MMR − 870) / 100), 0, 10)`: the A6.8 formula without the arena clamp, so it shows true skill. Home and Profile show "Rank: Tier VI". Tooltip: "Your skill rating. It rises when you beat stronger AI and falls when you lose to weaker AI."
- Profile adds "Highest tier beaten" per format (from the existing wins-by-tier stats).
- **Hall of Generals:** the Conquest screen gains a ladder view with the 9 Generals as rungs ordered by tier (plus guests from v1.1), each with its AI badge. The player's portrait sits just above the highest General they have beaten. Heat flames (EL-15) decorate each rung.

### EL-8 "What went well" line and personal records

| | |
|---|---|
| Fantasy | "The game noticed my turret wall held." / "I'm faster than I was a month ago." |
| Levers | Informative feedback supports intrinsic motivation, where rewards for just playing undermine it (3.1, psychology finding 14); self-comparison (3.3) |
| Ethics | **Healthy** |
| Offline | Local stats |
| Needs | v1 Phase 3: WP9 plus a pure selector over the existing `MatchStats`. v1.1: `SaveDoc.records: Record<RecordId, number>` and a 30-day ring of daily aggregates; Profile "Records" tab |
| Size, phase | S · v1 Phase 3 (line), v1.1 (records) |
| From | Psy 3.1, Psy-audit 18, E6 (records part) |

**Rules**

- **Result line** (every match): one highlight, picked by priority when a stat beats the player's average of the last 20 matches: turret kills, Anti-armor kills on Heavies, most hits from one Age Power, evolving first in every age, base damage, a Last Stand win. Example: "Your turrets held the line: 14 kills (your best this week)."
- **Records** (v1.1): fastest Future Age (Full War); fastest win per format; biggest comeback (lowest own base HP in a win); most kills in one match; most enemies hit by one power; highest tier beaten per format. There is deliberately no win-streak record.
- **You vs 30 days ago** (v1.1): three lines on the Profile: average first-evolve time, win rate against your own tier, average base HP left in wins.

### EL-9 Save image

| | |
|---|---|
| Fantasy | "Look what I pulled!" |
| Levers | Sharing, identity, peak moments |
| Ethics | **Healthy.** Export only; no reward for saving or sharing |
| Offline | `canvas.toBlob` then a download, or the Web Share API with a file on mobile; no network |
| Needs | WP10 (walkout frame), WP9 (result card), WP11 (share helper). No contract change |
| Size, phase | S · v1 Phase 3 |
| From | N4 (first part), market-portals clip advice |

**Rules**

- A "Save image" button on the final frame of a first-time Legendary walkout, on the Result recap, and on a feat card (EL-10). v1.1 adds season pennants and recap cards; v1.2 the Hall of Ages.
- Image 1080 × 1350 with a small "Ageborn" watermark. Builds with `externalLinks` may add the site address; Poki builds never do.
- Only the auto-generated name ("Chief-4821") can appear on an image, and only if the player turns it on.

### EL-10 Hidden feats and secrets

| | |
|---|---|
| Fantasy | "Wait, my caveman just killed a laser knight? There's a secret for that!" |
| Levers | Curiosity gap (3.14), discovery (3.20), mastery (3.3), and the genre's funniest clip moment |
| Ethics | **Healthy.** Cosmetic rewards; after 60 days a riddle turns into a plain description so nobody is locked out |
| Offline | Detected locally from the match's `SimEvent` stream |
| Needs | WP1: `src/content/feats.ts` (predicates, rewards, strings). WP7: a pure `detectFeats(events, stats, content)`; the app passes the match's events after it ends, so `MatchStats` does not change in v1. WP9: Collection > Feats tab ("???" rows) and a result reward step. Save: `flags['feat.<id>']` in v1 (no shape change); a `feats` field from v1.1 |
| Size, phase | S · v1 Phase 3 (12 feats), v1.1 (30 feats plus secrets); each new age adds about 5 |
| Battle link | Almost every feat is a thing to try in a battle |
| From | N13, E14 |

**Rules**

- A feat shows as "???" plus a one-line riddle until found. It counts in every mode except the v1.1 "Who wins?" sandbox, so players can experiment in Skirmish.
- **Reward** per feat: +3 Codex points (from v1.1, EL-13) and one of a title, a lore line, or 100 Dust in v1. From v1.1 some feats also give emotes or banner trims.
- **Hint rule:** 60 days after the Feats tab unlocks for a save, each unfound riddle turns into a plain description.
- **Predicate vocabulary** (data, interpreted by the detector): `killAcross { killerAge, victimAge, killerCard?, victimRole?, min }`, `winWithout { turrets | treasury | lastStand | evolvePast: age }`, `finalBellMarginBp ≤ n`, `winFromBaseBp ≤ n`, `powerHits ≥ n`, `lastStandKills ≥ n`, `reachAgeBeforeMs { age, ms, format }`, `winWhileBehindAges ≥ n`, `planOnly: rarity`.

**The 12 feats for v1**

| Feat | Riddle | Condition |
|---|---|---|
| Caveman Diplomacy | "Old bones, new tricks." | A Stone Age unit lands the killing blow on a Future Age unit |
| Ivory Beats Iron | "Tusks against treads." | A Tuskback or Mammoth Matriarch kills a Modern Heavy |
| Arrows into Tomorrow | "The sky of the past rains on the future." | Arrow Storm kills 3+ Modern or Future units in one cast |
| Stubborn | "Some never leave the castle." | Win a Standard or Full War without evolving past Medieval |
| No Walls | "Who needs towers?" | Win a Full War without building a turret |
| Photo Finish | "By a hair." | Win at the Final Bell by 2% base HP or less |
| Horn of Legends | "One last blast." | A Last Stand volley kills 8+ units |
| Lightspeed | "Clubs to lasers, fast." | Reach the Future Age before 4:00 in a Full War |
| Underdog | "Two ages behind, still standing." | Win after the opponent was two ages ahead of you |
| Humble Beginnings | "Commons can conquer." | Win a Full War with only Common cards and default powers in the plan |
| Back from the Brink | "Almost dust." | Win after your base fell below 5% HP |
| Seven at Once | "One power, a crowd." | Hit 7+ enemies with one Age Power |

**Secrets** (v1.1, 3-5 of them, cosmetic): for example, tap the moon on the Future title-screen skyline 7 times for an emote, or enter a phrase printed in a General's lore for a banner trim.

### EL-11 Battle resume

| | |
|---|---|
| Fantasy | "My phone killed the tab mid-battle, and I just carried on." |
| Levers | Autonomy, avoiding frustration quits (psychology 3.1) |
| Ethics | **Healthy** |
| Offline | Deterministic sim plus the recorded command log |
| Needs | WP11: persist `{ matchConfig, tick, commands }` on `visibilitychange` (hidden) and every 10 s in battle, under a separate key (request to WP8); rebuild with `replayMatch(r, content, toTick)` (B15); re-run the bot controllers from tick 0 over the log to restore their internal state, and check that they re-emit the recorded bot commands |
| Size, phase | M · v1 Phase 3 if capacity allows, else v1.1 |
| From | N11 |

**Rules**

- On boot, a resume record younger than 24 hours offers "Resume battle vs AI · Captain Kettle (3:12)?" with Resume and Abandon.
- **Abandon** counts as a Retreat (a loss, as A2.10), so killing the tab cannot be used to dodge a loss.
- If the rebuild fails its check, the match is **void**: no trophy or MMR change, and +1 Clay pip.

---

## 5. The years engine (Clash of Clans / Hay Day without timers)

The Clash of Clans feeling comes from many parallel medium goals, a place that visibly grows, a new top step at a regular rhythm, and a group (benchmarks section 4). Ageborn gets the first three offline, and the group later. It keeps Hay Day's best rule: nothing withers. It takes none of their timers.

### EL-12 Post-max sinks: star levels, foil crafting and the Holo compass

| | |
|---|---|
| Fantasy | "My Pikeman is maxed, and now I'm polishing him: three gold stars and a Holo frame." |
| Levers | Collection with reachable completion (3.9), goal gradient (3.7), autonomy (which card to polish), competence on display |
| Ethics | **Healthy.** Cosmetic only, prices visible, no time limits, never in the lane |
| Offline | Local rules and data |
| Needs | WP1: `src/content/prestige.ts` (star costs, foil prices, compass size). WP7: `buyStar`, `craftFoil`, the compass inside the roll (A6.4 step 5). WP9: Card detail buttons, Collection filters. WP4: star pips and frames. Save: collection entries gain `stars: 0-3`; `pity` gains `sinceHolo` |
| Size, phase | M · v1.1, and it **must ship before launch + 5 months** |
| Battle link | Amber and Dust come from battles; the sinks give every later battle a payoff |
| From | N2, E21, D1 star levels (moved up from v1.2) |

**Rules**

- **Star levels (Amber).** Only for L10 cards. ★1 2,000 · ★2 5,000 · ★3 10,000 Amber (17,000 per card; 935,000 for all 55). Effects: star pips on the card frame (tray, War Plan, Collection), the statue material in the Hall of Ages (EL-16), +5 Codex points per star. Stars never change stats and never appear in the lane. At the A6.9 surplus of about 1,700 Amber a day, all stars take about 18 months (about 3 years for a casual player).
- **Foil crafting (Dust).** Only for L10 cards. Crafting a higher foil than the one owned costs the difference between the two prices.

  | Foil | Common | Rare | Epic | Legendary | Full set |
  |---|---|---|---|---|---|
  | Bronze | 500 | 1,000 | 3,000 | 8,000 | 97,500 |
  | Silver | 2,000 | 4,000 | 12,000 | 32,000 | 390,000 |
  | Holo | 5,000 | 10,000 | 30,000 | 80,000 | 975,000 |

  At the modelled post-max income of about 1,200 Dust a day: the Bronze set takes about 81 days, and the Silver set about 11 months.
- **Holo compass.** Counts capsule stacks since the last new Holo. At 200, the next stack whose card lacks a Holo becomes Holo. The counter is shown with the other pity counters ("Holo compass 143/200"). An engaged player opens about 19 stacks a day, so the compass alone completes all 55 Holos in at most about 19 months; Dust crafting speeds that up.
- New foil tiers give Codex points: Bronze +1, Silver +2, Holo +4.

### EL-13 Codex Level extended, with prestige (the "Town Hall")

| | |
|---|---|
| Fantasy | "I'm Codex 150, Keeper of Ages. My Hall just became a Spire." |
| Levers | Endowed progress and goal gradient (3.7), long nested goals, status (3.12, 3.19) |
| Ethics | **Healthy.** Codex never decreases; there is no reset-for-bonus prestige |
| Offline | Local |
| Needs | WP1: `prestige.ts` point sources, frames, titles, Hall tiers. WP7: add the sources (each lands with its system). No save change (`codexPoints` and `codexLevel` exist) |
| Size, phase | S · v1.1 |
| Battle link | Every source is earned in or through battles |
| From | New (reuses A6.7 instead of adding a "Renown" counter) |

**Rules**

- Keep A6.7 unchanged (15 points a level, 100 Amber a level, Codex Capsule and Wardrobe Crate every 5 levels, frames at 5-75). Add point sources:

| Source | Points | Maximum with v1.2 content | Levels |
|---|---|---|---|
| Card upgrade (A6.7, exists) | C 1 / R 2 / E 4 / L 8 | 1,215 | 81 |
| Star level (EL-12) | 5 | 825 | 55 |
| Card Mastery level (EL-14) | 2 | 650 | 43 |
| New foil tier on a card | Bronze 1 / Silver 2 / Holo 4 | 385 | 26 |
| Museum set completed (EL-22): age set grades, relic sets, lore chronicles | 10 | 400 (40 sets) | 27 |
| New relic / gilded relic (EL-23) | 1 / 2 | 360 | 24 |
| Heat first clear (EL-15) | 3 | 270 | 18 |
| Feat (EL-10) | 3 | 90 (30 feats) | 6 |
| Guest General trophy (EL-19) | 5 | 60 | 4 |
| **Finite total** | | **4,255** | **about 284** |
| Renewable: season pennant 5 a month, charted map 1 a week, puzzle set 1 a week | | about 164 a year | about 11 a year |

- Each new age wave (D1) adds about 40 levels (upgrades, stars, mastery and sets of 11 new cards).
- **Prestige rewards:** frames at Codex 100, 150, 200 and 250; titles at 100 "Chronicler", 150 "Keeper of Ages", 200 "Aeonwright", 250 "Ageless". Hall of Ages tiers (EL-16) at 20, 60, 120, 170 and 240.
- **Targets for an engaged player** (the horizon report tunes the thresholds to hit them): Codex 60 at about month 3, 120 at about month 7, 170 at about month 12, 240 at about month 22.

### EL-14 Card Mastery

| | |
|---|---|
| Fantasy | "I've mastered every Stone card. Next I'm learning the Gyrocopter." |
| Levers | Mastery (3.3), variety against a stale meta (3.15), collection of badges (3.9), curiosity (a lore line at the top) |
| Ethics | **Healthy, with one grey part:** points partly reward just using a card. Safeguards: the top level needs a skill feat; Skirmish does not count, so it cannot be farmed; no time limits |
| Offline | Local |
| Needs | WP2: `MatchStats` gains `cards: Record<CardId, { uses: number; kills: number; value: number }>` and `powerBestHits: Record<CardId, number>` (`value` is the metric the MVP reducer already computes). WP1: `mastery.ts`. WP7: award rules. WP9: bar on Card detail, badge on card frames, result step. Save: `mastery: Record<CardId, { pts: number; level: number }>`. Contract changes: `MatchStats`, `RewardStep` (`mastery`) |
| Size, phase | M · v1.1 |
| Battle link | Points come only from battles, and rotating cards changes how you play |
| From | E6, Psy-E |

**Rules**

- **Tracks:** all 55 cards plus the 10 Age Powers (65 tracks).
- **Points** per match in Ladder, Daily, Conquest or Heat, Guardian or Featured where the card was used (trained, built or cast at least once): +1; +1 more if you won; +2 more if it was the MVP card.
- **Levels:** M1 10 · M2 40 · M3 100 · M4 200 · M5 350 points **and** the card's mastery feat:
  - units and turrets: be the MVP in a win against tier V or higher
  - Age Powers: hit 6 or more enemies with one cast in a win
- **Rewards:** M1 50 Dust · M2 100 Dust · M3 150 Dust and a bronze badge · M4 250 Dust and a silver badge · M5 400 Dust, a gold badge, the card's lore line and its Hall statue (EL-16). +2 Codex points per level.
- **Pacing:** a card in regular use earns about 7 points a day (M4 in about a month, M5 in about 7 weeks plus the feat). Mastering all 65 needs rotation: about 6-12 months for an engaged player.

### EL-15 Chrono Heat (Conquest after 27 stars)

| | |
|---|---|
| Fantasy | "Pip Quickstep at Heat 9 plays like The Warden. I finally beat her." |
| Levers | Mastery with rising challenge (3.3), flow (3.2); the cheapest "forever" content (Slay the Spire Ascension, Hades Heat) |
| Ethics | **Healthy.** Opt-in; bots keep every A7.1 rule; the player's handicaps are their own choice and shown on the VS screen |
| Offline | Local; reuses Conquest (A6.10) |
| Needs | v1.1: WP1 `heat.ts`; WP7 Conquest state `heat: Record<generalId, number>` and `pickOpponent('conquest', { heat })`; WP9 flames on the board and VS disclosures. v1.2: `SideConfig` gains `handicaps: string[]`, applied by the sim (WP2); this is part of the battle slice, so it changes `contentHash` and `SIM_VERSION` |
| Size, phase | S · v1.1 (tier and level), M · v1.2 (handicaps) |
| Battle link | Every Heat level is a battle |
| From | E7, Psy-G |

**Rules**

- A General's Heat unlocks after its 3 Conquest stars. Heat 1-10 unlock in order. Retries are free; no charges, no trophies, no MMR (as Conquest).
- **Heat k** raises the General's tier by k (maximum X) and its card level by k (maximum 10), both starting from the A6.10 values. When both are capped, each further Heat level adds the next **player handicap** (v1.2), cumulatively:
  1. your Treasury maximum is level 1
  2. your turret mounts maximum is 3
  3. your army cap is 50 (from 60)
  4. your Age Power charges ×0.8
  5. you have no Last Stand
  6. your starting gold is 100 (from 175)
  7. your turret mounts maximum is 2
  8. your army cap is 40
  9. your evolve XP thresholds ×1.1
- v1.1 therefore offers 45 Heat levels (Pip 9, Kettle 8, Moss 7, Ledger 6, Boomsworth 5, the Twins 4, Rook 3, Tempest 2, The Warden 1), and v1.2 completes all 90.
- **Rewards** per first clear: 150 Dust and +3 Codex points. Heat 5: a bronze bust of the General for the Hall and its portrait frame. Heat 10: a golden bust and the General's crown banner trim. All 9 Generals at Heat 10: the title "Timebreaker" and the Chrono Crown frame.

### EL-16 Hall of Ages

| | |
|---|---|
| Fantasy | "My own fortress across time. It started as a campfire; now it's a Citadel full of statues of my veterans, the relics I dug up and the busts of every General I broke." |
| Levers | IKEA effect and ownership (3.11), identity (3.19), collection on display (3.9), long nested goals, nostalgia (clubs to lasers in one building) |
| Ethics | **Healthy.** It is Hay Day's farm without timers, harvests, decay, repairs or raids |
| Offline | Fully local; a layout code lets friends view it (EL-28) |
| Needs | WP1: `hall.ts` (tiers, plinths, wall slots, item rules). WP7: pure derivation of unlocked items. WP4: diorama parts; statues are the existing unit rigs drawn with a stone, bronze, silver or gold material filter (manifest entries `statue.<card>@<material>`); wings reuse the age backdrops (A11). WP9 and WP5: a Pixi scene with a DOM placement editor. Save: `hall: { layout: Record<SlotId, ItemId>; baseTrophies: ItemId[] }` |
| Size, phase | L · v1.2 |
| Battle link | Every item is won in battle, and two chosen items appear on your base in every match (EL-26) |
| From | Psy-F, N9, E13 |

**Rules**

- **Scene:** a side-view diorama in the battle art style with 5 wings, Stone to Future, left to right. It is the Home screen backdrop, a full-screen Hall view, and a thumbnail on the Profile and VS card.
- **Tiers** (by Codex Level, EL-13): Camp (1), Longhouse (20), Keep (60), Citadel (120), Spire (170), Aeon Spire (240). Each tier redraws the building and adds 2 plinths to every open wing (2, 4, 6, 8, 10, 12). Each wing has 4 wall slots.
- **Wings** open when the player owns all 11 cards of that age (Age Set, EL-22). A new age (D1) adds a wing.
- **Items** (all unlocked by achievement, none bought): card statues (at Mastery 5 or ★1; material stone, then bronze ★1, silver ★2, gold ★3), relics and gilded relics (EL-23), General busts (EL-15), guest trophies (EL-19), arena trophies (the 8 gates) and the Warden trophy, feat plaques (EL-10), season and anniversary pennants on the walls (EL-18, EL-30), set centrepieces (EL-22).
- **Placement:** drag any item to any plinth or wall slot; an "Arrange for me" button; the layout is saved.
- **Base trophies:** choose up to 2 items to show as small décor on your base in battle (EL-26).
- **Never:** timers, resources to collect, decay, repairs, raids, visitors that demand attention.

---

## 6. Rhythm and novelty: seasons and rotating events

### EL-17 Living Calendar

| | |
|---|---|
| Fantasy | "Something is always coming up, and I can see what." |
| Levers | Novelty and variety (3.15), anticipation without pressure (3.5), fresh starts at week and month boundaries (3.17) |
| Ethics | **Healthy.** Every entry recurs; there are no exclusives; dates are shown, never countdowns |
| Offline | Deterministic from the local date, the same for everyone, like A9.1; runs for 24 months without a new build, then repeats |
| Needs | WP1: `src/content/calendar.ts` (curated rows). WP7: pure `calendarFor(dateKey)`. WP9: a "This week" panel and "Coming up" (next 3 weeks) on Home. WP12: a validator test |
| Size, phase | S code plus curated data (M authoring effort) · v1.1 |
| Battle link | Every entry is a battle variation or something battles earn |
| From | N7, E9, E11 (cosmetic part only) |

**Rules**

- **Weekly row** (keyed by ISO week): featured mode (EL-20), the 2 featured relic sets and the guardian personality (EL-23), the puzzle set (EL-25).
- **Monthly row** (keyed by calendar month): season theme and banner (EL-18), guest General (EL-19), featured age (Home music, backdrop tint and the season banner's style; this is E11's Age Festival without the odds boost).
- **Validator rules:** no two adjacent weeks share a featured mode; every relic set is featured at least once every 10 weeks; every featured mode returns within 6 weeks; every guest returns in the same month each year.
- Clock tampering is accepted (A6.3); it can only reveal future entries early.

### EL-18 Seasons

| | |
|---|---|
| Fantasy | "New month, new road, new pennant. Last season I reached Tier VIII; this time I want Gold." |
| Levers | Fresh start (3.17), goal gradient (3.7), status (3.12), novelty of the theme (3.15) |
| Ethics | **Grey** (a time-boxed track). Safeguards: every season theme and its banner return in the same month next year, and the banner can be crafted with Dust (600) from the month after its season; rewards reached but not tapped are granted automatically at season end; no copy frames unreached nodes as lost; only a date appears ("Season ends 31 Oct"), no timer on Home; MMR and trophies never reset |
| Offline | Season = local calendar month |
| Needs | WP1: `seasons.ts` (12 themes, road nodes). WP7: season rollover (grant, pennant), stars from results. WP9: Season screen and a Home bar in the Trophy Road style. Save: `season: { id: string; stars: number; claimed: number; bestTier: number }`; pennants in `cosmetics.owned`. Contract: `RewardStep` gains `seasonStar` |
| Size, phase | M · v1.1 |
| Battle link | Only wins earn Season stars |
| From | Psy-D, E8 (without card bans) |

**Rules**

- A season runs from the 1st of each local month at 04:00. There are 12 recurring themes, for example: Frostfang (January), Thaw (March), Harbor Days (July), Pumpkin War (October, the Pumpkin Head skin's month), Aeon Night (December).
- **Season stars:** +1 per win in Ladder, Daily Challenge, Conquest or Heat, Guardian (v1.2) and Featured (v1.2); +1 per completed puzzle set (v1.2). Skirmish and friend matches give none. Losses are covered by the Clay meter (A6.3).
- **Season Road:** 20 nodes, one every 3 stars (60 stars in total).
  - 300 Amber at nodes 1, 3, 7, 9, 11, 13, 17, 19
  - 150 Dust at nodes 2, 4, 6, 8, 14, 16, 18
  - an Age Capsule at nodes 5, 10, 15
  - a Wardrobe Crate at node 12
  - the season banner and 500 Dust at node 20

  Per season: 2,400 Amber, 1,550 Dust, 3 Age Capsules, 1 crate, 1 banner. An engaged player (about 5 wins a day) finishes in about 12 days; a casual player (about 2 wins a day) in about 4 weeks. After node 20: "Season Road complete. Your wins still earn everything else."
- **Season best:** the highest AI tier beaten this season in any mode except Skirmish and friend matches. At rollover the player receives the season's pennant in that grade: Stone (tier 0-II), Bronze (III-V), Silver (VI-VIII), Gold (IX), Aeon (X). Pennants hang in the Hall and give +5 Codex points.
- **Economy:** about +80 Amber a day (+5%) and about +2.5% copies. Rerun `sim:economy` (B12).
- **Rejected from E8:** banning the player's 8 most-used cards takes away their identity. Card Mastery (EL-14) rewards variety instead.

### EL-19 Guest General of the month

| | |
|---|---|
| Fantasy | "Professor Tock is back this month! He always evolves at the last possible second." |
| Levers | Novelty (3.15), character (3.20; chess.com's labelled bot "Mittens" drew about 40M games in a month), mild collection |
| Ethics | **Healthy.** Labelled AI; same rules (A7.1); nothing missable, because after its first month a guest stays in Skirmish for good |
| Offline | Content data |
| Needs | WP1: 12 guests in `generals.ts` (weights, War Plan, VS line, portrait parts, tier range). WP7: guest chance in `pickOpponent`. WP9: "Guest" badge on VS |
| Size, phase | S · v1.1 |
| Battle link | Guests are opponents |
| From | E9 |

**Rules**

- Each guest has a quirk expressible in the existing rules (for example "never builds turrets", "only Ranged units until Gunpowder", "evolves as late as possible", "Treasury 3 by 2:00").
- During its month a guest appears in 1 of 10 ladder matches where its tier range fits the arena, as the Daily opponent on the days the calendar picks, and as a Guardian (v1.2).
- **Guest trophy:** beat the guest once at tier V or higher, in any mode including Skirmish. Reward: a Hall trophy and +5 Codex points. The guest returns to the ladder in the same month every year.
- Once a year one guest may be **"Tier ???"**: the VS screen says "Tier hidden until the end", and the Result screen reveals it. It is disclosed as hidden, never shown as a false tier.

### EL-20 Featured mode slot

| | |
|---|---|
| Fantasy | "Draft War week! I have to build a plan from what I'm offered." |
| Levers | Novelty (3.15), autonomy; a second mode brings lapsed players back (Clash Royale's Merge Tactics, benchmarks 3.3) |
| Ethics | **Healthy.** Core modes are always on; every featured mode returns within 6 weeks; no exclusive rewards |
| Offline | Local; draft offers are seeded |
| Needs | WP1: `featuredModes.ts`. WP7: draft plan generation, mirror plan copy, rewards. WP9: a fifth tile on Mode select. Contract: `MatchResultInput.mode` gains `featured` |
| Size, phase | M · v1.2 |
| Battle link | It is a battle mode |
| From | E17 |

**Rules**

- **Pool at v1.2:**
  - **Draft War:** Standard War at Standard levels (L7). For each age, pick 5 units, each from 3 offers, then 1 turret from 3 and 1 power from 2. Offers come from the full pool, owned or not. The AI drafts the same way from its seed.
  - **Mirror Match:** both sides use your War Plan.
  - **Blitz:** Short War with Gold Rush and Fast Forward.
  - Later: Endless Horde and kaiju weeks (D1).
- **Rewards:** wins count for Season stars, the War Chest, Expedition digs and quests. The first 3 wins each week also pay +100 Amber.

### EL-21 Rest bonus

| | |
|---|---|
| Fantasy | "Welcome back, Chief." |
| Levers | Rewards returning without punishing absence (3.17) |
| Ethics | **Healthy.** It rewards a return after absence, not regular logins; no guilt copy ("we missed you" is forbidden) |
| Offline | Local clock |
| Needs | WP7 rule; WP9 banner. Save: `rest: { lastMatchAt: number; bonusWins: number }` |
| Size, phase | S · v1.1 |
| Battle link | The bonus is paid on wins |
| From | Psy-H, E3 |

**Rules**

- When at least 48 hours have passed since the last finished match, the next 3 wins pay +50% Amber and +1 extra Season star each. It does not stack.
- Home banner: "Welcome back, Chief. Your next 3 wins pay +50% Amber."

---

## 7. Discovery and collection: the treasure hunt

The Pokémon GO pull, taken apart (benchmarks section 5), is rarity along independent axes (place, time, weather), a shared world people map together, a dex that shows what is missing, rare "shiny" variants, and movement as the cost of searching. Offline and without GPS, **place** becomes the map's age layers and the arena, **weather** becomes the day's modifier, the **shared world** becomes a weekly seed, **shiny** becomes gilded relics and foils, and **movement** becomes playing matches. **Time of day** is dropped on purpose (children, night play).

### EL-22 Museum: albums and sets

| | |
|---|---|
| Fantasy | "Two relics left for the Harbor Hoard. I can see their silhouettes." |
| Levers | Collection and set completion (3.9), curiosity through silhouettes (3.14), goal gradient |
| Ethics | **Healthy.** Every piece has a crafting path; no trade-only or window-only pieces |
| Offline | Local |
| Needs | WP1: `museum.ts` (set definitions). WP7: completion checks and claims. WP9: an "Album" tab in Collection (A9 #10). Save: `museum: { claimed: string[] }` |
| Size, phase | S · v1.1 (age sets, feat sets, pennant wall), M · v1.2 (relic sets, lore) |
| Battle link | Pieces come from battles, maps and feats |
| From | Psy 3.9, E13, K5 |

**Rules**

- **Age sets** (5 ages × 3 grades): Owned (all 11 cards of the age): the age's animated banner, a lore page and opening its Hall wing. Mastered (all 11 at L10): a plinth trim. Gilded (all 11 at Silver foil or better): a gilded wing (v1.2).
- **Other sets:** feat sets (grouped by age), the pennant wall (12 season themes), and from v1.2 relic sets (20 sets × 6 relics, each with a gilded variant) and lore chronicles (5 ages × 12 pages).
- **Completion:** +10 Codex points per age-set grade, relic set and lore chronicle (40 in all with v1.2 content); feat sets and the pennant wall are display groups whose items already give points. A complete relic set also gives a Hall centrepiece.
- **Crafting fallback:** a relic that has appeared on any Expedition map since the player's first expedition can be crafted: relic 300 Dust, gilded 1,500 Dust, lore page 100 Dust.

### EL-23 Rift Expedition (the treasure map)

| | |
|---|---|
| Fantasy | "This week's Rift map: my trail clues point down into the Stone layer. Three more digs and I'll find the gilded Amber Beetle, and my friend says there's a guardian next to it." |
| Levers | Curiosity and discovery (3.14, 3.20), collection (3.9), autonomy (where to dig), competence (reading the trails), a variable reward inside a **disclosed, finite** set, a shared world (relatedness), goal gradient, a natural stop |
| Ethics | **Healthy.** Composition disclosed ("hide content, never odds"); no real location; no time-of-day windows; nothing expires (past maps stay open); relics are cosmetic; crafting fallback. The weekly map is a new invitation, never a deadline |
| Offline | Seeded by ISO week, so every player has the same map that week with no server, like the Daily's date seed; the community can compare and map it together, as Pokémon GO players mapped nests |
| Needs | WP1: `relics.ts` (sets, relics, visual ids, strings), `expedition.ts` (composition, rewards), weekly calendar sets. WP7: pure `expeditionMap(weekKey, content)`, `dig(save, weekKey, tile)`, `pickOpponent('guardian')`. WP9 or WP5: the Expedition screen (grid, fog, dig animation). WP4: relic icons and map tiles in each age's palette. Save: `expedition: { digs: number; firstWeek: string; maps: Record<WeekKey, { revealed: number; guardians: number }> }` (a 24-bit mask and a 2-bit mask per week), `relics: Record<RelicId, 0 \| 1 \| 2>`, `lore: Record<AgeId, number>`. Contracts: `MatchResultInput.mode` gains `guardian`; `RewardStep` gains `dig` |
| Size, phase | L · v1.2 (the headline treasure feature, alongside the Bronze Age) |
| Battle link | Every dig is a finished match, and two tiles per map are guardian battles |
| From | E12 (weekly, archive, no time windows), Psy-A, P-7 |

**Rules**

- **Unlock:** Arena 3 (with Conquest).
- **Map:** one per ISO week (from Monday 04:00 local), seed `hash('rift', isoYear, isoWeek)`. A 5 × 5 grid whose rows are age layers: the top row is Future, the bottom row Stone ("dig deeper, go further back"). The centre tile is the Camp, already revealed.
- **Composition** (shown on the map screen): 24 hidden tiles = 1 Gilded Relic, 4 Relics, 2 Guardians, 2 Lore pages, 6 Caches, 9 Trails. A relic always lies in the row of its age. Guardians are never next to the Camp.
- **Digs:** +1 per finished match in Ladder, Daily Challenge, Conquest or Heat, Guardian or Featured (win, loss or draw; Retreat and void matches do not count). Skirmish gives none. Digs bank with no cap and never expire.
- **Digging** reveals one hidden tile next to (orthogonally) any revealed tile, so the fog opens outward from the Camp.
- **Tiles:**

  | Tile | Contents |
  |---|---|
  | Trail | An arrow toward the nearest hidden Relic or Gilded tile (Manhattan distance; ties point to the Gilded), plus 20 Amber |
  | Cache | 150 Amber or 60 Dust (from the seed) |
  | Lore page | The next unread page of that row's age chronicle; if all are read, 100 Dust |
  | Relic | A relic from one of the week's 2 featured sets (EL-17); a duplicate gives 100 Dust |
  | Gilded Relic | The gilded variant of a relic from the featured sets; a duplicate gives 400 Dust |
  | Guardian | Sealed: "AI Guardian · <personality>". A Standard War at your skill tier and your arena's bot level, with today's Daily modifier as the "weather". Win to open: 1 relic and 200 Dust. Retry freely; no charges, no trophies, no MMR |

- **Map charted** (every tile revealed and both guardians beaten): 300 Dust and a stamp in the Atlas (a count of maps charted, +1 Codex point).
- **Archive:** unfinished maps from every past week since the player's first expedition stay open forever. The Expedition screen shows "This week" and "Unfinished maps (n)"; the player chooses where each dig goes.
- **Pacing:** about 26 matches chart a map, so about 4 days for an engaged player and 8-9 days for a casual one (the next map simply waits). Relic collection (120 relics, 120 gilded) takes about 1.5-2 years without crafting. The trail clues should find the Gilded in about 8-10 digs against about 13 at random; a solver in `tools/` checks this for every calendar seed.
- **Relic sets** (examples; own IP): Tar Pit Finds (Amber Beetle, Flint Comb, Clay Whistle, Bone Dice, Cave Handprint, Mammoth Tooth), Moat Treasures (Rusty Key, Jester Bell, Wax Seal, Stone Rook, Dragon Weathervane, Lute String), Harbor Hoard (Ship in a Bottle, Brass Compass, Powder Horn, Parrot Feather, Doubloon, Spyglass), Field Kit (Tin Soldier, Radio Valve, Ration Tin, Medal, Film Reel, Goggles), Rift Salvage (Photon Prism, Robot Hand, Hover Seed, Data Crystal, Pocket Singularity, Chrono Coin). v1.2 ships 10 sets (2 per age); content drops add the rest as data.
- **Economy:** about 630 Amber and 880 Dust per charted map (about +90 Amber and +125 Dust a day for an engaged player). With the Season Road this moves the Amber finish date (A6.9) from about 160 toward about 140 days, closer to the copy finish at about 135 days. Rerun `sim:economy` and trim cache Amber if the ±20% gate fails.

### EL-24 Rift Sightings (optional)

| | |
|---|---|
| Fantasy | "Did you see that? A dodo just walked across the Medieval skyline!" |
| Levers | The rare-variant ("shiny") hunt (3.4, 3.9), curiosity, clip moments |
| Ethics | **Grey** (a variable reward during battle). Safeguards: backdrop only, never in the lane band (Pillar 5, gallery test for contrast); no tap, so it never pulls attention from decisions; odds and pity disclosed; cosmetic only; with "reduce motion" it is logged but not animated |
| Offline | Rolled at match start from the match seed and the saved pity counter, stored in the match's view config; meta credits exactly what the view shows, and replays show it too |
| Needs | WP1: `sightings.ts` (20 creatures, 4 per age backdrop, pools by arena and modifier). WP7: `sightingFor(seed, arena, modifier, pity)`. WP4: creature visuals in the backdrop layer. Museum log. Save: `sightings: { seen: string[]; sinceLast: number }` |
| Size, phase | S · v1.2 (optional) |
| Battle link | You spot them only in battles |
| From | Psy-J, moved out of the lane as the gap analysis advised |

**Rules**

- Eligible matches: Ladder, Daily and Guardian. Chance 1 in 25; guaranteed within 60 eligible matches (visible counter in the Museum).
- The creature pool depends on the arena (place) and, on Daily matches, the modifier (weather). A creature crosses the far backdrop for about 8 seconds at a seeded moment.

### EL-25 Clutch Puzzles

| | |
|---|---|
| Fantasy | "Base at 12%, 50 seconds left, their Legendary is coming. Can I save it?" |
| Levers | Competence (3.1), a TikTok-sized unit of play with an ending, curiosity, clip bait |
| Ethics | **Healthy.** Finite sets of 5 with a stop card; no auto-chaining across sets |
| Offline | Puzzles ship as data mined from the headless sim |
| Needs | WP12: `tools/puzzles.ts` mines bot-vs-bot matches (tier VII, L7) for positions where a side at 20% base HP or less, with 45 s or more left, still wins, and re-mines automatically after every balance patch. WP1: `puzzles.generated.json` (seed, plans, format, take-over tick, command prefix, brief string, par time). WP11: start a session from a replay tick (`replayMatch(r, content, toTick)`, then live input for one side against the continuing bot). WP9: puzzle list. Contract: `MatchResultInput.mode` gains `puzzle`. Save: `puzzles: Record<string, 0-3>` |
| Size, phase | M · v1.2 |
| Battle link | Every puzzle is the last minute of a real battle |
| From | N6 |

**Rules**

- A puzzle lasts 30-90 s. ★ win or survive to the stated point; ★★ also keep your base at 10% or more; ★★★ also finish within the par time.
- A set of 5 each week (EL-17) from a pool of at least 300; all past sets stay available.
- **Rewards:** first ★★★ on a puzzle 30 Dust; a completed set gives +1 Codex point, +1 Expedition dig and +1 Season star.
- A share line ("Clutch #212 ★★★ in 0:48") and Save image on the result.

---

## 8. Identity, self-expression, shareable moments and the kid-safe profile

### EL-26 Identity in the lane

| | |
|---|---|
| Fantasy | "My Neon banner flies over my base, and my Warden bust sits on the wall. Everyone who watches my clips sees it." |
| Levers | Identity (3.19) with an audience; every clip becomes a showcase |
| Ethics | **Healthy.** Earned cosmetics only; the clarity rules hold |
| Offline | Local |
| Needs | WP4: manifest entries `base.banner.<id>` and `base.decor.<item>`. WP5: attach them to the base view. WP9: title plate in the HUD. The session passes side cosmetics to the view, not to the sim, so `contentHash` is unaffected (presentation fields are stripped, `decisions.md` WP1 "hash"). AI Generals show their own banners, and the AI label stays |
| Size, phase | M · v1.1 (banner, title plate), v1.2 (base trophies) |
| From | N9 |

**Rules**

- The equipped banner flies from a small pole on top of your base in every age; your title sits on a plate under your base HP bar; from v1.2, up to 2 Hall items appear as base décor.
- **Clarity (MUST):** outside team-colour zones and the lane band; no change to any hit area; a gallery test for every banner and décor item on every age's base (A5.8, A11).

### EL-27 Playstyle mirror

| | |
|---|---|
| Fantasy | "I'm a Turtle, apparently. The Twins are Rushers." |
| Levers | Self-knowledge and identity (3.19); it also powers friend ghosts (EL-28) |
| Ethics | **Healthy.** A mirror, not a judgement |
| Offline | Local stats |
| Needs | WP2: `MatchStats` gains `chargeMs`, `holdMs`, `treasuryLevelAt3Min`, `evolveLeadMs` (average lead over the opponent at each evolve), `powerCasts`, `powerHits`. WP7: classifier; a 30-match ring in the save. WP9: Profile and VS display |
| Size, phase | S · v1.1 |
| From | N8 |

**Rules**

- Six axes from the last 30 non-Skirmish matches, the same axes as the General personalities (A7.4): Aggression, Turret, Economy, Evolve greed, Power patience, Hold.
- Style = the axis furthest above the baseline measured in the Balanced mirror sim: Rusher, Turtle, Economist, Evolver, Power-timer, or Balanced if no axis is more than 15 points above.
- Shown on the Profile and the VS card ("Chief-4821 · Turtle"). A style title unlocks after 20 matches in that style.

### EL-28 Share codes and friend challenges

| | |
|---|---|
| Fantasy | "Beat my plan. Here's my code: it plays like me, and my time was 5:44." |
| Levers | Relatedness (3.1), friendly rivalry (3.12), the IKEA effect of a plan others fight (3.11) |
| Ethics | **Healthy.** Ghosts are labelled AI; no rewards for creating, sharing or redeeming codes; no "your code was used n times" counters; codes carry only the auto-generated name |
| Offline | No server: the deterministic sim and a short text code are enough |
| Needs | `src/core/codes.ts` (pure encode, decode, checksum; WP0 or WP12 by request). WP7: import validation. WP9: an "Enter code" field on Home and a share sheet. WP3: Echo with custom weights (Echo exists, A7.4). Contract: `MatchResultInput.mode` gains `friend` |
| Size, phase | M · v1.1 (War Plan and challenge codes), S · v1.2 (Hall code) |
| Battle link | Every code is a battle |
| From | E5, Psy-B, D1 "Ghost of You" |

**Rules**

- **Format:** `AGB1-` plus a Crockford base32 payload and a 2-character checksum. Plain text that pastes into the game (Poki-safe). Builds with `externalLinks` also offer a URL form.
- **War Plan code** (about 60 characters): 5 ages × 8 slots × a 7-bit card index. Importing creates a new preset; unowned cards show as silhouettes marked "Not owned".
- **Friend challenge code** (about 85 characters): War Plan, playstyle weights (EL-27), format, seed, the challenger's result (time, base HP, tier) and auto name. The friend fights **"AI · Echo of Chief-4821"** (the Balanced brain with the challenger's weights and plan, at Standard levels, tier chosen by the friend, default V). The Result screen compares: "You won in 5:02 · Chief-4821: 5:44". A reply code carries the friend's result back, and a local rivalry log keeps the score per friend.
- **Hall code** (v1.2): a read-only view of a friend's Hall, labelled "Hall of Chief-4821".
- **Rewards:** friend matches pay like Skirmish (5 Amber per win) and give no Season stars, digs or mastery.

### EL-29 Clips and kept moments

| | |
|---|---|
| Fantasy | "My best comeback is pinned forever, and I cut a 20-second clip of it." |
| Levers | Creation and sharing (the healthy half of TikTok, psychology 4.2), identity, peak memories |
| Ethics | **Healthy.** Export only: no in-game feed, likes, follower counts or rewards; the owner approves every marketing post (D1) |
| Offline | Local capture and re-simulation |
| Needs | D1 Clip Mode and the replay-to-clip renderer as designed. WP8: pinned replays exempt from the ring. WP1 and WP11: keep the compiled battle slice for each `contentHash` a pinned replay needs, as a lazy chunk |
| Size, phase | M · v1.1 |
| From | D1, N4 |

**Rules**

- **Auto-highlight triggers** (D1 list plus): feat unlocked, Last Stand volley with 5+ kills, a Final Bell photo finish, a guardian win.
- **Pinned replays:** up to 5, kept outside the ring of 20 (B8).
- **Old content:** pinned replays stay playable after balance patches through the kept battle slice. When `simVersion` itself changes, the game offers "Export as clip" before updating.
- "Stone to Future in 30 s" montage as in D1.

### EL-30 Your Year in Ageborn

| | |
|---|---|
| Fantasy | "One year: 1,204 battles, my favourite card was the Pikeman, and here is my best comeback." |
| Levers | Nostalgia, identity, peak-end at the year scale |
| Ethics | **Healthy.** Local data only; no ranking against others; highlights and matches, not hours |
| Offline | Local |
| Needs | WP9: 5 recap cards with Save image; WP7: the anniversary pennant. Save: yearly aggregates |
| Size, phase | S · v1.1 (must ship before launch + 12 months) |
| From | E16 |

**Rules**

- On the first launch after the save's anniversary: 5 cards (battles, favourite card, best comeback with Watch, feats and relics found, Hall growth and playstyle).
- An anniversary pennant (Year 1, 2, 3 …) is granted then. It can never be missed.

### EL-31 Minor-safe profile

| | |
|---|---|
| Fantasy | For parents and portals: "This game is safe for my 10-year-old." |
| Levers | Regulation insurance; the design goal that a child who plays once a week earns the same as one who plays daily |
| Ethics | **Healthy** |
| Offline | Data and flags; no new rules in `meta` |
| Needs | `platform.features.profile: 'standard' \| 'minorSafe'` (contract request), `src/content/profiles.ts`. The two switches `capsuleMode` and `calendarRewards` (law report P-1, P-2) are designed now but built only if the final KIDS Act text requires them |
| Size, phase | S · v1.1 |
| From | Psy-K (charges kept at 12, as the gap analysis advised), P-1, P-2 |

| Setting | Standard | Minor-safe |
|---|---|---|
| Wardrobe reveal | Card flip (EL-2) | Card flip; no reel option |
| Daily Capsule bank | 3 | 7 |
| Capsule charges bank | 12 | 12 (the rest bonus rewards returns instead) |
| Daily quests bank | 6 | 9 |
| Daily Challenge window | 7 days | 7 days |
| Break reminder | Off | 60 min |
| Night note | On | On |
| Vibration on reveals (A13) | Setting | Off |
| Names in share artefacts | Auto name, opt-in | None |
| Random capsules | As designed | As designed; switch to `disclosedCycle` (the next 10 tiers shown in advance) only if the final law requires it |
| Calendar rewards | Daily | Daily; switch to play-based only if the final law requires it |

---

## 9. Competition and social comparison: offline now, online later

### 9.1 Offline (v1 to v1.2)

| Against | How | Systems |
|---|---|---|
| Labelled AI | Ladder and arenas (A6.3), visible skill tier and the Hall of Generals, Conquest and Heat, guests, guardians | EL-7, EL-15, EL-19, EL-23 |
| Yourself | Records, "you vs 30 days ago", the season best and its pennant, puzzle stars | EL-8, EL-18, EL-25 |
| Friends, asynchronously | The Daily share line (same seed for all), friend challenge codes with a rivalry log, War Plan codes, Hall codes | EL-3, EL-28 |
| The whole community, indirectly | Shared seeds (Daily, Expedition, puzzles) give everyone the same puzzle to talk about and write guides for | EL-3, EL-23, EL-25 |

**Safeguards:** no comparison with a fake population; no bottom ranks; relative and friend scale only; share artefacts carry only the auto name.

**Optional experiment, later and grey (N15):** a community Daily board. Players paste a Daily result code into a GitHub Issue form; a free Action re-simulates it with `replay:verify` and publishes a static board on Pages. It is opt-in, outside the game, needs a GitHub account (age 13+), conflicts with a Poki-exclusive path, and the owner must moderate it. Decide after v1.1 (open question 5).

### 9.2 Online (the D1 server milestone)

| Offline system | Online upgrade | Guardrails |
|---|---|---|
| Skill tier against AI (EL-7) | Ranked PvP rating with level caps (A6.8, D1) | Emotes only; no pause or speed (D1) |
| Seasons (EL-18) | Shared PvP seasons; PvP wins count as Season stars; pennants by league | No decay for inactivity, ever |
| Daily share line (EL-3) | A Daily leaderboard per difficulty; the server re-simulates each replay before listing it | Friends-first; relative view (you ± 10); a global top list only for the top league; pseudonymous auto names; opt-out |
| Friend challenge codes (EL-28) | Live friendly duels by friend code, unranked | Friend codes only, no stranger contact |
| Rift Expedition (EL-23) | **Warband** maps: every member's matches dig one shared weekly map | Rewards go to every member who dug at least 1 tile; no quotas, no "last seen", no contribution ranking; preset messages only ("Nice dig!", "Guardian down!") |
| Hall of Ages (EL-16) | Visit friends' Halls | View-only; no likes or ratings |
| Clutch Puzzles (EL-25) | Owner-curated puzzles from players' own replays | No voting |
| Capsules | Server-rolled for accounts (anti-tamper, D1) | Odds unchanged; still earn-only |
| Relatedness without a server (N14, grey) | Before the server exists: a friends-only WebRTC duel with copy-paste connection codes, and a same-device "Couch War" | Unranked, emotes only; some networks fail without a relay |

---

## 10. Economy and the currency budget

### 10.1 No new spendable currency

| Kind | Items | Change |
|---|---|---|
| Spendable meta currencies | Amber, Dust | None added. New sinks: star levels (Amber); foil crafting, relic and lore crafting, season banner crafting (Dust) |
| Per-card resource | Copies | Unchanged |
| Ranks | Trophies, MMR | Unchanged; the skill tier is displayed (EL-7) |
| Progress counters (bound to one system, never bought, never exchanged, never expire) | Codex points (extended), Season stars, Mastery points, War Chest wins, Expedition digs, Holo compass, sightings pity | Each is a bar toward a finish line, not a wallet |

### 10.2 Reuse map

| Existing system | New role |
|---|---|
| Time Capsules (A6.4) | Age Capsules pay out the Season Road, War Chest and Daily; the Holo compass joins the pity counters |
| Codex Level (A6.7) | The years-long "Town Hall" level with prestige tiers (EL-13) |
| Trophy Road (A6.3) | Unchanged; the Season Road reuses its UI |
| Conquest (A6.10) | Chrono Heat and the Hall of Generals (EL-15, EL-7) |
| Daily Challenge (A9.1) | Shared seed, share line and window (EL-3); its modifier is the Expedition "weather" |
| Skins and Wardrobe Crates (A5.8) | Rewards on the Season Road and in the War Chest; crafting stays |
| Replays (B3, B8) | Battle resume, puzzles, pinned moments, clips, friend verification later |
| Echo of You (A7.4) | Friend ghosts (EL-28) |
| Daily modifiers (A9.1) | Heat, guardian weather, featured modes |
| AI Generals (A7.4) | Guests, guardians, busts |
| War Plan (A3) | Codes, Mirror and Draft modes |

### 10.3 Economy re-runs

Season Road, Expedition, Mastery, Heat and the Codex extension together add roughly +10% Amber and +2.5-5% copies for an engaged player at v1.2. That pulls the A6.9 Amber finish (about 160 days) toward the copy finish (about 135 days), which helps A6.9's 30-day gap rule. `sim:economy` must be rerun for each phase, extended to a 3-year horizon (section 13).

---

## 11. Architecture summary

All new rules live in `meta` (pure; time only through the injected `Clock`). New calendar keys (ISO week, month) come from the same local-date function that A9.1 and the 04:00 reset use. All visuals go through the manifest and `ArtProvider` (B5). All text goes through i18n. Contracts are frozen after Phase 0 (B15), so every change below is a request the orchestrator files.

### 11.1 Contract changes by phase

| Phase | Change | Owners |
|---|---|---|
| v1 Phase 2b | `NonePlatform.features.reelReveal` default false (value only) | WP11 |
| v1 Phase 2b | `SaveDoc.daily` → `{ won: string[] }`; `OpponentSpec` + `dayKey?`, `standardLevels`; `MatchResultInput` + `paused`; `pickOpponent` options + `dayKey`, `difficulty` | WP0 request, WP7, WP8, WP11 |
| v1 Phase 2b | `SaveDoc.quests.weekly`/`weekKey` → `warChest: { wins; lastOpenedWeek }` | WP0 request, WP7, WP8 |
| v1 Phase 2b | Content format type + `trophyWin`, `amberWin` | WP1, WP7 |
| v1 Phase 3 | `Settings` + `breakReminderMin`, `nightNote`; `SaveDoc.stats` + `playTime` | WP8, WP9 |
| v1 Phase 3 | Meta exports `skillTier`, `detectFeats`, the result-line selector (extra pure functions, not in the `Meta` interface) | WP7 |
| v1.1 (SaveDoc v2, migration m[1]) | `season`, `mastery`, `rest`, `records`, `styleRing`, `museum`, `feats`; collection entries + `stars`; `pity` + `sinceHolo`; conquest + `heat` | WP8, WP7 |
| v1.1 | `MatchStats` + per-card stats and style fields; `RewardStep` + `seasonStar`, `mastery`, `feat`, `warChest`; `MatchResultInput.mode` + `friend`; `features` + `profile` | WP0 request, WP2, WP7, WP11 |
| v1.1 | View-side cosmetics (banner, title, décor) passed by the session to the battle view | WP5, WP11 |
| v1.2 (SaveDoc v3, migration m[2]) | `expedition`, `relics`, `lore`, `hall`, `puzzles`, `sightings` | WP8, WP7 |
| v1.2 | `SideConfig.handicaps` (sim, changes `contentHash` and `SIM_VERSION`); `MatchResultInput.mode` + `guardian`, `puzzle`, `featured`; `RewardStep` + `dig`; session start from a replay tick | WP0 request, WP2, WP7, WP11 |

### 11.2 New content tables (`src/content`)

- v1: `feats.ts` (12 feats).
- v1.1: `calendar.ts`, `seasons.ts`, `mastery.ts`, `heat.ts`, `prestige.ts` (stars, foil prices, compass, Codex sources, Hall tier thresholds), guests in `generals.ts`, `museum.ts`, `profiles.ts` (standard and minor-safe values).
- v1.2: `relics.ts`, `expedition.ts`, `sightings.ts`, `hall.ts`, `featuredModes.ts`, `puzzles.generated.json`, lore strings.

### 11.3 Screens and components

- v1: wrap card and result line (Result), Daily screen, rank chip and Hall of Generals view, Settings > Wellbeing, Feats tab, Save image buttons.
- v1.1: Season screen and Home bar, Card detail (stars, foil crafting, mastery), Album tab, Records tab, calendar panel, code entry and share sheet, Year recap, Heat on the Conquest board.
- v1.2: Expedition, Hall of Ages, Puzzles, the Featured tile.

### 11.4 Visual manifest additions (WP4)

Star pips, mastery badges, pennants, base banner poles and décor, statue material filters over unit rigs, relic icons and gilded variants, map tiles per age layer, Hall tiers, wings and plinths, sighting creatures, guest portraits. All are code-drawn parts in v1.x and swappable later (B5).

### 11.5 Tools and tests (WP12)

- **Horizon report** (section 13) in `sim:economy`, with a 3-year mode.
- Calendar validator; Expedition trail solver for every calendar seed; puzzle miner; codes round-trip tests.
- **Honesty tests:** a simulated 30-day absence loses nothing; season rollover grants every reached node; archived maps stay diggable; Daily window days pay once each; no reward is ever given for sharing.

---

## 12. What we deliberately do not do

| We do not | Why | Instead |
|---|---|---|
| Login streaks, streak flames, "don't break your streak" (including the `market-portals.md` "login streak" hook) | PEGI 12 when absence is punished; named in the Jutland Declaration, the DSA guidelines and the KIDS Act proposal; linked to stress in teens | Banks, the War Chest, the rest bonus |
| Anything that expires, decays or withers: expiring rewards or currency, rank decay, "claim within 24 h", crops that wither | Fails the walk-away test; PEGI 12; KIDS Act | Banks, archives, "Nothing expires", recurring calendar |
| Push, browser or e-mail notifications, badge nags, including after PWA install and in the app | DSA guidelines; KIDS Act night rule | Home shows what is ready when the player opens it |
| Autoplay, auto-queue, endless reward chains or feeds | The EU's preliminary TikTok finding (February 2026) | "Next battle" is a button; wraps; finite sets |
| Selling anything; passes, skips, currency; ads that grant random rewards | CLAUDE.md hard rule; PEGI 16; Belgian and Dutch law | Earn-only |
| Trading, gifting or marketplaces | Gives items money value (the Danish Gambling Authority's three criteria; skin betting) | Items are bound to the save |
| Exclusives that never return; time-limited odds boosts (E11's 2× foil weekends); countdown offers | UCPD No. 7; CPC principles on pressure on children | Recurring themes and crafting fallbacks |
| Time-of-day reward windows (E12's 6-hour windows, night pools) | Appointment pressure; rewards children for playing at night | Place and weather axes only |
| Real-world location, GPS, steps, camera, microphone or health data | Minors' data (GDPR, Children's Code); crashes near PokéStops | A date-seeded shared map |
| Near misses, fake odds, slot, roulette or claw framing, "almost" sounds; the CS-style reel as default | Gambling look; the Danish debate; Poki rules | Card flip by default; back-loaded climbs (A10) |
| Engagement-optimised matchmaking, personalised odds or rewards, tuning for session length or return rate | Patented dark techniques; EU direction | MMR targets win rate only (EL-2) |
| Bots presented as people, fake player counts, AI leagues that imitate a population (E18) | CLAUDE.md hard rule; UCPD | The Hall of Generals: named, labelled AI characters |
| Rewards for watching, liking, sharing, inviting or referring | TikTok Lite Rewards withdrawn from the EU (2024) | Sharing is its own reward |
| Text chat, stranger contact, public "last seen", clan quotas, "your team needs you" | KIDS Act contact safeguards; social-obligation evidence | Emotes, preset messages, no quotas |
| Guilt copy and confirmshaming ("Your army misses you", "No thanks, I like losing") | UCPD; DFA target | Neutral copy, reviewed in Phase 3 (C5) |
| Build timers, energy that blocks play, waiting as a gate (Clash of Clans builders) | Without money a timer is only friction; Clash Royale removed chest timers in 2025 | Charges scale rewards but never block a battle |
| Raids that take progress; loss-based return hooks | Fails the walk-away test | Nothing can be taken away |
| Reset-for-bonus prestige | Engineered loss aversion | Prestige is status: Codex tiers, the Hall, titles |
| Raising the level cap or power creep | Devalues progress (A6.6) | Sideways growth, cosmetic prestige |
| Taking rewards away in an update | Breaks trust (Hearthstone 2020) | A reward table is never cut without an equal replacement |
| Banning the player's own cards (E8) | Takes away identity | Card Mastery rewards variety |
| Oversized banks that invite binges (Psy-K's 28 charges) | Trades appointment pressure for binge pressure | Keep 12 plus the rest bonus |
| Bottom-of-board displays, public shaming | Demotivates the losing half | Relative and friend scale |
| Tournaments with entry fees or prizes of money value | Gambling and prize-competition law | Free entry, cosmetic prizes |
| "Can't put it down" as the design goal | It is exactly what EU and Danish regulators now target | "Wants to come back, easy to stop" |

---

## 13. Measurement and release gates

### 13.1 Horizon report (N1, WP12 `sim:economy`)

Engaged (A6.9) and casual (about 3 matches a day) player models, 3-year horizon. Gates:

1. No more than 3 progression tracks end within the same 30-day window.
2. Every spendable currency has a sink on day 365, and on day 730 once v1.2 content ships.
3. An engaged player never goes more than 21 days without a new collectible (card, skin, feat, badge, pennant, relic, sighting).
4. Reward per minute across formats is within ±15% (EL-5).
5. A 30-day absence loses nothing that was owned or promised (honesty test).
6. A player who plays 20 matches once a week earns the same Season stars, digs, War Chest progress and mastery as one who plays the same 20 matches over 7 days.
7. Codex and Hall tier dates land within ±25% of the EL-13 targets.

### 13.2 Healthy-play signals (local only, exportable in playtests)

Days since the last new collectible; Amber and Dust balance growth; the share of ladder minutes by format; sessions longer than 90 minutes; sessions after 22:00 local; sessions that end right after a loss streak; how often sessions end on a wrap card. None of this leaves the device (A8).

### 13.3 Playtests and release notes

- After a session, ask one question: "Was that time well spent?" A change that raises playtime but lowers this answer does not ship (psychology 9.2).
- Before each public release, write a short risk note in `docs/decisions.md` using section 12 and the four tests (law report S11). The KIDS Act would likely make such a pre-market evaluation a duty; starting now is cheap.
- A Danish or EU games lawyer reviews the design before any launch aimed at minors or any commercial portal deal (law report 8).

---

## 14. Priorities

### 14.1 The five highest-value, lowest-cost additions for v1

In order. Each is size S and fits the existing WPs.

1. **EL-1 Session wrap card** (v1 Phase 2b). Ends sessions on a peak, makes the silent charge-empty stop visible, and is the remedy regulators ask for. Mostly strings and one component.
2. **EL-3 Daily Challenge 2.0** (seed, window and difficulty in v1 Phase 2b; share line in v1 Phase 3). One change delivers fair competition, a daily ritual with an end, Wordle-style sharing, and removes the only unbanked daily reward.
3. **EL-10 Hidden feats, 12 at launch** (v1 Phase 3). The first real treasure hunt in v1 and the funniest clip moments ("caveman beats laser knight"). Data, a pure detector and one tab.
4. **EL-7 Visible rank and the Hall of Generals** (v1 Phase 3). Makes skill visible and competition personal, with no fake players. One formula and UI.
5. **EL-9 Save image** (v1 Phase 3). Gives the portal launch something to share at zero network cost.

### 14.2 Must-fix pack before any public launch

EL-2 (reel off by default, "tapping only reveals", starter capsule label, "Amber can't be bought", Rookie AI label, "Nothing expires", the MMR decision), EL-4 (War Chest never resets), EL-5 (format parity) and EL-6 (play-time tools and night note). All are XS or S.

### 14.3 Order after v1

1. **v1.1, before launch + 5 months:** EL-12 and EL-13 first (they stop every reward from turning into a useless counter at month 6), then EL-18, EL-17 with EL-19, EL-14, EL-15 (Heat light), EL-28, EL-26, EL-27, EL-22 (age sets), EL-21, EL-29, EL-31, EL-10 (to 30), EL-8 (records), EL-11 if not done, and EL-30 before the first anniversary.
2. **v1.2, "Treasure and place" alongside the Bronze Age:** EL-23 with EL-22 relic sets, EL-16, EL-25, EL-15 handicaps, EL-20, EL-24 (optional).
3. **Online:** section 9.2.

Build capacity is a horizon too: the renewable engines (EL-12, EL-13, EL-15, EL-17, EL-25's miner) run for years as code plus data, so later content drops are a bonus, not a requirement.

---

## 15. Open questions for the owner

(The orchestrator should put these to the owner in plain Danish.)

1. **Reel.** Should the CS-style "case opening" reel for skin crates be off by default, with the card flip instead? We recommend yes: it looks like gambling, and kid-friendly portals refuse it. Should players be allowed to switch it on in Settings (non-Poki builds only)?
2. **Kid-safe defaults.** Should the kid-safe values (reel off, night note on, vibration off on reveals, no names in shared images) be the default for everyone? We recommend yes. Larger banks stay a switch for later (EL-31).
3. **v1.2 headline.** Should the treasure map (Rift Expedition) and the Hall of Ages be the headline of v1.2, together with the Bronze Age?
4. **Seasons.** Is "one season per calendar month" right, with themes that return every year?
5. **Community board.** Should we later try an optional Daily leaderboard on GitHub (players 13+ with a GitHub account; the owner moderates)?
6. **Calendar.** Is it acceptable that the game "runs itself" for 24 months from a pre-written calendar, with new ages as a bonus when there is time and money for build sessions?

---

## Appendix A. What happened to each research proposal

| Proposal | Outcome |
|---|---|
| E1 session wrap; N12 charge-empty close; Psy-I | Adopted as EL-1 |
| E2 stamp card | Replaced by EL-4 War Chest (play-based; no daily gate) |
| E3 welcome-back; Psy-H rest bonus | Adopted as EL-21 (48 h, +50% Amber, +1 Season star, 3 wins) |
| E4 share line; Psy-C; N5 shared-seed Daily; P-3 window | Adopted as EL-3 (3 difficulties, 7-day window) |
| E5 War Plan codes; Psy-B friend link | Adopted as EL-28 |
| E6 Card Records; Psy-E mastery badges | Adopted as EL-14 and EL-8 records |
| E7 Chrono Heat; Psy-G Conquest+ | Adopted as EL-15 (tier and level in v1.1, handicaps in v1.2) |
| E8 Seasonal Road; Psy-D seasons | Adopted as EL-18 for everyone; the ban-your-cards stage is rejected |
| E9 guest General | Adopted as EL-19 (permanent in Skirmish after its month) |
| E10 Nemesis | Deferred; the Hall of Generals and friend rivalries cover it. Revisit in v1.2 |
| E11 Age Festival | Cosmetic part merged into EL-17 and EL-18; the 2× foil odds weekend is rejected |
| E12 Rift Expedition; Psy-A; P-7 | Adopted as EL-23: weekly, archive instead of expiry, no time-of-day windows |
| E13 Museum | Adopted as EL-22 |
| E14 secrets; N13 anachronism feats | Adopted as EL-10 |
| E15 sandbox and clip sharing | Kept in D1; clips in EL-29 |
| E16 yearly recap | Adopted as EL-30 |
| E17 featured modes | Adopted as EL-20 |
| E18 AI Rival League | Rejected (imitates a population); EL-7 instead |
| E19 "Nothing expires"; P-8 | Adopted in EL-2 |
| E20 play-time reminder and night note | Adopted as EL-6 |
| E21 veteran cosmetics; N2 sinks | Adopted as EL-12 |
| N1 horizon report | Adopted (section 13) |
| N3 format parity | Adopted as EL-5 |
| N4 durable moments | Adopted as EL-9 and EL-29 |
| N6 Clutch Puzzles | Adopted as EL-25 |
| N7 self-running calendar | Adopted as EL-17 |
| N8 playstyle mirror | Adopted as EL-27 |
| N9 identity in the lane | Adopted as EL-26 |
| N10 visible rank | Adopted as EL-7 |
| N11 battle resume | Adopted as EL-11 (Abandon counts as Retreat) |
| N14 friends without a server | Online section, later, grey |
| N15 GitHub community board | Optional experiment, open question 5 |
| Psy-J rare sightings | Adopted as EL-24, moved from the lane to the backdrop |
| Psy-K minor-safe profile; P-1; P-2 | Adopted as EL-31, charges kept at 12 |
| P-4, P-5, P-6, P-9 | Adopted in EL-2 |
| `market-portals.md` "login streak" hook | Rejected (section 12) |
