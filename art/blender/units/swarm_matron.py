"""Swarm Matron: Cosmic Age epic Summoner (CONTENT_PLAN 5.8, X0 M3). A six-legged void brood mother, ~70 lu.

Look (A11, Cosmic palette): a big alien insect: a raised violet chitin thorax with star-white plates, a head with a
dark face mask and two big light violet glyph eyes that act, curved star-white mandibles and two feelers; six
jointed violet legs (the far three darker) on pointed star-white feet; a huge bulbous team egg sac at the back
with a star-white band and glowing mint eggs that pulse. Swarmlings hatch from the sac (the game spawns them).

"A viewer expects a brood queen bug: a creepy six-legged scuttle, it rears up and spits a glob, and its egg sac
throbs."

Animation (ANIM_SPEC G4/G7 multi-leg scuttle at card 60 x 1.25 = 75 lu/s: a tripod gait, 8 frames in 720 ms, the
legs by IK with planted feet):
  idle      the sac throbs, the feelers twitch, the mandibles click, a blink
  walk      tripod scuttle: three legs down at a time, the body bobbing and swaying, the sac wobbling a beat late
  attack    REAR AND SPIT: rears up on the back legs with the front legs raised and the head back (the held
            extreme), then snaps forward and spits a glob (the mouth flash)
  attack_b  LOW LUNGE SPIT: crouches low with the head pulled in (the held extreme), then lunges forward along the
            ground and spits low
  hit       a hard jolt with the legs splaying, eyes > <
  die       D4-style flop: rolls onto its back, legs curled up, X eyes
"""
import math

from ageborn_art import gait as GK
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_cosmic_wave as CW
from ageborn_art import kit_future as KF
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge
from ageborn_art.colors import scale as darker
from ageborn_art.geometry import Geo

SLUG = "swarm_matron"
GAIT_NAME = "walker"
NAME = "Swarm Matron"
HEIGHT_LU = 72
YAW_DEG = -14.0
CANVAS = (420, 320)
FEET = (190, 286)
ANCHORS = {"head": (24, 62), "hitCenter": (0, 34), "muzzle": (40, 44)}
NO_RETIME = True

HULL_Z = 34.0
HIP_Z = 32.0
THIGH, SHIN = 20.0, 26.0
LEG_X = {"fr": 12.0, "mr": 0.0, "br": -12.0, "fl": 11.0, "ml": -1.0, "bl": -13.0}
LEG_Y = {"fr": -9.0, "mr": -10.0, "br": -9.0, "fl": 9.0, "ml": 10.0, "bl": 9.0}
FOOT_X = {"fr": 34.0, "mr": 6.0, "br": -30.0, "fl": 32.0, "ml": 4.0, "bl": -32.0}
GROUND = 1.5
HEAD = (24.0, 0.0, 46.0)
MOUTH = (34.0, -3.0, 40.0)
TRIPOD = {"fr": 0.0, "ml": 0.0, "br": 0.0, "fl": 0.5, "mr": 0.5, "bl": 0.5}


def _leg(rig, n):
    x, y = LEG_X[n], LEG_Y[n]
    far = n.endswith("l")
    sh = (lambda c: darker(c, 0.78)) if far else (lambda c: c)
    rig.joint(f"thigh_{n}", "hull", (x, y, HIP_Z))
    rig.joint(f"shin_{n}", f"thigh_{n}", (x, y, HIP_Z - THIGH))
    # modelled straight down (the IK bends the knee high and out, an insect leg)
    g = Geo().sphere((x, y, HIP_Z), 3.4, cuts=3)
    g.capsule((x, y, HIP_Z), (x, y, HIP_Z - THIGH), 2.8, 2.4)
    rig.part(f"thigh_{n}", g, sh(CW.VIOLET), finish="gloss", outline_hex=CW.VIOLET_DK)
    g = Geo().sphere((x, y, HIP_Z - THIGH), 2.8, cuts=3)
    g.capsule((x, y, HIP_Z - THIGH), (x, y, HIP_Z - THIGH - SHIN + 3.0), 2.2, 1.4)
    rig.part(f"shin_{n}", g, sh(CW.VIOLET_DK), finish="gloss")
    g = Geo().blob((x, y, HIP_Z - THIGH - SHIN + 2.0), (1.8, 2.0, 3.6), p=2.4, taper=(1.0, 0.4))
    rig.part(f"shin_{n}", g, sh(CW.STAR), finish="gloss", outline_hex=CW.STAR_TRIM)
    rig.track(f"_foot_{n}", f"shin_{n}", (x, y, HIP_Z - THIGH - SHIN))


