/**
 * The battle screen (DESIGN A9 #5, B6): WP5's DOM HUD over the persistent canvas, the tutorial
 * prompt, and a simple pause panel (WP9's Pause screen replaces it in Phase 2). The battle view on
 * the canvas was created with the session (`AppUi.createView`).
 */
import { useRef } from 'preact/hooks';
import { Hud } from '@/ui/hud';
import type { BattleHandle } from '../battle';
import { useApp } from './context';
import { TutorialBubble } from './TutorialBubble';

export function BattleScreen(p: { battle: BattleHandle }) {
  const ui = useApp();
  const root = useRef<HTMLDivElement>(null);
  const b = p.battle;
  const s = b.session;
  const status = s.status.value;
  const hud = s.hud.value;
  const view = ui.viewOf(s.sim);
  const settings = ui.controller.save.value?.settings;
  const togglePause = (): void => {
    if (s.status.peek() === 'paused') s.resume();
    else s.pause();
  };

  return (
    <div class="ab-layer" ref={root} data-testid="battle">
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
        t={ui.t}
      />
      <TutorialBubble
        prompt={b.prompt.value}
        root={root.current}
        view={view}
        mountsOwned={hud.mounts.filter((m) => m.owned).length}
        t={ui.t}
        onDismiss={() => b.director.dismissHint()}
      />
      {status === 'paused' ? (
        <div class="ab-scrim" data-testid="pause">
          <div class="ab-panel">
            <h2>{ui.t('app.paused')}</h2>
            <div class="ab-row">
              <button class="ab-btn ab-btn--gold" data-testid="resume" onClick={() => s.resume()}>
                {ui.t('app.resume')}
              </button>
              {hud.canRetreat && b.setup.mode !== 'tutorial' ? (
                <button
                  class="ab-btn ab-btn--plain"
                  data-testid="retreat"
                  onClick={() => {
                    s.resume();
                    s.issue({ t: 'retreat', side: 0 });
                  }}
                >
                  {ui.t('app.retreat')}
                </button>
              ) : null}
              {b.setup.mode === 'skirmish' ? (
                <button class="ab-btn ab-btn--plain" data-testid="restart" onClick={() => ui.controller.quickBattle(b.setup.config.format)}>
                  {ui.t('app.restart')}
                </button>
              ) : null}
              <button class="ab-btn ab-btn--plain" data-testid="quit" onClick={() => ui.controller.quit()}>
                {ui.t('app.quit')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
