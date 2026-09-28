/**
 * Slot checksum (DESIGN B8 Keys): FNV-1a 32 over the UTF-8 bytes of the payload string, exactly as
 * written to storage, so any change to the stored text is caught before the JSON is even parsed.
 */
import { fnv1a32 } from '@/core/hash';

export function checksum(payload: string): number {
  return fnv1a32(payload);
}
