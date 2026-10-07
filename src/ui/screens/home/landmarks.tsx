/**
 * The Home diorama's two most-seen landmarks, drawn to the art sheet so they sit beside the Blender
 * bases without looking homemade (UI art audit §3.1, §3.4; review fix 2026-10-07): Kingsmoat's keep
 * (Arena 3, where most mid-game players stand) and the Tar Pits volcano (Arena 1, every new player's
 * first Home).
 *
 * Light comes from the upper left like the battle sheets: every part has its own fill, a hard cel
 * shadow on its right side, a highlight sliver near its top, an occlusion gradient over its lower third
 * and an outline in its own dark (`tone.ts`), never black. Masonry is laid in offset courses, windows
 * have stone surrounds and sills, roofs overhang and cast a shadow on the wall under them. Coordinates
 * are the diorama's landmark space (600 × 340, the island's back edge at y 196). Decorative SVG only;
 * the flicker, flag and shimmer classes are the diorama's existing ambient motion (still under reduce
 * motion).
 */
import type { ComponentChildren } from 'preact';
import { ink, light, shade } from '../../components/tone';

let uid = 0;
const nid = (p: string): string => `${p}${(uid = (uid + 1) % 1e9)}`;

const STONE = '#a9afbb';
const STONE_WARM = '#b7ad9c';
const ROOF = '#b8473b';
const WOOD = '#8a5a34';
const BANNER = '#3f7f46';
const GOLD = '#e8b23a';

/** Mortar courses with staggered joints over a box, plus a few lit and shaded blocks for texture. */
function Masonry(p: { x: number; y: number; w: number; h: number; row?: number; brick?: number; color: string; clip: string; seed?: number }) {
  const row = p.row ?? 7;
  const brick = p.brick ?? 12;
  const rows = Math.ceil(p.h / row);
  let d = '';
  const lit: string[] = [];
  const dark: string[] = [];
  for (let r = 0; r < rows; r++) {
    const y = p.y + r * row;
    if (r > 0) d += `M${p.x} ${y}H${p.x + p.w}`;
    const off = r % 2 ? brick / 2 : 0;
    for (let k = 0, x = p.x + off; x < p.x + p.w; k++, x += brick) {
      if (x > p.x) d += `M${x.toFixed(1)} ${y}V${y + row}`;
      const n = (r * 7 + k * 13 + (p.seed ?? 0)) % 11;
      const bx = Math.max(p.x, x) + 0.8;
      const bw = Math.min(brick, p.x + p.w - bx) - 1.6;
      if (bw > 2 && n === 3) lit.push(`M${bx.toFixed(1)} ${y + 0.8}h${bw.toFixed(1)}v${row - 1.6}h${(-bw).toFixed(1)}Z`);
      if (bw > 2 && n === 7) dark.push(`M${bx.toFixed(1)} ${y + 0.8}h${bw.toFixed(1)}v${row - 1.6}h${(-bw).toFixed(1)}Z`);
    }
  }
  return (
    <g clip-path={`url(#${p.clip})`}>
      <path d={lit.join('')} fill={light(p.color)} opacity=".45" />
      <path d={dark.join('')} fill={shade(p.color)} opacity=".5" />
      <path d={d} stroke={shade(p.color)} stroke-width="1" fill="none" opacity=".85" />
      <path d={d.replace(/M([\d.]+) ([\d.]+)H/g, (_, x, y) => `M${x} ${Number(y) + 1}H`)} stroke={light(p.color)} stroke-width=".6" fill="none" opacity=".35" />
    </g>
  );
}

/** Ambient occlusion over the lower third of a part (shared gradient). */
function Occlusion(p: { d: string; grad: string }) {
  return <path d={p.d} fill={`url(#${p.grad})`} />;
}

