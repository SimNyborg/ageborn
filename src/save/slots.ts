/**
 * The two alternating save slots (DESIGN B8 Keys, Load order steps 1-2).
 *
 * Each slot holds one JSON envelope `{ v, writtenAt, checksum, payload }`: `payload` is the doc's JSON
 * text and `checksum` its FNV-1a. Writes alternate between `ageborn.save.A` and `ageborn.save.B`,
 * so a write that fails or is cut off can only ever damage the older copy.
 */
import { checksum } from './checksum';
import { SLOT_KEYS, type SlotId } from './defaults';
import type { KeyValueStorage } from './storage';

export type { SlotId } from './defaults';

export const SLOT_IDS: readonly SlotId[] = ['A', 'B'];

export interface SlotEnvelope {
  /** Save version of the payload (informational; the payload's own `v` is authoritative). */
  v: number;
  /** Epoch ms of the write; the newest valid slot wins. */
  writtenAt: number;
  /** FNV-1a 32 of `payload`. */
  checksum: number;
  /** The doc as JSON text. */
  payload: string;
}

/** Why a slot could not be used before migration and schema checks. */
export type SlotDefect =
  /** Nothing stored. */
  | 'missing'
  /** Not an envelope (unparsable text or wrong shape). */
  | 'corrupt'
  /** The payload does not match its checksum. */
  | 'checksum';

export type SlotRead =
  | { ok: true; slot: SlotId; envelope: SlotEnvelope; doc: unknown; raw: string }
  | {
      ok: false;
      slot: SlotId;
      defect: SlotDefect;
      raw: string | null;
      /**
       * The envelope's `writtenAt` when only the payload failed its checksum. The checksum does not
       * cover it, so it is a hint (was the damaged copy the older one?), never a reason to load.
       */
      writtenAt?: number;
    };

export function otherSlot(slot: SlotId): SlotId {
  return slot === 'A' ? 'B' : 'A';
}

/** Wraps a payload into the envelope text written to a slot or a backup key. */
export function encodeEnvelope(payload: string, version: number, writtenAt: number): string {
  const envelope: SlotEnvelope = { v: version, writtenAt, checksum: checksum(payload), payload };
  return JSON.stringify(envelope);
}

function isEnvelope(x: unknown): x is SlotEnvelope {
  if (x === null || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.v === 'number' &&
    typeof e.writtenAt === 'number' &&
    Number.isFinite(e.writtenAt) &&
    typeof e.checksum === 'number' &&
    typeof e.payload === 'string'
  );
}

/** Parses and checks one slot's text (DESIGN B8 step 2: only valid checksums count). */
export function decodeSlot(slot: SlotId, raw: string | null): SlotRead {
  if (raw === null) return { ok: false, slot, defect: 'missing', raw };
  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return { ok: false, slot, defect: 'corrupt', raw };
  }
  if (!isEnvelope(envelope)) return { ok: false, slot, defect: 'corrupt', raw };
  if (checksum(envelope.payload) !== envelope.checksum) return { ok: false, slot, defect: 'checksum', raw, writtenAt: envelope.writtenAt };
  try {
    return { ok: true, slot, envelope, doc: JSON.parse(envelope.payload) as unknown, raw };
  } catch {
    return { ok: false, slot, defect: 'corrupt', raw };
  }
}

/** Reads a slot; a storage that throws on read counts as empty. */
export function readSlot(storage: KeyValueStorage, slot: SlotId): SlotRead {
  let raw: string | null;
  try {
    raw = storage.getItem(SLOT_KEYS[slot]);
  } catch {
    raw = null;
  }
  return decodeSlot(slot, raw);
}

/** Both slots, in slot order. */
export function readSlots(storage: KeyValueStorage): SlotRead[] {
  return SLOT_IDS.map((s) => readSlot(storage, s));
}

/** Valid slots, newest `writtenAt` first (ties: slot A first, so the order is always the same). */
export function newestFirst(reads: readonly SlotRead[]): Extract<SlotRead, { ok: true }>[] {
  return reads
    .filter((r): r is Extract<SlotRead, { ok: true }> => r.ok)
    .sort((a, b) => b.envelope.writtenAt - a.envelope.writtenAt || (a.slot < b.slot ? -1 : 1));
}
