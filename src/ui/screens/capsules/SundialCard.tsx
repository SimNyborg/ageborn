/**
 * The Sundial card of the Capsules tab (DESIGN A6.3, A15.3, A15.4; owner request 2026-09-29, built
 * 2026-09-30). The only place that shows when the next capsule is ready, and only as a local clock
 * time ("Next one at 17:40"): never a running countdown, never seconds (A15.3 rule 4).
 *
 * - The dial: a stone face with a bronze gnomon. Its five hour marks light up as the current 5 h period
 *   runs, and the gnomon's shadow sweeps from the first mark to the last. A full Sundial lights every
 *   mark and drops the shadow.
 * - Text: "12 of 34 ready" (or "None ready yet"), "Next one at 17:40" (with the short weekday when it
 *   is not today; the weekday in the app's language), or, when full, "Full: it has stopped filling.",
 *   then the rule
 *   "Finish any battle to claim one, win or lose." While free capsules are left, their line replaces
 *   the rule.
 * - Motion: the shadow eases in once over 400 ms when the card mounts; after that the card re-renders
 *   only at minute boundaries. When a capsule becomes ready while the tab is open, the ready gem pops
 *   once. Reduce motion turns both off (CSS).
 */
import './sundial.css';
import type { SaveDoc } from '@/contracts';
import type { Content } from '@/content/types';
import { useEffect, useRef, useState } from 'preact/hooks';
import { formatInt } from '../../components/format';
import { CapsuleIcon, OUTLINE } from '../../components/icons';
import type { Translate } from '../../components/kit';
import { chargesView } from '../model/progress';

const MINUTE = 60_000;

/** `now()` that changes only at minute boundaries (the card never shows seconds, A15.3). */
export function useMinuteClock(now: () => number): number {
  const [t, setT] = useState(() => now());
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const arm = () => {
      const n = now();
      id = setTimeout(
        () => {
          setT(now());
          arm();
        },
        MINUTE - (n % MINUTE) + 50,
      );
    };
    arm();
    return () => clearTimeout(id);
  }, [now]);
  return t;
}

/** Same local calendar day (the device's time zone). */
function sameDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/**
 * "Next one at 17:40", or "Next one Tue 03:10" when it is not today. The time keeps the device's own
 * clock format (12 or 24 h); the weekday is a word inside the sentence, so it uses the app's language
 * (`locale`), never the device's (a Danish device would otherwise put "tir." into English text).
 */
export function sundialNextLine(at: number, now: number, t: Translate, locale: string): string {
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(at);
  if (sameDay(at, now)) return t('ui.capsules.sundialNext', { time });
  const day = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(at);
  return t('ui.capsules.sundialNextDay', { day, time });
}

/**
 * The hour marks of one period sit on the dial's near half, from the left (180°) round the front to the
 * right (0°); the shadow sweeps the same way as the period runs.
 */
const MARK_FROM = 180;
const MARK_SWEEP = -180;
/** The face is a circle seen at an angle: its height is this share of its width. */
const TILT = 0.5;

