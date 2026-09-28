"""Modern Age base: the Bunker (DESIGN A11 Bases).

Stepped concrete blocks with olive camouflage patches, dark firing slits, sandbag emplacements
at the turret mounts, a steel radio mast with a radar dish and a beacon on top. Team colour: a
painted stripe band, a roundel, and the flags. Crumble: cracks and a lost sandbag (75%), exposed
rebar, a knocked rail and rubble (50%), the mast bent and the top flag gone (25%).
Treasury: supply crates (1), fuel drums (2), a stack of ammo crates with a gold-banded case (3).
"""
from ageborn_art.geometry import Geo

from world.common import BASE_YAW, base_module, box, cracks, cyl, flag, rubble, window

CONCRETE = "#A29F96"
CONCRETE_LT = "#B6B3A9"
CONCRETE_DK = "#86837B"
OLIVE = "#62664A"
OLIVE_LT = "#7C8060"
KHAKI = "#B8A67A"
GUNMETAL = "#3A3F45"
STEEL = "#8C949C"
SIGNAL = "#B0306A"
DRUM = "#5E6A5A"

CRACK = "#5C5A52"
MOUNTS = [(-8, -44), (-12, -86), (-26, -126), (-56, -170)]
MAST = (-108.0, 30.0)


def sandbags(g, cx, cy, z, w, rows=2, seed=0):
    for r in range(rows):
        n = int(w // 9)
        for k in range(n):
            x = cx - w / 2 + 4.5 + k * 9 + (4.5 if r % 2 else 0)
            if x > cx + w / 2 - 3:
                continue
            g.blob((x, cy, z + 3 + r * 5.4), (5.2, 4.2, 3.0), p=2.6)
    return g


def build(rig, M):
    for j, pos in (("mast", (MAST[0], MAST[1], 150)), ("bag", (-40, -52, 0))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "rebar"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    blocks = [((-78, 16, 30), (82, 52, 30)), ((-88, 22, 80), (62, 42, 20)), ((-98, 26, 122), (46, 34, 22))]
    for c, r in blocks:
        g = Geo()
        box(g, c, r, p=5.2, taper=(1.0, 0.94))
        rig.part("body", g, CONCRETE)
        g = Geo()
        box(g, (c[0], c[1], c[2] + r[2] - 1.5), (r[0] * 0.96 + 1.5, r[1] * 0.96 + 1.5, 3), p=5)
        rig.part("body", g, CONCRETE_LT)
    # camouflage patches on the front faces
    for x, z, w, h, y in ((-128, 20, 20, 12, -35.8), (-60, 44, 26, 10, -35.8), (-110, 84, 22, 9, -19.8), (-84, 128, 18, 10, -7.8)):
        g = Geo().slab([(x - w, z), (x - w * 0.3, z - h), (x + w * 0.6, z - h * 0.8), (x + w, z + h * 0.2),
                        (x + w * 0.2, z + h), (x - w * 0.6, z + h * 0.9)], y, 1.0)
        rig.part("body", g, OLIVE_LT, outline=0)
    # firing slits
    for x, z, y in ((-120, 44, -36.2), (-86, 44, -36.2), (-116, 88, -20.2), (-94, 128, -8.2)):
        g = Geo()
        box(g, (x, y, z), (12, 1.2, 2.4), p=4, cuts=2)
        rig.part("body", g, "#22252A", outline=0, highlight=False)
        g = Geo()
        box(g, (x, y - 0.4, z - 0.6), (9, 0.6, 0.9), p=4, cuts=2)
        rig.part("body", g, glow="#E8E0B8", outline=0)
    # team stripe band and roundel
    g = Geo().slab([(-156, 36), (-4, 36), (-2, 28), (-158, 28)], -36.4, 1.2)
    rig.part("body", g, team=True)
    g = Geo()
    cyl(g, (-58, -36.5, 70), (-58, -38.5, 70), 9, bevel=0.3)
    rig.part("body", g, team=True)
    g = Geo()
    cyl(g, (-58, -38.2, 70), (-58, -39.6, 70), 4.2, bevel=0.2)
    rig.part("body", g, "#EDEAE0", outline=0.4)
    # steel door
    g = Geo()
    box(g, (-28, -37, 18), (11, 1.8, 18), p=6)
    rig.part("body", g, GUNMETAL, finish="metal")
    g = Geo()
    box(g, (-20, -39.2, 18), (1.2, 1.0, 3.5), p=4, cuts=2)
    rig.part("body", g, STEEL, finish="metal", outline=0.3)

    # radio mast with radar dish and beacon
    g = Geo()
    cyl(g, (MAST[0], MAST[1], 140), (MAST[0], MAST[1], 262), 3.2, 2.0, bevel=0.4)
    for z in (170, 200, 230):
        cyl(g, (MAST[0], MAST[1], z - 1), (MAST[0], MAST[1], z + 1), 5.2, bevel=0.3)
    rig.part("mast", g, STEEL, finish="metal", outline=0.6)
    g = Geo()
    for dx in (-14, 14):
        g.capsule((MAST[0] + dx, MAST[1], 144), (MAST[0], MAST[1], 210), 1.0)
    rig.part("mast", g, GUNMETAL, finish="metal", outline=0.4)
    g = Geo().lathe([(0, 0), (6, 0.4), (12, 2.4), (15, 5.4), (14.2, 5.8), (0, 2.0)], (MAST[0] + 4, MAST[1] - 6, 222),
                    (MAST[0] + 10, MAST[1] - 12, 219), segs=22)
    rig.part("mast", g, CONCRETE_LT, finish="gloss", outline=0.6)
    g = Geo().sphere((MAST[0], MAST[1], 266), 3.2, cuts=3)
    rig.part("mast", g, glow="#F2A0C8", outline=0.6, outline_hex=SIGNAL)

    # sandbag emplacements at the mounts
    for i, (x, y, z) in enumerate(M):
        g = Geo()
        box(g, (x - 2, y + 6, z - 3), (17, 14, 3), p=6)
        rig.part("body", g, CONCRETE_DK)
        g = Geo()
        box(g, (x - 4, y + 10, z - 13), (10, 10, 8), p=5, taper=(0.8, 1.0))
        rig.part("body", g, CONCRETE_DK)
        g = Geo()
        sandbags(g, x - 2, y - 7, z - 6, 32, rows=1)
        rig.part("bag" if i == 0 else "body", g, KHAKI, finish="hair")

    # sandbag wall at the gate
    g = Geo()
    sandbags(g, 0, -56, 0, 30, rows=3)
    rig.part("body", g, KHAKI, finish="hair")

    for x, z in ((-150, 64), (-46, 64)):
        g = Geo()
        box(g, (x, -40, z), (4.5, 3.5, 3), p=4, cuts=2)
        rig.part("body", g, GUNMETAL, finish="metal", outline=0.5)
        g = Geo().blob((x, -43.5, z), (3.6, 0.8, 2.2), p=2.0)
        rig.part("body", g, glow="#FFF6DE", outline=0)

    g = Geo()
    for x in (-70, -64, -58):
        g.capsule((x, -36, 50), (x + 4, -42, 62), 0.7)
    rig.part("rebar", g, "#6E5A4A", outline=0.3)
    cracks(rig, "crack1", [(-110, -36.5, 60, 20, 12), (-70, -20.5, 94, -15, 10)], CRACK)
    cracks(rig, "crack2", [(-140, -36.5, 24, -25, 12), (-60, -36.5, 54, 15, 14), (-96, -8.5, 136, 30, 10)], CRACK)
    cracks(rig, "crack3", [(-40, -36.5, 20, 10, 14), (-124, -20.5, 76, -30, 12), (-110, -8.5, 120, 10, 10)], CRACK)
    rubble(rig, "rubble1", [(-156, -56), (-126, -62)], CONCRETE_DK, seed=3)
    rubble(rig, "rubble2", [(-86, -62), (-54, -66)], CONCRETE_DK, seed=13)
    rubble(rig, "rubble3", [(-146, -68), (-110, -70), (-26, -70)], CONCRETE_DK, seed=23, size=1.2)

    flag(rig, "root", "flagA", (-60, 20, 196), length=30, height=17, pole=144, pole_color=STEEL, finial=STEEL)
    flag(rig, "root", "flagB", (-150, 26, 124), length=24, height=14, pole=60, pole_color=STEEL, finial=STEEL)

    # Treasury
    g = Geo()
    box(g, (-150, -62, 8), (9, 8, 8), p=6)
    box(g, (-146, -60, 22), (7, 6, 6), p=6)
    rig.part("treasury1", g, OLIVE)
    g = Geo()
    for x, z in ((-150, 8), (-146, 22)):
        box(g, (x, -70.5, z), (5, 0.6, 1.4), p=4, cuts=2)
    rig.part("treasury1", g, KHAKI, outline=0.3)
    for k, x in enumerate((-128, -116)):
        g = Geo()
        cyl(g, (x, -64, 0), (x, -64, 20), 6.4, bevel=0.8)
        rig.part("treasury2", g, DRUM, finish="gloss")
        g = Geo()
        for z in (5, 15):
            cyl(g, (x, -64, z - 0.8), (x, -64, z + 0.8), 6.8, bevel=0.2)
        rig.part("treasury2", g, GUNMETAL, finish="metal", outline=0.3)
    g = Geo()
    box(g, (-94, -66, 6), (11, 7, 6), p=6)
    box(g, (-94, -66, 18), (9, 6, 5.5), p=6)
    rig.part("treasury3", g, OLIVE_LT)
    g = Geo()
    box(g, (-94, -66, 29), (8, 5, 4), p=6)
    rig.part("treasury3", g, GUNMETAL, finish="metal")
    g = Geo()
    box(g, (-94, -71.2, 29), (8.2, 0.6, 1.2), p=4, cuts=2)
    rig.part("treasury3", g, "#D4A437", finish="metal", outline=0.3)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "bag": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "rebar": {"show": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "mast": {"r": 18.0, "x": -3.0}})
    return pose


MODULE = base_module(
    "modern", "Bunker", height=280, width=158, canvas=(420, 560), feet=(310, 520), mounts=MOUNTS,
    build=build, crumble=crumble,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-150, -46, 64), 3, 18), ((-46, -46, 64), 3, 18), ((MAST[0], MAST[1], 266), 2, 14)],
    smoke=[((-98, 10, 146), 2), ((-60, -30, 60), 3), ((-130, -10, 100), 3)],
    horn=(-87, 226), yaw=BASE_YAW,
)
