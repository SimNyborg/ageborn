"""Stone Age scenes. Classic (format 1, until its round 3 re-render): an alpine valley under a smoking
volcano, pines and hide tents (the strips the game ships today, moved here unchanged from backdrop.py)."""
import math
import random

from ageborn_art.geometry import Geo

from world.scenes.common import Scene, dk, ground_band, lt, mixc, pine, ridge, rock

PAL = dict(skyTop=0x8db3cf, skyBottom=0xf0e2c4, far=0x9c98a6, mid=0x7f8762, near=0x5f7247, light=0xfff0cc)

# the sky the game paints for this classic (sky.ts paintSky), for its thumbnail
SKY = {"top": "#8DB3CF", "bottom": "#F0E2C4", "horizon": "#F7E8C8", "celestial": "sun", "sunAt": [980, -520, 46]}


def far(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.35)
    ridge(st, back, -300, 1500, -10, 230, 420, 3, lumps=10)
    # volcano with a crater and a lava glow
    g = Geo().lathe([(0, 0), (240, 0), (170, 60), (64, 260), (46, 286), (30, 280), (0, 274)], (900, 200, -20),
                    (900, 200, 266), segs=32)
    st.part(g, mixc(P["far"], 0x7A6A62, 0.35), outline=0.0)
    g = Geo()
    for a in range(0, 360, 40):
        r = math.radians(a)
        g.capsule((900 + 56 * math.cos(r), 150, 200), (900 + 40 * math.cos(r) * 0.8, 150, 250), 6, 3)
    st.part(g, dk(P["far"], 0.12), outline=0.0)
    st.amb("emit", "fx.p.smoke", (900, 200, 270), "far", rate=1.2, speed=16, scale=3.2, tint=lt(P["far"], 0.35), alpha=0.55)
    ridge(st, dk(P["far"], 0.08), -300, 1500, -10, 130, 140, 7, lumps=13)


def mid(st, P):
    ground_band(st, P["mid"])
    rnd = random.Random(3)
    ga, gb = Geo(), Geo()
    for i in range(26):
        x = -240 + i * 67 + rnd.uniform(-20, 20)
        pine(ga if i % 3 else gb, x, 60 + rnd.uniform(-20, 40), rnd.uniform(90, 150), rnd.uniform(24, 32))
    g = Geo()
    for i in range(26):
        x = -240 + i * 67
        g.capsule((x, 60, 0), (x, 60, 30), 3)
    st.part(g, 0x5E4836, outline=0.4)
    st.part(ga, P["near"], outline=0.5)
    st.part(gb, dk(P["near"], 0.1), outline=0.5)
    for tx in (260, 980):
        g = Geo().lathe([(0, 0), (30, 0), (1, 70), (0, 72)], (tx, 20, 0), (tx, 20, 72), segs=9)
        st.part(g, mixc(P["near"], P["light"], 0.3), outline=0.5)
        g = Geo().blob((tx, -9, 12), (6, 2, 12), p=2.0, taper=(1.0, 0.4))
        st.part(g, 0x3A302A, outline=0.0, highlight=False)
        st.amb("emit", "fx.p.smoke", (tx, 20, 76), "mid", rate=0.8, speed=14, scale=1.3, tint=lt(P["mid"], 0.4), alpha=0.45)
    g = Geo()
    for i in range(10):
        rock(g, (-200 + i * 180, 0, 6), (22, 14, 14), seed=40 + i, jag=0.2)
    st.part(g, dk(P["mid"], 0.1), outline=0.5)


SCENES = {"classic": Scene("stone", "classic", PAL, far, mid, sky=SKY, version=1)}
