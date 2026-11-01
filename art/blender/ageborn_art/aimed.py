"""Aimed attack clips (queue item 44's art part; W0 COMMON C2): an attack clip's variants aimed up about 45 and 70
degrees and down, for units that hit flyers overhead or shoot down from a height. The runtime picks, within the
playing attack variant, the aimed clip whose `aimDeg` is closest to the shot's launch angle; item 44's lean covers
only the rest.

    def clips():
        attack = _attack_clip()
        return [..., attack, ...] + aimed.variants(RIG, attack, _aim_pose, AIM_WEIGHTS)

`pose(f, turn)` is the unit's own aim rig: frame f of the base clip with the weapon turned `turn` degrees up
(negative: down), and whatever goes with it (a lean back, the head up, the arms by IK, the feet kept planted).
`weights[f]` (one per unique frame) is how much of the turn frame f takes: 0 keeps the base frame (it is reused, not
rendered again), 1 is fully aimed (the release frame must be 1); a wind-up rises into the aim and the recovery
falls out of it. For each aim the turn is solved on the rig, so the drawn weapon (`aimdata`'s axis, seen by the
sprite camera) points at the target angle at the release frame within 0.25 degrees.

A variant keeps the base clip's timing exactly (frames, sequence, step durations, the impact frame, the smear frame,
`holdStep`, `holdLoop` and every other extra) and adds `"aimOf": "<clip>"`; its 2D accents (smear2 bursts and rings
on the weapon) turn with the weapon. Variants go to the extras sheet (`<slug>.x[.hd].json`, pipeline.EXTRA_CLIPS).
"""
import copy
import math

import bpy
from mathutils import Vector

from . import config as C
from .anim import Clip

# target angles of the drawn weapon at the release frame (degrees above the facing direction on screen)
TARGETS = {"up45": 45.0, "up70": 70.0, "down": -35.0}
TOLERANCE_DEG = 0.25
SUFFIX = {a: f"_{a}" for a in TARGETS}


def name_of(clip_name, aim):
    return clip_name + SUFFIX[aim]


def _drawn(rig, pose, joint, axis):
    """The screen angle of `axis` on `joint` (degrees, counter-clockwise from the facing direction)."""
    rig.apply(pose)
    bpy.context.view_layer.update()
    e = math.radians(C.CAMERA_ELEVATION_DEG)
    v = rig.joints[joint].matrix_world.to_3x3() @ Vector(axis)
    return math.degrees(math.atan2(v[1] * math.sin(e) + v[2] * math.cos(e), v[0]))


def _feet(rig, pose):
    rig.apply(pose)
    bpy.context.view_layer.update()
    return {k: e.matrix_world.translation.copy() for k, e in rig.trackers.items() if k.startswith("_foot")}


def solve_turn(rig, pose, frame, joint, axis, target, weight=1.0, lo=-120.0, hi=120.0):
    """The turn (deg) for which the drawn weapon at `frame` points at `target` within TOLERANCE_DEG: a secant search
    on the posed rig, falling back to bisection inside [lo, hi]."""
    f = lambda t: _wrap(_drawn(rig, pose(frame, t * weight), joint, axis) - target)
    t0, t1 = 0.0, (target - _drawn(rig, pose(frame, 0.0), joint, axis))
    f0, f1 = f(t0), f(t1)
    for _ in range(40):
        if abs(f1) <= TOLERANCE_DEG * 0.5:
            return t1
        if abs(f1 - f0) < 1e-9:
            break
        t2 = t1 - f1 * (t1 - t0) / (f1 - f0)
        t2 = max(lo, min(hi, t2))
        t0, f0, t1, f1 = t1, f1, t2, f(t2)
    # bisection on a bracket
    a, b = lo, hi
    fa, fb = f(a), f(b)
    if fa * fb > 0:
        raise ValueError(f"aimed: no turn in [{lo}, {hi}] points the weapon at {target} deg")
    for _ in range(80):
        m = (a + b) / 2
        fm = f(m)
        if abs(fm) <= TOLERANCE_DEG * 0.5:
            return m
        if fa * fm <= 0:
            b, fb = m, fm
        else:
            a, fa = m, fm
    raise ValueError(f"aimed: the turn for {target} deg did not converge")


def _wrap(d):
    return (d + 180.0) % 360.0 - 180.0


