"""Scorpion: Bronze Age artillery (A17.9), vehicle rig. A bolt that pierces 3 targets, ~80 lu.

Look (A17.12): a wheeled torsion bolt-thrower. A plum carriage with a long trail and two
six-spoked wheels (a team spoke and a rim stud mark the roll) carries the weapon on a pivot:
a long wooden stock, a plum torsion housing up front with aged-bronze washers, rope skein
bundles with lashing bands and two swept team-painted bow arms (the team colour stays off the
bolt, which reads as a projectile), a taut string, a heavy bolt with a polished head and
sandstone fletching, a rack of spare bolts on the trail and a windlass with a crank at the
back. A crewman in a leather cap (face kit, beard) and a team tunic works it.

Animation (cartoon kit v2; a viewer expects a crew to crank, aim and let fly with a kick):
  idle    the aimer nudges the elevation and peers along the stock, blink
  walk    walk v3 (ANIM_SPEC G6 + G1 crew): he leans into the trail and pushes it along with planted
          feet at the ground speed; the 6-spoke wheels turn exactly 2 spoke spacings per cycle
          (15 degrees a frame, no strobe), the carriage rocks and the pennant whips
  attack_b  SNAP SHOT: one fast crank, a quick upright aim with a hand on the trigger and the far
          hand pointing, then the release rocks the whole carriage back on its trail
          (A and B: the aimer jiggles the aim while the sim wind-up lasts: holdLoop)
  attack  CRANK, LOCK AND WHIP: three crank frames (the handle spins, the string winds back,
          the arms bend), the aimer squints along the stock (the held extreme), release: the
          torsion arms whip forward (smear, whip lines), the bolt leaves at the per-frame
          `muzzle`, the whole frame hops and kicks back, lands with dust; he grabs a new bolt
          from the rack and drops it into the groove
  hit     vehicle: the carriage bounces, the crewman ducks and squeezes his eyes
  die     D7 wreck: the frame tips back, the near wheel comes off, the crewman is knocked flat
          (X eyes)
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as GT
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art import rigs_gunpowder as G
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "scorpion"
GAIT_NAME = "wheeled"
NAME = "Scorpion"
HEIGHT_LU = 76
YAW_DEG = -10.0
CANVAS = (540, 270)
FEET = (326, 246)
ANCHORS = {"head": (-20, 74), "hitCenter": (0, 32)}
NO_RETIME = True

WHEEL_R = 15.0
AXLE = (0.0, 0.0, WHEEL_R)
TRUN = (4.0, 0.0, 31.0)       # the weapon's pivot on the carriage
SZ = TRUN[2] + 4.0            # stock top (where the bolt lies)
HOUSING_X = 28.0
STRING_REST, STRING_DRAWN = 16.0, -14.0
BOLT_LEN = 40.0
WINCH = (-28.0, 0.0, TRUN[2] + 1.0)
CRANK_R = 5.0
CREW_X = -50.0
CREW_Y = -15.0               # on the near side, so his legs show as he pushes
MS = 1.25                     # the machine is modelled small and scaled up about the ground
IDLE_ELEV, FIRE_ELEV = 4.0, 8.0


TIPS = {}


def _cheek(y):
    pts = [(12.0, 21.0), (12.0, 29.5), (5.0, 33.0), (-5.0, 32.0), (-40.0, 7.0), (-46.0, 3.0), (-45.0, 0.0),
           (-39.0, 0.5), (-7.0, 17.5)]
    return Geo().slab(pts, y, 3.0)


def _marker(rig, joint, y):
    """Three team-painted spokes (every other one) and bronze rim studs, so the roll reads at 1x: the
    pattern repeats every 120 degrees, the walk turns the wheel exactly that far per cycle."""
    g, st = Geo(), Geo()
    for k in range(3):
        a = math.radians(120 * k)
        c, s_ = math.cos(a), math.sin(a)
        g.capsule((3.2 * c, y - 0.8, WHEEL_R + 3.2 * s_), ((WHEEL_R - 4.0) * c, y - 0.8, WHEEL_R + (WHEEL_R - 4.0) * s_),
                  1.6, 1.3)
        st.sphere(((WHEEL_R - 1.0) * c, y - 1.8, WHEEL_R + (WHEEL_R - 1.0) * s_), 1.8, cuts=3)
    rig.part(joint, g, team=True, outline=0.5)
    rig.part(joint, st, B.BRONZE_HI, finish=B.POLISH, outline=0.5)


def build(rig):
    global RIG
    RIG = rig
    rig.joint("unit", "root", (0, 0, 0))
    rig.joint("machine", "unit", (0, 0, 0), scale=MS)
    rig.joint("cart", "machine", AXLE)
    rig.joint("frame", "cart", TRUN)
    rig.joint("wheel_l", "cart", (0.0, 12.0, WHEEL_R))
    rig.joint("wheel_r", "cart", (0.0, -12.0, WHEEL_R))
    G.wheel(rig, "wheel_l", (0.0, 12.0, WHEEL_R), WHEEL_R, 3.0, rim=B.WOOD_DK, spokes=B.WOOD, hub=B.AGED,
            team_felloe=False, n_spokes=6)
    _marker(rig, "wheel_l", 12.0)

    # carriage: plum cheeks, axle, trail end, a team drape over the near cheek
    for y in (6.0, -6.0):
        rig.part("cart", _cheek(y), B.PLUM)
    g = Geo().capsule((0.0, -14.0, WHEEL_R), (0.0, 14.0, WHEEL_R), 2.0)
    g.capsule((-46.0, -7.5, 2.4), (-46.0, 7.5, 2.4), 1.8)
    rig.part("cart", g, B.WOOD_DK, finish="metal", outline=0.8)
    g = Geo().slab([(-4.0, 29.0), (-30.0, 11.0), (-30.0, 3.0), (-24.0, 6.0), (-19.0, 2.5), (-14.0, 7.0), (-9.0, 4.0),
                    (-4.0, 17.0)], -8.0, 1.4)
    rig.part("cart", g, team=True, outline=0.8)
    g = Geo().capsule((-30.5, -8.8, 11.5), (-4.0, -8.8, 29.5), 0.9)
    rig.part("cart", g, B.SAND_LT, outline=0.4)
    # a rack of spare bolts strapped along the near side of the trail
    g = Geo()
    for k in range(3):
        g.capsule((-38.0 + 2.0 * k, -9.6 - 0.6 * k, 5.0 + 1.8 * k), (-12.0 + 2.0 * k, -9.6 - 0.6 * k, 22.5 + 1.8 * k), 0.8)
    rig.part("cart", g, B.WOOD, outline=0.5)
    g = Geo()
    for k in range(3):
        g.lathe([(0, 0), (1.1, 0.5), (1.6, 2.0), (0, 4.6)], (-12.0 + 2.0 * k, -9.8 - 0.6 * k, 22.5 + 1.8 * k),
                (-8.3 + 2.0 * k, -9.8 - 0.6 * k, 25.0 + 1.8 * k), segs=8, squash=(1.0, 0.5))
    rig.part("cart", g, B.BRONZE, finish=B.POLISH, outline=0.4)
    g = Geo().capsule((-26.0, -12.2, 12.0), (-24.0, -12.2, 17.0), 1.0).capsule((-19.0, -12.2, 17.0), (-17.0, -12.2, 21.6), 1.0)
    rig.part("cart", g, B.LEATHER_DK, outline=0.3)

    # the weapon on the pivot: stock, slider, torsion housing, arms, string, bolt, windlass
    tx, ty, tz = TRUN
    g = Geo().blob((0.0, 0, tz + 1.5), (36.0, 3.6, 2.6), p=4.0)       # stock
    rig.part("frame", g, B.WOOD)
    g = Geo().blob((4.0, 0, tz + 3.8), (30.0, 2.2, 0.8), p=4.0)       # slider groove
    rig.part("frame", g, B.WOOD_DK, outline=0.4)
    hx = HOUSING_X
    g = Geo().blob((hx, 0, tz + 3.0), (6.4, 13.0, 11.0), p=4.0)       # torsion housing
    rig.part("frame", g, B.PLUM)
    g = Geo().blob((hx - 0.4, 0, tz + 3.0), (6.8, 13.4, 2.2), p=3.0)   # verdigris strap
    rig.part("frame", g, B.VERD, outline=0.6)
    g = Geo()
    for y in (-8.5, 8.5):
        for z in (tz + 14.4, tz - 8.4):
            g.lathe([(0, -1.0), (3.4, -1.0), (3.6, 0.0), (3.4, 1.0), (0, 1.0)], (hx, y, z), (hx, y, z + 1.0), segs=16)
    rig.part("frame", g, B.AGED, finish="metal", outline=0.6)
    g = Geo()
    for y in (-8.5, 8.5):
        g.capsule((hx, y, tz - 7.6), (hx, y, tz + 13.6), 2.6)         # the skein bundles
    rig.part("frame", g, B.SAND_DK, finish="hair", outline=0.6)
    g = Geo()
    for y in (-8.5, 8.5):
        for z in (tz - 3.0, tz + 3.0, tz + 9.0):
            g.lathe([(0, -0.7), (3.0, -0.7), (3.1, 0.7), (0, 0.7)], (hx, y, z), (hx, y, z + 1.0), segs=12)
    rig.part("frame", g, B.LEATHER_DK, outline=0.4)
    g = Geo().capsule((hx + 6.0, 0, tz - 4.0), (hx + 6.0, 0, tz + 10.0), 1.0)
    rig.part("frame", g, B.AGED_DK, finish="metal", outline=0.5)
    for s, y, dz in (("n", -1.0, -13.0), ("f", 1.0, 17.0)):
        rig.joint(f"bow_{s}", "frame", (hx, 8.5 * y, tz + 3.0))
        tip = (hx - 16.0, 21.0 * y, tz + 3.0 + dz)
        TIPS[s] = tip
        g = Geo().capsule((hx, 8.5 * y, tz + 3.0), tip, 3.2, 1.8)
        rig.part(f"bow_{s}", g, team=True)
        g = Geo().sphere(tip, 1.9, cuts=2)
        rig.part(f"bow_{s}", g, B.AGED, finish="metal", outline=0.5)
    # the string: two runs from the arm tips to the claw (the claw joint slides back)
    rig.joint("claw", "frame", (STRING_REST, 0, SZ))
    g = Geo()
    for k in ("n", "f"):
        g.capsule((STRING_REST, 0.0, SZ), TIPS[k], 0.5)
    rig.part("claw", g, B.LINEN, outline=0)
    g = Geo().blob((STRING_REST, 0, SZ), (2.2, 2.0, 1.6), p=3.0)
    rig.part("claw", g, B.AGED_DK, finish="metal", outline=0.5)
    # the bolt lies in the groove ahead of the claw (hidden when released)
    rig.joint("bolt", "claw", (STRING_REST, 0, SZ + 0.6))
    bz = SZ + 0.9
    g = Geo().capsule((STRING_REST, -0.5, bz), (STRING_REST + BOLT_LEN - 6.0, -0.5, bz), 0.9, segs=10)
    rig.part("bolt", g, B.WOOD, outline=0.5)
    g = Geo().lathe([(0, 0), (1.3, 0.6), (2.0, 2.4), (1.2, 5.0), (0, 7.0)], (STRING_REST + BOLT_LEN - 7.0, -0.5, bz),
                    (STRING_REST + BOLT_LEN, -0.5, bz), segs=10, squash=(1.0, 0.5))
    rig.part("bolt", g, B.BRONZE, finish=B.POLISH, outline=0.5)
    g = Geo().slab([(STRING_REST + 1.0, bz), (STRING_REST + 7.0, bz), (STRING_REST + 2.0, bz + 3.4)], -0.6, 0.8)
    g.slab([(STRING_REST + 1.0, bz), (STRING_REST + 7.0, bz), (STRING_REST + 2.0, bz - 3.4)], -0.6, 0.8)
    rig.part("bolt", g, B.SAND_LT, outline=0.4)
    # windlass at the back: a drum with a four-spoke crank on the near side
    wx, wy, wz = WINCH
    g = Geo().capsule((wx, -7.0, wz), (wx, 7.0, wz), 3.0)
    rig.part("frame", g, B.WOOD_DK, outline=0.6)
    rig.joint("crank", "frame", (wx, -8.5, wz))
    g = Geo()
    for i in range(4):
        a = math.pi / 2 * i
        g.capsule((wx, -8.5, wz), (wx + CRANK_R * math.cos(a), -8.5, wz + CRANK_R * math.sin(a)), 0.9)
    g.sphere((wx, -8.8, wz), 1.6, cuts=2)
    rig.part("crank", g, B.WOOD, outline=0.5)
    rig.track("muzzle", "frame", (STRING_REST + BOLT_LEN + 1.0, -0.5, bz))
    G.wheel(rig, "wheel_r", (0.0, -12.0, WHEEL_R), WHEEL_R, 3.0, rim=B.WOOD_DK, spokes=B.WOOD, hub=B.AGED,
            team_felloe=False, n_spokes=6)
    _marker(rig, "wheel_r", -12.0)
    B.dust_puff(rig, "unit", (-14.0, -6.0, 2.0), size=0.9, name="dust")
    # a team pennant on a pole at the trail (the machine's team cue while the crewman works)
    from ageborn_art import rigs_modern as _M
    _M.pennant(rig, "cart", (-26.0, 7.0, 8.0), 56.0, length=16.0, w=10.0, pole=B.WOOD_DK, tip=B.BRONZE_HI,
               max_deg=16)

    # the crewman behind the windlass
    rig.joint("crew", "unit", (0, 0, 0))
    G.skeleton(rig, parent="crew")
    B.sandal_legs(rig, greaves=False)
    g = Geo().blob((0.2, 0, 27.5), (10.2, 9.4, 11.4), p=2.4, taper=(1.1, 0.92))
    rig.part("torso", g, team=True)
    g = Geo().blob((0.6, 0, 15.0), (11.2, 10.2, 5.2), p=2.4, taper=(1.14, 0.92))
    rig.part("hips", g, team=True)
    g = Geo().blob((0.4, 0, 20.4), (11.0, 10.1, 1.8), p=3.2)
    rig.part("torso", g, B.LEATHER)
    beard = Geo().blob((11.0, 0, 41.2), (6.2, 8.6, 3.6), p=2.2)       # short beard
    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), extra=[beard], mouth_z=44.6, mouth_w=4.8)
    beard.blob((-5.6, 0, 46.4), (5.4, 9.2, 6.0), p=2.2)
    rig.part("head", beard, B.HAIR, finish="hair")
    g = Geo().blob((1.2, 0, 55.4), (12.0, 11.6, 8.4), p=2.4)          # leather cap
    g.clip((0, 0, 54.0), (0, 0, -1))
    rig.part("head", g, B.LEATHER)
    g = Geo().blob((1.2, 0, 55.0), (12.7, 12.3, 2.2), p=2.8)       # team cap band
    rig.part("head", g, team=True, outline=0.6)
    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.0, r1=3.6)
    # a spare bolt in the crewman's near hand for the reload (hidden until he grabs it)
    rig.joint("spare", "hand_r", (0.0, G.ARM_Y["r"], G.HAND_Z))
    g = Geo().capsule((-14.0, G.ARM_Y["r"] - 1.5, G.HAND_Z), (14.0, G.ARM_Y["r"] - 1.5, G.HAND_Z), 0.9)
    rig.part("spare", g, B.WOOD, outline=0.5)
    g = Geo().lathe([(0, 0), (1.3, 0.6), (2.0, 2.4), (0, 6.0)], (14.0, G.ARM_Y["r"] - 1.5, G.HAND_Z),
                    (20.0, G.ARM_Y["r"] - 1.5, G.HAND_Z), segs=8, squash=(1.0, 0.5))
    rig.part("spare", g, B.BRONZE, finish=B.POLISH, outline=0.4)
    # crew feet: the walk's natural speed comes from his planted soles (pipeline.walk_metrics)
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))
    rig.track("_foot_l", "shin_l", (3.1, 6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def gun(elev, recoil=0.0, hop=0.0, tilt=0.0, spin=0.0):
    return {"frame": {"r": elev}, "cart": {"x": -recoil, "z": hop, "r": tilt},
            "wheel_r": {"r": -spin}, "wheel_l": {"r": -spin}}


def crank_hands(ang, elev=IDLE_ELEV, crew_dx=0.0, recoil=0.0):
    """Both hands on the crank handle at angle `ang` (deg), solved from the crewman's shoulders."""
    wx, _, wz = WINCH
    e = math.radians(elev)
    # winch centre in character space (the frame pivots at TRUN)
    dx, dz = wx - TRUN[0], wz - TRUN[2]
    cx = (TRUN[0] + dx * math.cos(e) - dz * math.sin(e) - recoil) * MS
    cz = (TRUN[2] + dx * math.sin(e) + dz * math.cos(e)) * MS
    a = math.radians(ang)
    tx, tz = cx + CRANK_R * MS * math.cos(a), cz + CRANK_R * MS * math.sin(a)
    sx, sz = CREW_X + crew_dx, G.SHOULDER_Z
    tgt = (tx - sx, tz - sz + G.SHOULDER_Z)
    ar, fr = G.ik2((0.0, G.SHOULDER_Z), tgt)
    al, fl = G.ik2((0.0, G.SHOULDER_Z), (tgt[0] - 2.5, tgt[1]))
    return merge(G.arm("r", ar, fr), G.arm("l", al, fl), {"crank": {"r": -ang}})


