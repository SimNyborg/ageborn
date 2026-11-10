"""Iron Mantlet: Industrial Age common infantry Guard (CONTENT_PLAN 5.5). Wheeled shield and bayonet, ~66 lu.

Look (A11, Industrial palette): a sapper-infantryman crouched behind a wheeled steel mantlet: a
riveted iron plate (a team panel with a cream cog, a dark sight slot, hazard edge bands) on two small
spoked iron wheels. He wears a team steel-and-leather helmet with a brass badge, a team jacket with a
leather belt, iron-blue trousers with puttees and hobnail boots, and pokes a bayonet rifle through
the slot.

"A viewer expects him to shove the steel shield forward and jab a bayonet through its slot, and to
push it along on squeaking wheels."

Animation (ANIM_SPEC G1 jog behind the mantlet; appendix B for shield infantry: bash then stab,
guard-and-cut from behind the shield, over-the-rim drive):
  idle      peeks over the plate, ducks back, blink
  walk      walk v3 bounce jog at ground speed (card 67 x 1.25 = 83.75 lu/s), pushing the mantlet,
            whose wheels turn at the ground speed
  attack    SLOT JAB: draws the rifle back level behind the plate (the held extreme), then jabs the
            bayonet through the slot (a thrust streak), a spark at the point
  attack_b  SHIELD SHOVE: leans into the plate and rams the whole mantlet forward a step (a dust burst
            at the wheels), the rifle tucked
  attack_c  OVER-THE-RIM DRIVE: lifts the rifle high over the plate and drives the bayonet down
  hit       light: he ducks behind the plate, the helmet clanks
  die       D1 fling: the helmet pops off, the rifle flies; the mantlet tips over
  shield_lock  (items 51/52, extras sheet) crouched in a brace behind the mantlet, his shoulder to the plate and
            his eyes at the sight slot, the bayonet held level through it: the pose of Cover and of the Shield Wall
            (a held loop: he leans in and the plate nudges forward on its wheels; the feet never move)

Detail standard (art round W3, Track INDUSTRIAL): riveted steel. The mantlet's plate with its team panel, cream cog,
sight slot and hazard bands laid conforming (the flat decals sank into the turned plate: the panel read as a narrow
strip), rivet rows along its top and bottom edges, a polished top edge, scuffs and grime toward the wheels; the
helmet's team-dark brim band and brass rivets; the jacket's team-dark yoke and back seams and hem band; the belt
stitched with a brass buckle; puttees wound in spirals. Damage spots (armoured; posed frames measured): the plate's
team panel (r 8), the plate's iron beside it, the helmet, the jacket's back, a strip torn from the jacket's hem.
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as GT
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import industrial_w3 as IW

SLUG = "iron_mantlet"
GAIT_NAME = "biped"
NAME = "Iron Mantlet"
HEIGHT_LU = 66
CANVAS = (340, 280)
FEET = (130, 250)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

FIST = (0.4, I.ARM_Y["r"] - 1.6, I.HAND_Z - 0.4)
BODY_L = 22.0        # rifle from the grip
BIT_L = 9.0
TIP = (FIST[0], FIST[1], FIST[2] + BODY_L + BIT_L)
CAP_C = (1.0, 0.0, 57.0)
STEEL = "#A9B0B8"
WOOD = "#8A6A4E"
PUTTEE = "#8F8670"
PLATE = "#6E747C"
MX = 19.0           # the mantlet sits ahead of his feet (root space)
PUTTEE_DK = "#77705C"      # W3: the puttees' spiral wraps
IRON_HI = "#9AA2AC"        # the plate's polished top edge and scuffs
GRIME = "#555A60"          # grime on the plate toward the wheels
THREAD = "#CFC6B2"

# the detail standard (art round W3): the pilot's soldier lifts; cloth, leather, iron, brass, wood and skin apart
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 1.2
LOOK_SHADE = IW.SHADE_SOLDIER
LOOK_RIM = IW.RIM_SOLDIER
MATERIAL_KINDS = IW.kinds({I.SKIN: "skin", I.HAIR: "fur", I.DENIM: "cloth", PUTTEE: "cloth", PUTTEE_DK: "cloth",
                           THREAD: "cloth", I.COAL_LT: "cloth", I.CREAM: "cloth", I.LEATHER: "leather",
                           I.LEATHER_DK: "leather", I.BOOT: "leather", I.COAL: "leather", WOOD: "wood",
                           PLATE: "iron", IRON_HI: "iron", GRIME: "iron", STEEL: "iron", I.IRON_DK: "iron",
                           I.IRON_LT: "iron", I.BRASS: "bronze", I.BRASS_LT: "bronze", "team": "cloth"})


def _drill(rig, joint, fist):
    """A toy rifle along +Z from the fist (stock behind, barrel ahead) with a bayonet; returns the point."""
    cx, cy, cz = fist
    g = Geo().blob((cx, cy, cz - 4.0), (2.4, 1.8, 5.0), p=2.6)                 # stock
    g.capsule((cx, cy, cz), (cx, cy, cz + BODY_L * 0.55), 1.8, 1.6)
    rig.part(joint, g, WOOD, outline=0.6)
    g = Geo().capsule((cx, cy, cz + BODY_L * 0.4), (cx, cy, cz + BODY_L), 1.0, 1.0)
    rig.part(joint, g, I.IRON_DK, finish="metal", outline=0.6)                 # barrel
    g = Geo()
    for z in (BODY_L * 0.35, BODY_L * 0.7):
        g.lathe([(1.9, 0), (2.1, 0.6), (1.9, 1.2)], (cx, cy, cz + z), (cx, cy, cz + z + 1.2), segs=12)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.3)
    z0 = cz + BODY_L
    g = Geo().lathe([(1.0, 0), (0.9, BIT_L * 0.7), (0.15, BIT_L)], (cx, cy - 0.6, z0), (cx, cy - 0.6, z0 + BIT_L), segs=10)
    rig.part(joint, g, STEEL, finish="metal", outline=0.6)                    # bayonet
    return (cx, cy, z0 + BIT_L)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=I.DENIM, gaiter=PUTTEE)
    I.jacket(rig, hem_z=13.0)
    g = Geo().capsule((9.8, -8.0, 36.0), (9.6, 7.0, 21.0), 1.3)
    rig.part("torso", g, I.LEATHER, outline=0.5)
    face = KI.head_face(rig, brow=I.HAIR, brow_angry=True, mouth_dz=-9.0, mouth_w=5.6)
    del face
    I.moustache(rig, I.HAIR, curl=False)
    I.ear(rig)
    rig.joint("hat", "head", CAP_C)
    _cap(rig, "hat")
    _cap_detail(rig)
    KI.loose(rig, "hat_loose", CAP_C, lambda j: _cap(rig, j))
    _mantlet(rig)
    _jacket_detail(rig)

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=None, team_sleeve=True, fist=4.4, cuff=I.COAL_LT)
    I.shoulders(rig, team=True)

    rig.joint("rifle", "hand_r", FIST)
    tip = _drill(rig, "rifle", FIST)
    KI.loose(rig, "rifle_loose", FIST, lambda j: _drill(rig, j, FIST))
    rig.track("bayonetTip", "rifle", tip)
    I.fuse_spark(rig, "rifle", (tip[0] + 0.5, tip[1] - 2.0, tip[2] + 1.0), size=2.2, name="sparks", hidden=True)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry
        _damage_spots(rig)


def _jacket_detail(rig):
    """W3: the jacket's team-dark yoke and back seams and hem band, the belt stitched with a brass buckle, the puttees
    wound in spirals (the surfaces rebuilt for the ray casts)."""
    body = Geo().blob((0, 0, 28.0), (10.6, 9.6, 11.6), p=2.4, taper=(1.08, 0.94))
    body.blob((0, 0, 18.4), (10.4, 9.6, 4.6), p=2.6)
    face = F.Face(rig, "torso", [body])
    IW.folds(rig, "torso", face, [[(-10.0, 34.0), (-5.0, 35.4), (0.0, 35.8)], [(-6.8, 35.0), (-7.4, 28.0), (-7.0, 23.0)]],
             w=1.1, team=True)
    belt = Geo().blob((0.2, 0, 20.6), (11.4, 10.6, 2.2), p=3.2)
    bface = F.Face(rig, "torso", [belt])
    IW.stitches(rig, "torso", bface, [(-10.4, 21.9), (-3.0, 22.1), (4.0, 22.1), (10.6, 21.8)], I.LEATHER_DK, w=0.6,
                dash=1.0, gap=0.8)
    g = Geo().blob((11.5, -2.4, 20.6), (1.0, 2.2, 1.8), p=3.2)
    rig.part("torso", g, I.BRASS_LT, finish="metal", outline=0.4)
    skirt = Geo().blob((0.5, 0, 15.8), (11.4, 10.4, 5.8), p=2.6, taper=(1.1, 1.0))
    skirt.clip((0, 0, 13.0), (0, 0, -1))
    sface = F.Face(rig, "hips", [skirt])
    IW.folds(rig, "hips", sface, [[(-11.0, 14.2), (-4.0, 13.9), (4.0, 13.9), (11.4, 14.2)]], w=1.5, team=True)
    for s in ("r", "l"):
        y = I.LEG_Y * I.SIDE_Y[s]
        shin = Geo().capsule((0.5, y, KI.V3_KNEE_Z), (1.0, y, KI.V3_ANKLE_Z + 0.6), 3.9, 3.3)
        pface = F.Face(rig, f"shin_{s}", [shin])
        wraps = [[(-3.6, z - 1.3), (4.6, z + 1.3)] for z in (6.8, 9.0, 11.2)]
        g = Geo()
        for pts in wraps:
            IW.ribbon(g, pface, pts, 0.75, 0.3)
        rig.part(f"shin_{s}", g, PUTTEE_DK if s == "r" else "#5F5A4A", outline=0, highlight=False)


def _cap_detail(rig):
    """W3: the helmet's team-dark brim band and a row of brass rivets round its dome."""
    x, y, z = CAP_C
    dome = Geo().blob((x, y, z + 1.2), (12.4, 11.8, 7.2), p=2.2)
    dome.clip((x, y, z - 2.6), (0, 0, -1))
    hface = F.Face(rig, "hat", [dome])
    IW.folds(rig, "hat", hface, [[(x - 11.6, z - 0.8), (x - 3.0, z - 1.4), (x + 5.0, z - 1.4), (x + 11.6, z - 0.8)]],
             w=1.8, team=True)
    IW.rivets(rig, "hat", hface, [(x - 8.4, z + 1.6), (x - 3.0, z + 1.0), (x + 2.6, z + 1.0)], r=0.85,
              fill=I.BRASS_LT)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, armoured; never on the face or skin), measured in the posed frames:
    the plate's team panel (the biggest team field: he works behind the plate, r 8), the plate's iron beside it,
    the helmet, the jacket's back, a strip torn from the jacket's hem."""
    rig.damage_spot_at("plate", "mantlet", MX - 1.0, 24.4, 8.0, "metal", team=True)
    rig.damage_spot_at("iron", "mantlet", MX - 9.0, 18.0, 5.0, "metal", fill=PLATE)
    rig.damage_spot_at("helmet", "hat", -3.0, 62.0, 6.0, "metal", team=True)
    rig.damage_spot_at("jacket", "torso", -7.4, 26.0, 6.0, "cloth", team=True)
    rig.damage_spot_at("hem", "hips", -4.0, 15.0, 7.0, "cloth", kind="strip", team=True)


def _cap(rig, joint):
    """A round team steel helmet with a leather brim band and a brass badge."""
    x, y, z = CAP_C
    g = Geo().blob((x, y, z + 1.2), (12.4, 11.8, 7.2), p=2.2)
    g.clip((x, y, z - 2.6), (0, 0, -1))
    g.blob((x + 0.6, y, z - 2.0), (14.6, 13.6, 1.2), p=2.4)
    rig.part(joint, g, team=True, finish="metal")
    g = Geo().sphere((x + 11.6, y - 0.4, z + 1.2), 1.5, cuts=2)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.4)


def _mantlet(rig):
    """The wheeled steel mantlet on a root-level joint (turned toward the camera so the plate reads)."""
    rig.joint("mantlet", "root", (MX, 0, 4.0))
    g = Geo().blob((MX, -15.0, 22.0), (2.0, 12.0, 16.0), p=4.0, rot=(0, 0, 55))
    rig.part("mantlet", g, PLATE, finish="metal", outline=0.9)
    plate = Geo().blob((MX, -15.0, 22.0), (2.0, 12.0, 16.0), p=4.0, rot=(0, 0, 55))
    pf = F.Face(rig, "mantlet", [plate])
    # W3: the panel, the cog, the slot and the hazard bands conforming to the turned plate (flat decals sank in)
    g = IW.field(Geo(), pf, [(MX - 7.0, 14.0), (MX + 5.0, 14.0), (MX + 5.0, 32.0), (MX - 7.0, 32.0)], 0.5)
    rig.part("mantlet", g, team=True, outline=0)
    g = IW.cog(pf, Geo(), (MX - 1.0, 19.0), s=0.85, depth=0.75)       # in front of the panel
    rig.part("mantlet", g, I.CREAM, highlight=False, outline=0)
    g = IW.field(Geo(), pf, [(MX - 6.0, 28.6), (MX + 4.0, 28.6), (MX + 4.0, 30.6), (MX - 6.0, 30.6)], 0.6)
    rig.part("mantlet", g, I.COAL, highlight=False, outline=0)          # sight slot
    g = Geo()
    w, h, n, x0 = 14.0, 3.0, 4, MX - 8.0
    for k in range(n):
        a = x0 + k * w / n
        b = a + w / n * 0.5
        IW.field(g, pf, [(a, 7.9), (b, 7.9), (min(b + 1.8, x0 + w), 10.9), (min(a + 1.8, x0 + w), 10.9)], 0.4)
    rig.part("mantlet", g, I.CREAM, highlight=False, outline=0)
    # (the turned plate's outline seen from the camera: x 8-25 at its foot, 8-20 at its top edge, z 4-34)
    IW.rivets(rig, "mantlet", pf, IW.rivet_line((MX - 8.6, 32.8), (MX - 1.6, 32.8), 3) +
              IW.rivet_line((MX - 6.6, 12.2), (MX + 4.6, 12.2), 5), r=0.95, fill=I.IRON_LT)
    IW.plate_band(rig, "mantlet", pf, [(MX - 9.4, 33.6), (MX - 6.5, 34.1), (MX - 3.5, 33.7)], IRON_HI, w=0.9)
    g = Geo()
    for pts in ([(MX - 9.6, 22.0), (MX - 7.4, 23.6)], [(MX - 10.0, 27.6), (MX - 8.2, 29.0)],
                [(MX - 6.0, 33.0), (MX - 4.4, 31.9)]):
        IW.ribbon(g, pf, pts, 0.6, 0.45)
    rig.part("mantlet", g, IRON_HI, outline=0, highlight=False)
    IW.soot(rig, "mantlet", pf, [(MX - 4.0, 6.6, 3.0, 1.2), (MX + 3.4, 6.2, 2.4, 1.0)], fill=GRIME)
    g = Geo().capsule((MX - 3.0, -12.0, 26.0), (MX - 7.0, -4.0, 27.0), 1.0)
    rig.part("mantlet", g, I.IRON_DK, finish="metal", outline=0.4)     # push bar
    WHEELS.extend(I.wheel_row(rig, "wheel", "mantlet", [MX - 4.0, MX + 4.0], 4.4, -21.0, 4.4, bolts=4))


WHEELS = []


def grip(a, f, w, la=None, lf=None, lean=0.0):
    """Near arm (a, f) holds the rear grip with the drill pointing w; the far arm reaches the side grip."""
    la = a + 8 if la is None else la
    lf = f + 14 if lf is None else lf
    return merge(KI.aim_arm("r", a, f, lean, w), KI.aim_arm("l", la, lf, lean))


REST = (-82.0, -30.0, 8.0)      # the rifle level, bayonet poking through the slot
STANCE = merge(grip(*REST, lean=-2.0), {"torso": {"r": -2.0}})


def _idle(f):
    peek = [0.0, 0.5, 1.0, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return merge(grip(-82.0, -30.0 + 2 * ctx["c"], 8.0 + 2 * ctx["lag"], lean=-2.0),
                     {"head": {"r": -4 * peek, "z": 2.0 * peek}, "torso": {"r": -2.0 - 4 * peek}, "pupils": {"x": 0.8 * peek}})
    return M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


SPEED = 83.75
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=616)
CARRY = merge(grip(*REST, lean=-7.0), {"torso": {"r": -3.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        d = SPEED * 0.616 * f / 8.0
        return merge({"hand_r": {"r": -3 * lag}, "hat": {"r": -2.0 * lag}}, I.wheel_spin(WHEELS, d))
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-4.0, twist=3.0, nod=1.0, extra=extra, report=report)


# -- attack A: braced plunge (moves.SMALL_MELEE_MS, impact on 6). World angles.
#        read  tuck  draw HOLD  smear lead IMP  shove recoil settle settle
A_A = [-82, -90, -130, -150, -96, -50, -20, -18, -40, -70, -80]
A_F = [-30, -30, -40, -46, -14, -6, -4, -4, 4, -20, -28]
A_W = [8, 6, 6, 2, 0, 0, 0, 2, 10, 8, 8]
A_T = [-3, -4, 4, 6, -8, -14, -18, -16, -10, -5, -3]
A_TZ = [0, 8, 22, 30, 12, -4, -16, -18, -8, -2, 0]
A_X = [0.0, -0.5, -2.0, -3.0, 2.0, 6.0, 10.0, 10.5, 6.0, 2.0, 0.5]
A_Z = [0.0, -1.0, -2.4, -3.6, -3.0, -2.8, -3.4, -2.8, -1.6, -0.6, 0.0]
A_Q = [0.0, -0.04, -0.08, -0.10, 0.06, 0.04, -0.12, 0.03, -0.04, 0.0, 0.0]
A_THR = [2, 6, 14, 22, 26, 30, 36, 34, 22, 8, 2]
A_SHR = [0, -8, -24, -36, -30, -26, -28, -24, -14, -4, 0]
A_THL = [-2, -6, -14, -22, -26, -32, -38, -34, -20, -8, -2]
A_SHL = [0, -6, -14, -20, -12, -6, -4, -4, -4, -2, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(grip(A_A[f], A_F[f], A_W[f], lean=t), {
        "torso": {"r": t, "rz": A_TZ[f]},
        "head": {"r": -0.3 * t, "rz": -0.5 * A_TZ[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "sparks": {"show": f in (6, 7)},
        
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (4, 5):
        pose["rifle"] = {"sz": 1.12}
    if f in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS)


def _spin(point, frm=None):
    return {"kind": "rings", "joint": "rifle", "point": point, "radii_lu": (3.0, 5.0), "a0": -80.0, "a1": 260.0,
            "color": "#FFF4D6"}


def _sparks(seed, a0=-40.0):
    return [{"kind": "burst", "joint": "rifle", "point": TIP, "r0_lu": 6.0, "r1_lu": 15.0, "n": 8,
             "a0": a0, "arc": 160.0, "color": "#FFF4D6"},
            {"kind": "dust", "ground": (24.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": seed, "spread": 0.8}]


def _attack_clip():
    jab = {"kind": "streak", "joint": "rifle", "point": TIP, "color": STEEL, "width_lu": 8.0, "white": 0.35}
    ov = {
        3: [_spin(TIP)],
        4: [dict(jab, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(jab, **{"from": 3, "t0": 0.2, "t1": 1.0, "width_lu": 7.0})],
        6: [dict(jab, **{"from": 4, "t0": 0.4, "t1": 1.0, "width_lu": 6.0}), _spin(TIP)] + _sparks(61),
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, extra={"holdStep": 3})


# -- attack B: overhead drive. Unique frames 0, 1, 9, 10 are A's.
#        rise HOLD smear smear IMP  bounce recoil
B_A = [40, 100, 70, 20, -10, -16, -30]
B_F = [96, 130, 60, 10, -20, -26, -10]
B_W = [150, 190, 120, -40, -70, -74, -20]
B_T = [4, 10, -6, -14, -22, -20, -10]
B_X = [-1.0, -2.0, 1.5, 4.5, 7.0, 7.0, 4.0]
B_Z = [1.0, 2.6, 2.0, 0.0, -4.4, -2.6, -1.4]
B_Q = [0.04, 0.10, 0.08, 0.02, -0.16, 0.04, -0.05]
B_THR = [-2, -6, 12, 20, 30, 26, 14]
B_SHR = [-6, -12, -14, -18, -34, -26, -10]
B_THL = [6, 10, -8, -16, -26, -24, -12]
B_SHL = [-8, -12, -8, -8, -22, -16, -6]


def _b_pose(i):
    """Shield shove: leans into the plate and rams the mantlet a step forward; the rifle tucked."""
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    mx = [0.0, -1.5, -2.5, -2.5, 2.0, 5.0, 7.0, 6.0, 3.0][k]
    t = [-4, 2, 6, 6, -10, -18, -22, -18, -10][k]
    pose = merge(grip(-110 + 10 * min(k, 4), -60, 10, -40, -10, lean=t), {
        "torso": {"r": t}, "head": {"r": -0.3 * t},
        "mantlet": {"x": mx, "r": [0, 0, 1, 1, -2, -3, -4, -2, 0][k]},
        "thigh_r": {"r": [6, 12, 16, 18, 24, 30, 34, 30, 18][k]}, "shin_r": {"r": [-8, -16, -22, -24, -22, -20, -18, -16, -10][k]},
        "thigh_l": {"r": [-6, -12, -16, -18, -28, -36, -40, -34, -20][k]}, "shin_l": {"r": [-6, -10, -14, -14, -8, -4, -4, -4, -4][k]},
    }, I.wheel_spin(WHEELS, mx), M.body_about((0, 0, 22), x=[0.0, -1.0, -2.0, -2.0, 2.0, 5.0, 7.0, 6.0, 3.0][k],
                                               z=-2.0, q=[0, -0.04, -0.08, -0.08, 0.04, 0.06, -0.12, 0.02, 0][k]))
    pose = merge(pose, F.expr("yell" if k in (4, 5, 6) else "grit"))
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_b():
    ov = {
        6: [{"kind": "burst", "joint": "mantlet", "point": (MX + 4.0, -2.0, 28.0), "r0_lu": 8.0, "r1_lu": 16.0, "n": 7,
             "a0": -50.0, "arc": 110.0, "color": "#FFF4D6"},
            {"kind": "dust", "ground": (MX + 4.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 81, "spread": 1.2}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse, extra={"holdStep": 3})


def _c_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    t = B_T[k]
    pose = merge(grip(B_A[k], B_F[k], B_W[k], lean=t), {
        "torso": {"r": t, "rz": -6 if k < 2 else 4},
        "head": {"r": -0.5 * t},
        "thigh_r": {"r": B_THR[k]}, "shin_r": {"r": B_SHR[k]},
        "thigh_l": {"r": B_THL[k]}, "shin_l": {"r": B_SHL[k]},
        "sparks": {"show": k == 4},
    }, M.body_about((0, 0, 22), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    if k == 1:
        pose = merge(pose, {"foot_r": {"r": -18}, "foot_l": {"r": -20}})
    if k in (2, 3):
        pose["rifle"] = {"sz": 1.12}
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS, toes={"r": -18, "l": -20} if k == 1 else None)


def _attack_c():
    arc = {"kind": "arc", "joint": "rifle", "inner": (FIST[0], FIST[1], FIST[2] + BODY_L * 0.6), "outer": TIP,
           "color": STEEL, "white": 0.35, "taper": 0.15, "lines": 3}
    ov = {
        4: [dict(arc, **{"from": 3, "t0": 0.0, "t1": 0.95})],
        5: [dict(arc, **{"from": 3, "t0": 0.35, "t1": 1.0})],
        6: [dict(arc, **{"from": 5, "t0": 0.2, "t1": 1.0, "lines": 2}), _spin(TIP)] + _sparks(63, a0=10.0),
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


# -- attack C: rising bore. Unique frames 0, 9, 10 are A's; 1 tuck, 2 crouch, 3 HOLD (bit low, angled
# up), 4-5 smear, 6 IMPACT (up on the toes, bit up and forward), 7 grind, 8 recoil.
#        tuck crouch HOLD smear lead IMP grind recoil
C_A = [-80, -120, -140, -110, -60, -30, -28, -44]
C_F = [-20, -60, -80, -40, -10, 10, 12, 10]
C_W = [60, -10, -20, 0, 20, 34, 36, 50]
C_T = [-4, 2, 8, -2, -10, -14, -12, -8]
C_X = [0.0, -1.0, -2.0, 2.0, 5.0, 8.0, 8.5, 5.0]
C_Z = [-1.0, -4.0, -6.0, -4.0, -1.0, 1.5, 1.0, -0.6]


# -- shield_lock (items 51/52, extras sheet): the pose of Cover and of the Shield Wall ------------------------------
# Crouched in a brace behind the mantlet: the near foot forward and bent, the far leg driven back onto the ball of
# its foot, the body low and leaning in so his shoulder meets the plate, his eyes at the sight slot and the bayonet
# held level through it. A held loop of 4 frames: he leans in and the plate nudges forward on its wheels, then
# settles. The feet are solved onto fixed marks: they never move.
LOCK_FEET = {"r": (6.0, 0.0), "l": (-14.0, -26.0)}     # ankle x of each foot and its roll about the toe (deg)
LOCK = {"grip": (-84.0, -34.0, 6.0), "torso": -14.0, "head": 10.0, "x": 2.5, "z": -6.0}


def _lock_target(s, x, ang):
    lift = 5.6 * math.sin(math.radians(-ang)) if ang < 0 else 0.0
    return (LEGS[s], x, KI.V3_ANKLE_Z + lift, ang)


def _lock_pose(f):
    br = [0.0, 0.5, 1.0, 0.5][f]
    a, fo, w = LOCK["grip"]
    t = LOCK["torso"] - 2.0 * br
    pose = merge(grip(a - 2.0 * br, fo, w, lean=t), {
        "torso": {"r": t}, "head": {"r": LOCK["head"] + 1.5 * br, "z": -0.3 * br},
        "hat": {"r": 1.5 * br}, "mantlet": {"x": 0.8 * br, "r": -0.8 * br},
        "pupils": {"x": 0.8},
    }, I.wheel_spin(WHEELS, 0.8 * br), M.body_about((0, 0, 22), x=LOCK["x"] + 0.5 * br, z=LOCK["z"] - 0.4 * br))
    pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    return GT.solve(RIG, pose, {s: _lock_target(s, *LOCK_FEET[s]) for s in ("r", "l")})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 12 * a}, "arm_l": {"r": 14 * a},
                "hat": {"z": 2.5 * max(a, 0), "r": 8 * a}, "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


RIFLE_PATH = [None, (6, 20, 60), (10, 36, 170), (14, 40, 300), (18, 30, 420), (21, 14, 520),
              (23, 0, 590), (24, -6, 612), (24, -6, 612), (24, -6, 612)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(CARRY, M.die_d1(k, center_z=28.0, lie_z=12.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
        "mantlet": {"r": -[0, 4, 10, 22, 40, 60, 78, 86, 88, 88][k], "x": [0, 1, 2, 3, 4, 5, 6, 6, 6, 6][k]},
    })
    hp = KI.HAT_POP[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    wp = RIFLE_PATH[k]
    if wp is not None:
        x, z, r = wp
        pose["rifle"] = {"hide": True}
        pose["rifle_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
        M.clip("shield_lock", [_lock_pose(f) for f in range(4)], [220, 180, 220, 180], loop=True),
    ]
    return M.check_variants(M.check_contract(cl))
