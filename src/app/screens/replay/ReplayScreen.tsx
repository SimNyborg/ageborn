/**
 * The replay viewer (DESIGN A9 #14): play/pause, 1x/2x/4x, restart, and a side toggle for which HUD
 * to show. Seek arrives in v1.1. The HUD is WP5's, read-only. A replay from an older version shows
 * a notice instead (B3).
 *
 * Layout: a broadcast-style "REPLAY" plate with both names (the AI side always carries its AI chip,
 * A7.1) and a timeline of the match, docked under the HUD's clock so the lane stays clear; icon
 * controls in one compact pill; and an end card that says whether the re-simulated match ended
 * exactly like the recording (outcome and final hash, B3).
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ReplayDoc } from '@/contracts';
import { Hud } from '@/ui/hud';
import { displayName } from '../../names';
import { REPLAY_SPEEDS, ReplayPlayer } from '../../replayPlayer';
import { useApp } from '../../ui/context';
import './replay.css';

const TICKS_PER_SECOND = 20;
/** The controls fade out after this long without a pointer move or tap while the replay plays. */
const CONTROLS_IDLE_MS = 3500;

function clock(ticks: number): string {
  const s = Math.max(0, Math.floor(ticks / TICKS_PER_SECOND));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect x="6" y="5" width="4.2" height="14" rx="1.4" fill="currentColor" />
      <rect x="13.8" y="5" width="4.2" height="14" rx="1.4" fill="currentColor" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M5.5 12a6.5 6.5 0 1 0 2-4.7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
      <path d="M4 4.5v5h5z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M4 8h13m-3.5-3.5L17 8l-3.5 3.5M20 16H7m3.5-3.5L7 16l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    </svg>
  );
}

