"""Shared rigs, parts and palette for the Cosmic Age units (docs/design-lane-ages.md A17.11,
A17.12): star legionnaire, ion ranger, graviton halberdier, starwarden and warp stalker (biped),
hover tank (vehicle) and the mothership (flyer).

The biped skeleton and the posing maths (arm directions, two-bone IK, idle wave, walk legs, hit
and death limbs) are the Future Age ones (`rigs_future`), re-exported here so the Cosmic units read
the same in motion; the parts and palette are Cosmic's own.

Palette (A17.12, Cosmic): void #1E1830 (here pushed to hue 262 so shaded pixels stay outside the
blue team band), nebula violet #8E44C8 and star white #F2F0FF as the large areas, mint #3FE0B0 as
the energy accent. Violet (276 degrees) and mint (162 degrees) are outside the team hue bands, so
armour and energy can be large; team colour goes on chest plates, shoulder pads, crests, capes
and hull stripes. Star white is held at about 0.85 albedo so the three-step shading shows.
"""
import math

from .geometry import Geo
from .rigs_future import (  # noqa: F401  (re-exported pose helpers)
    ARM_Y, ELBOW_Z, HAND_Z, HIP_Z, KNEE_Z, LEG_Y, LOWER, SH, SHOULDER_Z, SIDE_Y, UPPER,
    arm, die_limbs, hit_body, hold2, idle_body, idle_wave, ik2, ko, rot2, skeleton, squint,
    walk_legs, walker_cycle,
)

# -- palette ------------------------------------------------------------------------------
VOID = "#241A38"          # undersuit (hue 262)
VOID_LT = "#3A2D56"       # lighter void panels
VOID_DK = "#170F26"
VIOLET = "#8E44C8"        # nebula violet armour
VIOLET_DK = "#6B3399"
VIOLET_LT = "#A970D8"
STAR = "#E4E0F4"          # star white (0.85 albedo)
STAR_TRIM = "#ABA3C6"
MINT = "#3FE0B0"
MINT_CORE = "#D8FFF0"
VIOLET_GLOW = "#C08CFF"   # void energy (hue 272)
VIOLET_CORE = "#F1E6FF"
VISOR = "#140E22"
SKIN = "#D9B79A"          # <= 38% saturation (A11 skin rule)
WHITE = "#FFFFFF"
SMOKE = "#DCD8E6"


# -- biped parts --------------------------------------------------------------------------
def legs(rig, suit=VOID, boot=VIOLET, thigh_r=4.5, hip_z=HIP_Z, knee=STAR, team_shin=False):
    """Void undersuit legs, violet armoured boots with a star-white toe cap and knee guard."""
    for s in ("r", "l"):
        y = LEG_Y * SIDE_Y[s]
        g = Geo().capsule((0, y, hip_z), (0.5, y, KNEE_Z), thigh_r, thigh_r - 0.6)
        rig.part(f"thigh_{s}", g, suit)
        g = Geo().capsule((0.5, y, KNEE_Z), (1.0, y, 4.6), thigh_r - 0.8, 3.7)
        rig.part(f"shin_{s}", g, suit)
        g = Geo().blob((2.8, y, 3.0), (7.0, 4.8, 3.2), p=3.0, taper=(1.05, 0.85))
        g.blob((0.9, y, 7.0), (4.6, 4.6, 3.4), p=2.6)
        rig.part(f"shin_{s}", g, boot, finish="gloss")
        g = Geo().blob((7.2, y, 2.4), (2.6, 4.4, 2.2), p=2.6)
        rig.part(f"shin_{s}", g, STAR, finish="gloss", outline_hex=STAR_TRIM)
        if team_shin:
            g = Geo().blob((2.2, y, 10.6), (4.2, 4.8, 5.0), p=2.6)
            rig.part(f"shin_{s}", g, team=True, outline=0.6)
        elif knee:
            g = Geo().blob((2.2, y, KNEE_Z + 0.4), (3.1, 3.9, 3.0), p=2.6)
            rig.part(f"shin_{s}", g, knee, finish="gloss", outline_hex=STAR_TRIM)


