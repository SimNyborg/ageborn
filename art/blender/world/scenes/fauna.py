"""Small rigs for scene props (PLAN 2b "Props"): birds, herd animals, boats, aircraft and vehicles that the
round 2 scenes animate (`loop`, `path`, `bob`). Each builder adds joints and parts to a prop's rig (facing
+x, lane lu, z up, -y toward the camera); each `*_pose(f)` gives one frame's pose. Shapes stay chunky and
rounded (A11, UI art sheet 3.4) and are toon-lit like the units; colours stay muted (the props are finished
like their layer, and accents stay small for the A11 colour rule)."""
import math

from ageborn_art.geometry import Geo

from world.common import box


class Into:
    """Routes parts added to "all" onto another joint (a scaled sub-joint)."""

    def __init__(self, rig, joint):
        self.rig = rig
        self.j = joint

    def part(self, joint, geo, *a, **k):
        return self.rig.part(self.j if joint == "all" else joint, geo, *a, **k)

    def joint(self, name, parent, pos, **k):
        return self.rig.joint(name, self.j if parent == "all" else parent, pos, **k)


def scaled(build, s):
    """A builder drawn `s` times its authored size (about the rig's origin)."""
    def b(rig):
        rig.joint("sc", "all", (0, 0, 0), scale=s)
        build(Into(rig, "sc"))
    return b


# -- birds ----------------------------------------------------------------------------------------
def bird(body="#4A4248", wing="#3A3438", belly=None, beak="#C8A060", span=13.0, size=1.0, tail=True):
    """A bird in side view flying right: body, head and beak, two wings on shoulder joints (they flap
    by rolling up and down about the body), a fan tail."""
    def build(rig):
        s = size
        rig.joint("body", "all", (0, 0, 0))
        rig.part("body", Geo().blob((0, 0, 0), (6.0 * s, 2.6 * s, 2.4 * s), p=2.0, taper=(0.9, 1.0)), body, outline=0.5)
        if belly:
            rig.part("body", Geo().blob((0.6 * s, -0.6 * s, -1.0 * s), (4.6 * s, 2.0 * s, 1.4 * s), p=2.0), belly, outline=0.0)
        rig.part("body", Geo().sphere((6.2 * s, 0, 1.4 * s), 2.4 * s), body, outline=0.5)
        rig.part("body", Geo().lathe([(0.01, 0), (1.0 * s, 0), (0.01, 2.8 * s)], (8.0 * s, 0, 1.2 * s), (10.8 * s, 0, 0.6 * s), segs=8),
                 beak, outline=0.3)
        if tail:
            rig.part("body", Geo().slab([(-5 * s, 0.6 * s), (-11 * s, 2.4 * s), (-11.6 * s, -1.6 * s), (-5 * s, -0.8 * s)], 0, 1.2 * s),
                     wing, outline=0.4)
        for side, name in ((-1, "wn"), (1, "wf")):
            # a wing lies flat along the span (y) from its shoulder; the flap rolls it about x
            rig.joint(name, "body", (0.5 * s, side * 1.4 * s, 1.0 * s))
            g = Geo()
            g.blob((0.8 * s, side * (1.4 + span * 0.3) * s, 1.0 * s), (4.2 * s, span * 0.34 * s, 0.7 * s), p=2.6)
            g.blob((-0.6 * s, side * (1.4 + span * 0.74) * s, 1.0 * s), (2.8 * s, span * 0.3 * s, 0.55 * s), p=2.4)
            rig.part(name, g, wing, outline=0.4)
    return build


def bird_pose(f):
    """Flap frames 0-3 (up, mid, down, mid) and a glide frame 4."""
    a = [62, 20, -38, 18, 6][f]
    bob = [-0.6, 0.0, 0.8, 0.0, 0.0][f]
    return {"wn": {"rx": -a}, "wf": {"rx": a}, "body": {"z": bob}}


# -- herd animals ---------------------------------------------------------------------------------
def mammoth(fur="#6E5646", fur_dk="#5A4638", tusk="#E8DEC8", size=1.0):
    """A woolly mammoth facing right: a domed head with a long trunk, curling tusks, a high shoulder
    hump, shaggy flanks (hair fringe under the belly), four pillar legs that walk."""
    def build(rig):
        s = size
        for leg, (x, y) in {"lf": (9, -4.5), "lb": (-9, -4.5), "rf": (9, 4.5), "rb": (-9, 4.5)}.items():
            rig.joint(leg, "all", (x * s, y * s, 15 * s))
            g = Geo().capsule((x * s, y * s, 0.8 * s), (x * s, y * s, 15 * s), 3.4 * s, 3.8 * s)
            rig.part(leg, g, fur_dk if y > 0 else fur, outline=0.5)
            rig.part(leg, Geo().blob((x * s, y * s - 0.2, 1.0 * s), (3.8 * s, 3.6 * s, 1.3 * s), p=2.6), "#4A3C34", outline=0.3)
        rig.joint("body", "all", (0, 0, 16 * s))
        rig.part("body", Geo().blob((-1 * s, 0, 22 * s), (15 * s, 8 * s, 10.5 * s), p=2.2, taper=(0.9, 1.0)), fur, outline=0.6)
        rig.part("body", Geo().blob((5 * s, 0, 30 * s), (8 * s, 6.5 * s, 5.5 * s), p=2.2), fur, outline=0.5)
        # the shaggy fringe under the belly
        fr = Geo()
        for k in range(7):
            fx = -13 + k * 4.2
            fr.blob((fx * s, -1.0 * s, 13.4 * s), (2.6 * s, 7.4 * s, 3.6 * s), p=2.0, taper=(0.5, 1.0))
        rig.part("body", fr, fur_dk, outline=0.4)
        rig.joint("head", "body", (15 * s, 0, 27 * s))
        rig.part("head", Geo().blob((17.5 * s, 0, 28 * s), (6.6 * s, 5.4 * s, 7.4 * s), p=2.2), fur, outline=0.6)
        rig.part("head", Geo().sphere((19.6 * s, -3.4 * s, 30 * s), 0.9 * s), "#2A2420", outline=0.0)
        # the trunk: three tapering segments hanging down and curling forward
        tr = Geo()
        pts = [(22 * s, 26 * s), (24.4 * s, 18 * s), (24.6 * s, 10 * s), (26.6 * s, 5 * s)]
        rads = [3.0, 2.4, 1.8, 1.3]
        for (ax, az), (bx, bz), ra, rb in zip(pts, pts[1:], rads, rads[1:]):
            tr.capsule((ax, -0.6 * s, az), (bx, -0.6 * s, bz), ra * s, rb * s)
        rig.part("head", tr, fur, outline=0.5)
        # tusks: curving forward and up
        for side in (-1, 1):
            tk = Geo()
            tp = [(21 * s, 22 * s), (26 * s, 14 * s), (32 * s, 13 * s), (35 * s, 17 * s)]
            for (ax, az), (bx, bz), ra in zip(tp, tp[1:], (1.4, 1.2, 0.9)):
                tk.capsule((ax, side * 2.6 * s, az), (bx, side * 3.0 * s, bz), ra * s, (ra - 0.25) * s)
            rig.part("head", tk, tusk, outline=0.4)
        rig.part("head", Geo().blob((12.8 * s, -1 * s, 31 * s), (2.6 * s, 2.0 * s, 4.4 * s), p=2.0), fur_dk, outline=0.4)
        rig.part("body", Geo().capsule((-15 * s, 0, 24 * s), (-17 * s, 0, 17 * s), 1.0 * s, 0.6 * s), fur_dk, outline=0.3)
    return build


def walk4_pose(f, swing=18.0, bob=0.8, head=3.0):
    """A four-frame walk: diagonal legs swing together, the body bobs, the head nods."""
    a = [swing, swing * 0.35, -swing, -swing * 0.35][f]
    b = [0.0, bob, 0.0, bob][f]
    return {"lf": {"r": a, "z": b}, "rb": {"r": a, "z": b}, "rf": {"r": -a, "z": b}, "lb": {"r": -a, "z": b},
            "body": {"z": b}, "head": {"r": [head, 0, -head, 0][f]}}


# -- boats ----------------------------------------------------------------------------------------
def galley(hull="#6A5444", hull_dk="#54443A", sail="#DCD2BC", stripe="#8A6A5A", oars=True, size=1.0, sail_up=True,
           oar_frame=0):
    """A Bronze Age galley facing right: a long low hull with a curled stern post and a ram at the bow, a
    square sail on one mast (furled when `sail_up` is False), a row of oars that sweep with `oar_frame`."""
    def build(rig):
        s = size
        g = Geo().blob((0, 0, 5 * s), (30 * s, 5.2 * s, 4.2 * s), p=3.2, taper=(0.86, 1.0))
        rig.part("all", g, hull, outline=0.6)
        rig.part("all", Geo().blob((0, -0.4 * s, 8.4 * s), (29 * s, 5.0 * s, 1.0 * s), p=3.0), hull_dk, outline=0.4)
        # the stern post curling up and the bow ram
        sp = Geo()
        pts = [(-27, 6), (-32, 10), (-34, 16), (-32, 20), (-29, 19)]
        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
            sp.capsule((ax * s, 0, az * s), (bx * s, 0, bz * s), 1.4 * s, 1.1 * s)
        rig.part("all", sp, hull, outline=0.5)
        rig.part("all", Geo().lathe([(0.01, 0), (2.2 * s, 0), (0.01, 7 * s)], (29 * s, 0, 3.2 * s), (37 * s, 0, 2.4 * s), segs=10),
                 "#8A7A5A", finish="bronze", outline=0.4)
        rig.part("all", Geo().capsule((27 * s, 0, 6 * s), (31 * s, 0, 13 * s), 1.2 * s, 1.0 * s), hull, outline=0.4)
        # an eye on the bow
        rig.part("all", Geo().sphere((24.5 * s, -5.2 * s, 6.4 * s), 1.1 * s), "#E8E0D0", outline=0.2)
        # mast and sail
        rig.part("all", Geo().capsule((2 * s, 0, 8 * s), (2 * s, 0, 40 * s), 0.9 * s), "#5A4636", outline=0.4)
        if sail_up:
            sl = Geo().blob((2 * s, -1.2 * s, 27 * s), (13 * s, 1.0 * s, 10 * s), p=4.0, taper=(1.0, 0.92))
            rig.part("all", sl, sail, outline=0.5)
            st = Geo()
            for dz in (-4.0, 4.0):
                st.blob((2 * s, -2.3 * s, (27 + dz) * s), (12.6 * s, 0.4 * s, 1.4 * s), p=4.0)
            rig.part("all", st, stripe, outline=0.0)
            rig.part("all", Geo().capsule((-12 * s, -1.2 * s, 37.4 * s), (16 * s, -1.2 * s, 37.4 * s), 0.6 * s), "#5A4636", outline=0.3)
        else:
            rig.part("all", Geo().capsule((-10 * s, -1.2 * s, 36 * s), (14 * s, -1.2 * s, 36 * s), 1.6 * s), sail, outline=0.4)
        if oars:
            go = Geo()
            sweep = [-14, 0, 14, 0][oar_frame % 4]
            for k in range(7):
                ox = (-18 + k * 6) * s
                a = math.radians(sweep)
                go.capsule((ox, -5 * s, 6 * s), (ox - math.sin(a) * 9 * s, -10 * s, -2 * s), 0.5 * s)
            rig.part("all", go, "#7A6450", outline=0.3)
    return build


