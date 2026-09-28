# UI, interaction and motion principles for Ageborn

Research for the interface plan the owner asked for on 2026-09-28: "Right now it is rather confusing and not very intuitive or user-friendly. Research the principles of good user interface carefully, implement those principles and keep them in mind all the time. Consider carefully, for the whole game, making more satisfying animations."

How to use this document:

- Part 0 is the one-page version. Every UI and visual package keeps it in mind for every change.
- Parts 1-6 explain each principle, cite the source, and say what it means for Ageborn in concrete terms. Each principle has an ID (H3, N2, M5 ...) so plans, reviews and requests can cite it ("violates H6, N2").
- Part 7 applies the principles screen by screen.
- Part 8 is the checklist form. Reviews copy the relevant list and tick it.
- Part 9 is the review method (how to test against this document with Playwright).
- Game feel inside the battle (hitstop, shake, particles, sound) is already covered by `docs/research/feel-ux.md` and DESIGN A12. This document covers the interface (menus, meta screens, HUD, reveals) and the motion of the interface, and only links to the battle feel where they meet.

Research note: nngroup.com, lawsofux.com, w3.org, gameaccessibilityguidelines.com and celiahodent.com are blocked by this environment's network policy, so their content was read through search result extracts. Every claim below is attributed to the source it comes from. Where a number is our own recommendation rather than a source's, the text says so.

---

## 0. The one-page version: twelve rules

1. **One screen, one job, one obvious next step.** Every screen answers "what is this for?" and "what do I do now?" within 5 seconds. Exactly one primary button per screen, visually the strongest thing on it (H8, G6, F2).
2. **The player always knows where they are, what just happened and what it cost.** Every tap gets a visible response within 100 ms; every state (charging, locked, ready, equipped, new) has a distinct look (H1, N4, R1).
3. **Show, don't make them remember.** Class, counters, cost, level, what is equipped and what is locked are visible where the decision is made, not on another screen (H6, N2).
4. **Say it the player's way.** Plain words, one new term at a time, an icon plus a label for anything that is not universal (H2, K3).
5. **Consistent grammar.** The same colour, shape, position and motion always mean the same thing across every screen. Rarity colours mean rarity only, team colours mean team only, gold means "go" (H4, G2).
6. **Reveal complexity gradually.** A new player sees few choices; systems appear when they become useful and are introduced by doing, not by reading (P1, K1, K5).
7. **Big, near, in the thumb's reach.** Primary targets at least 48 CSS px, placed along the bottom and side edges where thumbs rest in landscape. Rare and destructive actions go further away (F1, T1-T3).
8. **Forgive.** Reversible actions happen at once and can be undone; only irreversible spends ask for confirmation. Every screen has an obvious way back (H3, H5, H9).
9. **Readable for everyone.** Text at least 12 CSS px (11 only for tiny tags), 4.5:1 contrast for text and 3:1 for icons and controls, nothing conveyed by colour alone, reduce motion replaces motion instead of deleting feedback (A1-A6).
10. **Every movement has a purpose.** Motion explains where things come from and go to, confirms an action, or celebrates an earned moment. No motion for its own sake (M1, Apple HIG).
11. **Satisfying moments follow one recipe:** anticipation, a fast action, an impact that is seen, heard and counted, follow-through, and a settle. The size of the celebration matches the size of the event (M5-M8).
12. **Never block the player.** UI transitions stay within 150-400 ms, any sequence longer than about 1 s can be skipped with a tap, and input during an animation is honoured, not swallowed (R1-R3, M3).

---

## 1. Where we stand: facts from the current code

These are measured facts from `src/ui`, `src/capsule` and `src/app/ui` on 2026-09-28, to ground the plan. They are not a full audit (the UI audit is a separate step).

| Finding | Principle it touches |
|---|---|
| The theme has only two motion tokens (`--ui-ease-out`, `--ui-ease-back`) and no duration tokens. The UI code uses **21 different cubic-bezier curves** and **about 60 different duration values** (90, 120, 140, 160, 180, 200, 220, 240, 260, 300, 320, 420, 520, 560, 600 ms ...). Motion therefore feels slightly different on every screen. | H4 consistency, M2, M3 |
| Reduce motion (the setting and `prefers-reduced-motion`) sets **every** animation and transition to 1 ms (`theme.css` lines 147-163). That also deletes fades and state feedback, which reduce-motion users still need. Apple's guidance is to replace motion with cross-fades, not remove it. | A4, M10 |
| The compact HUD uses **8-9 px text** for card tags, the XP text, medal tags and the Evolve label (`hud.css` about lines 1332, 1341, 2939-3007). Several capsule and class-icon labels are 10 px. On an 844 × 390 phone that is below the Xbox Accessibility Guidelines' handheld minimum. | A2, H8 |
| The theme uses **14 different font sizes** between 8 and 26 px with no type scale token. | G6 hierarchy, H4 |
| Buttons already have 48 px minimum heights and a pressed state (`.ui-btn:active`). This is good and should become the rule for every control. | F1, R1 |
| Colour tokens for rarity, tier and team exist and are colourblind-aware for teams (DESIGN A11). Violet is both a button colour (`--ui-violet`) and the Epic rarity colour; blue is both a button colour and the player's team colour. | H4, G2 |

---

## 2. Usability foundations

### 2.1 Nielsen's ten usability heuristics (H1-H10)

Jakob Nielsen's ten heuristics (1994, refined from a factor analysis of 249 usability problems) are the most used checklist in UX ([NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/), [The Decision Lab](https://thedecisionlab.com/reference-guide/design/nielsens-heuristics)).

