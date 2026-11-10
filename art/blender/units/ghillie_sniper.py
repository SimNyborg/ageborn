"""Ghillie Sniper: Modern Age epic sniper (CONTENT_PLAN 5.6). Bullet (proj.bullet), 360 lu, priority back line, ~66 lu.

Look (A11, Modern palette): a patient, squinting marksman buried in a shaggy ghillie suit of leaf tufts in
three muted greens with team-dyed tufts woven in, a team hood band and team sleeves under the leaves, olive
trousers and puttees. His long bolt-action rifle has a scope with a lens that glints and a strip of leafy
burlap wrapped round the barrel.

"A viewer expects him to kneel or lie still, a scope glint, then one crack and a long bolt cycle, and to creep
slowly in a crouch."

Animation (ANIM_SPEC G1 creep at card 55 x 1.25 = 68.75 lu/s, appendix B guns):
  idle      kneeling half-hidden, the tufts stir, he peers through the scope and lowers it, blink
  walk      walk v3 slow crouched creep: low and long, the rifle held low in both hands, the tufts swaying
  attack    KNEELING SHOT: on one knee, cheek on the stock, the scope glints (the held extreme), crack,
            the kick rocks him, a long bolt cycle (a casing flips out)
  attack_b  PRONE SHOT: he drops flat on his belly with the rifle on its bipod (the held extreme, a body
            level no other pose has), crack, works the bolt lying down and pushes back up
  hit       light: the head snaps back, the tufts flutter, eyes squeezed
  die       D1 fling and spin: the rifle flies, tufts scatter; X eyes and tongue
  aim       (items 51/52, extras sheet) the Aimed Shot's long hold: on one knee, cheek on the stock, the scope
            glint pulsing (A's cheek and hold frames reused, so it costs no pixels)

Art round W3 (the detail standard): both shots aimed up about 45 and 70 degrees at flyers (item 44), damage spots
measured in posed frames (item 40) and the `aim` pose.
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_modern as KM
from ageborn_art import kit_modern_wave as W
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import modern_w3 as MW

SLUG = "ghillie_sniper"
GAIT_NAME = "biped"
NAME = "Ghillie Sniper"
HEIGHT_LU = 66
CANVAS = (440, 272)
FEET = (200, 244)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 30), "muzzle": (60, 32)}
NO_RETIME = True

G0 = (4.0, -15.0, 27.0)
FORE = 15.0
LENGTH = 54.0
MUZ = (G0[0] + LENGTH + 1.0, G0[1], G0[2] + 1.8)
SCOPE = (G0[0] + 6.0, G0[1], G0[2] + 5.4)
BRASS = "#C8B27A"
SCOPE_C = "#2F3336"
TROUSERS = "#767B5A"     # kit_modern.legs_v3's olive trousers

# the detail standard (art round W3, ageborn_art/look.py): the lifts and the model detail of audit 5.1 / 5.2.
# What a player sees of a Ghillie Sniper is the shaggy suit of leaf tufts with team-dyed tufts woven in, the hood
# band and the long scoped rifle: the team-dyed tufts in two tones (team and team-dark in turn, so the team reads as
# woven-in colour, not a patch), lighter boots.
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = MW.HIGHLIGHT_SOLDIER
LOOK_SHADE = MW.SHADE_SOLDIER
MATERIAL_KINDS = MW.kinds({R.SKIN: "skin", R.HAIR: "fur", W.LEAF: "fur", W.LEAF_DK: "fur", W.LEAF_LT: "fur",
                           R.KHAKI: "cloth", R.KHAKI_LT: "cloth", TROUSERS: "cloth", MW.BOOT: "leather",
                           "#2B2A2E": "leather", R.LEATHER: "leather", R.WOOD: "wood", R.GUNMETAL: "iron",
                           SCOPE_C: "iron", BRASS: "bronze", "team": "fur"})


def _rifle(rig, joint):
    gx, gy, gz = G0
    g = Geo()
    g.blob((gx - 8.5, gy, gz - 2.2), (8.5, 2.3, 3.8), p=2.8, rot=(0, 16, 0), taper=(1.0, 0.75))
    g.capsule((gx - 1.0, gy, gz), (gx + LENGTH * 0.6, gy, gz + 0.6), 2.0, 1.6)
    rig.part(joint, g, R.WOOD)
    g = Geo().capsule((gx + 2.0, gy, gz + 1.8), (gx + LENGTH, gy, gz + 1.8), 1.3, 1.0)
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.9)
    g = Geo().capsule((SCOPE[0] - 6.0, gy, SCOPE[2]), (SCOPE[0] + 7.0, gy, SCOPE[2]), 1.6, 1.8)   # scope
    g.capsule((SCOPE[0] - 1.0, gy, SCOPE[2] - 1.0), (SCOPE[0] - 1.0, gy, gz + 2.0), 0.8)
    g.capsule((SCOPE[0] + 3.0, gy, SCOPE[2] - 1.0), (SCOPE[0] + 3.0, gy, gz + 2.0), 0.8)
    rig.part(joint, g, SCOPE_C, finish="metal", outline=0.7)
    g = Geo()   # leafy burlap wraps on the barrel
    for x in (gx + 22.0, gx + 30.0, gx + 38.0):
        g.blob((x, gy, gz + 1.8), (2.6, 2.2, 2.4), p=2.0)
    rig.part(joint, g, W.LEAF, finish="hair", outline=0.4)
    g = Geo()   # bipod legs folded under the fore-end
    g.capsule((gx + 30.0, gy, gz + 1.0), (gx + 40.0, gy - 1.0, gz - 1.0), 0.6)
    g.capsule((gx + 30.0, gy, gz + 1.0), (gx + 40.0, gy + 1.0, gz - 1.0), 0.6)
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.4)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, hat=None, brow_angry=False, mouth_w=4.6, chevrons=0, boot=MW.BOOT)
    # the ghillie hood: a team band, then leaf tufts all over the head, torso, arms and thighs
    g = Geo().lathe([(11.6, 0), (12.4, 1.6), (11.8, 3.2)], (1.0, 0, 54.0), (1.0, 0, 57.4), segs=22)
    rig.part("head", g, team=True, outline=0.6)
    hood = []
    for a in range(0, 360, 30):
        r = math.radians(a)
        hood.append((-1.0 + 10.0 * math.cos(r), 9.0 * math.sin(r), 60.0 + 2.0 * math.sin(2 * r)))
    hood += [(-6.0, 0.0, 64.0), (2.0, -4.0, 65.0), (2.0, 4.0, 65.0), (-10.0, -6.0, 52.0), (-10.0, 6.0, 52.0)]
    W.leaf_tufts(rig, "head", hood, size=3.6, seed=3)
    body = []
    for z in (22.0, 28.0, 34.0):
        for x, y in ((-9.0, -6.0), (-9.0, 6.0), (-4.0, -10.0), (5.0, -10.0), (9.0, -4.0), (9.0, 4.0)):
            body.append((x, y, z + (1.5 if x > 0 else 0.0)))
    W.leaf_tufts(rig, "torso", body, size=3.4, seed=5, colors=(W.LEAF, W.LEAF_DK, None) if False else (W.LEAF, W.LEAF_DK, W.LEAF_LT))
    # team-dyed tufts woven in on the back and shoulders (the team cue on the leafy silhouette)
    # (W3: in two tones, team and team-dark in turn)
    tufts = ((-10.0, -4.0, 31.0), (-10.0, 4.0, 25.0), (-6.0, -10.0, 37.0), (-3.0, -11.0, 26.0),
             (2.0, -11.6, 33.0), (-11.0, -2.0, 20.0), (6.0, -11.0, 22.0))
    for dark in (False, True):
        g = Geo()
        for i, (x, y, z) in enumerate(tufts):
            if (i % 2 == 1) == dark:
                g.blob((x, y, z), (4.4, 3.2, 2.8), p=2.0)
        if dark:
            look.team_part(rig, "torso", g, finish="hair", outline=0.4)
        else:
            rig.part("torso", g, team=True, finish="hair", outline=0.4)
    g = Geo()
    for x, y, z in ((-6.0, -8.0, 62.0), (-10.0, 0.0, 60.0)):
        g.blob((x, y, z), (3.8, 3.0, 2.4), p=2.0)
    rig.part("head", g, team=True, finish="hair", outline=0.4)
    look.team_part(rig, "head", Geo().blob((4.0, -9.0, 63.0), (3.8, 3.0, 2.4), p=2.0), finish="hair", outline=0.4)
    for s in ("l",):
        y = R.ARM_Y[s]
        W.leaf_tufts(rig, f"arm_{s}", [(-2.0, y, 34.0), (2.0, y, 30.0)], size=2.8, seed=7)
    for s in ("r", "l"):
        W.leaf_tufts(rig, f"thigh_{s}", [(-2.0, R.LEG_Y * R.SIDE_Y[s], 15.0), (2.5, R.LEG_Y * R.SIDE_Y[s], 12.5)],
                     size=2.8, seed=9)
    rig.joint("gun", "torso", G0)
    _rifle(rig, "gun")
    rig.track("muzzle", "gun", MUZ)
    KI.loose(rig, "gun_loose", G0, lambda j: _rifle(rig, j))
    R.muzzle_flash(rig, "gun", MUZ, size=1.8)
    rig.joint("glint", "gun", (SCOPE[0] + 7.4, G0[1] - 2.0, SCOPE[2]), hidden=True)
    g = Geo().star((SCOPE[0] + 8.0, G0[1] - 3.0, SCOPE[2] + 0.4), 5.0, 1.4, 0.8, points=4)
    rig.part("glint", g, glow="#FFFFFF", outline=0)
    rig.joint("bolt", "gun", (G0[0] + 2.5, G0[1] - 1.6, G0[2] + 3.4))
    g = Geo().capsule((G0[0] + 2.5, G0[1] - 1.6, G0[2] + 3.4), (G0[0] + 2.0, G0[1] - 4.8, G0[2] + 2.4), 0.9)
    g.sphere((G0[0] + 2.0, G0[1] - 5.0, G0[2] + 2.3), 1.4, cuts=3)
    rig.part("bolt", g, R.GUNMETAL, finish="metal", outline=0.5)
    rig.joint("casing", "root", (G0[0] + 2, G0[1] - 3, G0[2] + 9), hidden=True)
    g = Geo().capsule((G0[0] + 0.5, G0[1] - 3.5, G0[2] + 9.0), (G0[0] + 4.0, G0[1] - 3.5, G0[2] + 10.6), 1.2)
    rig.part("casing", g, BRASS, finish="metal", outline=0.5)
    rig.joint("bipod", "gun", (G0[0] + 30.0, G0[1], G0[2] + 1.0), hidden=True)
    g = Geo()
    g.capsule((G0[0] + 34.0, G0[1], G0[2] + 1.0), (G0[0] + 36.0, G0[1] - 2.0, G0[2] - 9.0), 0.7)
    g.capsule((G0[0] + 34.0, G0[1], G0[2] + 1.0), (G0[0] + 36.0, G0[1] + 2.0, G0[2] - 9.0), 0.7)
    rig.part("bipod", g, R.GUNMETAL, finish="metal", outline=0.4)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry (COMMON C1)
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40; art/blender/README.md), measured in posed frames: never on the face or skin."""
    rig.damage_spot_at("suit", "torso", -6.0, 24.0, 8.0, "cloth", team=True)       # 100% in idle, walk, A and B
    rig.damage_spot_at("hood", "head", 2.0, 62.0, 6.0, "cloth", team=True)         # 100%
    rig.damage_spot_at("skirt", "hips", -6.0, 12.0, 7.0, "cloth", team=True)       # 75-96%


