/**
 * Art gallery (WP4, DESIGN B5): the review sheet and screenshot-test target for every visual.
 *
 *  - units / turrets: every visualId × clip × skin × team (both sides) × colourblind preset
 *  - world: split-age backdrops, arena grounds, bases (crumble, Treasury, horn, morph, collapse),
 *    turrets on their mounts, an optional parade
 *  - effects: every A14.1 effect and projectile
 *  - portraits: DOM portraits with foils, icons
 *  - checks: colour rule, silhouette IoU, width, scale, structure (same SVG data as the bake)
 *  - handoff: SVG sheets of the part sources for artists
 *  - bake: boot and lazy bake times against the B16 budget, atlas pages
 *
 * All state is in the hash (see state.ts); `t=<ms>` freezes animation for screenshots.
 */
import { useRef } from 'preact/hooks';
import type { UnitPose } from '@/contracts/art';
import type { AgeId, Side, TeamPreset } from '@/contracts/ids';
import { AGES } from '@/visuals/ages';
import { ARENAS } from '@/visuals/backdrops/ground';
import type { VisualKind } from '@/visuals/adapters/types';
import { TEAM_PRESETS } from '@/visuals/palette';
import { STYLE, WORLD } from '@/visuals/style';
import { UNIT_CLIPS } from './cells';
import { buildEffects } from './effects';
import { BakePanel, ChecksPanel, HandoffPanel, PortraitsPanel } from './panels';
import { PixiStage } from './stage';
import { get, num, ui, useParams, writeParams } from './state';
import { buildGrid } from './units';
import { buildWorld, type WorldControls } from './world';

export const title = 'Art gallery';

/** A12 checklist #7 "readable at 32 px height": the zoom that draws infantry 32 px tall (CSS px). */
const READABLE_ZOOM = (Math.round((STYLE.minReadablePx / STYLE.heightInfantryLu) * 100) / 100).toString();

const SECTIONS = ['units', 'turrets', 'world', 'effects', 'portraits', 'checks', 'handoff', 'bake'] as const;
type Section = (typeof SECTIONS)[number];

