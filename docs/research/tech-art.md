# Tech-art research: stack and architecture for a browser-first lane battler (Sept 2026)

## 0. Recommendation summary

| Layer | Pick (versions current as of Sept 2026) | Why |
|---|---|---|
| Language/build | TypeScript 7.0.x (Go-native `tsc`, GA 8 Jul 2026, about 10x faster than 6.0), Vite 8 (Rolldown, GA 12 Mar 2026, needs Node 20.19+/22.12+), Node 22/24 LTS, pnpm workspaces | Vite handles transpilation, so the TS version only affects type-checking. Fall back to TS 6.0 if a lint plugin lags. |
| Battle renderer | **PixiJS 8.21.x** (8.21.0 released 17 Sep 2026) | About 120 KB gzipped (roughly 476 KB minified). Real nested scene graph (fits cutout rigs). Official Spine runtime. AssetPack manifest pipeline. WebGL/WebGPU plus a Canvas fallback. 500k weekly npm downloads. Ships 25 official AI-agent skills. |
| Runner-up | Phaser 4.2.1 | Choose it if you want batteries included (tweens, particles, cameras, sound). It is 345 KB gzipped. |
| Meta UI (profile, collection, decks, shop) | DOM + Preact (3 kB) + signals, CSS | Text, scrolling lists and accessibility are cheaper in the DOM. Pixi is used only for the battle and the case-opening "reel" VFX. |
| Simulation | Engine-free, pure-TS deterministic fixed-timestep sim (integer math, seeded sfc32 RNG, command log) | The same code later runs in the browser, the Node server, headless balance runs, replays and tests. |
| Art | Data-driven "visual registry". v1 uses procedural vector puppets baked into runtime atlases. Later: AI-generated static parts, AssetPack atlases, then Spine (`@esotericsoftware/spine-pixi-v8`). | Game data references only a `visualId` and never a file. |
| Audio | ZzFX (<1 KB, MIT) + jsfxr (Unlicense) pre-rendered to AudioBuffers, own mixer | Sound effects come from code now. Later you swap in files through the same manifest. |
| Saves | Versioned JSON document, migration chain, schema validation (Valibot/Zod), IndexedDB via idb-keyval (~600 B) plus a localStorage backup slot, export/import file | Protects against Safari eviction and schema drift. |
| Tests | Vitest 4.1.x (Browser Mode stable since 4.0, 22 Oct 2025) | Golden replays, determinism checks, migration fixtures, drop-rate statistics, screenshot tests of an art gallery. |
| Later | Colyseus 0.17 (10 Apr 2026: auto-reconnect, `defineServer()`, end-to-end types), Capacitor 8.3.x, PWA | The server hosts the same `sim` package. |

---

## 1. Engine and renderer comparison

