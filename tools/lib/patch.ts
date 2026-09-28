/**
 * Content patches for data-only experiments (DESIGN B12 `--patch <file>`, A16.4 step 1).
 *
 * A patch is a JSON object deep-merged over the compiled content: plain objects merge key by key,
 * everything else (numbers, arrays, null) replaces. `sim-cli` resolves `--patch` into the
 * `AGEBORN_PATCH` environment variable, so worker threads (which inherit the environment) play the
 * same patched content as the main thread. The patched content gets its own hash (`<hash>+<patch>`),
 * so a report never passes for the unpatched game.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { CompiledContent } from '../../src/contracts';
import { content as gameContent } from '../../src/content';
import { fnv1a32 } from '../../src/core';

export const PATCH_ENV = 'AGEBORN_PATCH';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const isPlain = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Deep merge: objects merge, anything else replaces. Returns fresh objects along the patched paths. */
export function mergePatch<T>(base: T, patch: unknown): T {
  if (!isPlain(patch) || !isPlain(base)) return patch as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) out[k] = k in out ? mergePatch(out[k], v) : v;
  return out as T;
}

/** Applies a patch to compiled content; the hash records the patch. */
export function applyPatch(content: CompiledContent, patch: Json, label: string): CompiledContent {
  const merged = mergePatch(content, patch);
  const tag = fnv1a32(JSON.stringify(patch)).toString(16).padStart(8, '0');
  return Object.freeze({ ...merged, hash: `${content.hash}+${label || tag}` });
}

let cached: { file: string; content: CompiledContent } | null = null;

/** The game content with the `AGEBORN_PATCH` file applied (the plain game content when unset). */
export function patchedGameContent(): CompiledContent {
  const file = process.env[PATCH_ENV];
  if (!file) return gameContent;
  if (cached?.file === file) return cached.content;
  const patch = JSON.parse(readFileSync(file, 'utf8')) as Json;
  const content = applyPatch(gameContent, patch, path.basename(file, path.extname(file)));
  cached = { file, content };
  return content;
}
