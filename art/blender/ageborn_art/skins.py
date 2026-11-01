"""Skin variants (queue item 46, DESIGN A5.8; art round W0): a unit script renders its skins as variants of its
own model, with the same armature, actions and anchors, so every clip matches the unit frame for frame.

A unit script lists its skins and reads the skin while it builds:

    SKINS = {"pumpkin_head": {"kinds": {"#C9925E": "ceramic", ...}}}   # extra MATERIAL_KINDS per skin

    def build(rig):
        skin = getattr(rig, "skin", None)        # None for the unit itself, else the skin id
        ...  # same joints, trackers and clips; skin materials, patterns and replacement parts

`variant(mod, skin_id)` wraps the unit module so `pipeline.run_unit` renders the skin without knowing about
skins (COMMON C3): files `<slug>@<skin>[.x][.hd].{png,json}`, frame names `<slug>@<skin>_...`,
`meta.ageborn.visualId = "unit.<slug>@<skin>"`, `skinOf = "unit.<slug>"`, `skin = "<skin>"`, and an extras
sheet with `extrasOf: "<slug>@<skin>"`; `gen_portraits.py` then writes `<slug>@<skin>.png` / `_team.png`.
After the render, `look2d.parity` checks clarity parity against the unit's sheet (render_all does it and
refuses to install a skin that fails; `skin_parity.py` runs it by hand).
"""
import types


def skin_ids(mod):
    return list(getattr(mod, "SKINS", {}))


def variant(mod, skin_id):
    """A module-like copy of the unit module `mod` that renders its skin `skin_id`."""
    skins = getattr(mod, "SKINS", {})
    if skin_id not in skins:
        raise ValueError(f"{mod.SLUG} has no skin {skin_id!r} (SKINS: {sorted(skins)})")
    spec = skins[skin_id] or {}
    v = types.ModuleType(f"{mod.__name__}@{skin_id}")
    for k in dir(mod):
        if not k.startswith("__"):
            setattr(v, k, getattr(mod, k))
    slug = f"{mod.SLUG}@{skin_id}"
    v.SLUG = v.FILE_SLUG = slug
    v.VISUAL_ID = f"unit.{slug}"
    v.SKIN_OF = mod.SLUG
    v.SKIN_ID = skin_id
    v.EXTRA_META = dict(getattr(mod, "EXTRA_META", {}), skinOf=f"unit.{mod.SLUG}", skin=skin_id)
    kinds = dict(getattr(mod, "MATERIAL_KINDS", {}))
    kinds.update(spec.get("kinds", {}))
    v.MATERIAL_KINDS = kinds

    def build(rig):
        rig.skin = skin_id
        mod.build(rig)
    v.build = build
    v.clips = mod.clips
    return v


def load(slug):
    """`bonker` -> the unit module; `bonker@pumpkin_head` -> its skin variant."""
    import importlib
    base, _, skin = slug.partition("@")
    mod = importlib.import_module(f"units.{base}")
    return variant(mod, skin) if skin else mod
