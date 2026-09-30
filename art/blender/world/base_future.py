"""Future Age base: the Spire (DESIGN A11 Bases).

A tall pale spire on a charcoal plinth, cut into panels by charcoal seams with mint light strips,
ringed by glowing bands, with team light panels, a magenta energy core at the gate and hovering
disc platforms on struts for the turret mounts (common.BASE_MOUNTS). The spire's white is held at
about 0.75 albedo so the three-step shading shows. Team colour: the panels, the core's collar and
the holo flags. Crumble: cracked panels and a lost fin (75%), a broken strut and rubble (50%), the
tip knocked askew and the top flag gone (25%). Cartoon kit v2 (2026-09-30): lit window slits,
and crumble stages that read at a glance (see `_damage`: a bitten chunk with sparking wires, then a
plasma fire with dark windows and a dead light ring, then a breach with a hanging cable and the tip
snapped to a burning stump). Treasury: energy cells (1), a crystal cluster (2), a
data vault cube (3).
"""
import math

from ageborn_art.geometry import Geo

from world.common import BASE_YAW, base_module, box, chipped_cracks, cyl, flag, platform, rubble

CHARCOAL = "#23262E"
CHAR_LT = "#3A3F4A"
SEAM = "#2C3038"
WHITE = "#BFC4CB"        # ~0.75 albedo (was near-white; art review)
WHITE_LT = "#CED3D9"
TRIM = "#8E97A4"
MINT = "#3AF0B4"
MINT_CORE = "#D6FFF1"
MAGENTA = "#F03AA8"
MAGENTA_CORE = "#FFD6EE"
CYAN = "#29E3F5"
CRACK = "#2A2E36"

DEPTHS = [-40, -24, -40, -24]
SP = (-92.0, 26.0)
PROFILE = [(0, 0), (42, 0), (40, 40), (32, 110), (24, 170), (17, 226), (0, 226)]   # (radius, height above 16)


def radius_at(z):
    h = z - 16
    for (r0, z0), (r1, z1) in zip(PROFILE[1:], PROFILE[2:]):
        if z0 <= h <= z1 and z1 > z0:
            return r0 + (r1 - r0) * (h - z0) / (z1 - z0)
    return 17


