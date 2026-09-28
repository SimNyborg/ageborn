/**
 * AudioContext creation and unlocking (DESIGN A13 "The AudioContext is created or resumed on the first
 * user gesture (iOS)", B11 Boot step 5, C5 #44).
 *
 * Browsers start audio only from a user gesture; iOS Safari additionally wants a sound started inside
 * that gesture. `unlockContext` must therefore run synchronously in the gesture handler: it calls
 * `resume()` and starts a one-sample silent buffer before any await. If that attempt does not start
 * the context (the event carried no user activation, such as a touch `pointerdown`), `keepAlive`
 * retries on every following gesture until it runs. Later suspensions (iOS interruptions such as a
 * phone call, or Safari pausing a background tab) are resumed the same way or when the page becomes
 * visible again. A hidden page is suspended on purpose: the game pauses then (C5 #20), and a
 * throttled background tab would only stutter the music.
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
 * Resumes the context from inside a user gesture. Resolves once it runs (its `statechange` says so;
 * a browser may settle `resume()` without starting it), or after `timeoutMs` when the browser keeps
 * it suspended, so callers never hang (`keepAlive` keeps retrying on later gestures).
 */
export function unlockContext(ctx: AudioContext, timeoutMs = 3000): Promise<void> {
  playSilence(ctx);
  if (isRunning(ctx)) return Promise.resolve();
  try {
    void ctx.resume().catch(() => undefined);
  } catch {
    // Some engines throw instead of rejecting; the timeout below still resolves.
  }
  if (isRunning(ctx)) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = (): void => {
      clearTimeout(timer);
      ctx.removeEventListener('statechange', onState);
      resolve();
    };
    const onState = (): void => {
      if (isRunning(ctx) || (ctx.state as string) === 'closed') done();
    };
    const timer = setTimeout(done, timeoutMs);
    ctx.addEventListener('statechange', onState);
  });
}

/**
 * Events that can carry the user activation browsers require before audio may start. On touch
 * screens `pointerdown` and `touchstart` do NOT count (HTML "activation-triggering input event": only
 * `pointerup`/`touchend` for touch, `pointerdown`/`mousedown` for a mouse, and `keydown`), so the
 * first tap's `pointerdown` can fail to start audio while its `touchend` succeeds.
 */
export const GESTURES = ['pointerdown', 'pointerup', 'mousedown', 'touchend', 'click', 'keydown'] as const;

/**
 * Keeps a context running: while it is not `running` (it was created outside a user activation, the
 * first attempt came from an event that carries none, or iOS interrupted it), every gesture on
 * `target` retries the resume and the silent blip until it runs; the page becoming visible resumes it
 * too, and a hidden page suspends it. Returns a function that removes the listeners.
 */
export function keepAlive(ctx: AudioContext, target: EventTarget | null, doc: Document | null): () => void {
  let armed = false;
  const onGesture = (): void => {
    if (isRunning(ctx) || (ctx.state as string) === 'closed') {
      disarm();
      return;
    }
    // A hidden page is suspended on purpose; it resumes when it becomes visible.
    if (doc?.visibilityState === 'hidden') return;
    // Stay armed until the context reports `running`: this event may not carry a user activation.
    playSilence(ctx);
    try {
      void ctx.resume().catch(() => undefined);
    } catch {
      // Some engines throw instead of rejecting; the next gesture tries again.
    }
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
    if (isRunning(ctx) || (ctx.state as string) === 'closed') disarm();
    else arm();
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
  // A context that is not running yet gets the retry listeners now: `statechange` only fires on a
  // change, and a context that never started has none.
  onState();
  return () => {
    disarm();
    ctx.removeEventListener('statechange', onState);
    doc?.removeEventListener('visibilitychange', onVisible);
  };
}
