/** Types of `gen_unit_manifest.mjs` for the tests that import its checks (the script itself is plain JavaScript). */

/** A sheet JSON as the pipeline writes it (only what the checks read is typed). */
export interface SheetJson {
  frames?: Record<string, unknown>;
  animations?: Record<string, string[]>;
  meta?: { scale?: string | number; image?: string; ageborn?: Record<string, unknown> & { clips?: Record<string, Record<string, unknown>> } };
}

/** A unit's and a skin's core and extras sheets, 1x and HD (null, or left out for HD, when that file is not installed). */
export interface SkinSheets {
  unit: SheetJson | null;
  unitX: SheetJson | null;
  skin: SheetJson | null;
  skinX: SheetJson | null;
  unitHd?: SheetJson | null;
  unitXHd?: SheetJson | null;
  skinHd?: SheetJson | null;
  skinXHd?: SheetJson | null;
}

export const AIM_SUFFIXES: readonly string[];
export function isCoreSheet(file: string): boolean;
export function sheetName(file: string): { slug: string; skin: string | null };
export function aimedBaseOf(name: string): string | null;
export function aimProblems(clips: Record<string, Record<string, unknown>>, where: string): string[];
export function summarize(json: SheetJson, age: string, slug: string, extras?: SheetJson | null): Record<string, unknown>;
export function skinProblems(file: string, o: SkinSheets): string[];
export function summarizeSkin(file: string, age: string, o: SkinSheets, still: boolean): Record<string, unknown>;
export function collect(unitsDir?: string, portraitsDir?: string): { rows: Record<string, unknown>[]; skins: Record<string, unknown>[] };
export function render(rows: readonly Record<string, unknown>[]): string;
export function renderSkins(skins: readonly Record<string, unknown>[]): string;
