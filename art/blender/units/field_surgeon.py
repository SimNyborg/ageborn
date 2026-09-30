"""Field Surgeon: Gunpowder Age support (DESIGN A5.4). Heals; pistol shot (proj.musket), ~72 lu.

Look (A11, Gunpowder palette): a round-faced army doctor in a black bicorne worn fore and aft
(a brass edge, a team cockade), little brass spectacles that glint and grey mutton-chop
whiskers, a team coat with cream cuffs under a long cream apron, a cream strap across his
chest to a big leather doctor's bag with a cream cross on his near hip (so 'healer' reads at
56 px) and a bone saw hanging at the back of his belt. He carries a stubby flintlock pistol.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    pushes his spectacles up his nose with a finger (a glint), breathing, blink
  walk    jog: forward lean, the bag bouncing on his hip, the coat tails flapping
  attack  HIP QUICK-DRAW: he spins the pistol round his finger twice (a hollow ring smear),
          snaps it level at the hip and squints (the held aim), cocks it, fires from the hip
          without aiming (one flash; the ball leaves the per-frame `muzzle` anchor), the kick
          flips it up, and he raises it to his lips and blows the smoke off the barrel
  hit     light: head snaps back, the bicorne lifts, the spectacles bounce
  die     D3 dizzy sit: spins in place and sits down hard, legs out, leaning back, arms wide,
          the bag in his lap, spiral eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "field_surgeon"
NAME = "Field Surgeon"
HEIGHT_LU = 72
CANVAS = (272, 244)
FEET = (112, 216)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 32), "muzzle": (30, 38)}
NO_RETIME = True

HAIR = "#B8B2A8"      # grey whiskers
SHOE = "#2F2B2B"
BAG = "#6E5646"
BREECH = "#4A3B2E"
SAW = "#B6BCC4"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # pistol: near hand
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)
PMUZ = (HR[0] + 1.2, HR[1] - 0.6, HR[2] - 18.0)   # pistol muzzle (pistol modelled pointing down)
HAT_C = (0.5, 0.0, 57.5)


def build(rig):
    B.skeleton(rig)
    B.legs(rig, BREECH, SHOE, stocking=B.CREAM)

    # torso: team coat, long cream apron (bib and skirt), brass buttons, neck cloth
    g = Geo().blob((0, 0, 28.0), (11.8, 10.8, 12.0), p=2.4, taper=(1.1, 0.95))
    g.blob((0, 0, 18.0), (11.4, 10.4, 5.0), p=2.6)
    rig.part("torso", g, team=True)
    g = Geo().blob((0.0, 0, 14.5), (12.0, 11.1, 8.4), p=2.6, taper=(1.14, 1.0))
    g.clip((0, 0, 7.4), (0, 0, -1))
    rig.part("hips", g, team=True)
    g = Geo().blob((5.6, -0.8, 26.0), (7.2, 7.4, 10.6), p=3.0, taper=(1.1, 0.8))
    g.clip((8.6, 0, 0), (-1, 0, 0))
    rig.part("torso", g, B.CREAM)
    g = Geo()
    for z in (32.0, 27.5, 23.0):
        g.sphere((8.4, -8.6, z), 1.0, cuts=3)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.5)
    g = Geo().blob((1.2, 0, 37.4), (6.8, 7.2, 2.4), p=2.4)
    rig.part("torso", g, B.CREAM)                # neck cloth
    rig.secondary("apron", "hips", (6.0, 0, 17.0), (7.5, 0, 6.0), max_deg=12, gain=1.0)
    g = Geo().blob((7.8, -0.5, 11.0), (4.0, 9.2, 8.0), p=2.8, taper=(1.0, 1.1))
    g.clip((4.8, 0, 0), (-1, 0, 0))
    rig.part("apron", g, B.CREAM)
    rig.secondary("tails", "hips", (-4.0, 0, 18.0), (-7.5, 0, 6.0), max_deg=14, gain=1.1)
    tl = Geo().blob((-5.6, 0, 11.5), (5.4, 10.4, 7.8), p=2.6, taper=(0.75, 1.0), rot=(0, 10, 0))
    tf = F.Face(rig, "tails", [tl])
    rig.part("tails", tl, team=True)
    g = G.anchor(tf, Geo(), (-6.6, 12.0), s=0.9)
    rig.part("tails", g, B.CREAM, highlight=False, outline=0)
    # the belt and a bone saw hanging at the back hip
    g = Geo().blob((0.4, 0, 19.6), (11.8, 10.9, 1.7), p=3.0)
    rig.part("torso", g, B.LEATHER)
    g = Geo().slab([(-9.0, 18.0), (-3.0, 18.0), (-3.0, 12.6), (-9.0, 11.0)], -11.0, 0.8)
    rig.part("hips", g, SAW, finish="metal", outline=0.5)
    g = Geo().capsule((-10.6, -11.0, 16.6), (-10.6, -11.0, 12.0), 1.4)
    rig.part("hips", g, B.GUNWOOD, outline=0.5)

    # the doctor's bag on a cream strap at the near hip (a cream cross), bouncing late
    g = Geo().capsule((-4.0, -11.0, 38.0), (9.0, -11.5, 30.0), 1.2).capsule((9.0, -11.5, 30.0), (4.0, -13.0, 20.0), 1.2)
    rig.part("torso", g, B.CREAM, outline=0.5)
    rig.secondary("bag", "hips", (3.0, -13.5, 19.0), (3.0, -14.0, 8.0), max_deg=14, gain=1.2)
    bag = Geo().blob((3.4, -14.2, 12.4), (7.8, 4.4, 6.0), p=3.0, taper=(1.05, 0.86))
    bf = F.Face(rig, "bag", [bag])
    rig.part("bag", bag, BAG, finish="gloss")
    g = Geo().capsule((-1.2, -15.0, 18.0), (1.4, -15.0, 20.4), 0.9).capsule((1.4, -15.0, 20.4), (5.8, -15.0, 20.4), 0.9)
    g.capsule((5.8, -15.0, 20.4), (8.2, -15.0, 18.0), 0.9)
    g.blob((3.4, -18.4, 16.6), (2.0, 0.8, 1.4), p=2.4)
    rig.part("bag", g, B.IRON, finish="metal", outline=0.6)
    g = Geo()
    c = bf.hit(*K.scr(bf, (3.4, -18.6, 12.0)))
    bf.decal(g, c, [(-1.1, 3.4), (1.1, 3.4), (1.1, -3.4), (-1.1, -3.4)], 0.4)
    bf.decal(g, c, [(-3.4, 1.1), (3.4, 1.1), (3.4, -1.1), (-3.4, -1.1)], 0.4)
    rig.part("bag", g, B.CREAM, highlight=False, outline=0)

    # head: round, bald crown with grey whiskers, spectacles, bicorne
    head = G.head_geos(center=(2, 0, 48.5), nose=(14.0, -0.6, 46.6), nose_r=(3.8, 3.3, 3.5))
    hair = Geo().blob((6.0, -9.8, 43.5), (5.0, 2.8, 5.8), p=2.2)      # mutton chops
    hair.blob((6.0, 9.8, 43.5), (5.0, 2.8, 5.8), p=2.2)
    hair.blob((-6.0, 0, 46.0), (5.6, 10.2, 6.0), p=2.2)
    K.face2(rig, [head, hair], B.SKIN, cx=12.0, cz=49.6, eye_dy=(-4.6, 4.4),
            eye_r=(3.4, 3.2, 4.0), brow=HAIR, brow_angry=False, mouth_dz=-7.6, mouth_x=12.8,
            eye_at=(13.8, 49.8), mark_r=3.8, mouth_shape="smile")
    rig.part("head", head, B.SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    rig.joint("specs", "head", (13.6, 0, 49.6))
    g = Geo()
    for y, ax in ((-5.2, (0.55, -1.0)), (4.4, (1.0, 0.0))):   # round brass spectacles (the near
        # lens turned toward the camera so it reads as a ring, not a line)
        c0 = (13.4, y, 49.7)
        g.lathe([(4.2, -0.4), (4.2, 0.4), (3.2, 0.4), (3.2, -0.4)], c0,
                (c0[0] + ax[0], c0[1] + ax[1], c0[2]), segs=18)
    g.capsule((14.3, -1.2, 50.2), (14.3, 1.0, 50.2), 0.6)
    g.capsule((13.0, -8.4, 50.4), (3.0, -10.6, 51.0), 0.6)
    rig.part("specs", g, B.BRASS, finish="metal", outline=0.4)
    g = Geo().blob((15.0, -8.0, 51.4), (0.6, 1.3, 1.5), p=2.2)       # glint
    rig.part("specs", g, glow="#FFFFFF", outline=0)
    rig.joint("hat", "head", HAT_C)
    B.bicorne(rig, joint="hat", c=HAT_C, scale=0.98, trim=B.CREAM)
    rig.joint("hat_loose", "root", HAT_C, hidden=True)
    B.bicorne(rig, joint="hat_loose", c=HAT_C, scale=0.98, trim=B.CREAM)

    # arms: team sleeves, cream cuffs, thumbs
    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM)
        y = B.ARM_Y[s]
        g = Geo().blob((2.8, y - 1.4 * (1 if s == "r" else -1), B.HAND_Z + 1.0), (1.6, 1.5, 2.2), p=2.2)
        rig.part(f"hand_{s}", g, B.SKIN, outline=0.5)
    for s, y in (("r", -12.4), ("l", 11.8)):
        g = Geo().blob((0, y, 37.0), (5.8, 5.0, 4.4), p=2.4)
        rig.part(f"arm_{s}", g, team=True)

    # pistol in the near fist, modelled pointing down: a curved wooden grip with a brass
    # butt cap, a long barrel with brass bands, a lock and a hammer; a trigger guard
    hx, hy, hz = HR
    g = Geo().blob((hx - 0.8, hy, hz + 2.0), (2.4, 2.1, 4.2), p=2.6, rot=(0, -22, 0))   # grip
    g.capsule((hx + 0.6, hy - 0.4, hz - 2.0), (hx + 1.0, hy - 0.4, hz - 10.0), 2.0, 1.6)  # stock
    rig.part("hand_r", g, B.GUNWOOD)
    g = Geo().capsule((hx + 1.6, hy - 0.8, hz - 3.0), (PMUZ[0] + 0.6, hy - 0.8, PMUZ[2] + 0.5), 1.45, 1.55)
    g.lathe([(0, 0), (2.1, 0), (2.1, 1.6), (0, 1.6)], (PMUZ[0] + 0.6, hy - 0.8, PMUZ[2] + 1.6),
            (PMUZ[0] + 0.6, hy - 0.8, PMUZ[2]), segs=12)
    rig.part("hand_r", g, B.GUNMETAL, finish="metal", outline=0.8)
    g = Geo().blob((hx + 2.4, hy - 1.6, hz - 1.4), (1.6, 1.1, 2.2), p=2.4)   # lock
    g.sphere((hx - 2.2, hy, hz + 5.4), 1.9, cuts=3)                          # butt cap
    for z in (hz - 8.0, hz - 14.0):
        g.lathe([(1.9, -0.5), (1.9, 0.5)], (hx + 1.2, hy - 0.8, z), (hx + 1.2, hy - 0.8, z + 1.0), segs=10)
    rig.part("hand_r", g, B.BRASS, finish="metal", outline=0.5)
    rig.joint("hammer", "hand_r", (hx + 2.4, hy - 1.6, hz + 1.0))
    g = Geo().capsule((hx + 2.4, hy - 1.6, hz + 0.6), (hx + 3.8, hy - 1.6, hz + 2.8), 0.8)
    rig.part("hammer", g, B.IRON, finish="metal", outline=0.4)
    rig.track("muzzle", "hand_r", PMUZ)
    mx, my, mz = PMUZ
    rig.joint("flash", "hand_r", PMUZ, hidden=True)
    g = Geo().blob((mx, my - 1, mz - 7.0), (3.4, 1.8, 7.6), p=2.0)
    g.blob((mx + 2.4, my - 1, mz - 4.2), (1.9, 1.6, 5.0), p=2.0, rot=(0, -36, 0))
    g.blob((mx - 2.4, my - 1, mz - 4.2), (1.9, 1.6, 5.0), p=2.0, rot=(0, 36, 0))
    rig.part("flash", g, glow=B.FIRE, outline=0)
    g = Geo().blob((mx, my - 2, mz - 4.4), (2.1, 1.6, 4.4), p=2.0)
    rig.part("flash", g, glow=B.FLASH_CORE, outline=0)
    rig.joint("smoke", "hand_r", PMUZ, hidden=True)
    g = Geo()
    for dx, dz, r in ((0, -4, 3.6), (2.6, -8, 3.0), (-2.4, -7, 2.6), (0.5, -11.5, 2.4)):
        g.sphere((mx + dx, my - 2, mz + dz), r, cuts=4)
    rig.part("smoke", g, B.SMOKE, finish="dust", outline=0.8)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def pistol(a, f, w):
    """Near arm; w = the pistol's barrel direction (it is modelled pointing down)."""
    return B.arm("r", a, f, w, w_rest=-90.0)


