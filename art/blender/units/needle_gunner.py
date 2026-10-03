"""Needle Gunner: Future Age common ranged, Skirmisher (CONTENT_PLAN 5.7). Twin-barrel needle gun, ~70 lu.

Look (A11, Future palette): a light trooper in glossy white armour over a charcoal suit, the hard-hat
helmet in team colour with a dark half visor (mint eyes that act), a team chest plate with the hex, team
shoulder pads and a backpack with a team band. The gun is a stubby charcoal receiver with a white shroud
and a TWIN rotary barrel cluster (two white barrels on a mint-ringed hub that spins), a team drum magazine
underneath and a magenta muzzle ring. Needles are thin mint darts.

"A viewer expects a minigunner: the barrels spin up with a whine, then a fast stitch of light shots."

Animation (ANIM_SPEC G1 jog at card 75 x 1.25 = 93.75 lu/s, appendix B guns; the sim fires every 0.5 s):
  idle      the gun at low ready, the barrels idle-turn, he flicks the drum with the far hand, a blink
  walk      walk v3 jog with the gun carried at port across the chest
  attack    SPIN-UP BURST: shoulders the gun, the barrels spin up (a mint ring smear at the hub, the held
            extreme), one needle snaps out (a flash), the gun shudders
  attack_b  HIP STITCH: a low wide crouch with the gun braced at the hip, spinning (the held extreme), one
            needle from the hip, the muzzle jumps up
  hit       light: the head snaps back, eyes > <
  die       D1 fling and spin, the gun flung away, X eyes
"""
from ageborn_art import kit_future as KF
from ageborn_art import kit_future_wave as W
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "needle_gunner"
GAIT_NAME = "biped"
NAME = "Needle Gunner"
HEIGHT_LU = 70
CANVAS = (300, 240)
FEET = (110, 210)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (46, 30)}
NO_RETIME = True

G0 = (4.0, -15.0, 27.0)      # gun grip at rest (character space); the gun is a torso child
FORE = 13.0
MUZZLE = (G0[0] + 40.0, G0[1], G0[2] + 3.0)
HUB = (G0[0] + 20.0, G0[1], G0[2] + 3.0)


def _gun(rig, j):
    gx, gy, gz = G0
    g = Geo().blob((gx + 9.0, gy + 1, gz + 3.5), (10.0, 3.4, 4.4), p=3.6)       # receiver
    g.blob((gx - 6, gy + 1, gz + 2.5), (5.6, 2.6, 3.6), p=3.4, rot=(0, 10, 0))  # stock
    g.blob((gx + 0.5, gy + 1, gz - 1.5), (2.2, 2.0, 4.2), p=2.8, rot=(0, -12, 0))
    g.blob((gx + 13.0, gy + 2, gz - 1.0), (2.0, 1.8, 3.4), p=2.8, rot=(0, -8, 0))
    rig.part(j, g, F.SUIT)
    g = Geo().blob((gx + 10.0, gy + 1, gz + 7.6), (9.0, 3.0, 2.2), p=3.4)      # white shroud
    rig.part(j, g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(0, -1.0), (5.0, -0.8), (5.0, 3.6), (0, 3.8)], (gx + 6.0, gy + 1, gz - 3.4),
                    (gx + 6.0, gy + 1, gz - 6.6), segs=18)                       # drum magazine (team)
    rig.part(j, g, team=True, outline=0.6)
    hx, hy, hz = HUB
    g = Geo().lathe([(0, -0.8), (4.6, -0.7), (4.6, 0.7), (0, 0.8)], (hx - 1.0, hy + 1, hz), (hx, hy + 1, hz), segs=16)
    g.lathe([(0, -0.8), (4.6, -0.7), (4.6, 0.7), (0, 0.8)], (hx + 8.0, hy + 1, hz), (hx + 9.0, hy + 1, hz), segs=16)
    rig.part(j, g, glow=W.MINT, outline=1.0, outline_hex=F.SUIT)
    g = Geo().capsule((hx, hy + 1, hz + 2.2), (MUZZLE[0] - 2.0, hy + 1, hz + 2.2), 1.6)
    g.capsule((hx, hy + 1, hz - 2.2), (MUZZLE[0] - 2.0, hy + 1, hz - 2.2), 1.6)
    rig.part(j, g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(2.0, 0), (4.6, 0.2), (4.6, 1.6), (2.2, 1.8)], (MUZZLE[0] - 2.5, hy + 1, hz),
                    (MUZZLE[0] + 1.0, hy + 1, hz), segs=18)
    rig.part(j, g, F.MAGENTA)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, helmet_kind="hardhat", team_greave=False)
    rig.joint("gun", "torso", G0)
    _gun(rig, "gun")
    # the spinning hub: a mint ring smear shell shown while spinning
    hx, hy, hz = HUB
    rig.joint("spin", "gun", HUB, hidden=True)
    g = Geo().lathe([(3.0, -4.6), (6.0, -4.4), (6.0, 4.4), (3.0, 4.6)], (hx + 4.5, hy + 1.2, hz - 0.01),
                    (hx + 4.5, hy + 1.2, hz + 0.01), segs=24)
    g = Geo().capsule((hx, hy + 0.4, hz + 4.6), (MUZZLE[0] - 3.0, hy + 0.4, hz + 4.6), 1.0)
    g.capsule((hx, hy + 0.4, hz - 4.6), (MUZZLE[0] - 3.0, hy + 0.4, hz - 4.6), 1.0)
    rig.part("spin", g, glow=W.MINT_CORE, outline=0.8, outline_hex=W.MINT)
    rig.track("muzzle", "gun", MUZZLE)
    mx, my, mz = MUZZLE
    rig.joint("flash", "gun", MUZZLE, hidden=True)
    g = Geo().blob((mx + 7.0, my - 1, mz), (7.6, 1.4, 2.8), p=2.0)
    g.blob((mx + 3.6, my - 1, mz + 2.4), (5.0, 1.3, 1.6), p=2.0, rot=(0, -34, 0))
    g.blob((mx + 3.6, my - 1, mz - 2.4), (5.0, 1.3, 1.6), p=2.0, rot=(0, 34, 0))
    rig.part("flash", g, glow=W.MINT, outline=0)
    g = Geo().blob((mx + 4.6, my - 2, mz), (4.6, 1.2, 1.6), p=2.0)
    rig.part("flash", g, glow=F.WHITE, outline=0)
    KI.loose(rig, "gun_loose", G0, lambda j: _gun(rig, j))


