"""Medieval scenes.

Classic "Castle Hills" (format 2, round 3): an English-style hill country in early summer under a pale
sky. Back: distant rolling downs, blue-green in the haze, woods along their crests. Far: rear downs in a
patchwork of fields with hedgerows and copses; the castle on its green hill left of centre (curtain
wall, towers and keep, its outer wall with a gate tower and the road winding up through it), the village
on its hill on the right (a church with a tall spire, timber cottages with smoke), sheep on the side
hills, poplars along a brook. Mid: a meadow bank with the mill pond (reeds, lily pads, a jetty and its
lantern), the watermill with its turning wheel, the timber-framed farm (house, barn, haystacks, fence),
oaks and hedgerows, an orchard and a well. Ambient: the castle's pennants, the mill wheel, swans on the
pond, a horse and cart along the bank, crows, chimney smoke; windows, the jetty lantern and the farm
lamp glow under night skies.

"Misty Moor" (format 2, round 2; Rare, Time Capsule): heather moorland under a grey-silver sky. Back: low
rolling moor ridges. Far: a ruined abbey on a rise (a roofless nave of pointed arches the hills show
through, a broken gable with a tall window, a bell tower), a lone round tower, dry-stone walls across
the hills, sheep. Mid: heather and gorse, a stone circle with a trilithon, a crooked wall, a wind-bent
hawthorn and a shepherd's bothy. Ambient: two low fog banks drift across (`path`), crows circle the
tower, the abbey bell swings; the bothy's window and the lantern at the circle glow under night skies.

Palette (PLAN 2b): heather mauve #8A7A88, moss #6A8650 (kept above 81 degrees of hue), grey stone
#9AA0A6; gorse flowers are a small accent.

"Harbour Town" (format 2, round 3; Epic, Wardrobe Crate): a timber-framed Hanseatic port in fresh sea
air. Back: the far side of the bay. Far: the harbour and the open sea; the town on its slope:
stepped-gable brick warehouses on the waterfront, roofs climbing behind, the church with its tall spire;
the mole curving out to the harbour mouth with its stone lighthouse; cogs at anchor and rowing boats; a
far island. Mid: the quay: timber-framed houses with smoking chimneys, the harbour crane with its
treadwheel, barrels, crates and nets, lanterns, the windmill on a grassy rise, a fishmonger's stall and
boats drawn up. Ambient: the windmill's sails turn, two cogs bob in the harbour, gulls, chimney smoke;
windows, lanterns, the lighthouse and the church glow under night skies.

Palette (PLAN 2b): parchment #E8DFC8, timber #6A4E3A, wine #8E2A4A as small accents.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.scenes import fauna, kit
from world.scenes.common import PaintedProp, Prop, Scene, box, cyl, dk, hx, mixc, ridge, rock, soft_blob
from world.scenes.kit import Parts

# -- Castle Hills (the classic, round 3) -------------------------------------------------------------
CH_PAL = dict(skyTop=0x8FB4D8, skyBottom=0xEAE6D6, light=0xFFF4DC, far=0x8E9A86, mid=0x7A8C62, near=0x5C7048)
CH = dict(
    meadow=0x88A266, meadow_dk=0x6E8A56, meadow_lt=0x9EB07A, field_gold=0xC2B27A, field_tan=0xAE9E72, field_brown=0x9A8466,
    hedge=0x55704A, hedge_dk=0x47603F, oak=0x5E7A4C, oak_dk=0x4E6840, oak_lt=0x6E8A58, trunk=0x5A4A3E, poplar=0x5A7650,
    stone=0xBDB4A2, stone_dk=0x9E9584, stone_lt=0xCFC6B4, rock=0x8E887C, slate=0x6B7682, slate_dk=0x57616D, dark=0x46404A,
    wine=0x8E2A4A, gold=0xD4A437, plaster=0xE8DFC8, timber=0x5E4A3E, thatch=0xB09A6C, thatch_dk=0x98845C, brick=0x8E7268,
    road=0xC4B898, water=0x9AB2B8, water_hi=0xC8D8DA, reed=0x7E8A5A, reed_dk=0x66724A, lily=0x6E8A5A, wood=0x6E5A48,
    wood_dk=0x55463A, hay=0xC2B07A, hay_dk=0xA8955E, wool=0xEAE6DC, flower=0xE8DFC8,
)
CH_SKY = {"top": "#8FB4D8", "bottom": "#EAE6D6", "horizon": "#F2EEDE", "cloudTint": "#F6F4EE", "celestial": "sun",
          "sunAt": [180, -560, 40], "clouds": 0.9}
CH_FAR_E = math.radians(8.0)
CH_MID_E = math.radians(12.0)
CH_CASTLE = (460.0, 400.0, 90.0)      # the castle's centre and base height (far)
CH_HILL = (460.0, 404.0, -10.0, 230.0, 92.0, 102.0)   # its hill: x, y, z, rx, ry, h
CH_WHEEL = (482.0, 74.0, 40.0, 17.0)  # the mill wheel: x, y, foot z, radius (mid)
CH_CART_Y = -50.0                     # the cart's lane along the bank (mid, screen lu)
CH_POND = (340.0, 84.0, 41.0, 128.0, 34.0)  # the mill pond: x, y, surface z, rx, ry (mid)


def _hill_top(x, hx, hz, rx, h, p=2.4):
    """The crest height of a `kit.hill` at x (its superellipse top, without the jag)."""
    u = abs(x - hx) / rx
    return hz + h * max(0.0, 1.0 - u ** p) ** (1.0 / p) if u < 1 else hz


def _front_y(x, z, hx, hy, hz, rx, ry, h, p=2.4):
    """The y of a hill's camera-facing surface at (x, z), or None off the hill."""
    t = 1.0 - abs((x - hx) / rx) ** p - abs((z - hz) / h) ** p
    return hy - ry * t ** (1.0 / p) if t > 0 else None


def _hedge_line(g, pts, r, rnd, gap=0.0):
    """A hedgerow: round bushes close together along a polyline of (x, y, z) points."""
    for (ax, ay, az), (bx, by, bz) in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(bx - ax, bz - az) / (r * 1.25)))
        for k in range(n):
            if gap and rnd.random() < gap:
                continue
            t = k / n
            kit.round_bush(g, ax + (bx - ax) * t, ay + (by - ay) * t, r * rnd.uniform(0.8, 1.15), seed=rnd.randint(0, 99999),
                           z=az + (bz - az) * t - r * 0.4, flat=0.7)


