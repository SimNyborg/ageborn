/**
 * The Age Capsule dialog (DESIGN A6.4): the app asks for the age before meta rolls a non-scripted
 * Age Capsule (a full War Chest here, A15.5), then applies the result with the picked age.
 */
import { describe, expect, it } from 'vitest';
import { InMemorySaveStore } from '@/contracts/fakes/saveStore';
import { AgePicker } from '../agePick';
import { finishMatch } from '../flow';
import { C, clock, M, matchInput, scripted } from '@/meta/test/helpers';

describe('AgePicker', () => {
  it('answers with the suggested age at once while no dialog is mounted', async () => {
    const p = new AgePicker();
    await expect(p.ask({ ages: ['stone', 'medieval'], suggested: 'medieval' })).resolves.toBe('medieval');
    expect(p.request.value).toBeNull();
  });

  it('waits for the player while the dialog is mounted, and only accepts an offered age', async () => {
    const p = new AgePicker();
    const detach = p.attach();
    const a = p.ask({ ages: ['stone', 'medieval'], suggested: 'medieval' });
    expect(p.request.value?.ages).toEqual(['stone', 'medieval']);
    p.request.value!.pick('stone');
    await expect(a).resolves.toBe('stone');
    expect(p.request.value).toBeNull();
    const b = p.ask({ ages: ['stone', 'medieval'], suggested: 'medieval' });
    p.request.value!.pick('future');
    await expect(b).resolves.toBe('medieval');
    detach();
  });
});

describe('a result that grants an Age Capsule uses the picked age (A6.4, A15.5)', () => {
  it('meta says an age is due, offers the drop ages, and the grant carries the picked age', async () => {
    const c = clock();
    let s = scripted(11, 1);
    s = { ...s, quests: { ...s.quests, weekly: { ...s.quests.weekly, progress: 19 } } };
    const input = matchInput('ladder', 'win', M.pickOpponent(s, 'ladder', C, c));
    expect(M.ageCapsuleDue(s, input, C, c)).toBe(true);
    const choices = M.ageCapsuleChoices(s, C);
    expect(choices.ages.length).toBeGreaterThan(1);
    expect(choices.ages).toContain(choices.suggested);
    const pick = choices.ages.find((a) => a !== choices.suggested)!;
    const store = new InMemorySaveStore();
    const out = await finishMatch({ meta: M, saveStore: store, content: C, clock: c }, s, { mode: 'ladder' }, input, {} as never, {}, { age: pick });
    const age = out.save!.capsules.pending.find((p) => p.kind === 'age' && p.scriptIndex === null);
    expect(age?.age).toBe(pick);
    expect(out.rewards.some((r) => r.kind === 'crate')).toBe(true);
  });
});
