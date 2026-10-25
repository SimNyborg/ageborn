"""Gunpowder scenes.

Classic "Star Fort Coast" (format 2, round 3): a green coast on a bright day. Back: the far coast across
the water, low hazy downs on the horizon. Far: a grey-teal sea; the cream star fort with its bastions,
ravelin, cannon, church spire and flag on a green headland above cliffs, surf and a quay with boats;
green clifftops over a sandy bay on the left; the lighthouse on its rock among the right cliffs; a
frigate at anchor and two fishing boats. Mid: dunes and coastal fields (crop rows, stooks, sheep, a
stone wall), the coastal battery with gabions and a cannon, the powder magazine with its kegs, poplars,
the cottage with green shutters and a smoking chimney, nets drying and a boat pulled up. Ambient: the
flag, two frigates under sail beyond the fort, a sloop bobbing, gulls, chimney smoke; the fort's
windows, the lighthouse, the battery, the magazine and the cottage glow under night skies.

"Treasure Cove" (format 2, round 2; Rare, Time Capsule): a palm cove under a tropical haze. Back: green
volcanic islands on the horizon. Far: a turquoise sea, a ruined jungle fort on a green headland (bastion
walls with embrasures and corner sentry turrets, vines and palms), a sloop at anchor, rocks and green
islands. Mid: a sand bank with palms and ferns, a beached rowboat, barrels and crates, an open treasure
chest, a campfire, and a rope bridge between two rock stacks over a creek; the lagoon behind it.
Ambient: two palm crowns sway (`loop`), waves lap the shore (`loop`), the sloop bobs, parrots fly round
the fort; the campfire, the bridge lantern and the sloop's stern lamp glow under night skies.

Palette (PLAN 2b): jungle #4F7A4A, sand #D8C8A0, wood #6A4E3A. The sea is a turquoise at about hue 170
degrees, outside the team-hue bands, so it may be clearer than the Aegean's teal-grey; gold coins and
parrots are small accents.

"Windmill Polder" (format 2, round 3; Epic, Time Capsule; a set with Windmill Redoubt): flat canal
country under a big open sky. Back: a faint far tree line. Far: the polder in long strips of grass and
muted bulb rows between ditches, farmsteads in tree clumps, poplar rows and open
gaps on the horizon with two far spires, a town of stepped
gables along a canal with its great brick church, three smock mills on brick bases along the dyke,
thatched farms. Mid: the dyke with bulb rows and a fence, the canal (grey-teal), the white drawbridge
with its gallows (the signature), the near windmill on its dyke, a thatched farmhouse with green
shutters, pollard willows, cows. Ambient: four windmills turning, a barge gliding along the canal, the
drawbridge rising every 30 s; windows, the mills and the bridge lamps glow under night skies.

Palette (PLAN 2b): polder green #7A8E5A, brick #8A5A48, cream #EFE6CF; bulb colours muted.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.scenes import fauna, kit
from world.scenes.common import Prop, Scene, box, cyl, mixc, rock
from world.scenes.kit import Parts

# -- Star Fort Coast (the classic, round 3) ----------------------------------------------------------
SF_PAL = dict(skyTop=0x8FB8D2, skyBottom=0xEAE8DE, light=0xFFF4DC, far=0x8EA0A0, mid=0x7E9066, near=0x5E7050)
SF = dict(
    sea=0x9DB2B0, sea_dk=0x8AA2A2, foam=0xEEF2F0, rock=0xA8A08E, rock_dk=0x8A8474, grass=0x86A06A, grass_dk=0x6E8858,
    grass_lt=0x9CAE7E, dune=0xD8CCA8, dune_dk=0xC2B690, marram=0xA8A878, stone=0xE6DCC2, stone_dk=0xC8BCA0, cord=0xD8CCB0,
    slate=0x6E6A70, tile=0x9A7A66, tile_dk=0x84685A, green=0x2E5E4E, wood=0x4A3B2E, wood_lt=0x6A5642, brass=0xC9A227,
    poplar=0x5E7A50, poplar_dk=0x4E6A44, hedge=0x5A7450, plaster=0xEFE6CF, dark=0x3E3A40, iron=0x3E3C3C, wicker=0x9A8460,
    light_band=0x8E2A4A, glass=0xB4C4C4, crop=0xB8AE7C, crop2=0x9EA670,
)
SF_SKY = {"top": "#8FB8D2", "bottom": "#EAE8DE", "horizon": "#F2F0E6", "cloudTint": "#F8F8F4", "celestial": "sun",
          "sunAt": [240, -540, 40], "clouds": 1.0}
SF_FAR_E = math.radians(8.0)
SF_MID_E = math.radians(12.0)
SF_SEA_Z = -10.0
SF_FORT = (500.0, 440.0, 62.0, 26.0, 100.0)  # the fort: x, y, base z, wall height, bastion radius (far)
SF_LIGHT = (1190.0, 470.0, 40.0)             # the lighthouse: x, y, base z (far)
SF_SHIP_A = 760.0                            # the ships' depths (far)
SF_SHIP_B = 1100.0
SF_SLOOP = (150.0, 700.0)                    # the sloop at anchor in the bay (far): x, depth
SF_GULLS = (980.0, -170.0)                   # the gulls' ring (mid, screen lu)


def sf_back(st, P):
    """The far coast across the water: low, hazy downs on the horizon (lowest under the moons' place)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    g, g2 = pt.g(hz(SF["grass_dk"], 0.42), outline=0.0), pt.g(hz(SF["rock"], 0.4), outline=0.0)
    for x, rx, h, seed in ((-180, 220, 70, 1), (120, 180, 52, 2), (420, 200, 40, 3), (1180, 230, 74, 4), (1440, 160, 60, 5), (700, 120, 26, 6)):
        kit.hill(g if seed % 2 else g2, x, 1500, SF_SEA_Z - 4, rx, 60, h, seed=seed, jag=0.04, p=2.4)
    pt.flush(st)


def _lighthouse(pt, st, x, y, z):
    """A lighthouse on its rock: a tapering cream tower with two wine bands, a gallery, the lantern room
    and a dark cap. Returns the lamp point."""
    gs, gb = pt.g(SF["stone"], outline=0.4), pt.g(SF["light_band"], outline=0.3)
    cyl(gs, (x, y, z), (x, y, z + 78), 9.0, 6.4, bevel=0.6, segs=18)
    for zb in (z + 26, z + 54):
        cyl(gb, (x, y, zb), (x, y, zb + 7), 9.0 - (zb - z) / 78 * 2.6 + 0.25, 9.0 - (zb + 7 - z) / 78 * 2.6 + 0.25, bevel=0.2, segs=18)
    cyl(pt.g(SF["stone_dk"], outline=0.3), (x, y, z + 77), (x, y, z + 80), 9.4, bevel=0.3, segs=18)
    cyl(pt.g(SF["glass"], finish="gloss", outline=0.3), (x, y, z + 80), (x, y, z + 90), 5.0, bevel=0.2, segs=14)
    pt.g(SF["dark"], outline=0.3).lathe([(0.01, 0), (6.4, 0), (5.4, 2.4), (2.0, 6.0), (0.5, 9.0), (0.01, 9.4)], (x, y, z + 90), (x, y, z + 99.4), segs=14)
    gd = pt.g(SF["dark"], outline=0.0, highlight=False)
    for zz in (z + 14, z + 40, z + 66):
        box(gd, (x, y - 8.6 + (zz - z) / 78 * 2.2, zz), (1.1, 0.5, 2.2), p=4, cuts=1)
    st.light((x, y - 5.4, z + 85), 6)
    st.light((x, y - 8.2, z + 40), 3)
    return (x, y, z + 85)


def sf_far(st, P):
    pt = Parts()
    rnd = random.Random(53)
    # 1. the sea to the horizon, grey-teal (low saturation, A11), with pale crests
    box(pt.g(SF["sea"], finish="gloss", outline=0.0), (600, 900, SF_SEA_Z - 6), (1100, 620, 6), p=6, cuts=2)
    gw = pt.g(SF["foam"], outline=0.0, highlight=False)
    for i in range(110):
        x = rnd.uniform(-260, 1460)
        y = rnd.uniform(520, 1400)
        L = rnd.uniform(10, 24) * (1.0 - (y - 520) / 1400)
        gw.capsule((x - L, y, SF_SEA_Z + 0.5), (x + L, y, SF_SEA_Z + 0.5), 1.6, 1.4)
    gsd = pt.g(SF["sea_dk"], outline=0.0, highlight=False)
    for i in range(30):
        x = rnd.uniform(-260, 1460)
        y = rnd.uniform(600, 1300)
        gsd.blob((x, y, SF_SEA_Z + 0.2), (rnd.uniform(30, 70), 6, 0.3), p=2.4, cuts=2)
    # 2. the land on the left: green clifftops over a sandy bay
    gr, gr2 = pt.g(SF["rock"], outline=0.4), pt.g(SF["rock_dk"], outline=0.4)
    gg, gg2 = pt.g(SF["grass"], outline=0.0), pt.g(SF["grass_dk"], outline=0.0)
    for k, (x, rx, h) in enumerate(((-200, 140, 52), (-30, 120, 44), (120, 90, 30))):
        rock(gr if k % 2 else gr2, (x, 400, SF_SEA_Z + h * 0.45), (rx, 40, h * 0.55), seed=10 + k, jag=0.16, p=2.8)
        kit.hill(gg if k % 2 else gg2, x, 410, SF_SEA_Z + h * 0.7, rx * 1.02, 44, h * 0.42, seed=20 + k, jag=0.04, p=2.6)
    for k, (x, y, w, roof, yaw) in enumerate(((-210, 420, 18, SF["tile"], 12), (-176, 430, 14, SF["slate"], -8), (-60, 420, 16, SF["tile"], 6), (40, 426, 14, SF["slate"], -12))):
        zz = SF_SEA_Z + (52, 52, 44, 30)[k] * 0.7 + (52, 52, 44, 30)[k] * 0.42 - 6
        kit.timber_house(pt, x, y, zz, w, 10, 8, 0.6, 9, plaster=SF["plaster"], timber=SF["plaster"], roof=roof, base=SF["stone_dk"], dark=SF["dark"],
                         yaw=yaw, jetty=0.0, chimney=None, seed=80 + k, outline=0.3)
    gtc, gtc2, gtt = pt.g(SF["poplar"], outline=0.3), pt.g(SF["poplar_dk"], outline=0.3), pt.g(SF["wood"], outline=0.0)
    for k in range(12):
        x = rnd.uniform(-250, 160)
        kit.broadleaf(gtc if k % 2 else gtc2, gtt, x, 440 + rnd.uniform(-10, 10), rnd.uniform(16, 22), rnd.uniform(6, 8), seed=850 + k,
                      z=SF_SEA_Z + 40 - abs(x + 60) * 0.08)
    gdn = pt.g(SF["dune"], outline=0.0)
    gdn.blob((250, 380, SF_SEA_Z), (120, 30, 7), p=2.4, cuts=3)
    # 3. the fort's headland: a green plateau with cliffs to the sea, surf at their foot, a gentle glacis
    # round the fort, a quay with boats below it
    fx, fy, fz, fh, frb = SF_FORT
    kit.hill(pt.g(SF["grass"], outline=0.0), fx, fy + 20, SF_SEA_Z, 300, 130, fz + 6 - SF_SEA_Z, seed=40, jag=0.03, p=3.4)
    for L, (zc, rz, half) in enumerate(((SF_SEA_Z + 12, 16, 300), (SF_SEA_Z + 34, 15, 280), (SF_SEA_Z + 54, 10, 250))):
        n = max(3, int(half / 30))
        for k in range(n):
            x = fx - half + (k + 0.5) * 2 * half / n + rnd.uniform(-10, 10)
            yfront = fy + 20 - 130 * (1 - min(1.0, abs((x - fx) / 300)) ** 3.4) ** (1 / 3.4)
            rock(gr if (k + L) % 3 else gr2, (x, yfront + 10 + L * 10, zc + rnd.uniform(-5, 5)), (half / n + rnd.uniform(8, 16), 26, rz * rnd.uniform(0.7, 1.25)),
                 seed=30 + L * 40 + k, jag=0.28, p=2.4)
    gsf = pt.g(SF["foam"], outline=0.0, highlight=False)
    for k in range(26):
        x = fx - 300 + k * 24 + rnd.uniform(-6, 6)
        yfront = fy + 20 - 130 * (1 - min(1.0, abs((x - fx) / 300)) ** 3.4) ** (1 / 3.4)
        gsf.blob((x, yfront + 4, SF_SEA_Z + 1.0), (rnd.uniform(9, 16), 3.0, 1.4), p=2.2, cuts=2)
    kit.hill(pt.g(SF["grass_dk"], outline=0.0), fx, fy, fz - 12, frb * 1.6, frb * 1.0, 13, seed=41, jag=0.03, p=2.8)
    ditch = kit.star_outline(fx, fy, frb * 1.24, yaw=-8.0, front=-45.0)
    kit.plate(pt.g(SF["stone_dk"], outline=0.3), kit.star_outline(fx, fy, frb * 1.3, yaw=-8.0, front=-45.0), fz - 9, fz + 1.4)
    kit.plate(pt.g(SF["sea_dk"], finish="gloss", outline=0.0), ditch, fz - 9, fz + 1.8)
    box(pt.g(SF["stone_dk"], outline=0.3), (fx - 236, 330, SF_SEA_Z + 4), (30, 8, 5), p=6, cuts=1, rot=(0, 0, 8))
    # 4. the star fort (the signature)
    out = kit.star_fort(pt, fx, fy, fz, fh, frb, yaw=-8.0, stone=SF["stone"], stone_dk=SF["stone_dk"], cord=SF["cord"], grass=SF["grass_lt"],
                        roof=SF["slate"], roof2=SF["tile"], dark=SF["dark"])
    for w in out["windows"]:
        st.light(w, 3)
    # cannon on the front bastions
    gi = pt.g(SF["iron"], outline=0.3)
    inner = kit.star_outline(fx, fy, frb * 0.86, yaw=-8.0, front=-45.0)
    for k in (0, 3):
        for idx in (1, 3):
            tx, ty = inner[k * 5 + idx]
            gi.capsule((tx, ty, fz + fh + 3.2), (tx + (tx - fx) * 0.1, ty + (ty - fy) * 0.1 - 1, fz + fh + 3.6), 1.4, 1.0)
    # 5. the right: cliffs and the lighthouse on its rock
    lx, ly, lz = SF_LIGHT
    for k, (x, rx, h) in enumerate(((1060, 110, 40), (1190, 90, 56), (1330, 140, 62), (1460, 120, 50))):
        rock(gr if k % 2 else gr2, (x, 480, SF_SEA_Z + h * 0.5), (rx, 44, h * 0.6), seed=50 + k, jag=0.18, p=2.8)
        kit.hill(gg if k % 2 else gg2, x, 490, SF_SEA_Z + h * 0.82, rx * 1.02, 46, h * 0.34, seed=60 + k, jag=0.04, p=2.6)
    lamp = _lighthouse(pt, st, lx, ly, lz)
    del lamp
    box(pt.g(SF["plaster"], outline=0.3), (lx + 18, ly + 4, lz + 5), (8, 6, 5), p=7, cuts=2)
    kit.gable_roof(pt.g(SF["tile"], outline=0.3), lx + 18, ly + 4, lz + 10, 16, 12, 6)
    # a frigate at anchor in the bay and two fishing boats (static: the moving ships sail beyond the fort)
    fauna.frigate(size=1.0, hull="#52443A")(kit.StaticRig(pt, (250, 640, SF_SEA_Z), s=1.0, flip=True))
    fauna.sloop(size=0.5, hull="#6A5642")(kit.StaticRig(pt, (60, 560, SF_SEA_Z), s=1.0))
    fauna.rowboat(hull="#6A5642", inner="#4A3B2E")(kit.StaticRig(pt, (330, 470, SF_SEA_Z - 1), s=1.4))
    # rocks in the water, a buoy
    for i, (x, s_) in enumerate(((200, 1.0), (760, 0.7), (960, 1.0), (1050, 0.6))):
        rock(gr2, (x, 360 + i * 10, SF_SEA_Z), (14 * s_, 10, 9 * s_), seed=70 + i, jag=0.25)
    pt.flush(st)


def sf_mid(st, P):
    pt = Parts()
    rnd = random.Random(59)
    # the bank: dunes on the far left and right, farmland between
    g, gd_ = pt.g(SF["grass"], outline=0.0), pt.g(SF["dune"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        dune = x < -60 or x > 1120
        rock(gd_ if dune else g, (x, 80, 8), (96, 60, 40 + rnd.uniform(0, 12)), seed=i, jag=0.05, p=2.4)
    gm, gm2 = pt.g(SF["marram"], finish="hair", outline=0.3), pt.g(SF["grass_dk"], finish="hair", outline=0.3)
    for i in range(80):
        x = rnd.uniform(-250, 1450)
        dune = x < -60 or x > 1120
        kit.round_bush(gm if dune else gm2, x, rnd.uniform(26, 46), rnd.uniform(4, 7), seed=1000 + i, z=rnd.uniform(36, 46), flat=0.7 if dune else 0.6)
    # crop rows in the middle fields (low: the fort stands behind them at the game's camera)
    gc1, gc2 = pt.g(SF["crop"], outline=0.3), pt.g(SF["crop2"], outline=0.3)
    for r in range(4):
        gcr = gc1 if r % 2 else gc2
        for x in range(180 + r * 6, 500, 9):
            gcr.blob((x, 96 + r * 8, 44), (4.2, 3.0, 3.2), p=2.2, cuts=2)
    # stooks in the field, a few sheep, a low stone wall along the track
    gst = pt.g(SF["crop"], outline=0.4)
    for k, x in enumerate((206, 236, 300, 330, 404, 434)):
        gst.lathe([(0.01, 0), (5.6, 0), (4.6, 5), (1.6, 11), (0.01, 12)], (x, 70 + (k % 2) * 8, 40), (x, 70 + (k % 2) * 8, 52), segs=10)
    gwl, gwh = pt.g(SF["plaster"], outline=0.4), pt.g(SF["dark"], outline=0.0)
    for k, x in enumerate((112, 140, 168, 470)):
        gwl.blob((x, 60 + k * 3, 45), (6.4, 4.0, 4.0), p=2.2)
        gwh.sphere((x + 6.8, 59 + k * 3, 46.6), 2.0)
    kit.dry_wall(pt.g(SF["stone_dk"], outline=0.5), 90, 520, 52, 38, 7, seed=6, block=9)
    # 1. the coastal battery on the dunes (x -220..60): an earthwork with gabions, a cannon, shot
    ge, gwk = pt.g(SF["grass_dk"], outline=0.5), pt.g(SF["wicker"], outline=0.5)
    rock(ge, (-90, 92, 40), (90, 26, 14), seed=91, jag=0.06, p=2.6)
    for k in range(9):
        x = -170 + k * 18
        cyl(gwk, (x, 74, 38), (x, 74, 54), 6.4, bevel=0.6, segs=12)
        gwk.lathe([(0.01, 0), (6.6, 0), (0.01, 1.0)], (x, 74, 54), (x, 74, 55), segs=12)
    gi, gwo = pt.g(SF["iron"], outline=0.5), pt.g(SF["wood"], outline=0.5)
    box(gwo, (-60, 60, 44), (12, 6, 4), p=5, cuts=1)
    for dx in (-8, 8):
        cyl(gwo, (-60 + dx, 52.6, 41), (-60 + dx, 51, 41), 4.6, bevel=0.4, segs=14)
    gi.capsule((-74, 58, 47), (-34, 58, 51), 3.4, 2.4)
    gi.sphere((-75, 58, 47), 3.0)
    gb = pt.g(SF["iron"], outline=0.3)
    for k, (dx, dz) in enumerate(((0, 0), (5, 0), (10, 0), (2.5, 4), (7.5, 4), (5, 8))):
        gb.sphere((-110 + dx, 50, 40 + dz + 2), 2.4)
    st.light((-24, 54, 50), 4)
    # 2. the powder magazine (x 540-620): a stocky stone store with heavy buttresses, a steep stone-slab
    # roof, a green iron-bound door, a lightning rod, its own low wall, powder kegs by the door
    gs, gs2 = pt.g(SF["stone"], outline=0.5), pt.g(SF["stone_dk"], outline=0.5)
    mx, my, yaw = 584.0, 100.0, -14.0
    box(gs, (mx, my, 40 + 13), (28, 16, 13), p=7, cuts=2, rot=(0, 0, yaw))
    for lx in (-28, -9.5, 9.5, 28):
        bx, by = kit._at(mx, my, lx, -17.5, yaw)
        box(gs2, (bx, by, 40 + 8), (3.0, 3.6, 8), p=5, cuts=1, rot=(0, 0, yaw), taper=(1.25, 0.7))
    kit.gable_roof(pt.g(SF["stone_dk"], outline=0.5), mx, my, 40 + 25.6, 58, 34, 20, oh=1.6, yaw=yaw)
    ex, ey = kit._at(mx, my, 0, 0, yaw)
    for lx in (-30, 30):
        gx_, gy_ = kit._at(mx, my, lx, 0, yaw)
        box(gs, (gx_, gy_, 40 + 34), (1.6, 17, 9), p=5, cuts=1, rot=(0, 0, yaw))
    dx_, dy_ = kit._at(mx, my, -2, -16.6, yaw)
    box(pt.g(SF["green"], outline=0.4), (dx_, dy_, 40 + 8), (5.4, 0.6, 8), p=4, cuts=1, rot=(0, 0, yaw))
    for dz in (3, 8, 13):
        box(pt.g(SF["iron"], outline=0.0), (dx_, dy_ - 0.6, 40 + dz), (5.6, 0.3, 0.5), p=4, cuts=1, rot=(0, 0, yaw))
    pt.g(SF["iron"], outline=0.3).capsule((ex + 18, ey + 4, 40 + 40), (ex + 18, ey + 4, 40 + 62), 0.6)
    st.light((dx_ + 8, dy_ - 0.6, 62), 4)
    kit.dry_wall(gs2, 534, 640, 70, 38, 8, seed=4, block=8)
    for k, (x, y) in enumerate(((612, 62), (624, 68), (618, 56))):
        cyl(gwo, (x, y, 38 + (7 if k == 2 else 0)), (x, y, 46 + (7 if k == 2 else 0)), 4.0, 4.6, bevel=0.8, segs=14)
        cyl(pt.g(SF["iron"], outline=0.0), (x, y, 41 + (7 if k == 2 else 0)), (x, y, 42.2 + (7 if k == 2 else 0)), 4.7, bevel=0.2, segs=14)
    # 3. poplars, and the cottage with green shutters and a smoking chimney (x 760-860)
    gp, gp2, gt = pt.g(SF["poplar"], outline=0.5), pt.g(SF["poplar_dk"], outline=0.5), pt.g(SF["wood"], outline=0.4)
    for k, (x, y, h) in enumerate(((660, 110, 150), (690, 120, 136), (716, 104, 160), (930, 116, 150), (962, 108, 164), (994, 120, 140),
                                   (-236, 120, 130), (1090, 112, 156))):
        kit.cypress(gp if k % 2 else gp2, gt, x, y, h, h * 0.13, seed=1300 + k, z=34)
    win, chim = kit.timber_house(pt, 800, 96, 40, 46, 24, 18, 14, 22, plaster=SF["plaster"], timber=SF["plaster"], roof=SF["tile"],
                                 base=SF["stone_dk"], dark=SF["dark"], yaw=-14, jetty=0.0, chimney=SF["stone_dk"], seed=5)
    for lx in (-12, 12):
        sx, sy = kit._at(800, 96, lx, -12.6, -14)
        for side in (-1, 1):
            px_, py_ = kit._at(sx, sy, side * 4.4, 0, -14)
            box(pt.g(SF["green"], outline=0.3), (px_, py_, 40 + 18 + 7.7), (1.3, 0.5, 2.8), p=4, cuts=1, rot=(0, 0, -14))
    st.light(win, 5)
    st.light((790, 70, 48), 4)
    st.amb("emit", "bd.puff", chim, rate=0.6, speed=10, scale=1.0, tint=0xE4E2DC, alpha=0.4, life=2800, drift=7)
    gfe = pt.g(SF["wood"], outline=0.3)
    for x in range(740, 900, 16):
        gfe.capsule((x, 60, 38), (x, 60, 50), 0.9)
    gfe.capsule((740, 60, 47), (884, 60, 47), 0.7)
    # 4. nets drying on poles and a boat pulled up on the right dunes
    for x in (1200, 1240, 1280):
        gfe.capsule((x, 80, 40), (x, 80, 70), 1.0)
    gn = pt.g(SF["wood_lt"], outline=0.3)
    gn.slab([(1200, 68), (1240, 66), (1240, 52), (1200, 56)], 79, 0.6)
    gn.slab([(1240, 66), (1280, 69), (1280, 55), (1240, 52)], 79, 0.6)
    fauna.rowboat(hull="#6A5642", inner="#4A3B2E")(kit.StaticRig(pt, (1330, 56, 40), s=2.2))
    # hedges along the field edges
    gh, gh2 = pt.g(SF["grass_dk"], outline=0.5), pt.g(SF["hedge"], outline=0.5)
    for (x0, x1, y) in ((60, 200, 134), (260, 420, 140), (700, 860, 136), (1000, 1120, 138)):
        n = int((x1 - x0) / 11)
        for k in range(n):
            kit.round_bush(gh if k % 3 else gh2, x0 + k * 11 + rnd.uniform(-2, 2), y, rnd.uniform(7, 10), seed=1500 + k + x0, z=40, flat=0.66)
    pt.flush(st)


def sf_props():
    fx, fy, fz, fh, frb = SF_FORT
    sc = frb / 72.0
    flag_foot = kit._at(fx, fy, 30 * sc, 4 * sc, -8.0)
    zi = fz + fh + 1.6
    fl = _scr((flag_foot[0], flag_foot[1], zi), SF_FAR_E)
    a_y = _scr((0, SF_SHIP_A, SF_SEA_Z), SF_FAR_E)[1]
    b_y = _scr((0, SF_SHIP_B, SF_SEA_Z), SF_FAR_E)[1]
    sl = _scr((SF_SLOOP[0], SF_SLOOP[1], SF_SEA_Z), SF_FAR_E)
    gull = fauna.bird(body="#E8E6E0", wing="#C8C8C4", beak="#C89A50", span=13, size=0.9)
    gx, gy = SF_GULLS
    ring = [[i * 2, round(gx + 110 * math.cos(math.pi * i / 3)), round(gy + 20 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    plist = [
        Prop("flag", "far", fauna.flag_frames(colour="#2E5E4E", stripe="#E6DCC2", length=18, width=11, pole=30), [{f"f{f}": {"show": True}} for f in range(4)],
             (26, 46, 2), fl[1]),
        Prop("shipA", "far", fauna.frigate(size=0.9), [{}], (100, 70, 3), a_y),
        Prop("shipB", "far", fauna.frigate(size=0.6, hull="#55463A"), [{}], (70, 48, 3), b_y),
        Prop("sloop", "far", fauna.sloop(size=0.7), [{}], (50, 36, 3), sl[1]),
        Prop("gull", "mid", gull, [fauna.bird_pose(f) for f in range(5)], (40, 24, 24), ring[0][2]),
    ]
    sprites = [
        {"kind": "loop", "layer": "far", "frames": [f"flag_{i}" for i in range(4)], "fps": 5, "at": fl},
        # the ships sail the open water between the fort and the lighthouse (they would pass in front of the
        # strip's fort elsewhere): they fade in behind the fort and out behind the cliffs
        {"kind": "path", "layer": "far", "fps": 1, "periodS": 200,
         "keys": [[0, 700, a_y, 0], [8, 718, a_y, 1], [150, 1040, a_y, 1], [158, 1058, a_y, 0], [200, 1058, a_y, 0]], "group": [{"frames": ["shipA_0"]}]},
        {"kind": "path", "layer": "far", "fps": 1, "periodS": 260,
         "keys": [[0, 1110, b_y, 0], [10, 1094, b_y, 1], [210, 730, b_y, 1], [220, 714, b_y, 0], [260, 714, b_y, 0]], "group": [{"frames": ["shipB_0"]}]},
        {"kind": "bob", "layer": "far", "frames": ["sloop_0"], "at": sl, "amp": [0.0, 0.8], "periodS": 5, "tilt": 2.0},
        {"kind": "path", "layer": "mid", "fps": 6, "periodS": 16, "keys": ring,
         "group": [{"frames": ["gull_4", "gull_0", "gull_1", "gull_2", "gull_3"]}, {"frames": ["gull_0", "gull_1", "gull_2", "gull_3", "gull_4"], "dx": -30, "dy": 12, "phase": 2}]},
    ]
    return plist, sprites



# -- Treasure Cove (round 2) ---------------------------------------------------------------------------
TC_PAL = dict(skyTop=0x7CB4C8, skyBottom=0xF2EAD2, light=0xFFF4DC, far=0x8EA898, mid=0x7E8C66, near=0x5E7050)
TC = dict(
    sea=0x5FA89E, sea_far=0x7AB4AA, lagoon=0x6CB0A2, foam=0xE8F0E6, sand=0xD8C8A0, sand_dk=0xC2B086, jungle=0x4F7A4A, jungle_dk=0x40663E,
    jungle_lt=0x6A9460, frond=0x5A8A50, frond_dk=0x48744A, trunk=0x8A7258, fort=0xA8987C, fort_dk=0x8C7E66, vine=0x4A6E44,
    rock=0x8E8676, rock_dk=0x6E685C, wood=0x6A4E3A, wood_lt=0x8A6A4C, dark=0x3E3830, gold=0xD4AC48, iron=0x4A4844, rope=0xB4A07A,
    canvas=0xD8CCB0,
)
TC_SKY = {"top": "#7CB4C8", "bottom": "#F2EAD2", "horizon": "#F6EED8", "cloudTint": "#FBF6EA", "celestial": "sun",
          "sunAt": [250, -520, 42], "clouds": 0.9}
TC_FAR_E = math.radians(8.0)
TC_MID_E = math.radians(12.0)
TC_SEA_Z = 58.0
TC_SLOOP = (820.0, 360.0)            # the sloop at anchor (far): x, depth
TC_PALMS = ((180.0, 70.0, 150.0, 0.22, 3), (700.0, 76.0, 160.0, -0.2, 7))   # the two palms whose crowns sway (mid): x, y, h, lean, seed
TC_WAVES = ((260.0, 112.0), (900.0, 118.0))




def _scr(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


def tc_back(st, P):
    """Green volcanic islands on the horizon (low under the moons' place, x 820-980)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    gi = pt.g(hz(TC["jungle"], 0.34), outline=0.0)
    for x, rx, h, seed in ((-160, 160, 150, 1), (90, 110, 80, 2), (1120, 170, 170, 3), (1380, 120, 90, 4), (600, 90, 46, 5), (900, 60, 26, 6)):
        kit.peak(gi, None, x, 1500, TC_SEA_Z - 6, rx, h, seed=seed, snow=1.0, jag=0.08, squash=0.5)
    pt.flush(st)


def _fort_z(x):
    """Top of the fort's headland (far) at x."""
    t = max(0.0, 1.0 - ((x - 520.0) / 230.0) ** 2)
    return TC_SEA_Z + 92.0 * t ** 0.6


def tc_far(st, P):
    pt = Parts()
    rnd = random.Random(41)
    # 1. the sea to the horizon, pale crests
    box(pt.g(TC["sea"], finish="gloss", outline=0.0), (600, 760, TC_SEA_Z - 6), (1100, 580, 6), p=6, cuts=2)
    gw = pt.g(TC["foam"], outline=0.0, highlight=False)
    for i in range(44):
        x = rnd.uniform(-260, 1460)
        y = rnd.uniform(200, 1100)
        L = rnd.uniform(8, 18) * (1.0 - (y - 200) / 1800)
        gw.capsule((x - L, y, TC_SEA_Z + 0.4), (x + L, y, TC_SEA_Z + 0.4), 0.9, 0.9)
    # 2. green islands left and right, peaked like old volcanoes, jungle to the water
    gj, gj2 = pt.g(TC["jungle"], outline=0.3), pt.g(TC["jungle_dk"], outline=0.3)
    kit.peak(gj, None, -120, 520, TC_SEA_Z - 8, 180, 190, seed=11, snow=1.0, jag=0.12, squash=0.5)
    kit.peak(gj2, None, 60, 470, TC_SEA_Z - 8, 120, 110, seed=12, snow=1.0, jag=0.12, squash=0.5)
    kit.peak(gj, None, 1180, 540, TC_SEA_Z - 8, 200, 210, seed=13, snow=1.0, jag=0.12, squash=0.5)
    kit.peak(gj2, None, 1400, 480, TC_SEA_Z - 8, 130, 120, seed=14, snow=1.0, jag=0.12, squash=0.5)
    gb = pt.g(mixc(TC["jungle"], TC["jungle_lt"], 0.45), outline=0.0)
    for i in range(60):
        x = rnd.uniform(-260, 1460)
        if 260 < x < 780:
            continue
        kit.round_bush(gb, x, rnd.uniform(400, 440), rnd.uniform(6, 11), seed=100 + i, z=TC_SEA_Z + rnd.uniform(0, 60))
    # 3. the fort's headland: rock cliffs to the sea, jungle on top
    gr, gr2 = pt.g(TC["rock"], outline=0.4), pt.g(TC["rock_dk"], outline=0.4)
    for L, (zc, rz, half) in enumerate(((TC_SEA_Z + 16, 22, 240), (TC_SEA_Z + 46, 20, 200), (TC_SEA_Z + 72, 16, 160))):
        n = max(2, int(half / 70))
        for k in range(n):
            x = 520 - half + (k + 0.5) * 2 * half / n + rnd.uniform(-10, 10)
            rock(gr if (k + L) % 2 else gr2, (x, 344 + L * 8, zc), (half / n + 24, 38, rz), seed=20 + L * 10 + k, jag=0.2, p=2.8)
    gjl = pt.g(TC["jungle"], outline=0.3)
    for L, (zt, half) in enumerate(((TC_SEA_Z + 36, 230), (TC_SEA_Z + 64, 190))):
        for k in range(9 - L * 2):
            x = 520 - half + rnd.uniform(0, 2 * half)
            kit.round_bush(gjl, x, 312 + L * 8, rnd.uniform(7, 12), seed=600 + L * 20 + k, z=zt - 4, flat=0.7)
    gjt = pt.g(TC["jungle_dk"], outline=0.4)
    for k in range(18):
        x = rnd.uniform(300, 740)
        kit.round_bush(gjt, x, rnd.uniform(352, 376), rnd.uniform(9, 14), seed=200 + k, z=_fort_z(x) - 6)
    # 4. the fort: bastion walls with embrasures, corner sentry turrets, a broken watchtower, vines
    gf, gf2 = pt.g(TC["fort"], outline=0.5), pt.g(TC["fort_dk"], outline=0.5)
    gd = pt.g(TC["dark"], outline=0.0, highlight=False)
    fz = TC_SEA_Z + 84
    box(gf, (520, 332, fz + 24), (130, 14, 30), p=5, cuts=2, taper=(1.08, 1.0))
    box(gf2, (520, 316.8, fz + 50), (126, 1.6, 3), p=4, cuts=1)
    box(gf2, (520, 316.6, fz + 2), (128, 1.6, 4), p=4, cuts=1)
    pts = [(506, fz - 4), (534, fz - 4), (534, fz + 14)] + [(520 + 14 * math.cos(math.pi * k / 8), fz + 14 + 12 * math.sin(math.pi * k / 8)) for k in range(1, 8)] + [(506, fz + 14)]
    gd.slab(pts, 317.6, 1.0)
    for k in range(8):
        box(gd, (424 + k * 28, 317.4, fz + 30), (5.4, 0.6, 6.4), p=4, cuts=1)
    for x in (386, 654):
        box(gf2, (x, 322, fz + 26), (24, 26, 34), p=5, cuts=2, rot=(0, 0, 45), taper=(1.1, 1.0))
        cyl(gf, (x, 300, fz + 58), (x, 300, fz + 76), 7.6, bevel=0.6, segs=14)
        gf.lathe([(0.01, 0), (9.4, 0), (0.01, 10)], (x, 300, fz + 76), (x, 300, fz + 86), segs=14)
        box(gd, (x, 292, fz + 66), (2.0, 0.6, 4.2), p=4, cuts=1)
    # the watchtower, its top broken
    box(gf, (548, 352, fz + 66), (22, 18, 46), p=5, cuts=2)
    for dx, h in ((-16, 11), (-4, 5), (9, 14), (17, 7)):
        box(gf2, (548 + dx, 352, fz + 112 + h / 2), (5, 18, h / 2), p=5, cuts=1)
    box(gd, (548, 333.4, fz + 74), (5, 0.6, 9), p=4, cuts=1)
    gv = pt.g(TC["vine"], outline=0.3)
    for (x, z, rx, rz) in ((460, fz + 30, 16, 14), (520, fz + 44, 12, 9), (610, fz + 20, 18, 12), (548, fz + 96, 10, 16), (390, fz + 44, 9, 16),
                           (660, fz + 50, 8, 12)):
        gv.blob((x, 316, z), (rx, 4, rz), p=2.2)
    gc = pt.g(TC["iron"], outline=0.3)
    for x in (452, 536, 592):
        gc.capsule((x, 316, fz + 30), (x, 304, fz + 31), 2.4)
    # palms round the fort
    gpf, gpf2, gpt = pt.g(TC["frond"], outline=0.3), pt.g(TC["frond_dk"], outline=0.3), pt.g(TC["trunk"], outline=0.3)
    for i, x in enumerate((322, 352, 704, 730, 762)):
        kit.palm(gpf, gpf2, gpt, x, 352, rnd.uniform(56, 70), lean=rnd.uniform(-0.3, 0.3), seed=300 + i, z=_fort_z(x) - 4, r=0.6)
    # rocks in the sea
    for i, (x, s_) in enumerate(((240, 1.0), (790, 0.7), (980, 1.1))):
        rock(gr2, (x, 300, TC_SEA_Z), (18 * s_, 12, 12 * s_), seed=60 + i, jag=0.25)
    st.light((548, 333, fz + 60), 5)
    pt.flush(st)


def tc_mid(st, P):
    pt = Parts()
    rnd = random.Random(43)
    # the lagoon behind the sand bank
    box(pt.g(TC["lagoon"], finish="gloss", outline=0.0), (600, 200, 36), (920, 110, 3), p=6, cuts=2)
    # the sand bank
    g = pt.g(TC["sand"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g, (x, 80, 6), (96, 50, 40 + rnd.uniform(0, 8)), seed=i, jag=0.04, p=2.6)
    gsd = pt.g(TC["sand_dk"], outline=0.0)
    for i in range(30):
        x = rnd.uniform(-250, 1450)
        gsd.blob((x, rnd.uniform(40, 70), 43), (rnd.uniform(6, 14), 4, 1.4), p=2.0)
    # ferns and tropical bushes
    gfe, gfe2 = pt.g(TC["jungle"], outline=0.4), pt.g(TC["jungle_lt"], outline=0.4)
    for i in range(26):
        x = rnd.uniform(-250, 1450)
        if 820 < x < 1060:
            continue
        kit.round_bush(gfe if i % 2 else gfe2, x, rnd.uniform(66, 96), rnd.uniform(9, 15), seed=1000 + i, z=40, flat=0.7)
    # palms (two crowns sway as props; their trunks are here)
    gpf, gpf2, gpt = pt.g(TC["frond"], outline=0.5), pt.g(TC["frond_dk"], outline=0.5), pt.g(TC["trunk"], outline=0.5)
    for i, (x, h, lean) in enumerate(((-220, 160, 0.3), (-150, 130, -0.25), (60, 120, 0.3), (1000, 150, -0.28), (1100, 132, 0.24),
                                       (1330, 166, -0.2), (1420, 128, 0.3))):
        kit.palm(gpf, gpf2, gpt, x, 84, h, lean=lean, seed=400 + i, z=40)
    for (x, y, h, lean, seed) in TC_PALMS:
        pts = [(x + lean * h * t * t, y, 40 + h * t) for t in (0, 0.2, 0.4, 0.6, 0.8, 1.0)]
        for (ax, ay, az), (bx, by, bz) in zip(pts, pts[1:]):
            gpt.capsule((ax, ay, az), (bx, by, bz), 2.6 - (az - 40) / h * 0.7, 2.6 - (bz - 40) / h * 0.7)
    # the beached rowboat, barrels and crates, the open treasure chest
    gwd, gwl = pt.g(TC["wood"], outline=0.5), pt.g(TC["wood_lt"], outline=0.5)
    gwd.blob((270, 60, 50), (36, 13, 9.6), p=2.8, taper=(0.7, 1.0), rot=(0, -6, 8))
    pt.g(TC["dark"], outline=0.0).blob((270, 60, 57), (32, 10.4, 3.2), p=3.0, rot=(0, -6, 8))
    gwl.capsule((244, 55, 61), (306, 63, 56), 1.4)
    for x, z in ((384, 44), (406, 44), (395, 66)):
        cyl(gwl, (x, 64, z), (x, 64, z + 21), 9.0, bevel=1.6, segs=14)
        cyl(pt.g(TC["iron"], outline=0.0), (x, 64, z + 4), (x, 64, z + 6), 9.2, bevel=0.4, segs=14)
        cyl(pt.g(TC["iron"], outline=0.0), (x, 64, z + 15), (x, 64, z + 17), 9.2, bevel=0.4, segs=14)
    box(gwd, (436, 70, 55), (12, 11, 11), p=5, cuts=1)
    box(gwd, (446, 72, 72), (8, 8, 7), p=5, cuts=1)
    box(gwd, (494, 60, 53), (18, 11, 9.6), p=4.4, cuts=2)
    gwd.blob((494, 70, 69), (18, 3.2, 12), p=3.0, rot=(-62, 0, 0))
    gg = pt.g(TC["gold"], finish="bronze", outline=0.3)
    gg.blob((494, 60, 62), (15, 9, 3.6), p=2.0)
    for k in range(6):
        gg.lathe([(0.01, 0), (2.8, 0), (2.8, 0.8), (0.01, 0.8)], (470 + k * 8, 50 - k % 2 * 4, 44), (470 + k * 8, 50 - k % 2 * 4, 44.8), segs=10,
                 squash=(1.0, 0.6))
    # the campfire
    gst = pt.g(TC["rock_dk"], outline=0.4)
    for k in range(7):
        a = 2 * math.pi * k / 7
        rock(gst, (560 + math.cos(a) * 9, 60 + math.sin(a) * 4, 45), (3.2, 2.6, 2.4), seed=70 + k, jag=0.15)
    pt.g(TC["dark"], outline=0.3).capsule((553, 60, 47), (567, 60, 49), 1.6)
    st.light((560, 60, 54), 8)
    st.amb("emit", "fx.p.smoke", (560, 60, 70), rate=0.6, speed=10, scale=0.9, tint=0xEEE8DC, alpha=0.34, life=2600)
    # the rope bridge between two rock stacks over a creek (x 860-1020)
    gro, gro2 = pt.g(TC["rock"], outline=0.5), pt.g(TC["rock_dk"], outline=0.5)
    for x, h in ((860, 96), (1020, 86)):
        rock(gro, (x, 98, 40 + h / 2), (26, 22, h / 2 + 6), seed=int(x), jag=0.16, p=2.6)
        rock(gro2, (x + 14, 92, 40 + h * 0.3), (16, 16, h * 0.3), seed=int(x) + 1, jag=0.2)
        kit.round_bush(pt.g(TC["jungle_dk"], outline=0.4), x, 100, 16, seed=int(x) + 2, z=40 + h - 4)
    gr = pt.g(TC["rope"], outline=0.3)
    bz0, bz1 = 40 + 96 - 8, 40 + 86 - 8
    pts = [(860 + 160 * t, 96, bz0 + (bz1 - bz0) * t - 22 * math.sin(math.pi * t)) for t in [k / 10 for k in range(11)]]
    for (ax, ay, az), (bx, by, bz) in zip(pts, pts[1:]):
        gr.capsule((ax, ay, az + 12), (bx, by, bz + 12), 0.7)
        gr.capsule((ax, ay - 4, az + 12), (bx, by - 4, bz + 12), 0.7)
    for (ax, ay, az) in pts[1:-1]:
        box(gwl, (ax, ay - 2, az), (3.2, 5, 1.0), p=4, cuts=1)
        gr.capsule((ax, ay - 4, az), (ax, ay - 4, az + 12), 0.4)
    box(pt.g(TC["gold"], outline=0.3), (868, 92, bz0 + 22), (2.6, 2.6, 3.4), p=4, cuts=1)
    st.light((868, 90, bz0 + 22), 6)
    pt.flush(st)


def _crown(lean, seed):
    """A palm crown alone (its trunk is in the strip): fronds about the trunk top, frames sway it."""
    def build(rig):
        rig.joint("c", "all", (0, 0, 0))
        from world.scenes.fauna import Into
        r = Into(rig, "c")
        rnd = random.Random(seed)
        gf, gf2, gt = Geo(), Geo(), Geo()
        top = (0.0, 0.0, 0.0)
        for k in range(8):
            a = 2 * math.pi * k / 8 + rnd.uniform(-0.2, 0.2)
            L = rnd.uniform(62, 76)
            kit.frond(gf if k % 2 else gf2, top, a, L, L * 0.13)
        for k in range(3):
            a = k * 2.1
            gt.sphere((math.cos(a) * 3.2, -1 + math.sin(a) * 2, -3.6), 2.4, cuts=2)
        r.part("all", gf, "#5A8A50", outline=0.5)
        r.part("all", gf2, "#48744A", outline=0.5)
        r.part("all", gt, "#7A6448", outline=0.4)
    return build


def _foam(rig):
    """A line of foam along the shore: frames 0-3 draw it at four places of its lap."""
    for f in range(4):
        j = rig.joint(f"w{f}", "all", (0, 0, 0), hidden=True)
        g = Geo()
        rnd = random.Random(f + 5)
        off = [0, -3, -5, -2][f]
        for k in range(9):
            x = -130 + k * 32 + rnd.uniform(-6, 6)
            L = rnd.uniform(10, 16)
            g.capsule((x - L, off, 0.5), (x + L, off, 0.5), 1.4, 1.4)
        rig.part(j, g, "#EEF4EC", outline=0)


def tc_props():
    parrot = fauna.bird(body="#5E9A5A", wing="#4A7C50", belly="#C8B060", beak="#E0C070", span=11, size=1.0)
    sx, sy = TC_SLOOP
    sloop_at = _scr((sx, sy, TC_SEA_Z - 2), TC_FAR_E)
    fx = 520.0
    ring = [[i * 2, round(fx + 110 * math.cos(math.pi * i / 4)), round(-230 + 18 * math.sin(math.pi * i / 4)), 1] for i in range(9)]
    plist = [Prop("sloop", "far", fauna.sloop(size=1.3), [{}], (100, 70, 8), sloop_at[1]),
             Prop("parrot", "far", parrot, [fauna.bird_pose(f) for f in range(5)], (36, 22, 22), ring[0][2])]
    sprites = [
        {"kind": "bob", "layer": "far", "frames": ["sloop_0"], "fps": 1, "at": sloop_at, "amp": [0.6, 1.0], "periodS": 5.2, "tilt": 2.0},
        {"kind": "path", "layer": "far", "fps": 7, "periodS": 16, "keys": ring,
         "group": [{"frames": ["parrot_0", "parrot_1", "parrot_2", "parrot_3"]}, {"frames": ["parrot_4", "parrot_0", "parrot_1", "parrot_2"], "dx": -24, "dy": 10, "phase": 1}]},
    ]
    plist.append(Prop("crown", "mid", _crown(0.0, 7), [{"c": {"r": a}} for a in (-3.5, 0, 3.5)], (170, 30, 62),
                      _scr((0, TC_PALMS[0][1], 40 + TC_PALMS[0][2]), TC_MID_E)[1]))
    for k, (x, y, h, lean, seed) in enumerate(TC_PALMS):
        top = _scr((x + lean * h, y, 40 + h), TC_MID_E)
        sprites.append({"kind": "loop", "layer": "mid", "frames": [f"crown_{i}" for i in range(3)], "fps": 1.2 + 0.3 * k, "pingpong": True, "at": top})
    plist.append(Prop("foam", "mid", _foam, [{f"w{f}": {"show": True}} for f in range(4)], (300, 8, 8), _scr((0, TC_WAVES[0][1], 39.0), TC_MID_E)[1],
                      outline=False))
    for (x, y) in TC_WAVES:
        sprites.append({"kind": "loop", "layer": "mid", "frames": [f"foam_{i}" for i in range(4)], "fps": 2, "pingpong": True,
                        "at": _scr((x, y, 39.0), TC_MID_E)})
    return plist, sprites


# -- Windmill Polder (round 3; Epic, Time Capsule; a set with Windmill Redoubt) ------------------------
WP_PAL = dict(skyTop=0x86AECC, skyBottom=0xE8ECE6, light=0xFFF8EA, far=0x8E9A80, mid=0x7E8C5E, near=0x5E6A48)
WP = dict(
    green=0x7A8E5A, green_dk=0x66784A, green_lt=0x92A270, brick=0x8A5A48, brick_dk=0x704838, brick_lt=0xA07060, cream=0xEFE6CF,
    cream_dk=0xD8CCB2, thatch=0x6E6450, thatch_dk=0x5A5242, water=0x8EA6A6, water_hi=0xC8D4D0, slate=0x5E6670, roof=0x8E5E4E,
    dark=0x3A3634, wood=0x6E5A46, white=0xE8E4D8, rose=0xB88A8A, mauve=0x9A8AA0, butter=0xD8CC98, willow=0x8A9A6A, willow_dk=0x72825A,
    trunk=0x6A5A4A, cow=0xE6E2D8, cow_dk=0x3E3A38,
)
WP_SKY = {"top": "#86AECC", "bottom": "#E8ECE6", "horizon": "#F0F2EC", "cloudTint": "#FAFBF8", "celestial": "sun",
          "sunAt": [220, -540, 40], "clouds": 1.0}
WP_FAR_E = math.radians(8.0)
WP_MID_E = math.radians(12.0)
WP_LAND_Z = 40.0
WP_MILLS = ((110.0, 470.0, 78.0, 22.0), (290.0, 500.0, 70.0, 20.0), (1180.0, 480.0, 76.0, 21.0))   # far mills: x, y, height, radius
WP_BIG_MILL = (360.0, 128.0, 40.0, 112.0, 32.0)   # the near mill (mid): x, y, foot z, height, radius
WP_CANAL_Y = 112.0                                # the canal along the mid strip (its centre, depth)
WP_BRIDGE = 640.0                                 # the drawbridge over the canal (mid x)
WP_BARGE_Y = -66.0                                # the barge's waterline (mid, screen lu)


def wp_back(st, P):
    """The flat horizon: a faint far line of trees at the strip's foot (big sky; the horizon's trees and
    spires stand on the far strip)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    g, g2 = pt.g(hz(WP["willow_dk"], 0.46), outline=0.0), pt.g(hz(WP["green_dk"], 0.44), outline=0.0)
    rnd = random.Random(3)
    for i in range(46):
        x = -300 + i * 40 + rnd.uniform(-10, 10)
        if 800 < x < 1000:
            continue
        kit.round_bush(g if i % 3 else g2, x, 1500, rnd.uniform(14, 24), seed=i, z=-40 + 66, flat=0.7)
    pt.flush(st)


def wp_far(st, P):
    pt = Parts()
    rnd = random.Random(131)
    zl = WP_LAND_Z
    # 1. the flat polder: long fields in strips (grass, and bulb fields in muted rows), ditches between them
    gl = pt.g(WP["green"], outline=0.0)
    box(gl, (600, 700, zl - 20), (1100, 420, 20), p=6, cuts=2)
    gw = pt.g(WP["water"], finish="gloss", outline=0.0)
    cols = (WP["green_lt"], WP["green_dk"], WP["rose"], WP["green"], WP["butter"], WP["green_lt"], WP["mauve"], WP["cream_dk"], WP["green_dk"])
    y = 300.0
    k = 0
    while y < 700:
        d = rnd.uniform(28, 46)
        x0 = -300.0
        while x0 < 1500:
            L = rnd.uniform(160, 340)
            c = cols[(k * 3 + int(x0 / 100)) % len(cols)]
            box(pt.g(c, outline=0.0), (x0 + L / 2, y + d / 2, zl + 0.6), (L / 2 - 1.5, d / 2 - 2, 0.6), p=6, cuts=1)
            if c in (WP["rose"], WP["butter"], WP["mauve"]):
                gr = pt.g(mixc(c, WP["green_dk"], 0.35), outline=0.0, highlight=False)
                for j in range(int(d / 6)):
                    gr.capsule((x0 + 2, y + 3 + j * 6, zl + 1.3), (x0 + L - 2, y + 3 + j * 6, zl + 1.3), 0.6)
            x0 += L
        box(gw, (600, y + d, zl + 0.2), (1100, 1.8, 0.5), p=6, cuts=1)
        y += d
        k += 1
    # the horizon: farmsteads in tree clumps (round crowns, rows of poplars, a roof) with low hedges and open
    # gaps between them, two far village spires
    gtl, gtl2 = pt.g(mixc(WP["willow_dk"], P["skyBottom"], 0.18), outline=0.0), pt.g(mixc(WP["green_dk"], P["skyBottom"], 0.18), outline=0.0)
    gtl3 = pt.g(mixc(WP["willow"], P["skyBottom"], 0.2), outline=0.0)
    grf = pt.g(mixc(WP["roof"], P["skyBottom"], 0.3), outline=0.0)
    x = -300.0
    j = 0
    while x < 1500:
        kind = (j * 5 + 2) % 7
        if kind in (0, 3):          # a gap with a low hedge
            L = rnd.uniform(50, 90)
            for k in range(int(L / 9)):
                kit.round_bush(gtl2, x + k * 9 + rnd.uniform(-2, 2), 1096 + rnd.uniform(-6, 6), rnd.uniform(3.6, 5.2), seed=1100 + j * 20 + k, z=zl - 3, flat=0.5)
        elif kind == 5:             # a row of poplars
            L = rnd.uniform(60, 110)
            for k in range(int(L / 9)):
                h = rnd.uniform(26, 36)
                (gtl if k % 2 else gtl3).blob((x + k * 9, 1086 + rnd.uniform(-4, 4), zl + h * 0.5), (3.6, 3.2, h * 0.5), p=2.0, cuts=3)
        else:                       # a farmstead clump: round crowns of mixed sizes, now and then a roof
            L = rnd.uniform(70, 130)
            n = int(L / 12)
            for k in range(n):
                kit.round_bush((gtl, gtl2, gtl3)[k % 3], x + k * 12 + rnd.uniform(-4, 4), 1090 + rnd.uniform(-14, 14), rnd.uniform(8, 15),
                               seed=1100 + j * 20 + k, z=zl - 3, flat=0.62)
            if j % 2 == 0:
                rx = x + L * rnd.uniform(0.3, 0.6)
                kit.gable_roof(grf, rx, 1080, zl, 26, 16, 14)
        x += L + rnd.uniform(4, 16)
        j += 1
    gsp = pt.g(mixc(WP["slate"], P["skyBottom"], 0.3), outline=0.0)
    for x in (180, 1250):
        box(gsp, (x, 1080, zl + 16), (5, 5, 16), p=8, cuts=1)
        gsp.lathe([(0.01, 0), (5, 0), (0.3, 24), (0.01, 25)], (x, 1080, zl + 32), (x, 1080, zl + 57), segs=4)
    # 2. the town (x 380-720): stepped-gable houses along a canal, the great brick church tower
    wins = []
    for k, x in enumerate([392 + j * 30 for j in range(11)]):
        b, bd = ((WP["brick"], WP["brick_dk"]), (WP["brick_lt"], WP["brick"]), (WP["cream_dk"], WP["cream_dk"]))[k % 3]
        win = kit.stepped_gable_house(pt, x, 470 + (k % 3) * 3, zl, 26, rnd.uniform(26, 36), steps=3 + k % 2, brick=b, brick_dk=bd, trim=WP["cream"],
                                      dark=WP["dark"], hoist=k % 2 == 0, outline=0.4)
        if k % 3 == 0 and win:
            wins.append(win)
    _, cwin = kit.church(pt, 560, 540, zl, 90, 40, 76, stone=WP["brick"], stone_dk=WP["brick_dk"], roof=WP["slate"], spire=WP["slate"], dark=WP["dark"])
    wins.append(cwin)
    box(gw, (560, 456, zl + 0.3), (200, 5, 0.6), p=6, cuts=1)
    gtr, gtr2, gtt = pt.g(WP["willow"], outline=0.3), pt.g(WP["willow_dk"], outline=0.3), pt.g(WP["trunk"], outline=0.0)
    for k in range(14):
        x = 360 + k * 28 + rnd.uniform(-6, 6)
        kit.round_bush(gtr if k % 2 else gtr2, x, 452, rnd.uniform(7, 10), seed=600 + k, z=zl + 6, flat=0.85)
        gtt.capsule((x, 452, zl), (x, 452, zl + 8), 0.8)
    # 3. the windmills along the dyke (their sails turn: props); farms with tall thatched roofs, tree rows
    for (x, y, h, r) in WP_MILLS:
        rock(pt.g(WP["green_dk"], outline=0.0), (x, y + 6, zl), (r * 3.2, r * 2, 8), seed=int(x), jag=0.05, p=2.4)
        kit.windmill_tower(pt, x, y, zl + 6, h, r, body=WP["thatch"], body_dk=WP["thatch_dk"], cap=WP["thatch_dk"], trim=WP["white"], dark=WP["dark"],
                           base=WP["brick"])
    for k, (x, y) in enumerate(((-120, 420), (820, 430), (1360, 440), (60, 600), (1020, 610))):
        box(pt.g(WP["brick"], outline=0.3), (x, y, zl + 7), (16, 12, 7), p=8, cuts=1)
        kit.gable_roof(pt.g(WP["thatch"], outline=0.3), x, y, zl + 14, 34, 26, 20)
        if k < 3:
            st.light((x - 6, y - 13, zl + 6), 3)
    for k in range(40):
        x = rnd.choice((rnd.uniform(-260, 360), rnd.uniform(740, 1460)))
        y = rnd.choice((410, 470, 560, 640))
        kit.round_bush(gtr if k % 2 else gtr2, x, y, rnd.uniform(6, 9), seed=700 + k, z=zl + 4, flat=0.9)
    for w in wins[:4]:
        st.light(w, 3)
    pt.flush(st)


def _farmhouse(pt, st, x, y, z, s=1.0):
    """A Dutch farmhouse: a brick front with white window frames and green shutters under a huge steep
    thatched roof, a barn door. Returns a window point."""
    box(pt.g(WP["brick"], outline=0.5), (x, y, z + 10 * s), (30 * s, 20 * s, 10 * s), p=8, cuts=2)
    kit.gable_roof(pt.g(WP["thatch"], outline=0.5), x, y, z + 20 * s, 62 * s, 42 * s, 38 * s, along_x=False)
    gw, gsh, gd = pt.g(WP["white"], outline=0.2), pt.g(WP["green_dk"], outline=0.2), pt.g(WP["dark"], outline=0.0, highlight=False)
    for k in range(3):
        wx = x - 18 * s + k * 18 * s
        gw.slab([(wx - 4 * s, z + 5 * s), (wx + 4 * s, z + 5 * s), (wx + 4 * s, z + 14 * s), (wx - 4 * s, z + 14 * s)], y - 20.4 * s, 0.6)
        gd.slab([(wx - 3 * s, z + 6 * s), (wx + 3 * s, z + 6 * s), (wx + 3 * s, z + 13 * s), (wx - 3 * s, z + 13 * s)], y - 21 * s, 0.4)
        for sx in (-1, 1):
            gsh.slab([(wx + sx * 4 * s, z + 5 * s), (wx + sx * 7 * s, z + 5 * s), (wx + sx * 7 * s, z + 14 * s), (wx + sx * 4 * s, z + 14 * s)], y - 20.6 * s, 0.5)
    return (x, y - 22 * s, z + 10 * s)


def wp_mid(st, P):
    pt = Parts()
    rnd = random.Random(137)
    cy = WP_CANAL_Y
    # the dyke in front (grass), the canal behind it (grey-teal, low saturation), the far bank
    g, g2 = pt.g(WP["green"], outline=0.0), pt.g(WP["green_lt"], outline=0.0)
    for i in range(15):
        rock(g if i % 2 else g2, (-300 + i * 130, 62, 8), (96, 40, 32 + rnd.uniform(0, 4)), seed=i, jag=0.04, p=2.6)
    pt.g(WP["water"], finish="gloss", outline=0.0).blob((600, cy, 39.6), (1100, 40, 1.4), p=6, cuts=2)
    gwh = pt.g(WP["water_hi"], outline=0.0, highlight=False)
    for k in range(26):
        gwh.blob((rnd.uniform(-260, 1460), cy + rnd.uniform(-18, 10), 40.1), (rnd.uniform(8, 18), 1.0, 0.25), p=2.4, cuts=1)
    rock(pt.g(WP["green_dk"], outline=0.0), (600, cy + 40, 20), (1100, 18, 24), seed=40, jag=0.03, p=3.0)
    # bulb field rows on the dyke's slope, muted (rose, cream, mauve, butter), fences
    for k, (x0, x1, c) in enumerate(((-260, -40, WP["rose"]), (-20, 120, WP["butter"]), (420, 580, WP["mauve"]), (760, 1000, WP["rose"]), (1020, 1200, WP["butter"]),
                                     (1220, 1460, WP["cream_dk"]))):
        gfl, gfl2 = pt.g(c, outline=0.0), pt.g(mixc(c, WP["green_dk"], 0.45), outline=0.0)
        for j in range(4):
            (gfl if j % 2 == 0 else gfl2).capsule((x0, 50 + j * 7, 43 + j * 0.6), (x1, 50 + j * 7, 43 + j * 0.6), 2.2, 2.2)
    gfe = pt.g(WP["wood"], outline=0.2)
    for x in range(-250, 1460, 26):
        if 560 < x < 720:
            continue
        gfe.capsule((x, 82, 40), (x, 82, 50), 0.6)
    # 1. the drawbridge (x 600, the signature): white timber piers and gallows over the canal; its two leaves
    # are a prop (they rise every 30 s), the lamps on the gallows glow at night
    bx = WP_BRIDGE
    gwt = pt.g(WP["white"], outline=0.5)
    for sx in (-34, 34):
        box(pt.g(WP["brick_dk"], outline=0.4), (bx + sx, cy, 34), (6, 26, 8), p=8, cuts=1)
        for sy in (-14, 14):
            gwt.capsule((bx + sx, cy + sy, 40), (bx + sx, cy + sy, 98), 1.6)
        gwt.capsule((bx + sx, cy - 16, 96), (bx + sx, cy + 16, 96), 1.4)
        gwt.capsule((bx + sx, cy, 96), (bx + sx * 0.25, cy, 100), 1.2)
        st.light((bx + sx, cy - 16, 92), 4)
    gwt.capsule((bx - 34, cy, 100), (bx + 34, cy, 100), 1.6)
    box(gwt, (bx - 70, cy, 44), (30, 18, 2.4), p=6, cuts=1)
    box(gwt, (bx + 70, cy, 44), (30, 18, 2.4), p=6, cuts=1)
    for sx in (-1, 1):
        for k in range(6):
            gwt.capsule((bx + sx * (44 + k * 9), cy - 17, 46), (bx + sx * (44 + k * 9), cy - 17, 54), 0.6)
        gwt.capsule((bx + sx * 40, cy - 17, 54), (bx + sx * 96, cy - 17, 54), 0.6)
    # 2. the near windmill on its dyke (x 930) and the farmhouse beside it (x 1120), pollard willows
    mx, my, mz, mh, mr = WP_BIG_MILL
    rock(pt.g(WP["green_dk"], outline=0.0), (mx, my + 8, 20), (70, 40, 30), seed=51, jag=0.05, p=2.4)
    _, mwin = kit.windmill_tower(pt, mx, my, mz + 8, mh, mr, body=WP["thatch"], body_dk=WP["thatch_dk"], cap=WP["thatch_dk"], trim=WP["white"],
                                   dark=WP["dark"], base=WP["brick"])
    st.light(mwin, 4)
    fwin = _farmhouse(pt, st, 150, 120, 40, 1.0)
    st.light(fwin, 5)
    gwl, gwl2, gtt = pt.g(WP["willow"], outline=0.4), pt.g(WP["willow_dk"], outline=0.4), pt.g(WP["trunk"], outline=0.4)
    for k, x in enumerate((-200, -120, 40, 250, 470, 800, 900, 1100, 1300, 1400)):
        h = rnd.uniform(36, 48)
        gtt.capsule((x, 92, 40), (x, 92, 40 + h * 0.6), 4.0, 3.2)
        (gwl if k % 2 else gwl2).blob((x, 92, 40 + h * 0.8), (h * 0.34, h * 0.28, h * 0.3), p=2.2, cuts=3)
    # cows grazing on the dyke (black and white, small)
    gcw, gck = pt.g(WP["cow"], outline=0.4), pt.g(WP["cow_dk"], outline=0.3)
    for k, (x, fl) in enumerate(((-60, 1), (260, -1), (480, 1), (1060, -1))):
        gcw.blob((x, 60, 50), (9, 4, 5), p=2.4)
        gck.blob((x - 2 * fl, 57.5, 51.5), (4, 1.4, 3), p=2.2)
        gck.blob((x + 10 * fl, 60, 52), (3, 2.4, 2.6), p=2.2)
        for lx in (-6, 6):
            gck.capsule((x + lx, 60, 45), (x + lx, 60, 41), 1.0)
    pt.flush(st)


def _bridge_leaf(rig, length=62.0):
    """One leaf of the drawbridge, hinged at its pier (the joint), the deck and its railing, white; frames
    lift it (`l` rotates about the hinge)."""
    rig.joint("l", "all", (0, 0, 0))
    g = Geo()
    g.blob((length / 2, 0, 0), (length / 2, 16, 1.4), p=6, cuts=1)
    for k in range(5):
        g.capsule((k * length / 4, -16, 1), (k * length / 4, -16, 8), 0.5)
    g.capsule((0, -16, 8), (length, -16, 8), 0.5)
    rig.part("l", g, "#E8E4D8", outline=0.4)
    rig.part("l", Geo().capsule((length * 0.9, 0, 1), (length * 0.9, 0, 30), 0.4), "#3A3634", outline=0.0)


def wp_props():
    bx = WP_BRIDGE
    cy = WP_CANAL_Y
    mills = [_scr(kit.windmill_hub(x, y, WP_LAND_Z + 6, h, r), WP_FAR_E) for (x, y, h, r) in WP_MILLS]
    mx, my, mz, mh, mr = WP_BIG_MILL
    big = _scr(kit.windmill_hub(mx, my, mz + 8, mh, mr), WP_MID_E)
    hinge_l = _scr((bx - 30, cy - 18, 46), WP_MID_E)
    plist = [
        Prop("sail", "far", fauna.windmill_sails(sail="#E8E4D8", frame="#5A4E44", length=26, width=5.4), [{"s": {"r": -22.5 * f}} for f in range(4)],
             (60, 30, 30), mills[0][1]),
        Prop("bigsail", "mid", fauna.windmill_sails(sail="#E8E4D8", frame="#5A4E44", length=42, width=8.4), [{"s": {"r": -22.5 * f}} for f in range(4)],
             (96, 48, 48), big[1]),
        Prop("leaf", "mid", _bridge_leaf, [{"l": {"r": a}} for a in (0, 24, 48, 72)], (140, 80, 6), hinge_l[1]),
        Prop("barge", "mid", fauna.barge(size=1.0), [{}], (90, 40, 3), WP_BARGE_Y),
    ]
    up = ["leaf_0"] * 22 + ["leaf_1", "leaf_2", "leaf_3", "leaf_3", "leaf_3", "leaf_3", "leaf_3", "leaf_2", "leaf_2", "leaf_1"]
    sprites = [
        {"kind": "loop", "layer": "far", "frames": [f"sail_{i}" for i in range(4)], "fps": 3, "at": mills[0]},
        {"kind": "loop", "layer": "far", "frames": [f"sail_{i}" for i in (1, 2, 3, 0)], "fps": 2.6, "at": mills[1]},
        {"kind": "loop", "layer": "far", "frames": [f"sail_{i}" for i in (2, 3, 0, 1)], "fps": 3.4, "at": mills[2]},
        {"kind": "loop", "layer": "mid", "frames": [f"bigsail_{i}" for i in range(4)], "fps": 2.4, "at": big},
        # the signature: the drawbridge rises every 30 s (its leaf turns about the hinge on the left pier), as
        # the barge glides along the canal under it
        {"kind": "loop", "layer": "mid", "frames": up, "fps": 32 / 30, "at": hinge_l},
        {"kind": "path", "layer": "mid", "fps": 1, "periodS": 60, "keys": [[0, -360, WP_BARGE_Y, 1], [60, 1560, WP_BARGE_Y, 1]], "group": [{"frames": ["barge_0"]}]},
    ]
    return plist, sprites


SCENES = {
    "classic": Scene("gunpowder", "classic", SF_PAL, sf_far, sf_mid, back=sf_back, sky=SF_SKY, props=sf_props,
                     # a pale coast: light skies grade it gently (Winterfall washed the fort out at 0.5)
                     hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.4}, ground="earth",
                     # the fort stands low in the far strip, where the haze is thickest: a little less of it
                     look={"far": (0.18, 0.08, 0.16)}),
    "treasure_cove": Scene("gunpowder", "treasure_cove", TC_PAL, tc_far, tc_mid, back=tc_back, sky=TC_SKY, props=tc_props,
                           hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.55}, ground="earth"),
    "windmill_polder": Scene("gunpowder", "windmill_polder", WP_PAL, wp_far, wp_mid, back=wp_back, sky=WP_SKY, props=wp_props,
                             hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.5}, ground="earth",
                             look={"far": (0.18, 0.08, 0.18)}),
}
