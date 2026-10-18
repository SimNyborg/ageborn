/**
 * G7 (Safari memory): the unit sheets a battle holds. Per side its current age's deck with everything it
 * can field (summons, dismounting riders, a camp's levy, paradrops), its next age's from 70% of the evolve
 * bar or an Ascension (with the age's Vanguard), its queue and the units on the field; the battle view sends
 * that set to the provider's hold, again when it changes, and lets go when it is destroyed. Each visual
 * carries how soon it may be drawn (2026-10-18, the provider's memory governor plans HD by it): the lane,
 * then what appears within seconds (queues, what units on the lane bring on, an Ascension's Vanguard and
 * conversions, paradrops and levies), then the current age's deck, then the next age's.
 */
import type { AgeId, CardId, Loadout, MatchConfig, SideConfig } from '@/contracts';
import { content } from '@/content';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { createSim } from '@/sim';
import { describe, expect, it } from 'vitest';
import { BattleView } from '../battleView';
import { ageOrder, xpThreshold } from '../hudModel';
import { cardVisual, heldVisuals, HOLD_RANK, nearEvolve, sideAgeCards, type HeldVisual } from '../matchArt';

const units = Object.values(content.units);
const summoner = units.find((u) => !u.hidden && u.abilities.some((a) => a.kind === 'summon'));
const rider = units.find((u) => !u.hidden && u.abilities.some((a) => a.kind === 'riders'));
const paradrop = Object.values(content.powers).find((p) => p.effect.kind === 'paradrop');
const forts = (content as unknown as { forts: Record<CardId, { id: CardId; age: AgeId; fortKind: string; camp?: { spawn: CardId } }> }).forts;
const camp = Object.values(forts).find((f) => f.fortKind === 'camp' && f.camp);

function loadout(age: AgeId, extra: Partial<Loadout> = {}): Loadout {
  const mine = units.filter((u) => u.age === age && !u.hidden).slice(0, 3);
  return { units: [...mine.map((u) => u.id), null, null, null, null], turrets: [null, null], powers: { home: null, field: null }, ...extra };
}

function config(o: { side0?: Partial<Record<AgeId, Loadout>>; skins?: Record<string, string> } = {}): MatchConfig {
  const ages: AgeId[] = ['stone', 'bronze', 'medieval'];
  const side = (label: string, los?: Partial<Record<AgeId, Loadout>>): SideConfig => ({
    label,
    isBot: true,
    loadouts: los ?? Object.fromEntries(ages.map((a) => [a, loadout(a)])),
    levels: {},
    skins: o.skins ?? {},
  });
  return { seed: 7, format: 'short', content, sides: [side('a', o.side0), side('b')] };
}

describe('sideAgeCards (G7)', () => {
  it('follows summons, dismounting riders, a camp levy and paradrops; the Vanguard only for an age evolved into', () => {
    expect(summoner && rider && paradrop && camp).toBeTruthy();
    const empty: Loadout['units'] = [null, null, null, null, null, null, null];
    const one = (age: AgeId, lo: Partial<Loadout>): MatchConfig => config({ side0: { [age]: loadout(age, { units: empty, ...lo }) } });
    const summoned = summoner!.abilities.find((a) => a.kind === 'summon');
    expect(sideAgeCards(one(summoner!.age, { units: [summoner!.id, ...empty.slice(1)] }), 0, summoner!.age)).toEqual(
      expect.arrayContaining([summoner!.id, summoned?.kind === 'summon' ? summoned.card : '']),
    );
    const riders = rider!.abilities.find((a) => a.kind === 'riders');
    expect(sideAgeCards(one(rider!.age, { units: [rider!.id, ...empty.slice(1)] }), 0, rider!.age)).toEqual(
      expect.arrayContaining([rider!.id, riders?.kind === 'riders' ? riders.onDeathSpawn : '']),
    );
    const fx = paradrop!.effect;
    expect(sideAgeCards(one(paradrop!.age, { powers: { home: null, field: paradrop!.id } }), 0, paradrop!.age)).toEqual([fx.kind === 'paradrop' ? fx.card : '']);
    expect(sideAgeCards(one(camp!.age, { fort: camp!.id }), 0, camp!.age)).toEqual([camp!.id, camp!.camp!.spawn]);
    // the Vanguard: the age's Infantry Common, only when evolving into the age
    const vanguard = units.find((u) => u.age === 'bronze' && u.group === 'infantry' && u.rarity === 'common' && !u.hidden)!;
    const plain = config({ side0: { bronze: loadout('bronze', { units: [null, null, null, null, null, null, null] }) } });
    expect(sideAgeCards(plain, 0, 'bronze')).not.toContain(vanguard.id);
    expect(sideAgeCards(plain, 0, 'bronze', { vanguard: true })).toContain(vanguard.id);
  });

  it('a card draws its own visual with the side\'s skin', () => {
    const card = units.find((u) => u.age === 'stone' && !u.hidden)!;
    expect(cardVisual(config(), 0, card.id)).toEqual({ visualId: card.visualId });
    expect(cardVisual(config({ skins: { [card.id]: 'gold' } }), 0, card.id)).toEqual({ visualId: card.visualId, skin: 'gold' });
    expect(cardVisual(config(), 0, 'no_such_card')).toBeNull();
  });
});

