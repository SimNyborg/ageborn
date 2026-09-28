"""Heroic render passes.

Per unique frame:
  base   everything; team surfaces are holes (the tint-underlay scheme of the base pipeline)
  team   team surfaces only, in grey
  trail  motion trails: ribbons swept along a weapon's path; the unit is a holdout, so the
         trail is depth-correct (hidden behind the body, visible in front). The core renders
         red and the fringe green; pipeline.py puts the core into the base layer (white-hot)
         and the fringe into the team layer (so a blue unit swings a blue trail)
  fx     fx parts (muzzle flash, impact star, death pop) over the unit, depth-correct

Follow-through: every secondary joint gets a damped spring, solved in chain order so each link
of a chain (hair, cape, plume, pennant, tail) lags the link before it: overlapping action.
"""
import math
import os
import time

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

from ageborn_art import config as C
from ageborn_art.anim import follow_through, lerp_pose, soft_clamp
from ageborn_art.geometry import ribbon_mesh
from ageborn_art.render import render_to

from . import materials as M


def _update():
    bpy.context.view_layer.update()


def add_follow_through(rig, clip, poses):
    order = list(rig.secondaries)
    for name in order:
        sec = rig.secondaries[name]
        parent = rig.parent_of[name]
        kin = {}
        for idx in sorted(set(clip.sequence)):
            rig.apply(poses[idx])
            _update()
            p = rig.char_pos(rig.joints[name])
            t = rig.char_pos(sec["tip"])
            u = t - p
            L = max(1.0, math.hypot(u.x, u.z))
            kin[idx] = {"A": rig.side_angle(parent), "px": p.x, "pz": p.z,
                        "ux": u.x / L, "uz": u.z / L, "L": L}
        steps = [dict(kin[i]) for i in clip.sequence]
        for a, b in zip(steps, steps[1:]):
            while b["A"] - a["A"] > 180:
                b["A"] -= 360
            while b["A"] - a["A"] < -180:
                b["A"] += 360
        phi = follow_through(steps, clip.durations, clip.loop, sec["gain"],
                             hz=sec.get("hz"), damping=sec.get("damping"),
                             rot_gain=sec["rot_gain"])
        acc = {}
        for i, v in zip(clip.sequence, phi):
            acc.setdefault(i, []).append(v)
        for i, vals in acc.items():
            r = soft_clamp(sum(vals) / len(vals), sec["max"])
            ch = poses[i].setdefault(name, {})
            ch["r"] = ch.get("r", 0.0) + r
    return poses


def screen_lu(point, feet_px):
    scene = bpy.context.scene
    co = world_to_camera_view(scene, scene.camera, point)
    w, h = scene.render.resolution_x, scene.render.resolution_y
    x, y = co.x * w, (1.0 - co.y) * h
    return [round((x - feet_px[0]) / C.PX_PER_LU, 1), round((feet_px[1] - y) / C.PX_PER_LU, 1)]


def _ribbon(rig, spec, pose_a, pose_b, kind, samples=12):
    """A tapered ribbon along the path of `spec` (joint, inner, outer points in character
    space) from pose_a to pose_b. kind core: a narrow band at the outer edge, shorter."""
    joint = rig.joints[spec["joint"]]
    inner = Vector(spec["inner"]) - rig.rest[spec["joint"]]
    outer = Vector(spec["outer"]) - rig.rest[spec["joint"]]
    t0 = spec.get("start", 0.0)
    if kind == "core":
        t0 = t0 + (1 - t0) * 0.35
    pairs = []
    for k in range(samples + 1):
        t = t0 + (1 - t0) * k / samples
        rig.apply(lerp_pose(pose_a, pose_b, t))
        _update()
        m = joint.matrix_world
        a, b = m @ inner, m @ outer
        u = k / samples
        if kind == "core":
            w = 0.10 + 0.32 * u ** 0.7
        else:
            w = 0.25 + 0.75 * u ** 0.6
        a = b + (a - b) * w
        push = Vector((0.0, spec.get("behind", 2.0), 0.0))
        pairs.append((a + push, b + push))
    me = ribbon_mesh(pairs, f"{rig.name}.trail.{kind}")
    me.materials.append(M.trail(kind))
    obj = bpy.data.objects.new(f"{rig.name}.trail.{kind}", me)
    for flag in ("visible_diffuse", "visible_glossy", "visible_shadow",
                 "visible_transmission", "visible_volume_scatter"):
        setattr(obj, flag, False)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def _holdout_pass(rig, on):
    for part in rig.parts:
        part["obj"].is_holdout = on
        if on:
            part["obj"].visible_camera = not part["obj"].hide_render
        if part["hull"] is not None:
            part["hull"].visible_camera = not on
    for rec in rig.fx_parts:
        rec["obj"].visible_camera = False


