/**
 * The War Path prop kit (UI art audit #7, art direction §3): every small prop of the map and the Home
 * War Path card, drawn like the battle sheets. Each part is a {@link Cel}: its fill, one hard shadow
 * band on its lower side (fill × 0.74, warm fills shifted toward red), one highlight shape and an
 * outline in the fill's own dark (fill × 0.40, never black), from `components/tone.ts`. Props are
 * 1.6-2x the old scale (trees 28-48 px tall) and trees stand in overlapping clusters ({@link Grove}).
 *
 * Props are drawn about their foot (0, 0), y up negative. Pure functions of the region theme and a
 * variant number, so the map's cached ground layers stay deterministic.
 */
import type { ComponentChildren } from 'preact';
import { ink, light, shade } from '../../components/tone';
import type { RegionTheme } from './regionArt';

let clipN = 0;

/** A cel-shaded part: fill, a clipped shadow band from `band` down (or a custom path), a clipped highlight, its own outline. */
export function Cel(p: { d: string; fill: string; band?: number | string; hi?: string; sw?: number; metal?: boolean; skin?: boolean; class?: string }) {
  const id = `wpc${(clipN = (clipN + 1) % 1e9)}`;
  const band = p.band === undefined ? null : typeof p.band === 'number' ? `M-400 ${p.band}Q0 ${p.band + 2} 400 ${p.band}V600H-400Z` : p.band;
  const clip = band !== null || p.hi !== undefined;
  return (
    <g class={p.class}>
      {clip ? (
        <clipPath id={id}>
          <path d={p.d} />
        </clipPath>
      ) : null}
      <path d={p.d} fill={p.fill} />
      {band ? <path d={band} fill={shade(p.fill, p.metal ? 'metal' : p.skin ? 'skin' : 'matte')} clip-path={`url(#${id})`} /> : null}
      {p.hi ? <path d={p.hi} fill={light(p.fill, p.metal ? 'gloss' : 'matte')} clip-path={`url(#${id})`} /> : null}
      <path d={p.d} fill="none" stroke={ink(p.fill)} stroke-width={p.sw ?? 1.6} stroke-linejoin="round" stroke-linecap="round" />
    </g>
  );
}

/** A soft contact shadow under a prop. */
export function Contact(p: { rx: number; o?: number }) {
  return <ellipse cx="0" cy="0" rx={p.rx} ry={p.rx * 0.3} fill="#000" opacity={p.o ?? 0.26} />;
}

const blob = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

export type KitProp = (t: RegionTheme, v: number) => ComponentChildren;

const BARK = '#6b4a2e';
const STONE = '#9aa0a6';
const WARM_STONE = '#a89880';
const WOOD = '#8e6440';

/** A conifer: three tiers over a tapered trunk (46 tall). */
export const pine: KitProp = (t, v) => {
  const g = v > 0.5 ? t.body : shadeMix(t.body, t.lit);
  const tiers: [number, number, number][] = [
    [-6, 15, 22],
    [-17, 12, 19],
    [-27, 9, 17],
  ];
  return (
    <g>
      <Contact rx={14} />
      <Cel d="M-2.6 0 L-1.9 -9 H1.9 L2.6 0Z" fill={BARK} band="M0 -20H9V4H0Z" sw={1.3} />
      {tiers.map(([y, w, h], i) => (
        <Cel key={i} d={`M0 ${y - h}L${w} ${y}Q0 ${y + 3.4} ${-w} ${y}Z`} fill={g} band={`M0.5 ${y - h - 2}L${w + 3} ${y + 2}V${y + 6}H-${w + 3}V${y - 1.2}Q0 ${y + 2.4} 2 ${y - 2}Z`} hi={`M-1 ${y - h + 3.5}L${-w * 0.62} ${y - 1.8}L${-w * 0.34} ${y - 1.2}Z`} sw={1.5} />
      ))}
    </g>
  );
};

