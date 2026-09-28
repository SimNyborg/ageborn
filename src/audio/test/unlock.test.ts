import { describe, expect, it } from 'vitest';
import { createAudioContext, GESTURES, keepAlive, playSilence, unlockContext } from '../unlock';
import { FakeBufferSource, FakeContext } from './fakeContext';

class FakeDocument extends EventTarget {
  visibilityState: DocumentVisibilityState = 'visible';
  set(v: DocumentVisibilityState): void {
    this.visibilityState = v;
    this.dispatchEvent(new Event('visibilitychange'));
  }
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('audio unlock (A13, B11)', () => {
  it('has no AudioContext in Node and says so instead of throwing', () => {
    expect(createAudioContext()).toBeNull();
  });

  it('starts a one-sample silent buffer (iOS) and resumes', async () => {
    const ctx = new FakeContext();
    await unlockContext(ctx.asAudioContext());
    expect(ctx.state).toBe('running');
    const blip = ctx.of(FakeBufferSource)[0]!;
    expect(blip.buffer!.length).toBe(1);
    expect(blip.startedAt).toBe(0);
    expect(blip.outputs[0]).toBe(ctx.destination);
  });

  it('gives up waiting when the browser keeps the context suspended', async () => {
    const ctx = new FakeContext();
    ctx.allowResume = false;
    await expect(unlockContext(ctx.asAudioContext(), 5)).resolves.toBeUndefined();
    expect(ctx.state).toBe('suspended');
  });

  it('playSilence never throws', () => {
    const broken = { createBufferSource: () => { throw new Error('nope'); } } as unknown as BaseAudioContext;
    expect(() => playSilence(broken)).not.toThrow();
  });

  it('resumes after an interruption on the next gesture, once', async () => {
    const ctx = new FakeContext();
    ctx.state = 'running';
    const target = new EventTarget();
    const stop = keepAlive(ctx.asAudioContext(), target, null);
    ctx.setState('interrupted' as AudioContextState);
    target.dispatchEvent(new Event('touchend'));
    await flush();
    expect(ctx.state).toBe('running');
    expect(ctx.resumeCalls).toBe(1);
    target.dispatchEvent(new Event('touchend'));
    expect(ctx.resumeCalls).toBe(1);
    stop();
  });

  it('keeps retrying on later gestures when the first one carried no user activation', async () => {
    // A context that never ran fires no statechange, so the retry listeners must be armed up front.
    const ctx = new FakeContext();
    ctx.allowResume = false;
    const target = new EventTarget();
    const stop = keepAlive(ctx.asAudioContext(), target, null);
    // A touch pointerdown: the browser refuses to start audio.
    target.dispatchEvent(new Event('pointerdown'));
    await flush();
    expect(ctx.state).toBe('suspended');
    expect(ctx.resumeCalls).toBe(1);
    // The same tap's touchend carries the activation: resume and the silent blip run again.
    ctx.allowResume = true;
    const blips = ctx.of(FakeBufferSource).length;
    target.dispatchEvent(new Event('touchend'));
    await flush();
    expect(ctx.state).toBe('running');
    expect(ctx.of(FakeBufferSource).length).toBe(blips + 1);
    // Running: the listeners are gone.
    target.dispatchEvent(new Event('click'));
    expect(ctx.resumeCalls).toBe(2);
    stop();
  });

  it('listens for every activation-triggering event (touch pointerdown alone does not count)', () => {
    expect([...GESTURES].sort()).toEqual(['click', 'keydown', 'mousedown', 'pointerdown', 'pointerup', 'touchend']);
  });

  it('does not resume from a gesture while the page is hidden', async () => {
    const ctx = new FakeContext();
    ctx.state = 'running';
    const doc = new FakeDocument();
    const target = new EventTarget();
    const stop = keepAlive(ctx.asAudioContext(), target, doc as unknown as Document);
    doc.set('hidden');
    await flush();
    expect(ctx.state).toBe('suspended');
    target.dispatchEvent(new Event('keydown'));
    await flush();
    expect(ctx.state).toBe('suspended');
    doc.set('visible');
    await flush();
    expect(ctx.state).toBe('running');
    stop();
  });

  it('suspends while the page is hidden and resumes when it is visible again', async () => {
    const ctx = new FakeContext();
    ctx.state = 'running';
    const doc = new FakeDocument();
    const stop = keepAlive(ctx.asAudioContext(), null, doc as unknown as Document);
    doc.set('hidden');
    await flush();
    expect(ctx.state).toBe('suspended');
    doc.set('visible');
    await flush();
    expect(ctx.state).toBe('running');
    stop();
    doc.set('hidden');
    await flush();
    expect(ctx.state).toBe('running');
  });
});
