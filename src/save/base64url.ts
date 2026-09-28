/**
 * Base64url without padding (RFC 4648 §5), for save codes that survive copy and paste, URLs and chat
 * apps. Decoding also accepts the standard alphabet (`+`, `/`) and trailing `=` padding.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const DECODE: Int16Array = (() => {
  const t = new Int16Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i += 1) t[ALPHABET.charCodeAt(i)] = i;
  t['+'.charCodeAt(0)] = 62;
  t['/'.charCodeAt(0)] = 63;
  return t;
})();

export function encodeBase64Url(bytes: Uint8Array): string {
  const out: string[] = [];
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out.push(ALPHABET[(n >> 18) & 63]!, ALPHABET[(n >> 12) & 63]!, ALPHABET[(n >> 6) & 63]!, ALPHABET[n & 63]!);
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    out.push(ALPHABET[(n >> 18) & 63]!, ALPHABET[(n >> 12) & 63]!);
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out.push(ALPHABET[(n >> 18) & 63]!, ALPHABET[(n >> 12) & 63]!, ALPHABET[(n >> 6) & 63]!);
  }
  return out.join('');
}

/** Decodes base64url (or standard base64); null when a character is invalid or the length is impossible. */
export function decodeBase64Url(text: string): Uint8Array | null {
  const s = text.replace(/=+$/, '');
  if (s.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    const val = c < 128 ? DECODE[c]! : -1;
    if (val < 0) return null;
    acc = ((acc << 6) | val) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o] = (acc >> bits) & 0xff;
      o += 1;
    }
  }
  return out;
}
