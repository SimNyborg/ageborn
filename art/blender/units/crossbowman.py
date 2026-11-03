"""Crossbowman: Medieval Age common ranged (CONTENT_PLAN 5.3). Heavy crossbow (proj.bolt), ~68 lu.

Look (A11, PLAN.md): a stolid crossbowman in a long quilted team gambeson, a mail coif under a
round team-painted skullcap with a steel crest ridge, a broad nose and a stubbly jaw, slate hose and
cuffed boots, a bolt case on the near hip. A tall team pavise (the big standing shield of the
crossbow line, with a parchment bear paw) is slung on his back, so he reads apart from the
Longbowman at a glance. His heavy crossbow sits on its own joint: a dark stock, a steel prod tilted
toward the viewer, a stirrup at the front, a windlass box with two crank handles at the butt.

"A viewer expects him to crank, shoulder and loose a heavy crossbow (a big kick), and to march."

Animation (ANIM_SPEC G1 march, appendix B for a crossbow: aimed shoulder shot, kneeling shot):
  idle      the crossbow braced on the hip, he checks the bolt, shifts his weight, blink
  walk      walk v3 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), a stiff march: the
            crossbow sloped on his shoulder, the pavise bumping on his back one frame late
  attack    AIMED SHOULDER SHOT: raises and shoulders the crossbow, squints down it (the held
            extreme, a hold loop with an aim jiggle while the sim wind-up lasts), looses (the string
            snaps, a twang ring, the stock kicks him back a step), then lowers it to the hip and
            cranks the windlass (the handles turn) and drops in a new bolt
  attack_b  KNEELING SHOT: drops to one knee, braces the crossbow and looses on a flat aim, rises
  hit       light: the head snaps back, the pavise jolts
  die       D1 fling and spin: the skullcap pops off, X eyes and tongue
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import medieval_w2 as MW

SLUG = "crossbowman"
GAIT_NAME = "biped"
NAME = "Crossbowman"
HEIGHT_LU = 68
CANVAS = (280, 244)
FEET = (112, 218)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32), "muzzle": (38, 34)}
NO_RETIME = True

SKIN = "#EBC4A0"
STUBBLE = "#B99C86"
HAIR = "#4A3B31"
MAIL = "#6B7682"
STEEL = "#A7B0BB"
STEEL_DK = "#5E6670"
HOSE = "#626A74"
BOOT = "#5A4A3D"
LEATHER = "#6B5647"
LEATHER_DK = "#4E3F33"
WOOD = "#7A6652"
WOOD_LT = "#B89C78"
STRING = "#EDE6D6"
PARCH = "#E8DFC8"

# the detail standard (art round W2): the gambeson quilted in a team-dark diamond lattice and its skirt in channels
# (padded cloth), the mail coif in rows at a readable scale (mail), the pavise with a team-dark border and a whole
# bear paw, a lit edge on the steel prod
MAIL_DK = "#4C5560"
STEEL_HI = "#D9DFE6"
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = MW.HIGHLIGHT_SOLDIER
LOOK_SHADE = MW.SHADE_SOLDIER
LOOK_RIM = MW.RIM_SOLDIER
MATERIAL_KINDS = MW.kinds({SKIN: "skin", STUBBLE: "skin", HAIR: "fur", MAIL: "iron", MAIL_DK: "iron", STEEL: "iron",
                           STEEL_DK: "iron", STEEL_HI: "iron", HOSE: "cloth", BOOT: "leather", LEATHER: "leather",
                           LEATHER_DK: "leather", WOOD: "wood", WOOD_LT: "wood", STRING: "cloth", PARCH: "cloth",
                           "team": "cloth"})

SH = (0.0, B.SHOULDER_Z)              # shoulder in torso space (x, z)
G0 = (4.0, -14.5, 26.0)               # crossbow grip (trigger hand) at rest, character space
STOCK = 30.0                          # grip to the prod
BUTT = 9.0                            # butt behind the grip
FORE = 11.0                           # far hand this far along the stock
PROD_X = G0[0] + STOCK - 3.0
BOLT_TIP = (G0[0] + STOCK + 3.0, G0[1], G0[2] + 2.2)
CAP_C = (1.0, 0.0, 56.0)


def _cap(rig, joint):
    g = Geo().blob((1.0, 0.0, 56.0), (11.8, 11.6, 9.6), p=2.2)
    g.clip((0, 0, 54.0), (0, 0, -1))
    rig.part(joint, g, team=True)
    g = Geo().blob((0.0, 0.0, 63.6), (9.6, 2.0, 3.0), p=2.4)   # steel crest ridge
    rig.part(joint, g, STEEL, finish="metal", outline=0.6)
    g = Geo().lathe([(11.4, -0.8), (12.2, 0.0), (11.4, 0.8)], (1.0, 0.0, 54.2), segs=28)
    rig.part(joint, g, STEEL_DK, finish="metal", outline=0.5)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    K.legs_v3(rig, HOSE, BOOT, cuff=LEATHER_DK)

    # the pavise on his back: a tall rounded-top team shield with a parchment paw and a wooden rim
    rig.secondary("pavise", "torso", (-8.0, 8.0, 46.0), (-12.0, 8.0, 14.0), max_deg=6, gain=0.8)
    g = Geo().blob((-12.0, 9.5, 31.0), (9.6, 2.0, 16.4), p=3.6, taper=(0.9, 1.0), rot=(0, 10, 0))
    rig.part("pavise", g, WOOD)
    pv = Geo().blob((-12.0, 8.2, 31.0), (8.4, 1.6, 15.0), p=3.6, taper=(0.9, 1.0), rot=(0, 10, 0))
    pface = F.Face(rig, "pavise", [pv])
    rig.part("pavise", pv, team=True, outline=0.6)
    # W2: a team-dark border down the pavise's free edge and round its top (the part the body leaves in view)
    MW.seam(rig, "pavise", pface, [K.scr(pface, p) for p in ((-18.6, 6.4, 18.0), (-18.8, 6.4, 40.0),
                                                             (-16.4, 6.4, 44.0), (-11.0, 6.4, 45.0))], w=2.2, team=True)
    g = MW.paw(pface, Geo(), K.scr(pface, (-14.0, 7.0, 34.0)), s=1.3)
    rig.part("pavise", g, PARCH, highlight=False, outline=0)

    # torso: a long quilted team gambeson, a leather belt, a bolt case on the near hip
    g = Geo().blob((0, 0, 27.4), (10.6, 9.8, 11.8), p=2.2, taper=(1.1, 0.94))
    tface = F.Face(rig, "torso", [g])
    rig.part("torso", g, team=True)
    # W2: the gambeson quilted in a team-dark diamond lattice (padded cloth in two tones), its skirt in channels
    MW.folds(rig, "torso", tface, MW.lattice(-9.0, 8.5, 22.0, 36.0, 5.5), w=1.1)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=12, gain=1.0)
    rig.rest_offset["hem"] = (0, 0, K.V3_LIFT + 0.6)
    g = Geo().blob((0.6, 0, 14.8), (11.8, 10.8, 5.0), p=2.7, taper=(1.12, 1.0))
    hface = F.Face(rig, "hem", [g])
    rig.part("hem", g, team=True)
    MW.folds(rig, "hem", hface, [[(x + 0.4, 16.2), (x + 0.6, 10.6)] for x in (-8.4, -4.4, -0.4, 3.6, 7.6)], w=1.2)
    g = Geo().blob((0.4, 0, 20.6), (11.4, 10.4, 1.8), p=3.2)
    rig.part("torso", g, LEATHER_DK)
    g = Geo().blob((3.0, -11.6, 17.0), (3.4, 2.2, 5.6), p=3.0)   # bolt case
    rig.part("torso", g, LEATHER)
    g = Geo()
    for dx in (-1.4, 0.0, 1.4):
        g.capsule((3.0 + dx, -12.0, 22.0), (3.0 + dx, -12.0, 24.4), 0.6)
    rig.part("torso", g, PARCH, outline=0.4)
    # mail coif round the neck and shoulders
    g = Geo().blob((0.3, 0, 37.4), (10.8, 11.4, 4.4), p=2.4)
    rig.part("torso", g, MAIL, finish="metal")
    MW.shell_bands(rig, "torso", (0.3, 0, 37.4), (10.8, 11.4, 4.4), (35.2, 37.6, 40.0), MAIL_DK, p=2.4)   # W2: mail rows

    # head: a mail coif framing the face, a steel skullcap, broad nose, stubbly jaw
    head = Geo().blob((2, 0, 47.6), (11.2, 10.6, 11.0), p=2.3)
    head.blob((13.8, -0.6, 45.6), (3.4, 3.0, 3.0), p=2.0)
    coif = Geo().blob((0.5, 0, 50.0), (12.4, 11.8, 12.6), p=2.3, taper=(1.02, 0.88), shift=(-0.12, 0))
    coif.clip((7.6, 0, 50.0), (1, 0, 0.18))
    K.face2(rig, [head, coif], SKIN, cx=11.8, cz=48.6, eye_r=(3.5, 3.2, 4.1), brow=HAIR, brow_w=1.1,
            mouth_dz=-7.0, mouth_x=12.4, eye_at=(13.6, 48.8), mark_r=3.8)
    rig.part("head", head, SKIN)
    rig.part("head", coif, MAIL, finish="metal")
    # W2: the coif in mail rows (2.4 lu apart: mail at a readable scale), cut at its face opening
    MW.shell_bands(rig, "head", (0.5, 0, 50.0), (12.4, 11.8, 12.6), (40.0, 42.4, 44.8, 47.2, 49.6, 52.0), MAIL_DK,
                   p=2.3, taper=(1.02, 0.88), shift=(-0.12, 0), cuts=(((7.6, 0, 50.0), (1, 0, 0.18)),))
    g = Geo().blob((10.6, -0.4, 40.2), (4.4, 6.8, 3.0), p=2.4)   # stubble on the jaw
    rig.part("head", g, STUBBLE, highlight=False, outline=0)
    rig.joint("cap", "head", CAP_C)
    _cap(rig, "cap")
    rig.joint("cap_loose", "root", CAP_C, hidden=True)
    _cap(rig, "cap_loose")

    # arms: team sleeves, leather gloves
    for s in ("r", "l"):
        B.arm_parts(rig, s, None, hand=LEATHER, team_sleeve=True, cuff=LEATHER_DK)

    # the crossbow on its own joint under the torso; the far hand on the fore-stock is part of it
    gx, gy, gz = G0
    rig.joint("bow", "torso", G0)
    g = Geo().capsule((gx - BUTT, gy, gz - 1.6), (gx + STOCK, gy, gz + 0.6), 2.2, 1.7)
    g.blob((gx - BUTT + 1.0, gy, gz - 2.2), (3.6, 2.4, 3.2), p=2.6)    # butt
    rig.part("bow", g, WOOD)
    g = Geo().capsule((gx + 1.0, gy, gz + 1.8), (gx + STOCK - 2.0, gy, gz + 2.0), 0.7)   # groove rail
    rig.part("bow", g, WOOD_LT, outline=0.3)
    # the steel prod, tilted 30 degrees toward the viewer so it reads; a stirrup in front
    g = Geo()
    for sgn in (-1, 1):
        g.capsule((PROD_X, gy, gz + 1.0), (PROD_X - 4.0, gy + 11.0 * sgn, gz + 1.0 + 6.4 * sgn), 1.5, 1.0)
    rig.part("bow", g, STEEL, finish="metal")
    g = Geo()   # W2: a lit edge along the near limb of the prod (polished steel)
    g.capsule((PROD_X + 0.6, gy - 0.8, gz + 0.4), (PROD_X - 3.2, gy - 10.2, gz - 4.8), 0.7, 0.5, segs=8, rings=2)
    rig.part("bow", g, STEEL_HI, finish="metal", outline=0)
    g = Geo().lathe([(2.6, -0.6), (3.2, 0.0), (2.6, 0.6)], (gx + STOCK + 2.6, gy, gz - 0.6),
                    (gx + STOCK + 2.6, gy - 0.1, gz + 0.6), segs=16, squash=(1.0, 1.5))
    rig.part("bow", g, STEEL_DK, finish="metal", outline=0.5)
    # windlass box with two crank handles at the butt (the cranks turn on their own joint)
    g = Geo().blob((gx - BUTT + 1.5, gy - 1.6, gz + 2.0), (2.6, 2.0, 2.4), p=3.0)
    rig.part("bow", g, STEEL_DK, finish="metal", outline=0.6)
    rig.joint("crank", "bow", (gx - BUTT + 1.5, gy - 3.4, gz + 2.0))
    g = Geo().capsule((gx - BUTT + 1.5, gy - 3.4, gz - 3.6), (gx - BUTT + 1.5, gy - 3.4, gz + 7.6), 0.8)
    g.sphere((gx - BUTT + 1.5, gy - 4.6, gz - 3.8), 1.3, cuts=2).sphere((gx - BUTT + 1.5, gy - 4.6, gz + 7.8), 1.3, cuts=2)
    rig.part("crank", g, LEATHER_DK, outline=0.5)
    # strings: spanned (drawn back to the nut) and slack (forward at the prod); one shows per frame
    for name, x in (("spanned", gx + 6.0), ("slack", PROD_X - 1.0)):
        rig.joint(name, "bow", (x, gy, gz + 1.0), hidden=name == "slack")
        g = Geo()
        for sgn in (-1, 1):
            g.capsule((x, gy, gz + 1.6), (PROD_X - 4.0, gy + 11.0 * sgn, gz + 1.0 + 6.4 * sgn), 0.45, segs=8, rings=2)
        rig.part(name, g, STRING, outline=0.4, outline_hex=LEATHER_DK)
    # the bolt (shown while loaded)
    rig.joint("bolt", "bow", (gx + 6.0, gy, gz + 2.2))
    g = Geo().capsule((gx + 6.0, gy - 0.6, gz + 2.4), (gx + STOCK, gy - 0.6, gz + 2.4), 0.9)
    rig.part("bolt", g, WOOD_LT, outline=0.5)
    g = Geo().lathe([(0, 0), (2.2, 0.6), (0, 4.0)], (gx + STOCK - 0.5, gy - 0.6, gz + 2.4),
                    (gx + STOCK + 3.5, gy - 0.6, gz + 2.4), segs=10)
    rig.part("bolt", g, STEEL, finish="metal", outline=0.5)
    rig.joint("gunhand", "bow", (gx + FORE, gy + 2.6, gz - 0.6))
    g = Geo().blob((gx + FORE, gy + 2.6, gz - 0.6), (3.6, 3.0, 3.4), p=2.4)
    rig.part("gunhand", g, LEATHER)
    rig.track("muzzle", "bow", BOLT_TIP)
    _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, soldier; never on the face or skin): the gambeson's back (the
    largest team field the crossbow arms leave clear), the pavise, the coif's mail, a strip torn from the skirt."""
    rig.damage_spot_at("gambeson", "torso", -5.0, 28.0, 7.5, "cloth", team=True)
    rig.damage_spot_at("pavise", "pavise", -16.0, 30.0, 6.5, "wood", team=True)
    rig.damage_spot_at("coif", "head", -5.0, 47.4, 5.5, "metal", fill=MAIL)
    rig.damage_spot_at("skirt", "hem", -2.0, 14.0, 7.0, "cloth", kind="strip", team=True)


