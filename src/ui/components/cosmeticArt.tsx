/**
 * Cosmetic collection art in the UI (DESIGN A18.9.4). The UI may not import the visuals (B2), so the
 * app provides a function that turns a collection key (`nationalFlag.dk`) into an image URL (the
 * visuals' code-drawn SVG; emotes animate by themselves) through {@link CosmeticArtContext}. Without a
 * provider (tests, dev pages) a neutral placeholder shows instead.
 */
import './cosmeticArt.css';
import type { AgeId, CardId, Side } from '@/contracts';
import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { usePortrait } from './kit';

export interface CosmeticImageOptions {
  /** Team colour for team paints (base flags, some decorations). */
  team?: number;
  /** Emote motion (off for Reduce motion). */
  animate?: boolean;
  /** A base skin's tint swatch or particle layer, drawn over the real base picture ({@link BaseLook}). */
  layer?: 'tint' | 'fx';
  /** Backdrops: the age whose half of the lane the still shows ({@link BackdropLook}). */
  age?: AgeId;
  /** Backdrops: the small still for a collection tile. */
  thumb?: boolean;
  /** Backdrops: only a still already painted, else null (never paints). */
  cached?: boolean;
}

export type CosmeticImageFn = (key: string, o?: CosmeticImageOptions) => string | null;

export const CosmeticArtContext = createContext<CosmeticImageFn | null>(null);

export function useCosmeticImage(): CosmeticImageFn | null {
  return useContext(CosmeticArtContext);
}

/** An item's picture, or a soft placeholder when no art provider is present. */
export function CosmeticImage(p: { item: string; class?: string; team?: number; animate?: boolean; testid?: string }) {
  const fn = useCosmeticImage();
  const url = fn ? fn(p.item, { ...(p.team !== undefined ? { team: p.team } : {}), ...(p.animate !== undefined ? { animate: p.animate } : {}) }) : null;
  if (!url) return <span class={`cos-img cos-img--empty ${p.class ?? ''}`} aria-hidden="true" data-testid={p.testid} />;
  return <img class={`cos-img ${p.class ?? ''}`} src={url} alt="" aria-hidden="true" draggable={false} data-testid={p.testid} />;
}

/**
 * A base as the lane draws it (A18.9.4): the age's own base picture with a base skin's body tint
 * multiplied over it and its ambient particles on top, so the preview matches the battle. Without a
 * portrait provider (tests, some dev pages) the skin's code-drawn keep stands in. `side: 1` flies the
 * opponent's team colour on the base's banners and trims.
 */
export function BaseLook(p: { age: AgeId; skin: string | null; animate?: boolean; testid?: string; side?: Side }) {
  const fn = useCosmeticImage();
  const body = usePortrait(`base.${p.age}` as CardId, { size: 256, plate: false, ...(p.side ? { side: p.side } : {}) });
  if (!body) return <CosmeticImage item={p.skin ?? 'baseSkin.default'} {...(p.testid ? { testid: p.testid } : {})} />;
  const tint = p.skin && fn ? fn(p.skin, { layer: 'tint' }) : null;
  const fx = p.skin && fn ? fn(p.skin, { layer: 'fx', animate: p.animate ?? true }) : null;
  const mask = `url("${body}")`;
  return (
    <span class="cos-base" data-testid={p.testid} data-age={p.age} data-skin={p.skin ?? ''} aria-hidden="true">
      <img class="cos-base__img" src={body} alt="" draggable={false} />
      {tint ? <img class="cos-base__img cos-base__tint" src={tint} alt="" draggable={false} style={{ maskImage: mask, WebkitMaskImage: mask }} /> : null}
      {fx ? <img class="cos-base__img cos-base__fx" src={fx} alt="" draggable={false} /> : null}
    </span>
  );
}

/**
 * Backdrop stills are painted on the main thread (the lane's own painters, 10-70 ms each), so the
 * screens never paint a row of them in one go (review 5: an age switch froze Customize for 300 ms):
 * each still waits its turn and one is painted per animation frame, the one the player is looking at
 * first. A job whose tile has gone away is dropped.
 */
