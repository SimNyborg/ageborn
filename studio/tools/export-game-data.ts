/**
 * Exports what the studio needs from the game repo as one JSON file (read only; nothing in the repo
 * changes): unit names, rarities and stats, the age names, the sound-effect sheets with each sound's mix
 * settings, and the music files.
 *
 * Run from the game repo (its tsconfig resolves `@/`):
 *   cd <repo> && npx tsx <studio>/tools/export-game-data.ts > <studio>/assets/game.json
 */
import { MIX_TRIM } from '@/audio/mixer';
import { FILE_GAIN_DB, fileMusic } from '@/audio/music';
import { MUSIC_FILES, SFX_FILES, SFX_SHEETS } from '@/audio/assets.gen';
import { sounds } from '@/audio/sounds';
import { content } from '@/content';
import en from '@/i18n/content.en.json';

type Named = { name?: string; desc?: string; mechanic?: string; flavour?: string };
const strings = en as unknown as { card: Record<string, Named>; age: Record<string, Named>; rarity: Record<string, Named> };

const units = Object.fromEntries(
  Object.values(content.units)
    .filter((u) => !u.hidden)
    .map((u) => [
      u.id,
      {
        id: u.id,
        name: strings.card[u.id]?.name ?? u.id,
        desc: strings.card[u.id]?.desc ?? '',
        age: u.age,
        rarity: u.rarity,
        group: u.group,
        role: u.role,
        cost: u.cost,
        hp: u.hp,
        size: u.size,
        tags: u.tags,
        visualId: u.visualId,
        attacks: u.attacks.map((a) => ({ damage: a.damage, intervalMs: a.intervalMs, range: a.range, splash: a.splashRadius ?? 0, dmgType: a.dmgType })),
        abilities: u.abilities.map((a) => a.kind),
        sfx: u.sfx,
      },
    ]),
);

const ages = Object.fromEntries(
  Object.values(content.ages)
    .sort((a, b) => a.index - b.index)
    .map((a) => [a.id, { id: a.id, index: a.index, name: strings.age[a.id]?.name ?? a.id, mechanic: strings.age[a.id]?.mechanic ?? '' }]),
);

const turrets = Object.fromEntries(Object.values(content.turrets).map((t) => [t.id, { id: t.id, age: t.age, name: strings.card[t.id]?.name ?? t.id, rarity: t.rarity }]));
const powers = Object.fromEntries(Object.values(content.powers).map((p) => [p.id, { id: p.id, age: p.age, slot: p.slot, name: strings.card[p.id]?.name ?? p.id }]));

const soundMix = Object.fromEntries(
  Object.entries(sounds).map(([id, d]) => [
    id,
    { bus: d.bus, group: d.group, gainDb: d.gainDb ?? 0, maxVoices: d.maxVoices ?? 4, gapMs: d.gapMs ?? 40, pitchVarBp: d.pitchVarBp ?? 800, volVarDb: d.volVarDb ?? 3 },
  ]),
);

const music = Object.fromEntries(
  Object.entries(fileMusic).map(([cue, d]) => [
    cue,
    d.kind === 'file'
      ? { src: d.src, loopStart: d.loopStart ?? null, loopLength: d.loopLength ?? null, role: d.role, gainDb: d.gainDb ?? 0, layers: d.layers ?? {}, keys: d.keys ?? {} }
      : { src: null, role: d.role },
  ]),
);

const out = {
  exportedFrom: 'ageborn game repo (read only)',
  ages,
  units,
  turrets,
  powers,
  rarities: Object.fromEntries(Object.entries(strings.rarity).map(([k, v]) => [k, v.name ?? k])),
  audio: { mixTrim: MIX_TRIM, fileGainDb: FILE_GAIN_DB, sfxSheets: SFX_SHEETS, sfxFiles: SFX_FILES, soundMix, musicFiles: MUSIC_FILES, music },
};
process.stdout.write(JSON.stringify(out, null, 1));
