/**
 * The narrator's lines with their English text (queue item 39), for `render.py`:
 * `npx tsx tools/audio/voice/list-lines.ts` prints them as JSON.
 *
 * The line list is data (`lines.json`: i18n keys). The text comes from `src/i18n/*.en.json` the way the game
 * reads it (`src/i18n/index.ts`: files in name order, nested keys joined with dots, the first file wins a
 * duplicate, `{name}` placeholders filled), so the i18n key stays the source of truth and a changed string
 * re-renders its line. `each` renders one line per filling of a placeholder whose values are i18n keys.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { voiceLineId } from '../../../src/audio/voiceLine';
import { content } from '../../../src/content';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const I18N = path.resolve(HERE, '../../../src/i18n');

export interface LineSpec {
  key: string;
  /** Placeholder name → the expansion that lists its values (i18n keys). */
  each?: Record<string, string>;
  where?: string;
}

export interface VoiceLine {
  /** `voiceLineId(key, vars)`: the manifest key and the file name's stem. */
  id: string;
  key: string;
  /** Placeholder name → i18n key of its value. */
  vars?: Record<string, string>;
  /** The English text the line says (what the subtitle shows). */
  text: string;
  where: string;
}

/** The expansions `each` may name: lists of i18n keys from the game content. */
export const EXPANSIONS: Readonly<Record<string, () => string[]>> = {
  /** Every released, visible Anti-heavy unit (the hint "Heavies! Send {card}." names the one in your tray). */
  antiArmorNames: () =>
    Object.values(content.units)
      .filter((u) => u.group === 'antiArmor' && !u.hidden && u.released !== false)
      .map((u) => u.nameKey),
};

/** The EN string table as the game builds it (`buildTables` in `src/i18n/index.ts`). */
export function englishStrings(dir: string = I18N): Record<string, string> {
  const out: Record<string, string> = {};
  const flatten = (obj: unknown, prefix: string): void => {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return;
    for (const k of Object.keys(obj).sort()) {
      const v = (obj as Record<string, unknown>)[k];
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') {
        if (!(key in out)) out[key] = v;
      } else if (v !== null && typeof v === 'object') flatten(v, key);
    }
  };
  for (const f of readdirSync(dir).sort()) if (/^[^.]+\.en\.json$/.test(f)) flatten(JSON.parse(readFileSync(path.join(dir, f), 'utf8')), '');
  return out;
}

/** `{name}` placeholders filled, as `interpolate` in `src/i18n/index.ts` does. */
function fill(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, name: string) => params[name] ?? m);
}

export function readSpecs(file: string = path.join(HERE, 'lines.json')): { lang: string; lines: LineSpec[] } {
  return JSON.parse(readFileSync(file, 'utf8')) as { lang: string; lines: LineSpec[] };
}

/** Every line to render, in list order (an `each` line once per value). Throws on an unknown key. */
export function listLines(specs: readonly LineSpec[] = readSpecs().lines, strings: Record<string, string> = englishStrings()): VoiceLine[] {
  const out: VoiceLine[] = [];
  const seen = new Set<string>();
  const text = (key: string): string => {
    const s = strings[key];
    if (s === undefined) throw new Error(`voice lines: no English string for "${key}"`);
    return s;
  };
  for (const spec of specs) {
    const template = text(spec.key);
    const names = Object.keys(spec.each ?? {});
    const fillings: Record<string, string>[] = [{}];
    for (const name of names) {
      const expansion = EXPANSIONS[spec.each![name]!];
      if (!expansion) throw new Error(`voice lines: unknown expansion "${spec.each![name]}" for ${spec.key}`);
      const values = expansion();
      fillings.splice(0, fillings.length, ...fillings.flatMap((f) => values.map((v) => ({ ...f, [name]: v }))));
    }
    for (const vars of fillings) {
      const said = fill(template, Object.fromEntries(Object.entries(vars).map(([n, k]) => [n, text(k)])));
      if (/\{\w+\}/.test(said)) throw new Error(`voice lines: "${spec.key}" still has a placeholder: ${said}`);
      const id = voiceLineId(spec.key, names.length ? vars : null);
      if (seen.has(id)) throw new Error(`voice lines: "${id}" is listed twice`);
      seen.add(id);
      out.push({ id, key: spec.key, ...(names.length ? { vars } : {}), text: said, where: spec.where ?? '' });
    }
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const specs = readSpecs();
  process.stdout.write(JSON.stringify({ lang: specs.lang, lines: listLines(specs.lines) }));
}
