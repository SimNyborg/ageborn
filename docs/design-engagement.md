# A15. Engagement and long-term progression

**Status.** Addendum to `docs/DESIGN.md`, written 2026-09-27. The orchestrator merges it into DESIGN as section A15 after the current build phase (Phase 1), together with the DESIGN edits listed in A15.19. Until then Phase 1 agents build to the current DESIGN; Phase 2b builds to this section.

**What it answers.** The owner asked for competition, collecting rare things, the joy of random rewards when opening packs, treasure hunting (the Pokémon GO pull), what makes TikTok gripping, and the Clash of Clans / Hay Day feeling of improving for years.

**Sources.** `docs/research/engagement-psychology.md`, `engagement-benchmarks.md`, `engagement-law-ethics.md` and `engagement-gap-analysis.md` (research IDs E1-E21, N1-N15, Psy-A to Psy-K, P-1 to P-9 are kept); the proposal `docs/design-history/engagement-proposal.md` (systems EL-1 to EL-31, kept as history); and two reviews of it, "player-ethics" (PE) and "builder-scope" (BS), resolved point by point in A15.21.

**Funding.** Only v1 is funded. The cloud credit that builds Ageborn ends 2026-11-05, and v1 still needs Phases 2a, 2b and 3. v1 is therefore designed as a finished game with honest end points. Everything marked v1.1, v1.2 or online is a ranked wishlist for any later build session (A15.19), not a promise to players or to the owner.

---

## A15.1 Principles, tests and red lines

**Goal: "wants to come back, easy to stop".** We do not design for "can't put it down", for three reasons:

1. **It lasts.** Players whose needs for competence, choice and connection are met play for years and feel better afterwards. Players who feel they *have to* play log more hours, enjoy them less and quit sooner (psychology 0.2, findings 1 and 13; benchmarks RES1-RES4).
2. **It is where the law is going.** Streaks, penalties for stopping, login rewards, autoplay, notifications and random rewards for minors are what the DSA minors guidelines, PEGI 2026, the Danish-led Jutland Declaration and the EU KIDS Act proposal (as reported) target (law 0.3-0.4).
3. **Our players include children.** Web portals are kid-heavy, and v1 cannot know anyone's age. The child-safe values are therefore the defaults for everyone (law S1).

**Pillar 4, extended.** A1 Pillar 4 becomes:

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

---

## A15.2 Loop map and horizon

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

Without a later build, v1's long tail is the Daily Challenge, the War Chest, the feats and foil crafting. The owner should know this plainly. The best next investments are ranked in A15.19.

---

## A15.3 Honesty and copy pack (v1)

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
   - A10.1 is deleted and D2 cut-order item 1 is done. `reel_tick` stays an unused sound ID.
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

---

## A15.4 Banks, the Supply Capsule and the walk-away rule (v1)

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

---

## A15.5 War Chest and counting wins (v1)

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

---

## A15.6 Stopping well (v1)

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

---

## A15.7 Daily Challenge 2.0 (v1)

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

---

## A15.8 Rewards by format (v1)

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

---

## A15.9 Peak rank and the Hall of Generals (v1)

| | |
|---|---|
| Class | Healthy: comparison only against named, labelled AI and the player's own past; the number never falls |
| Levers | Competence and status (3.1, 3.12), goal gradient to the next rung |
| Size, phase, owners | S · Phase 2b · WP9, WP7 |
| From | EL-7; N10; PE 3 (EL-7); BS EL-7 |

- **Profile:** "Highest AI tier beaten: VI". It comes from `stats.winsByTier`, which counts Ladder, Daily Challenge and Conquest wins only (Skirmish is practice). It never goes down.
- **Conquest board** (A9 screen 17): drawn as a vertical ladder of the 9 Generals ordered by tier, each with its AI badge. The player's portrait sits just above the highest General beaten in Conquest.
- **Skill tier** = clamp(round((MMR − 870) / 100), 0, 10): A6.8's formula without the arena clamp. It stays internal. It picks the default Daily difficulty and defines counting wins (A15.5).
- There is no live rank chip on Home. Trophies are the one rank number that moves.

