/**
 * Army (S9, docs/ui-plan.md 4.2, 6.6; the route id stays `warPlan`): the deck builder with one
 * loadout per age and the whole card collection, like Clash Royale's Cards tab.
 *
 * - **Left:** the loadout of the selected age, always visible (U4, "which cards are equipped"): six
 *   troop slots, two turrets and the Age Power, with the War Council lines it can use (A18.5.2) and
 *   the advisor's first warning (A3; never a blocker).
 * - **Right:** "This age" (the cards that fit its slots) or "All cards" (the album with completion),
 *   with a filter and sort panel and removable filter chips. Equipped cards carry a check and a green
 *   underline; upgrade-ready cards the green arrow; unowned cards are silhouettes with a padlock.
 * - **Header:** Undo (every change of this visit, one at a time), the reached ages with a status mark
 *   each (and "More ages" locked), the average level, Auto-fill and "Who beats whom". Presets A/B/C
 *   join after the first boss; the army you look at is the army you play.
 *
 * Gestures (one meaning each, nothing waits for a double tap): tap a card to select it (it lifts, the
 * slots it fits glow green and a small bar offers Use, Info and Upgrade); tap a glowing slot to place
 * it. Tap a slot to select it (Info, Remove) and the grid narrows to the cards that fit; tap a card to
 * place it there. Drag a card sideways onto a slot; drag a slot onto another to swap, or onto the grid
 * to remove. Edits apply at once (no primary button, U1) and are saved through `setWarPlan`.
 */
import './warplan.css';
import { ageNameKey, rarityNameKey } from '@/content/keys';
import type { AgeId, CardId, Loadout, PlanIssue, Rarity } from '@/contracts';
import { UNIT_CLASSES, type CardClass, type ClassGlyphId } from '@/core/cardClass';
import { MOTION_DUR } from '@/core/motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Button, IconButton } from '../../components/Button';
import { CardTile } from '../../components/CardTile';
import { CLASS_NAME_KEY, ClassIcon, CounterLegend } from '../../components/ClassIcon';
import { Segmented, Toggle } from '../../components/Controls';
import { beginDrag, cancelDrag, flyCard, snapshot, sparks, type FlightSource } from '../../components/drag';
import { formatDec } from '../../components/format';
import { haptic } from '../../components/haptics';
import {
  AGE_COLOR,
  AgeGlyph,
  CheckIcon,
  CloseIcon,
  CountersIcon,
  FilterIcon,
  LockIcon,
  PencilIcon,
  RARITY_COLOR,
  RarityGem,
  RefreshIcon,
  UndoIcon,
} from '../../components/icons';
import { onGridKeyDown } from '../../components/keys';
import { ScreenFrame } from '../../components/Layout';
import { Modal, Sheet } from '../../components/Modal';
import { bezier, bump, ease, flip, MOTION_EASE, reducedMotion } from '../../components/motion';
import { countDuration } from '@/core/motion';
import { Tabs } from '../../components/Tabs';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { cardDef, cardTile, isOwned, upgradeState } from '../model/cards';
import { planIssueText } from '../model/match';
import {
  activeFilterCount,
  AGE_SHORT_KEY,
  ageStatus,
  albumProgress,
  ALL_SLOTS,
  ARMY_FILTER,
  armyCards,
  assignCard,
  cardAge,
  changedSlots,
  clearSlot,
  emptyPlan,
  equipSlot,
  fitsSlot,
  loadoutAvgLevel,
  loadoutCards,
  normalizeLoadout,
  presetsOpen,
  PRESETS,
  reachedAges,
  researchLines,
  slotCard,
  slotFromKey,
  slotKey,
  slotOfCard,
  type AgeStatus,
  type ArmyFilter,
  type ArmySort,
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

const AGE_SHORT = AGE_SHORT_KEY;

/** The three groups of the "This age" grid (4.2, U4). */
const GROUP_KEY = {
  free: 'ui.army.group.free',
  used: 'ui.army.group.used',
  locked: 'ui.army.group.locked',
} as const;

const STATUS_KEY: Record<AgeStatus, string> = {
  ok: 'ui.army.status.ok',
  warn: 'ui.army.status.warn',
  error: 'ui.army.status.error',
};

const SORTS: readonly (ArmySort | 'none')[] = ['none', 'level', 'rarity', 'cost', 'ready'];
const SORT_KEY: Record<ArmySort | 'none', string> = {
  none: 'ui.army.sortNone',
  level: 'ui.army.sortLevel',
  rarity: 'ui.army.sortRarity',
  cost: 'ui.army.sortCost',
  ready: 'ui.army.sortReady',
};
const FILTER_CLASSES: readonly CardClass[] = [...UNIT_CLASSES, 'turret', 'power'];
const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];

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

