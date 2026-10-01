/**
 * Hidden feats (DESIGN A15.10): 12 feats, each shown as "???" and a riddle until found. Each pays
 * 100 Dust once; four also give a title. Predicate kinds are a closed typed list (`FeatPredicate`):
 * a new feat of an existing kind is data, a new kind is code (`src/meta/feats.ts`).
 */
import type { FeatDef, FeatPredicate, FeatTables } from './types';

function feat(id: string, predicate: FeatPredicate, o: { title?: string; obscure?: boolean } = {}): FeatDef {
  return {
    id,
    predicate,
    dust: 100,
    title: o.title ?? null,
    obscure: o.obscure ?? false,
    nameKey: `feat.${id}.name`,
    riddleKey: `feat.${id}.riddle`,
    hintKey: `feat.${id}.hint`,
  };
}

/** A15.10 table order. */
const LIST: FeatDef[] = [
  feat('caveman_diplomacy', { kind: 'crossAgeKill', killerAge: 'stone', victimAge: 'future' }),
  feat('arrows_into_tomorrow', { kind: 'castKills', power: 'arrow_storm', victimAges: ['modern', 'future'], min: 3 }),
  feat('stubborn', { kind: 'winMaxAge', formats: ['standard', 'full', 'last'], maxAge: 'medieval' }, { title: 'the_stubborn' }),
  feat('no_walls', { kind: 'winNoTurret', formats: ['full', 'last'] }),
  feat('photo_finish', { kind: 'winFinalBellMargin', maxMarginBp: 200 }, { title: 'photo_finisher' }),
  feat('horn_of_legends', { kind: 'lastStandKills', min: 8 }),
  // A17.8: Future now comes at ~5:10 in Full War (was ~5:00), so the bar moves 10 s
  // A18.3.4: the Future Age is Full War's last; reaching it before 9:00 is well ahead of the pace
  feat('lightspeed', { kind: 'reachAgeBefore', age: 'future', beforeMs: 540000, formats: ['full', 'last'] }),
  feat('underdog', { kind: 'winAfterAgesBehind', ages: 2 }),
  feat('humble_beginnings', { kind: 'winCommonsOnly', formats: ['full', 'last'] }),
  feat('back_from_the_brink', { kind: 'winAfterBaseBelow', belowBp: 500 }),
  feat('stone_cold', { kind: 'finalBaseBlow', unitAge: 'stone', baseAge: 'future' }, { title: 'stone_cold', obscure: true }),
  feat('old_guard', { kind: 'agesAlive', ages: 5 }, { title: 'keeper_of_ages', obscure: true }),
];

export const feats: FeatTables = {
  order: LIST.map((f) => f.id),
  list: Object.fromEntries(LIST.map((f) => [f.id, f])),
};
