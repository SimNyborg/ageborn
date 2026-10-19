/**
 * The narrator in the app (queue item 39): which on-screen lines are voiced, the tutorial prompt's line (cut by
 * the next prompt, stopped when the prompt goes, by a pause or by leaving), live matches left silent, the
 * once-per-profile moments with their subtitle, Settings › Narrator, and the eager stub that loads the
 * director only when a line can be due.
 */
import { signal, type Signal } from '@preact/signals';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioService, SaveDoc, SimEvent } from '@/contracts';
import { fakeSaveDoc } from '@/contracts/fakes/saveStore';
import { FakeContext } from '@/audio/test/fakeContext';
import { VOICE_LINES } from '@/audio/voice.gen';
import { i18n } from '@/i18n';
import { content } from '@/content';
import { ADAPTIVE_HINTS, MATCH1, MATCH2, type MatchScript, type TutorialPrompt } from '@/tutorial';
import type { BattleHandle } from '../battle';
import { firstLegendaryEver } from '../capsules/CapsuleHost';
import type { ShowRecord } from '../capsules/capsuleFlow';
import type { AppRoute } from '../controller';
import { createNarration, mayNarrate } from '../narration';
import * as directorModule from '../narration/director';
import { AFTER_MATCH, FIRST_EVOLVE_DELAY_MS, momentFlag, NarrationDirector, PROMPT_MAX_DELAY_MS, type CaptionView } from '../narration/director';
import type { SessionStatus } from '../session';

interface Rig {
  d: NarrationDirector;
  ctx: FakeContext;
  ducks: number[];
  save: Signal<SaveDoc | null>;
  route: Signal<AppRoute>;
  captions: string[];
  fetched: string[];
}

const flush = async (): Promise<void> => {
  for (let k = 0; k < 12; k++) await Promise.resolve();
};

function controllerFor(save: SaveDoc = fakeSaveDoc()) {
  const s = signal<SaveDoc | null>(save);
  const route = signal<AppRoute>({ id: 'title', battle: null });
  return { save: s, route, setSave: (next: SaveDoc) => void (s.value = next) };
}

function captionRecorder(captions: string[]): CaptionView {
  return { show: (text, place) => captions.push(`show:${place}:${text}`), hide: () => captions.push('hide') };
}

function rig(save: SaveDoc = fakeSaveDoc(), o: { i18n?: typeof i18n } = {}): Rig {
  const ctx = new FakeContext();
  ctx.state = 'running';
  const bus = ctx.createGain();
  const ducks: number[] = [];
  const captions: string[] = [];
  const fetched: string[] = [];
  const c = controllerFor(save);
  const d = new NarrationDirector({
    services: { audio: {} as AudioService, i18n: o.i18n ?? i18n },
    controller: c,
    host: { voiceOut: () => ({ ctx: ctx.asAudioContext(), input: bus as unknown as AudioNode }), duck: (db) => ducks.push(db) },
    fetchFile: (src) => {
      fetched.push(src);
      return Promise.resolve(new ArrayBuffer(8));
    },
    caption: captionRecorder(captions),
  });
  return { d, ctx, ducks, save: c.save, route: c.route, captions, fetched };
}

function battle(o: { mode?: string; matchNumber?: number; script?: MatchScript | null; live?: boolean } = {}) {
  const prompt = signal<TutorialPrompt | null>(null);
  const status = signal<SessionStatus>('ready');
  const ticks = new Set<(events: readonly SimEvent[]) => void>();
  const b = {
    live: o.live ? {} : null,
    setup: { mode: o.mode ?? 'tutorial', matchNumber: o.matchNumber ?? 1, script: o.script === undefined ? MATCH1 : o.script },
    prompt,
    session: {
      status,
      mySide: 0,
      onTick: (cb: (events: readonly SimEvent[]) => void) => {
        ticks.add(cb);
        return () => ticks.delete(cb);
      },
    },
  } as unknown as BattleHandle;
  const show = (id: string, textKey: string, varKeys?: Record<string, string>): void => {
    prompt.value = { id, textKey, target: null, hand: null, kind: id.startsWith('hint.') ? 'hint' : 'beat', sinceTick: 0, ...(varKeys ? { varKeys } : {}) };
  };
  return { b, prompt, status, show, tick: (events: readonly SimEvent[]) => [...ticks].forEach((cb) => cb(events)) };
}