def hold(gx, gz, deg, fore=FORE):
    return R.hold2("gun", G0, fore, gx, gz, deg)


# aimed shots (queue item 44, ageborn_art/aimed.py): kneeling (A) a turn of `turn` degrees up tips the rifle up about
# the grip, which rises and draws back toward the cheek, he leans back and looks up along it, the far hand slides
# down the fore-end (the arm's reach); prone (B) he arches up off the ground on his elbows (the chest lifts, the legs
# stay flat), the rifle climbing with him.
AIM_LEAN, AIM_RISE, AIM_DRAW, AIM_HEAD, AIM_FORE = 0.24, 0.10, 0.06, 0.26, 0.08
AIM_ARCH = 0.62
AIM_W = [0.0, 0.5, 0.9, 1.0, 1.0, 0.7, 0.45, 0.2, 0.0, 0.0]     # per unique frame (A and B: fire on 3)


LOW = (5.0, 24.0, -8.0)
STANCE = merge(hold(*LOW), {"torso": {"r": -8.0}})
KNEEL_DROP = 13.0


def _idle(f):
    peer = [0.0, 0.4, 1.0, 1.0, 0.5, 0.0][f]

    def extra(ctx):
        return merge(hold(5.0 + 1.5 * peer, 24.0 + 9.0 * peer + 0.4 * ctx["lag"], -8.0 + 10.0 * peer),
                     {"head": {"r": -4 * peer, "x": 1.2 * peer}, "pupils": {"x": 0.3 * peer}})
    pose = M.idle_v2(f, {"torso": {"r": -8.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)
    pose = KM.kneel(RIG, pose, LEGS, drop=KNEEL_DROP, front=12.0)
    if 2 <= f <= 3:
        pose = merge(pose, F.expr("squeeze"))
    return pose


SPEED = 68.75
LEGS = KM.legs_ik()
GAIT = KM.jog_gait(LEGS, SPEED, cycle_ms=640, stance=0.42)
CREEP_BOB = [-5.0, -6.0, -3.6, -2.4]


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return hold(LOW[0], LOW[1] + 0.6 * lag, LOW[2] - 3 * lag)
    return M.walk_v3(RIG, f, {"torso": {"r": -8.0}}, GAIT, legs=LEGS, bob=CREEP_BOB, sq=M.BRISK_SQ, lean=-18.0,
                     twist=4.0, nod=2.0, extra=extra, report=report)


# 10 unique frames in 900 ms; the shot on frame 3 at 340 ms (impactAt 0.3778)
ATTACK_MS = [50, 70, 220, 70, 80, 80, 80, 80, 80, 90]
ATTACK_IMPACT = 3
#        raise cheek HOLD  FIRE  kick  boltUp boltBack home lower settle      (A: kneeling shot)
A_GX = [5.5, 6.5, 7.0, 7.0, 4.5, 6.0, 6.0, 6.0, 5.5, 5.0]
A_GZ = [28.0, 33.0, 34.0, 34.0, 35.5, 33.5, 33.5, 33.5, 29.0, 24.5]
A_DEG = [6.0, 1.0, 0.0, 0.0, 12.0, 4.0, 4.0, 3.0, -2.0, -8.0]
A_T = [-6, -8, -9, -9, 0, -4, -4, -4, -6, -8]
BOLT = [None, None, None, None, None, (0, 0, 70), (-3.8, 0, 70), (0, 0, 70), None, None]
CAS = [None, None, None, None, None, None, (-4, 5, 70), (-10, 10, 200), None, None]


def _bolt_hand(pose, gx, gz, deg, b):
    bx, bz, brx = b
    pose["bolt"] = {"x": bx, "z": bz, "rx": brx}
    rad = math.radians(deg)
    kx = gx + (2.0 + bx) * math.cos(rad) - 3.4 * math.sin(rad)
    kz = gz + (2.0 + bx) * math.sin(rad) + 4.0 * math.cos(rad)
    a, fo = R.ik2(R.SH, (kx - 1.0, kz))
    pose.update(R.arm("r", a, fo))


def _a_pose(f, turn=0.0):
    t0 = A_T[f]
    up = max(0.0, turn)
    lean = AIM_LEAN * turn
    t = t0 + lean
    gx, gz = A_GX[f] - AIM_DRAW * up, A_GZ[f] + AIM_RISE * up
    deg = A_DEG[f] - t0 + turn - lean
    pose = merge(hold(gx, gz, deg, FORE - AIM_FORE * up), {
        "torso": {"r": t}, "head": {"r": [-2, -5, -6, -6, 6, 0, 0, 0, 0, 0][f] - 0.3 * t0 + AIM_HEAD * turn,
                                     "x": 1.4 if f in (1, 2, 3) else 0.0, "z": -1.2 if f in (1, 2, 3) else 0.0},
        "flash": {"show": f == 3}, "glint": {"show": f == 2},
    }, M.body_about((0, 0, 22), x=[0, 1, 1.5, 1.5, -2.5, -1, -1, -0.5, 0, 0][f],
                    q=[0, -0.03, -0.05, 0.03, -0.10, -0.02, -0.02, 0, 0, 0][f]))
    if BOLT[f] is not None:
        _bolt_hand(pose, gx, gz, deg, BOLT[f])
    if CAS[f] is not None:
        x, z, r = CAS[f]
        pose["casing"] = {"show": True, "x": x + gx - A_GX[f], "z": z - KNEEL_DROP + gz - A_GZ[f], "r": r}
    pose = KM.kneel(RIG, pose, LEGS, drop=KNEEL_DROP, front=12.0)
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.0}})
    elif f == 4:
        pose = merge(pose, F.expr("grit"))
    return pose