def hold(gx, gz, deg):
    return F.hold2("gun", G0, FORE, gx, gz, deg)


LOW = (6.0, 25.0, -8.0)
STANCE = merge(hold(*LOW), {"torso": {"r": -2.0}})


def _idle(f):
    flick = [0.0, 0.0, 0.6, 1.0, 0.4, 0.0][f]
    pose = M.idle_v2(f, STANCE, frames=6, blink=1, face_blink=KF.glyph("g_blink"))
    pose = merge(pose, {"gun": {"r": -8.0 + 1.4 * (f % 3 - 1)}})
    if flick > 0:
        a, fo = F.ik2(F.SH, (LOW[0] + 4.0, LOW[1] - 6.0 + 2.0 * flick))
        pose.update(F.arm("l", a, fo))
    if f in (2, 3):
        pose["spin"] = {"show": f == 3}
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 93.75
LEGS = KF.legs_ik()
GAIT = KF.jog_gait(LEGS, SPEED, cycle_ms=600)
PORT = (1.0, 23.0, 32.0)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(F.hold2("gun", G0, 8.5, PORT[0], PORT[1] + 1.0 * lag, PORT[2] - 4.0 * lag),
                     {"head": {"r": 4.0 - 2.0 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -3.0}}, GAIT, legs=LEGS, lean=-10.0, twist=6.0, nod=3.0,
                     extra=extra, report=report)


# -- attack: spin-up burst (500 ms like the sim interval, impact at 250 ms = 0.5) --------------------
ATTACK_MS = [40, 60, 100, 50, 50, 60, 60, 80]
ATTACK_IMPACT = 4
#     raise aim  HOLD spin2 FIRE shud settle low
GX = [7.0, 7.5, 7.5, 7.5, 7.5, 6.0, 6.5, 6.0]
GZ = [30.0, 34.0, 34.0, 34.0, 34.5, 35.5, 31.0, 26.0]
DEG = [-4.0, 0.0, 0.0, 0.0, 0.0, 10.0, 2.0, -6.0]
BX = [0.0, 0.5, 1.0, 1.0, 0.0, -2.5, -1.0, 0.0]
BZ = [0.0, -0.6, -1.4, -1.2, -0.6, 0.2, 0.0, 0.0]
BQ = [0.0, -0.03, -0.07, -0.06, 0.04, -0.06, 0.02, 0.0]
TR = [-2, -4, -6, -6, -3, 4, 0, -2]
EYES = ["eyes", "g_angry", "g_angry", "g_squint", "g_squint", "g_angry", "eyes", "eyes"]