def ch_back(st, P):
    """Distant rolling downs, blue-green in the haze, a far ridge of woods along their crests."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    ridge(st, hz(CH["meadow_dk"], 0.4), -300, 1500, -40, 120, 1500, 7, lumps=8, jag=0.05, peaks=False)
    ridge(st, hz(CH["hedge"], 0.34), -300, 1500, -40, 90, 1320, 9, lumps=11, jag=0.08, peaks=False)


def ch_far(st, P):
    pt = Parts()
    rnd = random.Random(31)
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    fields = (CH["meadow"], CH["field_gold"], CH["meadow_dk"], CH["field_tan"], CH["meadow_lt"], CH["field_brown"])
    # 1. the rear downs: patchwork fields (each hill its own crop), hedgerows and copses on the crests
    rear = []
    for i in range(10):
        x = -300 + i * 190 + rnd.uniform(-30, 30)
        h = rnd.uniform(100, 130) if not (760 <= x <= 1020) else rnd.uniform(64, 80)
        rear.append((x, 600, -20, rnd.uniform(140, 190), 90, h))
        kit.hill(pt.g(hz(fields[i % 6], 0.3), outline=0.0), x, 600, -20, rear[-1][3], 90, h, seed=10 + i, jag=0.03, p=2.4)
    mids = []
    for i in range(11):
        x = -280 + i * 170 + rnd.uniform(-25, 25)
        h = rnd.uniform(70, 92) if not (780 <= x <= 1000) else rnd.uniform(46, 56)
        mids.append((x, 500, -20, rnd.uniform(120, 160), 80, h))
        kit.hill(pt.g(hz(fields[(i + 3) % 6], 0.18), outline=0.0), x, 500, -20, mids[-1][3], 80, h, seed=40 + i, jag=0.03, p=2.4)
    gh, gh2 = pt.g(hz(CH["hedge"], 0.2), outline=0.0), pt.g(hz(CH["hedge_dk"], 0.2), outline=0.0)
    for k, (x, y, z, rx, ry, h) in enumerate(mids):
        # a hedgerow along each crest, a copse here and there
        pts = [(x + u * rx, y - 6, _hill_top(x + u * rx, x, z, rx, h) + 1) for u in (-0.85, -0.45, 0.0, 0.45, 0.85)]
        _hedge_line(gh if k % 2 else gh2, pts, 4.2, rnd, gap=0.12)
        if k % 3 != 2:
            for j in range(4 + (k % 3) * 3):
                cx_ = x + rnd.uniform(-0.4, 0.4) * rx
                kit.broadleaf(gh2, pt.g(CH["trunk"], outline=0.0), cx_, y - 20, rnd.uniform(16, 22), rnd.uniform(7, 9), seed=900 + k * 10 + j,
                              z=_hill_top(cx_, x, z, rx, h) - 4)
    # 2. the castle hill, the village hill and the side hills in front, each a patchwork of fields (crops
    # lying on the hill in slanted bands, `kit.field_patch`) with hedgerows along the field edges
    hx, hy, hz0, hrx, hry, hh = CH_HILL
    side = [(-160, 392, -12, 170, 80, 74), (70, 380, -12, 130, 70, 60), (800, 380, -12, 120, 70, 50), (1080, 410, -12, 170, 80, 84),
            (1330, 390, -12, 170, 80, 76)]
    crops = (CH["meadow"], CH["field_gold"], CH["meadow_dk"], CH["field_tan"], CH["meadow_lt"], CH["field_brown"])
    for k, (x, y, z, rx, ry, h) in enumerate(side):
        hill = (x, y, z, rx, ry, h, 70 + k, 0.03, 2.4)
        kit.hill(pt.g(crops[(k * 2 + 1) % 6], outline=0.0), x, y, z, rx, ry, h, seed=70 + k, jag=0.03, p=2.4)
        # three bands across the face, the middle one split by height
        b = [x - rx * 1.1, x - rx * 0.36 + rnd.uniform(-8, 8), x + rx * 0.28 + rnd.uniform(-8, 8), x + rx * 1.1]
        lean = [0.0, rnd.uniform(0.4, 0.8), -rnd.uniform(0.4, 0.8), 0.0]
        zc = z + h * rnd.uniform(0.5, 0.62)
        for j in range(3):
            if j == 1:
                kit.field_patch(pt.g(crops[(k + 2) % 6], outline=0.0), hill, b[1], b[2], None, zc, lean[1], lean[2])
                kit.field_patch(pt.g(crops[(k + 4) % 6], outline=0.0), hill, b[1], b[2], zc, None, lean[1], lean[2])
            elif (j + k) % 2 == 0:
                kit.field_patch(pt.g(crops[(k + 3 + j) % 6], outline=0.0), hill, b[j], b[j + 1], None, None, lean[j], lean[j + 1])
        g = gh if k % 2 else gh2
        for j in (1, 2):
            line = []
            for zt in (0.06, 0.3, 0.55, 0.8, 0.96):
                zz = z + h * zt
                xx = b[j] + lean[j] * (zz - z)
                fy = _front_y(xx, zz, x, y, z, rx, ry, h)
                if fy is not None:
                    line.append((xx, fy - 2.2, zz))
            if len(line) >= 2:
                _hedge_line(g, line, 3.6, rnd, gap=0.08)
        crest = [(x + u * rx, y - 8, _hill_top(x + u * rx, x, z, rx, h) + 1) for u in (-0.8, -0.3, 0.2, 0.75)]
        _hedge_line(g, crest, 4.4, rnd, gap=0.12)
    castle_hill = (hx, hy, hz0, hrx, hry, hh, 91, 0.03, 2.4)
    kit.hill(pt.g(CH["meadow"], outline=0.0), hx, hy, hz0, hrx, hry, hh, seed=91, jag=0.03, p=2.4)
    # the castle hill's lower flanks: a hay meadow left, pasture right, hedged
    kit.field_patch(pt.g(CH["field_tan"], outline=0.0), castle_hill, hx - hrx * 1.1, hx - 70, None, hz0 + 46, 0.0, 0.9)
    kit.field_patch(pt.g(CH["meadow_dk"], outline=0.0), castle_hill, hx + 90, hx + hrx * 1.1, None, hz0 + 50, -0.9, 0.0)
    for (xa, lean_) in ((hx - 70, 0.9), (hx + 90, -0.9)):
        line = []
        for zz in (2, 14, 28, 42):
            xx = xa + lean_ * (zz - hz0)
            fy = _front_y(xx, zz, hx, hy, hz0, hrx, hry, hh)
            if fy is not None:
                line.append((xx, fy - 2.2, zz))
        _hedge_line(gh2, line, 3.8, rnd)
    # 3. the outer wall on the hill below the castle, with its gate tower over the road
    go_w = pt.g(CH["stone_dk"], outline=0.3)
    ow = []
    for x in range(330, 611, 28):
        zz = 62 - 0.0006 * (x - 470) ** 2
        fy = _front_y(x, zz, hx, hy, hz0, hrx, hry, hh)
        if fy is not None:
            ow.append((x, fy + 2.0, zz - 1))
    for (ax, ay, az), (bx, by, bz) in zip(ow, ow[1:]):
        kit.wall(go_w, ax, ay, bx, by, (az + bz) / 2 - 2, 12, t=4.0)
        kit.merlons(go_w, ax, ay, bx, by, (az + bz) / 2 + 10, step=5.0, w=2.2, d=2.0, h=2.4)
    for (tx, ty, tz) in (ow[0], ow[-1]):
        kit.round_tower(go_w, pt.g(CH["slate_dk"], outline=0.3), pt.g(CH["dark"], outline=0.0, highlight=False), tx, ty, tz - 3, tz + 16, 6.0,
                        roof_h=13, slits=1)
    # the road up to the castle gate: a pale track winding up the hill's face through the outer wall
    gro = pt.g(CH["road"], outline=0.0, highlight=False)
    road = [(214, 6), (260, 22), (318, 36), (372, 46), (356, 58), (396, 70), (436, 80), (458, 88)]
    for (ax, az), (bx, bz) in zip(road, road[1:]):
        n = max(2, int(math.hypot(bx - ax, bz - az) / 3.4))
        for k in range(n):
            t = k / n
            x, z = ax + (bx - ax) * t, az + (bz - az) * t
            fy = _front_y(x, z, hx, hy, hz0, hrx, hry, hh)
            if fy is not None:
                gro.blob((x, fy - 2.4, z), (5.4, 2.4, 1.9), p=2.2, cuts=2)
    # 4. the castle (the signature)
    cx, cy, cz = CH_CASTLE
    rock(pt.g(CH["meadow_dk"], outline=0.0), (cx, cy - 4, cz - 6), (104, 44, 12), seed=95, jag=0.05, p=2.6)
    gcr = pt.g(dk(CH["rock"], 0.06), outline=0.3)
    for k, (dx, dy, rx, rz) in enumerate(((-94, -26, 9, 10), (-78, -34, 7, 6), (92, -26, 9, 10), (70, -36, 6, 5), (-30, -44, 6, 4), (30, -44, 7, 4))):
        rock(gcr, (cx + dx, cy + dy, cz - 5), (rx, 7, rz), seed=97 + k, jag=0.24, p=2.2)
    out = kit.castle(pt, cx, cy, cz, yaw=-12.0, stone=CH["stone"], stone_dk=CH["stone_dk"], roof=CH["slate"], roof_dk=CH["slate_dk"],
                     dark=CH["dark"], banner=CH["wine"], trim=CH["gold"])
    for w in out["windows"][:6]:
        st.light(w, 3)
    st.amb("emit", "bd.puff", (cx - 4, cy + 14, cz + 40), rate=0.3, speed=6, scale=0.7, tint=0xE6E2DA, alpha=0.3, life=3200, drift=5)
    # trees round the hill's foot and along the road
    go, go2, gt = pt.g(CH["oak"], outline=0.3), pt.g(CH["oak_dk"], outline=0.3), pt.g(CH["trunk"], outline=0.0)
    for k in range(18):
        x = rnd.uniform(240, 700)
        if 380 < x < 560:
            continue
        z = max(4.0, _hill_top(x, hx, hz0, hrx, hh) * rnd.uniform(0.2, 0.5))
        fy = _front_y(x, z, hx, hy, hz0, hrx, hry, hh) or 330
        kit.broadleaf(go if k % 2 else go2, gt, x, fy - 4, rnd.uniform(18, 26), rnd.uniform(8, 11), seed=300 + k, z=z - 3)
    # 5. the village on its hill: a church with a tall spire, timber cottages, smoke and lit windows
    vx = 1080
    vz = _hill_top(vx, 1080, -12, 170, 84)
    box(pt.g(CH["stone_lt"], outline=0.3), (vx - 16, 418, vz + 9), (20, 8, 11), p=7, cuts=2, rot=(0, 0, -10))
    kit.gable_roof(pt.g(CH["slate"], outline=0.3), vx - 16, 418, vz + 19, 40, 16, 12, yaw=-10)
    box(pt.g(CH["stone_lt"], outline=0.3), (vx + 12, 414, vz + 26), (7, 7, 28), p=7, cuts=2, rot=(0, 0, -10))
    pt.g(CH["slate_dk"], outline=0.3).lathe([(0.01, 0), (9.6, 0), (6.0, 6), (0.4, 46), (0.01, 47)], (vx + 12, 414, vz + 53), (vx + 12, 414, vz + 100), segs=4,
                                            rot=(0, 0, 35))
    box(pt.g(CH["dark"], outline=0.0, highlight=False), (vx + 10.8, 406.6, vz + 40), (1.4, 0.4, 3.2), p=4, cuts=1, rot=(0, 0, -10))
    st.light((vx - 22, 409, vz + 8), 4)
    houses = ((970, 404, 16, 12, 9, 8, 10, CH["thatch"], 8), (1006, 392, 18, 12, 9, 8, 11, CH["slate"], -14), (1150, 396, 18, 12, 9, 9, 11, CH["thatch"], 12),
              (1190, 412, 16, 11, 8, 8, 10, CH["slate"], -8), (1118, 384, 14, 10, 8, 7, 9, CH["thatch"], 6), (930, 386, 14, 10, 8, 7, 9, CH["slate"], -10))
    for k, (x, y, w, d, h1, h2, rh, roof, yaw) in enumerate(houses):
        z = _hill_top(x, 1080, -12, 170, 84) - 3
        win, chim = kit.timber_house(pt, x, y, z, w, d, h1, h2, rh, plaster=CH["plaster"], timber=CH["timber"], roof=roof, base=CH["stone_dk"],
                                     dark=CH["dark"], yaw=yaw, jetty=1.0, thatch=roof == CH["thatch"], chimney=CH["brick"] if k in (1, 2) else None,
                                     seed=60 + k, outline=0.3)
        if k in (0, 2, 4):
            st.light(win, 3)
        if chim and k == 2:
            st.amb("emit", "bd.puff", chim, rate=0.3, speed=7, scale=0.6, tint=0xE6E2DA, alpha=0.32, life=3000, drift=4)
    for k in range(10):
        x = rnd.uniform(900, 1260)
        z = _hill_top(x, 1080, -12, 170, 84) * rnd.uniform(0.5, 0.9) - 2
        fy = _front_y(x, z, 1080, 410, -12, 170, 80, 84) or 380
        kit.broadleaf(go if k % 2 else go2, gt, x, fy - 3, rnd.uniform(14, 20), rnd.uniform(6, 8), seed=500 + k, z=z - 2)
    # 6. sheep on the side hills, poplars along a far brook
    gwo, gdk = pt.g(CH["wool"], outline=0.3), pt.g(CH["dark"], outline=0.0)
    for k in range(14):
        hill = side[k % len(side)]
        x = hill[0] + rnd.uniform(-0.6, 0.6) * hill[3]
        z = hill[2] + hill[5] * rnd.uniform(0.25, 0.75)
        fy = _front_y(x, z, *hill)
        if fy is None or 900 < x < 1260:
            continue
        gwo.blob((x, fy - 3, z + 3), (4.4, 3.0, 3.0), p=2.2)
        gdk.sphere((x + 4.8, fy - 3.4, z + 4.4), 1.5)
    gp = pt.g(CH["poplar"], outline=0.3)
    for k, x in enumerate((690, 712, 736, 1260, 1284)):
        gp.blob((x, 352, 26), (5.4, 4.6, 22), p=2.0, cuts=3)
        gt.capsule((x, 352, 0), (x, 352, 8), 1.1)
    pt.flush(st)


def ch_mid(st, P):
    pt = Parts()
    rnd = random.Random(37)
    px, py, pz, prx, pry = CH_POND
    # the bank: meadow, lower where the pond lies
    g = pt.g(CH["meadow"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        low = abs(x - px) < prx + 40
        rock(g, (x, 80, 8), (96, 60, (30 if low else 40) + rnd.uniform(0, 10)), seed=i, jag=0.05, p=2.4)
    # grass tufts and flowers (parchment and gold: small accents)
    gg, gg2 = pt.g(CH["meadow_dk"], finish="hair", outline=0.3), pt.g(CH["hedge"], finish="hair", outline=0.3)
    for i in range(70):
        x = rnd.uniform(-250, 1450)
        if abs(x - px) < prx - 10:
            continue
        kit.round_bush(gg if i % 2 else gg2, x, rnd.uniform(26, 46), rnd.uniform(4, 7), seed=1000 + i, z=rnd.uniform(36, 46), flat=0.6)
    gfl, gfo = pt.g(CH["flower"], outline=0.0, highlight=False), pt.g(CH["gold"], outline=0.0, highlight=False)
    for i in range(60):
        x = rnd.uniform(-250, 1450)
        if abs(x - px) < prx:
            continue
        (gfl if i % 3 else gfo).sphere((x, rnd.uniform(24, 40), rnd.uniform(44, 48)), rnd.uniform(1.0, 1.4), cuts=2)
    # 1. the mill pond (x 210-470): grey-teal water, reeds, lily pads, a jetty and its lantern
    gwa = pt.g(CH["water"], finish="gloss", outline=0.4)
    gwa.blob((px, py, pz), (prx, pry, 1.6), p=2.6, cuts=3)
    gwh = pt.g(CH["water_hi"], outline=0.0, highlight=False)
    for k in range(7):
        x = px + rnd.uniform(-0.75, 0.75) * prx
        gwh.blob((x, py - pry * rnd.uniform(0.1, 0.6), pz + 1.7), (rnd.uniform(10, 24), 1.4, 0.3), p=2.4, cuts=2)
    gre, gre2 = pt.g(CH["reed"], outline=0.3), pt.g(CH["reed_dk"], outline=0.3)
    for k in range(26):
        a = rnd.uniform(0, 2 * math.pi)
        if 0.3 < a < 2.8 and rnd.random() < 0.6:
            continue
        x, y = px + math.cos(a) * prx * 0.98, py + math.sin(a) * pry * 0.98
        for j in range(4):
            gx = x + rnd.uniform(-3, 3)
            (gre if j % 2 else gre2).capsule((gx, y, pz), (gx + rnd.uniform(-1.6, 1.6), y, pz + rnd.uniform(9, 15)), 0.55, 0.3)
    gli = pt.g(CH["lily"], outline=0.2)
    for k in range(9):
        gli.blob((px + rnd.uniform(-0.6, 0.2) * prx, py + rnd.uniform(-0.5, 0.5) * pry, pz + 1.8), (3.0, 2.0, 0.4), p=2.0, cuts=2)
    gwd, gwd2 = pt.g(CH["wood"], outline=0.4), pt.g(CH["wood_dk"], outline=0.4)
    for k in range(5):
        gwd2.capsule((248 + k * 9, 56, pz - 6), (248 + k * 9, 56, pz + 3), 0.9)
        gwd2.capsule((248 + k * 9, 66, pz - 6), (248 + k * 9, 66, pz + 3), 0.9)
    box(gwd, (266, 61, pz + 3.4), (20, 6, 0.9), p=5, cuts=1)
    gwd2.capsule((248, 56, pz + 3), (248, 56, pz + 16), 0.8)
    st.light((248, 54, pz + 17), 4)
    # 2. the watermill (x 490-600): stone ground floor, a timber-framed upper floor, the flume over the wheel
    wx, wy, wz, wr = CH_WHEEL
    gst, gst2 = pt.g(CH["stone"], outline=0.5), pt.g(CH["stone_dk"], outline=0.5)
    box(gst, (552, 92, 40 + 13), (34, 18, 13), p=7, cuts=2, rot=(0, 0, -14))
    win, chim = kit.timber_house(pt, 552, 92, 66, 66, 34, 1.0, 22, 26, plaster=CH["plaster"], timber=CH["timber"], roof=CH["slate"],
                                 base=CH["stone_dk"], dark=CH["dark"], yaw=-14, jetty=1.8, chimney=None, seed=7)
    st.light(win, 5)
    box(pt.g(CH["dark"], outline=0.0, highlight=False), (528, 72.6, 50), (5, 0.5, 8), p=4, cuts=1, rot=(0, 0, -14))
    # the wheel's race: low stone walls behind and beside the undershot wheel, the water churning at its foot
    box(gst2, (wx + 2, wy + 9, 43), (wr + 6, 3.2, 5), p=6, cuts=1)
    box(gst2, (wx + wr + 6, wy + 2, 43), (3.0, 9, 5), p=6, cuts=1)
    pt.g(CH["water"], finish="gloss", outline=0.3).blob((wx, wy - 4, pz + 0.4), (wr + 10, 9, 1.4), p=2.6, cuts=2)
    gfm = pt.g(0xEEF2F2, outline=0.3)
    for k in range(7):
        gfm.blob((wx + rnd.uniform(-wr, wr), wy - 9 - rnd.uniform(0, 4), pz + rnd.uniform(0.6, 2.4)), (rnd.uniform(3, 5), 2.2, rnd.uniform(1.8, 3)), p=2.0, cuts=2)
    # 3. the timber-framed farm (x 700-900): the house with its smoking chimney, a barn, haystacks, a fence
    win, chim = kit.timber_house(pt, 760, 96, 40, 50, 24, 18, 16, 24, plaster=CH["plaster"], timber=CH["timber"], roof=CH["thatch"],
                                 base=CH["stone_dk"], dark=CH["dark"], yaw=-16, jetty=2.0, thatch=True, chimney=CH["brick"], seed=3)
    st.light(win, 5)
    st.light((744, 70, 52), 4)
    st.amb("emit", "bd.puff", chim, rate=0.6, speed=10, scale=1.0, tint=0xE4E0DA, alpha=0.4, life=2800, drift=5)
    gba, gba2 = pt.g(CH["wood"], outline=0.5), pt.g(CH["wood_dk"], outline=0.5)
    box(gba, (862, 112, 40 + 15), (24, 16, 15), p=7, cuts=2, rot=(0, 0, 10))
    kit.gable_roof(pt.g(CH["slate_dk"], outline=0.5), 862, 112, 70, 50, 34, 22, yaw=10)
    box(gba2, (856, 95.2, 52), (9, 0.6, 12), p=4, cuts=1, rot=(0, 0, 10))
    for k in range(5):
        box(gba2, (842 + k * 9, 95.6, 55), (0.5, 0.4, 14), p=4, cuts=1, rot=(0, 0, 10))
    ghy, ghy2 = pt.g(CH["hay"], outline=0.5), pt.g(CH["hay_dk"], outline=0.5)
    for k, (x, y, r) in enumerate(((900, 74, 11), (924, 86, 9), (690, 70, 9))):
        (ghy if k % 2 == 0 else ghy2).lathe([(0.01, 0), (r, 0), (r * 1.05, r * 0.8), (r * 0.7, r * 1.5), (0.4, r * 1.9), (0.01, r * 1.95)], (x, y, 38), (x, y, 38 + r * 1.95),
                                            segs=16)
    gfe = pt.g(CH["wood_dk"], outline=0.3)
    for x in range(640, 960, 22):
        gfe.capsule((x, 46, 38), (x, 46, 56), 1.1)
    gfe.capsule((640, 46, 52), (938, 46, 52), 0.8)
    gfe.capsule((640, 46, 44), (938, 46, 44), 0.8)
    # 4. oaks and hedgerows (nothing tall at x 220-480: the castle stands behind the pond at the game's camera)
    go, go2, gol, gt = pt.g(CH["oak"], outline=0.5), pt.g(CH["oak_dk"], outline=0.5), pt.g(CH["oak_lt"], outline=0.5), pt.g(CH["trunk"], outline=0.4)
    for k, (x, y, h, r) in enumerate(((-200, 96, 150, 46), (-64, 112, 120, 36), (120, 100, 140, 42), (640, 118, 130, 38), (1000, 104, 150, 46),
                                      (1240, 116, 120, 36), (1400, 98, 146, 44))):
        kit.broadleaf((go, go2, gol)[k % 3], gt, x, y, h, r, seed=800 + k, z=34)
    ghe, ghe2 = pt.g(CH["hedge"], outline=0.5), pt.g(CH["hedge_dk"], outline=0.5)
    for (x0, x1, y) in ((-250, 200, 130), (600, 700, 130), (940, 1460, 132)):
        _hedge_line(ghe if x0 % 2 else ghe2, [(x0, y, 48), (x1, y, 48)], 9.0, rnd)
    for (x0, x1, y) in ((-250, -120, 40), (1060, 1200, 40)):
        _hedge_line(ghe2, [(x0, y, 40), (x1, y, 40)], 8.0, rnd, gap=0.15)
    # 5. an orchard and a well on the right
    gfr, gfr2 = pt.g(CH["oak_lt"], outline=0.5), pt.g(CH["oak"], outline=0.5)
    for k in range(8):
        x = 1080 + (k % 4) * 38 + (k // 4) * 18
        y = 90 + (k // 4) * 22
        kit.broadleaf(gfr if k % 2 else gfr2, gt, x, y, rnd.uniform(46, 56), rnd.uniform(16, 19), seed=1200 + k, z=36)
    cyl(gst, (1230, 70, 38), (1230, 70, 48), 9, bevel=0.8, segs=16)
    for dx in (-7, 7):
        gwd2.capsule((1230 + dx, 70, 46), (1230 + dx, 70, 66), 0.9)
    pt.g(CH["slate_dk"], outline=0.4).lathe([(0.01, 0), (12, 0), (0.4, 8), (0.01, 8.4)], (1230, 70, 66), (1230, 70, 74.4), segs=4, rot=(0, 0, 45),
                                            squash=(1.0, 0.6))
    # boulders
    gb = pt.g(CH["rock"], outline=0.5)
    for i in range(10):
        x = rnd.uniform(-240, 1440)
        if 200 < x < 620 or 680 < x < 960:
            continue
        rock(gb, (x, rnd.uniform(34, 50), 38), (rnd.uniform(6, 11), 6, rnd.uniform(4, 7)), seed=900 + i, jag=0.2)
    pt.flush(st)


def _pennant(rig, length=18.0, width=4.6, pole=12.0):
    """A swallow-tailed pennant on a short pole: four waving outlines on hidden joints (one per frame)."""
    rig.part("all", Geo().capsule((0, 0, 0), (0, 0, pole + width + 1), 0.5), "#5E5040", outline=0.3)
    rig.part("all", Geo().sphere((0, 0, pole + width + 1.4), 0.9), "#D4A437", outline=0.2)
    for f in range(4):
        j = rig.joint(f"p{f}", "all", (0, 0, 0), hidden=True)
        top, bot = [], []
        n = 9
        for k in range(n + 1):
            u = k / n
            wv = math.sin(2 * math.pi * (u * 1.1 - f / 4)) * (0.6 + 2.2 * u)
            half = width / 2 * (1 - 0.35 * u)
            x = u * length * (1 - 0.06 * abs(math.sin(math.pi * f / 2)))
            top.append((x, pole + width / 2 + wv + half))
            bot.append((x, pole + width / 2 + wv - half))
        tail = (top[-1][0] - width * 0.9, (top[-1][1] + bot[-1][1]) / 2)
        pts = top + [tail] + list(reversed(bot))
        rig.part(j, Geo().slab(pts, 0, 0.6), "#8E2A4A", outline=0.3)


def _wheel(rig):
    """The mill wheel: a rim with twelve paddles and six spokes round a hub, turning on its joint."""
    wr = CH_WHEEL[3]
    rig.joint("w", "all", (0, 0, wr))
    g = Geo()
    kit.annulus(g, (0, 0, wr), wr - 2.0, wr, 5.0, rot=(90, 0, 0), segs=40)
    rig.part("w", g, hx(CH["wood_dk"]), outline=0.5)
    sp = Geo()
    for k in range(6):
        a = math.pi * k / 3
        sp.capsule((0, -1.0, wr), (math.cos(a) * (wr - 1.5), -1.0, wr + math.sin(a) * (wr - 1.5)), 0.9)
    rig.part("w", sp, hx(CH["wood"]), outline=0.3)
    pd = Geo()
    for k in range(12):
        a = 2 * math.pi * k / 12
        box(pd, (math.cos(a) * (wr + 0.4), 0, wr + math.sin(a) * (wr + 0.4)), (2.6, 3.2, 0.7), p=5, cuts=1, rot=(0, -math.degrees(a), 0))
    rig.part("w", pd, hx(CH["wood"]), outline=0.4)
    rig.part("w", Geo().capsule((0, -3.4, wr), (0, 3.4, wr), 2.2), hx(CH["dark"]), outline=0.3)


def ch_props():
    cx, cy, cz = CH_CASTLE
    # (the castle's cone tips: kit.castle returns them; worked out the same way here)
    great = kit._at(cx, cy, -42, 16, -12.0)
    keep = kit._at(*kit._at(cx, cy, 16, 4, -12.0), 24, -17, -12.0)
    pa = _scr((great[0], great[1], cz + 76 + 2.2 + 26), CH_FAR_E)
    pb = _scr((keep[0], keep[1], cz + 74 + 2.2 + 13), CH_FAR_E)
    wx, wy, wz, wr = CH_WHEEL
    wheel = _scr((wx, wy - 6, wz), CH_MID_E)
    crow = fauna.bird(body="#3E3A40", wing="#2E2A32", beak="#4A4448", span=12, size=0.9)
    ring = [[i * 2, round(cx - 30 + 90 * math.cos(math.pi * i / 3)), round(pa[1] - 30 + 16 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    swan_at = _scr((CH_POND[0] - 30, CH_POND[1] - 10, CH_POND[2] + 1.0), CH_MID_E)
    plist = [
        Prop("pen", "far", _pennant, [{f"p{f}": {"show": True}} for f in range(4)], (24, 22, 2), pa[1]),
        Prop("wheel", "mid", _wheel, [{"w": {"r": -15 * f}} for f in range(4)], (2 * wr + 10, 2 * wr + 6, 3), wheel[1]),
        Prop("crow", "far", crow, [fauna.bird_pose(f) for f in range(5)], (40, 24, 24), ring[0][2]),
        Prop("swan", "mid", fauna.swans(), [{}], (40, 18, 3), swan_at[1]),
        Prop("cart", "mid", fauna.horse_cart(size=1.0), [dict(fauna.walk4_pose(f, swing=16, bob=0.6, head=2.0), wh={"r": -15 * f}) for f in range(4)],
             (90, 46, 3), CH_CART_Y),
    ]
    sprites = [
        {"kind": "loop", "layer": "far", "frames": [f"pen_{i}" for i in range(4)], "fps": 5, "at": pa},
        {"kind": "loop", "layer": "far", "frames": [f"pen_{i}" for i in (2, 3, 0, 1)], "fps": 5, "at": pb},
        {"kind": "loop", "layer": "mid", "frames": [f"wheel_{i}" for i in range(4)], "fps": 4, "at": wheel},
        {"kind": "path", "layer": "far", "fps": 6, "periodS": 13, "keys": ring,
         "group": [{"frames": ["crow_4", "crow_0", "crow_1", "crow_2", "crow_3"]}, {"frames": ["crow_0", "crow_1", "crow_2", "crow_3", "crow_4"], "dx": -26, "dy": 9, "phase": 2}]},
        {"kind": "bob", "layer": "mid", "frames": ["swan_0"], "at": swan_at, "amp": [14, 0.4], "periodS": 26, "tilt": 0.6},
        {"kind": "path", "layer": "mid", "fps": 5, "periodS": 90,
         "keys": [[0, 560, CH_CART_Y, 0], [2, 580, CH_CART_Y, 1], [62, 1300, CH_CART_Y, 1], [64, 1320, CH_CART_Y, 0], [90, 1320, CH_CART_Y, 0]],
         "group": [{"frames": [f"cart_{i}" for i in range(4)]}]},
    ]
    return plist, sprites


# -- Misty Moor (round 2) -------------------------------------------------------------------------------
MM_PAL = dict(skyTop=0x8E9AA6, skyBottom=0xD6D8D4, light=0xF2F0EA, far=0x8E8890, mid=0x76766A, near=0x5A5E50)
MM = dict(
    heather=0x7E6A80, heather_dk=0x66566A, heather_lt=0x988496, moor=0x7C7E5E, moor_dk=0x646A4E, moss=0x627E46, moss_dk=0x50683E,
    stone=0x9AA0A6, stone_dk=0x7E838A, stone_lt=0xB0B4B6, lichen=0xA4A68A, ivy=0x4E6448, gorse=0x4E6448, gorse_fl=0xC8AE52,
    thatch=0xA8946E, wood=0x5E4E40, dark=0x3E3A44, path=0x8E826C, wool=0xE6E2D8, bark=0x5E5048,
)
MM_SKY = {"top": "#8E9AA6", "bottom": "#D6D8D4", "horizon": "#E0E0DA", "cloudTint": "#D6D6D2", "celestial": "sun",
          "sunAt": [540, -560, 26], "clouds": 1.0}
MM_FAR_E = math.radians(8.0)
MM_MID_E = math.radians(12.0)
MM_BELL = (520.0, 330.0, 226.0)     # the bell's pivot in the abbey tower's belfry (far)
MM_FOG_FAR = -92.0
MM_FOG_MID = -70.0


def _scr(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


def _pointed(xl, xr, zs, n=7, k=1.5):
    """The outline of a lancet arch from (xl, zs) up to its apex and down to (xr, zs): two arcs of radius
    k x the width (k = 1 is the equilateral arch; more is taller and sharper)."""
    w = xr - xl
    r = k * w
    a0 = math.acos(max(-1.0, min(1.0, (w / 2 - r) / r)))  # the apex angle on the left arc (centre xl + r)
    left = [(xl + r + r * math.cos(math.pi - (math.pi - a0) * i / n), zs + r * math.sin(math.pi - (math.pi - a0) * i / n)) for i in range(n + 1)]
    right = [(2 * (xl + w / 2) - x, z) for x, z in reversed(left[:-1])]
    return left + right


def arcade(g, x0, x1, y, z, spring, tops, depth=8.0, pier=None):
    """A wall of pointed arches open to the sky behind: piers, and a spandrel over each opening up to
    that bay's (ruined) top; a top of None leaves the bay collapsed (piers only)."""
    n = len(tops)
    bay = (x1 - x0) / n
    pw = pier or bay * 0.3
    for k in range(n + 1):
        px = x0 + k * bay
        th = max(t or spring for t in tops[max(0, k - 1):k + 1]) if 0 < k < n else (tops[min(k, n - 1)] or spring)
        box(g, (px, y, z + (th - z) / 2), (pw / 2, depth / 2, (th - z) / 2), p=6, cuts=2)
    for k, top in enumerate(tops):
        if top is None:
            continue
        xl, xr = x0 + k * bay + pw / 2, x0 + (k + 1) * bay - pw / 2
        pts = _pointed(xl, xr, spring)
        poly = pts + [(xr, top), (xl, top)]
        g.slab(poly, y, depth)


