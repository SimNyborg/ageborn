/**
 * The pure view models behind the screens: numbers must match DESIGN (A3, A6.3, A6.5, A6.6,
 * A6.10) and the fixture states.
 */
import { content } from '@/content';
import type { Loadout, ReplayDoc } from '@/contracts';
import { fakeSaveDoc } from '@/contracts/fakes/saveStore';
import { i18n } from '@/i18n';
import { describe, expect, it } from 'vitest';
import { fixtureReplays, fixtureResult } from '../fixtures/matches';
import { FIXTURE_NOW, maxedSave, midGameSave, newPlayerSave } from '../fixtures/saves';
import { atLevel, cardTile, collectionProgress, levelMultBp, unitStats, upgradeCost, upgradeState } from '../model/cards';
import { filterCards, NO_FILTER } from '../model/collection';
import { opponentName, personalityOf } from '../model/opponent';
import { blockers, planIssueText, requestFormat } from '../model/match';
import { reasonKey } from '../model/reasons';
import {
  agesAwaitingAntiArmor,
  assignCard,
  clearSlot,
  firstEmptySlot,
  loadoutAvgLevel,
  nextFormat,
  normalizeLoadout,
  planAvgLevel,
} from '../model/plan';
import { historyRows, profileView } from '../model/profile';
import { chargesView, conquestView, dailyCapsuleView, questViews, roadNodes, roadProgress, trayCapsules, unlocks, warChestView } from '../model/progress';
import { earnedCapsule, resultKind, stagedRewards } from '../model/result';
import { needsBackup } from '../settings/SettingsScreen';

const t = (k: string, p?: Record<string, string | number>) => i18n.t(k, p);
const HOUR = 3600 * 1000;

describe('cards (A6.6 upgrades, A5.1 level scaling)', () => {
  it('upgrade costs follow the A6.6 table', () => {
    expect(upgradeCost(content, 'common', 1)).toEqual({ copies: 2, amber: 20 });
    expect(upgradeCost(content, 'common', 9)).toEqual({ copies: 45, amber: 1700 });
    expect(upgradeCost(content, 'rare', 4)).toEqual({ copies: 6, amber: 200 });
    expect(upgradeCost(content, 'epic', 6)).toEqual({ copies: 5, amber: 550 });
    expect(upgradeCost(content, 'legendary', 9)).toEqual({ copies: 2, amber: 1700 });
    expect(upgradeCost(content, 'legendary', 10)).toBeNull();
  });

  it('each level adds +5% to HP and damage', () => {
    expect(levelMultBp(content, 1)).toBe(10000);
    expect(levelMultBp(content, 7)).toBe(13000);
    expect(atLevel(content, 160, 7)).toBe(208);
    const rows = unitStats(content, content.units['bonker']!, 1);
    const hp = rows.find((r) => r.id === 'hp')!;
    expect(hp.value).toBe(160);
    expect(hp.next).toBe(168);
    const dps = rows.find((r) => r.id === 'dps')!;
    expect(dps.value).toBe(20);
  });

  it('shows no next-level preview at level 10', () => {
    const rows = unitStats(content, content.units['bonker']!, 10);
    expect(rows.every((r) => r.next === null)).toBe(true);
  });

  it('tile data: ownership, copies needed, readiness, foils', () => {
    const s = midGameSave(content);
    const pikeman = cardTile(s, content, 'pikeman', t)!;
    expect(pikeman.owned).toBe(true);
    expect(pikeman.needed).toBe(content.rarities.cards.rare.upgradeCopies[4]);
    expect(pikeman.upgradeReady).toBe(true);
    const bonker = cardTile(s, content, 'bonker', t)!;
    expect(bonker.foil).toBe('silver');
    expect(bonker.skin).toBe('pumpkin_head');
    const ursa = cardTile(s, content, 'ursa_paladin', t)!;
    expect(ursa.owned).toBe(false);
    const power = cardTile(s, content, 'meteor_shower', t)!;
    expect(power.kind).toBe('power');
    expect(power.rarity).toBeNull();
    expect(power.needed).toBeNull();
  });

  it('upgrade state needs copies and Amber', () => {
    const s = midGameSave(content);
    const u = upgradeState(s, content, 'pikeman')!;
    expect(u.copiesReady).toBe(true);
    expect(u.affordable).toBe(s.currencies.amber >= u.cost!.amber);
    const poor = { ...s, currencies: { amber: 0, dust: 0 } };
    expect(upgradeState(poor, content, 'pikeman')!.affordable).toBe(false);
    expect(upgradeState(maxedSave(content), content, 'bonker')!.maxed).toBe(true);
  });

  it('collection completion counts units and turrets', () => {
    expect(collectionProgress(maxedSave(content), content)).toEqual({ owned: 88, total: 88 });
    const n = collectionProgress(newPlayerSave(content), content);
    expect(n.total).toBe(88);
    // 24 unit and 16 turret Commons, plus Spear Hunter, Phalangite, Pikeman and Grenadier
    expect(n.owned).toBe(24 + 16 + 4);
  });
});