const kinds = (d: NarrationDirector): string[] => d.log().filter((e) => e.kind === 'start' || e.kind === 'end' || e.kind === 'skip').map((e) => `${e.kind}:${e.id.replace(/^en\//, '')}${e.kind === 'end' ? (e.detail?.startsWith('cut') ? ' cut' : '') : ''}`);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('which lines are voiced', () => {
  it('every line the tutorial shows has a rendered line whose text is the current English string', () => {
    const r = rig();
    const keys = [
      ...MATCH1.beats.flatMap((b) => (b.textKey ? [b.textKey] : [])),
      ...MATCH2.beats.flatMap((b) => (b.textKey ? [b.textKey] : [])),
      ...ADAPTIVE_HINTS.filter((h) => !h.varKeys && h.id !== 'heaviesStopInfantry').map((h) => h.textKey),
      'capsule.tapStarter',
      'avatar.ui.make',
      'tutorial.upgrade.title',
      'tutorial.upgrade.gain',
      'tutorial.upgrade.done',
      ...['army', 'ladder', 'ladderCampaign', 'campaign', 'capsules', 'modes', 'customize', 'progress', 'daily'].map((f) => `warPath.ui.unlock.${f}`),
      'narrator.firstEvolve',
      'narrator.firstVictory',
      'narrator.firstLegendary',
    ];
    expect(keys.filter((k) => r.d.lineId(k) === null)).toEqual([]);
    // the Anti-heavy hint names the card in your tray: every released Anti-heavy card has its line
    const antiHeavy = Object.values(content.units).filter((u) => u.group === 'antiArmor' && !u.hidden && u.released !== false);
    expect(antiHeavy.length).toBeGreaterThan(8);
    expect(antiHeavy.filter((u) => r.d.lineId('tutorial.hint.heaviesStopInfantry', { card: u.nameKey }) === null).map((u) => u.id)).toEqual([]);
  });

  it('every rendered line still says its string (a changed string must be rendered again)', () => {
    const stale = Object.entries(VOICE_LINES['en'] ?? {}).flatMap(([id, f]) => {
      const m = /^([^{]+)(?:\{(.+)\})?$/.exec(id)!;
      const vars = m[2] ? Object.fromEntries(m[2].split(',').map((kv) => kv.split('=') as [string, string])) : undefined;
      const said = i18n.t(m[1]!, vars ? Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, i18n.t(v)])) : undefined);
      return said === f.text ? [] : [`${id}: "${f.text}" but the string reads "${said}"`];
    });
    expect(stale).toEqual([]);
  });

  it('a string that no longer reads the rendered text, an unknown key or another language stays silent', () => {
    const changed = { ...i18n, t: (k: string, p?: Record<string, string | number>) => (k === 'tutorial.m1.evolve' ? 'Evolve now!' : i18n.t(k, p)) } as typeof i18n;
    expect(rig(fakeSaveDoc(), { i18n: changed }).d.lineId('tutorial.m1.evolve')).toBeNull();
    expect(rig().d.lineId('tutorial.m1.evolve')).toBe('en/tutorial.m1.evolve');
    expect(rig().d.lineId('ui.settings.audio')).toBeNull();
    const danish = { ...i18n, locale: 'da' } as typeof i18n;
    expect(rig(fakeSaveDoc(), { i18n: danish }).d.lineId('tutorial.m1.evolve')).toBeNull();
  });
});

