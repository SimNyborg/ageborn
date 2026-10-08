"""Collapse kits of the bases (DESIGN A11 destroyed collapse): per age, the 3D debris a falling base
throws and the rubble heaps its ruin settles into, in the base's own materials and palette.

The game cuts the base frame itself into the big tumbling pieces at runtime (src/visuals/adapters/
world/collapse); these sheets add what a frame cannot: small solid debris with real shading and
outlines (boulders and logs, sandstone blocks, masonry and timber, cannonballs and barrel staves,
bricks, girders and cogs, concrete slabs with rebar and sandbags, hull panels and glowing crystal),
two rubble heaps for the ruin, and a torn team banner scrap that flutters down.

Sheet contract (`public/art/bases/<age>.collapse.{png,json}`, `.hd` at 2.46 px/lu):

| Clip    | Frames | Content |
|---------|--------|---------|
| `piece` | 8      | one debris piece each, centred on the anchor (the game spins them about it) |
| `heap`  | 2      | a wide and a narrow rubble heap, centred on the anchor (the game seats the bottom edge on the ground) |
| `rag`   | 1      | a torn banner scrap, team coloured (`rag_team`) |

Run: `<venv>/bin/python art/blender/world/render_collapse.py --out <scratch> [--only stone,medieval]`.
"""
import math
import random
from types import SimpleNamespace

from ageborn_art.anim import Clip
from ageborn_art.geometry import Geo

from world.common import BASE_YAW, box, cyl, rock

PIECES = 8
HEAPS = 2

# -- palettes (the bases' own large-area colours, world/base_<age>.py) ---------------------------
P = {
    "stone": dict(stone="#8C7B68", stone_lt="#A08E78", stone_dk="#76685A", moss="#6E8B3D", moss_lt="#7E9A4A",
                  wood="#7A5E44", wood_dk="#5E4836", bone="#EDE3C8"),
    "bronze": dict(sand="#CDBE9E", sand_lt="#DCCFB2", sand_dk="#B0A282", verd="#4F8F7F", bronze="#B09C78",
                   wood="#8E7658", wood_dk="#5E4C3C", clay="#B98A66"),
    "medieval": dict(stone="#9A9C98", stone_lt="#AEB0AA", stone_dk="#7C7F80", mortar="#5E6166", wood="#7A5E44",
                     wood_dk="#5A4634", iron="#4A4E56", slate="#6B7682"),
    "gunpowder": dict(sand="#B8A88A", sand_lt="#CABB9C", sand_dk="#9A8C72", wood="#4A3B2E", wood_lt="#7A6652",
                      iron="#3C3F45", brass="#C9A227", earth="#857860"),
    "industrial": dict(brick="#8A6A63", brick_lt="#9C7C74", brick_dk="#735852", mortar="#B9AFA2", iron="#5B6168",
                       iron_lt="#767D86", iron_dk="#454A51", coal="#2B2A2E", copper="#B06A3B", slate="#403F45"),
    "modern": dict(concrete="#A29F96", concrete_lt="#B6B3A9", concrete_dk="#86837B", rebar="#6E5446",
                   olive="#62664A", khaki="#B8A67A", steel="#8C949C", gunmetal="#3A3F45"),
    "future": dict(white="#BFC4CB", white_lt="#CED3D9", charcoal="#23262E", char_lt="#3A3F4A", trim="#8E97A4",
                   mint="#3AF0B4", mint_core="#D6FFF1"),
    "cosmic": dict(armor="#C9C3DD", armor_lt="#D8D3EA", hull="#3A2D56", hull_lt="#4B3B6E", seam="#1E1630",
                   plasma="#B77BFF", plasma_core="#F4EAFF"),
}


# -- shared debris shapes -----------------------------------------------------------------------
def boulder(rig, j, r, color, seed, cap=None, jag=0.18):
    g = Geo()
    rock(g, (0, 0, 0), r, seed=seed, jag=jag)
    rig.part(j, g, color)
    if cap:
        # a moss patch over one shoulder (a tilted cut of a slightly larger lump, not a flat lid)
        g = Geo()
        rock(g, (r[0] * 0.15, 0, r[2] * 0.1), (r[0] * 1.05, r[1] * 1.06, r[2] * 1.02), seed=seed, jag=jag)
        g.clip((r[0] * 0.1, 0, r[2] * 0.35), (-0.45, 0.0, -0.9))
        rig.part(j, g, cap, finish="hair")


def block(rig, j, r, color, rot=(0, 0, 0), chip=None, seed=0):
    """A cut stone or brick: a rounded box with a knocked-off corner."""
    g = Geo()
    box(g, (0, 0, 0), r, p=6, rot=rot)
    if chip:
        rnd = random.Random(seed)
        g.clip((r[0] * 0.55, 0, r[2] * 0.4), (0.7, rnd.uniform(-0.2, 0.2), 0.7))
    rig.part(j, g, color)


def beam(rig, j, length, w, color, dark, rot=(0, 0, 0), seed=0):
    """A timber beam with a splintered end (a broken palisade log, a roof joist)."""
    rnd = random.Random(seed)
    g = Geo()
    box(g, (-length * 0.08, 0, 0), (length * 0.42, w / 2, w / 2), p=5, rot=rot)
    rig.part(j, g, color)
    g = Geo()
    for k in range(4):
        a = rnd.uniform(-0.6, 0.6)
        x0 = length * 0.33
        g.blob((x0 + rnd.uniform(3, 9), rnd.uniform(-w * 0.3, w * 0.3), rnd.uniform(-w * 0.3, w * 0.3)),
               (rnd.uniform(4, 8), w * 0.12, w * 0.12), p=2.0, rot=(0, math.degrees(a), rnd.uniform(-20, 20)))
    rig.part(j, g, dark, outline=0.6)


