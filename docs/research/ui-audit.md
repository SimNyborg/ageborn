# UI and motion audit of the running game (2026-09-28)

Audit for the owner's request of 2026-09-28: "Right now it is rather confusing and not very intuitive or user-friendly. Research the principles of good user interface carefully, implement those principles ... Consider carefully, for the whole game, making more satisfying animations."

It checks the running production build against `docs/research/ui-principles.md` (principle IDs such as H6, G7, T1, M5 refer to that document) and the patterns in `docs/research/ui-benchmarks.md` (ranked patterns are cited as "B-rank n"). It is the input for the UI plan. It does not change code.

## How this audit was made

- **Build:** `npx vite build` of the working tree on 2026-09-28 (commit `5e5ac9c` plus uncommitted work of other agents), served with `vite preview` on port 5081, played in headless Chromium (SwiftShader WebGL) with Playwright.
- **Viewports:** phone 844 × 390 with touch, desktop 1280 × 720, plus 1400 × 720 for the capsule bench.
- **Players:**
  - *New player:* a fresh profile from the title through the training match (played by following the prompts), the Result, capsule 1 and the first Home, then every Home entry.
  - *Returning player:* the same save edited to onboarding done, 30 matches, 460 trophies (Arena 4), 5,200 Amber, 340 Dust and extra copies. Then every menu screen, a ladder battle (VS, countdown, HUD, card info, power drag, evolve, pause, result), Skirmish, Daily, Conquest, Settings, the Wardrobe Crate and the forced first upgrade.
  - *Capsule show:* `?dev=1#capsuleBench` cases `climb-clay-jade` and `legendary-first`, frame by frame.
- **Measurements:** a DOM pass per screen listed every visible text under 12 px and every button under 44 px (numbers below are CSS px). A stylesheet pass counted animation durations and easing curves. There were squint (blur + greyscale) and colour-vision (CDP `setEmulatedVisionDeficiency`) captures and a reduce-motion run.
- **Evidence:** screenshots live in the session scratchpad and are not committed. Paths below are relative to
  `S = /tmp/claude-0/-home-user-ageborn/e9e6071d-3409-58a6-a28d-0aba492052fd/scratchpad/uiaudit/`.
  The scripts `p1_new.cjs` ... `p6_modes.cjs` in the same folder regenerate them against any preview on port 5081. `sheets/` holds contact sheets.
- **Severity** follows Nielsen (ui-principles §9): 4 catastrophe (fix before release), 3 major, 2 minor, 1 cosmetic.
- **Limits:**
  - Frame rate and real touch feel cannot be judged in SwiftShader.
  - Playwright's mouse also produces hover events, so hover tooltips show up in the phone captures. That is noted where it matters.
  - The returning save was edited by hand, so its currency numbers are artificial.
  - Trophy Road claims, quest claims and a full Legendary walkout were not played to the end.

---

## 1. Summary

The game already has several strong pieces:

- the capsule climb with honest pre-signals;
- the Age Power drag with a ghost, a valid tint and "Release to cancel";
- the VS screen;
- the trophy count-up;
- class icons on every card;
- AI labels everywhere;
- the tutorial hand pointers.

The confusion the owner feels comes mainly from five things:

1. **Home has no single job.** 18 buttons and six equal navigation buttons in two rows. Two panels are clipped, the Trophy Road bar hides behind the nav row, and the War Path the owner asked for is not there (UA-02).
2. **Screens do not fit a 390 px tall phone.** The primary action of a screen is often below the fold or clipped: Mode select hides every picker, the Card detail's Upgrade button is below the fold, and so are Conquest's Fight, Skirmish's start and the War Plan's turret and power row (UA-01, UA-03).
3. **The visual grammar is inconsistent.**
   - There are two button systems (`ab-btn`, `ui-btn`).
   - Violet and blue buttons collide with rarity and team colours, and red is used for Close and for a normal "Open board" action.
   - The primary button is not the gold one on the ladder Result and the capsule summary.
   - Screens use about 55 durations and 30 easing curves (UA-10, UA-23).
4. **Text and targets are too small in battle.** Text on the phone HUD is 7.2-9.5 px. Pause, speed, minimap, Evolve, the card "i" and the Scouted chip are 18-40 px targets (UA-04, UA-05).
5. **The satisfying moments are missing or happen off-screen.**
   - The evolve (base upgrade) plays while the camera looks at the front.
   - A card upgrade is a toast at the top of the screen.
   - Equipping a card has no motion.
   - Rewards do not fly to their counters.
   - Screens have one generic entrance and no exit or direction.
   - Reduce motion deletes all feedback (UA-08, UA-09, section 4).

**Top 10 fixes by impact** (details in section 2):

| # | Fix | Issues |
|---|---|---|
| 1 | Mode select: let the cards show their pickers (or turn Mode select into a sheet with one card per row) | UA-01 |
| 2 | Home: one job and one primary action, at most 5 labelled destinations, nothing clipped (the War Path plan replaces it) | UA-02, UA-14, UA-28 |
| 3 | Every screen's primary action visible without scrolling at 844 × 390, bottom-right | UA-03, UA-12 |
| 4 | HUD: type scale ≥ 11-12 px and targets ≥ 44-48 px | UA-04, UA-05, UA-06 |
| 5 | One button component and one colour grammar | UA-10, UA-11 |
| 6 | Evolve and base upgrades staged on the base (camera goes home for the beat) | UA-08 |
| 7 | Upgrade, equip and reward ceremonies (M6 blocks: level up, card to slot, fly-to-counter, count-up) | UA-09, UA-19, section 4 |
| 8 | Motion tokens, directional screen transitions and a reduce-motion mode that keeps feedback | UA-23 |
| 9 | Plain words for invented terms, with an icon and an info panel | UA-24 |
| 10 | Deck builder and Collection that fit a phone: sticky filters, class filters that match the card classes, no truncation | UA-12, UA-13 |

