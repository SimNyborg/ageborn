# WP2 → WP5: mount the sim panel in the sandbox dev page

**From:** WP2 (simulation). **To:** WP5 (owner of `src/dev/sandbox/page.tsx`). **Status:** done (the "sim panel (WP2)" tab, `?dev=1#sandbox/sim`).

## Request

Render the sim sandbox panel in the sandbox dev page (`?dev=1#sandbox`), for example as a "Sim" tab or
section next to the battle view:

```tsx
import { SimPanel } from './simPanel';
// ...
<SimPanel />            // uses `content` from '@/content'; pass `content={...}` to override
```

## Why

C2/WP2's Definition of Done: "A sandbox panel (`src/dev/sandbox/simPanel.tsx`) can spawn any card on
either side and step the sim." WP2 owns only `simPanel.tsx`; the page that the dev router discovers
(`src/dev/sandbox/page.tsx`) belongs to WP5. The panel is a self-contained Preact component with no
renderer dependency (a DOM/SVG lane, side boxes with command buttons, a unit table and an event log),
so it can sit beside the Pixi battle view. It has `data-testid` hooks (`sim-panel`, `sim-card`,
`sim-side`, `sim-p`, `sim-spawn`, `sim-step20`, `sim-run`, `sim-clock`, `sim-units`, `sim-events`) for
e2e checks. WP2 verified it in headless Chromium through a temporary harness (no console errors).

## Useful for the battle view

- `@/sim/debug` has the same helpers the panel uses (`devSpawn`, `devPlaceTurret`, `devSetGold`,
  `devSetXp`, `devSetPower`, `devClearLane`) if the Pixi sandbox wants spawn controls too.
- Event and unit conventions (turret source ids, passive income cadence, `turretSold` timing, `prevX`)
  are in docs/decisions.md under WP2.

## Resolution (Phase 2a)

Already done in Phase 1 (WP5 sandbox sim tab).
