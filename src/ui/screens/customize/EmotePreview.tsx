/**
 * Emotes in Customize (PLAN 2a "Emotes"): the six starter emotes are your own General performing them
 * (`EmoteHead`, the same component as the HUD wheel and the battle bubble), and the preview under the
 * wheel plays the emote you last picked in the battle bubble, big, so you see what the opponent sees.
 */
import { cosmeticNameKey, emoteNameKey } from '@/content/keys';
import type { BaseEmoteId } from '@/contracts';
import { EmoteHead } from '../../components/avatar/EmoteHead';
import { CosmeticImage } from '../../components/cosmeticArt';
import { useUi } from '../context';
import { isStarterEmote } from '../model/cosmetics';

/** A starter emote performed by your General (the key pose under Reduce motion). */
export function EmoteFace(p: { emote: BaseEmoteId; size: number; testid?: string }) {
  const { save } = useUi();
  const s = save.value;
  return <EmoteHead emote={p.emote} spec={s.profile.avatar} size={p.size} still={s.settings.reduceMotion} {...(p.testid ? { testid: p.testid } : {})} />;
}

/** Any wheel emote at `size`: a starter by your General, a collected one by its own animated art. */
export function WheelEmote(p: { emote: string; size: number }) {
  const { save, content } = useUi();
  if (isStarterEmote(content, p.emote)) return <EmoteFace emote={p.emote as BaseEmoteId} size={p.size} />;
  return (
    <span class="cos-emote-art" style={{ width: `${p.size}px`, height: `${p.size}px` }}>
      <CosmeticImage item={p.emote} animate={!save.value.settings.reduceMotion} />
    </span>
  );
}

/**
 * The emote you last picked, played in the battle bubble over a strip of sky (the desktop layout pass:
 * the column under the wheel was empty). Replays on every pick (keyed).
 */
export function EmoteStage(p: { emote: string | null }) {
  const { content, t } = useUi();
  if (!p.emote) return null;
  const starter = isStarterEmote(content, p.emote);
  const name = starter ? t(emoteNameKey(p.emote as BaseEmoteId)) : t(cosmeticNameKey('emote', p.emote.slice('emote.'.length)));
  return (
    <figure class="cos-emostage" data-testid="emote-stage" aria-label={t('cosmetic.ui.inBattle', { name })}>
      <span class="cos-emostage__bubble" key={p.emote}>
        <WheelEmote emote={p.emote} size={92} />
      </span>
      <figcaption class="cos-emostage__name">
        <small>{t('cosmetic.ui.inBattleLabel')}</small>
        <b>{name}</b>
      </figcaption>
    </figure>
  );
}
