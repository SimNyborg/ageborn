"""Arena grounds (the lane surface under every age; the arenas own them, not the scenes).

The lane surface (a worn path with ruts, pebbles with cel shading and a clear edge where lane meets
grass) and the front soil under the HUD (tar pools with a raised rim and a glossy highlight, shaded
bones, snow drifts, cobbles and a moat, planks and sea, craters, neon deck, orbital deck, rift
crystals), with a soft darker front lip. Grounds are flat emissive planes (the toon rim light would
tint a grazing plane) with shaded props on top. Moved here unchanged from backdrop.py.

Output: public/art/ground/<arena>.webp
"""
import math
import os
import random
import shutil

import numpy as np

from ageborn_art import sheet
from ageborn_art.geometry import Geo

from world.scenes.common import FRAMES, REPO, WIDTH, X0, Stage, box, dk, hx, lt, mixc, rock, save_webp

ARENAS = ["tar_pits", "frostfang", "kingsmoat", "powder_bay", "iron_front", "neon_harbor", "orbital_ring", "chrono_rift"]


# -- grounds ------------------------------------------------------------------------------------
GROUNDS = {
    "tar_pits": dict(top=0x8A7A62, path=0x9A8A70, rut=0x77684F, grass=0x7E8350, face=0x6B5B48, deep=0x4E4236),
    "frostfang": dict(top=0xE2E8EE, path=0xD2DAE2, rut=0xB8C4CF, grass=0xC8D6E0, face=0xB8C4CF, deep=0x8C98A6),
    "kingsmoat": dict(top=0x86906A, path=0x9C9478, rut=0x7C745E, grass=0x6E8A4E, face=0x6C6252, deep=0x4F4A42),
    "powder_bay": dict(top=0xD4C49E, path=0xDCCDA8, rut=0xBCAA84, grass=0x9AA070, face=0xB49E78, deep=0x8C7A5C),
    "iron_front": dict(top=0x7A7060, path=0x857A68, rut=0x655C4E, grass=0x6E6E4E, face=0x5C5448, deep=0x433D36),
    "neon_harbor": dict(top=0x5A5E6A, path=0x646874, rut=0x4A4E58, grass=0x40434E, face=0x40434E, deep=0x2C2E36),
    "orbital_ring": dict(top=0xB8BCC6, path=0xC4C8D0, rut=0xA0A6B0, grass=0x9AA0AC, face=0x9AA0AC, deep=0x23262E),
    "chrono_rift": dict(top=0x6A5A86, path=0x7A6A94, rut=0x584A72, grass=0x5A4C78, face=0x4C4064, deep=0x2E2640),
}


def dpt(sy, e=16.0):
    """Depth of a ground point that shows at screen y `sy` (lu, down)."""
    return -sy / math.sin(math.radians(e))