def log(rig, j, length, r, color, end, seed=0):
    g = Geo().capsule((-length / 2, 0, 0), (length / 2, 0, 0), r, r * 0.92)
    rig.part(j, g, color)
    g = Geo()
    cyl(g, (length / 2 - 1.0, 0, 0), (length / 2 + 0.6, 0, 0), r * 0.8, bevel=0.3)
    rig.part(j, g, end, outline=0.5)


def plate(rig, j, w, h, color, rivet=None, rot=(0, 0, 0), bend=0.0):
    g = Geo()
    box(g, (0, 0, 0), (w / 2, 1.6, h / 2), p=7, rot=(rot[0], rot[1] + bend, rot[2]))
    rig.part(j, g, color, finish="metal")
    if rivet:
        g = Geo()
        for sx in (-1, 1):
            for sz in (-1, 1):
                g.sphere((sx * w * 0.36, -1.8, sz * h * 0.34), 1.1, cuts=2)
        rig.part(j, g, rivet, finish="metal", outline=0.4)


def ibeam(rig, j, length, color, dark):
    g = Geo()
    box(g, (0, 0, 3.6), (length / 2, 4.2, 1.0), p=6)
    box(g, (0, 0, -3.6), (length / 2, 4.2, 1.0), p=6)
    box(g, (0, 0, 0), (length / 2, 1.0, 3.6), p=6)
    rig.part(j, g, color, finish="metal")
    g = Geo()
    box(g, (length / 2 + 0.6, 0, 0), (0.8, 4.4, 4.6), p=4)
    rig.part(j, g, dark, finish="metal", outline=0.5)


def cog(rig, j, r, teeth, color, hub):
    g = Geo()
    cyl(g, (0, -2.2, 0), (0, 2.2, 0), r, bevel=0.6, segs=24)
    for k in range(teeth):
        a = 2 * math.pi * k / teeth
        box(g, (math.cos(a) * (r + 1.6), 0, math.sin(a) * (r + 1.6)), (1.8, 2.0, 1.4), p=4,
            rot=(0, -math.degrees(a), 0))
    rig.part(j, g, color, finish="metal")
    g = Geo()
    cyl(g, (0, -2.8, 0), (0, 2.8, 0), r * 0.32, bevel=0.4, segs=16)
    rig.part(j, g, hub, finish="metal", outline=0.5)


def slab_rebar(rig, j, r, color, rebar, seed=0):
    rnd = random.Random(seed)
    g = Geo()
    rock(g, (0, 0, 0), r, seed=seed, jag=0.08, p=4.0)
    rig.part(j, g, color)
    g = Geo()
    for k in range(2):
        z = rnd.uniform(-r[2] * 0.3, r[2] * 0.3)
        g.capsule((r[0] * 0.6, rnd.uniform(-2, 2), z), (r[0] + rnd.uniform(6, 11), rnd.uniform(-3, 3), z + rnd.uniform(-4, 6)), 0.9)
    rig.part(j, g, rebar, finish="metal", outline=0.5)


def crystal(rig, j, h, r, glow, core, tilt=0.0):
    g = Geo().lathe([(0, -h * 0.5), (r, -h * 0.1), (r * 0.8, h * 0.2), (0, h * 0.5)], (0, 0, 0), segs=6,
                    rot=(0, tilt, 0))
    rig.part(j, g, glow=glow, outline=0)
    g = Geo().lathe([(0, -h * 0.3), (r * 0.42, -h * 0.05), (0, h * 0.32)], (0, -r * 0.4, 0), segs=6, rot=(0, tilt, 0))
    rig.part(j, g, glow=core, outline=0)


def sandbag(rig, j, color, seed=0):
    g = Geo().blob((0, 0, 0), (11, 7, 5.4), p=2.6, rot=(0, random.Random(seed).uniform(-15, 15), 0))
    rig.part(j, g, color, finish="hair")
    g = Geo().capsule((-4, -6.4, 1.5), (4, -6.4, 1.5), 0.6)
    rig.part(j, g, "#8A7A58", outline=0.3)


def heap(rig, j, w, h, colors, seed, extras=None):
    """A low rubble mound: big dark lumps at the back, mixed blocks and slabs in front, small stones
    scattered on top and at the foot (sizes vary, so it reads as rubble, not a row of potatoes)."""
    rnd = random.Random(seed)
    n = int(w / 10)
    spots = []
    for k in range(n):
        u = (k + 0.5) / n
        x = -w / 2 + w * u + rnd.uniform(-5, 5)
        top = h * max(0.18, (1 - (2 * u - 1) ** 2)) ** 0.8
        spots.append((x, top))
    rows = ((2, 9, 1.15, 0.0), (0, -2, 0.9, 0.0), (1, -9, 0.5, 0.45))
    for row, (col_i, dy, scale, lift) in enumerate(rows):
        g = Geo()
        for x, top in spots:
            if row == 2 and rnd.random() < 0.45:
                continue
            big = rnd.random() < 0.25
            rx = rnd.uniform(6, 11) * scale * (1.5 if big else 1)
            rz = min(rx * 0.85, max(3.5, top * rnd.uniform(0.4, 0.7) * scale))
            if rnd.random() < 0.3 and row == 1:
                box(g, (x, dy, rz * 0.6 + top * lift), (rx, rx * 0.7, rz * 0.7), p=5,
                    rot=(rnd.uniform(-15, 15), rnd.uniform(-25, 25), rnd.uniform(-20, 20)))
            else:
                rock(g, (x, dy + rnd.uniform(-3, 3), rz * 0.55 + top * lift), (rx, rx * 0.8, rz),
                     seed=seed * 31 + row * 7 + int(x * 3), jag=0.24)
        rig.part(j, g, colors[col_i % len(colors)])
    # pebbles at the foot
    g = Geo()
    for k in range(int(w / 14)):
        x = rnd.uniform(-w * 0.55, w * 0.55)
        rock(g, (x, -12 + rnd.uniform(-2, 2), 1.5), (rnd.uniform(2.2, 4.2), 2.6, rnd.uniform(1.6, 2.6)), seed=seed + k * 13, jag=0.3)
    rig.part(j, g, colors[2 % len(colors)], outline=0.6)
    if extras:
        extras(rig, j, rnd)


