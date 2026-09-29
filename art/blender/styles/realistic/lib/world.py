"""World art for the realistic style: the turret and base sheet contracts (art/blender/world/README.md,
src/visuals/adapters/worldAtlas.ts), on top of the same renderer as the units (`game.py`).

Turret sheet clips (1x only, `turrets/<age>/<slug>.json`):
  mount 1 frame (footing only) | idle 4 frames ping-pong (head only) | fire 5 frames (head only, frame 1
  is the shot, per-frame `anchorsLu.muzzle`) | build 4 frames (whole turret) | destroyed 3 frames (whole)
  meta: kind, age, pivotLu (screen lu of the head pivot, the aim rotation centre), aimLimits, fireKind.
Base sheet clips (1x only, `bases/<age>.json`):
  body 4 frames (crumble stages 0-3; flags and Treasury hidden; `anchorsLu.mount0..3` trackers) |
  flagA / flagB 4-frame loops (one flag each) | treasury 3 frames (Treasury props, cumulative)
  meta: kind, age, widthLu, mountsLu (= the shared BASE_MOUNTS), flags, lightsLu, smokeLu, hornLu.

Visual groups: every object gets `o["grp"]` (e.g. 'mount', 'head', 'flagA', 'treasury2', 'crumble1+');
`show_groups(ctx, visible)` hides the rest per frame. Groups ending in '+N' are shown from crumble
stage N on; groups ending in '-N' are shown up to stage N (inclusive).
"""
import math

import bpy

from . import core as C
from . import game as G

# shared with src/visuals/manifest.world.ts (WORLD_BASE_MOUNTS_LU): screen lu from the gate, y up
BASE_MOUNTS = [(-6, 46), (-50, 112), (-8, 178), (-56, 246)]

IDLE_SEQ = [0, 1, 2, 3, 2, 1]
IDLE_MS = [170] * 6
FIRE_MS = [60, 50, 80, 100, 130]
BUILD_MS = [140, 80, 90, 120]
DESTROYED_MS = [80, 100, 160]
FLAG_MS = [110] * 4


def grp(o, name):
    o["grp"] = name
    return o


def show_groups(ctx, fn):
    """fn(group name) -> visible? Applied to every tagged object of the scene."""
    for o in bpy.context.scene.objects:
        g = o.get("grp")
        if g is not None:
            o.hide_render = not fn(g)


def turret_clips(dust_build=None, dust_destroyed=None, fire_fx=None):
    fire = G.Clip("fire", FIRE_MS, impact=1)
    if fire_fx:
        fire.fx.update(fire_fx)
    build = G.Clip("build", BUILD_MS)
    if dust_build:
        build.fx.update(dust_build)
    dest = G.Clip("destroyed", DESTROYED_MS)
    if dust_destroyed:
        dest.fx.update(dust_destroyed)
    idle = G.Clip("idle", IDLE_MS, loop=True, sequence=IDLE_SEQ, times=[0, 170, 340, 510])
    return [G.Clip("mount", [1000]), idle, fire, build, dest]


def turret_visibility(ctx, clip):
    if clip == "mount":
        show_groups(ctx, lambda g: g == "mount")
    elif clip in ("idle", "fire"):
        show_groups(ctx, lambda g: g != "mount" and g != "fx" or (g == "fx" and clip == "fire"))
    else:
        show_groups(ctx, lambda g: g != "fx")


def base_clips(flags=("flagA", "flagB")):
    out = [G.Clip("body", [1000] * 4)]
    for f in flags:
        out.append(G.Clip(f, FLAG_MS, loop=True))
    out.append(G.Clip("treasury", [1000] * 3))
    return out


def crumble_visible(g, stage):
    if g.endswith(tuple(f"+{i}" for i in range(4))):
        return stage >= int(g[-1])
    if g.endswith(tuple(f"-{i}" for i in range(4))):
        return stage <= int(g[-1])
    return True


def base_visibility(ctx, clip, frame):
    if clip == "body":
        show_groups(ctx, lambda g: not g.startswith(("flag", "treasury")) and crumble_visible(g, frame))
    elif clip.startswith("flag"):
        show_groups(ctx, lambda g: g == clip)
    else:
        show_groups(ctx, lambda g: g.startswith("treasury") and int(g[len("treasury")]) <= frame + 1)


def frame_of(clip, t):
    """Unique frame index shown at clip time t (ms)."""
    c = clip
    best = 0
    for i, ti in enumerate(c.times):
        if ti <= t + 1e-6:
            best = i
    return best


def pivot_lu(p, yaw):
    """Screen lu (x right, y up) of a character-space point for a rig yawed by `yaw` degrees."""
    a = math.radians(yaw)
    x = p[0] * math.cos(a) - p[1] * math.sin(a)
    y = p[0] * math.sin(a) + p[1] * math.cos(a)
    sx, sy = C.screen_lu((x, y, p[2]))
    return [round(sx, 2), round(sy, 2)]
