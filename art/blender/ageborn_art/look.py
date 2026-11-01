"""The detail standard's pipeline lifts (art round W0; item 47 audit sections 5 and 6), opt-in per unit.

A unit script opts in (COMMON C4) with

    DETAIL_STANDARD = True
    MATERIAL_KINDS = {"#C2A27E": "wood", "#75685B": "fur", ..., "team": "hide"}

Without DETAIL_STANDARD every hook is a no-op, so a re-render reproduces the shipped sheet byte for byte.
With it, for every cel-shaded part (decals and glows are left alone):

  L1  material kinds: an object-space breakup per kind (stable across frames: the pattern lives on the part's
      rest-pose coordinates, so it never crawls), posterized to three value tones (amplitude 3-8% of value),
      value only; non-team colours in the A11 team hue bands keep HSV saturation <= 0.38 unless their kind
      is an accent (polished bronze, gold), which keeps its own; dirt darkens the lower third in two steps
  L2  cavity darkening (a 1.2 lu ambient occlusion, posterized, strength 0.4), a convex edge highlight on the
      lit side (bevel normal, 0.7 lu) and, on metal kinds, a hot spec
  L3  a top rim in 2D on the silhouette's upper edges (look2d.top_rim; wide enough to survive the outline)
      and a team rim (white overlay on team surfaces)
  L4  supersampling (render at 2x, premultiplied 2:1 downsample, luminance-only unsharp mask) behind the
      environment flag AGEBORN_SUPERSAMPLE=1 (off by default; owner decision)
  L5  outline v4: fill x 0.46, HSV value cap 0.42, 2.8 lu wide, inner cover 0.35 lu
  +   an opt-in MaxRects packer (keeps HD sheet pixels within +2% of the shipped sheet)

Checks written into `<slug>.stats.json` (`look`) and enforced (`LookCheckError`, so render_all does not
install): the A11 colour rule on the RGBA frames and on the shipped PNG8 sheets (<= 10%), team fill
(>= 18% before the outline), planted-foot drift (<= 1 lu), and, against the sheet in the reference tree
(AGEBORN_LOOK_REF, default the working tree's git HEAD): silhouette area per frame and HD sheet pixels.
"""
import math
import os
import zlib

import numpy as np

from . import config as C
from . import look2d
from .colors import hex_to_rgb, mix, rgb_to_hex, shadow, to_linear

# value amplitude per kind (a fraction of sRGB value), its pattern, how much dirt it takes on its lower third,
# and whether it is a saturated accent that keeps its own saturation (polished bronze, gold)
KINDS = {
    "cloth":   {"amp": 0.06, "pattern": "folds", "dirt": 0.08},
    "leather": {"amp": 0.06, "pattern": "mottle", "dirt": 0.08},
    "hide":    {"amp": 0.07, "pattern": "blotch", "dirt": 0.08},
    "fur":     {"amp": 0.08, "pattern": "clumps", "dirt": 0.08},
    "wood":    {"amp": 0.07, "pattern": "grain", "dirt": 0.06},
    "stone":   {"amp": 0.07, "pattern": "stone", "dirt": 0.05},
    "bone":    {"amp": 0.045, "pattern": "pores", "dirt": 0.05},
    "bronze":  {"amp": 0.05, "pattern": "brushed", "metal": True, "accent": True},
    "iron":    {"amp": 0.05, "pattern": "brushed", "metal": True},
    "gold":    {"amp": 0.05, "pattern": "brushed", "metal": True, "accent": True},
    "ceramic": {"amp": 0.04, "pattern": "speckle", "dirt": 0.04},
    "polymer": {"amp": 0.03, "pattern": "speckle"},
    "glass":   {"amp": 0.0},
    "energy":  {"amp": 0.0},
    "skin":    {"amp": 0.0, "dirt": 0.05},
}
SAT_MAX = 0.38              # non-team, non-accent materials (the A11 colour rule's 0.40 with a margin)
CAVITY = {"distance": 1.2, "strength": 0.4, "lo": 0.26, "hi": 0.46, "samples": 8}
EDGE = {"radius": 0.7, "lo": 0.022, "hi": 0.05, "mix": 0.42, "strength": 0.75, "metal": 0.95, "samples": 8,
        "concave_lo": 0.012, "concave_hi": 0.05}
