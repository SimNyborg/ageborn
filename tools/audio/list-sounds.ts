/**
 * Prints the sound manifest's ids with their group and bus as JSON, for the audio build
 * (`tools/audio/build.py` packs one sprite sheet per group). Run with `npx tsx tools/audio/list-sounds.ts`.
 */
import { SOUND_GROUPS, sounds } from '../../src/audio/sounds';

const out: Record<string, { group: string; bus: string }> = {};
for (const [id, def] of Object.entries(sounds)) out[id] = { group: def.group, bus: def.bus };
process.stdout.write(JSON.stringify({ groups: SOUND_GROUPS, sounds: out }));