| | Size (gzipped) | Mobile/perf notes | TypeScript | Ecosystem/status | Fit for us |
|---|---|---|---|---|---|
| **PixiJS v8** | ~120 KB (476 KB min) per wpdean; ~0.2 MB per Cinevva | Bunnymark v7→v8: 100k moving sprites CPU ~50 ms → ~15 ms; static sprites ~21 ms → ~0.12 ms. Batches up to 16 textures per draw call. The team notes WebGPU "does not automatically guarantee improved performance" (CPU-bound cases). Experimental Canvas2D fallback since 8.16. Mobile tips: `antialias:false`, `@0.5x` textures, BitmapText for changing numbers. | Written in TS, single `pixi.js` package, TS 5–7 support in 8.21 | Very active: 8.16→8.21 in 2026, 500k weekly downloads, spine-pixi-v8 co-built with Esoteric, AssetPack 1.0, `graphicsContextToSvg()` (8.18) | **Best.** It is a renderer only, and we want to own the loop and sim anyway. |
| **Phaser 4** | 345 KB full, 313 KB arcade build | New RenderNode renderer (v4.0.0, 10 Apr 2026). Sprite quads upload 4 vertices instead of 6. WebGL2. Automatic context-loss recovery. SpriteGPULayer ("up to 100x faster", one draw call). **Canvas renderer officially deprecated.** | Full typings | Largest community. 28 agent-skill folders in the repo. spine-phaser-v4 (needs Phaser ≥4.2.1 for runtime 4.3.11+). v3→v4 breaks custom pipelines, masks/FX and tint. | Good alternative. Most of its framework (Arcade physics, scenes, input) would go unused, because our sim is custom and the meta UI is DOM. |
| **Excalibur** | ~0.3 MB | 0.30 doubled image-draw performance. 0.32 (23 Dec 2025) improved offscreen, tilemap and physics performance. | TS-first, clean actor/ECS | Still 0.x, v1 not shipped, small community. Phaser's own comparison says it "requires more manual work". | No. |
| **Kaplay** | small | Old 10k-sprite benchmark (Edge 109, Ryzen 4500U): **Kaplay/Kaboom 3 FPS** vs Pixi 47, Phaser 43. The v4000 rewrite is still `4000.0.0-alpha.27.1` (May 2026). | Good | Beginner/jam oriented | No. |
| **Plain Canvas2D** | 0 | CPU-bound. Fine below a few hundred sprites, but no shaders/filters, and batching, loading and text caching would all have to be reinvented. Pixi now falls back to Canvas2D anyway. | n/a | n/a | No, except tiny UI bits. |
| **Godot 4 web** | ~9 MB gzipped (WASM compresses to ~25%) | Compatibility renderer / WebGL2 only. **C# cannot export to web.** Docs say web is "significantly worse than native". Single-threaded export is the default since 4.3 because of iOS/SharedArrayBuffer problems. HN devs: "Godot 4 is not currently web ready". A forum case went from 31 to 60 fps only after rebuilding the art pipeline (22 s → 4.2 s load). | GDScript | Strong native mobile export | No. Heavy first load hurts virality, and it is not a TS/agent-friendly codebase. |

**Verdict: PixiJS v8.** For this game (a 1D lane, maybe 100–300 units/projectiles plus particles) both Pixi and Phaser are fast enough. What decides it is the architecture:

1. We own the fixed-timestep loop and sim.
2. Pixi's plain nested transform tree maps directly onto cutout "puppet" rigs.
3. AssetPack plus the Pixi manifest gives a clean swappable-asset pipeline.
4. `GraphicsContext` sharing and SVG parsing suit code-drawn art.
5. It has the smallest bundle for mobile and the later Capacitor app.

Start with `preference: 'webgl'`. Safari 26 (15 Sep 2025) shipped WebGPU on iOS/iPadOS/macOS, but treat WebGPU as an opt-in flag until tested on real phones.

---

## 2. Deterministic simulation, separated from rendering

**Loop (Gaffer "Fix Your Timestep"):** the renderer produces time and the sim consumes it in fixed `dt` steps. Clamp frame time to avoid the "spiral of death", and interpolate between the previous and current state with `alpha = acc/dt`.

```ts
const DT = 50; // ms, 20 Hz sim; content authored in ms, converted to ticks at load
acc += Math.min(frameMs, 250);
while (acc >= DT) { prev = curr; sim.step(pendingCommandsFor(sim.tick)); acc -= DT; }
view.render(prev, curr, acc / DT, sim.drainEvents());
```

rAF may run at 30, 60, 90 or 120 Hz, so it must never drive gameplay directly. A 3-minute match at 20 Hz is 3,600 ticks, which is trivially cheap headless.

