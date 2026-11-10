"""Flare Spotter: Industrial Age support (docs/design-lane-ages.md A17.10). Flare (proj.flare), 200 lu,
~68 lu. Every hit marks the target (+20% damage taken) for 3 s; follows the front.

Look (A17.12, Industrial palette): a lanky forward observer in an iron-grey officer's peaked cap
(a flat wide top, a glossy peak, a team band, a brass badge),
a team Norfolk jacket with a belt, iron-grey sleeves with a wide team armband on the near arm,
cream breeches with leather gaiters, a tidy moustache and a pair of big brass-rimmed binoculars
hanging on a strap across his chest. In his near hand a stubby flare pistol (fat aged-brass
barrel, wooden grip) held up by his shoulder, muzzle skyward. The idle alternates: one breath with the
binoculars raised to his eyes, one with them lowered while he scans. The attack ("flare arc")
raises the pistol high overhead (about 65 degrees), holds, fires with a white-magenta flash
around a white flare core (never red, A17.12) and a smoke puff, kicks, then he throws his far
arm out to point at the marked target and settles. The projectile spawns at the per-frame
`muzzle` anchor; `binoculars` is exported for the mark reticle effect.

Animation standard (ANIM_SPEC 2026-10-02):
  walk      walk v3 bounce jog at ground speed (G1, 81 lu/s): the binoculars carried at his chest,
            the flare pistol pumping with the near arm, the map case kicking, planted feet
  attack    A as above; the hold is split into the aim and a jiggle frame (holdLoop)
  attack_b  POINTED FLAT SHOT: swings the pistol out level at arm's length, sights along it (the
            held extreme, holdLoop), fires a flat flare (flash forward), the kick flips his wrist up,
            then he points at the target with the far arm and shouts

Detail standard (art round W3, Track INDUSTRIAL): the Norfolk jacket's box pleats team-dark (the old thin coal
lines), a team-dark yoke and a pocket flap with a brass button; creases at the iron-grey sleeves' elbows; the
breeches' side seam and strapped gaiters; a polished band down the flare pistol's
brass barrel; the map case stitched. Aimed (queue item 44): A and B up about 45 and 70 degrees (aimed.variants on the
pistol: the arm and the lean turn together; A's skyward shot comes down to 45 too). Damage spots (posed frames
measured): the jacket's back (r 7.5), the near armband, the cap, the breeches, a strip from the jacket's hem.
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import industrial_w3 as IW

SLUG = "flare_spotter"
GAIT_NAME = "biped"
NAME = "Flare Spotter"
HEIGHT_LU = 70
CANVAS = (272, 248)
FEET = (116, 226)
ANCHORS = {"head": (2, 69), "hitCenter": (0, 32), "muzzle": (18, 52)}
NO_RETIME = True
CAP_C = (1.0, 0, 57.2)

HR = (0.6, I.ARM_Y["r"] - 1.2, I.HAND_Z - 0.2)   # near fist
BARREL = 14.0
BRASS_HI = "#C9BA8A"       # W3: the pistol barrel's polished band
CREAM_SEAM = "#ADA696"     # the breeches' seam
THREAD = "#CFC6B2"

# the detail standard (art round W3): the pilot's soldier lifts; cloth, leather, brass, iron and skin apart
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 1.2
LOOK_SHADE = IW.SHADE_SOLDIER
LOOK_RIM = IW.RIM_SOLDIER
MATERIAL_KINDS = IW.kinds({I.SKIN: "skin", I.HAIR: "fur", I.CREAM_DK: "cloth", CREAM_SEAM: "cloth", THREAD: "cloth",
                           I.IRON: "cloth", I.IRON_LT: "cloth", I.COAL_LT: "cloth", I.COAL: "leather",
                           I.LEATHER: "leather", I.LEATHER_DK: "leather", I.BOOT: "leather", I.WOOD_LT: "wood",
                           I.BRASS: "bronze", I.BRASS_LT: "bronze", BRASS_HI: "bronze", I.IRON_DK: "iron",
                           I.FLARE: "energy", I.FLARE_CORE: "energy", "team": "cloth"})


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=I.CREAM_DK, gaiter=I.LEATHER, thigh_r=4.5)
    I.jacket(rig, collar=I.COAL_LT, hem_z=13.0)
    _jacket_detail(rig)
    # binoculars on a strap across the chest
    g = Geo().capsule((8.0, -8.6, 36.0), (11.6, -3.0, 25.0), 0.8)
    g.capsule((8.0, 8.6, 36.0), (11.6, 3.0, 25.0), 0.8)
    rig.part("torso", g, I.LEATHER, outline=0.4)
    # binoculars in the far hand, modelled in front of the face (y near 0) so they read over it
    HL = (0.4, I.ARM_Y["l"], I.HAND_Z - 0.4)
    rig.joint("bino", "hand_l", HL)
    I.binoculars(rig, "bino", (HL[0] + 3.0, -1.0, HL[2] + 1.0), k=1.2)
    g = Geo().capsule((HL[0], HL[1] - 2.0, HL[2]), (HL[0] + 2.0, -1.0, HL[2] + 1.0), 1.6)
    rig.part("bino", g, I.SKIN, outline=0.4)
    rig.track("binoculars", "bino", (HL[0] + 3.0, -1.0, HL[2] + 1.0))

    KI.head_face(rig, brow=I.HAIR, brow_angry=False, mouth_dz=-9.0)
    I.moustache(rig, I.HAIR, curl=True, big=0.9)
    I.back_hair(rig, I.HAIR)
    I.ear(rig)
    rig.joint("hat", "head", CAP_C)
    I.peaked_cap(rig, c=CAP_C, joint="hat")
    # a brass whistle on a cord and a leather map case on the hip (secondary)
    g = Geo().capsule((9.0, 7.0, 36.0), (11.4, 0.0, 30.0), 0.5)
    rig.part("torso", g, I.CREAM_DK, outline=0.3)
    g = Geo().capsule((11.4, 0.4, 30.2), (12.6, -1.4, 27.4), 1.1)
    rig.part("torso", g, I.BRASS_LT, finish="metal", outline=0.5)
    rig.secondary("mapcase", "hips", (-2.0, -11.0, 18.0), (-3.0, -12.0, 10.5), max_deg=22, gain=1.3)
    g = Geo().blob((-2.6, -12.2, 14.2), (4.2, 1.6, 3.6), p=3.0)
    rig.part("mapcase", g, I.LEATHER, outline=0.6)
    g = Geo().blob((-2.6, -13.6, 15.8), (3.6, 0.6, 1.4), p=3.0)
    rig.part("mapcase", g, I.LEATHER_DK, outline=0.3)
    mface = F.Face(rig, "mapcase", [Geo().blob((-2.6, -12.2, 14.2), (4.2, 1.6, 3.6), p=3.0)])
    IW.stitches(rig, "mapcase", mface, [(-6.0, 11.4), (-2.6, 11.0), (0.8, 11.4)], I.LEATHER_DK, w=0.5, dash=0.9,
                gap=0.7)

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=I.IRON_LT, team_sleeve=False, fist=4.3, cuff=I.COAL_LT)
    I.shoulders(rig)
    I.armband(rig, "r")
    I.armband(rig, "l")
    for s_ in ("r", "l"):   # W3: creases bunched at the sleeves' elbows
        y = I.ARM_Y[s_]
        lo = Geo().capsule((0, y, I.ELBOW_Z), (0, y, I.HAND_Z + 2.0), 4.0, 3.8)
        IW.folds(rig, f"fore_{s_}", F.Face(rig, f"fore_{s_}", [lo]), [[(-2.8, 26.6), (0.2, 25.8), (2.8, 26.8)],
                                                                    [(-2.4, 24.2), (0.4, 23.6), (2.4, 24.4)]],
                 w=0.8, team=False, fill=I.IRON)

    # flare pistol along +X from the near fist
    rig.joint("pistol", "hand_r", HR)
    x, y, z = HR
    g = Geo().capsule((x - 1.0, y, z - 4.4), (x + 1.2, y, z + 1.0), 2.0, 2.2)   # grip
    rig.part("pistol", g, I.WOOD_LT)
    g = Geo().lathe([(0, 0), (3.2, 0.2), (3.4, BARREL - 2.4), (4.4, BARREL - 1.2), (4.4, BARREL), (0, BARREL)],
                    (x + 0.5, y, z + 2.0), (x + 0.5 + BARREL, y, z + 2.0), segs=18)
    rig.part("pistol", g, I.BRASS, finish="metal")
    g = Geo().capsule((x + 3.0, y - 2.75, z + 3.4), (x + 0.5 + BARREL - 2.8, y - 2.75, z + 3.4), 0.45, segs=8, rings=2)
    rig.part("pistol", g, BRASS_HI, finish="metal", outline=0)          # W3: the barrel's polished band
    g = Geo().blob((x + 0.2, y, z + 2.4), (3.2, 2.6, 3.0), p=3.2)   # breech and hammer
    g.capsule((x - 2.0, y, z + 4.0), (x - 3.6, y, z + 6.0), 0.9)
    rig.part("pistol", g, I.IRON_DK, finish="metal", outline=0.6)
    g = Geo().blob((x + 0.5 + BARREL + 0.3, y, z + 2.0), (0.4, 2.4, 2.4), p=2.2)   # the loaded flare
    rig.part("pistol", g, I.FLARE, outline=0.4)
    muz = (x + 1.0 + BARREL, y, z + 2.0)
    rig.track("muzzle", "pistol", muz)
    rig.joint("flash", "pistol", muz, hidden=True)
    g = Geo()
    for dx, dz, r in ((6.0, 0, (7.0, 2.4, 3.6)), (4.0, 2.6, (4.6, 2.0, 2.0)), (4.0, -2.6, (4.6, 2.0, 2.0))):
        g.blob((muz[0] + dx, muz[1] - 1, muz[2] + dz), r, p=2.0,
               rot=(0, (-36 if dz > 0 else 36) if dz else 0, 0))
    rig.part("flash", g, glow=I.FLARE, outline=0)
    g = Geo().sphere((muz[0] + 4.0, muz[1] - 2.4, muz[2]), 3.0, cuts=3)
    rig.part("flash", g, glow=I.FLARE_CORE, outline=0)
    I.smoke_puff(rig, "pistol", (muz[0] + 5.0, muz[1], muz[2] + 2.0), size=0.8)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry
        _damage_spots(rig)


def _jacket_detail(rig):
    """W3: the Norfolk jacket's box pleats team-dark, a team-dark yoke and pocket flap with a brass button; the
    breeches' side seam and the gaiters' straps (the surfaces rebuilt for the ray casts)."""
    body = Geo().blob((0, 0, 28.0), (10.6, 9.6, 11.6), p=2.4, taper=(1.08, 0.94))
    body.blob((0, 0, 18.4), (10.4, 9.6, 4.6), p=2.6)
    face = F.Face(rig, "torso", [body])
    IW.folds(rig, "torso", face, [[(x, 35.0), (x + 0.3, 22.6)] for x in (-6.0, 6.8)], w=1.6)          # box pleats
    IW.folds(rig, "torso", face, [[(-10.0, 34.0), (-4.0, 35.6), (2.0, 35.8)]], w=1.1)                # yoke
    IW.panel(rig, "torso", face, [(1.6, 26.2), (6.0, 26.4), (5.8, 28.0), (1.8, 27.8)])                 # pocket flap
    IW.rivets(rig, "torso", face, [(3.8, 26.6)], r=0.75, fill=I.BRASS_LT)
    ly = -I.LEG_Y
    thigh = Geo().capsule((0, ly, KI.V3_THIGH_Z), (0.5, ly, KI.V3_KNEE_Z), 4.5, 4.1)
    IW.seam(rig, "thigh_r", F.Face(rig, "thigh_r", [thigh]), [(0.4, 18.6), (0.7, 12.2)], fill=CREAM_SEAM, w=0.7)
    for s_, y in (("r", -I.LEG_Y), ("l", I.LEG_Y)):
        g = Geo().lathe([(3.85, 0), (4.05, 0.6), (4.05, 1.4), (3.8, 2.0)], (0.75, y, 8.6), (0.8, y, 10.6), segs=16)
        rig.part(f"shin_{s_}", g, I.LEATHER_DK if s_ == "r" else "#4A3A33", outline=0.4)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, soldier; never on the face or skin), measured in the posed frames: the
    jacket's back (the biggest team field the arms leave clear, r 7.5), the near armband, the cap's crown, the
    breeches, a strip torn from the jacket's hem."""
    rig.damage_spot_at("jacket", "torso", -7.4, 26.0, 7.5, "cloth", team=True)
    rig.damage_spot_at("armband", "arm_r", -1.0, 33.6, 5.0, "cloth", team=True)
    rig.damage_spot_at("cap", "hat", -2.0, 62.0, 5.0, "cloth", fill=I.IRON)
    rig.damage_spot_at("breeches", "thigh_r", -2.0, 15.0, 5.0, "cloth", fill=I.CREAM_DK)
    rig.damage_spot_at("hem", "hips", -4.0, 16.6, 7.0, "cloth", kind="strip", team=True)


