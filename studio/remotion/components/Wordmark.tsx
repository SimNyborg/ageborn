// The game's wordmark lockup, inlined so its text uses the loaded Barlow Condensed; `shine` 0..1 sweeps
// the light across the letters as the game's title screen does.
import React from 'react';
import { EMBLEM_SVG, WORDMARK_SVG } from './wordmarkSvg';

export const Wordmark: React.FC<{ width: number; shine?: number }> = ({ width, shine = -1 }) => {
  const x = shine < 0 ? -200 : -60 + shine * 360;
  const html = WORDMARK_SVG.replace('__SHINE__', String(x)).replace('<svg ', `<svg width="${width}" height="${(width * 50) / 255}" `);
  return <div style={{ width, height: (width * 50) / 255, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: html }} />;
};

export const Emblem: React.FC<{ size: number }> = ({ size }) => {
  const html = EMBLEM_SVG.replace('<svg ', `<svg width="${size}" height="${(size * 49) / 46}" `);
  return <div style={{ width: size, height: (size * 49) / 46, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: html }} />;
};