def _crew(dx=0.0):
    return {"crew": {"x": CREW_X + dx, "y": CREW_Y}}


def _idle(f):
    # 6 poses in 920 ms: he nudges the elevation up (2), peers along the stock (3), lets it
    # settle; a blink on 5
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    peer = [0.0, 0.4, 1.0, 1.0, 0.4, 0.0][f]
    elev = IDLE_ELEV + 1.2 * peer
    pose = merge(_crew(), gun(elev, tilt=0.3 * c), crank_hands(-30.0 + 10 * peer, elev), {
        "hips": {"z": -0.6 * c}, "body": squash(-0.025 * c),
        "torso": {"r": -8 - 8 * peer}, "head": {"r": -2.0 * lag - 6 * peer},
        "pupils": {"x": 0.4 * peer},
    })
    if f == 5:
        pose = merge(pose, F.expr("blink"))
    elif peer > 0.9:
        pose = merge(pose, {"brow": {"z": -0.8}})
    return pose


# -- walk v3: pushed at ground speed (card 45 x 1.25 = 56.25 lu/s), 8 x 86 ms ----------------------
# the wheels (r 15 x MS 1.25 = 18.75 lu, 6 spokes) turn 15 degrees a frame: 2 spoke spacings (39 lu of
# rim) per 688 ms cycle = 57 lu/s in character space = the ground speed (yaw 10 degrees)
RIG = None
SPEED = 56.25
WALK_N, WALK_CYCLE = 8, 688
SPIN_PER_FRAME = 15.0
CREW_LEGS = {s: GT.Leg(f"thigh_{s}", f"shin_{s}", (3.1, y, 0.5)) for s, y in (("r", -6.0), ("l", 6.0))}
GAIT = GT.Gait(WALK_N, WALK_CYCLE, SPEED, GT.biped_feet(CREW_LEGS["l"], CREW_LEGS["r"], x_mid=CREW_X - 1.0),
               0.56, lift=4.5, kick=2.0, reach=0.0, toe_off=0.0, heel_strike=0.0)