/** Where a selection's action bar goes, from the selected element's place in its column. */
function placeOf(el: HTMLElement | null, row0: boolean): Place {
  const box = el?.closest?.('[data-army-col]') as HTMLElement | null;
  if (!el || !box || typeof el.getBoundingClientRect !== 'function') return { v: row0 ? 'below' : 'above', h: 'center' };
  const r = el.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  // A grid card's bar must fit inside the scrolling grid (it clips, and the sticky head covers the
  // top); a slot's bar may overlap the strip above the slots.
  const scroller = el.closest?.('[data-scroll]') as HTMLElement | null;
  const v = scroller && box.contains(scroller) ? (r.top - scroller.getBoundingClientRect().top < 96 ? 'below' : 'above') : r.top - b.top < 84 ? 'below' : 'above';
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
  const [filter, setFilterState] = useState<ArmyFilter>(ARMY_FILTER);
  const [sheet, setSheet] = useState<'filter' | 'legend' | 'advice' | 'presets' | null>(null);
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
  const issues: PlanIssue[] = services.validatePlan(plan, formatFor(s, content));
  const ageIssues = issues.filter((i) => i.age === age).sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  const avg = loadoutAvgLevel(s, content, loadout);
  const inArmy = new Set(ALL_SLOTS.map((x) => slotCard(loadout, x)).filter((c): c is CardId => !!c));
  const selSlot = sel?.type === 'slot' ? slotFromKey(sel.key) : null;
  const selCard = sel?.type === 'card' ? sel.id : null;
  const cards = armyCards(s, content, age, filter, selSlot ? selSlot.kind : null);
  const album = albumProgress(s, content);
  const firstVisit = s.flags['ui-seen.army'] !== true;

  function setAge(a: AgeId) {
    if (a === age) return;
    setAgeState(a);
    setSel(null);
    setFresh(true);
  }
  function setFilter(next: ArmyFilter) {
    flipper.current.first();
    flipping.current = true;
    setFilterState(next);
  }
  function select(next: Selection, el?: HTMLElement | null, row0 = false) {
    setSel(next);
    if (next) {
      setPlace(placeOf(el ?? null, row0));
      ui.sound?.('card_lift');
      haptic('tick');
      if (next.type === 'card' && typeof (el as HTMLElement | null)?.scrollIntoView === 'function') el!.scrollIntoView({ block: 'nearest' });
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

  // MR-38: the grid moves to its new order with FLIP after a filter or sort change.
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
    if (!was || slot.kind === 'power') return;
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
  function denySlot(key: string) {
    setDeny((d) => ({ key, n: (d?.n ?? 0) + 1 }));
    ui.sound?.('ui_deny');
    haptic('deny');
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
    select({ type: 'slot', key }, el, slot.kind === 'power' || (slot.kind === 'unit' && slot.index < 4));
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
        else if (bad) denySlot(bad);
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
      accepts: (k) => (k === 'grid' ? slot.kind !== 'power' : k !== key && slotFromKey(k)?.kind === slot.kind),
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

  const status = (a: AgeId) => ageStatus(issues, a, normalizeLoadout(plan.loadouts[a] ?? loadout));
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
              slot: t(SLOT_LABEL[slot.kind]),
              name: tile.name,
            })}
          />
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
            slot: t(SLOT_LABEL[slot.kind]),
          })}
          data-testid={`slot-${key}`}
        >
          <span class="army-slot__plus" aria-hidden="true">
            +
          </span>
          <span class="army-slot__label" data-tag="">
            {t(SLOT_LABEL[slot.kind])}
          </span>
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
          {slot.kind !== 'power' ? (
            <Button kind="secondary" size="s" testid={`remove-${slotKey(slot)}`} onClick={() => removeSlot(slot)}>
              {t('ui.army.remove')}
            </Button>
          ) : null}
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
    const otherAge = !here ? t('ui.army.otherAge', { age: t(AGE_SHORT[def.age]) }) : null;
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
              disabled={!here}
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

  /** Every card placed in any age of the army you look at ("In army" on the album, 4.2). */
  const inAnyArmy = new Set(content.order.ages.flatMap((a) => (plan.loadouts[a] ? loadoutCards(plan.loadouts[a]) : [])));
  const groups: { id: keyof typeof GROUP_KEY; ids: CardId[] }[] = [
    { id: 'free', ids: cards.filter((id) => !inArmy.has(id) && isOwned(s, id, content)) },
    { id: 'used', ids: cards.filter((id) => inArmy.has(id)) },
    { id: 'locked', ids: cards.filter((id) => !inArmy.has(id) && !isOwned(s, id, content)) },
  ];
  let n = 0;

  function cell(id: CardId, i: number) {
    const tile = cardTile(s, content, id, t)!;
    const here = inAge(id);
    const isSel = selCard === id;
    return (
      <div
        key={id}
        class={`army-cell${isSel ? ' is-selected' : ''}${here ? '' : ' is-other'}`}
        data-army-cell={id}
        data-army-keep=""
        style={{ '--i': Math.min(i, 12) }}
        onPointerDown={(e) => dragFromGrid(e as unknown as PointerEvent, id)}
      >
        <CardTile
          card={tile}
          size="sm"
          grid
          showCost
          showCopies
          selected={isSel}
          tip={!isSel}
          equipped={here ? inArmy.has(id) : inAnyArmy.has(id)}
          onClick={() => tapCard(id, gridRef.current?.querySelector?.(`[data-army-cell="${id}"]`) as HTMLElement | null)}
          testid={`cand-${id}`}
        />
        {filter.view === 'all' ? (
          <span class="army-cell__age" data-tag="">
            {t(AGE_SHORT[tile.age])}
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
      <span class="army-avg" title={t('ui.army.avgLabel', { age: t(ageNameKey(age)) })} aria-label={t('ui.army.avgLabel', { age: t(ageNameKey(age)) })}>
        <span ref={avgRef} class="ui-num" data-testid="loadout-avg">
          {t('ui.army.avg', {
            n: shownAvg === null ? '-' : formatDec(shownAvg / 10, 1, locale),
          })}
        </span>
      </span>
      <span ref={autoRef} class="army-auto">
        <Button kind="secondary" size="s" icon={<RefreshIcon size={18} />} testid="auto-fill" label={t('ui.warplan.autoFill')} onClick={autoFill}>
          {t('ui.warplan.autoFill')}
        </Button>
      </span>
      <IconButton icon={<CountersIcon size={24} />} label={t('ui.army.counters')} onClick={() => setSheet('legend')} testid="army-legend" />
    </div>
  );

  return (
    <ScreenFrame id="warPlan" title={t('ui.army.title')} onBack={() => router.back()} right={header} class="army-screen">
      <div class={`army${sel ? ' has-sel' : ''}`} ref={root}>
        <section class="army-deck" data-army-col="" aria-labelledby="army-deck-title">
          <h2 id="army-deck-title" class="army-deck__title">
            {t('ui.army.deckTitle', { age: t(ageNameKey(age)) })}
          </h2>
          <div class="army-strip">
            <ul class="army-lines" aria-label={t('ui.warplan.councilLines')} data-testid="wp-council-lines">
              {lines.map((l) => {
                const label = t(l.has ? 'ui.warplan.councilLineHas' : 'ui.warplan.councilLineNone', { cls: t(CLASS_NAME_KEY[l.cls]) });
                return (
                  <li key={l.cls} class={`army-line${l.has ? ' is-on' : ' is-off'}`} title={label} aria-label={label} data-testid={`wp-line-${l.cls}`}>
                    <ClassIcon id={l.cls} size={20} />
                  </li>
                );
              })}
            </ul>
            {hint && !(lead && !sel) ? (
              <p class="army-hint" key={hint} data-testid="army-hint">
                {hint}
              </p>
            ) : (
              <ul class="army-advice" data-testid="advisor" aria-live="polite">
                {ageIssues.map((i, n) => {
                  const icon = ISSUE_CLASS[i.code];
                  return (
                    <li key={i.code} class={`army-issue army-issue--${i.severity}${n > 0 ? ' ui-sr' : ''}`} data-testid={`issue-${i.code}`}>
                      <button type="button" class="army-issue__btn" onClick={() => setSheet('advice')} data-army-keep="">
                        <span class="army-issue__mark" aria-hidden="true" />
                        {icon ? <ClassIcon id={icon} size={20} /> : null}
                        <span class="army-issue__text">{planIssueText(i, t)}</span>
                        {n === 0 && ageIssues.length > 1 ? (
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
          <div class={`army-slots${fresh ? ' is-fresh' : ''}`} key={age} data-testid="wp-board">
            {ALL_SLOTS.map((x, i) => slotView(x, i))}
          </div>
          <div class="army-legend-inline">
            <CounterLegend compact />
          </div>
        </section>

        <section class="army-cards" data-army-col="" aria-labelledby="army-cards-title">
          <h2 id="army-cards-title" class="ui-sr">
            {t('ui.army.cardsTitle')}
          </h2>
          <div class="army-cards__head">
            <Segmented
              label={t('ui.army.view.label')}
              size="sm"
              value={filter.view}
              testid="army-view"
              onChange={(view) => {
                ui.sound?.('ui_tab');
                setFilter({ ...filter, view });
              }}
              options={[
                { value: 'age', label: t('ui.army.view.age') },
                {
                  value: 'all',
                  label: t('ui.army.view.all', {
                    n: album.owned,
                    max: album.total,
                  }),
                },
              ]}
            />
            <Button
              kind="secondary"
              size="s"
              icon={<FilterIcon size={18} />}
              testid="army-filter"
              onClick={() => setSheet('filter')}
              label={t('ui.army.filterTitle')}
              class={activeFilterCount(filter) ? 'is-on' : ''}
            >
              {activeFilterCount(filter) ? t('ui.army.filterCount', { n: activeFilterCount(filter) }) : t('ui.army.filter')}
            </Button>
            <div class="army-chips" data-army-keep="">
              {selSlot ? (
                <button
                  type="button"
                  class="army-chip is-slot"
                  onClick={() => setSel(null)}
                  data-testid="chip-slot"
                  aria-label={t('ui.army.removeFilter', {
                    name: t('ui.army.onlyKind', {
                      slot: t(SLOT_LABEL[selSlot.kind]),
                    }),
                  })}
                >
                  <span class="army-chip__face">
                    {t('ui.army.onlyKind', {
                      slot: t(SLOT_LABEL[selSlot.kind]),
                    })}
                    <CloseIcon size={14} />
                  </span>
                </button>
              ) : null}
              {filter.classes.map((c) => (
                <button
                  key={c}
                  type="button"
                  class="army-chip"
                  onClick={() =>
                    setFilter({
                      ...filter,
                      classes: filter.classes.filter((x) => x !== c),
                    })
                  }
                  aria-label={t('ui.army.removeFilter', {
                    name: t(CLASS_NAME_KEY[c]),
                  })}
                >
                  <span class="army-chip__face">
                    <ClassIcon id={c} size={16} />
                    {t(CLASS_NAME_KEY[c])}
                    <CloseIcon size={14} />
                  </span>
                </button>
              ))}
              {filter.rarity !== 'all' ? (
                <button
                  type="button"
                  class="army-chip"
                  onClick={() => setFilter({ ...filter, rarity: 'all' })}
                  aria-label={t('ui.army.removeFilter', {
                    name: t(rarityNameKey(filter.rarity)),
                  })}
                >
                  <span class="army-chip__face">
                    <RarityGem rarity={filter.rarity} size={14} />
                    {t(rarityNameKey(filter.rarity))}
                    <CloseIcon size={14} />
                  </span>
                </button>
              ) : null}
              {filter.ownedOnly ? (
                <button
                  type="button"
                  class="army-chip"
                  onClick={() => setFilter({ ...filter, ownedOnly: false })}
                  aria-label={t('ui.army.removeFilter', {
                    name: t('ui.army.filterOwned'),
                  })}
                >
                  <span class="army-chip__face">
                    {t('ui.army.filterOwned')}
                    <CloseIcon size={14} />
                  </span>
                </button>
              ) : null}
              {filter.sort ? (
                <button
                  type="button"
                  class="army-chip"
                  onClick={() => setFilter({ ...filter, sort: null })}
                  aria-label={t('ui.army.removeFilter', {
                    name: t(SORT_KEY[filter.sort]),
                  })}
                >
                  <span class="army-chip__face">
                    {t('ui.army.sort')}: {t(SORT_KEY[filter.sort])}
                    <CloseIcon size={14} />
                  </span>
                </button>
              ) : null}
            </div>
          </div>
          <div
            class={`army-grid${filter.view === 'all' ? ' is-all' : ''}`}
            ref={gridRef}
            data-scroll=""
            data-drop="grid"
            data-testid="wp-cards"
            onKeyDown={onGridKeyDown}
            key={`${filter.view}-${age}`}
          >
            {cards.length === 0 ? (
              <div class="army-empty">
                <p>{t('ui.army.none')}</p>
                <Button kind="secondary" size="s" onClick={() => setFilter({ ...ARMY_FILTER, view: filter.view })} testid="army-clear">
                  {t('ui.army.clear')}
                </Button>
              </div>
            ) : filter.view === 'age' ? (
              // "This age" in three labelled groups (U4, the owner's "which cards are equipped"): the
              // cards that could still join first, then the ones already in this army, then the ones
              // not found yet. The loadout on the left shows the same army in its slots.
              groups.flatMap((g) =>
                g.ids.length
                  ? [
                      <p key={`g-${g.id}`} class={`army-group army-group--${g.id}`} data-testid={`army-group-${g.id}`}>
                        {g.id === 'used' ? <CheckIcon size={14} /> : g.id === 'locked' ? <LockIcon size={14} /> : null}
                        <span>{t(GROUP_KEY[g.id], { n: g.ids.length })}</span>
                      </p>,
                      ...g.ids.map((id) => cell(id, n++)),
                    ]
                  : [],
              )
            ) : (
              cards.map((id, i) => cell(id, i))
            )}
          </div>
        </section>
      </div>

      {sheet === 'filter' ? <FilterSheet filter={filter} onChange={setFilter} onClose={() => setSheet(null)} /> : null}
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

/** Filter and sort (ui-plan 4.2): class chips, rarity gems, owned only, sort. Changes apply at once. */
function FilterSheet(p: { filter: ArmyFilter; onChange: (f: ArmyFilter) => void; onClose: () => void }) {
  const { t } = useUi();
  const f = p.filter;
  const toggle = (c: CardClass) =>
    p.onChange({
      ...f,
      classes: f.classes.includes(c) ? f.classes.filter((x) => x !== c) : [...f.classes, c],
    });
  return (
    <Sheet
      title={t('ui.army.filterTitle')}
      onClose={p.onClose}
      testid="army-filter-sheet"
      icon={<FilterIcon size={22} />}
      actions={{
        tertiary: (
          <Button kind="tertiary" size="s" onClick={() => p.onChange({ ...ARMY_FILTER, view: f.view })} testid="filter-clear">
            {t('ui.army.clear')}
          </Button>
        ),
      }}
    >
      <div class="army-filter">
        <h3 class="army-filter__label">{t('ui.army.filterClass')}</h3>
        <div class="army-filter__classes" role="group" aria-label={t('ui.army.filterClass')}>
          {FILTER_CLASSES.map((c) => {
            const on = f.classes.includes(c);
            return (
              <button key={c} type="button" class={`army-fchip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggle(c)} data-testid={`filter-${c}`}>
                <ClassIcon id={c} size={22} />
                <span>{t(CLASS_NAME_KEY[c])}</span>
              </button>
            );
          })}
        </div>
        <h3 class="army-filter__label">{t('ui.army.filterRarity')}</h3>
        <Segmented
          label={t('ui.army.filterRarity')}
          value={f.rarity}
          size="sm"
          testid="filter-rarity"
          onChange={(rarity) => p.onChange({ ...f, rarity })}
          options={[
            { value: 'all', label: t('ui.army.anyRarity') },
            ...RARITIES.map((r) => ({
              value: r,
              label: t(rarityNameKey(r)),
              icon: <RarityGem rarity={r} size={16} />,
            })),
          ]}
        />
        <div class="army-filter__row">
          <Toggle label={t('ui.army.filterOwned')} checked={f.ownedOnly} onChange={(ownedOnly) => p.onChange({ ...f, ownedOnly })} testid="filter-owned" />
        </div>
        <h3 class="army-filter__label">{t('ui.army.sort')}</h3>
        <Segmented
          label={t('ui.army.sort')}
          value={f.sort ?? 'none'}
          size="sm"
          testid="filter-sort"
          onChange={(v) => p.onChange({ ...f, sort: v === 'none' ? null : v })}
          options={SORTS.map((x) => ({ value: x, label: t(SORT_KEY[x]) }))}
        />
      </div>
    </Sheet>
  );
}
