/**
 * The odds sheet (DESIGN A6.4, A6.5, C5 #27): the Win Capsule bag with what is left in it, the
 * Daily Capsule odds, stack rarity odds, what each tier holds, foil odds, Wardrobe Crate odds and
 * every pity counter with its current value. Shown from the capsule tray and Settings; the capsule
 * show (WP10) has its own panel from the same numbers.
 */
import { capsuleTierNameKey, foilNameKey, rarityNameKey } from '@/content/keys';
import type { Rarity } from '@/contracts';
import { formatInt } from './format';
import { CapsuleIcon, CrateIcon, RARITY_COLOR, RarityGem, TIER_COLOR } from './icons';
import { useKit, type Translate } from './kit';
import { ProgressBar } from './Meters';
import { formatBp, type OddsModel, type PityRow } from './oddsModel';

const PITY_KEYS: Record<PityRow['id'], string> = {
  epic: 'ui.odds.pity.epic',
  legendary: 'ui.odds.pity.legendary',
  newCard: 'ui.odds.pity.newCard',
  wardrobeEpic: 'ui.odds.pity.wardrobeEpic',
  wardrobeLegendary: 'ui.odds.pity.wardrobeLegendary',
};

/** "1 Rare stack", "2 Rare and 1 Epic stacks" in the current locale. */
function guaranteeList(g: readonly Rarity[], t: Translate, locale: string): string {
  const counts = new Map<Rarity, number>();
  for (const r of g) counts.set(r, (counts.get(r) ?? 0) + 1);
  const parts = [...counts].map(([r, n]) => t('ui.odds.stackCount', { n, rarity: t(rarityNameKey(r)) }));
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(parts);
  } catch {
    return parts.join(', ');
  }
}

