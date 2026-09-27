# Market research: browser portals, short-form clips and naming for the age-evolution lane battler (as of September 2026)

## TL;DR: recommendations

1. **Build to Poki's technical bar, even if we launch on CrazyGames first.** That means an initial download of 5 MB or less and 8 MB or less in total, play within 10 seconds of loading, all-ages content, no chat, no in-app purchases and no outgoing links. A build that passes Poki passes every other portal. Procedural vector art plus WebAudio synthesis fits this budget well.
2. **Poki requires web exclusivity. CrazyGames and Y8 do not.** Pick a path early. Poki's private Playtest and Player Fit tests do not publish the game, so we can collect data there before committing.
3. **The genre already performs on portals.** On Poki, War of Sticks is the #1 strategy game (4.6/5 from 945k votes), Stickman Kingdom Clash has 4.3/5 from 196k votes, and Age of War still rates 4.5/5 from 78k votes. On CrazyGames, TimeWarriors (an era-evolution lane battler from Dec 2024) is in the tower defense top 10. Judging by their descriptions, none of them combine a deck, a collection, chests and a PvP-style ladder. That is our gap.
4. **Targets:**
   - Conversion to play: 65% or more (the Poki average is about 70%).
   - Average playtime: 5 minutes or more on Poki. CrazyGames strategy games average 17 minutes.
   - D1 retention: 10–15% on CrazyGames. The platform average is 6.7%; strategy averages 7.5%.
5. **Show the signature moments early.** The first age evolution should happen inside the first 2–3 minutes of the first match. The first chest opening should come right after that match. Poki's Player Fit test passes a game only if average playtime is over 3 minutes and at least 25% of plays last longer than 3 minutes.
6. **Fix what Age of War players complained about:**
   - late-game turret camping and stalemates
   - AFK waiting strategies
   - back-line units that stand idle
   - difficulty spikes
   - matches that drag on
7. **Chests must be earn-only, with odds shown, a pity timer and no fake near-misses.** Use a chest or card reveal rather than a slot-machine or roulette reel for the Poki build. Poki bans gambling themes and requires the game to be kid-safe.
8. **Build clip tooling into the engine from day one:**
   - a deterministic replay system
   - a 9:16 "clip camera"
   - a rolling capture buffer
   - automatic highlight triggers for evolution, legendary pulls, comebacks and big battles

   Deterministic replays also give us ghost opponents and a later authoritative server.
9. **Name shortlist:** Ageborn, Mammoths to Mechs, Aeonfront. All three came up clear in quick web, Steam and Google Play checks. A trademark check (EUIPO/USPTO via TMview) is still needed.

---

## 1. Portal landscape

| Portal | Reach | Exclusivity | Revenue model | Monetization rules relevant to us |
|---|---|---|---|---|
| **Poki** | 100M monthly players; 625M players and 11.1B gameplays in 2025; 227 new games in 2025; average session reported at 24 min | **Web-exclusive.** Steam, app stores and consoles stay ours. | 50/50 on Poki-sourced traffic; 100% on direct traffic | No in-app purchases. Poki SDK ads only. Must work with adblock. Rewarded ads must be optional. No chat. No gambling. |
| **CrazyGames** | 50M+ monthly players, mostly tier-1 markets (developer portal claim, via a secondary source); ~4,000 games | Non-exclusive | Ad revenue share. A secondary source cites 60% of ads and 70% of IAP to the developer; minimum payout €100/month. | In-game purchases are invite-only (Xsolla) and only for signed-in users. Loot-box restrictions apply only to *monetized* random rewards (BE, CN, NL, RS, SK always; TW/KR unless odds are disclosed; JP conditions). |
| **Y8** | 30M+ monthly players; 750M+ plays on Y8 Studio games | Not stated | 50% of ad revenue | SDK is mandatory (ads, cloud save, leaderboards, achievements, accounts) |
| **itch.io** | Indie and developer-heavy audience | None | Pay-what-you-want or donations | Top HTML5 strategy games there are roguelites, auto-battlers and card games. Good for devlogs, jams and early feedback, not for mass traffic. |