/** A broadleaf tree: a three-blob canopy with a lit crown and a shaded underside (40 tall). */
export const broadleaf: KitProp = (t, v) => {
  const g = v > 0.6 ? shadeMix(t.body, t.lit) : t.body;
  const d = `${blob(0, -26, 12.5)}${blob(-9, -19, 9)}${blob(9.5, -19, 9.5)}${blob(2, -34, 8.5)}`;
  return (
    <g>
      <Contact rx={16} />
      <Cel d="M-3.2 0 Q-2.2 -8 -1.7 -15 H1.7 Q2.2 -8 3.2 0Z" fill={BARK} band="M0.4 -20H9V4H0.4Z" sw={1.3} />
      <path d={d} fill={g} stroke={ink(g)} stroke-width="3.2" stroke-linejoin="round" />
      <path d={d} fill={g} />
      <path d={`${blob(1, -21.5, 11.5)}${blob(-8, -15.5, 7.5)}${blob(10, -15, 8)}`} fill={shade(g)} />
      <path d={`${blob(-0.6, -28.6, 10.8)}${blob(-9.6, -21.6, 7.2)}${blob(8.6, -21.8, 7.4)}${blob(1.4, -35.4, 7.6)}`} fill={g} />
      <path d={`${blob(-4.6, -31.5, 4.2)}${blob(-11, -22.6, 2.6)}`} fill={light(g)} />
    </g>
  );
};

/** A tall cypress (Bronze). */
export const cypress: KitProp = (t) => (
  <g>
    <Contact rx={8} />
    <Cel d="M0 -58 Q9.5 -32 6.4 -2 Q0 1 -6.4 -2 Q-9.5 -32 0 -58Z" fill={t.body} band="M1.5 -60 Q10 -30 7 4 H20 V-60Z" hi="M-1.6 -50 Q-6.2 -30 -4.4 -8 L-3 -8 Q-3.6 -30 -0.6 -50Z" />
  </g>
);

/** A palm (Bronze shore). */
export const palm: KitProp = (t) => (
  <g>
    <Contact rx={12} />
    <Cel d="M-2.4 0 Q-1 -20 3 -40 L6 -40 Q2.4 -20 2.4 0Z" fill="#9a7445" band="M1 -42H9V4H1Z" sw={1.3} />
    {[-150, -110, -60, -20, 25].map((a, i) => (
      <g key={a} transform={`translate(4.5 -40) rotate(${a})`}>
        <Cel d="M0 0 Q9 -6 20 -1 Q11 -1.4 0 2.4Z" fill={i % 2 ? t.body : t.lit} band={0.6} sw={1.3} />
      </g>
    ))}
  </g>
);

/** A shaded boulder with a lit crown. */
export const boulder: KitProp = (_t, v) => {
  const s = v > 0.5 ? STONE : WARM_STONE;
  return (
    <g>
      <Contact rx={15} />
      <Cel d="M-15 0 Q-17 -13 -6 -19 Q8 -23 14 -10 Q17 -2 12 0Z" fill={s} band={-6} hi="M-11 -11 Q-9 -16 -3 -17.5 Q-1 -15 -6 -12Z" />
      <path d="M-2 -12 L3 -7 M6 -15 L8 -10" stroke={shade(s)} stroke-width="1.1" stroke-linecap="round" />
    </g>
  );
};

/** A hide tent with poles and a camp fire glow (Stone). */
export const tent: KitProp = (t) => (
  <g>
    <Contact rx={20} />
    <path d="M-4 -30 L2 -40 M4 -30 L-2 -39" stroke={ink(BARK)} stroke-width="3.2" stroke-linecap="round" />
    <path d="M-4 -30 L2 -40 M4 -30 L-2 -39" stroke={BARK} stroke-width="1.6" stroke-linecap="round" />
    <Cel d="M-19 0 L0 -31 L19 0Z" fill="#a8825a" band="M0 -40 L30 0 V10 H0Z" hi="M-14 -3 L-1.5 -25 L-1 -21 L-10 -3Z" />
    <path d="M-7 -9 L-3 -11 M5 -14 L9 -12" stroke={shade('#a8825a')} stroke-width="1.2" stroke-linecap="round" />
    <Cel d="M-3.6 0 L0 -12 L3.6 0Z" fill="#3a2a1c" sw={1.1} />
    <g transform="translate(25 -1)">
      <path d="M-6 0 L6 -3 M-6 -3 L6 0" stroke={ink(BARK)} stroke-width="2.6" stroke-linecap="round" />
      <path class="wp-flicker" d="M0 -3 Q-4 -8 0 -15 Q4 -8 0 -3Z" fill={t.accent} stroke="#ffd27a" stroke-width="1" />
    </g>
  </g>
);

