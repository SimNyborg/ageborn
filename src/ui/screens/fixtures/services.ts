/**
 * `UiServices` for the dev page and tests: every action changes a local save signal in the
 * simplest plausible way, so the screens can be clicked through without meta (WP7), save (WP8) or
 * the app (WP11). Not game logic: the real rules live in `src/meta`; this only makes previews move.
 */
import type { Content } from '@/content/types';
import type { AgeId, PlanIssue, SaveDoc } from '@/contracts';
import { InMemorySaveStore } from '@/contracts/fakes/saveStore';
import type { Signal } from '@preact/signals';
import type { Router } from '../../router';
import { cardDef, isOwned, upgradeCost } from '../model/cards';
import type { ActionResult, UiServices, WarPlan } from '../services';
import { fixtureOpponent, fixtureReplays, fixtureResult, type OpponentFixture } from './matches';
import { newPlayerSave } from './saves';

export interface PreviewLog {
  calls: { name: string; args: unknown[] }[];
}

const ok: ActionResult = { ok: true };
const fail = (reason: string): ActionResult => ({ ok: false, reason });

/** Minimal advisor for previews (the real one is `meta.validatePlan`). Uses the `ui.advisor.*` keys. */
export function previewIssues(content: Content, plan: WarPlan, ages: readonly AgeId[]): PlanIssue[] {
  const out: PlanIssue[] = [];
  for (const age of ages) {
    const l = plan.loadouts[age];
    if (!l) continue;
    const units = l.units.filter((c): c is string => c !== null);
    const turrets = l.turrets.filter((c): c is string => c !== null);
    if (units.length < 3) out.push({ age, severity: 'error', code: 'tooFewUnits', messageKey: 'ui.advisor.tooFewUnits' });
    if (turrets.length < 1) out.push({ age, severity: 'error', code: 'noTurret', messageKey: 'ui.advisor.noTurret' });
    if (units.length === 3) out.push({ age, severity: 'warning', code: 'onlyThreeUnits', messageKey: 'ui.advisor.onlyThreeUnits' });
    if (!units.some((u) => content.units[u]?.group === 'antiArmor')) {
      out.push({ age, severity: 'warning', code: 'noAntiArmor', messageKey: 'ui.advisor.noAntiArmor' });
    }
    const air = [...units.map((u) => content.units[u]?.attacks[0]?.hitsAir), ...turrets.map((t) => content.turrets[t]?.attack.hitsAir)];
    if (content.ages[age].index >= 2 && !air.some(Boolean)) {
      out.push({ age, severity: 'warning', code: 'noAir', messageKey: 'ui.advisor.noAir' });
    }
  }
  return out;
}

