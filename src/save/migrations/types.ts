import type { Migration } from '@/contracts';

/** One save format version and the pure step that produces it from the previous one (DESIGN B8). */
export interface SaveVersion {
  /** The version number this entry describes (`SaveDoc.v`). */
  v: number;
  /** One line: what changed in this version. */
  summary: string;
  /**
   * `m[v - 1]`: upgrades a doc of version `v - 1` to this version and sets `v`. Pure: it receives a
   * private deep copy and returns the new doc. Absent only for version 1.
   */
  up?: Migration;
}
