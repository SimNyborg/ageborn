# Ageborn UI master plan

Written 2026-09-28 for the owner's request: "You must make a clear, thorough plan for the interface. Right now it is rather confusing and not very intuitive or user-friendly. Research the principles of good user interface carefully, implement those principles and keep them in mind all the time. Consider carefully, for the whole game, making more satisfying animations."

This plan is the single reference for every screen, the HUD and all UI motion. DESIGN A9 and A18.9.5 point here. It is built on three inputs, which it does not repeat:

- `docs/research/ui-principles.md`: the principles with IDs (H1-H10 Nielsen, N1-N6 Norman, K1-K9 Hodent, G1-G7 Gestalt, F1-F4 and R1-R3 speed laws, P1-P4 disclosure, T1-T6 touch, A1-A8 accessibility, M1-M10 motion).
- `docs/research/ui-benchmarks.md`: what Clash Royale, Brawl Stars, Clash of Clans, Marvel Snap, Hearthstone, Kingdom Rush, Battle Cats and others do, ranked as "B-rank n".
- `docs/research/ui-audit.md`: the audit of the running build, issues UA-01 to UA-29.

How to use it:

- Part 1 is binding for every agent that touches `src/ui`, `src/app/ui`, `src/capsule`, the HUD or any visual moment. Read it before every UI task. Reviews tick its checklist.
- Parts 2-4 say what to build: structure, design system, screens.
- Part 5 says how everything moves and sounds.
- Part 6 says in which order, by whom, and how it is checked.
- Numbers are CSS px at the phone reference viewport **844 × 390** (landscape, touch, safe areas 47 px left and right, 21 px bottom; this is fullscreen or an installed app) and at the desktop reference **1280 × 720**, unless a row says otherwise. Every phone layout must also pass the **short** viewports **844 × 340** (iOS Safari in a normal tab, browser bars shown) and **800 × 360** (common Android, no notch); see the viewport policy in 3.1.
- The plan was reviewed by a senior mobile UX critique and a first-time-player critique; every point is resolved in the **Review resolution** section at the end, and the body below already contains the accepted changes.
- The binding rules in short form, for CLAUDE.md and agent prompts: `docs/ui-principles-short.md`.

---

## 0. Summary

The game has strong parts (the honest capsule climb, the power drag, class icons, the VS screen, AI labels). It feels confusing because Home has no single job (18 equal buttons, no War Path), several screens hide their main button below the fold on a phone, colours and buttons mean different things on different screens, the HUD text is 7-10 px, and the satisfying moments are missing or happen off-screen (UA-01 to UA-10).

The plan fixes this in nine phases (Part 6), most confusing first:

1. **UI-0 Foundations:** one button, one colour grammar, one type scale, motion tokens, a phone screen template with a fixed action bar, a reduce-motion mode that keeps feedback, and an automated budget test.
2. **UI-1 Blockers:** hidden primary actions (Card detail), the Result's next step, the capsule summary, Pause, VS auto-start, and a minimal hit fix for Mode select.
3. **UI-2 Home as the hub:** one big button under the right thumb, five labelled tabs, the Modes panel, browser back handling and the viewport policy, features unlocked one at a time with a small ceremony. **Owner decision 2026-09-30:** Home is the 1v1 **Battle hub** (Battle starts a Ladder match, the future online mode), and the War Path map is a richly illustrated sub-screen reached from Home's Campaign card (2.3, 4.1).
4. **UI-3 Battle HUD:** readable text, 48 px targets, six cards and a Fort slot in one row, Evolve under the left thumb, train on release, one pulse at a time, controls shown only once taught.
5. **UI-4 Army and Card detail:** Army becomes the Clash Royale-style Cards screen (loadout plus the whole card collection), tap a card for Use and Info, drag or tap to equip, one Undo, upgrade with a stat preview and a confirm tap.
6. **UI-5 Satisfaction:** rewards fly to their counters, numbers count, the evolve happens on screen, every screen moves with direction, haptics on Android. **UI-5b Battle feel:** a live audit and pass of the battle world's moments (spawn, hits, deaths, impacts, base damage, powers) with realistic weight.
7. **UI-6 Customize:** the one home for every cosmetic: the album with completion counts and a live preview of base, flags, decorations and skins.
8. **UI-7 The realistic UI skin and polish:** materials, lighting, fonts, Danish length, the remaining audit items.

Rule for all phases: **motion ships with the feature.** No screen or interaction is "done" while it is static; its rows in the motion catalogue (Part 5.5) ship in the same phase.

---

## 1. UI principles for Ageborn

### 1.1 The fifteen binding rules

Every agent follows these on every change. Each cites the research IDs it comes from.

| # | Rule | Concretely |
|---|---|---|
| U1 | **One screen, one job, one primary button.** | A screen has at most one primary button: the one emphasised action (`data-primary`), filled gold or green by the grammar in U5, the largest button on screen, at the bottom-right (thumb zone). Screens whose job is an action (Home, Result, sheets) have exactly one; Card detail and Customize have one when the action is possible; browsing and editing screens whose changes apply at once (Army, Progress, Settings, Profile) may have none. A disabled primary keeps its place and explains what is missing but loses `data-primary` and the pulse. A new player can say what the screen is for within 5 seconds. Everything else is secondary (slate) or tertiary (text). (H8, G6, G7, F2, T3) |
| U2 | **Battle is one tap away.** | Home's Battle always starts a 1v1 Ladder match (the onboarding matches while they are due; owner decision 2026-09-30), with 1 tap. The next War Path level is 2 taps (the Campaign card, then Play). Any other mode starts from its card in the Modes panel (2 taps). The VS screen starts by itself after 2 s. From every Result the next battle is at most 1 tap away, and the Result's primary sits in the same spot as Home's Play. After a War Path win the primary is "Continue": it returns to the map, where the advancing road is the reward (MR-41), and Play is then 1 tap; a loss offers "Try again" and the other modes "Next battle" straight into VS. (K5, B-rank 1, 2, 10) |
| U3 | **Every tap answers within 100 ms.** | The pressed state shows on `pointerdown` in the same frame. The result of the action appears where the finger is, not in a toast across the screen. Disabled controls explain why on tap. (R1, N4, H1, H9) |
| U4 | **Show, don't make them remember.** | Class, cost, level, counters, equipped, locked and ready are visible on the item where the decision is made. Long-press (touch) or hover (desktop) opens detail; nothing essential is hover-only. (H6, N2, P3) |
| U5 | **One visual grammar.** | Gold = go (Play, Continue, Next, Open, Claim). Green = spend or progress (Upgrade, Equip, confirm a spend, valid drop target). Slate = neutral and navigation. Red = destructive or denied only. Rarity, team and capsule-tier colours mean only rarity, team and tier, and each lives on its own kind of object (3.2), so hues that look alike never meet. One component per job (one Button, one CardTile, one Sheet). (H4, G2, B-rank 4) |
| U6 | **It fits the phone.** | Every screen works at 844 × 390, 844 × 340 and 800 × 360 with safe areas: no clipping, no truncated names, no horizontal page scroll, the primary button visible without scrolling. Text ≥ 12 px (tags ≥ 11 px bold). Targets ≥ 48 px (44 px for rare controls), ≥ 8 px apart. Layouts are budgeted in px before they are built (3.1). (T1, T4, A2, A8) |
| U7 | **Five destinations, shallow depth, one way back.** | Five labelled tabs. Everything else is a panel or at most one level below a tab; never a panel on a panel (an info panel excepted). Back is always top-left, Close (×) on panels always top-right, and Esc and the browser or Android back gesture do the same (each panel, sub-screen and battle is a history entry; back on Home never leaves the site by accident). A jump to another tab returns to where it came from. Leaving and coming back keeps scroll, tab and filter. (H3, F2, B-rank 3, 22) |
| U8 | **Reveal gradually, teach by doing.** | A new player sees only what they can use now, on Home, inside screens and in the HUD. Each feature arrives with a short unlock ceremony and one line of at most 8 words; each invented term arrives with a one-line caption the first time it appears. Locked things stay visible and say how they unlock ("Unlocks at level 3"). One new Home thing per level. (P1, P2, K9, B-rank 13, 16) |
| U9 | **Plain words, icon plus label.** | Buttons are verbs ("Play level 4", "Upgrade", "Use"). Every invented term (Amber, Dust, Clay, Charges, War Chest, Overdrive, Siege) has an icon, a first-seen caption and a one-tap info panel, and appears only when it matters. A blocked button says in plain words what is missing ("Needs 1 charge"). No ids, enums or debug text. (H2, H10, K3) |
| U10 | **Forgive.** | Reversible actions (equip, swap, reorder, cosmetics) are instant and have Undo. Irreversible spends (upgrade, craft, reroll, reset, retreat) take two taps: the first shows the price and the result (the button turns into "Confirm · price" in place, the stats show their gains), the second spends. Destructive buttons are small, red and away from the primary. (H3, H5, P4, B-rank 23) |
| U11 | **One attention pulse per screen; badges mean "ready for you".** | At most one element breathes at a time: the next action. Two kinds of marks: a NEW dot (clears once seen) and a ready badge (claim, open now, upgrade; stays until acted on). Never for backlogs; at most 2 ready badges on Home, by the priority in 2.2. No repeating flash or blink anywhere; one-shot feedback flashes (a denied press, a hit) are allowed within the 3-per-second limit of U14. (G7, A15.13, B-rank 17, feel-ux §5) |
| U12 | **Every motion has a job and uses the tokens.** | Motion gives feedback, continuity, attention, state change, celebration or life, otherwise it is cut. Only the tokens in 5.2. UI transitions 150-400 ms; exits about 0.7 × entrances; moving tokens follow arcs; only `transform` and `opacity` animate. Input during an animation skips or retargets it, never gets swallowed; pressing Play during any Home ceremony finishes it at once and starts the battle. In the battle world, motion is realistic: weight through poses and timing, not squash (5.8). (M1-M4, R2, R3) |
| U13 | **Satisfying moments follow one recipe.** | Anticipation, action, impact (seen, heard, counted), follow-through, residue. The size matches the event class (micro, small, medium, large). Sound lands on the impact frame. Anything longer than 1 s can be skipped with a tap. Never two medium or large moments at once. (M5-M8) |
| U14 | **Reduce motion replaces, never deletes.** | With reduce motion (setting or OS), movement becomes 150 ms cross-fades and glow or colour changes; counters still update; pre-signals and state feedback stay. At most 3 flashes per second in any mode; big flashes are tinted and soft. (A4, A5, M10) |
| U15 | **Honest and labelled.** | Bots are labelled AI on every surface (A7.1). Capsule copy follows A15.3. No timers or countdowns in menus, no backlog counts, no "last chance". Nothing can be bought. (A15.3, A15.13, CLAUDE.md) |

### 1.2 Review checklist

Copy it into the progress note of every UI change and tick it. A box that cannot be ticked is a bug, not a note.

**Screen**

- [ ] 5-second test: a new player can say what the screen is for and what to do next (U1).
- [ ] At most one primary button (exactly one where 2.4 names a primary), bottom-right, strongest in the squint test (6 px blur + greyscale) (U1).
- [ ] Back top-left, Close top-right on sheets, Esc and back gesture work; state is kept on return (U7).
- [ ] Colours follow the grammar in 3.2; no rarity, team or tier colour on a button (U5).
- [ ] Fits 844 × 390, 844 × 340, 800 × 360 and 1280 × 720: no clipping, truncation, overlap or page scroll; primary visible without scrolling; the px budget in the screen's section adds up (U6).
- [ ] At most one pulsing element; NEW dots clear when seen, ready badges only for what can be acted on now (U11).
- [ ] A new player sees only what is unlocked (2.6); every invented term has an icon, a first-seen caption and an info panel; every locked item says how it unlocks (U8, U9).
- [ ] Browser and Android back: every panel, sub-screen and cross-tab jump has a history entry; back closes, goes back or pauses (U7).
- [ ] Strings through i18n, with room for Danish (+30%) (U9).
- [ ] AI labels, honest copy, no timers or backlog counts (U15).

**Interaction**

