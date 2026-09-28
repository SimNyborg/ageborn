# WP6 → WP11, WP5, WP9: wiring the real audio

**From:** WP6 (audio). **To:** WP11 (`src/app/services.ts`, boot, screens), WP5 (`src/render`), WP9 (settings screen). **Status:** open (Phase 2).

No change to the contracts. `src/dev/soundboard/page.tsx` (`?dev=1#soundboard`) is a working reference.

## WP11: services and boot

`src/app/services.ts`, the `audio` loaders:

```ts
audio: {
  real: async () => (await import('@/audio')).createWebAudioService().service,
  fake: async () => new (await import('@/contracts/fakes/audio')).FakeAudio(),
},
```

and `DEFAULT_CHOICE.audio = 'real'`. `createWebAudioService()` renders the boot sounds (UI, shared battle
sounds, Stone, Medieval) synchronously, about 130 ms in Chromium (B16 budget 300 ms), and queues the rest
for idle time (`requestIdleCallback`). Nothing else is needed at boot: `unlockAudioOnGesture` in
`boot.ts` already calls `unlock()` inside the first gesture, which is what iOS needs (C5 #44), and
`applySettings` already sets the bus volumes (they are remembered until the context exists).

Recommended (not required since the WP6 review): `unlockAudioOnGesture` listens for `pointerdown`,
`keydown` and `touchend` and removes all three after the first event. On a touch screen the first
event is the tap's `pointerdown`, which carries no user activation in the HTML rules (only `pointerup`,
`touchend`, a mouse `pointerdown`/`mousedown` and `keydown` do), so that unlock attempt can fail. The
service now keeps its own retry listeners armed until the context runs, so the tap's `touchend` starts
audio anyway; listening for `pointerup`, `touchend`, `click` and `keydown` in `boot.ts` would make the
first attempt succeed on its own.

Music cues the app should set (A14.3); the view already sets the evolve cues, the key changes, the
layers and the end-of-match stinger:

| When | Call |
|---|---|
| Home and the menus | `audio.music.setCue('music.menu', { fadeMs: 600 })` |
| Battle start (after the VS screen) | `audio.music.setCue(content.ages[<player's start age>].musicCue, { fadeMs: 600 })` |
| Leaving a battle without a result (quit, retreat) | `audio.music.stop(600)` (also resets the key and layers) |
| Capsule screen | already done by WP10's `CapsuleScreen` (`music.capsule`) |

Semantics worth knowing: `music.transpose(n)` sets the total key change (the view sends 2, 4, 5, 6);
layers and key carry over only from a battle cue to the next battle cue or a stinger, so a new battle
always starts in the home key with the layers off. Effects played before the first gesture are dropped.
The context suspends while the page is hidden and resumes when it is visible again.

## WP5: priority (A13 rule) and panning (optional polish)

A13 "Sounds caused by the player get priority": the service treats a higher `priority` as more
important when the voice caps are full (4 per id, 32 in total): it steals the opponent's voices and
is never stolen by them. The 40 ms retrigger gap is absolute for everyone (A13 "40 ms minimum"). Pass
`priority: 1` for sounds of the player's own side (their spawns, attacks, powers, evolves, turret
actions) and leave the opponent's at 0; without it the rule is not met. UI sounds already get a bonus
inside the service.

`FeelDirector.sound()` already accepts `pan`; the view could pass a gentle stereo position, for example
`pan = 0.6 * (2 * xLu / laneLu - 1)` (mirrored for side 1 when the player plays on the right).

## WP9: settings screen

Call `audio.setBusVolume(bus, v01)` live when a volume slider moves (0..1; the service applies a
square-law taper). The iOS mute-switch note (D2 risk table) belongs next to the volume sliders.
