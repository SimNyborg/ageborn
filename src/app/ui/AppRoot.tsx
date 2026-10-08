/** The app shell (DESIGN A9 flow, Phase 1): one screen per route over the persistent canvas. */
import type { ComponentChildren } from 'preact';
import { useEffect, useErrorBoundary, useMemo } from 'preact/hooks';
import { asContent } from '@/content';
import { CosmeticArtContext, CosmeticPicturesContext } from '@/ui/components/cosmeticArt';
import { dioramaMount, showcaseMount } from '@/render';
import { DioramaContext } from '@/ui/components/diorama';
import { ShowcaseContext } from '@/ui/components/showcase';
import { cosmeticImageUrl, onCosmeticPicturesChanged, parseCosmeticKey } from '@/visuals/cosmetics/art';
import { cosmeticCollectionKey, cosmeticNameKey } from '@/content/keys';
import { foundCosmetics } from '../capsules/capsuleFlow';
import { CapsuleHost } from '../capsules/CapsuleHost';
import { CapsuleShows } from '../capsules/capsuleFlow';
import { createMetaUi, warmMatchArt, type MetaUi } from '../metaUi';
import { attachActivity } from '../stopping';
import { takeAbandonNotice } from '../abandon';
import { ReplayScreen } from '../screens/replay/ReplayScreen';
import { resultActionKey, resultPathAfterCapsule } from '@/ui/screens/result/ResultScreen';
import { firstUpgradePending, pendingUnlock } from '@/ui/screens/model/warPath';
import { isMetaRules } from '../uiServices';
import { AgeDialog } from './AgeDialog';
import { BattleScreen } from './BattleScreen';
import { FirstUpgrade } from './FirstUpgrade';
import { AppUiContext, type AppUi } from './context';
import { MetaHost } from './MetaHost';
import { ResultScreen } from './ResultScreen';
import { TesterDialog } from './TesterDialog';
import { TitleScreen } from './TitleScreen';
import './app.css';

/**
 * A capsule show that throws while drawing (a record this build cannot play) is dropped, so the app
 * goes on to Home or the next step instead of a blank page (B8: the save already holds the result).
 */