def near(a, f, w):
    return I.arm("r", a, f, w=w, w_rest=0.0)


def far(a, f, w=0.0):
    return I.arm("l", a, f, w=w, w_rest=0.0)


IDLE_R = (-62.0, -18.0, -22.0)   # pistol held low and forward
LOOK = (10.0, 60.0)              # far arm: binoculars up at the eyes
DOWN = (-95.0, -70.0)            # far arm: binoculars lowered
STANCE = merge(near(*IDLE_R), far(*LOOK))

IDLE_MS = 150
# 8 unique idle poses in 1200 ms (as shipped) = two breaths: 0-2 binoculars at the eyes, 3
# lowering, 4-6 lowered (he scans, head turning, a blink on 5), 7 raising again
BINO = [1.0, 1.0, 1.0, 0.45, 0.0, 0.0, 0.0, 0.5]


def _idle(f):
    c, lag = I.idle_wave([0, 1, 2, 3, 3, 2, 1, 0][f])
    a, fo, w = IDLE_R
    k = BINO[f]
    la = DOWN[0] + (LOOK[0] - DOWN[0]) * k
    lf = DOWN[1] + (LOOK[1] - DOWN[1]) * k
    look = [0, 0, 0, -2, -5, 3, 6, 0][f]
    pose = merge(I.idle_body([0, 1, 2, 3, 3, 2, 1, 0][f]), near(a + 2 * lag, fo + 3 * lag, w + 3 * lag),
                 far(la + 1.5 * lag, lf + 2 * lag, -4.0 * lag), {"head": {"r": look}, "mapcase": {"r": 2 * lag}})
    if f == 5:
        pose = merge(pose, F.expr("blink"))
    if f in (4, 6):
        pose = merge(pose, {"pupils": {"x": 0.6, "z": 0.4}})
    return KI.ground_feet(RIG, pose, LEGS)


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 77 ms --------------
SPEED = 81.25
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=616)
CHEST = (-40.0, 70.0)            # far arm: the binoculars carried at his chest on the jog


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        sw = -math.cos(ctx["lag_p"])     # +1 = the near arm forward (the far leg is forward)
        a, fo, w = IDLE_R
        return merge(near(a + 28 * sw, fo + 22 * sw + 3 * lag, w + 14 * sw),
                     far(CHEST[0] + 4 * lag - 8 * sw, CHEST[1] + 4 * lag, -3.0 * lag),
                     {"mapcase": {"r": 6 * lag}, "hat": {"r": -1.5 * lag}})
    return M.walk_v3(RIG, f, {}, GAIT, legs=LEGS, lean=-9.0, twist=6.0, nod=3.0, extra=extra, report=report)


