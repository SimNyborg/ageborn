# Engagement benchmarks: what keeps players for months and years, and what Ageborn may borrow (September 2026)

Scope: long-term engagement in Clash of Clans, Hay Day, Clash Royale, Brawl Stars, Pokémon GO, TikTok (as a non-game attention product), Marvel Snap, Hearthstone, Vampire Survivors and other roguelites, Stumble Guys and Fall Guys, Animal Crossing, plus Duolingo, Wordle, chess.com, Pokémon TCG Pocket, Monopoly Go and Squad Busters where they teach something specific. Each system is split by time scale, then translated into what an offline-first, money-free browser battler can borrow and what it must not.

This builds on earlier research and does not repeat it. Chest odds, pity, duplicates, reveal staging and the "what players hate" list are in `meta-collection.md`. Genre complaints are in `genre-peers.md`. Onboarding and juice are in `feel-ux.md`. Portal metrics and clip bait are in `market-portals.md`. Source keys in square brackets resolve in the Sources list at the end.

---

## 0. Key findings

1. **The products that last a decade build "years" from several engines at once, not from one long grind.** Clash of Clans has held about 95-99M MAU through 2025 [CoC2]. It stacks five engines:
   - a yearly vertical step (a new Town Hall every November: TH17 in 2024, TH18 on 17 Nov 2025) [CoC1][CoC3]
   - a weekly competitive reset (Ranked Battles since Oct 2025: groups of 100, promotion and demotion) [CoC5]
   - a weekly co-op event (Raid Weekend) [CoC4]
   - a monthly co-op push (Clan Games) [CoC6]
   - identity (a base you designed)

   Hay Day grew its active base again in its 13th year with the same kind of stack [HD1].
2. **Simplifying and giving more away revived a 9-year-old game.** Clash Royale had its record year in 2025: revenue more than doubled, re-engaged players doubled and new players rose almost 500% [CR3][CR4]. Supercell credits three things:
   - progression changes and "removal of extraneous systems": chest timers, keys, the season shop and banner tokens [CR1]
   - a new mode that brought lapsed players back (Merge Tactics, July 2025) [CR2]
   - a free gift at a viral moment (the Barboltian campaign with a free Barbarian Evolution), amplified by creators nobody paid [CR3][CR4]
3. **Paid power and stagnant metas kill momentum, and new free collection layers bring it back.** Brawl Stars fell from $678.5M (2024) to $272.6M (2025) after Hypercharges and a stale meta [BS1]. It recovered in 2026 with an earnable collectible layer (Buffies) and a new event reward track [BS1]. Marvel Snap fell from about $99M (2023) to about $26M (2025) amid "too expensive" and power-creep complaints [MS2][MS4].
4. **A meta layer cannot rescue a weak core.** Squad Busters made over $100M in 7 months, missed its milestones, got the largest rework in Supercell history, and was still shut down (announced Oct 2025) [OT7]. This matches Clash Mini's 2024 death (see `meta-collection.md`). Checkpoint A (the core is fun) remains the gate.
5. **Pokémon GO's treasure hunt is layered rarity along independent real-world axes:**
   - place: 4 biomes since April 2024, and 51 regional species [PGO4][PGO5]
   - time: a monthly 3-hour Community Day where shiny odds go from about 1/500 to about 1/25 [PGO2]
   - weather boosts [PGO5]
   - migrating "nests" every ~2 weeks, which the community mapped together [PGO6]

   Walking hatches eggs and pays weekly distance rewards at 5, 25 and 50 km [PGO7]. Every axis except "place in the real world" can be rebuilt offline from the date, the local clock and a shared seed.
6. **Pokémon GO's best daily hook is forgiving. Its worst moments came from money and access.** The Research Breakthrough needs 7 stamps on any days, not 7 consecutive days [PGO8]. The 2023 remote-raid price hike and daily cap triggered a boycott and a 100k+ petition, partly because it hurt disabled and rural players [PGO10]. Veterans cite fatigue after 8+ years and rising prices [PGO11].
7. **TikTok's grip comes from six features.** They are instant start, zero-decision infinite novelty, a variable reward on every swipe, a personalised recommender tuned on watch time, frictionless creation and remix, and no natural stopping point [TT3][TT4][TT6]. On 6 Feb 2026 the European Commission preliminarily found infinite scroll, autoplay, push notifications and the highly personalised recommender to be **addictive design in breach of the DSA** [TT1]. It had already forced TikTok to withdraw "TikTok Lite Rewards" (points for watching, liking and inviting) from the EU in August 2024 [TT2]. Borrow instant start, novelty and creation. Never borrow the missing stopping point, autoplay, notifications or rewards for passive consumption.
8. **The regulatory direction in the EU and Denmark is now explicit:**
   - The DSA minors guidelines (July 2025) say to disable by default streaks, autoplay and push notifications, and to remove persuasive design "aimed predominantly at engagement" [REG1].
   - PEGI (from June 2026) rates "rewards for returning" at 7, "punishes not returning" at 12, and paid random items at 16 [REG2].
   - The Digital Fairness Act proposal is due in H2 2026 and targets addictive design, virtual currencies and loot boxes [REG3].
   - In Denmark, Forbrugerrådet Tænk reported 17 games, Pokémon GO among them, to the Consumer Ombudsman in Sept 2024. The CPC principles of March 2025 forbid time-limited pressure on children [REG4][REG5].
9. **Time played is not the harm; how play feels is.** Telemetry from 38,935 players found hours played unlikely to affect wellbeing [RES1]. Perceived value of play, not hours, predicts wellbeing [RES2]. Obsessive ("having to") engagement is linked to distress, harmonious ("wanting to") engagement to satisfaction [RES3]. Streak obligations drive problematic smartphone use and FoMO in early adolescents [RES4]. The design goal is therefore "wanting to come back", never "afraid to miss".
10. **Mastery ladders are the cheapest "forever" content.** Examples: Slay the Spire Ascension (20 cumulative levels per character), Hades Heat (15 modifiers up to Heat 64) and Balatro Stakes (8 per deck) [RL3]. Brawl Stars Records (per-character feats) do the same job [BS2]. All reuse existing content with new rules, which suits Ageborn's data-driven modifiers.
11. **Sharing is growth when the share is a small, spoiler-free artefact.** Wordle went from about 300k to millions of players in weeks on a shared daily puzzle and an emoji grid [OT2]. Clash Royale's 2025 comeback rode creator clips [CR3]. Clash of Clans base-layout links and Brawl Stars' daily-voted community maps turn creation into content [CoC6][BS3]. User-generated content alone does not save a game: Stumble Guys revenue fell 67% in 2024 despite its Workshop [PG2].
12. **Memorable AI characters are a proven engagement driver when clearly labelled as bots.** Chess.com's "Mittens" cat bot drew about 40M games in January 2023, record traffic and 40% more games than any earlier month [OT3]. This supports Ageborn's AI Generals, and suggests rotating guest Generals.

**Where Ageborn stands.** The v1 design already avoids most red lines. Nothing is sold. Timers, charges, dailies and quests bank instead of expiring. Pity is visible, bots are labelled, instant start is ≤3 s, and there are no notifications (DESIGN A6, A7.1, A8).

**The gap is the horizon.** The economy completes in about 5-5.5 months (A6.9). Trophy Road ends at 4,000, Conquest at 27 stars and Codex at about 81 levels. After roughly six months the only renewable loops are the Daily Challenge (6 modifiers) and the AI ladder, which tops out at tier X. Sections 4 and 7 propose renewable, healthy engines to close that gap. Almost all of them are data plus a screen, and most fit v1.1/v1.2 in D1.

---

## 1. How to classify a lever

Every mechanic below is tagged **Healthy (H)**, **Grey (G)** or **Red-line (R)**. The five tests:

| # | Test | Healthy answer | Evidence |
|---|---|---|---|
| T1 | Does stopping cost the player anything? | No. Progress, currencies and rewards wait (banked). | PEGI: reward return = 7, punish absence = 12 [REG2] |
| T2 | Is every probability, pace and pressure visible and truthful? | Yes (Pillar 4). | A6.4-A6.5, A7.1 |
| T3 | Would it still work for a 12-year-old with no social obligation? | Yes: no streaks with friends, no "your team needs you" nags. | DSA minors guidelines [REG1]; Snapchat streak study [RES4] |
| T4 | Does the player end the session feeling it was worth it ("wanting to" rather than "having to")? | Yes: a clear stopping point with a recap of progress. | [RES1][RES2][RES3] |
| T5 | Does it need money, a server, personal data or tracking? | No (CLAUDE.md hard rules; v1 offline). | CLAUDE.md |

- **Grey** means the lever passes only with the guardrails listed next to it.
- **Red-line** fails T1, T2 or T5 outright, or copies a pattern regulators have already named.

---

## 2. Loop matrix by time scale

