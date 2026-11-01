/**
 * Amber and Dust (queue item 48, `?dev=1#currency/<viewport>/<view>`): the two currency icons at every size
 * the game draws them, on the surfaces they sit on, in the places that show them, and the collect moment's lab.
 *
 * - `#currency/844x390/icons` and `#currency/1280x720/icons`: the icon sheet (13 to 96 px, plain and with the
 *   idle shine) on the app background, a panel, a raised row and a button face.
 * - `.../context`: the chips, reward rows, summary pills, quest and road rewards and buttons, as the screens draw them.
 * - `.../lab` (add `/rm` for reduce motion): a mock top bar and reward sources; the buttons play the moment
 *   (`window.__currencyLab.play(kind, amount, mode, target)` does the same for captures).
 *
 * Dev pages are internal tools and are exempt from the i18n rule.
 */
import { i18n } from '@/i18n';
import { Button, IconButton } from '@/ui/components/Button';
import { CurrencyChip } from '@/ui/components/Chips';
import { AmberIcon, BackIcon, DustIcon } from '@/ui/components/icons';
import { PortalContext, UiKitContext, type UiKit } from '@/ui/components/kit';
import '@/ui/theme.css';
import '@/ui/motion.css';
import '@/ui/screens/result/result.css';
import type { ComponentChildren } from 'preact';
import { useMemo, useRef } from 'preact/hooks';

export const title = 'Amber and Dust (queue item 48)';

const t = (k: string, p?: Record<string, string | number>) => i18n.t(k, p);

function parse(): { viewport: string; view: string; mode: string } {
  const parts = decodeURIComponent(window.location.hash.replace(/^#/, '')).split('/');
  return { viewport: parts[1] || '844x390', view: parts[2] || 'icons', mode: parts[3] || '' };
}

/** Every size a screen draws the currencies at (chips 22-26, rows 30-34, inline 13-20), and the large moments. */
export const ICON_SIZES = [13, 16, 18, 20, 22, 26, 30, 34, 48, 64, 96] as const;

const SURFACES: { id: string; bg: string; label: string }[] = [
  { id: 'bg', bg: 'var(--ui-bg)', label: 'background' },
  { id: 's1', bg: 'var(--ui-surface-1)', label: 'panel' },
  { id: 's2', bg: 'var(--ui-surface-2)', label: 'raised row' },
  { id: 'road', bg: '#2c2552', label: 'road card' },
];

const label: Record<string, string | number> = { fontSize: '11px', color: '#a39d91', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' };

function Icon(p: { kind: 'amber' | 'dust'; size: number }) {
  return p.kind === 'amber' ? <AmberIcon size={p.size} /> : <DustIcon size={p.size} />;
}

/** The icon sheet: one row per surface, both currencies at every size. */
function IconSheet(p: { compact: boolean }) {
  const sizes = p.compact ? ICON_SIZES.filter((s) => s <= 64) : ICON_SIZES;
  return (
    <div style={{ display: 'grid', gap: '6px' }} data-testid="currency-sheet">
      {SURFACES.map((s) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: s.bg, borderRadius: '12px', border: '1px solid rgba(107,120,144,0.35)' }} data-surface={s.id}>
          <span style={{ ...label, width: '64px', flex: 'none', color: s.id === 'green' ? '#1d1405' : '#a39d91' }}>{s.label}</span>
          {(['amber', 'dust'] as const).map((k) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '10px' }} data-kind={k}>
              {sizes.map((z) => (
                <Icon key={z} kind={k} size={z} />
              ))}
            </span>
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: '18px', alignItems: 'center', ...label }}>
        {sizes.map((z) => (
          <span key={z} style={{ minWidth: `${z}px`, textAlign: 'center' }}>
            {z}
          </span>
        ))}
      </div>
    </div>
  );
}

/** One Result reward row, as `result/ResultScreen.tsx` draws it (34 px icon). */
function RewardRowMock(p: { icon: ComponentChildren; label: string; value: string }) {
  return (
    <li class="result-reward result-reward--good" style={{ animation: 'none', listStyle: 'none' }}>
      <span class="result-reward__icon" style={{ animation: 'none' }}>
        {p.icon}
      </span>
      <span class="result-reward__main">
        <span class="result-reward__label">{p.label}</span>
      </span>
      <span class="result-reward__value">{p.value}</span>
    </li>
  );
}

/** The places that show the currencies, as their screens draw them. */
function InContext() {
  const pill: Record<string, string | number> = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    height: '34px',
    padding: '0 12px',
    borderRadius: '999px',
    background: 'rgba(8,10,14,0.55)',
    border: '1px solid rgba(107,120,144,0.45)',
    fontWeight: 800,
    fontSize: '16px',
  };
  return (
    <div style={{ display: 'grid', gap: '10px' }} data-testid="currency-context">
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <CurrencyChip kind="amber" value={3450} />
        <CurrencyChip kind="dust" value={820} />
        <CurrencyChip kind="amber" value={3450} compact />
        <CurrencyChip kind="dust" value={820} compact />
        <span style={pill}>
          <AmberIcon size={18} /> +47
        </span>
        <span style={pill}>
          <DustIcon size={18} /> +25
        </span>
        <span style={{ ...pill, background: 'transparent', border: 0 }}>
          <AmberIcon size={18} /> <b>100</b>
        </span>
        <span style={{ ...pill, background: '#2c2552', height: '44px' }}>
          <AmberIcon size={30} /> <b>310</b>
          <DustIcon size={30} /> <b>100</b>
        </span>
      </div>
      <ul style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', margin: 0, padding: 0 }}>
        <RewardRowMock icon={<AmberIcon size={34} />} label={t('ui.currency.amber')} value="+47" />
        <RewardRowMock icon={<DustIcon size={34} />} label={t('ui.currency.dust')} value="+25" />
      </ul>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Button kind="progress" size="l" icon={<AmberIcon size={24} />} primary={false}>
          Upgrade · 350
        </Button>
        <Button kind="secondary" size="m" icon={<DustIcon size={20} />}>
          Craft copy · 100
        </Button>
        <Button kind="progress" size="m" icon={<DustIcon size={22} />} primary={false}>
          Buy · 120
        </Button>
      </div>
    </div>
  );
}

