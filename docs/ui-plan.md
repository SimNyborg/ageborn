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
3. **UI-2 Home as the War Path hub:** the map is Home from the very first launch, one Play button under the right thumb that always starts the next level, five labelled tabs, the Modes panel, browser back handling and the viewport policy, features unlocked one at a time with a small ceremony.
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
| U2 | **Battle is one tap away.** | Home's Play always starts the next War Path level, with 1 tap. Any other mode starts from its card in the Modes panel (2 taps). The VS screen starts by itself after 2 s. From every Result the next battle is at most 1 tap away, and the Result's primary sits in the same spot as Home's Play. After a War Path win the primary is "Continue": it returns to the map, where the advancing road is the reward (MR-41), and Play is then 1 tap; a loss offers "Try again" and the other modes "Next battle" straight into VS. (K5, B-rank 1, 2, 10) |
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

Type: T tab, S sub-screen, P panel, M modal, F flow. "Back" is where Back, Esc and the back gesture go. `data-primary` marks the one emphasised action, gold or green by the grammar (U1, U5); "conditional" means the screen has it only while the action is possible.

| # | Screen | Type | Purpose (one job) | Primary action | Back | Reached from |
|---|---|---|---|---|---|---|
| S1 | Boot | F | Load in ≤ 3 s | none (progress bar) | none | launch |
| S2 | **Home: War Path** | T (centre) | Show where you are on the path and start the next level | Play level N (gold) | none (root; back sentinel, 2.2) | launch, every flow end |
| S2a | Level preview | P | Everything about one level before you play it | Play level N / Replay level N (gold); a locked node shows the reason instead ("Beat level 4 first") and no primary | Home | tap any node or the level plate |
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
Launch ─> Boot ─> Home (War Path; first launch shows only the map, L1 and Play)
Home ─Play─> VS (2 s, tap skips) ─> Battle ─> Result
Result, War Path win, no capsule:  ─Continue─> Home (MR-41 ceremony) ─Play─> VS            2 taps
Result, War Path win, capsule:     ─Open capsule─> Capsule show ─> Summary ─Continue─> Home (MR-41) ─Play─> VS
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

Tabs and Home elements appear one per return to Home, each with the unlock ceremony (MR-40). Locked tabs are visible from the first return with a padlock and "Lv 3" under the label; tapping one shows a pointer "Unlocks at War Path level 3" above it (U8). This replaces the built rule "War Plan, Customize, Quick Battle and Skirmish open after match 1" (A3, A8), so the lead updates those lines.

| Returning to Home after | Appears | Why now |
|---|---|---|
| First launch | Map, L1, Play, gear. No tabs, no chips, no Modes tile. | Nothing else is usable yet (P2) |
| L1 (training match) and capsule 1 | Bottom nav (all 5, four locked), **Army** unlocked, Amber chip (with its caption) | The new Spear Hunter is in the army |
| L2 and capsule 2 with the forced upgrade | **Capsules** unlocked (the Supply Capsule flies in, badge 1) | There is something to open |
| L3 | **Modes** tile (Quick Battle, Skirmish) | Replay and practice |
| L4 | **Customize** unlocked (the welcome Wardrobe Crate waits in Capsules) | First cosmetic owned |
| L5 (the Lieutenant) | **Progress** tab with Goals (quests, War Chest) | Longer-term goals once the basics are known |
| L6 | **Ladder** in Modes, with Trophy Road inside Progress and trophies on the profile chip | Trophies mean something only once Ladder exists |
| L7 | **Daily** in Modes | One more way to play, once the others are known |
| L8 onwards | nothing new on Home; new mechanics are taught on the nodes (A18.7.5) | One new Home thing per level |

Currencies and meters appear when first earned, not by level: the Dust chip on the first Dust, and on the Capsules tab the charges, Supply and Clay meters each on their first progress. Each arrives with its first-seen caption (MR-28).

**Inside screens** the same rule holds (P1, P2):

| Screen | Hidden at first | Appears |
|---|---|---|
| Army | ages not yet reached (one padlock tab "More ages" stands for all of them); presets A/B/C; the average level; the advisor chip | each age when it is reached (its loadout auto-filled, with the banner "Auto-filled · tweak it?"); the average level and the advisor at L3; presets after the first boss (L10) |
| Level preview | the difficulty control, the ★★ and ★★★ goals | after the level is first beaten, or from L5; a loss offers "Try Easy" on the Result regardless |
| Capsules | charges, Supply, Clay, "Open all" | on first progress or when 2 capsules can be opened at once |
| Battle HUD | stance, War Council, Last Stand, the Fort card, the army counter | each from the match whose tutorial beat first uses it (A8, A18.7.5): for example stance from L2, the Council from L6; a control never shows before it is taught |
| Top bar | trophies on the profile chip | with Ladder (L6) |

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
| Start the next War Path level | 3 + VS (via Mode select) | **1** (Play) |
| Next level after a War Path win | 3 + VS | 2 (Continue, Play), with the map ceremony between |
| Start a ladder battle | 3 + VS | 2 (Modes, Play on the Ladder card); 1 from its Result (Next battle) |
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

### 4.1 Home and the War Path map (S2, S2a, S2b, S2d)

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
| Lieutenant (L5), Spike (L9) | shield-shaped node with a "Hard" tag |
| Boss (L10) | a larger (72 / 96) banner node with the General's portrait and AI badge |
| Side node | small flag on a branch, "Optional" tag |

**Interactions.** Drag to pan (1:1, inertia, rubber band at the ends; no pan starts within 20 px of the screen edges, 2.2). Tap any node: the Level preview panel grows out of it (MR-12). What the preview offers depends on the node:

| Node tapped | Preview shows | Action bar |
|---|---|---|
| Current, or beaten (replay) | everything below | "Play level N" / "Replay level N" (gold) |
| Side node (unlocked) | everything, with "Optional" | "Play" (gold) |
| Locked (normal or Lieutenant) | the General, the level name, the first-clear reward, the reason | no primary; a padlock line "Beat level 4 first" and "Go to my level" (secondary), which closes the panel and pans to the current node |
| Far boss | the General's portrait, the boss disclosures (A18.7.6), the reward, the reason | as locked; the boss's idle taunt plays once as the panel opens |

