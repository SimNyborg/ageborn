/**
 * Power glyphs (DESIGN A2.9.10): the slot marks (a house on a shield for Home, a flag on a banner for
 * Field) and the 18 px reach glyphs (house, flag, crosshair, banner, parachute). Inline SVG in the A11
 * cartoon style: a dark outline, flat fills, one highlight. Shared by the battle dock and the Army.
 */
import type { PowerSlot } from "@/contracts";
import type { ReachGlyph } from "./powerInfo";

const OUT = "#1b1330";

type P = { size?: number; class?: string; title?: string };

function Svg(p: P & { children: preact.ComponentChildren }) {
  const s = p.size ?? 18;
  return (
    <svg
      class={p.class}
      width={s}
      height={s}
      viewBox="0 0 24 24"
      aria-hidden={p.title ? undefined : "true"}
      role={p.title ? "img" : undefined}
      focusable="false"
    >
      {p.title ? <title>{p.title}</title> : null}
      {p.children}
    </svg>
  );
}

/** Home: a small house (your half). */
function House() {
  return (
    <>
      <path
        d="M3.2 11.6 12 4l8.8 7.6"
        fill="none"
        stroke={OUT}
        stroke-width="3.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M5.6 10.6V20h12.8v-9.4L12 5.2z"
        fill="#f4efe4"
        stroke={OUT}
        stroke-width="1.8"
        stroke-linejoin="round"
      />
      <path
        d="M3.2 11.6 12 4l8.8 7.6"
        fill="none"
        stroke="#e25b45"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <rect
        x="10"
        y="13.6"
        width="4"
        height="6.4"
        rx="0.8"
        fill="#7a4b2a"
        stroke={OUT}
        stroke-width="1.4"
      />
    </>
  );
}

/** Front: a flag on a pole (near your army). */
function Flag() {
  return (
    <>
      <path
        d="M6 21V3.5"
        stroke={OUT}
        stroke-width="2.8"
        stroke-linecap="round"
      />
      <path
        d="M6 21V3.5"
        stroke="#d9c79a"
        stroke-width="1.2"
        stroke-linecap="round"
      />
      <path
        d="M7 4.2h11.5l-2.8 4 2.8 4H7z"
        fill="#3fb36b"
        stroke={OUT}
        stroke-width="1.8"
        stroke-linejoin="round"
      />
      <path
        d="M8.6 6h6.2"
        stroke="#b8f0c8"
        stroke-width="1.3"
        stroke-linecap="round"
      />
    </>
  );
}

/** A strike: a crosshair on one target. */
function Crosshair() {
  return (
    <>
      <circle
        cx="12"
        cy="12"
        r="7.6"
        fill="#f4efe4"
        stroke={OUT}
        stroke-width="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="4.4"
        fill="none"
        stroke="#e25b45"
        stroke-width="2"
      />
      <circle cx="12" cy="12" r="1.6" fill="#e25b45" />
      <path
        d="M12 1.6v5M12 17.4v5M1.6 12h5M17.4 12h5"
        stroke={OUT}
        stroke-width="2.4"
        stroke-linecap="round"
      />
    </>
  );
}

/** Your army (buffs): a banner. */
function Banner() {
  return (
    <>
      <path
        d="M4 3.8h16"
        stroke={OUT}
        stroke-width="2.6"
        stroke-linecap="round"
      />
      <path
        d="M6 4.6h12v14.6l-6-3.6-6 3.6z"
        fill="#f2b52c"
        stroke={OUT}
        stroke-width="1.8"
        stroke-linejoin="round"
      />
      <path
        d="m12 7.6 1.3 2.7 2.9.3-2.2 2 .7 2.9L12 14l-2.7 1.5.7-2.9-2.2-2 2.9-.3z"
        fill="#fff4c2"
        stroke={OUT}
        stroke-width="1"
        stroke-linejoin="round"
      />
    </>
  );
}

/** A drop: a parachute. */
function Parachute() {
  return (
    <>
      <path
        d="M3 10.5a9 7 0 0 1 18 0"
        fill="#f4efe4"
        stroke={OUT}
        stroke-width="1.8"
      />
      <path
        d="M3 10.5c1.5-1.2 3-1.2 4.5 0 1.5-1.2 3-1.2 4.5 0 1.5-1.2 3-1.2 4.5 0 1.5-1.2 3-1.2 4.5 0"
        fill="#4a8fe0"
        stroke={OUT}
        stroke-width="1.6"
        stroke-linejoin="round"
      />
      <path
        d="M3.4 10.8 10.6 17M20.6 10.8 13.4 17M12 10.5V17"
        stroke={OUT}
        stroke-width="1.2"
      />
      <rect
        x="9.6"
        y="16.6"
        width="4.8"
        height="5"
        rx="1.2"
        fill="#7a5a3a"
        stroke={OUT}
        stroke-width="1.4"
      />
    </>
  );
}

export function ReachGlyphIcon(p: P & { kind: ReachGlyph }) {
  return (
    <Svg size={p.size} class={p.class} title={p.title}>
      {p.kind === "house" ? (
        <House />
      ) : p.kind === "flag" ? (
        <Flag />
      ) : p.kind === "crosshair" ? (
        <Crosshair />
      ) : p.kind === "banner" ? (
        <Banner />
      ) : (
        <Parachute />
      )}
    </Svg>
  );
}

/** The slot mark: a house (Home) or a flag (Field). */
export function SlotGlyph(p: P & { slot: PowerSlot }) {
  return (
    <Svg size={p.size} class={p.class} title={p.title}>
      {p.slot === "home" ? <House /> : <Flag />}
    </Svg>
  );
}

/** A reload mark (⟳) for "⟳ 40 s" on power tiles. */
export function ReloadGlyph(p: P) {
  return (
    <Svg size={p.size} class={p.class} title={p.title}>
      <path
        d="M18.4 8.4A7.4 7.4 0 1 0 19.4 13"
        fill="none"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
      />
      <path
        d="M20.6 3.8v5.6H15"
        fill="none"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </Svg>
  );
}
