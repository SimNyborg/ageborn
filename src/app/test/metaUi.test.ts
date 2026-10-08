/**
 * The meta screens wired to the real meta rules (WP7) and a save store (WP8): `createUiServices`
 * (every action goes through meta, commits and persists) and `createMetaUi` (router and controller
 * in step: VS → battle → Pause → Result → Home; docs/requests/wp9-app-wiring.md).
 */
import { describe, expect, it, vi } from 'vitest';
import { FixedClock } from '@/contracts/fakes/clock';
import type { SaveDoc } from '@/contracts';
import { createRouter, type MatchRequest } from '@/ui/screens';
import { signal } from '@preact/signals';
import { AppController } from '../controller';
import { createMetaUi, dailyDateKey, dailyDifficultyOf, pauseInfo, warmMatchArt } from '../metaUi';
import type { MatchSetup } from '../matchSetup';
import { buildServices, DEFAULT_CHOICE, type Services } from '../services';
import { createUiServices, isMetaRules, opponentOptions, type UiFlow } from '../uiServices';
import type { MetaRules } from '@/meta';

const CHOICE = { ...DEFAULT_CHOICE, save: 'memory', audio: 'fake', art: 'fake' } as const;

async function setup(patch: (s: SaveDoc) => SaveDoc = (s) => s) {
  const clock = new FixedClock(Date.UTC(2026, 9, 3, 12));
  const services = await buildServices({ choice: CHOICE, clock });
  if (!isMetaRules(services.meta)) throw new Error('real meta expected');
  const meta = services.meta;
  const fresh = meta.newSave(services.content, clock, 7);
  const save = patch({ ...fresh, tutorial: { ...fresh.tutorial, step: 4 }, matchesPlayed: 3 });
  await services.saveStore.save(save, { immediate: true });
  return { services, meta, save, clock };
}

function servicesOnly(services: Services, meta: MetaRules, save: SaveDoc) {
  const sig = signal(save);
  const writes: { doc: SaveDoc; immediate: boolean }[] = [];
  const flows: string[] = [];
  const flow: UiFlow = {
    begin: () => flows.push('begin'),
    resume: () => flows.push('resume'),
    retreat: () => flows.push('retreat'),
    quitSkirmish: () => flows.push('quit'),
    watchReplay: () => flows.push('replay'),
    openCapsules: (ids) => flows.push(`open:${ids.join(',')}`),
    openWardrobe: (id) => flows.push(`crate:${id}`),
    restart: () => flows.push('restart'),
  };
  const router = createRouter({ id: 'home' });
  const ui = createUiServices({
    services,
    meta,
    save: sig,
    router,
    flow,
    commit: (doc, o) => {
      sig.value = doc;
      writes.push({ doc, immediate: o?.immediate === true });
      void services.saveStore.save(doc, o);
    },
  });
  return { ui, sig, writes, flows, router };
}

async function finishBattle(c: AppController): Promise<void> {
  const r = c.route.value;
  if (r.id !== 'battle') throw new Error(`not in battle: ${r.id}`);
  r.battle.session.fastForward(20 * 60 * 12);
  for (let i = 0; i < 20 && c.route.value.id === 'battle'; i += 1) await Promise.resolve();
}