# 11 unique frames in 824 ms; the flare leaves on frame 4 at 291 ms (impactAt 0.3532, as shipped). The
# shipped 171 ms hold is split into the hold (111) and a jiggle partner (60) for the holdLoop.
ATTACK_MS = [50, 70, 111, 60, 70, 80, 90, 90, 70, 80, 53]
ATTACK_IMPACT = 4
U_OF = [0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9]     # unique frame -> row of the pose tables below
#       dip raise HOLD FIRE kick point shout bounce settle settle
NA = [-50, 20, 58, 60, 72, -30, -62, -62, -60, -60]
NF = [-20, 50, 68, 70, 86, -20, -30, -26, -20, -18]
NW = [-10, 50, 66, 66, 86, 10, -30, -26, -22, -22]
LA = [-20, -70, -110, -110, -104, 6, 10, -30, -2, 8]
LF = [0, -80, -90, -90, -84, 8, 14, -20, 40, 56]
BX = [-0.5, 0.0, 0.5, 0.5, -2.0, 3.0, 3.5, 2.0, 1.0, 0.0]
BZ = [-2.2, 0.5, 1.8, 1.8, -0.6, -1.0, -0.8, 0.0, 0.0, 0.0]
BQ = [-0.08, 0.04, 0.07, 0.08, -0.08, -0.03, -0.02, 0.0, 0.0, 0.0]
TR = [2, -2, 6, 6, 9, -12, -14, -6, -2, 0]
HD = [4, 8, 14, 14, 16, -6, -8, -2, 0, 0]


