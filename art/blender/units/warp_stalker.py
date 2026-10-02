"""Warp Stalker: Cosmic Age skirmisher Epic (docs/design-lane-ages.md A17.11). Twin warp blades, slash
damage, fast (0.8 s); Blink: warps past the blocker to a ranged or support unit (the game draws
fx.blink). ~70 lu.

Look (A17.12, Cosmic palette): a lean, hunched assassin. A pointed violet hood (its tip follows
through) over a dark mask with two slanted mint robot eyes that act (narrow and angry on the
pounce, > < when hit, X as he blinks out), a big team cloak that trails from the shoulders and
flares on the walk; its near half is thrown open toward the camera so the starry lining reads
(void with star-white and mint star specks). A void bodysuit with violet shin guards, a team sash
with a pale Cosmic star, a belt pouch. Both hands hold short curved mint warp blades, reversed.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    low crouch, twirls the near blade, a shimmer frame (he flickers), a blink
  walk    walk v3 ninja sprint at ground speed (ANIM_SPEC G1, 125 lu/s): hunched low and leaning
          hard, long bounding strides with a flight phase, both blades swept back and trailing, planted
          feet, the cloak and hood tip flaring behind
  attack  BLINK X-SLASH: sinks into a deep crouch, squeezes thin and blinks out in a violet star,
          reappears a stride forward in the air with both blades crossed high behind his head
          (the held extreme; the star fades where he was), slashes both blades down across each
          other (two mint smears) and lands low with the blades crossed in an X (impact lines),
          then skips back into his crouch
  attack_b  DOUBLE SLASH: crouched low and turned away with both blades cocked back past the far hip
          (the held extreme), then both sweep round flat at chest height into a long lunge (two mint
          crescent smears), no blink
  attack_c  SPIN: coils deep with the near blade low behind and the far blade high in front (the held
          extreme), then whirls a full turn on the spot (two mint ring smears) and lands with both
          blades level out at the target
  hit     light: the head snaps back, the cloak whips, eyes > <
  die     blink-out (kept): struck, folded in, squeezed thin and shrunk into a violet star flash
          (no fall, no dust poof)
"""
import math

from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_future as KF
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge, pick
from ageborn_art.geometry import Geo

SLUG = "warp_stalker"
GAIT_NAME = "biped"
NAME = "Warp Stalker"
HEIGHT_LU = 70
CANVAS = (320, 272)
FEET = (132, 232)
ANCHORS = {"head": (6, 66), "hitCenter": (2, 32)}
NO_RETIME = True

HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
HL = (0.0, K.ARM_Y["l"], K.HAND_Z)
BLADE = 22.0
TIP_R = (HR[0] + 3.0, HR[1] - 1.0, HR[2] + 5.0 + BLADE)
MID_R = (HR[0] + 0.8, HR[1] - 1.0, HR[2] + 5.0 + BLADE * 0.45)
TIP_L = (HL[0] + 3.0, HL[1] - 1.0, HL[2] + 5.0 + BLADE)
MID_L = (HL[0] + 0.8, HL[1] - 1.0, HL[2] + 5.0 + BLADE * 0.45)


