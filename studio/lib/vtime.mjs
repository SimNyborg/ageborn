// Frame-exact capture of any page (the game's UI screens, the capsule show): a virtual clock.
//
// Once `engage()` is called, the page's time stops: performance.now, Date.now, requestAnimationFrame,
// setTimeout and setInterval run on a virtual clock that only `tick(ms)` advances, and every CSS
// animation and transition (Web Animations API) is paused and seeked to that clock. Each tick runs one
// frame (timers due, then the frame callbacks), so a screenshot after every tick is one frame of video
// at an exact time, however slow the machine.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

/** The script injected before any page script runs. */
export const VTIME_INIT = `(() => {
  const real = {
    now: performance.now.bind(performance),
    dateNow: Date.now,
    raf: window.requestAnimationFrame.bind(window),
    caf: window.cancelAnimationFrame.bind(window),
    st: window.setTimeout.bind(window),
    ct: window.clearTimeout.bind(window),
    si: window.setInterval.bind(window),
    ci: window.clearInterval.bind(window),
  };
  const vt = { on: false, t: 0, base: 0, dateBase: 0, frames: [], timers: new Map(), nextId: 1e6, anims: new Map() };
  window.__vt = vt;
  performance.now = () => (vt.on ? vt.t : real.now());
  Date.now = () => (vt.on ? Math.round(vt.dateBase + vt.t - vt.base) : real.dateNow());
  window.requestAnimationFrame = (cb) => {
    if (!vt.on) return real.raf(cb);
    const id = vt.nextId++;
    vt.frames.push({ id, cb });
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    vt.frames = vt.frames.filter((f) => f.id !== id);
    real.caf(id);
  };
  const addTimer = (cb, ms, args, every) => {
    if (typeof cb !== 'function') return 0;
    const id = vt.nextId++;
    vt.timers.set(id, { at: vt.t + Math.max(0, ms || 0), cb, args, every: every ? Math.max(1, ms || 1) : 0 });
    return id;
  };
  window.setTimeout = (cb, ms, ...args) => (vt.on ? addTimer(cb, ms, args, false) : real.st(cb, ms, ...args));
  window.setInterval = (cb, ms, ...args) => (vt.on ? addTimer(cb, ms, args, true) : real.si(cb, ms, ...args));
  window.clearTimeout = (id) => (vt.timers.delete(id) ? undefined : real.ct(id));
  window.clearInterval = (id) => (vt.timers.delete(id) ? undefined : real.ci(id));

  const syncAnimations = () => {
    for (const a of document.getAnimations()) {
      let rec = vt.anims.get(a);
      if (!rec) {
        const ct = typeof a.currentTime === 'number' ? a.currentTime : 0;
        rec = { start: vt.t - ct };
        vt.anims.set(a, rec);
        try { a.pause(); } catch (e) {}
      }
      try { a.currentTime = Math.max(0, vt.t - rec.start); } catch (e) {}
    }
  };
  const runTimers = (until) => {
    for (let guard = 0; guard < 10000; guard++) {
      let next = null;
      for (const [id, tm] of vt.timers) if (tm.at <= until && (!next || tm.at < next[1].at)) next = [id, tm];
      if (!next) break;
      const [id, tm] = next;
      vt.t = Math.max(vt.t, tm.at);
      if (tm.every) tm.at += tm.every; else vt.timers.delete(id);
      try { tm.cb(...(tm.args || [])); } catch (e) { console.error('[vtime] timer', e); }
    }
  };
  vt.engage = () => {
    if (vt.on) return;
    vt.base = real.now();
    vt.dateBase = real.dateNow();
    vt.t = vt.base;
    vt.on = true;
    syncAnimations();
  };
  vt.tick = async (ms) => {
    const end = vt.t + ms;
    runTimers(end);
    vt.t = end;
    const frames = vt.frames;
    vt.frames = [];
    for (const f of frames) {
      try { f.cb(vt.t); } catch (e) { console.error('[vtime] frame', e); }
    }
    // microtasks (promises, Preact effects queued on them) settle before the frame is shot
    for (let i = 0; i < 4; i++) await Promise.resolve();
    syncAnimations();
    return vt.t - vt.base;
  };
})();`;

/** Pipes screenshots (PNG) into an intermediate video (H.264 4:4:4 CRF 10) at `fps`. */
export function pngPipe(file, fps) {
  mkdirSync(path.dirname(file), { recursive: true });
  const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '10', '-pix_fmt', 'yuv444p', '-g', String(fps), '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}`)))));
  return {
    async write(buf) {
      if (!p.stdin.write(buf)) await new Promise((r) => p.stdin.once('drain', r));
    },
    async close() {
      p.stdin.end();
      await done;
    },
  };
}

/**
 * Records `frames` frames of a page under the virtual clock into `file`. `beforeFrame(k)` may act on
 * the page (taps, clicks) before frame k is advanced. Screenshots come from the compositor (DOM and
 * canvas together) at the page's device pixel ratio. Returns the frame count.
 */
export async function recordPage(page, file, { frames, fps = 30, beforeFrame = null, afterFrame = null, clip = null }) {
  const cdp = await page.context().newCDPSession(page);
  // CDP shoots CSS pixels unless the clip asks for the device scale, so the clip always carries it
  const vp = page.viewportSize();
  const dpr = await page.evaluate(() => window.devicePixelRatio || 1);
  const box = clip ?? { x: 0, y: 0, width: vp.width, height: vp.height };
  const enc = pngPipe(file, fps);
  const t0 = Date.now();
  for (let k = 0; k < frames; k++) {
    if (beforeFrame) await beforeFrame(k);
    await page.evaluate((ms) => window.__vt.tick(ms), 1000 / fps);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { ...box, scale: dpr } });
    await enc.write(Buffer.from(shot.data, 'base64'));
    if (afterFrame) await afterFrame(k);
    if ((k + 1) % 30 === 0) process.stdout.write(`  ${path.basename(file)}: ${k + 1}/${frames} (${((Date.now() - t0) / 1000 / (k + 1)).toFixed(2)} s/frame)\r`);
  }
  await enc.close();
  await cdp.detach();
  process.stdout.write(`\n`);
  return frames;
}
