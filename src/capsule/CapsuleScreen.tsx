/**
 * Capsule and Wardrobe Crate screens (DESIGN A10, A10.1, A9 screen 8).
 *
 * Each screen plans the show from the reveal data, mounts a `CapsuleStage` into the app's
 * persistent Pixi canvas (B6), drives it with a `ShowRunner` on the Pixi ticker, and lays a DOM
 * overlay on top: the input surface (tap, hold to fast-forward, Skip), the pity panel shown on every
 * capsule screen (A6.5), the Amber counter and the summary. The result was rolled and saved before
 * this screen opens (A6.4, B8); nothing here can change it.
 */
import type { Application, Ticker } from 'pixi.js';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ArtProvider, AudioService, CapsuleReveal, I18n, WardrobeReveal } from '@/contracts';
import { fnv1a32 } from '@/core';
import { i18n as appI18n } from '@/i18n';
import css from './capsule.module.css';
import { CapsuleStage } from './capsuleStage';
import { RARITY_COLORS, cssHex } from './palette';
import { planOpenAll, planWardrobeShow, type Cue, type ShowPlan, type ShowStep } from './plan';
import { ShowRunner, type RunnerState } from './runner';
import { SummaryPanel, type SummaryActions } from './summary';
import { pityLines, wardrobePityLines, type PityLine } from './summaryModel';
import {
  DEFAULT_PITY_RULES,
  DEFAULT_SHOW_SETTINGS,
  type CapsuleCatalog,
  type PityCounters,
  type PityRules,
  type ProgressLookup,
  type ShowSettings,
} from './types';

/** Press longer than this and it is a hold (fast-forward), not a tap. */
const HOLD_MS = 240;

interface ShowScreenBase extends SummaryActions {
  /** The app's persistent Pixi application (DESIGN B6). */
  pixi: Application;
  art: ArtProvider;
  audio?: AudioService | null;
  /** Defaults to the app-wide i18n. */
  i18n?: I18n;
  catalog: CapsuleCatalog;
  pityRules?: PityRules;
  settings?: Partial<ShowSettings>;
  /** Switch to the capsule room music on mount (A13 "Capsule room"). Default true. */
  playMusic?: boolean;
  /** Opens the odds overview; the Odds button is hidden without it. */
  onShowOdds?: () => void;
  /** Dev and tests: every cue as it plays, and every runner state change. */
  onCue?: (cue: Cue, step: ShowStep) => void;
  onState?: (s: RunnerState) => void;
}

export interface CapsuleScreenProps extends ShowScreenBase {
  /** One capsule plays the full show; several play "Open all" (A10 Rules). */
  reveals: CapsuleReveal[];
  /** Copies bars (build with `progressFromCollections` from the save before and after opening). */
  progress?: ProgressLookup;
}

export interface WardrobeScreenProps extends ShowScreenBase {
  reveal: WardrobeReveal;
  /** `platform.features.reelReveal` (A10.1). */
  reelReveal: boolean;
  /** The save's pity counters (Wardrobe counters are shown, A6.5). */
  pity?: PityCounters;
}

export function CapsuleScreen(p: CapsuleScreenProps) {
  const plan = useMemo(() => planOpenAll(p.reveals, { catalog: p.catalog, ...(p.progress ? { progress: p.progress } : {}) }), [p.reveals, p.catalog, p.progress]);
  const i18n = p.i18n ?? appI18n;
  const rules = p.pityRules ?? DEFAULT_PITY_RULES;
  const before = plan.summary.pityBefore;
  const after = plan.summary.pityAfter;
  const first = p.reveals[0];
  const title =
    plan.mode === 'openAll'
      ? i18n.t('capsule.summary.openAllTitle', { n: p.reveals.length })
      : i18n.t('capsule.summary.title', { name: first ? i18n.t(`capsuleTier.${first.capsule.tier}.name`) : '' });
  const seed = fnv1a32(p.reveals.map((r) => r.capsule.id).join('|'));
  return (
    <ShowScreen
      {...p}
      plan={plan}
      seed={seed}
      title={title}
      ariaLabel={i18n.t('capsule.aria.stage')}
      pityBefore={before ? pityLines(before, rules) : []}
      pityAfter={after ? pityLines(after, rules) : []}
    />
  );
}