# the crewman's planted foot sits at the unit origin's ground (his ankle end point is the sole)
for _k, (_leg, _ph, _x, _gz) in list(GAIT.feet.items()):
    GAIT.feet[_k] = (_leg, _ph, _x, 0.5)


def _walk(f, report=None):
    # he leans hard into the trail and pushes: the torso pumps with each step, the arms bend and
    # straighten on the handles, the machine rolls and rocks over the ground
    p = 2 * math.pi * f / WALK_N
    push = math.cos(2 * p)              # +1 on the contact frames (arms bent), -1 when passing
    bob = [-2.2, -2.8, -0.4, 1.0][f % 4]
    pose = merge(_crew(1.0 + 1.0 * push), gun(IDLE_ELEV + 1.2 * math.sin(2 * p), hop=2.2 * abs(math.sin(2 * p)),
                                           tilt=2.0 * math.sin(2 * p), spin=SPIN_PER_FRAME * f),
                 crank_hands(-70.0 + 10.0 * push, crew_dx=1.0 + 1.0 * push), {
        "body": squash([-0.03, -0.06, 0.0, 0.03][f % 4]),
        "hips": {"z": bob, "x": 0.8 * push},
        "torso": {"r": -28.0 - 4.0 * push, "rz": 5 * math.sin(p)}, "head": {"r": 8.0 + 3.0 * push},
    })
    return GT.solve(RIG, pose, GAIT.targets(f, roll=False), report=report)