/** Mammoth bones: ribs and a tusk (Stone). */
export const bones: KitProp = () => (
  <g>
    <Contact rx={17} />
    {[-14, -5, 4, 13].map((x, i) => (
      <g key={x}>
        <path d={`M${x} 0 Q${x - 5} -18 ${x + 3} -${26 - i}`} stroke={ink('#e8dfc8')} stroke-width="5.6" fill="none" stroke-linecap="round" />
        <path d={`M${x} 0 Q${x - 5} -18 ${x + 3} -${26 - i}`} stroke="#e8dfc8" stroke-width="3" fill="none" stroke-linecap="round" />
      </g>
    ))}
    <Cel d="M-9 -2 Q0 -9 9 -2 Q0 2 -9 -2Z" fill="#d8ceb6" band={-2} sw={1.3} />
  </g>
);

/** A fluted column on a plinth (Bronze). */
export const column: KitProp = () => (
  <g>
    <Contact rx={11} />
    <Cel d="M-5.4 -34 H5.4 V-3 H-5.4Z" fill="#e9e1cc" band="M1.6 -40H12V4H1.6Z" hi="M-4.2 -33H-2.2V-4H-4.2Z" sw={1.4} />
    <path d="M-1 -32V-5M2.4 -32V-5" stroke={shade('#e9e1cc')} stroke-width=".9" />
    <Cel d="M-8.4 -39 H8.4 V-34 H-8.4Z" fill="#efe7d2" band={-36} sw={1.4} />
    <Cel d="M-8.4 -3.4 H8.4 V0 H-8.4Z" fill="#c9bea4" band={-1.6} sw={1.4} />
  </g>
);

/** A white house with a red-tile roof (Bronze). */
export const whiteHouse: KitProp = () => (
  <g>
    <Contact rx={20} />
    <Cel d="M-16 -20 H16 V0 H-16Z" fill="#efe6d2" band="M6 -24H30V4H6Z" hi="M-14.6 -18.6H-11V-1.4H-14.6Z" />
    <Cel d="M-18.5 -19 L-15 -26 H15 L18.5 -19Z" fill="#b24e32" band={-21} sw={1.5} />
    <Cel d="M-4 -12 H3 V0 H-4Z" fill="#4a6b8a" band={-6} sw={1.2} />
    <Cel d="M7 -14 H12 V-8 H7Z" fill="#ffd27a" sw={1.1} />
  </g>
);

/** A thatched cottage with timber framing and a chimney (Medieval, Gunpowder). */
export const cottage: KitProp = () => (
  <g>
    <Contact rx={20} />
    <Cel d="M8 -40 H13.5 V-27 H8Z" fill="#7d7468" band="M11 -44H20V-20H11Z" sw={1.3} />
    <Cel d="M-15 -18 H15 V0 H-15Z" fill="#e2d3ae" band="M6 -22H30V4H6Z" />
    <path d="M-15 -11 H15 M-5 -18 V0 M5 -18 V0 M-15 -18 L-5 -11 M5 -11 L15 -18" stroke="#6a4a2e" stroke-width="1.6" />
    <Cel d="M-20 -16.5 L0 -35 L20 -16.5 Q0 -14.5 -20 -16.5Z" fill="#c9a24a" band="M0 -40 L30 -16 V0 H0Z" hi="M-14 -18.5 L-1 -31 L0 -28 L-10 -18.4Z" />
    <path d="M-10 -21 L-6 -24 M4 -27 L8 -24 M-2 -20 L1 -23" stroke={shade('#c9a24a')} stroke-width="1.1" stroke-linecap="round" />
    <Cel d="M-3.4 0 V-7.6 Q0 -10.6 3.4 -7.6 V0Z" fill="#5a3a24" sw={1.2} />
    <Cel d="M8.4 -8.6 H12.6 V-4.6 H8.4Z" fill="#ffd27a" sw={1} />
  </g>
);

/** A haystack. */
export const hay: KitProp = () => (
  <g>
    <Contact rx={13} />
    <Cel d="M-12.5 0 Q-13 -18 0 -21 Q13 -18 12.5 0Z" fill="#d9b55a" band={-7} hi="M-8 -6 Q-8 -15 -1 -17.6 Q-2 -14 -5 -6Z" />
    <path d="M-6 -3 Q-4 -10 0 -14 M5 -4 Q6 -10 4 -15" stroke={shade('#d9b55a')} stroke-width="1.1" fill="none" stroke-linecap="round" />
  </g>
);

