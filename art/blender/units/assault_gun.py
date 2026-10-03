"""Assault Gun: Modern Age common Heavy, Gunner (CONTENT_PLAN 5.6). Shell (proj.shell), 90 lu, splash r30, armored mech, ~80 lu.

Look (A11 vehicle rig, Modern palette): a low, squat, turretless assault gun: an olive hull on a long rubber
track (scrolling grousers, spinning road wheels, sprocket and idler, caked mud), a wide sloped casemate built
on top with team side armour (a cream chevron, rivets) and a team hatch rim, a long gun with a big round
mantlet and a muzzle brake poking straight out of the casemate front, spare track links on the glacis,
hazard stripes, tools on the fender, a rear exhaust. The commander peeks out of the roof hatch in a
leather tank cap and goggles; a team pennant on a whip antenna (the heavies' pennant cue, A11).

"A viewer expects the whole low hull to recoil on its tracks when it fires (no turret to turn), dust rings,
and a squat tracked roll."

Animation (ANIM_SPEC G6 tracked, appendix B vehicles):
  idle      the engine shivers the hull, exhaust puffs, the commander peeks out, looks round and blinks
  walk      roll: the track scrolls exactly 2 grouser spacings per 512 ms cycle at the ground speed (45 x
            1.25 = 56.25 lu/s), the hull heaves on its suspension, the commander bobs a beat late, the
            antenna whips, the exhaust puffs, dust from the rear of the track
  attack    HULL RECOIL: the commander ducks and the lid clanks shut, the hull squats nose-down (the held
            extreme, holdLoop), BOOM: the gun slams back and the whole hull rocks back on its tracks, a
            dust ring rolls out, it settles and the commander pops up
  attack_b  SLEW AND QUICK SHOT: the whole hull slews toward the camera on its tracks with the gun raised
            (the held extreme, holdLoop), a quick snap shot, the hull rocks side to side
  hit       vehicle: a suspension bounce, the commander ducks with his eyes squeezed, the pennant whips
  die       D7 wreck and bail: struck, it hops, lands tilted on a snapped track with the gun drooping and
            black smoke; the commander leaps out of the hatch and runs
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_modern as KM
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "assault_gun"
GAIT_NAME = "tracked"
NAME = "Assault Gun"
HEIGHT_LU = 82
YAW_DEG = -10.0
CANVAS = (470, 300)
FEET = (200, 272)
ANCHORS = {"head": (0, 74), "hitCenter": (0, 30)}
NO_RETIME = True

TR_R = 10.5                  # track end radius
TX0, TX1 = -36.0, 36.0       # track end centres
TY = -15.0                   # near track depth
TW = 9.0
PITCH = 12.5                 # grouser pitch: walk moves 3.125 lu/step = PITCH / 4
STEP_LU = PITCH / 4          # one grouser phase copy per walk step (2 spacings per 8-step cycle)
# the scaled track moves STEP_LU x SCALE = 3.59 lu per step; at the ground speed 45 x 1.25 = 56.25 lu/s
# a step lasts 64 ms (cycle 512 ms)
WALK_MS = [64, 64, 64, 64, 64, 64, 64, 64]
WHEELS = (-36.0, -18.0, 0.0, 18.0, 36.0)
TURRET = (-2.0, 0.0, 36.0)
BARREL_Z = 41.0
MUZZLE = (62.0, -1.0, BARREL_Z)
SCALE = 1.15                 # the whole vehicle, so the Heavy reads big next to 68 lu infantry
CMDR = (-12.0, 0.0, 47.5)     # commander's waist in the hatch (character space)
_W = {}


def build(rig):
    rig.joint("body", "root", (0, 0, 0), scale=SCALE)
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, 16.0))
    # far track (static belt, mostly hidden)
    g = Geo().blob((0, 14.0, TR_R), (TX1 + TR_R, 4.0, TR_R), p=3.2)
    rig.part("hull", g, R.RUBBER, finish="gloss")

    # hull: rounded box with a sloped glacis and a rear deck
    hull = Geo().blob((-1.0, 0, 26.0), (43.0, 15.5, 9.5), p=3.4, taper=(1.0, 0.94), shift=(0.05, 0))
    hull.blob((36.0, 0, 25.0), (10.0, 15.0, 8.0), p=2.6, rot=(0, 28, 0))
    hface = F.Face(rig, "hull", [hull])
    rig.part("hull", hull, R.OLIVE)
    g = Geo()   # panel line along the glacis, rivets along the deck edge
    hface.stroke(g, hface.hit(22.0, 33.0), [(-4.0, 1.4), (8.0, -3.6)], 0.8, 0.4)
    rig.part("hull", g, "#4E5238", highlight=False, outline=0)
    g = Geo()
    for x in range(-32, 22, 6):
        g.sphere((x, -14.6, 34.6), 0.8, cuts=2)
    rig.part("hull", g, R.OLIVE_LT, finish="metal", outline=0)
    g = Geo()   # headlights (cream glass, gunmetal hoods) and a vision slit
    for y in (-11.0, 9.0):
        g.blob((42.0, y, 31.0), (2.2, 2.6, 2.4), p=2.4)
    rig.part("hull", g, "#FFF3C8", finish="gloss", outline=0.8, outline_hex=R.GUNMETAL)
    g = Geo().blob((24.0, -5.0, 36.4), (6.0, 4.0, 1.2), p=3.2)
    rig.part("hull", g, R.GUNMETAL, finish="metal", outline=0.6)
    g = Geo()   # rear exhaust pipe and a spare road wheel on the back
    g.capsule((-42.0, -9.0, 30.0), (-48.0, -9.0, 30.0), 2.3)
    rig.part("hull", g, R.GUNMETAL, finish="metal", outline=0.7)
    g = Geo().lathe([(0, -1.6), (5.4, -1.6), (5.4, 1.6), (0, 1.6)], (-44.5, 0.0, 26.0), (-46.0, 0.0, 26.0), segs=18)
    rig.part("hull", g, R.RUBBER, finish="gloss", outline=0.6)
    g = Geo().lathe([(0, -0.8), (3.0, -0.8), (3.0, 0.8), (0, 0.8)], (-46.0, 0.0, 26.0), (-47.4, 0.0, 26.0), segs=14)
    rig.part("hull", g, R.OLIVE_LT, finish="gloss", outline=0.4)
    # team side skirt with rivets, a cream chevron and hazard stripes at the rear
    skirt = Geo().blob((0.0, TY - 3.2, 22.0), (44.0, 1.8, 6.0), p=3.6)
    sface = F.Face(rig, "hull", [skirt])
    rig.part("hull", skirt, team=True)
    g = KM.chevron(sface, Geo(), (5.0, 22.4), s=1.0, n=2, w=1.8, gap=2.8)
    rig.part("hull", g, KM.CREAM, highlight=False, outline=0)
    g = KM.stripes(sface, Geo(), (-35.0, 22.0), 12.0, 8.0, n=4, slant=0.6)
    rig.part("hull", g, KM.STRIPE_DK, highlight=False, outline=0)
    g = Geo()
    for x in range(-38, 42, 8):
        g.sphere((x, TY - 5.2, 25.6), 0.9, cuts=2)
    rig.part("hull", g, R.OLIVE_LT, finish="metal", outline=0)
    # tools strapped on the fender: a shovel and a pick handle with leather straps
    g = Geo().capsule((-22.0, TY - 2.0, 30.2), (4.0, TY - 2.0, 30.2), 0.9)
    g.capsule((8.0, TY - 2.0, 31.2), (22.0, TY - 2.0, 31.2), 0.9)
    rig.part("hull", g, R.WOOD, outline=0.4)
    g = Geo().blob((7.0, TY - 2.2, 30.2), (3.2, 0.8, 2.2), p=2.4)
    g.blob((-24.0, TY - 2.2, 30.4), (1.0, 0.8, 3.2), p=2.4)
    rig.part("hull", g, R.STEEL, finish="metal", outline=0.4)
    g = Geo()
    for x in (-14.0, 15.0):
        g.blob((x, TY - 2.4, 30.8), (0.9, 0.9, 1.8), p=3.0)
    rig.part("hull", g, R.LEATHER, outline=0)

    # near track: belt, wheels, grousers (phase copies), mud on the lower run
    rig.joint("track", "body", (0, TY, 0))
    names, _ = R.tread(rig, "tn", "track", TX0, TX1, TR_R, TY, TW, PITCH, WHEELS, 4.6)
    _W["n"] = names
    g = Geo()
    for x, r in ((-18.0, 2.6), (6.0, 2.2), (22.0, 2.4)):
        g.blob((x, TY - 3.4, 3.0), (r * 1.6, 0.8, r), p=2.2)
    rig.part("track", g, KM.MUD, outline=0)

    # the casemate: a wide, sloped armoured box built on the hull (no turret); kept on the `turret` joint
    rig.joint("turret", "hull", TURRET)
    tx, ty, tz = TURRET
    g = Geo().blob((tx - 2.0, 0, tz + 5.0), (25.0, 14.6, 7.0), p=3.4, taper=(1.0, 0.82), shift=(0.10, 0))
    g.blob((tx + 20.0, 0, tz + 3.4), (8.0, 14.0, 6.0), p=2.6, rot=(0, 34, 0))       # sloped front plate
    g.clip((tx, 0, tz - 1.0), (0, 0, -1))
    rig.part("turret", g, R.OLIVE, finish="gloss")
    cheek = Geo().blob((tx - 2.0, -13.6, tz + 4.6), (21.0, 1.8, 5.2), p=3.2)
    cface = F.Face(rig, "turret", [cheek])
    rig.part("turret", cheek, team=True)
    g = KM.chevron(cface, Geo(), (tx - 6.0, tz + 4.6), s=0.9, n=2, w=1.8, gap=2.8)
    rig.part("turret", g, KM.CREAM, highlight=False, outline=0)
    g = Geo()
    for x in range(-20, 18, 6):
        g.sphere((tx + x, -15.0, tz + 9.2), 0.8, cuts=2)
    rig.part("turret", g, R.OLIVE_LT, finish="metal", outline=0)
    g = Geo()   # spare track links on the glacis
    for k in range(3):
        g.blob((32.0 + 3.0 * k, -6.0 + 0.0 * k, 33.0 - 2.0 * k), (1.4, 5.4, 2.6), p=3.0, rot=(0, 30, 0))
    rig.part("hull", g, R.RUBBER, finish="gloss", outline=0.5)
    g = Geo().lathe([(7.4, 0), (7.6, 1.4), (7.2, 2.6)], (tx - 10.0, 0, tz + 11.0), (tx - 10.0, 0, tz + 13.4), segs=20)
    rig.part("turret", g, team=True, outline=0.5)                                    # team hatch rim
    g = Geo().blob((tx - 10.0, 0, tz + 11.6), (7.2, 7.2, 1.2), p=2.6)
    rig.part("turret", g, R.GUNMETAL, finish="metal", outline=0.6)
    # the hatch lid on its own joint (hinged at the back of the ring)
    rig.joint("lid", "turret", (tx - 17.0, 0, tz + 12.4))
    g = Geo().blob((tx - 18.4, 0.5, tz + 18.4), (1.3, 7.0, 6.0), p=2.6)
    rig.part("lid", g, R.OLIVE_LT)
    g = Geo().capsule((tx - 19.6, -3.0, tz + 18.4), (tx - 19.6, 3.0, tz + 18.4), 0.7)
    rig.part("lid", g, R.GUNMETAL, finish="metal", outline=0.3)
    # the gun: mantlet, barrel on its own joint for the recoil slide
    g = Geo().blob((tx + 25.0, -1.0, BARREL_Z), (4.2, 6.4, 6.0), p=2.2)                 # round mantlet
    rig.part("turret", g, R.OLIVE_LT)
    rig.joint("barrel", "turret", (tx + 25.0, -1.0, BARREL_Z))
    g = Geo().capsule((tx + 25.0, -1.0, BARREL_Z), (MUZZLE[0] - 4.0, -1.0, BARREL_Z), 2.6, 2.3)
    rig.part("barrel", g, R.GUNMETAL, finish="metal")
    g = Geo().lathe([(3.6, 0), (4.3, 1.0), (4.3, 5.4), (3.4, 6.6), (1.7, 6.8)],
                    (MUZZLE[0] - 6.5, -1.0, BARREL_Z), (MUZZLE[0] + 1.0, -1.0, BARREL_Z), segs=18)
    rig.part("barrel", g, R.GUNMETAL, finish="metal")
    g = Geo().lathe([(3.3, -0.9), (3.5, 0), (3.3, 0.9)], (MUZZLE[0] - 10.0, -1.0, BARREL_Z),
                    (MUZZLE[0] - 9.0, -1.0, BARREL_Z), segs=16)
    rig.part("barrel", g, R.SIGNAL, outline=0.4)
    g = Geo().lathe([(0, -0.2), (1.8, -0.2), (1.8, 0.4), (0, 0.4)], (MUZZLE[0] + 1.1, -1.0, BARREL_Z),
                    (MUZZLE[0] + 2.0, -1.0, BARREL_Z), segs=12)
    rig.part("barrel", g, "#1E1C1C", outline=0)
    rig.track("muzzle", "barrel", MUZZLE)
    R.muzzle_flash(rig, "barrel", (MUZZLE[0] + 1, -1.0, BARREL_Z), size=2.6)

    # commander in the hatch: a team jacket, a waving arm, a round head with the face kit, a
    # leather tank cap with ear flaps and goggles; legs (hidden) for the bail-out
    cx, cy, cz = CMDR
    rig.joint("cmdr", "turret", CMDR, scale=1.2)
    g = Geo().blob((cx, 0, cz + 3.4), (6.6, 6.8, 5.4), p=2.4)   # shoulders
    rig.part("cmdr", g, team=True)
    g = Geo().lathe([(4.2, 0), (4.6, 1.4), (4.0, 2.4)], (cx + 0.6, 0, cz + 7.6), (cx + 0.6, 0, cz + 9.6), segs=14)
    rig.part("cmdr", g, R.KHAKI, outline=0.4)                   # collar
    hc = (cx + 1.0, 0.0, cz + 13.0)
    KM.crew_head(rig, "c_head", "cmdr", hc, k=1.0, brow=R.HAIR)
    g = Geo().blob((hc[0] - 0.6, 0, hc[2] + 3.4), (8.4, 8.0, 5.8), p=2.3)   # leather cap
    g.clip((hc[0], 0, hc[2] + 0.6), (0, 0, -1))
    g.blob((hc[0] - 1.8, -7.4, hc[2] - 0.6), (3.0, 1.4, 4.2), p=2.3)
    g.blob((hc[0] - 1.8, 7.4, hc[2] - 0.6), (3.0, 1.4, 4.2), p=2.3)
    g.blob((hc[0] - 0.6, 0, hc[2] + 7.2), (4.8, 1.2, 1.6), p=2.4)          # padded ridge
    rig.part("c_head", g, R.LEATHER)
    g = Geo()   # goggles on the cap
    for y in (-3.4, 3.0):
        g.lathe([(0, 0), (2.3, 0.2), (2.4, 1.6), (0, 1.8)], (hc[0] + 5.6, y, hc[2] + 5.0), (hc[0] + 7.4, y, hc[2] + 5.8),
                segs=12)
    rig.part("c_head", g, R.GUNMETAL, finish="metal", outline=0.5)
    g = Geo()
    for y in (-3.4, 3.0):
        g.blob((hc[0] + 7.3, y, hc[2] + 5.7), (0.6, 1.7, 1.7), p=2.2)
    rig.part("c_head", g, R.GLASS, finish="gloss", outline=0)
    # the waving arm (near side): joint at the shoulder, modelled pointing up
    rig.joint("c_arm", "cmdr", (cx + 1.0, -6.4, cz + 5.6))
    g = Geo().capsule((cx + 1.0, -6.4, cz + 5.6), (cx + 1.6, -7.0, cz + 13.0), 2.1, 1.9)
    rig.part("c_arm", g, team=True, outline=0.5)
    g = Geo().blob((cx + 1.8, -7.2, cz + 14.8), (2.6, 2.0, 2.6), p=2.3)
    rig.part("c_arm", g, R.LEATHER, outline=0.5)                         # glove
    # the bail-out: a standalone copy of the commander with legs (root level, hidden)
    KM.crew_runner(rig, "bail", "root", (0.0, -18.0, 0.0), k=1.25)

    # antenna with a team pennant at the back of the turret
    R.pennant(rig, "turret", (tx - 20.0, 7.0, tz + 10.0), 38.0, length=17.0, w=9.0)

    # exhaust puff, gun smoke (left in place: parented to the root), wreck smoke and a snapped track
    R.smoke_puff(rig, "hull", (-52.0, -9.0, 32.0), size=0.75, name="exhaust", color=R.SMOKE_DK)
    rig.joint("smoke", "root", (MUZZLE[0] + 12, -12, BARREL_Z + 16), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 7.4), (8, 3, 6.0), (-5, 6, 5.2), (4, 9, 4.8), (13, -2, 4.4), (-9, -1, 4.2)):
        g.sphere((MUZZLE[0] + 12 + dx, -12, BARREL_Z + 16 + dz), r, cuts=4)
    rig.part("smoke", g, R.SMOKE, finish="dust", outline=0.8)
    R.smoke_puff(rig, "hull", (-10.0, -4.0, 56.0), size=1.4, name="wreck", color="#6E6A66")
    rig.joint("snap", "track", (TX0 - 6.0, TY, 2.0), hidden=True)
    g = Geo()
    for k in range(4):
        g.capsule((TX0 - 6.0 - 4.0 * k, TY - 0.5, 1.6 + 0.4 * k), (TX0 - 10.0 - 4.0 * k, TY - 0.5, 1.6 + 0.4 * k), 1.8)
    rig.part("snap", g, R.RUBBER, finish="gloss", outline=0.5)
    rig.track("_foot", "odo", (0, 0, 0))


# -- poses ------------------------------------------------------------------------------------------
def _tracks(step, moving=True):
    return R.tread_pose("tn", _W["n"], step, STEP_LU if moving else 0.0, PITCH)


def c_arm(r):
    """The commander's near arm, r degrees from pointing up (positive = back)."""
    return {"c_arm": {"r": r}}