# 10 unique frames in the shipped 883 ms, impact (release) at 367 ms (impactAt 0.4156)
# 11 steps: crank, crank, crank, AIM, jiggle (holdLoop with the aim while the sim wind-up lasts:
# warp 4.1x) | RELEASE, hop, land, grab, load, settle. Pre-impact 367 of 883 ms, as shipped.
ATTACK_MS = [60, 60, 60, 150, 37, 80, 70, 80, 100, 100, 86]
ATTACK_IMPACT = 5
#          crank crank crank AIM  REL  hop  land grab load settle
E_EL = [IDLE_ELEV + 1, IDLE_ELEV + 1.5, IDLE_ELEV + 2, FIRE_ELEV, FIRE_ELEV + 1.5, FIRE_ELEV,
        FIRE_ELEV - 1, IDLE_ELEV + 2, IDLE_ELEV + 1, IDLE_ELEV]
E_REC = [0, 0, 0, 0, 5.0, 7.0, 5.0, 2.5, 1.0, 0]
E_HOP = [0, 0, 0, 0, 1.5, 3.2, 0, 0.4, 0, 0]
E_TILT = [0, 0, 0, 0, 2.0, 2.5, -1.0, 0.3, 0, 0]
E_SPIN = [0, 0, 0, 0, -10, -22, -28, -22, -10, 0]
E_CLAW = [-8.0, -17.0, -26.0, -28.0, 1.5, 0.0, 0.0, 0.0, -6.0, 0.0]
E_CRANK = [60.0, 150.0, 240.0, 250.0, 250.0, 250.0, 250.0, 250.0, 250.0, 330.0]
E_BOW = [-3, -7, -10, -11, 7, -3, 2, 0, 0, 0]
E_Q = [-0.03, -0.05, -0.03, 0.0, -0.1, 0.05, -0.09, 0.0, 0.0, 0.0]
C_DX = [0, 1, 0, -1, -3, -3, -2, 4, 6, 1]
C_T = [-16, -6, -14, -24, 6, 8, 2, -18, -22, -8]
C_H = [2, -2, 2, -8, 12, 8, 2, 4, 6, 0]
C_THR = [14, 4, 16, 10, -6, -8, -2, 20, 22, 6]
C_THL = [-14, -6, -16, -8, 8, 6, 2, -18, -20, -6]


