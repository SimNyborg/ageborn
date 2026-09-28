// ESLint flat config for Ageborn.
// Layer rules (DESIGN B2) and determinism rules (DESIGN B2/B3) live here.
// The same LAYER_RULES table is exported so tests/integrity can reuse it for the import-graph test.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');

/**
 * Which src layers and npm packages each layer may import (DESIGN B2).
 * `layers: '*'` and `packages: '*'` mean everything.
 * A layer may always import its own files.
 */
export const LAYER_RULES = {
  contracts: { layers: [], packages: [] },
  core: { layers: ['contracts'], packages: [] },
  i18n: { layers: ['contracts'], packages: [] },
  content: { layers: ['contracts', 'core'], packages: ['valibot'] },
  sim: { layers: ['contracts', 'core'], packages: [] },
  ai: { layers: ['contracts', 'core'], packages: [] },
  meta: { layers: ['contracts', 'core', 'content'], packages: [] },
  save: { layers: ['contracts', 'core'], packages: ['valibot', 'fflate'] },
  visuals: { layers: ['contracts', 'core'], packages: ['pixi.js'] },
  audio: { layers: ['contracts', 'core'], packages: [] },
  render: { layers: ['contracts', 'core'], packages: ['pixi.js'] },
  ui: { layers: ['contracts', 'core', 'content', 'i18n'], packages: ['preact', '@preact/signals'] },
  capsule: { layers: ['contracts', 'core', 'i18n'], packages: ['pixi.js', 'preact', '@preact/signals'] },
  tutorial: { layers: ['contracts', 'core', 'i18n'], packages: [] },
  platform: { layers: ['contracts'], packages: [] },
  app: { layers: '*', packages: '*' },
  dev: { layers: '*', packages: '*' },
};

/** Layers whose code must be pure and deterministic (DESIGN B2, B3). */
export const DETERMINISTIC_LAYERS = ['sim', 'ai', 'meta', 'core', 'content'];

const TEST_FILES = ['**/*.test.ts', '**/*.test.tsx', '**/*.bench.ts', '**/test/**', '**/__tests__/**'];

function packageName(spec) {
  if (spec.startsWith('@')) return spec.split('/').slice(0, 2).join('/');
  return spec.split('/')[0];
}

/** Resolve an import specifier to its src layer, or null when it is outside src. */
function layerOfTarget(spec, filename) {
  let abs;
  if (spec.startsWith('@/')) abs = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) abs = path.resolve(path.dirname(filename), spec);
  else return undefined; // bare package
  const rel = path.relative(SRC, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.split(path.sep)[0] ?? null;
}

function layerOfFile(filename) {
  const rel = path.relative(SRC, filename);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  return parts.length > 1 ? parts[0] : null;
}

/** Custom rule: enforce LAYER_RULES for static imports, re-exports and dynamic imports. */
const layersRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce the Ageborn import layers (DESIGN B2)' },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    const own = layerOfFile(filename);
    const rules = own ? LAYER_RULES[own] : undefined;
    if (!rules) return {};
    function check(node, source) {
      if (!source || typeof source.value !== 'string') return;
      const spec = source.value;
      const target = layerOfTarget(spec, filename);
      if (target === undefined) {
        if (spec.startsWith('node:') || !rules.packages || rules.packages === '*') {
          if (spec.startsWith('node:') && rules.packages !== '*') {
            context.report({ node, message: `Layer "${own}" may not import Node built-in "${spec}".` });
          }
          return;
        }
        const pkg = packageName(spec);
        if (!rules.packages.includes(pkg)) {
          context.report({ node, message: `Layer "${own}" may not import package "${pkg}" (DESIGN B2).` });
        }
        return;
      }
      if (target === null) {
        if (rules.layers !== '*') {
          context.report({ node, message: `Layer "${own}" may not import files outside src ("${spec}").` });
        }
        return;
      }
      if (target === own || rules.layers === '*') return;
      if (!rules.layers.includes(target)) {
        context.report({ node, message: `Layer "${own}" may not import layer "${target}" (DESIGN B2).` });
      }
    }
    return {
      ImportDeclaration: (node) => check(node, node.source),
      ExportNamedDeclaration: (node) => check(node, node.source),
      ExportAllDeclaration: (node) => check(node, node.source),
      ImportExpression: (node) => check(node, node.source),
    };
  },
};

const agebornPlugin = { rules: { layers: layersRule } };

const MATH_BANNED = [
  'random', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh',
  'pow', 'exp', 'expm1', 'log', 'log2', 'log10', 'log1p', 'sqrt', 'cbrt', 'hypot', 'fround',
];

const DOM_AND_TIME_GLOBALS = [
  'Date', 'performance', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'queueMicrotask',
  'window', 'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage',
  'indexedDB', 'fetch', 'XMLHttpRequest', 'crypto', 'HTMLElement', 'HTMLCanvasElement', 'Image',
  'Audio', 'AudioContext', 'globalThis', 'self', 'screen', 'matchMedia', 'getComputedStyle',
];

const deterministicFiles = (layers) => layers.map((l) => `src/${l}/**/*.{ts,tsx}`);

export default tseslint.config(
  {
    ignores: [
      'dist/**', 'node_modules/**', 'coverage/**', 'reports/**', 'playwright-report/**',
      'test-results/**', 'placeholder/**', 'assets-src/**', '.claude/**',
      // The online server (server/) is its own package with its own tooling and checks.
      'server/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports', disallowTypeAnnotations: false }],
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['age-of-war', '*age-of-war*'], message: 'Our own IP only (CLAUDE.md).' }],
      }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { ageborn: agebornPlugin },
    rules: { 'ageborn/layers': 'error' },
  },
  {
    // Determinism rules (DESIGN B2): pure layers get no time, randomness, float trig or DOM.
    files: deterministicFiles(DETERMINISTIC_LAYERS),
    ignores: TEST_FILES,
    rules: {
      'no-restricted-globals': ['error', ...DOM_AND_TIME_GLOBALS.map((name) => ({
        name,
        message: `"${name}" is banned in deterministic layers (DESIGN B2). Inject a Clock or use core helpers.`,
      }))],
      'no-restricted-properties': ['error', ...MATH_BANNED.map((property) => ({
        object: 'Math',
        property,
        message: `Math.${property} is banned in deterministic layers (DESIGN B2). Use seeded RNG or integer helpers from @/core.`,
      }))],
      'no-restricted-syntax': ['error',
        { selector: 'ForInStatement', message: 'for...in is banned in deterministic layers (DESIGN B2). Iterate sorted keys.' },
        { selector: 'Literal[raw=/^[0-9_]*\\.[0-9]|^[0-9_]+[eE]-/]', message: 'Floating-point literals are banned in deterministic layers (DESIGN B3). Use bp, milli or centi integers.' },
      ],
    },
  },
  {
    // Raw content mirrors the Part A tables exactly; compile.ts converts them to integers (DESIGN B4).
    files: ['src/content/raw/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error',
        { selector: 'ForInStatement', message: 'for...in is banned in deterministic layers (DESIGN B2). Iterate sorted keys.' },
      ],
    },
  },
  {
    // Tests may cross layers (for example AI tests run the sim) and use test tooling.
    files: TEST_FILES.map((g) => `src/${g}`),
    rules: { 'ageborn/layers': 'off' },
  },
  {
    files: ['*.{js,ts,mjs}', 'tools/**/*.{ts,mjs,js}', 'tests/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node } },
  },
);
