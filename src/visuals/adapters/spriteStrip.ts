/**
 * Sprite strips for the menus (UI art audit #6): one clip of a unit's Blender sheet (`idle`, `walk`)
 * composited into a horizontal strip of square cells, each frame over its grey `_team` twin tinted in
 * the side's colour, every frame standing on the same foot line. The UI plays the strip with CSS
 * `steps()` (it may not import Pixi or the visuals, B2), so the War Path's banner-bearer and the Home
 * card animate with the battle's own drawings.
 *
 * The UI asks through `ArtProvider.portrait` with the card id `strip:<clip>:<card>` (see
 * `stripRequest`), so no new contract field is needed; the frame count is the strip's width over its
 * height. Pure canvas 2D; `null` when the sheet or clip is missing.
 */
import { loadWorldSheet } from './worldPortrait';

/** `strip:walk:standard_bearer` → { clip: 'walk', card: 'standard_bearer' }, else null. */
export function stripRequest(card: string): { clip: string; card: string } | null {
  const m = /^strip:([a-z_]+):(.+)$/.exec(card);
  return m ? { clip: m[1]!, card: m[2]! } : null;
}

const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

export async function renderSpriteStrip(o: { url: string; clip: string; size: number; teamColor: number }): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  const sheet = await loadWorldSheet(o.url);
  if (!sheet) return null;
  const names = sheet.json.animations[o.clip];
  if (!names || names.length === 0) return null;
  const frames = names.map((n) => ({ base: sheet.json.frames[n], team: sheet.json.frames[`${n}_team`] }));
  if (frames.some((f) => !f.base)) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const f of frames) {
    const s = f.base!.spriteSourceSize;
    x0 = Math.min(x0, s.x);
    y0 = Math.min(y0, s.y);
    x1 = Math.max(x1, s.x + s.w);
    y1 = Math.max(y1, s.y + s.h);
  }
  const size = Math.max(8, Math.round(o.size));
  const k = Math.min((size * 0.96) / (x1 - x0), (size * 0.96) / (y1 - y0));
  const c = document.createElement('canvas');
  c.width = size * frames.length;
  c.height = size;
  const ctx = c.getContext('2d');
  const t = document.createElement('canvas');
  t.width = size;
  t.height = size;
  const tc = t.getContext('2d');
  if (!ctx || !tc) return null;
  ctx.imageSmoothingQuality = 'high';
  tc.imageSmoothingQuality = 'high';
  frames.forEach((f, i) => {
    const ox = size / 2 - ((x0 + x1) / 2) * k;
    const oy = size - size * 0.02 - y1 * k;
    const blit = (target: CanvasRenderingContext2D, fr: NonNullable<typeof f.base>, dx: number): void => {
      const r = fr.frame;
      const s = fr.spriteSourceSize;
      target.drawImage(sheet.image, r.x, r.y, r.w, r.h, dx + ox + s.x * k, oy + s.y * k, s.w * k, s.h * k);
    };
    if (f.team) {
      tc.globalCompositeOperation = 'source-over';
      tc.clearRect(0, 0, size, size);
      blit(tc, f.team, 0);
      tc.globalCompositeOperation = 'multiply';
      tc.fillStyle = css(o.teamColor);
      tc.fillRect(0, 0, size, size);
      tc.globalCompositeOperation = 'destination-in';
      blit(tc, f.team, 0);
      ctx.drawImage(t, i * size, 0);
    }
    blit(ctx, f.base!, i * size);
  });
  return c.toDataURL('image/png');
}
