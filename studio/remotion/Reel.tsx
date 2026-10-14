// A Reel from an edit decision list (EDL, JSON from the edit scripts): video segments of the
// recorded clips, then overlays (titles, captions, health bars, counters, badges, flashes, end card),
// and the mixed audio track. Every reel uses this one composition with its own EDL as input props.
import React from 'react';
import { AbsoluteFill, Audio, Easing, Freeze, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { AgeTrack, Badge, Caption, Counter, EndCard, Flash, HpBar, Letterbox, Stage, Vignette, type Word } from './components/Overlays';
import { ImpactBurst, Title, type LineSpec, type SlamStyle } from './components/Text';
import { C, loadFonts } from './theme';

loadFonts();

export interface Shake {
  /** Frame (relative to the segment) and length. */
  at: number;
  dur: number;
  /** Amplitude in px. */
  amp: number;
}

export interface VideoSeg {
  src: string;
  at: number;
  dur: number;
  /** Source frame shown at `at`. */
  from: number;
  rate?: number;
  layout?: 'full' | 'window' | 'panel' | 'blur' | 'wide';
  /**
   * A landscape (16:9) clip across the vertical frame (layout `wide`): drawn `scale` times the frame's
   * width, the clip point `focus` (0-1 of its width and height) on frame height `y`, its top and bottom
   * edges feathered into a blurred copy of itself behind.
   */
  wide?: { y?: number; scale?: number; feather?: number; focus?: [number, number]; backdrop?: string };
  /** The window's box (layout `window`): top y, width and height in px, centred horizontally. */
  window?: { y: number; w: number; h: number; radius?: number };
  /** A panel (layout `panel`): its box, and the point of the clip it shows (object-position, %). */
  panel?: { x: number; y: number; w: number; h: number; radius?: number; focus?: [number, number]; label?: string };
  /** Scale across the segment (a slow push in or out), and the point it scales about. */
  zoom?: [number, number];
  origin?: [number, number];
  shakes?: Shake[];
  grade?: { contrast?: number; saturate?: number; brightness?: number };
  /** How the segment enters: a white flash, a zoom-in punch, or a whip blur. */
  cutIn?: 'flash' | 'punch' | 'whip' | 'none';
  /** Hold the `from` frame for the whole segment. */
  freeze?: boolean;
  /** Volume of the clip's own audio (the clips are silent; the mix is separate). */
}

export type Overlay =
  | { type: 'title'; at: number; dur: number; lines: LineSpec[]; y: number; x?: number; anim?: SlamStyle; stagger?: number; rotate?: number; glow?: string; out?: 'fade' | 'zoom' | 'none'; burst?: boolean; skip?: number }
  | { type: 'caption'; at: number; dur: number; text: string; words?: Word[]; y?: number; size?: number }
  | { type: 'hpbar'; at: number; dur: number; label: string; sub?: string; side: 0 | 1; values: number[]; y?: number; width?: number }
  | { type: 'counter'; at: number; dur: number; label: string; values: number[]; x?: number; y?: number; color?: string; size?: number; prefix?: string; suffix?: string }
  | { type: 'badge'; at: number; dur: number; text: string; y: number; x?: number; rarity?: string; color?: string; size?: number }
  | { type: 'flash'; at: number; dur: number; color?: string; peak?: number }
  | { type: 'letterbox'; at: number; dur: number; size?: number }
  | { type: 'vignette'; at: number; dur: number; top?: number; bottom?: number; edge?: number }
  | { type: 'endcard'; at: number; dur: number; tagline?: string; cta?: string }
  | { type: 'image'; at: number; dur: number; src: string; x: number; y: number; w?: number; h?: number; anim?: 'pop' | 'rise' | 'none'; shadow?: boolean }
  | { type: 'agetrack'; at: number; dur: number; values: number[]; y?: number }
  | { type: 'stage'; at: number; dur: number; accent?: string };

export interface Edl {
  id: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  bg?: string;
  audio?: { src: string; volume?: number };
  video: VideoSeg[];
  overlays: Overlay[];
  /** A global grade on every segment. */
  grade?: { contrast?: number; saturate?: number; brightness?: number };
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function gradeFilter(g: VideoSeg['grade'] | undefined, base: Edl['grade'] | undefined): string {
  const c = (g?.contrast ?? 1) * (base?.contrast ?? 1.06);
  const s = (g?.saturate ?? 1) * (base?.saturate ?? 1.12);
  const b = (g?.brightness ?? 1) * (base?.brightness ?? 1.02);
  return `contrast(${c}) saturate(${s}) brightness(${b})`;
}

const SegmentVideo: React.FC<{ seg: VideoSeg; style?: React.CSSProperties }> = ({ seg, style }) => {
  const video = <OffthreadVideo src={staticFile(seg.src)} trimBefore={seg.from} playbackRate={seg.rate ?? 1} muted style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />;
  if (seg.freeze) return <Freeze frame={0}>{video}</Freeze>;
  return video;
};

const Segment: React.FC<{ seg: VideoSeg; base?: Edl['grade'] }> = ({ seg, base }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [z0, z1] = seg.zoom ?? [1, 1];
  let scale = interpolate(frame, [0, seg.dur], [z0, z1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  let blur = 0;
  if (seg.cutIn === 'punch') {
    const s = spring({ frame, fps, config: { damping: 14, stiffness: 300 } });
    scale *= interpolate(s, [0, 1], [1.12, 1]);
  } else if (seg.cutIn === 'whip') {
    blur = interpolate(frame, [0, 6], [26, 0], clamp);
    scale *= interpolate(frame, [0, 6], [1.08, 1], clamp);
  }
  let sx = 0;
  let sy = 0;
  for (const sh of seg.shakes ?? []) {
    const k = frame - sh.at;
    if (k >= 0 && k < sh.dur) {
      const fall = 1 - k / sh.dur;
      sx += Math.sin(k * 2.7 + sh.at) * sh.amp * fall;
      sy += Math.cos(k * 3.3 + sh.at * 1.7) * sh.amp * fall * 0.7;
    }
  }
  const [ox, oy] = seg.origin ?? [540, 960];
  const filter = `${gradeFilter(seg.grade, base)}${blur > 0.2 ? ` blur(${blur}px)` : ''}`;
  if (seg.layout === 'blur') {
    return (
      <AbsoluteFill style={{ filter: 'blur(34px) brightness(0.38) saturate(1.3)', transform: 'scale(1.2)' }}>
        <SegmentVideo seg={seg} />
      </AbsoluteFill>
    );
  }
  if (seg.layout === 'panel' && seg.panel) {
    const pn = seg.panel;
    const s = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });
    return (
      <div
        style={{
          position: 'absolute',
          left: pn.x,
          top: pn.y,
          width: pn.w,
          height: pn.h,
          borderRadius: pn.radius ?? 26,
          overflow: 'hidden',
          boxShadow: '0 22px 44px rgba(0,0,0,0.55), 0 0 0 5px rgba(255,214,102,0.9), 0 0 0 9px rgba(42,22,6,0.9)',
          transform: `translate(${sx}px, ${sy + interpolate(s, [0, 1], [60, 0])}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`,
          opacity: Math.min(1, s * 1.4),
          filter,
        }}
      >
        <SegmentVideo seg={seg} style={{ objectPosition: `${pn.focus?.[0] ?? 50}% ${pn.focus?.[1] ?? 50}%`, transform: `scale(${scale})`, transformOrigin: `${pn.focus?.[0] ?? 50}% ${pn.focus?.[1] ?? 50}%` }} />
      </div>
    );
  }
  if (seg.layout === 'wide') {
    const wd = seg.wide ?? {};
    const W = 1080 * (wd.scale ?? 1.8);
    const H = (W * 9) / 16;
    const [fx, fy] = wd.focus ?? [0.5, 0.5];
    const feather = wd.feather ?? 170;
    const mask = `linear-gradient(180deg, transparent 0px, #000 ${feather}px, #000 ${H - feather}px, transparent ${H}px)`;
    return (
      <AbsoluteFill>
        {wd.backdrop ? (
          <AbsoluteFill style={{ background: wd.backdrop }} />
        ) : (
          <AbsoluteFill style={{ filter: `blur(40px) brightness(0.5) saturate(1.25)`, transform: 'scale(1.15)' }}>
            <SegmentVideo seg={seg} />
          </AbsoluteFill>
        )}
        <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${scale})`, transformOrigin: `${ox}px ${oy}px`, filter }}>
          <div style={{ position: 'absolute', left: 540 - fx * W, top: (wd.y ?? 960) - fy * H, width: W, height: H, maskImage: mask, WebkitMaskImage: mask }}>
            <SegmentVideo seg={seg} style={{ objectFit: 'fill' }} />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  if (seg.layout === 'window' && seg.window) {
    const w = seg.window;
    const h = w.h;
    return (
      <AbsoluteFill>
        {/* the same shot, blurred and dark, behind the window */}
        <AbsoluteFill style={{ filter: `blur(38px) brightness(0.42) saturate(1.3)`, transform: 'scale(1.25)' }}>
          <SegmentVideo seg={seg} />
        </AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            left: (1080 - w.w) / 2,
            top: w.y,
            width: w.w,
            height: h,
            borderRadius: w.radius ?? 28,
            overflow: 'hidden',
            boxShadow: '0 30px 60px rgba(0,0,0,0.55), 0 0 0 5px rgba(255,214,102,0.85), 0 0 0 9px rgba(42,22,6,0.9)',
            transform: `translate(${sx}px, ${sy}px) scale(${scale})`,
            filter,
          }}
        >
          <SegmentVideo seg={seg} />
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${scale})`, transformOrigin: `${ox}px ${oy}px`, filter }}>
      <SegmentVideo seg={seg} />
    </AbsoluteFill>
  );
};

