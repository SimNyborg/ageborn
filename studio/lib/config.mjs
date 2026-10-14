// Studio paths and settings. Override with environment variables when the machine differs.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GAME_REPO = process.env.AGEBORN_REPO ?? '/home/user/ageborn';
/** The game's dev server (started by `scripts/server.mjs` or by hand: `npx vite --port 7951`). */
export const GAME_PORT = Number(process.env.AGEBORN_PORT ?? 7951);
export const GAME_URL = `http://127.0.0.1:${GAME_PORT}`;
export const CHROMIUM = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const HEADLESS_SHELL = process.env.HEADLESS_SHELL ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
export const WORK = path.join(STUDIO, 'work');
export const OUT = path.join(STUDIO, 'out');
export const ASSETS = path.join(STUDIO, 'assets');
/** Remotion's static folder (videos, mixes, fonts and art it reads at render time). */
export const PUBLIC = path.join(STUDIO, 'public');

/** Reel spec (research-tools.md, Meta's Reels spec): 1080x1920, H.264 yuv420p, 30 fps, AAC 48 kHz, faststart. */
export const REEL = { width: 1080, height: 1920, fps: 30, audioRate: 48000, audioBitrate: '128k', maxrate: '20M', bufsize: '20M', gop: 60 };
/** Text-safe area of a 1080x1920 frame (keep text out of the top 250, bottom 400 and right 120 px). */
export const SAFE = { top: 250, bottom: 400, right: 120, left: 60 };

/** Software WebGL flags: the container has no GPU. */
export const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'];
