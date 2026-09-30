/**
 * English strings for all content (C2/WP1: "Write English strings for all content. Keys are final").
 * Every key the content references exists in `src/i18n/content.en.json`, and the file holds nothing
 * else, so Danish translators (v1.1) get exactly the keys the game uses.
 */
import { describe, expect, it } from 'vitest';
import type { CapsuleTier, Foil, Rarity, Role, RoleGroup, Tag } from '@/contracts/ids';
import { flattenStrings, i18n } from '@/i18n';
import strings from '@/i18n/content.en.json';
import {
  THEMED_AGES,
  ageFlavourKey,
  ageMechanicKey,
  ageNameKey,
  bannerNameKey,
  capsuleKindNameKey,
  capsuleTierNameKey,
  capsuleTierShortKey,
  content,
  emoteNameKey,
  foilNameKey,
  formatDescKey,
  formatNameKey,
  frameNameKey,
  generalKey,
  groupNameKey,
  rarityNameKey,
  roleNameKey,
  skinLookKey,
  tagNameKey,
  titleNameKey,
  titleUnlockKey,
} from '../index';

const ROLES: Role[] = [
  'infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'skirmisher', 'siege', 'artillery', 'airBomber', 'airGunship', 'antiMech', 'siegeHeavy', 'fort',
];
const GROUPS: RoleGroup[] = ['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary', 'fort'];
const TAGS: Tag[] = ['light', 'armored', 'bio', 'mech', 'ground', 'air', 'legendary', 'support', 'ranged', 'melee', 'structure'];

/** Every string key the content references. */
function referencedKeys(): string[] {
  const c = content;
  const keys: string[] = [];
  for (const u of Object.values(c.units)) keys.push(u.nameKey, u.descKey);
  for (const t of Object.values(c.turrets)) keys.push(t.nameKey, t.descKey);
  for (const p of Object.values(c.powers)) keys.push(p.nameKey, p.descKey);
  // A16.14 forts (traps have no twin unit)
  for (const f of Object.values(c.forts)) keys.push(f.nameKey, f.descKey);
  for (const s of Object.values(c.skins)) keys.push(s.nameKey, skinLookKey(s.id));
  for (const a of c.order.ages) keys.push(ageNameKey(a), ageMechanicKey(a));
  // A18.8.2 presentation themes: Hellas, Muskets, Great War
  for (const a of THEMED_AGES) keys.push(ageFlavourKey(a));
  for (const f of c.order.formats) keys.push(formatNameKey(f), formatDescKey(f));
  for (const r of c.rarities.order as Rarity[]) keys.push(c.rarities.cards[r].nameKey, rarityNameKey(r));
  for (const r of c.rarities.skinOrder) keys.push(c.rarities.skins[r].nameKey);
  for (const f of c.rarities.foilOrder as Foil[]) keys.push(c.rarities.foils[f].nameKey, foilNameKey(f));
  for (const r of ROLES) keys.push(roleNameKey(r));
  for (const g of GROUPS) keys.push(groupNameKey(g));
  for (const t of TAGS) keys.push(tagNameKey(t));
  for (const t of c.capsules.tierOrder as CapsuleTier[]) keys.push(c.capsules.tiers[t].nameKey, capsuleTierNameKey(t), capsuleTierShortKey(t));
  for (const k of Object.values(c.capsules.kinds)) keys.push(k.nameKey, capsuleKindNameKey(k.kind));
  for (const a of c.arenas.list) keys.push(a.nameKey);
  for (const id of c.generals.order) {
    const g = c.generals.list[id];
    keys.push(g.nameKey, g.personalityKey, g.signatureKey, g.lineKey, ...g.disclosureKeys);
    keys.push(generalKey(id, 'name'), generalKey(id, 'line'));
  }
  for (const q of [...c.quests.daily, c.quests.weekly]) keys.push(q.nameKey);
  for (const id of c.dailyModifiers.order) keys.push(c.dailyModifiers.list[id].nameKey, c.dailyModifiers.list[id].descKey);
  for (const b of c.cosmetics.banners) keys.push(b.nameKey, bannerNameKey(b.id));
  for (const f of c.cosmetics.frames) keys.push(f.nameKey, frameNameKey(f.id));
  for (const t of c.cosmetics.titles) keys.push(t.nameKey, titleNameKey(t.id), titleUnlockKey(t.id));
  for (const e of c.cosmetics.emotes) keys.push(e.nameKey, emoteNameKey(e.id));
  for (const id of c.feats.order) {
    const f = c.feats.list[id]!;
    keys.push(f.nameKey, f.riddleKey, f.hintKey);
  }
  // A18.5 War Council picks
  for (const p of c.research.picks) keys.push(p.nameKey, p.descKey);
  return [...new Set(keys)].sort();
}

