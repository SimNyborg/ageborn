/**
 * DOM sections of the gallery: portraits and icons, the art checks (colour rule, silhouette IoU,
 * width and scale), artist handoff sheets, and bake budgets.
 */
import { zipSync, strToU8 } from 'fflate';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Foil, TeamPreset } from '@/contracts/ids';
import { content } from '@/content';
import { bodyWidth, colorRule, effectColorRule, heightBand, maxBodyWidth, restHeight, silhouetteIoU, structuralProblems, clipPose } from '@/visuals/checks';
import { FX_RECIPES } from '@/visuals/effects/recipes';
import { handoffSheet } from '@/visuals/handoff';
import { allPuppets, ICON_SPRITES, puppetById } from '@/visuals/library';
import { getPart } from '@/visuals/parts/registry';
import { BOOT_AGES } from '@/visuals/adapters/procedural';
import { ALL_AGES, createArtProvider } from '@/visuals/provider';
import { SKIN_PUPPETS } from '@/visuals/skins';
import { toCss } from '@/visuals/palette';
import type { PuppetDef } from '@/visuals/types';
import { publish, ui } from './state';

const cellStyle = { background: ui.panel, borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' } as const;
const small = { fontSize: '10px', color: ui.dim } as const;

// ---------------------------------------------------------------------------------------------
// Portraits and icons

const FOILS: Foil[] = ['none', 'bronze', 'silver', 'holo'];

export function PortraitsPanel(p: { preset: TeamPreset; size: number }) {
  const art = useMemo(() => createArtProvider({ teamPreset: p.preset }), [p.preset]);
  const cards = useMemo(() => {
    const out: { card: string; skin?: string; label: string }[] = [];
    for (const id of content.order.units) out.push({ card: id, label: id });
    for (const id of content.order.turrets) out.push({ card: id, label: id });
    for (const id of Object.keys(content.powers)) out.push({ card: id, label: id });
    for (const s of Object.values(content.skins)) out.push({ card: s.target, skin: s.id, label: `${s.target}@${s.id}` });
    return out;
  }, []);
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    void (async () => {
      const next: Record<string, string> = {};
      for (const c of cards) {
        for (const foil of FOILS) next[`${c.label}|${foil}`] = await art.portrait({ card: c.card, skin: c.skin, foil, size: p.size });
        if (!alive) return;
      }
      for (const icon of ICON_SPRITES) next[`icon|${icon.id}`] = await art.portrait({ card: icon.id, size: 64 });
      if (alive) {
        setUrls(next);
        publish('portraits', { count: Object.keys(next).length, empty: Object.values(next).filter((u) => !u).length });
      }
    })();
    return () => {
      alive = false;
    };
  }, [art, cards, p.size]);
  return (
    <div>
      <p style={small}>Every card (units, turrets, powers, skins) as a DOM portrait in each foil, cached by (card, skin, size) (B5).</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${p.size * 4 + 40}px, 1fr))`, gap: '8px' }}>
        {cards.map((c) => (
          <div key={c.label} style={cellStyle} data-testid={`portrait-${c.label}`}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {FOILS.map((f) => {
                const u = urls[`${c.label}|${f}`];
                return u ? <img key={f} src={u} width={p.size} height={p.size} alt={`${c.label} ${f}`} title={f} /> : <div key={f} style={{ width: p.size, height: p.size }} />;
              })}
            </div>
            <span style={small}>{c.label}</span>
          </div>
        ))}
      </div>
      <h3 style={{ color: ui.ink }}>Icons</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {ICON_SPRITES.map((i) => (
          <div key={i.id} style={cellStyle}>
            {urls[`icon|${i.id}`] ? <img src={urls[`icon|${i.id}`]} width={64} height={64} alt={i.id} /> : <div style={{ width: 64, height: 64 }} />}
            <span style={small}>{i.id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Checks

interface Row {
  id: string;
  kind: string;
  color: number;
  colorPass: boolean;
  offenders: string;
  width: number | null;
  maxWidth: number | null;
  height: number | null;
  band: string;
  iou: number | null;
  problems: string[];
  pass: boolean;
}

function checkRow(p: PuppetDef): Row {
  const cr = p.kind === 'base' ? null : colorRule(p, getPart, p.kind === 'projectile' ? 4 : 1.5);
  const isUnit = p.kind === 'unit';
  const w = isUnit ? bodyWidth(p, getPart) : null;
  const mw = isUnit ? maxBodyWidth(p) : null;
  const h = isUnit ? restHeight(p, getPart) : null;
  const band = heightBand(p);
  let iou: number | null = null;
  if (p.skinOf) {
    const base = puppetById(p.skinOf);
    if (base) {
      const rest = silhouetteIoU(p, base, getPart, { pxPerLu: 1.5 });
      const hit = p.kind === 'unit' ? silhouetteIoU(p, base, getPart, { pxPerLu: 1.5, deltas: clipPose(base, base.motion.attack, 0.55) }) : rest;
      iou = Math.min(rest, hit);
    }
  }
  const problems = structuralProblems(p, getPart);
  const colorPass = cr ? cr.pass : true;
  const widthPass = w === null || mw === null || w <= mw + 0.01;
  const heightPass = !band || h === null || (h >= band[0] && h <= band[1]);
  const iouPass = iou === null || iou >= 0.85;
  return {
    id: p.id,
    kind: p.kind,
    color: cr?.share ?? 0,
    colorPass,
    offenders: cr ? cr.offenders.map((o) => `${toCss(o.color)} ${(o.share * 100).toFixed(1)}%`).join(', ') : '',
    width: w,
    maxWidth: mw,
    height: h,
    band: band ? `${band[0]}-${band[1]}` : '',
    iou,
    problems,
    pass: colorPass && widthPass && heightPass && iouPass && problems.length === 0,
  };
}

export function ChecksPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [fx, setFx] = useState<{ id: string; share: number; pass: boolean }[]>([]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let alive = true;
    const list = allPuppets().filter((p) => p.kind !== 'sprite');
    const out: Row[] = [];
    let i = 0;
    const step = (): void => {
      if (!alive) return;
      const until = performance.now() + 30;
      while (i < list.length && performance.now() < until) {
        const p = list[i++];
        if (p) out.push(checkRow(p));
      }
      setRows([...out]);
      if (i < list.length) {
        setTimeout(step, 0);
        return;
      }
      const fxRows = FX_RECIPES.map((r) => {
        const c = effectColorRule(r, getPart);
        return { id: r.id, share: c.share, pass: c.pass };
      });
      setFx(fxRows);
      setDone(true);
      const failures = [...out.filter((r) => !r.pass).map((r) => r.id), ...fxRows.filter((r) => !r.pass).map((r) => r.id)];
      publish('checks', { done: true, visuals: out.length, effects: fxRows.length, failures, pass: failures.length === 0 });
    };
    step();
    return () => {
      alive = false;
    };
  }, []);
  const failing = rows.filter((r) => !r.pass).length + fx.filter((r) => !r.pass).length;
  const th = { textAlign: 'left', padding: '3px 8px', color: ui.dim, fontWeight: 'normal' } as const;
  const td = { padding: '3px 8px', borderTop: `1px solid ${ui.panel}` } as const;
  const ok = (b: boolean): string => (b ? ui.good : ui.bad);
  return (
    <div>
      <p style={small}>
        Same SVG data as the bake, rasterised in the page (B5). Colour rule: non-team saturated team-band hues ≤ 10% of the silhouette (A11). Skins: silhouette IoU ≥ 0.85 against the base at rest and at the attack impact (A5.8). Width: body within 1.4× the collision width plus one outline (A11). Height: A11 scale bands.
      </p>
      <p data-testid="checks-summary" style={{ color: done ? ok(failing === 0) : ui.dim, fontWeight: 'bold' }}>
        {done ? (failing === 0 ? `All ${rows.length} visuals and ${fx.length} effects pass.` : `${failing} failing`) : `Checking… ${rows.length}`}
      </p>
      <table style={{ borderCollapse: 'collapse', fontSize: '11px', color: ui.ink }}>
        <thead>
          <tr>
            {['visual', 'kind', 'colour rule', 'body width', 'height', 'skin IoU', 'structure'].map((h) => (
              <th key={h} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ ...td, color: ok(r.pass) }}>{r.id}</td>
              <td style={td}>{r.kind}</td>
              <td style={{ ...td, color: ok(r.colorPass) }} title={r.offenders}>
                {r.kind === 'base' ? '(bases exempt)' : `${(r.color * 100).toFixed(1)}%`}
              </td>
              <td style={td}>{r.width === null ? '' : `${r.width.toFixed(1)} / ${r.maxWidth?.toFixed(1)}`}</td>
              <td style={td}>{r.height === null ? '' : `${r.height.toFixed(0)} ${r.band ? `(${r.band})` : ''}`}</td>
              <td style={{ ...td, color: r.iou === null ? ui.dim : ok(r.iou >= 0.85) }}>{r.iou === null ? '' : r.iou.toFixed(3)}</td>
              <td style={{ ...td, color: ok(r.problems.length === 0) }}>{r.problems.length ? r.problems.join('; ') : 'ok'}</td>
            </tr>
          ))}
          {fx.map((r) => (
            <tr key={r.id}>
              <td style={{ ...td, color: ok(r.pass) }}>{r.id}</td>
              <td style={td}>effect</td>
              <td style={{ ...td, color: ok(r.pass) }}>{`${(r.share * 100).toFixed(1)}%`}</td>
              <td style={td} />
              <td style={td} />
              <td style={td} />
              <td style={td} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Handoff sheets

function download(name: string, data: Blob): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(data);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function HandoffPanel(p: { focus: string; onFocus: (id: string) => void }) {
  const puppets = useMemo(() => allPuppets().filter((x) => x.kind !== 'sprite' || x.id.startsWith('power.')), []);
  const current = puppets.find((x) => x.id === p.focus) ?? puppets[0];
  const svg = useMemo(() => (current ? handoffSheet(current, getPart) : ''), [current]);
  const all = (): void => {
    const files: Record<string, Uint8Array> = {};
    for (const x of puppets) files[`${x.id.replace(/[@.]/g, '_')}.svg`] = strToU8(handoffSheet(x, getPart));
    download('ageborn-art-handoff.zip', new Blob([zipSync(files)], { type: 'application/zip' }));
  };
  return (
    <div>
      <p style={small}>
        The SVG part sources as sheets for artists or image generators (B5): the assembled rest pose with anchors, the zones and colours, and every part at its pivot. A new drawing only has to keep pivots and rough outlines; see docs/art-style.md.
      </p>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
        <select value={current?.id} onChange={(e) => p.onFocus((e.target as HTMLSelectElement).value)} data-testid="handoff-select">
          {puppets.map((x) => (
            <option key={x.id} value={x.id}>
              {x.id}
            </option>
          ))}
        </select>
        <button onClick={() => current && download(`${current.id.replace(/[@.]/g, '_')}.svg`, new Blob([svg], { type: 'image/svg+xml' }))}>Download SVG</button>
        <button onClick={all}>Download every sheet (.zip)</button>
      </div>
      <div data-testid="handoff-sheet" style={{ background: '#efe9dc', overflow: 'auto', borderRadius: '8px' }} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Bake budgets

export function BakePanel(p: { quality: 'high' | 'lite' }) {
  const [report, setReport] = useState<string[]>([]);
  const [pages, setPages] = useState<(HTMLCanvasElement | OffscreenCanvas)[]>([]);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const dpr = p.quality === 'lite' ? 1 : Math.min(2, window.devicePixelRatio || 1);
      const art = createArtProvider({ quality: p.quality, dpr });
      const t0 = performance.now();
      await art.preload([...BOOT_AGES]);
      const boot = performance.now() - t0;
      const t1 = performance.now();
      await art.preload([...ALL_AGES]);
      const lazyWall = performance.now() - t1;
      if (!alive) return;
      const s = art.stats();
      const bootEntry = s.preloads[0];
      const lazyEntry = s.preloads[1];
      const bootCpu = bootEntry?.ms ?? boot;
      const pass = bootCpu <= 400;
      const lines = [
        `DPR ${dpr} (${p.quality}), atlas ${(1.25 * dpr).toFixed(2)} px/lu`,
        `Boot bake (${BOOT_AGES.join(', ')}): ${bootCpu.toFixed(0)} ms CPU, ${boot.toFixed(0)} ms wall, ${bootEntry?.parts ?? 0} parts — budget 400 ms: ${pass ? 'PASS' : 'FAIL'}`,
        `Lazy bake (other ages, idle slices): ${(lazyEntry?.ms ?? 0).toFixed(0)} ms CPU over ${lazyWall.toFixed(0)} ms wall, ${lazyEntry?.parts ?? 0} parts`,
        `Totals: ${s.bake.parts} parts, ${s.bake.textures} textures, ${s.bake.pages} atlas pages, ${(s.bake.pixels / 1e6).toFixed(2)} Mpx`,
      ];
      setReport(lines);
      setPages(art.procedural.baker.pageCanvases());
      publish('bake', { dpr, quality: p.quality, bootMs: bootCpu, bootWallMs: boot, lazyMs: lazyEntry?.ms ?? 0, parts: s.bake.parts, textures: s.bake.textures, pages: s.bake.pages, pass });
    })();
    return () => {
      alive = false;
    };
  }, [p.quality]);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = '';
    for (const c of pages) {
      if (!(c instanceof HTMLCanvasElement)) continue;
      const img = document.createElement('img');
      img.src = c.toDataURL('image/png');
      img.style.width = '512px';
      img.style.background = '#fff';
      img.style.margin = '4px';
      el.appendChild(img);
    }
  }, [pages]);
  return (
    <div>
      <p style={small}>B16: ages 0-1 bake at boot within 400 ms; ages 2-4 bake lazily in idle slices (B5). A fresh provider is baked when this section opens.</p>
      <pre data-testid="bake-report" style={{ color: ui.ink }}>
        {report.join('\n') || 'Baking…'}
      </pre>
      <div ref={host} />
    </div>
  );
}

/** Skin puppets for the skins overview. */
export const SKINS = SKIN_PUPPETS;