describe('the tutorial prompt', () => {
  it('fetches the first two lines when the match is attached, and the next two as each prompt shows', async () => {
    const r = rig();
    const t = battle();
    r.d.attach(t.b);
    await flush();
    const src = (k: string): string => VOICE_LINES['en']![k]!.src;
    // the first two prompts' lines, and the first match's two moments (its first evolve, its first win)
    expect(r.fetched).toEqual([src('tutorial.m1.sendBonker'), src('tutorial.m1.killsEarnGold'), src('narrator.firstEvolve'), src('narrator.firstVictory')]);
    // the next two after it: "Kills earn gold" (in already) and the Pebbler's line
    t.show('m1.sendBonker', 'tutorial.m1.sendBonker');
    await flush();
    expect(r.fetched.slice(4)).toEqual([src('tutorial.m1.pebbler')]);
    t.show('m1.killsEarnGold', 'tutorial.m1.killsEarnGold');
    await flush();
    expect(r.fetched.slice(4)).toEqual([src('tutorial.m1.pebbler'), src('tutorial.m1.buildTurret')]);
  });

  it('plays the prompt’s line; the next prompt cuts it; a prompt that goes stops it; each prompt speaks once a match', async () => {
    const r = rig();
    const t = battle();
    r.d.attach(t.b);
    t.show('m1.sendBonker', 'tutorial.m1.sendBonker');
    await flush();
    expect(r.d.narrator.current).toBe('en/tutorial.m1.sendBonker');
    expect(r.ducks.length).toBeGreaterThan(0);
    t.prompt.value = null;
    expect(r.d.narrator.current).toBeNull();
    t.show('m1.killsEarnGold', 'tutorial.m1.killsEarnGold');
    await flush();
    t.show('m1.pebbler', 'tutorial.m1.pebbler');
    await flush();
    expect(r.d.narrator.current).toBe('en/tutorial.m1.pebbler');
    // the stall guard re-arms: its bubble shows again, its line does not
    t.show('m1.charge', 'tutorial.m1.charge');
    await flush();
    t.prompt.value = null;
    t.show('m1.charge', 'tutorial.m1.charge');
    await flush();
    expect(r.d.narrator.current).toBeNull();
    expect(kinds(r.d)).toEqual([
      'start:tutorial.m1.sendBonker',
      'end:tutorial.m1.sendBonker cut',
      'start:tutorial.m1.killsEarnGold',
      'end:tutorial.m1.killsEarnGold cut',
      'start:tutorial.m1.pebbler',
      'end:tutorial.m1.pebbler cut',
      'start:tutorial.m1.charge',
      'end:tutorial.m1.charge cut',
    ]);
  });

  it('a pause, the end and leaving the battle stop the line', async () => {
    const r = rig();
    const t = battle();
    r.d.attach(t.b);
    t.show('m1.sendBonker', 'tutorial.m1.sendBonker');
    await flush();
    t.status.value = 'paused';
    expect(r.d.narrator.current).toBeNull();
    t.status.value = 'running';
    t.show('m1.killsEarnGold', 'tutorial.m1.killsEarnGold');
    await flush();
    r.d.detach(t.b);
    expect(r.d.narrator.current).toBeNull();
    // detached: later prompts are not heard
    t.show('m1.pebbler', 'tutorial.m1.pebbler');
    await flush();
    expect(r.d.narrator.current).toBeNull();
  });

  it('voices a hint with its card (one line per Anti-heavy card)', async () => {
    const r = rig();
    const t = battle({ mode: 'ladder', matchNumber: 3, script: null });
    r.d.attach(t.b);
    t.show('hint.heaviesStopInfantry', 'tutorial.hint.heaviesStopInfantry', { card: 'card.pikeman.name' });
    await flush();
    expect(r.d.narrator.current).toBe('en/tutorial.hint.heaviesStopInfantry{card=card.pikeman.name}');
  });

  it('never narrates a live (online) match', async () => {
    const r = rig();
    const t = battle({ mode: 'ladder', matchNumber: 3, script: null, live: true });
    r.d.attach(t.b);
    t.show('hint.powerReady', 'tutorial.hint.powerReady');
    await flush();
    expect(r.d.narrator.current).toBeNull();
    expect(r.fetched).toEqual([]);
    expect(mayNarrate(t.b)).toBe(false);
  });

  it('a line that loads later than its prompt allows stays silent', async () => {
    const r = rig();
    let release: () => void = () => undefined;
    (r.d.narrator as unknown as { fetchFile: (s: string) => Promise<ArrayBuffer> }).fetchFile = () => new Promise((res) => (release = () => res(new ArrayBuffer(8))));
    const t = battle();
    r.d.attach(t.b);
    t.show('m1.evolve', 'tutorial.m1.evolve');
    vi.advanceTimersByTime(PROMPT_MAX_DELAY_MS + 100);
    release();
    await flush();
    expect(r.d.narrator.current).toBeNull();
  });
});