describe('createUiServices over the real meta rules', () => {
  it('upgrades through meta and saves at once; failures come back as reasons', async () => {
    const { services, meta, save } = await setup();
    const owned = Object.keys(save.collection).find((id) => services.content.units[id]);
    expect(owned).toBeDefined();
    const poor = servicesOnly(services, meta, { ...save, currencies: { ...save.currencies, amber: 0 } });
    const r = poor.ui.upgrade(owned!);
    expect(r.ok).toBe(false);
    expect(poor.writes).toHaveLength(0);
    // A card that is not in the collection cannot be upgraded.
    expect(poor.ui.upgrade('no_such_card').ok).toBe(false);
  });

  it('settings, feat hints and plan presets commit a new save; bad preset indices change nothing', async () => {
    const { services, meta, save } = await setup();
    const s = servicesOnly(services, meta, save);
    s.ui.updateSettings({ breakReminder: false });
    expect(s.sig.value.settings.breakReminder).toBe(false);
    s.ui.showFeatHint('no_walls');
    expect(s.sig.value.flags['featHint.no_walls']).toBe(true);
    const before = s.writes.length;
    s.ui.setWarPlan(5, s.sig.value.warPlans[0]!);
    expect(s.writes.length).toBe(before);
    expect(await services.saveStore.load()).toMatchObject({ settings: { breakReminder: false } });
  });

  it('the Home preview is the opponent the ladder match gets (A6.8)', async () => {
    const { services, meta, save } = await setup();
    const s = servicesOnly(services, meta, save);
    const preview = s.ui.previewOpponent();
    expect(preview?.isAI).toBe(true);
    const picked = s.ui.prepareMatch({ mode: 'ladder', format: preview!.format });
    expect(picked.generalId).toBe(preview!.generalId);
    expect(picked.seed).toBe(preview!.seed);
  });

  it('the Home preview matches the ladder opponent in every format (the plate never shows someone else)', async () => {
    const { services, meta, save } = await setup();
    const formats = ['short', 'standard', 'full'] as const;
    // A save far enough up the ladder that every format is open, with the first ladder match played.
    const late = { ...save, arenaIndex: 6, trophies: { ...save.trophies, current: 2400, best: 2400 }, flags: { ...save.flags, 'meta.ladderPlayed': true } };
    for (let played = 4; played < 10; played++) {
      const s = servicesOnly(services, meta, { ...late, matchesPlayed: played });
      for (const format of formats) {
        const preview = s.ui.previewOpponent(format);
        const picked = s.ui.prepareMatch({ mode: 'ladder', format });
        expect(preview?.format).toBe(picked.format);
        expect(preview?.generalId).toBe(picked.generalId);
        expect(preview?.displayName).toBe(picked.displayName);
        expect(preview?.seed).toBe(picked.seed);
        expect(preview?.tier).toBe(picked.tier);
      }
    }
  });

  it("Home's ranked request shows the same bot as the online player the search finds (owner decision 2026-10-07)", async () => {
    const { services, meta, save } = await setup();
    const s = servicesOnly(services, meta, { ...save, flags: { ...save.flags, 'meta.ladderPlayed': true } });
    for (const format of ['short', 'standard'] as const) {
      const ai = s.ui.prepareMatch({ mode: 'ladder', format });
      const shown = s.ui.prepareMatch({ mode: 'ladder', format, online: true });
      // The bot that plays is unchanged: General or Commander, tier, level, plan, levels and seed.
      expect(shown.generalId).toBe(ai.generalId);
      expect(shown.tier).toBe(ai.tier);
      expect(shown.level).toBe(ai.level);
      expect(shown.seed).toBe(ai.seed);
      expect(shown.side.loadouts).toEqual(ai.side.loadouts);
      expect(shown.side.levels).toEqual(ai.side.levels);
      expect(shown.isAI).toBe(true);
      expect(shown.side.isBot).toBe(true);
      // Only the presentation: the found player's name everywhere, avatar, trophies, flag.
      expect(ai.side.online).toBeUndefined();
      const who = shown.side.online!;
      expect(shown.displayName).toBe(who.name);
      expect(shown.side.label).toBe(who.name);
      expect(who.name.startsWith('AI')).toBe(false);
      // The same match always finds the same player.
      expect(s.ui.prepareMatch({ mode: 'ladder', format, online: true })).toEqual(shown);
    }
    // Every other mode stays a labelled AI.
    expect(s.ui.prepareMatch({ mode: 'daily' }).side.online).toBeUndefined();
    expect(s.ui.prepareMatch({ mode: 'skirmish', options: { generalId: 'pip', tier: 2, format: 'short', standardLevels: false }, speed: 1, quick: true }).side.online).toBeUndefined();
    expect(s.ui.prepareMatch({ mode: 'conquest', general: 'pip' }).side.online).toBeUndefined();
  });

  it('export and import round-trip; import replaces the save and routes Home', async () => {
    const { services, meta, save } = await setup();
    const s = servicesOnly(services, meta, { ...save, currencies: { ...save.currencies, amber: 1234 } });
    const code = s.ui.exportCode();
    expect(s.sig.value.lastExportAt).not.toBeNull();
    s.sig.value = { ...s.sig.value, currencies: { ...s.sig.value.currencies, amber: 1 } };
    s.router.go({ id: 'settings' });
    expect(s.ui.importCode(code)).toEqual({ ok: true });
    expect(s.sig.value.currencies.amber).toBe(1234);
    expect(s.router.current.value.id).toBe('home');
    expect(s.ui.importCode('not a code').ok).toBe(false);
  });

  it('reset starts a fresh profile at onboarding match 1', async () => {
    const { services, meta, save } = await setup();
    const s = servicesOnly(services, meta, save);
    s.ui.resetSave();
    expect(s.sig.value.tutorial.step).toBe(0);
    expect(s.sig.value.matchesPlayed).toBe(0);
    expect(s.flows).toContain('restart');
  });

  it('claims fail cleanly when nothing is done; Open all passes every pending id', async () => {
    const { services, meta, save } = await setup();
    const s = servicesOnly(services, meta, save);
    expect(s.ui.claimQuest(0).ok).toBe(false);
    expect(s.ui.claimRoadNode(999_999).ok).toBe(false);
    s.ui.openAllCapsules();
    const ids = save.capsules.pending.map((c) => c.id);
    if (ids.length > 0) expect(s.flows).toContain(`open:${ids.join(',')}`);
  });

  it('a quest that grants an Age Capsule asks for the age, then claims with it (A6.4)', async () => {
    const { services, meta, save } = await setup();
    const quests = { ...save.quests, daily: [{ id: 'daily_challenge_win', progress: 1, claimed: false }, ...save.quests.daily.slice(1)] };
    // Past the five scripted capsules, so the Age Capsule is a real one-age capsule (A6.5).
    const h = servicesOnly(services, meta, { ...save, quests, scriptStep: 5 });
    const asked: string[][] = [];
    let answer: (age: 'stone' | 'medieval') => void = () => undefined;
    const ui = createUiServices({
      services,
      meta,
      save: h.sig,
      router: h.router,
      flow: {
        begin: () => undefined,
        resume: () => undefined,
        retreat: () => undefined,
        quitSkirmish: () => undefined,
        watchReplay: () => undefined,
        openCapsules: () => undefined,
        openWardrobe: () => undefined,
        restart: () => undefined,
        pickAge: (c) => {
          asked.push([...c.ages]);
          return new Promise((r) => {
            answer = r;
          });
        },
      },
      commit: (doc) => {
        h.sig.value = doc;
      },
    });
    const before = h.sig.value.capsules.pending.length;
    expect(ui.claimQuest(0).ok).toBe(true);
    expect(asked).toHaveLength(1);
    expect(h.sig.value.capsules.pending.length).toBe(before);
    const pick = asked[0]!.find((a) => a !== meta.ageCapsuleChoices(h.sig.value, services.content).suggested) ?? asked[0]![0]!;
    answer(pick as 'stone');
    await Promise.resolve();
    await Promise.resolve();
    const age = h.sig.value.capsules.pending.find((p) => p.kind === 'age' && p.scriptIndex === null);
    expect(age?.age).toBe(pick);
  });

  it('maps requests to meta options', () => {
    const reqs: MatchRequest[] = [
      { mode: 'ladder', format: 'full' },
      { mode: 'conquest', general: 'pip' },
      { mode: 'daily', difficulty: 'warlord' },
      { mode: 'daily' },
    ];
    expect(reqs.map(opponentOptions)).toEqual([{ format: 'full' }, { conquestGeneral: 'pip' }, { daily: { difficulty: 'warlord' } }, {}]);
  });
});

