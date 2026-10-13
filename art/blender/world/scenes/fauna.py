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
