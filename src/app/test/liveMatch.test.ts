/**
 * The live match layer (queue item 34, `live/match.ts`): the online flag, the tempo protocol between the
 * HUD and the opponent's link, both players' talk and the mute, the simulated opponent's forced answers,
 * the end, and the app wiring (Ranked is live with the AI's emotes kept out; offline modes are not).
 */
import { describe, expect, it } from 'vitest';
import type { BotController, Command, MatchConfig, OnlinePlayer, OpponentSpec, SaveDoc } from '@/contracts';
import { FixedClock } from '@/contracts/fakes/clock';
import { fakeContent } from '@/contracts/fakes/content';
import { createFakeSim } from '@/contracts/fakes/sim';
import type { LiveSay } from '@/ui/hud/live';
import type { MatchRequest } from '@/ui/screens';
import { AppController } from '../controller';
import { isLiveMatch, LiveMatch, withoutEmotes } from '../live/match';
import type { LinkContext, LiveMessage, OpponentLink } from '../live/protocol';
import { PROPOSAL_WINDOW_MS, SAY_GAP_MS } from '../live/protocol';
import { generalOpponent } from '../matchSetup';
import { createMetaUi } from '../metaUi';
import { buildServices, DEFAULT_CHOICE } from '../services';
import { BattleSessionImpl } from '../session';
import { isMetaRules } from '../uiServices';

const opponent: OpponentSpec = generalOpponent(fakeContent, { generalId: 'pip', displayName: 'AI Pip', tier: 0, level: 1, format: 'short', seed: 1 });
const PLAYER: OnlinePlayer = { name: 'LadyWaffle', avatar: { body: 'b' } as unknown as OnlinePlayer['avatar'], trophies: 455, arena: 3, banner: 'tar_pit', bars: 3 };

function onlineConfig(base: MatchConfig): MatchConfig {
  return { ...base, sides: [base.sides[0], { ...base.sides[1], online: PLAYER }] };
}

/** A link that records what you send and lets the test speak for the opponent. */
class TestLink implements OpponentLink {
  sent: LiveMessage[] = [];
  updates: LinkContext[] = [];
  private cbs = new Set<(m: LiveMessage) => void>();
  send(msg: LiveMessage): void {
    this.sent.push(msg);
  }
  onMessage(cb: (m: LiveMessage) => void): () => void {
    this.cbs.add(cb);
    return () => this.cbs.delete(cb);
  }
  update(_now: number, ctx: LinkContext): void {
    this.updates.push(ctx);
  }
  say(m: LiveMessage): void {
    for (const cb of this.cbs) cb(m);
  }
  disposed = false;
  dispose(): void {
    this.disposed = true;
  }
}

function live(o: { link?: OpponentLink; muted?: boolean } = {}) {
  const sim = createFakeSim();
  const s = new BattleSessionImpl({ sim, mode: 'ladder', opponent, simVersion: 'test', live: true });
  const lm = new LiveMatch({ session: s, config: onlineConfig(sim.config as MatchConfig), ...(o.link ? { link: o.link } : {}), ...(o.muted ? { muted: true } : {}) });
  const said: LiveSay[] = [];
  lm.onSay((x) => said.push(x));
  s.start();
  return { s, lm, said, sim };
}

describe('the online flag (queue item 34)', () => {
  it('a match is live when the opponent is an online player', () => {
    const base = createFakeSim().config as MatchConfig;
    expect(isLiveMatch(base)).toBe(false);
    expect(isLiveMatch(onlineConfig(base))).toBe(true);
    expect(isLiveMatch(onlineConfig(base), 1)).toBe(false);
  });

  it("the AI's own emotes stay out of a live match; its other commands pass", () => {
    const inner: BotController = {
      snapshotDelayTicks: 4,
      onTick: (): Command[] => [
        { t: 'train', side: 1, slot: 0 },
        { t: 'emote', side: 1, emote: 'gg' },
      ],
    };
    const quiet = withoutEmotes(inner);
    expect(quiet.snapshotDelayTicks).toBe(4);
    expect(quiet.onTick({} as never)).toEqual([{ t: 'train', side: 1, slot: 0 }]);
  });
});

