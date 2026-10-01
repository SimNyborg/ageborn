/**
 * The fort layer over the lane (DESIGN A16.14.7 "Drag onto a pad" and "On the lane"), a DOM overlay
 * positioned on the battle view's ground line every frame (`HudViewBridge.laneScreen`):
 *
 * - **While a fort is in hand** (dragged, tap-aimed, or the one-time hint): a tint band under the usable
 *   pads in your colour (a Camp's Field pads hatched until your army is past them), every pad the kind
 *   may use as a stone plinth with a ring: green (safe), amber with "Builds under fire" (the enemy can
 *   reach it before the scaffold completes), grey with the reason ("Enemy near", "Army first", "Taken").
 *   Field pads are not drawn for walls, towers and traps. The ghost of the fort, to scale, sits on the
 *   snapped pad with a 1.04 → 1 bump; a tower also shows its reach from that pad.
 * - **A placement:** the ghost contracts into the pad and a dust ring rises (MR-70b).
 * - **Always:** a small tag on every fort of both sides (the kind glyph on a plate in the side's colour,
 *   the scaffold's progress ring while it builds, cracks while it crumbles, the jammed mark on a silenced
 *   tower) and every trap's charge chip (its glyph and pips; the battle view draws the trap itself:
 *   unarmed, armed, sprung, spent), so the opponent's forts read at a glance.
 *
 * The battle view draws the forts themselves; nothing here changes timing (the sim owns it, B5).
 */
import type { FortKind, HudFortPad, HudLaneFort } from '@/contracts';
import { useEffect, useRef, useState } from 'preact/hooks';
import { FORT_PORTRAITS, FortArt, FortKindGlyph } from '../components/FortGlyphs';
import type { HudCtx } from './context';
import { fortWidthLu } from './fortAim';
import { ageIds, fortPadLook, fortPadReasonKey, fortSlotView } from './model';
import { usePortrait } from './usePortrait';

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** How long a placement's dust and contracting ghost stay. */
const BURST_MS = 760;