function ShowGuard(p: { shows: CapsuleShows; onAbandon: () => void; children: ComponentChildren }) {
  const [error] = useErrorBoundary((e: unknown) => {
    console.error('capsule show failed; skipping it', e);
    p.shows.abandon();
    p.onAbandon();
  });
  return error ? null : <>{p.children}</>;
}

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
    const onboardingStep = show.kind === 'capsules' ? show.onboarding : null;
    // Opened from the Result: the summary's primary continues the Result's path (ui-plan 2.5).
    const top = p.meta?.router.current.peek();
    const path = !onboarding && top?.id === 'result' ? resultPathAfterCapsule(top.info) : null;
    // FTUE audit 2026-10-01 #3: while a Home unlock or the first upgrade waits, the primary is Home and
    // the Result's path ("Next battle") the secondary, so a player who follows the primary sees Home.
    // Otherwise Home is the secondary (bug hunt #8: it was missing).
    const homeFirst = path !== null && path !== 'home' && (pendingUnlock(save, asContent(content)) !== null || firstUpgradePending(save));
    const pathLabel = path ? ui.t(resultActionKey(path)) : undefined;
    const homeLabel = ui.t('app.home');
    // Onboarding capsules continue to the map: "Continue", as after every War Path win (4.6).
    const doneLabel = onboarding ? ui.t('ui.result.continue') : path ? (homeFirst ? homeLabel : pathLabel) : undefined;
    const altLabel = path && path !== 'home' ? (homeFirst ? pathLabel : homeLabel) : undefined;
    // Which way Done goes: Home (homeFirst), or the Result's path; the alt button takes the other.
    const choice = { home: homeFirst };
    const goHome = () => p.meta?.router.reset({ id: 'home' });
    return (
      <ShowGuard
        key={show}
        shows={shows}
        onAbandon={() => {
          if (onboardingStep) ui.controller.finishCapsuleStep();
        }}
      >
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
          {...(doneLabel ? { doneLabel } : {})}
          {...(altLabel
            ? {
                altLabel,
                onAlt: () => {
                  choice.home = !homeFirst;
                },
              }
            : {})}
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
            // Leaving for Home before the Result re-renders, so its own "after the capsule" path never runs.
            if (path !== null && choice.home) goHome();
            if (rec.kind === 'capsules' && rec.onboarding) ui.controller.finishCapsuleStep();
            else ui.services.audio.music.setCue('music.menu', { fadeMs: 600 });
            // A18.9.4: the collection items the capsules or crate held (the show reveals cards and skins)
            for (const key of foundCosmetics(rec)) {
              const k = parseCosmeticKey(key);
              if (!k) continue;
              p.meta?.toasts.show(ui.t('cosmetic.ui.alsoFound', { name: ui.t(cosmeticNameKey(k.collection, k.id)), collection: ui.t(cosmeticCollectionKey(k.collection)) }), { tone: 'gold', ms: 4200 });
            }
          }}
        />
      </ShowGuard>
    );
  }
  // After onboarding, Home and every match started from it run on WP9's meta screens (Phase 2b).
  if (p.meta && p.ui.controller.save.value && p.meta.owns(r, p.ui.controller.step.value)) return <MetaHost meta={p.meta} />;
  switch (r.id) {
    case 'title':
      return p.meta ? (
        <TitleScreen onSettings={() => p.meta!.openSettings()} notice={p.meta.notice.value} onDismissNotice={() => p.meta!.dismissNotice()} />
      ) : (
        <TitleScreen />
      );
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
          ...(p.ui.artReady ? { artReady: p.ui.artReady } : {}),
          // VS warms the battle's opening art: base skin models and scenes (review 1)
          warm: (setup) => warmMatchArt(p.ui.art, setup),
          ...(shows
            ? {
                openCapsules: (ids: string[]) => void shows.open(ids),
                openWardrobe: (id: string) => void shows.openWardrobe(id),
              }
            : {}),
        })
      : null;
  }, [p.ui, shows]);
  useEffect(() => {
    if (!meta) return undefined;
    // Bug hunt 2026-10-01 #9: a Ladder battle left by a reload was applied as a Retreat at boot; say so.
    if (takeAbandonNotice()) meta.toasts.show(p.ui.t('app.abandoned'), { ms: 6000 });
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
  // The live card showcase (owner request 2026-10-07): Card detail and the first forced upgrade play the
  // card's real battle art when the app provides a mount (docs/requests/wp11-card-showcase-wiring.md).
  const showcase = useMemo(() => showcaseMount(p.ui.art, { content: p.ui.services.content }), [p.ui.art, p.ui.services.content]);
  // The Customize diorama (PLAN 2a): render's mount once Track B builds it; null keeps the stills.
  const diorama = useMemo(() => dioramaMount(p.ui.art, { content: p.ui.services.content }), [p.ui.art, p.ui.services.content]);
  return (
    <AppUiContext.Provider value={p.ui}>
      {/* A18.9.4: the code-drawn cosmetic art (flags, decorations, emotes) for the screens and the HUD */}
      <CosmeticArtContext.Provider value={cosmeticImageUrl}>
        {/* a scene or sky still updates itself once its strips have streamed in (Track A) */}
        <CosmeticPicturesContext.Provider value={onCosmeticPicturesChanged}>
          <ShowcaseContext.Provider value={showcase}>
            <DioramaContext.Provider value={diorama}>
              <div class="ab-root" data-testid="app" {...(reduceMotion ? { 'data-reduce-motion': '' } : {})}>
                <Screen ui={p.ui} meta={meta} shows={shows} />
                {shows?.current.value ? null : <FirstUpgrade />}
                <AgeDialog />
                <TesterDialog />
                <div class="ab-rotate" data-testid="rotate">
                  <div class="ab-rotate-phone" aria-hidden="true" />
                  <span>{p.ui.t('app.rotate')}</span>
                </div>
              </div>
            </DioramaContext.Provider>
          </ShowcaseContext.Provider>
        </CosmeticPicturesContext.Provider>
      </CosmeticArtContext.Provider>
    </AppUiContext.Provider>
  );
}
