/**
 * A small swallowtail pennant inside an SVG scene (the War Path's camps and keeps; queue item 37) that
 * ripples with the lane cloth's waves (`clothWave.ts`): its top and bottom edges follow the travelling
 * waves from the hoist, the fly end whips more than the hoist, and the cloth is pulled a little toward the
 * pole. The outline is sampled over the waves' 6 s cycle and played as an SVG path animation; a pennant
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

const f1 = (x: number): string => (Math.round(x * 10) / 10).toString();

/** The pennant's outline at `t` seconds: hoist at x, top at y, `w` long, `h` tall, a notch `notch` deep. */
export function pennantPath(x: number, y: number, w: number, h: number, notch: number, t: number, phase: number): string {
  const top: string[] = [];
  const bottom: string[] = [];
  let tipLift = 0;
  for (let i = 0; i < POINTS; i++) {
    const u = i / (POINTS - 1);
    const lift = clothLift(u, t, phase, 1) * h * LIVELY;
    const px = x + u * w - clothPull(u, t, phase, 1) * w * LIVELY;
    top.push(`${f1(px)} ${f1(y + lift)}`);
    // the lower edge droops a touch toward the fly, as the lane cloth's does
    bottom.unshift(`${f1(px)} ${f1(y + h + lift + u * h * 0.06)}`);
    if (i === POINTS - 1) tipLift = lift;
  }
  const nx = x + w - notch - clothPull(1, t, phase, 1) * w * LIVELY;
  return `M${top.join(' L')} L${f1(nx)} ${f1(y + h / 2 + tipLift)} L${bottom.join(' L')}Z`;
}

export function SvgPennant(p: { x: number; y: number; w: number; h: number; notch?: number; fill: string; stroke?: string; strokeWidth?: number; phase?: number; class?: string }) {
  const kit = useKit();
  const notch = p.notch ?? p.h * 0.3;
  const phase = p.phase ?? 0.4;
  const still = pennantPath(p.x, p.y, p.w, p.h, notch, 0.9, phase);
  const values = useMemo(() => {
    const out: string[] = [];
    for (let k = 0; k <= SAMPLES; k++) out.push(pennantPath(p.x, p.y, p.w, p.h, notch, ((k % SAMPLES) / SAMPLES) * CYCLE_S, phase));
    return out.join(';');
  }, [p.x, p.y, p.w, p.h, notch, phase]);
  return (
    <path class={p.class} d={still} fill={p.fill} {...(p.stroke ? { stroke: p.stroke, 'stroke-width': p.strokeWidth ?? 1.2, 'stroke-linejoin': 'round' } : {})}>
      {kit.reduceMotion ? null : <animate attributeName="d" dur={`${CYCLE_S}s`} repeatCount="indefinite" values={values} begin={`-${f1(phase * 1.3)}s`} />}
    </path>
  );
}
