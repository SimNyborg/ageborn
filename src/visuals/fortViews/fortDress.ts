/**
 * Per-sheet dressing for fort art (A11, A16.14.8; presentation only). A rendered sheet whose team layer
 * reads badly gets its team colour moved onto a code-drawn cloth and a cel pass on top, without a
 * re-render:
 *
 * - `underlay`: the colour the body's team layer is tinted instead of the team colour (it shows through
 *   the sheet's cut-outs), so a shapeless team splat reads as shaded wood;
 * - `banner`: a team-coloured cloth hung on the fort (fractions of the frame's source canvas: centre x,
 *   top y, width, height) with an ink outline, a highlight and a shade, swaying gently;
 * - `ink`: a dark outline around the body (four offset copies of its frame), like the units' outline;
 * - `contrast` / `brightness`: a value lift so the fort separates from the lane.
 *
 * Palisade (review 2026-10-01): dark stakes on a dirt lane with a blue blob in the middle; the cloth
 * covers the blob's cut-out and puts the team colour on a banner.
 */
export interface FortDress {
  underlay?: number;
  banner?: { x: number; y: number; w: number; h: number };
  ink?: number;
  contrast?: number;
  brightness?: number;
}

// X0 Stone wave: the palisade is redrawn in the cartoon kit (art/blender/world/forts_stone.py) with its own
// team banner and outline, so it needs no dressing any more; the mechanism stays for future sheets.
export const FORT_DRESS: Readonly<Record<string, FortDress>> = {};

/** The sheet slug of a fort source (`.../forts/stone/palisade.hd.json` → `palisade`), or null. */
export function fortSlugOf(source: string | null): string | null {
  const m = source ? /\/([a-z0-9_]+)(?:\.hd)?\.json$/.exec(source) : null;
  return m?.[1] ?? null;
}

/** A colour moved toward black (t < 0) or white (t > 0), t in [-1, 1]. */
export function shadeColor(c: number, t: number): number {
  const ch = (v: number): number => Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t);
  return (ch((c >> 16) & 255) << 16) | (ch((c >> 8) & 255) << 8) | ch(c & 255);
}

/** The card still's dressing (the same cloth on the portrait, in fractions of the still's square). */
export const PORTRAIT_DRESS: Readonly<Record<string, Required<Pick<FortDress, 'underlay' | 'banner'>>>> = {};

/** A team cloth (banner with two tails, shade, highlight, ink outline and claw marks) on a 2D canvas, px. */
export function drawCloth2d(g: CanvasRenderingContext2D, cx: number, top: number, w: number, h: number, team: number): void {
  const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
  const l = cx - w / 2;
  const r = cx + w / 2;
  const tail = h * 0.2;
  const line = Math.max(1, w * 0.06);
  const cloth = (): void => {
    g.beginPath();
    g.moveTo(l, top);
    g.lineTo(r, top);
    g.lineTo(r, top + h);
    g.lineTo(cx + w * 0.22, top + h - tail * 0.25);
    g.lineTo(cx, top + h - tail);
    g.lineTo(cx - w * 0.22, top + h - tail * 0.25);
    g.lineTo(l, top + h);
    g.closePath();
  };
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = '#2a1c12';
  g.lineWidth = line * 1.4;
  g.beginPath();
  g.moveTo(l - w * 0.15, top);
  g.lineTo(r + w * 0.15, top);
  g.stroke();
  cloth();
  g.fillStyle = css(team);
  g.fill();
  g.save();
  g.clip();
  g.fillStyle = css(shadeColor(team, -0.32));
  g.fillRect(r - w * 0.3, top, w * 0.3, h);
  g.fillStyle = css(shadeColor(team, 0.38));
  g.fillRect(l, top, w * 0.18, h);
  g.restore();
  g.strokeStyle = '#f2e6c8';
  g.lineWidth = line * 1.1;
  for (let i = -1; i <= 1; i++) {
    const x = cx + i * w * 0.2;
    g.beginPath();
    g.moveTo(x - w * 0.06, top + h * 0.34);
    g.quadraticCurveTo(x + w * 0.02, top + h * 0.5, x + w * 0.07, top + h * 0.66);
    g.stroke();
  }
  cloth();
  g.strokeStyle = '#1b1330';
  g.lineWidth = line;
  g.stroke();
  g.restore();
}
