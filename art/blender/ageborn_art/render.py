"""Render every frame of every clip in two passes (base and team layer)."""
import os
import time

import bpy


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


def render_clips(rig, clips, frame_dir, log=print):
    """Writes <clip>_<nn>.png (base) and <clip>_<nn>_team.png (team layer) into frame_dir.
    Returns {clip: [(base_path, team_path_or_None), ...]} and the seconds spent."""
    os.makedirs(frame_dir, exist_ok=True)
    out, t0 = {}, time.time()
    for clip in clips:
        frames = []
        for i in range(clip.frames):
            rig.apply(clip.pose(i))
            base = os.path.join(frame_dir, f"{clip.name}_{i:02d}.png")
            rig.set_pass(False)
            render_to(base)
            team = None
            if rig.has_visible_team():
                team = os.path.join(frame_dir, f"{clip.name}_{i:02d}_team.png")
                rig.set_pass(True)
                render_to(team)
            frames.append((base, team))
        out[clip.name] = frames
        log(f"  {clip.name}: {clip.frames} frames")
    return out, time.time() - t0
