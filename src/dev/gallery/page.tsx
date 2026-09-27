/**
 * Art gallery (WP4). Temporary bootstrap: renders puppet sheets on a 2D canvas.
 */
import { useEffect, useRef } from 'preact/hooks';
import { drawPuppet, puppetBounds } from '@/visuals/draw';
import { getPart } from '@/visuals/parts/registry';
import { allPuppets } from '@/visuals/library';
import { CanvasTarget } from '@/visuals/targets';
import { TEAM_COLORS } from '@/visuals/palette';
import type { PuppetDef } from '@/visuals/types';

export const title = 'Art gallery';

export default function Gallery() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const q = new URLSearchParams(window.location.hash.split('/')[1] ?? '');
    const scale = Number(q.get('s') ?? '2');
    const age = q.get('age');
    c.width = 1800;
    c.height = 1100;
    ctx.fillStyle = '#d9d2bf';
    ctx.fillRect(0, 0, c.width, c.height);
    let x = 20;
    let y = 20;
    let rowH = 0;
    const only = q.get('only')?.split(',');
    const all: PuppetDef[] = allPuppets().filter((p) => (only ? only.some((o) => p.id.endsWith(o)) : age ? p.age === age : p.age !== null));
    for (const p of all) {
      const b = puppetBounds(p, getPart);
      const w = (b.maxX - b.minX) * scale;
      const h = (b.maxY - b.minY) * scale;
      if (x + w > c.width - 20) {
        x = 20;
        y += rowH + 30;
        rowH = 0;
      }
      const t = new CanvasTarget(ctx, [scale, 0, 0, scale, x - b.minX * scale, y - b.minY * scale]);
      drawPuppet(p, t, [1, 0, 0, 1, 0, 0], { parts: getPart, teamColor: TEAM_COLORS.default[0] });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#333';
      ctx.font = '12px monospace';
      ctx.fillText(`${p.id} ${Math.round(b.maxX - b.minX)}x${Math.round(b.maxY - b.minY)}`, x, y + h + 14);
      x += Math.max(w, 150) + 30;
      rowH = Math.max(rowH, h + 16);
    }
  }, []);
  return <canvas ref={ref} data-testid="gallery-canvas" style={{ display: 'block' }} />;
}