HOT = {"lo": 0.972, "hi": 0.984, "mix": 0.9}
DIRT_BANDS = (0.20, 0.34)   # of the unit's height: full dirt below the first, half up to the second
# outline v4 (audit rule 7): (width px at render scale 1, fill factor, HSV value cap, inner cover px at scale 1)
# 2.30 x 3 = 6.9 px = 2.8 lu on the HD sheet; 0.287 x 3 = 0.86 px = 0.35 lu
UNIT_OUTLINE_V4 = (2.30, 0.46, 0.42, 0.287)

STATE = None


class LookCheckError(RuntimeError):
    """An opted-in render failed a hard check (colour rule, team fill, drift)."""


# -- opt-in -------------------------------------------------------------------------------------------
def begin(mod):
    """Called first in pipeline.run_unit for every unit: activates the lifts for an opted-in unit and
    clears them otherwise (render_all renders several units in one process)."""
    global STATE
    from . import sheet
    if not getattr(mod, "DETAIL_STANDARD", False):
        STATE = None
        sheet.PACKER = None
        return None
    kinds = {k.upper() if k.startswith("#") else k: v for k, v in getattr(mod, "MATERIAL_KINDS", {}).items()}
    for k, v in kinds.items():
        if v not in KINDS:
            raise ValueError(f"{mod.SLUG}: unknown material kind {v!r} for {k}")
    palette = {k.upper(): v.upper() for k, v in getattr(mod, "SKIN_PALETTE", {}).items()}
    STATE = {"slug": mod.SLUG, "kinds": kinds, "height": float(mod.HEIGHT_LU),
             "supersample": os.environ.get("AGEBORN_SUPERSAMPLE") == "1",
             "rim": getattr(mod, "LOOK_RIM", None), "palette": palette,
             # the finish highlight's strength (its mix toward the highlight colour), per unit; the audit's
             # highlight share (5.2) is 0.06-0.10 for infantry and ranged
             "hl": float(getattr(mod, "LOOK_HIGHLIGHT", 1.0))}
    sheet.PACKER = lambda images: look2d.maxrects(images, shelf=sheet.pack)   # never larger than the shelf packer
    return STATE


def remap(hex_):
    """A skin's palette (skins.py `palette`: {unit hex: skin hex}) applied to every colour the unit's parts
    ask for, so a skin recolours the model without touching its geometry."""
    if STATE is None or not hex_ or not STATE["palette"]:
        return hex_
    return STATE["palette"].get(hex_.upper(), hex_)


def end():
    global STATE
    from . import sheet
    STATE = None
    sheet.PACKER = None


def active():
    return STATE is not None


# -- colours ------------------------------------------------------------------------------------------
def _in_team_band(hue_deg):
    """The A11 colour rule's team hue bands (orange-red-yellow 350-81, blue 182-254 degrees)."""
    return hue_deg >= 350 or hue_deg <= 81 or 182 <= hue_deg <= 254


def _clamp_sat(hex_, limit=SAT_MAX):
    """Saturation <= limit for colours in the team hue bands (other hues are outside the rule: kept)."""
    import colorsys
    h, s, v = colorsys.rgb_to_hsv(*hex_to_rgb(hex_))
    if s <= limit or not _in_team_band(h * 360):
        return hex_
    return rgb_to_hex(colorsys.hsv_to_rgb(h, limit, v))


def _lin_gain(a):
    """An sRGB value change of +-a as a symmetric gain on linear light (the shader works in linear)."""
    return ((1 + a) ** 2.2 - (1 - a) ** 2.2) / 2


