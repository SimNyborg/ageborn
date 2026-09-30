"""Stone Age base: the Cave Hold (DESIGN A11 Bases).

A mossy crag that leans toward the lane with an overhang, a firelit cave behind a log palisade,
framed by two mammoth tusks. Four cut rock shelves zig-zag up the crag for the turret mounts
(common.BASE_MOUNTS): a boulder stack by the gate, a shelf in the face, a ledge under the overhang
and the summit. Team colour: hide banners on poles (waving flags) and a big painted hide on the
rock face. Crumble: chipped cracks and a lost chunk (75%), a broken, burning palisade, soot and
rubble (50%), the summit knocked askew with the top banner gone, the palisade down and fires on
the crag (25%).
Treasury: a berry basket and meat (1), a pile of furs (2), tusks and ochre stones (3).
"""
import random

from ageborn_art.geometry import Geo

from world.common import (BASE_YAW, SHADOW_DARK, base_module, chipped_cracks, cyl, flag, moss_drape, platform,
                          rock, rope)

STONE = "#8C7B68"
STONE_LT = "#A08E78"
STONE_DK = "#76685A"
STONE_DKR = "#655A4E"
MOSS = "#6E8B3D"
MOSS_LT = "#7E9A4A"
MOSS_DK = "#5C7534"
BONE = "#EDE3C8"
WOOD = "#7A5E44"
WOOD_DK = "#5E4836"
HIDE = "#A88A66"
OCHRE = "#C98A3D"
BERRY = "#8E3A5A"
MEAT = "#B87A6A"
FUR = "#8A6E52"
FIRE = "#FFC47A"
FIRE_CORE = "#FFF0CC"
FIRE_OUT = "#E9823A"
CRACK = "#3E362F"
CHIP = "#B2A08A"

DEPTHS = [-40, -24, -40, -24]
CAVE = (-104.0, -44.0)


