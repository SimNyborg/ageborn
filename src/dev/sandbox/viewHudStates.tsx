/**
 * The HUD state gallery (C2/WP5 DoD: "the HUD renders every state"): one read-only HUD per sample
 * state over a painted lane, at a desktop size (1280×720, 88 px cards) or a landscape phone
 * (844×390, 72 px cards), in any colourblind preset.
 */
import type { TeamPreset } from '@/contracts';
import { Hud, hudSamples } from '@/ui/hud';
import { useMemo, useState } from 'preact/hooks';
import { realMatchConfig } from './viewSources';

const SIZES = {
  desktop: { w: 1280, h: 720, scale: 0.62 },
  phone: { w: 844, h: 390, scale: 0.8 },
} as const;

const LANE_BG =
  'linear-gradient(180deg, #2b3a66 0%, #4d5f8f 30%, #8a9aa8 58%, #6e8b3d 60%, #5b4430 72%, #3e2e22 100%)';

export function HudStates() {
  const [size, setSize] = useState<keyof typeof SIZES>('desktop');
  const [preset, setPreset] = useState<TeamPreset>('default');
  const [format, setFormat] = useState<'full' | 'short' | 'tutorial'>('full');
  const config = useMemo(() => realMatchConfig(format, 1), [format]);
  const samples = useMemo(() => hudSamples(config, 0), [config]);
  const dim = SIZES[size];
  return (
    <div style={{ padding: '12px', color: '#f4ecd8', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '12px' }} data-testid="hud-states">
      <div style={{ marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <b>HUD states ({samples.length})</b>
        <label>
          size{' '}
          <select value={size} onChange={(e) => setSize((e.target as HTMLSelectElement).value as keyof typeof SIZES)}>
            <option value="desktop">desktop 1280×720</option>
            <option value="phone">phone 844×390</option>
          </select>
        </label>
        <label>
          team colours{' '}
          <select value={preset} onChange={(e) => setPreset((e.target as HTMLSelectElement).value as TeamPreset)}>
            <option value="default">default</option>
            <option value="blueYellow">blue / yellow</option>
            <option value="highContrast">high contrast</option>
          </select>
        </label>
        <label>
          format{' '}
          <select value={format} onChange={(e) => setFormat((e.target as HTMLSelectElement).value as 'full' | 'short' | 'tutorial')}>
            <option value="full">full</option>
            <option value="short">short</option>
            <option value="tutorial">tutorial</option>
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
        {samples.map((s) => (
          <figure key={s.id} style={{ margin: 0 }} data-testid={`hud-state-${s.id}`}>
            <figcaption style={{ marginBottom: '4px', maxWidth: `${dim.w * dim.scale}px` }}>
              <b>{s.id}</b>: {s.note}
            </figcaption>
            <div style={{ width: `${dim.w * dim.scale}px`, height: `${dim.h * dim.scale}px`, overflow: 'hidden', border: '1px solid #3a3960' }}>
              <div
                style={{
                  position: 'relative',
                  width: `${dim.w}px`,
                  height: `${dim.h}px`,
                  transform: `scale(${dim.scale})`,
                  transformOrigin: '0 0',
                  background: LANE_BG,
                }}
              >
                <Hud model={s.model} config={config} readOnly keyboard={false} teamPreset={preset} />
              </div>
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