RIG = None


def build(rig):
    global RIG
    RIG = rig
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, HULL_Z))
    for n in ("bl", "ml", "fl"):
        _leg(rig, n)
    # the egg sac at the back (team), a star-white band and mint eggs
    rig.joint("sac", "hull", (-14.0, 0, HULL_Z + 2.0))
    g = Geo().blob((-24.0, 0, HULL_Z + 8.0), (18.0, 15.0, 15.0), p=2.2, taper=(0.9, 1.1))
    rig.part("sac", g, team=True)
    g = Geo().lathe([(15.4, -1.2), (15.9, -0.6), (15.9, 0.6), (15.4, 1.2)], (-18.0, 0, HULL_Z + 8.0),
                    (-17.0, 0, HULL_Z + 8.0), segs=28)
    rig.part("sac", g, CW.STAR, finish="gloss", outline_hex=CW.STAR_TRIM)
    g = Geo()
    for x, z, r in ((-30.0, HULL_Z + 12.0, 2.4), (-26.0, HULL_Z + 3.0, 2.0), (-34.0, HULL_Z + 5.0, 1.8), (-22.0, HULL_Z + 16.0, 1.8)):
        g.sphere((x, -14.2, z), r, cuts=3)
    rig.part("sac", g, glow=CW.MINT, outline=0.8, outline_hex="#1C8A6A")
    # the thorax: violet chitin with star-white plates
    g = Geo().blob((4.0, 0, HULL_Z + 4.0), (16.0, 10.0, 9.0), p=2.4, taper=(0.9, 1.1))
    rig.part("hull", g, CW.VIOLET, finish="gloss", outline_hex=CW.VIOLET_DK)
    g = Geo().blob((4.0, 0, HULL_Z + 8.0), (13.0, 10.6, 5.0), p=2.6)
    g.clip((0, 0, HULL_Z + 7.0), (0, 0, -1))
    rig.part("hull", g, CW.STAR, finish="gloss", outline_hex=CW.STAR_TRIM)
    g = Geo().blob((4.0, 0, HULL_Z + 12.6), (8.0, 6.0, 1.6), p=2.6)
    rig.part("hull", g, team=True, outline=0.6)
    # the head on a neck joint: a dark face mask with glyph eyes, mandibles and feelers
    rig.joint("head", "hull", (16.0, 0, HULL_Z + 6.0))
    hx, hy, hz = HEAD
    g = Geo().blob(HEAD, (10.0, 9.0, 8.0), p=2.3)
    rig.part("head", g, CW.VIOLET, finish="gloss", outline_hex=CW.VIOLET_DK)
    mask = Geo().blob((hx + 4.0, -1.0, hz + 0.6), (6.4, 8.6, 5.6), p=2.6)
    KF.visor_face(rig, "head", [mask], (hx + 8.4, hz + 1.4), eye_dx=(0.0, 4.2), eye_rx=2.4, eye_rz=3.0,
                  color=KC.VIO_EYE, core=K.VIOLET_CORE, yaw_deg=YAW_DEG)
    rig.part("head", mask, CW.VOID, finish="gloss", outline_hex=CW.VOID_DK)
    for i, y in enumerate((-5.0, 5.0)):
        rig.joint(f"mand{i}", "head", (hx + 7.0, y, hz - 4.0))
        g = Geo().capsule((hx + 7.0, y, hz - 4.0), (hx + 12.0, y * 0.6, hz - 8.0), 1.6, 0.8)
        g.capsule((hx + 12.0, y * 0.6, hz - 8.0), (hx + 14.0, y * 0.2, hz - 6.0), 0.8, 0.5)
        rig.part(f"mand{i}", g, CW.STAR, finish="gloss", outline_hex=CW.STAR_TRIM)
        rig.secondary(f"feel{i}", "head", (hx + 2.0, y, hz + 6.0), (hx + 8.0, y * 1.4, hz + 18.0), max_deg=22, gain=1.4)
        g = Geo().capsule((hx + 2.0, y, hz + 6.0), (hx + 6.0, y * 1.3, hz + 14.0), 0.8, 0.6)
        g.capsule((hx + 6.0, y * 1.3, hz + 14.0), (hx + 12.0, y * 1.5, hz + 17.0), 0.6, 0.5)
        rig.part(f"feel{i}", g, CW.VIOLET_DK, outline=0.6)
        g = Geo().sphere((hx + 12.4, y * 1.5, hz + 17.2), 1.4, cuts=2)
        rig.part(f"feel{i}", g, glow=CW.MINT, outline=0.5, outline_hex="#1C8A6A")
    rig.track("muzzle", "head", MOUTH)
    rig.joint("glob", "head", MOUTH, hidden=True)
    g = Geo().sphere(MOUTH, 2.6, cuts=3)
    rig.part("glob", g, glow=CW.MINT, outline=0.8, outline_hex="#1C8A6A")
    K.star_burst(rig, "head", (MOUTH[0] + 1.6, MOUTH[1], MOUTH[2]), size=1.0, name="flash")
    K.sparks(rig, "hull", (6.0, -11.0, HULL_Z + 6.0), color=CW.MINT, size=1.0, name="sparks", seed=6)
    for n in ("br", "mr", "fr"):
        _leg(rig, n)
    rig.track("clubHead", "head", MOUTH)


