// Display text: a gradient fill over a thick warm outline and a drop shadow (the wordmark's recipe),
// plus the slam-in animation every title uses.
import React from 'react';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT_DISPLAY, RAMPS } from '../theme';

export interface LineSpec {
  text: string;
  /** Font size in px. */
  size?: number;
  /** Ramp name (gold, blue, orange, white, red) or a CSS gradient. */
  fill?: string;
  /** Outline colour and width (px). */
  outline?: string;
  stroke?: number;
  italic?: boolean;
  weight?: number;
  /** Letter spacing in em. */
  track?: number;
  /** Extra gap above this line (px). */
  gap?: number;
}

export function rampOf(fill: string | undefined): string {
  if (!fill) return RAMPS.white;
  return RAMPS[fill] ?? fill;
}

/** One line of display text: outline layer, fill layer and a lit top edge. */
export const DisplayLine: React.FC<{ line: LineSpec; shine?: number; glow?: string }> = ({ line, shine = -1, glow }) => {
  const size = line.size ?? 120;
  const stroke = line.stroke ?? Math.max(6, Math.round(size * 0.11));
  const common: React.CSSProperties = {
    fontFamily: FONT_DISPLAY,
    fontWeight: line.weight ?? 900,
    fontStyle: line.italic === false ? 'normal' : 'italic',
    fontSize: size,
    lineHeight: 0.92,
    letterSpacing: `${line.track ?? 0.01}em`,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    padding: `0 ${Math.round(size * 0.12)}px`,
  };
  const outline = line.outline ?? C.outline;
  return (
    <div style={{ position: 'relative', display: 'inline-block', marginTop: line.gap ?? 0 }}>
      {/* the drop shadow and outline */}
      <div
        style={{
          ...common,
          color: outline,
          WebkitTextStroke: `${stroke}px ${outline}`,
          textShadow: `0 ${Math.round(size * 0.07)}px 0 ${outline}, 0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.18)}px rgba(0,0,0,0.55)${glow ? `, 0 0 ${Math.round(size * 0.45)}px ${glow}` : ''}`,
        }}
      >
        {line.text}
      </div>
      {/* the gradient fill */}
      <div
        style={{
          ...common,
          position: 'absolute',
          inset: 0,
          backgroundImage: rampOf(line.fill),
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {line.text}
      </div>
      {/* a lit top bevel */}
      <div
        style={{
          ...common,
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.0) 34%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          mixBlendMode: 'screen',
        }}
      >
        {line.text}
      </div>
      {/* the shine sweep (0..1 across the line; < 0 = none) */}
      {shine >= 0 && shine <= 1 ? (
        <div
          style={{
            ...common,
            position: 'absolute',
            inset: 0,
            backgroundImage: `linear-gradient(105deg, rgba(255,255,255,0) ${shine * 140 - 30}%, rgba(255,255,255,0.95) ${shine * 140 - 15}%, rgba(255,255,255,0) ${shine * 140}%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {line.text}
        </div>
      ) : null}
    </div>
  );
};

export type SlamStyle = 'slam' | 'pop' | 'rise' | 'type';

/**
 * A title block: lines stacked and centred at (x, y), slammed in at `at` (frames, relative to the
 * Sequence), held, and taken out over the last frames of `dur`.
 */
export const Title: React.FC<{
  lines: LineSpec[];
  dur: number;
  x?: number;
  y: number;
  anim?: SlamStyle;
  /** Stagger between lines (frames). */
  stagger?: number;
  rotate?: number;
  glow?: string;
  align?: 'center' | 'left' | 'right';
  out?: 'fade' | 'zoom' | 'none';
  /** Frames of the entrance already played at the first frame (a reel's first title is visible at once). */
  skip?: number;
}> = ({ lines, dur, x = 540, y, anim = 'slam', stagger = 4, rotate = -3, glow, align = 'center', out = 'zoom', skip = 0 }) => {
  const frame = useCurrentFrame() + skip;
  const { fps } = useVideoConfig();
  const outLen = out === 'none' ? 0 : 7;
  const tOut = interpolate(frame, [dur + skip - outLen, dur + skip], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        width: 1080,
        top: y,
        transform: `translateX(${x - 540}px) translateY(-50%) rotate(${rotate}deg)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
        opacity: out === 'fade' ? 1 - tOut : 1 - tOut * 0.999,
      }}
    >
      {lines.map((line, i) => {
        const f = frame - i * stagger;
        let scale = 1;
        let opacity = 1;
        let dy = 0;
        if (anim === 'slam') {
          const s = spring({ frame: f, fps, config: { damping: 11, stiffness: 260, mass: 0.6 } });
          scale = interpolate(s, [0, 1], [2.3, 1]);
          opacity = interpolate(f, [0, 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        } else if (anim === 'pop') {
          const s = spring({ frame: f, fps, config: { damping: 9, stiffness: 220, mass: 0.5 } });
          scale = interpolate(s, [0, 1], [0.4, 1]);
          opacity = interpolate(f, [0, 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        } else if (anim === 'rise') {
          const s = spring({ frame: f, fps, config: { damping: 16, stiffness: 160 } });
          dy = interpolate(s, [0, 1], [60, 0]);
          opacity = interpolate(f, [0, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        }
        if (out === 'zoom') scale *= 1 + tOut * 0.25;
        // a slow drift while held keeps the frame alive
        scale *= 1 + Math.max(0, f) * 0.0012;
        const shine = interpolate(f, [8, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{ transform: `translateY(${dy}px) scale(${scale})`, opacity, transformOrigin: '50% 60%' }}>
            <DisplayLine line={line} shine={f >= 8 && f <= 22 ? shine : -1} glow={glow} />
          </div>
        );
      })}
    </div>
  );
};

/** A radial white burst behind a slam (expands and fades in ~10 frames). */
export const ImpactBurst: React.FC<{ x?: number; y: number; color?: string; size?: number }> = ({ x = 540, y, color = 'rgba(255,240,200,0.9)', size = 900 }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const r = size * (0.25 + t * 0.75);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - r / 2,
        top: y - r / 2,
        width: r,
        height: r,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, rgba(255,255,255,0) 62%)`,
        opacity: 1 - t,
        mixBlendMode: 'screen',
      }}
    />
  );
};
