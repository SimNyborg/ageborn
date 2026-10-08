/**
 * Saved battle decks (DESIGN A3 presets; owner request 2026-10-07: the War Plans A/B/C hid behind a
 * small "A" dropdown that opened after the first boss, so nobody found them). Three named decks, open
 * right after the onboarding:
 *
 * - **Army** shows them as a switch at the top of the screen (`variant="army"`): tap a deck to play
 *   it (the army you look at is the army you play); the deck in use carries a pencil, and a tap on it
 *   opens {@link DeckSheet} to rename it or copy another deck into it.
 * - **Home** shows the same switch on the battle plate next to Battle (`variant="plate"`), so the deck
 *   for the next battle is one tap away.
 *
 * A deck that was never saved starts as a copy of the deck in use, so every deck is playable. One
 * hint, once (`ui-seen.decks`), points at the switch wherever it is first seen, like the other
 * first-seen captions (MR-28): it shows for {@link DECK_HINT_MS}, counts as seen once it has shown in
 * full or a deck was tapped, and steps aside while an unlock moment or another caption is on screen.
 */
import './shared.css';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { haptic } from '../../components/haptics';
import { CardsIcon, CopyIcon, PencilIcon } from '../../components/icons';
import { rovingNextIndex } from '../../components/keys';
import { Modal } from '../../components/Modal';
import { useUi } from '../context';
import { DECK_NAMES, DECKS, deckList, emptyPlan } from '../model/plan';
import type { WarPlan } from '../services';

/** The one-time hint's flag (`SaveDoc.flags`; UI keys start with `ui-`). */
export const DECK_HINT_FLAG = 'ui-seen.decks';
/** How long the hint stays up unless tapped (as the No clock caption; the currency captions take 4 s). */
export const DECK_HINT_MS = 5000;

/** The deck switch's state and its one action: play deck `i`. */
export function useDecks() {
  const { save, content, services, sound } = useUi();
  const s = save.value;
  const decks = deckList(s);
  /**
   * Makes deck `i` the one in use. Decks are stored in order (`meta.setWarPlan` refuses gaps), so a
   * deck never saved is first stored as a copy of the deck in use, under its own letter.
   */
  function choose(i: number) {
    if (i === s.activePlan && s.warPlans[i]) return;
    const base = s.warPlans[s.activePlan] ?? s.warPlans[0] ?? emptyPlan(content, DECK_NAMES[0]!);
    for (let k = s.warPlans.length; k <= i; k++) services.setWarPlan(k, { ...base, name: DECK_NAMES[k]! });
    services.setActivePlan(i);
    // Found the switch: the hint has nothing left to say (read fresh: the hint may have just set it).
    if (save.value.flags[DECK_HINT_FLAG] !== true) services.setUiFlags({ [DECK_HINT_FLAG]: true });
    sound?.('ui_tab');
    haptic('tick');
  }
  return { decks, active: s.activePlan, choose };
}

/**
 * The deck switch: three segments with the deck names, the deck in use lit. In Army the lit one also
 * shows a pencil and opens the deck's sheet (`onEdit`); on Home's plate a tap only switches.
 */