const table = flattenStrings(strings);

describe('content.en.json', () => {
  it('has every key the content references', () => {
    const missing = referencedKeys().filter((k) => table[k] === undefined);
    expect(missing).toEqual([]);
  });

  it('has no keys the content does not use', () => {
    const used = new Set(referencedKeys());
    expect(Object.keys(table).filter((k) => !used.has(k))).toEqual([]);
  });

  it('has only non-empty strings, trimmed', () => {
    for (const [k, s] of Object.entries(table)) {
      expect(s.length, k).toBeGreaterThan(0);
      expect(s.trim(), k).toBe(s);
    }
  });

  it('uses only the {n} placeholder, and only where the quest target fills it', () => {
    const questKeys = new Set([...content.quests.daily, content.quests.weekly].map((q) => q.nameKey));
    for (const [k, s] of Object.entries(table)) {
      for (const m of s.matchAll(/\{(\w+)\}/g)) {
        expect(m[1], k).toBe('n');
        expect(questKeys.has(k), k).toBe(true);
      }
    }
  });

  it('keeps to our own IP (CLAUDE.md)', () => {
    for (const s of Object.values(table)) expect(s.toLowerCase()).not.toContain('age of war');
  });

  it('is loaded by the i18n module', () => {
    expect(i18n.t('card.bonker.name')).toBe('Bonker');
    expect(i18n.t('quest.win_2.name', { n: 2 })).toBe('Win 2 battles');
    expect(i18n.t('general.warden.disclosure')).toMatch(/Legendaries/);
  });
});

/**
 * Some strings spell out numbers that live in the tables. When balance tuning changes one of those
 * numbers, the text must change with it, so every such string is checked against the data here.
 * Each expectation is computed from the content, not typed in.
 */
