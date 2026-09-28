import { describe, expect, it } from 'vitest';
import en from '../../../i18n/hud.en.json';
import { autoAimKey } from '../PowerButton';

describe('autoAimKey (powers that pick their own spot say where they act)', () => {
  it('names a string for every self-placing power kind and none for aimed powers', () => {
    const dict = en as unknown as { hud: { powerAim: { auto: Record<string, string> } } };
    for (const kind of ['stampede', 'paradrop', 'buffAll']) {
      const key = autoAimKey(kind);
      expect(key).toBe(`hud.powerAim.auto.${kind}`);
      expect(dict.hud.powerAim.auto[kind]).toBeTruthy();
    }
    for (const kind of ['barrage', 'sweep', 'cloud', undefined]) expect(autoAimKey(kind)).toBeNull();
  });
});
