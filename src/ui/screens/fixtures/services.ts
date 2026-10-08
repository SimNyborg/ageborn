/**
 * `UiServices` for the dev page and tests: every action changes a local save signal in the
 * simplest plausible way, so the screens can be clicked through without meta (WP7), save (WP8) or
 * the app (WP11). Not game logic: the real rules live in `src/meta`; this only makes previews move.
 */
import type { Content } from '@/content/types';
import { FLAG_REGIONS } from '@/content/raw/nationalFlags';
import type { AgeId, PlanIssue, SaveDoc } from '@/contracts';
import { InMemorySaveStore } from '@/contracts/fakes/saveStore';
import { i18n } from '@/i18n';
import type { Signal } from '@preact/signals';
import type { Router } from '../../router';
import { cardDef, isOwned, upgradeCost } from '../model/cards';
import { craftPrice, equippedOf, findItem, itemKey, itemsOf, nationalFlagPrice } from '../model/cosmetics';
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
    previewOpponent(format) {
      log('previewOpponent', format);
      if (save.value.matchesPlayed < 2) return null;
      const opp = fixtureOpponent(content, o.opponent ?? (save.value.lossStreak >= 3 ? 'warmUp' : 'general'));
      return format ? { ...opp, format } : opp;
    },
    previewDaily(difficulty) {
      log('previewDaily', difficulty);
      if (save.value.matchesPlayed < 2) return null;
      return { ...fixtureOpponent(content, 'general'), format: content.dailyModifiers.challenge.format };
    },
    dailyModifier() {
      return content.dailyModifiers.order[0] ?? null;
    },
    validatePlan(plan, format) {
      return previewIssues(content, plan, content.formats[format]?.ages ?? []);
    },
    autoFill() {
      const s = save.value;
      const plan = s.warPlans[s.activePlan] ?? s.warPlans[0]!;
      const loadouts = { ...plan.loadouts };
      for (const age of content.order.ages) {
        const byLevel = (ids: string[]) =>
          ids.filter((id) => isOwned(s, id, content)).sort((a, b) => (s.collection[b]?.level ?? 0) - (s.collection[a]?.level ?? 0));
        const units = byLevel(content.order.units.filter((id) => content.units[id]!.age === age)).slice(0, 7);
        const turrets = byLevel(content.order.turrets.filter((id) => content.turrets[id]!.age === age)).slice(0, 2);
        loadouts[age] = {
          units: Array.from({ length: 7 }, (_, i) => units[i] ?? null),
          turrets: Array.from({ length: 2 }, (_, i) => turrets[i] ?? null),
          powers: plan.loadouts[age]?.powers ?? { home: null, field: null },
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
      if (req.mode === 'warPath') {
        const l = content.warPath.levels[req.level];
        const g = l ? content.generals.list[l.general] : undefined;
        return { ...fixtureOpponent(content, 'general'), generalId: l?.general ?? 'pip', displayName: g?.nameKey ?? 'general.pip.name', format: l?.format ?? 'w1.stone', modifiers: [...(l?.modifiers ?? [])] };
      }
      // Home's Battle: the ranked Ladder's bot shown as the player the search finds (owner decision 2026-10-07).
      if (req.online) return { ...fixtureOpponent(content, 'player'), format: req.format };
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
    legacySkillAeons() {
      // The preview has no meta: count the skill sources a legacy save was granted again (B8 step 3).
      return Object.keys(save.value.flags).filter((k) => k.startsWith('capsule.legacySkillAeon.') && save.value.flags[k]).length;
    },
    dismissNotice(id) {
      log('dismissNotice', id);
      set((s) => {
        const flags = { ...s.flags };
        delete flags[`notice.${id}`];
        return { ...s, flags };
      });
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
    setUiFlags(patch) {
      log('setUiFlags', patch);
      set((s) => {
        const flags = { ...s.flags };
        for (const [k, on] of Object.entries(patch)) {
          if (!k.startsWith('ui-')) continue;
          if (on) flags[k] = true;
          else delete flags[k];
        }
        return { ...s, flags };
      });
    },
    setWarPathDifficulty(dif) {
      log('setWarPathDifficulty', dif);
      set((s) => ({ ...s, warPath: { ...s.warPath, difficulty: dif } }));
    },
    equipSkin(target, skin) {
      set((s) => {
        const equipped = { ...s.skins.equipped };
        if (skin) equipped[target] = skin;
        else delete equipped[target];
        // one base skin per age across both systems (save v14): a base's troop skin replaces its cosmetic one
        const age = target.startsWith('base.') ? (target.slice(5) as AgeId) : null;
        if (skin && age && s.cosmetics.equipped.baseSkins[age] !== undefined) {
          const baseSkins = { ...s.cosmetics.equipped.baseSkins };
          delete baseSkins[age];
          return { ...s, skins: { ...s.skins, equipped }, cosmetics: { ...s.cosmetics, equipped: { ...s.cosmetics.equipped, baseSkins } } };
        }
        return { ...s, skins: { ...s.skins, equipped } };
      });
    },
    equipCosmetic(e) {
      log('equipCosmetic', e);
      // Preview only: the real rules (ownership, wheel sizes) live in meta.equipCosmetic.
      if (e.slot === 'avatar') {
        const a = save.value.profile.avatar;
        set((s) => ({ ...s, profile: { ...s.profile, avatar: { ...a, look: { ...(a.look ?? {}), ...e.look }, tints: { ...(a.tints ?? {}), ...(e.tints ?? {}) } } } }));
        return ok;
      }
      set((s) => {
        const eq = { ...equippedOf(s, content) };
        let skins = s.skins;
        if (e.slot === 'emotes' || e.slot === 'quotes') eq[e.slot] = [...e.keys];
        else if (e.slot === 'baseFlag' || e.slot === 'nationalFlag' || e.slot === 'backdrop') eq[e.slot] = e.key;
        else if (e.slot === 'baseSkin') {
          const baseSkins = { ...eq.baseSkins };
          if (e.key) baseSkins[e.age] = e.key;
          else delete baseSkins[e.age];
          eq.baseSkins = baseSkins;
          // one base skin per age across both systems (save v14): it replaces the base's troop skin
          if (e.key && s.skins.equipped[`base.${e.age}`] !== undefined) {
            const equipped = { ...s.skins.equipped };
            delete equipped[`base.${e.age}`];
            skins = { ...s.skins, equipped };
          }
        } else if (e.slot === 'scene') {
          const scenes = { ...eq.scenes };
          if (e.key) scenes[e.age] = e.key;
          else delete scenes[e.age];
          eq.scenes = scenes;
        } else if (e.slot === 'decoration') {
          const decorations = eq.decorations.map((k) => (e.key !== null && k === e.key ? null : k));
          decorations[e.anchor] = e.key;
          eq.decorations = decorations;
        }
        return { ...s, skins, cosmetics: { ...s.cosmetics, equipped: eq } };
      });
      return ok;
    },
    craftCosmetic(key) {
      log('craftCosmetic', key);
      const x = findItem(content, key);
      if (!x || (x.source.kind !== 'capsule' && x.source.kind !== 'crate' && x.source.kind !== 'dust')) return fail('notCraftable');
      const s = save.value;
      const price = craftPrice(content, x, s) ?? 0;
      if (s.cosmetics.owned.includes(key)) return fail('owned');
      if (s.currencies.dust < price) return fail('dust');
      set((y) => ({ ...y, currencies: { ...y.currencies, dust: y.currencies.dust - price }, cosmetics: { ...y.cosmetics, owned: [...y.cosmetics.owned, key] } }));
      return ok;
    },
    buyNationalFlag(key) {
      log('buyNationalFlag', key);
      // Preview only: the real rules (price, rewards, pending capsules) live in meta.buyNationalFlag.
      const x = findItem(content, key);
      if (!x || x.collection !== 'nationalFlag') return fail('wrongCollection');
      const s = save.value;
      const price = nationalFlagPrice(s, content);
      if (s.cosmetics.owned.includes(key)) return fail('owned');
      if (s.currencies.dust < price) return fail('notEnoughDust');
      set((y) => ({ ...y, currencies: { ...y.currencies, dust: y.currencies.dust - price }, cosmetics: { ...y.cosmetics, owned: [...y.cosmetics.owned, key] } }));
      return ok;
    },
    flagAtlasProgress() {
      const s = save.value;
      const owned = new Set(s.cosmetics.owned);
      const flags = itemsOf(content, 'nationalFlag');
      const rewards = itemsOf(content, 'baseFlag').filter((x) => x.source.kind === 'flagRegion');
      const regions = FLAG_REGIONS.map((region) => {
        const list = flags.filter((x) => x.region === region);
        const reward = rewards.find((x) => x.source.kind === 'flagRegion' && x.source.region === region);
        const rewardKey = reward ? itemKey(reward) : null;
        return { region, owned: list.filter((x) => owned.has(itemKey(x))).length, total: list.length, reward: rewardKey, rewardOwned: rewardKey !== null && owned.has(rewardKey) };
      });
      const atlas = flags.filter((x) => x.region !== 'other');
      // the reward for all 195 (World Compass and the World Ambassador title), as meta's flagAtlasProgress builds it
      const compass = itemsOf(content, 'baseFlag').find((x) => x.source.kind === 'flagsOwned');
      const compassKey = compass ? itemKey(compass) : null;
      const title = content.cosmetics.titles.find((x) => x.unlock.kind === 'flagsOwned');
      const count = compass?.source.kind === 'flagsOwned' ? compass.source.count : title?.unlock.kind === 'flagsOwned' ? title.unlock.count : atlas.length;
      const world = { count, reward: compassKey, rewardOwned: compassKey !== null && owned.has(compassKey), title: title?.id ?? null, titleOwned: title ? owned.has(title.id) : false };
      return { owned: atlas.filter((x) => owned.has(itemKey(x))).length, total: atlas.length, regions, price: nationalFlagPrice(s, content), equipped: equippedOf(s, content).nationalFlag, world };
    },
    searchFlags(query) {
      // Preview only: a plain prefix match on the name or the code (meta.searchFlags has the full rules).
      const q = query.trim().toLocaleLowerCase();
      const flags = itemsOf(content, 'nationalFlag');
      return flags.filter((x) => q === '' || x.id === q || i18n.t(x.nameKey).toLocaleLowerCase().startsWith(q)).map(itemKey);
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
