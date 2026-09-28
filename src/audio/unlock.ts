/**
 * AudioContext creation and unlocking (DESIGN A13 "The AudioContext is created or resumed on the first
 * user gesture (iOS)", B11 Boot step 5, C5 #44).
 *
 * Browsers start audio only from a user gesture; iOS Safari additionally wants a sound started inside
 * that gesture. `unlockContext` must therefore run synchronously in the gesture handler: it calls
 * `resume()` and starts a one-sample silent buffer before any await. Later suspensions (iOS
 * interruptions such as a phone call, or Safari pausing a background tab) are resumed on the next
 * gesture or when the page becomes visible again. A hidden page is suspended on purpose: the game
 * pauses then (C5 #20), and a throttled background tab would only stutter the music.
 */

type AudioContextCtor = new (options?: AudioContextOptions) => AudioContext;

/** Creates an AudioContext when the browser has one (null in Node or very old browsers). */
export function createAudioContext(): AudioContext | null {
  const g = globalThis as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor({ latencyHint: 'interactive' });
  } catch {
    return null;
  }
}

/** Plays one silent sample: iOS unlocks output only after a sound starts inside a gesture. */
export function playSilence(ctx: BaseAudioContext): void {
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // Not fatal: some engines refuse before the context runs.
  }
}

/** True when the context is producing sound. */
export function isRunning(ctx: BaseAudioContext): boolean {
  return ctx.state === 'running';
}

/**
 * Resumes the context from inside a user gesture. Resolves once it runs, or after `timeoutMs` when the
 * browser keeps it suspended (the next gesture tries again).
 */
export function unlockContext(ctx: AudioContext, timeoutMs = 3000): Promise<void> {
  playSilence(ctx);
  if (isRunning(ctx)) return Promise.resolve();
  let resumed: Promise<void>;
  try {
    resumed = ctx.resume();
  } catch {
    resumed = Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const done = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    resumed.then(done, done);
  });
}

const GESTURES = ['pointerdown', 'touchend', 'keydown'] as const;

/**
 * Keeps a context running after an interruption: when it leaves `running`, the next gesture on
 * `target` (or the page becoming visible) resumes it; a hidden page suspends it. Returns a function
 * that removes the listeners.
 */
export function keepAlive(ctx: AudioContext, target: EventTarget | null, doc: Document | null): () => void {
  let armed = false;
  const onGesture = (): void => {
    disarm();
    void unlockContext(ctx);
  };
  const arm = (): void => {
    if (armed || !target) return;
    armed = true;
    for (const e of GESTURES) target.addEventListener(e, onGesture, { passive: true });
  };
  const disarm = (): void => {
    if (!armed || !target) return;
    armed = false;
    for (const e of GESTURES) target.removeEventListener(e, onGesture);
  };
  const onState = (): void => {
    if (isRunning(ctx)) disarm();
    else if ((ctx.state as string) !== 'closed') arm();
  };
  const onVisible = (): void => {
    if (!doc || (ctx.state as string) === 'closed') return;
    if (doc.visibilityState === 'hidden') {
      if (isRunning(ctx)) void ctx.suspend().catch(() => undefined);
    } else if (!isRunning(ctx)) {
      void ctx.resume().catch(() => undefined);
    }
  };
  ctx.addEventListener('statechange', onState);
  doc?.addEventListener('visibilitychange', onVisible);
  return () => {
    disarm();
    ctx.removeEventListener('statechange', onState);
    doc?.removeEventListener('visibilitychange', onVisible);
  };
}
