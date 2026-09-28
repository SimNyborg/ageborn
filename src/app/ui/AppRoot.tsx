/** The app shell (DESIGN A9 flow, Phase 1): one screen per route over the persistent canvas. */
import { useEffect, useMemo } from 'preact/hooks';
import { createMetaUi, type MetaUi } from '../metaUi';
import { ReplayScreen } from '../screens/replay/ReplayScreen';
import { isMetaRules } from '../uiServices';
import { BattleScreen } from './BattleScreen';
import { AppUiContext, type AppUi } from './context';
import { MetaHost } from './MetaHost';
import { ResultScreen } from './ResultScreen';
import { TitleScreen } from './TitleScreen';
import './app.css';

function Screen(p: { ui: AppUi; meta: MetaUi | null }) {
  const r = p.ui.controller.route.value;
  // After onboarding, Home and every match started from it run on WP9's meta screens (Phase 2b).
  if (p.meta && p.ui.controller.save.value && p.meta.owns(r, p.ui.controller.step.value)) return <MetaHost meta={p.meta} />;
  switch (r.id) {
    case 'title':
      return <TitleScreen />;
    case 'battle':
      return <BattleScreen battle={r.battle} />;
    case 'result':
      return <ResultScreen result={r.result} />;
    case 'replay':
      return <ReplayScreen replay={r.replay} onBack={() => p.ui.controller.home()} />;
    default:
      return null;
  }
}

export function AppRoot(p: { ui: AppUi }) {
  const meta = useMemo(() => {
    const m = p.ui.services.meta;
    return isMetaRules(m) ? createMetaUi({ controller: p.ui.controller, services: p.ui.services, meta: m, download: p.ui.download }) : null;
  }, [p.ui]);
  useEffect(() => () => meta?.dispose(), [meta]);
  const reduceMotion = p.ui.controller.save.value?.settings.reduceMotion ?? false;
  return (
    <AppUiContext.Provider value={p.ui}>
      <div class="ab-root" data-testid="app" {...(reduceMotion ? { 'data-reduce-motion': '' } : {})}>
        <Screen ui={p.ui} meta={meta} />
        <div class="ab-rotate" data-testid="rotate">
          <div class="ab-rotate-phone" aria-hidden="true" />
          <span>{p.ui.t('app.rotate')}</span>
        </div>
      </div>
    </AppUiContext.Provider>
  );
}