- [ ] Hit areas ≥ 48 px (≥ 44 px rare) and ≥ 8 px apart (U6).
- [ ] Pressed state on `pointerdown`; result visible within 100 ms and near the finger (U3).
- [ ] Disabled controls look disabled and explain why on tap (U3).
- [ ] Reversible actions have Undo; irreversible spends show price and result first (U10).
- [ ] Every drag has a tap alternative; valid targets light up on drag start; invalid drops return (T5, T6).
- [ ] The screen's gesture matrix (tap, long-press, drag, scroll, pan) has no two gestures competing for the same start; nothing waits for a double-tap (U3).
- [ ] A long-press never triggers a spend (train, buy, upgrade fire on a short tap's release) (U10).
- [ ] Keyboard on desktop: Tab order, Enter = primary, Esc = back or close (H7).

**Motion**

- [ ] Each animation has a job (feedback, continuity, attention, state, celebration, life) (U12).
- [ ] Uses tokens only; no new `cubic-bezier(` or ms literal outside the token files (U12).
- [ ] Follows its row in the motion catalogue (5.5), including the sound and the reduced variant (U13, U14).
- [ ] Longer than 1 s is skippable; input is never swallowed (U12, U13).
- [ ] A 50 ms frame burst from input to settle looks alive: anticipation, overshoot, settle; nothing flat, stiff or placeholder-like (CLAUDE.md). Small pieces (buttons, cards, chests, badges, numbers) keep their full overshoot; only large panels and the realistic world drop the bounce (5.1).
- [ ] The haptic in 5.4 fires on Android when the row has one, and never more than one per 100 ms.

**Accessibility**

- [ ] Text ≥ 12 px (tags ≥ 11 px bold); contrast ≥ 4.5:1 for text, ≥ 3:1 for icons and control edges (A1, A2).
- [ ] Nothing is conveyed by colour alone; screenshots pass deuteranopia, protanopia, tritanopia and achromatopsia emulation (A3).
- [ ] Reduce motion capture shows fades, not jumps, and keeps feedback (U14).
- [ ] Every sound cue has a visual cue (A6).

### 1.3 Automated budget checks

A Playwright spec (UI-0, owner WP12) runs on every screen in 2.4 at 844 × 390, 844 × 340, 800 × 360 and 1280 × 720. It measures **settled states only**: it waits until `document.getAnimations()` is empty and no element carries `data-anim` for 100 ms, so mid-animation transforms never cause false results. It fails when:

| Check | Rule |
|---|---|
| Small text | any visible text node under 11 px, or under 12 px without the `data-tag` attribute |
| Small targets | any `button`, `[role=button]`, `a`, `input` or `[data-hit]` whose hit box is under 44 × 44 px (an explicit allow-list with a reason per entry) |
| Primary count | more than one visible `[data-primary]` element, or none on a screen whose row in 2.4 names a primary |
| Pulse count | more than one visible `[data-pulse]` element, sampled every 250 ms |
| Clipping | an element with `data-clip-check` whose `scrollWidth > clientWidth` or `scrollHeight > clientHeight` (names, button labels) |
| Page scroll | `document.scrollingElement.scrollWidth > innerWidth` |
| Stray motion | CSS files outside `src/ui/theme.css` and `src/ui/motion.css` contain `cubic-bezier(` (lint, not Playwright) |
| Canvas text and targets | the Pixi debug hook reports a canvas text under 12 px (capsule show honesty lines, damage numbers, canvas labels) or a canvas hit rect under 44 px |
| Badges | more than 2 visible ready badges on Home |

The Button, CardTile, tabs and chips set `data-primary`, `data-pulse`, `data-tag` and `data-clip-check` themselves, so screens get the checks for free. **Canvas hook:** in dev and test builds only, `window.__agebornDebug.canvasText()` and `.canvasHits()` return every visible Pixi text with its on-screen font size and every interactive canvas rect (WP10 for the capsule stage, WP5 for the battle view, through requests); release builds strip it.

---

## 2. Information architecture and navigation

### 2.1 The conceptual model

The whole game in one sentence a new player can repeat:

> **Win 1v1 battles to climb the arenas, open capsules to get cards, put your best cards in your army; play the campaign when you want more cards.**

(Owner decision 2026-09-30: the 1v1 battle, online later and against labelled AI now, is the main point; the War Path is the offline side road.) Every Home element belongs to one of five verbs: **Play, Open, Build, Customize, Progress** (N6), and each verb has exactly one tab. Anything that fits none of them lives inside a destination, not on Home.

### 2.2 Navigation model

**The five tabs, one per verb** (left to right): **Army** (Build), **Capsules** (Open), **Battle** (Play, Home, centre; owner decision 2026-09-30), **Progress** (Progress), **Customize** (Customize).

| Tab | Holds | One home for |
|---|---|---|
| Army | the loadout of each age on the left, the whole troop collection on the right (this age, or "All cards" with completion counts), Card detail and upgrades | every troop, turret, power and Fort card: equip, inspect, upgrade, collection progress |
| Capsules | the capsule shelf, Wardrobe Crates, charges, Supply and Clay, odds | everything that is opened |
| Battle (Home) | the 1v1 hub: the arena, trophies, the match plate and Battle, the Modes tile, the Campaign card with the War Path map below it (S2c), four capsule slots | playing |
| Progress | Goals (quests and the War Chest), Trophy Road, Feats, the Profile record | every long-term goal and claim |
| Customize | the live preview, all cosmetic collections with completion counts (the cosmetics album) | every cosmetic: see, try on, equip |

Why this set: the research (ui-benchmarks B-rank 3) and both reviews found Army and Collection showing the same cards, cosmetics in two places, and Goals and Trophy Road hidden on a rail. One tab per verb gives each thing exactly one home, which is what the owner's "meta features are hard to find" asked for. Capsules stays a tab instead of a Home tray because Home's one job is the War Path (A15.13 budget) and the capsule systems (charges, Supply, Clay, crates, odds) need room; findability comes from the tab's ready badge and from the Result, which opens a fresh capsule with 1 tap.

| Layer | What | Examples | How you leave |
|---|---|---|---|
| **Tabs** (5, always visible outside battle) | Top-level destinations in a bottom navigation bar | Army, Capsules, **Battle (Home)**, Progress, Customize | Tap another tab; back or Esc on a tab goes to Home |
| **Sub-screens** (depth 1 below a tab) | Full screens with a header and Back | the War Path map (below Home), Card detail, Skirmish setup, Trophy Road (in Progress), Profile, Settings | Back (top-left), Esc, back gesture: return to where the player came from, with scroll and filters kept |
| **Panels** | On compact screens a side panel slides in from the right, about 58% of the width (min 440 px), full height inside the safe areas, and the screen stays visible and dimmed on the left; on regular screens a centred panel up to 720 wide | Level preview, Modes, odds, info panels | × top-right, tap the scrim, swipe right (compact) or down (regular), Esc |
| **Tray sheets** (battle only) | A sheet that replaces the tray from below | War Council | its button, Esc |
| **Modals** | Small centred dialogs that need an answer | Confirm a reset, Age Capsule picker, Retreat | The two buttons, Esc (= cancel) |
| **Flows** | Full-screen sequences owned by the app | VS, Battle, Pause, Result, Capsule show | Their own buttons; Esc in battle = Pause; Esc in the capsule show = skip to summary |

Rules:

- **Depth ≤ 2** from Home: a tab, then one sub-screen or panel. A panel may open over a sub-screen (odds over Card detail). **Never a panel on a panel**, with one exception: an info panel (S17) may open over any panel and closes back to it. A choice that needs its own setup (Skirmish) opens a sub-screen and closes the Modes panel.
- **Tab bar visibility:** visible on every tab and hidden in sub-screens and flows; a panel dims it. The active tab is marked by a lit plate, a label in full white and the icon in colour; inactive tabs are slate with labels at 12 px.
- **Back stack:** the router keeps one stack per tab, so returning to a tab shows where the player left it (U7). After a battle Home resets to the hub; a War Path result's Continue returns to the map, where the level ceremony plays.
- **Cross-tab jumps return to their origin.** The jumps are: Level preview "Edit army" → Army; Result or capsule summary "Upgrade" → Card detail; a new cosmetic's "Try it on" → Customize. A jump opens the target with a Back button (top-left) and records its origin; Back, Esc and the back gesture return to the origin in the state it was left (the Level preview panel open again, the summary shown again). Tapping a tab instead clears the origin. There are no other cross-tab jumps.
- **Browser history** (U7, owner WP11 in `src/app`, the router in WP9): every panel, sub-screen, cross-tab jump, VS and battle pushes one `history.pushState` entry, so Android back and the browser back button close the panel, go back, or open Pause in battle. Home at the root keeps one sentinel entry: the first back there shows a toast "Press back again to leave" (2 s) and re-arms the sentinel; only a second back within 2 s leaves the site. `overscroll-behavior: none` on `html` and `body` and `contain` on every scroll container, so a pull never reloads or navigates; the map, the Army drag surface and the battle canvas set `touch-action: none` and handle their own pans. **iOS edge swipe:** no drag or pan may start within 20 px of the left or right screen edge (on notched phones this lies inside the safe area anyway); a Safari edge swipe is a history back and therefore safe.
- **Ready-badge priority on Home** (at most 2 show, U11): 1. Capsules (a capsule that can be opened now, charges permitting); 2. Army (an upgrade is ready); 3. Progress (a claim is ready); 4. Customize (never a ready badge, only NEW dots inside). A tab with a lower-priority ready state shows it inside the tab only.
- **Keyboard (desktop):** 1-5 switch tabs outside battle, Enter presses the screen's primary, Esc goes back or closes, arrows move along the War Path, Space starts a battle on Home and the next level on the map.
- **Social later:** when friends or clans ship (A18.10 M6, M8), Social takes Progress's place and Progress becomes a segment of the Profile sub-screen, or the tab count grows to six on regular screens only; the lead decides then. Five tabs on phones stays.

### 2.3 Home: the Battle hub (owner decision 2026-09-30)

The owner: "The old screen where you play 1v1 must be the first thing you see, since the main point of the game is a 2-player online game; the path against bots is a side thing so you can play offline and collect cards and currency." He liked the War Path Home's layout (transparent top bar, full-bleed scene, plate over the big button bottom-right, five tabs) but found the path too plain. So Home keeps that frame and puts the 1v1 battle in it; the War Path moves one level down (S2c, 4.1) and gets a much richer map.

**Phone 844 × 390** (content box about 812 × 369; margins 16):

```
+--------------------------------------------------------------------------------------+
| [avatar Name  1,020]                                     [Amber 1,240] [Dust 80] [gear] |  top bar 44 (40 short)
| +-Campaign card-----+        ~~ the arena diorama ~~          +--match plate-------+ |
| | [region art  (7)] |     [your base] ==lane== [AI base]       | [Kettle AI] OPPONENT | |
| | CAMPAIGN  *35/240 |        landmark behind, banners           | Captain Kettle  T III| |
| | Solo vs AI, cards |    [ARENA 4 · POWDER BAY]                  | [Short|Standard|Full]| |
| +-------------------+    [cup 1,020 =====---  Next at 1,100 (r)] | Short War · 3 ages   | |
| [cap][cap][cap][+3]                                            +--------------------+ |
| [Army][Capsules][ BATTLE ][Progress][Customize]                  [Modes] [ BATTLE ]   |  bottom row 56-64
+--------------------------------------------------------------------------------------+
```

| Zone | Size (phone / desktop) | Contents |
|---|---|---|
| Top bar | 44 / 56 tall, transparent over the scene | Left: profile chip (avatar, name; trophies once the Ladder is open), opens Profile. Right: Amber and Dust chips (each once earned, with its first-seen caption, MR-28; tap = info panel), gear. |
| Scene | Full screen behind everything | The arena's sky and skyline (`ArenaScene`: drifting ridges, clouds crossing, a flock of birds now and then, motes). |
| Stage | the space between the columns, above the tab bar | The **arena diorama** (a floating island in the arena's palette): your base (the real base picture through the ArtProvider, with your base skin) and the AI's mirrored across the lane, team banners, the arena's landmark (volcano, ice peak, moated keep, harbour ship, factory, neon skyline, ringed planet, time rift), props, a clash mark in the middle; it floats and its details move. Under it the arena ribbon ("Arena 4 · Powder Bay") and the **trophy bar** (trophies, the bar to the next Trophy Road node, its reward icons; opens Trophy Road). Before the Ladder opens a line replaces them ("Win your first battle"). |
| Left column | 204 / 296 wide | The **Campaign card** (after the onboarding): the current region's art with the road and the next node, "Campaign", total stars, "Solo battles vs AI, earn cards", the next level's name and its first-clear reward; opens the War Path map (S2c). Under it **four capsule slots** (once Capsules opens): each filled slot opens its capsule with one tap (charges never block), empty slots are dashed wells, a fifth or later capsule shows "+N" and opens the Capsules tab. |
| Match plate | 244 / 340 wide, over Battle | The next opponent: portrait with the AI badge, "Opponent · Tier III", name; the **format picker** (Short, Standard, Full) from Arena 2, remembered per save; the format's line ("Short War · 3 ages, about 7 min."). During the onboarding: "Training match" and the General of that match (Old Grogg, then Pip). This is where the online opponent shows once online play exists (A18.10), so that mode slots in without a redesign; nothing online is shown before it exists (U15). |
| Match plate (2026-10-01) | same box | The **lobby card**: it always shows exactly what Battle will do, one state per mode (`home/plate.tsx`): Training; Ladder (one length at Arena 1, then the **length picker** Short, Medium, Long, No clock with locked lengths naming their arena; on a phone plate the fourth segment is the cracked-tower glyph alone); Last Base Standing ("7 ages · no clock · no trophies", an info panel, a once-only caption); Quick Battle (difficulty stepper); Daily (Recruit / Veteran / Warlord); Skirmish (summary and Change). Every bot has the AI chip. The online states (unknown player, searching, found, friend, no connection, full, update) exist only in the dev mock until they work. |
| Battle | 176 × 64 / 240 × 80, bottom-right | Gold, the only primary, the one breathing element: a Ladder match in the picked format, 1 tap (the onboarding matches while due). |
| Modes | 88 × 64 / 112 × 80, left of Battle | Slate tile; the Modes panel (Quick Battle, Daily, Skirmish, Conquest). Opens with 3 wins. |
| Mode switcher (2026-10-01) | same box | The Modes tile **shows the mode Battle plays** (icon, name, a "vs AI" tag, a caret). Its panel selects a mode (`ui-homeMode.<id>`) and never starts one; the card's icon flies into the tile (MR-120). Battle plays the shown mode: 1 tap, another mode 2 taps. |
| Bottom nav | as before | Army, Capsules, **Battle** (centre, raised, crossed swords), Progress, Customize; ready badges by 2.2 (at most 2). |

**Width check** (compact, 812 inside the margins): bottom row nav 440 + 16 + Modes 88 + 8 + Battle 176 = 728; middle band left column 204 + 8 + stage about 340 + 8 + plate 244 = 804. Below 820 px wide the columns are 196 and 236. **Height check** at 844 × 390: top bar 44 + middle band 282 (left column: card about 160 + 12 + slots 52; right: plate about 124 + 8 over Battle) + bottom row 64 = 390. At 844 × 340 the tabs are 52 and Battle 56; the diorama shrinks with its box (sized by container units, never cropped). Budget spec: `home`, `home-new`, `home-maxed`, `home-first`, `home-campaign`, `warPath`, `warPath-new` at all four viewports.

**What moved off Home and where** (2026-09-28, UA-02's crowding; still valid for the hub, except that four capsule slots return as a compact row and the opponent preview is the match plate):

| Was on Home | Now |
|---|---|
| Capsule tray panel plus a Capsules nav button (the same content twice) | The **Capsules** tab (4.6). Home shows only its ready badge. |
| Quests panel with swap buttons, War Chest bar | **Progress** tab, Goals section. |
| Trophy Road bar behind the nav row | **Progress** tab, Trophy Road section, and the Ladder card in Modes. |
| Next-opponent chip on Battle | The match plate over Battle (2026-09-30). |
| Six equal nav buttons in two rows | Five labelled tabs in one row. |
| Conquest nav button | Modes panel until A18.7.10, then the boss nodes on the map. |
| Clay meter, charges "12/28", Supply progress | The Capsules tab, next to what they fill. |
| War Plan and Collection buttons | One **Army** tab. |

**Counts on Home** (returning player): about 17 tappable controls in five clear groups (top bar, left column, stage, match plate and Battle, bottom nav), one primary. The audit counted 18 equal-weight controls and no primary structure.

**Desktop 1280 × 720:** the same composition with the desktop sizes above; the diorama grows to about 540 wide.

### 2.4 Screen map

Type: T tab, S sub-screen, P panel, M modal, F flow. "Back" is where Back, Esc and the back gesture go. `data-primary` marks the one emphasised action, gold or green by the grammar (U1, U5); "conditional" means the screen has it only while the action is possible.

| # | Screen | Type | Purpose (one job) | Primary action | Back | Reached from |
|---|---|---|---|---|---|---|
| S1 | Boot | F | Load in ≤ 3 s | none (progress bar) | none | launch |
| S2 | **Home: the Battle hub** | T (centre) | Start a 1v1 battle; see your arena, trophies and what comes next | Battle (gold) | none (root; back sentinel, 2.2) | launch, every flow end |
| S2c | War Path map | S | Show where you are on the campaign and start the next level | Play level N (gold) | Home | Campaign card, the Progress stars row, a War Path result's Continue |
| S2a | Level preview | P | Everything about one level before you play it | Play level N / Replay level N (gold); a locked node shows the reason instead ("Beat level 4 first") and no primary | the map | tap any node or the level plate |
| S2b | Modes | P | Choose another way to play | Play (gold) on the selected mode card | Home | Modes tile |
| S2d | Skirmish setup | S | Set up a practice battle (General or Echo, difficulty, format, start era, speed, Standard levels; A9 #3) | Play (gold) | Home | Modes panel, Skirmish card |
| S3 | VS | F | Show who you fight (AI label, tier, levels, modifiers) | none; starts after 2 s, tap to skip | Esc = cancel to Home before the countdown ends | Play |
| S4 | Battle HUD | F | Fight | contextual (no fixed primary) | Esc / back = Pause | VS |
| S4a | War Council | tray sheet | Pick in-battle research (A18.5) | the chosen pick (green, costs gold) | tray | Council button, G key |
| S4b | Mount popover | popover | Build, Modernise or Sell a turret | the build option (green) | tap outside | tap a mount |
| S5 | Pause | M (card under the minimap) | Stop and look around | Resume (gold) | Resume | pause button, Esc, back, tab hidden |
| S6 | Result | F | See what happened and what you earned, then go on | by the table in 4.9 (gold) | Home | battle end |
| S7 | Capsule show and summary | F | Open a capsule | Tap (strikes); summary: by the table in 4.6 (gold) | skip to summary, then its primary | Result, Capsules tab |
| S8 | **Capsules** | T | See and open what you earned | Open (gold) on the selected capsule when it can be opened | Home | tab |
| S9 | **Army** (loadouts and the troop collection) | T | Choose the troops for each age, see and upgrade every card | none: edits apply at once (one Undo in the header) | Home | tab, Level preview "Edit army" (Back returns to the preview) |
| S11 | Card detail | S | Understand a card and upgrade it | conditional: Upgrade · price (green), then Confirm · price; when not possible the button keeps its place, disabled, saying what is missing | where it came from (Army, or the Result or summary that jumped here) | Info on a card in Army, "Upgrade" on the Result or summary |
| S12 | **Customize** | T | See every cosmetic, try it on, choose how your base, flags and troops look | conditional: Equip (green) on a previewed owned item | Home | tab, "Try it on" on a new cosmetic (Back returns there) |
| S13 | **Progress** | T | Claim goals and follow long-term progress | Claim (gold) on the first claimable, else none | Home | tab, Ladder card, Result trophy bar |
| S13a | Trophy Road | S (in Progress) | See ladder progress and claim road rewards | Claim (gold) on the next claimable node | Progress | Progress, Ladder card |
| S14 | Profile | S | Your record, name, banner, match history | none (edit name is secondary) | where it was opened from | profile chip, Progress |
| S15 | Settings | S | Change sound, display, motion, accessibility, save | none (changes apply at once) | where it was opened from | gear, Pause |
| S16 | Replay viewer | F | Watch a replay | Play/Pause | Profile or Result | Profile history, Result |
| S17 | Info panel | P | Explain one term or system (A15.3 lines live here) | none | the screen or panel below | any "i", currency chip or first-seen caption |
| S18 | Unlock intro | pointer overlay (dims Home, does not block it) | Introduce one new feature in ≤ 8 words | none: "Open" is secondary, Play stays the only primary; taps outside the pointer go through to Home | Home | an unlock (2.6) |
| S19 | Confirm | M | Confirm a destructive loss (reset save, Retreat) or a spend of more than half the player's Amber or Dust | the loss (red) or the spend (green) | cancel | reset, Retreat, big spends; normal spends confirm in place (U10) |
| S20 | Age Capsule picker | M | Pick which age the capsule comes from | Choose (gold) | none (must choose; the result is saved first) | Result, quest claim |
| S21 | Rotate overlay | overlay | Ask to turn the phone | none | rotating | portrait |

Retired: **Mode select** (S3 in A9) becomes the Modes panel; **Collection** (S10) folds into Army (troops) and Customize (cosmetics), and its Feats tab moves to Progress; the **Goals rail** and **Goals sheet** become the Progress tab; **Conquest** stays inside Modes until A18.7.10 moves its Generals onto the map.

### 2.5 Flow

One sequence per situation, with its tap count from the Result to the next battle:

```
Launch ─> Boot ─> Home (the Battle hub; first launch shows only the arena, Battle and the gear)
Home ─Battle─> VS (2 s, tap skips) ─> Battle ─> Result
Home ─Campaign card─> War Path map ─Play─> VS ─> Battle ─> Result
Result, War Path win, no capsule:  ─Continue─> the map (MR-41 ceremony) ─Play─> VS          2 taps
Result, War Path win, capsule:     ─Open capsule─> Capsule show ─> Summary ─Continue─> the map (MR-41) ─Play─> VS
                                   (secondary on the Result: Continue, which leaves the capsule on the Capsules shelf)
Result, War Path loss:             ─Try again─> VS                                             1 tap
Result, Ladder / Quick / Skirmish: ─Next battle─> VS (same mode, same settings)                1 tap
                                   (with a capsule: primary Open capsule; Summary's primary is then Next battle)
Home ─Modes─> Modes panel ─Play on a card─> VS ─> ...                                          2 taps
Home ─tab─> Army | Capsules | Progress | Customize ─> Card detail / capsule show / Trophy Road
Battle ─Esc or back─> Pause ─> Resume | Settings | Retreat (confirm)
```

The summary never returns to the Result: its primary continues the Result's own path (Continue to the map, or Next battle), and "Home" is its secondary. Only the capsule just earned opens from the Result; any other waiting capsules stay on the shelf for the Capsules tab (their badge shows them), so the loop is never "one more capsule" by default.

### 2.6 Progressive unlocks

Tabs and Home elements appear one per return to Home, each with the unlock ceremony (MR-40). **Owner decision 2026-09-30:** they open with **wins in any mode** (Ladder, War Path, Quick Battle, Daily; the beaten War Path levels count when they run ahead), not with War Path levels, since the War Path is optional; the Ladder and the Campaign card open when the onboarding ends. Locked tabs are visible from the first return with a padlock and "3 wins" on the icon; tapping one shows a pointer "Unlocks at 3 wins" above it (U8). At most one unlock moment per visit to Home. This replaces the built rule "War Plan, Customize, Quick Battle and Skirmish open after match 1" (A3, A8).

| Returning to Home after | Appears | Why now |
|---|---|---|
| First launch | The arena diorama, the match plate ("Training match", Old Grogg with the AI badge), Battle, gear. No tabs, no chips, no Modes tile. | Nothing else is usable yet (P2) |
| Match 1 (the training match, War Path Stone L1) and capsule 1 | Bottom nav (all 5, four locked), **Army** unlocked, Amber chip (with its caption); the plate shows Pip for match 2 | The new Spear Hunter is in the army |
| Match 2 (Stone L2), capsule 2 and the forced upgrade: the onboarding ends | **Ladder**: the arena ribbon, the trophy bar and trophies on the profile chip; Battle now starts Ladder matches | Home is the 1v1 hub from now on |
| the next visits | **Capsules** (2 wins; the slots and the tab), then the **Campaign card** (the War Path map below Home) | There is something to open; the side road for cards |
| 3 wins | **Modes** tile (Quick Battle, Skirmish) | More ways to play |
| 4 wins | **Customize** unlocked (the welcome Wardrobe Crate waits in Capsules) | First cosmetic owned |
| 5 wins | **Progress** tab with Goals (quests, War Chest) and Trophy Road | Longer-term goals once the basics are known |
| 6 wins | **Daily** in Modes | One more way to play, once the others are known |
| later | nothing new on Home; new mechanics are taught on the War Path nodes (A18.7.5) | One new Home thing per visit |

Currencies and meters appear when first earned, not by level: the Dust chip on the first Dust, and on the Capsules tab the charges, Supply and Clay meters each on their first progress. Each arrives with its first-seen caption (MR-28).

**Inside screens** the same rule holds (P1, P2):

| Screen | Hidden at first | Appears |
|---|---|---|
| Army | ages not yet reached (one padlock tab "More ages" stands for all of them); presets A/B/C; the average level; the advisor chip | each age when it is reached (its loadout auto-filled, with the banner "Auto-filled · tweak it?"); the average level and the advisor at L3; presets after the first boss (L10) |
| Level preview | the difficulty control, the ★★ and ★★★ goals | after the level is first beaten, or from L5; a loss offers "Try Easy" on the Result regardless |
| Capsules | charges, Supply, Clay, "Open all" | on first progress or when 2 capsules can be opened at once |
| Battle HUD | stance, War Council, Last Stand, the Fort card, the army counter | each from the match whose tutorial beat first uses it (A8, A18.7.5): for example stance from L2, the Council from L6; a control never shows before it is taught |
| Top bar | trophies on the profile chip | with the Ladder (the end of the onboarding) |

### 2.7 First session, minute by minute

Targets for a new player on a phone, with the War Path v0 of UI-2 (6.3). Times follow A8 and A18.7.5; the tutorial scripts keep their own ticks.

| Time | Screen | What the player sees and does | Taps to battle |
|---|---|---|---|
| 0:00 | Boot | Logo, progress bar; Stone assets first (≤ 3 s) | |
| 0:03 | Home, first launch | The Stone region of the War Path, alive (smoke, birds, grass). L1 "Training" with Old Grogg (AI) glows on the road; ahead, locked nodes fade into mist; the boss flag is visible far right. One gold "Play" breathes. Line: "Your War Path starts here." Only the gear is also on screen. | 1 |
| 0:05 | VS | Play dips, the map zooms into L1, fade-through to VS: you vs Old Grogg (AI badge, "Training match"). Starts by itself after 2 s. | |
| 0:08-2:40 | L1 battle | The A8 match 1 beats (train, kill gold, Pebbler, turret, evolve, power drag, the ages) | |
| ~2:40 | Result | "Victory!" banner; a star stamps onto the level badge; step 2: Capsule 1 drops onto the panel. Primary: "Open capsule". | |
| ~2:55 | Capsule 1 | Guided taps ("Tap to crack it"), scripted climb, Spear Hunter NEW, short walkout (~40 s) | |
| ~3:35 | Summary | Spear Hunter "Equipped" state; primary "Continue" | |
| ~3:40 | Home | Level-complete ceremony: the star flies from the Result into L1, the road draws itself to L2, L2 drops in, the banner-bearer marches to it, Play slides to it. Then the bottom nav rises; Army unlocks (padlock cracks, "Army: pick your troops"). The Amber chip arrives with its caption "Amber: upgrades your cards" and counts up from 0. Play works throughout and cuts the ceremony short. | 1 |
| ~3:50 | Home or Army | Most players tap Play level 2 ("Hold the line", Pip Quickstep AI). Curious players open Army: the Spear Hunter sits in its slot with a NEW dot and wobbles once. | 1 or 2 |
| ~4:00-9:00 | L2 battle | Stance: the enemy rushes; Hold, then Charge (A18.7.5) | |
| ~9:00 | Result, capsule 2 | Pikeman and Grenadier NEW; the forced upgrade plays the full level-up ceremony (MR-39) on Bonker: "+5% HP and damage" | |
| ~10:00 | Home | L2 star, road to L3; Capsules unlocks, the Supply Capsule flies into the tab (badge 1) | 1 |
| ~10:15-15:30 | L3 | Turret on a mount | |
| ~15:30 | Home | The Modes tile unlocks | 1 |
| ~16:00-21:30 | L4 | Age Power dragged onto the lane | |
| ~21:30 | Home | Customize unlocks; the pointer suggests opening the crate in Capsules, then "Try it on" | 1 |
| ~22:00-28:00 | L5 Lieutenant (Hard) | A harder fight; a loss offers "Try again" (1 tap) | |
| ~28:00 | Home | The Progress tab unlocks with Goals | 1 |
| ~28:00-40:00 | L6, L7 | War Council economy (L6) and Ladder on Home; Troops rank I (L7) and Daily; a stopping card may suggest a break (A15.6) | |

Session targets: first battle within 10 s of the first tap; each later battle 1 tap from Home or from the Result; no screen with more than one new thing; no text line over 8 words during onboarding.

### 2.8 Task targets (returning player, phone)

| Task | Taps today (audit §5) | Target |
|---|---|---|
| Start a 1v1 (Ladder) battle | 3 + VS | **1** (Battle on Home; owner decision 2026-09-30) |
| Next level after a War Path win | 3 + VS | 2 (Continue, Play), with the map ceremony between |
| Start the next War Path level | 3 + VS (via Mode select) | 2 (the Campaign card, Play); 1 from its Result (Try again) and 2 after a win (Continue, Play) |
| Choose difficulty | impossible (hidden picker) | 3 (the level plate or node, the difficulty option, Play) |
| Equip a new card in the Stone loadout | 3, no feedback | 3 taps (Army, card, Use; the Stone age is preselected) or tab + 1 drag |
| Upgrade a card | 3 + a scroll | 3 from Home (Army, card, Upgrade on its action bar) + the confirm tap; 1 + confirm when the Result or summary offers "Upgrade" |
| Open a capsule | 1 | 2 (Capsules, Open); the Result opens a fresh one with 1 |
| Change the base flag | 3, no preview | 3 (Customize, Flags, flag) with a live preview, + Equip |
| Find a capsule's odds | 2 | 2 (Capsules, "i") |
| Turn on reduce motion | 2 | 2 (gear, toggle) |

These are targets. Whether the UI is still confusing is measured with outcome data (6.10, step 10): time from Home to Play, back presses per session, taps on disabled controls, whether Army was opened before L3, and ceremony skips, from the local event log, plus a small hallway test.

### 2.9 DESIGN changes this plan implies (for the lead)

The lead records these in DESIGN and `docs/decisions.md` before UI-2 starts; agents do not edit DESIGN.

1. A9 flow and table: Home contents (2.3), Mode select becomes the Modes panel, Skirmish setup a sub-screen, the tab set (Army, Capsules, War Path, Progress, Customize) with Collection folded into Army and Customize and Feats into Progress, the Result and summary sequence of 2.5, new rows S2a, S2b, S2d, S13, S17-S20.
2. A15.13 Home line: the capsule tray moves to the Capsules tab and quests, the War Chest and Trophy Road to the Progress tab. This removes Home widgets and adds none, so it passes the budget rule.
3. A3 and A8 unlock timing: 2.6 replaces "open after match 1", including the in-screen and HUD disclosure rules.
4. A9.2 HUD: the tray layout in 4.7 (Evolve in the tray's left cluster, top band 44 px on phones, six cards at 62 × 84 on 844 px phones, the army counter under the gold, the Fort card in the tray row, the stance button with a flyout replacing the three-segment control, train on release).
5. A18.4: the stance control becomes one 56 px button with a press-drag-release flyout (4.7); the keys S and Shift+S are unchanged; the 48 px segment height no longer applies.
6. A18.9.5: "the bottom row keeps War Plan, Collection, Capsules, Customize and Trophy Road" becomes the five tabs above.
7. A9 #8: the odds and pity panel is shown in full on the Capsules tab before opening, on the first capsule of the save and in every odds panel; during later capsule shows it is one tap away through a 44 px "Odds" chip (4.6). This changes "on every capsule" and needs the lead's sign-off because it touches A10's honesty rules.
8. A9 #12: Trophy Road is horizontal (a road like the War Path), not vertical.
9. A12: the evolve flash is a soft tinted flash (warm white at 35% maximum, 120 ms) instead of a white flash.
10. A17.4: the own evolve frames the own base from anywhere (a pan and push), not only when the base is in view, and any player camera input ends it at once (MR-80).
11. A15.3: the bank line "Holds up to N. When full, it stops filling." shows as a caption under each bank on the Capsules tab, as A15.3 already says; recorded because 4.6 used to put it only in the info panel.
12. A13: the new UI and War Path sound ids in 5.4, and the haptic patterns in 5.4.
13. A18.7: War Path v0 (6.4) as an interim data set before A18 phase 5, stored in a save field agreed with WP8 (6.4).
14. A18.10 M7 and A9: the viewport policy of 3.1 (fullscreen on Android, the PWA `display: fullscreen`, the short viewports).

---

## 3. Design system

### 3.1 Frame, layout and grid

**Breakpoints** (by height first, because landscape phones are short):

| Name | Condition | Typical device | Notes |
|---|---|---|---|
| compact | height ≤ 480 | phones in landscape (844 × 390, 932 × 430) | the reference; all "phone" numbers |
| regular | 481-799 high | tablets, small laptops, 1280 × 720 | the "desktop" numbers |
| large | ≥ 800 high | 1920 × 1080 | regular sizes × 1.25 (one `--ui-scale` factor), content max width 1600 |

Inside compact, **short** (height ≤ 360) tightens the chrome: header and top bar 40, tab bar 52, action bar 56 (48 tall buttons), Home's Play 56. Width only switches the HUD tray card size (4.7), the tab width and the number of grid columns.

**Viewport policy** (owner WP11 for `index.html`, the manifest and the fullscreen call; WP9 for the CSS):

- **Measure, do not assume.** Layouts use `100dvh` for the frame and `100svh` for anything that must never be covered, never a fixed 390. The reference phone heights are 390 (fullscreen or installed), 360 (common Android) and 340 (iOS Safari tab with bars). The owner's own phone is measured once in UI-2 (a dev page shows `innerHeight`, `visualViewport.height` and the safe-area insets) and added to the list if it is smaller.
- **Android:** on the first tap of Play in a session, the app calls `document.documentElement.requestFullscreen({ navigationUI: 'hide' })` (a user gesture, so it is allowed) and then `screen.orientation.lock('landscape')` where supported; failures are silent. Settings has a "Full screen" toggle (on by default on touch devices). Leaving fullscreen by swipe is respected until the next Play.
- **Installed app (A18.10 M7):** the web manifest uses `display: fullscreen`, `orientation: landscape`. Settings has a short "Install for full screen" help line with the exact steps per platform.
- **iOS Safari:** iPhone Safari has no fullscreen for pages, so every screen is budgeted for 844 × 340. `viewport-fit=cover` stays; the bottom inset still applies.
- **Budgets:** every px budget in this plan is checked at 390, 360 and 340; a layout that does not fit at 340 is not done.

**World framing in battle** (owner WP5, `src/render/camera.ts`): the HUD tells the camera its insets (`top` = top band + minimap, `bottom` = tray + safe area). The camera fits the world so the ground line sits 12 px above the tray's top edge and the tallest unit plus its HP pips stays inside the band between the insets; sky and backdrop may run behind the top band and the tray (their scrims keep text readable), but unit feet, unit HP pips and the bases' damage never sit under HUD chrome. At 844 × 340 the band is 157 px and the camera zooms out to fit it rather than cropping units.

**Safe areas:** every edge-anchored element adds `env(safe-area-inset-*)`. Nothing interactive sits under the notch or the home indicator (T4).

**Grid:** 12 columns; gutter 12 (compact) / 16 (regular); outer margin 16 / 24 plus the safe area. On compact phones the content box is about 750 × 369.

**Vertical budget** (every tab screen): at 844 × 390, top bar or screen header 44, content 269, bottom bar 56, safe area 21; at 844 × 340, header 40, content 227, bottom bar 52, safe area 21. A sub-screen has a header of 44, an action bar of 64 (holding a 56 tall button) and 261 for content at 390; header 40, action bar 56 and 223 for content at 340. Anything taller scrolls inside the content area only; header and action bar never scroll away (fixes UA-03).

**Screen template** (`ScreenFrame`, UI-0):

```
+--------------------------------------------------------------+
| [<] Title                         [secondary actions] [×?]   |  header 44 / 56
|--------------------------------------------------------------|
|                                                              |
|  content (scrolls if needed; filters stick to its top)       |
|                                                              |
|--------------------------------------------------------------|
|  [tertiary]                  [secondary] [ PRIMARY BUTTON ]  |  action bar 64 / 80
+--------------------------------------------------------------+
```

### 3.2 Colour tokens

The palette moves from the cartoon purple-navy to a neutral dark slate with warm light. Neutral surfaces make rarity, team and tier colours read clearly, suit the realistic art, and stop blue and violet from being mistaken for team and Epic (UA-09). Tokens live in `src/ui/theme.css`; the old names stay as aliases for one phase and are then removed.

**Surfaces and text**

| Token | Value | Use |
|---|---|---|
| `--ui-bg` | `#0F1218` | app background behind screens |
| `--ui-surface-1` | `#1A1F29` | panels, sheets |
| `--ui-surface-2` | `#252C39` | raised rows, card wells, inputs |
| `--ui-surface-3` | `#313A4B` | selected row, hover |
| `--ui-edge` | `#6B7890` | control borders, dividers that must be seen (3.71:1 on surface-1) |
| `--ui-scrim` | `rgba(6, 8, 12, 0.72)` | behind sheets and modals, and behind text on art |
| `--ui-text` | `#F4EFE4` | primary text |
| `--ui-text-2` | `#C3BCAE` | secondary text |
| `--ui-text-3` | `#A39D91` | captions, hints; never on surface-3 |
| `--ui-ink` | `#1D1405` | text on gold and green buttons |

**Actions (the button grammar, U5)**

| Role | Face / light / lip | Label | Used for | Never for |
|---|---|---|---|---|
| Primary "go" | `#F2B52C` / `#FFD466` / `#B7801A` | ink | Play, Continue, Next battle, Try again, Open, Claim | secondary actions; more than one per screen |
| Progress | `#3CC46B` / `#8CEAA8` / `#1F8F45` | ink | Upgrade, Equip, confirm a spend, research pick | navigation |
| Secondary | `#46536A` / `#5D6C86` / `#2A3242`, edge `#6B7890` | text | Home, Back-style actions in bars, Modes, filters, Later, Cancel | a primary |
| Tertiary | transparent, text `--ui-text-2`, underline on hover | text-2 | Watch replay, Show odds, Skip | anything important |
| Destructive | `#C9392F` / `#E5675C` / `#8A231C` | white | Retreat, Reset save, Sell, Remove data | Close (×), which is neutral |

**Status (text and icons, never button faces)**

| Token | Value | Use |
|---|---|---|
| `--ui-good` | `#5FD08A` | "+12", claimable, valid drop |
| `--ui-warn` | `#F5A524` | advisor warnings |
| `--ui-bad` | `#FF7A6B` | deny reasons, invalid drop, low HP text |
| `--ui-info` | `--ui-text-2` | info icons (no blue: blue is team) |

**Reserved colours** (kept exactly from A10, A11; meaning only, never a button)

| Group | Tokens | Always paired with |
|---|---|---|
| Rarity | Common `#B8C0CC`, Rare `#22B8CF`, Epic `#A855F7` (text variant `#B77BF9`), Legendary `#F5B82E` | a gem shape (3.5) and a label in detail views |
| Team | me `#2F7DF6` (text variant `#5B9BFF`), foe `#F28A1E`; colourblind presets unchanged | side position, "YOU"/"AI" labels, the A11 redundant cues |
| Capsule tier | Clay `#9C6B4A` (text `#C08A62`), Bronze `#C27C3A`, Silver `#C9D1DC`, Jade `#2FBF71`, Gold `#EFE0B0`, Platinum `#C4F2EA`, Aeon `#5D3DFF`, each with a 1.5 px parchment outline | the lit ring count (1-5), the summit gems (0-2), the Legendary crests (0-3) and the tier name |
| Class | the Okabe-Ito based disc colours of `ClassIcon` | the glyph shape and the class word |

**Separation by object, not by hue.** Several reserved colours are near-identical in hue: Jade tier vs progress green (1.06:1), Silver tier vs Common (1.19), Aeon tier vs Epic (ΔE2000 13.2; the old violet was 5.0), Bronze tier vs foe orange (1.35), primary gold vs Legendary (1.03). Gold tier vs primary gold: the Gold tier is a pale champagne, ΔE2000 ≥ 12.3 from every button face. The A10 and A11 values stay (the capsule show and the team presets are built on them), so each group is confined to its own kind of object and always carries its non-colour cue:

| Group | Only on | Never on | Its non-colour cue |
|---|---|---|---|
| Button faces (gold, green, slate, red) | buttons with a lip and a verb | frames, bars, gems, text | the button shape and the verb |
| Rarity | card frames, rarity gems, the rarity word, reveal glows | capsules (except the Legendary crest on Gold, Platinum and Aeon capsules: the Legendary star on a dark shield, always the star shape), buttons, bars | gem shape (circle, rhombus, hexagon, star) |
| Capsule tier | capsule drums, capsule tiles' rims, tier pips, the tier name | cards, buttons, bars, text other than the tier name, battle | lit ring count 1-5, summit gems 0-2, crest count and the name |
| Team | battle, VS, Result sides, replay | meta screens, buttons, capsules | side position, "YOU" / "AI" labels |
| Progress green (`--ui-good`) | "+N" text, claimable marks, valid drop targets, full copies bars | capsule objects | a check or arrow glyph beside it |

So Jade never sits next to a green button (capsule tiles carry gold Open, never green), Bronze never appears in battle, and a Legendary frame is never a button.

**Contrast checks** (WCAG 2.x relative luminance, computed for this plan)

| Pair | Ratio | Needs | Result |
|---|---|---|---|
| text on bg / surface-1 / surface-2 / surface-3 | 16.35 / 14.40 / 12.23 / 9.97 | 4.5 | pass |
| text-2 on surface-1 / surface-2 | 8.75 / 7.43 | 4.5 | pass |
| text-3 on surface-1 / surface-2 / surface-3 | 6.12 / 5.20 / 4.24 | 4.5 | pass, pass, **fail**: not allowed on surface-3 |
| ink on primary gold / gold light | 9.89 / 12.87 | 4.5 | pass |
| ink on progress green | 8.06 | 4.5 | pass (white on green is only 3.59, so green buttons use ink) |
| text on secondary face | 6.77 | 4.5 | pass |
| white on destructive face | 5.11 | 4.5 | pass |
| gold / green / destructive face vs surface-1 | 8.98 / 7.31 / 3.23 | 3.0 | pass |
| secondary face vs surface-1 | 2.13 | 3.0 | fails alone, so secondary buttons always carry the `--ui-edge` border (3.71) |
| Rarity on surface-1: Common / Rare / Epic / Epic text / Legendary | 9.00 / 6.94 / 4.17 / 5.67 / 9.26 | 3.0 (graphics), 4.5 (text) | pass; Epic text uses `#B77BF9` |
| Team me / me text / foe on surface-1 | 4.23 / 5.96 / 6.63 | 3.0 / 4.5 | pass; "me" text uses `#5B9BFF` |
| Clay tier / Clay text on surface-1 | 3.63 / 5.55 | 3.0 / 4.5 | pass with the text variant |
| good / warn / bad text on surface-1 | 8.55 / 8.09 / 6.48 | 4.5 | pass |
| text on scrim over pure white art (72%) | 7.37 | 4.5 | pass (a 60% scrim gives 4.65, too close: 72% is the minimum) |
| focus ring white on bg | 18.75 | 3.0 | pass |
| Tier icons on surface-1 / 2 / 3 (the parchment outline) | 5.87 / 5.29 / 4.63 | 3.0 | pass (the Aeon fill alone is 2.81 / 2.39 / 1.95, so the outline carries WCAG 1.4.11) |

The old `--ui-dim` (#817AA8 on the old panel) was 3.47:1 and fails for text; it is retired.

### 3.3 Typography

**Faces.** A display face for titles and banners that works from the Stone Age to the Cosmic age, and a clear sans for everything else. Both are OFL, self-hosted as subset `woff2` (Latin with Danish æ ø å) so the game stays offline and free:

- Display: **Barlow Condensed** 700 (titles, banners, big result words, numbers in headlines), through the token `--ui-font-display`. A condensed poster face reads as neither Roman nor sci-fi, so it suits every era. About 20 KB subset.
- Era banners (region names on the map, "Bronze Age reached", walkout names) use `--ui-font-era`, one token per era group (ancient: Stone to Medieval; early modern: Gunpowder, Industrial; modern and future: Modern to Cosmic). In v1 every group points to the display face; an era face (for example Cinzel for the ancient group) may be added in UI-7 only if the font budget (≤ 80 KB added, 6.9) still holds.
- Text: **Inter** (variable, 500-800) for labels, body and numbers, with `font-variant-numeric: tabular-nums` on every changing number so counters do not jiggle. About 45 KB subset.
- Fallback stack until the files ship (UI-7): `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`. The rounded Nunito stack is retired (it reads cartoon, and it was never loaded anyway).

**Scale** (px; line-height in brackets). Eight steps replace the 25 sizes in use (UA-04).

| Token | Compact | Regular | Weight / face | Use |
|---|---|---|---|---|
| `--ui-fs-tag` | 11 (14) | 12 (16) | 800 Inter, caps, +0.04 em | NEW, AI, key badges, rarity word on tiles; always with an outline or on a solid plate |
| `--ui-fs-caption` | 12 (16) | 13 (18) | 600 Inter | captions, hints, stat labels, nav labels |
| `--ui-fs-body` | 14 (20) | 16 (22) | 500 Inter | body text, list rows, descriptions |
| `--ui-fs-label` | 14 (18) | 16 (20) | 800 Inter | button labels, tabs, chips, card names |
| `--ui-fs-title-s` | 16 (20) | 20 (24) | 800 Inter | panel titles |
| `--ui-fs-title` | 20 (24) | 24 (28) | 700 display | screen titles, level names |
| `--ui-fs-headline` | 28 (32) | 36 (40) | 800 Inter (numbers) / 700 display or era face (words) | big numbers (trophies, price), region names |
| `--ui-fs-display` | 40 (44) | 56 (60) | 700 display or era face | Victory / Defeat, "Level complete", walkout names (up to 80 on desktop for the Legendary banner) |

Rules:

- Nothing below 11 px anywhere, the HUD included. Card names on tiles are 12 px minimum; a long name wraps to two lines or scales down to 11 px, never ellipsis (fixes UA-24).
- Sentence case for body and most labels; caps only for tags and short button labels (≤ 2 words).
- Text on art always sits on a plate, on the 72% scrim, or has a 2 px `--ui-bg` outline plus a 0 2px 4px shadow.
- A **text size** setting (100%, 115%, 130%) scales every step except display (A2, K7). Layouts are tested at 130% and with the Danish pseudo-locale (+30% length), with these reflow rules:
  - **Reflows:** grids drop one column per step (6 → 5 → 4); button and chip labels wrap to two lines inside their height or the button grows in width, never ellipsis; body text and list rows wrap and the content area scrolls; panels scroll inside their content.
  - **Capped at 115%:** the battle HUD, the bottom nav labels, card tiles (names and costs) and the top bar, because their size is set by the frame; they already sit at or above the 11-12 px floor.
  - **Exempt:** display type and walkout banners (they scale down to fit, never up), numbers inside progress bars.
  - The budget spec at 130% and with the pseudo-locale checks clipping (`data-clip-check`) and page scroll on non-exempt elements, and the primary's visibility; it does not require the 100% layout to be unchanged.

### 3.4 Spacing, radii and elevation

- **Spacing** (4 px base): `--ui-s1` 4, `--ui-s2` 8, `--ui-s3` 12, `--ui-s4` 16, `--ui-s5` 24, `--ui-s6` 32, `--ui-s7` 48. Inside a group 4-8, between groups 16-24 (G1).
- **Radii:** `--ui-r-sm` 8 (chips, badges), `--ui-r-md` 12 (buttons, card tiles, inputs), `--ui-r-lg` 16 (panels), `--ui-r-xl` 24 (sheets), `--ui-r-pill` 999. Tighter than the cartoon 16 px buttons, to suit the realistic direction.
- **Elevation** (one key light from the top-left, 3.7):

| Level | Used by | Shadow |
|---|---|---|
| e0 | map, backdrop | none |
| e1 | panels, rows | inset `0 1px 0 rgba(255,255,255,0.06)`, `0 2px 6px rgba(0,0,0,0.35)` |
| e2 | buttons, card tiles | a 4 px lip in the lip colour, `0 6px 12px rgba(0,0,0,0.40)` |
| e3 | sheets, popovers, tooltips | `0 12px 28px rgba(0,0,0,0.50)` |
| e4 | modals | `0 20px 48px rgba(0,0,0,0.60)` over the 72% scrim |
| e5 | the dragged card, toasts, unlock spotlight | `0 24px 40px rgba(0,0,0,0.55)` |

### 3.5 Iconography

| Family | Shapes (distinct without colour) | Sizes | Notes |
|---|---|---|---|
| Classes (A18.9.1, built) | Infantry sword, Ranged bow, Heavy shield, Anti-armor spear through a plate, Siege lit bomb, Support cross, Air wings; markers Legendary crown, Turret tower, Age Power bolt; later Underground pick and Fort wall | 20 (tiles), 24 (tray), 32 (detail, legend), 48 (filters on desktop) | always in the same corner of a card (top-right); the class word under the name on md and larger tiles; one glyph set shared by UI and capsule (`src/core` path data) |
| Currencies | Amber: a faceted amber drop; Dust: a spark over a small heap; Trophies: a cup; battle Gold: a coin; XP: a four-point star; Charges: a lightning capsule | 20 inline, 24 chips, 32 panels | each chip opens its info panel with the A15.3 line |
| Rarity gems | Common circle, Rare rhombus, Epic hexagon, Legendary five-point star | 12 on xs tiles, 16 on sm-md, 24 on lg-xl | gem plus frame colour plus the rarity word in detail (A3) |
| Capsule tiers | the drum with 1-5 lit ring ticks, 0-2 summit gems and 0-3 crest stars | 32-96; below 32 a flat silhouette with a ★n badge | ring count, summit gems, crests and the name |
| War Path | node disc (normal), shield (Lieutenant), crowned banner (boss), small flag (side node), padlock, three star sockets, crown by difficulty with 1-5 points (Easy 1 ... Legendary 5) | nodes 56 / 72; stars 16 / 20; crowns 16 / 20 | crowns differ by point count, not only by metal colour |
| System | back (chevron left), close (×), gear, info (i), pause, speed, undo, lock, check, plus, filter, sort, replay, share-copy | 24 in a 44-48 hit area | universal icons may stand alone; any other icon has a label (H6) |

Icon style: a 2 px dark outline at 24 px (1.5 px at 20, 3 px at 48), two tones with a top-left highlight, drawn as SVG in `src/ui/components/icons.tsx` and `ClassIcon.tsx`. From 32 px up, class and currency icons may use an embossed metal disc (3.7). Icons never carry text inside them.

### 3.6 Components

All components live in `src/ui/components` (WP9); the HUD (WP5), the capsule summary (WP10) and app screens (WP11) use them instead of their own copies.

**Buttons**

| Size | Compact (h × min w) | Regular | Label | Use |
|---|---|---|---|---|
| XL | 64 × 176 | 80 × 240 | 20 / 24, 800 caps | Home Play only |
| L | 56 × 160 | 64 × 200 | 16 / 18 | the primary in an action bar |
| M | 48 × 112 | 52 × 128 | 14 / 16 | secondary actions, list-row actions (Claim, Equip) |
| S | 36 visual, 44 hit × 88 | 40 visual, 48 hit | 14 | rare inline actions (Show hint, Rename) |
| Icon | 40 visual, 48 hit | 44 visual, 48 hit | none, `aria-label` | back, close, gear, info, pause |

States (every button, same look everywhere):

| State | Look | Motion (5.5) |
|---|---|---|
| Default | face, top light band (35% of height, +8% light), lip 4 px, e2 shadow | none |
| Hover (desktop) | face +6% light, lifts 1 px | MR-02 |
| Pressed | scale 0.96, lip 4 → 1 px, face −6% light | MR-01, on `pointerdown` |
| Focus-visible | 3 px white ring, 6 px halo at 35% | none |
| Disabled | face desaturated 60% at 55% opacity, label kept at ≥ 3:1; tap shows the reason next to it | MR-03 (deny) |
| Loading | label stays, a 16 px spinner replaces the icon, width fixed | spinner only |
| Attention | breathing glow (the one pulse, U11) | MR-05 |
| Done | a check pops over the label for 600 ms, then the next state | MR-06 |

**Card tile** (one component, `CardTile`)

| Size | Compact | Regular | Where |
|---|---|---|---|
| xs | 48 × 64 | 56 × 76 | reward rows, scouted list, result recap |
| sm | 62 × 84 | 72 × 96 | battle tray on 844 px phones (72 × 96 from 900 px wide, 88 × 116 on desktop); Army slots and grid on compact screens |
| md | 72 × 96 | 96 × 128 | Army on regular screens, Customize grid, capsule summary |
| lg | 96 × 128 | 128 × 170 | the card over the Card detail stage, card preview in panels |
| xl | 180 × 240 | 240 × 320 | capsule reveal (Card detail uses lg over its stage) |

Anatomy, fixed for every size: cost top-left (coin plus number), class icon top-right, art in the centre with a vignette, level ribbon at the bottom ("Lv 4"), rarity frame and gem bottom-centre, name under the art (md and up), copies bar under the tile (Army grid). States: owned, not owned (silhouette and padlock), equipped (check badge top-left of the frame and a slot-coloured underline), NEW (dot), upgrade ready (green arrow on the copies bar, bar full and green), selected (lifted 1.06, e5), dragging (1.08, e5, 4° tilt), not usable here (greyed, reason on tap: "Bronze card: switch to Bronze"). Long-press 450 ms or hover 350 ms opens the tip (class, Strong vs, Weak vs), as built.

**Slots** (Army): the same size as the tile around them (sm on compact, md on regular), dashed 2 px `--ui-edge` border and a "+" with the slot kind ("Unit", "Turret", "Power", later "Fort") when empty; on drag start or card select, valid slots show a solid `--ui-good` green outline and a soft inner glow (green = valid drop, U5); the slot under the finger scales 1.04.

**Tabs and segmented controls**

- Bottom nav item: 88 × 56 (compact) / 120 × 72; active = lit plate, full-colour icon and white label; badge top-right of the icon.
- Top tabs (Progress, Customize, Settings sections): 44 / 48 tall, label always visible, a 3 px underline indicator that slides (MR-11).
- Age tabs (Army): 44 / 48 tall, age icon plus short name ("Stone"), a status mark on the right (green check = valid and full, amber "!" = advisor warning), horizontal scroll with the current age centred.
- Segmented (difficulty, format, stance in settings, presets A/B/C): 44 / 48 tall, the selected pill slides.

**Chips and pills:** filter chips 36 visual, 44 hit, icon plus label (icon-only allowed only on desktop with a tooltip, never on phones: fixes UA-12's icon-only filters); info pills (AI, tier, "Hard") 24 tall with 12 px text, not interactive, flat (no lip) so they do not look pressable (N1).

**Badges:** dot 10 px; count 20 px tall, min 20 wide, 12 px bold; green = claimable or upgradable, red only for "needs attention" errors (a save problem). No badge animations after the pop-in (U11).

**Panels:** on compact screens a side panel from the right, 58% of the width (min 440 px), full height inside the safe areas, left corners `--ui-r-xl`, a 4 × 32 grab handle on its left edge (swipe right to close), × top-right, title left; the screen to its left stays visible under a 50% scrim, so the map and the node stay in view next to Play. On regular screens panels are centred, up to 720 wide. The panel's primary sits in its own bottom-right action bar, where Play is on Home. Never a panel on a panel, except an info panel (2.2).

**Modals:** up to 480 × (height − 48) compact, 560 × 480 regular; title, one sentence, the price and the result for spends ("Upgrade Bonker to Lv 5 for 400 Amber: HP 320 → 336"), two buttons (Cancel secondary left, action right).

**Popovers and tooltips:** anchored to their element with a 10 px arrow, max 280 wide, 12-14 px text, e3; never cover the element that opened them or the screen's Back button (fixes the desktop War Plan tooltip over the header, UA-11).

**Toasts:** 44 tall, max 360 wide, 14 px, anchored above the control that caused them (or top-centre for global events), 2.6 s, max 2 at once, Undo button when reversible (UA-22, UA-16). Screens with many quick edits (Army, Customize) use one header Undo instead of a toast per edit (4.2).

**First-seen caption:** the first time an invented term or meter appears (Amber, Dust, charges, Supply, Clay, War Chest, trophies, stars), a one-line caption (≤ 8 words, 14 px, on a plate with a pointer) sits beside it for 4 s or until the next tap: "Amber: upgrades your cards". Tapping it opens the info panel. It is shown once per term (`SaveDoc.flags['ui-seen.<term>']`) and never covers the primary.

**Progress bars:** thin 10 / 12 px (copies bar, XP), main 16 / 20 px (War Chest, level progress, Trophy Road) with the numbers inside or beside at ≥ 12 px ("13/20"); a bright 6 px leading edge; milestone icons sit on the bar.

**Counters and currency chips:** 36 / 40 tall, icon 24, tabular number 16 / 18 bold; tap opens the info panel; changes count (MR-20) and bump on arrival (MR-21).

**Info panel:** a panel (the one kind allowed over another panel) with the term's icon at 48, one-sentence meaning, how you get it, what it is for, and the A15.3 honesty line where it applies. Every invented term on screen links to one (U9).

**Empty states:** an icon, one sentence saying what to do, and the action ("No capsules yet. Win a level to earn one." [Play level 4]).

**Action bar:** 64 / 80 tall, fixed at the bottom of sub-screens and sheets, primary at the right edge, secondary to its left, tertiary at the left edge.

### 3.7 The ultra-realistic art direction in the UI frame

The owner chose ultra-realistic art (A18.9.5). The UI must frame that art, not compete with it or look like a cartoon laid over a painting. Rules:

- **Materials, restrained.** Panels are dark slate with a faint cool grain (a 2-3% noise texture) and a 1 px top highlight, like oiled dark metal or stone. Primary buttons read as polished brass (a warm gradient, a specular band across the top third, a darker brass lip). Green reads as enamel on brass, secondary as gunmetal, destructive as red lacquer. Card frames are thin brushed metal in the rarity colour with a bevel; the card stock has a slight inner shadow. Do not use wood planks, rivets, parchment scrolls or ornate filigree behind text: they add noise at 390 px height.
- **One light.** A key light from the top-left at about 45° for every UI surface: highlights on top-left edges, shadows falling bottom-right, specular bands on metal at the top. It matches the world art's light direction; if the art track settles on a different sun direction for the backdrops, the UI follows it in one token (`--ui-light-angle`).
- **Depth.** Five elevation levels (3.4). Figure and ground (G5): the map and battle art stay at full detail and colour; UI panels over art use the 72% scrim or a solid surface; on desktop High preset panels over the map may add an 8 px `backdrop-filter` blur (never on phones or Lite, for performance).
- **Colour in the frame.** The frame is neutral and dark so the art and the reserved colours carry the colour. Warmth comes from the brass accents and the text colour (`#F4EFE4`), not from coloured panels.
- **Realistic, not skeuomorphic, icons.** Glyphs stay simple and readable at 20-24 px; from 32 px they may sit on an embossed metal disc with the same top-left light.
- **Motion with weight.** Realistic frames move with mass: large panels decelerate without bounce and impacts get a 40-120 ms hold rather than a cartoon wobble. Small things the player touches (buttons, cards, chests, badges, numbers, stamps) keep their full `back` overshoot and squash: that bounce is what makes a tap feel good, and reviewers must not flatten it. The battle world follows its own realistic rules (5.8).
- **Swappable art.** Panel textures, frames and button materials that use images are registered in the visual manifest under `ui.frame.*`, `ui.button.*`, `ui.card.frame.<rarity>`, `ui.warpath.region.<ageId>.<layer>` and `ui.icon.*`, delivered through the art service like all art (B5). Every one has a CSS-only fallback (gradients and shadows) that looks finished on its own, so the UI never waits for images.

### 3.8 Copy and i18n

- Every string in `src/i18n` (`ui.en.json`, `hud.en.json`, `capsule.en.json`); Danish in v1.1, so every layout is tested with the +30% pseudo-locale.
- Buttons are verbs with their object when useful: "Play level 4", "Upgrade · 400", "Open", "Claim", "Equip", "Try again".
- Onboarding and pointer lines ≤ 8 words. Deny reasons ≤ 4 words ("Need 40 gold", "Army full", "Bronze card").
- Numbers: thousands separators, "+12" for gains, never negative framing for losses of a reward.
- Forbidden copy (A15.3): "last chance", "we missed you", countdowns to rewards, "Nothing is lost while you're away".

---

## 4. Key screens

Each screen lists layout (phone first), states, the primary, and the motion rows it uses. Principles are cited where they decide something.

### 4.1 Home and the War Path map (S2, S2a, S2b, S2c, S2d)

Home is the Battle hub (2.3, owner decision 2026-09-30). The War Path map below is the sub-screen S2c: Back top-left, "Campaign" and the region and level in the top bar, the star total top-right, the level plate over "Play level N" (the one primary) bottom-right; no tab bar (a sub-screen).

**Richer map (owner decision 2026-09-30: "the path looks far too simple").** Every region is a themed, layered, animated landscape: the far skyline with the age's landmark and drifting clouds (parallax 0.5), the ground with rolling hills under the horizon, a body of water (a lake with reeds, a sea shore with bobbing boats, a river, a canal, an energy channel, a star-void) and two landmark set pieces beside the road (Stone: a cave camp with a fire and a mammoth skeleton; Bronze: a temple and a statue; Medieval: a keep and a tourney camp; Gunpowder: a star fort with cannon smoke and a windmill farm; Industrial: a smoking factory and a railway with a moving train; Modern: a turning radar and a helipad with a helicopter; Future: a hovering platform and a beacon; Cosmic: a swirling portal and floating rocks), props of the age off the road, lanterns between the nodes (lit on the way walked, dark ahead), a near layer of dark plant and rock silhouettes along the bottom edge (parallax 1.3), and flocks of birds crossing now and then. Code-drawn SVG in `regionArt.tsx`, `regionScenery.tsx` and `mapDeco.tsx` until the art track paints the layers; everything still under reduce motion.

**Map rendering.** DOM plus SVG in `src/ui/screens/warPath` (WP9), so nodes are real buttons (keyboard, screen reader, the budget test) and the UI layer needs no Pixi. Region art comes as 3 parallax image layers per age (`ui.warpath.region.<ageId>.far|mid|near`) through the art service; until the art track paints them, the existing backdrop layers are used, cropped. The road is an SVG path with dotted segments; nodes are placed along it at data-driven points.

**Layout of the road.** Horizontal, left to right (landscape), one region per age (10 main nodes, 2 side nodes on short branches). Node spacing 120 px (compact) / 160 (regular), so about 5 nodes show on a phone and 7 on desktop. Region borders are visible: the art changes, a gate arch stands on the road, and the region name sits on a banner ("Bronze Age: Hellas").

**Road placement.** The road runs through the upper 60% of the map band, so the level plate and the bottom row never cover a node; the current node sits at about 45% of the width.

**Nodes** (56 / 72 px discs, 48+ hit):

| State | Look |
|---|---|
| Beaten | full colour, 1-3 stars in sockets under it, crown badge for the best difficulty |
| Current | lifted on a small plinth, the level plate points at it, soft light ring; the one pulse on Home is on Play, not on the node |
| Next but locked | visible, 60% saturation, padlock |
| Far ahead | fading into mist, shapes still readable (bosses always visible: G4, B-rank 2) |
| Elite: Lieutenant (L5), Spike (L9) | shield-shaped node with a "Hard" tag and crossed swords behind it |
| Treasure (a level whose first clear gives a named card, L3) | a chest floating on the node, closed with a glint until won, then open with gold |
| Story (a level that teaches something, A18.7.5) | a scroll floating on the node until it is beaten |
| Boss (L10) | a larger (72 / 96) banner node with the General's portrait and AI badge, in its lair: spiked banners either side and torches that light up and glow once the boss can be fought |
| Current (any kind) | a bouncing gold marker above it, sonar rings, the plinth and the banner-bearer beside it |
| Side node | small flag on a branch, "Optional" tag |

**Interactions.** Drag to pan (1:1, inertia, rubber band at the ends; no pan starts within 20 px of the screen edges, 2.2). Tap any node: the Level preview panel grows out of it (MR-12). What the preview offers depends on the node:

| Node tapped | Preview shows | Action bar |
|---|---|---|
| Current, or beaten (replay) | everything below | "Play level N" / "Replay level N" (gold) |
| Side node (unlocked) | everything, with "Optional" | "Play" (gold) |
| Locked (normal or Lieutenant) | the General, the level name, the first-clear reward, the reason | no primary; a padlock line "Beat level 4 first" and "Go to my level" (secondary), which closes the panel and pans to the current node |
| Far boss | the General's portrait, the boss disclosures (A18.7.6), the reward, the reason | as locked; the boss's idle taunt plays once as the panel opens |

When a level is first cleared the road draws to the next node, its padlock bursts into shards with a light ring and dust puffs, and the node drops in with a squash (MR-41). A "Back to my level" chip (44 tall, arrow toward the current node, the node's number on it) slides in at the screen edge nearer the current node when it leaves the view (MR-18). On return from a win the level-complete ceremony plays (MR-41); after a boss, the region ceremony (MR-42). The player's **banner-bearer** (a small figure with the player's base flag, WP4 art through `ui.warpath.marker`) stands on the current node; after a win it marches along the road to the next node (MR-48), and on Play it steps into the node (part of MR-15). **Pokeable map:** the ≤ 8 ambient props (birds, smoke, grass, water) react to a tap on empty map (birds scatter, grass sways; MR-49), as a small delight that never takes the pulse.

**Level preview panel (S2a).** Top: the General portrait (72) with the AI badge, name, tier and personality line ("Plays by the same rules as you"), level name and role ("Level 5 · Lieutenant · Hard"). Then one row each: objective ("Destroy the base" or "Hold out until 4:00"), window ("Stone and Bronze"), modifiers with icons. Then one **goals and reward strip**: the three star sockets with their goals as short captions (★ win, ★★ the disclosed goal, ★★★ the goal on Hard or harder; the ★★ and ★★★ captions only after the level is first beaten or from L5) and the first-clear reward at its right end. Then the difficulty segmented control (5 options, each with its AI tier; shown after the first clear or from L5, 2.6) and "Edit army" (secondary; a cross-tab jump that returns here). Action bar: "Play level 5" (gold). Boss disclosures (+50% base HP, extra turret) sit in a highlighted row (A18.7.6). Phone budget at 390: header 44, content about 230 (portrait block 72, three rows of 32, the strip 40, difficulty 44 would be 252, so the content scrolls by about 20 px; the action bar never scrolls).

**Modes panel (S2b), reworked 2026-10-01 into the switcher's chooser.** One card per row under "vs players" (listed first: Friend Duel, locked with "Arrives with online play" until M2; Online Battle and Ranked join when they work) and "vs AI" (Ladder, the default; Quick Battle; Daily Challenge; Skirmish with "Set up"; Conquest with "Open board"). Home also shows one quiet, locked "Friend Duel · Later" chip left of the switcher (owner decision 2026-10-01, "the friend entry shown as coming later"); a tap opens this panel on the Friend Duel note and never selects or starts anything. A tap selects the mode and closes the panel; the selected card has a check; the panel has no primary. The paragraph below is the earlier design. **Earlier Modes panel (S2b).** One card per row (fixes UA-01), 72 px tall, each with icon, name, one plain line, its reward line and its own "Play" (gold on the selected card, slate on the others; tapping any card selects it). The Ladder has no card: it is Home's own Battle (2026-09-30). Pickers stay small and inline: Quick Battle (difficulty chip; "5 Amber per win"), Daily Challenge (tier chip Recruit / Veteran / Warlord, today's modifier, "Copy result" after playing), Conquest until A18.7.10 ("0/27 stars", Open board). **Skirmish** has no inline picker: its card's button reads "Set up" (slate) and opens the Skirmish setup sub-screen (S2d) with its own action bar, closing the panel. Mode cards use neutral surfaces, not coloured headers (U5).

**Skirmish setup (S2d).** A sub-screen: General or Echo grid on the left, then difficulty, format, start era, speed and Standard levels as segmented rows on the right; action bar "Play" (gold). Its last settings are remembered inside Skirmish only.

**States of the map.** A beaten region (the next region's gate open). All levels beaten (Play replays the last level; the Campaign card on Home says "Every level beaten"; "Veteran Path" when A18.7.8 ships).

**States of Home.** First launch and the onboarding (2.6: Battle starts the training matches, the plate names their AI General). The Ladder hub. A stopping card after 22:00 (A15.6): Battle stays but loses the pulse, and a calm "Good night" line replaces the pointer.

### 4.1b Progress (S13)

The Progress tab gathers every long-term goal (one home, 2.2). Top tabs: **Goals** (default), **Trophy Road** (from L6), **Feats**, **Record** (the Profile's numbers; the Profile sub-screen keeps name and banner).

- **Goals:** the three active quests (progress bars, reward icons, one gold Claim on the first claimable), the War Chest bar ("War Chest 13/20") with its first-seen caption, and the quest swap as a secondary button with a confirm that names the cost ("Swap this quest? 1 swap per day.") and an Undo toast for 5 s (fixes UA-16). The honesty line "New quests arrive each day. Up to 21 can wait for you." sits as a caption under the list (A15.3).
- **Trophy Road:** 4.11. **Feats:** 12 tiles, "???" and the riddle until found, "Show hint" (S button).
- Phone budget at 340: header with tabs 40, content 227 (three quest rows of 56 + War Chest 44 + gaps = 228, so it fits without scrolling), tab bar 52, safe area 21.

### 4.2 Army: loadouts and the troop collection (S9)

Owner direction: an intuitive deck builder with six troops per age, drag or tap to equip, class filters, counters and the advisor visible (A18.9.3). Review direction: one home for every troop card, like Clash Royale's Cards tab, with Info and Upgrade reachable from the deck. Army replaces both the War Plan and the Collection's Troops tab.

**Built 2026-09-30 (owner request: "easier to see which soldiers you take into battle, which you have not picked, and below that which you have not unlocked yet").** The two-column layout below is replaced by three sections top to bottom for the selected age; the header, the gesture matrix, Undo, Auto-fill, presets, the advisor and the motion are unchanged:

```
+----------------------------------------------------------------------------------+
| [<] [↶] [Rush▾] [Stone ✓][Bronze !][Medieval ✓]...          [Auto-fill] [Who beats whom] |  header 44
|----------------------------------------------------------------------------------|
| ✓ IN BATTLE  TROOPS 5/6 (class lines) | TURRETS 2/2 | POWERS 1/2 | Avg Lv 3.9        |  fixed band,
| [t][t][t][t][t][ + ]                  | [tu][tu]    | [H][F🔒]   | ! No anti-armor   |  never scrolls
|----------------------------------------------------------------------------------|
| AVAILABLE · 5   Tap a card, then Use, or drag it onto a slot                        |  the pool
| [card][card][card][card][card]                                                      |  scrolls
| ───────────────────────────────────────────────────────────────────────────────── |
| 🔒 LOCKED · 4   You own 13 of 17 Bronze cards                  [Card Album 110/136] |
| [?][?][?][?]  (greyed silhouettes; "Time Capsules", "War Path 5", "Road 700")       |
+----------------------------------------------------------------------------------+
```

- **In battle** is a fixed band (green-tinted, the same place every visit): the ten slots in one row (58 px wide on phones, 88-96 on desktop), grouped Troops | Turrets | Powers with a count over each group ("Troops 5/6"; the Field slot counts only once open). The class lines of the War Council sit next to the band's title; the right end holds the advisor's first warning (tap: the advice sheet) or the selection hint, and on phones the average level.
- **Fort group (A16.14.7, built 2026-09-30 for F2; drawn once battles play the Fort slot, `FORT_SLOT_IN_BATTLE`):** a fourth group "Fort 1/1" after Powers, one slot in the fort stone frame with the kind glyph top-right, the cost chip and the pop ("6") where a troop shows its level. Empty: a dashed "+ Fort"; locked: a padlock, "Fort" and both routes on two short lines, "Bronze 4" and "or 🏆 400" (a tap says "War Path Bronze 4 or 400 trophies"; fixer 2026-10-01: a ladder-only player must see the trophy route too). With it the band's gaps go to 6 px on desktop (88 px slots and the advisor column keep their room in 1,206 px) and to 4 px on phones, where the side column keeps only "Lv 3.9" and the advisor's mark (its sentence is the chip's label and the advice sheet; the hint goes, since the pool's header says the same). Measured at 844 × 390: slots end at 740 of 794, side column 63 px, `scrollWidth = clientWidth`; at 1280 × 720 1,206 of 1,206. A Camp in the plan puts a small camp badge on the Infantry research line ("Levies are Infantry: the Infantry line helps them"). Once the save's Fort slot is open (never before: no fort reward shows before the unlock, A16.14.6), fort cards join Available and Locked after the powers with their source ("War Path 6", "Road 2,300", "Comes with the Fort slot"); a fort dropped on another slot bounces back with "Forts go in the Fort slot". The counter legend gains "Heavy beats Fort". Card detail shows the kind, what it does, Strong vs / Weak vs (Heavy always, the legend is a floor) and the answer, a lane diagram of your half (the five pads with the kind's lit, the turret cover, the fort to scale, a tower's reach from each Home pad and the p 560 line), the numbers, "No levels", the trait chips and the source.
- **Available** holds the owned cards of this age that are not in battle, troops then turrets then powers, in full colour with level and copies. Tap and Use, tap a card then a slot, tap a slot then a card, or drag a card up to a slot (on touch the drag starts sideways, so a vertical swipe scrolls the pool; MR-30 to MR-36). A card that goes into battle leaves the pool with its flight; the one it replaces flies back into Available. With a slot selected the pool narrows to what fits (the green "Troop cards ✕" chip clears it).
- **Locked** holds the cards of this age not found yet as greyed silhouettes with a padlock, each with its source under it (Time Capsules; "Capsules · Arena N" when the current arena does not drop that age yet; "War Path 5" or "Road 700" for powers); tap one for Info (Card detail offers Dust crafting). The section line counts the age ("You own 13 of 17 Bronze cards", or "All 17 Stone cards found!") and holds the **Card Album** button (4.3).
- Removed: the "This age / All cards" switch, the class, rarity, owned and sort filters and their chips (they live in the Card Album now), and the "In your army" copy of the loadout in the grid.

**Phone layout (844 × 390; the same at 844 × 340 with 42 px less grid):**

```
+----------------------------------------------------------------------------------+
| [↶ Undo] [Stone ✓][Bronze !][🔒 More ages]    Avg Lv 3.4  [Auto-fill]  [? Who beats whom] |  header 44 / 40
|--------------------------------------------+-------------------------------------|
| [Inf][Rng][AA] · ! No anti-armor [why]      | [This age | All cards 34/56]  [filter▾] |  28 / sticky 40
| [unit][unit][unit][unit]   [power]          | [card][card][card][card][card][card]  |
| [unit][unit][turr][turr]   [fort ]          | [card][card][card][card][card][card]  |
|                                             |  (grid scrolls; this column only)     |
+--------------------------------------------+-------------------------------------+
| [Army][Capsules][ WAR PATH ][Progress][Customize]                                  |  nav 56 / 52
```

**Budget at 844 × 390** (content 269; at 340 content 227):

| Part | Width | Height |
|---|---|---|
| Left column: class strip and advisor row | 334 | 28 |
| Slot grid, 4 × 2 sm slots (62 × 84, 6 gaps): row 1 four units, row 2 two units and two turrets | 266 | 174 |
| Side column: power above Fort (sm, 62 × 84 each; the Fort slot is a dashed "Fort · later" placeholder until A18 phase 6) | 62 + 6 gap | 174 |
| Left column total | 334 | 28 + 8 + 174 = 210 ≤ 227 ≤ 269 |
| Right column: segmented "This age / All cards" and the filter button (sticky) | 750 − 334 − 12 = 404 | 40 |
| Grid: sm tiles, 6 columns (6 × 62 + 5 × 6 = 402), copies bar 8 under each | 402 | 269 − 40 = 229 (2.3 rows); at 340: 187 (1.9 rows) |

- **Header:** Undo (icon plus label, enabled after a change, 2.2), the age tabs (only reached ages, each with its status mark: green check = valid and full, amber "!" = advisor warning; one padlock tab "More ages" for the rest), the average level (from L3, counts on change), Auto-fill (secondary), and "Who beats whom" (opens the built `CounterLegend` as a popover). Presets A/B/C join the header after the first boss as a small segmented control left of the age tabs (U8).
- **Class strip and advisor row:** the class icons this loadout holds (research compatibility, A18.5.2), then the advisor's warning when there is one ("! No anti-armor", amber, with the missing class icon; "why?" opens a small popover). Classes are also on every tile, so this row is a summary, not the only place.
- **Right column:** "This age" (default) shows the cards of the selected age that fit its slots; "All cards" is the album: every troop, turret, power and Fort card of every age, with age chips, its completion count ("34/56") and a completion bar (MR-63). The filter button opens a small popover with class chips (the 7 player classes plus Turret and Power, the same vocabulary as the cards), rarity gems, Owned / All and sort (Level, Rarity, Cost, Ready to upgrade); the active filters show as removable chips next to it. Unowned cards are silhouettes with a padlock and their source on tap ("Silver Capsule and up", "War Path Bronze, 20 stars"). Equipped cards show the check badge and "In army". Upgrade-ready cards show the green arrow (U4).
- **Desktop:** the same two columns at regular sizes (md tiles, 3 × 2 unit slots plus turrets, power and Fort), and the legend inline under the slots.

**Gesture matrix** (one meaning per gesture; nothing waits for a double-tap):

| Where | Tap | Long-press 450 ms | Drag |
|---|---|---|---|
| Grid card | selects it: the card lifts (MR-30) and a small action bar pops above it: **Use** (green, when it fits this age), **Info**, and **Upgrade** (green) when an upgrade is ready; the slots it fits glow green | the tip (class, Strong vs, Weak vs), as everywhere | starts only when the finger moves 8 px and the move is mostly horizontal (within 35° of the x axis) toward the slots; a mostly vertical move scrolls the grid |
| Filled slot | selects it: action bar **Info**, **Remove**; the grid filters to the cards that could replace it | the tip | drag to another slot swaps; drag onto the grid removes |
| Empty slot | selects it; the grid filters to the cards that fit | none | none |
| Selected card, then a slot | places the card in that slot (MR-32) | | |
| Selected slot, then a grid card | places that card in the slot (MR-32) | | |
| Anywhere else | clears the selection | | |

- **Use** places the card by the A3 "Equip now" rule: the first empty slot, else the same-class slot, else the lowest-level slot, and the replaced card flies back to the grid.
- **Info** opens Card detail (MR-12). **Upgrade** opens Card detail with the upgrade already in its confirm state (4.4).
- **Undo:** one Undo in the header keeps every change of this visit (equip, swap, remove, auto-fill) and reverses them one at a time with their reverse motion; it clears when the player leaves Army. No toast per edit; only Auto-fill shows one line ("Auto-filled 4 slots"), because it changes many slots at once.

Invalid actions are prevented, not failed: a card of another age cannot be used here (its Use button is absent and a tap on the Use area explains "Bronze card: switch to Bronze"); dropping outside a slot returns the card (MR-33). No red × on every card (UA-11).

**States:** a full valid loadout (age tab check), a loadout with advisor warnings (amber "!", never a blocker), a loadout with fewer than 3 units (red "!" and "Needs 3 units" because it would not be playable; auto-fill fixes it at match start, A3), empty slot, a newly reached age (auto-filled, the banner "Auto-filled · tweak it?" in the advisor row until the first edit), first visit (pointer "Tap a card, then Use").

**Delight:** NEW cards wobble once (±3°, 300, `back`) the first time Army opens after they arrive; Legendary frames carry a static sheen and one light pass when they first scroll into view (never a loop, U11).

### 4.3 Collection (retired as a tab) and the Card Album

The Collection tab is gone (2.2): cosmetics live in Customize's album (4.5), Feats in Progress (4.1b). **Built 2026-09-30 (owner request: "a page with a long scroll like a Pokedex, where you can see which ones you have and which you do not have in each age"):** the Collection route is the **Card Album**, opened from Army's Locked section (and Home's collection link). Its Cards tab:

- **One long vertical scroll grouped by age.** Each age has a sticky header (age chip, name, "12/17", a completion bar that turns gold with a "Complete!" badge; "Time Capsules from Arena N" when the current arena does not drop it yet). Sections render lazily (`content-visibility`), so the scroll stays smooth on phones.
- **Numbered tiles.** Every troop, turret and power has an album number (No. 001 is the first Stone troop; ages in order, troops, turrets, powers; the number never changes with a filter). Owned: full colour with level and the copies bar. Missing: a dark silhouette with a "?" and where to find it under it. Tap any tile for Card detail.
- **A sticky bar:** the total ("110/136 found · 81%" with a bar), Have / Missing / All, a Filters sheet (rarity, class; progressive disclosure) and the age chips ("🪓 17/17"), which jump to an age (smooth scroll, instant with Reduce motion) and light up for the age in view. On phones the bar is one row and the chips scroll inside it.
- The Skins and Feats tabs stay as built.

### 4.4 Card detail (S11)

**Phone layout:**

```
+----------------------------------------------------------------------------------+
| [<] Spear Hunter   [AA icon Anti-armor] [Stone] [Rare ◆]                      [i]   |  header 44 / 40
|------------------------------+---------------------------------------------------|
|  (lane stage, full column:    |  Strong vs  [Heavy icon]  "Pierces armour."        |
|   the unit idles, walks,      |  Weak vs  [Infantry icon] "Cheap swords swarm it." |
|   attacks on a 3 s loop)      |  HP 320 (+16)   Damage 42 (+2)   DPS 35 (+2)       |
| +--------+                    |  Range 40   Speed 60   Cost 70   Train 3.0 s      |
| | lg card|  Lv 4              |  Skins: [o][o][locked]                             |
| +--------+  copies 8/10       |  (abilities and tags below, scroll inside column)  |
|------------------------------+---------------------------------------------------|
|  [Show odds]                          [Use]  [ UPGRADE · ◆ 400  Lv 4 → 5 ]         |  action bar 64 / 56
+----------------------------------------------------------------------------------+
```

- **One hero:** the left column (300 wide) is the lane stage with the unit in motion (idle, walk, attack, 3 s loop; B-rank 19) filling the column's full content height (261 at 390, 223 at 340). A **lg** card (96 × 128) sits over the stage's bottom-left corner with the level and the copies bar beside it (128 + 8 margin fits 223). The xl card is used only by the capsule reveal.
- **Right column:** class and counter rows first (the owner's request: Strong vs / Weak vs as class icons plus one plain sentence), then the stat table with the next-level green deltas (kept from today), skins, and the long lists (abilities, tags, per-card counters) below the fold inside the right column only.
- **Action bar never scrolls** (fixes UA-03): Upgrade (green, with price and "Lv 4 → 5") when copies and Amber suffice; otherwise the same button in the same place, disabled, saying what is missing ("Need 2 more copies", "Need 120 Amber") and not marked `data-primary` (U1); Use (secondary) places the card in its age's loadout by the "Equip now" rule, or reads "In army" (flat pill) when already equipped; Show odds (tertiary) for cards from capsules.
- **Upgrade in two taps** (U10, the Clash Royale model): the first tap is the anticipation beat: the button turns into **"Confirm · ◆ 400"** in place (MR-38b), the stat rows highlight their green deltas, and the lg card lifts and starts to glow; a tap anywhere else cancels. The second tap spends and plays the level-up ceremony (MR-39). When the price is more than half of the player's Amber, the confirm text adds "Leaves ◆ 120". The button re-arms 600 ms after the ceremony with the next price, so a double tap cannot spend twice (UA-08).
- **Turrets, powers and forts** use the same template (the stage shows the turret firing, the power's area or the fort on a small lane).

### 4.5 Customize (S12)

Owner: many cosmetic collections and a Customize screen where you see them. Customize is the one home for every cosmetic: the album and the wardrobe in one screen.

**Phone layout:** left 55%: the **live preview stage** (Pixi through an app-provided slot, 4.5 note): your base of the selected age with its skin, base flag, national flag and decorations on a strip of lane; one of your troops in front of it with its skin; the emote and quote play as a bubble over the base. An age picker (chips) under the stage switches the base's age. Right 45%: category tabs, each with its completion count ("Flags 6/24"): Base (base skins, decorations), Flags (base and national flags), Troops (unit skins), Voice (emotes and quotes), Banner & title; under the tabs a sticky collection filter (collection name, rarity, Owned / All). The grid shows every item of the category, owned or not, with rarity gems, owned state and the "Equipped" check; unowned items are silhouettes with their source on tap. The header has one Undo (as in Army) for equip changes of this visit.

- Tap an item: it is **previewed at once** on the stage (try-on; MR-60), without equipping. The action bar's primary becomes "Equip" (green). Tap Equip: MR-61. Leaving without equipping restores the equipped look.
- Locked item: preview still works (seeing what you can earn is motivating and honest), the action bar shows the source ("Earn: Wardrobe Crate") instead of Equip. Nothing can be bought.
- Counts: one source of truth (the collection model), so the header and tabs can never disagree again (UA-15).
- Base decorations snap to fixed anchors that never cover mounts or HP (A18.9.4); an anchor picker shows the free anchors as dashed rings on the preview.
- Desktop: the preview is larger (60%) and the unit can be rotated by dragging.
- **Backdrops tab (built 2026-09-30, owner request "skins for your battle background"; A18.9.4).** Between Bases and Flags. The preview is the lane's own painting of your half in the chosen age (the same painters and theme pass as the battle) with the theme's weather moving over it (an animated layer, still with Reduce motion) and your base in front; a name plate says the backdrop and "Trying on" for a locked one. Age chips switch the age it shows. The grid: Classic skies first, then every backdrop (owned first) as a 16:9 thumbnail tile with rarity, Equip or its source and Dust price. Tapping any tile tries it on; an owned one is equipped at once with the Undo toast; a locked one is never equipped. A backdrop change cross-fades into the preview (420 ms, `out`).

Note: the UI layer cannot import Pixi (B2). WP11 provides a `PreviewStage` slot the same way it mounts the battle canvas, and WP4's base and unit views render into it; WP9 lays out the screen and sends the selected ids.

### 4.6 Capsules tab (S8) and the capsule summary

- **Capsules tab:** a shelf of capsule tiles (the drum at its visible tier: a Win or Supply Capsule shows its start tier and kind name until opened, a fixed-tier capsule its tier, crests and name; the source: "From level 4", "From finishing matches"), the selected one large on the left with Open (gold) and "i" (the odds and pity panel with the A15.3 line; the full panel also shows once before the first open of each *visible* tier). The one-time "Two new capsule tiers" card sits at the top of this tab until closed. Every capsule on the shelf can be opened now: charges never block opening (A6: they decide whether a ladder win earns a capsule), so Open is never disabled and the tab's badge counts the shelf. "Open all" (secondary) when 2 or more wait. Beside the shelf, the three banks, each shown only after its first progress (2.6), each as an icon, a label, its value and under it the A15.3 caption **"Holds up to N. When full, it stops filling."** (12 px): charges ("Charges 12/28 · each ladder win with a charge brings a capsule"), the Supply allowance ("Supply Capsule: 2 more matches"), the Clay meter ("3 pips make a Clay capsule"). No timers. Wardrobe Crates sit on the same shelf with their own look.
- **Charges on the Result:** a ladder win without a charge says so where the capsule would have been: "No charge left: +1 Clay pip" with the Clay pip flying to the meter, and the charges line below it, so the player learns the rule at the moment it matters.
- **Opening:** the tile grows into the capsule stage (MR-50), then A10 as built and polished by WP10.
- **Summary** (WP10, fixes UA-18): cards stagger in in reveal order (MR-52); NEW cards show "Equipped" as a state label (flat pill, not a grey button) or an "Equip" (green) when not auto-equipped; copies bars read "8/10" and never "5/2" (over-full bars cap and show "Upgrade ready"); Amber flies into the Amber chip (MR-21). One primary at the right, by where the capsule was opened: from the Result, the Result's own path ("Continue" to the map after a War Path win, "Next battle" in other modes; 2.5); from the Capsules tab, "Open next (2)" while more wait there, else "Done" (back to the tab). "Upgrade" (secondary) jumps to Card detail for the best ready upgrade, in its confirm state, and returns here; "Home" (secondary) when the primary is not already Home. On leaving, new cards fly to the Army tab and cosmetics to Customize (MR-53); a new cosmetic also offers "Try it on" (a cross-tab jump that returns here).
- **Honesty panels** (UA-19): the full odds and pity panel before the first open of each tier, on the first capsule of the save and in every odds panel; during later capsule shows a compact "Odds" chip (44 hit, 12 px label) that opens the panel, so the peak moments are not crowded. This changes A9 #8 ("on every capsule"), listed in 2.9 for the lead's sign-off. All capsule-show text is at least 12 px, checked by the canvas hook (1.3).

### 4.7 Battle HUD (S4, S4a, S4b, S5)

Owner directions: six troops per battle, the Age Power dragged onto the field, class icons on cards, turret mounts on the base, the stance control, and the War Council when A18 adds it. The HUD stays a DOM overlay (A9.2) and follows the same tokens.

**Phone 844 × 390 (usable width 750):**

```
+--------------------------------------------------------------------------------------+
| [Stone ◉ HP ████ 100% / XP ██ 44/680]  2:41 [emote]  [AI ◉ HP ████ / ⚡ring][Scouted][||][1x] |  top band 44
|                    [◂ base][====== minimap strip ======][front ▸]                     |  minimap 24 (+10 hit)
|                                                                                      |
|                        lane band: units, ground line 12 px above the tray            |  lane ≈ 207 (157 at 340)
|                                                                                      |
| [◉ 1,240 +6/s ][c1][c2][c3][c4][c5][c6]  [Stance] [Fort] (HOME) (FIELD)             |  tray 94
| [Army 44/60  ][Council][Evolve]                                                      |
+--------------------------------------------------------------------------------------+
```

| Element | Phone size | Desktop | Notes |
|---|---|---|---|
| Top band | 44 tall | 56 | two rows inside each side block: HP bar 14 tall with the percentage at 12 px, and under it the XP bar 10 tall with "XP 44/680" at 12 px; the age icon 32 at the block's outer end; clock 16 px bold; the AI chip 11 px tag on a plate |
| Minimap | 24 visual; its hit area is 44 tall (10 px above and below the strip), and the part that overlaps the lane only accepts touches that start there, so lane drags are never stolen | 32 | base and front buttons 44 × 44 hit |
| Pause, speed | 36 visual, 44 hit | 40 / 48 | top-right (rare actions, T3) |
| Scouted chip | 44 tall, 72 wide | 44 | drop-down as built, collapses after 3 s |
| Tray | 94 tall | 128 | gold at 14 px and income at 12 px on one line (drop "+Income · 200", UA-04); the army counter "Army 44/60" (A9.2) at 12 px on the line under it |
| Left cluster | 100 wide: the gold and army lines (40), then Council (48) and **Evolve** (48) side by side | 132 wide | Evolve moves from the top-left to the left thumb (UA-05, T3); a ring shows XP; it glows steadily and breathes when ready (the one pulse); it stays dark for 2 s after an evolve even with full XP (UA-07). The Council button carries the research ring (A9.2) |
| Six unit cards | 62 × 84 each, 6 px gaps (402) | 88 × 116 | from 900 px wide 72 × 96; class icon top-right, cost top-left, name 11-12 px (two lines, no ellipsis), radial training fill, queue count badge, key badge on desktop only |
| Fort button (A16.14.7, built for F2) | 56 × 56 in the placement dock after the stance (52 below 820 px) | 96 | not a card: a rounded square in a stone frame with a pad plinth, the fort's art, the kind glyph top-right, the cost chip top-left (red with a filling gold underline while short), a recharge ring with the seconds, pips for forts up and "2/2" at the cap, the pop under the art, "Forts crumble" in Siege. Drag onto a pad (the pads the kind may use light up: green safe, amber "Builds under fire", grey with "Enemy near", "Army first", "Taken"; Field pads are drawn only for a Camp; the ghost snaps within 24 px, a tower shows its reach); tap = aim, then tap a pad or the minimap (nearest legal pad); D = most forward safe pad; long-press or hover = the tip. The stance stands between it and the unit cards, so the train-on-release row keeps one meaning. Not drawn without a Fort card |
| Stance | one 56 × 56 button showing the current stance icon and its 11 px label | 64 | replaces the three-segment control (DESIGN change, 2.9). **Press-drag-release:** press opens a flyout of the three stances stacked upward (48 tall each, over the lane edge for the moment of the gesture), slide to one and release to choose; or tap to open and tap an option. S and Shift+S unchanged |
| Age Power | 88 round | 112 | drag is primary (built); the READY tag sits inside the ring, not clipped (UA-14) |
| Last Stand | 56 round, floats above the power only while armed | 64 | over the lane edge while armed, which is a rare, short state |
| Opponent power ring, Last Stand horn | 24 each inside the enemy block | 28 | the horn replaces the enemy's age icon while their Last Stand is armed |

**Width check, tray with the Fort button (built, measured 2026-09-30):** at 844 the six cards take 356 px (56 px with 4 px gaps), the stance 56, Fort 56, powers 56 each: cards 125-481, stance 498-650 (its flyout slot), Fort 656-712, powers 718-836, `scrollWidth = clientWidth`; at 800 × 360 and 667 × 375 cards 52 × 70, Fort and powers 52; at 1280 Fort and powers 96. The pre-build plan: at 844 (750 usable): left cluster 100 + 8 + six cards 402 + 6 + Fort 62 + 8 + stance 56 + 8 + power 88 = 738 ≤ 750. Below 820 px wide (800 × 360: 768 usable, or 780 with notch insets: about 686) the cards shrink to 56 × 76 (6 × 56 + 5 × 5 = 361, Fort 56) and the left cluster to 92: 92 + 6 + 361 + 5 + 56 + 6 + 56 + 6 + 80 (power) = 668 ≤ 686. Never a second row (B-rank 15).

**Width check, top band** (750): own block 190 (age icon 32 + bars and labels 150 + 8) + 8 + clock 48 + 8 + emote 44 + 8 + enemy block 200 (AI chip 28 + age icon or horn 24 + bars 140 + 8) + opponent power ring 24 + 8 + Scouted 72 + 8 + pause 44 + 8 + speed 44 = 722 ≤ 750. Below 820 px wide the emote button moves into the Pause card and Scouted collapses to a 44 icon: 722 − 52 − 28 = 642.

**Height check:** at 390: top band 44 + minimap 24 + lane 207 + tray 94 + inset 21 = 390. At 340: 44 + 24 + 157 + 94 + 21 = 340; at 360 (no inset): 44 + 24 + 198 + 94 = 360. The camera keeps unit feet and HP pips inside the lane band (3.1, world framing).

**Progressive HUD** (U8, 2.6): the top band, the tray's unit cards, gold, Evolve and the power are there from match 1 (A8 teaches them); stance, the army counter, the Council, the Fort card and Last Stand appear from the match whose tutorial beat introduces them, never earlier. Until then their space is simply empty gap, so nothing jumps when they arrive; each arrives with a small pop (MR-25) the first time.

**Rules:**

- Actions along the bottom, status along the top; nothing persistent over the lane band (A9.2).
- **One pulse** at a time (U11). Priority when several are ready: a tutorial target, then Evolve, then the Age Power, then a new mount. World status effects (the low-HP vignette of A9.2) are not attention pulses and do not count, but they follow U14 (soft, at most 3 flashes per second). The others show a steady "ready" state (glow at rest), not a loop. Affordable tray cards glow and rest; they never keep moving (UA-14).
- **Denied presses say why** next to the card: "Need 40 gold", "Army full", "Legendary in field", "Queue full" (MR-03). A legend for the queue seconds: the radial fill plus a small clock icon with the seconds.
- **Train on release** (U10): a tray card trains when a press ends within 450 ms and moved less than 8 px; the pressed look still shows on `pointerdown` (U3). A press held to 450 ms opens the card's tip instead (MR-07's ring shows it coming) and never trains. Keys train on keydown.
- **Card info:** long-press 450 ms (touch) or hover (desktop) opens the tip; the 24 px "i" badge is removed; the first battle with 4+ cards teaches it once: "Hold a card to see its counters" (UA-06).
- **The Hold flag:** when Hold is chosen the flag stands over the own front (A18.4). If A18.4 lets the player move the hold line, the flag has a 48 × 48 grab handle (its pole), and only a drag that starts on the handle moves it; every other lane drag pans the camera (A17.4). The tap alternative: choose Hold again in the stance flyout ("Move flag"), then tap the lane.
- **Turret mounts** are tapped on the base in the canvas with a hit radius of at least 24 px on screen; the mount popover uses 14 px names, 12 px prices, 48 px option rows, disabled rows with the reason, and a scrim edge so it reads over the lane (UA-26).
- **War Council (A18 phase 3):** the round Council button in the left cluster (a ring while research runs, a dot when something is affordable, G key). The sheet replaces the tray (tray slides down, sheet slides up, 180 ms each as A18.5.7 says), 110 px tall on phones: four track cards 172 × 86; tapping a track flips it in place to its two picks (icon, name, one line, cost, time); the chosen pick stamps (MR-73). At most 2 decisions on screen. The lane stays visible and the game keeps running; Esc or the button closes it.
- **Pause:** the card under the minimap (built), Resume 48 tall (UA-21), Settings secondary, Retreat red, small, at the far end from Resume with at least 24 px between them.
- **Evolve staging:** see MR-80.

### 4.8 VS (S3)

Kept (the audit found no major issue). Changes: it starts by itself after 2 s (U2: no extra tap), "Tap to start now" replaces "Tap to start"; the "VS" slam gets MR-15; boss disclosures and modifiers use the icons of the level preview so the player recognises them.

### 4.9 Result and rewards (S6)

One Result design for every mode (training included; fixes UA-10). The app's onboarding Result (`src/app/ui/ResultScreen.tsx`) is replaced by the WP9 screen with an onboarding variant.

**Phone layout:** left half: the result banner (display type: "Victory", "Defeat", "Draw") with the stars earned on the level badge (War Path) or trophies (ladder), the recap row (MVP card xs tile, base damage, time, units trained and killed). Right half: the staged rewards (A15.13: at most 3 steps plus a feat step) and one summary row that expands on tap. Nothing scrolls inside a box; the right half scrolls only if expanded. Action bar:

| Situation | Primary (gold, bottom-right) | Secondary | Tertiary |
|---|---|---|---|
| War Path win | Continue (to the map: MR-94, then MR-41; Play is then 1 tap) | Home is the same place, so none | Watch replay |
| War Path win with a capsule earned | Open capsule (the summary then continues to the map, 2.5) | Continue (the capsule waits on the shelf) | Watch replay |
| War Path loss | Try again (straight to VS) | Home; after 3 losses in a row "Try Easy" (A18.7.4) | Watch replay |
| Ladder, Quick Battle, Skirmish | Next battle (same mode and settings, straight to VS) | Home | Watch replay |
| The same with a capsule earned | Open capsule (the summary's primary is then Next battle) | Next battle | Watch replay |
| Daily | Home | Copy result | Watch replay |
| Night (22:00-06:00) or a stopping card (A15.6) | Home | Continue / Next battle | |
| Onboarding L1 | Open capsule | none | none |

When a capsule is earned the next battle is still 1 tap away as the secondary (U2). A Win Capsule reward shows its start tier and "Win Capsule", never its rolled tier. An "Upgrade" chip appears in the recap when a card became upgradable during this match; it jumps to Card detail in its confirm state and returns here (2.2).

Staging: MR-90 (victory) or MR-91 (defeat), then the rewards (MR-21, MR-22), then the primary arrives last with the pulse. A tap anywhere skips to the end state. A trophy loss is shown calmly (MR-27): the number steps down once, no count and no red; a loss's earned Amber still counts up (positive framing). The MVP tile does a small one-shot victory pose on a win (MR-90).

### 4.10 Settings (S15)

- Sections as top tabs on desktop and as a single scroll with sticky section chips on phones: **Sound** (Master, Music, SFX, UI), **Display and motion** (graphics preset, reduce motion, shake, hitstop, damage numbers, quick reveal, default speed), **Accessibility** (text size 100/115/130%, colourblind preset, vibration), **Play** (break reminder, language), **Save** (export, import, reset), **About** (odds overview, For parents, credits, event log export).
- Every control shows its current value (H6); changes apply at once with a preview where possible (text size changes the settings screen live; reduce motion plays a 1 s demo tile).
- Touch devices hide desktop-only options such as edge scroll (UA-27); keyboard hints show only on desktop.
- Reset save is red, at the bottom of Save, with a typed confirm ("Type RESET") because it cannot be undone.

### 4.11 Trophy Road and Profile

- **Trophy Road (S13a, inside Progress):** a horizontal road like the War Path (A9 #12 said vertical; changed in 2.9) (same node, star and claim visuals, G4), opening on "You"; claim buttons always on the same side of the road (UA audit note); nodes show the reward icon and the trophy threshold with a trophy icon so "50" and "110" are not confused (UA-17).
- **Profile (S14):** name, banner and match history; its numbers are the same model as Progress's Record tab, consistent numbers from one model (UA-20: wins and "no matches yet" never together); the banner and arena chips deduplicated; "All opponents in this version are AI." kept.

---

## 5. Motion and juice

### 5.1 Motion principles

1. **Purpose first.** Every animation does one of six jobs: feedback, continuity, attention, state change, celebration, life (M1). A row in 5.5 names its job.
2. **Direction explains space.** Deeper screens grow in from what you tapped; going back shrinks into it. Tabs slide from their side. Rewards fly to where they are kept. Sheets rise from the edge or the button that opened them (M4, B-rank 20).
3. **Weight through timing.** Light things (chips, toggles) move in 150 ms, panels in 220-300 ms, screens in 300-400 ms; heavy things (a capsule, a boss node, a base) are slower and hold on impact.
4. **The five beats** for anything that matters: anticipation, action, impact, follow-through, residue (M5). Size by event class (5.3).
5. **Staging.** One focal point: while a ceremony plays, everything else holds still and dims to 50-60%.
6. **Never block.** Input during a transition completes it at once or retargets it; ceremonies skip to their end state on tap; nothing longer than 1 s is unskippable (R1, U12). In battle nothing ever takes the camera or the controls away: the evolve beat (MR-80) ends the moment the player drags the lane, taps the minimap or starts a power drag. On Home, Play interrupts any ceremony: it jumps to the end state and starts the battle.
7. **Same feel on DOM and canvas.** CSS, TS tweens in the UI, the capsule show (Pixi) and the HUD use the same tokens, so a button, a card flip and a capsule land feel like one game.
8. **Realistic weight** (3.7): big panels decelerate without bounce; small pieces the player touches (buttons, badges, cards, chests, numbers) keep their full overshoot. The battle world is realistic and uses the rules of 5.8, not squash and stretch.
9. **Feel it (haptics).** On Android, the moments that land also land in the hand (5.4). iOS Safari has no vibration; the visual and sound carry it there.

### 5.2 Tokens

One source: `src/core/motion.ts` (owner WP0, integers only, so core's float rule holds: durations in ms, curve control points in thousandths). `src/ui/theme.css` defines the same values as CSS variables, and `src/ui/components/motion.ts` exports TS helpers for DOM tweens; WP10 and WP5 import the core values for Pixi tweens. A test (WP12) proves the CSS variables equal the core values.

**Durations**

| Token | ms | Use |
|---|---|---|
| `press` | 70 | pointer-down squash; must start in the same frame |
| `release` | 140 | release with overshoot |
| `micro` | 150 | hover, toggles, chips, tab indicator, reduced-motion fades |
| `small` | 220 | tooltips, popovers, toasts in, list items in, small reveals |
| `medium` | 300 | sheets, modals, screen transitions on phones, container transforms |
| `large` | 400 | screen transitions on desktop, camera pans on the map; upper limit for navigation |
| `smallOut` / `mediumOut` / `largeOut` | 160 / 200 / 280 | exits (about 0.7 × the entrance) |
| `stagger` | 40 per item, total ≤ 240 | grids, reward rows, tray flips |
| `countS` / `countM` / `countL` / `countXL` | 400 / 600 / 800 / 900 | count-ups for a change of ≤ 10 / ≤ 100 / ≤ 1,000 / more |
| `fly` | 500 (± 50 per token, jitter from a UI-only seed) | tokens flying to a counter |
| `hold` | 60 (UI impact) / 120 (medium moments) | the impact pause |
| `beat` | 600-1,500 | one celebration beat (medium and large classes only) |
| `breathe` | 2,000 period | the one attention pulse; sheen sweep every 3,500 |
| `longPress` | 450 | long-press to info (built value) |
| `tipHover` | 350 | hover to tip (built value) |

**Easing curves** (exactly these, plus `linear` for real-time progress and spinners)

| Token | CSS | Use |
|---|---|---|
| `standard` | `cubic-bezier(0.2, 0, 0, 1)` | moves on screen, shared-axis slides, map pans |
| `enter` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | things arriving (sheets, screens, toasts) |
| `exit` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | things leaving |
| `out` | `cubic-bezier(0.22, 1, 0.36, 1)` | general decelerate, fills, count-ups |
| `back` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | pops, lands, bumps, release overshoot (small elements only) |
| `anticipate` | `cubic-bezier(0.36, 0, 0.66, -0.56)` | wind-ups before a fling (pull back, dip) |

Core stores them as `[200, 0, 0, 1000]` and so on. This replaces the 55 durations and 30+ curves in use today (UA-23).

**Standard transforms:** press scale 0.96; lift 1.06 (select) / 1.08 (drag); bump 1.15 → 1; pop-in 0 → 1.15 → 1; shared-axis offset 24 px (tabs 16 px); screen Z 0.96 → 1 in, 1 → 1.04 out.

### 5.3 Event classes and budgets

| Class | Examples | Max length | Allowed | Skip |
|---|---|---|---|---|
| Micro | press, tab, toggle, filter, hover | 200 ms | squash, fade, slide | not needed |
| Small | equip, claim, toast, collect Amber, badge | 600 ms | fly-to-counter, bump, 6-12 sparks, one sound | a tap completes it |
| Medium | upgrade, level complete, unlock, Epic reveal, research done | 2 s | burst, count-up, stamp, dim background, a 120 ms hold | tap skips to the end |
| Large | evolve (in battle), boss beaten, first Legendary walkout, region opens | 10 s the first time, 3-6 s after | full staging, spotlight, camera move, screen kick, music sting | tap skips (the first Legendary walkout may hold up to 10 s, A10) |

Rules: medium and large moments queue, never overlap; repeats get shorter (the second level-complete of a session drops the camera pan to 200 ms; quick reveal shortens medium and large moments but keeps honest pre-signals).

### 5.4 Sound tiers

| Tier | Motion tier | Existing ids | New ids (request to WP6, ZzFX first) |
|---|---|---|---|
| Tick | press, toggle, tab | `ui_click`, `ui_toggle`, `ui_tab`, `ui_hover` | none |
| Pop | popovers, badges, chips, card lift | `meter_pip`, `emote_pop` | `card_lift` (a soft paper lift), `ui_pop` |
| Whoosh | panels, screens, flights | none | `ui_sheet` (a short cloth swish), `ui_whoosh` (a screen transition air), `reward_fly` (a light rising swish) |
| Place / stamp | equip, research pick, claim stamp | `ui_confirm` | `card_place` (a card set on wood with a metal click), `ui_stamp` (a brass stamp) |
| Chime | claims, counts, ready states | `coin_gain`, `copy_tick`, `upgrade_ready`, `power_ready`, `evolve_ready` | `counter_tick` (one soft tick for count-ups, pitched up by the caller) |
| Fanfare | medium and large moments | `level_up`, `upgrade_slam`, `victory_jingle`, `defeat_jingle`, the capsule set | `ui_unlock` (a lock break and a rising shimmer), `star_stamp` (one per star, pitched +2 semitones each), `path_draw` (a quick scribble of rising plucks), `node_drop` (a soft thud with a bell), `region_open` (gates and a short brass sting), `vs_slam` |

One sound per event, never stacked; sounds land on the impact frame; all go through the UI bus with the A13 limits (4 voices per id, 40 ms retrigger gap). The War Path ids are the "node, star and crown sounds" A13 already plans.

**Haptics** (Android through `navigator.vibrate`; nothing on iOS Safari). Every catalogue row's haptic is set by its tier here, so the tables in 5.5 do not repeat it. One shared helper (`src/ui/components/haptics.ts`, WP9; the capsule stage and the HUD call the same patterns through a request) enforces the rules: the Settings "Vibration" toggle (on by default on touch), at most one vibration per 100 ms, none while the document is hidden, and none in the background of a medium or large moment except its own impact. Reduce motion does not turn haptics off; the vibration setting does.

| Haptic tier | Pattern (ms) | Rows |
|---|---|---|
| Tick | 8 | the primary button press (MR-01 on primary buttons only), card lift (MR-30), slot snap (MR-31), toggle (MR-04), tray train (MR-65), power pick-up (MR-70, built 8) |
| Thump | 18 | card place (MR-32, MR-35), stamps (MR-23, MR-45, MR-61, MR-73), star stamp (MR-41, one per star), node drop, power drop (MR-70, built 18), denied press (MR-03, 12) |
| Heavy | [30, 30, 60] | upgrade impact (MR-39), unlock crack (MR-40), VS slam (MR-15), victory banner (MR-90), region opens (MR-42), own evolve morph (MR-80), base destroyed |
| Capsule | as built in `capsuleStage.ts` (25-35 ms strikes, [50, 30, 80] and [40, 30, 90] for the big reveals) | A10 steps; kept |

Never on: hover, scrolling, count-up ticks, flying tokens, ambient motion, enemy events.

### 5.5 Motion catalogue

Every interaction in the game with its motion. Durations use the tokens; "R:" is the reduced-motion variant (5.6). Owners: WP9 for meta UI unless the row says otherwise.

**A. Controls**

| ID | Interaction | Class | Anticipation | Action | Reaction (impact, follow-through, residue) | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-01 | Any button press | micro | the press itself is the anticipation | on `pointerdown`: scale 0.96, lip 4 → 1 px, face −6% (70, `standard`) | on release: to 1.02 and back to 1 (140, `back`); the action fires on release inside the button | `ui_click` on release | face darkens and lip collapses with no scale |
| MR-02 | Hover (desktop) | micro | none | lift 1 px, face +6% (150, `out`) | none | `ui_hover` only on primary buttons and cards | brighten only |
| MR-03 | Denied press | micro | none | red flash on the face (120), shake ±4 px for 2 frames | the reason label pops next to the control (220 in, holds 1.5 s, 160 out) | `ui_deny` | red outline for 300 ms plus the label |
| MR-04 | Toggle, segmented, chip select | micro | none | knob or pill slides to the new position (150, `standard`) | lands with a 1.05 overshoot (`back`); label weight changes | `ui_toggle` / `ui_tab` | instant position, 150 colour fade |
| MR-05 | Attention pulse (the one next action) | life | none | scale 1.00 ↔ 1.03 and glow 40% ↔ 80% (`breathe` 2,000, sine) | a sheen sweeps across every 3,500 ms; stops as soon as it is used | none | a static glow outline |
| MR-06 | Action done (button) | small | none | a check pops over the label (0 → 1.15 → 1, 220 `back`) | fades after 600 ms into the next state | `ui_confirm` | check fades in and out |
| MR-07 | Long-press to info | small | a ring fills around the finger over 450 ms | the tooltip grows from the card (0.9 → 1, 150) | stays until release or tap outside | `ui_toggle` (soft) | the ring fades in instead of filling; tooltip fades |
| MR-08 | Slider drag | micro | none | the value bubble follows 1:1 | a tick every 10% step | `ui_click` (quiet, per step) | same, no bubble motion |
| MR-09 | Toast (with Undo when reversible) | small | none | enters from the nearest edge next to its source (220, `enter`) | holds 2.6 s (Undo 4 s), exits 160 (`exit`); Undo reverses the action with its own reverse motion | by tone: `ui_toggle`, `ui_confirm`, `ui_deny` | fade in and out |

**B. Navigation**

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-10 | Bottom tab switch | micro | the tab icon presses (MR-01) | shared axis X: outgoing content 24 px away and fades (160, `exit`); incoming 24 px from the tab's side (220, `enter`); the lit plate slides under the new tab (220, `standard`) | the new tab's icon pops 1.15 → 1 (220, `back`) | `ui_tab` | 150 cross-fade; the plate jumps |
| MR-11 | In-screen tabs (Progress, Customize, Settings, age tabs, Army's "This age / All cards") | micro | none | shared axis X with 16 px (150 / 220); the underline slides | the grid staggers in only on first view (MR-17) | `ui_tab` | cross-fade |
| MR-12 | Tile or node to detail (Card detail, Level preview, capsule tile to stage) | small | the tile presses | container transform: the tile grows into the screen or panel (300, `standard`); the rest dims to 60% and scales 0.98 | children stagger in (40 each, max 240); Back reverses into the same tile (200, `exit`) | `ui_whoosh` (soft) | 150 cross-fade |
| MR-13 | Push to an unrelated sub-screen (Settings, Profile, Trophy Road) | small | none | shared axis Z: incoming 0.96 → 1 and fades in (300, `enter`); outgoing 1 → 1.04 and fades (200, `exit`) | Back reverses | `ui_whoosh` (soft) | cross-fade |
| MR-14 | Panel open and close (Modes, odds, info, Level preview from the plate or a node) | small | the scrim starts fading to 50% (220) | on compact screens the panel slides in from the right edge (300, `enter`), on regular screens it rises and fades in centred; content staggers (40) | close: slides back out (200, `exit`); a swipe right follows the finger 1:1 and closes past 30% or a flick | `ui_sheet` | fades |
| MR-15 | Home → VS → battle | medium | Play dips (`anticipate`, 90 ms, scale 0.94) and its sheen flashes; the banner-bearer steps into the node (200) | the map camera zooms into the node (400, `standard`), fade-through to VS; the two sides slide in from their edges (300, `enter`); "VS" slams from 1.6 to 1 (160) with a 60 ms hold and a 2 px kick | after 2 s (or a tap) fade-through (300) into the battle | `ui_confirm`, `ui_whoosh`, `vs_slam` | fades, no zoom, no kick |
| MR-16 | Modal open and close | small | scrim fades in (150) | panel 0.92 → 1.02 → 1 and fades in (220, `back`) | close 160 (`exit`) | `ui_toggle` | fade |
| MR-17 | First view of a grid or list | small | none | items fade in with an 8 px rise (220, `enter`), 40 stagger in reading order, max 6 steps | only on the first entry of a session, never on every return | none | all fade at once (150) |
| MR-18 | Map pan and "Back to my level" | micro, the return small | none | pan follows the finger 1:1 with inertia (friction 0.95 per frame), rubber band 30% at the ends; the level plate fades to 30% and slides 24 px aside while panning; the chip slides in from the edge nearer the current node (220) when it leaves view, its arrow pointing the way | tap the chip: the chip presses and flies toward the node as the camera pans there (400, `standard`, the far regions' parallax layers slide at their speeds); on arrival the node's plinth bumps (1.08, 220 `back`), the banner-bearer waves once, and the plate slides back (300) | `ui_whoosh` (soft) on the return | the camera jumps with a 150 fade; the plate fades back |
| MR-19 | Loading lazy content | micro | none | skeleton plates with a slow shimmer (1,600 period) | content fades in (150) when ready; never a blank frame over 100 ms | none | static skeleton |

**C. Numbers and rewards**

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-20 | Count-up of a gain | small | none | the number rolls from old to new (`countS`-`countXL`, `out`), tabular digits | bump 1.15 → 1 on arrival (220, `back`); a "+120" chip rises 12 px and fades over 1 s | `counter_tick` every ~60 ms (max 8), pitch rising | the new value fades in (150) with the "+N" chip |
| MR-20b | Spending (Amber, Dust, gold) | micro | none | the number counts down quickly (300, `out`), no bump | a "−400" chip fades in place | none | new value fades |
| MR-21 | Fly-to-counter (Amber, Dust, trophies, stars, XP) | small | the source pops 1.1 (90) and bursts 3-12 tokens that scatter 80-120 px (150, `out`) | tokens fly on arcs (control point 30% above the line) to the chip (`fly`, 40 stagger) | the chip bumps on each arrival (1.08, 120) and counts (MR-20); the sum shows once | `reward_fly` on launch, `coin_gain` per arrival (throttled 40 ms), `ui_confirm` at the end | no tokens; the chip glows (300) and updates |
| MR-22 | Progress bar fill | small (medium at a milestone) | none | fills with a bright leading edge (400-600, `out`) | at a threshold: a 120 ms hold, 8 sparks, the milestone icon pops 1.2 → 1; a full War Chest shakes, bursts and a capsule flies to Capsules (MR-51) | `meter_pip`, `upgrade_ready` at a milestone | the fill fades to the new width (150); the milestone icon glows |
| MR-23 | Quest claim | small | the quest card shakes 2 px (90) as the Claim press lands | a "Done" stamp drops from 1.6 to 1 (160, `standard`) with a 60 ms hold | rewards fly (MR-21); the card collapses (220) and the next quest slides in | `ui_stamp`, then the MR-21 sounds | stamp fades in; rewards per MR-21 R |
| MR-24 | New item joins a tab (card to Army, cosmetic to Customize, capsule to Capsules) | small | the item lifts from its source (100) | it flies on an arc to the tab icon (500, `standard`) and shrinks to 30% | the tab icon bumps (1.15, 220) and its badge pops or flips to the new number | `reward_fly` | the badge updates with a fade |
| MR-25 | Badge appear, change and clear | micro | none | appear: 0 → 1.15 → 1 (220, `back`); number change: digits flip vertically (150) | clear: shrink to 0 (150, `exit`); no looping badge motion | none | fade |
| MR-26 | Trophy change after a battle | small | none | trophies count (MR-20) along the arena bar (MR-22) | crossing an arena gate is medium: the gate opens (600) and the new arena name drops (display type) | `counter_tick`, `region_open` at a gate | counts per R, gate fades |
| MR-27 | Trophy loss after a battle | small | none | the trophy number steps down once (150 cross-fade of the digits), no count, no red; the arena bar eases back (300, `out`) | never below an arena gate (the gate stays lit); a loss's Amber still counts up (MR-20) | none | fade |
| MR-28 | First-seen caption for a new term or meter (Amber, Dust, charges, Supply, Clay, War Chest, trophies, stars) | small | the chip or meter pops in (MR-25) | the caption plate slides out from it (220, `enter`) with its pointer | holds 4 s or until the next tap, then folds back into the chip (160) | `ui_pop` | fades in and out |

**D. Cards and the deck**

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-30 | Select a card (tap path) or start a drag | micro | none | lift 1.06 (select) or 1.08 (drag), shadow to e5 (100, `back`); a drag follows the finger 1:1 with a 4° tilt toward the motion; the origin keeps a 40% ghost | valid slots light up (`--ui-good` green outline, 150); on the tap path they wiggle once (±2°, 200) and the card's action bar (Use, Info, Upgrade) pops above it (150, `back`) | `card_lift` | lift shown as outline and shadow only; slots glow |
| MR-31 | Drag over a slot | micro | none | magnetic snap within 24 px: the card eases toward the slot centre; the slot scales 1.04 | the card in the slot slides 6 px aside to preview the swap | none | outline only |
| MR-32 | Place or equip a card (drop, tap-tap, Use, Equip now) | small | on tap paths the card pulls back 4-6 px (60, `anticipate`) | arc flight to the slot (280, `standard`) | lands with squash 0.94 → 1.03 → 1 (180, `back`); the slot rim flashes in the card's rarity colour (120) with 6 sparks; the grid copy gets its check (MR-25); the replaced card flies back to its grid spot on an arc (280); the average level counts (MR-20); the advisor chip cross-fades | `card_place` | the slot cross-fades to the new card (150) with a rim colour flash; no flight |
| MR-33 | Invalid drop | micro | none | the card returns along its path (220, `out`) | a small shake at the origin and the reason ("Bronze card") | `ui_deny` (soft) | the card fades back with the reason |
| MR-34 | Remove a card from a slot | micro | lift (MR-30) | flies back to the grid (240, `standard`) | the slot shows the dashed "+" (fade 150); the header Undo enables (MR-06 style pop) | `ui_toggle` | fades |
| MR-35 | Swap two slots | small | both lift | the two cards cross on arcs, one over and one under (280) | both land with MR-32's squash | `card_place` | cross-fade both slots |
| MR-36 | Auto-fill | small | the button presses | slots fill one after another, each a short MR-32 from the grid (60 stagger, total ≤ 800) | the age tab's check pops (MR-25) | `card_place` every second card | slots cross-fade together |
| MR-37 | Age tab switch in Army | micro | none | MR-11 for the grid; the loadout cards flip on the Y axis to the new age (180, 30 stagger) | none | `ui_tab` | cross-fade |
| MR-38 | Filter or sort change in a grid | micro | none | leaving items shrink to 0.9 and fade (120); staying items move to their new place with FLIP transforms (220, `standard`); new items fade in (20 stagger, max 160) | none | `ui_tab` | the grid cross-fades |
| MR-38b | Upgrade: first tap (the confirm state, U10) | micro | the Upgrade button presses | the button's label slides up and "Confirm · ◆ 400" slides in (150, `standard`); the lg card lifts 1.04 and a faint charge glow starts (220); the stat rows' green deltas brighten (150) | holds until the second tap; a tap elsewhere reverses it (160) | `ui_toggle` | label cross-fade, deltas brighten |
| MR-39 | Card upgrade, on the confirm tap (Card detail; also the first forced upgrade with a longer 500 ms anticipation and the hand pointer) | medium, ≤ 2 s, tap skips | Amber tokens fly from the Amber chip into the card (300, reverse MR-21) while the card trembles (±2 px, 8 Hz) and the charge glow builds, all within the same 300 | a burst of light from the card and a shine sweep across the frame (150) | impact: a 120 ms hold; the level number flips (old drops 12 px and fades, new pops 1.4 → 1 with `back`, 220, running with the first stat row); follow-through: stat rows tick one by one (60 stagger, at most 5 rows = 300) with green "+N" chips that rise and fade (600, overlapping the stagger); residue: the copies bar resets with a fill, the plan's average level counts up; the button re-arms after 600 ms with the next price. Total: 300 + 150 + 120 + 300 + 600 = 1,470 ms ≤ 2 s (the re-arm is not part of the moment) | charge swell (`evolve_riser` short until `upgrade_charge` exists), `upgrade_slam` on impact, `level_up`, `counter_tick` per stat | no tremble or flip: glow (300), the level cross-fades, deltas appear as green chips |

**E. War Path, progress and unlocks**

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-40 | Feature or tab unlock (Army, Capsules, Modes, Customize, Progress, Ladder, Daily) | medium, ≤ 1.6 s, tap skips | the rest of Home dims to 50% except Play (220); the padlock shakes 3 times (±6°, 240) | the padlock cracks and bursts into 6 pieces (150) | the item turns from grey to full colour with a light sweep (300) and pops 1.2 → 1 (`back`, 220); a pointer line (≤ 8 words) with "Open" (secondary) beside the item; Play stays the only gold button and the only pulse; taps outside the pointer go through to Home (no "tap anywhere"); the dim lifts after 400 ms; a NEW dot stays until opened | `ui_unlock` | dim, cross-fade to colour, the line |
| MR-41 | Level complete on the map (after a win) | medium, ≤ 2 s, tap or Play skips | the camera eases to the beaten node (300, `standard`) | stars stamp in one by one: each drops from 1.8 to 1 (160) with a 60 ms hold, 6 sparks and a small dip of the node, 200 apart, pitch rising (3 stars: 2 × 200 + 220 = 620); a crown pops if it is a new best difficulty (within the last star's hold) | the road dots draw to the next node (450, dots pop in sequence) while the banner-bearer marches along it (MR-48); the next node's padlock bursts into 8 shards with a light ring, and the node drops from 40 px above with squash 0.9 / 1.1 → 1 and dust puffs (420; 2026-09-30); the level plate slides to it (300, overlapping the drop) and Play starts its pulse. Total: 300 + 620 + 450 + 300 = 1,670 ms. Play pressed at any point jumps to the end state and starts MR-15 | `star_stamp` × n, `path_draw`, `node_drop` | stars fade in (150 each), the road appears whole (300 fade), the node fades in; Play gets its static glow |
| MR-42 | Boss beaten, region opens | large, ≤ 6 s first time, 3 s after, tap skips | MR-41 on the boss node; the boss banner burns away (400) | the region gate swings open (600); the camera pans along the road into the new region (800, `standard`) while the art layers slide at their parallax speeds | the region title drops ("Bronze Age: Hellas", display type, 300 with a 120 hold); unlocked cards fly to the Army tab (MR-24); a music sting | `region_open`, music sting | gate and title fade in, the camera jumps with a fade |
| MR-43 | Unearned stars | none | empty sockets are always shown; no negative animation | | | | |
| MR-44 | Card unlocked by a level (A18.7.8) | small | the card appears over the node (pop 220) | it flies to the Army tab (MR-24) | Army's NEW dot | `reward_fly` | fade |
| MR-45 | Trophy Road or Goals claim | small | as MR-23 | the node stamps "Claimed" | the reward flies (MR-21 or MR-24); the next node lifts 4 px | `ui_stamp` | per MR-21 R |
| MR-46 | Difficulty change in the Level preview | micro | none | segmented pill slides (MR-04); the AI tier label flips (150) | the ★★★ goal line highlights when Hard or higher is chosen | `ui_toggle` | fade |
| MR-47 | Tutorial hand pointer (A8, A18.7.5; fixes UA-14's hand covering the text) | life | none | the hand sits beside the target, never over its label or the pointer text (the text sits on the side away from the hand); it taps the target every 1.6 s (press 0.92 over 120, release 140 `back`) | while the hand shows, it is the one pulse: the target's own pulse pauses (U11); the hand leaves (160) the moment the target is used | none | a static hand and a glow ring on the target |
| MR-48 | Banner-bearer marches to the next node (after MR-41) | small | the figure lifts its banner (120) | it walks along the road to the next node (450, `standard`, a 4-frame walk from the art service or a bob of 2 px per step) | it plants the banner with a small settle and a dust puff (150); on Play it steps into the node (MR-15) | `node_drop` (quiet, on the plant) | it fades from node to node |
| MR-49 | Poke the map (tap on empty map) and the boss taunt | micro | none | birds within 160 px scatter and fly off (600), grass or water near the tap ripples (400); a boss node taunts once when it first scrolls into view or its preview opens (a 600 ms idle gesture, never looped) | none | a quiet ambient sound per prop (reuse the backdrop ambience) | birds fade, no ripple |
| MR-112 | The Battle hub's life (2026-09-30) | life, loops | none | the arena island floats (5.2 s), banners wave, the landmark moves (smoke, lava glow, snow, water shimmer, a bobbing ship, blinking neon, a turning ring or rift), sparks rise from the clash mark, clouds cross and a flock flies over now and then; the capsule slots bob and drop in with a stagger | none | the arena ambience | everything still; entrances fade (150) |
| MR-113 | Battle pressed on the hub (2026-09-30; part of MR-15) | small | Battle dips (0.94) | the island leans in (1.08, `anticipate`), the clash mark flares and the scene dims, then VS | none | `ui_whoosh` | a cross-fade to VS |
| MR-114 | The War Path's scenery life (2026-09-30) | life, loops | none | water shimmer and surf, boats and ships bob, fires, lanterns and lair torches flicker, smoke and cannon puffs, a train shuttles, a radar turns, a helicopter hovers, platforms and rocks float, a portal swirls, grass and reeds sway, flocks cross; the current node's marker bounces | none | the backdrop ambience | everything still |
| MR-120 | Mode selected on the switcher (2026-10-01) | small | the card's check pops | the card icon arcs into the switcher tile (`fly`, 500), the tile's icon pops in (`back`) and the plate's body cross-fades (300, slides 10 px) | none | `ui_toggle` | the tile glows; the plate fades (150) |
| MR-121 | Online search (dev mock until M4) | loop, calm | none | fog drifts over the far base with a light sweep (one pass per 2.6 s); the plate's compass needle turns (4 s a turn); the search clock counts up | none | `ui_click` on start | a static fog tint; the needle still |
| MR-122 | Player found (dev mock until M4) | small | none | the fog clears and the far base drops in with a squash (520) and a dust puff | none | `ui_confirm` | a fade |
| MR-123 | The found player's plate flash (dev mock) | small | the plate dips (0.96) | it swells (1.04) with a green ring, 600, then VS | none | none | a fade |
| MR-124 | Room code and Copy (dev mock until M2) | small | none | the six letters flip in one by one (220 each, 40 apart); Copy shows its check pop | none | `ui_click` | a fade |
| MR-125 | Escalation step banner (Last Base Standing) | medium, 1.2 s | none | the HUD moment banner with the step's name and what it changes; the new pip pops lit | none | the Siege horn rule; the music's intensity layer steps up | the banner fades; pips light without the pop |
| MR-126 | Crumble (Last Base Standing) | loop while crumbling | none | the "Crumbling" chip rocks gently, the HP bar shows cracks, stones fall from the base top on each rope beat | none | the decay debris rule | the chip still; cracks and stones kept |