function Dial(p: { hours: number; periodBp: number; full: boolean; ready: boolean }) {
  const hours = Math.max(1, p.hours);
  const progress = p.full ? 1 : p.periodBp / 10_000;
  const angle = MARK_FROM + MARK_SWEEP * progress;
  const lit = p.full ? hours + 1 : Math.floor(progress * hours) + 1;
  const marks = Array.from({ length: hours + 1 }, (_, i) => {
    const a = ((MARK_FROM + (MARK_SWEEP * i) / hours) * Math.PI) / 180;
    return { i, x1: Math.cos(a) * 32, y1: Math.sin(a) * 32, x2: Math.cos(a) * 41, y2: Math.sin(a) * 41, on: i < lit };
  });
  return (
    <svg class={`sundial-dial${p.full ? ' is-full' : ''}${p.ready ? ' is-ready' : ''}`} viewBox="-54 -44 108 86" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="sundial-face" cx="0.4" cy="0.3" r="0.85">
          <stop offset="0" stop-color="#f6ecd2" />
          <stop offset="0.65" stop-color="#e0d1ad" />
          <stop offset="1" stop-color="#bfac87" />
        </radialGradient>
        <linearGradient id="sundial-side" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#a8957200" />
          <stop offset="0" stop-color="#ad9a76" />
          <stop offset="1" stop-color="#7d6b4f" />
        </linearGradient>
        <linearGradient id="sundial-bronze" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#8a5a24" />
          <stop offset="0.5" stop-color="#c98a3d" />
          <stop offset="1" stop-color="#f3bd6e" />
        </linearGradient>
      </defs>
      {/* the plinth's soft ground shadow */}
      <ellipse cx="2" cy="30" rx="48" ry="9" fill="rgba(8,5,20,0.45)" />
      <g transform="translate(0 6)">
        {/* the stone drum's side, with one chiselled band */}
        <path d="M-48 0v13a48 24 0 0 0 96 0V0" fill="url(#sundial-side)" stroke={OUTLINE} stroke-width="2.2" stroke-linejoin="round" />
        <path d="M-48 7a48 24 0 0 0 96 0" fill="none" stroke="#6d5c43" stroke-width="1.6" opacity="0.8" />
        {/* the face in perspective */}
        <g transform={`scale(1 ${TILT})`}>
          <circle r="48" fill="url(#sundial-face)" stroke={OUTLINE} stroke-width="4.4" />
          <circle r="43.5" fill="none" stroke="#b7a37d" stroke-width="2.4" />
          <circle r="22" fill="none" stroke="#c9b892" stroke-width="2" stroke-dasharray="3 5" />
          {marks.map((m) => (
            <line key={m.i} class={`sundial-mark${m.on ? ' is-on' : ''}`} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke-width="5.5" stroke-linecap="round" />
          ))}
          {/* the gnomon's shadow falls from its foot across the near half */}
          <g class="sundial-shadow" style={{ transform: `rotate(${angle}deg)` }}>
            <path d="M0 -5.5L38 -1.6Q41 0 38 1.6L0 5.5Z" fill="rgba(27,19,48,0.5)" />
          </g>
          {/* a soft highlight on the stone */}
          <path d="M-36 -22A44 44 0 0 1 -8 -41" fill="none" stroke="#fffaf0" stroke-width="3" stroke-linecap="round" opacity="0.55" />
        </g>
        {/* the bronze gnomon: a fin standing on the dial's centre */}
        <g class="sundial-gnomon">
          <path d="M-6 1.5L6 1.5L1.6 -36Q-0.4 -39.5 -2.2 -35.4Z" fill="url(#sundial-bronze)" stroke={OUTLINE} stroke-width="2.2" stroke-linejoin="round" />
          <path d="M2.2 -2L0.4 -32" stroke="#ffe6ad" stroke-width="1.8" stroke-linecap="round" opacity="0.9" />
          <ellipse cx="0" cy="2" rx="7" ry="3.4" fill="#8a5a24" stroke={OUTLINE} stroke-width="1.8" />
        </g>
      </g>
    </svg>
  );
}

export function SundialCard(p: { save: SaveDoc; content: Content; t: Translate; locale: string; now: () => number }) {
  const { t, locale } = p;
  const now = useMinuteClock(p.now);
  const v = chargesView(p.save, p.content, now);
  const prev = useRef(v.charges);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    const before = prev.current;
    prev.current = v.charges;
    if (v.charges <= before) return;
    setPop(true);
    const id = setTimeout(() => setPop(false), 700);
    return () => clearTimeout(id);
  }, [v.charges]);
  const ready = v.charges > 0;
  const status = ready ? t('ui.capsules.sundialReady', { n: formatInt(v.charges, locale), max: formatInt(v.max, locale) }) : t('ui.capsules.sundialNone');
  // A15.3: a full bank says that it is full, not only what happens when it is.
  const when = v.full || v.nextAt === null ? t('ui.capsules.sundialFull') : sundialNextLine(v.nextAt, now, t, locale);
  return (
    <section class={`sundial-card${ready ? ' is-ready' : ''}${v.full ? ' is-full' : ''}`} data-testid="sundial" aria-labelledby="sundial-title">
      <div class="sundial-card__art">
        <Dial hours={v.hours} periodBp={v.periodBp} full={v.full} ready={ready} />
        <span class={`sundial-card__gem${pop ? ' is-pop' : ''}${ready ? '' : ' is-empty'}`} aria-hidden="true" data-testid="sundial-gem">
          <CapsuleIcon tier="clay" size={26} />
        </span>
      </div>
      <div class="sundial-card__text">
        <h2 id="sundial-title" class="sundial-card__title">
          {t('ui.capsules.sundialTitle')}
        </h2>
        <b class="sundial-card__status" data-testid="sundial-status">
          {status}
        </b>
        <span class="sundial-card__when" data-testid="sundial-next">
          {when}
        </span>
        <small class="sundial-card__rule">{v.free > 0 ? t('ui.home.freeCapsules', { n: formatInt(v.free, locale) }) : t('ui.capsules.chargesNote')}</small>
      </div>
    </section>
  );
}
