"""Armoured Train: Industrial Age Legendary siege mech (CONTENT_PLAN 5.5). Turret gun proj.shell (90 splash
r45 / 2.4 s, range 220, ground) and a roof machine gun proj.bullet (10 / 0.4 s, range 150, ground and air,
priority air; a second sim attack). Overpressure (X0 M2 frenzy) below half HP. ~130 lu, huge.

Look (A11 vehicle rig, Industrial palette): a short armoured locomotive riding on its own stretch of
track: a riveted iron hull with a wide team side band and a big cream cog roundel, a sloped armoured
cowcatcher with hazard stripes, a round smokebox door with a brass ring, a tall flared smokestack
(it puffs on the beat), a team domed gun turret on the roof with a long banded barrel, a small roof
cupola at the back where a gunner in a leather cap works a machine gun, a cab with a driver's face at
the window, a brass whistle, and four big spoked driving wheels joined by a connecting rod. Legendary
white aura is added in game.

"A viewer expects the gun to boom and the whole train to rock on its springs while the machine gun
chatters, and to chug along on a short stretch of track that scrolls under it."

Animation (ANIM_SPEC G6 wheeled/rail):
  idle        the hull breathes on its springs, the stack puffs, the gunner looks round
  walk        the sleepers scroll exactly 2 spacings per cycle at the ground speed (40 x 1.25 =
              50 lu/s; an 816 ms cycle), the 4-spoke wheels turn 2 spoke spacings per cycle with the connecting rod
              going round, the hull chugs (a jolt per half cycle), the stack puffs on 0 and 4
  attack      BROADSIDE BOOM: the turret traverses and settles (the held extreme, a hold loop with the
              barrel quivering), BOOM: a big flash, the barrel slides back, the whole train rocks back
              on its springs and squashes, smoke rolls out, it rocks forward
  attack_b    ELEVATED SHOT: the barrel tips up high and the whistle screams a steam jet, the shot makes
              the hull hop on the rails
  attack_alt  the roof machine gun's own attack (ANIM_SPEC R3): the body idles, the gunner squints and
              the gun chatters; the bullets leave `mgMuzzle`
  hit         vehicle: a suspension bounce, the driver ducks
  die         wreck: a fire flash, the train jumps the rails and tips nose-down, the turret knocked
              askew, a wheel rolls off, black smoke
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from units.land_dreadnought import gunner

SLUG = "armoured_train"
GAIT_NAME = "wheeled"
NAME = "Armoured Train"
HEIGHT_LU = 172
YAW_DEG = -10.0
CANVAS = (900, 560)
FEET = (424, 520)
ANCHORS = {"head": (0, 154), "hitCenter": (0, 65)}
NO_RETIME = True

R_W = 10.0                       # driving wheel radius
SPOKES = 4
S = 1.3                          # the whole train is modelled at 1/1.3 and scaled up (A11 Legendary band)
WALK_MS = 102
CYCLE = 8 * WALK_MS              # 816 ms
STRIDE = 2 * (2 * math.pi * R_W / SPOKES)     # 31.4 model lu per cycle = 40.8 lu = 50.0 lu/s
WHEEL_STEP = 2 * (360.0 / SPOKES) / 8         # 22.5 degrees per frame (25% of a spacing)
ODO_AMP = STRIDE * S / 4         # the odometer sits on the unscaled root
TIE = STRIDE / 2                 # sleeper spacing: 2 spacings per cycle
AXLES = (-62.0, -26.0, 22.0, 58.0)
WY = -22.0                       # near wheel plane
TURRET = (-4.0, 0.0, 66.0)
BARREL_Z = 76.0
MUZZLE = (60.0, -2.0, BARREL_Z)
CUPOLA = (-42.0, 0.0, 66.0)
MG_MUZZLE = (-22.0, -4.0, 84.0)
STACK = (74.0, 0.0, 66.0)
HULL_C = I.IRON
HULL_DK = I.IRON_DK
BRASS = I.BRASS_LT
SOOT = "#2F2D2E"
WOODTIE = "#5A4A3C"


def _wheel(rig, name, x, y, parent="chassis", far=False):
    from ageborn_art import colors as C
    k = 0.8 if far else 1.0
    sh = (lambda c: C.scale(c, k))
    rig.joint(name, parent, (x, y, R_W))
    g = Geo()
    n = 16
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        g.capsule((x + (R_W - 1.4) * math.cos(a0), y, R_W + (R_W - 1.4) * math.sin(a0)),
                  (x + (R_W - 1.4) * math.cos(a1), y, R_W + (R_W - 1.4) * math.sin(a1)), 2.0, segs=10, rings=2)
    rig.part(name, g, sh(HULL_DK), finish="metal")
    g = Geo()
    for i in range(SPOKES):
        a = math.radians(360.0 / SPOKES * i)
        g.capsule((x, y, R_W), (x + (R_W - 2.2) * math.cos(a), y, R_W + (R_W - 2.2) * math.sin(a)), 1.6, 1.3, segs=8, rings=2)
    rig.part(name, g, sh(I.CREAM), outline=0.7)             # cream spokes so the roll reads
    g = Geo().blob((x, y - 1.2, R_W), (3.0, 2.0, 3.0), p=2.4)
    g.blob((x + 4.6, y - 1.0, R_W), (2.6, 1.6, 2.2), p=2.6)  # counterweight
    rig.part(name, g, sh(BRASS), finish="metal", outline=0.5)


def build(rig):
    rig.joint("all", "root", (0, 0, 0), scale=S)
    rig.joint("body", "all", (0, 0, 0))
    rig.joint("chassis", "body", (0, 0, 2.0))
    rig.joint("odo", "root", (0, 0, 0))
    # the track: two rails and the sleepers (the sleepers scroll on their own joint)
    rig.joint("ties", "all", (0, 0, 0))
    g = Geo()
    for k in range(-6, 9):      # the row slides left up to 1.75 spacings, so it starts short of the rail end
        x = k * TIE
        g.blob((x, 0, 0.8), (2.4, 30.0, 0.9), p=3.0)
    rig.part("ties", g, WOODTIE, outline=0.4)
    g = Geo()
    for y in (-22.0, 22.0):
        g.blob((0, y, 2.0), (128.0, 1.4, 1.0), p=4.0)
    rig.joint("rails", "all", (0, 0, 0))
    rig.part("rails", g, I.IRON_LT, finish="metal", outline=0.5)
    for i, x in enumerate(AXLES):
        _wheel(rig, f"wf{i}", x, 20.0, far=True)
    rig.joint("hull", "chassis", (0, 0, 30.0))

    # the hull: a riveted iron box on a dark frame, the cab at the rear, the boiler front
    g = Geo().blob((0, 0, 46.0), (84.0, 20.0, 19.0), p=4.0)
    rig.part("hull", g, HULL_C, finish="metal")
    g = Geo().blob((0, 0, 26.0), (88.0, 18.0, 2.6), p=4.0)
    rig.part("hull", g, SOOT, finish="metal")
    g = Geo().blob((-70.0, 0, 62.0), (16.0, 20.0, 14.0), p=4.0)          # the cab
    rig.part("hull", g, HULL_C, finish="metal")
    g = Geo().blob((-70.0, 0, 77.0), (18.0, 22.0, 2.4), p=3.0)
    rig.part("hull", g, team=True)                                        # cab roof
    g = Geo().blob((-62.0, -20.6, 64.0), (5.0, 1.2, 4.6), p=3.0)
    rig.part("hull", g, I.COAL, outline=0.4)                              # cab window
    # the driver's face at the window
    hx, hy, hz = -61.0, -18.0, 64.0
    rig.joint("driver", "hull", (hx, hy, hz))
    head = Geo().blob((hx, hy, hz), (4.6, 4.4, 4.4), p=2.3)
    rig.part("driver", head, I.SKIN)
    g = Geo()
    for dz in (1.2,):
        for dy in (-1.8, 1.4):
            g.blob((hx + 3.8, hy + dy, hz + dz), (0.8, 0.9, 1.2), p=2.2)
    rig.part("driver", g, I.PUPIL, outline=0, highlight=False)
    g = Geo().blob((hx - 0.4, hy, hz + 3.2), (5.0, 5.0, 2.4), p=2.4)
    rig.part("driver", g, I.COAL_LT)
    # cowcatcher and smokebox
    g = Geo().slab([(84.0, 34.0), (100.0, 22.0), (102.0, 18.0), (84.0, 18.0)], 0.0, 36.0)
    rig.part("hull", g, HULL_DK, finish="metal", outline=0.8)
    g = Geo().lathe([(0, 0), (14.0, 0), (15.0, 2.0), (0, 2.6)], (84.0, 0, 46.0), (87.0, 0, 46.0), segs=24)
    rig.part("hull", g, HULL_DK, finish="metal", outline=0.8)
    g = Geo().lathe([(14.6, -0.8), (15.4, 0), (14.6, 0.8)], (86.0, 0, 46.0), (86.6, 0, 46.0), segs=24)
    rig.part("hull", g, BRASS, finish="metal", outline=0.4)
    # the near side: team band, cog roundel, rivets, hazard stripes on the cowcatcher
    band = Geo().blob((4.0, -20.4, 46.0), (74.0, 1.4, 8.0), p=4.0)
    bface = F.Face(rig, "hull", [Geo().blob((4.0, -20.4, 46.0), (74.0, 1.4, 8.0), p=4.0)])
    rig.part("hull", band, team=True)
    g = Geo()
    bface.decal(g, bface.hit(-6.0, 46.0), F.ellipse(0, 0, 7.4, 7.4, 24), 0.6)
    rig.part("hull", g, I.CREAM, highlight=False, outline=0)
    g = KI.cog(bface, Geo(), (-6.0, 46.0), s=1.4, depth=0.8)
    rig.part("hull", g, team=True, highlight=False, outline=0)
    g = Geo()
    I.rivets(g, [(x, -20.8, z) for x in range(-76, 84, 10) for z in (31.0, 60.0)], r=1.0)
    rig.part("hull", g, I.IRON_LT, finish="metal", outline=0)
    cface = F.Face(rig, "hull", [Geo().slab([(84.0, 34.0), (100.0, 22.0), (102.0, 18.0), (84.0, 18.0)], 0.0, 36.0)])
    g = Geo()
    KI.stripes(cface, g, (92.0, 26.0), 14.0, 8.0, n=3)
    rig.part("hull", g, I.CREAM, highlight=False, outline=0)
    # the smokestack and the whistle
    sx, sy, sz = STACK
    g = Geo().capsule((sx, sy, sz - 4.0), (sx, sy, sz + 20.0), 5.4, 5.0)
    g.lathe([(0, 0), (5.0, 0), (8.4, 6.0), (8.6, 8.0), (0, 8.0)], (sx, sy, sz + 18.0), (sx, sy, sz + 26.0), segs=18)
    rig.part("hull", g, SOOT, finish="metal", outline=0.8)
    I.steam_puff(rig, "hull", (sx + 2.0, sy, sz + 34.0), size=2.2, name="puff", color=I.SMOKE)
    g = Geo().capsule((-46.0, -6.0, 62.0), (-46.0, -6.0, 68.0), 1.2)
    rig.part("hull", g, BRASS, finish="metal", outline=0.4)
    I.steam_puff(rig, "hull", (-46.0, -8.0, 74.0), size=1.4, name="whistle")
    # the gun turret: a team dome with a banded barrel
    rig.joint("turret", "hull", TURRET)
    tx, ty, tz = TURRET
    g = Geo().blob((tx, ty, tz + 6.0), (16.0, 14.0, 10.0), p=2.4)
    g.clip((tx, ty, tz), (0, 0, -1))
    rig.part("turret", g, team=True, finish="metal")
    g = Geo().lathe([(16.4, -1.0), (17.0, 0), (16.4, 1.0)], (tx, ty, tz + 1.0), (tx, ty, tz + 2.0), segs=24)
    rig.part("turret", g, HULL_DK, finish="metal", outline=0.4)
    rig.joint("barrel", "turret", (tx + 12.0, ty - 2.0, BARREL_Z))
    g = Geo().capsule((tx + 10.0, ty - 2.0, BARREL_Z), (MUZZLE[0], ty - 2.0, BARREL_Z), 2.6, 2.3)
    rig.part("barrel", g, HULL_DK, finish="metal", outline=0.8)
    g = Geo()
    for x in (tx + 26.0, tx + 44.0):
        g.lathe([(2.8, -0.8), (3.1, 0), (2.8, 0.8)], (x, ty - 2.0, BARREL_Z), (x + 1.0, ty - 2.0, BARREL_Z), segs=14)
    g.lathe([(3.4, -1.0), (3.6, 0), (3.4, 1.0)], (MUZZLE[0] - 1.0, ty - 2.0, BARREL_Z), (MUZZLE[0], ty - 2.0, BARREL_Z), segs=14)
    rig.part("barrel", g, BRASS, finish="metal", outline=0.4)
    rig.track("muzzle", "barrel", MUZZLE)
    I.muzzle_flash(rig, "barrel", MUZZLE, size=2.6)
    rig.joint("smoke", "all", (MUZZLE[0] + 14, -20, BARREL_Z + 14), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 10.0), (11, 5, 8.0), (-7, 9, 7.0), (5, 13, 6.6), (18, -2, 6.0)):
        g.sphere((MUZZLE[0] + 14 + dx, -20, BARREL_Z + 14 + dz), r, cuts=4)
    rig.part("smoke", g, I.SMOKE, finish="dust", outline=0.8)
    # the roof cupola with the machine gunner
    cx, cy, cz = CUPOLA
    g = Geo().lathe([(9.0, 0), (9.0, 6.0), (8.0, 7.0)], (cx, cy, cz - 2.0), (cx, cy, cz + 5.0), segs=20)
    rig.part("hull", g, HULL_DK, finish="metal", outline=0.6)
    gunner(rig, "hull", (cx, cy - 2.0, cz + 2.0), "g0")
    rig.joint("mg0", "hull", (cx + 10.0, -4.0, MG_MUZZLE[2]))
    g = Geo().capsule((cx + 6.0, -4.0, MG_MUZZLE[2]), MG_MUZZLE, 1.4, 1.2)
    g.blob((cx + 9.0, -4.0, MG_MUZZLE[2] - 1.0), (3.6, 2.2, 2.8), p=2.6)
    rig.part("mg0", g, I.COAL, finish="metal", outline=0.6)
    rig.track("mgMuzzle", "mg0", MG_MUZZLE)
    I.muzzle_flash(rig, "mg0", MG_MUZZLE, size=1.0, name="flash0")
    # the near wheels and the connecting rod
    for i, x in enumerate(AXLES):
        _wheel(rig, f"wn{i}", x, WY)
    rig.joint("rod", "chassis", (AXLES[1], WY - 3.0, R_W))
    g = Geo().capsule((AXLES[0], WY - 3.0, R_W), (AXLES[3], WY - 3.0, R_W), 1.4)
    rig.part("rod", g, I.IRON_LT, finish="metal", outline=0.5)
    # the wreck parts
    rig.joint("boom", "hull", (30.0, -30.0, 60.0), hidden=True)
    g = Geo().sphere((30.0, -34.0, 60.0), 16.0, cuts=4)
    rig.part("boom", g, glow=I.FIRE, outline=0)
    rig.joint("wsmoke", "hull", (0.0, -10.0, 80.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 10.0), (12, 6, 8.0), (-10, 8, 8.0), (4, 16, 7.0)):
        g.sphere((dx, -10.0, 80.0 + dz), r, cuts=4)
    rig.part("wsmoke", g, SOOT, finish="dust", outline=0.6)
    rig.track("_foot", "odo", (0, 0, 0))


# -- poses ---------------------------------------------------------------------------------
NEAR = [f"wn{i}" for i in range(4)]
FAR = [f"wf{i}" for i in range(4)]


def _wheels(deg):
    out = {w: {"r": -deg} for w in NEAR + FAR}
    a = math.radians(-deg)
    out["rod"] = {"x": 4.6 * math.cos(a) - 4.6, "z": 4.6 * math.sin(a)}
    return out


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    pose = merge(_wheels(0), {
        "hull": dict(squash(0.012 * c), z=0.5 * c),
        "puff": {"show": f in (1, 2, 4, 5), "s": [1, 0.7, 1.0, 1, 0.8, 1.1][f], "z": [0, 0, 3, 0, 0, 4][f]},
        "g0": {"r": 6 * lag}, "driver": {"x": 0.6 * c},
    })
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    jolt = -abs(math.sin(p))
    return merge(_wheels(WHEEL_STEP * f), {
        "odo": {"x": ODO_AMP * math.cos(p)},
        "ties": {"x": -(STRIDE / 8.0) * f},
        "hull": dict(squash(0.02 * jolt), z=1.6 * jolt + 0.4, r=0.8 * math.sin(2 * p)),
        "puff": {"show": f in (0, 1, 4, 5), "s": [0.8, 1.15, 1, 1, 0.8, 1.15, 1, 1][f], "z": [0, 4, 0, 0, 0, 4, 0, 0][f]},
        "g0": {"r": 4 * math.sin(p - 1.0)}, "driver": {"z": 0.6 * math.sin(p - 1.0)},
    })


WALK_DUST = {k: [{"kind": "dust", "ground": (AXLES[0] - 10.0, 0.0), "size_lu": 6.0 if k % 2 else 4.5, "puffs": 3,
                  "seed": 220 + k, "spread": 1.0, "dir": -1.0}] for k in range(8)}

# attack: moves.HEAVY_MELEE_MS (1230 ms, impact at step 6); 10 unique poses on 12 steps
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#        ready turn  settle HOLD quiver lead BOOM rock  fwd  settle
A_TR = [0.0, -4.0, -2.0, -1.0, -1.4, -1.0, 2.0, 1.0, 0.0, 0.0]
A_REC = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -9.0, -5.0, -1.0, 0.0]
A_X = [0.0, 0.0, 0.0, 0.0, 0.0, 0.5, -6.0, -3.0, 1.5, 0.0]
A_R = [0.0, 0.0, 0.0, -0.4, -0.5, -0.6, 2.4, 1.0, -0.8, 0.0]
A_Q = [0.0, 0.0, -0.01, -0.02, -0.02, 0.0, 0.07, -0.04, 0.0, 0.0]


def _attack_pose(f, elevated=False):
    up = [0, 4, 9, 12, 12.5, 12, 14, 12, 6, 0][f] if elevated else 0.0
    pose = merge(_wheels(0), M.body_about((AXLES[0], 0, 0), x=A_X[f], r=A_R[f] + (1.5 if elevated and f == 6 else 0.0),
                                          q=A_Q[f], z=(3.0 if elevated and f == 6 else 0.0)), {
        "turret": {"r": A_TR[f]},
        "barrel": {"x": A_REC[f], "r": up},
        "flash": {"show": f == 6},
        "smoke": {"show": f in (6, 7, 8), "s": [1, 1, 1, 1, 1, 1, 0.8, 1.1, 1.25, 1][f],
                  "x": [0, 0, 0, 0, 0, 0, 0, 4, 8, 0][f], "z": [0, 0, 0, 0, 0, 0, 0, 4 + up, 8 + up, 0][f]},
        "puff": {"show": f in (6, 7, 8), "s": 1.2},
        "whistle": {"show": elevated and f in (3, 4, 5, 6, 7), "s": [1, 1, 1, 0.8, 1.0, 1.1, 1.3, 1.4, 1, 1][f]},
        "g0": {"z": -3.0 if f in (6, 7) else 0.0}, "driver": {"z": -2.0 if f in (6, 7) else 0.0},
    })
    return pose


def _ov(elevated=False):
    tip = (MUZZLE[0], MUZZLE[1], MUZZLE[2])
    return {6: [{"kind": "burst", "joint": "barrel", "point": tip, "r0_lu": 10.0, "r1_lu": 22.0, "n": 8,
                 "a0": -50.0, "arc": 100.0, "color": "#FFF4D6"},
                {"kind": "dust", "ground": (AXLES[0] - 12.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 241,
                 "spread": 1.2, "dir": -1.0}]}


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=_ov(), extra={"holdStep": 3, "holdLoop": [3, 4]})


def _attack_b():
    reuse = {0: ("attack", 0), 9: ("attack", 9)}
    return M.clip("attack_b", [_attack_pose(f, elevated=True) for f in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=_ov(True), reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


# attack_alt: the roof machine gun (6 frames in 450 ms, the shots on frame 3)
ALT_MS = [60, 70, 110, 60, 70, 80]
ALT_IMPACT = 3


def _alt_pose(f):
    return merge(_idle(0), {
        "g0": {"r": [-4, -8, -9, 6, 8, 2][f], "x": [1.0, 2.0, 2.0, -1.0, -1.5, 0.0][f]},
        "mg0": {"r": [2.0, 5.0, 5.0, 3.0, -4.0, 0.0][f]},
        "g0_eyes": {"sz": 0.35 if f in (1, 2, 3) else 1.0},
        "flash0": {"show": f == 3},
    })


def _attack_alt():
    ov = {3: [{"kind": "burst", "joint": "mg0", "point": MG_MUZZLE, "r0_lu": 6.0, "r1_lu": 11.0, "n": 5,
               "a0": -50.0, "arc": 100.0}]}
    return M.clip("attack_alt", [_alt_pose(f) for f in range(6)], ALT_MS, impact=ALT_IMPACT, overlays=ov,
                  extra={"noMuzzle": True})


def _hit(k):
    a = M.HIT_AMT[k]
    duck = [0.8, 1.0, 0.6, 0.1, 0.0][k]
    return merge(_wheels(-6 * a), {
        "body": dict(squash([-0.06, 0.04, 0.02, -0.02, 0.0][k]), x=-3.0 * max(a, 0) + 1.0 * min(a, 0)),
        "hull": {"r": 2.0 * a, "z": [-1.5, 1.5, 0.5, -0.3, 0.0][k]},
        "g0": {"z": -6.0 * duck, "r": 8 * a}, "driver": {"z": -3.0 * duck},
        "g0_eyes": {"sz": 0.35 if k < 2 else 1.0}, "turret": {"r": 3 * a},
    })


D_BODY = [dict(x=-2, z=0, r=1, q=-0.04), dict(x=0, z=6, r=-2, q=0.04), dict(x=3, z=10, r=-5, q=0.02),
          dict(x=5, z=8, r=-8, q=-0.06), dict(x=6, z=5, r=-9, q=-0.08), dict(x=6, z=5, r=-9, q=-0.07),
          dict(x=6, z=5, r=-9, q=-0.07), dict(x=6, z=5, r=-9, q=-0.08, s=0.97)]
D_WHEEL = [(0, 0, 0), (-6, 6, 40), (-14, 10, 100), (-24, 6, 170), (-32, -1, 240), (-34, -2, 250),
           (-34, -2, 250), (-34, -2, 250)]


def _die(k):
    b = D_BODY[k]
    wx, wz, wr = D_WHEEL[k]
    pose = merge(_wheels(0), M.body_about((AXLES[3], 0, 0), x=b["x"], z=b["z"], r=b["r"], q=b["q"], s=b.get("s", 1.0)), {
        "ties": {"x": 0}, "rails": {"r": 0},
        "turret": {"r": [0, 6, 12, 16, 18, 18, 18, 18][k], "rz": [0, 8, 16, 20, 20, 20, 20, 20][k]},
        "barrel": {"r": [0, -6, -14, -20, -22, -22, -22, -22][k]},
        "wn0": {"x": wx, "z": wz, "r": wr},
        "boom": {"show": k in (1, 2), "s": [1, 1.0, 1.25, 1, 1, 1, 1, 1][k]},
        "wsmoke": {"show": k >= 2, "s": [1, 1, 0.6, 0.8, 1.0, 1.15, 1.3, 1.4][k], "z": [0, 0, 0, 4, 8, 12, 16, 20][k]},
        "puff": {"show": True, "s": [1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0][k]},
        "g0": {"z": [0, 4, 8, 6, 2, 0, 0, 0][k], "r": [8, 14, 20, 30, 34, 34, 34, 34][k]},
        "driver": {"z": [0, -1, -2, -3, -3, -3, -3, -3][k]},
    })
    if k >= 1:
        pose.update({"g0_eyes": {"hide": True}, "g0_ko": {"show": True}})
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)], [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], [WALK_MS] * 8, loop=True, overlays=WALK_DUST),
        _attack_clip(),
        _attack_b(),
        _attack_alt(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