def sloop(hull="#5E4A3C", sail="#E2D8C4", trim="#7A6A50", size=1.0):
    """A small one-masted sloop facing right (Gunpowder): a dark hull with a pale strake, a gaff mainsail
    and a jib, a little pennant."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 5 * s), (22 * s, 5 * s, 4.6 * s), p=3.0, taper=(0.8, 1.0)), hull, outline=0.6)
        rig.part("all", Geo().blob((0, -0.2 * s, 8.4 * s), (21.6 * s, 4.8 * s, 0.9 * s), p=3.0), trim, outline=0.3)
        rig.part("all", Geo().blob((-16 * s, 0, 11 * s), (6 * s, 4.4 * s, 3.0 * s), p=4.0), hull, outline=0.4)
        rig.part("all", Geo().capsule((2 * s, 0, 8 * s), (2 * s, 0, 46 * s), 0.8 * s, 0.6 * s), "#4E3E30", outline=0.3)
        rig.part("all", Geo().capsule((22 * s, 0, 9 * s), (31 * s, 0, 12 * s), 0.6 * s), "#4E3E30", outline=0.3)
        main = Geo().slab([(-15 * s, 12 * s), (0.5 * s, 12 * s), (0.5 * s, 42 * s), (-12 * s, 35 * s)], -0.6 * s, 0.9 * s)
        rig.part("all", main, sail, outline=0.5)
        jib = Geo().slab([(3.5 * s, 11 * s), (29 * s, 11.6 * s), (3.5 * s, 41 * s)], -0.6 * s, 0.9 * s)
        rig.part("all", jib, sail, outline=0.5)
        rig.part("all", Geo().slab([(2 * s, 45 * s), (9 * s, 43.6 * s), (2 * s, 42.4 * s)], 0, 0.6 * s), "#8A5A4A", outline=0.2)
    return build


def rowboat(hull="#7A6048", inner="#5A4636", size=1.0):
    """A beached rowboat, tilted a little, oars inside."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 4 * s), (13 * s, 5 * s, 3.6 * s), p=2.8, taper=(0.7, 1.0)), hull, outline=0.5)
        rig.part("all", Geo().blob((0, 0, 6.6 * s), (11.6 * s, 4.0 * s, 1.2 * s), p=3.0), inner, outline=0.0)
        rig.part("all", Geo().capsule((-9 * s, -1 * s, 7.4 * s), (10 * s, 2 * s, 8.6 * s), 0.5 * s), "#9A8060", outline=0.2)
    return build


# -- aircraft and vehicles ------------------------------------------------------------------------
def prop_plane(body="#8A8C7A", wing="#7A7C6C", stripe="#5A5E52", size=1.0, prop_frame=0, gear=True):
    """A twin-engine transport in side view facing right: a long fuselage with a rounded nose and
    windows, a high wing with two engines, a tall tail fin, gear down on the ground."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 12 * s), (30 * s, 4.6 * s, 4.6 * s), p=2.4, taper=(1.0, 0.9)), body, outline=0.6)
        rig.part("all", Geo().blob((-30 * s, 0, 15 * s), (8 * s, 2.4 * s, 2.4 * s), p=2.4, rot=(0, -10, 0)), body, outline=0.5)
        fin = Geo().slab([(-36 * s, 15 * s), (-27 * s, 15 * s), (-33 * s, 28 * s), (-38 * s, 28 * s)], 0, 1.4 * s)
        rig.part("all", fin, wing, outline=0.5)
        rig.part("all", Geo().blob((-33 * s, -4 * s, 15.6 * s), (5 * s, 6 * s, 0.8 * s), p=3.0), wing, outline=0.3)
        rig.part("all", Geo().blob((2 * s, -6 * s, 16.6 * s), (7 * s, 12 * s, 1.0 * s), p=3.0), wing, outline=0.4)
        rig.part("all", Geo().capsule((-2 * s, -9 * s, 15 * s), (9 * s, -9 * s, 15 * s), 2.4 * s, 2.0 * s), wing, outline=0.4)
        rig.part("all", Geo().blob((0, -4.8 * s, 12.6 * s), (24 * s, 0.4 * s, 0.9 * s), p=3.0), stripe, outline=0.0)
        gw = Geo()
        for k in range(6):
            gw.sphere(((16 - k * 6) * s, -4.4 * s, 14 * s), 1.0 * s, cuts=2)
        rig.part("all", gw, "#3A3F45", outline=0.0)
        rig.part("all", Geo().blob((25 * s, -2.6 * s, 14.6 * s), (3.4 * s, 2.2 * s, 1.6 * s), p=2.4), "#4A5058", finish="gloss", outline=0.3)
        pr = Geo()
        a = math.radians(prop_frame * 60)
        pr.capsule((10 * s, -9.2 * s - math.cos(a) * 3.2 * s, 15 * s + math.sin(a) * 3.2 * s),
                   (10 * s, -9.2 * s + math.cos(a) * 3.2 * s, 15 * s - math.sin(a) * 3.2 * s), 0.4 * s)
        rig.part("all", pr, "#3A3F45", outline=0.0)
        if gear:
            g = Geo()
            for gx in (16, -4):
                g.capsule((gx * s, -2 * s, 8 * s), (gx * s, -2 * s, 3 * s), 0.6 * s)
                g.lathe([(0.01, -1), (2.2 * s, -1), (2.2 * s, 1), (0.01, 1)], (gx * s, -3 * s, 2.2 * s), (gx * s, -4 * s, 2.2 * s), segs=12)
            rig.part("all", g, "#3A3F45", outline=0.3)
    return build


def jet(body="#8C8E86", wing="#7C7E76", canopy="#4A5260", size=1.0, burner=False):
    """A swept-wing jet fighter in side view facing right, gear up (in flight)."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 8 * s), (20 * s, 2.8 * s, 2.8 * s), p=2.2, taper=(1.0, 0.85)), body, outline=0.5)
        rig.part("all", Geo().lathe([(0.01, 0), (2.8 * s, 0), (0.01, 8 * s)], (18 * s, 0, 8 * s), (27 * s, 0, 7.6 * s), segs=12),
                 body, outline=0.5)
        rig.part("all", Geo().blob((10 * s, -0.4 * s, 10.6 * s), (5 * s, 2.0 * s, 1.8 * s), p=2.2), canopy, finish="gloss", outline=0.3)
        rig.part("all", Geo().slab([(-4 * s, 7 * s), (8 * s, 7 * s), (-8 * s, 6.6 * s)], -3.6 * s, 7 * s), wing, outline=0.4)
        fin = Geo().slab([(-19 * s, 9 * s), (-11 * s, 9 * s), (-17 * s, 17 * s), (-21 * s, 17 * s)], 0, 1.0 * s)
        rig.part("all", fin, wing, outline=0.4)
        if burner:
            rig.part("all", Geo().blob((-23 * s, 0, 8 * s), (4 * s, 1.6 * s, 1.6 * s), p=2.0), glow="#F6E2B4", outline=0)
    return build


def truck(body="#7E8064", cab="#6E7258", tank="#8A8C74", size=1.0):
    """A fuel truck facing right: cab, a round tank, wheels."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((-4 * s, 0, 9 * s), (14 * s, 5 * s, 5 * s), p=2.4), tank, finish="metal", outline=0.5)
        g = Geo()
        box(g, (13 * s, 0, 8 * s), (4.6 * s, 4.8 * s, 5.4 * s), p=5.0)
        rig.part("all", g, cab, outline=0.5)
        rig.part("all", Geo().blob((15.4 * s, -2 * s, 10 * s), (2.4 * s, 2.6 * s, 2.0 * s), p=3.0), "#4A5058", finish="gloss", outline=0.2)
        g = Geo()
        box(g, (0, 0, 4 * s), (18 * s, 4.6 * s, 1.2 * s), p=5.0)
        rig.part("all", g, "#4A4E40", outline=0.3)
        w = Geo()
        for wx in (-14, -8, 13):
            w.lathe([(0.01, -1.2), (3.0 * s, -1.2), (3.0 * s, 1.2), (0.01, 1.2)], (wx * s, -4 * s, 3.0 * s), (wx * s, -5 * s, 3.0 * s), segs=14)
        rig.part("all", w, "#2E3034", outline=0.3)
    return build


def flying_car(body="#E2E4EA", trim="#3A3E48", light="#9CF0D4", size=1.0, tilt=0.0):
    """A hover car facing right (Future): a teardrop body with a dark canopy band and a mint underglow."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 5 * s), (11 * s, 4.4 * s, 3.4 * s), p=2.4, taper=(1.0, 0.8), rot=(0, tilt, 0)), body, finish="gloss",
                 outline=0.5)
        rig.part("all", Geo().blob((2 * s, -0.6 * s, 7.6 * s), (5.6 * s, 3.6 * s, 1.8 * s), p=2.4), trim, finish="gloss", outline=0.3)
        rig.part("all", Geo().blob((0, 0, 1.6 * s), (8 * s, 3.2 * s, 0.7 * s), p=2.0), glow=light, outline=0)
        rig.part("all", Geo().sphere((10.6 * s, -1.6 * s, 4.6 * s), 0.9 * s), glow="#F6F2E2", outline=0)
    return build


def train_car(body="#5A5E64", roof="#3E4248", window="#2E3036", size=1.0, length=18.0):
    """A carriage or wagon: a box body with a curved roof, windows, bogies."""
    def build(rig):
        s = size
        g = Geo()
        box(g, (0, 0, 8 * s), (length / 2 * s, 4.6 * s, 4.6 * s), p=5.0)
        rig.part("all", g, body, outline=0.5)
        rig.part("all", Geo().blob((0, 0, 12.8 * s), (length / 2 * s + 0.4, 4.8 * s, 1.4 * s), p=3.0), roof, outline=0.3)
        gw = Geo()
        n = max(2, int(length / 5))
        for k in range(n):
            wx = (-length / 2 + 2.6 + k * (length - 5.2) / max(1, n - 1)) * s
            box(gw, (wx, -4.6 * s, 9.4 * s), (1.4 * s, 0.4, 1.6 * s), p=4.0, cuts=1)
        rig.part("all", gw, window, outline=0.0, highlight=False)
        w = Geo()
        for wx in (-length / 2 + 3, length / 2 - 3):
            w.lathe([(0.01, -0.8), (2.4 * s, -0.8), (2.4 * s, 0.8), (0.01, 0.8)], (wx * s, -4.4 * s, 2.6 * s), (wx * s, -5.4 * s, 2.6 * s), segs=12)
        rig.part("all", w, "#2A2A2E", outline=0.3)
    return build