def arm_parts(rig, s, sleeve=VOID, bracer=VIOLET, glove=STAR, r0=4.0, r1=3.5, fist=4.1, arm_y=None):
    y = (arm_y or ARM_Y)[s]
    g = Geo().capsule((0, y, SHOULDER_Z), (0, y, ELBOW_Z), r0, r1 + 0.2)
    rig.part(f"arm_{s}", g, sleeve)
    g = Geo().capsule((0, y, ELBOW_Z), (0, y, HAND_Z + 2.0), r1 + 0.1, r1 - 0.2)
    rig.part(f"fore_{s}", g, sleeve)
    if bracer:
        g = Geo().blob((0.3, y, HAND_Z + 4.2), (r1 + 1.3, r1 + 1.2, 3.6), p=2.8, taper=(0.9, 1.1))
        rig.part(f"fore_{s}", g, bracer, finish="gloss")
    g = Geo().blob((0.4, y, HAND_Z - 0.4), (fist, fist - 0.2, fist), p=2.4)
    rig.part(f"hand_{s}", g, glove, finish="gloss", outline_hex=STAR_TRIM)


def shoulders(rig, arm_y=None, r=(7.0, 6.0, 5.6), z=37.6, far=True, rim=True):
    """Team shoulder pads with a star-white rim (the big team cue of the upper body)."""
    for s in ("r", "l") if far else ("r",):
        y = (arm_y or ARM_Y)[s]
        c = (0.5, y - 0.3 * SIDE_Y[s], z)
        g = Geo().blob(c, r, p=2.6)
        rig.part(f"arm_{s}", g, team=True)
        if rim:
            g = Geo().blob((c[0], c[1], c[2] - r[2] * 0.62), (r[0] + 0.5, r[1] + 0.5, 1.3), p=2.6)
            rig.part(f"arm_{s}", g, STAR, finish="gloss", outline_hex=STAR_TRIM)


def torso(rig, suit=VOID, plate=True, belt=STAR, light=MINT, pack=True, bulk=1.0, collar=VIOLET):
    """Void torso, a team chest plate with a violet collar, a star-white belt with a mint light."""
    k = bulk
    g = Geo().blob((0, 0, 28), (9.8 * k, 9.6 * k, 11.2), p=2.4, taper=(0.95, 1.05))
    g.blob((0, 0, 17.5), (8.8 * k, 9.2 * k, 4.2), p=2.6)
    rig.part("torso", g, suit)
    if plate:
        g = Geo().blob((1.8, 0, 31.4), (9.8 * k, 10.5 * k, 8.0), p=3.0, taper=(0.88, 1.0))
        rig.part("torso", g, team=True)
    if collar:
        g = Geo().blob((1.0, 0, 38.8), (7.6, 7.8, 2.0), p=2.6)
        rig.part("torso", g, collar, finish="gloss")
    g = Geo().blob((0.4, 0, 21.8), (10.2 * k, 10.2 * k, 2.3), p=3.4)
    rig.part("torso", g, belt, finish="gloss", outline_hex=STAR_TRIM)
    if light:
        g = Geo().blob((10.4 * k, -2.0, 21.8), (1.4, 2.4, 1.4), p=2.4)
        rig.part("torso", g, glow=light, outline=1.0, outline_hex=suit)
    if pack:
        g = Geo().blob((-11.0 * k, 0, 31), (4.4, 8.2, 8.6), p=4.0)
        rig.part("torso", g, VIOLET_DK, finish="gloss")
        g = Geo().capsule((-15.3 * k, -4.0, 27.0), (-15.3 * k, -4.0, 35.0), 1.6)
        rig.part("torso", g, glow=MINT, outline=1.0, outline_hex=suit)