def _turn_overlays(overlays, turn, weights, weapon_joint):
    """The base clip's 2D accents with the bursts and rings on the weapon turned by the frame's share of `turn`."""
    out = {}
    for f, specs in (overlays or {}).items():
        lst = []
        for s in specs:
            s = copy.deepcopy(s)
            dt = turn * weights[f]
            if s.get("kind") in ("burst", "rings") and s.get("joint") == weapon_joint and abs(dt) > 1e-6:
                for k, default in (("a0", 0.0 if s["kind"] == "burst" else -60.0), ("a1", 60.0)):
                    if k == "a1" and s["kind"] != "rings":
                        continue
                    s[k] = s.get(k, default) + dt
            lst.append(s)
        out[f] = lst
    return out


def variants(rig, clip, pose, weights, aims=("up45", "up70", "down"), targets=None, drift_lu=1.0, log=print):
    """The aimed variants of `clip` (see the module doc). `targets` overrides TARGETS per aim. Raises when a
    planted foot moves more than `drift_lu` against the base frame, when the release frame is not fully aimed,
    or when no turn reaches a target."""
    from . import aimdata
    if len(weights) != clip.frames:
        raise ValueError(f"aimed {clip.name}: {len(weights)} weights for {clip.frames} frames")
    sp = aimdata.shot_spec(rig, clip)
    if sp is None or sp.get("omni") or "deg" in sp or not sp.get("joint"):
        raise ValueError(f"aimed {clip.name}: not a shot clip with a measured weapon (aimdata.SPEC)")
    rf = aimdata.release_frame(clip, sp)
    if weights[rf] != 1.0:
        raise ValueError(f"aimed {clip.name}: the release frame {rf} must be fully aimed (weight {weights[rf]})")
    joint, axis = sp["joint"], sp["axis"]
    base0 = _drawn(rig, pose(rf, 0.0), joint, axis)
    base_feet = {f: _feet(rig, pose(f, 0.0)) for f in range(clip.frames) if weights[f] > 0}
    out = []
    for aim in aims:
        target = (targets or {}).get(aim, TARGETS[aim])
        turn = solve_turn(rig, pose, rf, joint, axis, target)
        got = _drawn(rig, pose(rf, turn), joint, axis)
        if abs(_wrap(got - target)) > TOLERANCE_DEG:
            raise ValueError(f"aimed {clip.name}_{aim}: drawn {got:.2f} deg, target {target}")
        for f, fb in base_feet.items():
            fa = _feet(rig, pose(f, turn * weights[f]))
            for k, p in fa.items():
                d = (p - fb[k]).length
                if d > drift_lu and fb[k].z < 1.5:   # a planted foot (near the ground) must stay put
                    raise ValueError(f"aimed {clip.name}_{aim}: frame {f} moves planted {k} by {d:.2f} lu")
        table = [pose(f, turn * weights[f]) if weights[f] > 0 else pose(f, 0.0) for f in range(clip.frames)]
        name = name_of(clip.name, aim)
        extra = dict(clip.extra, aimOf=clip.name)
        v = Clip(name, clip.frames, (lambda t: (lambda f: t[f]))(table), loop=clip.loop, impact=clip.impact,
                 sequence=clip.sequence, durations=clip.durations, smear=clip.smear, extra=extra)
        # frames that do not turn are the base clip's frames (or the frames it reuses itself): not rendered again
        reuse = {}
        base_reuse = getattr(clip, "reuse", None) or {}
        for f in range(clip.frames):
            if weights[f] == 0:
                reuse[f] = base_reuse.get(f, (clip.name, f))
        if reuse:
            v.reuse = reuse
        ov = getattr(clip, "overlays2", None)
        if ov:
            v.overlays2 = _turn_overlays(ov, _wrap(got - base0), weights, joint)
        log(f"  aimed {name}: turn {turn:+.1f} deg, drawn {got:.2f} at frame {rf} (base {base0:.1f}), "
            f"{clip.frames - len(reuse)} new frames")
        out.append(v)
    return out


def check_timing(base, variant):
    """C2: an aimed variant has exactly its base clip's timing."""
    mb, mv = base.meta(), variant.meta()
    for k in ("frames", "sequence", "durationsMs", "durationMs", "impactAt", "impactStep", "impactFrame",
              "holdStep", "holdLoop", "smearFrame"):
        if mb.get(k) != mv.get(k):
            raise AssertionError(f"{variant.name}.{k}: {mv.get(k)} != {base.name}'s {mb.get(k)}")
    if mv.get("aimOf") != base.name:
        raise AssertionError(f"{variant.name}: aimOf {mv.get('aimOf')} != {base.name}")
