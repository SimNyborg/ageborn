// Profile picture proposals (1080x1080, shown as a circle down to 110 px): the game's emblem, or a hero
// unit, on a bold radial background. No small text: it must read at thumbnail size.
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { Emblem } from '../components/Wordmark';
import { loadFonts } from '../theme';

loadFonts();

export interface ProfileProps {
  variant: 'emblem' | 'emblem-night' | 'hero';
  /** hero: a cut-out under public/ and its placement. */
  src?: string;
  heroH?: number;
  heroX?: number;
  heroY?: number;
}

const Rays: React.FC<{ color: string; o: number }> = ({ color, o }) => (
  <AbsoluteFill
    style={{
      background: `repeating-conic-gradient(from 8deg at 50% 50%, ${color} 0deg 9deg, transparent 9deg 24deg)`,
      opacity: o,
      maskImage: 'radial-gradient(circle at 50% 50%, #000 0%, rgba(0,0,0,0.4) 42%, transparent 68%)',
      WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 0%, rgba(0,0,0,0.4) 42%, transparent 68%)',
    }}
  />
);

export const Profile: React.FC<ProfileProps> = (p) => {
  if (p.variant === 'hero') {
    return (
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 42%, #3b7bd6 0%, #1d3f7a 38%, #0c1630 72%, #070b16 100%)' }}>
        <Rays color="rgba(255,214,102,0.20)" o={1} />
        <div style={{ position: 'absolute', left: 90, top: 90, width: 900, height: 900, borderRadius: '50%', boxShadow: 'inset 0 0 0 14px rgba(255,214,102,0.9), inset 0 0 0 26px rgba(42,22,6,0.85)' }} />
        {p.src ? (
          <Img
            src={staticFile(p.src)}
            style={{ position: 'absolute', left: p.heroX ?? 540, top: (p.heroY ?? 1000) - (p.heroH ?? 900), height: p.heroH ?? 900, transform: 'translateX(-50%)', filter: 'drop-shadow(0 26px 30px rgba(0,0,0,0.6))' }}
          />
        ) : null}
      </AbsoluteFill>
    );
  }
  const night = p.variant === 'emblem-night';
  return (
    <AbsoluteFill
      style={{
        background: night
          ? 'radial-gradient(circle at 50% 46%, #2c2a52 0%, #15142c 45%, #08080f 100%)'
          : 'radial-gradient(circle at 50% 44%, #5aa0ff 0%, #2f7df6 24%, #1a4fb0 52%, #0b2152 80%, #071430 100%)',
      }}
    >
      <Rays color={night ? 'rgba(160,150,255,0.18)' : 'rgba(255,224,150,0.30)'} o={1} />
      <div style={{ position: 'absolute', left: 540 - 380, top: 540 - 380, width: 760, height: 760, borderRadius: '50%', background: night ? 'radial-gradient(circle, rgba(255,214,102,0.32) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(255,236,170,0.55) 0%, transparent 68%)' }} />
      <div style={{ position: 'absolute', left: 540 - 430, top: 540 - 452, filter: 'drop-shadow(0 30px 36px rgba(0,0,0,0.6))' }}>
        <Emblem size={860} />
      </div>
    </AbsoluteFill>
  );
};
