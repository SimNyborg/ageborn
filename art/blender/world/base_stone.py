"""Stone Age base: the Cave Hold (DESIGN A11 Bases).

A mossy rock hill with a firelit cave behind a log palisade, framed by two mammoth tusks.
Four stone shelves step up the front face for the turret mounts. Team colour: hide banners
on poles (waving flags) and a big painted hide hung on the rock face.
Crumble: cracks and a lost chunk (75%), a broken palisade and rubble (50%), the top rock
knocked askew with the top banner gone and smoke (25%).
Treasury: a berry basket and meat (1), a pile of furs (2), tusks and ochre stones (3).
"""
from ageborn_art.geometry import Geo

from world.common import BASE_YAW, SHADOW_DARK, base_module, box, cyl, flag, rock, rope

STONE = "#8C7B68"
STONE_LT = "#9C8B76"
STONE_DK = "#77695A"
MOSS = "#6E8B3D"
MOSS_LT = "#7E9A4A"
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

CRACK = "#4E443B"
MOUNTS = [(-10, -64), (-14, -110), (-20, -154), (-30, -198)]


def build(rig, M):
    # crumble joints under body
    for j, pos in (("top", (-80, 10, 180)), ("chunkA", (-40, -20, 150)), ("chunkB", (-120, -10, 110)),
                   ("pal", (-40, -52, 0)), ("palB", (-12, -52, 0))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "smokeHole"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    # the rock mass
    g = Geo()
    rock(g, (-78, 16, 58), (82, 44, 64), seed=1, jag=0.12)
    rock(g, (-136, 22, 60), (34, 36, 62), seed=2)
    rock(g, (-30, 4, 34), (34, 32, 38), seed=3)
    rig.part("body", g, STONE)
    g = Geo()
    rock(g, (-84, 20, 124), (60, 40, 50), seed=4, jag=0.14)
    rig.part("body", g, STONE_LT)
    g = Geo()
    rock(g, (-86, 24, 180), (44, 34, 40), seed=5, jag=0.15)
    rig.part("top", g, STONE)
    # moss caps
    g = Geo()
    rock(g, (-86, 23, 186), (46, 36, 40), seed=5, jag=0.15)
    g.clip((0, 0, 198), (0, 0, -1))
    rig.part("top", g, MOSS, finish="hair")
    g = Geo()
    rock(g, (-84, 19, 130), (62, 42, 50), seed=4, jag=0.14)
    g.clip((0, 0, 156), (0, 0, -1))
    rig.part("body", g, MOSS_LT, finish="hair")
    g = Geo()
    rock(g, (-137, 21, 64), (36, 38, 62), seed=2)
    g.clip((0, 0, 108), (0, 0, -1))
    rig.part("body", g, MOSS, finish="hair")
    # chunks that break off
    g = Geo()
    rock(g, (-40, -12, 150), (18, 16, 16), seed=11, jag=0.2)
    rig.part("chunkA", g, STONE_DK)
    g = Geo()
    rock(g, (-122, -8, 108), (16, 14, 18), seed=12, jag=0.2)
    rig.part("chunkB", g, STONE_DK)

    # the cave: a dark mouth with firelight inside
    g = Geo().blob((-52, -26, 20), (24, 10, 34), p=2.2, cuts=5)
    g.clip((0, 0, 0.5), (0, 0, -1))
    rig.part("body", g, SHADOW_DARK, highlight=False)
    g = Geo().blob((-52, -33, 6), (14, 4, 12), p=2.0)
    rig.part("body", g, glow="#E8A868", outline=0)
    g = Geo().blob((-52, -36, 4), (7, 3, 7), p=2.0)
    rig.part("body", g, glow=FIRE_CORE, outline=0)
    # mammoth tusks framing the cave
    for x0, s in ((-80, -1), (-24, 1)):
        pts = [(x0, -42, 0), (x0 + 4 * s, -44, 22), (x0 + 12 * s, -44, 44), (x0 + 24 * s, -42, 58), (x0 + 34 * s, -40, 62)]
        g = Geo()
        for i, (a, b) in enumerate(zip(pts, pts[1:])):
            g.capsule(a, b, 5.2 - i * 1.1, 5.2 - (i + 1) * 1.1)
        rig.part("body", g, BONE)
    # skull over the cave
    g = Geo().blob((-52, -42, 72), (9, 7, 8), p=2.3)
    g.blob((-52, -46, 64), (5.5, 5, 4), p=2.3)
    rig.part("body", g, BONE)
    g = Geo().sphere((-55.5, -49.5, 72), 2.3, cuts=2).sphere((-48.5, -49.5, 72), 2.3, cuts=2)
    rig.part("body", g, SHADOW_DARK, outline=0, highlight=False)

    # log palisade in front of the cave (left part) and at the gate (right part)
    def logs(joint, x0, x1, n, h0, seed):
        g = Geo()
        import random
        rnd = random.Random(seed)
        for i in range(n):
            x = x0 + (x1 - x0) * i / max(1, n - 1)
            h = h0 + rnd.uniform(-5, 5)
            g.capsule((x, -54, -2), (x, -54, h), 3.6, 3.2)
            g.lathe([(3.3, 0), (0.1, 6.0)], (x, -54, h), (x, -54, h + 6), segs=10)
        rig.part(joint, g, WOOD)
        rope_g = Geo()
        rope(rope_g, [(x0 - 3, -58, h0 * 0.35), (x1 + 3, -58, h0 * 0.35)], 0.9)
        rope(rope_g, [(x0 - 3, -58, h0 * 0.72), (x1 + 3, -58, h0 * 0.72)], 0.9)
        rig.part(joint, rope_g, "#B8A47E", outline=0.5)
    logs("pal", -96, -74, 4, 34, 7)
    logs("palB", -6, 12, 3, 40, 8)

    # stone shelves for the turret mounts (tops exactly at the mounts)
    for i, (x, y, z) in enumerate(M):
        g = Geo()
        rock(g, (x - 1, y + 2, z - 4), (17, 14, 4.2), seed=20 + i, jag=0.08, p=3.2)
        rig.part("body", g, STONE_LT)
        g = Geo()
        rock(g, (x - 6, y + 10, z - 14), (10, 10, 10), seed=30 + i, jag=0.18)
        rig.part("body", g, STONE_DK)

    # torches
    for tx, tz in ((-88, 40), (-14, 44)):
        g = Geo().capsule((tx, -56, tz - 30), (tx, -56, tz), 1.6)
        g.lathe([(0.1, 0), (3.6, 3), (3.2, 7), (0.1, 7.5)], (tx, -56, tz - 1), (tx, -56, tz + 6), segs=10)
        rig.part("body", g, WOOD_DK, outline=0.6)
        g = Geo().blob((tx, -57, tz + 11), (3.8, 3.0, 6.8), p=2.0, taper=(1.0, 0.25))
        rig.part("body", g, glow=FIRE, outline=0)
        g = Geo().blob((tx, -59, tz + 9), (1.8, 1.5, 3.4), p=2.0, taper=(1.0, 0.3))
        rig.part("body", g, glow=FIRE_CORE, outline=0)

    # a big painted hide on the rock face (team) on two bone rods
    g = Geo().slab([(-128, 96), (-98, 100), (-94, 70), (-100, 50), (-113, 44), (-126, 50), (-132, 70)], -26, 2.0)
    rig.part("body", g, team=True)
    g = Geo().capsule((-134, -27, 98), (-92, -27, 102), 1.6).capsule((-130, -27, 52), (-96, -27, 50), 1.2)
    rig.part("body", g, BONE, outline=0.6)
    g = Geo().blob((-113, -28.5, 74), (7, 1.0, 7), p=2.0)
    rig.part("body", g, OCHRE, outline=0.5)

    # bones and pebbles on the ground
    g = Geo()
    for i, (x, y) in enumerate(((-140, -48), (-110, -58), (-6, -62), (8, -46))):
        rock(g, (x, y, 2), (6 + i, 5, 4), seed=40 + i, jag=0.2)
    rig.part("body", g, STONE_DK)

    # cracks (shown per stage): dark wedges half sunk into the rock face
    for j, specs in (("crack1", [(-70, -26, 104, 30), (-60, -26, 90, -20)]),
                     ("crack2", [(-112, -22, 70, 25), (-30, -24, 30, -35), (-96, -18, 150, 10)]),
                     ("crack3", [(-82, -8, 186, -30), (-128, -18, 36, 40), (-46, -26, 60, 15)])):
        g = Geo()
        for x, y, z, rot in specs:
            g.blob((x, y, z), (2.2, 6, 17), p=2.0, rot=(0, rot, 0))
            g.blob((x + 4, y, z - 14), (1.6, 6, 8), p=2.0, rot=(0, rot - 40, 0))
        rig.part(j, g, CRACK, outline=0, highlight=False)
    # rubble piles
    for j, pts in (("rubble1", [(-150, -44), (-128, -50)]), ("rubble2", [(-30, -58), (-100, -60), (-66, -62)]),
                   ("rubble3", [(-150, -62), (-4, -66), (-84, -68), (-120, -66)])):
        g = Geo()
        for k, (x, y) in enumerate(pts):
            rock(g, (x, y, 3), (9, 7, 6), seed=sum(map(ord, j)) + k, jag=0.25)
            rock(g, (x + 8, y - 2, 2), (5, 4, 4), seed=sum(map(ord, j)) + 50 + k, jag=0.25)
        rig.part(j, g, STONE_DK)

    # flags (separate looping clips): hide banners
    flag(rig, "root", "flagA", (-66, 12, 236), length=30, height=18, pole=196)
    flag(rig, "root", "flagB", (-128, 26, 186), length=24, height=15, pole=132)

    # Treasury props, in front of the rock's back corner
    g = Geo()
    cyl(g, (-122, -58, 0), (-122, -58, 12), 10, 12.5, bevel=1.2)
    rig.part("treasury1", g, WOOD, outline=0.8)
    g = Geo()
    for dx, dy, dz in ((-4, 0, 14), (3, -2, 15), (0, 3, 17), (5, 2, 13), (-6, -3, 12), (1, -5, 13)):
        g.sphere((-122 + dx, -58 + dy, dz), 3.4, cuts=2)
    rig.part("treasury1", g, BERRY, finish="gloss", outline=0.5)
    g = Geo().capsule((-104, -60, 5), (-92, -58, 11), 4.6).capsule((-92, -58, 11), (-88, -58, 13), 2.0)
    rig.part("treasury1", g, MEAT, outline=0.6)
    g = Geo().capsule((-86, -58, 12), (-83, -58, 14), 1.6)
    rig.part("treasury1", g, BONE, outline=0.5)
    g = Geo()
    rock(g, (-146, -52, 6), (15, 11, 7), seed=51, jag=0.12, p=2.4)
    rock(g, (-144, -54, 14), (11, 9, 5), seed=52, jag=0.12, p=2.4)
    rig.part("treasury2", g, FUR, finish="hair")
    g = Geo()
    rock(g, (-150, -50, 20), (8, 7, 4), seed=53, jag=0.1, p=2.4)
    rig.part("treasury2", g, HIDE, finish="hair")
    g = Geo()
    for x0, s in ((-110, 1), (-100, 1)):
        pts = [(x0, -66, 2), (x0 + 8 * s, -66, 8), (x0 + 18 * s, -66, 12), (x0 + 26 * s, -64, 12)]
        for i, (a, b) in enumerate(zip(pts, pts[1:])):
            g.capsule(a, b, 2.8 - i * 0.6, 2.8 - (i + 1) * 0.6)
    rig.part("treasury3", g, BONE)
    g = Geo()
    for k, (x, z) in enumerate(((-132, 3), (-126, 4), (-129, 9))):
        rock(g, (x, -68, z), (3.6, 3, 3), seed=60 + k, jag=0.15)
    rig.part("treasury3", g, OCHRE, finish="gloss", outline=0.5)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "chunkA": {"hide": True}, "rubble1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "chunkB": {"hide": True}, "rubble2": {"show": True},
                     "pal": {"r": -14.0, "x": -3.0, "z": -3.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True},
                     "top": {"r": 12.0, "x": -4.0, "z": -12.0}, "palB": {"r": 22.0, "z": -4.0},
                     "pal": {"r": -24.0, "x": -5.0, "z": -6.0}})
    return pose


MODULE = base_module(
    "stone", "Cave Hold", height=236, width=160, canvas=(400, 500), feet=(300, 456), mounts=MOUNTS,
    build=build, crumble=crumble,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7}],
    lights=[((-88, -57, 52), 3, 22), ((-14, -57, 56), 2, 22), ((-52, -36, 8), 3, 30)],
    smoke=[((-86, 0, 196), 2), ((-40, -20, 150), 3), ((-122, -10, 110), 3)],
    horn=(-70, 256), yaw=BASE_YAW,
)