/** An arched window with a stone surround, a sill, a lit pane and its mullions. */
function ArchWin(p: { x: number; y: number; w: number; h: number; flicker?: boolean; stone: string }) {
  const r = p.w / 2;
  const arch = (x: number, y: number, w: number, h: number) => `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z`;
  const pane = arch(p.x, p.y, p.w, p.h);
  return (
    <g>
      <path d={arch(p.x - 2.2, p.y - 2.2, p.w + 4.4, p.h + 2.2)} fill={light(p.stone)} stroke={ink(p.stone)} stroke-width="1.2" stroke-linejoin="round" />
      <path d={pane} fill="#2a2030" />
      <g class={p.flicker ? 'hd-win' : undefined}>
        <path d={pane} fill="#ffc25e" />
        <path d={`M${p.x} ${p.y + p.h}V${p.y + r}A${r} ${r} 0 0 1 ${p.x + r} ${p.y}V${p.y + p.h}Z`} fill="#fff0bf" opacity=".55" />
      </g>
      <path d={`M${p.x + r} ${p.y + 1}V${p.y + p.h}M${p.x} ${p.y + p.h * 0.58}H${p.x + p.w}`} stroke="#4a3426" stroke-width="1.1" />
      <rect x={p.x - 3} y={p.y + p.h} width={p.w + 6} height="2.6" rx="1" fill={light(p.stone)} stroke={ink(p.stone)} stroke-width="1" />
    </g>
  );
}

/** A row of merlons on top of a parapet: each with its lit top, shaded right side and outline. */
function Merlons(p: { x: number; y: number; w: number; mw?: number; gap?: number; h?: number; color: string }) {
  const mw = p.mw ?? 6;
  const gap = p.gap ?? 4.4;
  const h = p.h ?? 7;
  const out: ComponentChildren[] = [];
  for (let x = p.x; x + mw <= p.x + p.w + 0.01; x += mw + gap) {
    out.push(
      <g key={x}>
        <rect x={x} y={p.y - h} width={mw} height={h} fill={p.color} />
        <rect x={x + mw * 0.62} y={p.y - h} width={mw * 0.38} height={h} fill={shade(p.color)} />
        <rect x={x} y={p.y - h} width={mw} height="1.4" fill={light(p.color)} />
        <rect x={x} y={p.y - h} width={mw} height={h} fill="none" stroke={ink(p.color)} stroke-width="1.2" stroke-linejoin="round" />
      </g>,
    );
  }
  return <g>{out}</g>;
}

