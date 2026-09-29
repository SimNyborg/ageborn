# Request to WP4 (visuals, art pipeline): battle feel follow-ups (UI-5b, ui-plan 5.8, 6.7b)

**From:** UI-5b battle feel pass (WP5), 2026-09-29. Audit: `docs/research/battle-feel-audit.md`.

Done in code in UI-5b (`src/visuals/adapters/atlas.ts`, `atlasTurretView.ts`): spawn drop and settle by mass (no scale pop), hit flinch by mass, death lie-then-sink-and-fade, KO stars replaced by dust, ground-toned dust, 3% prop recoil and landing.

Still open, most-seen first:

1. **Spawn from the gate (MR-100):** units appear in front of the gate; the gate or spawn point should glow and puff first, and the unit step out of it. Needs a gate anchor on the base view.
2. **Hit poses (MR-103):** light units turn the head, medium dip a shoulder; a short `hit` clip per sheet (2-3 frames) would carry it. The code flinch stays on top.
3. **Death by mass (MR-105):** heavies drop to a knee first (200 ms) then fall; mechs stall and burst (later ages).
4. **Melee smear (MR-102):** a smear frame or trail on the strike frame of melee sheets.
5. **Hit and splash dust (`src/visuals/effects/recipes.ts`):** the shared dust is a bright beige cloud at full opacity; over realistic art multiply it toward the ground's tone (about `0xb8ad9c`) at about 60%, as the atlas units now do.
6. **Base residue (MR-108):** fires and smoke per crumble stage on the restyled bases.

None of these change sim timing; the sheets' `impactAt` contract stays.
