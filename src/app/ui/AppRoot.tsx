/** The app shell (DESIGN A9 flow, Phase 1): one screen per route over the persistent canvas. */
import { ReplayScreen } from '../screens/replay/ReplayScreen';
import { BattleScreen } from './BattleScreen';
import { AppUiContext, type AppUi } from './context';
import { ResultScreen } from './ResultScreen';
import { TitleScreen } from './TitleScreen';
import './app.css';

function Screen(p: { ui: AppUi }) {
  const r = p.ui.controller.route.value;
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
  const reduceMotion = p.ui.controller.save.value?.settings.reduceMotion ?? false;
  return (
    <AppUiContext.Provider value={p.ui}>
      <div class="ab-root" data-testid="app" {...(reduceMotion ? { 'data-reduce-motion': '' } : {})}>
        <Screen ui={p.ui} />
        <div class="ab-rotate" data-testid="rotate">
          <div class="ab-rotate-phone" aria-hidden="true" />
          <span>{p.ui.t('app.rotate')}</span>
        </div>
      </div>
    </AppUiContext.Provider>
  );
}
