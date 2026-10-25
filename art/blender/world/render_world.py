"""Render the world art (turrets and bases) to sprite sheets and install them in public/art.

Usage (from the repository root, with the bpy venv):
  <venv>/bin/python art/blender/world/render_world.py --out <scratch dir> [--only base.stone,turret.rock_tosser]
      [--scale 1.5] [--no-install] [--no-previews]
  # base skin models (world/base_skins_<age>.py, PLAN 2c), installed in public/art/bases/skins/<skin>.{png,json}
  <venv>/bin/python art/blender/world/render_world.py --out <scratch dir> --only base.medieval@rose_keep --no-previews --thumbs
  # only the base skin thumbnail atlas (world/base_thumbs.py: public/art/bases/skins/thumbs.{webp,json}; no Blender)
  python3 art/blender/world/render_world.py --out <scratch dir> --thumbs
  # base decorations as props (world/decorations.py, round 3), installed in public/art/cosmetics/decorations/<id>.{png,json}
  <venv>/bin/python art/blender/world/render_world.py --out <scratch dir> --only 'decoration.*' --no-previews
  # the decorations' HD thumbnail atlas for Customize (2.46 px/lu, from the HD sheets the renders left in --out; no Blender)
  python3 art/blender/world/render_world.py --out <scratch dir> --deco-thumbs

Every visual goes through ageborn_art.pipeline.run_unit with the unit v3 settings (the same
shading, light, outline width and colour, pixel filter and team layer as the units): frames render
at 2.46 px/lu and are downsampled 2:1 to the shipped 1.23 px/lu sheet, exactly like the unit
sheets, so world art and units have the same edge softness and outline weight at game scale.
Clips are not retimed (retime.py is for unit clips). Shipping files (256-colour PNG + Pixi JSON) are copied to
public/art/bases/<age>.{png,json} and public/art/turrets/<age>/<slug>.{png,json}; previews,
contact sheets and stats stay in --out.
"""
import argparse
import importlib
import json
import os
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(BLENDER))
sys.path.insert(0, BLENDER)
sys.dont_write_bytecode = True

AGES = ["stone", "medieval", "gunpowder", "modern", "future"]
# base skin models (PLAN 2c): world/base_skins_<age>.py exports SKINS for any of the eight ages
SKIN_AGES = ["stone", "bronze", "medieval", "gunpowder", "industrial", "modern", "future", "cosmic"]


def skin_targets():
    """(visual id, module) of every base skin model: `base.<age>@<skin>`."""
    out = []
    for age in SKIN_AGES:
        try:
            m = importlib.import_module(f"world.base_skins_{age}")
        except ModuleNotFoundError as e:
            if e.name != f"world.base_skins_{age}":
                raise
            continue
        out += [(mod.VISUAL_ID, mod) for mod in m.SKINS]
    return out


def deco_targets():
    """(visual id, module) of every base decoration prop: `decoration.<id>` (world/decorations.py)."""
    from world import decorations
    return [(mod.VISUAL_ID, mod) for mod in decorations.DECORATIONS]


def targets():
    out = []
    for age in AGES:
        try:
            m = importlib.import_module(f"world.base_{age}")
            out.append((f"base.{age}", m.MODULE))
        except ModuleNotFoundError as e:
            if e.name != f"world.base_{age}":
                raise
        try:
            t = importlib.import_module(f"world.turrets_{age}")
            for mod in t.TURRETS:
                out.append((mod.VISUAL_ID, mod))
        except ModuleNotFoundError as e:
            if e.name != f"world.turrets_{age}":
                raise
    return out + skin_targets() + deco_targets()


_CURRENT = [None]


def _loop_outline_hook():
    """A decoration prop may outline its `loop` clip differently from its body (`LOOP_OUTLINE`, a pipeline
    outline spec or None): a brazier's flame gets a thin warm edge instead of the body's dark line, which
    made the fire read as a brown-rimmed blob. Wraps the pipeline's outline step for that one clip."""
    from ageborn_art import pipeline
    orig = pipeline._outline_frames
    if getattr(orig, "_deco_hook", False):
        return

    def outline_frames(raw, final_dir, spec):
        mod = _CURRENT[0]
        # a prop loop cut by a holdout leaves slivers where a shard peeks past the body's edge: drop them
        # before the outline (a sliver too thin to hold a seed pixel would get a black line all round)
        for clip in getattr(mod, "OCCLUDED_CLIPS", ()) if mod is not None else ():
            if clip in raw:
                _drop_slivers(raw[clip])
        own = dict(getattr(mod, "CLIP_OUTLINES", None) or {}) if mod is not None else {}
        if mod is not None and hasattr(mod, "LOOP_OUTLINE"):
            own["loop"] = mod.LOOP_OUTLINE
        own = {k: v for k, v in own.items() if k in raw}
        if not own:
            return orig(raw, final_dir, spec)
        out = orig({k: v for k, v in raw.items() if k not in own}, final_dir, spec)
        for clip, s in own.items():
            out.update(orig({clip: raw[clip]}, final_dir, s))
        return out

    outline_frames._deco_hook = True
    pipeline._outline_frames = outline_frames


