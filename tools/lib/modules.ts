/**
 * Loads the packages the tools drive, through their contracts only (DESIGN B15), with a clear fallback
 * when a package is not built yet (Phase 1 builds WP2, WP3 and WP7 in parallel):
 *
 * - bots: `createBot` from `src/ai` (WP3, `CreateBot` contract). Without it the tools seat the
 *   `balanced` scripted proxy instead and every report says so.
 * - meta: a `Meta` implementation from `src/meta` (WP7). Without it `economy` and `drops` skip.
 *
 * Imports go through a computed URL so TypeScript does not need the package to exist at compile time.
 * Set `AGEBORN_BOTS=fallback` to force the scripted stand-in bot.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { BotController, BotProfile, CompiledContent, CreateBot, FormatId, Meta, Side } from '../../src/contracts';
import { createProxy } from '../proxies';

export interface BotRequest {
  generalId: string;
  tier: number;
  side: Side;
  seed: number;
  format: FormatId;
}

export interface BotFactory {
  /** Where the bots come from; reports print it. */
  source: 'src/ai' | 'fallback';
  /** Why the fallback is used. */
  reason: string | null;
  create(content: CompiledContent, r: BotRequest): BotController;
}

const AI_ENTRY = new URL('../../src/ai/index.ts', import.meta.url);
const META_ENTRY = new URL('../../src/meta/index.ts', import.meta.url);

const BALANCED_WEIGHTS: BotProfile['weights'] = { aggr: 50, turret: 50, economy: 50, greed: 50, patience: 50, legendary: 50, hold: 50 };

type ProfileBuilder = (content: CompiledContent, o: { generalId: string; tier: number }) => BotProfile;

async function importIfPresent(url: URL): Promise<{ mod: Record<string, unknown> | null; reason: string | null }> {
  const file = fileURLToPath(url);
  if (!existsSync(file)) return { mod: null, reason: `${file.replace(/^.*\/src\//, 'src/')} does not exist yet` };
  try {
    return { mod: (await import(url.href)) as Record<string, unknown>, reason: null };
  } catch (e) {
    return { mod: null, reason: `loading ${url.pathname.replace(/^.*\/src\//, 'src/')} failed: ${String(e)}` };
  }
}

function fallbackBots(reason: string): BotFactory {
  return {
    source: 'fallback',
    reason,
    create: (content, r) => createProxy('balanced', content, r.side, r.seed, r.format),
  };
}

let botsPromise: Promise<BotFactory> | null = null;

/** The bot factory, loaded once per process. */
export function loadBots(): Promise<BotFactory> {
  botsPromise ??= (async (): Promise<BotFactory> => {
    if (process.env['AGEBORN_BOTS'] === 'fallback') return fallbackBots('AGEBORN_BOTS=fallback');
    const { mod, reason } = await importIfPresent(AI_ENTRY);
    if (!mod) return fallbackBots(reason ?? 'unknown');
    const createBot = mod['createBot'] as CreateBot | undefined;
    if (typeof createBot !== 'function') return fallbackBots('src/ai has no createBot export');
    const builder = typeof mod['botProfile'] === 'function' ? (mod['botProfile'] as ProfileBuilder) : null;
    return {
      source: 'src/ai',
      reason: null,
      create(content, r) {
        const profile: BotProfile = builder
          ? builder(content, { generalId: r.generalId, tier: r.tier })
          : { generalId: r.generalId, tier: r.tier, mistakeBonusBp: 0, weights: { ...BALANCED_WEIGHTS }, openings: [] };
        return createBot(profile, r.side, r.seed, content);
      },
    };
  })();
  return botsPromise;
}

const META_METHODS = ['newSave', 'applyMatchResult', 'grantCapsule', 'openCapsule', 'openWardrobe', 'upgrade', 'pickOpponent', 'tickTimers', 'claimRoadNode'] as const;

function isMeta(x: unknown): x is Meta {
  if (x === null || (typeof x !== 'object' && typeof x !== 'function')) return false;
  const o = x as Record<string, unknown>;
  return META_METHODS.every((k) => typeof o[k] === 'function');
}

export interface MetaLoad {
  meta: Meta | null;
  reason: string | null;
}

/**
 * The `Meta` implementation of `src/meta`: an exported `meta` object, a `createMeta()` factory, or the
 * module's own named functions (whichever satisfies the contract).
 */
export async function loadMeta(): Promise<MetaLoad> {
  const { mod, reason } = await importIfPresent(META_ENTRY);
  if (!mod) return { meta: null, reason: `${reason ?? 'unknown'} (WP7 meta rules)` };
  if (isMeta(mod['meta'])) return { meta: mod['meta'], reason: null };
  if (typeof mod['createMeta'] === 'function') {
    const m = (mod['createMeta'] as () => unknown)();
    if (isMeta(m)) return { meta: m, reason: null };
  }
  if (isMeta(mod)) return { meta: mod, reason: null };
  return { meta: null, reason: `src/meta does not export a Meta (need ${META_METHODS.join(', ')})` };
}
