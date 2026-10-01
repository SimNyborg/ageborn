# Request: fort art is in; two small follow-ups for the HUD and the content (F3 → WP9/WP5, WP1)

**From:** WP4/WP6 (forts F3 art and audio), 2026-10-01.
**To:** the owner of `src/ui/hud/FortLane.tsx` / `fort.css` (F2 HUD) and the owner of `src/content/raw/fortKit.ts` (WP1).
**When:** before `FORT_SLOT_IN_BATTLE` turns on.

## 1. The trap patch is drawn twice (HUD)

The lane now draws every trap as rendered art (`ArtProvider.createFort`, kind `trap`: unarmed, armed,
sprung and spent frames with a ring of marker stones and the owner's team rag, readable without colour,
A11). `FortLane.tsx` still draws its own DOM hazard patch (`.hud-ltrap-patch`, yellow and black stripes)
on top of it, which hides the art and reads as a UI sticker on the ground.

Asked: drop `.hud-ltrap-patch` (keep the pips chip `.hud-ltrap-pips`: the lane art deliberately draws no
charge pips in battle, so the HUD chip is the only one). The arming blink can stay on the chip.

## 2. Fort sound ids in the content (WP1)

`fortKit.ts` still gives every fort the template sounds (`turret_build`, `spawn_heavy`, `spawn_pop`,
`base_hit`). The A13 fort set now exists (`src/audio/sounds.ts`, recorded in `tools/audio/sfx/sounds_forts.py`):
`fort_place`, `fort_build`, `fort_complete`, `fort_hit_wood|stone|metal|energy`, `fort_crumble`,
`fort_collapse`, `fort_decay`, `trap_arm`, `trap_snap`, `trap_blast`, `camp_horn`, `levy_spawn`, `fort_denied`.
The renderer already plays them from `src/render/fortFeel.ts` (it does not read `FortDef.sfx`).

Asked: set `TEMPLATE_SFX` to `{ place: 'fort_place', complete: 'fort_complete', die: 'fort_collapse' }` for
walls, towers and camps and `{ place: 'fort_place', complete: 'trap_arm', die: 'trap_blast' }` for traps, then
regenerate `counters.json` (`npx tsx tools/counters.ts`, only its input hash changes). The HUD's fort denial
can play `fort_denied` instead of `ui_deny`.

## Status (forts fixer, 2026-10-01)

- Section 1 done: `.hud-ltrap-patch` and its CSS are gone; the pips chip stays and carries the arming blink.
- Section 2 still open (WP1).