# -- node helpers (materials.py's private helpers, reused) ---------------------------------------------
def _M():
    from . import materials
    return materials


def _attr(nodes, name):
    a = nodes.new("ShaderNodeAttribute")
    a.attribute_type = "GEOMETRY"
    a.attribute_name = name
    return a.outputs["Vector"]


def _vmul(nodes, links, vec, s):
    vm = nodes.new("ShaderNodeVectorMath")
    vm.operation = "MULTIPLY"
    links.new(vec, vm.inputs[0])
    vm.inputs[1].default_value = s
    return vm.outputs["Vector"]


def _sep_z(nodes, links, vec):
    sx = nodes.new("ShaderNodeSeparateXYZ")
    links.new(vec, sx.inputs[0])
    return sx.outputs["Z"]


def _noise(nodes, links, vec, scale=1.0, detail=2.0, rough=0.5, distortion=0.0):
    n = nodes.new("ShaderNodeTexNoise")
    n.noise_dimensions = "3D"
    links.new(vec, n.inputs["Vector"])
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    n.inputs["Distortion"].default_value = distortion
    return n.outputs["Fac"]


def _tones(nodes, links, v, lo, hi, w=0.012):
    """Posterize a 0-1 pattern into three tones: -1 below lo, +1 above hi, 0 between."""
    M = _M()
    up = M._smoothstep(nodes, links, v, hi - w, hi + w)
    dn = M._smoothstep(nodes, links, v, lo - w, lo + w)
    return M._math(nodes, links, "SUBTRACT", M._math(nodes, links, "ADD", up, dn), 1.0)


def _pattern(nodes, links, name):
    """The kind's breakup as a socket with values -1, 0 or +1 (posterized), in object space."""
    M = _M()
    rest = _attr(nodes, "look_rest")      # rest-pose character coordinates (lu), moves with the part
    grain = _attr(nodes, "look_grain")    # the part's own principal axes (u along its length), offset per part
    if name == "blotch":                  # hide: patches of 3-5 lu
        return _tones(nodes, links, _noise(nodes, links, grain, 0.26, 1.5, 0.45), 0.40, 0.60)
    if name == "clumps":                  # fur and hair: clumps of 2-3 lu, long along the part
        return _tones(nodes, links, _noise(nodes, links, _vmul(nodes, links, grain, (0.24, 0.62, 0.62)), 1.0, 1.0,
                                           0.4), 0.415, 0.585)
    if name == "folds":                   # cloth: soft hanging folds (long in rest z)
        return _tones(nodes, links, _noise(nodes, links, _vmul(nodes, links, rest, (0.40, 0.40, 0.11)), 1.0, 1.5,
                                           0.4), 0.40, 0.61)
    if name == "mottle":                  # leather
        return _tones(nodes, links, _noise(nodes, links, grain, 0.48, 2.5, 0.5), 0.405, 0.595)
    if name == "grain":                   # wood: streaks along the length
        return _tones(nodes, links, _noise(nodes, links, _vmul(nodes, links, grain, (0.09, 0.80, 0.80)), 1.0, 3.0,
                                           0.55, 0.35), 0.40, 0.61)
    if name == "pores":                   # bone: sparse pits and pale flecks
        return _tones(nodes, links, _noise(nodes, links, grain, 0.85, 2.0, 0.5), 0.35, 0.65)
    if name == "brushed":                 # metal: brushed streaks
        return _tones(nodes, links, _noise(nodes, links, _vmul(nodes, links, grain, (0.10, 1.3, 1.3)), 1.0, 2.0,
                                           0.5), 0.40, 0.60)
    if name == "speckle":
        return _tones(nodes, links, _noise(nodes, links, grain, 1.3, 1.0, 0.5), 0.34, 0.66)
    if name == "stone":                   # chips per cell, cracks along the cell borders
        vo = nodes.new("ShaderNodeTexVoronoi")
        vo.voronoi_dimensions = "3D"
        vo.feature = "F1"
        links.new(grain, vo.inputs["Vector"])
        vo.inputs["Scale"].default_value = 0.30
        cell = nodes.new("ShaderNodeSeparateColor")
        links.new(vo.outputs["Color"], cell.inputs[0])
        chips = _tones(nodes, links, cell.outputs[0], 0.22, 0.78, 0.01)
        ve = nodes.new("ShaderNodeTexVoronoi")
        ve.voronoi_dimensions = "3D"
        ve.feature = "DISTANCE_TO_EDGE"
        links.new(grain, ve.inputs["Vector"])
        ve.inputs["Scale"].default_value = 0.30
        crack = M._math(nodes, links, "SUBTRACT", 1.0, M._smoothstep(nodes, links, ve.outputs["Distance"], 0.035, 0.06))
        keep = M._math(nodes, links, "MULTIPLY", chips, M._math(nodes, links, "SUBTRACT", 1.0, crack))
        return M._math(nodes, links, "SUBTRACT", keep, crack)
    raise ValueError(name)


