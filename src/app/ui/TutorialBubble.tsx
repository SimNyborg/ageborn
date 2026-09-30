/**
 * The tutorial prompt (DESIGN A8): a speech bubble next to the thing it talks about, a pulsing ring
 * around that thing, and a large animated hand that shows the action: a tap on cards, mounts and the
 * Evolve button, a drag for the Arrow Storm. Text only, at most 8 words; hints can be tapped away.
 *
 * The bubble never covers its target: it goes above the target when there is room, else below, to
 * the right or to the left, and its arrow points at the target (audit #2, #14).
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
  minimap: 'hud-minimap-strip',
};

/** The ring around a mount on the canvas (CSS px). */
export const MOUNT_RING_PX = 64;
/** Gap between the bubble's arrow tip and its target. */
const GAP = 16;
/** Space kept free at the screen edges. */
const EDGE = 8;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Placement = 'above' | 'below' | 'right' | 'left' | 'center';

export interface BubblePos {
  placement: Placement;
  left: number;
  top: number;
  /** Where the arrow meets the bubble edge, along that edge, from the bubble's left/top. */
  arrow: number;
}

function targetRect(root: HTMLElement, target: PromptTarget | null, view: BattleView | undefined, mountsOwned: number): Rect | null {
  if (!target) return null;
  const box = root.getBoundingClientRect();
  const id = TESTID[target];
  if (id) {
    const el = root.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    // A card's "Beats Heavy" chip (A9.2) sits above it: the bubble goes above the chip, never over it.
    const chip = root.querySelector<HTMLElement>(`[data-testid="${id}-counter"]`)?.getBoundingClientRect();
    if (chip && chip.width > 0) {
      const top = Math.min(r.top, chip.top);
      const left = Math.min(r.left, chip.left);
      const right = Math.max(r.right, chip.right);
      return { x: left - box.left, y: top - box.top, w: right - left, h: r.bottom - top };
    }
    return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
  }
  const mount = target === 'mount0' ? 0 : target === 'mount1' ? 1 : target === 'mountBuy' ? mountsOwned : -1;
  // The mount's popover is open: point at its first build option (the Rock Tosser in match 1).
  if (mount >= 0 && target !== 'mountBuy') {
    const option = root.querySelector<HTMLElement>('[data-testid="hud-pop-build-0"]');
    if (option) {
      const r = option.getBoundingClientRect();
      return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
    }
  }
  const p = mount >= 0 ? view?.mountScreenPoint(mount) : null;
  const half = MOUNT_RING_PX / 2;
  return p ? { x: p.x - half, y: p.y - half, w: MOUNT_RING_PX, h: MOUNT_RING_PX } : null;
}

/** True when two rects overlap. */
function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Places a `bw` × `bh` bubble next to `t` inside a `W` × `H` screen without covering `t`: above,
 * below, right, then left; the first side with room wins. `top` keeps the HUD top bar free. A side
 * whose bubble would cover one of the `avoid` rects (the minimap strip and its jump buttons) is
 * skipped while another side fits; if none does, the first side with room is used anyway.
 */
export function placeBubble(t: Rect | null, bw: number, bh: number, W: number, H: number, topLimit = 0, avoid: readonly Rect[] = []): BubblePos {
  if (!t) return { placement: 'center', left: (W - bw) / 2, top: H * 0.38 - bh / 2, arrow: 0 };
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  const clampX = (x: number): number => Math.max(EDGE, Math.min(W - EDGE - bw, x));
  const clampY = (y: number): number => Math.max(topLimit + EDGE, Math.min(H - EDGE - bh, y));
  const options: BubblePos[] = [];
  const aboveTop = t.y - GAP - bh;
  if (aboveTop >= topLimit + EDGE) {
    const left = clampX(cx - bw / 2);
    options.push({ placement: 'above', left, top: aboveTop, arrow: cx - left });
  }
  const belowTop = t.y + t.h + GAP;
  if (belowTop + bh <= H - EDGE) {
    const left = clampX(cx - bw / 2);
    options.push({ placement: 'below', left, top: belowTop, arrow: cx - left });
  }
  const rightLeft = t.x + t.w + GAP;
  if (rightLeft + bw <= W - EDGE) {
    const top = clampY(cy - bh / 2);
    options.push({ placement: 'right', left: rightLeft, top, arrow: cy - top });
  }
  const leftLeft = t.x - GAP - bw;
  if (leftLeft >= EDGE || options.length === 0) {
    const top = clampY(cy - bh / 2);
    options.push({ placement: 'left', left: Math.max(EDGE, leftLeft), top, arrow: cy - top });
  }
  const clear = options.find((o) => !avoid.some((a) => overlaps({ x: o.left, y: o.top, w: bw, h: bh }, a)));
  return clear ?? (options[0] as BubblePos);
}

