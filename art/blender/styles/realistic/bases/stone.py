"""Stone Age base, realistic style: the Cave Hold. heightLu 300, widthLu 190.

A weathered limestone crag that leans toward the lane, moss on its ledges, a firelit cave mouth at
its foot behind a sharpened log palisade framed by two mammoth tusks, torches either side. Four flat
rock shelves step up the crag at the shared turret mounts (`lib/world.BASE_MOUNTS`; each shelf top
lands exactly on its mount point, exported as `anchorsLu.mount0..3`). Team colour: a big painted hide
stretched on the rock face and hide banners on poles (the two flag clips).
Crumble: cracks and a fallen chunk (1), the palisade broken and rubble (2), the summit knocked away,
more rubble (3). Treasury: a berry basket and meat (1), a pile of furs (2), tusks and ochre (3).
"""
import math
import random
from types import SimpleNamespace

from lib import biped as B
from lib import core as C
from lib import game as G
from lib import mats as M
from lib import world as W

AGE = "stone"
YAW = -12.0
DEPTHS = [-18.0, -8.0, -18.0, -8.0]


def P(sx, sy, depth=0.0):
    """Character-space point that projects to screen (sx, sy) lu at world depth `depth`."""
    return C.place(sx, sy, depth, YAW)


def _limestone(name, base, dark):
    """Weathered limestone: noisy colour, horizontal strata bands, strong bump."""
    m = M.stone(base, dark, name=name, bump=1.6)
    nt = m.node_tree
    wv = nt.nodes.new("ShaderNodeTexWave")
    wv.bands_direction = "Z"
    wv.inputs["Scale"].default_value = 0.06
    wv.inputs["Distortion"].default_value = 8.0
    wv.inputs["Detail"].default_value = 4.0
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 0.82
    mr.inputs["To Max"].default_value = 1.06
    nt.links.new(wv.outputs["Fac"], mr.inputs["Value"])
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    src = bsdf.inputs["Base Color"].links[0].from_socket
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(src, mul.inputs[6])
    nt.links.new(mr.outputs[0], mul.inputs[7])
    # moss on upward-facing surfaces, broken up by noise
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Normal"], sep.inputs[0])
    up = nt.nodes.new("ShaderNodeMapRange")
    up.inputs["From Min"].default_value = 0.55
    up.inputs["From Max"].default_value = 0.85
    nt.links.new(sep.outputs["Z"], up.inputs["Value"])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 0.12
    nz.inputs["Detail"].default_value = 6.0
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    nm = nt.nodes.new("ShaderNodeMapRange")
    nm.inputs["From Min"].default_value = 0.42
    nm.inputs["From Max"].default_value = 0.6
    nt.links.new(nz.outputs["Fac"], nm.inputs["Value"])
    mm = nt.nodes.new("ShaderNodeMath")
    mm.operation = "MULTIPLY"
    nt.links.new(up.outputs[0], mm.inputs[0])
    nt.links.new(nm.outputs[0], mm.inputs[1])
    mossmix = nt.nodes.new("ShaderNodeMix")
    mossmix.data_type = "RGBA"
    nt.links.new(mm.outputs[0], mossmix.inputs["Factor"])
    nt.links.new(mul.outputs[2], mossmix.inputs[6])
    mossmix.inputs[7].default_value = C.col("#56663a")
    nt.links.new(mossmix.outputs[2], bsdf.inputs["Base Color"])
    return m


