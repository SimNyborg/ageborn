// Lists the deliverables in out/ with their length, size and format (a Markdown table for REPORT.md).
// `node scripts/inventory.mjs`
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { OUT } from '../lib/config.mjs';
import { probe } from '../lib/render.mjs';

const rows = [];
for (const dir of ['reels', 'carousel', 'stories', 'profile', 'sheets']) {
  let files = [];
  try {
    files = readdirSync(path.join(OUT, dir)).sort();
  } catch {
    continue;
  }
  for (const f of files) {
    const file = path.join(OUT, dir, f);
    const size = statSync(file).size;
    let fmt = '';
    let len = '';
    if (/\.(mp4|png|jpe?g)$/i.test(f)) {
      const p = probe(file);
      const v = p.streams.find((s) => s.codec_type === 'video');
      const a = p.streams.find((s) => s.codec_type === 'audio');
      fmt = v ? `${v.width}x${v.height}${f.endsWith('.mp4') ? ` ${v.codec_name} ${v.profile ?? ''} ${v.pix_fmt} ${v.r_frame_rate}` : ''}` : '';
      if (a) fmt += `, ${a.codec_name} ${a.sample_rate} Hz ${a.channels}ch`;
      if (f.endsWith('.mp4')) len = `${Number(p.format.duration).toFixed(2)} s`;
    }
    rows.push(`| ${dir}/${f} | ${len} | ${(size / 1e6).toFixed(2)} MB | ${fmt.trim()} |`);
  }
}
console.log('| File | Length | Size | Format |\n|---|---|---|---|\n' + rows.join('\n'));
