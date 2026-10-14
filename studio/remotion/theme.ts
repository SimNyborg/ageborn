// The studio's look: the game's own palette (src/ui/theme.css, render/teamColors.ts) and type
// (Barlow Condensed for display, Inter for text, both SIL OFL), plus the wordmark's bronze-to-gold ramp.
import { continueRender, delayRender, staticFile } from 'remotion';

export const C = {
  bg: '#0f1218',
  ink: '#1d1405',
  outline: '#2a1606',
  text: '#f4efe4',
  text2: '#c3bcae',
  gold: '#f2b52c',
  goldHi: '#ffd466',
  goldLo: '#b7801a',
  blue: '#2f7df6',
  blueHi: '#5b9bff',
  blueLo: '#1f5fd6',
  orange: '#f28a1e',
  orangeHi: '#ffad5a',
  orangeLo: '#b85e0a',
  good: '#5fd08a',
  bad: '#ff5a4a',
  common: '#b8c0cc',
  rare: '#22b8cf',
  epic: '#a855f7',
  legendary: '#f5b82e',
} as const;

/** The wordmark's ramp (light gold at the top to bronze at the bottom). */
export const GOLD_RAMP = 'linear-gradient(180deg, #fff6c8 0%, #ffd866 34%, #f5b82e 52%, #d98e2a 74%, #9a5a1c 100%)';
export const BLUE_RAMP = 'linear-gradient(180deg, #e2efff 0%, #8fc0ff 30%, #4b92ff 55%, #2f7df6 72%, #1a4fb0 100%)';
export const ORANGE_RAMP = 'linear-gradient(180deg, #fff1dc 0%, #ffc27a 30%, #ff9d3a 55%, #f28a1e 72%, #a5520c 100%)';
export const WHITE_RAMP = 'linear-gradient(180deg, #ffffff 0%, #ffffff 55%, #dfe6ef 100%)';
export const RED_RAMP = 'linear-gradient(180deg, #ffe1dc 0%, #ff8a7a 35%, #ff4a3a 60%, #c9392f 80%, #7a1a14 100%)';

export const RAMPS: Record<string, string> = { gold: GOLD_RAMP, blue: BLUE_RAMP, orange: ORANGE_RAMP, white: WHITE_RAMP, red: RED_RAMP };

export const RARITY: Record<string, { color: string; ramp: string; label: string }> = {
  common: { color: C.common, ramp: 'linear-gradient(180deg,#ffffff,#c9d0da 60%,#7f8896)', label: 'COMMON' },
  rare: { color: C.rare, ramp: 'linear-gradient(180deg,#e4fbff,#5fdcef 45%,#22b8cf 70%,#0e6f80)', label: 'RARE' },
  epic: { color: C.epic, ramp: 'linear-gradient(180deg,#f5e8ff,#c99bff 40%,#a855f7 70%,#5a23a8)', label: 'EPIC' },
  legendary: { color: C.legendary, ramp: GOLD_RAMP, label: 'LEGENDARY' },
};

export const FONT_DISPLAY = "'Barlow Condensed', 'Arial Narrow', sans-serif";
export const FONT_TEXT = "'Inter', 'Liberation Sans', sans-serif";

/** Text-safe area of the 1080x1920 frame (Instagram's UI covers the rest). */
export const SAFE = { top: 250, bottom: 400, right: 120, left: 60 };

const FACES: [string, string, string, string][] = [
  ['Barlow Condensed', 'barlow-condensed-latin-600-normal.woff2', '600', 'normal'],
  ['Barlow Condensed', 'barlow-condensed-latin-700-normal.woff2', '700', 'normal'],
  ['Barlow Condensed', 'barlow-condensed-latin-800-normal.woff2', '800', 'normal'],
  ['Barlow Condensed', 'barlow-condensed-latin-900-normal.woff2', '900', 'normal'],
  ['Barlow Condensed', 'barlow-condensed-latin-800-italic.woff2', '800', 'italic'],
  ['Barlow Condensed', 'barlow-condensed-latin-900-italic.woff2', '900', 'italic'],
  ['Inter', 'inter-latin-500-normal.woff2', '500', 'normal'],
  ['Inter', 'inter-latin-600-normal.woff2', '600', 'normal'],
  ['Inter', 'inter-latin-700-normal.woff2', '700', 'normal'],
  ['Inter', 'inter-latin-800-normal.woff2', '800', 'normal'],
  ['Inter', 'inter-latin-900-normal.woff2', '900', 'normal'],
];

let loading: Promise<void> | null = null;

/** Loads the local fonts once (no network); rendering waits for them. */
export function loadFonts(): void {
  if (loading || typeof document === 'undefined') return;
  const handle = delayRender('fonts');
  loading = Promise.all(
    FACES.map(async ([family, file, weight, style]) => {
      const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format('woff2')`, { weight, style });
      await face.load();
      (document.fonts as unknown as { add(f: FontFace): void }).add(face);
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error('font load failed', e);
      continueRender(handle);
    });
}

/** Age accents (the game's AGE_COLOR accents, src/ui/components/icons.tsx) and a title ramp per age. */
export const AGE: Record<string, { name: string; accent: string; ramp: string }> = {
  stone: { name: 'Stone Age', accent: '#C98A3D', ramp: 'linear-gradient(180deg,#fff1d6 0%,#f0c27a 40%,#c98a3d 70%,#7a4a1c 100%)' },
  bronze: { name: 'Bronze Age', accent: '#B8863B', ramp: 'linear-gradient(180deg,#fff4d0 0%,#f2cf7a 38%,#c99a3f 66%,#6e4a16 100%)' },
  medieval: { name: 'Medieval Age', accent: '#D4A437', ramp: 'linear-gradient(180deg,#f2f6ff 0%,#c4d2e8 40%,#8ea3c4 68%,#3f5170 100%)' },
  gunpowder: { name: 'Gunpowder Age', accent: '#C9A227', ramp: 'linear-gradient(180deg,#ffe4dc 0%,#ff9a7a 38%,#d9452f 68%,#7a1a10 100%)' },
  industrial: { name: 'Industrial Age', accent: '#B06A3B', ramp: 'linear-gradient(180deg,#ffe9d8 0%,#f0a878 38%,#b06a3b 68%,#5a2e14 100%)' },
  modern: { name: 'Modern Age', accent: '#B0306A', ramp: 'linear-gradient(180deg,#f1f7e0 0%,#c8d68e 38%,#8a9a4a 68%,#3e4a1c 100%)' },
  future: { name: 'Future Age', accent: '#29E3F5', ramp: 'linear-gradient(180deg,#eaffff 0%,#8ff4ff 38%,#29c9f5 66%,#0d5f8a 100%)' },
  cosmic: { name: 'Cosmic Age', accent: '#8E44C8', ramp: 'linear-gradient(180deg,#f8eaff 0%,#d9a8ff 38%,#a55cf0 66%,#4a1a80 100%)' },
};
export const AGE_ORDER = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];