def build(rig, M):
    for j, pos in (("top", (-104, 30, 236)), ("chunkA", (-120, -30, 150)), ("chunkB", (-150, -10, 100)),
                   ("pal", (-104, -60, 0))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "fire1", "fire2", "scorch"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    # damage fires (crumble 2+: the palisade burns; 3: the crag's shoulder too) and soot scorch
    for j, spots in (("fire1", [(-122, -66, 34, 1.0), (-94, -66, 30, 0.8), (-108, -70, 22, 0.6)]),
                     ("fire2", [(-150, -34, 118, 1.1), (-58, -30, 172, 0.9), (-132, -40, 96, 0.7)])):
        o, g, c = Geo(), Geo(), Geo()
        for x, y, z, k in spots:
            k *= 1.5
            for dx, dz, r, h in ((0, 0, 7.0, 22.0), (-6, -2, 4.6, 14.0), (6, -3, 4.2, 12.0)):
                o.lathe([(0, 0), (r * 1.25 * k, h * 0.2 * k), (r * 1.0 * k, h * 0.55 * k), (0, h * 1.18 * k)],
                        (x + dx * k, y + 2, z + dz * k - 1), segs=12)
                g.lathe([(0, 0), (r * k, h * 0.18 * k), (r * 0.82 * k, h * 0.5 * k), (0, h * k)],
                        (x + dx * k, y, z + dz * k), segs=12)
                c.lathe([(0, 0), (r * 0.5 * k, h * 0.14 * k), (r * 0.36 * k, h * 0.38 * k), (0, h * 0.62 * k)],
                        (x + dx * k, y - 3, z + dz * k), segs=10)
        rig.part(j, o, glow=FIRE_OUT, outline=0)
        rig.part(j, g, glow=FIRE, outline=0)
        rig.part(j, c, glow=FIRE_CORE, outline=0)
    g = Geo()
    for x, z, rx, rz in ((-118, 150, 16, 10), (-60, 96, 14, 9), (-150, 64, 12, 12), (-40, 184, 14, 7)):
        g.blob((x, -44, z), (rx, 3, rz), p=2.2)
    rig.part("scorch", g, "#4A423A", outline=0, highlight=False)

    # the crag: a wide foot, a body that leans toward the lane, an overhang and the summit
    g = Geo()
    rock(g, (-96, 18, 54), (84, 46, 58), seed=1, jag=0.12)
    rock(g, (-140, 24, 70), (30, 34, 70), seed=2)
    rig.part("body", g, STONE)
    g = Geo()
    rock(g, (-78, 14, 138), (62, 40, 50), seed=4, jag=0.14, rot=(0, -10, 0))
    rig.part("body", g, STONE_LT)
    g = Geo()
    # the overhang juts out over the lane side (it carries the third mount's ledge)
    rock(g, (-34, -8, 190), (44, 32, 22), seed=6, jag=0.12, rot=(0, -8, 0))
    rig.part("body", g, STONE)
    g = Geo()
    rock(g, (-30, -14, 170), (30, 22, 10), seed=16, jag=0.18)
    rig.part("body", g, STONE_DKR)
    # summit block, and a pinnacle behind it that tilts off at crumble 3
    g = Geo()
    rock(g, (-68, 8, 236), (46, 36, 32), seed=5, jag=0.14)
    rig.part("body", g, STONE)
    g = Geo()
    rock(g, (-70, 9, 243), (48, 38, 30), seed=5, jag=0.14)
    g.clip((0, 0, 254), (0, 0, -1))
    rig.part("body", g, MOSS, finish="hair")
    g = Geo()
    rock(g, (-104, 30, 262), (22, 18, 30), seed=15, jag=0.16, rot=(0, 12, 0))
    rig.part("top", g, STONE_LT)
    # moss caps on the ledges
    g = Geo()
    rock(g, (-78, 13, 144), (64, 42, 48), seed=4, jag=0.14, rot=(0, -10, 0))
    g.clip((0, 0, 172), (0, 0, -1))
    rig.part("body", g, MOSS_LT, finish="hair")
    g = Geo()
    rock(g, (-140, 23, 76), (32, 36, 70), seed=2)
    g.clip((0, 0, 124), (0, 0, -1))
    rig.part("body", g, MOSS, finish="hair")
    g = Geo()
    rock(g, (-34, -8, 194), (46, 34, 22), seed=6, jag=0.12, rot=(0, -8, 0))
    g.clip((0, 0, 204), (0, 0, -1))
    rig.part("body", g, MOSS_LT, finish="hair")
    moss_drape(rig, "body", [(-70, -26, 170, 30), (-112, -24, 164, 18), (-18, -38, 176, 16), (-148, -12, 124, 16),
                             (-88, -24, 232, 20)], MOSS_DK, seed=3)
    # strata: darker bands of flat stones on the foot
    g = Geo()
    rnd = random.Random(9)
    for x, z in ((-160, 30), (-138, 22), (-118, 36), (-72, 30), (-60, 60), (-140, 90), (-40, 100), (-120, 118)):
        rock(g, (x, -34 + rnd.uniform(-4, 2), z), (rnd.uniform(9, 14), 5, rnd.uniform(4, 6)), seed=int(x * z) % 97,
             jag=0.2, p=2.6)
    rig.part("body", g, STONE_DK)
    # chunks that break off
    g = Geo()
    rock(g, (-120, -28, 150), (16, 14, 14), seed=11, jag=0.2)
    rig.part("chunkA", g, STONE_DK)
    g = Geo()
    rock(g, (-150, -10, 104), (15, 14, 16), seed=12, jag=0.2)
    rig.part("chunkB", g, STONE_DK)

    # the cave: a dark mouth with firelight inside, a rim of darker stone
    cx, cy = CAVE
    g = Geo().blob((cx, cy + 12, 22), (26, 10, 36), p=2.2, cuts=5)
    g.clip((0, 0, 0.5), (0, 0, -1))
    rig.part("body", g, STONE_DKR)
    g = Geo().blob((cx, cy + 4, 20), (21, 8, 31), p=2.2, cuts=5)
    g.clip((0, 0, 0.5), (0, 0, -1))
    rig.part("body", g, SHADOW_DARK, highlight=False)
    g = Geo().blob((cx, cy - 4, 6), (13, 4, 11), p=2.0)
    rig.part("body", g, glow="#E8A868", outline=0)
    g = Geo().blob((cx, cy - 7, 4), (6, 3, 6), p=2.0)
    rig.part("body", g, glow=FIRE_CORE, outline=0)
    # mammoth tusks framing the cave
    for x0, s in ((cx - 28, -1), (cx + 26, 1)):
        pts = [(x0, cy - 14, 0), (x0 + 4 * s, cy - 16, 22), (x0 + 12 * s, cy - 16, 44), (x0 + 24 * s, cy - 14, 58),
               (x0 + 34 * s, cy - 12, 62)]
        g = Geo()
        for i, (a, b) in enumerate(zip(pts, pts[1:])):
            g.capsule(a, b, 5.2 - i * 1.1, 5.2 - (i + 1) * 1.1)
        rig.part("body", g, BONE)
    # skull over the cave
    g = Geo().blob((cx, cy - 12, 70), (9, 7, 8), p=2.3)
    g.blob((cx, cy - 16, 62), (5.5, 5, 4), p=2.3)
    rig.part("body", g, BONE)
    g = Geo().sphere((cx - 3.5, cy - 19.5, 70), 2.3, cuts=2).sphere((cx + 3.5, cy - 19.5, 70), 2.3, cuts=2)
    rig.part("body", g, SHADOW_DARK, outline=0, highlight=False)

    # log palisade in front of the cave
    def logs(joint, x0, x1, n, h0, seed):
        g = Geo()
        rnd = random.Random(seed)
        for i in range(n):
            x = x0 + (x1 - x0) * i / max(1, n - 1)
            h = h0 + rnd.uniform(-5, 5)
            g.capsule((x, -62, -2), (x, -62, h), 3.6, 3.2)
            g.lathe([(3.3, 0), (0.1, 6.0)], (x, -62, h), (x, -62, h + 6), segs=10)
        rig.part(joint, g, WOOD)
        rope_g = Geo()
        rope(rope_g, [(x0 - 3, -66, h0 * 0.35), (x1 + 3, -66, h0 * 0.35)], 0.9)
        rope(rope_g, [(x0 - 3, -66, h0 * 0.72), (x1 + 3, -66, h0 * 0.72)], 0.9)
        rig.part(joint, rope_g, "#B8A47E", outline=0.5)
    logs("pal", -146, -132, 3, 34, 7)

    # turret shelves (tops exactly at the mounts): a boulder stack at the gate, cut shelves above
    x0, y0, z0 = M[0]
    g = Geo()
    rock(g, (x0 - 6, y0 + 16, z0 * 0.45), (26, 24, z0 * 0.5), seed=21, jag=0.14)
    rock(g, (x0 + 10, y0 + 8, 12), (16, 14, 13), seed=22, jag=0.18)
    rig.part("body", g, STONE_DK)
    platform(rig, "body", M[0], STONE_LT, STONE_DK, style="rock", seed=30)
    platform(rig, "body", M[1], STONE_LT, STONE_DK, style="rock", seed=31, r=(26, 18))
    platform(rig, "body", M[2], STONE_LT, STONE_DKR, style="rock", seed=32, r=(26, 19))
    platform(rig, "body", M[3], STONE_LT, STONE_DK, style="rock", seed=33, r=(27, 20))
    moss_drape(rig, "body", [(M[1][0] - 4, M[1][1] - 16, M[1][2] - 3, 20), (M[2][0] - 8, M[2][1] - 16, M[2][2] - 4, 16)],
               MOSS_DK, seed=8)

    # torches at the cave
    for tx, tz in ((cx - 34, 40), (cx + 34, 44)):
        g = Geo().capsule((tx, -64, tz - 30), (tx, -64, tz), 1.6)
        g.lathe([(0.1, 0), (3.6, 3), (3.2, 7), (0.1, 7.5)], (tx, -64, tz - 1), (tx, -64, tz + 6), segs=10)
        rig.part("body", g, WOOD_DK, outline=0.6)
        g = Geo().blob((tx, -65, tz + 11), (3.8, 3.0, 6.8), p=2.0, taper=(1.0, 0.25))
        rig.part("body", g, glow=FIRE, outline=0)
        g = Geo().blob((tx, -67, tz + 9), (1.8, 1.5, 3.4), p=2.0, taper=(1.0, 0.3))
        rig.part("body", g, glow=FIRE_CORE, outline=0)

    # a big painted hide on the rock face (team) on two bone rods
    hx, hz = -138, 150
    g = Geo().slab([(hx - 16, hz + 26), (hx + 16, hz + 28), (hx + 20, hz), (hx + 12, hz - 22), (hx, hz - 28),
                    (hx - 13, hz - 22), (hx - 19, hz)], -30, 2.0)
    rig.part("body", g, team=True)
    g = Geo().capsule((hx - 21, -31, hz + 26), (hx + 21, -31, hz + 30), 1.6).capsule((hx - 17, -31, hz - 22),
                                                                                    (hx + 17, -31, hz - 24), 1.2)
    rig.part("body", g, BONE, outline=0.6)
    g = Geo().blob((hx, -32.5, hz + 2), (7, 1.0, 7), p=2.0)
    rig.part("body", g, OCHRE, outline=0.5)

    # bones and pebbles on the ground
    g = Geo()
    for i, (x, y) in enumerate(((-160, -48), (-128, -66), (-76, -64), (26, -46))):
        rock(g, (x, y, 2), (6 + i, 5, 4), seed=40 + i, jag=0.2)
    rig.part("body", g, STONE_DK)

    # chipped cracks, shown per stage
    chipped_cracks(rig, "crack1", [[(-70, -40, 120), (-64, -40, 108), (-72, -40, 96), (-66, -40, 84)],
                                   [(-34, -42, 186), (-28, -42, 178), (-32, -42, 170)]], CRACK, CHIP)
    chipped_cracks(rig, "crack2", [[(-150, -30, 60), (-144, -30, 48), (-150, -30, 36)],
                                   [(-120, -38, 104), (-112, -38, 94), (-116, -38, 84), (-108, -38, 74)],
                                   [(-56, -40, 60), (-48, -40, 50), (-52, -40, 40)]], CRACK, CHIP)
    chipped_cracks(rig, "crack3", [[(-80, -24, 250), (-72, -24, 240), (-78, -24, 230)],
                                   [(-100, -36, 150), (-92, -36, 140), (-96, -36, 128), (-88, -36, 118)],
                                   [(-24, -42, 110), (-18, -42, 98), (-22, -42, 88)]], CRACK, CHIP)
    for j, pts in (("rubble1", [(-160, -44), (-140, -56)]), ("rubble2", [(-60, -64), (-128, -66), (-92, -70)]),
                   ("rubble3", [(-160, -62), (22, -62), (-80, -72), (-140, -70)])):
        g = Geo()
        for k, (x, y) in enumerate(pts):
            rock(g, (x, y, 3), (9, 7, 6), seed=sum(map(ord, j)) + k, jag=0.25)
            rock(g, (x + 8, y - 2, 2), (5, 4, 4), seed=sum(map(ord, j)) + 50 + k, jag=0.25)
        rig.part(j, g, STONE_DK)

    # flags (separate looping clips): hide banners on the summit's back and the left shoulder
    flag(rig, "root", "flagA", (-96, 24, 300), length=30, height=18, pole=250)
    flag(rig, "root", "flagB", (-146, 32, 196), length=24, height=15, pole=132)

    # Treasury props, in front of the crag's left foot
    g = Geo()
    cyl(g, (-156, -60, 0), (-156, -60, 12), 10, 12.5, bevel=1.2)
    rig.part("treasury1", g, WOOD, outline=0.8)
    g = Geo()
    for dx, dy, dz in ((-4, 0, 14), (3, -2, 15), (0, 3, 17), (5, 2, 13), (-6, -3, 12), (1, -5, 13)):
        g.sphere((-156 + dx, -60 + dy, dz), 3.4, cuts=2)
    rig.part("treasury1", g, BERRY, finish="gloss", outline=0.5)
    g = Geo().capsule((-156, -66, 5), (-144, -64, 11), 4.6).capsule((-144, -64, 11), (-140, -64, 13), 2.0)
    rig.part("treasury1", g, MEAT, outline=0.6)
    g = Geo().capsule((-138, -64, 12), (-135, -64, 14), 1.6)
    rig.part("treasury1", g, BONE, outline=0.5)
    g = Geo()
    rock(g, (-164, -40, 6), (13, 10, 7), seed=51, jag=0.12, p=2.4)
    rock(g, (-162, -42, 14), (10, 8, 5), seed=52, jag=0.12, p=2.4)
    rig.part("treasury2", g, FUR, finish="hair")
    g = Geo()
    rock(g, (-166, -38, 20), (7, 6, 4), seed=53, jag=0.1, p=2.4)
    rig.part("treasury2", g, HIDE, finish="hair")
    g = Geo()
    for x0 in (-66, -56):
        pts = [(x0, -72, 2), (x0 + 8, -72, 8), (x0 + 18, -72, 12), (x0 + 26, -70, 12)]
        for i, (a, b) in enumerate(zip(pts, pts[1:])):
            g.capsule(a, b, 2.8 - i * 0.6, 2.8 - (i + 1) * 0.6)
    rig.part("treasury3", g, BONE)
    g = Geo()
    for k, (x, z) in enumerate(((-76, 3), (-70, 4), (-73, 9))):
        rock(g, (x, -74, z), (3.6, 3, 3), seed=60 + k, jag=0.15)
    rig.part("treasury3", g, OCHRE, finish="gloss", outline=0.5)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "chunkA": {"hide": True}, "rubble1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "chunkB": {"hide": True}, "rubble2": {"show": True},
                     "pal": {"r": -14.0, "x": -3.0, "z": -3.0}, "fire1": {"show": True}, "scorch": {"show": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "fire2": {"show": True},
                     "top": {"r": 16.0, "x": -6.0, "z": -8.0}, "pal": {"r": -38.0, "x": -8.0, "z": -12.0}})
    return pose


MODULE = base_module(
    "stone", "Cave Hold", height=300, width=190, canvas=(460, 640), feet=(350, 590),
    build=build, crumble=crumble, mount_depth=DEPTHS,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((CAVE[0] - 34, -65, 52), 3, 22), ((CAVE[0] + 34, -65, 56), 2, 22), ((CAVE[0], CAVE[1] - 6, 8), 3, 30)],
    smoke=[((-70, 0, 256), 2), ((-120, -28, 150), 3), ((-150, -10, 104), 3)],
    horn=(-96, 316), yaw=BASE_YAW,
)