---

## 2. Prioritised issue list

### Severity 4: fix first

**UA-01. Mode select hides its own controls (phone and desktop).** `modeSelect`
- **What:**
  - The five mode cards are laid out 4 + 1. Each card body is clipped (`overflow: hidden`), so a new control never shows. These are hidden: Quick Battle's difficulty picker (Easy ... Legendary), Ladder's format picker (Short, Standard, Full) and its reward line, Conquest's "0/27 stars", Skirmish's "5 Amber per win", and the Daily's difficulty picker and modifier.
  - A hit test on each picker button's centre (`document.elementFromPoint`) lands on another element for all 11 of them, so they cannot be pressed.
  - Pressing Daily "Play" goes straight to VS at the default difficulty, and a ladder battle always uses the last format.
  - The grid CSS expects one row of 5 columns (`grid-template-columns: minmax(0,1.35fr) repeat(4, minmax(0,1fr))`), but the page renders 4 + 1.
- **Evidence:** `desk-ret-meta/74-battlebtn.png`, `phone-ret-meta/74-battlebtn.png`, `sheets/prm-e.png`, `probe_mode.cjs` output (all 11 picker buttons `hit=false`).
- **Principles:** H1, H6, N5 (a control that exists but cannot be reached), F2, G2 (the five card headers use green, blue, red, green and gold, and the buttons green, gold, red, green and gold).
- **Fix direction:**
  - One primary card ("Next battle" or "Play level") and the other modes as smaller cards, each with its picker visible.
  - A 2 × 2 or scrolling layout on phones; no clipped bodies.
  - Neutral colours for the mode cards, and gold only on the one primary button.

**UA-02. Home is crowded and has no single job; the War Path centrepiece is missing.** `home`
- **What:**
  - 18 buttons on a 390 px tall phone: the profile, Amber and Dust chips, the gear, a Quests panel with swap buttons, the Battle button, the next-opponent chip, the Trophy Road bar, a Capsules panel with its own "i" and "Open" buttons, and six nav buttons of equal weight in two rows (War Plan, Collection, Capsules, Customize, Trophy Road, Conquest).
  - The Quests panel clips its second quest mid-word ("Kill 5 Heavies with Anti-…").
  - The Capsules panel clips its button to "OPEN WARDROBE CRA".
  - The Trophy Road bar ("Next reward at 500 / Warp Strike") sits behind the nav row.
  - The arena scene is almost fully covered by panels.
  - "Capsules" appears twice (a panel and a nav button that opens a sheet with the same content).
  - Nothing shows the War Path level map the owner asked for (decisions.md, owner feedback 2026-09-28 evening).
- **Evidence:** `phone-new/45-home-first.png`, `phone-ret-meta/14-home-after-upgrade.png`, `desk-ret-meta/14-home-after-upgrade.png`, `phone-new-meta/27-capsules.png`.
- **Principles:** H8, G6, G7, F2 (6 destinations plus 4 panels), N6 (the five verbs), P2 (a new player sees everything at once), T4 (clipping), benchmarks B-rank 1, 2, 3.
- **What works:**
  - The Battle button is the strongest element; the squint test passes (`misc-desk/02-home-squint.png`).
  - The next opponent carries its AI label.
- **Fix direction:**
  - The War Path map as the screen, with the current node's Play button bottom-right.
  - A bottom tab bar of at most 5 labelled destinations.
  - Capsules as a tray, not a panel plus a nav button.
  - Quests and the War Chest behind one entry.
  - Nothing clipped at 844 × 390.

**UA-03. On phones the primary action of several screens is below the fold or clipped.**

| Screen | What is hidden | Evidence |
|---|---|---|
| Card detail | The Upgrade button (the reason to open the screen) and Strong vs / Weak vs are below the stats. The player scrolls, taps, and the result (stats, level) is then scrolled out of view. | `phone-ret-meta/36-carddetail.png`, `37-carddetail-scrolled.png` |
| Conquest General sheet | The Fight button is below the star list | `phone-modes/05-conquest-general.png` |
| Skirmish setup | The difficulty picker and start button are below the General grid | `phone-modes/01-skirmish.png` |
| War Plan | The loadout's second row (2 turrets, the power) is cut in half; the collection column shows 1.5 rows of cards | `phone-ret-meta/15-warplan-t90.png`, `sheets/prm-b.png` |
| Ladder Result | The rewards panel is an inner scroll box; "Also earned", the tip and the new title need a scroll inside it | `phone-battle3/21-result-0.png` ... `30-result-scrolled.png` |
| Starter capsule summary | Shows "UPGRADE READY" on all three cards but offers no Upgrade button, only Done | `phone-new/42-capsule-summary.png` |

- **Principles:** G6, T3, H1, K5, benchmark rule "the next action is one tap away" (B-rank 1, 10).
- **Fix direction:**
  - A screen template for 390 px: a fixed header, content that fits or scrolls, and a fixed action bar at the bottom-right that holds the one primary button.
  - The Card detail keeps the card and its stats in view while upgrading.

