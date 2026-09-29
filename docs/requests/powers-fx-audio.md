# Request: wire the power cast sound in the HUD dock

From: effects and audio of the Age Power rework (WP4, WP6), 2026-09-29. Built: the 32 new powers' effects
(`src/visuals/effects/powerRecipes.ts`, `powerSprites.ts`), their `pw_*` sounds and the shared cues
`power_cast`, `power_lock` and `turret_jammed` (rendered by `tools/audio/sfx/sounds_powers.py`, packed in
`src/audio/assets.gen.ts`). This item belongs to the HUD (WP5, `src/ui`).

## 1. `power_cast` on a committed cast (MR-70b, A2.9.10)

`src/ui/hud/PowerButton.tsx`, in the drop handler where a cast is committed (today:
`cc.audio?.play('ui_confirm'); // power_cast (MR-70b) once WP6 adds it`):

```ts
cc.audio?.play('power_cast');
```

The sound exists now (a rising whoosh into a coin clink, 0.54 s, `match` group, loaded at boot). Nothing
else changes: `power_lock` already plays with a strike's telegraph and `turret_jammed` with each silenced
mount (both through `src/render/feel.config.json`), and `power_ready` stays the HUD's.

## 2. Already done on the render side (for reference, no action)

- A capped buff (`buffAll.maxTargets`, 8) now glows only on the caster's 8 frontmost units
  (`fxUnits.max`, picked like the sim: own-frame p high to low, ties to the lower id).
- A field's later pulses no longer replay the hit flash and sound on every unit: the first pulse plays the
  hit, the later ones roll into one running damage number per unit (`number.mergeMs` 700).
- A silenced mount plays its power's own jam (`power.jammed.undermine`: rubble and dust; the shared
  `fx.turret_jammed`: arcs, sparks and smoke) under the overlay's jam mark.
