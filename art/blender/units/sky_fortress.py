"""Sky Fortress: Modern Age legendary heavy bomber (CONTENT_PLAN 5.6). Bombs (proj.bomb), splash r50, never stops;
two waist gunners (attack_alt), crashes and the gunners bail out, ~74 lu.

Look (A11 flyer rig, Modern palette): a big, round-bellied cartoon four-engine bomber. A long team-painted
fuselage with an olive belly, a cream chevron and rivet rows, a glass nose with a framed bomb-aimer bubble, a
cockpit with a goggled pilot, a tall team tail fin with a cream band, olive wings carrying four fat radial
engines with team cowling rings and never-still propellers (one blade phase over pale blur arcs), a waist
gunner in a side window and a dorsal gunner in a glass bubble, each with a twin machine gun, and bomb-bay doors
on the belly that swing open on a stick of bombs. Flyers are authored with the origin at their lowest point.

"A viewer expects the bomb bay to open and a stick of bombs to drop while the gunners swivel and fire, and a
steady cruise with the propellers blurring."

Animation (ANIM_SPEC G8 fly, appendix B air; riders get attack_alt, ANIM_SPEC R3):
  idle        cruising: a slow pitch and roll, all four propellers spinning, the gunners scanning
  walk        forward flight at the ground speed (40 x 1.25 = 50 lu/s), nose down 4 degrees, propeller blur;
              the game adds the hover bob (R8)
  attack      BOMB RUN: the bay doors swing open (the held extreme, holdLoop), a stick of four bombs drops away
              and falls, the doors close, the bomber lifts as it lightens
  attack_b    BANKED RUN: it banks toward the camera so the wings and open bay show (the held extreme,
              holdLoop), drops the stick from the bank and rolls level
  attack_alt  the waist and dorsal gunners swivel and fire (the bullets leave `muzzle`); the bomber holds its
              cruise pose
  hit         flyer: a shudder and a drop, the pilot's eyes squeezed
  die         D8 crash: an engine smokes, it noses over and spirals down, the tail breaks, a crash bounce
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_modern as KM
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "sky_fortress"
GAIT_NAME = "fly"
NAME = "Sky Fortress"
HEIGHT_LU = 78
YAW_DEG = -10.0
CANVAS = (560, 380)
FEET = (280, 300)
ANCHORS = {"head": (0, 72), "hitCenter": (0, 30)}
NO_RETIME = True

FUS_Z = 28.0
LEN = 70.0                     # half length of the fuselage
NOSE_X = LEN
ENGINES = ((22.0, -22.0), (16.0, -46.0), (22.0, 22.0), (16.0, 46.0))   # (x, y) of the four nacelles
ENG_Z = FUS_Z - 10.0
PROP_R = 13.0
PHASES = 3
BLUR = 3
BAY = (4.0, 0.0, FUS_Z - 15.0)
WAIST = (-26.0, -13.0, FUS_Z + 2.0)      # the near waist gunner's window
DORSAL = (24.0, 0.0, FUS_Z + 15.5)       # the dorsal turret
ALT_MUZ = (WAIST[0] + 14.0, WAIST[1] - 3.0, WAIST[2] + 1.0)
STEEL_DK = "#2F3336"


def _engine_pts(ex, ey):
    return (ex + 10.0, ey, ENG_Z)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("plane", "body", (0, 0, FUS_Z))
    # far wing and its engines
    g = Geo().blob((12.0, 36.0, FUS_Z - 7.0), (17.0, 36.0, 2.6), p=3.0)
    rig.part("plane", g, R.OLIVE_LT, outline=0.6)
    # fuselage: team top, olive belly, a chevron and rivets
    fus = Geo().blob((0.0, 0, FUS_Z), (LEN, 14.0, 15.0), p=2.6, taper=(0.62, 1.0), shift=(-0.1, 0))
    fus.clip((0, 0, FUS_Z - 3.0), (0, 0, -1))
    fface = F.Face(rig, "plane", [fus])
    rig.part("plane", fus, team=True)
    g = KM.chevron(fface, Geo(), (-6.0, FUS_Z + 3.0), s=1.6, n=2, w=2.2, gap=3.4)
    rig.part("plane", g, KM.CREAM, highlight=False, outline=0)
    g = Geo().blob((0.0, 0, FUS_Z), (LEN, 14.0, 15.0), p=2.6, taper=(0.62, 1.0), shift=(-0.1, 0))
    g.clip((0, 0, FUS_Z - 3.0), (0, 0, 1))
    rig.part("plane", g, R.OLIVE)
    g = Geo()
    for x in range(-50, 50, 7):
        g.sphere((x, -13.6, FUS_Z - 2.6), 0.8, cuts=2)
    rig.part("plane", g, R.OLIVE_LT, finish="metal", outline=0)
    # glass nose and the cockpit with the pilot
    g = Geo().blob((NOSE_X - 4.0, 0, FUS_Z - 1.0), (9.0, 10.0, 10.0), p=2.2)
    rig.part("plane", g, R.GLASS, finish="gloss", outline=0.7, outline_hex="#6F8A94")
    g = Geo()
    for a in (-40, 0, 40):
        r = math.radians(a)
        g.capsule((NOSE_X - 10.0, -8.6 * math.cos(r), FUS_Z - 1.0 + 8.6 * math.sin(r)),
                  (NOSE_X + 3.0, -2.0 * math.cos(r), FUS_Z - 1.0 + 2.0 * math.sin(r)), 0.5)
    rig.part("plane", g, R.GUNMETAL, finish="metal", outline=0)
    g = Geo().blob((NOSE_X - 22.0, 0, FUS_Z + 11.5), (9.0, 7.0, 3.6), p=2.4)
    g.clip((0, 0, FUS_Z + 10.0), (0, 0, -1))
    rig.part("plane", g, R.GLASS, finish="gloss", outline=0.7, outline_hex="#6F8A94")
    rig.joint("pilot", "plane", (NOSE_X - 22.0, 0, FUS_Z + 9.5))
    hc = (NOSE_X - 21.0, 0.0, FUS_Z + 12.5)
    KM.crew_head(rig, "p_head", "pilot", hc, k=0.7, brow=R.HAIR, brow_angry=False)
    g = Geo().blob((hc[0] - 0.4, 0, hc[2] + 2.4), (5.9, 5.6, 4.0), p=2.3)
    g.clip((hc[0], 0, hc[2] + 0.3), (0, 0, -1))
    rig.part("p_head", g, R.LEATHER)
    # tail: a tall team fin with a cream band, the tailplane
    g = Geo().slab([(-52, FUS_Z + 6), (-68, FUS_Z + 7), (-74, FUS_Z + 40), (-62, FUS_Z + 42), (-54, FUS_Z + 16)], 0.0, 3.0)
    rig.part("plane", g, team=True, outline=0.9)
    g = Geo().slab([(-62.5, FUS_Z + 30), (-71.5, FUS_Z + 30), (-72.5, FUS_Z + 34), (-63, FUS_Z + 34)], -1.8, 0.6)
    rig.part("plane", g, KM.CREAM, outline=0)
    g = Geo().blob((-62.0, 0, FUS_Z + 4.0), (10.0, 24.0, 1.6), p=2.8)
    rig.part("plane", g, R.OLIVE_LT, outline=0.7)
    # the dorsal turret bubble with a gunner and a twin MG
    g = Geo().blob(DORSAL, (6.4, 6.4, 5.0), p=2.2)
    g.clip((0, 0, DORSAL[2] - 1.0), (0, 0, -1))
    rig.part("plane", g, R.GLASS, finish="gloss", outline=0.7, outline_hex="#6F8A94")
    rig.joint("dors", "plane", DORSAL)
    KM.crew_head(rig, "d_head", "dors", (DORSAL[0] - 1.0, 0.0, DORSAL[2] + 1.6), k=0.6, brow=R.HAIR)
    g = Geo()
    for y in (-1.6, 1.6):
        g.capsule((DORSAL[0] + 3.0, y, DORSAL[2] + 1.0), (DORSAL[0] + 15.0, y, DORSAL[2] + 2.4), 0.8)
    rig.part("dors", g, STEEL_DK, finish="metal", outline=0.5)
    # the near waist window with a gunner and his MG
    g = Geo().blob((WAIST[0], WAIST[1] - 0.6, WAIST[2]), (6.0, 1.0, 4.4), p=3.0)
    rig.part("plane", g, "#2B2A2E", outline=0.5)
    rig.joint("waist", "plane", WAIST)
    KM.crew_head(rig, "w_head", "waist", (WAIST[0] - 1.0, WAIST[1] - 2.0, WAIST[2] + 1.6), k=0.6, brow=R.HAIR)
    g = Geo()
    for z in (-0.8, 1.2):
        g.capsule((WAIST[0] + 2.0, WAIST[1] - 3.0, WAIST[2] + z), (WAIST[0] + 14.0, WAIST[1] - 3.0, WAIST[2] + 1.0 + z), 0.8)
    rig.part("waist", g, STEEL_DK, finish="metal", outline=0.5)
    # bomb-bay doors and the stick of bombs
    for side, y in (("dl", -4.0), ("dr", 4.0)):
        rig.joint(side, "plane", (BAY[0], y * 1.8, BAY[2] + 1.0))
        g = Geo().blob((BAY[0], y * 1.8, BAY[2]), (13.0, 3.6, 1.0), p=3.0)
        rig.part(side, g, R.OLIVE_LT, finish="gloss", outline=0.5)
    rig.joint("bombs", "plane", BAY, hidden=True)
    g = Geo()
    for k in range(4):
        x = BAY[0] - 9.0 + 6.0 * k
        z = BAY[2] - 3.0 - 4.0 * k
        g.blob((x, 0, z), (3.6, 2.0, 2.0), p=2.2)
    rig.part("bombs", g, "#3E4236", finish="gloss", outline=0.5)
    rig.joint("mz", "plane", (BAY[0], 0.0, BAY[2] - 2.0), hidden=True)
    rig.track("muzzle", "mz", (BAY[0], 0.0, BAY[2] - 2.0))
    # near wing (in front of the fuselage) and the engines (nacelles, team rings, spinners)
    g = Geo().blob((12.0, -36.0, FUS_Z - 7.0), (17.0, 36.0, 3.0), p=3.0)
    rig.part("plane", g, R.OLIVE, outline=0.7)
    g = Geo().blob((10.0, -70.0, FUS_Z - 7.0), (7.0, 4.0, 3.0), p=3.0)
    rig.part("plane", g, team=True, outline=0.5)                                  # team wing tip
    for ex, ey in ENGINES:
        g = Geo().lathe([(0, 0), (7.6, 0.6), (8.4, 6.0), (6.4, 15.0), (2.4, 20.0)], (ex + 10.0, ey, ENG_Z),
                        (ex - 10.0, ey, ENG_Z), segs=18)
        rig.part("plane", g, R.OLIVE, finish="gloss", outline=0.6)
        g = Geo().lathe([(8.5, -1.2), (8.8, 0), (8.5, 1.2)], (ex + 9.0, ey, ENG_Z), (ex + 10.5, ey, ENG_Z), segs=18)
        rig.part("plane", g, team=True, outline=0.4)
        g = Geo().lathe([(2.4, 0), (1.8, 2.0), (0, 3.4)], (ex + 10.5, ey, ENG_Z), (ex + 14.0, ey, ENG_Z), segs=12)
        rig.part("plane", g, R.SIGNAL, outline=0.4)
    for k in range(BLUR):
        name = f"blur{k}"
        rig.joint(name, "plane", (0, 0, FUS_Z), hidden=True)
        g = Geo()
        for ex, ey in ENGINES:
            px, py, pz = ex + 11.0, ey, ENG_Z
            for j in range(3):
                if j == k:
                    continue
                a0 = math.radians(120 * j + 20 * k)
                pts = [(px, py + PROP_R * 0.9 * math.cos(a0 + t * 0.5), pz + PROP_R * 0.9 * math.sin(a0 + t * 0.5))
                       for t in range(4)]
                for a, b in zip(pts, pts[1:]):
                    g.capsule(a, b, 1.1, segs=6, rings=2)
        rig.part(name, g, R.KHAKI_LT, highlight=False, outline=0)
    for k in range(PHASES):
        name = f"blade{k}"
        rig.joint(name, "plane", (0, 0, FUS_Z), hidden=True)
        g = Geo()
        for ex, ey in ENGINES:
            px, py, pz = ex + 11.0, ey, ENG_Z
            for j in range(3):
                b = math.radians(40.0 * k + 120.0 * j)
                c = PROP_R * 0.55
                g.blob((px + 0.4, py + c * math.cos(b), pz + c * math.sin(b)), (0.7, 1.2 + abs(math.cos(b)), PROP_R * 0.45),
                       p=2.6, rot=(math.degrees(b) - 90.0, 0, 0))
        rig.part(name, g, R.GUNMETAL, outline=0.5)
    rig.joint("smoke", "plane", (12.0, -30.0, FUS_Z + 2.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 7.0), (-9, 3, 6.0), (-5, 10, 5.4), (6, 7, 5.0), (-16, 1, 4.6), (-23, 7, 4.0)):
        g.sphere((12.0 + dx, -30.0, FUS_Z + 2.0 + dz), r, cuts=4)
    rig.part("smoke", g, R.SMOKE_DK, finish="dust", outline=0.8)
    rig.track("_foot", "odo", (0, 0, 0))


def _prop(step, slow=1, blur=True):
    pose = {f"blade{(step // slow) % PHASES}": {"show": True}}
    if blur:
        pose[f"blur{(step // slow) % BLUR}"] = {"show": True}
    return pose


def _body(x=0.0, z=0.0, r=0.0, rx=0.0, rz=0.0, q=0.0):
    return {"body": dict(M.body_about((0, 0, FUS_Z), x=x, z=z, r=r, rx=rx, rz=rz, q=q)["body"])}


def _doors(open_):
    return {"dl": {"rx": 70.0 * open_}, "dr": {"rx": -70.0 * open_}}


def _idle(f):
    b = math.sin(2 * math.pi * f / 4)
    c = math.cos(2 * math.pi * f / 4)
    pose = merge(_prop(f), _body(z=1.2 * b, r=1.0 * c, rx=1.2 * b), {
        "w_head": {"rz": [0, 20, 0, -20][f]}, "dors": {"rz": [0, 10, 20, 10][f]}})
    if f == 2:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    return merge(_prop(f), _body(z=0.8 * math.sin(p), r=-4.0 + 0.8 * math.sin(p + 1.0)), {
        "odo": {"x": 6.25 * math.cos(p)},     # stride 25 lu per 0.5 s = 50 lu/s (ground speed)
        "w_head": {"r": 2.0 * math.sin(p - 1.0)},
    })


# 9 unique frames in 840 ms; the stick drops on frame 4 at 400 ms (impactAt 0.4762)
ATTACK_MS = [80, 100, 160, 60, 60, 100, 100, 100, 80]
ATTACK_IMPACT = 4
#        doors open  HOLD  wob   DROP  fall  fall2 shut  settle
A_DOOR = [0.3, 0.8, 1.0, 1.0, 1.0, 1.0, 0.8, 0.3, 0.0]
A_Z = [0.0, -0.5, -1.0, -1.2, -0.8, 1.5, 3.0, 2.0, 0.5]
A_R = [-1.0, -2.0, -3.0, -3.2, -2.0, 1.5, 2.5, 1.0, 0.0]


def _attack(i):
    pose = merge(_prop(i), _doors(A_DOOR[i]), _body(z=A_Z[i], r=A_R[i], q=[0, 0, -0.02, -0.01, 0.02, 0.03, 0.01, 0, 0][i]))
    if 4 <= i <= 6:
        pose["bombs"] = {"show": True, "z": [0, 0, 0, 0, 0.0, -10.0, -22.0, 0, 0][i], "x": [0, 0, 0, 0, 0, -3, -7, 0, 0][i]}
    if i in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze"))
    return pose


def _ov():
    return {4: [{"kind": "burst", "joint": "plane", "point": (BAY[0], 0.0, BAY[2] - 6.0), "r0_lu": 8.0, "r1_lu": 14.0,
                 "n": 6, "a0": 200.0, "arc": 140.0, "color": "#FFF4D6"}]}


def _attack_clip():
    return M.clip("attack", [_attack(i) for i in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(),
                  extra={"holdStep": 2, "holdLoop": [2, 3]})


B_RX = [-10.0, -22.0, -24.0, -22.0, -14.0, -6.0, -2.0]


def _b_pose(i):
    if i in (0, 8):
        return _attack(i)
    k = i - 1
    pose = merge(_prop(i), _doors(A_DOOR[i]), _body(z=A_Z[i], r=A_R[i] - 2.0, rx=B_RX[k]))
    if 4 <= i <= 6:
        pose["bombs"] = {"show": True, "z": [0, 0, 0, 0, 0.0, -10.0, -22.0, 0, 0][i], "x": [0, 0, 0, 0, 0, -3, -7, 0, 0][i]}
    if i in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze"))
    return pose


def _attack_b():
    return M.clip("attack_b", [_b_pose(i) for i in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(),
                  reuse={0: ("attack", 0), 8: ("attack", 8)}, extra={"holdStep": 2, "holdLoop": [2, 3]})


# attack_alt: the gunners' own sim attack (12 every 0.4 s); the bomber holds idle pose 0. 4 frames, 250 ms,
# the burst on frame 1 at 50 ms; the muzzle moves to the waist gun.
ALT_MS = [50, 60, 70, 70]
MZ_OFF = (ALT_MUZ[0] - BAY[0], ALT_MUZ[1], ALT_MUZ[2] - (BAY[2] - 2.0))


def _alt(i):
    pose = merge(_idle(0), {
        "mz": {"x": MZ_OFF[0], "y": MZ_OFF[1], "z": MZ_OFF[2]},
        "waist": {"rz": [-6, -4, -5, -6][i], "x": [0, -0.8, -0.3, 0][i]},
        "dors": {"rz": [-10, -8, -9, -10][i], "x": [0, -0.6, -0.2, 0][i]},
    })
    return merge(pose, F.expr("squeeze")) if i in (1, 2) else pose


def _attack_alt():
    ov = {1: [{"kind": "burst", "joint": "waist", "point": (ALT_MUZ[0] + 1.0, ALT_MUZ[1], ALT_MUZ[2]), "r0_lu": 4.0,
               "r1_lu": 8.0, "n": 5, "a0": -50.0, "arc": 100.0},
              {"kind": "burst", "joint": "dors", "point": (DORSAL[0] + 16.0, 0.0, DORSAL[2] + 2.4), "r0_lu": 4.0,
               "r1_lu": 8.0, "n": 5, "a0": -50.0, "arc": 100.0}]}
    return M.clip("attack_alt", [_alt(i) for i in range(4)], ALT_MS, impact=1, overlays=ov)


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_prop(k), _body(x=-2.0 * max(a, 0), z=-4.0 * max(a, 0) + 1.5 * min(a, 0), r=6 * a, rx=4 * a,
                                 q=[-0.05, -0.03, 0.02, -0.01, 0][k]), {"w_head": {"r": 8 * a}})
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


D_R = [-6, -12, -20, -30, -40, -48, -44, -46, -46, -46]
D_RZ = [0, 6, -8, 10, -6, 4, 0, 0, 0, 0]
D_RX = [0, 10, -14, 18, -10, 6, 0, 0, 0, 0]
D_Z = [2, 0, -4, -9, -15, -20, -17, -19, -19, -19]
D_X = [-2, -4, -5, -6, -7, -8, -8, -8, -8, -8]
D_Q = [0.03, 0, 0, 0, 0, -0.12, 0.05, -0.05, -0.03, -0.06]


def _die(k):
    pose = merge(_prop(k, slow=2 if k > 3 else 1, blur=k < 4),
                 _body(x=D_X[k], z=D_Z[k], r=D_R[k], rz=D_RZ[k], rx=D_RX[k], q=D_Q[k]), {
        "smoke": {"show": True, "s": [0.7, 0.85, 0.95, 1.0, 1.05, 1.1, 1.1, 1.15, 1.15, 1.2][k],
                  "x": [0, -1, -2, -3, -4, -5, -6, -7, -8, -9][k]},
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
        _attack_alt(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    by = {c.name: c for c in cl}
    assert by["hit"].total_ms() == 310 and by["die"].total_ms() == 695
    return M.check_contract([by["attack"]], attack_ms=840, attack_impact_at=0.4762) and M.check_variants(cl)
