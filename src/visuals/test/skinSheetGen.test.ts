/**
 * Queue item 46, contract C3: troop skins rendered as sheets. The generator (`art/blender/gen_unit_manifest.mjs`)
 * collects every `<slug>@<skinId>.json` into `skinSheets.gen.ts` and fails, with the reason, on a skin sheet that
 * does not match its unit's sheets: the same clips, frame counts, step durations, impact frames, anchor keys and
 * extras, the ids and the frame-name prefix. Every installed skin sheet passes the same parity check here, and the
 * check itself is proven on a test-only skin sheet made in memory from the Bonker's sheets (never installed).
 *
 * The aim data the pipeline writes into shot clips (contract C2) is checked by the same generator: an aimed variant
 * keeps its base clip's timing exactly, and a release names a frame and a real point.
 */
import { describe, expect, it } from 'vitest';
import { aimProblems, collect, renderSkins, sheetName, skinProblems, summarize, summarizeSkin, type SheetJson, type SkinSheets } from '../../../art/blender/gen_unit_manifest.mjs';
import { SKIN_SHEETS } from '../skinSheets.gen';
import { UNIT_SHEETS } from '../unitSheets.gen';

/** Every core and extras sheet JSON of the unit folders (1x); the HD copies on demand (`HD`), the Bonker's at once. */
const JSONS = import.meta.glob<SheetJson>(['/public/art/units/*/*.json', '!/public/art/units/*/*.hd.json'], { eager: true, import: 'default' });
const HD = import.meta.glob<SheetJson>('/public/art/units/*/*.hd.json', { import: 'default' });
const BONKER_HD = import.meta.glob<SheetJson>(['/public/art/units/stone/bonker.hd.json', '/public/art/units/stone/bonker.x.hd.json'], { eager: true, import: 'default' });
const PORTRAITS = new Set(Object.keys(import.meta.glob('/public/art/portraits/*.png', { query: '?url', import: 'default' })));

const sheet = (age: string, name: string): SheetJson | null => JSONS[`/public/art/units/${age}/${name}.json`] ?? null;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** A test-only skin of the Bonker, as the pipeline would write it (contract C3): the unit's sheets renamed. */
function fixture(skin = 'pumpkin_head'): SkinSheets {
  const unit = sheet('stone', 'bonker');
  const unitX = sheet('stone', 'bonker.x');
  const unitHd = BONKER_HD['/public/art/units/stone/bonker.hd.json'];
  const unitXHd = BONKER_HD['/public/art/units/stone/bonker.x.hd.json'];
  if (!unit || !unitX || !unitHd || !unitXHd) throw new Error('the Bonker sheets are not installed');
  const id = `bonker@${skin}`;
  const rename = (j: SheetJson, extras: boolean): SheetJson => {
    const s = clone(j);
    s.frames = Object.fromEntries(Object.entries(s.frames ?? {}).map(([k, v]) => [k.replace(/^bonker_/, `${id}_`), v]));
    s.animations = Object.fromEntries(Object.entries(s.animations ?? {}).map(([k, v]) => [k, v.map((f) => f.replace(/^bonker_/, `${id}_`))]));
    const a = s.meta!.ageborn!;
    a['visualId'] = `unit.${id}`;
    a['skinOf'] = 'unit.bonker';
    a['skin'] = skin;
    if (extras) a['extrasOf'] = id;
    return s;
  };
  return { unit, unitX, skin: rename(unit, false), skinX: rename(unitX, true), unitHd, unitXHd, skinHd: rename(unitHd, false), skinXHd: rename(unitXHd, true) };
}

