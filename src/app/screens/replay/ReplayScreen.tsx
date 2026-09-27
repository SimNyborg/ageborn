/**
 * The replay viewer (DESIGN A9 #14): play/pause, 1x/2x/4x, restart, and a side toggle for which HUD
 * to show. Seek arrives in v1.1. The HUD is WP5's, read-only. A replay from an older version shows
 * a notice instead (B3).
 */
import { useEffect, useMemo } from 'preact/hooks';
import type { ReplayDoc } from '@/contracts';
import { Hud } from '@/ui/hud';
import { REPLAY_SPEEDS, ReplayPlayer } from '../../replayPlayer';
import { useApp } from '../../ui/context';

export function ReplayScreen(p: { replay: ReplayDoc; onBack: () => void }) {
  const ui = useApp();
  const player = useMemo(
    () =>
      new ReplayPlayer({
        replay: p.replay,
        content: ui.services.content,
        createSim: ui.services.sim.createSim,
        simVersion: ui.services.sim.simVersion,
        createView: (sim) => ui.createView(sim, 0),
        scheduler: ui.scheduler,
      }),
    [p.replay, ui],
  );
  useEffect(() => {
    if (player.status.peek() === 'ready') player.play();
    return () => player.dispose();
  }, [player]);

  const status = player.status.value;
  const hud = player.hud.value;
  const side = player.hudSide.value;
  const speed = player.speed.value;
  const verified = player.verified.value;
  const sim = player.sim;
  const other = side === 0 ? 1 : 0;

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

  return (
    <div class="ab-layer" data-testid="replay">
      {hud ? <Hud model={hud} config={sim.config} side={side} readOnly controls={false} keyboard={false} portrait={ui.portrait} t={ui.t} /> : null}
      {status === 'ended' ? (
        <div class="ab-replay-status">
          <span class="ab-chip" data-testid="replay-verified" data-verified={String(verified)}>
            {ui.t('replay.ended')} · {verified ? ui.t('replay.verified') : ui.t('replay.mismatch')}
          </span>
        </div>
      ) : null}
      <div class="ab-replay-bar">
        {status === 'playing' ? (
          <button class="ab-btn ab-btn--small" data-testid="replay-pause" onClick={() => player.pause()}>
            {ui.t('replay.pause')}
          </button>
        ) : (
          <button class="ab-btn ab-btn--small" data-testid="replay-play" disabled={status === 'ended'} onClick={() => player.play()}>
            {ui.t('replay.play')}
          </button>
        )}
        {REPLAY_SPEEDS.map((s) => (
          <button key={s} class={`ab-btn ab-btn--plain ab-btn--small${s === speed ? ' is-on' : ''}`} data-testid={`replay-speed-${s}`} onClick={() => player.setSpeed(s)}>
            {ui.t('replay.speed', { speed: s })}
          </button>
        ))}
        <button class="ab-btn ab-btn--plain ab-btn--small" data-testid="replay-restart" onClick={() => player.restart()}>
          {ui.t('replay.restart')}
        </button>
        <button class="ab-btn ab-btn--plain ab-btn--small" data-testid="replay-side" onClick={() => player.setHudSide(other)}>
          {ui.t('replay.showSide', { name: p.replay.sides[other].label })}
        </button>
        <button class="ab-btn ab-btn--plain ab-btn--small" data-testid="replay-back" onClick={p.onBack}>
          {ui.t('replay.back')}
        </button>
      </div>
    </div>
  );
}
