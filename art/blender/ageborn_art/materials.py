"""Toon materials for Cycles, computed from normals with emission only.

Cycles has no Shader-to-RGB, so the cel look is built directly in the node tree:
  lit/shadow = smoothstep(dot(N, LIGHT_DIR)) picks fill or fill*0.82 (DESIGN A11 two-tone),
  gradient   = a soft darkening inside each band away from the light, times short-range AO,
  highlight  = a tight smoothstep on dot(N, HIGHLIGHT_DIR) (one highlight shape per part),
  rim        = a thin lighter edge at grazing view angles on the lit side.
Finishes (config.FINISHES) tune these per surface: matte (A11 exactly), gloss and metal.
There are no lamps, so a frame needs only enough samples to antialias edges.

Team parts are rendered in two passes controlled by one value node per material:
  base pass (team_pass = 0): team surfaces are a Holdout (a hole in the base sprite) plus a
      faint white highlight, so the tinted team layer shows through from underneath;
  team pass (team_pass = 1): team surfaces are white-based toon shading (1.0 lit, 0.82 shadow,
      0.55 outline). Multiplying by any team colour then gives exactly fill, shadow and
      outline per DESIGN A11, for every colourblind preset, from a single sheet.
"""
import bpy

from . import config as C
from .colors import mix, scale, to_linear

_cache = {}
TEAM_MATERIALS = []


