/** The app shell (DESIGN A9 flow, Phase 1): one screen per route over the persistent canvas. */
import { useEffect, useMemo } from 'preact/hooks';
import { asContent } from '@/content';
import { CapsuleHost } from '../capsules/CapsuleHost';
import { CapsuleShows } from '../capsules/capsuleFlow';
import { createMetaUi, type MetaUi } from '../metaUi';
import { attachActivity } from '../stopping';
import { ReplayScreen } from '../screens/replay/ReplayScreen';
import { isMetaRules } from '../uiServices';
import { BattleScreen } from './BattleScreen';
import { FirstUpgrade } from './FirstUpgrade';
import { AppUiContext, type AppUi } from './context';
import { MetaHost } from './MetaHost';
import { ResultScreen } from './ResultScreen';
import { TitleScreen } from './TitleScreen';
import './app.css';

function Screen(p: { ui: AppUi; meta: MetaUi | null; shows: CapsuleShows | null }) {
  const r = p.ui.controller.route.value;
  // The capsule show (WP10) owns the canvas while it runs: nothing else is drawn over it.
  const show = p.shows?.current.value ?? null;
  const save = p.ui.controller.save.value;
  const m = p.ui.services.meta;
  if (show && p.shows && p.ui.pixi && save && isMetaRules(m)) {
    const ui = p.ui;
    const shows = p.shows;
    const content = ui.services.content;
    const commit = (next: typeof save) => ui.controller.setSave(next, { immediate: true });
    const onboarding = show.kind === 'capsules' && show.onboarding !== null;
    return (
      <CapsuleHost
        shows={shows}
        record={show}
        pixi={ui.pixi!}
        art={ui.art}
        audio={ui.services.audio}
        content={content}
        save={save}
        t={ui.t}
        allowMore={!onboarding}
        onEquip={(card) => {
          const s = ui.controller.save.peek();
          if (s) commit(m.equipNow(s, card, content));
        }}
        onEquipSkin={(skin) => {
          const s = ui.controller.save.peek();
          const target = asContent(content).skins[skin]?.target;
          if (!s || !target) return;
          const res = m.equipSkin(s, target, skin, content);
          if (res.ok) commit(res.value);
        }}
        {...(p.meta && !onboarding
          ? {
              onUpgrade: (card) => {
                shows.done();
                p.meta?.router.go({ id: 'cardDetail', card });
              },
            }
          : {})}
        onDone={(rec) => {
          if (rec.kind === 'capsules' && rec.onboarding) ui.controller.finishCapsuleStep();
          else ui.services.audio.music.setCue('music.menu', { fadeMs: 600 });
        }}
      />
    );
  }
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
  // The capsule show in progress (WP10); a show cut short by a reload plays again (capsuleFlow.ts).
  const shows = useMemo(() => {
    const m = p.ui.services.meta;
    if (!isMetaRules(m) || !p.ui.pixi) return null;
    const controller = p.ui.controller;
    return new CapsuleShows({
      meta: m,
      content: p.ui.services.content,
      save: () => controller.save.peek(),
      commit: (next) => controller.setSave(next, { immediate: true }),
      kv: p.ui.storage ?? null,
    });
  }, [p.ui]);
  const meta = useMemo(() => {
    const m = p.ui.services.meta;
    return isMetaRules(m)
      ? createMetaUi({
          controller: p.ui.controller,
          services: p.ui.services,
          meta: m,
          download: p.ui.download,
          ...(shows ? { openCapsules: (ids: string[]) => void shows.open(ids), openWardrobe: (id: string) => void shows.openWardrobe(id) } : {}),
        })
      : null;
  }, [p.ui, shows]);
  useEffect(() => {
    if (!meta) return undefined;
    // A15.6 session counters: input, visibility and active battle time (memory only).
    const detach = attachActivity(meta.cues, {
      battleRunning: () => {
        const r = p.ui.controller.route.peek();
        return r.id === 'battle' && r.battle.session.status.peek() === 'running';
      },
      collectionSize: () => Object.keys(p.ui.controller.save.peek()?.collection ?? {}).length,
    });
    return () => {
      detach();
      meta.dispose();
    };
  }, [meta]);
  // Onboarding capsules 1 and 2 (A8): the scripted capsule opens as soon as its step comes up.
  const step = p.ui.controller.step.value;
  const routeId = p.ui.controller.route.value.id;
  useEffect(() => {
    if (!shows || shows.active || routeId !== 'title' || (step !== 'capsule1' && step !== 'capsule2')) return;
    const s = p.ui.controller.save.peek();
    const scripted = s?.capsules.pending.find((c) => c.scriptIndex !== null) ?? s?.capsules.pending[0];
    if (!scripted || !shows.open([scripted.id], step)) p.ui.controller.finishCapsuleStep();
  }, [shows, step, routeId]);
  const reduceMotion = p.ui.controller.save.value?.settings.reduceMotion ?? false;
  return (
    <AppUiContext.Provider value={p.ui}>
      <div class="ab-root" data-testid="app" {...(reduceMotion ? { 'data-reduce-motion': '' } : {})}>
        <Screen ui={p.ui} meta={meta} shows={shows} />
        {shows?.current.value ? null : <FirstUpgrade />}
        <div class="ab-rotate" data-testid="rotate">
          <div class="ab-rotate-phone" aria-hidden="true" />
          <span>{p.ui.t('app.rotate')}</span>
        </div>
      </div>
    </AppUiContext.Provider>
  );
}
