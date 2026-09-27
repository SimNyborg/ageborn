/**
 * `createBot` (DESIGN B10, B15 `bot.ts`): the controller for an AI General at a tier.
 *
 * - Old Grogg (a scripted General in content, or `grogg` without a General table) gets the scripted
 *   tutorial brain (scripted.ts); `profile.openings` carries his script.
 * - Every other General, Echo of You and procedural AI Commanders get the utility brain (A7.2) with
 *   their personality (personalities.ts).
 *
 * The controller only ever sees the `Observation` the session hands it (A7.1), and its RNG is seeded
 * from the match seed and its side, so the same match always plays the same way.
 */
import type { CreateBot } from '@/contracts';
import { UtilityController, type AiBotController } from './controller';
import { personalityFor } from './personalities';
import { ScriptedController } from './scripted';

/** Creates the bot controller for a profile. The concrete type is exposed as `AiBotController`. */
export const createBot: CreateBot = (profile, side, seed, content): AiBotController => {
  const persona = personalityFor(content, profile.generalId);
  return persona.scripted ? new ScriptedController(profile, side, seed, content) : new UtilityController(profile, side, seed, content);
};
