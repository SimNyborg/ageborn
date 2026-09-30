/**
 * The Card Album (owner request 2026-09-30: "a page with a long scroll like a Pokedex, where you can
 * see which ones you have and which you do not have in each age"; ui-plan 4.3).
 *
 * - One long vertical scroll grouped by age. Each age has a sticky header with its glyph, name,
 *   completion ("12/17") and a bar that fills to gold when the age is complete.
 * - Every troop, turret and power card is a numbered tile (No. 1 is the first Stone troop; numbers
 *   never change with filters). Owned cards are in full colour with their level and copies; missing
 *   ones are dark silhouettes with a "?" and where to find them. Tap any tile for Card detail.
 * - A sticky bar on top: the total ("110/136 found", 81%), Have / Missing / All, a Filters sheet
 *   (rarity, class) and a strip of age chips that jump to an age and light up for the age in view.
 * - Smooth on phones: sections render lazily (`content-visibility`), chips scroll smoothly, and the
 *   jump honours Reduce motion.
 */
import { ageNameKey, rarityNameKey } from '@/content/keys';
import type { AgeId, Rarity } from '@/contracts';
import { UNIT_CLASSES, type CardClass } from '@/core/cardClass';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { CardTile } from '../../components/CardTile';
import { CLASS_NAME_KEY, ClassIcon } from '../../components/ClassIcon';
import { Segmented } from '../../components/Controls';
import { AGE_COLOR, AgeGlyph, CheckIcon, FilterIcon, RarityGem, StarIcon } from '../../components/icons';
import { onGridKeyDown } from '../../components/keys';
import { Sheet } from '../../components/Modal';
import { reducedMotion } from '../../components/motion';
import { useUi } from '../context';
import { capsuleArenaFor } from '../model/armyAge';
import { cardTile } from '../model/cards';
import { activeDexFilters, DEX_FILTER, dexOf, type DexFilter, type DexOwn } from '../model/dex';
import { powerSourceText } from '../model/powerText';

const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const CLASSES: readonly CardClass[] = [...UNIT_CLASSES, 'turret', 'power'];

/** Where a missing card comes from, in full (the album has room for it). */
function useSourceLine() {
  const { save, content, t } = useUi();
  return (id: string): string => {
    const p = content.powers[id];
    if (p) return powerSourceText(p, t);
    const age = content.units[id]?.age ?? content.turrets[id]?.age;
    const arena = age ? capsuleArenaFor(save.value, content, age) : null;
    return arena === null ? t('ui.dex.src.capsule') : t('ui.dex.src.capsuleArena', { n: arena });
  };
}

/**
 * `age`: open scrolled to that age (Army's age tab); `own`: open with that Have / Missing choice
 * (Army's Locked row opens on Missing).
 */