/** A cartoon glove pointing up; its fingertip is at (19, 3) of the 48 px box. */
function Hand() {
  const shapes = (
    <>
      <rect x="14" y="2" width="10" height="26" rx="5" />
      <circle cx="28.5" cy="21" r="5" />
      <circle cx="34.5" cy="23" r="4.6" />
      <rect x="11" y="19" width="28" height="21" rx="9" />
      <ellipse cx="10.5" cy="28" rx="4.6" ry="7.5" transform="rotate(-24 10.5 28)" />
    </>
  );
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
      <g fill="#1b1330" stroke="#1b1330" stroke-width="5" stroke-linejoin="round">
        {shapes}
        <rect x="12" y="37" width="26" height="9" rx="3" />
      </g>
      <g fill="#fffaf0">{shapes}</g>
      <rect x="12" y="37" width="26" height="9" rx="3" fill="#ffc53d" />
      <path d="M17 7 v14" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.9" />
      <path d="M22 30 q5 3 11 0" stroke="#d9cdb2" stroke-width="2" fill="none" stroke-linecap="round" />
    </svg>
  );
}

/** Fingertip offset inside the hand box, so the tip lands on the target. */
const TIP = { x: 19, y: 3 };

export function TutorialBubble(p: {
  prompt: TutorialPrompt | null;
  root: HTMLElement | null;
  view: BattleView | undefined;
  mountsOwned: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onDismiss: () => void;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const bubble = useRef<HTMLDivElement>(null);
  const { prompt, root, view, mountsOwned } = p;

  // Measure the bubble so it can be placed beside its target and kept on screen.
  useLayoutEffect(() => {
    const w = bubble.current?.offsetWidth ?? 0;
    const h = bubble.current?.offsetHeight ?? 0;
    if (w !== size.w || h !== size.h) setSize({ w, h });
  });

  // A17.6: a beat about a mount first brings your base into view and holds the auto camera until it ends.
  const onBase = prompt?.target === 'mount0' || prompt?.target === 'mount1' || prompt?.target === 'mountBuy';
  useEffect(() => {
    if (!onBase || !view) return undefined;
    view.showBase();
    view.cameraHold('tutorial', true);
    return () => view.cameraHold('tutorial', false);
  }, [onBase, view, prompt?.id]);

  // Follow the target (HUD layout and the camera move); cheap, and only while a prompt shows.
  useEffect(() => {
    if (!prompt || !root) {
      setRect(null);
      return undefined;
    }
    let raf = 0;
    const tick = (): void => {
      const r = targetRect(root, prompt.target, view, mountsOwned);
      setRect((old) => (old && r && Math.abs(old.x - r.x) < 0.5 && Math.abs(old.y - r.y) < 0.5 && old.w === r.w && old.h === r.h ? old : r));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [prompt, root, view, mountsOwned]);

  if (!prompt) return null;
  const box = root?.getBoundingClientRect();
  const W = box?.width ?? 800;
  const H = box?.height ?? 600;
  // Never cover the minimap strip (its base and front buttons) unless the target is the strip itself.
  const avoid = prompt.target === 'minimap' ? [] : stripRects(root);
  const pos = placeBubble(rect, size.w, size.h, W, H, H * 0.12, avoid);
  const isMount = (prompt.target === 'mount0' || prompt.target === 'mount1' || prompt.target === 'mountBuy') && rect !== null && rect.w === MOUNT_RING_PX && rect.h === MOUNT_RING_PX;
  // Beats ask for an action: a hand shows it. Hints only point.
  const tapHand = prompt.kind === 'beat' && rect !== null && prompt.hand !== 'powerDrag';
  // The hand hangs down and to the right of the fingertip; where that would cover the minimap (the
  // Evolve button sits beside its base button), it is mirrored to hang to the left instead.
  const tipX = rect ? rect.x + rect.w / 2 : 0;
  const tipY = rect ? rect.y + rect.h / 2 : 0;
  const handAt = (flip: boolean): Rect => ({ x: flip ? tipX - (48 - TIP.x) - 4 : tipX - TIP.x + 4, y: tipY - TIP.y + 6, w: 48, h: 48 });
  const covered = (h: Rect): number => avoid.reduce((sum, a) => sum + Math.max(0, Math.min(h.x + h.w, a.x + a.w) - Math.max(h.x, a.x)) * Math.max(0, Math.min(h.y + h.h, a.y + a.h) - Math.max(h.y, a.y)), 0);
  const flipHand = tapHand && covered(handAt(true)) < covered(handAt(false));
  const hand = handAt(flipHand);
  return (
    <>
      {rect ? (
        <div
          class={`ab-ring${isMount ? ' ab-ring--round' : ''}`}
          data-testid="tutorial-ring"
          style={{ left: `${rect.x - 6}px`, top: `${rect.y - 6}px`, width: `${rect.w + 12}px`, height: `${rect.h + 12}px` }}
        />
      ) : null}
      <div
        ref={bubble}
        class={`ab-bubble ab-bubble--${pos.placement}${prompt.kind === 'hint' ? ' ab-bubble--hint' : ''}`}
        data-testid="tutorial-bubble"
        data-prompt={prompt.id}
        data-placement={pos.placement}
        style={{
          left: `${Math.round(pos.left)}px`,
          top: `${Math.round(pos.top)}px`,
          ['--ab-arrow' as string]: `${Math.round(pos.arrow)}px`,
        }}
        onClick={prompt.kind === 'hint' ? p.onDismiss : undefined}
      >
        {prompt.varKeys
          ? p.t(prompt.textKey, Object.fromEntries(Object.entries(prompt.varKeys).map(([k, key]) => [k, p.t(key)])))
          : p.t(prompt.textKey)}
      </div>
      {tapHand && rect ? (
        <div
          class={`ab-hand ab-hand--tap${flipHand ? ' ab-hand--flip' : ''}`}
          data-testid="tutorial-hand"
          aria-hidden="true"
          style={{ left: `${Math.round(hand.x)}px`, top: `${Math.round(hand.y)}px` }}
        >
          <i class="ab-hand-ripple" />
          <Hand />
        </div>
      ) : null}
      {prompt.hand === 'powerDrag' && rect ? (
        <div
          class="ab-hand ab-hand--drag"
          data-testid="tutorial-hand"
          aria-hidden="true"
          style={{
            left: `${Math.round(rect.x + rect.w / 2 - TIP.x)}px`,
            top: `${Math.round(rect.y + rect.h / 2 - TIP.y)}px`,
            ['--ab-dx' as string]: `${-Math.round(rect.x + rect.w / 2 - W * 0.62)}px`,
            ['--ab-dy' as string]: `${-Math.round(rect.y + rect.h / 2 - H * 0.55)}px`,
          }}
        >
          <Hand />
        </div>
      ) : null}
    </>
  );
}

/** The minimap (strip, base and front buttons) in `root` coordinates (empty without a minimap). */
function stripRects(root: HTMLElement | null): Rect[] {
  const strip = root?.querySelector('[data-testid="hud-minimap"]');
  if (!root || !strip) return [];
  const b = root.getBoundingClientRect();
  const r = strip.getBoundingClientRect();
  return [{ x: r.left - b.left - 4, y: r.top - b.top - 4, w: r.width + 8, h: r.height + 8 }];
}