/** A windmill with turning sails (Gunpowder). */
export const windmill: KitProp = (t) => (
  <g>
    <Contact rx={15} />
    <Cel d="M-10.5 0 L-6.4 -40 H6.4 L10.5 0Z" fill="#ddd0b4" band="M2 -44 L14 -44 L16 4 H3Z" hi="M-8.6 -2 L-5 -38 H-3 L-6 -2Z" />
    <Cel d="M-3 0 V-9 Q0 -12 3 -9 V0Z" fill="#5a3a24" sw={1.1} />
    <Cel d="M-8.6 -39 L0 -51 L8.6 -39Z" fill={t.roadEdge} band="M0 -54H12V-36H0Z" sw={1.4} />
    <g class="wp-blades" transform="translate(0 -41)">
      <g>
        <path d="M0 0 L3 -26 L9 -26 L2 0Z M0 0 L26 3 L26 9 L0 2Z M0 0 L-3 26 L-9 26 L-2 0Z M0 0 L-26 -3 L-26 -9 L0 -2Z" fill="#f2ead8" stroke={ink('#f2ead8')} stroke-width="1.2" stroke-linejoin="round" />
        <path d="M3 -24 L8 -24 M24 3 L24 8 M-3 24 L-8 24 M-24 -3 L-24 -8" stroke="#b9a98a" stroke-width="1" />
      </g>
    </g>
    <circle cx="0" cy="-41" r="2.2" fill="#5a3a24" />
  </g>
);

/** A field cannon on its carriage (Gunpowder). */
export const cannon: KitProp = () => (
  <g>
    <Contact rx={15} />
    <g transform="rotate(-12 0 -9)">
      <Cel d="M-12 -12 H12 Q15 -9 12 -6 H-12 Q-13 -9 -12 -12Z" fill="#3d3f45" band={-8.4} hi="M-10 -11.4 H8 V-10.4 H-10Z" metal sw={1.4} />
    </g>
    <Cel d="M-10 -1 L-2 -9 L6 -1Z" fill={WOOD} band={-3} sw={1.3} />
    <Cel d={blob(-4, -4, 5)} fill="#7a5433" band={-3} sw={1.3} />
    <circle cx="-4" cy="-4" r="1.6" fill="#3b2a1e" />
  </g>
);

/** Stacked barrels. */
export const barrels: KitProp = () => (
  <g>
    <Contact rx={15} />
    {[
      [-7.5, 0, '#7a5433'],
      [5.5, 0, '#6b4a2c'],
      [-1, -13, '#86603a'],
    ].map(([x, y, c], i) => (
      <g key={i} transform={`translate(${x} ${y})`}>
        <Cel d="M-5.8 0 Q-6.6 -6.5 -5.8 -13 H5.8 Q6.6 -6.5 5.8 0Z" fill={c as string} band="M2 -16H10V4H2Z" hi="M-4.6 -11.6H-3V-1.4H-4.6Z" sw={1.3} />
        <path d="M-6.2 -3.5 H6.2 M-6.2 -9.5 H6.2" stroke="#9aa0a6" stroke-width="1.2" />
      </g>
    ))}
  </g>
);

/** A brick workshop with a smoking chimney (Industrial). */
export const chimney: KitProp = (t) => (
  <g>
    <Contact rx={22} />
    <Cel d="M4 -46 H12 V-14 H4Z" fill="#8a4a3a" band="M8.6 -50H16V-10H8.6Z" sw={1.4} />
    <path d="M4 -40 H12 M4 -33 H12 M4 -26 H12" stroke={shade('#8a4a3a')} stroke-width=".9" />
    <Cel d="M-21 -19 H11 V0 H-21Z" fill="#9a5a44" band="M1 -24H30V4H1Z" hi="M-19.6 -17.6H-16V-1.4H-19.6Z" />
    <path d="M-21 -13 H11 M-21 -7 H11" stroke={shade('#9a5a44')} stroke-width=".9" />
    <Cel d="M-22.6 -18 L-5 -26 L12.6 -18Z" fill="#5d6576" band={-20} sw={1.4} />
    <Cel d="M-15 -11 H-9 V-5 H-15Z" fill="#ffbe6e" sw={1} />
    <Cel d="M-4 -11 H2 V-5 H-4Z" fill="#ffbe6e" sw={1} />
    <g class="wp-smoke" transform="translate(8 -52) scale(.5)">
      {[0, 1, 2].map((i) => (
        <circle key={i} class="wp-smoke__puff" cx="0" cy="0" r={10 + i * 3} fill={t.far1} style={{ animationDelay: `${-i * 1.1}s` }} />
      ))}
    </g>
  </g>
);