def _a_pose(f):
    pose = merge(hold(GX[f], GZ[f], DEG[f]), {
        "torso": {"r": TR[f]}, "head": {"r": TR[f] - 2, "x": 1.0 if f in (1, 2, 3, 4) else 0.0},
        "thigh_r": {"r": [4, 10, 14, 14, 12, 8, 4, 2][f]}, "shin_r": {"r": [0, -4, -8, -8, -6, -2, 0, 0][f]},
        "thigh_l": {"r": [-4, -10, -14, -14, -16, -12, -6, -4][f]}, "shin_l": {"r": [0, -2, -6, -6, -4, 0, 0, 0][f]},
        "spin": {"show": f in (2, 3, 4)}, "flash": {"show": f == 4},
    }, M.body_about((0, 0, 22), x=BX[f], z=BZ[f], q=BQ[f]))
    if f == 3:
        pose["body"]["x"] += 0.35
    return KI.ground_feet(RIG, merge(pose, KF.glyph(EYES[f])), LEGS)


def _spin_ov(k, rr=(6.5, 10.0)):
    return [{"kind": "rings", "joint": "gun", "point": (HUB[0] + 4.0, HUB[1], HUB[2]), "radii_lu": rr,
             "a0": -80.0, "a1": 80.0, "color": W.MINT_CORE}]


def _fire_ov(seed):
    return [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 6.0, "r1_lu": 11.0, "n": 5,
             "a0": -60.0, "arc": 120.0, "color": W.MINT_CORE}]


def _attack_clip():
    ov = {2: _spin_ov(2), 3: _spin_ov(3, (7.5, 11.5)), 4: _fire_ov(141)}
    return M.clip("attack", [_a_pose(f) for f in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 2})


# -- attack B: hip stitch ---------------------------------------------------------------------------
B_GX = [5.0, 3.0, 2.0, 2.5, 3.0, 1.0, 4.0]
B_GZ = [26.0, 21.5, 20.0, 20.0, 20.5, 23.0, 25.0]
B_DEG = [-6.0, 4.0, 6.0, 6.0, 2.0, 24.0, 8.0]
B_BX = [0.0, -0.5, -1.0, -1.0, -1.0, -3.0, -1.0]
B_BZ = [-2.0, -6.0, -8.0, -8.0, -7.0, -5.0, -2.5]
B_TR = [-4, 4, 7, 7, 6, 12, 4]
B_THR = [10, 24, 30, 30, 30, 24, 12]
B_SHR = [-6, -18, -24, -24, -22, -16, -8]
B_THL = [-10, -22, -28, -28, -30, -24, -12]
B_SHL = [-4, -16, -22, -22, -20, -12, -6]
B_EYES = ["g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_hurt", "eyes"]


def _b_pose(i):
    if i == 7:
        return _a_pose(7)
    k = i
    pose = merge(hold(B_GX[k], B_GZ[k], B_DEG[k]), {
        "torso": {"r": B_TR[k]}, "head": {"r": -B_TR[k] * 0.6},
        "thigh_r": {"r": B_THR[k]}, "shin_r": {"r": B_SHR[k]},
        "thigh_l": {"r": B_THL[k]}, "shin_l": {"r": B_SHL[k]},
        "spin": {"show": k in (2, 3, 4)}, "flash": {"show": k == 4},
    }, M.body_about((0, 0, 22), x=B_BX[k], z=B_BZ[k]))
    if k == 3:
        pose["body"]["x"] += 0.3
    return KI.ground_feet(RIG, merge(pose, KF.glyph(B_EYES[k])), LEGS)


def _attack_b():
    ov = {2: _spin_ov(2), 3: _spin_ov(3, (7.5, 11.5)),
          4: _fire_ov(142) + [{"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 143,
                                "spread": 0.8, "color": W.DUST}]}
    return M.clip("attack_b", [_b_pose(i) for i in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse={7: ("attack", 7)}, extra={"holdStep": 2})


def _hit(k):
    base = {"torso": {"r": -2.0}} if M.HIT_AMT[k] > 0 else STANCE
    return W.hit_pose(k, base, lambda a: hold(LOW[0] - 2 * max(a, 0), LOW[1] + 2 * max(a, 0), LOW[2] + 18 * a))


GUN_PATH = [None, (6, 14, 60), (10, 26, 170), (14, 28, 300), (18, 16, 430), (22, 0, 560),
            (24, -20, 700), (25, -24, 720), (25, -24, 720), (25, -24, 720)]


def _die(k):
    return W.die_d1(k, STANCE, HEIGHT_LU, prop="gun", prop_path=GUN_PATH)


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=500, attack_impact_at=0.5))
