"""W8 Cosmic wave helpers (CONTENT_PLAN 5.8): the shared star-legion trooper body, helmets and clip helpers.

Every Cosmic wave biped is built on the walk-v3 Cosmic body (`kit_cosmic.skeleton_v3` / `legs_v3`, the
`rigs_cosmic` torso, arms and shoulder pads) so the new troopers share proportions, palette and the visor face
kit (`kit_future.visor_face` glyph eyes in light violet or mint) with the Star Legionnaire and the Starwarden;
each unit then adds its own helmet, gear and weapon. `kit_cosmic.py` and `rigs_cosmic.py` keep their APIs.

  trooper()     skeleton, v3 legs, the void torso with a team chest plate and the pale star, a helmet with a
                visor face (`dome`, `hood`, `crown` or `none`), arms and team shoulder pads
  helmet()      just the helmet and its visor face on joint `head`
  hood()        the deep cowl of the robed casters with a dark faceplate and glyph eyes
  robe()        a flared team robe skirt on the hips (hem at least 9 lu above the soles) with a hem secondary
  melee_clip(), impact_fx(), hit_pose(), die_d1(), die_d2(), die_d3()  clip helpers (the W7 ones, re-exported
                with the Cosmic accents)
"""
import math

from . import face as FC
from . import kit_cosmic as KC
from . import kit_future as KF
from . import kit_future_wave as W
from . import kit_medieval as KM
from . import moves as M
from . import rigs_cosmic as K
from .anim import merge
from .geometry import Geo

VOID, VOID_LT, VOID_DK = K.VOID, K.VOID_LT, K.VOID_DK
VIOLET, VIOLET_DK, VIOLET_LT = K.VIOLET, K.VIOLET_DK, K.VIOLET_LT
STAR, STAR_TRIM = K.STAR, K.STAR_TRIM
MINT, MINT_CORE = K.MINT, K.MINT_CORE
GLOW, GLOW_CORE = K.VIOLET_GLOW, K.VIOLET_CORE
DUST = "#DCD6E8"
LILAC = "#C9B6EE"          # crystal (hue 260, saturation 0.27: outside the colour rule)
LILAC_DK = "#9C86C8"
LILAC_CORE = "#F2ECFF"
MOON = "#D8D4E2"           # moon-grey alien skin (low saturation)
MOON_DK = "#A9A3B8"
ROCK = "#9A90AA"           # asteroid rock (violet-grey, low saturation)
ROCK_DK = "#6A6078"
ROCK_LT = "#BDB4CB"
EMBER = "#FFE3A6"          # meteor glow: small, pale yellow-white

melee_clip = W.melee_clip
ring_pts = W.ring_pts
PROP_PATH = W.PROP_PATH


def impact_fx(joint, point, seed, a0=-70.0, ground_x=18.0, color=K.MINT_CORE, dust=True):
    out = [{"kind": "burst", "joint": joint, "point": point, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6, "a0": a0,
            "arc": 150.0, "color": color}]
    if dust:
        out.append({"kind": "dust", "ground": (ground_x, 0.0), "size_lu": 4.5, "puffs": 3, "seed": seed,
                    "spread": 0.9, "color": DUST})
    return out


