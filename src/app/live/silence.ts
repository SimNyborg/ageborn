/**
 * A battle view's sounds, with an off switch for a live match's catch-up (queue item 34): when a hidden
 * tab comes back, the battle fast-forwards through the ticks it missed, and the hundreds of hits, spawns
 * and coins of that minute must not play at once. Music cues still follow (an evolve during the catch-up
 * changes the age's music); ducks are skipped while silent.
 */
import type { AudioService } from '@/contracts';

export interface Silenceable {
  readonly audio: AudioService;
  setSilent(on: boolean): void;
  readonly silent: boolean;
}

export function silenceable(inner: AudioService): Silenceable {
  let silent = false;
  // the battle ambience (queue item 38 A7, duck-typed on the web audio service): forwarded, held at 0 while silent
  const ambience = (inner as { setBattleAmbience?: (level: number) => void }).setBattleAmbience?.bind(inner);
  let level = 0;
  const audio: AudioService & { setBattleAmbience?: (level: number) => void } = {
    ...(ambience
      ? {
          setBattleAmbience: (l: number) => {
            level = l;
            ambience(silent ? 0 : l);
          },
        }
      : {}),
    unlock: () => inner.unlock(),
    play: (id, o) => {
      if (!silent) inner.play(id, o);
    },
    setBusVolume: (bus, v) => inner.setBusVolume(bus, v),
    music: {
      setCue: (cue, o) => inner.music.setCue(cue, o),
      setLayer: (l, v) => inner.music.setLayer(l, v),
      transpose: (s) => inner.music.transpose(s),
      duck: (db, ms) => {
        if (!silent) inner.music.duck(db, ms);
      },
      stop: (ms) => inner.music.stop(ms),
    },
  };
  return {
    audio,
    setSilent(on) {
      silent = on;
      ambience?.(on ? 0 : level);
    },
    get silent() {
      return silent;
    },
  };
}
