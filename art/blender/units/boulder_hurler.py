"""Boulder Hurler: Stone Age rare ranged anti-heavy (CONTENT_PLAN 5.1). Range 130, x3 vs armored,
Brace. Boulder (proj.boulder), blunt, 70 lu.

Look (A11, PLAN.md): a huge-shouldered, short-legged strongman with a tiny head on a thick neck, a
bristly beard and a bald crown with a team rag band, a team pelt over one shoulder and a wide team
belt, bow legs; he carries a round grey boulder (cracked, with a pale chalk ring) in both hands.

"A viewer expects it to squat, heave a boulder overhead and hurl it with both hands, and to stomp
along bow-legged with the rock held at his belly."

Animation (ANIM_SPEC G1 stomp, appendix B throwers: overhead and chest put):
  idle      shifts the boulder on his belly, rolls his shoulders, blink
  walk      walk v3 bounce jog with a bow-legged stomp (card 65 x 1.25 = 81.25 lu/s), the boulder at
            his belly in both hands, the shoulders rolling
  attack    OVERHEAD HURL: squats, heaves the boulder up and over his head (stretch; the held
            extreme loops with a strain frame while the sim wind-up lasts), steps in and hurls it
            down and forward with both arms (arc smear), it leaves the hands on the impact frame; he
            picks up another rock
  attack_b  CHEST PUT: crouches with the boulder at his chest, then drives it straight out with
            both arms from a lunge
  hit       light, heavy stagger;  die  D3 dizzy spin, sits down hard, the rock lands on his foot
"""
from ageborn_art import colors as CC
from ageborn_art import face as F
from ageborn_art import kit_stone as K
from ageborn_art import moves as M
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from ageborn_art import look
from units import stone_w1 as W1

SLUG = "boulder_hurler"
GAIT_NAME = "biped"
NAME = "Boulder Hurler"
HEIGHT_LU = 70
CANVAS = (280, 248)
FEET = (120, 220)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

SKIN = "#C7A083"
BEARD = "#4A3A30"
FUR = "#6F6355"
ROCK = "#8E8A82"
ROCK_DK = "#6E6A63"
CHALK = "#E8E2D4"
LEATHER = "#7A5E48"
# W1 (the detail standard)
BEARD_LT = "#6E5A4C"      # lighter bristles in the dark beard (two tones, 28 levels over it)
BONE = "#EDE3C8"          # bone rings on the huge upper arms, the belt's buckle
LEATHER_DK = "#56412F"
CHEEK = "#B68B6E"         # a ruddy cheek and ear (19 levels under the skin)
ROCK_HI = "#B0ACA4"       # a fresh, lighter chip on the boulder (two-tone rock)

DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 1.45   # a touch over the soldiers' 1.35: his big bare arms carry the highlight (0.059 at idle 0)
LOOK_SHADE = W1.SHADE_SOLDIER
LOOK_RIM = W1.RIM_SOLDIER
MATERIAL_KINDS = W1.kinds({SKIN: "skin", BEARD: "fur", BEARD_LT: "fur", FUR: "fur", ROCK: "stone", ROCK_DK: "stone",
                           ROCK_HI: "stone", CHALK: "stone", LEATHER: "leather", LEATHER_DK: "leather", BONE: "bone",
                           CHEEK: "skin", "team": "hide"})

HIP_Y, SH_Y = 6.4, 13.4
ROCK_R = 7.5


def _rock(rig, joint, c):
    g = Geo().blob(c, (ROCK_R, ROCK_R * 0.92, ROCK_R * 0.9), p=2.1)
    rig.part(joint, g, ROCK)
    g = Geo().blob((c[0] - 2.0, c[1] - 3.6, c[2] + 3.2), (2.6, 1.6, 2.0), p=2.0)
    g.blob((c[0] + 3.4, c[1] - 2.8, c[2] - 2.4), (2.0, 1.4, 1.6), p=2.0)
    rig.part(joint, g, ROCK_DK, outline=0.4)
    g = Geo().lathe([(ROCK_R * 0.93, 0), (ROCK_R * 0.97, 0.6), (ROCK_R * 0.97, 1.8), (ROCK_R * 0.93, 2.4)],
                    (c[0], c[1], c[2] - 1.2), (c[0] + 0.6, c[1], c[2] + 1.2), segs=18)
    rig.part(joint, g, team=True, outline=0.4)   # a team-painted ring round the rock
    # W1: a fresh, lighter chip knocked off the near face and a dark crack across it (the rock in two tones)
    g = Geo().blob((c[0] + 2.8, c[1] - 5.6, c[2] + 2.6), (2.8, 1.4, 2.2), p=2.3, rot=(0, 0, 18))
    rig.part(joint, g, ROCK_HI, outline=0)
    g = Geo()
    pts = [(c[0] - 4.4, c[1] - 6.0, c[2] - 3.8), (c[0] - 2.6, c[1] - 6.6, c[2] - 1.6), (c[0] - 3.4, c[1] - 6.7, c[2] + 0.2)]
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 0.6, segs=6, rings=2)
    rig.part(joint, g, ROCK_DK, outline=0, highlight=False)


