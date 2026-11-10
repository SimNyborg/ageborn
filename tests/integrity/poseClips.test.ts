/**
 * Items 51/52's signature and formation poses (`art/blender/ageborn_art/pipeline.py` POSE_CLIPS) are rendered with
 * their unit into its extras sheet, and nothing plays them until those items ship. The visuals test that checks what an
 * extras sheet may hold (`src/visuals/test/unitSheets.test.ts`) lists the same names; this keeps the two lists equal,
 * so a pose added to the pipeline cannot slip past that check or be refused by it.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT } from './helpers/source';

const read = (rel: string): string => readFileSync(path.join(ROOT, rel), 'utf8');
/** The quoted names inside the first match of `re`'s group 1, sorted. */
const names = (src: string, re: RegExp): string[] =>
  [...(re.exec(src)?.[1] ?? '').matchAll(/["']([a-z_]+)["']/g)].map((m) => m[1] as string).sort();

describe('pose clips (items 51/52)', () => {
  it("the visuals test's POSE_CLIPS list is the pipeline's", () => {
    const py = names(read('art/blender/ageborn_art/pipeline.py'), /^POSE_CLIPS\s*=\s*\(([^)]*)\)/m);
    const ts = names(read('src/visuals/test/unitSheets.test.ts'), /const POSE_CLIPS = \[([^\]]*)\]/);
    expect(py.length).toBeGreaterThan(0);
    expect(ts).toEqual(py);
  });
});