def steam_loco(boiler="#3A4A44", cab="#4A3A36", trim="#9A8A6A", size=1.0):
    """A tender engine facing right: a long boiler with a tall chimney and a steam dome, a cab, big
    driving wheels whose rods move (frames 0-1: `rod0` / `rod1`), a cowcatcher."""
    def build(rig):
        s = size
        rig.part("all", Geo().capsule((-6 * s, 0, 11 * s), (16 * s, 0, 11 * s), 5.0 * s), boiler, finish="metal", outline=0.5)
        rig.part("all", Geo().lathe([(0.01, 0), (5.2 * s, 0), (5.2 * s, 1.4 * s), (0.01, 1.4 * s)], (16.6 * s, 0, 11 * s), (18.0 * s, 0, 11 * s),
                                    segs=16), "#2E3034", outline=0.4)
        rig.part("all", Geo().capsule((13 * s, 0, 15 * s), (13.6 * s, 0, 23 * s), 1.8 * s, 2.6 * s), "#2E3034", outline=0.4)
        rig.part("all", Geo().sphere((4 * s, 0, 16.4 * s), 2.4 * s), trim, finish="bronze", outline=0.4)
        g = Geo()
        box(g, (-11 * s, 0, 13 * s), (5.4 * s, 5.0 * s, 7.2 * s), p=5.0)
        rig.part("all", g, cab, outline=0.5)
        rig.part("all", Geo().blob((-11 * s, 0, 20.6 * s), (6.6 * s, 5.8 * s, 1.3 * s), p=4.0), "#2E3034", outline=0.4)
        rig.part("all", Geo().blob((-11 * s, -5.1 * s, 15 * s), (2.6 * s, 0.4, 2.2 * s), p=4.0), "#2A2A30", outline=0.0, highlight=False)
        rig.part("all", Geo().slab([(18 * s, 6 * s), (23 * s, 1.6 * s), (18 * s, 1.6 * s)], -1.0 * s, 8 * s), "#5A3E36", outline=0.4)
        w = Geo()
        for wx, r in ((-6, 4.4), (3, 4.4), (12, 3.0)):
            w.lathe([(0.01, -0.9), (r * s, -0.9), (r * s, 0.9), (0.01, 0.9)], (wx * s, -5.2 * s, r * s), (wx * s, -6.2 * s, r * s), segs=16)
        rig.part("all", w, "#2A2A2E", outline=0.4)
        for k in range(2):
            rig.joint(f"rod{k}", "all", (0, 0, 0), hidden=True)
            g = Geo().capsule((-6 * s, -6.6 * s, (4.4 + (1.6 if k else -1.0)) * s), (3 * s, -6.6 * s, (4.4 + (-1.0 if k else 1.6)) * s), 0.6 * s)
            rig.part(f"rod{k}", g, "#B0A890", finish="metal", outline=0.0)
    return build


def tender(body="#3A4A44", coal="#2E2D31", size=1.0):
    def build(rig):
        s = size
        g = Geo()
        box(g, (0, 0, 9 * s), (8 * s, 4.8 * s, 4.6 * s), p=5.0)
        rig.part("all", g, body, outline=0.5)
        rig.part("all", Geo().blob((0, 0, 13.6 * s), (7.2 * s, 4.2 * s, 1.6 * s), p=2.4), coal, outline=0.3)
        w = Geo()
        for wx in (-4.6, 4.6):
            w.lathe([(0.01, -0.8), (2.8 * s, -0.8), (2.8 * s, 0.8), (0.01, 0.8)], (wx * s, -4.8 * s, 2.8 * s), (wx * s, -5.8 * s, 2.8 * s), segs=12)
        rig.part("all", w, "#2A2A2E", outline=0.3)
    return build


def asteroid(color="#6A6274", dark="#4E4858", size=1.0, seed=0):
    """A lumpy asteroid with a few craters (turns by frames)."""
    from world.common import rock

    def build(rig):
        s = size
        rig.joint("a", "all", (0, 0, 0))
        g = Geo()
        rock(g, (0, 0, 0), (9 * s, 7 * s, 7.4 * s), seed=seed, jag=0.22, p=2.1, cuts=4)
        rig.part("a", g, color, outline=0.5)
        cr = Geo()
        for (cx, cz, r) in ((2.6, 2.4, 1.8), (-3.4, -1.0, 1.4), (4.0, -2.6, 1.0)):
            cr.lathe([(0.01, 0), (r * s, 0), (r * s * 0.8, 0.5), (0.01, 0.5)], (cx * s, -6.4 * s, cz * s), (cx * s, -7.2 * s, cz * s), segs=12)
        rig.part("a", cr, dark, outline=0.0)
    return build


def cyl_ring(g, center, r, thick, width, axis_to=None, segs=32):
    """A flat ring (washer) about the z axis (or toward `axis_to`)."""
    x, y, z = center
    g.lathe([(r - width, -thick / 2), (r, -thick / 2), (r, thick / 2), (r - width, thick / 2)], (x, y, z),
            axis_to or (x, y, z + 1), segs=segs)
    return g


def aurochs(hide="#4E3E34", hide_dk="#3E3028", stripe="#8A7460", horn="#E6DCC6", muzzle="#B8A48C", size=1.0, graze=False):
    """An aurochs facing right: a deep, long body with a shoulder hump, a pale stripe along the back, a
    heavy head (lowered to graze with `graze`) with long lyre-shaped horns curving forward and up, a
    pale muzzle, a tasselled tail and four walking legs."""
    def build(rig):
        s = size
        for leg, (x, y) in {"lf": (9.5, -3.6), "lb": (-9.0, -3.6), "rf": (9.5, 3.6), "rb": (-9.0, 3.6)}.items():
            rig.joint(leg, "all", (x * s, y * s, 12 * s))
            g = Geo().capsule((x * s, y * s, 0.8 * s), (x * s, y * s, 12.5 * s), 1.9 * s, 2.6 * s)
            rig.part(leg, g, hide_dk if y > 0 else hide, outline=0.5)
            rig.part(leg, Geo().blob((x * s + 0.4 * s, y * s, 0.9 * s), (2.1 * s, 2.0 * s, 1.0 * s), p=2.6), "#2E2622", outline=0.3)
        rig.joint("body", "all", (0, 0, 13 * s))
        rig.part("body", Geo().blob((0, 0, 17 * s), (15 * s, 6.6 * s, 7.4 * s), p=2.3, taper=(0.92, 1.0)), hide, outline=0.6)
        rig.part("body", Geo().blob((7 * s, 0, 22 * s), (7.4 * s, 5.8 * s, 5.4 * s), p=2.2), hide, outline=0.5)
        rig.part("body", Geo().blob((0.6 * s, -0.4 * s, 24.3 * s), (11 * s, 1.6 * s, 1.0 * s), p=2.4), stripe, outline=0.0)
        rig.part("body", Geo().capsule((-14.6 * s, 0, 20 * s), (-16.4 * s, 0, 11 * s), 0.9 * s, 0.6 * s), hide_dk, outline=0.3)
        rig.part("body", Geo().blob((-16.6 * s, 0, 10 * s), (1.4 * s, 1.2 * s, 2.0 * s), p=2.0), hide_dk, outline=0.3)
        hz = 15.0 if graze else 21.0
        rig.joint("head", "body", (13 * s, 0, 21 * s))
        hx = 19.5 if graze else 18.5
        rig.part("head", Geo().blob((hx * s, 0, hz * s), (5.2 * s, 4.0 * s, 4.4 * s), p=2.2, rot=(0, 30 if graze else 12, 0)), hide, outline=0.6)
        rig.part("head", Geo().blob(((hx + 3.6) * s, -0.2 * s, (hz - 2.6) * s), (2.4 * s, 2.8 * s, 2.2 * s), p=2.2), muzzle, outline=0.4)
        rig.part("head", Geo().sphere(((hx + 1.6) * s, -3.3 * s, (hz + 1.4) * s), 0.7 * s), "#221C18", outline=0.0)
        for side in (-1, 1):
            tk = Geo()
            pts = [(hx - 1.0, hz + 3.0), (hx + 1.5, hz + 5.8), (hx + 5.0, hz + 7.0), (hx + 7.4, hz + 9.6)]
            for (ax, az), (bx, bz), ra in zip(pts, pts[1:], (1.1, 0.9, 0.7)):
                tk.capsule((ax * s, side * (3.2 + (ax - hx) * 0.15) * s, az * s), (bx * s, side * (3.6 + (bx - hx) * 0.15) * s, bz * s), ra * s, (ra - 0.25) * s)
            rig.part("head", tk, horn, outline=0.4)
    return build


def hunter(fur="#9A7A5C", fur_dk="#7E624A", skin="#C89A7A", hair="#4A3A30", spear="#6E5A48", tip="#9C968A", size=1.0, carry=False):
    """A Stone Age hunter walking right: fur tunic and leggings, a mop of hair, a spear over the shoulder
    (or a bundle of hides with `carry`). Legs on joints for a four-frame walk (`walker_pose`)."""
    def build(rig):
        s = size
        rig.joint("legF", "all", (0, 0, 10 * s))
        rig.joint("legB", "all", (0, 0, 10 * s))
        rig.joint("body", "all", (0, 0, 10 * s))
        rig.part("legB", Geo().capsule((0.4 * s, 1.6 * s, 0), (0.1 * s, 1.6 * s, 10 * s), 1.6 * s, 1.8 * s), fur_dk, outline=0.5)
        rig.part("legF", Geo().capsule((0.4 * s, -1.2 * s, 0), (0.1 * s, -1.2 * s, 10 * s), 1.6 * s, 1.8 * s), fur, outline=0.5)
        rig.part("body", Geo().lathe([(0.2, 0), (5.4 * s, 0), (5.8 * s, 3 * s), (4.6 * s, 9 * s), (3.6 * s, 14 * s), (0.2, 15 * s)], (0, 0, 7 * s), (0, 0, 22 * s),
                                     segs=12), fur, outline=0.6)
        rig.part("body", Geo().blob((0.6 * s, -0.4 * s, 25.8 * s), (3.4 * s, 3.2 * s, 3.6 * s), p=2.0), skin, outline=0.6)
        rig.part("body", Geo().blob((-0.6 * s, 0.2 * s, 27.6 * s), (3.8 * s, 3.4 * s, 2.6 * s), p=2.2), hair, outline=0.5)
        rig.part("body", Geo().capsule((1.2 * s, -3.2 * s, 18 * s), (3.6 * s, -3.4 * s, 13 * s), 1.2 * s), skin, outline=0.4)
        if carry:
            rig.part("body", Geo().blob((-3.4 * s, 1.2 * s, 21 * s), (4.2 * s, 2.6 * s, 3.2 * s), p=2.4, rot=(0, 20, 0)), "#B8A080", outline=0.5)
        else:
            rig.part("body", Geo().capsule((-7 * s, -2.6 * s, 13 * s), (11 * s, -2.6 * s, 25 * s), 0.55 * s), spear, outline=0.4)
            rig.part("body", Geo().lathe([(0.01, 0), (1.3 * s, 0), (0.01, 3.4 * s)], (11 * s, -2.6 * s, 25 * s), (13.8 * s, -2.6 * s, 26.9 * s), segs=8),
                     tip, outline=0.3)
    return build