export function DeckSwitch(p: { variant: 'army' | 'plate'; onEdit?: (i: number) => void; testid?: string; hint?: boolean }) {
  const { t, services } = useUi();
  const { decks, active, choose: play } = useDecks();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const prefix = p.variant === 'army' ? 'deck' : 'home-deck';
  // `p.hint`: the hint is due and nothing else is on screen. It shows for DECK_HINT_MS and then counts
  // as seen; if it has to step aside first (`p.hint` false), it comes back the next time.
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (!p.hint) {
      setHint(false);
      return;
    }
    setHint(true);
    const id = setTimeout(() => {
      setHint(false);
      services.setUiFlags({ [DECK_HINT_FLAG]: true });
    }, DECK_HINT_MS);
    return () => clearTimeout(id);
  }, [p.hint]);
  /** A tap on a deck: the hint has done its job. */
  function hintDone() {
    if (!hint) return;
    setHint(false);
    services.setUiFlags({ [DECK_HINT_FLAG]: true });
  }
  function choose(i: number) {
    hintDone();
    play(i);
  }
  function onKey(e: KeyboardEvent, i: number) {
    const next = rovingNextIndex(e.key, i, decks.length, 'both');
    if (next === null) return;
    e.preventDefault();
    choose(next);
    refs.current[next]?.focus();
  }
  return (
    <div class={`deck-switch deck-switch--${p.variant}`} data-testid={p.testid}>
      <div class="ui-seg ui-seg--sm deck-switch__seg" role="radiogroup" aria-label={t('ui.decks.title')}>
        <span class="deck-switch__icon" aria-hidden="true" title={t('ui.decks.title')}>
          <CardsIcon size={p.variant === 'army' ? 20 : 18} />
        </span>
        {decks.map((d) => {
          const on = d.index === active;
          const edit = on && p.variant === 'army' && !!p.onEdit;
          return (
            <button
              key={d.index}
              ref={(el) => {
                refs.current[d.index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              aria-label={edit ? `${t('ui.decks.deck', { name: d.name })}. ${t('ui.decks.edit')}` : t('ui.decks.deck', { name: d.name })}
              title={edit ? t('ui.decks.edit') : t('ui.decks.deck', { name: d.name })}
              class={`ui-seg__opt deck-switch__opt${on ? ' is-on' : ''}${d.saved ? '' : ' is-new'}`}
              data-testid={`${prefix}-${d.index}`}
              onClick={() => {
                if (!edit) return choose(d.index);
                hintDone();
                p.onEdit!(d.index);
              }}
              onKeyDown={(e) => onKey(e, d.index)}
            >
              <span class="deck-switch__name" data-clip-check="">
                {d.name}
              </span>
              {edit ? (
                <span class="deck-switch__pen" aria-hidden="true">
                  <PencilIcon size={14} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {/* A note like the other first-seen captions: it never takes a tap (taps pass through it). */}
      {hint ? (
        <span class={`deck-hint deck-hint--${p.variant}`} role="note" data-testid="deck-hint">
          {t('ui.decks.hint')}
        </span>
      ) : null}
    </div>
  );
}

/** Whether the one-time deck hint is still to be shown. */
export function deckHintDue(flags: Readonly<Record<string, boolean>>): boolean {
  return flags[DECK_HINT_FLAG] !== true;
}

/**
 * A deck's sheet (Army): its name, and "Copy from" one of the other saved decks (this deck takes that
 * deck's cards and keeps its own name). `onCommit` stores the changed deck (Army records it for Undo).
 */
export function DeckSheet(p: { index: number; onCommit: (plan: WarPlan, record: boolean) => void; onClose: () => void }) {
  const { t, save, toasts, sound } = useUi();
  const s = save.value;
  const plan = s.warPlans[p.index];
  const [name, setName] = useState(plan?.name ?? DECK_NAMES[p.index] ?? '');
  const trimmed = name.trim();
  if (!plan) return null;
  const others = s.warPlans.map((w, i) => ({ w, i })).filter((x) => x.i !== p.index && x.i < DECKS);
  const save1 = () => {
    if (trimmed.length === 0) return;
    if (trimmed !== plan.name) p.onCommit({ ...plan, name: trimmed }, false);
    p.onClose();
  };
  return (
    <Modal
      title={t('ui.decks.deck', { name: plan.name })}
      size="sm"
      onClose={p.onClose}
      testid="deck-sheet"
      icon={<CardsIcon size={24} />}
      footer={
        <Button kind="progress" testid="deck-save" disabled={trimmed.length === 0} onClick={save1}>
          {t('ui.common.done')}
        </Button>
      }
    >
      <label class="ui-field">
        <span>{t('ui.decks.name')}</span>
        <input
          class="ui-input"
          value={name}
          maxLength={16}
          data-autofocus=""
          data-testid="deck-name"
          onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save1();
          }}
        />
      </label>
      {others.length > 0 ? (
        <div class="deck-copy" role="group" aria-label={t('ui.decks.copyFrom')}>
          <span class="deck-copy__label">{t('ui.decks.copyFrom')}</span>
          <div class="deck-copy__row">
            {others.map(({ w, i }) => (
              <Button
                key={i}
                kind="secondary"
                size="s"
                icon={<CopyIcon size={18} />}
                testid={`deck-copy-${i}`}
                onClick={() => {
                  p.onCommit({ ...plan, name: trimmed || plan.name, loadouts: structuredCloneLoadouts(w) }, true);
                  sound?.('card_place');
                  toasts.show(t('ui.decks.copied', { name: w.name }), { tone: 'good' });
                  p.onClose();
                }}
              >
                {w.name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

/** A deep copy of a deck's loadouts (each age's slot arrays), so two decks never share arrays. */
function structuredCloneLoadouts(w: WarPlan): WarPlan['loadouts'] {
  const out = {} as WarPlan['loadouts'];
  for (const [age, l] of Object.entries(w.loadouts) as [keyof WarPlan['loadouts'], WarPlan['loadouts'][keyof WarPlan['loadouts']]][]) {
    out[age] = { ...l, units: [...l.units], turrets: [...l.turrets], powers: { ...l.powers } };
  }
  return out;
}
