/**
 * Motion tokens (docs/ui-plan.md 5.2, 1.3 "Stray motion", 6.2 acceptance):
 * - the CSS variables in `src/ui/theme.css` equal the integer tokens in `src/core/motion.ts`;
 * - every token of 3.2-3.4 and 5.2 is defined;
 * - no CSS file outside `src/ui/theme.css` and `src/ui/motion.css` contains `cubic-bezier(`
 *   (the lint rule of 1.3; CSS is not linted by ESLint, so this test is the rule);
 * - the reduce-motion block switches the durations to 150 ms and the transforms to none (5.6);
 * - the retired names are gone: no `ab-btn`, no violet or blue button faces (6.2 acceptance).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { curveCss, MOTION_DUR, MOTION_EASE, MOTION_TRANSFORM, thousandths } from '@/core/motion';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const THEME = fs.readFileSync(path.join(ROOT, 'src/ui/theme.css'), 'utf8');
const TOKEN_FILES = new Set(['src/ui/theme.css', 'src/ui/motion.css']);

/** The first `:root { ... }` block of theme.css. */
function rootBlock(css: string): string {
  const start = css.indexOf(':root {');
  const end = css.indexOf('\n}', start);
  return css.slice(start, end);
}

function vars(block: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of block.matchAll(/(--ui-[\w-]+)\s*:\s*([^;]+);/g)) out.set(m[1]!, m[2]!.trim());
  return out;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const root = vars(rootBlock(THEME));

describe('motion token parity (core <-> theme.css)', () => {
  it('every duration token has its CSS variable with the same value', () => {
    const dur: Record<string, number> = {
      press: MOTION_DUR.press,
      release: MOTION_DUR.release,
      micro: MOTION_DUR.micro,
      small: MOTION_DUR.small,
      medium: MOTION_DUR.medium,
      large: MOTION_DUR.large,
      'small-out': MOTION_DUR.smallOut,
      'medium-out': MOTION_DUR.mediumOut,
      'large-out': MOTION_DUR.largeOut,
      stagger: MOTION_DUR.stagger,
      'stagger-max': MOTION_DUR.staggerMax,
      'count-s': MOTION_DUR.countS,
      'count-m': MOTION_DUR.countM,
      'count-l': MOTION_DUR.countL,
      'count-xl': MOTION_DUR.countXL,
      fly: MOTION_DUR.fly,
      hold: MOTION_DUR.hold,
      'hold-medium': MOTION_DUR.holdMedium,
      breathe: MOTION_DUR.breathe,
      sheen: MOTION_DUR.sheen,
      'long-press': MOTION_DUR.longPress,
      'tip-hover': MOTION_DUR.tipHover,
      toast: MOTION_DUR.toast,
      'toast-undo': MOTION_DUR.toastUndo,
      reduced: MOTION_DUR.reduced,
    };
    for (const [name, ms] of Object.entries(dur)) expect(root.get(`--ui-dur-${name}`), `--ui-dur-${name}`).toBe(`${ms}ms`);
  });

  it('every easing curve has its CSS variable with the same control points', () => {
    for (const [name, curve] of Object.entries(MOTION_EASE)) {
      expect(root.get(`--ui-ease-${kebab(name)}`), name).toBe(curveCss(curve));
    }
    expect(curveCss(MOTION_EASE.standard)).toBe('cubic-bezier(0.2, 0, 0, 1)');
    expect(curveCss(MOTION_EASE.anticipate)).toBe('cubic-bezier(0.36, 0, 0.66, -0.56)');
  });

  it('the standard transforms match', () => {
    const t = MOTION_TRANSFORM;
    const pairs: [string, string][] = [
      ['--ui-press-scale', thousandths(t.pressScale)],
      ['--ui-release-scale', thousandths(t.releaseScale)],
      ['--ui-lift', thousandths(t.lift)],
      ['--ui-lift-drag', thousandths(t.liftDrag)],
      ['--ui-bump', thousandths(t.bump)],
      ['--ui-pop', thousandths(t.pop)],
      ['--ui-screen-in', thousandths(t.screenIn)],
      ['--ui-screen-out', thousandths(t.screenOut)],
      ['--ui-breathe-scale', thousandths(t.breatheScale)],
      ['--ui-axis', `${t.axisOffset}px`],
      ['--ui-axis-tabs', `${t.axisOffsetTabs}px`],
      ['--ui-drag-tilt', `${t.dragTilt}deg`],
    ];
    for (const [name, value] of pairs) expect(root.get(name), name).toBe(value);
  });

  it('thousandths prints exact decimals without float math', () => {
    expect(thousandths(200)).toBe('0.2');
    expect(thousandths(-560)).toBe('-0.56');
    expect(thousandths(1000)).toBe('1');
    expect(thousandths(1560)).toBe('1.56');
    expect(thousandths(50)).toBe('0.05');
  });
});