export default function CurrencyPage() {
  const { viewport, view, mode } = parse();
  const [w, h] = viewport.split('x').map(Number) as [number, number];
  const rootRef = useRef<HTMLDivElement>(null);
  const kit: UiKit = useMemo(() => ({ t, locale: 'en', portrait: null, reduceMotion: mode === 'rm' }), [mode]);
  const compact = h <= 480;
  const body =
    view === 'context' ? (
      <InContext />
    ) : view === 'lab' ? (
      <div data-testid="currency-lab-empty">The collect moment lab arrives with the module.</div>
    ) : (
      <IconSheet compact={compact} />
    );
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#050608', overflow: 'auto', display: 'grid', placeItems: 'center' }}>
      <div style={{ position: 'relative', width: `${w}px`, height: `${h}px`, flex: 'none' }} data-testid="currency-frame">
        <UiKitContext.Provider value={kit}>
          <PortalContext.Provider value={rootRef}>
            <div ref={rootRef} class="ui-root" data-testid="ui-root" data-reduce-motion={mode === 'rm' ? 'true' : 'false'}>
              <div class="ui-layer">
                <div class="ui-screen" style={{ animation: 'none' }}>
                  <header class="ui-screen__head">
                    <IconButton icon={<BackIcon size={24} />} label="Back" class="ui-screen__back" />
                    <div class="ui-screen__titles">
                      <h1 class="ui-screen__title">Amber and Dust</h1>
                    </div>
                    <div class="ui-screen__right" />
                  </header>
                  <div class="ui-screen__body" style={{ padding: '10px 16px' }}>
                    {body}
                  </div>
                </div>
              </div>
            </div>
          </PortalContext.Provider>
        </UiKitContext.Provider>
      </div>
    </div>
  );
}