def walker_pose(f):
    """Four walk frames for a two-legged walker (legs swing, the body bobs)."""
    a = [22, 0, -22, 0][f]
    bob = [0.0, 0.8, 0.0, 0.8][f]
    return {"legF": {"r": a, "z": bob}, "legB": {"r": -a, "z": bob}, "body": {"z": bob}}


# -- round 3: the Medieval classic ------------------------------------------------------------------
def swans(body="#EEEAE0", shade="#D8D2C6", beak="#C8904E", knob="#2E2A2C", size=1.0):
    """Two swans gliding right, one a little behind the other: boat-shaped bodies with raised wing
    coverts and S-curved necks."""
    def one(rig, dx, dy, s):
        rig.part("all", Geo().blob((dx, dy, 3.0 * s), (7.4 * s, 3.4 * s, 2.6 * s), p=2.4, taper=(1.0, 0.82)), body, outline=0.5)
        rig.part("all", Geo().blob((dx - 1.6 * s, dy, 5.2 * s), (5.4 * s, 2.8 * s, 2.3 * s), p=2.2, rot=(0, -10, 0)), shade, outline=0.4)
        rig.part("all", Geo().blob((dx - 6.6 * s, dy, 4.6 * s), (1.8 * s, 1.6 * s, 1.6 * s), p=2.0, rot=(0, 30, 0)), body, outline=0.3)
        pts = [(5.0, 4.4), (6.6, 7.6), (6.0, 10.8), (6.8, 13.0)]
        neck = Geo()
        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
            neck.capsule((dx + ax * s, dy, az * s), (dx + bx * s, dy, bz * s), 1.05 * s, 0.9 * s)
        rig.part("all", neck, body, outline=0.4)
        rig.part("all", Geo().blob((dx + 7.6 * s, dy, 13.3 * s), (1.7 * s, 1.2 * s, 1.25 * s), p=2.0), body, outline=0.4)
        rig.part("all", Geo().capsule((dx + 8.8 * s, dy, 13.0 * s), (dx + 10.6 * s, dy, 12.4 * s), 0.55 * s, 0.35 * s), beak, outline=0.2)
        rig.part("all", Geo().sphere((dx + 8.6 * s, dy - 0.6 * s, 13.4 * s), 0.45 * s), knob, outline=0.0)

    def build(rig):
        one(rig, 0.0, 0.0, size)
        one(rig, -15.0 * size, 6.0 * size, size * 0.92)
    return build


def horse_cart(coat="#7A5E48", coat_dk="#5E4838", mane="#3A2E28", wood="#7A6450", wood_dk="#5A4A3C", hay="#C2B07A", hay_dk="#A8955E",
               iron="#4A4440", coat2="#6E7A5E", skin="#D0A888", hat="#5E5040", size=1.0):
    """A horse pulling a two-wheeled hay cart to the right, the carter perched on the load: four walking
    legs (`walk4_pose`), a nodding head, and the near wheel on its own joint (`wh`) so it turns."""
    def build(rig):
        s = size
        for leg, (x, y) in {"lf": (9.0, -3.0), "lb": (-8.0, -3.0), "rf": (9.0, 3.0), "rb": (-8.0, 3.0)}.items():
            rig.joint(leg, "all", (x * s, y * s, 15 * s))
            rig.part(leg, Geo().capsule((x * s, y * s, 1.0 * s), (x * s, y * s, 15.5 * s), 1.3 * s, 2.0 * s), coat_dk if y > 0 else coat, outline=0.5)
            rig.part(leg, Geo().blob((x * s + 0.3 * s, y * s, 1.0 * s), (1.6 * s, 1.5 * s, 1.0 * s), p=2.6), "#2E2622", outline=0.3)
        rig.joint("body", "all", (0, 0, 16 * s))
        rig.part("body", Geo().blob((0.5 * s, 0, 19.5 * s), (12.5 * s, 4.8 * s, 5.4 * s), p=2.3), coat, outline=0.6)
        rig.part("body", Geo().capsule((-12 * s, 0, 22 * s), (-14.5 * s, 0, 12 * s), 1.4 * s, 0.9 * s), mane, outline=0.3)
        # the harness: a collar and a strap back to the shafts
        rig.part("body", Geo().blob((9.6 * s, 0, 22.5 * s), (2.0 * s, 4.6 * s, 4.4 * s), p=2.2, rot=(0, -20, 0)), "#4E3E34", outline=0.4)
        rig.joint("head", "body", (11 * s, 0, 24 * s))
        neck = Geo().capsule((10 * s, 0, 23 * s), (15.5 * s, 0, 31 * s), 3.2 * s, 2.4 * s)
        rig.part("head", neck, coat, outline=0.5)
        rig.part("head", Geo().capsule((9.0 * s, 0, 26 * s), (14.4 * s, 0, 33.6 * s), 1.0 * s, 0.8 * s), mane, outline=0.3)
        rig.part("head", Geo().blob((18.6 * s, 0, 30 * s), (4.6 * s, 2.2 * s, 2.2 * s), p=2.2, rot=(0, 36, 0), taper=(1.0, 0.7)), coat, outline=0.5)
        rig.part("head", Geo().blob((15.6 * s, 0, 34.0 * s), (0.8 * s, 0.6 * s, 1.6 * s), p=2.0), coat_dk, outline=0.2)
        # the cart: shafts, a plank bed on its axle, the hay load and the carter on top
        g = Geo()
        for side in (-1, 1):
            g.capsule((10 * s, side * 4.6 * s, 18.5 * s), (-20 * s, side * 5.2 * s, 15.5 * s), 0.6 * s)
        rig.part("all", g, wood_dk, outline=0.3)
        rig.part("all", box_geo((-31 * s, 0, 15.5 * s), (11.5 * s, 6.2 * s, 2.4 * s)), wood, outline=0.5)
        rig.part("all", box_geo((-31 * s, -6.0 * s, 19.0 * s), (11.5 * s, 0.6 * s, 1.6 * s)), wood_dk, outline=0.3)
        rig.part("all", Geo().blob((-31 * s, 0, 23.5 * s), (12.5 * s, 6.0 * s, 6.4 * s), p=2.2, taper=(1.0, 0.86)), hay, outline=0.5)
        rig.part("all", Geo().blob((-28 * s, -1 * s, 28.0 * s), (7.0 * s, 4.6 * s, 3.2 * s), p=2.2), hay_dk, outline=0.3)
        # the carter: a coat, a face and a broad hat, holding the reins
        rig.part("all", Geo().lathe([(0.2, 0), (3.6 * s, 0), (3.2 * s, 4 * s), (2.4 * s, 8 * s), (0.2, 8.6 * s)], (-24 * s, -1 * s, 27 * s), (-24 * s, -1 * s, 35.6 * s),
                                    segs=12), coat2, outline=0.5)
        rig.part("all", Geo().blob((-23.6 * s, -1.4 * s, 37.6 * s), (2.2 * s, 2.0 * s, 2.3 * s), p=2.0), skin, outline=0.4)
        rig.part("all", Geo().lathe([(0.01, 0), (4.0 * s, 0), (3.8 * s, 0.5 * s), (1.9 * s, 0.8 * s), (1.8 * s, 2.6 * s), (0.01, 2.8 * s)], (-23.6 * s, -1.4 * s, 38.8 * s),
                                    (-23.6 * s, -1.4 * s, 41.6 * s), segs=14), hat, outline=0.4)
        rig.part("all", Geo().capsule((-21 * s, -3.6 * s, 31 * s), (9 * s, -3.6 * s, 24 * s), 0.25 * s), "#3A302A", outline=0.0)
        # the near wheel: rim, hub and spokes on its joint
        rig.joint("wh", "all", (-31 * s, -7.6 * s, 8.6 * s))
        w = Geo()
        cyl_ring(w, (-31 * s, -7.6 * s, 8.6 * s), 8.4 * s, 1.6 * s, 1.5 * s, axis_to=(-31 * s, -8.6 * s, 8.6 * s), segs=28)
        rig.part("wh", w, wood_dk, outline=0.4)
        sp = Geo()
        for k in range(6):
            a = math.pi * k / 3
            sp.capsule((-31 * s, -7.6 * s, 8.6 * s), (-31 * s + math.cos(a) * 7.4 * s, -7.6 * s, 8.6 * s + math.sin(a) * 7.4 * s), 0.55 * s)
        rig.part("wh", sp, wood, outline=0.2)
        rig.part("wh", Geo().sphere((-31 * s, -8.2 * s, 8.6 * s), 1.5 * s), iron, outline=0.2)
    return build


def box_geo(c, r):
    """A rounded box as its own Geo (for rig parts)."""
    return Geo().blob(c, r, p=6.0, cuts=2)


