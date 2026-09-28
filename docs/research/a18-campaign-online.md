# A18 research: the War Path (saga-map campaign) and the road to online 1v1

Date: 2026-09-28. Input for the A18 design pass. Answers two owner wishes: "a level map like Candy Crush where you beat the levels one by one against different cool opponents" and "online multiplayer is the final goal".

**Method and limits.** Web search worked; most page fetches were blocked by the egress proxy (developers.cloudflare.com, pocketgamer.biz, fandom). Cloudflare numbers were therefore read from the source of Cloudflare's own docs on GitHub (`cloudflare/cloudflare-docs`, branch `production`, fetched 2026-09-28), which is what developers.cloudflare.com renders. Other numbers come from search-result extracts of the cited pages. Anything from memory is marked *(unverified)*. The classic Flash games are called "the 2007 original" and "the 2010 sequel"; their name is never used in Ageborn.

**Builds on.** DESIGN A6.10 (Conquest, 9 Generals), A7 (AI tiers 0-X), A15 (engagement red lines), A15.17 (online wishlist), A16.21 (people online, safety for minors), D1 (online 1v1), `docs/research/a18-classics.md` (ages, upgrades, difficulty in the classics), and the owner direction in `docs/decisions.md` ("War Path is the centerpiece of Home"). Another agent is adding the Home War Path entry, a difficulty picker (Easy..Legendary mapped to tiers) and a stronger AI; this report does not redesign those, it proposes how the level map and the online stack sit on top of them. A local online spike is in progress in `server/` (`server/shared/protocol.ts`: one Durable Object per match, server-stamped commands at tick + 4, frames every 2 ticks, hash every 20 ticks); section 2 builds on that design.

---

## 0. Twelve findings that matter