def _lifted(nodes, links, fill_hex, finish, kind, team=False):
    """Returns (colour socket, masks) of the lifted toon colour; `team` builds the team pass (white base)."""
    M = _M()
    F = C.FINISHES[finish]
    spec = KINDS.get(kind, {})
    m = M._shading(nodes, links, finish)
    if not team and not spec.get("accent"):
        fill_hex = _clamp_sat(fill_hex)
    dark = shadow(fill_hex, F["shadow"], C.WARM_SHADOW_HUE_SHIFT)
    if "shadow_sat" in F:
        import colorsys
        hh, ss, vv = colorsys.rgb_to_hsv(*hex_to_rgb(dark))
        dark = rgb_to_hex(colorsys.hsv_to_rgb(hh, ss * F["shadow_sat"], vv))
    col = M._mix_rgb(nodes, links, m["lit"], to_linear(dark), to_linear(fill_hex))
    geo = nodes.new("ShaderNodeNewGeometry")
    N = geo.outputs["Normal"]
    ndl = M._dot(nodes, links, N, C.LIGHT_DIR)
    gain = m["grad"]
    # L1: breakup (value only), then dirt on the lower third
    amp = spec.get("amp", 0.0)
    if amp > 0 and spec.get("pattern"):
        brk = _pattern(nodes, links, spec["pattern"])
        gain = M._math(nodes, links, "MULTIPLY", gain,
                       M._math(nodes, links, "ADD", 1.0, M._math(nodes, links, "MULTIPLY", brk, _lin_gain(amp))))
    dirt = spec.get("dirt", 0.0)
    if dirt > 0 and STATE is not None:
        z = _sep_z(nodes, links, _attr(nodes, "look_rest"))
        H = STATE["height"]
        b1 = M._math(nodes, links, "SUBTRACT", 1.0, M._smoothstep(nodes, links, z, H * DIRT_BANDS[0] - 0.4,
                                                                    H * DIRT_BANDS[0] + 0.4))
        b2 = M._math(nodes, links, "SUBTRACT", 1.0, M._smoothstep(nodes, links, z, H * DIRT_BANDS[1] - 0.4,
                                                                    H * DIRT_BANDS[1] + 0.4))
        d = M._math(nodes, links, "MULTIPLY", M._math(nodes, links, "ADD", b1, b2), 0.5)   # 1, 0.5, 0
        k = 1 - (1 - dirt) ** 2.2
        gain = M._math(nodes, links, "MULTIPLY", gain,
                       M._math(nodes, links, "SUBTRACT", 1.0, M._math(nodes, links, "MULTIPLY", d, k)))
    # L2: cavity (a short occlusion, posterized into a crisp crease)
    ao = nodes.new("ShaderNodeAmbientOcclusion")
    ao.samples = CAVITY["samples"]
    ao.inputs["Distance"].default_value = CAVITY["distance"]
    occ = M._math(nodes, links, "SUBTRACT", 1.0, ao.outputs["AO"])
    cav = M._smoothstep(nodes, links, occ, CAVITY["lo"], CAVITY["hi"])
    gain = M._math(nodes, links, "MULTIPLY", gain,
                   M._math(nodes, links, "SUBTRACT", 1.0, M._math(nodes, links, "MULTIPLY", cav, CAVITY["strength"])))
    g = nodes.new("ShaderNodeMixRGB")
    g.blend_type = "MULTIPLY"
    g.inputs[0].default_value = 1.0
    links.new(col, g.inputs[1])
    links.new(gain, g.inputs[2])
    col = g.outputs[0]
    # L2: convex edge highlight on the lit side (the bevel normal leaves the surface normal near edges)
    bev = nodes.new("ShaderNodeBevel")
    bev.samples = EDGE["samples"]
    bev.inputs["Radius"].default_value = EDGE["radius"]
    e = M._math(nodes, links, "SUBTRACT", 1.0, _dot2(nodes, links, bev.outputs["Normal"], N))
    edge = M._smoothstep(nodes, links, e, EDGE["lo"], EDGE["hi"])
    lit_side = M._smoothstep(nodes, links, ndl, 0.02, 0.22)
    # convex only: any occlusion within the cavity distance marks a crease (where two blobs of one mesh meet,
    # a shallow concave crease that the bevel also sees), so the highlight never draws a line across a face
    concave = M._smoothstep(nodes, links, occ, EDGE["concave_lo"], EDGE["concave_hi"])
    edge = M._math(nodes, links, "MULTIPLY", M._math(nodes, links, "MULTIPLY", edge, lit_side),
                   M._math(nodes, links, "SUBTRACT", 1.0, concave))
    masks = dict(m, edge=edge, cav=cav)
    if team:
        return col, masks
    strength = EDGE["metal"] if spec.get("metal") else EDGE["strength"]
    col = M._mix_rgb(nodes, links, M._math(nodes, links, "MULTIPLY", edge, strength), col,
                     to_linear(mix(fill_hex, "#FFFFFF", EDGE["mix"])))
    # the finish's highlight, the metal hot spec, the grazing rim (as materials._toon_color)
    hl = mix(fill_hex, F.get("hl_color", "#FFFFFF"), min(0.9, F["hl_mix"] * (STATE["hl"] if STATE else 1.0)))
    col = M._mix_rgb(nodes, links, m["hl"], col, to_linear(hl))
    if spec.get("metal"):
        hot = M._smoothstep(nodes, links, M._dot(nodes, links, N, C.HIGHLIGHT_DIR), HOT["lo"], HOT["hi"])
        hot_col = "#FFF7E6" if spec.get("accent") else "#FFFFFF"
        col = M._mix_rgb(nodes, links, M._math(nodes, links, "MULTIPLY", hot, HOT["mix"]), col, to_linear(hot_col))
    rim = M._math(nodes, links, "MULTIPLY", m["rim"], C.RIM_STRENGTH)
    col = M._mix_rgb(nodes, links, rim, col, to_linear(mix(fill_hex, "#FFFFFF", C.RIM_MIX)))
    return col, masks