/** A round tower: cylinder shading, masonry, an overhanging conical slate roof with a finial and pennant. */
function RoundTower(p: { x: number; w: number; top: number; bottom: number; roofH: number; grad: string; flip?: boolean; flicker?: boolean; pennant: string }) {
  const { x, w, top, bottom } = p;
  const clip = nid('kt');
  const rclip = nid('kr');
  const body = `M${x} ${top}H${x + w}V${bottom}H${x}Z`;
  const ov = w * 0.2;
  const x0 = x - ov;
  const x1 = x + w + ov;
  const cx = x + w / 2;
  const apex = top - p.roofH;
  const roof = `M${x0} ${top + 2}L${cx} ${apex}L${x1} ${top + 2}Q${cx} ${top + 9} ${x0} ${top + 2}Z`;
  const shingles = [0.3, 0.52, 0.72, 0.88].map((t) => {
    const y = apex + (top + 2 - apex) * t;
    const half = ((x1 - x0) / 2) * t;
    return `M${cx - half} ${y}Q${cx} ${y + 5 * t} ${cx + half} ${y}`;
  });
  return (
    <g>
      <clipPath id={clip}>
        <path d={body} />
      </clipPath>
      <path d={body} fill={STONE} />
      <Masonry x={x} y={top} w={w} h={bottom - top} row={7} brick={10} color={STONE} clip={clip} seed={x} />
      <g clip-path={`url(#${clip})`}>
        <rect x={x + w * 0.64} y={top} width={w * 0.36} height={bottom - top} fill={shade(STONE)} opacity=".78" />
        <rect x={x + w * 0.1} y={top} width={w * 0.12} height={bottom - top} fill={light(STONE)} opacity=".55" />
        <Occlusion d={`M${x} ${top + (bottom - top) * 0.5}H${x + w}V${bottom}H${x}Z`} grad={p.grad} />
        {/* the roof's cast shadow under the eave */}
        <path d={`M${x} ${top}H${x + w}V${top + 8}Q${cx} ${top + 12} ${x} ${top + 8}Z`} fill="#1c1830" opacity=".42" />
      </g>
      <path d={body} fill="none" stroke={ink(STONE)} stroke-width="2" stroke-linejoin="round" />
      <ArchWin x={cx - 4.5} y={top + 22} w={9} h={14} flicker={p.flicker} stone={STONE} />
      <path d={`M${cx - 1.4} ${top + 52}h2.8v10h-2.8Z`} fill="#2a2030" stroke={light(STONE)} stroke-width="1" />
      {/* roof */}
      <clipPath id={rclip}>
        <path d={roof} />
      </clipPath>
      <path d={roof} fill={ROOF} />
      <g clip-path={`url(#${rclip})`}>
        {shingles.map((d, i) => (
          <path key={i} d={d} stroke={shade(ROOF)} stroke-width="1.2" fill="none" />
        ))}
        <path d={`M${cx} ${apex - 4}L${x0 + (x1 - x0) * 0.6} ${top + 12}L${x1 + 6} ${top + 12}L${x1 + 6} ${apex - 4}Z`} fill={shade(ROOF)} opacity=".9" />
        <path d={`M${cx} ${apex}L${x0 + (x1 - x0) * 0.18} ${top + 4}L${x0 + (x1 - x0) * 0.3} ${top + 6}Z`} fill={light(ROOF)} opacity=".75" />
        <path d={`M${x0} ${top + 2}Q${cx} ${top + 9} ${x1} ${top + 2}L${x1} ${top + 6}Q${cx} ${top + 13} ${x0} ${top + 6}Z`} fill={ink(ROOF)} opacity=".35" />
      </g>
      <path d={roof} fill="none" stroke={ink(ROOF)} stroke-width="2" stroke-linejoin="round" />
      <circle cx={cx} cy={apex - 1} r="2.4" fill={GOLD} stroke={ink(GOLD)} stroke-width="1" />
      <path d={`M${cx} ${apex - 2}V${apex - 18}`} stroke={ink(WOOD)} stroke-width="2.6" stroke-linecap="round" />
      <path d={`M${cx} ${apex - 2}V${apex - 18}`} stroke={WOOD} stroke-width="1.2" stroke-linecap="round" />
      <path class="hd-flag" d={p.flip ? `M${cx} ${apex - 18}h-13l3 3.5l-3 3.5h13z` : `M${cx} ${apex - 18}h13l-3 3.5l3 3.5h-13z`} fill={p.pennant} stroke={ink(p.pennant)} stroke-width="1" stroke-linejoin="round" />
    </g>
  );
}

/** A hanging banner on the wall (the arena's colours, never a team colour). */
function WallBanner(p: { x: number; y: number }) {
  const d = `M${p.x} ${p.y}h12v22l-6 -4l-6 4Z`;
  return (
    <g>
      <path d={d} fill={BANNER} />
      <path d={`M${p.x + 7.6} ${p.y}h4.4v22l-4.4 -3Z`} fill={shade(BANNER)} />
      <path d={`M${p.x + 2} ${p.y + 6}l4 -3l4 3v6h-8Z`} fill={GOLD} stroke={ink(GOLD)} stroke-width=".8" />
      <path d={d} fill="none" stroke={ink(BANNER)} stroke-width="1.3" stroke-linejoin="round" />
      <rect x={p.x - 1.5} y={p.y - 2} width="15" height="3" rx="1.2" fill={WOOD} stroke={ink(WOOD)} stroke-width="1" />
    </g>
  );
}

/** Kingsmoat: a square keep with battlements behind a crenellated curtain wall, two round towers with
 *  slate cones, a gatehouse with a raised portcullis and a lowered drawbridge, all over a moat. */
