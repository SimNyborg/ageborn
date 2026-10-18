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
import { MANIFEST } from '@/visuals/manifest';
import { createArtProvider } from '@/visuals/provider';
import { SHEET_RANK } from '@/visuals/sheetBudget';
import { BASE_SWAP_FADE_MS, BattleView, EVOLVE_QUIET_AFTER_MS } from '../battleView';
import { ageOrder, xpThreshold } from '../hudModel';
import { cardVisual, handingOver, heldVisuals, HOLD_RANK, keptAges, nearEvolve, PARADROP_SOON_PPM, sideAgeCards, type HeldVisual } from '../matchArt';

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
    // near the evolve the next age comes in last, optional (HD where it fits, else no copy yet) but for its
    // Vanguard, which the age-up spawns; in the Ascension the Vanguard and the queue's conversion move up
    const need = xpThreshold(cfg, 0)!;
    st.sides[0]!.xp = Math.ceil(need * 1000 * 0.75);
    const bronze = (cfg.sides[0].loadouts.bronze?.units ?? []).filter((x): x is CardId => x !== null).map((x) => content.units[x]!);
    const vanguardOf = units.find((u) => u.age === 'bronze' && u.group === 'infantry' && u.rarity === 'common' && !u.hidden)!;
    held = heldVisuals(cfg, sim.state, ages, []);
    const optionalOf = (visualId: string): boolean | undefined => [...held.values()].find((v) => v.visualId === visualId)?.optional;
    for (const u of bronze) {
      expect(rankOf(held, u.visualId)).toBe(HOLD_RANK.next);
      expect(optionalOf(u.visualId)).toBe(u.visualId === vanguardOf.visualId ? undefined : true);
    }
    expect(rankOf(held, vanguardOf.visualId)).toBe(HOLD_RANK.next);
    expect(optionalOf(vanguardOf.visualId)).toBeUndefined();
    st.sides[0]!.xp = need * 1000;
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