interface StillJob {
  run: () => void;
  urgent: boolean;
  live: boolean;
}
const stillQueue: StillJob[] = [];
let stillPump = 0;
function pumpStills(): void {
  stillPump = 0;
  const i = stillQueue.findIndex((j) => j.urgent && j.live);
  const job = i >= 0 ? stillQueue.splice(i, 1)[0] : stillQueue.shift();
  if (job?.live) job.run();
  while (stillQueue.length && !stillQueue[0]!.live) stillQueue.shift();
  if (stillQueue.length) stillPump = requestAnimationFrame(pumpStills);
}
function queueStill(run: () => void, urgent: boolean): StillJob {
  const job = { run, urgent, live: true };
  stillQueue.push(job);
  if (!stillPump) stillPump = requestAnimationFrame(pumpStills);
  return job;
}

/**
 * A backdrop still: at once when painted before, else painted in its turn. Meanwhile a tile shows a
 * shimmer; the big preview (`keepLast`) keeps the still it showed before.
 */
function useBackdropStill(fn: CosmeticImageFn | null, key: string, age: AgeId, thumb: boolean, keepLast: boolean): string | null {
  const id = `${key}|${age}|${thumb ? 't' : 'p'}`;
  const opts: CosmeticImageOptions = thumb ? { age, thumb: true } : { age };
  const ready = fn ? fn(key, { ...opts, cached: true }) : null;
  const [got, setGot] = useState<{ id: string; url: string | null } | null>(ready ? { id, url: ready } : null);
  const lazy = typeof requestAnimationFrame === 'function';
  useEffect(() => {
    if (!fn || ready || !lazy) return;
    const job = queueStill(() => setGot({ id, url: fn(key, opts) }), keepLast);
    return () => {
      job.live = false;
    };
  }, [fn, id]);
  if (!fn) return null;
  if (ready) return ready;
  // no animation frames (tests, some dev pages): paint now
  if (!lazy) return fn(key, opts);
  return got && (got.id === id || keepLast) ? got.url : null;
}

/**
 * A battle backdrop skin as the lane paints it (A18.9.4 "Backdrops"): a still of your half of the
 * lane in `age` (the same painters and theme pass as the battle) with the theme's weather moving over
 * it. `skin` null is the age's classic sky. `thumb`: a collection tile's smaller, sky-heavy crop.
 * A still not painted yet waits its turn behind a soft shimmer (the big preview keeps its last still
 * meanwhile). Without an art provider a soft sky placeholder shows.
 */
export function BackdropLook(p: { skin: string | null; age: AgeId; animate?: boolean; testid?: string; thumb?: boolean }) {
  const fn = useCosmeticImage();
  const still = useBackdropStill(fn, p.skin ?? 'backdrop.classic', p.age, !!p.thumb, !p.thumb);
  const fx = p.skin && fn ? fn(p.skin, { layer: 'fx', animate: p.animate ?? true }) : null;
  return (
    <span class={`cos-bd${still ? '' : ' is-pending'}`} data-testid={p.testid} data-age={p.age} data-skin={p.skin ?? ''} aria-hidden="true">
      {still ? <img class="cos-bd__img" src={still} alt="" draggable={false} key={`${p.skin ?? ''}|${p.age}`} /> : <span class="cos-bd__img cos-bd__img--empty" />}
      {fx ? <img class="cos-bd__fx" src={fx} alt="" draggable={false} /> : null}
    </span>
  );
}

/**
 * A side's flags as a small waving pair (VS screen, profile): the base flag on the team colour and
 * the national flag when the side flies one (A18.9.4). Renders nothing when the side has neither.
 */
export function LookFlags(p: { baseFlag?: string | null | undefined; nationalFlag?: string | null | undefined; team: number; testid?: string; still?: boolean; large?: boolean }) {
  if (!p.baseFlag && !p.nationalFlag) return null;
  return (
    <span class={`cos-flags${p.still ? ' is-still' : ''}${p.large ? ' cos-flags--lg' : ''}`} data-testid={p.testid}>
      {p.baseFlag ? (
        <span class="cos-flags__flag">
          <CosmeticImage item={p.baseFlag} team={p.team} />
        </span>
      ) : null}
      {p.nationalFlag ? (
        <span class="cos-flags__flag cos-flags__flag--nation">
          <CosmeticImage item={p.nationalFlag} />
        </span>
      ) : null}
    </span>
  );
}
