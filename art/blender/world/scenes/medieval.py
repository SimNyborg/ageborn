"""Medieval scenes. Classic (format 1, until its round 3 re-render): green hills crowned by a castle,
round trees, cottages and a fence (moved here unchanged from backdrop.py)."""
import random

from ageborn_art.geometry import Geo

from world.scenes.common import Scene, box, castle, cyl, dk, ground_band, mixc, ridge, rock, round_tree

PAL = dict(skyTop=0x92b6d6, skyBottom=0xeee6d0, far=0x97a1b3, mid=0x78886c, near=0x5a6e4e, light=0xfff4dc)

# the sky the game paints for this classic (sky.ts paintSky), for its thumbnail
SKY = {"top": "#92B6D6", "bottom": "#EEE6D0", "horizon": "#F6ECD5", "celestial": "sun", "sunAt": [250, -560, 40]}


def far(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.35)
    ridge(st, back, -300, 1500, -10, 200, 420, 11, lumps=9, jag=0.12)
    ridge(st, P["far"], -300, 1500, 10, 100, 140, 12, lumps=9, jag=0.08, peaks=False)
    # castle on its hill
    g = Geo()
    rock(g, (340, 120, 30), (260, 60, 120), seed=4, jag=0.06, p=2.2)
    st.part(g, P["far"], outline=0.0)
    gb, gr = Geo(), Geo()
    castle(gb, gr, 340, 110, 140, 0.9)
    st.part(gb, dk(P["far"], 0.05), outline=0.0)
    st.part(gr, mixc(P["far"], 0x8E6070, 0.3), outline=0.0)
    gb, gr = Geo(), Geo()
    cyl(gb, (1120, 200, 60), (1120, 200, 200), 14, bevel=1, segs=14)
    gr.lathe([(0, 0), (18, 0), (0.5, 40), (0, 42)], (1120, 200, 200), (1120, 200, 242), segs=14)
    st.part(gb, back, outline=0.0)
    st.part(gr, dk(back, 0.08), outline=0.0)
    st.amb("drift", "bd.bird", (600, 0, 390), "sky", speed=22, scale=1, tint=dk(P["far"], 0.2))
    st.amb("drift", "bd.bird", (640, 0, 410), "sky", speed=22, scale=0.8, tint=dk(P["far"], 0.2))


def mid(st, P):
    ground_band(st, P["mid"])
    rnd = random.Random(4)
    ga, gb, gt = Geo(), Geo(), Geo()
    for i in range(22):
        x = -220 + i * 80 + rnd.uniform(-20, 20)
        r = rnd.uniform(30, 44)
        round_tree(ga if i % 2 else gb, x, 70, r, i)
        gt.capsule((x, 70, 0), (x, 70, r * 1.0), 3.4)
    st.part(gt, 0x5E4836, outline=0.4)
    st.part(ga, P["near"], outline=0.5)
    st.part(gb, dk(P["near"], 0.1), outline=0.5)
    for cx in (140, 760, 1230):
        g = Geo()
        box(g, (cx, 20, 22), (34, 18, 22), p=6)
        st.part(g, mixc(P["near"], P["light"], 0.45), outline=0.5)
        g = Geo().lathe([(0, 0), (44, 0), (0.5, 40), (0, 42)], (cx, 20, 44), (cx, 20, 86), segs=4, rot=(0, 0, 45),
                        squash=(1.0, 0.55))
        st.part(g, dk(P["mid"], 0.15), outline=0.5)
        g = Geo()
        box(g, (cx - 10, -0.5, 12), (6, 1, 10), p=5)
        st.part(g, dk(P["near"], 0.3), outline=0.0, highlight=False)
    g = Geo()
    for x in range(-260, 1480, 60):
        g.capsule((x, -20, 0), (x, -20, 24), 2)
    g.capsule((-260, -20, 18), (1480, -20, 18), 1.4)
    g.capsule((-260, -20, 9), (1480, -20, 9), 1.4)
    st.part(g, dk(P["mid"], 0.2), outline=0.3)


SCENES = {"classic": Scene("medieval", "classic", PAL, far, mid, sky=SKY, version=1)}