def build():
    rig = C.Rig("base_rig", BONES, yaw_deg=YAW)
    ctx = dict(rig=rig)
    stone = _limestone("limestone", "#9c907f", "#7c7266")
    stone_dk = _limestone("limestone_dk", "#827769", "#665d53")
    shelf = _limestone("shelf", "#a39684", "#8a7e70")
    moss = M.moss("#5d7036")
    dark = M.dark("#120e0c", name="cave")
    bark = M.bark()
    wood = M.wood("#7a6450", "#5a4a3c", name="bwood")
    ivory = M.ivory("#ddd0b2")
    rope = M.rope("#8c7a5c")
    hide = M.team_hide()
    cloth = M.team_cloth(name="bflag")
    fire = M.glow("#ffb45a", 8.0, name="fire")
    fire_core = M.glow("#fff0c8", 14.0, name="firecore")
    crack = M.dark("#2a231e", name="crack")

    def blob(name, els, mat, g, res=2.0, disp=(4.0, 0.08), bone="body"):
        o = C.blobs(name, els, mat, res=res)
        if disp:
            C.displace(o, disp[0], disp[1])
        rig.rigid(W.grp(o, g), bone)
        return o

    def crag(name, sx, sy, depth, size, g, mat=stone, seed=0, sub=4, flat_top=None, rigged=True):
        """A weathered boulder: a displaced icosphere with angular facets (clouds + voronoi)."""
        import bmesh
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
        o = C.from_bm(name, bm, mat, sharp_deg=32)
        c = P(sx, sy, depth)
        C.xform(o, loc=c, scale=size)
        m = max(size)
        t1 = bpy.data.textures.new(name + "_c", "CLOUDS")
        t1.noise_scale = m * 0.55
        t1.noise_depth = 3
        d1 = o.modifiers.new("d1", "DISPLACE")
        d1.texture, d1.strength, d1.texture_coords = t1, m * 0.4, "GLOBAL"
        t2 = bpy.data.textures.new(name + "_v", "VORONOI")
        t2.noise_scale = m * 0.22
        t2.distance_metric = "DISTANCE"
        d2 = o.modifiers.new("d2", "DISPLACE")
        d2.texture, d2.strength, d2.texture_coords = t2, m * 0.15, "GLOBAL"
        if flat_top is not None:
            C.apply_mods(o)
            for v in o.data.vertices:
                if v.co.z > flat_top:
                    v.co.z = flat_top + (v.co.z - flat_top) * 0.08
        if rigged:
            rig.rigid(W.grp(o, g), "body")
        return o

    import bpy
    # the crag: a wide foot, a pillar at the back, a body leaning toward the lane, an overhang, the summit
    # AD pass: the main masses are fused into ONE crag (voxel remesh), then re-weathered with strata,
    # facets and cracks, so the hold reads as a single rock outcrop instead of stacked boulders
    parts = [crag("foot", -104, 42, 44, (92, 58, 46), "crag", seed=1, rigged=False),
             crag("foot2", -40, 22, 10, (40, 30, 26), "crag", seed=2, rigged=False),
             crag("pillar", -162, 140, 60, (40, 46, 130), "crag", seed=3, rigged=False),
             crag("body", -96, 124, 36, (70, 50, 56), "crag", seed=4, rigged=False),
             crag("upper", -80, 192, 34, (52, 42, 44), "crag", seed=5, rigged=False),
             crag("neck", -118, 88, 44, (60, 44, 44), "crag", seed=10, rigged=False),
             crag("overhang", -38, 172, 14, (36, 28, 18), "crag", seed=6, rigged=False)]
    for o in parts:
        C.apply_mods(o)
    fused = C.join("crag_main", parts)
    rm = fused.modifiers.new("rm", "REMESH")
    rm.mode, rm.voxel_size, rm.use_smooth_shade = "VOXEL", 2.4, True
    C.apply_mods(fused)
    fused.data.materials.clear()
    fused.data.materials.append(stone)
    for nm, kind, sc, st in (("f_big", "CLOUDS", 26.0, 7.0), ("f_facet", "VORONOI", 11.0, 3.2), ("f_fine", "CLOUDS", 4.0, 1.1)):
        tx = bpy.data.textures.new(nm, kind)
        tx.noise_scale = sc
        if kind == "VORONOI":
            tx.distance_metric = "DISTANCE"
        dm = fused.modifiers.new(nm, "DISPLACE")
        dm.texture, dm.strength, dm.texture_coords = tx, st, "GLOBAL"
    C.apply_mods(fused)
    fused.data.shade_smooth()
    fused.data.set_sharp_from_angle(angle=math.radians(38))
    rig.rigid(W.grp(fused, "crag"), "body")
    crag("summit", -88, 250, 34, (34, 28, 30), "summit-2", seed=7)
    crag("summit2", -120, 236, 44, (26, 24, 26), "summit-2", mat=stone_dk, seed=8)
    crag("summit_broken", -92, 232, 34, (30, 26, 14), "summit+3", seed=9)
    for i, (sx, sy, d, sz) in enumerate(((-172, 18, 10, 20), (-8, 10, -20, 13), (-140, 8, -30, 11), (-64, 6, -44, 8))):
        crag(f"boulder{i}", sx, sy, d, (sz, sz * 0.8, sz * 0.7), "crag", mat=stone_dk if i % 2 else stone, seed=20 + i, sub=3)
    # moss on the ledges and the summit


    # the four turret shelves: rock slabs whose top centre is exactly the mount point
    ctx["mounts"] = []
    for i, ((mx, my), d) in enumerate(zip(W.BASE_MOUNTS, DEPTHS)):
        top = P(mx, my, d)
        ctx["mounts"].append(top)
        import bmesh
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
        sl = C.from_bm(f"shelf{i}", bm, shelf, sharp_deg=35)
        C.xform(sl, loc=(top[0] - 2, top[1] + 4, top[2] - 7.0), scale=(26, 21, 9))
        t = bpy.data.textures.new(f"shelf{i}_v", "VORONOI")
        t.noise_scale = 6.0
        dm = sl.modifiers.new("d", "DISPLACE")
        dm.texture, dm.strength, dm.texture_coords = t, 2.2, "GLOBAL"
        C.apply_mods(sl)
        for v in sl.data.vertices:
            if v.co.z > top[2] - 0.8:
                v.co.z = top[2] - 0.8 + (v.co.z - top[2] + 0.8) * 0.05
        rig.rigid(W.grp(sl, "crag"), "body")
        crag(f"shelfrock{i}", mx - 4, my - 16, d + 10, (18, 15, 11), "crag", mat=stone_dk, seed=40 + i, sub=3)

    # the cave mouth, palisade, tusks and torches
    cave = P(-100, 30, -14)
    blob("cave", [((cave[0], cave[1], cave[2]), (26, 8, 30))], dark, "crag", res=1.2, disp=None)
    blob("cavelip", [((cave[0], cave[1] - 3, cave[2] + 30), (32, 10, 7))], stone_dk, "crag", res=1.4, disp=(2.0, 0.3))
    glow_floor = C.blobs("embers", [((cave[0] + 2, cave[1] - 2, 2), (10, 4, 2.4))], fire, res=1.0)
    rig.rigid(W.grp(glow_floor, "crag"), "body")
    rnd = random.Random(5)
    for i in range(9):
        x = cave[0] - 36 + i * 9
        h = 38 + rnd.uniform(-5, 5)
        g = "palisade-1" if i in (3, 4, 5, 6) else "crag"
        lg = C.tube(f"stake{i}", [(x, cave[1] - 20, 0), (x, cave[1] - 20, h), (x, cave[1] - 20, h + 7)], [3.2, 3.0, 0.3], bark, seg=10)
        rig.rigid(W.grp(lg, g), "body")
    for i in (3, 4, 5, 6):
        x = cave[0] - 36 + i * 9
        br = C.tube(f"broken{i}", [(x, cave[1] - 20, 0), (x + rnd.uniform(-3, 3), cave[1] - 20, 12 + rnd.uniform(0, 8))],
                    [3.2, 2.6], bark, seg=10)
        rig.rigid(W.grp(br, "palisade+2"), "body")
        fl = C.tube(f"fallen{i}", [(x - 10, cave[1] - 26 - i, 3), (x + 18, cave[1] - 30 - i, 3.5)], [3.0, 2.8], bark, seg=10)
        rig.rigid(W.grp(fl, "palisade+2"), "body")
    for zz in (14, 30):
        rope_o = C.tube("palrope", [(cave[0] - 38, cave[1] - 23, zz), (cave[0] + 38, cave[1] - 23, zz)], [0.8, 0.8], rope, seg=6)
        rig.rigid(W.grp(rope_o, "palisade-1"), "body")
    for s in (-1, 1):
        base_x = cave[0] + s * 46
        tusk = C.tube("tusk", [(base_x, cave[1] - 18, 0), (base_x + s * 6, cave[1] - 20, 24), (base_x + s * 2, cave[1] - 22, 46),
                               (base_x - s * 8, cave[1] - 22, 58)], [5.2, 4.6, 3.2, 0.8], ivory, seg=14)
        rig.rigid(W.grp(tusk, "crag"), "body")
    ctx["torches"] = []
    for s in (-1, 1):
        tx, ty = cave[0] + s * 30, cave[1] - 26
        rig.rigid(W.grp(C.tube("torch", [(tx, ty, 0), (tx, ty, 34)], [1.6, 1.4], wood, seg=8), "crag"), "body")
        rig.rigid(W.grp(C.lathe("torchhead", [(0.1, 0), (3.4, 2), (3.0, 6), (0.1, 6.5)], rope, seg=10, loc=(tx, ty, 33)), "crag"), "body")
        fl = C.blobs("flame", [((tx, ty - 0.5, 42), (3.4, 2.6, 6.4))], fire, res=0.6)
        rig.rigid(W.grp(fl, "crag"), "body")
        rig.rigid(W.grp(C.blobs("flamecore", [((tx, ty - 1.5, 40.5), (1.6, 1.2, 3.2))], fire_core, res=0.4), "crag"), "body")
        ctx["torches"].append((tx, ty, 42))

    # the team hide: a whole dyed animal pelt (legs, neck, tail lobes, ragged edge) stretched on a
    # lashed branch frame on the rock face, with painted ochre clan stripes (AD pass: it used to be a
    # flat square sign with a dot)
    import bmesh
    hc = P(-112, 150, -16)
    HW, HH = 23.0, 25.0

    def pelt_in(u, v):
        rnd_e = 0.035 * math.sin(u * 23.0 + v * 7.0) + 0.03 * math.sin(v * 31.0 - u * 5.0)
        f = (u / 0.58) ** 2 + (v / 0.74) ** 2 - 1.0
        for (cu, cv, r) in ((-0.66, 0.52, 0.2), (0.66, 0.52, 0.2), (-0.62, -0.6, 0.22), (0.62, -0.6, 0.22),
                            (0.0, 0.86, 0.2), (0.0, -0.9, 0.12)):
            f = min(f, ((u - cu) ** 2 + (v - cv) ** 2) / r ** 2 - 1.0)
        for (a, b, r) in (((-0.66, 0.52), (-0.3, 0.3), 0.14), ((0.66, 0.52), (0.3, 0.3), 0.14),
                          ((-0.62, -0.6), (-0.3, -0.35), 0.15), ((0.62, -0.6), (0.3, -0.35), 0.15)):
            ab = (b[0] - a[0], b[1] - a[1])
            t = max(0.0, min(1.0, ((u - a[0]) * ab[0] + (v - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2)))
            d2 = (u - a[0] - t * ab[0]) ** 2 + (v - a[1] - t * ab[1]) ** 2
            f = min(f, d2 / r ** 2 - 1.0)
        return f + rnd_e < 0.0

    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=48, y_segments=52, size=1.0)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not pelt_in(v.co.x, v.co.y)], context="VERTS")
    for v in bm.verts:
        u, w = v.co.x, v.co.y
        sag = -1.4 * (1.0 - min(1.0, u * u / 0.5 + w * w / 0.7))       # the hide bellies out between the lashings
        v.co = (hc[0] + u * HW, hc[1] + sag, hc[2] + w * HH)
    hd = C.from_bm("teamhide", bm, hide)
    so = hd.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.9
    sm = hd.modifiers.new("sub", "SUBSURF")
    sm.levels = sm.render_levels = 1
    C.displace(hd, 0.8, 2.0)
    C.team(hd)
    rig.rigid(W.grp(hd, "crag"), "body")
    # branch frame (overlapping ends lashed), leg tips lashed to the frame
    FX, FZ = HW * 1.06, HH * 1.0
    for a, b in (((-FX - 4, FZ), (FX + 4, FZ + 1.5)), ((-FX - 3, -FZ), (FX + 4, -FZ - 1.0)),
                 ((-FX, FZ + 4), (-FX - 1.0, -FZ - 4)), ((FX, FZ + 5), (FX + 1.2, -FZ - 3))):
        br = C.tube("frame", [(hc[0] + a[0], hc[1] + 1.2, hc[2] + a[1]), (hc[0] + b[0], hc[1] + 1.2, hc[2] + b[1])],
                    [1.5, 1.2], bark, seg=8)
        rig.rigid(W.grp(br, "crag"), "body")
    for (u, w), (fx_, fz_) in (((-0.8, 0.62), (-FX, FZ * 0.8)), ((0.8, 0.62), (FX, FZ * 0.8)), ((-0.78, -0.74), (-FX, -FZ * 0.9)),
                               ((0.78, -0.74), (FX, -FZ * 0.9)), ((0.0, 0.98), (0.0, FZ)), ((0.0, -0.98), (0.0, -FZ))):
        rig.rigid(W.grp(C.tube("lashing", [(hc[0] + u * HW, hc[1] - 0.6, hc[2] + w * HH), (hc[0] + fx_, hc[1] + 0.6, hc[2] + fz_)],
                               [0.55, 0.55], rope, seg=6), "crag"), "body")
    ochre_m = M.ochre("#5e3a2a", name="clanpaint")
    for k, du in enumerate((-6.0, 0.0, 6.0)):
        st = C.tube("clanstripe", [(hc[0] + du + 1.2, hc[1] - 2.3, hc[2] + 10 - abs(du) * 0.4),
                                   (hc[0] + du, hc[1] - 2.8, hc[2] - 2),
                                   (hc[0] + du - 1.0, hc[1] - 2.3, hc[2] - 12 + abs(du) * 0.4)],
                    [1.5, 1.8, 0.9], ochre_m, seg=8, flat=0.25)
        rig.rigid(W.grp(st, "crag"), "body")

    # crumble details
    for i, pts in enumerate(([(-60, 140), (-50, 125), (-56, 110), (-44, 96)], [(-130, 190), (-118, 176), (-124, 160)],
                             [(-30, 70), (-22, 58), (-28, 44)])):
        cr = C.tube(f"crack{i}", [P(x, y, -40) for x, y in pts], [2.2] * len(pts), crack, seg=6, flat=0.5)
        rig.rigid(W.grp(cr, "crack+1" if i == 0 else "crack+2"), "body")
    crag("chunk", -26, 100, -2, (17, 14, 14), "chunk-0", seed=30, sub=3)
    for i, (sx, depth, r) in enumerate(((-20, -40, 9), (-60, -46, 7), (-150, -30, 8), (10, -50, 6))):
        blob(f"rubble{i}", [(P(sx, r * 0.6, depth), (r, r * 0.8, r * 0.7))], stone_dk, "rubble+1" if i == 0 else "rubble+2",
             res=0.8, disp=(1.4, 0.3))
    for i, (sx, depth, r) in enumerate(((-40, -56, 12), (-110, -60, 9), (-6, -30, 10))):
        blob(f"rubble3_{i}", [(P(sx, r * 0.6, depth), (r, r * 0.8, r * 0.7))], stone, "rubble+3", res=0.8, disp=(1.6, 0.3))

    # flags: hide banners on poles, one on the summit (front), one on the back shoulder
    for name, (sx, sy, d), h in (("flagA", (-74, 272, 10), 36), ("flagB", (-150, 214, 50), 40)):
        base = P(sx, sy, d)
        rig.rigid(W.grp(C.tube(name + "pole", [base, (base[0], base[1], base[2] + h + 2)], [1.4, 1.2], wood, seg=8), name), "body")
        cl = C.tube(name + "cloth", [(base[0] - 1, base[1], base[2] + h - 3 - 0.2 * i * i) if i == 0 else
                                     (base[0] - 1 - 7.5 * i, base[1], base[2] + h - 3 - 0.25 * i * i) for i in range(5)],
                    [8.5, 8.2, 7.6, 6.6, 4.8], cloth, seg=12, flat=0.16)
        C.team(cl)
        rig.skin(W.grp(cl, name), [name + "0", name + "1", name + "2"], soft=4.0)
        tassel = C.sphere(name + "fin", 2.0, M.bone(), loc=(base[0], base[1], base[2] + h + 3))
        rig.rigid(W.grp(tassel, name), "body")

    # treasury: 1 berry basket and meat, 2 a pile of furs, 3 tusks and ochre stones
    basket = C.lathe("basket", [(0, 0), (7, 0.5), (9, 5), (9.4, 9), (8.2, 9.4)], M.straw("#9c8458", name="wicker"), seg=20,
                     loc=P(-40, 4, -60))
    rig.rigid(W.grp(basket, "treasury1"), "body")
    bx, by, bz = P(-40, 4, -60)
    ber = C.blobs("berries", [((bx + 2 * math.cos(a), by + 2 * math.sin(a), bz + 9.5 + (a % 1.3)), (2.2, 2.2, 2.0))
                              for a in (0, 1.3, 2.6, 3.9, 5.2)], C.mat("berry", "#5a2e3a", rough=0.3, noise=0.1, bump=0.1, coat=0.5),
                     res=0.4)
    rig.rigid(W.grp(ber, "treasury1"), "body")
    meat = C.blobs("meat", [(P(-60, 6, -64), (10, 6, 5))], C.mat("meat", "#8a4e44", rough=0.5, noise=0.2, bump=0.4), res=0.6)
    rig.rigid(W.grp(meat, "treasury1"), "body")
    rig.rigid(W.grp(C.tube("meatbone", [P(-72, 6, -64), P(-48, 7, -64)], [1.6, 1.6], M.bone(), seg=8), "treasury1"), "body")
    for i in range(4):
        f = C.blobs(f"fur{i}", [(P(-130 + i * 5, 5 + i * 4, -56 - i), (18 - i * 2, 12 - i, 3.2))],
                    M.fur(["#7a6048", "#5d4a3a", "#8a7058", "#4e4036"][i], "#3e3228", name=f"pile{i}"), res=0.8)
        C.displace(f, 1.6, 0.3)
        rig.rigid(W.grp(f, "treasury2"), "body")
    for s in (-1, 1):
        t0 = P(-170 + s * 8, 2, -40)
        tk = C.tube("ttusk", [t0, (t0[0] + 16, t0[1] - 4 * s, t0[2] + 8), (t0[0] + 30, t0[1] - 6 * s, t0[2] + 24)],
                    [3.6, 2.8, 0.6], ivory, seg=12)
        rig.rigid(W.grp(tk, "treasury3"), "body")
    for i in range(5):
        o = C.blobs(f"ochre{i}", [(P(-150 + i * 7, 3, -66 - (i % 2) * 5), (4, 3.4, 3))],
                    M.ochre(["#8a5a3a", "#7a3e2e", "#9a6a3a", "#6a4a36", "#8a4a32"][i], name=f"ochre{i}"), res=0.4)
        C.displace(o, 0.5, 0.6)
        rig.rigid(W.grp(o, "treasury3"), "body")
    return ctx