def mm_back(st, P):
    """Low rolling moor ridges, mauve and grey-green, fading into the haze."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    ridge(st, hz(MM["heather_dk"], 0.34), -300, 1500, -40, 150, 1500, 3, lumps=8, jag=0.06, peaks=False)
    ridge(st, hz(MM["moor_dk"], 0.3), -300, 1500, -40, 110, 1300, 5, lumps=10, jag=0.06, peaks=False)


def mm_far(st, P):
    pt = Parts()
    rnd = random.Random(13)
    # 1. rolling moor hills: heather and moor grass in patches
    gh, gh2, gm = pt.g(MM["heather"], outline=0.0), pt.g(MM["heather_dk"], outline=0.0), pt.g(MM["moor"], outline=0.0)
    for i in range(9):
        x = -300 + i * 210 + rnd.uniform(-30, 30)
        kit.hill(gm if i % 3 else gh2, x, 470, -10, rnd.uniform(170, 220), 90, rnd.uniform(110, 150), seed=10 + i, jag=0.05, p=2.4)
    for i in range(11):
        x = -280 + i * 170 + rnd.uniform(-30, 30)
        kit.hill(gh if i % 2 else gm, x, 330, -10, rnd.uniform(130, 170), 80, rnd.uniform(80, 104), seed=30 + i, jag=0.05, p=2.4)
    # the abbey's rise
    kit.hill(pt.g(MM["moor_dk"], outline=0.0), 470, 360, -10, 220, 80, 132, seed=51, jag=0.04, p=2.6)
    # heather tufts on the slopes
    gt1, gt2 = pt.g(MM["heather_lt"], outline=0.0), pt.g(MM["moss_dk"], outline=0.0)
    for i in range(120):
        x = rnd.uniform(-260, 1460)
        kit.round_bush(gt1 if i % 3 else gt2, x, rnd.uniform(250, 300), rnd.uniform(4, 8), seed=200 + i, z=rnd.uniform(20, 90))
    # a granite tor (stacked weathered slabs) on the hill at x 160, and heather patches on the slopes
    gto, gto2 = pt.g(MM["stone"], outline=0.4), pt.g(MM["stone_dk"], outline=0.4)
    for k, (dx, z, rx, rz) in enumerate(((0, 92, 30, 10), (-6, 110, 24, 9), (4, 126, 20, 8), (-2, 140, 14, 7), (40, 90, 18, 8), (46, 104, 13, 7))):
        rock(gto if k % 2 else gto2, (160 + dx, 330, z), (rx, 16, rz), seed=500 + k, jag=0.1, p=3.2)
    gp1, gp2 = pt.g(MM["heather_dk"], outline=0.0), pt.g(MM["moss"], outline=0.0)
    for i in range(22):
        x0, z0 = rnd.uniform(-260, 1460), rnd.uniform(36, 92)
        for k in range(5):
            kit.round_bush(gp1 if i % 2 else gp2, x0 + rnd.uniform(-26, 26), rnd.uniform(240, 262), rnd.uniform(5, 8), seed=700 + i * 5 + k,
                           z=z0 + rnd.uniform(-4, 4))
    # 2. dry-stone walls running over the hills
    gw = pt.g(MM["stone_dk"], outline=0.2)
    for (ax, az, bx, bz, yy) in ((-260, 40, 120, 96, 300), (120, 96, 300, 70, 300), (620, 60, 900, 110, 316), (900, 110, 1300, 64, 316)):
        n = int(math.hypot(bx - ax, bz - az) / 7)
        for k in range(n):
            t = k / n
            rock(gw, (ax + (bx - ax) * t, yy, az + (bz - az) * t), (4.2, 3, 3.4), seed=k + int(ax), jag=0.2, p=2.4, cuts=2)
    # sheep grazing
    gwo, gdk = pt.g(MM["wool"], outline=0.3), pt.g(MM["dark"], outline=0.0)
    for i in range(10):
        x = rnd.uniform(-200, 1400)
        if 330 < x < 620:
            continue
        z = rnd.uniform(40, 86)
        gwo.blob((x, 290, z + 4), (5.2, 3.4, 3.4), p=2.2)
        gdk.sphere((x + 5.6, 289, z + 5.4), 1.7)
    # 3. the abbey ruin on its rise: the nave's arcade, the west gable with its tall window, the bell tower
    gs, gs2 = pt.g(MM["stone"], outline=0.5), pt.g(MM["stone_dk"], outline=0.5)
    zb = 112
    arcade(gs, 360, 520, 360, zb, zb + 34, [zb + 86, zb + 80, None, zb + 70, zb + 88], depth=9, pier=10)
    arcade(gs2, 372, 512, 400, zb, zb + 34, [zb + 84, None, zb + 76, zb + 82, None], depth=8, pier=9)
    # the west gable: two buttressed piers, a tall pointed window and a gable to a broken peak
    gx0, gx1 = 322, 362
    for px in (gx0, gx1):
        box(gs, (px, 372, zb + 52), (7, 26, 52), p=6, cuts=2)
    pts = _pointed(gx0 + 7, gx1 - 7, zb + 54, n=8)
    g = pt.g(MM["stone"], outline=0.5)
    g.slab(pts + [(gx1 + 7, zb + 104), (gx0 + 30, zb + 132), (gx0 + 18, zb + 122), (gx0 - 7, zb + 104)], 360, 9)
    box(gs, ((gx0 + gx1) / 2, 360, zb + 6), (26, 5, 6), p=6, cuts=1)
    # the bell tower (east end): a square tower with an open belfry, its parapet broken
    tx = 548
    box(gs, (tx, 340, zb + 70), (20, 18, 70), p=6, cuts=2)
    box(pt.g(MM["dark"], outline=0.0, highlight=False), (tx, 321.5, MM_BELL[2] - 16), (10, 0.6, 16), p=4, cuts=1)
    for dx, h in ((-17, 12), (-6, 7), (6, 10), (17, 5)):
        box(gs2, (tx + dx, 340, zb + 140 + h / 2), (4.6, 18, h / 2), p=5, cuts=1)
    pts = _pointed(tx - 9, tx + 9, MM_BELL[2] - 12, n=6)
    pt.g(MM["stone"], outline=0.4).slab(pts + [(tx + 12, MM_BELL[2] + 8), (tx - 12, MM_BELL[2] + 8)], 320.6, 1.6)
    # rubble and ivy on the ruin
    gr = pt.g(MM["stone_dk"], outline=0.3)
    for k in range(12):
        x = rnd.uniform(330, 560)
        rock(gr, (x, rnd.uniform(345, 380), zb + 2), (rnd.uniform(4, 8), 4, rnd.uniform(3, 5)), seed=400 + k, jag=0.25)
    gi = pt.g(MM["ivy"], outline=0.2)
    for (x, z, rx, rz) in ((372, zb + 60, 9, 16), (440, zb + 30, 12, 10), (500, zb + 66, 8, 12), (556, zb + 40, 10, 22), (330, zb + 90, 6, 14)):
        gi.blob((x, 352, z), (rx, 4, rz), p=2.2)
    # 4. the lone tower on its own rise (x 760): round, ruined at the top
    kit.hill(pt.g(MM["moor"], outline=0.0), 770, 330, -10, 110, 60, 96, seed=61, jag=0.05)
    cyl(gs2, (770, 330, 80), (770, 330, 196), 16, 14, bevel=1.0, segs=18)
    for k in range(5):
        a = math.radians(k * 72)
        h = (8, 3, 11, 5, 9)[k]
        box(gs2, (770 + math.cos(a) * 11, 330 + math.sin(a) * 11, 196 + h / 2), (4, 4, h / 2), p=5, cuts=1)
    box(pt.g(MM["dark"], outline=0.0, highlight=False), (770, 313.6, 150), (2.6, 0.6, 6), p=4, cuts=1)
    # 5. a few wind-bent hawthorns on the slopes
    gc, gtr = pt.g(MM["moss_dk"], outline=0.3), pt.g(MM["bark"], outline=0.0)
    for x, z in ((80, 60), (240, 76), (680, 62), (1040, 70), (1220, 52)):
        gtr.capsule((x, 300, z), (x + 10, 300, z + 22), 1.8, 1.2)
        gc.blob((x + 16, 300, z + 26), (16, 9, 7), p=2.2, rot=(0, -12, 0))
    pt.flush(st)


def mm_mid(st, P):
    pt = Parts()
    rnd = random.Random(19)
    # the bank: moor grass
    g = pt.g(MM["moor"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g, (x, 80, 8), (96, 60, 40 + rnd.uniform(0, 10)), seed=i, jag=0.05, p=2.4)
    # heather and gorse all along
    gh, gh2, gh3 = pt.g(MM["heather"], outline=0.4), pt.g(MM["heather_dk"], outline=0.4), pt.g(MM["heather_lt"], outline=0.4)
    for i in range(70):
        x = rnd.uniform(-250, 1450)
        kit.round_bush((gh, gh2, gh3)[i % 3], x, rnd.uniform(28, 48), rnd.uniform(6, 11), seed=1000 + i, z=rnd.uniform(36, 46), flat=0.62)
    gg, gfl = pt.g(MM["gorse"], outline=0.4), pt.g(MM["gorse_fl"], outline=0.0, highlight=False)
    for i, x in enumerate((-180, -40, 150, 470, 660, 940, 1200, 1380)):
        kit.round_bush(gg, x, 54, 13, seed=1300 + i, z=40, flat=0.8)
        for k in range(7):
            a = rnd.uniform(-3.0, -0.1)
            gfl.sphere((x + math.cos(a) * 14, 54 + math.sin(a) * 8, 46 + rnd.uniform(0, 10)), 1.6, cuts=2)
    # the stone circle (x 240-420): standing stones in a ring, a trilithon at the back
    gsn, gsn2, gli = pt.g(MM["stone"], outline=0.5), pt.g(MM["stone_dk"], outline=0.5), pt.g(MM["lichen"], outline=0.0)
    cx, cy = 330, 92
    for k in range(12):
        a = 2 * math.pi * k / 12 + 0.15
        x, y = cx + math.cos(a) * 100, cy + math.sin(a) * 28
        if 0.6 < a < 1.5 or 1.9 < a < 2.6:
            continue  # the two trilithons stand there
        h = rnd.uniform(46, 66)
        lean = rnd.uniform(-7, 7)
        box(gsn if k % 2 else gsn2, (x, y, 40 + h / 2), (rnd.uniform(8.5, 11), 6, h / 2), p=3.4, cuts=2, rot=(0, lean, rnd.uniform(-20, 20)),
            taper=(1.1, 0.8))
        gli.blob((x + rnd.uniform(-3, 3), y - 6.4, 40 + h * rnd.uniform(0.4, 0.7)), (3.6, 0.6, 3), p=2.0)
    for tx, ty, h in ((cx + 40, cy + 26, 40), (cx - 30, cy + 26, 36)):
        for dx in (-16, 16):
            box(gsn, (tx + dx, ty, 40 + h), (8, 6.4, h), p=3.4, cuts=2, taper=(1.05, 0.9))
        box(gsn2, (tx, ty, 40 + 2 * h + 6), (29, 7, 6.4), p=3.6, cuts=2)
    # a fallen stone in the grass
    box(gsn2, (cx - 60, cy - 30, 44), (24, 8, 6), p=3.4, cuts=2, rot=(0, 4, 18))
    st.light((cx - 20, cy - 30, 46), 6)
    # a crooked dry-stone wall (x 520-940)
    kit.dry_wall(pt.g(MM["stone_dk"], outline=0.5), 520, 940, 62, 38, 16, seed=8, block=11)
    # a wind-bent hawthorn (x 600)
    gtr, gc = pt.g(MM["bark"], outline=0.5), pt.g(MM["moss_dk"], outline=0.5)
    gtr.capsule((600, 70, 40), (614, 70, 84), 4.2, 2.6)
    gtr.capsule((614, 70, 84), (650, 70, 100), 2.6, 1.6)
    gtr.capsule((612, 70, 80), (586, 70, 104), 2.0, 1.2)
    for (x, z, r) in ((640, 104, 22), (612, 112, 18), (588, 106, 14), (662, 96, 14)):
        gc.blob((x, 68, z), (r, r * 0.7, r * 0.6), p=2.2, rot=(0, -10, 0))
    # the shepherd's bothy (x 1080): stone walls, a thatched roof, a chimney, a lit window
    gwl, gth = pt.g(MM["stone"], outline=0.5), pt.g(MM["thatch"], outline=0.5)
    box(gwl, (1080, 90, 60), (36, 22, 20), p=6, cuts=2)
    gth.lathe([(0, 0), (54, 0), (0.6, 30), (0, 31)], (1080, 92, 78), (1080, 92, 109), segs=4, rot=(0, 0, 45), squash=(1.0, 0.5))
    box(gwl, (1108, 96, 106), (5, 5, 14), p=5, cuts=1)
    gd = pt.g(MM["dark"], outline=0.0, highlight=False)
    box(gd, (1066, 67.4, 56), (5, 0.6, 12), p=4, cuts=1)
    box(pt.g(0xE8C890, outline=0.0, highlight=False), (1094, 67.4, 64), (5, 0.6, 5), p=4, cuts=1)
    st.light((1094, 66, 64), 6)
    st.amb("emit", "fx.p.smoke", (1108, 96, 124), rate=0.45, speed=8, scale=0.9, tint=0xD8D8D2, alpha=0.32, life=2800)
    # boulders
    gb = pt.g(MM["stone_dk"], outline=0.5)
    for i in range(10):
        x = rnd.uniform(-240, 1440)
        rock(gb, (x, rnd.uniform(34, 50), 38), (rnd.uniform(7, 12), 7, rnd.uniform(5, 8)), seed=900 + i, jag=0.2)
    pt.flush(st)


def _bell(rig):
    """The abbey bell on its yoke, hanging from the pivot (frames swing it)."""
    rig.joint("b", "all", (0, 0, 0))
    rig.part("b", Geo().capsule((-5, 0, 0), (5, 0, 0), 1.2), "#5E4E40", outline=0.3)
    rig.part("b", Geo().lathe([(0.01, 0), (2.2, 0), (3.2, -2), (3.6, -7), (5.4, -11), (5.6, -12), (0.01, -12)], (0, 0, 0), (0, 0, -1),
                              segs=16), "#9A8A5E", finish="bronze", outline=0.4)


def _fog(i):
    w, h = (320, 54) if i == 0 else (420, 50)
    return soft_blob(w, h, 0xEEEEEA, alpha=0.62 if i == 0 else 0.5, lumps=6, seed=3 + i)


def mm_props():
    bell = _scr(MM_BELL, MM_FAR_E)
    crow = fauna.bird(body="#3E3A40", wing="#2E2A32", beak="#4A4448", span=12, size=1.0)
    bx = MM_BELL[0]
    ring = [[i * 2, round(bx + 80 * math.cos(math.pi * i / 3)), round(bell[1] - 46 + 16 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    plist = [
        Prop("bell", "far", _bell, [{"b": {"r": a}} for a in (0, 14, 0, -14)], (24, 4, 16), bell[1]),
        Prop("crow", "far", crow, [fauna.bird_pose(f) for f in range(5)], (40, 24, 24), ring[0][2]),
        PaintedProp("fog", "far", lambda i: _fog(0), 1, ax=0.5, ay=0.9),
        PaintedProp("mist", "mid", lambda i: _fog(1), 1, ax=0.5, ay=0.9, ppl=1.0),
    ]
    sprites = [
        {"kind": "loop", "layer": "far", "frames": ["bell_0", "bell_1", "bell_2", "bell_3"], "fps": 2.4, "at": bell},
        {"kind": "path", "layer": "far", "fps": 6, "periodS": 12, "keys": ring,
         "group": [{"frames": ["crow_4", "crow_0", "crow_1", "crow_2", "crow_3"]}, {"frames": ["crow_0", "crow_1", "crow_2", "crow_3", "crow_4"], "dx": -26, "dy": 9, "phase": 2}]},
        {"kind": "path", "layer": "far", "fps": 1, "periodS": 150, "keys": [[0, -520, MM_FOG_FAR, 0], [14, -360, MM_FOG_FAR, 1], [136, 1400, MM_FOG_FAR, 1], [150, 1560, MM_FOG_FAR, 0]],
         "face": "fixed", "group": [{"frames": ["fog_0"]}]},
        {"kind": "path", "layer": "mid", "fps": 1, "periodS": 190, "keys": [[0, -560, MM_FOG_MID, 0], [16, -380, MM_FOG_MID, 0.8], [174, 1420, MM_FOG_MID, 0.8], [190, 1600, MM_FOG_MID, 0]],
         "face": "fixed", "group": [{"frames": ["mist_0"]}]},
    ]
    return plist, sprites


# -- Harbour Town (round 3; Epic, Wardrobe Crate) -----------------------------------------------------
HT_PAL = dict(skyTop=0x8FAEC4, skyBottom=0xE6EAE6, light=0xFAF6EC, far=0x9A9C98, mid=0x84826E, near=0x625E50)
HT = dict(
    plaster=0xE8DFC8, plaster_dk=0xD2C8B0, timber=0x6A4E3A, brick=0x9A6A58, brick_dk=0x7E5648, brick_lt=0xAE806C, roof=0x7A5E52,
    slate=0x6B7682, slate_dk=0x57616D, stone=0xC2B8A4, stone_dk=0xA29884, cobble=0xAEA492, sea=0x8EA8A8, foam=0xD6DEDA,
    wine=0x8E2A4A, dark=0x3E3834, wood=0x7A6450, wood_dk=0x5E4C3E, sail=0xE2D8C4, grass=0x8A946A, grass_dk=0x727C56, hill=0x8E9878,
    net=0x6E6A5E, lamp=0x4A4440,
)
HT_SKY = {"top": "#8FAEC4", "bottom": "#E6EAE6", "horizon": "#EEF0EC", "cloudTint": "#F6F7F4", "celestial": "sun",
          "sunAt": [260, -540, 40], "clouds": 0.8}
HT_FAR_E = math.radians(8.0)
HT_MID_E = math.radians(12.0)
HT_SEA_Z = 50.0
HT_MILL = (780.0, 124.0, 52.0, 120.0, 26.0)    # the windmill (mid): x, y, foot z, tower height, radius
HT_COGS = ((640.0, 330.0), (1150.0, 380.0))      # the bobbing cogs (far): x, y on the water
HT_LIGHT = (790.0, 404.0)                        # the lighthouse at the end of the mole (far)


def ht_back(st, P):
    """The far side of the bay: low hazy headlands and a far spire (lowest under the moons' place)."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    g, g2 = pt.g(hz(HT["hill"], 0.42), outline=0.0), pt.g(hz(HT["grass_dk"], 0.4), outline=0.0)
    for x, rx, h, seed in ((-180, 230, 76, 1), (150, 200, 58, 2), (460, 180, 40, 3), (1180, 240, 80, 4), (1450, 180, 62, 5), (720, 120, 28, 6)):
        kit.hill(g if seed % 2 else g2, x, 1500, HT_SEA_Z - 4, rx, 60, h, seed=seed, jag=0.04, p=2.4)
    pt.g(hz(HT["slate"], 0.4), outline=0.0).lathe([(0.01, 0), (5, 0), (0.3, 40), (0.01, 41)], (1240, 1500, HT_SEA_Z + 60), (1240, 1500, HT_SEA_Z + 101), segs=4)
    pt.flush(st)


def ht_far(st, P):
    pt = Parts()
    rnd = random.Random(113)
    sz = HT_SEA_Z
    # 1. the harbour and the open sea, grey-teal (low saturation, A11), pale crests
    box(pt.g(HT["sea"], finish="gloss", outline=0.0), (600, 860, sz - 6), (1100, 600, 6), p=6, cuts=2)
    gw = pt.g(HT["foam"], outline=0.0, highlight=False)
    for i in range(90):
        x = rnd.uniform(-260, 1460)
        y = rnd.uniform(330, 1300)
        gw.blob((x, y, sz + 0.2), (rnd.uniform(6, 14), 1.0, 0.25), p=2.4, cuts=1)
    # 2. the town on its slope (left): the shore, stepped-gable warehouses on the waterfront, timber houses
    # and roofs climbing behind them, the church with its tall spire
    gl, gl2 = pt.g(HT["hill"], outline=0.0), pt.g(HT["grass"], outline=0.0)
    for i, (x, rx, h) in enumerate(((-200, 220, 96), (80, 220, 110), (360, 200, 100), (560, 120, 70))):
        kit.hill(gl if i % 2 else gl2, x, 560, sz - 10, rx, 120, h, seed=20 + i, jag=0.03, p=2.4)
    box(pt.g(HT["stone_dk"], outline=0.3), (170, 432, sz + 2), (430, 14, 5), p=6, cuts=1)
    wins = []
    xs = [-236 + k * 42 for k in range(22) if -236 + k * 42 < 520]
    cols = ((HT["brick"], HT["brick_dk"]), (HT["brick_lt"], HT["brick"]), (HT["plaster_dk"], HT["stone_dk"]))
    for k, x in enumerate(xs):
        w = rnd.uniform(34, 40)
        h = rnd.uniform(44, 60)
        b, bd = cols[k % 3]
        win = kit.stepped_gable_house(pt, x, 440 + (k % 2) * 4, sz + 6, w, h, steps=3 + (k % 2), brick=b, brick_dk=bd, trim=HT["plaster"],
                                      dark=HT["dark"], hoist=k % 3 != 2, outline=0.4)
        if k % 4 == 1 and win:
            wins.append(win)
    for k in range(30):
        x = rnd.uniform(-240, 520)
        y = rnd.uniform(470, 540)
        z = sz + 22 + (y - 470) * 0.55 + rnd.uniform(-3, 3)
        w, d, h = rnd.uniform(22, 32), rnd.uniform(14, 18), rnd.uniform(16, 24)
        box(pt.g((HT["plaster"], HT["plaster_dk"], HT["brick_lt"])[k % 3], outline=0.3), (x, y, z + h / 2), (w / 2, d / 2, h / 2), p=8, cuts=1)
        kit.gable_roof(pt.g(HT["roof"] if k % 2 else HT["slate"], outline=0.3), x, y, z + h, w, d, h * 0.6)
        if k % 6 == 0:
            st.amb("emit", "bd.puff", (x + w * 0.3, y, z + h * 1.6), rate=0.25, speed=6, scale=0.6, tint=0xE6E4DE, alpha=0.3, life=3000, drift=6)
    _, cwin = kit.church(pt, 250, 530, sz + 80, 100, 44, 74, stone=HT["stone"], stone_dk=HT["stone_dk"], roof=HT["slate"], spire=HT["slate_dk"], dark=HT["dark"])
    wins.append(cwin)
    # 3. the harbour mole: a stone breakwater curving out to the harbour mouth, the lighthouse at its end, a
    # crane and bollards on it
    gm, gm2 = pt.g(HT["stone"], outline=0.4), pt.g(HT["stone_dk"], outline=0.3)
    pts = [(520 + 270 * math.sin(t * math.pi / 2), 440 - 40 * t) for t in [k / 10 for k in range(11)]]
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        L = math.hypot(bx - ax, by - ay)
        ang = math.degrees(math.atan2(by - ay, bx - ax))
        box(gm, ((ax + bx) / 2, (ay + by) / 2, sz + 3), (L / 2 + 1, 9, 6), p=8, cuts=1, rot=(0, 0, ang))
        box(gm2, ((ax + bx) / 2, (ay + by) / 2 - 8, sz - 1), (L / 2 + 1, 2, 3), p=6, cuts=1, rot=(0, 0, ang))
    lx, ly = HT_LIGHT
    rock(gm2, (lx, ly, sz), (22, 16, 8), seed=31, jag=0.2)
    kit.stone_lighthouse(pt, st, lx, ly, sz + 6, 74, stone=HT["plaster"], band=HT["wine"], stone_dk=HT["stone_dk"], glass=0x9AAAA6, dark=HT["dark"])
    # 4. two cogs at anchor inside the mole (the bobbing ones are props), rowing boats
    fauna.cog(size=0.9, sail_set=False)(kit.StaticRig(pt, (420, 404, sz - 2)))
    fauna.cog(size=0.75, sail_set=False, hull="#6A5646")(kit.StaticRig(pt, (160, 410, sz - 2), flip=True))
    gb = pt.g(HT["wood_dk"], outline=0.3)
    for (x, y) in ((300, 396), (560, 400), (40, 398)):
        gb.blob((x, y, sz + 0.8), (7, 2.4, 1.6), p=2.4, taper=(0.8, 1.0))
    # 5. the right: the open sea, a far island with cliffs (low under the moons' place)
    gi, gi2 = pt.g(HT["hill"], outline=0.2), pt.g(HT["stone_dk"], outline=0.2)
    for (x, y, rx, h, seed) in ((1240, 700, 150, 46, 40), (1400, 640, 90, 30, 41)):
        kit.hill(gi, x, y, sz - 10, rx, 60, h + 10, seed=seed, jag=0.05, p=2.2)
        rock(gi2, (x - rx * 0.4, y - 30, sz + 8), (rx * 0.3, 14, 16), seed=seed + 5, jag=0.2)
    for w in wins[:5]:
        st.light(w, 3)
    pt.flush(st)


def _crane(pt, st, x, y, z, wood, wood_dk, rope):
    """A medieval harbour crane: a timber tower with a pitched roof, its long jib over the quay edge and the
    great treadwheel on its side; a bale hangs from the jib. Returns the wheel's centre (static)."""
    gw, gd = pt.g(wood, outline=0.5), pt.g(wood_dk, outline=0.4)
    box(gw, (x, y, z + 30), (12, 12, 30), p=8, cuts=2, taper=(1.0, 0.86))
    kit.gable_roof(gd, x, y, z + 60, 26, 26, 14)
    gd.capsule((x + 8, y - 6, z + 54), (x + 58, y - 30, z + 64), 1.8, 1.2)
    gd.capsule((x + 6, y - 6, z + 40), (x + 30, y - 18, z + 58), 1.2)
    pt.g(rope, outline=0.0).capsule((x + 56, y - 29, z + 63), (x + 56, y - 29, z + 34), 0.3)
    pt.g(HT["sail"], outline=0.4).blob((x + 56, y - 29, z + 30), (6, 5, 4.5), p=2.6)
    wc = (x - 18, y - 2, z + 22)
    fauna.cyl_ring(gd, wc, 20, 3.2, 3.0, axis_to=(wc[0] - 1, wc[1], wc[2]), segs=32)
    for k in range(8):
        a = math.pi * k / 4
        gw.capsule(wc, (wc[0], wc[1] + math.cos(a) * 18, wc[2] + math.sin(a) * 18), 0.7)
    return wc


def ht_mid(st, P):
    pt = Parts()
    rnd = random.Random(127)
    # the quay: a cobbled bank behind a dressed stone edge (the harbour lies behind, in the far strip)
    g = pt.g(HT["cobble"], outline=0.0)
    for i in range(15):
        rock(g, (-300 + i * 130, 84, 8), (96, 60, 40 + rnd.uniform(0, 6)), seed=i, jag=0.04, p=2.6)
    gq, gq2 = pt.g(HT["stone"], outline=0.4), pt.g(HT["stone_dk"], outline=0.3)
    box(gq, (600, 40, 44), (980, 5, 4), p=8, cuts=2)
    for k in range(40):
        gq2.slab([(-300 + k * 48, 40.2), (-299 + k * 48, 40.2), (-299 + k * 48, 47.8), (-300 + k * 48, 47.8)], 34.6, 0.4)
    # 1. timber-framed houses along the quay (x -260..560), some with lit windows and smoking chimneys
    wins = []
    plasters = (HT["plaster"], 0xE2D4B4, HT["plaster"], 0xD8D6C6, 0xE0D0C6, HT["plaster"], 0xE2D4B4, 0xD8D6C6)
    for k, (x, w, h1, h2, rh, roof) in enumerate(((-230, 64, 30, 26, 28, HT["roof"]), (-158, 56, 36, 30, 32, HT["slate"]), (-84, 66, 28, 24, 24, HT["roof"]),
                                                  (-6, 60, 38, 30, 34, HT["slate"]), (76, 68, 30, 26, 26, HT["roof"]), (156, 58, 34, 28, 30, HT["slate"]),
                                                  (420, 62, 32, 28, 30, HT["roof"]), (500, 56, 28, 24, 26, HT["slate"]))):
        win, chim = kit.timber_house(pt, x, 110, 44, w, 30, h1, h2, rh, plaster=plasters[k], timber=HT["timber"], roof=roof, base=HT["stone_dk"],
                                     dark=HT["dark"], jetty=1.6, chimney=HT["brick"] if k % 3 == 0 else None, seed=70 + k, along_x=k % 2 == 0)
        if k % 2 == 0:
            wins.append(win)
        if chim:
            st.amb("emit", "bd.puff", chim, rate=0.5, speed=9, scale=0.9, tint=0xE4E2DC, alpha=0.38, life=2800, drift=6)
    # 2. the harbour crane (x 640) with its treadwheel; barrels, crates, sacks and nets on the quay
    _crane(pt, st, 610, 80, 44, HT["wood"], HT["wood_dk"], HT["dark"])
    gbr, gcr = pt.g(HT["wood"], finish="matte", outline=0.4), pt.g(HT["wood_dk"], outline=0.4)
    for (x, y, z) in ((268, 60, 44), (282, 62, 44), (275, 60, 58), (690, 58, 44), (704, 60, 44)):
        cyl(gbr, (x, y, z), (x, y, z + 13), 6.0, bevel=0.8, segs=14)
    for (x, s_) in ((310, 1.0), (326, 0.8), (880, 0.9)):
        box(gcr, (x, 64, 44 + 9 * s_), (9 * s_, 9 * s_, 9 * s_), p=5, cuts=1)
    gn = pt.g(HT["net"], outline=0.2)
    for k in range(3):
        gn.capsule((350 + k * 26, 70, 44), (350 + k * 26, 70, 80), 0.7)
    gn.slab([(350, 78), (402, 78), (398, 56), (354, 56)], 70.6, 0.4)
    # lanterns on posts along the quay (lit at night)
    gla = pt.g(HT["lamp"], outline=0.3)
    for x in (-120, 230, 540, 900):
        gla.capsule((x, 46, 44), (x, 46, 86), 0.9)
        box(gla, (x, 46, 89), (2.6, 2.6, 3.2), p=5, cuts=1)
        st.light((x, 43, 89), 5)
    # 3. the windmill (x 1010) on a grassy rise at the quay's end (its sails turn: a prop)
    mx, my, mz, mh, mr = HT_MILL
    gr2 = pt.g(HT["grass"], outline=0.0)
    rock(gr2, (mx, my + 10, 30), (90, 50, 26), seed=50, jag=0.06, p=2.4)
    _, mwin = kit.windmill_tower(pt, mx, my, mz, mh, mr, body=HT["plaster_dk"], body_dk=HT["stone_dk"], cap=HT["slate_dk"], trim=HT["plaster"],
                                   dark=HT["dark"], octagon=False)
    wins.append(mwin)
    # 4. a fishmonger's stall and boats drawn up on the right, a few gulls' perches
    box(pt.g(HT["wood"], outline=0.4), (1160, 70, 54), (26, 12, 10), p=6, cuts=1)
    pt.g(HT["wine"], outline=0.3).slab([(1130, 70), (1190, 70), (1196, 62), (1124, 62)], 56, 22)
    gboat = pt.g(HT["wood_dk"], outline=0.5)
    for (x, s_) in ((1290, 1.0), (1370, 0.85)):
        gboat.blob((x, 60, 46), (22 * s_, 7 * s_, 6 * s_), p=2.4, taper=(0.7, 1.0))
    for w in wins[:4]:
        st.light(w, 4)
    pt.flush(st)


def ht_props():
    mx, my, mz, mh, mr = HT_MILL
    hub = _scr_m(kit.windmill_hub(mx, my, mz, mh, mr), HT_MID_E)
    cogs = [_scr_m((x, y, HT_SEA_Z - 2), HT_FAR_E) for (x, y) in HT_COGS]
    gull = fauna.bird(body="#E8E4DA", wing="#D6D2C8", belly="#F2EFE8", beak="#C8A060", span=12, size=1.0)
    ring = [[i * 2, round(560 + 90 * math.cos(math.pi * i / 3)), round(-228 + 14 * math.sin(math.pi * i / 3)), 1] for i in range(7)]
    plist = [
        Prop("sails", "mid", fauna.windmill_sails(sail="#E6DECC", frame="#5E4C3E", length=46, width=9), [{"s": {"r": -22.5 * f}} for f in range(4)],
             (110, 56, 56), hub[1]),
        Prop("cog", "far", fauna.cog(size=1.0), [{}], (60, 60, 3), cogs[0][1]),
        Prop("cogb", "far", fauna.cog(size=0.8, hull="#6A5646", stripe="#5E6A72"), [{}], (50, 50, 3), cogs[1][1]),
        Prop("gull", "far", gull, [fauna.bird_pose(f) for f in range(5)], (40, 24, 24), ring[0][2]),
    ]
    sprites = [
        {"kind": "loop", "layer": "mid", "frames": [f"sails_{i}" for i in range(4)], "fps": 3, "at": hub},
        {"kind": "bob", "layer": "far", "frames": ["cog_0"], "at": cogs[0], "amp": [0.4, 1.0], "periodS": 4.8, "tilt": 1.6},
        {"kind": "bob", "layer": "far", "frames": ["cogb_0"], "at": cogs[1], "amp": [0.4, 0.9], "periodS": 5.6, "tilt": 1.4},
        {"kind": "path", "layer": "far", "fps": 6, "periodS": 13, "keys": ring,
         "group": [{"frames": ["gull_4", "gull_4", "gull_0", "gull_1", "gull_2", "gull_3"]}, {"frames": ["gull_4", "gull_0", "gull_1", "gull_2"], "dx": -22, "dy": 8, "phase": 2}]},
    ]
    return plist, sprites


def _scr_m(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


SCENES = {
    "classic": Scene("medieval", "classic", CH_PAL, ch_far, ch_mid, back=ch_back, sky=CH_SKY, props=ch_props,
                     hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.5}, ground="earth",
                     # the castle is the age's landmark: a little less haze on the far hills than the default
                     look={"far": (0.18, 0.09, 0.22)}),
    "misty_moor": Scene("medieval", "misty_moor", MM_PAL, mm_far, mm_mid, back=mm_back, sky=MM_SKY, props=mm_props,
                        hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.5}, ground="earth",
                        # a grey day with clear air between the fog banks: a little less haze on the far moor
                        look={"far": (0.18, 0.08, 0.2)}),
    "harbour_town": Scene("medieval", "harbour_town", HT_PAL, ht_far, ht_mid, back=ht_back, sky=HT_SKY, props=ht_props,
                          hints={"celestial": "keep", "weather": "ground", "skyGrade": 0.5}, ground="earth",
                          look={"far": (0.18, 0.08, 0.2)}),
}
