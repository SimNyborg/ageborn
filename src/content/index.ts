/**
 * The compiled content (DESIGN B4, C2/WP1 "Provides"): `import { content } from '@/content'`.
 *
 * `content` is a frozen `CompiledContent` (B15) whose open slots are typed ({@link Content}). It is
 * built once at import time from the raw Part A tables, the meta tables in this folder, the skins and
 * `generated/counters.json`. Validation (`schema.ts`, Valibot) runs in tests and dev boot, not here,
 * so production does not ship the schema.
 */
import type { CompiledContent } from '@/contracts/content';
import { arenas } from './arenas';
import { capsules } from './capsules';
import { cardArena } from './cardArena';
import { compileContent } from './compile';
import { cosmetics } from './cosmetics';
import { parseCounterFile } from './counters/matrix';
import { dailyModifiers } from './dailyModifiers';
import { feats } from './feats';
import countersJson from './generated/counters.json';
import { generals } from './generals';
import { names } from './names';
import { quests } from './quests';
import { rarities } from './rarities';
import { rosterShape } from './rosterShape';
import { raw } from './raw';
import { skinList } from './skins';
import { trophyRoad } from './trophyRoad';
import { warPath } from './raw/warPath';
import type { Content, MetaTables } from './types';

export type * from './types';
export { AGE_ORDER, THEMED_AGES, ageFlavourKey } from './ages';
export { FORMAT_MODES, FORMAT_ORDER } from './formats';
export { formatKind, ladderWinFor, rewardFormat } from './ladder';
export { commanderName, playerName } from './names';
export { roadAmber } from './trophyRoad';
export { isReleased, unreleasedIds } from './release';
export { ageCapsuleStacksFor, capsuleTierFor, usesAllAgesTable } from './capsuleTiers';
export * from './keys';

/** The meta tables, before compilation (for tools and tests that compile other raw tables). */
export const metaTables: MetaTables = {
  rarities,
  capsules,
  arenas,
  trophyRoad,
  generals,
  names,
  quests,
  dailyModifiers,
  cosmetics,
  feats,
  warPath,
  rosterShape,
  cardArena,
};

/** The counter-matrix file as loaded (DESIGN B4). */
export const counterFile = parseCounterFile(countersJson);

/** The game's compiled, frozen content. */
export const content: Content = compileContent({ raw, meta: metaTables, skins: skinList, counters: counterFile });

/**
 * Typed access to a `CompiledContent` that came through a contract (for example `MatchConfig.content`
 * or a `Meta` method argument). Throws on content without the typed tables, such as the fakes in
 * `src/contracts/fakes`, whose meta tables are null.
 */
export function asContent(c: CompiledContent): Content {
  const x = c as Partial<Content>;
  if (!x.int || !x.order || !x.capsules || !x.arenas || !x.generals || !x.quests) {
    throw new Error('asContent: this CompiledContent has no typed meta tables (fake content?). Use `content` from @/content.');
  }
  return c as Content;
}
