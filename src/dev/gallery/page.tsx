/**
 * Art gallery (WP4). Temporary bootstrap: renders puppet sheets on a 2D canvas.
 */
import { useEffect, useRef } from 'preact/hooks';
import { drawPuppet } from '@/visuals/draw';
import { getPart } from '@/visuals/parts/registry';
import { STONE_PUPPETS } from '@/visuals/puppets/stone';
import { CanvasTarget } from '@/visuals/targets';
import { TEAM_COLORS } from '@/visuals/palette';

export const title = 'Art gallery';

export default function Gallery() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = 1400;
    c.height = 700;
    ctx.fillStyle = '#d9d2bf';
    ctx.fillRect(0, 0, c.width, c.height);
    let x = 80;
    for (const p of STONE_PUPPETS) {
      for (const [scale, side] of [
        [4, 0],
        [4, 1],
        [1.64, 0],
        [0.82, 0],
      ] as const) {
        const t = new CanvasTarget(ctx, [scale, 0, 0, scale, x, 600]);
        drawPuppet(p, t, [1, 0, 0, 1, 0, 0], { parts: getPart, teamColor: TEAM_COLORS.default[side] });
        x += scale * 60 + 40;
      }
    }
  }, []);
  return <canvas ref={ref} data-testid="gallery-canvas" style={{ display: 'block' }} />;
}
