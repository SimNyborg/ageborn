/**
 * The UI art pass (UI art audit, Track A): the cel-shading colour rules, the icon family, the
 * crossed swords' symmetry, the bird sprite and the sprite-strip hook's request.
 */
import { render } from 'preact';
import { describe, expect, it } from 'vitest';
import { ChestIcon, LastBaseIcon, QuickBattleIcon, SkirmishIcon, SundialIcon, SwordsIcon } from '../icons';
import { NavIcon } from '../navIcons';
import { ink, light, shade } from '../tone';
import { Wordmark } from '../Wordmark';
import { Bird, Flock } from '../../screens/warPath/skyArt';
import { installDom, type FakeElement } from '../../screens/test/dom';

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
}

function mount(node: preact.ComponentChild): FakeElement {
  const { container } = installDom();
  render(node, container as unknown as HTMLElement);
  return container;
}

/** A markup-like string of an element tree (the fake DOM has no innerHTML). */
function ser(el: FakeElement): string {
  return el.childNodes
    .map((c) => {
      const e = c as FakeElement;
      if (!e.localName) return '';
      return `<${e.localName}${e.attributes.map((a) => ` ${a.name}="${a.value}"`).join('')}>${ser(e)}</${e.localName}>`;
    })
    .join('');
}

describe('cel-shading colour rules (audit §3.1)', () => {
  it('darkens shadows, lightens highlights and keeps outlines dark but never black', () => {
    for (const fill of ['#e8b23a', '#9aa0a6', '#5e8f3a', '#2f7df6', '#f4f1ea', '#1b1330']) {
      expect(lum(shade(fill))).toBeLessThan(lum(fill));
      expect(lum(light(fill))).toBeGreaterThanOrEqual(lum(fill));
      const o = ink(fill);
      expect(o).not.toBe('#000000');
      // value capped at 0.38: no channel above 97
      const n = parseInt(o.slice(1), 16);
      expect(Math.max((n >> 16) & 255, (n >> 8) & 255, n & 255)).toBeLessThanOrEqual(97);
    }
  });

  it('shifts warm shadows toward red', () => {
    const s = parseInt(shade('#e8b23a').slice(1), 16);
    const r = (s >> 16) & 255;
    const g = (s >> 8) & 255;
    // gold 232/178 = 1.30; the shadow leans redder
    expect(r / g).toBeGreaterThan(232 / 178);
  });
});

describe('icon family', () => {
  it('draws the redrawn icons without a fixed black outline or NaN', () => {
    const el = mount(
      <>
        <SwordsIcon size={24} />
        <SwordsIcon size={40} />
        <SkirmishIcon />
        <QuickBattleIcon />
        <ChestIcon />
        <LastBaseIcon />
        <SundialIcon />
        <SundialIcon dim />
        {(['army', 'capsules', 'battle', 'progress', 'customize'] as const).map((id) => (
          <NavIcon key={id} id={id} />
        ))}
      </>,
    );
    const html = ser(el);
    expect(html).not.toMatch(/NaN|undefined/);
    expect(html).not.toMatch(/stroke="#000(000)?"/);
    // every shadow band is clipped to its own part (unique clip ids)
    const ids = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mirrors the two crossed swords exactly (audit #4)', () => {
    const el = mount(<SwordsIcon size={24} />);
    const a = ser(el.querySelector('.ui-swords__a')!.children[0]!);
    const b = el.querySelector('.ui-swords__b')!.children[0]!;
    expect(b.getAttribute('transform')).toMatch(/^translate\(24 0\) scale\(-1 1\)/);
    expect(ser(b).replace(/pt[\w-]+/g, 'id')).toBe(a.replace(/pt[\w-]+/g, 'id'));
  });

  it('gives Quick Battle and Skirmish their own glyphs (one meaning per glyph, §3.5)', () => {
    const q = ser(mount(<QuickBattleIcon />));
    const s = ser(mount(<SkirmishIcon />));
    const w = ser(mount(<SwordsIcon />));
    expect(q).not.toBe(s);
    expect(s).not.toBe(w);
  });

  it('draws the wordmark with an accessible name', () => {
    const el = mount(<Wordmark text="Ageborn" />);
    expect(el.querySelector('svg')!.getAttribute('aria-label')).toBe('Ageborn');
    expect(el.querySelector('.ui-wordmark__shine')).not.toBeNull();
  });
});

describe('birds (audit #5)', () => {
  it('has five flap frames and a glide pose, with head, beak, tail and wings', () => {
    const el = mount(<Bird kind="crow" size={24} />);
    expect(el.querySelector('.ui-bird__strip')!.children).toHaveLength(5);
    expect(el.querySelector('.ui-bird__glide')).not.toBeNull();
    // body, tail, beak, wing per frame
    expect(el.querySelector('.ui-bird__glide')!.querySelectorAll('path').length).toBeGreaterThanOrEqual(5);
  });

  it('staggers a flock so it never flaps in sync', () => {
    const el = mount(<Flock kind="gull" n={5} size={20} seed={3} />);
    const delays = el.querySelectorAll('svg.ui-bird').map((s) => String((s.style as unknown as { getPropertyValue(k: string): string }).getPropertyValue('--bird-delay')));
    expect(delays).toHaveLength(5);
    expect(new Set(delays).size).toBeGreaterThan(1);
  });
});
