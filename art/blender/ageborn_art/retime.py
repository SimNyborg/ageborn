"""Clip retiming (art director review, fixes 4 and 5): richer idle, hit and die clips and
per-role attack timing, derived from each unit's own authored poses.

Unit modules author short clips (idle 4 poses ping-pong, hit 3, die 3, attack 8). Rather
than rewrite 36 pose tables, `retime(mod, clips)` builds new clips whose unique frames are
blends of the authored poses (`lerp_pose` between integer frames), plus shared motion on
the `body` joint:

  idle    8 frames, one smooth loop through the authored ping-pong at IDLE_MS each
  hit     5 frames, about 300 ms: snap into the recoil, hold, recover toward the stance
  die     10 frames, about 700 ms (heavies 12, about 950 ms): knockback, a small airborne
          arc, ground bounce, slump, then the shared dust poof and KO stars hide the body
  attack  light melee: 3 wind-up / 2 hold on impact / 3 recovery, snappy
          heavy melee: 5 wind-up frames, 3 held impact frames, 4 recovery frames
          ranged: unchanged frames plus a recoil kick on the frame after the shot

Pose functions are only ever evaluated at the integer frames they were authored for.
"""
import inspect

from . import fx
from .anim import Clip, lerp_pose, merge, squash

IDLE_FRAMES = 8
IDLE_MS = 115

# units whose melee attack uses the heavy timing (DESIGN A5 heavies and melee Legendaries)
HEAVY_MELEE = {
    "destrier_knight", "cuirassier", "mammoth_matriarch", "tuskback", "ursa_paladin",
    "walker_mech", "chrono_titan", "battering_ram", "sabertooth",
}

SCALE = ("s", "sx", "sy", "sz", "alpha")


def _at(fn, n, u):
    """The authored pose at fractional frame u (blend of the two nearest integer frames)."""
    u = max(0.0, min(n - 1.0, u))
    a = int(u)
    t = u - a
    if t < 1e-6 or a >= n - 1:
        return fn(min(a, n - 1))
    return lerp_pose(fn(a), fn(a + 1), t)


def _sub(pose, remove):
    """pose minus the channels `remove` contributed through merge (adds / multiplies)."""
    out = {j: dict(ch) for j, ch in pose.items()}
    for j, ch in remove.items():
        dst = out.setdefault(j, {})
        for k, v in ch.items():
            if isinstance(v, bool):
                continue
            if k in SCALE:
                dst[k] = dst.get(k, 1.0) / (v if abs(v) > 1e-6 else 1.0)
            else:
                dst[k] = dst.get(k, 0.0) - v
    return out


def _idle(clip):
    seq = clip.sequence
    n = len(seq)
    src = clip.pose_fn

    def pose(k):
        s = k * n / IDLE_FRAMES
        i = int(s)
        t = s - i
        a, b = seq[i % n], seq[(i + 1) % n]
        if t < 1e-6:
            return src(a)
        return lerp_pose(src(a), src(b), t)

    return Clip("idle", IDLE_FRAMES, pose, loop=True, durations=IDLE_MS)


def _hit(clip, idle0):
    src, n = clip.pose_fn, clip.frames
    # (authored position, blend toward the stance, extra body squash)
    plan = [(0.0, 0.45, -0.04), (0.0, 0.0, -0.06), (0.5, 0.0, 0.02), (1.3, 0.0, 0.0),
            (2.0, 0.55, 0.0)]

    def pose(k):
        u, back, sq = plan[k]
        p = _at(src, n, u)
        if back > 0:
            p = lerp_pose(p, idle0, back)
        if sq:
            p = merge(p, {"body": squash(sq)})
        return p

    return Clip("hit", len(plan), pose, durations=[45, 75, 60, 60, 70])


# body trajectory of the death (added on top of the authored limbs; replaces fx.die_pose)
DIE_BODY = [  # x back, z up, r spin, squash
    dict(x=-3.0, z=0.0, r=8.0, q=-0.10),     # struck: squash into the blow
    dict(x=-7.0, z=6.0, r=18.0, q=0.12),     # launched
    dict(x=-11.0, z=9.5, r=26.0, q=0.06),    # apex
    dict(x=-14.0, z=6.0, r=32.0, q=0.0),     # falling
    dict(x=-16.0, z=0.0, r=30.0, q=-0.26),   # ground hit
    dict(x=-17.0, z=2.5, r=24.0, q=0.05),    # small bounce
    dict(x=-17.5, z=0.0, r=20.0, q=-0.20),   # settle
    dict(x=-17.5, z=0.0, r=18.0, q=-0.28),   # slump
    dict(x=-17.5, z=0.0, r=14.0, q=-0.40, s=0.92),  # hand-off (the poof covers it)
    dict(x=-17.5, z=0.0, r=10.0, q=-0.50, s=0.82),
]
DIE_MS = [45, 60, 70, 60, 50, 60, 70, 90, 90, 100]
DIE_U = [0.0, 0.3, 0.6, 0.85, 1.0, 1.0, 1.3, 1.7, 2.0, 2.0]
# heavies: no flight, a stagger, a heavy fall and a long slump
DIE_BODY_HEAVY = [
    dict(x=-2.0, z=0.0, r=5.0, q=-0.06),
    dict(x=-4.0, z=1.5, r=9.0, q=0.05),
    dict(x=-6.0, z=2.5, r=13.0, q=0.04),
    dict(x=-7.0, z=2.0, r=16.0, q=0.0),
    dict(x=-8.0, z=0.0, r=18.0, q=-0.16),
    dict(x=-8.5, z=0.8, r=16.0, q=0.03),
    dict(x=-9.0, z=0.0, r=15.0, q=-0.12),
    dict(x=-9.0, z=0.0, r=14.0, q=-0.18),
    dict(x=-9.0, z=0.0, r=13.0, q=-0.24),
    dict(x=-9.0, z=0.0, r=12.0, q=-0.30),
    dict(x=-9.0, z=0.0, r=10.0, q=-0.40, s=0.94),
    dict(x=-9.0, z=0.0, r=8.0, q=-0.50, s=0.84),
]
DIE_MS_HEAVY = [60, 70, 80, 80, 60, 70, 80, 90, 90, 100, 100, 110]
DIE_U_HEAVY = [0.0, 0.2, 0.4, 0.6, 0.85, 1.0, 1.0, 1.3, 1.6, 2.0, 2.0, 2.0]