describe('design tokens (ui-plan 3.2-3.4) are all defined', () => {
  it('colours, type, spacing, radii and elevation', () => {
    const names = [
      'bg', 'surface-1', 'surface-2', 'surface-3', 'edge', 'scrim', 'text', 'text-2', 'text-3', 'ink',
      'primary', 'primary-light', 'primary-lip', 'progress', 'progress-light', 'progress-lip',
      'secondary', 'secondary-light', 'secondary-lip', 'destructive', 'destructive-light', 'destructive-lip',
      'good', 'warn', 'bad', 'info',
      'common', 'rare', 'epic', 'epic-text', 'legendary', 'team-me', 'team-me-text', 'team-foe',
      'tier-clay', 'tier-clay-text', 'tier-bronze', 'tier-silver', 'tier-jade', 'tier-aeon',
      'font-text', 'font-display', 'fs-tag', 'fs-caption', 'fs-body', 'fs-label', 'fs-title-s', 'fs-title', 'fs-headline', 'fs-display',
      's1', 's2', 's3', 's4', 's5', 's6', 's7', 'r-sm', 'r-md', 'r-lg', 'r-xl', 'r-pill',
      'e1', 'e2', 'e3', 'e4', 'e5', 'light-angle',
    ];
    for (const n of names) expect(root.has(`--ui-${n}`), `--ui-${n}`).toBe(true);
    expect(root.get('--ui-bg')).toBe('#0f1218');
    expect(root.get('--ui-primary')).toBe('#f2b52c');
    expect(root.get('--ui-text-3')).toBe('#a39d91');
    expect(root.get('--ui-s4')).toBe('16px');
    expect(root.get('--ui-r-md')).toBe('12px');
  });

  it('the compact breakpoint keeps text at 11 px or more', () => {
    const compact = THEME.slice(THEME.indexOf('@container ui-root (max-height: 480px)'));
    const block = vars(compact.slice(0, compact.indexOf('\n}\n')));
    expect(block.get('--ui-fs-tag')).toBe('11px');
    expect(block.get('--ui-fs-caption')).toBe('12px');
    expect(block.get('--ui-header-h')).toBe('44px');
    expect(block.get('--ui-actionbar-h')).toBe('64px');
  });
});

describe('reduce motion replaces, never deletes (ui-plan 5.6)', () => {
  const start = THEME.indexOf(".ui-root[data-reduce-motion='true'] {");
  const block = vars(THEME.slice(start, THEME.indexOf('\n}', start)));
  it('switches the durations to 150 ms fades and the transforms to none', () => {
    for (const n of ['small', 'medium', 'large']) expect(block.get(`--ui-dur-${n}`)).toBe('150ms');
    expect(block.get('--ui-dur-press')).toBe('0ms');
    expect(block.get('--ui-press-scale')).toBe('1');
    expect(block.get('--ui-lift')).toBe('1');
    expect(block.get('--ui-axis')).toBe('0px');
  });
  it('no longer collapses motion to 1 ms', () => {
    expect(THEME).not.toMatch(/animation-duration:\s*1ms/);
    expect(THEME).not.toMatch(/transition-duration:\s*1ms/);
  });
});

describe('stray motion and retired names (ui-plan 1.3, 6.2)', () => {
  const files = walk(path.join(ROOT, 'src')).map((f) => path.relative(ROOT, f).split(path.sep).join('/'));
  it('no cubic-bezier( outside the token files', () => {
    const bad = files
      .filter((f) => f.endsWith('.css') && !TOKEN_FILES.has(f))
      .filter((f) => fs.readFileSync(path.join(ROOT, f), 'utf8').includes('cubic-bezier('));
    expect(bad).toEqual([]);
  });

  it('no ab-btn, ui-btn--violet or ui-btn--blue anywhere in src', () => {
    const bad = files
      .filter((f) => /\.(css|tsx?)$/.test(f))
      .filter((f) => /\bab-btn\b|ui-btn--violet|ui-btn--blue/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    expect(bad).toEqual([]);
  });
});
