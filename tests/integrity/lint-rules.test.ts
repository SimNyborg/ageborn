/**
 * Proves the layer and determinism lint rules in eslint.config.js actually fire (DESIGN B2, B3).
 * Each case lints a small virtual file at a path inside a layer; no fixture files are written.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: ROOT });
});

/** Lint `code` as if it lived at `file` (repo-relative) and return the rule ids that fired. */
async function ruleIds(file: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, file) });
  return (result?.messages ?? []).map((m) => m.ruleId ?? `fatal: ${m.message}`);
}

describe('layer rules (DESIGN B2)', () => {
  it('sim may not import pixi.js', async () => {
    const ids = await ruleIds('src/sim/lintFixture.ts', "import { Container } from 'pixi.js';\nexport const c = Container;\n");
    expect(ids).toContain('ageborn/layers');
  });

  it('sim may not import preact or another layer', async () => {
    expect(await ruleIds('src/sim/lintFixture.ts', "export { h } from 'preact';\n")).toContain('ageborn/layers');
    expect(await ruleIds('src/sim/lintFixture.ts', "export * from '@/render/battleView';\n")).toContain('ageborn/layers');
    expect(await ruleIds('src/sim/lintFixture.ts', "export * from '../content/raw';\n")).toContain('ageborn/layers');
  });

  it('core may not import Node built-ins', async () => {
    expect(await ruleIds('src/core/lintFixture.ts', "export { readFileSync } from 'node:fs';\n")).toContain('ageborn/layers');
  });

  it('allowed imports pass', async () => {
    expect(await ruleIds('src/sim/lintFixture.ts', "export type { Side } from '@/contracts';\nexport { fnv1a32 } from '@/core/hash';\n")).toEqual([]);
    expect(await ruleIds('src/visuals/lintFixture.ts', "export { Container } from 'pixi.js';\n")).toEqual([]);
  });
});

describe('determinism rules (DESIGN B2, B3)', () => {
  const sim = 'src/sim/lintFixture.ts';

  it('bans Math.random, Date and float trig in sim', async () => {
    expect(await ruleIds(sim, 'export const r = Math.random();\n')).toContain('no-restricted-properties');
    expect(await ruleIds(sim, 'export const s = Math.sin(1);\n')).toContain('no-restricted-properties');
    expect(await ruleIds(sim, 'export const t = Date.now();\n')).toContain('no-restricted-globals');
  });

  it('bans float literals and for...in in sim', async () => {
    expect(await ruleIds(sim, 'export const f = 1.5;\n')).toContain('no-restricted-syntax');
    expect(await ruleIds(sim, 'export function k(o: object): void {\n  for (const x in o) void x;\n}\n')).toContain(
      'no-restricted-syntax',
    );
  });

  it('applies to every deterministic layer and not to render', async () => {
    for (const layer of ['ai', 'meta', 'core', 'content']) {
      expect(await ruleIds(`src/${layer}/lintFixture.ts`, 'export const r = Math.random();\n')).toContain(
        'no-restricted-properties',
      );
    }
    expect(await ruleIds('src/render/lintFixture.ts', 'export const r = Math.random() * 1.5;\n')).toEqual([]);
  });

  it('raw content may keep table floats', async () => {
    expect(await ruleIds('src/content/raw/lintFixture.ts', 'export const p = 1.35;\n')).toEqual([]);
  });
});
