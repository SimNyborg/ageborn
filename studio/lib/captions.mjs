// Word-timed captions (the hook for narration): turns word timestamps (from a TTS engine that reports
// them, or from faster-whisper / whisperX run on the voice track) into caption overlays for the
// `Reel` composition. Each caption page holds a few words; the current word lights up as it is spoken.
//
// Input words: [{ w: 'Forty', start: 0.42, end: 0.71 }, ...] in seconds from the voice file's start.

/**
 * Splits words into caption pages of at most `maxChars` characters (and never across a sentence end),
 * and returns `caption` overlays for a Timeline: `{ type, at, dur, text, words }` in output frames,
 * with each word's time relative to its page.
 */
export function captionsFromWords(words, { fps = 30, offset = 0, maxChars = 26, y = 1400, size = 56, minFrames = 12 } = {}) {
  const pages = [];
  let cur = [];
  let len = 0;
  for (const w of words) {
    const add = w.w.length + (cur.length ? 1 : 0);
    const endsSentence = cur.length > 0 && /[.!?]$/.test(cur[cur.length - 1].w);
    if (cur.length && (len + add > maxChars || endsSentence)) {
      pages.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(w);
    len += add;
  }
  if (cur.length) pages.push(cur);
  return pages.map((page, i) => {
    const start = page[0].start + offset;
    const next = pages[i + 1];
    const end = Math.max(page[page.length - 1].end + offset + 0.15, next ? Math.min(next[0].start + offset, page[page.length - 1].end + offset + 0.6) : page[page.length - 1].end + offset + 0.6);
    const at = Math.round(start * fps);
    const dur = Math.max(minFrames, Math.round(end * fps) - at);
    return {
      type: 'caption',
      at,
      dur,
      y,
      size,
      text: page.map((w) => w.w).join(' '),
      words: page.map((w) => ({ w: w.w, t: Math.max(0, w.start + offset - start) })),
    };
  });
}

/** Reads faster-whisper / whisperX style JSON ({ segments: [{ words: [{ word, start, end }] }] }) into words. */
export function wordsFromWhisper(json) {
  const out = [];
  for (const seg of json.segments ?? []) for (const w of seg.words ?? []) out.push({ w: String(w.word).trim(), start: w.start, end: w.end });
  return out.filter((w) => w.w.length > 0);
}
