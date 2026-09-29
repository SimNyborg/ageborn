"""Generic realistic quadruped: skeleton, 2D leg solver (foot IK in the side plane) and gaits.

A `Quad` is defined by two leg chains in the side plane (x forward, z up, lu), each five points
from the top joint down to the toe: fore = shoulder blade top, elbow, wrist / fetlock, pastern,
toe; hind = hip, stifle, hock, fetlock, toe (the horse in `horse.py` is one instance of this). The
body pivots about `pivot` (pitch), the pelvis can tilt about the same point (`hip`), and the neck,
head, jaw and tail chains are FK. Near legs end in F (-Y, toward the camera), far legs in B.

Pose keys (degrees, lu): root (dx, dz), pitch (+ = nose up), hip (pelvis tilt), neck, head, jaw,
tail, tail2 and legs fore_F / fore_B / hind_F / hind_B = (toe x, toe z, last-segment angle, top swing).
Extra bones are passed in `bones` = {name: r or (r, rz)}.
"""
import math

from . import core as C


def _ang(a, b):
    """Direction angle (from straight down, CCW) of the segment a->b."""
    return math.atan2(b[0] - a[0], -(b[1] - a[1]))


class Quad:
    def __init__(self, fore, hind, pivot, depth, neck, head, tail, jaw=None, prefix="q_"):
        self.FORE, self.HIND = fore, hind
        self.PIVOT = pivot
        self.Y = {"F": -depth, "B": depth}
        self.neck, self.head, self.tail, self.jaw = neck, head, tail, jaw
        self.p = prefix
        self.REST = {"fore": [_ang(fore[i], fore[i + 1]) for i in range(4)],
                     "hind": [_ang(hind[i], hind[i + 1]) for i in range(4)]}
        self.LEN = {"fore": [math.dist(fore[i], fore[i + 1]) for i in range(4)],
                    "hind": [math.dist(hind[i], hind[i + 1]) for i in range(4)]}
        self.HOME = {"fore": fore[4][0], "hind": hind[4][0]}
        self.TOE_Z = {"fore": fore[4][1], "hind": hind[4][1]}
        self.LAST = {"fore": math.degrees(self.REST["fore"][3]), "hind": math.degrees(self.REST["hind"][3])}

    def n(self, name):
        return self.p + name

    def bones(self):
        p = self.p
        px, pz = self.PIVOT
        b = {
            p + "root": ((0, 0, 0), (0, 0, 6), None),
            p + "body": ((px, 0, pz), (px + 20, 0, pz + 1), p + "root"),
            p + "pelvis": ((px, 0, pz), (px - 20, 0, pz + 1), p + "body"),
            p + "neck": ((self.neck[0][0], 0, self.neck[0][1]), (self.neck[1][0], 0, self.neck[1][1]), p + "body"),
            p + "head": ((self.head[0][0], 0, self.head[0][1]), (self.head[1][0], 0, self.head[1][1]), p + "neck"),
            p + "tail": ((self.tail[0][0], 0, self.tail[0][1]), (self.tail[1][0], 0, self.tail[1][1]), p + "pelvis"),
            p + "tail2": ((self.tail[1][0], 0, self.tail[1][1]), (self.tail[2][0], 0, self.tail[2][1]), p + "tail"),
        }
        if self.jaw:
            b[p + "jaw"] = ((self.jaw[0][0], 0, self.jaw[0][1]), (self.jaw[1][0], 0, self.jaw[1][1]), p + "head")
        for s, y in self.Y.items():
            for kind, pts, names, par0 in (("fore", self.FORE, ("foreS", "foreU", "foreC", "foreP"), "body"),
                                           ("hind", self.HIND, ("hindT", "hindG", "hindC", "hindP"), "pelvis")):
                par = p + par0
                for i, nm in enumerate(names):
                    a, c = pts[i], pts[i + 1]
                    b[f"{p}{nm}_{s}"] = ((a[0], y, a[1]), (c[0], y, c[1]), par)
                    par = f"{p}{nm}_{s}"
        return b

    def leg_bones(self, kind, s):
        names = ("foreS", "foreU", "foreC", "foreP") if kind == "fore" else ("hindT", "hindG", "hindC", "hindP")
        return [f"{self.p}{n}_{s}" for n in names]

    # ------------------------------------------------------------------ posing
    def body_xf(self, P):
        dx, dz = P.get("root", (0.0, 0.0))
        pitch = math.radians(P.get("pitch", 0.0))
        px, pz = self.PIVOT

        def f(pt):
            v = C.rot2((pt[0] - px, pt[1] - pz), pitch)
            return (px + v[0] + dx, pz + v[1] + dz)
        return f, pitch

    def apply(self, rig, P):
        p = self.p
        f, pitch = self.body_xf(P)
        dx, dz = P.get("root", (0.0, 0.0))
        rig.rest()
        rig.set(p + "root", loc=(dx, P.get("root_dy", 0.0), dz))
        rig.set(p + "body", r=pitch, ry=math.radians(P.get("roll", 0.0)))
        hip_r = math.radians(P.get("hip", 0.0))
        rig.set(p + "pelvis", r=hip_r)
        rig.set(p + "neck", r=math.radians(P.get("neck", 0.0)), rz=math.radians(P.get("neck_yaw", 0.0)))
        rig.set(p + "head", r=math.radians(P.get("head", 0.0)))
        if self.jaw:
            rig.set(p + "jaw", r=math.radians(P.get("jaw", 0.0)))
        rig.set(p + "tail", r=math.radians(P.get("tail", 0.0)), rz=math.radians(P.get("tail_yaw", 0.0)))
        rig.set(p + "tail2", r=math.radians(P.get("tail2", 0.0)))
        px, pz = self.PIVOT
        for kind, pts, bend in (("fore", self.FORE, 1.0), ("hind", self.HIND, -1.0)):
            names = self.leg_bones(kind, "F")
            for s in ("F", "B"):
                key = f"{kind}_{s}"
                if key not in P:
                    continue
                names = self.leg_bones(kind, s)
                hx, hz, pa, top = P[key]
                parent_cum = pitch + (hip_r if kind == "hind" else 0.0)
                top_r = math.radians(top)
                a0 = pts[0]
                if kind == "hind" and hip_r:
                    q = C.rot2((a0[0] - px, a0[1] - pz), hip_r)
                    base = f((px + q[0], pz + q[1]))
                else:
                    base = f(a0)
                v = C.rot2((pts[1][0] - a0[0], pts[1][1] - a0[1]), parent_cum + top_r)
                j1 = (base[0] + v[0], base[1] + v[1])
                L = self.LEN[kind]
                pr = math.radians(pa)
                fet = (hx - L[3] * math.sin(pr), hz + L[3] * math.cos(pr))
                up, lo = C.ik2(j1, fet, L[1], L[2], bend=bend)
                R = self.REST[kind]
                cum0 = parent_cum + top_r
                rig.set(names[0], r=top_r)
                r1 = (up - R[1]) - cum0
                rig.set(names[1], r=r1)
                r2 = (lo - R[2]) - (cum0 + r1)
                rig.set(names[2], r=r2)
                rig.set(names[3], r=(pr - R[3]) - (cum0 + r1 + r2))
        for bn, v in P.get("bones", {}).items():
            if isinstance(v, tuple):
                rig.set(bn, r=math.radians(v[0]), rz=math.radians(v[1]))
            else:
                rig.set(bn, r=math.radians(v))

    def stand(self, spread=1.5):
        return {"fore_F": (self.HOME["fore"] + spread, self.TOE_Z["fore"], self.LAST["fore"], 0.0),
                "fore_B": (self.HOME["fore"] - spread, self.TOE_Z["fore"], self.LAST["fore"], 0.0),
                "hind_F": (self.HOME["hind"] - spread, self.TOE_Z["hind"], self.LAST["hind"], 0.0),
                "hind_B": (self.HOME["hind"] + spread, self.TOE_Z["hind"], self.LAST["hind"], 0.0)}

    def step(self, phase, kind, stride, lift, duty=0.65, fold=60.0, reach=4.0, sink=10.0):
        """Toe (x, z, last-segment angle) at `phase` (0 = touch-down) of a walking / running cycle.
        Stance: the toe slides back by `stride` while the joint above sinks under load. Swing: the
        foot folds (`fold` degrees) and arcs forward by `lift`."""
        home = self.HOME[kind]
        z0 = self.TOE_Z[kind]
        pa0 = self.LAST[kind]
        ph = phase % 1.0
        if ph < duty:
            t = ph / duty
            x = home + stride / 2 - stride * t
            return x, z0, pa0 + sink * math.sin(math.pi * t)
        t = (ph - duty) / (1 - duty)
        e = 0.5 - 0.5 * math.cos(math.pi * t)
        x = home - stride / 2 + stride * e
        if kind == "fore":
            x -= reach * math.sin(math.pi * min(1.0, t * 1.6)) * (1 - t)
        z = z0 + lift * math.sin(math.pi * t) ** 0.85
        pa = pa0 - fold * math.sin(math.pi * min(1.0, t * 1.3))
        return x, z, pa
