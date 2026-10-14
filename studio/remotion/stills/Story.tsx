// Story frames (1080x1920; a still or a short loop): a "this or that" poll with room for the poll
// sticker, and a teaser that sends viewers to a new Reel. Text stays inside the Story safe area (about
// 270 px free at the top for the progress bar and profile row, 340 px at the bottom for the reply bar).
import React from 'react';
import { AbsoluteFill, Img, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { DisplayLine } from '../components/Text';
import { C, FONT_DISPLAY, FONT_TEXT, GOLD_RAMP, loadFonts } from '../theme';

loadFonts();

export interface StoryHalf {
  label: string;
  fill: string;
  still?: string;
  video?: string;
  from?: number;
  focus?: [number, number];
}

export interface StoryProps {
  kind: 'poll' | 'teaser';
  durationInFrames?: number;
  top?: StoryHalf;
  bottom?: StoryHalf;
  question?: string;
  /** teaser */
  video?: string;
  from?: number;
  lines?: string[];
  badge?: string;
  cta?: string;
}

const Media: React.FC<{ h: StoryHalf; height: number }> = ({ h, height }) => {
  const style: React.CSSProperties = { width: '100%', height, objectFit: 'cover', objectPosition: `${h.focus?.[0] ?? 50}% ${h.focus?.[1] ?? 50}%`, filter: 'contrast(1.06) saturate(1.12)' };
  if (h.video) return <OffthreadVideo src={staticFile(h.video)} trimBefore={h.from ?? 0} muted style={style} />;
  if (h.still) return <Img src={staticFile(h.still)} style={style} />;
  return <div style={{ ...style, background: '#222' }} />;
};

const Poll: React.FC<StoryProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const s2 = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 200 } });
  const vs = spring({ frame: frame - 12, fps, config: { damping: 9, stiffness: 260, mass: 0.6 } });
  const top = p.top as StoryHalf;
  const bottom = p.bottom as StoryHalf;
  return (
    <AbsoluteFill style={{ background: '#0b0d12' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 960, overflow: 'hidden' }}>
        <Media h={top} height={960} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.55) 100%)' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 960, height: 960, overflow: 'hidden' }}>
        <Media h={bottom} height={960} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.45) 100%)' }} />
      </div>
      {/* the seam */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 952, height: 16, backgroundImage: GOLD_RAMP, boxShadow: '0 0 30px rgba(245,184,46,0.6)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 390, display: 'flex', justifyContent: 'center', transform: `scale(${s1}) rotate(-3deg)` }}>
        <DisplayLine line={{ text: top.label, size: 150, fill: top.fill }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1360, display: 'flex', justifyContent: 'center', transform: `scale(${s2}) rotate(-3deg)` }}>
        <DisplayLine line={{ text: bottom.label, size: 150, fill: bottom.fill }} />
      </div>
      <div style={{ position: 'absolute', left: 540 - 110, top: 960 - 110, width: 220, height: 220, borderRadius: 110, backgroundImage: GOLD_RAMP, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${vs})`, boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
        <div style={{ width: 196, height: 196, borderRadius: 98, background: 'linear-gradient(180deg,#3a2a14,#140d06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DisplayLine line={{ text: 'VS', size: 110, fill: 'gold' }} />
        </div>
      </div>
      {p.question ? (
        <div style={{ position: 'absolute', left: 80, right: 80, top: 280, textAlign: 'center', fontFamily: FONT_TEXT, fontWeight: 800, fontSize: 52, color: C.text, textShadow: '0 4px 14px rgba(0,0,0,0.8)', opacity: interpolate(frame, [10, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          {p.question}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Teaser: React.FC<StoryProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const badge = spring({ frame, fps, config: { damping: 10, stiffness: 240 } });
  return (
    <AbsoluteFill style={{ background: '#0b0d12' }}>
      {p.video ? <OffthreadVideo src={staticFile(p.video)} trimBefore={p.from ?? 0} muted style={{ width: 1080, height: 1920, objectFit: 'cover', filter: 'contrast(1.06) saturate(1.12)' }} /> : null}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(8,6,4,0.65) 0%, rgba(8,6,4,0.1) 40%, rgba(8,6,4,0.1) 60%, rgba(8,6,4,0.75) 100%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 260, display: 'flex', justifyContent: 'center', transform: `scale(${badge})` }}>
        <div style={{ padding: 6, borderRadius: 999, backgroundImage: GOLD_RAMP }}>
          <div style={{ borderRadius: 999, background: '#160f08', padding: '12px 36px', fontFamily: FONT_DISPLAY, fontWeight: 900, fontStyle: 'italic', fontSize: 50, letterSpacing: '0.1em', color: C.goldHi }}>{p.badge ?? 'NEW REEL'}</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'rotate(-3deg)' }}>
        {(p.lines ?? []).map((t, i) => (
          <DisplayLine key={i} line={{ text: t, size: i === 1 ? 90 : 140, fill: i === 0 ? 'blue' : i === 1 ? 'white' : 'orange', gap: 4 }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 370, display: 'flex', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT_TEXT, fontWeight: 800, fontSize: 50, color: C.text, textShadow: '0 4px 14px rgba(0,0,0,0.8)', transform: `translateY(${Math.sin(frame / 6) * 8}px)` }}>{p.cta ?? 'Who wins? Tap to watch'}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Story: React.FC<StoryProps> = (p) => (p.kind === 'poll' ? <Poll {...p} /> : <Teaser {...p} />);
