/**
 * Plays a unit clip from its Blender sheet in the menus (UI art audit #6): the strip from
 * {@link useSpriteStrip} as a CSS background stepped through its cells (`steps()`, motion.css). Reduce
 * motion shows the first frame still. `fallback` draws while the strip loads or when the unit has no
 * sheet. Decorative (`aria-hidden`).
 */
import type { CardId } from '@/contracts';
import type { ComponentChildren } from 'preact';
import { useSpriteStrip } from './kit';

export function SpriteStrip(p: { card: CardId; clip: 'idle' | 'walk'; size: number; frameMs: number; class?: string; fallback?: ComponentChildren; flip?: boolean }) {
  const art = useSpriteStrip(p.card, p.clip, p.size);
  if (!art) return <>{p.fallback ?? null}</>;
  return (
    <span
      class={`ui-strip${p.flip ? ' ui-strip--flip' : ''}${p.class ? ` ${p.class}` : ''}`}
      aria-hidden="true"
      data-clip={p.clip}
      style={{
        backgroundImage: `url("${art.url}")`,
        '--strip-frames': art.frames,
        '--strip-ms': `${art.frames * p.frameMs}ms`,
      }}
    />
  );
}