export function WardrobeScreen(p: WardrobeScreenProps) {
  const plan = useMemo(() => planWardrobeShow(p.reveal, { catalog: p.catalog, reelReveal: p.reelReveal }), [p.reveal, p.catalog, p.reelReveal]);
  const i18n = p.i18n ?? appI18n;
  const lines = p.pity ? wardrobePityLines(p.pity, p.pityRules ?? DEFAULT_PITY_RULES) : [];
  return (
    <ShowScreen
      {...p}
      plan={plan}
      seed={fnv1a32(p.reveal.crate.id)}
      title={i18n.t('capsule.summary.crateTitle')}
      ariaLabel={i18n.t('capsule.aria.crateStage')}
      pityBefore={lines}
      pityAfter={lines}
    />
  );
}

interface ShowScreenProps extends ShowScreenBase {
  plan: ShowPlan;
  progress?: ProgressLookup;
  seed: number;
  title: string;
  ariaLabel: string;
  pityBefore: PityLine[];
  pityAfter: PityLine[];
}

interface Controls {
  runner: ShowRunner | null;
}

function ShowScreen(p: ShowScreenProps) {
  const i18n = p.i18n ?? appI18n;
  const t = (k: string, o?: Record<string, string | number>) => i18n.t(k, o);
  const [state, setState] = useState<RunnerState | null>(null);
  const ctl = useRef<Controls>({ runner: null });
  const cbs = useRef({ onCue: p.onCue, onState: p.onState });
  cbs.current = { onCue: p.onCue, onState: p.onState };
  const settings: ShowSettings = { ...DEFAULT_SHOW_SETTINGS, ...p.settings };
  const settingsKey = `${settings.reduceMotion}|${settings.vibrate}|${settings.teamPreset}`;

  useEffect(() => {
    const app = p.pixi;
    if (import.meta.env.DEV && p.plan.issues.length > 0) console.warn('[capsule] reveal data issues:', p.plan.issues);
    const stage = new CapsuleStage(p.plan, {
      art: p.art,
      i18n,
      catalog: p.catalog,
      ...(p.progress ? { progress: p.progress } : {}),
      settings,
      seed: p.seed,
    });
    app.stage.addChild(stage.root);
    const onResize = () => stage.resize(app.screen.width, app.screen.height);
    onResize();
    app.renderer.on('resize', onResize);
    const runner = new ShowRunner(p.plan, stage, {
      audio: p.audio ?? null,
      onCue: (c, s) => cbs.current.onCue?.(c, s),
      onState: (s) => {
        setState(s);
        cbs.current.onState?.(s);
      },
    });
    ctl.current.runner = runner;
    if (p.audio && p.playMusic !== false) p.audio.music.setCue('music.capsule', { fadeMs: 600 });
    runner.start();
    const tick = (tk: Ticker) => {
      runner.update(tk.deltaMS);
      stage.update(Math.min(250, tk.deltaMS) * runner.timeScale);
    };
    app.ticker.add(tick);
    return () => {
      app.ticker.remove(tick);
      app.renderer.off('resize', onResize);
      ctl.current.runner = null;
      stage.root.removeFromParent();
      stage.destroy();
    };
    // The show restarts only for a new plan or other settings; callbacks are read through refs.
  }, [p.plan, p.pixi, p.art, p.audio, settingsKey, p.seed]);

  // Input: tap, hold to fast-forward, Skip.
  const hold = useRef<{ timer: ReturnType<typeof setTimeout> | null; held: boolean }>({ timer: null, held: false });
  const press = () => {
    const h = hold.current;
    if (h.timer) clearTimeout(h.timer);
    h.held = false;
    h.timer = setTimeout(() => {
      h.held = true;
      ctl.current.runner?.setHold(true);
    }, HOLD_MS);
  };
  const release = (tap: boolean) => {
    const h = hold.current;
    if (h.timer) clearTimeout(h.timer);
    h.timer = null;
    if (h.held) ctl.current.runner?.setHold(false);
    else if (tap) ctl.current.runner?.tap();
    h.held = false;
  };
  useEffect(() => () => {
    if (hold.current.timer) clearTimeout(hold.current.timer);
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) press();
    } else if (e.key === 'Escape' || e.key === 's' || e.key === 'S') {
      ctl.current.runner?.skip();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      release(true);
    }
  };

  const inSummary = state?.kind === 'summary';
  const opened = state?.opened ?? false;
  const amber = p.plan.summary.amber;
  const dust = p.plan.summary.dust;
  const pity = inSummary ? p.pityAfter : p.pityBefore;
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => rootRef.current?.focus(), []);

  return (
    <div
      ref={rootRef}
      class={css.screen}
      role="application"
      aria-label={p.ariaLabel}
      tabIndex={0}
      data-testid="capsule-screen"
      data-step={state?.kind ?? ''}
      data-phase={state?.phase ?? ''}
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        press();
      }}
      onPointerUp={() => release(true)}
      onPointerCancel={() => release(false)}
      onPointerLeave={() => release(false)}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      <div class={css.top}>
        {pity.length > 0 ? <PityPanel lines={pity} t={t} onShowOdds={p.onShowOdds} /> : <span />}
        {amber > 0 || (dust > 0 && p.plan.mode === 'wardrobe') ? <Counter value={amber > 0 ? amber : dust} dust={amber === 0} run={opened} label={t(amber > 0 ? 'capsule.amber' : 'capsule.dust')} /> : null}
      </div>
      {state?.prompt === 'tap' ? (
        <div class={css.tap} data-testid="capsule-tap">
          {t('capsule.tap')}
        </div>
      ) : null}
      {!inSummary ? (
        <div class={css.bottom}>
          {state?.holding && state.canFastForward ? <span class={css.ff}>▶▶ {t('capsule.fastForward')}</span> : state?.canFastForward ? <span class={css.hint}>{t('capsule.holdHint')}</span> : null}
          {state?.canSkip ? (
            <button
              class={css.skip}
              type="button"
              aria-label={t('capsule.aria.skip')}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                ctl.current.runner?.skip();
              }}
              data-testid="capsule-skip"
            >
              {t('capsule.skip')} ▸▸
            </button>
          ) : null}
        </div>
      ) : null}
      {inSummary ? (
        <SummaryPanel
          model={p.plan.summary}
          art={p.art}
          i18n={i18n}
          catalog={p.catalog}
          title={p.title}
          actions={{
            onDone: p.onDone,
            ...(p.onEquip ? { onEquip: p.onEquip } : {}),
            ...(p.onEquipSkin ? { onEquipSkin: p.onEquipSkin } : {}),
            ...(p.onUpgrade ? { onUpgrade: p.onUpgrade } : {}),
            ...(p.onOpenNext ? { onOpenNext: p.onOpenNext } : {}),
            ...(p.pendingCount !== undefined ? { pendingCount: p.pendingCount } : {}),
          }}
        />
      ) : null}
    </div>
  );
}

