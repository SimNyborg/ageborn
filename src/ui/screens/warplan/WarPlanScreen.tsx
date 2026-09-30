/**
 * Army (S9, docs/ui-plan.md 4.2, 6.6; the route id stays `warPlan`): the deck builder with one
 * loadout per age. Owner request 2026-09-30: for the selected age, three plain sections top to
 * bottom, so it is obvious what goes into battle, what could, and what is still to find.
 *
 * - **In battle** (a fixed band, always visible, U4): six troop slots, two turrets and the two power
 *   slots, Home (house) and Field (flag) (A2.9.10; the Field slot shows a padlock and its unlock line
 *   until it opens), each group with its count ("Troops 5/6"), the War Council lines it can use
 *   (A18.5.2) and the advisor's first warning (A3; never a blocker). A power fits only its own slot.
 * - **Available** (scrolls under the band): the cards of this age you own that are not in battle;
 *   tap one and Use, tap-tap, or drag it onto a slot to swap it in.
 * - **Locked**: the cards of this age not found yet, as greyed silhouettes with where they come from,
 *   and "You own 12 of 15 Stone cards"; the Card Album (every age, `collection`) is one tap away.
 * - **Header:** Undo (every change of this visit, one at a time), the reached ages with a status mark
 *   each (and "More ages" locked), the average level, Auto-fill and "Who beats whom". Presets A/B/C
 *   join after the first boss; the army you look at is the army you play.
 *
 * Gestures (one meaning each, nothing waits for a double tap): tap a card to select it (it lifts, the
 * slots it fits glow green and a small bar offers Use, Info and Upgrade); tap a glowing slot to place
 * it. Tap a slot to select it (Info, Remove) and the pool narrows to the cards that fit; tap a card to
 * place it there. Drag a card onto a slot (on touch the drag starts sideways, so a vertical swipe
 * scrolls the pool); drag a slot onto another to swap, or onto the pool to remove. Edits apply at
 * once (no primary button, U1) and are saved through `setWarPlan`.
 */
import './warplan.css';
import { ageNameKey } from '@/content/keys';
import type { AgeId, CardId, Loadout, PlanIssue } from '@/contracts';
import type { ClassGlyphId } from '@/core/cardClass';
import { SlotGlyph } from '../../components/PowerGlyphs';
import { MOTION_DUR } from '@/core/motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Button, IconButton } from '../../components/Button';
import { CardTile } from '../../components/CardTile';
import { CLASS_NAME_KEY, ClassIcon, CounterLegend } from '../../components/ClassIcon';
import { beginDrag, cancelDrag, flyCard, snapshot, sparks, type FlightSource } from '../../components/drag';
import { formatDec } from '../../components/format';
import { haptic } from '../../components/haptics';
import { AGE_COLOR, AgeGlyph, CardsIcon, CheckIcon, CloseIcon, CountersIcon, LockIcon, PencilIcon, RARITY_COLOR, RefreshIcon, UndoIcon } from '../../components/icons';
import { onGridKeyDown } from '../../components/keys';
import { ScreenFrame } from '../../components/Layout';
import { Modal, Sheet } from '../../components/Modal';
import { bezier, bump, ease, flip, MOTION_EASE, reducedMotion } from '../../components/motion';
import { countDuration } from '@/core/motion';
import { Tabs } from '../../components/Tabs';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { ageSections, cardSourceShort } from '../model/armyAge';
import { cardDef, cardTile, isOwned, upgradeState } from '../model/cards';
import { planIssueText } from '../model/match';
import { POWER_SLOT_KEY, POWER_SLOT_LONG_KEY, POWER_WRONG_SLOT_KEY } from '../model/powerText';
import { beatenCount } from '../model/warPath';
import {
  AGE_SHORT_KEY,
  ageStatus,
  albumProgress,
  ALL_SLOTS,
  assignCard,
  cardAge,
  changedSlots,
  clearSlot,
  emptyPlan,
  equipSlot,
  fieldSlotLockKeys,
  fieldSlotOpen,
  fitsSlot,
  loadoutAvgLevel,
  normalizeLoadout,
  powerSlotOf,
  presetsOpen,
  PRESETS,
  reachedAges,
  researchLines,
  slotCard,
  slotFromKey,
  slotKey,
  slotOfCard,
  TURRET_SLOTS,
  UNIT_SLOTS,
  type AgeStatus,
  type SlotRef,
} from '../model/plan';
import type { WarPlan } from '../services';

const PRESET_LABELS = ['A', 'B', 'C'] as const;

/** The class icon an advisor warning points at (owner feedback 2026-09-28), if any. */
const ISSUE_CLASS: Readonly<Record<string, ClassGlyphId>> = {
  noAntiArmor: 'antiArmor',
  noAir: 'air',
  noSplash: 'siege',
  noTurret: 'turret',
  tooFewUnits: 'infantry',
  onlyThreeUnits: 'infantry',
  badPower: 'power',
};

const SLOT_LABEL: Record<SlotRef['kind'], string> = {
  unit: 'ui.army.slot.unit',
  turret: 'ui.army.slot.turret',
  power: 'ui.army.slot.power',
};

/** A slot's name: "Troop", "Turret", "Home power", "Field power". */
function slotLabelKey(slot: SlotRef): string {
  return slot.kind === 'power' ? POWER_SLOT_LONG_KEY[slot.slot] : SLOT_LABEL[slot.kind];
}

const AGE_SHORT = AGE_SHORT_KEY;

const STATUS_KEY: Record<AgeStatus, string> = {
  ok: 'ui.army.status.ok',
  warn: 'ui.army.status.warn',
  error: 'ui.army.status.error',
};

/** The In battle band's three groups, left to right (owner request 2026-09-30). */
const BAND_GROUPS: readonly { id: SlotRef['kind']; key: string; slots: readonly SlotRef[] }[] = [
  { id: 'unit', key: 'ui.armyAge.troops', slots: ALL_SLOTS.filter((x) => x.kind === 'unit') },
  { id: 'turret', key: 'ui.armyAge.turrets', slots: ALL_SLOTS.filter((x) => x.kind === 'turret') },
  { id: 'power', key: 'ui.armyAge.powers', slots: ALL_SLOTS.filter((x) => x.kind === 'power') },
];