BONES = {"root": ((0, 0, 0), (0, 0, 10), None), "body": ((0, 0, 0), (0, 0, 10), "root")}
for _n, (_sx, _sy, _d), _h in (("flagA", (-74, 272, 10), 36), ("flagB", (-150, 214, 50), 40)):
    _b = C.place(_sx, _sy, _d, YAW)
    _prev = "body"
    for _i in range(3):
        _p0 = (_b[0] - 1 - 10 * _i, _b[1], _b[2] + _h - 3)
        _p1 = (_b[0] - 1 - 10 * (_i + 1), _b[1], _b[2] + _h - 3)
        BONES[f"{_n}{_i}"] = (_p0, _p1, _prev)
        _prev = f"{_n}{_i}"


def pose(ctx, clip, t):
    rig = ctx["rig"]
    rig.rest()
    i = W.frame_of(CLIPS[clip], t)
    W.base_visibility(ctx, clip, i)
    if clip.startswith("flag"):
        ph = 2 * math.pi * i / 4 + (1.7 if clip == "flagB" else 0.0)
        for k in range(3):
            a = ph - k * 1.25
            rig.set(f"{clip}{k}", r=math.radians(-6 * math.cos(a) - 4), rz=math.radians(16 * math.sin(a) * (0.6 if k == 0 else 1.0)))


