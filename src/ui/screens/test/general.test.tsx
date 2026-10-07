/**
 * Customize › General ("Make your General", owner request 2026-10-07, AUDIT §6): slot tabs and part
 * tiles, instant equips with Undo, try-on of locked wearables with their source and the "never sold"
 * line, the profile picture tiles (frame, banner, title), and Profile's pencil jumping here.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { text } from './dom';
import { mount, type Mounted } from './harness';

let m: Mounted | null = null;
afterEach(() => {
  m?.unmount();
  m = null;
});

const general = () => mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'customize', tab: 'general' }] });
const calls = (name: string) => m!.log.calls.filter((c) => c.name === name).map((c) => c.args[0]);

describe('Customize › General', () => {
  it('is the first tab and opens on the face slot with skin swatches and starter tiles', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'customize' }] });
    expect(m.q('[data-testid="cust-general"]')).not.toBeNull();
    expect(m.qa('[role="tab"]')[0]?.getAttribute('data-testid')).toBe('tab-general');
    expect(m.q('[data-testid="gen-swatches"]')).not.toBeNull();
    expect(m.q('[data-testid="gen-part-face_round"]')).not.toBeNull();
  });

  it('equips a starter part at once and Undo puts the old look back', () => {
    m = general();
    m.click('[data-testid="gen-tab-hair"]');
    m.click('[data-testid="gen-part-hair_afro"]');
    expect(calls('equipCosmetic').at(-1)).toEqual({ slot: 'avatar', look: { hair: 'hair_afro' } });
    expect(m.save.value.profile.avatar.look?.hair).toBe('hair_afro');
    m.click('[data-testid="gen-undo"]');
    expect(m.save.value.profile.avatar.look?.hair).not.toBe('hair_afro');
  });

  it('tries a locked wearable on without equipping it and says how it is earned, never a price', () => {
    m = general();
    m.click('[data-testid="gen-tab-headwear"]');
    const before = calls('equipCosmetic').length;
    m.click('[data-testid="gen-part-hat_sun_crown"]');
    expect(calls('equipCosmetic').length).toBe(before);
    expect(m.q('[data-testid="gen-trying"]')).not.toBeNull();
    const src = text(m.q('[data-testid="gen-source"]')!);
    expect(src).toContain('Wardrobe Crate');
    expect(src).toContain('Earned in play. Never sold.');
    expect(src).not.toMatch(/buy|price|€|\$/i);
  });

  it('picks a banner and shows frames and titles as picture tiles', () => {
    m = general();
    m.click('[data-testid="gen-tab-banner"]');
    m.click('[data-testid="banner-tar_pit"]');
    m.click('[data-testid="gen-tab-frame"]');
    expect(m.q('[data-testid="frame-none"]')).not.toBeNull();
    m.click('[data-testid="gen-tab-title"]');
    expect(m.q('[data-testid="title-recruit"]')).not.toBeNull();
  });

  it("Profile's avatar jumps to the General tab", () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'profile' }] });
    m.click('[data-testid="edit-look"]');
    const top = m.router.current.value;
    expect(top.id).toBe('customize');
    expect((top as { tab?: string }).tab).toBe('general');
  });
});
