/**
 * Progress art (AUDIT §2.7), drawn to the art sheet: the War Chest as an iron-bound wooden chest whose
 * front gauge fills with your counting wins, and one glyph per quest stat (evolve, damage, wins...),
 * so the quest rows read at a glance. Home's quest panel (Track A) renders these too
 * (`docs/requests/uiart-b-progress-art.md`).
 */

/** The War Chest: wood with iron bands and a brass lock; the gauge on its front fills to `fillBp`. */
export function WarChestArt(p: { fillBp: number; size?: number; open?: boolean }) {
  const size = p.size ?? 40;
  const k = Math.max(0, Math.min(10000, p.fillBp)) / 10000;
  const w = 32 * k;
  return (
    <svg class="war-chest-art" viewBox="0 0 48 44" width={size} height={(size * 44) / 48} aria-hidden="true">
      <ellipse cx="24" cy="41" rx="20" ry="3" fill="rgb(0 0 0 / .35)" />
      {/* lid */}
      <path d={p.open ? 'M5 16L9 4H39L43 16Z' : 'M5 18C5 9 12 5 24 5C36 5 43 9 43 18Z'} fill="#8e6440" stroke="#39281a" stroke-width="2.4" stroke-linejoin="round" />
      <path d="M9 11C14 8 34 8 39 11" stroke="#b2967d" stroke-width="1.8" fill="none" stroke-linecap="round" />
      {/* body */}
      <path d="M5 18H43V38C43 39.4 42 40 40.6 40H7.4C6 40 5 39.4 5 38Z" fill="#8e6440" stroke="#39281a" stroke-width="2.4" stroke-linejoin="round" />
      <path d="M5 31H43V38C43 39.4 42 40 40.6 40H7.4C6 40 5 39.4 5 38Z" fill="#69422f" />
      <path d="M10 24H38M12 35H20M26 35H36" stroke="#69422f" stroke-width="1.3" stroke-linecap="round" />
      {/* iron bands */}
      <path d="M13 6V40M35 6V40" stroke="#505357" stroke-width="4" />
      <path d="M13 6V40M35 6V40" stroke="#81878e" stroke-width="2" />
      {[10, 22, 34].map((y) => (
        <g key={y}>
          <circle cx="13" cy={y} r="1.2" fill="#c7d0da" />
          <circle cx="35" cy={y} r="1.2" fill="#c7d0da" />
        </g>
      ))}
      {/* the fill gauge */}
      <rect x="8" y="26.5" width="32" height="4" rx="2" fill="#241d36" stroke="#39281a" stroke-width="1" />
      {w > 0 ? <rect x="8" y="26.5" width={w} height="4" rx="2" fill="#e8b23a" /> : null}
      {w > 2 ? <rect x="9" y="27" width={Math.max(0, w - 2)} height="1.2" rx=".6" fill="#f6e0b0" /> : null}
      {/* brass lock */}
      <path d="M20 16H28V23C28 25 26 26 24 26C22 26 20 25 20 23Z" fill="#e8b23a" stroke="#5d4717" stroke-width="1.8" stroke-linejoin="round" />
      <circle cx="24" cy="20" r="1.4" fill="#5d4717" />
      <path d="M24 20.6V23" stroke="#5d4717" stroke-width="1.4" stroke-linecap="round" />
    </svg>
  );
}

/** Quest stat → its glyph. */
const QUEST_GLYPH: Record<string, string> = {
  evolves: 'evolve',
  wins: 'win',
  countingWins: 'win',
  battles: 'battle',
  unitsTrained: 'train',
  baseDamage: 'damage',
  turretKills: 'turret',
  dailyChallengeWins: 'daily',
  upgrades: 'upgrade',
  powerMultiHit: 'power',
  heavyKillsByAA: 'turret',
  fastBaseKill: 'clock',
  fastFinalAge: 'clock',
  winsWithLegendary: 'crown',
  winsAfterLastStand: 'horn',
  winsWithoutTreasury: 'win',
};

const LINE = '#1f1a33';