/** A gas lamp post with a flickering light. */
export const lamp: KitProp = () => (
  <g>
    <Contact rx={6} />
    <path d="M0 0 V-34 Q0 -39 6 -39" stroke={ink('#4a4d55')} stroke-width="3.6" fill="none" stroke-linecap="round" />
    <path d="M0 0 V-34 Q0 -39 6 -39" stroke="#4a4d55" stroke-width="1.8" fill="none" stroke-linecap="round" />
    <circle cx="7" cy="-35" r="7" fill="#ffd27a" opacity=".22" class="wp-flicker" />
    <Cel d="M4 -38 H10 L9 -32 H5Z" fill="#ffd27a" sw={1.1} />
  </g>
);

/** Stacked crates. */
export const crates: KitProp = () => (
  <g>
    <Contact rx={15} />
    {[
      [-14, -12, '#a87c4a'],
      [-1, -12, '#966a3e'],
      [-8, -24, '#b08450'],
    ].map(([x, y, c], i) => (
      <g key={i}>
        <Cel d={`M${x} ${y} h12 v12 h-12Z`} fill={c as string} band={`M${(x as number) + 6} ${(y as number) - 2}H${(x as number) + 16}V${(y as number) + 14}H${(x as number) + 6}Z`} sw={1.3} />
        <path d={`M${x} ${y} l12 12 M${(x as number) + 12} ${y} l-12 12`} stroke={shade(c as string)} stroke-width="1" />
      </g>
    ))}
  </g>
);

/** A sandbag wall (Modern). */
export const sandbags: KitProp = () => (
  <g>
    <Contact rx={19} />
    {[-12, 0, 12].map((x) => (
      <Cel key={x} d={blob(x, -5, 6.6).replace(/a6.6 6.6/g, 'a6.6 4.8')} fill="#b4a273" band={-4} sw={1.3} />
    ))}
    {[-6, 6].map((x) => (
      <Cel key={x} d={blob(x, -13, 6.6).replace(/a6.6 6.6/g, 'a6.6 4.8')} fill="#c2b07e" band={-12} hi={`M${x - 4} -15.4 Q${x - 1} -17.6 ${x + 2} -16.6 Q${x - 1} -16 ${x - 3} -14.2Z`} sw={1.3} />
    ))}
  </g>
);

/** A radio mast with a blinking light (Modern). */
export const mast: KitProp = () => (
  <g>
    <Contact rx={9} />
    <path d="M-7 0 L0 -54 L7 0 M-5.4 -12 H5.4 M-3.6 -27 H3.6 M-2 -40 H2 M-5.4 -12 L3.6 -27 M5.4 -12 L-3.6 -27" stroke={ink('#7a828c')} stroke-width="3.2" fill="none" stroke-linejoin="round" />
    <path d="M-7 0 L0 -54 L7 0 M-5.4 -12 H5.4 M-3.6 -27 H3.6 M-2 -40 H2 M-5.4 -12 L3.6 -27 M5.4 -12 L-3.6 -27" stroke="#9aa3ad" stroke-width="1.5" fill="none" stroke-linejoin="round" />
    <circle class="wp-blink" cx="0" cy="-56" r="2.6" fill="#ff4a3a" stroke="#6a1a12" stroke-width="1" />
  </g>
);

/** An apartment block with lit windows (Modern). */
export const block: KitProp = (t) => (
  <g>
    <Contact rx={19} />
    <Cel d="M-16 -36 H12 V0 H-16Z" fill={t.body} band="M2 -40H30V4H2Z" hi="M-14.6 -34.6H-11.4V-1.4H-14.6Z" />
    <Cel d="M-17.4 -38.6 H13.4 V-35 H-17.4Z" fill={shade(t.body)} sw={1.2} />
    {[-30, -22, -14].map((y, r) =>
      [-12, -5, 2].map((x, c) => <rect key={`${r}${c}`} x={x} y={y} width="4.4" height="4.4" fill={(r + c) % 3 ? '#f4d28a' : '#3a4048'} stroke={ink(t.body)} stroke-width=".8" />),
    )}
    <Cel d="M-4 0 V-6 H2 V0Z" fill="#3a3028" sw={1} />
  </g>
);

