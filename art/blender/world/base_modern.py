"""Modern Age base: the Bunker (DESIGN A11 Bases).

A sloped concrete glacis with firing slits, an upper casemate under a draped camouflage net, a
square observation tower at the lane edge, a command block and a heavy lattice radar mast with a
big dish and a beacon. The turret mounts (common.BASE_MOUNTS) are sandbagged gun pits: on a
pillbox by the gate, on the casemate, on top of the observation tower and on the command block.
Team colour: a painted stripe band, a roundel and the flags. Crumble: cracks and a lost sandbag
(75%), exposed rebar, a knocked rail and rubble (50%), the mast bent and the top flag gone (25%).
Treasury: supply crates (1), fuel drums (2), a stack of ammo crates with a gold-banded case (3).
"""
import math

from ageborn_art.geometry import Geo

from world.common import BASE_YAW, base_module, box, chipped_cracks, cyl, flag, platform, rock, rubble

CONCRETE = "#A29F96"
CONCRETE_LT = "#B6B3A9"
CONCRETE_DK = "#86837B"
CONCRETE_DKR = "#74716A"
OLIVE = "#62664A"
OLIVE_LT = "#7C8060"
KHAKI = "#B8A67A"
GUNMETAL = "#3A3F45"
STEEL = "#8C949C"
SIGNAL = "#B0306A"
DRUM = "#5E6A5A"
CRACK = "#4C4A44"

DEPTHS = [-40, -24, -40, -24]
OT = (-8.0, -22.0, 16.0, 188.0)       # observation tower: x, y, half size, height
CB = (-80.0, 8.0, 30.0, 252.0)        # command block
MAST = (-146.0, 38.0)