def build(rig):
    global RIG, ARM_R, ARM_L, ROCK_C
    RIG = rig
    body = K.body(rig, SKIN, FUR, stocky=1.3, hip_y=HIP_Y, shoulder_y=SH_Y, torso_r=(12.6, 11.4, 11.6), foot_len=5.0,
                  fist=4.8, shoulder_z=36.0, neck_z=37.0)
    fr, fl = body.fist["r"], body.fist["l"]
    deco = K.pelt(rig, FUR, r=(12.8, 11.8, 7.0), skirt_r=(12.6, 11.6, 4.4))
    K.wraps(rig, HIP_Y, SH_Y, wrists=("r", "l"))
    g = Geo().lathe([(12.2, 0), (13.1, 0.4), (13.1, 5.2), (12.0, 5.6)], (0.4, 0, 21.8), (0.6, 0, 27.4), segs=24)
    look.team_part(rig, "torso", g, outline=0.7)   # the wide belt (W1: team-dark: the team zone in two tones)
    # W1: a carved bone buckle, wildcat spots on the pelt, laces over the shin wraps, bone rings round the huge
    # upper arms
    g = Geo().blob((12.4, -7.4, 24.6), (2.6, 1.4, 2.4), p=2.4, rot=(0, 0, -36))
    rig.part("torso", g, BONE, finish="gloss", outline=0.6)
    W1.team_spots(rig, "torso", deco, [(-8.0, 29.0, 1.8, 1.45), (8.6, 29.6, 1.6, 1.25), (-10.4, 26.0, 1.4, 1.1)])
    for side, y in (("r", -HIP_Y), ("l", HIP_Y)):
        W1.laces(rig, f"shin_{side}", 0.8, y - 3.85 if side == "r" else y - 3.6, 6.2, 10.8,
                 LEATHER_DK if side == "r" else CC.scale(LEATHER_DK, 0.8))
    for side, y in (("r", -SH_Y), ("l", SH_Y)):
        W1.ring(rig, f"arm_{side}", (0.4, y, 31.6), 4.9, height=2.6, fill=BONE if side == "r" else CC.scale(BONE, 0.8),
                p1=(1.5, y, 28.0), bulge=0.5, outline=0.6, finish="gloss")
    # small head, bald crown with a team rag band, a bristly beard
    beard = Geo().blob((7.0, 0, 41.5), (8.0, 9.6, 5.6), p=2.3)
    band = Geo().lathe([(9.0, 0), (9.9, 0.4), (9.9, 3.8), (8.6, 4.2)], (1.4, 0, 51.4), (0.2, 0, 55.2), segs=22)
    face = K.head(rig, SKIN, z=47.0, r=(9.4, 9.0, 9.4), jaw=(7.0, 8.0, 5.2), nose=3.0, eye_r=3.4,
                  eye_gap=(-4.0, 3.4), extra_geos=(beard, band), brow_col=BEARD)
    rig.part("head", beard, BEARD, finish="hair")
    rig.part("head", band, team=True, outline=0.7)
    # W1: lighter bristles in the beard, a ruddy cheek and an ear on the small bald head
    W1.locks(rig, "head", [((9.8, 43.6), (10.6, 37.4), 1.3), ((5.8, 43.0), (6.6, 36.4), 1.3)], BEARD_LT, -9.4)
    W1.blush(rig, "head", face, 6.0, 46.4, 2.4, 1.8, CHEEK)
    ear = Geo().blob((-0.6, -9.0, 46.6), (2.2, 1.4, 2.8), p=2.2)
    ear_face = F.Face(rig, "head", [ear])
    rig.part("head", ear, SKIN, outline=0.6)
    W1.blush(rig, "head", ear_face, -0.4, 46.4, 1.0, 1.7, CHEEK)
    rig.secondary("ragtail", "head", (-8.0, -4.0, 53.0), (-15.0, -4.5, 48.0), max_deg=18, gain=1.3)
    g = Geo().slab([(-7.6, 54.6), (-16.0, 50.8), (-17.4, 46.6), (-8.0, 50.6)], -4.0, 1.4)
    rig.part("ragtail", g, team=True, outline=0.7)
    # the boulder, held between both fists (on the near fist's joint)
    ROCK_C = ((fr[0] + fl[0]) / 2 + 5.0, 0.0, (fr[2] + fl[2]) / 2 + 3.0)
    rig.joint("rock", "fore_r", fr)
    _rock(rig, "rock", (fr[0] + 5.0, fr[1] + SH_Y, fr[2] + 3.0))
    rig.track("muzzle", "rock", (fr[0] + 5.0, fr[1] + SH_Y, fr[2] + 3.0))
    rig.joint("spare", "root", (0, 0, 0), hidden=True)
    _rock(rig, "spare", (12.0, -2.0, ROCK_R * 0.9))
    ARM_R = body.arm("r")
    ARM_L = body.arm("l")
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, Stone soldier; never on the face or skin): the pelt's back half, the
    wide belt in front of the bone pendant and the skirt; a strip torn from the skirt's hem (his shins are bare)."""
    rig.damage_spot_at("pelt", "torso", -7.0, 24.5, 7.0, "hide", team=True)   # W1 art gate nit 1: r 7 (6)
    rig.damage_spot_at("belt", "torso", 10.0, 27.5, 5.0, "hide", team=True)
    rig.damage_spot_at("skirt", "skirt", 2.5, 20.5, 5.5, "hide", team=True)
    rig.damage_spot_at("hem", "skirt", -6.0, 18.5, 10.0, "hide", kind="strip", team=True)