LEGS = {n: GK.Leg(f"thigh_{n}", f"shin_{n}", (LEG_X[n], LEG_Y[n], HIP_Z - THIGH - SHIN), bend=(-1.0 if n[0] == "f" else 1.0)) for n in LEG_X}


def stand(dx=0.0, spread=0.0):
    return {n: (LEGS[n], FOOT_X[n] + (spread if n.startswith("f") else (-spread if n.startswith("b") else 0.0)) + dx,
                GROUND, 0.0) for n in LEGS}


def _pose(p, dx=0.0, spread=0.0):
    return GK.solve(RIG, p, stand(dx, spread))


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    click = [0, 14, 0, 0, 10, 0][f]
    pose = {"hull": {"z": 1.0 * c, "r": 0.8 * lag}, "sac": {"s": 1.0 + 0.05 * lag},
            "mand0": {"r": click}, "mand1": {"r": -click}, "head": {"r": 2 * lag}}
    pose = merge(pose, KF.glyph("g_blink" if f == 3 else "eyes"))
    return _pose(pose)


SPEED = 75.0
GAIT = GK.Gait(8, 720, SPEED, GK.quad_feet(LEGS, TRIPOD, x_off={n: FOOT_X[n] - LEG_X[n] for n in LEGS}, ground=GROUND),
               0.5, yaw_deg=YAW_DEG, scale=1.0, lift=7.0, reach=1.0, toe_off=0.0, heel_strike=0.0, lift_peak=0.45)


def _walk(f, report=None):
    def extra(ctx):
        p = ctx["p"]
        return merge({"sac": {"r": 3.0 * math.sin(p - 1.2), "s": 1.0 + 0.03 * math.sin(2 * p - 1.0)},
                      "head": {"r": 3.0 * math.sin(2 * p - 0.6)}, "hull": {"rz": 1.0 * math.sin(p)}},
                     KF.glyph("eyes"))
    return GK.quad_walk(RIG, f, GAIT, {}, trunk="hull", base_z=-1.5, bob=4.6, beats=2, pitch=1.0, roll=2.0,
                        extra=extra, report=report)


# -- attack: rear and spit (800 ms, the glob leaves at 400 ms = 0.5) -------------------------------------
ATTACK_MS = [60, 80, 100, 160, 100, 100, 80, 60, 60]
ATTACK_IMPACT = 4
A_HR = [0, 8, 16, 18, -6, -4, 0, 0, 0]
A_HZ = [0, 2, 4, 5, -1, 0, 0, 0, 0]
A_HD = [0, 10, 18, 20, -14, -8, -2, 0, 0]
A_X = [0, -1, -2, -2.5, 3, 2, 1, 0, 0]
A_EYES = ["eyes", "g_angry", "g_angry", "g_squint", "g_wide", "g_angry", "eyes", "eyes", "eyes"]


def _attack_pose(f, hr, hz, hd, hx, eyes, glob=True):
    pose = {"hull": {"r": hr, "z": hz, "x": hx}, "head": {"r": hd}, "sac": {"s": 1.0 + (0.06 if f in (2, 3) else 0.0)},
            "mand0": {"r": 20 if f in (2, 3) else (-6 if f == 4 else 0)}, "mand1": {"r": -20 if f in (2, 3) else (6 if f == 4 else 0)},
            "glob": {"show": glob and f in (2, 3)}, "flash": {"show": f == 4}}
    return merge(pose, KF.glyph(eyes))


