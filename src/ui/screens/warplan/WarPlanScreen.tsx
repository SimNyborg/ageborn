/**
 * War Plan builder (A9 #9, A3): presets A/B/C (renamable), 5 age tabs, 5 unit + 2 turret + 1 power
 * slots per age, the collection filtered to that age, average levels (loadout and War Plan over the
 * next format's ages), auto-fill, advisor warnings (never blockers) and a skin picker per card.
 *
 * Edits keep a loadout legal by construction (same age, owned, no duplicates; slots may be empty)
 * and are saved at once through `setWarPlan`. Validation and advice come from meta via services.
 */
import './warplan.css';
import { ageNameKey, formatNameKey } from '@/content/keys';
import type { AgeId, CardId, PlanIssue } from '@/contracts';
import { useState } from 'preact/hooks';
import { Button, IconButton } from '../../components/Button';
import { CardTile } from '../../components/CardTile';
import { CurrencyChip } from '../../components/Chips';
import { formatDec } from '../../components/format';
import { BoltIcon, CheckIcon, CloseIcon, PencilIcon, RefreshIcon, TowerIcon, SwordsIcon } from '../../components/icons';
import { onGridKeyDown } from '../../components/keys';
import { ScreenFrame } from '../../components/Layout';
import { Modal } from '../../components/Modal';
import { Tabs, AgePicker } from '../../components/Tabs';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { cardTile } from '../model/cards';
import { planIssueText } from '../model/match';
import {
  assignCard,
  candidates,
  clearSlot,
  emptyPlan,
  firstEmptySlot,
  formatAges,
  loadoutAvgLevel,
  nextFormat,
  normalizeLoadout,
  planAvgLevel,
  PRESETS,
  slotCard,
  slotKey,
  slotKindOf,
  type SlotRef,
} from '../model/plan';
import type { WarPlan } from '../services';
import { SkinPicker } from '../shared/SkinPicker';

const PRESET_LABELS = ['A', 'B', 'C'] as const;

const SLOT_LABEL: Record<SlotRef['kind'], string> = {
  unit: 'ui.warplan.slot.unit',
  turret: 'ui.warplan.slot.turret',
  power: 'ui.warplan.slot.power',
};

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
        <Button variant="green" testid="rename-save" disabled={trimmed.length === 0} onClick={() => p.onSave(trimmed)}>
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

