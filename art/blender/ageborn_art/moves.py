"""Cartoon animation kit v2 (art director plan 2026-09-30, tools T1, T2 and T4).

Units that use this module author their final clips directly (set `NO_RETIME = True` in the
unit module so `retime.py` leaves them alone). Everything here keeps the shipped sheet
contract: the same clip names, the same `durationMs` per clip, the same attack `impactAt`,
the same death FX times and `hideUnitAtMs` as the v3 retimed clips.

What it gives a unit:

  timing        SMALL_MELEE (11 unique frames, 680 ms, impact at 290 ms) and HEAVY_MELEE
                (10 unique frames played in 12 steps, 1230 ms, impact at 570 ms), the hit
                (45/75/60/60/70) and die tables (small 10 frames, heavy 8 unique in 12 steps)
  clip()        a Clip from a list of pose dicts (or a pose function) plus a timing table
  die_meta()    the death FX hand-off, identical to retime.py's (same atMs and offsets)
  about()       body offsets that make a rotation/scale of the `body` joint pivot about a
                point (the body joint sits at the feet; spins look right about the belly)
  walk_v2()     biped walk: contact, DOWN (lowest, squash), passing, UP (highest, stretch),
                a foot lift that reads at 1x, arms swinging against the legs, lagging head
  idle_v2()     an 8-frame breathing loop with a weight shift and one blink frame
  hit_*()       hit variants by mass (light biped, beast)
  die_*()       death styles: D1 fling-and-spin, D3 dizzy sit, D4 legs-up flop (beasts)

Face channels (`face.py`) are merged by the unit on the frames it wants.
"""
import math

from mathutils import Euler, Matrix, Vector

from .anim import Clip, merge, squash

# -- timing tables (ms per playback step) ------------------------------------------------------
# small melee: read, dip, wind-up, HELD EXTREME, smear, smear/lead-in | IMPACT, overshoot,
# recoil, settle, settle. Pre-impact 290 of 680 ms (impactAt 0.4265, as shipped).
SMALL_MELEE_MS = [30, 45, 50, 110, 35, 20, 120, 60, 50, 70, 90]
SMALL_MELEE_IMPACT = 6
# heavy melee: weight shift, dip, coil, HELD EXTREME, smear, smear | IMPACT, shock,
# follow-through, recover, settle, settle. Pre-impact 570 of 1230 ms (impactAt 0.4634).
HEAVY_MELEE_MS = [70, 90, 100, 200, 60, 50, 150, 90, 110, 100, 100, 110]
HEAVY_MELEE_IMPACT = 6
HIT_MS = [45, 75, 60, 60, 70]
DIE_MS = [45, 60, 70, 60, 50, 60, 70, 90, 90, 100]
DIE_MS_HEAVY = [60, 70, 80, 80, 60, 70, 80, 90, 90, 100, 100, 110]
DIE_SEQ_HEAVY = [0, 1, 1, 2, 3, 4, 4, 5, 5, 6, 6, 7]   # 8 unique poses (atlas budget)
IDLE_MS, IDLE_FRAMES = 115, 8          # 920 ms
IDLE_MS_HEAVY, IDLE_FRAMES_HEAVY = 150, 6   # 900 ms
WALK_MS = [62, 63, 62, 63, 62, 63, 62, 63]   # 500 ms


def die_meta(height_lu, heavy=False):
    """The death hand-off (same numbers as retime._die): poof 40 ms before the last two
    steps, KO stars 40 ms after, the body hidden at the end of the clip."""
    ms = DIE_MS_HEAVY if heavy else DIE_MS
    total = sum(ms)
    handoff = sum(ms[:len(ms) - 2])
    h = height_lu
    return {
        "fx": [
            {"id": "fx.dust_poof", "atMs": handoff - 40, "offsetLu": [0, round(h * 0.36, 1)]},
            {"id": "fx.ko_stars", "atMs": handoff + 40, "offsetLu": [0, round(h * 0.55, 1)],
             "loops": 2, "scalePow": 0.5},
        ],
        "hideUnitAtMs": total,
    }


def clip(name, poses, durations, loop=False, impact=None, smear=None, sequence=None, extra=None,
         smears=None):
    """A Clip from a list of poses (dicts) or a pose function with len(durations) frames.
    `smears` = {unique frame: smear2 spec} marks the frames that get a 2D smear (smear2.py)."""
    if callable(poses):
        n = (max(sequence) + 1) if sequence else len(durations)
        fn = poses
    else:
        n = len(poses)
        table = list(poses)
        fn = lambda f: table[f]
    c = Clip(name, n, fn, loop=loop, impact=impact, smear=smear, sequence=sequence,
             durations=durations, extra=extra)
    if smears:
        c.smears2 = dict(smears)
    return c