def _nodes(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return nt, nt.nodes, nt.links


def _smoothstep(nodes, links, value_socket, lo, hi):
    mr = nodes.new("ShaderNodeMapRange")
    mr.interpolation_type = "SMOOTHSTEP"
    mr.clamp = True
    mr.inputs["From Min"].default_value = lo
    mr.inputs["From Max"].default_value = hi
    links.new(value_socket, mr.inputs["Value"])
    return mr.outputs["Result"]


def _dot(nodes, links, normal_socket, direction):
    vm = nodes.new("ShaderNodeVectorMath")
    vm.operation = "DOT_PRODUCT"
    links.new(normal_socket, vm.inputs[0])
    vm.inputs[1].default_value = direction
    return vm.outputs["Value"]


def _mix_rgb(nodes, links, fac, a, b):
    """fac socket or float; a/b colour sockets or RGBA tuples. Returns colour socket."""
    m = nodes.new("ShaderNodeMixRGB")
    m.blend_type = "MIX"
    for sock, val in ((m.inputs[0], fac), (m.inputs[1], a), (m.inputs[2], b)):
        if isinstance(val, bpy.types.NodeSocket):
            links.new(val, sock)
        else:
            sock.default_value = val
    return m.outputs[0]


def _math(nodes, links, op, a, b=None):
    m = nodes.new("ShaderNodeMath")
    m.operation = op
    for sock, val in ((m.inputs[0], a), (m.inputs[1], b)):
        if val is None:
            continue
        if isinstance(val, bpy.types.NodeSocket):
            links.new(val, sock)
        else:
            sock.default_value = val
    return m.outputs[0]


def _shading(nodes, links, finish="matte"):
    """Masks shared by every toon material: lit band, in-band gradient, highlight, rim."""
    F = C.FINISHES[finish]
    geo = nodes.new("ShaderNodeNewGeometry")
    n = geo.outputs["Normal"]
    ndl = _dot(nodes, links, n, C.LIGHT_DIR)
    soft = C.TERMINATOR_SOFTNESS
    lit = _smoothstep(nodes, links, ndl, C.LIGHT_THRESHOLD - soft, C.LIGHT_THRESHOLD + soft)
    # gentle gradient inside the bands: 1 - GRADIENT on the far side, 1 facing the light
    grad = nodes.new("ShaderNodeMapRange")
    grad.clamp = True
    links.new(ndl, grad.inputs["Value"])
    grad.inputs["From Min"].default_value = -1.0
    grad.inputs["From Max"].default_value = 1.0
    grad.inputs["To Min"].default_value = 1.0 - F["gradient"]
    grad.inputs["To Max"].default_value = 1.0
    hs = C.HIGHLIGHT_SOFTNESS
    hl = _smoothstep(nodes, links, _dot(nodes, links, n, C.HIGHLIGHT_DIR),
                     F["hl_threshold"] - hs, F["hl_threshold"] + hs)
    # rim: grazing to the view, on the lit side only
    vm = nodes.new("ShaderNodeVectorMath")
    vm.operation = "DOT_PRODUCT"
    links.new(n, vm.inputs[0])
    links.new(geo.outputs["Incoming"], vm.inputs[1])
    facing = _math(nodes, links, "ABSOLUTE", vm.outputs["Value"])
    edge = _smoothstep(nodes, links, _math(nodes, links, "SUBTRACT", 1.0, facing), C.RIM_LO, C.RIM_HI)
    rim = _math(nodes, links, "MULTIPLY", edge, _smoothstep(nodes, links, ndl, 0.05, 0.45))
    # ambient occlusion between parts (hull objects are invisible to these rays)
    ao = nodes.new("ShaderNodeAmbientOcclusion")
    ao.samples = C.AO_SAMPLES
    ao.inputs["Distance"].default_value = C.AO_DISTANCE
    occ = _math(nodes, links, "SUBTRACT", 1.0, ao.outputs["AO"])
    shade = _math(nodes, links, "SUBTRACT", 1.0, _math(nodes, links, "MULTIPLY", occ, C.AO_STRENGTH))
    grad_ao = _math(nodes, links, "MULTIPLY", grad.outputs["Result"], shade)
    return {"lit": lit, "grad": grad_ao, "hl": hl, "rim": rim}


def _toon_color(nodes, links, fill_hex, highlight=True, finish="matte"):
    F = C.FINISHES[finish]
    m = _shading(nodes, links, finish)
    col = _mix_rgb(nodes, links, m["lit"], to_linear(scale(fill_hex, F["shadow"])), to_linear(fill_hex))
    g = nodes.new("ShaderNodeMixRGB")
    g.blend_type = "MULTIPLY"
    g.inputs[0].default_value = 1.0
    links.new(col, g.inputs[1])
    links.new(m["grad"], g.inputs[2])
    col = g.outputs[0]
    if highlight:
        col = _mix_rgb(nodes, links, m["hl"], col, to_linear(mix(fill_hex, "#FFFFFF", F["hl_mix"])))
        rim = _math(nodes, links, "MULTIPLY", m["rim"], C.RIM_STRENGTH)
        col = _mix_rgb(nodes, links, rim, col, to_linear(mix(fill_hex, "#FFFFFF", C.RIM_MIX)))
    return col, m


def _emission(nodes, links, color):
    em = nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.0
    if isinstance(color, bpy.types.NodeSocket):
        links.new(color, em.inputs["Color"])
    else:
        em.inputs["Color"].default_value = color
    return em.outputs[0]


def _mix_shader(nodes, links, fac, a, b):
    ms = nodes.new("ShaderNodeMixShader")
    if isinstance(fac, bpy.types.NodeSocket):
        links.new(fac, ms.inputs[0])
    else:
        ms.inputs[0].default_value = fac
    links.new(a, ms.inputs[1])
    links.new(b, ms.inputs[2])
    return ms.outputs[0]


def _fade(nodes, links, shader):
    """Object colour alpha (obj.color[3]) fades a part out, e.g. the death dust."""
    info = nodes.new("ShaderNodeObjectInfo")
    transparent = nodes.new("ShaderNodeBsdfTransparent").outputs[0]
    return _mix_shader(nodes, links, info.outputs["Alpha"], transparent, shader)


def _output(nodes, links, shader):
    out = nodes.new("ShaderNodeOutputMaterial")
    out.target = "CYCLES"
    links.new(shader, out.inputs["Surface"])


def _team_switch(nodes):
    v = nodes.new("ShaderNodeValue")
    v.name = "team_pass"
    v.outputs[0].default_value = 0.0
    return v.outputs[0]


def toon(fill_hex, highlight=True, finish="matte"):
    """Opaque cel-shaded material in a fixed palette colour. finish: matte, gloss or metal."""
    key = ("toon", fill_hex, highlight, finish)
    if key not in _cache:
        mat = bpy.data.materials.new(f"toon_{fill_hex}_{finish}")
        nt, nodes, links = _nodes(mat)
        col, _ = _toon_color(nodes, links, fill_hex, highlight, finish)
        _output(nodes, links, _fade(nodes, links, _emission(nodes, links, col)))
        _cache[key] = mat
    return _cache[key]


def glow(hex_):
    """Unshaded emissive colour for lights, visors and energy (no toon bands)."""
    key = ("glow", hex_)
    if key not in _cache:
        mat = bpy.data.materials.new(f"glow_{hex_}")
        nt, nodes, links = _nodes(mat)
        _output(nodes, links, _fade(nodes, links, _emission(nodes, links, to_linear(hex_))))
        _cache[key] = mat
    return _cache[key]


def team():
    """Team-coloured surface (tabard, caparison, plume, shield face). See module doc."""
    key = ("team",)
    if key not in _cache:
        mat = bpy.data.materials.new("team")
        nt, nodes, links = _nodes(mat)
        switch = _team_switch(nodes)
        col, masks = _toon_color(nodes, links, "#FFFFFF", highlight=False)
        team_shader = _emission(nodes, links, col)
        # Base pass: a hole, plus faint white highlight and rim shapes over the tinted layer.
        a = _math(nodes, links, "MULTIPLY", masks["hl"], C.TEAM_HIGHLIGHT_ALPHA)
        b = _math(nodes, links, "MULTIPLY", masks["rim"], C.TEAM_RIM_ALPHA)
        overlay = _math(nodes, links, "MAXIMUM", a, b)
        holdout = nodes.new("ShaderNodeHoldout").outputs[0]
        white = _emission(nodes, links, (1, 1, 1, 1))
        base_shader = _mix_shader(nodes, links, overlay, holdout, white)
        _output(nodes, links, _mix_shader(nodes, links, switch, base_shader, team_shader))
        _cache[key] = mat
        TEAM_MATERIALS.append(mat)
    return _cache[key]


def outline(fill_hex=None, team_part=False):
    """Back-face-only hull material. Outline colour = fill darkened 45% (DESIGN A11)."""
    key = ("outline", fill_hex, team_part)
    if key not in _cache:
        mat = bpy.data.materials.new(f"outline_{'team' if team_part else fill_hex}")
        nt, nodes, links = _nodes(mat)
        geo = nodes.new("ShaderNodeNewGeometry")
        transparent = nodes.new("ShaderNodeBsdfTransparent").outputs[0]
        if team_part:
            switch = _team_switch(nodes)
            holdout = nodes.new("ShaderNodeHoldout").outputs[0]
            grey = _emission(nodes, links, to_linear(scale("#FFFFFF", C.OUTLINE_FACTOR)))
            line = _mix_shader(nodes, links, switch, holdout, grey)
            TEAM_MATERIALS.append(mat)
        else:
            line = _emission(nodes, links, to_linear(scale(fill_hex, C.OUTLINE_FACTOR)))
        # Hull normals are reversed: its near side is "backfacing" and must stay invisible.
        shader = _mix_shader(nodes, links, geo.outputs["Backfacing"], line, transparent)
        _output(nodes, links, shader if team_part else _fade(nodes, links, shader))
        _cache[key] = mat
    return _cache[key]


def set_team_pass(on):
    for mat in TEAM_MATERIALS:
        mat.node_tree.nodes["team_pass"].outputs[0].default_value = 1.0 if on else 0.0


def reset():
    _cache.clear()
    TEAM_MATERIALS.clear()