def _blade(rig, joint, h, y_off, bright=True):
    hx, hy, hz = h
    g = Geo().capsule((hx, hy, hz - 3.2), (hx, hy, hz + 4.0), 1.4)
    rig.part(joint, g, K.VOID_LT, outline=0.8)
    g = Geo().blob((hx, hy, hz + 4.6), (4.2, 2.4, 1.4), p=2.6)
    rig.part(joint, g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # a curved blade: segments bending forward
    g, c = Geo(), Geo()
    pts = [(hx + 3.0 * (t ** 2), hz + 5.0 + BLADE * t) for t in (0.0, 0.25, 0.5, 0.75, 1.0)]
    for i, ((x0, z0), (x1, z1)) in enumerate(zip(pts, pts[1:])):
        w0, w1 = 2.8 - 0.55 * i, 2.8 - 0.55 * (i + 1)
        g.capsule((x0, hy + y_off, z0), (x1, hy + y_off, z1), max(0.4, w0), max(0.3, w1), segs=10, rings=2)
        c.capsule((x0 + 0.4, hy + y_off - 1.0, z0), (x1 + 0.4, hy + y_off - 1.0, z1), max(0.3, w0 * 0.45),
                  max(0.2, w1 * 0.45), segs=8, rings=2)
    rig.part(joint, g, glow=K.MINT if bright else "#36C99E", outline=1.0, outline_hex="#1C8A6A")
    rig.part(joint, c, glow=K.MINT_CORE, outline=0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KC.skeleton_v3(rig, head=(2, 0, 38))
    # legs (walk v3): slim void legs, violet shin guards, soft void boots on the foot joints
    KC.legs_v3(rig, boot=K.VOID_LT, knee=None, thigh_r=4.2, toe=K.VIOLET)
    from ageborn_art import colors as CO
    for s in ("r", "l"):
        y = K.LEG_Y * K.SIDE_Y[s]
        g = Geo().blob((2.0, y, 8.8), (3.2, 4.0, 3.2), p=2.6)
        rig.part(f"shin_{s}", g, K.VIOLET if s == "r" else CO.scale(K.VIOLET, 0.8), finish="gloss")
    rig.joint("blade_r", "hand_r", HR)
    rig.joint("blade_l", "hand_l", HL)
    _blade(rig, "blade_l", HL, -2.0, bright=False)
    K.arm_parts(rig, "l", sleeve=K.VOID, bracer=K.VIOLET, glove=K.VOID_LT, r0=3.6, r1=3.2, fist=3.8)

    # cloak: team outside, trailing from the shoulders; the turned-up hem shows the starry lining
    rig.secondary("cloak", "torso", (-6.0, 0, 38.0), (-16.0, 0, 8.0), max_deg=18, gain=1.2)
    g = Geo().blob((-11.0, 0.5, 23.0), (4.0, 13.0, 16.5), p=2.8, taper=(1.45, 0.75), shift=(-0.3, 0))
    rig.part("cloak", g, team=True)
    g = Geo().blob((-14.0, -1.5, 9.0), (4.2, 14.4, 3.2), p=2.6, rot=(0, -14, 0))
    rig.part("cloak", g, K.VOID, finish="matte")
    # the near half of the cloak is thrown open toward the camera: a big void lining panel from
    # the shoulder to the hem, scattered with star-white specks and one mint star
    lin = [(-3.0, 37.0), (-7.0, 30.0), (-10.0, 20.0), (-12.0, 10.0), (-17.0, 6.5), (-24.0, 7.5), (-22.0, 16.0),
           (-18.0, 27.0), (-11.0, 36.0)]
    g = Geo().slab(lin, -13.6, 1.6)
    rig.part("cloak", g, K.VOID, outline_hex=K.VOID_DK)
    g = Geo().slab([(-3.0, 38.5), (-11.8, 37.4), (-19.8, 28.0), (-24.2, 16.0), (-26.8, 6.8), (-23.4, 4.6),
                    (-21.0, 15.6), (-17.2, 26.2), (-10.6, 34.4), (-3.4, 34.8)], -13.0, 1.8)
    rig.part("cloak", g, team=True, outline=0.6)                       # the team outer edge folds over
    g = Geo()
    for (x, z, r) in ((-9.0, 30.0, 1.5), (-14.5, 24.0, 1.9), (-11.5, 17.0, 1.3), (-17.5, 13.0, 1.6),
                      (-20.5, 9.2, 1.2), (-15.0, 9.0, 1.1), (-7.8, 23.0, 1.0)):
        g.star((x, -15.2, z), r * 1.4, r * 0.55, 0.8, points=4)
    rig.part("cloak", g, glow=K.STAR, outline=0)
    g = Geo().star((-12.0, -15.2, 12.5), 2.2, 0.9, 0.8, points=4)
    rig.part("cloak", g, glow=K.MINT, outline=0)

    # lean torso: void suit, a team sash across the chest, violet belt
    g = Geo().blob((0, 0, 28), (8.4, 8.4, 11.0), p=2.4, taper=(0.9, 1.05))
    g.blob((0, 0, 17.5), (7.6, 8.2, 4.0), p=2.6)
    rig.part("torso", g, K.VOID)
    g = Geo().blob((1.4, 0, 29.0), (8.8, 9.0, 3.9), p=2.6, rot=(0, 34, 0))
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().blob((0.4, 0, 21.8), (8.9, 8.9, 2.0), p=3.4)
    rig.part("torso", g, K.VIOLET, finish="gloss")
    g = Geo().blob((-4.0, -8.8, 20.0), (2.4, 1.8, 2.6), p=3.2)
    rig.part("torso", g, K.VOID_LT, outline=0.6)                          # a belt pouch
    g = Geo().star((5.2, -7.8, 29.6), 2.6, 1.1, 1.0, points=5, rot=(0, -30, 0))
    rig.part("torso", g, KC.STAR_PALE, outline=0.5, outline_hex=K.STAR_TRIM)
    g = Geo().blob((8.8, -2.0, 21.8), (1.3, 2.0, 1.3), p=2.4)
    rig.part("torso", g, glow=K.MINT, outline=1.0, outline_hex=K.VOID)

    # hood: pointed, violet, over a dark mask with two mint eyes; mask lower half
    g = Geo().blob((1.5, 0, 49.5), (11.8, 11.0, 12.0), p=2.4)
    g.clip((8.8, 0, 48.0), (1, 0, 0.2))
    rig.part("head", g, K.VIOLET, outline_hex=K.VIOLET_DK)
    rig.secondary("hood_tip", "head", (-5.0, 0, 55.0), (-15.0, 0, 60.0), max_deg=18, gain=1.3)
    g = Geo().capsule((-3.0, 0, 54.0), (-15.0, 0, 60.0), 8.4, 1.6, segs=18, rings=4)
    g.clip((8.8, 0, 48.0), (1, 0, 0.2))
    rig.part("hood_tip", g, K.VIOLET, outline_hex=K.VIOLET_DK)
    g = Geo().blob((3.8, 0, 48.5), (9.8, 8.8, 9.4), p=2.4)
    rig.part("head", g, K.VISOR, finish="gloss", outline_hex=K.VOID)
    g = Geo().blob((7.0, 0, 43.6), (7.2, 8.6, 3.6), p=2.4)
    rig.part("head", g, K.VOID_LT, finish="gloss")
    mask = Geo().blob((3.8, 0, 48.5), (10.1, 9.1, 9.7), p=2.4)
    mask.clip((6.0, 0, 0), (-1, 0, 0)).clip((0, 0, 53.4), (0, 0, 1)).clip((0, 0, 45.6), (0, 0, -1))
    KF.visor_face(rig, "head", [mask], (12.6, 49.6), eye_dx=(0.0, 3.6), eye_rx=1.9, eye_rz=2.2, color=K.MINT,
                  core=K.MINT_CORE, tilt=-12.0)
    rig.part("head", mask, K.VISOR, finish="gloss", outline=0.4, outline_hex=K.VOID)
    # team hood rim
    g = Geo().lathe([(8.0, -1.4), (10.8, -1.2), (11.2, 1.0), (8.0, 1.2)], (9.4, 0, 48.6), (10.4, 0, 48.9),
                    segs=22, squash=(1.2, 0.95))
    rig.part("head", g, team=True, outline=0.6)

    K.arm_parts(rig, "r", sleeve=K.VOID, bracer=K.VIOLET, glove=K.VOID_LT, r0=3.6, r1=3.2, fist=3.8)
    # small team shoulder guard on the near arm
    g = Geo().blob((0.5, K.ARM_Y["r"] - 0.3, 37.4), (5.8, 5.0, 4.6), p=2.6)
    rig.part("arm_r", g, team=True)
    _blade(rig, "blade_r", HR, -2.0)
    rig.track("bladeTip", "blade_r", TIP_R)
    K.sparks(rig, "blade_r", (TIP_R[0], TIP_R[1] - 1.0, TIP_R[2] - 4.0), color=K.MINT, size=1.3, name="sparks")
    # the blink-out flash (on the root, so it does not shrink with the body)
    at = (0.0, -6.0, 30.0)
    rig.joint("blink", "root", at, hidden=True)
    g = Geo().star((at[0], at[1] - 4.0, at[2]), 22.0, 5.0, 1.6, points=4)
    rig.part("blink", g, glow=K.VIOLET_GLOW, outline=0)
    g = Geo()
    for i in range(8):
        a = 2 * math.pi * (i + 0.5) / 8
        g.sphere((at[0] + 16.0 * math.cos(a), at[1] - 5.0, at[2] + 16.0 * math.sin(a)), 1.4, cuts=2)
    rig.part("blink", g, glow=K.STAR, outline=0)
    g = Geo().lathe([(9.0, -1.6), (12.0, -1.6), (12.6, 0), (12.0, 1.6), (9.0, 1.6)], (at[0], at[1] - 3.0, at[2]),
                    (at[0], at[1] - 4.0, at[2]), segs=28)
    rig.part("blink", g, team=True, outline=0.6)        # a team ring keeps the team cue to the end
    rig.joint("blink_core", "root", at, hidden=True)
    g = Geo().sphere((at[0], at[1] - 7.0, at[2]), 7.0, cuts=4)
    rig.part("blink_core", g, glow=K.VIOLET_CORE, outline=0)


# -- poses -----------------------------------------------------------------------------------
def blades(ra, rf, rw, la, lf, lw):
    return merge(K.arm("r", ra, rf, rw, 90.0), K.arm("l", la, lf, lw, 90.0))


def blades_at(hr, wr, hl, wl):
    """Hands at torso-space targets, blades pointing wr / wl (torso degrees)."""
    a, f = K.ik2(K.SH, hr)
    b, g = K.ik2(K.SH, hl)
    return blades(a, f, wr, b, g, wl)


CROUCH = {"hips": {"z": -2.0}, "torso": {"r": -14}, "head": {"r": 10, "x": 1.0},
          "thigh_r": {"r": 18}, "shin_r": {"r": -26}, "thigh_l": {"r": -2}, "shin_l": {"r": -22}}
ARMS = blades(-55, -10, 20, -40, 5, 40)
STANCE = merge(ARMS, CROUCH)


def _squeeze(sx, sz):
    """Body squeezed thin (sx) and tall (sz) about the belly."""
    off = M.about((0, 0, 28), sx=sx, sy=sx, sz=sz)
    return {"body": dict(off, sx=sx, sy=sx, sz=sz)}


def _idle(f):
    def extra(ctx):
        return {"arm_r": {"r": 3.0 * ctx["lag"]}, "arm_l": {"r": -2.5 * ctx["lag"]}}
    pose = M.idle_v2(f, STANCE, frames=6, bob=1.0, chest=0.035, extra=extra, blink=5,
                     face_blink=KF.glyph("g_blink"))
    # twirls the near blade in his fingers (a full turn over frames 1-4)
    pose["hand_r"] = dict(pose.get("hand_r", {}), r=pose.get("hand_r", {}).get("r", 0.0) + [0, 80, 170, 260, 340, 360][f])
    if f == 3:
        # the flicker: squeezed a little thin for a frame
        pose = merge(pose, _squeeze(0.9, 1.06))
    return pose


# -- walk v3: G1 ninja sprint at ground speed (card 100 x 1.25 = 125 lu/s), 8 x 64 ms -------------
SPEED = 125.0
LEGS = KC.legs_ik()
GAIT = KC.jog_gait(LEGS, SPEED, cycle_ms=512, stance=0.32, lift=7.0, x_mid=3.5)
SPRINT_BOB = [-7.4, -8.0, -3.4, -0.6]       # hips low (a hunched sprint), the bounce on top
# walk carry: both arms swept back, the reversed blades trailing level behind him
CARRY = merge(blades(-132, -112, 192, -124, -100, 186), {"head": {"r": 10, "x": 1.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = math.cos(ctx["lag_p"])
        return {"arm_r": {"r": 5 * c + 3 * lag}, "hand_r": {"r": -6 * lag}, "arm_l": {"r": -5 * c + 3 * lag},
                "hand_l": {"r": -6 * lag}, "cloak": {"r": 0.0}, "hood_tip": {"r": 0.0}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, bob=SPRINT_BOB, lean=-20.0, twist=8.0, nod=3.0,
                     extra=extra, report=report)


# -- attack: blink X-slash (680 ms, impact at 290 ms) -------------------------------------------------
#       read  dip   blink HOLD  smear lead  IMPACT over  recoil settle settle
BX = [0.0, -1.0, -1.0, 9.0, 11.0, 12.0, 13.0, 13.0, 9.0, 4.0, 1.0]
BZ = [-0.5, -3.0, 0.0, 9.0, 5.0, 2.0, -2.5, -2.0, 3.5, 0.0, 0.0]
BQ = [-0.04, -0.12, 0.0, 0.08, 0.06, 0.0, -0.16, -0.10, 0.06, -0.04, 0.0]
TR = [-16, -22, -10, 4, -14, -22, -30, -30, -18, -16, -14]
HD = [10, 14, 6, 2, 8, 12, 16, 14, 10, 10, 10]
THR = [20, 34, 10, 40, 30, 30, 44, 42, 20, 20, 18]
SHR = [-30, -50, -10, -70, -40, -34, -44, -40, -20, -26, -26]
THL = [-2, 18, 0, 30, 10, -6, -16, -14, 10, 0, -2]
SHL = [-24, -48, -8, -70, -40, -24, -20, -18, -30, -22, -22]
# hand targets (torso x, z) and blade directions in WORLD degrees
HRT = [(6.0, 25.0), (2.0, 23.0), (1.0, 28.0), (-3.0, 46.0), (9.0, 40.0), (13.0, 34.0), (13.0, 27.0),
       (13.5, 26.0), (10.0, 28.0), None, None]
HLT = [(4.0, 26.0), (0.0, 24.0), (0.0, 28.0), (-6.0, 44.0), (7.0, 44.0), (12.0, 39.0), (13.5, 33.0),
       (14.0, 32.0), (9.0, 30.0), None, None]
WR = [30.0, 10.0, 60.0, 150.0, 70.0, 10.0, -40.0, -46.0, -10.0, None, None]
WL = [60.0, 40.0, 80.0, 110.0, 40.0, 10.0, 34.0, 38.0, 40.0, None, None]
SQUEEZE = [None, None, (0.42, 1.5), None, None, None, None, None, None, None, None]
EYES = ["g_angry", "g_squint", "g_squint", "g_angry", "g_angry", "g_angry", "g_angry", "g_angry", "eyes",
        "eyes", "eyes"]


def _attack_pose(f):
    if HRT[f] is not None:
        arms = blades_at(HRT[f], WR[f] - TR[f], HLT[f], WL[f] - TR[f])
    else:
        arms = ARMS
    pose = merge(arms, {
        "hips": {"z": -2.0}, "torso": {"r": TR[f]}, "head": {"r": HD[f], "x": 1.0},
        "thigh_r": {"r": THR[f]}, "shin_r": {"r": SHR[f]},
        "thigh_l": {"r": THL[f]}, "shin_l": {"r": SHL[f]},
    }, M.body_about((0, 0, 28), x=BX[f], z=BZ[f], q=BQ[f]))
    if SQUEEZE[f]:
        sx, sz = SQUEEZE[f]
        pose = merge(pose, _squeeze(sx, sz))
    if f == 2:
        pose["blink"] = {"show": True, "s": 0.55}
    if f == 3:
        pose["blink"] = {"show": True, "s": 0.3, "x": -9.0}
    pose = merge(pose, KF.glyph(EYES[f]))
    if f in (2, 3):             # squeezed thin, or in the air after the blink: no planting
        return pose
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_clip():
    arc_r = {"kind": "arc", "joint": "blade_r", "inner": MID_R, "outer": TIP_R, "color": K.MINT, "white": 0.35,
             "taper": 0.3, "lines": 2, "from": 3}
    arc_l = {"kind": "arc", "joint": "blade_l", "inner": MID_L, "outer": TIP_L, "color": K.MINT, "white": 0.45,
             "taper": 0.3, "lines": 1, "from": 3}
    ov = {
        1: [{"kind": "dust", "ground": (-4.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 6, "spread": 0.8,
             "color": "#DCD6E8"}],
        4: [dict(arc_l, t0=0.0, t1=1.0), dict(arc_r, t0=0.0, t1=1.0)],
        5: [dict(arc_l, t0=0.3, t1=1.0), dict(arc_r, t0=0.3, t1=1.0)],
        6: [{"kind": "burst", "joint": "blade_r", "point": MID_R, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6,
             "a0": -80.0, "arc": 160.0, "color": K.MINT_CORE},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 4, "spread": 0.9,
             "color": "#DCD6E8"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov)


# -- variants: A's 680 ms, impact at 290 ms, in 10 steps (pre-impact 40+60+115+45+30 = 290) --------
V_MS = [40, 60, 115, 45, 30, 120, 60, 50, 70, 90]
V_IMPACT = 5


def _v_pose(hr, wr, hl, wl, tr, tz, bx, bz, bq, thr, shr, thl, shl, eyes, rz=0.0, plant=True):
    pose = merge(blades_at(hr, wr - tr, hl, wl - tr), {
        "hips": {"z": -2.0}, "torso": {"r": tr, "rz": tz}, "head": {"r": -0.5 * tr + 4, "rz": -0.5 * tz, "x": 1.0},
        "thigh_r": {"r": thr}, "shin_r": {"r": shr},
        "thigh_l": {"r": thl}, "shin_l": {"r": shl},
    }, M.body_about((0, 0, 28), x=bx, z=bz, q=bq, rz=rz))
    pose = merge(pose, KF.glyph(eyes))
    return KI.ground_feet(RIG, pose, LEGS) if plant else pose


# attack B: double slash. 0 sink, 1 wind, 2 HOLD (crouched low, turned away, both blades cocked back
# past the far hip), 3 smear, 4 lead, 5 IMPACT (both blades level out at the target, a long lunge),
# 6 over, 7 recoil, 8-9 = A settle
#        near hand    near w  far hand     far w   tr   tz   bx    bz    bq     thr  shr  thl  shl  eyes
B_T = [((2.0, 25.0), 150.0, (0.0, 26.0), 160.0, -16, 14, -0.5, -2.0, -0.05, 22, -32, -4, -26, "g_angry"),
       ((-6.0, 25.0), 175.0, (-7.0, 27.0), 182.0, -14, 30, -1.5, -4.0, -0.09, 30, -42, -6, -34, "g_angry"),
       ((-9.0, 26.0), 186.0, (-10.0, 28.0), 192.0, -12, 38, -2.0, -5.0, -0.11, 34, -46, -8, -38, "g_squint"),
       ((6.0, 28.0), 70.0, (4.0, 30.0), 90.0, -20, 10, 5.0, -3.5, 0.05, 34, -36, -14, -26, "g_angry"),
       ((12.0, 29.0), 20.0, (10.0, 31.0), 36.0, -24, -8, 9.0, -3.5, 0.05, 40, -38, -18, -24, "g_angry"),
       ((14.0, 28.0), -4.0, (13.0, 31.0), 8.0, -28, -18, 12.0, -4.0, -0.15, 44, -42, -22, -20, "g_angry"),
       ((14.5, 27.5), -10.0, (13.5, 30.0), 0.0, -28, -22, 12.5, -3.5, -0.08, 44, -40, -22, -18, "g_angry"),
       ((10.0, 28.0), 20.0, (9.0, 30.0), 36.0, -20, -8, 8.0, -1.5, 0.02, 30, -30, -10, -22, "eyes")]


def _b_pose(i):
    if i in (8, 9):
        return _attack_pose(i + 1)
    return _v_pose(*B_T[i])


def _attack_b():
    arc_r = {"kind": "arc", "joint": "blade_r", "inner": MID_R, "outer": TIP_R, "color": K.MINT, "white": 0.35,
             "taper": 0.3, "lines": 2}
    arc_l = {"kind": "arc", "joint": "blade_l", "inner": MID_L, "outer": TIP_L, "color": K.MINT, "white": 0.45,
             "taper": 0.3, "lines": 1}
    ov = {
        2: [{"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 51, "spread": 0.8,
             "color": "#DCD6E8", "dir": -1.0}],
        3: [dict(arc_l, **{"from": 2, "t0": 0.0, "t1": 1.0}), dict(arc_r, **{"from": 2, "t0": 0.0, "t1": 1.0})],
        4: [dict(arc_l, **{"from": 2, "t0": 0.4, "t1": 1.0}), dict(arc_r, **{"from": 2, "t0": 0.4, "t1": 1.0})],
        5: [dict(arc_r, **{"from": 3, "t0": 0.3, "t1": 1.0}),
            {"kind": "burst", "joint": "blade_r", "point": TIP_R, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6,
             "a0": -80.0, "arc": 160.0, "color": K.MINT_CORE},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 52, "spread": 0.9,
             "color": "#DCD6E8"}],
    }
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], V_MS, impact=V_IMPACT, smear=3, overlays=ov,
                  reuse={8: ("attack", 9), 9: ("attack", 10)}, extra={"holdStep": 2})


# attack C: spin. 0 sink, 1 coil, 2 HOLD (coiled deep, the near blade low behind, the far blade high in
# front), 3-4 a full turn (ring smears), 5 IMPACT (landed, both blades level out), 6 over, 7 recoil,
# 8-9 = A settle
C_T = [((2.0, 24.0), -120.0, (5.0, 30.0), 50.0, -18, 12, -1.0, -3.0, -0.06, 24, -36, -4, -28, "g_angry"),
       ((-6.0, 22.0), -150.0, (8.0, 34.0), 62.0, -16, 26, -2.0, -6.0, -0.10, 34, -48, -8, -40, "g_angry"),
       ((-9.0, 21.0), -160.0, (9.0, 36.0), 68.0, -14, 34, -2.5, -7.5, -0.12, 38, -54, -10, -44, "g_squint"),
       ((10.0, 30.0), 0.0, (-8.0, 30.0), 180.0, -10, 0, 2.0, 1.0, 0.08, 20, -28, -6, -22, "g_squint"),
       ((10.0, 30.0), 0.0, (-8.0, 30.0), 180.0, -10, 0, 4.0, 1.5, 0.06, 20, -28, -6, -22, "g_squint"),
       ((13.0, 29.0), -6.0, (-6.0, 30.0), 190.0, -24, -10, 6.0, -4.0, -0.15, 40, -40, -20, -22, "g_angry"),
       ((13.5, 28.5), -12.0, (-5.0, 29.0), 196.0, -24, -12, 6.5, -3.5, -0.07, 40, -38, -20, -20, "g_angry"),
       ((9.0, 28.0), 18.0, (2.0, 28.0), 120.0, -18, -4, 4.0, -1.5, 0.02, 28, -30, -8, -24, "eyes")]
C_RZ = [0, 0, -20, 120, 240, 360, 366, 362]


def _c_pose(i, rz=None, plant=True):
    if i in (8, 9):
        return _attack_pose(i + 1)
    return _v_pose(*C_T[i], rz=C_RZ[i] if rz is None else rz, plant=plant and i not in (3, 4))


def _attack_c():
    ring = {"kind": "arc", "joint": "blade_r", "inner": MID_R, "outer": TIP_R, "color": K.MINT, "white": 0.35,
            "taper": 0.15, "band": 0.85, "lines": 2}
    ov = {
        3: [dict(ring, **{"pose_from": _c_pose(3, rz=0.0, plant=False), "t0": 0.0, "t1": 1.0, "samples": 20})],
        4: [dict(ring, **{"pose_from": _c_pose(4, rz=110.0, plant=False), "t0": 0.0, "t1": 1.0, "samples": 20})],
        5: [dict(ring, **{"pose_from": _c_pose(5, rz=250.0, plant=False), "t0": 0.3, "t1": 1.0, "samples": 16,
                          "lines": 3}),
            {"kind": "burst", "joint": "blade_r", "point": TIP_R, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6,
             "a0": -80.0, "arc": 160.0, "color": K.MINT_CORE},
            {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 53, "spread": 0.9,
             "color": "#DCD6E8"}],
        2: [{"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 54, "spread": 0.8,
             "color": "#DCD6E8"}],
    }
    return M.clip("attack_c", [_c_pose(i) for i in range(10)], V_MS, impact=V_IMPACT, overlays=ov,
                  reuse={8: ("attack", 9), 9: ("attack", 10)}, extra={"holdStep": 2})


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return {"arm_r": {"r": 16 * a}, "arm_l": {"r": 14 * a}, "head": {"r": 14 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 16 * up}, "shin_r": {"r": -20 * up}}
    return M.hit_light(k, STANCE, recoil, face_hurt=KF.glyph("g_hurt"),
                       face_back=KF.glyph("g_angry") if k == 2 else None)


# death: a blink-out, not a fall. 0 struck (recoil), 1 folds in, 2-4 warps away: squeezed thin and
# shrinking into a violet flash, 5 a last spark as the flash closes (7 steps, 0.48 s, as shipped)
DIE_SEQ = [0, 1, 2, 3, 4, 5, 5]
DIE_MS = [60, 70, 60, 60, 60, 80, 90]


def _die(f):
    pose = merge(STANCE, {
        "body": {"x": pick(f, [-3, -4, -4, -4, -4, -4]), "z": pick(f, [1, 0, 6, 10, 13, 15]),
                 "r": pick(f, [12, 6, 0, 0, 0, 0]),
                 "s": pick(f, [1.0, 0.94, 0.72, 0.45, 0.18, 0.04]),
                 "sx": pick(f, [1.0, 1.06, 0.6, 0.45, 0.4, 1.0]), "sy": pick(f, [1.0, 1.06, 0.6, 0.45, 0.4, 1.0]),
                 "sz": pick(f, [1.0, 0.9, 1.35, 1.6, 1.8, 1.0])},
        "torso": {"r": pick(f, [16, 8, 0, 0, 0, 0])}, "head": {"r": pick(f, [14, 0, 0, 0, 0, 0])},
        "arm_r": {"r": pick(f, [60, 30, 10, 0, 0, 0])}, "arm_l": {"r": pick(f, [80, 40, 10, 0, 0, 0])},
        "blink": {"show": f >= 2, "s": pick(f, [1, 1, 0.7, 1.05, 1.3, 0.7])},
        "blink_core": {"show": f in (2, 3, 4), "s": pick(f, [1, 1, 0.8, 1.0, 1.1, 1])},
    })
    return merge(pose, KF.glyph("g_hurt" if f == 0 else "eyes_x"))


DIE_EXTRA = {"fx": [], "blinkOut": True, "hideUnitAtMs": sum(DIE_MS)}


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(f) for f in range(6)], DIE_MS, sequence=DIE_SEQ, extra=DIE_EXTRA),
    ]
    M.check_variants(M.check_contract([c for c in cl if c.name != "die"]))   # the blink-out keeps its 480 ms
    assert cl[-1].total_ms() == 480
    return cl
