/**
 * An arena gate on the Trophy Road (AUDIT §2.7): a small stone gatehouse in the art sheet's style, two
 * crenellated towers and an arch whose portcullis is down until the gate opens, with the arena's own
 * banner hanging from the keystone.
 */
import { BannerArt } from '../../components/avatar/ProfileArt';

export function GateArch(p: { banner: string | null; open: boolean }) {
  const stone = '#9aa0a6';
  const shadow = '#72767b';
  const line = '#3e4042';
  return (
    <span class={`road-arch${p.open ? ' is-open' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 220 74" class="road-arch__svg">
        {/* towers */}
        {[18, 202].map((cx) => (
          <g key={cx}>
            <path d={`M${cx - 16} 74V20H${cx - 12}V12H${cx - 5}V20H${cx + 5}V12H${cx + 12}V20H${cx + 16}V74Z`} fill={stone} stroke={line} stroke-width="3" stroke-linejoin="round" />
            <path d={`M${cx - 16} 56H${cx + 16}V74H${cx - 16}Z`} fill={shadow} />
            <path d={`M${cx - 14} 34H${cx + 14}M${cx - 14} 48H${cx + 14}M${cx - 4} 20V34M${cx + 6} 34V48M${cx - 6} 48V62`} stroke={shadow} stroke-width="1.6" />
            <path d={`M${cx - 4} 30H${cx + 4}V42H${cx - 4}Z`} fill="#3a3040" stroke={line} stroke-width="1.6" />
            <path d={`M${cx - 13} 22H${cx + 13}`} stroke="#babec2" stroke-width="2" stroke-linecap="round" />
          </g>
        ))}
        {/* wall and arch */}
        <path d="M34 74V30H186V74H140V58C140 44 128 36 110 36C92 36 80 44 80 58V74Z" fill={stone} stroke={line} stroke-width="3" stroke-linejoin="round" />
        <path d="M34 60H80V74H34ZM140 60H186V74H140Z" fill={shadow} />
        <path d="M40 40H74M146 40H180M40 50H70M150 50H180M56 30V40M164 30V40" stroke={shadow} stroke-width="1.6" />
        <path d="M34 32H186" stroke="#babec2" stroke-width="2" stroke-linecap="round" />
        {/* the arch's opening and the portcullis */}
        <path d="M84 74V58C84 47 95 40 110 40C125 40 136 47 136 58V74Z" fill="#241d36" />
        <g class="road-arch__gate">
          <path d="M88 44V74M96 41V74M104 40V74M112 40V74M120 41V74M128 44V74M84 52H136M84 62H136" stroke="#5d4717" stroke-width="2.6" />
          <path d="M88 44V74M96 41V74M104 40V74M112 40V74M120 41V74M128 44V74" stroke="#c9a227" stroke-width="1.2" />
        </g>
        <path d="M84 74V58C84 47 95 40 110 40C125 40 136 47 136 58V74" fill="none" stroke={line} stroke-width="3" />
        <path d="M104 33H116L114 41H106Z" fill="#c4b9a9" stroke={line} stroke-width="2" stroke-linejoin="round" />
      </svg>
      {p.banner ? (
        <span class="road-arch__banner">
          <BannerArt id={p.banner} width={22} />
        </span>
      ) : null}
    </span>
  );
}
