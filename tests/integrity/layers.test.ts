/**
 * The import-layer graph obeys DESIGN B2 (B13 Integrity).
 *
 * ESLint's `ageborn/layers` rule checks each file as it is linted; this test checks the whole graph at
 * once with the same `LAYER_RULES` table (imported from eslint.config.js): every import edge of every
 * production file, including `import()` and `import.meta.glob`, every src folder being a known layer, the
 * table matching the B2 table in DESIGN.md, an acyclic layer graph, and a production entry that never
 * statically reaches the contract fakes or test code.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { importsOf, isTestFile, layerOf, packageOf, productionFiles, rel, resolveSpec, ROOT, SRC, type ImportRef } from './helpers/source';

interface LayerRule {
  layers: string[] | '*';
  packages: string[] | '*';
}

let LAYER_RULES: Record<string, LayerRule>;
let DETERMINISTIC_LAYERS: string[];

beforeAll(async () => {
  const mod = (await import(pathToFileURL(path.join(ROOT, 'eslint.config.js')).href)) as {
    LAYER_RULES: Record<string, LayerRule>;
    DETERMINISTIC_LAYERS: string[];
  };
  LAYER_RULES = mod.LAYER_RULES;
  DETERMINISTIC_LAYERS = mod.DETERMINISTIC_LAYERS;
});

/**
 * Edges the layer table forbids but a work package decision allows, with the reason. Keep this list
 * short; every entry needs a line in docs/decisions.md.
 */
const ALLOWED_EXCEPTIONS: { from: string; spec: string; why: string }[] = [
  { from: 'src/contracts/fakes/art.ts', spec: 'pixi.js', why: 'WP0: the fake ArtProvider draws Pixi rectangles; fakes are test and dev helpers only' },
];

function violation(ref: ImportRef, rules: Record<string, LayerRule>): string | null {
  const own = layerOf(ref.from);
  const rule = own ? rules[own] : undefined;
  if (!own || !rule) return null;
  const where = `${rel(ref.from)}:${ref.line} -> ${ref.spec}`;
  const target = resolveSpec(ref.spec, ref.from);
  if (target === null) {
    if (ref.spec.startsWith('node:')) return rule.packages === '*' ? null : `${where}: layer "${own}" may not import Node built-ins`;
    if (rule.packages === '*') return null;
    const pkg = packageOf(ref.spec);
    return rule.packages.includes(pkg) ? null : `${where}: layer "${own}" may not import package "${pkg}"`;
  }
  const to = layerOf(target);
  if (to === null) {
    const inSrc = !path.relative(SRC, target).startsWith('..');
    if (rule.layers === '*' || inSrc) return null;
    return `${where}: layer "${own}" may not import files outside src`;
  }
  if (to === own || rule.layers === '*' || rule.layers.includes(to)) return null;
  return `${where}: layer "${own}" may not import layer "${to}"`;
}