export function createPreviewServices(o: {
  save: Signal<SaveDoc>;
  content: Content;
  router: Router;
  opponent?: OpponentFixture;
  replays?: number;
  log?: PreviewLog;
}): UiServices {
  const { save, content, router } = o;
  const store = new InMemorySaveStore();
  const log = (name: string, ...args: unknown[]) => o.log?.calls.push({ name, args });
  const set = (fn: (s: SaveDoc) => SaveDoc) => {
    save.value = fn(save.value);
  };
  return {
    previewOpponent() {
      return save.value.matchesPlayed >= 2
        ? fixtureOpponent(content, o.opponent ?? (save.value.lossStreak >= 3 ? 'warmUp' : 'general'))
        : null;
    },
    dailyModifier() {
      return content.dailyModifiers.order[0] ?? null;
    },
    validatePlan(plan, format) {
      return previewIssues(content, plan, content.formats[format].ages);
    },
    autoFill() {
      const s = save.value;
      const plan = s.warPlans[s.activePlan] ?? s.warPlans[0]!;
      const loadouts = { ...plan.loadouts };
      for (const age of content.order.ages) {
        const byLevel = (ids: string[]) =>
          ids.filter((id) => isOwned(s, id, content)).sort((a, b) => (s.collection[b]?.level ?? 0) - (s.collection[a]?.level ?? 0));
        const units = byLevel(content.order.units.filter((id) => content.units[id]!.age === age)).slice(0, 5);
        const turrets = byLevel(content.order.turrets.filter((id) => content.turrets[id]!.age === age)).slice(0, 2);
        loadouts[age] = {
          units: Array.from({ length: 5 }, (_, i) => units[i] ?? null),
          turrets: Array.from({ length: 2 }, (_, i) => turrets[i] ?? null),
          power: plan.loadouts[age]?.power ?? '',
        };
      }
      log('autoFill');
      return { name: plan.name, loadouts };
    },
    matchHistory() {
      return fixtureReplays(content, o.replays ?? Math.min(20, save.value.stats.matches));
    },
    prepareMatch(req) {
      log('prepareMatch', req);
      if (req.mode === 'daily') return fixtureOpponent(content, 'daily');
      if (req.mode === 'conquest')
        return {
          ...fixtureOpponent(content, req.general === 'warden' ? 'warden' : 'general'),
          generalId: req.general,
          displayName: content.generals.list[req.general as 'pip']?.nameKey ?? req.general,
        };
      if (req.mode === 'skirmish') {
        const base = fixtureOpponent(content, req.options.generalId === 'echo' ? 'echo' : 'general');
        return {
          ...base,
          generalId: req.options.generalId,
          tier: req.options.tier,
          format: req.options.format,
          displayName: content.generals.list[req.options.generalId as 'pip']?.nameKey ?? base.displayName,
        };
      }
      if (req.mode === 'tutorial')
        return req.match === 1
          ? fixtureOpponent(content, 'grogg')
          : { ...fixtureOpponent(content, 'general'), generalId: 'pip', tier: 0, level: 1, format: 'short' };
      return { ...fixtureOpponent(content, o.opponent ?? 'general'), format: req.format };
    },
    beginBattle(req, opponent) {
      log('beginBattle', req, opponent);
      const r = fixtureResult(content, 'win');
      router.reset({ id: 'home' });
      router.go({ id: 'result', info: { ...r, request: req, input: { ...r.input, opponent } } });
    },
    resume() {
      log('resume');
    },
    retreat() {
      log('retreat');
      router.reset({ id: 'home' });
      router.go({ id: 'result', info: fixtureResult(content, 'loss') });
    },
    quitSkirmish() {
      log('quitSkirmish');
      router.reset({ id: 'home' });
    },
    watchReplay(index) {
      log('watchReplay', index);
    },
    openCapsule(id) {
      log('openCapsule', id);
      set((s) => ({ ...s, capsules: { ...s.capsules, pending: s.capsules.pending.filter((c) => c.id !== id) } }));
    },
    openAllCapsules() {
      log('openAllCapsules');
      set((s) => ({ ...s, capsules: { ...s.capsules, pending: [] } }));
    },
    openWardrobe(id) {
      log('openWardrobe', id);
      set((s) => ({ ...s, capsules: { ...s.capsules, wardrobe: s.capsules.wardrobe.filter((c) => c.id !== id) } }));
    },
    claimDailyCapsule() {
      const s = save.value;
      if (s.capsules.dailyBank <= 0) return fail('none');
      set((x) => ({
        ...x,
        capsules: {
          ...x.capsules,
          dailyBank: x.capsules.dailyBank - 1,
          pending: [
            ...x.capsules.pending,
            {
              id: `daily-${x.pity.opened + x.capsules.pending.length}`,
              kind: 'daily',
              tier: 'bronze',
              startTier: 'bronze',
              scriptIndex: null,
              age: null,
              contents: { stacks: [], amber: 0, dust: 0, skin: null },
              createdAt: 0,
            },
          ],
        },
      }));
      return ok;
    },
    upgrade(card) {
      const s = save.value;
      const def = cardDef(content, card);
      const e = s.collection[card];
      if (!def || def.kind === 'power' || !e) return fail('notOwned');
      const cost = upgradeCost(content, def.rarity, e.level);
      if (!cost) return fail('maxLevel');
      if (e.copies < cost.copies) return fail('copies');
      if (s.currencies.amber < cost.amber) return fail('amber');
      set((x) => ({
        ...x,
        currencies: { ...x.currencies, amber: x.currencies.amber - cost.amber },
        collection: { ...x.collection, [card]: { ...e, level: e.level + 1, copies: e.copies - cost.copies, isNew: false } },
        codexPoints: x.codexPoints + content.rarities.cards[def.rarity].codexPoints,
      }));
      return ok;
    },
    craft(id) {
      const s = save.value;
      const skin = content.skins[id];
      if (skin) {
        const price = content.rarities.skins[skin.rarity].craftDust;
        if (!skin.craftable) return fail('notCraftable');
        if (s.skins.owned.includes(id)) return fail('owned');
        if (s.currencies.dust < price) return fail('dust');
        set((x) => ({
          ...x,
          currencies: { ...x.currencies, dust: x.currencies.dust - price },
          skins: { ...x.skins, owned: [...x.skins.owned, id] },
        }));
        return ok;
      }
      const def = cardDef(content, id);
      if (!def || def.kind === 'power') return fail('notCraftable');
      const price = content.rarities.cards[def.rarity].craftCopyDust;
      if (s.currencies.dust < price) return fail('dust');
      const e = s.collection[id] ?? { level: 1, copies: -1, foil: 'none' as const, isNew: true };
      set((x) => ({
        ...x,
        currencies: { ...x.currencies, dust: x.currencies.dust - price },
        collection: { ...x.collection, [id]: { ...e, copies: e.copies + 1 } },
      }));
      return ok;
    },
    setWarPlan(index, plan) {
      log('setWarPlan', index, plan);
      // Same rule as `meta.setWarPlan`: a new preset must be the next one (no gaps), at most 3.
      if (index < 0 || index >= 3 || index > save.value.warPlans.length) {
        log('setWarPlan:rejected', index);
        return;
      }
      set((s) => {
        const plans = [...s.warPlans];
        plans[index] = plan;
        return { ...s, warPlans: plans };
      });
    },
    setActivePlan(index) {
      set((s) => ({ ...s, activePlan: index }));
    },
    markSeen(card) {
      log('markSeen', card);
      const e = save.value.collection[card];
      if (e?.isNew) set((s) => ({ ...s, collection: { ...s.collection, [card]: { ...e, isNew: false } } }));
    },
    showFeatHint(id) {
      log('showFeatHint', id);
      set((s) => ({ ...s, flags: { ...s.flags, [`featHint.${id}`]: true } }));
    },
    equipSkin(target, skin) {
      set((s) => {
        const equipped = { ...s.skins.equipped };
        if (skin) equipped[target] = skin;
        else delete equipped[target];
        return { ...s, skins: { ...s.skins, equipped } };
      });
    },
    claimRoadNode(trophies) {
      const s = save.value;
      if (trophies > s.trophies.best || s.trophies.roadClaimed.includes(trophies)) return fail('locked');
      set((x) => ({ ...x, trophies: { ...x.trophies, roadClaimed: [...x.trophies.roadClaimed, trophies] } }));
      return ok;
    },
    claimQuest(slot) {
      set((s) => {
        if (slot === 'weekly') return { ...s, quests: { ...s.quests, weekly: { ...s.quests.weekly, claimed: true } } };
        const daily = s.quests.daily.map((q, i) => (i === slot ? { ...q, claimed: true } : q));
        return { ...s, currencies: { ...s.currencies, amber: s.currencies.amber + 100 }, quests: { ...s.quests, daily } };
      });
      return ok;
    },
    rerollQuest(slot) {
      const s = save.value;
      if (s.quests.rerollUsed) return fail('used');
      const used = new Set(s.quests.daily.map((q) => q.id));
      const next = content.quests.daily.find((q) => !used.has(q.id) && !q.requiresLegendary);
      if (!next) return fail('none');
      set((x) => ({
        ...x,
        quests: {
          ...x.quests,
          rerollUsed: true,
          daily: x.quests.daily.map((q, i) => (i === slot ? { id: next.id, progress: 0, claimed: false } : q)),
        },
      }));
      return ok;
    },
    setProfile(patch) {
      set((s) => {
        const avatar = { ...s.profile.avatar };
        if (patch.portraitCard === null) delete avatar.portraitCard;
        else if (patch.portraitCard !== undefined) avatar.portraitCard = patch.portraitCard;
        const { portraitCard: _drop, ...rest } = patch;
        return { ...s, profile: { ...s.profile, ...rest, avatar } };
      });
    },
    updateSettings(patch) {
      set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    },
    exportCode() {
      set((s) => ({ ...s, lastExportAt: s.lastExportAt === null ? s.createdAt : s.lastExportAt + 1 }));
      return store.exportCode(save.value);
    },
    downloadSave() {
      log('downloadSave');
    },
    importCode(code) {
      const r = store.importCode(code);
      if (!r.ok) return fail(r.reason);
      save.value = r.value;
      return ok;
    },
    resetSave() {
      save.value = newPlayerSave(content);
      router.reset({ id: 'home' });
    },
    exportEventLog() {
      log('exportEventLog');
    },
  };
}
