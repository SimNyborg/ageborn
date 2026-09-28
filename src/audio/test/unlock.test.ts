import { describe, expect, it } from 'vitest';
import { createAudioContext, keepAlive, playSilence, unlockContext } from '../unlock';
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