describe('createMetaUi: the meta screens and the battle in step', () => {
  async function app() {
    const { services, meta, save } = await setup();
    const c = new AppController(services, { save, autopilot: true, delay: async () => undefined, homeScreen: true });
    const ui = createMetaUi({ controller: c, services, meta });
    c.showTitle();
    return { c, ui, services };
  }

  it('VS warms the art the battle opens with: the setup the battle is built from (review 1)', async () => {
    const { services, meta, save } = await setup((s) => ({ ...s, cosmetics: { ...s.cosmetics, owned: [...s.cosmetics.owned, 'baseSkin.mossy_den'], equipped: { ...s.cosmetics.equipped, baseSkins: { stone: 'baseSkin.mossy_den' } } } }));
    const c = new AppController(services, { save, autopilot: true, delay: async () => undefined, homeScreen: true });
    const warmed: MatchSetup[] = [];
    const ui = createMetaUi({ controller: c, services, meta, warm: (setup) => warmed.push(setup) });
    c.showTitle();
    const req: MatchRequest = { mode: 'ladder', format: 'short' };
    const opponent = ui.services.prepareMatch(req);
    ui.services.warmMatch?.(req, opponent);
    expect(warmed).toHaveLength(1);
    expect(warmed[0]!.config.format).toBe(opponent.format);
    expect(warmed[0]!.config.sides[0].look?.baseSkins).toEqual({ stone: 'baseSkin.mossy_den' });
    // the battle itself is untouched by the warm-up
    expect(c.route.value.id).toBe('title');
    ui.dispose();

    // through the art provider: the first age of the format, each side's skins and scenes of it
    const calls: unknown[] = [];
    const art = { prefetchMatch: (o: unknown) => (calls.push(o), Promise.resolve()) } as unknown as Parameters<typeof warmMatchArt>[0];
    warmMatchArt(art, warmed[0]!);
    // (the AI General's base look has a skin per age; the provider loads only the first age's models)
    expect(calls).toEqual([{ age: 'stone', sides: [{ skins: { stone: 'mossy_den' }, scenes: {} }, expect.objectContaining({ skins: expect.objectContaining({ stone: expect.any(String) }) })] }]);
    // a provider without the warm-up (fakes) is fine
    expect(() => warmMatchArt({} as Parameters<typeof warmMatchArt>[0], warmed[0]!)).not.toThrow();
  });

  it('Home builds no waiting battle once onboarding is done', async () => {
    const { c, ui } = await app();
    const r = c.route.value;
    expect(r).toEqual({ id: 'title', battle: null });
    expect(ui.owns(r, c.step.value)).toBe(true);
    expect(ui.router.current.value.id).toBe('home');
    ui.dispose();
  });

  it('VS → battle → pause overlay → resume → result with the request → Home disposes the battle', async () => {
    const { c, ui } = await app();
    const req: MatchRequest = { mode: 'ladder', format: 'short' };
    const opponent = ui.services.prepareMatch(req);
    ui.router.go({ id: 'vs', request: req, opponent });
    ui.services.beginBattle(req, opponent);
    const r = c.route.value;
    expect(r.id).toBe('battle');
    if (r.id !== 'battle') return;
    expect(ui.router.stack.value.map((e) => e.route.id)).toEqual(['home', 'battle']);
    expect(r.battle.setup.opponent.generalId).toBe(opponent.generalId);

    r.battle.session.pause();
    expect(ui.router.current.value.id).toBe('pause');
    const info = pauseInfo(r.battle);
    expect(info.mode).toBe('ladder');
    ui.router.back();
    ui.services.resume();
    expect(r.battle.session.status.value).toBe('running');

    await finishBattle(c);
    expect(c.route.value.id).toBe('result');
    const top = ui.router.current.value;
    expect(top.id).toBe('result');
    if (top.id !== 'result') return;
    expect(top.info.request).toEqual(req);
    expect(top.info.rewards.length).toBeGreaterThan(0);
    // The save moved on through meta and was persisted.
    expect(c.save.value?.matchesPlayed).toBe(4);

    ui.router.reset({ id: 'home' });
    expect(c.route.value).toEqual({ id: 'title', battle: null });
    ui.dispose();
  });

  it('a ranked match keeps the found player in the battle, the bot brain, the result and the stored replay (owner decision 2026-10-07)', async () => {
    const { c, ui, services } = await app();
    const req: MatchRequest = { mode: 'ladder', format: 'short', online: true };
    const opponent = ui.services.prepareMatch(req);
    const who = opponent.side.online!;
    expect(who).toBeDefined();
    ui.router.go({ id: 'vs', request: req, opponent });
    ui.services.beginBattle(req, opponent);
    const r = c.route.value;
    expect(r.id).toBe('battle');
    if (r.id !== 'battle') return;
    // The HUD reads the sides: the found player's name and look; still a bot, played by its General's brain.
    const foe = r.battle.setup.config.sides[1];
    expect(foe.label).toBe(who.name);
    expect(foe.online).toEqual(who);
    expect(foe.isBot).toBe(true);
    expect(foe.look?.nationalFlag ?? null).toBe(opponent.side.look?.nationalFlag ?? null);
    expect(r.battle.setup.brain.kind).toBe('general');
    if (r.battle.setup.brain.kind === 'general') expect(r.battle.setup.brain.profile.tier).toBe(opponent.tier);

    await finishBattle(c);
    const top = ui.router.current.value;
    expect(top.id).toBe('result');
    if (top.id !== 'result') return;
    expect(top.info.request).toEqual(req);
    expect(top.info.input.opponent.side.online?.name).toBe(who.name);
    // The replay ring keeps the player (read back through the store's schema), so a replay shows the same name.
    const newest = services.saveStore.loadReplays().at(-1)!;
    expect(newest.sides[1].label).toBe(who.name);
    expect(newest.sides[1].online).toEqual(who);
    expect(newest.sides[1].isBot).toBe(true);
    ui.dispose();
  });

  it('Settings opens from the onboarding title and Back returns to it (A15.6, B8 import)', async () => {
    // The title shows during the onboarding capsule steps (the map is Home from match 1 on, ui-plan 6.4).
    const { services, meta, save } = await setup((s) => ({ ...s, tutorial: { ...s.tutorial, step: 1 }, matchesPlayed: 1 }));
    const c = new AppController(services, { save, autopilot: true, delay: async () => undefined, homeScreen: true });
    const ui = createMetaUi({ controller: c, services, meta });
    c.showTitle();
    expect(c.step.value).toBe('capsule1');
    expect(ui.owns(c.route.value, c.step.value)).toBe(false);
    ui.openSettings();
    expect(ui.owns(c.route.value, c.step.value)).toBe(true);
    expect(ui.router.current.value.id).toBe('settings');
    ui.router.back();
    expect(ui.owns(c.route.value, c.step.value)).toBe(false);
    expect(c.route.value.id).toBe('title');
    ui.dispose();
    c.dispose();
  });

  it('a load notice shows as a banner until dismissed (B8 "Save could not be read. Import a backup?")', async () => {
    const { services, meta, save } = await setup();
    const store = services.saveStore as typeof services.saveStore & { loadReport?: unknown };
    Object.defineProperty(store, 'loadReport', { value: { notice: { kind: 'unreadable', messageKey: 'save.problem.unreadable', ongoing: false } }, configurable: true });
    const c = new AppController(services, { save, autopilot: true, delay: async () => undefined, homeScreen: true });
    const ui = createMetaUi({ controller: c, services, meta });
    expect(ui.notice.value).toEqual({ messageKey: 'save.problem.unreadable', kind: 'unreadable' });
    expect(services.i18n.t('save.problem.unreadable')).toBe('Save could not be read. Import a backup?');
    ui.dismissNotice();
    expect(ui.notice.value).toBeNull();
    ui.dispose();
  });

  it('the training match and the ?quick dev route keep the app screens', async () => {
    const { c, ui } = await app();
    c.quickBattle('short');
    expect(ui.owns(c.route.value, c.step.value)).toBe(false);
    expect(ui.router.current.value.id).toBe('home');
    c.training();
    expect(ui.owns(c.route.value, c.step.value)).toBe(false);
    ui.dispose();
  });

  it('Retreat counts as a loss (A2.10)', async () => {
    const { c, ui } = await app();
    const req: MatchRequest = { mode: 'ladder', format: 'short' };
    ui.services.beginBattle(req, ui.services.prepareMatch(req));
    const r = c.route.value;
    if (r.id !== 'battle') throw new Error('battle expected');
    r.battle.session.fastForward(20 * 65);
    ui.services.retreat();
    r.battle.session.fastForward(20);
    for (let i = 0; i < 20 && c.route.value.id === 'battle'; i += 1) await Promise.resolve();
    const res = c.route.value;
    expect(res.id).toBe('result');
    if (res.id === 'result') expect(res.result.input.outcome.winner).toBe(1);
    ui.dispose();
  });

  it('Retreat is open at once, and a Ladder battle counts as left from its first tick (owner decision 2026-10-07)', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    try {
      const { c, ui } = await app();
      const req: MatchRequest = { mode: 'ladder', format: 'short' };
      ui.services.beginBattle(req, ui.services.prepareMatch(req));
      const r = c.route.value;
      if (r.id !== 'battle') throw new Error('battle expected');
      expect(pauseInfo(r.battle).retreatAfterMs).toBe(0);
      // One tick in: a reload now would be applied as a Retreat at the next boot (abandon.ts).
      r.battle.session.fastForward(1);
      expect(store.has('ageborn.openMatch.v1')).toBe(true);
      ui.services.retreat();
      r.battle.session.fastForward(20);
      for (let i = 0; i < 20 && c.route.value.id === 'battle'; i += 1) await Promise.resolve();
      const res = c.route.value;
      expect(res.id).toBe('result');
      if (res.id === 'result') expect(res.result.input.outcome).toMatchObject({ winner: 1, reason: 'retreat' });
      // The battle ended, so the record is gone.
      expect(store.has('ageborn.openMatch.v1')).toBe(false);
      // A Skirmish stakes no trophies: a left one stays void, nothing is recorded.
      const sk: MatchRequest = { mode: 'skirmish', options: { generalId: 'kettle', tier: 2, format: 'short', standardLevels: false }, speed: 1 };
      ui.services.beginBattle(sk, ui.services.prepareMatch(sk));
      const r2 = c.route.value;
      if (r2.id !== 'battle') throw new Error('skirmish battle expected');
      r2.battle.session.fastForward(40);
      expect(store.has('ageborn.openMatch.v1')).toBe(false);
      ui.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('Quit from Pause returns Home without a result', async () => {
    const { c, ui } = await app();
    const req: MatchRequest = { mode: 'ladder', format: 'short' };
    ui.services.beginBattle(req, ui.services.prepareMatch(req));
    ui.services.quitSkirmish();
    expect(c.route.value).toEqual({ id: 'title', battle: null });
    expect(ui.router.current.value.id).toBe('home');
    ui.dispose();
  });

  it('settings changes reach the audio buses at once', async () => {
    const { c, ui, services } = await app();
    const volumes: [string, number][] = [];
    const orig = services.audio.setBusVolume.bind(services.audio);
    services.audio.setBusVolume = (bus, v) => {
      volumes.push([bus, v]);
      orig(bus, v);
    };
    ui.services.updateSettings({ volume: { ...c.save.value!.settings.volume, music: 0.25 } });
    expect(volumes).toContainEqual(['music', 0.25]);
    ui.dispose();
  });
});

describe('Daily helpers', () => {
  it('the Daily date starts at 04:00 local time', () => {
    const at = (h: number) => new Date(2026, 9, 3, h, 30).getTime();
    expect(dailyDateKey(at(3))).toBe('2026-10-02');
    expect(dailyDateKey(at(5))).toBe('2026-10-03');
  });

  it('the difficulty comes from the request, else the nearest tier', () => {
    const tiers = { recruit: 2, veteran: 5, warlord: 8 };
    expect(dailyDifficultyOf({ mode: 'daily', difficulty: 'recruit' }, 8, tiers)).toBe('recruit');
    expect(dailyDifficultyOf(null, 8, tiers)).toBe('warlord');
    expect(dailyDifficultyOf(null, 4, tiers)).toBe('veteran');
  });
});