def clips():
    return W.base_clips()


CLIPS = {c.name: c for c in W.base_clips()}


def _lights():
    cave = C.place(-100, 30, -14, YAW)
    out = []
    for s, cm in ((-1, 3), (1, 2)):
        wx, wy = cave[0] + s * 30, cave[1] - 26
        out.append(dict(zip(("x", "y"), W.pivot_lu((wx, wy, 42), YAW)), crumbleMax=cm, r=22))
    out.append(dict(zip(("x", "y"), W.pivot_lu((cave[0] + 2, cave[1] - 2, 2), YAW)), crumbleMax=3, r=30))
    return out


MODULE = SimpleNamespace(
    SLUG="stone", FILE="stone", NAME="Cave Hold", AGE=AGE, KIND="base", VISUAL_ID="base.stone", HEIGHT_LU=300,
    PX1=1.025, SCALE1=1.25, CANVAS=(300, 336), FEET=(248, 20), YAW=YAW,
    ANCHORS={"head": (-95.0, 300), "hitCenter": (-76.0, 135.0)},
    TRACKERS={f"mount{i}": ("body", C.place(mx, my, d, YAW)) for i, ((mx, my), d) in enumerate(zip(W.BASE_MOUNTS, DEPTHS))},
    EXTRA_META={"kind": "base", "age": AGE, "widthLu": 190, "mountsLu": [list(m) for m in W.BASE_MOUNTS],
                "flags": [{"clip": "flagA", "crumbleMax": 2, "z": "front"}, {"clip": "flagB", "crumbleMax": 3, "z": "back"}],
                "lightsLu": _lights(),
                "smokeLu": [{"x": -68.0, "y": 250.0, "crumbleMin": 2}, {"x": -123.0, "y": 143.0, "crumbleMin": 3},
                            {"x": -149.0, "y": 106.0, "crumbleMin": 3}],
                "hornLu": [-96, 316]},
    build=build, pose=pose, clips=clips, LREF=None)