describe('War Plan edits (A3)', () => {
  const base: Loadout = { units: ['bonker', 'pebbler', 'tuskback', null, null], turrets: ['rock_tosser', null], power: 'stampede' };

  it('puts a card in a slot and never duplicates it', () => {
    const moved = assignCard(content, base, { kind: 'unit', index: 0 }, 'pebbler');
    expect(moved.units).toEqual(['pebbler', 'bonker', 'tuskback', null, null]);
    const added = assignCard(content, base, { kind: 'unit', index: 3 }, 'spear_hunter');
    expect(added.units).toEqual(['bonker', 'pebbler', 'tuskback', 'spear_hunter', null]);
    const intoEmpty = assignCard(content, base, { kind: 'unit', index: 4 }, 'bonker');
    expect(intoEmpty.units).toEqual([null, 'pebbler', 'tuskback', null, 'bonker']);
  });

  it('rejects a card of the wrong kind and handles turrets and the power', () => {
    expect(assignCard(content, base, { kind: 'unit', index: 0 }, 'rock_tosser')).toBe(base);
    expect(assignCard(content, base, { kind: 'turret', index: 1 }, 'angry_beehive').turrets).toEqual(['rock_tosser', 'angry_beehive']);
    expect(assignCard(content, base, { kind: 'power' }, 'meteor_shower').power).toBe('meteor_shower');
  });

  it('clears slots and finds the first empty one', () => {
    expect(clearSlot(base, { kind: 'unit', index: 1 }).units).toEqual(['bonker', null, 'tuskback', null, null]);
    expect(clearSlot(base, { kind: 'power' }).power).toBe('stampede');
    expect(firstEmptySlot(content, base, 'spear_hunter')).toEqual({ kind: 'unit', index: 3 });
    expect(firstEmptySlot(content, base, 'angry_beehive')).toEqual({ kind: 'turret', index: 1 });
    expect(firstEmptySlot(content, normalizeLoadout({ units: [], turrets: [], power: 'x' }), 'bonker')).toEqual({ kind: 'unit', index: 0 });
  });

  it('averages levels over the loadout and over the format ages', () => {
    const s = midGameSave(content);
    expect(loadoutAvgLevel(s, content, base)).toBeCloseTo((7 + 6 + 6 + 5) / 4, 5);
    const plan = s.warPlans[0]!;
    expect(nextFormat(s, content)).toBe('full');
    const avg = planAvgLevel(s, content, plan, content.formats.full!.ages)!;
    expect(avg).toBeGreaterThan(1);
    expect(planAvgLevel(maxedSave(content), content, maxedSave(content).warPlans[0]!, content.formats.full!.ages)).toBe(10);
  });
});

