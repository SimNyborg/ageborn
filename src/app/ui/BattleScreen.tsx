/**
 * The battle screen (DESIGN A9 #5, B6): WP5's DOM HUD over the persistent canvas, the tutorial
 * prompt, and a compact pause card (WP9's Pause screen replaces it in the meta flow). The battle view
 * on the canvas was created with the session (`AppUi.createView`). The pause card sits at the top and
 * leaves the lane uncovered and its input live, so a paused player can scout (A17.4: the camera pans
 * freely while paused).
 *
 * A live (online) match (queue item 34, `BattleHandle.live`) never pauses: the HUD gets the live layer,
 * its menu (Retreat, Settings over the running battle) and the session's refused pauses (P is the HUD's
 * own; the back button arrives as `pauseAsks`), and the opponent mute follows the Settings switch.
 */
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { Hud, type LiveMenuActions } from '@/ui/hud';
import type { BattleHandle } from '../battle';
import { emoteWheelOf } from '../cosmetics';
import { useApp } from './context';
import { TutorialBubble } from './TutorialBubble';
import { Button } from '@/ui/components/Button';

/** The "Scouted (n)" chip appears from match 3; new players have enough to read (audit #11). */
export const SCOUTED_FROM_MATCH = 3;

export function BattleScreen(p: {
  battle: BattleHandle;
  /** The meta screens draw WP9's Pause overlay instead of the simple panel (Phase 2b). */
  externalPause?: boolean;
  /** Opens Settings over the battle (a live match's menu; the meta screens wire it). */
  onSettings?: () => void;
}) {
  const ui = useApp();
  const root = useRef<HTMLDivElement>(null);
  const b = p.battle;
  const s = b.session;
  const status = s.status.value;
  const hud = s.hud.value;
  const view = ui.viewOf(s.sim);
  const save = ui.controller.save.value;
  const settings = save?.settings;
  // the opponent's AI General performs its emotes (docs/requests/custom-c-foe-emote.md)
  const wheel = emoteWheelOf(save, ui.services.content, b.setup.opponent);
  const countdown = b.countdown.value;
  const prompt = b.prompt.value;
  const togglePause = (): void => {
    // Pausing during "3-2-1" ends the countdown, so the pause screen shows a running battle.
    if (b.countdown.peek() > 0) ui.controller.skipCountdown();
    if (s.status.peek() === 'paused') s.resume();
    else s.pause();
  };
  const live = b.live;
  const onSettings = p.onSettings;
  const liveMenu: LiveMenuActions | null = useMemo(
    () => (live ? { retreat: () => s.issue({ t: 'retreat', side: 0 }), ...(onSettings ? { settings: onSettings } : {}) } : null),
    [live, s, onSettings],
  );
  // Settings › Mute opponent emotes applies to a live match at once, both ways
  const mutedSetting = settings?.mutedEmotes;
  const firstMute = useRef(true);
  useEffect(() => {
    if (firstMute.current) {
      firstMute.current = false;
      return;
    }
    if (live && mutedSetting !== undefined) live.setMuted(mutedSetting);
  }, [live, mutedSetting]);

  return (
    <div class="ab-layer" ref={root} data-testid="battle" data-tut={prompt?.kind === 'beat' ? prompt.target ?? '' : ''}>
      <Hud
        model={s.hud}
        config={s.sim.config}
        side={0}
        issue={(c) => s.issue(c)}
        onPause={togglePause}
        onSpeed={(sp) => s.setSpeed(sp)}
        {...(view ? { view } : {})}
        portrait={ui.portrait}
        audio={ui.services.audio}
        teamPreset={settings?.teamPreset ?? 'default'}
        scouted={b.setup.matchNumber >= SCOUTED_FROM_MATCH}
        callouts={b.setup.mode !== 'tutorial' && b.setup.script === null}
        {...(wheel ? { emoteWheel: wheel } : {})}
        {...(live && liveMenu ? { live, liveMenu, menuAsks: s.pauseAsks } : {})}
        t={ui.t}
      />
      {countdown >= 0 ? (
        <div class="ab-countdown" data-testid="countdown" data-count={countdown} aria-live="assertive">
          <span key={countdown} class={`ab-countdown-num${countdown === 0 ? ' is-fight' : ''}`}>
            {countdown === 0 ? ui.t('app.fight') : countdown}
          </span>
        </div>
      ) : null}
      <TutorialBubble
        prompt={prompt}
        root={root.current}
        view={view}
        mountsOwned={hud.mounts.filter((m) => m.owned).length}
        t={ui.t}
        onDismiss={() => b.director.dismissHint()}
      />
      {status === 'paused' && !p.externalPause ? (
        <div class="ab-pause" data-testid="pause">
          <div class="ab-pause-card" role="dialog" aria-labelledby="ab-pause-title">
            <h2 id="ab-pause-title">{ui.t('app.paused')}</h2>
            <p class="ab-pause-hint">{ui.t('app.pauseScout')}</p>
            <div class="ab-row">
              <Button kind="primary" size="l" testid="resume" onClick={() => s.resume()}>
                {ui.t('app.resume')}
              </Button>
              {hud.canRetreat && b.setup.mode !== 'tutorial' ? (
                <Button
                  kind="destructive"
                  size="s"
                  testid="retreat"
                  onClick={() => {
                    s.resume();
                    s.issue({ t: 'retreat', side: 0 });
                  }}
                >
                  {ui.t('app.retreat')}
                </Button>
              ) : null}
              {b.setup.mode === 'skirmish' ? (
                <Button kind="secondary" size="m" testid="restart" onClick={() => ui.controller.quickBattle(b.setup.config.format)}>
                  {ui.t('app.restart')}
                </Button>
              ) : null}
              <Button kind="secondary" size="m" testid="quit" onClick={() => ui.controller.quit()}>
                {ui.t('app.quit')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
