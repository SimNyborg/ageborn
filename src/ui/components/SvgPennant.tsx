/**
 * A small swallowtail pennant inside an SVG scene (the War Path's camps and keeps, Home's landmarks; queue
 * item 37) that ripples with the lane cloth's waves (`clothWave.ts`): its top and bottom edges follow the
 * travelling waves from the hoist, the fly end whips more than the hoist, and the cloth is pulled a little
 * toward the pole. A darker fold band (`fold`, the old pennants' shade fold, review M N5) rides the same
 * waves. The outline is sampled over the waves' 6 s cycle and played as an SVG path animation; a pennant
 * this small needs no strips. Reduce motion draws one resting pose.
 */
import { useMemo } from 'preact/hooks';
import { clothLift, clothPull } from './clothWave';
import { useKit } from './kit';

/** Both waves close a 6 s cycle (5 and 3 cycles). */
const CYCLE_S = 6;
const SAMPLES = 60;
/** A small pennant flutters livelier than a big flag (the lane's ripple, scaled). */
const LIVELY = 1.7;
/** Points along each edge. */
const POINTS = 5;
/** The fold band: from and to (shares of the height) and how far toward the notch it runs (share of the length). */
const FOLD = { from: 0.56, to: 0.78, reach: 0.8 } as const;

const f1 = (x: number): string => (Math.round(x * 10) / 10).toString();

/** The cloth's point at (`u` along, `v` down, both 0..1) at `t` seconds. */
function at(x: number, y: number, w: number, h: number, u: number, v: number, t: number, phase: number): [number, number] {
  const lift = clothLift(u, t, phase, 1) * h * LIVELY;
  const px = x + u * w - clothPull(u, t, phase, 1) * w * LIVELY;
  // the lower edge droops a touch toward the fly, as the lane cloth's does
  return [px, y + v * h + lift + v * u * h * 0.06];
}

/** The pennant's outline at `t` seconds: hoist at x, top at y, `w` long, `h` tall, a notch `notch` deep. */
export function pennantPath(x: number, y: number, w: number, h: number, notch: number, t: number, phase: number): string {
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i < POINTS; i++) {
    const u = i / (POINTS - 1);
    const [tx, ty] = at(x, y, w, h, u, 0, t, phase);
    const [bx, by] = at(x, y, w, h, u, 1, t, phase);
    top.push(`${f1(tx)} ${f1(ty)}`);
    bottom.unshift(`${f1(bx)} ${f1(by)}`);
  }
  const [mx, my] = at(x, y, w, h, 1, 0.5, t, phase);
  const nx = mx - notch;
  return `M${top.join(' L')} L${f1(nx)} ${f1(my)} L${bottom.join(' L')}Z`;
}

/** The fold band's outline at `t` seconds (the same waves as the outline, so it stays on the cloth). */
export function pennantFold(x: number, y: number, w: number, h: number, t: number, phase: number): string {
  const top: string[] = [];
  const bottom: string[] = [];
  const n = POINTS - 1;
  for (let i = 0; i < n; i++) {
    // from just off the hoist (its outline stays clear) to short of the notch
    const u = 0.05 + (i / (n - 1)) * (FOLD.reach - 0.05);
    const [ax, ay] = at(x, y, w, h, u, FOLD.from, t, phase);
    const [bx, by] = at(x, y, w, h, u, FOLD.to, t, phase);
    top.push(`${f1(ax)} ${f1(ay)}`);
    bottom.unshift(`${f1(bx)} ${f1(by)}`);
  }
  return `M${top.join(' L')} L${bottom.join(' L')}Z`;
}

export function SvgPennant(p: { x: number; y: number; w: number; h: number; notch?: number; fill: string; stroke?: string; strokeWidth?: number; fold?: string; phase?: number; class?: string }) {
  const kit = useKit();
  const notch = p.notch ?? p.h * 0.3;
  const phase = p.phase ?? 0.4;
  const still = pennantPath(p.x, p.y, p.w, p.h, notch, 0.9, phase);
  const stillFold = p.fold ? pennantFold(p.x, p.y, p.w, p.h, 0.9, phase) : null;
  const values = useMemo(() => {
    const out: string[] = [];
    const fold: string[] = [];
    for (let k = 0; k <= SAMPLES; k++) {
      const t = ((k % SAMPLES) / SAMPLES) * CYCLE_S;
      out.push(pennantPath(p.x, p.y, p.w, p.h, notch, t, phase));
      if (p.fold) fold.push(pennantFold(p.x, p.y, p.w, p.h, t, phase));
    }
    return { outline: out.join(';'), fold: fold.join(';') };
  }, [p.x, p.y, p.w, p.h, notch, phase, p.fold]);
  const begin = `-${f1(phase * 1.3)}s`;
  const outline = (
    <path class={p.class} d={still} fill={p.fill} {...(p.stroke ? { stroke: p.stroke, 'stroke-width': p.strokeWidth ?? 1.2, 'stroke-linejoin': 'round' } : {})}>
      {kit.reduceMotion ? null : <animate attributeName="d" dur={`${CYCLE_S}s`} repeatCount="indefinite" values={values.outline} begin={begin} />}
    </path>
  );
  if (!p.fold || !stillFold) return outline;
  return (
    <g>
      {outline}
      <path d={stillFold} fill={p.fold} opacity=".85">
        {kit.reduceMotion ? null : <animate attributeName="d" dur={`${CYCLE_S}s`} repeatCount="indefinite" values={values.fold} begin={begin} />}
      </path>
    </g>
  );
}