# -- poses ---------------------------------------------------------------------------------
def bow_point(gx, gz, deg, p):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    dx, dz = p[0] - G0[0], p[1] - G0[2]
    return (gx + dx * c - dz * s, gz + dx * s + dz * c)


def hold(gx, gz, deg, near=None, loaded=True, spanned=True, crank=0.0):
    """Crossbow grip at (gx, gz) in torso space pointing `deg`; both arms solved onto it.
    near=(x, z): the near hand leaves the grip for that point (the crank, the bolt)."""
    pose = {"bow": {"x": gx - G0[0], "z": gz - G0[2], "r": deg},
            "bolt": {"hide": not loaded}, "spanned": {"show": spanned, "hide": not spanned},
            "slack": {"show": not spanned, "hide": spanned}, "crank": {"rx": crank}}
    tx, tz = near if near else (gx - 0.4, gz + 0.4)
    a, f = B.ik2(SH, (tx, tz))
    pose.update(B.arm("r", a, f))
    fx_, fz = bow_point(gx, gz, deg, (G0[0] + FORE, G0[2]))
    a, f = B.ik2(SH, (fx_ - 1.0, fz - 1.0))
    pose.update(B.arm("l", a, f))
    return pose


HIP = (5.0, 24.0, 22.0)      # braced on the hip, nose up a little


