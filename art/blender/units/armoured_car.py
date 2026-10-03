"""Armoured Car: Industrial Age epic vehicle, armored mech (CONTENT_PLAN 5.5). Turret machine gun proj.bullet
(18 / 0.3 s, range 150, ground and air), ~74 lu.

Look (A11 vehicle rig, Industrial palette): an early armoured car: a long riveted iron bonnet with a
louvred radiator grille and a headlamp, a riveted hull with team side panels (a cream cog), curved
mudguards, a spare wheel on the side, four spoked disc wheels with three cream lugs and chunky tyres,
and a round team turret with a water-jacketed machine gun. The commander's head peeks from the
turret hatch (leather cap, goggles).

"A viewer expects the turret to swivel and spit rapid flashes with casings spilling, the suspension
bobbing, a crew face peeking from the hatch; and to roll along on its wheels."

Animation (ANIM_SPEC G6 wheeled):
  idle      the engine idles (the hull shivers), the commander looks round, the turret twitches
  walk      the wheels turn 2 lug spacings per 544 ms cycle at the ground speed (55 x 1.25 = 68.75
            lu/s), the hull bobs on its springs, an exhaust puff, dust from the rear wheel
  attack    BURST: the gun flashes (one flash per sim shot), the barrel kicks, a casing flies, the
            commander squints
  attack_b  TRAVERSE BURST: the turret swings toward the camera and fires, the hull rocks
  hit       vehicle: a suspension bounce, the commander ducks into the hatch
  die       wreck: a fire flash, the turret pops up askew, a wheel rolls off, black smoke
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "armoured_car"
GAIT_NAME = "wheeled"
NAME = "Armoured Car"
HEIGHT_LU = 74
YAW_DEG = -10.0
CANVAS = (440, 300)
FEET = (214, 272)
ANCHORS = {"head": (0, 70), "hitCenter": (0, 32)}
NO_RETIME = True

R_W = 9.0
LUGS = 3
WALK_MS = 68
STRIDE = 2 * (2 * math.pi * R_W / LUGS)      # 37.7 lu per 544 ms = 69.3 lu/s
STEP = STRIDE / 8
ODO_AMP = STRIDE / 4
AXLES = (-26.0, 26.0)
NY = -15.0
TURRET = (-8.0, 0.0, 46.0)
MG_Z = 54.0
MUZZLE = (26.0, -3.0, MG_Z)
SOOT = "#2F2D2E"
TYRE = "#2B2A2E"


def _wheel(rig, name, x, y, far=False):
    from ageborn_art import colors as C
    k = 0.8 if far else 1.0
    sh = (lambda c: C.scale(c, k))
    rig.joint(name, "chassis", (x, y, R_W))
    g = Geo().lathe([(0, -2.6), (R_W, -2.6), (R_W + 0.6, 0), (R_W, 2.6), (0, 2.6)], (x, y, R_W), (x, y - 1.0, R_W), segs=22)
    rig.part(name, g, sh(TYRE), finish="matte")
    g = Geo().lathe([(0, -0.6), (R_W * 0.62, -0.6), (R_W * 0.6, 0.8), (0, 1.0)], (x, y - 2.2, R_W), (x, y - 3.2, R_W), segs=18)
    rig.part(name, g, sh(I.IRON_DK), finish="metal", outline=0.5)
    g = Geo()
    for i in range(LUGS):
        a = math.radians(360.0 / LUGS * i + 90)
        g.capsule((x, y - 3.4, R_W), (x + 4.6 * math.cos(a), y - 3.4, R_W + 4.6 * math.sin(a)), 1.4, 1.2)
    rig.part(name, g, sh(I.CREAM), outline=0.4)
    g = Geo().sphere((x, y - 3.8, R_W), 1.6, cuts=2)
    rig.part(name, g, sh(I.BRASS_LT), finish="metal", outline=0.3)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("chassis", "body", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    for i, x in enumerate(AXLES):
        _wheel(rig, f"wf{i}", x, 13.0, far=True)
    rig.joint("hull", "chassis", (0, 0, 16.0))
    # chassis frame, hull and bonnet
    g = Geo().blob((0, 0, 17.0), (40.0, 12.0, 2.4), p=4.0)
    rig.part("hull", g, SOOT, finish="metal")
    hull = Geo().blob((-6.0, 0, 31.0), (24.0, 13.0, 12.0), p=4.0)
    rig.part("hull", hull, I.IRON, finish="metal")
    g = Geo().blob((24.0, 0, 27.0), (14.0, 10.0, 8.0), p=3.6, taper=(1.0, 0.9))
    rig.part("hull", g, I.IRON, finish="metal")                          # bonnet
    g = Geo().blob((37.4, 0, 27.0), (1.4, 8.4, 7.0), p=4.0)
    rig.part("hull", g, I.IRON_DK, finish="metal", outline=0.6)          # radiator armour
    g = Geo()
    for z in (23.0, 26.0, 29.0, 32.0):
        g.blob((38.6, -2.0, z), (0.6, 6.0, 0.6), p=3.0)
    rig.part("hull", g, SOOT, outline=0)                                 # louvres
    g = Geo().lathe([(0, 0), (2.4, 0), (2.8, 2.0), (0, 2.4)], (34.0, -9.0, 31.0), (36.4, -9.0, 31.0), segs=14)
    rig.part("hull", g, I.BRASS_LT, finish="metal", outline=0.4)
    g = Geo().blob((36.6, -9.0, 31.0), (0.6, 2.0, 2.0), p=2.2)
    rig.part("hull", g, glow="#FFF1C8", outline=0)                        # headlamp
    # team side panels with the cog, rivets, mudguards and a spare wheel
    panel = Geo().blob((-6.0, -13.4, 31.0), (20.0, 1.2, 8.6), p=4.0)
    pface = F.Face(rig, "hull", [Geo().blob((-6.0, -13.4, 31.0), (20.0, 1.2, 8.6), p=4.0)])
    rig.part("hull", panel, team=True)
    g = KI.cog(pface, Geo(), (-10.0, 31.0), s=1.0)
    rig.part("hull", g, I.CREAM, highlight=False, outline=0)
    g = Geo().blob((20.0, -10.6, 27.0), (12.0, 1.0, 5.0), p=4.0)
    rig.part("hull", g, team=True)
    g = Geo()
    I.rivets(g, [(x, -14.2, z) for x in range(-26, 16, 6) for z in (21.5, 40.4)], r=0.8)
    rig.part("hull", g, I.IRON_LT, finish="metal", outline=0)
    g = Geo()
    for x in AXLES:
        pts = [(x + 12.0 * math.cos(math.radians(a)), 9.0 + 12.0 * math.sin(math.radians(a))) for a in range(0, 181, 30)]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule((p0[0], -14.6, p0[1] + 9.0), (p1[0], -14.6, p1[1] + 9.0), 1.4)
    rig.part("hull", g, I.IRON_DK, finish="metal", outline=0.5)           # mudguards
    g = Geo().lathe([(0, -1.4), (6.0, -1.4), (6.4, 0), (6.0, 1.4), (0, 1.4)], (2.0, -14.4, 30.0), (2.0, -15.4, 30.0), segs=18)
    rig.part("hull", g, TYRE, outline=0.5)                               # spare wheel
    # exhaust
    I.steam_puff(rig, "hull", (-34.0, -10.0, 20.0), size=1.0, name="exhaust", color=I.SMOKE_DK)
    # the turret with the machine gun and the commander
    rig.joint("turret", "hull", TURRET)
    tx, ty, tz = TURRET
    g = Geo().lathe([(0, 0), (12.0, 0), (12.4, 6.0), (11.0, 10.0), (0, 11.0)], (tx, ty, tz - 3.0), (tx, ty, tz + 8.0), segs=24)
    rig.part("turret", g, team=True, finish="metal")
    g = Geo()
    I.rivets(g, [(tx + 12.0 * math.cos(math.radians(a)), ty + 12.0 * math.sin(math.radians(a)), tz) for a in range(200, 341, 28)], r=0.8)
    rig.part("turret", g, I.IRON_LT, finish="metal", outline=0)
    rig.joint("gun", "turret", (tx + 10.0, -3.0, MG_Z))
    g = Geo().capsule((tx + 8.0, -3.0, MG_Z), (MUZZLE[0] - 6.0, -3.0, MG_Z), 2.4, 2.2)
    rig.part("gun", g, I.IRON_DK, finish="metal", outline=0.6)            # water jacket
    g = Geo().capsule((MUZZLE[0] - 7.0, -3.0, MG_Z), MUZZLE, 1.0)
    rig.part("gun", g, SOOT, finish="metal", outline=0.5)
    rig.track("muzzle", "gun", MUZZLE)
    I.muzzle_flash(rig, "gun", MUZZLE, size=1.3)
    rig.joint("casing", "root", (tx + 10.0, -6.0, MG_Z + 2.0), hidden=True)
    g = Geo().capsule((tx + 9.0, -7.0, MG_Z + 2.0), (tx + 12.0, -7.0, MG_Z + 3.0), 1.0)
    rig.part("casing", g, I.BRASS_LT, finish="metal", outline=0.4)
    cx, cy, cz = tx - 2.0, -2.0, tz + 12.0
    rig.joint("cmdr", "turret", (cx, cy, cz))
    head = Geo().blob((cx, cy, cz), (5.2, 5.0, 5.0), p=2.3)
    head.blob((cx + 5.0, cy - 0.4, cz - 1.0), (1.8, 1.6, 1.7), p=2.0)
    from ageborn_art import kit_medieval as K
    K.face2(rig, [head], I.SKIN, cx=cx + 4.2, cz=cz + 0.6, eye_dy=(cy - 2.2, cy + 2.2), eye_r=(2.0, 1.9, 2.4),
            pupil_r=(0.9, 1.3, 1.5), brow=I.HAIR, brow_w=0.5, mouth_dz=-3.4, mouth_x=cx + 4.6, head="cmdr",
            mouth_w=3.0, eye_at=(cx + 4.8, cz + 0.8), mark_r=2.2)
    rig.part("cmdr", head, I.SKIN)
    g = Geo().blob((cx - 0.4, cy, cz + 2.8), (5.6, 5.6, 3.2), p=2.4)
    g.clip((0, 0, cz + 1.6), (0, 0, -1))
    rig.part("cmdr", g, I.LEATHER)
    I.goggles(rig, at=(cx + 4.4, cy, cz + 3.6), joint="cmdr", k=0.6, dy=(-2.4, 2.2))
    # near wheels last
    for i, x in enumerate(AXLES):
        _wheel(rig, f"wn{i}", x, NY)
    # wreck parts
    rig.joint("boom", "hull", (0.0, -18.0, 40.0), hidden=True)
    g = Geo().sphere((0.0, -22.0, 40.0), 12.0, cuts=4)
    rig.part("boom", g, glow=I.FIRE, outline=0)
    rig.joint("wsmoke", "hull", (-4.0, -8.0, 56.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 8.0), (10, 5, 6.4), (-8, 6, 6.4), (2, 12, 6.0)):
        g.sphere((-4.0 + dx, -8.0, 56.0 + dz), r, cuts=4)
    rig.part("wsmoke", g, SOOT, finish="dust", outline=0.6)
    rig.track("_foot", "odo", (0, 0, 0))


WHEELS = [f"wn{i}" for i in range(2)] + [f"wf{i}" for i in range(2)]


def _roll(d):
    return {w: {"r": -math.degrees(d / R_W)} for w in WHEELS}


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    return merge(_roll(0), {
        "hull": dict(squash(0.01 * ((-1) ** f)), z=0.3 * ((-1) ** f)),
        "cmdr": {"rz": [0, 10, 20, 10, 0, -10][f], "z": 0.4 * c}, "turret": {"rz": [0, 0, 4, 4, 0, 0][f]},
        "exhaust": {"show": f in (1, 4), "s": 0.8},
    })


def _walk(f):
    p = 2 * math.pi * f / 8
    return merge(_roll(STEP * f), {
        "odo": {"x": ODO_AMP * math.cos(p)},
        "hull": dict(squash(-0.02 * math.cos(2 * p)), z=1.4 * math.cos(2 * p) + 0.4, r=1.0 * math.sin(2 * p)),
        "cmdr": {"z": 0.8 * math.sin(2 * p - 1.0)}, "gun": {"r": 2 * math.sin(2 * p - 1.2)},
        "exhaust": {"show": f in (0, 4), "s": 0.9},
    })


WALK_DUST = {k: [{"kind": "dust", "ground": (AXLES[0] - 11.0, 0.0), "size_lu": 5.0 if k % 2 else 4.0, "puffs": 3,
                  "seed": 300 + k, "spread": 1.0, "dir": -1.0}] for k in range(8)}

# attack: 4 frames in 250 ms, the shot on frame 1 (impactAt 0.24; the sim fires every 0.3 s)
ATTACK_MS = [60, 60, 70, 60]
ATTACK_IMPACT = 1


def _attack_pose(f, traverse=False):
    tr = [0.0, 0.0, 0.0, 0.0]
    pose = merge(_roll(0), {
        "turret": {"rz": (-14.0 if traverse else 0.0) + tr[f], "r": [0, 0.5, -0.8, 0][f]},
        "gun": {"x": [0, -1.6, -0.6, 0][f], "r": [0, 1.5, 0.5, 0][f]},
        "flash": {"show": f == 1},
        "hull": dict(squash([0, -0.02, 0.01, 0][f]), z=[0, -0.6, 0.3, 0][f], r=[0, -0.6, 0.3, 0][f] * (2 if traverse else 1)),
        "cmdr": {"z": [0, -1.0, -1.0, 0][f]},
    })
    if f in (2, 3):
        pose["casing"] = {"show": True, "x": [0, 0, -3, -7][f], "z": [0, 0, 4, 1][f], "r": [0, 0, 120, 260][f]}
    if f in (1, 2):
        pose = merge(pose, F.expr("squeeze"))
    return pose


def _ov():
    return {1: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 5.0, "r1_lu": 10.0, "n": 5,
                 "a0": -50.0, "arc": 100.0, "color": "#FFF4D6"}]}


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(4)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(),
                  extra={"holdStep": 0})


def _attack_b():
    return M.clip("attack_b", [_attack_pose(f, traverse=True) for f in range(4)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=_ov(), extra={"holdStep": 0})


def _hit(k):
    a = M.HIT_AMT[k]
    duck = [0.8, 1.0, 0.6, 0.1, 0.0][k]
    return merge(_roll(-3 * a), {
        "body": dict(squash([-0.06, 0.04, 0.02, -0.02, 0.0][k]), x=-3.0 * max(a, 0) + 1.0 * min(a, 0)),
        "hull": {"r": 2.5 * a, "z": [-1.5, 1.5, 0.5, -0.3, 0.0][k]},
        "cmdr": {"z": -5.0 * duck}, "turret": {"rz": 6 * a},
    })


D_BODY = [dict(x=-1, z=0, r=1, q=-0.04), dict(x=-2, z=5, r=3, q=0.04), dict(x=-3, z=7, r=6, q=0.02),
          dict(x=-4, z=3, r=8, q=-0.06), dict(x=-4, z=1, r=9, q=-0.08), dict(x=-4, z=1, r=9, q=-0.07),
          dict(x=-4, z=1, r=9, q=-0.07), dict(x=-4, z=1, r=9, q=-0.08, s=0.97)]
D_WHEEL = [(0, 0, 0), (4, 5, -40), (10, 8, -100), (18, 4, -170), (24, -1, -240), (26, -1, -250),
           (26, -1, -250), (26, -1, -250)]


def _die(k):
    b = D_BODY[k]
    wx, wz, wr = D_WHEEL[k]
    pose = merge(_roll(0), M.body_about((AXLES[0], 0, 0), x=b["x"], z=b["z"], r=b["r"], q=b["q"], s=b.get("s", 1.0)), {
        "wn1": {"x": wx, "z": wz, "r": wr},
        "boom": {"show": k in (1, 2), "s": [1, 1.0, 1.25, 1, 1, 1, 1, 1][k]},
        "wsmoke": {"show": k >= 2, "s": [1, 1, 0.6, 0.8, 1.0, 1.1, 1.2, 1.3][k], "z": [0, 0, 0, 4, 8, 12, 16, 20][k]},
        "turret": {"z": [0, 4, 8, 6, 4, 4, 4, 4][k], "r": [0, 8, 16, 18, 18, 18, 18, 18][k], "rz": [0, 10, 18, 22, 22, 22, 22, 22][k]},
        "gun": {"r": [0, -8, -16, -20, -22, -22, -22, -22][k]},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 3:
        pose = merge(pose, F.expr("o"))
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)], [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], [WALK_MS] * 8, loop=True, overlays=WALK_DUST),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True, attack_ms=250, attack_impact_at=0.24))
