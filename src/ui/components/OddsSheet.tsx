/**
 * The odds sheet (DESIGN A6.4, A6.5, C5 #27): the Win Capsule bag with what is left in it, the
 * Supply Capsule odds (A15.4), stack rarity odds, what each tier holds, foil odds, Wardrobe Crate odds and
 * every pity counter with its current value. Shown from the capsule tray and Settings; the capsule
 * show (WP10) has its own panel from the same numbers.
 *
 * The 2026-09-29 ladder: every tier line comes from the content tables (no tier id in this file);
 * Legendary tiers carry their crests; tier colours are fills only, so every tier name is normal text
 * next to its drum.
 */
import { capsuleTierNameKey, capsuleTierShortKey, foilNameKey, rarityNameKey } from '@/content/keys';
import type { Rarity } from '@/contracts';
import { formatInt } from './format';
import { CapsuleIcon, CrateIcon, CrestBadge, CrestIcon, EyeIcon, RARITY_COLOR, RarityGem, TIER_COLOR } from './icons';
import { useKit, type Translate } from './kit';
import { LadderNotice } from './LadderNotice';
import { ProgressBar } from './Meters';
import { formatBp, type OddsModel, type PityRow, type TierContentsRow } from './oddsModel';

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

function listFormat(parts: string[], locale: string): string {
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(parts);
  } catch {
    return parts.join(', ');
  }
}

/** A tier's extras after its guarantees: extra Legendary copies, Dust, skin, the tier's own set. */
function tierExtras(r: TierContentsRow, m: OddsModel, t: Translate, locale: string): string[] {
  const out: string[] = [];
  if (r.crests > 1 && r.extraLegendaryCopies < r.copies.legendary) {
    out.push(t(r.crests > 2 ? 'ui.odds.extraLegendary' : 'ui.odds.extraLegendarySecond', { n: r.extraLegendaryCopies }));
  }
  if (r.rareToLegendaryBp > 0) out.push(t('ui.odds.rareToLegendary', { p: formatBp(r.rareToLegendaryBp, locale) }));
  if (r.bonusDust > 0) out.push(t('ui.odds.bonusDust', { n: formatInt(r.bonusDust, locale) }));
  // The exact skin rarity split the roll uses (A6.4 step 7, A15.3): "Epic 81.82% and Legendary 18.18%".
  const split = listFormat(
    r.skinRarityBp.map((x) => t('ui.odds.skinRarity', { rarity: t(rarityNameKey(x.rarity)), p: formatBp(x.bp, locale) })),
    locale,
  );
  if (r.skinChanceBp >= 10000) out.push(t('ui.odds.skinSure', { rarity: t(rarityNameKey(r.skinMinRarity)), split }));
  else if (r.skinChanceBp > 0) out.push(t('ui.odds.skinChance', { p: formatBp(r.skinChanceBp, locale), split }));
  const set = r.exclusiveItems ? m.exclusive.find((x) => x.tier === r.tier) : undefined;
  if (set) out.push(t('ui.odds.aeonSet', { owned: set.owned, total: set.total, dust: formatInt(set.completeDust, locale) }));
  return out;
}

