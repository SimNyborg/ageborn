/**
 * Emote ids (DESIGN A18.9.4): an `emote` command may carry a starter emote, a collected emote
 * (`emote.<id>`) or a fixed quote (`quote.<id>`) the content lists; anything else is rejected, so the
 * event stream only carries known ids. Content without the collections (the fixture) keeps the six.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { raw } from '@/content/raw';
import { emoteIds, rulesFor } from '../rules';
import { compileForSim } from '../shim';

describe('emote ids (A18.9.4)', () => {
  it('accepts the starter emotes, collected emotes and quotes of the content, nothing else', () => {
    const ids = rulesFor(content).emotes;
    for (const id of ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg', 'emote.bonk', 'emote.supernova', 'quote.glhf', 'quote.honour']) expect(ids.has(id), id).toBe(true);
    for (const id of ['nationalFlag.dk', 'baseFlag.ember', 'quote.nope', 'emote.', 'dance', '']) expect(ids.has(id), id).toBe(false);
    const col = content.cosmetics.collections.items.filter((x) => x.collection === 'emote' || x.collection === 'quote');
    expect(ids.size).toBe(6 + col.length);
  });

  it('keeps the six starter emotes for content without collections', () => {
    expect([...rulesFor(compileForSim(raw)).emotes].sort()).toEqual(['angry', 'cry', 'gg', 'laugh', 'salute', 'thumbsUp']);
    expect([...emoteIds({ ...content, cosmetics: null })].length).toBe(6);
  });
});
