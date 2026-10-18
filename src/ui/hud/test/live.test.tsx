/**
 * The live match HUD pieces (queue item 34, `Live.tsx`) over a fake live layer: the tempo button opens the
 * three speeds and a pick proposes; a proposal that cannot go says why (cooldown, their card open); the
 * waiting, agreed and declined tags; their proposal's card with Accept and Decline; the menu's mute and
 * its two-step Retreat; the catch-up cue and the away banner.
 */
import { signal } from '@preact/signals';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchConfig } from '@/contracts';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { installDom, text, type FakeElement } from '../../screens/test/dom';
import type { HudCtx } from '../context';
import { AwayNotice, CatchUpCue, LiveControls, PROMPT_ARM_MS, TempoPrompt, type LiveOpen } from '../Live';
import type { LiveCatchUp, LiveHud, LiveRefusal, LiveSay, LiveSpeed, LiveTempo } from '../live';
import { sampleHudModel } from '../samples';
import { wheelChat } from '../EmoteWheel';

interface FakeLive extends LiveHud {
  proposals: LiveSpeed[];
  answers: boolean[];
  refusal: LiveRefusal | null;
  setTempo(t: Partial<LiveTempo>): void;
  clock: number;
  catchSig: ReturnType<typeof signal<LiveCatchUp | null>>;
  awaySig: ReturnType<typeof signal<boolean>>;
}

function fakeLive(): FakeLive {
  const tempo = signal<LiveTempo>({ speed: 1, pending: null, last: null, readyAt: 0, ended: false });
  const muted = signal(false);
  const catchSig = signal<LiveCatchUp | null>(null);
  const awaySig = signal(false);
  const live: FakeLive = {
    tempo,
    muted,
    catchUp: catchSig,
    away: awaySig,
    catchSig,
    awaySig,
    quickChat: ['glhf', 'gg'],
    foeName: 'LadyWaffle',
    clock: 10_000,
    proposals: [],
    answers: [],
    refusal: null,
    now: () => live.clock,
    propose(s) {
      if (live.refusal) return live.refusal;
      live.proposals.push(s);
      return null;
    },
    answer(yes) {
      live.answers.push(yes);
    },
    sendEmote: () => undefined,
    sendChat: () => undefined,
    setMuted(on) {
      muted.value = on;
    },
    onSay: (_cb: (s: LiveSay) => void) => () => undefined,
    setTempo(t) {
      tempo.value = { ...tempo.value, ...t };
    },
  };
  return live;
}

const config: MatchConfig = fakeMatchConfig();
const t = (key: string, p?: Record<string, string | number>): string => (p ? `${key}(${Object.entries(p).map(([k, v]) => `${k}=${v}`).join(',')})` : key);

function ctx(live: FakeLive, over: Partial<HudCtx> = {}): HudCtx & { acts: unknown[]; sounds: string[] } {
  const acts: unknown[] = [];
  const sounds: string[] = [];
  return {
    m: sampleHudModel(config),
    config,
    side: 0,
    t,
    act: (i) => acts.push(i),
    denied: () => false,
    reason: () => null,
    portrait: undefined,
    view: undefined,
    audio: { play: (id) => sounds.push(id) },
    compact: true,
    readOnly: false,
    keys: false,
    live,
    acts,
    sounds,
    ...over,
  };
}

let container: FakeElement;

beforeEach(() => {
  container = installDom().container;
  (globalThis as unknown as { window: EventTarget }).window = new EventTarget();
  vi.useFakeTimers();
});

afterEach(() => {
  render(null, container as unknown as Element);
  vi.useRealTimers();
  delete (globalThis as { window?: unknown }).window;
});

function q(sel: string): FakeElement | null {
  return container.querySelector(sel);
}

/** Clicks through the tiny DOM (a bubbling click event). */
function tap(el: FakeElement | null): void {
  if (!el) throw new Error('nothing to tap');
  act(() => {
    el.click();
  });
}

/** The controls with their open state kept as the HUD keeps it. */
function Controls(p: { c: HudCtx; live: LiveHud; open: { v: LiveOpen } }) {
  const [open, setOpen] = [p.open.v, (o: LiveOpen) => (p.open.v = o)];
  return <LiveControls c={p.c} live={p.live} open={open} setOpen={(o) => setOpen(o)} menu={{ retreat: () => retreats.push(1), settings: () => settings.push(1) }} />;
}

const retreats: number[] = [];
const settings: number[] = [];

function mountControls(live: FakeLive, c = ctx(live)) {
  const open = { v: null as LiveOpen };
  const draw = (): void => {
    act(() => {
      render(<Controls c={c} live={live} open={open} />, container as unknown as Element);
    });
  };
  draw();
  return { open, draw, c };
}