**Recommendation:** use itch.io (unlisted or public) and Poki's private playtests for early data. Then choose one of two paths:
- **(a) Poki exclusive:** bigger funnel, stricter rules.
- **(b) CrazyGames + Y8 + others:** CrazyGames Basic Launch gives a soft launch with real players and no ads.

We cannot do both on the web.

## 2. Technical requirements (hard numbers)

| Requirement | Poki | CrazyGames | Y8 / itch.io |
|---|---|---|---|
| Initial download | **≤5 MB** recommended, **≤8 MB total** | ≤50 MB (Basic); **≤20 MB for mobile homepage** eligibility | itch.io: zip ≤500 MB, ≤200 MB per file, ≤1,000 files |
| Total size / files | 8 MB guideline | ≤250 MB, ≤1,500 files | n/a |
| Load time | Players leave after about 10 s. Poki leadership says hits are playable in under 3 s, and that file size is everything (Drive Mad is 3.7 MB). | ≤20 s to gameplay for externally loaded files. Successful games load in under 10 s with builds under 20 MB. | Y8 reviews loading and performance |
| Devices | Desktop, mobile and tablet all mandatory. Must run on mid-range phones up to 3 years old. Full screen on mobile. Mobile controls forced on tablets. 16:9; iframe sizes 640×360, 836×470 and 1031×580. | Chrome and Edge required. Must run on 4 GB RAM Chromebooks. Use DPR 1 on iOS and low-memory Android. Safe-area padding. `user-select:none`. | Y8: mobile-optimized, correct orientation |
| External resources | All external requests blocked; bundle fonts and libraries. Links only via `PokiSDK.openExternalLink`. No splash screens or outgoing links. | Relative paths only. Community links on the menu only. No cross-promotion. No app store links. No custom fullscreen button. | n/a |
| Language | Localization recommended | English mandatory; use the SDK locale | n/a |
| Input | n/a | No Esc or Ctrl+W bindings. Support AZERTY. | n/a |
| Content | All ages. No graphic violence or visible body fluids. No chat (emoji systems suggested). No gambling. | PEGI 12. Original names and assets; avoid generic names. | n/a |
| SDK events | `gameLoadingFinished`, `gameplayStart/Stop`, `commercialBreak` (natural stops only), `rewardedBreak` (explicit player choice only) | `gameplayStart` at playable state for Basic Launch. Full Launch adds the Data module (cloud save of progress is required) and User module. | Y8 SDK mandatory |

Poki's published engine sizes, compressed: PixiJS 130 KB, Three.js 151 KB, Phaser 290 KB, PlayCanvas 300 KB, Defold 1.03 MB, Godot about 10 MB, Unity about 11 MB. **A JS/TS stack on PixiJS or Phaser with procedural art is the only realistic way to stay under 5 MB.**

**Build budget to adopt for v1:**
- Initial chunk ≤3 MB: engine, first-age data, synthesized SFX.
- Total ≤8 MB.
- Music and later ages lazy-loaded while the tutorial match plays. This is CrazyGames' recommended pattern: start gameplay once the tutorial is playable and stream the rest.
- Fixed-timestep simulation. CrazyGames requires physics to behave the same at any monitor refresh rate, and a fixed timestep is also what deterministic replays and lockstep need.
- One `PlatformAdapter` interface (none / Poki / CrazyGames / Y8): loading and gameplay events, ad breaks, save/load, user, locale.
- Per-portal build flags, for example no links and no reel-style case animation on Poki.

## 3. Policy constraints that shape our design

- **Cases and chests.** Keeping them earn-only puts us outside the monetized loot-box rules CrazyGames lists. Poki, however, bans gambling themes, requires the game to be kid-safe, and does not allow IAP. The UK government's evidence review on skins gambling flags near-miss animations and slot-machine resemblance as harmful features. Therefore:
  - show drop odds
  - add a pity counter
  - convert duplicates into upgrade shards
  - never animate fake near-misses
  - make the default reveal a chest or card reveal (Clash- or FIFA-style staging); a CS-style reel can be an optional skin on non-Poki builds