describe('progress (A3, A6.3, A6.7, A6.10)', () => {
  it('unlocks the War Plan and Skirmish after the training match, the format picker in Arena 2, Conquest in Arena 3', () => {
    const n = { ...newPlayerSave(content), matchesPlayed: 0 };
    expect(unlocks(n, content)).toMatchObject({
      warPlan: false,
      skirmish: false,
      conquest: false,
      formatPicker: false,
      ladderFormats: ['short'],
    });
    expect(unlocks({ ...n, matchesPlayed: 1 }, content)).toMatchObject({ warPlan: true, skirmish: true });
    expect(unlocks({ ...n, arenaIndex: 1 }, content)).toMatchObject({
      formatPicker: true,
      conquest: false,
      ladderFormats: ['short', 'standard'],
    });
    expect(unlocks({ ...n, arenaIndex: 2 }, content).conquest).toBe(true);
  });

  it('counts down to the next charge (+1 every 6 h, bank of 28, A15.4)', () => {
    const mid = midGameSave(content);
    expect(chargesView(mid, content, FIXTURE_NOW)).toEqual({ charges: 5, max: 28, nextInMs: 4 * HOUR, free: 0 });
    expect(chargesView(newPlayerSave(content), content, FIXTURE_NOW)).toMatchObject({ charges: 12, nextInMs: 6 * HOUR, free: 8 });
  });

  it('shows the Daily Capsule bank and timer', () => {
    expect(dailyCapsuleView(midGameSave(content), content, FIXTURE_NOW)).toEqual({ unlocked: true, bank: 1, max: 3, nextInMs: 14 * HOUR });
    expect(dailyCapsuleView(maxedSave(content), content, FIXTURE_NOW)).toEqual({ unlocked: true, bank: 3, max: 3, nextInMs: null });
  });

  it('unlocks the Daily Capsule right after capsule 2 is opened (A6.3)', () => {
    const n = newPlayerSave(content);
    const fresh = { ...n, pity: { ...n.pity, opened: 1 }, capsules: { ...n.capsules, dailyBank: 0, dailyNextAt: null } };
    expect(dailyCapsuleView(fresh, content, FIXTURE_NOW).unlocked).toBe(false);
    // Capsule 2 opened, the first Daily Capsule claimed, the 04:00 timer not started yet.
    const claimed = { ...fresh, pity: { ...fresh.pity, opened: 2 } };
    expect(dailyCapsuleView(claimed, content, FIXTURE_NOW)).toEqual({ unlocked: true, bank: 0, max: 3, nextInMs: null });
  });

  it('orders the tray best tier first', () => {
    expect(trayCapsules(midGameSave(content), content).map((c) => c.tier)).toEqual(['jade', 'silver', 'bronze', 'bronze', 'clay']);
  });

  it('builds quest rows with progress, done and claimed', () => {
    const q = questViews(midGameSave(content), content);
    expect(q.daily.map((x) => [x.def.id, x.progress, x.target, x.done, x.claimed])).toEqual([
      ['win_2', 2, 2, true, false],
      ['train_30', 18, 30, false, false],
      ['turret_kills_20', 20, 20, true, true],
    ]);
    expect(warChestView(midGameSave(content), content)).toEqual({ wins: 9, of: content.quests.weekly.target });
    expect(q.rerollLeft).toBe(true);
  });

  it('marks Trophy Road nodes claimed, claimable or locked by best trophies', () => {
    const s = midGameSave(content);
    const nodes = roadNodes(s, content);
    expect(nodes).toHaveLength(60);
    const state = (tr: number) => nodes.find((n) => n.node.trophies === tr)!.state;
    expect(state(900)).toBe('claimed');
    expect(state(950)).toBe('claimable');
    expect(state(1050)).toBe('claimable');
    expect(state(1100)).toBe('locked');
    expect(nodes.find((n) => n.node.trophies === 150)!.gate?.index).toBe(2);
    expect(roadProgress(s, content)).toMatchObject({ best: 1080, from: 1050, claimable: 3 });
    expect(roadProgress(s, content).next?.trophies).toBe(1100);
    expect(roadProgress(maxedSave(content), content).next).toBeNull();
  });

  it('opens Conquest Generals in order and counts stars and milestones', () => {
    const v = conquestView(midGameSave(content), content);
    expect(v.unlocked).toBe(true);
    expect(v.entries.map((e) => e.open)).toEqual([true, true, true, true, false, false, false, false, false]);
    expect(v.totalStars).toBe(6);
    expect(v.milestones.map((m) => m.reached)).toEqual([false, false, false]);
    const max = conquestView(maxedSave(content), content);
    expect(max.totalStars).toBe(27);
    expect(max.milestones.every((m) => m.reached && m.claimed)).toBe(true);
    expect(conquestView(newPlayerSave(content), content).unlocked).toBe(false);
  });
});