describe('moments', () => {
  it('the first evolve: after the age changes in the first match, once, with its subtitle over the battle', async () => {
    const r = rig();
    r.route.value = { id: 'battle', battle: null as unknown as BattleHandle };
    const t = battle();
    t.status.value = 'running';
    r.d.attach(t.b);
    t.tick([{ e: 'ageUp', side: 1, age: 'medieval' } as SimEvent]);
    vi.advanceTimersByTime(FIRST_EVOLVE_DELAY_MS + 10);
    await flush();
    expect(r.d.narrator.current).toBeNull();
    t.tick([{ e: 'ageUp', side: 0, age: 'medieval' } as SimEvent]);
    vi.advanceTimersByTime(FIRST_EVOLVE_DELAY_MS - 10);
    await flush();
    expect(r.d.narrator.current).toBeNull();
    vi.advanceTimersByTime(20);
    await flush();
    expect(r.d.narrator.current).toBe('en/narrator.firstEvolve');
    expect(r.save.value!.flags[momentFlag('firstEvolve')]).toBe(true);
    expect(r.captions).toEqual(['show:battle:A new age dawns!']);
    r.ctx.advance(1.1);
    expect(r.captions).toEqual(['show:battle:A new age dawns!', 'hide']);
    t.tick([{ e: 'ageUp', side: 0, age: 'gunpowder' } as SimEvent]);
    vi.advanceTimersByTime(FIRST_EVOLVE_DELAY_MS + 10);
    await flush();
    expect(r.d.narrator.current).toBeNull();
  });

  it('the first evolve waits for a running battle, and is never said again on a profile that has it', async () => {
    const paused = rig();
    const t = battle();
    t.status.value = 'paused';
    paused.d.attach(t.b);
    t.tick([{ e: 'ageUp', side: 0, age: 'medieval' } as SimEvent]);
    vi.advanceTimersByTime(FIRST_EVOLVE_DELAY_MS + 10);
    await flush();
    expect(paused.d.narrator.current).toBeNull();
    const said = rig({ ...fakeSaveDoc(), flags: { [momentFlag('firstEvolve')]: true } });
    const t2 = battle();
    t2.status.value = 'running';
    said.d.attach(t2.b);
    t2.tick([{ e: 'ageUp', side: 0, age: 'medieval' } as SimEvent]);
    vi.advanceTimersByTime(FIRST_EVOLVE_DELAY_MS + 10);
    await flush();
    expect(said.d.narrator.current).toBeNull();
    // a later training match (matches played) has no first evolve either
    const veteran = rig({ ...fakeSaveDoc(), matchesPlayed: 4 });
    const t3 = battle();
    t3.status.value = 'running';
    veteran.d.attach(t3.b);
    t3.tick([{ e: 'ageUp', side: 0, age: 'medieval' } as SimEvent]);
    vi.advanceTimersByTime(FIRST_EVOLVE_DELAY_MS + 10);
    await flush();
    expect(veteran.d.narrator.current).toBeNull();
  });

  it('a moment cancelled before its time, or switched off, says nothing and keeps its flag unset', async () => {
    const r = rig();
    const stop = r.d.moment('firstLegendary', 600);
    stop();
    vi.advanceTimersByTime(700);
    await flush();
    expect(r.d.narrator.current).toBeNull();
    expect(r.save.value!.flags[momentFlag('firstLegendary')]).toBeUndefined();
    const off = rig({ ...fakeSaveDoc(), settings: { ...fakeSaveDoc().settings, narrator: false } });
    off.d.moment('firstLegendary', 0);
    vi.advanceTimersByTime(10);
    await flush();
    expect(off.d.narrator.current).toBeNull();
    expect(off.save.value!.flags[momentFlag('firstLegendary')]).toBeUndefined();
  });
});

describe('screens and settings', () => {
  it('voice plays a screen’s line and its stop ends it; voiceAll plays lines in a row', async () => {
    const r = rig();
    const stop = r.d.voice('avatar.ui.make');
    await flush();
    expect(r.d.narrator.current).toBe('en/avatar.ui.make');
    stop();
    expect(r.d.narrator.current).toBeNull();
    const stopAll = r.d.voiceAll(['tutorial.upgrade.title', 'tutorial.upgrade.gain']);
    await flush();
    expect(r.d.narrator.current).toBe('en/tutorial.upgrade.title');
    r.ctx.advance(1.1);
    vi.advanceTimersByTime(300);
    await flush();
    expect(r.d.narrator.current).toBe('en/tutorial.upgrade.gain');
    stopAll();
    expect(r.d.narrator.current).toBeNull();
    expect(r.d.voice('ui.settings.audio')()).toBeUndefined();
  });

  it('Settings › Narrator off stops the line at once and silences the rest', async () => {
    const r = rig();
    r.d.voice('avatar.ui.make');
    await flush();
    r.save.value = { ...r.save.value!, settings: { ...r.save.value!.settings, narrator: false } };
    expect(r.d.narrator.current).toBeNull();
    r.d.voice('avatar.ui.make');
    await flush();
    expect(r.d.narrator.current).toBeNull();
    r.save.value = { ...r.save.value!, settings: { ...r.save.value!.settings, narrator: true } };
    r.d.voice('avatar.ui.make');
    await flush();
    expect(r.d.narrator.current).toBe('en/avatar.ui.make');
  });

  it('after each onboarding match it fetches the lines of the steps that follow', async () => {
    const r = rig();
    r.d.afterMatch(1);
    await flush();
    expect(r.fetched).toEqual(AFTER_MATCH[1]!.map((k) => VOICE_LINES['en']![k]!.src));
  });
});