#        drop  HOLD  FIRE  kick  boltUp boltBack home  push      (B: prone shot; 0 and 9 = A's)
B_ROLL = [-50.0, -78.0, -78.0, -76.0, -78.0, -78.0, -78.0, -40.0]
B_Z = [-8.0, -15.0, -15.0, -15.0, -15.0, -15.0, -15.0, -7.0]
B_X = [4.0, 10.0, 10.0, 8.5, 10.0, 10.0, 10.0, 5.0]
B_DEG = [40.0, 76.0, 76.0, 84.0, 78.0, 78.0, 78.0, 40.0]   # torso space: the body is rotated -78
B_BOLT = [None, None, None, None, (0, 0, 70), (-3.8, 0, 70), (0, 0, 70), None]


def _b_pose(i, turn=0.0):
    if i in (0, 9):
        return _a_pose(i)
    k = i - 1
    arch = AIM_ARCH * max(0.0, turn)          # the chest lifts off the ground (the legs stay flat)
    gx, gz, deg = 8.0, 32.0, B_DEG[k] + turn - arch
    pose = merge(hold(gx, gz, deg, FORE - AIM_FORE * max(0.0, turn)), {
        "torso": {"r": arch},
        "head": {"r": (50.0 if k in range(1, 7) else 25.0) - 0.75 * arch + AIM_HEAD * turn, "x": 1.0},
        "flash": {"show": k == 2},
        "glint": {"show": k == 1}, "bipod": {"show": 1 <= k <= 6},
        "thigh_r": {"r": -8}, "shin_r": {"r": -6}, "thigh_l": {"r": -14}, "shin_l": {"r": -10},
    }, M.body_about((0, 0, 22), x=B_X[k], z=B_Z[k], r=B_ROLL[k]))
    if B_BOLT[k] is not None:
        _bolt_hand(pose, gx, gz, deg, B_BOLT[k])
    if k in (1, 2):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.0}})
    elif k == 3:
        pose = merge(pose, F.expr("grit"))
    return pose