describe('live tempo control (queue item 34)', () => {
  it('shows the speed with the ask badge; a tap opens the three speeds and a pick proposes', () => {
    const live = fakeLive();
    const { open, draw, c } = mountControls(live);
    const btn = q('[data-testid="hud-tempo"]')!;
    expect(btn.getAttribute('data-speed')).toBe('1');
    expect(q('.hud-tempo-ask')).not.toBeNull();
    tap(btn);
    expect(open.v).toBe('tempo');
    draw();
    expect(q('[data-testid="hud-tempo-menu"]')).not.toBeNull();
    expect(q('[data-testid="hud-tempo-1"]')!.hasAttribute('disabled')).toBe(true);
    expect(text(q('[data-testid="hud-tempo-menu"]')!)).toContain('hud.live.tempoHint(name=LadyWaffle)');
    tap(q('[data-testid="hud-tempo-2"]'));
    expect(live.proposals).toEqual([2]);
    expect(open.v).toBeNull();
    expect(c.sounds).toContain('ui_confirm');
  });

  it('while your proposal waits: the ring, "2x?" and who it waits for with the seconds left', () => {
    const live = fakeLive();
    live.setTempo({ pending: { id: 1, by: 'me', speed: 2, at: 9000, until: 17_000 } });
    mountControls(live);
    const btn = q('[data-testid="hud-tempo"]')!;
    expect(btn.getAttribute('data-asking')).toBe('2');
    expect(q('.hud-tempo-ring.is-gold')).not.toBeNull();
    expect(q('.hud-tempo-ask')).toBeNull();
    expect(text(btn)).toContain('hud.live.asking(s=2)');
    const tag = q('[data-testid="hud-tempo-tag"]')!;
    expect(tag.getAttribute('data-tone')).toBe('wait');
    expect(text(tag)).toContain('hud.live.waiting(name=LadyWaffle)');
    expect(text(tag)).toContain('7');
  });

  it('then how it ended: agreed (with a sound), said no, or no answer', () => {
    const live = fakeLive();
    const { draw, c } = mountControls(live);
    live.setTempo({ speed: 2, last: { id: 1, by: 'me', speed: 2, result: 'accepted', at: 9800 } });
    draw();
    expect(q('[data-testid="hud-tempo-tag"]')!.getAttribute('data-tone')).toBe('good');
    expect(c.sounds).toContain('ui_unlock');
    expect(q('.hud-tempo-label.is-pop')).not.toBeNull();
    live.setTempo({ speed: 1, last: { id: 2, by: 'me', speed: 2, result: 'declined', at: 9900 } });
    draw();
    expect(text(q('[data-testid="hud-tempo-tag"]')!)).toBe('hud.live.declined(name=LadyWaffle)');
    live.setTempo({ last: { id: 3, by: 'me', speed: 2, result: 'timeout', at: 9900 } });
    draw();
    expect(text(q('[data-testid="hud-tempo-tag"]')!)).toBe('hud.live.noAnswer');
    // an old outcome is gone
    live.clock = 20_000;
    draw();
    expect(q('[data-testid="hud-tempo-tag"]')).toBeNull();
  });

  it('a tap during the cooldown says why; while their card is open it is denied without a tag behind the card', () => {
    const live = fakeLive();
    live.setTempo({ readyAt: 22_000 });
    const { open, draw, c } = mountControls(live);
    expect(q('.hud-tempo-ring.is-slate')).not.toBeNull();
    tap(q('[data-testid="hud-tempo"]'));
    draw();
    expect(open.v).toBeNull();
    expect(c.acts).toEqual([{ k: 'deny', target: 'tempo' }]);
    expect(text(q('[data-testid="hud-tempo-tag"]')!)).toBe('hud.live.cooldown(s=12)');
    live.setTempo({ readyAt: 0, pending: { id: 4, by: 'foe', speed: 2, at: 9000, until: 17_000 } });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    draw();
    tap(q('[data-testid="hud-tempo"]'));
    draw();
    // the card says what to do; a tag would hang behind it on phones (review O nit 4)
    expect(c.acts).toEqual([
      { k: 'deny', target: 'tempo' },
      { k: 'deny', target: 'tempo' },
    ]);
    expect(q('[data-testid="hud-tempo-tag"]')).toBeNull();
    expect(open.v).toBeNull();
  });

  it('a pick the live layer refuses says why', () => {
    const live = fakeLive();
    const { open, draw } = mountControls(live);
    tap(q('[data-testid="hud-tempo"]'));
    draw();
    live.refusal = 'pending';
    tap(q('[data-testid="hud-tempo-1.5"]'));
    draw();
    expect(open.v).toBeNull();
    expect(text(q('[data-testid="hud-tempo-tag"]')!)).toBe('hud.live.waiting(name=LadyWaffle)');
  });

  it('does nothing while the battle catches up (its cue covers the lane; the opponent waits too)', () => {
    const live = fakeLive();
    live.catchSig.value = { behindMs: 30_000, doneBp: 1000 };
    const { open, draw, c } = mountControls(live);
    tap(q('[data-testid="hud-tempo"]'));
    draw();
    expect(open.v).toBeNull();
    expect(c.acts).toEqual([]);
    expect(q('[data-testid="hud-tempo-tag"]')).toBeNull();
    // a pick the layer refuses as busy says nothing either
    live.catchSig.value = null;
    tap(q('[data-testid="hud-tempo"]'));
    draw();
    live.refusal = 'busy';
    tap(q('[data-testid="hud-tempo-2"]'));
    draw();
    expect(q('[data-testid="hud-tempo-tag"]')).toBeNull();
  });

  it('the menu button carries a LIVE label, not a red dot (review O nit 7)', () => {
    const live = fakeLive();
    mountControls(live);
    const btn = q('[data-testid="hud-live-menu"]')!;
    expect(text(btn)).toBe('hud.live.pill');
    expect(btn.querySelector('.hud-live-pill')).not.toBeNull();
  });

  it('the pieces with their own Reduce motion variant opt out of the theme net (review O B1)', () => {
    const live = fakeLive();
    live.setTempo({ pending: { id: 1, by: 'me', speed: 2, at: 9000, until: 17_000 } });
    const { open, draw } = mountControls(live);
    // the gold ring and the waiting tag keep their 8 s and their fade
    expect(q('.hud-tempo-ring.ui-rm-own')).not.toBeNull();
    expect(q('.hud-tempo-tag.ui-rm-own')).not.toBeNull();
    open.v = 'menu';
    draw();
    expect(q('.hud-live-menu-drop.ui-rm-own')).not.toBeNull();
  });
});