# -- round 3: the Gunpowder classic -----------------------------------------------------------------
def frigate(hull="#4A3B2E", hull_lt="#6A5642", band="#D8CCAE", port="#2E2A28", sail="#E6DCC4", sail_dk="#CFC4AA", flag="#2E5E4E", size=1.0):
    """A three-masted ship under sail facing right (Gunpowder): a dark hull with a pale gun-deck band and its
    row of ports, a raised stern castle and a bowsprit, square sails billowing on the fore and main masts,
    a lateen-rigged mizzen, a jib, and a long pennant at the main truck."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 6 * s), (34 * s, 6.4 * s, 5.6 * s), p=3.0, taper=(0.72, 1.0)), hull, outline=0.6)
        rig.part("all", Geo().blob((-2 * s, -0.4 * s, 9.6 * s), (33 * s, 6.0 * s, 1.6 * s), p=3.2), band, outline=0.3)
        ports = Geo()
        for k in range(9):
            ports.blob(((-24 + k * 6) * s, -6.4 * s, 9.6 * s), (1.1 * s, 0.4 * s, 0.9 * s), p=4.0, cuts=1)
        rig.part("all", ports, port, outline=0.0)
        rig.part("all", Geo().blob((-27 * s, 0, 14 * s), (9 * s, 5.6 * s, 4.4 * s), p=4.0), hull_lt, outline=0.5)
        rig.part("all", Geo().blob((-34.6 * s, -0.4 * s, 13 * s), (1.4 * s, 4.6 * s, 3.6 * s), p=3.0), band, outline=0.3)
        rig.part("all", Geo().capsule((32 * s, 0, 10 * s), (48 * s, 0, 16 * s), 0.8 * s, 0.5 * s), "#3A3028", outline=0.3)
        mast = Geo()
        for x, h in ((16, 50), (-2, 60), (-21, 44)):
            mast.capsule((x * s, 0, 9 * s), (x * s, 0, (9 + h) * s), 0.9 * s, 0.6 * s)
        rig.part("all", mast, "#3A3028", outline=0.3)
        sails = Geo()
        shade = Geo()
        for x, h, w in ((16, 50, 11), (-2, 60, 13)):
            for k, (z0, z1, ww) in enumerate(((0.28, 0.56, 1.0), (0.6, 0.84, 0.84), (0.87, 0.98, 0.6))):
                zb, zt = (9 + h * z0) * s, (9 + h * z1) * s
                wx = w * ww * s
                # a square sail bellied forward: a thin rounded slab, a shaded belly band
                sails.blob((x * s + 1.2 * s, -1.2 * s, (zb + zt) / 2), (wx, 1.4 * s, (zt - zb) / 2), p=3.4, cuts=2)
                shade.blob((x * s + 1.6 * s, -2.4 * s, zb + (zt - zb) * 0.32), (wx * 0.92, 0.6 * s, (zt - zb) * 0.16), p=3.0, cuts=1)
        rig.part("all", sails, sail, outline=0.5)
        rig.part("all", shade, sail_dk, outline=0.0)
        rig.part("all", Geo().slab([(-21 * s, 16 * s), (-8 * s, 18 * s), (-21 * s, 50 * s)], -0.8 * s, 0.9 * s), sail, outline=0.5)
        rig.part("all", Geo().slab([(20 * s, 14 * s), (46 * s, 16 * s), (20 * s, 54 * s)], -0.8 * s, 0.9 * s), sail, outline=0.5)
        rig.part("all", Geo().slab([(-2 * s, 69 * s), (14 * s, 67.6 * s), (-2 * s, 66.4 * s)], 0, 0.6 * s), flag, outline=0.2)
    return build


def flag_frames(colour="#2E5E4E", stripe=None, length=18.0, width=10.0, pole=0.0, tail=False):
    """A flag on its pole, four waving outlines on hidden joints (one per frame): a rectangle (with a
    pale horizontal `stripe` across it if given) or, with `tail`, a swallow-tailed pennant. Poses:
    `[{f"f{i}": {"show": True}} for i in range(4)]`."""
    def outline(f, inset=0.0):
        top, bot = [], []
        n = 9
        for k in range(n + 1):
            u = k / n
            wv = math.sin(2 * math.pi * (u * 1.1 - f / 4)) * (0.5 + width * 0.22 * u)
            half = width / 2 * (1 - (0.35 if tail else 0.08) * u) - inset
            x = u * length * (1 - 0.05 * abs(math.sin(math.pi * f / 2)))
            top.append((x, pole + width / 2 + wv + half))
            bot.append((x, pole + width / 2 + wv - half))
        if tail:
            return top + [(top[-1][0] - width * 0.9, (top[-1][1] + bot[-1][1]) / 2)] + list(reversed(bot))
        return top + list(reversed(bot))

    def build(rig):
        rig.part("all", Geo().capsule((0, 0, 0), (0, 0, pole + width + 1), 0.5), "#5E5040", outline=0.3)
        rig.part("all", Geo().sphere((0, 0, pole + width + 1.4), 0.9), "#C9A227", outline=0.2)
        for f in range(4):
            j = rig.joint(f"f{f}", "all", (0, 0, 0), hidden=True)
            rig.part(j, Geo().slab(outline(f), 0, 0.6), colour, outline=0.3)
            if stripe:
                pts = outline(f, inset=width * 0.36)
                rig.part(j, Geo().slab(pts, -0.4, 0.4), stripe, outline=0.0)
    return build


# -- round 3: the Modern classic --------------------------------------------------------------------
def car(body="#7E8670", roof=None, window="#3E4450", size=1.0):
    """A mid-century sedan facing right: a long rounded body, a glasshouse, round wheels."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 3.4 * s), (8.6 * s, 3.4 * s, 1.9 * s), p=3.2), body, outline=0.5)
        rig.part("all", Geo().blob((-0.8 * s, 0, 5.6 * s), (4.8 * s, 3.0 * s, 1.6 * s), p=2.8, taper=(1.0, 0.8)), roof or body, outline=0.4)
        rig.part("all", Geo().blob((-0.6 * s, -1.4 * s, 5.6 * s), (4.0 * s, 1.8 * s, 1.0 * s), p=3.0), window, outline=0.0)
        w = Geo()
        for wx in (-5.2, 5.0):
            w.lathe([(0.01, -0.8), (1.7 * s, -0.8), (1.7 * s, 0.8), (0.01, 0.8)], (wx * s, -2.8 * s, 1.7 * s), (wx * s, -3.6 * s, 1.7 * s), segs=12)
        rig.part("all", w, "#2A2A2E", outline=0.3)
    return build


def bus(body="#B8A67A", stripe="#62664A", window="#3E4450", size=1.0):
    """A city bus facing right: a long box with a rounded front, a window band, a stripe, wheels."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 5.4 * s), (13 * s, 3.8 * s, 4.0 * s), p=4.0), body, outline=0.5)
        rig.part("all", Geo().blob((0, -0.4 * s, 6.8 * s), (12.4 * s, 3.6 * s, 1.3 * s), p=4.0), window, outline=0.0)
        rig.part("all", Geo().blob((0, -0.3 * s, 3.4 * s), (12.8 * s, 3.7 * s, 0.6 * s), p=4.0), stripe, outline=0.0)
        w = Geo()
        for wx in (-8.4, 8.2):
            w.lathe([(0.01, -0.8), (2.0 * s, -0.8), (2.0 * s, 0.8), (0.01, 0.8)], (wx * s, -3.2 * s, 2.0 * s), (wx * s, -4.0 * s, 2.0 * s), segs=12)
        rig.part("all", w, "#2A2A2E", outline=0.3)
    return build


def tug(hull="#3A3F45", deck="#62664A", house="#D8D0BC", stack="#3A3F45", band="#B0306A", size=1.0):
    """A river tug facing right: a low dark hull with a fender, a pale deckhouse with a wheelhouse, a
    funnel with a red-violet band, a mast."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 3.4 * s), (15 * s, 4.6 * s, 3.2 * s), p=3.0, taper=(0.8, 1.0)), hull, outline=0.5)
        rig.part("all", Geo().blob((0, -0.3 * s, 6.0 * s), (14.4 * s, 4.3 * s, 0.8 * s), p=3.0), deck, outline=0.3)
        rig.part("all", box_geo((-1 * s, 0, 9.0 * s), (6.4 * s, 3.4 * s, 2.6 * s)), house, outline=0.4)
        rig.part("all", box_geo((2 * s, 0, 13.0 * s), (3.4 * s, 3.0 * s, 1.8 * s)), house, outline=0.4)
        rig.part("all", Geo().blob((2.6 * s, -1.6 * s, 13.2 * s), (2.6 * s, 1.6 * s, 0.8 * s), p=3.0), "#3E4450", outline=0.0)
        rig.part("all", Geo().capsule((-5 * s, 0, 11 * s), (-5.6 * s, 0, 18 * s), 1.6 * s, 1.4 * s), stack, outline=0.4)
        rig.part("all", Geo().capsule((-5.3 * s, -0.2 * s, 15 * s), (-5.4 * s, -0.2 * s, 16.4 * s), 1.65 * s, 1.5 * s), band, outline=0.0)
        rig.part("all", Geo().capsule((4 * s, 0, 14.8 * s), (4 * s, 0, 22 * s), 0.35 * s), "#3A3A3E", outline=0.2)
        rig.part("all", Geo().capsule((14 * s, -0.4 * s, 3.6 * s), (16 * s, -0.4 * s, 4.6 * s), 1.4 * s), "#2E2E30", outline=0.2)
    return build


def diesel_loco(body="#62664A", stripe="#B8A67A", cab="#3E4450", size=1.0, length=26.0):
    """A diesel locomotive facing right: a long hood with a rounded nose, a cab window band, a pale
    stripe, two bogies."""
    def build(rig):
        s = size
        L = length
        rig.part("all", Geo().blob((0, 0, 8 * s), (L / 2 * s, 4.6 * s, 5.0 * s), p=4.0, taper=(1.0, 0.92)), body, outline=0.5)
        rig.part("all", Geo().blob((L / 2 * s - 1.5 * s, -0.4 * s, 10.4 * s), (2.6 * s, 4.0 * s, 1.4 * s), p=3.0), cab, outline=0.0)
        rig.part("all", Geo().blob((0, -0.3 * s, 6.0 * s), (L / 2 * s - 0.4, 4.4 * s, 0.6 * s), p=4.0), stripe, outline=0.0)
        w = Geo()
        for wx in (-L / 2 + 4, -L / 2 + 8, L / 2 - 8, L / 2 - 4):
            w.lathe([(0.01, -0.8), (2.0 * s, -0.8), (2.0 * s, 0.8), (0.01, 0.8)], (wx * s, -4.4 * s, 2.2 * s), (wx * s, -5.2 * s, 2.2 * s), segs=12)
        rig.part("all", w, "#2A2A2E", outline=0.3)
    return build


# -- round 3: the Future classic --------------------------------------------------------------------
def monorail_car(body="#E4E6EE", window="#3A3E48", glow="#9CF0D4", size=1.0, length=30.0, nose=True):
    """A monorail car facing right: a long rounded capsule body (a pointed nose with `nose`), a dark window
    band with a mint light line under it, the beam clamp below."""
    def build(rig):
        s = size
        L = length
        rig.part("all", Geo().blob((0, 0, 7 * s), (L / 2 * s, 4.4 * s, 4.2 * s), p=3.2 if not nose else 2.6, taper=(1.0, 0.92)), body, finish="gloss", outline=0.5)
        rig.part("all", Geo().blob((0, -0.6 * s, 8.4 * s), (L / 2 * s - 2 * s, 3.9 * s, 1.4 * s), p=3.4), window, finish="gloss", outline=0.0)
        rig.part("all", Geo().blob((0, -0.8 * s, 6.0 * s), (L / 2 * s - 2.4 * s, 3.8 * s, 0.35 * s), p=3.4), glow=glow, outline=0)
        rig.part("all", Geo().blob((0, 0, 2.0 * s), (L / 2 * s - 4 * s, 2.4 * s, 1.6 * s), p=4.0), "#5A5E68", outline=0.3)
    return build