def check_contract(clips, heavy=False, attack_ms=None, attack_impact_at=None):
    """Asserts the frozen timing: clip totals and the attack impactAt (to 4 decimals)."""
    by = {c.name: c for c in clips}
    want = {"idle": 900 if heavy else 920, "hit": 310, "die": 990 if heavy else 695}
    for k, v in want.items():
        if k in by:
            assert by[k].total_ms() == v, (k, by[k].total_ms(), v)
    a = by.get("attack")
    if a is not None:
        m = a.meta()
        tot = attack_ms or (1230 if heavy else 680)
        imp = attack_impact_at if attack_impact_at is not None else (0.4634 if heavy else 0.4265)
        assert m["durationMs"] == tot, ("attack total", m["durationMs"], tot)
        assert abs(m["impactAt"] - imp) < 1e-9, ("impactAt", m["impactAt"], imp)
    return clips


# -- pivot helper -----------------------------------------------------------------------------
def about(center, r=0.0, rx=0.0, rz=0.0, sx=1.0, sy=1.0, sz=1.0, s=1.0):
    """x, y, z offsets for a joint whose pivot is at the origin of `center`'s space so that
    the rotation (r = side-plane angle, ccw on screen; rx roll; rz yaw) and scale happen
    about `center` (lu, relative to the joint's pivot) instead. rig.apply uses Euler XYZ =
    (rx, -r, rz) and location + R @ S @ p."""
    R = Euler((math.radians(rx), -math.radians(r), math.radians(rz)), "XYZ").to_matrix()
    c = Vector(center)
    S = Matrix.Diagonal((s * sx, s * sy, s * sz))
    d = c - R @ (S @ c)
    return {"x": d.x, "y": d.y, "z": d.z}


def body_about(center, x=0.0, z=0.0, r=0.0, rx=0.0, rz=0.0, q=0.0, s=1.0, extra_y=0.0):
    """Body channels: a squash `q` (volume preserving), rotation and translation, all about
    `center` (x, y, z) above the feet."""
    sq = squash(q) if q else {"sx": 1.0, "sy": 1.0, "sz": 1.0}
    off = about(center, r=r, rx=rx, rz=rz, sx=sq["sx"], sy=sq["sy"], sz=sq["sz"], s=s)
    ch = dict(sq)
    ch.update(x=off["x"] + x, y=off["y"] + extra_y, z=off["z"] + z, r=r)
    if rx:
        ch["rx"] = rx
    if rz:
        ch["rz"] = rz
    if s != 1.0:
        ch["s"] = s
    return {"body": ch}


# -- walk v2 ----------------------------------------------------------------------------------
# frame: 0 contact R, 1 DOWN, 2 passing (L foot up), 3 UP, 4 contact L, 5 DOWN, 6 passing (R), 7 UP
WALK_BOB = [-0.25, -1.0, 0.25, 1.0, -0.25, -1.0, 0.25, 1.0]
WALK_SQ = [-0.01, -0.06, 0.0, 0.04, -0.01, -0.06, 0.0, 0.04]