def _drop_slivers(frames):
    """Clears every island of a raw frame (base and team layer together) that holds no pixel at least the
    outline's seed inset inside the silhouette: the thin slivers a holdout leaves where a shard or a wisp
    peeks past the body's edge. Whole shapes keep every pixel, their soft edges included."""
    import numpy as np
    from ageborn_art import config as C
    from ageborn_art import sheet
    inset = max(2, round(C.OUTLINE_LU * C.PX_PER_LU) + 1)
    for bp, tp, _ in frames:
        b = sheet.load(bp)
        t = sheet.load(tp) if tp else None
        a = b[..., 3] if t is None else np.maximum(b[..., 3], t[..., 3])
        ys, xs = np.nonzero(a > 0.004)
        if len(xs) == 0:
            continue
        y0, y1, x0, x1 = max(0, ys.min() - 2), ys.max() + 3, max(0, xs.min() - 2), xs.max() + 3
        ac = a[y0:y1, x0:x1]
        solid = ac > 0.5
        keep = solid.copy()
        for dx, dy, _ in sheet._disk(inset)[0]:
            keep &= sheet._shift(solid, dx, dy)
        anyp = ac > 0.004
        for _ in range(600):
            grown = keep.copy()
            for dx, dy in sheet._N8:
                grown |= sheet._shift(keep, dx, dy)
            grown &= anyp
            if np.array_equal(grown, keep):
                break
            keep = grown
        drop = anyp & ~keep
        if not drop.any():
            continue
        for arr, path in ((b, bp), (t, tp)):
            if arr is None:
                continue
            sub = arr[y0:y1, x0:x1]
            sub[drop] = 0.0
            sheet.save(arr, path)


def _holdout_hook():
    """Base `prop` loops (common.prop_loop `occlude`): a joint posed with `holdout: True` renders as a Cycles
    holdout, an invisible cut-out that still hides what is behind it, in both the base and the team pass, so a
    ring of shards or a nebula wisp that passes behind the body is cut away there and the frame can be drawn
    over the body. Wraps the rig's posing (ageborn_art itself is unchanged); without such a pose nothing changes."""
    import bpy
    from ageborn_art import rig as R
    if getattr(R.Rig.apply, "_holdout_hook", False):
        return
    orig_apply, orig_pass = R.Rig.apply, R.Rig.set_pass

    def holdout_material():
        mat = bpy.data.materials.get("world_holdout")
        if mat is None:
            mat = bpy.data.materials.new("world_holdout")
            mat.use_nodes = True
            nt = mat.node_tree
            for n in list(nt.nodes):
                nt.nodes.remove(n)
            out = nt.nodes.new("ShaderNodeOutputMaterial")
            out.target = "CYCLES"
            nt.links.new(nt.nodes.new("ShaderNodeHoldout").outputs[0], out.inputs["Surface"])
        return mat

    RAYS = ("visible_diffuse", "visible_glossy", "visible_shadow", "visible_transmission", "visible_volume_scatter")

    def restore(self):
        for part, mat, rays in getattr(self, "_held", []):
            part["obj"].data.materials[0] = mat
            for flag, v in zip(RAYS, rays):
                setattr(part["obj"], flag, v)
        self._held = []

    def apply(self, pose):
        restore(self)
        orig_apply(self, pose)
        hold = {j for j, ch in pose.items() if ch.get("holdout")}
        if not hold:
            return
        mat = holdout_material()
        held = []
        for part in self.parts:
            j = part["joint"]
            if j in self._hidden or not any(k in hold for k in self._chain(j)):
                continue
            held.append((part, part["obj"].data.materials[0], tuple(getattr(part["obj"], f) for f in RAYS)))
            part["obj"].data.materials[0] = mat
            # the cut-out only hides: it casts no ambient occlusion on the prop (the prop shades as if alone,
            # as a flag does)
            for flag in RAYS:
                setattr(part["obj"], flag, False)
            if part["hull"] is not None:
                part["hull"].hide_render = True
        self._held = held

    def set_pass(self, team_pass):
        orig_pass(self, team_pass)
        for part, _, _ in getattr(self, "_held", []):
            part["obj"].hide_render = False
            part["obj"].visible_camera = True
            if part["hull"] is not None:
                part["hull"].hide_render = True

    def has_visible_team(self):
        held = {id(p) for p, _, _ in getattr(self, "_held", [])}
        return any(p["team"] and p["joint"] not in self._hidden and id(p) not in held for p in self.parts)

    apply._holdout_hook = True
    R.Rig.apply, R.Rig.set_pass, R.Rig.has_visible_team = apply, set_pass, has_visible_team