---

## A15.10 Hidden feats (v1)

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

---

## A15.11 Post-max sinks: foil crafting and Amber to Dust (v1 stretch)

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

---

## A15.12 Result tips (v1 stretch)

| | |
|---|---|
| Class | Healthy. Informative feedback supports motivation where rewards for playing do not; a useful line after a loss reduces tilt |
| Levers | Informative feedback (3.1, psychology finding 14) |
| Size, phase, owners | S · Phase 2b, cut first · WP11, WP9, WP1 strings |
| From | EL-8; PE 3 (EL-8), 5.5; BS EL-8 |

- **After a win:** one line when a stat passes a fixed threshold in content data. Priority: a new fastest win (`fastestWinMs`), 10 or more turret kills, one Age Power hitting 6 or more enemies, the final age reached before the quest time (A6.7), base above 80%. Example: "Your turrets held the line: 14 kills."
- **After a loss:** one tip from the A8 failure-pattern detector that fired most in this match. The detectors keep running after onboarding; only their in-battle hints stop. Example: "Tip: their turrets shred melee. Try Pebblers."
- There are no averages over past matches (the save keeps none) and no Records tab in v1.

---

## A15.13 Screen and counter budget (v1)

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

---

## A15.14 Mastery after v1 (v1.1 wishlist)

### Chrono Heat with a Pact menu

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

### Card stars as challenges

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

### Codex Level extended

| | |
|---|---|
| Class | Healthy: it never decreases, and there is no reset-for-bonus prestige |
| Levers | Endowed progress and long nested goals (3.7) |
| Size, phase, owners | S · v1.1, with stars · WP1, WP7 |
| From | EL-13; PE 3 (EL-13); BS EL-13 |

- New point sources: a card star 5; a new foil tier on a card, Bronze 1, Silver 2, Holo 4; a feat 3; each new best Heat point 1. A6.7 is otherwise unchanged.
- Codex is a background number on the Profile. Frames continue every 10 levels past 75, as data.
- No thresholds are published for systems that are not built. The Home base (A15.16) grows with achievements, not with Codex.

---

## A15.15 People without a server (v1.1 wishlist)

### Share codes and custom challenges

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

### Rival

| | |
|---|---|
| Class | Healthy: revenge against a labelled AI character, with no bounty and no shaming copy |
| Levers | Character (3.20), competence |
| Size, phase, owners | S · v1.1 · WP7, WP8, WP9 |
| From | E10; PE 5.3 |

- The Conquest ladder shows "Your rival: Madame Tempest (3-7)" for the General with the most losses against it in Ladder and Conquest (at least 3), with a Rematch button that starts a Skirmish against it.
- Save: `stats.vsGeneral?: Record<generalId, [wins, losses]>`.

---

## A15.16 Variety and place (v1.1 wishlist)

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

**Home base and trophy shelf.** Healthy. S-M · WP9, WP11, WP7. From EL-16; PE 3 (EL-16); BS EL-16.

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

---

## A15.17 Runs, treasure and online (v1.2 and later wishlist)

### Gauntlet: a run mode with Draft War

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

### Rift Expedition, redesigned

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

### Clutch Puzzles and battle resume (later)

- **Battle resume** (EL-11), M: a resume record under its own B8 key, and bots rebuilt by re-running their controllers from tick 0. Abandoning or letting the record expire voids the match (A15.6).
- **Clutch Puzzles** (EL-25), M, on the same infrastructure. Each puzzle is the last 30-90 s of a mined bot-vs-bot match in which the side at 20% base HP or less still wins.
  - Every mined position must be won again by a human-limited input bot (at least 300 ms per action, at most 12 actions per 10 s), so humans can solve it.
  - Puzzle ids are stable, and each puzzle keeps a copy of its battle rules, so a balance patch never orphans earned stars or shared puzzle numbers.
  - Sets of 5, with no auto-chaining across sets.