def ground_scene(st, arena):
    G = GROUNDS[arena]
    rnd = random.Random(sum(map(ord, arena)))
    xa, xb = X0 - 140, X0 + WIDTH + 140
    # the terrain: the back grass edge, the lane path, the lip, the front soil
    g = Geo()
    box(g, ((xa + xb) / 2, dpt(-33), -2), ((xb - xa) / 2, dpt(-40) - dpt(-26) + 30, 2), p=6)
    st.part(g, None, glow=hx(G["grass"]))
    g = Geo()
    box(g, ((xa + xb) / 2, (dpt(-27) + dpt(29)) / 2, -1), ((xb - xa) / 2, (dpt(-27) - dpt(29)) / 2, 1), p=8)
    st.part(g, None, glow=hx(G["top"]))
    # worn centre and wheel ruts
    g = Geo()
    for i in range(60):
        x = xa + i * 30 + rnd.uniform(-8, 8)
        g.blob((x, dpt(rnd.uniform(-8, 10)), 0.2), (rnd.uniform(18, 34), rnd.uniform(18, 40), 0.3), p=2.2, cuts=2)
    st.part(g, None, glow=hx(G["path"]))
    g = Geo()
    for sy in (-14, 12):
        for i in range(34):
            x = xa + i * 54 + rnd.uniform(-10, 10)
            g.blob((x, dpt(sy + rnd.uniform(-2, 2)), 0.3), (rnd.uniform(18, 30), 6, 0.3), p=2.2, cuts=2)
    st.part(g, None, glow=hx(G["rut"]))
    # the lip: a raised bevel of the path edge, then the front face going down
    g = Geo()
    box(g, ((xa + xb) / 2, dpt(29), -3), ((xb - xa) / 2, 8, 3), p=4)
    st.part(g, dk(G["top"], 0.12), outline=0.0)
    g = Geo()
    box(g, ((xa + xb) / 2, (dpt(33) + dpt(255)) / 2, -8), ((xb - xa) / 2, (dpt(33) - dpt(255)) / 2 + 10, 3), p=8)
    st.part(g, None, glow=hx(G["face"]))
    # soil variation on the front face: lighter and darker patches
    ga, gd = Geo(), Geo()
    for i in range(70):
        x = rnd.uniform(xa, xb)
        y = dpt(rnd.uniform(40, 250))
        (ga if i % 2 else gd).blob((x, y, -4.7), (rnd.uniform(40, 110), rnd.uniform(25, 60), 0.3), p=2.0, cuts=2)
    st.part(ga, None, glow=hx(lt(G["face"], 0.05)))
    st.part(gd, None, glow=hx(dk(G["face"], 0.06)))
    # pebbles on the lane, with a cel shade (lumpy rocks)
    g, g2 = Geo(), Geo()
    for i in range(110):
        x = rnd.uniform(xa, xb)
        sy = rnd.uniform(-24, 26)
        s = rnd.uniform(1.6, 4.2)
        rock(g if i % 3 else g2, (x, dpt(sy), s * 0.4), (s * 1.3, s * 1.1, s * 0.8), seed=i, jag=0.2, p=2.4, cuts=2)
    st.part(g, lt(G["top"], 0.12), outline=0.4)
    st.part(g2, dk(G["top"], 0.15), outline=0.4)
    # the grass edge where the lane meets the verge (tufts on both edges)
    gt = Geo()
    for sy, n in ((-27, 90), (29, 70)):
        for i in range(n):
            x = rnd.uniform(xa, xb)
            y = dpt(sy + rnd.uniform(-1.5, 1.5))
            for k in range(3):
                a = rnd.uniform(-0.5, 0.5)
                gt.capsule((x + k * 1.6, y, 0), (x + k * 1.6 + math.sin(a) * 6, y, 7 + rnd.uniform(0, 5)), 0.9, 0.3, segs=5, rings=2)
    st.part(gt, G["grass"] if arena not in ("neon_harbor", "orbital_ring") else lt(G["grass"], 0.2), outline=0.3, finish="hair")
    ARENA_DECOR[arena](st, G, rnd, xa, xb)


def decor_tar_pits(st, G, rnd, xa, xb):
    x = xa + 80
    pools = []
    while x < xb - 60:
        sy = rnd.uniform(70, 190)
        rx = rnd.uniform(40, 80) * (0.8 + (sy - 60) / 200)
        pools.append((x, sy, rx))
        x += rx * 2 + rnd.uniform(80, 240)
    rim, tar, sheen = Geo(), Geo(), Geo()
    for px, sy, rx in pools:
        y = dpt(sy)
        rz = rx * 0.9
        rock(rim, (px, y, -8), (rx * 1.18, rz * 1.18, 9), seed=int(px), jag=0.12, p=2.4, cuts=3)
        tar.blob((px, y, -0.6), (rx, rz, 1.2), p=2.2, cuts=3)
        sheen.blob((px - rx * 0.3, y + rz * 0.35, 1.0), (rx * 0.42, rz * 0.16, 0.3), p=2.0, cuts=2)
        sheen.blob((px + rx * 0.3, y + rz * 0.2, 1.0), (rx * 0.08, rz * 0.08, 0.3), p=2.0, cuts=2)
        for b in range(rnd.randint(1, 3)):
            br = rnd.uniform(2, 5)
            tar.sphere((px + rnd.uniform(-0.5, 0.5) * rx, y + rnd.uniform(-0.4, 0.3) * rz, 0.6), br, cuts=2)
    st.part(rim, lt(G["face"], 0.06), outline=0.5)
    st.part(tar, 0x2A2224, outline=0.6, finish="gloss")
    st.part(sheen, 0xE8DCC8, outline=0.0, highlight=False)
    # shaded bones
    gb = Geo()
    for i in range(8):
        bx = xa + 120 + i * (xb - xa) / 8 + rnd.uniform(0, 80)
        by = dpt(rnd.uniform(60, 220))
        a = rnd.uniform(-0.5, 0.5)
        dx, dy = math.cos(a) * 18, math.sin(a) * 18
        gb.capsule((bx - dx, by - dy, -2), (bx + dx, by + dy, -2), 3.2)
        for e in (-1, 1):
            gb.sphere((bx + e * dx, by + e * dy + 3.6, -1.6), 4.4, cuts=2)
            gb.sphere((bx + e * dx, by + e * dy - 3.6, -1.6), 4.4, cuts=2)
    st.part(gb, 0xE8DCC4, outline=0.6)
    soil_rocks(st, G, rnd, xa, xb, 50)


