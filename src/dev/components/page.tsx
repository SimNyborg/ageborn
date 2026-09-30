/**
 * UI-0 component gallery (`?dev=1#components/<viewport>`, docs/ui-plan.md 6.2): every shared
 * component of the design system in its states, inside a real `.ui-root` so the breakpoints,
 * tokens and reduce motion apply. The budget spec (tests/e2e/ui-budget.spec.ts) must pass here.
 *
 * `#components/844x390`, `#components/1280x720`, `#components/844x340/rm` (reduce motion) or
 * `#components/844x390/shell` (the tab shell with the bottom bar).
 *
 * Dev pages are internal tools and are exempt from the i18n rule.
 */
import { content } from '@/content';
import { i18n } from '@/i18n';
import { Button, IconButton } from '@/ui/components/Button';
import { CardTile } from '@/ui/components/CardTile';
import { AiBadge, Badge, CurrencyChip, Pill } from '@/ui/components/Chips';
import { ClassChip } from '@/ui/components/ClassIcon';
import { Segmented, Toggle } from '@/ui/components/Controls';
import { AmberIcon, BackIcon, CloseIcon, GearIcon, InfoIcon, PlayIcon, SwordsIcon } from '@/ui/components/icons';
import { PortalContext, UiKitContext, type UiKit } from '@/ui/components/kit';
import { ActionBar, Panel } from '@/ui/components/Layout';
import { Modal, Sheet } from '@/ui/components/Modal';
import { TabBar, type NavTab } from '@/ui/components/Nav';
import { createToastStore, ToastHost } from '@/ui/components/Toasts';
import { Tabs } from '@/ui/components/Tabs';
import { createArtProvider } from '@/visuals';
import { fixtureSave } from '@/ui/screens/fixtures/saves';
import { cardTile } from '@/ui/screens/model/cards';
import '@/ui/theme.css';
import '@/ui/motion.css';
import type { TabId } from '@/ui/router';
import { useMemo, useRef, useState } from 'preact/hooks';

export const title = 'UI components (UI-0)';

const art = createArtProvider({ quality: 'high' });
const t = (k: string, p?: Record<string, string | number>) => i18n.t(k, p);