export function Keep() {
  const grad = nid('kao');
  const keepClip = nid('kk');
  const wallClip = nid('kw');
  const keep = 'M276 70H324V160H276Z';
  const keepSide = 'M324 70L332 66V160H324Z';
  const wall = 'M240 132H360V199H240Z';
  return (
    <g>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1c1830" stop-opacity="0" />
          <stop offset="1" stop-color="#1c1830" stop-opacity=".42" />
        </linearGradient>
      </defs>
      {/* moat: water with a darker near bank, a lit far edge and shimmer */}
      <path d="M188 201Q300 184 412 201Q300 218 188 201Z" fill="#3f8fc4" stroke={ink('#3f8fc4')} stroke-width="1.8" />
      <path d="M196 203Q300 214 404 203Q300 222 196 203Z" fill={shade('#3f8fc4')} opacity=".8" />
      <path d="M206 197Q300 188 394 197" stroke={light('#3f8fc4', 'gloss')} stroke-width="1.6" fill="none" opacity=".7" />
      <path class="hd-shimmer" d="M222 201 h20 M262 204 h16 M330 200 h24 M372 203 h12" stroke="#e8f7ff" stroke-width="2" stroke-linecap="round" />

      {/* the keep (behind the wall) */}
      <clipPath id={keepClip}>
        <path d={keep} />
      </clipPath>
      <path d={keepSide} fill={shade(STONE)} stroke={ink(STONE)} stroke-width="2" stroke-linejoin="round" />
      <path d={keep} fill={STONE} />
      <Masonry x={276} y={70} w={48} h={90} row={7} brick={12} color={STONE} clip={keepClip} seed={3} />
      <g clip-path={`url(#${keepClip})`}>
        <rect x="277" y="70" width="4" height="90" fill={light(STONE)} opacity=".6" />
        <path d="M276 70H324V80H276Z" fill="#1c1830" opacity=".3" />
        <Occlusion d="M276 112H324V160H276Z" grad={grad} />
      </g>
      <path d={keep} fill="none" stroke={ink(STONE)} stroke-width="2.2" stroke-linejoin="round" />
      {/* corbelled parapet and merlons */}
      <path d="M271 62H329V71H271Z" fill={STONE} stroke={ink(STONE)} stroke-width="1.8" />
      <path d="M271 62H329V64H271Z" fill={light(STONE)} />
      <path d="M329 62L337 58V67L329 71Z" fill={shade(STONE)} stroke={ink(STONE)} stroke-width="1.6" stroke-linejoin="round" />
      {[275, 283, 291, 299, 307, 315, 323].map((x) => (
        <path key={x} d={`M${x - 2.6} 71Q${x} 76 ${x + 2.6} 71Z`} fill={shade(STONE)} stroke={ink(STONE)} stroke-width="1" />
      ))}
      <Merlons x={271.5} y={62} w={57} mw={6.4} gap={4.2} color={STONE} />
      <ArchWin x={293} y={84} w={14} h={20} flicker stone={STONE} />
      <ArchWin x={283} y={112} w={7} h={11} stone={STONE} />
      <ArchWin x={310} y={112} w={7} h={11} stone={STONE} />
      <path d="M300 55V28" stroke={ink(WOOD)} stroke-width="3.6" stroke-linecap="round" />
      <path d="M300 55V28" stroke={WOOD} stroke-width="1.8" stroke-linecap="round" />
      <circle cx="300" cy="27" r="2.2" fill={GOLD} stroke={ink(GOLD)} stroke-width="1" />
      <path class="hd-flag" d="M301 29 h20 l-5 5.5 l5 5.5 h-20 z" fill={GOLD} stroke={ink(GOLD)} stroke-width="1.2" stroke-linejoin="round" />
      <path d="M301 35h18" stroke={shade(GOLD)} stroke-width="1.4" opacity=".7" />

      {/* round towers flanking the wall */}
      <RoundTower x={214} w={34} top={106} bottom={200} roofH={46} grad={grad} flip pennant={BANNER} />
      <RoundTower x={352} w={34} top={106} bottom={200} roofH={46} grad={grad} flicker pennant={BANNER} />

      {/* curtain wall */}
      <clipPath id={wallClip}>
        <path d={wall} />
      </clipPath>
      <path d={wall} fill={STONE_WARM} />
      <Masonry x={240} y={132} w={120} h={67} row={7} brick={13} color={STONE_WARM} clip={wallClip} seed={5} />
      <g clip-path={`url(#${wallClip})`}>
        <rect x="240" y="132" width="120" height="3" fill={light(STONE_WARM)} opacity=".8" />
        <Occlusion d="M240 166H360V199H240Z" grad={grad} />
        {/* shadows the towers cast on the wall's ends */}
        <path d="M248 132h10v67h-10Z" fill="#1c1830" opacity=".18" />
        <path d="M352 132h8v67h-8Z" fill="#1c1830" opacity=".3" />
      </g>
      <path d={wall} fill="none" stroke={ink(STONE_WARM)} stroke-width="2.2" stroke-linejoin="round" />
      <Merlons x={249} y={132} w={102} mw={7} gap={4.6} color={STONE_WARM} />
      <WallBanner x={258} y={140} />
      <WallBanner x={330} y={140} />

      {/* gatehouse arch: voussoirs, the dark passage, a raised portcullis, then the drawbridge */}
      <path d="M282 199V170A18 18 0 0 1 318 170V199Z" fill={light(STONE_WARM)} stroke={ink(STONE_WARM)} stroke-width="1.8" />
      {[-60, -30, 0, 30, 60].map((a) => {
        const r1 = 14.5;
        const r2 = 18;
        const t = ((a - 90) * Math.PI) / 180;
        return <path key={a} d={`M${300 + Math.cos(t) * r1} ${170 + Math.sin(t) * r1}L${300 + Math.cos(t) * r2} ${170 + Math.sin(t) * r2}`} stroke={shade(STONE_WARM)} stroke-width="1.2" />;
      })}
      <path d="M286 199V170A14 14 0 0 1 314 170V199Z" fill="#1d1622" />
      <path d="M288 176V168A12 12 0 0 1 312 168V176" fill="none" stroke="#5a5a64" stroke-width="1.4" />
      <path d="M292 160V178M298 157V178M304 157V178M310 162V178M288 168H312M287 174H313" stroke="#6c6c78" stroke-width="1.6" />
      <path d="M292 178v3M298 178v3M304 178v3M310 178v3" stroke="#6c6c78" stroke-width="1.6" stroke-linecap="round" />
      <path d="M286 199L281 210H319L314 199Z" fill={WOOD} stroke={ink(WOOD)} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M284 203.6H316M283 207H317" stroke={shade(WOOD)} stroke-width="1.1" />
      <path d="M286 199.6H314" stroke={light(WOOD)} stroke-width="1" />
      <path d="M284 170L282 206M316 170L318 206" stroke="#4a4450" stroke-width="1" stroke-dasharray="1.6 1.2" />

      {/* bushes at the wall's foot */}
      {[
        [232, 199, 7],
        [262, 201, 5.5],
        [342, 201, 6],
        [372, 199, 7.5],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <path d={`M${x! - r!} ${y}a${r} ${r} 0 0 1 ${r! * 2} 0Z`} fill="#4f7f34" stroke={ink('#4f7f34')} stroke-width="1.4" />
          <path d={`M${x! - r! * 0.6} ${y! - r! * 0.4}a${r! * 0.4} ${r! * 0.4} 0 0 1 ${r! * 0.7} -${r! * 0.2}`} stroke={light('#4f7f34')} stroke-width="1.4" fill="none" />
        </g>
      ))}
    </g>
  );
}