describe('quick chat in the wheel (queue item 34, review O S4)', () => {
  it('leaves out a line that an equipped quote already says, and only then', () => {
    const all = ['glhf', 'nice', 'wow', 'oops', 'thanks', 'wp', 'gg'];
    expect(wheelChat(all, ['quote.glhf', 'quote.well_played', 'quote.nice_move', 'quote.so_close'])).toEqual(['nice', 'wow', 'oops', 'thanks', 'gg']);
    expect(wheelChat(all, ['quote.glhf'])).toEqual(['nice', 'wow', 'oops', 'thanks', 'wp', 'gg']);
    expect(wheelChat(all, [])).toEqual(all);
  });
});

describe('live menu (queue item 34)', () => {
  it('opens from the menu button: mute switch, settings, and Retreat only after a second tap', () => {
    const live = fakeLive();
    retreats.length = 0;
    settings.length = 0;
    const { open, draw } = mountControls(live);
    tap(q('[data-testid="hud-live-menu"]'));
    expect(open.v).toBe('menu');
    draw();
    const mute = q('[data-testid="hud-live-mute"]')!;
    expect(mute.getAttribute('aria-checked')).toBe('false');
    tap(mute);
    expect(live.muted.value).toBe(true);
    draw();
    expect(q('[data-testid="hud-live-mute"]')!.getAttribute('aria-checked')).toBe('true');
    tap(q('[data-testid="hud-live-retreat"]'));
    draw();
    expect(retreats).toEqual([]);
    expect(q('[data-testid="hud-live-retreat-confirm"]')).not.toBeNull();
    tap(q('[data-testid="hud-live-retreat-no"]'));
    draw();
    expect(q('[data-testid="hud-live-retreat-confirm"]')).toBeNull();
    tap(q('[data-testid="hud-live-retreat"]'));
    draw();
    tap(q('[data-testid="hud-live-retreat-yes"]'));
    expect(retreats).toEqual([1]);
    expect(open.v).toBeNull();
    draw();
    expect(q('[data-testid="hud-live-menu-drop"]')).toBeNull();
    open.v = 'menu';
    draw();
    tap(q('[data-testid="hud-live-settings"]'));
    expect(settings).toEqual([1]);
  });
});