def free(a, f, w=None):
    return B.arm("l", a, f, w, w_rest=-90.0)


STANCE = merge(pistol(-78, -58, -70), free(-84, -60), {"torso": {"r": -1}})
SH = (0.0, B.SHOULDER_Z)


def _idle(f):
    # breathing; the far hand comes up and pushes the spectacles up his nose (2-3), blink
    push = [0.0, 0.4, 1.0, 1.0, 0.3, 0.0][f]

    def extra(ctx):
        a, fo = B.ik2(SH, (12.0, 48.0), elbow_down=True)
        p = free(-84 + (a + 84) * push, -60 + (fo + 60) * push)
        return merge(p, {"arm_r": {"r": 2 * ctx["lag"]}, "hand_r": {"r": 4 * ctx["lag"]},
                         "specs": {"z": 0.8 * push}, "head": {"r": 3 * push}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_l", "fore_l")}
    return M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


def _walk(f):
    # jog: forward lean, the free arm pumping, the pistol hand swinging low
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": 6 * lag}, "specs": {"z": 0.3 * lag}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=32.0, knee=64.0, lift_lu=6.8, bob_pct=0.065,
                     lean=-9.0, arm=30.0, fore=30.0, arms=("r", "l"), extra=extra)


# attack: 832 ms, the shot (impact) at 333 ms (impactAt 0.4002, as shipped); 11 unique frames
#            twirl twirl twirl HIP-AIM cock | FIRE kick look blow blow holster
ATTACK_MS = [40, 45, 45, 140, 63, 80, 70, 70, 110, 90, 79]
ATTACK_IMPACT = 5
# pistol arm (upper, fore, barrel direction), WORLD degrees
PA = [(-40, 10, -30), (-30, 30, 120), (-30, 30, 290), (-60, -8, -2), (-60, -8, -2),
      (-58, -6, 0), (-40, 30, 40), (-10, 60, 100), (6, 96, 94), (8, 98, 96), (-60, -40, -60)]
FA = [(-84, -60), (-70, -40), (-60, -30), (-50, -10), (-50, -10), (-50, -10), (-55, -20),
      (-70, -40), (-80, -55), (-80, -55), (-84, -60)]
T_R = [-2, -3, -3, -8, -8, -6, 6, 2, -2, -2, -1]
HEAD = [0, -4, -6, -6, -6, -4, 6, 2, -6, -6, 0]
B_X = [0.0, 0.0, 0.5, 1.5, 1.5, 0.5, -3.0, -1.5, 0.0, 0.0, 0.0]
B_Z = [0.0, 0.0, 0.0, -3.0, -3.0, -2.6, -1.0, 0.0, 0.0, 0.0, 0.0]
B_Q = [0.0, 0.03, 0.03, -0.08, -0.07, 0.04, -0.08, 0.02, 0.02, 0.0, 0.0]
TH_R = [0, 4, 8, 22, 22, 22, 16, 10, 6, 6, 0]     # a wide gunslinger stance on the draw
SH_R = [0, 0, -2, -18, -18, -18, -12, -6, -2, -2, 0]
TH_L = [0, -4, -8, -20, -20, -20, -16, -10, -6, -6, 0]
SH_L = [0, 0, -2, -14, -14, -14, -10, -6, -2, -2, 0]


def _attack_pose(f):
    t = T_R[f]
    a, fo, w = PA[f]
    fa, ff = FA[f]
    pose = merge(pistol(a - t, fo - t, w - t), free(fa - t, ff - t), {
        "torso": {"r": t},
        "head": {"r": HEAD[f] - 0.4 * t},
        "thigh_r": {"r": TH_R[f]}, "shin_r": {"r": SH_R[f]},
        "thigh_l": {"r": TH_L[f]}, "shin_l": {"r": SH_L[f]},
        "hammer": {"r": [0, 0, 0, 0, 38, 0, 0, 0, 0, 0, 0][f]},
        "flash": {"show": f == 5},
        "smoke": {"show": f in (6, 7, 8), "s": [1, 1, 1, 1, 1, 1, 0.8, 1.0, 1.25, 1, 1][f],
                  "z": [0, 0, 0, 0, 0, 0, 0, -1.5, -4.0, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=B_X[f], z=B_Z[f], q=B_Q[f]))
    if f in (3, 4):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -0.8}})
    elif f == 5:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif f in (8, 9):
        pose = merge(pose, F.expr("blink", "o"))
    elif f == 6:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.2}})
    return pose