def soil_rocks(st, G, rnd, xa, xb, n, color=None):
    g = Geo()
    for i in range(n):
        x = rnd.uniform(xa, xb)
        sy = rnd.uniform(44, 240)
        s = rnd.uniform(2, 6) * (1 + (sy - 30) / 180)
        rock(g, (x, dpt(sy), s * 0.3 - 6), (s * 1.3, s * 1.1, s * 0.9), seed=i + 300, jag=0.2, p=2.4, cuts=2)
    st.part(g, color if color is not None else mixc(G["top"], G["face"], 0.4), outline=0.5)


def decor_frostfang(st, G, rnd, xa, xb):
    g = Geo()
    for i in range(16):
        x = xa + i * 120 + rnd.uniform(-30, 30)
        rock(g, (x, dpt(rnd.uniform(60, 200)), -6), (rnd.uniform(40, 80), 40, 10), seed=i, jag=0.08, p=2.2, cuts=3)
    st.part(g, 0xF2F6FA, outline=0.3)
    g = Geo()
    for i in range(12):
        x = xa + i * 150 + rnd.uniform(-30, 30)
        y = dpt(rnd.uniform(60, 200))
        g.capsule((x, y, 0.5), (x + 20, y - 30, 0.5), 1.2).capsule((x + 20, y - 30, 0.5), (x + 8, y - 60, 0.5), 1.0)
    st.part(g, 0x9AAAB8, outline=0.0, highlight=False)
    soil_rocks(st, G, rnd, xa, xb, 30, 0x8C98A6)


def decor_kingsmoat(st, G, rnd, xa, xb):
    g = Geo()
    for i in range(40):
        box(g, (xa + i * 44 + rnd.uniform(-4, 4), dpt(48), -4), (18, 16, 3), p=4)
    st.part(g, 0x9AA7AE, outline=0.5)
    g = Geo()
    box(g, ((xa + xb) / 2, (dpt(150) + dpt(260)) / 2, -5.4), ((xb - xa) / 2, (dpt(150) - dpt(260)) / 2, 2), p=8)
    st.part(g, 0x7F9AA8, outline=0.0, finish="gloss")
    g = Geo()
    for i in range(18):
        g.blob((xa + i * 100 + rnd.uniform(0, 40), dpt(rnd.uniform(165, 240)), -3.2), (20, 3, 0.3), p=2.0)
    st.part(g, 0xDCE8EE, outline=0.0, highlight=False)
    soil_rocks(st, G, rnd, xa, xb, 20)


def decor_powder_bay(st, G, rnd, xa, xb):
    g = Geo()
    for i in range(44):
        box(g, (xa + i * 40, dpt(66), -4), (18.5, (dpt(40) - dpt(96)) / 2, 2.4), p=4)
    st.part(g, 0x8A7560, outline=0.5)
    g = Geo()
    box(g, ((xa + xb) / 2, (dpt(100) + dpt(260)) / 2, -5.4), ((xb - xa) / 2, (dpt(100) - dpt(260)) / 2, 2), p=8)
    st.part(g, 0x9CB6BC, outline=0.0, finish="gloss")
    g = Geo()
    for i in range(12):
        x = xa + 60 + i * 150
        g.capsule((x, dpt(96), -30), (x, dpt(96), 4), 4.5)
    st.part(g, 0x5E4E40, outline=0.5)


def decor_iron_front(st, G, rnd, xa, xb):
    g, g2 = Geo(), Geo()
    for i in range(8):
        x = xa + 120 + i * 210 + rnd.uniform(-40, 40)
        y = dpt(rnd.uniform(60, 160))
        rock(g, (x, y, -8), (62, 50, 10), seed=i, jag=0.1, p=2.4, cuts=3)
        g2.blob((x, y, -1), (44, 34, 1.5), p=2.2, cuts=3)
    st.part(g, dk(G["face"], 0.1), outline=0.5)
    st.part(g2, dk(G["face"], 0.4), outline=0.4, highlight=False)
    g = Geo()
    for i in range(30):
        x = xa + i * 60
        g.capsule((x, dpt(130), 0), (x, dpt(130), 18), 1.4)
    for i in range(29):
        x = xa + i * 60
        for k in range(6):
            a, b = k / 6, (k + 1) / 6
            g.capsule((x + 60 * a, dpt(130), 12 + 3 * math.sin(a * 12)), (x + 60 * b, dpt(130), 12 + 3 * math.sin(b * 12)), 0.6)
    st.part(g, 0x3A3632, outline=0.3, finish="metal")
    soil_rocks(st, G, rnd, xa, xb, 40)