- **Rewarded ads** (if ever turned on) must stay optional. Poki's rule: "Rewarded videos are an optional extra, never a gate." CrazyGames' midcore guide suggests capped daily rewarded chests (for example one every few hours, at most about 5 ads per day, with diminishing rewards) and warns against currency inflation. Whether an ad watch that yields a *random* chest counts as a monetized loot box in BE or NL is untested. The conservative choice is rewarded ads that give fixed rewards only, such as double gold or trophies.
- **Violence.** The theme is fine (War of Sticks and Stick War are top Poki titles), but no blood. Units should poof into dust, sparks or coins, and knockouts should be cartoon-style.
- **Future multiplayer.** Clash Royale-style emotes only, with no text chat.
- **No login walls.** Give players an auto-generated profile. Progress goes to localStorage plus the platform cloud-save adapter.

## 4. Metrics: what "good" looks like

| Metric | Benchmark |
|---|---|
| Poki conversion to play | Target 65%+; the average Poki game gets about 70% |
| Poki average playtime | Player Fit pass: >3 min average and ≥25% of plays over 3 min. Successful games: 5+ min (10+ for management/sim). The average game: 6+ min. |
| Poki session length | 24 min reported for 2025; highly engaged players average 11–20 min sessions |
| CrazyGames Basic Launch | ≥7 days and ≥500 plays (ends automatically at 21 days). Targets: 10+ min average playtime, D1 10–15%, 80%+ of players past 1 minute. |
| CrazyGames genre averages | Strategy 17 min / D1 7.5%; action 13 min / 8.1%; platform D1 average 6.7%. Top strategy games average 21 ad impressions per play, 14 of them rewarded. |
| Mobile (for the later Capacitor app, GameAnalytics 2025) | D1 median 13–14%, top quartile 26–28%. D7 median 3.4–3.9%, top quartile 7–8%. Session median 5–6 min, top quartile 8–9 min. Midcore games get 6–7 sessions per day. |

**The Poki funnel:**
1. Upload.
2. Playtest: 10 recorded real-player videos, often within minutes.
3. Player Fit: 500 players, about 5 hours, up to 2 per day.
4. Web Fit: real category page, about 7 days, measures CTR and conversion to play.
5. Final review: 1–2 weeks.

One developer used these tools to raise average session length from 3:49 to 7:05 in under 4 days. **This loop is our cheapest source of real-player data before anyone else sees the game.**

## 5. What gets featured

- **Poki** hand-picks about one game per day (227 in 2025). It looks for originality or a clear twist in crowded genres, quality (no bugs, small load, consistent art), web-first design, cross-device support, all-ages content, and responsive developers. Hits named for 2025 include Plonky, SnapStyle Dress Up, Drive Mad, Level Devil and Retro Bowl. According to PocketGamer, what struggles is long onboarding, big downloads and mandatory accounts.
- **CrazyGames** puts new games in the homepage carousel with an initial boost. After that, ranking is algorithmic on playtime, retention and conversion, personalized by device and country. The mobile homepage requires an initial download of 20 MB or less. Common rejection reasons are clones, reskins, prototype-like builds and technical problems. The quality guidelines ask for games that are easy to extend with new content and have a consistent visual style. Our data-driven, swappable art pipeline matches this.

## 6. The genre on portals today, and what Age of War players said

**Incumbents and competitors:**

| Game | Developer | Platform | Numbers | Notes |
|---|---|---|---|---|
| War of Sticks | Shoom Games | Poki | #1 strategy, 4.6/5 from 945k votes | Miners, 6 unit types, tower upgrades |
| Stickman Kingdom Clash | GameGULF, Dec 2024 | Poki | 4.3/5 from 196k votes | Special abilities, a campaign and an "almost unlimited" skin customizer. Evidence that cosmetics work on lane battlers. |
| Age of War | Max Games | Poki | 4.5/5 from 78.5k votes | |
| Age of War | Louissi | CrazyGames | 9.3/10 | |
| Age of War | Louissi | Armor Games | 10.2M plays, 94/100 | |
| Age of War 2 | Louissi | Armor Games | 4.29M plays, 94/100 | |
| TimeWarriors | HG POINT, Dec 2024 | CrazyGames | 8.9/10, top-10 tower defense | Era-evolution game with a food-based spawn economy; landscape and portrait. Our closest direct competitor. |
| The Era of Empires Clash | n/a | Google Play | n/a | Age-evolution war game, "from stone clubs to modern warfare" |