def jeep(body="#6E7258", dark="#3A3F45", size=1.0):
    """A field jeep facing right: a boxy body with a flat bonnet, a fold-down screen, a spare wheel, wheels."""
    def build(rig):
        s = size
        rig.part("all", box_geo((0, 0, 4.6 * s), (7.6 * s, 3.6 * s, 2.0 * s)), body, outline=0.5)
        rig.part("all", box_geo((4.6 * s, 0, 6.4 * s), (3.2 * s, 3.4 * s, 0.6 * s)), body, outline=0.4)
        rig.part("all", Geo().capsule((2.2 * s, -3.2 * s, 6.6 * s), (2.6 * s, -3.2 * s, 10.0 * s), 0.35 * s), dark, outline=0.2)
        rig.part("all", Geo().capsule((2.2 * s, 3.2 * s, 6.6 * s), (2.6 * s, 3.2 * s, 10.0 * s), 0.35 * s), dark, outline=0.2)
        rig.part("all", Geo().capsule((2.4 * s, -3.2 * s, 10.0 * s), (2.4 * s, 3.2 * s, 10.0 * s), 0.35 * s), dark, outline=0.2)
        w = Geo()
        for wx in (-4.8, 4.6):
            w.lathe([(0.01, -0.9), (2.1 * s, -0.9), (2.1 * s, 0.9), (0.01, 0.9)], (wx * s, -3.4 * s, 2.1 * s), (wx * s, -4.3 * s, 2.1 * s), segs=12)
        w.lathe([(0.01, -0.8), (1.9 * s, -0.8), (1.9 * s, 0.8), (0.01, 0.8)], (-8.4 * s, 0, 5.0 * s), (-9.4 * s, 0, 5.0 * s), segs=12)
        rig.part("all", w, "#2A2A2E", outline=0.3)
    return build