export function CardDex(p: { age?: AgeId | undefined; own?: DexOwn | undefined } = {}) {
  const { save, content, t, router } = useUi();
  const s = save.value;
  const [f, setF] = useState<DexFilter>(() => ({ ...DEX_FILTER, own: p.own ?? 'all' }));
  const [sheet, setSheet] = useState(false);
  const [inView, setInView] = useState<AgeId>(p.age ?? content.order.ages[0] ?? 'stone');
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const dex = dexOf(s, content, f);
  const pct = dex.total > 0 ? Math.round((dex.owned / dex.total) * 100) : 0;
  const source = useSourceLine();
  const count = activeDexFilters({ ...f, own: 'all' });

  // The sticky age headers sit under the sticky bar: where it ends is a CSS variable (it wraps on phones).
  useLayoutEffect(() => {
    const el = bar.current;
    const box = root.current;
    if (!el || !box || typeof ResizeObserver === 'undefined') return;
    const set = () => {
      // where a stuck age header starts: the stuck bar's top (its sticky offset) plus its height
      const top = parseFloat(getComputedStyle(el).top) || 0;
      box.style.setProperty('--dex-head-top', `${Math.round(top + el.offsetHeight)}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The age chip of the section at the top lights up while scrolling (rAF-throttled, passive).
  useLayoutEffect(() => {
    const box = root.current;
    const scroller = box?.closest?.('.ui-screen__body') as HTMLElement | null;
    if (!box || !scroller || typeof requestAnimationFrame !== 'function') return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const top = (bar.current?.getBoundingClientRect().bottom ?? 0) + 8;
      let cur: AgeId | null = null;
      for (const sec of Array.from(box.querySelectorAll<HTMLElement>('[data-dex-age]'))) {
        if (sec.getBoundingClientRect().top <= top + 4) cur = sec.dataset['dexAge'] as AgeId;
      }
      if (cur) setInView(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    check();
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [f]);

  // Keep the lit chip in view inside its strip.
  useLayoutEffect(() => {
    const strip = chips.current;
    const on = strip?.querySelector?.(`[data-dex-chip="${inView}"]`) as HTMLElement | null;
    if (!strip || !on || typeof strip.scrollTo !== 'function') return;
    const x = on.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
    strip.scrollTo({ left: Math.max(0, x - (strip.clientWidth - on.offsetWidth) / 2), behavior: reducedMotion(strip) ? 'auto' : 'smooth' });
  }, [inView]);

  function jump(age: AgeId, instant = false) {
    const sec = root.current?.querySelector?.(`[data-dex-age="${age}"]`) as HTMLElement | null;
    if (!sec || typeof sec.scrollIntoView !== 'function') return;
    sec.scrollIntoView({ block: 'start', behavior: instant || reducedMotion(sec) ? 'auto' : 'smooth' });
    setInView(age);
  }

  // Opened for an age (from Army): start at that age's section. The ages above it render lazily
  // (`content-visibility`), so the jump repeats for a few frames while their real heights arrive.
  useLayoutEffect(() => {
    const age = p.age;
    if (!age || age === content.order.ages[0] || typeof requestAnimationFrame !== 'function') return;
    let n = 0;
    let raf = 0;
    const go = () => {
      jump(age, true);
      if (++n < 4) raf = requestAnimationFrame(go);
    };
    go();
    return () => cancelAnimationFrame(raf);
  }, []);

  const shownAges = dex.ages.filter((a) => a.entries.length > 0);

  return (
    <div class="dex" ref={root} data-testid="dex">
      <div class="dex-bar" ref={bar} data-testid="dex-bar">
        <div class="dex-bar__row">
          <div class="dex-total" data-testid="dex-total" aria-label={t('ui.dex.found', { n: dex.owned, max: dex.total })}>
            <span class="dex-total__text">
              <b>{t('ui.dex.found', { n: dex.owned, max: dex.total })}</b>
              <small>{t('ui.dex.percent', { pct })}</small>
            </span>
            <span class="dex-meter" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </span>
          </div>
          <Segmented<DexOwn>
            label={t('ui.dex.show')}
            value={f.own}
            size="sm"
            testid="dex-own"
            onChange={(own) => setF({ ...f, own })}
            options={[
              { value: 'all', label: t('ui.dex.all') },
              { value: 'owned', label: t('ui.dex.owned') },
              { value: 'missing', label: t('ui.dex.missingFilter') },
            ]}
          />
          <Button kind="secondary" size="s" icon={<FilterIcon size={18} />} testid="dex-filters" class={count ? 'is-on' : ''} onClick={() => setSheet(true)}>
            {count ? `${t('ui.dex.filters')} · ${count}` : t('ui.dex.filters')}
          </Button>
        </div>
        <div class="dex-chips" ref={chips} role="navigation" aria-label={t('ui.dex.jump')}>
          {dex.ages.map((a) => {
            const done = a.owned === a.total;
            return (
              <button
                key={a.age}
                type="button"
                class={`dex-chip${inView === a.age ? ' is-on' : ''}${done ? ' is-done' : ''}`}
                style={{ '--age': AGE_COLOR[a.age].accent }}
                data-dex-chip={a.age}
                data-testid={`dex-chip-${a.age}`}
                aria-label={`${t(ageNameKey(a.age))}: ${t('ui.dex.ageCount', { n: a.owned, max: a.total })}`}
                aria-current={inView === a.age ? 'true' : undefined}
                onClick={() => jump(a.age)}
              >
                <span class="dex-chip__face">
                  <span class="dex-chip__glyph" aria-hidden="true">
                    <AgeGlyph age={a.age} size={18} />
                  </span>
                  <span class="dex-chip__count">
                    {done ? <CheckIcon size={12} /> : null}
                    {t('ui.dex.ageCount', { n: a.owned, max: a.total })}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {shownAges.length === 0 ? (
        <div class="dex-empty" data-testid="dex-empty">
          <p>{t('ui.dex.none')}</p>
          <Button kind="secondary" size="s" testid="dex-clear" onClick={() => setF(DEX_FILTER)}>
            {t('ui.dex.clear')}
          </Button>
        </div>
      ) : null}

      {shownAges.map((a) => {
        const done = a.owned === a.total;
        const pctAge = a.total > 0 ? Math.round((a.owned / a.total) * 100) : 0;
        const arena = capsuleArenaFor(s, content, a.age);
        return (
          <section key={a.age} class={`dex-age${done ? ' is-done' : ''}`} data-dex-age={a.age} data-testid={`dex-age-${a.age}`} aria-labelledby={`dex-h-${a.age}`} style={{ '--age': AGE_COLOR[a.age].accent, '--age-main': AGE_COLOR[a.age].main }}>
            <header class="dex-age__head">
              <span class="ui-agechip dex-age__glyph" aria-hidden="true">
                <AgeGlyph age={a.age} size={22} />
              </span>
              <span class="dex-age__titles">
                <h3 id={`dex-h-${a.age}`} class="dex-age__name">
                  {t(ageNameKey(a.age))}
                </h3>
                {arena !== null && !done ? <small class="dex-age__note">{t('ui.dex.src.capsuleArena', { n: arena })}</small> : null}
              </span>
              <span class="dex-age__count" data-testid={`dex-count-${a.age}`}>
                {done ? (
                  <span class="dex-age__done" data-tag="">
                    <StarIcon size={14} /> {t('ui.dex.complete')}
                  </span>
                ) : null}
                <b>{t('ui.dex.ageCount', { n: a.owned, max: a.total })}</b>
              </span>
              <span class="dex-meter dex-meter--age" aria-hidden="true">
                <span style={{ width: `${pctAge}%` }} />
              </span>
            </header>
            <div class="dex-grid" onKeyDown={onGridKeyDown}>
              {a.entries.map((e, i) => {
                const tile = cardTile(s, content, e.id, t)!;
                return (
                  <div key={e.id} class={`dex-tile${e.owned ? '' : ' is-missing'}${tile.legendary ? ' has-crown' : ''}`} style={{ '--i': Math.min(i, 10) }} data-testid={`dex-${e.id}`}>
                    <span class="dex-tile__no" data-tag="">
                      {t('ui.dex.number', { n: String(e.no).padStart(3, '0') })}
                    </span>
                    <CardTile
                      card={tile}
                      size="md"
                      grid
                      showCopies={e.owned}
                      testid={`card-${e.id}`}
                      label={e.owned ? undefined : `${t('ui.dex.number', { n: e.no })}: ${tile.name}. ${t('ui.dex.missing')}. ${source(e.id)}`}
                      onClick={() => router.go({ id: 'cardDetail', card: e.id })}
                    />
                    {e.owned ? null : (
                      <>
                        <span class="dex-tile__q" aria-hidden="true">
                          ?
                        </span>
                        <span class="dex-tile__src" data-tag="" data-testid={`dex-src-${e.id}`}>
                          {source(e.id)}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {sheet ? (
        <Sheet title={t('ui.dex.filters')} onClose={() => setSheet(false)} testid="dex-filter-sheet" icon={<FilterIcon size={22} />}>
          <div class="dex-filter">
            <h4 class="dex-filter__label">{t('ui.dex.rarity')}</h4>
            <Segmented<Rarity | 'all'>
              label={t('ui.dex.rarity')}
              value={f.rarity}
              size="sm"
              testid="dex-rarity"
              onChange={(rarity) => setF({ ...f, rarity })}
              options={[{ value: 'all', label: t('ui.dex.anyRarity') }, ...RARITIES.map((r) => ({ value: r, label: t(rarityNameKey(r)), icon: <RarityGem rarity={r} size={16} /> }))]}
            />
            <h4 class="dex-filter__label">{t('ui.dex.class')}</h4>
            <div class="dex-filter__classes" role="group" aria-label={t('ui.dex.class')}>
              <button type="button" class={`dex-fchip${f.cls === 'all' ? ' is-on' : ''}`} aria-pressed={f.cls === 'all'} onClick={() => setF({ ...f, cls: 'all' })} data-testid="dex-class-all">
                <span>{t('ui.dex.anyClass')}</span>
              </button>
              {CLASSES.map((c) => (
                <button key={c} type="button" class={`dex-fchip${f.cls === c ? ' is-on' : ''}`} aria-pressed={f.cls === c} onClick={() => setF({ ...f, cls: f.cls === c ? 'all' : c })} data-testid={`dex-class-${c}`}>
                  <ClassIcon id={c} size={20} />
                  <span>{t(CLASS_NAME_KEY[c])}</span>
                </button>
              ))}
            </div>
            <div class="dex-filter__foot">
              <Button kind="tertiary" size="s" testid="dex-filter-clear" onClick={() => setF({ ...DEX_FILTER, own: f.own })}>
                {t('ui.dex.clear')}
              </Button>
            </div>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
