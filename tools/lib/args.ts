/**
 * A tiny argv parser for the tools: `--key value`, `--key=value`, `--flag`, `--no-flag` and positionals.
 */
export interface Args {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: readonly string[]): Args {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] as string;
    if (a === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const body = a.slice(2);
    const eq = body.indexOf('=');
    if (eq >= 0) {
      flags[body.slice(0, eq)] = body.slice(eq + 1);
    } else if (body.startsWith('no-')) {
      flags[body.slice(3)] = false;
    } else {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[body] = next;
        i += 1;
      } else {
        flags[body] = true;
      }
    }
  }
  return { positional, flags };
}

/** A string flag, or `fallback` when absent. */
export function str(a: Args, key: string, fallback: string): string {
  const v = a.flags[key];
  return typeof v === 'string' ? v : fallback;
}

/** An integer flag; throws on a malformed value so typos are never silently ignored. */
export function int(a: Args, key: string, fallback: number): number {
  const v = a.flags[key];
  if (v === undefined || typeof v === 'boolean') return fallback;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new Error(`--${key} expects an integer, got "${v}"`);
  return n;
}

/** A boolean flag (`--x`, `--x=true`, `--no-x`). */
export function bool(a: Args, key: string, fallback: boolean): boolean {
  const v = a.flags[key];
  if (v === undefined) return fallback;
  if (typeof v === 'boolean') return v;
  return v !== 'false' && v !== '0';
}

/** A comma-separated list flag (empty when absent). */
export function list(a: Args, key: string): string[] {
  const v = a.flags[key];
  if (typeof v !== 'string') return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}