def walk_v2(f, stance, height, *, thigh=34.0, knee=62.0, lift_lu=6.5, bob_pct=0.06, lean=-7.0,
            arm=30.0, fore=18.0, twist=6.0, sway=0.0, arms=("r", "l"), extra=None,
            bow=0.0, heavy_down=1.0):
    """Biped walk, 8 frames. `stance` is the unit's base pose; `extra(ctx)` adds the unit's
    prop and personality motion (ctx: p, lag_p, bob, bob_lag, lift_r, lift_l, f).
    The swing foot lifts `lift_lu` (thigh z plus knee bend) so it reads at game size; the
    arms in `arms` swing opposite the legs; the head lags one frame."""
    p = 2 * math.pi * f / 8
    lag_p = 2 * math.pi * (f - 1) / 8
    # the right foot swings forward during frames 5-7, the left during 1-3
    lift_r = max(0.0, -math.sin(p))
    lift_l = max(0.0, math.sin(p))
    amp = bob_pct * height / 2
    bob = WALK_BOB[f] * amp
    bob_lag = WALK_BOB[(f - 1) % 8] * amp
    down = heavy_down if WALK_BOB[f] < -0.5 else 1.0
    pose = {
        "hips": {"z": bob * down, "r": sway * math.sin(p)},
        "body": squash(WALK_SQ[f] * down),
        "torso": {"r": lean + 1.5 * math.cos(2 * p), "rz": twist * math.sin(p), "rx": sway * 0.5 * math.sin(p)},
        "head": {"r": -lean * 0.5 - 2.5 * bob_lag / max(amp, 1e-3)},
        "thigh_r": {"r": thigh * math.cos(p) + 18 * lift_r, "z": lift_lu * 0.55 * lift_r, "rx": -bow},
        "shin_r": {"r": -knee * lift_r},
        "thigh_l": {"r": -thigh * math.cos(p) + 18 * lift_l, "z": lift_lu * 0.55 * lift_l, "rx": bow},
        "shin_l": {"r": -knee * lift_l},
    }
    if "r" in arms:
        pose["arm_r"] = {"r": -arm * math.cos(lag_p)}
        pose["fore_r"] = {"r": fore * max(0.0, -math.cos(lag_p))}
    if "l" in arms:
        pose["arm_l"] = {"r": arm * math.cos(lag_p)}
        pose["fore_l"] = {"r": fore * max(0.0, math.cos(lag_p))}
    ctx = dict(p=p, lag_p=lag_p, bob=bob, bob_lag=bob_lag, lift_r=lift_r, lift_l=lift_l, f=f, amp=amp)
    return merge(stance, pose, extra(ctx) if extra else {})


# -- idle v2 ----------------------------------------------------------------------------------
def idle_v2(f, stance, frames=IDLE_FRAMES, bob=1.4, chest=0.03, shift=1.2, blink=5, extra=None,
            face_blink=None):
    """A breathing loop: chest in and out, the weight shifting from foot to foot once per
    loop, the head one frame behind, and one blink frame. `extra(ctx)` adds the unit's
    rhythm (ctx: c = breath -1..1, lag, sh = weight shift -1..1, f)."""
    c = math.cos(2 * math.pi * f / frames)          # 1 = exhaled (low), -1 = inhaled
    lag = math.cos(2 * math.pi * (f - 1) / frames)
    sh = math.sin(2 * math.pi * f / frames)
    pose = {
        "hips": {"z": -bob * 0.5 * c, "x": shift * 0.3 * sh},
        "body": squash(-chest * c),
        "torso": {"r": 1.4 * c, "rx": 1.5 * sh},
        "head": {"r": -2.2 * lag, "z": -0.3 * lag},
    }
    out = merge(stance, pose, extra(dict(c=c, lag=lag, sh=sh, f=f)) if extra else {})
    if face_blink and f == blink:
        out = merge(out, face_blink)
    return out


# -- hit variants (2.4) ----------------------------------------------------------------------
HIT_AMT = [0.75, 1.0, 0.45, -0.22, 0.04]   # contact, held recoil, return, overshoot, settle


def hit_light(k, stance, recoil, face_hurt=None, face_back=None):
    """Light biped: the head snaps back, the torso bends, the front foot leaves the ground,
    the eyes squeeze and the hat lifts, then an overshoot forward. `recoil(a)` is the unit's
    pose at full recoil scaled by a (a < 0 is the forward overshoot)."""
    a = HIT_AMT[k]
    q = [-0.10, 0.06, 0.02, -0.03, 0.0][k]
    out = merge(stance, {"body": dict(squash(q), x=-4.5 * max(a, 0) + 1.2 * min(a, 0))}, recoil(a))
    if k <= 1 and face_hurt:
        out = merge(out, face_hurt)
    elif face_back:
        out = merge(out, face_back)
    return out


def hit_beast(k, stance, recoil, face_hurt=None):
    """Beast: a head shake with the ears back and a hop of the hind legs."""
    a = HIT_AMT[k]
    shake = [0.0, 1.0, -0.8, 0.45, 0.0][k]
    out = merge(stance, recoil(a, shake))
    if k <= 1 and face_hurt:
        out = merge(out, face_hurt)
    return out


# -- death styles (2.5) ---------------------------------------------------------------------
# D1 fling and spin (light infantry): struck, launched back and up spinning 1.25 turns, a
# ground hit, a bounce, then a sprawl on the back. (x back, z up, r spin, q squash)
D1_PATH = [
    dict(x=-2.0, z=0.0, r=10.0, q=-0.14),
    dict(x=-6.0, z=9.0, r=70.0, q=0.14),
    dict(x=-11.0, z=16.0, r=190.0, q=0.08),
    dict(x=-15.0, z=12.0, r=320.0, q=0.02),
    dict(x=-18.0, z=0.0, r=435.0, q=-0.22),
    dict(x=-20.0, z=3.5, r=445.0, q=0.08),
    dict(x=-21.0, z=0.0, r=450.0, q=-0.10),
    dict(x=-21.0, z=0.0, r=450.0, q=-0.04),
    dict(x=-21.0, z=0.0, r=450.0, q=-0.08, s=0.96),
    dict(x=-21.0, z=0.0, r=450.0, q=-0.12, s=0.9),
]