def _a_pose(f):
    pose = _attack_pose(f, A_HR[f], A_HZ[f], A_HD[f], A_X[f], A_EYES[f])
    # the front pair lifts off the ground while it rears
    t = stand(A_X[f] * 0.0)
    if f in (1, 2, 3):
        up = [0, 6, 12, 14][f]
        for n in ("fr", "fl"):
            leg, x, z, a = t[n]
            t[n] = (leg, x - 2.0, z + up, a)
    return GK.solve(RIG, pose, t)


def _attack_clip():
    ov = {3: CW.rings_fx("head", MOUTH, (5.0, 8.0), CW.MINT_CORE, -70.0, 70.0),
          4: CW.fire_fx("head", MOUTH, CW.MINT_CORE, r=(6.0, 11.0), a0=-40.0) + CW.dust_fx(30.0, 441, size=5.0)}
    return M.clip("attack", [_a_pose(f) for f in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 3})


B_HR = [0, -4, -8, -9, 4, 2, 0, 0, 0]
B_HZ = [0, -4, -7, -8, -4, -2, 0, 0, 0]
B_HD = [0, -8, -14, -16, 8, 4, 0, 0, 0]
B_X = [0, -2, -4, -5, 6, 4, 1, 0, 0]


def _b_pose(f):
    if f in (0, 8):
        return _a_pose(f)
    pose = _attack_pose(f, B_HR[f], B_HZ[f], B_HD[f], B_X[f], A_EYES[f])
    return _pose(pose, spread=2.0 if f in (2, 3) else 0.0)


def _attack_b():
    ov = {3: CW.rings_fx("head", MOUTH, (5.0, 8.0), CW.MINT_CORE, -70.0, 70.0),
          4: CW.fire_fx("head", MOUTH, CW.MINT_CORE, r=(6.0, 11.0), a0=-20.0) + CW.dust_fx(36.0, 442, size=6.0)}
    return M.clip("attack_b", [_b_pose(f) for f in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse={0: ("attack", 0), 8: ("attack", 8)}, extra={"holdStep": 3})


def _hit(k):
    return _pose(merge({"hull": {"x": [-3.0, -4.0, -1.2, 0.8, 0.0][k], "r": [4.0, 6.0, 2.0, -1.0, 0.0][k]},
                        "sparks": {"show": k == 0}, "sac": {"s": [1.06, 1.1, 1.0, 0.98, 1.0][k]}},
                       KF.glyph("g_hurt" if k in (0, 1) else ("g_angry" if k == 2 else "eyes"))), spread=2.0 * M.HIT_AMT[k])


def _die(k):
    t = min(1.0, k / 4.0)
    pose = merge(M.body_about((0, 0, HULL_Z), x=-6 * t, z=[0, 4, 6, 2, -6, -10, -12, -12, -12, -12][k] if k < 10 else -12,
                              rx=-170 * min(1.0, k / 4.0), q=[-0.06, 0.04, 0.02, 0.0, -0.12, 0.04, -0.04, 0, -0.03, -0.06][k]),
                 {"sac": {"s": 1.0 - 0.1 * t}, "mand0": {"r": 20 * t}, "mand1": {"r": -20 * t}, "sparks": {"show": k in (0, 2)},
                  "feel0": {"r": -30 * t}, "feel1": {"r": 30 * t}})
    # the legs curl up toward the body as it flops over
    curl = 1.0 * t
    for n in LEG_X:
        pose[f"thigh_{n}"] = {"r": (30 if n.startswith("f") else -30 if n.startswith("b") else 0) * curl}
        pose[f"shin_{n}"] = {"r": (60 if n.endswith("r") else -60) * curl * 0.0 + 70 * curl}
    g = ["g_hurt", "g_wide", "g_spiral", "g_spiral", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x"][k]
    return merge(pose, KF.glyph(g))


def clips():
    rr = {0: ("attack", 0), 8: ("attack", 8)}  # noqa: F841 (B reuses A's read and settle frames)
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [150, 150, 150, 150, 150, 170], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "walker"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=800, attack_impact_at=0.5))
