# WP2 → integration lead (DESIGN A2.7): the third rank never reaches the enemy

**From:** WP2 (simulation, review). **To:** integration lead (DESIGN owner), for Phase 3 tuning.
**Status:** open, needs a decision. **Priority:** medium (balance, A2.14).

## The inconsistency

DESIGN A2.7 (Movement) sets two rules and states their result:

1. "A unit advances at its speed unless it has a valid target in range for its first attack."
2. "From unit 3 on, a unit may not come closer than (wA + wB) × 0.3 centre to centre behind the ally
   directly ahead."
3. Result: "two melee units fight side by side, reach units (range ≥ 55) hit from the third position,
   and Infantry (range 16) can hit from the third position against small targets."

The result only holds when the front rank stands at contact (edge distance 0). Under rule 1 a unit stops
as soon as its target is in range, so the front rank stands 12.5-16 lu (Infantry, 3.5 lu steps) or
56.5-60 lu (Spear Hunter) from the enemy. The third rank is 14.4 lu (small) or 19.2 lu (medium) further
back, so it is 26-30 lu or 76-80 lu away and never in range. Measured in the sim (4 Bonkers, Footmen,
Spear Hunters or Pikemen walking into a stunned Mammoth): exactly 2 of the 4 ever attack.

Consequence: in any melee-vs-melee clash only two units per side fight, however large the army. In the
golden Full War replays of scripted players, a 25-unit Photon Knight column sat idle behind a 2-wide
front and the match ran to the Final Bell. A2.14 wants < 3% of Full Wars to reach the Final Bell.

## Options

- **A. Keep rule 1 as written** (the sim today) and delete the "third position" claims from A2.7.
  Depth then matters only through ranged units, which overtake parked melee.
- **B. Melee closes to contact:** a unit whose first attack is melee keeps advancing to edge distance 0
  against the nearest enemy ground unit ahead even with a target in range (ranged units still stop at
  range). The stated result then holds exactly (3rd-rank Infantry at 14.4 lu, reach at 19.2 lu).
- **C. Tighter file:** keep rule 1 but lower the spacing (for example 0.3 → 0.1) so the third rank sits
  closer; this helps reach units but still not range-16 Infantry.

WP2 recommends deciding this before Phase 3 tuning, because it changes every melee matchup (and WP1's
counter matrix, which models rule 1). Option B is a small change in `src/sim/systems/movement.ts`
(`computeWant`); WP2 can implement it with a `SIM_VERSION` bump and re-recorded golden replays once
DESIGN says which option applies.