GRIP = (HR[0], HR[1], HR[2])


def _attack_clip():
    twirl = {"kind": "arc", "joint": "hand_r", "inner": GRIP, "outer": PMUZ, "color": "#8C949E",
             "taper": 0.0, "white": 0.4, "t0": 0.0, "t1": 1.0, "lines": 2, "samples": 18, "band": 0.42}
    ov = {
        1: [dict(twirl, **{"from": 0})],
        2: [dict(twirl, **{"from": 1})],
        5: [{"kind": "burst", "joint": "hand_r", "point": (PMUZ[0], PMUZ[1], PMUZ[2] - 6.0), "r0_lu": 7.0,
             "r1_lu": 12.0, "n": 5, "a0": -60.0, "arc": 120.0, "color": "#FFF4D6"}],
        8: [{"kind": "rings", "joint": "head", "point": (15.0, 0.0, 42.0), "radii_lu": (4.0, 7.0),
             "a0": -40.0, "a1": 40.0, "color": "#FFF4D6"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 20 * a}, "arm_l": {"r": 30 * a}, "fore_l": {"r": 20 * a},
                "hat": {"z": 3.0 * max(a, 0), "r": 8 * a}, "specs": {"z": 1.2 * a},
                "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


def _die(k):
    sit = K.d3_sit(k)
    t = [0, 0, 0.1, 0.3, 1.0, 0.95, 1.0, 1.0, 1.0, 1.0][k]
    pose = merge(STANCE, M.die_d3(k, center_z=26.0, height=HEIGHT_LU), sit, {
        "arm_r": {"r": 10 * t}, "hand_r": {"r": 40 * t},
        "arm_l": {"r": -10 * t},
        "hat": {"r": [0, 6, -6, 10, 22, 26, 24, 24, 24, 24][k], "x": 3.0 * t, "z": -1.5 * t},
        "specs": {"z": -1.2 * t, "r": 12 * t},
        "bag": {"x": 6.0 * t, "z": 8.0 * t},
    })
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k <= 3:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("spiral", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 7, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 7, 7, 8], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl, attack_ms=832, attack_impact_at=0.4002)