**What Age of War players loved:**
- advancing through the ages
- turrets
- the special attack
- short, intuitive matches that turned into "one more game"
- the WaterFlame soundtrack "Glorious Morning", which is a large part of the nostalgia (we need our *own* memorable theme)

**What they complained about** (Kongregate comments, JayIsGames review and comments, Armor Games threads):
- The late game turns into turret camping. Ion cannons and super soldiers trivialize it.
- The winning strategy is often to wait or go AFK.
- Units queued behind the front unit stand idle and do nothing.
- The game is repetitive and too long; hard modes can run 40 minutes to 3+ hours.
- Medium in AoW2 felt far too hard.
- The AI economy felt unfair.
- Many disliked that the AoW2 special attack cost XP.

**Design responses:**
- Ranged units fire over allies, and melee units can flank or queue up.
- Target match length of 4–7 minutes, with an escalating overtime after a time limit (rising income and base damage, then sudden death) to prevent stalls.
- Cap turret slots, with anti-turret counters.
- Specials run on a cooldown or a separate meter, never on XP.
- Bots play by the same economy rules, are clearly labeled as bots, and difficulty is tied to trophies.

## 7. Successful indie strategy web games and why they worked

| Game | Why it worked |
|---|---|
| **Age of War** (Louissi, 2007) | The evolution mechanic gave a campaign-like arc inside one match. Short matches, instant play. |
| **Kingdom Rush** (Ironhide, 2011) | Free Flash release on Armor Games (97% from 133k votes), then iPad (Dec 2011), Android and Steam. The web version worked as a funnel to a premium franchise. That is our web-to-Capacitor path. |
| **Stick War** (Max Games) | Flash series that became *Stick War: Legacy*, 100M+ Google Play downloads, with weekly missions, tournament vs AI, and extra modes. The lane-battler IP scaled from web to mobile. |
| **Territorial.io** (solo developer David Tschacher, 2020) | Browser + mobile, 1M+ app downloads, skill-based with no pay-to-win. Simple rules with deep strategy. |
| **Tower Swap** (Curtastic) | Match-3 × tower defense mashup, now #2 in CrazyGames strategy and on Google Play. The originality twist in a familiar genre is exactly what portals ask for. |
| **The Battle Cats** (PONOS, 2012) | Lane battler with capsule gacha and unit evolution to "True Forms". Proves collection plus lane battle retains players for a decade. |
| **Rush Royale** (My.Games, 2020) | Tower defense combined with a card deck and PvP. The deck and collection meta works on a tower defense core. |

**The common thread:** instant play, one readable core loop, a strong progression arc, and a collection or upgrade meta layered on top.

## 8. Actionable v1 implications

- **One click to gameplay.** The first match is the tutorial, a Stone Age match against a labeled bot, with the first unit spawned within about 5 seconds. Text-light: CrazyGames asks for visuals over text, and PressKit.gg warns that text-heavy strategy games do badly on TikTok.
- **First evolution by about minute 2–3 of match 1.** First chest right after match 1, with a guaranteed rare or better. Deck building unlocks after about match 2–3.
- **Session design:** three or more matches plus meta comes to 15–20 minutes, which matches the CrazyGames strategy average of 17 minutes.
- **D1 hooks:**
  - a free chest on a timer (for example ready in 4 hours or the next day)
  - daily quests
  - a login streak
  - a trophy road with visible upcoming rewards
- **Fairness and trust:** show odds, a pity timer and shard conversion. Keep upgrades bounded so skill matters, following Territorial.io's no-pay-to-win reputation.
- **Visual readability:** at DPR 1 on a phone, units must be identifiable by silhouette and color. CrazyGames requires text to be legible at DPR 1.
- **Localization:** set up the string table from day one (EN required, DA second).

## 9. Short-form video: what the game should make easy to capture

