import { describe, expect, it } from 'vitest';
import { hdSheetUrl, wantsHdSheets } from '../adapters/atlas';
import { portraitStillBase } from '../adapters/atlasPortrait';

describe('HD unit sheets and portrait stills', () => {
  it('maps a unit sheet to its HD sheet and leaves other sources alone', () => {
    expect(hdSheetUrl('/ageborn/art/units/stone/bonker.json')).toBe('/ageborn/art/units/stone/bonker.hd.json');
    expect(hdSheetUrl('/ageborn/art/units/stone/bonker.hd.json')).toBe('/ageborn/art/units/stone/bonker.hd.json');
    expect(hdSheetUrl('/ageborn/art/turrets/stone/rock_tosser.json')).toBe('/ageborn/art/turrets/stone/rock_tosser.json');
  });

  it('picks HD sheets only when the 1x sheets would be upscaled', () => {
    expect(wantsHdSheets(0.82, 1)).toBe(false); // 1280 px desktop
    expect(wantsHdSheets(1.23, 1)).toBe(false); // 1920 px desktop
    expect(wantsHdSheets(0.82, 2)).toBe(true); // 1280 px at DPR 2
    expect(wantsHdSheets(0.54, 3)).toBe(true); // phone at DPR 3
  });

  it('finds the card still of a unit sheet', () => {
    expect(portraitStillBase('art/units/medieval/footman.json')).toBe('art/portraits/footman');
    expect(portraitStillBase('art/bases/stone.json')).toBeNull();
  });
});