REST_ARM = 150.0      # arm down at his side (hidden in the hatch)


def _idle(f):
    # 0-1 down in the hatch, 2-4 pops up and looks round (blink on 4), 5 settles
    up = [0.0, 0.3, 1.0, 1.0, 0.8, 0.3][f]
    t = f / 6 * 2 * math.pi
    pose = merge(_tracks(0, False), c_arm(REST_ARM - 20 * up), {
        "hull": dict(squash(0.012 * math.cos(2 * t)), z=0.45 * math.cos(2 * t)),
        "cmdr": {"z": -6.0 + 6.0 * up, "r": [0, 0, 4, -3, -4, 0][f]},
        "c_head": {"rz": [0, 0, 8, -10, -6, 0][f], "r": [0, 0, 4, -3, 2, 0][f]},
        "turret": {"r": 0.5 * math.sin(t)},
        "exhaust": {"show": f in (1, 4), "s": [1, 0.8, 1, 1, 0.9, 1][f], "z": [0, 0, 0, 0, 2, 0][f]},
    })
    if f == 4:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    bump = -abs(math.sin(p))
    lag = -abs(math.sin(p - 0.8))
    return merge(_tracks(f), c_arm(REST_ARM - 10 + 12 * lag), {
        "odo": {"x": 2.0 * STEP_LU * SCALE * math.cos(p)},   # ground speed of the scaled track
        "hull": dict(squash(0.03 * math.cos(2 * p)), z=2.6 * bump + 1.3, r=1.5 * math.sin(p)),
        "turret": {"r": -0.8 * math.sin(p - 0.6)},
        "cmdr": {"r": -4.0 * math.sin(p - 0.8), "z": 1.4 * lag + 0.7},
        "c_head": {"r": 3.0 * math.sin(p - 1.2)},
        "exhaust": {"show": f % 4 in (1, 2), "s": [1, 0.8, 1.15, 1][f % 4], "x": [0, -1.0, -5.0, 0][f % 4],
                    "z": [0, 0, 2.5, 0][f % 4]},
    })


