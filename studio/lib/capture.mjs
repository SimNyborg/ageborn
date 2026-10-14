// Records frame-exact clips from the game's dev capture page (`?dev=1#capture`, window.__capture).
//
// A session opens the page in Chromium (software WebGL), and a clip pipes every drawn frame as a PNG
// straight into ffmpeg (no frame files on disk). Each clip also writes a JSON sidecar: the state after
// every frame (camera, base health, ages, unit counts), the sim events and the game's sound calls with
// their clip time, and named markers a shot script sets (for titles, slow motion and the audio mix).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { CHROMIUM, GAME_URL, GL_ARGS } from './config.mjs';

export async function launch() {
  return chromium.launch({ executablePath: CHROMIUM, args: GL_ARGS });
}

/** Spawns ffmpeg reading PNG frames from stdin into a high-quality intermediate (H.264 4:4:4, CRF 10). */
function frameEncoder(file, fps) {
  mkdirSync(path.dirname(file), { recursive: true });
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '10', '-pix_fmt', 'yuv444p', '-g', String(fps), '-movflags', '+faststart', file];
  const p = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => {
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code} for ${file}`))));
  });
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

export class CaptureSession {
  constructor(browser, page, opts) {
    this.browser = browser;
    this.page = page;
    this.opts = opts;
    this.clip = null;
    this.frameMs = 1000 / (opts.fps ?? 30);
  }

  /**
   * Opens the capture page. `query`: the page's URL options (`left=stone&right=cosmic&seed=3`), `width` x
   * `height` CSS px at `dpr` (the output is width*dpr x height*dpr).
   */
  static async open({ query, width = 540, height = 960, dpr = 2, fps = 30, browser = null }) {
    const b = browser ?? (await launch());
    const page = await b.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
    page.on('pageerror', (e) => console.error('[page error]', e.message));
    page.on('console', (m) => {
      const t = m.text();
      if (m.type() === 'error' && !t.includes('GL Driver')) console.error('[page console]', t.slice(0, 300));
    });
    await page.goto(`${GAME_URL}/?dev=1&fps=${fps}&${query}#capture`);
    await page.waitForFunction(() => !!window.__capture, null, { timeout: 180_000 });
    const s = new CaptureSession(browser ? null : b, page, { query, width, height, dpr, fps });
    s.state0 = await page.evaluate(() => window.__capture.whenReady());
    return s;
  }

  async close() {
    await this.page.close();
    if (this.browser) await this.browser.close();
  }

  // --- passthrough to the page -------------------------------------------------------------------
  eval(fn, arg) {
    return this.page.evaluate(fn, arg);
  }
  camera(shot) {
    return this.eval((s) => window.__capture.camera(s), shot);
  }
  timeScale(s, rampMs = 0) {
    return this.eval(([a, b]) => window.__capture.setTimeScale(a, b), [s, rampMs]);
  }
  skip(ms) {
    return this.eval((m) => window.__capture.skip(m), ms);
  }
  state() {
    return this.eval(() => window.__capture.state());
  }
  units(filter) {
    return this.eval((f) => window.__capture.units(f), filter ?? {});
  }
  issue(cmd) {
    return this.eval((c) => window.__capture.issue(c), cmd);
  }
  hold(cards) {
    return this.eval((c) => window.__capture.hold(c), cards);
  }
  bots(on) {
    return this.eval((o) => window.__capture.bots(o), on);
  }
  /** `dev(name, ...args)`: the page's staging helpers (spawn, gold, xp, evolve, baseBp, turret, fort, power, clear). */
  dev(name, ...args) {
    return this.eval(([n, a]) => window.__capture.dev[n](...a), [name, args]);
  }
  /** Spawns `n` of a card for a side from own-side progress `p0` (lu), `gap` lu apart; returns the ids. */
  async army(side, card, n, p0, gap, level) {
    await this.hold([card]);
    return this.eval(
      ([s, c, k, p, g, l]) => {
        const ids = [];
        for (let i = 0; i < k; i++) ids.push(window.__capture.dev.spawn(s, c, p + i * g, l ?? undefined));
        return ids;
      },
      [side, card, n, p0, gap, level ?? null],
    );
  }

  // --- clips -------------------------------------------------------------------------------------
  /** Starts recording a clip into `file` (an .mp4); everything stepped from now on is in it. */
  async startClip(file, meta = {}) {
    if (this.clip) throw new Error('a clip is already recording');
    const st = await this.state();
    await this.eval(() => {
      window.__capture.drainEvents();
      window.__capture.drainSounds();
    });
    this.clip = { file, enc: frameEncoder(file, this.opts.fps), startFrame: st.frame, frames: [], events: [], sounds: [], markers: [], meta, t0: Date.now() };
    return st;
  }

  /** Records `n` frames; `onFrame(state, k)` runs after each (it may await camera changes). */
  async frames(n, onFrame) {
    const c = this.clip;
    if (!c) throw new Error('no clip recording');
    for (let i = 0; i < n; i++) {
      const res = await this.page.evaluate(async (watch) => {
        const st = await window.__capture.step(1);
        const png = window.__capture.snap('image/png');
        if (watch) st.watched = window.__capture.units(watch);
        return { st, png, ev: window.__capture.drainEvents(), snd: window.__capture.drainSounds() };
      }, this.watchFilter ?? null);
      await c.enc.write(Buffer.from(res.png.slice(res.png.indexOf(',') + 1), 'base64'));
      const k = c.frames.length;
      c.frames.push(res.st);
      for (const e of res.ev) c.events.push({ ...e, clipFrame: e.frame - c.startFrame, clipT: (e.frame - c.startFrame) / this.opts.fps });
      for (const s of res.snd) c.sounds.push({ ...s, clipFrame: s.frame - c.startFrame, clipT: (s.frame - c.startFrame) / this.opts.fps });
      if (onFrame) await onFrame(res.st, k, res.ev);
      if ((k + 1) % 30 === 0) {
        const secs = (Date.now() - c.t0) / 1000;
        process.stdout.write(`  ${path.basename(c.file)}: ${k + 1} frames (${(secs / (k + 1)).toFixed(2)} s/frame)\r`);
      }
    }
  }

  /** Records frames until `pred(state, events)` is true (or `max` frames); returns the frames recorded. */
  async until(pred, max = 900, onFrame) {
    let n = 0;
    let done = false;
    while (!done && n < max) {
      await this.frames(1, async (st, k, ev) => {
        if (onFrame) await onFrame(st, k, ev);
        done = pred(st, ev);
      });
      n++;
    }
    return n;
  }

  /** Records these units' positions and health with every frame (`state.watched`): `{ cards, ids, side }`. */
  watch(filter) {
    this.watchFilter = filter;
  }

  /** The current clip frame (frames recorded so far). */
  get frame() {
    return this.clip ? this.clip.frames.length : 0;
  }

  /** Names this moment of the clip (titles, slow motion, audio accents read the markers). */
  mark(name, data = {}) {
    if (!this.clip) throw new Error('no clip recording');
    this.clip.markers.push({ name, frame: this.clip.frames.length, t: this.clip.frames.length / this.opts.fps, ...data });
  }

  /** Finishes the clip: closes the video and writes `<file>.json`. Returns the sidecar. */
  async endClip() {
    const c = this.clip;
    if (!c) throw new Error('no clip recording');
    this.clip = null;
    await c.enc.close();
    const info = await this.eval(() => window.__capture.info());
    const sidecar = {
      file: path.basename(c.file),
      fps: this.opts.fps,
      width: info.width * info.dpr,
      height: info.height * info.dpr,
      frames: c.frames.length,
      seconds: c.frames.length / this.opts.fps,
      query: this.opts.query,
      meta: c.meta,
      markers: c.markers,
      states: c.frames,
      events: c.events,
      sounds: c.sounds,
    };
    writeFileSync(c.file.replace(/\.mp4$/, '.json'), JSON.stringify(sidecar));
    process.stdout.write(`\n  ${path.basename(c.file)}: ${c.frames.length} frames in ${((Date.now() - c.t0) / 1000).toFixed(0)} s\n`);
    return sidecar;
  }
}