def visor_band(rig, c=(2.0, 0, 50.5), r=(12.2, 11.6, 12.4), z0=47.4, z1=52.8, x0=7.0, color=MINT,
               band=VISOR):
    """A dark visor band wrapping the front of a helmet shell, a glowing slit inside it (`eyes`,
    squints by scaling sz) and hidden KO crosses (`eyes_x`)."""
    cx, cy, cz = c
    g = Geo().blob(c, (r[0] + 0.8, r[1] + 0.8, r[2] + 0.8), p=2.5)
    g.clip((x0, 0, 0), (-1, 0, 0)).clip((0, 0, z1 + 1.2), (0, 0, 1)).clip((0, 0, z0 - 1.2), (0, 0, -1))
    rig.part("head", g, band, finish="gloss", outline_hex=VOID)
    ez = (z0 + z1) / 2
    rig.joint("eyes", "head", (cx + r[0], 0, ez))
    g = Geo().blob(c, (r[0] + 1.4, r[1] + 1.4, r[2] + 1.4), p=2.5)
    g.clip((x0 + 1.8, 0, 0), (-1, 0, 0)).clip((0, 0, ez + 1.3), (0, 0, 1)).clip((0, 0, ez - 1.3), (0, 0, -1))
    rig.part("eyes", g, glow=color, outline=0)
    rig.joint("eyes_x", "head", (cx + r[0], 0, ez), hidden=True)
    g = Geo()
    ex = cx + r[0] + 1.2
    for y in (-5.0, 2.2):
        g.capsule((ex, y - 1.8, ez + 1.8), (ex, y + 1.8, ez - 1.8), 0.8)
        g.capsule((ex, y - 1.8, ez - 1.8), (ex, y + 1.8, ez + 1.8), 0.8)
    rig.part("eyes_x", g, glow=color, outline=0)


def sparks(rig, joint, at, color=MINT, core=WHITE, size=1.0, name="sparks", rays=6, seed=0, hidden=True):
    """A hidden burst of short energy rays around `at` in the side plane."""
    x, y, z = at
    rig.joint(name, joint, at, hidden=hidden)
    g = Geo()
    for i in range(rays):
        a = math.radians(360.0 * i / rays + 17 * seed + (11 if i % 2 else 0))
        r0, r1 = 2.5 * size, (8.5 if i % 2 == 0 else 6.0) * size
        g.capsule((x + r0 * math.cos(a), y - 2, z + r0 * math.sin(a)),
                  (x + r1 * math.cos(a), y - 2, z + r1 * math.sin(a)), 1.1 * size, 0.35 * size,
                  segs=8, rings=2)
    rig.part(name, g, glow=color, outline=0)
    g = Geo().sphere((x, y - 2.5, z), 2.6 * size, cuts=3)
    rig.part(name, g, glow=core, outline=0)


def star_burst(rig, joint, at, size=1.0, name="flash", color=MINT, core=MINT_CORE, points=6):
    """A hidden star-shaped muzzle flash facing the camera (a flat star plus a round core)."""
    x, y, z = at
    rig.joint(name, joint, at, hidden=True)
    g = Geo().star((x + 3 * size, y - 3, z), 8 * size, 3.0 * size, 1.4, points=points)
    rig.part(name, g, glow=color, outline=0)
    g = Geo().sphere((x + 2 * size, y - 4.5, z), 3.4 * size, cuts=3)
    rig.part(name, g, glow=core, outline=0)
    return name


def orb(rig, joint, c, r, color=MINT, core=MINT_CORE, name=None, hidden=False, line=None):
    """A glowing energy orb with an off-centre bright core (reads round at 56 px)."""
    if name:
        rig.joint(name, joint, c, hidden=hidden)
        joint = name
    x, y, z = c
    g = Geo().sphere(c, r, cuts=4)
    rig.part(joint, g, glow=color, outline=1.0, outline_hex=line or color)
    g = Geo().sphere((x - r * 0.25, y - r * 0.55, z + r * 0.25), r * 0.5, cuts=3)
    rig.part(joint, g, glow=core, outline=0)
    return joint