def _dot2(nodes, links, a, b):
    vm = nodes.new("ShaderNodeVectorMath")
    vm.operation = "DOT_PRODUCT"
    links.new(a, vm.inputs[0])
    links.new(b, vm.inputs[1])
    return vm.outputs["Value"]


def toon(fill_hex, finish="matte"):
    """The lifted counterpart of materials.toon (highlight=True parts of an opted-in unit)."""
    M = _M()
    kind = STATE["kinds"].get(fill_hex.upper())
    if kind is None:            # a skin colour takes the kind of the unit colour it replaces
        kind = next((STATE["kinds"].get(k) for k, v in STATE["palette"].items() if v == fill_hex.upper()), None)
    key = ("look", fill_hex, finish, kind)
    if key not in M._cache:
        import bpy
        mat = bpy.data.materials.new(f"look_{fill_hex}_{finish}_{kind}")
        nt, nodes, links = M._nodes(mat)
        col, _ = _lifted(nodes, links, fill_hex, finish, kind)
        M._output(nodes, links, M._fade(nodes, links, M._emission(nodes, links, col)))
        M._cache[key] = mat
    return M._cache[key]


def team(tone=1.0):
    """The lifted team material: the team pass gets the team kind's breakup, dirt and cavity on its grey; the
    base pass keeps the faint white highlight and rim over the tinted layer and adds the edge highlight.
    `tone` < 1 is the team-dark variant (rule 5's two-tone team zone): its grey is `tone` x the lit grey, so the
    tint gives a darker team colour and the area still counts as team."""
    M = _M()
    kind = STATE["kinds"].get("team")
    key = ("look_team", kind, tone)
    if key not in M._cache:
        import bpy
        mat = bpy.data.materials.new(f"look_team_{kind}_{tone:g}")
        nt, nodes, links = M._nodes(mat)
        switch = M._team_switch(nodes)
        grey = rgb_to_hex((tone, tone, tone))
        col, masks = _lifted(nodes, links, grey, "matte", kind, team=True)
        team_shader = M._emission(nodes, links, col)
        a = M._math(nodes, links, "MULTIPLY", masks["hl"], min(0.6, C.TEAM_HIGHLIGHT_ALPHA * STATE["hl"]))
        b = M._math(nodes, links, "MULTIPLY", masks["rim"], C.TEAM_RIM_ALPHA)
        e = M._math(nodes, links, "MULTIPLY", masks["edge"], C.TEAM_HIGHLIGHT_ALPHA)
        overlay = M._math(nodes, links, "MAXIMUM", M._math(nodes, links, "MAXIMUM", a, b), e)
        holdout = nodes.new("ShaderNodeHoldout").outputs[0]
        white = M._emission(nodes, links, (1, 1, 1, 1))
        base_shader = M._mix_shader(nodes, links, overlay, holdout, white)
        M._output(nodes, links, M._mix_shader(nodes, links, switch, base_shader, team_shader))
        M._cache[key] = mat
        M.TEAM_MATERIALS.append(mat)
    return M._cache[key]


