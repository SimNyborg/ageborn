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

The plan fixes this in eight phases (Part 6), most confusing first:

1. **UI-0 Foundations:** one button, one colour grammar, one type scale, motion tokens, a phone screen template with a fixed action bar, a reduce-motion mode that keeps feedback, and an automated budget test.
2. **UI-1 Blockers:** hidden primary actions (Card detail), the Result's next step, the capsule summary, Pause, VS auto-start, and a minimal hit fix for Mode select.
3. **UI-2 Home as the War Path hub:** the map is Home from the very first launch, one Play button under the right thumb that always starts the next level, five labelled tabs, the Modes sheet, browser back handling and the viewport policy, features unlocked one at a time with a small ceremony.
4. **UI-3 Battle HUD:** readable text, 48 px targets, six cards and a Fort slot in one row, Evolve under the left thumb, train on release, one pulse at a time, controls shown only once taught.
5. **UI-4 Army and Card detail:** Army becomes the Clash Royale-style Cards screen (loadout plus the whole card collection), tap a card for Use and Info, drag or tap to equip, one Undo, upgrade with a stat preview and a confirm tap.
6. **UI-5 Satisfaction:** rewards fly to their counters, numbers count, the evolve happens on screen, every screen moves with direction, haptics on Android. **UI-5b Battle feel:** a live audit and pass of the battle world's moments (spawn, hits, deaths, impacts, base damage, powers) with realistic weight.
7. **UI-6 Customize:** a live preview of base, flags, decorations and skins.
8. **UI-7 The realistic UI skin and polish:** materials, lighting, fonts, Danish length, the remaining audit items.

Rule for all phases: **motion ships with the feature.** No screen or interaction is "done" while it is static; its rows in the motion catalogue (Part 5.5) ship in the same phase.

---

## 1. UI principles for Ageborn

### 1.1 The fifteen binding rules

Every agent follows these on every change. Each cites the research IDs it comes from.

| # | Rule | Concretely |
|---|---|---|
| U1 | **One screen, one job, one primary button.** | A screen has at most one primary button: the one emphasised action (`data-primary`), filled gold or green by the grammar in U5, the largest button on screen, at the bottom-right (thumb zone). Screens whose job is an action (Home, Result, sheets) have exactly one; Card detail and Customize have one when the action is possible; browsing and editing screens whose changes apply at once (Army, Progress, Settings, Profile) may have none. A disabled primary keeps its place and explains what is missing but loses `data-primary` and the pulse. A new player can say what the screen is for within 5 seconds. Everything else is secondary (slate) or tertiary (text). (H8, G6, G7, F2, T3) |
| U2 | **Battle is one tap away.** | Home's Play always starts the next War Path level, with 1 tap. Any other mode starts from its card in the Modes sheet (2 taps). The VS screen starts by itself after 2 s. From every Result the next battle is at most 1 tap away, and the Result's primary sits in the same spot as Home's Play. After a War Path win the primary is "Continue": it returns to the map, where the advancing road is the reward (MR-41), and Play is then 1 tap; a loss offers "Try again" and the other modes "Next battle" straight into VS. (K5, B-rank 1, 2, 10) |
| U3 | **Every tap answers within 100 ms.** | The pressed state shows on `pointerdown` in the same frame. The result of the action appears where the finger is, not in a toast across the screen. Disabled controls explain why on tap. (R1, N4, H1, H9) |
| U4 | **Show, don't make them remember.** | Class, cost, level, counters, equipped, locked and ready are visible on the item where the decision is made. Long-press (touch) or hover (desktop) opens detail; nothing essential is hover-only. (H6, N2, P3) |
| U5 | **One visual grammar.** | Gold = go (Play, Continue, Next, Open, Claim). Green = spend or progress (Upgrade, Equip, confirm a spend, valid drop target). Slate = neutral and navigation. Red = destructive or denied only. Rarity, team and capsule-tier colours mean only rarity, team and tier, and each lives on its own kind of object (3.2), so hues that look alike never meet. One component per job (one Button, one CardTile, one Sheet). (H4, G2, B-rank 4) |
| U6 | **It fits the phone.** | Every screen works at 844 × 390, 844 × 340 and 800 × 360 with safe areas: no clipping, no truncated names, no horizontal page scroll, the primary button visible without scrolling. Text ≥ 12 px (tags ≥ 11 px bold). Targets ≥ 48 px (44 px for rare controls), ≥ 8 px apart. Layouts are budgeted in px before they are built (3.1). (T1, T4, A2, A8) |
| U7 | **Five destinations, shallow depth, one way back.** | Five labelled tabs. Everything else is a panel or at most one level below a tab; never a panel on a panel. Back is always top-left, Close (×) on panels always top-right, and Esc and the browser or Android back gesture do the same (each panel, sub-screen and battle is a history entry; back on Home never leaves the site by accident). A jump to another tab returns to where it came from. Leaving and coming back keeps scroll, tab and filter. (H3, F2, B-rank 3, 22) |
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

> **Beat levels on the War Path, open capsules to get cards, put your best cards in your army, beat harder levels.**

Every Home element belongs to one of five verbs: **Play, Open, Build, Customize, Progress** (N6), and each verb has exactly one tab. Anything that fits none of them lives inside a destination, not on Home.

### 2.2 Navigation model

**The five tabs, one per verb** (left to right): **Army** (Build), **Capsules** (Open), **War Path** (Play, Home, centre), **Progress** (Progress), **Customize** (Customize).

| Tab | Holds | One home for |
|---|---|---|
| Army | the loadout of each age on the left, the whole troop collection on the right (this age, or "All cards" with completion counts), Card detail and upgrades | every troop, turret, power and Fort card: equip, inspect, upgrade, collection progress |
| Capsules | the capsule shelf, Wardrobe Crates, charges, Supply and Clay, odds | everything that is opened |
| War Path | the map, Play, the level plate, the Modes tile | playing |
| Progress | Goals (quests and the War Chest), Trophy Road, Feats, the Profile record | every long-term goal and claim |
| Customize | the live preview, all cosmetic collections with completion counts (the cosmetics album) | every cosmetic: see, try on, equip |

Why this set: the research (ui-benchmarks B-rank 3) and both reviews found Army and Collection showing the same cards, cosmetics in two places, and Goals and Trophy Road hidden on a rail. One tab per verb gives each thing exactly one home, which is what the owner's "meta features are hard to find" asked for. Capsules stays a tab instead of a Home tray because Home's one job is the War Path (A15.13 budget) and the capsule systems (charges, Supply, Clay, crates, odds) need room; findability comes from the tab's ready badge and from the Result, which opens a fresh capsule with 1 tap.

| Layer | What | Examples | How you leave |
|---|---|---|---|
| **Tabs** (5, always visible outside battle) | Top-level destinations in a bottom navigation bar | Army, Capsules, **War Path (Home)**, Progress, Customize | Tap another tab; back or Esc on a tab goes to Home |
| **Sub-screens** (depth 1 below a tab) | Full screens with a header and Back | Card detail, Skirmish setup, Trophy Road (in Progress), Profile, Settings | Back (top-left), Esc, back gesture: return to where the player came from, with scroll and filters kept |
| **Panels** | On compact screens a side panel slides in from the right, about 58% of the width (min 440 px), full height inside the safe areas, and the screen stays visible and dimmed on the left; on regular screens a centred panel up to 720 wide | Level preview, Modes, odds, info panels | × top-right, tap the scrim, swipe right (compact) or down (regular), Esc |
| **Tray sheets** (battle only) | A sheet that replaces the tray from below | War Council | its button, Esc |
| **Modals** | Small centred dialogs that need an answer | Confirm a reset, Age Capsule picker, Retreat | The two buttons, Esc (= cancel) |
| **Flows** | Full-screen sequences owned by the app | VS, Battle, Pause, Result, Capsule show | Their own buttons; Esc in battle = Pause; Esc in the capsule show = skip to summary |

Rules:

- **Depth ≤ 2** from Home: a tab, then one sub-screen or panel. A panel may open over a sub-screen (odds over Card detail). **Never a panel on a panel**, with one exception: an info panel (S17) may open over any panel and closes back to it. A choice that needs its own setup (Skirmish) opens a sub-screen and closes the Modes panel.
- **Tab bar visibility:** visible on every tab and hidden in sub-screens and flows; a panel dims it. The active tab is marked by a lit plate, a label in full white and the icon in colour; inactive tabs are slate with labels at 12 px.
- **Back stack:** the router keeps one stack per tab, so returning to a tab shows where the player left it (U7). Home always resets to the current War Path node after a battle.
- **Cross-tab jumps return to their origin.** The jumps are: Level preview "Edit army" → Army; Result or capsule summary "Upgrade" → Card detail; a new cosmetic's "Try it on" → Customize. A jump opens the target with a Back button (top-left) and records its origin; Back, Esc and the back gesture return to the origin in the state it was left (the Level preview panel open again, the summary shown again). Tapping a tab instead clears the origin. There are no other cross-tab jumps.
- **Browser history** (U7, owner WP11 in `src/app`, the router in WP9): every panel, sub-screen, cross-tab jump, VS and battle pushes one `history.pushState` entry, so Android back and the browser back button close the panel, go back, or open Pause in battle. Home at the root keeps one sentinel entry: the first back there shows a toast "Press back again to leave" (2 s) and re-arms the sentinel; only a second back within 2 s leaves the site. `overscroll-behavior: none` on `html` and `body` and `contain` on every scroll container, so a pull never reloads or navigates; the map, the Army drag surface and the battle canvas set `touch-action: none` and handle their own pans. **iOS edge swipe:** no drag or pan may start within 20 px of the left or right screen edge (on notched phones this lies inside the safe area anyway); a Safari edge swipe is a history back and therefore safe.
- **Ready-badge priority on Home** (at most 2 show, U11): 1. Capsules (a capsule that can be opened now, charges permitting); 2. Army (an upgrade is ready); 3. Progress (a claim is ready); 4. Customize (never a ready badge, only NEW dots inside). A tab with a lower-priority ready state shows it inside the tab only.
- **Keyboard (desktop):** 1-5 switch tabs outside battle, Enter presses the screen's primary, Esc goes back or closes, arrows move along the War Path, Space starts the next level on Home.
- **Social later:** when friends or clans ship (A18.10 M6, M8), Social takes Progress's place and Progress becomes a segment of the Profile sub-screen, or the tab count grows to six on regular screens only; the lead decides then. Five tabs on phones stays.

### 2.3 The new Home (the War Path hub)

Home is the War Path map. The map is the screen; everything else is a thin frame around it.

**Phone 844 × 390** (content box about 750 × 369 inside the safe areas):

```
+--------------------------------------------------------------------------------------+
| [avatar Name]             Stone Age · Level 4 of 10     [Amber 1,240] [Dust 80] [gear] |  top bar 44 (40 short)
|                                                                                      |
|               ~~~~ map: winding road through the Stone region, parallax art ~~~~      |
|  ★★★ o---o---o---[banner-bearer](L4 on plinth)- - - o - - - o - - - [BOSS]           |
|                                                                                      |
|                                              +-----------------------------------+   |
|                                              | [Pip portrait AI] Tuskback Ambush |   |  level plate 56
|                                              |                  First clear: [◆ 60]  |
| [Army][Capsules 2][ WAR PATH ][Progress][Customize]    [Modes] [  PLAY LEVEL 4  ]   |  bottom row 56-64
+--------------------------------------------------------------------------------------+
```

| Zone | Size (phone / desktop) | Contents |
|---|---|---|
| Top bar | 44 / 56 tall (40 at height ≤ 360), transparent over the map with a 72% dark gradient scrim | Left: profile chip (avatar 32, name; trophies join it only once Ladder unlocks at L6), opens Profile. Centre: region and level ("Stone Age · Level 4 of 10"), a label, not a button. Right: Amber and Dust chips (tap = info panel, A15.3 line), gear (44 / 48) opens Settings. Each chip appears only once the player has earned that currency, with its first-seen caption (MR-28). |
| Map | Full screen behind everything | The War Path (4.1). Opens centred so the current node sits at about 45% of the width, left of the level plate. Drag to scroll sideways. While the player pans, the level plate fades to 30% and slides 24 px right, so the road behind it shows; it returns 400 ms after the pan ends. |
| Level plate | 272 × 56 / 360 × 72, right, above Play | Only three things: the General's portrait with the AI badge, the level name, and the first-clear reward icon ("First clear: 60 Amber"; after the first clear, the best stars earned). No difficulty, tier or goal text: those live in the Level preview. Tap the plate = Level preview panel. |
| Play | 176 × 64 / 240 × 80, bottom-right corner | Gold, the only primary, the one breathing element: always "Play level 4", the next War Path level. It never changes to another mode. |
| Modes | 88 × 64 / 112 × 80, left of Play | Slate tile with a crossed-swords icon and "Modes". Opens the Modes panel (Quick Battle, Skirmish, Ladder, Daily; Conquest until A18.7.10 folds it in); each mode starts from the Play on its own card. Nothing is remembered on Home, so Home always says one thing. Appears at L3. |
| Bottom nav | 5 × 88 wide, 56 tall / 5 × 120, 72 tall, bottom-left (5 × 80 below 820 px wide) | Army, Capsules, **War Path** (centre, raised 6 px, gold rim when active), Progress, Customize. Icon 28 above a 12 px label (14 px on desktop). Ready badges by the priority in 2.2 (at most 2). Capsules' badge counts only capsules that can be opened now, which A15.13 allows. A tab that unlocks more than 2 levels ahead shows only its greyed icon and label, no padlock text; the next one to unlock shows "Lv 5". |

