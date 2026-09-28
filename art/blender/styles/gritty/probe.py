"""Print tracker positions (lu from the feet) per frame of a clip, without rendering."""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import gritty  # noqa
import bpy  # noqa
from ageborn_art import render  # noqa

unit, clip_name = sys.argv[1], sys.argv[2]
spec = importlib.util.spec_from_file_location("u", os.path.join(HERE, "units", unit + ".py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
rig = gritty.make_rig(mod)
clip = {c.name: c for c in mod.clips()}[clip_name]
poses = gritty.clip_poses(rig, clip)
for i, p in enumerate(poses):
    rig.apply(p)
    bpy.context.view_layer.update()
    print(i, {n: render._screen_lu(e.matrix_world.translation, mod.FEET) for n, e in rig.trackers.items()})
