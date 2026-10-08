# Ageborn UI and motion rules (binding, short form)

Full detail, numbers and the motion catalogue: `docs/ui-plan.md` (Part 1 rules U1-U15, Part 5 motion). Read the plan section for any screen you touch; tick its checklist (1.2) in PROGRESS.

**Screens**
1. One screen, one job, at most one primary (`data-primary`), bottom-right under the right thumb. A new player can say what the screen is for in 5 seconds.
2. Home's Battle plays the mode shown on the mode switcher in 1 tap (Ranked, the Ladder, by default: the tap starts its search); another mode is 2 taps away (switcher, card), and the panel only selects, never starts. The plate over Battle always shows exactly what Battle will do. From any Result the next battle is at most 1 tap away; a War Path win continues to the map.
3. Five tabs, one per verb: Army, Capsules, Battle (Home), Progress, Customize; no Shop or Events tab, ever (events are switcher cards). Every thing has exactly one home. Depth at most 2; never a panel on a panel (info panels excepted).
4. Back is top-left, Close is top-right; Esc, browser back and Android back do the same (a history entry per panel, sub-screen, jump and battle). A cross-tab jump returns to its origin. State is kept on return.
5. It fits the phone: 844 × 390, 844 × 340, 800 × 360 and 1280 × 720, with safe areas; budget every layout in px first. Text ≥ 12 px (tags ≥ 11 bold). Targets ≥ 48 px (44 rare), ≥ 8 px apart. No clipping, no truncation, no page scroll; the primary never scrolls away.
6. Show, don't make them remember: class, cost, level, counters, equipped, locked and ready sit on the item. Nothing essential is hover-only.

**Words and disclosure**
7. Reveal gradually: show only what the player can use now, on Home, inside screens and in the HUD. One new Home thing per level, with a short unlock ceremony. Locked things say how they unlock.
8. Plain words: buttons are verbs; every invented term has an icon, a first-seen caption and an info panel; a blocked button says what is missing. All strings through i18n, with room for +30% Danish.
9. Honest and labelled: bots are labelled AI everywhere, except Ranked from Home (owner decision 2026-10-07: until online play exists its search finds a generated player with the Player chip, and the match is played against the bot; Settings › About and For parents keep "All opponents are AI"); A15.3 copy; no timers, countdowns, backlog counts or "last chance"; nothing can be bought.

**Colour and components**
10. Gold = go, green = spend or progress (and valid drop), slate = neutral, red = destructive or denied. Rarity, team and capsule-tier colours only on their own objects, always with their shape cue (gem, side and label, pips).
11. One component per job (Button, CardTile, Panel, ScreenFrame, Toast); tokens only for colour, type, spacing and motion. Contrast ≥ 4.5:1 text, ≥ 3:1 icons and edges; nothing by colour alone.

**Interaction**
12. Every tap shows its pressed state on `pointerdown` and answers within 100 ms, near the finger. Disabled controls explain why on tap.
13. Every drag has a tap alternative; one meaning per gesture; nothing waits for a double-tap; drags never start within 20 px of the screen edge.
14. Forgive: reversible changes are instant with Undo; spends take two taps (the first shows price and result); a long-press never spends.
15. One attention pulse per screen. NEW dots clear when seen; ready badges stay until acted on; at most 2 on Home. No repeating flash anywhere.

**Motion**
16. Motion ships with the feature. Every animation has a job (feedback, continuity, attention, state, celebration, life) and a row in the plan's catalogue.
17. Use the tokens (`src/core/motion.ts`, `theme.css`): UI moves in 150-400 ms, exits about 0.7 × entrances, only `transform` and `opacity` animate, tokens fly on arcs to where they are kept.
18. Satisfying moments follow anticipation, action, impact (seen, heard, felt), follow-through, residue, sized by event class. Medium ≤ 2 s, queued, never overlapping; anything over 1 s skips on tap; Play interrupts any Home ceremony.
19. Never block: input retargets or finishes an animation. In battle nothing takes the camera or controls away.
20. Small things the player touches (buttons, cards, chests, badges, numbers) keep full overshoot and squash. Large panels decelerate without bounce. Characters in the realistic world never squash: weight through poses, timing, follow-through and hit reactions by mass. The sim owns all timing.
21. Haptics on Android by tier (tick 8, thump 18, heavy), at most one per 100 ms, behind the Vibration setting.
22. Reduce motion replaces, never deletes: fades and glows instead of movement, counters and pre-signals kept, at most 3 flashes per second in any mode.

**Done means checked**: Playwright screenshots at the phone and desktop viewports, 50 ms bursts from input to settle, reduce-motion and colour-vision captures, the budget spec green. Fix anything flat, stiff or placeholder-like before reporting done.