const ImageOverlay: React.FC<{ o: Extract<Overlay, { type: 'image' }> }> = ({ o }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = o.anim === 'none' ? 1 : spring({ frame, fps, config: { damping: 12, stiffness: 220 } });
  const outT = interpolate(frame, [o.dur - 6, o.dur], [1, 0], clamp);
  const dy = o.anim === 'rise' ? interpolate(s, [0, 1], [80, 0]) : 0;
  const sc = o.anim === 'pop' ? interpolate(s, [0, 1], [0.5, 1]) : 1;
  // with `h` the image stands on (x, y) (bottom centre); with `w` it hangs from (x, y) (top centre)
  const box: React.CSSProperties = o.h ? { left: o.x, top: o.y - o.h, height: o.h, marginLeft: 0 } : { left: o.x - (o.w ?? 400) / 2, top: o.y, width: o.w ?? 400 };
  return (
    <Img
      src={staticFile(o.src)}
      style={{
        position: 'absolute',
        ...box,
        opacity: outT * (o.anim === 'none' ? 1 : Math.min(1, s * 1.5)),
        transform: `${o.h ? 'translateX(-50%) ' : ''}translateY(${dy}px) scale(${sc})`,
        transformOrigin: '50% 100%',
        filter: o.shadow === false ? 'none' : 'drop-shadow(0 18px 24px rgba(0,0,0,0.55))',
      }}
    />
  );
};

