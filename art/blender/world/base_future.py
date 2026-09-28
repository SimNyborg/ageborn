"""Future Age base: the Spire (DESIGN A11 Bases).

A tall white spire on a charcoal plinth, ringed by glowing mint bands, with team-coloured light
panels, a magenta energy core at the gate and hovering disc platforms (on struts) for the
turret mounts. Team colour: the panels, the core's collar and the holo flags.
Crumble: cracked panels and a lost fin (75%), a broken strut and rubble (50%), the tip knocked
askew and the top flag gone (25%). Treasury: energy cells (1), a crystal cluster (2), a data
vault cube (3).
"""
import math

from ageborn_art.geometry import Geo

from world.common import BASE_YAW, base_module, box, cracks, cyl, flag, rubble

CHARCOAL = "#23262E"
CHAR_LT = "#3A3F4A"
WHITE = "#E9EDF2"
TRIM = "#A9B1BD"
MINT = "#3AF0B4"
MINT_CORE = "#D6FFF1"
MAGENTA = "#F03AA8"
MAGENTA_CORE = "#FFD6EE"
CYAN = "#29E3F5"

CRACK = "#8A93A0"
MOUNTS = [(-8, -45), (-10, -89), (-14, -133), (-56, -191)]
SP = (-84.0, 26.0)


