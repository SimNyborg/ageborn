/**
 * World framing under the HUD (docs/ui-plan.md 3.1, 4.7, 6.5 acceptance: "unit feet and HP pips never
 * sit under HUD chrome at 844 × 340"): with the HUD's insets the ground line sits at most 12 px above
 * the tray, and the tallest unit plus its pips fits under the top band and minimap.
 */
import { describe, expect, it } from 'vitest';
import { Camera } from '../camera';
import { GROUND_ABOVE_TRAY_PX, TALLEST_LU, screenLayout } from '../layout';

/** The HUD's insets at the phone references: top band 44 + minimap row, the 94 px tray. */
const PHONE = { top: 70, bottom: 94 };

describe('world framing under the HUD (3.1)', () => {
  for (const [w, h] of [
    [844, 390],
    [844, 340],
    [800, 360],
    [932, 430],
  ] as const) {
    it(`keeps feet above the tray and the tallest unit under the top band at ${w} × ${h}`, () => {
      const L = screenLayout(w, h, PHONE);
      const trayTop = h - PHONE.bottom;
      expect(L.groundY).toBeLessThanOrEqual(trayTop - GROUND_ABOVE_TRAY_PX + 1e-9);
      expect(L.groundY - TALLEST_LU * L.scale).toBeGreaterThanOrEqual(PHONE.top - 1e-9);
      // Phones use the room: the ground moves down to the tray instead of floating above it.
      expect(L.groundY).toBeGreaterThanOrEqual(screenLayout(w, h).groundY);
    });
  }

  it('zooms out at 844 × 340 rather than cropping units', () => {
    expect(screenLayout(844, 340, PHONE).scale).toBeLessThan(screenLayout(844, 340).scale);
    // At 844 × 390 the band is nearly tall enough: units keep at least 95% of their size.
    expect(screenLayout(844, 390, PHONE).scale).toBeGreaterThan(screenLayout(844, 390).scale * 0.95);
  });

  it('leaves the desktop framing alone when the HUD does not cover it', () => {
    const plain = screenLayout(1280, 720);
    const framed = screenLayout(1280, 720, { top: 92, bottom: 128 });
    expect(framed.scale).toBeCloseTo(plain.scale, 6);
    expect(framed.groundY).toBeCloseTo(plain.groundY, 6);
  });

  it('the camera takes the insets and keeps its centre in bounds', () => {
    const cam = new Camera();
    cam.resize(844, 340);
    const before = cam.scale;
    cam.setInsets(PHONE);
    expect(cam.scale).toBeLessThan(before);
    expect(cam.worldToScreen(0, 0).y).toBeCloseTo(cam.layout.groundY, 6);
    const b = cam.bounds();
    expect(cam.centerX).toBeGreaterThanOrEqual(b.lo);
    expect(cam.centerX).toBeLessThanOrEqual(b.hi);
    // Resizing keeps the insets.
    cam.resize(844, 390);
    expect(cam.layout.groundY).toBeCloseTo(390 - PHONE.bottom - GROUND_ABOVE_TRAY_PX, 6);
  });
});
