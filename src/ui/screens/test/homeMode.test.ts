/**
 * The mode switcher's model (spec "online-first Battle hub" 1.3, 2026-10-01): Battle plays the mode on
 * the switcher; the lengths and their locks; the plate's "up to" minutes.
 */
import { content } from '@/content';
import { describe, expect, it } from 'vitest';
import { midGameSave, newPlayerSave } from '../fixtures/saves';
import {
  battleRequest,
  homeMode,
  homeModeFlags,
  ladderFormat,
  ladderFormatFlags,
  lengthOptions,
  minutesText,
  skirmishSetup,
  skirmishSetupFlags,
} from '../model/homeMode';
import { ladderWin } from '../model/progress';

const mid = () => midGameSave(content);

describe('the mode switcher (1.3)', () => {
  it('defaults to the Ladder, remembers a picked mode, and falls back when a mode is not open', () => {
    const s = mid();
    expect(homeMode(s, content)).toBe('ladder');
    const q = { ...s, flags: { ...s.flags, ...homeModeFlags('quick') } };
    expect(homeMode(q, content)).toBe('quick');
    // Skirmish needs a played setup first.
    const k = { ...s, flags: { ...s.flags, ...homeModeFlags('skirmish') } };
    expect(homeMode(k, content)).toBe('ladder');
    const set = { ...k, flags: { ...k.flags, ...skirmishSetupFlags(k, { generalId: 'moss', format: 'full', standardLevels: true }) } };
    expect(homeMode(set, content)).toBe('skirmish');
    expect(skirmishSetup(set, content)).toMatchObject({ generalId: 'moss', format: 'full', standardLevels: true });
    const req = battleRequest(set, content, 1);
    expect(req).toMatchObject({ mode: 'skirmish', options: { generalId: 'moss', format: 'full', standardLevels: true } });
    // A new player has no modes yet: Battle plays the Ladder.
    const n = newPlayerSave(content);
    expect(homeMode({ ...n, flags: { ...n.flags, ...homeModeFlags('quick') } }, content)).toBe('ladder');
  });

  it('Battle plays the remembered length; Last Base Standing only when picked', () => {
    const s = mid();
    expect(ladderFormat(s, content)).toBe('short');
    const last = { ...s, flags: { ...s.flags, ...ladderFormatFlags(content, 'last') } };
    expect(ladderFormat(last, content)).toBe('last');
    expect(battleRequest(last, content, 1)).toEqual({ mode: 'ladder', format: 'last' });
  });

  it('the picker shows all four lengths, all open from Arena 1; a locked one would name the arena that opens it', () => {
    // Owner decision 2026-10-03: every length is open on the Ladder from Arena 1.
    const n = newPlayerSave(content);
    const opts = lengthOptions(n, content);
    expect(opts.map((o) => o.format)).toEqual(['short', 'standard', 'full', 'last']);
    expect(opts.map((o) => o.open)).toEqual([true, true, true, true]);
    expect(opts.map((o) => o.opensAt?.arena)).toEqual([1, 1, 1, 1]);
    // A new Arena 1 player's Battle still plays the shortest timed length.
    expect(ladderFormat(n, content)).toBe('short');
    // The lock stays for an arena table that gates a length (Long War and No clock from Arena 3).
    const gated = { ...content, arenas: { ...content.arenas, list: content.arenas.list.map((a) => ({ ...a, ladderFormats: a.index < 3 ? a.ladderFormats.filter((f) => f === 'short' || f === 'standard') : a.ladderFormats })) } };
    const locked = lengthOptions(n, gated);
    expect(locked.map((o) => o.open)).toEqual([true, true, false, false]);
    expect(locked[3]!.opensAt).toEqual({ arena: 3, trophies: 400 });
  });

  it('quotes the upper bound in whole and half minutes', () => {
    expect(minutesText(content.formats['short']!.finalBellMs!)).toBe('8½');
    expect(minutesText(content.formats['standard']!.finalBellMs!)).toBe('12½');
    expect(minutesText(content.formats['full']!.finalBellMs!)).toBe('17½');
    expect(minutesText(content.formats['last']!.endByMs!)).toBe('25½');
  });

  it('every length shows its own win from Arena 1, No clock the most (owner decision 2026-10-03)', () => {
    const s = mid();
    for (const current of [0, 100, s.trophies.current]) {
      const at = { ...s, trophies: { ...s.trophies, current } };
      expect((['short', 'standard', 'full', 'last'] as const).map((f) => ladderWin(at, content, f).trophies), String(current)).toEqual([30, 36, 46, 48]);
    }
  });
});
