/**
 * Mounts WP9's meta screens (Home, Mode select, VS, Result, Pause, War Plan, Collection, Card
 * detail, Trophy Road, Conquest, Profile, Settings) over the persistent canvas, with the app's
 * battle screen in the `battle` slot (docs/requests/wp9-app-wiring.md). The routing glue lives in
 * `../metaUi.ts`.
 */
import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { asContent } from '@/content';
import { ScreenHost, visibleEntries, type ScreenSlots, type UiEnv } from '@/ui/screens';
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
  const env: Omit<UiEnv, 'toasts'> = useMemo(
    () => ({
      save: p.meta.save,
      content: asContent(ui.services.content),
      t: ui.t,
      locale: 'en',
      now: () => ui.services.clock.now(),
      router: p.meta.router,
      services: p.meta.services,
      portrait: ui.art.portrait.bind(ui.art),
    }),
    [p.meta, ui],
  );
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