def install(mod, out_dir):
    kind = mod.EXTRA_META["kind"]
    if kind == "decoration":
        # a prop loads lazily, only when a side equips it (art/cosmetics/decorations/<id>.json)
        dest = os.path.join(REPO, "public", "art", "cosmetics", "decorations")
    elif kind == "base" and getattr(mod, "SKIN", None):
        # a base skin model loads lazily from its own folder (art/bases/skins/<skin>.json)
        dest = os.path.join(REPO, "public", "art", "bases", "skins")
    else:
        dest = os.path.join(REPO, "public", "art", "bases") if kind == "base" \
            else os.path.join(REPO, "public", "art", "turrets", mod.AGE)
    os.makedirs(dest, exist_ok=True)
    for ext in ("png", "json"):
        shutil.copyfile(os.path.join(out_dir, f"{mod.FILE_SLUG}.{ext}"), os.path.join(dest, f"{mod.FILE_SLUG}.{ext}"))
    # compact the JSON (the pipeline writes it indented)
    p = os.path.join(dest, f"{mod.FILE_SLUG}.json")
    with open(p) as fh:
        data = json.load(fh)
    with open(p, "w") as fh:
        json.dump(data, fh, separators=(",", ":"))
    return dest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--no-install", action="store_true")
    ap.add_argument("--no-previews", action="store_true")
    ap.add_argument("--thumbs", action="store_true", help="rebuild the base skin thumbnail atlas (after the renders, if any)")
    ap.add_argument("--deco-thumbs", action="store_true",
                    help="rebuild the decorations' HD thumbnail atlas from the HD sheets in --out (after the renders, if any)")
    args = ap.parse_args()
    if (args.thumbs or args.deco_thumbs) and not args.only:
        # the atlases composite sheets already rendered: no render, no Blender
        from world import base_thumbs
        if args.thumbs:
            base_thumbs.build(os.path.abspath(args.out))
        if args.deco_thumbs:
            base_thumbs.build_decorations(os.path.abspath(args.out))
        return
    from ageborn_art import config, pipeline, retime
    # unit v3 look (config.UNIT_*_V3): shared outline and filter; world clips keep their timing
    retime.retime = lambda mod, clips: clips
    only = [s for s in args.only.split(",") if s]
    out = os.path.abspath(args.out)
    frames = os.path.join(out, "_frames")
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    stats = []
    for vid, mod in targets():
        if only and vid not in only and not any(vid.startswith(o.rstrip("*")) for o in only if o.endswith("*")):
            continue
        print(f"[{vid}]", flush=True)
        sub = os.path.join(out, mod.AGE)
        os.makedirs(sub, exist_ok=True)
        if not hasattr(mod, "OUTER_OUTLINE"):
            mod.OUTER_OUTLINE = config.UNIT_OUTLINE_V3
        _CURRENT[0] = mod
        _loop_outline_hook()
        _holdout_hook()
        s = pipeline.run_unit(mod, sub, frames, previews=not args.no_previews, v3=True)
        _CURRENT[0] = None
        stats.append(s)
        if not args.no_install:
            print("  ->", install(mod, sub), flush=True)
    with open(os.path.join(out, "stats.json"), "w") as fh:
        json.dump({"items": stats, "seconds": round(time.time() - t0, 1)}, fh, indent=1)
    if args.thumbs and not args.no_install:
        from world import base_thumbs
        base_thumbs.build(out)
    if args.deco_thumbs and not args.no_install:
        from world import base_thumbs
        base_thumbs.build_decorations(out)
    print(f"done in {time.time() - t0:.1f} s -> {out}")


if __name__ == "__main__":
    main()
