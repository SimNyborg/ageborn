"""Yeoman Archer: Medieval Age rare ranged, long range (CONTENT_PLAN 5.3, DESIGN H6). Great longbow, ~68 lu.

The owner's longbowmen: a great longbow taller than the archer, arrows lobbed in a high arc.

Look (A11, PLAN.md): a weathered yeoman with a short brown beard under a broad-brimmed team felt hat
with a long parchment feather, a team tabard with a parchment bear paw over a leather jerkin, team-dyed
sleeves rolled to the elbow with a leather bracer, slate hose and boots, a leather quiver on his back.
His great longbow is taller than he is (80 lu), so he reads apart from the Longbowman at once, and
in the attack he plucks his arrows from a sheaf stuck in the ground in front of his feet.

"A viewer expects him to pluck an arrow from the ground, draw a huge bow while leaning far back and
loose it high into the sky, and to jog along with the bow carried low."

Animation (ANIM_SPEC G1, appendix B for a bow: high-arc full draw, kneeling shot):
  idle      leans on the great bow and tests the string with a thumb, blink
  walk      walk v3 bounce jog at ground speed (card 60 x 1.25 = 75 lu/s): the bow carried low and
            tipped forward, the spare arrow in the pumping hand, the hat feather late
  attack    HIGH ARC: bends and plucks an arrow from the sheaf in the ground, nocks it, leans far back
            into a full draw aimed high at the sky (the held extreme; a hold loop with a draw quiver
            while the sim wind-up lasts), the big string snaps (twang rings), the great bow kicks
  attack_b  KNEEL AND LOOSE: drops to one knee and looses on a lower arc
  hit       light: the head snaps back, the hat brim flips up
  die       D1 fling and spin: the hat flies, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "yeoman_archer"
GAIT_NAME = "biped"
NAME = "Yeoman Archer"
HEIGHT_LU = 68
CANVAS = (280, 268)
FEET = (112, 234)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32), "muzzle": (33, 34)}  # muzzle: release frame
NO_RETIME = True

SKIN = "#EBC4A0"
HAIR = "#5A3F2C"
LEATHER = "#7A6352"
DARK_LEATHER = "#584839"
HOSE = "#6B7682"
SLEEVE = "#6A6152"
FELT = "#6E6450"
BEARD = "#6A5040"
BOOT = "#4F433B"
WOOD = "#B89C78"
GRIP = "#8E2A4A"
STRING = "#EDE6D6"
PARCH = "#E8DFC8"
STEEL = "#A7B0BB"
GOLD = "#D4A437"

HL = (0.0, B.ARM_Y["r"] - 1.5, B.HAND_Z)   # bow hand (near side, so bow and arrow read)
BOW_HALF = 40.0                       # grip to tip
BOW_BEND = 7.0                        # tips sit this far behind the grip (toward the archer)
DRAWS = (0.0, 11.0, 20.0, -3.6, 2.6)   # string draw beyond the tips (rest, half, full, twang fwd, twang back)
ARROW = 38.0
AZ, AY = 4.5, 4.5   # the arrow rides above the fist and in front of the bow arm
SHOULDER_L = (0.0, B.SHOULDER_Z)
SHOULDER_R = (0.0, B.SHOULDER_Z)


def _bow_x(z):
    return -BOW_BEND * (z / BOW_HALF) ** 2


def _hat(rig, joint):
    g = Geo().blob((1.0, 0.0, 57.6), (10.6, 10.4, 8.6), p=2.2)
    g.clip((0, 0, 55.0), (0, 0, -1))
    rig.part(joint, g, team=True)
    g = Geo().lathe([(0, -0.8), (17.0, -0.8), (18.0, 0.2), (17.0, 1.0), (0, 1.0)], (2.0, 0.0, 55.4),
                    segs=28, squash=(1.0, 0.86), rot=(0, -8, 0))
    rig.part(joint, g, FELT)
    g = Geo().lathe([(10.4, 0), (10.8, 0.4), (10.8, 2.0), (10.4, 2.4)], (1.0, 0.0, 55.4), segs=28)
    rig.part(joint, g, DARK_LEATHER, outline=0.5)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    K.legs_v3(rig, HOSE, BOOT, cuff=DARK_LEATHER)

    # quiver on the back (drawn first so the body covers its lower end)
    g = Geo().capsule((-9.5, 5.0, 26.0), (-13.0, 5.0, 44.0), 3.2, 3.6)
    rig.part("torso", g, DARK_LEATHER)
    g = Geo()
    for dx, dy, dz in ((0, -1.2, 0.0), (-2.8, 1.0, -0.8), (2.4, 1.2, -0.6), (-1.0, 0.0, 1.2)):
        g.slab([(-14.6 + dx, 45.5 + dz), (-12.0 + dx, 46.5 + dz), (-12.6 + dx, 52.5 + dz), (-15.4 + dx, 51.5 + dz)],
               5.0 + dy, 1.4, rot=(0, -12, 0), origin=(-14.0, 5.0, 46.0))
    rig.part("torso", g, PARCH, outline=0.8)
    g = Geo()
    for dx, dy in ((0, -1.2), (-2.8, 1.0), (2.4, 1.2)):
        g.capsule((-13.8 + dx, 5.0 + dy, 44.0), (-14.4 + dx, 5.0 + dy, 46.2), 0.7)
    rig.part("torso", g, WOOD, outline=0)
    g = Geo()   # two leather bands round the quiver
    for z in (27.0, 38.0):
        t = (z - 22.0) / 22.0
        g.lathe([(4.2, 0), (4.5, 0.4), (4.5, 1.6), (4.2, 2.0)], (-9.5 - 4.0 * t, 5.0, z), (-9.5 - 4.0 * t - 0.36, 5.0, z + 2.0), segs=14)
    rig.part("torso", g, LEATHER, outline=0.5)

    # torso: team tunic, leather jerkin, belt
    g = Geo().blob((0, 0, 27.0), (10.2, 9.4, 11.6), p=2.3, taper=(1.12, 0.92))
    rig.part("torso", g, team=True)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=12, gain=1.0)
    rig.rest_offset["hem"] = (0, 0, K.V3_LIFT + 0.6)
    g = Geo().blob((0.6, 0, 14.8), (11.4, 10.4, 4.8), p=2.7, taper=(1.12, 1.0))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.4, 0, 28.5), (10.8, 9.9, 8.4), p=2.8, taper=(1.02, 0.94))
    g.clip((0, 0, 36.0), (0, 0, 1))
    tface = F.Face(rig, "torso", [g])
    rig.part("torso", g, team=True)
    g = K.paw(tface, Geo(), (4.0, 28.0), s=1.0)
    rig.part("torso", g, PARCH, highlight=False, outline=0)
    g = Geo().blob((0.4, 0, 20.4), (11.4, 10.4, 1.8), p=3.2)
    rig.part("torso", g, DARK_LEATHER)
    g = Geo().blob((11.3, -2.2, 20.4), (1.2, 2.0, 2.0), p=3.0)
    rig.part("torso", g, GOLD, finish="metal", outline=0.8)
    # quiver strap across the chest
    g = Geo().capsule((9.4, -3.0, 22.5), (4.0, -9.0, 35.5), 1.3)
    rig.part("torso", g, DARK_LEATHER, outline=0.8)

    # head: big eyes, a short beard, a broad-brimmed felt hat with a long feather
    head = Geo().blob((2, 0, 48.2), (11.0, 10.4, 11.2), p=2.3)
    head.blob((13.6, -0.6, 45.8), (3.0, 2.8, 3.0), p=2.0)  # nose
    beard = Geo().blob((8.0, 0, 41.6), (7.6, 10.0, 6.4), p=2.2)
    hair = Geo().blob((-5.0, 0, 47.0), (6.0, 9.8, 7.4), p=2.2)
    K.face2(rig, [head, hair], SKIN, cx=11.8, cz=48.4, eye_r=(3.7, 3.4, 4.3), brow=BEARD,
            mouth_dz=-6.8, mouth_x=12.6, eye_at=(13.6, 48.6), mark_r=4.0, mouth_w=5.0, extra_geos=[beard])
    rig.part("head", head, SKIN)
    rig.part("head", hair, BEARD, finish="hair")
    rig.part("head", beard, BEARD, finish="hair")
    rig.joint("hat", "head", (1.0, 0, 56.0))
    _hat(rig, "hat")
    rig.secondary("feather", "hat", (-4.0, 6.0, 60.0), (-20.0, 6.0, 64.0), max_deg=16, gain=1.2)
    g = Geo().blob((-12.0, 6.6, 62.0), (10.0, 1.0, 2.4), p=2.0, rot=(0, 18, 0))
    rig.part("feather", g, PARCH, outline=0.8)
    rig.joint("hat_loose", "root", (1.0, 0, 56.0), hidden=True)
    _hat(rig, "hat_loose")
    # the sheaf of arrows stuck in the ground in front (shown while he shoots)
    rig.joint("sheaf", "root", (16.0, -6.0, 0.0), hidden=True)
    g = Geo()
    for dx, dy, a in ((0.0, 0.0, 8.0), (2.4, 1.6, -6.0), (-2.0, 2.4, 14.0)):
        t = math.radians(a)
        x0, x1 = 16.0 + dx, 16.0 + dx + 22.0 * math.sin(t)
        g.capsule((x0, -6.0 + dy, -1.0), (x1, -6.0 + dy, 22.0 * math.cos(t)), 0.9)
    rig.part("sheaf", g, WOOD, outline=0.5)
    g = Geo()
    for dx, dy, a in ((0.0, 0.0, 8.0), (2.4, 1.6, -6.0), (-2.0, 2.4, 14.0)):
        t = math.radians(a)
        x1, z1 = 16.0 + dx + 20.0 * math.sin(t), 20.0 * math.cos(t)
        g.slab([(x1 - 1.5, z1 - 2.0), (x1 + 1.5, z1 - 2.0), (x1 + 1.2, z1 + 3.0), (x1 - 1.2, z1 + 3.0)], -6.6 + dy, 0.8)
    rig.part("sheaf", g, PARCH, outline=0.5)

    # arms: green linen sleeves, leather bracer on the bow arm, bare hands
    B.arm_parts(rig, "r", None, hand=SKIN, team_sleeve=True, cuff=LEATHER, glove_finish="matte")
    B.arm_parts(rig, "l", None, hand=SKIN, team_sleeve=True, cuff=LEATHER)

    # the longbow in the far hand, modelled upright (rest direction 90): a D-shaped stave
    hx, hy, hz = HL
    g = Geo()
    n = 10
    for i in range(n):
        z0 = -BOW_HALF + 2 * BOW_HALF * i / n
        z1 = -BOW_HALF + 2 * BOW_HALF * (i + 1) / n
        r0 = 0.9 + 1.4 * (1 - abs(z0) / BOW_HALF)
        r1 = 0.9 + 1.4 * (1 - abs(z1) / BOW_HALF)
        g.capsule((hx + _bow_x(z0), hy, hz + z0), (hx + _bow_x(z1), hy, hz + z1), r0, r1, segs=10, rings=2)
    rig.part("hand_r", g, WOOD)
    g = Geo().capsule((hx + 0.2, hy, hz - 4.0), (hx + 0.2, hy, hz + 4.0), 2.8)
    rig.part("hand_r", g, GRIP)
    g = Geo()
    for sgn in (-1, 1):
        g.sphere((hx + _bow_x(BOW_HALF), hy, hz + sgn * BOW_HALF), 1.5, cuts=3)
    rig.part("hand_r", g, DARK_LEATHER, outline=0.8)
    # the bow hand sits in front of the grip
    g = Geo().blob((hx + 0.6, hy - 2.5, hz), (3.8, 2.8, 4.0), p=2.3)
    rig.part("hand_r", g, SKIN)

    # strings: rest, half draw and full draw (one visible per frame)
    tx = hx + _bow_x(BOW_HALF)
    for k, d in enumerate(DRAWS):
        rig.joint(f"string{k}", "hand_r", (tx, hy, hz), hidden=k != 0)
        nock = (tx - d, hy, hz + AZ)
        g = Geo().capsule((tx, hy, hz + BOW_HALF), nock, 0.55, segs=8, rings=2)
        g.capsule(nock, (tx, hy, hz - BOW_HALF), 0.55, segs=8, rings=2)
        rig.part(f"string{k}", g, STRING, outline=0.5, outline_hex=DARK_LEATHER)

    # the arrow, modelled nocked at full draw; poses slide it along the bow
    ax0 = tx - DRAWS[2]
    rig.joint("arrow", "hand_r", (ax0, hy - AY, hz + AZ), hidden=True)
    g = Geo().capsule((ax0, hy - AY, hz + AZ), (ax0 + ARROW - 4, hy - AY, hz + AZ), 1.1, segs=8, rings=2)
    rig.part("arrow", g, WOOD, outline=0.6)
    g = Geo().lathe([(0, 0), (2.7, 0.8), (0, 6.0)], (ax0 + ARROW - 4.5, hy - AY, hz + AZ),
                    (ax0 + ARROW + 4, hy - AY, hz + AZ), segs=10)
    rig.part("arrow", g, STEEL, finish="metal", outline=0.6)
    g = Geo().slab([(ax0 + 1, hz + AZ), (ax0 + 6.5, hz + AZ), (ax0 + 4.5, hz + AZ + 3.1), (ax0 - 0.5, hz + AZ + 2.7)],
                   hy - AY, 0.8)
    g.slab([(ax0 + 1, hz + AZ), (ax0 + 6.5, hz + AZ), (ax0 + 4.5, hz + AZ - 3.1), (ax0 - 0.5, hz + AZ - 2.7)],
           hy - AY, 0.8)
    rig.part("arrow", g, PARCH, outline=0.6)
    # the spare arrow held in the draw hand (point down-forward), shown when not on the bow
    lx, ly, lz = 0.0, B.ARM_Y["l"], B.HAND_Z
    rig.joint("arrow_hand", "hand_l", (lx, ly, lz), hidden=True)
    g = Geo().capsule((lx, ly - 2.5, lz + 10.0), (lx, ly - 2.5, lz - 18.0), 1.1, segs=8, rings=2)
    rig.part("arrow_hand", g, WOOD, outline=0.6)
    g = Geo().lathe([(0, 0), (2.7, 0.8), (0, 6.0)], (lx, ly - 2.5, lz - 17.5), (lx, ly - 2.5, lz - 24.5), segs=10)
    rig.part("arrow_hand", g, STEEL, finish="metal", outline=0.6)
    g = Geo().slab([(lx, lz + 5.0), (lx, lz + 10.5), (lx + 3.1, lz + 8.5), (lx + 2.7, lz + 3.5)], ly - 2.5, 0.8)
    g.slab([(lx, lz + 5.0), (lx, lz + 10.5), (lx - 3.1, lz + 8.5), (lx - 2.7, lz + 3.5)], ly - 2.5, 0.8)
    rig.part("arrow_hand", g, PARCH, outline=0.6)
    # the arrow spawns where its head rests at full draw
    rig.track("muzzle", "hand_r", (ax0 + ARROW + 3, hy - AY, hz + AZ))


# -- poses ---------------------------------------------------------------------------------
def bow(a, f, w):
    return B.arm("r", a, f, w, w_rest=90.0)


# While drawing, the torso turns side-on (rz 30, the near shoulder forward), so the bow arm
# reaches well clear of the body. The far hand then sits ~24 lu deeper than the string and
# the net 12 degree turn shows it this much further back on screen; the solve compensates.
DRAW_TWIST = 30.0
REACH = 4.0  # the bow shoulder pushes forward while drawing
DEPTH_SHIFT = -24.0 * 0.21


def strings(k):
    """Only string k visible (0 rest, 1 half, 2 full, 3 twang forward, 4 twang back)."""
    return {f"string{i}": {"show": i == k, "hide": i != k} for i in range(len(DRAWS))}


def draw_to(a, f, w, k, flip=False, extra=(0.0, 0.0)):
    """Bow arm (a, f, w), string k drawn, and the near hand solved onto the nock."""
    d = DRAWS[k]
    bx, bz = B.fk_hand(SHOULDER_L, a, f)
    bx += REACH
    t = math.radians(w - 90.0)
    lx, lz = _bow_x(BOW_HALF) - d, AZ   # nock in bow space
    nx = bx + lx * math.cos(t) - lz * math.sin(t) + extra[0]
    nz = bz + lx * math.sin(t) + lz * math.cos(t) + extra[1]
    ra, rf = B.ik2(SHOULDER_R, (nx - DEPTH_SHIFT, nz), elbow_down=not flip)
    pose = merge(bow(a, f, w), B.arm("l", ra, rf), {"arm_r": {"x": REACH}})
    pose.update(strings(k))
    return pose


STANCE = merge(bow(-45, -12, 48), B.arm("l", -78, -62), {"torso": {"r": -2}})




def spare(show=True, r=0.0):
    return {"arrow_hand": {"show": show, "r": r}}


def _idle(f):
    # breathing; on 2-4 he lifts the spare arrow up to his eye and squints down the shaft
    look = [0.0, 0.3, 1.0, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return merge(B.arm("l", -78 + 88 * look, -62 + 150 * look), {
            "arm_r": {"r": 2 * ctx["lag"]}, "hand_r": {"r": -3 * ctx["lag"]},
            "head": {"r": -4 * look}, "arrow_hand": {"r": 70 * look},
            "brow": {"z": -0.6 * look}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_l", "fore_l")}
    pose = M.idle_v2(f, merge(base, spare(), {"sheaf": {"show": True}}), frames=6, extra=extra, blink=5,
                     face_blink=F.expr("blink"))
    if f in (2, 3):
        pose = merge(pose, {"lids": {"show": True}}) if False else pose
    return pose


# -- walk v3: G1 bounce jog at ground speed (card 60 x 1.25 = 75 lu/s), 8 x 77 ms -------------
SPEED = 75.0
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED)
# walk carry: the bow low in the bow hand, tipped forward (not the guard), the spare arrow in
# the pumping draw hand
CARRY = merge(bow(-76, -40, 128), spare(r=-20), {"torso": {"r": -2}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = -math.cos(ctx["lag_p"])
        return merge(bow(-76 + 10 * c, -40 + 8 * c, 128 + 5 * lag), {"feather": {"r": 5 * lag}, "hem": {"r": 4 * lag}})
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-9.0, twist=6.0, nod=3.0,
                     arms={"l": K.ArmChain("l")}, arm=34.0, elbow=(50.0, 85.0), extra=extra,
                     report=report)


# attack: 799 ms, the release (impact) at 433 ms (impactAt 0.5419, the Longbowman's timing). 10 unique
# frames played in 10 steps: pluck nock+raise half FULL(held) quiver | RELEASE twang twang lower reload.
# The sim wind-up (1,300 ms) is 3x the authored pre-impact time, so the hold loops with the quiver frame.
ATTACK_MS = [55, 60, 70, 160, 88, 60, 55, 55, 80, 116]
ATTACK_SEQ = [0, 1, 2, 3, 9, 4, 5, 6, 7, 8]
ATTACK_IMPACT = 4
AIM = 40.0   # the high arc is aimed this far above level


def _attack_pose(f, aim=AIM, kneel=None):
    AIM = aim
    q = f == 9           # the hold-loop partner: the full draw with a strain quiver
    g = 3 if q else f
    lean = [6, 7, 11, 15, 12, 8, 4, 0, -2][g]
    body = merge({
        "torso": {"r": lean + (1.5 if q else 0.0),
                  "rz": [8, DRAW_TWIST - 6, DRAW_TWIST, DRAW_TWIST, DRAW_TWIST, 26, 20, 12, 4][g]},
        "head": {"r": [-10, 4, 8, 12, 8, 4, 2, 0, 0][g], "rz": [-6, -22, -24, -24, -24, -20, -14, -8, -3][g]},
        "thigh_r": {"r": [6, 8, 12, 18, 18, 14, 10, 6, 2][g]}, "shin_r": {"r": [-8, -2, -4, -6, -6, -4, -2, 0, 0][g]},
        "thigh_l": {"r": [-6, -8, -12, -18, -18, -14, -10, -6, -2][g]},
    }, M.body_about((0, 0, 22), x=[1.5, 0.5, -0.5, -2.5 - (0.4 if q else 0), 1.5, 1.0, 0.5, 0.0, 0.0][g],
                    z=[-3.5, 0, 0, 0, 0, 0, 0, 0, 0][g],
                    q=[-0.06, 0.0, -0.03, -0.07, 0.07, 0.03, -0.02, 0.0, 0.0][g]))
    sheaf = {"sheaf": {"show": True}}
    if f == 0:   # bends down and plucks an arrow from the sheaf in the ground
        pose = merge(bow(-40, -10, 60), B.arm("l", -40, -60), spare(r=150), body, strings(0), sheaf,
                     {"torso": {"r": -26}})
        pose = merge(pose, F.expr("o"))
    elif g in (1, 2, 3):
        k = g - 1
        w = [AIM * 0.5 + 92, AIM + 91, AIM + 90][k]
        a = [-18 + AIM * 0.5, -16 + AIM, -14 + AIM][k]
        pose = merge(draw_to(a, a + 8, w + (1.5 if q else 0), k, extra=(-0.6, 0.4) if q else (0.0, 0.0)), body, sheaf)
        pose["arrow"] = {"show": True, "x": DRAWS[2] - DRAWS[k]}
        pose = merge(pose, F.expr("squeeze" if q else "grit"), {"brow": {"z": -1.1 if q else -0.9}})
    elif f == 4:   # RELEASE: the big string snaps forward, the great bow kicks, the hand flies back
        a = -8 + AIM
        pose = merge(bow(a, a + 12, AIM + 84), B.arm("l", 168, 150), body, strings(3), sheaf,
                     {"arm_r": {"x": REACH}})
        pose = merge(pose, F.expr("yell"))
    elif f in (5, 6):
        k = 4 if f == 5 else 3
        a = [-10, -14][f - 5] + AIM * [0.85, 0.7][f - 5]
        pose = merge(bow(a, a + 10, 84 + AIM * [0.6, 0.4][f - 5]),
                     B.arm("l", [175, -170][f - 5], [150, 140][f - 5]), body, strings(k), sheaf,
                     {"arm_r": {"x": REACH * 0.7}})
        pose = merge(pose, F.expr("o"))
    elif f == 7:   # lowers the great bow
        pose = merge(bow(-30, -6, 62), B.arm("l", -60, -30), body, strings(0), sheaf)
    else:          # reaches down toward the sheaf for the next arrow
        pose = merge(bow(-42, -10, 50), B.arm("l", -50, -40), spare(r=60), body, strings(0), sheaf)
    if kneel:
        pose = merge(pose, _kneel(kneel))
    return pose


def _kneel(t):
    """Down on the far knee, the near foot planted forward (t 0..1)."""
    return merge({
        "thigh_r": {"r": 88 * t}, "shin_r": {"r": -92 * t}, "foot_r": {"r": 4 * t},
        "thigh_l": {"r": -4 * t}, "shin_l": {"r": -96 * t}, "foot_l": {"r": -30 * t},
        "torso": {"r": -10 * t},
    }, M.body_about((0, 0, 22), z=-10.5 * t))


def _ov():
    return {
        4: [{"kind": "rings", "joint": "hand_r", "point": (HL[0] + 2.0, HL[1], HL[2] + 18.0),
             "radii_lu": (7.0, 12.0), "a0": -50.0, "a1": 70.0, "color": "#FFF4D6"},
            {"kind": "burst", "joint": "hand_r", "point": (HL[0] + 6.0, HL[1], HL[2] + 4.0),
             "r0_lu": 5.0, "r1_lu": 10.0, "n": 4, "a0": -40.0, "arc": 80.0}],
        5: [{"kind": "rings", "joint": "hand_r", "point": (HL[0] + 2.0, HL[1], HL[2] + 18.0),
             "radii_lu": (10.0,), "a0": -40.0, "a1": 60.0, "color": "#FFF4D6"}],
    }


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT,
                  sequence=ATTACK_SEQ, overlays=_ov(), extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: kneel and loose on a lower arc --------------------------------------------------------
AIM_B = 22.0
B_KNEEL = [0.0, 0.85, 1.0, 1.0, 1.0, 1.0, 1.0, 0.45, 0.0, 1.0]


def _b_pose(f):
    if f in (0, 8):
        return _attack_pose(f)
    return _attack_pose(f, aim=AIM_B, kneel=B_KNEEL[f])


def _attack_b():
    ov = _ov()
    ov[1] = [{"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 92, "spread": 0.7}]
    reuse = {0: ("attack", 0), 8: ("attack", 8)}
    return M.clip("attack_b", [_b_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT,
                  sequence=ATTACK_SEQ, overlays=ov, reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 16 * a}, "hand_r": {"r": 12 * a},
                "arm_l": {"r": 30 * a}, "fore_l": {"r": 20 * a},
                "brow": {"z": 1.6 * max(a, 0)}, "hat": {"r": 10 * a}}
    return M.hit_light(k, merge(STANCE, spare()), recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "hand_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    if k >= 1:
        pose["hat"] = {"hide": True}
        x, z, r = [(0, 0, 0), (-8, 12, 60), (-16, 22, 150), (-24, 18, 240), (-30, 0, 320), (-34, -40, 350),
                   (-35, -52, 360), (-35, -54, 360), (-35, -54, 360), (-35, -54, 360)][k]
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
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
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=799, attack_impact_at=0.5419))