const PITY_COLORS: Record<string, number> = {
  'capsule.pity.epic': RARITY_COLORS.epic,
  'capsule.pity.legendary': RARITY_COLORS.legendary,
  'capsule.pity.newCard': 0xff6a3d,
  'capsule.pity.wardrobeEpic': RARITY_COLORS.epic,
  'capsule.pity.wardrobeLegendary': RARITY_COLORS.legendary,
};

/** Pity counters, visible on every capsule screen (A6.5). */
function PityPanel(p: { lines: PityLine[]; t: (k: string, o?: Record<string, string | number>) => string; onShowOdds: (() => void) | undefined }) {
  const prev = useRef<Map<string, number>>(new Map());
  const changed = new Set<string>();
  for (const l of p.lines) {
    const was = prev.current.get(l.key);
    if (was !== undefined && was !== l.n) changed.add(l.key);
  }
  useEffect(() => {
    prev.current = new Map(p.lines.map((l) => [l.key, l.n]));
  });
  return (
    <div class={css.pity} data-testid="capsule-pity" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
      <div class={css.pityTitle}>
        <span>{p.t('capsule.pity.title')}</span>
        {p.onShowOdds ? (
          <button class={css.odds} type="button" onClick={() => p.onShowOdds?.()}>
            {p.t('capsule.pity.odds')}
          </button>
        ) : null}
      </div>
      {p.lines.map((l) => (
        <div key={`${l.key}:${l.n}`} class={`${css.pityLine} ${changed.has(l.key) ? css.pityChanged : ''}`} data-testid={l.key}>
          <span class={css.pityDot} style={{ color: cssHex(PITY_COLORS[l.key] ?? 0xffffff) }} />
          {p.t(l.key, { n: l.n })}
        </div>
      ))}
    </div>
  );
}

/** Counts up once the capsule opens ("Amber pours into the counter", A10 step 4). */
function Counter(p: { value: number; dust: boolean; run: boolean; label: string }) {
  const [shown, setShown] = useState(0);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!p.run) {
      setShown(0);
      return;
    }
    let raf = 0;
    const start = performance.now() + 650;
    const dur = 700;
    const step = (now: number) => {
      const u = Math.max(0, Math.min(1, (now - start) / dur));
      const eased = 1 - Math.pow(1 - u, 3);
      setShown(Math.round(p.value * eased));
      setPulse(u > 0 && u < 1);
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [p.run, p.value]);
  return (
    <div class={`${css.amber} ${pulse ? css.amberPulse : ''}`} title={p.label} data-testid="capsule-amber">
      <span class={p.dust ? css.dustGem : css.amberGem} />+{shown}
    </div>
  );
}
