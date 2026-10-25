"""Modern scenes.

Classic "City Skyline" (format 2, round 3): a dense mid-century skyline across a grey river under a pale
sky. Back: low blue-grey hills. Far: the river opening into a bay on the right under a suspension bridge,
the city on the far bank (setback towers with window bays, the Art Deco spire tower, brick warehouses with
rooftop water towers), the radio mast. Mid: the near bank (a paved quay with a railing and lamp posts),
warehouses with water towers on their roofs, a freight siding with standing wagons, telegraph poles along
the line. Ambient: a tug working up the river, cars and a bus over the bridge, a freight train along the
bank every minute, pigeons, chimney smoke; windows, the mast's beacon, the lamps and the bridge lights glow
under night skies.

"Desert Airbase" (format 2, round 2, reworked in round 3; Rare, Time Capsule; a set with Desert Bunker): a
desert airfield under a hot, pale sky. Back: buttes on the horizon. Far: buttes with real strata, gullies,
cap rock and talus behind an airfield on a rise: the runway with its lights, quonset hangars, a control
tower with a glazed cab and a beacon, a radar dish on a lattice mast, fuel tanks and parked planes. Mid:
sand and scrub, a sandbag emplacement, a parked transport, fuel trucks and a jeep, oil drums and crates, a
radio shack, a windsock, a big hangar with a transport nosing out of its door, a water tower, the
perimeter fence. Ambient: the radar dish turns, the windsock flutters, a transport taxis and takes off
every 45 s, vultures circle, dust drifts; the runway lights, the tower's cab and the hangar lamps glow
under night skies.

Palette (PLAN 2b): sand #CDB88A, khaki #B8A67A, gunmetal #3A3F45; planes and vehicles stay muted olive
and grey (no team colours).

"Monsoon River" (format 2, round 3; Epic, Wardrobe Crate; a set with Jungle Outpost): a misty jungle
river with waterfalls in a humid haze. Back: misty jungle ridges. Far: jungle walls under a dense
canopy, two waterfalls between dark cliff columns, the rope bridge across the gorge above the great fall
(the signature), a stepped temple ruin overgrown on the hill, palms, the river. Mid: the river (muddy
grey-green, low saturation) behind a mossy bank, a stilt village with thatched A-frame roofs, a dock and
canoes, palms, big-leaved plants, broad trees. Ambient: a river patrol boat runs up the river every 50
s, the waterfalls' sheen, a mist bank drifts, birds; the stilt huts' lanterns and the temple's fire glow
under night skies.

Palette (PLAN 2b): jungle #4F7A4A, mud #7A6A52, mist #D8DCD4.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.scenes import fauna, kit
from world.scenes.common import PaintedProp, Prop, Scene, box, cyl, mixc, ridge, rock, soft_blob
from world.scenes.kit import Parts

# -- City Skyline (the classic, round 3) -------------------------------------------------------------
CS_PAL = dict(skyTop=0x94A8BC, skyBottom=0xE4E0D6, light=0xF6F0E2, far=0x8E929A, mid=0x76786C, near=0x5A5C52)
CS = dict(
    stone=0xBDB8AA, stone_dk=0xA09C90, tan=0xB8A67A, tan_dk=0x9C8C66, grey=0x9C9890, grey_dk=0x7E7A74, cream=0xD6CFBE,
    glass=0x5A5E66, roof=0x6E7076, brick=0x8E6A5E, brick_dk=0x765A50, olive=0x62664A, olive_dk=0x4E5240, khaki=0xB8A67A,
    gunmetal=0x3A3F45, signal=0xB0306A, water=0x9AA6A8, water_hi=0xC4CCCC, quay=0xA8A498, quay_dk=0x8A867C, grass=0x7E8A62,
    grass_dk=0x68744E, tree=0x5E7050, tree_dk=0x4E5E44, asphalt=0x6A6A6C, rail=0x4A4642, sleeper=0x6A5A4C, wood=0x7A6450,
    steel=0x8A8E94, dark=0x3A3E44, hill=0x8A9478, patina=0x7E9A86,
)
CS_SKY = {"top": "#94A8BC", "bottom": "#E4E0D6", "horizon": "#ECE8DE", "cloudTint": "#F2F0EA", "celestial": "sun",
          "sunAt": [200, -560, 36], "clouds": 0.8}
CS_FAR_E = math.radians(8.0)
CS_MID_E = math.radians(12.0)
CS_RIVER_Z = 40.0                 # the river (lifted, like Treasure Cove's sea, so it shows over the mid strip)
CS_BANK_Z = 54.0                  # the city's bank
CS_BRIDGE = (860.0, 1460.0, 470.0, 70.0, 66.0)   # x0, x1, y, deck z, tower height (far)
CS_MAST = (160.0, 690.0)          # the radio mast (far): x, y
CS_TRAIN_Y = -40.0                # the freight line along the bank (mid, screen lu)
CS_PIGEONS = (300.0, -190.0)      # the pigeons' ring (mid, screen lu)


def cs_back(st, P):
    """Low blue-grey hills beyond the city (lowest under the moons' place)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    g, g2 = pt.g(hz(CS["hill"], 0.4), outline=0.0), pt.g(hz(CS["grass_dk"], 0.42), outline=0.0)
    for x, rx, h, seed in ((-160, 220, 120, 1), (180, 200, 96, 2), (520, 220, 80, 3), (1180, 240, 116, 4), (1460, 180, 96, 5), (880, 140, 50, 6)):
        kit.hill(g if seed % 2 else g2, x, 1500, CS_BANK_Z - 20, rx, 80, h, seed=seed, jag=0.04, p=2.4)
    pt.flush(st)


def cs_far(st, P):
    pt = Parts()
    rnd = random.Random(61)
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    # 1. the river across the frame, opening into a bay on the right under the bridge
    box(pt.g(CS["water"], finish="gloss", outline=0.0), (600, 780, CS_RIVER_Z - 4), (1100, 500, 4), p=6, cuts=2)
    gwh = pt.g(CS["water_hi"], outline=0.0, highlight=False)
    for i in range(40):
        x = rnd.uniform(-260, 1460)
        y = rnd.uniform(420, 560) if x < 860 else rnd.uniform(420, 1000)
        L = rnd.uniform(10, 26)
        gwh.capsule((x - L, y, CS_RIVER_Z + 0.4), (x + L, y, CS_RIVER_Z + 0.4), 0.8, 0.8)
    # 2. the far bank: a stone quay wall, then the city ground; the right headland where the bridge lands
    box(pt.g(CS["quay"], outline=0.3), (300, 566, CS_RIVER_Z + (CS_BANK_Z - CS_RIVER_Z) / 2), (580, 6, (CS_BANK_Z - CS_RIVER_Z) / 2 + 2), p=6, cuts=2)
    box(pt.g(CS["quay_dk"], outline=0.0), (300, 559.4, CS_RIVER_Z + 3), (580, 0.6, 1.4), p=4, cuts=1)
    box(pt.g(CS["grey_dk"], outline=0.0), (300, 760, CS_BANK_Z - 6), (580, 190, 6), p=6, cuts=1)
    gh, gh2 = pt.g(CS["grass"], outline=0.0), pt.g(CS["grass_dk"], outline=0.0)
    kit.hill(gh, 1400, 600, CS_RIVER_Z - 6, 170, 110, 76, seed=31, jag=0.05, p=2.4)
    kit.hill(gh2, 1250, 760, CS_RIVER_Z - 6, 150, 90, 60, seed=32, jag=0.05, p=2.4)
    rock(pt.g(CS["quay_dk"], outline=0.3), (860, 520, CS_RIVER_Z + 6), (30, 30, 14), seed=33, jag=0.1, p=3.0)
    # 3. the skyline: rows of towers from the back (hazier) to the quay, the Art Deco spire tower the landmark
    lights = []
    rows = (
        # (y, haze, [(x, w, d, h, tiers, crown, wall), ...]): wide blocks and towers of different heights and crowns
        (840, 0.34, [(-210, 46, 26, 56, 2, "flat", "grey"), (-110, 30, 22, 88, 3, "mast", "stone"), (60, 54, 26, 50, 1, "flat", "tan"), (250, 34, 24, 96, 3, "flat", "stone"),
                     (560, 30, 22, 100, 3, "mast", "tan"), (700, 50, 26, 60, 2, "flat", "grey"), (1060, 44, 24, 46, 1, "flat", "stone"), (1180, 30, 22, 66, 2, "flat", "tan")]),
        (720, 0.2, [(-170, 36, 26, 66, 2, "flat", "tan"), (-40, 56, 30, 44, 1, "flat", "stone"), (120, 34, 24, 74, 3, "flat", "grey"), (300, 64, 34, 40, 2, "dome", "cream"),
                    (650, 40, 28, 86, 3, "mast", "stone"), (780, 52, 30, 40, 1, "flat", "tan")]),
        (630, 0.06, [(-230, 52, 28, 30, 1, "flat", "brick"), (-120, 40, 26, 40, 2, "flat", "stone"), (10, 46, 26, 34, 1, "flat", "tan"), (200, 50, 28, 30, 1, "flat", "brick"),
                     (580, 44, 28, 38, 2, "flat", "stone"), (730, 56, 30, 26, 1, "flat", "brick")]),
    )
    walls = {"grey": (CS["grey"], CS["grey_dk"]), "stone": (CS["stone"], CS["stone_dk"]), "tan": (CS["tan"], CS["tan_dk"]), "cream": (CS["cream"], CS["stone"]),
             "brick": (CS["brick"], CS["brick_dk"])}
    for y, haze, towers in rows:
        for k, (x, w, d, h, tiers, crown, wall) in enumerate(towers):
            wl, wd = walls[wall]
            roof = CS["patina"] if (k + y) % 3 == 0 and wall != "brick" else CS["roof"]
            top, ls = kit.setback_tower(pt, x + rnd.uniform(-6, 6), y + rnd.uniform(-8, 8), CS_BANK_Z, w, d, h, wall=hz(wl, haze), wall_dk=hz(wd, haze),
                                        win=hz(mixc(CS["glass"], wl, 0.25), haze * 0.8), trim=hz(CS["cream"], haze), yaw=rnd.choice((-14, -8, 8, 14)), tiers=tiers,
                                        crown=crown, roof=hz(roof, haze), seed=200 + k + y, outline=0.3 if haze > 0.1 else 0.4)
            if haze < 0.25:
                lights += ls[:1]
    # the city's fabric between the towers: rows of lower blocks along the quay and behind it (a continuous
    # base for the skyline, no sky showing between the towers' feet)
    fill = ((610, 0.04, 14, 30, ("brick", "stone", "tan")), (680, 0.12, 22, 46, ("stone", "grey", "tan", "brick")), (770, 0.24, 26, 56, ("grey", "stone", "tan")))
    for y, haze, hmin, hmax, kinds in fill:
        x = -255.0
        k = 0
        while x < 830:
            w = rnd.uniform(26, 44)
            wl, wd = walls[kinds[k % len(kinds)]]
            kit.setback_tower(pt, x + w / 2, y + rnd.uniform(-6, 6), CS_BANK_Z - 2, w, 20, rnd.uniform(hmin, hmax), wall=hz(wl, haze), wall_dk=hz(wd, haze),
                              win=hz(mixc(CS["glass"], wl, 0.3), haze * 0.8), trim=hz(CS["cream"], haze), yaw=rnd.choice((-8, 0, 8)), tiers=1, crown="flat",
                              roof=hz(CS["roof"], haze), seed=900 + k + y, outline=0.3, rows=4.0)
            x += w + rnd.uniform(-4, 2)
            k += 1
    # the landmark: an Art Deco tower with a stepped crown and a needle spire
    top, ls = kit.setback_tower(pt, 430, 660, CS_BANK_Z, 40, 30, 80, wall=CS["cream"], wall_dk=CS["stone"], win=CS["glass"], trim=CS["stone_dk"], yaw=-10,
                                tiers=3, crown="spire", roof=CS["roof"], seed=7, outline=0.4, rows=4.2)
    lights += ls
    # 4. the radio mast on its block, its warning light blinking (a scene light at night too)
    mx, my = CS_MAST
    box(pt.g(CS["grey"], outline=0.3), (mx, my, CS_BANK_Z + 14), (16, 12, 14), p=7, cuts=2, rot=(0, 0, 10))
    tip = kit.lattice_mast(pt.g(CS["gunmetal"], outline=0.0), mx, my, CS_BANK_Z + 28, 92, base=7.0)
    st.amb("blink", "bd.light", (tip[0], tip[1], tip[2] + 1), "far", period=1600, tint=0xF06A9A)
    # 5. a factory chimney by the water, smoking
    cyl(pt.g(CS["brick"], outline=0.4), (-20, 600, CS_BANK_Z), (-20, 600, CS_BANK_Z + 66), 5.6, 4.4, bevel=0.5, segs=14)
    cyl(pt.g(CS["dark"], outline=0.2), (-20, 600, CS_BANK_Z + 62), (-20, 600, CS_BANK_Z + 66), 4.8, bevel=0.2, segs=14)
    st.amb("emit", "bd.puff", (-20, 600, CS_BANK_Z + 70), rate=0.6, speed=8, scale=1.2, tint=0xD8D6D0, alpha=0.42, life=4200, drift=6)
    # 6. the suspension bridge over the bay's mouth, its lamps lit at night
    bx0, bx1, by, bz, bh = CS_BRIDGE
    tops = kit.suspension_bridge(pt, bx0, bx1, by, bz, bh, steel=CS["olive"], steel_dk=CS["olive_dk"], deck=CS["grey_dk"], cable=CS["olive_dk"])
    for tx, ty, tz in tops:
        st.light((tx, ty - 5, tz + 2), 3)
    for k in range(3):
        st.light((bx0 + (bx1 - bx0) * (0.3 + 0.2 * k), by - 5, bz + 6), 3)
    # trees along the far quay and on the headland
    gt, gt2, gtr = pt.g(CS["tree"], outline=0.3), pt.g(CS["tree_dk"], outline=0.3), pt.g(CS["wood"], outline=0.0)
    for k in range(16):
        x = -250 + k * 68 + rnd.uniform(-10, 10)
        if 800 < x:
            continue
        kit.broadleaf(gt if k % 2 else gt2, gtr, x, 580, rnd.uniform(14, 18), rnd.uniform(6, 7.5), seed=600 + k, z=CS_BANK_Z - 1)
    for k in range(10):
        x = rnd.uniform(1260, 1460)
        kit.broadleaf(gt if k % 2 else gt2, gtr, x, 560 + rnd.uniform(0, 60), rnd.uniform(14, 20), rnd.uniform(6, 8), seed=700 + k, z=CS_RIVER_Z + 50)
    for p_ in lights[:8]:
        st.light(p_, 3)
    pt.flush(st)


def cs_mid(st, P):
    pt = Parts()
    rnd = random.Random(67)
    # the near bank: a paved quay with a grass verge
    g, ga = pt.g(CS["grass"], outline=0.0), pt.g(CS["quay"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g, (x, 80, 8), (96, 60, 40 + rnd.uniform(0, 8)), seed=i, jag=0.04, p=2.6)
    box(ga, (600, 120, 45), (900, 18, 3), p=6, cuts=2)
    box(pt.g(CS["quay_dk"], outline=0.4), (600, 104, 41), (900, 2.4, 6), p=5, cuts=1)
    # a railing with lamp posts along the river (the lamps glow at night)
    gst = pt.g(CS["gunmetal"], outline=0.3)
    for k, x in enumerate((-180, 60, 520, 760, 1000, 1240)):
        gst.capsule((x, 112, 48), (x, 112, 92), 0.9, 0.7)
        gst.capsule((x, 112, 92), (x + 6, 112, 94), 0.6)
        pt.g(CS["cream"], outline=0.3).sphere((x + 6.6, 111, 92.6), 1.8)
        if k in (1, 2, 4):
            st.light((x + 6.6, 109, 92), 4)
    # 1. warehouses with water towers on their roofs (x -260..170, 590-930)
    for k, (x, y, w, h, saw, yaw) in enumerate(((-190, 90, 120, 50, 3, -8), (80, 96, 110, 44, 0, 10), (680, 92, 140, 54, 4, -10), (880, 100, 100, 40, 0, 8))):
        win = kit.warehouse(pt, x, y, 40, w, 34, h, brick=CS["brick"] if k % 2 == 0 else CS["tan_dk"], brick_dk=CS["brick_dk"] if k % 2 == 0 else CS["olive_dk"],
                            roof=CS["roof"], win=CS["dark"], trim=CS["khaki"], yaw=yaw, saw=saw, seed=10 + k)
        if k in (0, 2):
            st.light(win, 4)
    kit.water_tower(pt, -160, 96, 90 + 8, 46, 9, wood=CS["wood"], roof=CS["roof"], steel=CS["gunmetal"])
    kit.water_tower(pt, 110, 102, 84 + 2, 40, 8, wood=CS["wood"], roof=CS["roof"], steel=CS["gunmetal"])
    kit.water_tower(pt, 720, 98, 94 + 8, 50, 10, wood=CS["wood"], roof=CS["roof"], steel=CS["gunmetal"])
    st.amb("emit", "bd.puff", (650, 86, 104), rate=0.4, speed=9, scale=0.8, tint=0xE2E0DA, alpha=0.36, life=2600, drift=5)
    # 2. the freight siding (x 180-560: low; the landmark tower stands behind it at the game's camera):
    # rails, standing wagons, buffers
    grl, gsl = pt.g(CS["rail"], outline=0.0), pt.g(CS["sleeper"], outline=0.0)
    for y in (56, 62):
        grl.capsule((-260, y, 40.6), (1460, y, 40.6), 0.5)
    for x in range(-260, 1460, 6):
        box(gsl, (x, 59, 40.2), (1.0, 5.0, 0.4), p=4, cuts=1)
    for k, x in enumerate((230, 262, 294, 470)):
        fauna.train_car(body="#7E6A5E" if k % 2 else "#62664A", roof="#4E4A46", window="#3E3A40", size=1.0, length=28)(kit.StaticRig(pt, (x, 74, 40), s=1.0))
    # 3. telegraph poles with sagging wires along the line
    gp, gwr = pt.g(CS["wood"], outline=0.4), pt.g(CS["dark"], outline=0.0, highlight=False)
    poles = list(range(-240, 1480, 120))
    for x in poles:
        gp.capsule((x, 44, 38), (x, 44, 100), 1.0, 0.8)
        gp.capsule((x - 7, 44, 96), (x + 7, 44, 96), 0.6)
    for a, b in zip(poles, poles[1:]):
        for dz in (95.6,):
            pts = [(a + (b - a) * t / 8, 43.4, dz - 6 * math.sin(math.pi * t / 8)) for t in range(9)]
            for p0, p1 in zip(pts, pts[1:]):
                gwr.capsule(p0, p1, 0.2)
    # 4. a crane on the quay, crates and a parked truck (x 1040-1300)
    gc = pt.g(CS["olive"], outline=0.4)
    for dx in (-8, 8):
        gc.capsule((1110 + dx, 104, 46), (1110 + dx * 0.4, 104, 120), 1.4, 1.0)
    gc.capsule((1100, 104, 120), (1180, 104, 128), 1.2)
    gc.capsule((1096, 104, 120), (1080, 104, 112), 1.0)
    box(gc, (1110, 104, 122), (8, 5, 5), p=6, cuts=1)
    pt.g(CS["dark"], outline=0.0).capsule((1172, 104, 127), (1172, 104, 96), 0.25)
    gcr = pt.g(CS["wood"], outline=0.4)
    for k, (x, z) in enumerate(((1160, 40), (1176, 40), (1168, 52), (1200, 40))):
        box(gcr, (x, 90, z + 6), (7, 7, 6), p=5, cuts=1)
    fauna.truck(body="#7E8064", cab="#62664A", tank="#8A8C74", size=1.6)(kit.StaticRig(pt, (1260, 70, 40), flip=True))
    # trees and a few bushes
    gt, gt2, gtr = pt.g(CS["tree"], outline=0.5), pt.g(CS["tree_dk"], outline=0.5), pt.g(CS["wood"], outline=0.4)
    for k, (x, y, h, r) in enumerate(((-250, 130, 110, 32), (580, 128, 100, 30), (1000, 132, 120, 34), (1380, 128, 116, 34))):
        kit.broadleaf(gt if k % 2 else gt2, gtr, x, y, h, r, seed=900 + k, z=40)
    pt.flush(st)


def cs_props():
    bx0, bx1, by, bz, bh = CS_BRIDGE
    deck = _scr((0, by - 4, bz + 1.2), CS_FAR_E)[1]
    river = _scr((0, 500, CS_RIVER_Z), CS_FAR_E)[1]
    px_, py_ = CS_PIGEONS
    ring = [[i * 2, round(px_ + 70 * math.cos(math.pi * i / 3)), round(py_ + 14 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    pigeon = fauna.bird(body="#8A8C94", wing="#6E7078", beak="#C8A060", span=10, size=0.8)
    plist = [
        Prop("car", "far", fauna.car(size=0.9), [{}], (20, 10, 2), deck),
        Prop("bus", "far", fauna.bus(size=0.8), [{}], (26, 12, 2), deck),
        Prop("car2", "far", fauna.car(body="#B8A67A", roof="#E2DCCC", size=0.9), [{}], (20, 10, 2), deck),
        Prop("tug", "far", fauna.tug(size=1.0), [{}], (40, 26, 3), river),
        Prop("loco", "mid", fauna.diesel_loco(size=1.3), [{}], (44, 20, 3), CS_TRAIN_Y),
        Prop("wagon", "mid", fauna.train_car(body="#7E6A5E", roof="#4E4A46", window="#3E3A40", size=1.3, length=26), [{}], (40, 20, 3), CS_TRAIN_Y),
        Prop("pigeon", "mid", pigeon, [fauna.bird_pose(f) for f in range(5)], (34, 20, 20), ring[0][2]),
    ]
    sprites = [
        # traffic over the bridge: three vehicles 38 lu apart, out of the city and over the bay
        {"kind": "path", "layer": "far", "fps": 1, "periodS": 50,
         "keys": [[0, bx0 - 10, deck, 0], [3, bx0 + 20, deck, 1], [44, bx1 - 30, deck, 1], [47, bx1, deck, 0], [50, bx1, deck, 0]],
         "group": [{"frames": ["car_0"]}, {"frames": ["bus_0"], "dx": -40}, {"frames": ["car2_0"], "dx": -76}]},
        # the tug works up the river under the bridge (clear of the far bank's towers: their feet are behind the quay)
        {"kind": "path", "layer": "far", "fps": 1, "periodS": 160,
         "keys": [[0, 1300, river, 0], [8, 1270, river, 1], [140, 820, river, 1], [148, 790, river, 0], [160, 790, river, 0]], "group": [{"frames": ["tug_0"]}]},
        # a freight train along the bank every minute
        {"kind": "path", "layer": "mid", "fps": 1, "periodS": 60,
         "keys": [[0, -360, CS_TRAIN_Y, 1], [26, 1580, CS_TRAIN_Y, 1], [60, 1580, CS_TRAIN_Y, 1]],
         "group": [{"frames": ["loco_0"]}, {"frames": ["wagon_0"], "dx": -44}, {"frames": ["wagon_0"], "dx": -82}, {"frames": ["wagon_0"], "dx": -120}]},
        {"kind": "path", "layer": "mid", "fps": 6, "periodS": 12, "keys": ring,
         "group": [{"frames": ["pigeon_4", "pigeon_0", "pigeon_1", "pigeon_2", "pigeon_3"]}, {"frames": ["pigeon_0", "pigeon_1", "pigeon_2", "pigeon_3", "pigeon_4"], "dx": -22, "dy": 8, "phase": 2}]},
    ]
    return plist, sprites


# -- Desert Airbase (round 2) ------------------------------------------------------------------------
DA_PAL = dict(skyTop=0x9CB8C8, skyBottom=0xF2E6CC, light=0xFFF4DC, far=0xB0A48C, mid=0x9A8E70, near=0x7A7058)
DA = dict(
    sand=0xCDB88A, sand_dk=0xB8A276, sand_lt=0xDCCAA0, mesa=0xAE8C6E, mesa_dk=0x8E7058, khaki=0xB8A67A, khaki_dk=0x9C8C64,
    gun=0x3A3F45, metal=0x9A9886, metal_dk=0x7E7C6E, concrete=0xB4AE9C, concrete_dk=0x9C9684, mark=0xE6E0D0, white=0xDCD6C6,
    glass=0x5A6A6E, olive=0x7E8064, olive_dk=0x686C54, scrub=0x8A8A68, scrub_dk=0x707256, wood=0x7A6450, drum=0x6E6A52,
    red=0xA05E50, tank=0xC8C2B0, strata=0x9A7C62, strata_lt=0xC4A684, cap=0x7E6450, gully=0x7A6250,
    palm=0x7A8452, palm_dk=0x626C44, trunk=0x8A7458,
)
DA_SKY = {"top": "#9CB8C8", "bottom": "#F2E6CC", "horizon": "#F6ECD6", "cloudTint": "#FAF4E8", "celestial": "sun",
          "sunAt": [260, -540, 44], "clouds": 0.45, "smog": 0.12}
DA_FAR_E = math.radians(8.0)
DA_MID_E = math.radians(12.0)
DA_FIELD_Z = 68.0                 # round 3: up from 56, so the runway and the apron show over the mid strip
DA_RUNWAY_Y = 270.0
DA_RUNWAY_SCR = -round((DA_FIELD_Z + 1.5) * math.cos(DA_FAR_E) + DA_RUNWAY_Y * math.sin(DA_FAR_E), 1)
DA_DISH = (150.0, 380.0, DA_FIELD_Z + 118.0)
DA_SOCK = (240.0, 60.0, 128.0)   # in the gap of the sandbag emplacement


def _scr(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


def _quonset(gmet, gmet2, gd, x, y, z, r, L, yaw=0.0, ribs=5):
    """A quonset hangar: a corrugated half-barrel with ribs round it, lying along a direction turned `yaw`
    degrees from the depth axis (0: its dark open door faces the camera; turned, its long side shows)."""
    a = math.radians(yaw)
    dx, dy = math.sin(a), math.cos(a)
    p0, p1 = (x - dx * L / 2, y - dy * L / 2, z), (x + dx * L / 2, y + dy * L / 2, z)
    tmp = Geo()
    cyl(tmp, p1, p0, r, bevel=1.4, segs=28)
    tmp.clip((x, y, z), (0, 0, -1))
    kit._merge(gmet, tmp)
    for k in range(ribs):
        t = (k + 0.5) / ribs
        c = (p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, z)
        ring = Geo()
        cyl(ring, (c[0] - dx * 0.8, c[1] - dy * 0.8, z), (c[0] + dx * 0.8, c[1] + dy * 0.8, z), r + 0.5, bevel=0.2, segs=28)
        ring.clip(c, (0, 0, -1))
        kit._merge(gmet2, ring)
    door = [(p0[0] + r * 0.8 * math.cos(math.pi * k / 12), z + r * 0.8 * math.sin(math.pi * k / 12)) for k in range(13)]
    gd.slab(door, p0[1] - 0.8, 1.2, rot=(0, 0, -yaw), origin=(p0[0], p0[1], z))
    return (p0[0] - dx * 2, p0[1] - dy * 2, z + r * 0.9)


def da_back(st, P):
    """Mesas on the horizon (low under the moons' place, x 820-980)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    gm, gb, gt = pt.g(hz(DA["mesa"], 0.32), outline=0.0), pt.g(hz(DA["strata"], 0.32), outline=0.0), pt.g(hz(DA["sand_dk"], 0.3), outline=0.0)
    for x, rx, h, seed in ((-200, 120, 150, 1), (-20, 50, 170, 2), (190, 90, 130, 3), (420, 140, 160, 4), (640, 60, 140, 5), (900, 70, 40, 6),
                           (1120, 130, 150, 7), (1300, 46, 170, 8), (1460, 100, 130, 9)):
        kit.butte(gm, [gb], gt, x, 1500, -60, rx, rx * 0.55, h + 60, seed=seed, bands=((0.3, 0.38), (0.6, 0.66)))
    pt.flush(st)


def da_far(st, P):
    pt = Parts()
    rnd = random.Random(61)
    fz = DA_FIELD_Z
    # 1. buttes and mesas behind the field (round 3: tall cliffed columns and two slender spires on talus
    #    cones; none over x 820-1000, where the sky themes hang their moons) and the rise the field stands on
    gm, gt = pt.g(DA["mesa"], outline=0.3), pt.g(mixc(DA["mesa_dk"], DA["sand_dk"], 0.45), outline=0.2)
    gbs = [pt.g(DA["strata_lt"], outline=0.0), pt.g(DA["strata"], outline=0.0)]
    gcap = pt.g(DA["cap"], outline=0.3)
    for x, y, rx, ry, h, seed, tier in ((-170, 650, 84, 46, 160, 11, 0.22), (-30, 640, 30, 22, 170, 15, 0.0), (330, 640, 118, 58, 140, 12, 0.18),
                                        (700, 650, 36, 24, 150, 16, 0.0), (1090, 650, 76, 42, 170, 13, 0.0), (1215, 640, 28, 20, 160, 17, 0.0),
                                        (1390, 640, 116, 56, 150, 14, 0.2)):
        kit.butte(gm, gbs, gt, x, y, 0, rx, ry, h, seed=seed, g_cap=gcap, bands=((0.3, 0.37), (0.6, 0.64)), tier=tier)
    # low dunes behind the buttes, up over the back strip's foot (review 2: the far mesas floated over a
    # band of sky where the back strip ends; round 3: behind the buttes, so their talus cones show)
    gdn = pt.g(mixc(DA["sand_dk"], P["skyBottom"], 0.25), outline=0.0)
    for i in range(12):
        x = -300 + i * 160 + rnd.uniform(-20, 20)
        kit.hill(gdn, x, 790, -10, rnd.uniform(140, 180), 70, rnd.uniform(112, 122), seed=40 + i, jag=0.03, p=2.6)
    gs = pt.g(DA["sand"], outline=0.0)
    for i in range(12):
        x = -300 + i * 160 + rnd.uniform(-20, 20)
        kit.hill(gs, x, 360, -10, rnd.uniform(130, 170), 120, fz + 10 + rnd.uniform(-2, 2), seed=20 + i, jag=0.02, p=3.0)
    # 2. the runway: concrete with a dashed centre line, edge lights
    gc = pt.g(DA["concrete"], outline=0.0)
    box(gc, (600, DA_RUNWAY_Y, fz), (1000, 26, 1.6), p=6, cuts=2)
    gmk = pt.g(DA["mark"], outline=0.0, highlight=False)
    for x in range(-380, 1600, 60):
        box(gmk, (x, DA_RUNWAY_Y, fz + 1.7), (14, 1.4, 0.3), p=4, cuts=1)
    for x in range(-300, 1560, 200):   # 10 edge lights (16 lights per scene: these, the tower, the hangars)
        st.light((x, DA_RUNWAY_Y - 26, fz + 3), 3.4)
    # 3. quonset hangars: corrugated half-barrels with dark open doors (round 3: two turned, so their long
    #    corrugated sides show), and a row of small huts (the barracks) on the right
    gmet, gmet2, gd = pt.g(DA["metal"], finish="metal", outline=0.5), pt.g(DA["metal_dk"], outline=0.0), pt.g(DA["gun"], outline=0.0, highlight=False)
    for (x, y, r, L, yaw) in ((300, 350, 46, 90, 0), (448, 372, 38, 84, 62), (800, 364, 42, 90, -56)):
        lamp = _quonset(gmet, gmet2, gd, x, y, fz, r, L, yaw)
        st.light(lamp, 5)
    for k in range(4):
        _quonset(gmet, gmet2, gd, 1010 + k * 44, 420 + k * 6, fz, 15, 52, 90, ribs=3)
    gpf, gpf2, gpt = pt.g(DA["palm"], outline=0.3), pt.g(DA["palm_dk"], outline=0.3), pt.g(DA["trunk"], outline=0.3)
    for i, (x, y, h) in enumerate(((990, 396, 44), (1196, 404, 50), (1222, 410, 40), (232, 380, 46), (256, 388, 38))):
        kit.palm(gpf, gpf2, gpt, x, y, h, lean=0.2 if i % 2 else -0.2, seed=80 + i, z=fz, r=0.55)
    # 4. the control tower: a block base, a tall shaft, a glazed cab with a gallery, a mast with a beacon
    tx = 600.0
    gw = pt.g(DA["white"], outline=0.5)
    box(pt.g(DA["concrete_dk"], outline=0.4), (tx, 382, fz + 4), (24, 20, 4), p=5, cuts=1)
    box(gw, (tx, 382, fz + 62), (16, 15, 58), p=6, cuts=2, taper=(1.12, 0.94))
    box(pt.g(DA["concrete_dk"], outline=0.4), (tx, 382, fz + 122), (24, 21, 2.4), p=5, cuts=1)
    pt.g(DA["glass"], finish="gloss", outline=0.5).blob((tx, 382, fz + 134), (20, 17, 10), p=4.0, taper=(0.86, 1.0))
    box(gw, (tx, 382, fz + 146), (22, 19, 2.4), p=5, cuts=1)
    pt.g(DA["gun"], outline=0.3).capsule((tx + 8, 382, fz + 148), (tx + 8, 382, fz + 176), 0.8)
    st.amb("blink", "bd.light", _scr_far3((tx + 8, 382, fz + 180)), period=1400, tint=0xF2D8C8)
    gwin = pt.g(DA["gun"], outline=0.0, highlight=False)
    for k in range(5):
        box(gwin, (tx, 366.4, fz + 24 + k * 18), (4, 0.6, 4), p=4, cuts=1)
    st.light((tx, 364, fz + 134), 7)
    # 5. the radar dish's lattice mast (the dish turns as a prop), fuel tanks, parked planes
    dx, dy, dz = DA_DISH
    gi = pt.g(DA["gun"], outline=0.3)
    for sx in (-10, 10):
        gi.capsule((dx + sx, dy, fz), (dx + sx * 0.3, dy, dz - 6), 1.6)
    for k in range(5):
        z0 = fz + k * (dz - 6 - fz) / 5
        gi.capsule((dx - 10 + k * 1.4, dy, z0), (dx + 10 - (k + 1) * 1.4, dy, z0 + (dz - 6 - fz) / 5), 0.9)
    gt = pt.g(DA["tank"], finish="metal", outline=0.5)
    for (x, r) in ((930, 22), (980, 18)):
        cyl(gt, (x, 380, fz), (x, 380, fz + r * 1.2), r, bevel=1.2, segs=24)
        gt.lathe([(0, 0), (r, 0), (0.4, r * 0.3), (0, r * 0.32)], (x, 380, fz + r * 1.2), (x, 380, fz + r * 1.5), segs=24)
    # parked planes on the apron (round 3: the transport model, small; two between the hangars and the tower)
    for (x, y, s_, fl) in ((1120, 330, 0.62, False), (1250, 336, 0.56, True), (60, 330, 0.56, False), (530, 318, 0.5, True), (690, 322, 0.52, False)):
        fauna.prop_plane(body="#8A8C7A", wing="#7A7C6C", size=s_)(kit.StaticRig(pt, (x, y, fz + 1), flip=fl))
    kit.water_tower(pt, 1262, 452, fz, 64, 11, wood=DA["metal"], wood_dk=DA["metal_dk"], roof=DA["gun"], steel=DA["gun"])
    # scrub on the sand
    gsc = pt.g(DA["scrub"], outline=0.0)
    for i in range(40):
        x = rnd.uniform(-260, 1460)
        kit.round_bush(gsc, x, rnd.uniform(296, 330), rnd.uniform(3, 6), seed=300 + i, z=fz - 2)
    pt.flush(st)


def _scr_far3(p):
    """A 3D point unchanged (the stage projects ambient specs itself)."""
    return p


def da_mid(st, P):
    pt = Parts()
    rnd = random.Random(67)
    # the sand bank with low dunes and scrub
    g, g2 = pt.g(DA["sand"], outline=0.0), pt.g(DA["sand_lt"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g if i % 2 else g2, (x, 80, 6), (100, 54, 40 + rnd.uniform(0, 10)), seed=i, jag=0.04, p=2.6)
    gsc, gsc2 = pt.g(DA["scrub"], outline=0.4), pt.g(DA["scrub_dk"], outline=0.4)
    for i in range(22):
        x = rnd.uniform(-250, 1450)
        kit.round_bush(gsc if i % 2 else gsc2, x, rnd.uniform(50, 86), rnd.uniform(6, 11), seed=1000 + i, z=40, flat=0.6)
    # the sandbag emplacement (x 140-330): stacked sacks with a gap, a sign post
    gb, gb2 = pt.g(DA["khaki"], outline=0.4), pt.g(DA["khaki_dk"], outline=0.4)
    for row in range(3):
        for k in range(12):
            x = 120 + k * 20 + (row % 2) * 10
            if 216 < x < 262:
                continue
            (gb if (k + row) % 2 else gb2).blob((x, 70, 45 + row * 10.4), (10.6, 8.0, 5.8), p=2.6)
    # a transport parked on the sand (x 1180, round 3: moved right to make room for the big hangar)
    gwh = pt.g(DA["gun"], outline=0.4)
    fauna.prop_plane(body="#8A8C7A", wing="#7A7C6C", size=1.9)(kit.StaticRig(pt, (1180, 80, 37)))
    # oil drums and crates
    gdr = pt.g(DA["drum"], finish="metal", outline=0.4)
    for (x, z) in ((330, 40), (343, 40), (336, 56)):
        cyl(gdr, (x, 70, z), (x, 70, z + 15), 6.2, bevel=0.8, segs=14)
    gcr = pt.g(DA["wood"], outline=0.4)
    for (x, z, s_) in ((784, 40, 1.0), (804, 40, 0.8), (792, 60, 0.7)):
        box(gcr, (x, 72, z + 10 * s_), (10 * s_, 10 * s_, 10 * s_), p=5, cuts=1)
    # the radio shack (x 860) with an antenna, a lamp
    gw = pt.g(DA["white"], outline=0.5)
    box(gw, (860, 84, 56), (28, 18, 16), p=6, cuts=2)
    box(pt.g(DA["khaki_dk"], outline=0.4), (860, 84, 74), (31, 21, 2.4), p=5, cuts=1)
    gwin = pt.g(DA["gun"], outline=0.0, highlight=False)
    box(gwin, (848, 65.4, 54), (5, 0.6, 9), p=4, cuts=1)
    box(gwin, (872, 65.4, 60), (6, 0.6, 4.4), p=4, cuts=1)
    st.light((872, 64, 60), 6)
    gwh.capsule((880, 90, 76), (880, 90, 150), 0.8)
    gwh.capsule((870, 90, 140), (890, 90, 140), 0.5)
    st.amb("blink", "bd.light", (880, 90, 152), period=1600, tint=0xF2D8C8)
    # the windsock's pole (the sock is a prop)
    sx, sy, sz = DA_SOCK
    gwh.capsule((sx, sy, 40), (sx, sy, sz + 2), 1.1)
    # rocks
    gr = pt.g(DA["mesa_dk"], outline=0.5)
    for i in range(10):
        rock(gr, (rnd.uniform(-240, 1440), rnd.uniform(34, 50), 38), (rnd.uniform(7, 12), 7, rnd.uniform(5, 8)), seed=900 + i, jag=0.2)
    # round 3 (review 2: sparse): a big hangar in the middle of the near half with a transport nosing out
    # of its open door and the fuel truck by it, a second fuel truck and a jeep, a water tower, a perimeter
    # fence along the back
    hx, hy, hr, hl = 560.0, 106.0, 54.0, 60.0
    hf = 48.0   # its floor stands on the sand bank (lower, the bank hid its door)
    gmet, gmet2, gd = pt.g(DA["metal"], finish="metal", outline=0.5), pt.g(DA["metal_dk"], outline=0.3), pt.g(DA["gun"], outline=0.0, highlight=False)
    tmp = Geo()
    cyl(tmp, (hx, hy + hl / 2, hf), (hx, hy - hl / 2, hf), hr, bevel=1.4, segs=32)
    tmp.clip((hx, hy, hf), (0, 0, -1))
    kit._merge(gmet, tmp)
    for k in range(6):
        yy = hy - hl / 2 + (k + 0.5) * hl / 6
        ring = Geo()
        cyl(ring, (hx, yy - 0.9, hf), (hx, yy + 0.9, hf), hr + 0.6, bevel=0.2, segs=32)
        ring.clip((hx, yy, hf), (0, 0, -1))
        kit._merge(gmet2, ring)
    door = [(hx + hr * 0.82 * math.cos(math.pi * k / 14), hf + hr * 0.82 * math.sin(math.pi * k / 14)) for k in range(15)]
    gd.slab(door, hy - hl / 2 - 0.8, 1.2)
    st.light((hx, hy - hl / 2 - 2, hf + hr * 0.9), 6)
    fauna.prop_plane(body="#8A8C7A", wing="#7A7C6C", size=1.7)(kit.StaticRig(pt, (hx - 6, hy - hl / 2 - 16, hf - 1), flip=True))
    fauna.truck(size=1.7)(kit.StaticRig(pt, (700, 62, 38), flip=True))
    fauna.truck(size=1.6)(kit.StaticRig(pt, (1340, 70, 38)))
    fauna.jeep(size=1.8)(kit.StaticRig(pt, (400, 56, 38)))
    kit.water_tower(pt, -170, 110, 40, 92, 13, wood=DA["metal"], wood_dk=DA["metal_dk"], roof=DA["gun"], steel=DA["gun"])
    gfe = pt.g(DA["gun"], outline=0.0)
    for x0, x1 in ((-250, 494), (628, 1460)):   # the fence opens behind the big hangar
        for k in range(int((x1 - x0) / 34) + 1):
            x = x0 + k * 34
            gfe.capsule((x, 136, 38), (x, 136, 62), 0.6)
        for zz in (48, 56, 61):
            gfe.capsule((x0, 136, zz), (x0 + int((x1 - x0) / 34) * 34, 136, zz), 0.25)
    # dust drifting across the sand (pale puffs, blown along)
    for x in (300, 760, 1000):
        st.amb("emit", "bd.puff", (x, 40, 46), rate=0.35, speed=3, scale=2.4, tint=0xE8DCC0, alpha=0.24, life=5200, drift=14)
    # date palms by the radio shack and on the left (a set with Desert Bunker, whose towers stand among palms)
    gpf, gpf2, gpt = pt.g(DA["palm"], outline=0.4), pt.g(DA["palm_dk"], outline=0.4), pt.g(DA["trunk"], outline=0.4)
    for i, (x, y, h, lean) in enumerate(((-60, 92, 104, 0.22), (-20, 100, 84, -0.18), (918, 96, 112, -0.2), (956, 104, 92, 0.24), (1260, 98, 100, 0.2))):
        kit.palm(gpf, gpf2, gpt, x, y, h, lean=lean, seed=60 + i, z=38, r=0.9)
    pt.flush(st)


def _dish(rig):
    rig.joint("d", "all", (0, 0, 0))
    g = Geo().lathe([(0.01, 0), (14, 2.6), (16, 6.4), (15, 6.8), (0.01, 3.2)], (0, 0, 0), (-0.6, -1, 0.2), segs=22)
    rig.part("d", g, "#D8D2C2", finish="gloss", outline=0.4)
    rig.part("d", Geo().capsule((0, -1, 0.5), (0, -10, 1.2), 0.8), "#3A3F45", outline=0.2)
    rig.part("d", Geo().capsule((0, 3, -2), (0, 3, -9), 1.4), "#3A3F45", outline=0.3)


def _sock(rig):
    """The windsock: a striped cone on a ring, its tail joint flutters (frames)."""
    rig.joint("s", "all", (0, 0, 0))
    rig.part("s", Geo().lathe([(3.4, 0), (3.6, 0), (3.6, 1.0), (3.4, 1.0)], (0, 0, 0), (1, 0, 0), segs=14), "#5E5C54", outline=0.3)
    for k in range(4):
        j = f"t{k}"
        rig.joint(j, "s" if k == 0 else f"t{k - 1}", (1 + k * 6, 0, 0))
        r0, r1 = 3.4 - k * 0.6, 3.4 - (k + 1) * 0.6
        rig.part(j, Geo().lathe([(r0, 0), (r1, 6.2), (r1 - 0.3, 6.2), (r0 - 0.3, 0)], (1 + k * 6, 0, 0), (7 + k * 6, 0, 0), segs=14),
                 "#C8A890" if k % 2 == 0 else "#E6E0D0", outline=0.4)


def _sock_pose(f):
    a = [(-6, -4, -2, 0), (-4, 2, 6, 8), (-6, -2, 4, 2), (-8, -8, -4, -6)][f]
    return {"s": {"r": -10}, **{f"t{k}": {"r": a[k]} for k in range(4)}}


def da_props():
    dish = _scr(DA_DISH, DA_FAR_E)
    sock = _scr(DA_SOCK, DA_MID_E)
    vulture = fauna.bird(body="#4E4440", wing="#3E3632", belly="#6E625A", beak="#C8B090", span=17, size=1.1)
    ring = [[i * 3, round(860 + 90 * math.cos(math.pi * i / 3)), round(-262 + 16 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    y = DA_RUNWAY_SCR
    plist = [
        Prop("dish", "far", _dish, [{"d": {"rz": a}} for a in (-40, -14, 14, 40)], (40, 22, 18), dish[1]),
        Prop("sock", "mid", _sock, [_sock_pose(f) for f in range(4)], (40, 10, 14), sock[1]),
        Prop("plane", "far", fauna.prop_plane(size=1.0, prop_frame=0), [{}], (100, 34, 4), y),
        Prop("planeb", "far", fauna.prop_plane(size=1.0, prop_frame=1), [{}], (100, 34, 4), y),
        Prop("planeu", "far", fauna.prop_plane(size=1.0, prop_frame=1, gear=False), [{}], (100, 34, 4), y),
        Prop("vulture", "far", vulture, [fauna.bird_pose(f) for f in range(5)], (50, 26, 26), ring[0][2]),
    ]
    sprites = [
        {"kind": "loop", "layer": "far", "frames": [f"dish_{k}" for k in range(4)], "fps": 1.5, "pingpong": True, "at": dish},
        {"kind": "loop", "layer": "mid", "frames": [f"sock_{k}" for k in range(4)], "fps": 4, "at": sock},
        {"kind": "path", "layer": "far", "fps": 12, "periodS": 45,
         "keys": [[0, 1560, y, 0, 0], [0.6, 1500, y, 1, 0], [10, 900, y, 1, 0], [15, 420, y, 1, 0], [17.4, 120, y - 22, 1, 0], [20, -200, y - 90, 1, 0],
                  [21.2, -360, y - 120, 0, 0]],
         "group": [{"frames": ["plane_0", "planeb_0"]}]},
        {"kind": "path", "layer": "far", "fps": 7, "periodS": 18, "keys": ring,
         "group": [{"frames": ["vulture_4", "vulture_4", "vulture_4", "vulture_0", "vulture_1", "vulture_2", "vulture_3"]},
                   {"frames": ["vulture_4", "vulture_4", "vulture_0", "vulture_1", "vulture_2", "vulture_3", "vulture_4"], "dx": -30, "dy": 10, "phase": 3}]},
    ]
    return plist, sprites


# -- Monsoon River (round 3; Epic, Wardrobe Crate; a set with Jungle Outpost) --------------------------
MR_PAL = dict(skyTop=0x9AAAAA, skyBottom=0xD8DCD4, light=0xF2F2EA, far=0x7E8C7E, mid=0x66765E, near=0x4E5C48)
MR = dict(
    jungle=0x4F7A4A, jungle_dk=0x3F6440, jungle_lt=0x66905C, moss=0x6E8A58, mud=0x7A6A52, mud_lt=0x8E7E64, mist=0xD8DCD4,
    rock=0x7E8478, rock_dk=0x646A60, temple=0x9A9A88, temple_dk=0x7E7E6E, water=0x8A9078, water_hi=0xC8CEC0, fall=0xD6DCD6,
    fall2=0xBCC6C2, thatch=0x7A6A4A, thatch_dk=0x5E5038, bamboo=0xA49A74, wood=0x6E5A46, wood_dk=0x564636, palm=0x5E7E4A, palm_dk=0x4A6A3E,
    trunk=0x6E5E4C, rope=0x8A7A5E, lamp=0x4A4440, dark=0x2E302C,
)
MR_SKY = {"top": "#9AAAAA", "bottom": "#D8DCD4", "horizon": "#E2E4DE", "cloudTint": "#E6E8E4", "celestial": "sun",
          "sunAt": [300, -520, 40], "clouds": 0.9, "smog": 0.2}
MR_FAR_E = math.radians(8.0)
MR_MID_E = math.radians(12.0)
MR_FALL = (420.0, 560.0, 230.0, 168.0)     # the great waterfall (far): x, depth, lip z, drop
MR_FALL2 = (1170.0, 600.0, 190.0, 124.0)   # the second fall (far)
MR_RIVER_Y = 116.0                         # the river along the mid strip (its centre, depth)
MR_BOAT_Y = -64.0                          # the patrol boat's waterline (mid, screen lu)
MR_FOG_FAR = -120.0
MR_FOG_MID = -74.0


def mr_back(st, P):
    """Misty jungle ridges, layer behind layer (lowest under the moons' place)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    ridge(st, hz(MR["jungle_dk"], 0.6), -300, 1500, -40, 190, 1500, 23, lumps=10, jag=0.12, peaks=False)
    ridge(st, hz(MR["jungle"], 0.5), -300, 1500, -40, 150, 1360, 29, lumps=13, jag=0.1, peaks=False)


def _falls(pt, st, fall, rnd, width=5):
    """A waterfall from a cliff lip: sheeted columns, a white splash, mist at its foot (the sheen is a prop)."""
    fx, fy, fz, drop = fall
    gw, gw2 = pt.g(MR["fall"], finish="gloss", outline=0.4), pt.g(MR["fall2"], finish="gloss", outline=0.3)
    for k in range(width):
        x = fx - (width - 1) * 3.5 + k * 7
        L = drop * rnd.uniform(0.92, 1.0)
        (gw if k % 2 == 0 else gw2).lathe([(0.01, 0), (5.6, 2), (4.8, L * 0.5), (6.2, L * 0.96), (0.01, L)], (x, fy - 18, fz), (x, fy - 18, fz - L), segs=9)
    pt.g(MR["water"], finish="gloss", outline=0.3).blob((fx, fy - 20, fz - drop - 1), (width * 6 + 10, 10, 1.6), p=2.4, cuts=3)
    gf2 = pt.g(MR["mist"], outline=0.15)
    for k in range(width + 3):
        t = k / (width + 2)
        r = rnd.uniform(4, 8) * (1.2 - 0.5 * abs(2 * t - 1))
        (gw if k % 2 else gf2).blob((fx - width * 5 + t * width * 10, fy - 24 - rnd.uniform(0, 3), fz - drop + r * 0.6 + rnd.uniform(0, 3)), (r, r * 0.7, r * 0.75),
                                    p=2.0, cuts=3)
    for k in range(3):
        gf2.blob((fx - 10 + k * 10, fy - 22, fz - drop + 12 + k % 2 * 4), (rnd.uniform(9, 13), 6, rnd.uniform(6, 8)), p=2.0, cuts=3)


def _canopy(gs, x, y, z, rx, ry, h, n, rnd, p=2.2, r=(12, 22)):
    """Dense jungle canopy over a hill's camera face: round crowns packed on its surface (front points of the
    hill's superellipsoid), smaller toward the crest."""
    for k in range(n):
        u = rnd.uniform(-0.96, 0.96)
        v = rnd.uniform(0.04, 0.97) ** 0.8
        q = 1 - abs(u) ** p - v ** p
        if q <= 0.02:
            continue
        rc = rnd.uniform(*r) * (1.0 - 0.35 * v)
        py = y - ry * q ** (1 / p) * 0.9
        kit.round_bush(gs[k % len(gs)], x + u * rx, py, rc, seed=7000 + k + int(x), z=z + v * h - rc * 0.35, flat=0.86)


def mr_far(st, P):
    pt = Parts()
    rnd = random.Random(151)
    # 1. the jungle walls: steep slopes either side of the gorges, under a dense canopy of round crowns
    gf2 = pt.g(MR["jungle_dk"], outline=0.0)
    gc = [pt.g(MR["jungle"], outline=0.3), pt.g(MR["jungle_dk"], outline=0.3), pt.g(MR["jungle_lt"], outline=0.3), pt.g(MR["moss"], outline=0.3)]
    for x, y, rx, h, seed, n in ((40, 640, 300, 250, 3, 170), (820, 660, 340, 236, 4, 170), (1400, 650, 260, 230, 5, 140), (240, 560, 160, 210, 6, 110),
                                 (620, 570, 180, 204, 7, 110), (1000, 590, 150, 180, 8, 90), (1320, 580, 150, 196, 9, 90)):
        kit.hill(gf2, x, y, -20, rx, 100, h, seed=seed, jag=0.08, p=2.2)
        _canopy(gc, x, y, -20, rx, 100, h, n, rnd)
    gr, gr2 = pt.g(MR["rock"], outline=0.4), pt.g(MR["rock_dk"], outline=0.4)
    gm, gvn = pt.g(MR["moss"], outline=0.3), pt.g(MR["jungle_dk"], outline=0.0)
    for fall in (MR_FALL, MR_FALL2):
        fx, fy, fz, drop = fall
        k_ = drop / 168
        for side in (-1, 1):
            # a cliff either side of the fall: lumpy dark rock walls stepping back, moss on the ledges, vines
            # hanging down, the canopy closing over the top
            for j, (dx, w, hf, dyy) in enumerate(((30, 26, 1.0, 0), (52, 24, 0.84, 8), (72, 22, 0.66, 14))):
                h = (drop + 16) * hf
                rock(gr2 if (j + (side > 0)) % 2 else gr, (fx + side * dx * k_, fy + dyy, fz - drop - 8 + h / 2), (w * k_, 18, h / 2), seed=int(fx) + j * 7 + side,
                     jag=0.1, p=3.4, cuts=5)
            for j in range(6):
                zz = fz - drop * (0.12 + j * 0.15)
                kit.round_bush(gm, fx + side * (24 + (j % 3) * 14) * k_, fy - 18, 5 * k_ + 3, seed=int(fx) + 40 + j + side, z=zz, flat=0.75)
            for j in range(5):
                vx = fx + side * (18 + j * 9) * k_
                gvn.capsule((vx, fy - 19, fz - 2 - j * 3), (vx + side * 1.5, fy - 19, fz - 26 - j * 7), 0.7)
            for j in range(4):
                kit.round_bush(pt.g(MR["jungle"], outline=0.3), fx + side * (26 + j * 14) * k_, fy - 4, rnd.uniform(9, 13), seed=int(fx) + 80 + j + side,
                               z=fz - 6 + j * 2, flat=0.86)
        _falls(pt, st, fall, rnd)
    # 2. the rope bridge (the signature) across the gorge above the great fall: plank deck sagging between two
    # pairs of posts on the cliff tops, rope rails and hangers
    fx, fy, fz, drop = MR_FALL
    x0, x1, zb, sag = fx - 150, fx + 150, fz + 30, 30
    gwd, grp = pt.g(MR["wood"], outline=0.3), pt.g(MR["rope"], outline=0.0, highlight=False)
    deck = []
    for k in range(31):
        t = k / 30
        x = x0 + (x1 - x0) * t
        z = zb - sag * (1 - (2 * t - 1) ** 2)
        deck.append((x, fy - 30, z))
        box(gwd, (x, fy - 30, z), (4.4, 6, 0.9), p=6, cuts=1)
    for dz, dy in ((12, -6.4), (12, 6.4)):
        for (a, b) in zip(deck, deck[1:]):
            grp.capsule((a[0], a[1] + dy, a[2] + dz), (b[0], b[1] + dy, b[2] + dz), 0.6)
    for k in range(0, 31, 2):
        grp.capsule((deck[k][0], deck[k][1] - 6.4, deck[k][2]), (deck[k][0], deck[k][1] - 6.4, deck[k][2] + 12), 0.4)
    for x in (x0, x1):
        for dy in (-7, 7):
            gwd.capsule((x, fy - 30 + dy, zb - 22), (x, fy - 30 + dy, zb + 20), 1.6)
    # 3. the temple ruin on the cliff right of the falls: stepped stone terraces with a shrine, vines, a fire
    tx, ty, tz = 640.0, 520.0, 168.0
    gt, gt2 = pt.g(MR["temple"], outline=0.5), pt.g(MR["temple_dk"], outline=0.4)
    for k in range(5):
        box(gt if k % 2 else gt2, (tx, ty, tz + 8 + k * 14), (74 - k * 13, 44 - k * 7, 8), p=8, cuts=1)
    box(gt, (tx, ty, tz + 86), (16, 13, 12), p=8, cuts=1)
    pt.g(MR["dark"], outline=0.0, highlight=False).slab([(tx - 4, tz + 74), (tx + 4, tz + 74), (tx + 4, tz + 88), (tx - 4, tz + 88)], ty - 13.6, 0.6)
    gtv = pt.g(MR["jungle_lt"], outline=0.2)
    for k in range(10):
        a = rnd.uniform(0, math.pi)
        kit.round_bush(gtv, tx + math.cos(a) * 64, ty - 24, rnd.uniform(5, 9), seed=700 + k, z=tz + rnd.uniform(4, 40), flat=0.8)
    st.light((tx, ty - 15, tz + 80), 5)
    st.amb("emit", "bd.puff", (tx, ty - 6, tz + 104), rate=0.3, speed=6, scale=0.7, tint=0xE6E8E2, alpha=0.3, life=3400, drift=4)
    # 4. the canopy: round jungle trees and palms over the slopes, the river at the gorges' feet
    gtr = pt.g(MR["trunk"], outline=0.0)
    gp, gp2 = pt.g(MR["palm"], outline=0.3), pt.g(MR["palm_dk"], outline=0.3)
    for i in range(16):
        x = rnd.uniform(-240, 1440)
        kit.palm(gp, gp2, gtr, x, rnd.uniform(400, 430), rnd.uniform(40, 60), lean=rnd.uniform(-0.3, 0.3), seed=900 + i, z=36, r=0.5)
    box(pt.g(MR["water"], finish="gloss", outline=0.0), (600, 420, 30), (1100, 80, 3), p=6, cuts=2)
    pt.flush(st)


def _stilt_hut(pt, st, x, y, z, w, h, seed=0):
    """A stilt house over the water's edge: bamboo walls on a platform raised on poles, a steep thatched
    roof, a ladder down, a lantern by the door. Returns the lantern point."""
    rnd = random.Random(seed)
    gb, gt, gw, gd = pt.g(MR["bamboo"], outline=0.5), pt.g(MR["thatch"], outline=0.5), pt.g(MR["wood_dk"], outline=0.4), pt.g(MR["dark"], outline=0.0, highlight=False)
    for sx in (-w * 0.42, 0, w * 0.42):
        for sy in (-8, 8):
            gw.capsule((x + sx, y + sy, z - 22), (x + sx, y + sy, z), 1.2)
    box(gw, (x, y, z + 1.2), (w / 2 + 3, 12, 1.2), p=6, cuts=1)
    box(gb, (x, y, z + 2.4 + h / 2), (w / 2, 10, h / 2), p=6, cuts=1)
    kit.gable_roof(gt, x, y, z + 2.4 + h, w + 6, 28, h * 1.5, oh=5.0, along_x=False)
    gt2 = pt.g(MR["thatch_dk"], outline=0.3)
    gt2.capsule((x - w / 2 - 7, y - 15, z + 2.4 + 0.5), (x, y - 15, z + 2.4 + h * 1.5), 1.2)
    gt2.capsule((x + w / 2 + 7, y - 15, z + 2.4 + 0.5), (x, y - 15, z + 2.4 + h * 1.5), 1.2)
    gd.slab([(x - 3, z + 2.4), (x + 3, z + 2.4), (x + 3, z + 2.4 + h * 0.7), (x - 3, z + 2.4 + h * 0.7)], y - 10.6, 0.6)
    for k in range(6):
        gw.capsule((x + w * 0.3 + rnd.uniform(-1, 1), y - 12 - k * 0.6, z - k * 4), (x + w * 0.3 + 6, y - 12 - k * 0.6, z - k * 4), 0.4)
    lamp = (x + 6, y - 13, z + 2.4 + h * 0.6)
    pt.g(MR["lamp"], outline=0.2).blob(lamp, (1.6, 1.6, 2.2), p=3)
    st.light(lamp, 5)
    return lamp


def mr_mid(st, P):
    pt = Parts()
    rnd = random.Random(157)
    ry = MR_RIVER_Y
    # the near bank (mud and grass), the river behind it (muddy grey-green, low saturation), the far bank
    g, g2 = pt.g(MR["moss"], outline=0.0), pt.g(MR["mud_lt"], outline=0.0)
    for i in range(15):
        rock(g, (-300 + i * 130, 70, 8), (96, 44, 38 + rnd.uniform(0, 6)), seed=i, jag=0.05, p=2.4)
    for i in range(20):
        g2.blob((rnd.uniform(-260, 1460), rnd.uniform(40, 60), 44), (rnd.uniform(20, 40), 8, 2), p=2.4, cuts=2)
    pt.g(MR["water"], finish="gloss", outline=0.0).blob((600, ry, 38.4), (1100, 30, 1.4), p=6, cuts=2)
    gwh = pt.g(MR["water_hi"], outline=0.0, highlight=False)
    for k in range(24):
        gwh.blob((rnd.uniform(-260, 1460), ry + rnd.uniform(-20, 12), 39.9), (rnd.uniform(8, 18), 1.0, 0.25), p=2.4, cuts=1)
    rock(pt.g(MR["jungle_dk"], outline=0.0), (600, ry + 44, 20), (1100, 18, 30), seed=40, jag=0.05, p=2.6)
    # 1. the stilt village on the river's edge (x 460-900): huts of different sizes and heights joined by a
    # plank walkway on stilts, a longhouse, a lookout tower with a lamp, a little dock and canoes
    gw = pt.g(MR["wood"], outline=0.4)
    huts = ((470, 38, 20, 62, -4), (548, 30, 17, 58, 6), (646, 50, 24, 66, -8), (742, 34, 19, 60, 2), (812, 28, 16, 57, 8))
    for k, (x, w, h, z, dy) in enumerate(huts):
        _stilt_hut(pt, st, x, ry - 6 + dy, z, w, h, seed=k)
    for (a, b) in zip(huts, huts[1:]):
        xa, xb = a[0] + a[1] / 2 + 2, b[0] - b[1] / 2 - 2
        za, zb = a[3] - 1.0, b[3] - 1.0
        n = max(2, int((xb - xa) / 7))
        for j in range(n + 1):
            t = j / n
            box(gw, (xa + (xb - xa) * t, ry - 14, za + (zb - za) * t), (3.0, 4, 0.7), p=6, cuts=1)
        for t in (0.25, 0.75):
            gw.capsule((xa + (xb - xa) * t, ry - 14, za + (zb - za) * t - 1), (xa + (xb - xa) * t, ry - 14, 30), 0.9)
    # the lookout tower at the village's end: four tall legs braced in X, a hut with a tin roof and a lamp
    tx, ty, th = 880.0, ry - 4, 104.0
    gtw = pt.g(MR["wood_dk"], outline=0.4)
    for sx in (-7, 7):
        for sy in (-6, 6):
            gtw.capsule((tx + sx * 1.3, ty + sy, 30), (tx + sx, ty + sy, th), 1.2)
    for k in range(4):
        z0, z1 = 36 + k * 16, 52 + k * 16
        gtw.capsule((tx - 9, ty - 6, z0), (tx + 9, ty - 6, z1), 0.6)
        gtw.capsule((tx + 9, ty - 6, z0), (tx - 9, ty - 6, z1), 0.6)
    box(pt.g(MR["bamboo"], outline=0.5), (tx, ty, th + 7), (11, 9, 7), p=6, cuts=1)
    kit.gable_roof(pt.g(MR["rock_dk"], finish="metal", outline=0.4), tx, ty, th + 14, 30, 26, 7, oh=2.0)
    pt.g(MR["dark"], outline=0.0, highlight=False).slab([(tx - 7, th + 5), (tx + 7, th + 5), (tx + 7, th + 10), (tx - 7, th + 10)], ty - 9.6, 0.6)
    lamp = (tx + 9, ty - 10, th + 10)
    pt.g(MR["lamp"], outline=0.2).blob(lamp, (1.8, 1.8, 2.2), p=3)
    st.light(lamp, 5)
    box(gw, (600, ry - 30, 42), (60, 6, 1.2), p=6, cuts=1)
    for k in range(5):
        gw.capsule((548 + k * 26, ry - 30, 30), (548 + k * 26, ry - 30, 42), 1.0)
    gcn = pt.g(MR["wood_dk"], outline=0.4)
    for (x, s_) in ((690, 1.0), (730, 0.8)):
        gcn.blob((x, ry - 26, 39.5), (16 * s_, 3 * s_, 1.6 * s_), p=2.4, taper=(0.7, 1.0))
    # 2. the jungle edge: palms, banana plants with big leaves, ferns, a few big trees framing the lane
    gp, gp2, gtr = pt.g(MR["palm"], outline=0.5), pt.g(MR["palm_dk"], outline=0.5), pt.g(MR["trunk"], outline=0.4)
    for k, (x, h, lean) in enumerate(((-200, 150, 0.2), (-120, 120, -0.22), (60, 160, 0.18), (300, 130, -0.2), (980, 150, 0.24), (1080, 120, -0.2),
                                      (1250, 156, 0.2), (1380, 128, -0.22))):
        kit.palm(gp, gp2, gtr, x, 96, h, lean=lean, seed=60 + k, z=40, r=1.0)
    gl, gl2 = pt.g(MR["jungle_lt"], outline=0.5), pt.g(MR["jungle"], outline=0.5)
    for i in range(30):
        x = rnd.uniform(-250, 1450)
        if 440 < x < 880:
            continue
        for j in range(5):
            a = -1.0 + j * 0.5 + rnd.uniform(-0.1, 0.1)
            L = rnd.uniform(14, 24)
            (gl if (i + j) % 2 else gl2).blob((x + math.sin(a) * L * 0.6, rnd.uniform(46, 64), 40 + math.cos(a) * L * 0.5 + 6), (L * 0.5, 3, 3.2), p=2.2,
                                               rot=(0, -math.degrees(a) * 0.8, 0), cuts=2)
    for k, (x, h) in enumerate(((180, 130), (1180, 140))):
        kit.broadleaf(gl2 if k else gl, gtr, x, 100, h, h * 0.36, seed=90 + k, z=40)
    pt.flush(st)


def mr_props():
    birds = fauna.bird(body="#4A4A42", wing="#3A3A34", belly="#6E6A5E", beak="#C8A060", span=12, size=0.9)
    falls = []
    for fall in (MR_FALL, MR_FALL2):
        fx, fy, fz, drop = fall
        falls.append([round(fx, 1), -round((fz - drop * 0.5) * math.cos(MR_FAR_E) + (fy - 30) * math.sin(MR_FAR_E), 1)])
    ring = [[i * 2, round(900 + 110 * math.cos(math.pi * i / 3)), round(-230 + 16 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    plist = [
        Prop("boat", "mid", fauna.patrol_boat(size=1.3), [{}], (80, 40, 4), MR_BOAT_Y),
        PaintedProp("sheen", "far", lambda i: _mr_shimmer(i), 3, ax=0.5, ay=0.5),
        PaintedProp("fog", "far", lambda i: soft_blob(340, 56, 0xE6E8E2, alpha=0.6, lumps=6, seed=5), 1, ax=0.5, ay=0.9),
        Prop("bird", "far", birds, [fauna.bird_pose(f) for f in range(5)], (36, 22, 22), ring[0][2]),
    ]
    sprites = [
        # the signature: a river patrol boat runs up the river every 50 s
        {"kind": "path", "layer": "mid", "fps": 1, "periodS": 50, "keys": [[0, 1560, MR_BOAT_Y, 0], [2, 1500, MR_BOAT_Y, 1], [30, -300, MR_BOAT_Y, 1],
                                                                          [32, -360, MR_BOAT_Y, 0], [50, -360, MR_BOAT_Y, 0]],
         "group": [{"frames": ["boat_0"]}]},
        {"kind": "loop", "layer": "far", "frames": ["sheen_0", "sheen_1", "sheen_2"], "fps": 6, "at": falls[0]},
        {"kind": "loop", "layer": "far", "frames": ["sheen_1", "sheen_2", "sheen_0"], "fps": 6, "at": falls[1]},
        {"kind": "path", "layer": "far", "fps": 1, "periodS": 160, "keys": [[0, -520, MR_FOG_FAR, 0], [16, -360, MR_FOG_FAR, 1], [144, 1400, MR_FOG_FAR, 1],
                                                                           [160, 1560, MR_FOG_FAR, 0]], "face": "fixed", "group": [{"frames": ["fog_0"]}]},
        {"kind": "path", "layer": "far", "fps": 6, "periodS": 14, "keys": ring,
         "group": [{"frames": ["bird_4", "bird_4", "bird_0", "bird_1", "bird_2", "bird_3"]}, {"frames": ["bird_4", "bird_0", "bird_1", "bird_2"], "dx": -22, "dy": 8, "phase": 2}]},
    ]
    return plist, sprites


def _mr_shimmer(i):
    """The waterfall's sheen: thin pale streaks sliding down (three frames), soft alpha."""
    import numpy as np
    w, h = 40, 160
    rnd = random.Random(13)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    a = np.zeros((h, w), np.float32)
    for k in range(7):
        x0 = 3 + k * 5.6 + rnd.uniform(-1, 1)
        y0 = (rnd.uniform(0, h) + i * h / 3) % h
        L = rnd.uniform(26, 44)
        dy = (yy - y0) % h
        a = np.maximum(a, np.clip(1 - np.abs(xx - x0) / 1.4, 0, 1) * np.clip(1 - np.abs(dy - L / 2) / (L / 2), 0, 1))
    out = np.zeros((h, w, 4), np.float32)
    out[..., :3] = 1.0
    out[..., 3] = a * 0.55
    return out


SCENES = {
    "classic": Scene("modern", "classic", CS_PAL, cs_far, cs_mid, back=cs_back, sky=CS_SKY, props=cs_props,
                     hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.5}, ground="earth",
                     look={"far": (0.2, 0.09, 0.2)}),
    "desert_airbase": Scene("modern", "desert_airbase", DA_PAL, da_far, da_mid, back=da_back, sky=DA_SKY, props=da_props,
                            hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.5}, ground="earth",
                            look={"far": (0.18, 0.08, 0.18)}),
    "monsoon_river": Scene("modern", "monsoon_river", MR_PAL, mr_far, mr_mid, back=mr_back, sky=MR_SKY, props=mr_props,
                           hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.45}, ground="earth"),
}
