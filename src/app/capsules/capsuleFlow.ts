/**
 * The capsule show flow in the app (DESIGN A6.4, A10, B8; docs/requests/wp10-app-wiring.md).
 *
 * Opening is two-phase and the order matters:
 *
 * 1. `meta.openCapsule` / `meta.openWardrobe` applies the pre-rolled result to the save, and the
 *    save is written at once (`immediate`, B8).
 * 2. A `ShowRecord` (the reveals plus the copies bars) is kept in local storage, and only then does
 *    the show start.
 *
 * So a reload in the middle of the animation finds the record and plays the same result again; the
 * save already holds it, and nothing is re-rolled or granted twice. `done()` clears the record.
 *
 * The record carries the content hash it was made with. A record from another build (an update
 * between the reload and the replay), or one whose shape or ids the show cannot play, is dropped:
 * the save already holds the result, so only the animation is skipped, and the app never gets stuck
 * on a show it cannot draw.
 *
 * Pure except for the injected key-value store, so it is tested in Node.
 */
import { signal, type ReadonlySignal } from '@preact/signals';
import type { CapsuleReveal, CardId, CompiledContent, SaveDoc, WardrobeReveal } from '@/contracts';
import { asContent } from '@/content';
import { progressFromCollections } from '@/capsule/summaryModel';
import type { CardProgress } from '@/capsule/types';
import type { KeyValueStore } from '../eventLog';

/** Local storage key of the show in progress. */
export const SHOW_KEY = 'ageborn.capsuleShow';

/** What the capsule show plays; persisted until the player closes the summary. */
export type ShowRecord =
  | {
      v: 1;
      kind: 'capsules';
      reveals: CapsuleReveal[];
      /** Copies bars per card, from the collection before and after opening (A10 step 7). */
      progress: Record<CardId, CardProgress>;
      /** False once the arena's pool has no unowned card (A6.5): the "New card within N" line hides. */
      newCardProtection: boolean;
      /** The onboarding capsule step this show completes (A8), if any. */
      onboarding: 'capsule1' | 'capsule2' | null;
      /** `CompiledContent.hash` of the build that made the record. */
      content?: string;
    }
  | {
      v: 1;
      kind: 'wardrobe';
      reveal: WardrobeReveal;
      /** Wardrobe pity after opening (the reveal carries none). */
      pity: SaveDoc['pity'];
      /** `CompiledContent.hash` of the build that made the record. */
      content?: string;
    };

/** The meta calls the flow needs (the `Meta` contract). */
export interface ShowMeta {
  openCapsule(s: SaveDoc, id: string): { save: SaveDoc; reveal: CapsuleReveal };
  openWardrobe(s: SaveDoc, id: string): { save: SaveDoc; reveal: WardrobeReveal };
  equipNow(s: SaveDoc, card: CardId, c: CompiledContent): SaveDoc;
}

/** True while the arena's drop pool still has a card the save does not own (A6.5 protection). */
export function hasUnownedInPool(s: SaveDoc, content: CompiledContent): boolean {
  const c = asContent(content);
  const ages = new Set(c.arenas.list[s.arenaIndex]?.dropAges ?? []);
  const owned = (id: CardId) => (s.collection[id]?.level ?? 0) >= 1;
  for (const u of Object.values(c.units)) if (!u.hidden && ages.has(u.age) && !owned(u.id)) return true;
  for (const t of Object.values(c.turrets)) if (ages.has(t.age) && !owned(t.id)) return true;
  return false;
}