describe('the live match layer (queue item 34)', () => {
  it('your proposal goes over the link; their yes changes the speed for both, their no keeps it', () => {
    const link = new TestLink();
    const { s, lm } = live({ link });
    expect(lm.propose(2)).toBeNull();
    expect(link.sent).toEqual([{ k: 'tempoPropose', id: 1, speed: 2 }]);
    expect(lm.tempo.value.pending).toMatchObject({ by: 'me', speed: 2 });
    s.advance(16);
    expect(link.updates.at(-1)).toEqual({ speed: 1, tempoBusy: true });
    link.say({ k: 'tempoAnswer', id: 1, accept: true });
    expect(s.currentSpeed).toBe(2);
    expect(lm.tempo.value).toMatchObject({ speed: 2, pending: null, last: { result: 'accepted' } });
    // the next one waits the cooldown
    expect(lm.propose(1)).toBe('cooldown');
  });

  it('their proposal waits for your answer; no answer in the window is a decline sent back', () => {
    const link = new TestLink();
    const { s, lm } = live({ link });
    link.say({ k: 'tempoPropose', id: 5, speed: 1.5 });
    expect(lm.tempo.value.pending).toMatchObject({ by: 'foe', speed: 1.5 });
    for (let t = 0; t < PROPOSAL_WINDOW_MS + 100; t += 50) s.advance(50);
    expect(lm.tempo.value.pending).toBeNull();
    expect(lm.tempo.value.last).toMatchObject({ by: 'foe', result: 'timeout' });
    expect(link.sent).toEqual([{ k: 'tempoAnswer', id: 5, accept: false }]);
    expect(s.currentSpeed).toBe(1);
  });

  it('accepting theirs applies it at once', () => {
    const link = new TestLink();
    const { s, lm } = live({ link });
    link.say({ k: 'tempoPropose', id: 2, speed: 2 });
    lm.answer(true);
    expect(link.sent).toEqual([{ k: 'tempoAnswer', id: 2, accept: true }]);
    expect(s.currentSpeed).toBe(2);
  });

  it('talk: your emotes and chat go to them and show as yours; theirs show as theirs unless muted', () => {
    const link = new TestLink();
    const { s, lm, said } = live({ link });
    lm.sendEmote('thumbsUp');
    expect(link.sent).toEqual([{ k: 'emote', emote: 'thumbsUp' }]);
    expect(said).toEqual([{ side: 0, emote: 'thumbsUp' }]);
    // the emote gap holds the next one
    lm.sendChat('nice');
    expect(said).toHaveLength(1);
    for (let t = 0; t < SAY_GAP_MS; t += 50) s.advance(50);
    lm.sendChat('nice');
    lm.sendChat('not-a-line');
    expect(said.at(-1)).toEqual({ side: 0, chat: 'nice' });
    link.say({ k: 'chat', line: 'wow' });
    link.say({ k: 'emote', emote: 'laugh' });
    expect(said.slice(-2)).toEqual([
      { side: 1, chat: 'wow' },
      { side: 1, emote: 'laugh' },
    ]);
    lm.setMuted(true);
    link.say({ k: 'chat', line: 'gg' });
    expect(said.at(-1)).toEqual({ side: 1, emote: 'laugh' });
    expect(lm.muted.value).toBe(true);
  });

  it('starts muted when Settings mutes opponent emotes', () => {
    const link = new TestLink();
    const { lm, said } = live({ link, muted: true });
    link.say({ k: 'emote', emote: 'laugh' });
    expect(said).toEqual([]);
    expect(lm.muted.value).toBe(true);
  });

  it('the simulated opponent answers after its delay (a forced yes here) and the speed follows', () => {
    const { s, lm } = live();
    expect(lm.persona).not.toBeNull();
    lm.dev.answers({ answer: 'accept', delayMs: 1500 });
    expect(lm.propose(1.5)).toBeNull();
    for (let t = 0; t < 1400; t += 50) s.advance(50);
    expect(s.currentSpeed).toBe(1);
    for (let t = 0; t < 200; t += 50) s.advance(50);
    expect(s.currentSpeed).toBe(1.5);
  });

  it('a forced silence runs out: no answer counts as a decline', () => {
    const { s, lm } = live();
    lm.dev.answers({ answer: 'ignore' });
    lm.propose(2);
    for (let t = 0; t < PROPOSAL_WINDOW_MS + 200; t += 50) s.advance(50);
    expect(lm.tempo.value.last).toMatchObject({ by: 'me', result: 'timeout' });
    expect(s.currentSpeed).toBe(1);
  });

  it('the simulated opponent proposes and talks through the dev hooks', () => {
    const { s, lm, said } = live();
    lm.dev.propose(2);
    s.advance(16);
    expect(lm.tempo.value.pending).toMatchObject({ by: 'foe', speed: 2 });
    lm.answer(false);
    expect(lm.tempo.value.last).toMatchObject({ by: 'foe', result: 'declined' });
    lm.dev.say({ k: 'chat', line: 'gg' });
    s.advance(16);
    expect(said.at(-1)).toEqual({ side: 1, chat: 'gg' });
  });

  it('the end closes the tempo: nothing open, nothing proposed after', () => {
    const link = new TestLink();
    const { s, lm } = live({ link });
    lm.propose(2);
    s.advance(20_000);
    expect(s.status.value).toBe('ended');
    expect(lm.tempo.value).toMatchObject({ pending: null, ended: true });
    expect(lm.propose(2)).toBe('ended');
  });

  it('dispose lets go of the link and the listeners', () => {
    const link = new TestLink();
    const { s, lm } = live({ link });
    lm.dispose();
    expect(link.disposed).toBe(true);
    s.advance(100);
    expect(link.updates).toEqual([]);
  });
});

