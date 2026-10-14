// Renders the stills: the carousel slides (1080x1350 PNG), the Story frames (1080x1920 PNG and a 5 s
// MP4) and the profile picture proposals (1080x1080 PNG). `node scripts/stills.mjs [carousel|story|profile]`
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ASSETS, OUT, WORK } from '../lib/config.mjs';
import { finalEncode, renderStillPng, renderVideo } from '../lib/render.mjs';

const game = JSON.parse(readFileSync(path.join(ASSETS, 'game.json'), 'utf8'));
const which = process.argv[2] ?? 'all';
const AGE_ACCENT = { stone: '#C98A3D', bronze: '#B8863B', medieval: '#8ea3c4', gunpowder: '#d9452f', industrial: '#B06A3B', modern: '#8a9a4a', future: '#29c9f5', cosmic: '#a55cf0' };

/** The five Legendaries of the "Rank the legends" carousel, with the still each slide uses. */
const LEGENDS = [
  { unit: 'mammoth_matriarch', still: 'stills/mammoth-slide-4.png', special: 'SPLASH', line: 'Tramples groups with splash damage while two riders sling rocks at ground and air.' },
  { unit: 'hydra', still: 'stills/hydra-slide-4.png', special: '3 HEADS', line: 'Three heads bite three enemies in turn, and its venom slows them.' },
  { unit: 'ursa_paladin', still: 'stills/paladin-slide-4.png', special: 'ROAR', line: 'Cleaves two enemies at once, and its roar shields the allies around it.' },
  { unit: 'behemoth_tank', still: 'stills/behemoth-slide-5.png', special: 'LONG GUN', line: 'Its main gun deals splash damage at long range; a machine gun covers the sky.' },
  { unit: 'star_leviathan', still: 'stills/leviathan-slide-4.png', special: 'SONG x5', line: 'A void beast whose song hits its target and four enemies behind it.' },
];

export function carouselSlides(overrides = {}) {
  const fmt = (n) => n.toLocaleString('en-US');
  const slides = [];
  slides.push({
    kind: 'cover',
    accent: '#f5b82e',
    title: ['Rank the', 'legends'],
    subtitle: '5 Legendaries from 5 ages. Which one is the strongest?',
    swipe: true,
    // facing the middle: the left ones as drawn, the right ones mirrored
    cuts: [
      { src: 'art/cut/mammoth_matriarch-attack.png', x: 225, y: 1060, h: 360, z: 1 },
      { src: 'art/cut/star_leviathan-attack.png', x: 820, y: 1020, h: 250, z: 1, flip: true },
      { src: 'art/cut/ursa_paladin-attack.png', x: 545, y: 1150, h: 470, z: 3 },
      { src: 'art/cut/hydra-attack.png', x: 300, y: 1235, h: 270, z: 2 },
      { src: 'art/cut/behemoth_tank-attack.png', x: 790, y: 1240, h: 240, z: 2, flip: true },
    ],
  });
  LEGENDS.forEach((l, i) => {
    const u = game.units[l.unit];
    const atk = u.attacks[0];
    slides.push({
      kind: 'unit',
      index: i + 1,
      total: LEGENDS.length,
      name: u.name,
      age: game.ages[u.age].name.split(':')[0],
      rarity: u.rarity,
      accent: AGE_ACCENT[u.age],
      still: overrides[l.unit] ?? l.still,
      focus: [50, 62],
      stats: [
        { label: 'HP', value: fmt(u.hp) },
        { label: 'DAMAGE', value: String(atk.damage) },
        { label: 'SPECIAL', value: l.special },
      ],
      desc: l.line,
    });
  });
  slides.push({
    kind: 'cta',
    accent: '#f5b82e',
    title: ['Your', 'ranking?'],
    picks: LEGENDS.map((l) => ({ src: `art/cut/${l.unit}-attack.png`, label: game.units[l.unit].name })),
    prompt: 'Comment from strongest to weakest, like 3 > 1 > 5 > 2 > 4',
  });
  return slides;
}

async function carousel() {
  const slides = carouselSlides();
  for (const [i, s] of slides.entries()) {
    const file = path.join(OUT, 'carousel', `rank-the-legends-${String(i + 1).padStart(2, '0')}.png`);
    await renderStillPng('Slide', s, file);
    console.log('slide', file);
  }
}

async function story() {
  const poll = {
    kind: 'poll',
    durationInFrames: 150,
    question: 'Which age would you play?',
    top: { label: 'Stone Age', fill: 'linear-gradient(180deg,#fff1d6 0%,#f0c27a 40%,#c98a3d 70%,#7a4a1c 100%)', still: 'stills/mammoth-story-4.png', focus: [50, 70] },
    bottom: { label: 'Cosmic Age', fill: 'linear-gradient(180deg,#f8eaff 0%,#d9a8ff 38%,#a55cf0 66%,#4a1a80 100%)', still: 'stills/leviathan-story-4.png', focus: [50, 70] },
  };
  await renderStillPng('Story', poll, path.join(OUT, 'stories', 'poll-stone-or-cosmic.png'), 40);
  const teaser = { kind: 'teaser', durationInFrames: 150, video: 'clips/r1/a.mp4', from: 84, lines: ['40 cavemen', 'vs', '1 cosmic tank'], badge: 'NEW REEL', cta: 'Who wins? Tap to watch' };
  await renderStillPng('Story', teaser, path.join(OUT, 'stories', 'teaser-40-cavemen.png'), 40);
  const v = await renderVideo('Story', teaser, path.join(WORK, 'stories', 'teaser-40-cavemen.video.mp4'));
  finalEncode(v, null, path.join(OUT, 'stories', 'teaser-40-cavemen.mp4'));
  console.log('stories done');
}

async function profile() {
  await renderStillPng('Profile', { variant: 'emblem' }, path.join(OUT, 'profile', 'profile-a-emblem-blue.png'));
  await renderStillPng('Profile', { variant: 'emblem-night' }, path.join(OUT, 'profile', 'profile-b-emblem-night.png'));
  await renderStillPng('Profile', { variant: 'hero', src: 'art/cut/ursa_paladin-idle.png', heroH: 860, heroX: 560, heroY: 1010 }, path.join(OUT, 'profile', 'profile-c-bear-knight.png'));
  console.log('profile done');
}

if (which === 'all' || which === 'carousel') await carousel();
if (which === 'all' || which === 'story') await story();
if (which === 'all' || which === 'profile') await profile();