/** Copies bars for every card in the reveals (A10 step 7). */
export function progressRecord(before: SaveDoc, after: SaveDoc, reveals: readonly CapsuleReveal[], content: CompiledContent): Record<CardId, CardProgress> {
  const c = asContent(content);
  const upgrade = {
    common: c.rarities.cards.common.upgradeCopies,
    rare: c.rarities.cards.rare.upgradeCopies,
    epic: c.rarities.cards.epic.upgradeCopies,
    legendary: c.rarities.cards.legendary.upgradeCopies,
  };
  const lookup = progressFromCollections(before.collection, after.collection, upgrade, c.economy.maxLevel);
  const out: Record<CardId, CardProgress> = {};
  for (const r of reveals) {
    for (const st of r.capsule.contents.stacks) {
      if (out[st.card]) continue;
      const p = lookup(st.card, st.rarity);
      if (p) out[st.card] = p;
    }
  }
  return out;
}

/**
 * Opens capsules in the order given (oldest first for "Open all"). Unknown ids are skipped. The
 * first scripted capsule's NEW cards are equipped at once (A8 / C5 #5: "Spear Hunter NEW,
 * auto-equipped").
 */
export function openCapsules(
  meta: ShowMeta,
  before: SaveDoc,
  ids: readonly string[],
  content: CompiledContent,
  onboarding: 'capsule1' | 'capsule2' | null = null,
): { save: SaveDoc; record: ShowRecord } | null {
  let s = before;
  const reveals: CapsuleReveal[] = [];
  for (const id of ids) {
    if (!s.capsules.pending.some((p) => p.id === id)) continue;
    const o = meta.openCapsule(s, id);
    s = o.save;
    reveals.push(o.reveal);
    if (o.reveal.capsule.scriptIndex === 1) {
      for (const st of o.reveal.capsule.contents.stacks) if (st.isNew) s = meta.equipNow(s, st.card, content);
    }
  }
  if (reveals.length === 0) return null;
  return {
    save: s,
    record: {
      v: 1,
      kind: 'capsules',
      reveals,
      progress: progressRecord(before, s, reveals, content),
      newCardProtection: hasUnownedInPool(s, content),
      onboarding,
    },
  };
}

/** Opens one Wardrobe Crate. */
export function openCrate(meta: ShowMeta, before: SaveDoc, id: string): { save: SaveDoc; record: ShowRecord } | null {
  if (!before.capsules.wardrobe.some((c) => c.id === id)) return null;
  const o = meta.openWardrobe(before, id);
  return { save: o.save, record: { v: 1, kind: 'wardrobe', reveal: o.reveal, pity: o.save.pity } };
}

const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** True when every reveal in the record is one this build's show can play (tiers, cards, skins). */
export function isPlayableRecord(x: unknown, content: CompiledContent | null = null): x is ShowRecord {
  if (!obj(x) || x['v'] !== 1) return false;
  if (content && x['content'] !== content.hash) return false;
  const c = content ? asContent(content) : null;
  const tiers = c ? new Set<string>(c.capsules.tierOrder) : null;
  const isCard = (id: unknown): boolean => typeof id === 'string' && (!c || !!c.units[id] || !!c.turrets[id]);
  const isSkin = (id: unknown): boolean => typeof id === 'string' && (!c || !!c.skins[id]);
  if (x['kind'] === 'capsules') {
    const reveals = x['reveals'];
    if (!Array.isArray(reveals) || reveals.length === 0 || !obj(x['progress'])) return false;
    return reveals.every((r: unknown) => {
      if (!obj(r) || !obj(r['capsule']) || !obj(r['pityBefore']) || !obj(r['pityAfter']) || !Array.isArray(r['strikeClimbs'])) return false;
      if (typeof r['climbs'] !== 'number' || !Array.isArray(r['firstLegendaryReveal'])) return false;
      const cap = r['capsule'];
      if (typeof cap['id'] !== 'string' || typeof cap['kind'] !== 'string') return false;
      if (typeof cap['tier'] !== 'string' || typeof cap['startTier'] !== 'string') return false;
      if (tiers && (!tiers.has(cap['tier']) || !tiers.has(cap['startTier']))) return false;
      const contents = cap['contents'];
      if (!obj(contents) || !Array.isArray(contents['stacks'])) return false;
      if (contents['skin'] !== null && contents['skin'] !== undefined && !isSkin(contents['skin'])) return false;
      return contents['stacks'].every((st: unknown) => obj(st) && isCard(st['card']) && typeof st['rarity'] === 'string' && typeof st['copies'] === 'number');
    });
  }
  if (x['kind'] === 'wardrobe') {
    const r = x['reveal'];
    if (!obj(r) || !obj(r['crate']) || !obj(x['pity'])) return false;
    return isSkin(r['crate']['skin']) && typeof r['crate']['rarity'] === 'string';
  }
  return false;
}