describe('the app wiring (queue item 34)', () => {
  async function app(patch: (s: SaveDoc) => SaveDoc = (s) => s) {
    const clock = new FixedClock(Date.UTC(2026, 9, 3, 12));
    const services = await buildServices({ choice: { ...DEFAULT_CHOICE, save: 'memory', audio: 'fake', art: 'fake' }, clock });
    if (!isMetaRules(services.meta)) throw new Error('real meta expected');
    const meta = services.meta;
    const fresh = meta.newSave(services.content, clock, 7);
    const save = patch({ ...fresh, tutorial: { ...fresh.tutorial, step: 4 }, matchesPlayed: 3 });
    await services.saveStore.save(save, { immediate: true });
    const c = new AppController(services, { save, delay: async () => undefined, homeScreen: true });
    const ui = createMetaUi({ controller: c, services, meta });
    c.showTitle();
    return { c, ui };
  }

  it('Ranked is live: no pause, 1x whatever the default speed, the AI never emotes, a live layer for the HUD', async () => {
    const { c, ui } = await app((s) => ({ ...s, settings: { ...s.settings, defaultSpeed: 2 } }));
    const req: MatchRequest = { mode: 'ladder', format: 'short', online: true };
    const opp = ui.services.prepareMatch(req);
    ui.router.go({ id: 'vs', request: req, opponent: opp });
    ui.services.beginBattle(req, opp);
    const r = c.route.value;
    if (r.id !== 'battle') throw new Error('no battle');
    const b = r.battle;
    expect(b.live).not.toBeNull();
    expect(b.session.live).toBe(true);
    expect(b.session.currentSpeed).toBe(1);
    b.session.start();
    b.session.pause();
    expect(b.session.status.value).toBe('running');
    expect(ui.router.current.value.id).toBe('battle');
    b.session.fastForward(20 * 60 * 3);
    expect(b.session.commands.filter((x) => x.t === 'emote')).toEqual([]);
    ui.dispose();
  });

  it('the labelled AI ladder and other offline modes are not live: pause and the default speed as before', async () => {
    const { c, ui } = await app((s) => ({ ...s, settings: { ...s.settings, defaultSpeed: 2 } }));
    const req: MatchRequest = { mode: 'ladder', format: 'short' };
    const opp = ui.services.prepareMatch(req);
    ui.router.go({ id: 'vs', request: req, opponent: opp });
    ui.services.beginBattle(req, opp);
    const r = c.route.value;
    if (r.id !== 'battle') throw new Error('no battle');
    expect(r.battle.live).toBeNull();
    expect(r.battle.session.live).toBe(false);
    expect(r.battle.session.currentSpeed).toBe(2);
    r.battle.session.start();
    r.battle.session.pause();
    expect(r.battle.session.status.value).toBe('paused');
    expect(ui.router.current.value.id).toBe('pause');
    ui.dispose();
  });
});