**JS determinism rules (important for a later Node server vs iOS/JSC clients):**
- ECMAScript defines `Math.sin/cos/exp/pow` as *implementation-approximated*. V8 uses fdlibm. Firefox historically used platform libm (Mozilla's 2021 fingerprinting thread). Results can therefore differ across engines and OSes. **Ban transcendental Math functions in the sim.** Use lookup tables or precomputed curves if you need arcs.
- Basic `+ - * /` on doubles is IEEE-754 round-to-nearest and exactly specified, with no x87/FMA surprises as in C++. Integers are still simpler to hash and serialize, so use integer sub-units for position, integer HP and damage, modifiers in basis points (10000 = 100%), and `Math.trunc`/`Math.imul`. Keep values within the safe-integer range.
- No `Math.random`, `Date.now` or `performance.now` in the sim. Use one seeded PRNG stored *in sim state*. bryc's survey rates **sfc32** "best 2^128 state JS PRNG, passes PractRand". Seed it with xmur3. Keep a separate cosmetic RNG in the view so VFX never perturb the sim.
- Iterate entities in stable id order (arrays, not object-key order). `Array.prototype.sort` is stable, but sort by explicit keys anyway.

**Data flow:**
- The sim is a pure `step(state, commands) → state + events`.
- Commands are `{tick, player, type, payload}`, for example spawnUnit, buildTurret, evolve, special. Bots and humans use the same command API, so bots are honest (they cannot peek at state a player couldn't see).
- Events are things like `unitSpawned`, `hit`, `died`, `projectileFired` and `ageUp`. The view turns them into animations, VFX and SFX.
- The view never mutates the sim.

**Replays and hashes:** a replay is `{simVersion, contentHash, seed, decks, commands[]}`, only a few KB. Every N ticks, hash state (FNV-1a via `Math.imul`) for desync detection and golden tests. This follows the approach in game-balance-sim: log seed and actions, replay everything, and reject any run that doesn't reproduce exactly. Replays also give a marketing-clip pipeline: re-render a replay offscreen and record it with `canvas.captureStream`/MediaRecorder.

**Headless balancing:** run bot vs bot in Node across decks × seeds. game-balance-sim reports "~30 seeds keeps sampling error near ±5 points". Runs are cheap here, so use ≥400 matches per matchup (SE ≈ 2.5 pts at p = 0.5). Use bot tiers: greedy (lower bound), planner (upper bound) and reference.

**Path to online:** Clash Royale is widely analysed as client-simulated with server-validated inputs. Evidence includes deploy delay, replays, and the game continuing while a player is disconnected. Gaffer's deterministic lockstep sends only inputs, with a ~100 ms playout buffer. SnapNet notes that lockstep input delay scales with latency, which suits strategy games. Our "deploy delay" can be hidden by a summon animation. Two options later:
- (a) Server-authoritative input relay. A Colyseus 0.17 room runs the same `sim` package in Node, stamps commands with an execution tick (for example now + 4 ticks), relays them, compares hashes, and sends a snapshot on reconnect or desync.
- (b) Full state sync via Colyseus schema.

Keeping the sim deterministic now keeps both options open.

---

## 3. Swappable art pipeline

### 3.1 The visual contract (what makes swapping cheap)
- Content data (`units.ts`) holds gameplay stats plus a **`visualId` only**.
- `visuals/registry.ts` maps `visualId → VisualDef`:

```ts
type VisualDef = {
  kind: 'procedural' | 'atlas' | 'spine';
  source: string;                               // generator fn id | atlas key | skeleton key
  anchors: { feet; head; muzzle; hitCenter };   // VFX/projectile attach points
  scale: number;
  teamTint?: string[];                          // part ids that take team colour
  clips: Record<'idle'|'walk'|'attack'|'hit'|'die'|'special', ClipRef>;
  events?: { attack: { impactAt: number } };   // normalized 0..1
};
```

- **The sim owns timing.** For example, the sim says attack windup is 12 ticks. The view time-scales whichever clip is present so its `impactAt` lands on the sim's impact tick. Replacing art can therefore never change balance.
- All art tiers implement the same clip names and event markers. The view adapters are `ProceduralPuppetView`, `AtlasAnimView` and `SpineView` behind one `UnitView` interface.
- Build a dev **art gallery** route that renders every visualId × clip × skin. It serves as a review surface, the target for screenshot regression tests, and the handoff sheet for future artists or AI.

### 3.2 Tier 0 (v1): procedural vector puppets
- Each unit is a cutout rig: a Pixi `Container` tree of parts (torso, head, upper/lower arm, weapon, legs). Each part is drawn once in code with Pixi `Graphics` or an inline SVG string.
- **Bake at load:** render each part to a texture at `min(devicePixelRatio, 2)`, pack the parts into a runtime atlas, and render them as `Sprite`s. That keeps everything in a few batched draw calls. Pixi docs: "Do not clear and rebuild graphics every frame". Share `GraphicsContext`s. Complex SVG holes may triangulate imperfectly. SVG can load as a texture (`resolution` option, max 4096²) or as a `GraphicsContext`.
- Animations are keyframes on part rotation, offset and scale, stored as JSON with the same concepts as Spine bones. That makes later migration mostly a re-export, and lets code generate walk cycles, squash-and-stretch and recoil procedurally.
- Skins and rarity come cheaply in code: palette swaps, overlay parts (helmets, capes), filters (glow/outline) and particle auras for epic/legendary.
- Readability comes from style choices: thick outlines, two-tone cel shading, a strong silhouette per age, and team colour on large parts.
- "Juice" belongs in the view only: hit-stop, screen shake, hit flash, damage-number BitmapText, particles and death ragdoll-lite (see Jonasson & Purho, "Juice it or lose it", and Nijman, "The art of screenshake").

### 3.3 Tier 1: AI-generated art dropped into the same rig
The 2026 state of the art is good at **static** images and still weak at **frame-consistent animation**:
- OpenAI community threads report that whole sheets fail, frame-by-frame works better, and there is left/right limb confusion and proportion drift.
- itch.io devs report details changing on every frame.
- GPT-Image-2 got `background:"transparent"` (PNG/WebP) in preview on 20 Aug 2026. Users report alpha of 253–254 instead of 255 and halo fringes, so add a defringe/alpha-threshold step.
- PixelLab does skeleton-based animation but only pixel art. Scenario trains a custom LoRA from 20–30 references (from $45/mo). Ludo offers 30+ styles and exports sprite sheets.

**Strategy:** generate *static parts* per unit at fixed canvas sizes and pivots, and keep animating via the rig. Pixi 8.18's `graphicsContextToSvg()` can export our procedural parts as SVG. Those exact silhouettes, sizes and pivots become img2img/pose references for AI or paint-over templates for a human artist. Pick a clean cartoon/cel style rather than pixel art, so code art and later painted or AI art stay compatible.

### 3.4 Tier 2: atlas pipeline
- Put raw art in `assets-src/**/{tps}` folders. **AssetPack** (Pixi's CLI) packs spritesheets (default max 4096 px, `@0.5x` low-res variants), compresses to PNG/WebP/AVIF via Sharp, and emits a Pixi **manifest with bundles** (`Assets.init({manifest})`, `loadBundle('age-1')`). Load ages lazily.
- TexturePacker also exports Pixi and Phaser formats.

### 3.5 Tier 3: skeletal animation
- **Spine** is the de facto standard. Pricing: Essential $69 (no meshes, weights or IK), Professional $379, Enterprise required above $500k annual revenue.
- `spine-pixi-v8` needs Pixi ≥8.16. The runtime's major.minor version must match the editor version.
- DragonBones is effectively abandoned (runtime still MIT). Avoid it.
- Rive (WebGL2 WASM runtime, state machines) is an option for UI and case-opening motion, but not for 100+ units.

**Mobile rendering budget:** a handful of atlases per battle, blend modes grouped (interleaving them breaks batches), culling only where GPU-bound, and DPR capped at 2.

---

## 4. Procedural audio
- **ZzFX:** under 1 KB, MIT, 20 parameters, `npm i zzfx`. ZzFXM adds tiny music.
- **jsfxr:** Unlicense. Presets (laserShoot, explosion, hitHurt, powerUp…), `toBuffer`/`toWave`, and b58-encoded sound strings designed in the sfxr.me web tool.
- Pre-render every effect to an `AudioBuffer` at load, not per play.
- Use a small mixer: master/sfx/music/UI buses, per-sound voice limits (30 simultaneous "hit" sounds should not clip), ±5% random pitch, and ducking on big events.
- A sound manifest maps `soundId → {kind:'zzfx', params} | {kind:'file', src}` so real audio can replace entries one by one.
- iOS: create or `resume()` the AudioContext *inside* a user gesture, or it stays suspended. The hardware mute switch silences Web Audio (workaround: feross/unmute-ios-audio).

---

## 5. Save data
- **Durability facts:**
  - localStorage is 5 MiB per origin and synchronous, so large writes cause jank.
  - IndexedDB quota is a share of disk: Chrome about 60%, Firefox 10% best-effort, Safari (macOS 14+) about 60%.
  - Eviction is all-or-nothing per origin.
  - **Safari deletes all script-writable storage after 7 days of Safari use without interaction.** Home-screen web apps are exempt.
  - `navigator.storage.persist()`: Firefox prompts, Chromium decides silently.
  - Capacitor says WebView localStorage "must be considered transient". Use the Preferences plugin or SQLite natively.
- **Design:**
  - One `SaveDoc {v, profile, currencies, collection{unitId:{level, shards, skins}}, decks{ageId:[…]}, chestState{rngState, pityCounters, pending}, stats}`.
  - Pure migrations `m[n]: Vn → Vn+1` run in sequence, then validate against a schema. Keep a pre-migration backup.
  - Write to two alternating slots with a checksum (crash-safe), debounce writes, and flush on `visibilitychange`.
  - Put everything behind a `SaveStore` interface (IndexedDB now, Capacitor Preferences/SQLite or cloud later).
  - Offer export/import to a file from day 1.
- **Case openings:** roll with a seeded RNG stream stored in the save, **persist the result before playing the animation** (a reload cannot re-roll), keep pity counters, and show drop odds in the UI. Apple's App Store guideline 3.1.1 requires odds only for purchasable loot boxes, but showing them builds trust.

---

## 6. Testing (Vitest 4.1)
- **Sim, Node environment:**
  - Unit tests for formulas.
  - **Golden replays**: seed plus commands must produce a known final hash.
  - Determinism: run twice, compare hashes.
  - Invariant/property tests (fast-check): HP ≤ max, gold ≥ 0, no entity past a base.
  - `vitest bench` guard: a full match must run in under ~50 ms.
- **Meta:** migration fixtures for every past save version, and drop-rate chi-square tests over 10⁶ simulated openings.
- **Balance CI smoke test:** a mirrored-deck bot matrix that flags any unit or turret with an outlying win rate.
- **Browser Mode** (Playwright provider `@vitest/browser-playwright`): `toMatchScreenshot` on the art gallery, so art swaps are visible diffs. Standard Schema matchers (`expect.schemaMatching`) validate content and save files.

---

## 7. Folder architecture (pnpm workspace)

```
<game>/
  packages/
    sim/        # deterministic core. Lint-banned: DOM, Math.random, Date, Math.sin/cos/pow/exp
      core/ (fixed.ts, rng-sfc32.ts, hash.ts, ids.ts)
      battle/ (state.ts, step.ts, commands.ts, events.ts, systems/{movement,combat,projectiles,turrets,economy,xp-age,specials}.ts)
      ai/ (bots: easy/normal/hard, ghost-deck bot)
      replay/  test/
    content/    # ages, units, turrets, specials, rarities, chests, loot tables + schemas; ms→ticks compiler; contentHash
    meta/       # profile, collection, deck rules, upgrades, chest rolls, economy (pure TS, tested)
  apps/
    web/
      src/app/        boot, router, screens
      src/ui/         Preact: home, collection, deck builder, chests, profile, settings
      src/render/     BattleView, interpolation, camera, hud, vfx, juice
      src/visuals/    registry.ts, procedural/ (part drawers, rigs, clips), adapters/{procedural,atlas,spine}
      src/audio/      mixer.ts, sounds.ts (zzfx/jsfxr defs), unlock.ts
      src/save/       store.ts, slots.ts, schema.ts, migrations/
      src/dev/        art gallery, debug overlay, time-scale, replay viewer, spawn panel
      assets-src/     raw art for AssetPack ({tps} folders)   public/assets/ (generated)
    sim-cli/    # node: balance matrix, replay verify, CSV reports
    server/     # later: Colyseus 0.17 room hosting packages/sim
```

Enforce the layering with ESLint `no-restricted-imports`/globals: `sim` and `meta` must not import `pixi.js`, the DOM or `web`.

---

## 8. Risks and open points
- Phaser vs Pixi is a reversible choice only if the sim/view boundary is respected. With the boundary in place, a renderer swap costs about one `render/` + `visuals/adapters` rewrite.
- WebGPU on iOS is new (Safari 26). Stay on WebGL2 by default.
- TS 7 is two months old. If typescript-eslint or other tooling lags, pin 6.0.
- The lockstep vs state-sync decision can wait. Determinism is required either way for replays, tests and balance.
- A Capacitor app escapes Safari's 7-day eviction, but its WebView storage is still OS-evictable. Use native storage there.

---

## Sources
- Phaser 4 renderer: https://phaser.io/news/2026/04/phaser-4-renderer-faster-cleaner-and-built-for-modern-games
- Phaser releases: https://github.com/phaserjs/phaser/releases
- Phaser README (sizes): https://github.com/phaserjs/phaser/blob/master/README.md
- Phaser v4 migration guide: https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md
- Phaser 3 vs 4: https://phaser.io/news/2026/05/phaser-3-vs-phaser-4
- Phaser vs Kaplay vs Excalibur: https://phaser.io/news/2026/04/phaser-vs-kaplay-vs-excalibur-2d-web-game-framework
- Phaser skills: https://github.com/phaserjs/phaser/tree/master/skills
- GameFromScratch on Phaser 4: https://gamefromscratch.com/phaser-4-released/
- Phaser Loader: https://docs.phaser.io/phaser/concepts/loader
- PixiJS v8 launch: https://pixijs.com/blog/pixi-v8-launches
- PixiJS releases: https://github.com/pixijs/pixijs/releases
- PixiJS June 2026 update: https://pixijs.com/blog/june-2026
- PixiJS 8.16.0: https://pixijs.com/blog/8.16.0
- PixiJS performance tips: https://pixijs.com/8.x/guides/concepts/performance-tips
- PixiJS Graphics: https://pixijs.com/8.x/guides/components/scene-objects/graphics
- PixiJS SVG: https://pixijs.com/8.x/guides/components/assets/svg
- PixiJS manifests: https://pixijs.com/8.x/guides/components/assets/manifest
- AssetPack TexturePacker pipe: https://pixijs.io/assetpack/docs/guide/pipes/texture-packer/
- wpdean on PixiJS size: https://wpdean.com/what-is-pixijs/
- Cinevva engine comparison: https://app.cinevva.com/guides/web-game-engines-comparison
- JS rendering benchmark: https://github.com/Shirajuki/js-game-rendering-benchmark
- Excalibur 0.30.0: https://excaliburjs.com/blog/excalibur-0-30-0-released/
- Excalibur releases: https://github.com/excaliburjs/excalibur/releases
- Kaplay releases: https://github.com/kaplayjs/kaplay/releases
- Kaplay performance guide: https://github.com/kaplayjs/kaplay/wiki/Performance-guide
- Godot web export docs: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
- Godot forum (mobile web art pipeline): https://forum.godotengine.org/t/godot-4-web-export-stutters-on-mobile-its-probably-your-art-pipeline-not-your-code-31fps-to-60fps-benchmarks-inside/143268
- HN on Godot 4 web: https://news.ycombinator.com/item?id=39402953
- dev.to on Godot 4 web: https://dev.to/ziva/godot-4-fur-web-spiele-export-wasm-und-browser-performance-4315
- WebKit, Safari 26.0 features: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- Gaffer, Fix Your Timestep: https://gafferongames.com/post/fix_your_timestep/
- Gaffer, Deterministic Lockstep: https://gafferongames.com/post/deterministic_lockstep/
- SnapNet, lockstep netcode: https://www.snapnet.dev/blog/netcode-architectures-part-1-lockstep/
- Gemserk, Clash Royale multiplayer analysis: https://blog.gemserk.com/2016/09/05/analyzing-clash-royale-multiplayer-solution/
- Mozilla fdlibm thread: https://groups.google.com/a/mozilla.org/g/dev-platform/c/0dxAO-JsoXI/m/eEhjM9VsAgAJ
- libm precision across engines: https://zenn.dev/mod_poppo/articles/libm-precision?locale=en
- bryc PRNG survey: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
- game-balance-sim: https://github.com/Dungeons-Moles/game-balance-sim
- Colyseus 0.17: https://colyseus.io/blog/colyseus-017-is-here/
- Spine pricing: https://en.esotericsoftware.com/spine-purchase
- spine-pixi docs: https://esotericsoftware.com/spine-pixi
- spine-pixi-v8 release: https://en.esotericsoftware.com/blog/spine-pixi-v8-runtime-released
- spine-phaser docs: http://esotericsoftware.com/spine-phaser
- Rive web runtime: https://rive.app/docs/runtimes/web/web-js
- Ludo AI sprite generator comparison: https://ludo.ai/compare/best-ai-sprite-generators
- OpenAI community, sprite sheets with gpt-image-2: https://community.openai.com/t/developing-sprite-sheets-with-gpt-image-2/1379831
- OpenAI community, transparent backgrounds: https://community.openai.com/t/transparent-backgrounds-are-now-available-in-preview-for-gpt-image-2-in-the-api/1391541
- ZzFX: https://github.com/KilledByAPixel/ZzFX
- jsfxr: https://github.com/chr15m/jsfxr
- unmute-ios-audio: https://github.com/feross/unmute-ios-audio
- MDN storage quotas: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- selfstore, browser storage durability: https://selfstore.dev/blog/browser-storage-is-not-durable
- Safari 7-day storage cap: https://support.didomi.io/apple-adds-a-7-day-cap-on-all-script-writable-storage
- Capacitor storage guide: https://capacitorjs.com/docs/guides/storage
- Capacitor 8 announcement: https://ionic.io/blog/announcing-capacitor-8
- Bugnet, web game saves: https://bugnet.io/blog/game-save-best-practices-web
- npm-compare, IndexedDB libraries: https://npm-compare.com/dexie,idb-keyval,localforage
- Vite 8: https://vite.dev/blog/announcing-vite8
- Vitest 4: https://vitest.dev/blog/vitest-4
- TypeScript 6.0: https://visualstudiomagazine.com/articles/2026/03/23/typescript-6-0-ships-as-final-javascript-based-release-clears-path-for-go-native-7-0.aspx
- TypeScript 7: https://morello.dev/blog/typescript-7-is-here
- Preact: https://preactjs.com/
- Juice it or lose it: https://www.youtube.com/watch?v=Fy0aCDmgnxg
- The art of screenshake: https://www.youtube.com/watch?v=AJdEqssNZ-U