**Platform facts:**
- Hook in the first 0.5–3 seconds, clips under 60 seconds. There is no time for logos or slow builds.
- Low-production, authentic clips beat polished ads. Grace Curtis (GDC talk) says polished content gets tuned out, and bug clips, before/after comparisons and satisfying loops perform well.
- Organic TikTok reach dropped sharply in 2025. In CloutBoost's campaign data, 85–90% of creators got higher organic reach on Reels and Shorts, so post everywhere.
- Cadence: 2–3 posts per week is sustainable, 3–5 is ideal. TikTok now limits posts to 5 hashtags.
- Surprising outcomes and strong visual hooks perform best.
- Nostalgia is proven: TikToks about Age of War got 64.3k and 162.3k likes (the latter with 3.4k comments). A hook like "that Flash game where you evolved from cavemen to lasers, rebuilt" will land. Do **not** use the "Age of War" name in our title, tags or store keywords.

**Moments to engineer as clip bait:**
1. **Age evolution (signature moment).** 2–3 seconds: brief freeze, flash, the base morphs, *every unit on the field transforms*, an age title card and a music key change. Also offer an automatic "Stone to Space in 30 s" montage built from the replay of a full match.
2. **Legendary pull.** Tiered anticipation, like FIFA's flare hierarchy where more flames means a better card. Chest shake intensity and beam color hint at rarity. Commons resolve quickly; a legendary gets a unique 3–5 second reveal and a signature pose. Put a share/record button on the reveal screen. Keep outcomes honest.
3. **Huge battles.** Support 150+ units at 60 fps using pooling and batched vector sprites. Area specials such as a meteor rain or orbital laser should sweep the screen.
4. **"Who wins?" sandbox.** For example 100 cavemen vs 1 mech. TABS and UEBS went viral on YouTube from exactly this mix of scale and comedy (CBR calls it "YouTuber bait"). It is cheap to build on the same simulation.
5. **Anachronism upsets.** A club-wielding caveman taking down a tank is inherently funny and surprising.
6. **Comebacks and clutch plays.** When the base drops below 10% HP: "last stand" music, a slow-motion special, a COMEBACK banner. Detect these automatically from HP-swing metrics.
7. **Satisfying loops:** chain-kill counters, a gold fountain, turret barrages, cartoon knock-back.
8. **Art-upgrade devlogs.** The procedural-to-new-art swap is itself before/after content, best shown with hard cuts.