def sandbags(g, cx, cy, z, w, rows=2):
    for r in range(rows):
        n = int(w // 9)
        for k in range(n):
            x = cx - w / 2 + 4.5 + k * 9 + (4.5 if r % 2 else 0)
            if x > cx + w / 2 - 3:
                continue
            g.blob((x, cy, z + 3 + r * 5.4), (5.2, 4.2, 3.0), p=2.6)
    return g


def slit(rig, joint, x, y, z, w=12):
    g = Geo()
    box(g, (x, y, z + 3.2), (w + 2, 3.2, 1.4), p=4, cuts=2)
    rig.part(joint, g, CONCRETE_LT, outline=0.5)
    g = Geo()
    box(g, (x, y + 0.4, z), (w, 1.2, 2.4), p=4, cuts=2)
    rig.part(joint, g, "#1E2126", outline=0, highlight=False)


def build(rig, M):
    for j, pos in (("mast", (MAST[0], MAST[1], 110)), ("bag", (M[0][0], M[0][1], M[0][2]))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "rebar"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    # the glacis: a long sloped concrete front, and the casemate above it
    g = Geo()
    box(g, (-84, 18, 26), (84, 58, 26), p=6, taper=(1.0, 0.72))
    rig.part("body", g, CONCRETE)
    g = Geo()
    box(g, (-86, 18, 50), (62, 42, 3), p=5)
    rig.part("body", g, CONCRETE_LT)
    g = Geo()
    box(g, (-104, 24, 80), (60, 38, 28), p=5.2, taper=(1.0, 0.9))
    rig.part("body", g, CONCRETE_DK)
    g = Geo()
    box(g, (-104, 24, 106), (57, 36, 3), p=5)
    rig.part("body", g, CONCRETE_LT)
    # form-work seams on the glacis and casemate
    g = Geo()
    for x in range(-156, -20, 26):
        box(g, (x, -26, 28), (0.7, 1.0, 20), p=4, cuts=2, rot=(-30, 0, 0))
    for x in range(-156, -50, 24):
        box(g, (x, -14.5, 80), (0.7, 0.8, 24), p=4, cuts=2)
    rig.part("body", g, CONCRETE_DKR, outline=0)
    # firing slits with concrete hoods
    for x, z, y in ((-140, 26, -30), (-104, 26, -30), (-68, 26, -30), (-140, 84, -15), (-104, 84, -15)):
        slit(rig, "body", x, y, z)
    # the camouflage net draped over the casemate's back
    g = Geo()
    rock(g, (-128, 34, 110), (44, 30, 10), seed=5, jag=0.25, p=2.4)
    g.clip((0, 0, 104), (0, 0, 1))
    rig.part("body", g, OLIVE, finish="hair")
    g = Geo()
    for k, (x, y, z) in enumerate(((-150, 18, 118), (-120, 12, 120), (-100, 30, 118), (-136, 40, 116))):
        rock(g, (x, y, z), (9, 7, 3), seed=70 + k, jag=0.3, p=2.2)
    rig.part("body", g, KHAKI, finish="hair", outline=0.4)
    g = Geo()
    for x in range(-166, -86, 14):
        g.capsule((x, 6, 116), (x + 6, -12, 100), 0.7)
    rig.part("body", g, OLIVE, outline=0.3)

    # team stripe band on the glacis and the roundel on the tower
    g = Geo().slab([(-160, 40), (-38, 40), (-36, 33), (-162, 33)], -33.2, 1.2)
    rig.part("body", g, team=True)
    ox, oy, oh, oH = OT
    g = Geo()
    cyl(g, (ox, oy - oh - 0.5, 130), (ox, oy - oh - 2.5, 130), 9, bevel=0.3)
    rig.part("body", g, team=True)
    g = Geo()
    cyl(g, (ox, oy - oh - 2.2, 130), (ox, oy - oh - 3.6, 130), 4.2, bevel=0.2)
    rig.part("body", g, "#EDEAE0", outline=0.4)

    # the observation tower at the lane edge (third mount)
    g = Geo()
    box(g, (ox, oy, oH / 2), (oh + 2, oh + 2, oH / 2), p=6, taper=(1.0, 0.86))
    rig.part("body", g, CONCRETE_LT)
    g = Geo()
    for z in (60, 120, oH - 3):
        box(g, (ox, oy, z), (oh + 3, oh + 3, 2.6), p=5)
    rig.part("body", g, CONCRETE_DK)
    slit(rig, "body", ox, oy - oh - 2.5, 160, 9)
    slit(rig, "body", ox, oy - oh - 3.5, 92, 9)
    # steel door at the tower foot
    g = Geo()
    box(g, (ox - 4, oy - oh - 3, 17), (9, 1.8, 17), p=6)
    rig.part("body", g, GUNMETAL, finish="metal")
    g = Geo()
    box(g, (ox + 2, oy - oh - 5, 17), (1.2, 1.0, 3.5), p=4, cuts=2)
    rig.part("body", g, STEEL, finish="metal", outline=0.3)

    # the command block (top mount), with a vision slit and an antenna
    cx, cy, ch, cH = CB
    g = Geo()
    box(g, (cx, cy, (100 + cH) / 2), (ch, ch, (cH - 100) / 2), p=6, taper=(1.0, 0.9))
    rig.part("body", g, CONCRETE)
    g = Geo()
    box(g, (cx, cy, cH - 2), (ch + 2.5, ch + 2.5, 3), p=5)
    rig.part("body", g, CONCRETE_LT)
    slit(rig, "body", cx - 4, cy - ch - 1, 214, 14)
    slit(rig, "body", cx - 4, cy - ch - 1, 160, 14)

    # the radar mast: a four-legged lattice, a big dish and a beacon
    mx, my = MAST
    g = Geo()
    for dx, dy in ((-12, -10), (12, -10), (-12, 12), (12, 12)):
        g.capsule((mx + dx, my + dy, 100), (mx + dx * 0.25, my + dy * 0.25, 300), 1.8, 1.2)
    for z in range(120, 300, 30):
        t = (z - 100) / 200
        w = 12 * (1 - t * 0.75)
        g.capsule((mx - w, my - w * 0.8, z), (mx + w, my - w * 0.8, z + 16), 0.9)
        g.capsule((mx + w, my - w * 0.8, z), (mx - w, my - w * 0.8, z + 16), 0.9)
    rig.part("mast", g, STEEL, finish="metal", outline=0.6)
    g = Geo()
    cyl(g, (mx, my, 296), (mx, my, 306), 6, bevel=0.6)
    rig.part("mast", g, GUNMETAL, finish="metal")
    g = Geo().lathe([(0, 0), (8, 0.6), (17, 3.4), (22, 8), (21, 8.6), (0, 3.0)], (mx + 6, my - 8, 300),
                    (mx + 14, my - 16, 296), segs=26)
    rig.part("mast", g, CONCRETE_LT, finish="gloss", outline=0.6)
    g = Geo().capsule((mx + 6, my - 8, 300), (mx + 20, my - 22, 294), 1.2)
    rig.part("mast", g, GUNMETAL, finish="metal", outline=0.4)
    g = Geo().sphere((mx, my, 312), 3.6, cuts=3)
    rig.part("mast", g, glow="#F2A0C8", outline=0.6, outline_hex=SIGNAL)

    # a pillbox at the gate carries the first gun pit
    x0, y0, z0 = M[0]
    g = Geo()
    box(g, (x0 - 6, y0 + 16, (z0 - 6) / 2), (26, 20, (z0 - 6) / 2), p=6, taper=(1.0, 0.88))
    rig.part("body", g, CONCRETE_DK)
    slit(rig, "body", x0 - 4, y0 - 4.5, z0 - 26, 10)
    # sandbagged gun pits at the mounts
    for i, m in enumerate(M):
        platform(rig, "bag" if i == 0 else "body", m, CONCRETE_LT, CONCRETE_DKR, style="sandbag", r=(25, 19),
                 accent=KHAKI)

    # sandbag wall at the gate
    g = Geo()
    sandbags(g, 26, -58, 0, 30, rows=3)
    rig.part("body", g, KHAKI, finish="hair")
    for x, z in ((-150, 64), (-60, 64)):
        g = Geo()
        box(g, (x, -26, z), (4.5, 3.5, 3), p=4, cuts=2)
        rig.part("body", g, GUNMETAL, finish="metal", outline=0.5)
        g = Geo().blob((x, -29.5, z), (3.6, 0.8, 2.2), p=2.0)
        rig.part("body", g, glow="#FFF6DE", outline=0)

    g = Geo()
    for x in (-84, -78, -72):
        g.capsule((x, -30, 20), (x + 4, -38, 32), 0.7)
    rig.part("rebar", g, "#6E5A4A", outline=0.3)
    chipped_cracks(rig, "crack1", [[(-126, -32, 40), (-120, -32, 30), (-126, -32, 20)],
                                   [(cx - 16, cy - ch - 1, 190), (cx - 10, cy - ch - 1, 180), (cx - 16, cy - ch - 1, 170)]],
                   CRACK, CONCRETE_LT)
    chipped_cracks(rig, "crack2", [[(-160, -32, 34), (-154, -32, 24), (-160, -32, 14)],
                                   [(-80, -32, 44), (-74, -32, 34), (-80, -32, 22)],
                                   [(ox + 4, oy - oh - 3, 110), (ox + 9, oy - oh - 3, 100), (ox + 4, oy - oh - 3, 88)]],
                   CRACK, CONCRETE_LT)
    chipped_cracks(rig, "crack3", [[(cx + 10, cy - ch - 1, 240), (cx + 15, cy - ch - 1, 230), (cx + 10, cy - ch - 1, 218)],
                                   [(-130, -16, 96), (-124, -16, 86), (-130, -16, 74)],
                                   [(ox - 6, oy - oh - 3, 170), (ox - 1, oy - oh - 3, 160)]], CRACK, CONCRETE_LT)
    rubble(rig, "rubble1", [(-160, -56), (-138, -62)], CONCRETE_DK, seed=3)
    rubble(rig, "rubble2", [(-106, -62), (-74, -66)], CONCRETE_DK, seed=13)
    rubble(rig, "rubble3", [(-150, -68), (-120, -70), (-46, -70)], CONCRETE_DK, seed=23, size=1.2)

    flag(rig, "root", "flagA", (cx - 20, cy + 20, 318), length=30, height=17, pole=cH, pole_color=STEEL, finial=STEEL)
    flag(rig, "root", "flagB", (-150, 30, 150), length=24, height=14, pole=60, pole_color=STEEL, finial=STEEL)

    # Treasury
    g = Geo()
    box(g, (-158, -64, 8), (9, 8, 8), p=6)
    box(g, (-154, -62, 22), (7, 6, 6), p=6)
    rig.part("treasury1", g, OLIVE)
    g = Geo()
    for x, z in ((-158, 8), (-154, 22)):
        box(g, (x, -72.5, z), (5, 0.6, 1.4), p=4, cuts=2)
    rig.part("treasury1", g, KHAKI, outline=0.3)
    for x in (-136, -124):
        g = Geo()
        cyl(g, (x, -66, 0), (x, -66, 20), 6.4, bevel=0.8)
        rig.part("treasury2", g, DRUM, finish="gloss")
        g = Geo()
        for z in (5, 15):
            cyl(g, (x, -66, z - 0.8), (x, -66, z + 0.8), 6.8, bevel=0.2)
        rig.part("treasury2", g, GUNMETAL, finish="metal", outline=0.3)
    g = Geo()
    box(g, (-106, -68, 6), (11, 7, 6), p=6)
    box(g, (-106, -68, 18), (9, 6, 5.5), p=6)
    rig.part("treasury3", g, OLIVE_LT)
    g = Geo()
    box(g, (-106, -68, 29), (8, 5, 4), p=6)
    rig.part("treasury3", g, GUNMETAL, finish="metal")
    g = Geo()
    box(g, (-106, -73.2, 29), (8.2, 0.6, 1.2), p=4, cuts=2)
    rig.part("treasury3", g, "#D4A437", finish="metal", outline=0.3)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "rebar": {"show": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "mast": {"r": 12.0, "x": -3.0}})
    return pose


MODULE = base_module(
    "modern", "Bunker", height=320, width=190, canvas=(470, 700), feet=(360, 650),
    build=build, crumble=crumble, mount_depth=DEPTHS,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-150, -32, 64), 3, 18), ((-60, -32, 64), 3, 18), ((MAST[0], MAST[1], 312), 2, 14)],
    smoke=[((CB[0], 10, 256), 2), ((-60, -30, 60), 3), ((-130, -10, 100), 3)],
    horn=(-100, 350), yaw=BASE_YAW,
)
