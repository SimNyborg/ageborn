"""Carbineer: Industrial Age ranged (docs/design-lane-ages.md A17.10). Bullet (proj.bullet), 250 lu,
~68 lu.

Look (A17.12, Industrial palette): a frontier-style rifleman in a very wide-brimmed coal slouch hat
(the brim dips at the front and back) with a team band, a long team duster coat down to the shins
(lapels, brass buttons, a leather belt, a cream cog on the coat skirt, long coat tails that swing
behind him on follow-through), a cream neckerchief whose tails flutter, iron-blue trousers tucked
into tall boots with brass spurs, a dark moustache and a cartridge bandolier across the chest. He
carries a short lever-action carbine (brass receiver, wooden stock, big lever loop) at port arms.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    tips his hat with the far hand (the brim dips), weight shift, blink
  walk    jog: forward lean, the carbine bobbing at port arms, coat tails swinging
  attack  SNAP SHOT AND LEVER FLOURISH: snaps the carbine to his shoulder, squints down the sights
          (the held extreme), fires (one flash, a smoke puff), kicks, then flips the carbine up
          to the vertical with a crescent smear and throws the lever (a brass casing arcs away),
          snaps it home and brings the carbine down to port arms. The bullet leaves `muzzle` on
          the fire frame.
  hit     light: the head snaps back, the hat lifts, eyes squeezed
  die     D1 fling and spin: the hat pops off and lands behind him, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "carbineer"
NAME = "Carbineer"
HEIGHT_LU = 68
CANVAS = (296, 236)
FEET = (108, 208)
ANCHORS = {"head": (2, 67), "hitCenter": (0, 32), "muzzle": (54, 36)}
NO_RETIME = True

G0 = (4.0, -15.0, 27.0)     # carbine grip at rest (character space)
FORE = 12.0
LENGTH = 38.0
HAT_C = (1.0, 0.0, 57.8)
KERCHIEF = "#D8CDB6"


def build(rig):
    I.skeleton(rig)
    I.legs(rig, trousers=I.DENIM, gaiter=I.LEATHER_DK)
    for s in ("r", "l"):     # brass spurs at the heels
        y = I.LEG_Y * I.SIDE_Y[s]
        g = Geo().capsule((-2.4, y - 1.0 * I.SIDE_Y[s] * -1, 3.4), (-5.6, y, 3.0), 0.7)
        g.star((-6.4, y, 3.0), 2.2, 0.9, 1.0, points=5, rot=(90, 0, 0))
        rig.part(f"shin_{s}", g, I.BRASS_LT, finish="metal", outline=0.4)
    I.long_coat(rig, tail_len=21.0, long=True)
    skirt = Geo().blob((0.4, 0, 12.0), (11.9, 10.9, 5.0), p=2.6)
    sface = F.Face(rig, "hips", [skirt])
    g = KI.cog(sface, Geo(), (5.0, 11.6), s=0.85)
    rig.part("hips", g, KI.CREAM, highlight=False, outline=0)
    # bandolier across the chest (leather with brass cartridge tips)
    g = Geo().capsule((10.4, -7.0, 36.0), (8.0, 8.0, 19.0), 1.8)
    rig.part("torso", g, I.LEATHER, outline=0.6)
    g = Geo()
    for t in (0.2, 0.4, 0.6, 0.8):
        g.blob((10.4 - 2.4 * t + 0.9, -7.0 + 15.0 * t, 36.0 - 17.0 * t), (0.9, 1.1, 1.6), p=2.6)
    rig.part("torso", g, I.BRASS_LT, finish="metal", outline=0)
    # neckerchief knot and fluttering tails
    g = Geo().lathe([(7.2, 0), (7.8, 1.6), (7.4, 3.0)], (1.2, 0, 36.2), (1.2, 0, 39.2), segs=18)
    g.blob((8.6, -2.0, 36.4), (2.4, 2.6, 2.2), p=2.4)
    rig.part("torso", g, KERCHIEF, outline=0.6)
    rig.secondary("kerchief", "torso", (8.6, -2.0, 36.0), (6.0, -3.0, 29.0), max_deg=26, gain=1.5)
    g = Geo().blob((7.6, -2.6, 32.4), (1.8, 1.2, 3.6), p=2.4, rot=(0, 20, 0))
    rig.part("kerchief", g, KERCHIEF, outline=0.5)

    KI.head_face(rig, brow=I.HAIR, brow_angry=False, mouth_dz=-9.2)
    I.moustache(rig, I.HAIR, curl=True)
    I.back_hair(rig, I.HAIR)
    I.ear(rig)
    rig.joint("hat", "head", HAT_C)
    I.slouch_hat(rig, c=HAT_C, joint="hat")
    KI.loose(rig, "hat_loose", HAT_C, lambda j: I.slouch_hat(rig, c=HAT_C, joint=j))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=None, team_sleeve=True, fist=4.4, cuff=I.COAL_LT)
    I.shoulders(rig)

    rig.joint("gun", "torso", G0)
    muzzle = I.lever_carbine(rig, "gun", G0, length=LENGTH, k=1.1)
    g = Geo().blob((G0[0] + FORE, G0[1] + 2.4, G0[2] - 0.2), (3.6, 3.0, 3.4), p=2.4)
    rig.part("gun", g, I.SKIN)
    rig.track("muzzle", "gun", muzzle)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))
    I.muzzle_flash(rig, "gun", muzzle, size=1.8)
    rig.joint("smoke", "gun", muzzle, hidden=True)
    g = Geo()
    for dx, dz, r in ((6.0, 1.0, 4.0), (11.0, 3.0, 3.3), (3.0, 4.6, 3.0), (8.0, 6.4, 2.6)):
        g.sphere((muzzle[0] + dx, muzzle[1] - 2, muzzle[2] + dz), r, cuts=4)
    rig.part("smoke", g, I.SMOKE, finish="dust", outline=0.8)
    rig.joint("casing", "root", (G0[0] + 2, G0[1] - 2, G0[2] + 7), hidden=True)
    g = Geo().capsule((G0[0] + 0.5, G0[1] - 3, G0[2] + 6.2), (G0[0] + 4.0, G0[1] - 3, G0[2] + 8.0), 1.2)
    rig.part("casing", g, I.BRASS_LT, finish="metal", outline=0.5)
    MUZ.append(muzzle)


MUZ = []
PORT = (4.0, 27.0, 52.0)     # port arms: the carbine held diagonally across the chest


def hold(gx, gz, deg):
    return I.hold2("gun", G0, FORE, gx, gz, deg)


STANCE = merge(hold(*PORT), {"torso": {"r": -2.0}})


def _idle(f):
    # tips his hat: the far hand leaves the fore-end (1), touches the brim and dips it (2-3), back (4-5)
    tip = [0.0, 0.5, 1.0, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return {}
    pose = M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=3)
    if tip > 0:
        a, fo = I.ik2(I.SH, (9.0, 55.0))
        la, lf = pose["arm_l"]["r"] - 90.0, pose["fore_l"]["r"] + pose["arm_l"]["r"] - 90.0
        na, nf = la + (a - la) * tip, lf + (fo - lf) * tip
        pose.update(I.arm("l", na, nf))
        pose["hat"] = {"r": -9 * tip, "z": -0.8 * tip, "x": 0.8 * tip}
        pose["head"] = dict(pose.get("head", {}), r=pose.get("head", {}).get("r", 0.0) - 4 * tip)
        if f in (2, 3):
            pose = merge(pose, F.expr("blink" if f == 3 else "grit"))
    return pose


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(hold(PORT[0], PORT[1] + 0.9 * lag, PORT[2] - 3.5 * lag),
                     {"hat": {"r": -1.5 * lag}})
    base = {"torso": {"r": -2.0}}
    return M.walk_v2(f, base, HEIGHT_LU, thigh=36.0, knee=66.0, lift_lu=7.0, bob_pct=0.07, lean=-10.0,
                     arms=(), twist=7.0, extra=extra)


# 10 unique frames in 765 ms; impact (fire) on frame 3 at 291 ms (impactAt 0.3804, as shipped)
ATTACK_MS = [40, 60, 191, 60, 70, 60, 50, 70, 80, 84]
ATTACK_IMPACT = 3
#       raise snap HOLD FIRE kick flip snap down settle settle
GX = [5.0, 5.0, 5.0, 5.0, 2.5, 3.0, 3.0, 4.0, 4.5, 4.0]
GZ = [30.0, 33.0, 33.0, 33.0, 35.0, 37.0, 38.0, 32.0, 28.0, 27.0]
DEG = [18.0, 4.0, 0.0, 0.0, 16.0, 78.0, 86.0, 46.0, 50.0, 52.0]
LEVER = [0, 0, 0, 0, 0, 62, 6, 0, 0, 0]
BX = [0.0, 0.5, 1.0, 0.0, -3.5, -2.0, -1.0, -0.5, 0.0, 0.0]
BQ = [0.0, -0.03, -0.06, 0.03, -0.10, 0.05, 0.02, -0.02, 0.0, 0.0]
BZ = [0.0, -0.5, -1.2, -1.2, -0.8, 1.2, 0.8, 0.0, 0.0, 0.0]
TR = [-2, -4, -5, -5, 5, 4, 2, 0, -1, -2]
HR = [-2, -7, -10, -9, 5, 6, 4, 0, 0, 0]
CAS = [None, None, None, None, None, (-3, 4, 60), (-9, 13, 200), (-15, 10, 330), (-19, -2, 420),
       None]


def _attack_pose(f):
    pose = merge(hold(GX[f], GZ[f], DEG[f]), {
        "torso": {"r": TR[f]},
        "head": {"r": HR[f], "x": 1.2 if f in (1, 2, 3) else 0.0},
        "hat": {"r": [0, 0, 0, 0, 6, -4, -2, 0, 0, 0][f]},
        "thigh_r": {"r": [4, 10, 14, 14, 10, 8, 6, 4, 2, 0][f]},
        "shin_r": {"r": [0, -4, -8, -8, -6, -2, -2, 0, 0, 0][f]},
        "thigh_l": {"r": [-4, -10, -14, -16, -16, -12, -10, -6, -4, -2][f]},
        "shin_l": {"r": [0, -2, -6, -6, -4, 0, 0, 0, 0, 0][f]},
        "lever": {"r": LEVER[f]},
        "flash": {"show": f == 3},
        "smoke": {"show": f == 4, "s": 1.1},
    }, M.body_about((0, 0, 22), x=BX[f], z=BZ[f], q=BQ[f]))
    if CAS[f] is not None:
        x, z, r = CAS[f]
        pose["casing"] = {"show": True, "x": x, "z": z, "r": r}
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    if f in (5, 6):
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_clip():
    muz = MUZ[0] if MUZ else (G0[0] + LENGTH + 1.0, G0[1], G0[2] + 2.6)
    flip = {"kind": "arc", "joint": "gun", "inner": (G0[0] + 16.0, G0[1], G0[2] + 2.4), "outer": muz,
            "color": I.IRON_LT, "white": 0.4, "taper": 0.2, "lines": 2}
    ov = {
        5: [dict(flip, **{"from": 4, "t0": 0.0, "t1": 0.9})],
        3: [{"kind": "burst", "joint": "gun", "point": muz, "r0_lu": 8.0, "r1_lu": 13.0, "n": 5,
             "a0": -60.0, "arc": 120.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov)


def _hit(k):
    def recoil(a):
        return merge(hold(PORT[0], PORT[1], PORT[2] + 16 * a) if a > 0 else {},
                     {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                      "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                      "hat": {"z": 3.5 * max(a, 0), "r": 12 * a}, "brow": {"z": 1.6 * max(a, 0)}})
    base = {"torso": {"r": -2.0}} if M.HIT_AMT[k] > 0 else STANCE
    return M.hit_light(k, base, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


HAT_PATH = KI.hat_pop(land=55.0, back=60.0)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(hold(PORT[0], PORT[1], PORT[2] + 30 * flail), M.die_d1(k, center_z=28.0, lie_z=11.0,
                                                                         height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_l": {"r": 60 * flail}, "fore_l": {"r": 30 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    hp = HAT_PATH[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl, attack_ms=765, attack_impact_at=0.3804)
