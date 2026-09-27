/**
 * Gallery URL state. Everything the gallery shows is addressable from the hash, so a URL is a
 * reproducible review sheet and a stable screenshot target:
 *
 *   ?dev=1#gallery/section=units&age=stone&clip=attack&preset=highContrast&t=300
 *
 * `t` freezes every animation at that many ms after the section starts (deterministic screenshots).
 */
import { useEffect, useState } from 'preact/hooks';

export type Params = URLSearchParams;

export function readParams(): URLSearchParams {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  const i = hash.indexOf('/');
  return new URLSearchParams(i < 0 ? '' : hash.slice(i + 1));
}

export function writeParams(patch: Record<string, string | null>): void {
  const p = readParams();
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === '') p.delete(k);
    else p.set(k, v);
  }
  const s = p.toString();
  window.location.hash = s ? `gallery/${s}` : 'gallery';
}

/** The current hash params, re-read on every hash change. */
export function useParams(): URLSearchParams {
  const [p, setP] = useState(readParams());
  useEffect(() => {
    const on = (): void => setP(readParams());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return p;
}

export function get(p: URLSearchParams, key: string, fallback: string): string {
  return p.get(key) ?? fallback;
}

/** Numbers from the hash (NaN-safe). */
export function num(p: URLSearchParams, key: string, fallback: number): number {
  const v = Number(p.get(key));
  return p.has(key) && Number.isFinite(v) ? v : fallback;
}

/** Data published for automation (e2e and screenshot tests read `window.__galleryInfo`). */
export function publish(key: string, value: unknown): void {
  const w = window as unknown as { __galleryInfo?: Record<string, unknown> };
  w.__galleryInfo = { ...(w.__galleryInfo ?? {}), [key]: value };
}

export const ui = {
  font: 'ui-monospace, Menlo, Consolas, monospace',
  bg: '#1b1a2e',
  panel: '#26243d',
  ink: '#f4ecd8',
  dim: '#a39fb8',
  accent: '#f2c14e',
  good: '#7fe0a8',
  bad: '#ff7a8a',
} as const;