# -- per-age kits -------------------------------------------------------------------------------
def kit_stone(rig, c):
    yield lambda j: boulder(rig, j, (13, 11, 10), c["stone"], 3, cap=c["moss"])
    yield lambda j: boulder(rig, j, (11, 9, 8), c["stone_lt"], 5)
    yield lambda j: boulder(rig, j, (9, 8, 6), c["stone_dk"], 7)
    yield lambda j: boulder(rig, j, (15, 9, 7), c["stone"], 11, cap=c["moss_lt"], jag=0.12)
    yield lambda j: log(rig, j, 30, 3.8, c["wood"], "#B8A47E", seed=1)
    yield lambda j: beam(rig, j, 26, 6, c["wood"], c["wood_dk"], seed=2)
    yield lambda j: (rig.part(j, Geo().capsule((-11, 0, -3), (11, 0, 4), 3.0, 1.6), c["bone"]))
    yield lambda j: boulder(rig, j, (7, 6, 5), c["stone_lt"], 13)


def kit_bronze(rig, c):
    yield lambda j: block(rig, j, (13, 9, 8), c["sand"], chip=True, seed=1)
    yield lambda j: block(rig, j, (10, 8, 7), c["sand_lt"], rot=(0, 18, 8))
    yield lambda j: (rig.part(j, cyl(Geo(), (0, 0, -7), (0, 0, 7), 9, bevel=1.2, segs=20), c["sand_lt"]))
    yield lambda j: block(rig, j, (16, 6, 6), c["sand_dk"], rot=(0, -10, 0), chip=True, seed=4)
    yield lambda j: plate(rig, j, 16, 12, c["verd"], rivet=c["bronze"], bend=12)
    yield lambda j: beam(rig, j, 24, 5, c["wood"], c["wood_dk"], seed=6)
    yield lambda j: boulder(rig, j, (8, 7, 6), c["sand_dk"], 7)
    yield lambda j: block(rig, j, (8, 6, 5), c["clay"], rot=(10, 20, 0))


def kit_medieval(rig, c):
    yield lambda j: block(rig, j, (12, 8, 7), c["stone"], chip=True, seed=1)
    yield lambda j: block(rig, j, (10, 7, 6), c["stone_lt"], rot=(0, 15, 6))
    yield lambda j: block(rig, j, (14, 7, 6), c["stone_dk"], rot=(0, -12, 0), chip=True, seed=3)
    yield lambda j: beam(rig, j, 30, 6, c["wood"], c["wood_dk"], seed=4)
    yield lambda j: beam(rig, j, 22, 5, c["wood_dk"], c["wood"], seed=5)
    yield lambda j: plate(rig, j, 14, 10, c["slate"], rot=(0, 25, 0))
    yield lambda j: boulder(rig, j, (8, 7, 6), c["stone_dk"], 7)
    yield lambda j: block(rig, j, (8, 6, 5), c["stone"], rot=(12, 30, 0))


def kit_gunpowder(rig, c):
    yield lambda j: block(rig, j, (12, 8, 7), c["sand"], chip=True, seed=1)
    yield lambda j: block(rig, j, (10, 7, 6), c["sand_lt"], rot=(0, 15, 6))
    yield lambda j: (rig.part(j, Geo().sphere((0, 0, 0), 6.5, cuts=4), c["iron"], finish="metal"))
    yield lambda j: beam(rig, j, 28, 5, c["wood_lt"], c["wood"], seed=4)
    yield lambda j: plate(rig, j, 18, 6, c["wood"], rivet=c["iron"], bend=18)
    yield lambda j: boulder(rig, j, (9, 8, 6), c["earth"], 6, jag=0.25)
    yield lambda j: block(rig, j, (14, 6, 6), c["sand_dk"], rot=(0, -14, 0), chip=True, seed=7)
    yield lambda j: (rig.part(j, cyl(Geo(), (0, -1.2, 0), (0, 1.2, 0), 8, bevel=0.4, segs=22), c["iron"], finish="metal"),
                     rig.part(j, cyl(Geo(), (0, -1.6, 0), (0, 1.6, 0), 5.6, bevel=0.4, segs=22), c["wood"]))


def kit_industrial(rig, c):
    yield lambda j: block(rig, j, (11, 6, 5), c["brick"], chip=True, seed=1)
    yield lambda j: block(rig, j, (10, 6, 5), c["brick_lt"], rot=(0, 20, 8))
    yield lambda j: (block(rig, j, (11, 6, 4), c["brick_dk"], rot=(0, 0, 0)),
                     rig.part(j, box(Geo(), (2, 0, 9), (11, 6, 4), p=6), c["brick"]))
    yield lambda j: ibeam(rig, j, 32, c["iron"], c["iron_dk"])
    yield lambda j: cog(rig, j, 9, 10, c["iron_lt"], c["copper"])
    yield lambda j: (rig.part(j, cyl(Geo(), (-12, 0, 0), (12, 0, 0), 5, bevel=0.8, segs=18), c["iron"], finish="metal"))
    yield lambda j: plate(rig, j, 16, 12, c["iron_dk"], rivet=c["iron_lt"], bend=14)
    yield lambda j: boulder(rig, j, (7, 6, 5), c["coal"], 8)