/** `hideHonest`: the host already shows the A15.3 honesty line (the capsule show's odds panel). */
export function OddsSheet(p: { model: OddsModel; hideHonest?: boolean }) {
  const { t, locale } = useKit();
  const m = p.model;
  const legendaryList = listFormat(
    m.legendaryBag.map((x) => t('ui.odds.bagItem', { n: formatInt(x.n, locale), tier: t(capsuleTierShortKey(x.tier)) })),
    locale,
  );
  const summit = m.tiers.findIndex((r) => r.tier === m.summitAbove);
  const hasSummit = summit >= 0 && summit < m.tiers.length - 1;
  const crestTier = m.tiers.find((r) => r.crests > 0);
  return (
    <div class="ui-odds" data-testid="odds-sheet">
      {p.hideHonest ? null : <p class="ui-odds__honest">{t('ui.odds.honest')}</p>}
      {m.notice ? <LadderNotice tiers={m.tiers.filter((r) => r.crests > 0)} /> : null}
      <div class="ui-odds__cols">
        <section class="ui-odds__sec" aria-labelledby="odds-bag">
          <h3 id="odds-bag">{t('ui.odds.bagTitle')}</h3>
          <p class="ui-odds__lead" data-testid="odds-aeon-line">
            {t('ui.odds.bagLine', { list: legendaryList, size: formatInt(m.bagSize, locale) })}
          </p>
          <p class="ui-odds__reveal" data-testid="odds-reveal-note">
            <EyeIcon size={20} />
            {t('ui.capsules.revealNote')}
          </p>
          <ul class="ui-odds__bag">
            {m.bag.map((r) => {
              const crests = m.tiers.find((x) => x.tier === r.tier)?.crests ?? 0;
              return (
                <li key={r.tier} class={`ui-odds__bagrow${crests > 0 ? ' ui-odds__bagrow--crest' : ''}`} data-testid={`odds-bag-${r.tier}`}>
                  <CapsuleIcon tier={r.tier} size={32} crests={crests} />
                  <span class="ui-odds__name">
                    {t(capsuleTierNameKey(r.tier))}
                    {crests > 0 ? <CrestBadge n={crests} /> : null}
                  </span>
                  <span class="ui-odds__count">{t('ui.odds.perHundred', { n: r.perHundred, size: m.bagSize })}</span>
                  <span class="ui-odds__left">{t('ui.odds.left', { n: r.leftInBag })}</span>
                </li>
              );
            })}
          </ul>
          <p class="ui-odds__note" data-testid="odds-bag-left">
            {t('ui.odds.bagLeftTotal', { n: m.bagLeftTotal, size: m.bagTotal })}
          </p>
          {m.legacyBag ? (
            <p class="ui-odds__note" data-testid="odds-bag-legacy">
              {t('ui.odds.bagLegacy')}
            </p>
          ) : null}

          <h3>{t('ui.odds.pityTitle')}</h3>
          <ul class="ui-odds__pity">
            {m.pity.map((r) => (
              <li key={r.id} class="ui-odds__pityrow" data-testid={`odds-pity-${r.id}`}>
                <span class="ui-odds__pityname">{t(PITY_KEYS[r.id], { every: r.every })}</span>
                <ProgressBar
                  value={r.since}
                  max={r.every}
                  tone={r.id === 'legendary' || r.id === 'wardrobeLegendary' ? 'gold' : 'violet'}
                  thin
                  label={t(PITY_KEYS[r.id], { every: r.every })}
                />
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
                    <th scope="row">
                      <span class="ui-odds__tiername">
                        <CapsuleIcon tier={r.tier} size={20} crests={r.crests} />
                        {t(capsuleTierShortKey(r.tier))}
                      </span>
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
          <p class="ui-odds__note" data-testid="odds-all-ages">
            {m.allAges.active ? t('ui.odds.allAgesActive') : t('ui.odds.allAgesLater', { n: m.allAges.fromArena })}
          </p>
          <ul class="ui-odds__extras">
            {m.tiers
              .map((r) => ({ r, extras: tierExtras(r, m, t, locale) }))
              .filter(({ r, extras }) => r.guaranteed.length > 0 || extras.length > 0)
              .map(({ r, extras }) => (
                <li key={r.tier} class={r.crests > 0 ? 'is-legendary' : undefined} data-testid={`odds-extras-${r.tier}`}>
                  <b>{t(capsuleTierNameKey(r.tier))}</b>{' '}
                  {r.guaranteed.length > 0 ? t('ui.odds.guarantees', { list: guaranteeList(r.guaranteed, t, locale) }) : null}
                  {extras.map((x, i) => (
                    <span key={i}> {x}</span>
                  ))}
                </li>
              ))}
          </ul>
          <ul class="ui-odds__rules" data-testid="odds-ladder-rules">
            {crestTier ? (
              <li>
                <CrestIcon size={20} />
                <span>{t('ui.odds.crestRule')}</span>
              </li>
            ) : null}
            {hasSummit ? (
              <li>
                <CapsuleIcon tier={m.tiers[m.tiers.length - 1]!.tier} size={18} crests={m.tiers[m.tiers.length - 1]!.crests} />
                <span>{t('ui.odds.summitRule')}</span>
              </li>
            ) : null}
            {m.catchUp ? (
              <li>
                <RarityGem rarity="legendary" size={18} />
                <span>{t('ui.odds.catchUp')}</span>
              </li>
            ) : null}
            {m.exclusive.map((x) => (
              <li key={x.tier}>
                <CapsuleIcon tier={x.tier} size={18} crests={m.tiers.find((r) => r.tier === x.tier)?.crests ?? 0} />
                <span>{t('ui.odds.aeonSetRule', { dust: formatInt(x.craftDust, locale) })}</span>
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

          <h3>{t('ui.odds.supplyTitle')}</h3>
          <div class="ui-odds__chips">
            {m.dailyBp.map((d) => (
              <span key={d.tier} data-testid={`odds-supply-${d.tier}`} class="ui-odds__chip" style={{ '--c': TIER_COLOR[d.tier] }}>
                <CapsuleIcon tier={d.tier} size={18} crests={m.tiers.find((x) => x.tier === d.tier)?.crests ?? 0} />
                {t(capsuleTierShortKey(d.tier))} <b>{formatBp(d.bp, locale)}</b>
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

          {m.cosmetics ? (
            <div data-testid="odds-cosmetics">
              <h3>{t('cosmetic.odds.title')}</h3>
              <p class="ui-odds__note">{t('cosmetic.odds.capsuleLine')}</p>
              <div class="ui-odds__chips">
                {m.cosmetics.capsuleChanceBp.map((c) => (
                  <span key={c.tier} class="ui-odds__chip" style={{ '--c': TIER_COLOR[c.tier] }}>
                    <CapsuleIcon tier={c.tier} size={18} crests={m.tiers.find((x) => x.tier === c.tier)?.crests ?? 0} />
                    {t(capsuleTierShortKey(c.tier))} <b>{formatBp(c.bp, locale)}</b>
                  </span>
                ))}
              </div>
              <p class="ui-odds__note" data-testid="odds-cosmetics-rarity-lead">
                {t('cosmetic.odds.capsuleRarityLine')}
              </p>
              <div class="ui-odds__chips">
                {m.cosmetics.capsuleRarityBp.map((r) => (
                  <span key={r.rarity} class="ui-odds__chip" style={{ '--c': RARITY_COLOR[r.rarity] }}>
                    <RarityGem rarity={r.rarity} size={16} />
                    {t(rarityNameKey(r.rarity))} <b>{formatBp(r.bp, locale)}</b> {t('cosmetic.odds.items', { n: r.items })}
                  </span>
                ))}
              </div>
              <p class="ui-odds__note">{t('cosmetic.odds.crateLine')}</p>
              <div class="ui-odds__chips">
                <CrateIcon size={22} />
                {m.cosmetics.crateRarityBp.map((r) => (
                  <span key={r.rarity} class="ui-odds__chip" style={{ '--c': RARITY_COLOR[r.rarity] }}>
                    <RarityGem rarity={r.rarity} size={16} />
                    {t(rarityNameKey(r.rarity))} <b>{formatBp(r.bp, locale)}</b> {t('cosmetic.odds.items', { n: r.items })}
                  </span>
                ))}
              </div>
              <p class="ui-odds__note">{t('cosmetic.odds.rules')}</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
