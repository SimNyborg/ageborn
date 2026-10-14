// Try: render a short test EDL with the clash clip and every overlay kind.
import { finalEncode, renderReelVideo } from '../lib/render.mjs';
const hp = Array.from({ length: 150 }, (_, i) => Math.max(0.05, 1 - i * 0.006));
const edl = {
  id: 'try', fps: 30, width: 1080, height: 1920, durationInFrames: 150, bg: '#2a2118',
  video: [{ src: 'clips/try/clash.mp4', at: 0, dur: 150, from: 0, zoom: [1, 1.06], shakes: [{ at: 20, dur: 12, amp: 14 }] }],
  overlays: [
    { type: 'vignette', at: 0, dur: 150 },
    { type: 'title', at: 0, dur: 60, y: 420, burst: true, lines: [{ text: '40 CAVEMEN', size: 150, fill: 'blue' }, { text: 'VS', size: 90, fill: 'white', gap: 6 }, { text: '1 COSMIC TANK', size: 150, fill: 'orange', gap: 6 }] },
    { type: 'hpbar', at: 60, dur: 90, label: 'Hover Tank', sub: 'Cosmic Age', side: 1, values: hp, y: 290 },
    { type: 'caption', at: 64, dur: 80, text: 'Who wins? Comment your guess', y: 1400 },
    { type: 'badge', at: 70, dur: 60, text: 'LEGENDARY', rarity: 'legendary', y: 600 },
    { type: 'endcard', at: 110, dur: 40 },
  ],
};
const v = await renderReelVideo(edl, process.argv[2] + '/try.video.mp4', { concurrency: 3 });
finalEncode(v, null, process.argv[2] + '/try.mp4');
console.log('ok');
