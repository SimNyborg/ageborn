# Notice to WP0: `src/core/motion.ts` and the stray-motion rule

From: UI-0 Foundations, 2026-09-29 (ui-plan 5.2, 6.2 "Motion tokens as integers: WP0, request").

1. **Landed for review:** `src/core/motion.ts` holds the motion tokens as integers (durations in ms, curve control points and scales in thousandths, offsets in px), plus `curveCss`, `thousandths`, `countDuration` and `staggerDelay`. It is pure (no floats in stored values, no DOM), is not re-exported from `src/core/index.ts` (import it as `@/core/motion`), and `tests/integrity/motion.test.ts` proves `src/ui/theme.css` matches it. WP0 please review and take ownership; changing a value means changing both files (the test fails otherwise).
2. **The "no `cubic-bezier(` outside the token files" rule** (ui-plan 1.3) is enforced by `tests/integrity/motion.test.ts`, not by `eslint.config.js`, because ESLint does not lint CSS in this repo. No lint config change is needed unless WP0 prefers a CSS lint step later.
