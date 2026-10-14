// Edit helpers: build a Reel's EDL (for the Remotion `Reel` composition) and its audio mix spec
// (for lib/mix.py) together, from the recorded clips' sidecars, so picture and sound always line up.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { PUBLIC, WORK } from './config.mjs';

export function loadClip(reel, name) {
  const file = path.join(PUBLIC, 'clips', reel, `${name}.json`);
  const side = JSON.parse(readFileSync(file, 'utf8'));
  return {
    reel,
    name,
    sidecar: file,
    src: `clips/${reel}/${name}.mp4`,
    ...side,
    /** The frame of a named marker (throws when missing). */
    m(markerName) {
      const mk = side.markers.find((x) => x.name === markerName);
      if (!mk) throw new Error(`clip ${reel}/${name} has no marker "${markerName}" (has ${side.markers.map((x) => x.name).join(', ')})`);
      return mk.frame;
    },
    /** First frame (>= from) whose state satisfies `pred`, or -1. */
    find(pred, from = 0) {
      for (let k = from; k < side.states.length; k++) if (pred(side.states[k], k)) return k;
      return -1;
    },
    /** First frame with a sim event matching `pred`, or -1. */
    findEvent(pred, from = 0) {
      const e = side.events.find((x) => x.clipFrame >= from && pred(x.ev));
      return e ? e.clipFrame : -1;
    },
  };
}

export class Timeline {
  constructor(id, { fps = 30, bg = '#120e0a', grade } = {}) {
    this.id = id;
    this.fps = fps;
    this.bg = bg;
    this.grade = grade;
    this.t = 0;
    this.video = [];
    this.overlays = [];
    this.mix = { music: [], sfxFromClips: [], accents: [], duck: [], stems: [], config: {} };
    this.segments = [];
  }

  /** Seconds to frames. */
  f(sec) {
    return Math.round(sec * this.fps);
  }

  /**
   * Appends a piece of a clip from source frame `from` to `to` (exclusive) at the current end of the
   * timeline (or at `at`), with optional look settings. Its recorded game sounds go into the mix.
   * Returns { at, dur, end, clip, from, map(srcFrame) -> output frame }.
   */
  add(clip, from, to, o = {}) {
    const rate = o.rate ?? 1;
    const at = o.at ?? this.t;
    const dur = o.dur ?? Math.max(1, Math.round((to - from) / rate));
    const seg = { src: clip.src, at, dur, from, rate, ...o.look };
    delete seg.sfx;
    this.video.push(seg);
    if (o.sfx !== false) {
      this.mix.sfxFromClips.push({ sidecar: clip.sidecar, at: at / this.fps, from, dur: dur / this.fps, rate, gainDb: o.sfxDb ?? 0, ...(o.sfxOnly ? { only: o.sfxOnly } : {}), ...(o.sfxExclude ? { exclude: o.sfxExclude } : {}) });
    }
    if (o.at === undefined) this.t = at + dur;
    const out = { at, dur, end: at + dur, clip, from, to, map: (src) => at + Math.round((src - from) / rate) };
    this.segments.push(out);
    return out;
  }

  /** Adds an overlay at output frame `at` for `dur` frames. */
  overlay(type, at, dur, props = {}) {
    this.overlays.push({ type, at: Math.max(0, Math.round(at)), dur: Math.max(1, Math.round(dur)), ...props });
  }

  /** A per-output-frame series for [at, at+dur) from the clip's states (for bars and counters). */
  series(seg, at, dur, fn) {
    const out = [];
    for (let k = 0; k < dur; k++) {
      const of = at + k;
      // which segment shows this output frame?
      const s = this.segments.find((x) => of >= x.at && of < x.end) ?? seg;
      const src = Math.min(s.clip.states.length - 1, Math.max(0, s.from + Math.round((of - s.at) * (this.video.find((v) => v.at === s.at)?.rate ?? 1))));
      out.push(fn(s.clip.states[src], s.clip, src));
    }
    return out;
  }

  /** A game sound placed by hand (title slams, whooshes). */
  accent(id, atFrame, o = {}) {
    this.mix.accents.push({ id, at: atFrame / this.fps, ...o });
  }

  music(cue, atFrame, durFrames, o = {}) {
    this.mix.music.push({ cue, at: atFrame / this.fps, dur: durFrames / this.fps, ...o });
  }

  duck(atFrame, durFrames, db = -8) {
    this.mix.duck.push({ at: atFrame / this.fps, dur: durFrames / this.fps, db });
  }

  /** Writes edl.json and mix.json to work/<id>/ and returns their paths. */
  write({ duration, endFade = 0.6, narration = null } = {}) {
    const durationInFrames = duration ?? this.t;
    const dir = path.join(WORK, this.id);
    mkdirSync(dir, { recursive: true });
    const edl = { id: this.id, fps: this.fps, width: 1080, height: 1920, durationInFrames, bg: this.bg, grade: this.grade, audio: { src: `audio/${this.id}.wav` }, video: this.video, overlays: this.overlays };
    const mix = { ...this.mix, duration: durationInFrames / this.fps, fadeOut: endFade, ...(narration ? { narration } : {}) };
    writeFileSync(path.join(dir, 'edl.json'), JSON.stringify(edl, null, 1));
    writeFileSync(path.join(dir, 'mix.json'), JSON.stringify(mix, null, 1));
    return { edl: path.join(dir, 'edl.json'), mix: path.join(dir, 'mix.json'), durationInFrames };
  }
}

/**
 * The battle music's grid: every age's track is in 4/4 at 110 BPM, the first beat at 0.3 s, in 4-bar
 * phrases (8.727 s, the length of the intensity stems); A starts at 9.03 s, the peak at 35.2 s, the
 * breakdown at 70.1 s (measured with tools/music_profile.py). The tracks share this form, so a cut
 * from one age's music to the next on a bar line stays in time.
 */
export const MUSIC = { bpm: 110, beat: 60 / 110, bar: 240 / 110, phrase: 960 / 110, start: 0.3, sectionA: 0.3 + 960 / 110, peak: 0.3 + (4 * 960) / 110, breakdown: 0.3 + (8 * 960) / 110 };

/** Music time (s) of bar `n` (0-based) from the first beat. */
export function barAt(n) {
  return MUSIC.start + n * MUSIC.bar;
}
