"""Modern scenes. Classic (format 1, until its round 3 re-render): a city skyline with a radio mast,
broken blocks and telegraph poles (moved here unchanged from backdrop.py)."""
import math
import random

from ageborn_art.geometry import Geo

from world.scenes.common import Scene, cyl, dk, ground_band, lt, mixc, ridge, rock

PAL = dict(skyTop=0x98a8b6, skyBottom=0xe6dcc4, far=0x8a8f9a, mid=0x6c7264, near=0x565c4a, light=0xf2ead2)

# the sky the game paints for this classic (sky.ts paintSky), for its thumbnail
SKY = {"top": "#98A8B6", "bottom": "#E6DCC4", "horizon": "#EBE2CA", "celestial": "sun", "sunAt": [420, -600, 38]}


def far(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.35)
    ridge(st, back, -300, 1500, 0, 130, 460, 31, lumps=10, jag=0.1)
    rnd = random.Random(5)
    x = -280
    i = 0
    gb, gb2, gw = Geo(), Geo(), Geo()
    while x < 1480:
        w = rnd.uniform(40, 80)
        h = rnd.uniform(90, 290)
        d = rnd.uniform(60, 220)
        (gb if i % 2 else gb2).blob((x + w / 2, d, h / 2), (w / 2 - 2, 22, h / 2), p=8, cuts=2)
        # lit window rows: thin slabs, a few per building
        for wz in range(int(20), int(h - 14), 22):
            if rnd.random() < 0.55:
                gw.blob((x + w / 2, d - 23, wz), (w / 2 - 8, 1, 2.2), p=6, cuts=1)
        if i % 5 == 2:
            cyl(gb, (x + w / 2, d, h), (x + w / 2, d, h + 50), 5, 4, bevel=0.5, segs=10)
            st.amb("emit", "fx.p.smoke", (x + w / 2, d, h + 54), "far", rate=0.9, speed=12, scale=2.2, tint=lt(P["far"], 0.4), alpha=0.5)
        if i % 7 == 4:
            gb.capsule((x + 10, d, h), (x + 10, d, h + 120), 2.4)
            gb.capsule((x + 10, d, h + 118), (x + 90, d, h + 118), 2.0)
            st.amb("blink", "bd.light", (x + 10, d, h + 124), "far", period=1400, tint=0xF2D6D6)
        x += w + rnd.uniform(-6, 10)
        i += 1
    st.part(gb2, P["far"], outline=0.0)
    st.part(gb, dk(P["far"], 0.07), outline=0.0)
    st.part(gw, lt(P["far"], 0.28), outline=0.0, highlight=False)


def mid(st, P):
    ground_band(st, P["mid"])
    rnd = random.Random(8)
    ga, gb, gw = Geo(), Geo(), Geo()
    for i in range(9):
        x = -180 + i * 200
        h = rnd.uniform(90, 130)
        g = ga if i % 2 else gb
        g.blob((x + 48, 40, h / 2), (46, 20, h / 2), p=6, cuts=2)
        # broken top
        rock(g, (x + 70, 40, h), (22, 18, 16), seed=i, jag=0.3, p=2.0)
        for k in range(3):
            gw.blob((x + 18 + k * 28, 19, h * 0.55), (7, 1, 8), p=5, cuts=1)
    ruin = mixc(P["near"], 0x9A968C, 0.55)
    st.part(ga, ruin, outline=0.5)
    st.part(gb, dk(ruin, 0.08), outline=0.5)
    st.part(gw, dk(ruin, 0.4), outline=0.0, highlight=False)
    g, gwire = Geo(), Geo()
    poles = list(range(-220, 1480, 170))
    for x in poles:
        g.capsule((x, -10, 0), (x, -10, 150), 2.6)
        g.capsule((x - 14, -10, 140), (x + 14, -10, 140), 1.8)
    for a, b in zip(poles, poles[1:]):
        pts = [(a + (b - a) * t / 8, -10, 140 - 24 * math.sin(math.pi * t / 8)) for t in range(9)]
        for p, q in zip(pts, pts[1:]):
            gwire.capsule(p, q, 0.7)
    st.part(g, dk(P["mid"], 0.25), outline=0.3)
    st.part(gwire, dk(P["mid"], 0.35), outline=0.0, highlight=False)
    g = Geo()
    for i in range(30):
        g.blob((-250 + i * 60, -20, 5), (13, 7, 5), p=2.6)
    st.part(g, mixc(P["near"], P["light"], 0.3), outline=0.4, finish="hair")


SCENES = {"classic": Scene("modern", "classic", PAL, far, mid, sky=SKY, version=1)}