/** The Tar Pits: a ledged volcano with strata, gullies, a glowing crater and lava runs, smoking. */
export function Volcano(p: { smoke: ComponentChildren }) {
  const clip = nid('vc');
  const grad = nid('vg');
  const rock = '#6e4c42';
  const cone = 'M188 198L238 128Q246 116 256 112L268 98Q276 90 286 94L296 90Q306 86 314 94L326 100Q338 108 344 122L360 146L404 198Z';
  return (
    <g>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a0f0c" stop-opacity="0" />
          <stop offset="1" stop-color="#1a0f0c" stop-opacity=".45" />
        </linearGradient>
      </defs>
      <clipPath id={clip}>
        <path d={cone} />
      </clipPath>
      <path d={cone} fill={rock} />
      <g clip-path={`url(#${clip})`}>
        {/* strata */}
        <path d="M180 150Q240 142 300 148T420 146V160Q360 162 300 160T180 164Z" fill={shade(rock)} opacity=".5" />
        <path d="M180 176Q250 168 300 174T420 172V184Q350 188 300 184T180 188Z" fill={shade(rock)} opacity=".45" />
        <path d="M180 122Q240 116 300 120T420 118V126Q360 130 300 128T180 130Z" fill={light(rock)} opacity=".25" />
        {/* the shadow side and the lit ridge */}
        <path d="M304 84L330 104L352 132L372 160L412 204H300Q310 160 300 120Z" fill={shade(rock)} opacity=".92" />
        <path d="M190 198L240 130Q248 118 258 114L270 100Q262 120 248 136L214 198Z" fill={light(rock)} opacity=".55" />
        {/* gullies */}
        <path d="M236 150L226 176M262 128L250 160L246 190M332 120L346 150L352 186M364 158L378 190" stroke={ink(rock)} stroke-width="1.6" stroke-linecap="round" opacity=".55" fill="none" />
        <path d="M238 151L229 174M264 130L253 159" stroke={light(rock)} stroke-width="1" stroke-linecap="round" opacity=".45" fill="none" />
        <Occlusion d="M180 160H420V204H180Z" grad={grad} />
      </g>
      <path d={cone} fill="none" stroke={ink(rock)} stroke-width="2.4" stroke-linejoin="round" />
      {/* ledges: lit tops and shaded faces */}
      {[
        [216, 168, 22],
        [342, 158, 18],
        [270, 140, 16],
      ].map(([x, y, w], i) => (
        <g key={i}>
          <path d={`M${x} ${y}h${w}l-3 5h${-w! + 6}Z`} fill={shade(rock)} stroke={ink(rock)} stroke-width="1.2" stroke-linejoin="round" />
          <path d={`M${x} ${y}h${w}`} stroke={light(rock)} stroke-width="1.4" />
        </g>
      ))}
      {/* crater: dark rim, glowing throat */}
      <path d="M268 98Q290 88 314 96Q300 104 286 102Q276 102 268 98Z" fill="#3a1c14" stroke={ink(rock)} stroke-width="1.6" />
      <path class="hd-glow" d="M274 98Q292 90 308 96Q296 101 286 100Z" fill="#ff8a2e" />
      <path class="hd-glow" d="M280 97Q292 93 302 96" stroke="#ffe08a" stroke-width="1.6" fill="none" stroke-linecap="round" />
      {/* lava runs: a soft glow, the flow and its hot core */}
      {[
        'M288 100Q294 120 284 140Q278 156 286 176',
        'M300 100Q310 118 318 132Q326 146 322 160',
      ].map((d, i) => (
        <g key={i} class="hd-glow">
          <path d={d} stroke="#ff6a1a" stroke-width="9" stroke-linecap="round" fill="none" opacity=".25" />
          <path d={d} stroke="#ff7a22" stroke-width="4.6" stroke-linecap="round" fill="none" />
          <path d={d} stroke="#ffd36a" stroke-width="1.6" stroke-linecap="round" fill="none" />
        </g>
      ))}
      <ellipse class="hd-glow" cx="288" cy="182" rx="10" ry="3" fill="#ff8a2e" opacity=".7" />
      {/* boulders at the foot */}
      {[
        [204, 196, 7],
        [384, 196, 8],
        [362, 199, 5],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <path d={`M${x! - r!} ${y}Q${x! - r!} ${y! - r! * 1.2} ${x} ${y! - r! * 1.1}Q${x! + r!} ${y! - r! * 1.1} ${x! + r!} ${y}Z`} fill={light(rock)} stroke={ink(rock)} stroke-width="1.4" />
          <path d={`M${x} ${y! - r! * 1.1}Q${x! + r!} ${y! - r! * 1.1} ${x! + r!} ${y}H${x! + r! * 0.1}Z`} fill={shade(rock)} opacity=".8" />
        </g>
      ))}
      {p.smoke}
    </g>
  );
}