describe('the eager stub', () => {
  function stub(save: SaveDoc = fakeSaveDoc()) {
    const c = controllerFor(save);
    let loads = 0;
    const n = createNarration({
      services: { audio: {} as AudioService, i18n },
      controller: c,
      load: () => {
        loads += 1;
        return Promise.resolve(directorModule);
      },
    });
    return { n, c, loads: () => loads };
  }

  it('loads nothing on Home or in a battle no line can come in', async () => {
    const s = stub();
    s.c.route.value = { id: 'title', battle: null };
    const late = battle({ mode: 'ladder', matchNumber: 9, script: null });
    s.c.route.value = { id: 'battle', battle: late.b };
    await flush();
    expect(s.loads()).toBe(0);
    expect(s.n.log()).toBeNull();
    s.n.dispose();
  });

  it('loads the director for the onboarding match and attaches it', async () => {
    const s = stub();
    const t = battle();
    s.c.route.value = { id: 'battle', battle: t.b };
    await flush();
    expect(s.loads()).toBe(1);
    t.show('m1.sendBonker', 'tutorial.m1.sendBonker');
    expect(s.n.log()?.some((e) => e.kind === 'prompt' && e.id === 'm1.sendBonker')).toBe(true);
    s.n.dispose();
  });

  it('plays the first-victory moment on the Result of the first win only', async () => {
    const won = { ...fakeSaveDoc(), stats: { ...fakeSaveDoc().stats, wins: 1 } };
    const s = stub(won);
    const result = (n: number) =>
      ({ id: 'result', result: { setup: { mode: 'tutorial', matchNumber: n }, input: { outcome: { winner: 0 }, mySide: 0 } } }) as unknown as AppRoute;
    s.c.route.value = result(1);
    await flush();
    expect(s.n.log()?.some((e) => e.kind === 'moment' && e.id === 'firstVictory')).toBe(true);
    const veteran = stub({ ...fakeSaveDoc(), stats: { ...fakeSaveDoc().stats, wins: 7 } });
    veteran.c.route.value = result(3);
    await flush();
    expect(veteran.n.log()?.some((e) => e.kind === 'moment') ?? false).toBe(false);
    s.n.dispose();
    veteran.n.dispose();
  });

  it('with the narrator off a screen’s line loads nothing', async () => {
    const s = stub({ ...fakeSaveDoc(), settings: { ...fakeSaveDoc().settings, narrator: false } });
    s.n.voice('avatar.ui.make')();
    const t = battle();
    s.c.route.value = { id: 'battle', battle: t.b };
    await flush();
    expect(s.loads()).toBe(0);
    s.n.dispose();
  });
});

describe('the first Legendary', () => {
  const legendaries = Object.values(content.units).filter((u) => u.rarity === 'legendary').map((u) => u.id);
  const record = (cards: { card: string; isNew: boolean }[]) =>
    ({ kind: 'capsules', reveals: [{ capsule: { contents: { stacks: cards.map((c) => ({ ...c, rarity: 'legendary', copies: 1, foil: 'none', dust: 0 })) } } }] }) as unknown as ShowRecord;
  const owning = (ids: string[]): SaveDoc => ({ ...fakeSaveDoc(), collection: Object.fromEntries(ids.map((id) => [id, { level: 1, copies: 1, isNew: false, foil: 'none' as const }])) });

  it('is a player’s first when the show’s NEW Legendary is the only one owned', () => {
    const [a, b] = legendaries as [string, string];
    expect(firstLegendaryEver(owning(['bonker', a]), content, record([{ card: a, isNew: true }]))).toBe(true);
    // another Legendary was owned before: not the first
    expect(firstLegendaryEver(owning([a, b]), content, record([{ card: a, isNew: true }]))).toBe(false);
    // a copy of one already owned is not the first either
    expect(firstLegendaryEver(owning([a]), content, record([{ card: a, isNew: false }]))).toBe(false);
    expect(firstLegendaryEver(owning([a]), content, { kind: 'wardrobe' } as unknown as ShowRecord)).toBe(false);
  });
});