describe('heldVisuals (G7)', () => {
  it('holds each side\'s current age, the next one from 70% of the bar, the queue and the field', () => {
    const cfg = config();
    const sim = createSim(cfg);
    const ages = ageOrder(cfg);
    const ids = (m: Map<string, HeldVisual>): string[] => [...m.values()].map((v) => v.visualId);
    const stoneDeck = (cfg.sides[0].loadouts.stone?.units ?? []).filter((c): c is CardId => c !== null).map((c) => content.units[c]!.visualId);
    const bronzeDeck = (cfg.sides[0].loadouts.bronze?.units ?? []).filter((c): c is CardId => c !== null).map((c) => content.units[c]!.visualId);
    let held = heldVisuals(cfg, sim.state, ages, []);
    expect(ids(held)).toEqual(expect.arrayContaining(stoneDeck));
    for (const v of bronzeDeck) expect(ids(held)).not.toContain(v);
    // 70% of the evolve bar: the next age comes in
    const need = xpThreshold(cfg, 0)!;
    const st = sim.state as unknown as { sides: { xp: number; queue: { card: CardId }[] }[]; tick: number };
    st.sides[0]!.xp = Math.ceil(need * 1000 * 0.69);
    expect(nearEvolve(sim.state, cfg, 0)).toBe(false);
    st.sides[0]!.xp = Math.ceil(need * 1000 * 0.7);
    expect(nearEvolve(sim.state, cfg, 0)).toBe(true);
    held = heldVisuals(cfg, sim.state, ages, []);
    expect(ids(held)).toEqual(expect.arrayContaining(bronzeDeck));
    // a unit on the field and a queued card of another age stay held
    const medieval = units.find((u) => u.age === 'medieval' && !u.hidden)!;
    const gunpowder = units.find((u) => u.age === 'gunpowder' && !u.hidden)!;
    st.sides[1]!.queue.push({ card: medieval.id, group: medieval.group, progress: 0, total: 1, waiting: false } as never);
    held = heldVisuals(cfg, sim.state, ages, [{ side: 1, card: gunpowder.id }]);
    expect(ids(held)).toEqual(expect.arrayContaining([medieval.visualId, gunpowder.visualId]));
  });

  it('the battle view sends the set to the provider\'s hold, resends it when it changes and lets go on destroy', () => {
    const cfg = config();
    const sim = createSim(cfg);
    const sets: string[][] = [];
    let released = 0;
    let resolve: (() => void) | null = null;
    const art = Object.assign(new FakeArtProvider(), {
      holdArt: () => ({
        set: (v: readonly HeldVisual[]) => {
          sets.push(v.map((x) => x.visualId).sort());
          return new Promise<void>((r) => (resolve = r));
        },
        release: () => {
          released += 1;
        },
      }),
    });
    const view = new BattleView({ sim, art, audio: new FakeAudio() });
    expect(sets).toHaveLength(1);
    expect(view.artReady()).not.toBeNull();
    resolve!();
    // an unchanged set is not sent again
    view.onEvents([]);
    expect(sets).toHaveLength(1);
    // the bar passing 70% brings the next age in
    const need = xpThreshold(cfg, 0)!;
    (sim.state as unknown as { sides: { xp: number }[] }).sides[0]!.xp = need * 1000;
    view.onEvents([]);
    expect(sets).toHaveLength(2);
    const bronze = (cfg.sides[0].loadouts.bronze?.units ?? []).filter((c): c is CardId => c !== null).map((c) => content.units[c]!.visualId);
    expect(sets[1]).toEqual(expect.arrayContaining(bronze));
    view.destroy();
    expect(released).toBe(1);
  });

  it('ranks each visual by how soon it may be drawn: the lane, then within seconds, the deck, the next age', () => {
    const cfg = config();
    const sim = createSim(cfg);
    const ages = ageOrder(cfg);
    const st = sim.state as unknown as { sides: { xp: number; ascendUntil: number; queue: { card: CardId; group: string }[] }[]; tick: number };
    const rankOf = (m: Map<string, HeldVisual>, visualId: string): number | undefined => [...m.values()].find((v) => v.visualId === visualId)?.priority;
    const deck = (cfg.sides[0].loadouts.stone?.units ?? []).filter((c): c is CardId => c !== null);
    const [a, b, c] = deck.map((id) => content.units[id]!);
    expect(a && b && c).toBeTruthy();
    st.sides[0]!.queue.push({ card: b!.id, group: b!.group } as never);
    let held = heldVisuals(cfg, sim.state, ages, [{ side: 0, card: a!.id }]);
    expect(rankOf(held, a!.visualId)).toBe(HOLD_RANK.field);
    expect(rankOf(held, b!.visualId)).toBe(HOLD_RANK.soon);
    expect(rankOf(held, c!.visualId)).toBe(HOLD_RANK.deck);
    // near the evolve the next age comes in last; in the Ascension its Vanguard and the queue's conversion move up
    const need = xpThreshold(cfg, 0)!;
    st.sides[0]!.xp = need * 1000;
    const bronze = (cfg.sides[0].loadouts.bronze?.units ?? []).filter((x): x is CardId => x !== null).map((x) => content.units[x]!);
    held = heldVisuals(cfg, sim.state, ages, []);
    for (const u of bronze) expect(rankOf(held, u.visualId)).toBe(HOLD_RANK.next);
    st.sides[0]!.ascendUntil = st.tick + 50;
    held = heldVisuals(cfg, sim.state, ages, []);
    const vanguard = units.find((u) => u.age === 'bronze' && u.group === 'infantry' && u.rarity === 'common' && !u.hidden)!;
    expect(rankOf(held, vanguard.visualId)).toBe(HOLD_RANK.soon);
    const converted = bronze.find((u) => u.group === b!.group);
    if (converted) expect(rankOf(held, converted.visualId)).toBe(HOLD_RANK.soon);
  });

  it('a unit on the lane holds what it brings on, also once its side has left its age', () => {
    expect(summoner).toBeTruthy();
    const summoned = summoner!.abilities.find((x) => x.kind === 'summon');
    const card = summoned?.kind === 'summon' ? summoned.card : '';
    const cfg = config();
    const sim = createSim(cfg);
    const ages = ageOrder(cfg);
    // a summoner of an age no deck holds, still on the lane
    const held = heldVisuals(cfg, sim.state, ages, [{ side: 1, card: summoner!.id }]);
    const visual = content.units[card]!.visualId;
    expect([...held.values()].find((v) => v.visualId === visual)?.priority).toBe(HOLD_RANK.soon);
  });

  it('the battle view sends the set again when a rank moves (a card queued) and the provider sees the ranks', () => {
    const cfg = config();
    const sim = createSim(cfg);
    const sets: HeldVisual[][] = [];
    const art = Object.assign(new FakeArtProvider(), {
      holdArt: () => ({
        set: (v: readonly HeldVisual[]) => {
          sets.push([...v]);
          return Promise.resolve();
        },
        release: () => undefined,
      }),
    });
    const view = new BattleView({ sim, art, audio: new FakeAudio() });
    expect(sets).toHaveLength(1);
    const card = (cfg.sides[0].loadouts.stone?.units ?? []).find((x): x is CardId => x !== null)!;
    (sim.state as unknown as { sides: { queue: { card: CardId; group: string }[] }[] }).sides[0]!.queue.push({ card, group: content.units[card]!.group } as never);
    view.onEvents([{ e: 'queueChanged', side: 0, tick: 1 } as never]);
    expect(sets).toHaveLength(2);
    expect(sets[1]!.find((v) => v.visualId === content.units[card]!.visualId)?.priority).toBe(HOLD_RANK.soon);
    view.destroy();
  });

  it('a deck card that stood on the lane lately ranks as soon to appear; a card of an age its side left gains nothing', () => {
    const cfg = config();
    const sim = createSim(cfg);
    const ages = ageOrder(cfg);
    const card = (cfg.sides[0].loadouts.stone?.units ?? []).find((x): x is CardId => x !== null)!;
    const old = units.find((u) => u.age === 'cosmic' && !u.hidden)!;
    const rankOf = (m: Map<string, HeldVisual>, visualId: string): number | undefined => [...m.values()].find((v) => v.visualId === visualId)?.priority;
    expect(rankOf(heldVisuals(cfg, sim.state, ages, []), content.units[card]!.visualId)).toBe(HOLD_RANK.deck);
    const held = heldVisuals(cfg, sim.state, ages, [], [{ side: 0, card }, { side: 1, card: old.id }]);
    expect(rankOf(held, content.units[card]!.visualId)).toBe(HOLD_RANK.soon);
    expect(rankOf(held, old.visualId)).toBeUndefined();
  });
});
