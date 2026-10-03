"""Crab Mech: Future Age common heavy, Brute (armored mech, CONTENT_PLAN 5.7). Two big pincers, ~92 lu.

Look (A11, Future palette): a wide, low four-legged walker shaped like a crab: a flat white carapace with a
big team top shell carrying the pale hex, a charcoal belly, a front cockpit band with a dark visor and mint
robot eyes that act, two eye-stalk sensors with magenta tips and an antenna with a team pennant. Four
jointed legs (knees high, the far pair darker) end in pointed white feet. Two oversized pincer arms reach
forward: charcoal arms, white claws with team cuffs and a moving lower jaw.

"A viewer expects a robot crab: a fast tick-tick scuttle on pointy legs and a scissor snap of both claws."

Animation (ANIM_SPEC G7 walker at card 45 x 1.25 = 56.25 lu/s: a trot scuttle, 8 frames in 720 ms, the
legs by IK with planted feet, the hull bobbing with no squash):
  idle      the hull breathes on its legs, the claws click open and shut, the stalks twitch, a blink
  walk      the scuttle: diagonal leg pairs tick down, the hull bobs and sways, the claws bounce a beat late
  attack    SCISSOR SNAP: both claws pull back and gape wide (the held extreme), then lunge forward and
            snap shut on the target (impact lines, sparks), the hull dips
  attack_b  OVERHEAD SLAM: the near claw rises high over the carapace (the held extreme), then hammers
            down in front (dust)
  attack_c  LOW SWEEP: crouches low with the near claw swung back beside the legs (the held extreme), then
            sweeps it forward along the ground
  hit       mech: a hard jolt with no squash, eyes > <
  die       D6 collapse: the legs splay out, the hull slams down, the stalks droop, smoke, X eyes
"""
import math

from ageborn_art import gait as GK
from ageborn_art import kit_future as KF
from ageborn_art import kit_future_wave as W
from ageborn_art import kit_medieval as K
from ageborn_art import face as FC
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.colors import scale as darker
from ageborn_art.geometry import Geo

SLUG = "crab_mech"
GAIT_NAME = "walker"
NAME = "Crab Mech"
HEIGHT_LU = 102
YAW_DEG = -14.0
CANVAS = (460, 360)
FEET = (210, 326)
ANCHORS = {"head": (10, 88), "hitCenter": (0, 46)}
NO_RETIME = True

S = 1.15            # the whole crab, so the Heavy sits in the A11 Heavy band (100-120 lu)
HULL_Z = 46.0
HIP_Z = 40.0
THIGH, SHIN = 24.0, 27.0
LEG_X = {"fr": 16.0, "br": -16.0, "fl": 14.0, "bl": -18.0}
LEG_Y = {"fr": -15.0, "br": -15.0, "fl": 15.0, "bl": 15.0}
FOOT_X = {"fr": 30.0, "br": -30.0, "fl": 28.0, "bl": -32.0}     # planted foot x at rest (feet splayed)
GROUND = 2.0
CLAW_SH = {"r": (22.0, -20.0, 44.0), "l": (20.0, 18.0, 46.0)}
ARM_L = 16.0
CLAW_R_TIP = (CLAW_SH["r"][0] + ARM_L + 20.0, CLAW_SH["r"][1], CLAW_SH["r"][2])


