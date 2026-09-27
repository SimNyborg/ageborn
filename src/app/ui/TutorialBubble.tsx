/**
 * The tutorial prompt (DESIGN A8): a speech bubble over the HUD element it talks about, a pulsing
 * ring around that element, and for the Arrow Storm an animated hand dragging from the power
 * button onto the lane. Text only, at most 8 words; hints can be tapped away.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { PromptTarget, TutorialPrompt } from '@/tutorial';
import type { BattleView } from '@/render';

/** HUD elements by prompt target (WP5's `data-testid`s). Mounts live on the canvas. */
const TESTID: Partial<Record<PromptTarget, string>> = {
  card0: 'hud-card-0',
  card1: 'hud-card-1',
  card2: 'hud-card-2',
  card3: 'hud-card-3',
  card4: 'hud-card-4',
  gold: 'hud-gold',
  evolve: 'hud-evolve',
  power: 'hud-power',
  stance: 'hud-stance',
  lastStand: 'hud-laststand',
};

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function targetRect(root: HTMLElement, target: PromptTarget | null, view: BattleView | undefined, mountsOwned: number): Rect | null {
  if (!target) return null;
  const box = root.getBoundingClientRect();
  const id = TESTID[target];
  if (id) {
    const el = root.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
  }
  const mount = target === 'mount0' ? 0 : target === 'mount1' ? 1 : target === 'mountBuy' ? mountsOwned : -1;
  const p = mount >= 0 ? view?.mountScreenPoint(mount) : null;
  return p ? { x: p.x - 28, y: p.y - 28, w: 56, h: 56 } : null;
}

export function TutorialBubble(p: {
  prompt: TutorialPrompt | null;
  root: HTMLElement | null;
  view: BattleView | undefined;
  mountsOwned: number;
  t: (key: string) => string;
  onDismiss: () => void;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [bubbleW, setBubbleW] = useState(0);
  const bubble = useRef<HTMLDivElement>(null);
  const { prompt, root, view, mountsOwned } = p;

  // Measure the bubble so it can be kept on screen near the edges.
  useLayoutEffect(() => {
    const w = bubble.current?.offsetWidth ?? 0;
    if (w !== bubbleW) setBubbleW(w);
  });

  // Follow the target (HUD layout and the camera move); cheap, and only while a prompt shows.
  useEffect(() => {
    if (!prompt || !root) {
      setRect(null);
      return undefined;
    }
    let raf = 0;
    const tick = (): void => {
      const r = targetRect(root, prompt.target, view, mountsOwned);
      setRect((old) => (old && r && Math.abs(old.x - r.x) < 0.5 && Math.abs(old.y - r.y) < 0.5 && old.w === r.w ? old : r));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [prompt, root, view, mountsOwned]);

  if (!prompt) return null;
  const box = root?.getBoundingClientRect();
  const width = box?.width ?? 800;
  const center = { x: width / 2, y: (box?.height ?? 600) * 0.38 };
  const anchor = rect ? { x: rect.x + rect.w / 2, y: rect.y - 14 } : center;
  // Keep the whole bubble on screen; the arrow still points at the target.
  const half = bubbleW / 2 + 8;
  const left = half * 2 < width ? Math.max(half, Math.min(width - half, anchor.x)) : width / 2;
  return (
    <>
      {rect ? <div class="ab-ring" style={{ left: `${rect.x - 6}px`, top: `${rect.y - 6}px`, width: `${rect.w + 12}px`, height: `${rect.h + 12}px` }} /> : null}
      <div
        ref={bubble}
        class={`ab-bubble${rect ? '' : ' ab-bubble--center'}`}
        data-testid="tutorial-bubble"
        data-prompt={prompt.id}
        style={{
          left: `${left}px`,
          top: `${Math.max(60, anchor.y)}px`,
          ['--ab-arrow-dx' as string]: `${Math.round(anchor.x - left)}px`,
        }}
        onClick={prompt.kind === 'hint' ? p.onDismiss : undefined}
      >
        {p.t(prompt.textKey)}
      </div>
      {prompt.hand === 'powerDrag' && rect ? (
        <div
          class="ab-hand"
          aria-hidden="true"
          style={{
            left: `${rect.x + rect.w / 2 - 10}px`,
            top: `${rect.y + rect.h / 2 - 10}px`,
            ['--ab-dx' as string]: `${-Math.round((rect.x + rect.w / 2) - (box?.width ?? 800) * 0.62)}px`,
            ['--ab-dy' as string]: `${-Math.round((rect.y + rect.h / 2) - (box?.height ?? 600) * 0.55)}px`,
          }}
        >
          <svg viewBox="0 0 44 44" width="44" height="44">
            <circle cx="22" cy="22" r="17" fill="#fffaf0" stroke="#1b1330" stroke-width="4" />
            <circle cx="22" cy="22" r="7" fill="#ffc53d" stroke="#1b1330" stroke-width="3" />
          </svg>
        </div>
      ) : null}
    </>
  );
}