def _idle(f):
    chk = [0.0, 0.3, 1.0, 0.8, 0.2, 0.0][f]

    def extra(ctx):
        return merge(hold(HIP[0] + 0.4 * ctx["lag"], HIP[1] + 0.6 * ctx["lag"], HIP[2] + 2 * ctx["lag"] - 6 * chk),
                     {"head": {"r": -6 * chk}, "pupils": {"z": -0.6 * chk}, "pavise": {"r": 1.5 * ctx["lag"]}})
    return M.idle_v2(f, {"torso": {"r": -1}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


# -- walk v3: G1 march-jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 82 ms ----------------
SPEED = 81.25
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=656, stance=0.36)
SLOPE = (7.0, 33.0, 128.0)


def slope(gx, gz, deg):
    a, f = B.ik2(SH, (gx - 0.4, gz + 0.4))
    return merge({"bow": {"x": gx - G0[0], "z": gz - G0[2], "r": deg}, "gunhand": {"hide": True}},
                 B.arm("r", a, f))


CARRY = merge(slope(*SLOPE), {"torso": {"r": -2}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"bow": {"z": 0.8 * lag, "r": 3.0 * lag}, "pavise": {"r": 4 * lag}, "hem": {"r": 4 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-7.0, twist=5.0, nod=3.0,
                     arms={"l": K.ArmChain("l")}, extra=extra, report=report)


# attack: 800 ms, the shot (impact) at 400 ms (impactAt 0.5); 12 unique frames
#            ready raise shoulder AIM jiggle | LOOSE kick lower crank crank crank bolt
ATTACK_MS = [50, 60, 70, 150, 70, 70, 60, 60, 50, 50, 50, 60]
ATTACK_IMPACT = 5
BOW = [HIP, (5.0, 28.0, 14.0), (5.0, 31.5, 4.0), (5.0, 32.0, 2.0), (5.2, 32.3, 3.0),
       (4.6, 32.0, 2.0), (1.8, 33.6, 16.0), (5.0, 26.0, 26.0), (5.0, 24.0, 30.0), (5.0, 24.0, 30.0),
       (5.0, 24.0, 30.0), (5.0, 24.0, 24.0)]
LEAN = [-1, -4, -7, -9, -9, -8, 4, 1, 0, 0, 0, -1]
HEAD = [0, -2, -6, -9, -9, -8, 6, 2, -6, -6, -6, -2]
B_X = [0.0, 0.3, 0.5, 1.0, 1.0, 0.0, -3.5, -2.5, -0.5, 0.0, 0.0, 0.0]
B_Q = [0.0, -0.04, -0.03, -0.04, -0.05, 0.03, -0.1, -0.04, 0.03, -0.03, 0.03, 0.0]
CRANK = {8: 0.0, 9: 120.0, 10: 240.0}


def _kneel(k):
    return merge({
        "thigh_r": {"r": 88 * k}, "shin_r": {"r": -92 * k}, "foot_r": {"r": 4 * k},
        "thigh_l": {"r": -4 * k}, "shin_l": {"r": -96 * k}, "foot_l": {"r": -30 * k},
    }, M.body_about((0, 0, 22), z=-10.5 * k))


# aimed attacks (queue item 44, ageborn_art/aimed.py): a turn of `turn` degrees up raises the stock toward the cheek
# (the grip rises and draws back), leans the body back into the shot and tips the head up with it; a turn down leans
# forward over the stock. The torso carries the crossbow, so its lean is part of the turn.
AIM_LEAN = 0.24           # torso r per degree of turn (positive leans back)
AIM_RISE = 0.11           # grip z per degree up (torso space, lu)
AIM_DRAW = 0.05           # grip x per degree up (drawn back toward the shoulder)
AIM_HEAD = 0.30           # head r per degree, on top of the torso's lean
AIM_W = [0.0, 0.45, 0.85, 1.0, 1.0, 1.0, 0.85, 0.4, 0.0, 0.0, 0.0, 0.0]   # crank frames 8-11 stay A's


def _attack_pose(f, kneel=0.0, flat=0.0, turn=0.0):
    gx, gz, deg = BOW[f]
    if kneel and 1 <= f <= 6:
        deg -= flat
    lean = AIM_LEAN * turn
    if turn:
        up = max(0.0, turn)
        gx, gz, deg = gx - AIM_DRAW * up, gz + AIM_RISE * up, deg + turn - lean
    near = None
    loaded = f < 5 or f == 11
    spanned = f < 5 or f >= 10
    crank = CRANK.get(f, 0.0)
    if f in CRANK:
        near = bow_point(gx, gz, deg, (G0[0] - BUTT + 1.5, G0[2] + 2.0 + 4.0 * math.cos(math.radians(crank))))
    elif f == 11:
        near = bow_point(gx, gz, deg, (G0[0] + 14.0, G0[2] + 4.0))
    pose = merge(hold(gx, gz, deg, near=near, loaded=loaded, spanned=spanned, crank=crank), _kneel(kneel), {
        "torso": {"r": LEAN[f] + lean},
        "head": {"r": HEAD[f] + AIM_HEAD * turn, "x": [0, 0.4, 1.0, 1.4, 1.4, 1.2, 0, 0, 0, 0, 0, 0][f]},
        "pavise": {"r": [0, 0, 0, 0, 0, 0, 6, 3, 0, 0, 0, 0][f]},
    }, M.body_about((0, 0, 20), x=B_X[f], q=B_Q[f]))
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0}})
    elif f in (5, 6):
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif f in (8, 9, 10):
        pose = merge(pose, F.expr("grit"))
    return pose


