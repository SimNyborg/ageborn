"""Ion Ranger: Cosmic Age ranged (docs/design-lane-ages.md A17.11). Ion bolt (proj.ion) that arcs to
one more enemy, laser damage, ~70 lu.

Look (A17.12, Cosmic palette): a lean sharpshooter in a void undersuit with violet armour, a
tall pointed team hood (its tip follows through) with a violet lining over a dark cowl face with
one big round lens in a star-white bezel: a violet cyclops robot eye that acts (angry while
aiming, a slit on the shot, > < when hit, X on death). A short antenna with a violet tip, a team
chest plate with the pale Cosmic star, team shoulder pads, a belt with pouches and a mint
buckle, a violet power pack with a cable to the rifle. The long ion rifle (the reach cue): a
void and star-white stock and shroud, four mint coil rings along the barrel, a forked emitter.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    rifle at low ready; lifts it to peer along the barrel at the emitter, a blink
  walk    jog: forward lean, the rifle bobbing, the hood tip, antenna and cable swinging
  attack  SHOULDER SHOT WITH TRAVELLING RINGS: snaps the rifle to the shoulder, the coils light up
          one after another from the stock to the muzzle (a ring of light runs forward) while a
          charge ball swells between the forks (the held extreme), one flash, and the kick knocks
          him into a little back-hop; he lands, the coils vent, back to low ready. The bolt
          leaves `muzzle` on the fire frame.
  hit     light: the head snaps back, the hood tip whips, eye > <
  die     D1 fling and spin, X eye, the rifle flung wide
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_future as KF
from ageborn_art import kit_medieval as KM
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "ion_ranger"
NAME = "Ion Ranger"
HEIGHT_LU = 70
CANVAS = (330, 236)
FEET = (104, 212)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (60, 28)}
NO_RETIME = True

G0 = (4.0, -15.0, 27.0)      # rifle grip at rest (character space); the rifle is a torso child
L = 56.0                     # grip to the emitter tip
FORE = 16.0                  # the far hand holds the fore-grip this far along
MUZZLE = (G0[0] + L + 3.0, G0[1], G0[2] + 3.5)
COILS = (18.0, 25.0, 32.0, 39.0)
LENS = (10.4, -2.2, 50.4)


def build(rig):
    K.skeleton(rig, head=(1, 0, 39))
    K.legs(rig, team_shin=True)
    gx, gy, gz = G0
    rig.joint("gun", "torso", G0)

    # antenna behind the hood (follow-through)
    rig.secondary("antenna", "head", (-6.5, 7.0, 57.0), (-10.5, 8.0, 69.0), max_deg=16, gain=1.3)
    g = Geo().capsule((-6.5, 7.0, 57.0), (-10.2, 8.0, 68.0), 0.9)
    rig.part("antenna", g, K.STAR_TRIM, outline=1.0)
    g = Geo().sphere((-10.5, 8.0, 69.0), 1.9, cuts=3)
    rig.part("antenna", g, glow=K.VIOLET_GLOW, outline=1.0, outline_hex=K.VOID)

    # power pack cable from the pack to the rifle butt (follow-through)
    rig.secondary("cable", "torso", (-12.0, -5.0, 25.0), (-6.0, -10.0, 13.0), max_deg=16, gain=1.2)
    g = Geo()
    pts = [(-12.0, -5.0, 25.0), (-11.5, -8.0, 18.0), (-7.0, -10.5, 14.0), (-1.0, -12.5, 15.5)]
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 1.3, segs=8, rings=2)
    rig.part("cable", g, K.VOID_LT, outline=0.6)

    K.arm_parts(rig, "l")
    K.torso(rig, pack=True)
    g = Geo().blob((-11.4, 0, 36.6), (4.8, 8.8, 2.2), p=3.4)          # team band on the pack
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().blob((0.6, 0, 16.6), (10.4, 10.2, 4.0), p=2.8, taper=(1.1, 1.0))
    g.clip((0, 0, 13.2), (0, 0, -1))
    rig.part("hips", g, K.VIOLET_DK, finish="gloss")
    g = Geo().blob((5.0, -9.6, 20.2), (2.6, 1.8, 2.8), p=3.2).blob((-2.8, -9.6, 20.4), (2.4, 1.8, 2.6), p=3.2)
    rig.part("torso", g, K.VOID_LT, outline=0.6)
    chest = Geo().blob((1.8, 0, 31.4), (9.8, 10.5, 8.0), p=3.0, taper=(0.88, 1.0))
    cf = FC.Face(rig, "torso", [chest])
    g = KC.starmark(cf, Geo(), KM.scr(cf, (6.0, -9.0, 31.4)), s=0.95)
    rig.part("torso", g, KC.STAR_PALE, highlight=False, outline=0)

    # the hood: a team outer layer (its tall tip on a follow-through joint) with a violet lining
    # at the face opening, over a dark cowl face with the cyclops lens
    g = Geo().blob((1.0, 0, 50.0), (10.6, 10.2, 10.6), p=2.4)
    g.blob((1, 0, 42.4), (7.8, 7.8, 3.2), p=2.4)
    rig.part("head", g, K.VISOR, finish="gloss", outline_hex=K.VOID)
    hood = Geo().blob((-1.0, 0, 53.0), (12.6, 12.4, 13.0), p=2.3, taper=(1.0, 0.7), shift=(-0.25, 0))
    hood.clip((7.2, 0, 0), (1, 0, 0))
    rig.part("head", hood, team=True)
    rig.secondary("hood_tip", "head", (-5.0, 0, 60.0), (-13.0, 0, 70.0), max_deg=16, gain=1.2)
    g = Geo().blob((-8.0, 0, 64.0), (5.4, 5.0, 8.0), p=2.2, rot=(0, -38, 0))
    rig.part("hood_tip", g, team=True)
    g = Geo().lathe([(9.8, -0.9), (11.2, 0), (9.8, 0.9)], (7.6, 0, 50.0), (8.6, 0, 50.0), segs=28, squash=(1.0, 1.12))
    rig.part("head", g, K.VIOLET, finish="gloss", outline=0.6)                     # hood rim (lining)
    g = Geo().blob((-3.0, 0, 40.0), (9.0, 12.4, 4.0), p=2.4)                          # cowl on the shoulders
    rig.part("head", g, K.VOID_LT, outline=0.6)
    # the cyclops lens: a star-white bezel and a dark lens disc carrying one glyph eye
    x, y, z = LENS
    ax, ay = 1.0 / math.hypot(1.0, 0.3), -0.3 / math.hypot(1.0, 0.3)
    r = 5.0
    g = Geo().lathe([(0, -1.0), (r + 1.2, -1.0), (r + 1.7, 0.4), (r + 1.0, 1.7), (0, 1.2)], (x, y, z),
                    (x + ax, y + ay, z), segs=22)
    rig.part("head", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    lens = Geo().lathe([(0, 0), (r, 0), (r * 0.94, 1.0), (0, 1.5)], (x + ax * 1.2, y + ay * 1.2, z),
                       (x + ax * 2.2, y + ay * 2.2, z), segs=22)
    tf = FC.Face(rig, "head", [lens])
    ex, ez = KM.scr(tf, (x + ax * 2.6, y + ay * 2.6, z))
    KF.visor_face(rig, "head", [lens], (ex, ez), eye_dx=(0.0,), eye_rx=2.3, eye_rz=2.9, color=KC.VIO_EYE,
                  core=KC.VIO_CORE)
    rig.part("head", lens, K.VISOR, finish="gloss", outline=0.6, outline_hex=K.VOID)

    K.arm_parts(rig, "r")
    K.shoulders(rig)

    # the ion rifle, along +X from the grip
    y1 = gy + 1
    g = Geo().blob((gx + 8, y1, gz + 3.2), (13.0, 3.2, 4.0), p=3.6)             # receiver
    g.blob((gx - 7, y1, gz + 2.2), (5.8, 2.6, 3.8), p=3.4, rot=(0, 10, 0))       # stock
    g.blob((gx + 0.5, y1, gz - 1.5), (2.2, 2.0, 4.2), p=2.8, rot=(0, -12, 0))    # grip
    g.blob((gx + FORE, y1 + 1, gz - 0.6), (2.0, 1.8, 3.4), p=2.8, rot=(0, -8, 0))  # fore-grip
    rig.part("gun", g, K.VOID_LT)
    g = Geo().blob((gx + 9, y1, gz + 7.0), (11.0, 2.8, 2.2), p=3.4)             # top shroud
    g.blob((gx + 10, y1, gz + 10.2), (4.2, 1.6, 1.6), p=3.0)                    # scope
    g.lathe([(2.2, 0), (2.2, L - 14.0), (0, L - 13.8)], (gx + 14, y1, gz + 3.5), (gx + L, y1, gz + 3.5), segs=12)
    rig.part("gun", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((gx - 7.5, y1 - 0.4, gz + 2.6), (4.6, 2.9, 3.0), p=3.2, rot=(0, 10, 0))   # team stock plate
    g.blob((gx + 8.0, y1 - 2.4, gz + 3.8), (5.0, 0.8, 1.8), p=3.2)                            # team side panel
    rig.part("gun", g, team=True, outline=0.6)
    g = Geo().blob((gx + 13.6, y1 - 2.4, gz + 10.2), (0.8, 0.8, 1.2), p=2.0)
    rig.part("gun", g, glow=K.MINT, outline=0)
    for i, cx in enumerate(COILS):
        g = Geo().lathe([(0, -1.0), (3.9, -0.9), (4.2, 0), (3.9, 0.9), (0, 1.0)], (gx + cx, y1, gz + 3.5),
                        (gx + cx + 1, y1, gz + 3.5), segs=18)
        rig.part("gun", g, glow="#2FA884", outline=1.0, outline_hex=K.VOID)
        rig.joint(f"coil{i}", "gun", (gx + cx, y1, gz + 3.5), hidden=True)     # lit: a bigger pale ring
        g = Geo().lathe([(0, -1.3), (5.2, -1.1), (5.6, 0), (5.2, 1.1), (0, 1.3)], (gx + cx, y1 - 0.4, gz + 3.5),
                        (gx + cx + 1, y1 - 0.4, gz + 3.5), segs=18)
        rig.part(f"coil{i}", g, glow=K.MINT_CORE, outline=1.0, outline_hex=K.MINT)
    # emitter: two forks at the muzzle and a violet ring
    g = Geo()
    for dz in (3.4, -3.4):
        g.blob((gx + L - 1.0, y1, gz + 3.5 + dz), (5.4, 1.9, 1.3), p=2.6, rot=(0, -dz * 2.5, 0))
    g.lathe([(0, -0.5), (3.4, -0.4), (3.6, 1.6), (0, 1.8)], (gx + L - 6.0, y1, gz + 3.5), (gx + L - 4, y1, gz + 3.5), segs=16)
    rig.part("gun", g, K.VOID_LT, finish="gloss")
    g = Geo().lathe([(2.4, 0), (4.2, 0.2), (4.2, 1.4), (2.4, 1.6)], (gx + L - 4.0, y1, gz + 3.5),
                    (gx + L - 2.0, y1, gz + 3.5), segs=16)
    rig.part("gun", g, glow=K.VIOLET_GLOW, outline=0.8, outline_hex=K.VIOLET)
    g = Geo().blob((gx + 0.6, y1 - 1.6, gz + 1.8), (3.6, 3.2, 3.4), p=2.6)
    rig.part("gun", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    rig.track("muzzle", "gun", MUZZLE)
    rig.track("_foot", "shin_r", (2.8, -6.0, 0.5))

    mx, my, mz = MUZZLE
    K.orb(rig, "gun", (mx - 2.0, my - 1, mz), 3.0, name="charge", hidden=True)
    rig.joint("flash", "gun", MUZZLE, hidden=True)
    g = Geo().star((mx + 3.0, my - 3, mz), 10.0, 3.4, 1.4, points=4)
    rig.part("flash", g, glow=K.MINT, outline=0)
    g = Geo().blob((mx + 8.5, my - 2.5, mz), (10.0, 1.5, 2.4), p=2.0)
    rig.part("flash", g, glow=K.MINT, outline=0)
    g = Geo().sphere((mx + 2.0, my - 4.5, mz), 3.6, cuts=3)
    rig.part("flash", g, glow=K.MINT_CORE, outline=0)
    K.puff(rig, "gun", (gx + 28, y1, gz + 9.0), size=0.9, name="vent")


# -- poses -----------------------------------------------------------------------------------
LOW = (6.0, 25.5, -6.0)     # low ready: grip x, z (torso space), rifle angle
AIM = (7.5, 34.5, 0.0)


def hold(gx, gz, deg):
    return K.hold2("gun", G0, FORE, gx, gz, deg)


STANCE = merge(hold(*LOW), {"torso": {"r": -2.0}})


def _lit(n):
    return {f"coil{i}": {"show": True} for i in range(n)}


def _idle(f):
    # peers along the barrel: the rifle tips up, the head bends to the scope (frames 2-3)
    peer = [0.0, 0.3, 1.0, 1.0, 0.35, 0.0][f]
    pose = M.idle_v2(f, STANCE, frames=6, blink=5, face_blink=KF.glyph("g_blink"))
    pose = merge(pose, hold(LOW[0] + 1.5 * peer, LOW[1] + 8.0 * peer, LOW[2] + 22.0 * peer))
    pose["head"] = dict(pose.get("head", {}), r=pose.get("head", {}).get("r", 0.0) - 9.0 * peer)
    if f == 2:
        pose.update(_lit(1))
    if f == 3:
        pose = merge(pose, KF.glyph("g_squint"))
    return pose


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return hold(LOW[0], LOW[1] + 1.0 * lag, LOW[2] - 4.0 * lag)
    return M.walk_v2(f, {"torso": {"r": -2.0}}, HEIGHT_LU, thigh=36.0, knee=64.0, lift_lu=7.0, bob_pct=0.07,
                     lean=-10.0, arms=(), twist=6.0, extra=extra)


# -- attack: shoulder shot with travelling rings (748 ms, impact at 374 ms = 0.5, as shipped) ------
ATTACK_MS = [50, 60, 80, 184, 90, 70, 70, 60, 84]
ATTACK_IMPACT = 4
#     raise  aim  charge HOLD  FIRE  hop  land  vent settle
GX = [7.0, 7.5, 7.5, 7.0, 7.5, 3.5, 4.5, 5.5, 6.0]
GZ = [30.0, 34.5, 34.5, 34.2, 34.5, 38.0, 33.0, 29.0, 26.0]
DEG = [-4.0, 0.0, 0.0, 1.0, 0.0, 16.0, 8.0, 2.0, -5.0]
BX = [0.0, 0.5, 0.8, 1.2, 0.0, -5.0, -7.0, -4.0, -1.0]
BZ = [0.0, -0.4, -0.9, -1.6, -0.6, 4.5, 0.0, 0.0, 0.0]
BQ = [0.0, -0.02, -0.04, -0.08, 0.04, 0.06, -0.12, -0.02, 0.0]
TR = [-2, -4, -5, -7, -3, 10, 5, 0, -2]
HD = [-2, -6, -8, -9, -6, 8, 3, 0, -1]
LIT = [1, 2, 3, 4, 0, 0, 0, 0, 0]
CHG = [0, 0, 0.55, 1.3, 0, 0, 0, 0, 0]
THR = [4, 10, 14, 18, 14, 34, 8, 6, 2]
SHR = [0, -4, -8, -10, -8, -30, -6, -2, 0]
THL = [-4, -10, -14, -18, -18, 6, -12, -8, -4]
SHL = [0, -2, -6, -8, -6, -34, -4, 0, 0]
EYES = ["eyes", "g_angry", "g_angry", "g_angry", "g_squint", "g_wide", "g_hurt", "eyes", "g_happy"]


def _attack_pose(f):
    pose = merge(hold(GX[f], GZ[f], DEG[f]), _lit(LIT[f]), {
        "torso": {"r": TR[f]},
        "head": {"r": HD[f], "x": 1.0 if f in (1, 2, 3, 4) else 0.0},
        "thigh_r": {"r": THR[f]}, "shin_r": {"r": SHR[f]},
        "thigh_l": {"r": THL[f]}, "shin_l": {"r": SHL[f]},
        "charge": {"show": CHG[f] > 0, "s": max(CHG[f], 0.01)},
        "flash": {"show": f == 4},
        "vent": {"show": f in (6, 7), "s": 0.8 if f == 6 else 1.25, "z": 0.0 if f == 6 else 3.0},
    }, M.body_about((0, 0, 22), x=BX[f], z=BZ[f], q=BQ[f]))
    if f == 3:
        pose["body"]["x"] += 0.35          # a charge tremble
    return merge(pose, KF.glyph(EYES[f]))


def _attack_clip():
    gx, gy, gz = G0

    def ring(cx, radii):
        return {"kind": "rings", "joint": "gun", "point": (gx + cx, gy, gz + 3.5), "radii_lu": radii,
                "a0": -80.0, "a1": 80.0, "color": K.MINT_CORE}
    ov = {
        1: [ring(COILS[1] + 2.0, (6.0,))],
        2: [ring(COILS[3] + 2.0, (6.5,))],
        3: [ring(L + 4.0, (7.0, 10.5))],
        4: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5,
             "a0": -60.0, "arc": 120.0, "color": K.MINT_CORE}],
        6: [{"kind": "dust", "ground": (-3.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 5, "spread": 0.8,
             "color": "#DCD6E8"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return merge(hold(LOW[0] - 2 * up, LOW[1] + 2 * up, LOW[2] + 18 * a),
                     {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                      "thigh_r": {"r": 22 * up}, "shin_r": {"r": -26 * up}})
    return M.hit_light(k, {"torso": {"r": -2.0}}, recoil, face_hurt=KF.glyph("g_hurt"),
                       face_back=KF.glyph("g_angry") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    landed = [0, 0, 0, 0, 0.8, 1, 1, 1, 1, 1][k]
    pose = merge(hold(LOW[0] + 2, LOW[1] + 4 * flail - 3 * landed, LOW[2] + 40 * flail - 76 * landed),
                 M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    g = "g_hurt" if k == 0 else ("g_wide" if k < 4 else "eyes_x")
    return merge(pose, KF.glyph(g))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl, attack_ms=748, attack_impact_at=0.5)