def helmet(rig, kind="dome", eye_at=None, crest=True, eye_color=KC.VIO_EYE):
    """The helmet on joint `head` with a visor face. Returns the visor Face."""
    face = None
    if kind == "dome":
        # the legion dome: violet, a team brow band, a star-white chin guard, a dark visor slot, a low team crest
        g = Geo().blob((2.0, 0, 51.0), (11.6, 11.0, 11.8), p=2.4, shift=(0.1, 0))
        g.blob((-5.0, 0, 44.0), (6.6, 9.2, 5.0), p=2.4)
        rig.part("head", g, VIOLET, finish="gloss", outline_hex=VIOLET_DK)
        g = Geo().lathe([(11.9, 0), (12.2, 1.4), (11.8, 2.8)], (2.0, 0, 54.0), (2.0, 0, 56.8), segs=26)
        rig.part("head", g, team=True, outline=0.6)
        g = Geo().blob((2.0, 0, 51.0), (12.3, 11.7, 12.5), p=2.4)
        g.clip((4.0, 0, 0), (-1, 0, 0)).clip((0, 0, 48.0), (0, 0, 1)).clip((0, 0, 40.5), (0, 0, -1))
        g.blob((10.0, 0, 42.4), (5.0, 7.2, 3.0), p=2.4)
        rig.part("head", g, STAR, finish="gloss", outline_hex=STAR_TRIM)
        face = KC.visor(rig, "head", (2.0, 0, 51.0), (11.6, 11.0, 11.8), x0=5.0, z_top=54.0, z_bot=47.6,
                        eye_at=eye_at or (9.4, 51.0), eye_dx=(0.0, 3.6), eye_rx=2.2, eye_rz=2.7, grow=1.2, color=eye_color)
        if crest:
            g = Geo().blob((-1.0, 0, 62.6), (9.8, 2.6, 2.6), p=2.8, rot=(0, -8, 0))
            rig.part("head", g, team=True)
            g = Geo().star((5.4, -2.2, 61.2), 2.6, 1.1, 1.0, points=5)
            rig.part("head", g, glow=MINT, outline=0.6, outline_hex=VOID)
    elif kind == "crown":
        # an open-faced star-white circlet over a void cap, a dark visor band (casters who keep a light helm)
        g = Geo().blob((1.5, 0, 50.5), (11.0, 10.6, 11.2), p=2.3)
        rig.part("head", g, VOID_LT)
        g = Geo().lathe([(11.4, 0), (11.7, 1.6), (11.2, 3.2)], (1.5, 0, 55.0), (1.5, 0, 58.2), segs=26)
        rig.part("head", g, team=True, outline=0.6)
        for a in (-40, 0, 40):
            x = 1.5 + 11.2 * math.cos(math.radians(a))
            y = 11.2 * math.sin(math.radians(a)) * 0.95
            g = Geo().star((x, y - 0.5, 59.6), 2.4, 1.0, 1.0, points=4)
            rig.part("head", g, STAR, finish="gloss", outline=0.6, outline_hex=STAR_TRIM)
        face = KC.visor(rig, "head", (1.5, 0, 50.5), (11.0, 10.6, 11.2), x0=4.6, z_top=53.6, z_bot=47.4,
                        eye_at=eye_at or (9.0, 50.6), eye_dx=(0.0, 3.6), eye_rx=2.2, eye_rz=2.7, grow=1.0, color=eye_color)
    return face


def hood(rig, color=VIOLET, rim_team=True, eye_color=K.MINT, eye_core=K.MINT_CORE, tip=True):
    """A deep cowl (the Starwarden's cut, tilted to the camera) with a team rim, a dark faceplate and glyph eyes."""
    cut_p, cut_n = (6.4, 0, 49.0), (1.0, -0.55, 0.25)
    g = Geo().blob((0.5, 0, 50.0), (12.4, 11.6, 12.6), p=2.4, shift=(-0.15, 0))
    g.clip(cut_p, cut_n)
    rig.part("head", g, color, finish="matte", outline_hex=VIOLET_DK)
    L = math.sqrt(sum(v * v for v in cut_n))
    nn = tuple(v / L for v in cut_n)
    g = Geo().blob((0.5, 0, 50.0), (13.0, 12.2, 13.2), p=2.4, shift=(-0.15, 0))
    g.clip(cut_p, cut_n, fill=False)
    g.clip(tuple(p - 2.2 * n for p, n in zip(cut_p, nn)), tuple(-n for n in nn), fill=False)
    if rim_team:
        rig.part("head", g, team=True, outline=0.6)
    else:
        rig.part("head", g, STAR, outline=0.6, outline_hex=STAR_TRIM)
    if tip:
        rig.secondary("hood_tip", "head", (-4.0, 0, 57.0), (-10.0, 0, 64.0), max_deg=14, gain=1.1)
        g = Geo().blob((-6.0, 0, 58.0), (6.0, 6.0, 7.0), p=2.2, rot=(0, 30, 0))
        rig.part("hood_tip", g, color, finish="matte", outline_hex=VIOLET_DK)
    plate = Geo().blob((3.0, 0, 49.0), (9.6, 9.0, 9.6), p=2.4)
    face = KF.visor_face(rig, "head", [plate], (8.4, 50.4), eye_dx=(0.0, 3.4), eye_rx=2.1, eye_rz=2.7,
                         color=eye_color, core=eye_core)
    rig.part("head", plate, K.VISOR, finish="gloss", outline_hex=VOID)
    return face


