"""Render every unique frame of every clip in two passes (base and team layer).

Before rendering a clip, the rig is posed through the clip's playback once without
rendering to drive secondary motion (anim.follow_through) and to measure trackers.
A clip's smear frame gets a swept ribbon along the weapon head's path from the previous
frame (flat, weapon colour mixed 50% with white, no outline).
"""
import math
import os
import time

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

from . import config as C
from . import materials
from .anim import follow_through, lerp_pose, soft_clamp
from .colors import mix
from .geometry import ribbon_mesh


def render_to(path):
    """Render the current scene to a PNG, silencing Cycles' per-tile log lines."""
    bpy.context.scene.render.filepath = path
    saved = os.dup(1)
    devnull = os.open(os.devnull, os.O_WRONLY)
    try:
        os.dup2(devnull, 1)
        bpy.ops.render.render(write_still=True)
    finally:
        os.dup2(saved, 1)
        os.close(devnull)
        os.close(saved)


def _update():
    bpy.context.view_layer.update()


def add_follow_through(rig, clip, poses):
    """Adds each secondary joint's spring rotation to the clip's poses (in place)."""
    if not rig.secondaries:
        return poses
    kin = {}
    for idx in sorted(set(clip.sequence)):
        rig.apply(poses[idx])
        _update()
        per = {}
        for name, sec in rig.secondaries.items():
            parent = rig.parent_of[name]
            p = rig.char_pos(rig.joints[name])
            t = rig.char_pos(sec["tip"])
            u = t - p
            L = max(1.0, math.hypot(u.x, u.z))
            per[name] = {"A": rig.side_angle(parent), "px": p.x, "pz": p.z,
                         "ux": u.x / L, "uz": u.z / L, "L": L}
        kin[idx] = per
    for name, sec in rig.secondaries.items():
        steps = [kin[i][name] for i in clip.sequence]
        # unwrap angles so a 350 -> 10 degree step is +20, not -340
        for a, b in zip(steps, steps[1:]):
            while b["A"] - a["A"] > 180:
                b["A"] -= 360
            while b["A"] - a["A"] < -180:
                b["A"] += 360
        phi = follow_through(steps, clip.durations, clip.loop, sec["gain"])
        acc = {}
        for i, v in zip(clip.sequence, phi):
            acc.setdefault(i, []).append(v)
        for i, vals in acc.items():
            r = soft_clamp(sum(vals) / len(vals), sec["max"])
            ch = poses[i].setdefault(name, {})
            ch["r"] = ch.get("r", 0.0) + r
    return poses


def _screen_lu(point, feet_px):
    """World point -> screen-plane lu relative to the feet (x right, y up)."""
    scene = bpy.context.scene
    co = world_to_camera_view(scene, scene.camera, point)
    w, h = scene.render.resolution_x, scene.render.resolution_y
    x, y = co.x * w, (1.0 - co.y) * h
    return [round((x - feet_px[0]) / C.PX_PER_LU, 1), round((feet_px[1] - y) / C.PX_PER_LU, 1)]


def _smear(rig, spec, pose_a, pose_b, samples=10):
    """Ribbon through the weapon head's path from pose_a to pose_b (world space)."""
    joint = rig.joints[spec["joint"]]
    inner = Vector(spec["inner"]) - rig.rest[spec["joint"]]
    outer = Vector(spec["outer"]) - rig.rest[spec["joint"]]
    pairs = []
    t0 = spec.get("start", 0.3)  # only the last part of the path: a short, readable arc
    for k in range(samples + 1):
        t = t0 + (1 - t0) * k / samples
        rig.apply(lerp_pose(pose_a, pose_b, t))
        _update()
        m = joint.matrix_world
        a, b = m @ inner, m @ outer
        # taper the trailing end, and sit a little behind the weapon so it overlaps it
        u = (t - t0) / (1 - t0)
        w = spec.get("taper", 0.25) + (1 - spec.get("taper", 0.25)) * u
        a = b + (a - b) * w
        push = Vector((0.0, spec.get("behind", 3.0), 0.0))
        pairs.append((a + push, b + push))
    me = ribbon_mesh(pairs, f"{rig.name}.smear")
    me.materials.append(materials.glow(mix(spec["color"], "#FFFFFF", 0.5)))
    obj = bpy.data.objects.new(f"{rig.name}.smear", me)
    for flag in ("visible_diffuse", "visible_glossy", "visible_shadow",
                 "visible_transmission", "visible_volume_scatter"):
        setattr(obj, flag, False)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def render_frame(rig, pose, base_path, team=True, smear=None):
    """Renders one posed frame: base pass, team pass (if team surfaces are visible) and,
    with a smear ribbon, a ribbon-only pass (it goes under the unit, without an outline).
    Returns (base_path, team_path or None, smear_path or None)."""
    rig.apply(pose)
    _update()
    rig.set_pass(False)
    if smear:
        smear.visible_camera = False
    render_to(base_path)
    team_path = smear_path = None
    if team and rig.has_visible_team():
        team_path = base_path.replace(".png", "_team.png")
        rig.set_pass(True)
        render_to(team_path)
    if smear:
        for part in rig.parts:
            for o in (part["obj"], part["hull"]):
                if o is not None:
                    o.visible_camera = False
        smear.visible_camera = True
        smear_path = base_path.replace(".png", "_smear.png")
        render_to(smear_path)
        bpy.data.objects.remove(smear, do_unlink=True)
    return base_path, team_path, smear_path


def clip_poses(rig, clip):
    """The clip's unique poses with follow-through added."""
    return add_follow_through(rig, clip, [clip.pose(i) for i in range(clip.frames)])


def smear_for(rig, clip, poses, idx, spec):
    if not spec or clip.smear != idx:
        return None
    prev = clip.sequence[clip.sequence.index(idx) - 1]
    return _smear(rig, spec, poses[prev], poses[idx])


def render_clips(rig, clips, frame_dir, feet_px, smear_spec=None, team=True, log=print):
    """Writes <clip>_<nn>.png (base), <clip>_<nn>_team.png (team layer) and, on smear
    frames, <clip>_<nn>_smear.png into frame_dir. Returns ({clip: [(base, team|None,
    smear|None), ...]}, {clip: {tracker: [[x, y] lu, ...]}}, seconds)."""
    os.makedirs(frame_dir, exist_ok=True)
    out, tracks, t0 = {}, {}, time.time()
    for clip in clips:
        poses = clip_poses(rig, clip)
        frames, tr = [], {name: [] for name in rig.trackers}
        for i in range(clip.frames):
            smear = smear_for(rig, clip, poses, i, smear_spec)
            rig.apply(poses[i])
            _update()
            for name, e in rig.trackers.items():
                tr[name].append(_screen_lu(e.matrix_world.translation, feet_px))
            base = os.path.join(frame_dir, f"{clip.name}_{i:02d}.png")
            frames.append(render_frame(rig, poses[i], base, team, smear))
        out[clip.name] = frames
        if rig.trackers:
            tracks[clip.name] = tr
        log(f"  {clip.name}: {clip.frames} frames")
    return out, tracks, time.time() - t0