describe('profile and history (A6.1)', () => {
  it('summarises the profile', () => {
    const v = profileView(midGameSave(content), content);
    expect(v.favourite).toBe('bonker');
    expect(v.legendaries).toBe(1);
    expect(v.legendariesTotal).toBe(8);
    expect(v.byTier[0]).toEqual({ tier: 0, wins: 5, losses: 1 });
    expect(v.conquestStars).toBe(6);
    const raw = profileView(fakeSaveDoc(), content);
    expect(raw.favourite).toBeNull();
    expect(raw.byTier).toEqual([]);
  });

  it('reads results from the player side and marks older replays', () => {
    const rows = historyRows(fixtureReplays(content, 20), content.hash);
    expect(rows).toHaveLength(20);
    expect(rows[0]).toMatchObject({ result: 'win', isAI: true });
    expect(rows[1]!.result).toBe('loss');
    expect(rows[3]!.result).toBe('draw');
    expect(rows[19]!.playable).toBe(false);
    const flipped: ReplayDoc = {
      ...fixtureReplays(content, 1)[0]!,
      sides: [fixtureReplays(content, 1)[0]!.sides[1], fixtureReplays(content, 1)[0]!.sides[0]],
    };
    expect(historyRows([flipped], content.hash)[0]!.result).toBe('loss');
  });
});

describe('result (A9 #7)', () => {
  it('reads victory, defeat and draw from the player side', () => {
    expect(resultKind(fixtureResult(content, 'win').input)).toBe('win');
    expect(resultKind(fixtureResult(content, 'loss').input)).toBe('loss');
    expect(resultKind(fixtureResult(content, 'draw').input)).toBe('draw');
  });

  it('stages rewards in order and finds the earned capsule', () => {
    const r = fixtureResult(content, 'win');
    expect(stagedRewards(r.rewards).map((x) => x.kind)).toEqual(['trophies', 'amber', 'capsule', 'quest', 'quest']);
    expect(earnedCapsule(r.rewards)).toBe('cap-mid-1');
    expect(earnedCapsule(fixtureResult(content, 'loss').rewards)).toBeNull();
  });
});