def _leg(rig, n):
    x, y = LEG_X[n], LEG_Y[n]
    far = n.endswith("l")
    sh = (lambda c: darker(c, 0.8)) if far else (lambda c: c)
    rig.joint(f"thigh_{n}", "hull", (x, y, HIP_Z))
    rig.joint(f"shin_{n}", f"thigh_{n}", (x, y, HIP_Z - THIGH))
    g = Geo().sphere((x, y, HIP_Z), 4.4, cuts=3)
    g.capsule((x, y, HIP_Z), (x, y, HIP_Z - THIGH), 3.4, 3.0)
    rig.part(f"thigh_{n}", g, sh(F.SUIT), outline=0.8)
    g = Geo().blob((x, y - 0.6, HIP_Z - THIGH * 0.45), (3.6, 3.8, 7.0), p=2.6)            # thigh armour
    rig.part(f"thigh_{n}", g, sh(F.ARMOR), finish="gloss", outline_hex=F.TRIM)
    g = Geo().sphere((x, y, HIP_Z - THIGH), 3.6, cuts=3)
    g.capsule((x, y, HIP_Z - THIGH), (x, y, HIP_Z - THIGH - SHIN + 4.0), 2.8, 2.0)
    rig.part(f"shin_{n}", g, sh(F.GUNMETAL), finish="metal", outline=0.8)
    g = Geo().blob((x, y, HIP_Z - THIGH - SHIN + 3.0), (2.6, 2.8, 5.0), p=2.4, taper=(1.0, 0.4))   # pointed foot
    rig.part(f"shin_{n}", g, sh(F.ARMOR), finish="gloss", outline_hex=F.TRIM)
    if not far:
        g = Geo().blob((x, y - 2.6, HIP_Z - THIGH - 6.0), (2.0, 1.2, 4.0), p=2.6)         # team shin plate
        rig.part(f"shin_{n}", g, team=True, outline=0.4)
    rig.track(f"_foot_{n}", f"shin_{n}", (x, y, HIP_Z - THIGH - SHIN))


