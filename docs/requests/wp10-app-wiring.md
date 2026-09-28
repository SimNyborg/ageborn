# WP10 → WP11 (and WP12): mounting the capsule show

**From:** WP10 (capsule and crate show). **To:** WP11 (app integration), WP12 (e2e). **Status:** open (Phase 2 wiring).

`src/capsule` exports two Preact screens. Both render a full-screen DOM overlay and mount their Pixi
stage into the app's persistent `Application` (DESIGN B6), then remove it on unmount.

```tsx
import { CapsuleScreen, WardrobeScreen, createCatalog, progressFromCollections } from '@/capsule';

const catalog = createCatalog(content);            // once; presentation lookups from content
const { save: after, reveal } = meta.openCapsule(before, id);   // roll is saved before the show
await saveStore.save(after, { immediate: true });
const c = asContent(content);
const progress = progressFromCollections(before.collection, after.collection,
  { common: c.rarities.cards.common.upgradeCopies, rare: ..., epic: ..., legendary: ... },
  c.economy.maxLevel);

<CapsuleScreen pixi={app} art={art} audio={audio} catalog={catalog}
  reveals={[reveal]}                // several reveals = "Open all"
  progress={progress} pityRules={c.capsules.pity} settings={after.settings}
  pendingCount={after.capsules.pending.length}
  onEquip={(card) => ...} onUpgrade={(card) => ...} onOpenNext={() => ...}
  onShowOdds={() => ...} onDone={() => ...} />

<WardrobeScreen pixi={app} art={art} audio={audio} catalog={catalog} reveal={crateReveal}
  reelReveal={platform.features.reelReveal} pity={after.pity} pityRules={c.capsules.pity}
  settings={after.settings} onEquipSkin={(skin) => ...} onDone={() => ...} />
```

Notes:

- Hide the battle view's root while a capsule screen is mounted (the stage draws its own room backdrop
  over the whole canvas).
- `playMusic` (default true) switches to `music.capsule`; set the next screen's cue after `onDone`.
- `settings` honours `reduceMotion` (no shake, softer flashes), `vibrate` and `teamPreset`.
- For "Open all" pass every reveal at once; the plan shows the summary plus Epic-or-better reveals.
- Pass `newCardProtection={false}` once the arena's drop pool has no unowned card left: new-card
  protection is off then (A6.5 "while unowned cards exist in the pool"), and the screen hides its
  "New card within N" line instead of showing a promise the meta will not keep. Default true.
- Onboarding capsule 1 (`capsule.scriptIndex === 1`) gives its NEW card (Spear Hunter) the 2 s short
  walkout from A8; nothing to wire, it comes from the reveal. The A8 "Tap to crack it" hint can sit
  on top of the screen while `data-phase="wait"`.

## E2E hooks (WP12, B13 step 3 "capsule 1 opens")

`data-testid`: `capsule-screen` (with `data-step` = current step kind and `data-phase` =
`wait`/`run`/`done`), `capsule-tap` (the "Tap!" prompt), `capsule-skip`, `capsule-pity`,
`capsule-amber`, `capsule-summary`, `capsule-summary-item` (with `data-card`), `capsule-equip`,
`capsule-upgrade`, `capsule-open-next`, `capsule-done`. A fast e2e path: click `capsule-skip`
(it stops once at a first-ever Legendary walkout, 9 s), then click `capsule-done`.