| Game | Seconds | Session | Day | Week | Month / season | Year and beyond |
|---|---|---|---|---|---|---|
| Clash of Clans | Troop drops and spell timing in a 3-min raid | 1-3 attacks, start builder upgrades, donate troops | Builders finish; limited Ranked attacks per day | Raid Weekend Fri-Mon (5 attacks) [CoC4]; Ranked weekly tournament [CoC5] | Clan Games (22nd-28th, clan goal 50,000 pts), CWL, Gold Pass season [CoC6] | New Town Hall each November [CoC1][CoC3]; Hero Equipment; Clashiversary |
| Hay Day | Harvest, drag, sell | Fill truck and boat orders, restock machines | Crop and machine timers; roadside shop | Derby: 12 tasks per player, neighbourhood score [HD3] | Seasonal events, Valley | Feature unlocks (fishing L27, town L34); +11,000 XP per level after L50 [HD4] |
| Clash Royale | Elixir timing, card placement | 3-min battles; Lucky Drop taps | First 3 wins give Lucky Drops; later wins pay less [CR1] | Clan war days, rotating events | Pass Royale; Seasonal Trophy Road reset; Ranked [CR5][CR6] | New cards, Evolutions and Heroes; level cap saga (see meta-collection) |
| Brawl Stars | Aim and dodge in 2-3 min matches | Featured mode slot rotates every 2 h across 6 modes [BS3] | Quests | Event reward tracks [BS1] | Brawl Pass, Ranked season | Trophy Road to 100,000; Records [BS2] |
| Pokémon GO | Curveball throw, catch | Walk, spin stops, catch, raid | First catch and first spin bonus; 7-day streak; field-research stamp [PGO8] | Adventure Sync 5/25/50 km tiers [PGO7]; nest migration every ~2 weeks [PGO6] | Community Day (3 h, monthly) [PGO2]; seasons | GO Fest and GO Tour live events [PGO9]; level cap to 80 (Oct 2025) [PGO7] |
| TikTok | Swipe; 15-60 s clip | Endless feed, no end state | Habit; teen 60-min default limit [TT5] | Trend and sound lifecycles | n/a | Creator identity, follower graph |
| Marvel Snap | 6 turns; Snap (double) or Retreat [MS3] | ~3-min matches | Daily missions | Weekly missions; Alliances bounties [MS5] | Season pass; new cards | Collection Level; Infinity Splits [MS6] |
| Hearthstone | Turn decisions | 10-20 min games | Daily quests | Weekly quests | Rewards Track resets each expansion (3 per year) [HS1] | Standard set rotation; Battlegrounds |
| Vampire Survivors and roguelites | Dodge; level-up pick | One 15-30 min run with a hard timer | none (self-paced) | none | none | Unlock grid, secrets, Arcanas [RL1]; Ascension, Heat, Stakes [RL3] |
| Stumble Guys | Obstacle timing | 3-round knockout show, up to 32 players | Quests | Events | Pass | Workshop user maps [PG2] |
| Animal Crossing: NH | Cast, catch, dig | Daily chores: fossils, rocks, shop | Resources reset daily; critters by hour [AC2] | Sunday turnips, Saturday concert | Monthly critter lists; holidays [AC2] | Full-year critter cycle; museum completion [AC3]; free 3.0 update 2026 [AC4] |

**Pattern.** Every durable product has something meaningful at every time scale, and the week is the most underrated one:

- Hay Day Derby
- Clash of Clans Raid Weekend and Ranked
- Adventure Sync and nest migration
- Duolingo leagues

Ageborn v1 has seconds, session and day covered. It has one weekly quest, no monthly layer, and no yearly layer.

---

## 3. Benchmarks one by one

### 3.1 Clash of Clans (2012 to now): "improve for years" through a builder economy

**Facts 2024-2026:**
- MAU of about 95-99M through 2025 (third-party estimate) [CoC2].
- TH17 (Nov 2024) added the Minion Prince and a Hero Hall with 4 active hero slots [CoC1].
- TH18 (17 Nov 2025) added selectable defensive Guardians, the Super Wizard Tower, and "fixing long-term progression", with Epic Equipment drops every two months [CoC3].
- On 6 Oct 2025, Ranked Battles replaced the classic leagues. It is a weekly tournament in groups of 100 with promotion and demotion across 33 leagues, and a separate casual "Battle" mode [CoC5].
- Supercell cut upgrade costs and times across many Town Halls (Dec 2023) and ran 50%-off "Hammer Jam" events (2024) [CoC7].

**Why it lasts:**
1. The base is both progress and self-expression. Layouts are designed, copied via links and defended [CoC6].
2. Upgrades run in parallel on several builders, so there is always a next thing finishing.
3. The clan gives weekly and monthly shared goals (Raid Weekend, Clan Games, CWL).
4. A yearly Town Hall gives a new horizon.
5. Asynchronous PvP means your base is played even when you are not.

**What players hate:**
- The hero grind. Going from TH10 to fully maxed TH18 heroes is about 40,800 builder hours, 9-10 months even with six builders on heroes only [CoC8].
- Burnout when five builders finish at once and demand huge resource bursts [CoC8].
- The paid Gold Pass and builder potions are the monetisation core.

**Borrow:**
- **H:** Weekly and monthly cadence layers. Asynchronous "your plan fights while you're away" becomes War Plan share codes that friends fight as a labelled ghost (Section 7, E5). A "next thing finishing" feeling with parallel goals (several cards near an upgrade).
- **H:** Promotion-only weekly leagues. Only against labelled AI with a disclosed pace (G, see E18), or against humans once online 1v1 exists.
- **H:** Supercell's own lesson that long grinds needed cost and time cuts. Keep A6.9's 5-5.5 month maximum per collection wave; never extend it by raising levels.

**Do not borrow:**
- **R:** Build timers as the main gate (timers were removed from Clash Royale for exactly this reason [CR1]).
- **R:** Paid skips.
- **R:** Raising the level cap with each new tier.
- **G:** Demotion that removes rewards.

### 3.2 Hay Day (2012 to now): calm, logical, social, and growing again after 13 years

**Facts:**
- Revenue in April 2025 was $12.6M, the best month since 2017 [HD2].
- About 15M MAU (AppMagic via press) [HD2].
- GM Maya Hofree (PGC London 2025): the active base is growing again after years of decline. She would pick retention over acquisition, and the 50-person team is split into three sub-teams: content, the event system and economic balance [HD1].
- Derby (since 2014) is the only mandatory-teamwork system. Each player takes up to 12 tasks per week, and neighbourhoods are matched by activity level, so modest steady participation is enough [HD3].
- Features unlock across levels (fishing L27, town L34), and the XP curve becomes linear after L50 (+11,000 per level) [HD4].
- Supercell's Timur Hassila has said they "don't teach our players to play... no missions or quests... no right way to play", only logic (quoted in [HD5]).

**Why it lasts:**
1. Feature layering: a new system every few weeks for the first months.
2. Autonomy: prices, farm layout, which orders to fill.
3. Low-pressure co-op with activity-matched teams.
4. A team explicitly organised around events and economy balance.

**Borrow:**
- **H:** Feature layering (Ageborn already staggers War Plan, Skirmish, stance and Last Stand in A8; extend to month 2-6 unlocks such as Heat, Expedition and Records).
- **H:** Weekly co-op matched by activity, for the later online milestone.
- **H:** An events and economy owner role in live ops.

**Do not borrow:**
- **R:** Paid extra Derby tasks.
- **G:** Crop timers that reward checking back every few hours. Ageborn's charges bank 12 over 72 h, which is fine; never shorten banks to force visits.

### 3.3 Clash Royale (2016 to now): the 2025 comeback

**Facts:**
- 2025 revenue about $487M, more than 2× 2024; October 2025 alone about $71M and 14M downloads (third-party) [CR3].
- Supercell reported record daily active players, re-engaged players doubled and new players up almost 500% [CR4].
- The March 2025 update removed chest queues, timers and keys because they "interrupted the rewarding experience of winning" and "forced players to log in several times a day" [CR1].
- Merge Tactics (a 4-player turn-based auto-battler mode, 30 Jun / July 2025) became "the only reason I still play" for many returning players [CR2].
- 2026 changes:
  - Seasonal Trophy Road returned [CR5].
  - Seasonal Arena II bans the 8 cards you won with most in Arena I, which forces a new deck [CR5].
  - "Catch-Up Rewards" pay a bonus on your next win after missed daily rewards [CR6].
  - Pass Royale added "Streak Rewards" for consecutive paid upgrades [CR6], an anti-pattern for us.
- Clans: card requests every 8 h, donations capped at 60 per day, friendly battles, 2v2 and Clan Wars 2 [CR7].

**Lessons:**
1. Simplification is a feature: removing systems grew the game.
2. A second, different mode re-engages people who are bored of the first.
3. Catch-up bonuses turn absence into a welcome, not a penalty.
4. A seasonal ban-your-best-cards twist is a cheap freshness engine for veterans.

**Borrow:**
- **H:** Catch-Up Rewards (E3).
- **H:** A seasonal arena with bans (E8, G with guardrails).
- **H:** A second mode (Endless Horde and the Chronicle campaign are already in D1 v1.2; a Draft War is proposed in E17).
- **H:** Free gifts at community moments (a free cosmetic, never power).

**Do not borrow:**
- **R:** Paid pass skips and purchase streaks.
- **R:** Daily win caps that stop rewards after N wins. This is grey in principle, but Ageborn's charge bank already bounds rewards without the "you've hit your limit" message.

