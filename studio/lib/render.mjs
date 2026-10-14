// Renders the Remotion compositions (reels, carousel slides, stories, profile pictures) with the local
// Chromium headless shell, then makes the final Reel encode with the system ffmpeg.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { HEADLESS_SHELL, PUBLIC, REEL, STUDIO, WORK } from './config.mjs';

let bundled = null;

/** Bundles the Remotion project once per process (the public folder is linked, not copied, into the bundle). */
export async function getBundle() {
  if (bundled) return bundled;
  const outDir = path.join(WORK, 'remotion-bundle');
  rmSync(outDir, { recursive: true, force: true });
  bundled = await bundle({ entryPoint: path.join(STUDIO, 'remotion', 'index.ts'), publicDir: PUBLIC, outDir, symlinkPublicDir: true, onProgress: () => undefined });
  return bundled;
}

const browser = { browserExecutable: HEADLESS_SHELL, chromiumOptions: { gl: 'swangle' } };

/** A free port for Remotion's file server, inside the range this studio may use (7952-7959). */
async function freePort() {
  for (let port = 7952; port <= 7959; port++) {
    const ok = await new Promise((resolve) => {
      const srv = net.createServer();
      srv.once('error', () => resolve(false));
      srv.listen(port, () => srv.close(() => resolve(true)));
    });
    if (ok) return port;
  }
  throw new Error('no free port in 7952-7959');
}

/** Options for each Remotion call: the local headless shell and a port from our range. */
const chromium = async () => ({ ...browser, port: await freePort() });

/** Renders the `Reel` composition for an EDL to a silent high-quality intermediate. */
export async function renderReelVideo(edl, file, { concurrency = Number(process.env.RENDER_CONCURRENCY ?? 3) } = {}) {
  const serveUrl = await getBundle();
  const inputProps = { ...edl, audio: undefined };
  const composition = await selectComposition({ serveUrl, id: 'Reel', inputProps, ...(await chromium()) });
  mkdirSync(path.dirname(file), { recursive: true });
  let last = 0;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: 'h264',
    crf: 12,
    pixelFormat: 'yuv420p',
    imageFormat: 'jpeg',
    jpegQuality: 95,
    muted: true,
    outputLocation: file,
    concurrency,
    timeoutInMilliseconds: 120_000,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 20);
      if (p !== last) {
        last = p;
        process.stdout.write(`  render ${edl.id}: ${Math.round(progress * 100)}%\r`);
      }
    },
    ...(await chromium()),
  });
  process.stdout.write('\n');
  return file;
}

/** Renders a still composition (Slide, Story frame, Profile) to a PNG. */
export async function renderStillPng(id, props, file, frame = 0) {
  const serveUrl = await getBundle();
  const composition = await selectComposition({ serveUrl, id, inputProps: props, ...(await chromium()) });
  mkdirSync(path.dirname(file), { recursive: true });
  await renderStill({ serveUrl, composition, inputProps: props, output: file, imageFormat: 'png', frame, ...(await chromium()) });
  return file;
}

/** Renders a (story) video composition with no audio to `file`. */
export async function renderVideo(id, props, file, { concurrency = 3 } = {}) {
  const serveUrl = await getBundle();
  const composition = await selectComposition({ serveUrl, id, inputProps: props, ...(await chromium()) });
  mkdirSync(path.dirname(file), { recursive: true });
  await renderMedia({ serveUrl, composition, inputProps: props, codec: 'h264', crf: 12, pixelFormat: 'yuv420p', imageFormat: 'jpeg', jpegQuality: 95, muted: true, outputLocation: file, concurrency, ...(await chromium()) });
  return file;
}

function run(args) {
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.slice(-2000)}`);
  return r.stderr;
}

/** Measures loudness (EBU R128) of an audio file for a two-pass loudnorm. */
function measureLoudness(audio, target) {
  const err = run(['-hide_banner', '-nostats', '-i', audio, '-af', `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}:print_format=json`, '-f', 'null', '-']);
  const json = err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1);
  return JSON.parse(json);
}

/**
 * The final Reel encode (research-tools.md, Meta's Reels spec): 1080x1920, H.264 High yuv420p, 30 fps,
 * GOP 60, max 20 Mbps, AAC 48 kHz 128 kbps stereo, moov atom first. The mixes from lib/mix.py are
 * already mastered to -14 LUFS with a look-ahead limiter (their dynamics kept), so the audio is only
 * encoded; `normalize: true` runs a two-pass loudnorm for audio that is not.
 */
export function finalEncode(video, audio, out, { lufs = -14, normalize = false } = {}) {
  mkdirSync(path.dirname(out), { recursive: true });
  const target = { I: lufs, TP: -1.5, LRA: 11 };
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', video];
  if (audio && existsSync(audio)) {
    let af = 'aresample=48000';
    if (normalize) {
      const m = measureLoudness(audio, target);
      af = `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
    }
    args.push('-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-af', af, '-c:a', 'aac', '-ar', String(REEL.audioRate), '-b:a', REEL.audioBitrate, '-ac', '2');
  } else {
    args.push('-f', 'lavfi', '-i', `anullsrc=r=${REEL.audioRate}:cl=stereo`, '-map', '0:v:0', '-map', '1:a:0', '-shortest', '-c:a', 'aac', '-ar', String(REEL.audioRate), '-b:a', REEL.audioBitrate);
  }
  args.push(
    '-vf',
    `scale=${REEL.width}:${REEL.height}:flags=lanczos,fps=${REEL.fps},format=yuv420p`,
    '-c:v',
    'libx264',
    '-profile:v',
    'high',
    '-preset',
    'slow',
    '-crf',
    '17',
    '-pix_fmt',
    'yuv420p',
    '-maxrate',
    REEL.maxrate,
    '-bufsize',
    REEL.bufsize,
    '-g',
    String(REEL.gop),
    '-keyint_min',
    String(REEL.fps),
    '-sc_threshold',
    '0',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-colorspace',
    'bt709',
    '-movflags',
    '+faststart',
    '-shortest',
    out,
  );
  run(args);
  return out;
}

/** Duration, size and stream facts of a finished file (for the report). */
export function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size,bit_rate:stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels,profile', '-of', 'json', file], { encoding: 'utf8' });
  return JSON.parse(r.stdout);
}