**Tooling to build into v1** (this also serves the owner's one-click approval workflow):
- Deterministic simulation: seeded RNG, fixed timestep, input log. Replays can be re-rendered at any aspect ratio or speed, and the same logs later power ghost opponents and server validation.
- Clip Mode: a 9:16 framing camera that follows the action, a big-UI or no-UI toggle, and 1080×1920 render.
- Capture via `canvas.captureStream` + `MediaRecorder` into a rolling buffer of the last 20–30 seconds.
- Automatic highlight triggers (evolution, legendary pull, comeback, multi-kill) that save a clip together with suggested captions.
- A small in-game watermark.
- Our own synthesized music only, so clips never get muted or claimed.

## 10. Name proposals (quick availability checks)

"Clear" means no game found in web search plus Steam and Google Play store searches (some itch.io and Google Play results were truncated). No trademark or domain check has been done yet; run TMview (EUIPO/USPTO) and domain checks before committing.

| # | Name | Rationale | Check result |
|---|---|---|---|
| 1 | **Ageborn** | Short and ownable; "Age" signals the genre without copying anything | Steam 0 results; Google Play no match; web only shows an unrelated GitHub account "ageborn-dev". **Clear.** |
| 2 | **Mammoths to Mechs** | Alliterative and describes the whole arc; a ready-made TikTok hook | Steam 0; Google Play no match; web none. **Clear.** Descriptive, so possibly weaker as a trademark. |
| 3 | **Aeonfront** | "Aeon" plus front line; sounds premium | Steam 0; Google Play "No results"; web only a Malaysian homestay and a 2014 YouTube intro. **Clear.** |
| 4 | **Epochfront** | Same idea as #3 | Steam 0; Google Play none; a spammy news site uses the string. Clear for games, but the "Epoch" space is crowded (Last Epoch, EPOCH). |
| 5 | **Spears to Starships** | Arc name, alliterative | Steam 0; web none. **Clear.** |
| 6 | **Timeline Titans** | Collectible "titans" across eras | No exact match on web or Steam; only partial matches (Deathmarch Titans, Grand Theft Timeline). Clear. |
| 7 | **Aeon Siege** | Base-siege focus | Steam: only an unrelated Pathfinder DLC; web none. Clear. |
| 8 | **Epoch Brawl** | Energetic, PvP feel | Steam 0 exact; Google Play no exact. "Brawl" invites association with Brawl Stars (Supercell). **Moderate risk.** |

**Rejected as taken or too close:**
- Epoch Clash: an itch.io alpha from Sept 2025, plus an AutoArcade strategy game.
- Stone to Stars: a Steam colony sim by Sunbox Games.
- Era Clash / EraClash: EraClash Basketball, and "The Era of Empires Clash" on Google Play.
- Eons at War: too close to Eons of War on Steam.
- ChronoLanes: chronolanes.com is an art-history timeline site.
- Tribes to Titans: too close to TITANS: Dawn of Tribes.
- Era Rush: generic, and invites association with Rush Royale.

---

## Sources

**Poki**
- [Poki Requirements](https://developers.poki.com/guide/requirements-quality)
- [Poki: Choosing your web game engine (5 MB / 8 MB, engine sizes)](https://developers.poki.com/guide/web-engine)
- [Poki: Working with Poki (exclusivity, revenue)](https://developers.poki.com/guide/working-with-poki)
- [Poki: How testing works](https://developers.poki.com/guide/how-testing-works)
- [Poki: Player Fit test](https://developers.poki.com/guide/player-fit-test)
- [Poki: Content & player safety](https://developers.poki.com/guide/content-player-safety)
- [Poki: SDK overview](https://developers.poki.com/guide/sdk-overview)
- [Poki: 2025 year in review](https://poki.com/blog/2025-at-poki-a-year-in-review)
- [PocketGamer.biz: Inside Poki's vision](https://www.pocketgamer.biz/inside-pokis-vision-for-the-future-of-browser-gaming/)
- [Mobidictum: Poki co-founder interview](https://mobidictum.com/pokis-web-gaming-interview-michiel-van-amerongen/)
- [EU-Startups: Poki (24-min sessions, one game per day)](https://www.eu-startups.com/2026/04/how-amsterdam-based-poki-is-becoming-one-of-the-best-launchpads-for-indie-game-developers-in-europe-sponsored/)
- [X post summarizing Poki requirements](https://x.com/autonom_games/status/2069642887164510699)

**CrazyGames**
- [CrazyGames Technical requirements](https://docs.crazygames.com/requirements/technical/)
- [CrazyGames Gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
- [CrazyGames Quality guidelines](https://docs.crazygames.com/requirements/quality/)
- [CrazyGames Launch intro](https://docs.crazygames.com/requirements/intro/)
- [CrazyGames FAQ](https://docs.crazygames.com/faq/)
- [CrazyGames Basic Launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/)
- [CrazyGames Midcore/Idle monetization (strategy 17 min / D1 7.5%)](https://docs.crazygames.com/resources/monetizing-midcore-idle/)
- [CrazyGames Action monetization (platform D1 6.7%)](https://docs.crazygames.com/resources/monetizing-action/)
- [CrazyGames Rewarded ads deep dive](https://docs.crazygames.com/resources/rewarded-ads-deep-dive/)
- [CrazyGames Getting to the first frame](https://docs.crazygames.com/resources/getting-to-the-first-frame/)
- [CrazyGames In-game purchases and loot box rules](https://docs.crazygames.com/sdk/in-game-purchases/)
- [CrazyGames Data module](https://docs.crazygames.com/sdk/data/)
- [Cinevva CrazyGames guide (secondary; revenue share, MAU)](https://app.cinevva.com/guides/publish-game-crazygames)

**Y8 and itch.io**
- [Y8 Developer Portal](https://developer.y8.com/)
- [itch.io HTML5 file limits thread](https://itch.io/t/3964421/1000-files-limit-on-browsergame)
- [itch.io top HTML5 strategy games](https://itch.io/games/html5/genre-strategy)

**Genre and competitors**
- [Poki strategy category](https://poki.com/en/strategy)
- [War of Sticks on Poki](https://poki.com/en/g/war-of-sticks)
- [Stickman Kingdom Clash on Poki](https://poki.com/en/g/stickman-kingdom-clash)
- [Age of War on Poki](https://poki.com/en/g/age-of-war)
- [CrazyGames strategy category](https://www.crazygames.com/c/strategy)
- [CrazyGames tower defense tag](https://www.crazygames.com/t/tower-defense)
- [TimeWarriors on CrazyGames](https://www.crazygames.com/game/timewarriors)
- [Age of War on CrazyGames](https://www.crazygames.com/game/age-of-war)
- [Age of War on Armor Games](https://armorgames.com/play/616/age-of-war)
- [Age of War 2 on Armor Games](https://armorgames.com/play/5933/age-of-war-2)
- [Kongregate Age of War comments](https://www.kongregate.com/games/louissi/age-of-war/comments?pdis=q5q-b&sort=best&srid=4382709)
- [JayIsGames Age of War 2 review](https://jayisgames.com/review/age-of-war-2.php)
- [Flash Gaming Wiki: Age of War](https://flashgaming.fandom.com/wiki/Age_of_War)
- [Kingdom Rush (Wikipedia)](https://en.wikipedia.org/wiki/Kingdom_Rush)
- [Stick War: Legacy on Google Play](https://play.google.com/store/apps/details?id=com.maxgames.stickwarlegacy)
- [Territorial.io history](https://territorial.fandom.com/wiki/Territorial.io)
- [The Battle Cats (Wikipedia)](https://en.wikipedia.org/wiki/The_Battle_Cats)
- [Rush Royale (Wikipedia)](https://en.wikipedia.org/wiki/Rush_Royale)
- [The Era of Empires Clash on Google Play](https://play.google.com/store/apps/details?id=com.sd.eimpresclash)
- [GameAnalytics 2025 benchmarks (via GameDev Reports)](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)

**Short-form video and reveal design**
- [CloutBoost: TikTok game marketing 2026](https://www.cloutboost.com/blog/tiktoks-changing-landscape-for-game-marketing-in-2026-what-developers-need-to-know)
- [PressKit.gg TikTok field guide](https://presskit.gg/field-guides/tiktok-indie-game-marketing)
- [Game Developer: 6 TikTok tips (GDC)](https://www.gamedeveloper.com/marketing/6-tips-for-finding-your-voice-on-tiktok-and-making-your-game-go-viral)
- [Acorn Games TikTok guide 2025](https://acorngames.gg/blog/2025/8/10/the-indie-devs-guide-to-mastering-tiktok-in-2025)
- [TikTok: Age of War gameplay discover page](https://www.tiktok.com/discover/age-of-war-gameplay)
- [CBR: What happened to battle simulators](https://www.cbr.com/battle-simulator-game-genre-what-happened/)
- [Dexerto: FIFA pack animation tiers](https://www.dexerto.com/fifa/fifa-22-pack-animations-for-boards-walkouts-explained-1661730/)
- [UK Gov: Rapid evidence review of skins gambling](https://www.gov.uk/government/publications/a-rapid-evidence-review-of-skins-gambling/a-rapid-evidence-review-of-skins-gambling)

**Name checks**
- [Epoch Clash on itch.io](https://onegear.itch.io/epoch-clash/devlog/1024428/alpha-version)
- [Stone to Stars on Steam](https://store.steampowered.com/app/4997110/Stone_to_Stars/)
- [EraClash Basketball](https://www.eraclashbasketball.com/)
- [Eons of War on Steam](https://steamcommunity.com/app/947460)
- [ChronoLanes](https://chronolanes.com/en/art/)
- [TITANS: Dawn of Tribes](https://steamcommunity.com/app/467570)
- Steam store searches for ageborn, aeonfront, epochfront, mammoths to mechs, spears to starships, epoch brawl, timeline titans, aeon siege and era rush (via store.steampowered.com/search).

**Research limits:** the session's web-search budget ran out partway through the name checks, so the last checks used Steam and Google Play store searches instead. The CrazyGames revenue-share and MAU figures come from a secondary source (Cinevva), not from CrazyGames' own docs.