describe('misc', () => {
  it('names Generals from content and commanders as given', () => {
    expect(opponentName({ generalId: 'kettle', displayName: 'whatever' }, content, t)).toBe('Captain Kettle');
    expect(opponentName({ generalId: 'commander', displayName: 'AI · Brakka Stonejaw' }, content, t)).toBe('AI · Brakka Stonejaw');
  });

  it("finds a procedural commander's personality General (A7.4)", () => {
    expect(personalityOf({ generalId: 'kettle' }, content)?.id).toBe('kettle');
    expect(personalityOf({ generalId: 'commander:moss:rock_tosser' }, content)?.id).toBe('moss');
    expect(personalityOf({ generalId: 'commander:nobody:' }, content)).toBeNull();
    expect(personalityOf({ generalId: 'commander' }, content)).toBeNull();
  });

  it('knows which format a match request plays', () => {
    expect(requestFormat({ mode: 'ladder', format: 'standard' }, content)).toBe('standard');
    expect(requestFormat({ mode: 'skirmish', options: { generalId: 'echo', tier: 1, format: 'short', standardLevels: false }, speed: 1 }, content)).toBe(
      'short',
    );
    expect(requestFormat({ mode: 'daily' }, content)).toBe('standard');
    // A17.18 owner decision: Conquest plays Standard War
    expect(requestFormat({ mode: 'conquest', general: 'pip' }, content)).toBe('standard');
    expect(requestFormat({ mode: 'tutorial', match: 1 }, content)).toBeNull();
  });

  it('only errors block a match; findings read as text', () => {
    const issues = [
      { age: 'stone' as const, severity: 'warning' as const, code: 'noAntiArmor', messageKey: 'ui.advisor.noAntiArmor' },
      { age: 'medieval' as const, severity: 'error' as const, code: 'noTurret', messageKey: 'ui.advisor.noTurret' },
    ];
    expect(blockers(issues).map((i) => i.code)).toEqual(['noTurret']);
    expect(planIssueText(issues[1]!, t)).toBe('Medieval Age needs a turret.');
    expect(planIssueText({ ...issues[0]!, messageKey: 'ui.advisor.notAKey' }, t)).toBe('Stone Age loadout needs a look.');
  });

  it('turns failure reasons into toast keys, never raw codes', () => {
    expect(reasonKey('amber')).toBe('ui.error.notEnoughAmber');
    expect(reasonKey('dust')).toBe('ui.error.notEnoughDust');
    expect(reasonKey('maxLevel')).toBe('ui.error.generic');
    expect(reasonKey('someNewReason')).toBe('ui.error.generic');
  });

  it('notes the ages still waiting for their Anti-armor card (A3, Skirmish)', () => {
    const n = newPlayerSave(content);
    // The new player has Spear Hunter, Phalangite, Pikeman and Grenadier; Harpoon Gunner and Bazooka Trooper
    // arrive at Arena 2, Rail Gunner and Graviton Halberdier at Arena 3 (A17.13).
    expect(agesAwaitingAntiArmor(n, content, 'short')).toEqual([]);
    // A18.3.4: Standard War is Stone to Industrial, Full War Stone to Future
    expect(agesAwaitingAntiArmor(n, content, 'standard')).toEqual(['industrial']);
    expect(agesAwaitingAntiArmor(n, content, 'full')).toEqual(['industrial', 'modern', 'future']);
    const early = { ...n, collection: { ...n.collection } };
    delete early.collection['pikeman'];
    expect(agesAwaitingAntiArmor(early, content, 'short')).toEqual(['medieval']);
    expect(agesAwaitingAntiArmor(midGameSave(content), content, 'full')).toEqual([]);
  });

  it('filters the collection by age, role, rarity and ownership', () => {
    const s = midGameSave(content);
    expect(filterCards(s, content, NO_FILTER)).toHaveLength(56 + 32 + 16);
    expect(filterCards(s, content, { ...NO_FILTER, role: 'turret' })).toHaveLength(32);
    expect(filterCards(s, content, { ...NO_FILTER, role: 'power' })).toHaveLength(16);
    expect(filterCards(s, content, { ...NO_FILTER, age: 'stone', rarity: 'legendary' })).toEqual(['mammoth_matriarch']);
    expect(filterCards(s, content, { ...NO_FILTER, age: 'bronze', rarity: 'legendary' })).toEqual(['bronze_colossus']);
    expect(filterCards(s, content, { ...NO_FILTER, own: 'missing', rarity: 'legendary' })).toHaveLength(7);
    expect(filterCards(s, content, { ...NO_FILTER, role: 'antiArmor' })).toEqual([
      'spear_hunter',
      'phalangite',
      'pikeman',
      'grenadier',
      'harpoon_gunner',
      'bazooka_trooper',
      'rail_gunner',
      'emp_saboteur',
      'graviton_halberdier',
    ]);
  });

  it('reminds to back up after 5 days without an export (B8)', () => {
    const day = 24 * HOUR;
    expect(needsBackup(null, FIXTURE_NOW - day, FIXTURE_NOW)).toBe(false);
    expect(needsBackup(null, FIXTURE_NOW - 6 * day, FIXTURE_NOW)).toBe(true);
    expect(needsBackup(FIXTURE_NOW - 4 * day, 0, FIXTURE_NOW)).toBe(false);
    expect(needsBackup(FIXTURE_NOW - 9 * day, 0, FIXTURE_NOW)).toBe(true);
  });
});