def _walk_clip():
    # dust kicked up behind the rear of the track, a fresh little cloud every other step
    ov = {f: [{"kind": "dust", "ground": (-48.0 - 4.0 * (f % 4), 0.0), "size_lu": 4.5 + 1.2 * (f % 4), "puffs": 3,
               "seed": 60 + f, "spread": 1.0, "dir": -1.0}] for f in range(8)}
    return M.clip("walk", [_walk(f) for f in range(8)], WALK_MS, loop=True, overlays=ov)


# 11 unique frames in 790 ms; fire on frame 4 at 291 ms (impactAt 0.3684, as shipped). The shipped
# 191 ms squat is split into the hold (130) and a wobble partner (61) for the holdLoop.
ATTACK_MS = [40, 60, 130, 61, 60, 80, 70, 70, 70, 75, 74]
ATTACK_IMPACT = 4
U_OF = [0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9]     # unique frame -> row of the pose tables below
#       duck squat HOLD  BOOM  hop   land  bounce wave  roll  settle
BX = [0.0, 0.5, 1.0, -2.5, -8.0, -10.0, -9.0, -6.0, -3.0, -1.0]
BZ = [0.0, -0.5, -1.0, 2.5, 7.0, 0.0, 2.2, 0.0, 0.0, 0.0]
BQ = [0.0, -0.04, -0.07, 0.05, 0.06, -0.12, 0.04, -0.03, 0.01, 0.0]
HR = [0.0, -1.5, -2.5, 4.0, 7.0, 1.0, 3.0, -1.0, 0.5, 0.0]      # hull pitch (nose up = +)
TUR = [1.0, 2.0, 2.0, 4.0, 3.0, 0.0, 1.0, 0.5, 0.0, 0.0]
BAR = [0.0, 0.0, 0.0, -7.5, -6.0, -2.5, -0.5, 0.0, 0.0, 0.0]
CZ = [-4.0, -10.0, -14.0, -14.0, -14.0, -12.0, 0.5, 2.0, 1.0, 0.0]   # the commander ducks, then pops up
LID = [-30.0, -80.0, -95.0, -95.0, -90.0, -70.0, 20.0, 10.0, 4.0, 0.0]
ARM = [160.0, 170.0, 170.0, 170.0, 170.0, 170.0, 20.0, -25.0, 15.0, 90.0]