def kit_modern(rig, c):
    yield lambda j: slab_rebar(rig, j, (14, 9, 7), c["concrete"], c["rebar"], seed=1)
    yield lambda j: slab_rebar(rig, j, (11, 8, 6), c["concrete_lt"], c["rebar"], seed=2)
    yield lambda j: boulder(rig, j, (9, 8, 7), c["concrete_dk"], 3, jag=0.1)
    yield lambda j: sandbag(rig, j, c["khaki"], seed=4)
    yield lambda j: ibeam(rig, j, 30, c["steel"], c["gunmetal"])
    yield lambda j: plate(rig, j, 18, 10, c["olive"], rivet=c["gunmetal"], bend=20)
    yield lambda j: boulder(rig, j, (7, 6, 5), c["concrete"], 7, jag=0.1)
    yield lambda j: (rig.part(j, Geo().capsule((-12, 0, -2), (12, 0, 3), 0.9), c["rebar"], finish="metal", outline=0.5),
                     rig.part(j, Geo().capsule((-10, 1, 3), (11, 1, -3), 0.9), c["rebar"], finish="metal", outline=0.5))


def kit_future(rig, c):
    yield lambda j: plate(rig, j, 18, 12, c["white"], rivet=c["trim"], bend=10)
    yield lambda j: plate(rig, j, 14, 10, c["charcoal"], rivet=c["char_lt"], rot=(0, 20, 0))
    yield lambda j: crystal(rig, j, 20, 5, c["mint"], c["mint_core"], tilt=20)
    yield lambda j: (block(rig, j, (11, 7, 6), c["char_lt"]),
                     rig.part(j, box(Geo(), (0, -7.4, 0), (8, 0.6, 1.2), p=6), glow=c["mint"], outline=0))
    yield lambda j: plate(rig, j, 20, 8, c["white_lt"], bend=26)
    yield lambda j: crystal(rig, j, 14, 4, c["mint"], c["mint_core"], tilt=-30)
    yield lambda j: block(rig, j, (9, 6, 5), c["white"], rot=(0, 25, 10), chip=True, seed=7)
    yield lambda j: (rig.part(j, Geo().capsule((-11, 0, 0), (11, 0, 0), 2.2), c["trim"], finish="metal"),
                     rig.part(j, cyl(Geo(), (8, 0, 0), (12, 0, 0), 3.2, bevel=0.4), glow=c["mint"], outline=0))


def kit_cosmic(rig, c):
    yield lambda j: plate(rig, j, 18, 12, c["armor"], rivet=c["hull_lt"], bend=12)
    yield lambda j: plate(rig, j, 16, 10, c["hull"], rivet=c["seam"], rot=(0, 18, 0))
    yield lambda j: crystal(rig, j, 22, 5.5, c["plasma"], c["plasma_core"], tilt=15)
    yield lambda j: (block(rig, j, (11, 7, 6), c["hull_lt"]),
                     rig.part(j, box(Geo(), (0, -7.4, 0), (8, 0.6, 1.2), p=6), glow=c["plasma"], outline=0))
    yield lambda j: plate(rig, j, 20, 8, c["armor_lt"], bend=24)
    yield lambda j: crystal(rig, j, 14, 4, c["plasma"], c["plasma_core"], tilt=-25)
    yield lambda j: boulder(rig, j, (8, 7, 6), c["hull"], 7, jag=0.2)
    yield lambda j: block(rig, j, (9, 6, 5), c["armor"], rot=(0, 25, 10), chip=True, seed=8)


KITS = {"stone": kit_stone, "bronze": kit_bronze, "medieval": kit_medieval, "gunpowder": kit_gunpowder,
        "industrial": kit_industrial, "modern": kit_modern, "future": kit_future, "cosmic": kit_cosmic}

HEAP_COLORS = {
    "stone": ("stone", "stone_lt", "stone_dk"), "bronze": ("sand", "sand_lt", "sand_dk"),
    "medieval": ("stone", "stone_lt", "stone_dk"), "gunpowder": ("sand", "sand_lt", "sand_dk"),
    "industrial": ("brick", "brick_lt", "brick_dk"), "modern": ("concrete", "concrete_lt", "concrete_dk"),
    "future": ("white", "white_lt", "char_lt"), "cosmic": ("armor", "armor_lt", "hull_lt"),
}


def heap_extras(age, c):
    """What sticks out of the rubble: beams, girders, rebar, a glowing shard."""
    def extras(rig, j, rnd):
        g = Geo()
        if age in ("stone", "bronze", "medieval", "gunpowder"):
            wood = c.get("wood_lt", c.get("wood"))
            for k in range(2):
                x = rnd.uniform(-30, 30)
                box(g, (x, -2, 12), (16, 2.6, 2.6), p=5, rot=(0, rnd.uniform(-40, 40), rnd.uniform(-20, 20)))
            rig.part(j, g, wood)
        elif age in ("industrial", "modern"):
            col = c.get("iron", c.get("steel"))
            for k in range(2):
                x = rnd.uniform(-30, 30)
                box(g, (x, -2, 12), (18, 1.6, 1.6), p=6, rot=(0, rnd.uniform(-45, 45), rnd.uniform(-20, 20)))
            rig.part(j, g, col, finish="metal")
        else:
            glow = c.get("mint", c.get("plasma"))
            core = c.get("mint_core", c.get("plasma_core"))
            gg = Geo().lathe([(0, -8), (3.5, -1), (0, 9)], (rnd.uniform(-20, 20), -4, 12), segs=6, rot=(0, 25, 0))
            rig.part(j, gg, glow=glow, outline=0)
            gg = Geo().lathe([(0, -4), (1.4, 0), (0, 5)], (0, -6, 10), segs=6)
            rig.part(j, gg, glow=core, outline=0)
    return extras