def _fx():
    return [{"kind": "burst", "joint": "gun", "point": MUZ, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5, "a0": -60.0,
             "arc": 120.0}]


def _hit(k):
    base = {"torso": {"r": -8.0}} if M.HIT_AMT[k] > 0 else STANCE
    return W.hit_pose(k, base, lambda a: hold(LOW[0], LOW[1], LOW[2] + 14 * a) if a > 0 else {})


def _die(k):
    return W.die_d1_pose(k, STANCE, HEIGHT_LU, prop="gun", prop_path=W.RIFLE_PATH)


def clips():
    attack = M.clip("attack", [_a_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays={3: _fx()},
                    extra={"holdStep": 2})
    attack_b = M.clip("attack_b", [_b_pose(i) for i in range(10)], ATTACK_MS, impact=ATTACK_IMPACT,
                      overlays={3: _fx()}, reuse={0: ("attack", 0), 9: ("attack", 9)}, extra={"holdStep": 2})
    # aimed up about 45 and 70 degrees at flyers (both shots; the extras sheet)
    aimed_a = AIMED.variants(RIG, attack, lambda u, t: _a_pose(u, turn=t), AIM_W, aims=("up45", "up70"))
    aimed_b = AIMED.variants(RIG, attack_b, lambda u, t: _b_pose(u, turn=t), AIM_W, aims=("up45", "up70"))
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack,
        attack_b,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
        # items 51/52 pose: aim (the Aimed Shot's long hold: A's cheek and hold frames reused, the scope glint
        # pulsing; it costs no pixels; the extras sheet, pipeline.POSE_CLIPS)
        M.clip("aim", [_a_pose(2), _a_pose(1)], [420, 260], loop=True, reuse={0: ("attack", 2), 1: ("attack", 1)}),
    ] + aimed_a + aimed_b
    for v in aimed_a:
        AIMED.check_timing(attack, v)
    for v in aimed_b:
        AIMED.check_timing(attack_b, v)
    return M.check_variants(M.check_contract(cl, attack_ms=900, attack_impact_at=0.3778))
