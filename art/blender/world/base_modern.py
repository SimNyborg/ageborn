"""Modern Age base: the Bunker (DESIGN A11 Bases).

A sloped concrete glacis with firing slits, an upper casemate under a draped camouflage net, a
square observation tower at the lane edge, a command block and a heavy lattice radar mast with a
big dish and a beacon. The turret mounts (common.BASE_MOUNTS) are sandbagged gun pits: on a
pillbox by the gate, on the casemate, on top of the observation tower and on the command block.
Cartoon kit v2 (art director plan 2026-09-30): hazard stripes along the glacis foot and on the
pillbox, a searchlight on the casemate roof, a whip antenna on the command block, warm light in the
firing slits, a fuller camouflage net with leaf tufts, a team plate with a cream chevron.
Team colour: a painted stripe band, a roundel, the chevron plate and the flags. Crumble (each stage
reads at a glance): 1 a chunk bitten out of the glacis edge, cracks, a sandbag knocked off the gate
wall; 2 fire in the slits with soot, the lights out, the radar dish knocked askew, the searchlight
smashed, the net torn, exposed rebar; 3 a breach in the glacis with rebar hanging out, a second
fire, the mast bent with the dish hanging, the antenna snapped, the gate sandbags spilled.
Treasury: supply crates (1), fuel drums (2), a stack of ammo crates with a gold-banded case (3).
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_modern as KM
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


def slit(rig, joint, x, y, z, w=12, warm=False):
    g = Geo()
    box(g, (x, y, z + 3.2), (w + 2, 3.2, 1.4), p=4, cuts=2)
    rig.part(joint, g, CONCRETE_LT, outline=0.5)
    g = Geo()
    box(g, (x, y + 0.4, z), (w, 1.2, 2.4), p=4, cuts=2)
    rig.part(joint, g, "#1E2126", outline=0, highlight=False)
    if warm:   # warm lamplight inside (goes dark from crumble stage 2)
        g = Geo()
        box(g, (x, y - 0.4, z - 0.3), (w - 2.0, 0.6, 1.4), p=4, cuts=2)
        rig.part("lit", g, glow="#FFD89A", outline=0)


FIRE = "#FFC47A"
FIRE_CORE = "#FFF0CC"
FIRE_OUT = "#EE9A5C"
SOOT = "#5E5854"


def flames(rig, joint, spots):
    """Cartoon fire: teardrop tongues that lean and curl (outer, body, hot core), not cones."""
    o, g, c = Geo(), Geo(), Geo()
    for x, y, z, k in spots:
        for dx, lean, r, h in ((0.0, 0.25, 6.6, 20.0), (-6.0, -0.35, 4.4, 13.0), (6.0, 0.45, 4.0, 11.0),
                               (2.5, -0.2, 3.0, 8.0)):
            cx, cz = x + dx * k, z + h * 0.42 * k
            o.blob((cx, y + 2, cz), (r * 1.3 * k, r * 0.9 * k, h * 0.62 * k), p=2.0, taper=(1.0, 0.08),
                   shift=(lean * 1.2, 0.0))
            g.blob((cx, y, cz - 0.6 * k), (r * k, r * 0.7 * k, h * 0.5 * k), p=2.0, taper=(1.0, 0.1),
                   shift=(lean, 0.0))
            c.blob((cx, y - 2.5, cz - 2.4 * k), (r * 0.5 * k, r * 0.4 * k, h * 0.28 * k), p=2.0,
                   taper=(1.0, 0.2), shift=(lean * 0.6, 0.0))
    rig.part(joint, o, glow=FIRE_OUT, outline=0)
    rig.part(joint, g, glow=FIRE, outline=0)
    rig.part(joint, c, glow=FIRE_CORE, outline=0)


def _jagged(cx, cz, rx, rz, n=11, seed=0, amp=0.28):
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        f = 1.0 + amp * (1 if (k + seed) % 2 else -1) * (0.6 + 0.4 * math.sin(k * 2.3 + seed))
        pts.append((cx + rx * f * math.cos(a), cz + rz * f * math.sin(a)))
    return pts


def hazard(rig, joint, x0, x1, z0, z1, y, n):
    """A pale strip with dark diagonal hazard bands, standing on the plane y (faces -Y)."""
    g = Geo().slab([(x0, z0), (x1, z0), (x1, z1), (x0, z1)], y, 1.0)
    rig.part(joint, g, KM.STRIPE_LT, outline=0.4)
    g = Geo()
    step = (x1 - x0) / n
    h = z1 - z0
    for k in range(n):
        a = x0 + k * step
        g.slab([(a, z0), (a + step * 0.5, z0), (min(x1, a + step * 0.5 + h * 0.7), z1), (min(x1, a + h * 0.7), z1)],
               y - 0.7, 0.6)
    rig.part(joint, g, KM.STRIPE_DK, outline=0, highlight=False)


def build(rig, M):
    for j, pos in (("mast", (MAST[0], MAST[1], 110)), ("bag", (M[0][0], M[0][1], M[0][2]))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "rebar", "notch", "fire1", "scorch",
              "breach", "fire2", "spill", "lensbroke"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    for j in ("lit", "tufts", "lens", "wallbag"):
        rig.joint(j, "body", (0, 0, 0))

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
        slit(rig, "body", x, y, z, warm=(x, z) in ((-104, 26), (-140, 84), (-104, 84)))
    # hazard stripes along the foot of the glacis
    hazard(rig, "body", -160.0, -12.0, 1.5, 8.0, -41.5, 14)
    # the camouflage net draped over the casemate's back
    g = Geo()
    rock(g, (-128, 34, 110), (44, 30, 10), seed=5, jag=0.25, p=2.4)
    g.clip((0, 0, 104), (0, 0, 1))
    rig.part("body", g, OLIVE, finish="hair")
    g = Geo()
    for k, (x, y, z) in enumerate(((-150, 18, 118), (-120, 12, 120), (-100, 30, 118), (-136, 40, 116))):
        rock(g, (x, y, z), (9, 7, 3), seed=70 + k, jag=0.3, p=2.2)
    rig.part("body", g, KHAKI, finish="hair", outline=0.4)
    g = Geo()   # leaf tufts on the net (torn off from crumble stage 2)
    for k, (x, y, z) in enumerate(((-162, 14, 112), (-140, 6, 116), (-112, 8, 116), (-92, 18, 112),
                                   (-128, 24, 121))):
        rock(g, (x, y, z), (5.5, 4.5, 2.6), seed=90 + k, jag=0.35, p=2.2)
    rig.part("tufts", g, OLIVE_LT, finish="hair", outline=0.4)
    # a searchlight on the casemate roof, aimed out over the lane
    g = Geo()
    cyl(g, (-150, -6, 109), (-150, -6, 116), 2.0, bevel=0.3)
    rig.part("body", g, STEEL, finish="metal", outline=0.4)
    g = Geo()
    cyl(g, (-156, -6, 118), (-142, -6, 124), 7.0, 7.6, bevel=0.8, segs=20)
    rig.part("body", g, OLIVE, finish="gloss")
    g = Geo()
    cyl(g, (-156.5, -6, 117.8), (-151, -6, 120.2), 7.4, 7.8, bevel=0.5, segs=20)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo().lathe([(0, 0), (6.8, 0), (6.8, 0.5), (0, 1.2)], (-141.8, -6, 124.1), (-140.9, -6, 124.5), segs=20)
    rig.part("lens", g, glow="#FFF6D8", outline=0.8, outline_hex=STEEL)
    g = Geo().lathe([(0, 0), (6.8, 0), (6.8, 0.5), (0, 1.2)], (-141.8, -6, 124.1), (-140.9, -6, 124.5), segs=20)
    rig.part("lensbroke", g, "#3A3F45", finish="gloss", outline=0.8)
    g = Geo()
    for a in (20, 140, 250):
        t = math.radians(a)
        g.capsule((-140.6, -6 + 5.0 * math.cos(t), 124.4 + 5.0 * math.sin(t)),
                  (-140.4, -6 + 1.0 * math.cos(t + 0.6), 124.4 + 1.0 * math.sin(t + 0.6)), 0.45)
    rig.part("lensbroke", g, "#C8D2D6", outline=0)
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
    slit(rig, "body", cx - 4, cy - ch - 1, 214, 14, warm=True)
    slit(rig, "body", cx - 4, cy - ch - 1, 160, 14)
    plate = Geo()
    box(plate, (cx - 4, cy - ch - 1.2, 187), (9, 0.8, 7), p=5, cuts=2)
    pface = F.Face(rig, "body", [plate], yaw_deg=BASE_YAW)
    rig.part("body", plate, team=True, outline=0.5)
    g = KM.chevron(pface, Geo(), (cx - 4, 187.4), s=1.3, n=2, w=1.8, gap=2.8)
    rig.part("body", g, KM.CREAM, highlight=False, outline=0)
    # a whip antenna on the command block roof (it snaps at crumble stage 3)
    rig.joint("antenna", "body", (cx + 12, cy + 22, cH))
    g = Geo()
    cyl(g, (cx + 12, cy + 22, cH), (cx + 12, cy + 22, cH + 5), 2.4, bevel=0.3)
    rig.part("body", g, GUNMETAL, finish="metal", outline=0.4)
    g = Geo().capsule((cx + 12, cy + 22, cH + 4), (cx + 9, cy + 22, cH + 58), 1.0, 0.7)
    rig.part("antenna", g, STEEL, finish="metal", outline=0.4)
    g = Geo().sphere((cx + 9, cy + 22, cH + 59), 2.0, cuts=3)
    rig.part("antenna", g, SIGNAL, outline=0.4)

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
    rig.joint("dish", "mast", (mx + 3, my - 4, 301))
    g = Geo().lathe([(0, 0), (8, 0.6), (17, 3.4), (22, 8), (21, 8.6), (0, 3.0)], (mx + 6, my - 8, 300),
                    (mx + 14, my - 16, 296), segs=26)
    rig.part("dish", g, CONCRETE_LT, finish="gloss", outline=0.6)
    g = Geo().capsule((mx + 6, my - 8, 300), (mx + 20, my - 22, 294), 1.2)
    rig.part("dish", g, GUNMETAL, finish="metal", outline=0.4)
    g = Geo().sphere((mx, my, 312), 3.6, cuts=3)
    rig.part("mast", g, glow="#F2A0C8", outline=0.6, outline_hex=SIGNAL)

    # a pillbox at the gate carries the first gun pit
    x0, y0, z0 = M[0]
    g = Geo()
    box(g, (x0 - 6, y0 + 16, (z0 - 6) / 2), (26, 20, (z0 - 6) / 2), p=6, taper=(1.0, 0.88))
    rig.part("body", g, CONCRETE_DK)
    slit(rig, "body", x0 - 4, y0 - 4.5, z0 - 26, 10)
    hazard(rig, "body", x0 - 26.0, x0 + 14.0, 2.0, 8.0, y0 - 5.6, 5)
    # sandbagged gun pits at the mounts
    for i, m in enumerate(M):
        platform(rig, "bag" if i == 0 else "body", m, CONCRETE_LT, CONCRETE_DKR, style="sandbag", r=(25, 19),
                 accent=KHAKI)

    # sandbag wall at the gate
    g = Geo()
    sandbags(g, 26, -58, 0, 30, rows=3)
    rig.part("body", g, KHAKI, finish="hair")
    g = Geo().blob((30.5, -58, 19.8), (5.2, 4.2, 3.0), p=2.6)      # the top bag (knocked off at stage 1)
    rig.part("wallbag", g, KHAKI, finish="hair")
    g = Geo()   # spilled bags in front of the wall (stages 1 and 3)
    for x, y, z, rz in ((40, -66, 3, 30), (18, -70, 3, -20), (30, -74, 3, 70), (8, -64, 3, 10)):
        g.blob((x, y, z), (5.2, 4.2, 3.0), p=2.6, rot=(0, 0, rz))
    rig.part("spill", g, KHAKI, finish="hair")
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

    _damage(rig, ox, oy, oh, cx, cy, ch, cH)

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


def _damage(rig, ox, oy, oh, cx, cy, ch, cH):
    fy = -30.0
    # 1: a chunk bitten out of the glacis top edge (a jagged dark gap with a broken lip)
    for (x, z, y, rx, rz) in ((-56.0, 44.0, -33.5, 11.0, 6.5), (ox + oh - 2.0, 142.0, oy - oh - 4.0, 8.0, 10.0)):
        g = Geo().slab(_jagged(x, z, rx, rz, seed=1), y, 2.2)
        rig.part("notch", g, CONCRETE_DKR, outline=0.5)
        g = Geo().slab(_jagged(x, z + 0.5, rx * 0.66, rz * 0.6, seed=2), y - 1.4, 1.0)
        rig.part("notch", g, "#2A2A2A", outline=0, highlight=False)
    # 2: soot over the slits, flames out of two slits
    g = Geo()
    for x, z, y in ((-104, 32, fy - 1.0), (-140, 90, -16.5), (-104, 90, -16.5)):
        g.slab(_jagged(x + 2, z + 4, 11.0, 6.0, seed=3, amp=0.35), y, 0.8)
    rig.part("scorch", g, SOOT, outline=0, highlight=False)
    flames(rig, "fire1", [(-104.0, fy - 3.0, 26.0, 0.9), (-140.0, -19.0, 84.0, 0.8)])
    # 3: a breach in the glacis with rebar sticking out, a fire in it and one on the command block
    g = Geo().slab(_jagged(-136.0, 22.0, 17.0, 14.0, seed=5, amp=0.3), fy - 3.5, 2.2)
    rig.part("breach", g, CONCRETE_DKR, outline=0.6)
    g = Geo().slab(_jagged(-136.0, 21.0, 12.0, 10.0, seed=6, amp=0.3), fy - 4.8, 1.0)
    rig.part("breach", g, "#1E1C1C", outline=0, highlight=False)
    g = Geo()
    for dx, dz, ex, ez in ((-8, 26, -14, 38), (0, 30, 6, 42), (6, 16, 16, 20)):
        g.capsule((-136 + dx, fy - 5.5, dz), (-136 + ex, fy - 9.0, ez), 0.8)
    rig.part("breach", g, "#6E5A4A", outline=0.3)
    flames(rig, "fire2", [(-136.0, fy - 7.0, 12.0, 1.1), (cx + 14.0, cy - ch + 6.0, cH + 2.0, 0.9)])


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "notch": {"show": True},
                     "wallbag": {"hide": True}, "spill": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "rebar": {"show": True},
                     "fire1": {"show": True}, "scorch": {"show": True}, "lit": {"hide": True},
                     "lens": {"hide": True}, "lensbroke": {"show": True}, "tufts": {"hide": True},
                     "dish": {"r": -22.0}, "mast": {"r": 4.0, "x": -1.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "breach": {"show": True},
                     "fire2": {"show": True}, "mast": {"r": 16.0, "x": -4.0}, "dish": {"r": -75.0, "z": -6.0},
                     "antenna": {"r": 105.0}})
    return pose


MODULE = base_module(
    "modern", "Bunker", height=320, width=190, canvas=(470, 700), feet=(360, 650),
    build=build, crumble=crumble, mount_depth=DEPTHS,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-150, -32, 64), 3, 18), ((-60, -32, 64), 3, 18), ((MAST[0], MAST[1], 312), 2, 14)],
    smoke=[((CB[0], 10, 256), 2), ((-60, -30, 60), 3), ((-130, -10, 100), 3)],
    horn=(-100, 350), yaw=BASE_YAW,
)
