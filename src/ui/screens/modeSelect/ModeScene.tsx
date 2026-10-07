/**
 * Small scenes behind the Choose-a-battle headers (AUDIT §2.10): two layers of rolling hills in the
 * card's own tone (darkened, lit on the upper edge) and one silhouette per mode, so each card reads as
 * a place: banners on a field (Quick Battle), a summit with a flag (Ladder), a castle (Conquest), a
 * training yard (Skirmish) and a sunrise (Daily Challenge).
 */
const SIL = 'rgb(0 0 0 / .26)';

function prop(id: string) {
  switch (id) {
    case 'ladder':
      return (
        <>
          <path d="M120 74L150 40L170 58L184 46L210 74Z" fill="rgb(0 0 0 / .18)" />
          <path d="M150 40V24" stroke={SIL} stroke-width="2.4" />
          <path d="M150 24L162 28L150 32Z" fill="rgb(255 255 255 / .55)" />
        </>
      );
    case 'conquest':
      return <path d="M138 74V52H144V46H149V52H154V46H159V52H164V40L170 34L176 40V52H182V46H187V52H192V74Z" fill={SIL} />;
    case 'skirmish':
      return (
        <>
          <path d="M20 66H90M24 60V70M40 60V70M56 60V70M72 60V70M88 60V70" stroke={SIL} stroke-width="2.6" />
          <path d="M160 70V50M152 56H168" stroke={SIL} stroke-width="3" />
          <circle cx="160" cy="45" r="5" fill={SIL} />
        </>
      );
    case 'daily':
      return (
        <>
          <circle cx="160" cy="66" r="18" fill="rgb(255 246 200 / .45)" />
          <path d="M160 40V32M138 50L132 45M182 50L188 45" stroke="rgb(255 246 200 / .5)" stroke-width="2.6" stroke-linecap="round" />
        </>
      );
    case 'quick':
    default:
      return (
        <>
          <path d="M30 70V46M180 70V42" stroke={SIL} stroke-width="2.4" />
          <path d="M30 46L44 50L30 55Z" fill="rgb(255 255 255 / .45)" />
          <path d="M180 42L166 46L180 51Z" fill="rgb(255 255 255 / .45)" />
        </>
      );
  }
}

export function ModeScene(p: { id: string }) {
  return (
    <svg class="mode-card__scene" viewBox="0 0 210 80" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d="M0 62C30 50 60 48 92 56C124 64 160 50 210 54V80H0Z" fill="rgb(0 0 0 / .14)" />
      {prop(p.id)}
      <path d="M0 70C40 62 80 66 110 70C150 76 180 66 210 68V80H0Z" fill="rgb(0 0 0 / .24)" />
      <path d="M0 70C40 62 80 66 110 70C150 76 180 66 210 68" fill="none" stroke="rgb(255 255 255 / .28)" stroke-width="1.6" />
    </svg>
  );
}
