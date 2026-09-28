import { describe, expect, it } from 'vitest';
import { BACKUP_REMINDER_MS } from '../defaults';
import { backupReminderDue, isFirstWin, markExported, persist } from '../durability';
import { currentFixture } from './helpers';

describe('persist() (DESIGN B8: navigator.storage.persist() on the first win)', () => {
  it('reports each browser answer and never throws', async () => {
    expect(await persist({ persisted: async () => true, persist: async () => true })).toBe('persisted');
    expect(await persist({ persisted: async () => false, persist: async () => true })).toBe('granted');
    expect(await persist({ persist: async () => false })).toBe('denied');
    expect(await persist({ persist: () => Promise.reject(new Error('nope')) })).toBe('unsupported');
    expect(await persist({})).toBe('unsupported');
    expect(await persist(null)).toBe('unsupported');
  });

  it('asks only when the profile gets its first win', () => {
    const noWins = currentFixture();
    noWins.stats.wins = 0;
    const oneWin = currentFixture();
    oneWin.stats.wins = 1;
    const twoWins = currentFixture();
    twoWins.stats.wins = 2;
    expect(isFirstWin(noWins, oneWin)).toBe(true);
    expect(isFirstWin(null, oneWin)).toBe(true);
    expect(isFirstWin(noWins, noWins)).toBe(false);
    expect(isFirstWin(oneWin, twoWins)).toBe(false);
  });
});

describe('backup reminder (DESIGN B8: last export more than 5 days old)', () => {
  it('counts from the last export', () => {
    const doc = { ...currentFixture(), lastExportAt: 1_000 };
    expect(backupReminderDue(doc, 1_000 + BACKUP_REMINDER_MS)).toBe(false);
    expect(backupReminderDue(doc, 1_000 + BACKUP_REMINDER_MS + 1)).toBe(true);
  });

  it('counts from the profile creation before any export', () => {
    const doc = { ...currentFixture(), createdAt: 5_000, lastExportAt: null };
    expect(backupReminderDue(doc, 5_000 + BACKUP_REMINDER_MS)).toBe(false);
    expect(backupReminderDue(doc, 5_000 + BACKUP_REMINDER_MS + 1)).toBe(true);
  });

  it('markExported stamps the export time without touching the input', () => {
    const doc = currentFixture();
    const out = markExported(doc, 42);
    expect(out.lastExportAt).toBe(42);
    expect(doc.lastExportAt).toBe(currentFixture().lastExportAt);
    expect(backupReminderDue(out, 42 + BACKUP_REMINDER_MS)).toBe(false);
  });
});