def _claw(rig, s):
    sx, sy, sz = CLAW_SH[s]
    far = s == "l"
    sh = (lambda c: darker(c, 0.82)) if far else (lambda c: c)
    rig.joint(f"carm_{s}", "hull", (sx, sy, sz))
    rig.joint(f"claw_{s}", f"carm_{s}", (sx + ARM_L, sy, sz))
    rig.joint(f"jaw_{s}", f"claw_{s}", (sx + ARM_L + 4.0, sy, sz - 2.0))
    g = Geo().sphere((sx, sy, sz), 5.0, cuts=3)
    g.capsule((sx, sy, sz), (sx + ARM_L, sy, sz), 3.6, 3.2)
    rig.part(f"carm_{s}", g, sh(F.SUIT), outline=0.8)
    cx = sx + ARM_L
    g = Geo().blob((cx + 1.5, sy, sz), (4.6, 5.6, 5.8), p=2.4)                             # team cuff
    rig.part(f"claw_{s}", g, team=True)
    g = Geo().blob((cx + 11.0, sy, sz + 2.6), (11.0, 5.0, 5.0), p=2.3, taper=(1.0, 0.45), rot=(0, 6, 0))  # upper claw
    rig.part(f"claw_{s}", g, sh(F.ARMOR), finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((cx + 13.0, sy, sz - 3.4), (9.0, 3.8, 2.8), p=2.3, taper=(1.0, 0.4), rot=(0, -8, 0))   # lower jaw
    rig.part(f"jaw_{s}", g, sh(F.ARMOR), finish="gloss", outline_hex=F.TRIM)
    if not far:
        g = Geo().blob((cx + 8.0, sy - 4.6, sz + 3.6), (5.0, 0.8, 1.8), p=2.6)
        rig.part(f"claw_{s}", g, team=True, outline=0.4)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    rig.joint("body", "root", (0, 0, 0), scale=S)
    rig.joint("hull", "body", (0, 0, HULL_Z))
    for n in ("bl", "fl"):
        _leg(rig, n)
    _claw(rig, "l")
    # carapace: charcoal belly, white rim, big team top shell, the hex
    g = Geo().blob((0, 0, HULL_Z - 3.0), (27.0, 19.0, 7.0), p=2.4)
    rig.part("hull", g, F.SUIT)
    g = Geo().blob((0, 0, HULL_Z + 2.0), (30.0, 21.0, 9.0), p=2.6, taper=(1.0, 0.9))
    rig.part("hull", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    shell = Geo().blob((-2.0, 0, HULL_Z + 5.0), (27.0, 19.0, 9.0), p=2.4)
    shell.clip((0, 0, HULL_Z + 4.0), (0, 0, -1))
    sf = FC.Face(rig, "hull", [shell])
    g = KF.hexmark(sf, Geo(), K.scr(sf, (-2.0, -12.0, HULL_Z + 10.0)), s=1.3, w=1.5)
    rig.part("hull", shell, team=True)
    rig.part("hull", g, KF.HEX_PALE, highlight=False, outline=0)
    KF.rivets(rig, "hull", [(-20.0 + 8.0 * i, -20.0, HULL_Z + 1.0) for i in range(6)], r=0.9)
    KF.strip(rig, "hull", [(-24.0, -19.6, HULL_Z - 3.0), (18.0, -19.6, HULL_Z - 3.0)], r=0.8)
    # cockpit band and visor face at the front
    g = Geo().blob((24.0, 0, HULL_Z + 3.0), (8.0, 14.0, 6.6), p=2.4)
    rig.part("hull", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    visor = Geo().blob((29.0, -1.0, HULL_Z + 3.4), (3.4, 11.0, 4.0), p=3.0)
    KF.visor_face(rig, "hull", [visor], (30.0, HULL_Z + 3.6), eye_dx=(0.0, 4.0), eye_rx=2.0, eye_rz=2.6, yaw_deg=YAW_DEG)
    rig.part("hull", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    # eye stalks and the antenna with a pennant (follow-through)
    for i, y in enumerate((-6.0, 5.0)):
        rig.secondary(f"stalk{i}", "hull", (18.0, y, HULL_Z + 8.0), (22.0, y, HULL_Z + 20.0), max_deg=14, gain=1.2)
        g = Geo().capsule((18.0, y, HULL_Z + 8.0), (21.0, y, HULL_Z + 18.0), 1.0)
        rig.part(f"stalk{i}", g, F.GUNMETAL, outline=0.6)
        g = Geo().sphere((21.5, y, HULL_Z + 19.5), 2.2, cuts=3)
        rig.part(f"stalk{i}", g, glow=F.MAGENTA, outline=0.8, outline_hex=F.MAGENTA)
    rig.secondary("antenna", "hull", (-18.0, 6.0, HULL_Z + 10.0), (-22.0, 6.0, HULL_Z + 34.0), max_deg=18, gain=1.3)
    g = Geo().capsule((-18.0, 6.0, HULL_Z + 10.0), (-21.5, 6.0, HULL_Z + 33.0), 0.9)
    rig.part("antenna", g, F.SUIT, outline=0.6)
    g = Geo().slab([(-21.0, HULL_Z + 32.0), (-36.0, HULL_Z + 28.0), (-21.0, HULL_Z + 24.0)], 6.0, 1.6)
    rig.part("antenna", g, team=True, outline=0.8)
    F.puff(rig, "hull", (-30.0, 0.0, HULL_Z + 6.0), size=1.4, name="vent", spread=1.3)
    F.sparks(rig, "hull", (CLAW_R_TIP[0] - 4.0, CLAW_R_TIP[1] - 2.0, CLAW_R_TIP[2]), name="sparks", size=1.2, seed=11)
    F.puff(rig, "root", (0.0, -10.0, 16.0), size=2.6, name="smoke", color="#B9BEC6", spread=1.6)
    for n in ("br", "fr"):
        _leg(rig, n)
    _claw(rig, "r")
    rig.track("clubHead", "claw_r", CLAW_R_TIP)


LEGS = {n: GK.Leg(f"thigh_{n}", f"shin_{n}", (LEG_X[n], LEG_Y[n], HIP_Z + HULL_Z - HULL_Z - THIGH - SHIN),
                  bend=(1.0 if n.startswith("f") else -1.0)) for n in LEG_X}
# the leg end points are in character space; the hips hang under the hull at HULL_Z
for _n, _l in LEGS.items():
    _l.end.z = HIP_Z - THIGH - SHIN


def stand(dx=0.0, spread=0.0, ground=GROUND):
    """Planted-feet targets for a still pose (the feet stay where they are while the hull moves)."""
    return {n: (LEGS[n], (FOOT_X[n] + (spread if n.startswith("f") else -spread) + dx) * S, ground * S, 0.0) for n in LEGS}


def claws(ra=0.0, rr=0.0, ja=0.0, la=0.0, lr=0.0, jl=0.0):
    """Claw arms: arm angle (up +), claw angle relative, jaw open (deg, + opens)."""
    return {"carm_r": {"r": ra}, "claw_r": {"r": rr}, "jaw_r": {"r": -ja},
            "carm_l": {"r": la}, "claw_l": {"r": lr}, "jaw_l": {"r": -jl}}


def _pose(p, dx=0.0, spread=0.0):
    return GK.solve(RIG, p, stand(dx, spread))


REST = claws(-8, 4, 6, -6, 2, 4)


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    click = [0, 18, 0, 0, 14, 0][f]
    pose = merge(REST, claws(2 * lag, 0, click, 2 * lag, 0, click * 0.6),
                 {"hull": {"z": 1.4 * c, "r": 0.8 * lag}, "stalk0": {"r": [0, 6, -4, 0, 0, 0][f]}})
    if f == 3:
        pose = merge(pose, KF.glyph("g_blink"))
    return _pose(pose)


SPEED = 56.25
GAIT = GK.Gait(8, 720, SPEED, GK.quad_feet(LEGS, GK.TROT, x_off={n: (FOOT_X[n] - LEG_X[n]) * S for n in LEGS}, scale=S, ground=GROUND),
               0.6, yaw_deg=YAW_DEG, scale=S, lift=9.0, reach=1.0, toe_off=0.0, heel_strike=0.0, lift_peak=0.45)


def _walk(f, report=None):
    def extra(ctx):
        p = ctx["p"]
        return merge(REST, claws(4 * math.sin(p - 1.0), 2 * math.sin(p - 1.4), 4 + 4 * math.sin(2 * p),
                                 4 * math.sin(p - 0.6), 2 * math.sin(p - 1.0), 3),
                     {"hull": {"rz": 3.0 * math.sin(p)}, "antenna": {"r": 0.0}})
    return GK.quad_walk(RIG, f, GAIT, {}, trunk="hull", base_z=-2.0, bob=1.8, beats=2, pitch=1.2, roll=2.0,
                        extra=extra, report=report)


def _attack_pose(ra, rr, ja, la, lr, jl, hx, hz, hr, k, spread=0.0, eyes=None):
    pose = merge(claws(ra, rr, ja, la, lr, jl), {"hull": {"x": hx, "z": hz, "r": hr}})
    if k in (6, 7):
        pose["sparks"] = {"show": k == 6}
        pose["vent"] = {"show": True}
    g = eyes or ("g_angry" if k in (1, 2, 3, 6, 7) else ("g_squint" if k in (4, 5) else "eyes"))
    return _pose(merge(pose, KF.glyph(g)), spread=spread)


#        read pull  gape  HOLD  smear smear IMP   over  recoil settle     (A: scissor snap)
A_RA = [-8, 4, 10, 12, 4, -6, -12, -12, -10, -8]
A_RR = [4, 10, 14, 16, 6, -2, -4, -4, 0, 4]
A_J = [6, 20, 34, 38, 30, 10, 0, 0, 4, 6]
A_HX = [0, -2, -4, -5, 0, 5, 8, 8, 4, 1]
A_HZ = [0, 0, 1, 1.5, 0, -2, -4, -3.5, -1.5, 0]
A_HR = [0, 2, 4, 5, 0, -3, -6, -5, -2, 0]


def _a_pose(f):
    return _attack_pose(A_RA[f], A_RR[f], A_J[f], A_RA[f] + 2, A_RR[f], A_J[f] * 0.9, A_HX[f], A_HZ[f], A_HR[f], f)


#        read lift  raise HOLD  smear smear IMP   over  recoil settle     (B: overhead slam)
B_RA = [-8, 30, 70, 84, 50, 0, -40, -38, -20, -8]
B_RR = [4, 30, 60, 70, 30, -10, -20, -18, -6, 4]
B_HZ = [0, 1, 2, 2.5, 1, -2, -5, -4.5, -2, 0]
B_HR = [0, 3, 6, 8, 2, -6, -10, -9, -4, 0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _attack_pose(B_RA[f], B_RR[f], 10, -6, 2, 4, [0, -1, -2, -3, 0, 3, 5, 5, 2, 0][f], B_HZ[f], B_HR[f], f)


#        read crouch swing HOLD smear smear IMP   over  recoil settle     (C: low sweep)
C_RA = [-8, -24, -36, -40, -30, -24, -22, -22, -16, -8]
C_RR = [4, -10, -20, -24, -10, 0, 6, 6, 4, 4]
C_RZ = [0, 16, 32, 40, 20, -10, -24, -22, -10, 0]
C_HZ = [0, -3, -5.5, -6.5, -6, -5, -5, -4, -2, 0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    p = _attack_pose(C_RA[f], C_RR[f], 12, -6, 2, 4, [0, -1, -2, -2, 1, 4, 6, 6, 3, 0][f], C_HZ[f], 0.0, f, spread=1.5)
    p.setdefault("carm_r", {})["rz"] = C_RZ[f]
    return p


SNAP = {"kind": "streak", "joint": "claw_r", "point": CLAW_R_TIP, "color": "#E9EDF2", "width_lu": 10.0, "white": 0.4}
SLAM = {"kind": "arc", "joint": "claw_r", "inner": (CLAW_R_TIP[0] - 12.0, CLAW_R_TIP[1], CLAW_R_TIP[2]),
        "outer": CLAW_R_TIP, "color": "#E9EDF2", "taper": 0.2, "white": 0.45, "t0": 0.0, "t1": 0.95, "lines": 3,
        "samples": 16}


def _fx(seed, a0, gx):
    return [{"kind": "burst", "joint": "claw_r", "point": CLAW_R_TIP, "r0_lu": 8.0, "r1_lu": 16.0, "n": 7, "a0": a0,
             "arc": 150.0, "color": "#FFF6D8"},
            {"kind": "dust", "ground": (gx, 0.0), "size_lu": 8.0, "puffs": 4, "seed": seed, "spread": 1.2,
             "color": W.DUST}]


def _heavy_clip(name, fn, smear, fx, reuse=None):
    ov = {4: [dict(smear, **{"from": 3})], 5: [dict(smear, **{"from": 4})], 6: [dict(smear, **{"from": 5})] + fx}
    return M.clip(name, [fn(f) for f in range(10)], M.HEAVY_MELEE_MS[:10] + [M.HEAVY_MELEE_MS[10] + M.HEAVY_MELEE_MS[11]],
                  impact=M.HEAVY_MELEE_IMPACT, smear=4, overlays=ov, sequence=list(range(10)) + [0],
                  reuse=reuse, extra={"holdStep": 3})


def _hit(k):
    return _pose(merge(REST,
                       {"hull": {"x": [-3.2, -4.4, -1.4, 0.8, 0.0][k], "r": [4.0, 6.0, 2.0, -1.0, 0.0][k]},
                        "sparks": {"show": k == 0}},
                       KF.glyph("g_hurt" if k in (0, 1) else ("g_angry" if k == 2 else "eyes"))))


def _die(k):
    t = min(1.0, k / 5.0)
    drop = [0, 2, -4, -10, -18, -22, -21, -22, -22, -22][k]
    pose = merge(claws(-8 + 10 * t, 4 + 6 * t, 30 * t, -6 + 8 * t, 2 + 4 * t, 24 * t),
                 {"hull": {"z": drop, "r": [0, 4, -2, -6, -4, -3, -3, -3, -3, -3][k], "x": 2 * t},
                  "stalk0": {"r": -40 * t}, "stalk1": {"r": -36 * t}, "sparks": {"show": k in (0, 2)},
                  "smoke": {"show": 3 <= k <= 8, "s": 0.6 + 0.08 * k, "z": 1.0 * k}})
    g = ["g_hurt", "g_wide", "g_spiral", "g_spiral", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x", "eyes_x"][k]
    pose = merge(pose, KF.glyph(g))
    # the legs splay: the feet slide out as the hull drops
    spl = 14.0 * t
    targets = {n: (LEGS[n], (FOOT_X[n] + (spl if n.startswith("f") else -spl)) * S, GROUND * S, 0.0) for n in LEGS}
    return GK.solve(RIG, pose, targets)


def clips():
    rr = {0: ("attack", 0), 9: ("attack", 9)}
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [150, 150, 150, 150, 150, 150], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "walker"),
        _heavy_clip("attack", _a_pose, SNAP, _fx(201, -60.0, 46.0)),
        _heavy_clip("attack_b", _b_pose, SLAM, _fx(202, -150.0, 46.0), rr),
        _heavy_clip("attack_c", _c_pose, SNAP, _fx(203, -20.0, 44.0), rr),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in M.HEAVY_DIE_KEEP], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
