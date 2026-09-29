/**
 * Mounts WP9's meta screens (Home, Mode select, VS, Result, Pause, War Plan, Collection, Card
 * detail, Trophy Road, Conquest, Profile, Settings) over the persistent canvas, with the app's
 * battle screen in the `battle` slot (docs/requests/wp9-app-wiring.md). The routing glue lives in
 * `../metaUi.ts`.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo } from 'preact/hooks';
import { asContent } from '@/content';
import { bindHistory, LEAVE_AGAIN_KEY } from '@/ui/history';
import { handleBack, ScreenHost, visibleEntries, type ScreenSlots, type UiEnv } from '@/ui/screens';
import type { MetaUi } from '../metaUi';
import { BattleScreen } from './BattleScreen';
import { useApp } from './context';
import './meta.css';

export interface MetaHostProps {
  meta: MetaUi;
  /** Extra slots (the capsule show, WP10). */
  slots?: ScreenSlots;
}

export function MetaHost(p: MetaHostProps) {
  const ui = useApp();
  const env: UiEnv = useMemo(
    () => ({
      save: p.meta.save,
      content: asContent(ui.services.content),
      t: ui.t,
      locale: 'en',
      now: () => ui.services.clock.now(),
      router: p.meta.router,
      services: p.meta.services,
      portrait: ui.art.portrait.bind(ui.art),
      toasts: p.meta.toasts,
      // UI sounds (ui-plan 5.4): press, deny, tab, toggle, sheet.
      sound: (id: string) => ui.services.audio.play(id),
    }),
    [p.meta, ui],
  );
  // Browser and Android back (ui-plan 2.2, U7): close the top sheet, go back, or pause in battle;
  // at Home the first back warns and only a second one within 2 s leaves the site.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history || typeof window.history.pushState !== 'function') return undefined;
    return bindHistory({
      host: window,
      onBack: () => {
        const r = ui.controller.route.peek();
        if (r.id === 'battle' && env.router.current.peek().id === 'battle') {
          if (r.battle.session.status.peek() === 'running') r.battle.session.pause();
          return true;
        }
        return handleBack(env);
      },
      onLeaveWarning: () => p.meta.toasts.show(ui.t(LEAVE_AGAIN_KEY)),
    });
  }, [env]);
  const slots: ScreenSlots = useMemo(
    () => ({
      battle: (): ComponentChildren => {
        const r = ui.controller.route.value;
        return r.id === 'battle' ? <BattleScreen battle={r.battle} externalPause /> : null;
      },
      ...p.slots,
    }),
    [ui, p.slots],
  );
  const { base } = visibleEntries(p.meta.router.stack.value);
  const route = ui.controller.route.value;
  const behind = route.id === 'result' && !!route.result.battle;
  return (
    <div class="ab-meta" data-testid="meta-ui" data-base={base.route.id} {...(behind ? { 'data-behind': '' } : {})}>
      <ScreenHost env={env} slots={slots} />
    </div>
  );
}