describe('import layers (DESIGN B2)', () => {
  const files = productionFiles();
  const refs = files.flatMap((f) => importsOf(f));

  it('scans the whole source tree', () => {
    expect(files.length).toBeGreaterThan(50);
    expect(refs.length).toBeGreaterThan(files.length);
  });

  it('every import edge of production code obeys LAYER_RULES', () => {
    const bad = refs
      .map((r) => violation(r, LAYER_RULES))
      .filter((v): v is string => v !== null)
      .filter((v) => !ALLOWED_EXCEPTIONS.some((e) => v.startsWith(`${e.from}:`) && v.includes(`-> ${e.spec}:`)));
    expect(bad).toEqual([]);
  });

  it('the documented exceptions still exist (remove stale ones)', () => {
    for (const e of ALLOWED_EXCEPTIONS) {
      expect(refs.some((r) => rel(r.from) === e.from && r.spec === e.spec), `${e.from} -> ${e.spec}`).toBe(true);
    }
  });

  it('the checker catches a forbidden edge', () => {
    const fake = (from: string, spec: string): ImportRef => ({ from: path.join(ROOT, from), spec, kind: 'static', line: 1 });
    expect(violation(fake('src/sim/x.ts', 'pixi.js'), LAYER_RULES)).toMatch(/package "pixi.js"/);
    expect(violation(fake('src/sim/x.ts', '@/render/battleView'), LAYER_RULES)).toMatch(/layer "render"/);
    expect(violation(fake('src/ui/x.ts', '../../tests/fixtures/content'), LAYER_RULES)).toMatch(/outside src/);
    expect(violation(fake('src/core/x.ts', 'node:fs'), LAYER_RULES)).toMatch(/Node built-ins/);
    expect(violation(fake('src/meta/x.ts', '@/content'), LAYER_RULES)).toBeNull();
    expect(violation(fake('src/dev/x.tsx', '../../ai/index.ts'), LAYER_RULES)).toBeNull();
  });

  it('every folder in src is a layer of the table', () => {
    const dirs = readdirSync(SRC).filter((d) => statSync(path.join(SRC, d)).isDirectory());
    expect(dirs.filter((d) => !(d in LAYER_RULES))).toEqual([]);
  });

  it('LAYER_RULES matches the B2 table in DESIGN.md', () => {
    const design = readFileSync(path.join(ROOT, 'docs', 'DESIGN.md'), 'utf8');
    const start = design.indexOf('**Allowed imports**');
    const table = design.slice(start, design.indexOf('**Determinism lint.**', start));
    const rows = [...table.matchAll(/^\| `(\w+)` \| (.+) \|$/gm)];
    const layers = Object.keys(LAYER_RULES);
    expect(rows.map((r) => r[1]).sort()).toEqual([...layers].sort());
    for (const [, layer, cell] of rows) {
      const rule = LAYER_RULES[layer as string] as LayerRule;
      if (/everything/.test(cell as string)) {
        expect(rule.layers, layer).toBe('*');
        continue;
      }
      const named = (cell as string)
        .split(/[,;]/)
        .map((t) => t.trim().split(/[\s(]/)[0] as string)
        .filter((t) => layers.includes(t));
      expect([...(rule.layers as string[])].sort(), layer).toEqual(named.sort());
    }
  });

  it('the layer graph has no cycles outside app and dev', () => {
    const edges = new Map<string, string[]>();
    for (const [layer, rule] of Object.entries(LAYER_RULES)) if (rule.layers !== '*') edges.set(layer, rule.layers);
    const state = new Map<string, 'open' | 'done'>();
    const cycle: string[] = [];
    const visit = (n: string, trail: string[]): void => {
      if (state.get(n) === 'done') return;
      if (state.get(n) === 'open') {
        cycle.push([...trail, n].join(' -> '));
        return;
      }
      state.set(n, 'open');
      for (const m of edges.get(n) ?? []) visit(m, [...trail, n]);
      state.set(n, 'done');
    };
    for (const n of edges.keys()) visit(n, []);
    expect(cycle).toEqual([]);
  });

  it('deterministic layers only reach deterministic layers', () => {
    for (const layer of DETERMINISTIC_LAYERS) {
      const rule = LAYER_RULES[layer] as LayerRule;
      expect(rule.layers).not.toBe('*');
      for (const dep of rule.layers as string[]) expect(['contracts', ...DETERMINISTIC_LAYERS], `${layer} -> ${dep}`).toContain(dep);
      expect(rule.packages === '*' ? ['*'] : rule.packages.filter((p) => ['pixi.js', 'preact', '@preact/signals'].includes(p)), layer).toEqual([]);
    }
  });

  it('the production entry never statically reaches the contract fakes or test code', () => {
    const entry = path.join(SRC, 'app', 'main.tsx');
    const seen = new Set<string>([entry]);
    const queue = [entry];
    const offenders: string[] = [];
    while (queue.length > 0) {
      const f = queue.shift() as string;
      for (const r of importsOf(f)) {
        if (r.kind !== 'static') continue;
        const target = resolveSpec(r.spec, f);
        if (!target || !/\.(tsx?|json)$/.test(target) || seen.has(target)) continue;
        seen.add(target);
        const rt = rel(target);
        if (rt.startsWith('src/contracts/fakes/') || isTestFile(target) || rt.startsWith('tests/')) offenders.push(`${rel(f)} -> ${rt}`);
        if (/\.tsx?$/.test(target)) queue.push(target);
      }
    }
    expect(seen.size).toBeGreaterThan(20);
    expect(offenders).toEqual([]);
  });
});
