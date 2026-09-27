/**
 * A plain 2D-canvas picture of a match for the bot viewer: the lane, both bases with HP, turrets,
 * units as boxes (height by size, colour by side, air units raised), power telegraphs and the hold
 * line. It needs nothing but the sim state, so the viewer works before the battle renderer (WP5) is
 * wired in. Dev tool only.
 */
import type { CompiledContent, SimState } from '@/contracts';

const LANE_LU = 1200;
const BASE_LU = 140;
const MARGIN_LU = 20;
const WORLD_LU = LANE_LU + 2 * (BASE_LU + MARGIN_LU);
const SIDE_COLOR = ['#4f8fe8', '#f08a3c'] as const;
const SIZE_LU: Record<string, number> = { small: 24, medium: 32, large: 48, huge: 80 };

export function drawLane(ctx: CanvasRenderingContext2D, s: Readonly<SimState>, content: CompiledContent, w: number, h: number): void {
  const scale = w / WORLD_LU;
  const xOf = (xMilli: number): number => (BASE_LU + MARGIN_LU + xMilli / 1000) * scale;
  const ground = h * 0.78;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1b1a2e';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2d3b2a';
  ctx.fillRect(0, ground, w, h - ground);

  // Hold lines (p = 320) and mid-lane.
  ctx.strokeStyle = '#3a3960';
  ctx.setLineDash([4, 4]);
  for (const x of [320, 600, 880]) {
    ctx.beginPath();
    ctx.moveTo(xOf(x * 1000), 8);
    ctx.lineTo(xOf(x * 1000), ground);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Bases and turrets.
  for (const side of [0, 1] as const) {
    const sd = s.sides[side];
    const left = side === 0 ? MARGIN_LU * scale : xOf(1200000);
    const bw = BASE_LU * scale;
    ctx.fillStyle = SIDE_COLOR[side];
    ctx.globalAlpha = 0.35;
    ctx.fillRect(left, ground - h * 0.45, bw, h * 0.45);
    ctx.globalAlpha = 1;
    const hpBp = sd.baseMaxHp > 0 ? Math.max(0, sd.baseHp) / sd.baseMaxHp : 0;
    ctx.fillStyle = '#333';
    ctx.fillRect(left, ground - h * 0.52, bw, 6);
    ctx.fillStyle = hpBp > 0.25 ? '#6fd26f' : '#e05050';
    ctx.fillRect(left, ground - h * 0.52, bw * hpBp, 6);
    sd.turrets.forEach((t, m) => {
      const y = ground - h * 0.12 - m * h * 0.09;
      const x = side === 0 ? left + bw - 14 : left + 2;
      ctx.fillStyle = m < sd.mountsOwned ? '#555' : '#2a2a2a';
      ctx.fillRect(x, y, 12, 8);
      if (t) {
        ctx.fillStyle = t.state === 'active' ? SIDE_COLOR[side] : '#aaa';
        ctx.fillRect(x + 2, y + 1, 8, 6);
      }
    });
    if (sd.stance === 'hold') {
      ctx.fillStyle = SIDE_COLOR[side];
      ctx.font = '10px monospace';
      ctx.fillText('HOLD', side === 0 ? xOf(320000) + 3 : xOf(880000) - 30, 14);
    }
  }

  // Power casts.
  for (const c of s.casts) {
    const half = (c.zone / 1000 / 2) * scale;
    ctx.fillStyle = SIDE_COLOR[c.side];
    ctx.globalAlpha = 0.18;
    ctx.fillRect(xOf(c.x) - half, 20, half * 2, ground - 20);
    ctx.globalAlpha = 1;
  }

  // Units.
  for (const u of s.units) {
    const def = content.units[u.card];
    const size = SIZE_LU[def?.size ?? 'medium'] ?? 32;
    const uw = Math.max(2, size * scale);
    const uh = Math.max(4, size * scale * 1.1);
    const y = u.air ? ground - h * 0.42 : ground - uh;
    ctx.fillStyle = SIDE_COLOR[u.side];
    ctx.globalAlpha = u.mode === 'dying' ? 0.3 : u.summoned ? 0.6 : 1;
    ctx.fillRect(xOf(u.x) - uw / 2, y, uw, uh);
    ctx.globalAlpha = 1;
    const hp = u.maxHp > 0 ? Math.max(0, u.hp) / u.maxHp : 0;
    ctx.fillStyle = '#6fd26f';
    ctx.fillRect(xOf(u.x) - uw / 2, y - 3, uw * hp, 2);
  }

  // Projectiles.
  ctx.fillStyle = '#f4ecd8';
  for (const p of s.projectiles) ctx.fillRect(xOf(p.x) - 1, ground - h * 0.25, 2, 2);
}