export function ReplayScreen(p: { replay: ReplayDoc; onBack: () => void }) {
  const ui = useApp();
  const player = useMemo(
    () =>
      new ReplayPlayer({
        replay: p.replay,
        content: ui.services.content,
        createSim: ui.services.sim.createSim,
        simVersion: ui.services.sim.simVersion,
        // Spectator follow (A17.4): the camera tracks the midpoint of both fronts.
        createView: (sim) => ui.createView(sim, 0, { spectator: true }),
        scheduler: ui.scheduler,
      }),
    [p.replay, ui],
  );
  useEffect(() => {
    if (player.status.peek() === 'ready') player.play();
    return () => player.dispose();
  }, [player]);
  // Like a video player: the controls step aside while the replay plays, and come back on any
  // pointer move, tap or key.
  const [awake, setAwake] = useState(true);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const wake = (): void => {
      setAwake(true);
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => setAwake(false), CONTROLS_IDLE_MS);
    };
    wake();
    const events = ['pointermove', 'pointerdown', 'keydown'] as const;
    // Capture phase: the canvas's own pointer handling can never swallow the wake-up.
    for (const e of events) window.addEventListener(e, wake, { passive: true, capture: true });
    return () => {
      if (timer !== null) clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, wake, { capture: true });
    };
  }, []);

  const status = player.status.value;
  const hud = player.hud.value;
  const side = player.hudSide.value;
  const speed = player.speed.value;
  const verified = player.verified.value;
  const sim = player.sim;
  const view = sim ? ui.viewOf(sim) : undefined;
  const other = side === 0 ? 1 : 0;
  const name = (i: 0 | 1): string => displayName(p.replay.sides[i].label, ui.services.i18n);

  if (status === 'incompatible' || !sim) {
    return (
      <div class="ab-scrim" data-testid="replay-incompatible">
        <div class="ab-panel">
          <h2>{ui.t('replay.title')}</h2>
          <p>{ui.t('replay.olderVersion')}</p>
          <button class="ab-btn ab-btn--plain" onClick={p.onBack}>
            {ui.t('replay.back')}
          </button>
        </div>
      </div>
    );
  }

  const total = Math.max(1, p.replay.result.tick);
  const tick = Math.min(total, sim.state.tick);
  const pct = Math.round((tick / total) * 1000) / 10;
  const ended = status === 'ended';
  const won = p.replay.result.winner === 0;
  const draw = p.replay.result.winner === null;
  const showControls = awake || status !== 'playing';

  return (
    <div class="ab-layer ab-replay" data-testid="replay" data-status={status}>
      {hud ? (
        <Hud
          model={hud}
          config={sim.config}
          side={side}
          readOnly
          controls={false}
          keyboard={false}
          portrait={ui.portrait}
          t={ui.t}
          // The view bridge gives the replay the minimap, its camera window and the off-screen badges (A17.5).
          {...(view ? { view } : {})}
        />
      ) : null}
      <div class="ab-replay-top">
        <div class="ab-replay-plate">
          <span class={`ab-replay-live${status === 'playing' ? ' is-on' : ''}`} data-testid="replay-badge">
            <i aria-hidden="true" />
            {ui.t('replay.badge')}
          </span>
          <span class="ab-replay-names">
            <b class="ab-replay-me">{name(0)}</b>
            <span class="ab-replay-vs">{ui.t('app.vs')}</span>
            <b class="ab-replay-foe">{name(1)}</b>
            {p.replay.sides[1].isBot ? <span class="ab-chip ab-chip--ai ab-replay-ai">{ui.t('app.aiChip')}</span> : null}
          </span>
        </div>
        <div class="ab-replay-timeline" aria-hidden="true">
          <div class="ab-replay-track">
            <div class="ab-replay-fill" style={{ width: `${pct}%` }} />
          </div>
          <span class="ab-replay-time" data-testid="replay-time">
            {clock(tick)} / {clock(total)}
          </span>
        </div>
      </div>
      <div class={`ab-replay-bar${showControls ? '' : ' is-idle'}`} role="toolbar" aria-label={ui.t('replay.title')} data-testid="replay-controls">
        {status === 'playing' ? (
          <button class="ab-rbtn ab-rbtn--main" data-testid="replay-pause" aria-label={ui.t('replay.pause')} title={ui.t('replay.pause')} onClick={() => player.pause()}>
            <PauseIcon />
          </button>
        ) : (
          <button class="ab-rbtn ab-rbtn--main" data-testid="replay-play" aria-label={ui.t('replay.play')} title={ui.t('replay.play')} disabled={ended} onClick={() => player.play()}>
            <PlayIcon />
          </button>
        )}
        <div class="ab-rseg" role="group">
          {REPLAY_SPEEDS.map((s) => (
            <button key={s} class={`ab-rseg-btn${s === speed ? ' is-on' : ''}`} aria-pressed={s === speed} data-testid={`replay-speed-${s}`} onClick={() => player.setSpeed(s)}>
              {ui.t('replay.speed', { speed: s })}
            </button>
          ))}
        </div>
        <button class="ab-rbtn" data-testid="replay-restart" aria-label={ui.t('replay.restart')} title={ui.t('replay.restart')} onClick={() => player.restart()}>
          <RestartIcon />
        </button>
        <button class="ab-rbtn ab-rbtn--wide" data-testid="replay-side" title={p.replay.sides[other].isBot ? ui.t('replay.showSide', { name: name(other) }) : ui.t('replay.showMine')} onClick={() => player.setHudSide(other)}>
          <SwapIcon />
          <span class="ab-rbtn-label">{p.replay.sides[other].isBot ? ui.t('replay.showSide', { name: name(other) }) : ui.t('replay.showMine')}</span>
        </button>
        <button class="ab-rbtn ab-rbtn--close" data-testid="replay-back" aria-label={ui.t('replay.back')} title={ui.t('replay.back')} onClick={p.onBack}>
          <CloseIcon />
        </button>
      </div>
      {ended ? (
        <div class="ab-replay-end" data-testid="replay-end">
          <div class={`ab-replay-endcard ab-replay-endcard--${draw ? 'draw' : won ? 'win' : 'loss'}`}>
            <span class="ab-replay-endtitle">{ui.t('replay.ended')}</span>
            <span class="ab-replay-endresult">{draw ? ui.t('app.draw') : won ? ui.t('app.victory') : ui.t('app.defeat')}</span>
            <span class={`ab-chip ab-replay-check${verified ? ' is-ok' : ' is-bad'}`} data-testid="replay-verified" data-verified={String(verified)}>
              {verified ? '✓ ' : '✗ '}
              {verified ? ui.t('replay.verified') : ui.t('replay.mismatch')}
            </span>
            <div class="ab-row ab-replay-endactions">
              <button class="ab-btn ab-btn--gold" data-testid="replay-again" onClick={() => player.restart()}>
                {ui.t('replay.watchAgain')}
              </button>
              <button class="ab-btn ab-btn--plain" data-testid="replay-done" onClick={p.onBack}>
                {ui.t('replay.back')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
