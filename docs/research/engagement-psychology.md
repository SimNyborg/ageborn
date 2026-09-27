# Engagement psychology for Ageborn: what makes people play for years, where it turns harmful, and where we draw the line

Research report, 2026-09-27. It answers the owner's request that Ageborn should use everything that makes games absorbing: competition, rare collectibles, the joy of random rewards, treasure hunting (the Pokémon GO pull), whatever makes TikTok gripping, and the Clash of Clans / Hay Day feeling of improving for years.

It builds on, and does not repeat, `meta-collection.md` (capsule odds, pity, reveal staging), `feel-ux.md` (juice, onboarding, bots, comebacks), `genre-peers.md` and `market-portals.md` (portals, metrics, clips). Section numbers such as A6.3 refer to `docs/DESIGN.md`.

---

## 0. Summary

### 0.1 The one idea

Two different engines keep people playing. Both raise short-term engagement. Only one compounds over years.

| | Engine 1: need satisfaction | Engine 2: compulsion |
|---|---|---|
| Built from | Competence, autonomy and relatedness (self-determination theory), flow, mastery, self-expression, curiosity | Uncertainty-driven "wanting", fear of losing things, social obligation, no natural stopping points, time pressure |
| What players say | "I want to play" | "I have to play" |
| Measured outcome | Enjoyment, energy after play, harmonious passion, return over years [3][6] | More hours, less enjoyment, tension after play, regret [3][5][68] |
| Regulatory direction (EU/DK, 2025-2026) | Encouraged ("safe by design", positive nudges such as pause and save) [88] | Targeted: streaks, penalties for not returning, random rewards for minors, autoplay, night notifications [82][83][85] |

**Ageborn's stance:** maximise engine 1 everywhere. Use engine 2 only in free, bounded, disclosed, bankable forms (the capsule system already does this). Never use engine 2 in the forms that punish absence, deceive, or pressure children.

### 0.2 Key findings

1. **Need satisfaction predicts durable play; compulsion predicts worse play.** Competence, autonomy and relatedness each predict enjoyment and future play [1]. Low need satisfaction goes with obsessive passion: more hours, less fun, tension afterwards [3]. Telemetry studies of about 39,000 players find that hours played barely affect well-being, while the quality of motivation does [6][7][8]. The goal is not "more minutes"; it is "minutes players are glad they spent".
2. **Close, fair matches are the core fun.** Close games and games against slightly stronger opponents are rated more enjoyable than blowouts [13]. Competence-frustrating play produces aggression and quitting [4]. The existing hidden-MMR tier choice (A6.8) and loss protection (A6.3) are exactly right. The line is disclosure: adaptive difficulty that is announced is healthy; engagement-optimised matchmaking that picks outcomes to reduce churn [79] is a red line.
3. **Random rewards work because uncertainty itself is motivating.** Dopamine neurons code reward prediction error and carry a separate uncertainty signal that peaks when odds are 50/50 [15][16]. That is why free capsules are thrilling, and also why paid random rewards are linked to problem gambling (meta-analytic r ≈ 0.26 for loot-box spending [75]). That evidence is about paying [76]; data on free boxes are thin. Ageborn's earn-only, pre-rolled, pity-protected capsules sit in the safe zone for adults. For minors, the EU is moving to restrict random rewards regardless of payment (item 12).
4. **Anticipation carries much of the pleasure.** The brain's reward-anticipation response is strongest before the outcome [21], and "wanting" is dissociable from "liking" [20]. Honest build-ups (the rarity pre-signal, the Legendary walkout) are good. Drawn-out suspense on every small event trains wanting without liking.
5. **Faked near misses are the clearest red line in reveal design.** Near misses raise the urge to continue and recruit win-related brain circuitry, but only when the player feels in control [23]. Moderate near-miss rates produced the most persistence [24]. Ageborn's capsule already never fakes a near miss (A10). One grey spot remains: the 4 tap "strikes" give a feeling of control over a pre-rolled result, so the game should say so plainly.
6. **Progress bars, pre-filled progress and "almost there" are cheap and healthy.** Pre-filled loyalty cards nearly doubled completion (34% vs 19%) [27], and effort accelerates near a goal [28]. The Trophy Road, Codex Level, Clay meter and copies bars already use this. The abuse to avoid is an endless chain of carrots with no finish lines.
7. **The "Zeigarnik effect" is mostly a myth; the resumption urge is real.** A 2025 meta-analysis found no memory advantage for unfinished tasks, but a genuine tendency to go back and finish them [29]. Open goals pull players back. Use goals the player chose, never decaying ones.
8. **Streaks are powerful and the most regulated lever right now.** Intact streaks raise engagement, broken streaks cause disengagement, and "repair" options soften the drop [51]. Streaks cause digital stress in adolescents [52]. PEGI (June 2026) rates games that punish non-return at PEGI 12 [80]. The Jutland Declaration (Denmark, October 2025) and the EU KIDS Act proposal (September 2026) target streaks and penalties for not logging in [83][85]. **No login streaks in Ageborn**, contrary to the D1 hook list in `market-portals.md`. Keep everything banked.
9. **Collecting is a healthy core motive when completion is reachable.** Collecting gives tangible, attainable goals with concrete progress feedback [30][31]. The current plan (whole collection in about 5 months, no time-limited exclusives, pity, crafting) is healthy. Foils are Ageborn's "shiny hunt".
10. **Treasure hunting without GPS.** Pokémon GO's pull comes from enjoyment, challenge, nostalgia, outdoor exploration and socialising [60][61]. Its step-count gains faded within six weeks [63], and the game was linked to extra traffic crashes near PokéStops [64]. Location tracking is a red line for a kids-accessible offline game. The transferable part is discovery: hidden things in a world, rare sightings with disclosed odds, and maps you uncover.
11. **TikTok's grip is mostly design, and the EU has now called that design unlawful for a platform.** The EU Commission's preliminary DSA finding (February 2026) names infinite scroll, autoplay, push notifications and a personalised recommender as addictive design that puts users on "autopilot" [66]. Autoplay measurably erodes children's self-regulation [67]. Take the healthy half (instant start, short matches, variety, clip creation). Never take the other half (autoplay, no stopping cues, personalised reward feeds).
12. **Regulation is converging on "safe by design for minors".** Already applying: PEGI 2026 criteria [80], CPC principles on virtual currencies [81], DSA minor-protection guidelines for platforms [82]. Proposed: the EU KIDS Act (17 September 2026), which in secondary reports bans streaks that penalise absence, rewards at regular intervals, night-time notifications and (for minors) variable reward systems, and requires time-management tools [85]. Reports differ on whether the random-reward rule reaches games directly or through a code of conduct [85]. The Digital Fairness Act is expected in Q4 2026 [86]. Ageborn has no money and no notifications, so most rules do not bite. Daily-cadence rewards and free random capsules could, if the game is treated as an online game used by minors. The cheapest insurance is a data-driven "minor-safe profile" (section 9.3).
13. **"Improving for years" comes from skill, self-expression and people, not from bigger numbers.** Card levels cap at L10 and the collection completes in about 5 months (A6.9). That is a strength, not a problem: years of play should come from an uncapped skill ladder with seasons (fresh-start effect [56]), mastery tracks, new ages as data, a personal space to decorate (IKEA effect [36]), and later friends, clans and PvP.
14. **Rewards should inform, not bribe.** Rewards that are expected and tied only to engaging in an already-fun activity undermine intrinsic motivation (d ≈ −0.40), while informational feedback supports it [9]. Shift quests from "Play 3 battles" towards skill and variety goals, and make recaps tell players what they did well.

### 0.3 Verdict table

| # | Lever | Verdict | Ageborn decision (details in section 3) |
|---|---|---|---|
| 3.1 | Competence, autonomy, relatedness (SDT) | Healthy (core) | Design test for every feature; relatedness is the v1 gap, so add friend challenge links |
| 3.2 | Flow | Healthy | Keep close matches, the 5-10 s decision pillar and no meta interruptions in battle |
| 3.3 | Mastery curves, skill expression | Healthy (the years engine) | Seasons, Conquest+, card mastery badges, personal bests, replays |
| 3.4 | Variable-ratio rewards, prediction error | Grey | Free, bounded, pre-rolled, disclosed, pity; never personalised odds |
| 3.5 | Anticipation vs consumption | Healthy if honest and short | Keep the 10 s caps and pre-signals |
| 3.6 | Near misses, losses disguised as wins, illusion of control | Red if faked; grey for tap strikes | Add "already decided" text; keep the no-near-miss rules under test |
| 3.7 | Endowed progress, goal gradient | Healthy | Always show the next reward, and give tracks real finish lines |
| 3.8 | Zeigarnik / resumption | Grey | Player-chosen open goals only; nothing decays |
| 3.9 | Collection, set completion | Healthy | Age sets, foil sets, silhouettes; no time-limited exclusives |
| 3.10 | Loss aversion, sunk cost | Grey; red if engineered | Floors, banks and protection only; never decay, expiry or streak loss |
| 3.11 | IKEA effect, ownership | Healthy | War Plans, skins, a decoratable Hall of Ages; never invalidate builds |
| 3.12 | Social comparison, status, competition | Grey | Relative and friend-scale boards, personal bests; no public bottom ranks |
| 3.13 | Reciprocity, gifting | Grey (mostly later) | Clan donations later without obligation pressure; gifts never paired with asks |
| 3.14 | Curiosity gaps, mystery | Healthy | Silhouettes, secret achievements, hidden lore |
| 3.15 | Novelty, variety | Healthy | Daily modifiers, rotating events whose rewards return |
| 3.16 | Peak-end rule | Healthy | End matches and sessions on a high; add a session wrap-up card |
| 3.17 | Appointment mechanics, streaks | Grey (banked); red (streaks, decay) | No login streak; 3-day Daily Challenge window; a rest bonus instead |
| 3.18 | Habit formation | Grey | In-game cues only, a natural daily end point, no push triggers |
| 3.19 | Identity, cosmetics | Healthy | Earned cosmetics, good default looks, titles for skill |
| 3.20 | Narrative, discovery | Healthy | General personalities, Chronicle campaign, expedition maps |

---

## 1. How to read this report

### 1.1 Evidence grades

| Grade | Meaning |
|---|---|
| **A** | Strong: meta-analyses, many replications, or very large field or telemetry datasets |
| **B** | Moderate: several experiments or one large field study pointing the same way |
| **C** | Weak or contested: small samples, single studies, correlational designs, small-N brain imaging, or findings that failed to replicate |
| **D** | Practitioner or company claims, design analyses, anecdotes |

