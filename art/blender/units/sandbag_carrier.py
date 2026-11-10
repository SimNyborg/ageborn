"""Sandbag Carrier: Modern Age common infantry, Guard (CONTENT_PLAN 5.6). Sandbag, −25% from range ≥ 100, ~68 lu.

Look (A11, Modern palette): a stocky, stubbled, flat-nosed digger under a wide olive Brodie helmet (team
band, netting), a team tunic with team sleeves and cream chevrons, khaki webbing, olive trousers and
muddy boots. On his near shoulder he hauls a huge khaki sandbag (tied at the neck with string, a stencilled
cream stripe, a trickle of sand), which he also uses as his shield and his club.

"A viewer expects him to swing and slam the heavy sandbag and to plod along under it."

Animation (ANIM_SPEC G1 plodding jog at card 70 x 1.25 = 87.5 lu/s, appendix B shield infantry):
  idle      the bag on his shoulder, he shifts it and wipes his brow, blink
  walk      walk v3 plodding jog: heavy and low, the bag riding on his shoulder a frame late
  attack    OVERHEAD SLAM: he heaves the bag high over his head with both hands (the held extreme) and
            slams it down on the enemy in a puff of sand
  attack_b  SHOULDER SHOVE: he hugs the bag in front of his chest and crouches behind it (the held
            extreme), then rams it forward like a shield (a thrust)
  attack_c  SIDE SWING: he swings the bag down and back past his hip (the held extreme), then hooks it
            round flat into the enemy (a horizontal hit)
  hit       armoured: he ducks behind the bag, the helmet clanks down
  die       D1 fling and spin: the helmet pops off, the bag flops to the ground spilling sand
  shield_lock  (items 51/52, extras sheet) the bag hugged up in front of him as a wall, braced behind it with his
            eyes over the top: the pose of Cover and of the Shield Wall

Art round W3 (the detail standard): damage spots measured in posed frames (item 40) and the `shield_lock` pose.
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as GT
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_modern as KM
from ageborn_art import kit_modern_wave as W
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import modern_w3 as MW

SLUG = "sandbag_carrier"
GAIT_NAME = "biped"
NAME = "Sandbag Carrier"
HEIGHT_LU = 70
CANVAS = (320, 292)
FEET = (140, 256)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32)}
NO_RETIME = True

BAG_C = (0.0, 0.0, 0.0)      # bag joint origin (the bag is modelled about its own centre)
BAG_R = (12.5, 9.0, 8.0)     # half sizes: long axis along x
SACK = "#B39E74"
SACK_DK = "#8F7C58"
SAND = "#D8C49A"
PATCH = "#9C8862"        # W3: a sewn patch on the sack
STRING = "#E8DFC8"
TROUSERS = "#767B5A"     # kit_modern.legs_v3's olive trousers
STUBBLE = "#C9A88E"

# the detail standard (art round W3, ageborn_art/look.py): the lifts and the model detail of audit 5.1 / 5.2.
# What a player sees of a Sandbag Carrier is the huge sack, the Brodie and the tunic under it: burlap creases and a
# sewn patch on the sack (a big plain field, W1 lesson 6), worn chips on the Brodie, the tunic's team-dark hem,
# pocket flap and cuffs with a side seam and the khaki front brace, lighter boots.
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = MW.HIGHLIGHT_SOLDIER
LOOK_SHADE = MW.SHADE_SOLDIER
MATERIAL_KINDS = MW.kinds({R.SKIN: "skin", STUBBLE: "skin", R.HAIR: "fur", R.KHAKI: "cloth", R.KHAKI_LT: "cloth",
                           KM.NET: "cloth", KM.FELT: "cloth", KM.CREAM: "cloth", TROUSERS: "cloth", SACK: "cloth",
                           SACK_DK: "cloth", PATCH: "cloth", SAND: "stone", R.OLIVE: "iron", MW.CHIP: "iron",
                           MW.BOOT: "leather", "#2B2A2E": "leather", R.LEATHER: "leather", KM.MUD: "stone",
                           R.GUNMETAL: "iron", R.STEEL: "iron", KM.BRASS: "bronze", "team": "cloth"})


def _bag(rig, joint, k=1.0):
    rx, ry, rz = BAG_R
    g = Geo().blob((0, 0, 0), (rx * k, ry * k, rz * k), p=2.3, taper=(1.0, 0.92))
    face = F.Face(rig, joint, [Geo().blob((0, 0, 0), (rx * k, ry * k, rz * k), p=2.3, taper=(1.0, 0.92))])
    rig.part(joint, g, SACK, finish="matte")
    g = Geo().blob((rx * k + 1.6, 0, 0.6), (2.6, 3.0, 2.4), p=2.2)          # tied neck
    g.blob((rx * k + 4.0, 0, 1.2), (1.6, 2.2, 2.0), p=2.2)                   # the tuft
    rig.part(joint, g, SACK_DK, outline=0.6)
    g = Geo().lathe([(2.4, -0.4), (2.6, 0), (2.4, 0.4)], (rx * k + 0.8, 0, 0.6), (rx * k + 1.6, 0, 0.6), segs=12)
    rig.part(joint, g, STRING, outline=0.3)                                  # string
    c = face.hit(-1.0, 1.0)
    g = Geo()
    face.stroke(g, c, [(-8.0, 0.4), (7.0, 0.4)], 4.2, 0.4)                   # painted team stripe
    rig.part(joint, g, team=True, outline=0, highlight=False)
    g = Geo()
    face.stroke(g, c, [(-8.0, -3.4), (7.0, -3.4)], 1.0, 0.4)                 # stencilled cream line
    rig.part(joint, g, "#E8DFC8", outline=0, highlight=False)
    g = Geo()   # seams
    for dx in (-5.0, 4.0):
        g.capsule((dx, -ry * k + 0.4, -rz * k + 1.6), (dx + 1.0, -ry * k + 0.4, rz * k - 1.6), 0.4)
    # W3: burlap creases at the corners, where the full sack folds
    for pts in (((-10.6, 4.4), (-7.2, 6.2)), ((6.6, 5.8), (10.2, 3.8)), ((-10.2, -5.0), (-6.6, -6.6)),
                ((7.0, -6.6), (10.6, -4.6)), ((-2.0, 6.8), (2.4, 6.4))):
        face.stroke(g, c, [(x + 1.0, z - 1.0) for x, z in pts], 1.1, 0.4)
    rig.part(joint, g, SACK_DK, outline=0, highlight=False)
    g = Geo()   # W3: a sewn patch below the stencil line
    face.decal(g, c, [(1.4, -7.4), (6.4, -7.0), (6.2, -4.4), (1.2, -4.8)], 0.5)
    rig.part(joint, g, PATCH, outline=0.4, highlight=False)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, hat=None, stubble=True, mud=True, mouth_w=6.2, boot=MW.BOOT)
    MW.hat(rig, "brodie")                # W3: worn chips on the Brodie
    MW.tunic_w3(rig, pocket=KM.BRASS)    # W3: the tunic's team-dark hem and pocket flap, a side seam, the brace
    MW.cuffs(rig)
    KM.pouches(rig, "torso", [(9.4, -6.6, 19.4), (4.0, -10.4, 19.2)], size=(2.3, 1.7, 2.8))
    KM.canteen(rig, "torso", (-8.4, -9.6, 16.4), r=3.1)
    rig.joint("bag", "torso", (0.0, 0.0, 0.0))
    _bag(rig, "bag")
    rig.joint("sand", "bag", (BAG_R[0] + 4.0, -2.0, -2.0), hidden=True)      # a trickle of sand
    g = Geo()
    for dz, r in ((-2.0, 1.4), (-5.0, 1.1), (-8.0, 0.9)):
        g.sphere((BAG_R[0] + 4.0, -2.0, dz), r, cuts=3)
    rig.part("sand", g, SAND, finish="dust", outline=0.4)
    KI.loose(rig, "bag_loose", (0.0, -7.0, 0.0), lambda j: _bag(rig, j))
    rig.track("clubHead", "bag", (BAG_R[0], 0, 0))
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry (COMMON C1)
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40; art/blender/README.md), measured in posed frames: never on the face or skin."""
    rig.damage_spot_at("tunic", "torso", 4.0, 22.0, 8.0, "cloth", team=True)      # 70-100% (at (-7, 24): 46%)
    rig.damage_spot_at("sack", "bag", -4.0, -2.0, 8.0, "cloth", fill=SACK)       # 98-100%
    rig.damage_spot_at("helmet", "hat", -2.0, 66.0, 6.0, "metal", fill=R.OLIVE)
    rig.damage_spot_at("hem", "hips", -8.0, 12.0, 7.0, "cloth", kind="strip", team=True)


