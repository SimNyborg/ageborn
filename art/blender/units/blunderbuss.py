"""Blunderbuss: Gunpowder Age common ranged, Blaster (CONTENT_PLAN 5.4). Flared gun, 120 lu cone, ~66 lu.

Look (A11, Gunpowder palette): a stout, bandy-legged coach guard with a big walrus moustache and a
red nose, a round hat with a team crown, a black brim and band and a brass buckle, a team greatcoat with a cream cape
collar and cream cuffs, cream breeches, black stockings and buckled shoes. He hugs a short, fat
blunderbuss with a wide flared brass bell mouth (the 32 px read: a trumpet-shaped gun).

"A viewer expects him to brace the flared gun at the hip and BOOM it into the crowd, staggering back,
and to waddle."

Animation (ANIM_SPEC G1 waddle, appendix B for guns: hip shot, shoulder shot):
  idle      pats the bell mouth, sniffs, rocks on his heels, blink
  walk      walk v3 waddle at ground speed (card 65 x 1.25 = 81.25 lu/s), side sway, the gun hugged
            across the belly, the cape collar bouncing a frame late
  attack    HIP BRACE BOOM: plants his feet wide and braces the gun at the hip (the held extreme),
            BOOM with a wide flash and a spray of shot, the kick staggers him back a step, then he
            rams a fresh charge down the bell
  attack_b  SHOULDER BLAST: shoulders the gun high and leans into it (the held extreme, a tall
            silhouette), BOOM, the kick rocks him back on his heels
  hit       light: head snaps back, the hat lifts, eyes squeezed
  die       D2 topple: falls flat on his face like a plank, the hat rolls, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as GT  # noqa: F401
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "blunderbuss"
GAIT_NAME = "biped"
NAME = "Blunderbuss"
HEIGHT_LU = 66
CANVAS = (320, 256)
FEET = (108, 218)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 30), "muzzle": (46, 26)}
NO_RETIME = True

HAIR = "#5A4B40"
GAITER = B.BLACK
SHOE = "#2F2B2B"

ARM_Y = {"r": -12.5, "l": 10.5}
SH = (0.0, B.SHOULDER_Z)            # shoulder in torso space (x, z)
G0 = (4.0, -14.5, 27.0)              # musket grip at rest (character space)
FORE = 12.0                          # far hand: this far along the musket from the grip
LENGTH, BAYONET = 34.0, 0.0
MUZZLE = (G0[0] + LENGTH + 2.6, G0[1], G0[2] + 1.6)
HAT_C = (1.0, 0.0, 58.0)


def _shako(rig, joint):
    """A round hat: a low team crown, a broad black brim, a black band with a brass buckle."""
    x, y, z = HAT_C
    g = Geo().lathe([(0, 0), (8.6, 0), (9.0, 4.0), (8.8, 8.6), (0, 9.0)], (x, y, z - 1.0),
                    (x, y, z + 8.0), segs=24, squash=(1.0, 0.94))
    rig.part(joint, g, team=True)
    g = Geo().lathe([(0, -0.7), (14.4, -0.7), (15.0, 0.0), (14.4, 0.6), (0, 0.6)], (x, y, z - 0.6),
                    (x, y, z + 0.6), segs=28, squash=(1.0, 0.92))
    rig.part(joint, g, B.BLACK, finish="matte", outline=0.6)
    g = Geo().lathe([(8.8, 0), (9.3, 0.3), (9.3, 2.6), (8.8, 2.9)], (x, y, z + 0.6), segs=24, squash=(1.0, 0.94))
    rig.part(joint, g, B.BLACK, outline=0.4)
    g = Geo().blob((x + 9.2, y - 1.6, z + 2.0), (0.8, 2.0, 1.8), p=2.4)
    rig.part(joint, g, B.BRASS, finish="metal", outline=0.5)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig, arm_y=ARM_Y)
    G.legs_v3(rig, B.CREAM, SHOE, stocking=GAITER, gaiter_buttons=B.BRASS)

    # torso: team coat, cream waistcoat front, cream crossbelts (X), brass buttons, black stock
    g = Geo().blob((0, 0, 28.0), (10.8, 10.0, 11.8), p=2.4, taper=(1.08, 0.94))
    g.blob((0, 0, 18.0), (10.4, 9.8, 4.6), p=2.6)
    rig.part("torso", g, team=True)
    g = Geo().blob((5.2, -1.0, 27.5), (6.8, 4.8, 9.2), p=2.6, taper=(1.05, 0.7))
    g.clip((7.8, 0, 0), (-1, 0, 0))
    rig.part("torso", g, team=True)   # buttoned lapel front (team, with brass buttons)
    g = Geo().capsule((1.0, -10.4, 37.0), (10.6, 0.0, 22.0), 2.2).capsule((10.6, 0.0, 22.0), (2.0, 9.8, 18.5), 2.2)
    g.capsule((1.0, 10.0, 37.0), (10.4, -3.0, 25.0), 2.1).capsule((10.4, -3.0, 25.0), (1.0, -10.6, 18.5), 2.1)
    rig.part("torso", g, B.CREAM, outline=0.8)
    g = Geo().blob((10.9, -1.4, 23.5), (1.4, 2.2, 2.2), p=2.4)   # crossbelt plate
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.5)
    g = Geo()
    for z in (33.0, 29.0, 25.0):
        g.sphere((11.6, -2.4, z), 1.15, cuts=3)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.5)
    g = Geo().blob((1.2, 0, 37.2), (6.8, 7.2, 2.4), p=2.4)     # black neck stock
    rig.part("torso", g, B.BLACK)
    g = Geo().blob((0.4, 0, 19.6), (11.2, 10.4, 1.8), p=3.0)
    rig.part("torso", g, B.CREAM)                               # waist belt
    g = Geo().blob((-8.2, -8.0, 19.0), (4.2, 3.0, 3.6), p=3.0)  # cartridge box at the back hip
    rig.part("torso", g, B.BLACK, finish="gloss")
    g = Geo().blob((-8.4, -11.2, 19.4), (1.8, 0.8, 1.8), p=2.4)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.4)
    # coat skirts over the thighs (front flaps), team
    g = Geo().blob((0.5, 0, 17.6), (11.8, 10.8, 6.6), p=2.6, taper=(1.12, 1.0))
    g.clip((0, 0, 13.4), (0, 0, -1))
    rig.part("hips", g, team=True)
    # coat tails with cream turnbacks and a cream anchor, swinging behind the legs (lifted with
    # the upper body so the longer legs show; they kick with the knees)
    rig.secondary("tails", "hips", (-4.0, 0, 18.0), (-7.5, 0, 6.0), max_deg=16, gain=1.2)
    rig.rest_offset["tails"] = (0, 0, K.V3_LIFT + 4.5)
    tl = Geo().blob((-5.2, 0, 12.0), (5.4, 10.2, 8.0), p=2.6, taper=(0.7, 1.0), rot=(0, 10, 0))
    tf = F.Face(rig, "tails", [tl])
    rig.part("tails", tl, team=True)
    g = G.anchor(tf, Geo(), (-6.4, 12.6), s=0.9)
    rig.part("tails", g, B.CREAM, highlight=False, outline=0)
    g = Geo().blob((-6.5, 0, 5.4), (3.8, 10.8, 2.4), p=2.6, rot=(0, 10, 0))
    rig.part("tails", g, B.CREAM)

    # head: face kit, hair with a queue at the back, the shako on its own joint
    head = G.head_geos(center=(2, 0, 48.5), nose=(13.6, -0.6, 46.8))
    hair = Geo().blob((-6.4, 0, 48.0), (6.0, 10.2, 7.6), p=2.2)
    hair.blob((-3.0, -10.4, 45.5), (3.2, 1.8, 4.4), p=2.2)   # side curl
    K.face2(rig, [head, hair], B.SKIN, cx=12.0, cz=49.6, eye_dy=(-4.6, 4.4),
            eye_r=(3.8, 3.5, 4.4), brow=HAIR, mouth_dz=-7.4, mouth_x=12.6,
            eye_at=(13.8, 49.8), mark_r=4.1)
    rig.part("head", head, B.SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    B.moustache(rig, HAIR, cx=14.0, z=44.2)
    g = Geo().blob((14.4, -0.8, 46.8), (3.2, 2.8, 3.0), p=2.0)
    rig.part("head", g, "#D9A08A", outline=0.5)     # the ruddy nose
    # a cream cape collar over the shoulders, bouncing late
    rig.secondary("cape", "torso", (0.0, 0, 38.0), (-4.0, 0, 30.0), max_deg=10, gain=1.0)
    g = Geo().blob((-0.5, 0, 35.0), (12.6, 12.4, 4.6), p=2.4, taper=(1.05, 1.0))
    g.clip((0, 0, 31.0), (0, 0, -1))
    rig.part("cape", g, team=True, outline=0.7)
    g = Geo().blob((-0.5, 0, 31.4), (12.9, 12.7, 1.2), p=2.6, taper=(1.05, 1.0))
    rig.part("cape", g, B.CREAM, outline=0.4)       # cream edge
    rig.secondary("queue", "head", (-10.0, 0, 46.0), (-13.0, 0, 37.0), max_deg=16, gain=1.1)
    g = Geo().capsule((-10.5, 0, 45.5), (-13.0, 0, 38.0), 2.2, 1.6)
    rig.part("queue", g, HAIR, finish="hair")
    g = Geo().blob((-11.2, 0, 43.0), (1.8, 2.8, 1.6), p=2.4)
    rig.part("queue", g, B.BLACK, outline=0.6)
    rig.joint("hat", "head", HAT_C)
    _shako(rig, "hat")
    rig.joint("hat_loose", "root", HAT_C, hidden=True)
    _shako(rig, "hat_loose")

    # arms: team sleeves, cream cuffs
    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM, arm_y=ARM_Y)
    for s, y in (("r", -12.4), ("l", 10.4)):
        g = Geo().blob((0, y, 37.0), (5.8, 5.2, 4.4), p=2.4)  # shoulder with a cream wing
        rig.part(f"arm_{s}", g, team=True)
        g = Geo().blob((0.4, y * 1.05, 40.2), (3.6, 2.6, 1.4), p=2.4)
        rig.part(f"arm_{s}", g, B.CREAM, outline=0.5)

    # musket on its own joint under the torso; the far hand is part of the musket
    rig.joint("gun", "torso", G0)
    muzzle = B.musket(rig, "gun", G0, length=LENGTH, bayonet=BAYONET, r=1.12)
    # the far hand gripping the fore-stock is part of the musket (its own joint, so the walk can
    # hide it while that arm pumps free)
    rig.joint("gunhand", "gun", (G0[0] + FORE, G0[1] + 2.4, G0[2] - 0.4))
    g = Geo().blob((G0[0] + FORE, G0[1] + 2.4, G0[2] - 0.4), (3.8, 3.2, 3.6), p=2.4)
    rig.part("gunhand", g, B.SKIN)
    g = Geo().capsule((G0[0] + 2.0, G0[1] - 1.8, G0[2] - 1.4), (G0[0] + 28.0, G0[1] - 1.8, G0[2] - 1.0), 0.6)
    rig.part("gun", g, B.CREAM, outline=0.3)   # the sling
    bx, by, bz = muzzle
    g = Geo().lathe([(1.4, 0), (1.9, 3.0), (3.0, 6.0), (4.4, 8.0), (4.0, 8.4), (2.4, 6.4), (1.2, 3.0)],
                    (bx - 7.0, by, bz), (bx + 1.4, by, bz), segs=18)
    rig.part("gun", g, "#A39570", finish="metal", outline=0.8)    # a dull, weathered brass bell
    muzzle = (bx + 1.6, by, bz)
    rig.track("muzzle", "gun", muzzle)
    B.muzzle_flash(rig, "gun", muzzle, size=2.6)
    # the pan flash (a puff at the lock)
    rig.joint("pan", "gun", (G0[0] + 3.0, G0[1], G0[2] + 3.5), hidden=True)
    g = Geo().star((G0[0] + 3.0, G0[1] - 2.0, G0[2] + 5.4), 3.4, 1.4, 1.0, points=6)
    rig.part("pan", g, glow=B.FIRE, outline=0)
    g = Geo().sphere((G0[0] + 3.0, G0[1] - 2.6, G0[2] + 5.4), 1.4, cuts=3)
    rig.part("pan", g, glow="#FFFFFF", outline=0)
    # a paper cartridge in the near hand for the reload beat (bitten open, poured in the pan)
    hx, hy, hz = 0.0, ARM_Y["r"], B.HAND_Z
    rig.joint("cart", "hand_r", (hx + 2.0, hy - 3.0, hz), hidden=True)
    g = Geo().capsule((hx + 2.0, hy - 3.6, hz - 1.0), (hx + 2.0, hy - 3.6, hz + 5.5), 1.5)
    rig.part("cart", g, B.CREAM, outline=0.5)
    # the big powder cloud (world placed in front of the kneeling muzzle)
    G.smoke_cloud(rig, "root", (MUZZ_KNEEL[0] + 9.0, -16.0, MUZZ_KNEEL[1]), size=1.6)


# -- poses ---------------------------------------------------------------------------------
KNEEL = 7.5          # hips drop to kneel on the far knee
MUZZ_KNEEL = (57.0, 26.0)


def gun_point(gx, gz, deg, p):
    """Torso-space (x, z) of a gun-rest point p (x, z) for a grip at (gx, gz) and angle deg."""
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    dx, dz = p[0] - G0[0], p[1] - G0[2]
    return (gx + dx * c - dz * s, gz + dx * s + dz * c)


def hold(gx, gz, deg, near=None):
    """Musket grip at (gx, gz) in torso space pointing `deg`; both arms solved to hold it.
    near=(x, z) moves the near hand off the grip to that point (the reload beat)."""
    pose = {"gun": {"x": gx - G0[0], "z": gz - G0[2], "r": deg}}
    tx, tz = near if near else (gx - 0.4, gz + 0.4)
    a, f = B.ik2(SH, (tx, tz))
    pose.update(B.arm("r", a, f))
    fx_, fz = gx + FORE * math.cos(math.radians(deg)), gz + FORE * math.sin(math.radians(deg))
    a, f = B.ik2(SH, (fx_ - 1.0, fz - 1.0))
    pose.update(B.arm("l", a, f))
    return pose


PORT = (6.0, 25.0, 48.0)   # grip x, z, musket angle: port arms, bayonet up


def _idle(f):
    # breathing at port arms; he bounces the musket once (3) and dips his head to check the
    # pan (2-3); blink on 5
    chk = [0.0, 0.3, 1.0, 0.8, 0.2, 0.0][f]
    bounce = [0.0, 0.0, 0.0, 1.0, 0.3, 0.0][f]

    def extra(ctx):
        return merge(hold(PORT[0] + 0.4 * ctx["lag"], PORT[1] + 0.6 * ctx["lag"] + 1.2 * bounce,
                          PORT[2] + 1.5 * ctx["lag"] - 4 * chk),
                     {"head": {"r": -5 * chk}, "pupils": {"z": -0.6 * chk}})
    return M.idle_v2(f, {"torso": {"r": -1}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 82 ms -------------
SPEED = 81.25
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=656, stance=0.36)
SLOPE = (5.0, 26.0, 38.0)    # the gun hugged up across the belly, the bell up by his shoulder


def slope(gx, gz, deg):
    """The musket sloped on the near shoulder, the near hand on the grip; the far hand lets go."""
    a, f = B.ik2(SH, (gx - 0.4, gz + 0.4))
    return merge({"gun": {"x": gx - G0[0], "z": gz - G0[2], "r": deg}, "gunhand": {"hide": True}},
                 B.arm("r", a, f))


CARRY = merge(slope(*SLOPE), {"torso": {"r": -2}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"gun": {"z": 0.8 * lag, "r": 4.0 * lag}, "tails": {"r": 5 * lag}, "queue": {"r": 6 * lag},
                "cape": {"r": 5 * lag}, "torso": {"rx": 6 * math.sin(ctx["p"])}}
    return M.walk_v3(RIG, f, merge(CARRY, hold(*SLOPE)), GAIT, legs=LEGS, lean=-4.0, twist=4.0, nod=3.0,
                     sway=7.0, extra=extra, report=report)


# attack: 790 ms, the shot (impact) at 374 ms (impactAt 0.4734, as shipped); 12 unique frames
#            lower kneel shoulder AIM(held) pan | FIRE kick cloud rise ram ram port
ATTACK_MS = [40, 50, 54, 160, 70, 70, 60, 60, 56, 50, 50, 70]
ATTACK_IMPACT = 5
#         (grip x, grip z, musket angle) in torso space
GUN = [(6.0, 25.0, 18.0), (5.0, 23.0, 8.0), (4.0, 22.0, 2.0), (4.0, 22.0, 0.0), (4.0, 22.0, 0.0),
       (3.6, 22.0, 2.0), (0.0, 25.0, 26.0), (1.0, 24.0, 16.0), (6.0, 25.0, 30.0), (6.0, 26.0, 50.0),
       (6.0, 27.0, 40.0), (6.0, 25.0, 18.0)]
KN = [0.0] * 12                                                    # no kneel: he braces on his feet
LEAN = [-2, 4, 8, 10, 10, 8, 18, 12, 2, -2, -3, -1]                # leaning back against the kick
HEAD = [-2, -2, 0, 2, 2, 2, 10, 6, -4, -10, -8, 0]
B_X = [0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -5.5, -5.0, -2.5, -1.0, 0.0, 0.0]
B_Q = [0.0, -0.08, -0.03, -0.04, -0.05, 0.03, -0.1, -0.04, 0.05, -0.04, 0.03, 0.0]
# reload beat: the near hand goes to the cartridge box, to the mouth (bites it open), to the pan
RELOAD = {8: (-6.0, 21.0), 9: (11.0, 42.0), 10: None}
# the hip brace: feet planted wide on the hold, the kick throws the back foot back a step
FEET_A = [((2.0, 0, 0), (-2.0, 0, 0)), ((5.0, 0, 0), (-5.0, 0, 0)), ((7.0, 0, 0), (-7.0, 0, 0)),
          ((8.0, 0, 0), (-8.0, 0, 0)), ((8.0, 0, 0), (-8.0, 0, 0)), ((8.0, 0, 0), (-8.0, 0, 0)),
          ((5.0, 0, -6), (-13.0, 0, 0)), ((4.0, 0, 0), (-12.0, 0, 0)), ((3.0, 0, 0), (-7.0, 0, 0)),
          ((2.5, 0, 0), (-4.0, 0, 0)), ((2.0, 0, 0), (-2.5, 0, 0)), ((2.0, 0, 0), (-2.0, 0, 0))]



def _kneel(k):
    """Down on the far knee, the near foot planted forward (the walk v3 legs, as the Longbowman)."""
    return merge({
        "thigh_r": {"r": 88 * k}, "shin_r": {"r": -92 * k}, "foot_r": {"r": 4 * k},
        "thigh_l": {"r": -4 * k}, "shin_l": {"r": -96 * k}, "foot_l": {"r": -30 * k},
    }, M.body_about((0, 0, 22), z=-10.5 * k))


def _attack_pose(f):
    gx, gz, deg = GUN[f]
    near = None
    if f in RELOAD:
        # the reload: cartridge box, mouth, then the pan
        near = RELOAD[f] if f != 10 else gun_point(gx, gz, deg, (G0[0] + 3.0, G0[2] + 5.0))
    pose = merge(hold(gx, gz, deg, near=near), _kneel(KN[f]), {
        "torso": {"r": LEAN[f]},
        "head": {"r": HEAD[f], "x": [0, 0.4, 1.0, 1.4, 1.4, 1.2, 0, 0, 0, 0, 0, 0][f]},
        "pan": {"show": f == 4},
        "flash": {"show": f == 5},
        "smoke": {"show": f in (6, 7, 8), "s": [1, 1, 1, 1, 1, 1, 0.85, 0.95, 1.0, 1, 1, 1][f],
                  "x": [0, 0, 0, 0, 0, 0, -24, -20, -14, 0, 0, 0][f], "z": [0, 0, 0, 0, 0, 0, -3, 1, 6, 0, 0, 0][f]},
    }, M.body_about((0, 0, 20), x=B_X[f], q=B_Q[f]))
    pose = G.plant(RIG, pose, LEGS, r=FEET_A[f][0], l=FEET_A[f][1], max_drop=5.0)
    if f in RELOAD:
        pose["cart"] = {"show": True}
    if f in (0, 1, 7, 8, 11):
        pose = merge(pose, {"thigh_r": {"r": [4, 0, 0, 0, 0, 0, 0, 2, 8, 0, 0, 4][f]}})
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0}})
    elif f in (5, 6):
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif f in (9, 10):
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_clip():
    ov = {
        5: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 8.0, "r1_lu": 22.0, "n": 9,
             "a0": -40.0, "arc": 80.0, "color": "#FFF4D6"}],
        1: [{"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 32, "spread": 0.8}],
        6: [{"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 31, "spread": 0.8,
             "dir": -1.0}],
    }
    # 11 unique poses (atlas budget): the kick pose is held while the cloud billows (no frame 7)
    keep = [f for f in range(12) if f != 7]
    ov = {keep.index(k): v for k, v in ov.items() if k in keep}
    # the hold loops with the pan-fizz frame while the sim wind-up lasts (2.7x, ANIM_SPEC R5)
    return M.clip("attack", [_attack_pose(f) for f in keep], ATTACK_MS, impact=keep.index(ATTACK_IMPACT),
                  overlays=ov, sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10],
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: standing shoulder shot (ANIM_SPEC appendix B) -------------------------------------
# unique frames: 0 = A read, 1 raise, 2 shoulder, 3 AIM (held: a wide braced stance, leaning into
# the level musket), 4 aim + pan fizz, 5 FIRE (flash), 6 kick (a step back, the cloud), 7 lower,
# 8-10 = A's reload (bite, prime, port arms). Same steps as A.
GUN_B = [None, (5.0, 30.0, 12.0), (4.0, 33.5, 2.0), (3.6, 34.0, -1.0), (3.6, 34.0, -1.0),
         (3.0, 34.2, 0.0), (0.4, 35.6, 16.0), (4.0, 28.0, 24.0)]
LEAN_B = [0, 0, 1, 2, 2, 2, 8, 0]
HEAD_B = [0, -3, -7, -10, -10, -9, 6, 0]
BX_B = [0, 0.5, 0.5, 0.5, 0.5, 0.0, -4.5, -2.0]
BQ_B = [0, -0.04, -0.02, -0.05, -0.06, 0.04, -0.1, 0.03]
FEET_B = [None, ((3.5, 0, 0), (-3.5, 0, 0)), ((4.5, 0, 0), (-4.0, 0, 0)), ((5.0, 0, 0), (-4.5, 0, 0)),
          ((5.0, 0, 0), (-4.5, 0, 0)), ((5.0, 0, 0), (-4.5, 0, 0)), ((4.0, 0, 0), (-9.0, 0, -8)),
          ((3.0, 0, 0), (-5.0, 0, 0))]


def _b_pose(f):
    gx, gz, deg = GUN_B[f]
    pose = merge(hold(gx, gz, deg), {
        "torso": {"r": LEAN_B[f]},
        "head": {"r": HEAD_B[f], "x": [0, 0.4, 1.0, 1.4, 1.4, 1.2, 0, 0][f]},
        "pan": {"show": f == 4},
        "flash": {"show": f == 5},
        # the cloud billows in front of the standing muzzle (about 11 lu higher than the kneel)
        "smoke": {"show": f in (6, 7), "s": [1, 1, 1, 1, 1, 1, 0.85, 0.9][f],
                  "x": [0, 0, 0, 0, 0, 0, 0, 6][f], "z": [0, 0, 0, 0, 0, 0, 11, 17][f]},
    }, M.body_about((0, 0, 20), x=BX_B[f], q=BQ_B[f]))
    r, l = FEET_B[f]
    pose = G.plant(RIG, pose, LEGS, r=r, l=l)
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0}})
    elif f == 5:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif f == 6:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.4}})
    return pose


def _attack_b():
    ov = {
        5: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 8.0, "r1_lu": 22.0, "n": 9,
             "a0": -40.0, "arc": 80.0, "color": "#FFF4D6"}],
        6: [{"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 33, "spread": 0.8,
             "dir": -1.0}],
    }
    poses = [_attack_pose(0)] + [_b_pose(f) for f in range(1, 8)] + [_attack_pose(f) for f in (9, 10, 11)]
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", poses, ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10], reuse=reuse,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


STANCE = hold(*PORT)


def _hit(k):
    def recoil(a):
        return merge(hold(PORT[0], PORT[1], PORT[2] + 12 * a), {
            "head": {"r": 16 * a}, "torso": {"r": 12 * a},
            "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
            "hat": {"z": 3.0 * max(a, 0), "r": 10 * a},
            "brow": {"z": 1.6 * max(a, 0)}})
    return M.hit_light(k, {}, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


# D2: the shako pops off on the slam (step 5) and rolls forward (x, z, spin from its rest pivot)
HAT_PATH = {5: (44.0, -48.0, -95.0), 6: (49.0, -38.0, -170.0), 7: (54.0, -50.0, -265.0),
            8: (57.0, -51.0, -330.0), 9: (58.0, -51.0, -355.0)}


def _die(k):
    stiff = [0.3, 0.6, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][k]
    flop = [0, 0, 0, 0, 0, 0.6, 1.0, 0.8, 0.8, 0.8][k]
    gun = [60, 64, 50, 58, 72, 86, 88, 86, 86, 86][k]   # the musket ends up flat along him
    pose = merge(hold(PORT[0], PORT[1], gun), K.die_d2(k, toe_x=7.0, lie_lift=7.0), {
        "head": {"r": [14, 8, 0, 0, -2, -8, 4, 0, 0, 0][k]},
        "torso": {"r": 4 * (1 - stiff)},
        "thigh_r": {"r": 6 * (1 - stiff)}, "thigh_l": {"r": -4 * (1 - stiff)},
        "shin_r": {"r": -20 * flop}, "shin_l": {"r": -10 * flop},
    })
    if k in HAT_PATH:
        x, z, r = HAT_PATH[k]
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "o"), {"brow": {"z": 1.8}})
    elif k <= 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.4}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=790, attack_impact_at=0.4734))
