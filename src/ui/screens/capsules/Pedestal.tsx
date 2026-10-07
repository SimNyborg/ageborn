/**
 * The carved stone pedestal the best capsule floats over (AUDIT #17): warm stone with brick courses, a
 * brass inlay ring, a lit top rim and the cel shadow band on the lower edge, in the art sheet's ramps.
 */
export function StonePedestal(p: { class?: string }) {
  return (
    <svg class={`caps-pedestal ${p.class ?? ''}`} viewBox="0 0 160 72" aria-hidden="true">
      <ellipse cx="80" cy="64" rx="70" ry="7" fill="rgb(0 0 0 / .35)" />
      {/* foot */}
      <path d="M22 50H138V58C138 63 112 66 80 66C48 66 22 63 22 58Z" fill="#7c6d5f" stroke="#433d33" stroke-width="2.6" stroke-linejoin="round" />
      <ellipse cx="80" cy="50" rx="58" ry="8" fill="#a89880" stroke="#433d33" stroke-width="2.6" />
      {/* body */}
      <path d="M34 22H126V48C126 53 105 56 80 56C55 56 34 53 34 48Z" fill="#a89880" stroke="#433d33" stroke-width="2.6" stroke-linejoin="round" />
      <path d="M34 38H126V48C126 53 105 56 80 56C55 56 34 53 34 48Z" fill="#7c6d5f" />
      <path d="M40 30H58M66 30H92M100 30H120M46 44H70M78 44H104M112 44H122" stroke="#7c6d5f" stroke-width="1.6" stroke-linecap="round" />
      {/* brass inlay ring */}
      <path d="M34 34C34 39 55 42 80 42C105 42 126 39 126 34V38C126 43 105 46 80 46C55 46 34 43 34 38Z" fill="#e8b23a" stroke="#5d4717" stroke-width="1.6" stroke-linejoin="round" />
      <path d="M40 37.4C52 40 108 40 120 37.4" stroke="#f6e0b0" stroke-width="1.2" fill="none" stroke-linecap="round" />
      {/* top */}
      <ellipse cx="80" cy="22" rx="46" ry="9" fill="#c4b9a9" stroke="#433d33" stroke-width="2.6" />
      <ellipse cx="80" cy="22" rx="36" ry="6" fill="#a89880" />
      <path d="M48 19C60 15 100 15 112 19" stroke="#efe9da" stroke-width="2" fill="none" stroke-linecap="round" />
    </svg>
  );
}