def pennant(rig, parent, pole_base, height, length=16.0, name="pennant", pole=STAR_TRIM, tip=MINT,
            w=9.0, gain=1.2, max_deg=18):
    """An antenna with a team swallowtail pennant (the heavies' team cue), on follow-through."""
    x, y, z = pole_base
    rig.joint(f"{name}_mast", parent, pole_base)
    g = Geo().capsule((x, y, z), (x - 2.5, y, z + height), 1.0, 0.7)
    rig.part(f"{name}_mast", g, pole, finish="metal", outline=0.6)
    g = Geo().sphere((x - 2.5, y, z + height + 0.6), 1.8, cuts=3)
    rig.part(f"{name}_mast", g, glow=tip, outline=0.6, outline_hex=VOID)
    top = (x - 2.4, y, z + height - 1.5)
    rig.secondary(name, f"{name}_mast", top, (top[0] - length, y, top[2] - 4.0), max_deg=max_deg,
                  gain=gain, rot_gain=0.6)
    pts = [(0.0, 0.0), (-length, -1.0), (-length * 0.72, -w * 0.5), (-length, -w * 0.9), (0.0, -w)]
    g = Geo().slab([(top[0] + px_, top[2] + pz_) for px_, pz_ in pts], y, 1.2)
    rig.part(name, g, team=True, outline=0.8)


def puff(rig, joint, at, size=1.0, name="vent", color=SMOKE, hidden=True):
    """A cluster of light vapour balls (dust finish) on a hidden joint."""
    x, y, z = at
    k = size
    rig.joint(name, joint, at, hidden=hidden)
    g = Geo()
    for dx, dz, r in ((0, 0, 3.4), (3.8, 1.8, 2.8), (-2.8, 3.0, 2.6), (1.2, 4.8, 2.2)):
        g.sphere((x + dx * k, y - 2, z + dz * k), r * k, cuts=4)
    rig.part(name, g, color, finish="dust", outline=0.8)


# -- Cosmic headgear (its own kit: no Future visor bar) ---------------------------------------
def face_plate(rig, c=(2.0, 0, 50.5), r=(12.0, 11.4, 12.0), x0=5.0, top=53.5, eye_z=51.0, plate=STAR,
               eye=VIOLET_CORE, eye_line=VIOLET, dy=(-5.2, 2.6)):
    """A star-white faceplate over the front of a helmet shell (below `top`, ahead of `x0`) with
    two narrow, slanted glowing violet eye slits (`eyes`, squint = sz) and hidden KO crosses
    (`eyes_x`). The Cosmic answer to the Future visor bar."""
    cx, cy, cz = c
    g = Geo().blob(c, (r[0] + 0.7, r[1] + 0.7, r[2] + 0.7), p=2.5)
    g.clip((x0, 0, 0), (-1, 0, 0)).clip((0, 0, top), (0, 0, 1)).clip((0, 0, cz - r[2] * 0.72), (0, 0, -1))
    rig.part("head", g, plate, finish="gloss", outline_hex=STAR_TRIM)
    ex = cx + r[0] + 0.5
    g = Geo().capsule((ex - 1.4, 0.0, eye_z + 0.2), (ex + 0.9, 0.0, eye_z - 4.8), 0.9)     # nose ridge
    rig.part("head", g, STAR_TRIM, finish="gloss", outline=0)
    rig.joint("eyes", "head", (ex, 0, eye_z))
    g = Geo()
    for y in dy:
        inner = y + (1.6 if y < 0 else -1.6)
        g.capsule((ex - 0.2, y - 1.6 * (1 if y < 0 else -1), eye_z + 0.9), (ex + 0.3, inner, eye_z - 0.6), 1.25)
    rig.part("eyes", g, glow=eye, outline=0.9, outline_hex=eye_line)
    rig.joint("eyes_x", "head", (ex, 0, eye_z), hidden=True)
    g = Geo()
    for y in dy:
        g.capsule((ex + 0.6, y - 1.6, eye_z + 1.6), (ex + 0.6, y + 1.6, eye_z - 1.6), 0.7)
        g.capsule((ex + 0.6, y - 1.6, eye_z - 1.6), (ex + 0.6, y + 1.6, eye_z + 1.6), 0.7)
    rig.part("eyes_x", g, glow=eye, outline=0.6, outline_hex=eye_line)


