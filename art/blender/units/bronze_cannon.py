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
  walk    walk v3 (ANIM_SPEC G6): eight-spoke wheels roll exactly with the ground (2 spoke
          spacings, 90 degrees, per 475 ms cycle at radius 17 lu = 56.2 lu/s, card 45 x 1.25),
          11.25 degrees per frame so they never strobe; the gunner jogs bent over behind the trail
          with his feet planted by IK, the carriage bumps once per cycle and pitches, his cap
          flap and coat tails trail, dust kicks off the wheels
  attack_b  QUICK TOUCH-OFF, THE GUNNER LEAPS ASIDE: he stretches the linstock to the vent at
          arm's length on one leg, leaning as far away as he can (the held extreme), the vent
          fizzes, BOOM: the gun rears on its trail and he leaps back into the air with his legs
          tucked, lands in a crouch and peeks up, then the same shove-back as A
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
from ageborn_art import gait as GT
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "bronze_cannon"
GAIT_NAME = "wheeled"
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


RIG = None
LEGS = {}


def build(rig):
    global RIG
    RIG = rig
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
    # walk v3: the gunner's legs by IK (the sole end on the shin) and an odometer for the
    # walk's natural speed (strideLu = 2 x its x range = the wheel rim travel per cycle)
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        LEGS[s] = GT.Leg(f"thigh_{s}", f"shin_{s}", (1.0, y, 1.2), bend=1.0)
    rig.joint("odo", "root", (0, 0, 0), hidden=True)
    rig.track("_foot", "odo", (0.0, 0.0, 0.0))


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


# -- walk v3 (G6): 2 spoke spacings of the 8-spoke wheel per cycle at the ground speed --------------
SPEED = 56.25
SPOKES = 8
WALK_DUR = [59, 60, 59, 60, 59, 60, 59, 59]               # 475 ms
WHEEL_STEP = 2 * (360.0 / SPOKES) / 8                    # 11.25 degrees per frame (25% of a spacing)
ODO_AMP = 2 * 2 * math.pi * WHEEL_R / SPOKES / 4         # rim travel per cycle / 4 (26.7 lu stride)
GAIT = None


def _gait():
    global GAIT
    if GAIT is None:
        GAIT = GT.Gait(8, sum(WALK_DUR), SPEED, GT.biped_feet(LEGS["l"], LEGS["r"], x_mid=CREW_X + 2.0),
                       0.5, lift=7.5, kick=3.0, toe_off=0.0, heel_strike=0.0)
    return GAIT


def _walk(f, report=None):
    # the gunner jogs bent over behind the trail, pushing it with both hands; the wheels roll
    p = 2 * math.pi * f / 8
    lag = math.cos(2 * (p - 2 * math.pi / 8))
    bump = -math.cos(p)                       # one bump per cycle, lowest on frame 0
    pose = merge(CREW, gun(IDLE_ELEV + 1.6 * math.sin(p), hop=2.6 * bump + 1.6, tilt=2.4 * math.sin(p),
                           spin=WHEEL_STEP * f),
                 linstock(-45, -30, 115 + 4 * lag), free(-40, -25), {
                     "odo": {"x": ODO_AMP * math.cos(p)},
                     "hips": {"z": -1.8 + 1.6 * math.cos(2 * p)},
                     "torso": {"r": -20 + 2 * math.cos(2 * p), "rz": 4 * math.sin(p)},
                     "head": {"r": 10 - 3 * lag},
                     "arm_r": {"r": 3 * lag}, "arm_l": {"r": 3 * lag},
                     "flap": {"r": 10 * lag}, "tails": {"r": 6 * lag},
                     "match": {"s": [1.0, 0.8, 1.2, 0.9][f % 4]}})
    return GT.solve(RIG, pose, _gait().targets(f), report=report)


