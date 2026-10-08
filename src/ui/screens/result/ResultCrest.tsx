/**
 * The Result crests (AUDIT #11), embossed in the art sheet's style: Victory is a gold shield with a
 * laurel and a crown, Defeat a gently torn banner on its pole, a Draw two crossed banners. Each part
 * has its cel shadow band, a highlight on the top edge and a colour-matched outline.
 */
import { useEffect, useState } from 'preact/hooks';
import { Avatar } from '../../components/Avatar';
import type { AvatarSpec } from '@/contracts';

function leaves(side: 1 | -1): string {
  let d = '';
  for (let i = 0; i < 6; i += 1) {
    const a = ((200 + i * 26) * Math.PI) / 180;
    const cx = 60 + side * Math.cos(a) * -40;
    const cy = 64 + Math.sin(a) * -38;
    const rot = (side === 1 ? -1 : 1) * (20 + i * 26);
    const r = (rot * Math.PI) / 180;
    const ux = Math.cos(r);
    const uy = Math.sin(r);
    const p = (s: number, t: number) => `${(cx + ux * s - uy * t).toFixed(1)} ${(cy + uy * s + ux * t).toFixed(1)}`;
    d += `M${p(-8, 0)}Q${p(0, -5)} ${p(8, 0)}Q${p(0, 5)} ${p(-8, 0)}Z`;
  }
  return d;
}

export function ResultCrest(p: { kind: 'win' | 'loss' | 'draw' }) {
  if (p.kind === 'win') {
    return (
      <svg class="result-crest result-crest--win" viewBox="0 0 120 120" aria-hidden="true">
        <path d={leaves(1) + leaves(-1)} fill="#6f9a3e" stroke="#263917" stroke-width="2" stroke-linejoin="round" />
        <path d="M60 22L92 30V60C92 84 78 98 60 106C42 98 28 84 28 60V30Z" fill="#e8b23a" stroke="#5d4717" stroke-width="3.6" stroke-linejoin="round" />
        <path d="M60 22L92 30V60C92 84 78 98 60 106C42 98 28 84 28 60V30ZM60 22L92 30V54C92 78 78 90 60 98C42 90 28 78 28 54V30Z" fill-rule="evenodd" fill="#976526" />
        <path d="M33 33L60 26L87 33" stroke="#f6e0b0" stroke-width="3" fill="none" stroke-linecap="round" />
        <path d="M60 44L65.6 55.4L78 57.2L69 65.8L71.2 78.2L60 72.4L48.8 78.2L51 65.8L42 57.2L54.4 55.4Z" fill="#fff3d6" stroke="#5d4717" stroke-width="2.2" stroke-linejoin="round" />
        <path d="M40 22L44 6L52 14L60 2L68 14L76 6L80 22Z" fill="#ffd76a" stroke="#5d4717" stroke-width="2.8" stroke-linejoin="round" />
        <path d="M42 18H78" stroke="#c9a227" stroke-width="4" />
        <circle cx="60" cy="13" r="2.6" fill="#c0473a" stroke="#5d1a14" stroke-width="1.2" />
      </svg>
    );
  }
  if (p.kind === 'loss') {
    return (
      <svg class="result-crest result-crest--loss" viewBox="0 0 120 120" aria-hidden="true">
        <path d="M30 10V114" stroke="#39281a" stroke-width="7" stroke-linecap="round" />
        <path d="M30 10V114" stroke="#8e6440" stroke-width="3.6" stroke-linecap="round" />
        <circle cx="30" cy="9" r="5" fill="#c9a227" stroke="#5d4717" stroke-width="2" />
        <path d="M33 18H98V70L90 78L94 86L84 92L86 100L74 94L66 102L62 92L52 98L50 88L40 92L33 84Z" fill="#5d6c86" stroke="#1f2533" stroke-width="3.2" stroke-linejoin="round" />
        <path d="M33 70H98L90 78L94 86L84 92L86 100L74 94L66 102L62 92L52 98L50 88L40 92L33 84Z" fill="#46536a" />
        <path d="M37 22H94" stroke="#8a98b0" stroke-width="2.6" stroke-linecap="round" />
        <path d="M66 34L80 38V52C80 62 74 68 66 72C58 68 52 62 52 52V38Z" fill="#c7d0da" stroke="#2a3040" stroke-width="2.4" stroke-linejoin="round" />
        <path d="M67 36L63 48L69 52L64 64" fill="none" stroke="#2a3040" stroke-width="2.2" stroke-linejoin="round" />
      </svg>
    );
  }
  return (
    <svg class="result-crest result-crest--draw" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M22 112L86 14M98 112L34 14" stroke="#39281a" stroke-width="7" stroke-linecap="round" />
      <path d="M22 112L86 14M98 112L34 14" stroke="#8e6440" stroke-width="3.6" stroke-linecap="round" />
      <path d="M84 18L110 28L104 44L80 34Z" fill="#a89880" stroke="#433d33" stroke-width="2.6" stroke-linejoin="round" />
      <path d="M36 18L10 28L16 44L40 34Z" fill="#6b6558" stroke="#2c2a24" stroke-width="2.6" stroke-linejoin="round" />
      <circle cx="60" cy="66" r="22" fill="#e8dfc8" stroke="#5d5950" stroke-width="3" />
      <path d="M60 50V82M48 56H72M48 56L42 68H54ZM72 56L66 68H78Z" fill="#c9a227" stroke="#5d4717" stroke-width="2" stroke-linejoin="round" />
      <path d="M52 82H68" stroke="#5d4717" stroke-width="3" stroke-linecap="round" />
    </svg>
  );
}

/**
 * Your General reacting to the result: neutral, then cheer, determined or wry on the banner's impact.
 * While the victory moment plays (MR-129) your General is on its stage, so this spot waits (its space
 * kept, nothing shown) and pops in when the moment ends.
 */
export function ResultHero(p: { spec: AvatarSpec; kind: 'win' | 'loss' | 'draw'; reduce: boolean; waiting?: boolean }) {
  const mood = p.kind === 'win' ? 'cheer' : p.kind === 'loss' ? 'determined' : 'wry';
  const [on, setOn] = useState(p.reduce);
  useEffect(() => {
    if (p.reduce || p.waiting) return undefined;
    const id = setTimeout(() => setOn(true), 520);
    return () => clearTimeout(id);
  }, []);
  if (p.waiting) {
    return (
      <span class="result__hero is-waiting" aria-hidden="true">
        <Avatar spec={p.spec} size={132} crop="bust" detail="low" />
      </span>
    );
  }
  return (
    <span class="result__hero" data-testid="result-hero">
      <Avatar spec={p.spec} size={132} crop="bust" mood={on ? mood : 'neutral'} pop={on ? 1 : 0} />
    </span>
  );
}