### 3.4 Brawl Stars (2018 to now): collection novelty up, paid power down

**Facts:**
- Peak $678.5M in 2024, then $272.6M in 2025 as "engagement dropped and the competitive meta stagnated" [BS1].
- Recovery in two steps [BS1]:
  - Update 63 (Sep 2025) added an event currency with its own reward track and controllable power-ups, and "stopped the DAU decline".
  - Update 65 added Buffies, collectible keychains that attach to abilities and are chased with earned currencies. It was the highest-rated update of the year.
- March 2026 revenue was +46.8% month on month [BS1].
- The 2024 surge followed Starr Drops (free, pre-rolled randomness) [BS4]; details are in `meta-collection.md`.
- June 2025: Trophy Road extended to 100,000 and became the only way to unlock Rare and Super Rare brawlers. Records (per-brawler feats that give Record Points and a Record Level) replaced Masteries [BS2].
- The featured mode slot rotates every 2 h across six modes. Map Maker (from 1,000 trophies) lets players publish maps, and the day's most-liked map becomes "Winner of the Day" in a live slot [BS3].

**Borrow:**
- **H:** Records as per-card feats (E6).
- **H:** Always-on core modes plus a rotating featured slot (E17).
- **H:** New collectible layers that are cosmetic or sidegrade.
- **H:** Community-voted content. Offline, this means featuring owner-approved player creations in updates, not a live vote.

**Do not borrow:**
- **R:** Paid or pass-gated power (Hypercharges).
- **G:** The "claw machine" framing. It is gambling imagery; PEGI's revised criteria look at simulated gambling [RL4], and portals are sensitive. Use crafting instead.

### 3.5 Pokémon GO (2016 to now): the treasure-hunt reference

**Facts:**
- Over $8B lifetime player spending, 100M+ unique players in 2024 and 20M+ weekly actives [PGO1].
- Scopely bought Niantic's games business for $3.5B; the deal closed 29 May 2025 [PGO1].
- Level cap raised to 80 in Oct 2025, with a new Daily Adventure Egg [PGO7].

**The hunt, decomposed:**

| Axis | Mechanic | Offline analogue for Ageborn |
|---|---|---|
| Place | Biomes (beach, city, forest, mountain; Apr 2024) set spawn pools and visuals [PGO4]; 51 region-restricted species [PGO5] | Arenas (A6.3) already change ground and weather. Give each arena a relic pool (E12). Never use real location. |
| Time | Community Day: monthly, 3 h, one species floods the map, shiny ~1/500 → ~1/25, exclusive move [PGO2]. Critters by hour in Animal Crossing [AC2]. | Local-clock windows (dawn, day, dusk, night) and a monthly Age Festival (E11), all recurring |
| Weather | Real weather boosts types [PGO5] | The daily modifier (A9.1) acts as "weather": Glass Armies day means different relics |
| Migration | Nests change every ~2 weeks; the Silph Road's Global Nest Atlas crowdsourced them (2016-2023) [PGO6] | A date-seeded map, the same for everyone that day, so players can compare and write guides |
| Rarity tiers | Shiny variants, Lucky trades (~2% Lucky Friends) [PGO12] | Foils (A6.4) already exist; add relic "gilded" variants with visible odds |
| Movement | Eggs hatch by km; weekly 5/25/50 km rewards [PGO7]; Routes (2023, player-made walks) [PGO13] | Matches "walk" the expedition: each match digs one tile (E12). No real walking. |
| Social | Trading within ~100 m, friendship levels [PGO12]; live events with 556,103 attendees across 10 cities 2022-2025 [PGO9] | Out of scope offline; later, share codes for gifts (never trades of power) |

**Evidence on walking:**
- Engaged players added 1,473 steps per day (>25%) over 30 days, but activity fell back after 3-4 weeks [PGO3].
- Novelty drives the behaviour; the hunt alone does not sustain it.
- Physical movement is a genuine health plus of Pokémon GO. A browser game cannot and should not replicate it (location data of minors, no server).

**Daily hooks:**
- First catch and first spin of the day give a bonus, and 7 days in a row give a big bonus (a classic streak) [PGO8].
- Research Breakthrough needs 7 stamps from any days, not consecutive days [PGO8]. That is the forgiving version to copy.

**What players hate:**
- The 2023 remote raid price near-doubling plus a 5-per-day cap led to #HearUsNiantic, a boycott and a 100k+ signature petition; disabled and rural players were hurt most [PGO10].
- 2025 price increases (the Community Day ticket doubled) and repetitive objectives after 8+ years [PGO11].
- Forbrugerrådet Tænk included Pokémon GO in its 2024 complaint about hidden prices [REG5].

**Borrow:**
- **H:** Place, time and weather rarity axes rebuilt from arena, local clock and daily modifier.
- **H:** A shared daily seed.
- **H:** A stamp card instead of a streak.
- **H:** Weekly distance-style tiers (matches played, not wins).
- **G:** Monthly festival windows, which must recur.

**Do not borrow:**
- **R:** Real location or step data.
- **R:** Real-region exclusives (unequal and untradeable offline).
- **R:** Paid access to events.
- **G:** Consecutive-day streak bonuses.

### 3.6 TikTok (not a game): the attention benchmark and the legal warning

**What makes it gripping (mechanics, not content):**
1. **Instant start.** The app opens into a playing video; interests are inferred from behaviour, not asked.
2. **Infinite novelty with zero decisions.** The next item is always there, and swiping is the only verb.
3. **Variable reward.** You never know whether the next clip will delight. fMRI work shows personalised feeds activate the default mode network and the ventral tegmental area more than generic ones [TT4].
4. **Personalisation on watch time.** Completion and rewatch are the strongest ranking signals, and most views come from non-followers (marketing analyses; weaker evidence) [TT6].
5. **Cheap creation and remix.** Sounds, Duet and Stitch make every clip a template [TT7].
6. **No natural stopping point.** No end of feed, and autoplay.

**Scale:**
- Children spent a global average of 112 min per day on TikTok in 2023, about 2 h in 2024, and 132 min in Australia in 2025 [TT3].
- TikTok's own mitigations: a 60-min default limit for under-18s (a passcode to continue) and a "wind down" interruption after 22:00 for under-16s [TT5].

**The legal line:**
- On 6 Feb 2026 the Commission preliminarily found TikTok's infinite scroll, autoplay, push notifications and highly personalised recommender to be addictive design that shifts users into "autopilot mode". It named remedies: disable infinite scroll over time, add effective screen-time breaks including at night, and adapt the recommender [TT1].
- In July 2026 it opened the same line against Meta over infinite scroll [TT8].
- TikTok Lite Rewards (points for watching, liking, following and inviting friends) was withdrawn permanently from the EU under binding commitments on 5 Aug 2024 [TT2].

**Borrow:**
- **H:** Instant start (A8 already does ≤3 s to a live battlefield).
- **H:** Novelty per match (procedural AI commanders, daily modifier, rotating featured mode).
- **H:** Creation tools: Clip Mode, the replay renderer, the "Who wins?" sandbox (D1 v1.1), share codes.
- **H:** Personalisation for competence only: MMR tiers and adaptive hints, disclosed as "Opponent difficulty adapts to your recent results" (A7.1).

**Never borrow:**
- **R:** Autoplay or auto-queue into the next match.
- **R:** Endless reward chains without an end state.
- **R:** Push or browser notifications (relevant when PWA install lands in v1.2).
- **R:** Tuning anything to maximise session length.
- **R:** Rewards for watching, liking or inviting.
- **R:** Follower or like counts.
- **H (add):** A session wrap and an optional play-time reminder (E1, E20). This is the TikTok remedy, built in from the start.

### 3.7 Marvel Snap (2022 to now): short matches, a risk verb and a cosmetic collection

**Facts:**
- 6-turn, ~3-min matches.
- The "Snap" doubles the stakes backgammon-style, and "Retreat" cuts losses. Players call snapping and retreating a bigger skill than card play, because it gives agency over bad luck [MS3].
- Upgrades are cosmetic, with a Collection Level (see meta-collection). Character Mastery and Infinity Splits add finishes and flares (Feb 2025) [MS6]. Snap Packs replaced Spotlight Caches in April 2025 [MS6].
- In January 2025 the game went offline in the US because of its ByteDance-linked publisher, and moved to self-publishing with Skystone [MS1].
- Revenue about $99M (2023) to about $26M (2025) (third-party) [MS2]. Players cite cost, power creep (Kid Omega) and content fatigue [MS4].
- Social: Alliances (2024) share group bounties [MS5].

**Borrow:**
- **H:** A risk-and-agency verb that cuts losses. Ageborn has Retreat after 1:00 in the pause menu; consider paying a small consolation when retreating early in the Daily Challenge only.
- **H:** A cosmetic finish ladder on maxed cards (Star levels, D1 v1.2).

**Do not borrow:**
- **R:** Paid-first access to new cards.
- **G:** "Bet currency to unlock" modes such as Deadpool's Diner (bet Bubs to unlock a card) [MS5]. Wagering is gambling-adjacent; avoid it for minors.

### 3.8 Hearthstone (2014 to now): draft modes and reward-track trust

