"""Dive Bomber: Modern Age epic air bomber (CONTENT_PLAN 5.6). Bomb (proj.bomb), splash r40, never stops, ~46 lu.

Look (A11 flyer rig, Modern palette): a stubby, bent-winged cartoon dive bomber. A team-painted fuselage
with a cream chevron, an olive belly and wings, a fat radial cowling with a team ring and a three-blade
propeller that never stops (one blade phase over pale blur arcs), a long glass canopy with a goggled pilot
whose signal scarf streams behind, inverted gull wings with chunky fixed wheel spats, perforated dive
brakes under the wings, a team tail fin and a big round bomb slung under the belly. Flyers are authored
with the origin at their lowest point; the battle view lifts air units to their flight altitude.

"A viewer expects it to nose over into a whistling dive, let the bomb go and pull up, and otherwise to cruise
with a gentle bob."

Animation (ANIM_SPEC G8 fly, appendix B air):
  idle      cruising: a slow pitch and roll, the propeller spinning, the scarf and the pilot's head lagging
  walk      forward flight at the ground speed (80 x 1.25 = 100 lu/s): nose down 6 degrees, the propeller
            blur, the scarf streaming; the game adds the hover bob (R8)
  attack    WHISTLING DIVE: it noses over steeply with the dive brakes out (the held extreme, holdLoop),
            the bomb drops away from the belly, then it pulls up hard (a stretch) and levels off
  attack_b  SIDE-SLIP DROP: it rolls toward the camera so both wings show (the held extreme, holdLoop),
            lets the bomb go from the bank, the wings rock and it rolls level
  hit       flyer: a tilt and a 4 lu drop, the pilot's eyes squeezed, then a wobble back up
  die       D8 spiral down: smoke pours out, the propeller slows, it noses over and spins down with the
            pilot's spiral eyes, a crash bounce
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_modern as KM
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "dive_bomber"
GAIT_NAME = "fly"
NAME = "Dive Bomber"
HEIGHT_LU = 46
YAW_DEG = -10.0
CANVAS = (380, 300)
FEET = (190, 232)
ANCHORS = {"head": (0, 44), "hitCenter": (0, 22)}
NO_RETIME = True

FUS_Z = 22.0                 # fuselage axis height
NOSE_X = 34.0
PROP = (NOSE_X + 4.0, 0.0, FUS_Z)
PROP_R = 15.0
PHASES = 3                   # 3 blades: 120 degrees of symmetry in 3 steps of 40
BLUR = 3
BOMB = (2.0, 0.0, 9.0)
SCARF = "#B0306A"


def _prop_blade(g, ang):
    a = math.radians(ang)
    for k in range(3):
        b = a + 2 * math.pi * k / 3
        c = PROP_R * 0.55
        g.blob((PROP[0] + 0.6, PROP[1] + c * math.cos(b), PROP[2] + c * math.sin(b)), (0.8, 1.4 + 1.2 * abs(math.cos(b)),
               PROP_R * 0.45), p=2.6, rot=(math.degrees(b) - 90.0, 0, 0))


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("plane", "body", (0, 0, FUS_Z))
    # far wing (behind the fuselage), the far wheel spat
    g = Geo().blob((4.0, 22.0, FUS_Z - 7.0), (11.0, 22.0, 1.6), p=3.0, rot=(-12, 0, 0))
    rig.part("plane", g, R.OLIVE_LT, outline=0.6)
    g = Geo().blob((8.0, 12.0, 6.0), (6.4, 2.4, 4.6), p=2.4)
    g.capsule((8.0, 12.0, 9.0), (6.0, 12.0, 16.0), 1.4)
    rig.part("plane", g, R.OLIVE_LT, outline=0.6)
    # fuselage: team top, olive belly, a cream chevron
    fus = Geo().blob((0.0, 0, FUS_Z), (32.0, 8.6, 8.6), p=2.4, taper=(0.75, 1.0), shift=(-0.15, 0))
    fus.clip((0, 0, FUS_Z - 2.5), (0, 0, -1))
    fface = F.Face(rig, "plane", [fus])
    rig.part("plane", fus, team=True)
    g = KM.chevron(fface, Geo(), (-8.0, FUS_Z + 2.0), s=1.0, n=2, w=1.8, gap=2.8)
    rig.part("plane", g, KM.CREAM, highlight=False, outline=0)
    g = Geo().blob((0.0, 0, FUS_Z), (32.0, 8.6, 8.6), p=2.4, taper=(0.75, 1.0), shift=(-0.15, 0))
    g.clip((0, 0, FUS_Z - 2.5), (0, 0, 1))
    rig.part("plane", g, R.OLIVE)
    # cowling with a team ring and the spinner
    g = Geo().lathe([(0, 0), (9.4, 0.4), (10.0, 3.0), (9.6, 7.0), (8.4, 8.4)], (NOSE_X - 8.0, 0, FUS_Z),
                    (NOSE_X + 1.0, 0, FUS_Z), segs=22)
    rig.part("plane", g, R.OLIVE, finish="gloss")
    g = Geo().lathe([(10.1, -1.2), (10.4, 0), (10.1, 1.2)], (NOSE_X - 1.5, 0, FUS_Z), (NOSE_X + 0.5, 0, FUS_Z), segs=22)
    rig.part("plane", g, team=True, outline=0.5)
    g = Geo().lathe([(3.2, 0), (2.6, 2.4), (0, 4.2)], (NOSE_X + 1.0, 0, FUS_Z), (NOSE_X + 5.4, 0, FUS_Z), segs=16)
    rig.part("plane", g, R.SIGNAL, outline=0.5)
    g = Geo()
    for k in range(5):                                       # exhaust stubs
        g.capsule((NOSE_X - 8.5 + 2.0 * k, -8.4, FUS_Z - 2.0), (NOSE_X - 9.5 + 2.0 * k, -9.4, FUS_Z - 3.4), 0.7)
    rig.part("plane", g, R.GUNMETAL, finish="metal", outline=0.4)
    # canopy and pilot
    g = Geo().blob((-2.0, 0, FUS_Z + 8.0), (13.0, 5.6, 4.6), p=2.4)
    g.clip((0, 0, FUS_Z + 6.0), (0, 0, -1))
    rig.part("plane", g, R.GLASS, finish="gloss", outline=0.7, outline_hex="#6F8A94")
    g = Geo()
    for x in (-9.0, -2.0, 5.0):
        g.capsule((x, -5.2, FUS_Z + 6.4), (x - 1.0, -2.0, FUS_Z + 12.0), 0.5)
    rig.part("plane", g, R.GUNMETAL, finish="metal", outline=0)
    rig.joint("pilot", "plane", (2.0, 0, FUS_Z + 6.0))
    hc = (3.0, 0.0, FUS_Z + 10.0)
    KM.crew_head(rig, "p_head", "pilot", hc, k=0.7, brow=R.HAIR, brow_angry=False)
    g = Geo().blob((hc[0] - 0.4, 0, hc[2] + 2.4), (5.9, 5.6, 4.0), p=2.3)
    g.clip((hc[0], 0, hc[2] + 0.3), (0, 0, -1))
    rig.part("p_head", g, R.LEATHER)
    g = Geo()
    for y in (-2.8, 2.5):
        g.lathe([(0, 0), (2.0, 0.2), (2.1, 1.3), (0, 1.5)], (hc[0] + 4.4, y, hc[2] + 4.0), (hc[0] + 6.0, y, hc[2] + 4.5),
                segs=12)
    rig.part("p_head", g, R.GUNMETAL, finish="metal", outline=0.5)
    rig.secondary("scarf", "pilot", (-2.0, -2.0, FUS_Z + 9.0), (-15.0, -2.0, FUS_Z + 11.0), max_deg=24, gain=1.5)
    g = Geo().blob((-8.0, -2.0, FUS_Z + 9.6), (6.6, 1.2, 1.8), p=2.4, taper=(1.0, 0.8))
    g.blob((-14.5, -2.0, FUS_Z + 10.4), (2.4, 1.2, 2.4), p=2.2)
    rig.part("scarf", g, SCARF, outline=0.6)
    # tail: a team fin, an olive tailplane
    g = Geo().slab([(-24, FUS_Z + 4), (-33, FUS_Z + 5), (-38, FUS_Z + 18), (-31, FUS_Z + 19), (-26, FUS_Z + 9)], 0.0, 2.2)
    rig.part("plane", g, team=True, outline=0.8)
    g = Geo().blob((-31.0, 0, FUS_Z + 2.0), (6.0, 12.0, 1.2), p=2.6)
    rig.part("plane", g, R.OLIVE_LT, outline=0.7)
    # near gull wing (in front of the fuselage), dive brakes, the near wheel spat
    g = Geo().blob((4.0, -14.0, FUS_Z - 7.0), (11.0, 10.0, 1.8), p=3.0, rot=(18, 0, 0))
    g.blob((5.0, -30.0, FUS_Z - 4.0), (10.0, 10.0, 1.6), p=3.0, rot=(-8, 0, 0))
    rig.part("plane", g, R.OLIVE, outline=0.7)
    g = Geo().blob((5.0, -36.0, FUS_Z - 3.0), (4.0, 4.0, 1.7), p=3.0)
    rig.part("plane", g, team=True, outline=0.5)                              # team wing tip
    rig.joint("brake", "plane", (-2.0, -20.0, FUS_Z - 9.0))
    g = Geo().blob((-3.0, -22.0, FUS_Z - 9.4), (4.0, 9.0, 0.6), p=3.0)
    rig.part("brake", g, R.STEEL, finish="metal", outline=0.5)
    g = Geo().blob((8.0, -12.0, 6.0), (6.4, 2.6, 4.6), p=2.4)
    g.capsule((8.0, -12.0, 9.0), (6.0, -12.0, 16.0), 1.4)
    rig.part("plane", g, R.OLIVE, outline=0.6)
    g = Geo().blob((9.0, -12.6, 3.4), (2.6, 1.6, 2.6), p=2.2)
    rig.part("plane", g, R.RUBBER, outline=0.4)
    # the bomb under the belly
    rig.joint("bomb", "plane", BOMB)
    bx, by, bz = BOMB
    g = Geo().blob((bx, by, bz), (7.0, 3.6, 3.6), p=2.2)
    rig.part("bomb", g, "#3E4236", finish="gloss", outline=0.6)
    g = Geo()
    for dz in (-3.4, 3.4):
        g.blob((bx - 7.6, by, bz + dz * 0.7), (1.6, 0.4, 1.8), p=2.4)
    g.capsule((bx - 5.0, by, bz), (bx - 9.0, by, bz), 0.9)
    rig.part("bomb", g, R.GUNMETAL, finish="metal", outline=0.4)
    g = Geo().lathe([(3.65, -0.6), (3.75, 0), (3.65, 0.6)], (bx + 1.0, by, bz), (bx + 2.2, by, bz), segs=14)
    rig.part("bomb", g, KM.CREAM, outline=0.3)
    rig.track("muzzle", "plane", (bx + 6.0, by, bz - 2.0))   # just ahead of the bomb: shots leave in front (unitSheets test)
    # propeller: blades (phase copies) and pale blur arcs
    rig.joint("prop", "plane", PROP)
    for k in range(BLUR):
        name = f"blur{k}"
        rig.joint(name, "prop", PROP, hidden=True)
        g = Geo()
        for j in range(3):
            if j == k:
                continue
            a0 = math.radians(120 * j + 20 * k)
            pts = [(PROP[0] + 1.0, PROP_R * 0.9 * math.cos(a0 + t * 0.5), PROP[2] + PROP_R * 0.9 * math.sin(a0 + t * 0.5))
                   for t in range(4)]
            for a, b in zip(pts, pts[1:]):
                g.capsule(a, b, 1.3, segs=6, rings=2)
        rig.part(name, g, R.KHAKI_LT, highlight=False, outline=0)
    for k in range(PHASES):
        name = f"blade{k}"
        rig.joint(name, "prop", PROP, hidden=True)
        g = Geo()
        _prop_blade(g, 40.0 * k)
        rig.part(name, g, R.GUNMETAL, outline=0.6)
    rig.joint("smoke", "plane", (-6.0, -6.0, FUS_Z + 8.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 6.0), (-8, 3, 5.0), (-4, 9, 4.6), (5, 6, 4.2), (-14, 1, 4.0), (-20, 6, 3.4)):
        g.sphere((-6.0 + dx, -6.0, FUS_Z + 8.0 + dz), r, cuts=4)
    rig.part("smoke", g, R.SMOKE_DK, finish="dust", outline=0.8)
    rig.track("_foot", "odo", (0, 0, 0))


def _prop(step, slow=1, blur=True):
    pose = {f"blade{(step // slow) % PHASES}": {"show": True}}
    if blur:
        pose[f"blur{(step // slow) % BLUR}"] = {"show": True}
    return pose


def _body(x=0.0, z=0.0, r=0.0, rx=0.0, rz=0.0, q=0.0):
    return {"body": dict(M.body_about((0, 0, FUS_Z), x=x, z=z, r=r, rx=rx, rz=rz, q=q)["body"])}


def _idle(f):
    b = math.sin(2 * math.pi * f / 4)
    c = math.cos(2 * math.pi * f / 4)
    pose = merge(_prop(f), _body(z=1.6 * b, r=1.8 * c, rx=2.0 * b), {
        "p_head": {"r": 3.0 * math.sin(2 * math.pi * (f - 1) / 4)}})
    if f == 2:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    return merge(_prop(f), _body(z=1.0 * math.sin(p), r=-6.0 + 1.4 * math.sin(p + 1.0)), {
        "odo": {"x": 12.5 * math.cos(p)},     # stride 50 lu per 0.5 s = 100 lu/s (ground speed)
        "p_head": {"r": 2.5 * math.sin(p - 1.0)},
    })


# 9 unique frames in 760 ms; the bomb leaves on frame 4 at 360 ms (impactAt 0.4737)
ATTACK_MS = [60, 80, 160, 60, 60, 80, 80, 100, 80]
ATTACK_IMPACT = 4
#        lift  over  HOLD  wob   DROP  pull  climb level settle
A_R = [4.0, -14.0, -32.0, -33.0, -30.0, 6.0, 14.0, 4.0, 0.0]
A_Z = [2.0, 0.0, -4.0, -4.6, -5.0, 1.0, 4.0, 2.0, 0.0]
A_X = [-1.0, 1.0, 3.0, 3.2, 3.0, -1.0, -3.0, -1.0, 0.0]
A_Q = [0.02, -0.02, -0.04, -0.03, 0.04, 0.06, 0.03, 0.0, 0.0]


def _attack(i):
    pose = merge(_prop(i), _body(x=A_X[i], z=A_Z[i], r=A_R[i], q=A_Q[i]), {
        "brake": {"r": [0, 40, 70, 70, 70, 30, 0, 0, 0][i]},
        "bomb": {"hide": 4 <= i <= 7},
        "pilot": {"r": [0, -4, -6, -6, -4, 6, 8, 2, 0][i]},
    })
    if i in (1, 2, 3):
        pose = merge(pose, F.expr("squeeze", "grit"))
    elif i in (4, 5):
        pose = merge(pose, F.expr("yell"))
    return pose


def _ov(seed):
    return {4: [{"kind": "burst", "joint": "plane", "point": (BOMB[0], 0.0, BOMB[2] - 4.0), "r0_lu": 5.0, "r1_lu": 10.0,
                 "n": 5, "a0": 200.0, "arc": 140.0, "color": "#FFF4D6"}],
            5: [{"kind": "rings", "joint": "plane", "point": (NOSE_X - 4.0, 0.0, FUS_Z), "radii_lu": (12.0, 16.0),
                 "a0": 120.0, "a1": 240.0, "color": "#EFE8D6"}]}


def _attack_clip():
    return M.clip("attack", [_attack(i) for i in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(1),
                  extra={"holdStep": 2, "holdLoop": [2, 3]})


#        roll  HOLD  wob   DROP  rock  back  level       (B: side-slip drop; 0 and 8 = A's)
B_RX = [-18.0, -38.0, -40.0, -36.0, -14.0, -26.0, -8.0]
B_R = [-4.0, -8.0, -8.5, -6.0, 2.0, -2.0, 0.0]
B_Z = [0.0, -2.0, -2.4, -2.0, 1.0, 0.0, 0.5]


def _b_pose(i):
    if i in (0, 8):
        return _attack(i)
    k = i - 1
    pose = merge(_prop(i), _body(z=B_Z[k], r=B_R[k], rx=B_RX[k], q=[0, -0.02, -0.02, 0.04, 0.02, 0, 0][k]), {
        "bomb": {"hide": k >= 3}, "pilot": {"rx": [6, 10, 10, 8, 2, 4, 0][k]},
    })
    if k in (1, 2):
        pose = merge(pose, F.expr("squeeze", "grit"))
    elif k == 3:
        pose = merge(pose, F.expr("yell"))
    return pose


def _attack_b():
    return M.clip("attack_b", [_b_pose(i) for i in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(2),
                  reuse={0: ("attack", 0), 8: ("attack", 8)}, extra={"holdStep": 2, "holdLoop": [2, 3]})


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_prop(k), _body(x=-3.0 * max(a, 0), z=-4.0 * max(a, 0) + 1.5 * min(a, 0), r=10 * a,
                                 q=[-0.08, -0.04, 0.02, -0.01, 0][k]), {"pilot": {"r": 10 * a}, "p_head": {"r": 8 * a}})
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


D_R = [-8, -18, -30, -42, -55, -64, -58, -62, -62, -62]
D_RZ = [0, 10, -12, 14, -10, 6, 0, 0, 0, 0]
D_RX = [0, 20, -30, 40, -20, 10, 0, 0, 0, 0]
D_Z = [2, 0, -4, -10, -16, -20, -17, -20, -20, -20]
D_X = [-2, -4, -5, -6, -7, -8, -8, -8, -8, -8]
D_Q = [0.04, 0, 0, 0, 0, -0.14, 0.05, -0.06, -0.04, -0.08]


def _die(k):
    pose = merge(_prop(k, slow=2 if k > 3 else 1, blur=k < 4),
                 _body(x=D_X[k], z=D_Z[k], r=D_R[k], rz=D_RZ[k], rx=D_RX[k], q=D_Q[k]), {
        "pilot": {"r": [10, 16, -8, 12, -10, 14, 8, 10, 10, 10][k]},
        "smoke": {"show": True, "s": [0.7, 0.85, 0.95, 1.0, 1.05, 1.1, 1.1, 1.15, 1.15, 1.2][k],
                  "x": [0, -1, -2, -3, -4, -5, -6, -7, -8, -9][k]},
        "bomb": {"hide": True},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 5:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 1.4}})
    else:
        pose = merge(pose, F.expr("spiral", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(4)], [100, 100, 100, 100], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    by = {c.name: c for c in cl}
    assert by["hit"].total_ms() == 310 and by["die"].total_ms() == 695
    return M.check_contract([by["attack"]], attack_ms=760, attack_impact_at=0.4737) and M.check_variants(cl)