**Width check** (compact, content box 750): nav 440 + 16 + Modes 88 + 8 + Play 176 = 728 ≤ 750; below 820 px wide (800 × 360 with 16 px margins: 768) nav 400 + 16 + 80 + 8 + 176 = 680. **Height check** at 844 × 390: top bar 44 + map band 261 (the plate's 56 sits at its bottom, over the map) + bottom row 64 + safe area 21 = 390. At height ≤ 360 Play and Modes shrink to 56 tall and the tabs to 52: at 844 × 340, 40 + 223 + 56 + 21 = 340, and the map band still shows the road above the plate (the road runs through the band's upper 60%, 4.1).

**What moved off Home and where** (removes UA-02's crowding; the lead updates A9 #2 and A15.13's Home line, see 2.9):

| Was on Home | Now |
|---|---|
| Capsule tray panel plus a Capsules nav button (the same content twice) | The **Capsules** tab (4.6). Home shows only its ready badge. |
| Quests panel with swap buttons, War Chest bar | **Progress** tab, Goals section. |
| Trophy Road bar behind the nav row | **Progress** tab, Trophy Road section, and the Ladder card in Modes. |
| Next-opponent chip on Battle | The level plate. |
| Six equal nav buttons in two rows | Five labelled tabs in one row. |
| Conquest nav button | Modes panel until A18.7.10, then the boss nodes on the map. |
| Clay meter, charges "12/28", Supply progress | The Capsules tab, next to what they fill. |
| War Plan and Collection buttons | One **Army** tab. |

**Counts on Home** (returning player): 12 tappable controls plus the map nodes, in four clear groups (top bar, map, bottom nav, Play group), one primary. The audit counted 18 equal-weight controls and no primary structure.

**Desktop 1280 × 720:** the same composition with the desktop sizes above; the map shows about 7 nodes instead of 5; hover on a node shows its plate as a tooltip.

### 2.4 Screen map

Type: T tab, S sub-screen, H sheet, M modal, F flow. "Back" is where Back, Esc and the back gesture go.

| # | Screen | Type | Purpose (one job) | Primary action | Back | Reached from |
|---|---|---|---|---|---|---|
| S1 | Boot | F | Load in ≤ 3 s | none (progress bar) | none | launch |
| S2 | **Home: War Path** | T (centre) | Show where you are on the path and start the next level | Play level N (gold) | none (root) | launch, every flow end |
| S2a | Level preview | H | Everything about one level before you play it | Play level N / Replay level N (gold) | Home | tap a node or the level plate |
| S2b | Modes | H | Choose another way to play | Play (gold) on the chosen mode card | Home | Modes tile |
| S2c | Goals | H | Claim quest and War Chest rewards | Claim (gold) on the first claimable, else none | Home | Goals rail button |
| S3 | VS | F | Show who you fight (AI label, tier, levels, modifiers) | none; starts after 2 s, tap to skip | Esc = cancel to Home before the countdown ends | Play |
| S4 | Battle HUD | F | Fight | contextual (no fixed primary) | Esc / back = Pause | VS |
| S4a | War Council | H (over the tray) | Pick in-battle research (A18.5) | the chosen pick (green, costs gold) | tray | Council button, G key |
| S4b | Mount popover | H (small) | Build, Modernise or Sell a turret | the build option (green) | tap outside | tap a mount |
| S5 | Pause | M (card under the minimap) | Stop and look around | Resume (gold) | Resume | pause button, Esc, tab hidden |
| S6 | Result | F | See what happened and what you earned, then go on | Next level / Next battle / Try again (gold) | Home | battle end |
| S7 | Capsule show and summary | F | Open a capsule | Tap (strikes); summary: Open next (N) or Continue (gold) | skip to summary, then Continue | Result, Capsules tab |
| S8 | **Capsules** | T | See and open what you earned | Open (gold) on the selected capsule | Home | tab |
| S9 | **Army** (War Plan / deck builder) | T | Choose the troops for each age | none: edits apply at once (Undo on each) | Home | tab, Level preview "Edit army" |
| S10 | **Collection** | T | See everything you own and what is left, per collection | none (browse); tap an item for detail | Home | tab |
| S11 | Card detail | S | Understand a card and upgrade it | Upgrade · price (green) when possible, else Equip (green) | the tab it came from | a card anywhere outside battle |
| S12 | **Customize** | T | Choose how your base, flags and troops look | Equip (green) on the previewed item | Home | tab |
| S13 | Trophy Road | S | See ladder progress and claim road rewards | Claim (gold) on the next claimable node | Home | Goals rail, Ladder card, Result bar |
| S14 | Profile | S | Your record, name, banner, match history | none (edit name is secondary) | Home | profile chip |
| S15 | Settings | S | Change sound, display, motion, accessibility, save | none (changes apply at once) | where it was opened from | gear, Pause |
| S16 | Replay viewer | F | Watch a replay | Play/Pause | Profile or Result | Profile history, Result |
| S17 | Info panel | H | Explain one term or system (A15.3 lines live here) | none | the screen below | any "i" or currency chip |
| S18 | Unlock intro | overlay (dims Home) | Introduce one new feature in ≤ 8 words | Open it (gold) / tap anywhere to continue | Home | an unlock (2.6) |
| S19 | Confirm | M | Confirm an irreversible spend or loss | the spend (green) or the loss (red) | cancel | Upgrade over a threshold, craft, reroll, reset, Retreat |
| S20 | Age Capsule picker | M | Pick which age the capsule comes from | Choose (gold) | none (must choose; the result is saved first) | Result, quest claim |
| S21 | Rotate overlay | overlay | Ask to turn the phone | none | rotating | portrait |

Retired: **Mode select** (S3 in A9) becomes the Modes sheet; **Conquest** stays inside Modes until A18.7.10 moves its Generals onto the map.

### 2.5 Flow

```
Launch ─> Boot ─> Home (War Path; first launch shows only the map, L1 and Play)
Home ─Play─> VS (2 s, tap skips) ─> Battle ─> Result ─> [Capsule show] ─> Home (level-complete ceremony, then the next node's Play)
Home ─Modes─> Modes sheet ─Play─> VS ─> ...
Result ─Next level / Next battle─> VS ─> Battle            (no Home in between: U2)
Home ─tab─> Army | Collection | Capsules | Customize ─> Card detail / capsule show / preview
Battle ─Esc─> Pause ─> Resume | Settings | Retreat
```

### 2.6 Progressive unlocks

Tabs and Home elements appear one per return to Home, each with the unlock ceremony (MR-40). Locked tabs are visible from the first return with a padlock and "Lv 3" under the label; tapping one shows a pointer "Unlocks at War Path level 3" above it (U8). This replaces the built rule "War Plan, Customize, Quick Battle and Skirmish open after match 1" (A3, A8), so the lead updates those lines.

| Returning to Home after | Appears | Why now |
|---|---|---|
| First launch | Map, L1, Play, gear. No tabs, no chips, no rail. | Nothing else is usable yet (P2) |
| L1 (training match) and capsule 1 | Bottom nav (all 5, four locked), **Army** unlocked, Amber chip | The new Spear Hunter is in the army |
| L2 and capsule 2 with the forced upgrade | **Capsules** unlocked (the Supply Capsule flies in, badge 1) | There is something to open |
| L3 | **Collection** unlocked; **Modes** tile (Quick Battle, Skirmish) | Enough cards to browse; replay and practice |
| L4 | **Customize** unlocked (the welcome Wardrobe Crate waits in Capsules) | First cosmetic owned |
| L5 (the Lieutenant) | **Goals** rail (quests, War Chest), **Trophy Road**, Ladder and Daily in Modes, Dust chip when earned | Longer-term goals once the basics are known |
| L6 onwards | nothing new on Home; new mechanics are taught on the nodes (A18.7.5) | One new thing per level |

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
| ~3:40 | Home | Level-complete ceremony: the star flies from the Result into L1, the road draws itself to L2, L2 drops in, Play slides to it. The bottom nav rises; Army unlocks (padlock cracks, "Army: pick your troops"). Amber chip counts up from 0. | 1 |
| ~3:50 | Home or Army | Most players tap Play level 2 ("Hold the line", Pip Quickstep AI). Curious players open Army: the Spear Hunter sits in its slot with a NEW dot. | 1 or 2 |
| ~4:00-9:00 | L2 battle | Stance: the enemy rushes; Hold, then Charge (A18.7.5) | |
| ~9:00 | Result, capsule 2 | Pikeman and Grenadier NEW; the forced upgrade plays the full level-up ceremony (MR-39) on Bonker: "+5% HP and damage" | |
| ~10:00 | Home | L2 star, road to L3; Capsules unlocks, the Supply Capsule flies into the tab (badge 1) | 1 |
| ~10:15-15:30 | L3 | Turret on a mount | |
| ~15:30 | Home | Collection and the Modes tile unlock | 1 |
| ~16:00-21:30 | L4 | Age Power dragged onto the lane | |
| ~21:30 | Home | Customize unlocks; the pointer suggests opening the crate in Capsules, then equipping the skin | 1 |
| ~22:00-28:00 | L5 Lieutenant (Hard) | A harder fight; a loss offers "Try again" (1 tap) | |
| ~28:00 | Home | Goals and Trophy Road unlock; Ladder and Daily appear in Modes | 1 |
| ~28:00-40:00 | L6, L7 | War Council economy (L6), Troops rank I (L7); a stopping card may suggest a break (A15.6) | |

Session targets: first battle within 10 s of the first tap; each later battle 1 tap from Home or from the Result; no screen with more than one new thing; no text line over 8 words during onboarding.

### 2.8 Task targets (returning player, phone)

| Task | Taps today (audit §5) | Target |
|---|---|---|
| Start the next War Path level | 3 + VS (via Mode select) | **1** (Play) |
| Start a ladder battle | 3 + VS | 2 (Modes, Play) and 1 on later visits (the mode is remembered) |
| Choose difficulty | impossible (hidden picker) | 2 (difficulty chip, option) |
| Equip a new card in the Stone loadout | 3, no feedback | 2 taps or 1 drag inside Army (tab + drag) |
| Upgrade a card | 3 + a scroll | 3 (Collection, card, Upgrade), no scroll |
| Open a capsule | 1 | 2 (Capsules, Open); Result opens it with 1 |
| Change the base flag | 3, no preview | 3 (Customize, Flags, flag) with a live preview |
| Find a capsule's odds | 2 | 2 (Capsules, "i") |
| Turn on reduce motion | 2 | 2 (gear, toggle) |

### 2.9 DESIGN changes this plan implies (for the lead)

The lead records these in DESIGN and `docs/decisions.md` before UI-2 starts; agents do not edit DESIGN.