def rag(rig, j):
    """A torn banner scrap (team coloured), a little bent."""
    pts = [(-9, 8), (2, 9), (9, 6), (11, -1), (6, -4), (8, -9), (1, -7), (-3, -10), (-6, -5), (-10, -6)]
    g = Geo().slab(pts, 0, 1.4, rot=(0, 0, 18))
    rig.part(j, g, team=True, outline=0.5)


def kit_module(age):
    c = P[age]

    def build(rig):
        rig.joint("pieces", "root", (0, 0, 0))
        for i, make in enumerate(KITS[age](rig, c)):
            j = rig.joint(f"p{i}", "pieces", (0, 0, 0), hidden=True)
            make(j)
        cols = [c[k] for k in HEAP_COLORS[age]]
        for i, (w, h) in enumerate(((150, 30), (84, 24))):
            j = rig.joint(f"h{i}", "root", (0, 0, 0), hidden=True)
            heap(rig, j, w, h, cols, seed=17 + i * 5, extras=heap_extras(age, c))
        j = rig.joint("rag", "root", (0, 0, 0), hidden=True)
        rag(rig, j)

    return _kit_namespace(age, f"{age}_kit", f"{age}.collapse", build, f"base.{age}.collapse", f"{age} collapse kit")


# -- base skin models' own kits (PLAN 2c: strong material changes; art/bases/skins/<skin>.collapse) ------
SKIN_P = {
    "rose_keep": dict(stone="#D0A69C", stone_lt="#DAB4AA", stone_dk="#AB857E", trim="#ECDFCF", trim_dk="#CDBBA8",
                      wood="#7A5E44", wood_dk="#5A4634", leaf="#4C7A30", leaf_lt="#79A84C", bloom="#8E2A4A",
                      bloom_lt="#B9476B", pink="#C9637F", pink_lt="#E790A8", slate="#6F6062"),
    "mossy_den": dict(bark="#6A4E3A", bark_lt="#7E604A", bark_dk="#56402F", bark_dkr="#45352A", heart="#B48C62",
                      rings="#9A764F", stone="#8C7B68", stone_lt="#A08E78", stone_dk="#76685A", moss="#6E8B3D",
                      moss_lt="#7E9A4A", shelf="#C2A26E", shelf_rim="#E9D8B4", shelf_dk="#9A7A52", glow="#F1F0C8",
                      glow_stem="#D9D2B0", cream="#EDE3C8"),
    "coral_fort": dict(stone="#A2A7AA", stone_lt="#B2B7B9", stone_dk="#878D92", stone_pink="#B4A6A1", coral="#D8907A",
                       coral_lt="#E8AA96", brain="#D6B061", brain_dk="#B08A44", star="#E07A4F", wood="#5E4A38",
                       wood_lt="#7E654C", wood_dk="#47382B", iron="#3C3F45", shell="#F0E2CC", shell_pink="#E7B7A2",
                       cream="#EFE6CF"),
    "copper_foundry": dict(stone="#CFC6B2", stone_lt="#DDD5C3", stone_dk="#B3A994", verd="#4F8F7F", verd_lt="#67A594",
                           verd_dk="#3E7366", copper="#C27A48", copper_lt="#D9935E", copper_dk="#99593A", brass="#C9A54A",
                           iron="#5B6168", iron_dk="#454A51"),
}


def rose_tuft(rig, j, c, seed=0, r=4.6):
    """A torn-off tuft of the climbing roses: leaves round one or two blooms."""
    from world.base_skins_kit import Roses
    rnd = random.Random(seed)
    ro = Roses(c["bloom"], c["bloom_lt"], "#5C1A31", c["leaf"], c["leaf_lt"], "#5C6B36")
    for k in range(6):
        a = 360.0 * k / 6 + rnd.uniform(-20, 20)
        ro.leaf((math.cos(math.radians(a)) * 2.0, -1.0, math.sin(math.radians(a)) * 2.0), 6.0, a, light=k % 2 == 0)
    ro.bloom((0.0, -3.4, 0.6), r)
    ro.parts(rig, j)


def kit_rose_keep(rig, c):
    yield lambda j: block(rig, j, (12, 8, 7), c["stone"], chip=True, seed=1)
    yield lambda j: block(rig, j, (10, 7, 6), c["stone_lt"], rot=(0, 15, 6))
    yield lambda j: block(rig, j, (14, 7, 6), c["stone_dk"], rot=(0, -12, 0), chip=True, seed=3)
    yield lambda j: block(rig, j, (9, 6, 6), c["trim"], rot=(10, 25, 0), chip=True, seed=4)
    yield lambda j: beam(rig, j, 28, 6, c["wood"], c["wood_dk"], seed=5)
    yield lambda j: rose_tuft(rig, j, c, seed=6, r=4.8)
    yield lambda j: plate(rig, j, 14, 10, c["slate"], rot=(0, 25, 0))
    yield lambda j: rose_tuft(rig, j, c, seed=8, r=4.0)