const OverlayView: React.FC<{ o: Overlay }> = ({ o }) => {
  switch (o.type) {
    case 'title':
      return (
        <>
          {o.burst ? <ImpactBurst x={o.x ?? 510} y={o.y} /> : null}
          <Title lines={o.lines} dur={o.dur} y={o.y} x={o.x ?? 510} anim={o.anim} stagger={o.stagger} rotate={o.rotate} glow={o.glow} out={o.out} skip={o.skip} />
        </>
      );
    case 'caption':
      return <Caption text={o.text} dur={o.dur} words={o.words} y={o.y} size={o.size} />;
    case 'hpbar':
      return <HpBar label={o.label} sub={o.sub} side={o.side} values={o.values} dur={o.dur} y={o.y} width={o.width} />;
    case 'counter':
      return <Counter label={o.label} values={o.values} dur={o.dur} x={o.x} y={o.y} color={o.color} size={o.size} prefix={o.prefix} suffix={o.suffix} />;
    case 'badge':
      return <Badge text={o.text} dur={o.dur} y={o.y} x={o.x} rarity={o.rarity} color={o.color} size={o.size} />;
    case 'flash':
      return <Flash dur={o.dur} color={o.color} peak={o.peak} />;
    case 'letterbox':
      return <Letterbox dur={o.dur} size={o.size} />;
    case 'vignette':
      return <Vignette top={o.top} bottom={o.bottom} edge={o.edge} />;
    case 'endcard':
      return <EndCard dur={o.dur} tagline={o.tagline} cta={o.cta} />;
    case 'image':
      return <ImageOverlay o={o} />;
    case 'agetrack':
      return <AgeTrack values={o.values} dur={o.dur} y={o.y} />;
    case 'stage':
      return <Stage dur={o.dur} accent={o.accent} />;
  }
};

export const Reel: React.FC<Edl> = (edl) => {
  return (
    <AbsoluteFill style={{ background: edl.bg ?? C.bg, overflow: 'hidden' }}>
      {edl.video.map((seg, i) => (
        <Sequence key={`v${i}`} from={seg.at} durationInFrames={seg.dur} layout="none">
          <Segment seg={seg} base={edl.grade} />
          {seg.cutIn === 'flash' ? <Flash dur={8} /> : null}
        </Sequence>
      ))}
      {edl.overlays.map((o, i) => (
        <Sequence key={`o${i}`} from={o.at} durationInFrames={o.dur} layout="none">
          <OverlayView o={o} />
        </Sequence>
      ))}
      {edl.audio ? <Audio src={staticFile(edl.audio.src)} volume={edl.audio.volume ?? 1} /> : null}
    </AbsoluteFill>
  );
};
