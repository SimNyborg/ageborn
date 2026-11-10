"""Bandmaster: Industrial Age rare Support aura (CONTENT_PLAN 5.5). Cornet blast (proj.note), ~70 lu.

Look (A11, Industrial palette): a proud, round-bellied bandmaster with a waxed black moustache in a
tall team bandmaster's cap with a brass lyre badge and a cream plume, a team frock coat with cream
frogging across the chest and brass buttons, white gloves, iron-blue trousers with a cream stripe
and polished boots. He plays a brass cornet in the near hand and conducts with a white baton in the
far hand.

"A viewer expects him to point the baton and blast a note from the cornet, and to strut in a
high-kneed parade march in time with the music."

Animation (ANIM_SPEC G1 march, appendix B for an instrument support: aimed blast, baton flourish):
  idle      taps the baton in the air keeping time, the plume bobs, blink
  walk      walk v3 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), a strut with high
            knees, the baton swinging, the cornet held at his chest
  attack    CORNET BLAST: raises the cornet to his lips, leans back with puffed cheeks (the held
            extreme, a breath hold loop), then a big blast: the note leaves the bell (`muzzle`),
            rings at the bell, he rocks forward
  attack_b  BATON FLOURISH: whips the baton up and over and points it at the foe like a sword; the
            note flies off the baton tip (rings)
  hit       light: the head snaps back, the tall cap tips
  die       D1 fling and spin: the cap pops off, the cornet flies, X eyes and tongue

Detail standard (art round W3, Track INDUSTRIAL): the frogging laid round the chest as cream cords with knotted ends,
the frock coat's team-dark back seams, yoke and skirt pleats, a vent down the coattail, team-dark creases at the
elbows; a brass buckle on the belt; knee creases and a shin crease on the iron-blue trousers; the cap's cream top band,
a cream cord over the visor, team-dark crown seams and a feathered plume; a polished band down the cornet and a rim on
its bell. Aimed (queue item 44; the Bandmaster hits air with a projectile note): A and B up about 45 and 70 degrees
(aimed.variants on the cornet and on the baton: the arm and the lean turn together, the head tips back with the
cornet). Damage spots (posed frames measured): the coat's back (r 7.5), the cap, the near sleeve, the trousers, a
strip from the coat's skirt.
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import industrial_w3 as IW

SLUG = "bandmaster"
GAIT_NAME = "biped"
NAME = "Bandmaster"
HEIGHT_LU = 70
CANVAS = (296, 284)
FEET = (128, 254)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (26, 46)}
NO_RETIME = True

FIST = (0.4, I.ARM_Y["r"] - 1.4, I.HAND_Z - 0.4)
FIST_L = (0.4, I.ARM_Y["l"] + 1.0, I.HAND_Z - 0.4)
CORNET_L = 14.0
BELL = (FIST[0], FIST[1], FIST[2] + CORNET_L)
BATON_TIP = (FIST_L[0], FIST_L[1], FIST_L[2] + 15.0)
CAP_C = (1.0, 0.0, 57.4)
GLOVE = "#F1ECE2"
BLACK = "#2E2B2C"
BRASS_HI = "#C9BA8A"       # W3: the cornet's polished band
DENIM_DK = "#434B55"       # the trousers' creases
STRIPE_DK = "#B4AD9E"      # the far leg's cream stripe and the plume's feathering

# the detail standard (art round W3): the pilot's soldier lifts; cloth, leather, brass and skin apart
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 1.0
LOOK_SHADE = IW.SHADE_SOLDIER
LOOK_RIM = IW.RIM_SOLDIER
MATERIAL_KINDS = IW.kinds({I.SKIN: "skin", BLACK: "leather", GLOVE: "cloth", I.CREAM: "cloth", I.CREAM_DK: "cloth",
                           STRIPE_DK: "cloth", I.DENIM: "cloth", DENIM_DK: "cloth", I.LEATHER_DK: "leather",
                           I.BRASS: "bronze", I.BRASS_LT: "bronze", BRASS_HI: "bronze", "team": "cloth"})


def _cornet(rig, joint, fist):
    cx, cy, cz = fist
    g = Geo().capsule((cx, cy, cz - 2.0), (cx, cy, cz + CORNET_L - 4.0), 1.2)
    g.capsule((cx + 2.2, cy, cz), (cx + 2.2, cy, cz + 7.0), 1.6)          # the coil
    g.capsule((cx, cy, cz), (cx + 2.2, cy, cz), 1.2)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.6)
    g = Geo().lathe([(1.4, 0), (1.8, 2.0), (3.0, 3.2), (4.4, 4.0)], (cx, cy, cz + CORNET_L - 4.0),
                    (cx, cy, cz + CORNET_L), segs=18)
    rig.part(joint, g, I.BRASS, finish="metal", outline=0.7)              # the bell
    g = Geo()
    for z in (2.0, 4.0, 6.0):
        g.capsule((cx + 1.2, cy - 1.6, cz + z), (cx + 1.2, cy - 1.6, cz + z + 0.6), 0.6)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.3)           # valves
    # W3: a polished band down the tube and the coil, and a rolled rim on the bell
    g = Geo().capsule((cx - 0.3, cy - 0.95, cz - 1.2), (cx - 0.3, cy - 0.95, cz + CORNET_L - 4.6), 0.42, segs=8, rings=2)
    g.capsule((cx + 1.8, cy - 1.35, cz + 0.6), (cx + 1.8, cy - 1.35, cz + 6.4), 0.45, segs=8, rings=2)
    rig.part(joint, g, BRASS_HI, finish="metal", outline=0)
    g = Geo().lathe([(4.1, 0), (4.75, 0.35), (4.6, 0.9)], (cx, cy, cz + CORNET_L - 0.8), (cx, cy, cz + CORNET_L + 0.1),
                    segs=18)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.4)
    return (cx, cy, cz + CORNET_L)


def _baton(rig, joint, fist):
    cx, cy, cz = fist
    g = Geo().capsule((cx, cy, cz - 1.0), (cx, cy, cz + 15.0), 1.0, 0.7)
    rig.part(joint, g, GLOVE, outline=0.5)
    g = Geo().blob((cx, cy, cz - 1.4), (1.2, 1.2, 1.4), p=2.4)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.4)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=I.DENIM, boot=BLACK)
    for s in ("r", "l"):
        y = I.LEG_Y * I.SIDE_Y[s]
        g = Geo().capsule((3.0, y - 2.8, KI.V3_THIGH_Z), (3.4, y - 2.8, KI.V3_KNEE_Z), 1.0)
        rig.part(f"thigh_{s}", g, I.CREAM if s == "r" else STRIPE_DK, outline=0)
    coat = Geo().blob((0, 0, 27.6), (11.4, 10.4, 11.6), p=2.4, taper=(1.12, 0.92))
    coat.blob((0.3, 0, 17.4), (11.4, 10.4, 5.0), p=2.6)
    cface = F.Face(rig, "torso", [Geo().blob((0, 0, 27.6), (11.4, 10.4, 11.6), p=2.4, taper=(1.12, 0.92))])
    rig.part("torso", coat, team=True)
    g = Geo()
    for z in (24.0, 27.5, 31.0):   # cream frogging across the chest (W3: cords laid round the chest, not flat bars)
        IW.ribbon(g, cface, [(4.4, z + 0.2), (7.6, z - 0.1), (10.4, z)], 1.35, 0.45)
    rig.part("torso", g, I.CREAM, highlight=False, outline=0)
    IW.rivets(rig, "torso", cface, [(4.2, z + 0.2) for z in (24.0, 27.5, 31.0)], r=0.8, fill=I.CREAM_DK, proud=0.3,
              outline=0.25, finish="matte")                                  # the frogs' knotted ends
    g = Geo()
    for z in (24.0, 27.5, 31.0):
        g.sphere((11.8, -2.0, z), 0.9, cuts=2)
    rig.part("torso", g, I.BRASS_LT, finish="metal", outline=0.3)
    g = Geo().blob((0.2, 0, 20.2), (11.8, 10.8, 1.8), p=3.2)
    rig.part("torso", g, I.LEATHER_DK)
    g = Geo().blob((0.4, 0, 15.2), (11.6, 10.6, 5.4), p=2.6, taper=(1.12, 1.0))
    g.clip((0, 0, 13.0), (0, 0, -1))
    rig.part("hips", g, team=True)
    rig.secondary("coattail", "hips", (-4.0, 0, 15.0), (-9.0, 0, 6.0), max_deg=22, gain=1.1)
    g = Geo().blob((-6.0, 0, 13.0), (6.0, 9.0, 5.0), p=2.6, taper=(1.25, 0.9))
    g.clip((0, 0, 15.5), (0, 0, 1))
    rig.part("coattail", g, team=True)
    _coat_detail(rig)

    face = KI.head_face(rig, brow=BLACK, brow_angry=False, mouth_dz=-9.4, mouth_w=5.4)
    del face
    I.moustache(rig, BLACK, curl=True, big=1.2)
    I.sideburns(rig, BLACK)
    I.ear(rig)
    rig.joint("hat", "head", CAP_C)
    _cap(rig, "hat")
    KI.loose(rig, "hat_loose", CAP_C, lambda j: _cap(rig, j, live=False))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=None, team_sleeve=True, hand=GLOVE, fist=4.4, cuff=I.CREAM)
    I.shoulders(rig, team=True)
    for s_ in ("r", "l"):   # W3: team-dark creases bunched at the sleeves' elbows
        y = I.ARM_Y[s_]
        lo = Geo().capsule((0, y, I.ELBOW_Z), (0, y, I.HAND_Z + 2.0), 4.1, 3.9)
        IW.folds(rig, f"fore_{s_}", F.Face(rig, f"fore_{s_}", [lo]), [[(-2.8, 26.8), (0.2, 26.0), (2.8, 27.0)],
                                                                    [(-2.4, 24.4), (0.4, 23.8), (2.4, 24.6)]], w=0.8)

    rig.joint("cornet", "hand_r", FIST)
    rig.rest_scale["cornet"] = 1.2
    bell = _cornet(rig, "cornet", FIST)
    KI.loose(rig, "cornet_loose", FIST, lambda j: _cornet(rig, j, FIST))
    rig.track("muzzle", "cornet", bell)
    rig.joint("baton", "hand_l", FIST_L)
    _baton(rig, "baton", FIST_L)
    rig.track("batonTip", "baton", BATON_TIP)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry
        _damage_spots(rig)


def _coat_detail(rig):
    """W3: the frock coat's team-dark back seams, yoke and skirt pleats, a vent down the coattail with two brass
    buttons, a brass buckle on the belt; the trousers' knee creases and a crease down the near shin (the surfaces
    rebuilt for the ray casts)."""
    body = Geo().blob((0, 0, 27.6), (11.4, 10.4, 11.6), p=2.4, taper=(1.12, 0.92))
    face = F.Face(rig, "torso", [body])
    IW.folds(rig, "torso", face, [[(-7.0, 35.0), (-7.6, 28.0), (-7.2, 22.2)],                     # back seam
                                  [(-10.4, 34.2), (-4.6, 35.8), (0.6, 36.2)]], w=1.1)             # yoke
    g = Geo().blob((11.4, -1.4, 20.2), (1.3, 2.6, 1.6), p=3.0)                                  # belt buckle
    rig.part("torso", g, I.BRASS_LT, finish="metal", outline=0.35)
    skirt = Geo().blob((0.4, 0, 15.2), (11.6, 10.6, 5.4), p=2.6, taper=(1.12, 1.0))
    IW.folds(rig, "hips", F.Face(rig, "hips", [skirt]), [[(-5.8, 18.8), (-6.4, 14.0)], [(3.2, 18.8), (3.6, 14.2)]],
             w=1.1)
    tail = Geo().blob((-6.0, 0, 13.0), (6.0, 9.0, 5.0), p=2.6, taper=(1.25, 0.9))
    tface = F.Face(rig, "coattail", [tail])
    IW.folds(rig, "coattail", tface, [[(-7.6, 14.6), (-8.2, 9.2)]], w=1.0)                       # the vent
    IW.rivets(rig, "coattail", tface, [(-6.2, 14.2), (-9.6, 14.0)], r=0.75, fill=I.BRASS_LT, proud=0.3)
    ly = -I.LEG_Y
    thigh = Geo().capsule((0, ly, KI.V3_THIGH_Z), (0.5, ly, KI.V3_KNEE_Z), 4.6, 4.2)
    IW.folds(rig, "thigh_r", F.Face(rig, "thigh_r", [thigh]), [[(-2.8, 14.4), (-0.4, 13.4), (1.6, 14.0)]], w=0.75,
             team=False, fill=DENIM_DK)
    shin = Geo().capsule((0.5, ly, KI.V3_KNEE_Z), (1.0, ly, KI.V3_ANKLE_Z + 0.6), 3.9, 3.3)
    IW.seam(rig, "shin_r", F.Face(rig, "shin_r", [shin]), [(1.4, 11.6), (1.9, 8.2)], fill=DENIM_DK, w=0.6)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, soldier; never on the face or skin), measured in the posed frames: the
    coat's back (the biggest team field the arms leave clear, r 7.5), the cap, the near sleeve, the trousers, a strip
    torn from the coat's skirt."""
    rig.damage_spot_at("coat", "torso", -7.4, 26.0, 7.5, "cloth", team=True)
    rig.damage_spot_at("cap", "hat", -3.0, 61.0, 5.5, "cloth", team=True)
    rig.damage_spot_at("sleeve", "arm_r", -1.0, 33.0, 5.0, "cloth", team=True)
    rig.damage_spot_at("trousers", "thigh_r", -2.0, 16.0, 5.0, "cloth", fill=I.DENIM)
    rig.damage_spot_at("hem", "hips", -4.0, 15.6, 7.0, "cloth", kind="strip", team=True)