def load_hands(tx, tz, crew_dx):
    """Both crew hands reaching to a point (character space) in front of him."""
    sx = CREW_X + crew_dx
    tgt = (tx - sx, tz)
    ar, fr = G.ik2((0.0, G.SHOULDER_Z), tgt)
    al, fl = G.ik2((0.0, G.SHOULDER_Z), (tgt[0] + 4.0, tgt[1] + 1.0))
    return merge(G.arm("r", ar, fr), G.arm("l", al, fl))


def _attack_u(u):
    """Unique attack frame u: the 10 shipped poses with a jiggle (the hold-loop partner) after the aim."""
    if u <= 3:
        return _attack(u)
    if u == 4:
        return _jiggle(_attack(3))
    return _attack(u - 1)


def _jiggle(pose):
    return merge(pose, {"frame": {"r": 0.8}, "head": {"r": 3}, "torso": {"r": -2}, "brow": {"z": 0.4},
                        "pupils": {"x": -0.3}, "hips": {"z": -0.5}, "mouth": {"z": -0.3}})


def _attack(f):
    elev, rec = E_EL[f], E_REC[f]
    if f in (7, 8):
        # grabs a spare bolt from the rack (7), lays it into the groove (8)
        hands = load_hands(-36.0 if f == 7 else -24.0, 30.0 if f == 7 else 44.0, C_DX[f])
        hands = merge(hands, {"crank": {"r": -E_CRANK[f]}, "spare": {"show": True, "r": 20 if f == 7 else -4}})
    else:
        hands = crank_hands(E_CRANK[f], elev, C_DX[f], rec)
    pose = merge(_crew(C_DX[f]), gun(elev, rec, E_HOP[f], E_TILT[f], E_SPIN[f]), hands, {
        "unit": dict(squash(E_Q[f])),
        "claw": {"x": E_CLAW[f]},
        "bolt": {"hide": f in (4, 5, 6, 7, 8)},
        "bow_n": {"r": E_BOW[f]}, "bow_f": {"r": -E_BOW[f]},
        "torso": {"r": C_T[f]}, "head": {"r": C_H[f]},
        "thigh_r": {"r": C_THR[f]}, "thigh_l": {"r": C_THL[f]},
        "dust": {"show": f in (5, 6), "s": 0.8 if f == 5 else 1.2},
    })
    if f in (0, 1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.6}})
    elif f == 3:
        pose = merge(pose, {"brow": {"z": -1.2, "r": -6}, "pupils": {"x": 0.5}})
    elif f in (4, 5):
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif f == 6:
        pose = merge(pose, F.expr("o"))
    return pose


