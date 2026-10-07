/**
 * "Make your General" (owner request 2026-10-07, AUDIT §6.6): a one-time sheet after the first
 * capsule's summary, before the second battle. A8 allows no name or account step before the first win,
 * so it comes after it, pre-filled with a random starter look and the generated name: one tap on Done
 * accepts (the session target holds, battle 2 stays one tap from Home). Shuffle rerolls starter parts.
 * Everything can be changed later in Customize › General. A reload shows it again until Done.
 */
import './general.css';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { AvatarLookView, randomStarterLook, type ResolvedLook } from '../../components/Avatar';
import { TINTS } from '../../components/avatar/palette';
import { Button, IconButton } from '../../components/Button';
import { RefreshIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { blockingOverlays } from '../../components/overlay';
import { useUi } from '../context';

/** The UI flag set once the sheet is done (`SaveDoc.flags`, UI keys start with `ui-`). */
export const MAKE_GENERAL_FLAG = 'ui-onboard.general';

/**
 * Counts the sheet as a blocking overlay from the render in which it becomes due, so Home, which may
 * mount in that same commit, already holds its unlock moment (the Army pointer) and plays it once the
 * General is made (U13). An effect would be too late: Home's own effect reads the count from its render.
 * Call it in the component that decides to show the sheet, above the screens.
 */
export function useMakeGeneralHold(active: boolean): void {
  const held = useRef(false);
  if (active !== held.current) {
    blockingOverlays.value += active ? 1 : -1;
    held.current = active;
  }
  useEffect(
    () => () => {
      if (held.current) blockingOverlays.value -= 1;
      held.current = false;
    },
    [],
  );
}

export function MakeGeneral(p: { onDone?: () => void }) {
  const { save, t, services, sound } = useUi();
  const s = save.value;
  const [look, setLook] = useState<ResolvedLook>(() => randomStarterLook(s.profile.avatar.seed));
  const [name, setName] = useState(s.profile.name);
  const [pop, setPop] = useState(0);
  const trimmed = name.trim();
  const swatches = useMemo(() => TINTS.skin.map((hex, i) => ({ hex, i })), []);
  const done = () => {
    services.equipCosmetic({ slot: 'avatar', look: look.parts, tints: look.tints });
    if (trimmed && trimmed !== s.profile.name) services.setProfile({ name: trimmed });
    services.setUiFlags({ [MAKE_GENERAL_FLAG]: true });
    sound?.('ui_stamp');
    p.onDone?.();
  };
  return (
    <Modal
      title={t('avatar.ui.make')}
      size="md"
      tone="gold"
      onClose={done}
      testid="make-general"
      footer={
        <Button kind="primary" size="l" testid="make-general-done" onClick={done} disabled={trimmed.length === 0}>
          {t('avatar.ui.done')}
        </Button>
      }
    >
      <div class="mkg">
        <div class="mkg-stage">
          <AvatarLookView look={look} size={150} crop="bust" pop={pop} testid="make-general-preview" label={trimmed} />
          <IconButton
            icon={<RefreshIcon size={22} />}
            label={t('avatar.ui.shuffle')}
            testid="make-general-shuffle"
            onClick={() => {
              setLook(randomStarterLook((Math.random() * 0x7fffffff) | 0));
              setPop((n) => n + 1);
              sound?.('ui_pop');
            }}
          />
        </div>
        <div class="mkg-form">
          <p class="mkg-lead">{t('avatar.ui.makeLead')}</p>
          <label class="ui-field">
            <span>{t('avatar.ui.name')}</span>
            <input class="ui-input" value={name} maxLength={16} data-testid="make-general-name" onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
          </label>
          <div class="gen-swatches" role="radiogroup" aria-label={t('avatar.tint.skin')}>
            {swatches.map((w) => (
              <button
                key={w.hex}
                type="button"
                role="radio"
                aria-checked={look.tints.skin === w.i}
                aria-label={`${t('avatar.tint.skin')} ${w.i + 1}`}
                class={`gen-swatch${look.tints.skin === w.i ? ' is-on' : ''}`}
                style={{ '--sw': w.hex }}
                onClick={() => {
                  setLook({ ...look, tints: { ...look.tints, skin: w.i } });
                  sound?.('ui_toggle');
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
