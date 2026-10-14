// Carousel slides (1080x1350): a cover, one slide per unit, and a closing call to action. Content comes
// as props from scripts/stills.mjs; art is the game's own (battle stills, HD sprite cut-outs, wordmark).
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { DisplayLine } from '../components/Text';
import { Wordmark } from '../components/Wordmark';
import { C, FONT_DISPLAY, FONT_TEXT, GOLD_RAMP, RARITY, loadFonts } from '../theme';

loadFonts();

export interface Cut {
  src: string;
  x: number;
  y: number;
  h: number;
  rot?: number;
  flip?: boolean;
  z?: number;
}

export interface SlideProps {
  kind: 'cover' | 'unit' | 'cta';
  /** Accent colour of the slide (the unit's age). */
  accent?: string;
  title?: string[];
  subtitle?: string;
  cuts?: Cut[];
  /** unit slides */
  index?: number;
  total?: number;
  name?: string;
  age?: string;
  rarity?: string;
  still?: string;
  /** Crop of the still: object-position in % (x, y). */
  focus?: [number, number];
  stats?: { label: string; value: string }[];
  desc?: string;
  /** cta slides */
  picks?: { src: string; label: string }[];
  prompt?: string;
  swipe?: boolean;
}

const Glow: React.FC<{ color: string; x: number; y: number; r: number; o?: number }> = ({ color, x, y, r, o = 0.5 }) => (
  <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${color} 0%, transparent 65%)`, opacity: o }} />
);

const Backdrop: React.FC<{ accent: string }> = ({ accent }) => (
  <>
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #1a1410 0%, #0f1218 55%, #0a0c10 100%)' }} />
    <Glow color={accent} x={540} y={520} r={760} o={0.42} />
    <AbsoluteFill
      style={{
        background: 'repeating-conic-gradient(from 0deg at 50% 38%, rgba(255,214,102,0.07) 0deg 6deg, rgba(255,214,102,0) 6deg 18deg)',
        maskImage: 'radial-gradient(circle at 50% 38%, #000 0%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(circle at 50% 38%, #000 0%, transparent 70%)',
      }}
    />
  </>
);

const Footer: React.FC<{ swipe?: boolean; page?: string }> = ({ swipe, page }) => (
  <div style={{ position: 'absolute', left: 64, right: 64, bottom: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <Wordmark width={250} />
    {swipe ? <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: '0.1em', color: C.goldHi }}>SWIPE &#8594;</div> : null}
    {page ? <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 36, color: C.text2, letterSpacing: '0.08em' }}>{page}</div> : null}
  </div>
);

const CutImg: React.FC<{ c: Cut }> = ({ c }) => (
  <Img
    src={staticFile(c.src)}
    style={{
      position: 'absolute',
      left: c.x,
      top: c.y - c.h,
      height: c.h,
      transform: `translateX(-50%) rotate(${c.rot ?? 0}deg) scaleX(${c.flip ? -1 : 1})`,
      filter: 'drop-shadow(0 22px 26px rgba(0,0,0,0.55))',
      zIndex: c.z ?? 0,
    }}
  />
);

const Cover: React.FC<SlideProps> = (p) => (
  <AbsoluteFill>
    <Backdrop accent={p.accent ?? C.legendary} />
    {(p.cuts ?? []).map((c, i) => (
      <CutImg key={i} c={c} />
    ))}
    <div style={{ position: 'absolute', left: 0, right: 0, top: 88, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'rotate(-3deg)' }}>
      {(p.title ?? []).map((t, i) => (
        <DisplayLine key={i} line={{ text: t, size: i === 0 ? 150 : 128, fill: i === 0 ? 'white' : 'gold', gap: i === 0 ? 0 : 4 }} />
      ))}
    </div>
    {p.subtitle ? (
      <div style={{ position: 'absolute', left: 80, right: 80, top: 418, textAlign: 'center', fontFamily: FONT_TEXT, fontWeight: 700, fontSize: 40, lineHeight: 1.3, color: C.text, textShadow: '0 3px 10px rgba(0,0,0,0.7)' }}>{p.subtitle}</div>
    ) : null}
    <Footer swipe={p.swipe} />
  </AbsoluteFill>
);

const UnitSlide: React.FC<SlideProps> = (p) => {
  const r = RARITY[p.rarity ?? 'legendary'] ?? RARITY.legendary;
  const accent = p.accent ?? r.color;
  return (
    <AbsoluteFill>
      <Backdrop accent={accent} />
      {/* the battle still in a gold frame */}
      <div style={{ position: 'absolute', left: 48, right: 48, top: 48, height: 740, borderRadius: 34, padding: 6, backgroundImage: GOLD_RAMP, boxShadow: '0 26px 50px rgba(0,0,0,0.55)' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 29, overflow: 'hidden', background: '#000' }}>
          {p.still ? <Img src={staticFile(p.still)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${p.focus?.[0] ?? 50}% ${p.focus?.[1] ?? 50}%`, filter: 'contrast(1.05) saturate(1.1)' }} /> : null}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 72%, rgba(10,8,6,0.75) 100%)' }} />
          {/* number and rarity */}
          <div style={{ position: 'absolute', left: 30, top: 24 }}>
            <DisplayLine line={{ text: `#${p.index ?? 1}`, size: 120, fill: 'gold' }} />
          </div>
          <div style={{ position: 'absolute', right: 28, top: 34, padding: 5, borderRadius: 999, backgroundImage: r.ramp, boxShadow: `0 0 34px ${r.color}88, 0 8px 18px rgba(0,0,0,0.5)` }}>
            <div style={{ borderRadius: 999, backgroundColor: '#140e08', backgroundImage: 'linear-gradient(180deg,#2e2216,#120d08)', padding: '10px 30px' }}>
              <span style={{ display: 'inline-block', fontFamily: FONT_DISPLAY, fontWeight: 900, fontStyle: 'italic', fontSize: 42, letterSpacing: '0.1em', backgroundImage: r.ramp, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{r.label}</span>
            </div>
          </div>
        </div>
      </div>
      {/* name, age, stats, line */}
      <div style={{ position: 'absolute', left: 64, right: 64, top: 804 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: '0.14em', color: accent, textTransform: 'uppercase', textShadow: '0 2px 0 rgba(0,0,0,0.6)' }}>{p.age}</div>
        <div style={{ marginLeft: -14, marginTop: -6 }}>
          <DisplayLine line={{ text: p.name ?? '', size: (p.name ?? '').length > 15 ? 104 : 120, fill: 'white', italic: true }} />
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
          {(p.stats ?? []).map((s, i) => (
            <div key={i} style={{ flex: 1, borderRadius: 18, background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,214,102,0.35)', padding: '12px 16px' }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 27, letterSpacing: '0.12em', color: C.text2 }}>{s.label}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontStyle: 'italic', fontSize: 50, color: C.goldHi, lineHeight: 1.05 }}>{s.value}</div>
            </div>
          ))}
        </div>
        {p.desc ? <div style={{ marginTop: 16, fontFamily: FONT_TEXT, fontWeight: 600, fontSize: 32, lineHeight: 1.3, color: C.text }}>{p.desc}</div> : null}
      </div>
      <Footer page={`${p.index}/${p.total}`} />
    </AbsoluteFill>
  );
};

const Cta: React.FC<SlideProps> = (p) => (
  <AbsoluteFill>
    <Backdrop accent={p.accent ?? C.legendary} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'rotate(-3deg)' }}>
      {(p.title ?? []).map((t, i) => (
        <DisplayLine key={i} line={{ text: t, size: i === 0 ? 140 : 120, fill: i === 0 ? 'white' : 'gold', gap: 4 }} />
      ))}
    </div>
    <div style={{ position: 'absolute', left: 40, right: 40, top: 430, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      {(p.picks ?? []).map((k, i) => (
        <div key={i} style={{ width: 196, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ height: 300, display: 'flex', alignItems: 'flex-end' }}>
            <Img src={staticFile(k.src)} style={{ maxWidth: 200, maxHeight: 290, filter: 'drop-shadow(0 14px 16px rgba(0,0,0,0.55))' }} />
          </div>
          <div style={{ marginTop: 10, width: 74, height: 74, borderRadius: 37, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: GOLD_RAMP, fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 52, color: C.ink, boxShadow: '0 8px 18px rgba(0,0,0,0.5)' }}>{i + 1}</div>
          <div style={{ marginTop: 10, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, color: C.text, textAlign: 'center', lineHeight: 1.05, textTransform: 'uppercase' }}>{k.label}</div>
        </div>
      ))}
    </div>
    {p.prompt ? (
      <div style={{ position: 'absolute', left: 90, right: 90, top: 930, textAlign: 'center', fontFamily: FONT_TEXT, fontWeight: 800, fontSize: 46, lineHeight: 1.3, color: C.text }}>
        {p.prompt}
      </div>
    ) : null}
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1105, display: 'flex', justifyContent: 'center' }}>
      <div style={{ padding: 6, borderRadius: 999, backgroundImage: GOLD_RAMP, boxShadow: '0 12px 30px rgba(0,0,0,0.5), 0 0 50px rgba(245,184,46,0.3)' }}>
        <div style={{ borderRadius: 999, background: 'linear-gradient(180deg,#3a2a14,#1a1208)', padding: '16px 40px', fontFamily: FONT_DISPLAY, fontWeight: 900, fontStyle: 'italic', fontSize: 46, letterSpacing: '0.06em', color: C.goldHi }}>SAVE THIS FOR YOUR NEXT DECK</div>
      </div>
    </div>
    <Footer />
  </AbsoluteFill>
);

export const Slide: React.FC<SlideProps> = (p) => {
  if (p.kind === 'cover') return <Cover {...p} />;
  if (p.kind === 'cta') return <Cta {...p} />;
  return <UnitSlide {...p} />;
};