def _body(b, scale):
    ch = dict(squash(b["q"]))
    ch.update(x=b["x"] * scale, z=b["z"] * scale, r=b["r"])
    if "s" in b:
        ch["s"] = b["s"]
    return {"body": ch}


def _die(clip, mod, heavy):
    src, n = clip.pose_fn, clip.frames
    uses_die_pose = "fx.die_pose" in inspect.getsource(mod)
    body, ms, us = (DIE_BODY_HEAVY, DIE_MS_HEAVY, DIE_U_HEAVY) if heavy else (DIE_BODY, DIE_MS, DIE_U)
    scale = max(0.7, min(1.6, mod.HEIGHT_LU / 68.0)) if not heavy else 1.2

    def pose(k):
        u = us[k]
        p = _at(src, n, u)
        if uses_die_pose:
            p = _sub(p, lerp_pose(fx.die_pose(int(u)), fx.die_pose(min(2, int(u) + 1)), u - int(u))
                     if u - int(u) > 1e-6 else fx.die_pose(int(u)))
            p = merge(p, _body(body[k], scale))
        return p

    total = sum(ms)
    handoff = sum(ms[:len(ms) - 2])
    h = mod.HEIGHT_LU
    extra = {
        "fx": [
            {"id": "fx.dust_poof", "atMs": handoff - 40, "offsetLu": [0, round(h * 0.36, 1)]},
            {"id": "fx.ko_stars", "atMs": handoff + 40, "offsetLu": [0, round(h * 0.55, 1)],
             "loops": 2, "scalePow": 0.5},
        ],
        "hideUnitAtMs": total,
    }
    return Clip("die", len(ms), pose, durations=ms, extra=extra)


def _light_melee(clip):
    return Clip("attack", clip.frames, clip.pose_fn, impact=clip.impact, smear=clip.smear,
                durations=[65, 70, 120, 35, 140, 80, 80, 90], extra=clip.extra)


def _heavy_melee(clip):
    src, n = clip.pose_fn, clip.frames
    imp, sm = clip.impact, clip.smear
    # wind-up: 5 frames easing into the held extreme (frame sm-1), smear, 3 impact, 4 recovery
    ext = sm - 1
    wind = [ext * t for t in (0.0, 0.3, 0.6, 0.85, 1.0)]
    plan = [(u, None) for u in wind] + [(float(sm), None)]
    plan += [(float(imp), -0.06), (float(imp), 0.0), (imp + 0.35, 0.0)]
    rec = [imp + 1.0, imp + 1.7, n - 1.4, n - 1.0]
    plan += [(u, None) for u in rec]
    ms = [90, 80, 80, 90, 190, 40, 90, 90, 90, 90, 90, 100, 110]

    def pose(k):
        u, sq = plan[k]
        p = _at(src, n, u)
        if sq:
            p = merge(p, {"body": squash(sq)})
        return p

    return Clip("attack", len(plan), pose, impact=6, smear=5, durations=ms, extra=clip.extra)


def _ranged(clip):
    src, imp = clip.pose_fn, clip.impact

    def pose(k):
        p = src(k)
        if k in (imp + 1, imp + 2) and "body" in p:
            a = 1.0 if k == imp + 1 else 0.45
            kick = {"body": {"x": -3.0 * a}}
            if "torso" in p:
                kick["torso"] = {"r": 5.0 * a}
            p = merge(p, kick)
        return p

    return Clip("attack", clip.frames, pose, impact=imp, smear=clip.smear,
                durations=clip.durations, sequence=clip.sequence, extra=clip.extra)


def retime(mod, clips):
    if getattr(mod, "TEAM", True) is False or getattr(mod, "NO_RETIME", False):
        return clips
    slug = mod.SLUG
    heavy = mod.HEIGHT_LU >= 100 or slug in HEAVY_MELEE
    by = {c.name: c for c in clips}
    idle0 = by["idle"].pose_fn(by["idle"].sequence[0]) if "idle" in by else {}
    out = []
    for c in clips:
        if c.name == "idle" and c.frames == 4 and c.sequence == fx.IDLE_SEQUENCE:
            out.append(_idle(c))
        elif c.name == "hit" and c.frames == 3:
            out.append(_hit(c, idle0))
        elif c.name == "die" and c.frames == 3:
            out.append(_die(c, mod, heavy))
        elif c.name == "attack" and c.frames == 8 and c.smear is not None and c.impact == c.smear + 1 \
                and len(c.sequence) == 8:
            out.append(_heavy_melee(c) if slug in HEAVY_MELEE else _light_melee(c))
        elif c.name == "attack" and c.smear is None and c.impact is not None and c.frames >= c.impact + 3:
            out.append(_ranged(c))
        else:
            out.append(c)
    return out