def _attack_clip():
    s_ = MS
    tipn = (TIPS["n"][0], TIPS["n"][1], TIPS["n"][2])
    bow = {"kind": "arc", "joint": "bow_n", "inner": (HOUSING_X - 6.0, -14.0, TRUN[2] - 3.0), "outer": tipn,
           "color": B.SAND_LT, "white": 0.3, "taper": 0.2, "lines": 2}
    ov = {
        5: [dict(bow, **{"from": 3, "t1": 1.0}),
            {"kind": "streak", "joint": "frame", "point": (STRING_REST + BOLT_LEN + 8.0, -0.5, SZ + 0.9),
             "from": 3, "color": B.SAND_LT, "width_lu": 4.0, "white": 0.3},
            {"kind": "burst", "joint": "bow_n", "point": tipn, "r0_lu": 4.0, "r1_lu": 9.0, "n": 4,
             "a0": -30.0, "arc": 120.0},
            {"kind": "burst", "joint": "frame", "point": (HOUSING_X + 6.0, 0, TRUN[2] + 3.0), "r0_lu": 8.0,
             "r1_lu": 15.0, "n": 5, "a0": -60.0, "arc": 120.0}],
        7: [{"kind": "dust", "ground": (0.0, 0.0), "size_lu": 9.0, "puffs": 5, "seed": 3, "spread": 1.2},
            {"kind": "dust", "ground": (-56.0 * s_ / 1.25, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 7}],
    }
    return M.clip("attack", [_attack_u(u) for u in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: quick snap shot (ANIM_SPEC appendix B) ----------------------------------------------
# 0 = A crank, 1 one fast full crank (the claw slams back), 2 he straightens up, 3 HOLD (standing
# tall beside the stock, a hand on the trigger lever, the far arm pointing at the target, the bow
# low and level), 4 jiggle, 5 RELEASE (he yanks the trigger, the arms whip, the whole carriage rocks
# back onto its trail, nose up), 6 rock, 7 land, 8-10 = A grab, load and settle
B_EL = [IDLE_ELEV + 2, IDLE_ELEV - 3, IDLE_ELEV - 6, IDLE_ELEV - 5.5, IDLE_ELEV + 6, IDLE_ELEV + 3, IDLE_ELEV]
B_TILT = [0, 0, 0, 0, 6.0, 3.0, -1.0]
B_REC = [0, 0, 0, 0, 3.0, 4.5, 3.0]
B_CLAW = [-28.0, -28.0, -28.0, -28.0, 1.5, 0.0, 0.0]
B_CRANK = [330.0, 380.0, 380.0, 380.0, 380.0, 380.0, 380.0]
B_BOW = [-11, -11, -11, -11, 7, -3, 2]
B_DX = [1, 3, 4, 4, 2, 1, 0]
B_T = [-14, 4, 8, 6, 16, 10, 0]
B_H = [2, -4, -6, -6, 10, 6, 0]
B_Q = [-0.05, 0.04, 0.05, 0.0, -0.08, 0.04, -0.06]


def _b_frame(k):
    elev = B_EL[k]
    if k == 0:
        hands = crank_hands(B_CRANK[k], elev, B_DX[k])
    else:
        # upright: the near hand on the trigger lever at the stock, the far arm pointing ahead
        wx = TRUN[0] * MS - CREW_X - B_DX[k]
        a, f_ = G.ik2((0.0, G.SHOULDER_Z), (wx - 26.0, G.SHOULDER_Z + 4.0))
        hands = merge(G.arm("r", a, f_), G.arm("l", [10, 40, 60, 70, -20, -40, -60][k], [20, 50, 80, 88, -10, -40, -70][k]),
                      {"crank": {"r": -B_CRANK[k]}})
    pose = merge(_crew(B_DX[k]), gun(elev, B_REC[k], 0.0, B_TILT[k], [0, 0, 0, 0, -8, -16, -20][k]), hands, {
        "unit": dict(squash(B_Q[k])),
        "claw": {"x": B_CLAW[k]},
        "bolt": {"hide": k >= 4},
        "bow_n": {"r": B_BOW[k]}, "bow_f": {"r": -B_BOW[k]},
        "torso": {"r": B_T[k]}, "head": {"r": B_H[k]},
        "thigh_r": {"r": [14, 4, 0, 2, -10, -4, 0][k]}, "thigh_l": {"r": [-14, -4, 0, -2, 10, 4, 0][k]},
        "dust": {"show": k in (5, 6), "s": 0.8 if k == 5 else 1.1, "x": -30.0},
    })
    if k == 1:
        pose = merge(pose, F.expr("grit"))
    elif k in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}, "pupils": {"x": 0.5}})
    elif k == 4:
        pose = merge(pose, F.expr("squeeze", "yell"))
    else:
        pose = merge(pose, F.expr("o"))
    return pose


