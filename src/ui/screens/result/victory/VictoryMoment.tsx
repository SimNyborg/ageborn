/**
 * The victory moment's player (owner request 2026-10-07; DESIGN A9 #7, ui-plan MR-129): builds the
 * scene of a move ({@link buildMoment}) for the stage's size and plays it as Web Animations on nested
 * boxes (transform and opacity only, so the compositor runs it smoothly on a mid phone). Sounds,
 * haptics and the Result's confetti fire on the scene's cues.
 *
 * - Tap or Enter skips to the end (ui-plan 5.1 rule 6: anything over 1 s skips on tap).
 * - Reduce motion plays the storyboard the scene module makes (fades only, no shake, flash or
 *   hit-stop); sounds still play, through the player's volume settings like every UI sound.
 * - Where Web Animations or layout are missing (tests, very old browsers) the moment ends at once, and
 *   where the stage has no room (still too small after a few frames) it ends then; the Result shows as
 *   before.
 */
import './victory.css';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { avatarLibrary, loadWearableArt } from '../../../components/Avatar';
import { wearablesIn } from '../../../components/avatar/look';
import type { ResolvedLook } from '../../../components/avatar/render';
import { haptic } from '../../../components/haptics';
import { useKit } from '../../../components/kit';
import type { MomentKind } from './moves';
import { buildMoment } from './scenes';
import { keyframesOf, poseAt, transformOf, type Cue, type Scene, type SceneNode } from './timeline';

export interface VictoryMomentProps {
  move: string;
  kind: MomentKind;
  seed: number;
  me: ResolvedLook;
  foe: ResolvedLook;
  team: { me: string; foe: string };
  hitstop: boolean;
  shake: number;
  lite: boolean;
  /** Dev preview: stay on the last frame instead of ending. */
  hold?: boolean;
  /** The celebration beat: the Result starts its screen confetti. */
  onCelebrate?: () => void;
  /** The moment ended or was skipped. */
  onDone: () => void;
}

/** The longest wait for the wearables' art before the moment plays without it. */
const WEARABLE_WAIT_MS = 700;
/** Below this the stage is too small to read (or there is no layout at all). */
const MIN_W = 140;
const MIN_H = 70;
/** How many frames a too-small stage is measured again before the moment gives up. */
const MEASURE_FRAMES = 12;

/** The scale and placement of the scene in the stage: fit, centred, standing on the bottom edge. */
export function fitStage(w: number, h: number, sw: number, sh: number): { k: number; left: number; top: number } {
  const k = Math.min(w / sw, h / sh);
  return { k, left: (w - sw * k) / 2, top: h - sh * k };
}

function NodeView(p: { n: SceneNode; kids: ReadonlyMap<string, SceneNode[]>; scene: Scene; k: number; refs: Map<string, HTMLElement> }) {
  const { n, k } = p;
  const pose = poseAt(p.scene, n.id, 0);
  const style =
    `left:${n.x * k}px;top:${n.y * k}px;width:${n.w * k}px;height:${n.h * k}px;` +
    `transform-origin:${n.ox * k}px ${n.oy * k}px;transform:${transformOf(pose, k)};opacity:${pose.o};z-index:${n.z};${n.css ?? ''}`;
  return (
    <div
      class={`vm-n${n.cls ? ` ${n.cls}` : ''}`}
      style={style}
      data-n={n.id}
      ref={(el) => {
        if (el) p.refs.set(n.id, el);
        else p.refs.delete(n.id);
      }}
    >
      {n.art ? <div class="vm-art" dangerouslySetInnerHTML={{ __html: n.art }} /> : null}
      {(p.kids.get(n.id) ?? []).map((c) => (
        <NodeView key={c.id} n={c} kids={p.kids} scene={p.scene} k={k} refs={p.refs} />
      ))}
    </div>
  );
}

