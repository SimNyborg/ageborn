/**
 * National flags and the Flag Atlas (PLAN 2d; owner decisions 2026-10-08). Data only; owned by Track D.
 *
 * - Every flag is bought with Dust at the one price `drops.flagDust` (500; a save's first flag costs
 *   nothing while `drops.firstFlagFree` is on): source `{ kind: 'dust' }`. Flags are never in a capsule
 *   or crate pool and never on the odds panel; the Atlas shows the fixed price instead.
 * - Country flags only (the 193 UN members, the Holy See and Palestine, keyed by ISO 3166-1 alpha-2;
 *   item id = lowercase code, `_` for `-`), plus the "Other flags" group (`region: 'other'`: Faroe
 *   Islands, Greenland, England, Scotland and Wales), which does not count toward the 195. No political
 *   or hate symbols. A player's flag is only ever their own pick, never inferred from location.
 * - `region` is a browsing group only ({@link FLAG_REGIONS}); the search finds every flag from any region.
 * - The 50 rows below came from `raw/cosmetics.ts` unchanged (same ids, rarities, names and art ids); C0
 *   (2026-10-08) set their source to `dust` and added their region. Owners keep them: nothing is taken
 *   away, and an unopened capsule rolled before keeps its flag.
 * - A new row ships with `released: false` until its art (the vendored SVG and its atlas cell) is in.
 */
import type { CosmeticItemDef, FlagRegion, TitleDef } from '../types';

/** The Atlas's browsing groups in chip order; `other` (the flags outside the 195) comes last and has no reward. */
export const FLAG_REGIONS: readonly FlagRegion[] = ['europe', 'asia', 'africa', 'northAmerica', 'southAmerica', 'oceania', 'other'];