export function OddsSheet(p: { model: OddsModel }) {
  const { t, locale } = useKit();
  const m = p.model;
  const aeon = m.bag.find((r) => r.tier === 'aeon');
  return (
    <div class="ui-odds" data-testid="odds-sheet">
      <p class="ui-odds__honest">{t('ui.odds.honest')}</p>
      <div class="ui-odds__cols">
        <section class="ui-odds__sec" aria-labelledby="odds-bag">
          <h3 id="odds-bag">{t('ui.odds.bagTitle')}</h3>
          <p class="ui-odds__lead" data-testid="odds-aeon-line">
            {t('ui.odds.bagLine', { n: aeon?.perHundred ?? 0, size: m.bagSize })}
          </p>
          <ul class="ui-odds__bag">
            {m.bag.map((r) => (
              <li key={r.tier} class="ui-odds__bagrow" data-testid={`odds-bag-${r.tier}`}>
                <CapsuleIcon tier={r.tier} size={30} />
                <span class="ui-odds__name">{t(capsuleTierNameKey(r.tier))}</span>
                <span class="ui-odds__count">{t('ui.odds.perHundred', { n: r.perHundred, size: m.bagSize })}</span>
                <span class="ui-odds__left">{t('ui.odds.left', { n: r.leftInBag })}</span>
              </li>
            ))}
          </ul>
          <p class="ui-odds__note">{t('ui.odds.bagLeftTotal', { n: m.bagLeftTotal, size: m.bagSize })}</p>

          <h3>{t('ui.odds.pityTitle')}</h3>
          <ul class="ui-odds__pity">
            {m.pity.map((r) => (
              <li key={r.id} class="ui-odds__pityrow" data-testid={`odds-pity-${r.id}`}>
                <span class="ui-odds__pityname">{t(PITY_KEYS[r.id], { every: r.every })}</span>
                <ProgressBar value={r.since} max={r.every} tone={r.id === 'legendary' || r.id === 'wardrobeLegendary' ? 'gold' : 'violet'} thin label={t(PITY_KEYS[r.id], { every: r.every })} />
                <span class="ui-odds__pityval">
                  {t('ui.odds.guaranteedIn', { n: r.guaranteedIn })}
                  {r.nextChanceBp !== null && r.nextChanceBp > 0 && r.nextChanceBp < 10000 ? (
                    <em>{t('ui.odds.nextChance', { p: formatBp(r.nextChanceBp, locale) })}</em>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <p class="ui-odds__note">{t('ui.odds.legendaryRule')}</p>
        </section>

        <section class="ui-odds__sec" aria-labelledby="odds-inside">
          <h3 id="odds-inside">{t('ui.odds.insideTitle')}</h3>
          <div class="ui-odds__tablewrap">
            <table class="ui-odds__table">
              <thead>
                <tr>
                  <th scope="col">{t('ui.odds.col.tier')}</th>
                  <th scope="col">{t('ui.odds.col.stacks')}</th>
                  {m.stackBp.map((s) => (
                    <th key={s.rarity} scope="col" title={t(rarityNameKey(s.rarity))}>
                      <RarityGem rarity={s.rarity} size={16} />
                    </th>
                  ))}
                  <th scope="col">{t('ui.currency.amber')}</th>
                </tr>
              </thead>
              <tbody>
                {m.tiers.map((r) => (
                  <tr key={r.tier}>
                    <th scope="row" style={{ color: TIER_COLOR[r.tier] }}>
                      {t(capsuleTierNameKey(r.tier))}
                    </th>
                    <td>{r.stacks}</td>
                    {m.stackBp.map((s) => (
                      <td key={s.rarity}>{r.copies[s.rarity]}</td>
                    ))}
                    <td>{formatInt(r.amber, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="ui-odds__note">{t('ui.odds.copiesNote')}</p>
          <ul class="ui-odds__extras">
            {m.tiers
              .filter((r) => r.guaranteed.length > 0 || r.bonusDust > 0 || r.skinChanceBp > 0 || r.rareToLegendaryBp > 0)
              .map((r) => (
                <li key={r.tier}>
                  <b style={{ color: TIER_COLOR[r.tier] }}>{t(capsuleTierNameKey(r.tier))}</b>{' '}
                  {r.guaranteed.length > 0 ? t('ui.odds.guarantees', { list: guaranteeList(r.guaranteed, t, locale) }) : null}
                  {r.rareToLegendaryBp > 0 ? <> {t('ui.odds.rareToLegendary', { p: formatBp(r.rareToLegendaryBp, locale) })}</> : null}
                  {r.bonusDust > 0 ? <> {t('ui.odds.bonusDust', { n: formatInt(r.bonusDust, locale) })}</> : null}
                  {r.skinChanceBp > 0 ? <> {t('ui.odds.skinChance', { p: formatBp(r.skinChanceBp, locale) })}</> : null}
                </li>
              ))}
          </ul>

          <h3>{t('ui.odds.stackTitle')}</h3>
          <div class="ui-odds__chips">
            {m.stackBp.map((s) => (
              <span key={s.rarity} class="ui-odds__chip" style={{ '--c': RARITY_COLOR[s.rarity] }} data-testid={`odds-stack-${s.rarity}`}>
                <RarityGem rarity={s.rarity} size={16} />
                {t(rarityNameKey(s.rarity))} <b>{formatBp(s.bp, locale)}</b>
              </span>
            ))}
          </div>
          {!m.randomLegendaries ? <p class="ui-odds__note">{t('ui.odds.noRandomLegendaries')}</p> : null}
          <p class="ui-odds__note">{t('ui.odds.unownedWeight')}</p>

          <h3>{t('ui.odds.dailyTitle')}</h3>
          <div class="ui-odds__chips">
            {m.dailyBp.map((d) => (
              <span key={d.tier} class="ui-odds__chip" style={{ '--c': TIER_COLOR[d.tier] }}>
                <CapsuleIcon tier={d.tier} size={18} />
                {t(capsuleTierNameKey(d.tier))} <b>{formatBp(d.bp, locale)}</b>
              </span>
            ))}
          </div>

          <h3>{t('ui.odds.foilTitle')}</h3>
          <div class="ui-odds__chips">
            {m.foils.map((f) => (
              <span key={f.foil} class={`ui-odds__chip ui-odds__chip--foil-${f.foil}`}>
                {t(foilNameKey(f.foil))} <b>{formatBp(f.bp, locale)}</b>
              </span>
            ))}
          </div>

          <h3>{t('ui.odds.wardrobeTitle')}</h3>
          <div class="ui-odds__chips">
            <CrateIcon size={22} />
            {m.wardrobeBp.map((w) => (
              <span key={w.rarity} class="ui-odds__chip" style={{ '--c': RARITY_COLOR[w.rarity] }}>
                {t(rarityNameKey(w.rarity))} <b>{formatBp(w.bp, locale)}</b>
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