def _attack_pose(i):
    wob = i == 3
    f = U_OF[i]
    pose = merge(_tracks(0, False), c_arm(ARM[f]), {
        "body": dict(squash(BQ[f] + (0.02 if wob else 0.0)), x=BX[f], z=BZ[f] + (0.4 if wob else 0.0)),
        "hull": {"r": HR[f] + (0.6 if wob else 0.0)},
        "turret": {"r": TUR[f] + (0.5 if wob else 0.0)},
        "barrel": {"x": BAR[f], "r": [2, 3, 3, 4, 5, 2, 1, 0, 0, 0][f],
                   "sz": [1, 1, 1, 1.15, 1.05, 1, 1, 1, 1, 1][f]},
        "cmdr": {"z": CZ[f], "r": [0, -4, -6, 8, 6, 4, -4, 3, 0, 0][f]},
        "lid": {"r": LID[f]},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5, 6), "s": [1, 1, 1, 1, 0.8, 1.1, 1.3, 1, 1, 1][f],
                  "x": [0, 0, 0, 0, -6, 0, 4, 0, 0, 0][f], "z": [0, 0, 0, 0, -8, 0, 5, 0, 0, 0][f]},
        "exhaust": {"show": f in (4, 5)},
    })
    # the wheels spin back as the hull skids back on landing
    for name, wr in _W["n"]:
        pose.setdefault(name, {})["r"] = pose.get(name, {}).get("r", 0.0) + \
            math.degrees([0, 0, 0, 0, 0, 3.0, 5.0, 5.0, 4.0, 3.0][f] / wr)
    if f in (1, 2, 3, 4):
        pose = merge(pose, F.expr("squeeze", "grit"))
    elif f in (6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("o"))
    return pose