/** Places every `[data-p]` child on the ground line each frame (and `[data-p2]` bands between two points). */
function useGroundLayout(host: { current: HTMLElement | null }, c: HudCtx): void {
  const live = useRef(c);
  live.current = c;
  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') return undefined;
    let raf = 0;
    const step = (): void => {
      raf = requestAnimationFrame(step);
      const el = host.current;
      const view = live.current.view;
      if (!el || !view?.laneScreen) return;
      const w = el.clientWidth;
      for (const node of Array.from(el.querySelectorAll<HTMLElement>('[data-p]'))) {
        const p = Number(node.dataset['p']);
        const a = view.laneScreen(p);
        if (!a) continue;
        node.style.setProperty('--s', a.scale.toFixed(4));
        if (node.dataset['p2'] !== undefined) {
          const b = view.laneScreen(Number(node.dataset['p2']));
          if (!b) continue;
          const left = Math.min(a.x, b.x);
          const width = Math.abs(b.x - a.x);
          node.style.transform = `translate3d(${left.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
          node.style.width = `${width.toFixed(1)}px`;
          // A band that runs to the left of its start (the right-hand side's reach) flips its arrow.
          node.classList.toggle('is-rtl', b.x < a.x);
          continue;
        }
        const off = a.x < -80 || a.x > w + 80;
        node.style.visibility = off ? 'hidden' : '';
        node.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
}

/** One pad marker: plinth, ring, and the reason or "Builds under fire" label. */
/** A pad's label key while a fort is in hand: its reason when blocked, "Builds under fire" when amber. */
function padLabelKey(pad: HudFortPad): string | null {
  const look = fortPadLook(pad);
  return look === 'blocked' ? fortPadReasonKey(pad.reason) : look === 'underFire' ? 'hud.fort.underFire' : null;
}

/**
 * Which pads carry their label: neighbours that say the same thing ("Enemy near" three times) share one
 * label on the middle pad of the run, so the lane never stacks three identical tags.
 */
export function padLabelOwners(pads: readonly HudFortPad[], shown: readonly number[]): Set<number> {
  const out = new Set<number>();
  let run: number[] = [];
  let key: string | null = null;
  const flush = (): void => {
    if (run.length > 0 && key !== null) out.add(run[Math.floor((run.length - 1) / 2)]!);
    run = [];
  };
  for (const i of [...shown].sort((a, b) => pads[a]!.p - pads[b]!.p)) {
    const k = padLabelKey(pads[i]!);
    if (k !== key) {
      flush();
      key = k;
    }
    run.push(i);
  }
  flush();
  return out;
}

function Pad(p: { c: HudCtx; pad: HudFortPad; index: number; snapped: boolean; hint: boolean; quiet: boolean; labelled: boolean }) {
  const { c, pad } = p;
  const look = fortPadLook(pad);
  // The hint only lights the pads; the reasons are for the moment a fort is in hand, and while the ghost
  // stands on a pad the dragged fort's label speaks for it (the others keep their rings).
  const reason = p.hint || p.quiet || !p.labelled ? null : padLabelKey(pad);
  return (
    <div
      class={cls('hud-fpad', `is-${look}`, `is-${pad.kind}`, p.snapped && 'is-snap', p.hint && 'is-hint', p.index % 2 === 1 && 'is-alt')}
      data-p={pad.p}
      data-testid={`hud-fpad-${p.index}`}
      data-look={look}
    >
      <i class="hud-fpad-glow" aria-hidden="true" />
      <i class="hud-fpad-plinth" aria-hidden="true" />
      <i class="hud-fpad-ring" aria-hidden="true" />
      {look === 'blocked' ? <i class="hud-fpad-x" aria-hidden="true" /> : null}
      {reason ? (
        <span class="hud-fpad-label" data-tag>
          {c.t(reason)}
        </span>
      ) : null}
    </div>
  );
}

/** A fort's lane tag: the kind on a plate in the side's colour, scaffold progress, crumbling, silenced. */
function LaneTag(p: { c: HudCtx; f: HudLaneFort }) {
  const { c, f } = p;
  const def = c.config.content.forts?.[f.card];
  const name = def ? c.t(def.nameKey) : f.card;
  const building = f.buildBp < 10000;
  const label = [
    c.t(f.mine ? 'hud.fort.laneMine' : 'hud.fort.laneFoe', { name }),
    building ? c.t('hud.fort.building', { pct: Math.floor(f.buildBp / 100) }) : null,
    f.decaying ? c.t('hud.fort.crumbling') : null,
    f.silenced ? c.t('hud.fort.silenced') : null,
    f.charges !== undefined ? c.t('hud.fort.charges', { n: f.charges }) : null,
  ]
    .filter(Boolean)
    .join(', ');
  if (f.kind === 'trap') {
    return (
      <div
        class={cls('hud-ltrap', f.mine ? 'is-mine' : 'is-foe', building && 'is-arming')}
        data-p={f.p}
        data-testid={`hud-ltrap-${f.id}`}
        role="img"
        aria-label={label}
        title={label}
        style={{ '--w': fortWidthLu('trap') }}
      >
        <span class="hud-ltrap-pips" aria-hidden="true">
          <FortKindGlyph kind="trap" size={14} />
          {Array.from({ length: Math.max(0, f.charges ?? 0) }, (_, i) => (
            <i key={i} class="hud-ltrap-pip" />
          ))}
        </span>
      </div>
    );
  }
  return (
    <div
      class={cls('hud-ltag', f.mine ? 'is-mine' : 'is-foe', building && 'is-building', f.decaying && 'is-decaying', f.silenced && 'is-silenced')}
      data-p={f.p}
      data-testid={`hud-ltag-${f.id}`}
      role="img"
      aria-label={label}
      title={label}
      style={{ '--b': building ? f.buildBp / 10000 : 1, '--hp': f.hpBp / 10000 }}
    >
      {building ? <i class="hud-ltag-scaffold" aria-hidden="true" /> : null}
      <span class="hud-ltag-plate" aria-hidden="true">
        <FortKindGlyph kind={f.kind} size={13} />
      </span>
      {f.decaying ? <i class="hud-ltag-crack" aria-hidden="true" /> : null}
      {f.silenced ? <i class="hud-ltag-jam" aria-hidden="true" /> : null}
    </div>
  );
}

export function FortLane(p: { c: HudCtx }) {
  const { c } = p;
  const host = useRef<HTMLDivElement>(null);
  useGroundLayout(host, c);
  const aim = c.fortAim?.value ?? null;
  const commit = c.fortCommit?.value ?? null;
  const v = fortSlotView(c.m);
  const def = v ? c.config.content.forts?.[v.f.card] : undefined;
  const age = ageIds(c.config)[c.m.me.ageIndex] ?? def?.age ?? 'stone';
  // A placement: the ghost contracts and the dust rises on its pad for a moment.
  const [burst, setBurst] = useState<{ n: number; p: number; kind: FortKind; card: string } | null>(null);
  useEffect(() => {
    if (!commit || !v?.f.pads) return undefined;
    const pad = v.f.pads[commit.pad];
    if (!pad) return undefined;
    setBurst({ n: commit.n, p: pad.p, kind: commit.kind, card: commit.card });
    const id = setTimeout(() => setBurst((b) => (b?.n === commit.n ? null : b)), BURST_MS);
    return () => clearTimeout(id);
  }, [commit?.n]);
  const pads = v?.f.pads ?? [];
  const showPads = aim !== null && v !== null && def !== undefined && (aim.card === def.id || aim.mode === 'hint');
  const usable = v?.usable ?? [];
  const home = usable.filter((i) => pads[i]?.kind === 'home');
  const field = usable.filter((i) => pads[i]?.kind === 'field');
  const span = (ids: number[]): [number, number] | null => (ids.length ? [Math.min(...ids.map((i) => pads[i]!.p)), Math.max(...ids.map((i) => pads[i]!.p))] : null);
  const homeSpan = span(home);
  const fieldSpan = span(field);
  const fieldOpen = field.some((i) => pads[i]!.reason !== 'fortPadField');
  const snap = aim && aim.mode !== 'hint' ? aim.snap : null;
  const labelled = showPads ? padLabelOwners(pads, usable) : new Set<number>();
  const snapPad = snap !== null ? pads[snap] : undefined;
  const kind = def?.fortKind ?? 'wall';
  const team = c.colors?.me;
  const lane = c.m.laneForts ?? [];
  // The fort's own still, the same object the battle view builds (A16.14.8).
  const still = usePortrait(FORT_PORTRAITS ? c.portrait : undefined, def?.id ?? null, 'none', 140, false);
  const burstStill = usePortrait(FORT_PORTRAITS ? c.portrait : undefined, burst?.card ?? null, 'none', 140, false);
  return (
    <div ref={host} class={cls('hud-fort-lane', showPads && 'is-aiming')} data-testid="hud-fort-lane" aria-hidden={lane.length === 0 && !showPads ? 'true' : undefined}>
      {showPads && homeSpan ? <div class="hud-fband is-home" data-p={homeSpan[0] - 44} data-p2={homeSpan[1] + 44} /> : null}
      {showPads && fieldSpan ? <div class={cls('hud-fband is-field', !fieldOpen && 'is-hatched')} data-p={fieldSpan[0] - 44} data-p2={fieldSpan[1] + 44} /> : null}
      {lane.map((f) => (
        <LaneTag key={f.id} c={c} f={f} />
      ))}
      {showPads
        ? usable.map((i) => <Pad key={i} c={c} pad={pads[i]!} index={i} snapped={snap === i} hint={aim?.mode === 'hint'} quiet={snap !== null} labelled={labelled.has(i)} />)
        : null}
      {showPads && snapPad && def?.attack && snapPad.towerRange > 0 ? (
        // A tower's range counts from its edge (the sim's edge distance): pad + half-width + range.
        <div class="hud-freach" data-p={snapPad.p + fortWidthLu('tower') / 2} data-p2={snapPad.p + fortWidthLu('tower') / 2 + snapPad.towerRange} data-testid="hud-fort-reach">
          <span class="hud-freach-label" data-tag>
            {c.t('fort.stat.reach')} {snapPad.towerRange}
          </span>
        </div>
      ) : null}
      {showPads && snapPad && def ? (
        <div key={`g${snap}`} class={cls('hud-fghost', `is-${kind}`, snapPad.legal && !snapPad.safe && 'is-underfire')} data-p={snapPad.p} data-testid="hud-fort-ghost" style={{ '--w': fortWidthLu(kind) }}>
          <i class="hud-fghost-foot" aria-hidden="true" />
          <span class="hud-fghost-art">
            <FortArt kind={kind} age={age} size={64} src={still} {...(team ? { banner: team } : {})} />
          </span>
        </div>
      ) : null}
      {burst ? (
        <div key={`b${burst.n}`} class={cls('hud-fburst', `is-${burst.kind}`)} data-p={burst.p} data-testid="hud-fort-burst" style={{ '--w': fortWidthLu(burst.kind) }}>
          <span class="hud-fburst-ghost">
            <FortArt kind={burst.kind} age={age} size={64} src={burstStill} {...(team ? { banner: team } : {})} />
          </span>
          <i class="hud-fburst-ring" />
          <i class="hud-fburst-dust is-a" />
          <i class="hud-fburst-dust is-b" />
          <i class="hud-fburst-dust is-c" />
        </div>
      ) : null}
    </div>
  );
}