TEAM_DARK = 0.62    # the team-dark tone: blue 2F7DF6 becomes 1D4E98, orange F28A1E becomes 965613


def team_part(rig, joint, geo, tone=TEAM_DARK, **kw):
    """A team part in the team-dark tone (spots, stripes, trims inside a team zone). For a unit that has not
    opted into the standard it is a plain team part."""
    obj = rig.part(joint, geo, team=True, **kw)
    if STATE is not None and tone != 1.0:
        obj.data.materials[0] = team(tone)
    return obj


# -- geometry -----------------------------------------------------------------------------------------
def after_build(rig):
    """Per part: the rest-pose coordinates (`look_rest`) and the part's principal-axis coordinates with a
    per-part offset (`look_grain`), as point attributes the breakup reads. Deterministic (no randomness)."""
    if STATE is None:
        return
    for part in rig.parts:
        obj = part["obj"]
        me = obj.data
        n = len(me.vertices)
        if n == 0:
            continue
        co = np.empty(n * 3, np.float64)
        me.vertices.foreach_get("co", co)
        co = co.reshape(n, 3)
        rest = co + np.array(rig.rest[part["joint"]], np.float64)
        c = co.mean(0)
        X = co - c
        if n >= 3:
            w, v = np.linalg.eigh(X.T @ X)
            R = v[:, ::-1]
            # a stable sign per axis (eigenvectors are only defined up to sign)
            for k in range(3):
                if R[np.argmax(np.abs(R[:, k])), k] < 0:
                    R[:, k] = -R[:, k]
        else:
            R = np.eye(3)
        h = zlib.crc32(obj.name.encode())
        off = np.array([(h & 0x3FF) / 10.0, ((h >> 10) & 0x3FF) / 10.0, ((h >> 20) & 0x3FF) / 10.0])
        grain = X @ R + off
        for name, data in (("look_rest", rest), ("look_grain", grain)):
            if name in me.attributes:
                me.attributes.remove(me.attributes[name])
            at = me.attributes.new(name=name, type="FLOAT_VECTOR", domain="POINT")
            at.data.foreach_set("vector", data.astype(np.float32).ravel())