A "Back to my level" chip (44 tall, arrow toward the current node, the node's number on it) slides in at the screen edge nearer the current node when it leaves the view (MR-18). On return from a win the level-complete ceremony plays (MR-41); after a boss, the region ceremony (MR-42). The player's **banner-bearer** (a small figure with the player's base flag, WP4 art through `ui.warpath.marker`) stands on the current node; after a win it marches along the road to the next node (MR-48), and on Play it steps into the node (part of MR-15). **Pokeable map:** the ≤ 8 ambient props (birds, smoke, grass, water) react to a tap on empty map (birds scatter, grass sways; MR-49), as a small delight that never takes the pulse.

**Level preview panel (S2a).** Top: the General portrait (72) with the AI badge, name, tier and personality line ("Plays by the same rules as you"), level name and role ("Level 5 · Lieutenant · Hard"). Then one row each: objective ("Destroy the base" or "Hold out until 4:00"), window ("Stone and Bronze"), modifiers with icons. Then one **goals and reward strip**: the three star sockets with their goals as short captions (★ win, ★★ the disclosed goal, ★★★ the goal on Hard or harder; the ★★ and ★★★ captions only after the level is first beaten or from L5) and the first-clear reward at its right end. Then the difficulty segmented control (5 options, each with its AI tier; shown after the first clear or from L5, 2.6) and "Edit army" (secondary; a cross-tab jump that returns here). Action bar: "Play level 5" (gold). Boss disclosures (+50% base HP, extra turret) sit in a highlighted row (A18.7.6). Phone budget at 390: header 44, content about 230 (portrait block 72, three rows of 32, the strip 40, difficulty 44 would be 252, so the content scrolls by about 20 px; the action bar never scrolls).

**Modes panel (S2b).** One card per row (fixes UA-01), 72 px tall, each with icon, name, one plain line, its reward line and its own "Play" (gold on the selected card, slate on the others; tapping any card selects it). Pickers stay small and inline: Quick Battle (difficulty chip; "5 Amber per win"), Ladder (format chip with each format's reward; arena and trophies), Daily Challenge (tier chip Recruit / Veteran / Warlord, today's modifier, "Copy result" after playing), Conquest until A18.7.10 ("0/27 stars", Open board). **Skirmish** has no inline picker: its card's button reads "Set up" (slate) and opens the Skirmish setup sub-screen (S2d) with its own action bar, closing the panel. Mode cards use neutral surfaces, not coloured headers (U5).

**Skirmish setup (S2d).** A sub-screen: General or Echo grid on the left, then difficulty, format, start era, speed and Standard levels as segmented rows on the right; action bar "Play" (gold). Its last settings are remembered inside Skirmish only.

**States of Home.** First launch (2.6). A beaten region (the next region's gate open). All levels beaten (Play shows the recommended replay or the Ladder, and "Veteran Path" when A18.7.8 ships). A stopping card after 22:00 (A15.6): Play stays but loses the pulse, and a calm "Good night" line replaces the pointer.

### 4.1b Progress (S13)

The Progress tab gathers every long-term goal (one home, 2.2). Top tabs: **Goals** (default), **Trophy Road** (from L6), **Feats**, **Record** (the Profile's numbers; the Profile sub-screen keeps name and banner).

- **Goals:** the three active quests (progress bars, reward icons, one gold Claim on the first claimable), the War Chest bar ("War Chest 13/20") with its first-seen caption, and the quest swap as a secondary button with a confirm that names the cost ("Swap this quest? 1 swap per day.") and an Undo toast for 5 s (fixes UA-16). The honesty line "New quests arrive each day. Up to 21 can wait for you." sits as a caption under the list (A15.3).
- **Trophy Road:** 4.11. **Feats:** 12 tiles, "???" and the riddle until found, "Show hint" (S button).
- Phone budget at 340: header with tabs 40, content 227 (three quest rows of 56 + War Chest 44 + gaps = 228, so it fits without scrolling), tab bar 52, safe area 21.

### 4.2 Army: loadouts and the troop collection (S9)

Owner direction: an intuitive deck builder with six troops per age, drag or tap to equip, class filters, counters and the advisor visible (A18.9.3). Review direction: one home for every troop card, like Clash Royale's Cards tab, with Info and Upgrade reachable from the deck. Army replaces both the War Plan and the Collection's Troops tab.

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

### 4.3 Collection (retired)

The Collection tab is gone (2.2): troops, turrets, powers and forts live in Army's "All cards" view (4.2), cosmetics in Customize's album (4.5), Feats in Progress (4.1b). The built `src/ui/screens/collection/**` code is reused for those views (its grid, filters and completion counts), so nothing of value is thrown away.

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
| [◉ 1,240 +6/s ][c1][c2][c3][c4][c5][c6][Fort]  [Stance]  ( POWER )                   |  tray 94
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
| Fort card (A18 phase 6) | 62 × 84, 6 px gap before it | 88 × 116 | a card like the others with the Fort class icon, but dragged onto a pad like the power (the shared drag behaviour, 6.6); tap = tap-to-aim, then tap a pad. Until forts ship the slot is not drawn and the space goes to gaps |
| Stance | one 56 × 56 button showing the current stance icon and its 11 px label | 64 | replaces the three-segment control (DESIGN change, 2.9). **Press-drag-release:** press opens a flyout of the three stances stacked upward (48 tall each, over the lane edge for the moment of the gesture), slide to one and release to choose; or tap to open and tap an option. S and Shift+S unchanged |
| Age Power | 88 round | 112 | drag is primary (built); the READY tag sits inside the ring, not clipped (UA-14) |
| Last Stand | 56 round, floats above the power only while armed | 64 | over the lane edge while armed, which is a rare, short state |
| Opponent power ring, Last Stand horn | 24 each inside the enemy block | 28 | the horn replaces the enemy's age icon while their Last Stand is armed |

**Width check, tray** at 844 (750 usable): left cluster 100 + 8 + six cards 402 + 6 + Fort 62 + 8 + stance 56 + 8 + power 88 = 738 ≤ 750. Below 820 px wide (800 × 360: 768 usable, or 780 with notch insets: about 686) the cards shrink to 56 × 76 (6 × 56 + 5 × 5 = 361, Fort 56) and the left cluster to 92: 92 + 6 + 361 + 5 + 56 + 6 + 56 + 6 + 80 (power) = 668 ≤ 686. Never a second row (B-rank 15).

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
| MR-41 | Level complete on the map (after a win) | medium, ≤ 2 s, tap or Play skips | the camera eases to the beaten node (300, `standard`) | stars stamp in one by one: each drops from 1.8 to 1 (160) with a 60 ms hold, 6 sparks and a small dip of the node, 200 apart, pitch rising (3 stars: 2 × 200 + 220 = 620); a crown pops if it is a new best difficulty (within the last star's hold) | the road dots draw to the next node (450, dots pop in sequence) while the banner-bearer marches along it (MR-48); the next node drops from 40 px above with squash 0.9 / 1.1 → 1 and a dust ring (250); the level plate slides to it (300, overlapping the drop) and Play starts its pulse. Total: 300 + 620 + 450 + 300 = 1,670 ms. Play pressed at any point jumps to the end state and starts MR-15 | `star_stamp` × n, `path_draw`, `node_drop` | stars fade in (150 each), the road appears whole (300 fade), the node fades in; Play gets its static glow |
| MR-42 | Boss beaten, region opens | large, ≤ 6 s first time, 3 s after, tap skips | MR-41 on the boss node; the boss banner burns away (400) | the region gate swings open (600); the camera pans along the road into the new region (800, `standard`) while the art layers slide at their parallax speeds | the region title drops ("Bronze Age: Hellas", display type, 300 with a 120 hold); unlocked cards fly to the Army tab (MR-24); a music sting | `region_open`, music sting | gate and title fade in, the camera jumps with a fade |
| MR-43 | Unearned stars | none | empty sockets are always shown; no negative animation | | | | |
| MR-44 | Card unlocked by a level (A18.7.8) | small | the card appears over the node (pop 220) | it flies to the Army tab (MR-24) | Army's NEW dot | `reward_fly` | fade |
| MR-45 | Trophy Road or Goals claim | small | as MR-23 | the node stamps "Claimed" | the reward flies (MR-21 or MR-24); the next node lifts 4 px | `ui_stamp` | per MR-21 R |
| MR-46 | Difficulty change in the Level preview | micro | none | segmented pill slides (MR-04); the AI tier label flips (150) | the ★★★ goal line highlights when Hard or higher is chosen | `ui_toggle` | fade |
| MR-47 | Tutorial hand pointer (A8, A18.7.5; fixes UA-14's hand covering the text) | life | none | the hand sits beside the target, never over its label or the pointer text (the text sits on the side away from the hand); it taps the target every 1.6 s (press 0.92 over 120, release 140 `back`) | while the hand shows, it is the one pulse: the target's own pulse pauses (U11); the hand leaves (160) the moment the target is used | none | a static hand and a glow ring on the target |
| MR-48 | Banner-bearer marches to the next node (after MR-41) | small | the figure lifts its banner (120) | it walks along the road to the next node (450, `standard`, a 4-frame walk from the art service or a bob of 2 px per step) | it plants the banner with a small settle and a dust puff (150); on Play it steps into the node (MR-15) | `node_drop` (quiet, on the plant) | it fades from node to node |
| MR-49 | Poke the map (tap on empty map) and the boss taunt | micro | none | birds within 160 px scatter and fly off (600), grass or water near the tap ripples (400); a boss node taunts once when it first scrolls into view or its preview opens (a 600 ms idle gesture, never looped) | none | a quiet ambient sound per prop (reuse the backdrop ambience) | birds fade, no ripple |

**F. Capsules** (A10 as built and polished by WP10; these rows add the entry, the exit and the rewards)

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-50 | Open from the Capsules tab | small, then A10 | the tile presses | container transform into the capsule stage (400); A10 step 1 arrival lands on the pedestal | A10 steps 2-7 | A10 set | cross-fade into the stage |
| MR-51 | A capsule is earned (Result, claim, War Chest) | small | the capsule pops over its source | flies to the Capsules tab (MR-24) | the tab count flips | `reward_fly`, `cap_thud` (quiet) | fade |
| MR-52 | Summary | small | none | cards drop into the summary in reveal order (40 stagger); Amber pours into the Amber chip (MR-21); copies fly into bars (A10 step 7) | the summary's primary (2.5, 4.6) arrives last with the pulse | A10 set | all fade in, counters update |
| MR-53 | Leaving the summary (to the map, VS, Home or the Capsules tab) | small | none | new cards fly to the Army tab, cosmetics to Customize (MR-24), then a fade-through to the next screen (300) | Home plays any pending MR-41, then MR-40 (queued, U13; Play interrupts both) | `reward_fly` | fade |
| MR-54 | Odds chip and honesty panel | micro | none | the odds panel slides in (MR-14) | none | `ui_sheet` | fade |
| MR-55 | Result → capsule show (Open capsule) | small, then A10 | Open capsule presses; the capsule on the reward panel lifts 1.1 (120) | the capsule flies from the panel to the stage centre while the Result fades out behind it (400, `standard`); A10 step 1 lands it on the pedestal | A10 steps 2-7 | `reward_fly`, then the A10 set | cross-fade into the stage |
| MR-56 | Age Capsule picker (S20) | small | scrim fades in (150) | the age tiles deal in from the bottom (220, 40 stagger, `back`); the chosen tile lifts 1.08 and its capsule drum turns to that age's look (220) | Choose presses; the tile flies into the capsule (300), then the show begins (MR-55 or MR-50) | `card_lift`, `ui_confirm` | fades, the tile highlights |

**G. Customize and the albums** (owner WP9; preview views WP4)

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-60 | Customize: try on an item (WP9 with WP4 views) | small | the item tile presses | base skin: the base cross-dissolves to the new skin (300) with a squash 0.97 → 1; flag: the new flag unfurls from the pole top (400); decoration: drops into its anchor (250) with squash and dust; troop skin: the unit poofs out and in (200); emote plays; quote shows in a bubble (fade 150) | the tile gets a "Previewing" outline | `ui_pop` | cross-fades only |
| MR-61 | Customize: Equip | small | Equip presses | an "Equipped" stamp drops on the tile (160) | a small glint runs over the preview; the check appears on the tile | `ui_stamp` | stamp fades in |
| MR-62 | Customize: a locked item | micro | none | the padlock shakes (MR-03 style) | the source line highlights ("Wardrobe Crate") | `ui_deny` (soft) | the source line highlights |
| MR-63 | Completion change (Army "All cards", Customize tabs) | small | none | the completion count rolls (MR-20) and the bar fills (MR-22) | none | `counter_tick` | fade |

**H. Battle UI** (owner WP5 unless noted)

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-64 | Tray card becomes affordable / unaffordable | micro | none | glow ramps in (150) and rests; saturation and the cost colour change | none, no loop | none | the same, it is a state change |
| MR-65 | Train a unit (tray tap, trains on release) | micro | MR-01 on `pointerdown`; the long-press ring (MR-07) starts after 150 ms, so a hold visibly turns into "info" instead of a train | on release: the card pops 1.06 (120) and the queue badge flips +1 | radial fill runs; on spawn a small pop on the card | `ui_click`, then `spawn_pop` from the world | no pop, badge updates |
| MR-66 | Training complete | micro | none | the radial fill closes | tick and a 1.05 pop (120) | `meter_pip` (quiet) | ring closes |
| MR-67 | Denied train or build | micro | none | MR-03 on the card | the reason label above the card ("Need 40 gold", "Army full", "Legendary in field", "Queue full") | `ui_deny` | outline and label |
| MR-68 | Evolve becomes ready | small | the XP ring fills | the Evolve button lights (300 fade-up) and starts the pulse (if nothing has priority, 4.7) | none, no flashing ever (feel-ux §5) | `evolve_ready` (one chime) | static glow |
| MR-69 | Age Power becomes ready | small | the charge ring closes with a bright sweep (300) | the button lifts 4 px and breathes (or rests if another pulse has priority) | the READY tag inside the ring pops | `power_ready` | ring closes, glow |
| MR-70 | Age Power drag (built) | small then A12 | press lifts the button (1.08) and the ghost appears under the finger (120) | the ghost follows 1:1 with the valid or invalid tint and rings the units it would hit | release: the ghost contracts to 0.9 (80, `anticipate`), then the A12 "power lands" moment | `ui_click` on pick-up, `ui_confirm` on drop, `ui_toggle` on cancel (built) | no contraction, tint only |
| MR-71 | Stance change | micro | the stance button presses; the flyout fans up from it (3 options, 30 stagger, 150 `back`) | the chosen option snaps into the button (150); the flyout folds back (120) | on Hold, the flag drops onto the lane at the own front (200) with a small settle and a dust puff (the world flag follows 5.8: no squash) | `stance_set` (new, planned in A13) | the flag fades in |
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
| MR-80 | Your own evolve (fixes UA-07) | large (in battle ≤ 3 s of camera focus; the game runs; **any player camera input ends it at once**: a lane drag, a minimap tap, a power or Fort drag, edge scroll) | Evolve dips (`anticipate`, 90); **the camera frames the own base** for the beat (today it pushes only when the base is in view: make the push a pan-and-push from anywhere, 500, `standard`), except when the player moved the camera in the last 2 s or the own front is in a fight within 300 lu of the camera centre: then the camera stays and a picture-in-picture inset of the own base (160 × 90, under the own top-band block, 200 in) shows the morph, or, if WP5 finds the inset too costly, the minimap base flashes gold and the banner still drops; the base build-up (built `baseAscend`: tremble, crack lights, windows burn, motes) | the morph (built: shards burst, bands drop, flags unfurl) with a **soft tinted flash** (warm white at 35% maximum, 120 ms; not near-full white) and the global 100 ms hitstop | the tray cards flip to the new age one by one (180 each, 40 stagger); the banner "Bronze Age reached" drops (300, display type); allied units cheer; the camera returns to where it was (500, `standard`); Evolve stays dark for 2 s | `evolve_riser`, `evolve_fanfare_<age>`, the key change | no pan (the minimap base flashes gold instead), morph cross-fade, flash at 20%, tray cross-fade |
| MR-81 | Enemy evolve | small | none | a banner on their XP bar (built) | none; no camera move | `evolve_enemy` | banner fades |
| MR-82 | Base upgrade by research (Keep Walls, Defences, Economy picks) | medium (visual only) | the base glows at its lights (300) | Keep Walls: bands tighten around the base with a gleam; Economy: the coin burst of the built Treasury moment | the new income pops ("+1.5/s", built) | completion stinger | glow only |
| MR-83 | New mount slot, turret build, Modernise (built) | small | as built | as built | as built | `slot_buy`, `turret_build`, `turret_upgrade` | as built (fades, no squash) |

**J. Match end**

| ID | Interaction | Class | Anticipation | Action | Reaction | Sound | R: |
|---|---|---|---|---|---|---|---|
| MR-90 | Victory → Result | large | the base destroyed moment (A12: 250 ms hitstop, 1.2 s slow motion, camera push) | fade-through (300) to the Result; the "Victory" banner drops from above (300, `enter`) with a 120 ms hold and a small squash; a slow sunburst turns behind it (life, 20 s period, low contrast) | War Path: stars stamp on the level badge (as MR-41); step 2: the capsule drops onto the panel (a mini A10 arrival, 400); step 3: one bar fills (MR-22); the summary row fades in; the MVP tile does a one-shot victory pose (the unit's portrait raises its weapon, 400, then settles); the primary rises last (220) and starts the pulse | `victory_jingle`, `star_stamp`, `cap_thud` | banner fades in, steps fade in order |
| MR-91 | Defeat → Result | medium | the defeat moment (A12) | the "Defeat" banner fades down without bounce (300), cooler tint, no shake | earned Amber still counts up; the tip fades in; "Try again" rises last | `defeat_jingle` (gentle) | fades |
| MR-92 | Draw | medium | as MR-91, neutral tint | | | `defeat_jingle` softened | fades |
| MR-93 | Result → Try again or Next battle (straight to VS) | small | the button dips (MR-15) | fade-through to VS (300) | as MR-15 | `ui_whoosh` | fade |
| MR-94 | Result → Home after a War Path win (Continue) | small | Continue presses | fade-through into the map at the beaten node (300) | MR-41, then any MR-40 (queued; Play interrupts) | `ui_whoosh` | fade |
| MR-95 | Boot → first map reveal (the 0:03 first impression) | medium | the logo holds while the Stone assets load; the progress bar fills with a bright leading edge | the logo lifts and fades (300, `exit`) as the map fades up from black (400) and the camera drifts 40 px along the road toward L1 (1,200, `out`); the ambient props start | L1 rises onto its plinth (220, `back`), Play rises from below (300, `enter`) and starts its pulse; the line "Your War Path starts here." fades in (220) | `path_draw` (soft), then ambience | fades, no drift |
| MR-96 | Rotate overlay (portrait) | small | none | the overlay fades in (220) over a dimmed frozen frame; a phone icon rotates 90° every 1.6 s (500, `standard`, then a 1,100 hold) | turning the phone fades it out (160); a battle stays paused until then | none | a static icon with an arrow |

**K. The battle world** (owners WP4 `src/visuals/**` and WP5 `src/render/**`; values in `feel.config.json` per A12; all view-only, the sim owns all timing, B5). These are the moments a player sees hundreds of times per match, so they get the same care as the UI, with the realistic rules of 5.8. The A12 table stays the source for hitstop, trauma, flashes and particles; these rows add the motion of the bodies.

| ID | Moment | Anticipation | Action | Reaction (impact, follow-through, residue) | Sound | R: |
|---|---|---|---|---|---|---|
| MR-100 | Unit spawn arrival | the base gate or spawn point glows and a dust puff starts (100) | the unit steps out of the gate or drops the last 20 px from its ramp, settling into its stance over 3 frames (weight: heavier units settle lower and slower) | dust ring at the feet, a small shake of banners at the gate; the tray card's pop (MR-65) matches the same frame | `spawn_pop` | fade in at the gate |
| MR-101 | Walk and march | none | walk cycles matched to speed (no foot sliding > 3 px, A12); a 2-3 px body bob and a weapon sway that lags the body by 2 frames (follow-through); heavy units lean forward | idle variations every 4-8 s (shift weight, check weapon), never in sync across units (seeded per unit) | footsteps only for heavies, quiet | same (walk is information) |
| MR-102 | Attack | a wind-up pose held 80-200 ms by mass class (light 80, medium 120, heavy 200), readable at 32 px | the strike or shot on the sim impact tick (±1 frame, A12) with a smear frame or motion trail on melee | recovery pose, weapon follow-through; muzzle flash and smoke for guns | per unit | no smear |
| MR-103 | Hit reaction | none | by mass: light units flinch back 4-6 px and turn the head; medium 2-3 px and a shoulder dip; heavy and mechanical only jolt 1 px with sparks or dust; the 60-80 ms victim flash of A12 | the body returns over 120-200 ms with a small overshoot of the pose (not a scale squash); a heavy hit adds A12's local hitstop | `hit_*` by type | flash only, no offset |
| MR-104 | Knockback (only where the sim moves the unit; the view never displaces a unit beyond the 1-6 px flinch of MR-103) | none | the body slides back along the ground with dust at the feet, the upper body lagging (tilt 4-8°) | recovers its stance with a stagger step | `hit_heavy` | a short slide, no tilt |
| MR-105 | Death | the killing hit's flash | a fall by mass: light units crumple or fall back in 300-400 ms, heavies drop to a knee first (200) then fall; mechs stall and burst (A12: 1 in 3 explodes) | the body lies 600 ms, then sinks and fades with dust (300); weapon or helmet may bounce once; kill coins fly to the gold counter (MR-79). KO stars are replaced by a dust puff when they read as cartoon over realistic art (UI-5b decides and proposes the A12 change) | `die_bio` / `die_mech` | fade out, no fall |
| MR-106 | Projectile flight and impact | a launch puff | arcs follow the sim path; trails with a bright core and team-tinted tail (A12) | impact: sparks by damage type, a small crater or scorch decal that fades over 3 s, splash rings for area damage | per type | trails shortened |
| MR-107 | Turret fire | a short aim turn (the barrel tracks its target continuously) | recoil: the barrel kicks back 3-6 px and returns over 150 ms (follow-through), muzzle flash one frame, smoke | shell casings or sparks by age | per turret (A14.2) | no recoil offset |
| MR-108 | Base damage stages | none | each hit: A12 base flash and chunks; at 75%, 50% and 25% HP the base visibly changes stage (cracks, fires, a fallen flag or banner) with a 200 ms chunk burst and a shake of its flags | fires and smoke persist as residue, so the base's state reads at a glance without the HP bar | `base_hit`; a heavier stage sound | stage change as a cross-fade |
| MR-109 | Age Power impact | the telegraph (A12) and the MR-70 release contraction | the power's arrival (per power preset) with A12's global 120 ms hitstop, trauma +0.5, a 30% flash | units in the area react by mass (MR-103, stronger), dust and debris settle over 800 ms; decals stay 3 s | power sound, music duck | flash ≤ 20%, no shake |
| MR-110 | Last Stand | armed: the horn icon on the enemy block (A9.2); fires: the base glows and pulls in dust (300) | the shockwave ring (A12: global 150 ms, red 100 ms flash tinted and soft, U14) | units in the ring are thrown back by mass (MR-104), dust fills the lane briefly | `last_stand_charge`, `last_stand_fire` | ring as a fade, flash ≤ 20% |
| MR-111 | Enemy age up | none | their smaller pillar (A12) | their units' look changes as they spawn; the banner on their XP bar | `evolve_enemy` | fade |


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

Haptics are not motion: they follow the Vibration setting, not reduce motion. In the battle world, reduce motion applies A12's preset (shake ×0, hitstop ×0.5, softer flashes, no slow motion) plus the R: column of group K.

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

### 5.8 Realistic motion in the battle world

The owner chose ultra-realistic art; CLAUDE.md asks for squash and stretch and lively motion. Both hold, on different layers:

| Layer | Squash and stretch | How weight and life are shown |
|---|---|---|
| UI (buttons, cards, chips, badges, numbers, stamps, capsules) | yes, full (5.1, 3.7) | overshoot, squash, pops |
| World effects (dust, debris, sparks, smoke, flags and cloth, water) | yes: FX may stretch along their motion | trails, stretch on fast particles, cloth follow-through |
| World props and buildings (bases, turrets, decorations landing) | at most 3% on a landing or a hit, never on idle | a settle, dust, a shudder of attached parts (flags, banners, chains) |
| Characters and vehicles | none: bodies are rigid | the rules below |

**Rules for characters** (WP4 animation, WP5 feel; reviewed in UI-5b):

1. **Weight through timing, not scale.** Heavier bodies start slower, stop later and settle lower. Anticipation poses are held 80-200 ms by mass class (MR-102); recovery is longer than the strike.
2. **Anticipation through poses.** A wind-up, a lean, a crouch before a jump; each readable at 32 px height (A12 checklist 7).
3. **Follow-through and overlap.** Weapons, cloth, hair, straps, antennas and cables lag the body by 2-4 frames and settle with one small overshoot.
4. **Hit reactions by mass** (MR-103): light units flinch and turn, medium dip, heavy and mechanical jolt with sparks. The reaction is a pose and a few px of offset, never a scale change.
5. **Never in sync.** Idle variations, walk phases and breathing are offset per unit from a view-only seed, so a crowd looks alive.
6. **Impact frames are sacred.** The strike, the hit flash, the sound and the hitstop land on the sim's impact tick (±1 frame). The view never delays or advances a sim event.
7. **Readable first.** Motion never hides team colour, class or the silhouette (A12 checklist 8-9); effects never last longer than their gameplay meaning (checklist 10).

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
- The budget spec runs on Home, Army, Collection (until UI-4 retires it), Card detail, Customize, Result, Settings and the HUD at all four viewports, on settled states. It may report existing violations in this phase (they are the backlog for UI-1 to UI-4) but must pass for the components it tests in isolation (Button, CardTile, tabs, chips) on the dev component page.

**Screenshot review:** before and after contact sheets of every screen at 844 × 340 and 1280 × 720; the squint and colour-vision captures of Home and the HUD; a 50 ms burst of a button press (MR-01) and a denied press (MR-03).

**Estimate:** 3 agents (WP9 tokens and components, WP11 app screens, WP12 tests; WP0 by request) in one run, one review round.

### 6.3 UI-1 Blockers (size S-M)

Limited to screens that survive the later phases, so nothing is built twice.

**Fixes:** UA-03 (Card detail), UA-10, UA-18 (the primary), UA-21 (Resume size), UA-01 (hit fix only).

| Work | Owner and paths |
|---|---|
| Card detail: the fixed action bar and the two-tap upgrade (confirm state, MR-38b) on the current screen; the layout of 4.4 follows in UI-4 | WP9: `src/ui/screens/cardDetail/**` |
| One Result design with the primary table of 4.9 (Continue, Try again, Next battle, Open capsule); the onboarding variant replaces the app's own Result | WP9: `src/ui/screens/result/**`; WP11: `src/app/ui/ResultScreen.tsx` removal and wiring |
| Capsule summary: one primary by 2.5 and 4.6, "Equipped" as a state pill, copies capped | WP10: `src/capsule/summary.tsx`, `summaryModel.ts` |
| Pause: Resume 48 tall, Retreat moved away | WP9: `src/ui/screens/pause/**` |
| VS starts by itself after 2 s | WP9: VS screen; WP11 if the countdown lives in the app |
| Mode select: a CSS-only fix so its 11 picker buttons are hittable (no redesign; the Modes panel replaces the screen in UI-2) | WP9: `src/ui/screens/modeSelect/**` |

**Acceptance:** all 11 picker buttons of the audit pass the `elementFromPoint` hit test; the Card detail Upgrade button is visible at 844 × 340 without scrolling and needs two taps; the Result's primary follows 4.9 in the bottom-right on every mode; the summary never returns to the Result; the budget spec passes for Result and Card detail.

**Screenshot review:** Card detail, Result (win, loss, capsule, Daily, onboarding) at 844 × 340 and 1280 × 720; frame bursts of MR-38b, MR-39 and MR-90 as far as built.

**Estimate:** 2 agents (WP9, WP10) in one orchestrated run, one review round.

### 6.4 UI-2 Home as the War Path hub (size L)

**Fixes:** UA-02, UA-13, UA-17 (Home terms), UA-25 (title to battle), UA-29; owner: the War Path as Home's centrepiece from the first minute.

| Work | Owner and paths |
|---|---|
| War Path screen: map, nodes, road, banner-bearer, level plate, Play, "Back to my level", Level preview panel with node-state rules, pokeable props | WP9: new `src/ui/screens/warPath/**` |
| New Home frame: top bar, Modes tile, bottom nav with the 5 tabs of 2.2, per-tab back stacks, cross-tab jumps with an origin, the ready-badge priority; Capsules becomes a tab screen (4.6) with the bank captions; the Progress tab (4.1b) with Goals, Trophy Road, Feats and Record (reusing the built quest, road and feat views). **Interim until UI-4 and UI-6:** the Army tab hosts the current War Plan with an "All cards" header link to the current Collection screen, and Customize links to the current cosmetic views, so nothing becomes unreachable | WP9: `src/ui/screens/home/**`, `src/ui/router.ts`, new `src/ui/screens/capsules/**`, new `src/ui/screens/progress/**` |
| Modes panel (4.1) and Skirmish setup sub-screen, replacing Mode select | WP9: `src/ui/screens/modeSelect/**` (becomes the panel), new `src/ui/screens/skirmishSetup/**` |
| Side panels (2.2, 3.6) as the one `Panel` component | WP9: `src/ui/components/Layout.tsx` |
| Progressive unlocks (2.6, Home part) and the unlock ceremony; first-seen captions (MR-28) | WP9; state in `SaveDoc.flags['ui-unlock.<id>']` and `['ui-seen.<term>']` through a new `setFlag(id)` service: WP7 adds the meta function (it already owns `flags` for feats), WP11 wires it into `MetaServices` (requests) |
| Browser history and back (2.2): `pushState` per panel, sub-screen, jump, VS and battle; the Home sentinel; `overscroll-behavior`; `touch-action` on pan surfaces | WP11: `src/app/**` (history bridge), WP9: `src/ui/router.ts` |
| Viewport policy (3.1): fullscreen on the first Play (Android), the orientation lock, the manifest's `display: fullscreen`, `dvh`/`svh` units, the Settings "Full screen" toggle, a dev page that shows the real viewport | WP11: `index.html`, `public/manifest.webmanifest`, `src/app/boot.ts` (the manifest via request if WP0 owns it); WP9: CSS and Settings |
| Outcome logging (6.10 step 10): `ui.homeToPlay`, `ui.back`, `ui.disabledTap`, `ui.tabFirstOpen`, `ui.ceremonySkip` into the existing event log | WP11: `src/app/eventLog.ts` callers; WP9 emits through a `logUi(kind, id, data)` service |
| **War Path v0 data:** the Stone region's 10 nodes plus 2 side nodes, using only match types that exist today (L1 and L2 are the onboarding matches; L3-L10 are Skirmish-style configs against the ladder Generals at rising tiers, with the A18.7.2 role offsets; the boss is the next General up at +2). Stars in v0: ★ for a win; ★★ and ★★★ arrive with A18 phase 5 without changing the screen | WP1: `src/content/raw/warPath.ts` (the A18.7.10 shape, fields not yet used left out); WP7: `src/meta` progress and next-level rules; WP8: the `warPath` progress field. **Schema coordination:** `src/save/migrations/v3.ts` (cosmetics) is being written now and is not yet on `main`. The request to WP8 asks to add `warPath` (and the A18.9 `difficulty` field) to v3 if v3 has not shipped when UI-2 starts; otherwise a v4 step. Either way it is one migration with a fixture and the store tests, never an edit of a shipped step |
| First launch goes to the map (not the title); the title's Play becomes the map's Play; boot route and onboarding hooks follow the nodes | WP11: `src/app/flow.ts`, `onboarding.ts`, `boot.ts`, `src/app/ui/TitleScreen.tsx` |
| Region art layers (interim: crops of the existing backdrops) and the manifest ids `ui.warpath.region.<ageId>.*` | WP4: `src/visuals/**` (request) |
| Sounds `star_stamp`, `path_draw`, `node_drop`, `region_open`, `ui_unlock`, `ui_sheet`, `ui_whoosh`, `reward_fly` | WP6 (request) |
| Motion rows | MR-10, MR-12, MR-14, MR-15, MR-18, MR-24, MR-25, MR-27, MR-28, MR-40 to MR-42, MR-46 to MR-49, MR-94 to MR-96 |

**Acceptance:**

- First launch shows only the map, L1, Play and the gear; the first battle starts 1 tap after the map appears.
- A returning player starts the next level with 1 tap; Home shows ≤ 12 controls plus nodes, exactly 1 `[data-primary]`, ≤ 1 `[data-pulse]`, ≤ 2 ready badges; Play works during every ceremony.
- Nothing clipped at 844 × 390; the squint test shows Play first.
- A15.13 holds: no timers, no backlog counts on Home.
- A scripted new-player run (Playwright, bot input) reaches each row of 2.7 within ±30 s of its target time up to L2, and every unlock of 2.6 plays its ceremony once.
- Esc, the browser back button and the Android back gesture close panels, go back from sub-screens and jumps to their origin, and on every tab go to Home; back on Home does not leave the site on the first press; tab state is kept on return (e2e with `page.goBack()`).
- Home, the Modes panel, the Level preview and Progress fit 844 × 340 and 800 × 360 (budget spec).
- On an Android phone (owner test), Play enters fullscreen.

**Screenshot review:** first launch, first return (Army unlock), a mid-game Home, a finished region, the Modes panel, a locked node's preview, Progress, at 844 × 340 and 1280 × 720 (the full sweep, 6.10); 50 ms bursts of MR-15, MR-18, MR-40, MR-41, MR-42, MR-48 and MR-95; reduce-motion captures of the same; deuteranopia and achromatopsia of Home (node states must read without colour).

**Estimate:** the largest phase: 4-5 agents (WP9 twice, split map and frame; WP11; WP1 with WP7 and WP8 by request) in one orchestrated run, two review rounds, one owner test.

### 6.5 UI-3 Battle HUD: readable, reachable, six cards (size M)

**Fixes:** UA-04, UA-05, UA-06, UA-07 (HUD side), UA-14, UA-24 (tray names), UA-26; owner: six troops, power drag kept.

| Work | Owner and paths |
|---|---|
| Type scale and hit areas in the HUD; drop the lowest-value labels ("+Income · 200", "YOU") | WP5: `src/ui/hud/hud.css`, `TopBar.tsx`, `Minimap.tsx` |
| Tray layout of 4.7 for 6 cards (62 × 84 on 844 px phones, 56 × 76 below 820 px), the army counter, Evolve and Council in the left cluster, the stance button with its flyout, the reserved Fort card slot, Last Stand placement; the top band of 4.7 with its width check | WP5: `Tray.tsx`, `PowerButton.tsx`, `TopBar.tsx`, `Hud.tsx` (the sixth slot needs the A18 phase 2 contract bump and the Fort card the phase 6 one; until then the layout reserves the space) |
| Train on release, long-press cancels; the Hold flag handle; progressive HUD elements (4.7) | WP5: `Tray.tsx`, `model.ts` |
| World framing: the HUD reports its insets and the camera keeps the ground line and HP pips inside the lane band (3.1) | WP5: `src/render/camera.ts`, `src/ui/hud/Hud.tsx` |
| One-pulse priority, deny reasons, long-press teaching, the "i" removed, READY tag fix, mount popover sizes | WP5: `Tray.tsx`, `MountPopover.tsx`, `model.ts`; WP11: the tutorial beat for "Hold a card" (`src/tutorial` via request) |
| Evolve staging: frame the own base from anywhere, end at once on player camera input, the picture-in-picture fallback (or the minimap flash), soft tinted flash, tray flip, Evolve re-arm delay (MR-80) | WP5: `src/render/camera.ts`, `feel.config.json`, `src/ui/hud/**` |
| Haptics helper calls for the HUD rows (5.4) | WP5 via the WP9 helper |
| Motion rows | MR-64 to MR-71, MR-75 to MR-80, MR-96 |

**Acceptance:** the budget spec passes for the HUD at 844 × 390, 844 × 340 and 800 × 360 (no text under 11 px, no target under 44 px except the allow-list); in a bot match sampled every 250 ms, `[data-pulse]` never exceeds 1; the tray (738 ≤ 750) and the top band (722 ≤ 750) fit at 844 with safe areas, and the narrow variants at 780; unit feet and HP pips never sit under HUD chrome at 844 × 340 (a render probe); a press held 450 ms on a tray card never trains (e2e); Playwright can click a tray card as "stable" within 1 s; the own evolve keeps the own base on screen ≥ 90% of the beat when the player does not touch the lane, and a lane drag during the beat returns control within one frame (camera e2e); no frame of the evolve is brighter than 35% white over the scene.

**Screenshot review:** HUD at 844 × 340, 932 × 430 and 1280 × 720 in the states start, busy, evolve ready, power ready, denied, paused, stance flyout open (the full sweep, 6.10); 50 ms bursts of MR-65, MR-67, MR-69, MR-70, MR-71 and MR-80; reduce-motion bursts; squint test (the tray and power must read first, the top band second).

**Estimate:** 1-2 agents (WP5; WP11 for the tutorial beat by request) in one run, one review round, one owner test.

### 6.6 UI-4 Army and Card detail (size L)

**Fixes:** UA-11, UA-12, UA-03 (Card detail), UA-08, UA-24; owner: an intuitive deck builder with six troops, class filters, counters and the advisor visible.

| Work | Owner and paths |
|---|---|
| Army (4.2): the 4 × 2 slot grid with the power and Fort column, the gesture matrix (tap for Use / Info / Upgrade, horizontal drag, tap-tap, swap, remove), the header Undo, the advisor row, the legend popover, only reached ages, presets after L10, auto-fill on a new age, and the "This age / All cards" grid with completion (reusing the Collection grid and filters) | WP9: `src/ui/screens/warplan/**` (renamed in the UI "Army"; route id kept), `src/ui/screens/collection/**` code moved into it |
| Shared drag behaviour (lift, ghost, valid targets, snap, return) used by Army now and forts and the power later | WP9: `src/ui/components/drag.ts` |
| Retire the interim Collection link that UI-2 put in Army's header; the cosmetic views stay linked from Customize until UI-6 moves them in | WP9 |
| Card detail (4.4): the stage as the one hero with the lg card over it, counter rows first, fixed action bar, Use, the two-tap upgrade and the ceremony with the double-spend guard | WP9: `src/ui/screens/cardDetail/**`; the unit loop needs a portrait-in-motion from the art service (request to WP4 if the idle loop is not enough) |
| First forced upgrade uses the same ceremony | WP11: `src/app/ui/FirstUpgrade.tsx` (uses the WP9 component) |
| Undo and "Equip now" placement rules if meta must change | WP7 (request) |
| Motion rows | MR-11, MR-17, MR-30 to MR-39, MR-38b, MR-63, and the NEW wobble and Legendary sheen of 4.2 |

**Acceptance:** equip a new card with card + Use (2 taps) or 1 drag inside Army; a vertical swipe on the grid scrolls and never starts a drag (e2e); the header Undo reverses every change of the visit; all three input paths covered by e2e (drag, tap-tap, Use); Info and Upgrade open Card detail from the grid; the layout fits 844 × 340 with the px budget of 4.2; no truncated names (the clip check passes); filters stay visible while the grid scrolls; the class filter shows the 7 player classes plus Turret and Power; the Upgrade button is visible without scrolling, needs a confirm tap and cannot spend twice within 600 ms.

**Screenshot review:** Army in every state of 4.2 at 844 × 340 and 1280 × 720 (the full sweep, 6.10); 50 ms bursts of MR-30, MR-32, MR-33, MR-35, MR-36, MR-38b and MR-39; reduce-motion bursts of MR-32 and MR-39; "All cards" with filters; colour-vision captures of the grid (rarity must read by gem shape).

**Estimate:** 2 agents (WP9 Army, WP9 or WP11 Card detail and the first upgrade) in one run, two review rounds, one owner test.

### 6.7 UI-5 Satisfaction pass (size M-L)

**Fixes:** section 4 of the audit, UA-18 (flights), UA-19, UA-25; owner: satisfying animations across the whole game.

| Work | Owner and paths |
|---|---|
| Rewards fly and count everywhere: Result, quests, Trophy Road, War Chest, capsule summary (MR-20 to MR-26, MR-45, MR-51 to MR-53) | WP9 (meta screens), WP10 (summary, Amber pour), WP11 (app-owned transitions) |
| Screen transitions with direction: tabs, sub-screens, sheets, modals, VS, Result, capsule to Home (MR-10 to MR-16, MR-90 to MR-94) | WP9, WP11 (`src/app/ui/MetaHost.tsx`, `BattleScreen.tsx`) |
| Capsule show: compact honesty panels after the first capsule, "Tap!" off the pip row, summary staging (UA-19) | WP10 |
| Sound ids of 5.4 wired to the rows | WP6 (ids), each owner (calls) |
| Toast and feedback placement near the source everywhere (UA-22) | WP9, WP5 |
| Haptics helper (5.4) and its calls in the meta rows; the capsule stage moves to the same helper | WP9: `src/ui/components/haptics.ts`; WP10 (request) |
| Result → capsule show entry, Age Capsule picker (MR-55, MR-56) | WP9, WP10, WP11 |

**Acceptance:** every catalogue row in UI-0 to UI-5 has a capture set (a 50 ms burst from input to settle plus 200 ms) that shows anticipation, impact and settle; no row uses a value outside the tokens; every sequence over 1 s skips on tap (e2e taps during each ceremony and checks the end state within 200 ms); reduce-motion captures show fades for every row; no long task over 50 ms during a ceremony in Chromium (performance trace).

**Screenshot review:** a contact sheet per touched row; one full returning-player session (Home → level → Result → capsule → Home) as a 100 ms sequence at 844 × 340; owner test at the end of the phase.

**Estimate:** 3 agents (WP9, WP10, WP11) in one run, one review round.

### 6.7b UI-5b Battle feel pass (size M)

**Why:** the owner asked for satisfying animations for the whole game, and the battle world is what players watch most. A12 exists as tables but was never audited live.

| Work | Owner and paths |
|---|---|
| **Live audit** first: a real bot match at 844 × 340 and 1280 × 720, 50 ms bursts of every group K row (MR-100 to MR-111) plus the A12 events, each graded against its row and 5.8 (weight, anticipation by pose, follow-through, hit reaction by mass, impact frame on the sim tick, readability at 32 px). The audit lists the flat, stiff or cartoon-looking moments, most-seen first (spawn, walk, attack, hit, death come before powers and Last Stand) | WP12 scripts, WP5 grades; findings into `docs/research/battle-feel-audit.md` |
| Fixes for the worst findings: poses and timing in the unit animation data, recoil and settle values, base damage stages, death falls, the KO stars decision | WP4: `src/visuals/**`; WP5: `src/render/**`, `feel.config.json` |
| Motion rows | MR-100 to MR-111 |

**Acceptance:** every group K row has a burst that shows anticipation, impact on the sim tick (±1 frame, checked against the sim's event log in the replay) and follow-through; no character uses scale squash; the A12 checklist passes for the six most-played units of Stone and Bronze; no frame drops below 55 fps in a busy lane on the mid-range profile; reduce-motion captures follow A12's preset.

**Screenshot review:** before and after bursts of each row; a 10 s busy-lane sequence at 100 ms; owner test: "Does the battle feel heavy and alive?"

**Estimate:** 2 agents (WP4, WP5) and a WP12 script, one run, one review round. It can run in parallel with UI-6 (different paths).

### 6.8 UI-6 Customize with a live preview (size L)

**Fixes:** UA-15; owner: many cosmetic collections and a Customize screen.

| Work | Owner and paths |
|---|---|
| Customize screen (4.5) with the preview slot, the category tabs with completion counts (the cosmetics album, moved from Collection), try-on, Equip, the header Undo, locked sources, anchor picker | WP9: `src/ui/screens/customize/**` |
| `PreviewStage` slot (Pixi) mounted by the app | WP11: `src/app/ui/**` |
| Base, flag, national flag and decoration views for the preview (and the same in battle and on VS) | WP4: `src/visuals/**` |
| Cosmetic content, drop tables, save fields (A18.9.4) | WP1, WP7, WP8 (A18 work, requested there) |
| Motion rows | MR-60 to MR-63 |

**Acceptance:** tapping an item updates the preview within 100 ms (a placeholder) and with full art within 500 ms; counts agree everywhere (one model); every locked item names its source; nothing can be bought; the budget spec passes.

**Screenshot review:** Customize per tab at 844 × 340 and 1280 × 720; 50 ms bursts of MR-60 (each kind) and MR-61; reduce-motion.

**Estimate:** 3 agents (WP9, WP11, WP4) in one run, one review round.

### 6.9 UI-7 Realistic UI skin and polish (size M)

**Fixes:** UA-16, UA-17, UA-20, UA-21, UA-24, UA-27, UA-28; owner: ultra-realistic look, beauty.

| Work | Owner and paths |
|---|---|
| Materials, lighting and textures of 3.7 with the `ui.*` manifest ids and CSS fallbacks | WP9 (`theme.css`), WP4 (manifest entries and images) |
| Fonts Barlow Condensed and Inter as subset `woff2` files (an era face only if it fits), preloaded; size check stays within the initial budget | WP0 or WP11 for `public/fonts/**` and `index.html` (request), WP9 for the tokens |
| Text size setting (100/115/130%); Danish pseudo-locale run | WP9 (Settings, tokens), WP12 (pseudo-locale test) |
| Info panels for every invented term (UA-17), Profile consistency (UA-20), quest swap confirm and Undo (UA-16), Daily tier wording (UA-28), touch-only settings (UA-27) | WP9 |

**Acceptance:** all screens pass the budget spec at 130% text and with the +30% pseudo-locale under the reflow and cap rules of 3.3; colour-vision captures pass for Home, Army, Customize, HUD, capsule summary; initial download stays within the size gate (fonts ≤ 80 KB added); the owner test says the UI "looks like the same game as the art".

**Screenshot review:** a full contact sheet of every screen at 844 × 340 and 1280 × 720, before and after the skin (the full sweep, 6.10); a side-by-side of the HUD over realistic Stone art.

**Estimate:** 2 agents (WP9, WP4) and a WP12 test, one run, two review rounds, one owner test.

### 6.10 Review protocol (every phase)

The protocol is **tiered** so it fits the credit budget (CLAUDE.md: plan before fanning out, do not rerun expensive steps without a reason).

| Step | Light review (UI-0, UI-1, UI-3, UI-5, UI-5b, UI-6) | Full sweep (UI-2, UI-4, UI-7) |
|---|---|---|
| 1. Build and serve | the production build (`npx vite build`, `vite preview` on a free port); Chromium is preinstalled, never run `playwright install` | same |
| 2. Captures (`UI_REVIEW=1` specs) | the touched screens at 844 × 340 and 1280 × 720, in one save state (the one the change is about) | every screen at 844 × 390, 844 × 340, 800 × 360 and 1280 × 720, in the save states new player, mid-game and maxed |
| 3. Motion bursts | only the catalogue rows the phase touched, input to settle + 200 ms, every 50 ms | same, plus one full returning-player session at 100 ms |
| 4. Reduce motion | the touched rows' bursts with the in-game setting | same, plus `reducedMotion: 'reduce'` |
| 5. Colour vision | deuteranopia and achromatopsia of the touched screens | all four emulations of every screen |
| 6. Squint | the touched screens | every screen |
| 7. Budget spec (1.3) | green for the touched screens (it is cheap and automated, so it always runs at all four viewports) | green for every screen |
| 8. Checklist (1.2) | copied into the PROGRESS entry and ticked; an unticked box is fixed before the phase is reported done | same |
| 9. Owner test | at the end of UI-3 and UI-5 | at the end of UI-2, UI-4 and UI-7 |
| 10. Outcome data | none | the event-log export and the hallway test below |

**Owner test:** the orchestrator gives the owner short Danish steps on a real phone and asks two questions: "What did you expect this to do?" and "What felt good, and what felt flat?"

**Outcome measures of confusion** (targets are not measures). The existing local event log (`src/app/eventLog.ts`, exported from Settings; it never leaves the device) gains five UI kinds, emitted by the screens through a service: `ui.homeToPlay` (ms from Home shown to Play pressed), `ui.back` (back presses, by screen), `ui.disabledTap` (taps on disabled controls, by control id), `ui.tabFirstOpen` (tab and War Path level at first open; "was Army found before L3"), `ui.ceremonySkip` (catalogue row id). At each full sweep the owner exports the log after playing, and the orchestrator reports: median Home-to-Play time for returning visits (target ≤ 3 s), back presses per session, the most-tapped disabled controls (each is a clarity bug), the level at which each tab was first opened, and which ceremonies are skipped most (candidates to shorten).

**Hallway test** (at UI-2, UI-4 and UI-7): the owner asks up to 3 people who have not played Ageborn to try it on the owner's phone, with a printed Danish task list and without help: "Start a battle", "Put the new card in your army", "Make a card stronger", "Change your flag", "Find out what Amber is for", "Find the odds of a capsule". The owner notes for each task whether it was done, and where the person hesitated or tapped the wrong thing. The orchestrator turns every hesitation into a finding.

### 6.11 Requests to file when a phase starts

| Phase | To | Request |
|---|---|---|
| UI-0 | WP0 | `src/core/motion.ts` integer tokens; lint rule for stray `cubic-bezier(` |
| UI-0 | WP10, WP5 | the canvas debug hook (1.3) in the capsule stage and the battle view |
| UI-0 | WP11 | move app screens to the shared Button |
| UI-2 | WP1, WP7, WP8 | War Path v0 data, progress rules, the `warPath` save field (in v3 if v3 has not shipped, else v4; 6.4) |
| UI-2 | WP7, WP11 | the `setFlag(id)` meta function and service for unlock and first-seen flags; the `logUi` service and the five UI event kinds |
| UI-2 | WP11 | the history bridge, the Home back sentinel, fullscreen and orientation lock, the manifest's `display: fullscreen` |
| UI-2 | WP4 | region art layers, the banner-bearer and the tappable props, `ui.warpath.*` ids |
| UI-2, UI-5 | WP6 | the sound ids in 5.4 |
| UI-2 | WP11 | first launch to the map, title retired, onboarding on nodes |
| UI-3 | WP11 / tutorial | "Hold a card" beat; tutorial pointers re-anchored to the new tray; the tutorial beats that reveal the stance, the Council and the Fort card (progressive HUD) |
| UI-4 | WP4 | unit motion loop for the Card detail stage |
| UI-5b | WP4, WP5 | the group K rows, base damage stages, the KO stars proposal to the lead |
| UI-6 | WP11, WP4 | `PreviewStage` slot, cosmetic views |
| UI-7 | WP0 or WP11 | fonts in `public/fonts`, preload in `index.html` |
| all | lead | the DESIGN edits of 2.9, logged in `docs/decisions.md` |

### 6.12 Risks

| Risk | Mitigation |
|---|---|
| The War Path v0 map is built before A18 phase 5 and has to be redone | The screen reads the A18.7.10 `WarPathLevel` shape from the start; v0 only leaves fields out. |
| Parallel agents change the same screens | UI phases start after the in-flight work lands; one owner per path (Part C); restyles go through shared components, not per-screen CSS. |
| Six cards and the Fort do not fit on smaller phones (for example 780 px wide) | The width checks in 4.7 cover 780 (cards 56 × 76, a narrower left cluster, the emote moved into Pause), never a second row (B-rank 15). |
| The real phone viewport is shorter than planned | Every budget is checked at 340; fullscreen on Android and the installed app give back the full height; the owner's phone is measured in UI-2. |
| The save schema is being changed by another agent right now (v3) | One coordinated request to WP8 before UI-2 (6.4); never edit a shipped migration step. |
| The review protocol eats the credit budget | Tiered reviews (6.10); the budget spec, which is cheap, carries most of the checking. |
| The Army rebuild (merging Collection) breaks built work | It reuses the built grid, filters and completion counts; Collection code moves rather than being rewritten. |
| Motion adds jank on low-end phones | The limits in 5.7, the Lite preset, and the performance trace in the UI-5 acceptance. |
| Realistic textures make text harder to read | The 72% scrim rule, contrast checks in the budget spec, the squint test. |
| Too many ceremonies slow down returning players | Event classes, queueing, shorter repeats, quick reveal, tap to skip (5.3). |

---

## Appendix: audit issues to phases

| Issue | Phase | Issue | Phase |
|---|---|---|---|
| UA-01 Mode select hides controls | UI-1 (hit fix), UI-2 (Modes panel) | UA-16 Quest swap without undo | UI-2 (Progress, Goals), UI-7 |
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
| UA-12 Collection filters | UI-4 (in Army) | UA-27 Desktop settings on phones | UI-7 |
| UA-13 3 taps to battle | UI-1, UI-2 | UA-28 Daily tier wording | UI-7 |
| UA-14 Too many pulses | UI-3 | UA-29 Backlog-like badges | UI-2 |
| UA-15 Customize without preview | UI-6 | | |

---

## Review resolution

Two critiques of the first draft (2026-09-28): a senior mobile UX review (**R1-R37**) and a first-time player who loves Clash Royale (**P1-P11**, plus "delights"). Every point is accepted and built into the body above unless it says otherwise.

| Point | Verdict | Where |
|---|---|---|
| R1 Army does not fit | Accepted: sm tiles, a 4 × 2 slot grid, power and Fort in a side column, the advisor and classes in one 28 px row; budget table fits 227 px | 4.2 |
| R2 Card detail does not fit | Accepted: the moving unit is the one hero, a lg card over it | 4.4 |
| R3 Real viewport smaller than 390 | Accepted: viewport policy (fullscreen on Android, PWA fullscreen, `dvh`/`svh`), short viewports 844 × 340 and 800 × 360 in every budget | 3.1, U6, 1.3 |
| R4 HUD width used up | Accepted: stance becomes one button with a flyout, the Fort card sits in the row, the army counter under the gold; tray 738 and top band 722 of 750 | 4.7, 2.9 |
| R5 World vs HUD | Accepted: HUD insets drive the camera; feet and HP pips stay in the lane band | 3.1, 6.5 |
| R6 Tab set against the research | Accepted: Army (with the collection), Capsules, War Path, Progress, Customize. Capsules as a Home tray rejected: Home's one job is the War Path and the capsule systems need room; the badge and the Result keep it findable | 2.2 |
| R7 Remembered mode | Accepted: Play always means the next War Path level | 2.3, U2 |
| R8 Next level skips the map | Accepted: a win continues to the map; loss and ladder go straight to VS | 2.5, 4.9, U2 |
| R9 Result/capsule flow three ways | Accepted: one sequence, the summary continues the Result's path, tap counts stated | 2.5, 4.6 |
| R10 Cross-tab Back | Accepted: jumps return to their origin; only three jumps exist | 2.2 |
| R11 Back gesture and history | Accepted: `pushState` per layer, Home sentinel, `overscroll-behavior`, 20 px edge rule | 2.2, 6.4 |
| R12 Sheets and depth | Accepted: right-side panels on phones, never a panel on a panel, Skirmish setup is a sub-screen | 2.2, 3.6, 4.1 |
| R13 Upgrade confirm contradiction | Accepted: two taps everywhere (confirm in place with a stat preview) | U10, 4.4, MR-38b |
| R14 "Primary" defined twice | Accepted: `data-primary` = the one emphasised action, gold or green | U1, 2.4 |
| R15 Army gestures, no Card detail | Accepted: a gesture matrix; tap shows Use, Info, Upgrade; horizontal-only drag; double-tap dropped | 4.2 |
| R16 Hold flag vs panning | Accepted: 48 px handle, tap alternative | 4.7 |
| R17 Evolve camera takes control | Accepted: any camera input ends it; skipped when the player is busy (inset or minimap flash instead) | MR-80, 5.1 |
| R18 Badge rules conflict | Accepted: NEW dots vs ready badges, a priority for Home. Correction: charges never block opening (A6), so every shelf capsule is openable | U11, 2.2, 4.6 |
| R19 Disclosure stops at Home | Accepted: rules inside Army, Level preview, Capsules, the HUD and the top bar | 2.6 |
| R20 Plate overloaded | Accepted: portrait, name, first-clear reward only | 2.3 |
| R21 Locked node taps | Accepted: a preview for every node type | 4.1 |
| R22 Honesty gaps | Accepted: bank captions under each bank; the odds change is listed for the lead's sign-off | 4.6, 2.9 |
| R23 Reserved colours collide | Accepted: separation by object kind with a table. Shifting the hues rejected: the built capsule show and team presets depend on them. Both contrast numbers corrected | 3.2 |
| R24 130% text cannot pass | Accepted: reflow, cap and exempt rules | 3.3 |
| R25 Cinzel for every age | Accepted: neutral display face plus an era token | 3.3 |
| R26 Deny flash vs "never flash" | Accepted: the rule means repeating flashes; world status effects do not count as pulses | U11, 4.7 |
| R27 Battle feel missing | Accepted: group K rows, the realistic motion rules, UI-5b with a live audit | 5.5 K, 5.8, 6.7b |
| R28 No haptics | Accepted: haptic tiers table and one helper | 5.4 |
| R29 Missing motion rows | Accepted: MR-18 extended, MR-27, MR-28, MR-47, MR-55, MR-56, MR-95, MR-96 | 5.5 |
| R30 Timing over budget | Accepted: MR-39 1,470 ms, MR-41 1,670 ms, Play interrupts ceremonies | 5.5, U12 |
| R31 Throwaway work in UI-1 | Accepted: UI-1 limited to Card detail, Result, summary, Pause, VS, plus a CSS hit fix for Mode select | 6.3 |
| R32 Save schema coordination | Accepted: one request to WP8 (v3 if unshipped, else v4); a `setFlag` service | 6.4, 6.11 |
| R33 Budget spec blind to Pixi | Accepted: settled states only, a canvas debug hook | 1.3 |
| R34 DESIGN change list incomplete | Accepted: items 5, 7-11, 14 added | 2.9 |
| R35 Review cost | Accepted: light vs full reviews, estimates per phase | 6.10, Part 6 |
| R36 No outcome measures | Accepted: five event-log kinds and a hallway test | 6.10, 2.8 |
| R37 Small issues | Accepted, all six: minimap hit area clarified; valid drop is green; trophies hidden until Ladder; no "tap anywhere" on unlocks; "Open" on unlocks is secondary; Level preview goals and reward in one strip | 4.7, 3.6, 2.3, MR-40, 4.1 |
| P1 No Info from Army | Accepted (as R15) | 4.2 |
| P2 Two places for the same things | Accepted: the Clash Royale-style Army and cosmetics only in Customize | 2.2 |
| P3 Too many invented terms | Accepted: first-seen captions, plain "Open", meters hidden until first progress. Merging Clay, Supply and Charges rejected here: it is an economy change for the lead, not a UI change; the UI hides them until they matter. Correction: charges never lock the Open button; they decide whether a ladder win earns a capsule, and the Result now says so | 3.6, 2.6, 4.6 |
| P4 Busy level plate | Accepted (as R20, R19) | 2.3, 2.6 |
| P5 Modes tile ambiguity | Accepted (as R7) | 2.3 |
| P6 Contradictions | Accepted: L5 spread over L5-L7, one capsule sequence, badge priority, trophies hidden until L6 | 2.6, 2.5, 2.2 |
| P7 Gold wasted on long-press; dense HUD | Accepted: train on release, long-press cancels; HUD shows only what has been taught | 4.7, MR-65 |
| P8 Too many Undo toasts | Accepted: one header Undo per visit | 4.2 |
| P9 Crowded bottom row | Accepted: the rail is gone, 780 px checked, the plate fades while panning, far padlocks hidden | 2.3 |
| P10 Ten decks | Accepted: only reached ages, auto-fill on a new age with a banner, presets later | 4.2, 2.6 |
| P11 Keep the bounce | Accepted: small pieces keep full overshoot; a checklist line stops reviewers flattening it | 3.7, 1.2 |
| Delights | Accepted: banner-bearer (MR-48), pokeable map and boss taunt (MR-49), haptics (5.4), NEW wobble and Legendary sheen (4.2), MVP pose (MR-90); the "chunk" is `star_stamp`. AI-labelled emotes in battle already exist (A9.2), so no new work | as listed |