# -- round 3: Sabre Savanna (Stone, Epic) ---------------------------------------------------------
def sabretooth(coat="#C09A6A", coat_dk="#9C7A52", belly="#E2CFA8", fang="#F2EAD8", spots="#8A6A48", size=1.0):
    """A sabre-tooth cat lying on its rock, facing left toward the lane: a heavy forequarter, a short tail
    on its own joint (`tail`, it flicks), a broad head with the two long fangs, a few dark spots."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((2 * s, 0, 6 * s), (12 * s, 5.4 * s, 4.6 * s), p=2.2, taper=(1.0, 0.92)), coat, outline=0.6)
        rig.part("all", Geo().blob((-6 * s, 0, 8.4 * s), (6.4 * s, 5.6 * s, 5.6 * s), p=2.2), coat, outline=0.5)
        rig.part("all", Geo().blob((1 * s, -1.2 * s, 3.4 * s), (10 * s, 4.0 * s, 1.8 * s), p=2.4), belly, outline=0.3)
        for k, (x, z) in enumerate(((4, 9.2), (8, 8.0), (0, 10.0), (11, 7.0))):
            rig.part("all", Geo().blob((x * s, -4.6 * s, z * s), (1.1 * s, 0.5 * s, 0.9 * s), p=2.0), spots, outline=0.0)
        # forelegs stretched out in front, paws
        for side in (-1.8, 1.8):
            rig.part("all", Geo().capsule((-8 * s, side * s, 4 * s), (-16 * s, side * s, 2.2 * s), 1.9 * s, 1.6 * s), coat_dk if side > 0 else coat, outline=0.5)
            rig.part("all", Geo().blob((-17 * s, side * s, 1.8 * s), (2.2 * s, 1.7 * s, 1.3 * s), p=2.4), coat, outline=0.4)
        rig.part("all", Geo().capsule((12 * s, 2 * s, 3 * s), (8 * s, 3 * s, 1.6 * s), 2.4 * s, 1.8 * s), coat_dk, outline=0.4)
        # the head, raised and alert, the fangs down past the jaw
        rig.part("all", Geo().blob((-12.5 * s, 0, 13.4 * s), (4.6 * s, 4.2 * s, 3.8 * s), p=2.2), coat, outline=0.6)
        rig.part("all", Geo().blob((-16 * s, -0.4 * s, 12.2 * s), (2.6 * s, 2.8 * s, 2.0 * s), p=2.2), belly, outline=0.4)
        for side in (-1, 1):
            rig.part("all", Geo().blob((-11 * s, side * 3.0 * s, 17 * s), (1.2 * s, 0.8 * s, 1.6 * s), p=2.0), coat_dk, outline=0.3)
            rig.part("all", Geo().lathe([(0.01, 0), (0.7 * s, 0), (0.01, 4.6 * s)], (-16.4 * s, side * 1.2 * s, 11.2 * s), (-16.8 * s, side * 1.2 * s, 6.6 * s), segs=8),
                     fang, outline=0.3)
        rig.part("all", Geo().sphere((-14.6 * s, -3.4 * s, 14.4 * s), 0.6 * s), "#2A2420", outline=0.0)
        rig.joint("tail", "all", (13 * s, 0, 7 * s))
        rig.part("tail", Geo().capsule((13 * s, 0, 7 * s), (18 * s, 0, 5.6 * s), 1.2 * s, 0.9 * s), coat_dk, outline=0.4)
    return build


def giant_deer(coat="#8E6E52", coat_dk="#6E5440", belly="#C8B090", antler="#D8C8A8", size=1.0, graze=False):
    """A giant deer (Megaloceros) facing right: a long-legged deer body with a shoulder hump and the huge
    palmate antlers, walking (`walk4_pose`) or grazing with its head down."""
    def build(rig):
        s = size
        for leg, (x, y) in {"lf": (8.5, -2.6), "lb": (-8.0, -2.6), "rf": (8.5, 2.6), "rb": (-8.0, 2.6)}.items():
            rig.joint(leg, "all", (x * s, y * s, 17 * s))
            rig.part(leg, Geo().capsule((x * s, y * s, 0.8 * s), (x * s, y * s, 17.5 * s), 0.9 * s, 1.7 * s), coat_dk if y > 0 else coat, outline=0.5)
            rig.part(leg, Geo().blob((x * s, y * s, 0.8 * s), (1.1 * s, 1.0 * s, 0.7 * s), p=2.6), "#2E2622", outline=0.3)
        rig.joint("body", "all", (0, 0, 18 * s))
        rig.part("body", Geo().blob((0, 0, 21 * s), (12 * s, 4.6 * s, 5.0 * s), p=2.2), coat, outline=0.6)
        rig.part("body", Geo().blob((6 * s, 0, 25 * s), (5.6 * s, 4.4 * s, 4.2 * s), p=2.2), coat, outline=0.5)
        rig.part("body", Geo().blob((0, -0.6 * s, 17.6 * s), (9 * s, 3.8 * s, 1.8 * s), p=2.4), belly, outline=0.3)
        rig.part("body", Geo().blob((-12 * s, 0, 23 * s), (1.6 * s, 1.2 * s, 2.0 * s), p=2.0), belly, outline=0.3)
        rig.joint("head", "body", (10 * s, 0, 25 * s))
        hz = 14.0 if graze else 31.0
        hx = 17.0 if graze else 15.0
        rig.part("head", Geo().capsule((9 * s, 0, 25 * s), (hx * s, 0, (hz + 1) * s), 2.6 * s, 1.8 * s), coat, outline=0.5)
        rig.part("head", Geo().blob(((hx + 2.6) * s, 0, hz * s), (3.4 * s, 1.8 * s, 1.8 * s), p=2.2, rot=(0, 30, 0)), coat, outline=0.5)
        for side in (-1, 1):
            g = Geo()
            base = ((hx + 0.6) * s, side * 1.4 * s, (hz + 1.8) * s)
            tip = ((hx - 4) * s, side * 6 * s, (hz + 8) * s)
            g.capsule(base, tip, 0.6 * s, 0.5 * s)
            g.blob(((hx - 7) * s, side * 8 * s, (hz + 10) * s), (5.6 * s, 1.0 * s, 3.4 * s), p=2.4, rot=(0, -20, side * 20))
            for k in range(4):
                g.capsule(((hx - 9 + k * 2.2) * s, side * 8.4 * s, (hz + 12.6) * s), ((hx - 10 + k * 2.8) * s, side * 8.6 * s, (hz + 15.6 + k * 0.4) * s), 0.4 * s, 0.25 * s)
            rig.part("head", g, antler, outline=0.4)
    return build


def dust_devil(i, w=46, h=150, color=(0.86, 0.78, 0.62)):
    """A dust devil (PaintedProp frame i of 4): a soft twisting funnel of dust, wide and faint at the top,
    a dense swirl at the foot, the twist advancing a quarter turn per frame."""
    import numpy as np
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    v = 1.0 - yy / (h - 1)                      # 0 at the foot, 1 at the top
    width = 0.12 + 0.36 * v ** 1.3
    sway = 0.06 * np.sin(v * 5.0 + i * 1.57)
    u = (xx / (w - 1) - 0.5 - sway) / np.maximum(0.02, width)
    body = np.clip(1.0 - np.abs(u), 0, 1) ** 1.4
    bands = 0.6 + 0.4 * np.sin(v * 22.0 - i * 1.57 + u * 2.4)
    a = body * bands * (0.35 + 0.65 * (1 - v)) * np.clip(v * 8, 0, 1) * np.clip((1 - v) * 3 + 0.2, 0, 1)
    out = np.zeros((h, w, 4), np.float32)
    out[..., 0], out[..., 1], out[..., 2] = color
    out[..., 3] = np.clip(a * 0.62, 0, 1)
    return out


def chariot(coat="#8A6A50", coat_dk="#6E543E", mane="#3A2E28", wood="#8A7258", wood_dk="#6A5644", bronze="#A88A5A", skin="#C89A7A",
            tunic="#D8CCB2", tunic2="#9A8A72", crest="#7A3A3A", size=1.0):
    """A Bronze Age war chariot racing right: a pair of horses side by side (four legs each, on the shared
    walk joints so `walk4_pose` gallops both), a light car with a curved front screen and a six-spoked
    wheel on its own joint (`wh`), the driver with the reins and a spearman in a crested helmet behind him."""
    def build(rig):
        s = size
        for leg, (x, y) in {"lf": (10.0, -3.0), "lb": (-7.0, -3.0), "rf": (10.0, 3.0), "rb": (-7.0, 3.0)}.items():
            rig.joint(leg, "all", (x * s, y * s, 15 * s))
            for dy, c in ((-4.2, coat), (4.2, coat_dk)):
                rig.part(leg, Geo().capsule((x * s, (y + dy) * s, 1.0 * s), (x * s, (y + dy) * s, 15.5 * s), 1.2 * s, 1.9 * s), c if y < 0 else coat_dk,
                         outline=0.5)
        rig.joint("body", "all", (0, 0, 16 * s))
        for dy, c in ((4.6, coat_dk), (-4.6, coat)):
            rig.part("body", Geo().blob((1.5 * s, dy * s, 19.5 * s), (12 * s, 4.0 * s, 5.0 * s), p=2.3), c, outline=0.6)
            rig.part("body", Geo().capsule((-10.5 * s, dy * s, 22 * s), (-13.5 * s, dy * s, 13 * s), 1.2 * s, 0.8 * s), mane, outline=0.3)
        rig.joint("head", "body", (11 * s, 0, 24 * s))
        for dy, c in ((4.6, coat_dk), (-4.6, coat)):
            rig.part("head", Geo().capsule((10 * s, dy * s, 23 * s), (15.5 * s, dy * s, 31 * s), 3.0 * s, 2.2 * s), c, outline=0.5)
            rig.part("head", Geo().capsule((9.4 * s, dy * s, 26 * s), (14.6 * s, dy * s, 33.6 * s), 0.9 * s, 0.7 * s), mane, outline=0.3)
            rig.part("head", Geo().blob((18.6 * s, dy * s, 30 * s), (4.4 * s, 2.0 * s, 2.0 * s), p=2.2, rot=(0, 36, 0), taper=(1.0, 0.7)), c, outline=0.5)
            rig.part("head", Geo().blob((14.4 * s, dy * s, 36.0 * s), (1.2 * s, 0.5 * s, 2.0 * s), p=2.0), crest, outline=0.2)
        # the pole and the yoke, the car (a curved screen on a floor), the reins
        g = Geo()
        g.capsule((12 * s, 0, 23 * s), (-22 * s, 0, 13 * s), 0.7 * s)
        g.capsule((10 * s, -6 * s, 24 * s), (10 * s, 6 * s, 24 * s), 0.8 * s)
        rig.part("all", g, wood_dk, outline=0.3)
        rig.part("all", box_geo((-27 * s, 0, 12.5 * s), (6.5 * s, 5.4 * s, 1.0 * s)), wood_dk, outline=0.4)
        rig.part("all", Geo().lathe([(0.01, 0), (6.4 * s, 0), (6.6 * s, 7.6 * s), (0.01, 8.2 * s)], (-26 * s, 0, 13 * s), (-26 * s, 0, 22 * s), segs=16,
                                    squash=(1.0, 0.9)), wood, outline=0.5)
        rig.part("all", Geo().capsule((-21 * s, -5 * s, 20.6 * s), (-21 * s, 5 * s, 20.6 * s), 0.7 * s), bronze, outline=0.2)
        # the driver (front) and the spearman (back)
        for (x, c, tall) in ((-23.0, tunic, 0.0), (-29.5, tunic2, 1.6)):
            rig.part("all", Geo().lathe([(0.2, 0), (2.8 * s, 0), (2.5 * s, 6 * s), (2.0 * s, 9 * s), (0.2, 9.6 * s)], (x * s, -0.6 * s, 20 * s),
                                        (x * s, -0.6 * s, 30 * s), segs=12), c, outline=0.5)
            rig.part("all", Geo().blob((x * s + 0.3 * s, -0.8 * s, (31.6 + tall * 0.2) * s), (1.9 * s, 1.8 * s, 2.0 * s), p=2.0), skin, outline=0.4)
            rig.part("all", Geo().blob((x * s, -0.8 * s, (32.8 + tall * 0.2) * s), (2.1 * s, 2.0 * s, 1.3 * s), p=2.2), bronze, outline=0.3)
        rig.part("all", Geo().blob((-29.5 * s, -0.8 * s, 35.4 * s), (2.6 * s, 0.6 * s, 1.0 * s), p=2.2), crest, outline=0.2)
        rig.part("all", Geo().capsule((-31 * s, -2.8 * s, 24 * s), (-27 * s, -2.8 * s, 46 * s), 0.3 * s), wood_dk, outline=0.0)
        rig.part("all", Geo().blob((-26.8 * s, -2.8 * s, 47.6 * s), (0.6 * s, 0.3 * s, 1.8 * s), p=2.2), bronze, outline=0.0)
        rig.part("all", Geo().capsule((-21 * s, -3.0 * s, 26 * s), (13 * s, -3.0 * s, 25 * s), 0.22 * s), "#3A302A", outline=0.0)
        # the near wheel: rim, hub and six spokes on its joint
        rig.joint("wh", "all", (-26 * s, -6.6 * s, 7.6 * s))
        w = Geo()
        cyl_ring(w, (-26 * s, -6.6 * s, 7.6 * s), 7.4 * s, 1.4 * s, 1.3 * s, axis_to=(-26 * s, -7.6 * s, 7.6 * s), segs=28)
        rig.part("wh", w, wood_dk, outline=0.4)
        sp = Geo()
        for k in range(6):
            a = math.pi * k / 3
            sp.capsule((-26 * s, -6.6 * s, 7.6 * s), (-26 * s + math.cos(a) * 6.4 * s, -6.6 * s, 7.6 * s + math.sin(a) * 6.4 * s), 0.45 * s)
        rig.part("wh", sp, wood, outline=0.2)
        rig.part("wh", Geo().sphere((-26 * s, -7.2 * s, 7.6 * s), 1.3 * s), bronze, outline=0.2)
    return build


def wooden_horse(wood="#8A7258", wood_dk="#6E5A46", wood_lt="#A08A70", iron="#5A5450", size=1.0):
    """The giant wooden horse (Siege of the Bronze City): a plank body on four post legs, a tall neck and
    a blocky head with a ridged mane and ears, a rope tail, plank seams and bands, standing on a wheeled
    platform; facing right. Static (drawn with `kit.StaticRig`)."""
    def build(rig):
        s = size
        # the platform and its wheels
        rig.part("all", box_geo((0, 0, 7 * s), (34 * s, 14 * s, 3.0 * s)), wood_dk, outline=0.6)
        for x in (-24, 24):
            for y in (-14.5, 14.5):
                w = Geo()
                cyl_ring(w, (x * s, y * s, 6 * s), 6 * s, 2.4 * s, 6 * s * 0.98, axis_to=(x * s, (y - 1) * s, 6 * s), segs=20)
                rig.part("all", w, wood if y < 0 else wood_dk, outline=0.5)
                rig.part("all", Geo().sphere((x * s, (y - 1.3) * s, 6 * s), 1.4 * s), iron, outline=0.2)
        # the legs: square posts with knees
        for (x, y) in ((-20, -7), (-20, 7), (20, -7), (20, 7)):
            c = wood if y < 0 else wood_dk
            rig.part("all", box_geo((x * s, y * s, 26 * s), (3.4 * s, 3.4 * s, 16 * s)), c, outline=0.5)
            rig.part("all", box_geo((x * s, y * s, 26 * s), (4.0 * s, 4.0 * s, 1.4 * s)), wood_dk, outline=0.3)
        # the body: a long plank barrel, seams and iron bands
        rig.part("all", Geo().blob((0, 0, 52 * s), (31 * s, 11 * s, 12 * s), p=3.0), wood, outline=0.7)
        seams = Geo()
        for k in range(5):
            z = (44 + k * 4.2) * s
            seams.capsule((-28 * s, -10.6 * s, z), (28 * s, -10.6 * s, z), 0.35 * s)
        rig.part("all", seams, wood_dk, outline=0.0)
        bands = Geo()
        for x in (-16, 0, 16):
            bands.blob((x * s, 0, 52 * s), (1.4 * s, 11.6 * s, 12.6 * s), p=3.0)
        rig.part("all", bands, iron, outline=0.3)
        # the neck and the head
        rig.part("all", Geo().blob((27 * s, 0, 72 * s), (9 * s, 8 * s, 20 * s), p=3.0, rot=(0, 28, 0)), wood, outline=0.6)
        rig.part("all", Geo().blob((38 * s, 0, 92 * s), (13 * s, 7 * s, 7 * s), p=3.2, rot=(0, 26, 0), taper=(1.0, 0.8)), wood_lt, outline=0.6)
        rig.part("all", box_geo((43 * s, -7.2 * s, 93 * s), (1.6 * s, 0.4 * s, 1.6 * s)), "#2E2622", outline=0.0)
        for dy in (-3.5, 3.5):
            rig.part("all", Geo().blob((31 * s, dy * s, 101 * s), (1.6 * s, 1.2 * s, 4.2 * s), p=2.2, rot=(0, -10, 0)), wood_dk, outline=0.3)
        mane = Geo()
        for k in range(7):
            t = k / 6
            mane.blob(((18 + 12 * t) * s, 0, (62 + 34 * t) * s), (2.2 * s, 1.6 * s, 3.4 * s), p=2.4, rot=(0, -40, 0))
        rig.part("all", mane, wood_dk, outline=0.3)
        rig.part("all", Geo().capsule((-31 * s, 0, 56 * s), (-38 * s, 0, 34 * s), 2.0 * s, 1.0 * s), wood_dk, outline=0.4)
    return build


def windmill_sails(sail="#E6DECC", frame="#6A5644", hub="#4A3E36", length=34.0, width=7.0, cloth=True):
    """A windmill's four sails on a hub, facing the camera: lattice stocks with cloth panels (or bare lattice
    with `cloth=False`), on joint `s`; frames turn it a quarter of its 90-degree symmetry each
    (`[{"s": {"r": -22.5 * f}} for f in range(4)]`)."""
    def build(rig):
        rig.joint("s", "all", (0, 0, 0))
        st = Geo()
        cl = Geo()
        for k in range(4):
            a = math.pi / 2 * k + math.pi / 4
            ca, sa = math.cos(a), math.sin(a)
            st.capsule((0, -1.0, 0), (ca * length, -1.0, sa * length), 0.9, 0.6)
            px, pz = -sa, ca          # across the stock
            for j in range(6):
                t = 0.22 + j * 0.15
                st.capsule((ca * length * t, -1.4, sa * length * t), (ca * length * t + px * width, -1.4, sa * length * t + pz * width), 0.35)
            st.capsule((ca * length * 0.2 + px * width, -1.4, sa * length * 0.2 + pz * width), (ca * length + px * width, -1.4, sa * length + pz * width), 0.4)
            if cloth:
                cl.slab([(ca * length * 0.22 + px * 0.6, sa * length * 0.22 + pz * 0.6), (ca * length * 0.98 + px * 0.6, sa * length * 0.98 + pz * 0.6),
                         (ca * length * 0.98 + px * width * 0.92, sa * length * 0.98 + pz * width * 0.92),
                         (ca * length * 0.22 + px * width * 0.92, sa * length * 0.22 + pz * width * 0.92)], -0.8, 0.5)
        rig.part("s", st, frame, outline=0.3)
        if cloth:
            rig.part("s", cl, sail, outline=0.3)
        rig.part("s", Geo().sphere((0, -2.0, 0), 2.6), hub, outline=0.3)
    return build


def cog(hull="#5E4A3C", hull_lt="#7A6450", castle="#6A5646", sail="#E2D8C4", stripe="#8E2A4A", flag="#8E2A4A", size=1.0, sail_set=True):
    """A medieval cog facing right: a deep round-bellied hull with clinker strakes, high castles at the stern
    and the bow, one mast with a square sail (a wine stripe across it) and a long pennant at the top; with
    `sail_set=False` the sail is furled on its yard (moored)."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 7 * s), (26 * s, 7.5 * s, 7 * s), p=2.6, taper=(0.8, 1.0)), hull, outline=0.6)
        strakes = Geo()
        for k in range(3):
            strakes.capsule((-24 * s, -7.0 * s, (6 + k * 2.6) * s), (24 * s, -7.0 * s, (6 + k * 2.6) * s), 0.35 * s)
        rig.part("all", strakes, hull_lt, outline=0.0)
        rig.part("all", box_geo((-20 * s, 0, 17 * s), (7 * s, 7 * s, 4 * s)), castle, outline=0.5)
        rig.part("all", box_geo((20 * s, 0, 16 * s), (5.5 * s, 6.5 * s, 3.2 * s)), castle, outline=0.5)
        rig.part("all", Geo().capsule((0, 0, 12 * s), (0, 0, 52 * s), 0.9 * s, 0.7 * s), castle, outline=0.4)
        if sail_set:
            rig.part("all", Geo().blob((1.2 * s, -1.0 * s, 33 * s), (13 * s, 1.6 * s, 15 * s), p=3.2), sail, outline=0.5)
            rig.part("all", box_geo((1.6 * s, -2.6 * s, 33 * s), (13.2 * s, 0.4 * s, 2.0 * s)), stripe, outline=0.0)
            rig.part("all", Geo().capsule((-14 * s, -1.0 * s, 48 * s), (16 * s, -1.0 * s, 48 * s), 0.6 * s), castle, outline=0.3)
        else:
            rig.part("all", Geo().capsule((-13 * s, -1.0 * s, 44 * s), (14 * s, -1.0 * s, 44 * s), 1.6 * s, 1.4 * s), sail, outline=0.4)
        rig.part("all", Geo().slab([(0, 52 * s), (12 * s, 50.6 * s), (0, 49 * s)], 0, 0.6 * s), flag, outline=0.2)
    return build


