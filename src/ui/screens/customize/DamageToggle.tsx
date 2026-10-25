/**
 * The Bases tab's Damage toggle (PLAN 2a "Damage preview"; review 2's nit, round 3): a 44 px icon button
 * in the live stage's top corner, over the sky and clear of the base at every phone size, that steps the
 * base through its crumble stages 0-3 and back to 0 (the model's quality, and that the mounts stay put).
 *
 * - **What it says.** The icon is a keep that cracks with the stage (stage 1 a crack, 2 a lost merlon
 *   and an ember, 3 a ragged breach with smoke), and four pips under it count the stages: the first is
 *   the whole base, so one lit pip reads "intact" and four "badly damaged" (the count says it, never the
 *   colour alone). The aria label says "Damage preview: stage n of 3"; desktop also shows the word.
 * - **Feedback.** The press lands on `pointerdown` (`data-pressed`: it sinks onto its lip, MR-01). A step
 *   up lands like a hit: the stage shakes and flashes the base (Track B's diorama, `crumble` up), the icon
 *   takes the blow (a squash, a kick and a settle) and the new pip pops, with the base's crumble sound and
 *   a thump on Android. The fourth tap repairs it: the icon pops back whole and the pips drain, softly.
 * - **Reduce motion.** No squash or kick: the icon and the pips cross-fade to the new stage (U14).
 */
import { useState } from 'preact/hooks';
import { haptic } from '../../components/haptics';
import { useUi } from '../context';

export type CrumbleStage = 0 | 1 | 2 | 3;
export const CRUMBLE_STAGES: readonly CrumbleStage[] = [0, 1, 2, 3];

/** Stone ramp of the AUDIT §3.3 sheet (grey stone: fill, shadow, highlight, outline). */
const STONE = { fill: '#9aa0a6', shade: '#72767b', light: '#babec2', line: '#3e4042' } as const;
const EMBER = { fill: '#ff8a2b', core: '#ffe066', line: '#66370f' } as const;

/** The keep's body (merlons, wall, a slight taper) per stage: whole, whole, a merlon lost, a ragged top. */
const BODY: Record<CrumbleStage, string> = {
  0: 'M5.6 8.6V4.2h3v2h1.9v-2h3v2h1.9v-2h3v4.4l-.4.1.6 12.3H5.4l.6-12.3z',
  1: 'M5.6 8.6V4.2h3v2h1.9v-2h3v2h1.9v-2h3v4.4l-.4.1.6 12.3H5.4l.6-12.3z',
  2: 'M5.6 8.6V4.2h3v2h1.9v-2h3v2h1.9l.5 1.1.9-.9.8.9.3-.6v2.8l-.4.1.6 12.3H5.4l.6-12.3z',
  3: 'M6 9.4l.9-1.6.9 1 1.1-2 1 1.4 1.3-.9.8 1.7 1.4-1.9 1 1.5 1.5-.8.9 2 .2.1.6 11H5.4z',
};

/** The shadow band (the far side of the wall and the cast shadow under the merlons). */
const SHADE: Record<CrumbleStage, string> = {
  0: 'M14 8.7h3.4l.6 12.2H14zM6 8.7h12v1.3H6z',
  1: 'M14 8.7h3.4l.6 12.2H14zM6 8.7h12v1.3H6z',
  2: 'M14 8.7h3.4l.6 12.2H14zM6 8.7h12v1.3H6z',
  3: 'M14 10.2l1.5-.8.9 2 .2.1.6 9.4H14z',
};

