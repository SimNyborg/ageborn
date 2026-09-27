# WP5 → WP11: wiring the battle view and HUD into `BattleSession`

**From:** WP5 (battle view, feel, HUD). **To:** WP11 (`src/app/session.ts`, battle screen). **Status:** open (Phase 2).

Not a change to your files, just the integration notes. `src/dev/sandbox/viewBattle.tsx` is a working
reference of all of this (it runs the real sim with WP3 bots and WP4 art).

## Battle view (`@/render`)

```ts
const view = new BattleView({ sim, art, audio, settings: viewSettingsFrom(save.settings), isMobile, arena,
  onPresetChange: () => app.renderer.resize(w, h, view.resolution(devicePixelRatio)) });
app.stage.addChild(view.root);
const detach = view.attachInput(app.canvas);   // mount taps, pinch zoom (< 900 px), double-tap reset
view.resize(cssWidth, cssHeight);              // on every canvas resize
```

Loop (B6), with `FixedStepClock` from `@/render`:

```ts
clock.add(frameMs, speed, view.simFrozen || paused);
while (!view.simFrozen && clock.consume()) {
  // bots, commands, then:
  const events = sim.step(cmds);
  view.onEvents(events);
  hudBuilder.afterStep();
}
view.setPaused(paused); view.setSpeed(speed);
view.render(clock.alpha, frameMs);
```

`view.simFrozen` is the A12 global freeze (capped at 150 ms per rolling 3 s; base destroyed exempt).
Keep calling `view.render` after `matchEnded` for about 2 s: the collapse and the 0.3x slow motion are
view-only. `view.setSettings(...)` applies settings changes live; `view.destroy()` cleans up.

## HUD model (`@/render`)

```ts
const hudBuilder = new HudModelBuilder(sim, 0);   // follows tutorial tray unlocks
const hud = signal(hudBuilder.build({ speed, paused }));
// at 15 Hz: hud.value = hudBuilder.build({ speed, paused, foils });
```

`BattleSession.hud` can be exactly this signal.

## HUD (`@/ui/hud`)

Mount it in a box that covers the canvas exactly:

```tsx
<Hud model={session.hud} config={matchConfig} issue={(c) => session.issue(c)} view={view}
  portrait={(card, foil, size) => art.portrait({ card, foil, size, side: 0 })}
  audio={audio} teamPreset={settings.teamPreset}
  onPause={() => { session.pause(); openPauseScreen(); }} onSpeed={(s) => session.setSpeed(s)} />
```

The replay viewer can pass `readOnly` and `controls={false}` (and `side` for the side toggle).
Tutorial pointers can target the `data-testid`s: `hud-card-0..4`, `hud-gold`, `hud-evolve`,
`hud-power`, `hud-stance`, `hud-laststand`, `hud-emote`, `hud-scouted`, `hud-pause`, `hud-speed`,
`hud-mount-popover`, and on the canvas `view.mountScreenPoint(mount)`.