def die_d1(k, center_z, lie_z, height):
    """Body channels of the D1 path, step k of 10: the spin pivots about the belly
    (`center_z` above the feet) and the landed body lies with its centre `lie_z` up."""
    b = D1_PATH[k]
    sc = max(0.7, min(1.4, height / 68.0))
    air = b["z"] * sc
    land = 0.0
    if abs(b["r"]) > 380:
        # on the ground: lower the centre from standing height to lying height
        land = -(center_z - lie_z) * min(1.0, (b["r"] - 380) / 55.0)
    return body_about((0, 0, center_z), x=b["x"] * sc, z=air + land, r=b["r"], q=b["q"], s=b.get("s", 1.0))


# D3 dizzy sit: wobbles and spins in place (yaw), then sits down hard.
D3_PATH = [
    dict(x=-2.0, z=0.0, r=8.0, rz=0.0, q=-0.12),
    dict(x=-4.0, z=3.0, r=-6.0, rz=90.0, q=0.08),
    dict(x=-5.0, z=4.0, r=8.0, rz=200.0, q=0.04),
    dict(x=-5.5, z=2.0, r=-8.0, rz=300.0, q=0.0),
    dict(x=-6.0, z=0.0, r=6.0, rz=360.0, q=-0.18),
    dict(x=-6.0, z=0.0, r=-4.0, rz=360.0, q=0.06),
    dict(x=-6.0, z=0.0, r=3.0, rz=360.0, q=-0.06),
    dict(x=-6.0, z=0.0, r=0.0, rz=360.0, q=-0.02),
    dict(x=-6.0, z=0.0, r=0.0, rz=360.0, q=-0.06, s=0.96),
    dict(x=-6.0, z=0.0, r=0.0, rz=360.0, q=-0.10, s=0.9),
]


def die_d3(k, center_z, height):
    b = D3_PATH[k]
    sc = max(0.7, min(1.4, height / 68.0))
    return body_about((0, 0, center_z), x=b["x"] * sc, z=b["z"] * sc, r=b["r"], rz=b["rz"],
                      q=b["q"], s=b.get("s", 1.0))


# D4 legs-up flop (beasts): a stagger, a roll onto the back (rx toward the camera), the legs
# in the air and kicking once. 8 unique heavy poses or 10 small ones.
D4_PATH = [  # x back, z up, r pitch, rx roll, q squash
    dict(x=-2.0, z=0.0, r=4.0, rx=0.0, q=-0.08),
    dict(x=-4.0, z=4.0, r=10.0, rx=-15.0, q=0.06),
    dict(x=-6.0, z=6.0, r=14.0, rx=-70.0, q=0.03),
    dict(x=-7.0, z=3.0, r=10.0, rx=-130.0, q=0.0),
    dict(x=-8.0, z=0.0, r=6.0, rx=-175.0, q=-0.14),
    dict(x=-8.5, z=1.5, r=4.0, rx=-180.0, q=0.05),
    dict(x=-8.5, z=0.0, r=2.0, rx=-180.0, q=-0.06),
    dict(x=-8.5, z=0.0, r=0.0, rx=-180.0, q=-0.02),
    dict(x=-8.5, z=0.0, r=0.0, rx=-180.0, q=-0.05, s=0.97),
    dict(x=-8.5, z=0.0, r=0.0, rx=-180.0, q=-0.08, s=0.92),
]


def die_d4(k, center_z, back_z, height, heavy=False):
    """Beast flop, step k of 10. Upside down, the body's centre sits `back_z` above the
    ground (half the trunk's depth), so the back rests on the ground."""
    b = D4_PATH[k]
    sc = max(0.8, min(1.6, height / 68.0)) if not heavy else 1.2
    roll = abs(b["rx"]) / 180.0
    land = -(center_z - back_z) * roll ** 1.5
    return body_about((0, 0, center_z), x=b["x"] * sc, z=b["z"] * sc + land, r=b["r"], rx=b["rx"],
                      q=b["q"], s=b.get("s", 1.0))


HEAVY_DIE_KEEP = [0, 1, 3, 4, 5, 7, 8, 9]   # D-path steps kept as the 8 unique heavy poses