function glyph(kind: string) {
  switch (kind) {
    case 'evolve':
      return (
        <>
          <path d="M12 3L19 10H15V20H9V10H5Z" fill="#7fd65f" stroke={LINE} stroke-width="1.6" stroke-linejoin="round" />
          <path d="M10.5 11V18" stroke="#c4f0b0" stroke-width="1.4" stroke-linecap="round" />
        </>
      );
    case 'damage':
      return (
        <>
          <path d="M12 3L20 6V12C20 17 16 20 12 21C8 20 4 17 4 12V6Z" fill="#9aa0a6" stroke={LINE} stroke-width="1.6" stroke-linejoin="round" />
          <path d="M13 6L10.5 11.5L13.6 13L10.8 19" fill="none" stroke="#c0473a" stroke-width="2" stroke-linejoin="round" />
        </>
      );
    case 'daily':
      return (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2.4" fill="#f4f1ea" stroke={LINE} stroke-width="1.6" />
          <path d="M4 9.6H20V7.4C20 6 19 5 17.6 5H6.4C5 5 4 6 4 7.4Z" fill="#c0473a" stroke={LINE} stroke-width="1.4" />
          <path d="M8.6 14.6L11 17L15.6 12" fill="none" stroke="#3f8a4a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </>
      );
    case 'train':
      return (
        <>
          <circle cx="9" cy="9" r="3" fill="#efc39a" stroke={LINE} stroke-width="1.4" />
          <path d="M4 20C4 15 6 13 9 13C12 13 14 15 14 20Z" fill="#b83a3a" stroke={LINE} stroke-width="1.4" stroke-linejoin="round" />
          <circle cx="16" cy="8" r="2.6" fill="#efc39a" stroke={LINE} stroke-width="1.3" />
          <path d="M12.4 18C12.6 14 14 12.4 16 12.4C18.4 12.4 20 14 20 18Z" fill="#3f7f46" stroke={LINE} stroke-width="1.3" stroke-linejoin="round" />
        </>
      );
    case 'turret':
      return (
        <>
          <path d="M6 21V11H18V21Z" fill="#9aa0a6" stroke={LINE} stroke-width="1.6" stroke-linejoin="round" />
          <path d="M5 11V6H8V8H10.5V6H13.5V8H16V6H19V11Z" fill="#babec2" stroke={LINE} stroke-width="1.6" stroke-linejoin="round" />
          <path d="M10 21V16C10 14.6 14 14.6 14 16V21" fill="#3a3040" />
        </>
      );
    case 'upgrade':
      return (
        <>
          <path d="M5 19L14 10" stroke="#8e6440" stroke-width="3" stroke-linecap="round" />
          <path d="M11 6L16 3L21 8L18 13Z" fill="#81878e" stroke={LINE} stroke-width="1.6" stroke-linejoin="round" />
          <path d="M14 5L18 9" stroke="#c7d0da" stroke-width="1.2" />
        </>
      );
    case 'power':
      return <path d="M14 2L6 13H11L9 22L18 10H13Z" fill="#ffd76a" stroke={LINE} stroke-width="1.6" stroke-linejoin="round" />;
    case 'clock':
      return (
        <>
          <circle cx="12" cy="13" r="8" fill="#f4f1ea" stroke={LINE} stroke-width="1.6" />
          <path d="M12 8V13L15.6 15" stroke={LINE} stroke-width="1.8" stroke-linecap="round" fill="none" />
          <path d="M9.6 3H14.4" stroke={LINE} stroke-width="2" stroke-linecap="round" />
        </>
      );
    case 'crown':
      return <path d="M4 18L5 7L9.4 11L12 5L14.6 11L19 7L20 18Z" fill="#e8b23a" stroke={LINE} stroke-width="1.6" stroke-linejoin="round" />;
    case 'horn':
      return <path d="M3 15C8 15 13 12 16 5L21 7C19 15 13 20 4 20Z" fill="#efe6d0" stroke={LINE} stroke-width="1.6" stroke-linejoin="round" />;
    case 'battle':
    case 'win':
    default:
      return (
        <>
          <path d="M6 3H18V10C18 14 15 16 12 16C9 16 6 14 6 10Z" fill="#e8b23a" stroke={LINE} stroke-width="1.6" stroke-linejoin="round" />
          <path d="M9 21H15M12 16V21" stroke={LINE} stroke-width="2" stroke-linecap="round" />
          <path d="M8.6 5.4V9" stroke="#f6e0b0" stroke-width="1.4" stroke-linecap="round" />
        </>
      );
  }
}

/** A quest's glyph by its counted stat (24 grid, two tones and an ink outline). */
export function QuestGlyph(p: { stat: string; size?: number }) {
  const size = p.size ?? 24;
  return (
    <svg class="quest-glyph" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {glyph(QUEST_GLYPH[p.stat] ?? 'win')}
    </svg>
  );
}