describe('skin sheets (contract C3)', () => {
  it('names: `<slug>@<skinId>.json` is a skin of `<slug>`', () => {
    expect(sheetName('bonker.json')).toEqual({ slug: 'bonker', skin: null });
    expect(sheetName('bonker@pumpkin_head.json')).toEqual({ slug: 'bonker', skin: 'pumpkin_head' });
  });

  it('a well-formed skin sheet passes and is summarised like its unit, with what it is a skin of', () => {
    const o = fixture();
    expect(skinProblems('bonker@pumpkin_head.json', o)).toEqual([]);
    const row = summarizeSkin('bonker@pumpkin_head.json', 'stone', o, true);
    const unit = UNIT_SHEETS.find((s) => s.slug === 'bonker');
    expect(row).toMatchObject({ age: 'stone', slug: 'bonker@pumpkin_head', visualId: 'unit.bonker@pumpkin_head', skinOf: 'unit.bonker', skin: 'pumpkin_head', still: true });
    // the same clips and timing as the unit's own summary (extras included)
    expect(row['clips']).toEqual(unit?.clips);
    expect(row['heightLu']).toBe(unit?.heightLu);
    expect(summarizeSkin('bonker@pumpkin_head.json', 'stone', o, false)['still']).toBe(false);
  });

  // each malformed variant fails with a reason that names what is wrong
  const broken: [string, (o: SkinSheets) => void, RegExp][] = [
    ['the skin id in the meta', (o) => (o.skin!.meta!.ageborn!['visualId'] = 'unit.bonker@pumpkin'), /visualId must be "unit\.bonker@pumpkin_head"/],
    ['skinOf', (o) => delete o.skin!.meta!.ageborn!['skinOf'], /skinOf must be "unit\.bonker"/],
    ['skin', (o) => (o.skin!.meta!.ageborn!['skin'] = 'pumpkin'), /skin must be "pumpkin_head"/],
    ['a frame name without the skin prefix', (o) => (o.skin!.frames = { ...o.skin!.frames, bonker_idle_00: {} }), /frame "bonker_idle_00" .* not prefixed "bonker@pumpkin_head_"/],
    ['a clip with one frame fewer', (o) => o.skin!.animations!['attack']!.pop(), /attack has 10 frames, the unit 11/],
    ['a step duration', (o) => ((o.skin!.meta!.ageborn!.clips!['attack']!['durationsMs'] as number[])[3] = 111), /attack timing .* differs/],
    ['the impact frame', (o) => (o.skin!.meta!.ageborn!.clips!['attack']!['impactFrame'] = 5), /attack timing .* differs/],
    ['a missing clip', (o) => (delete o.skin!.animations!['hit'], delete o.skin!.animations!['hit_team'], delete o.skin!.meta!.ageborn!.clips!['hit']), /has clips .* the unit/],
    ['an anchor key', (o) => delete o.skin!.meta!.ageborn!.clips!['attack']!['anchorsLu'], /anchor keys/],
    ['the extras sheet', (o) => (o.skinX = null), /the unit has bonker\.x\.json, the skin has no bonker@pumpkin_head\.x\.json/],
    ["the extras sheet's owner", (o) => (o.skinX!.meta!.ageborn!['extrasOf'] = 'bonker'), /extrasOf "bonker@pumpkin_head"/],
    ['an extras clip', (o) => o.skinX!.animations!['attack_c']!.pop(), /attack_c has 10 frames/],
    ['the height', (o) => (o.skin!.meta!.ageborn!['heightLu'] = 80), /heightLu 80 differs/],
    ['the density', (o) => (o.skin!.meta!.ageborn!['pxPerLu'] = 2.46), /density/],
    ["the unit's own sheet", (o) => (o.unit = null), /the unit's own sheet bonker\.json is not installed/],
    // the HD copies (drawn on dense screens) match as the 1x ones do
    ['HD clip with one frame fewer', (o) => o.skinHd!.animations!['attack']!.pop(), /bonker@pumpkin_head\.hd\.json attack has 10 frames, the unit 11/],
    ['HD step duration', (o) => ((o.skinHd!.meta!.ageborn!.clips!['attack']!['durationsMs'] as number[])[3] = 111), /bonker@pumpkin_head\.hd\.json attack timing .* differs/],
    ['HD anchor key', (o) => delete o.skinHd!.meta!.ageborn!.clips!['attack']!['anchorsLu'], /bonker@pumpkin_head\.hd\.json anchor keys/],
    ['HD extras sheet', (o) => (o.skinXHd = null), /the unit has bonker\.x\.hd\.json, the skin has no bonker@pumpkin_head\.x\.hd\.json/],
    ["HD extras sheet's owner", (o) => (o.skinXHd!.meta!.ageborn!['extrasOf'] = 'bonker'), /bonker@pumpkin_head\.x\.hd\.json must say extrasOf "bonker@pumpkin_head"/],
    ['HD copy without its unit', (o) => (o.unitHd = null), /bonker@pumpkin_head\.hd\.json has no counterpart bonker\.hd\.json/],
  ];
  it.each(broken)('a skin sheet with a wrong %s fails clearly', (_what, breakIt, reason) => {
    const o = fixture();
    breakIt(o);
    const problems = skinProblems('bonker@pumpkin_head.json', o);
    expect(problems.join('\n')).toMatch(reason);
    expect(() => summarizeSkin('bonker@pumpkin_head.json', 'stone', o, false)).toThrow(/malformed skin sheet/);
  });

  it('a skin file name must carry a slug and a skin id', () => {
    expect(skinProblems('Bonker@Pumpkin.json', fixture())[0]).toMatch(/<slug>@<skinId>\.json/);
  });

  it('every installed skin sheet matches its unit (C3 parity, 1x and HD), and the generated table lists exactly them', async () => {
    const files = Object.keys(JSONS).filter((p) => /@[a-z0-9_]+\.json$/.test(p) && !p.endsWith('.x.json'));
    const rows: string[] = [];
    for (const path of files) {
      const m = /^\/public\/art\/units\/([a-z]+)\/(([a-z0-9_]+)@([a-z0-9_]+))\.json$/.exec(path);
      expect(m, path).not.toBeNull();
      if (!m) continue;
      const [, age, id, slug] = m as unknown as [string, string, string, string];
      const hd = async (name: string): Promise<SheetJson | null> => (await HD[`/public/art/units/${age}/${name}.hd.json`]?.()) ?? null;
      const o: SkinSheets = { unit: sheet(age, slug), unitX: sheet(age, `${slug}.x`), skin: sheet(age, id), skinX: sheet(age, `${id}.x`), unitHd: await hd(slug), unitXHd: await hd(`${slug}.x`), skinHd: await hd(id), skinXHd: await hd(`${id}.x`) };
      expect(skinProblems(`${id}.json`, o), path).toEqual([]);
      rows.push(`${age}/${id}`);
      const still = PORTRAITS.has(`/public/art/portraits/${id}.png`) && PORTRAITS.has(`/public/art/portraits/${id}_team.png`);
      expect(SKIN_SHEETS.find((s) => `${s.age}/${s.slug}` === `${age}/${id}`)?.still, `${path} still`).toBe(still);
    }
    expect(SKIN_SHEETS.map((s) => `${s.age}/${s.slug}`).sort()).toEqual(rows.sort());
  });

  it('the generated tables are up to date (else run node art/blender/gen_unit_manifest.mjs), and a run is deterministic', () => {
    const a = collect();
    const b = collect();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.parse(JSON.stringify(a.skins))).toEqual(JSON.parse(JSON.stringify(SKIN_SHEETS)));
    expect(JSON.parse(JSON.stringify(a.rows))).toEqual(JSON.parse(JSON.stringify(UNIT_SHEETS)));
    expect(renderSkins([])).toContain('export const SKIN_SHEETS: readonly SkinSheetSummary[] = [];');
  });
});