def mono_lens(rig, at, r=3.6, ring=STAR, lens=VIOLET_GLOW, core=VIOLET_CORE, axis=(1.0, -0.35)):
    """A single round glowing lens (the Ion Ranger's eye): a star-white bezel, a violet lens with
    a bright core (`eyes`, squint = sz) and a hidden KO cross (`eyes_x`)."""
    x, y, z = at
    L = math.hypot(*axis)
    ax, ay = axis[0] / L, axis[1] / L
    g = Geo().lathe([(0, -1.0), (r + 1.2, -1.0), (r + 1.6, 0.4), (r + 1.0, 1.6), (0, 1.2)], (x, y, z),
                    (x + ax, y + ay, z), segs=20)
    rig.part("head", g, ring, finish="gloss", outline_hex=STAR_TRIM)
    rig.joint("eyes", "head", (x + ax * 1.6, y + ay * 1.6, z))
    g = Geo().lathe([(0, 0), (r, 0), (r * 0.9, 0.9), (0, 1.3)], (x + ax * 1.2, y + ay * 1.2, z),
                    (x + ax * 2.2, y + ay * 2.2, z), segs=20)
    rig.part("eyes", g, glow=lens, outline=0.6, outline_hex=VOID)
    g = Geo().sphere((x + ax * 2.2 - 0.6, y + ay * 2.2 - 0.6, z + r * 0.3), r * 0.38, cuts=3)
    rig.part("eyes", g, glow=core, outline=0)
    rig.joint("eyes_x", "head", (x + ax * 2.4, y + ay * 2.4, z), hidden=True)
    g = Geo()
    px, py = x + ax * 2.6, y + ay * 2.6
    g.capsule((px - ay * 2.4, py + ax * 2.4, z + 2.4), (px + ay * 2.4, py - ax * 2.4, z - 2.4), 0.8)
    g.capsule((px - ay * 2.4, py + ax * 2.4, z - 2.4), (px + ay * 2.4, py - ax * 2.4, z + 2.4), 0.8)
    rig.part("eyes_x", g, glow=core, outline=0.6, outline_hex=VIOLET)


def wings(rig, joint, root, span=15.0, h=11.0, color=VIOLET, edge=STAR, y_off=11.0, team=False):
    """A pair of swept wings on the sides of a helm (the Graviton Halberdier's winged helm):
    three feathers each, sweeping back and up."""
    x, y, z = root
    for sgn in (-1, 1):
        yy = y + y_off * sgn
        g = Geo().slab([(x + 2.0, z - 2.0), (x - 2.0, z + h * 0.35), (x - span * 0.55, z + h), (x - span, z + h * 1.15),
                        (x - span * 0.8, z + h * 0.72), (x - span * 1.05, z + h * 0.62), (x - span * 0.8, z + h * 0.32),
                        (x - span * 0.95, z + h * 0.12), (x - span * 0.5, z - 0.8)], yy, 1.8)
        if team:
            rig.part(joint, g, team=True)
        else:
            rig.part(joint, g, color, finish="gloss", outline_hex=VIOLET_DK)
        g = Geo().capsule((x + 1.0, yy - 1.2 * (1 if sgn < 0 else -1), z - 1.0),
                          (x - span * 0.55, yy - 1.2 * (1 if sgn < 0 else -1), z + h * 0.98), 0.8)
        rig.part(joint, g, edge, finish="gloss", outline=0)