1. A9 flow and table: Home contents (2.3), Mode select becomes the Modes sheet, Trophy Road moves to the Goals rail and the Modes Ladder card, the tab set (Army, Collection, War Path, Capsules, Customize), new rows S2a-S2c, S17-S20.
2. A15.13 Home line: the capsule tray moves to the Capsules tab and quests and the War Chest to the Goals sheet. This removes Home widgets and adds none, so it passes the budget rule.
3. A3 and A8 unlock timing: 2.6 replaces "open after match 1".
4. A9.2 HUD: the tray layout in 4.7 (Evolve in the tray's left cluster, top band 44 px on phones, six cards at 62 × 84 on 844 px phones).
5. A18.9.5: "the bottom row keeps War Plan, Collection, Capsules, Customize and Trophy Road" becomes the five tabs above, with Trophy Road on the rail.
6. A13: the new UI and War Path sound ids in 5.4.
7. A18.7: War Path v0 (6.3) as an interim data set before A18 phase 5.

---

## 3. Design system

### 3.1 Frame, layout and grid

**Breakpoints** (by height first, because landscape phones are short):

| Name | Condition | Typical device | Notes |
|---|---|---|---|
| compact | height ≤ 480 | phones in landscape (844 × 390, 932 × 430) | the reference; all "phone" numbers |
| regular | 481-799 high | tablets, small laptops, 1280 × 720 | the "desktop" numbers |
| large | ≥ 800 high | 1920 × 1080 | regular sizes × 1.25 (one `--ui-scale` factor), content max width 1600 |

Width only switches the HUD tray card size (4.7) and the number of grid columns.

**Safe areas:** every edge-anchored element adds `env(safe-area-inset-*)`. Nothing interactive sits under the notch or the home indicator (T4).

**Grid:** 12 columns; gutter 12 (compact) / 16 (regular); outer margin 16 / 24 plus the safe area. On compact phones the content box is about 750 × 369.

**Vertical budget at 844 × 390** (every tab screen): top bar or screen header 44, content 269, bottom bar 56, safe area 21. A sub-screen has a header of 44, an action bar of 64 (holding a 56 tall button) and 261 for content. Anything taller scrolls inside the content area only; header and action bar never scroll away (fixes UA-03).

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
| Primary "go" | `#F2B52C` / `#FFD466` / `#B7801A` | ink | Play, Next level, Next battle, Try again, Open, Claim, Continue | secondary actions; more than one per screen |
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
| Capsule tier | Clay `#9C6B4A` (text `#C08A62`), Bronze `#C27C3A`, Silver `#C9D1DC`, Jade `#2FBF71`, Aeon `#8B5CF6` + gold rim | tier pips 1-5 and the tier name |
| Class | the Okabe-Ito based disc colours of `ClassIcon` | the glyph shape and the class word |

Note on gold: the primary button gold and the Legendary gold are close. They stay apart by form: a primary is always a large filled button with a lip and a verb; Legendary is always a frame, a star gem or a glow, never a button.

**Contrast checks** (WCAG 2.x relative luminance, computed for this plan)

| Pair | Ratio | Needs | Result |
|---|---|---|---|
| text on bg / surface-1 / surface-2 / surface-3 | 16.35 / 14.40 / 12.23 / 9.97 | 4.5 | pass |
| text-2 on surface-1 / surface-2 | 8.75 / 7.43 | 4.5 | pass |
| text-3 on surface-1 / surface-2 / surface-3 | 6.12 / 5.20 / 4.24 | 4.5 | pass, pass, **fail**: not allowed on surface-3 |
| ink on primary gold / gold light | 9.89 / 12.87 | 4.5 | pass |
| ink on progress green | 8.36 | 4.5 | pass (white on green is only 3.59, so green buttons use ink) |
| text on secondary face | 6.77 | 4.5 | pass |
| white on destructive face | 5.11 | 4.5 | pass |
| gold / green / destructive face vs surface-1 | 8.98 / 7.31 / 3.23 | 3.0 | pass |
| secondary face vs surface-1 | 1.69 | 3.0 | fails alone, so secondary buttons always carry the `--ui-edge` border (3.71) |
| Rarity on surface-1: Common / Rare / Epic / Epic text / Legendary | 9.00 / 6.94 / 4.17 / 5.67 / 9.26 | 3.0 (graphics), 4.5 (text) | pass; Epic text uses `#B77BF9` |
| Team me / me text / foe on surface-1 | 4.23 / 5.96 / 6.63 | 3.0 / 4.5 | pass; "me" text uses `#5B9BFF` |
| Clay tier / Clay text on surface-1 | 3.63 / 5.55 | 3.0 / 4.5 | pass with the text variant |
| good / warn / bad text on surface-1 | 8.55 / 8.09 / 6.48 | 4.5 | pass |
| text on scrim over pure white art (72%) | 7.37 | 4.5 | pass (a 60% scrim gives 4.65, too close: 72% is the minimum) |
| focus ring white on bg | 18.75 | 3.0 | pass |

The old `--ui-dim` (#817AA8 on the old panel) was 3.47:1 and fails for text; it is retired.

### 3.3 Typography

**Faces.** A display face for titles and banners that fits the realistic historical tone, and a clear sans for everything else. Both are OFL, self-hosted as subset `woff2` (Latin with Danish æ ø å) so the game stays offline and free:

- Display: **Cinzel** 700 (titles, banners, region names, big result words). About 25 KB subset.
- Text: **Inter** (variable, 500-800) for labels, body and numbers, with `font-variant-numeric: tabular-nums` on every changing number so counters do not jiggle. About 45 KB subset.
- Fallback stack until the files ship (UI-7): `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`. The rounded Nunito stack is retired (it reads cartoon, and it was never loaded anyway).

**Scale** (px; line-height in brackets). Eight steps replace the 25 sizes in use (UA-04).

| Token | Compact | Regular | Weight / face | Use |
|---|---|---|---|---|
| `--ui-fs-tag` | 11 (14) | 12 (16) | 800 Inter, caps, +0.04 em | NEW, AI, key badges, rarity word on tiles; always with an outline or on a solid plate |
| `--ui-fs-caption` | 12 (16) | 13 (18) | 600 Inter | captions, hints, stat labels, nav labels |
| `--ui-fs-body` | 14 (20) | 16 (22) | 500 Inter | body text, list rows, descriptions |
| `--ui-fs-label` | 14 (18) | 16 (20) | 800 Inter | button labels, tabs, chips, card names |
| `--ui-fs-title-s` | 16 (20) | 20 (24) | 800 Inter | panel titles, sheet titles |
| `--ui-fs-title` | 20 (24) | 24 (28) | 700 Cinzel | screen titles, level names |
| `--ui-fs-headline` | 28 (32) | 36 (40) | 800 Inter (numbers) / 700 Cinzel (words) | big numbers (trophies, price), region names |
| `--ui-fs-display` | 40 (44) | 56 (60) | 700 Cinzel | Victory / Defeat, "Level complete", walkout names (up to 80 on desktop for the Legendary banner) |

Rules:

- Nothing below 11 px anywhere, the HUD included. Card names on tiles are 12 px minimum; a long name wraps to two lines or scales down to 11 px, never ellipsis (fixes UA-24).
- Sentence case for body and most labels; caps only for tags and short button labels (≤ 2 words).
- Text on art always sits on a plate, on the 72% scrim, or has a 2 px `--ui-bg` outline plus a 0 2px 4px shadow.
- A **text size** setting (100%, 115%, 130%) scales every step except display (A2, K7). Layouts are tested at 130% and with the Danish pseudo-locale (+30% length).

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
| Capsule tiers | the drum with 1-5 lit ring pips (Clay 1 ... Aeon 5) | 32-96 | the pip count is the non-colour cue |
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
| sm | 62 × 84 | 72 × 96 | battle tray on 844 px phones (72 × 96 from 900 px wide, 88 × 116 on desktop) |
| md | 72 × 96 | 96 × 128 | Army slots and grid, Collection grid, capsule summary |
| lg | 96 × 128 | 128 × 170 | Collection on large screens, card preview in sheets |
| xl | 180 × 240 | 240 × 320 | Card detail, capsule reveal |

Anatomy, fixed for every size: cost top-left (coin plus number), class icon top-right, art in the centre with a vignette, level ribbon at the bottom ("Lv 4"), rarity frame and gem bottom-centre, name under the art (md and up), copies bar under the tile (Collection, Army grid). States: owned, not owned (silhouette and padlock), equipped (check badge top-left of the frame and a slot-coloured underline), NEW (dot), upgrade ready (green arrow on the copies bar, bar full and green), selected (lifted 1.06, e5), dragging (1.08, e5, 4° tilt), not usable here (greyed, reason on tap: "Bronze card: switch to Bronze"). Long-press 450 ms or hover 350 ms opens the tip (class, Strong vs, Weak vs), as built.

**Slots** (Army): the same size as the md tile, dashed 2 px `--ui-edge` border and a "+" with the slot kind ("Unit", "Turret", "Power", later "Fort") when empty; on drag start valid slots show a solid gold outline and a soft inner glow; the slot under the finger scales 1.04.

**Tabs and segmented controls**

- Bottom nav item: 88 × 56 (compact) / 120 × 72; active = lit plate, full-colour icon and white label; badge top-right of the icon.
- Top tabs (Collection, Customize, Settings sections): 44 / 48 tall, label always visible, a 3 px underline indicator that slides (MR-11).
- Age tabs (Army): 44 / 48 tall, age icon plus short name ("Stone"), a status mark on the right (green check = valid and full, amber "!" = advisor warning), horizontal scroll with the current age centred.
- Segmented (difficulty, format, stance in settings, presets A/B/C): 44 / 48 tall, the selected pill slides.

**Chips and pills:** filter chips 36 visual, 44 hit, icon plus label (icon-only allowed only on desktop with a tooltip, never on phones: fixes UA-12's icon-only filters); info pills (AI, tier, "Hard") 24 tall with 12 px text, not interactive, flat (no lip) so they do not look pressable (N1).

**Badges:** dot 10 px; count 20 px tall, min 20 wide, 12 px bold; green = claimable or upgradable, red only for "needs attention" errors (a save problem). No badge animations after the pop-in (U11).

**Sheets:** bottom sheets for phone landscape: full width minus 24 px margins, height up to 88% of the screen, top corners `--ui-r-xl`, a 32 × 4 grab handle, × top-right, title left. On desktop sheets become centred panels up to 720 wide. The sheet's primary sits in its own bottom-right action bar.

**Modals:** up to 480 × (height − 48) compact, 560 × 480 regular; title, one sentence, the price and the result for spends ("Upgrade Bonker to Lv 5 for 400 Amber: HP 320 → 336"), two buttons (Cancel secondary left, action right).

**Popovers and tooltips:** anchored to their element with a 10 px arrow, max 280 wide, 12-14 px text, e3; never cover the element that opened them or the screen's Back button (fixes the desktop War Plan tooltip over the header, UA-11).

**Toasts:** 44 tall, max 360 wide, 14 px, anchored above the control that caused them (or top-centre for global events), 2.6 s, max 2 at once, Undo button when reversible (UA-22, UA-16).

**Progress bars:** thin 10 / 12 px (copies bar, XP), main 16 / 20 px (War Chest, level progress, Trophy Road) with the numbers inside or beside at ≥ 12 px ("13/20"); a bright 6 px leading edge; milestone icons sit on the bar.

**Counters and currency chips:** 36 / 40 tall, icon 24, tabular number 16 / 18 bold; tap opens the info panel; changes count (MR-20) and bump on arrival (MR-21).

**Info panel:** a sheet with the term's icon at 48, one-sentence meaning, how you get it, what it is for, and the A15.3 honesty line where it applies. Every invented term on screen links to one (U9).

**Empty states:** an icon, one sentence saying what to do, and the action ("No capsules yet. Win a level to earn one." [Play level 4]).

**Action bar:** 64 / 80 tall, fixed at the bottom of sub-screens and sheets, primary at the right edge, secondary to its left, tertiary at the left edge.

### 3.7 The ultra-realistic art direction in the UI frame

The owner chose ultra-realistic art (A18.9.5). The UI must frame that art, not compete with it or look like a cartoon laid over a painting. Rules:

- **Materials, restrained.** Panels are dark slate with a faint cool grain (a 2-3% noise texture) and a 1 px top highlight, like oiled dark metal or stone. Primary buttons read as polished brass (a warm gradient, a specular band across the top third, a darker brass lip). Green reads as enamel on brass, secondary as gunmetal, destructive as red lacquer. Card frames are thin brushed metal in the rarity colour with a bevel; the card stock has a slight inner shadow. Do not use wood planks, rivets, parchment scrolls or ornate filigree behind text: they add noise at 390 px height.
- **One light.** A key light from the top-left at about 45° for every UI surface: highlights on top-left edges, shadows falling bottom-right, specular bands on metal at the top. It matches the world art's light direction; if the art track settles on a different sun direction for the backdrops, the UI follows it in one token (`--ui-light-angle`).
- **Depth.** Five elevation levels (3.4). Figure and ground (G5): the map and battle art stay at full detail and colour; UI panels over art use the 72% scrim or a solid surface; on desktop High preset panels over the map may add an 8 px `backdrop-filter` blur (never on phones or Lite, for performance).
- **Colour in the frame.** The frame is neutral and dark so the art and the reserved colours carry the colour. Warmth comes from the brass accents and the text colour (`#F4EFE4`), not from coloured panels.
- **Realistic, not skeuomorphic, icons.** Glyphs stay simple and readable at 20-24 px; from 32 px they may sit on an embossed metal disc with the same top-left light.
- **Motion with weight.** Realistic frames move with mass: slightly shorter overshoot (back easing is used for small elements only; large panels decelerate without bounce), and impacts get a 40-120 ms hold rather than a cartoon wobble.
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

### 4.1 Home and the War Path map (S2, S2a-S2c)

**Map rendering.** DOM plus SVG in `src/ui/screens/warPath` (WP9), so nodes are real buttons (keyboard, screen reader, the budget test) and the UI layer needs no Pixi. Region art comes as 3 parallax image layers per age (`ui.warpath.region.<ageId>.far|mid|near`) through the art service; until the art track paints them, the existing backdrop layers are used, cropped. The road is an SVG path with dotted segments; nodes are placed along it at data-driven points.

**Layout of the road.** Horizontal, left to right (landscape), one region per age (10 main nodes, 2 side nodes on short branches). Node spacing 120 px (compact) / 160 (regular), so about 5 nodes show on a phone and 7 on desktop. Region borders are visible: the art changes, a gate arch stands on the road, and the region name sits on a banner ("Bronze Age: Hellas").

**Nodes** (56 / 72 px discs, 48+ hit):

| State | Look |
|---|---|
| Beaten | full colour, 1-3 stars in sockets under it, crown badge for the best difficulty |
| Current | lifted on a small plinth, the level plate points at it, soft light ring; the one pulse on Home is on Play, not on the node |
| Next but locked | visible, 60% saturation, padlock |
| Far ahead | fading into mist, shapes still readable (bosses always visible: G4, B-rank 2) |
| Lieutenant (L5), Spike (L9) | shield-shaped node with a "Hard" tag |
| Boss (L10) | a larger (72 / 96) banner node with the General's portrait and AI badge |
| Side node | small flag on a branch, "Optional" tag |

**Interactions.** Drag to pan (1:1, inertia, rubber band at the ends). Tap a node: the Level preview sheet grows out of it (MR-12). A "Back to my level" chip (44 tall, arrow toward the current node) appears at the screen edge when the current node leaves the view. On return from a win the level-complete ceremony plays (MR-41); after a boss, the region ceremony (MR-42).

**Level preview sheet (S2a).** Left: the General portrait (96) with the AI badge, name, tier, personality line, and "Plays by the same rules as you". Right: level name and role ("Level 5 · Lieutenant · Hard"), objective ("Destroy the base" or "Hold out until 4:00"), window ("Stone and Bronze"), modifiers with icons, the three star goals (★ win, ★★ the disclosed goal, ★★★ the goal on Hard or harder) with the player's earned stars, the first-clear reward, the difficulty segmented control (5 options, each with its AI tier), and "Edit army" (secondary). Action bar: "Play level 5" (gold). Boss disclosures (+50% base HP, extra turret) sit in a highlighted row (A18.7.6).

**Modes sheet (S2b).** One card per row on phones (fixes UA-01), 72 px tall, each with icon, name, one plain line, its picker visible inline, and its reward line: Quick Battle (difficulty picker; "5 Amber per win"), Ladder (format picker with each format's reward; arena and trophies), Daily Challenge (difficulty picker Recruit / Veteran / Warlord, today's modifier, "Copy result" after playing), Skirmish (General grid opens in a sub-sheet; difficulty picker), Conquest until A18.7.10 ("0/27 stars", Open board). The selected card has the gold "Play" in the sheet's action bar; mode cards use neutral surfaces, not coloured headers (U5).

**Goals sheet (S2c).** The three active quests (progress bars, reward icons, one gold Claim on the first claimable), the War Chest bar ("War Chest 13/20") and its info line, and the quest swap as a secondary button with a confirm that names the cost ("Swap this quest? 1 swap per day.") and an Undo toast for 5 s (fixes UA-16). The honesty line "New quests arrive each day. Up to 21 can wait for you." sits in its info panel.

**States of Home.** First launch (2.6). A beaten region (the next region's gate open). All levels beaten (Play shows the recommended replay or the Ladder, and "Veteran Path" when A18.7.8 ships). A stopping card after 22:00 (A15.6): Play stays but loses the pulse, and a calm "Good night" line replaces the pointer.

### 4.2 Army: the deck builder (S9)

Owner direction: an intuitive deck builder with six troops per age, drag or tap to equip, class filters, counters and the advisor visible (A18.9.3).

**Phone layout (844 × 390):**

```
+----------------------------------------------------------------------------------+
| [A|B|C]  [Stone ✓][Bronze ✓][Medieval !][Gunpowder]...        Avg Lv 3.4 [Auto-fill]|  header 44
|------------------------------------------+---------------------------------------|
| ! Medieval has no anti-armor  [why?]      | [All][Inf][Ranged][Heavy][...][Owned]  |  sticky filters 40
| [unit][unit][unit]                        |  [card][card][card][card][card]        |
| [unit][unit][unit]                        |  [card][card][card][card][card]        |
| [turret][turret][power] ([fort] later)    |  (grid scrolls; this column only)      |
| Classes: Inf Rng Hvy AA Sup [Who beats whom]|                                       |
+------------------------------------------+---------------------------------------+
| [Army][Collection][ WAR PATH ][Capsules][Customize]                               |  nav 56
```

- **Left column, fixed (about 300 wide):** the advisor chip (28 tall, amber, the A3 warning text with the missing class icon; tap "why?" for the explanation), six unit slots in two rows of three (md 72 × 96), a row of two turret slots, the power slot (and the Fort slot when forts ship) at 56 × 72, and a class strip: the classes this loadout holds as icons (research compatibility, A18.5.2) plus the "Who beats whom" button that opens the legend popover (the built `CounterLegend`). The legend no longer takes half a column (UA-11).
- **Right column (about 440 wide):** sticky filter chips (class chips with icon and label, rarity gems, "Owned" toggle, sort: Level, Rarity, Cost, Ready to upgrade), then the grid of this age's cards (5 columns of md tiles, about 2.3 rows visible). Equipped cards show the check badge and are dimmed to 70% with "In army". Cards of other ages are not shown (N5); a switch "All ages" is in the sort menu for browsing.
- **Header:** presets A / B / C (segmented), the age tabs with status marks, the plan's average level (count-up on change), Auto-fill (secondary).
- **Desktop:** the same two columns at regular sizes; the left column also shows the legend inline.

**Equipping (T5, T6, P4):**

| Path | Steps | Motion |
|---|---|---|
| Drag | press a grid card and move 8 px: it lifts, valid slots light up; drop on a slot | MR-30 lift, MR-31 drag over, MR-32 place |
| Tap card, tap slot | tap a grid card: it lifts and the slots it fits wiggle once and glow; tap a slot | MR-30, MR-32 |
| Tap slot, tap card | tap an empty or filled slot: it glows and the grid filters to cards that fit; tap a card | MR-32 |
| Double-tap a card | auto-places it: the first empty slot, else the same-class slot, else the lowest-level slot (the A3 "Equip now" rule) | MR-32 |
| Remove | drag a slot card out to the grid, or long-press a slot for "Remove" | MR-34 |
| Swap two slots | drag one slot card onto another | MR-35 |
| Undo | every change shows a toast "Swapped Bonker for Spear Hunter · Undo" for 4 s | MR-09 |

Invalid actions are prevented, not failed: a card of another age cannot be picked up here; dropping outside a slot returns the card (MR-33). No red × on every card (UA-11).

**States:** a full valid loadout (age tab check), a loadout with advisor warnings (amber "!", never a blocker), a loadout with fewer than 3 units (red "!" and "Needs 3 units" because it would not be playable; auto-fill fixes it at match start, A3), empty slot, first visit (pointer "Drag a card into a slot").

### 4.3 Collection (S10)

The album of everything the player owns and what is left.

- **Top tabs (5):** Troops, Skins, Base (base skins, decorations, base flags, national flags), Voice (emotes and quotes), Feats. Each tab label shows its completion ("Troops 34/56"). A thin completion bar sits under the tabs.
- **Sticky filter bar** under the tabs (never scrolls away, fixes UA-12): Troops has age chips with names, class chips (the 7 player classes plus Turret and Power, the same vocabulary as the cards), rarity gems, Owned / All, sort. Cosmetic tabs filter by collection and rarity.
- **Grid:** md tiles, 6 columns on phones, 8-10 on desktop; unowned items as silhouettes with a padlock and their source on tap ("Wardrobe Crate", "Trophy Road 800", "War Path Bronze, 20 stars"); upgrade-ready cards show the green arrow (U4).
- **Tap:** Troops opens Card detail with a container transform (MR-12); cosmetics open their preview sheet with an "Equip in Customize" button that jumps to Customize with the item previewed.
- **Feats:** 12 tiles, "???" and the riddle until found, "Show hint" (S button).
- **Crafting with Dust** lives in Card detail and the cosmetic preview, not in the grid, so the grid has no violet buttons (U5).
- **Completion residue:** when an item joins the collection (from a capsule or reward) it flies to the Collection tab (MR-24) and the count ticks up (MR-20).

### 4.4 Card detail (S11)

**Phone layout:**

```
+----------------------------------------------------------------------------------+
| [<] Spear Hunter   [AA icon Anti-armor] [Stone] [Rare ◆]                      [i]   |  header 44
|------------------------------+---------------------------------------------------|
|  (unit on a small lane stage: |  Strong vs  [Heavy icon]  "Pierces armour."        |
|   idle → walk → attack loop)  |  Weak vs  [Infantry icon] "Cheap swords swarm it." |
|                               |  HP 320 (+16)   Damage 42 (+2)   DPS 35 (+2)       |
|  [ xl card, Lv 4 ]            |  Range 40   Speed 60   Cost 70   Train 3.0 s      |
|  copies ████████░ 8/10        |  Skins: [o][o][locked]                             |
|                               |  (abilities and tags below, scroll inside column)  |
|------------------------------+---------------------------------------------------|
|  [Show odds]                           [Equip]  [ UPGRADE · ◆ 400  Lv 4 → 5 ]     |  action bar 64
+----------------------------------------------------------------------------------+
```

- Left: the unit in motion on a lane strip (idle, walk, attack, 3 s loop; B-rank 19) and the xl card with its copies bar. Right: class and counter rows first (the owner's request: Strong vs / Weak vs as class icons plus one plain sentence), then the stat table with the next-level green deltas (kept from today), skins, and the long lists (abilities, tags, per-card counters) below the fold inside the right column only.
- **Action bar never scrolls** (fixes UA-03): Upgrade (green, with price and "Lv 4 → 5") when copies and Amber suffice; otherwise the button shows what is missing, disabled with the reason ("Need 2 more copies", "Need 120 Amber"); Equip (secondary) opens Army on this card's age with the card lifted (tap-a-slot mode); Show odds (tertiary) for cards from capsules.
- **Upgrade:** first tap on the green button starts the level-up ceremony (MR-39). The Amber price and the result are on the button, so no confirm is needed for normal upgrades; a confirm modal appears only when the price is over 50% of the player's Amber (H5). The button re-arms 600 ms after the ceremony with the next price, so a double tap cannot spend twice (UA-08).
- **Turrets and powers** use the same template (the stage shows the turret firing or the power's area on a small lane).

### 4.5 Customize (S12)

Owner: many cosmetic collections and a Customize screen where you see them.

**Phone layout:** left 55%: the **live preview stage** (Pixi through an app-provided slot, 4.5 note): your base of the selected age with its skin, base flag, national flag and decorations on a strip of lane; one of your troops in front of it with its skin; the emote and quote play as a bubble over the base. An age picker (chips) under the stage switches the base's age. Right 45%: category tabs (Base, Flags, Troops, Voice, Banner & title) and a grid of items with rarity gems, owned state, and "Equipped" check.

- Tap an item: it is **previewed at once** on the stage (try-on; MR-60), without equipping. The action bar's primary becomes "Equip" (green). Tap Equip: MR-61. Leaving without equipping restores the equipped look.
- Locked item: preview still works (seeing what you can earn is motivating and honest), the action bar shows the source ("Earn: Wardrobe Crate") instead of Equip. Nothing can be bought.
- Counts: one source of truth (the collection model), so the header and tabs can never disagree again (UA-15).
- Base decorations snap to fixed anchors that never cover mounts or HP (A18.9.4); an anchor picker shows the free anchors as dashed rings on the preview.
- Desktop: the preview is larger (60%) and the unit can be rotated by dragging.

Note: the UI layer cannot import Pixi (B2). WP11 provides a `PreviewStage` slot the same way it mounts the battle canvas, and WP4's base and unit views render into it; WP9 lays out the screen and sends the selected ids.

### 4.6 Capsules tab (S8) and the capsule summary

- **Capsules tab:** a shelf of capsule tiles (tier colour and pips, name, source: "From level 4", "Supply Capsule"), the selected one large on the left with Open (gold) and "i" (odds sheet with the A15.3 line); "Open all" (secondary) when 2 or more wait. Beside the shelf: charges "12/28" with the lightning icon and the refill rule in its info panel (no timer), the Supply progress, the Clay meter. Wardrobe Crates sit on the same shelf with their own look.
- **Opening:** the tile grows into the capsule stage (MR-50), then A10 as built and polished by WP10.
- **Summary** (WP10, fixes UA-18): cards stagger in in reveal order (MR-52); NEW cards show "Equipped" as a state label (flat pill, not a grey button) or an "Equip" (green) when not auto-equipped; copies bars read "8/10" and never "5/2" (over-full bars cap and show "Upgrade ready"); Amber flies into the Amber chip (MR-21). One primary at the right: "Open next (2)" while capsules wait, else "Continue". "Upgrade" (secondary) jumps to the best ready upgrade. Summary → Home: new cards fly to the Army tab (MR-53).
- **Honesty panels** (UA-19): the full honesty line on the first capsule and in every odds sheet; on later capsules a compact "Odds" chip (44 hit) that opens the sheet, so the peak moments are not crowded.

### 4.7 Battle HUD (S4, S4a, S4b, S5)

Owner directions: six troops per battle, the Age Power dragged onto the field, class icons on cards, turret mounts on the base, the stance control, and the War Council when A18 adds it. The HUD stays a DOM overlay (A9.2) and follows the same tokens.

**Phone 844 × 390 (usable width 750):**

```
+--------------------------------------------------------------------------------------+
| [HP ██████ 100%][Stone ◉ XP ███]   2:41  [emote]   [AI ◉ ███ HP][Scouted 3][||][1x]   |  top band 44
|                    [◂ base][====== minimap strip ======][front ▸]                     |  minimap 24 (+10 hit)
|                                                                                      |
|                                   lane (no persistent controls)                      |  lane ≈ 207
|                                                                                      |
| [◉ 1,240 +6/s ][c1][c2][c3][c4][c5][c6]  [Charge|Hold|Back]  ( POWER )              |  tray 94
| [Council][Evolve]                                                                    |
+--------------------------------------------------------------------------------------+
```

| Element | Phone size | Desktop | Notes |
|---|---|---|---|
| Top band | 44 tall | 56 | HP bars 12 tall with the percentage at 12 px; age icon 24; the XP bar with "XP 44/680" at 12 px; clock 16 px bold; the AI chip 11 px tag on a plate |
| Minimap | 24 visual, 44 hit (the hit area extends 10 px into the lane edge only during touch) | 32 | base and front buttons 44 × 44 hit |
| Pause, speed | 36 visual, 44 hit | 40 / 48 | top-right (rare actions, T3) |
| Scouted chip | 44 tall | 44 | drop-down as built, collapses after 3 s |
| Tray | 94 tall | 128 | gold and income at 14 / 12 px (drop "+Income · 200", UA-04) |
| Left cluster | 100 wide: gold counter row 40, then Council (48) and **Evolve** (48) | 132 wide | Evolve moves from the top-left to the left thumb (UA-05, T3); a ring shows XP; it glows steadily and breathes when ready (the one pulse); it stays dark for 2 s after an evolve even with full XP (UA-07) |
| Six unit cards | 62 × 84 each, 6 px gaps (402) | 88 × 116 | from 900 px wide 72 × 96; class icon top-right, cost top-left, name 11-12 px (two lines, no ellipsis), radial training fill, queue count badge, key badge on desktop only |
| Stance | 3 × 44 = 132 wide, 44 tall, icons with 11 px labels under | 3 × 56 | Charge / Hold / Fall back (A18.4); the Hold flag is dragged on the lane when Hold is chosen |
| Age Power | 88 round | 112 | drag is primary (built); the READY tag sits inside the ring, not clipped (UA-14) |
| Last Stand | 56 round, floats above the power only while armed | 64 | |

Width check at 844: 100 + 8 + 402 + 8 + 132 + 8 + 88 = 746 ≤ 750. Height check at 390: top band 44 + minimap 24 + lane 207 + tray 94 + home-indicator inset 21 = 390.

**Rules:**

- Actions along the bottom, status along the top; nothing persistent over the lane band (A9.2).
- **One pulse** at a time (U11). Priority when several are ready: a tutorial target, then Evolve, then the Age Power, then a new mount. The others show a steady "ready" state (glow at rest), not a loop. Affordable tray cards glow and rest; they never keep moving (UA-14).
- **Denied presses say why** next to the card: "Need 40 gold", "Army full", "Legendary in field", "Queue full" (MR-03). A legend for the queue seconds: the radial fill plus a small clock icon with the seconds.
- **Card info:** long-press 450 ms (touch) or hover (desktop) opens the tip; the 24 px "i" badge is removed; the first battle with 4+ cards teaches it once: "Hold a card to see its counters" (UA-06).
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
| War Path win | Next level | Home | Watch replay |
| War Path loss | Try again | Home; after 3 losses in a row "Try Easy" (A18.7.4) | Watch replay |
| Ladder, Quick Battle, Skirmish | Next battle | Home | Watch replay |
| Daily | Home | Copy result | Watch replay |
| A capsule was earned | Open capsule (the capsule is the step-2 reward; opening it returns here) | Next level | |
| Night (22:00-06:00) or a stopping card (A15.6) | Home | Next level | |
| Onboarding L1 | Open capsule | none | none |

Staging: MR-90 (victory) or MR-91 (defeat), then the rewards (MR-21, MR-22), then the primary arrives last with the pulse. A tap anywhere skips to the end state. Trophies after a loss never count up; a loss's earned Amber still counts up (positive framing).

### 4.10 Settings (S15)

- Sections as top tabs on desktop and as a single scroll with sticky section chips on phones: **Sound** (Master, Music, SFX, UI), **Display and motion** (graphics preset, reduce motion, shake, hitstop, damage numbers, quick reveal, default speed), **Accessibility** (text size 100/115/130%, colourblind preset, vibration), **Play** (break reminder, language), **Save** (export, import, reset), **About** (odds overview, For parents, credits, event log export).
- Every control shows its current value (H6); changes apply at once with a preview where possible (text size changes the settings screen live; reduce motion plays a 1 s demo tile).
- Touch devices hide desktop-only options such as edge scroll (UA-27); keyboard hints show only on desktop.
- Reset save is red, at the bottom of Save, with a typed confirm ("Type RESET") because it cannot be undone.

### 4.11 Trophy Road and Profile

- **Trophy Road (S13):** a horizontal road like the War Path (same node, star and claim visuals, G4), opening on "You"; claim buttons always on the same side of the road (UA audit note); nodes show the reward icon and the trophy threshold with a trophy icon so "50" and "110" are not confused (UA-17).
- **Profile (S14):** consistent numbers from one model (UA-20: wins and "no matches yet" never together); the banner and arena chips deduplicated; "All opponents in this version are AI." kept.

---

## 5. Motion and juice

### 5.1 Motion principles

1. **Purpose first.** Every animation does one of six jobs: feedback, continuity, attention, state change, celebration, life (M1). A row in 5.5 names its job.
2. **Direction explains space.** Deeper screens grow in from what you tapped; going back shrinks into it. Tabs slide from their side. Rewards fly to where they are kept. Sheets rise from the edge or the button that opened them (M4, B-rank 20).
3. **Weight through timing.** Light things (chips, toggles) move in 150 ms, panels in 220-300 ms, screens in 300-400 ms; heavy things (a capsule, a boss node, a base) are slower and hold on impact.
4. **The five beats** for anything that matters: anticipation, action, impact, follow-through, residue (M5). Size by event class (5.3).
5. **Staging.** One focal point: while a ceremony plays, everything else holds still and dims to 50-60%.
6. **Never block.** Input during a transition completes it at once or retargets it; ceremonies skip to their end state on tap; nothing longer than 1 s is unskippable (R1, U12).
7. **Same feel on DOM and canvas.** CSS, TS tweens in the UI, the capsule show (Pixi) and the HUD use the same tokens, so a button, a card flip and a capsule land feel like one game.
8. **Realistic weight** (3.7): big panels decelerate without bounce; overshoot is for small pieces (buttons, badges, cards, numbers).

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
| Whoosh | sheets, screens, flights | none | `ui_sheet` (a short cloth swish), `ui_whoosh` (a screen transition air), `reward_fly` (a light rising swish) |
| Place / stamp | equip, research pick, claim stamp | `ui_confirm` | `card_place` (a card set on wood with a metal click), `ui_stamp` (a brass stamp) |
| Chime | claims, counts, ready states | `coin_gain`, `copy_tick`, `upgrade_ready`, `power_ready`, `evolve_ready` | `counter_tick` (one soft tick for count-ups, pitched up by the caller) |
| Fanfare | medium and large moments | `level_up`, `upgrade_slam`, `victory_jingle`, `defeat_jingle`, the capsule set | `ui_unlock` (a lock break and a rising shimmer), `star_stamp` (one per star, pitched +2 semitones each), `path_draw` (a quick scribble of rising plucks), `node_drop` (a soft thud with a bell), `region_open` (gates and a short brass sting), `vs_slam` |

One sound per event, never stacked; sounds land on the impact frame; all go through the UI bus with the A13 limits (4 voices per id, 40 ms retrigger gap). The War Path ids are the "node, star and crown sounds" A13 already plans.

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
| MR-11 | In-screen tabs (Collection, Customize, Settings, age tabs) | micro | none | shared axis X with 16 px (150 / 220); the underline slides | the grid staggers in only on first view (MR-17) | `ui_tab` | cross-fade |
| MR-12 | Tile or node to detail (Card detail, Level preview, capsule tile to stage) | small | the tile presses | container transform: the tile grows into the screen or sheet (300, `standard`); the rest dims to 60% and scales 0.98 | children stagger in (40 each, max 240); Back reverses into the same tile (200, `exit`) | `ui_whoosh` (soft) | 150 cross-fade |
| MR-13 | Push to an unrelated sub-screen (Settings, Profile, Trophy Road) | small | none | shared axis Z: incoming 0.96 → 1 and fades in (300, `enter`); outgoing 1 → 1.04 and fades (200, `exit`) | Back reverses | `ui_whoosh` (soft) | cross-fade |
| MR-14 | Sheet open and close (Modes, Goals, odds, info, Level preview from the plate) | small | the scrim starts fading to 72% (220) | the sheet rises from its edge or its button (300, `enter`); content staggers (40) | close: slides down (200, `exit`); drag-down follows the finger 1:1 and closes past 30% or a flick | `ui_sheet` | fades |
| MR-15 | Home → VS → battle | medium | Play dips (`anticipate`, 90 ms, scale 0.94) and its sheen flashes | the map camera zooms into the node (400, `standard`), fade-through to VS; the two sides slide in from their edges (300, `enter`); "VS" slams from 1.6 to 1 (160) with a 60 ms hold and a 2 px kick | after 2 s (or a tap) fade-through (300) into the battle | `ui_confirm`, `ui_whoosh`, `vs_slam` | fades, no zoom, no kick |
| MR-16 | Modal open and close | small | scrim fades in (150) | panel 0.92 → 1.02 → 1 and fades in (220, `back`) | close 160 (`exit`) | `ui_toggle` | fade |
| MR-17 | First view of a grid or list | small | none | items fade in with an 8 px rise (220, `enter`), 40 stagger in reading order, max 6 steps | only on the first entry of a session, never on every return | none | all fade at once (150) |
| MR-18 | Map pan and "Back to my level" | micro | none | pan follows the finger 1:1 with inertia (friction 0.95 per frame), rubber band 30% at the ends; the chip slides in from the edge (220) when the current node leaves view | tap the chip: the camera pans to the node (400, `standard`) | none | the camera jumps with a 150 fade |
| MR-19 | Loading lazy content | micro | none | skeleton plates with a slow shimmer (1,600 period) | content fades in (150) when ready; never a blank frame over 100 ms | none | static skeleton |

**C. Numbers and rewards**

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-20 | Count-up of a gain | small | none | the number rolls from old to new (`countS`-`countXL`, `out`), tabular digits | bump 1.15 → 1 on arrival (220, `back`); a "+120" chip rises 12 px and fades over 1 s | `counter_tick` every ~60 ms (max 8), pitch rising | the new value fades in (150) with the "+N" chip |
| MR-20b | Spending (Amber, Dust, gold) | micro | none | the number counts down quickly (300, `out`), no bump | a "−400" chip fades in place | none | new value fades |
| MR-21 | Fly-to-counter (Amber, Dust, trophies, stars, XP) | small | the source pops 1.1 (90) and bursts 3-12 tokens that scatter 80-120 px (150, `out`) | tokens fly on arcs (control point 30% above the line) to the chip (`fly`, 40 stagger) | the chip bumps on each arrival (1.08, 120) and counts (MR-20); the sum shows once | `reward_fly` on launch, `coin_gain` per arrival (throttled 40 ms), `ui_confirm` at the end | no tokens; the chip glows (300) and updates |
| MR-22 | Progress bar fill | small (medium at a milestone) | none | fills with a bright leading edge (400-600, `out`) | at a threshold: a 120 ms hold, 8 sparks, the milestone icon pops 1.2 → 1; a full War Chest shakes, bursts and a capsule flies to Capsules (MR-51) | `meter_pip`, `upgrade_ready` at a milestone | the fill fades to the new width (150); the milestone icon glows |
| MR-23 | Quest claim | small | the quest card shakes 2 px (90) as the Claim press lands | a "Done" stamp drops from 1.6 to 1 (160, `standard`) with a 60 ms hold | rewards fly (MR-21); the card collapses (220) and the next quest slides in | `ui_stamp`, then the MR-21 sounds | stamp fades in; rewards per MR-21 R |
| MR-24 | New item joins a tab (card to Army or Collection, cosmetic to Customize, capsule to Capsules) | small | the item lifts from its source (100) | it flies on an arc to the tab icon (500, `standard`) and shrinks to 30% | the tab icon bumps (1.15, 220) and its badge pops or flips to the new number | `reward_fly` | the badge updates with a fade |
| MR-25 | Badge appear, change and clear | micro | none | appear: 0 → 1.15 → 1 (220, `back`); number change: digits flip vertically (150) | clear: shrink to 0 (150, `exit`); no looping badge motion | none | fade |
| MR-26 | Trophy change after a battle | small | none | trophies count (MR-20) along the arena bar (MR-22) | crossing an arena gate is medium: the gate opens (600) and the new arena name drops (display type) | `counter_tick`, `region_open` at a gate | counts per R, gate fades |

**D. Cards and the deck**

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-30 | Select a card (tap path) or start a drag | micro | none | lift 1.06 (select) or 1.08 (drag), shadow to e5 (100, `back`); a drag follows the finger 1:1 with a 4° tilt toward the motion; the origin keeps a 40% ghost | valid slots light up (gold outline, 150); on the tap path they wiggle once (±2°, 200) | `card_lift` | lift shown as outline and shadow only; slots glow |
| MR-31 | Drag over a slot | micro | none | magnetic snap within 24 px: the card eases toward the slot centre; the slot scales 1.04 | the card in the slot slides 6 px aside to preview the swap | none | outline only |
| MR-32 | Place or equip a card (drop, tap-tap, double-tap, Equip now) | small | on tap paths the card pulls back 4-6 px (60, `anticipate`) | arc flight to the slot (280, `standard`) | lands with squash 0.94 → 1.03 → 1 (180, `back`); the slot rim flashes in the card's rarity colour (120) with 6 sparks; the grid copy gets its check (MR-25); the replaced card flies back to its grid spot on an arc (280); the average level counts (MR-20); the advisor chip cross-fades | `card_place` | the slot cross-fades to the new card (150) with a rim colour flash; no flight |
| MR-33 | Invalid drop | micro | none | the card returns along its path (220, `out`) | a small shake at the origin and the reason ("Bronze card") | `ui_deny` (soft) | the card fades back with the reason |
| MR-34 | Remove a card from a slot | micro | lift (MR-30) | flies back to the grid (240, `standard`) | the slot shows the dashed "+" (fade 150); Undo toast (MR-09) | `ui_toggle` | fades |
| MR-35 | Swap two slots | small | both lift | the two cards cross on arcs, one over and one under (280) | both land with MR-32's squash | `card_place` | cross-fade both slots |
| MR-36 | Auto-fill | small | the button presses | slots fill one after another, each a short MR-32 from the grid (60 stagger, total ≤ 800) | the age tab's check pops (MR-25) | `card_place` every second card | slots cross-fade together |
| MR-37 | Age tab switch in Army | micro | none | MR-11 for the grid; the loadout cards flip on the Y axis to the new age (180, 30 stagger) | none | `ui_tab` | cross-fade |
| MR-38 | Filter or sort change in a grid | micro | none | leaving items shrink to 0.9 and fade (120); staying items move to their new place with FLIP transforms (220, `standard`); new items fade in (20 stagger, max 160) | none | `ui_tab` | the grid cross-fades |
| MR-39 | Card upgrade (Card detail; also the first forced upgrade with a longer 500 ms anticipation and the hand pointer) | medium, ≤ 2 s, tap skips | Amber tokens fly from the Amber chip into the card (300, reverse MR-21) while the card lifts and trembles (±2 px, 8 Hz) and a charge glow builds (250) | a burst of light from the card and a shine sweep across the frame (150) | impact: a 120 ms hold; the level number flips (old drops 12 px and fades, new pops 1.4 → 1 with `back`); follow-through: stat rows tick one by one (80 stagger) with green "+N" chips that rise and fade (800); residue: the copies bar resets with a fill, the plan's average level counts up; the button re-arms after 600 ms with the next price | charge swell (`evolve_riser` short until `upgrade_charge` exists), `upgrade_slam` on impact, `level_up`, `counter_tick` per stat | no tremble or flip: glow (300), the level cross-fades, deltas appear as green chips |

**E. War Path, progress and unlocks**

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-40 | Feature or tab unlock (Army, Capsules, Collection, Modes, Customize, Goals) | medium, ≤ 2 s | the rest of Home dims to 50% (220); the padlock shakes 3 times (±6°, 240) | the padlock cracks and bursts into 6 pieces (150) | the item turns from grey to full colour with a light sweep (300) and pops 1.2 → 1 (`back`); a pointer line (≤ 8 words) with "Open" (gold) and "Later"; a NEW dot stays until opened | `ui_unlock` | dim, cross-fade to colour, the line |
| MR-41 | Level complete on the map (after a win) | medium, ≤ 2 s, tap skips | the camera eases to the beaten node (300, `standard`) | stars stamp in one by one: each drops from 1.8 to 1 (160) with a 60 ms hold, 6 sparks and a small dip of the node, 250 apart, pitch rising; a crown pops if it is a new best difficulty | the road dots draw to the next node (600, dots pop in sequence); the next node drops from 40 px above with squash 0.9 / 1.1 → 1 and a dust ring; the level plate slides to it (300) and Play starts its pulse | `star_stamp` × n, `path_draw`, `node_drop` | stars fade in (150 each), the road appears whole (300 fade), the node fades in; Play gets its static glow |
| MR-42 | Boss beaten, region opens | large, ≤ 6 s first time, 3 s after, tap skips | MR-41 on the boss node; the boss banner burns away (400) | the region gate swings open (600); the camera pans along the road into the new region (800, `standard`) while the art layers slide at their parallax speeds | the region title drops ("Bronze Age: Hellas", display type, 300 with a 120 hold); unlocked cards fly to the Army tab (MR-24); a music sting | `region_open`, music sting | gate and title fade in, the camera jumps with a fade |
| MR-43 | Unearned stars | none | empty sockets are always shown; no negative animation | | | | |
| MR-44 | Card unlocked by a level (A18.7.8) | small | the card appears over the node (pop 220) | it flies to the Army tab (MR-24) | Army's NEW dot | `reward_fly` | fade |
| MR-45 | Trophy Road or Goals claim | small | as MR-23 | the node stamps "Claimed" | the reward flies (MR-21 or MR-24); the next node lifts 4 px | `ui_stamp` | per MR-21 R |
| MR-46 | Difficulty change on the level plate | micro | none | segmented pill slides (MR-04); the AI tier label flips (150) | the ★★★ goal line highlights when Hard or higher is chosen | `ui_toggle` | fade |

**F. Capsules** (A10 as built and polished by WP10; these rows add the entry, the exit and the rewards)

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-50 | Open from the Capsules tab | small, then A10 | the tile presses | container transform into the capsule stage (400); A10 step 1 arrival lands on the pedestal | A10 steps 2-7 | A10 set | cross-fade into the stage |
| MR-51 | A capsule is earned (Result, claim, War Chest) | small | the capsule pops over its source | flies to the Capsules tab (MR-24) | the tab count flips | `reward_fly`, `cap_thud` (quiet) | fade |
| MR-52 | Summary | small | none | cards drop into the summary in reveal order (40 stagger); Amber pours into the Amber chip (MR-21); copies fly into bars (A10 step 7) | "Open next (N)" arrives last with the pulse | A10 set | all fade in, counters update |
| MR-53 | Summary → Home | small | none | new cards fly to the Army tab, cosmetics to Customize (MR-24), then a fade-through to Home (300) | Home plays any pending MR-41 or MR-40 afterwards (queued, U13) | `reward_fly` | fade |
| MR-54 | Odds chip and honesty panel | micro | none | the odds sheet rises (MR-14) | none | `ui_sheet` | fade |

**G. Customize and Collection** (owner WP9; preview views WP4)

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-60 | Customize: try on an item (WP9 with WP4 views) | small | the item tile presses | base skin: the base cross-dissolves to the new skin (300) with a squash 0.97 → 1; flag: the new flag unfurls from the pole top (400); decoration: drops into its anchor (250) with squash and dust; troop skin: the unit poofs out and in (200); emote plays; quote shows in a bubble (fade 150) | the tile gets a "Previewing" outline | `ui_pop` | cross-fades only |
| MR-61 | Customize: Equip | small | Equip presses | an "Equipped" stamp drops on the tile (160) | a small glint runs over the preview; the check appears on the tile | `ui_stamp` | stamp fades in |
| MR-62 | Customize: a locked item | micro | none | the padlock shakes (MR-03 style) | the source line highlights ("Wardrobe Crate") | `ui_deny` (soft) | the source line highlights |
| MR-63 | Collection completion change | small | none | the completion count rolls (MR-20) and the bar fills (MR-22) | none | `counter_tick` | fade |

**H. Battle UI** (owner WP5 unless noted)

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-64 | Tray card becomes affordable / unaffordable | micro | none | glow ramps in (150) and rests; saturation and the cost colour change | none, no loop | none | the same, it is a state change |
| MR-65 | Train a unit (tray press) | micro | MR-01 on `pointerdown` | the card pops 1.06 (120) and the queue badge flips +1 | radial fill runs; on spawn a small pop on the card | `ui_click`, then `spawn_pop` from the world | no pop, badge updates |
| MR-66 | Training complete | micro | none | the radial fill closes | tick and a 1.05 pop (120) | `meter_pip` (quiet) | ring closes |
| MR-67 | Denied train or build | micro | none | MR-03 on the card | the reason label above the card ("Need 40 gold", "Army full", "Legendary in field", "Queue full") | `ui_deny` | outline and label |
| MR-68 | Evolve becomes ready | small | the XP ring fills | the Evolve button lights (300 fade-up) and starts the pulse (if nothing has priority, 4.7) | none, no flashing ever (feel-ux §5) | `evolve_ready` (one chime) | static glow |
| MR-69 | Age Power becomes ready | small | the charge ring closes with a bright sweep (300) | the button lifts 4 px and breathes (or rests if another pulse has priority) | the READY tag inside the ring pops | `power_ready` | ring closes, glow |
| MR-70 | Age Power drag (built) | small then A12 | press lifts the button (1.08) and the ghost appears under the finger (120) | the ghost follows 1:1 with the valid or invalid tint and rings the units it would hit | release: the ghost contracts to 0.9 (80, `anticipate`), then the A12 "power lands" moment | `ui_click` on pick-up, `ui_confirm` on drop, `ui_toggle` on cancel (built) | no contraction, tint only |
| MR-71 | Stance change | micro | none | the segment slides (MR-04) | on Hold, the flag drops onto the lane at the own front (200) with a squash and a dust puff | `stance_set` (new, planned in A13) | the flag fades in |
| MR-72 | War Council open and close (A18.5.7) | small | the Council button presses | the tray slides down (180, `exit`) as the sheet slides up (180, `enter`); track cards stagger (40) | close reverses | `ui_sheet` | fades |
| MR-73 | Research pick | small | the pick card lifts (100) | it stamps into the research slot (scale 1.3 → 1, 160, `standard`) with a 60 ms hold; the other pick fades | a progress ring starts on the Council button; the sheet closes after 300 | `ui_stamp` | the pick fades into the slot |
| MR-74 | Research complete (A18.5.7) | medium (visual only) | none | a shimmer runs along the affected units (world, WP4) | the class badge pops on the tray cards of that class (40 stagger); the workshop glyph bursts | completion stinger (planned in A13) | glow on the badges |
| MR-75 | Turret mount popover | micro | the mount glows under the finger | the popover grows from the mount (150) | choosing an option collapses it into the mount (150), then the world build moment (built: drop, squash, dust, bolts) | `ui_click`, `turret_build` | fades |
| MR-76 | Scouted drop-down | micro | none | slides down (220) | collapses after 3 s (160) | `ui_toggle` | fades |
| MR-77 | Pause and resume | small | none | the pause card grows from the pause button (220); the lane dims 40% | resume reverses (160) | `ui_toggle` | fade |
| MR-78 | Minimap jump | micro | none | the camera pans to the spot (400, `standard`) | none | none | jump with a 150 fade |
| MR-79 | Gold income and kill coins (A12, built) | micro | none | coins fly to the gold counter | the counter bumps and sums ("+120") | `coin_gain` | counter updates |

**I. The base and the evolve** (owners WP5 camera and HUD, WP4 base moments as built)

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-80 | Your own evolve (fixes UA-07) | large (in battle ≤ 3.5 s of focus; not skippable, the game runs) | Evolve dips (`anticipate`, 90); **the camera always frames the own base** for the beat (today it pushes only when the base is in view: make the push a pan-and-push from anywhere, 500, `standard`); the base build-up (built `baseAscend`: tremble, crack lights, windows burn, motes) | the morph (built: shards burst, bands drop, flags unfurl) with a **soft tinted flash** (warm white at 35% maximum, 120 ms; not near-full white) and the global 100 ms hitstop | the tray cards flip to the new age one by one (180 each, 40 stagger); the banner "Bronze Age reached" drops (300, display type); allied units cheer; the camera returns to where it was (500, `standard`); Evolve stays dark for 2 s | `evolve_riser`, `evolve_fanfare_<age>`, the key change | no pan (the minimap base flashes gold instead), morph cross-fade, flash at 20%, tray cross-fade |
| MR-81 | Enemy evolve | small | none | a banner on their XP bar (built) | none; no camera move | `evolve_enemy` | banner fades |
| MR-82 | Base upgrade by research (Keep Walls, Defences, Economy picks) | medium (visual only) | the base glows at its lights (300) | Keep Walls: bands tighten around the base with a gleam; Economy: the coin burst of the built Treasury moment | the new income pops ("+1.5/s", built) | completion stinger | glow only |
| MR-83 | New mount slot, turret build, Modernise (built) | small | as built | as built | as built | `slot_buy`, `turret_build`, `turret_upgrade` | as built (fades, no squash) |

**J. Match end**

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-90 | Victory → Result | large | the base destroyed moment (A12: 250 ms hitstop, 1.2 s slow motion, camera push) | fade-through (300) to the Result; the "Victory" banner drops from above (300, `enter`) with a 120 ms hold and a small squash; a slow sunburst turns behind it (life, 20 s period, low contrast) | War Path: stars stamp on the level badge (as MR-41); step 2: the capsule drops onto the panel (a mini A10 arrival, 400); step 3: one bar fills (MR-22); the summary row fades in; the primary rises last (220) and starts the pulse | `victory_jingle`, `star_stamp`, `cap_thud` | banner fades in, steps fade in order |
| MR-91 | Defeat → Result | medium | the defeat moment (A12) | the "Defeat" banner fades down without bounce (300), cooler tint, no shake | earned Amber still counts up; the tip fades in; "Try again" rises last | `defeat_jingle` (gentle) | fades |
| MR-92 | Draw | medium | as MR-91, neutral tint | | | `defeat_jingle` softened | fades |
| MR-93 | Result → Next level or Next battle | small | the button dips (MR-15) | fade-through to VS (300) | as MR-15 | `ui_whoosh` | fade |
| MR-94 | Result → Home after a War Path win | small | none | fade-through into the map at the beaten node (300) | MR-41 (queued after any MR-40) | `ui_whoosh` | fade |

### 5.6 Reduce motion

Replace the current rule (every animation and transition set to 1 ms, `theme.css` lines 147-163) with per-component variants:

| Full motion | Reduced |
|---|---|
| slides, zooms, container transforms, shared axis | 150 ms cross-fade (`micro`) |
| squash, overshoot, bounce, pops | no scale change; a colour or glow change instead |
| flying tokens and cards | the destination updates with a 150 ms fade and a "+N" chip |
| camera pans and pushes (map, evolve, minimap) | an instant jump with a 150 ms fade; the minimap base flashes for the own evolve |
| screen kick, shake, tremble, parallax | off |
| looping pulses and sheens | a static glow or outline on the same element |
| count-ups | the final value fades in (150) |
| capsule strikes and reveals | cross-fades; rarity pre-signals, the reveal order and the honesty lines unchanged (A10) |
| full-screen flashes | at most 20% strength, never more than 3 per second (A5) |

Implementation: `[data-reduce-motion='true']` and `prefers-reduced-motion` switch the duration tokens (`small`, `medium`, `large` become 150; `press` and `release` become 0 with the colour change kept) and the transforms (`--ui-press-scale: 1`, `--ui-lift: 1`), so components get their reduced variant by using the tokens. TS and Pixi helpers read the same flag. A test takes a reduce-motion capture of Home, Army and a card upgrade and checks that opacity changes over at least 100 ms while no `transform: scale` changes.

### 5.7 Performance limits

| Limit | Value |
|---|---|
| Frame target | 60 fps on a mid-range phone; UI animation JS ≤ 4 ms per frame on meta screens and ≤ 2 ms per frame in battle (the battle owns the frame, B16) |
| Properties | animate only `transform` and `opacity`; `filter` only for the 8 px desktop blur (never animated); never animate `box-shadow`, `width`, `height`, `top`, `left` (glows are pre-drawn layers whose opacity animates) |
| Concurrent motion | meta: ≤ 24 animating DOM elements and ≤ 12 flying tokens at once; HUD: ≤ 6 animating tray elements plus 1 pulse |
| Particle bursts | ≤ 12 DOM elements per burst; bigger bursts go to one shared overlay canvas owned by the UI effects helper (2D canvas, created on first use, released on screen exit) |
| `will-change` | set at animation start, removed at the end; never in static CSS |
| Lists | FLIP transforms for reorder; grids of 60+ tiles render lazily (only rows in or near view) |
| Loops | at most 1 attention pulse per screen plus ≤ 8 ambient map props on Home; loops pause when the document is hidden or the screen is not on top |
| Lite preset | half the tokens and sparks, no sheen sweeps, no map parallax, no blur |
| Map | region art as three image layers per region, only the current and neighbouring regions decoded; nodes outside the view plus 1 screen are not in the DOM |
| Timing | UI motion never changes gameplay timing; battle UI animations run on the view clock, not the sim (B5) |

---

## 6. Implementation plan

### 6.1 Ground rules

- **Order:** the most confusing problems first (audit §7). Each phase ends green (typecheck, lint, tests, build) with its review (6.10) passed; the orchestrator commits.
- **Owners** follow DESIGN Part C: WP9 `src/ui/**` (not the HUD), WP5 `src/ui/hud/**` and `src/render/**`, WP10 `src/capsule/**`, WP11 `src/app/**`, WP4 `src/visuals/**`, WP6 `src/audio/**`, WP0 `src/core/**` and `src/contracts/**`, WP1 `src/content/**`, WP7 `src/meta/**`, WP8 `src/save/**`, WP12 `tools/**`, `tests/**`. Cross-package needs go to `docs/requests/`.
- **In-flight work** (Home flow, card class icons, power drag, capsule show, base upgrade effects, card reveal) lands first. Its visible results are kept; UI-0 restyles them through the shared components and tokens, it does not undo them. UI-2 starts from the Home flow agent's landed version.
- **Motion ships with the feature:** each phase lists its catalogue rows; a phase is not done while a listed row is missing or static.
- **No new dependencies.** Motion helpers are small in-house TS (no animation library); fonts are static files. `package.json` is untouched.

### 6.2 UI-0 Foundations (size M, first)

**Fixes:** UA-09, UA-23, UA-04 and UA-05 (the rules), groundwork for UA-03.

| Work | Owner and paths |
|---|---|
| Motion tokens as integers (`dur`, `ease`, transforms) | WP0: `src/core/motion.ts` (request) |
| Colour, type, spacing, radius, elevation and motion tokens (3.2-3.4, 5.2); reduced-motion variants replacing the 1 ms rule; retire `--ui-dim`, violet and blue button faces | WP9: `src/ui/theme.css`, new `src/ui/motion.css` |
| One `Button` with the roles primary, progress, secondary, tertiary, destructive and the sizes XL, L, M, S, Icon; pressed state from `pointerdown`; hit-area wrapper for small icons; `data-primary`, `data-pulse`, `data-tag`, `data-clip-check` | WP9: `src/ui/components/Button.tsx`, `kit.ts` |
| `ScreenFrame` with a fixed header and action bar; `Sheet`; toast anchoring near the source with Undo | WP9: `src/ui/components/Layout.tsx`, `Modal.tsx`, `Toasts.tsx` |
| Motion helpers: `fly`, `countUp`, `stagger`, `flip`, `pulse`, all reduce-motion aware | WP9: `src/ui/components/motion.ts` |
| App screens move from `.ab-btn` to the shared Button (Title, Result, First upgrade, Age dialog, Battle screen, Replay) | WP11: `src/app/ui/*`, `src/app/screens/replay/*` |
| Budget spec (1.3) and the token parity test; lint rule: no `cubic-bezier(` outside the token files | WP12: `tests/e2e/ui-budget.spec.ts`, `tests/integrity/motion.test.ts`, lint config via request to WP0 |
| Review scripts: turn the audit scripts (`p1_new.cjs` ... `p6_modes.cjs`) into `tests/e2e/ui-review/*.spec.ts`, run only with `UI_REVIEW=1`, writing screenshots to an ignored folder | WP12 |

**Acceptance:**

- `grep` finds no `ab-btn`, `ui-btn--violet` or `ui-btn--blue`; every button in `src/ui`, `src/app/ui` and the capsule summary is the shared Button.
- `theme.css` defines every token in 3.2-3.4 and 5.2; the parity test passes; no `cubic-bezier(` outside the token files.
- With reduce motion, a screen entrance is a 150 ms fade (measured), not a 1 ms jump.
- The budget spec runs on Home, Army, Collection, Card detail, Customize, Result, Settings and the HUD at both viewports. It may report existing violations in this phase (they are the backlog for UI-1 to UI-4) but must pass for the components it tests in isolation (Button, CardTile, tabs, chips) on the dev component page.

**Screenshot review:** before and after contact sheets of every screen at both viewports; the squint and colour-vision captures of Home and the HUD; a 50 ms burst of a button press (MR-01) and a denied press (MR-03).

### 6.3 UI-1 Blockers (size M)

**Fixes:** UA-01, UA-03, UA-10, UA-18 (the primary), UA-22, UA-21 (Resume size).

| Work | Owner and paths |
|---|---|
| Mode select becomes the Modes sheet (4.1): one card per row on phones, pickers visible, neutral cards, gold Play in the action bar | WP9: `src/ui/screens/modeSelect/**` |
| Action bars on Card detail, the Conquest General sheet, Skirmish setup and the War Plan (the current screens, before UI-4 rebuilds them) | WP9: `cardDetail`, `conquest`, `modeSelect`, `warplan` |
| One Result design with the primary table of 4.9; the onboarding variant replaces the app's own Result | WP9: `src/ui/screens/result/**`; WP11: `src/app/ui/ResultScreen.tsx` removal and wiring |
| Capsule summary: one primary ("Open next (N)" or "Continue"), "Equipped" as a state pill, copies capped | WP10: `src/capsule/summary.tsx`, `summaryModel.ts` |
| Pause: Resume 48 tall, Retreat moved away | WP9: `src/ui/screens/pause/**` |
| VS starts by itself after 2 s | WP9: VS screen; WP11 if the countdown lives in the app |

**Acceptance:** all 11 picker buttons of the audit pass the `elementFromPoint` hit test; a ladder battle starts in 2 taps from Home plus no VS tap; the Card detail Upgrade button is visible at 844 × 390 without scrolling; the Result's primary is Next battle (or per 4.9) in the bottom-right on every mode; the budget spec passes for Result and the Modes sheet.

**Screenshot review:** Modes sheet, Card detail, Result (win, loss, Daily, onboarding) at both viewports; frame bursts of MR-14 (sheet) and MR-90 (victory staging) as far as built.

### 6.4 UI-2 Home as the War Path hub (size L)

**Fixes:** UA-02, UA-13, UA-17 (Home terms), UA-25 (title to battle), UA-29; owner: the War Path as Home's centrepiece from the first minute.

| Work | Owner and paths |
|---|---|
| War Path screen: map, nodes, road, level plate, Play, difficulty chip, "Back to my level", level preview sheet | WP9: new `src/ui/screens/warPath/**` |
| New Home frame: top bar, Goals rail, Modes tile, bottom nav with 5 tabs and per-tab back stacks; Capsules becomes a tab screen (4.6); Goals sheet | WP9: `src/ui/screens/home/**`, `src/ui/router.ts`, new `src/ui/screens/capsules/**`, new `src/ui/screens/goals/**` |
| Progressive unlocks (2.6) and the unlock ceremony; unlock state in `SaveDoc.flags['ui-unlock.<id>']` through `setUiFlags` | WP9 |
| **War Path v0 data:** the Stone region's 10 nodes plus 2 side nodes, using only match types that exist today (L1 and L2 are the onboarding matches; L3-L10 are Skirmish-style configs against the ladder Generals at rising tiers, with the A18.7.2 role offsets; the boss is the next General up at +2). Stars in v0: ★ for a win; ★★ and ★★★ arrive with A18 phase 5 without changing the screen | WP1: `src/content/raw/warPath.ts` (the A18.7.10 shape, fields not yet used left out); WP7: `src/meta` progress and next-level rules; WP8: a `warPath` progress field (request; or the v3 schema if A18 phase 5 lands first) |
| First launch goes to the map (not the title); the title's Play becomes the map's Play; boot route and onboarding hooks follow the nodes | WP11: `src/app/flow.ts`, `onboarding.ts`, `boot.ts`, `src/app/ui/TitleScreen.tsx` |
| Region art layers (interim: crops of the existing backdrops) and the manifest ids `ui.warpath.region.<ageId>.*` | WP4: `src/visuals/**` (request) |
| Sounds `star_stamp`, `path_draw`, `node_drop`, `region_open`, `ui_unlock`, `ui_sheet`, `ui_whoosh`, `reward_fly` | WP6 (request) |
| Motion rows | MR-10, MR-12, MR-14, MR-15, MR-18, MR-24, MR-25, MR-40, MR-41, MR-42, MR-46, MR-94 |

**Acceptance:**

- First launch shows only the map, L1, Play and the gear; the first battle starts 1 tap after the map appears.
- A returning player starts the next level with 1 tap; Home shows ≤ 15 controls plus nodes, exactly 1 `[data-primary]`, ≤ 1 `[data-pulse]`, ≤ 2 badges.
- Nothing clipped at 844 × 390; the squint test shows Play first.
- A15.13 holds: no timers, no backlog counts on Home.
- A scripted new-player run (Playwright, bot input) reaches each row of 2.7 within ±30 s of its target time up to L2, and every unlock of 2.6 plays its ceremony once.
- Esc and the back gesture on every tab go to Home; tab state is kept on return.

**Screenshot review:** first launch, first return (Army unlock), a mid-game Home, a finished region, all at both viewports; 50 ms bursts of MR-40, MR-41, MR-42 and MR-15; reduce-motion captures of the same; deuteranopia and achromatopsia of Home (node states must read without colour).

### 6.5 UI-3 Battle HUD: readable, reachable, six cards (size M)

**Fixes:** UA-04, UA-05, UA-06, UA-07 (HUD side), UA-14, UA-24 (tray names), UA-26; owner: six troops, power drag kept.

| Work | Owner and paths |
|---|---|
| Type scale and hit areas in the HUD; drop the lowest-value labels ("+Income · 200", "YOU") | WP5: `src/ui/hud/hud.css`, `TopBar.tsx`, `Minimap.tsx` |
| Tray layout of 4.7 for 6 cards (62 × 84 on 844 px phones), Evolve and Council in the left cluster, the stance control, Last Stand placement | WP5: `Tray.tsx`, `PowerButton.tsx`, `Hud.tsx` (the sixth slot needs the A18 phase 2 contract bump; until then the layout reserves the slot) |
| One-pulse priority, deny reasons, long-press teaching, the "i" removed, READY tag fix, mount popover sizes | WP5: `Tray.tsx`, `MountPopover.tsx`, `model.ts`; WP11: the tutorial beat for "Hold a card" (`src/tutorial` via request) |
| Evolve staging: always frame the own base, soft tinted flash, tray flip, Evolve re-arm delay (MR-80) | WP5: `src/render/camera.ts`, `feel.config.json`, `src/ui/hud/**` |
| Motion rows | MR-64 to MR-71, MR-75 to MR-80 |

**Acceptance:** the budget spec passes for the HUD at 844 × 390 (no text under 11 px, no target under 44 px except the allow-list); in a bot match sampled every 250 ms, `[data-pulse]` never exceeds 1; six cards plus both clusters fit at 844 with safe areas (746 ≤ 750); Playwright can click a tray card as "stable" within 1 s; the own evolve keeps the own base on screen ≥ 90% of the beat in the camera e2e; no frame of the evolve is brighter than 35% white over the scene.

**Screenshot review:** HUD at 844 × 390, 932 × 430 and 1280 × 720 in the states start, busy, evolve ready, power ready, denied, paused; 50 ms bursts of MR-67, MR-69, MR-70 and MR-80; reduce-motion bursts; squint test (the tray and power must read first, the top band second).

### 6.6 UI-4 Army, Collection and Card detail (size L)

**Fixes:** UA-11, UA-12, UA-03 (Card detail), UA-08, UA-24; owner: an intuitive deck builder with six troops, class filters, counters and the advisor visible.

| Work | Owner and paths |
|---|---|
| Army deck builder (4.2): fixed loadout column, sticky filters, drag, tap-tap, double-tap, swap, remove, Undo, advisor chip, class strip, legend popover, presets, auto-fill | WP9: `src/ui/screens/warplan/**` (renamed in the UI "Army"; route id kept) |
| Shared drag behaviour (lift, ghost, valid targets, snap, return) used by Army now and forts and the power later | WP9: `src/ui/components/drag.ts` |
| Collection (4.3): 5 tabs with completion, sticky class filters, no truncation, container transform to detail | WP9: `src/ui/screens/collection/**` |
| Card detail (4.4): stage with a motion loop, counter rows first, fixed action bar, upgrade ceremony with the double-spend guard | WP9: `src/ui/screens/cardDetail/**`; the unit loop needs a portrait-in-motion from the art service (request to WP4 if the idle loop is not enough) |
| First forced upgrade uses the same ceremony | WP11: `src/app/ui/FirstUpgrade.tsx` (uses the WP9 component) |
| Undo and "Equip now" placement rules if meta must change | WP7 (request) |
| Motion rows | MR-11, MR-17, MR-30 to MR-39, MR-63 |

**Acceptance:** equip a new card in ≤ 2 taps or 1 drag inside Army; every equip, swap and remove has Undo; both input paths covered by e2e (drag and tap-tap); no truncated names at 844 × 390 (the clip check passes); filters stay visible while the grid scrolls; the class filter shows the 7 player classes plus Turret and Power; the Upgrade button is visible without scrolling and cannot spend twice within 600 ms.

**Screenshot review:** Army in every state of 4.2 at both viewports; 50 ms bursts of MR-30, MR-32, MR-33, MR-35, MR-36 and MR-39; reduce-motion bursts of MR-32 and MR-39; Collection with each tab; colour-vision captures of the grid (rarity must read by gem shape).

### 6.7 UI-5 Satisfaction pass (size M-L)

**Fixes:** section 4 of the audit, UA-18 (flights), UA-19, UA-25; owner: satisfying animations across the whole game.

| Work | Owner and paths |
|---|---|
| Rewards fly and count everywhere: Result, quests, Trophy Road, War Chest, capsule summary (MR-20 to MR-26, MR-45, MR-51 to MR-53) | WP9 (meta screens), WP10 (summary, Amber pour), WP11 (app-owned transitions) |
| Screen transitions with direction: tabs, sub-screens, sheets, modals, VS, Result, capsule to Home (MR-10 to MR-16, MR-90 to MR-94) | WP9, WP11 (`src/app/ui/MetaHost.tsx`, `BattleScreen.tsx`) |
| Capsule show: compact honesty panels after the first capsule, "Tap!" off the pip row, summary staging (UA-19) | WP10 |
| Sound ids of 5.4 wired to the rows | WP6 (ids), each owner (calls) |
| Toast and feedback placement near the source everywhere (UA-22) | WP9, WP5 |

**Acceptance:** every catalogue row in UI-0 to UI-5 has a capture set (a 50 ms burst from input to settle plus 200 ms) that shows anticipation, impact and settle; no row uses a value outside the tokens; every sequence over 1 s skips on tap (e2e taps during each ceremony and checks the end state within 200 ms); reduce-motion captures show fades for every row; no long task over 50 ms during a ceremony in Chromium (performance trace).

**Screenshot review:** a contact sheet per row; one full returning-player session (Home → level → Result → capsule → Home) as a 100 ms sequence at 844 × 390; owner test at the end of the phase.

### 6.8 UI-6 Customize with a live preview (size L)

**Fixes:** UA-15; owner: many cosmetic collections and a Customize screen.

| Work | Owner and paths |
|---|---|
| Customize screen (4.5) with the preview slot, tabs, try-on, Equip, locked sources, anchor picker | WP9: `src/ui/screens/customize/**` |
| `PreviewStage` slot (Pixi) mounted by the app | WP11: `src/app/ui/**` |
| Base, flag, national flag and decoration views for the preview (and the same in battle and on VS) | WP4: `src/visuals/**` |
| Cosmetic content, drop tables, save fields (A18.9.4) | WP1, WP7, WP8 (A18 work, requested there) |
| Motion rows | MR-60 to MR-63 |

**Acceptance:** tapping an item updates the preview within 100 ms (a placeholder) and with full art within 500 ms; counts agree everywhere (one model); every locked item names its source; nothing can be bought; the budget spec passes.

**Screenshot review:** Customize per tab at both viewports; 50 ms bursts of MR-60 (each kind) and MR-61; reduce-motion.

### 6.9 UI-7 Realistic UI skin and polish (size M)

**Fixes:** UA-16, UA-17, UA-20, UA-21, UA-24, UA-27, UA-28; owner: ultra-realistic look, beauty.

| Work | Owner and paths |
|---|---|
| Materials, lighting and textures of 3.7 with the `ui.*` manifest ids and CSS fallbacks | WP9 (`theme.css`), WP4 (manifest entries and images) |
| Fonts Cinzel and Inter as subset `woff2` files, preloaded; size check stays within the initial budget | WP0 or WP11 for `public/fonts/**` and `index.html` (request), WP9 for the tokens |
| Text size setting (100/115/130%); Danish pseudo-locale run | WP9 (Settings, tokens), WP12 (pseudo-locale test) |
| Info panels for every invented term (UA-17), Profile consistency (UA-20), quest swap confirm and Undo (UA-16), Daily tier wording (UA-28), touch-only settings (UA-27) | WP9 |

**Acceptance:** all screens pass the budget spec at 130% text and with the +30% pseudo-locale; colour-vision captures pass for Home, Army, Collection, HUD, capsule summary; initial download stays within the size gate (fonts ≤ 80 KB added); the owner test says the UI "looks like the same game as the art".

**Screenshot review:** a full contact sheet of every screen at both viewports, before and after the skin; a side-by-side of the HUD over realistic Stone art.

### 6.10 Review protocol (every phase)

1. **Build and serve** the production build (`npx vite build`, `vite preview` on a free port). Chromium is preinstalled; never run `playwright install`.
2. **Captures** with the `UI_REVIEW=1` specs: every touched screen at 844 × 390 (touch, safe-area padding, device scale 2) and 1280 × 720, in the save states new player, mid-game and maxed.
3. **Motion bursts:** every catalogue row the phase touched, from input to settle + 200 ms, every 50 ms, into a contact sheet.
4. **Reduce motion:** the same bursts with `reducedMotion: 'reduce'` and with the in-game setting.
5. **Colour vision:** CDP `Emulation.setEmulatedVisionDeficiency` with deuteranopia, protanopia, tritanopia and achromatopsia for the touched screens.
6. **Squint:** a 6 px blur plus greyscale; the primary must read first.
7. **Budget spec** (1.3) green for the touched screens.
8. **Checklist** (1.2) copied into the PROGRESS entry and ticked; any unticked box is fixed before the phase is reported done.
9. **Owner test** at the end of UI-2, UI-3, UI-4 and UI-5: the orchestrator gives the owner short Danish steps on a real phone and asks two questions: "What did you expect this to do?" and "What felt good, and what felt flat?"

### 6.11 Requests to file when a phase starts

| Phase | To | Request |
|---|---|---|
| UI-0 | WP0 | `src/core/motion.ts` integer tokens; lint rule for stray `cubic-bezier(` |
| UI-0 | WP11 | move app screens to the shared Button |
| UI-2 | WP1, WP7, WP8 | War Path v0 data, progress rules, save field |
| UI-2 | WP4 | region art layers and `ui.warpath.*` ids |
| UI-2, UI-5 | WP6 | the sound ids in 5.4 |
| UI-2 | WP11 | first launch to the map, title retired, onboarding on nodes |
| UI-3 | WP11 / tutorial | "Hold a card" beat; tutorial pointers re-anchored to the new tray |
| UI-4 | WP4 | unit motion loop for the Card detail stage |
| UI-6 | WP11, WP4 | `PreviewStage` slot, cosmetic views |
| UI-7 | WP0 or WP11 | fonts in `public/fonts`, preload in `index.html` |
| all | lead | the DESIGN edits of 2.9, logged in `docs/decisions.md` |

### 6.12 Risks

| Risk | Mitigation |
|---|---|
| The War Path v0 map is built before A18 phase 5 and has to be redone | The screen reads the A18.7.10 `WarPathLevel` shape from the start; v0 only leaves fields out. |
| Parallel agents change the same screens | UI phases start after the in-flight work lands; one owner per path (Part C); restyles go through shared components, not per-screen CSS. |
| Six cards do not fit on smaller phones (for example 780 px wide) | Below 820 px wide the tray cards shrink to 58 × 78 and the stance labels hide (icons with tooltips), never a second row (B-rank 15). |
| Motion adds jank on low-end phones | The limits in 5.7, the Lite preset, and the performance trace in the UI-5 acceptance. |
| Realistic textures make text harder to read | The 72% scrim rule, contrast checks in the budget spec, the squint test. |
| Too many ceremonies slow down returning players | Event classes, queueing, shorter repeats, quick reveal, tap to skip (5.3). |

---

## Appendix: audit issues to phases

| Issue | Phase | Issue | Phase |
|---|---|---|---|
| UA-01 Mode select hides controls | UI-1 | UA-16 Quest swap without undo | UI-2 (Goals sheet), UI-7 |
| UA-02 Home crowded, no War Path | UI-2 | UA-17 Jargon | UI-2 (Home), UI-7 |
| UA-03 Primary below the fold | UI-0, UI-1, UI-4 | UA-18 Capsule summary | UI-1, UI-5 |
| UA-04 HUD text too small | UI-0, UI-3 | UA-19 Capsule show panels | UI-5 |
| UA-05 Small targets | UI-0, UI-3 | UA-20 Profile contradicts itself | UI-7 |
| UA-06 Card info via a 24 px "i" | UI-3 | UA-21 Pause | UI-1 |
| UA-07 Evolve off-screen | UI-3 | UA-22 Feedback far from the tap | UI-0, UI-5 |
| UA-08 Upgrade without ceremony | UI-4 | UA-23 Ad hoc motion, reduce motion deletes feedback | UI-0 |
| UA-09 Two button systems, no colour grammar | UI-0 | UA-24 Truncated names | UI-3, UI-4, UI-7 |
| UA-10 Result does not lead on | UI-1 | UA-25 Hard cuts | UI-2, UI-5 |
| UA-11 War Plan not a deck builder | UI-4 | UA-26 Mount popover and slot label | UI-3 |
| UA-12 Collection filters | UI-4 | UA-27 Desktop settings on phones | UI-7 |
| UA-13 3 taps to battle | UI-1, UI-2 | UA-28 Daily tier wording | UI-7 |
| UA-14 Too many pulses | UI-3 | UA-29 Backlog-like badges | UI-2 |
| UA-15 Customize without preview | UI-6 | | |