def chest_star(rig, joint="torso", s=1.0, at=(6.2, -9.0, 31.6), bulk=1.0):
    chest = Geo().blob((1.8, 0, 31.4), (9.8 * bulk, 10.5 * bulk, 8.0), p=3.0, taper=(0.88, 1.0))
    cf = FC.Face(rig, joint, [chest])
    g = KC.starmark(cf, Geo(), KM.scr(cf, (at[0] * bulk, at[1] * bulk, at[2])), s=s)
    rig.part(joint, g, KC.STAR_PALE, highlight=False, outline=0)


def trooper(rig, *, helmet_kind="dome", team_shin=True, knee=None, pack=False, cape=False, bulk=1.0, shoulders=True,
            far_shoulder=True, star=True, eye_at=None, crest=True, head=(1, 0, 39), sleeve=VOID, bracer=VIOLET,
            boot=VIOLET, plate=True, pteruges=True, eye_color=KC.VIO_EYE):
    """The W8 Cosmic trooper: walk-v3 skeleton and legs, the void torso with a team chest plate and the pale star,
    a helmet with a visor face, arms with star-white gloves and team shoulder pads. Returns the visor Face."""
    KC.skeleton_v3(rig, head=head)
    KC.legs_v3(rig, team_shin=team_shin, knee=knee, boot=boot)
    K.arm_parts(rig, "l", sleeve=sleeve, bracer=bracer)
    if cape:
        rig.secondary("cape", "torso", (-8.0, 0, 38.0), (-14.0, 0, 16.0), max_deg=16, gain=1.1)
        g = Geo().blob((-11.5, 0.5, 27.0), (3.2, 11.6, 12.0), p=3.0, taper=(1.3, 0.9), shift=(0.2, 0))
        rig.part("cape", g, team=True)
        g = Geo().blob((-12.6, 0.5, 16.8), (2.2, 12.0, 1.5), p=3.0)
        rig.part("cape", g, STAR, outline=0.6, outline_hex=STAR_TRIM)
    K.torso(rig, pack=pack, bulk=bulk, plate=plate)
    g = Geo().blob((0.6, 0, 16.6), (10.6 * bulk, 10.4 * bulk, 4.2), p=2.8, taper=(1.12, 1.0))
    g.clip((0, 0, 12.8), (0, 0, -1))
    rig.part("hips", g, VIOLET_DK, finish="gloss")
    if pteruges:
        g = Geo()
        for y in (-7.5, -2.5, 2.5):
            g.blob((7.6 * bulk, y, 14.6), (2.2, 2.0, 3.0), p=2.8)
        rig.part("hips", g, STAR, finish="gloss", outline=0.6, outline_hex=STAR_TRIM)
    g = Geo().blob((1.0, 0, 39.2), (7.4, 7.6, 1.8), p=2.6)
    rig.part("torso", g, STAR, finish="gloss", outline_hex=STAR_TRIM)
    if star and plate:
        chest_star(rig, bulk=bulk)
    face = helmet(rig, helmet_kind, eye_at=eye_at, crest=crest, eye_color=eye_color) if helmet_kind not in ("none", "hood") else None
    if helmet_kind == "hood":
        face = hood(rig)
    K.arm_parts(rig, "r", sleeve=sleeve, bracer=bracer)
    if shoulders:
        K.shoulders(rig, r=(7.6 * bulk, 6.6, 6.2), far=far_shoulder)
    return face