def render_frame(rig, pose, base_path, trails=None):
    rig.apply(pose)
    _update()
    rig.set_pass(False)
    render_to(base_path)
    out = {"base": base_path, "team": None, "trail": None, "fx": None}
    if rig.has_visible_team():
        out["team"] = base_path.replace(".png", "_team.png")
        rig.set_pass(True)
        render_to(out["team"])
    rig.set_pass(False)
    if trails:
        _holdout_pass(rig, True)
        for o in trails:
            o.visible_camera = True
        out["trail"] = base_path.replace(".png", "_trail.png")
        render_to(out["trail"])
        for o in trails:
            bpy.data.objects.remove(o, do_unlink=True)
        _holdout_pass(rig, False)
        rig.set_pass(False)
    if rig.has_visible_fx():
        _holdout_pass(rig, True)
        for rec in rig.fx_parts:
            rec["obj"].visible_camera = not rec["obj"].hide_render
        out["fx"] = base_path.replace(".png", "_fx.png")
        render_to(out["fx"])
        _holdout_pass(rig, False)
        rig.set_pass(False)
        for rec in rig.fx_parts:
            rec["obj"].visible_camera = False
    return out


def render_clips(rig, clips, frame_dir, feet_px, trail_spec=None, log=print, only=None):
    """Renders every unique frame. A clip may carry `trails` = {frame: {"from": frame,
    "start": 0..1}} (motion trail of trail_spec on that frame). Returns ({clip: [frame dict]},
    {clip: {tracker: [[x, y]]}}, seconds)."""
    os.makedirs(frame_dir, exist_ok=True)
    out, tracks, t0 = {}, {}, time.time()
    for clip in clips:
        if only and clip.name not in only:
            continue
        poses = add_follow_through(rig, clip, [clip.pose(i) for i in range(clip.frames)])
        frames, tr = [], {n: [] for n in rig.trackers}
        tspec = getattr(clip, "trails", {}) or {}
        for i in range(clip.frames):
            trails = None
            if trail_spec and i in tspec:
                ts = tspec[i]
                specs = trail_spec if isinstance(trail_spec, list) else [trail_spec]
                trails = []
                for sp in specs:
                    s = dict(sp, start=ts.get("start", sp.get("start", 0.0)))
                    trails.append(_ribbon(rig, s, poses[ts["from"]], poses[i], "fringe"))
                    trails.append(_ribbon(rig, s, poses[ts["from"]], poses[i], "core"))
            rig.apply(poses[i])
            _update()
            for n, e in rig.trackers.items():
                tr[n].append(screen_lu(e.matrix_world.translation, feet_px))
            base = os.path.join(frame_dir, f"{clip.name}_{i:02d}.png")
            frames.append(render_frame(rig, poses[i], base, trails))
        out[clip.name] = frames
        tracks[clip.name] = tr
        log(f"  {clip.name}: {clip.frames} frames ({time.time() - t0:.0f} s)")
    return out, tracks, time.time() - t0