function Select(p: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; testId?: string }) {
  return (
    <label style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', color: ui.dim }}>
      {p.label}
      <select value={p.value} data-testid={p.testId} onChange={(e) => p.onChange((e.target as HTMLSelectElement).value)}>
        {p.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Gallery() {
  const params = useParams();
  const section = (SECTIONS as readonly string[]).includes(get(params, 'section', 'units')) ? (get(params, 'section', 'units') as Section) : 'units';
  const preset = get(params, 'preset', 'default') as TeamPreset;
  // `atlas` (default) draws what the manifest says: the 3D sheets where they exist, code-drawn art
  // elsewhere. `procedural` and `placeholder` force that tier for every visual, for comparison.
  const tierParam = get(params, 'tier', 'atlas');
  const tier: VisualKind | null = tierParam === 'placeholder' ? 'placeholder' : tierParam === 'procedural' ? 'procedural' : null;
  const quality = get(params, 'quality', 'high') === 'lite' ? 'lite' : 'high';
  const freeze = params.has('t') ? num(params, 't', 0) : null;
  const speed = num(params, 'speed', 1);
  const set = (k: string) => (v: string) => writeParams({ [k]: v });
  const worldControls = useRef<WorldControls | null>(null);

  const age = get(params, 'age', 'stone') as AgeId | 'all';
  const sidesParam = get(params, 'sides', 'both');
  const sides: Side[] = sidesParam === '0' ? [0] : sidesParam === '1' ? [1] : [0, 1];
  const clip = get(params, 'clip', 'cycle');
  const skins = get(params, 'skins', '1') === '1';
  const trim = get(params, 'trim', 'none') as UnitPose['levelTrim'];
  const zoom = num(params, 'zoom', 1.6);
  const only = params.get('only');
  // `atlas=unit.bonker:/path/bonker.json,unit.x:/path/x.json` swaps visuals to sprite sheets (B5 tiers).
  const atlas = Object.fromEntries(
    (params.get('atlas') ?? '')
      .split(',')
      .map((e) => e.split(':'))
      .filter((e): e is [string, string] => e.length === 2 && e[0] !== '' && e[1] !== ''),
  );

  const common = (
    <>
      <Select label="preset" value={preset} options={TEAM_PRESETS} onChange={set('preset')} testId="gallery-preset" />
      <Select label="tier" value={tierParam} options={['atlas', 'procedural', 'placeholder']} onChange={set('tier')} />
      <Select label="quality" value={quality} options={['high', 'lite']} onChange={set('quality')} />
      <Select label="speed" value={String(speed)} options={['0.25', '0.5', '1', '2']} onChange={set('speed')} />
    </>
  );

  let body;
  if (section === 'units' || section === 'turrets') {
    const kind = section === 'units' ? 'unit' : 'turret';
    const clips = kind === 'unit' ? ['cycle', ...UNIT_CLIPS] : ['cycle', 'build', 'idle', 'fire', 'outdated', 'modernise', 'sell'];
    body = (
      <>
        <div style={bar}>
          <Select label="age" value={age} options={['all', ...AGES]} onChange={set('age')} testId="gallery-age" />
          <Select label="clip" value={clip} options={clips} onChange={set('clip')} testId="gallery-clip" />
          <Select label="sides" value={sidesParam} options={['both', '0', '1']} onChange={set('sides')} />
          {kind === 'unit' ? <Select label="skins" value={skins ? '1' : '0'} options={['1', '0']} onChange={set('skins')} /> : null}
          {kind === 'unit' ? <Select label="trim" value={trim} options={['none', 'bronze', 'silver', 'gold']} onChange={set('trim')} /> : null}
          <Select label="zoom" value={String(zoom)} options={[READABLE_ZOOM, '1', '1.6', '2.4', '3.2']} onChange={set('zoom')} />
          {common}
        </div>
        <PixiStage
          testId="gallery-canvas"
          height={900}
          preset={preset}
          tier={tier}
          quality={quality}
          freezeAtMs={freeze}
          speed={speed}
          deps={[section, age, clip, sidesParam, skins, trim, zoom, only]}
          atlas={atlas}
          build={(ctx) => buildGrid(ctx, { kind, age, skins, only, sides, preset, clip, trim, zoom })}
        />
      </>
    );
  } else if (section === 'world') {
    const left = get(params, 'left', 'stone') as AgeId;
    const right = get(params, 'right', 'medieval') as AgeId;
    const arena = get(params, 'arena', 'tar_pits');
    const seam = num(params, 'seam', WORLD.seamHomeLu);
    const crumble = Math.max(0, Math.min(3, num(params, 'crumble', 0))) as 0 | 1 | 2 | 3;
    const treasury = num(params, 'treasury', 0);
    const horn = get(params, 'horn', '0') === '1';
    const parade = get(params, 'parade', '0') === '1';
    const c = (): WorldControls | null => worldControls.current;
    body = (
      <>
        <div style={bar}>
          <Select label="left" value={left} options={AGES} onChange={set('left')} />
          <Select label="right" value={right} options={AGES} onChange={set('right')} />
          <Select label="arena" value={arena} options={ARENAS} onChange={set('arena')} />
          <label style={{ color: ui.dim }}>
            seam {seam}
            <input type="range" min={WORLD.seamMinLu} max={WORLD.seamMaxLu} value={seam} onChange={(e) => writeParams({ seam: (e.target as HTMLInputElement).value })} />
          </label>
          <Select label="crumble" value={String(crumble)} options={['0', '1', '2', '3']} onChange={set('crumble')} />
          <Select label="treasury" value={String(treasury)} options={['0', '1', '2', '3']} onChange={set('treasury')} />
          <Select label="horn" value={horn ? '1' : '0'} options={['0', '1']} onChange={set('horn')} />
          <Select label="parade" value={parade ? '1' : '0'} options={['0', '1']} onChange={set('parade')} />
          <button onClick={() => c()?.hit(0)}>hit L</button>
          <button onClick={() => c()?.hit(1)}>hit R</button>
          <button onClick={() => c()?.morph(0)}>evolve L</button>
          <button onClick={() => c()?.morph(1)}>evolve R</button>
          <button onClick={() => c()?.fire()}>fire</button>
          <button onClick={() => c()?.outdated(true)}>outdated</button>
          <button onClick={() => c()?.collapse(1)}>collapse R</button>
          {common}
        </div>
        <PixiStage
          testId="gallery-world"
          height={620}
          preset={preset}
          tier={tier}
          quality={quality}
          freezeAtMs={freeze}
          speed={speed}
          background={0x2a2840}
          deps={[section, left, right, arena, seam, crumble, treasury, horn, parade]}
          build={(ctx) => buildWorld(ctx, { left, right, arena, preset, seam, crumble, treasury, horn, parade }, worldControls)}
        />
      </>
    );
  } else if (section === 'effects') {
    const side = (get(params, 'side', '0') === '1' ? 1 : 0) as Side;
    const filter = get(params, 'filter', '');
    body = (
      <>
        <div style={bar}>
          <Select label="side" value={String(side)} options={['0', '1']} onChange={set('side')} />
          <Select label="zoom" value={String(num(params, 'zoom', 1))} options={['0.6', '1', '1.4']} onChange={set('zoom')} />
          <label style={{ color: ui.dim }}>
            filter <input value={filter} onChange={(e) => writeParams({ filter: (e.target as HTMLInputElement).value })} />
          </label>
          {common}
        </div>
        <PixiStage
          testId="gallery-effects"
          height={900}
          preset={preset}
          tier={tier}
          quality={quality}
          freezeAtMs={freeze}
          speed={speed}
          background={0x2a2840}
          deps={[section, side, filter, num(params, 'zoom', 1)]}
          build={(ctx) => buildEffects(ctx, { side, zoom: num(params, 'zoom', 1), filter })}
        />
      </>
    );
  } else if (section === 'portraits') {
    body = (
      <>
        <div style={bar}>
          <Select label="size" value={String(num(params, 'size', 72))} options={['48', '72', '96', '128']} onChange={set('size')} />
          <Select label="preset" value={preset} options={TEAM_PRESETS} onChange={set('preset')} />
        </div>
        <PortraitsPanel preset={preset} size={num(params, 'size', 72)} />
      </>
    );
  } else if (section === 'checks') {
    body = <ChecksPanel />;
  } else if (section === 'handoff') {
    body = <HandoffPanel focus={get(params, 'focus', 'unit.bonker')} onFocus={set('focus')} />;
  } else {
    body = (
      <>
        <div style={bar}>
          <Select label="quality" value={quality} options={['high', 'lite']} onChange={set('quality')} />
        </div>
        <BakePanel quality={quality} />
      </>
    );
  }

  return (
    <div data-testid="gallery" style={{ position: 'absolute', inset: 0, overflow: 'auto', background: ui.bg, color: ui.ink, fontFamily: ui.font, fontSize: '12px' }}>
      <div style={{ display: 'flex', gap: '4px', padding: '8px', alignItems: 'center', flexWrap: 'wrap', position: 'sticky', top: 0, background: ui.bg, zIndex: 2 }}>
        <strong style={{ color: ui.accent, marginRight: '8px' }}>Ageborn art gallery</strong>
        {SECTIONS.map((s) => (
          <button
            key={s}
            data-testid={`gallery-tab-${s}`}
            onClick={() => writeParams({ section: s })}
            style={{ background: s === section ? ui.accent : ui.panel, color: s === section ? ui.bg : ui.ink, border: 0, borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
          >
            {s}
          </button>
        ))}
      </div>
      <div style={{ padding: '0 8px 16px' }}>{body}</div>
    </div>
  );
}

const bar = { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', padding: '4px 0 8px' } as const;