RIG = ARM_R = ARM_L = ROCK_C = None
SPEED = 81.25
LEGS = K.legs(HIP_Y, toe=5.2)
GAIT = K.jog(LEGS, SPEED, cycle=640, stance=0.40, lift=6.0)


def arms(a, b, rz=0.0):
    """Both arms on the boulder (the same side-plane angles; the shoulders differ only in depth)."""
    p = merge(ARM_R.pose(a, b), ARM_L.pose(a, b))
    if rz:
        p["arm_r"]["rz"] = rz
        p["arm_l"]["rz"] = rz
    return p


def stance():
    return merge(arms(-60, 10), {"torso": {"r": -2}})


def _idle(f):
    sh = [0.0, 0.4, 1.0, 0.6, 0.0, -0.4, -0.6, -0.3][f]

    def extra(ctx):
        return merge(arms(-60 + 6 * sh, 10 + 8 * sh), {"rock": {"r": 4 * sh}})
    return M.idle_v2(f, K.strip(stance(), "arm_r", "fore_r", "arm_l", "fore_l"), extra=extra, face_blink=F.expr("blink"), blink=4)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(arms(-62 + 4 * lag, 10 + 4 * lag), {"torso": {"rx": 4.0 * (1 if f < 4 else -1)}},
                     {"ragtail": {"r": 6 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2}}, GAIT, legs=LEGS, lean=-8.0, twist=4.0, nod=3.0,
                     sway=3.0, extra=extra, report=report)


# attack A: 11 unique frames, SMALL_MELEE_MS; frame 4 = strain (hold-loop partner), 5 smear
#        read  squat  lift  HOLD  strain HURL  IMP   follow pickup lift2 settle
A_A = [-60, -80, 40, 95, 96, 30, -30, -50, -80, -70, -60]
A_B = [10, -60, 80, 110, 112, 40, -20, -40, -80, -20, 10]
A_X = [-0.5, -1.5, -2.0, -3.0, -3.2, 3.0, 7.0, 6.0, 3.0, 1.0, 0.5]
A_Z = [0.0, -4.0, 1.0, 2.6, 2.2, 0.0, -2.8, -1.2, -4.0, -1.0, 0.0]
A_Q = [-0.03, -0.14, 0.08, 0.12, 0.10, 0.04, -0.16, 0.03, -0.10, 0.02, 0.0]
A_T = [-2, 10, 0, 14, 15, -14, -30, -24, -20, -6, -2]
A_H = [0, -6, -10, -12, -12, 4, 12, 8, 10, 2, 0]
A_THR = [0, -20, -6, -6, -6, 20, 30, 24, -20, -6, 0]
A_SHR = [0, 30, 6, 0, 0, -24, -18, -12, 30, 8, 0]
A_THL = [0, -20, 8, 12, 12, -8, -22, -18, -20, -6, 0]
A_SHL = [0, 30, -6, -10, -10, -8, -4, -4, 30, 8, 0]