**Facts:**
- Rewards Track since Nov 2020 (a free track plus the paid Tavern Pass). It resets with each expansion, and XP comes from playtime and wins [HS1].
- The launch cut rewards for free players. Blizzard apologised and removed weekly quests requiring Legendaries and Arena, saying they "were a mistake" [HS2].
- Battlegrounds: players completed over 9.95 billion rounds in 2025 [HS3].
- Arena, a 3-choice draft where everyone is equal, has run for over a decade [HS4].

**Borrow:**
- **H:** A draft mode as a "fair for all" veteran mode (E17).
- **H:** Quest pools that never require owning rare cards. A6.7 already offers the Legendary quest only if one is owned; keep that rule.

**Do not borrow:**
- **R:** Cutting rewards in an update.
- **R:** A paid track.

### 3.9 Vampire Survivors and roguelites: "one more run" and discovery

**Facts:**
- Vampire Survivors: 98% positive of 128k Steam reviews [RL1].
- Short timed runs; meta-progression (PowerUps) that makes even failed runs pay.
- Secrets discovered by the community: breaking objects, typing phrases in a Secrets menu [RL2].
- Arcanas unlocked by feats such as reaching level 50 with a character or minute 31 on a stage [RL1].
- Separate Collection and Unlocks grids show exactly what is missing [RL1].
- Slay the Spire's 20 cumulative Ascension levels per character, Hades' Heat (15 modifiers, up to Heat 64, freely raised or lowered) and Balatro's 8 Stakes per deck give years of mastery from the same content [RL3].
- Balatro was first rated PEGI 18 for poker imagery, cut to 12 on appeal in Feb 2025. PEGI then refined its simulated-gambling criteria [RL4].

**Borrow:**
- **H:** Heat or Ascension for Conquest (E7).
- **H:** Feat-based unlocks and secrets (E14).
- **H:** Visible "what's missing" grids (silhouettes already exist in A9 Collection).
- **H:** Run-based modes with a hard timer (Endless Horde, D1 v1.2).

**Do not borrow:**
- **G:** Casino imagery (slots, claw machines, roulette) in any reward UI. The CS-style Wardrobe reel is already behind a flag (A10.1).

### 3.10 Stumble Guys and Fall Guys: party games

**Facts:**
- Stumble Guys: about 38M MAU and 3.6M DAU (third-party). Races of up to 32 players, 60+ maps, skins and emotes, events and collaborations [PG1].
- Stumble Workshop (2023) added user-made levels, later fed into events and tournaments. Revenue still fell 67% in 2024 [PG2].
- Fall Guys' decline is blamed on repetition, and on alternate modes being rotated in and out instead of always available [PG3].

**Borrow:**
- **H:** Comedy and spectacle clips.
- **H:** Emotes with no chat. A6 already has 6 emotes.
- **H:** Keep core modes always available and rotate only a "featured" slot.

**Do not borrow:**
- **R:** Relying on user-generated content to fix retention.
- **R:** Hiding core modes behind rotation.

### 3.11 Animal Crossing: New Horizons: the real-time calendar as content

**Facts:**
- The clock and calendar are real.
- Fish, bugs and sea creatures change by month and by hour [AC2]; completing each museum wing earns recognition [AC3].
- Daily resources reset: fossils, rocks, the shop [AC1].
- Research on its temporal design finds that players form affective bonds through repeated daily play and visible but slow progress [AC1].
- Design tools create shareable content [AC1].
- Five years after launch it got a free 3.0 update and a Switch 2 Edition (15 Jan 2026) [AC4].

**What it does right:**
- Nothing is lost by skipping a day, except that month's critters, which return next year.
- There is no competition, and pacing is gentle.

**What players dislike:**
- The "time travel" workaround exists because a year-long cycle is long. Ageborn already accepts clock tampering (A6.3).

**Borrow:**
- **H:** Hour and month windows for cosmetic finds that recur.
- **H:** A museum with sets (E13).
- **H:** A home space that reflects progress (a diorama on Home).

**Do not borrow:**
- **G:** Content that is only available in one calendar month without a way to catch up. Allow crafting with Dust after one full cycle.

### 3.12 Short notes on other peers

- **Duolingo.** Vendor-level evidence (weaker):
  - users with 7+ day streaks retain at about 2.4× [OT1]
  - Streak Freezes make streaks last much longer [OT1]
  - leagues add about 20% time [OT1]

  The mechanic works, but it is the loss-aversion pattern regulators flag for minors [REG1][RES4]. Borrow forgiveness (freezes, stamps), not the flame.
- **Wordle.** One puzzle per day, the same for everyone, and a spoiler-free share grid. Players went from about 300k to millions within weeks of January 2022 [OT2]. This is the model for E4.
- **Chess.com Mittens (Jan 2023).** A cute bot rated "1" that played at super-GM level. It drew about 40M games in a month, a record 10M people on the site, and 40% more games than any earlier month [OT3]. Personality bots are content. The disguised rating was a joke that Pillar 4 would not allow, so use a disclosed "Tier ???" instead (E9).
- **Pokémon TCG Pocket (Oct 2024).**
  - Two free packs per day, a flick-to-open animation and animated "immersive" cards [OT4].
  - 100M downloads and $500M in about four months [OT4].
  - Its 2025 trading system (Trade Tokens bought by destroying cards, high-rarity cards excluded) caused an outcry. It was replaced in July 2025 by abundant Shinedust and doubled duplicate refunds [OT4].
  - Lesson: a reveal ritual plus daily free packs is a huge draw, and any friction on the social part is punished.
- **Monopoly Go (anti-model).**
  - Fastest mobile game to $5B (May 2025) and $6B lifetime by end of 2025 [OT5].
  - Events refresh every few hours. Sticker albums have golden stickers tradeable only in short "Golden Blitz" windows. Friends raid each other.
  - Widely called predatory FOMO [OT6].
  - The album-set idea is healthy; the time windows and paid dice are not.
- **Squad Busters (failure).** Great launch and brand, but the core loop did not hold. The "Heroes" mega-rework in 2025 could not fix it, and the game was sunset from Oct 2025 [OT7].

---

## 4. What "keep improving for years" actually is

There are six engines. The best games run four or more at once.

| Engine | What it is | Best examples | Ageborn v1 today | Horizon today | Gap fix (Section 7) |
|---|---|---|---|---|---|
| 1. Vertical power | Levels and upgrades | CoC Town Halls, CR levels | Card L1-10, fixed cap (A6.6) | ~5-5.5 months (A6.9) | Keep the cap fixed. Add waves of sideways content (new ages and cards, D1 v1.2) every ~4-6 months so a new "months of progress" window opens each time. |
| 2. Breadth / collection | Owning more, completing sets | Snap, Pokémon, TCG Pocket, AC museum | 55 cards, foils, 12 skins | ~2 weeks for Legendaries, months for foils | Relic museum sets (E12, E13); Records (E6) |
| 3. Mastery ladders | Harder rules on the same content | StS Ascension, Hades Heat, Balatro Stakes, BS Records | Conquest stars (27, finite); AI tiers to X | Weeks | Chrono Heat 1-10 per General (E7); card Records (E6) |
| 4. Renewable cycles | Weekly and seasonal resets that feel new | CoC Ranked weekly, CR Seasonal Road, Hay Day Derby | Daily Challenge (6 modifiers), weekly quest | Infinite but thin | Stamp card (E2), Seasonal Road with bans (E8), Age Festival (E11), featured mode (E17), guest General (E9) |
| 5. Identity and creation | A thing that is "mine" and shareable | CoC base layouts, AC island, TikTok | Profile, banners, War Plan presets | n/a | War Plan codes (E5), Clip Mode (D1), yearly recap (E16), sandbox share (E15) |
| 6. People | Competing or cooperating with humans | Clans, raids, GO Fest | None (v1 offline) | n/a | Asynchronous via share codes now; online 1v1, 2v2 and co-op later (D1) |

**Burnout lessons to design against:**
- The CoC hero grind (a single 9-10 month goal) [CoC8].
- The Hearthstone reward cut [HS2].
- Pokémon GO veteran repetition and price creep [PGO11].
- Brawl Stars meta stagnation [BS1].
- Fall Guys repetition [PG3].