export const nationalFlagItems: CosmeticItemDef[] = [
  { id: 'dk', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.dk', nameKey: 'cosmetic.nationalFlag.dk.name', country: 'dk', region: 'europe' },
  { id: 'fo', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.fo', nameKey: 'cosmetic.nationalFlag.fo.name', country: 'fo', region: 'other' },
  { id: 'gl', collection: 'nationalFlag', rarity: 'rare', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.gl', nameKey: 'cosmetic.nationalFlag.gl.name', country: 'gl', region: 'other' },
  { id: 'se', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.se', nameKey: 'cosmetic.nationalFlag.se.name', country: 'se', region: 'europe' },
  { id: 'no', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.no', nameKey: 'cosmetic.nationalFlag.no.name', country: 'no', region: 'europe' },
  { id: 'fi', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.fi', nameKey: 'cosmetic.nationalFlag.fi.name', country: 'fi', region: 'europe' },
  { id: 'is', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.is', nameKey: 'cosmetic.nationalFlag.is.name', country: 'is', region: 'europe' },
  { id: 'gb', collection: 'nationalFlag', rarity: 'rare', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.gb', nameKey: 'cosmetic.nationalFlag.gb.name', country: 'gb', region: 'europe' },
  { id: 'gb_eng', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.gb_eng', nameKey: 'cosmetic.nationalFlag.gb_eng.name', country: 'gb-eng', region: 'other' },
  { id: 'gb_sct', collection: 'nationalFlag', rarity: 'rare', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.gb_sct', nameKey: 'cosmetic.nationalFlag.gb_sct.name', country: 'gb-sct', region: 'other' },
  { id: 'ie', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.ie', nameKey: 'cosmetic.nationalFlag.ie.name', country: 'ie', region: 'europe' },
  { id: 'us', collection: 'nationalFlag', rarity: 'rare', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.us', nameKey: 'cosmetic.nationalFlag.us.name', country: 'us', region: 'northAmerica' },
  { id: 'ca', collection: 'nationalFlag', rarity: 'rare', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.ca', nameKey: 'cosmetic.nationalFlag.ca.name', country: 'ca', region: 'northAmerica' },
  { id: 'de', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.de', nameKey: 'cosmetic.nationalFlag.de.name', country: 'de', region: 'europe' },
  { id: 'fr', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.fr', nameKey: 'cosmetic.nationalFlag.fr.name', country: 'fr', region: 'europe' },
  { id: 'nl', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.nl', nameKey: 'cosmetic.nationalFlag.nl.name', country: 'nl', region: 'europe' },
  { id: 'be', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.be', nameKey: 'cosmetic.nationalFlag.be.name', country: 'be', region: 'europe' },
  { id: 'lu', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.lu', nameKey: 'cosmetic.nationalFlag.lu.name', country: 'lu', region: 'europe' },
  { id: 'ch', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.ch', nameKey: 'cosmetic.nationalFlag.ch.name', country: 'ch', region: 'europe' },
  { id: 'at', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.at', nameKey: 'cosmetic.nationalFlag.at.name', country: 'at', region: 'europe' },
  { id: 'it', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.it', nameKey: 'cosmetic.nationalFlag.it.name', country: 'it', region: 'europe' },
  { id: 'es', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.es', nameKey: 'cosmetic.nationalFlag.es.name', country: 'es', region: 'europe' },
  { id: 'pt', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.pt', nameKey: 'cosmetic.nationalFlag.pt.name', country: 'pt', region: 'europe' },
  { id: 'pl', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.pl', nameKey: 'cosmetic.nationalFlag.pl.name', country: 'pl', region: 'europe' },
  { id: 'cz', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.cz', nameKey: 'cosmetic.nationalFlag.cz.name', country: 'cz', region: 'europe' },
  { id: 'hu', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.hu', nameKey: 'cosmetic.nationalFlag.hu.name', country: 'hu', region: 'europe' },
  { id: 'gr', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.gr', nameKey: 'cosmetic.nationalFlag.gr.name', country: 'gr', region: 'europe' },
  { id: 'ee', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.ee', nameKey: 'cosmetic.nationalFlag.ee.name', country: 'ee', region: 'europe' },
  { id: 'lv', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.lv', nameKey: 'cosmetic.nationalFlag.lv.name', country: 'lv', region: 'europe' },
  { id: 'lt', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.lt', nameKey: 'cosmetic.nationalFlag.lt.name', country: 'lt', region: 'europe' },
  { id: 'ua', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.ua', nameKey: 'cosmetic.nationalFlag.ua.name', country: 'ua', region: 'europe' },
  { id: 'ro', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.ro', nameKey: 'cosmetic.nationalFlag.ro.name', country: 'ro', region: 'europe' },
  { id: 'bg', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.bg', nameKey: 'cosmetic.nationalFlag.bg.name', country: 'bg', region: 'europe' },
  { id: 'tr', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.tr', nameKey: 'cosmetic.nationalFlag.tr.name', country: 'tr', region: 'asia' },
  { id: 'jp', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.jp', nameKey: 'cosmetic.nationalFlag.jp.name', country: 'jp', region: 'asia' },
  { id: 'kr', collection: 'nationalFlag', rarity: 'rare', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.kr', nameKey: 'cosmetic.nationalFlag.kr.name', country: 'kr', region: 'asia' },
  { id: 'in', collection: 'nationalFlag', rarity: 'rare', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.in', nameKey: 'cosmetic.nationalFlag.in.name', country: 'in', region: 'asia' },
  { id: 'th', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.th', nameKey: 'cosmetic.nationalFlag.th.name', country: 'th', region: 'asia' },
  { id: 'vn', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.vn', nameKey: 'cosmetic.nationalFlag.vn.name', country: 'vn', region: 'asia' },
  { id: 'id', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.id', nameKey: 'cosmetic.nationalFlag.id.name', country: 'id', region: 'asia' },
  { id: 'au', collection: 'nationalFlag', rarity: 'rare', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.au', nameKey: 'cosmetic.nationalFlag.au.name', country: 'au', region: 'oceania' },
  { id: 'nz', collection: 'nationalFlag', rarity: 'rare', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.nz', nameKey: 'cosmetic.nationalFlag.nz.name', country: 'nz', region: 'oceania' },
  { id: 'br', collection: 'nationalFlag', rarity: 'rare', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.br', nameKey: 'cosmetic.nationalFlag.br.name', country: 'br', region: 'southAmerica' },
  { id: 'ar', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.ar', nameKey: 'cosmetic.nationalFlag.ar.name', country: 'ar', region: 'southAmerica' },
  { id: 'cl', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.cl', nameKey: 'cosmetic.nationalFlag.cl.name', country: 'cl', region: 'southAmerica' },
  { id: 'co', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.co', nameKey: 'cosmetic.nationalFlag.co.name', country: 'co', region: 'southAmerica' },
  { id: 'za', collection: 'nationalFlag', rarity: 'rare', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.za', nameKey: 'cosmetic.nationalFlag.za.name', country: 'za', region: 'africa' },
  { id: 'ng', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.ng', nameKey: 'cosmetic.nationalFlag.ng.name', country: 'ng', region: 'africa' },
  { id: 'gh', collection: 'nationalFlag', rarity: 'common', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.gh', nameKey: 'cosmetic.nationalFlag.gh.name', country: 'gh', region: 'africa' },
  { id: 'jm', collection: 'nationalFlag', rarity: 'rare', source: { kind: 'dust' }, art: 'cosmetic.nationalFlag.jm', nameKey: 'cosmetic.nationalFlag.jm.name', country: 'jm', region: 'northAmerica' },
];

/**
 * The Atlas's rewards (PLAN 2d "Region completion rewards", earned and never sold): a Region Pennant
 * (a `baseFlag` item with source `{ kind: 'flagRegion', region }`) per completed region, and the
 * Legendary base flag World Compass (source `{ kind: 'flagsOwned', count: 195 }`). Track D adds them
 * with their art (`released: false` until it ships).
 */
export const flagRewardItems: CosmeticItemDef[] = [];

/** The Atlas's title, "World Ambassador" (unlock `{ kind: 'flagsOwned', count: 195 }`); Track D adds it. */
export const flagTitles: TitleDef[] = [];