def _overlays():
    return {
        5: [{"kind": "rings", "joint": "bow", "point": (PROD_X - 2.0, G0[1], G0[2] + 1.0), "radii_lu": (6.0, 10.0),
             "a0": -60.0, "a1": 60.0, "color": "#FFF4D6"},
            {"kind": "burst", "joint": "bow", "point": BOLT_TIP, "r0_lu": 5.0, "r1_lu": 10.0, "n": 5,
             "a0": -50.0, "arc": 100.0, "color": "#FFF4D6"}],
        6: [{"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 71, "spread": 0.8,
             "dir": -1.0}],
    }


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(12)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=_overlays(), extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: kneeling shot -------------------------------------------------------------------------
KN = [0.0, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 0.0, 0.0, 0.0, 0.0]


def _attack_b():
    ov = _overlays()
    ov[1] = [{"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 72, "spread": 0.7}]
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10), 11: ("attack", 11)}
    poses = [_attack_pose(f, kneel=KN[f], flat=4.0) for f in range(12)]
    return M.clip("attack_b", poses, ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov, reuse=reuse,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


STANCE = hold(*HIP)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "bow": {"r": 10 * a}, "pavise": {"r": 6 * a},
                "cap": {"r": -6 * a, "z": -1.4 * max(a, 0)}, "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


CAP = {1: (-6.0, 10.0, 40.0), 2: (-12.0, 18.0, 120.0), 3: (-20.0, 14.0, 220.0), 4: (-28.0, -2.0, 300.0),
       5: (-32.0, -42.0, 340.0), 6: (-34.0, -54.0, 355.0), 7: (-35.0, -56.0, 360.0), 9: (-35.0, -56.0, 360.0)}


def _die(k):
    fl = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=12.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * fl}, "head": {"r": 14 * fl - 6},
        "bow": {"r": 40 * fl}, "arm_l": {"r": 40 * fl}, "arm_r": {"r": 30 * fl},
        "thigh_r": {"r": 40 * fl + 20}, "shin_r": {"r": -30 * fl},
        "thigh_l": {"r": -20 * fl + 10}, "shin_l": {"r": -20 * fl},
    })
    if k in CAP:
        x, z, r = CAP[k]
        pose["cap"] = {"hide": True}
        pose["cap_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    attack, attack_b = _attack_clip(), _attack_b()
    # aimed up about 45 and 70 degrees at flyers (both variants; the extras sheet)
    aimed_a = AIMED.variants(RIG, attack, lambda f, t: _attack_pose(f, turn=t), AIM_W, aims=("up45", "up70"))
    aimed_b = AIMED.variants(RIG, attack_b, lambda f, t: _attack_pose(f, kneel=KN[f], flat=4.0, turn=t), AIM_W,
                             aims=("up45", "up70"))
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack,
        attack_b,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 7, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 7, 7, 8], extra=M.die_meta(HEIGHT_LU)),
        # items 51/52 pose: aim (cranked and held: the shouldered aim of attack A's hold loop, its two frames
        # reused, so it costs no pixels; the extras sheet, pipeline POSE_CLIPS)
        M.clip("aim", [_attack_pose(3), _attack_pose(4)], [160, 160], loop=True,
               reuse={0: ("attack", 3), 1: ("attack", 4)}),
    ] + aimed_a + aimed_b
    for v in aimed_a:
        AIMED.check_timing(attack, v)
    for v in aimed_b:
        AIMED.check_timing(attack_b, v)
    return M.check_variants(M.check_contract(cl, attack_ms=800, attack_impact_at=0.5))