describe('strings that spell out table numbers', () => {
  const c = content;
  const s = (k: string): string => table[k] ?? `(missing ${k})`;
  /** 360000 → "6:00" */
  const mmss = (ms: number): string => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  /** 2500 bp → "25%" */
  const pctOf = (bp: number): string => `${bp / 100}%`;
  /** 15000 bp → "×1.5" */
  const timesOf = (bp: number): string => `×${bp / 10000}`;
  const WORDS: Record<number, string> = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight' };
  const word = (n: number): RegExp => new RegExp(`\\b${WORDS[n] ?? String(n)}\\b`, 'i');
  const secs = (ms: number): string => `${ms / 1000} s`;
  const unit = (id: string) => {
    const u = c.units[id];
    if (!u) throw new Error(id);
    return u;
  };
  const ability = <K extends string>(id: string, kind: K) => {
    const a = unit(id).abilities.find((x) => x.kind === kind);
    if (!a) throw new Error(`${id} has no ${kind}`);
    return a as Extract<(typeof a), { kind: K }>;
  };
  const quest = (id: string) => {
    const q = c.quests.daily.find((x) => x.id === id);
    if (!q) throw new Error(id);
    return q;
  };
  const title = (id: string) => {
    const t = c.cosmetics.titles.find((x) => x.id === id);
    if (!t) throw new Error(id);
    return t.unlock;
  };

  it('quests (A6.7)', () => {
    const fast = quest('fast_final_age').beforeMsByFormat ?? {};
    for (const f of ['short', 'standard', 'full'] as const) expect(s('quest.fast_final_age.name')).toContain(mmss(fast[f] ?? 0));
    expect(s('quest.power_hits_5.name')).toContain(`${quest('power_hits_5').minHits}+`);
    expect(s('quest.fast_base_kill.name')).toContain(mmss(quest('fast_base_kill').beforeMs ?? 0));
  });

  it('title unlocks (A5.8)', () => {
    const u = (id: string) => s(`title.${id}.unlock`);
    const collector = title('collector');
    const curator = title('curator');
    const veteran = title('veteran');
    const conqueror = title('conqueror');
    const scholar = title('siege_scholar');
    const ageborn = title('ageborn');
    const speed = title('speedrunner');
    if (collector.kind === 'codexLevel') expect(u('collector')).toContain(`Codex Level ${collector.level}`);
    if (curator.kind === 'codexLevel') expect(u('curator')).toContain(`Codex Level ${curator.level}`);
    if (veteran.kind === 'wins') expect(u('veteran')).toContain(`${veteran.count}`);
    if (conqueror.kind === 'conquestStars') expect(u('conqueror')).toContain(`${conqueror.stars}`);
    if (scholar.kind === 'arena') expect(u('siege_scholar')).toContain(`Arena ${scholar.arena}`);
    if (ageborn.kind === 'arena') expect(u('ageborn')).toContain(`Arena ${ageborn.arena}`);
    if (speed.kind === 'finalAgeBefore') expect(u('speedrunner')).toContain(mmss(speed.ms));
    expect([collector.kind, curator.kind, veteran.kind, conqueror.kind, scholar.kind, ageborn.kind, speed.kind]).toEqual([
      'codexLevel', 'codexLevel', 'wins', 'conquestStars', 'arena', 'arena', 'finalAgeBefore',
    ]);
  });

  it('General disclosures and signatures (A7.4)', () => {
    expect(s('general.grogg.disclosure')).toContain(pctOf(c.generals.list.grogg.baseStartBp));
    expect(s('general.warden.disclosure')).toContain(`level ${c.generals.list.warden.legendaryLevel}`);
    expect(s('general.warden.disclosure')).toMatch(word(c.generals.list.warden.signatureCards.length));
    for (const card of c.generals.list.boomsworth.signatureCards) {
      expect(s('general.boomsworth.signature')).toContain(s(`card.${card}.name`));
    }
  });

  it('daily modifiers (A9.1)', () => {
    const effect = (id: keyof typeof c.dailyModifiers.list) => c.dailyModifiers.list[id].effect;
    const bpOf = (e: ReturnType<typeof effect>): number => ('bp' in e ? e.bp : 0);
    expect(s('modifier.gold_rush.desc')).toContain(timesOf(bpOf(effect('gold_rush'))));
    expect(s('modifier.glass_armies.desc')).toContain(timesOf(bpOf(effect('glass_armies'))));
    expect(s('modifier.fast_forward.desc')).toContain(timesOf(bpOf(effect('fast_forward'))));
    const hour = effect('power_hour');
    expect(hour).toEqual({ kind: 'powers', reloadBp: 10000, costBp: 5000 });
    expect(s('modifier.power_hour.desc')).toContain('twice');
    expect(s('modifier.power_hour.desc')).toContain('half');
    expect(s('modifier.heavy_metal.desc')).toContain(`${pctOf(10000 - bpOf(effect('heavy_metal')))} less`);
    const siege = effect('sudden_siege');
    expect(s('modifier.sudden_siege.desc')).toContain(mmss(siege.kind === 'siegeShift' ? -siege.ms : 0));
  });

  it('card descriptions (A5)', () => {
    const d = (id: string): string => s(`card.${id}.desc`);
    const aura = ability('drum_shaman', 'aura');
    expect(d('drum_shaman')).toContain(`+${pctOf(aura.status.magnitudeBp)}`);
    expect(d('footman')).toContain(`${pctOf(ability('footman', 'resist').bp)} less`);
    expect(d('ursa_paladin')).toContain(`every ${secs(ability('ursa_paladin', 'periodicShieldAura').everyMs)}`);
    expect(d('ursa_paladin')).toMatch(word(unit('ursa_paladin').attacks[0]?.cleave?.count ?? 0));
    expect(d('chrono_titan')).toContain(`every ${secs(ability('chrono_titan', 'timeStop').everyMs)}`);
    expect(d('chrono_titan')).toMatch(word(unit('chrono_titan').attacks[0]?.cleave?.count ?? 0));
    expect(d('radio_operator')).toContain(`Every ${secs(ability('radio_operator', 'callStrike').everyMs)}`);
    expect(d('pebbler')).toMatch(word((unit('pebbler').attacks[0]?.chain?.count ?? 0) - 1));
    expect(d('mammoth_matriarch')).toMatch(word(ability('mammoth_matriarch', 'riders').count));
    expect(d('rail_gunner')).toMatch(word(unit('rail_gunner').attacks[0]?.pierce?.count ?? 0));
    for (const id of ['friar', 'field_surgeon', 'repair_drone']) expect(d(id)).toMatch(word(ability(id, 'heal').targets));
    // "double damage": first-hit charges ×2; the Anti-heavy mods vs armored: "triple" ×3.0, "×2.5", "double" ×2.0
    for (const id of ['tuskback', 'destrier_knight', 'cuirassier']) {
      expect(ability(id, 'firstHitBonus').multBp, id).toBe(20000);
      expect(d(id)).toContain('double damage');
    }
    const armoredBp = (id: string) => unit(id).attacks[0]?.mods?.find((m) => m.vs === 'armored')?.bp;
    for (const id of ['spear_hunter', 'phalangite', 'pikeman', 'harpoon_gunner', 'bazooka_trooper', 'graviton_halberdier']) {
      expect(armoredBp(id), id).toBe(30000);
      expect(d(id).toLowerCase()).toContain('triple damage');
    }
    expect(armoredBp('grenadier')).toBe(25000);
    expect(d('grenadier')).toContain('×2.5');
    expect(armoredBp('rail_gunner')).toBe(20000);
    expect(d('rail_gunner')).toContain('double damage');
    const turret = (id: string) => {
      const t = c.turrets[id];
      if (!t) throw new Error(id);
      return t.attack;
    };
    expect(d('log_roller')).toContain(`up to ${turret('log_roller').maxTargets}`);
    expect(d('pitch_cauldron')).toContain(`up to ${turret('pitch_cauldron').maxTargets}`);
    expect(d('chainshot_cannon')).toContain(`up to ${turret('chainshot_cannon').pierce?.count}`);
    expect(d('gravity_well')).toContain(`up to ${turret('gravity_well').maxTargets}`);
    expect(d('honk_ballista')).toContain(`${turret('honk_ballista').chain?.count} enemies`);
    expect(d('arc_coil')).toContain(`${turret('arc_coil').chain?.count} enemies`);
    expect(d('congreve_rack')).toContain(`volley of ${turret('congreve_rack').volley}`);
    expect(d('searchlight_sniper')).toContain(`${pctOf(turret('searchlight_sniper').onHit?.[0]?.magnitudeBp ?? 0)} more`);
  });

  it('power descriptions (A5.7)', () => {
    const d = (id: string): string => s(`card.${id}.desc`);
    const effect = (id: string) => {
      const e = c.powers[id]?.effect;
      if (!e) throw new Error(id);
      return e;
    };
    const stampede = effect('stampede');
    if (stampede.kind === 'stampede') expect(d('stampede')).toMatch(word(stampede.runners));
    const para = effect('paratroopers');
    if (para.kind === 'paradrop') expect(d('paratroopers')).toMatch(word(para.count));
    const decree = effect('royal_decree');
    if (decree.kind === 'buffAll') {
      for (const st of decree.statuses) expect(d('royal_decree')).toContain(pctOf(st.magnitudeBp));
      expect(d('royal_decree')).toContain(secs(decree.statuses[0]?.durationMs ?? 0));
    }
    const nanite = effect('nanite_surge');
    if (nanite.kind === 'buffAll') {
      const regen = nanite.statuses.find((st) => st.kind === 'regen');
      expect(d('nanite_surge')).toContain(pctOf(regen?.magnitudeBp ?? 0));
      expect(d('nanite_surge')).toContain(secs(regen?.durationMs ?? 0));
    }
    expect([stampede.kind, para.kind, decree.kind, nanite.kind]).toEqual(['stampede', 'paradrop', 'buffAll', 'buffAll']);
    // A2.9.5: every capped power names its cap; buffs name the 8 frontmost units.
    for (const pw of Object.values(c.powers)) {
      const cap = pw.maxTargets ?? 0;
      if (pw.effect.kind === 'buffAll') expect(d(pw.id), pw.id).toContain(`${cap} frontmost`);
      else if (pw.effect.kind === 'strike') expect(d(pw.id), pw.id).toMatch(/one (ground )?enemy/);
      else if (pw.effect.kind === 'cloud') expect(d(pw.id), pw.id).toContain(`up to ${cap}`);
      else if (cap > 0) expect(d(pw.id), pw.id).toContain(`up to ${cap}`);
    }
  });
});