describe('aim data in the sheets (contract C2)', () => {
  const base = { frames: 11, durationsMs: [30, 45, 50, 110, 35, 20, 120, 60, 50, 70, 90], durationMs: 680, impactAt: 0.4265, impactStep: 6, holdStep: 3, sequence: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };
  const aimed = (o: Record<string, unknown> = {}): Record<string, unknown> => ({ ...base, aimOf: 'attack', aimDeg: 44.6, release: { frame: 6, atLu: [31.2, 52.4] }, ...o });

  it('a shot clip with its aim and aimed variants that keep its timing pass', () => {
    expect(aimProblems({ attack: { ...base, aimDeg: 2.1, release: { frame: 6, atLu: [30, 40] } }, attack_up45: aimed(), attack_down: aimed({ aimDeg: -31 }) }, 'x')).toEqual([]);
    expect(aimProblems({ attack: { ...base, omni: true } }, 'x')).toEqual([]);
  });

  it.each([
    ['another step duration', { durationsMs: [31, 44, 50, 110, 35, 20, 120, 60, 50, 70, 90] }, /durationsMs/],
    ['another hold step', { holdStep: 2 }, /holdStep/],
    ['another impact', { impactAt: 0.43 }, /impactAt/],
    ['another frame count', { frames: 10 }, /frames/],
    ['a shorter sequence', { sequence: [0, 1, 2] }, /sequence length/],
    ['no aim', { aimDeg: undefined }, /needs its aimDeg/],
    ['the wrong base', { aimOf: 'attack_b' }, /aimOf must be "attack"/],
    ['a bare release point', { release: [31, 52] }, /release must be \{ frame, atLu/],
    ['a release at the feet', { release: { frame: 6, atLu: [0, 0] } }, /\[0, 0\]/],
  ])('an aimed variant with %s fails', (_what, patch, reason) => {
    expect(aimProblems({ attack: base, attack_up45: aimed(patch) }, 'x').join('\n')).toMatch(reason);
  });

  it('an aimed variant without its base clip, or aimOf on another clip, fails', () => {
    expect(aimProblems({ attack_b_up70: { ...base, aimOf: 'attack_b', aimDeg: 70 } }, 'x').join('\n')).toMatch(/base clip "attack_b" is not in the sheet/);
    expect(aimProblems({ attack: base, attack_high: { ...base, aimOf: 'attack', aimDeg: 70 } }, 'x').join('\n')).toMatch(/not named <clip>_up45/);
  });

  it('the summary carries aimDeg, release, aimOf and omni, and lists aimed variants from the extras sheet', () => {
    const core: SheetJson = { animations: {}, meta: { ageborn: { heightLu: 68, pxPerLu: 1.23, clips: { idle: { durationMs: 920, loop: true }, attack: { ...base, aimDeg: 2.04, release: { frame: 6, atLu: [30.04, 40.06] } }, hit: { durationMs: 310 } } } } };
    const extras: SheetJson = { animations: {}, meta: { ageborn: { heightLu: 68, pxPerLu: 1.23, clips: { attack_up45: aimed(), attack_b: { ...base, omni: true }, stray: { durationMs: 1 } } } } };
    const row = summarize(core, 'bronze', 'javelineer', extras) as { clips: Record<string, unknown> };
    expect(row.clips['attack']).toEqual({ durationMs: 680, loop: false, impactAt: 0.4265, aimDeg: 2, release: { frame: 6, atLu: [30, 40.1] } });
    expect(row.clips['attack_up45']).toEqual({ durationMs: 680, loop: false, impactAt: 0.4265, aimOf: 'attack', aimDeg: 44.6, release: { frame: 6, atLu: [31.2, 52.4] } });
    expect(row.clips['attack_b']).toEqual({ durationMs: 680, loop: false, impactAt: 0.4265, omni: true });
    // only variant clips and aimed variants count from an extras sheet
    expect(row.clips['stray']).toBeUndefined();
    expect(() => summarize(core, 'bronze', 'javelineer', { meta: { ageborn: { clips: { attack_up45: aimed({ holdStep: 1 }) } } } })).toThrow(/malformed aim data/);
  });
});