| ID | Heuristic | What it means for Ageborn |
|---|---|---|
| H1 | **Visibility of system status.** Keep users informed through appropriate feedback within a reasonable time. | Every tap answers within 100 ms. Gold, income, training queues, power charge, XP to the next age and army size are always readable in battle. In the meta: charges "12/28", capsule tray state, what is equipped, what is new, whether a save succeeded. Lazy-loaded art shows progress, never a frozen screen. |
| H2 | **Match between the system and the real world.** Use the player's words and concepts, not system terms. | We have many invented nouns (Amber, Clay, Dust, Codex, Supply Capsule, War Chest, War Plan, Treasury, Overdrive, Siege, Final Bell). Each needs an icon, a one-line meaning on long-press/hover, and should be introduced one at a time, when first earned. Prefer plain labels on buttons ("Build army", "Upgrade", "Open") over internal names. No ids, enums or debug text visible. |
| H3 | **User control and freedom.** A clearly marked "emergency exit" and undo. | Every screen has Back in the same place (top-left) and the browser/Android back gesture and Esc close the top layer. Equipping and unequipping cards is instant and reversible (undo toast), not confirmed. Skippable sequences (A10) and a pause that never punishes. |
| H4 | **Consistency and standards.** Same words, looks and actions mean the same thing; follow platform and genre conventions (Jakob's law). | One button grammar, one card tile, one currency chip, one info panel, one modal, one set of motion tokens, used everywhere. Follow genre conventions players already know from Clash Royale, Marvel Snap and Candy Crush (tab bar, level map, card tiles with cost top-left, rarity colours). |
| H5 | **Error prevention.** Prevent problems before they happen; confirm only risky actions. | Disable (and explain) impossible actions instead of letting them fail. Confirm only irreversible spends: Dust crafting, reset save, import over a save, Retreat. Show the cost and the result before the spend ("Upgrade: 400 Amber → Lv 5, HP 320 → 352"). Keep destructive buttons small, red and away from the primary button. |
| H6 | **Recognition rather than recall.** Make elements, actions and options visible. | Card tiles show class icon, cost, level, and on long-press "Strong vs / Weak vs" (owner request). The War Plan shows all six equipped units per age at once. The HUD shows scouted enemy cards. Settings show their current value. Icons carry labels except universal ones (gear, close, pause, back). |
| H7 | **Flexibility and efficiency of use.** Accelerators for experts that novices don't see. | Keyboard keys 1-6 for cards and a key for the power on desktop (with key badges that do not cover names), "Open all", quick reveal, auto-fill in the War Plan, "Next battle" straight from Result, the next War Path level one tap from Home. |
| H8 | **Aesthetic and minimalist design.** Every extra unit of information competes with the relevant ones. | DESIGN A15.13's screen budget is this rule. One focal point per screen, secondary info in expandable rows, no decorative text. On a 390 px tall phone every row costs; remove before adding. |
| H9 | **Help users recognise, diagnose and recover from errors.** Plain-language messages that say the problem and a fix. | A denied press says why ("Need 40 gold", "Army full 60/60") next to the shake. Save and import problems say what happened and offer the fix button (as the title banner already does). |
| H10 | **Help and documentation.** Easy to search, focused on the task, concrete steps. | Contextual "i" panels on each system (the A15.3 honesty lines live there), a Codex for cards, tutorial replays. Help is where the question arises, not in a separate manual. |

### 2.2 Norman's principles of interaction (N1-N6)

From Don Norman's *The Design of Everyday Things* ([UX Magazine](https://uxmag.com/articles/understanding-don-normans-principles-of-interaction), [principles.design](https://principles.design/examples/don-norman-s-principles-of-design), [jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/)).

| ID | Principle | Meaning | For Ageborn |
|---|---|---|---|
| N1 | **Affordance** | What an object allows you to do. | Pressable things look pressable: a raised face with a lip and drop shadow that sinks when pressed (the existing `.ui-btn` style). Draggable things (Age Power, cards in the deck builder, stationary structures) look like objects that can be lifted: a card or token with depth, not a flat label. Non-interactive panels are flat and quiet. |
| N2 | **Signifiers** | Signs that show where and how to act. | A ready Age Power "breathes" and shows a short drag hint arrow toward the lane the first times (owner request: drag is the primary interaction). Empty War Plan slots show a dashed outline and a "+" (a slot that invites a card). A claimable Trophy Road node glows; a locked one shows a lock and the unlock condition. "NEW" dots mark unseen items and disappear once seen. |
| N3 | **Mapping** | Controls laid out like their effect. | The tray's card order matches the War Plan slot order. Your base is on the left, your HUD bar is on the left; the enemy's on the right. The War Path runs in one direction (bottom to top or left to right) and the next level is always ahead of the last. The minimap maps 1:1 to the lane. Dragging a power onto the field lands it exactly under the finger (with the ghost). |
| N4 | **Feedback** | Immediate, informative results of every action. | Press state in the same frame, sound on the impact frame, the result visible where the eye is (the card flies into the slot, the coin flies to the counter, the counter bumps). Feedback proportional to importance: a tap on a tab is subtle, a Legendary is huge. |
| N5 | **Constraints** | Limit what can be done to prevent errors. | Only valid drop zones accept a drag (invalid ones tint red and the item returns). A loadout cannot hold a card from another age; the builder only shows cards for the selected age by default. Power drop zones follow `powerZoneClamp`. Buttons that cannot act are disabled with a reason, not hidden (hidden controls break the conceptual model). |
| N6 | **Conceptual model** | The mental model the user builds of how the system works. | The whole game should reduce to one sentence a new player can repeat: **"Beat levels on the War Path, open capsules to get cards, put your best cards in your army, beat harder levels."** Every Home element should belong to one of five verbs: **Play, Open, Build, Customize, Progress.** Anything that does not fit these verbs is a candidate for a sub-screen, not Home. |

### 2.3 Game UX: Celia Hodent's framework (K1-K9)

Celia Hodent (former UX director at Epic Games, author of *The Gamer's Brain*) splits game UX into **usability** (can players play?) and **engage-ability** (is it fun and engaging?) ([IxDF, Game UX twist](https://ixdf.org/literature/article/the-game-ux-twist-usability-principles-for-games), [Medium summary](https://medium.com/design-bootcamp/finding-a-framework-for-ux-in-gaming-key-takeaways-for-understanding-usability-in-celia-hodents-9c0fcfee85f7), [GDC 2017 talk page](https://celiahodent.com/gamers-brain-part-3-ux-engagement-immersion-retention-gdc17-talk/), [GDC 2016 onboarding talk](https://celiahodent.com/gamers-brain-ux-onboarding/), [archive.org video](https://archive.org/details/GDC2016Hodent)).

**Usability pillars**

| ID | Pillar | For Ageborn |
|---|---|---|
| K1 | **Signs and feedback**: does the game tell players what they can do and what happened? | Same as N2 and N4. Every system state has a sign; every action has feedback. |
| K2 | **Clarity**: are signs perceived as intended, and is text legible? | Icons tested at their real size on an 844 × 390 phone; class icons distinct by shape, not only colour; text sizes per A2. Realistic art (owner decision) makes this harder: text over art needs a scrim, outline or panel. |
| K3 | **Form follows function**: can players grasp what something does by looking at it? | Class icons read the role (shield = Heavy, bow = Ranged, wings = Air, pick = Underground, wall = Stationary). The Battle button looks like the most important thing on Home. A capsule looks openable. |
| K4 | **Consistency** across the game and the genre. | Same as H4. |
| K5 | **Minimum workload**, cognitive and physical. | Keep what the player must hold in mind to about **3 items** per step (Hodent's working-memory advice; Cowan's capacity of about 4 chunks, [Cowan 2001](https://philpapers.org/rec/COWTMN), [Journal of Cognition 2024](https://journalofcognition.org/articles/10.5334/joc.387)). Few taps to the common goal: Home → Battle in 1 tap, Home → equip a new card in at most 3. |
| K6 | **Error prevention and recovery.** | Same as H5 and H9. |
| K7 | **Flexibility**: options and accessibility. | Settings for motion, shake, damage numbers, colourblind presets, text size (new), quick reveal, speeds. |

**Engage-ability pillars**

| ID | Pillar | For Ageborn |
|---|---|---|
| K8 | **Motivation**: competence, autonomy, relatedness (self-determination theory; all three independently predict enjoyment and future play, [Ryan, Rigby and Przybylski 2006](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf)). | Competence: clear feedback that you got better (stars on War Path levels, "effective" hit sparks, result recap). Autonomy: real choices (War Plan, stance, upgrades, cosmetics), never nagging. Relatedness: named AI Generals with personality (labelled AI), later ghosts. |
| K9 | **Emotion and game flow**: the difficulty and learning curves; attention decides what is learned. | Teach when the player is paying attention (a pause in battle, after a win), never during a busy moment. One new mechanic per match. Celebrate earned peaks and end sessions on a good note (peak-end rule, [UX Design Institute, laws of UX](https://www.uxdesigninstitute.com/blog/laws-of-ux/)); A15.6 "stopping well" already applies this. |

**Onboarding by doing.** Hodent's onboarding talk and George Fan's Plants vs. Zombies talk (in `feel-ux.md` section 6) agree: learning by doing beats reading, introduce one thing at a time, at most about 8 words on screen, and hint only when the player struggles. For Ageborn: the War Path is the tutorial; level 1 is the training match, and each early level unlocks exactly one tool (turret, evolve, power drag, stance, War Plan).

### 2.4 Perception: Gestalt, hierarchy and attention (G1-G7)

Gestalt principles describe how the brain groups what it sees ([IxDF](https://ixdf.org/literature/topics/gestalt-principles), [NN/g proximity](https://www.nngroup.com/articles/gestalt-proximity/), [UX Tigers](https://www.uxtigers.com/post/gestalt-principles)).

| ID | Principle | For Ageborn |
|---|---|---|
| G1 | **Proximity**: things close together belong together. | A card's cost, level and class sit on the card, not beside it. The gold counter sits next to the cards it pays for. Leave clearly more space between groups than inside them (for example 16 px between groups, 6-8 px inside). |
| G2 | **Similarity**: things that look alike are read as alike. | Reserve colours: rarity colours (Common grey, Rare cyan, Epic violet, Legendary gold) only for rarity; team blue/orange only for team; capsule tier colours only for tiers. Buttons use a separate grammar (section 5.3). Today violet and blue overlap; fix in the plan. |
| G3 | **Common region**: things inside one border are one group. | Each Home cluster (War Path, capsule tray, army, progress) lives in its own panel. In the HUD, your side and the enemy side are two regions. |
| G4 | **Continuity**: things on a line or curve are related. | The War Path is literally a path: nodes on a continuous line make "next" obvious. Trophy Road and Conquest ladders follow the same rule. |
| G5 | **Figure and ground**: the eye separates foreground from background. | Menus over animated or realistic backdrops need a dimmed, blurred or darkened ground so panels read as figure. Modals get a scrim. Backdrops stay low contrast (A11 already says this for the lane). |
| G6 | **Visual hierarchy**: size, contrast, colour, position and motion set reading order. | Per screen: 1 primary (largest, gold, bottom-right), 2-3 secondary, the rest tertiary. A type scale of 5-6 steps instead of 14 sizes. Squint test: blur the screenshot; the primary action must still be the first thing you see. |
| G7 | **Isolation (Von Restorff)**: the one different item is noticed and remembered, but if everything is highlighted, nothing is ([uxuiprinciples](https://uxuiprinciples.com/en/principles/von-restorff-effect)). | At most one pulsing or glowing call to action per screen. "NEW" and "!" badges only where there is something to do; clear them promptly. |

### 2.5 Laws of speed and choice (F1-F4, R1-R3)

| ID | Law | Source | For Ageborn |
|---|---|---|---|
| F1 | **Fitts's law**: time to hit a target grows with distance and shrinks with size, MT = a + b·log2(2D/W). | Fitts 1954 ([Wikipedia](https://en.wikipedia.org/wiki/Fitts's_law), [NN/g](https://www.nngroup.com/articles/fitts-law/)) | Frequent targets big and near the thumbs: tray cards (72/88 px), the power button, Battle, Next battle. Screen edges and corners are "infinitely deep" for a mouse; on touch they are where thumbs already are. Make the whole tile tappable, not just its label. |
| F2 | **Hick's law**: decision time grows with the logarithm of the number of choices. | Hick and Hyman ([Wikipedia](https://en.wikipedia.org/wiki/Hick%27s_law), [The Decision Lab](https://thedecisionlab.com/reference-guide/design/hicks-law)) | Home has one dominant action and at most about 5 navigation destinations. Mode select shows the recommended mode first. The deck builder filters by age and class so the visible choice is small. Settings grouped into short sections. |
| F3 | **Working-memory limits**: about 4 chunks (Cowan), Miller's 7 ± 2 with chunking. | See K5 | A tutorial beat teaches one thing with at most 3 elements to notice. Result shows at most 3 staged steps (A15.13 already). |
| F4 | **Goal-gradient effect**: effort rises as the goal gets near. | ([UX Design Institute](https://www.uxdesigninstitute.com/blog/laws-of-ux/)) | Progress bars (War Path stars, card copies, War Chest) show the next goal clearly and fill visibly. Honesty rule: never fake progress or add countdown pressure (A15.3). |
| R1 | **0.1 s** feels instantaneous; **1 s** keeps the flow of thought; **10 s** is the limit of attention. | Nielsen, from Miller 1968 ([NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/)) | Press feedback in the same frame (≤ 100 ms). Screen changes finish in well under 1 s. Anything near 10 s (first Legendary walkout) must be skippable after the first time, as A10 says. |
| R2 | **Doherty threshold**: productivity soars when system and user respond within 400 ms. | Doherty and Thadani, IBM Systems Journal 1982 ([Laws of UX](https://lawsofux.com/doherty-threshold/), [daverupert.com](https://daverupert.com/2015/06/doherty-threshold/)) | Navigation transitions ≤ 400 ms. If a screen needs to load (lazy art), show the shell immediately and stream content in. |
| R3 | **Animation duration**: 100-400 ms for most UI animation; 500 ms starts to feel like a drag; entering slightly slower than exiting (300 ms in, 200-250 ms out). | NN/g, Executing UX animations ([NN/g](https://www.nngroup.com/articles/animation-duration/)); Val Head: 200-500 ms ([valhead.com](https://valhead.com/2016/05/05/how-fast-should-your-ui-animations-be/)) | Motion tokens in section 6.3. |

### 2.6 Structure: progressive disclosure, recognition, errors (P1-P4)

| ID | Principle | For Ageborn |
|---|---|---|
| P1 | **Progressive disclosure**: show the essentials first, advanced options on request or later ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)). Two levels are usually enough; deeper nesting gets lost. | Card tile → long-press tooltip (class, Strong/Weak vs) → card detail (full stats). Result: 3 steps plus one expandable summary row. Systems unlock along the War Path, each with a one-screen intro at the moment it appears, never earlier. Locked tabs show what unlocks them instead of vanishing. |
| P2 | **Staged disclosure over time**: a new player's Home is simpler than a veteran's. | Home at first launch: War Path and Battle only. Capsule tray after the first capsule, army after match 3, Customize after the first cosmetic, and so on. A new element arrives with a short "unlock" animation and a signifier, so the player notices it (G7). |
| P3 | **Recognition over recall** (H6). | See H6. |
| P4 | **Undo over confirm.** Confirm dialogs train people to click "Yes" without reading; undo keeps them fast and safe. | Equip, unequip, swap, reorder, cosmetic choices: instant with undo. Confirm only irreversible spends and data loss. |

---

## 3. Touch, layout and ergonomics (T1-T6)

| ID | Rule | Source | For Ageborn |
|---|---|---|---|
| T1 | **Target size.** Apple 44 × 44 pt, Material 48 × 48 dp, WCAG 2.2 AAA 2.5.5 44 × 44 CSS px, AA 2.5.8 24 × 24 CSS px or enough spacing. | ([WCAG 2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html), [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [CVS Health summary](https://github.com/cvs-health/android-view-accessibility-techniques/blob/main/doc/basics/MinimumTouchTargetSize.md)) | Our rule: **48 CSS px** for every control, **44 px** absolute minimum for rare controls (close, info), at least **8 px** between adjacent targets. Tiny visuals (an "i" icon) get an invisible 44-48 px hit area. The battle tray keeps 88/72 px cards; with six cards the tray must still fit about 756 px of usable width (A9.2), so plan it with the six-card layout. |
| T2 | **How phones are held.** Hoober observed 1,300+ people: 49% one-handed, 36% cradled, 15% two-handed; two thirds of one-handed grips use the right hand. | ([UXmatters, Hoober 2013](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php), [Smashing, thumb zone](https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/)) | Ageborn is played in landscape with two hands. The comfortable zones are the lower halves of the left and right edges; the top centre is the hardest to reach ([Parachute](https://parachutedesign.ca/blog/thumb-zone-ux/), [WANDR](https://www.wandr.studio/blog/mobile-game-ui-design)). |
| T3 | **Place by frequency.** Primary actions low and near the thumbs; rare or destructive actions in the stretch zone for intentional friction. | ([WANDR](https://www.wandr.studio/blog/mobile-game-ui-design)) | Battle / Play / Next level: bottom-right. Navigation tabs: bottom edge. Back: top-left (rare, conventional). Settings gear and pause: top-right (rare). In battle: cards along the bottom, the power button bottom-right so the drag goes up-left onto the lane along the natural thumb arc; Evolve near the left thumb. |
| T4 | **Safe areas and notches.** | CSS `env(safe-area-inset-*)` | Nothing interactive under the notch or the home indicator; test at 844 × 390 with insets. |
| T5 | **Drag needs a tap alternative.** WCAG 2.2 AA 2.5.7: any drag operation must also work with a single pointer without dragging, unless dragging is essential. | ([Appt](https://appt.org/en/guidelines/wcag/success-criterion-2-5-7), [WCAG.com](https://www.wcag.com/developers/2-5-7-dragging-movements/)) | Owner's power rule already fits: drag is primary, tap starts aim mode then tap the field. The deck builder: drag a card into a slot or tap card then tap slot (or tap to auto-place). Stationary structures: same pattern. |
| T6 | **Direct manipulation rules** (our synthesis of N1-N5 for drags). | | Lift on press (scale 1.05-1.08, shadow grows, 60-100 ms); the item follows the finger 1:1 with no lag; valid drop zones light up the moment the drag starts; the target under the finger highlights and magnetically snaps within about 24 px; invalid release returns the item along its path (ease-out 200-250 ms); a successful drop lands with a small squash and a sound. Dragging over the HUD or back to the origin cancels. Long-press opens info instead of drag only where drag is not the action (tooltips on tray cards). |

**Hover is a bonus, not a channel.** Desktop hover can preview info, but everything essential is reachable by tap or long-press, because phones have no hover.

**iOS press states.** On iOS Safari, `:active` styles only show reliably with a touch listener or when using pointer events; the plan should use a shared `pressed` state driven by `pointerdown/pointerup` so every control shows its press in the same frame.

---

## 4. Accessibility (A1-A8)

Sources: WCAG 2.2, the Game Accessibility Guidelines (GAG, [basic list](https://gameaccessibilityguidelines.com/basic/), [full list](https://gameaccessibilityguidelines.com/full-list/)) and the Xbox Accessibility Guidelines (XAG, [101 text display](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101)). GAG ranks guidelines as Basic (easy, wide reach), Intermediate and Advanced.

| ID | Rule | For Ageborn |
|---|---|---|
| A1 | **Contrast.** Text 4.5:1 (3:1 for large text, ≥ 18.66 px bold or 24 px), WCAG 1.4.3. Icons, control borders, focus rings and meaningful graphics 3:1 against their neighbours, WCAG 1.4.11 ([W3C 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast), [TestParty](https://testparty.ai/blog/color-contrast-requirements)). | Check `--ui-muted` and `--ui-dim` text on panels, and every label over game art. Text over art or realistic backdrops gets a dark outline, text shadow or panel. Disabled controls are exempt, but must still be recognisable as disabled (not invisible). |
| A2 | **Text size.** GAG Basic: easily readable default size. XAG 101 handheld: at 1280 × 720 at least 9 px tall text, recommended 12 px or more; at 1920 × 1080 at least 14 px, recommended 18 px ([XAG 101](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101), [GAG font size](https://gameaccessibilityguidelines.com/use-an-easily-readable-default-font-size/)). | Our recommendation, in CSS px on an 844 × 390 phone: body and labels ≥ 14, secondary ≥ 12, tiny tags (NEW, key badges) ≥ 11 bold with outline, never below. A type scale of 11 / 12 / 14 / 16 / 20 / 28 (plus display sizes for banners). Add a text-size setting (100% / 115% / 130%) later. The current 8-9 px HUD labels fail this. |
| A3 | **Never colour alone** (GAG Basic; about 1 in 12 men and 1 in 200 women have red-green colour vision deficiency, [Colour Blind Awareness](https://www.colourblindawareness.org/colour-blindness/types-of-colour-blindness/), [Venngage](https://venngage.com/blog/color-blind-design/)). | Rarity: colour plus gem shape or label. Class: icon shape plus label. Valid/invalid drop: tint plus icon (check/cross) plus the item's behaviour. Affordable card: glow plus full saturation versus greyed cost with a lock. Teams: the A11 redundant cues. Test with the deuteranopia, protanopia and tritanopia emulation (section 9). |
| A4 | **Reduce motion, done right.** WCAG 2.3.3 (AAA): motion triggered by interaction can be disabled unless essential ([W3C 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)). Apple: make motion optional and replace it with cross-fades or static transitions ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion)). | Reduce motion removes movement (slides, zooms, parallax, bounces, shake, flying coins, camera moves) but **keeps** state feedback: short cross-fades (about 150 ms), colour and glow changes, counters that update, rarity pre-signals. Replace the current "everything to 1 ms" rule. Honour both the OS preference and the in-game setting (already wired). |
| A5 | **Flashing.** WCAG 2.3.1 (A): nothing flashes more than three times per second unless below the flash thresholds ([W3C 2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html)). GAG Basic: avoid flickering images. | Low-HP vignette at 1.2 s period (fine). Capsule climb flashes, power flashes and hit flashes: never more than 3 full-screen flashes in any second, and large flashes are soft (not pure white at full strength) with reduce motion softening further. |
| A6 | **Sound is never the only channel.** | Every audio cue (`alert_base`, `ui_deny`, enemy evolve) has a visual equivalent. Separate volume sliders already exist. |
| A7 | **Cognitive load and time.** GAG: avoid time pressure in menus, allow speed changes, practice modes. | No countdowns or timers in menus (already a rule, A15.13). Battle speed control and pause. The War Path lets players replay beaten levels as practice. |
| A8 | **Interactive elements large and well spaced**, especially on touch screens (GAG Basic). | T1. |

---

## 5. Game UX for Ageborn's meta (information architecture)

### 5.1 The conceptual model and the hub

- **One sentence, five verbs** (N6): Play, Open, Build, Customize, Progress.
- **Home is a hub, the War Path is its centre.** Owner direction (decisions.md, 2026-09-28 evening): the War Path level map is the centrepiece of Home from the first minute, the training match is level 1, the next level is always one tap away. Saga maps work because the next step is always visible on a continuous path, the map visibly changes as you progress, and a "back to my level" button appears when you scroll away ([UX Collective on Candy Crush](https://uxdesign.cc/does-candy-crush-have-a-good-ux-3c1a865d24e), [Game Developer](https://www.gamedeveloper.com/design/rethinking-progression-in-mobile-puzzle-games)). Honesty note: we copy the map's clarity, not its monetised "pinch" levels.
- **Genre convention for navigation** (H4, Jakob's law): Clash Royale and Brawl Stars use a persistent tab bar with Battle in the centre. For landscape Ageborn, the recommendation is a **bottom tab bar of at most 5 tabs** mapped to the verbs (for example Army, Customize, War Path/Battle in the centre and default, Progress, Profile), with capsules on Home. The UI plan decides the exact set; the principle is: a persistent, always-visible, labelled navigation with the current tab marked, and no feature reachable only through a nested screen.
- **Every sub-screen has one exit** to where you came from, and the transition direction shows the hierarchy (section 6.4).

### 5.2 Onboarding along the War Path

- Level 1 is the training match; each of the next levels introduces one tool, taught by doing, with at most 8 words on screen and a hand or arrow signifier (K9, F3).
- A new Home element appears the moment it becomes useful (P2), with a short unlock animation and a one-tap intro.
- Contextual hints fire only on struggle ("Their turret shreds melee. Try the Slinger.").
- The player plays within 60 s of first launch (`feel-ux.md` section 6).

### 5.3 A button and colour grammar

Clash Royale uses yellow for the most important actions (Battle, Request, Use), green for secondary positive actions (Donate, Upgrade, Buy), red for warnings and blue for background ([Rookies breakdown](https://www.therookies.co/blog/education/game-design-ux-best-practices-detailed-breakdown-of-clash-royale), [Górnicki](https://gornicki.me/blog/Bd87/ux-in-clash-royale-part-3)). Our recommended grammar, using existing tokens:

| Role | Token | Used for | Never used for |
|---|---|---|---|
| Primary "go" | gold | Battle, Play level, Open, Claim, Next battle; exactly one per screen | anything secondary |
| Positive / progress | green | Upgrade, Equip, Confirm | navigation |
| Neutral / navigation | plain (light) or panel | Back, tabs, filters, Later, Cancel | a primary action |
| Destructive / deny | red | Reset, Retreat, Sell, denied press | anything else |
| Reserved: rarity | common/rare/epic/legendary | rarity frames, gems, reveal glows | buttons, team |
| Reserved: team | team-me / team-foe | battle sides, HP bars, VS | buttons, rarity |
| Reserved: capsule tier | tier-* | capsule bodies and tier labels | buttons, rarity |

Violet buttons collide with Epic, and blue buttons collide with the player's team colour; retire them as button colours or make them clearly different (for example a neutral slate for secondary buttons).

### 5.4 Rewards and emotion (honest)

- Peak-end rule: people judge an experience by its peak and its end. Make the earned peaks (a win, a Legendary, an evolve, a War Path boss) the most polished moments, and end each session on a calm, positive Result (A15.6).
- Anticipation is honest: a rarity pre-signal before a reveal, never a faked near miss (A10, A15.3).
- Rewards are staged (at most 3 steps, A15.13) and skippable. Counters tick up; items fly to where they are stored so the player learns where things go (spatial continuity, M4).

---

## 6. Motion design

### 6.1 What motion is for (M1)

Apple's HIG: add motion purposefully, support the experience without overshadowing it; gratuitous motion distracts and can make people feel disconnected; make motion optional ([Apple HIG, Motion](https://developer.apple.com/design/human-interface-guidelines/motion)). Issara Willenskomer's "UX in Motion" manifesto: motion in UI exists to support usability (relationships between objects, continuity, hierarchy), not decoration; his 12 principles are easing, offset and delay, parenting, transformation, value change, masking, overlay, cloning, obscuration, parallax, dimensionality, and dolly and zoom ([UX in Motion manifesto](https://medium.com/ux-in-motion/creating-usability-with-motion-the-ux-in-motion-manifesto-a87a4584ddc)).

Every animation in Ageborn must have at least one of these jobs; if it has none, cut it:

1. **Feedback**: confirm an input (press, drop, deny).
2. **Continuity**: show where something came from or went (card to slot, coin to counter, tile to detail, tab to tab).
3. **Hierarchy and attention**: direct the eye to the one thing that matters now (the next War Path node, a ready power).
4. **State change**: show that something changed (locked to unlocked, charging to ready, Lv 4 to Lv 5).
5. **Celebration**: mark an earned peak (win, rare reveal, evolve, level complete), scaled to its importance.
6. **Life**: slow ambient idle that makes the world feel alive (backdrops, idle units, a breathing Battle button), always low amplitude and never competing with 1-5.

### 6.2 Disney's twelve principles, applied to Ageborn's UI (M2)

The principles come from Thomas and Johnston's *The Illusion of Life* (1981) ([Adobe](https://www.adobe.com/creativecloud/animation/discover/principles-of-animation.html)); IxDF shows how they transfer to UI ([IxDF](https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design)). Willenskomer argues they are not enough on their own for UX ([Disney is dead](https://medium.com/ux-in-motion/ui-animation-principles-disney-is-dead-8bf6c66207f9)), so we use them for the *feel* and section 6.1 for the *purpose*.

| Principle | In Ageborn's UI |
|---|---|
| **Squash and stretch** (keep volume) | Button press: face squashes to 0.96 × 1.0 height with the lip collapsing; release overshoots to 1.03 and settles. A capsule landing squashes. A counter bumps (1.15 → 1) when value arrives. Keep volume: scaleX ≈ 1/scaleY. |
| **Anticipation** | A tiny wind-up before big actions: the Battle button dips before the screen flies away; a capsule shakes before it bursts; a card pulls back 4-6 px before flying into its slot; the upgrade bar charges before the level number flips. 50-150 ms for UI, longer only for earned reveals. |
| **Staging** | One thing moves at a time where the eye should be. Dim or blur everything else during reveals and level completes. Do not start a second animation elsewhere while the player watches the first. |
| **Straight ahead vs pose to pose** | UI uses pose to pose: defined start and end states with tweens between; particles and confetti are "straight ahead" (simulated). |
| **Follow-through and overlapping action** | Panels overshoot slightly and settle; a card's glow and shine trail its movement by 40-80 ms; ribbons, flags and banner tails settle after the banner stops. Children of a moving container arrive a beat after the container (parenting). |
| **Slow in, slow out (easing)** | Nothing in the UI moves linearly except spinners and progress fills tied to real time. Entering: decelerate. Exiting: accelerate. Moving on screen: standard (ease in-out). See tokens in 6.3. |
| **Arcs** | Flying coins, gems, cards and XP sparkles travel on curved paths (quadratic Bézier with the control point above the straight line), not straight lines. |
| **Secondary action** | Small supporting motion that adds life without stealing focus: the capsule's rings spin while it charges; stars twinkle on a completed War Path node; the Battle button's highlight sweeps every few seconds. |
| **Timing** | Weight through duration: light things (chips, toggles) 100-150 ms; panels 250-320 ms; heavy things (the capsule, a boss node, a base upgrade) longer with a hold on impact. |
| **Exaggeration** | Reserve big exaggeration for peaks (Legendary, evolve, level complete, base upgrade). Everyday UI is restrained. |
| **Solid drawing** | Consistent light direction and depth in UI art: buttons, panels and cards share one light source (top-left) and one shadow style, matching the realistic art direction's lighting. |
| **Appeal** | Rounded, readable shapes, a consistent style, and motion with personality that fits the game's voice. |

### 6.3 Motion tokens (M3): duration and easing

Sources: NN/g (100-400 ms, exits shorter than entrances), Material Design 3 (duration tokens from short1 = 50 ms to extra-long; emphasized easing `cubic-bezier(0.2, 0, 0, 1)`; emphasized decelerate for entering, emphasized accelerate for exiting; large expressive transitions 300-700 ms) ([M3 easing and duration](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs), [M3 motion](https://m3.material.io/styles/motion/overview/how-it-works)), Material's older guidance of 200-300 ms on phones, about 30% longer on tablets and 30% shorter on watches ([M1 duration and easing](https://m1.material.io/motion/duration-easing.html)).

Recommended token set for `src/ui/theme.css` (our recommendation; the existing two curves are kept):

| Token | Value | Use |
|---|---|---|
| `--ui-dur-press` | 70 ms | press down (scale/lip), must start within the same frame |
| `--ui-dur-release` | 140 ms | release with a small overshoot (`--ui-ease-back`) |
| `--ui-dur-micro` | 150 ms | hover, toggles, chips, tab indicator, fades in reduce motion |
| `--ui-dur-small` | 220 ms | tooltips, popovers, toasts in, small elements appearing |
| `--ui-dur-medium` | 300 ms | modals in, panels, screen transitions on phones |
| `--ui-dur-large` | 400 ms | full-screen transitions on desktop, big moves across the screen (upper limit for navigation) |
| exit rule | about 0.7 × the enter duration | modals out 200 ms, toasts out 160 ms |
| `--ui-stagger` | 40 ms per item, total stagger ≤ 240 ms | lists, grids, reward rows, fanned cards |
| `--ui-dur-count` | 400-900 ms (by size of the change) | number count-ups |
| `--ui-dur-celebrate` | 600-1,500 ms per beat | earned moments only, always tap-to-skip |
| `--ui-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` (M3 emphasized) | moves on screen |
| `--ui-ease-enter` | `cubic-bezier(0.05, 0.7, 0.1, 1)` (M3 emphasized decelerate) | things arriving |
| `--ui-ease-exit` | `cubic-bezier(0.3, 0, 0.8, 0.15)` (M3 emphasized accelerate) | things leaving |
| `--ui-ease-out` | existing `cubic-bezier(0.22, 1, 0.36, 1)` | general decelerate |
| `--ui-ease-back` | existing `cubic-bezier(0.34, 1.56, 0.64, 1)` | pops, lands, bumps (overshoot) |
| loops | period ≥ 1.6 s, amplitude small | idle breathing, glows; at most one attention loop per screen |

Rule: no new ad hoc curves or durations in CSS or TS; add a token if something truly needs a new one. The same values are exported for Pixi/TS tweens (capsule, HUD) so DOM and canvas motion feel the same.

### 6.4 Choreography and spatial continuity (M4)

Material's motion system gives four transition patterns ([M2 motion system](https://m2.material.io/design/motion/the-motion-system.html), [M3 transitions](https://m3.material.io/styles/motion/transitions/applying-transitions)) and recommends staggering new surfaces and keeping one clear focal point ([Material choreography](https://material.io/archive/guidelines/motion/choreography.html)).

| Pattern | In Ageborn |
|---|---|
| **Container transform** (an element grows into the next screen) | Card tile → Card detail; War Path node → level preview; capsule in the tray → capsule show. Back reverses it into the same tile. |
| **Shared axis X** (peers side by side) | Tabs (age tabs in the War Plan, Collection tabs, Customize categories): outgoing slides 24-32 px and fades, incoming slides in from the tab's side. Direction matches the tab's position. |
| **Shared axis Y** | Scrolling maps (War Path, Trophy Road, Conquest) and moving to the next node: the camera pans along the path. |
| **Shared axis Z** (parent → child) | Home → sub-screen: incoming scales 0.96 → 1 and fades in, outgoing scales 1 → 1.04 and fades out; Back reverses. |
| **Fade through** (unrelated screens) | Home → Battle loading/VS, Settings. |
| **Stagger** | Grid items, reward rows and fanned cards arrive in reading order at 40 ms steps, capped at 240 ms total. |
| **One focal point** | While a container transforms or a reward flies, everything else holds still or dims. |

Other rules:

- **Interruptible.** A tap during a transition either completes it at once or retargets it; input is never swallowed. Only staged rewards may hold input, and a tap skips to the end state (A10, A15.13).
- **Performant.** Animate only `transform` and `opacity` (and filters sparingly) so the DOM overlay stays at 60 fps on phones; never animate layout properties (width, height, top, left) in lists.
- **The simulation owns battle timing.** UI motion never changes gameplay timing (CLAUDE.md, DESIGN B5).

### 6.5 Juice for the interface (M5-M8)

"Juice it or lose it" (Jonasson and Purho, GDC Europe 2012): a juicy game gives "tons of cascading action and response for minimal user input" through tweening, squash and stretch, particles, sound and small surprises ([GDC Vault](https://www.gdcvault.com/play/1016487/juice-it-or-lose), [YouTube](https://www.youtube.com/watch?v=Fy0aCDmgnxg), [Rob Miller's notes](https://roblog.co.uk/2024/03/juicy-games/)). Nijman's "Art of Screenshake" (Vlambeer, INDIGO 2013) adds hit pause ("sleep"), knockback, permanence, camera kick and bass ([video](https://www.youtube.com/watch?v=AJdEqssNZ-U), [archive.org](https://archive.org/details/the-art-of-screenshake)). The caveats in `feel-ux.md` section 1 apply: juice raises appeal but must never hide state, and effects should not outlast their meaning.

**M5. The satisfying-moment recipe.** Every important UI moment is built from the same five beats:

| Beat | Time | What happens |
|---|---|---|
| 1. Anticipation | 50-150 ms (UI), up to 1.5 s for earned reveals | wind-up, charge, shake, light leaking, a rising sound |
| 2. Action | 100-300 ms | the fast move: fly, burst, flip, stamp; ease-in into the contact |
| 3. Impact | 40-120 ms hold | the moment of contact: a short hold (UI hitstop), flash, particle burst, the sound's transient, the number changing, a small screen kick for big moments only |
| 4. Follow-through | 150-300 ms | overshoot and settle (`--ui-ease-back`), glow trailing, secondary elements catching up |
| 5. Residue | ≤ 1 s | the lasting trace: counter settled, "+1" chip fading, sparkle, the new state clearly visible |

Audio lands on the impact frame, not the animation start (`feel-ux.md` section 3). The size of every beat scales with the importance of the event (M8).

**M6. Standard juicy UI building blocks** (build once, reuse everywhere):

| Block | Spec (our recommendation) |
|---|---|
| **Press** | down in 70 ms: scale 0.96, lip collapses 3-5 px, face darkens slightly, `ui_tap` sound; release in 140 ms with overshoot to 1.02. Denied press: red flash, 2-frame shake, `ui_deny`, and a reason label (H9). |
| **Count-up** | numbers tick from old to new over 400-900 ms, ease-out, with a rising tick sound every few steps and a 1.15 → 1 bump on arrival. Tap skips to the final value. Never count down a reward. |
| **Fly-to-counter** | 3-12 tokens (coins, Amber, gems, XP sparks) burst from the source, then fly on arcs to the counter over 350-600 ms, staggered 30-60 ms; the counter bumps on each arrival and the sum shows once ("+120"). |
| **Card to slot** | lift (1.06, shadow), fly on an arc 250-320 ms, land with squash 0.94 → 1.03 → 1, slot rim flash in the card's rarity colour, `card_place` sound; the replaced card flies back to the collection grid. |
| **Unlock** | lock shakes (anticipation), cracks, bursts into pieces, the item goes from silhouette to full colour (A10's silhouette fill), label "Unlocked". |
| **Level up / upgrade** | a charge bar fills (anticipation), burst on the card, level number flips (old number drops, new one pops in), stat lines tick up with green "+12" chips, card frame gets a short shine sweep; `upgrade` sound. |
| **Progress fill** | bars fill with ease-out and a bright leading edge; a threshold crossing gets a small burst and the milestone icon pops. |
| **Attention pulse** | a slow breathing glow (period ≥ 1.6 s, low amplitude) on the one thing to do next; stops after it is used. Never a blinking flash (feel-ux: players hated Age of War's flashing upgrade reminder). |
| **Toast** | slides in 220 ms from the nearest edge, holds 2-3 s, fades out 160 ms; an Undo button when the action is reversible. |

**M7. Satisfying moments in Ageborn to design explicitly** (each gets the M5 recipe and a Playwright capture in review):

1. Pressing Battle / Play on the War Path (button anticipation → shared-axis into VS).
2. War Path level complete: stars stamp in one by one with rising pitch, the path draws itself to the next node, the camera pans, the next node lifts and starts its attention pulse with "Play" (the next step one tap away). Boss nodes get a bigger version.
3. Equipping a card in the deck builder (M6 card to slot) and seeing the army's average level or counter coverage update with a count-up.
4. Upgrading a card (M6 level up) and a base upgrade (owner: much more satisfying; the base rebuild uses the A11 evolve morph language: squash, light pillar, rebuild, dust).
5. Capsule opening (A10 storyboard; owner: much more satisfying) with the M5 beats per strike and per card.
6. Rewards on Result (fly-to-counter, count-up, one progress bar fill).
7. Unlocking a new system or mode on Home (M6 unlock plus a one-tap intro).
8. Equipping a cosmetic in Customize: instant live preview on the base or unit, a small "equipped" stamp.
9. In battle UI: a card becoming affordable (glow ramps in 150 ms), training complete (radial fill completes with a tick and the card pops), the power becoming ready (charge ring closes with a chime, then the breathing pulse), dragging and landing a power (ghost, valid tint, release anticipation, impact per A12), Evolve (A12's biggest regular moment).

**M8. Proportion and restraint.** A juice budget per event class:

| Event class | Examples | Max duration | Allowed extras |
|---|---|---|---|
| Micro | tab, toggle, filter, scroll | ≤ 200 ms | press, fade/slide |
| Small | equip, claim a quest, collect Amber | ≤ 600 ms | fly-to-counter, bump, small sparkle, sound |
| Medium | upgrade, level complete, unlock, Epic reveal | ≤ 2 s, skippable | burst, count-up, stamp, dim background |
| Large | Legendary walkout, first win, boss beaten, base upgrade max | ≤ 10 s, skippable after the first time | full staging, spotlight, screen kick, music sting |

Rules: never two medium or larger celebrations at the same time (queue them); repeated events get shorter (the first Legendary walkout is long, later ones 3 s, as A10 says); the quick reveal setting shortens medium and large moments without removing honest pre-signals.

### 6.6 Reduce motion variants (M10)

For every animated component, define its reduced variant at the same time:

| Full motion | Reduced |
|---|---|
| Slide, zoom, container transform | 150 ms cross-fade |
| Squash, overshoot, bounce | no scale change; a colour or glow change instead |
| Fly-to-counter | counter updates with a 150 ms fade of the new value and the "+N" chip |
| Camera pan along the War Path | instant jump with a fade |
| Screen kick, shake, parallax | off |
| Looping attention pulse | static highlight (outline or glow) |
| Capsule strikes and reveals | cross-fades; rarity pre-signals and reveal order unchanged (A10) |

---

## 7. Screen-by-screen implications

Short guidance per screen for the UI plan. IDs refer to the principles above.

| Screen | Key principles | Guidance |
|---|---|---|
| **Home / War Path** | N6, G4, F2, T3, P2, M7.2 | The map fills the screen; the current node is centred on arrival and pulses; the Play button for it sits bottom-right. Around it, only the five verbs (tab bar) and the capsule tray. First launch shows only the map and Play. New elements appear by unlock animation. A "back to my level" button appears when scrolled away. |
| **Battle HUD** | H1, H6, F1, T3, T5, A2, A3 | Six cards along the bottom with class icon, cost, queue and radial fill; affordability shown by glow plus saturation plus cost colour. Power bottom-right: ready state breathes and shows a drag hint the first times; drag is primary, tap to aim is the alternative. All labels ≥ 11 px. Nothing covers the lane band. Denied presses say why. |
| **War Plan (deck builder)** | H6, N2, N5, T5, T6, P4, M6 | Age tabs across the top (shared axis X), the six unit slots, turret slots and the power slot as big targets with dashed empty states and "+". Collection below/beside, filtered to the age by default, with class filter chips. Drag or tap-tap to place; instant, with undo; replaced card flies back. The counter triangle legend and advisor warnings sit next to the slots (recognition). An "Army ready" state is visible without extra taps. |
| **Collection / Card detail** | P1, G2, A3, M4 | Grid with class icon, rarity frame plus gem shape, copies bar; unowned as silhouettes. Tile → detail by container transform. Detail shows class, Strong vs / Weak vs, stats with next-level deltas, Upgrade as the single primary button. |
| **Capsule show** | M5, M8, A5, honesty | A10 storyboard with the M5 beats, 3-flash limit, skip rules, honesty lines. Summary: one primary ("Open next" or "Done") and "Equip" per new card. |
| **Result** | H8, M6, peak-end | A15.13's three steps, count-ups and fly-to-counter, then one primary ("Next level" on the War Path, or "Next battle"). Nothing cut off on phones. |
| **Customize** | H6, G3, M7.8 | Categories as tabs; a large live preview (base with flag, decorations, skin) that updates instantly on tap; locked items show how to earn them; completion counts per collection. |
| **Mode select / VS / Conquest / Trophy Road** | F2, G4, H4 | Recommended option first and largest; the same node, path and reward visuals as the War Path so the player recognises them. AI labels everywhere (A7.1). |
| **Settings / Pause** | H3, H4, K7 | Grouped sections, current values visible, the same controls as elsewhere. Add text size. Retreat is red, small and away from Resume. |

---

## 8. Checklists

Copy the relevant list into a review or a PR description and tick it.

### 8.1 Screen checklist (every screen, every change)

- [ ] **5-second test:** a new player can say what the screen is for and what to do next (H8, N6).
- [ ] Exactly **one primary button**, gold, visually strongest, in the bottom-right thumb zone where possible (G6, G7, T3).
- [ ] Squint/blur test: the primary action and the main content still read first (G6).
- [ ] Back is top-left and works with the browser/Android back gesture and Esc (H3).
- [ ] Every element belongs to a visible group; spacing between groups is clearly larger than within (G1, G3).
- [ ] Colours follow the grammar: rarity, team and tier colours only for their meaning (G2, 5.3).
- [ ] No more than about 5 navigation choices and about 7 options visible at once in a picker (F2).
- [ ] Nothing the player needs to decide here lives only on another screen (H6).
- [ ] Every invented term on screen has an icon and an info panel or tooltip (H2).
- [ ] Locked things say how to unlock them; empty states say what to do (N2, H10).
- [ ] New or ready things are marked, and marks clear once seen or used; at most one attention pulse (G7).
- [ ] Fits 844 × 390 with safe areas and 1280 × 720 without clipping, overlap or horizontal scroll (T4).
- [ ] Respects the A15.13 budget: no new Home widget or Result step without removing one; no timers or backlog counts.
- [ ] All strings through i18n, with room for Danish (about 30% longer).

### 8.2 Control and interaction checklist

- [ ] Hit area ≥ 48 CSS px (≥ 44 for rare controls), ≥ 8 px from the next target (T1).
- [ ] Looks interactive (raised, labelled) and non-interactive things do not (N1, K3).
- [ ] Pressed state starts in the same frame; the result is visible within 100 ms (R1, N4).
- [ ] Disabled state is visibly different and explains why on tap (H5, H9).
- [ ] Reversible actions are instant with undo; only irreversible spends confirm (P4, H5).
- [ ] Cost and outcome are shown before a spend (H5).
- [ ] Drag has a tap alternative; valid zones light up; invalid drops return; release over the HUD or the origin cancels (T5, T6, N5).
- [ ] Long-press or hover gives info on cards and icons; nothing essential is hover-only.
- [ ] Desktop keyboard: Esc closes, Enter confirms the primary, battle keys shown as badges that do not cover names (H7).
- [ ] Input during an animation is honoured (skip or retarget), never swallowed (M4).

### 8.3 Animation checklist (every animation)

- [ ] It has a job: feedback, continuity, attention, state change, celebration or life (M1). If none, cut it.
- [ ] Uses motion tokens only; no ad hoc duration or curve (M3).
- [ ] UI transitions 150-400 ms; exits about 30% shorter than entrances (R3, M3).
- [ ] Enter decelerates, exit accelerates, moves use standard easing; nothing linear except real-time progress (M2).
- [ ] Moving tokens follow arcs; overshoot and settle on arrival (M2).
- [ ] Important moments follow the five beats: anticipation, action, impact, follow-through, residue (M5).
- [ ] Sound lands on the impact frame.
- [ ] Size of the celebration matches the event class; nothing competes with it (M8, staging).
- [ ] Anything longer than about 1 s is skippable by tap; repeated moments get shorter (R1, M8).
- [ ] Only `transform` and `opacity`; 60 fps on the phone profile; no layout thrash.
- [ ] A reduce-motion variant exists and keeps the feedback (M10, A4).
- [ ] No more than 3 flashes per second; big flashes soft (A5).
- [ ] Looks good in a Playwright capture sequence (section 9): not flat, stiff or placeholder-like.

### 8.4 Accessibility checklist

- [ ] Text contrast ≥ 4.5:1 (large text 3:1); icons, borders and control states ≥ 3:1 (A1).
- [ ] Text ≥ 12 CSS px (tags ≥ 11 bold with outline) at 844 × 390 (A2).
- [ ] Every colour-coded meaning also has a shape, icon, label or pattern (A3).
- [ ] Screenshots pass under deuteranopia, protanopia, tritanopia and achromatopsia emulation (A3).
- [ ] Reduce motion (setting and OS) replaces motion with fades and keeps state feedback (A4).
- [ ] Every sound cue has a visual cue (A6).
- [ ] No time pressure in menus (A7).

### 8.5 Copy checklist

- [ ] Plain words, the player's language; at most about 8 words per tutorial line (H2, K9).
- [ ] Buttons are verbs ("Upgrade", "Play level 4"), not nouns.
- [ ] Error text says what happened and how to fix it (H9).
- [ ] Honesty rules (A15.3): no fake urgency, no countdowns to rewards, AI always labelled, odds visible.

---

## 9. Review method

1. **Heuristic evaluation.** For each screen, walk the checklists above and log every problem with the principle ID and Nielsen's severity: 0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe (fix before release) ([NN/g severity ratings](https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/), [MeasuringU](https://measuringu.com/rating-severity/)). Severity combines frequency, impact and persistence.
2. **Task walk-throughs** on a fresh save, timing taps and seconds: first launch to first battle; win level 1 and start level 2; equip a new card in the Stone loadout; upgrade a card; open a capsule; change the base flag; find the odds of a capsule; change reduce motion. Targets: first battle within 60 s; each other task within 3 taps from Home.
3. **Playwright captures** (Chromium is preinstalled; never run `playwright install`): each screen at 844 × 390 (with `hasTouch`, safe-area padding) and at 1280 × 720; for animations, a burst of frames (for example every 50 ms) around the moment to judge anticipation, impact and settle; the same with `reducedMotion: 'reduce'`.
4. **Colour vision checks**: open a CDP session and call `Emulation.setEmulatedVisionDeficiency` with `deuteranopia`, `protanopia`, `tritanopia` and `achromatopsia`, then screenshot ([CDP Emulation](https://chromedevtools.github.io/devtools-protocol/1-3/Emulation/), [Chrome CVD](https://developer.chrome.com/docs/chromium/cvd), [Playwright issue with the CDP recipe](https://github.com/microsoft/playwright/issues/32314)). A grayscale screenshot doubles as the hierarchy test.
5. **Squint test**: a blurred screenshot (for example a 6 px CSS blur) must still show the primary action first.
6. **Owner test**: short Danish steps for the owner on a real phone, asking only "what did you expect this to do?" and "what felt good or flat?".

---

## Sources

Usability and interaction

- Nielsen, 10 usability heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/ ; The Decision Lab summary: https://thedecisionlab.com/reference-guide/design/nielsens-heuristics
- Nielsen, response time limits: https://www.nngroup.com/articles/response-times-3-important-limits/
- Nielsen, severity ratings: https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/ ; MeasuringU: https://measuringu.com/rating-severity/
- NN/g, progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- NN/g, animation duration: https://www.nngroup.com/articles/animation-duration/
- NN/g, Fitts's law: https://www.nngroup.com/articles/fitts-law/ ; Wikipedia: https://en.wikipedia.org/wiki/Fitts's_law
- Hick's law: https://en.wikipedia.org/wiki/Hick%27s_law ; https://thedecisionlab.com/reference-guide/design/hicks-law
- Doherty threshold: https://lawsofux.com/doherty-threshold/ ; https://daverupert.com/2015/06/doherty-threshold/
- Laws of UX overview (goal gradient, peak-end, Jakob's law): https://www.uxdesigninstitute.com/blog/laws-of-ux/
- Von Restorff effect: https://uxuiprinciples.com/en/principles/von-restorff-effect
- Norman's principles: https://uxmag.com/articles/understanding-don-normans-principles-of-interaction ; https://principles.design/examples/don-norman-s-principles-of-design ; https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/
- Gestalt: https://ixdf.org/literature/topics/gestalt-principles ; https://www.nngroup.com/articles/gestalt-proximity/ ; https://www.uxtigers.com/post/gestalt-principles
- Working memory: Cowan 2001 https://philpapers.org/rec/COWTMN ; Journal of Cognition 2024 https://journalofcognition.org/articles/10.5334/joc.387

Game UX

- Hodent, game UX usability pillars: https://ixdf.org/literature/article/the-game-ux-twist-usability-principles-for-games ; https://medium.com/design-bootcamp/finding-a-framework-for-ux-in-gaming-key-takeaways-for-understanding-usability-in-celia-hodents-9c0fcfee85f7
- Hodent, GDC 2017 engagement: https://celiahodent.com/gamers-brain-part-3-ux-engagement-immersion-retention-gdc17-talk/ ; GDC 2016 onboarding: https://celiahodent.com/gamers-brain-ux-onboarding/ ; https://archive.org/details/GDC2016Hodent
- Ryan, Rigby and Przybylski 2006: https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf
- Clash Royale UX: https://www.therookies.co/blog/education/game-design-ux-best-practices-detailed-breakdown-of-clash-royale ; https://gornicki.me/blog/Bd87/ux-in-clash-royale-part-3 ; https://watanuxdesign.medium.com/why-clash-royale-has-one-of-the-best-user-experience-design-part-1-fb9c761042c7
- Candy Crush map UX: https://uxdesign.cc/does-candy-crush-have-a-good-ux-3c1a865d24e ; https://www.gamedeveloper.com/design/rethinking-progression-in-mobile-puzzle-games
- Deck builders: https://medium.com/design-bootcamp/marvels-snap-ui-ux-case-study-9f727d8f3875 ; https://www.gamersexperience.com/how-hearthstone-perfects-the-digital-card-collecting-and-deck-building-experience/

Touch and accessibility

- Hoober, how users hold phones: https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php ; thumb zone: https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/ ; https://parachutedesign.ca/blog/thumb-zone-ux/ ; mobile game UI: https://www.wandr.studio/blog/mobile-game-ui-design
- WCAG 2.5.5 and 2.5.8 target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html ; https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html ; platform sizes: https://github.com/cvs-health/android-view-accessibility-techniques/blob/main/doc/basics/MinimumTouchTargetSize.md
- WCAG 2.5.7 dragging movements: https://appt.org/en/guidelines/wcag/success-criterion-2-5-7 ; https://www.wcag.com/developers/2-5-7-dragging-movements/
- WCAG 1.4.11 non-text contrast: https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast ; contrast overview: https://testparty.ai/blog/color-contrast-requirements
- WCAG 2.3.3 animation from interactions: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html ; 2.3.1 three flashes: https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html
- Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/basic/ ; https://gameaccessibilityguidelines.com/full-list/ ; font size: https://gameaccessibilityguidelines.com/use-an-easily-readable-default-font-size/
- Xbox Accessibility Guideline 101 (text display): https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101
- Colour blindness prevalence: https://www.colourblindawareness.org/colour-blindness/types-of-colour-blindness/ ; https://venngage.com/blog/color-blind-design/
- Chrome vision deficiency emulation: https://chromedevtools.github.io/devtools-protocol/1-3/Emulation/ ; https://developer.chrome.com/docs/chromium/cvd ; https://github.com/microsoft/playwright/issues/32314

Motion

- Apple HIG, Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Material Design 3, easing and duration: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs ; how motion works: https://m3.material.io/styles/motion/overview/how-it-works ; transitions: https://m3.material.io/styles/motion/transitions/applying-transitions
- Material motion system and choreography: https://m2.material.io/design/motion/the-motion-system.html ; https://material.io/archive/guidelines/motion/choreography.html ; M1 duration and easing: https://m1.material.io/motion/duration-easing.html
- Val Head, UI animation speed: https://valhead.com/2016/05/05/how-fast-should-your-ui-animations-be/
- Disney's 12 principles: https://www.adobe.com/creativecloud/animation/discover/principles-of-animation.html ; applied to UI: https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design
- Willenskomer, UX in Motion: https://medium.com/ux-in-motion/creating-usability-with-motion-the-ux-in-motion-manifesto-a87a4584ddc ; https://medium.com/ux-in-motion/ui-animation-principles-disney-is-dead-8bf6c66207f9
- Jonasson and Purho, Juice it or lose it: https://www.gdcvault.com/play/1016487/juice-it-or-lose ; https://www.youtube.com/watch?v=Fy0aCDmgnxg ; notes: https://roblog.co.uk/2024/03/juicy-games/
- Nijman, The Art of Screenshake: https://www.youtube.com/watch?v=AJdEqssNZ-U ; https://archive.org/details/the-art-of-screenshake
- Battle feel details and further sources: `docs/research/feel-ux.md`
