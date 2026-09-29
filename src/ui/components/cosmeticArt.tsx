/**
 * Cosmetic collection art in the UI (DESIGN A18.9.4). The UI may not import the visuals (B2), so the
 * app provides a function that turns a collection key (`nationalFlag.dk`) into an image URL (the
 * visuals' code-drawn SVG; emotes animate by themselves) through {@link CosmeticArtContext}. Without a
 * provider (tests, dev pages) a neutral placeholder shows instead.
 */
import './cosmeticArt.css';
import type { AgeId, CardId } from '@/contracts';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { usePortrait } from './kit';

export interface CosmeticImageOptions {
  /** Team colour for team paints (base flags, some decorations). */
  team?: number;
  /** Emote motion (off for Reduce motion). */
  animate?: boolean;
  /** A base skin's tint swatch or particle layer, drawn over the real base picture ({@link BaseLook}). */
  layer?: 'tint' | 'fx';
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
 * portrait provider (tests, some dev pages) the skin's code-drawn keep stands in.
 */
export function BaseLook(p: { age: AgeId; skin: string | null; animate?: boolean; testid?: string }) {
  const fn = useCosmeticImage();
  const body = usePortrait(`base.${p.age}` as CardId, { size: 256, plate: false });
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
