/**
 * Save version 16: the narrator voice (queue item 39, owner request 2026-10-18; contract change approved for
 * the item). Additive and idempotent; nothing is taken away.
 *
 * - `settings.volume.voice` joins the volumes: the narrator's own bus. An older doc gets 1, the default
 *   every bus starts at (the master slider still scales it), so an existing player hears the narrator at the
 *   level a new player does. A doc that already has a valid value (a re-run) keeps it.
 * - `settings.narrator` (the Settings switch) is written as true, the default, when it is not a boolean.
 * - A missing or broken `settings` or `volume` is left to the schema, which falls back to the defaults.
 *
 * Never edit this step; a later change needs a new version.
 */
import type { SaveVersion } from './types';

type Doc = Record<string, unknown> & { v: number; settings?: unknown };

const isRecord = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);

/** A volume setting the schema accepts (0..1). */
const isUnit = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;

/** The voice volume an older save starts with. */
export const V16_VOICE_DEFAULT = 1;

export const v16: SaveVersion = {
  v: 16,
  summary: 'Narrator: settings.volume.voice (1 for older saves) and settings.narrator (true)',
  up: (input) => {
    const doc = input as Doc;
    const st = doc.settings;
    if (isRecord(st)) {
      const vol = st['volume'];
      const volume = isRecord(vol) ? { ...vol, voice: isUnit(vol['voice']) ? vol['voice'] : V16_VOICE_DEFAULT } : vol;
      const narrator = typeof st['narrator'] === 'boolean' ? st['narrator'] : true;
      doc.settings = { ...st, volume, narrator };
    }
    return { ...doc, v: 16 };
  },
};
