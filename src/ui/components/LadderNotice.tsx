/**
 * The one-time "Two new capsule tiers" card (the 2026-09-29 ladder; DESIGN B8 step 4, A15.13):
 * shown at the top of the Capsules tab and in the odds panel while `flags['notice.capsuleLadder']` is
 * set. No timer, no expiry, no badge; closing it (Capsules tab) clears the flag. `legacy` is the
 * number of skill Aeons granted again to this save (0 hides that line).
 */
import type { CapsuleTier } from '@/contracts';
import { IconButton } from './Button';
import { CapsuleIcon, CloseIcon } from './icons';
import { useKit } from './kit';

export function LadderNotice(p: { tiers: readonly { tier: CapsuleTier; crests: number }[]; legacy?: number; onClose?: () => void }) {
  const { t } = useKit();
  const legacy = p.legacy ?? 0;
  return (
    <section class="cap-notice ui-rm-own" data-testid="capsule-ladder-notice" aria-labelledby="cap-notice-title">
      <span class="cap-notice__icons" aria-hidden="true">
        {p.tiers.map((x, i) => (
          <CapsuleIcon key={x.tier} tier={x.tier} crests={x.crests} size={i === p.tiers.length - 1 ? 44 : 38} />
        ))}
      </span>
      <span class="cap-notice__text">
        <b id="cap-notice-title">{t('ui.notice.capsuleLadder.title')}</b>
        <span>{t('ui.notice.capsuleLadder.body')}</span>
        {legacy > 0 ? (
          <span class="is-legacy" data-testid="capsule-ladder-legacy">
            {legacy === 1 ? t('ui.notice.capsuleLadder.legacyOne') : t('ui.notice.capsuleLadder.legacy', { n: legacy })}
          </span>
        ) : null}
      </span>
      {p.onClose ? (
        <IconButton icon={<CloseIcon size={22} />} label={t('ui.common.close')} kind="tertiary" onClick={p.onClose} testid="capsule-ladder-notice-close" />
      ) : (
        <span />
      )}
    </section>
  );
}
