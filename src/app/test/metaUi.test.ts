/**
 * The meta screens wired to the real meta rules (WP7) and a save store (WP8): `createUiServices`
 * (every action goes through meta, commits and persists) and `createMetaUi` (router and controller
 * in step: VS → battle → Pause → Result → Home; docs/requests/wp9-app-wiring.md).
 */
import { describe, expect, it } from 'vitest';
import { FixedClock } from '@/contracts/fakes/clock';
import type { SaveDoc } from '@/contracts';
import { createRouter, type MatchRequest } from '@/ui/screens';
import { signal } from '@preact/signals';
import { AppController } from '../controller';
import { createMetaUi, dailyDateKey, dailyDifficultyOf, pauseInfo } from '../metaUi';
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
    expect(top.info.endedHour).toBeTypeOf('number');
    expect(top.info.rewards.length).toBeGreaterThan(0);
    // The save moved on through meta and was persisted.
    expect(c.save.value?.matchesPlayed).toBe(4);

    ui.router.reset({ id: 'home' });
    expect(c.route.value).toEqual({ id: 'title', battle: null });
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