### Guest Generals and identity in the lane (later)

- **Guest Generals** (EL-19), M: 4 guests as variants of weights, openings and War Plans. Quirks that weights cannot express ("never builds turrets") need hard constraints on `BotProfile` and in the brain (WP3). Each is labelled AI with its tier shown. After its first appearance a guest stays in Skirmish for good.
- **Identity in the lane** (EL-26), M, with clips: the equipped banner flies on the player's base and the title sits under the base HP bar. A gallery test runs for every banner on every base.

### Online (the D1 server milestone)

- **Seasons with carry-over:**
  - The road is continuous; the monthly theme changes art, not progress.
  - Unreached nodes from past seasons stay claimable.
  - A season pennant records a month, and a missed one can be crafted later at Stone grade.
  - No rank decay. Seasonal cosmetics can be crafted all year after their first cycle.
- **Daily leaderboards** per difficulty. The server re-simulates each replay before listing it. Friends first and relative (you ± 10); pseudonymous auto names; opt-out.
- **Friend duels** by friend code: unranked, emotes only.
- **Warbands:** a shared Expedition map. Rewards go to everyone who dug at least one tile. No quotas, no "last seen", no contribution ranking; preset messages only.
- **Capsules:** rolled by the server for online accounts (D1), with the same odds.

---

## A15.18 Contract, save-schema and content-table changes by phase

### v1 Phase 2b

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

### v1.1, if funded

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

Nothing changes in the sim, AI, art, HUD or platform contracts in v1.1.

### v1.2, if funded

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

---

## A15.19 Build plan

**Sizes.** XS: strings or one value. S: one or two WPs, mostly data and a small component, no frozen-contract change. M: a frozen-contract change, three or more WPs, or a new screen or rule set. L: several WPs with new art, content authoring, contract changes and an economy re-run.

### v1 Phase 2b

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

**How to land it (orchestrator).**

1. Put the three owner questions to the owner in Danish: the reel is not built; the safe defaults apply to everyone; the v1 slice above.
2. Merge this section into DESIGN as A15, with these edits:
   - A1 Pillar 4; A2.10
   - A6.3 (charges, Supply Capsule, void matches); A6.4 (capsule types row); A6.7 (quest queue, weights, War Chest); A6.9 (re-run note)
   - A8 (Supply Capsule at about 10:00)
   - A9 (Home, Result, Settings, Profile, Conquest, the Collection Feats tab, Card detail); A9.1
   - A10 (quick reveal, honesty lines); delete A10.1; A13 (vibration default)
   - B8 (Settings); B11 (`reelReveal: false`); B15
   - C2 WP tasks; C5; D1; D2
   Do it before Phase 2b, while WP7-WP11 code is young.
3. If Phase 1 is still running, tell WP10 now not to build the reel.
4. Write one request file per owner in `docs/requests/`: `wp0-engagement-contracts.md`, `wp1-engagement-content.md`, `wp7-engagement-rules.md`, `wp8-engagement-save.md`, `wp9-engagement-screens.md`, `wp10-engagement-reveal.md`, `wp11-engagement-session.md`, `wp12-engagement-tests.md`.
5. Update `ageborn-phase2-loop`:
   - Home and Result additions go to the meta-ui agent.
   - Daily, War Chest, bank and feat rules go to the modes agent.
   - Reel removal and quick reveal go to the capsules agent.
   - No separate "engagement" agent: it would edit the same screens as another agent.
   - The rules-meta and honesty lenses check A15.
6. Update `ageborn-phase3-polish` with the C5 additions and the economy re-run.
7. Keep the rest of the proposal as design history. Add no stubs or hooks for unbuilt systems.

