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

  it('the picker shows all four lengths; locked ones name the arena that opens them', () => {
    const s = mid();
    const a2 = { ...s, trophies: { ...s.trophies, current: 220, best: 220 }, arenaIndex: 1 };
    const opts = lengthOptions(a2, content);
    expect(opts.map((o) => o.format)).toEqual(['short', 'standard', 'full', 'last']);
    // Owner request 2026-10-03: every length is open from Arena 1.
    expect(opts.map((o) => o.open)).toEqual([true, true, true, true]);
    expect(opts[3]!.opensAt).toEqual({ arena: 1, trophies: 0 });
    // A locked length (content whose Arena 2 does not list it, the table before that request) names its arena.
    const old = { ...content, arenas: { ...content.arenas, list: content.arenas.list.map((a) => (a.index < 3 ? { ...a, ladderFormats: a.ladderFormats.filter((f) => f === 'short' || (a.index === 2 && f === 'standard')) } : a)) } };
    const locked = lengthOptions(a2, old);
    expect(locked.map((o) => o.open)).toEqual([true, true, false, false]);
    expect(locked[3]!.opensAt).toEqual({ arena: 3, trophies: 400 });
  });

  it('quotes the upper bound in whole and half minutes', () => {
    expect(minutesText(content.formats['short']!.finalBellMs!)).toBe('8½');
    expect(minutesText(content.formats['standard']!.finalBellMs!)).toBe('12½');
    expect(minutesText(content.formats['full']!.finalBellMs!)).toBe('17½');
    expect(minutesText(content.formats['last']!.endByMs!)).toBe('25½');
  });

  it('Last Base Standing pays no trophies at any count (the plate never promises any)', () => {
    const s = mid();
    expect(ladderWin(s, content, 'last').trophies).toBe(0);
    expect(ladderWin({ ...s, trophies: { ...s.trophies, current: 100 } }, content, 'last').trophies).toBe(0);
  });
});
