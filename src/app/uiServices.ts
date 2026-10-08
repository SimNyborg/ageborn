/**
 * The meta screens' services (DESIGN B2 "ui: service instances only via app/services injection",
 * docs/requests/wp9-app-wiring.md, wp7-app-wiring.md, wp8-app-wiring.md).
 *
 * `createUiServices` implements WP9's `UiServices` on top of the real meta rules (WP7) and save
 * store (WP8): queries are pure over the current save; every action computes the next save with
 * meta, then hands it to `commit` (the app's save signal plus the store). Flows the app owns
 * (battles, the capsule show, replays) go through `flow`, so this file stays testable in Node.
 */
import type { ReadonlySignal } from '@preact/signals';
import type { AgeId, CardId, I18n, OpponentSpec, ReplayDoc, Result, SaveDoc } from '@/contracts';
import { i18n as appI18n } from '@/i18n';
import { legacySkillAeonCount, type MetaRules } from '@/meta';
import { IMPORT_MESSAGE_KEYS, markExported, saveFileFor, type SaveFile } from '@/save';
import type { ActionResult, MatchRequest, Router, UiServices, WarPlan } from '@/ui/screens';
import { flagServices } from './cosmetics';
import { opponentLook } from './matchSetup';
import type { Services } from './services';

/** What the app does for the flows the screens start. */
export interface UiFlow {
  /** VS is over: build the match for `req` against `opponent` and start it. */
  begin(req: MatchRequest, opponent: OpponentSpec): void;
  /** VS is up: start loading the art the match opens with (optional). */
  warm?(req: MatchRequest, opponent: OpponentSpec): void;
  resume(): void;
  retreat(): void;
  quitSkirmish(): void;
  /** Plays a stored replay. */
  watchReplay(replay: ReplayDoc): void;
  /** Shows the capsule show for pending capsules (one id, or several for "Open all"). */
  openCapsules(ids: string[]): void;
  openWardrobe(id: string): void;
  /** A brand-new profile after Reset progress: back to onboarding match 1. */
  restart(): void;
  /** The A6.4 Age Capsule dialog; without it the suggested age is used. */
  pickAge?(choices: { ages: readonly AgeId[]; suggested: AgeId }): Promise<AgeId>;
}

export interface UiServicesDeps {
  services: Pick<Services, 'content' | 'clock' | 'saveStore' | 'eventLog'>;
  meta: MetaRules;
  save: ReadonlySignal<SaveDoc>;
  /** Replaces the save and persists it (`immediate` flushes at once, B8). */
  commit(next: SaveDoc, o?: { immediate?: boolean }): void;
  router: Router;
  flow: UiFlow;
  /** Starts a file download in the browser (a no-op in tests). */
  download?(file: SaveFile): void;
  /** Seed for a brand-new save after Reset progress. */
  newSeed?(): number;
  /** The names the Flag Atlas search reads (default: the app's i18n). */
  i18n?: Pick<I18n, 't' | 'has'>;
}

/** True when the meta passed in has WP7's helpers (the real rules do). */
export function isMetaRules(m: unknown): m is MetaRules {
  return !!m && typeof (m as MetaRules).claimQuest === 'function' && typeof (m as MetaRules).conquestBoard === 'function';
}

const OK: ActionResult = { ok: true };

/** Meta's option bag for a request (A6.8 opponent picking). */
export function opponentOptions(req: MatchRequest): Parameters<MetaRules['pickOpponent']>[4] {
  switch (req.mode) {
    case 'ladder':
      return { format: req.format };
    case 'conquest':
      return { conquestGeneral: req.general };
    case 'skirmish':
      return { skirmish: req.options, format: req.options.format };
    case 'daily':
      return req.difficulty ? { daily: { difficulty: req.difficulty } } : {};
    case 'warPath':
      return { warPath: { level: req.level, difficulty: req.difficulty } };
    default:
      return {};
  }
}

