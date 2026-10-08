/**
 * The simulated online players of the Ladder (owner decision 2026-10-07, DESIGN A7.1, A9 #21;
 * `onlinePlayer.ts`): deterministic per match, believable and family-friendly gamer tags, trophies
 * clamped to the player's arena window, plausible avatars and flags, and a bot that plays exactly as
 * before (only its presentation changes).
 */
import { describe, expect, it } from 'vitest';
import type { OpponentSpec, SaveDoc } from '@/contracts';
import { seedSfc32 } from '@/core';
import { asOnlineOpponent, onlinePlayerFor, onlineTag, onlineTrophyWindow } from '../onlinePlayer';
import { C, M, clock, matchInput, scripted } from './helpers';

const N = C.names.online;

/** A Ladder save at `trophies` (its arena from the table), past the first Ladder match. */
function at(trophies: number, o: Partial<SaveDoc> = {}): SaveDoc {
  const arenaIndex = Math.max(0, C.arenas.list.filter((a) => a.trophies <= trophies).length - 1);
  const s = scripted(7, arenaIndex);
  return { ...s, trophies: { ...s.trophies, current: trophies, best: Math.max(trophies, s.trophies.best) }, flags: { ...s.flags, 'meta.ladderPlayed': true }, ...o };
}

function ladder(s: SaveDoc, format = 'short'): OpponentSpec {
  return M.pickOpponent(s, 'ladder', C, clock(), { format });
}

/** Rude, hateful or violent words and codes that may never appear in a tag (substrings, any case). */
const BANNED = [
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'slut', 'whore', 'bastard', 'piss', 'crap', 'damn', 'hell',
  'fag', 'nigg', 'retard', 'nazi', 'hitler', 'kkk', 'isis', 'rape', 'porn', 'sex', 'nude', 'boob', 'butt', 'kill',
  'murder', 'dead', 'death', 'blood', 'gun', 'bomb', 'terror', 'drug', 'weed', 'cocaine', 'beer', 'vodka', 'wine', 'drunk',
  'suicide', 'hate', 'slave', 'stupid', 'idiot', 'noob', 'loser',
];
/** Numbers that are hateful or rude codes (never as a tag's number). */
const BANNED_NUMBERS = ['14', '18', '28', '69', '83', '88', '311', '420', '666', '911', '1312', '1488'];
/** Words that would break the illusion or impersonate staff. */
const STAFF = ['ai', 'bot', 'cpu', 'npc', 'robot', 'computer', 'admin', 'mod', 'moderator', 'dev', 'official', 'staff', 'support', 'ageborn', 'gm'];
/** Celebrity single names and trademarks a tag must never be. */
const FAMOUS = ['messi', 'ronaldo', 'neymar', 'pele', 'shakira', 'rihanna', 'adele', 'drake', 'beyonce', 'zendaya', 'ninja', 'mrbeast', 'pikachu', 'mario', 'sonic', 'lego', 'fortnite', 'minecraft'];

/** The words of a tag: split on separators, case changes and digits. */
function words(tag: string): string[] {
  return tag
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z]+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 0);
}

function many(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) out.push(onlineTag(seedSfc32(`tags:${i}`), N).name);
  return out;
}

describe('deterministic: the same match always shows the same player', () => {
  it('the same save and seed give the same player, flag and look', () => {
    const s = at(1020);
    const o = ladder(s);
    expect(onlinePlayerFor(s, C, o.seed)).toEqual(onlinePlayerFor(s, C, o.seed));
    expect(asOnlineOpponent(s, C, o)).toEqual(asOnlineOpponent(s, C, o));
    expect(M.onlineOpponent(s, o, C)).toEqual(asOnlineOpponent(s, C, o));
  });

  it('every length of the same match finds the same player (one draw for every length)', () => {
    const s = at(640);
    const names = ['short', 'standard', 'full', 'last'].map((f) => asOnlineOpponent(s, C, ladder(s, f)).side.online!.name);
    expect(new Set(names).size).toBe(1);
  });

  it('the next match finds someone else', () => {
    const names = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      const s = at(900, { matchesPlayed: 10 + i });
      names.add(asOnlineOpponent(s, C, ladder(s)).side.online!.name);
    }
    expect(names.size).toBeGreaterThan(50);
  });
});