export function WarPlanScreen(p: { route: RouteOf<'warPlan'> }) {
  const { save, content, t, locale, router, services, toasts } = useUi();
  const s = save.value;
  const [preset, setPreset] = useState(Math.min(PRESETS - 1, p.route.plan ?? s.activePlan));
  const [age, setAge] = useState<AgeId>(p.route.age ?? 'stone');
  const [selected, setSelected] = useState<SlotRef | null>(null);
  const [tab, setTab] = useState<SlotRef['kind']>('unit');
  const [skinFor, setSkinFor] = useState<CardId | null>(null);
  const [renaming, setRenaming] = useState(false);

  const plan: WarPlan = s.warPlans[preset] ?? {
    ...(s.warPlans[s.activePlan] ?? emptyPlan(content, PRESET_LABELS[preset]!)),
    name: PRESET_LABELS[preset]!,
  };
  const loadout = normalizeLoadout(plan.loadouts[age] ?? emptyPlan(content, '').loadouts[age]);
  const format = nextFormat(s, content);
  const fAges = formatAges(content, format);
  const issues: PlanIssue[] = services.validatePlan(plan, format);
  const warnAges = new Set(issues.map((i) => i.age));
  const ageIssues = issues.filter((i) => i.age === age);
  const loadoutAvg = loadoutAvgLevel(s, content, loadout);
  const planAvg = planAvgLevel(s, content, plan, fAges);
  const inPlan = new Set([...loadout.units, ...loadout.turrets, loadout.power].filter(Boolean) as CardId[]);

  function commit(next: WarPlan) {
    // Presets are added one at a time (`meta.setWarPlan` refuses gaps): editing C before B exists
    // first stores B as a copy of the active plan.
    for (let i = s.warPlans.length; i < preset; i++) {
      services.setWarPlan(i, { ...(s.warPlans[s.activePlan] ?? emptyPlan(content, PRESET_LABELS[i]!)), name: PRESET_LABELS[i]! });
    }
    services.setWarPlan(preset, next);
  }
  function setLoadout(l: typeof loadout) {
    commit({ ...plan, loadouts: { ...plan.loadouts, [age]: l } });
  }
  function pick(card: CardId) {
    const kind = slotKindOf(content, card);
    if (!kind) return;
    const target =
      selected && selected.kind === kind
        ? selected
        : (firstEmptySlot(content, loadout, card) ?? (kind === 'power' ? { kind: 'power' as const } : null));
    if (!target) {
      toasts.show(t('ui.warplan.pickSlot'), { tone: 'info' });
      return;
    }
    setLoadout(assignCard(content, loadout, target, card));
    setSelected(null);
  }
  function selectSlot(ref: SlotRef) {
    const same = selected && slotKey(selected) === slotKey(ref);
    setSelected(same ? null : ref);
    setTab(ref.kind);
  }

  function slotView(slot: SlotRef) {
    const sp = { slot };
    const card = slotCard(loadout, sp.slot);
    const isSel = selected !== null && slotKey(selected) === slotKey(sp.slot);
    const tile = card ? cardTile(s, content, card, t) : null;
    if (tile) {
      return (
        <div key={slotKey(sp.slot)} class={`wp-slot is-filled${isSel ? ' is-selected' : ''}`} data-testid={`slot-${slotKey(sp.slot)}`}>
          <CardTile
            card={tile}
            size="md"
            showCost
            selected={isSel}
            onClick={() => selectSlot(sp.slot)}
            label={t('ui.warplan.slotFilled', { slot: t(SLOT_LABEL[sp.slot.kind]), name: tile.name })}
            corner={
              sp.slot.kind !== 'power' ? (
                <button
                  type="button"
                  class="wp-remove"
                  aria-label={t('ui.warplan.remove', { name: tile.name })}
                  data-testid={`remove-${slotKey(sp.slot)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLoadout(clearSlot(loadout, sp.slot));
                  }}
                >
                  <CloseIcon size={14} />
                </button>
              ) : undefined
            }
          />
          {sp.slot.kind !== 'power' && content.order.skins.some((id) => content.skins[id]!.target === card) ? (
            <button type="button" class="wp-skinbtn" onClick={() => setSkinFor(card)} data-testid={`skins-${card}`}>
              {t('ui.warplan.skins')}
            </button>
          ) : null}
        </div>
      );
    }
    return (
      <button
        key={slotKey(sp.slot)}
        type="button"
        class={`wp-slot wp-slot--empty wp-slot--${sp.slot.kind}${isSel ? ' is-selected' : ''}`}
        onClick={() => selectSlot(sp.slot)}
        aria-pressed={isSel}
        aria-label={t('ui.warplan.emptySlot', { slot: t(SLOT_LABEL[sp.slot.kind]) })}
        data-testid={`slot-${slotKey(sp.slot)}`}
      >
        <span class="wp-slot__plus" aria-hidden="true">
          +
        </span>
        <span class="wp-slot__label">{t(SLOT_LABEL[sp.slot.kind])}</span>
      </button>
    );
  }

  const list = candidates(s, content, age, tab);
  const presetItems = Array.from({ length: PRESETS }, (_, i) => ({
    value: String(i),
    label: s.warPlans[i]?.name ?? PRESET_LABELS[i]!,
    badge: i === s.activePlan ? <CheckIcon size={16} /> : undefined,
    testid: `preset-${i}`,
  }));

  return (
    <ScreenFrame
      id="warPlan"
      title={t('ui.nav.warPlan')}
      onBack={() => router.back()}
      right={
        <>
          <CurrencyChip kind="amber" value={s.currencies.amber} compact />
        </>
      }
    >
      <div class="wp">
        <div class="wp-left">
          <div class="wp-presets">
            <Tabs
              label={t('ui.warplan.presets')}
              items={presetItems}
              value={String(preset)}
              onChange={(v) => {
                setPreset(Number(v));
                setSelected(null);
              }}
              variant="folder"
              testid="presets"
            />
            <IconButton icon={<PencilIcon size={22} />} label={t('ui.warplan.rename')} onClick={() => setRenaming(true)} testid="rename" />
            {preset === s.activePlan ? (
              <span class="wp-inuse" data-testid="plan-in-use">
                <CheckIcon size={18} /> {t('ui.warplan.inUse')}
              </span>
            ) : (
              <Button
                variant="green"
                size="sm"
                testid="use-plan"
                onClick={() => {
                  if (!s.warPlans[preset]) commit(plan);
                  services.setActivePlan(preset);
                }}
              >
                {t('ui.warplan.use')}
              </Button>
            )}
          </div>
          <AgePicker
            ages={content.order.ages}
            value={age}
            onChange={(a) => {
              setAge(a);
              setSelected(null);
            }}
            warn={warnAges}
            idPrefix="wp-age"
          />
          <div class="wp-board" role="tabpanel" id="wp-age-panel" aria-labelledby={`wp-age-tab-${age}`} data-testid="wp-board">
            <div class="wp-row wp-row--units">{loadout.units.map((_, i) => slotView({ kind: 'unit', index: i }))}</div>
            <div class="wp-row wp-row--support">
              {loadout.turrets.map((_, i) => slotView({ kind: 'turret', index: i }))}
              <span class="wp-divider" aria-hidden="true" />
              {slotView({ kind: 'power' })}
            </div>
          </div>
          <div class="wp-foot">
            <span class="wp-avg" data-testid="loadout-avg">
              {t('ui.warplan.loadoutLevel', { age: t(ageNameKey(age)), n: loadoutAvg === null ? '-' : formatDec(loadoutAvg, 1, locale) })}
            </span>
            <span class="wp-avg" data-testid="plan-avg">
              {t('ui.warplan.planLevel', { format: t(formatNameKey(format)), n: planAvg === null ? '-' : formatDec(planAvg, 1, locale) })}
            </span>
            <Button
              variant="violet"
              size="sm"
              icon={<RefreshIcon size={20} />}
              testid="auto-fill"
              onClick={() => {
                const filled = services.autoFill();
                commit({ ...filled, name: plan.name });
                toasts.show(t('ui.warplan.autoFilled'), { tone: 'good' });
              }}
            >
              {t('ui.warplan.autoFill')}
            </Button>
          </div>
          {!fAges.includes(age) ? <p class="wp-note">{t('ui.warplan.notInFormat', { format: t(formatNameKey(format)) })}</p> : null}
          <ul class="wp-advisor" data-testid="advisor" aria-live="polite">
            {ageIssues.map((i) => (
              <li key={i.code} class={`wp-issue wp-issue--${i.severity}`} data-testid={`issue-${i.code}`}>
                {planIssueText(i, t)}
              </li>
            ))}
          </ul>
        </div>
        <section class="wp-right" aria-labelledby="wp-cards-title">
          <header class="wp-right__head">
            <h2 id="wp-cards-title" class="wp-right__title">
              {t('ui.warplan.cardsOf', { age: t(ageNameKey(age)) })}
            </h2>
            <Tabs
              label={t('ui.warplan.cardKind')}
              value={tab}
              onChange={(v) => setTab(v)}
              items={[
                { value: 'unit', label: t('ui.warplan.units'), icon: <SwordsIcon size={18} />, testid: 'tab-unit' },
                { value: 'turret', label: t('ui.warplan.turrets'), icon: <TowerIcon size={18} />, testid: 'tab-turret' },
                { value: 'power', label: t('ui.warplan.powers'), icon: <BoltIcon size={18} />, testid: 'tab-power' },
              ]}
            />
          </header>
          {selected ? (
            <p class="wp-hint">{t('ui.warplan.hintSelected', { slot: t(SLOT_LABEL[selected.kind]) })}</p>
          ) : (
            <p class="wp-hint">{t('ui.warplan.hint')}</p>
          )}
          <div class="ui-cardgrid wp-grid" onKeyDown={onGridKeyDown} data-testid="wp-cards">
            {list.map((id) => {
              const tile = cardTile(s, content, id, t)!;
              const used = inPlan.has(id);
              return (
                <div key={id} class={`wp-cand${used ? ' is-used' : ''}`}>
                  <CardTile
                    card={tile}
                    size="sm"
                    grid
                    showCost
                    disabled={!tile.owned}
                    onClick={() => pick(id)}
                    testid={`cand-${id}`}
                    corner={
                      used ? (
                        <span class="wp-used">
                          <CheckIcon size={16} />
                        </span>
                      ) : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {skinFor ? <SkinPicker card={skinFor} onClose={() => setSkinFor(null)} /> : null}
      {renaming ? (
        <RenameModal
          name={plan.name}
          onClose={() => setRenaming(false)}
          onSave={(name) => {
            commit({ ...plan, name });
            setRenaming(false);
          }}
        />
      ) : null}
    </ScreenFrame>
  );
}
