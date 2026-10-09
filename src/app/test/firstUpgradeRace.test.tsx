/**
 * G4 (2026-10-08): the forced upgrade's skip (a save that cannot take the upgrade never sees the step)
 * writes the save from an effect, and Preact runs effects after paint. A save written between the render
 * and that effect (the Flag Atlas's first flag, a claim) was overwritten by the copy the render saw. The
 * effect now reads the save as it is when it runs.
 */
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { content } from '@/content';
import { FixedClock } from '@/contracts/fakes/clock';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { meta } from '@/meta';
import { installDom, type FakeElement } from '@/ui/screens/test/dom';
import { AppController } from '../controller';
import { buildServices, DEFAULT_CHOICE } from '../services';
import { AppUiContext, type AppUi } from '../ui/context';
import { FIRST_UPGRADE_FLAG, FirstUpgrade } from '../ui/FirstUpgrade';

let container: FakeElement | null = null;
afterEach(() => {
  if (container) act(() => render(null, container as unknown as HTMLElement));
  container = null;
});

/** A profile right after onboarding whose Bonker cannot be upgraded (no Amber): the step is skipped. */
function blockedProfile(): SaveDoc {
  const s = meta.newSave(content, { now: () => Date.UTC(2026, 9, 8, 12) }, 7);
  return {
    ...s,
    matchesPlayed: 3,
    tutorial: { ...s.tutorial, step: 4 },
    currencies: { ...s.currencies, amber: 0 },
    collection: { ...s.collection, bonker: { level: 1, copies: 0, isNew: false, foil: 'none' } },
  };
}

describe('the forced upgrade skip (G4)', () => {
  it('a save written between the render and its effect survives the skip', async () => {
    const services = await buildServices({ choice: { ...DEFAULT_CHOICE, save: 'memory' }, clock: new FixedClock() });
    const s0 = blockedProfile();
    const c = new AppController(services, { save: s0, homeScreen: true });
    const ui: AppUi = {
      controller: c,
      services,
      art: new FakeArtProvider(),
      viewOf: () => undefined,
      createView: () => {
        throw new Error('no battles here');
      },
      scheduler: null,
      portrait: async () => '',
      t: (k) => k,
    };
    const dom = installDom();
    container = dom.container;
    // the render sees s0; its effect waits for the next paint
    render(
      <AppUiContext.Provider value={ui}>
        <FirstUpgrade />
      </AppUiContext.Provider>,
      container as unknown as HTMLElement,
    );
    // ...and a write lands first (as the e2e Flag Atlas gives Denmark right after the profile is set)
    const s1: SaveDoc = { ...s0, flags: { ...s0.flags, 'test.written': true }, currencies: { ...s0.currencies, dust: 999 } };
    c.setSave(s1);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const now = c.save.peek()!;
    expect(now.flags[FIRST_UPGRADE_FLAG]).toBe(true);
    expect(now.flags['test.written']).toBe(true);
    expect(now.currencies.dust).toBe(999);
  });
});