def _b_pose(u):
    if u == 0:
        return _attack_u(0)
    if u >= 8:
        return _attack_u(u)
    if u == 4:
        return _jiggle(_b_frame(3))
    return _b_frame(u if u < 4 else u - 1)


def _attack_b():
    tipn = (TIPS["n"][0], TIPS["n"][1], TIPS["n"][2])
    bow = {"kind": "arc", "joint": "bow_n", "inner": (HOUSING_X - 6.0, -14.0, TRUN[2] - 3.0), "outer": tipn,
           "color": B.SAND_LT, "white": 0.3, "taper": 0.2, "lines": 2}
    ov = {
        1: [{"kind": "arc", "joint": "crank", "inner": (WINCH[0], -9.0, WINCH[2]),
             "outer": (WINCH[0] + CRANK_R, -9.0, WINCH[2]), "from": 0, "color": B.SAND_LT, "white": 0.3,
             "taper": 0.3, "band": 0.4, "lines": 1}],
        5: [dict(bow, **{"from": 3, "t1": 1.0}),
            {"kind": "streak", "joint": "frame", "point": (STRING_REST + BOLT_LEN + 8.0, -0.5, SZ + 0.9),
             "from": 3, "color": B.SAND_LT, "width_lu": 4.0, "white": 0.3},
            {"kind": "burst", "joint": "frame", "point": (HOUSING_X + 6.0, 0, TRUN[2] + 3.0), "r0_lu": 8.0,
             "r1_lu": 15.0, "n": 5, "a0": -60.0, "arc": 120.0}],
        6: [{"kind": "dust", "ground": (-50.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 51, "spread": 1.0}],
    }
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(u) for u in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    a = M.HIT_AMT[k]
    b = [0.0, 1.0, -0.6, 0.3, 0.0][k]
    pose = merge(_crew(-2.0 * max(a, 0)), gun(IDLE_ELEV + 5 * a, recoil=3.0 * a, hop=1.5 * b, tilt=3.0 * a),
                 crank_hands(-30.0, crew_dx=-2.0 * max(a, 0)), {
        "unit": dict(squash([-0.08, 0.04, -0.03, 0.02, 0.0][k])),
        "hips": {"z": -3.0 * max(a, 0)}, "torso": {"r": -14 * max(a, 0) + 6 * min(a, 0)},
        "head": {"r": 12 * max(a, 0)},
    })
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


# death: 8 unique poses, 12 steps (about 0.95 s). 0 struck (the frame kicks up), 1 the crewman
# is knocked back into the air, 2 falling, 3 he lands flat on his back (contact), 4 a small
# bounce, 5 settled, the near wheel off; 6 slump, 7 hand-off (the dust poof covers it)
DIE_SEQ = [0, 1, 2, 3, 4, 5, 5, 6, 6, 7, 7, 7]
DIE_MS = [60, 70, 70, 60, 70, 80, 80, 90, 90, 100, 100, 100]


def _die(f):
    crew_r = pick(f, [12, 38, 66, 90, 86, 90, 90, 90])
    crew_z = pick(f, [3, 9, 7, 1.5, 4.5, 1.5, 1.5, 1.5])      # lying on his back: the torso's thickness
    crew_x = pick(f, [-2, -5, -7, -8, -8.5, -9, -9, -9])
    pose = merge(_crew(), gun(IDLE_ELEV + pick(f, [14, 22, 26, 26, 24, 25, 25, 25]),
                              tilt=pick(f, [6, 8, 7, 4, 5, 4, 4, 4]), spin=pick(f, [-20, -30, -40, -45, -45, -45, -45, -45]),
                              hop=pick(f, [2, 3, 1, 0, 0.5, 0, 0, 0])), {
        "unit": {"x": pick(f, [-2, -4, -5, -6, -6, -6, -6, -6]), "s": pick(f, [1, 1, 1, 1, 1, 1, 1, 0.94])},
        "wheel_r": {"x": pick(f, [0, -2, -4, -6, -7, -8, -8, -8]), "y": pick(f, [0, -2, -3, -4, -4, -4, -4, -4]),
                    "z": pick(f, [0, 0, -2, -4, -5, -6, -6, -6]), "rx": pick(f, [0, 12, 26, 40, 50, 56, 58, 58])},
        "crew": {"y": CREW_Y, "x": CREW_X + crew_x, "r": crew_r, "z": crew_z},
        "arm_r": {"r": pick(f, [110, 150, 170, 150, 160, 150, 150, 150])},
        "arm_l": {"r": pick(f, [140, 170, 190, 170, 176, 170, 170, 170])},
        "thigh_r": {"r": pick(f, [25, 40, 30, 10, 20, 12, 12, 12])},
        "thigh_l": {"r": pick(f, [-10, 10, 20, 4, 12, 6, 6, 6])},
        "shin_r": {"r": pick(f, [0, -30, -20, -4, -12, -6, -6, -6])},
        "head": {"r": pick(f, [10, 14, 6, -6, 4, -4, -4, -4])},
        "bolt": {"hide": f >= 1},
        "dust": {"show": f in (3, 4, 5), "s": pick(f, [1, 1, 1, 0.9, 1.2, 1.4, 1, 1]),
                 "x": -58.0, "z": pick(f, [0, 0, 0, 0, 2, 3, 0, 0])},
    })
    if f == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif f < 3:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def _die_extra():
    total = sum(DIE_MS)
    handoff = sum(DIE_MS[:len(DIE_MS) - 2])
    h = HEIGHT_LU
    return {"fx": [{"id": "fx.dust_poof", "atMs": handoff - 40, "offsetLu": [0, round(h * 0.36, 1)]},
                   {"id": "fx.ko_stars", "atMs": handoff + 40, "offsetLu": [0, round(h * 0.55, 1)],
                    "loops": 2, "scalePow": 0.5}],
            "hideUnitAtMs": total}


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "wheeled"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        Clip("die", 8, _die, sequence=DIE_SEQ, durations=DIE_MS, extra=_die_extra()),
    ]
    M.check_contract([c for c in cl if c.name not in ("die",)], attack_ms=883, attack_impact_at=0.4156)
    assert cl[-1].total_ms() == 970
    return M.check_variants(cl)
