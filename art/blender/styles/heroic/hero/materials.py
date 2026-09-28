"""Heroic materials for Cycles: stylised, painted toon shading computed from normals and output
as emission (no lamps, so a frame only needs antialiasing samples).

Per pixel:
  lit      soft-edged key band (smoothstep of N.key around TERMINATOR)
  colour   mix(shadow colour, fill, lit) x in-band gradient x AO x ground occlusion x far factor
  env      metals and gold: a stylised chrome reflection (sky, dark horizon band, bright line)
  warm     skin: a warm band along the terminator (a hint of subsurface)
  bounce   a warm lift on down-facing surfaces
  sheen    fur: a fresnel lightening
  spec     one sharp highlight shape (Blinn with a fixed half vector)
  rim      a bright warm rim on grazing edges that face up or sideways (symmetric in x)

Team surfaces use the tint-underlay scheme of the base pipeline: in the base pass they are a
holdout plus white specular and rim overlays; in the team pass they are the same shading in
grey (1.0 lit, TEAM_SHADOW in shadow), so the game's tint gives the team colour, its shadow and
its highlight for every preset from one sheet. Constant factors are authored in sRGB and
converted (x ** 2.2) because the node tree works in linear light.
"""
import math

import bpy

from ageborn_art import materials as base_mats
from ageborn_art.colors import hex_to_rgb, mix, scale, shadow, to_linear

from . import config as H

_cache = {}


def lin(f):
    return max(0.0, f) ** 2.2