def _cap(rig, joint, live=True):
    x, y, z = CAP_C
    g = Geo().lathe([(0, 0), (10.2, 0), (11.0, 8.0), (11.6, 11.6), (0, 12.0)], (x - 0.4, y, z - 2.0), (x - 1.2, y, z + 10.0),
                    segs=24)
    rig.part(joint, g, team=True)
    g = Geo().blob((x + 10.2, y, z - 1.6), (4.6, 8.6, 0.9), p=2.8, rot=(0, -12, 0))
    rig.part(joint, g, BLACK, finish="gloss")
    g = Geo().lathe([(10.6, 0), (10.8, 1.6), (10.6, 3.0)], (x - 0.4, y, z - 1.6), (x - 0.5, y, z + 1.4), segs=24)
    rig.part(joint, g, I.CREAM, outline=0.5)
    g = Geo().blob((x + 10.4, y, z + 5.0), (0.8, 3.0, 3.2), p=2.4)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.4)          # lyre badge
    # W3: a cream top band round the crown and a cream cord over the visor (joint space, so the loose cap has them)
    g = Geo().lathe([(11.25, 0), (11.75, 0.7), (11.6, 1.5)], (x - 1.0, y, z + 6.6), (x - 1.1, y, z + 8.1), segs=24)
    rig.part(joint, g, I.CREAM_DK, outline=0.4)
    g = Geo()   # the cord droops in the middle over the visor
    pts = [(x - 0.4 + 10.6 * math.cos(math.radians(a)), y - 10.6 * math.sin(math.radians(a)),
            z + 2.0 - 1.4 * math.cos(math.radians(a * 2.2))) for a in range(-40, 41, 10)]
    for p, q in zip(pts, pts[1:]):
        g.capsule(p, q, 0.55, segs=8, rings=2)
    rig.part(joint, g, I.CREAM_DK, outline=0.3)
    if live:   # team-dark seams up the crown (cast on its surface at rest)
        crown = Geo().lathe([(0, 0), (10.2, 0), (11.0, 8.0), (11.6, 11.6), (0, 12.0)], (x - 0.4, y, z - 2.0),
                            (x - 1.2, y, z + 10.0), segs=24)
        IW.folds(rig, joint, F.Face(rig, joint, [crown]), [[(-4.6, 60.6), (-5.0, 66.8)], [(4.4, 60.8), (4.6, 66.6)]],
                 w=0.9)
    pj = joint
    if live:
        rig.secondary("plume", joint, (x - 2.0, y, z + 10.0), (x - 4.0, y, z + 18.0), max_deg=28, gain=1.5)
        pj = "plume"
    g = Geo().blob((x - 2.6, y, z + 14.5), (2.8, 2.8, 5.4), p=2.0, rot=(0, -18, 0))
    rig.part(pj, g, I.CREAM, outline=0.5)
    g = Geo()   # W3: the plume's feathering (strokes laid up its camera side, on the blob's own surface)
    ca, sa = math.cos(math.radians(-18.0)), math.sin(math.radians(-18.0))
    for u in (-1.1, 0.0, 1.1):
        pts = []
        for v in (-3.8, -1.3, 1.3, 3.8):
            ext = 2.8 * math.sqrt(max(0.0, 1.0 - (u / 2.8) ** 2 - (v / 5.4) ** 2))
            pts.append((x - 2.6 + u * ca + v * sa, y - ext - 0.1, z + 14.5 - u * sa + v * ca))
        for p, q in zip(pts, pts[1:]):
            g.capsule(p, q, 0.4, segs=8, rings=2)
    rig.part(pj, g, STRIPE_DK, outline=0, highlight=False)