WALK_DUST = {k: [{"kind": "dust", "ground": (-10.0 if k % 2 else -6.0, 0.0), "size_lu": 5.5 if k % 2 else 4.0,
                  "puffs": 3, "seed": 70 + k, "spread": 1.0, "dir": -1.0}] for k in range(8)}


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
    # the fizz hold loops with the crouch (the barrel quivers, the vent sputters) while the 5.3x
    # sim wind-up lasts (ANIM_SPEC R5)
    return M.clip("attack", [_attack_pose(f) for f in range(11)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov, extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: quick touch-off, the gunner leaps aside (ANIM_SPEC appendix B) -----------------------
# unique frames: 0 = A step, 1 reach, 2 touch, 3 HOLD (on one leg at arm's length, leaning far away),
# 4 fizz, 5 BOOM (the gun rears, he leaps back into the air), 6 lands in a crouch, 7 peeks up,
# 8-10 = A (ears, shove, settle). Same steps as A.
#        reach  touch  HOLD   fizz   BOOM   land   peek
OB_ELEV = [FIRE_ELEV, FIRE_ELEV, FIRE_ELEV, FIRE_ELEV - 1, FIRE_ELEV + 8, FIRE_ELEV + 4, FIRE_ELEV]
OB_REC = [0, 0, 0, 0, 4.0, 9.0, 9.5]
OB_HOP = [0, 0, 0, -0.6, 4.5, 0.5, 0]
OB_TILT = [0, 0, 0, 0, 9.0, 2.0, -0.5]
OB_SPIN = [0, 0, 0, 0, -18, -40, -42]
OB_BQ = [0, -0.02, 0.0, -0.05, 0.09, 0.0, 0.0]
OB_DX = [6, 9, 10, 10, -10, -16, -12]
OB_DZ = [0, 0, 0, 0, 10.0, -3.0, -2.0]
OB_LEAN = [-10, 6, 26, 28, 18, -20, -10]
OB_HEAD = [-4, 8, 16, 18, 10, -6, 6]
OB_LS = [(10, 30, 30), (30, 34, 4), (36, 38, -2), (36, 38, -4), (110, 140, 160), (-40, -20, 110), (-50, -10, 95)]
OB_FREE = [(-60, -30), (-20, 10), (150, 170), (155, 175), (120, 150), (-30, 10), (-70, -40)]
OB_THR = [16, 20, 34, 36, 70, 80, 50]
OB_SHR = [-6, -10, -12, -14, -100, -110, -80]
OB_THL = [-14, -10, 12, 14, 50, 40, 20]
OB_SHL = [-4, -40, -70, -74, -90, -100, -60]


def _b_pose(i):
    if i == 0 or i >= 8:
        return _attack_pose(i)
    k = i - 1
    pose = merge(CREW, gun(OB_ELEV[k], OB_REC[k], OB_HOP[k], OB_TILT[k], OB_SPIN[k]), {
        "crew": {"x": OB_DX[k], "z": OB_DZ[k]},
        "torso": {"r": OB_LEAN[k]}, "head": {"r": OB_HEAD[k]},
        "thigh_r": {"r": OB_THR[k]}, "shin_r": {"r": OB_SHR[k]},
        "thigh_l": {"r": OB_THL[k]}, "shin_l": {"r": OB_SHL[k]},
        "vent": {"show": k in (1, 2, 3), "s": [1, 0.8, 1.2, 1.5, 1, 1, 1][k], "r": 25 * k},
        "flash": {"show": k == 4},
        "smoke": {"show": k in (5, 6), "s": [1, 1, 1, 1, 1, 0.9, 1.2][k], "z": [0, 0, 0, 0, 0, 2, 5][k]},
        "chocks": {"z": [0, 0, 0, 0, 3.0, 1.0, 0][k], "x": [0, 0, 0, 0, -4, -7, -8][k],
                   "r": [0, 0, 0, 0, 20, 6, 0][k]},
        "flap": {"r": [0, 0, 6, 10, 34, 20, 6][k]},
    }, linstock(*OB_LS[k]), free(*OB_FREE[k]))
    pose["barrel"].update({"sx": 1.0 + OB_BQ[k], "sz": 1.0 - OB_BQ[k] * 0.9, "sy": 1.0 - OB_BQ[k] * 0.9})
    if k in (2, 3):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0}})
    elif k == 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    elif k == 5:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k == 6:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.6}})
    return pose


def _attack_b():
    ov = {
        5: [{"kind": "burst", "joint": "barrel", "point": MUZ, "r0_lu": 12.0, "r1_lu": 20.0, "n": 7,
             "a0": -80.0, "arc": 160.0, "color": "#FFF4D6"},
            {"kind": "dust", "ground": (-16.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 73, "spread": 1.0,
             "dir": -1.0}],
        6: [{"kind": "dust", "ground": (CREW_X - 14.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 74,
             "spread": 1.1, "dir": -1.0}],
        3: [{"kind": "rings", "joint": "barrel", "point": (TRUN[0] - 13.0, 0.0, TRUN[2] + 11.0),
             "radii_lu": (5.0, 8.0), "a0": 20.0, "a1": 160.0, "color": "#FFE7B0"}],
    }
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov, reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


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
        M.clip("walk", [_walk(f) for f in range(8)], WALK_DUR, loop=True, overlays=WALK_DUST),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 7, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 7, 7, 8], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=874, attack_impact_at=0.381))