export function createUiServices(d: UiServicesDeps): UiServices {
  const { meta, router, flow } = d;
  const content = d.services.content;
  const clock = d.services.clock;
  const store = d.services.saveStore;

  /** Applies a `Result<SaveDoc>` from meta: commit on success, pass the reason on failure. */
  const apply = (r: Result<SaveDoc>, immediate = false): ActionResult => {
    if (!r.ok) return { ok: false, reason: r.reason };
    if (r.value !== d.save.peek()) d.commit(r.value, { immediate });
    return OK;
  };

  /** The save with timers moved on (charges, banks, quests); committed when something changed. */
  const ticked = (): SaveDoc => {
    const s = d.save.peek();
    const next = meta.tickTimers(s, clock);
    if (next !== s) d.commit(next);
    return next;
  };

  // The Home preview must be the opponent the next ladder match gets (meta is deterministic in the
  // save and the format: the ladder seed is `ladder:<format>`), so it is memoised per save object and
  // format, and built exactly as `prepareMatch` builds it (base look included).
  let previewFor: SaveDoc | null = null;
  const previews = new Map<string, OpponentSpec>();

  /** A18.9.4: the AI's base look, fixed here so Home, the VS screen and the battle show the same one. */
  const withLook = (o: OpponentSpec): OpponentSpec => {
    const look = o.side.look ?? opponentLook(content, o.generalId);
    return look ? { ...o, side: { ...o.side, look } } : o;
  };

  const replaysNewestFirst = (): ReplayDoc[] => [...store.loadReplays()].reverse();

  return {
    // ---- queries -----------------------------------------------------------------------------
    previewOpponent(format) {
      const s = d.save.value;
      // The ladder opens after the onboarding matches (A8): nothing to preview before.
      if (s.tutorial.step < 4) return null;
      if (previewFor !== s) {
        previewFor = s;
        previews.clear();
      }
      const key = format ?? '';
      let o = previews.get(key);
      if (!o) {
        o = withLook(meta.pickOpponent(s, 'ladder', content, clock, format ? { format } : {}));
        previews.set(key, o);
      }
      return o;
    },
    previewDaily(difficulty) {
      const s = d.save.value;
      if (s.tutorial.step < 4) return null;
      // The day's General and match seed are the same for everyone on that date (A9.1); cheap to draw.
      return withLook(meta.pickOpponent(s, 'daily', content, clock, { daily: { difficulty } }));
    },
    dailyModifier() {
      return meta.dailyModifier(content, clock);
    },
    validatePlan(plan, format) {
      return meta.validatePlan(plan, d.save.value, content, format);
    },
    autoFill() {
      return meta.autoFill(d.save.value, content) as WarPlan;
    },
    matchHistory() {
      return replaysNewestFirst();
    },

    // ---- match flow --------------------------------------------------------------------------
    prepareMatch(req) {
      const s = ticked();
      const o = req.mode === 'tutorial' ? meta.pickOpponent(s, 'tutorial', content, clock, {}) : meta.pickOpponent(s, req.mode, content, clock, opponentOptions(req));
      // Home's Battle: the Ladder as online ranked play (owner decision 2026-10-07). The same bot plays;
      // it is shown as the player the simulated search finds (name, avatar, trophies, flag; seeded).
      return withLook(req.mode === 'ladder' && req.online ? meta.onlineOpponent(s, o, content) : o);
    },
    warmMatch(req, opponent) {
      flow.warm?.(req, opponent);
    },
    beginBattle(req, opponent) {
      flow.begin(req, opponent);
    },
    resume() {
      flow.resume();
    },
    retreat() {
      flow.retreat();
    },
    quitSkirmish() {
      flow.quitSkirmish();
    },
    watchReplay(index) {
      const r = replaysNewestFirst()[index];
      if (r) flow.watchReplay(r);
    },

    // ---- capsules ----------------------------------------------------------------------------
    openCapsule(id) {
      flow.openCapsules([id]);
    },
    openAllCapsules() {
      const ids = d.save.peek().capsules.pending.map((c) => c.id);
      if (ids.length > 0) flow.openCapsules(ids);
    },
    openWardrobe(id) {
      flow.openWardrobe(id);
    },
    claimDailyCapsule() {
      return apply(meta.claimDailyCapsule(ticked(), content, clock), true);
    },
    legacySkillAeons() {
      return legacySkillAeonCount(d.save.value, meta.content);
    },
    dismissNotice(id) {
      const s = d.save.peek();
      const key = `notice.${id}`;
      if (!s.flags[key]) return;
      const flags = { ...s.flags };
      delete flags[key];
      d.commit({ ...s, flags });
    },

    // ---- cards and plans ---------------------------------------------------------------------
    upgrade(card: CardId) {
      return apply(meta.upgrade(d.save.peek(), card, content), true);
    },
    craft(id) {
      return apply(meta.craft(d.save.peek(), id, content), true);
    },
    setWarPlan(index, plan) {
      apply(meta.setWarPlan(d.save.peek(), index, plan));
    },
    setActivePlan(index) {
      apply(meta.setActivePlan(d.save.peek(), index));
    },
    markSeen(card) {
      const s = d.save.peek();
      const next = meta.markSeen(s, card);
      if (next !== s) d.commit(next);
    },
    showFeatHint(id) {
      const s = d.save.peek();
      if (s.flags[`featHint.${id}`]) return;
      d.commit({ ...s, flags: { ...s.flags, [`featHint.${id}`]: true } });
    },
    setUiFlags(patch) {
      const s = d.save.peek();
      const flags = { ...s.flags };
      let changed = false;
      for (const [k, on] of Object.entries(patch)) {
        if (!k.startsWith('ui-') || !!flags[k] === on) continue;
        changed = true;
        if (on) flags[k] = true;
        else delete flags[k];
      }
      if (changed) d.commit({ ...s, flags });
    },
    setWarPathDifficulty(dif) {
      const s = d.save.peek();
      const next = meta.setWarPathDifficulty(s, dif);
      if (next !== s) d.commit(next);
    },
    equipSkin(target, skin) {
      apply(meta.equipSkin(d.save.peek(), target, skin, content));
    },
    equipCosmetic(e) {
      return apply(meta.equipCosmetic(d.save.peek(), e, content));
    },
    craftCosmetic(key) {
      return apply(meta.craftCosmetic(d.save.peek(), key, content), true);
    },
    // The Flag Atlas (PLAN 2d): buying, progress and search (`app/cosmetics.ts` over meta's flagAtlas.ts)
    ...flagServices({ meta, content, save: d.save, i18n: d.i18n ?? appI18n, apply }),

    // ---- progression -------------------------------------------------------------------------
    claimRoadNode(trophies) {
      return apply(meta.claimRoadNode(d.save.peek(), trophies, content, clock), true);
    },
    claimQuest(slot) {
      const s = ticked();
      // A6.4: a quest that grants an Age Capsule asks for the age first (the Daily Challenge quest,
      // the War Chest slot). The claim is checked now and applied once the age is picked.
      if (flow.pickAge && meta.questGrantsAgeCapsule(s, slot, content)) {
        const check = meta.claimQuest(s, slot, content, clock);
        if (!check.ok) return { ok: false, reason: check.reason };
        void flow.pickAge(meta.ageCapsuleChoices(s, content)).then((age) => {
          apply(meta.claimQuest(meta.tickTimers(d.save.peek(), clock), slot, content, clock, { age }), true);
        });
        return OK;
      }
      return apply(meta.claimQuest(s, slot, content, clock), true);
    },
    rerollQuest(slot) {
      return apply(meta.rerollQuest(ticked(), slot, content), true);
    },

    // ---- profile and settings ----------------------------------------------------------------
    setProfile(patch) {
      const s = d.save.peek();
      const avatar = { ...s.profile.avatar };
      if (patch.portraitCard === null) delete avatar.portraitCard;
      else if (patch.portraitCard !== undefined) avatar.portraitCard = patch.portraitCard;
      const { portraitCard: _drop, ...rest } = patch;
      const name = rest.name !== undefined ? rest.name.trim().slice(0, 16) : undefined;
      d.commit({ ...s, profile: { ...s.profile, ...rest, ...(name ? { name } : { name: s.profile.name }), avatar } });
    },
    updateSettings(patch) {
      const s = d.save.peek();
      d.commit({ ...s, settings: { ...s.settings, ...patch } });
    },
    exportCode() {
      const s = d.save.peek();
      const code = store.exportCode(s);
      d.commit(markExported(s, clock.now()), { immediate: true });
      return code;
    },
    downloadSave() {
      const s = d.save.peek();
      d.download?.(saveFileFor(s, clock.now()));
      d.commit(markExported(s, clock.now()), { immediate: true });
    },
    importCode(code) {
      const r = store.importCode(code.trim());
      // The reason goes back as its message key (B8), so Settings can say what was wrong.
      if (!r.ok) return { ok: false, reason: (IMPORT_MESSAGE_KEYS as Record<string, string>)[r.reason] ?? r.reason };
      d.commit(meta.tickTimers(r.value, clock), { immediate: true });
      router.reset({ id: 'home' });
      return OK;
    },
    resetSave() {
      const withReset = store as typeof store & { reset?: () => void };
      withReset.reset?.();
      const fresh = meta.newSave(content, clock, (d.newSeed?.() ?? clock.now()) >>> 0);
      d.commit(fresh, { immediate: true });
      router.reset({ id: 'home' });
      flow.restart();
    },
    exportEventLog() {
      d.download?.({ name: 'ageborn-eventlog.json', mime: 'application/json', text: d.services.eventLog.export() });
    },
  };
}