### After v1: the unfunded wishlist, in order

Systems that renew from seeds and existing content come first (engagement rule 9).

| Order | Item | Section | Size | Owners |
|---|---|---|---|---|
| v1.1-1 | Danish text (D1). It competes for the same budget and probably helps Danish children more than any system here | D1 | M | WP1 and each UI WP |
| v1.1-2 | Foil crafting and Amber to Dust, if not in v1 | A15.11 | S | WP1, WP7, WP9 |
| v1.1-3 | Chrono Heat with a Pact menu | A15.14 | M | WP1, WP7, WP9, WP8, WP0 |
| v1.1-4 | Share codes and custom challenges | A15.15 | M | WP0, WP7, WP9, WP11, WP12 |
| v1.1-5 | Card stars and the Codex extension (stars need Heat) | A15.14 | M | WP1, WP7, WP9, WP8 |
| v1.1-6 | Daily pairs, welcome card, Skirmish presets, age sets | A15.16 | S | WP1, WP7, WP9, WP12 |
| v1.1-7 | Home base and trophy shelf | A15.16 | S-M | WP9, WP11, WP7 |
| v1.1-8 | Rival | A15.15 | S | WP7, WP8, WP9 |
| v1.1-9 | Feats to 30 and secrets | A15.16 | S | WP1, WP7, WP11 |
| v1.1-10 | Save image with Clip Mode | A15.16, D1 | M | WP5, WP9, WP11 |
| v1.2-1 | Gauntlet and Draft War | A15.17 | M-L | WP1, WP7, WP9, WP11, WP8, WP0 |
| v1.2-2 | Rift Expedition | A15.17 | L | WP1, WP7, WP9, WP4, WP8, WP0 |
| v1.2-3 | Battle resume, then Clutch Puzzles | A15.17 | M, then M | WP11, WP8, WP12, WP1, WP9 |
| v1.2-4 | Guest Generals | A15.17 | M | WP1, WP3, WP0 |
| v1.2-5 | Identity in the lane | A15.17 | M | WP4, WP5, WP9 |
| Online | Seasons with carry-over, Daily leaderboards, friend duels, Warbands | A15.17 | L | Server milestone (D1) |

---

## A15.20 Measurement, tests and release notes

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

---

## A15.21 Review resolution

Every point of both reviews, with its verdict. "Accepted" means applied as written; "Changed" means applied in a modified form, with the reason given.

### Player-ethics review (PE)

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

### Builder-scope review (BS)

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
| 8 Owner decisions | Answered | The reel is not built; safe defaults for all; the v1 slice in A15.19 |

---

## A15.22 Rejected mechanics

| Mechanic | From | Why rejected | Instead |
|---|---|---|---|
| Login streaks, streak flames, a stamp for the first win of each day | `market-portals.md` hook, E2 | Rewards regular logins and punishes breaks; PEGI 12, the Jutland Declaration, the KIDS Act as reported; linked to stress in teens | War Chest, 7-day banks |
| A capsule for opening the game each day | A6.3 Daily Capsule | A login reward with a random result | Supply Capsule (A15.4) |
| Rest bonus after 48 h away | EL-21, E3, Psy-H | Rewards an every-other-day pattern; worth about 30-60 Amber | Welcome card with no reward |
| War Chest with a weekly open and a 45-win cap | EL-4 | A calendar gate that silently drops wins | Ungated War Chest (A15.5) |
| Monthly Seasons before online | EL-18, E8, Psy-D | Unreached rewards lost at month end; duplicates the War Chest; the largest clock-tamper payoff | War Chest; online Seasons with carry-over |
| Banning the player's most-used cards | E8 | Takes away the player's identity | Pact conditions the player chooses |
| Wardrobe reel, including as an opt-in | A10.1, open question 1 | Case-opening look; Poki rejects it; the Danish loot-box debate | Card flip |
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