def rose_keep_extras(c):
    """Beams, a cream trim block and torn roses sticking out of the Rose Keep's rubble."""
    def extras(rig, j, rnd):
        g = Geo()
        for k in range(2):
            x = rnd.uniform(-30, 30)
            box(g, (x, -2, 12), (16, 2.6, 2.6), p=5, rot=(0, rnd.uniform(-40, 40), rnd.uniform(-20, 20)))
        rig.part(j, g, c["wood"])
        g = Geo()
        box(g, (rnd.uniform(-20, 20), -6, 9), (6, 4, 4), p=5, rot=(0, rnd.uniform(-30, 30), 0))
        rig.part(j, g, c["trim"])
        from world.base_skins_kit import Roses
        ro = Roses(c["pink"], c["pink_lt"], "#86283F", c["leaf"], c["leaf_lt"], "#5C6B36")
        for k in range(3):
            x = rnd.uniform(-32, 32)
            for a in (30, 150, 90):
                ro.leaf((x, -12, 9 + rnd.uniform(0, 5)), 5.4, a + rnd.uniform(-20, 20), light=a == 90)
            ro.bloom((x, -14, 13 + rnd.uniform(0, 4)), 4.2)
        ro.parts(rig, j)
    return extras


def bark_shard(rig, j, c, w, h, seed=0, curve=0.35):
    """A curved shard of the stump's shell: grooved bark outside, pale heartwood on the broken edges."""
    rnd = random.Random(seed)
    g = Geo()
    box(g, (0, 0, 0), (w / 2, 2.6, h / 2), p=4, rot=(0, rnd.uniform(-10, 10), 0))
    rig.part(j, g, c["heart"])
    g = Geo()
    box(g, (0, -1.4, 0), (w / 2 - 1.2, 2.2, h / 2 - 1.0), p=4, rot=(0, rnd.uniform(-10, 10), 0))
    rig.part(j, g, c["bark"])
    g = Geo()
    for k in range(3):
        x = -w * 0.3 + k * w * 0.3 + rnd.uniform(-1, 1)
        g.capsule((x, -3.8, -h * 0.36), (x + rnd.uniform(-1.5, 1.5), -3.8, h * 0.36), 0.7)
    rig.part(j, g, glow=c["bark_dkr"], outline=0)


def stump_log(rig, j, c, length, r, seed=0):
    """A broken log of the stump: bark round it, growth rings on the cut end, splinters on the other."""
    rnd = random.Random(seed)
    g = Geo().capsule((-length / 2, 0, 0), (length / 2, 0, 0), r, r * 0.92)
    rig.part(j, g, c["bark"])
    g = Geo()
    cyl(g, (length / 2 - 1.0, 0, 0), (length / 2 + 0.6, 0, 0), r * 0.82, bevel=0.3)
    rig.part(j, g, c["heart"], outline=0.5)
    g = Geo()
    for rr in (r * 0.3, r * 0.58):
        cyl(g, (length / 2 + 0.5, 0, 0), (length / 2 + 0.9, 0, 0), rr, rr, bevel=0.0)
    rig.part(j, g, glow=c["rings"], outline=0)
    g = Geo()
    for k in range(4):
        a = rnd.uniform(0, 2 * math.pi)
        g.blob((-length / 2 - rnd.uniform(1, 4), math.cos(a) * r * 0.5, math.sin(a) * r * 0.5),
               (rnd.uniform(3, 6), r * 0.18, r * 0.18), p=2.0)
    rig.part(j, g, c["heart"], outline=0.5)


def shelf_chunk(rig, j, c):
    """A broken-off shelf fungus: a tan top with a cream rim and a dark gilled underside."""
    g = Geo().blob((0, 0, -1.6), (13, 9, 4.2), p=2.4, cuts=5)
    g.clip((0, 0, 0), (0, 0, 1))
    rig.part(j, g, c["shelf"])
    g = Geo().blob((0, 0, -1.8), (14, 10, 1.9), p=2.4, cuts=5)
    g.clip((0, 0, -0.4), (0, 0, 1))
    rig.part(j, g, c["shelf_rim"])
    g = Geo().blob((0, 1, -3.4), (11, 7.4, 3.0), p=2.2, cuts=5)
    g.clip((0, 0, -1.8), (0, 0, 1))
    rig.part(j, g, c["shelf_dk"])


def glow_tuft(rig, j, c, seed=0):
    """A clump of moss torn off with three glowing mushrooms in it."""
    rnd = random.Random(seed)
    g = Geo()
    rock(g, (0, 0, 0), (9, 7, 4), seed=seed, jag=0.25, p=2.4)
    rig.part(j, g, c["moss"], finish="hair")
    st, cap = Geo(), Geo()
    for k in range(3):
        x = -4 + k * 4 + rnd.uniform(-1, 1)
        h = rnd.uniform(5, 8)
        st.capsule((x, -1, 2), (x, -1, 2 + h), 0.9, 0.7, segs=8, rings=2)
        r = rnd.uniform(2.6, 3.6)
        cap.lathe([(0, 0), (r, 0), (r * 0.8, r * 0.45), (0.1, r * 0.7)], (x, -1, 2 + h - 0.5), segs=12)
    rig.part(j, st, c["glow_stem"], outline=0.4)
    rig.part(j, cap, glow=c["glow"], outline=0.4)


def kit_mossy_den(rig, c):
    yield lambda j: bark_shard(rig, j, c, 22, 16, seed=1)
    yield lambda j: stump_log(rig, j, c, 26, 5.5, seed=2)
    yield lambda j: boulder(rig, j, (12, 10, 9), c["stone"], 3, cap=c["moss"])
    yield lambda j: bark_shard(rig, j, c, 14, 20, seed=4)
    yield lambda j: shelf_chunk(rig, j, c)
    yield lambda j: glow_tuft(rig, j, c, seed=6)
    yield lambda j: (rig.part(j, Geo().blob((0, 0, 0), (12, 2.6, 3.2), p=2.0, cuts=4, taper=(1.0, 0.15)), c["bark_lt"]))
    yield lambda j: boulder(rig, j, (8, 7, 6), c["stone_dk"], 7)


