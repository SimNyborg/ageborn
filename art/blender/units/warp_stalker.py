"""Warp Stalker: Cosmic Age skirmisher Epic (docs/design-lane-ages.md A17.11). Twin warp blades, slash
damage, fast (0.8 s); Blink: warps past the blocker to a ranged or support unit (the game draws
fx.blink). ~70 lu.

Look (A17.12, Cosmic palette): a lean, hunched assassin. A pointed violet hood (its tip follows
through) over a dark mask with two slanted mint robot eyes that act (narrow and angry on the
pounce, > < when hit, X as he blinks out), a big team cloak that trails from the shoulders and
flares on the walk; its near half is thrown open toward the camera so the starry lining reads
(void with star-white and mint star specks). A void bodysuit with violet shin guards, a team sash
with a pale Cosmic star, a belt pouch. Both hands hold short curved mint warp blades, reversed.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    low crouch, twirls the near blade, a shimmer frame (he flickers), a blink
  walk    walk v3 ninja sprint at ground speed (ANIM_SPEC G1, 125 lu/s): hunched low and leaning
          hard, long bounding strides with a flight phase, both blades swept back and trailing, planted
          feet, the cloak and hood tip flaring behind
  attack  BLINK X-SLASH: sinks into a deep crouch, squeezes thin and blinks out in a violet star,
          reappears a stride forward in the air with both blades crossed high behind his head
          (the held extreme; the star fades where he was), slashes both blades down across each
          other (two mint smears) and lands low with the blades crossed in an X (impact lines),
          then skips back into his crouch
  attack_b  DOUBLE SLASH: crouched low and turned away with both blades cocked back past the far hip
          (the held extreme), then both sweep round flat at chest height into a long lunge (two mint
          crescent smears), no blink
  attack_c  SPIN: coils deep with the near blade low behind and the far blade high in front (the held
          extreme), then whirls a full turn on the spot (two mint ring smears) and lands with both
          blades level out at the target
  hit     light: the head snaps back, the cloak whips, eyes > <
  die     blink-out (kept): struck, folded in, squeezed thin and shrunk into a violet star flash
          (no fall, no dust poof)

W4 (the detail standard): the team cloak's folds and its turned edge's seam (team-dark), the sash's seam, the
suit's creases, the hood's folds, the shin guards' seams, the legs' creases; energy damage spots (a torn cloak and
hood, motes drifting off); two-tone slashes.

Shadow Stalker (epic skin, DESIGN A5.8; the puppet's recipe: a see-through shadow body with a ghostly glowing
edge; the game draws it 72% opaque): the suit, hood, guards and lining a near-black violet, the blades and lights a
pale ghost lilac. The silhouette sign: ghost wisps stream back from the hood's tip and the cloak's hem, and a pale
glowing seam edges the hood and the thrown-open cloak.
"""
import math

from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_future as KF
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge, pick
from ageborn_art.geometry import Geo
from ageborn_art import face as FC
from units import futcos_w4 as FW

SLUG = "warp_stalker"
GAIT_NAME = "biped"
NAME = "Warp Stalker"
HEIGHT_LU = 70
CANVAS = (320, 272)
FEET = (132, 232)
ANCHORS = {"head": (6, 66), "hitCenter": (2, 32)}
NO_RETIME = True

# W4 detail standard (look.py)
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.5
# (r38) a clearer light-to-shadow gradient, and the hood, the cloak and the sash as cloth (polymer's 0.03 left the
# hood, the unit's largest field, flat): r28 sat at flat 0.250, micro 3.56, edge 0.493
LOOK_SHADE = dict(FW.SHADE_SOLDIER, gradient=2.7, cavity=0.78)
LOOK_RIM = dict(FW.RIM_SOLDIER, lift=0.42)
MATERIAL_KINDS = FW.kinds_cosmic({"#36C99E": "energy", K.VIOLET: "cloth", "team": "cloth"})
FACE_LINE = "#3A2E58"       # (r38) the mask's seams, a step over the visor black (the Starwarden's)
NEBULA = "#34274F"          # (r38) nebula wisps across the starry lining, a step over its void
BLINK_MID = "#DCC0FF"       # (r38b) the blink-out flash's middle step, between the violet glow and its core

SH = "shadow_stalker"
# (r38) every skin violet at hue 257-266: r28's 253-257 sat inside the A11 blue team band (182-254), and the shading
# and the PNG8 palette pushed them over its saturation (the colour rule at 10.0% RGBA, 34% on the encoded sheet)
# (r38b and r38d: the near-black two steps lighter, its shading and breakup read: r38 sat at flat 0.218, micro 4.00,
# r38c at 0.206 / 4.16; still well under the unit's violet hood and void suit)
SH_VOID, SH_VOID_LT, SH_VOID_DK, SH_VIO, SH_VIO_DK = "#231930", "#3A2D54", "#18111F", "#4E3E6A", "#3A2C54"
SH_GLOW, SH_GLOW_DK, SH_CORE, SH_WISP = "#D8CCFF", "#B6A8E8", "#F2EEFF", "#9080C8"
SKINS = {SH: {
    "palette": FW.skin_palette({K.VOID: SH_VOID, K.VOID_LT: SH_VOID_LT, K.VOID_DK: SH_VOID_DK, K.VIOLET: SH_VIO,
                                K.VIOLET_DK: SH_VIO_DK, K.STAR: "#4C4268", K.STAR_TRIM: "#3A3150", K.VISOR: "#0C0812",
                                K.MINT: SH_GLOW, K.MINT_CORE: SH_CORE, "#36C99E": SH_GLOW_DK, "#1C8A6A": "#7E68B6",
                                KC.STAR_PALE: "#B8ACE0", K.VIOLET_GLOW: SH_GLOW, K.VIOLET_CORE: "#F4F0FF",
                                FW.LINE_ON_VIOLET: "#241B36", FW.FOLD_ON_VOID: "#0D0914", FW.WEAR_ON_VIOLET: "#4E4469",
                                FACE_LINE: "#2A2140", NEBULA: "#33274B", "#DCC0FF": "#E6DCFF"}),
    # (r38g: the shadow body in fur's fine clumps, a soft smoky mottle: as cloth its dark folds' breakup sat at a level or
    # two, and the extras held micro 4.28 against 4.3)
    "kinds": FW.kinds({SH_VOID: "fur", SH_VOID_LT: "fur", SH_VOID_DK: "fur", SH_VIO: "fur", SH_VIO_DK: "fur",
                       "#4C4268": "polymer", "#3A3150": "polymer", "#0C0812": "glass", "#241B36": "cloth",
                       "#0D0914": "cloth", "#4E4469": "cloth", "#2A2140": "glass", "#33274B": "cloth",
                       "team": "cloth"})}}

HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
HL = (0.0, K.ARM_Y["l"], K.HAND_Z)
BLADE = 22.0
TIP_R = (HR[0] + 3.0, HR[1] - 1.0, HR[2] + 5.0 + BLADE)
MID_R = (HR[0] + 0.8, HR[1] - 1.0, HR[2] + 5.0 + BLADE * 0.45)
TIP_L = (HL[0] + 3.0, HL[1] - 1.0, HL[2] + 5.0 + BLADE)
MID_L = (HL[0] + 0.8, HL[1] - 1.0, HL[2] + 5.0 + BLADE * 0.45)


def _blade(rig, joint, h, y_off, bright=True):
    hx, hy, hz = h
    g = Geo().capsule((hx, hy, hz - 3.2), (hx, hy, hz + 4.0), 1.4)
    rig.part(joint, g, K.VOID_LT, outline=0.8)
    g = Geo().blob((hx, hy, hz + 4.6), (4.2, 2.4, 1.4), p=2.6)
    rig.part(joint, g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # a curved blade: segments bending forward
    g, c = Geo(), Geo()
    pts = [(hx + 3.0 * (t ** 2), hz + 5.0 + BLADE * t) for t in (0.0, 0.25, 0.5, 0.75, 1.0)]
    for i, ((x0, z0), (x1, z1)) in enumerate(zip(pts, pts[1:])):
        w0, w1 = 2.8 - 0.55 * i, 2.8 - 0.55 * (i + 1)
        g.capsule((x0, hy + y_off, z0), (x1, hy + y_off, z1), max(0.4, w0), max(0.3, w1), segs=10, rings=2)
        c.capsule((x0 + 0.4, hy + y_off - 1.0, z0), (x1 + 0.4, hy + y_off - 1.0, z1), max(0.3, w0 * 0.45),
                  max(0.2, w1 * 0.45), segs=8, rings=2)
    rig.part(joint, g, glow=K.MINT if bright else "#36C99E", outline=1.0, outline_hex="#1C8A6A")
    rig.part(joint, c, glow=K.MINT_CORE, outline=0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KC.skeleton_v3(rig, head=(2, 0, 38))
    # legs (walk v3): slim void legs, violet shin guards, soft void boots on the foot joints
    KC.legs_v3(rig, boot=K.VOID_LT, knee=None, thigh_r=4.2, toe=K.VIOLET)
    from ageborn_art import colors as CO
    for s in ("r", "l"):
        y = K.LEG_Y * K.SIDE_Y[s]
        g = Geo().blob((2.0, y, 8.8), (3.2, 4.0, 3.2), p=2.6)
        rig.part(f"shin_{s}", g, K.VIOLET if s == "r" else CO.scale(K.VIOLET, 0.8), finish="gloss")
    rig.joint("blade_r", "hand_r", HR)
    rig.joint("blade_l", "hand_l", HL)
    _blade(rig, "blade_l", HL, -2.0, bright=False)
    K.arm_parts(rig, "l", sleeve=K.VOID, bracer=K.VIOLET, glove=K.VOID_LT, r0=3.6, r1=3.2, fist=3.8)

    # cloak: team outside, trailing from the shoulders; the turned-up hem shows the starry lining
    rig.secondary("cloak", "torso", (-6.0, 0, 38.0), (-16.0, 0, 8.0), max_deg=18, gain=1.2)
    g = Geo().blob((-11.0, 0.5, 23.0), (4.0, 13.0, 16.5), p=2.8, taper=(1.45, 0.75), shift=(-0.3, 0))
    rig.part("cloak", g, team=True)
    g = Geo().blob((-14.0, -1.5, 9.0), (4.2, 14.4, 3.2), p=2.6, rot=(0, -14, 0))
    rig.part("cloak", g, K.VOID, finish="matte")
    # the near half of the cloak is thrown open toward the camera: a big void lining panel from
    # the shoulder to the hem, scattered with star-white specks and one mint star
    lin = [(-3.0, 37.0), (-7.0, 30.0), (-10.0, 20.0), (-12.0, 10.0), (-17.0, 6.5), (-24.0, 7.5), (-22.0, 16.0),
           (-18.0, 27.0), (-11.0, 36.0)]
    g = Geo().slab(lin, -13.6, 1.6)
    rig.part("cloak", g, K.VOID, outline_hex=K.VOID_DK)
    g = Geo().slab([(-3.0, 38.5), (-11.8, 37.4), (-19.8, 28.0), (-24.2, 16.0), (-26.8, 6.8), (-23.4, 4.6),
                    (-21.0, 15.6), (-17.2, 26.2), (-10.6, 34.4), (-3.4, 34.8)], -13.0, 1.8)
    rig.part("cloak", g, team=True, outline=0.6)                       # the team outer edge folds over
    g = Geo()
    for (x, z, r) in ((-9.0, 30.0, 1.5), (-14.5, 24.0, 1.9), (-11.5, 17.0, 1.3), (-17.5, 13.0, 1.6),
                      (-20.5, 9.2, 1.2), (-15.0, 9.0, 1.1), (-7.8, 23.0, 1.0)):
        g.star((x, -15.2, z), r * 1.4, r * 0.55, 0.8, points=4)
    rig.part("cloak", g, glow=K.STAR, outline=0)
    g = Geo().star((-12.0, -15.2, 12.5), 2.2, 0.9, 0.8, points=4)
    rig.part("cloak", g, glow=K.MINT, outline=0)

    # lean torso: void suit, a team sash across the chest, violet belt
    g = Geo().blob((0, 0, 28), (8.4, 8.4, 11.0), p=2.4, taper=(0.9, 1.05))
    g.blob((0, 0, 17.5), (7.6, 8.2, 4.0), p=2.6)
    rig.part("torso", g, K.VOID)
    g = Geo().blob((1.4, 0, 29.0), (8.8, 9.0, 3.9), p=2.6, rot=(0, 34, 0))
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().blob((0.4, 0, 21.8), (8.9, 8.9, 2.0), p=3.4)
    rig.part("torso", g, K.VIOLET, finish="gloss")
    g = Geo().blob((-4.0, -8.8, 20.0), (2.4, 1.8, 2.6), p=3.2)
    rig.part("torso", g, K.VOID_LT, outline=0.6)                          # a belt pouch
    g = Geo().star((5.2, -7.8, 29.6), 2.6, 1.1, 1.0, points=5, rot=(0, -30, 0))
    rig.part("torso", g, KC.STAR_PALE, outline=0.5, outline_hex=K.STAR_TRIM)
    g = Geo().blob((8.8, -2.0, 21.8), (1.3, 2.0, 1.3), p=2.4)
    rig.part("torso", g, glow=K.MINT, outline=1.0, outline_hex=K.VOID)

    # hood: pointed, violet, over a dark mask with two mint eyes; mask lower half
    g = Geo().blob((1.5, 0, 49.5), (11.8, 11.0, 12.0), p=2.4)
    g.clip((8.8, 0, 48.0), (1, 0, 0.2))
    rig.part("head", g, K.VIOLET, outline_hex=K.VIOLET_DK)
    rig.secondary("hood_tip", "head", (-5.0, 0, 55.0), (-15.0, 0, 60.0), max_deg=18, gain=1.3)
    g = Geo().capsule((-3.0, 0, 54.0), (-15.0, 0, 60.0), 8.4, 1.6, segs=18, rings=4)
    g.clip((8.8, 0, 48.0), (1, 0, 0.2))
    rig.part("hood_tip", g, K.VIOLET, outline_hex=K.VIOLET_DK)
    g = Geo().blob((3.8, 0, 48.5), (9.8, 8.8, 9.4), p=2.4)
    rig.part("head", g, K.VISOR, finish="gloss", outline_hex=K.VOID)
    g = Geo().blob((7.0, 0, 43.6), (7.2, 8.6, 3.6), p=2.4)
    rig.part("head", g, K.VOID_LT, finish="gloss")
    mask = Geo().blob((3.8, 0, 48.5), (10.1, 9.1, 9.7), p=2.4)
    mask.clip((6.0, 0, 0), (-1, 0, 0)).clip((0, 0, 53.4), (0, 0, 1)).clip((0, 0, 45.6), (0, 0, -1))
    KF.visor_face(rig, "head", [mask], (12.6, 49.6), eye_dx=(0.0, 3.6), eye_rx=1.9, eye_rz=2.2, color=K.MINT,
                  core=K.MINT_CORE, tilt=-12.0)
    rig.part("head", mask, K.VISOR, finish="gloss", outline=0.4, outline_hex=K.VOID)
    # team hood rim
    g = Geo().lathe([(8.0, -1.4), (10.8, -1.2), (11.2, 1.0), (8.0, 1.2)], (9.4, 0, 48.6), (10.4, 0, 48.9),
                    segs=22, squash=(1.2, 0.95))
    rig.part("head", g, team=True, outline=0.6)

    K.arm_parts(rig, "r", sleeve=K.VOID, bracer=K.VIOLET, glove=K.VOID_LT, r0=3.6, r1=3.2, fist=3.8)
    # small team shoulder guard on the near arm
    g = Geo().blob((0.5, K.ARM_Y["r"] - 0.3, 37.4), (5.8, 5.0, 4.6), p=2.6)
    rig.part("arm_r", g, team=True)
    _blade(rig, "blade_r", HR, -2.0)
    rig.track("bladeTip", "blade_r", TIP_R)
    K.sparks(rig, "blade_r", (TIP_R[0], TIP_R[1] - 1.0, TIP_R[2] - 4.0), color=K.MINT, size=1.3, name="sparks")
    # the blink-out flash (on the root, so it does not shrink with the body)
    at = (0.0, -6.0, 30.0)
    rig.joint("blink", "root", at, hidden=True)
    g = Geo().star((at[0], at[1] - 4.0, at[2]), 22.0, 5.0, 1.6, points=4)
    rig.part("blink", g, glow=K.VIOLET_GLOW, outline=0)
    g = Geo()
    for i in range(8):
        a = 2 * math.pi * (i + 0.5) / 8
        g.sphere((at[0] + 16.0 * math.cos(a), at[1] - 5.0, at[2] + 16.0 * math.sin(a)), 1.4, cuts=2)
    rig.part("blink", g, glow=K.STAR, outline=0)
    def ring():
        return Geo().lathe([(9.0, -1.6), (12.0, -1.6), (12.6, 0), (12.0, 1.6), (9.0, 1.6)], (at[0], at[1] - 3.0, at[2]),
                           (at[0], at[1] - 4.0, at[2]), segs=28)
    rig.part("blink", ring(), team=True, outline=0.6)   # a team ring keeps the team cue to the end
    # (r38b) the flash in layers: an inner star over the violet one, eight team-dark joints round the team ring, and
    # the core as a glow in three steps toward a white heart (the blink-out frames were flat glow discs: micro 2.0-2.7)
    g = Geo().star((at[0], at[1] - 4.6, at[2]), 13.0, 2.8, 1.6, points=4)
    rig.part("blink", g, glow=BLINK_MID, outline=0)
    rf = FC.Face(rig, "blink", [ring()])
    FW.folds(rig, "blink", rf, [[FW.sc(rf, at[0] + 9.4 * math.cos(math.radians(a)), at[2] + 9.4 * math.sin(math.radians(a)),
                                       at[1] - 4.4),
                                 FW.sc(rf, at[0] + 12.2 * math.cos(math.radians(a)), at[2] + 12.2 * math.sin(math.radians(a)),
                                       at[1] - 4.4)] for a in range(22, 360, 45)], w=0.9, team=True)
    rig.joint("blink_core", "root", at, hidden=True)
    # (each step's front stands proud of the one behind it: r38c set them inside the outer sphere, a flat violet disc)
    for r, dy, col in ((7.0, 7.0, K.VIOLET_GLOW), (5.2, 9.6, BLINK_MID), (3.4, 11.8, K.VIOLET_CORE), (1.7, 13.6, K.WHITE)):
        g = Geo().sphere((at[0], at[1] - dy, at[2]), r, cuts=4)
        rig.part("blink_core", g, glow=col, outline=0)
    _detail(rig)
    if getattr(rig, "skin", None) == SH:
        _shadow(rig)
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _detail(rig):
    """W4: the team cloak's folds and a seam along its turned edge (team-dark), the sash's seam, the suit's creases,
    the hood's folds, the shin guards' seams, the legs' creases and the sleeves' (char space; decals cast)."""
    cl = FC.Face(rig, "cloak", [Geo().blob((-11.0, 0.5, 23.0), (4.0, 13.0, 16.5), p=2.8, taper=(1.45, 0.75),
                                           shift=(-0.3, 0))])
    FW.folds(rig, "cloak", cl, [[FW.sc(cl, -13.0, 36.0, -10.4), FW.sc(cl, -16.0, 24.0, -12.0), FW.sc(cl, -19.0, 12.0, -12.6)]],
             w=0.8, team=True)
    edge = FC.Face(rig, "cloak", [Geo().slab([(-3.0, 38.5), (-11.8, 37.4), (-19.8, 28.0), (-24.2, 16.0), (-26.8, 6.8),
                                              (-23.4, 4.6), (-21.0, 15.6), (-17.2, 26.2), (-10.6, 34.4), (-3.4, 34.8)],
                                             -13.0, 1.8)])
    FW.folds(rig, "cloak", edge, [[FW.sc(edge, -6.0, 36.4, -14.0), FW.sc(edge, -14.6, 33.0, -14.0),
                                   FW.sc(edge, -21.0, 21.6, -14.0), FW.sc(edge, -24.4, 10.6, -14.0)]], w=0.7, team=True)
    sash = FC.Face(rig, "torso", [Geo().blob((1.4, 0, 29.0), (8.8, 9.0, 3.9), p=2.6, rot=(0, 34, 0))])
    FW.folds(rig, "torso", sash, [[FW.sc(sash, -4.0, 33.0, -8.6), FW.sc(sash, 1.0, 29.6, -9.0), FW.sc(sash, 6.0, 26.4, -8.0)]],
             w=0.7, team=True)
    suit = FC.Face(rig, "torso", [Geo().blob((0, 0, 28), (8.4, 8.4, 11.0), p=2.4, taper=(0.9, 1.05))])
    FW.folds(rig, "torso", suit, [[FW.sc(suit, -5.0, 24.6, -7.2), FW.sc(suit, -1.0, 23.8, -8.4), FW.sc(suit, 3.0, 24.4, -8.0)],
                                  # (r38: two more: down the suit's side and across the chest under the sash)
                                  [FW.sc(suit, -4.4, 34.0, -6.8), FW.sc(suit, -5.6, 29.0, -6.6), FW.sc(suit, -4.6, 25.8, -7.0)],
                                  [FW.sc(suit, 1.0, 34.8, -8.0), FW.sc(suit, 4.4, 35.2, -7.2), FW.sc(suit, 6.8, 34.0, -5.6)]],
             w=0.8, team=False, fill=FW.FOLD_ON_VOID)
    hc, hr = (1.5, 0, 49.5), (11.8, 11.0, 12.0)
    hood = FC.Face(rig, "head", [Geo().blob(hc, hr, p=2.4)])
    # (r38: four more of the hood's folds, over the crown, down its back and its side, and one along the tip)
    FW.panel_lines(rig, "head", hood, [[FW.sc(hood, -3.0, 59.0, -8.0), FW.sc(hood, -6.6, 52.0, -9.6),
                                        FW.sc(hood, -6.0, 45.0, -9.0)]] +
                   [[FW.on_blob(hood, hc, hr, x, z, p=2.4) for x, z in pts] for pts in (
                       ((3.0, 60.2), (-1.0, 59.0), (-4.6, 56.4)), ((-0.4, 55.6), (-2.2, 50.2), (-1.4, 44.4)),
                       ((-9.0, 56.8), (-10.6, 50.4)), ((4.6, 57.6), (2.8, 52.6), (3.6, 47.4)))],
                   fill=FW.LINE_ON_VIOLET, w=0.75)
    tf = FC.Face(rig, "hood_tip", [Geo().capsule((-3.0, 0, 54.0), (-15.0, 0, 60.0), 8.4, 1.6, segs=18, rings=4)])
    FW.panel_lines(rig, "hood_tip", tf, [[FW.sc(tf, -4.0, 60.6, -6.6), FW.sc(tf, -9.4, 60.4, -4.4),
                                          FW.sc(tf, -13.6, 60.4, -2.0)]], fill=FW.LINE_ON_VIOLET, w=0.75)
    # (r38) the mask: a brow seam over the eyes and a cheek seam under them (one flat black field in every frame)
    mc, mr = (3.8, 0, 48.5), (10.1, 9.1, 9.7)
    mf = FC.Face(rig, "head", [Geo().blob(mc, mr, p=2.4)])
    FW.panel_lines(rig, "head", mf, [[FW.on_blob(mf, mc, mr, x, z, p=2.4) for x, z in pts] for pts in (
        ((8.6, 46.6), (11.0, 46.0), (13.0, 46.6)), ((8.4, 52.6), (10.6, 52.9), (12.6, 52.4)))], fill=FACE_LINE, w=0.8)
    # (r38) nebula wisps across the thrown-open starry lining (its void read as one flat field at 1x)
    lf = FC.Face(rig, "cloak", [Geo().slab([(-3.0, 37.0), (-7.0, 30.0), (-10.0, 20.0), (-12.0, 10.0), (-17.0, 6.5),
                                            (-24.0, 7.5), (-22.0, 16.0), (-18.0, 27.0), (-11.0, 36.0)], -13.6, 1.6)])
    FW.panel_lines(rig, "cloak", lf, [[FW.sc(lf, x, z, -14.4) for x, z in pts] for pts in (
        ((-7.4, 33.0), (-10.6, 27.0), (-12.6, 20.4), (-14.4, 13.6)), ((-12.6, 31.4), (-15.4, 25.0), (-18.0, 18.0), (-19.4, 11.6)),
        ((-16.4, 9.8), (-19.8, 13.2), (-21.4, 17.4)), ((-10.4, 15.0), (-13.4, 11.6), (-17.6, 9.0)))], fill=NEBULA, w=1.0)
    # (r38) creases across the team edge that folds over the lining (the cloak's outside sits behind the lining)
    FW.folds(rig, "cloak", edge, [[FW.sc(edge, x0, z0, -14.0), FW.sc(edge, x1, z1, -14.0)] for (x0, z0), (x1, z1) in (
        ((-7.2, 35.2), (-7.6, 37.8)), ((-15.2, 29.6), (-17.0, 31.8)), ((-20.2, 19.6), (-22.8, 21.0)),
        ((-22.4, 9.6), (-25.2, 10.4)))], w=0.7, team=True)
    for s in ("r", "l"):
        y = K.LEG_Y * K.SIDE_Y[s]
        FW.band(rig, f"shin_{s}", (2.0, y, 8.8), (3.2, 4.0, 3.2), 2.6, 7.8, 8.5, fill=FW.LINE_ON_VIOLET)
    FW.cosmic_legs(rig, team_shin=False, boot_line=FW.FOLD_ON_VOID)
    # (r38c) a second crease down each thigh and one across each shin (the void legs: r38b sat at micro 4.299 / 4.28)
    for s in ("r", "l"):
        y = K.LEG_Y * K.SIDE_Y[s]
        th = FC.Face(rig, f"thigh_{s}", [Geo().capsule((0, y, KC.V3_THIGH_Z + 0.5), (0.5, y, KC.V3_KNEE_Z), 4.2, 3.7)])
        FW.folds(rig, f"thigh_{s}", th, [[FW.sc(th, -2.0, KC.V3_THIGH_Z - 0.6, y - 3.6), FW.sc(th, 0.6, KC.V3_THIGH_Z - 2.6, y - 4.0),
                                          FW.sc(th, 2.6, KC.V3_THIGH_Z - 2.0, y - 3.6)]], w=0.8, team=False, fill=FW.FOLD_ON_VOID)
        sh_ = FC.Face(rig, f"shin_{s}", [Geo().capsule((0.5, y, KC.V3_KNEE_Z), (1.0, y, KC.V3_ANKLE_Z + 0.8), 3.3, 3.3)])
        zm = (KC.V3_KNEE_Z + KC.V3_ANKLE_Z) / 2 + 1.2
        FW.folds(rig, f"shin_{s}", sh_, [[FW.sc(sh_, -2.2, zm + 0.6, y - 2.6), FW.sc(sh_, 0.6, zm - 0.4, y - 3.2),
                                          FW.sc(sh_, 3.0, zm + 0.4, y - 2.6)]], w=0.8, team=False, fill=FW.FOLD_ON_VOID)


def _shadow(rig):
    """The Shadow Stalker's sign: ghost wisps streaming back from the hood's tip and the cloak's hem (tapered, in a mid
    ghost lilac), and a pale glowing seam along the hood's edge and the thrown-open cloak's inner edge. (r38: the wisps
    a third shorter, the sheet's pixels at 1.050 x the reference against 1.02; the cloak's seam moved off its team
    edge to the lining's inner edge and the hood's ring just outside its team rim: they hid team, the fill at 16.6%.)"""
    # (r38b: the wisps stream from the hood's tip only, forked; the hem's wisps sat in the blade tips' parity discs on
    # the walk and the spin, weapon IoU 0.79-0.82 against 0.85)
    g = Geo()
    for pts, r0 in (([(-15.0, 0.0, 60.0), (-19.0, -1.0, 62.0), (-22.6, -1.0, 61.2), (-25.0, -1.0, 62.8)], 1.5),
                    ([(-14.0, 0.0, 58.0), (-17.6, -1.0, 57.0), (-20.8, -1.0, 57.8), (-23.0, -1.0, 56.6)], 1.2)):
        n = len(pts) - 1
        for i, (a, b) in enumerate(zip(pts, pts[1:])):
            g.capsule(a, b, r0 * (1 - 0.8 * i / n), r0 * (1 - 0.8 * (i + 1) / n), segs=8, rings=2)
    rig.part("hood_tip", g, glow=SH_WISP, outline=0.6, outline_hex=SH_VIO_DK)
    g = Geo()
    edge = [(-3.0, 37.0), (-7.0, 30.0), (-10.0, 20.0), (-12.0, 10.0), (-17.0, 6.5)]
    for (x0, z0), (x1, z1) in zip(edge, edge[1:]):
        g.capsule((x0, -14.6, z0), (x1, -14.6, z1), 0.5, segs=6, rings=1)
    rig.part("cloak", g, glow=SH_GLOW_DK, outline=0)
    g = Geo().lathe([(11.3, -0.3), (11.8, -0.2), (11.8, 0.2), (11.3, 0.3)], (9.9, 0, 48.75), (10.9, 0, 49.05), segs=22,
                    squash=(1.2, 0.95))
    rig.part("head", g, glow=SH_GLOW_DK, outline=0)
    # (r38d) the ghostly edge down the near sleeve and the near leg: thin pale seams, the shadow body's glowing edge
    ya = K.ARM_Y["r"]
    sl = FC.Face(rig, "arm_r", [Geo().capsule((0, ya, K.SHOULDER_Z), (0, ya, K.ELBOW_Z), 4.0, 3.7)])
    FW.glow_seam(rig, "arm_r", sl, [FW.sc(sl, 2.6, K.SHOULDER_Z - 2.0, ya - 3.0), FW.sc(sl, 3.0, K.ELBOW_Z + 1.0, ya - 2.8)],
                 color=SH_GLOW_DK, w=0.5)
    y = -K.LEG_Y
    th = FC.Face(rig, "thigh_r", [Geo().capsule((0, y, KC.V3_THIGH_Z + 0.5), (0.5, y, KC.V3_KNEE_Z), 4.2, 3.7)])
    FW.glow_seam(rig, "thigh_r", th, [FW.sc(th, 3.2, KC.V3_THIGH_Z - 0.4, y - 2.6), FW.sc(th, 3.4, KC.V3_KNEE_Z + 1.0, y - 2.4)],
                 color=SH_GLOW_DK, w=0.5)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, energy: a flicker, motes drifting off; the cloth tears): the hood, the
    team cloak (a strip), the team shoulder guard, the near shin guard; motes off the hood. (r38: the shoulder guard
    for the sash, which the arms and the blades hid: seen 40%.)"""
    rig.damage_spot_at("hood", "head", -6.0, 50.0, 5.0, "cloth", fill=K.VIOLET)
    rig.damage_spot("cloak", "cloak", (-14.0, -12.4, 20.0), 6.0, "cloth", kind="strip", team=True, normal=(-0.3, -1, 0))
    rig.damage_spot("guardpad", "arm_r", (0.5, K.ARM_Y["r"] - 0.3 - 4.8, 38.4), 5.0, "cloth", team=True,
                    normal=(0, -1, 0.3))
    rig.damage_spot("guard", "shin_r", (2.0, -K.LEG_Y - 3.8, 8.8), 5.0, "metal", normal=(0, -1, 0))
    rig.damage_spot("motes", "head", (-6.0, -2.0, 60.0), 4.0, "motes", kind="emit", normal=(0, 0, 1))


# -- poses -----------------------------------------------------------------------------------
def blades(ra, rf, rw, la, lf, lw):
    return merge(K.arm("r", ra, rf, rw, 90.0), K.arm("l", la, lf, lw, 90.0))


def blades_at(hr, wr, hl, wl):
    """Hands at torso-space targets, blades pointing wr / wl (torso degrees)."""
    a, f = K.ik2(K.SH, hr)
    b, g = K.ik2(K.SH, hl)
    return blades(a, f, wr, b, g, wl)


CROUCH = {"hips": {"z": -2.0}, "torso": {"r": -14}, "head": {"r": 10, "x": 1.0},
          "thigh_r": {"r": 18}, "shin_r": {"r": -26}, "thigh_l": {"r": -2}, "shin_l": {"r": -22}}
ARMS = blades(-55, -10, 20, -40, 5, 40)
STANCE = merge(ARMS, CROUCH)


def _squeeze(sx, sz):
    """Body squeezed thin (sx) and tall (sz) about the belly."""
    off = M.about((0, 0, 28), sx=sx, sy=sx, sz=sz)
    return {"body": dict(off, sx=sx, sy=sx, sz=sz)}


def _idle(f):
    def extra(ctx):
        return {"arm_r": {"r": 3.0 * ctx["lag"]}, "arm_l": {"r": -2.5 * ctx["lag"]}}
    pose = M.idle_v2(f, STANCE, frames=6, bob=1.0, chest=0.035, extra=extra, blink=5,
                     face_blink=KF.glyph("g_blink"))
    # twirls the near blade in his fingers (a full turn over frames 1-4)
    pose["hand_r"] = dict(pose.get("hand_r", {}), r=pose.get("hand_r", {}).get("r", 0.0) + [0, 80, 170, 260, 340, 360][f])
    if f == 3:
        # the flicker: squeezed a little thin for a frame
        pose = merge(pose, _squeeze(0.9, 1.06))
    return pose


# -- walk v3: G1 ninja sprint at ground speed (card 100 x 1.25 = 125 lu/s), 8 x 64 ms -------------
SPEED = 125.0
LEGS = KC.legs_ik()
GAIT = KC.jog_gait(LEGS, SPEED, cycle_ms=512, stance=0.32, lift=7.0, x_mid=3.5)
SPRINT_BOB = [-7.4, -8.0, -3.4, -0.6]       # hips low (a hunched sprint), the bounce on top
# walk carry: both arms swept back, the reversed blades trailing level behind him
CARRY = merge(blades(-132, -112, 192, -124, -100, 186), {"head": {"r": 10, "x": 1.0}})


# (r38c) both feet plant 0.8 lu below their shipped ground height on the walk: the outline v4, thinner than the shipped
# outline, raised the soles' lowest row a pixel at check_walk's phone scale, so its sole band rose into the legs
# where they meet (walk 01) and lost the front foot in the flight frame (walk 03): apart on 3 of 8 frames against the
# shipped 5 (r38b's 0.4 lu deeper soles changed nothing: a foot's own sole sets its lowest row). Look-dev (S/w4/futcos/
# ld/_wsdrop1-4): 0.6 or 0.8 on both feet brings back the shipped five (00, 01, 03, 04, 07); the far foot alone does not.
NEAR_DROP, FAR_DROP = 0.8, 0.8


def _gait():
    if not (NEAR_DROP or FAR_DROP):
        return GAIT
    import copy
    g = copy.copy(GAIT)
    g.feet = dict(GAIT.feet)
    for k, d in (("r", NEAR_DROP), ("l", FAR_DROP)):
        leg, ph, x, gz = g.feet[k]
        g.feet[k] = (leg, ph, x, gz - d)
    return g


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = math.cos(ctx["lag_p"])
        return {"arm_r": {"r": 5 * c + 3 * lag}, "hand_r": {"r": -6 * lag}, "arm_l": {"r": -5 * c + 3 * lag},
                "hand_l": {"r": -6 * lag}, "cloak": {"r": 0.0}, "hood_tip": {"r": 0.0}}
    return M.walk_v3(RIG, f, CARRY, _gait(), legs=LEGS, bob=SPRINT_BOB, lean=-20.0, twist=8.0, nod=3.0,
                     extra=extra, report=report)


# -- attack: blink X-slash (680 ms, impact at 290 ms) -------------------------------------------------
#       read  dip   blink HOLD  smear lead  IMPACT over  recoil settle settle
BX = [0.0, -1.0, -1.0, 9.0, 11.0, 12.0, 13.0, 13.0, 9.0, 4.0, 1.0]
BZ = [-0.5, -3.0, 0.0, 9.0, 5.0, 2.0, -2.5, -2.0, 3.5, 0.0, 0.0]
BQ = [-0.04, -0.12, 0.0, 0.08, 0.06, 0.0, -0.16, -0.10, 0.06, -0.04, 0.0]
TR = [-16, -22, -10, 4, -14, -22, -30, -30, -18, -16, -14]
HD = [10, 14, 6, 2, 8, 12, 16, 14, 10, 10, 10]
THR = [20, 34, 10, 40, 30, 30, 44, 42, 20, 20, 18]
SHR = [-30, -50, -10, -70, -40, -34, -44, -40, -20, -26, -26]
THL = [-2, 18, 0, 30, 10, -6, -16, -14, 10, 0, -2]
SHL = [-24, -48, -8, -70, -40, -24, -20, -18, -30, -22, -22]
# hand targets (torso x, z) and blade directions in WORLD degrees
HRT = [(6.0, 25.0), (2.0, 23.0), (1.0, 28.0), (-3.0, 46.0), (9.0, 40.0), (13.0, 34.0), (13.0, 27.0),
       (13.5, 26.0), (10.0, 28.0), None, None]
HLT = [(4.0, 26.0), (0.0, 24.0), (0.0, 28.0), (-6.0, 44.0), (7.0, 44.0), (12.0, 39.0), (13.5, 33.0),
       (14.0, 32.0), (9.0, 30.0), None, None]
WR = [30.0, 10.0, 60.0, 150.0, 70.0, 10.0, -40.0, -46.0, -10.0, None, None]
WL = [60.0, 40.0, 80.0, 110.0, 40.0, 10.0, 34.0, 38.0, 40.0, None, None]
SQUEEZE = [None, None, (0.42, 1.5), None, None, None, None, None, None, None, None]
EYES = ["g_angry", "g_squint", "g_squint", "g_angry", "g_angry", "g_angry", "g_angry", "g_angry", "eyes",
        "eyes", "eyes"]


def _attack_pose(f):
    if HRT[f] is not None:
        arms = blades_at(HRT[f], WR[f] - TR[f], HLT[f], WL[f] - TR[f])
    else:
        arms = ARMS
    pose = merge(arms, {
        "hips": {"z": -2.0}, "torso": {"r": TR[f]}, "head": {"r": HD[f], "x": 1.0},
        "thigh_r": {"r": THR[f]}, "shin_r": {"r": SHR[f]},
        "thigh_l": {"r": THL[f]}, "shin_l": {"r": SHL[f]},
    }, M.body_about((0, 0, 28), x=BX[f], z=BZ[f], q=BQ[f]))
    if SQUEEZE[f]:
        sx, sz = SQUEEZE[f]
        pose = merge(pose, _squeeze(sx, sz))
    if f == 2:
        pose["blink"] = {"show": True, "s": 0.55}
    if f == 3:
        pose["blink"] = {"show": True, "s": 0.3, "x": -9.0}
    pose = merge(pose, KF.glyph(EYES[f]))
    if f in (2, 3):             # squeezed thin, or in the air after the blink: no planting
        return pose
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_clip():
    arc_r = {"kind": "arc", "joint": "blade_r", "inner": MID_R, "outer": TIP_R, "color": FW.fx(RIG, SKINS, K.MINT), "white": 0.35,
             "taper": 0.3, "lines": 2, "from": 3}
    arc_l = {"kind": "arc", "joint": "blade_l", "inner": MID_L, "outer": TIP_L, "color": FW.fx(RIG, SKINS, K.MINT), "white": 0.45,
             "taper": 0.3, "lines": 1, "from": 3}
    ov = {
        1: [{"kind": "dust", "ground": (-4.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 6, "spread": 0.8,
             "color": "#DCD6E8"}],
        4: FW.smear_soft(dict(arc_l, t0=0.0, t1=1.0)) + FW.smear_soft(dict(arc_r, t0=0.0, t1=1.0)),
        5: FW.smear_soft(dict(arc_l, t0=0.3, t1=1.0)) + FW.smear_soft(dict(arc_r, t0=0.3, t1=1.0)),
        6: [{"kind": "burst", "joint": "blade_r", "point": MID_R, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6,
             "a0": -80.0, "arc": 160.0, "color": FW.fx(RIG, SKINS, K.MINT_CORE)},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 4, "spread": 0.9,
             "color": "#DCD6E8"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov)


# -- variants: A's 680 ms, impact at 290 ms, in 10 steps (pre-impact 40+60+115+45+30 = 290) --------
V_MS = [40, 60, 115, 45, 30, 120, 60, 50, 70, 90]
V_IMPACT = 5


def _v_pose(hr, wr, hl, wl, tr, tz, bx, bz, bq, thr, shr, thl, shl, eyes, rz=0.0, plant=True):
    pose = merge(blades_at(hr, wr - tr, hl, wl - tr), {
        "hips": {"z": -2.0}, "torso": {"r": tr, "rz": tz}, "head": {"r": -0.5 * tr + 4, "rz": -0.5 * tz, "x": 1.0},
        "thigh_r": {"r": thr}, "shin_r": {"r": shr},
        "thigh_l": {"r": thl}, "shin_l": {"r": shl},
    }, M.body_about((0, 0, 28), x=bx, z=bz, q=bq, rz=rz))
    pose = merge(pose, KF.glyph(eyes))
    return KI.ground_feet(RIG, pose, LEGS) if plant else pose


# attack B: double slash. 0 sink, 1 wind, 2 HOLD (crouched low, turned away, both blades cocked back
# past the far hip), 3 smear, 4 lead, 5 IMPACT (both blades level out at the target, a long lunge),
# 6 over, 7 recoil, 8-9 = A settle
#        near hand    near w  far hand     far w   tr   tz   bx    bz    bq     thr  shr  thl  shl  eyes
B_T = [((2.0, 25.0), 150.0, (0.0, 26.0), 160.0, -16, 14, -0.5, -2.0, -0.05, 22, -32, -4, -26, "g_angry"),
       ((-6.0, 25.0), 175.0, (-7.0, 27.0), 182.0, -14, 30, -1.5, -4.0, -0.09, 30, -42, -6, -34, "g_angry"),
       ((-9.0, 26.0), 186.0, (-10.0, 28.0), 192.0, -12, 38, -2.0, -5.0, -0.11, 34, -46, -8, -38, "g_squint"),
       ((6.0, 28.0), 70.0, (4.0, 30.0), 90.0, -20, 10, 5.0, -3.5, 0.05, 34, -36, -14, -26, "g_angry"),
       ((12.0, 29.0), 20.0, (10.0, 31.0), 36.0, -24, -8, 9.0, -3.5, 0.05, 40, -38, -18, -24, "g_angry"),
       ((14.0, 28.0), -4.0, (13.0, 31.0), 8.0, -28, -18, 12.0, -4.0, -0.15, 44, -42, -22, -20, "g_angry"),
       ((14.5, 27.5), -10.0, (13.5, 30.0), 0.0, -28, -22, 12.5, -3.5, -0.08, 44, -40, -22, -18, "g_angry"),
       ((10.0, 28.0), 20.0, (9.0, 30.0), 36.0, -20, -8, 8.0, -1.5, 0.02, 30, -30, -10, -22, "eyes")]


def _b_pose(i):
    if i in (8, 9):
        return _attack_pose(i + 1)
    return _v_pose(*B_T[i])


def _attack_b():
    arc_r = {"kind": "arc", "joint": "blade_r", "inner": MID_R, "outer": TIP_R, "color": FW.fx(RIG, SKINS, K.MINT), "white": 0.35,
             "taper": 0.3, "lines": 2}
    arc_l = {"kind": "arc", "joint": "blade_l", "inner": MID_L, "outer": TIP_L, "color": FW.fx(RIG, SKINS, K.MINT), "white": 0.45,
             "taper": 0.3, "lines": 1}
    ov = {
        2: [{"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 51, "spread": 0.8,
             "color": "#DCD6E8", "dir": -1.0}],
        3: FW.smear_soft(dict(arc_l, **{"from": 2, "t0": 0.0, "t1": 1.0})) + FW.smear_soft(dict(arc_r, **{"from": 2, "t0": 0.0, "t1": 1.0})),
        4: FW.smear_soft(dict(arc_l, **{"from": 2, "t0": 0.4, "t1": 1.0})) + FW.smear_soft(dict(arc_r, **{"from": 2, "t0": 0.4, "t1": 1.0})),
        5: [dict(arc_r, **{"from": 3, "t0": 0.3, "t1": 1.0}),
            {"kind": "burst", "joint": "blade_r", "point": TIP_R, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6,
             "a0": -80.0, "arc": 160.0, "color": FW.fx(RIG, SKINS, K.MINT_CORE)},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 52, "spread": 0.9,
             "color": "#DCD6E8"}],
    }
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], V_MS, impact=V_IMPACT, smear=3, overlays=ov,
                  reuse={8: ("attack", 9), 9: ("attack", 10)}, extra={"holdStep": 2})


# attack C: spin. 0 sink, 1 coil, 2 HOLD (coiled deep, the near blade low behind, the far blade high in
# front), 3-4 a full turn (ring smears), 5 IMPACT (landed, both blades level out), 6 over, 7 recoil,
# 8-9 = A settle
C_T = [((2.0, 24.0), -120.0, (5.0, 30.0), 50.0, -18, 12, -1.0, -3.0, -0.06, 24, -36, -4, -28, "g_angry"),
       ((-6.0, 22.0), -150.0, (8.0, 34.0), 62.0, -16, 26, -2.0, -6.0, -0.10, 34, -48, -8, -40, "g_angry"),
       ((-9.0, 21.0), -160.0, (9.0, 36.0), 68.0, -14, 34, -2.5, -7.5, -0.12, 38, -54, -10, -44, "g_squint"),
       ((10.0, 30.0), 0.0, (-8.0, 30.0), 180.0, -10, 0, 2.0, 1.0, 0.08, 20, -28, -6, -22, "g_squint"),
       ((10.0, 30.0), 0.0, (-8.0, 30.0), 180.0, -10, 0, 4.0, 1.5, 0.06, 20, -28, -6, -22, "g_squint"),
       ((13.0, 29.0), -6.0, (-6.0, 30.0), 190.0, -24, -10, 6.0, -4.0, -0.15, 40, -40, -20, -22, "g_angry"),
       ((13.5, 28.5), -12.0, (-5.0, 29.0), 196.0, -24, -12, 6.5, -3.5, -0.07, 40, -38, -20, -20, "g_angry"),
       ((9.0, 28.0), 18.0, (2.0, 28.0), 120.0, -18, -4, 4.0, -1.5, 0.02, 28, -30, -8, -24, "eyes")]
C_RZ = [0, 0, -20, 120, 240, 360, 366, 362]


def _c_pose(i, rz=None, plant=True):
    if i in (8, 9):
        return _attack_pose(i + 1)
    return _v_pose(*C_T[i], rz=C_RZ[i] if rz is None else rz, plant=plant and i not in (3, 4))


def _attack_c():
    ring = {"kind": "arc", "joint": "blade_r", "inner": MID_R, "outer": TIP_R, "color": FW.fx(RIG, SKINS, K.MINT), "white": 0.35,
            "taper": 0.15, "band": 0.85, "lines": 2}
    # (r38f: the spin's rings two-tone and soft, as the slashes: one wide flat crescent per frame held the spin frames
    # at micro 3.5-3.6 and the skin's extras at 4.27)
    ov = {
        3: FW.smear_soft(dict(ring, **{"pose_from": _c_pose(3, rz=0.0, plant=False), "t0": 0.0, "t1": 1.0, "samples": 20})),
        4: FW.smear_soft(dict(ring, **{"pose_from": _c_pose(4, rz=110.0, plant=False), "t0": 0.0, "t1": 1.0,
                                       "samples": 20})),
        5: [dict(ring, **{"pose_from": _c_pose(5, rz=250.0, plant=False), "t0": 0.3, "t1": 1.0, "samples": 16,
                          "lines": 3}),
            {"kind": "burst", "joint": "blade_r", "point": TIP_R, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6,
             "a0": -80.0, "arc": 160.0, "color": FW.fx(RIG, SKINS, K.MINT_CORE)},
            {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 53, "spread": 0.9,
             "color": "#DCD6E8"}],
        2: [{"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 54, "spread": 0.8,
             "color": "#DCD6E8"}],
    }
    return M.clip("attack_c", [_c_pose(i) for i in range(10)], V_MS, impact=V_IMPACT, overlays=ov,
                  reuse={8: ("attack", 9), 9: ("attack", 10)}, extra={"holdStep": 2})


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return {"arm_r": {"r": 16 * a}, "arm_l": {"r": 14 * a}, "head": {"r": 14 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 16 * up}, "shin_r": {"r": -20 * up}}
    return M.hit_light(k, STANCE, recoil, face_hurt=KF.glyph("g_hurt"),
                       face_back=KF.glyph("g_angry") if k == 2 else None)


# death: a blink-out, not a fall. 0 struck (recoil), 1 folds in, 2-4 warps away: squeezed thin and
# shrinking into a violet flash, 5 a last spark as the flash closes (7 steps, 0.48 s, as shipped)
DIE_SEQ = [0, 1, 2, 3, 4, 5, 5]
DIE_MS = [60, 70, 60, 60, 60, 80, 90]


def _die(f):
    pose = merge(STANCE, {
        "body": {"x": pick(f, [-3, -4, -4, -4, -4, -4]), "z": pick(f, [1, 0, 6, 10, 13, 15]),
                 "r": pick(f, [12, 6, 0, 0, 0, 0]),
                 "s": pick(f, [1.0, 0.94, 0.72, 0.45, 0.18, 0.04]),
                 "sx": pick(f, [1.0, 1.06, 0.6, 0.45, 0.4, 1.0]), "sy": pick(f, [1.0, 1.06, 0.6, 0.45, 0.4, 1.0]),
                 "sz": pick(f, [1.0, 0.9, 1.35, 1.6, 1.8, 1.0])},
        "torso": {"r": pick(f, [16, 8, 0, 0, 0, 0])}, "head": {"r": pick(f, [14, 0, 0, 0, 0, 0])},
        "arm_r": {"r": pick(f, [60, 30, 10, 0, 0, 0])}, "arm_l": {"r": pick(f, [80, 40, 10, 0, 0, 0])},
        "blink": {"show": f >= 2, "s": pick(f, [1, 1, 0.7, 1.05, 1.3, 0.7])},
        "blink_core": {"show": f in (2, 3, 4), "s": pick(f, [1, 1, 0.8, 1.0, 1.1, 1])},
    })
    return merge(pose, KF.glyph("g_hurt" if f == 0 else "eyes_x"))


DIE_EXTRA = {"fx": [], "blinkOut": True, "hideUnitAtMs": sum(DIE_MS)}


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(f) for f in range(6)], DIE_MS, sequence=DIE_SEQ, extra=DIE_EXTRA),
    ]
    M.check_variants(M.check_contract([c for c in cl if c.name != "die"]))   # the blink-out keeps its 480 ms
    assert cl[-1].total_ms() == 480
    return cl