### Severity 3: major

**UA-04. HUD text is below the readable minimum on phones.** `src/ui/hud/hud.css`
- **What (measured at 844 × 390):**

  | Size | Text |
  |---|---|
  | 7.2 px | "+Income · 200" |
  | 8 px | "YOU", "XP 44/680" |
  | 8.1 px | the AI chip |
  | 8.5 px | "100%" (HP), "+6/s", "Overdrive in 6:41" |
  | 9 px | "Evolve", the opponent's name |
  | 9.5 px | the army count |
  | 10 px | "1x", "Charge", "Scouted (1)" |
  | 10.5 px | card names |

  - The mount popover uses 10-10.5 px ("Build a turret", names and prices).
  - Overall the UI uses 25 different px font sizes.
- **Evidence:** the MEASURE lines in `run3.log` and the p1 output; `phone-new/08-prompt-m1.sendBonker.png`; `phone-new/12-mount-popover.png`.
- **Principles:** A2 (≥ 12, tags ≥ 11 bold), K2, G6. On desktop the same labels scale to 10.4-11.6 px (`run5.log`), which is borderline.
- **Fix direction:** the A2 type scale (11 / 12 / 14 / 16 / 20 / 28), and drop the lowest-value labels ("+Income · 200", "YOU") rather than shrinking everything.

**UA-05. Touch targets under 44 px in battle and in pickers.**
- **What:**

  | Control | Size (px) |
  |---|---|
  | Pause, speed | 30 × 30 |
  | Minimap "your base" and "follow the fight" | 32 × 32 |
  | Evolve | 40 × 40 (its source comment promises 48 on phones, `TopBar.tsx` line 4) |
  | Card "i" | 24 × 24 |
  | Scouted chip | 81 × 18 |
  | Stance | 90 × 36 |
  | Pause "Resume" | 192 × 34 |
  | War Plan remove "×" | 30 × 30 on every card |
  | Mode select difficulty chips on phone | 30 × 40 (Legendary is 30 px wide) |
  | Capsule "Odds" | 43 × 18 |
  | Capsule summary "Equipped" | 89 × 32 |

- **Evidence:** the MEASURE "tiny" lists (p1, p3, p6 logs); `phone-battle/12-card-info.png`; `phone-new-meta/04-warplan.png`.
- **Principles:** T1, A8, F1, T3 (Evolve sits at the top-left, far from both thumbs).
- **Fix direction:**
  - 48 px targets, or 44 px for rare controls, with an invisible hit area around small icons.
  - Evolve near the left thumb; Scouted as a proper 44 px chip.

**UA-06. The visible way to card info in battle is a 24 px "i" (severity 2-3).**
- **What:**
  - The tray has a touch-only long-press (450 ms; `Tray.tsx` ignores `pointerType === 'mouse'`). A 700 ms mouse press showed nothing, so the touch path was not exercised in this audit.
  - Nothing on the card signals the long-press, so the visible entry is the 24 × 24 "i" badge. It sits on the card's corner, next to the tap that trains a unit.
  - On desktop, hover shows the info (`misc-desk/06-hud-hover-card.png`), which is fine.
- **Evidence:** `phone-battle/12-card-info.png`, `phone-battle/14-card-longpress.png` (mouse press, no tip).
- **Principles:** H6, T1, N2, 8.2 "long-press gives info on cards".
- **Fix direction:**
  - Check the long-press on a real phone.
  - Teach it once (a tutorial beat or first-time hint).
  - Give the "i" a 44 px hit area, or move info to the long-press only.

**UA-07. The evolve (the base upgrade the owner wants to be satisfying) happens off-screen.**
- **What:**
  - The Evolve press is followed by a near-full-screen white flash. The camera stays on the front line, so the base morph built for this moment (`baseAscend`, shards, bands, dust; decisions.md "Base upgrade moments") is at most a sliver at the left edge.
  - The tray cards swap to the new age's cards in one frame with no transition.
  - The Evolve button lights gold again right after evolving when XP is already full, which adds another call to action at once.
- **Evidence:** frames 200 ms apart, `phone-battle/28-evolve-ready.png` ... `36-evolve-f7.png` (`sheets/pb-d.png`); `phone-new/16-prompt-m1.arrowStorm.png`.
- **Principles:** M5 (the impact must be seen), M8 (Large event), staging (M2), A5 (the flash is almost pure white at full strength), H1.
- **Fix direction:**
  - For the player's own evolve, the camera frames the base for the beat and then returns (a skippable push, like the A17 camera).
  - A soft, tinted flash.
  - The tray cards flip to the new age one after another (40 ms stagger).

**UA-08. Card upgrade has no ceremony, and its feedback is far from the eye.**
- **What (Card detail):**
  - Pressing Upgrade shows a small "Level 3!" toast at the top centre.
  - The card and stats are scrolled out of view on the phone, so the level change and stat increases are not seen.
  - Amber drops from 5,180 to 5,130 without a count.
  - The button re-arms at once with the next price ("UPGRADE 100") in the same spot, which invites a double spend.
- **What (the forced first upgrade):**
  - The modal changes to "Lv 2" in one step with a hammer icon; frames f0-f8 are identical.
  - The title overlaps the panel's top edge.
  - Health and Damage are bars without numbers.