def mossy_den_extras(c):
    """Broken logs, bark shards, moss and glowing mushrooms in the stump's rubble."""
    def extras(rig, j, rnd):
        g, ends = Geo(), Geo()
        for k in range(2):
            x = rnd.uniform(-30, 30)
            a = rnd.uniform(-35, 35)
            ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
            g.capsule((x - ca * 15, -2, 10 - sa * 15), (x + ca * 15, -2, 10 + sa * 15), 4.2, 3.8)
            cyl(ends, (x + ca * 15.2, -2, 10 + sa * 15.2), (x + ca * 16.2, -2, 10 + sa * 16.2), 3.4, bevel=0.2)
        rig.part(j, g, c["bark"])
        rig.part(j, ends, c["heart"], outline=0.5)
        g = Geo()
        for k in range(3):
            rock(g, (rnd.uniform(-34, 34), -8, 8 + rnd.uniform(0, 5)), (7, 5, 3), seed=k + 70, jag=0.3, p=2.4)
        rig.part(j, g, c["moss"], finish="hair")
        st, cap = Geo(), Geo()
        for k in range(4):
            x = rnd.uniform(-36, 36)
            h = rnd.uniform(4, 7)
            st.capsule((x, -12, 4), (x, -12, 4 + h), 0.8, 0.6, segs=8, rings=2)
            cap.lathe([(0, 0), (3.0, 0), (2.4, 1.4), (0.1, 2.2)], (x, -12, 4 + h - 0.5), segs=12)
        rig.part(j, st, c["glow_stem"], outline=0.4)
        rig.part(j, cap, glow=c["glow"], outline=0.4)
    return extras


def coral_chunk(rig, j, c, seed=0):
    """A broken-off branch of pink coral: a stub with two forks and knobbly lighter tips."""
    rnd = random.Random(seed)
    g, t = Geo(), Geo()
    p0, p1 = (-6.0, 0.0, -5.0), (0.0, 0.0, 2.0)
    g.capsule(p0, p1, 2.6, 2.2, segs=10, rings=2)
    for d in (-1, 1):
        a = math.radians(90 + d * rnd.uniform(28, 40))
        q = (p1[0] + math.cos(a) * 9.0, 0.0, p1[2] + math.sin(a) * 9.0)
        g.capsule(p1, q, 2.1, 1.7, segs=10, rings=2)
        t.sphere(q, 2.1, cuts=2)
    rig.part(j, g, c["coral"], outline=0.4)
    rig.part(j, t, c["coral_lt"], outline=0.3)


def brain_lump(rig, j, c, r=7.0):
    g = Geo().blob((0, 0, 0), (r, r * 0.9, r * 0.72), p=2.2, cuts=5)
    rig.part(j, g, c["brain"])
    g = Geo()
    for k in range(3):
        z = -r * 0.3 + k * r * 0.3
        pts = [(math.cos(math.radians(a)) * r * 0.98 * math.cos(z / r), math.sin(math.radians(a)) * r * 0.9 * math.cos(z / r) * 1.01,
                z + math.sin(math.radians(a * 3)) * 0.8) for a in range(200, 345, 15)]
        for a, b in zip(pts, pts[1:]):
            g.capsule(a, b, 0.5, segs=6, rings=1)
    rig.part(j, g, glow=c["brain_dk"], outline=0)


def kit_coral_fort(rig, c):
    yield lambda j: block(rig, j, (12, 8, 7), c["stone"], chip=True, seed=1)
    yield lambda j: block(rig, j, (10, 7, 6), c["stone_pink"], rot=(0, 15, 6))
    yield lambda j: coral_chunk(rig, j, c, seed=3)
    yield lambda j: beam(rig, j, 28, 6, c["wood"], c["wood_dk"], seed=4)
    yield lambda j: (rig.part(j, Geo().sphere((0, 0, 0), 6.0, cuts=4), c["iron"], finish="metal"))
    yield lambda j: (rig.part(j, Geo().star((0, 0, 0), 8.0, 3.4, 2.6, points=5, rot=(0, 12, 0)), c["star"], outline=0.5))
    yield lambda j: brain_lump(rig, j, c)
    yield lambda j: block(rig, j, (14, 7, 6), c["stone_dk"], rot=(0, -12, 0), chip=True, seed=8)


def coral_fort_extras(c):
    """Broken hull planks, coral branches and shells in the sea fort's rubble."""
    def extras(rig, j, rnd):
        g = Geo()
        for k in range(2):
            x = rnd.uniform(-30, 30)
            box(g, (x, -2, 12), (16, 2.4, 2.4), p=5, rot=(0, rnd.uniform(-40, 40), rnd.uniform(-20, 20)))
        rig.part(j, g, c["wood_lt"])
        g, t = Geo(), Geo()
        for k in range(3):
            x = rnd.uniform(-34, 34)
            b = (x, -10, 6 + rnd.uniform(0, 4))
            for d in (-1, 1):
                a = math.radians(90 + d * rnd.uniform(20, 40))
                q = (b[0] + math.cos(a) * 7, b[1], b[2] + math.sin(a) * 7)
                g.capsule(b, q, 1.7, 1.4, segs=8, rings=1)
                t.sphere(q, 1.8, cuts=2)
        rig.part(j, g, c["coral"], outline=0.4)
        rig.part(j, t, c["coral_lt"], outline=0.3)
        g = Geo()
        for k in range(4):
            x = rnd.uniform(-38, 38)
            g.blob((x, -13, 3.0), (3.2, 1.2, 2.6), p=2.2, cuts=3, rot=(0, rnd.uniform(-30, 30), 0))
        rig.part(j, g, c["shell"], outline=0.4)
    return extras