# -- 2D: outline, rim, supersampling --------------------------------------------------------------------
def outline_spec(spec):
    """The outer outline of an opted-in unit: v4 (4-tuple with the inner cover)."""
    if STATE is None or spec is None:
        return spec
    return UNIT_OUTLINE_V4


def pre_outline(base, team):
    """L3: the top rim, on the raw frame before the outline is added."""
    if STATE is None:
        return base, team
    return look2d.top_rim(base, team, C.PX_PER_LU, STATE.get("rim"))


def supersample_begin(canvas, feet):
    """L4 (AGEBORN_SUPERSAMPLE=1): render at twice the sheet's density."""
    if STATE is None or not STATE["supersample"]:
        return canvas, feet
    STATE["ss_scale"] = C.RENDER_SCALE
    C.set_render_scale(C.RENDER_SCALE * 2)
    return (canvas[0] * 2, canvas[1] * 2), (feet[0] * 2, feet[1] * 2)


def supersample_end(frames, raw_dir, feet):
    """L4: the outlined 2x frames downsampled 2:1 (premultiplied) and sharpened on luminance only; restores
    the sheet's render scale. Returns (frames, feet)."""
    if STATE is None or "ss_scale" not in STATE:
        return frames, feet
    from . import pipeline, sheet
    out_dir = os.path.join(raw_dir, "final_ss")
    os.makedirs(out_dir, exist_ok=True)
    out = {}
    for clip, fr in frames.items():
        done = []
        for bp, tp in fr:
            pair = []
            for p in (bp, tp):
                if p is None:
                    pair.append(None)
                    continue
                arr = pipeline._half(sheet.load(p))
                if p is bp:
                    arr = look2d.sharpen_luma(arr)
                q = os.path.join(out_dir, os.path.basename(p))
                sheet.save(arr, q)
                pair.append(q)
            done.append(tuple(pair))
        out[clip] = done
    C.set_render_scale(STATE.pop("ss_scale"))
    return out, (feet[0] // 2, feet[1] // 2)


# -- checks -------------------------------------------------------------------------------------------
def _ref_sheet(name):
    """The reference copy of an installed sheet: AGEBORN_LOOK_REF names a directory tree or a git ref
    (default HEAD of the art/blender checkout). Returns a local json path or None."""
    import glob
    import subprocess
    import tempfile
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.abspath(os.path.join(here, "..", "..", ".."))
    ref = os.environ.get("AGEBORN_LOOK_REF", "HEAD")
    if os.path.isdir(ref):
        hits = glob.glob(os.path.join(ref, "public", "art", "units", "*", name))
        return hits[0] if hits else None
    hits = glob.glob(os.path.join(root, "public", "art", "units", "*", name))
    if not hits:
        return None
    rel = os.path.relpath(hits[0], root)
    tmp = tempfile.mkdtemp(prefix="lookref_")
    try:
        for f in (rel, rel[:-5] + ".png"):
            data = subprocess.run(["git", "-C", root, "show", f"{ref}:{f}"], capture_output=True, check=True).stdout
            with open(os.path.join(tmp, os.path.basename(f)), "wb") as fh:
                fh.write(data)
    except subprocess.CalledProcessError:
        return None
    return os.path.join(tmp, os.path.basename(rel))


def checks(mod, out_dir, file_slug, stats, clip_meta, log=print, ref_slug=None):
    """The opted-in unit's checks (see the module doc). Adds stats["look"]; raises LookCheckError on a hard
    failure after the stats are written."""
    if STATE is None:
        return None
    res = {"outline": "v4", "supersample": STATE["supersample"]}
    hard = []
    rgba = stats.get("colourRule", {}).get("worstPct", 0.0)
    res["colourRuleRgbaPct"] = rgba
    enc = {}
    for suffix in (".hd", "", ".x.hd", ".x"):
        p = os.path.join(out_dir, f"{file_slug}{suffix}.json")
        if os.path.exists(p):
            pct, fr = look2d.sheet_rule(p)
            enc[suffix or ".1x"] = [round(pct, 2), fr]
    res["colourRuleEncodedPct"] = enc
    worst_enc = max([v[0] for v in enc.values()] or [0.0])
    if rgba > 10.0 or worst_enc > 10.0:
        hard.append(f"colour rule {max(rgba, worst_enc):.1f}% > 10%")
    tc = stats.get("teamCoverage")
    if tc:
        res["teamFillMinPct"] = tc["minFillPct"]
        if tc["failingFrames"]:
            hard.append(f"team fill under 18% on {tc['failingFrames'][:6]}")
    walk = clip_meta.get("walk", {})
    if "plantedDriftLu" in walk:
        res["plantedDriftLu"] = walk["plantedDriftLu"]
        if walk["plantedDriftLu"] > 1.0:
            hard.append(f"planted drift {walk['plantedDriftLu']} lu > 1")
    # against the reference sheet: silhouette area per frame and HD sheet pixels
    ref_name = ref_slug or file_slug
    new_px = ref_px = 0
    ratios = []
    for suffix in (".hd", ".x.hd"):
        mine = os.path.join(out_dir, f"{file_slug}{suffix}.json")
        ref = _ref_sheet(f"{ref_name}{suffix}.json")
        if not os.path.exists(mine) or ref is None:
            continue
        a, ad = look2d.frames_of(mine)
        b, bd = look2d.frames_of(ref)
        new_px += ad["meta"]["size"]["w"] * ad["meta"]["size"]["h"]
        ref_px += bd["meta"]["size"]["w"] * bd["meta"]["size"]["h"]
        pre_a = f"{file_slug}_"
        pre_b = f"{ref_name}_"
        for name in a:
            if name.endswith("_team") or not name.startswith(pre_a):
                continue
            other = pre_b + name[len(pre_a):]
            if other not in b:
                continue
            sa, sb = look2d.silhouette(a, name).sum(), look2d.silhouette(b, other).sum()
            if sb > 0:
                ratios.append((sa / sb, name[len(pre_a):]))
    if ratios:
        lo, hi = min(ratios), max(ratios)
        res["silhouetteAreaVsRef"] = {"min": round(lo[0], 3), "minFrame": lo[1], "max": round(hi[0], 3),
                                      "maxFrame": hi[1], "mean": round(float(np.mean([r for r, _ in ratios])), 3)}
    if ref_px:
        res["hdSheetPxVsRef"] = round(new_px / ref_px, 4)
        if new_px > ref_px * 1.02:           # audit 5.1 rule 11: decoded memory must not grow
            hard.append(f"HD sheet pixels {new_px / ref_px:.3f} x the reference (limit 1.02)")
    hd = os.path.join(out_dir, f"{file_slug}.hd.json")
    if os.path.exists(hd):
        try:
            res["gameMetricsIdle0"] = look2d.sheet_metrics(hd)
        except KeyError:
            pass
    res["failures"] = hard
    stats["look"] = res
    return res


def raise_on_failure(stats):
    res = stats.get("look")
    if res and res.get("failures"):
        raise LookCheckError(f"{stats.get('slug')}: " + "; ".join(res["failures"]))