describe('their proposal, the catch-up and the away banner (queue item 34)', () => {
  it("their proposal shows a card with the speed; Accept and Decline answer it; it leaves after", () => {
    const live = fakeLive();
    const c = ctx(live);
    const draw = (): void => {
      act(() => {
        render(<TempoPrompt c={c} live={live} />, container as unknown as Element);
      });
    };
    draw();
    expect(q('[data-testid="hud-tempo-prompt"]')).toBeNull();
    live.setTempo({ pending: { id: 9, by: 'foe', speed: 1.5, at: 9000, until: 17_000 } });
    draw();
    const card = q('[data-testid="hud-tempo-prompt"]')!;
    expect(card.getAttribute('data-speed')).toBe('1.5');
    expect(text(card)).toContain('hud.live.speedQ(s=1.5)');
    expect(c.sounds).toContain('ui_pop');
    // it owns its Reduce motion fade, and the drain bar keeps its 8 s (review O B1)
    expect(q('.hud-tempo-prompt.ui-rm-own')).not.toBeNull();
    expect(q('.hud-tp-bar.ui-rm-own')).not.toBeNull();
    // its buttons wake 400 ms after it lands: a tap meant for the closing menu answers nothing (review O S2)
    expect(q('.hud-tempo-prompt.is-arming')).not.toBeNull();
    tap(q('[data-testid="hud-tempo-accept"]'));
    expect(live.answers).toEqual([]);
    act(() => {
      vi.advanceTimersByTime(PROMPT_ARM_MS);
    });
    draw();
    expect(q('.hud-tempo-prompt.is-arming')).toBeNull();
    tap(q('[data-testid="hud-tempo-accept"]'));
    expect(live.answers).toEqual([true]);
    live.setTempo({ pending: null });
    draw();
    // it plays its exit, then goes
    expect(q('.hud-tempo-prompt.is-leaving')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    draw();
    expect(q('[data-testid="hud-tempo-prompt"]')).toBeNull();
    live.setTempo({ pending: { id: 10, by: 'foe', speed: 2, at: 9000, until: 17_000 } });
    draw();
    act(() => {
      vi.advanceTimersByTime(PROMPT_ARM_MS);
    });
    draw();
    tap(q('[data-testid="hud-tempo-decline"]'));
    expect(live.answers).toEqual([true, false]);
  });

  it('shows Y and N on its buttons once the player uses keys (review O nit 6)', () => {
    const live = fakeLive();
    live.setTempo({ pending: { id: 3, by: 'foe', speed: 2, at: 9000, until: 17_000 } });
    act(() => {
      render(<TempoPrompt c={ctx(live, { keys: true })} live={live} />, container as unknown as Element);
    });
    expect(text(q('[data-testid="hud-tempo-accept"]')!)).toBe('hud.live.acceptY');
    expect(text(q('[data-testid="hud-tempo-decline"]')!)).toBe('hud.live.declineN');
  });

  it('your own open proposal shows no card', () => {
    const live = fakeLive();
    live.setTempo({ pending: { id: 1, by: 'me', speed: 2, at: 9000, until: 17_000 } });
    act(() => {
      render(<TempoPrompt c={ctx(live)} live={live} />, container as unknown as Element);
    });
    expect(q('[data-testid="hud-tempo-prompt"]')).toBeNull();
  });

  it('the catch-up cue waits 150 ms (a short catch-up never flashes), then shows the progress and time behind', () => {
    const live = fakeLive();
    const c = ctx(live);
    const draw = (): void => {
      act(() => {
        render(<CatchUpCue c={c} live={live} />, container as unknown as Element);
      });
    };
    live.catchSig.value = { behindMs: 42_000, doneBp: 2500 };
    draw();
    expect(q('[data-testid="hud-catchup"]')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    draw();
    const cue = q('[data-testid="hud-catchup"]')!;
    expect(text(cue)).toContain('hud.live.catchingUp');
    // why it fast-forwards (review O nit 9), and it owns its Reduce motion fade (B1)
    expect(text(cue)).toContain('hud.live.catchUpWhy');
    expect(q('.hud-catchup.ui-rm-own')).not.toBeNull();
    expect(text(cue)).toContain('hud.live.behind(time=0:42)');
    live.catchSig.value = null;
    draw();
    expect(q('.hud-catchup.is-leaving')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    draw();
    expect(q('[data-testid="hud-catchup"]')).toBeNull();
  });

  it('the away banner says the match counted as a Retreat', () => {
    const live = fakeLive();
    const c = ctx(live);
    act(() => {
      render(<AwayNotice c={c} live={live} />, container as unknown as Element);
    });
    expect(q('[data-testid="hud-away"]')).toBeNull();
    live.awaySig.value = true;
    act(() => {
      render(<AwayNotice c={c} live={live} />, container as unknown as Element);
    });
    expect(text(q('[data-testid="hud-away"]')!)).toBe('hud.live.awayhud.live.awaySub');
    // it fades in and holds under Reduce motion too (the theme net used to end it at opacity 0 at once, B1)
    expect(q('.hud-moment.ui-rm-own')).not.toBeNull();
  });
});