- **Evidence:** `phone-ret-meta/38-upgrade-f0.png` ... `46-upgrade-end.png` (`sheets/prm-d.png`); `phone-ret-meta/02-first-upgrade.png` ... `13-first-upgrade-end.png` (`sheets/prm-a.png`), full size `phone-ret-meta/03-first-upgrade-f0.png`.
- **Principles:** M6 "level up / upgrade", M5, N4 (the feedback is not where the eye is), H5 (a repeat spend with no pause), benchmark B-rank 12.
- **What works:** the stat table already shows the next-level increases ("+8", "+1") before the spend. Keep that.

**UA-09. Two button systems and no colour grammar.**
- **What:**
  - Title, training Result and first upgrade use `.ab-btn` (`src/app/ui/app.css`); the meta screens use `.ui-btn` (`src/ui/theme.css`). The two differ in shape, lip and type.
  - Colour use today:
    - Blue: all six Home nav buttons (blue is the player's team colour).
    - Violet: "Open Wardrobe Crate", the quest swap and the Dust crafting buttons (violet is the Epic rarity colour).
    - Red: every Close "×" (Capsules sheet, Skirmish, Conquest General, Amber info) and Conquest's "Open board".
    - Green: Quick Battle and Skirmish.
    - Gold: Ladder and Daily.
  - On the ladder Result, gold goes to HOME and NEXT BATTLE is plain white. In the capsule summary, Done is gold while "Open next" and "Open all" are plain.
- **Evidence:** `phone-ret-meta/14-home-after-upgrade.png`, `desk-ret-meta/74-battlebtn.png`, `phone-battle3/21-result-0.png`, `bench-climb-clay-jade/40.png`, `phone-modes/01-skirmish.png`, `phone-ret-meta/76-chip-amber.png`.
- **Principles:** H4, G2, G7, ui-principles §5.3, benchmark B-rank 4.
- **Fix direction:**
  - One Button component.
  - Gold = the one "go" per screen; green = progress (Upgrade, Claim, Equip); a neutral slate for navigation and secondary actions; red only for destructive actions and deny.
  - Close is a neutral "×" top-right.

**UA-10. The ladder Result does not lead to the next battle, and the two Results look different.**
- **What:**
  - On the ladder Result the primary (gold, focused) button is HOME. "NEXT BATTLE" is the plain third button.
  - The rewards panel scrolls inside itself (see UA-03).
  - The training Result (`.ab-*`, centred card, one button) and the ladder Result (`.ui-*`, two panels, three buttons) look like two different games.
  - With the edited save, a defeat showed "Trophies +340" (517 → 800). This may be an artefact of the hand-edited save; verify with a real save.
- **Evidence:** `phone-new/18-result-0.png` vs `phone-battle3/21-result-0.png`; `sheets/pb3-a.png`.
- **Principles:** B-rank 1 and 10 (Next battle is the primary in the same spot as Home's Battle), H4, A15.13 (at most 3 staged steps, one summary row), peak-end.
- **What works:** trophies count up (517 → 573 → ... → 800) and "Tap to skip" is offered.

**UA-11. The War Plan is not yet an intuitive deck builder on phones.** `warplan`
- **What:**
  - Two independent scroll columns in 390 px.
  - The age tabs are icons only (only the selected one has a label), with small orange dots whose meaning is not explained.
  - Every equipped card carries a red 30 px "×".
  - Adding a card is an instant swap with no motion: the t80 and settled frames are identical.
  - No drag. The loadout has 5 unit slots (the owner asked for 6).
  - The "Who beats whom" legend takes half of the left column.
  - The desktop hover tooltip opens over the header and covers the Back button and the title.
- **Evidence:** `phone-new-meta/02-warplan-t90.png` ... `09-warplan-added.png` (`sheets/pnm-a.png`), `phone-ret-meta/20-warplan-removed.png`, `22-warplan-added.png`, `27-warplan-age-modern.png` (`sheets/prm-b.png`), `desk-ret-meta/17-warplan.png`.
- **Principles:** H6, N1, N2, T1, T5, T6, P4, M6 "card to slot", owner feedback (intuitive equipping, six troops), B-rank 5.
- **What works:**
  - "Tap a card to add it, or pick a slot first."
  - Dashed "+ UNIT" empty slots.
  - Green check marks on equipped cards in the collection.
  - Class names on every card.
  - The Auto-fill button.

**UA-12. Collection filters scroll away and use a different class vocabulary from the cards.** `collection`
- **What:**
  - The Cards, Skins and Feats tabs and all filters scroll away with the grid, so changing a filter means scrolling back up.
  - The role dropdown lists 13 internal roles (Skirmisher, Siege heavy, Artillery, Air bomber, Air gunship, Anti-mech ...), while the cards show the 7 player classes (Infantry, Ranged, Heavy, Anti-armor, Siege, Support, Air).
  - The rarity and age filters are icon-only chips.
  - Names are truncated: "Spear Hu…", "Mammot…", "Batterin…", "Longbow…", "Drum Sh…".
- **Evidence:** `phone-new-meta/17-collection.png`, `18-collection-scrolled.png`, `phone-new-meta/19-collection-tab-skins.png` (the tabs cannot be reached after scrolling), `desk-ret-meta/30-collection.png`.
- **Principles:** H4, H2, A3 (icon-only filters), H3, B-rank 6.

**UA-13. A returning player needs 3 taps plus a VS tap to start a battle; Conquest opens far from the next opponent.**
- **What:**
  - Returning player: Home Battle → Mode select → Ladder "Battle" → VS "Tap to start" (the new player's Battle starts at once).
  - Conquest opens at the top of the ladder (The Warden, locked). The player's next General (Pip, marked NEXT) is at the bottom and needs a scroll.
- **Evidence:** `phone-ret-meta/74-battlebtn.png`, `phone-ret-meta/62-conquest.png`, `phone-modes/04-conquest-bottom.png`.
- **Principles:** K5 (Home → Battle in 1 tap), F1, benchmark 4.2 ("the level map opens on the current node"), G4.

**UA-14. Too many things pulse at once in battle.**
- **What:**
  - At once: the ready Evolve button (gold glow), the READY Age Power (glow, READY tag, arrow badge), the new-mount "+" (gold glow with "New slot · 150" floating over the lane), the tutorial bubble with a bouncing hand, and affordable tray cards that never stop moving.
  - Playwright could never treat a tray card as "stable" enough to click in 30 s, which shows that the card is always in motion.
  - The tutorial hand covers the bubble's text ("Drag [hand] arrows onto them").
  - The READY tag is clipped at the top of the power ring.
- **Evidence:** `phone-new/16-prompt-m1.arrowStorm.png`, `phone-new/14-prompt-m1.evolve.png`, the `probe_click.cjs` output ("waiting for element to be visible, enabled and stable").
- **Principles:** G7 (at most one attention pulse), M1 (motion with a purpose), feel-ux (no flashing reminders), K9 (teach one thing at a time).

**UA-15. Customize has no preview, inconsistent counts and sparse tabs.** `customize`
- **What:**
  - No live preview of the base, flag or unit, although the owner's Customize request centres on seeing the cosmetics.
  - The header says "0/12 skins"; the Troops tab says "0/11 skins".
  - Locked skins show a price button cut off at the bottom of the phone screen.
  - Emotes is a row of plain text chips with no preview.
  - Bases has one item.
  - Banner & title locks use 9-10 px "Unlocks in Arena 2" text on grey chips.
- **Evidence:** `phone-new-meta/30-customize.png` ... `33-customize-tab-emotes.png` (`sheets/pnm-c.png`, `pnm-d.png`).
- **Principles:** H6, M7.8, G3, A2, H4 (the counts).

**UA-16. Irreversible actions without confirmation or undo.**
- **What:** The quest swap (one per day) replaces the quest immediately ("Kill 5 Heavies ..." became "Destroy a base before 6:00"), with an unlabelled violet circular-arrow icon.
- **Evidence:** `phone-modes/06-quest-reroll.png` vs `phone-ret-meta/14-home-after-upgrade.png`.
- **Principles:** H5, P4 (an undo toast), H2 (an unlabelled icon).

**UA-17. Jargon without an in-place explanation.**
- **What:** Terms a new player sees in the first minutes with no icon-plus-meaning:
  - Home: "Tar Pits" / "Powder Bay" as a ribbon over Battle, "Charges 12/28", "Next 9 capsules use no charge", "Clay meter 0/3", "Next reward at 50" with "110" (a trophy threshold and an Amber amount side by side).
  - Profile: "Codex Level", "Plan Lv 1.0".
  - Card tags: "Bio", "Light", "×0.7 vs Armored".
  - HUD: "+Income · 200", "Overdrive in 6:41", "Scouted (1)".
  - Result: "Clay meter".
  - The Amber chip's info panel is a good model (`phone-ret-meta/76-chip-amber.png`), but most terms have none.
- **Evidence:** `phone-new/45-home-first.png`, `phone-ret-meta/36-carddetail.png`, `phone-battle/11-hud-start.png`.
- **Principles:** H2, H10, K3, P1 (one new term at a time).

### Severity 2: minor

**UA-18. The capsule summary does not end on the next action.**
- **What:**
  - The summary shows small cards in a large panel; the Wardrobe Crate summary is one card in a panel about 700 px wide.
  - It has four buttons (Upgrade, Open next, Open all, Done), and Done is the gold one.
  - "Equipped" on new cards is a grey button that looks disabled; it is a state, not an action.
  - Copies read "2/1" and "5/2" (over-full bars) with "UPGRADE READY" in 9.5 px.
  - The summary order (rarest first) differs from the reveal order.
  - "+210" or "+1400" Amber appears as a static chip at the top-right with no fly-to-counter.
- **Evidence:** `phone-new/42-capsule-summary.png`, `bench-climb-clay-jade/31.png` ... `59.png` (`sheets/bc-a.png`, `bc-b.png`), `bench2-crate-epic/04.png` (`sheets/bl3.png`).
- **Principles:** G6, H4, A10 step 8, M6 fly-to-counter, H1.

**UA-19. The capsule show carries panels that compete with the peak.**
- **What:**
  - The Guarantees box (top-left), the honesty line (bottom, about 10 px in a dark box), "Hold to fast-forward" and "Skip" stay on screen through every strike and reveal.
  - The "Tap!" label sits on the pedestal and overlaps the pip row.
- **Evidence:** `phone-new/26-capsule-a2.png`, `bench-legendary-first/*.png` (`sheets/bl-a.png`).
- **Principles:** staging (M2), H8. Honesty lines are required by A15.3, so keep them, but make them compact after the first capsule (for example the "Odds" chip only) and keep the full line on the first capsule and in the odds sheet.

**UA-20. The Profile contradicts itself.**
- **What:**
  - After winning the training match: "1-0-0" wins and "100% win rate", but "Last matches: No matches yet", "Results by AI tier: No matches yet" and "Highest AI tier beaten: None yet".
  - "Tar Pits" and "Tar Pit" appear as two chips side by side (arena and banner).
- **Evidence:** `phone-new-meta/43-profile.png`.
- **Principles:** H1, H4.

**UA-21. The pause.**
- **What:**
  - The meta pause covers the whole lane (known, `docs/requests/wp9-a17-pause-scout.md`).
  - Resume is 34 px tall on the phone.
  - Retreat (red) sits 8 px below Settings, in the same column as Resume.
  - In one run the pause stayed open after Esc from Settings and a tap on Resume. The run also sent further Esc presses, so this is unconfirmed; a clean retry resumed correctly.
- **Evidence:** `phone-battle2/22-pause.png`, `phone-battle2/90-retreat.png`, `probe_pause.cjs` output.
- **Principles:** T1, T3 (destructive actions away from the primary), H3.

**UA-22. Feedback appears far from where the player tapped.**
- **What:**
  - Tapping locked Conquest shows "Unlocks in Arena 3" as a toast at the top centre, about 300 px from the button.
  - Card upgrade shows "Level 3!" at the top.
  - Quest swap shows no toast.
- **Evidence:** `phone-new-meta/40-conquest.png`, `phone-ret-meta/38-upgrade-f0.png`.
- **Principles:** N4, G1.

**UA-23. The motion system is ad hoc, and reduce motion deletes feedback.**
- **What:**
  - The loaded stylesheets use about 55 distinct durations (60 ms to 40 s) and 30+ easing curves (13 different `cubic-bezier` overshoots such as `(0.2,1.6,0.4,1)`, `(0.3,1.8,0.5,1)`, `(0.2,1.3,0.4,1)`), plus `ease`, `ease-out`, `ease-in-out` and `linear`. There are 109 keyframe sets.
  - Every screen enters with the same `ui-enter` (260 ms rise and fade, `theme.css`). There is no exit animation, no direction (going deeper and going back look the same), no container transform from tile to detail, and no shared-axis tabs: age tabs, Collection tabs and Customize tabs switch in one frame.
  - Reduce motion (setting or OS) sets every animation and transition to 1 ms (`theme.css` lines 147-163). The reduce-motion run showed `ui-enter:1`, `ui-pop:1`, `ui-fade:1`, so state changes become instant jumps.
- **Evidence:** `run5.log` (MOTION and "RM animations" lines); `phone-new-meta/15-collection-t90.png` vs `17-collection.png`; `misc-phone-rm/*`.
- **Principles:** M3, M4, A4, M10, H4, B-rank 8, 20, 25.

**UA-24. Truncated names and clipped labels throughout.**
- **What:**
  - Tray: "Longbo…", "Spear H…". War Plan: "Spear …", "War Ch…", "Phalan…". Collection: see UA-12. Pause scouted: "Phalang…", "War Cha…".
  - "OPEN WARDROBE CRA".
  - Danish (about 30% longer, v1.1) will make this worse.
- **Evidence:** `phone-new/16-prompt-m1.arrowStorm.png`, `phone-ret-meta/25-warplan-age-bronze.png`, `phone-battle2/22-pause.png`.
- **Principles:** K2, 8.1 "room for Danish".

### Severity 1: cosmetic

- **UA-25.** The title → battle transition is a hard cut. The capsule → Home transition is also a hard cut: the `after-capsule-0` and `-1` frames 900 ms apart are identical. Evidence: `phone-new/03-title-to-battle-0.png`, `phone-new/43-after-capsule-0.png`, `44-after-capsule-1.png`. (M4 fade-through.)
- **UA-26.** "New slot · 150" floats over the lane art without a scrim. The mount popover is a dark box with 10 px text. Evidence: `phone-new/13-turret-built.png`, `12-mount-popover.png`. (K2, G5.)
- **UA-27.** Settings: "Edge scroll: Move the mouse to a screen edge" shows on a phone. Evidence: `phone-modes/08-settings-s1.png`. (H2.)
- **UA-28.** Daily VS shows "Madame Tempest Tier II" while Conquest lists her as Tier VIII. The tier depends on the Daily difficulty, but this is not said. Evidence: `phone-modes/03-daily.png`, `phone-ret-meta/62-conquest.png`. (H4, H1.)
- **UA-29.** Home badges: "42" on Collection (every card with an upgrade ready) reads like a backlog count. "9" on Trophy Road is fine. Evidence: `phone-ret-meta/14-home-after-upgrade.png`. (A15.13, B-rank 17.)

### Gaps against the owner's requests (status, not defects)

These were asked for on 2026-09-28 and are not in this build (other agents are working on several):

- War Path map on Home (UA-02).
- Six troop slots and six tray cards (the loadout shows 5, the tray 4-5).
- A drag-and-drop deck builder (UA-11).
- A Customize live preview and base skins (UA-15).
- Base-upgrade staging on screen (UA-07).
- The stationary class.

The class icons, the counters in the card tooltip and the power drag are in and work.

---

## 3. Screen by screen

The table maps each screen to its issues. "OK" lists what already follows the principles and should be kept.

| Screen | Issues | OK (keep) |
|---|---|---|
| Title (new player) | UA-25 | One gold Play, AI chip, gear top-right, reaches the battle in about 4 s and 1 tap (`phone-new/01-title.png`) |
| Training match HUD | UA-04, UA-05, UA-06, UA-14, UA-24, UA-26 | Tutorial hand on the right target, dashed locked slot with a padlock, "Tap to send a Bonker" (≤ 8 words) |
| Training Result | UA-10 | One primary, "Victory!", rewards as chips (`phone-new/18-result-0.png`) |
| Capsule show | UA-18, UA-19 | Honest back-loaded climb, pip row, colour steps copper → silver → jade, burst, fan, NEW EPIC mini-walkout, Skip and Hold (`sheets/bc-a.png`) |
| First Home | UA-02, UA-17, UA-29 | First-time pointer on War Plan ("New! Choose your troops for each age") |
| War Plan | UA-03, UA-05, UA-11, UA-24 | Tap-to-add, empty-slot signifier, class labels, Auto-fill |
| Collection | UA-12, UA-24 | Silhouettes with padlocks for unowned cards, copies bars, class icons |
| Card detail | UA-03, UA-08, UA-17 | Stat table with the next-level deltas, class and age chips, skins row |
| Customize | UA-15 | Tabs, locked items say how they unlock |
| Trophy Road | "50 / 110" nodes are unclear (UA-17); claim buttons alternate sides | Opens on "You", "9 to claim" chip, green Claim buttons (`phone-ret-meta/58-trophyroad.png`) |
| Conquest | UA-13 | NEXT tag, AI tier on every General, stars, honest "Uses no charges" line |
| Mode select | UA-01, UA-09, UA-13 | Plain one-line descriptions |
| Skirmish | UA-03 | AI badges on every portrait |
| Daily | UA-01, UA-28 | VS shows the modifier and "Both sides: every card Lv 7" |
| VS | none major | Clear two-sided layout, AI badge, "Plays by the same rules as you", "Tap to start" with a progress bar (`phone-battle/01-vs-0.png`) |
| Battle HUD | UA-04, UA-05, UA-06, UA-07, UA-14 | Actions at the bottom and status at the top, power drag with a ghost, valid tint and "Release to cancel" over the tray (`sheets/pb-c.png`), damage numbers, the minimap |
| Pause | UA-21 | "Retreat unlocks at 1:00" explains the lock |
| Ladder Result | UA-03, UA-10 | Staged trophy count-up, MVP card, recap |
| Settings | UA-27 | Grouped sections, current values visible, plain descriptions, "Capsule odds" and "For parents" |
| Profile | UA-20 | "All opponents in this version are AI." |

---

## 4. Animation audit: missing or weak motion

Each row gives today's behaviour, the principle, and the M5/M6 recipe that should replace it.

| Moment | Today (evidence) | Missing | Recipe |
|---|---|---|---|
| Any button press | `ui-btn:active` press exists in the meta. Tray cards animate constantly instead of reacting to the press. | A shared pointer-down state in the same frame for every control, HUD cards included | M6 Press: 70 ms down, 140 ms release with overshoot, `ui_tap` |
| Screen change (Home ↔ any screen) | The same `ui-enter` rise and fade for every screen, no exit (`phone-new-meta/15-collection-t90.png`) | Direction (deeper = scale in, back = reverse), exit about 0.7 × the entrance | M4 shared axis Z, 300 ms in, 200 ms out |
| Tabs (age tabs, Collection, Customize, Settings) | Instant swap | Shared axis X in the tab's direction | 150-220 ms |
| Card tile → Card detail | Instant screen | Container transform; Back shrinks into the tile | M4 |
| Title → battle, capsule → Home | Hard cut (UA-25) | Fade-through | 300 ms |
| Equip a card in the War Plan | Instant (`phone-new-meta/08-warplan-add-t80.png` = settled) | Lift, arc flight, land with squash, slot rim flash in the rarity colour; the replaced card flies back; the Plan level counts up | M6 card to slot |
| Card upgrade | A "Level 3!" toast at the top (UA-08) | Anticipation shake, burst on the card, level number flips, each stat ticks with a green "+N", shine sweep, Amber counts down at the chip, Plan level moves | M6 level up (medium, ≤ 2 s, skippable) |
| First forced upgrade | Static modal (`sheets/prm-a.png`) | Same as the card upgrade; it is the player's first upgrade, so a peak | M5 |
| Evolve / base upgrade | Off-screen morph, white flash (UA-07) | Camera to the base, anticipation on the base, the morph in view, the tray flipping to the new age | M5 large event, ≤ 10 s, skippable after the first |
| Age Power | Good: breathing ready state, drag hint hand, ghost area with a valid (blue) and invalid (red) tint, "Release to cancel", impact | The READY tag is clipped; the ready moment could close the charge ring with a chime | Keep; fix the tag |
| Tray card affordable or trained | Constant motion when affordable | Glow ramps in 150 ms and then rests; training completes with a tick and a pop | M7.9 |
| Denied press | After a burst of 12 taps with little gold, the cards show seconds ("3s", "8s", "20s", apparently the training queue) with no legend, and no deny reason appeared (`phone-battle/16-deny-30.png`, `17-deny-150.png`) | Red flash, 2-frame shake and a reason label ("Need 40 gold"); a legend or icon for the queue time | M6 Press (deny), H9, H2 |
| Result rewards | Trophy count-up (good); the capsule chip lights up; no flights | Amber, trophies and copies fly to their counters; the progress bar fills with a bright leading edge; Next battle arrives last with an attention pulse | M6 fly-to-counter, count-up |
| Capsule strikes and reveal | Good anticipation and climbs (`sheets/bc-a.png`, `bl-a.png`) | Amber pours into its counter (A10 step 4); copies fly into bars more visibly; the summary cards stagger in; one strong "Open next" | A10, M6 |
| Capsule summary → Home | Hard cut | New cards fly to the Collection nav item, which bumps | M4 spatial continuity |
| Home unlock (Conquest at Arena 3) | Appears unlocked with no ceremony | Lock shakes, cracks, the item fills with colour, "Unlocked", a one-tap intro | M6 Unlock, B-rank 13 |
| Quest claim, Trophy Road claim | Not played in this audit | Fly-to-counter and the node stamping | M6 |
| Currency chips | Numbers jump (5,180 → 5,130) | Count, bump on arrival | M6 count-up |
| Toasts | 320 ms `ui-toast-in` with `ease-back`, at the top centre | Enter from the nearest edge, close to the tapped element; undo where reversible | M6 Toast |
| Reduce motion | Everything at 1 ms (UA-23) | Per-component reduced variants: 150 ms cross-fades, glow and colour changes, counters still update | M10 |

---

## 5. Task walk-throughs (returning player, phone)

| Task | Taps from Home today | Target (ui-principles §9) | Blocker |
|---|---|---|---|
| Start the next battle | 3 plus a VS tap (Battle → Ladder Battle → VS) | 1 | UA-13, UA-01 |
| Choose a difficulty or a format | Not possible (the picker is hidden) | 2 | UA-01 |
| Equip a new card in the Stone loadout | 3 (War Plan → × → tap card) when the loadout is full | ≤ 3 | OK, but no feedback motion (UA-11) |
| Upgrade a card | 3 plus a scroll (Collection → card → scroll → Upgrade) | ≤ 3, no scroll | UA-03, UA-08 |
| Open a capsule | 1 | 1 | OK |
| Change the base flag | 3 (Customize → Banner & title → flag) | ≤ 3 | No preview (UA-15) |
| Find a capsule's odds | 2 (capsules "i", or Settings → scroll → Capsule odds) | ≤ 3 | OK |
| Turn on reduce motion | 2 | ≤ 3 | OK, but see UA-23 |
| First battle on a fresh profile | 1 tap, about 4 s after load | ≤ 60 s | OK |

---

## 6. Measurements for the plan

- **Text under 12 px** (visible elements with a direct text node):
  - Phone HUD: 14-18 labels at 7.2-11 px.
  - War Plan: 7-8 at 10-11 px (class names).
  - Capsule summary: 8 at 9.5-11 px.
  - Mode select: 10 at 10-11.5 px.
  - Home: 2 (AI chip 10 px, lock text 11 px).
- **Controls under 44 px:**
  - HUD: 7-11 (Evolve 40, minimap 32, pause and speed 30, "i" 24, Scouted 18 tall).
  - War Plan: 6 remove buttons at 30.
  - Mode select: 8 picker chips at 30-51 × 40.
  - Capsule summary: 3 (Odds 43 × 18, Equipped 89 × 32).
- **Buttons visible per screen:**
  - Home: 18. Mode select: 17 (5 pickers clipped). War Plan: 36. Collection: 28. Customize: 9-16. Settings: 23 (desktop). Result: 3-4.
- **Motion:** about 55 durations, 30+ easing curves, 109 keyframe sets, 1,541 style rules. One screen-enter animation, no screen exits.
- **Colour vision:** the deuteranopia and tritanopia captures of Home and HUD (`misc-desk/03-home-deuteranopia.png`, `04-home-tritanopia.png`, `07-hud-deuteranopia.png`) keep the team sides apart (blue and orange become blue and yellow). The gold Battle button stays the brightest element. Rarity frames on small cards were not checked under emulation.
- **Squint test:** Home passes (the Battle button reads first, `misc-desk/02-home-squint.png`). In the HUD the Age Power and the tray read first, and the top bar is a grey band (`misc-desk/08-hud-squint.png`).

---

## 7. Recommended order for the UI plan

1. **Foundations** (shared kit, one package, small):
   - One Button component with the colour grammar (UA-09).
   - Type-scale tokens and a 44/48 px hit-area rule (UA-04, UA-05).
   - Motion tokens and reduced variants (UA-23).
   - A standard phone screen template with a fixed bottom action bar (UA-03).
   - Close and Back in fixed places.
2. **Blockers:** Mode select layout (UA-01), then the Card detail and Conquest or Skirmish action bars (UA-03).
3. **Structure:**
   - Home as the War Path hub with at most 5 tabs (UA-02, UA-13, UA-29).
   - The Result with Next battle as the primary, and one Result design (UA-10).
4. **Core flows:**
   - The deck builder (UA-11), the Collection filters (UA-12).
   - HUD sizes, long-press info, deny reasons and one attention pulse (UA-05, UA-06, UA-14).
   - Plain words for terms (UA-17).
5. **Satisfaction:**
   - Evolve on screen (UA-07), upgrade ceremonies (UA-08).
   - Equip, reward flights and counters, screen transitions, unlock ceremonies, capsule summary (UA-18, UA-19, section 4).
6. **Polish:** UA-15, UA-16, UA-20 to UA-22, UA-24 to UA-28.

Each fix should be re-checked with the same scripts (`S/p1_new.cjs` ... `p6_modes.cjs`) and the checklists in `ui-principles.md` §8.