def _nodes(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return nt.nodes, nt.links


def _sock(links, val, sock):
    if isinstance(val, bpy.types.NodeSocket):
        links.new(val, sock)
    else:
        sock.default_value = val


def _math(nodes, links, op, a, b=None, clamp=False):
    m = nodes.new("ShaderNodeMath")
    m.operation = op
    m.use_clamp = clamp
    _sock(links, a, m.inputs[0])
    if b is not None:
        _sock(links, b, m.inputs[1])
    return m.outputs[0]


def _smooth(nodes, links, v, lo, hi, to=(0.0, 1.0)):
    mr = nodes.new("ShaderNodeMapRange")
    mr.interpolation_type = "SMOOTHSTEP"
    mr.clamp = True
    _sock(links, v, mr.inputs["Value"])
    mr.inputs["From Min"].default_value = lo
    mr.inputs["From Max"].default_value = hi
    mr.inputs["To Min"].default_value = to[0]
    mr.inputs["To Max"].default_value = to[1]
    return mr.outputs["Result"]


def _linear(nodes, links, v, lo, hi, to):
    mr = nodes.new("ShaderNodeMapRange")
    mr.clamp = True
    _sock(links, v, mr.inputs["Value"])
    mr.inputs["From Min"].default_value = lo
    mr.inputs["From Max"].default_value = hi
    mr.inputs["To Min"].default_value = to[0]
    mr.inputs["To Max"].default_value = to[1]
    return mr.outputs["Result"]


def _dot(nodes, links, a, b):
    vm = nodes.new("ShaderNodeVectorMath")
    vm.operation = "DOT_PRODUCT"
    _sock(links, a, vm.inputs[0])
    _sock(links, b, vm.inputs[1])
    return vm.outputs["Value"]


def _mix(nodes, links, fac, a, b, blend="MIX"):
    m = nodes.new("ShaderNodeMixRGB")
    m.blend_type = blend
    _sock(links, fac, m.inputs[0])
    _sock(links, a, m.inputs[1])
    _sock(links, b, m.inputs[2])
    return m.outputs[0]


def _mul(nodes, links, col, fac):
    return _mix(nodes, links, 1.0, col, fac if isinstance(fac, bpy.types.NodeSocket) else (fac, fac, fac, 1.0),
                "MULTIPLY")


def _z(nodes, links, vec):
    s = nodes.new("ShaderNodeSeparateXYZ")
    links.new(vec, s.inputs[0])
    return s.outputs["Z"]


def _norm(v):
    L = math.sqrt(sum(c * c for c in v))
    return tuple(c / L for c in v)


def _masks(nodes, links, F, far=False):
    """The scalar masks every heroic material shares."""
    geo = nodes.new("ShaderNodeNewGeometry")
    n = geo.outputs["Normal"]
    ndl = _dot(nodes, links, n, H.KEY_DIR)
    s = H.TERMINATOR_SOFT
    lit = _smooth(nodes, links, ndl, H.TERMINATOR - s, H.TERMINATOR + s)
    g = F["grad"]
    grad = _linear(nodes, links, ndl, -1.0, 1.0, (lin(1.0 - g), 1.0))
    ao = nodes.new("ShaderNodeAmbientOcclusion")
    ao.samples = H.AO_SAMPLES
    ao.inputs["Distance"].default_value = H.AO_DISTANCE
    aof = _linear(nodes, links, ao.outputs["AO"], 0.0, 1.0, (lin(1.0 - H.AO_STRENGTH), 1.0))
    gz = _linear(nodes, links, _z(nodes, links, geo.outputs["Position"]), 0.0, H.GROUND_AO[1],
                 (lin(H.GROUND_AO[0]), 1.0))
    shade = _math(nodes, links, "MULTIPLY", grad, aof)
    shade = _math(nodes, links, "MULTIPLY", shade, gz)
    if far:
        shade = _math(nodes, links, "MULTIPLY", shade, lin(H.FAR_FACTOR))
    half = _norm(tuple(a + b for a, b in zip(H.KEY_DIR, H.VIEW_DIR)))
    ndh = _dot(nodes, links, n, half)
    spec = None
    if F.get("spec"):
        t = F["spec"][0]
        spec = _smooth(nodes, links, ndh, t - 0.012, t + 0.012)
    ndv = _math(nodes, links, "ABSOLUTE", _dot(nodes, links, n, geo.outputs["Incoming"]))
    fres = _math(nodes, links, "SUBTRACT", 1.0, ndv)
    edge = _smooth(nodes, links, fres, *H.RIM_EDGE)
    nz = _z(nodes, links, n)
    up = _smooth(nodes, links, nz, *H.RIM_UP)
    rim = _math(nodes, links, "MULTIPLY", edge, up)
    down = _smooth(nodes, links, nz, -0.25, -0.85)
    env = None
    if F.get("env"):
        tc = nodes.new("ShaderNodeTexCoord")
        rz = _z(nodes, links, tc.outputs["Reflection"])
        f = _linear(nodes, links, rz, -1.0, 1.0, (0.0, 1.0))
        ramp = nodes.new("ShaderNodeValToRGB")
        cr = ramp.color_ramp
        cr.interpolation = "EASE"
        while len(cr.elements) > len(H.ENV_RAMP):
            cr.elements.remove(cr.elements[-1])
        while len(cr.elements) < len(H.ENV_RAMP):
            cr.elements.new(0.5)
        for el, (pos, v) in zip(cr.elements, H.ENV_RAMP):
            el.position = pos
            lv = lin(v) if v <= 1 else v ** 2.2
            el.color = (lv, lv, lv, 1.0)
        links.new(f, ramp.inputs["Fac"])
        env = ramp.outputs["Color"]
    return dict(lit=lit, shade=shade, spec=spec, rim=rim, fres=fres, down=down, env=env)


def _toon(nodes, links, fill, finish, far=False, grey=False):
    """Colour socket of a heroic toon surface (grey=True: the team layer version)."""
    F = H.FINISHES[finish]
    m = _masks(nodes, links, F, far)
    if grey:
        dark = "#" + ("%02X" % round(255 * H.TEAM_SHADOW)) * 3
        fill = "#FFFFFF"
    else:
        dark = shadow(fill, F["shadow"], 8.0)
    col = _mix(nodes, links, m["lit"], to_linear(dark), to_linear(fill))
    if F.get("warm") and not grey:
        # a warm band along the terminator: lit * (1 - lit) peaks at the edge
        band = _math(nodes, links, "MULTIPLY", m["lit"], _math(nodes, links, "SUBTRACT", 1.0, m["lit"]))
        band = _math(nodes, links, "MULTIPLY", band, 4.0 * F["warm"], clamp=True)
        warm = mix(fill, "#B85A48", 0.45)
        col = _mix(nodes, links, band, col, to_linear(warm))
    col = _mul(nodes, links, col, m["shade"])
    if m["env"] is not None:
        col = _mul(nodes, links, col, m["env"])
    if not grey:
        b = _math(nodes, links, "MULTIPLY", m["down"], H.BOUNCE_MIX)
        col = _mix(nodes, links, b, col, to_linear(scale(mix(fill, H.BOUNCE_COLOR, 0.5), 0.8)))
    if F.get("sheen"):
        sh = _math(nodes, links, "MULTIPLY", _smooth(nodes, links, m["fres"], 0.25, 0.9), F["sheen"])
        col = _mix(nodes, links, sh, col, to_linear(mix(fill, "#FFFFFF", 0.35)))
    return col, m, F


def _emission(nodes, links, color):
    em = nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.0
    _sock(links, color, em.inputs["Color"])
    return em.outputs[0]


def _mix_shader(nodes, links, fac, a, b):
    ms = nodes.new("ShaderNodeMixShader")
    _sock(links, fac, ms.inputs[0])
    links.new(a, ms.inputs[1])
    links.new(b, ms.inputs[2])
    return ms.outputs[0]


def _fade(nodes, links, shader):
    info = nodes.new("ShaderNodeObjectInfo")
    tr = nodes.new("ShaderNodeBsdfTransparent").outputs[0]
    return _mix_shader(nodes, links, info.outputs["Alpha"], tr, shader)


def _out(nodes, links, shader):
    o = nodes.new("ShaderNodeOutputMaterial")
    o.target = "CYCLES"
    links.new(shader, o.inputs["Surface"])


def surface(fill, finish="cloth", far=False):
    """Opaque heroic surface in a palette colour."""
    key = ("surf", fill, finish, far)
    if key not in _cache:
        mat = bpy.data.materials.new(f"hero_{finish}_{fill}_{int(far)}")
        nodes, links = _nodes(mat)
        col, m, F = _toon(nodes, links, fill, finish, far)
        if m["spec"] is not None:
            t, k, c = F["spec"]
            sm = _math(nodes, links, "MULTIPLY", m["spec"], k)
            col = _mix(nodes, links, sm, col, to_linear(mix(fill, c, 0.8)))
        rim = _math(nodes, links, "MULTIPLY", m["rim"], F["rim"])
        col = _mix(nodes, links, rim, col, to_linear(mix(fill, H.RIM_COLOR, 0.72)))
        _out(nodes, links, _fade(nodes, links, _emission(nodes, links, col)))
        _cache[key] = mat
    return _cache[key]


def team(finish="cloth", far=False):
    """Team surface: holdout + white spec/rim in the base pass, grey shading in the team pass."""
    key = ("team", finish, far)
    if key not in _cache:
        mat = bpy.data.materials.new(f"hero_team_{finish}_{int(far)}")
        nodes, links = _nodes(mat)
        sw = nodes.new("ShaderNodeValue")
        sw.name = "team_pass"
        sw.outputs[0].default_value = 0.0
        col, m, F = _toon(nodes, links, "#FFFFFF", finish, far, grey=True)
        team_shader = _emission(nodes, links, col)
        a = _math(nodes, links, "MULTIPLY", m["rim"], H.TEAM_RIM_ALPHA * F["rim"])
        if m["spec"] is not None:
            b = _math(nodes, links, "MULTIPLY", m["spec"], H.TEAM_SPEC_ALPHA * (0.6 + 0.4 * F["spec"][1]))
            a = _math(nodes, links, "MAXIMUM", a, b)
        if F.get("sheen"):
            c = _math(nodes, links, "MULTIPLY", _smooth(nodes, links, m["fres"], 0.3, 0.95), F["sheen"])
            a = _math(nodes, links, "MAXIMUM", a, c)
        hold = nodes.new("ShaderNodeHoldout").outputs[0]
        white = _emission(nodes, links, to_linear(H.RIM_COLOR))
        base_shader = _mix_shader(nodes, links, a, hold, white)
        _out(nodes, links, _mix_shader(nodes, links, sw.outputs[0], base_shader, team_shader))
        _cache[key] = mat
        base_mats.TEAM_MATERIALS.append(mat)
    return _cache[key]


def glow(hex_):
    return base_mats.glow(hex_)


def line(fill_hex=None, team_part=False, factor=None):
    """Interior line (back-face hull) in fill x INTERIOR_LINE_FACTOR."""
    factor = H.INTERIOR_LINE_FACTOR if factor is None else factor
    key = ("line", fill_hex, team_part, factor)
    if key not in _cache:
        mat = bpy.data.materials.new(f"hero_line_{'team' if team_part else fill_hex}")
        nodes, links = _nodes(mat)
        geo = nodes.new("ShaderNodeNewGeometry")
        tr = nodes.new("ShaderNodeBsdfTransparent").outputs[0]
        if team_part:
            sw = nodes.new("ShaderNodeValue")
            sw.name = "team_pass"
            sw.outputs[0].default_value = 0.0
            hold = nodes.new("ShaderNodeHoldout").outputs[0]
            grey = _emission(nodes, links, to_linear(scale("#FFFFFF", factor)))
            ln = _mix_shader(nodes, links, sw.outputs[0], hold, grey)
            base_mats.TEAM_MATERIALS.append(mat)
        else:
            ln = _emission(nodes, links, to_linear(scale(fill_hex, factor)))
        sh = _mix_shader(nodes, links, geo.outputs["Backfacing"], ln, tr)
        _out(nodes, links, sh if team_part else _fade(nodes, links, sh))
        _cache[key] = mat
    return _cache[key]


def trail(kind):
    """Flat emission for motion trails. kind 'core' renders red, 'fringe' green: one render
    gives both masks (hero/render.py splits them into the base and team layers)."""
    key = ("trail", kind)
    if key not in _cache:
        mat = bpy.data.materials.new(f"hero_trail_{kind}")
        nodes, links = _nodes(mat)
        c = (1.0, 0.0, 0.0, 1.0) if kind == "core" else (0.0, 1.0, 0.0, 1.0)
        _out(nodes, links, _emission(nodes, links, c))
        _cache[key] = mat
    return _cache[key]


def reset():
    _cache.clear()
    base_mats.reset()


def rgb(hex_):
    return hex_to_rgb(hex_)