/**
 * The show a reload interrupted, if this build can play it (see the module note). `content` checks
 * the build hash and every id; without it only the shape is checked.
 */
export function loadShow(kv: KeyValueStore | null, content: CompiledContent | null = null): ShowRecord | null {
  if (!kv) return null;
  try {
    const raw = kv.getItem(SHOW_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isPlayableRecord(parsed, content)) return parsed;
  } catch {
    /* unreadable: dropped below */
  }
  // The save already holds the result; a record this build cannot play only costs the animation.
  storeShow(kv, null);
  return null;
}

function storeShow(kv: KeyValueStore | null, r: ShowRecord | null): void {
  if (!kv) return;
  try {
    if (r) kv.setItem(SHOW_KEY, JSON.stringify(r));
    else kv.removeItem(SHOW_KEY);
  } catch {
    /* storage full or blocked: the show still plays, only the reload replay is lost */
  }
}

export interface CapsuleShowsDeps {
  meta: ShowMeta;
  content: CompiledContent;
  save(): SaveDoc | null;
  /** Replaces the save and writes it at once (B8 `immediate`). */
  commit(next: SaveDoc): void;
  kv: KeyValueStore | null;
}

/** The show in progress, as a signal the app renders. */
export class CapsuleShows {
  private readonly cur = signal<ShowRecord | null>(null);
  readonly current: ReadonlySignal<ShowRecord | null> = this.cur;

  constructor(private readonly d: CapsuleShowsDeps) {
    // A show interrupted by a reload plays again with the same result (C5 #29).
    this.cur.value = loadShow(d.kv, d.content);
  }

  get active(): boolean {
    return this.cur.peek() !== null;
  }

  private start(o: { save: SaveDoc; record: ShowRecord } | null): boolean {
    if (!o) return false;
    this.d.commit(o.save);
    const record: ShowRecord = { ...o.record, content: this.d.content.hash };
    storeShow(this.d.kv, record);
    this.cur.value = record;
    return true;
  }

  /** The show could not be drawn (an error while rendering it): forget it so the app goes on. */
  abandon(): void {
    this.done();
  }

  /** Opens pending capsules (several = "Open all") and starts the show. False when none was found. */
  open(ids: readonly string[], onboarding: 'capsule1' | 'capsule2' | null = null): boolean {
    const s = this.d.save();
    if (!s) return false;
    return this.start(openCapsules(this.d.meta, s, ids, this.d.content, onboarding));
  }

  /** Opens the oldest waiting capsule ("Open next"). */
  openNext(): boolean {
    const first = this.d.save()?.capsules.pending[0];
    return first ? this.open([first.id]) : false;
  }

  /** Opens every waiting capsule at once ("Open all"). */
  openAll(): boolean {
    const ids = this.d.save()?.capsules.pending.map((p) => p.id) ?? [];
    return ids.length > 0 ? this.open(ids) : false;
  }

  openWardrobe(id: string): boolean {
    const s = this.d.save();
    if (!s) return false;
    return this.start(openCrate(this.d.meta, s, id));
  }

  /** The summary was closed: forget the record. */
  done(): ShowRecord | null {
    const r = this.cur.peek();
    storeShow(this.d.kv, null);
    this.cur.value = null;
    return r;
  }
}