def build(rig, M):
    for j, pos in (("tip", (SP[0], SP[1], 242)), ("fin", (SP[0] - 36, SP[1], 60)), ("strut", (0, 0, 0))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    # plinth
    g = Geo()
    cyl(g, (SP[0], SP[1], 0), (SP[0], SP[1], 16), 72, 66, bevel=2.0, segs=36, squash=(1.0, 0.72))
    rig.part("body", g, CHARCOAL)
    g = Geo()
    cyl(g, (SP[0], SP[1], 15), (SP[0], SP[1], 18), 68, bevel=0.6, segs=36, squash=(1.0, 0.72))
    rig.part("body", g, glow=MINT, outline=0)
    # the spire body, the tip that can fall
    g = Geo().lathe(PROFILE, (SP[0], SP[1], 16), (SP[0], SP[1], 16 + 226), segs=36)
    rig.part("body", g, WHITE, finish="gloss")
    g = Geo().lathe([(0, 0), (17, 0), (11, 40), (4, 76), (0, 84)], (SP[0], SP[1], 240), (SP[0], SP[1], 324), segs=24)
    rig.part("tip", g, WHITE_LT, finish="gloss")
    g = Geo().sphere((SP[0], SP[1], 314), 4.4, cuts=3)
    rig.part("tip", g, glow=MAGENTA_CORE, outline=0.8, outline_hex=MAGENTA)
    # panel seams: vertical charcoal grooves and horizontal joints, with mint light strips
    seams, strips = Geo(), Geo()
    for a_deg in (-150, -118, -86, -54, -22):
        a = math.radians(a_deg)
        pts = []
        for z in range(22, 238, 12):
            r = radius_at(z) + 0.4
            pts.append((SP[0] + r * math.cos(a), SP[1] + r * math.sin(a), z))
        for p, q in zip(pts, pts[1:]):
            seams.capsule(p, q, 0.9, segs=6, rings=2)
    for z in (92, 162, 218):
        r = radius_at(z) + 0.5
        cyl(seams, (SP[0], SP[1], z - 0.8), (SP[0], SP[1], z + 0.8), r, bevel=0.2, segs=36)
    for a_deg, z0, z1 in ((-134, 30, 84), (-70, 30, 84), (-102, 100, 150), (-38, 100, 150), (-134, 170, 210),
                          (-70, 170, 210)):
        a = math.radians(a_deg)
        p = (SP[0] + (radius_at(z0) + 0.8) * math.cos(a), SP[1] + (radius_at(z0) + 0.8) * math.sin(a), z0)
        q = (SP[0] + (radius_at(z1) + 0.8) * math.cos(a), SP[1] + (radius_at(z1) + 0.8) * math.sin(a), z1)
        strips.capsule(p, q, 1.1, segs=6, rings=2)
    rig.part("body", seams, SEAM, outline=0, highlight=False)
    rig.part("body", strips, glow=MINT, outline=0)
    # charcoal bands and mint glow rings
    for z in (56, 128, 196):
        r = radius_at(z)
        g = Geo()
        cyl(g, (SP[0], SP[1], z - 5), (SP[0], SP[1], z + 5), r + 2.5, bevel=1.0, segs=36)
        rig.part("body", g, CHAR_LT)
        g = Geo()
        cyl(g, (SP[0], SP[1], z - 1.2), (SP[0], SP[1], z + 1.2), r + 3.3, bevel=0.3, segs=36)
        rig.part("body", g, glow=MINT, outline=0)
    # team light panels on the spire's face
    for z0, z1 in ((66, 118), (138, 186)):
        r0, r1 = radius_at(z0), radius_at(z1)
        g = Geo().slab([(SP[0] - r0 * 0.34, z0), (SP[0] + r0 * 0.34, z0), (SP[0] + r1 * 0.34, z1), (SP[0] - r1 * 0.34, z1)],
                       SP[1] - (r0 + r1) / 2 - 1.5, 1.6)
        rig.part("body", g, team=True)
    # side fins
    g = Geo().slab([(SP[0] - 36, 16), (SP[0] - 68, 16), (SP[0] - 46, 84), (SP[0] - 32, 116)], SP[1], 5)
    rig.part("fin", g, CHAR_LT)
    g = Geo().slab([(SP[0] + 36, 16), (SP[0] + 60, 16), (SP[0] + 42, 74), (SP[0] + 32, 104)], SP[1] + 6, 5)
    rig.part("body", g, CHAR_LT)
    # energy core at the gate
    g = Geo()
    cyl(g, (-30, -34, 0), (-30, -34, 14), 16, 13, bevel=1.2, segs=24)
    rig.part("body", g, CHARCOAL)
    g = Geo()
    cyl(g, (-30, -34, 13), (-30, -34, 17), 13.5, bevel=0.6, segs=24)
    rig.part("body", g, team=True)
    g = Geo().sphere((-30, -34, 27), 10, cuts=4)
    rig.part("body", g, glow=MAGENTA, outline=1.0, outline_hex="#8A1E60")
    g = Geo().sphere((-32, -42, 29), 5, cuts=3)
    rig.part("body", g, glow=MAGENTA_CORE, outline=0)
    g = Geo()
    for a in (-50, 50):
        g.capsule((-30 + 14 * math.sin(math.radians(a)), -34, 12), (-30 + 12 * math.sin(math.radians(a)), -34, 42), 2.0, 1.2)
    rig.part("body", g, TRIM, finish="metal", outline=0.5)

    # hovering disc platforms at the mounts, with struts back into the spire
    for i, (x, y, z) in enumerate(M):
        r = radius_at(z - 16)
        anchor = (SP[0] + r * 0.6, SP[1] - r * 0.6, z - 22)
        if i == 0:
            anchor = (x - 4, y + 12, 2)   # a pylon down to the plinth
        platform(rig, "strut" if i == 2 else "body", (x, y, z), CHAR_LT, TRIM, style="disc", r=(24, 18), t=5,
                 depth_to=anchor, accent=MINT)

    chipped_cracks(rig, "crack1", [[(SP[0] - 16, SP[1] - 38, 96), (SP[0] - 10, SP[1] - 38, 86), (SP[0] - 16, SP[1] - 38, 74)],
                                   [(SP[0] + 8, SP[1] - 28, 160), (SP[0] + 13, SP[1] - 28, 150)]], CRACK, WHITE_LT, w=1.8)
    chipped_cracks(rig, "crack2", [[(SP[0] - 24, SP[1] - 40, 44), (SP[0] - 18, SP[1] - 40, 34), (SP[0] - 24, SP[1] - 40, 24)],
                                   [(SP[0] + 16, SP[1] - 32, 110), (SP[0] + 21, SP[1] - 32, 100)]], CRACK, WHITE_LT, w=1.8)
    chipped_cracks(rig, "crack3", [[(SP[0] - 6, SP[1] - 22, 214), (SP[0] - 1, SP[1] - 22, 204), (SP[0] - 6, SP[1] - 22, 192)],
                                   [(SP[0] + 22, SP[1] - 38, 44), (SP[0] + 27, SP[1] - 38, 34)]], CRACK, WHITE_LT, w=1.8)
    _windows(rig)
    _damage(rig)
    rubble(rig, "rubble1", [(-158, -40), (-136, -48)], CHAR_LT, seed=3)
    rubble(rig, "rubble2", [(-96, -54), (-64, -58)], WHITE, seed=13)
    rubble(rig, "rubble3", [(-152, -58), (-120, -60), (18, -56)], CHAR_LT, seed=23, size=1.2)

    flag(rig, "root", "flagA", (SP[0] - 24, SP[1] + 6, 290), length=30, height=16, pole=210, pole_color=TRIM, finial=MINT)
    flag(rig, "root", "flagB", (-150, 34, 140), length=24, height=14, pole=14, pole_color=TRIM, finial=MINT)

    # Treasury
    g = Geo()
    for k, x in enumerate((-160, -150, -140)):
        cyl(g, (x, -58, 0), (x, -58, 18 - k * 2), 4.2, bevel=0.8)
    rig.part("treasury1", g, CHAR_LT)
    g = Geo()
    for k, x in enumerate((-160, -150, -140)):
        cyl(g, (x, -62.4, 4), (x, -62.4, 14 - k * 2), 1.4, bevel=0.3)
    rig.part("treasury1", g, glow=MINT, outline=0)
    g = Geo()
    for dx, h, a in ((0, 22, 0), (-6, 15, -18), (6, 17, 20), (-2, 11, -40), (9, 10, 42)):
        g.lathe([(0, 0), (3.4, 2), (3.4, h - 5), (0, h)], (-134 + dx, -62, 0),
                (-134 + dx + h * math.sin(math.radians(a)), -62, h * math.cos(math.radians(a))), segs=6)
    rig.part("treasury2", g, MAGENTA, finish="gloss", outline=0.6)
    g = Geo()
    box(g, (-106, -64, 10), (10, 10, 10), p=5, rot=(0, 0, 20))
    rig.part("treasury3", g, CHARCOAL, finish="metal")
    g = Geo()
    box(g, (-106, -64, 10), (10.6, 10.6, 1.4), p=5, rot=(0, 0, 20))
    rig.part("treasury3", g, glow=CYAN, outline=0)


PLASMA_OUT = "#C93A92"
PLASMA = "#F46BC0"
PLASMA_CORE = "#FFE3F3"
WIN = "#CFFFF0"
HOLE = "#16181E"


def front(z, dx=0.0, push=1.2):
    """A point on the spire's camera-facing surface at height z (x offset dx from the axis)."""
    r = radius_at(z)
    return (SP[0] + dx, SP[1] - math.sqrt(max(1.0, r * r - dx * dx)) - push, z)


def _jagged(cx, cz, rx, rz, n=11, seed=0, amp=0.28):
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        f = 1.0 + amp * (1 if (k + seed) % 2 else -1) * (0.6 + 0.4 * math.sin(k * 2.3 + seed))
        pts.append((cx + rx * f * math.cos(a), cz + rz * f * math.sin(a)))
    return pts


def plasma(rig, joint, spots):
    """Energy fire: magenta teardrop tongues with a pale core (outside the team hue bands)."""
    o, g, c = Geo(), Geo(), Geo()
    for x, y, z, k in spots:
        for dx, lean, r, h in ((0.0, 0.25, 6.0, 19.0), (-5.5, -0.35, 4.0, 12.0), (5.5, 0.45, 3.8, 10.0)):
            cx, cz = x + dx * k, z + h * 0.42 * k
            o.blob((cx, y + 2, cz), (r * 1.3 * k, r * 0.9 * k, h * 0.62 * k), p=2.0, taper=(1.0, 0.08),
                   shift=(lean * 1.2, 0.0))
            g.blob((cx, y, cz - 0.6 * k), (r * k, r * 0.7 * k, h * 0.5 * k), p=2.0, taper=(1.0, 0.1),
                   shift=(lean, 0.0))
            c.blob((cx, y - 2.5, cz - 2.4 * k), (r * 0.5 * k, r * 0.4 * k, h * 0.28 * k), p=2.0,
                   taper=(1.0, 0.2), shift=(lean * 0.6, 0.0))
    rig.part(joint, o, glow=PLASMA_OUT, outline=0)
    rig.part(joint, g, glow=PLASMA, outline=0)
    rig.part(joint, c, glow=PLASMA_CORE, outline=0)


def _windows(rig):
    """Lit window slits between the bands (ambient life); they go dark from stage 2."""
    g, d, fr = Geo(), Geo(), Geo()
    for z, dxs in ((78, (-26.0, 22.0)), (100, (-24.0, 20.0)), (150, (-18.0, 16.0)), (172, (-16.0, 14.0)),
                   (210, (-9.0,))):
        for dx in dxs:
            x, y, zz = front(z, dx, push=0.6)
            g.slab([(x - 2.0, zz - 5.5), (x + 2.0, zz - 5.5), (x + 2.0, zz + 5.5), (x - 2.0, zz + 5.5)], y, 1.0)
            fr.slab([(x - 3.4, zz - 7.0), (x + 3.4, zz - 7.0), (x + 3.4, zz + 7.0), (x - 3.4, zz + 7.0)], y + 0.5, 1.0)
    rig.part("body", fr, CHAR_LT, outline=0, highlight=False)
    rig.part("body", g, glow=WIN, outline=0)
    rig.joint("darkwin", "body", (0, 0, 0), hidden=True)
    for z, dxs in ((78, (-26.0, 22.0)), (150, (-18.0, 16.0)), (210, (-9.0,))):
        for dx in dxs:
            x, y, zz = front(z, dx, push=1.2)
            d.slab([(x - 2.3, zz - 5.8), (x + 2.3, zz - 5.8), (x + 2.3, zz + 5.8), (x - 2.3, zz + 5.8)], y, 1.0)
    rig.part("darkwin", d, "#2A2E36", outline=0, highlight=False)


def _damage(rig):
    """Crumble parts per stage (art plan: each stage reads at a glance).
    1: a chunk bitten out of the spire's side with sparking wires, the left fin lost;
    2: a plasma fire in the gap and scorch marks, the windows and the middle light ring gone dark,
       the tip knocked askew;
    3: a breach at the foot with a hanging cable and a second fire, the tip snapped off (a jagged
       stump with fire; the tip lies in the rubble)."""
    for j in ("notch", "sparks1", "fire1", "scorch", "ringdark", "breach", "fire2", "stump", "cable", "tipfallen"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    # 1: the bitten chunk (left side, between the lower and the middle band) and sparking wires
    x, y, z = front(146, -14.0, push=1.0)
    g = Geo().slab(_jagged(x, z, 17.0, 20.0, seed=1), y, 2.2)
    rig.part("notch", g, CHAR_LT, outline=0.6)
    g = Geo().slab(_jagged(x + 0.5, z - 0.5, 12.0, 14.5, seed=2), y - 1.4, 1.0)
    rig.part("notch", g, HOLE, outline=0, highlight=False)
    g = Geo()
    g.capsule((x - 2.0, y - 2.4, z + 3.0), (x + 4.0, y - 3.4, z - 6.0), 0.9)
    g.capsule((x + 2.0, y - 2.4, z + 1.0), (x - 3.0, y - 3.6, z - 8.0), 0.9)
    rig.part("notch", g, TRIM, finish="metal", outline=0.4)
    g = Geo().star((x + 5.4, y - 4.0, z - 9.0), 7.0, 2.4, 1.0, points=5, rot=(90, 0, 0))
    rig.part("sparks1", g, glow=MINT_CORE, outline=0.6, outline_hex=MINT)
    # 2: plasma fire out of the gap, soot, the middle glow ring dark, windows dark
    plasma(rig, "fire1", [(x, y - 3.0, z - 8.0, 1.5)])
    g = Geo()
    g.slab(_jagged(x + 2.0, z + 18.0, 8.0, 9.0, seed=3, amp=0.35), y + 0.4, 0.8)
    xx, yy, zz = front(58, 12.0, push=0.8)
    g.slab(_jagged(xx, zz + 8.0, 9.0, 7.0, seed=4, amp=0.3), yy, 0.8)
    rig.part("scorch", g, "#3E3F48", outline=0, highlight=False)
    r = radius_at(128)
    g = Geo()
    cyl(g, (SP[0], SP[1], 128 - 1.5), (SP[0], SP[1], 128 + 1.5), r + 3.6, bevel=0.3, segs=36)
    rig.part("ringdark", g, CHAR_LT, outline=0)
    # 3: a breach at the foot with a cable hanging out and fire, the tip snapped to a jagged stump
    bx, by, bz = front(40, 16.0, push=1.0)
    g = Geo().slab(_jagged(bx, bz, 20.0, 22.0, seed=5, amp=0.3), by, 2.4)
    rig.part("breach", g, CHAR_LT, outline=0.6)
    g = Geo().slab(_jagged(bx, bz - 1.0, 14.0, 16.0, seed=6, amp=0.3), by - 1.4, 1.0)
    rig.part("breach", g, HOLE, outline=0, highlight=False)
    g = Geo()
    g.capsule((bx - 4.0, by - 3.0, bz + 6.0), (bx + 6.0, by - 7.0, bz - 10.0), 1.6)
    g.capsule((bx + 6.0, by - 7.0, bz - 10.0), (bx + 10.0, by - 8.0, bz - 22.0), 1.4)
    rig.part("cable", g, CHARCOAL, outline=0.5)
    g = Geo().star((bx + 10.0, by - 9.5, bz - 23.0), 4.0, 1.5, 1.0, points=5, rot=(90, 0, 0))
    rig.part("cable", g, glow=MAGENTA_CORE, outline=0.6, outline_hex=MAGENTA)
    plasma(rig, "fire2", [(bx - 4.0, by - 4.0, bz - 12.0, 1.5)])
    zt = 16 + 224.0
    rt = radius_at(zt - 2) + 0.5
    pts = []
    for k in range(9):
        a = math.radians(-160 + 140 * k / 8)
        pts.append((SP[0] + rt * math.cos(a), zt + (5.0 if k % 2 else -3.0)))
    g = Geo().slab([(SP[0] - rt, zt - 8.0)] + pts + [(SP[0] + rt, zt - 8.0)], SP[1] - rt + 3.0, 3.0)
    rig.part("stump", g, WHITE, outline=0.6)
    plasma(rig, "stump", [(SP[0] + 2.0, SP[1] - rt - 1.0, zt - 4.0, 1.4)])
    g = Geo().lathe([(0, 0), (12, 0), (8, 30), (3, 56), (0, 62)], (18.0, -52.0, 10.0), (-40.0, -60.0, 16.0), segs=16)
    rig.part("tipfallen", g, WHITE_LT, finish="gloss")


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "fin": {"hide": True}, "rubble1": {"show": True},
                     "notch": {"show": True}, "sparks1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "fire1": {"show": True},
                     "scorch": {"show": True}, "ringdark": {"show": True}, "darkwin": {"show": True},
                     "sparks1": {"hide": True}, "tip": {"r": 12.0, "x": -4.0, "z": -6.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "tip": {"hide": True},
                     "breach": {"show": True}, "cable": {"show": True}, "fire2": {"show": True},
                     "stump": {"show": True}, "tipfallen": {"show": True}})
    return pose


MODULE = base_module(
    "future", "Spire", height=330, width=180, canvas=(470, 740), feet=(360, 690),
    build=build, crumble=crumble, mount_depth=DEPTHS,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-30, -44, 27), 3, 30), ((SP[0], SP[1] - 40, 56), 3, 30), ((SP[0], SP[1] - 32, 128), 2, 24),
            ((SP[0], SP[1] - 24, 196), 1, 20)],
    smoke=[((SP[0], SP[1], 244), 2), ((SP[0] - 20, -10, 90), 3), ((-40, -20, 30), 3)],
    horn=(-110, 350), yaw=BASE_YAW,
)