# aimed shots (queue item 44, ageborn_art/aimed.py): a turn of `turn` degrees up (negative: down) swings the pistol
# arm about the shoulder (the upper arm a share of it) and leans the body back with it (the arms are torso-space)
AIM_LEAN = 0.18           # torso r per degree of turn (positive leans back)
AIM_ARM = (0.6, 0.8)      # upper arm and forearm: their share of the turn (the pistol takes all of it)
AIM_HEAD = 0.30           # head r per degree, on top of the torso's lean
# per unique frame of A and B: 0 at rest, 1.0 on the hold, the fire (the release frame 4) and the kick
AIM_W = [0.0, 0.4, 1.0, 1.0, 1.0, 0.8, 0.4, 0.2, 0.0, 0.0, 0.0]
AIM_W_B = [0.0, 0.5, 1.0, 1.0, 1.0, 0.8, 0.45, 0.2, 0.0, 0.0, 0.0]


def _turned(na, nf, nw, tr, turn):
    if not turn:
        return na, nf, nw, tr
    lean = AIM_LEAN * turn
    return (na + AIM_ARM[0] * turn - lean, nf + AIM_ARM[1] * turn - lean, nw + turn - lean, tr + lean)


def _attack_pose(f, turn=0.0):
    wob = f == 3
    f = U_OF[f]
    j = 2.5 if wob else 0.0
    na, nf, nw, tr = _turned(NA[f] + j, NF[f] + j, NW[f] + 1.4 * j, TR[f], turn)
    pose = merge(near(na, nf, nw), far(LA[f] - 1.2 * j, LF[f]), {
        "torso": {"r": tr},
        "head": {"r": HD[f] + AIM_HEAD * turn},
        "hat": {"z": [0, 0, 0, 0, 1.6, 0, 0, 0, 0, 0][f], "r": [0, 0, 0, 0, 8, -3, -2, 0, 0, 0][f]},
        "thigh_r": {"r": [4, 4, 6, 6, 4, 16, 18, 12, 6, 2][f]},
        "shin_r": {"r": [-8, 0, -6, -6, -4, -6, -6, -4, -2, 0][f]},
        "thigh_l": {"r": [-4, -4, -6, -6, -8, -14, -16, -10, -6, -2][f]},
        "shin_l": {"r": [-8, 0, -8, -8, -4, -4, -4, -2, 0, 0][f]},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5), "s": [1, 1, 1, 1, 0.9, 1.3, 1, 1, 1, 1][f],
                  "z": [0, 0, 0, 0, 0, 3, 0, 0, 0, 0][f]},
        "mapcase": {"r": [0, 0, 0, 0, -10, 12, 4, -4, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=BX[f], z=BZ[f], q=BQ[f]))
    if f == 2:   # up on the toes, holding
        pose = merge(pose, {"shin_r": {"r": -10}, "shin_l": {"r": -10}})
    if f in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (3, 4):
        pose = merge(pose, F.expr("squeeze", "o"))
    elif f in (5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 1.0}})
    return KI.ground_feet(RIG, pose, LEGS, toes={"r": -14, "l": -14} if f == 2 else None)