# -- poses: the bag at (bx, bz) torso space, turned `rot` degrees; the hands grab it by IK --------------
UNDER = ((7.0, -6.0), (-7.0, -6.0))       # both hands under the bag
BACK = ((-11.0, 3.0), (-11.0, -3.5))      # both hands on the bag's back end (hugged to the chest)
ONE = ((8.0, -6.0),)                      # the near hand under its front end


def bag(bx, bz, rot, grips=UNDER, by=-7.0):
    """The bag joint at torso (bx, bz), rotated rot; the hands grab it at `grips` (bag-local (x, z))."""
    pose = {"bag": {"x": bx, "y": by, "z": bz, "r": rot}}
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    for side, (dx, dz) in zip(("r", "l"), grips):
        hx, hz = bx + dx * c - dz * s, bz + dx * s + dz * c
        a, f = R.ik2(R.SH, (hx - 0.6, hz))
        pose.update(R.arm(side, a, f))
    return pose


SHOULDER = (-7.0, 42.0, 12.0)    # bag on his shoulder, behind the head
STANCE = merge(bag(*SHOULDER), {"torso": {"r": -3.0}})


def _idle(f):
    shift = [0.0, 0.3, 1.0, 0.7, 0.2, 0.0][f]
    wipe = [0.0, 0.0, 0.0, 0.6, 1.0, 0.3][f]

    def extra(ctx):
        p = bag(SHOULDER[0], SHOULDER[1] + 1.2 * shift + 0.5 * ctx["lag"], SHOULDER[2] - 4 * shift, grips=ONE)
        a, fo = R.ik2(R.SH, (10.0 - 3.0 * (1 - wipe), 36.0 + 12.0 * wipe))
        return merge(p, R.arm("l", a, fo), {"head": {"r": -4 * wipe}, "hat": {"r": -2 * shift}})
    pose = M.idle_v2(f, {"torso": {"r": -3.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=2)
    return KM.ground_feet(RIG, pose, LEGS)


# -- walk v3: plodding jog at ground speed (card 70 x 1.25 = 87.5 lu/s), 8 x 78 ms -------------------
SPEED = 87.5
LEGS = KM.legs_ik()
GAIT = KM.jog_gait(LEGS, SPEED, cycle_ms=624)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(bag(SHOULDER[0], SHOULDER[1] + 1.4 * lag, SHOULDER[2] - 3 * lag, grips=ONE),
                     {"hat": {"r": -1.4 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -4.0}}, GAIT, legs=LEGS, lean=-10.0, twist=5.0, nod=3.0,
                     arms={"l": KI.ArmChain("l")}, arm=30.0, extra=extra, report=report)


# -- attacks: moves.SMALL_MELEE_MS (impact on step 6 at 290 of 680 ms), 10 unique poses + the read again
#        read  lift  heave HOLD  smear smear IMP   over  recoil settle      (A: overhead slam)
A_BX = [-7.0, -8.0, -11.0, -13.0, -4.0, 6.0, 11.0, 11.0, 6.0, -5.0]
A_BZ = [42.0, 48.0, 52.0, 54.0, 54.0, 42.0, 27.0, 25.0, 31.0, 41.0]
A_ROT = [12.0, 30.0, 45.0, 52.0, 20.0, -20.0, -36.0, -40.0, -10.0, 10.0]
A_T = [-3, 6, 12, 15, 2, -14, -24, -24, -12, -4]
A_X = [0.0, -1.0, -2.0, -3.0, 1.0, 5.0, 8.0, 8.0, 5.0, 1.0]
A_Z = [0.0, 0.5, 1.0, 1.0, -0.5, -3.0, -5.5, -5.0, -2.5, 0.0]
A_Q = [0.0, 0.03, 0.05, 0.06, 0.03, 0.06, -0.12, -0.06, -0.03, 0.0]


def _pose(bx, bz, rot, t, x, z, q, k, hold_ks, smear_ks, impact_k=6, grips=UNDER):
    pose = merge(bag(bx, bz, rot, grips=grips), {
        "torso": {"r": t}, "head": {"r": -0.4 * t},
        "sand": {"show": k in (impact_k, impact_k + 1)},
    }, M.body_about((0, 0, 22), x=x, z=z, q=q))
    pose = KM.ground_feet(RIG, pose, LEGS)
    if k in smear_ks:
        pose["bag"]["sx"] = 1.12
    if k in hold_ks:
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in smear_ks or k in (impact_k, impact_k + 1):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _a_pose(f):
    return _pose(A_BX[f], A_BZ[f], A_ROT[f], A_T[f], A_X[f], A_Z[f], A_Q[f], f, (1, 2, 3), (4, 5))


#        read  hug   crouch HOLD smear smear IMP   over  recoil settle      (B: shoulder shove)
B_BX = [-7.0, 15.0, 14.0, 13.0, 18.0, 22.0, 25.0, 24.0, 16.0, 0.0]
B_BZ = [42.0, 32.0, 29.0, 28.0, 29.0, 30.0, 31.0, 31.0, 34.0, 43.0]
B_ROT = [12.0, 0.0, -4.0, -6.0, -2.0, 0.0, 2.0, 4.0, 6.0, 10.0]
B_T = [-3, -10, -18, -22, -24, -26, -28, -24, -12, -4]
B_X = [0.0, 0.0, -2.0, -3.5, 2.0, 7.0, 11.0, 11.0, 6.0, 1.0]
B_Z = [0.0, -2.0, -5.0, -6.0, -5.0, -5.0, -5.0, -4.5, -2.0, 0.0]
B_Q = [0.0, -0.04, -0.07, -0.09, 0.04, 0.06, -0.10, -0.05, -0.02, 0.0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_BX[f], B_BZ[f], B_ROT[f], B_T[f], B_X[f], B_Z[f], B_Q[f], f, (1, 2, 3), (4, 5), grips=BACK)


# C: side swing, one hand on the tied neck; the bag flies out from the hand along `phi` (deg)
#        read  drop  back  HOLD  smear smear IMP   over  recoil settle
C_HX = [0.0, 2.0, -3.0, -6.0, -2.0, 4.0, 8.0, 8.0, 5.0, 0.0]
C_HZ = [0.0, 26.0, 23.0, 22.0, 22.0, 26.0, 30.0, 33.0, 34.0, 0.0]
C_PHI = [0.0, -100.0, -140.0, -152.0, -100.0, -40.0, 8.0, 34.0, 80.0, 0.0]
C_T = [-3, -6, 4, 8, -4, -14, -20, -18, -10, -4]
C_X = [0.0, 0.0, -1.5, -2.5, 1.5, 5.0, 8.0, 8.0, 5.0, 1.0]
C_Z = [0.0, -2.5, -4.0, -4.5, -3.5, -3.0, -3.0, -2.5, -1.5, 0.0]
C_Q = [0.0, -0.04, -0.07, -0.08, 0.05, 0.06, -0.10, -0.05, -0.02, 0.0]
NECK = BAG_R[0] + 1.5


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    hx, hz, phi = C_HX[f], C_HZ[f], C_PHI[f]
    bx = hx + NECK * math.cos(math.radians(phi))
    bz = hz + NECK * math.sin(math.radians(phi))
    pose = _pose(bx, bz, phi + 180.0, C_T[f], C_X[f], C_Z[f], C_Q[f], f, (1, 2, 3), (4, 5), grips=((NECK, 0.0),))
    pose["torso"]["rz"] = [0, 10, 26, 32, 10, -14, -26, -24, -10, 0][f]
    a = -40.0 - 30.0 * (f in (5, 6, 7))
    return merge(pose, R.arm("l", a - 60, a - 90))


ARC = {"kind": "arc", "joint": "bag", "inner": (0.0, 0.0, 0.0), "outer": (BAG_R[0] + 3.0, 0, 0), "color": SACK,
       "taper": 0.25, "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 18, "band": 0.5}
SHOVE = {"kind": "streak", "joint": "bag", "point": (0.0, 0.0, BAG_R[2]), "color": SACK, "width_lu": 10.0,
         "white": 0.35}


def _fx(seed, a0=-80.0, point=(BAG_R[0], 0, 0)):
    return [{"kind": "burst", "joint": "bag", "point": point, "r0_lu": 8.0, "r1_lu": 14.0, "n": 6, "a0": a0,
             "arc": 150.0, "color": "#FFF1C8"},
            {"kind": "dust", "ground": (20.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": seed, "spread": 1.0,
             "color": "#D8C49A"}]


def _attack_clip():
    ov = {4: [dict(ARC, **{"from": 3})], 5: [dict(ARC, **{"from": 4})],
          6: [dict(ARC, **{"from": 5, "t1": 1.0, "lines": 2})] + _fx(71, a0=-120.0)}
    return M.clip("attack", [_a_pose(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, sequence=list(range(10)) + [0], extra={"holdStep": 3})


def _attack_b():
    ov = {4: [dict(SHOVE, **{"from": 3})], 5: [dict(SHOVE, **{"from": 4})],
          6: [dict(SHOVE, **{"from": 5, "width_lu": 8.0})] + _fx(72, a0=-60.0, point=(0.0, 0.0, BAG_R[2]))}
    return M.clip("attack_b", [_b_pose(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, sequence=list(range(10)) + [0], reuse={0: ("attack", 0), 9: ("attack", 9)},
                  extra={"holdStep": 3})


def _attack_c():
    ov = {4: [dict(ARC, **{"from": 3})], 5: [dict(ARC, **{"from": 4})],
          6: [dict(ARC, **{"from": 5, "t1": 1.0, "lines": 2})] + _fx(73, a0=-50.0)}
    return M.clip("attack_c", [_c_pose(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, sequence=list(range(10)) + [0], reuse={0: ("attack", 0), 9: ("attack", 9)},
                  extra={"holdStep": 3})


def _hit(k):
    a = M.HIT_AMT[k]
    duck = max(a, 0.0)
    pose = merge(bag(15.0 - 2 * duck, 32.0 - 3 * duck, 0.0, grips=BACK),
                 {"torso": {"r": -3.0 + 10 * a}, "head": {"r": 10 * a, "z": -2.5 * duck},
                  "hat": {"z": -2.0 * duck, "r": 6 * a}, "thigh_r": {"r": 14 * duck}, "shin_r": {"r": -18 * duck}},
                 M.body_about((0, 0, 22), x=-2.5 * a, z=-1.5 * duck))
    if k in (0, 1):
        pose = merge(pose, F.expr("squeeze", "grit"))
    return KM.ground_feet(RIG, pose, LEGS)


BAG_FLOP = [None, (2, 48, 20), (6, 46, 50), (10, 36, 80), (12, 24, 95), (14, 10, 100), (15, 7.5, 100),
            (15, 7.2, 100), (15, 7.2, 100), (15, 7.2, 100)]


def _die(k):
    return W.die_d1_pose(k, STANCE, HEIGHT_LU, prop="bag", prop_path=BAG_FLOP)


# -- shield_lock (items 51/52, extras sheet): the pose of Cover and of the Shield Wall -------------------------------
# The bag hugged up in front of his chest as a wall (both hands round its back end, as B's hold), he crouches into a
# brace behind it: the near leg forward and bent, the far leg driven back onto the ball of its foot, his shoulder
# leaning into the sack and his eyes peering over its top. A held loop of 4 frames: he leans in, the bag nudges
# forward, and settles back. The feet are solved onto fixed marks: they never move.
LOCK_FEET = {"r": (9.0, 0.0), "l": (-12.0, -26.0)}   # ankle x of each foot and its roll about the toe (deg)
LOCK = {"bag": (13.0, 34.5, 72.0), "torso": -10.0, "head": 6.0, "x": 1.5, "z": -6.0}   # the sack stood upright


def _planted(s, x, ang):
    """IK target of foot `s` set down with its ankle at x, rolled `ang` degrees about the toe."""
    leg = LEGS[s]
    gz = leg.end.z
    px, pz = x + leg.toe.x - leg.end.x, gz + leg.toe.z - leg.end.z
    dx, dz = x - px, gz - pz
    r = math.radians(ang)
    return (leg, px + dx * math.cos(r) - dz * math.sin(r), pz + dx * math.sin(r) + dz * math.cos(r), ang)


def _lock_pose(f):
    br = [0.0, 0.5, 1.0, 0.5][f]
    bx, bz, rot = LOCK["bag"]
    pose = merge(bag(bx + 0.8 * br, bz - 0.3 * br, rot - 1.5 * br, grips=BACK), {
        "torso": {"r": LOCK["torso"] - 2.0 * br}, "head": {"r": LOCK["head"] + 1.5 * br, "z": -0.4 * br},
        "hat": {"r": 2.0 * br},
    }, M.body_about((0, 0, 22), x=LOCK["x"] + 0.5 * br, z=LOCK["z"] - 0.4 * br, q=-0.03 - 0.01 * br))
    pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    return GT.solve(RIG, pose, {s: _planted(s, *LOCK_FEET[s]) for s in ("r", "l")})


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
