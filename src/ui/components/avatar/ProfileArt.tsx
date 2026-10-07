/**
 * Picture art for the profile look (AUDIT #9): each banner as a cloth pennant with its arena's colours
 * and emblem, each frame as a metal ring around the General, and the title as a parchment ribbon. Drawn
 * to the art sheet (cel shadow band, highlight, colour-matched outline). Banners use arena colours, not
 * the reserved team blue and orange (ui-plan 3.2).
 */
import { ramp } from './color';
import { star } from './path';

interface BannerLook {
  cloth: string;
  trim: string;
  emblem: string;
  /** Emblem path in a 40 × 52 box. */
  d: string;
}

const BANNERS: Record<string, BannerLook> = {
  tar_pit: { cloth: '#5a3a2a', trim: '#e8b23a', emblem: '#ff9a3a', d: 'M20 14C26 22 29 27 29 32A9 9 0 0 1 11 32C11 27 14 22 20 14Z' },
  frostfang: { cloth: '#3f8f9a', trim: '#e6f6ff', emblem: '#e6f6ff', d: 'M13 16L20 38L27 16L23 18L20 30L17 18Z' },
  moat: { cloth: '#3f7f46', trim: '#c7d0da', emblem: '#c7d0da', d: 'M12 36V20H15V23H18V20H22V23H25V20H28V36Z' },
  harbor: { cloth: '#26304a', trim: '#e8b23a', emblem: '#e8b23a', d: 'M19 14H21V16H25V18H21V32Q26 31 28 27L30 29Q26 36 20 36Q14 36 10 29L12 27Q14 31 19 32V18H15V16H19Z' },
  barbed: { cloth: '#6b6e4a', trim: '#b0b0b0', emblem: '#d8dde2', d: 'M11 17L29 35M29 17L11 35M14 26H26' },
  neon: { cloth: '#7a2a8e', trim: '#5ff2ff', emblem: '#ffe96a', d: 'M23 12L13 28H19L16 40L28 22H22Z' },
  starfield: { cloth: '#2a2450', trim: '#ffe9a0', emblem: '#ffe9a0', d: star(20, 26, 5, 10, 4.2) },
  rift: { cloth: '#3a1e4a', trim: '#c86ab0', emblem: '#ff9ad0', d: 'M22 12L16 22L23 26L15 40L27 26L20 22L26 12Z' },
};

const STROKED = new Set(['barbed']);

/**
 * A banner's cloth pennant (`width` px wide; the height follows). `backer` draws the cloth that hangs
 * behind a portrait: no rod or emblem (the portrait covers them, and a rod corner peeking past a round
 * plate reads as a stray bar), a trim hem on the swallowtail, and it stretches to the box CSS gives it so
 * the tails end exactly where the layout reserves room for them.
 */
export function BannerArt(p: { id: string; width?: number; class?: string; testid?: string; backer?: boolean }) {
  const b = BANNERS[p.id] ?? BANNERS.tar_pit!;
  const w = p.width ?? 40;
  const c = ramp(b.cloth, 'cloth');
  if (p.backer) {
    const back = 'M2 0H38V58L20 49L2 58Z';
    return (
      <svg class={`av-banner av-banner--backer ${p.class ?? ''}`} viewBox="0 0 40 60" preserveAspectRatio="none" aria-hidden="true" data-testid={p.testid}>
        <path d={back} fill={c.fill} />
        <path d="M2 0H38V58L20 49L2 58ZM2 0H38V53L20 44L2 53Z" fill-rule="evenodd" fill={c.shadow} />
        <path d="M5 0H8V52L5 54Z" fill={c.hl} opacity=".5" />
        <path d={back} fill="none" stroke={c.line} stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      </svg>
    );
  }
  const t = ramp(b.trim, 'gold');
  const e = ramp(b.emblem, 'matte');
  const cloth = 'M4 4H36V48L20 40L4 48Z';
  return (
    <svg class={`av-banner ${p.class ?? ''}`} viewBox="0 0 40 54" width={w} height={(w * 54) / 40} aria-hidden="true" data-testid={p.testid}>
      <path d={cloth} fill={c.fill} />
      <path d="M4 4H36V48L20 40L4 48ZM4 4H36V44L20 36L4 44Z" fill-rule="evenodd" fill={c.shadow} />
      <path d="M8 6H12V42L8 44Z" fill={c.hl} opacity=".55" />
      <path d="M14 10Q20 12 26 10M12 46Q20 42 28 46" stroke={c.shadow} stroke-width="1.2" fill="none" opacity=".8" />
      {STROKED.has(p.id) ? (
        <path d={b.d} fill="none" stroke={e.fill} stroke-width="3.2" stroke-linecap="round" />
      ) : (
        <path d={b.d} fill={e.fill} stroke={e.line} stroke-width="1.4" stroke-linejoin="round" />
      )}
      <path d={cloth} fill="none" stroke={c.line} stroke-width="2.6" stroke-linejoin="round" />
      <rect x="1" y="1.5" width="38" height="5" rx="2.5" fill={t.fill} stroke={t.line} stroke-width="1.6" />
      <rect x="3" y="2.4" width="20" height="1.4" rx=".7" fill={t.hl} />
    </svg>
  );
}

/** Each frame's metal: fill and a highlight (rings are drawn by CSS around the avatar plate). */
export const FRAME_COLORS: Record<string, string> = {
  none: '#3a3f55',
  bark: '#8e6440',
  bone: '#e8dcc0',
  bronze: '#c8893a',
  iron: '#7f868e',
  brass: '#d6a640',
  steel: '#c7d0da',
  chrome: '#e9ecf0',
  aeon: '#b98aff',
};

/** The CSS variables of a frame ring (`--frame`, plus a bevel ramp) for an `.ui-avatar`. */
export function frameStyle(id: string): Record<string, string> {
  const r = ramp(FRAME_COLORS[id] ?? FRAME_COLORS.none!, id === 'none' ? 'matte' : 'metal');
  return { '--frame': r.fill, '--frame-hl': r.hl, '--frame-sh': r.shadow, '--frame-line': r.line };
}

/** The title as a parchment ribbon with folded ends. */
export function TitleRibbon(p: { text: string; class?: string; testid?: string }) {
  return (
    <span class={`av-ribbon ${p.class ?? ''}`} data-testid={p.testid}>
      <span class="av-ribbon__end av-ribbon__end--l" aria-hidden="true" />
      <span class="av-ribbon__text">{p.text}</span>
      <span class="av-ribbon__end av-ribbon__end--r" aria-hidden="true" />
    </span>
  );
}