def _attack_clip():
    ov = {
        4: [{"kind": "burst", "joint": "pistol", "point": (HR[0] + 1.0 + BARREL, HR[1], HR[2] + 2.0),
             "r0_lu": 7.0, "r1_lu": 12.0, "n": 6, "a0": 0.0, "arc": 150.0, "color": "#FBE3F4"}],
        6: [{"kind": "rings", "joint": "head", "point": (15.0, 0.0, 42.0), "radii_lu": (7.0, 11.0),
             "a0": -40.0, "a1": 40.0}],
        7: [{"kind": "rings", "joint": "head", "point": (15.0, 0.0, 42.0), "radii_lu": (9.0, 14.0, 19.0),
             "a0": -40.0, "a1": 40.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov, extra={"holdStep": 2, "holdLoop": [2, 3]})


# -- attack B: pointed flat shot ----------------------------------------------------------------
# unique frames: 0 = A dip, 1 swing out, 2 HOLD (the pistol level at arm's length, sighting along it,
# the far hand steadying the wrist), 3 jiggle (holdLoop), 4 FIRE (a flat flare, flash forward),
# 5 kick (the wrist flips up), 6 point (the far arm at the target), 7 shout, 8 settle, 9-10 = A settle
#        out  HOLD jig  FIRE kick point shout settle
PB_NA = [-30, -4, -2, -4, 30, -50, -60, -60]
PB_NF = [-20, -2, 0, -2, 46, -40, -32, -24]
PB_NW = [-10, -2, 1, -2, 50, -20, -26, -22]
PB_LA = [-40, -16, -18, -16, -40, 4, 8, -10]
PB_LF = [-20, -14, -16, -14, -60, 6, 12, 10]
PB_TR = [-4, -8, -8, -8, 6, -12, -14, -6]
PB_HD = [-2, -6, -7, -6, 10, -6, -8, -2]
PB_BX = [1.0, 2.0, 2.0, 1.0, -2.5, 3.0, 3.5, 2.0]
PB_BZ = [-1.0, -1.6, -1.6, -1.6, -0.4, -1.0, -0.8, 0.0]
PB_BQ = [-0.04, -0.06, -0.06, 0.04, -0.08, -0.03, -0.02, 0.0]
PB_TH = [(8, -8), (16, -14), (16, -14), (16, -14), (10, -16), (16, -14), (18, -16), (10, -8)]


def _b_pose(i, turn=0.0):
    if i in (0, 9, 10):
        return _attack_pose(i, turn)
    k = i - 1
    na, nf, nw, tr = _turned(PB_NA[k], PB_NF[k], PB_NW[k], PB_TR[k], turn)
    pose = merge(near(na, nf, nw), far(PB_LA[k], PB_LF[k]), {
        "torso": {"r": tr},
        "head": {"r": PB_HD[k] + AIM_HEAD * turn, "x": 1.0 if k in (1, 2) else 0.0},
        "hat": {"z": 1.6 if k == 4 else 0.0, "r": [0, 0, 0, 0, 8, -3, -2, 0][k]},
        "thigh_r": {"r": PB_TH[k][0]}, "thigh_l": {"r": PB_TH[k][1]},
        "flash": {"show": k == 3},
        "smoke": {"show": k in (4, 5), "s": [1, 1, 1, 1, 0.9, 1.3, 1, 1][k], "z": [0, 0, 0, 0, 0, 3, 0, 0][k]},
        "mapcase": {"r": [0, 0, 0, 0, -10, 12, 4, -4][k]},
    }, M.body_about((0, 0, 22), x=PB_BX[k], z=PB_BZ[k], q=PB_BQ[k]))
    if k in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif k in (3, 4):
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k in (5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 1.0}})
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_b():
    muz = (HR[0] + 1.0 + BARREL, HR[1], HR[2] + 2.0)
    ov = {
        4: [{"kind": "burst", "joint": "pistol", "point": muz, "r0_lu": 7.0, "r1_lu": 12.0, "n": 6,
             "a0": -60.0, "arc": 120.0, "color": "#FBE3F4"}],
        6: [{"kind": "rings", "joint": "head", "point": (15.0, 0.0, 42.0), "radii_lu": (7.0, 11.0),
             "a0": -40.0, "a1": 40.0}],
        7: [{"kind": "rings", "joint": "head", "point": (15.0, 0.0, 42.0), "radii_lu": (9.0, 14.0, 19.0),
             "a0": -40.0, "a1": 40.0}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 2, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 14 * a}, "arm_l": {"r": 30 * a}, "fore_l": {"r": 16 * a},
                "hat": {"z": 3.0 * max(a, 0), "r": 10 * a}, "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


def _die(k):
    # D3 dizzy sit: he spins in place, sits down hard, the cap slides down over one eye, the
    # binoculars flop into his lap and the pistol droops
    t = [0, 0, 0.1, 0.3, 1.0, 0.95, 1.0, 1.0, 1.0, 1.0][k]
    pose = merge(near(-60 + 40 * t, -30 + 10 * t, -40), far(-80 + 40 * t, -60 + 20 * t),
                 M.die_d3(k, center_z=28.0, height=HEIGHT_LU), K.d3_sit(k), {
                     "hat": {"r": -18 * t, "z": -2.5 * t, "x": 1.5 * t}})
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k <= 3:
        pose = merge(pose, F.expr("spiral", "o"))
    else:
        pose = merge(pose, F.expr("spiral", "tongue"))
    return pose


def clips():
    attack, attack_b = _attack_clip(), _attack_b()
    # aimed up about 45 and 70 degrees at flyers (the Flare Spotter hits air; they go to the extras sheet)
    aimed_a = AIMED.variants(RIG, attack, _attack_pose, AIM_W, aims=("up45", "up70"))
    aimed_b = AIMED.variants(RIG, attack_b, _b_pose, AIM_W_B, aims=("up45", "up70"))
    for v in aimed_a:
        AIMED.check_timing(attack, v)
    for v in aimed_b:
        AIMED.check_timing(attack_b, v)
    cl = [
        M.clip("idle", [_idle(f) for f in range(8)], [IDLE_MS] * 8, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack,
        attack_b,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    by = {c.name: c for c in cl}
    assert by["idle"].total_ms() == 1200
    cl += aimed_a + aimed_b
    M.check_variants(M.check_contract([c for c in cl if c.name != "idle"], attack_ms=824, attack_impact_at=0.3532))
    return cl