def copper_pipe(rig, j, c, length=24.0, r=3.0):
    """A torn length of copper pipe with a flange at one end and a ragged split at the other."""
    g = Geo().capsule((-length / 2, 0, 0), (length / 2, 0, 0), r, r, segs=12, rings=2)
    rig.part(j, g, c["copper"], finish="metal")
    g = Geo()
    cyl(g, (-length / 2 + 0.6, 0, 0), (-length / 2 + 2.6, 0, 0), r + 1.3, bevel=0.4, segs=14)
    rig.part(j, g, c["copper_dk"], finish="metal", outline=0.4)
    g = Geo()
    cyl(g, (length / 2 + 0.2, 0, 0), (length / 2 + 0.8, 0, 0), r * 0.62, bevel=0.1, segs=12)
    rig.part(j, g, glow="#3A2A22", outline=0)


def kit_copper_foundry(rig, c):
    yield lambda j: block(rig, j, (12, 8, 7), c["stone"], chip=True, seed=1)
    yield lambda j: block(rig, j, (10, 7, 6), c["stone_lt"], rot=(0, 15, 6))
    yield lambda j: copper_pipe(rig, j, c)
    yield lambda j: plate(rig, j, 16, 12, c["verd"], rivet=c["copper_lt"], bend=14)
    yield lambda j: cog(rig, j, 7.0, 8, c["brass"], c["copper_dk"])
    yield lambda j: plate(rig, j, 14, 10, c["copper"], rivet=c["copper_dk"], rot=(0, 20, 0), bend=-12)
    yield lambda j: ibeam(rig, j, 26, c["iron"], c["iron_dk"])
    yield lambda j: block(rig, j, (14, 7, 6), c["stone_dk"], rot=(0, -12, 0), chip=True, seed=8)


def copper_foundry_extras(c):
    """Copper pipes, a bent verdigris plate and a girder sticking out of the copper works' rubble."""
    def extras(rig, j, rnd):
        g = Geo()
        for k in range(2):
            x = rnd.uniform(-30, 30)
            a = math.radians(rnd.uniform(-35, 35))
            g.capsule((x - math.cos(a) * 14, -2, 10 - math.sin(a) * 14), (x + math.cos(a) * 14, -2, 10 + math.sin(a) * 14), 2.6, 2.6)
        rig.part(j, g, c["copper"], finish="metal")
        g = Geo()
        box(g, (rnd.uniform(-24, 24), -6, 11), (9, 1.4, 7), p=7, rot=(0, rnd.uniform(-30, 30), rnd.uniform(-20, 20)))
        rig.part(j, g, c["verd"], finish="metal")
        g = Geo()
        x = rnd.uniform(-30, 30)
        box(g, (x, -2, 12), (18, 1.6, 1.6), p=6, rot=(0, rnd.uniform(-45, 45), rnd.uniform(-20, 20)))
        rig.part(j, g, c["iron"], finish="metal")
    return extras


# skin -> (age, pieces, heap colour keys (back, middle, front + pebbles), what sticks out of the heaps)
SKIN_KITS = {
    "rose_keep": ("medieval", kit_rose_keep, ("stone", "stone_lt", "stone_dk"), rose_keep_extras),
    "mossy_den": ("stone", kit_mossy_den, ("bark_dk", "stone", "bark_lt"), mossy_den_extras),
    "coral_fort": ("gunpowder", kit_coral_fort, ("stone_dk", "stone", "stone_lt"), coral_fort_extras),
    "copper_foundry": ("industrial", kit_copper_foundry, ("stone_dk", "stone", "stone_lt"), copper_foundry_extras),
}


def skin_kit_module(skin):
    age, kit, heap_keys, extras = SKIN_KITS[skin]
    c = SKIN_P[skin]

    def build(rig):
        rig.joint("pieces", "root", (0, 0, 0))
        for i, make in enumerate(kit(rig, c)):
            j = rig.joint(f"p{i}", "pieces", (0, 0, 0), hidden=True)
            make(j)
        cols = [c[k] for k in heap_keys]
        for i, (w, h) in enumerate(((150, 30), (84, 24))):
            j = rig.joint(f"h{i}", "root", (0, 0, 0), hidden=True)
            heap(rig, j, w, h, cols, seed=17 + i * 5, extras=extras(c))
        j = rig.joint("rag", "root", (0, 0, 0), hidden=True)
        rag(rig, j)

    mod = _kit_namespace(age, f"{skin}_kit", f"{skin}.collapse", build, f"base.{age}@{skin}.collapse", f"{skin} collapse kit")
    mod.EXTRA_META["skin"] = skin
    mod.SKIN = skin
    return mod


def _kit_namespace(age, slug, file_slug, build, visual_id, name):
    """The pipeline module of a collapse kit (frame names start with `slug`: `<age>_kit_` or `<skin>_kit_`)."""

    def clips():
        return [
            Clip("piece", PIECES, lambda f: {f"p{f}": {"show": True}}, durations=[100] * PIECES),
            Clip("heap", HEAPS, lambda f: {f"h{f}": {"show": True}}, durations=[1000] * HEAPS),
            Clip("rag", 1, lambda f: {"rag": {"show": True}}, durations=[1000]),
        ]

    return SimpleNamespace(
        SLUG=slug, FILE_SLUG=file_slug, VISUAL_ID=visual_id, NAME=name,
        # the canvas fits the wide heap; pieces and the rag sit at the anchor in its middle
        HEIGHT_LU=40, CANVAS=(300, 140), FEET=(150, 78), YAW_DEG=BASE_YAW,
        ANCHORS={"head": (0, 20), "hitCenter": (0, 0)},
        EXTRA_META={"kind": "baseCollapseKit", "age": age, "pieces": PIECES, "heaps": HEAPS},
        build=build, clips=clips, AGE=age, TEAM=True,
    )