def build(rig, M):
    for j, pos in (("tip", (SP[0], SP[1], 230)), ("fin", (SP[0] - 34, SP[1], 60)), ("strut", (0, 0, 0))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    # plinth
    g = Geo()
    cyl(g, (SP[0], SP[1], 0), (SP[0], SP[1], 16), 72, 66, bevel=2.0, segs=36, squash=(1.0, 0.72))
    rig.part("body", g, CHARCOAL)
    g = Geo()
    cyl(g, (SP[0], SP[1], 15), (SP[0], SP[1], 18), 64, bevel=0.6, segs=36, squash=(1.0, 0.72))
    rig.part("body", g, glow=MINT, outline=0)
    # the spire body (lower and upper halves; the tip can fall)
    g = Geo().lathe([(0, 0), (40, 0), (38, 40), (30, 110), (22, 170), (16, 214), (0, 214)], (SP[0], SP[1], 16),
                    (SP[0], SP[1], 240), segs=32)
    rig.part("body", g, WHITE, finish="gloss")
    g = Geo().lathe([(0, 0), (16, 0), (10, 40), (4, 70), (0, 78)], (SP[0], SP[1], 230), (SP[0], SP[1], 310), segs=24)
    rig.part("tip", g, WHITE, finish="gloss")
    g = Geo().sphere((SP[0], SP[1], 300), 4.2, cuts=3)
    rig.part("tip", g, glow=MAGENTA_CORE, outline=0.8, outline_hex=MAGENTA)
    # charcoal bands and mint glow rings
    for z, r in ((56, 36.6), (128, 27.6), (196, 18.6)):
        g = Geo()
        cyl(g, (SP[0], SP[1], z - 5), (SP[0], SP[1], z + 5), r + 2.5, bevel=1.0, segs=32)
        rig.part("body", g, CHAR_LT)
        g = Geo()
        cyl(g, (SP[0], SP[1], z - 1.2), (SP[0], SP[1], z + 1.2), r + 3.3, bevel=0.3, segs=32)
        rig.part("body", g, glow=MINT, outline=0)
    # team light panels on the spire's face
    for z0, z1, w0, w1 in ((66, 118, 13, 10), (138, 186, 9, 7)):
        y = SP[1] - (38 - (z0 - 16) * 0.12) - 4
        g = Geo().slab([(SP[0] - w0, z0), (SP[0] + w0, z0), (SP[0] + w1, z1), (SP[0] - w1, z1)], y + 8 - (z0 - 66) * 0.1, 1.6)
        rig.part("body", g, team=True)
    # side fins
    g = Geo().slab([(SP[0] - 34, 16), (SP[0] - 64, 16), (SP[0] - 44, 80), (SP[0] - 30, 110)], SP[1], 5)
    rig.part("fin", g, CHAR_LT)
    g = Geo().slab([(SP[0] + 34, 16), (SP[0] + 58, 16), (SP[0] + 40, 70), (SP[0] + 30, 100)], SP[1] + 6, 5)
    rig.part("body", g, CHAR_LT)
    # energy core at the gate
    g = Geo()
    cyl(g, (-18, -30, 0), (-18, -30, 14), 16, 13, bevel=1.2, segs=24)
    rig.part("body", g, CHARCOAL)
    g = Geo()
    cyl(g, (-18, -30, 13), (-18, -30, 17), 13.5, bevel=0.6, segs=24)
    rig.part("body", g, team=True)
    g = Geo().sphere((-18, -30, 27), 10, cuts=4)
    rig.part("body", g, glow=MAGENTA, outline=1.0, outline_hex="#8A1E60")
    g = Geo().sphere((-20, -38, 29), 5, cuts=3)
    rig.part("body", g, glow=MAGENTA_CORE, outline=0)
    g = Geo()
    for a in (-50, 50):
        g.capsule((-18 + 14 * math.sin(math.radians(a)), -30, 12), (-18 + 12 * math.sin(math.radians(a)), -30, 42), 2.0, 1.2)
    rig.part("body", g, TRIM, finish="metal", outline=0.5)

    # hovering disc platforms at the mounts, with struts to the spire
    for i, (x, y, z) in enumerate(M):
        g = Geo()
        cyl(g, (x - 1, y + 4, z - 5), (x - 1, y + 4, z), 17, 18, bevel=1.2, segs=28, squash=(1.0, 0.7))
        rig.part("body", g, CHAR_LT)
        g = Geo()
        cyl(g, (x - 1, y + 4, z - 7.5), (x - 1, y + 4, z - 5), 13, bevel=0.4, segs=28, squash=(1.0, 0.7))
        rig.part("body", g, glow=MINT, outline=0)
        g = Geo().capsule((x - 10, y + 8, z - 5), (SP[0] + 6, SP[1] - 10, z - 20), 2.2, 1.6)
        rig.part("strut" if i == 1 else "body", g, TRIM, finish="metal", outline=0.6)

    cracks(rig, "crack1", [(SP[0] - 16, SP[1] - 34, 90, 20, 12), (SP[0] + 10, SP[1] - 26, 150, -15, 10)], CRACK)
    cracks(rig, "crack2", [(SP[0] - 22, SP[1] - 36, 40, -25, 12), (SP[0] + 16, SP[1] - 30, 100, 15, 12)], CRACK)
    cracks(rig, "crack3", [(SP[0] - 6, SP[1] - 20, 200, 5, 12), (SP[0] + 22, SP[1] - 36, 40, -30, 12)], CRACK)
    rubble(rig, "rubble1", [(-150, -40), (-126, -48)], CHAR_LT, seed=3)
    rubble(rig, "rubble2", [(-80, -50), (-54, -54)], WHITE, seed=13)
    rubble(rig, "rubble3", [(-146, -58), (-110, -60), (6, -56)], CHAR_LT, seed=23, size=1.2)

    flag(rig, "root", "flagA", (SP[0] - 20, SP[1], 262), length=30, height=16, pole=190, pole_color=TRIM, finial=MINT)
    flag(rig, "root", "flagB", (-150, 30, 130), length=24, height=14, pole=14, pole_color=TRIM, finial=MINT)

    # Treasury
    g = Geo()
    for k, x in enumerate((-152, -142, -132)):
        cyl(g, (x, -58, 0), (x, -58, 18 - k * 2), 4.2, bevel=0.8)
    rig.part("treasury1", g, CHAR_LT)
    g = Geo()
    for k, x in enumerate((-152, -142, -132)):
        cyl(g, (x, -62.4, 4), (x, -62.4, 14 - k * 2), 1.4, bevel=0.3)
    rig.part("treasury1", g, glow=MINT, outline=0)
    g = Geo()
    for k, (dx, h, a) in enumerate(((0, 22, 0), (-6, 15, -18), (6, 17, 20), (-2, 11, -40), (9, 10, 42))):
        g.lathe([(0, 0), (3.4, 2), (3.4, h - 5), (0, h)], (-114 + dx, -62, 0),
                (-114 + dx + h * math.sin(math.radians(a)), -62, h * math.cos(math.radians(a))), segs=6)
    rig.part("treasury2", g, MAGENTA, finish="gloss", outline=0.6)
    g = Geo()
    box(g, (-88, -64, 10), (10, 10, 10), p=5, rot=(0, 0, 20))
    rig.part("treasury3", g, CHARCOAL, finish="metal")
    g = Geo()
    box(g, (-88, -64, 10), (10.6, 10.6, 1.4), p=5, rot=(0, 0, 20))
    rig.part("treasury3", g, glow=CYAN, outline=0)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "fin": {"hide": True}, "rubble1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "strut": {"hide": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "tip": {"r": 16.0, "x": -6.0, "z": -10.0}})
    return pose


MODULE = base_module(
    "future", "Spire", height=310, width=150, canvas=(420, 640), feet=(310, 600), mounts=MOUNTS,
    build=build, crumble=crumble,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-18, -40, 27), 3, 30), ((SP[0], SP[1] - 36, 56), 3, 30), ((SP[0], SP[1] - 28, 128), 2, 24),
            ((SP[0], SP[1] - 20, 196), 1, 20)],
    smoke=[((SP[0], SP[1], 232), 2), ((SP[0] - 20, -10, 90), 3), ((-40, -20, 30), 3)],
    horn=(-100, 330), yaw=BASE_YAW,
)