def robe(rig, hem_z=11.0, color=None, front=VIOLET, specks=True, flare=1.25):
    """A flared robe skirt on the hips: team (or `color`) cloth with a star-white hem band on a `hem` secondary,
    a front panel and star specks. The hem ends at least 9 lu above the soles (ANIM_SPEC G2)."""
    rig.secondary("hem", "hips", (0, 0, 16.0), (2.0, 0, 9.0), max_deg=16, gain=1.1)
    g = Geo().blob((0.5, 0, hem_z + 4.0), (12.4, 11.2, 6.2), p=2.6, taper=(flare, 0.9))
    g.clip((0, 0, hem_z - 0.4), (0, 0, -1))
    if color is None:
        rig.part("hem", g, team=True)
    else:
        rig.part("hem", g, color, finish="matte")
    g = Geo().blob((0.5, 0, hem_z + 0.4), (14.6, 13.2, 1.5), p=2.8)
    rig.part("hem", g, STAR, finish="gloss", outline_hex=STAR_TRIM)
    g = Geo().blob((10.6, -1.0, hem_z + 5.0), (1.8, 4.2, 5.8), p=3.0, taper=(1.3, 0.8))
    rig.part("hem", g, front, finish="matte", outline=0.8)
    if specks:
        KC.specks(rig, "hem", [(12.4, hem_z + 7.4, 0.9), (12.8, hem_z + 4.0, 1.1), (13.2, hem_z + 1.2, 0.8)], -3.4)


# -- hits and deaths (the W7 helpers; the glyph names are the same for the Cosmic visors) --------------
hit_pose = W.hit_pose
hit_heavy = W.hit_heavy
die_d1 = W.die_d1
die_d2 = W.die_d2


def die_d3(k, stance, extra=None, center_z=26.0, height=70, face=None):
    """D3 dizzy sit (supports and casters): spins in place, sits down hard, spiral eyes."""
    t = [0, 0, 0.1, 0.3, 1.0, 0.95, 1.0, 1.0, 1.0, 1.0][k]
    pose = merge(stance, M.die_d3(k, center_z=center_z, height=height), KM.d3_sit(k, amount=t))
    if extra is not None:
        pose = merge(pose, extra(k, t))
    g = ["g_hurt", "g_wide", "g_spiral", "g_spiral", "g_spiral", "g_spiral", "g_spiral", "g_spiral",
         "g_spiral", "g_spiral"][k]
    if face is not None:
        return merge(pose, face(g))
    return merge(pose, KF.glyph(g))


def fire_fx(joint, point, color=K.MINT_CORE, r=(6.0, 11.0), n=5, a0=-60.0, arc=120.0):
    return [{"kind": "burst", "joint": joint, "point": point, "r0_lu": r[0], "r1_lu": r[1], "n": n,
             "a0": a0, "arc": arc, "color": color}]


def rings_fx(joint, point, radii=(7.0, 11.0), color=K.MINT_CORE, a0=-80.0, a1=80.0):
    return [{"kind": "rings", "joint": joint, "point": point, "radii_lu": radii, "a0": a0, "a1": a1, "color": color}]


def dust_fx(x, seed, size=4.5, puffs=3, spread=0.9, direction=None):
    d = {"kind": "dust", "ground": (x, 0.0), "size_lu": size, "puffs": puffs, "seed": seed, "spread": spread,
         "color": DUST}
    if direction is not None:
        d["dir"] = direction
    return [d]