describe('believable, varied, family-friendly gamer tags', () => {
  const tags = many(6000);

  it('every tag fits the nameplates and uses plain characters', () => {
    for (const t of tags) {
      expect(t.length, t).toBeLessThanOrEqual(N.maxLength);
      expect(t.length, t).toBeGreaterThanOrEqual(3);
      expect(t, t).toMatch(/^[A-Za-z0-9_.]+$/);
    }
  });

  it('they vary: many shapes, some with numbers, some with given names from many countries', () => {
    expect(new Set(tags).size).toBeGreaterThan(4500);
    const withDigit = tags.filter((t) => /\d/.test(t)).length;
    expect(withDigit).toBeGreaterThan(1200);
    expect(withDigit).toBeLessThan(4500);
    expect(tags.some((t) => t.includes('_'))).toBe(true);
    expect(tags.some((t) => t.includes('.'))).toBe(true);
    expect(tags.some((t) => t === t.toLowerCase())).toBe(true);
    expect(tags.some((t) => /^xX.+Xx$/.test(t))).toBe(true);
    expect(tags.some((t) => /^(Sir|Lady)[A-Z]/.test(t))).toBe(true);
    const given = new Set(N.given.flatMap((g) => g.names.map((n) => n.toLowerCase())));
    const regions = new Set<number>();
    for (const t of tags) {
      const w = words(t)[0] ?? '';
      const r = N.given.findIndex((g) => g.names.some((n) => n.toLowerCase() === w));
      if (given.has(w) && r >= 0) regions.add(r);
    }
    expect(regions.size).toBe(N.given.length);
  });

  it('no word list holds a rude, hateful, violent, staff, AI, famous or General word', () => {
    const generalWords = new Set(Object.values(C.generals.list).flatMap((g) => words(g.id)));
    for (const key of Object.values(C.generals.list).map((g) => g.nameKey)) for (const w of words(key)) generalWords.add(w);
    const lists = [...N.adjectives, ...N.nouns, ...N.titles, ...N.given.flatMap((g) => g.names)];
    for (const w of lists) {
      const low = w.toLowerCase();
      for (const b of BANNED) expect(low.includes(b), `${w} contains ${b}`).toBe(false);
      expect(STAFF.includes(low), w).toBe(false);
      expect(FAMOUS.includes(low), w).toBe(false);
    }
    for (const n of N.numbers) for (const b of BANNED_NUMBERS) expect(n.includes(b), `${n} contains ${b}`).toBe(false);
    // General names: Old Grogg, Pip, Kettle, Moss, Ledger, Boomsworth, Ada & Ivo, Rook, Tempest, Warden, Echo.
    for (const g of ['grogg', 'pip', 'kettle', 'moss', 'ledger', 'boomsworth', 'ada', 'ivo', 'rook', 'tempest', 'warden', 'echo', 'quickstep']) {
      expect(lists.map((x) => x.toLowerCase()), g).not.toContain(g);
    }
  });

  it('no generated tag carries a banned word, code, staff word or the AI prefix', () => {
    for (const t of tags) {
      const low = t.toLowerCase();
      for (const b of BANNED) expect(low.includes(b), `${t}: ${b}`).toBe(false);
      const digits = t.replace(/\D/g, '');
      for (const b of BANNED_NUMBERS) expect(digits.includes(b), `${t}: ${b}`).toBe(false);
      for (const w of words(t)) expect(STAFF.includes(w), `${t}: ${w}`).toBe(false);
      expect(t.startsWith(C.names.aiPrefix.trim()), t).toBe(false);
      expect(/\bAI\b/.test(t), t).toBe(false);
    }
  });

  it('a tag that joins into blocked letters is drawn again ("xXMooseXx" holds "sex")', () => {
    const risky = { ...N, adjectives: ['Tiny'], nouns: ['Moose', 'Otter'], given: [{ flags: ['dk'], names: ['Lars'] }] };
    for (let i = 0; i < 400; i += 1) {
      const t = onlineTag(seedSfc32(`risky:${i}`), risky).name.toLowerCase();
      for (const b of N.blocked) expect(t.includes(b), t).toBe(false);
    }
    // The lists themselves never hold blocked letters, so no word is lost to the filter.
    for (const w of [...N.adjectives, ...N.nouns, ...N.titles, ...N.given.flatMap((g) => g.names)]) for (const b of N.blocked) expect(w.toLowerCase().includes(b), `${w}: ${b}`).toBe(false);
  });

  it('never shows the player their own name', () => {
    for (let i = 0; i < 300; i += 1) {
      const s = at(500, { matchesPlayed: i });
      const o = ladder(s);
      const name = onlinePlayerFor(s, C, o.seed).player.name;
      const same = { ...s, profile: { ...s.profile, name } };
      expect(onlinePlayerFor(same, C, o.seed).player.name.toLowerCase()).not.toBe(name.toLowerCase());
    }
  });
});