1. **Saga maps are built from short, fixed-size chunks.** Candy Crush: 15 levels per episode (the first two episodes 10), 22,000+ levels by 2026. Plants vs Zombies: 5 worlds × 10. Kingdom Rush: 12-18 main levels per game. Battle Cats: 3 chapters × 48 stages per saga. For a game whose "level" is a 5-9 minute battle, **10 levels per region** is the right chunk.
2. **Difficulty is a sawtooth, not a ramp.** Candy Crush deliberately spikes difficulty around levels 5-6 and 8-10 of each episode, then relaxes, so it never becomes monotonous or grinding.
3. **Hard levels are labelled on the map.** Candy Crush marks Hard (red) and Super Hard (thunderstorm / skull) levels. Players accept a wall they were warned about; they rage at an unannounced one.
4. **Every new mechanic gets an easy teaching level first**, then a few levels that raise it or mix it with older ones (Candy Crush's "complexity staircase"). Most new levels mix recent and long-established mechanics.
5. **Stars are a skill layer on top of progress, never a wall.** Angry Birds: 3 stars by score, with the target shown and the goal text changing with your best. Kingdom Rush: 3 stars by lives left, plus +1 for Heroic and +1 for Iron challenges (5 per level); since Vengeance the 3-star requirement to open challenges was dropped.
6. **Difficulty modes in Kingdom Rush change enemy HP (Casual -20%, Veteran +20%)** and Vengeance added Impossible. The classics research (`a18-classics.md` finding 5) shows players hate pure stat multipliers on the enemy and accept behaviour plus head start. Our tiers already vary behaviour, so difficulty should move tiers, not raw stats.
7. **Replaying the same map harder multiplies content cheaply.** Battle Cats replays each saga's map as Chapter 2 and Chapter 3 with stronger enemies; Kingdom Rush adds Heroic and Iron variants per level with restrictions (towers locked, wave counts hidden).
8. **Campaign-earned permanent bonuses are the "other way to upgrade".** Battle Cats treasures (per stage, bonus only when a set is complete) raise worker rate, wallet, HP, attack, money per kill. Kingdom Rush stars buy tower upgrades. This answers the owner's "more ways to upgrade" *in single player*; it must never reach ranked PvP (which sets every card to L8, A16.7).
9. **Clash Royale's Training Camp** is a practice-versus-AI mode that doubles as the tutorial, with trainers that change as the player's trophies rise. Our War Path's first region can play the same role, and the existing onboarding match becomes level 1.
10. **What we must not copy:** Candy Crush lives that refill on a timer, paid boosters and "almost" pressure; Battle Cats energy, and treasures as random drops. A15's red lines forbid energy, timers and paid anything. Retry is free and instant; rewards are disclosed and fixed.
11. **Online on the Cloudflare free tier is realistic but small.** Durable Objects on Workers Free: 100,000 requests and **13,000 GB-s of duration per day**, 5 M SQLite rows read, 100 k rows written, 5 GB storage; going over makes further operations fail (it never bills). A room that runs its own tick timer stays in memory for the whole match, so duration is the binding limit: about **200-240 matches per day** (roughly 70-120 daily online players at 2-3 matches each). Enough for friends and a small launch, not for a hit.
12. **Lockstep suits this game unusually well.** The sim is already integer, seeded and hashed (B3), both players see the whole lane (no fog, so no map hack), and a replay is just the command log. Cheating is limited to illegal inputs (the sim rejects them), desync tampering (hash mismatch, the server re-simulates to find the honest side), and input bots (rate limits). What costs money is not the server but **native app stores** (Apple $99 a year, Google Play $25 once): the owner must decide; a PWA is free.

---

## Part 1. The War Path: saga-map progression

### 1.1 How the reference games structure a level map

| Game | Size and chunks | Stars / goals | Difficulty | Bosses and special levels | New mechanics | Sources |
|---|---|---|---|---|---|---|
| Candy Crush Saga | 22,445+ levels, 15 per episode (first two 10) | 1-3 stars by score; one objective type per level (orders, jelly, ingredients, mixed, rapids) | Sawtooth: spikes at 5-6 and 8-10 of an episode; Hard (red) and Super Hard (thunderstorm / skull) marked on the map | Super Hard levels as mini climaxes | Easy intro level, then raise, then mix with old blockers; some years refine rather than add | [Wikipedia](https://en.wikipedia.org/wiki/Candy_Crush_Saga), [Pocket Gamer: level count](https://www.pocketgamer.com/candy-crush-saga/how-many-levels-are-there/), [PocketGamer.biz: complexity staircase](https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/), [R. Aguilar: data-driven difficulty](https://www.robguilar.com/posts/candy_crush_difficulty/), [Wiki: Super Hard](https://candycrush.fandom.com/wiki/Super_Hard_Level), [Wiki: Difficulty](https://candycrush.fandom.com/wiki/Difficulty), [F. Ruiz: level design study](https://fran-ruiz.medium.com/match-3-level-design-study-building-three-candy-crush-levels-60f88465af7b) |
| Angry Birds | Episodes of ~21-45 levels *(unverified)* | 3 stars by score thresholds; best score and the next target shown | Loose | Boss pig levels at episode ends *(unverified)* | One new bird per few levels | [Wiki: Star](https://angrybirds.fandom.com/wiki/Star), [Deconstructor of Fun: AB2](https://www.deconstructoroffun.com/blog/2017/6/11/how-angry-birds-2-multiplied-quadrupled-revenue-in-a-year) |
| Kingdom Rush | 12 / 15 / 15 / 16 / 16 / 18 main levels per game, plus elite levels | 3 stars by lives left (18+ of 20 = 3), +1 Heroic, +1 Iron: 5 per level | Casual / Normal / Veteran (enemy HP -20% / 0 / +20%), Impossible from Vengeance | Boss at the end of the campaign and some mid points; Heroic (one life, six big waves) and Iron (one life, one long wave, towers locked, counts hidden) | A new tower or enemy type every level or two; stars buy permanent upgrades | [Wiki: Campaign](https://kingdomrushtd.fandom.com/wiki/Campaign), [Wiki: Difficulty](https://kingdomrushtd.fandom.com/wiki/Difficulty), [Wiki: Heroic](https://kingdomrushtd.fandom.com/wiki/Heroic_Challenge), [Wiki: Iron](https://kingdomrushtd.fandom.com/wiki/Iron_Challenge), [Deconstructor of Fun: KR](https://www.deconstructoroffun.com/blog//2012/10/kingdom-rush-5-steps-to-double-revenue.html) |
| The Battle Cats | 10 main chapters: 9 × 48 stages, 1 × 49; sagas of 3 chapters (Empire of Cats, Into the Future, Cats of the Cosmos, Aku Realms) | Treasures per stage (bronze / silver / gold); a set's bonus only when complete | Each chapter of a saga replays the same map stronger; Into the Future costs 50% more per unit; Cats of the Cosmos adds stage restrictions and "starred" aliens at 1,600% strength, reduced only by that saga's treasures | Each chapter ends in a boss base | Each saga adds an enemy trait (aliens, starred aliens) and treasures that counter it | [Wiki: Game Chapters](https://battle-cats.fandom.com/wiki/Game_Chapters), [Miraheze: chapters](https://battlecats.miraheze.org/wiki/Game_Chapters), [Wiki: Into the Future](https://battle-cats.fandom.com/wiki/Into_the_Future), [Wiki: Cats of the Cosmos](https://battle-cats.fandom.com/wiki/Cats_of_the_Cosmos), [Wiki: Treasure](https://battle-cats.fandom.com/wiki/Treasure) |
| Clash Royale Training Camp | Practice arena vs AI trainers | None | Trainer changes with trophy thresholds; after trainer 13 each step needs +100 trophies | None | The tutorial teaches everything in a few scripted matches | [Wiki: Training Camp](https://clashroyale.fandom.com/wiki/Training_Camp), [Liquipedia](https://liquipedia.net/clashroyale/Training_Camp) |
| Plants vs Zombies | 50 levels = 5 worlds × 10 | None | Per world ramp | Level 10 of each world is special (conveyor or boss), level 5 a minigame | A new plant after most levels (see `a18-classics.md` finding 6) | `a18-classics.md` |

### 1.2 Why players keep going (and which reasons we may use)

| Driver | Seen in | Use in Ageborn? |
|---|---|---|
| **The next node is visible and one tap away** (goal gradient: effort rises as the goal nears) | All saga maps | Yes: the War Path on Home always shows the next level with a Play button (owner direction). |
| **Stars left behind** (unfinished business, the Zeigarnik effect; Angry Birds shows your best and the next target) | Angry Birds, KR, Candy Crush | Yes: stars are shown per node, with the missing star's goal written out. |
| **Mastery from new mechanics at a steady beat** | Candy Crush staircase, PvZ, KR | Yes: one new thing per 1-3 levels in the first regions (section 1.5). |
| **A named rival at the end of each chunk** | KR bosses, Battle Cats boss bases, Conquest | Yes: each region ends in a named General (reusing Conquest's cast). |
| **Permanent power earned by skill** (stars, treasures) | KR stars, Battle Cats treasures | Yes, PvE only (section 1.6). |
| **Harder replays of a finished map** | Battle Cats chapters 2-3, KR Heroic / Iron | Yes: Veteran and Legend Paths reuse the same 80 levels (section 1.4). |
| **Friends' faces on the map** | Candy Crush | Later, opt-in only, with A16.21's rules for minors. |
| Lives and timers, near-miss pressure, paid boosters, random drops | Candy Crush, Battle Cats | **No.** A15 red lines: no energy, no timers, no money. |

### 1.3 Proposed structure: regions by age

- **One region per age, 10 levels each.** With today's 8 ages: 80 levels. Each new age (A18's age list) adds a region of 10 levels as data. The chunk matches PvZ and our battle length: at a median ~6 minutes per match, one region is about an hour and the whole first pass about 8 hours; three stars about 2-3 times that.
- **A region's battles are fought in an age window ending at that region's age.** Region 1 (Stone) is single-age; region 2 is Stone to Bronze; from region 4 on the window is the last 4 ages (for example region 6 is Gunpowder to Modern). This teaches evolving one age at a time, makes the latest age the payoff of every level, keeps matches long enough without a 14-age marathon later, and introduces each age's new cards in the region where they first appear. It needs `MatchConfig` to accept a start age and an end age (content, format data; to be checked against A17's format tables).
- **Region 1 is the Training Camp.** The existing onboarding match becomes level 1; levels 1-10 teach the controls and systems (section 1.5) against tiers 0-I, mirroring Clash Royale's practice arena.
- **Progress gates only on the boss.** The next region opens when its boss is beaten once, on any difficulty. Stars never block progress (Kingdom Rush dropped its 3-star gate for this reason).

### 1.4 Difficulty curve inside a region (sawtooth)

| Level | Role | Tier offset vs the region's base tier | Map marker |
|---|---|---|---|
| 1 | Intro: the region's new mechanic, in an easy setting | -1 | "New" badge |
| 2 | Practice | 0 | |
| 3 | Mix new with old | 0 | |
| 4 | Feature level: a lane feature or objective variant | 0 | |
| 5 | **Spike**: a mini-boss General lieutenant | +1 | **Hard** |
| 6 | Relief: a fun modifier (for example Gold Rush) | -1 | |
| 7 | Ramp | 0 | |
| 8 | Ramp, a counter puzzle (the enemy plan punishes one class) | +1 | |
| 9 | **Spike** | +1 | **Hard** |
| 10 | **Boss**: the region's General, personal plan, boss base | +2 | **Boss** (skull crown) |

- **Base tier per region** (Normal difficulty): region 1 tier 0, region 2 I, region 3 II, ... region 8 VII, clamped at X. The Easy..Legendary picker built by the other agent shifts this by its tier offset; the map shows the resulting AI tier on every node (A7.1: bots are labelled AI with their tier).
- **Veteran Path and Legend Path** (Battle Cats' chapters 2-3, Kingdom Rush's Heroic and Iron): after the last boss, the same map reopens with base tier +2 and one disclosed Daily modifier per level (Veteran), then +3 and a restriction per level such as "no turrets" or "Heavy units locked" (Legend). 80 authored levels become 240 without new sim rules.

### 1.5 Pacing of new mechanics (proposal)

| Where | New thing |
|---|---|
| R1 L1 | Train units, the lane, destroy the base (onboarding match) |
| R1 L2 | Charge / Hold stance (owner: available from the start) |
| R1 L3 | Turret on a mount |
| R1 L4 | Age Power, dragged onto the lane (owner direction) |
| R1 L5 | First mini-boss |
| R1 L6 | Treasury (income) |
| R1 L7-8 | In-battle troop upgrades (attack / armour / ability), turret range upgrade (A18 upgrade design) |
| R1 L10 | First boss: Pip Quickstep |
| R2 L1 | Evolving (first two-age match) |
| R2 L4 | Stationary class: walls and barricades (owner direction, scheduled early) |
| R3 L1 | Air class |
| R4 L1 | Underground class |
| R3-R8 L4 | One lane feature per region (A15.16 / A16 lane features) |
| From R2 L6 | One Daily modifier per relief level, each introduced once in an easy level before it appears in a hard one |

### 1.6 Stars, rewards and the PvE upgrade track

- **Stars per level (3):** ★ win on any difficulty. ★★ a disclosed level goal (for example base above 50% HP, win before the Final Bell, no Legendary, at most 3 unit types, all turrets survive). ★★★ win on Hard or harder. Easy stays a valid way to progress, and the third star is the chase. Replays of a level keep the best result.
- **Boss rewards:** first win a capsule (region 1-3 Age Capsule, later Jade), fixed and shown on the node before the fight. Star chests every 10 stars on the map (Amber, Dust, cosmetics such as flags and base decorations from the owner's cosmetic list). All earned, all disclosed.
- **War Relics (the Battle Cats treasure idea, made honest):** each region has one relic set of 3 relics, earned deterministically by ★★★ on levels 3, 6 and 9. A complete set gives a small permanent PvE bonus in the region's theme (+5% Treasury income, +4% turret range, +5% Infantry HP). They apply in War Path, Conquest, Skirmish and Endless only; **never in Ladder, Daily, ranked or friendly PvP** (A16.7 standard levels). Content table `warRelics.ts`, rule in `meta`, applied as a modifier on `MatchConfig`.
- **No lives, energy, timers or boosters for sale.** Retry is instant. After 3 losses in a row on a level, the result screen offers "Try Easy" and one A15.12 tip; this is disclosed, and the level never quietly gets easier (Candy Crush tunes levels from data, which we do only in balance patches, as numbers in content).

### 1.7 Boss levels

- **Cast:** the 9 Conquest Generals become the region bosses in tier order (Pip Quickstep region 1 ... Madame Tempest region 8, The Warden as the final boss or a later region's boss); new ages add new Generals. Each shows its AI badge and tier.
- **Boss base:** +50% base HP and one extra fixed turret (a data modifier), a boss portrait at the base.
- **Phase at 50% base HP:** the General switches to Charge, fires its Age Power and deploys a signature Legendary. Implemented in the bot profile (WP3) and a content modifier, never as special sim code, so replays and determinism hold.
- **Telegraphs:** a banner "The General is enraged" and a two-second warning before the phase, as in A12.

### 1.8 Content shape (for the design pass)

```ts
// src/content/raw/warPath.ts (proposal)
interface WarPathLevel {
  id: string;              // 'wp.r3.l05'; stable forever, so stars are never orphaned
  region: number;          // 1..N, one per age
  index: number;           // 1..10
  role: 'intro' | 'practice' | 'mix' | 'feature' | 'spike' | 'relief' | 'ramp' | 'boss';
  ageWindow: [AgeId, AgeId];
  general: GeneralId;      // opponent, labelled AI
  tierOffset: number;      // added to the region base tier and the picker offset
  plan?: WarPlanId;        // the General's personal plan by default
  modifiers: ModifierId[]; // disclosed on the node
  laneFeatures: LaneFeatureId[];
  goal2: StarGoal;         // the ★★ goal
  teaches?: MechanicId;    // drives the intro card and hint
  reward: RewardSpec;      // first clear
  boss?: BossSpec;         // base HP bp, extra turret, phase trigger
}
```

Save: `warPath: { stars: Record<levelId, 0|1|2|3>, best: Record<levelId, ...>, relics: string[], path: 'normal'|'veteran'|'legend' }`. A `tools/warPath.ts` headless check plays every level with the human-limited input bot (A15.17: ≥ 300 ms per action, ≤ 12 actions per 10 s) at each difficulty and fails the build if a Normal level is below 45% or above 85% win rate for a tier-matched player bot, or a boss is below 25%.

---

## Part 2. Online real-time 1v1: technical and product roadmap

### 2.1 Current free-tier facts (checked 2026-09-28)

| Service | Free allowance | What happens at the limit | Source |
|---|---|---|---|
| Cloudflare Workers | 100,000 requests / day; 10 ms CPU per invocation; Worker size up to 64 MiB (raised 2026-09-04) | Requests fail | [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [64 MiB changelog](https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/) |
| Durable Objects (SQLite backend only on Free) | **100,000 requests / day** (each WebSocket connect is 1; incoming WebSocket messages count 20:1; outgoing messages and protocol pings are free); **13,000 GB-s duration / day** at 128 MB per object, billed while the object is active and not eligible for hibernation; 5 M rows read / day; 100 k rows written / day; 5 GB storage total; 100 classes; 30 s CPU per request, reset by each incoming message; 32,768 hibernatable WebSockets per object | "Further operations of that type will fail with an error"; daily limits reset 00:00 UTC; no bill | Cloudflare docs source on GitHub: [pricing.mdx](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/durable-objects/platform/pricing.mdx), partial `durable-objects-pricing.mdx`, [limits.mdx](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/durable-objects/platform/limits.mdx); [DO free tier changelog](https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier/); [WebSocket hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets) |
| Cloudflare D1 | 5 M rows read / day, 100 k rows written / day, 5 GB | **Enforced since 2026-09-01**: queries fail until 00:00 UTC | [D1 enforcement changelog](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) |
| Supabase (alternative, not recommended) | 50 k MAU, 500 MB DB, 2 projects | **Paused after 7 days without queries**, no backups | [UI Bakery](https://uibakery.io/blog/supabase-pricing), [Automation Atlas](https://automationatlas.io/answers/supabase-free-tier-limits-2026/) |
| GitHub Actions / Pages | Free for a public repo | n/a | (existing setup) |
| Apple App Store | **$99 / year** developer programme; Sign in with Apple required if any third-party login is offered (guideline 4.8), not if only our own accounts exist | n/a | [Apple 4.8 news](https://developer.apple.com/news/?id=09122019b), [PTKD 4.8](https://ptkd.com/journal/app-store-rejection-4-8-sign-in-with-apple-requirement-fix) |
| Google Play | **$25 once**; new personal accounts need a closed test with 12 testers | n/a | [Play Console help](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en), [IconikAI](https://www.iconikai.com/blog/google-play-developer-account-fee-2026) |

**Not verified:** whether the 10 ms Workers CPU limit also caps Durable Object handlers on the Free plan (the DO limits page lists 30 s without splitting by plan). A full Full War re-simulation takes up to ~400 ms on desktop Node (B3). Milestone M0 must measure this; the design below does not depend on it.

### 2.2 Capacity on the free tier (the owner's key number)

Assumptions: Standard War, median ~7 minutes (420 s); the spike's protocol (server tick timer, frames every 2 ticks, hashes every 20 ticks).

| Budget | Per match | Daily cap | Matches / day |
|---|---|---|---|
| DO duration (the room is never idle while its tick timer runs): 420 s × 0.125 GB | ~53 GB-s (Full War ~64) | 13,000 GB-s | **~240 (Full ~200)** |
| DO requests: 2 connects + incoming (hash 1/s + ~0.5 cmd/s + ping 0.2/s per player ≈ 1.7/s × 2 × 420 ≈ 1,430) / 20 + matchmaker calls ~6 | ~80 | 100,000 | ~1,250 |
| Worker requests (HTTP: login, save, queue join): ~10 per match | ~10 | 100,000 | ~10,000 |
| D1 writes (result, 2 saves, 2 ratings, log row) | ~6 rows | 100,000 | ~16,000 |

- **Result: about 200-240 online matches a day, roughly 70-120 daily online players.** Plenty for friend duels and a soft launch; a hit would need the $5 Workers Paid plan, which the hard rules forbid, so the product must degrade gracefully (2.8).
- **How to raise it for free (M2 option, measured in M0):** a client-clocked relay. The room keeps no timer; each client sends a small "reached tick k" message every 4 ticks; the room stamps commands at the lower reported tick + delay and answers from its message handlers. Between messages it is eligible for hibernation, so duration drops to handler time (well under 1%), and requests become the limit: 5 msgs/s × 2 × 420 / 20 ≈ 210 per match, about **470 matches a day** (2x). Cost: fairness depends on client clocks (the room clamps a client that runs ahead), and more code. Worth doing only if M0 confirms the numbers and players actually hit the cap.
- **Alarms are not a free clock:** each alarm invocation is a billed request, so a 100 ms alarm tick would cost ~4,200 requests a match (about 20 matches a day). Do not use alarms as the tick.

### 2.3 Netcode: deterministic lockstep with an authoritative input relay

The design in DESIGN D1 and A16.21, as implemented in the `server/` spike, is right for this game. D1's "Colyseus 0.17" line is superseded by A16.21's Durable Object relay.

- **Relay, not server simulation.** One Durable Object per match (`idFromName(roomCode)`), WebSocket Hibernation API. The server owns the clock: it stamps each command with `serverTick + INPUT_DELAY` (4 ticks = 200 ms, hidden under the spawn-gate animation) and a server sequence number, and broadcasts frames every 2 ticks carrying all commands up to `u`. Clients never simulate past `u`, so there is no rollback. This is the Age of Empires model ("1500 archers on a 28.8") and Gaffer's deterministic lockstep; input delay of 2-6 ticks is the norm.
- **Hash checks.** Clients send `state.hashes` every 20 ticks; the room compares the two sides. On mismatch the room sends `desync`, both clients upload nothing more than their hash, and the room decides from its own re-simulation of the command log (2.5).
- **Reconnect.** The room keeps the command log (SQLite in the object); a returning client gets the spec and log and fast-forwards (a Full War is ≤ 400 ms headless). Grace 60 s, then forfeit; the match result is still settled by the log.
- **Latency.** One room for two players placed near the first player (location hints); 200 ms input delay covers RTT up to ~150 ms comfortably. Within Europe typical RTT to a Cloudflare location is well under that *(unverified per region; M0 measures)*. Add adaptive delay (4-8 ticks) chosen at match start from the measured RTT.
- **Versioning.** A match only pairs clients with the same `simVersion` and `contentHash`; the queue key contains them. A client on an old build is told to reload (GitHub Pages deploys are atomic per build).
- **PvP rules** (D1): no pause, no speed, hitstop view-only, every card L8 in ranked, repeat order gesture (A16.21).
- **Code layout.** The sim, core and content become a workspace package imported by both `src/` and `server/`; the server imports only `sim`, `core`, `content` and `contracts` (B2 layering holds). A `NetService` interface is injected into `app`, never into the sim.

### 2.4 Cross-play: browser and app

- **One build everywhere.** The game is a web app; the "app" is the same build in a Capacitor wrapper (D1) or installed as a PWA. The same WebSocket protocol serves both, so cross-play is automatic, provided the sim is bit-identical across JS engines.
- **The real risk is engine determinism.** Chrome and Android use V8, iOS and Safari use JavaScriptCore (every iOS browser and WKWebView), Firefox uses SpiderMonkey. Integer math, `Math.imul` and our sfc32 are specified by ECMAScript and should agree; sort stability, `Map` iteration order and any stray float are the usual traps. **M1 runs the golden replays and the fuzz corpus in Chromium, Firefox and WebKit via Playwright in GitHub Actions** (free on a public repo) and must be green before any online match.
- **Stores cost money.** Apple $99 per year, Google Play $25 once (plus 12 testers for 14 days on a new personal account). This conflicts with "no paid services". The free path is a **PWA** (Add to Home Screen) on both platforms. Store apps are an owner decision (2.9).

### 2.5 Anti-cheat by server re-simulation

| Threat | Why lockstep helps or not | Counter |
|---|---|---|
| Illegal commands (spawn without gold, locked card) | Every client runs the same sim, which rejects invalid commands for both sides | Nothing extra; the room also drops commands whose card is not in the side's declared plan |
| Modified client that changes its own state (infinite gold) | Its hash diverges at the next 20-tick check | Room re-simulates the log from tick 0 (≤ 400 ms, once per dispute) and knows the correct hash; the side that disagrees loses and is flagged. If DO CPU turns out capped at 10 ms on Free, re-simulate incrementally (one 20-tick chunk per incoming hash message) or queue disputes for a nightly GitHub Actions job |
| Map hack / information | None to gain: the whole lane is visible to both sides | n/a |
| Input bots, macros | Lockstep cannot see intent | Rate cap per side (A15.17 human limits: ≥ 300 ms between actions averaged, ≤ 12 actions per 10 s); outliers flagged, never auto-banned |
| Speed hack | The server clock owns ticks | n/a |
| Disconnect to avoid a loss | | Forfeit after 60 s; a disconnect counts as a loss for rating |
| Save tampering (card levels, currencies) | | Ranked uses L8 for everyone (A16.7); for online accounts the server grants rewards and rolls capsules (A15.17, D1) and the cloud save is authoritative for online currencies |
| Win trading, smurfing | | At most 3 rated matches per pair per day; Glicko-2 provisional period; only human-vs-human moves rating (A16.21) |
| Leaderboard replays (Daily) | | Server re-simulates each replay before listing it (A15.17) |

### 2.6 Accounts and cloud save

- **Anonymous device-key accounts (A16.21).** The client creates an Ed25519 (or ECDSA P-256, wider WebCrypto support) key pair, keeps the private key non-extractable in IndexedDB, and signs a server challenge. No email, no password, no personal data: good for minors and GDPR.
- **Recovery and second devices:** a one-time **transfer code** (like Clash's account transfer, 12 characters, 24 h) links a new device's key to the account. Optional passkey (WebAuthn) later. Third-party logins (Google, Apple) only if the owner asks; if any is offered on iOS, Sign in with Apple is required.
- **Storage.** D1 for accounts, keys, ratings, friend codes and the cloud copy of `SaveDoc` (one row per account, written after each match and on settings change, ≈ 2 rows per match). Room logs live in the match DO and are copied to D1 only for disputes and leaderboards.
- **Sync rule.** `SaveStore` gets a remote adapter behind the existing interface (B8). Offline-only data stays local-first; online currencies and capsule rolls are server-authoritative; a conflict shows both saves' summaries and lets the player pick (never silent loss).

### 2.7 Matchmaking

- **One Matchmaker Durable Object** (a singleton, hibernatable WebSockets). A player joins with a signed token, rating, queue key (`mode|format|simVersion|contentHash`).
- **Pairing:** by Glicko-2 rating with a window that widens every 5 s (±100 → ±400), then **AI fill after 20-30 s, clearly labelled AI** (A7.1, A16.21); AI matches never move the rating.
- **Friend duels** by room code or invite link (the spike's `code`), no matchmaker needed: the first online feature.
- **Capacity guard:** the Worker keeps a daily counter (a small DO) of matches started; near 90% of the day's safe budget, new ranked queues close with "Online is full for today, play the AI (labelled) or try again after 02:00" (00:00 UTC), and friend duels continue until 100%.

### 2.8 Product rules online

- Safety for minors per A16.21: no free text, emotes and quips only, friend codes out of band, block and report everywhere, pseudonymous auto names, presence off by default; a Danish lawyer reviews age and consent before ranked opens (A16.21 item 6; the owner decides how, since it may cost money).
- Ranked: Glicko-2 visible plus trophies (owner decision O3), Standard War until Short War's Bell rows pass (A16.5).
- Seasons with carry-over, daily leaderboards per difficulty, warbands, as A15.17.

### 2.9 What the owner must set up (exact steps, when each milestone needs it)

1. **Cloudflare account (M2).** Go to dash.cloudflare.com, sign up with an email, verify it. Stay on the Free plan; do not add a payment method and never switch Workers to "Paid". Choose a workers.dev subdomain (for example `ageborn`).
2. **API token for deploys (M2).** In Cloudflare: My Profile > API Tokens > Create Token > template "Edit Cloudflare Workers" > account: yours > Create. Copy the token and the Account ID (Workers & Pages overview, right side).
3. **GitHub secrets (M2).** In github.com/SimNyborg/ageborn: Settings > Secrets and variables > Actions > New repository secret: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The deploy workflow then publishes the server on every push to `main`.
4. **Usage alerts (M2).** Cloudflare: Notifications > Add > "Usage-based billing" is not available on Free; instead check Workers & Pages > Overview weekly, or let the in-game capacity guard handle it. Free limits never produce a bill, only errors.
5. **Decisions (before M5 and M7):** the lawyer review for online features with minors; whether to pay for store apps (Apple $99 per year, Google $25 once) or stay PWA-only; the public server name shown in the game.
6. **Testing (each milestone):** open the game on two devices (PC and phone), press Online > Friend Duel, share the code, play a full match; report lag, disconnects and anything that looked out of sync.

### 2.10 Milestones in order

| # | Milestone | Contents | Exit test |
|---|---|---|---|
| M0 | **Spike** (in progress, `server/`) | Local `wrangler dev` room, two headless clients, bench of messages, bytes, duration and CPU per match; measure whether DO handlers on Free are capped at 10 ms CPU | Two bot clients finish 100 matches with zero desyncs; measured GB-s and requests per match written to `docs/online-spike.md` |
| M1 | **Determinism everywhere** | Sim, core, content as a workspace package; golden replays and fuzz in Chromium, Firefox and WebKit in CI; no floats or unordered iteration in sim paths | CI green on 3 engines; any cross-engine hash difference fails the build |
| M2 | **Friend Duel** (first public online) | Deploy the room to workers.dev; invite codes; reconnect with 60 s grace; desync detection and dispute re-sim; adaptive input delay; capacity guard; `NetService` in `app`; online e2e in CI with two Playwright contexts | Owner plays PC vs phone; 0 desyncs in 200 CI matches; daily usage under 50% of budget in the soak test |
| M3 | **Accounts and cloud save** | Device-key accounts, transfer code, D1 schema, remote `SaveStore` adapter, conflict screen | Save moves between two devices with a transfer code; offline play unchanged |
| M4 | **Casual matchmaking** | Matchmaker DO, queue keyed by build, AI fill labelled AI, block and report, emotes | Two strangers are paired within 30 s or get a labelled AI |
| M5 | **Ranked** | L8 standard levels, Glicko-2 plus trophies, server-granted rewards and capsule rolls for online accounts, rate caps, win-trade limits, lawyer review done | Rating moves only on human-vs-human; tampered-client test loses its disputes |
| M6 | **Friends and leaderboards** | Friend list by code, presence opt-in, friend leaderboards, Daily leaderboard with server re-sim, spectating with 30 s delay | Re-simulated leaderboard rejects an edited replay |
| M7 | **Apps and cross-play** | PWA first; Capacitor wrappers if the owner pays the store fees | A browser player and an app player finish a ranked match |
| M8 | **Clans, warbands, 2v2** | A16.21 clans, A15.17 warbands, 2v2 co-op vs AI, then PvP | Per A16.21 |

**Order rationale.** Determinism across engines (M1) is the only thing that can silently break cross-play, so it comes before any public match. Friend Duel (M2) needs no accounts, costs almost nothing, and gives the owner real online play early. Accounts (M3) come before matchmaking because rating, rewards and anti-cheat need identity. Ranked (M5) waits for the lawyer review and anti-cheat. Stores (M7) wait for an owner money decision.

### 2.11 How the single-player work leads there

- The War Path's Generals, tiers and the Easy..Legendary picker become the **AI fill** and practice opponents for online queues.
- The sim's command stream, hashes and replays are already the netcode's data; every War Path match is a regression test for determinism.
- War Relics and card levels are PvE-only, so the online game stays fair with L8 standard levels and no pay or grind edge.

---

## Sources

- Candy Crush: [Wikipedia](https://en.wikipedia.org/wiki/Candy_Crush_Saga); [Pocket Gamer, level count](https://www.pocketgamer.com/candy-crush-saga/how-many-levels-are-there/); [ofzenandcomputing, Sept 2026 count](https://www.ofzenandcomputing.com/how-many-levels-candy-crush-saga/); [PocketGamer.biz, complexity staircase](https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/); [Roberto Aguilar, difficulty adjustments](https://www.robguilar.com/posts/candy_crush_difficulty/); [Wiki: Difficulty](https://candycrush.fandom.com/wiki/Difficulty); [Wiki: Super Hard Level](https://candycrush.fandom.com/wiki/Super_Hard_Level); [King community, hard level criteria](https://community.king.com/en/candy-crush-saga/discussion/360672/%EF%B8%8F-criteria-for-hard-super-hard-and-nightmarishly-hard-levels); [Fran Ruiz, level design study](https://fran-ruiz.medium.com/match-3-level-design-study-building-three-candy-crush-levels-60f88465af7b)
- Angry Birds: [Wiki: Star](https://angrybirds.fandom.com/wiki/Star); [Deconstructor of Fun, Angry Birds 2](https://www.deconstructoroffun.com/blog/2017/6/11/how-angry-birds-2-multiplied-quadrupled-revenue-in-a-year)
- Kingdom Rush: [Wiki: Campaign](https://kingdomrushtd.fandom.com/wiki/Campaign); [Wiki: Difficulty](https://kingdomrushtd.fandom.com/wiki/Difficulty); [Wiki: Heroic Challenge](https://kingdomrushtd.fandom.com/wiki/Heroic_Challenge); [Wiki: Iron Challenge](https://kingdomrushtd.fandom.com/wiki/Iron_Challenge); [Deconstructor of Fun, Kingdom Rush](https://www.deconstructoroffun.com/blog//2012/10/kingdom-rush-5-steps-to-double-revenue.html)
- The Battle Cats: [Wiki: Game Chapters](https://battle-cats.fandom.com/wiki/Game_Chapters); [Miraheze: Game Chapters](https://battlecats.miraheze.org/wiki/Game_Chapters); [Wiki: Into the Future](https://battle-cats.fandom.com/wiki/Into_the_Future); [Wiki: Cats of the Cosmos](https://battle-cats.fandom.com/wiki/Cats_of_the_Cosmos); [Wiki: Treasure](https://battle-cats.fandom.com/wiki/Treasure); [Wikipedia](https://en.wikipedia.org/wiki/The_Battle_Cats)
- Clash Royale: [Wiki: Training Camp](https://clashroyale.fandom.com/wiki/Training_Camp); [Liquipedia: Training Camp](https://liquipedia.net/clashroyale/Training_Camp)
- Cloudflare: [DO pricing (docs source)](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/durable-objects/platform/pricing.mdx); [DO limits (docs source)](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/durable-objects/platform/limits.mdx); [DO pricing page](https://developers.cloudflare.com/durable-objects/platform/pricing/); [DO free tier changelog 2025-04-07](https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier/); [DO WebSockets and hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets); [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/); [Workers 64 MiB changelog 2026-09-04](https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/); [D1 free-tier enforcement 2026-09-01](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/); [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/); [tech-insider, DO multiplayer server 2026](https://tech-insider.org/cloudflare-durable-objects-multiplayer-game-server-2026/)
- Netcode: [Gaffer On Games, Deterministic Lockstep](https://gafferongames.com/post/deterministic_lockstep/); [1500 Archers on a 28.8 (Game Developer)](https://www.gamedeveloper.com/programming/1500-archers-on-a-28-8-network-programming-in-age-of-empires-and-beyond); [SnapNet, Lockstep](https://www.snapnet.dev/blog/netcode-architectures-part-1-lockstep/); [yal.cc, preparing for deterministic netcode](https://yal.cc/preparing-your-game-for-deterministic-netcode/); [mas-bandwidth, choosing a network model](https://mas-bandwidth.com/choosing-the-right-network-model-for-your-multiplayer-game/)
- Accounts, stores, backends: [Apple, Sign in with Apple guideline](https://developer.apple.com/news/?id=09122019b); [PTKD, guideline 4.8](https://ptkd.com/journal/app-store-rejection-4-8-sign-in-with-apple-requirement-fix); [Google Play Console help](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en); [IconikAI, Play fee and 12-tester rule](https://www.iconikai.com/blog/google-play-developer-account-fee-2026); [UI Bakery, Supabase 2026](https://uibakery.io/blog/supabase-pricing); [Automation Atlas, Supabase free limits](https://automationatlas.io/answers/supabase-free-tier-limits-2026/)
- Internal: DESIGN A6.10, A7, A15, A15.17, A16.7, A16.21, B3, B8, D1; `docs/research/a18-classics.md`; `docs/decisions.md` (owner feedback 2026-09-28); `server/shared/protocol.ts`.