type Selection = { type: 'card'; id: CardId } | { type: 'slot'; key: string } | null;
/** Where the small action bar of a selection sits (MR-30). */
type Place = { v: 'above' | 'below'; h: 'start' | 'center' | 'end' };
/** A landing to play after the next render (MR-32, MR-35, MR-36). */
interface Fx {
  land: {
    key: string;
    from: HTMLElement | FlightSource | null;
    delay: number;
  }[];
  back: { card: CardId; from: FlightSource | null }[];
}

function RenameModal(p: { name: string; onSave: (name: string) => void; onClose: () => void }) {
  const { t } = useUi();
  const [v, setV] = useState(p.name);
  const trimmed = v.trim();
  return (
    <Modal
      title={t('ui.warplan.rename')}
      size="sm"
      onClose={p.onClose}
      testid="rename-plan"
      footer={
        <Button kind="progress" testid="rename-save" disabled={trimmed.length === 0} onClick={() => p.onSave(trimmed)}>
          {t('ui.common.done')}
        </Button>
      }
    >
      <label class="ui-field">
        <span>{t('ui.warplan.planName')}</span>
        <input
          class="ui-input"
          value={v}
          maxLength={16}
          data-autofocus=""
          onInput={(e) => setV((e.currentTarget as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && trimmed.length > 0) p.onSave(trimmed);
          }}
        />
      </label>
    </Modal>
  );
}

/**
 * MR-20 for a number Preact renders: rolls the shown value from the old to the new one (`out`, the
 * count tokens) and bumps the element on arrival. Reduced motion or no animation frames: the new
 * value at once.
 */