def arms(a, f, la, lf, lean=0.0, w=None, wl=None):
    return merge(KI.aim_arm("r", a, f, lean, w), KI.aim_arm("l", la, lf, lean, wl))


CHEST = (-60.0, 60.0, 90.0)      # the cornet held up at his chest, bell up
STANCE = merge(arms(-60.0, 60.0, -50.0, 20.0, lean=-4.0, w=90.0, wl=60.0), {"torso": {"r": -4.0}})


def _idle(f):
    beat = [0.0, 1.0, 0.0, 1.0, 0.0, 0.5][f]

    def extra(ctx):
        return merge(arms(-60.0, 60.0, -50.0 + 20 * beat, 20.0 + 40 * beat, lean=-4.0, w=90.0, wl=60.0 + 30 * beat),
                     {"head": {"r": 3 * beat}, "plume": {"r": 4 * ctx["lag"]}})
    return M.idle_v2(f, {"torso": {"r": -4.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


SPEED = 81.25
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=616)
CARRY = merge(arms(-62.0, 64.0, -60.0, 20.0, lean=-5.0, w=90.0, wl=40.0), {"torso": {"r": -5.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": -4 * lag}, "hat": {"r": -2.0 * lag}, "plume": {"r": 8 * lag}, "coattail": {"r": 6 * lag},
                "baton": {"r": 20 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-3.0, twist=6.0, nod=3.0,
                     arms={"l": KI.ArmChain("l")}, arm=36.0, extra=extra, report=report)


# -- attack A: cornet blast (SMALL_MELEE_MS, the note on 6; hold 3 loops with 2: puffing up)
#        read lift  lips HOLD  puff  BLAST IMP  rock recoil down settle
A_A = [-60, -40, -20, -16, -18, -14, -10, -20, -36, -50, -58]
A_F = [60, 90, 120, 124, 122, 116, 112, 100, 80, 66, 60]
A_W = [90, 50, 10, 16, 12, 4, 0, 10, 40, 70, 88]
A_LA = [-50, -40, -30, -20, -24, -40, -60, -60, -56, -52, -50]
A_LF = [20, 40, 60, 70, 66, 40, 0, -10, 0, 10, 20]
A_T = [-4, -6, -10, -14, -14, -8, 2, 6, 0, -3, -4]
A_X = [0.0, 0.0, -0.5, -1.5, -1.5, 0.5, 2.5, 3.5, 2.0, 0.5, 0.0]
A_Q = [0.0, 0.0, 0.02, 0.05, 0.06, 0.0, -0.08, -0.04, 0.0, 0.0, 0.0]


# aimed shots (queue item 44, ageborn_art/aimed.py): a turn of `turn` degrees up (negative: down) swings the playing
# arm about the shoulder (the upper arm and forearm a share of it, the cornet or the baton all of it), leans the body
# back and tips the head back with the cornet (a bugler blowing at the sky)
AIM_LEAN = 0.18           # torso r per degree of turn (positive leans back)
AIM_ARM = (0.55, 0.8)     # upper arm and forearm: their share of the turn (world angles)
AIM_HEAD = 0.15           # head r per degree, on top of the torso's lean (the arm reaches the lips)
AIM_HEAD_B = 0.10         # the baton: the head follows less (he sights along it)
# per unique frame (11; release 6): A rises into the aim from the lift (the hold loop 2-3 fully aimed) and falls
# out of it on the recoil; B keeps A's frames 0, 1, 9, 10 level and aims the whip, the point and the recoil
AIM_W = [0.0, 0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 0.85, 0.5, 0.2, 0.0]
AIM_W_B = [0.0, 0.0, 0.6, 0.6, 0.8, 0.9, 1.0, 1.0, 0.6, 0.0, 0.0]


A_HEAD = [0, 0, -4, -6, -6, -2, 4, 6, 2, 0, 0]
HEAD_PIVOT, MOUTH = (1.0, 38.0), (13.6, 41.0)    # torso space at rest (x, z): the head joint and the mouth
MOUTHPIECE = 2.0 * 1.2                           # the mouthpiece behind the fist, along the cornet (rest scale 1.2)
AIM_IK_FULL = 30.0                               # a turn this big puts the mouthpiece fully on the lips


def _cornet_arm(f, turn, t, head_r):
    """The near arm for an aimed blast, torso space: the arm turned with the aim (`AIM_ARM`), blended toward the
    arm that holds the turned cornet's mouthpiece to the lips (an IK reach to the mouth, which the lean and the head
    tip carry back and up), so a bugler blowing at the sky does not hold the bell to his face."""
    a1, f1, w_t = A_A[f] + AIM_ARM[0] * turn - t, A_F[f] + AIM_ARM[1] * turn - t, A_W[f] + turn - t
    k = min(1.0, abs(turn) / AIM_IK_FULL)
    if k <= 0.0:
        return I.arm("r", a1, f1, w_t, w_rest=90.0)
    hr = math.radians(head_r)
    mx, mz = MOUTH[0] - HEAD_PIVOT[0], MOUTH[1] - HEAD_PIVOT[1]
    mouth = (HEAD_PIVOT[0] + mx * math.cos(hr) - mz * math.sin(hr), HEAD_PIVOT[1] + mx * math.sin(hr) + mz * math.cos(hr))
    wr = math.radians(w_t)
    # the fist on the cornet's line through the mouth: the mouthpiece on the lips where the arm reaches that far, else
    # the fist slides back down the line until it does (the tube then crosses the lips near its mouthpiece end)
    for sh in (MOUTHPIECE, 1.0, -0.5, -2.0, -3.5, -5.0, -6.5):
        hand = (mouth[0] + sh * math.cos(wr) - 0.4, mouth[1] + sh * math.sin(wr) + 0.4)
        if math.hypot(hand[0], hand[1] - I.SHOULDER_Z) <= I.UPPER + I.LOWER - 0.3:
            break
    a2, f2 = I.ik2((0.0, I.SHOULDER_Z), hand)
    while a2 - a1 > 180.0:
        a2 -= 360.0
    while a2 - a1 < -180.0:
        a2 += 360.0
    while f2 - f1 > 180.0:
        f2 -= 360.0
    while f2 - f1 < -180.0:
        f2 += 360.0
    return I.arm("r", a1 + (a2 - a1) * k, f1 + (f2 - f1) * k, w_t, w_rest=90.0)


def _attack_pose(f, turn=0.0):
    t = A_T[f] + AIM_LEAN * turn
    head_r = A_HEAD[f] + AIM_HEAD * turn
    pose = merge(_cornet_arm(f, turn, t, head_r), KI.aim_arm("l", A_LA[f], A_LF[f], t, 60.0), {
        "torso": {"r": t}, "head": {"r": head_r},
        "thigh_r": {"r": [2, 4, 6, 8, 8, 6, 12, 14, 8, 4, 2][f]}, "shin_r": {"r": [0, -2, -4, -6, -6, -4, -10, -12, -6, -2, 0][f]},
        "thigh_l": {"r": [-2, -4, -6, -8, -8, -6, -10, -12, -8, -4, -2][f]},
        "plume": {"r": [0, 0, 4, 8, 8, -6, -14, -10, -4, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], q=A_Q[f]))
    if f in (3, 4):
        pose = merge(pose, F.expr("squeeze", "o"), {"head": {"sx": 1.04}})
    elif f in (6, 7):
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.2}})
    return KI.ground_feet(RIG, pose, LEGS)


def _blast(point, joint, seed):
    return [{"kind": "rings", "joint": joint, "point": point, "radii_lu": (5.0, 9.0), "a0": -70.0, "a1": 70.0,
             "color": "#FFF4D6"},
            {"kind": "burst", "joint": joint, "point": point, "r0_lu": 7.0, "r1_lu": 12.0, "n": 5, "a0": -45.0, "arc": 90.0,
             "color": "#FFF4D6"}]


def _attack_clip():
    ov = {6: _blast(BELL, "cornet", 101), 7: [{"kind": "rings", "joint": "cornet", "point": BELL, "radii_lu": (10.0, 14.0),
                                               "a0": -60.0, "a1": 60.0, "color": "#FFF4D6"}]}
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, extra={"holdStep": 3, "holdLoop": [2, 3]})


# -- attack B: baton flourish. Unique frames 0, 1, 9, 10 are A's; 2 whip up, 3 HOLD (baton high and
# back over his head), 4-5 smear over the top, 6 POINT (the note leaves the baton tip), 7 hold, 8 recoil.
#        up  HOLD smear smear PNT hold recoil
B_LA = [60, 110, 80, 30, 6, 4, -20]
B_LF = [90, 140, 90, 30, 4, 2, -10]
B_WL = [120, 170, 110, 30, 2, 0, 20]
B_T = [-6, -10, -4, 4, 10, 8, 2]


def _b_pose(i, turn=0.0):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    t = B_T[k] + AIM_LEAN * turn
    pose = merge(arms(-62.0, 64.0, B_LA[k] + AIM_ARM[0] * turn, B_LF[k] + AIM_ARM[1] * turn, lean=t, w=90.0,
                      wl=B_WL[k] + turn), {
        "torso": {"r": t, "rz": [-10, -16, -6, 6, 14, 12, 4][k]}, "head": {"r": -0.4 * B_T[k] + AIM_HEAD_B * turn},
        "thigh_r": {"r": [4, 2, 8, 14, 20, 20, 10][k]}, "shin_r": {"r": [-2, 0, -6, -12, -16, -16, -8][k]},
        "thigh_l": {"r": [-4, -2, -8, -14, -22, -22, -10][k]},
        "plume": {"r": [4, 8, 0, -8, -14, -10, -4][k]},
    }, M.body_about((0, 0, 22), x=[0.0, -1.0, 0.5, 2.5, 4.5, 4.5, 2.0][k], q=[0.02, 0.06, 0.02, -0.04, -0.08, -0.04, 0][k]))
    pose = merge(pose, F.expr("yell" if k in (3, 4) else "grit"))
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_b():
    arc = {"kind": "arc", "joint": "baton", "inner": (FIST_L[0], FIST_L[1], FIST_L[2] + 4.0), "outer": BATON_TIP,
           "color": GLOVE, "white": 0.4, "taper": 0.2, "lines": 2}
    ov = {4: [dict(arc, **{"from": 3, "t0": 0.0, "t1": 0.95})],
          5: [dict(arc, **{"from": 4, "t0": 0.2, "t1": 1.0})],
          6: _blast(BATON_TIP, "baton", 103)}
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    # the note leaves the baton tip in B (a deliberately different release, ANIM_SPEC 2.2)
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, reuse=reuse, extra={"holdStep": 3, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_l": {"r": 40 * a}, "fore_l": {"r": 20 * a},
                "hat": {"z": 3.0 * max(a, 0), "r": 14 * a}, "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


CORNET_PATH = [None, (6, 20, 60), (10, 34, 170), (14, 38, 300), (18, 28, 420), (21, 12, 520),
               (23, -2, 590), (24, -8, 612), (24, -8, 612), (24, -8, 612)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.5, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    hp = KI.hat_pop(land=58.0, back=60.0)[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    cp = CORNET_PATH[k]
    if cp is not None:
        x, z, r = cp
        pose["cornet"] = {"hide": True}
        pose["cornet_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    attack, attack_b = _attack_clip(), _attack_b()
    # aimed up about 45 and 70 degrees at flyers (the Bandmaster's note hits air; they go to the extras sheet)
    aimed_a = AIMED.variants(RIG, attack, _attack_pose, AIM_W, aims=("up45", "up70"))
    aimed_b = AIMED.variants(RIG, attack_b, _b_pose, AIM_W_B, aims=("up45", "up70"))
    for v in aimed_a:
        AIMED.check_timing(attack, v)
    for v in aimed_b:
        AIMED.check_timing(attack_b, v)
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack,
        attack_b,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    out = M.check_variants(M.check_contract(cl))
    return out + aimed_a + aimed_b