def barge(hull="#3E4448", stripe="#D8CCB2", cabin="#5E6A5E", roof="#3A3634", cargo="#8A7E66", window="#2E2A28", size=1.0):
    """A canal barge gliding right: a long low dark hull with a pale rubbing strake, a tarpaulined cargo hold,
    a deckhouse at the stern with two windows and a stovepipe, a tiller, a lowered mast along the hold."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 3.6 * s), (40 * s, 7.0 * s, 3.8 * s), p=4.0, taper=(0.86, 1.0)), hull, outline=0.6)
        rig.part("all", box_geo((0, -6.9 * s, 6.2 * s), (39 * s, 0.5 * s, 0.7 * s)), stripe, outline=0.0)
        rig.part("all", Geo().blob((4 * s, 0, 9 * s), (24 * s, 5.8 * s, 3.4 * s), p=2.6), cargo, outline=0.5)
        rig.part("all", box_geo((-28 * s, 0, 11 * s), (7 * s, 5.6 * s, 4.6 * s)), cabin, outline=0.5)
        rig.part("all", box_geo((-28 * s, 0, 16 * s), (8 * s, 6.2 * s, 0.9 * s)), roof, outline=0.3)
        for x in (-31, -25):
            rig.part("all", box_geo((x * s, -5.8 * s, 11.6 * s), (1.6 * s, 0.3 * s, 1.6 * s)), window, outline=0.0)
        rig.part("all", Geo().capsule((-24 * s, 0, 17 * s), (-24 * s, 0, 22 * s), 0.6 * s), roof, outline=0.2)
        rig.part("all", Geo().capsule((-38 * s, 0, 8 * s), (-44 * s, 0, 11 * s), 0.5 * s), roof, outline=0.2)
        rig.part("all", Geo().capsule((-18 * s, 1.0 * s, 13 * s), (30 * s, 1.0 * s, 12 * s), 0.7 * s), "#6A5644", outline=0.2)
    return build


def airship(envelope="#D8D0BE", envelope_dk="#BEB6A2", fin="#9A9284", gondola="#5B6168", window="#2E3036", trim="#8A6A63", size=1.0):
    """A rigid airship facing right: a long cigar envelope with ring seams and a darker belly, four cruciform
    tail fins, a control gondola under the bow with a window band, two engine cars with propeller discs."""
    def build(rig):
        s = size
        L = 70 * s
        prof = [(0.01, 0), (5 * s, 0.02 * L), (10 * s, 0.08 * L), (12.5 * s, 0.2 * L), (13 * s, 0.45 * L), (12 * s, 0.7 * L), (8.5 * s, 0.88 * L),
                (3 * s, 0.98 * L), (0.01, L)]
        rig.part("all", Geo().lathe(prof, (-L * 0.45, 0, 0), (L * 0.55, 0, 0), segs=24), envelope, outline=0.6)
        rig.part("all", Geo().lathe([(r * 1.004, z) for r, z in prof[2:7]], (-L * 0.45, 0, -1.4 * s), (L * 0.55, 0, -1.4 * s), segs=24).clip(
            (0, 0, -4 * s), (0, 0, 1)), envelope_dk, outline=0.0)
        seams = Geo()
        for k in range(1, 8):
            x = -L * 0.45 + L * (0.08 + k * 0.11)
            t = (x + L * 0.45) / L
            r = max(3 * s, 13 * s * (1 - (2 * t - 1) ** 4) ** 0.5)
            seams.blob((x, 0, 0), (0.5 * s, r * 1.01, r * 1.01), p=2.0, cuts=3)
        rig.part("all", seams, envelope_dk, outline=0.0)
        fins = Geo()
        fins.slab([(-L * 0.4, 0), (-L * 0.24, 0), (-L * 0.36, 11 * s), (-L * 0.45, 11 * s)], 0, 1.2 * s)
        fins.slab([(-L * 0.4, 0), (-L * 0.24, 0), (-L * 0.36, -11 * s), (-L * 0.45, -11 * s)], 0, 1.2 * s)
        fins.blob((-L * 0.36, 0, 0), (6 * s, 11 * s, 0.8 * s), p=3.0, cuts=2)
        rig.part("all", fins, fin, outline=0.5)
        rig.part("all", Geo().blob((L * 0.22, 0, -14 * s), (8 * s, 3.0 * s, 2.6 * s), p=3.0), gondola, outline=0.5)
        rig.part("all", box_geo((L * 0.22, -3.0 * s, -13.6 * s), (6.4 * s, 0.3 * s, 0.9 * s)), window, outline=0.0)
        for x in (-L * 0.06, -L * 0.2):
            rig.part("all", Geo().blob((x, -9 * s, -10 * s), (3.6 * s, 2.0 * s, 1.8 * s), p=2.6), gondola, outline=0.4)
            rig.part("all", Geo().blob((x - 4.2 * s, -9 * s, -10 * s), (0.4 * s, 3.2 * s, 3.2 * s), p=2.0), "#8A8C90", outline=0.2)
        rig.part("all", Geo().capsule((L * 0.1, 0, 12.8 * s), (L * 0.34, 0, 12.0 * s), 0.6 * s), trim, outline=0.0)
    return build


def patrol_boat(hull="#5E665E", hull_dk="#4A524C", cabin="#7A8270", roof="#4A4E48", window="#2E3236", flag="#5E6A72", size=1.0):
    """A river patrol boat running right: a low sharp-bowed hull, a wheelhouse with a window band and a
    canvas awning aft, a mast with a small flag, a wake line at the bow."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 3 * s), (26 * s, 6 * s, 3.2 * s), p=3.0, taper=(0.9, 1.0), shift=(0.0, 0.0)), hull, outline=0.6)
        rig.part("all", box_geo((0, -5.8 * s, 4.6 * s), (25 * s, 0.4 * s, 0.6 * s)), hull_dk, outline=0.0)
        rig.part("all", box_geo((-2 * s, 0, 9 * s), (7 * s, 4.6 * s, 3.4 * s)), cabin, outline=0.5)
        rig.part("all", box_geo((-2 * s, -4.7 * s, 10 * s), (6 * s, 0.3 * s, 1.0 * s)), window, outline=0.0)
        rig.part("all", box_geo((-2 * s, 0, 12.8 * s), (8 * s, 5.2 * s, 0.6 * s)), roof, outline=0.3)
        rig.part("all", Geo().blob((-16 * s, 0, 9 * s), (7 * s, 5 * s, 1.0 * s), p=3.0), "#B8B09A", outline=0.3)
        for x in (-22, -10):
            rig.part("all", Geo().capsule((x * s, -4.6 * s, 5 * s), (x * s, -4.6 * s, 9 * s), 0.3 * s), roof, outline=0.0)
        rig.part("all", Geo().capsule((2 * s, 0, 13 * s), (2 * s, 0, 24 * s), 0.4 * s), roof, outline=0.2)
        rig.part("all", Geo().slab([(2 * s, 24 * s), (8 * s, 22.6 * s), (2 * s, 21 * s)], 0, 0.4 * s), flag, outline=0.2)
        rig.part("all", Geo().blob((27 * s, -2 * s, 0.6 * s), (5 * s, 3 * s, 0.4 * s), p=2.2), "#D8DCD4", outline=0.0)
    return build


def turbine_rotor(blade="#EEF0EA", hub="#D8DCD6", length=30.0):
    """A wind turbine's three-bladed rotor facing the camera on joint `s`; frames turn it a quarter of its
    120-degree symmetry each (`[{"s": {"r": -30 * f}} for f in range(4)]`)."""
    def build(rig):
        rig.joint("s", "all", (0, 0, 0))
        g = Geo()
        for k in range(3):
            a = math.radians(90 + 120 * k)
            ca, sa = math.cos(a), math.sin(a)
            g.slab([(ca * 2 - sa * 1.6, sa * 2 + ca * 1.6), (ca * length * 0.3 - sa * 2.4, sa * length * 0.3 + ca * 2.4),
                    (ca * length, sa * length), (ca * length * 0.3 + sa * 0.8, sa * length * 0.3 - ca * 0.8), (ca * 2 + sa * 1.2, sa * 2 - ca * 1.2)], -1.0, 0.8)
        rig.part("s", g, blade, outline=0.3)
        rig.part("s", Geo().blob((0, -1.8, 0), (2.4, 3.0, 2.4), p=2.2), hub, outline=0.3)
    return build


def drone(body="#E6E8E4", rotor="#8A8E8C", light="#8ED8B8", size=1.0):
    """A small pollinator drone: a rounded body with a glowing mint eye, four rotor discs on arms."""
    def build(rig):
        s = size
        rig.part("all", Geo().blob((0, 0, 0), (3.2 * s, 2.4 * s, 1.8 * s), p=2.4), body, outline=0.4)
        rig.part("all", Geo().sphere((2.4 * s, -1.6 * s, -0.2 * s), 0.9 * s), glow=light, outline=0)
        for sx in (-1, 1):
            for sy in (-1, 1):
                rig.part("all", Geo().capsule((0, 0, 0.4 * s), (sx * 4.4 * s, sy * 3.0 * s, 1.0 * s), 0.35 * s), rotor, outline=0.2)
                rig.part("all", Geo().blob((sx * 4.4 * s, sy * 3.0 * s, 1.3 * s), (2.0 * s, 2.0 * s, 0.25 * s), p=2.0), rotor, outline=0.2)
    return build