describe('review fixes (2026-10-18)', () => {
  const rankOf = (m: Map<string, HeldVisual>, visualId: string): number | undefined => [...m.values()].find((v) => v.visualId === visualId)?.priority;
  const deckOf = (cfg: MatchConfig, age: AgeId): CardId[] => (cfg.sides[0].loadouts[age]?.units ?? []).filter((c): c is CardId => c !== null);

  it('the battle view and the provider rank alike (HOLD_RANK is visuals\' SHEET_RANK)', () => {
    expect(HOLD_RANK).toEqual(SHEET_RANK);
  });

  it('B1: an evolve lets go of the turret and fort sheets of ages both sides have left only', () => {
    const cfg: MatchConfig = { ...config(), format: 'standard' };
    const sim = createSim(cfg);
    const ages = ageOrder(cfg);
    expect(ages).toEqual(['stone', 'bronze', 'medieval', 'gunpowder', 'industrial']);
    const st = sim.state as unknown as { sides: { ageIndex: number }[] };
    // side 0 three ages ahead: Medieval and Gunpowder still lie ahead of side 1
    st.sides[0]!.ageIndex = 4;
    st.sides[1]!.ageIndex = 1;
    expect(keptAges(ages, sim.state)).toEqual(['bronze', 'medieval', 'gunpowder', 'industrial']);
    // the battle view hands exactly those to the provider at an ageUp
    const kept: AgeId[][] = [];
    const art = Object.assign(new FakeArtProvider(), { releaseAges: (keep: readonly AgeId[]) => (kept.push([...keep]), 0) });
    const view = new BattleView({ sim, art, audio: new FakeAudio() });
    view.onEvents([{ e: 'ageUp', side: 0, age: 'industrial', tick: 1 } as never]);
    expect(kept).toEqual([['bronze', 'medieval', 'gunpowder', 'industrial']]);
    view.destroy();
  });

  it('B1: a turret of an age only the leader has passed keeps its sheet, so one built later draws from it', async () => {
    const art = createArtProvider({ warn: () => {}, unitSheets: 'match' });
    const medieval = Object.values(MANIFEST).find((d) => d.kind === 'atlas' && /art\/turrets\/medieval\//.test(d.source))!;
    const stone = Object.values(MANIFEST).find((d) => d.kind === 'atlas' && /art\/turrets\/stone\//.test(d.source))!;
    const sheet = { animations: {}, luPerUnit: 1, meta: { heightLu: 50, pxPerLu: 1, clips: {} } };
    art.atlas.world.register(medieval.source, sheet);
    art.atlas.world.register(stone.source, sheet);
    const cfg: MatchConfig = { ...config(), format: 'standard' };
    const sim = createSim(cfg);
    const st = sim.state as unknown as { sides: { ageIndex: number }[] };
    st.sides[0]!.ageIndex = 4;
    st.sides[1]!.ageIndex = 1;
    art.releaseAges(keptAges(ageOrder(cfg), sim.state));
    // Stone is behind both sides; Medieval is still ahead of side 1
    expect(art.atlas.world.get(stone.source)).toBeUndefined();
    expect(art.atlas.world.get(medieval.source)).toBeDefined();
    expect(art.atlas.canDraw('turret', medieval)).toBe(true);
  });

  it('S3: a standing camp holds its levy as soon to appear, also once its side has left the camp\'s age', () => {
    const levy = camp!.camp!.spawn;
    const levyVisual = content.units[levy]!.visualId;
    const cfg = config();
    const sim = createSim(cfg);
    const ages = ageOrder(cfg);
    // side 1 has moved on to Medieval; its Stone camp still stands on the lane
    (sim.state as unknown as { sides: { ageIndex: number }[] }).sides[1]!.ageIndex = 2;
    expect(content.units[camp!.id]?.fort?.kind).toBe('camp');
    const held = heldVisuals(cfg, sim.state, ages, [{ side: 1, card: camp!.id }]);
    expect(rankOf(held, levyVisual)).toBe(HOLD_RANK.soon);
  });

  it('N3: a camp not placed and a paradrop on cooldown are part of the deck; a reloaded paradrop is soon to appear', () => {
    const levy = camp!.camp!.spawn;
    const withCamp = config({ side0: { [camp!.age]: loadout(camp!.age, { fort: camp!.id }) } });
    const sim = createSim(withCamp);
    const ages = [camp!.age];
    expect(rankOf(heldVisuals(withCamp, sim.state, ages, []), content.units[levy]!.visualId)).toBe(HOLD_RANK.deck);
    const fx = paradrop!.effect;
    const trooper = fx.kind === 'paradrop' ? fx.card : '';
    const withDrop = config({ side0: { [paradrop!.age]: loadout(paradrop!.age, { units: [null, null, null, null, null, null, null], powers: { home: null, field: paradrop!.id } }) } });
    const sim2 = createSim(withDrop);
    const ppm = (sim2.state as unknown as { sides: { powerPpm: [number, number] }[] }).sides[0]!.powerPpm;
    ppm[1] = 0;
    expect(rankOf(heldVisuals(withDrop, sim2.state, [paradrop!.age], []), content.units[trooper]!.visualId)).toBe(HOLD_RANK.deck);
    ppm[1] = PARADROP_SOON_PPM;
    expect(rankOf(heldVisuals(withDrop, sim2.state, [paradrop!.age], []), content.units[trooper]!.visualId)).toBe(HOLD_RANK.soon);
  });

  it('S1: from 80% of the bar a side hands its HD over: the next age ranks as the deck (no longer optional; it may wait for memory until the Ascension), the current deck last but for the lane, the queue and what it fielded lately', () => {
    // five plain Stone troops (nothing they bring on), so two of them are neither on the lane, queued nor fielded lately
    const plain = units.filter((u) => u.age === 'stone' && !u.hidden && u.abilities.every((ab) => ab.kind !== 'summon' && ab.kind !== 'riders')).slice(0, 5);
    expect(plain).toHaveLength(5);
    const base = config({ side0: { stone: loadout('stone', { units: [...plain.map((u) => u.id), null, null] }), bronze: loadout('bronze'), medieval: loadout('medieval') } });
    // the other side fields nothing of its own (both default decks are alike)
    const empty = { units: [null, null, null, null, null, null, null], turrets: [null, null], powers: { home: null, field: null } } as Loadout;
    const cfg: MatchConfig = { ...base, sides: [base.sides[0], { ...base.sides[1], loadouts: { stone: empty, bronze: empty, medieval: empty } }] };
    const sim = createSim(cfg);
    const ages = ageOrder(cfg);
    const st = sim.state as unknown as { sides: { xp: number; queue: { card: CardId; group: string }[] }[] };
    const [a, b, c] = deckOf(cfg, 'stone').map((id) => content.units[id]!);
    const bronze = deckOf(cfg, 'bronze').map((id) => content.units[id]!);
    st.sides[0]!.queue.push({ card: b!.id, group: b!.group } as never);
    const need = xpThreshold(cfg, 0)!;
    const optionalOf = (m: Map<string, HeldVisual>, visualId: string): boolean | undefined => [...m.values()].find((v) => v.visualId === visualId)?.optional;
    st.sides[0]!.xp = Math.ceil(need * 1000 * 0.79);
    expect(handingOver(sim.state, cfg, 0)).toBe(false);
    let held = heldVisuals(cfg, sim.state, ages, [{ side: 0, card: a!.id }], [{ side: 0, card: c!.id }]);
    expect(rankOf(held, c!.visualId)).toBe(HOLD_RANK.soon);
    for (const u of bronze) expect(rankOf(held, u.visualId)).toBe(HOLD_RANK.next);
    expect(bronze.some((u) => optionalOf(held, u.visualId) === true)).toBe(true);
    st.sides[0]!.xp = Math.ceil(need * 1000 * 0.8);
    expect(handingOver(sim.state, cfg, 0)).toBe(true);
    held = heldVisuals(cfg, sim.state, ages, [{ side: 0, card: a!.id }], [{ side: 0, card: c!.id }]);
    expect(rankOf(held, a!.visualId)).toBe(HOLD_RANK.field);
    expect(rankOf(held, b!.visualId)).toBe(HOLD_RANK.soon);
    // a card the side keeps fielding stays soon to appear until the evolve (no HD -> 1x -> HD before it)
    expect(rankOf(held, c!.visualId)).toBe(HOLD_RANK.soon);
    const vanguard = units.find((u) => u.age === 'bronze' && u.group === 'infantry' && u.rarity === 'common' && !u.hidden)!;
    const canWaitOf = (m: Map<string, HeldVisual>, visualId: string): boolean | undefined => [...m.values()].find((v) => v.visualId === visualId)?.canWait;
    for (const u of bronze) {
      expect(rankOf(held, u.visualId)).toBe(HOLD_RANK.deck);
      // every card gets a copy well before the age-up, but may wait while the governor frees memory; not the Vanguard
      expect(optionalOf(held, u.visualId)).toBeUndefined();
      expect(canWaitOf(held, u.visualId)).toBe(u.visualId === vanguard.visualId ? undefined : true);
    }
    // the rest of the current deck (not on the lane, queued or fielded lately) ranks last
    const rest = deckOf(cfg, 'stone').slice(3).map((id) => content.units[id]!);
    expect(rest).toHaveLength(2);
    for (const u of rest) expect(rankOf(held, u.visualId)).toBe(HOLD_RANK.next);
    // the Ascension: nothing waits any more (what it spawns loads now)
    (sim.state as unknown as { sides: { ascendUntil: number }[]; tick: number }).sides[0]!.ascendUntil = sim.state.tick + 50;
    held = heldVisuals(cfg, sim.state, ages, [{ side: 0, card: a!.id }], [{ side: 0, card: c!.id }]);
    for (const u of bronze) {
      expect(optionalOf(held, u.visualId)).toBeUndefined();
      expect(canWaitOf(held, u.visualId)).toBeUndefined();
    }
    // the other side is not handing over
    expect(handingOver(sim.state, cfg, 1)).toBe(false);
  });

  it('S1: a side leaving its age keeps the cards of that age (and of ages it left) on their 1x copy; the other side\'s same card does not', () => {
    const plain = units.filter((u) => u.age === 'stone' && !u.hidden && u.abilities.every((ab) => ab.kind !== 'summon' && ab.kind !== 'riders')).slice(0, 3);
    const stone = loadout('stone', { units: [...plain.map((u) => u.id), null, null, null, null] });
    const base = config({ side0: { stone, bronze: loadout('bronze'), medieval: loadout('medieval') } });
    // the other side's decks hold nothing of these
    const empty = { units: [null, null, null, null, null, null, null], turrets: [null, null], powers: { home: null, field: null } } as Loadout;
    const cfg: MatchConfig = { ...base, sides: [base.sides[0], { ...base.sides[1], loadouts: { stone: empty, bronze: empty, medieval: empty } }] };
    const sim = createSim(cfg);
    const ages = ageOrder(cfg);
    const st = sim.state as unknown as { sides: { xp: number; ageIndex: number }[] };
    const noRaiseOf = (m: Map<string, HeldVisual>, visualId: string): boolean | undefined => [...m.values()].find((v) => v.visualId === visualId)?.noRaise;
    const [a, b] = plain;
    const bronze = deckOf(cfg, 'bronze').map((id) => content.units[id]!);
    let held = heldVisuals(cfg, sim.state, ages, [{ side: 0, card: a!.id }]);
    expect(noRaiseOf(held, a!.visualId)).toBeUndefined();
    st.sides[0]!.xp = Math.ceil(xpThreshold(cfg, 0)! * 1000 * 0.8);
    held = heldVisuals(cfg, sim.state, ages, [{ side: 0, card: a!.id }]);
    // on the lane and in the deck: both stay on a 1x copy they have; the next age does not
    expect(noRaiseOf(held, a!.visualId)).toBe(true);
    expect(noRaiseOf(held, b!.visualId)).toBe(true);
    for (const u of bronze) expect(noRaiseOf(held, u.visualId)).toBeUndefined();
    // the other side, not leaving Stone, fields the same card: no noRaise
    const both = heldVisuals(cfg, sim.state, ages, [{ side: 0, card: a!.id }, { side: 1, card: a!.id }]);
    expect(noRaiseOf(both, a!.visualId)).toBeUndefined();
    // a unit of an age its side has left
    st.sides[0]!.xp = 0;
    st.sides[0]!.ageIndex = 1;
    held = heldVisuals(cfg, sim.state, ages, [{ side: 0, card: b!.id }]);
    expect(noRaiseOf(held, b!.visualId)).toBe(true);
  });

  it('S1: every evolve holds the big sheet uploads from its Ascension until a while after its age-up, at the game speed', () => {
    const cfg = config();
    const sim = createSim(cfg);
    const quiet: number[] = [];
    const art = Object.assign(new FakeArtProvider(), { quietUploads: (ms: number) => quiet.push(ms) });
    const view = new BattleView({ sim, art, audio: new FakeAudio() });
    // the enemy's evolve too: its new base and Vanguard show on your screen
    view.onEvents([{ e: 'ascendStart', side: 1, age: 'bronze', tick: 1 } as never]);
    expect(quiet).toEqual([cfg.content.economy.ascendMs + EVOLVE_QUIET_AFTER_MS]);
    view.setSpeed(2);
    view.onEvents([{ e: 'ascendStart', side: 0, age: 'bronze', tick: 2 } as never]);
    expect(quiet[1]).toBe(cfg.content.economy.ascendMs / 2 + EVOLVE_QUIET_AFTER_MS);
    // at least 3 s past the age-up (the review's window) at any speed, counted from the age-up itself (a slow
    // device's sim runs behind real time, so the Ascension can last longer than its game time)
    expect(EVOLVE_QUIET_AFTER_MS).toBeGreaterThanOrEqual(3000);
    view.onEvents([{ e: 'ageUp', side: 0, age: 'bronze', tick: 3 } as never]);
    expect(quiet[2]).toBe(EVOLVE_QUIET_AFTER_MS);
    view.destroy();
  });

  it('S2: a base drawn by its stand-in is made again from its sheet once that is in; the battle\'s clock waits for it', async () => {
    const cfg = config();
    const sim = createSim(cfg);
    let land: () => void = () => undefined;
    const loading = new Promise<void>((r) => (land = r));
    const asked: AgeId[] = [];
    const art = Object.assign(new FakeArtProvider(), { baseSheetReady: (age: AgeId) => (asked.push(age), loading) });
    const view = new BattleView({ sim, art, audio: new FakeAudio() });
    expect(asked).toEqual(['stone', 'stone']);
    const bases = (): { view: { root: { destroyed: boolean; alpha: number } } }[] => (view as unknown as { bases: { view: { root: { destroyed: boolean; alpha: number } } }[] }).bases;
    const first = bases().map((b) => b.view);
    const ready = view.artReady();
    expect(ready).not.toBeNull();
    let done = false;
    void ready!.then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    land();
    await ready;
    expect(done).toBe(true);
    expect(art.calls.filter((c) => c.method === 'createBase')).toHaveLength(4);
    const second = bases().map((b) => b.view);
    expect(second[0]).not.toBe(first[0]);
    // the stand-ins fade out over the new bases, then go
    expect(first[0]!.root.destroyed).toBe(false);
    view.render(1, 200);
    expect(first[0]!.root.alpha).toBeCloseTo(1 - 200 / BASE_SWAP_FADE_MS, 1);
    view.render(1, 250);
    expect(first.every((v) => v.root.destroyed)).toBe(true);
    expect(view.artReady()).toBeNull();
    view.destroy();
  });

  it('S2: a stand-in base that evolved before its sheet came in is made again from its new age\'s sheet', async () => {
    const cfg = config();
    const sim = createSim(cfg);
    let land: () => void = () => undefined;
    const stone = new Promise<void>((r) => (land = r));
    const asked: AgeId[] = [];
    // Stone's sheet is slow; Bronze's is in
    const art = Object.assign(new FakeArtProvider(), { baseSheetReady: (age: AgeId): Promise<void> | null => (asked.push(age), age === 'stone' ? stone : null) });
    const view = new BattleView({ sim, art, audio: new FakeAudio() });
    const first = (view as unknown as { bases: { view: unknown; age: AgeId }[] }).bases[0]!;
    (sim.state as unknown as { sides: { ageIndex: number }[] }).sides[0]!.ageIndex = 1;
    view.onEvents([{ e: 'ageUp', side: 0, age: 'bronze', tick: 1 } as never]);
    expect(first.age).toBe('bronze');
    land();
    await stone;
    await Promise.resolve();
    const now = (view as unknown as { bases: { view: unknown; age: AgeId }[] }).bases[0]!;
    expect(now.view).not.toBe(first.view);
    expect(now.age).toBe('bronze');
    expect(asked).toContain('bronze');
    view.destroy();
  });

  it('S2: with Reduce motion the stand-in base goes at once; a base already in asks for nothing', async () => {
    const cfg = config();
    const sim = createSim(cfg);
    const art = Object.assign(new FakeArtProvider(), { baseSheetReady: (_age: AgeId): Promise<void> | null => Promise.resolve() });
    const view = new BattleView({ sim, art, audio: new FakeAudio(), settings: { reduceMotion: true } });
    const first = (view as unknown as { bases: { view: { root: { destroyed: boolean } } }[] }).bases.map((b) => b.view);
    await view.artReady();
    expect(first.every((v) => v.root.destroyed)).toBe(true);
    view.destroy();
    const plain = Object.assign(new FakeArtProvider(), { baseSheetReady: (): Promise<void> | null => null });
    const v2 = new BattleView({ sim: createSim(cfg), art: plain, audio: new FakeAudio() });
    expect(plain.calls.filter((c) => c.method === 'createBase')).toHaveLength(2);
    v2.destroy();
  });
});
