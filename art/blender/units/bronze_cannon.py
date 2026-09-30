"""Bronze Cannon: Gunpowder Age artillery (DESIGN A5.4), vehicle rig (A11). Arcing
cannonball (proj.cannonball), splash, ~74 lu.

Look (A11, Gunpowder palette): a fat bronze field gun with reinforcing rings, brass dolphin
handles, a muzzle swell and a cascabel knob, on a team-painted carriage (cheeks with iron bolts,
team wheel felloes) with a pyramid of cannonballs on the trail and wooden chocks behind the
wheels. A gunner in a team coat and a team knitted cap with ear flaps stands behind the breech
with a linstock (a forked pole with a glowing match); he has a big moustache and a face that
reacts to every bang.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    the gunner wipes his brow with his sleeve, the match glows, blink
  walk    the gunner pushes the trail bent over, the wheels roll with the distance, the gun bobs
  attack  MATCH, BOOM AND ROLL BACK: he lowers the match to the vent, the vent fizzes and he
          leans away with his free hand over his ear and his eyes squeezed shut while the
          barrel quivers (the held extreme), BOOM: a huge flash, the barrel stretches, the gun
          hops and rolls far back with the wheels spinning and the chocks bouncing, a big smoke
          cloud billows from the muzzle, then he uncovers his ear and shoves it back into place.
          The ball leaves the per-frame `muzzle` anchor on the fire frame.
  hit     vehicle: a suspension bounce, the gunner ducks behind the breech
  die     D7 wreck and bail: the gun hops, the near wheel pops off, the carriage slumps onto
          its axle nose down, and the gunner leaps back and lands on his back with X eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "bronze_cannon"
NAME = "Bronze Cannon"
HEIGHT_LU = 74
YAW_DEG = -10.0
CANVAS = (460, 228)
FEET = (238, 200)
ANCHORS = {"head": (-30, 72), "hitCenter": (0, 30), "muzzle": (46, 48)}
NO_RETIME = True

BRONZE = "#B09A76"
BRONZE_DK = "#8C7A5E"
BORE = "#1E1C1C"
HAIR = "#5A4B40"
MATCH = "#FFB870"
BALL = "#34363C"
CHOCK = "#6E5A48"

CREW_X = -44.0                 # the gunner stands this far behind the axle
WHEEL_R = 17.0
AXLE = (0.0, 0.0, WHEEL_R)
TRUN = (2.0, 0.0, 33.0)        # trunnions: the barrel's pivot
MUZ = (TRUN[0] + 44.0, 0.0, TRUN[2] + 0.5)
IDLE_ELEV, FIRE_ELEV = 10.0, 22.0
HR = (0.0, B.ARM_Y["r"], B.HAND_Z)


def _cheek(y):
    pts = [(9.0, 25.0), (9.5, 33.0), (4.0, 37.0), (-5.0, 36.0), (-40.0, 8.5), (-47.0, 3.0),
           (-46.0, 0.0), (-40.0, 0.5), (-8.0, 22.0)]
    return Geo().slab(pts, y, 3.2)


def build(rig):
    rig.joint("unit", "root", (0, 0, 0))
    rig.joint("cart", "unit", AXLE)
    rig.joint("barrel", "cart", TRUN)
    rig.joint("wheel_l", "cart", (0.0, 13.0, WHEEL_R))
    rig.joint("wheel_r", "cart", (0.0, -13.0, WHEEL_R))
    rig.joint("chocks", "unit", (0, 0, 0))

    # far wheel first, then the carriage, the barrel and the near wheel
    B.wheel(rig, "wheel_l", (0.0, 13.0, WHEEL_R), WHEEL_R, 3.4)
    for y in (6.5, -6.5):
        rig.part("cart", _cheek(y), team=True)
    g = Geo()
    for x, z in ((4.0, 30.0), (-2.0, 30.5), (-14.0, 20.0), (-26.0, 12.5), (-38.0, 5.5)):
        g.sphere((x, -8.3, z), 1.2, cuts=2)                                 # cheek bolts
    rig.part("cart", g, B.IRON, finish="metal", outline=0)
    g = Geo().capsule((0.0, -15.0, WHEEL_R), (0.0, 15.0, WHEEL_R), 2.2)     # axle
    g.capsule((-6.0, -8.0, 27.0), (-6.0, 8.0, 27.0), 1.6)                  # transom
    g.capsule((-44.0, -8.0, 2.4), (-44.0, 8.0, 2.4), 1.8)                  # trail end
    rig.part("cart", g, B.IRON, finish="metal", outline=0.8)
    g = Geo().capsule((-42.0, -8.2, 4.4), (-28.0, -8.2, 14.0), 0.9)
    g.capsule((6.0, -8.2, 34.5), (-2.0, -8.2, 34.5), 1.1)
    rig.part("cart", g, B.IRON, finish="metal", outline=0.6)
    g = Geo().blob((-12.0, 0, 27.0), (5.0, 5.4, 2.2), p=2.6)              # quoin (elevation wedge)
    rig.part("cart", g, B.WOOD)
    g = Geo()                                                              # ball pyramid on the trail
    for dx, dz in ((-30.0, 13.2), (-24.4, 16.8), (-35.6, 9.6), (-29.0, 18.8), (-35.0, 15.6)):
        g.sphere((dx, 0.0, dz + 1.0), 3.0, cuts=3)
    rig.part("cart", g, BALL, finish="gloss", outline=0.6)
    # the barrel along +X from the trunnions: cascabel, breech rings, chase, muzzle swell
    tx, ty, tz = TRUN
    prof = [(0, -21.0), (2.4, -20.4), (2.6, -18.4), (1.6, -17.0), (6.6, -16.4), (8.6, -15.0),
            (8.8, -10.0), (8.2, -2.0), (7.4, 6.0), (6.4, 20.0), (5.8, 32.0), (6.0, 36.5),
            (7.4, 40.0), (7.6, 43.0), (6.8, 44.0), (4.0, 44.0), (0, 44.0)]
    prof = [(r * 1.18, z) for r, z in prof]
    g = Geo().lathe(prof, (tx, ty, tz), (tx + 1.0, ty, tz), segs=24)
    rig.part("barrel", g, BRONZE, finish="metal", outline_hex=BRONZE_DK)
    g = Geo()
    for x0, r in ((-12.5, 11.0), (-1.0, 10.3), (19.0, 8.4), (33.5, 7.9)):
        g.lathe([(r - 1.2, -1.2), (r, -0.7), (r, 0.7), (r - 1.2, 1.2)], (tx + x0, ty, tz),
                (tx + x0 + 1.0, ty, tz), segs=24)
    rig.part("barrel", g, BRONZE_DK, finish="metal", outline=0.6)
    g = Geo().lathe([(0, -0.2), (5.0, -0.2), (5.0, 0.4), (0, 0.4)], (tx + 44.1, ty, tz),
                    (tx + 45.0, ty, tz), segs=18)
    rig.part("barrel", g, BORE, outline=0)
    g = Geo().capsule((tx, -9.8, tz), (tx, 9.8, tz), 2.5)                     # trunnions
    rig.part("barrel", g, BRONZE_DK, finish="metal", outline=0.6)
    g = Geo()                                                                # dolphin handles
    for x in (-4.0, 4.0):
        g.capsule((tx + x - 2.0, ty - 3.0, tz + 9.4), (tx + x, ty - 3.0, tz + 12.4), 1.1)
        g.capsule((tx + x, ty - 3.0, tz + 12.4), (tx + x + 2.4, ty - 3.0, tz + 9.0), 1.1)
    rig.part("barrel", g, B.BRASS, finish="metal", outline=0.5)
    rig.track("muzzle", "barrel", MUZ)
    B.wheel(rig, "wheel_r", (0.0, -13.0, WHEEL_R), WHEEL_R, 3.4)
    # wooden chocks behind the wheels (they bounce on the recoil)
    g = Geo().slab([(-22.0, 0.0), (-13.0, 0.0), (-13.0, 2.2), (-20.0, 5.0)], -17.0, 3.0)
    rig.part("chocks", g, CHOCK, outline=0.6)

    # vent spark, muzzle flash (big) and the smoke cloud
    rig.joint("vent", "barrel", (tx - 13.0, ty, tz + 9.0), hidden=True)
    g = Geo().star((tx - 13.0, ty - 2.0, tz + 11.0), 5.0, 1.8, 1.2, points=7)
    rig.part("vent", g, glow=B.FIRE, outline=0)
    g = Geo().sphere((tx - 13.0, ty - 3.0, tz + 11.0), 2.0, cuts=3)
    rig.part("vent", g, glow="#FFFFFF", outline=0)
    B.muzzle_flash(rig, "barrel", MUZ, size=3.0)
    mx, my, mz = MUZ
    G.smoke_cloud(rig, "barrel", (mx + 12.0, my - 2.0, mz + 2.0), size=1.9)

    # the gunner: a biped behind the breech
    rig.joint("crew", "unit", (0, 0, 0))
    B.skeleton(rig, parent="crew")
    B.legs(rig, B.CREAM, B.BLACK, stocking=B.BLACK)
    g = Geo().blob((0, 0, 28.0), (10.8, 10.0, 11.8), p=2.4, taper=(1.08, 0.94))
    g.blob((0, 0, 18.0), (10.4, 9.8, 4.6), p=2.6)
    rig.part("torso", g, team=True)
    g = Geo().blob((0.5, 0, 15.5), (11.6, 10.8, 7.0), p=2.6, taper=(1.12, 1.0))
    g.clip((0, 0, 9.6), (0, 0, -1))
    rig.part("hips", g, team=True)
    g = Geo().capsule((1.0, -10.2, 37.0), (10.6, 0.0, 22.0), 1.9).capsule((10.6, 0.0, 22.0), (2.0, 9.6, 18.5), 1.9)
    rig.part("torso", g, B.CREAM, outline=0.8)
    g = Geo().blob((0.4, 0, 19.6), (11.0, 10.2, 1.8), p=3.0)
    rig.part("torso", g, B.LEATHER)
    g = Geo().blob((1.2, 0, 37.2), (6.8, 7.2, 2.4), p=2.4)
    rig.part("torso", g, B.BLACK)
    rig.secondary("tails", "hips", (-4.0, 0, 18.0), (-7.5, 0, 6.0), max_deg=14, gain=1.0)
    g = Geo().blob((-5.4, 0, 12.0), (5.0, 10.0, 7.6), p=2.6, taper=(0.7, 1.0), rot=(0, 10, 0))
    rig.part("tails", g, team=True)
    head = G.head_geos(center=(2, 0, 48.5), nose=(13.8, -0.6, 46.8), nose_r=(3.8, 3.3, 3.5))
    hair = Geo().blob((-6.2, 0, 47.5), (5.8, 10.0, 7.0), p=2.2)
    K.face2(rig, [head, hair], B.SKIN, cx=12.0, cz=49.6, eye_dy=(-4.6, 4.4),
            eye_r=(3.8, 3.5, 4.4), brow=HAIR, mouth_dz=-8.2, mouth_x=12.8,
            eye_at=(13.8, 49.8), mark_r=4.1)
    rig.part("head", head, B.SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    g = Geo().blob((13.6, -4.0, 43.8), (2.8, 4.6, 2.0), p=2.2, rot=(22, 0, 0))   # moustache
    g.blob((13.6, 3.0, 43.8), (2.8, 4.6, 2.0), p=2.2, rot=(-22, 0, 0))
    rig.part("head", g, HAIR, finish="hair")
    # a team knitted cap with ear flaps (the flaps flap) and a cream bobble
    g = Geo().blob((1.0, 0, 54.0), (12.4, 12.0, 9.0), p=2.3)
    g.clip((0, 0, 53.0), (0, 0, -1))
    rig.part("head", g, team=True)
    g = Geo().blob((1.0, 0, 53.4), (12.6, 12.2, 1.8), p=3.0)
    rig.part("head", g, B.CREAM, outline=0.5)
    g = Geo().sphere((0.0, 0, 63.4), 3.0, cuts=3)
    rig.part("head", g, B.CREAM, finish="hair", outline=0.6)
    rig.secondary("flap", "head", (0.0, -11.0, 52.0), (-0.5, -11.8, 43.0), max_deg=18, gain=1.4)
    g = Geo().blob((0.0, -11.2, 47.5), (3.8, 1.8, 5.2), p=2.4)
    rig.part("flap", g, team=True, outline=0.6)
    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM)
        y = B.ARM_Y[s]
        g = Geo().blob((2.8, y - 1.4 * (1 if s == "r" else -1), B.HAND_Z + 1.0), (1.6, 1.5, 2.2), p=2.2)
        rig.part(f"hand_{s}", g, B.SKIN, outline=0.5)
    # linstock in the near hand, modelled pointing up; the glowing match at the fork
    hx, hy, hz = HR
    g = Geo().capsule((hx + 0.4, hy - 0.6, hz - 12.0), (hx + 0.4, hy - 0.6, hz + 26.0), 1.2, 1.0)
    rig.part("hand_r", g, B.GUNWOOD, outline=0.8)
    g = Geo().capsule((hx + 0.4, hy - 0.6, hz + 26.0), (hx + 3.0, hy - 0.6, hz + 30.0), 0.9)
    g.capsule((hx + 0.4, hy - 0.6, hz + 26.0), (hx - 2.2, hy - 0.6, hz + 30.0), 0.9)
    rig.part("hand_r", g, B.IRON, finish="metal", outline=0.5)
    rig.joint("match", "hand_r", (hx + 3.0, hy - 0.6, hz + 30.5))
    g = Geo().sphere((hx + 3.0, hy - 1.2, hz + 30.8), 2.0, cuts=3)
    rig.part("match", g, glow=MATCH, outline=0.6, outline_hex=B.FIRE)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
CREW = {"crew": {"x": CREW_X}}
SH = (0.0, B.SHOULDER_Z)


def gun(elev, recoil=0.0, hop=0.0, tilt=0.0, spin=0.0):
    """Barrel elevation, carriage recoil (lu back along x), hop (lu up), carriage tilt and a
    wheel spin (deg, clockwise = rolling forward)."""
    return {"barrel": {"r": elev}, "cart": {"x": -recoil, "z": hop, "r": tilt},
            "wheel_r": {"r": -spin}, "wheel_l": {"r": -spin}}


def linstock(a, f, w=90.0):
    return B.arm("r", a, f, w, w_rest=90.0)


def free(a, f):
    return B.arm("l", a, f)


STANCE = merge(CREW, linstock(-60, -10, 88), free(-80, -40), {"torso": {"r": -2}})


def _idle(f):
    # breathing; he wipes his brow with the free sleeve (2-4); the match glows; blink on 5
    wipe = [0.0, 0.3, 1.0, 1.0, 0.6, 0.0][f]
    sweep = [0.0, 0.0, 0.0, 1.0, 0.5, 0.0][f]

    def extra(ctx):
        a, fo = B.ik2(SH, (9.0 - 4.0 * sweep, 54.0), elbow_down=False)
        return merge(free(-80 + (a + 80) * wipe, -40 + (fo + 40) * wipe), gun(IDLE_ELEV + 0.6 * ctx["c"]), {
            "arm_r": {"r": 2 * ctx["lag"]}, "hand_r": {"r": -2 * ctx["lag"]},
            "head": {"r": -4 * wipe}, "match": {"s": [1.0, 0.8, 1.2, 0.9, 1.1, 0.85][f]}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_l", "fore_l")}
    pose = M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)
    if wipe > 0.5:
        pose = merge(pose, F.expr("blink" if sweep > 0.5 else "o"))
    return pose


WALK_MS = 100


def _walk(f):
    # the gunner walks bent over, pushing the trail with both hands; the wheels roll
    spin = math.degrees(28.2 / 8 / WHEEL_R) * f
    p = 2 * math.pi * f / 8

    def extra(ctx):
        return merge(gun(IDLE_ELEV, hop=0.6 * abs(math.sin(2 * p)), tilt=0.8 * math.sin(2 * p), spin=spin),
                     linstock(-45, -30, 115), free(-40, -25),
                     {"match": {"s": [1.0, 0.8, 1.2, 0.9][f % 4]}})
    return M.walk_v2(f, CREW, HEIGHT_LU, thigh=30.0, knee=58.0, lift_lu=6.5, bob_pct=0.05,
                     lean=-18.0, arms=(), twist=4.0, extra=extra)


# attack: 874 ms, the shot (impact) at 333 ms (impactAt 0.381, as shipped); 11 unique frames
#            step lower touch FIZZ(held) crouch | BOOM back smoke ears shove settle
ATTACK_MS = [40, 50, 60, 140, 43, 90, 90, 90, 90, 90, 91]
ATTACK_IMPACT = 5
ELEV = [16, FIRE_ELEV, FIRE_ELEV, FIRE_ELEV, FIRE_ELEV - 1, FIRE_ELEV + 5, FIRE_ELEV + 9,
        FIRE_ELEV + 3, FIRE_ELEV - 2, IDLE_ELEV + 4, IDLE_ELEV]
RECOIL = [0, 0, 0, 0, 0, 6.0, 15.0, 12.0, 9.0, 3.0, 0.5]
HOP = [0, 0, 0, 0, -0.8, 2.5, 3.5, 0.5, 0, 0, 0]
TILT = [0, 0, 0, 0, 0, 5.0, 6.0, 1.0, -1.0, 0, 0]
SPIN = [0, 0, 0, 0, 0, -25, -60, -52, -40, -12, -2]
BQ = [0, 0, -0.02, 0.0, -0.06, 0.08, 0.0, -0.04, 0, 0, 0]       # barrel squash / stretch
CREW_DX = [2, 5, 5, 2, 1, -4, -6, -5, -3, 3, 0]
LEAN = [-6, -12, -8, 12, 14, 18, 12, 6, 2, -16, -4]
HEAD = [0, -6, 6, 14, 16, 12, 8, 4, 0, -4, 0]
# linstock arm (a, f, w) and the free arm: over the ear on the fizz and the bang
LS = [(-20, 20, 80), (20, 30, 20), (25, 25, 10), (-10, 10, 70), (-10, 10, 80), (-30, 0, 110),
      (-40, -10, 100), (-50, -10, 95), (-58, -10, 90), (-40, -30, 110), (-60, -10, 88)]
EAR = (3.0, 49.0)


def _attack_pose(f):
    pose = merge(CREW, gun(ELEV[f], RECOIL[f], HOP[f], TILT[f], SPIN[f]), {
        "crew": {"x": CREW_DX[f]},
        "torso": {"r": LEAN[f]},
        "head": {"r": HEAD[f]},
        "thigh_r": {"r": [10, 16, 12, -6, -8, -10, -6, -4, 0, 16, 0][f]},
        "thigh_l": {"r": [-10, -18, -12, 8, 10, 8, 4, 2, 0, -18, 0][f]},
        "shin_l": {"r": [0, -6, -4, -4, -6, -6, -2, 0, 0, -8, 0][f]},
        "vent": {"show": f in (2, 3, 4), "s": [1, 1, 0.7, 1.3, 1.1, 1, 1, 1, 1, 1, 1][f], "r": 20 * f},
        "flash": {"show": f == 5},
        "smoke": {"show": f in (6, 7, 8), "s": [1, 1, 1, 1, 1, 1, 0.8, 1.1, 1.3, 1, 1][f],
                  "z": [0, 0, 0, 0, 0, 0, 0, 3, 7, 0, 0][f]},
        "chocks": {"z": [0, 0, 0, 0, 0, 0, 5.0, 2.0, 0, 0, 0][f], "x": [0, 0, 0, 0, 0, 0, -6, -9, -9, -3, 0][f],
                   "r": [0, 0, 0, 0, 0, 0, 30, 10, 0, 0, 0][f]},
    })
    pose["barrel"].update({"sx": 1.0 + BQ[f], "sz": 1.0 - BQ[f] * 0.9, "sy": 1.0 - BQ[f] * 0.9})
    if f in (3, 4) or 5 <= f <= 7:
        a, fo = B.ik2(SH, EAR, elbow_down=False)
        pose = merge(pose, free(a, fo))
    elif f == 9:
        pose = merge(pose, free(-10, -5))     # both hands shove the wheel back in
    else:
        pose = merge(pose, free(-80, -40))
    pose = merge(pose, linstock(*LS[f]))
    if f in (3, 4):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0}})
    elif f in (5, 6):
        pose = merge(pose, F.expr("squeeze", "yell"), {"flap": {"r": 30}})
    elif f == 7:
        pose = merge(pose, F.expr("o"))
    elif f == 9:
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_clip():
    ov = {
        5: [{"kind": "burst", "joint": "barrel", "point": MUZ, "r0_lu": 12.0, "r1_lu": 20.0, "n": 7,
             "a0": -80.0, "arc": 160.0, "color": "#FFF4D6"},
            {"kind": "dust", "ground": (-18.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 71, "spread": 1.0,
             "dir": -1.0}],
        6: [{"kind": "dust", "ground": (-24.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 72, "spread": 1.2,
             "dir": -1.0}],
        3: [{"kind": "rings", "joint": "barrel", "point": (TRUN[0] - 13.0, 0.0, TRUN[2] + 11.0),
             "radii_lu": (5.0, 8.0), "a0": 20.0, "a1": 160.0, "color": "#FFE7B0"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov)


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(STANCE, gun(IDLE_ELEV + 6 * a, recoil=3.0 * max(a, 0), hop=2.5 * max(a, 0),
                             tilt=4.0 * a), {
        "unit": squash([-0.1, 0.06, 0.02, -0.03, 0.0][k]),
        "crew": {"z": -3.0 * max(a, 0)},
        "torso": {"r": -14 * max(a, 0)}, "head": {"r": -10 * max(a, 0)},   # ducks behind the breech
        "arm_r": {"r": 15 * a}, "flap": {"r": 20 * a},
    })
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


# D7 wreck and bail: 9 unique poses in the 10 small die steps (moves.DIE_MS)
W_HOP = [2, 8, 12, 6, 0, 1.5, 0, 0, 0, 0]
W_TILT = [4, 10, 14, 8, -10, -6, -12, -12, -12, -12]     # nose down as it slumps
W_ELEV = [16, 26, 30, 14, -8, -2, -12, -12, -12, -12]
W_Z = [0, 0, 0, 0, -5, -3, -6, -6, -6, -6]
WHEEL_OFF = [(0, 0, 0), (0, 0, 0), (-4, 6, 40), (-10, 10, 110), (-18, 4, 190), (-24, -2, 260),
             (-28, -4, 300), (-30, -6, 320), (-30, -6, 320), (-30, -6, 320)]
C_X = [-2, -6, -10, -14, -17, -18, -18, -18, -18, -18]
C_Z = [0, 8, 14, 10, 0, 2, 0, 0, 0, 0]
C_R = [6, 20, 50, 80, 90, 88, 90, 90, 90, 90]           # the gunner falls onto his back


def _die(k):
    pose = merge(STANCE, gun(W_ELEV[k], hop=W_HOP[k] + W_Z[k], tilt=W_TILT[k], spin=-30 * k), {
        "unit": dict(squash([-0.08, 0.06, 0.04, 0.0, -0.12, 0.04, -0.06, -0.03, -0.05, -0.08][k]),
                     s=[1, 1, 1, 1, 1, 1, 1, 1, 0.97, 0.92][k]),
        "crew": {"x": C_X[k], "z": C_Z[k], "r": C_R[k]},
        "arm_r": {"r": [40, 90, 120, 100, 60, 60, 60, 60, 60, 60][k]},
        "arm_l": {"r": [60, 130, 150, 120, 80, 80, 80, 80, 80, 80][k]},
        "thigh_r": {"r": [10, 40, 30, 20, 30, 30, 30, 30, 30, 30][k]},
        "flap": {"r": 30},
        "smoke": {"show": k in (1, 2, 3), "s": [1, 0.6, 0.8, 1.0, 1, 1, 1, 1, 1, 1][k]},
    })
    x, z, r = WHEEL_OFF[k]
    pose["wheel_r"] = dict(pose.get("wheel_r", {}), x=x, z=z, r=pose["wheel_r"].get("r", 0) + r)
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], [WALK_MS] * 8, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 7, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 7, 7, 8], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl, attack_ms=874, attack_impact_at=0.381)
