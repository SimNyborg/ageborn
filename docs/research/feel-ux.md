# Feel & UX research report: juice, readability, onboarding, pacing, comebacks and bots for a lane-war game

## 0. Top recommendations

1. **Keep the simulation and the presentation apart.** The sim emits events (`UnitHit`, `UnitDied`, `BaseDamaged`, `AgeUp`, `SpecialCast`, `GoldEarned`). A separate "feel layer" reacts to those events with hitstop, shake, particles, sound and numbers. Every tunable goes in one `feel.json`, with an in-game debug slider panel. This is what lets us swap the art later without touching gameplay, and it keeps the sim deterministic so an authoritative server can run it later.
2. **Three feedback channels matter most for impact:** hitstop, audio synced to the visual frame, and camera response. A study of Steam action-game reviews found that missing any one of these "may ruin" the sense of impact ([Impact Feel study](https://arxiv.org/abs/2208.06155)).
3. **Hitstop must be local on a crowded lane.** Freeze only the attacker and victim for normal hits (50–80 ms). Use a global freeze (100–150 ms) only for rare big moments: a base hit by a special, a heavy unit dying, or an age-up.
4. **Screen shake should use the trauma model.** Trauma runs from 0 to 1, shake = trauma² (or ³), it decays linearly, the noise is Perlin rather than random, and in 2D it combines translation and rotation. Add a reduce-motion toggle.
5. **Readability comes first:** distinct silhouettes, blue vs orange teams (colorblind-safe) plus a redundant non-color cue, and "clarity parity" for skins so a skin never changes a unit's silhouette or team marker.
6. **Get the player into a match in under 60 seconds, with a working first frame in about 3 seconds.** The first match has no timer and should be nearly unlosable. Introduce one mechanic per match. Keep on-screen text to about 8 words at a time.
7. **Target 5–8 minutes per 1v1 match, with a hard escalation to about 10 minutes.** Stalemates and 40-minute games were the biggest pacing complaint about the original genre.
8. **Allow limited snowballing and use visible, counterable comeback tools:** defense XP, an underdog bounty and a one-time "last stand" at the base. Never hide rubber-banding on the AI in ranked play.
9. **Bots must be clearly labelled and follow the same rules as the player:** same economy, same information. Make them feel human through reaction delays, deliberate "intelligent mistakes", personalities and telegraphed intent. Adapt difficulty between matches, not during them.

---

## 1. Foundations: what "game feel" and "juice" mean

- **Swink's definition:** game feel is "real-time control of virtual objects in a simulated space, with interactions emphasised by polish". Real-time means the game responds within a correction cycle of under 100 ms ([Swink via Wikipedia/overview](https://en.wikipedia.org/wiki/Game_feel)). In our game the player does not steer units directly. So the "control" is the spawn and ability buttons, and everything after the press is amplification.
- **Pichlmair & Johansen's survey** splits game-feel design into three domains: physicality, amplification and support. "Juicing" is the polishing of amplification ([Designing Game Feel: A Survey](https://arxiv.org/pdf/2011.09201)).
- **"Juice it or lose it"** (Jonasson & Purho, GDC Europe 2012) takes a dull Breakout clone and adds squash, particles, trails and sound until it feels alive: "tons of cascading action and response for minimal user input" ([GDC Vault](https://www.gdcvault.com/play/1016487/juice-it-or-lose), [YouTube](https://www.youtube.com/watch?v=Fy0aCDmgnxg)).
- **"The Art of Screenshake"** (Nijman, Vlambeer, 2013) makes 30 tweaks to a dull shooter ([summary](http://artificials.ch/juice-up-your-game/), [video](https://www.youtube.com/watch?v=AJdEqssNZ-U)). The tweaks that transfer directly to a lane game:
  - lower enemy HP and a faster rate of fire, so things die sooner
  - bigger and faster projectiles
  - muzzle flash on the first frame
  - impact effects
  - a white flash when a unit is hit
  - knockback
  - permanence: corpses, shell casings and dust stay visible
  - camera lerp
  - screen shake
  - "sleep", a 20 ms freeze on significant hits
  - more bass
  - random explosions (for example, a 33% chance an enemy explodes)
  - "meaning", meaning a clear win/lose state
- **Caveats:**
  - Hicks et al. (CHI PLAY 2019, 40 + 32 participants) found that visual embellishments reliably raise visual appeal but improve perceived competence only in some circumstances ([paper](https://dl.acm.org/doi/10.1145/3311350.3347171)).
  - Folmer Kelly argues that over-juicing costs immersion ([Game Developer](https://www.gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-)).
  - Riot's rule: "if your FX feel long, they're waaaaay too long" ([VFX guide tips](https://www.vfxapprentice.com/blog/10-league-of-legends-vfx-design-tips)).
  - Conclusion: juice must never hide game state. Tie its intensity to how much the event matters.

## 2. The juice toolkit, with numbers

### Hitstop (hit-freeze)
- **Capcom beat 'em ups** ([Sicienski](https://shane-sicienski.com/blog/blog-post-title-one-55pmn)):
  - Final Fight uses a uniform 6 frames.
  - Knights of the Round uses 6 frames on the ground and 7 in the air.
  - Warriors of Fate uses 4–5 frames for jabs and 2 frames per impact on a super.
  - The Punisher is asymmetric: the attacker freezes 6–9 frames and the defender 8–11.
  - Final Fight also shakes the sprite during the freeze.
- **Street Fighter 2** freezes both characters for about 10 frames. **Smash** vibrates characters during hitstop ([CritPoints](https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/)).
- **Indie reference:** 0.05 s (3 frames) for normal hits, 0.15 s for heavy finishers, and a 0.1 s white flash on damage ([Paragraph devlog](https://paragraph.com/@repokuaaa/finding-the-weight-how-i-built-a-tactile-combat-system)).
- **For our game:**
  - Per-unit hitstop of 40–80 ms, scaled by damage relative to the victim's max HP, with the victim frozen slightly longer than the attacker.
  - A 1–2 px sprite jitter during the freeze.
  - Global hitstop only for a heavy-unit death (about 80 ms), a special landing (about 120 ms) or base destruction (about 250 ms plus slow-motion).
  - Rate-limit global freezes to at most one per roughly 0.5 s.
  - Freeze the sim clock, not the render loop, so particles and UI can keep animating if we choose.

### Screen shake (trauma model)
- **Eiserloh (GDC 2016)** ([transcript](https://archive.org/stream/GDC2016Eiserloh/GDC2016-Eiserloh_djvu.txt), [slides](http://www.mathforgameprogrammers.com/gdc2016/GDC2016_Eiserloh_Squirrel_JuicingYourCameras.pdf)):
  - Events add trauma in the range 0–1, and trauma decays linearly.
  - Shake = trauma² or trauma³. At trauma .30/.60/.90 that gives 3%/22%/73% shake with the cube.
  - In 2D, translation plus rotation is "awesome" and rotation alone is "lame".
  - Use Perlin noise rather than random values. It feels smoother, respects pause and slow-motion, and replays reproducibly.
  - For smooth camera follow, use `x += (target - x) * k` with k between 0.01 and 0.5, scaled by dt.
- **Bevy's reference constants** ([Bevy example](https://bevy.org/examples/camera/2d-screen-shake/)): decay 0.5/s, max rotation 10°, max offset 20 px, noise speed 20, exponent 2, and separate noise seeds for x, y and rotation.
- **For our game:**
  - Max offset about 12 px and max rotation about 2–3°, because this is a wide lane view on phones.
  - Unit hit: +0.05. Unit death: +0.1. Base hit: +0.2. Special: +0.5. Base destroyed: 1.0.
  - Add a small directional kick along the attack vector.
  - Offer a "Reduce screen shake" setting from day one.

### Flash, squash & stretch, anticipation
- **Clash Royale** flashes units brighter when they take damage ([Górnicki UX](https://gornicki.me/blog/Bd87/ux-in-clash-royale-part-3)). Use a 60–100 ms white or additive tint.
- **Squash & stretch must preserve volume** ([Wikipedia](https://en.wikipedia.org/wiki/Squash_and_stretch)): `scaleX = 1/scaleY`. Where to use it:
  - spawn pop: 0 → 1.15 → 1 over about 180 ms with ease-out-back
  - landing and footfall bob
  - a wind-up before melee hits
  - turret recoil
- **Riot's timing rule** ([VFX tips](https://www.vfxapprentice.com/blog/10-league-of-legends-vfx-design-tips)): lead with anticipation, deliver the impact, then leave time to process. A longer wind-up and a short recovery feel "snappy".

### Death, permanence, reward
- A death should be the juiciest moment for a unit. Options:
  - a ragdoll-lite fling along the knockback vector
  - a dissolve or pop into particles
  - an occasional explosion (Nijman's 33% trick)
  - a coin "+X" that flies to the gold counter, whose number ticks up
- Corpses and debris decals should persist for 5–10 s and then fade (permanence), with a cap on live decals.
- Remember an old Kongregate complaint about Age of War: after a long game the player got only a bare victory message. Victory and defeat screens should stage the rewards: XP bar fill, a chest drop, a stats recap.

### Damage numbers
- **In a crowded lane**, normal-hit numbers become noise. Show numbers only for:
  - crits
  - specials
  - base damage
  - the player's own turret kills
- Offer a toggle for "all numbers".
- If numbers are shown, spread them 20–40 px apart to avoid stacking. Make crits 150–200% size with a pop-scale. Colour-code by type ([GameJuice](https://www.gamejuice.co.uk/articles/damage-numbers-satisfying-feedback)).

### Particles
- One-shot bursts: dust at spawn, sparks on hit, gibs or shards on death, shockwave rings on specials.
- Pool every particle and set a global budget, for example 600 live particles on mobile. When over budget, drop the lowest-priority emitters first.

## 3. Sound

- **Sound coherence is one of the three features that decide impact feel** ([Impact Feel study](https://arxiv.org/abs/2208.06155)). Audio and visuals must land on the same frame. Schedule WebAudio against `audioContext.currentTime` and fire the sound on the impact event, not on the animation start.
- **Avoid the "machine-gun effect"** ([SFX Engine](https://sfxengine.com/blog/sound-for-games), [A Sound Effect](https://www.asoundeffect.com/game-audio-immersion/)):
  - 3–5 variations per frequent sound
  - pitch ±10%
  - volume ±3 dB
  - layered impacts: transient plus body plus tail
- **Procedural sound for v1:** ZzFX is under 1 KB, has 20 parameters, is MIT-licensed, has a built-in randomness parameter and supports precaching. ZzFXM does music ([ZzFX](https://github.com/KilledByAPixel/ZzFX), [ZzFXM](https://keithclark.co.uk/articles/zzfxm/)). Units reference sound **IDs** in their data, so swapping to recorded samples later is a data change.
- **Crowd control** (my engineering recommendation):
  - At most N concurrent voices per sound ID (for example 4).
  - A minimum retrigger gap of 30–50 ms.
  - Prioritise sounds near the camera and events the player caused.
  - Duck music by about 6 dB during specials and age-ups.
- **Music is a major nostalgia driver for Age of War.** Give each age its own theme. Player complaint: the "sound" option only muted music ([Flash Museum/Play reviews](https://flashmuseum.org/age-of-war/)). Provide separate Music, SFX and UI sliders.

## 4. Readability on a crowded lane

- **Silhouette first** ([Riot Clarity](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)):
  - Each unit has a primary feature that never changes across skins.
  - Size signals role: big and armoured means tank.
  - The weapon signals range: a bow means ranged.
  - Facing direction must be obvious.
- **Visual magnitude should match gameplay impact.** Keep values mid-range. Moderate saturation draws focus. Use one dominant colour per effect ([VFX tips](https://www.vfxapprentice.com/blog/10-league-of-legends-vfx-design-tips)).
- **"Clarity parity" for skins:** a skin may never change a unit's primary silhouette feature or give a gameplay advantage. This is critical because our skins come from cases.
- **Clash Royale's approach** ([Rookies](https://www.therookies.co/blog/education/game-design-ux-best-practices-detailed-breakdown-of-clash-royale), [Górnicki](https://gornicki.me/blog/Bd87/ux-in-clash-royale-part-3)): strong contrast, bright colours and distinct silhouettes for phone screens. It also sets a UI colour hierarchy:
  - yellow for primary actions
  - green for secondary actions
  - red for warnings
  - blue for background
- **Team colours:** 8–10% of men have red-green colour vision deficiency. Use **blue vs orange** and add a value difference (light blue vs dark orange). Never convey team by colour alone ([Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/)). Redundant cues:
  - facing direction
  - team-coloured ground ring or banner
  - base side
  - the health-bar colour
- **Lane layout:**
  - Give units 3–5 px of y-offset "sub-lanes" and sort by y, so stacked units stay visible.
  - Keep the background desaturated and low-contrast.
  - Draw projectiles with a bright core and a team-tinted trail.
- **Health bars:**
  - Show them only once a unit is damaged.
  - Use team colours.
  - Add a trailing "ghost" segment that drains about 300 ms after the real bar (common fighting-game pattern), so chip damage is readable.

## 5. UI feedback

- **Spawn buttons:**
  - The pressed state must appear in under 100 ms.
  - Show a radial cooldown fill and a glow when affordable (Clash Royale glows its elixir bar when full).
  - Unaffordable press: a red flash, a 2-frame shake and a soft "denied" sound.
  - Show the unit queue as icons.
- **Warnings:**
  - Low base HP: a red vignette pulse, like Clash Royale's red frame when time runs out.
  - Overtime: a colour shift of the frame.
- **The age-up must be the biggest regular moment:** a flash, a fanfare, a morph of the base and a banner. But do **not** copy Age of War's flashing upgrade reminder, which players called obnoxious and eye-straining. Use a steady glow on the Evolve button instead.
- **Reward reveals (cases):**
  - Build anticipation with shaking, charging and a rarity-coloured light leak before the reveal. A rarity flare is honest anticipation, like FIFA's walkout.
  - Use a consistent rarity colour language. For reference, CS:GO's rates are blue 79.92%, purple 15.98%, pink 3.2%, red 0.64% and gold 0.26% ([Exitlag](https://www.exitlag.com/blog/csgo-cases/)).
  - Offer slow and fast opening modes, as Clash Royale does.
  - **Do not fake near-misses.** A reel that deliberately stops just past a legendary is a slot-machine technique ([esports.net](https://www.esports.net/news/counter-strike/case-opening-psychology/)). Even without real money, it hurts trust and store/regulatory standing.
  - Show drop odds.

## 6. Onboarding / first-time user experience

- **Load speed decides everything in the browser.** On Poki, Stickman Hook at 40 MB had a median load of 29.5 s and 50% of clickers started playing. At 6 MB the median load was 3.7 s and 72% started playing ([Poki](https://poki.com/blog/what-makes-high-quality-browser-game)). CrazyGames measures time to *gameplay start*: load tutorial assets first and stream the rest in while the tutorial plays ([CrazyGames](https://docs.crazygames.com/resources/getting-to-the-first-frame/)). Procedural art gives us an advantage here: aim for a JS bundle under about 2 MB.
- **First-session targets** ([Playio](https://blog.playio.co/mobile-game-onboarding-retention), [Segwise](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies)):
  - core gameplay within 60 s
  - the "aha" moment by about 90 s
  - no more than 2 tour steps
  - account and profile creation deferred until after the first play
  - D1 retention benchmark about 27% overall and 25.39% for strategy
  - measure drop-off at each tutorial step
- **Clash Royale:**
  - The first battle has **no time limit** and a fixed 6-card deck.
  - The opponent is a named AI trainer.
  - Winning the tutorial gives a chest that completes the deck.
  - PvP is gated behind early AI wins ([Fandom](https://clashroyale.fandom.com/wiki/Training_Camp), [Rookies](https://www.therookies.co/blog/education/game-design-ux-best-practices-detailed-breakdown-of-clash-royale)).
- **George Fan (Plants vs. Zombies, a lane game)** ([notes](https://notes.hamatti.org/sources/talks/how-i-got-my-mom-to-play-through-plants-vs.-zombies)):
  - blend the tutorial into play
  - doing beats reading
  - introduce one new tool every few levels
  - no more than about 8 words on screen
  - use adaptive hints only when the player struggles, for example "Your peashooter died, plant further left"
  - teach through visual design
  - lean on existing knowledge
- **Hearthstone:** "immediate fun" and "little victories" ([80.lv](https://80.lv/articles/hearthstone-10-rules-of-great-design)).
- **Proposed FTUE:**
  1. Stone age, 2 units, no timer, against a "Training Dummy" bot that barely attacks. This match teaches spawning and gold.
  2. Unlocks the turret slot.
  3. Unlocks Evolve plus the special ability, as a short match through 2 ages.
  4. First case opening, with a guaranteed Rare.
  5. After about 5 matches, deck building and the profile name. Then the ladder against bots. 2v2 comes much later.
  - Adaptive hints fire on failure patterns, for example "Their turret shreds melee. Try the slinger."

## 7. Match length & pacing

- **Clash Royale** has 3:00 of regulation, with elixir doubling for the final phase. Overtime was 1 minute ([Deconstructor of Fun 2016](https://www.deconstructoroffun.com/blog//2016/02/clash-royale-next-billion-dollar-game.html)). It is now **2 minutes of sudden death with triple elixir in the final minute** ([Fandom Overtime](https://clashroyale.fandom.com/wiki/Overtime)). The change shows Supercell pushing toward decisive endings. Treat timer, resource rate and win condition as one pacing system.
- **Complaints about the original genre** ([JayIsGames AoW2](https://jayisgames.com/review/age-of-war-2.php), [App Store](https://apps.apple.com/us/app/age-of-war-2/id1194118663?see-all=reviews)):
  - hard mode taking about 40 minutes
  - enemy base HP rising with each age, which pushed players to rush
  - AI "stacking minions" at its base, which caused stalemates
  - "simple and repetitive" strategy
- **Mobile sessions:** the median game session is 3.1–3.5 minutes ([GameAnalytics](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks)). Strategy sessions average about 37.5 minutes, which means several matches ([Adjust via GameDev Reports](https://gamedevreports.substack.com/p/adjust-gaming-app-insights-report)).
- **Recommendation for 1v1 with 5 ages:**
  - Target 5–8 minutes, roughly 60–90 s per age.
  - At 6:00, "Overdrive": income ×2 and a louder, faster music layer.
  - At 8:00, "Sudden Siege": both bases lose armour steadily, or turrets decay.
  - Hard cap about 10 minutes, then a tiebreak on base HP percentage.
  - Later, add a 3–4 minute "Blitz" mode for mobile.
- **Pacing inside a match:** use L4D's director template ([Valve PDF](https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf)). Constant combat is fatiguing and long lulls are boring, so aim for spiky peaks and valleys. The Director works like this:
  - It estimates intensity from damage taken and nearby deaths, and lets it decay when there is no engagement.
  - Build Up runs until intensity peaks.
  - Sustain Peak lasts 3–5 s.
  - Peak Fade lets the current fight play out.
  - Relax lasts 30–45 s.
  - Boss events are not throttled.
  - For our game, apply this to bot wave timing in casual and PvE, never to stats.

## 8. Comebacks vs snowballing

- **Sirlin** ([Slippery Slope](https://www.sirlin.net/articles/slippery-slope-and-perpetual-comeback)): positive feedback ("slippery slope") decides games early and makes endgames boring. *Limited* slippery slope is good: it is capped and temporary. His rules:
  - give the trailing player real tactical tools
  - keep comeback mechanics predictable
  - avoid comebacks so strong that leading becomes undesirable
- **Mario Kart's blue shell** was designed so "everyone was in it until the end" (Hideki Konno). It is beloved and hated in equal measure, and hurts most right at the finish line. Later games added counters such as dodge timing and the Super Horn ([Wikipedia](https://en.wikipedia.org/wiki/Blue_shell)). Lesson: comeback tools need counterplay.
- **Tug-of-war already has a built-in brake:** reinforcements arrive faster near your own base, and turrets defend it. Clash Royale's defender advantage is noted as strong ([DoF](https://www.deconstructoroffun.com/blog//2016/02/clash-royale-next-billion-dollar-game.html)).
- **Concrete mechanics for our game:**
  1. **Defense XP:** earn XP from damage absorbed near your base, not only from kills.
  2. **Underdog bounty:** killing a unit from a *higher* age gives +50% gold and XP.
  3. **Age-gap cap:** being one age ahead is a real edge (+25–35% power), not an auto-win. Evolving costs a burst of gold, so it opens a vulnerability window.
  4. **Last Stand:** once per match, at 25% base HP, the base fires one visible, telegraphed volley. This is similar to Clash Royale's King Tower waking up.
  5. **Special-ability cooldowns** start on age-up, so a leader cannot chain specials.
  6. **No hidden stat rubber-banding in ranked play.** Wikipedia's DDA overview notes that obvious AI rubber-banding reads as implausible, and that players exploit it by sandbagging ([Wikipedia DDA](https://en.wikipedia.org/wiki/Dynamic_game_difficulty_balancing)).

## 9. Bots that feel human and fair

- **Disclose them.** Marvel Snap didn't say when players faced bots, and that bred paranoia and accusations of cheating: players believed bots read hands or knew random outcomes. Players spotted bots by generic names, default card backs, no emotes and instant snaps ([Kotaku](https://kotaku.com/marvel-snap-bots-rank-cheating-odin-hulk-easy-wins-1849710078)). Snap's bots use designer-built decks matched to collection level and MMR, keep queue times around 5 s, and inject rank currency ([MarvelSnapZone](https://marvelsnapzone.com/bots-in-marvel-snap-a-comprehensive-guide/)).
  - Our approach: an "AI" badge, named characters with portraits (like Clash Royale's named Training Camp trainers, tied to trophy bands), and bot wins worth reduced, marked trophies.
- **"Ghost" opponents** are a good bridge to real PvP. Upload each player's deck and behaviour profile and let others fight it asynchronously, as Backpack Battles and Super Auto Pets do with real players' builds ([Steam discussion](https://steamcommunity.com/app/2427700/discussions/0/3883851232929263899/)). Label it "Ghost of <player>".
- **Never cheat quietly.**
  - Age of War 2 players complained that the AI knew when they had no gold and fired its special then ([App Store](https://apps.apple.com/us/app/age-of-war-2/id1194118663?see-all=reviews)).
  - Age of War players asked how the AI kept affording troops ([Kongregate](https://www.kongregate.com/games/Louissi/age-of-war)).
  - StarCraft II names its cheating levels openly: "Cheater (Vision)" and "Cheater (Resources)" ([Liquipedia](https://liquipedia.net/starcraft2/Artificial_Intelligence)).
  - Rule: bots use the same economy and only information a human could see. If a PvE boss gets a bonus, show it ("+20% gold").
- **Humanlike behaviour:**
  - Reaction delay of 300–900 ms, randomised and scaled by tier. Typical human visual reaction time is about 250 ms, so never react faster than that.
  - A decision tick every 0.5–1.5 s and an action-rate cap.
  - Personalities: Rusher, Turtle, Greedy-Evolver, Turret-Spammer, Balanced.
  - Telegraphed intent: visible gold-saving before a big push, taunts.
  - Constant purposeful activity ([GDKeys](https://gdkeys.com/ai-keys-to-believable-enemies/)).
- **Intelligent mistakes** (Mick West): compute the best move, then *probabilistically* choose a plausible human-style error such as over-committing, evolving too early or misusing the special. Avoid "computer-like" stupidity, and remember that random luck in the bot's favour reads as cheating ([Game Developer](https://www.gamedeveloper.com/programming/intelligent-mistakes-how-to-incorporate-stupidity-into-your-ai-code)).
- **Difficulty scaling:**
  - Adapt *between* matches by choosing the bot tier from hidden MMR. Target about 70%+ win rate over the first 10 matches, then about 50–55%.
  - Hunicke notes that players feel "cheated" by noticed adjustments, and newer work finds players sense difficulty changes even when not told ([Hunicke 2005](https://dl.acm.org/doi/10.1145/1178477.1178573)).
  - Use fine-grained tiers (about 10). Age of War 2's "easy is way too easy, normal way too hard" gap is the anti-pattern.
  - Bots must always push purposefully, never turtle forever. The stalemate complaint above applies here.

## 10. Implementation checklist (swappable feel)
- `feel.json` covers hitstop ms per event, trauma per event, shake max offset and rotation, flash ms, particle presets, sound IDs with variation settings, and number rules. Bundle presets such as "Default", "Low-motion" and "Mobile-lite".
- An in-game tuning overlay with sliders; test with extreme values ([Paragraph](https://paragraph.com/@repokuaaa/finding-the-weight-how-i-built-a-tactile-combat-system)).
- A renderer interface (`drawUnit(unitDef, skinDef, pose, t)`) so procedural Canvas/SVG drawing can later be replaced by sprite sheets, Spine or shaders per unit.
- Accessibility toggles: reduce motion, colorblind presets, damage-number density, and separate volume sliders.

## Sources
- GDC Vault, Juice It or Lose It: https://www.gdcvault.com/play/1016487/juice-it-or-lose
- Nijman, Art of Screenshake (video): https://www.youtube.com/watch?v=AJdEqssNZ-U ; list of the 30 tricks: http://artificials.ch/juice-up-your-game/
- Eiserloh GDC 2016 transcript: https://archive.org/stream/GDC2016Eiserloh/GDC2016-Eiserloh_djvu.txt ; slides: http://www.mathforgameprogrammers.com/gdc2016/GDC2016_Eiserloh_Squirrel_JuicingYourCameras.pdf
- Bevy screen shake: https://bevy.org/examples/camera/2d-screen-shake/
- Impact Feel study: https://arxiv.org/abs/2208.06155
- Pichlmair & Johansen survey: https://arxiv.org/pdf/2011.09201
- Hicks et al., Juicy Game Design: https://dl.acm.org/doi/10.1145/3311350.3347171
- Kelly, against over-juicing: https://www.gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-
- Game feel (Swink): https://en.wikipedia.org/wiki/Game_feel
- Hitstop in Capcom beat 'em ups: https://shane-sicienski.com/blog/blog-post-title-one-55pmn
- CritPoints on hitstop: https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/
- Combat feel devlog: https://paragraph.com/@repokuaaa/finding-the-weight-how-i-built-a-tactile-combat-system
- Squash and stretch: https://en.wikipedia.org/wiki/Squash_and_stretch
- Damage numbers: https://www.gamejuice.co.uk/articles/damage-numbers-satisfying-feedback
- Sound variation: https://sfxengine.com/blog/sound-for-games ; https://www.asoundeffect.com/game-audio-immersion/
- ZzFX: https://github.com/KilledByAPixel/ZzFX ; ZzFXM: https://keithclark.co.uk/articles/zzfxm/
- Riot, Clarity in League: https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/ ; VFX tips: https://www.vfxapprentice.com/blog/10-league-of-legends-vfx-design-tips
- Game Accessibility Guidelines, colour: https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/
- Clash Royale UX: https://gornicki.me/blog/Bd87/ux-in-clash-royale-part-3 ; https://www.therookies.co/blog/education/game-design-ux-best-practices-detailed-breakdown-of-clash-royale
- Clash Royale Training Camp: https://clashroyale.fandom.com/wiki/Training_Camp ; Overtime: https://clashroyale.fandom.com/wiki/Overtime
- Deconstructor of Fun, Clash Royale: https://www.deconstructoroffun.com/blog//2016/02/clash-royale-next-billion-dollar-game.html
- Poki quality guide: https://poki.com/blog/what-makes-high-quality-browser-game
- CrazyGames loading guide: https://docs.crazygames.com/resources/getting-to-the-first-frame/
- Playio onboarding: https://blog.playio.co/mobile-game-onboarding-retention
- Segwise retention: https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies
- GameAnalytics 2025 benchmarks: https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks
- Adjust 2026 via GameDev Reports: https://gamedevreports.substack.com/p/adjust-gaming-app-insights-report
- George Fan PvZ talk notes: https://notes.hamatti.org/sources/talks/how-i-got-my-mom-to-play-through-plants-vs.-zombies
- Hearthstone design rules: https://80.lv/articles/hearthstone-10-rules-of-great-design
- Sirlin, Slippery Slope: https://www.sirlin.net/articles/slippery-slope-and-perpetual-comeback
- Blue shell: https://en.wikipedia.org/wiki/Blue_shell
- Dynamic difficulty balancing: https://en.wikipedia.org/wiki/Dynamic_game_difficulty_balancing
- Hunicke 2005: https://dl.acm.org/doi/10.1145/1178477.1178573
- L4D AI (Booth, Valve): https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf
- Kotaku, Marvel Snap bots: https://kotaku.com/marvel-snap-bots-rank-cheating-odin-hulk-easy-wins-1849710078
- MarvelSnapZone bots guide: https://marvelsnapzone.com/bots-in-marvel-snap-a-comprehensive-guide/
- Backpack Battles async PvP: https://steamcommunity.com/app/2427700/discussions/0/3883851232929263899/
- StarCraft II AI levels: https://liquipedia.net/starcraft2/Artificial_Intelligence
- Mick West, intelligent mistakes: https://www.gamedeveloper.com/programming/intelligent-mistakes-how-to-incorporate-stupidity-into-your-ai-code
- GDKeys, believable enemies: https://gdkeys.com/ai-keys-to-believable-enemies/
- Age of War 2 reviews: https://apps.apple.com/us/app/age-of-war-2/id1194118663?see-all=reviews ; https://jayisgames.com/review/age-of-war-2.php
- Age of War: https://www.kongregate.com/games/Louissi/age-of-war ; https://flashmuseum.org/age-of-war/
- CS:GO case odds: https://www.exitlag.com/blog/csgo-cases/ ; case-opening psychology: https://www.esports.net/news/counter-strike/case-opening-psychology/