describe('trophies near the player, clamped to their arena', () => {
  it('the found player sits inside the window: ± the spread around the player, inside their arena, never below 0', () => {
    const spread = N.trophySpread;
    for (const trophies of [0, 30, 149, 150, 151, 260, 399, 400, 777, 1020, 1299, 1300, 1950, 2599, 2650, 3399, 3400, 4100, 6000]) {
      const s = at(trophies);
      const w = onlineTrophyWindow(s, C);
      const arena = C.arenas.list[s.arenaIndex]!;
      const next = C.arenas.list[s.arenaIndex + 1];
      expect(w.arena).toBe(arena.index);
      expect(w.min).toBeGreaterThanOrEqual(Math.max(0, arena.trophies));
      if (next) expect(w.max).toBeLessThan(next.trophies);
      for (let i = 0; i < 40; i += 1) {
        const p = onlinePlayerFor(s, C, 1000 + i).player;
        expect(p.arena).toBe(arena.index);
        expect(p.trophies).toBeGreaterThanOrEqual(w.min);
        expect(p.trophies).toBeLessThanOrEqual(w.max);
        expect(Math.abs(p.trophies - trophies)).toBeLessThanOrEqual(spread);
        expect(p.trophies).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('players close to your trophies are found most often', () => {
    const s = at(1000);
    let near = 0;
    for (let i = 0; i < 400; i += 1) if (Math.abs(onlinePlayerFor(s, C, i).player.trophies - 1000) <= 40) near += 1;
    expect(near).toBeGreaterThan(240);
  });
});

describe('a plausible look: avatar, banner, flag, connection', () => {
  const parts = new Map(C.cosmetics.avatar.parts.map((p) => [p.id, p]));
  const flags = new Set(C.cosmetics.collections.items.filter((x) => x.collection === 'nationalFlag').map((x) => `nationalFlag.${x.id}`));

  it('every avatar part exists and fills its own slot, every tint is in range, wearables only where they could be earned', () => {
    let wearables = 0;
    for (const trophies of [10, 420, 1400, 3500]) {
      for (let i = 0; i < 80; i += 1) {
        const s = at(trophies);
        const p = onlinePlayerFor(s, C, i * 31 + trophies).player;
        const look = p.avatar.look!;
        for (const slot of C.cosmetics.avatar.slots) {
          const part = parts.get(look[slot]!);
          expect(part, `${slot} ${look[slot]}`).toBeDefined();
          expect(part!.slot).toBe(slot);
          if (part!.rarity !== 'starter') {
            wearables += 1;
            if (part!.source.kind === 'road') expect(p.trophies).toBeGreaterThanOrEqual(part!.source.trophies);
          }
        }
        const tn = C.cosmetics.avatar.tints;
        for (const k of ['skin', 'hair', 'eyes', 'cloth'] as const) {
          expect(p.avatar.tints![k]).toBeGreaterThanOrEqual(0);
          expect(p.avatar.tints![k]).toBeLessThan(tn[k]);
        }
      }
    }
    // Real players wear things they won.
    expect(wearables).toBeGreaterThan(200);
  });

  it('higher arenas wear more and rarer things', () => {
    const count = (trophies: number) => {
      let n = 0;
      for (let i = 0; i < 200; i += 1) {
        const look = onlinePlayerFor(at(trophies), C, i).player.avatar.look!;
        n += Object.values(look).filter((id) => parts.get(id!)?.rarity !== 'starter').length;
      }
      return n;
    };
    expect(count(3500)).toBeGreaterThan(count(20));
  });

  it('a banner their arena gave them, a real national flag or none, 2-3 connection bars', () => {
    let none = 0;
    const seen = new Set<string>();
    for (let i = 0; i < 400; i += 1) {
      const s = at(i * 9);
      const { player, nationalFlag } = onlinePlayerFor(s, C, i);
      const banner = C.cosmetics.banners.find((b) => b.id === player.banner);
      expect(banner, player.banner).toBeDefined();
      expect(banner!.arena).toBeLessThanOrEqual(player.arena);
      expect([2, 3]).toContain(player.bars);
      if (nationalFlag === null) none += 1;
      else {
        expect(flags.has(nationalFlag), nationalFlag).toBe(true);
        seen.add(nationalFlag);
      }
    }
    expect(none).toBeGreaterThan(40);
    expect(none).toBeLessThan(260);
    expect(seen.size).toBeGreaterThan(25);
  });
});

describe('presentation only: the bot plays exactly as matchmaking picked it', () => {
  it('everything that plays is kept; the name, the look and the online player are set', () => {
    for (let i = 0; i < 40; i += 1) {
      const s = at(300 + i * 83, { matchesPlayed: 5 + i });
      const o = ladder(s);
      const shown = asOnlineOpponent(s, C, o);
      expect(shown.isAI).toBe(true);
      expect(shown.side.isBot).toBe(true);
      expect(shown.generalId).toBe(o.generalId);
      expect(shown.tier).toBe(o.tier);
      expect(shown.level).toBe(o.level);
      expect(shown.format).toBe(o.format);
      expect(shown.seed).toBe(o.seed);
      expect(shown.warmUp).toBe(o.warmUp);
      expect(shown.modifiers).toEqual(o.modifiers);
      expect(shown.disclosures).toEqual(o.disclosures);
      expect(shown.side.loadouts).toEqual(o.side.loadouts);
      expect(shown.side.levels).toEqual(o.side.levels);
      expect(shown.side.skins).toEqual(o.side.skins);
      expect(shown.side.sideMods).toEqual(o.side.sideMods);
      const who = shown.side.online!;
      expect(shown.displayName).toBe(who.name);
      expect(shown.side.label).toBe(who.name);
      expect(shown.side.look?.nationalFlag === null || flags(shown.side.look?.nationalFlag)).toBe(true);
    }
  });

  it('a Ranked result pays and counts like the Ladder, but the profile counts no AI tier for it', () => {
    const c = clock();
    const s = at(450, { matchesPlayed: 12 });
    const o = ladder(s);
    const shown = asOnlineOpponent(s, C, o);
    for (const res of ['win', 'loss', 'draw'] as const) {
      const plain = M.applyMatchResult(s, matchInput('ladder', res, o), C, c);
      const ranked = M.applyMatchResult(s, matchInput('ladder', res, shown), C, c);
      // The same rewards, trophies, MMR, streaks and match counts.
      expect(ranked.rewards).toEqual(plain.rewards);
      expect(ranked.save.trophies).toEqual(plain.save.trophies);
      expect(ranked.save.mmr).toBe(plain.save.mmr);
      expect(ranked.save.lossStreak).toBe(plain.save.lossStreak);
      expect(ranked.save.matchesPlayed).toBe(plain.save.matchesPlayed);
      expect({ ...ranked.save.stats, winsByTier: [], lossesByTier: [] }).toEqual({ ...plain.save.stats, winsByTier: [], lossesByTier: [] });
      // "Results by AI tier" and "Highest AI tier beaten" stay as they were.
      expect(ranked.save.stats.winsByTier).toEqual(s.stats.winsByTier);
      expect(ranked.save.stats.lossesByTier).toEqual(s.stats.lossesByTier);
    }
    // The labelled Ladder (the Mode select card) still counts its tier.
    expect(M.applyMatchResult(s, matchInput('ladder', 'loss', o), C, c).save.stats.lossesByTier[o.tier]).toBe((s.stats.lossesByTier[o.tier] ?? 0) + 1);
  });

  it('the other modes are untouched by meta (no online player)', () => {
    const s = at(900);
    for (const mode of ['ladder', 'daily', 'conquest', 'tutorial', 'warPath'] as const) {
      expect(M.pickOpponent(s, mode, C, clock()).side.online).toBeUndefined();
    }
    expect(M.pickOpponent(s, 'skirmish', C, clock(), { skirmish: { generalId: 'pip', tier: 2, format: 'short', standardLevels: false } }).side.online).toBeUndefined();
  });
});

function flags(k: string | null | undefined): boolean {
  return !!k && C.cosmetics.collections.items.some((x) => x.collection === 'nationalFlag' && `nationalFlag.${x.id}` === k);
}
