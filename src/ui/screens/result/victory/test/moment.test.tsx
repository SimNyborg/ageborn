/**
 * The victory moment on the Result screen (owner request 2026-10-07; ui-plan MR-129), on the test DOM:
 * the stage stands in for the recap with a skip label, the move comes from the match seed and is
 * remembered in a UI flag, a tap skips it, a Retreat has none, and where Web Animations or layout are
 * missing (this DOM, very old browsers) the moment ends by itself and the Result shows as before.
 */
import { content } from '@/content';
import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';
import { fixtureResult } from '../../../fixtures/matches';
import { mount, type Mounted } from '../../../test/harness';
import { fixtureSave } from '../../../fixtures/saves';
import { MOMENT_FLAG, pickMove } from '../moves';

let m: Mounted | null = null;
afterEach(() => {
  m?.unmount();
  m = null;
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const wait = async (ms: number) => {
  await act(async () => {
    await sleep(ms);
  });
};

function flagCalls(mm: Mounted): Record<string, boolean>[] {
  return mm.log.calls.filter((c) => c.name === 'setUiFlags').map((c) => c.args[0] as Record<string, boolean>);
}

describe('the victory moment on the Result', () => {
  it('stands in for the recap on a win, labelled and skippable, with the move from the match seed', () => {
    const info = fixtureResult(content, 'player');
    m = mount({ routes: [{ id: 'home' }, { id: 'result', info }] });
    const stage = m.q('[data-testid="result-moment"]');
    expect(stage).not.toBeNull();
    const want = pickMove('win', info.input.opponent.seed, null)!;
    expect(stage!.getAttribute('data-move')).toBe(want.id);
    expect(stage!.getAttribute('data-kind')).toBe('win');
    expect(stage!.getAttribute('role')).toBe('button');
    expect(stage!.getAttribute('aria-label')).toContain('Kenji_77');
    expect(stage!.getAttribute('aria-label')).toContain('Tap to skip');
    // The recap waits underneath; your General's spot by the banner waits too.
    expect(m.q('.result__left')!.getAttribute('class')).toContain('has-moment');
    expect(m.q('.result__hero')!.getAttribute('class')).toContain('is-waiting');
    // The move is remembered for the next match (one ui- flag on, the others off).
    const flags = flagCalls(m);
    expect(flags.length).toBeGreaterThan(0);
    expect(flags[flags.length - 1]![`${MOMENT_FLAG}${want.id}`]).toBe(true);
  });

  it('never repeats the previous match move', () => {
    const info = fixtureResult(content, 'player');
    const first = pickMove('win', info.input.opponent.seed, null)!;
    const save = fixtureSave(content, 'mid');
    m = mount({ save: { ...save, flags: { ...save.flags, [`${MOMENT_FLAG}${first.id}`]: true } }, routes: [{ id: 'home' }, { id: 'result', info }] });
    const id = m.q('[data-testid="result-moment"]')!.getAttribute('data-move');
    expect(id).not.toBe(first.id);
    expect(id).toBe(pickMove('win', info.input.opponent.seed, first.id)!.id);
  });

  it('plays a gentle move on a loss and the stand-off on a draw, and none after a Retreat', () => {
    m = mount({ routes: [{ id: 'home' }, { id: 'result', info: fixtureResult(content, 'loss') }] });
    expect(m.q('[data-testid="result-moment"]')!.getAttribute('data-kind')).toBe('loss');
    m.unmount();
    m = mount({ routes: [{ id: 'home' }, { id: 'result', info: fixtureResult(content, 'draw') }] });
    expect(m.q('[data-testid="result-moment"]')!.getAttribute('data-move')).toBe('standoff');
    m.unmount();
    m = mount({ routes: [{ id: 'home' }, { id: 'result', info: fixtureResult(content, 'retreat') }] });
    expect(m.q('[data-testid="result-moment"]')).toBeNull();
    expect(m.q('[data-testid="result-recap"]')).not.toBeNull();
  });

  it('a tap skips it: the stage fades out and the recap and your General come back', async () => {
    m = mount({ routes: [{ id: 'home' }, { id: 'result', info: fixtureResult(content, 'win') }] });
    m.click('[data-testid="result-moment"]');
    expect(m.q('[data-testid="result-moment"]')!.getAttribute('class')).toContain('is-closing');
    await wait(260);
    expect(m.q('[data-testid="result-moment"]')).toBeNull();
    expect(m.q('.result__left')!.getAttribute('class')).not.toContain('has-moment');
    expect(m.q('.result__left')!.getAttribute('class')).toContain('is-revealed');
    expect(m.q('[data-testid="result-hero"]')).not.toBeNull();
    expect(m.q('.result__hero')!.getAttribute('class')).not.toContain('is-waiting');
  });

  it('ends by itself where it cannot play (no Web Animations or layout), and the Result shows as before', async () => {
    m = mount({ routes: [{ id: 'home' }, { id: 'result', info: fixtureResult(content, 'win') }] });
    expect(m.q('[data-testid="result-moment"]')).not.toBeNull();
    // The lazy player loads, finds no layout to play in, and the stage closes.
    await wait(700);
    expect(m.q('[data-testid="result-moment"]')).toBeNull();
    expect(m.q('[data-testid="result-recap"]')).not.toBeNull();
    // The primary is still the one obvious action.
    expect(m.q('[data-testid="result-open"]')).not.toBeNull();
  });

  it('the action bar works while the moment plays (it never blocks input)', () => {
    const info = fixtureResult(content, 'win');
    m = mount({ routes: [{ id: 'home' }, { id: 'result', info }] });
    expect(m.q('[data-testid="result-moment"]')).not.toBeNull();
    m.click('[data-testid="result-home"]');
    expect(m.router.current.value.id).toBe('home');
  });
});