/** The keep icon at one crumble stage (24-unit grid, the sheet's cel band, highlight and outline). */
export function DamageIcon(p: { stage: CrumbleStage; size?: number }) {
  const s = p.stage;
  const size = p.size ?? 26;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" class="cos-dmg__svg" data-stage={s}>
      {/* the keep leans a little once it is breached (stage 3) */}
      <g transform={s === 3 ? 'rotate(-5 12 21)' : undefined} stroke-linejoin="round">
        <path d={BODY[s]} fill={STONE.fill} />
        <path d={SHADE[s]} fill={STONE.shade} />
        {/* brick courses (texture strokes in the shadow colour) */}
        <path d="M7.2 13.2h2.6M12.4 13.2h1.4M8.4 16.8h2.4M14.8 16.2h2" stroke={STONE.shade} stroke-width="0.8" stroke-linecap="round" fill="none" />
        {/* one highlight: a sliver down the lit edge */}
        <path d={s === 3 ? 'M7.4 11.6v6.4' : 'M7.3 10.4v7.6M6.6 5.2h1.4'} stroke={STONE.light} stroke-width="1" stroke-linecap="round" fill="none" />
        {/* the window slit and the gate */}
        <rect x="11.3" y="10.2" width="1.4" height="2.4" rx="0.7" fill={STONE.line} />
        <path d="M10.2 20.9v-3.2a1.8 1.8 0 0 1 3.6 0v3.2z" fill={STONE.line} />
        {s >= 1 ? <path d="M8.8 8.9l1.3 2-1.1 1.4 1.5 2.1" stroke={STONE.line} stroke-width="1.1" stroke-linecap="round" fill="none" /> : null}
        {s >= 2 ? <path d="M16.6 9.6l-1.4 1.8 1.1 1.2-.9 1.6" stroke={STONE.line} stroke-width="1.1" stroke-linecap="round" fill="none" /> : null}
        {s === 3 ? <path d="M14.4 14.4l1.6-.6.8 1.4-.6 1.6-1.6.3-.8-1.3z" fill={STONE.line} /> : null}
        <path d={BODY[s]} fill="none" stroke={STONE.line} stroke-width="1.5" />
      </g>
      {/* an ember where the stone broke (stage 2) or flames out of the breach (stage 3) */}
      {s === 2 ? (
        <g class="cos-dmg__fire">
          <path d="M16.6 6.8c-1.3-1-1.4-2.4-.4-3.8.1 1 .7 1.4 1.2 1.6.5-.8.4-1.6.2-2.2 1.5.9 2 2.4 1.2 3.6-.5.7-1.4 1.1-2.2.8z" fill={EMBER.fill} stroke={EMBER.line} stroke-width="0.8" />
          <path d="M17 6.4c-.5-.4-.5-1 0-1.6.2.4.5.6.8.6.3.5.1 1-.8 1z" fill={EMBER.core} />
        </g>
      ) : null}
      {s === 3 ? (
        <g class="cos-dmg__fire">
          <circle cx="16.2" cy="3.2" r="1.7" fill="#8a8f99" opacity="0.85" />
          <circle cx="18.2" cy="2.2" r="1.3" fill="#8a8f99" opacity="0.7" />
          <path d="M11.6 8.4c-1.6-1.2-1.7-3-.5-4.6.1 1.2.9 1.8 1.5 2 .6-1 .5-2 .2-2.8 1.9 1.1 2.5 3 1.5 4.5-.6.9-1.7 1.3-2.7.9z" fill={EMBER.fill} stroke={EMBER.line} stroke-width="0.8" />
          <path d="M12.1 7.8c-.6-.5-.6-1.3 0-2 .2.5.6.8 1 .8.4.6.1 1.3-1 1.2z" fill={EMBER.core} />
        </g>
      ) : null}
      {/* rubble at the foot (from stage 1) */}
      {s >= 1 ? <path d="M18.4 21.2c0-.9.6-1.5 1.4-1.5s1.4.6 1.4 1.5z" fill={STONE.fill} stroke={STONE.line} stroke-width="0.9" /> : null}
      {s >= 2 ? <path d="M2.6 21.2c0-.7.5-1.2 1.1-1.2s1.1.5 1.1 1.2z" fill={STONE.fill} stroke={STONE.line} stroke-width="0.9" /> : null}
      {s === 3 ? <path d="M15.6 21.2c.2-1.3 1.1-2 2.2-1.8 1 .2 1.6 1 1.5 1.8z" fill={STONE.shade} stroke={STONE.line} stroke-width="0.9" /> : null}
      <path d="M2.4 21.3h19.2" stroke={STONE.line} stroke-width="1.3" stroke-linecap="round" />
    </svg>
  );
}

/**
 * The toggle itself: `crumble` is the stage the live stage shows, `onStep` gets the next one (0 after 3).
 * Shown only while the live stage draws (only the live base crumbles).
 */
export function DamageToggle(p: { crumble: CrumbleStage; onStep: (next: CrumbleStage) => void }) {
  const { t, sound } = useUi();
  // the beat each tap replays: the hit of a step up, the repair after the last stage
  const [beat, setBeat] = useState<{ n: number; kind: 'hit' | 'repair' }>({ n: 0, kind: 'hit' });
  const s = p.crumble;
  const press = (e: Event, on: boolean): void => {
    const el = e.currentTarget as HTMLElement | null;
    if (!el) return;
    if (on) el.setAttribute('data-pressed', '');
    else el.removeAttribute('data-pressed');
  };
  return (
    <button
      type="button"
      class={`cos-dmg is-${s}${beat.n > 0 ? ` is-${beat.kind}` : ''}`}
      data-testid="stage-damage"
      data-crumble={s}
      aria-pressed={s > 0}
      aria-label={t('cosmetic.ui.damageLabel', { n: s, max: 3 })}
      title={t('cosmetic.ui.damage')}
      onPointerDown={(e) => {
        if (e.button === undefined || e.button === 0) press(e, true);
      }}
      onPointerUp={(e) => press(e, false)}
      onPointerCancel={(e) => press(e, false)}
      onPointerLeave={(e) => press(e, false)}
      onClick={() => {
        const next = ((s + 1) % 4) as CrumbleStage;
        if (next > s) {
          // the stage's hit: the base's crumble sound, a little deeper each stage, and a thump (ui-plan 5.4)
          sound?.('base_crumble', { pitchBp: 10600 - next * 600 });
          haptic('thump');
        } else {
          sound?.('ui_toggle');
          haptic('tick');
        }
        setBeat((b) => ({ n: b.n + 1, kind: next > s ? 'hit' : 'repair' }));
        p.onStep(next);
      }}
    >
      {/* keyed by the beat, so every tap replays its motion */}
      <span class="cos-dmg__icon" key={`i${beat.n}`}>
        <DamageIcon stage={s} />
      </span>
      <span class="cos-dmg__pips" aria-hidden="true">
        {CRUMBLE_STAGES.map((n) => (
          <i key={n === s ? `p${n}-${beat.n}` : `p${n}`} class={`${s >= n ? 'is-on' : ''}${s === n ? ' is-now' : ''}`} data-pip={n} />
        ))}
      </span>
      <span class="cos-dmg__label">{t('cosmetic.ui.damage')}</span>
    </button>
  );
}