function useCountUp(value: number | null, el: { current: HTMLElement | null }): number | null {
  const [shown, setShown] = useState(value);
  const last = useRef(value);
  useEffect(() => {
    const from = last.current;
    last.current = value;
    if (value === null || from === null || from === value || typeof requestAnimationFrame !== 'function' || reducedMotion(el.current)) {
      setShown(value);
      return;
    }
    const dur = countDuration(value - from);
    const [x1, y1, x2, y2] = MOTION_EASE.out.map((n) => n / 1000) as [number, number, number, number];
    const curve = bezier(x1, y1, x2, y2);
    let raf = 0;
    let t0 = -1;
    const step = (now: number) => {
      if (t0 < 0) t0 = now;
      const k = Math.min(1, (now - t0) / dur);
      setShown(Math.round(from + (value - from) * curve(k)));
      if (k < 1) raf = requestAnimationFrame(step);
      else bump(el.current);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

/**
 * Whether the UI root is compact (a phone held sideways, ui-plan 3.1: height 480 or less), read from
 * the element's UI root and kept current on resize. Used where CSS alone cannot choose (the age tabs
 * show only the selected age's name on phones).
 */
function useCompact(ref: { current: HTMLElement | null }): boolean {
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    const root = ref.current?.closest?.('.ui-root') as HTMLElement | null;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const check = () => setCompact(root.clientHeight > 0 && root.clientHeight <= 480);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);
  return compact;
}

/** Room a selection's action bar needs next to its card (title, one 44 px row, gap and arrow). */
const BAR_ROOM = 96;

/**
 * Keeps a grid card's action bar inside the visible part of the scrolling grid (blocker: the bar was
 * cut in half by the bottom of the panel on phones). Runs after each selection change.
 */
function barIntoView(grid: HTMLElement | null): void {
  const bar = grid?.querySelector?.('.army-bar') as HTMLElement | null;
  if (!grid || !bar || typeof bar.getBoundingClientRect !== 'function') return;
  const g = grid.getBoundingClientRect();
  const r = bar.getBoundingClientRect();
  const pad = 8;
  let dy = 0;
  if (r.bottom > g.bottom - pad) dy = r.bottom - (g.bottom - pad);
  else if (r.top < g.top + pad) dy = r.top - (g.top + pad);
  if (dy !== 0) grid.scrollTop += dy;
}

/** Where a selection's action bar goes, from the selected element's place in its column. */
function placeOf(el: HTMLElement | null, row0: boolean): Place {
  const box = el?.closest?.('[data-army-col]') as HTMLElement | null;
  if (!el || !box || typeof el.getBoundingClientRect !== 'function') return { v: row0 ? 'below' : 'above', h: 'center' };
  const r = el.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  // A grid card's bar must fit inside the scrolling grid (it clips, and the sticky head covers the
  // top); a slot's bar may overlap the strip above the slots.
  const scroller = el.closest?.('[data-scroll]') as HTMLElement | null;
  let v: Place['v'];
  if (scroller && box.contains(scroller)) {
    // Below when the bar fits under the card inside the visible grid, else above when it fits there,
    // else below: the grid gets room under its last row while a card is selected and scrolls the bar
    // into view (`barIntoView`); it can always scroll down, not always up.
    const sr = scroller.getBoundingClientRect();
    const below = sr.bottom - r.bottom;
    const above = r.top - sr.top;
    v = below >= BAR_ROOM || above < BAR_ROOM + 12 ? 'below' : 'above';
  } else v = r.top - b.top < 84 ? 'below' : 'above';
  const h = r.left - b.left < 80 ? 'start' : b.right - r.right < 80 ? 'end' : 'center';
  return { v, h };
}

export function WarPlanScreen(p: { route: RouteOf<'warPlan'> }) {
  const ui = useUi();
  const { save, content, t, locale, router, services, toasts } = ui;
  const s = save.value;
  const ages = reachedAges(s, content);
  const withPresets = presetsOpen(s, content);
  const preset = withPresets ? Math.min(PRESETS - 1, s.activePlan) : s.activePlan;
  const [age, setAgeState] = useState<AgeId>(() => p.route.age ?? currentAge(s, content, ages));
  const [sel, setSel] = useState<Selection>(null);
  const [place, setPlace] = useState<Place>({ v: 'above', h: 'center' });
  const [sheet, setSheet] = useState<'legend' | 'advice' | 'presets' | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [undo, setUndo] = useState<{ preset: number; plan: WarPlan }[]>([]);
  const [land, setLand] = useState<{ key: string; delay: number; n: number }[]>([]);
  const [deny, setDeny] = useState<{ key: string; n: number } | null>(null);
  const fx = useRef<Fx | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<HTMLSpanElement>(null);
  const avgRef = useRef<HTMLSpanElement>(null);
  const flipper = useRef(flip(() => Array.from(gridRef.current?.querySelectorAll?.('[data-army-cell]') ?? [])));
  const flipping = useRef(false);
  const landN = useRef(0);
  // MR-37: the loadout flips in when Army opens and on an age change (only then, so ending a
  // selection never replays it).
  const [fresh, setFresh] = useState(true);
  useEffect(() => {
    if (!fresh) return;
    const id = setTimeout(() => setFresh(false), MOTION_DUR.large + MOTION_DUR.staggerMax);
    return () => clearTimeout(id);
  }, [fresh]);

  const plan: WarPlan = s.warPlans[preset] ?? {
    ...(s.warPlans[s.activePlan] ?? emptyPlan(content, PRESET_LABELS[preset]!)),
    name: PRESET_LABELS[preset]!,
  };
  const loadout = normalizeLoadout(plan.loadouts[age] ?? emptyPlan(content, '').loadouts[age]);
  // 2.6: the average level, the advisor and Auto-fill arrive with level 3; a new player's first
  // armies are small on purpose and need no warnings.
  const seasoned = beatenCount(s) >= 3 || !!s.warPath?.legacy;
  // Errors (a card that cannot be used) always show; warnings wait for level 3.
  const issues: PlanIssue[] = services.validatePlan(plan, formatFor(s, content)).filter((i) => seasoned || i.severity === 'error');
  const ageIssues = issues.filter((i) => i.age === age).sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  const avg = loadoutAvgLevel(s, content, loadout);
  const fieldOpen = fieldSlotOpen(s);
  const fieldLock = fieldSlotLockKeys(s);
  // A locked Field slot is empty in battle (A2.9.1), so a power a migrated save keeps there is not "in army".
  const inArmy = new Set(
    ALL_SLOTS.filter((x) => x.kind !== 'power' || x.slot === 'home' || fieldOpen)
      .map((x) => slotCard(loadout, x))
      .filter((c): c is CardId => !!c),
  );
  const selSlot = sel?.type === 'slot' ? slotFromKey(sel.key) : null;
  const selCard = sel?.type === 'card' ? sel.id : null;
  const pool = ageSections(s, content, age, inArmy, selSlot ? selSlot.kind : null, selSlot?.kind === 'power' ? selSlot.slot : null);
  const album = albumProgress(s, content);
  const firstVisit = s.flags['ui-seen.army'] !== true;

  function setAge(a: AgeId) {
    if (a === age) return;
    setAgeState(a);
    setSel(null);
    setFresh(true);
  }
  function select(next: Selection, el?: HTMLElement | null, row0 = false) {
    setSel(next);
    if (next) {
      if (next.type === 'card' && typeof (el as HTMLElement | null)?.scrollIntoView === 'function') el!.scrollIntoView({ block: 'nearest' });
      setPlace(placeOf(el ?? null, row0));
      ui.sound?.('card_lift');
      haptic('tick');
    }
  }

  // Leaving Army ends any drag; Undo clears with the visit (its state is this component's).
  useEffect(() => () => cancelDrag(), []);
  // A tap anywhere that is not a card, a slot or a selection bar clears the selection (4.2).
  useEffect(() => {
    if (!sel || typeof document === 'undefined') return;
    const onDown = (e: Event) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt?.closest?.('[data-army-keep]')) return;
      setSel(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setSel(null);
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [sel]);

  // A grid card's action bar is always fully visible (review blocker 2).
  useLayoutEffect(() => {
    if (sel?.type === 'card') barIntoView(gridRef.current);
  }, [sel, place]);

  // The selected age sits centred in its strip (3.6 "Age tabs").
  const agesRef = useRef<HTMLDivElement>(null);
  const compact = useCompact(agesRef);
  useLayoutEffect(() => {
    const box = agesRef.current;
    const on = box?.querySelector?.('.ui-tab.is-on') as HTMLElement | null;
    if (!box || !on || typeof box.scrollTo !== 'function') return;
    const left = on.offsetLeft - (box.clientWidth - on.offsetWidth) / 2;
    box.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [age]);

  // MR-38: the pool moves to its new order with FLIP after an edit moves cards between sections.
  useLayoutEffect(() => {
    if (!flipping.current) return;
    flipping.current = false;
    flipper.current.play();
  });

  // MR-20: the average level counts to its new value, then bumps.
  const shownAvg = useCountUp(avg === null ? null : Math.round(avg * 10), avgRef);

  // MR-32 / MR-34 / MR-35 / MR-36: flights and landings after a change has rendered.
  useLayoutEffect(() => {
    const f = fx.current;
    if (!f) return;
    fx.current = null;
    const scope = root.current;
    const landings: { key: string; delay: number; n: number }[] = [];
    for (const l of f.land) {
      const el = scope?.querySelector?.(`[data-drop="${l.key}"]`) as HTMLElement | null;
      const flight = l.from ? flyCard('rect' in l.from ? l.from : tileIn(l.from), tileIn(el)) : null;
      const delay = flight ? MOTION_DUR.medium + MOTION_DUR.hold : l.delay;
      landings.push({ key: l.key, delay, n: ++landN.current });
      const cardId = el?.getAttribute?.('data-card-id');
      const def = cardId ? cardDef(content, cardId) : null;
      const color = def && def.kind !== 'power' ? RARITY_COLOR[def.rarity] : '#f2c14e';
      setTimeout(() => {
        sparks(el, color);
        ui.sound?.('card_place');
        haptic('thump');
      }, delay);
    }
    for (const b of f.back) {
      const target = gridRef.current?.querySelector?.(`[data-army-cell="${b.card}"]`) as HTMLElement | null;
      // Land where the cell ends up, not where its regroup move starts.
      for (const a of target?.getAnimations?.() ?? []) a.finish();
      if (b.from)
        flyCard(b.from, tileIn(target), { pull: false })?.done.then(() => {
          if (target && typeof target.animate === 'function')
            target.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: MOTION_DUR.small, easing: ease('back') });
        });
    }
    if (landings.length) setLand(landings);
  });

  function commit(next: WarPlan, record = true) {
    regroup();
    if (record) setUndo((u) => [...u, { preset, plan }].slice(-40));
    // Presets are added one at a time (`meta.setWarPlan` refuses gaps): editing C before B exists
    // first stores B as a copy of the active plan.
    for (let i = s.warPlans.length; i < preset; i++) {
      services.setWarPlan(i, {
        ...(s.warPlans[s.activePlan] ?? emptyPlan(content, PRESET_LABELS[i]!)),
        name: PRESET_LABELS[i]!,
      });
    }
    services.setWarPlan(preset, next);
    if (firstVisit) services.setUiFlags({ 'ui-seen.army': true });
  }
  /** Grid cells that change group after an edit move to their new place (MR-38's FLIP). */
  function regroup() {
    flipper.current.first();
    flipping.current = true;
  }
  function setLoadout(l: Loadout, f: Fx) {
    fx.current = f;
    commit({ ...plan, loadouts: { ...plan.loadouts, [age]: l } });
    setSel(null);
  }
  const slotEl = (key: string) => root.current?.querySelector?.(`[data-drop="${key}"]`) as HTMLElement | null;
  /** Flights move the card itself (its frame), not the name and copies bar around it. */
  const tileIn = (el: HTMLElement | null) => (el?.querySelector?.('.ui-card__frame') as HTMLElement | null) ?? el;

  /** Puts `card` into `slot` (MR-32): the card flies from `from`, the one it replaces flies back. */
  function placeCard(slot: SlotRef, card: CardId, from: HTMLElement | FlightSource | null) {
    const key = slotKey(slot);
    const was = slotCard(loadout, slot);
    if (was === card) {
      setSel(null);
      return;
    }
    const origin = slotOfCard(loadout, card);
    const next = assignCard(content, loadout, slot, card);
    // The grid regroups after the change ("In your army"), so the flight starts from where the card
    // is now, not from where its grid cell moves to.
    const src = from && !('rect' in from) ? (snapshot(tileIn(from)) ?? from) : from;
    const f: Fx = { land: [{ key, from: src, delay: 0 }], back: [] };
    if (origin && was) {
      // A swap inside the loadout (MR-35): the other card crosses to the first card's old slot.
      f.land.push({
        key: slotKey(origin),
        from: snapshot(tileIn(slotEl(key))),
        delay: 0,
      });
    } else if (was) f.back.push({ card: was, from: snapshot(tileIn(slotEl(key))) });
    setLoadout(next, f);
  }
  function removeSlot(slot: SlotRef) {
    const was = slotCard(loadout, slot);
    if (!was) return;
    const from = snapshot(tileIn(slotEl(slotKey(slot))));
    fx.current = { land: [], back: [{ card: was, from }] };
    commit({
      ...plan,
      loadouts: { ...plan.loadouts, [age]: clearSlot(loadout, slot) },
    });
    setSel(null);
    ui.sound?.('ui_toggle');
  }
  function use(card: CardId, from: HTMLElement | null) {
    const slot = equipSlot(s, content, loadout, card);
    if (slot) placeCard(slot, card, from);
  }
  function denySlot(key: string, card?: CardId | null) {
    setDeny((d) => ({ key, n: (d?.n ?? 0) + 1 }));
    ui.sound?.('ui_deny');
    haptic('deny');
    // A power on the other power slot bounces back and says where it goes (A2.9.10).
    const target = slotFromKey(key);
    const own = card ? powerSlotOf(content, card) : null;
    if (target?.kind !== 'power') return;
    if (target.slot === 'field' && !fieldOpen) toasts.show(t(fieldLock.line), { tone: 'bad', anchor: slotEl(key) });
    else if (own && own !== target.slot) toasts.show(t(POWER_WRONG_SLOT_KEY[own]), { tone: 'bad', anchor: slotEl(key) });
  }
  function undoLast() {
    const last = undo[undo.length - 1];
    if (!last) return;
    setUndo(undo.slice(0, -1));
    const before = normalizeLoadout(last.plan.loadouts[age] ?? loadout);
    fx.current = {
      land: changedSlots(loadout, before).map((x, i) => ({
        key: slotKey(x),
        from: null,
        delay: i * MOTION_DUR.hold,
      })),
      back: [],
    };
    regroup();
    services.setWarPlan(last.preset, last.plan);
    setSel(null);
  }
  function autoFill() {
    const filled = { ...services.autoFill(), name: plan.name };
    let n = 0;
    for (const a of content.order.ages)
      n += changedSlots(normalizeLoadout(plan.loadouts[a] ?? loadout), normalizeLoadout(filled.loadouts[a] ?? loadout)).length;
    const here = changedSlots(loadout, normalizeLoadout(filled.loadouts[age] ?? loadout));
    if (n > 0) {
      fx.current = {
        land: here.map((x, i) => ({
          key: slotKey(x),
          from: null,
          delay: i * MOTION_DUR.hold,
        })),
        back: [],
      };
      commit(filled);
    }
    setSel(null);
    toasts.show(n === 0 ? t('ui.army.autoFilledNone') : n === 1 ? t('ui.army.autoFilledOne') : t('ui.army.autoFilled', { n }), {
      tone: 'good',
      anchor: autoRef.current,
    });
  }
  function choosePreset(i: number) {
    if (i === s.activePlan) return;
    for (let k = s.warPlans.length; k <= i; k++) {
      services.setWarPlan(k, {
        ...(s.warPlans[s.activePlan] ?? emptyPlan(content, PRESET_LABELS[k]!)),
        name: PRESET_LABELS[k]!,
      });
    }
    services.setActivePlan(i);
    setUndo([]);
    setSel(null);
  }

  // ---- taps -------------------------------------------------------------------------------------

  function tapCard(id: CardId, el: HTMLElement | null) {
    if (selSlot) {
      const slot = selSlot;
      if (fitsSlot(s, content, age, slot, id)) {
        placeCard(slot, id, el);
        return;
      }
    }
    if (selCard === id) {
      setSel(null);
      return;
    }
    select({ type: 'card', id }, el, false);
  }
  function tapSlot(slot: SlotRef, el: HTMLElement | null) {
    const key = slotKey(slot);
    if (selCard) {
      if (fitsSlot(s, content, age, slot, selCard)) {
        const from = gridRef.current?.querySelector?.(`[data-army-cell="${selCard}"]`) as HTMLElement | null;
        placeCard(slot, selCard, from ?? null);
        return;
      }
      denySlot(key, selCard);
      return;
    }
    if (slot.kind === 'power' && slot.slot === 'field' && !fieldOpen) {
      // The locked Field slot says how it opens (U8), nothing to select yet.
      denySlot(key);
      return;
    }
    if (sel?.type === 'slot') {
      if (sel.key === key) {
        setSel(null);
        return;
      }
      const other = selSlot;
      const moving = other ? slotCard(loadout, other) : null;
      if (other && moving && other.kind === slot.kind && slot.kind !== 'power') {
        placeCard(slot, moving, snapshot(tileIn(slotEl(sel.key))));
        return;
      }
    }
    select({ type: 'slot', key }, el, (slot.kind === 'power' && slot.slot === 'home') || (slot.kind === 'unit' && slot.index < 4));
  }

  // ---- drags ------------------------------------------------------------------------------------

  function dragFromGrid(e: PointerEvent, id: CardId) {
    const el = e.currentTarget as HTMLElement;
    if (!inAge(id)) return;
    beginDrag(e, el, {
      axis: 'x',
      accepts: (key) => {
        const slot = slotFromKey(key);
        return !!slot && fitsSlot(s, content, age, slot, id);
      },
      onStart: () => {
        setSel(null);
        ui.sound?.('card_lift');
        haptic('tick');
      },
      onDrop: (key, bad) => {
        const slot = key ? slotFromKey(key) : null;
        if (slot) placeCard(slot, id, null);
        else if (bad) denySlot(bad, id);
      },
    });
  }
  function dragFromSlot(e: PointerEvent, slot: SlotRef) {
    const card = slotCard(loadout, slot);
    if (!card) return;
    const el = e.currentTarget as HTMLElement;
    const key = slotKey(slot);
    beginDrag(e, el, {
      axis: 'free',
      // Powers never move between the Home and Field slots (A2.9.1); any slot may go back to the grid.
      accepts: (k) => (k === 'grid' ? true : k !== key && slot.kind !== 'power' && slotFromKey(k)?.kind === slot.kind),
      onStart: () => {
        setSel(null);
        ui.sound?.('card_lift');
        haptic('tick');
      },
      onDrop: (k, bad) => {
        if (k === 'grid') removeSlot(slot);
        else if (k) {
          const to = slotFromKey(k)!;
          const other = slotCard(loadout, to);
          fx.current = {
            land: [{ key: k, from: null, delay: 0 }, ...(other ? [{ key, from: snapshot(tileIn(slotEl(k))), delay: 0 }] : [])],
            back: [],
          };
          commit({
            ...plan,
            loadouts: {
              ...plan.loadouts,
              [age]: assignCard(content, loadout, to, card),
            },
          });
          setSel(null);
        } else if (bad) denySlot(bad);
      },
    });
  }
  const inAge = (id: CardId) => cardAge(content, id) === age;

  // ---- views ------------------------------------------------------------------------------------

  /** An owned troop of this age that is not in its army yet (else empty troop slots point at capsules). */
  const spareTroop = content.order.units.some((id) => content.units[id]?.age === age && !inArmy.has(id) && isOwned(s, id, content));
  // A new player's small first army is not a warning (2.6): only errors mark an age before level 3.
  const status = (a: AgeId): AgeStatus => {
    const st = ageStatus(issues, a, normalizeLoadout(plan.loadouts[a] ?? loadout));
    return seasoned || st === 'error' ? st : 'ok';
  };
  const valid = (slot: SlotRef) => !!selCard && fitsSlot(s, content, age, slot, selCard);

  function slotView(slot: SlotRef, i: number) {
    const key = slotKey(slot);
    const card = slotCard(loadout, slot);
    const tile = card ? cardTile(s, content, card, t) : null;
    const isSel = sel?.type === 'slot' && sel.key === key;
    const landing = land.find((l) => l.key === key);
    const denied = deny?.key === key ? deny.n : 0;
    const cls = [
      'army-slot',
      `army-slot--${slot.kind}`,
      `army-slot--${key}`,
      tile ? 'is-filled' : 'is-empty',
      isSel ? 'is-selected' : '',
      valid(slot) ? 'is-drop-valid' : '',
      denied ? 'is-denied' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const common = {
      'data-drop': key,
      'data-card-id': card ?? undefined,
      'data-army-keep': '',
      'data-land': landing ? String(landing.n) : undefined,
      style: { '--i': i, '--land-delay': `${landing?.delay ?? 0}ms` },
      key: `${key}-${denied}`,
    };
    if (slot.kind === 'power' && slot.slot === 'field' && !fieldOpen) {
      // The Field slot before its unlock (A2.9.1): a padlock and how it opens, even when a migrated save
      // already holds a Field power there (the sim plays it empty until it opens); a tap says it again.
      return (
        <div {...common} class={`${cls} is-locked`}>
          <button
            type="button"
            class="army-slot__empty army-slot__locked"
            onClick={() => tapSlot(slot, slotEl(key))}
            aria-label={`${t(POWER_SLOT_LONG_KEY.field)}: ${t(fieldLock.line)}`}
            data-testid={`slot-${key}`}
          >
            <span class="army-slot__watermark" aria-hidden="true">
              <SlotGlyph slot="field" size={34} />
            </span>
            <LockIcon size={20} />
            <span class="army-slot__label" data-tag="">
              {t(POWER_SLOT_KEY.field)}
            </span>
            <span class="army-slot__more" data-tag="">
              {t(fieldLock.short)}
            </span>
          </button>
        </div>
      );
    }
    if (tile) {
      return (
        <div {...common} class={cls} data-testid={`slot-${key}`} onPointerDown={(e) => dragFromSlot(e as unknown as PointerEvent, slot)}>
          <CardTile
            key={card}
            card={tile}
            size="sm"
            showCost
            selected={isSel}
            tip={!isSel}
            onClick={() => tapSlot(slot, slotEl(key))}
            label={t('ui.warplan.slotFilled', {
              slot: t(slotLabelKey(slot)),
              name: tile.name,
            })}
          />
          {slot.kind === 'power' ? (
            <span class={`army-slot__tag army-slot__tag--${slot.slot}`} data-tag="" aria-hidden="true">
              <SlotGlyph slot={slot.slot} size={12} />
              {t(POWER_SLOT_KEY[slot.slot])}
            </span>
          ) : null}
          {isSel ? slotActions(slot, card!) : null}
        </div>
      );
    }
    return (
      <div {...common} class={cls}>
        <button
          type="button"
          class="army-slot__empty"
          onClick={() => tapSlot(slot, slotEl(key))}
          aria-pressed={isSel}
          aria-label={t('ui.warplan.emptySlot', {
            slot: t(slotLabelKey(slot)),
          })}
          data-testid={`slot-${key}`}
        >
          {slot.kind === 'power' ? (
            <span class="army-slot__watermark" aria-hidden="true">
              <SlotGlyph slot={slot.slot} size={40} />
            </span>
          ) : null}
          <span class="army-slot__plus" aria-hidden="true">
            +
          </span>
          <span class="army-slot__label" data-tag="">
            {slot.kind === 'power' ? t(POWER_SLOT_KEY[slot.slot]) : t(SLOT_LABEL[slot.kind])}
          </span>
          {slot.kind === 'unit' && !spareTroop ? (
            // Nothing owned can fill it yet: say where more troops come from (U8, review 11).
            <span class="army-slot__more" data-tag="" data-testid={`slot-more-${key}`}>
              {t('ui.army.slot.more')}
            </span>
          ) : null}
        </button>
      </div>
    );
  }

  function barClass(extra = ''): string {
    return `army-bar army-bar--${place.v} army-bar--${place.h} ${extra}`;
  }

  function slotActions(slot: SlotRef, card: CardId) {
    return (
      <div class={barClass()} role="group" data-army-keep="" data-testid="slot-actions">
        <span class="army-bar__title" data-clip-check="">
          {t(cardDef(content, card)!.nameKey)}
        </span>
        <span class="army-bar__row">
          <Button kind="secondary" size="s" testid="slot-info" onClick={() => router.go({ id: 'cardDetail', card })}>
            {t('ui.army.info')}
          </Button>
          <Button kind="secondary" size="s" testid={`remove-${slotKey(slot)}`} onClick={() => removeSlot(slot)}>
            {t('ui.army.remove')}
          </Button>
        </span>
      </div>
    );
  }

  function cardActions(id: CardId) {
    const tile = cardTile(s, content, id, t)!;
    const def = cardDef(content, id)!;
    const up = upgradeState(s, content, id);
    const here = inAge(id);
    const equipped = here && inArmy.has(id);
    // A Field power waits for its slot to open (A2.9.1).
    const locked = def.kind === 'power' && def.slot === 'field' && !fieldOpen;
    const otherAge = !here ? t('ui.army.otherAge', { age: t(AGE_SHORT[def.age]) }) : locked ? t(fieldLock.line) : null;
    return (
      <div class={barClass()} role="group" data-army-keep="" data-testid="card-actions">
        <span class="army-bar__title" data-clip-check="">
          {tile.owned && def.kind !== 'power' ? `${tile.name} · ${t('ui.card.level', { n: tile.level })}` : tile.name}
        </span>
        <span class="army-bar__row">
          {!tile.owned ? (
            <span class="army-bar__note">{t('ui.army.notOwned')}</span>
          ) : equipped ? (
            <span class="army-bar__on" data-testid="card-in-army">
              <CheckIcon size={16} /> {t('ui.army.inArmy')}
            </span>
          ) : (
            <Button
              kind="progress"
              size="s"
              primary={false}
              testid="card-use"
              disabled={!here || locked}
              reason={otherAge ?? undefined}
              sound={null}
              onClick={() => use(id, gridRef.current?.querySelector?.(`[data-army-cell="${id}"]`) as HTMLElement | null)}
            >
              {t('ui.army.use')}
            </Button>
          )}
          <Button kind="secondary" size="s" testid="card-info" onClick={() => router.go({ id: 'cardDetail', card: id })}>
            {t('ui.army.info')}
          </Button>
          {up?.copiesReady ? (
            <Button kind="progress" size="s" primary={false} testid="card-upgrade" onClick={() => router.go({ id: 'cardDetail', card: id, upgrade: true })}>
              {t('ui.army.upgrade')}
            </Button>
          ) : null}
        </span>
      </div>
    );
  }

  let n = 0;

  function cell(id: CardId, i: number, locked: boolean) {
    const tile = cardTile(s, content, id, t)!;
    const isSel = selCard === id;
    const src = locked ? cardSourceShort(s, content, id) : null;
    return (
      <div
        key={id}
        class={`army-cell${isSel ? ' is-selected' : ''}${locked ? ' is-locked' : ''}`}
        data-army-cell={id}
        data-army-keep=""
        style={{ '--i': Math.min(i, 12) }}
        onPointerDown={locked ? undefined : (e) => dragFromGrid(e as unknown as PointerEvent, id)}
      >
        <CardTile
          card={tile}
          size="sm"
          grid
          showCost
          showCopies={!locked}
          selected={isSel}
          tip={!isSel}
          onClick={() => tapCard(id, gridRef.current?.querySelector?.(`[data-army-cell="${id}"]`) as HTMLElement | null)}
          testid={`cand-${id}`}
        />
        {src ? (
          <span class="army-cell__src" data-tag="" data-testid={`src-${id}`}>
            {t(src.key, src.params)}
          </span>
        ) : null}
        {isSel ? cardActions(id) : null}
      </div>
    );
  }

  const lines = researchLines(content, loadout);
  const lead = ageIssues[0];
  const hint = selCard ? t('ui.army.hintCard') : selSlot ? t('ui.army.hintSlot') : firstVisit ? t('ui.army.hintFirst') : null;
  const statusMark = (st: AgeStatus) =>
    st === 'ok' ? (
      <i class="army-age__mark is-ok" aria-hidden="true">
        <CheckIcon size={12} />
      </i>
    ) : (
      <i class={`army-age__mark ui-warndot is-${st}`} aria-hidden="true" />
    );
  const locked = content.order.ages.filter((a) => !ages.includes(a));
  /** How many slots of a group hold a card (a locked Field slot counts as not open). */
  const filled = (g: (typeof BAND_GROUPS)[number]) => g.slots.filter((x) => inArmy.has(slotCard(loadout, x) ?? '')).length;
  const groupMax = (g: (typeof BAND_GROUPS)[number]) => (g.id === 'unit' ? UNIT_SLOTS : g.id === 'turret' ? TURRET_SLOTS : fieldOpen ? 2 : 1);
  const ageName = t(ageNameKey(age));
  let slotIndex = 0;

  const header = (
    <div class="army-head" data-army-keep="">
      <span class="army-undo">
        <Button
          kind="secondary"
          size="s"
          icon={<UndoIcon size={20} />}
          label={t('ui.army.undo')}
          testid="army-undo"
          disabled={undo.length === 0}
          reason={t('ui.army.undoNone')}
          class={undo.length ? 'is-live' : ''}
          key={undo.length > 0 ? 'on' : 'off'}
          onClick={undoLast}
        >
          {t('ui.army.undo')}
        </Button>
      </span>
      {withPresets ? (
        <Button
          kind="secondary"
          size="s"
          testid="army-presets"
          label={`${t('ui.army.presets')}: ${plan.name}`}
          onClick={() => setSheet('presets')}
          class="army-preset-btn"
        >
          {plan.name}
          <i class="army-caret" aria-hidden="true" />
        </Button>
      ) : null}
      <div class="army-ages" data-testid="army-ages" ref={agesRef}>
        <Tabs
          label={t('ui.age.picker')}
          variant="age"
          compact={compact}
          value={age}
          onChange={setAge}
          testid="age-picker"
          idPrefix="wp-age"
          items={ages.map((a) => {
            const st = status(a);
            return {
              value: a,
              label: t(AGE_SHORT[a]),
              icon: (
                <span class="ui-agechip army-agechip" style={{ '--age': AGE_COLOR[a].accent }}>
                  <AgeGlyph age={a} size={20} />
                </span>
              ),
              badge: (
                <span title={t(STATUS_KEY[st])} aria-label={t(STATUS_KEY[st])} role="img">
                  {statusMark(st)}
                </span>
              ),
              testid: `age-tab-${a}`,
            };
          })}
        />
        {locked.length ? (
          <Button
            kind="tertiary"
            size="s"
            icon={<LockIcon size={16} />}
            disabled
            reason={t('ui.army.moreAgesReason')}
            testid="army-more-ages"
            class="army-more"
          >
            {t('ui.army.moreAges')}
          </Button>
        ) : null}
      </div>
      {seasoned ? (
        <span class="army-avg" title={t('ui.army.avgLabel', { age: ageName })} aria-label={t('ui.army.avgLabel', { age: ageName })}>
          <span ref={avgRef} class="ui-num" data-testid="loadout-avg">
            {t('ui.army.avg', {
              n: shownAvg === null ? '-' : formatDec(shownAvg / 10, 1, locale),
            })}
          </span>
        </span>
      ) : null}
      {seasoned ? (
        <span ref={autoRef} class="army-auto">
          <Button kind="secondary" size="s" icon={<RefreshIcon size={18} />} testid="auto-fill" label={t('ui.warplan.autoFill')} onClick={autoFill}>
            {t('ui.warplan.autoFill')}
          </Button>
        </span>
      ) : null}
      <IconButton icon={<CountersIcon size={24} />} label={t('ui.army.counters')} onClick={() => setSheet('legend')} testid="army-legend" />
    </div>
  );

  return (
    <ScreenFrame id="warPlan" title={t('ui.army.title')} onBack={() => router.back()} right={header} class="army-screen">
      <div class={`army${sel ? ' has-sel' : ''}`} ref={root}>
        {/* 1. In battle: the loadout of this age, always in view (owner request 2026-09-30, U4) */}
        <section class="army-battle" data-army-col="" aria-labelledby="army-deck-title" data-testid="army-battle">
          <div class={`army-slots${fresh ? ' is-fresh' : ''}`} key={age} data-testid="wp-board">
            {BAND_GROUPS.map((g, gi) => (
              <div key={g.id} class={`army-bandgroup army-bandgroup--${g.id}`} role="group" aria-label={t(g.key, { n: filled(g), max: groupMax(g) })}>
                <span class="army-bandgroup__label">
                  {gi === 0 ? (
                    <h2 id="army-deck-title" class="army-sec-title">
                      <span class="army-sec-title__icon" aria-hidden="true">
                        <CheckIcon size={12} />
                      </span>
                      {t('ui.armyAge.battle')}
                      <span class="ui-sr"> · {t('ui.army.deckTitle', { age: ageName })}</span>
                    </h2>
                  ) : null}
                  <span class="army-bandgroup__count" data-tag="" data-testid={`band-${g.id}`}>
                    {t(g.key, { n: filled(g), max: groupMax(g) })}
                  </span>
                  {gi === 0 ? (
                    <ul class="army-lines" aria-label={t('ui.warplan.councilLines')} data-testid="wp-council-lines">
                      {lines.map((l) => {
                        const label = t(l.has ? 'ui.warplan.councilLineHas' : 'ui.warplan.councilLineNone', { cls: t(CLASS_NAME_KEY[l.cls]) });
                        return (
                          <li key={l.cls} class={`army-line${l.has ? ' is-on' : ' is-off'}`} title={label} aria-label={label} data-testid={`wp-line-${l.cls}`}>
                            <ClassIcon id={l.cls} size={16} />
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </span>
                <div class="army-bandgroup__slots">{g.slots.map((x) => slotView(x, slotIndex++))}</div>
              </div>
            ))}
            {/* The side column: the average level (phones) and the advisor's first warning, or a hint */}
            <div class="army-bandside">
              {seasoned && avg !== null ? (
                <span class="army-avg army-avg--strip" aria-hidden="true">
                  {t('ui.army.avg', { n: formatDec(avg, 1, locale) })}
                </span>
              ) : null}
              {hint && !(lead && !sel) ? (
                <p class="army-hint" key={hint} data-testid="army-hint">
                  {hint}
                </p>
              ) : (
                <ul class="army-advice" data-testid="advisor" aria-live="polite">
                  {ageIssues.map((i, k) => {
                    const icon = ISSUE_CLASS[i.code];
                    return (
                      <li key={i.code} class={`army-issue army-issue--${i.severity}${k > 0 ? ' ui-sr' : ''}`} data-testid={`issue-${i.code}`}>
                        <button type="button" class="army-issue__btn" onClick={() => setSheet('advice')} data-army-keep="">
                          <span class="army-issue__mark" aria-hidden="true" />
                          {icon ? <ClassIcon id={icon} size={18} /> : null}
                          <span class="army-issue__text">{planIssueText(i, t)}</span>
                          {k === 0 && ageIssues.length > 1 ? (
                            <span class="army-issue__more">
                              {t('ui.army.adviceMore', {
                                n: ageIssues.length - 1,
                              })}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* 2. Available and 3. Locked: the rest of this age's cards, in one scrolling pool */}
        <section
          class={`army-pool${sel?.type === 'card' ? ' is-selecting' : ''}`}
          data-army-col=""
          aria-label={t('ui.army.cardsTitle')}
          ref={gridRef}
          data-scroll=""
          data-drop="grid"
          data-testid="wp-cards"
          onKeyDown={onGridKeyDown}
          key={age}
        >
          <div class="army-sec army-sec--free" data-testid="army-group-free">
            <h3 class="army-sec-head army-sec-head--free">
              <span class="army-sec-title">{t('ui.armyAge.available', { n: pool.available.length })}</span>
              {selSlot ? (
                <button
                  type="button"
                  class="army-chip is-slot"
                  onClick={() => setSel(null)}
                  data-testid="chip-slot"
                  data-army-keep=""
                  aria-label={t('ui.army.removeFilter', { name: t('ui.army.onlyKind', { slot: t(slotLabelKey(selSlot)) }) })}
                >
                  <span class="army-chip__face">
                    {selSlot.kind === 'power' ? (
                      <>
                        <SlotGlyph slot={selSlot.slot} size={16} />
                        {t(POWER_SLOT_KEY[selSlot.slot])}
                      </>
                    ) : (
                      t('ui.army.onlyKind', { slot: t(slotLabelKey(selSlot)) })
                    )}
                    <CloseIcon size={14} />
                  </span>
                </button>
              ) : (
                <small class="army-sec-sub">{t('ui.armyAge.availableHint')}</small>
              )}
            </h3>
            {pool.available.length ? (
              <div class="army-grid">{pool.available.map((id) => cell(id, n++, false))}</div>
            ) : (
              <p class="army-empty" data-testid="army-available-empty">
                {t('ui.armyAge.availableEmpty')}
              </p>
            )}
          </div>
          <div class="army-sec army-sec--locked" data-testid="army-group-locked">
            <h3 class="army-sec-head army-sec-head--locked">
              <span class="army-sec-title">
                <LockIcon size={14} />
                {t('ui.armyAge.locked', { n: pool.locked.length })}
              </span>
              <small class="army-sec-sub" data-testid="army-owned-count">
                {pool.owned >= pool.total ? t('ui.armyAge.lockedNone', { max: pool.total, age: t(AGE_SHORT[age]) }) : t('ui.armyAge.lockedOwned', { n: pool.owned, max: pool.total, age: t(AGE_SHORT[age]) })}
              </small>
              <Button kind="secondary" size="s" icon={<CardsIcon size={18} />} testid="army-album" class="army-album" onClick={() => router.go({ id: 'collection' })}>
                {t('ui.armyAge.album', { n: album.owned, max: album.total })}
              </Button>
            </h3>
            {pool.locked.length ? <div class="army-grid army-grid--locked">{pool.locked.map((id) => cell(id, n++, true))}</div> : null}
          </div>
        </section>
      </div>

      {sheet === 'legend' ? (
        <Sheet title={t('ui.army.counters')} onClose={() => setSheet(null)} testid="army-legend-sheet" icon={<CountersIcon size={24} />}>
          <CounterLegend />
        </Sheet>
      ) : null}
      {sheet === 'advice' ? (
        <Sheet title={t('ui.army.advice')} onClose={() => setSheet(null)} testid="army-advice-sheet">
          <ul class="army-advice-list">
            {ageIssues.map((i) => {
              const icon = ISSUE_CLASS[i.code];
              return (
                <li key={i.code} class={`army-issue army-issue--${i.severity}`}>
                  <span class="army-issue__mark" aria-hidden="true" />
                  {icon ? <ClassIcon id={icon} size={24} /> : null}
                  <span class="army-issue__text">{planIssueText(i, t)}</span>
                </li>
              );
            })}
          </ul>
          <CounterLegend compact />
        </Sheet>
      ) : null}
      {sheet === 'presets' ? (
        <Sheet title={t('ui.army.presets')} onClose={() => setSheet(null)} testid="army-presets-sheet">
          <ul class="army-presets" data-testid="presets">
            {PRESET_LABELS.map((label, i) => {
              const name = s.warPlans[i]?.name ?? label;
              const on = i === s.activePlan;
              return (
                <li key={label} class={`army-preset${on ? ' is-on' : ''}`}>
                  <span class="army-preset__name">{t('ui.army.preset', { name })}</span>
                  {on ? (
                    <span class="army-bar__on" data-testid="plan-in-use">
                      <CheckIcon size={16} /> {t('ui.army.presetInUse')}
                    </span>
                  ) : (
                    <Button
                      kind="progress"
                      size="s"
                      primary={false}
                      testid={`preset-${i}`}
                      label={t('ui.army.presetUse', { name })}
                      onClick={() => choosePreset(i)}
                    >
                      {t('ui.army.use')}
                    </Button>
                  )}
                  {on ? (
                    <IconButton
                      icon={<PencilIcon size={20} />}
                      label={t('ui.warplan.rename')}
                      testid="rename"
                      onClick={() => {
                        setSheet(null);
                        setRenaming(true);
                      }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Sheet>
      ) : null}
      {renaming ? (
        <RenameModal
          name={plan.name}
          onClose={() => setRenaming(false)}
          onSave={(name) => {
            commit({ ...plan, name }, false);
            setRenaming(false);
          }}
        />
      ) : null}
    </ScreenFrame>
  );
}

/** The age Army opens on: the War Path's current region when reached, else the last reached age. */
function currentAge(save: Parameters<typeof albumProgress>[0], content: Parameters<typeof albumProgress>[1], ages: readonly AgeId[]): AgeId {
  const cur = content.warPath.order.find((id) => !(save.warPath?.stars[id] ?? 0));
  const region = cur ? content.warPath.levels[cur]?.region : undefined;
  return region && ages.includes(region) ? region : ages[ages.length - 1]!;
}

/** The format the advisor checks against (the longest the player can pick, A3). */
function formatFor(save: Parameters<typeof albumProgress>[0], content: Parameters<typeof albumProgress>[1]) {
  const formats = content.arenas.list[Math.max(0, Math.min(content.arenas.list.length - 1, save.arenaIndex))]!.ladderFormats;
  return formats[formats.length - 1] ?? 'short';
}