def decor_neon_harbor(st, G, rnd, xa, xb):
    g, g2 = Geo(), Geo()
    for i in range(22):
        (g if i % 2 else g2).blob((xa + i * 80 + 38, (dpt(34) + dpt(104)) / 2, -3), (37, (dpt(34) - dpt(104)) / 2, 2), p=6, cuts=2)
    st.part(g, G["face"], outline=0.4)
    st.part(g2, dk(G["face"], 0.08), outline=0.4)
    g = Geo()
    box(g, ((xa + xb) / 2, dpt(34), -0.5), ((xb - xa) / 2, 1.2, 0.6), p=4, cuts=2)
    st.part(g, None, glow="#7FE8C4")
    g = Geo()
    box(g, ((xa + xb) / 2, dpt(104), -0.5), ((xb - xa) / 2, 1.2, 0.6), p=4, cuts=2)
    st.part(g, None, glow="#E89CC8")
    g = Geo()
    box(g, ((xa + xb) / 2, (dpt(110) + dpt(260)) / 2, -5.4), ((xb - xa) / 2, (dpt(110) - dpt(260)) / 2, 2), p=8)
    st.part(g, 0x30343E, outline=0.0, finish="gloss")


def decor_orbital_ring(st, G, rnd, xa, xb):
    g, g2 = Geo(), Geo()
    for i in range(30):
        (g if i % 2 else g2).blob((xa + i * 60 + 28, (dpt(36) + dpt(76)) / 2, -3), (27, (dpt(36) - dpt(76)) / 2, 2), p=6, cuts=2)
    st.part(g, G["top"], outline=0.4, finish="metal")
    st.part(g2, dk(G["top"], 0.06), outline=0.4, finish="metal")
    g = Geo()
    box(g, ((xa + xb) / 2, dpt(78), -0.5), ((xb - xa) / 2, 1.2, 0.6), p=4, cuts=2)
    st.part(g, None, glow="#7FE8C4")
    g = Geo()
    box(g, ((xa + xb) / 2, (dpt(80) + dpt(260)) / 2, -5.4), ((xb - xa) / 2, (dpt(80) - dpt(260)) / 2, 2), p=8)
    st.part(g, 0x23262E, outline=0.0)
    g = Geo()
    for i in range(90):
        g.sphere((rnd.uniform(xa, xb), dpt(rnd.uniform(96, 250)), -3.2), rnd.uniform(0.6, 1.4), cuts=1)
    st.part(g, None, glow="#E8ECF4")


def decor_chrono_rift(st, G, rnd, xa, xb):
    g, gc = Geo(), Geo()
    for i in range(12):
        x = xa + i * 150 + rnd.uniform(0, 40)
        pts = [(x, 40), (x + 30, 80), (x + 10, 130), (x + 40, 180)]
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            g.capsule((ax, dpt(ay), 0.4), (bx, dpt(by), 0.4), 1.6)
        cx, cy = x + 70, dpt(rnd.uniform(50, 200))
        for k in range(3):
            a = rnd.uniform(-0.4, 0.4)
            gc.lathe([(0, 0), (4, 2), (3.6, 14), (0, 20)], (cx + k * 6, cy, -2), (cx + k * 6 + math.sin(a) * 20, cy, 18 + math.cos(a) * 4), segs=6)
    st.part(g, None, glow="#B8A6E0")
    st.part(gc, 0xB8A6E0, outline=0.5, finish="gloss")
    soil_rocks(st, G, rnd, xa, xb, 30)


ARENA_DECOR = {"tar_pits": decor_tar_pits, "frostfang": decor_frostfang, "kingsmoat": decor_kingsmoat,
               "powder_bay": decor_powder_bay, "iron_front": decor_iron_front, "neon_harbor": decor_neon_harbor,
               "orbital_ring": decor_orbital_ring, "chrono_rift": decor_chrono_rift}


def finish_ground(arr):
    """Opaque ground with a soft darker front lip toward the bottom (under the HUD)."""
    rgb, a = arr[..., :3], arr[..., 3:4]
    h = arr.shape[0]
    f = FRAMES["ground"]
    rows = (np.arange(h, dtype=np.float32) / f["ppl"] + f["yTop"])[:, None, None]   # screen lu
    shade = np.clip((rows - 40) / 210, 0, 1) ** 1.3 * 0.42
    rgb = rgb * (1 - shade)
    # fill any gap with the darkest soil
    rgb = rgb * a + (1 - a) * rgb.mean(axis=(0, 1), keepdims=True) * 0.6
    return np.concatenate([np.clip(rgb, 0, 1), np.ones_like(a)], -1)


def render_ground(arena, out, install=True, log=print):
    st = Stage("ground")
    ground_scene(st, arena)
    raw = st.render(os.path.join(out, f"ground_{arena}_raw.png"))
    arr = finish_ground(sheet.load(raw))
    os.remove(raw)
    dst = os.path.join(out, f"ground_{arena}.webp")
    size = save_webp(arr, dst, alpha=False, q=84)
    log(f"[ground.{arena}] {size // 1024} KB")
    if install:
        dest = os.path.join(REPO, "public", "art", "ground")
        os.makedirs(dest, exist_ok=True)
        shutil.copyfile(dst, os.path.join(dest, f"{arena}.webp"))
    return size
