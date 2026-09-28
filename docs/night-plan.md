# Autonomous work plan (night of 2026-09-28)

The owner asked the orchestrator to plan and keep working through the night without stopping to ask for permission. Owner decisions that are still open are taken by following the orchestrator's and the design documents' recommendations, and logged in `docs/decisions.md` as "Decided by orchestrator (owner delegated)". Nothing may cost money; everything stays within CLAUDE.md.

## Running now (started 2026-09-28 evening)

1. Quick wins: Home right after match 1, War Plan and Customize early, stance from the start, difficulty picker, a much stronger AI.
2. Card class icons and counters on every card surface.
3. Age Power dragged onto the field.
4. Satisfying capsule opening.
5. Satisfying base upgrades (evolve, Treasury, new slot, turret build and Modernise).
6. A18 design: War Path, pacing, more historical ages, in-battle upgrades, air, underground and stationary classes, six troops, cosmetics collections, online roadmap.
7. Ultra-realistic art exploration on three reference units.
8. Online 1v1 spike in `server/` (local only).
9. UI master plan, design system and motion catalogue (`docs/ui-plan.md`).

## Order of work after that

1. **Publish** each finished batch (1-5) to `main` once the whole tree is green and a browser boot check passes.
2. **A18 decisions:** follow the addendum's recommendations; merge A18 and A17 into DESIGN.md.
3. **UI rebuild** from `docs/ui-plan.md`: Home with the War Path, navigation, design system, deck builder with 6 slots, Collection, Customize, HUD; motion catalogue across the game. Screenshot review on phone and desktop.
4. **War Path campaign** (levels, bosses, stars) as the Home centerpiece.
5. **Pacing, difficulty and in-battle upgrades**, six troops per battle, then a balance loop toward the new longer, harder targets.
6. **New classes:** stationary structures, underground and air as full classes.
7. **Cosmetics collections:** emotes, quotes, base flags and skins, decorations, national flags.
8. **Ultra-realistic restyle** of all units, turrets, bases and backdrops (per age, in parallel), then compression.
9. **More historical ages** from A18 (content, sim, AI, art, audio).
10. **Online:** turn the spike into the first real milestone (no deployment until the owner creates a free Cloudflare account).
11. **Phase 3** at the end: balance, polish, C5 bug bash, release checklist.

## Rules for the night

- Keep 3-6 workflows running at a time; the machine has 4 CPUs, so avoid more.
- Every 30 minutes: check for container restarts (compare workflow transcript times), resume dead workflows with their run id, commit and push a snapshot to `main-ipy06f`.
- Publish to `main` only from a green tree (typecheck, lint, test, build, boot check with no console errors).
- Every visual or UI change is reviewed with screenshots before it is published.
- Give the owner a short Danish status in the morning with the play link and what to look at.