def _attack_clip():
    ov = {
        4: [{"kind": "burst", "joint": "barrel", "point": (MUZZLE[0] + 4.0, -1.0, BARREL_Z), "r0_lu": 10.0,
             "r1_lu": 17.0, "n": 6, "a0": -70.0, "arc": 140.0}],
        6: [{"kind": "dust", "ground": (-28.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 61, "spread": 1.1,
             "dir": -1.0},
            {"kind": "dust", "ground": (26.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 62, "spread": 1.0,
             "dir": 1.0}],
        7: [{"kind": "burst", "joint": "c_arm", "point": (CMDR[0] + 1.8, -7.2, CMDR[2] + 15.0), "r0_lu": 4.0,
             "r1_lu": 7.0, "n": 4, "a0": 30.0, "arc": 120.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 2, "holdLoop": [2, 3]})


# -- attack B: turret traverse and quick shot (ANIM_SPEC appendix B) --------------------------------
# unique frames: 0 = A duck, 1 traverse (the turret swings toward the camera), 2 HOLD (swung round,
# the barrel cocked up, the lid half shut), 3 wobble (holdLoop), 4 FIRE (a quick snap shot), 5 rock
# (the hull rolls away on its springs), 6 rock back, 7 the turret swings home, 8 settle,
# 9-10 = A settle. Turret yaw `rz` (negative = toward the camera), hull roll `rx`.
#        trav  HOLD  wob   FIRE  rock  back  home  settle
B_TRZ = [-14.0, -30.0, -30.0, -30.0, -28.0, -24.0, -10.0, -2.0]
B_BAR = [4.0, 9.0, 9.6, 9.0, 12.0, 8.0, 4.0, 1.0]
B_REC = [0.0, 0.0, 0.0, -5.0, -3.0, -1.0, 0.0, 0.0]
B_RX = [0.0, -1.0, -1.0, 4.0, 7.0, -4.0, 2.0, -0.5]
B_HR = [0.0, -0.8, -0.6, 2.0, 1.0, -0.8, 0.4, 0.0]
B_Q = [0.0, -0.02, -0.02, 0.04, -0.05, 0.03, -0.01, 0.0]
B_CZ = [-10.0, -13.0, -13.0, -13.0, -11.0, -6.0, 0.0, 1.0]
B_LID = [-70.0, -85.0, -85.0, -85.0, -70.0, -40.0, 10.0, 4.0]
B_ARM = [170.0, 170.0, 170.0, 170.0, 170.0, 120.0, -20.0, 40.0]


def _b_pose(i):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    pose = merge(_tracks(0, False), c_arm(B_ARM[k]), {
        "body": dict(squash(B_Q[k]), rx=B_RX[k], rz=0.5 * B_TRZ[k]),
        "hull": {"r": B_HR[k]},
        "turret": {"r": 0.5 if k == 2 else 0.0},
        "barrel": {"x": B_REC[k], "r": B_BAR[k], "sz": 1.12 if k == 3 else 1.0},
        "cmdr": {"z": B_CZ[k], "r": [0, -4, -4, 6, 4, -2, 2, 0][k]},
        "lid": {"r": B_LID[k]},
        "flash": {"show": k == 3, "s": 0.85 if k == 3 else 1.0},
        "smoke": {"show": k in (4, 5), "s": [1, 1, 1, 1, 0.7, 0.95, 1, 1][k], "x": [0, 0, 0, 0, -8, -4, 0, 0][k],
                  "z": [0, 0, 0, 0, -4, 4, 0, 0][k]},
        "exhaust": {"show": k in (4, 5)},
    })
    if k in (1, 2, 3):
        pose = merge(pose, F.expr("squeeze", "grit"))
    elif k in (6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 1.0}})
    return pose


def _attack_b():
    ov = {
        4: [{"kind": "burst", "joint": "barrel", "point": (MUZZLE[0] + 4.0, -1.0, BARREL_Z), "r0_lu": 8.0,
             "r1_lu": 14.0, "n": 5, "a0": -60.0, "arc": 130.0}],
        5: [{"kind": "dust", "ground": (-24.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 63, "spread": 0.9,
             "dir": -1.0}],
        6: [{"kind": "dust", "ground": (24.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 64, "spread": 0.9,
             "dir": 1.0}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 2, "holdLoop": [2, 3]})


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_tracks(0, False), c_arm(REST_ARM), {
        "body": dict(squash([-0.08, -0.05, 0.03, -0.02, 0.0][k]), x=-4.0 * max(a, 0) + 1.2 * min(a, 0)),
        "hull": {"r": 4.0 * a},
        "cmdr": {"z": -5.0 * max(a, 0), "r": 12 * a},
        "turret": {"r": 2 * a},
        "lid": {"r": [-20, -40, -10, 6, 0][k]},
    })
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


#        struck  hop   land  tilt  smoke  poof...
D_BX = [-3.0, -6.0, -7.0, -7.0, -7.0, -7.0, -7.0, -7.0, -7.0, -7.0]
D_BZ = [2.0, 7.0, 0.0, 1.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
D_HR = [6.0, 9.0, -6.0, -8.0, -7.0, -7.0, -7.0, -7.0, -7.0, -7.0]
D_Q = [0.06, 0.04, -0.12, 0.04, -0.04, 0.0, 0.0, 0.0, -0.02, -0.04]
# the bail-out figure (root space, feet on the ground): leaps from the hatch, lands behind, runs
B_PATH = [None, None, None, (-8, 58, 20), (-26, 66, 40), (-46, 36, 25), (-62, 0, 0), (-68, 0, 4),
          (-74, 1.5, 0), (-80, 0, 4)]
B_RUN = [0, 0, 0, 0.9, 1.0, 0.6, -0.6, 0.8, -0.8, 0.8]
B_ARM = [0, 0, 0, 10, -10, 30, 120, 40, 130, 40]


def _die(k):
    pose = merge(_tracks(0, False), {
        "body": dict(squash(D_Q[k]), x=D_BX[k], z=D_BZ[k]),
        "hull": {"r": D_HR[k]},
        "turret": {"r": [4, 14, 22, 20, 20, 20, 20, 20, 20, 20][k], "x": [0, -1, -3, -3, -3, -3, -3, -3, -3, -3][k],
                   "z": [1, 4, 2, 2, 2, 2, 2, 2, 2, 2][k]},
        "barrel": {"r": [-4, -10, -22, -24, -24, -24, -24, -24, -24, -24][k]},
        "lid": {"r": [-10, 20, 60, 70, 70, 70, 70, 70, 70, 70][k]},
        "wreck": {"show": k >= 2, "s": [1, 1, 0.8, 1.0, 1.2, 1.35, 1.45, 1.5, 1.55, 1.6][k],
                  "z": [0, 0, 0, 2, 5, 8, 11, 13, 15, 16][k]},
        "snap": {"show": k >= 2},
        "exhaust": {"show": k in (0, 1), "s": 1.3},
    })
    bp = B_PATH[k]
    if bp is None:
        pose["cmdr"] = {"z": [0, 3, 7][k], "r": [0, -6, 6][k]}
        pose = merge(pose, c_arm([150, 60, 20][k]))
    else:
        x, z, r = bp
        pose["cmdr"] = {"hide": True}
        pose = merge(pose, {"bail": {"show": True, "x": x, "z": z, "r": r, "rz": 180.0 if k >= 5 else 0.0}},
                     KM.run_pose("bail", B_RUN[k], B_ARM[k]))
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 3:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 1.6}})
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        _walk_clip(),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=790, attack_impact_at=0.3684))
