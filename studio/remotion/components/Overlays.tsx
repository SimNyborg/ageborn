// Overlays over the gameplay: captions (word-timed, ready for narration), the fighting-game health
// bar, counters, badges, flashes, the vignette and the end card.
import React from 'react';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AGE, AGE_ORDER, C, FONT_DISPLAY, FONT_TEXT, GOLD_RAMP, RARITY } from '../theme';
import { Wordmark } from './Wordmark';
import { DisplayLine, rampOf } from './Text';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export interface Word {
  w: string;
  /** Start (s) from the caption's start. */
  t: number;
}

/**
 * A caption line in the lower safe area. With `words` (from narration timing, e.g. a forced aligner)
 * each word lights up on its time; without, the words pop in one after another.
 */
export const Caption: React.FC<{ text: string; dur: number; words?: Word[]; y?: number; size?: number; accent?: string; pill?: boolean }> = ({
  text,
  dur,
  words,
  y = 1395,
  size = 54,
  accent = C.goldHi,
  pill = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // a "\n" in the text forces a line break (balanced two-line captions, no orphan word)
  const list: Word[] = words ?? text.replace(/\n/g, ' \n ').split(/[ \t]+/).filter(Boolean).map((w, i) => ({ w, t: i * 0.07 }));
  const now = frame / fps;
  const outT = interpolate(frame, [dur - 6, dur], [1, 0], clamp);
  const inT = spring({ frame, fps, config: { damping: 18, stiffness: 200 } });
  const current = words ? list.reduce((k, w, i) => (w.t <= now ? i : k), -1) : -1;
  return (
    <div style={{ position: 'absolute', left: 60, width: 900, top: y, transform: 'translateY(-50%)', display: 'flex', justifyContent: 'center', opacity: outT }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: `0 ${Math.round(size * 0.26)}px`,
          padding: pill ? `${Math.round(size * 0.28)}px ${Math.round(size * 0.5)}px` : 0,
          borderRadius: size * 0.5,
          background: pill ? 'rgba(12, 9, 6, 0.62)' : 'transparent',
          boxShadow: pill ? '0 10px 30px rgba(0,0,0,0.35)' : 'none',
          transform: `scale(${interpolate(inT, [0, 1], [0.92, 1])})`,
          maxWidth: 900,
        }}
      >
        {list.map((w, i) => {
          if (w.w === '\n') return <div key={i} style={{ flexBasis: '100%', height: 0 }} />;
          const f = frame - Math.round(w.t * fps);
          const s = spring({ frame: f, fps, config: { damping: 12, stiffness: 300, mass: 0.5 } });
          const lit = words ? i === current : false;
          return (
            <span
              key={i}
              style={{
                fontFamily: FONT_TEXT,
                fontWeight: 800,
                fontSize: size,
                lineHeight: 1.15,
                color: lit ? accent : C.text,
                textShadow: '0 3px 0 rgba(0,0,0,0.55), 0 0 12px rgba(0,0,0,0.35)',
                opacity: interpolate(f, [0, 2], [0, 1], clamp),
                transform: `translateY(${interpolate(s, [0, 1], [18, 0])}px) scale(${interpolate(s, [0, 1], [0.7, 1])})`,
                display: 'inline-block',
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** A fighting-game health bar: label, a chunky bar in the side's colour with a white damage trail. */
export const HpBar: React.FC<{ label: string; sub?: string; side: 0 | 1; values: number[]; dur: number; y?: number; width?: number }> = ({ label, sub, side, values, dur, y = 300, width = 820 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = values[Math.min(values.length - 1, Math.max(0, frame))] ?? 0;
  // the trail: the highest value of the last 12 frames, easing down
  let trail = v;
  for (let k = 1; k <= 14; k++) trail = Math.max(trail, (values[Math.max(0, frame - k)] ?? v) - k * 0.004);
  // a hit: a drop of at least 0.8% within two frames; the flash lasts four frames
  let hitAge = 99;
  for (let k = 0; k < 6; k++) {
    const a = values[Math.max(0, frame - k)] ?? v;
    const b = values[Math.max(0, frame - k - 2)] ?? a;
    if (b - a > 0.008) {
      hitAge = k;
      break;
    }
  }
  const hit = hitAge < 4;
  const inT = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const outT = interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  const color = side === 0 ? C.blue : C.orange;
  const hi = side === 0 ? C.blueHi : C.orangeHi;
  const shake = hit ? (frame % 2 === 0 ? 4 : -4) * (1 - hitAge / 4) : 0;
  const low = v < 0.2;
  return (
    <div
      style={{
        position: 'absolute',
        left: 60 + (900 - width) / 2,
        top: y,
        width,
        opacity: outT * inT,
        transform: `translateY(${interpolate(inT, [0, 1], [-40, 0])}px) translateX(${shake}px)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontStyle: 'italic', fontSize: 50, color: C.text, textTransform: 'uppercase', textShadow: '0 3px 0 rgba(0,0,0,0.6)' }}>{label}</span>
          {sub ? <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, color: hi, textTransform: 'uppercase', letterSpacing: '0.06em', textShadow: '0 2px 0 rgba(0,0,0,0.6)' }}>{sub}</span> : null}
        </div>
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 58,
            color: low ? '#ff6a5a' : C.text,
            textShadow: '0 3px 0 rgba(0,0,0,0.6)',
            transform: `scale(${hit ? 1 + 0.12 * (1 - hitAge / 4) : 1})`,
            display: 'inline-block',
          }}
        >
          {Math.max(0, Math.round(v * 100))}%
        </span>
      </div>
      <div style={{ position: 'relative', height: 40, borderRadius: 20, background: 'rgba(10,8,6,0.75)', border: '4px solid #1a1206', boxShadow: '0 8px 24px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${trail * 100}%`, background: '#fff6e0', opacity: 0.85 }} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${v * 100}%`,
            background: `linear-gradient(180deg, ${hi} 0%, ${color} 55%, ${side === 0 ? C.blueLo : C.orangeLo} 100%)`,
            boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.45)',
          }}
        />
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v * 100}%`, background: '#fff', opacity: hit ? 0.55 * (1 - hitAge / 4) : 0 }} />
        {/* segment ticks */}
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i + 1) * 10}%`, width: 3, background: 'rgba(0,0,0,0.28)' }} />
        ))}
      </div>
    </div>
  );
};

/** A big number with a label that pops on every change (units left, damage, a timer). */
export const Counter: React.FC<{ label: string; values: number[]; dur: number; x?: number; y?: number; color?: string; prefix?: string; suffix?: string; size?: number }> = ({
  label,
  values,
  dur,
  x = 510,
  y = 520,
  color = 'gold',
  prefix = '',
  suffix = '',
  size = 150,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = values[Math.min(values.length - 1, Math.max(0, frame))] ?? 0;
  let lastChange = 0;
  for (let k = Math.min(frame, values.length - 1); k > 0; k--) {
    if (values[k] !== values[k - 1]) {
      lastChange = k;
      break;
    }
  }
  const pop = spring({ frame: frame - lastChange, fps, config: { damping: 10, stiffness: 400, mass: 0.4 } });
  const inT = spring({ frame, fps, config: { damping: 14, stiffness: 200 } });
  const outT = interpolate(frame, [dur - 7, dur], [1, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: x - 450, width: 900, top: y, transform: `translateY(-50%) scale(${inT})`, opacity: outT, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: '0.12em', color: C.text, textShadow: '0 3px 0 rgba(0,0,0,0.6)' }}>{label}</span>
      <div style={{ transform: `scale(${interpolate(pop, [0, 1], [1.35, 1])})` }}>
        <DisplayLine line={{ text: `${prefix}${v}${suffix}`, size, fill: color }} />
      </div>
    </div>
  );
};

/** A rarity or info badge: a pill with a gradient ring (LEGENDARY, ANTI-ARMOR x3 ...). */
export const Badge: React.FC<{ text: string; dur: number; x?: number; y: number; rarity?: string; color?: string; size?: number; icon?: string }> = ({ text, dur, x = 510, y, rarity, color, size = 44, icon }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 10, stiffness: 260, mass: 0.5 } });
  const outT = interpolate(frame, [dur - 6, dur], [1, 0], clamp);
  const r = rarity ? RARITY[rarity] : null;
  const ring = r ? r.ramp : color ? `linear-gradient(180deg, #fff, ${color})` : GOLD_RAMP;
  return (
    <div style={{ position: 'absolute', left: x - 450, width: 900, top: y, transform: `translateY(-50%) scale(${interpolate(s, [0, 1], [0.3, 1])})`, opacity: outT, display: 'flex', justifyContent: 'center' }}>
      <div style={{ padding: 5, borderRadius: 999, backgroundImage: ring, boxShadow: `0 10px 30px rgba(0,0,0,0.5)${r ? `, 0 0 40px ${r.color}88` : ''}` }}>
        <div style={{ borderRadius: 999, background: 'linear-gradient(180deg,#2a2018,#120d08)', padding: `${Math.round(size * 0.22)}px ${Math.round(size * 0.7)}px`, display: 'flex', alignItems: 'center', gap: 14 }}>
          {icon ? <span style={{ fontSize: size }}>{icon}</span> : null}
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontStyle: 'italic', fontSize: size, letterSpacing: '0.08em', backgroundImage: rampOf(r ? r.ramp : color ? `linear-gradient(180deg,#fff,${color})` : 'gold'), WebkitBackgroundClip: 'text', color: 'transparent' }}>{text}</span>
        </div>
      </div>
    </div>
  );
};

/** A full-frame flash (white or a colour) that fades out over `dur` frames. */
export const Flash: React.FC<{ dur: number; color?: string; peak?: number }> = ({ dur, color = '#fff', peak = 0.85 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 1, dur], [peak, peak, 0], { ...clamp, easing: Easing.out(Easing.quad) });
  return <div style={{ position: 'absolute', inset: 0, background: color, opacity: o, mixBlendMode: 'screen' }} />;
};

/** Darkens the frame's edges and the text bands (top title band and bottom caption band). */
export const Vignette: React.FC<{ top?: number; bottom?: number; edge?: number }> = ({ top = 0.55, bottom = 0.7, edge = 0.45 }) => (
  <>
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 85% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${edge}) 100%)` }} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 760, background: `linear-gradient(180deg, rgba(8,6,4,${top}) 0%, rgba(8,6,4,${top * 0.55}) 45%, rgba(8,6,4,0) 100%)` }} />
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 760, background: `linear-gradient(0deg, rgba(8,6,4,${bottom}) 0%, rgba(8,6,4,${bottom * 0.6}) 40%, rgba(8,6,4,0) 100%)` }} />
  </>
);

/** Thin cinematic bars that slide in (big moments). */
export const Letterbox: React.FC<{ dur: number; size?: number }> = ({ dur, size = 120 }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 8, dur - 8, dur], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: size * t, background: '#000' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: size * t, background: '#000' }} />
    </>
  );
};

/** The closing card: the game's wordmark, a line, and a follow prompt, over the darkened last shot. */
export const EndCard: React.FC<{ dur: number; tagline?: string; cta?: string }> = ({ dur, tagline = 'From clubs to lasers in one battle.', cta = 'FOLLOW FOR MORE BATTLES' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bg = interpolate(frame, [0, 10], [0, 1], clamp);
  const mark = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 200, mass: 0.7 } });
  const line = spring({ frame: frame - 14, fps, config: { damping: 16, stiffness: 180 } });
  const cta2 = spring({ frame: frame - 22, fps, config: { damping: 11, stiffness: 240 } });
  const shine = interpolate(frame, [18, 34], [-0.3, 1.3], clamp);
  const rays = frame * 0.25;
  const outT = interpolate(frame, [dur - 4, dur], [1, 1], clamp);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: outT }}>
      <div style={{ position: 'absolute', inset: 0, backdropFilter: `blur(${bg * 14}px)`, background: `rgba(10,8,6,${bg * 0.62})` }} />
      <div
        style={{
          position: 'absolute',
          left: 510 - 900,
          top: 860 - 900,
          width: 1800,
          height: 1800,
          opacity: bg * 0.55,
          transform: `rotate(${rays}deg)`,
          background: 'repeating-conic-gradient(from 0deg, rgba(255,214,102,0.20) 0deg 7deg, rgba(255,214,102,0) 7deg 22deg)',
          maskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 30%, transparent 62%)',
          WebkitMaskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 30%, transparent 62%)',
        }}
      />
      <div style={{ position: 'absolute', left: 60, width: 900, top: 700, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 860, transform: `scale(${interpolate(mark, [0, 1], [1.8, 1])})`, opacity: interpolate(frame, [4, 8], [0, 1], clamp), filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.6))' }}>
          <Wordmark width={860} shine={shine} />
        </div>
        <div style={{ marginTop: 34, opacity: line, transform: `translateY(${interpolate(line, [0, 1], [30, 0])}px)`, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 64, color: C.text, textShadow: '0 4px 0 rgba(0,0,0,0.6)', textAlign: 'center' }}>{tagline}</div>
        <div
          style={{
            marginTop: 54,
            transform: `scale(${interpolate(cta2, [0, 1], [0.5, 1])})`,
            opacity: interpolate(frame, [22, 26], [0, 1], clamp),
            padding: 6,
            borderRadius: 999,
            backgroundImage: GOLD_RAMP,
            boxShadow: '0 12px 30px rgba(0,0,0,0.5), 0 0 50px rgba(245,184,46,0.35)',
          }}
        >
          <div style={{ borderRadius: 999, background: 'linear-gradient(180deg,#3a2a14,#1a1208)', padding: '18px 44px', fontFamily: FONT_DISPLAY, fontWeight: 900, fontStyle: 'italic', fontSize: 50, letterSpacing: '0.06em', color: C.goldHi }}>{cta}</div>
        </div>
      </div>
    </div>
  );
};

/** The eight ages as a row of medallions: past ones lit, the current one big and glowing. */
export const AgeTrack: React.FC<{ values: number[]; dur: number; y?: number }> = ({ values, dur, y = 300 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cur = values[Math.min(values.length - 1, Math.max(0, frame))] ?? 0;
  let changed = 0;
  for (let k = Math.min(frame, values.length - 1); k > 0; k--) {
    if (values[k] !== values[k - 1]) {
      changed = k;
      break;
    }
  }
  const pop = spring({ frame: frame - changed, fps, config: { damping: 9, stiffness: 300, mass: 0.5 } });
  const inT = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const outT = interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  const gap = 104;
  const x0 = 510 - (gap * 7) / 2;
  return (
    <div style={{ position: 'absolute', left: 0, top: y, width: 1080, height: 120, opacity: inT * outT }}>
      <div style={{ position: 'absolute', left: x0, top: 57, width: gap * 7, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'absolute', left: x0, top: 57, width: gap * cur, height: 6, borderRadius: 3, backgroundImage: GOLD_RAMP }} />
      {AGE_ORDER.map((id, i) => {
        const a = AGE[id];
        const on = i <= cur;
        const now = i === cur;
        const size = now ? 64 * interpolate(pop, [0, 1], [1.45, 1]) : 40;
        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: x0 + i * gap - size / 2,
              top: 60 - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundImage: on ? a.ramp : 'linear-gradient(180deg,#3a3f4a,#1e222a)',
              boxShadow: now ? `0 0 0 4px #1a1206, 0 0 30px ${a.accent}, 0 6px 14px rgba(0,0,0,0.6)` : '0 0 0 3px #1a1206, 0 4px 10px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT_DISPLAY,
              fontWeight: 900,
              fontSize: now ? 34 : 22,
              color: on ? '#1d1405' : '#8a8f99',
            }}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );
};

/** A designed full-frame stage (dark radial light and slow rays) for vote and title screens. */
export const Stage: React.FC<{ dur: number; accent?: string }> = ({ dur, accent = '#f5b82e' }) => {
  const frame = useCurrentFrame();
  const inT = interpolate(frame, [0, 8], [0, 1], clamp);
  const outT = interpolate(frame, [dur - 6, dur], [1, 1], clamp);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: inT * outT }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #1a1410 0%, #0f1218 55%, #0a0c10 100%)' }} />
      <div style={{ position: 'absolute', left: 510 - 900, top: 900 - 900, width: 1800, height: 1800, borderRadius: '50%', background: `radial-gradient(circle, ${accent} 0%, transparent 62%)`, opacity: 0.38 }} />
      <div
        style={{
          position: 'absolute',
          left: 510 - 1000,
          top: 880 - 1000,
          width: 2000,
          height: 2000,
          transform: `rotate(${frame * 0.2}deg)`,
          background: 'repeating-conic-gradient(from 0deg, rgba(255,214,102,0.10) 0deg 6deg, rgba(255,214,102,0) 6deg 18deg)',
          maskImage: 'radial-gradient(circle, #000 0%, transparent 60%)',
          WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 60%)',
        }}
      />
    </div>
  );
};
