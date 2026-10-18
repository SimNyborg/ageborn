/**
 * Settings over a running live match (queue item 34; orchestrator decision 4, review O S3): the sticky
 * "Match running · Back to battle" bar, and Import and Reset waiting until the match is over. Offline (no
 * live match) Settings is unchanged. The mute switch is the default for every match (decision 5).
 */
import { signal } from '@preact/signals';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { content } from '@/content';
import type { SaveDoc } from '@/contracts';
import { i18n } from '@/i18n';
import { createRouter } from '../../../router';
import { FIXTURE_NOW, fixtureSave } from '../../fixtures/saves';
import { createPreviewServices } from '../../fixtures/services';
import { ScreenHost } from '../../ScreenHost';
import { installDom, text, type FakeElement } from '../../test/dom';
import { SettingsLiveContext, type SettingsLiveMatch } from '../liveMatch';

let container: FakeElement | null = null;

afterEach(() => {
  if (container) act(() => render(null, container as unknown as HTMLElement));
  container = null;
});

function mountSettings(live: SettingsLiveMatch | null) {
  const dom = installDom();
  container = dom.container;
  const save = signal<SaveDoc>(fixtureSave(content, 'mid'));
  const router = createRouter({ id: 'home' });
  router.go({ id: 'settings' });
  const services = createPreviewServices({ save, content, router, log: { calls: [] } });
  const env = { save, content, t: (k: string, p?: Record<string, string | number>) => i18n.t(k, p), locale: 'en', now: () => FIXTURE_NOW, router, services, portrait: null };
  act(() => {
    render(
      <SettingsLiveContext.Provider value={live}>
        <ScreenHost env={env} slots={{ battle: () => null }} />
      </SettingsLiveContext.Provider>,
      dom.container as unknown as HTMLElement,
    );
  });
  const q = (sel: string) => dom.container.querySelector(sel);
  return { q, router };
}

describe('Settings over a live match (queue item 34, decision 4)', () => {
  it('offline: no bar, Import and Reset as before', () => {
    const { q } = mountSettings(null);
    expect(q('[data-testid="set-live-bar"]')).toBeNull();
    expect(q('[data-testid="set-live-note"]')).toBeNull();
    expect(q('[data-testid="import"]')!.getAttribute('aria-disabled')).not.toBe('true');
    act(() => q('[data-testid="import"]')!.click());
    expect(q('[data-testid="import-modal"]')).not.toBeNull();
  });

  it('a running live match: the bar says so and takes you back; Import and Reset wait for the end', () => {
    const running = signal(true);
    const { q, router } = mountSettings({ foeName: 'SirBadger', clock: signal('7:14'), running });
    const bar = q('[data-testid="set-live-bar"]')!;
    expect(text(bar)).toContain('Match running');
    expect(text(bar)).toContain('SirBadger · 7:14');
    expect(text(q('[data-testid="set-live-note"]')!)).toBe('Import and Reset wait until the match is over.');
    // both explain themselves on a tap instead of opening their dialogs
    for (const id of ['import', 'reset']) {
      expect(q(`[data-testid="${id}"]`)!.getAttribute('aria-disabled')).toBe('true');
      act(() => q(`[data-testid="${id}"]`)!.click());
    }
    expect(q('[data-testid="import-modal"]')).toBeNull();
    expect(q('[data-testid="reset-1"]')).toBeNull();
    // the mute switch says it is the default for every match
    expect(text(q('[data-testid="set-mute-emotes"]')!)).toContain('Mute opponents in every match');
    // the moment between the end and the Result
    act(() => {
      running.value = false;
    });
    expect(text(q('[data-testid="set-live-bar"]')!)).toContain('Match over');
    act(() => q('[data-testid="set-live-back"]')!.click());
    expect(router.current.value.id).toBe('home');
  });
});
