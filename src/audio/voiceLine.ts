/**
 * Narrator line ids (queue item 39). A line is an i18n key read aloud; a key with placeholders filled from
 * other keys (the hint "Heavies! Send {card}.") has one line per filling. Shared by the render tool
 * (`tools/audio/voice`), the generated manifest (`voice.gen.ts`) and the app, so all three name a line alike.
 */

/** `key`, or `key{name=valueKey,...}` with the placeholders in name order (their values are i18n keys). */
export function voiceLineId(key: string, vars?: Readonly<Record<string, string>> | null): string {
  const names = vars ? Object.keys(vars).sort() : [];
  if (names.length === 0) return key;
  return `${key}{${names.map((n) => `${n}=${vars![n]}`).join(',')}}`;
}
