"""Gunpowder scenes. Classic (format 1, until its round 3 re-render): a coast with sailing ships,
windmills and a cottage (moved here unchanged from backdrop.py)."""
import random

from ageborn_art.geometry import Geo

from world.scenes.common import Scene, box, cyl, dk, ground_band, lt, mixc, ridge, rock, round_tree

PAL = dict(skyTop=0x8cb6c6, skyBottom=0xf2e2c0, far=0x8ea3a6, mid=0x6c8874, near=0x546c56, light=0xfff0d0)

# the sky the game paints for this classic (sky.ts paintSky), for its thumbnail
SKY = {"top": "#8CB6C6", "bottom": "#F2E2C0", "horizon": "#F8E8C7", "celestial": "sun", "sunAt": [1060, -470, 44]}


def far(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.35)
    ridge(st, back, -300, 900, -10, 180, 420, 21, lumps=8, jag=0.12)
    # the sea on the right with three ships
    g = Geo()
    box(g, (1200, 200, 0), (330, 200, 2), p=6)
    st.part(g, mixc(P["skyBottom"], P["far"], 0.45), outline=0.0, finish="gloss")
    for sx, s in ((1010, 1.0), (1210, 0.8), (1350, 0.65)):
        gh, gs = Geo(), Geo()
        gh.blob((sx, 180, 18 * s + 6), (62 * s, 16 * s, 16 * s), p=3.0)
        for dx, h in ((-20, 150), (20, 120)):
            gh.capsule((sx + dx * s, 180, 20 * s), (sx + dx * s, 180, h * s + 20), 2.4 * s)
            gs.blob((sx + dx * s + 3, 176, h * s * 0.72 + 10), (16 * s, 3, h * s * 0.3), p=2.4)
        st.part(gh, dk(P["far"], 0.05), outline=0.0)
        st.part(gs, lt(P["far"], 0.4), outline=0.0)
    ridge(st, P["far"], -300, 860, 10, 90, 140, 22, lumps=8, jag=0.08, peaks=False)
    # windmills: towers here, sails turn as code ambient
    for wx in (120, 420, 690):
        g = Geo()
        cyl(g, (wx, 60, 50), (wx, 60, 140), 18, 11, bevel=1, segs=12)
        g.lathe([(0, 0), (14, 0), (0.5, 20), (0, 21)], (wx, 60, 140), (wx, 60, 161), segs=12)
        st.part(g, dk(P["far"], 0.06), outline=0.0)
        st.amb("rotate", "bd.windmill.sails", (wx, 40, 146), "far", speed=40, tint=lt(P["far"], 0.2))


def mid(st, P):
    ground_band(st, P["mid"])
    rnd = random.Random(12)
    ga, gt = Geo(), Geo()
    for i in range(9):
        x = -200 + i * 190 + rnd.uniform(-30, 30)
        if 520 < x < 720:
            continue
        r = rnd.uniform(28, 38)
        round_tree(ga, x, 90, r, 100 + i)
        gt.capsule((x, 90, 0), (x, 90, r), 3.4)
    st.part(gt, 0x5E4836, outline=0.4)
    st.part(ga, P["near"], outline=0.5)
    g = Geo()
    for i in range(12):
        x = -200 + i * 150
        rock(g, (x, 40, 20), (52, 26, 30), seed=60 + i, jag=0.1, p=2.4)
    st.part(g, dk(P["near"], 0.06), outline=0.5)
    g = Geo()
    for hx_ in (320, 900):
        g.lathe([(0, 0), (22, 0), (22, 18), (12, 38), (0, 44)], (hx_, 0, 0), (hx_, 0, 44), segs=14)
        g.lathe([(0, 0), (16, 0), (16, 12), (8, 28), (0, 32)], (hx_ + 40, 10, 0), (hx_ + 40, 10, 32), segs=14)
    st.part(g, mixc(P["light"], P["mid"], 0.35), outline=0.5, finish="hair")
    g = Geo()
    box(g, (615, 40, 37), (55, 26, 37), p=6)
    st.part(g, mixc(P["light"], P["near"], 0.4), outline=0.5)
    g = Geo().lathe([(0, 0), (70, 0), (0.5, 50), (0, 52)], (615, 40, 74), (615, 40, 126), segs=4, rot=(0, 0, 45),
                    squash=(1.0, 0.5))
    st.part(g, dk(P["mid"], 0.2), outline=0.5)
    g = Geo()
    cyl(g, (650, 50, 100), (650, 50, 140), 6, bevel=0.5, segs=10)
    st.part(g, dk(P["near"], 0.1), outline=0.4)
    g = Geo()
    for k in range(3):
        box(g, (585 + k * 30, 13, 40), (7, 1, 8), p=5)
    st.part(g, dk(P["near"], 0.3), outline=0.0, highlight=False)
    st.amb("emit", "fx.p.smoke", (650, 50, 144), "mid", rate=0.7, speed=14, scale=1.2, tint=lt(P["mid"], 0.4), alpha=0.45)


SCENES = {"classic": Scene("gunpowder", "classic", PAL, far, mid, sky=SKY, version=1)}