Brain findings ("dopamine") explain *why* a lever works. They rarely prove that a specific game feature is harmful. Behavioural and telemetry evidence counts for more.

### 1.2 Verdict definitions for Ageborn

- **Healthy.** It serves a basic need (competence, autonomy, relatedness), it still works when fully explained, stopping costs nothing, and it is fine for a 10-year-old. Use it freely.
- **Grey.** It is effective and can be fine, but it has a known abuse path or regulatory attention. Use it only with named guardrails (cap, bank, disclose, opt-out, kid-safe default) and review it before each release.
- **Red line.** It relies on deception, punishes absence or stopping, applies pressure through scarcity or social obligation, exploits a vulnerability (compulsion, minors' impulsivity), or conflicts with DK/EU law or its clear direction. Never ship it.

### 1.3 Four tests to run on every new feature

1. **Explain-it test.** Would it still work, and would we be comfortable, if a screen explained exactly how it works to the player and a parent? (This is Pillar 4, honesty, applied to psychology.)
2. **Walk-away test.** If the player stops for a day, a week or a month, do they lose anything they had or were promised?
3. **Reflection test.** After a session, would the player say the time was well spent? (Harmonious vs obsessive passion [3].)
4. **Child test.** Is it fine for a 10-year-old on a school night? Portals such as Poki are kid-heavy and require kid-safe games (`market-portals.md`).

A feature that fails test 1 or 2 is a red line. A feature that fails test 3 or 4 is at best grey.

The verdicts borrow the temporal, monetary and social-capital categories of "dark game design patterns" [70]. Critics of that taxonomy point out that it often encodes designers' taste rather than evidence about players [71], so each verdict here rests on player outcomes, consent and the evidence grade, not on genre.

---

## 2. Rules and direction in Denmark and the EU (as of 27 September 2026)

| Instrument | Status | What it says that touches engagement design | Ageborn exposure |
|---|---|---|---|
| **PEGI interactive risk categories** [80] | Applies to games submitted from June 2026 | Rewards for returning (daily quests, login streaks): minimum PEGI 7 plus a descriptor. **Punishing** non-return (loss of content or progress): PEGI 12. Time- or quantity-limited purchase offers: PEGI 12. Paid random items: PEGI 16. Unrestricted communication: PEGI 18 | Daily quests, Daily Capsule and charges put us at PEGI 7 with a descriptor. Banking keeps us out of 12. No purchases, no chat |
| **CPC network key principles on in-game virtual currencies** (EU consumer authorities, March 2025), with the Star Stable action [81] | Enforcement guidance under existing law. The Danish Consumer Ombudsman co-announced it | Transparent real-money pricing, no pressure through time-limited offers, special care for children | None today (no money). Relevant if money ever appears, which the hard rules forbid |
| **UCPD Annex I point 28** [89] | Law | Directly urging children to buy is always unfair | None (nothing is sold) |
| **Danish Gambling Authority** [87] | Current position | Gambling requires a stake, chance and a prize convertible to money. Loot boxes without cash-out are not gambling under Danish law; skin betting is | Ageborn is not gambling: no stake, no cash-out, no trading |
| **DSA Article 28 guidelines on minors** (14 July 2025) [82] | Applies to online platforms; a benchmark for everyone else | Names streaks, autoplay and push notifications as problematic. Commercial content with intermittent or random rewards should not be deployed on minors. Asks for time-management tools | Not a platform, but the list is the regulator's mental model |
| **TikTok DSA preliminary finding** (6 February 2026) [66] | Preliminary enforcement | Infinite scroll, autoplay, push notifications and a personalised recommender judged addictive design; remedies include screen-time breaks at night and disabling infinite scroll | Defines what "TikTok-style" means legally |
| **Jutland Declaration** (10 October 2025, Danish EU presidency, 25 member states) [83] | Political, non-binding | Addictive and manipulative design: dark patterns, infinite scroll, autoplay, **streaks**, notifications about "missing out" | Denmark is leading this agenda, which matters for a Danish-made game |
| **European Parliament resolution** (26 November 2025, 483 to 92) [84] | Political | Ban loot boxes and gambling-like mechanics for minors, including in-app currencies and "fortune wheel" rewards. Default-disable infinite scroll, autoplay, pull-to-refresh and reward loops for under-18s | Signal for the DFA and the KIDS Act |
| **EU KIDS Act proposal** (COM(2026) 681, 17 September 2026) [85] | Proposal. It still needs Parliament and Council, then an application period | Online games must be "safe by design" for minors. Secondary reports agree it targets features that penalise not returning regularly, streak mechanics that penalise absence, rewards at regular intervals, notifications during 8 sleeping hours (22:00-08:00), and requires time-management tools and real-money display of virtual currency. On variable reward systems (loot boxes) for minors, reports differ: some describe a direct ban covering free and paid boxes, others say game monetisation goes to an Article 17 code of conduct built on PEGI | **The biggest future risk.** Daily Capsule, 6-hour charges (a 3-day bank still nudges a return every 3 days) and free random capsules could be in scope if Ageborn counts as an online game used by minors. Offline, no-account v1 may fall outside, but that is untested |
| **Digital Fairness Act** [86] | Proposal expected Q4 2026 | Dark patterns, addictive design, virtual currencies, loot boxes, protection of minors | Watch; nothing to do before the text exists |
| **UK ICO Children's Code, standard 13** [88] | UK law (relevant for UK players) | No nudges against children's interests; positive nudges such as pause and save tools are encouraged | Pause, save and a break reminder are welcome |

**Implications.**

- Ageborn's hard rules (no money, no store, no ads SDK, no chat, AI labels) already remove most legal risk. The capsule design in A6.4-A6.5 is well inside current law and portal rules.
- What remains is **time pressure and randomness for minors**. Keep every timed reward bankable, never add streaks, never add notifications that fire at night, and prepare a data-only fallback that swaps daily cadences and random capsules for match-count cadences and chosen rewards (section 9.3).
- The KIDS Act details above come from law-firm and trade-press summaries published days after the proposal; the primary text could not be opened for this report. Re-check before any release that targets EU minors.

---

## 3. The levers

Each lever follows the same pattern: what it is, why it works (with evidence grade), how games use it well, how it is abused, and the verdict for Ageborn with concrete actions.

### 3.1 Self-determination theory: competence, autonomy, relatedness

**What it is.** People are intrinsically motivated when three needs are met: *competence* (I am getting better and it shows), *autonomy* (I choose, and the choice matters) and *relatedness* (I matter to others and they to me).

**Why it works.** Across four studies, perceived in-game autonomy and competence predicted enjoyment, preference, future play and short-term well-being, and relatedness mattered in multiplayer settings [1]. *Evidence: B+ (many studies, mostly self-report; a CHI review of 110 papers finds the theory widely used but often shallowly [2]).* High need satisfaction goes with harmonious passion and energy after play; low need satisfaction goes with obsessive passion, more hours and tension after play [3] *(B, cross-sectional)*. Games that frustrate competence cause aggressive feelings across seven studies [4] *(B)*. People low in need satisfaction report more fear of missing out [5] *(B)*. Telemetry studies: need satisfaction and motivation relate to well-being independently of play time [6], hours barely matter [7][8] *(A-, large telemetry samples)*.

**Used well.** Clear feedback on improvement; meaningful choices (decks, stances, paths); fair challenge; co-operation and friendly rivalry.

**Abused.** Engine 2 can raise hours while lowering need satisfaction, which is the obsessive-passion profile. A classic sign is a game that is played a lot and enjoyed little. For scale: pooled studies put gaming disorder at roughly 3% of players, and about 2% in the most rigorous samples [78]. Most players are fine; design decides how the vulnerable few fare.

**Verdict: HEALTHY, and the master test for every other lever.**

- *Competence:* keep the MMR tier choice (A6.8), loss protection (A6.3) and the adaptive hints (A8). Add informational feedback to the Result screen (A9): one line on what went well ("Your turret held the line: 14 kills") next to the MVP card.
- *Autonomy:* the War Plan, preset tabs, choosing which age an Age Capsule comes from, skipping every animation and banking every timed reward are all autonomy supports. Keep them. Never force a mode, a path or a play time.
- *Relatedness* is the gap in an offline, bots-only v1. Named AI Generals with personalities (A7) give a light parasocial bond and must stay labeled. The cheapest real relatedness without a server is the **friend challenge link** (section 7, idea B).

### 3.2 Flow

**What it is.** Full absorption when challenge matches skill, goals are clear, feedback is immediate and the player feels in control [10].

**Why it works.** A meta-analysis of 28 studies found challenge-skill balance moderately related to flow, with clear goals and a sense of control equally robust contributors [12] *(B; weaker than the popular story)*. GameFlow turned the theory into eight game criteria: concentration, challenge, skills, control, clear goals, feedback, immersion and social interaction [11] *(D, a design model)*. In internet chess, close games and games against stronger opponents were more enjoyable than blowouts [13] *(B)*.

**Used well.** Difficulty that tracks skill, readable feedback, no interruptions inside the activity, and short resets between bouts.

**Abused.** Flow itself is benign. The abuse is using absorption to hide the passage of time (no clock, no end) so that sessions run far past what the player intended.

**Verdict: HEALTHY.** Pillar 3 (a decision every 5-10 s) and Pillar 5 (readable chaos) are flow design.

- Never put meta prompts (quest pop-ups, capsule offers) inside a battle. Quest progress belongs on the Result screen, which is already the plan (A9).
- The match clock (A2.10) is a gift: flow with a built-in end.
- The 60% target win rate (A6.8) keeps matches close enough to be enjoyable [13]. Track the share of matches decided by more than 50% base HP; blowouts in either direction are flow failures.
- Players who notice hidden difficulty adjustments feel cheated [94]. Adapting *between* matches and saying so (A7.1) avoids that.

### 3.3 Mastery curves and skill expression

**What it is.** The long climb from novice to expert, and the room a game gives to show skill (timing, reads, builds).

**Why it works.** In 854,064 players of an online game, performance followed lawful practice curves. Players who *spaced* their practice, and those who explored more early on, later performed better [14] *(A, very large sample)*. Mastery is the one progression that never caps.

**Used well.** Ranked ladders with seasons, hard modes, speed records, replays that show improvement, mastery badges per character (Clash Royale Card Mastery [92]).

**Abused.** Replacing skill with stat growth, so the "mastery" is really time spent (pay-to-win, grind walls).

**Verdict: HEALTHY. This is the engine behind "keep improving for years".**

- The fixed L10 cap and "grow sideways" rule (A6.6) protect skill expression. Keep them forever.
- Add seasons (fresh start, section 3.17), Conquest+ with harder modifiers, per-card mastery badges (cosmetic), personal records (fastest Future Age, biggest comeback) and "you vs you 30 days ago" lines on the Profile.
- Spacing supports learning [14]. Capsule charges and daily caps are not only economy tools; they also nudge spaced play. Say so in the Help text ("Rewards refill over time, so short regular sessions earn as much as long ones").

### 3.4 Variable-ratio reinforcement and reward prediction error

**What it is.** Rewards that arrive after an unpredictable number of actions. It produces high, steady response rates and resists extinction (the classic operant finding) [18].

**Why it works.** Dopamine neurons signal *reward prediction error*: the gap between expected and received reward [15]. A second, sustained signal tracks *uncertainty* and peaks when a reward is 50% likely, ramping up until the moment of reward [16]. Dopamine release has been measured during video game play itself [17]. *(A for the animal neuroscience; C for game-specific human brain data, which is n = 8.)* Game researcher John Hopson, who popularised the idea, later warned against reading games as "Skinner boxes": schedules are a design tool, not destiny [19] *(D)*.

**Used well.** Varied loot in action games; surprising events in matches; free reward drops with visible odds and bad-luck protection (Hearthstone pity, Brawl Stars Starr Drops; see `meta-collection.md`).

**Abused.** Paying for randomness. Loot-box spending correlates with problem gambling (meta-analytic r ≈ 0.26) [75]. The association with paying holds regardless of cash-out or pay-to-win features [76]. In one study about a fifth of respondents said loot boxes led them to gambling, and about as many reported the reverse path [77] *(B, correlational; causality unproven)*. "Predatory" schemes hide the long-term cost until players are committed [72]; industry patents describe tuning offers with behavioural tracking [73]; players themselves list 35 unfair monetisation techniques [74].

**Verdict: GREY.** Ageborn's version is earn-only, pre-rolled, pity-protected, disclosed and has no purchasable path, which is the safest form there is.

- **Do:** keep variance *inside the battle* as well (seeded unit spread, bot personalities, daily modifiers). Gameplay variance is more honest than meta variance.
- **Red lines:** personalising drop odds by player behaviour or churn risk; changing odds without a visible note; any path from money, ads or real-world value to capsules.
- **Minors:** the KIDS Act proposal may restrict variable rewards for minors even when free [85]. See the minor-safe profile (section 9.3).

### 3.5 Anticipation versus consumption

**What it is.** Much of a reward's pleasure comes before it arrives: savouring a known good event, or suspense before an uncertain one.

**Why it works.** The nucleus accumbens responds to *anticipated* gains [21] *(B)*. "Wanting" (dopamine-driven incentive salience) is dissociable from "liking" (pleasure on consumption), and wanting can grow without liking in addiction [20] *(A-, a large research programme)*. People value delayed pleasant events partly for the savouring [22] *(B)*. `meta-collection.md` already cites the loot-box study showing arousal rising during the shake before the reveal.

**Used well.** Visible upcoming rewards (a Trophy Road node you can see), readable tells (FIFA walkout flares), short suspense with a payoff that matches the build-up.

**Abused.** Stretching suspense on every small event, and hiding what is coming so that only continued play can resolve it. That trains wanting without liking: the "one more" feeling with no joy at the end.

**Verdict: HEALTHY when honest and short, GREY when drawn out.**

- Keep A10's rules: nothing longer than 10 s without a skip, honest rarity pre-signals, rarest last, Commons auto-flip.
- Match build-up to payoff (Pillar 5). A Clay capsule gets a short, warm reveal, not a Legendary-sized riser.
- The best anticipation in Ageborn is *known*: the next age, the next Trophy Road node, the next upgrade. Put the next known reward on the Home screen (already in A9, screen 2).

### 3.6 Near misses, losses disguised as wins, illusion of control

**What they are.** A *near miss* is a loss that looks almost like a win. A *loss disguised as a win* is a net loss celebrated with win effects [25]. *Illusion of control* is believing you can influence a chance outcome, created by choice, involvement or skill-like rituals [26].

**Why they work.** In a slot-machine task, near misses felt worse than full misses yet *increased* the desire to play and recruited win-related striatal and insula activity, but only when the player had personal control over the gamble [23] *(B)*. In a behavioural study, 30% near-miss frequency produced more persistence than 15% or 45%; an early "big win" did not significantly increase persistence [24] *(B-)*. Losses disguised as wins produce skin-conductance responses as large as real wins [25] *(B)*. Evidence on how much near misses drive long-term persistence is mixed (see `meta-collection.md`).

**Used well.** Genuine close outcomes in skill play: losing a battle with the enemy base at 3% HP is real information and motivates a rematch honestly.

**Abused.** Slot-style reels that stop one tile past a jackpot; "almost!" animations on random rewards; tapping rituals that imply control over a pre-decided outcome.

**Verdict: RED LINE for faked near misses on any random outcome. HEALTHY for genuine skill near misses. GREY for the capsule tap strikes.**

- A10 already forbids fake near misses (back-loaded climbs, no non-climb after a climb) and A10.1 forbids a rarer tile right after the reel winner. Keep both under automated tests (WP12).
- **The tap strikes (A10 step 3) combine personal control with a pre-rolled result**, the exact combination that made near misses potent in [23]. Near misses are already excluded, so the residual risk is small. Close it with one line of honesty on the first capsule and in the odds panel: "The result is decided when you earn the capsule. Tapping reveals it."
- There are no disguised losses: every capsule is a pure gain with no stake. Proportional juice (Pillar 5) keeps small results feeling small.
- The Wardrobe reel (A10.1) looks like a slot machine, a feature UK and portal reviewers flag (`market-portals.md`). Keep it behind the flag, default it off in kid-focused portal builds and the minor-safe profile, and never add "almost" sounds.

### 3.7 Endowed progress and goal gradient

**What they are.** *Endowed progress:* people work harder towards a goal when they start with some progress already filled in. *Goal gradient:* effort accelerates as the goal gets closer.

**Why they work.** Car-wash cards needing 8 stamps were completed 34% of the time when they were "10-stamp cards with 2 pre-filled", against 19% for plain 8-stamp cards [27] *(B, one field experiment plus lab studies)*. Coffee buyers bought more often as a free coffee approached; website raters rated more songs near a reward threshold, then slowed down right after earning it (the post-reward reset) [28] *(B, field data)*.

**Used well.** Progress bars that start partly full (onboarding counts as progress), visible next rewards, short-horizon goals nested in long ones.

**Abused.** Fake progress that resets; an endless chain of carrots with no finish line; progress bars that move deliberately slower near the end.

**Verdict: HEALTHY.**

- Already used well: Trophy Road with visible nodes (A6.3), Codex Level (A6.7), the 3-pip Clay meter, copies bars with "UPGRADE READY" (A10 step 7).
- Endow the start: the Trophy Road and Codex bars should show the tutorial's progress as already filled when Home first appears (A8, ~10:00).
- Use the post-reward reset honestly. After a big reward, show the next goal *and* a natural end point ("Nice session. Next: Kingsmoat at 400 trophies").
- Give tracks real finish lines: the Codex has about 81 levels, the Road ends at 4,000 and Conquest has 27 stars. Celebrate completion rather than silently adding more.

### 3.8 The Zeigarnik effect and the resumption urge

**What it is.** The popular claim is that unfinished tasks are remembered better than finished ones (Zeigarnik, 1927). The companion claim (Ovsiankina) is that people tend to resume interrupted tasks.

**Why it works, and why it partly doesn't.** A 2025 meta-analysis found **no memory advantage for unfinished tasks** (the ratio of interrupted to completed recall was about 0.99 once the original data were excluded), but did find a general **tendency to resume** interrupted tasks [29] *(A-, meta-analysis)*. So the "open loop" pull is real, while the memory story that is often quoted is not.

**Used well.** A half-filled meter at the end of a session gives a gentle reason to come back, and the player chose that goal.

**Abused.** Ending sessions on artificial cliffhangers; open loops that decay unless attended (crops that wither, buildings that break); notifications that re-open loops ("Your capsule is waiting!").

**Verdict: GREY.** Open goals are fine when the player chose them and nothing decays.

- Fine: a partly filled copies bar, a half-cleared Conquest board, a quest at 2/3.
- Never: decay, expiry or reminders written as obligations. The walk-away test (section 1.3) decides.

### 3.9 Collection and set completion

**What it is.** The drive to gather a themed set in which each item adds to the whole.

**Why it works.** Collecting bolsters the self through tangible, attainable goals with concrete feedback on progress [30] *(C/D, conceptual review)*. An economic model shows how set completion shapes collecting, and that the satisfaction of each acquisition is short-lived because attention moves to the next piece [31] *(C, a model)*. The "gotta catch 'em all" pull of Pokémon rests on this plus rarity.

**Used well.** Clear set boundaries, silhouettes that show what is missing, rarity as a status signal, duplicate protection and crafting so the last items are reachable (Hearthstone, Marvel Snap; see `meta-collection.md`).

**Abused.** Sets that can never be completed (endless new series with the old ones rotated out); time-limited exclusives (FOMO); rarity that depends on paying; making the last item deliberately scarce.

**Verdict: HEALTHY with the guardrails Ageborn already has** (pity, no duplicate Legendaries, unowned weighting, Dust crafting, a completion target of about 5 months in A6.9).

- Add explicit **Age sets**: completing an age's 11 cards unlocks that age's banner and a lore page; completing all foils of an age unlocks an animated banner.
- Foils (4% / 1% / 0.25%, A6.4) are Ageborn's shiny hunt: rare, cosmetic and completable through pity-free luck only. Keep them cosmetic-only forever.
- Never add time-limited cards or skins that do not return. Rotating items must come back.

### 3.10 Loss aversion and sunk cost

**What they are.** *Loss aversion:* losses feel larger than equal gains [32]. *Sunk cost:* continuing because of what has already been invested [34].

**Why they work.** Loss aversion is one of the best-known findings in behavioural economics, but its generality is disputed: a 2018 critique argues the evidence does not support a *general* tendency, and that it depends on context [33] *(contested; B for the effect in some contexts)*. Sunk-cost behaviour is shown in classic vignettes [34], but a 2025 study finds those vignettes have low reliability [35] *(C)*. People nevertheless dislike losing what they own or have built.

**Used well.** Protecting players from losses they cannot control: trophy floors, shields after a raid (Clash of Clans), loss protection.

**Abused.** Decay (FarmVille crops wither if you miss the harvest), expiring currencies, streaks that reset, "you will lose X unless you log in", raid losses that pull players back to defend, sunk-cost hooks ("you're 90% done, don't stop now").

**Verdict: GREY. It is healthy only as protection, and a red line when engineered as a hook.**

- Already right: trophies never fall below the current arena gate, and there is no loss below 400 (A6.3); the Clay meter pays on losses; the Warm-up match after 3 losses; nothing decays or expires; banks everywhere.
- Never add decay of cards, levels, trophies or skins; expiring Amber or Dust; streak resets; or copy that frames not playing as a loss.
- Seasons (section 3.17) may soft-reset trophies. Frame it as a fresh start with the old best kept on the Profile, not as a loss.

### 3.11 The IKEA effect and ownership

**What it is.** People value things more when they built them (the IKEA effect) and simply because they own them (the endowment effect).

**Why it works.** People valued their own amateur furniture, origami and Lego builds close to experts' work. **The effect disappeared when the creation was destroyed or left unfinished** [36] *(B)*. The endowment effect is long established [37] *(A-)*.

**Used well.** Hay Day farms and Clash of Clans bases players lay out themselves; deck building; customised avatars.

**Abused.** Holding the creation hostage (losing it if you stop), or letting power creep make it worthless.

**Verdict: HEALTHY.**

- A War Plan is a creation. Protect it: new cards are sidegrades, not replacements (D1 v1.2 already says "role sidegrades, not new roles"), and balance changes should not silently wreck a plan (show a "changed" marker on affected cards).
- Add a personal space: the **Hall of Ages** (section 7, idea F), a decoratable backdrop for Home and the Profile that holds earned relics, banners and statues of maxed cards. This is the Hay Day farm feeling without timers.
- Save export (B8) protects ownership. Keep the backup reminder.

### 3.12 Social comparison, status and competition

**What it is.** People evaluate themselves by comparing with others, especially similar others [38]. Competition turns that into a game. Status is the visible result.

**Why it works.** Top leaderboard positions raise motivation and bottom positions lower it [40] *(B)*. In a pre-registered field experiment with over 1,000 users, leaderboard composition changed how much people contributed [39] *(B)*. In a controlled experiment, leaderboards and levels raised performance but not intrinsic motivation [41] *(B)*. The appeal of competition drops more with age than any other motivation, most steeply between 13 and 35 (r = −0.30 for men and −0.19 for women) [42][95] *(B, 466,000+ survey respondents)*. In Pokémon GO, competition and fantasy motives predicted problematic play [61] *(C)*. Competence frustration from losing causes aggression and quitting [4].

**Used well.** Relative leaderboards (you and the ten players around you), friend boards, seasons that reset, separate ladders for different skill bands, personal bests.

**Abused.** Global boards that make most players feel like losers; public "bottom" displays; status items that only money or luck can buy (UK children described bullying over default skins [58]); fake social proof.

**Verdict: GREY.** Competition is a core pleasure for Ageborn's likely younger audience, and a demotivator for the losing half.

- v1 (offline, bots): the AI ladder, Conquest, the Daily Challenge and personal records already cover it. Keep "AI" labels on every comparison (A7.1).
- Add friend-scale comparison without a server: challenge links and a shareable Daily Challenge result (section 7, ideas B and C).
- Later PvP: relative and friend leaderboards first, global top lists only for the top tier, level-capped Ranked (already in D1), and emotes only.
- Offer non-competitive routes to status (collection %, Codex Level, Conquest stars, cosmetics) for players who dislike ladders. The design already has these (A6.1).

### 3.13 Reciprocity and gifting

**What it is.** The norm of returning favours [43]. A small unsolicited favour (a soft drink) doubled how many raffle tickets people later bought from the giver, regardless of how much they liked him [43] *(B, a classic experiment)*.

**Why it works in games.** FarmVille-era social games "entangle users in a web of social obligations": gifts and help create a felt duty to reciprocate, and ignoring a request feels rude [44] *(C/D, qualitative)*. Clash of Clans troop donations and Clash Royale card donations use the same norm for co-operation.

**Used well.** Donations inside a chosen group, with no penalty for not giving and no notifications demanding a return.

**Abused.** Gift requests that spam friends; progress gated on friends' help; guilt messages; gifts that expire unless reciprocated; rewards for recruiting.

**Verdict: GREY, and mostly a v2 question** (clans and online play come after v1).

- Developer "gifts" (the starter capsules, the 150-gold tutorial gift) are healthy **as long as they are never paired with an ask**. No "we gave you a Legendary, now rate us or share".
- When clans arrive: donations are voluntary, have no counters shaming non-donors, send no notifications, and carry no progress penalty.
- Never reward inviting or sharing. The KIDS Act proposal targets "rewards for sharing content to large audiences" [85], so Clip Mode (D1) must stay reward-free.

### 3.14 Curiosity gaps and mystery

**What it is.** Curiosity arises when people notice a gap between what they know and what they want to know, and peaks with a small amount of knowledge (information-gap theory [45]).

**Why it works.** Curiosity about trivia answers activated reward-anticipation regions, and higher curiosity improved memory of surprising answers one to two weeks later [46] *(B)*.

**Used well.** Silhouettes of unowned items, "???" entries, secret achievements, hidden lore, fog-of-war maps.

**Abused.** Clickbait gaps resolved only by returning later or by waiting on a timer ("Come back tomorrow to see what's inside!").

**Verdict: HEALTHY.**

- Already there: silhouettes for unowned cards (A9, screen 10) and the NEW silhouette-fill reveal (A10).
- Add secret achievements for discoverable feats ("Win using only Stone Age units in Full War"), hidden lore lines on card detail pages unlocked by mastery, and an expedition map with fog (section 7, idea A).
- Never gate the answer to a mystery behind a calendar.

### 3.15 Novelty and variety

**What it is.** New and varied experiences are intrinsically rewarding; repeated identical experiences fade (hedonic adaptation).

**Why it works.** The human midbrain dopamine region responds to *absolute* stimulus novelty, and novelty enhances learning [47] *(B, fMRI)*. People adapt to constant stimuli but less to varied ones, and variety slows the fading of good experiences [48] *(B)*.

**Used well.** Rotating modes and modifiers, a steady cadence of new content, surprising events.

**Abused.** Novelty as FOMO: limited-time content that never returns, and events whose rewards are exclusive.

**Verdict: HEALTHY.**

- Already there: 6 symmetric daily modifiers (A9.1), 5 ages per match, 11 Generals with personalities, and content as data (new ages in v1.2).
- Weekly events (D1 v1.2) must use returning rewards: an event skin missed this month comes back in a later rotation or can be crafted with Dust.

### 3.16 The peak-end rule

**What it is.** People judge an experience mostly by its most intense moment and its end, not by its average or length [49].

**Why it works.** In the classic cold-water study, most participants chose to repeat a *longer* trial with a milder ending; colonoscopy patients rated a longer procedure with a gentler end as less unpleasant [49] *(A-, replicated in many domains)*. In casual games, peak-end manipulations strongly shaped remembered challenge but had mixed effects on fun and on the wish to replay [50] *(B-)*.

**Used well.** Big climactic moments and satisfying endings to matches and sessions.

**Abused.** Ending sessions on an ask (an offer, a notification opt-in, a "don't break your streak" prompt).

**Verdict: HEALTHY.**

- Peaks already designed: the evolve sequence (Pillar 2), the Legendary walkout, the base-fall slow motion.
- Ends: the Result screen stages rewards one at a time (A9). Keep defeats ending on something good too (Clay pip, quest progress, "best moment" replay).
- Add a **session wrap-up card** when capsule charges run out or after about 30 minutes: highlights of the session, cards improved, and the next goal. It is a natural stopping cue that ends on a peak (section 3.18).

### 3.17 Appointment mechanics and streaks

**What they are.** *Appointment mechanics* reward coming back at set times (daily chests, energy that refills, crops that ripen). *Streaks* count consecutive days and reset when you miss one.

**Why they work.** Intact streaks highlighted in a log raise continued engagement relative to broken ones, independent of actual past behaviour. Breaks hurt most when self-attributed, and the effect weakens when a streak can be repaired [51] *(B, seven studies)*. Duolingo reports large retention gains from streak features and fewer drop-outs after adding streak freezes [53] *(D, company claims via secondary sources)*. Temporal landmarks (a new week, month or season) boost aspirational behaviour: the fresh-start effect [56] *(B)*.

**Abused.** Snapchat streaks are associated with problematic smartphone use and fear of missing out in early adolescents, and are experienced as social pressure [52] *(C, correlational)*. FarmVille's withering crops punished absence. Clash Royale removed chest timers in 2025 because they "forced multiple logins" a day (`meta-collection.md`, [91]). Regulators now name streaks explicitly (PEGI 12 when punishing, the Jutland Declaration, the KIDS Act proposal) [80][83][85].

**Verdict: RED LINE for streaks that reset, and for decay or withering. GREY (acceptable) for daily cadences that bank. HEALTHY for fresh starts and rest bonuses.**

- **No login streak and no win-streak rewards that vanish.** This overrides the "login streak" D1 hook in `market-portals.md`.
- Keep all banks: capsule charges bank 12, the Daily Capsule banks 3, daily quests bank 6 (A6.3, A6.7).
- **Fix the one unbanked daily reward.** The Daily Challenge's first-win Age Capsule (A9.1) is lost if a day is missed. Make the last 3 days' challenges playable, each with its own first-win reward, so a missed day costs nothing within the window. The seed is date-derived, so this is cheap.
- Add a **rest bonus** instead of a streak (the World of Warcraft "rested" idea): after 2 or more days away, the next 3 wins pay +50% Amber. It rewards returning without punishing absence.
- Add **seasons** (monthly or 6-weekly) as fresh starts: a soft trophy reset above a threshold, a season banner for the highest arena reached, best-ever kept on the Profile. Season cosmetics return in later seasons.

### 3.18 Habit formation

**What it is.** Behaviour repeated in a stable context becomes automatic: a cue triggers the routine, and the reward reinforces it. The popular "cue, routine, reward" loop (Duhigg, Eyal) simplifies a solid academic literature.

**Why it works.** In a real-world study, automaticity for a daily behaviour reached 95% of its plateau after a **median of 66 days (range 18-254)**, for the participants whose data could be modelled [54] *(B, 82 of 96 analysed)*. Habits are driven by context cues and can persist after the reward loses its value, which is why they are both efficient and hard to break [55] *(A-, review)*.

**Used well.** A small daily ritual with a natural end (Wordle's one puzzle a day, which its creator described as scarcity that leaves you wanting more [93]).

**Abused.** External triggers designed to interrupt (push notifications, e-mails, badges on app icons), especially at night; rituals with no end.

**Verdict: GREY.** A healthy habit is "a good 15-minute session most days, with a clear end". An unhealthy one is "a cue I can't ignore".

- Cues live *inside* the game (the Home screen shows what is ready). There are no push notifications in v1. If the PWA (D1 v1.2) or the app ever enables them: opt-in only, at most one a day, never between 22:00 and 08:00, and never guilt copy. The KIDS Act proposal bans night-time notifications for minors [85].
- The Daily Challenge is the Wordle-like ritual: one special match a day, the same seed for everyone, a shareable result, done.
- Add optional time tools in Settings: "Play time today" and a break reminder (off / 30 / 60 / 90 min). They are cheap, respectful, and anticipated by the DSA guidelines and the KIDS Act [82][85].

### 3.19 Identity and self-expression (cosmetics)

**What it is.** Players use avatars, skins, banners and titles to express who they are and how good they are.

**Why it works.** In a 126-player experiment, customising an avatar increased identification with it, which raised autonomy, immersion, effort, enjoyment and time played [57] *(B)*.

**Used well.** Earned cosmetics that signal skill or dedication; broad customisation so everyone can look good.

**Abused.** Paid cosmetics as a status divide. Children interviewed for the Children's Commissioner for England described being mocked for "default" skins they could not afford [58] *(D, qualitative)*. Time-limited cosmetics as FOMO.

**Verdict: HEALTHY, because every cosmetic in Ageborn is earned.**

- Keep the procedural avatar, banners, frames, titles and per-card skins (A6.1, A5.8). Make sure default looks are attractive, so that no one feels "default".
- Tie titles and frames to skill and dedication (Conquest stars, seasons, mastery), not to luck alone.
- No cosmetic that is time-limited and never returns.

### 3.20 Narrative and discovery

**What it is.** Stories and worlds that invite exploration. Narrative transportation (being absorbed in a story) changes attitudes and deepens engagement [59]. Explorer-type players are driven by discovery.

**Why it works.** Curiosity and novelty (sections 3.14 and 3.15) plus meaning. Nostalgia was a significant predictor of continued Pokémon GO play [60] *(B)*, and Ageborn's "from clubs to lasers" premise is itself nostalgic.

**Used well.** Characters with personality, lore unlocked through play, maps and secrets.

**Abused.** Rarely harmful in itself. The abuse is gating story chapters behind timers or streaks.

**Verdict: HEALTHY.**

- The AI Generals already have personality lines (A7.4). Give each a short story arc revealed through Conquest stars.
- The Chronicle campaign (D1 v1.2) and an expedition map (section 7, idea A) are the discovery layer.

---

## 4. The owner's reference games, decoded

### 4.1 Pokémon GO: the treasure hunt

| What made it gripping | Evidence | Transfer to Ageborn |
|---|---|---|
| Exploring the real world; rare spawns in real places | Outdoor activity, enjoyment, challenge and nostalgia predicted continued play [60] | **No GPS** (below). Transfer discovery instead: an expedition map with fog and relics, and rare sightings in battle with disclosed odds (section 7, ideas A and J) |
| Collecting with rarity (and shiny variants) | Collection motives [30]; the ten motive factors in [61] | Age sets and foils (section 3.9) |
| Social play: raids, community days, friends | Socialising and competition predicted spending intent [60] | Friend challenge links now; co-op events later |
| Novelty of launch | Step gains of about 1,470 steps a day (+25%) in the first 30 days [62] had faded by week 6 [63] | Novelty fades fast; durable play needs mastery and people, not only discovery |

**Why no location features.** Pokémon GO was linked to 286 extra crashes in one US county over 148 days after launch, 134 of them near PokéStops, including 2 deaths [64] *(B, a natural experiment; the national extrapolation is speculative)*. Location data from children is exactly what the KIDS Act proposal wants off by default [85]. Ageborn v1 has no server and no accounts. **Verdict: location-based play is a red line; the discovery psychology is healthy.**

### 4.2 TikTok: what makes it hard to put down

| Mechanism | Verdict for Ageborn | Why |
|---|---|---|
| Zero-friction start: content before any decision | **Healthy** (already: ≤3 s load, the title screen is a live battle, A8) | Respects the player's time |
| Very short units with a fast payoff (15-60 s) | **Healthy**: Short War format, the 3-minute first match, clips | Short units give natural decision points between them |
| Autoplay, the next item starting by itself | **Red line** | Autoplay reduced children's self-regulation and extended viewing in a 3-week home study [67] (B-). Named by the EU as addictive design [66] |
| Infinite feed with no stopping cues | **Red line** | Users describe a regretted loop and usually leave for outside reasons, not in-app cues [68] (C). Small "partitions" help people stop [69] (B) |
| Personalised recommender as a variable-reward engine | **Red line** for rewards and content | Personalised clips activate the midbrain reward region and self-referential networks more than generic ones [65] (C, small fMRI). Never personalise drops or rewards to maximise time |
| Creator loop and social validation | **Healthy** if unrewarded | Clip Mode (D1 v1.1) lets players make and share highlights. Never pay in-game rewards for posting [85] |

**Rule for Ageborn:** after every match the player chooses what happens next. "Next battle" is a button, never a countdown. Capsule "Open all" ends on the summary, not in a new battle.

### 4.3 Clash of Clans and Hay Day: improving for years

| What sustains them | Evidence | Transfer |
|---|---|---|
| A personal creation (base, farm) the player lays out | IKEA effect [36]; design analyses [96] (D) | Hall of Ages; War Plans as creations (section 3.11) |
| An early aspirational example (Hay Day shows a neighbour's advanced farm early) | Design analysis [96] (D) | Show a maxed War Plan preview and future ages in the Collection and Trophy Road; the tutorial already reaches lasers in 3 minutes |
| Long, nested progression (Town Hall levels over years) | D | Nested horizons (section 5) with skill as the uncapped layer |
| Clans: donations, wars, chat | Reciprocity [43][44]; relatedness [1] | Friend links now, clans later with emote-only communication |
| **Hay Day's crops never wither**, and Supercell says there is no punishment for playing your own way [90] (D) | Contrast with FarmVille's withering (section 3.10) | Adopt as a principle: nothing in Ageborn decays |
| Builders and timers with paid skips | The monetisation engine (D) | **Do not copy.** Without money, a timer is just friction. Clash Royale itself removed chest timers in 2025 [91] |
| Resource raids by other players (loss aversion pulls players back to defend) | D | **Do not copy.** Loss-based return hooks fail the walk-away test |

### 4.4 Clash Royale

Covered in depth in `meta-collection.md`. From the psychology angle: its instant Lucky Drops with a tap-to-climb reveal, level-capped tournaments and Card Mastery [92] are healthy patterns; paid Elite Wild Cards and level-cap raises were the hated ones.

---

## 5. Engagement blueprint: from seconds to years

Durable games give players a reason to care at every time scale. This is Ageborn's map, with the main lever at each scale.

| Horizon | What the player cares about | Main levers | Status |
|---|---|---|---|
| Seconds | The next decision; hits, kills, gold ticking in | Flow, juice, prediction error inside play | Designed (Pillars 3 and 5, A12) |
| Minutes (a match, 3-8 min) | Evolving first; the Age Power; the comeback | Anticipation of known peaks, close matches, peak-end | Designed (A2, A10) |
| Session (15-20 min) | 3-4 matches, a capsule, an upgrade, a quest | Goal gradient, variable reward, natural end | **Add** the session wrap-up card and time tools |
| Day | Daily Challenge, Daily Capsule, quests | Novelty, gentle appointments, all banked | Designed; **fix** the Daily Challenge window |
| Week | Weekly quest; weekly event (v1.2) | Goal gradient, variety | Designed; events must use returning rewards |
| Season (4-6 weeks) | A fresh ladder run, a season banner | Fresh start, status | **Add** seasons (v1.1) |
| Months | Completing the collection (~5 months), Codex Level, Conquest stars | Collection, endowed progress, mastery | Designed (A6.9) |
| Years | Getting better; expressing yourself; people | Mastery (uncapped), identity, IKEA effect, relatedness, new ages as data | **Add** card mastery badges, Conquest+, the Hall of Ages, friend links; later PvP and clans |

---

## 6. Audit of the current design

| # | Feature (DESIGN ref) | Levers | Verdict | Change proposed (owner WP) |
|---|---|---|---|---|
| 1 | Pre-rolled capsules, shuffle bag, visible odds and pity (A6.4, A6.5) | Variable reward, honesty | Healthy | Keep |
| 2 | 4 tap "strikes" on capsules (A10 step 3) | Illusion of control | Grey | Add "Decided when earned. Tapping reveals it." to the first capsule and the odds panel (WP10, i18n) |
| 3 | No fake near misses; back-loaded climbs; reel neighbour rule (A10, A10.1) | Near miss | Healthy | Keep; assert both rules in tests (WP12) |
| 4 | Wardrobe reel, default on (A10.1) | Slot resemblance | Grey | Default off in kid-focused portal builds and the minor-safe profile; no "almost" audio (WP10, WP11) |
| 5 | Onboarding script capsules 1-5 (A6.5) | Early big win, endowed progress | Grey (honesty) | Label them "Starter Capsule: contents are set to get you started" in the odds panel instead of showing bag odds (WP10, WP9). Evidence that early big wins drive persistence is weak [24], so this is about Pillar 4 |
| 6 | Capsule charges: bank 12, +1 per 6 h (A6.3) | Appointment | Grey (healthy form) | Keep. Never show "charges wasted"; when full, show a calm "Full" (WP9) |
| 7 | Daily Capsule, banks 3 (A6.3) | Appointment | Grey (healthy form) | Keep; the minor-safe profile banks 7 (section 9.3, WP7 data) |
| 8 | Daily quests: 3, bank 6, reroll (A6.7) | Goal gradient, overjustification | Healthy/grey | Lower the weight of engagement-only quests ("Play 3 battles", "Train 30 units"); favour skill and variety quests, which the pool already has [9] (WP1/WP7 data) |
| 9 | Daily Challenge: first win of the day only (A9.1) | Appointment, novelty | Grey | Keep the last 3 days playable, each with its first-win reward (WP7, WP9) |
| 10 | Clay meter on losses and draws (A6.3) | Loss softening, competence | Healthy | Keep |
| 11 | Warm-up match after 3 losses, disclosed (A6.3) | Competence | Healthy | Keep |
| 12 | Hidden MMR aiming at a 60% win rate; +10 mistake rate for new players (A6.8) | Flow, competence | Healthy (disclosed) | Keep the Help text "Opponent difficulty adapts to your recent results" (A7.1). Never use churn prediction to choose opponents (red line [79]) |
| 13 | Trophy floors at arena gates (A6.3) | Loss aversion | Healthy | Keep |
| 14 | Trophy Road, Codex Level, Conquest (A6.3, A6.7, A6.10) | Endowed progress, goal gradient, mastery | Healthy | Pre-fill with tutorial progress; celebrate completion of each track (WP9) |
| 15 | L10 cap forever, sideways growth (A6.6) | Fair mastery, ownership | Healthy | Keep forever |
| 16 | Result screen with staged, skippable rewards and "Next battle" (A9) | Peak-end, stopping cues | Healthy | Never auto-start; add the session wrap-up card (WP9, WP11) |
| 17 | Open all, skip after first view, 10 s caps (A10) | Autonomy | Healthy | Keep |
| 18 | Profile stats, 20 replays, history (A6.1) | Mastery, self-comparison | Healthy | Add personal bests and "you vs 30 days ago" (WP9) |
| 19 | AI Generals with personalities, AI labels everywhere (A7) | Relatedness, narrative, honesty | Healthy | Keep; add short story arcs through Conquest (content) |
| 20 | Foils, skins, banners, frames, titles (A5.8, A6.4) | Collection, identity | Healthy | Add Age sets and foil sets (WP7, WP9) |
| 21 | Local event log, export (A8) | Measurement | Healthy | Add an optional one-question mood check in playtest builds (WP11) |
| 22 | Settings (A9, screen 15) | Well-being | **Missing** | Add "Play time today" and a break reminder, off by default in the standard build and on in the minor-safe profile (WP9, WP11) |
| 23 | D1 v1.1: Clip Mode, Ghost of You, achievements, Mythic tier with hard pity | Creation, relatedness, mastery | Healthy | Never reward sharing; include secret achievements; Mythic stays earn-only |
| 24 | D1 v1.2: weekly events, PWA | Novelty; notifications | Grey | Event rewards return later; PWA push only under the rules in section 3.18 |
| 25 | `market-portals.md` D1 hook list includes "a login streak" | Streak | **Red line** | Do not build. Use the rest bonus and seasons instead |

---

## 7. New feature ideas, graded

These are proposals for the roadmap. None is required for v1 except the small audit fixes above.

| Idea | What it is | Levers | Verdict | Notes |
|---|---|---|---|---|
| **A. Expedition maps** (v1.2, with the Chronicle campaign) | One fog-of-war map per age. Each Conquest or Chronicle win reveals a tile: a relic (cosmetic), a lore page, a banner, sometimes a rare golden tile. Tracks on revealed tiles hint where rare tiles lie. Nothing is timed | Treasure hunt, curiosity, collection, autonomy | Healthy | The Pokémon GO feeling without GPS. Deterministic from the save seed, odds disclosed |
| **B. Friend challenge link** (v1.1) | "Challenge a friend" creates a URL holding a seed, format and War Plan. The friend plays the "Ghost of <name>" (labeled: AI playing their plan). Both can share results | Relatedness, competition, status | Healthy | No server: the deterministic sim makes results reproducible from the replay (B3). Label ghosts as AI |
| **C. Daily Challenge share card** (v1.1) | "Copy result" produces a spoiler-free text line with the day number, modifier, result, time to Future Age and age icons | Relatedness, social comparison, habit | Healthy | Wordle's proven loop [93]. No reward for sharing |
| **D. Seasons** (v1.1) | 4-6 week ladder seasons, soft reset above a threshold, season banner by best arena, best-ever kept | Fresh start [56], mastery, status | Healthy | Season cosmetics return in later seasons |
| **E. Card mastery badges** (v1.1) | Per-card cosmetic tiers for feats with that card (wins, evolves while it is on the field, kills vs its counter role) | Mastery, collection, identity | Healthy | A years-long goal that does not add power. Clash Royale precedent [92] |
| **F. Hall of Ages** (v1.2) | A decoratable scene behind Home and on the Profile/VS card: relics, banners, trophies, statues of L10 cards | IKEA effect, identity, collection | Healthy | Hay Day's farm without timers or decay |
| **G. Conquest+** (v1.1) | Heroic versions of each General with disclosed symmetric modifiers and new stars | Mastery, flow | Healthy | Content as data |
| **H. Rest bonus** (v1.1) | After 2+ days away, +50% Amber on the next 3 wins ("Well rested") | Rewards return without punishment | Healthy | Replaces any streak idea |
| **I. Session wrap-up card** (v1) | When charges hit 0 or after ~30 min: session highlights, cards improved, the next goal, and "See you next time" | Peak-end, stopping cue | Healthy | Cheap and brand-defining |
| **J. Rare sightings** (v1.2) | In battles from Arena 2, a disclosed small chance ("about 1 in 40 battles") that a neutral relic beast wanders mid-lane; if your side kills it, you get a cosmetic relic | Treasure hunt, variable reward in play, clips | Grey | Must be a sim event defined in content (the sim owns timing), symmetric, with no gold or XP so balance is untouched. Pre-rolled from the match seed; odds shown in the Codex |
| **K. Minor-safe profile** (v1.1) | A platform feature flag set (section 9.3) | Regulation insurance | Healthy | Data and flags only |

---

## 8. Red lines (never ship)

1. **Anything bought with money**, ads that give random rewards, or any bridge from real value to capsules (already a hard rule).
2. **Faked near misses**, odds that change without a visible note, drop odds personalised by behaviour or churn risk.
3. **Outcome manipulation for retention**: engagement-optimised matchmaking [79], hidden stat rubber-banding, bots that cheat quietly.
4. **Punishing absence**: login streaks that reset, decay of cards, levels, trophies or skins, expiring currencies, withering, unbanked daily rewards that silently vanish.
5. **FOMO**: time-limited exclusives that never return, countdowns designed to pressure, "last chance" copy.
6. **Interrupting triggers**: push notifications or e-mails designed to pull players back, any notification between 22:00 and 08:00, guilt copy ("Your army misses you").
7. **No stopping points**: autoplaying the next match, chaining capsule opening into a new battle, infinite sequences.
8. **Social obligation loops**: gift requests, "help your friend or they lose", donation shaming, rewards for inviting or sharing.
9. **Deceptive social signals**: bots presented as humans (hard rule), fake "players online" counts.
10. **Location, camera or microphone** data for gameplay.
11. **Public shaming**: bottom-of-board displays, especially for children.
12. **Confirmshaming and manipulative copy**: "No thanks, I like losing".
13. **Personalised engagement feeds** (TikTok-style recommendation of content or rewards to maximise time).

---

## 9. Guardrails and measurement

### 9.1 Five principles, in the owner's words

- **Bank, don't expire.** Anything timed waits for the player.
- **Show, don't hide.** Odds, pity, adaptive difficulty and scripted starters are all visible.
- **End, don't loop.** Every match and session has a natural end, and the next step is always the player's choice.
- **Earn, don't buy.** Nothing is for sale, ever.
- **Invite, don't nag.** The game shows what is ready when the player opens it, and never reaches out.

### 9.2 Measuring healthy engagement

- **Retention over raw playtime.** Portal dashboards reward average playtime (`market-portals.md`). Use them, but judge changes on D1/D7/D30 return and on satisfaction. Hours alone say little about well-being [7][8].
- **Warning signs in the local event log (A8):** very long sessions (over 90 minutes), frequent late-night sessions by local clock, and sessions that end straight after a loss streak (frustration quits). None of this leaves the device.
- **Playtests:** the PENS need-satisfaction questionnaire [1] or a short version of it, plus one question after a session: "Was that time well spent?" A change that raises playtime but lowers these scores does not ship.
- **Tests (WP12):** keep automated checks for the no-near-miss rules, pre-rolling before animation, and "nothing expires" across a simulated 30-day absence.

### 9.3 Minor-safe profile (insurance for the KIDS Act and kid-focused portals)

A set of `platform.features` flags plus economy data, with no new rules in `meta`:

The design goal is simple: **a child who plays once a week earns the same as one who plays every day**, and nothing rewards longer sessions.

| Flag or data | Standard build | Minor-safe profile |
|---|---|---|
| `reelReveal` (exists) | on | off (card flip) |
| Daily Capsule bank | 1 per day, banks 3 | 1 per day, banks 7 (a full week) |
| Capsule charges bank | +1 per 6 h, banks 12 (3 days) | +1 per 6 h, banks 28 (7 days) |
| Daily quests bank | 6 | 21 (7 days) |
| Daily Challenge reward window | last 3 days | last 7 days |
| Break reminder | off | 60 min |
| Global comparisons (later PvP) | relative boards | friends only |
| Random capsules for minors (only if the final KIDS Act text requires it for free rewards) | as designed | "Pick 1 of 3 shown cards" plus fixed contents per tier |

Longer banks remove any reason to return on a schedule without rewarding more play per session. Switching cadences to "every N matches" would do the opposite, so avoid it. Because content is data (CLAUDE.md), this is mostly configuration. Decide whether to build the profile when the KIDS Act text stabilises; keep bank sizes and cadences as data now.

---

## 10. Sources

Evidence grades as in section 1.1. Items marked "summary" were read through abstracts or reputable summaries only (see Research limits).

1. Ryan, Rigby, Przybylski (2006). The motivational pull of video games: a self-determination theory approach. *Motivation and Emotion* 30, 347-363. https://link.springer.com/article/10.1007/s11031-006-9051-8 (B+)
2. Tyack, Mekler (2020). Self-determination theory in HCI games research: current uses and open questions. *CHI 2020*. https://dl.acm.org/doi/abs/10.1145/3313831.3376723 (review)
3. Przybylski, Weinstein, Ryan, Rigby (2009). Having versus wanting to play: harmonious versus obsessive engagement in video games. *CyberPsychology & Behavior*. https://journals.sagepub.com/doi/abs/10.1089/cpb.2009.0083 (B)
4. Przybylski, Deci, Rigby, Ryan (2014). Competence-impeding electronic games and players' aggressive feelings, thoughts, and behaviors. *JPSP* 106(3), 441-457. https://pubmed.ncbi.nlm.nih.gov/24377357/ (B)
5. Przybylski, Murayama, DeHaan, Gladwell (2013). Motivational, emotional, and behavioral correlates of fear of missing out. *Computers in Human Behavior*. https://www.sciencedirect.com/science/article/abs/pii/S0747563213000800 (B)
6. Johannes, Vuorre, Przybylski (2021). Video game play is positively correlated with well-being. *Royal Society Open Science*. https://pubmed.ncbi.nlm.nih.gov/33972879/ (B+, telemetry)
7. Vuorre, Johannes, Magnusson, Przybylski (2022). Time spent playing video games is unlikely to impact well-being. *Royal Society Open Science* 9, 220411 (38,935 players, 7 publishers). https://royalsocietypublishing.org/rsos/article/9/7/220411/96718/Time-spent-playing-video-games-is-unlikely-to (A-)
8. Perceived value of video games, but not hours played, predicts mental well-being in casual adult Nintendo players (2025). *Royal Society Open Science*. https://pmc.ncbi.nlm.nih.gov/articles/PMC11896691/ (B)
9. Deci, Koestner, Ryan (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin* 125, 627-668. https://www.researchgate.net/publication/12712628 (A for lab tasks; transfer to games C)
10. Csikszentmihalyi (1990). *Flow: The Psychology of Optimal Experience*. Harper & Row. (theory)
11. Sweetser, Wyeth (2005). GameFlow: a model for evaluating player enjoyment in games. *Computers in Entertainment*. https://dl.acm.org/doi/pdf/10.1145/1077246.1077253 (D, model)
12. Fong, Zaleski, Leach (2015). The challenge-skill balance and antecedents of flow: a meta-analytic investigation. *Journal of Positive Psychology* 10(5), 425-446. https://www.tandfonline.com/doi/abs/10.1080/17439760.2014.967799 (A-)
13. Abuhamdeh, Csikszentmihalyi (2012). The importance of challenge for the enjoyment of intrinsically motivated, goal-directed activities. *PSPB* 38(3), 317-330. https://pubmed.ncbi.nlm.nih.gov/22067510/ (B)
14. Stafford, Dewar (2014). Tracing the trajectory of skill learning with a very large sample of online game players. *Psychological Science* 25(2), 511-518. https://pubmed.ncbi.nlm.nih.gov/24379154/ (A)
15. Schultz, Dayan, Montague (1997). A neural substrate of prediction and reward. *Science* 275, 1593-1599. (A)
16. Fiorillo, Tobler, Schultz (2003). Discrete coding of reward probability and uncertainty by dopamine neurons. *Science* 299, 1898-1902. https://pubmed.ncbi.nlm.nih.gov/12649484/ (A, primate)
17. Koepp et al. (1998). Evidence for striatal dopamine release during a video game. *Nature* 393, 266-268. https://pubmed.ncbi.nlm.nih.gov/9607763/ (C, n = 8)
18. Hopson (2001). Behavioral game design. *Gamasutra*. https://www.gamedeveloper.com/design/behavioral-game-design (D)
19. Hopson, "There is no Skinner Box" (talk report). https://www.gamedeveloper.com/design/there-is-no-skinner-box-says-bungie-user-research-lead (D)
20. Berridge, Robinson (2016). Liking, wanting, and the incentive-sensitization theory of addiction. *American Psychologist*. https://sites.lsa.umich.edu/berridge-lab/wp-content/uploads/sites/743/2019/10/2016-Berridge-Robinson-Liking-wanting-IS-theory-of-addiction-Am-Psychol.pdf (A-)
21. Knutson, Adams, Fong, Hommer (2001). Anticipation of increasing monetary reward selectively recruits nucleus accumbens. *J Neurosci* 21, RC159. https://www.jneurosci.org/content/21/16/RC159 (B)
22. Loewenstein (1987). Anticipation and the valuation of delayed consumption. *Economic Journal* 97, 666-684. (B)
23. Clark, Lawrence, Astley-Jones, Gray (2009). Gambling near-misses enhance motivation to gamble and recruit win-related brain circuitry. *Neuron* 61(3), 481-490. https://pubmed.ncbi.nlm.nih.gov/19217383/ (B)
24. Kassinove, Schare (2001). Effects of the "near miss" and the "big win" on persistence at slot machine gambling. *Psychology of Addictive Behaviors* 15(2), 155-158. https://pubmed.ncbi.nlm.nih.gov/11419232/ (B-)
25. Dixon et al. (2010). Losses disguised as wins in modern multi-line video slot machines. *Addiction* 105, 1819-1824. https://pubmed.ncbi.nlm.nih.gov/20712818/ (B)
26. Langer (1975). The illusion of control. *JPSP* 32, 311-328. https://www.semanticscholar.org/paper/The-illusion-of-control.-Langer/136e9cf6b5a4d17dbe8400fa5d7f4bf3ad01f6ac (B, classic)
27. Nunes, Drèze (2006). The endowed progress effect. *Journal of Consumer Research* 32(4), 504-512. Summary: https://www.psychologyofgames.com/2010/11/endowed-progress-effect-and-game-quests/ (B)
28. Kivetz, Urminsky, Zheng (2006). The goal-gradient hypothesis resurrected. *Journal of Marketing Research* 43(1), 39-58. https://home.uchicago.edu/ourminsky/Goal-Gradient_Illusionary_Goal_Progress.pdf (B)
29. Ghibellini, Meier (2025). Interruption, recall and resumption: a meta-analysis of the Zeigarnik and Ovsiankina effects. *Humanities and Social Sciences Communications*. https://www.nature.com/articles/s41599-025-05000-w (A-, summary)
30. McIntosh, Schmeichel (2004). Collectors and collecting: a social psychological perspective. *Leisure Sciences* 26(1). https://www.tandfonline.com/doi/abs/10.1080/01490400490272639 (C/D)
31. Carey (2008). Modeling collecting behavior: the role of set completion. *Journal of Economic Psychology* 29, 336-347. https://www.sciencedirect.com/science/article/abs/pii/S0167487007000682 (C)
32. Kahneman, Tversky (1979). Prospect theory. *Econometrica* 47, 263-291. (A-, contested scope)
33. Gal, Rucker (2018). The loss of loss aversion: will it loom larger than its gain? *Journal of Consumer Psychology* 28(3). https://myscp.onlinelibrary.wiley.com/doi/abs/10.1002/jcpy.1047 (critique)
34. Arkes, Blumer (1985). The psychology of sunk cost. *OBHDP* 35, 124-140. https://www.sciencedirect.com/science/article/abs/pii/0749597885900494 (B)
35. On the low reliability of sunk cost vignettes (2025). https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12384923/ (critique)
36. Norton, Mochon, Ariely (2012). The IKEA effect: when labor leads to love. *Journal of Consumer Psychology* 22(3), 453-460. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1777100 (B)
37. Kahneman, Knetsch, Thaler (1990). Experimental tests of the endowment effect and the Coase theorem. *Journal of Political Economy* 98, 1325-1348. (A-)
38. Festinger (1954). A theory of social comparison processes. *Human Relations* 7, 117-140. (theory)
39. Leung (2019). How do one's peers on a leaderboard affect oneself? *CHI 2019*. https://dl.acm.org/doi/10.1145/3290605.3300397 (B, pre-registered)
40. How leaderboard positions shape our motivation (2023). *Internet Research* 33(7). https://www.emerald.com/intr/article/33/7/1/178330/How-leaderboard-positions-shape-our-motivation-the (B)
41. Mekler, Brühlmann, Tuch, Opwis (2017). Towards understanding the effects of individual gamification elements on intrinsic motivation and performance. *Computers in Human Behavior*. https://www.sciencedirect.com/science/article/abs/pii/S0747563215301229 (B)
42. Quantic Foundry: as gamers age, the appeal of competition drops the most. https://quanticfoundry.com/2016/02/10/gamer-generation/ (B, large survey; commercial)
43. Regan (1971). Effects of a favor and liking on compliance. *Journal of Experimental Social Psychology* 7, 627-639; Gouldner (1960). The norm of reciprocity. *American Sociological Review* 25, 161-178. (B)
44. Reciprocity: understanding online social relations (*First Monday*). https://firstmonday.org/ojs/index.php/fm/article/download/3324/3330 ; Consalvo, In polite company: rules of play in five Facebook games. https://www.researchgate.net/publication/220982867 (C/D)
45. Loewenstein (1994). The psychology of curiosity: a review and reinterpretation. *Psychological Bulletin* 116, 75-98. (theory, B)
46. Kang et al. (2009). The wick in the candle of learning: epistemic curiosity activates reward circuitry and enhances memory. *Psychological Science* 20(8), 963-973. https://pubmed.ncbi.nlm.nih.gov/19619181/ (B)
47. Bunzeck, Düzel (2006). Absolute coding of stimulus novelty in the human substantia nigra/VTA. *Neuron* 51, 369-379. https://www.cell.com/neuron/fulltext/S0896-6273(06)00475-2 (B)
48. Frederick, Loewenstein (1999). Hedonic adaptation. In *Well-Being*; Sheldon, Boehm, Lyubomirsky (2012). Variety is the spice of happiness. https://sonjalyubomirsky.com/wp-content/uploads/2024/07/Sheldon-Boehm-Lyubomirsky-2012.pdf (B)
49. Kahneman, Fredrickson, Schreiber, Redelmeier (1993). When more pain is preferred to less: adding a better end. *Psychological Science* 4, 401-405; Redelmeier, Kahneman (1996). *Pain* 66, 3-8. (A-)
50. Gutwin, Rooke, Cockburn, Mandryk, Lafreniere (2016). Peak-end effects on player experience in casual games. *CHI 2016*. https://dl.acm.org/doi/10.1145/2858036.2858419 (B-)
51. Silverman, Barasch (2023). On or off track: how (broken) streaks affect consumer decisions. *Journal of Consumer Research* 49(6), 1095-1117. https://academic.oup.com/jcr/article-abstract/49/6/1095/6623414 (B)
52. Snapchat streaks and problematic smartphone use and FoMO among early adolescents (2023). https://www.sciencedirect.com/science/article/pii/S2772503023000476 (C)
53. Duolingo, How streaks keep learners committed (company blog) and secondary summaries of the streak freeze figures. https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/ ; https://www.strivecloud.io/duolingo-gamification-explained (D)
54. Lally, van Jaarsveld, Potts, Wardle (2010). How are habits formed: modelling habit formation in the real world. *European Journal of Social Psychology* 40(6), 998-1009. https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674 (B)
55. Wood, Rünger (2016). Psychology of habit. *Annual Review of Psychology* 67, 289-314. https://pubmed.ncbi.nlm.nih.gov/26361052/ (A-)
56. Dai, Milkman, Riis (2014). The fresh start effect: temporal landmarks motivate aspirational behavior. *Management Science* 60(10). https://pubsonline.informs.org/doi/10.1287/mnsc.2014.1901 (B)
57. Birk, Atkins, Bowey, Mandryk (2016). Fostering intrinsic motivation through avatar identification in digital games. *CHI 2016*. https://dl.acm.org/doi/10.1145/2858036.2858062 (B)
58. Children's Commissioner for England (2019). Gaming the system. https://www.childrenscommissioner.gov.uk/publication/gaming-the-system/ (D, qualitative)
59. Green, Brock (2000). The role of transportation in the persuasiveness of public narratives. *JPSP* 79, 701-721. (B)
60. Hamari, Malik, Koski, Johri (2019). Uses and gratifications of Pokémon Go. *International Journal of Human-Computer Interaction* 35(9), 804-819. https://researchportal.tuni.fi/en/publications/uses-and-gratifications-of-pok%C3%A9mon-go-why-do-people-play-mobile-l/ (B)
61. Zsila et al. (2018). An empirical study on the motivations underlying augmented reality games: Pokémon Go during and after Pokémon fever. *Personality and Individual Differences*. https://www.sciencedirect.com/science/article/abs/pii/S0191886917304117 (B)
62. Althoff, White, Horvitz (2016). Influence of Pokémon Go on physical activity. *JMIR* 18(12), e315. https://www.jmir.org/2016/12/e315/ (B)
63. Howe et al. (2016). Gotta catch'em all! Pokémon GO and physical activity among young adults. *BMJ*. https://pubmed.ncbi.nlm.nih.gov/27965211/ (B)
64. Faccio, McConnell (2020). Death by Pokémon GO. *Journal of Risk and Insurance*. https://www.nber.org/papers/w24308 (B)
65. Su et al. (2021). Viewing personalized video clips recommended by TikTok activates default mode network and ventral tegmental area. *NeuroImage* 237. https://pubmed.ncbi.nlm.nih.gov/33951514/ (C)
66. European Commission (6 February 2026). Commission preliminarily finds TikTok's addictive design in breach of the Digital Services Act. https://digital-strategy.ec.europa.eu/en/news/commission-preliminarily-finds-tiktoks-addictive-design-breach-digital-services-act (regulatory; summary)
67. Hiniker, Heung, Hong, Kientz (2018). Coco's videos: an empirical investigation of video-player design features and children's media use. *CHI 2018*. https://dl.acm.org/doi/10.1145/3173574.3173828 (B-)
68. Rixen et al. (2023). The loop and reasons to break it: investigating infinite scrolling behaviour in social media applications. *PACM HCI*. https://dl.acm.org/doi/10.1145/3604275 (C)
69. Cheema, Soman (2008). The effect of partitions on controlling consumption. *Journal of Marketing Research* 45(6). https://journals.sagepub.com/doi/10.1509/jmkr.45.6.665 (B)
70. Zagal, Björk, Lewis (2013). Dark patterns in the design of games. *FDG 2013*. https://www.semanticscholar.org/paper/Dark-patterns-in-the-design-of-games-Zagal-Bj%C3%B6rk/19a241378b06d868eb5f6b76027172c3aaca86f4 (taxonomy)
71. Deterding, Stenros, Montola (2020). Against "dark game design patterns". *DiGRA 2020*. https://eprints.whiterose.ac.uk/156460/ (critique: judge patterns by player outcomes and values, not taste)
72. King, Delfabbro (2018). Predatory monetization schemes in video games (e.g. "loot boxes") and internet gaming disorder. *Addiction*. https://onlinelibrary.wiley.com/doi/full/10.1111/add.14286 (commentary)
73. King et al. (2019). Unfair play? Video games as exploitative monetized services: an examination of game patents. *Computers in Human Behavior*. https://www.sciencedirect.com/science/article/pii/S0747563219302602 (C)
74. Petrovskaya, Zendle (2021). Predatory monetisation? A categorisation of unfair, misleading and aggressive monetisation techniques in digital games from the player perspective. *Journal of Business Ethics*. https://link.springer.com/article/10.1007/s10551-021-04970-6 (C, 1,104 players)
75. Garea et al. (2021). Meta-analysis of the relationship between problem gambling, excessive gaming and loot box spending. *International Gambling Studies* 21(3), 460-479. https://ideas.repec.org/a/taf/intgms/v21y2021i3p460-479.html (A-, correlational)
76. Zendle, Meyer, Over (2019). Paying for loot boxes is linked to problem gambling, regardless of specific features like cash-out and pay-to-win. *Computers in Human Behavior*. https://www.sciencedirect.com/science/article/abs/pii/S0747563219302468 (B)
77. Spicer et al. (2022). Loot boxes and problem gambling: investigating the "gateway hypothesis". *Addictive Behaviors*. https://www.sciencedirect.com/science/article/pii/S0306460322000934 (C)
78. Stevens, Dorstyn, Delfabbro, King (2021). Global prevalence of gaming disorder: a systematic review and meta-analysis (3.05%, corrected to 2.96%; 1.96% in stricter samples). *ANZJP*. https://journals.sagepub.com/doi/10.1177/0004867420962851 (A-)
79. Chen et al. (2017). EOMM: an engagement optimized matchmaking framework. *WWW 2017*. https://arxiv.org/abs/1702.06820 (method; shows the technique exists)
80. PEGI (2026). PEGI expands age rating criteria with interactive risk categories. https://pegi.info/news/pegi-expands-age-rating-criteria-interactive-risk-categories ; Reed Smith summary: https://www.reedsmith.com/articles/pegi-launches-interactive-risk-categories-overhauls-age-ratings-for-loot-boxes-in-game-spending-and-communication-features/
81. European Commission (March 2025). Commission and national authorities take action to protect children from harmful practices in video games (CPC key principles, Star Stable). https://ec.europa.eu/commission/presscorner/api/files/document/print/en/ip_25_831/IP_25_831_EN.pdf ; Forbrugerombudsmanden press release (21 March 2025): https://forbrugerombudsmanden.dk/nyheder/forbrugerombudsmanden/pressemeddelelser/2025/20250321-europaeiske-forbrugermyndigheder-griber-ind-overfor-computerspils-virtuelle-penge-og-vaerdier
82. European Commission (14 July 2025). Guidelines on the protection of minors under the DSA. https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors
83. The Jutland Declaration (10 October 2025). https://www.digmin.dk/Media/638956829775203140/DIGMIN_The%20Jutland%20Declaration%20Shaping%20a%20Safe%20Online%20World%20for%20Minors%20101025.pdf
84. European Parliament (26 November 2025). Resolution on the protection of minors online. https://www.europarl.europa.eu/news/en/press-room/20251120IPR31496/children-should-be-at-least-16-to-access-social-media-say-meps
85. EU KIDS Act proposal, COM(2026) 681 (17 September 2026), secondary summaries: Hunton https://www.hunton.com/privacy-and-cybersecurity-law-blog/european-commission-unveils-proposal-for-eu-kids-act ; Covington https://www.insideglobaltech.com/2026/09/21/the-eu-kids-act-proposal-towards-a-new-regulatory-framework-for-the-protection-of-children-online/ ; PocketGamer.biz https://www.pocketgamer.biz/daily-log-in-bonuses-and-activity-streaks-under-threat-in-eu-kids-act/ ; Information Labs (on Article 17 and games) https://informationlabs.org/games-without-frontiers-the-eu-kids-act-might-regulate-the-feed-and-spare-the-game/
86. Freshfields. The EU's proposed Digital Fairness Act: a game developer's guide. https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/the-eus-proposed-digital-fairness-act-a-game-developers-guide-to-potential-imp-102ltio
87. Spillemyndigheden (Danish Gambling Authority). Skin betting and loot boxes: video gaming or gambling? https://www.spillemyndigheden.dk/en/skin-betting-and-loot-boxes-video-gaming-or-gambling
88. UK ICO. Age appropriate design code, standard 13: nudge techniques. https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques/
89. European Commission. Unfair Commercial Practices Directive (Annex I, point 28). https://commission.europa.eu/law/law-topic/consumer-protection-law/unfair-commercial-practices-and-price-indication/unfair-commercial-practices-directive_en
90. Hay Day Wiki, Crops (crops never wither), and a Supercell forum comparison with FarmVille. https://hayday.fandom.com/wiki/Crops ; https://forum.supercell.com/showthread.php/10900-7-reasons-why-Hay-Day-is-better-than-Farmville (D)
91. RoyaleAPI. RIP Chests: 2025 Q1 update. https://royaleapi.com/blog/rip-chests-2025-q1-update?lang=en (D)
92. Supercell. Clash Royale Card Mastery. https://support.supercell.com/clash-royale/en/articles/card-mastery-4.html (D)
93. Wordle (overview, including the creator's one-puzzle-a-day rationale and share-grid spread). https://en.wikipedia.org/wiki/Wordle (D)
94. Hunicke (2005). The case for dynamic difficulty adjustment in games (via `feel-ux.md`). https://dl.acm.org/doi/10.1145/1178477.1178573
95. Quantic Foundry. 5 things we learned about the appeal of competition from over 239,000 gamers. https://quanticfoundry.com/2016/08/11/appeal-of-competition/ (B/D)
96. Game Developer. Game monetization design: analysis of Hay Day; analysis of Clash of Clans. https://www.gamedeveloper.com/business/game-monetization-design-analysis-of-hay-day ; https://www.gamedeveloper.com/business/game-monetization-design-analysis-of-clash-of-clans (D)

---

## Research limits

- The session's network policy blocked page fetches for almost every publisher, government and news site, including the EU, the Danish Consumer Ombudsman, Nature, the Royal Society and trade press. Findings therefore rest on web-search abstracts and reputable summaries, cross-checked across several results where possible. Numbers quoted here match those summaries; re-read the primary sources before quoting them externally.
- The EU KIDS Act was proposed ten days before this report. Secondary sources disagree on whether its variable-reward rule applies to games directly or through an Article 17 code of conduct. Treat section 2 as a watch list, not legal advice. A Danish or EU games lawyer should review before any launch aimed at minors.
- Company figures (Duolingo streaks, Supercell design intent) are graded D and used only as illustrations.
- Brain-imaging studies explain mechanisms; they are not direct evidence that a particular game feature harms players.