def _attack_pose(f):
    pose = merge(arms(A_A[f], A_B[f]), {
        "torso": {"r": A_T[f]}, "head": {"r": A_H[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "rock": {"hide": f in (6, 7)},
        "spare": {"show": f == 8, "x": 12.0},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (1, 2, 3, 4):
        pose = merge(pose, F.expr("grit" if f != 4 else "squeeze"), {"brow": {"z": -1.0}})
    elif f in (5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _attack_clip():
    rock_c = ROCK_C
    ov = {
        1: [{"kind": "dust", "ground": (0.0, 0.0), "size_lu": 6.0, "puffs": 4, "seed": 91, "spread": 1.2}],
        5: [{"kind": "arc", "joint": "rock", "inner": (rock_c[0] - 4, -6.0, rock_c[2]), "outer": (rock_c[0] + 4, -6.0, rock_c[2] + 4),
             "color": ROCK, "taper": 0.2, "t0": 0.0, "t1": 0.9, "lines": 3, "white": 0.4, "from": 4}],
        6: [{"kind": "dust", "ground": (12.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 92, "spread": 1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=5, overlays=ov,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


# attack B: chest put. 0 = A read, 1 = A squat, 2 rock to the chest, 3 HOLD (deep crouch, the rock
# tucked at the chest, the elbows out), 4 strain, 5 drive (smear), 6 IMPACT (arms locked straight out
# in a lunge), 7 follow, 8-10 = A pickup, lift, settle
def _b_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    tab = [  # a, b, x, z, q, t, thr, shr, thl, shl
        (-40, 60, -1.0, -3.0, -0.08, 6, -14, 22, -10, 18),
        (-30, 80, -2.0, -6.0, -0.12, 10, -26, 40, -18, 34),
        (-28, 82, -2.2, -6.2, -0.13, 11, -27, 42, -19, 35),
        (-10, 20, 3.0, -3.0, 0.06, -6, 20, -10, -14, 6),
        (-5, -2, 7.0, -3.5, -0.14, -14, 40, -30, -20, -4),
        (-15, -10, 6.0, -2.0, 0.02, -10, 30, -20, -16, -2),
    ][i - 2]
    a, b, x, z, q, t, thr, shr, thl, shl = tab
    pose = merge(arms(a, b), {
        "torso": {"r": t}, "head": {"r": -t * 0.5},
        "thigh_r": {"r": thr}, "shin_r": {"r": shr}, "thigh_l": {"r": thl}, "shin_l": {"r": shl},
        "rock": {"hide": i in (6, 7)},
    }, M.body_about((0, 0, 20), x=x, z=z, q=q))
    return merge(pose, F.expr("grit" if i < 5 else "yell"), {"brow": {"z": -1.0}})


def _attack_b():
    ov = {5: [{"kind": "streak", "joint": "rock", "point": (ROCK_C[0], -6.0, ROCK_C[2]), "color": ROCK, "width_lu": 10.0,
               "white": 0.4, "from": 4}],
          6: [{"kind": "dust", "ground": (14.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 93, "spread": 1.0}]}
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    return K.hit(k, stance(), extra=lambda a: {"rock": {"r": 8 * a}, "ragtail": {"r": 12 * a}})


def _die(k):
    def extra(kk, sit):
        out = {}
        if kk >= 2:
            out["rock"] = {"hide": True}
            out["spare"] = {"show": True, "x": 14.0 - 2 * min(kk, 5), "z": max(0.0, 20 - 6 * kk)}
        return out
    return K.die_d3(k, stance(), HEIGHT_LU, extra=extra, center_z=27.0)


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES)], [M.IDLE_MS] * M.IDLE_FRAMES, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