function parse(): { viewport: string; mode: string } {
  const parts = decodeURIComponent(window.location.hash.replace(/^#/, '')).split('/');
  return { viewport: parts[1] || '844x390', mode: parts[2] || '' };
}

const label: Record<string, string | number> = { fontSize: '12px', color: '#a39d91', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' };
const row: Record<string, string | number> = { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' };

export default function ComponentsPage() {
  const { viewport, mode } = parse();
  const [w, h] = viewport.split('x').map(Number) as [number, number];
  const rootRef = useRef<HTMLDivElement>(null);
  const toasts = useMemo(() => createToastStore(), []);
  const [seg, setSeg] = useState<'short' | 'standard' | 'full'>('standard');
  const [tab, setTab] = useState<'goals' | 'road' | 'feats'>('goals');
  const [nav, setNav] = useState<TabId>('battle');
  const [on, setOn] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [modal, setModal] = useState(false);
  const [done, setDone] = useState(false);
  const kit: UiKit = useMemo(() => ({ t, locale: 'en', portrait: art.portrait.bind(art), reduceMotion: mode === 'rm' }), [mode]);
  const save = useMemo(() => fixtureSave(content, 'mid'), []);
  const tiles = ['bonker', 'pikeman', 'mammoth_matriarch', 'friar'].map((id) => cardTile(save, content, id, t)).filter((x) => x !== null);
  const tabs: NavTab[] = [
    { id: 'army', badge: 1 },
    { id: 'capsules', badge: 2 },
    { id: 'battle' },
    { id: 'progress', lockedUntil: 5, showLevel: true },
    { id: 'customize', lockedUntil: 8 },
  ];

  const body = (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: '16px 24px 24px' }} data-scroll="">
      <div style={{ display: 'grid', gap: '18px', maxWidth: '1180px' }}>
        <section style={{ display: 'grid', gap: '8px' }}>
          <span style={label}>Buttons: kinds (size M)</span>
          <div style={row}>
            <Button kind="primary" icon={<PlayIcon size={22} />} testid="btn-primary" primary={false}>
              Play
            </Button>
            <Button kind="progress" icon={<AmberIcon size={22} />} primary={false}>
              Upgrade
            </Button>
            <Button kind="secondary">Home</Button>
            <Button kind="tertiary">Watch replay</Button>
            <Button kind="destructive" icon={<CloseIcon size={20} />}>
              Retreat
            </Button>
          </div>
        </section>
        <section style={{ display: 'grid', gap: '8px' }}>
          <span style={label}>Sizes: XL, L, M, S, Icon</span>
          <div style={row}>
            <Button kind="secondary" size="xl" icon={<SwordsIcon size={28} />}>
              Play level 4
            </Button>
            <Button kind="secondary" size="l">
              Continue
            </Button>
            <Button kind="secondary" size="m">
              Equip
            </Button>
            <Button kind="secondary" size="s">
              Rename
            </Button>
            <IconButton icon={<BackIcon size={24} />} label="Back" />
            <IconButton icon={<GearIcon size={24} />} label="Settings" badge={3} />
            <IconButton icon={<InfoIcon size={24} />} label="Info" />
          </div>
        </section>
        <section style={{ display: 'grid', gap: '8px' }}>
          <span style={label}>States: disabled with a reason (tap it), loading, done</span>
          <div style={row}>
            <Button kind="progress" disabled reason="Need 2 more copies" testid="btn-denied" icon={<AmberIcon size={22} />}>
              Upgrade · 400
            </Button>
            <Button kind="secondary" loading>
              Saving
            </Button>
            <Button kind="secondary" done={done} onClick={() => setDone(true)}>
              Claim
            </Button>
            <Button
              kind="secondary"
              testid="btn-toast"
              onClick={() => toasts.show('Equipped Spear Hunter', { tone: 'good', anchor: document.querySelector('[data-testid="btn-toast"]'), undo: () => undefined })}
            >
              Toast with Undo
            </Button>
            <Button kind="secondary" testid="btn-sheet" onClick={() => setSheet(true)}>
              Open sheet
            </Button>
            <Button kind="secondary" testid="btn-modal" onClick={() => setModal(true)}>
              Open modal
            </Button>
          </div>
        </section>
        <section style={{ display: 'grid', gap: '8px' }}>
          <span style={label}>Tabs, segmented, toggle</span>
          <Tabs
            label="Progress"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'goals', label: 'Goals' },
              { value: 'road', label: 'Trophy Road', badge: <Badge tone="green">2</Badge> },
              { value: 'feats', label: 'Feats' },
            ]}
            testid="demo-tabs"
          />
          <div style={row}>
            <Segmented
              label="Format"
              value={seg}
              onChange={setSeg}
              options={[
                { value: 'short', label: 'Short' },
                { value: 'standard', label: 'Standard' },
                { value: 'full', label: 'Full' },
              ]}
              testid="demo-seg"
            />
            <div style={{ width: '280px' }}>
              <Toggle label="Reduce motion" checked={on} onChange={setOn} />
            </div>
          </div>
        </section>
        <section style={{ display: 'grid', gap: '8px' }}>
          <span style={label}>Chips, pills, tags, badges, class icon chips</span>
          <div style={row}>
            <CurrencyChip kind="amber" value={3450} />
            <CurrencyChip kind="dust" value={820} />
            <Pill>Tier III</Pill>
            <Pill tone="gold">Hard</Pill>
            <AiBadge />
            <span class="ui-tag ui-tag--new" data-tag="">
              New
            </span>
            <span class="ui-tag" data-tag="">
              AI
            </span>
            <Badge tone="green">3</Badge>
            <Badge>!</Badge>
            <ClassChip id="infantry" />
            <ClassChip id="antiArmor" />
            <ClassChip id="heavy" size="sm" />
            <ClassChip id="ranged" legendary />
          </div>
        </section>
        <section style={{ display: 'grid', gap: '8px' }}>
          <span style={label}>Card tiles and a panel</span>
          <div style={{ ...row, alignItems: 'flex-start' }}>
            {tiles.map((c) => (
              <CardTile key={c.id} card={c} size="sm" showCopies onClick={() => undefined} label={c.name} />
            ))}
            <Panel title="Panel" icon={<InfoIcon size={20} />}>
              <p style={{ maxWidth: '260px', fontSize: 'var(--ui-fs-body)', lineHeight: 'var(--ui-lh-body)' }}>Slate surface, one key light from the top-left, a 1 px highlight.</p>
            </Panel>
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#050608', overflow: 'auto', display: 'grid', placeItems: 'center' }}>
      <div style={{ position: 'relative', width: `${w}px`, height: `${h}px`, flex: 'none' }} data-testid="components-frame">
        <UiKitContext.Provider value={kit}>
          <PortalContext.Provider value={rootRef}>
            <div ref={rootRef} class="ui-root" data-testid="ui-root" data-reduce-motion={mode === 'rm' ? 'true' : 'false'}>
              <div class="ui-layer">
                {mode === 'shell' ? (
                  <div class="ui-shell" data-testid="shell">
                    <div class="ui-shell__content">{body}</div>
                    <div class="ui-shell__bar">
                      <TabBar tabs={tabs} active={nav} onSelect={setNav} />
                      <div style={{ flex: 1 }} />
                      <Button kind="secondary" size="m" icon={<SwordsIcon size={22} />} style={{ marginBottom: '8px' }}>
                        Modes
                      </Button>
                      <Button kind="primary" size="xl" pulse testid="shell-play" style={{ marginBottom: '4px' }}>
                        Play
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div class="ui-screen ui-screen--has-bar" style={{ animation: 'none' }}>
                    <header class="ui-screen__head">
                      <IconButton icon={<BackIcon size={24} />} label="Back" class="ui-screen__back" />
                      <div class="ui-screen__titles">
                        <h1 class="ui-screen__title">Design system</h1>
                      </div>
                      <div class="ui-screen__right">
                        <CurrencyChip kind="amber" value={3450} compact />
                      </div>
                    </header>
                    <div class="ui-screen__body" style={{ padding: 0 }}>
                      {body}
                    </div>
                    <ActionBar
                      tertiary={<Button kind="tertiary">Show odds</Button>}
                      secondary={<Button kind="secondary">Use</Button>}
                      primary={
                        <Button kind="progress" size="l" primary icon={<AmberIcon size={24} />} testid="bar-primary">
                          Upgrade · 400
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
              {sheet ? (
                <Sheet
                  title="Level 4: Tuskback Ambush"
                  onClose={() => setSheet(false)}
                  testid="demo-sheet"
                  actions={{
                    secondary: <Button kind="secondary">Edit army</Button>,
                    primary: (
                      <Button kind="primary" size="l" icon={<PlayIcon size={24} />}>
                        Play level 4
                      </Button>
                    ),
                  }}
                >
                  <p style={{ fontSize: 'var(--ui-fs-body)', lineHeight: 'var(--ui-lh-body)' }}>A side panel from the right on phones, centred on desktop. Swipe right, tap the scrim, press Esc or back to close.</p>
                  <div style={row}>
                    <Pill>Tier III</Pill>
                    <AiBadge />
                  </div>
                </Sheet>
              ) : null}
              {modal ? (
                <Modal
                  title="Reset save?"
                  tone="danger"
                  size="sm"
                  onClose={() => setModal(false)}
                  footer={
                    <>
                      <Button kind="secondary" onClick={() => setModal(false)} autofocus>
                        Cancel
                      </Button>
                      <Button kind="destructive" onClick={() => setModal(false)}>
                        Reset
                      </Button>
                    </>
                  }
                >
                  <p>This deletes your cards and progress. It cannot be undone.</p>
                </Modal>
              ) : null}
              <ToastHost store={toasts} />
            </div>
          </PortalContext.Provider>
        </UiKitContext.Provider>
      </div>
    </div>
  );
}