export function VictoryMoment(p: VictoryMomentProps) {
  const kit = useKit();
  const host = useRef<HTMLDivElement>(null);
  const refs = useRef(new Map<string, HTMLElement>()).current;
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const lib = avatarLibrary();
  const missing = [...wearablesIn(p.me), ...wearablesIn(p.foe)].some((w) => !lib[w]);
  const [waited, setWaited] = useState(false);
  const done = useRef(false);
  const finish = (): void => {
    if (done.current) return;
    done.current = true;
    p.onDone();
  };

  useEffect(() => {
    if (!missing) return undefined;
    void loadWearableArt();
    const id = setTimeout(() => setWaited(true), WEARABLE_WAIT_MS);
    return () => clearTimeout(id);
  }, [missing]);

  // The stage's size. The column may still be settling on the first frame (a late stylesheet, a
  // transition under reduce motion), so a too-small stage is measured again for a few frames first.
  useLayoutEffect(() => {
    const el = host.current;
    if (!el || typeof el.getBoundingClientRect !== 'function' || typeof el.animate !== 'function') {
      finish();
      return undefined;
    }
    const raf = typeof requestAnimationFrame === 'function';
    let id = 0;
    let tries = 0;
    const measure = (): void => {
      const r = el.getBoundingClientRect();
      if (r.width >= MIN_W && r.height >= MIN_H) setSize({ w: r.width, h: r.height });
      else if (++tries > MEASURE_FRAMES) finish();
      else id = raf ? requestAnimationFrame(measure) : (setTimeout(measure, 16) as unknown as number);
    };
    measure();
    return () => (raf ? cancelAnimationFrame(id) : clearTimeout(id));
  }, []);

  const scene = useMemo(
    () =>
      size && (!missing || waited)
        ? buildMoment({
            move: p.move,
            kind: p.kind,
            seed: p.seed,
            me: p.me,
            foe: p.foe,
            lib,
            team: p.team,
            reduce: kit.reduceMotion,
            hitstop: p.hitstop,
            shake: p.shake,
            lite: p.lite,
            t: kit.t,
          })
        : null,
    [size, missing, waited],
  );

  useLayoutEffect(() => {
    if (!size) return undefined;
    if (!scene) {
      if (!missing || waited) finish();
      return undefined;
    }
    const { k } = fitStage(size.w, size.h, scene.w, scene.h);
    const anims: Animation[] = [];
    for (const n of scene.nodes) {
      const el = refs.get(n.id);
      const kf = el ? keyframesOf(scene, n.id, k) : null;
      if (el && kf) anims.push(el.animate(kf, { duration: scene.duration, fill: 'both' }));
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const fire = (c: Cue): void => {
      if (c.sound) kit.sound?.(c.sound, c.pitchBp !== undefined ? { pitchBp: c.pitchBp } : undefined);
      if (c.haptic) haptic(c.haptic);
      if (c.celebrate) p.onCelebrate?.();
    };
    // Cues follow the animations' own clock (they start on the next frame).
    let live = true;
    const schedule = (): void => {
      if (!live) return;
      const now = anims[0]?.currentTime;
      const at = typeof now === 'number' ? now : 0;
      for (const c of scene.cues) timers.push(setTimeout(() => fire(c), Math.max(0, c.t - at)));
      if (!p.hold) timers.push(setTimeout(finish, Math.max(0, scene.duration - at) + 40));
    };
    const first = anims[0];
    if (first) first.ready.then(schedule, schedule);
    else schedule();
    return () => {
      live = false;
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.cancel());
    };
  }, [scene]);

  const fit = scene && size ? fitStage(size.w, size.h, scene.w, scene.h) : null;
  const kids = useMemo(() => {
    const m = new Map<string, SceneNode[]>();
    if (scene) for (const n of scene.nodes) m.set(n.parent ?? '', [...(m.get(n.parent ?? '') ?? []), n]);
    return m;
  }, [scene]);

  return (
    <div class="vm-host" ref={host} data-reduced={kit.reduceMotion ? 'true' : 'false'}>
      {scene && fit ? (
        <div class="vm-view" style={`left:${fit.left}px;top:${fit.top}px;width:${scene.w * fit.k}px;height:${scene.h * fit.k}px`}>
          {(kids.get('') ?? []).map((n) => (
            <NodeView key={n.id} n={n} kids={kids} scene={scene} k={fit.k} refs={refs} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