/** An energy pylon with a glowing tip (Future). */
export const pylon: KitProp = (t) => (
  <g>
    <Contact rx={11} />
    <Cel d="M-6.4 0 L-1.6 -44 H1.6 L6.4 0Z" fill={t.body} band="M0.6 -48H12V4H0.6Z" hi="M-4.8 -2 L-1 -40 H-0.2 L-3 -2Z" metal />
    <path d="M-3.4 -10 H3.4 M-2.4 -22 H2.4 M-1.6 -33 H1.6" stroke={t.accent} stroke-width="1.6" opacity=".9" />
    <circle class="wp-twinkle" cx="0" cy="-47" r="4.4" fill={t.accent} stroke={ink(t.accent)} stroke-width="1" />
    <circle cx="0" cy="-47" r="9" fill={t.accent} opacity=".18" />
  </g>
);

/** A glass dome habitat (Future). */
export const dome: KitProp = (t) => (
  <g>
    <Contact rx={22} />
    <Cel d="M-21 0 H21 V-3 H-21Z" fill="#5d6c7c" sw={1.3} />
    <Cel d="M-19 -3 A19 19 0 0 1 19 -3Z" fill={t.body} band="M0 -30 Q14 -20 22 0 H0Z" hi="M-14 -8 A14 14 0 0 1 -2 -19 L-2 -16.6 A11.6 11.6 0 0 0 -11.6 -8Z" metal />
    <path d="M-12 -3 Q-10 -14 0 -22 M12 -3 Q10 -14 0 -22 M-18 -9 H18" stroke={light(t.body, 'gloss')} stroke-width=".9" fill="none" opacity=".7" />
    <Cel d="M-4 -3 V-9 H4 V-3Z" fill={t.accent} sw={1} />
  </g>
);

/** A crystal cluster (Future, Cosmic). */
export const crystal: KitProp = (t, v) => {
  const a = 22 + v * 10;
  const b = 32 + v * 12;
  return (
    <g>
      <Contact rx={13} />
      <Cel d={`M-11 0 L-7 -${a} L-2.4 0Z`} fill={t.lit} band={`M-7 -${a + 4}H0V4H-7Z`} sw={1.3} />
      <Cel d={`M-3.6 0 L1.6 -${b} L7.6 0Z`} fill={t.lit} band={`M1.6 -${b + 4}H12V4H1.6Z`} hi={`M0.4 -${b - 5} L-1.8 -3 L-0.6 -3 L1 -${b - 7}Z`} sw={1.4} />
      <Cel d="M5.6 0 L10 -18 L13.6 0Z" fill={t.lit} band="M10 -22H18V4H10Z" sw={1.2} />
    </g>
  );
};

/** A glowing mushroom (Cosmic). */
export const shroom: KitProp = (t) => (
  <g>
    <Contact rx={11} />
    <Cel d="M-2.4 0 Q-2 -8 -1.8 -14 H1.8 Q2 -8 2.4 0Z" fill="#d8ccf4" band="M0.4 -16H6V4H0.4Z" sw={1.2} />
    <Cel class="wp-twinkle" d="M-12 -12.4 Q0 -30 12 -12.4 Q0 -10 -12 -12.4Z" fill={t.accent} band={-15} hi="M-7 -16 Q-3 -23.6 2 -24.4 Q-2 -21 -4.6 -15.4Z" sw={1.4} />
  </g>
);

/** Mixes a theme body toward its lit colour (tree variety without new hues). */
function shadeMix(a: string, b: string): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * 0.6 + ((pb >> s) & 255) * 0.4);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/**
 * A grove: 5-9 overlapping trees (pines and broadleaves by the region's mix), back ones smaller and
 * higher, drawn back to front, so trees read as woods instead of scattered sticks.
 */
export function Grove(p: { t: RegionTheme; seed: number; n: number; kinds: readonly KitProp[] }) {
  let s = p.seed >>> 0;
  const rnd = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const trees = Array.from({ length: p.n }, (_, i) => {
    const a = (i / p.n) * Math.PI * 2 + rnd() * 0.8;
    const r = 6 + rnd() * 16;
    return { x: Math.cos(a) * r * 1.5, y: Math.sin(a) * r * 0.55, s: 0.8 + rnd() * 0.35, f: p.kinds[Math.floor(rnd() * p.kinds.length)]!, v: rnd() };
  }).sort((a, b) => a.y - b.y);
  return (
    <g>
      <ellipse cx="0" cy="2" rx="34" ry="9" fill="#000" opacity=".16" />
      {trees.map((q, i) => (
        <g key={i} transform={`translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) scale(${(q.s * (0.86 + (q.y + 10) / 80)).toFixed(2)})`}>
          {q.f(p.t, q.v)}
        </g>
      ))}
    </g>
  );
}
