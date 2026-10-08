"""Future scenes. Classic (format 1, until its round 3 re-render): spires, a sky arch and domes in a
lilac dusk (moved here unchanged from backdrop.py)."""
import math

from ageborn_art.geometry import Geo

from world.scenes.common import Scene, box, cyl, dk, ground_band, lt, mixc, ridge

PAL = dict(skyTop=0x2c2e50, skyBottom=0x9a7aa8, far=0x524e78, mid=0x3e3e60, near=0x2c2e46, light=0xd8f3ea)

# the sky the game paints for this classic (sky.ts paintSky), for its thumbnail
SKY = {"top": "#2C2E50", "bottom": "#9A7AA8", "horizon": "#B6B0C6", "celestial": "sun", "sunAt": [860, -560, 30], "night": True}


def far(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.3)
    ridge(st, back, -300, 1500, 0, 120, 460, 41, lumps=10, jag=0.1)
    # the ring arch
    g = Geo()
    for k in range(40):
        a0, a1 = math.pi * k / 40, math.pi * (k + 1) / 40
        g.capsule((700 + 200 * math.cos(a0), 300, 300 * math.sin(a0)), (700 + 200 * math.cos(a1), 300, 300 * math.sin(a1)), 9)
    st.part(g, lt(P["far"], 0.12), outline=0.0, finish="gloss")
    gt, gs = Geo(), Geo()
    for sx, h, w in ((60, 400, 34), (180, 300, 26), (470, 440, 40), (960, 380, 36), (1130, 470, 44), (1300, 320, 30)):
        gt.lathe([(0, 0), (w, 0), (w * 0.55, h * 0.6), (w * 0.35, h), (0, h + 40)], (sx, 160, 0), (sx, 160, h + 40), segs=6)
        gs.blob((sx, 160 - w * 0.5, h * 0.55), (2.4, 2, h * 0.4), p=4, cuts=2)
        st.amb("blink", "bd.light", (sx, 160, h + 44), "far", period=900 + (sx % 7) * 120, tint=0xF6C6E4)
    st.part(gt, P["far"], outline=0.0, finish="gloss")
    st.part(gs, None, glow="#8FD8C4")
    g = Geo()
    g.blob((620, 120, 270), (64, 20, 12), p=2.4)
    g.blob((870, 120, 336), (50, 20, 11), p=2.4)
    st.part(g, lt(P["far"], 0.15), outline=0.0, finish="gloss")
    st.amb("drift", "bd.skycar", (200, 0, 300), "sky", speed=60, tint=0xD8F3EA)
    st.amb("drift", "bd.skycar", (900, 0, 360), "sky", speed=-45, tint=0xF6D8EC, scale=0.7)


def mid(st, P):
    ground_band(st, P["mid"])
    for x, r in ((80, 70), (520, 90), (1050, 80)):
        g = Geo()
        prof = [(0, 0)] + [(r * math.cos(math.pi / 2 * k / 8), r * 0.7 * math.sin(math.pi / 2 * k / 8)) for k in range(9)]
        g.lathe(prof, (x, 60, 0), (x, 60, r * 0.7), segs=28)
        st.part(g, P["near"], outline=0.5, finish="gloss")
        g = Geo()
        cyl(g, (x, 60, r * 0.25 - 1.5), (x, 60, r * 0.25 + 1.5), r * 0.93 + 1, bevel=0.3, segs=28)
        st.part(g, None, glow="#7FD8BE")
        st.amb("blink", "bd.light", (x, 60, r * 0.7 + 4), "mid", period=1300, tint=0xD8FFF0)
    g, gl = Geo(), Geo()
    for i in range(12):
        x = -230 + i * 145
        g.capsule((x, 20, 0), (x, 20, 150), 4)
        box(g, (x, 20, 152), (18, 6, 4), p=5)
        gl.blob((x, 15, 80), (1.6, 1, 60), p=3, cuts=1)
    st.part(g, dk(P["near"], 0.1), outline=0.4, finish="metal")
    st.part(gl, None, glow="#C9A4C0")
    g = Geo()
    box(g, (600, 0, 34), (900, 6, 4), p=6)
    st.part(g, dk(P["mid"], 0.1), outline=0.3, finish="metal")


SCENES = {"classic": Scene("future", "classic", PAL, far, mid, sky=SKY, version=1)}