The rules that follow:
1. Many parallel medium goals, never one giant one.
2. Never take rewards away in an update.
3. Refresh the meta through sideways cards and modifier rotation, not power creep.
4. Give veterans a mode where levels do not matter (A6.8's "Standard levels" toggle; Draft War in E17).

---

## 5. Treasure hunting without GPS: a design pattern for Ageborn

The owner wants the Pokémon GO feeling. The parts that make it work, and that survive offline, are:

1. **Rarity along independent axes**: where you are, when you look, and today's conditions.
2. **A shared world**: everyone faces the same spawns that day, so people talk and map.
3. **Visible progress to completion**: the dex with silhouettes.
4. **Rare shiny variants** of things you already own.
5. **Movement** as the cost of searching.

Offline, "movement" becomes playing matches, and "shared world" becomes a date seed. Because the sim and content are deterministic (DESIGN B2/B3), a seed from the local date gives every player on Earth the same map with no server, just as A9.1 already does for the Daily Challenge.

**What must not come across:**
- Real location (minors' location data, no server, unequal access).
- Real-region exclusives.
- Paid event access.
- Windows so short they force visits.
- Anything that is lost for good if you miss it.

The concrete proposal is E12 (Rift Expedition) plus E13 (Museum), E11 (Age Festival) and E14 (Secrets).

---

## 6. TikTok, restated as rules for Ageborn

| TikTok feature | Ageborn version | Class |
|---|---|---|
| Instant start | ≤3 s to a live battle, no menus before the first win (A8) | H (exists) |
| Infinite novelty | Every Battle press brings a new seeded AI commander with a personality line; daily modifier; weekly featured mode (E17); guest General (E9) | H |
| Variable reward | Capsules: pre-rolled, shuffle bag, visible pity (A6.4-A6.5) | G, with guardrails already in place |
| Personalisation | MMR tier and adaptive hints for fairness and learning, disclosed (A7.1). Never optimise for time or return rate. | H if disclosed; R if tuned for engagement |
| Creation and remix | Clip Mode, replay-to-clip, "Who wins?" sandbox (D1), share codes (E4, E5, E15) | H |
| No stopping point | Session wrap after every 3rd match or when the capsule tray is empty (E1); optional play-time reminder and night note (E20); no auto-queue | H (the fix) |
| Notifications | None. When PWA install arrives (v1.2), do not register push. | R if added |
| Rewards for passive actions | None: no watch-to-earn, no like-to-earn, no invite-to-earn | R if added |

---

## 7. Proposal catalogue for Ageborn

Each item gives the benchmark, the time scale, the class, the guardrails, a DESIGN hook and a suggested phase. "v1 candidate" means small enough to consider now through a request to the owning WP. Everything else fits D1's v1.1 and v1.2 lists and is content-as-data plus one screen.

| ID | Proposal | Benchmark | Time scale | Class | Guardrails | Hook / phase |
|---|---|---|---|---|---|---|
| E1 | **Session wrap.** After every 3rd match, or when no capsules are left to open, the Result screen adds a recap card ("Today: 3 wins, Pikeman L6, 2 new relics. Everything waits for you.") next to Next battle and Home. | TikTok remedy [TT1]; DSA [REG1] | Session | H | No guilt copy, no countdown, never blocks play | A9 Result; v1 candidate (WP9 strings plus a small component) |
| E2 | **Chronicle stamp card** replaces the pure "Win 15 battles" weekly quest. 7 stamp slots per week; the first ladder or Daily win of a day stamps; any 5 stamps give the Wardrobe Crate and 7 give a bonus Age Capsule. Missed days never reset anything. | PoGo Research Breakthrough (non-consecutive) [PGO8]; Duolingo freezes [OT1] | Week | H | No streak counter, no flame icon, no "don't lose it" copy | A6.7 weekly quest; v1.1 |
| E3 | **Welcome-back bonus.** After 3+ days away, the first 3 wins pay +50% Amber and the Home banner says "Welcome back, Chief". | CR Catch-Up Rewards [CR6] | Day | H | Bonus only; never shown as a loss | A6.3; v1.1 |
| E4 | **Shared Daily share line and replay code.** Copy text such as "Ageborn Daily 2026-10-03, Glass Armies, Won 4:12, base 63%, Stone to Future", plus a compact replay code any copy of the game can re-simulate and verify. | Wordle [OT2]; deterministic replays (B3) | Day | H | Export only (clipboard); no feed, no likes; tier shown so comparisons are fair | A9.1 plus replay; v1.1 |
| E5 | **War Plan share codes and "Echo of a friend".** Export a War Plan as a short code; a friend imports it and fights it as a labelled AI ghost ("AI · Echo of Chief-4821"). | CoC layout links [CoC6]; D1 "Ghost of You" | Anytime | H | Always labelled AI or ghost (A7.1); no rewards beyond Skirmish rates | A7.4 Echo; v1.1 |
| E6 | **Card Records.** 3 feats per card (for example, Pikeman kills 300 Heavies, wins 50 matches, is MVP 20 times) that give titles, frame trims and Codex points; plus account Record Level. | BS Records [BS2]; VS feat unlocks [RL1] | Months | H | Feats never require money or one specific day; progress visible | A6.7 Codex; D1 "about 20 achievements", v1.1 |
| E7 | **Chrono Heat.** After 3 stars, each Conquest General offers Heat 1-10, adding disclosed symmetric modifiers cumulatively (reusing A9.1 modifiers plus a few new ones). Rewards: cosmetic trims and small Dust per first clear. | StS Ascension, Hades Heat, Balatro Stakes [RL3] | Years | H | Opt-in; rules shown on VS; bots keep A7.1 rules | A6.10; v1.2 (data plus UI) |
| E8 | **Seasonal Road** (28 days, free only) from Arena 8. Seasonal trophies reset monthly; rewards are cosmetic plus Dust. Stage II bans your 8 most-used cards (CR 2026). Past season banners stay in an archive and reappear in later seasons. | CR Seasonal Trophy Road [CR5]; CoC weekly reset [CoC5] | Month | G | No permanent loss; main trophies and arena untouched; unclaimed rewards auto-delivered; reset date shown from day 1 | A6.3; v1.2 |
| E9 | **Guest General of the month.** A comedic, limited-run AI personality (for example, a "Tier ???" pet) on the ladder and in Skirmish. Beating it gives a profile trophy. Each guest returns in the same month next year. | Chess.com Mittens [OT3] | Month / year | H | Labelled AI; "Tier ???" disclosed as hidden, never a false tier; plays by A7.1 rules | A7.4; v1.1 content |
| E10 | **Nemesis.** An AI commander that beats you twice becomes your Nemesis on Home, with a modest bounty (+100 Amber, Nemesis trophy) for the rematch. | CoC revenge; genre rivalry | Days | H | AI label; no shaming copy; the bounty never expires | A7.4 / A9 Home; v1.1 |
| E11 | **Age Festival.** One weekend per month (48 h, local date), one age is featured: that age's cards get 2× foil odds, a festival frame, and themed music and backdrop. A calendar shows the next 3 festivals. | Community Day [PGO2]; AC holidays [AC2] | Month | G | Odds shown; cosmetic only; each festival frame returns every 5 months (the cycle of 5 ages); no countdown on Home except the calendar | A6.4 foils; v1.2 |
| E12 | **Rift Expedition** (the treasure hunt). A small date-seeded map per arena (about 12 tiles per day). Every finished match (win, loss or draw) digs one tile. Tiles hold Relics: collectible dioramas, banners, emotes, lore pages and small Amber or Dust. Relic pools vary by arena (place), by 4 local-time windows of 6 h (time) and by the day's modifier (weather). Gilded variants have shown odds. A "Relic Compass" (pity) points to an unfound rare after N digs. Everyone has the same map on the same date. | PoGo biomes, nests, weather [PGO4][PGO5][PGO6]; Genshin compass [OT8]; AC hours [AC2] | Session / day / year | H, with G parts | The day's map is finite (a natural stop); unfinished tiles carry over 7 days; every window recurs daily; no relic gives power; odds and pity on screen | New screen plus content tables; v1.2 (largest item) |
| E13 | **Museum / Codex sets.** Relics and card feats fill themed sets (one wing per age). Completed sets add pieces to a diorama on Home. Any missing piece can be crafted with Dust after 30 days of a set being live. | AC museum [AC3]; Monopoly Go albums without the FOMO [OT6] | Months | H | No trade-only or window-only pieces; crafting fallback | A9 Collection; v1.2 |
| E14 | **Secrets.** Hidden cosmetic unlocks by feat or discovery: win a Full War without evolving past Medieval; tap the Future skyline moon 7 times; enter a phrase printed in a General's lore. | Vampire Survivors secrets [RL2] | Anytime | H | Cosmetic only; a hint list appears in Settings after 60 days so no one is locked out | v1.1+ content |
| E15 | **Sandbox and clip sharing.** A "Who wins?" setup as a share code; Clip Mode export; the owner approves marketing posts (D1). | TikTok creation [TT7]; CR creator wave [CR3] | Anytime | H | Export only; no in-game social feed; watermark | D1 v1.1 |
| E16 | **Your year in Ageborn.** A local yearly recap card (favourite card, evolves, biggest comeback, relics found) as a shareable image on the save's anniversary. | Spotify-Wrapped pattern; identity engine | Year | H | Local data only; no ranking against others | v1.1+ |
| E17 | **Modes: always-on core plus a rotating featured slot.** Ladder, Conquest, Skirmish and Daily are always available. A weekly featured slot rotates through Draft War (3-choice draft of cards at Standard L7; Hearthstone Arena style), Mirror Match, 2× Speed Blitz, and later Endless Horde and kaiju weeks (D1). | BS rotation [BS3]; HS Arena [HS4]; Fall Guys lesson [PG3]; CR Merge Tactics [CR2] | Week | H | Featured rewards cosmetic or small; every featured mode returns within 6 weeks | A9 Mode select; v1.2 |
| E18 | **Weekly Rival League (AI only).** A group of 20 labelled AI commanders plus you; their weekly points follow a disclosed fixed pace per tier; top 5 promote. | Duolingo leagues [OT1]; CoC Ranked [CoC5] | Week | G | AI label on every row; pace formula in the help text; never adapts to the player's activity; no demotion loss; wait for real players (online 1v1) if in doubt | v1.2 optional |
| E19 | **"Nothing expires" promise.** One line under every banked timer: "Banks up to 3. Nothing is lost if you're away." | PEGI 7 vs 12 [REG2] | Day | H | Copy only | A6.3 / A9.2; v1 candidate (strings) |
| E20 | **Play-time reminder and night note.** Optional reminder at 60 min (on by default, change or turn off in Settings); after 22:00 local time the Result screen shows "Late battle. Your rewards will wait until tomorrow." | TikTok teen defaults [TT5]; DSA remedy [TT1] | Session | H | Never locks the game; no data leaves the device | A9 Settings; v1.1 |
| E21 | **Veteran collection layers without power.** Star levels (D1), foil upgrades by Dust, spawn-gate trinkets per card; each new age wave adds a new cosmetic layer. | BS Buffies (earnable) [BS1]; Snap splits [MS6] | Months | H | Crafting, not claw machines or reels for these | v1.2 |

**Suggested cadence once E1-E21 exist:**
- **Seconds and minutes:** unchanged (A2).
- **Session:** 3-5 matches, capsule reveals, expedition tiles, then the session wrap.
- **Day:** Daily Capsule (banks 3), quests (bank 6), Daily Challenge with share line, the day's expedition map.
- **Week:** stamp card, featured mode, Nemesis bounties.
- **Month:** Seasonal Road, Age Festival weekend, guest General.
- **Year:** a new age or card wave (D1), returning guests and festivals, the yearly recap, Chrono Heat mastery.

---

## 8. Red lines and grey-zone guardrails

**Red lines. Never ship these, in v1 or later:**

1. Streaks that reset, "don't lose your streak" copy, or any penalty for absence: lost progress, decaying rewards, expiring banks [REG2][RES4][REG1].
2. Push notifications, browser notifications, email or badge nags to pull players back, including after PWA install [TT1][REG1].
3. Autoplay or auto-queue into the next match; endless reward chains with no end state [TT1].
4. Anything bought with real money: paid skips, passes, paid purchase streaks (CR 2026 [CR6]), paid random items (PEGI 16 [REG2]). This is a CLAUDE.md hard rule.
5. Time-limited exclusive power, or content that is gone for good if missed. Monopoly Go-style windows every few hours [OT6].
6. Bots presented as people; fake social proof; AI leaderboards whose pace adapts to push the player (A7.1).
7. Rewards for passive or social-graph actions: watching, liking, inviting friends, referrals [TT2].
8. Collecting location, motion or health data; real-region exclusives.
9. Engagement-optimised personalisation. Difficulty and odds must never be tuned to maximise session length or return rate. Adaptation is for fairness and learning only, and is disclosed (A7.1).
10. Near-miss staging, fake odds, and casino or claw-machine framing of rewards (A10; [RL4]; meta-collection "no near misses").
11. Social-obligation mechanics for minors: public "last seen", shaming low contributors, "your friend is waiting for you" [REG1][RES4].
12. Taking rewards or free features away in an update [HS2]; raising the level cap (meta-collection).

**Grey zone. Allowed only with these guardrails:**

| Lever | Guardrails |
|---|---|
| Daily rewards and quests | Bank, never expire (exists in A6.3/A6.7); "Nothing expires" copy (E19) |
| Time windows (hours, weekends, months) | Every window recurs; generous length (≥6 h daily, 48 h monthly); announced in a calendar; cosmetic only; Dust crafting fallback |
| Seasons and resets | Only the seasonal counter resets; archive and re-runs of cosmetics; reset date visible from day 1 |
| Variable rewards (capsules, relics) | Pre-rolled, bag or pity, odds on screen, earn-only (A6.4-A6.5); no casino imagery |
| One-tap "Next battle" | No countdown or auto-start; session wrap (E1) |
| Leagues against AI | Labelled, disclosed fixed pace, no demotion loss (E18) |
| Collection sets | Crafting path for every piece; no trade-only or window-only pieces |
| Nemesis / taunts | AI label; playful, never humiliating copy; bounties never expire |
| Sharing to social media | Export only; no in-game likes or follower counts; marketing posts only after the owner approves each one (D1) |
| Secrets and codes | Cosmetic only; hint list after 60 days |

---

## 9. Evidence notes and open questions

**Evidence strength:**
- Company statements (Supercell, Niantic/Scopely, European Commission, PEGI) and peer-reviewed studies ([PGO3], [RES1]-[RES4], [TT4]) are strong.
- Revenue and MAU figures from Udonis, AppMagic via press, and similar are third-party estimates. Treat them as direction, not precise numbers.
- Duolingo retention multipliers come from secondary analyses [OT1] and are the weakest numbers here.
- The Hassila quote [HD5] is quoted second-hand.
- The DSA formally binds platforms, not an offline game, but its minors guidelines are the clearest statement of what EU regulators consider harmful. The portals that will host Ageborn are platforms under it.

**Open questions for the design lead and owner:**
1. Should E1 (session wrap) and E19 ("Nothing expires" copy) go into v1 now? Both are small, strings-heavy and strengthen Pillar 4.
2. E12 (Rift Expedition) is the direct answer to "skattejagt" and the largest item. Should it be the headline of v1.2, ahead of or together with the Bronze Age?
3. E18 (AI Rival League): accept as grey with guardrails, or wait until online 1v1 so leagues contain real players?
4. The monthly and yearly cadence (E8, E9, E11, E16) means someone must author seasonal content every month. Is the owner and Claude workflow ready to ship a small data-only content drop each month?

---

## Sources

**Clash of Clans**
- [CoC1] Supercell, "The Town Hall 17 update is here": https://supercell.com/en/games/clashofclans/blog/game-updates/the-town-hall-17-update-is-here-2/
- [CoC2] Udonis, Clash of Clans player count and revenue 2026: https://www.blog.udonis.co/mobile-marketing/mobile-games/clash-of-clans-player-count
- [CoC3] Supercell, "Town Hall 18 crash lands": https://supercell.com/en/games/clashofclans/blog/release-notes/town-hall-18-crash-lands-update/ ; GamingonPhone TH18 details: https://gamingonphone.com/news/clash-of-clans-town-hall-18-update-all-the-details-and-features-explained/
- [CoC4] Supercell Support, Raid Weekends: https://support.supercell.com/clash-of-clans/en/articles/raid-weekends-3.html
- [CoC5] Supercell, "Battle and Ranked modes are coming to Clash": https://supercell.com/en/games/clashofclans/blog/news/battle-and-ranked-modes-are-coming-to-clash-/ ; CoC Wiki, Ranked Battles: https://clashofclans.fandom.com/wiki/Ranked_Battles
- [CoC6] LootBar, monthly season guide (Clan Games, Gold Pass): https://www.lootbar.com/blog/en/clash-clans-guide-monthly-season.html ; House of Clashers, Legend League (layout snapshots): https://houseofclashers.com/home-village/gameplay/legend-league ; Blueprint CoC base links: https://blueprintcoc.com/blogs/coc-base-layouts/cwl-bases-legend-bases
- [CoC7] Supercell, cost and time reductions (Dec 2023): https://supercell.com/en/games/clashofclans/blog/news/cost-and-time-reductions-december-2023/ ; Sportskeeda, Hammer Jam 2024: https://sportskeeda.com/mobile-games/clash-clans-hammer-jam-event-november-2024-schedule-rewards
- [CoC8] Blueprint CoC, hero upgrade guide (builder hours, burnout): https://blueprintcoc.com/blogs/clash-of-clans-guides/best-hero-upgrade-guide

**Hay Day**
- [HD1] PocketGamer.biz, "Supercell reveals rise in Hay Day active users... 12 years on": https://www.pocketgamer.biz/supercell-reveals-rise-in-hay-day-active-users-with-growth-virality-12-years-on/
- [HD2] GameDev Reports weekly recap Sep 2025: https://gamedevreports.substack.com/p/weekly-gaming-reports-recap-september-7f2 ; CellString, Hay Day after 14 years: https://cellstring.com/news/article/how-hay-day-continues-to-make-millions-after-14-years
- [HD3] Hay Day Wiki, Derby: https://hayday.fandom.com/wiki/Derby ; Derby Tasks: https://hayday.fandom.com/wiki/Derby_Tasks
- [HD4] Hay Day Wiki, Fishing: https://hayday.fandom.com/wiki/Fishing ; Town: https://hayday.fandom.com/wiki/Town ; Experience: https://hayday.fandom.com/wiki/Experience
- [HD5] Udonis, Hay Day dissection: https://www.blog.udonis.co/mobile-marketing/mobile-games/hay-day-monetization ; Deconstructor of Fun, Behind the success of Hay Day: https://www.deconstructoroffun.com/blog//2013/01/behind-success-of-hay-day.html

**Clash Royale**
- [CR1] RoyaleAPI, "RIP Chests: 2025 Q1 update": https://royaleapi.com/blog/rip-chests-2025-q1-update?lang=en ; GamingonPhone, March 2025 update: https://gamingonphone.com/news/clash-royale-march-2025-update/
- [CR2] RoyaleAPI, Merge Tactics (July 2025): https://royaleapi.com/blog/merge-tactics-2025-july?lang=en ; Clash Royale Wiki, Merge Tactics: https://clashroyale.fandom.com/wiki/Merge_Tactics
- [CR3] NextBigGames, Clash Royale $4.9bn after 10-year comeback: https://nextbiggames.com/2026/03/17/clash-royale-4-9bn-revenue/ ; GAM3S.GG, Clash Royale 2025 comeback: https://gam3s.gg/news/clash-royale-2025-comeback/
- [CR4] Supercell, "The best games haven't been made yet": https://supercell.com/en/news/the-best-games-havent-been-made-yet/ ; mobilegamer.biz on 2025 results: https://mobilegamer.biz/supercell-boss-laments-coasting-mobile-industry-as-clash-royale-stars-in-2025-results/ ; GamesBeat, Supercell 2025: https://gamesbeat.com/supercell-generates-3b-in-2025-revenue-down-4-while-profits-grew/
- [CR5] Supercell Support, Seasonal Trophy Road: https://support.supercell.com/clash-royale/en/articles/seasonal-trophy-road-2-2.html ; Supercell, June Update 2026: https://supercell.com/en/games/clashroyale/blog/release-notes/june-update-2026/
- [CR6] TrophyCoach, Pass Royale Q2 2026 (streak rewards, catch-up rewards): https://clashcoachai.com/guides/pass-royale-q2-2026-rewards-guide ; Ranked requirements July 2026: https://trophycoach.com/guides/clash-royale-ranked-trophy-requirements-update-july-2026
- [CR7] Clash Royale Wiki, Clans: https://clashroyale.fandom.com/wiki/Clans

**Brawl Stars**
- [BS1] PocketGamer.biz, March 2026 charts (Brawl Stars +~50%): https://www.pocketgamer.biz/march-2026-mobile-game-charts-brawl-stars-revenue-rises-nearly-50/ ; Brawl Tube, "Why Brawl Stars is still popular" (2024-2026 revenue, updates 63 and 65): https://brawl.tube/why-brawl-stars-is-still-popular/
- [BS2] GamingonPhone, June 2025 Brawl Talk (Trophy Road, Records): https://gamingonphone.com/news/brawl-stars-june-2025-brawl-talk-trophy-road-rework/ ; Supercell, Records changes: https://supercell.com/en/games/brawlstars/blog/game-updates/about-the-update-records-changes/
- [BS3] Brawl Stars Wiki, Map Maker: https://brawlstars.fandom.com/wiki/Map_Maker ; Brawlify, event rotation: https://brawlify.com/events
- [BS4] Deconstructor of Fun, "Brawl Stars, to the moon!": https://www.deconstructoroffun.com/blog/2024/2/11/brawl-stars-to-the-moon

**Pokémon GO**
- [PGO1] Game World Observer, Scopely to acquire Niantic games for $3.5B: https://gameworldobserver.com/2025/03/12/scopely-niantic-game-business-3-5-billion-acquisition ; Scopely announcement: https://www.scopely.com/en/news/scopely-to-acquire-niantic-games-business-which-includes-pokemon-go-one-of-the-most-successful-mobile-games-of-all-time
- [PGO2] Pokémon GO Hub, guide to Community Days: https://pokemongohub.net/post/tips-and-tricks/go-hub-guide-to-community-days/ ; Bulbapedia, Community Day: https://bulbapedia.bulbagarden.net/wiki/Community_Day
- [PGO3] Althoff, White, Horvitz, "Influence of Pokémon Go on Physical Activity", JMIR 2016: https://www.jmir.org/2016/12/e315/
- [PGO4] Pokémon GO Hub, Biomes guide: https://pokemongohub.net/post/guide/biomes-in-pokemon-go-complete-guide/
- [PGO5] Pokémon GO Hub, regional Pokémon list: https://pokemongohub.net/post/guide/regional-pokemon-list/ ; Pokeep, regional exclusives and weather: https://www.pokeep.com/pokemon-go/pokemon-go-regional-exclusives.html
- [PGO6] Pokémon GO Hub, Nests: https://pokemongohub.net/post/wiki/nests/ ; Mic, Silph Road Nest Atlas: https://www.mic.com/articles/182106/pokemon-go-nest-migration-25-how-to-track-changing-spawn-locations-with-the-silph-road-atlas
- [PGO7] Bulbapedia, Adventure Sync: https://bulbapedia.bulbagarden.net/wiki/Adventure_Sync ; Pokémon GO Wiki, Eggs (Daily Adventure Egg, level 80): https://pokemongo.fandom.com/wiki/Pok%C3%A9mon_Eggs
- [PGO8] Pokémon GO Hub, daily and weekly streaks: https://pokemongohub.net/post/wiki/daily-weekly-streaks/ ; Niantic Help, Daily Bonuses: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/105-daily-bonuses/
- [PGO9] Niantic, GO Fest economic impact 2024: https://nianticlabs.com/news/pgo-economic-impact-2024 ; Axis Intelligence, Pokémon GO statistics (10-city study): https://axis-intelligence.com/pokemon-go-statistics/
- [PGO10] Forbes, remote raid pass boycott: https://www.forbes.com/sites/paultassi/2023/04/03/pokmon-go-players-ready-mass-boycott-over-remote-raid-pass-price-hike/ ; TechCrunch: https://techcrunch.com/2023/03/30/pokemon-go-will-raise-the-price-of-remote-raid-passes ; AlternativeTo (accessibility impact): https://alternativeto.net/news/2023/3/niantic-s-pokemon-go-faces-backlash-over-price-increase-of-remote-raid-passes
- [PGO11] UnderLevelled, "The steep decline of Pokémon GO" (2025): https://underlevelled.com/2025/01/21/the-steep-decline-of-pokemon-go/
- [PGO12] Pokémon GO Hub, trading guide: https://pokemongohub.net/post/guide/pokemon-go-trading-ultimate-go-hub-guide/ ; Niantic Help, Lucky Friends: https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1485-lucky-friends/
- [PGO13] VGC, user-created Routes: https://www.videogameschronicle.com/news/user-created-routes-are-coming-to-pokemon-go/

**TikTok**
- [TT1] European Commission, preliminary finding on TikTok's addictive design (6 Feb 2026): https://digital-strategy.ec.europa.eu/en/news/commission-preliminarily-finds-tiktoks-addictive-design-breach-digital-services-act ; Verfassungsblog analysis: https://verfassungsblog.de/tiktok-dsa/ ; Schjødt commentary: https://schjodt.com/news/addictive-platform-design-under-dsa-scrutiny-the-european-commissions-preliminary-findings-on-tiktok
- [TT2] European Commission, TikTok Lite Rewards withdrawn from the EU: https://digital-strategy.ec.europa.eu/en/news/tiktok-commits-permanently-withdraw-tiktok-lite-rewards-programme-eu-comply-digital-services-act ; PocketGamer.biz: https://www.pocketgamer.biz/tiktok-kills-its-lite-rewards-program-after-eu-digital-services-act-pressure/
- [TT3] Qustodio 2024 annual report: https://www.qustodio.com/en/research/qustodio-releases-2024-annual-report/ ; TechCrunch on 2023 data: https://techcrunch.com/2024/01/25/kids-spent-60-more-time-on-tiktok-than-youtube-last-year-20-tried-openais-chatgpt/ ; iTWire, Australia 2025: https://itwire.com/guest-articles/guest-research/australian-children-spent-more-than-two-hours-a-day-on-tiktok-in-2025-prior-to-ban-qustodio-report
- [TT4] Su et al., "Viewing personalized video clips recommended by TikTok activates default mode network and ventral tegmental area", NeuroImage 2021: https://www.sciencedirect.com/science/article/pii/S1053811921004134
- [TT5] TikTok Newsroom, teen screen-time defaults and wind-down: https://newsroom.tiktok.com/en-us/new-ways-we-are-supporting-parents-and-helping-teens-build-balanced-digital-habits ; CBS News, 60-minute default: https://cbsnews.com/amp/atlanta/news/tiktok-to-set-one-hour-daily-screen-time-limit-by-default-for-users-under-18
- [TT6] Hootsuite, how the TikTok algorithm works: https://blog.hootsuite.com/tiktok-algorithm/ ; Dataslayer, TikTok algorithm 2025: https://www.dataslayer.ai/blog/tiktok-algorithm-2025-complete-guide-for-marketers
- [TT7] Dash Social, Stitch vs Duet: https://www.dashsocial.com/blog/tiktok-stitch-vs-duet
- [TT8] Tech Times, EU charges Meta over infinite scroll (July 2026): https://www.techtimes.com/articles/320180/20260711/eu-charges-meta-addictive-design-infinite-scroll-violates-dsa-health-rules.htm

**Marvel Snap**
- [MS1] PocketGamer.biz, Marvel Snap and Skystone after the takedown: https://www.pocketgamer.biz/marvel-snap-secures-new-publisher-skystone-games-after-surprise-takedown/
- [MS2] Udonis, Marvel Snap stats 2026: https://www.blog.udonis.co/statistics/marvel-snap
- [MS3] Jak Marshall, "Marvel Snap's Snap mechanic": https://gmdq.substack.com/p/marvel-snaps-snap-mechanic
- [MS4] Android Police, "Why I want to quit playing Marvel Snap": https://www.androidpolice.com/marvel-snap-why-im-quitting/ ; Steam discussion, "Marvel Snap's decline": https://steamcommunity.com/app/1997040/discussions/0/691997670669112410/
- [MS5] Shacknews, July 2024 season (Alliances, Deadpool's Diner): https://www.shacknews.com/article/140521/marvel-snap-july-2024-season ; Marvel Snap Zone, Deadpool's Diner: https://marvelsnapzone.com/deadpools-diner-guide/
- [MS6] Marvel Snap Zone, Infinity Splits: https://marvelsnapzone.com/infinity-splits/ ; SnapComplete, Snap Packs: https://snapcomplete.com/faq/snap-packs

**Hearthstone**
- [HS1] Hearthstone Wiki, Rewards Track: https://hearthstone.wiki.gg/wiki/Rewards_Track
- [HS2] PC Gamer, Blizzard apologises for the rewards mess: https://www.pcgamer.com/blizzard-apologizes-for-hearthstone-rewards-mess-says-changes-are-coming/ ; Blizzard Watch: https://blizzardwatch.com/2020/12/02/everything-new-hearthstone-progression-system-wrong/
- [HS3] Udonis, Hearthstone player count 2026: https://www.blog.udonis.co/mobile-marketing/mobile-games/hearthstone-player-count
- [HS4] Hearthstone Wiki, Arena: https://hearthstone.wiki.gg/wiki/Arena

**Roguelites**
- [RL1] Wikipedia, Vampire Survivors: https://en.wikipedia.org/wiki/Vampire_Survivors ; Vampire Survivors Wiki, Arcanas: https://vampire.survivors.wiki/w/Arcanas
- [RL2] Android Police, Vampire Survivors secrets: https://www.androidpolice.com/vampire-survivors-best-secrets-unlocks/
- [RL3] Slay the Spire Wiki, Ascension: https://slaythespire.wiki.gg/wiki/Ascension ; Hades Wiki, Heat: https://hades.fandom.com/wiki/Heat ; Balatro Wiki, Stakes: https://balatrogame.fandom.com/wiki/Stakes
- [RL4] GameSpot, Balatro rating changed and PEGI revises gambling criteria: https://www.gamespot.com/articles/balatros-confusing-rating-finally-changed-leads-to-europe-changing-how-it-rates-gambling-games/1100-6529673/

**Party games**
- [PG1] Udonis, Stumble Guys player count and revenue: https://www.blog.udonis.co/mobile-marketing/mobile-games/stumble-guys
- [PG2] PocketGamer.biz, Stumble Workshop: https://www.pocketgamer.biz/stumble-guys-new-stumble-workshop-opens-the-ugc-floodgates/ ; Naavik, State of UGC games 2025: https://naavik.co/deep-dives/the-state-of-ugc-games-2025-deep-dive/
- [PG3] Game Rant, Fall Guys quality focus: https://gamerant.com/fall-guys-quality-focus-free-to-play-shift-consistent/ ; Foothill Dragon Press, "The downfall of Fall Guys": https://foothilldragonpress.org/272694/arts-and-entertainment/gaming-arts-and-entertainment/the-downfall-of-fall-guys/

**Animal Crossing**
- [AC1] "Essential Escapism through Progress Simulation: Animal Crossing New Horizons' Temporal Design", ACM SIGDOC 2024: https://dl.acm.org/doi/fullHtml/10.1145/3641237.3691689
- [AC2] Animal Crossing Wiki, monthly critter lists: https://animalcrossing.fandom.com/wiki/Guide:Monthly_critter_lists_(New_Horizons)
- [AC3] Nookipedia, Museum: https://nookipedia.com/wiki/Museum
- [AC4] Gematsu, version 3.0 and Switch 2 Edition: https://www.gematsu.com/2025/10/animal-crossing-new-horizons-version-3-0-update-and-nintendo-switch-2-edition-announced

**Other peers**
- [OT1] Deconstructor of Fun (Duolingo), Streaks: https://duolingo.deconstructoroffun.com/mechanics/streaks ; StriveCloud, Duolingo gamification: https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo
- [OT2] Slate, Josh Wardle on Wordle: https://slate.com/culture/2022/01/wordle-game-creator-wardle-twitter-scores-strategy-stats.html ; Puzzle Cottage, Wordle history: https://puzzlecottage.com/wordle-history
- [OT3] Chess.com, "Server trouble and the end of Mittens?": https://www.chess.com/article/view/chesscom-update-january-2023 ; Wikipedia, Mittens (chess): https://en.wikipedia.org/wiki/Mittens_(chess)
- [OT4] Wikipedia, Pokémon TCG Pocket: https://en.wikipedia.org/wiki/Pok%C3%A9mon_Trading_Card_Game_Pocket ; Newsweek, trading overhaul: https://www.newsweek.com/entertainment/video-games/pokemon-tcg-pocket-reveals-huge-changes-following-player-outrage-2044861
- [OT5] Variety, Monopoly Go $5B: https://variety.com/2025/gaming/news/monopoly-go-scopely-pokemon-go-acquisition-interview-1236440074/ ; Scopely, $6B milestone: https://www.scopely.com/en/news/sensor-tower-scopelys-monopoly-go-hit-6-billion-revenue-milestone-in-2025-in-record-time
- [OT6] Prima Games, "Monopoly GO is the most unironically exploitative cash-grab": https://primagames.com/gaming/monopoly-go-is-the-most-unironically-exploitative-cash-grab-gaming-has-ever-seen ; MMO Culture, event schedule: https://mmoculture.com/tips-guides/monopoly-go-events/
- [OT7] Game World Observer, "We were wrong": Squad Busters shutdown: https://gameworldobserver.com/2025/10/30/we-were-wrong-supercell-to-shut-down-squad-busters-two-years-after-games-release ; mobilegamer.biz: https://mobilegamer.biz/supercell-is-killing-squad-busters/
- [OT8] Screen Rant, Genshin Impact 100% exploration: https://screenrant.com/genshin-impact-perfect-area-exploration-guide/

**Regulation (EU and Denmark)**
- [REG1] European Commission, guidelines on the protection of minors under the DSA (14 Jul 2025): https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors ; Lewis Silkin summary: https://www.lewissilkin.com/insights/2025/07/15/european-commission-issues-dsa-guidance-on-protecting-children-online-and-release-102kt7n
- [REG2] PEGI, expanded criteria (interactive risk categories): https://pegi.info/news/pegi-expands-age-rating-criteria-interactive-risk-categories ; Game Developer: https://www.gamedeveloper.com/business/pegi-revises-its-age-ratings-system-with-considerations-for-loot-boxes-daily-quests
- [REG3] Freshfields, the proposed Digital Fairness Act for game developers: https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/the-eus-proposed-digital-fairness-act-a-game-developers-guide-to-potential-imp-102ltio ; Osborne Clarke, DFA and addictive design: https://www.osborneclarke.com/insights/digital-fairness-act-unpacked-addictive-design ; EP Think Tank, addictive design (May 2026): https://epthinktank.eu/2026/05/06/addictive-design-on-online-platforms/
- [REG4] Forbrugerombudsmanden, European consumer authorities act on in-game virtual currencies (21 Mar 2025): https://forbrugerombudsmanden.dk/nyheder/forbrugerombudsmanden/pressemeddelelser/2025/20250321-europaeiske-forbrugermyndigheder-griber-ind-overfor-computerspils-virtuelle-penge-og-vaerdier
- [REG5] Forbrugerrådet Tænk, report of 17 games for manipulating children with virtual currency (Sept 2024): https://taenk.dk/forbrugerliv/elektronik-og-digitale-tjenester/anmeldelse-spil-manipulation-virtuel-valuta-boern

**Research on play and wellbeing**
- [RES1] Vuorre, Johannes, Magnusson, Przybylski, "Time spent playing video games is unlikely to impact well-being", Royal Society Open Science 2022: https://royalsocietypublishing.org/rsos/article/9/7/220411/96718/Time-spent-playing-video-games-is-unlikely-to
- [RES2] "Perceived value of video games, but not hours played, predicts mental well-being in casual adult Nintendo players", Royal Society Open Science 2025: https://royalsocietypublishing.org/rsos/article/12/3/241174/86839/Perceived-value-of-video-games-but-not-hours
- [RES3] Vallerand et al., "Les Passions de l'Âme: On Obsessive and Harmonious Passion", JPSP 2003: https://selfdeterminationtheory.org/SDT/documents/2003_VallerancBlanchardMageauKoesnterRatelleLeonardGagneMacolais_JPSP.pdf ; Luxford et al. 2022, passion, self-regulation and well-being: https://journals.sagepub.com/doi/abs/10.1089/cyber.2021.0321
- [RES4] "Snapchat streaks: how are these forms of gamified interactions associated with problematic smartphone use and fear of missing out among early adolescents?", Computers in Human Behavior Reports 2023: https://www.sciencedirect.com/science/article/pii/S2772503023000476
