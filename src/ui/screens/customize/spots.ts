/**
 * Where the decoration spots' tap targets go over Customize's live stage (round 3, item 5; Track B's
 * `anchorsPx()`, docs/requests/custom-b-diorama-anchors.md). Pure, so it is unit-tested.
 *
 * Track B's boxes are a prop's footprint and height in CSS px of the stage's host. On a phone the stage
 * shows about 0.3 px per lu, so a prop is 15 x 20 px and the three spots stand 14-37 px apart: three
 * 44 px targets cannot each sit on their own prop. So a target sits on its prop (the prop shows through
 * it) only where it covers that prop and no other; every other spot becomes a callout on a row above the
 * props, showing what it holds, with a leader down to where it stands. The back spots (furthest from the
 * lane, first in anchor order) go up first. The callouts stand in the free stage right of the props and
 * the targets on the ground, where the base is not (review 3a NIT 7: above the props on a phone they
 * covered the base's top half), and above the props only on a stage too narrow for that. Every prop also
 * gets a footprint on the ground.
 */

/** A box on the stage: CSS px in the stage's host (left, top, width, height). */
export interface StageBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpotTarget extends StageBox {
  /** The prop's footprint: its centre x, the ground line and its width. */
  footX: number;
  groundY: number;
  footW: number;
  /** The prop's top (where a callout's leader lands). */
  propTop: number;
  /** A callout on the row above the props (it shows what the spot holds and has a leader to it). */
  raised: boolean;
  /** Draw a leader from the target to its prop (a callout, or a target pushed off its prop). */
  leader: boolean;
}

/** The smallest tap target (ui-plan U6: 44 px for rare controls). */
export const SPOT_TARGET_PX = 44;
/** The space kept between two targets. */
const GAP = 4;
/** How far a target on its prop reaches below the ground line (it covers the prop's foot). */
const BELOW = 4;
/** The room between the callouts and the props' tops (the leaders run there). */
const LEADER_ROOM = 14;

interface Item {
  c: number;
  w: number;
}

/**
 * Centres for `items` along one row inside [lo, hi] so that neighbours keep `gap` apart, moving each as
 * little as it can (neighbours that overlap push apart evenly; the row's ends hold). A row too tight for the
 * full gap (the smallest stages: 136-150 px wide on 250-270 px tall phones) closes its gaps before any two
 * targets overlap.
 */
export function packRow(items: readonly Item[], lo: number, hi: number, gap = GAP): number[] {
  const total = items.reduce((n, it) => n + it.w, 0);
  if (items.length > 1) gap = Math.max(0, Math.min(gap, (hi - lo - total) / (items.length - 1)));
  const order = items.map((_, i) => i).sort((a, b) => items[a]!.c - items[b]!.c);
  const pos = items.map((it) => it.c);
  const clamp = (i: number): void => {
    const half = items[i]!.w / 2;
    pos[i] = Math.min(hi - half, Math.max(lo + half, pos[i]!));
  };
  order.forEach(clamp);
  for (let iter = 0; iter < 80; iter++) {
    let moved = false;
    for (let k = 0; k + 1 < order.length; k++) {
      const a = order[k]!;
      const b = order[k + 1]!;
      const need = (items[a]!.w + items[b]!.w) / 2 + gap;
      const d = pos[b]! - pos[a]!;
      if (d < need - 0.01) {
        const push = (need - d) / 2;
        pos[a] = pos[a]! - push;
        pos[b] = pos[b]! + push;
        moved = true;
      }
    }
    order.forEach(clamp);
    if (!moved) break;
  }
  return pos;
}

/** True when a target centred at `pos`, `w` wide, covers the prop box centred at `c`, `bw` wide. */
const covers = (pos: number, w: number, c: number, bw: number): boolean => Math.abs(pos - c) <= (w - bw) / 2 + 0.5;

/**
 * The tap targets for the decoration spots (`spots`, in anchor order) on a stage `width` x `height` px.
 * Each is at least `min` px each way, keeps apart from the others and never leaves the stage. The callouts'
 * row beside the props also keeps clear of `beside` (the flag pole and its flags).
 */
export function spotTargets(spots: readonly StageBox[], width: number, height: number, min = SPOT_TARGET_PX, beside: readonly StageBox[] = []): SpotTarget[] {
  const n = spots.length;
  if (n === 0) return [];
  const items = spots.map((s) => ({ c: s.x + s.w / 2, w: Math.max(min, Math.ceil(s.w + 8)), bw: s.w }));
  const h = Math.max(min, ...spots.map((s) => Math.ceil(s.h + 8)));
  const hi = Math.max(width, ...items.map((i) => i.w));
  // Raise spots from the back until every target left on the ground covers its own prop and no other.
  let raised = 0;
  let ground: number[] = [];
  for (; raised <= n; raised++) {
    const rest = items.slice(raised);
    ground = packRow(rest, 0, hi);
    const ok = rest.every((it, k) => {
      const pos = ground[k]!;
      if (!covers(pos, it.w, it.c, it.bw)) return false;
      const x0 = pos - it.w / 2;
      const x1 = pos + it.w / 2;
      return spots.every((s, j) => j === raised + k || s.x + s.w <= x0 + 0.5 || s.x >= x1 - 0.5);
    });
    if (ok) break;
  }
  raised = Math.min(raised, n);
  // the callouts in a row right of the props, the targets on the ground and the flag pole, in the props' order
  // (so no two leaders cross), where it fits; else packed above the props
  const upItems = items.slice(0, raised);
  const groundRight = Math.max(0, ...items.slice(raised).map((it, k) => ground[k]! + it.w / 2));
  const lo = Math.max(groundRight, ...spots.map((s) => s.x + s.w), ...beside.map((b) => b.x + b.w)) + GAP;
  const aside = raised > 0 && lo + upItems.reduce((sum, it) => sum + it.w, 0) + GAP * (raised - 1) <= width;
  let up: number[];
  if (aside) {
    up = [];
    let left = lo;
    for (const k of upItems.map((_, j) => j).sort((a, b) => upItems[a]!.c - upItems[b]!.c)) {
      up[k] = left + upItems[k]!.w / 2;
      left += upItems[k]!.w + GAP;
    }
  } else up = packRow(upItems, 0, hi);
  const groundY = Math.max(...spots.map((s) => s.y + s.h));
  const propTop = Math.min(...spots.map((s) => s.y));
  const lowY = Math.max(0, Math.min(height - h, groundY + BELOW - h));
  // the callouts sit above the props and clear of the targets on the ground
  const upY = Math.max(0, Math.min(propTop - LEADER_ROOM - h, lowY - GAP - h));
  return spots.map((s, i) => {
    const it = items[i]!;
    const isUp = i < raised;
    const pos = isUp ? up[i]! : ground[i - raised]!;
    return {
      x: r1(pos - it.w / 2),
      y: r1(isUp ? upY : lowY),
      w: it.w,
      h,
      footX: r1(it.c),
      groundY: r1(s.y + s.h),
      footW: r1(Math.max(10, s.w * 1.15)),
      propTop: r1(s.y),
      raised: isUp,
      leader: isUp || !covers(pos, it.w, it.c, it.bw),
    };
  });
}

const r1 = (v: number): number => Math.round(v * 10) / 10;
