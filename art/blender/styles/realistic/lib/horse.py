"""Realistic horse: skeleton, anatomical body, and a 2D leg solver (hoof IK) for gaits.

Faces +X, withers ~60 lu. Near legs end in F (-Y), far legs in B (+Y).
Leg chains: fore  = foreS (shoulder blade, FK) > foreU (forearm) > foreC (cannon) > foreP (pastern+hoof)
            hind  = hindT (femur, FK) > hindG (gaskin) > hindC (cannon) > hindP
"""
import math

from . import core as C

PIVOT = (0.0, 47.0)
Y = {"F": -5.2, "B": 5.2}
FORE = [(15.5, 50.0), (18.0, 35.0), (18.0, 19.0), (18.4, 7.0), (21.0, 0.6)]
HIND = [(-19.0, 52.0), (-12.5, 36.0), (-21.5, 21.5), (-21.2, 7.0), (-18.8, 0.6)]


def bones():
    b = {
        "h_root": ((0, 0, 0), (0, 0, 6), None),
        "h_body": ((PIVOT[0], 0, PIVOT[1]), (22, 0, 48), "h_root"),
        "h_pelvis": ((PIVOT[0], 0, PIVOT[1]), (-22, 0, 48), "h_body"),
        "h_neck": ((20, 0, 54), (31, 0, 70), "h_body"),
        "h_head": ((31, 0, 71), (41, 0, 58), "h_neck"),
        "h_tail": ((-27, 0, 55), (-31, 0, 44), "h_pelvis"),
        "h_tail2": ((-31, 0, 44), (-32, 0, 30), "h_tail"),
    }
    for s, y in Y.items():
        names = ["foreS", "foreU", "foreC", "foreP"]
        par = "h_body"
        for i, n in enumerate(names):
            a, c = FORE[i], FORE[i + 1]
            b[f"h_{n}_{s}"] = ((a[0], y, a[1]), (c[0], y, c[1]), par)
            par = f"h_{n}_{s}"
        names = ["hindT", "hindG", "hindC", "hindP"]
        par = "h_pelvis"
        for i, n in enumerate(names):
            a, c = HIND[i], HIND[i + 1]
            b[f"h_{n}_{s}"] = ((a[0], y, a[1]), (c[0], y, c[1]), par)
            par = f"h_{n}_{s}"
    return b


def body(rig, coat, dark, hoof, mane_mat, heavy=1.0):
    out = {}
    els = [
        ((0, 0, 47), (19.5, 9.0, 10.5)),         # barrel
        ((16, 0, 46.5), (8.5, 8.8, 11.2)),       # chest
        ((22.5, 0, 44.5), (4.8, 7.2, 8.0)),      # breast
        ((-15.5, 0, 48.5), (10.8, 9.6, 11.6)),   # hindquarters
        ((-18.5, 0, 54.5), (7.5, 8.4, 5.8)),     # croup
        ((11, 0, 55.5), (8.0, 5.8, 5.8)),        # withers
        ((2, 0, 40.5), (15, 8.2, 6.0)),          # belly
        ((-12.5, 0, 40), (7.0, 8.4, 8.0)),       # stifle mass
        ((17.5, 0, 42), (5.0, 8.6, 6.0)),        # upper forearm mass
        ((21.5, 0, 56.5), (8.0, 6.0, 9.2), (0, 0.6, 0)),   # neck base
        ((26.0, 0, 62.5), (6.3, 4.9, 8.0), (0, 0.6, 0)),
        ((30, 0, 67.5), (4.9, 4.0, 5.8), (0, 0.6, 0)),
    ]
    b = C.blobs("horse_body", els, coat, res=0.7)
    rig.skin(b, ["h_body", "h_pelvis", "h_neck", "h_foreS_F", "h_foreS_B", "h_hindT_F", "h_hindT_B"],
             soft=3.0, bias={"h_foreS_F": 3.0, "h_foreS_B": 3.0, "h_hindT_F": 3.0, "h_hindT_B": 3.0,
                             "h_neck": 1.0})
    out["body"] = b
    head = C.blobs("horse_head", [
        ((33.2, 0, 70.0), (4.6, 4.0, 4.8)),
        ((36.8, 0, 64.3), (3.7, 3.2, 6.8), (0, -0.62, 0)),
        ((34.6, 0, 66.5), (4.1, 3.7, 4.2)),
        ((41.0, 0, 59.0), (3.3, 2.9, 3.3)),
        ((39.8, 0, 57.8), (2.8, 2.5, 2.6)),
    ], coat, res=0.45)
    rig.rigid(head, "h_head")
    for y in (-1.9, 1.9):
        ear = C.blobs("ear", [((31.8, y, 75.2), (0.9, 0.6, 2.3), (0, -0.25, 0))], coat, res=0.3)
        rig.rigid(ear, "h_head")
        rig.rigid(C.sphere("heye", 0.75, dark, loc=(35.3, y * 1.72, 68.6), scale=(0.7, 0.5, 0.8)), "h_head")
    # mane along the neck crest, forelock, tail
    mane = C.blobs("mane", [((20 + 11 * u, 0, 58.5 + 14.5 * u), (2.6, 1.5, 3.2), (0, 0.6, 0))
                            for u in (0.0, 0.25, 0.5, 0.75, 1.0)], mane_mat, res=0.45)
    C.displace(mane, 0.8, 0.35)
    rig.skin(mane, ["h_body", "h_neck", "h_head"], soft=2.0)
    tail = C.blobs("tail", [((-27.5, 0, 53), (2.2, 2.0, 3.0)), ((-30, 0, 46), (2.6, 2.2, 5.0)),
                            ((-31.2, 0, 38), (2.8, 2.2, 5.0)), ((-31.8, 0, 31), (2.2, 1.8, 3.4))],
                    mane_mat, res=0.45)
    C.displace(tail, 0.9, 0.35)
    rig.skin(tail, ["h_tail", "h_tail2"], soft=2.0)
    for s, y in Y.items():
        hv = lambda a: (a[0] * heavy, a[1] * heavy, a[2])
        fore = C.blobs("fore_" + s, [
            ((18.0, y, 30.0), hv((3.9, 3.1, 7.4))),
            ((18.0, y, 23.0), hv((2.5, 2.2, 3.6))),
            ((18.0, y, 19.0), hv((1.95, 1.85, 2.6))),
            ((18.2, y, 13.0), hv((1.75, 1.6, 5.6))),
            ((18.4, y, 7.0), hv((1.85, 1.75, 1.9))),
            ((19.6, y, 4.0), hv((1.5, 1.45, 2.3))),
        ], coat, res=0.4)
        rig.skin(fore, ["h_foreS_" + s, "h_foreU_" + s, "h_foreC_" + s, "h_foreP_" + s], soft=1.0,
                 bias={"h_foreS_" + s: 2.0})
        hind = C.blobs("hind_" + s, [
            ((-16.5, y, 30.0), hv((4.0, 3.1, 6.6)), (0, 0.5, 0)),
            ((-19.8, y, 25.0), hv((2.7, 2.2, 3.4)), (0, 0.5, 0)),
            ((-21.3, y, 21.5), hv((2.1, 1.85, 2.7))),
            ((-21.4, y, 14.0), hv((1.8, 1.65, 6.0))),
            ((-21.2, y, 7.0), hv((1.85, 1.75, 1.9))),
            ((-20.0, y, 4.0), hv((1.5, 1.45, 2.3))),
        ], coat, res=0.4)
        rig.skin(hind, ["h_hindT_" + s, "h_hindG_" + s, "h_hindC_" + s, "h_hindP_" + s], soft=1.0,
                 bias={"h_hindT_" + s: 2.0})
        for nm, bone, x in (("fhoof", "h_foreP_", 20.6), ("hhoof", "h_hindP_", -19.4)):
            h = C.lathe(nm + s, [(0.0, 0.0), (2.2, 0.0), (1.8, 2.3), (1.2, 2.9), (0.0, 2.9)], hoof,
                        seg=16, loc=(x, y, 0.0), scale=(1.15, 0.95, 1.0))
            rig.rigid(h, bone + s)
            sock = C.blobs("sock" + nm + s, [((x - 1.0, y, 5.0), (1.75 * heavy, 1.7 * heavy, 2.6))], dark, res=0.35)
            rig.rigid(sock, bone + s)
            if heavy > 1.0:
                # a destrier's feathering: long dark hair over the fetlock and the back of the pastern
                fe = C.blobs("feather" + nm + s, [((x - 2.0, y, 5.6), (2.0 * heavy, 1.9 * heavy, 2.6)), ((x - 2.6, y, 3.2), (1.6, 1.8, 1.6))],
                             mane_mat, res=0.3)
                C.displace(fe, 0.5, 0.5)
                rig.rigid(fe, bone + s)
    return out


# --------------------------------------------------------------------------- posing
def _ang(a, b):
    """Direction angle (from straight down, CCW) of the segment a->b."""
    return math.atan2(b[0] - a[0], -(b[1] - a[1]))


REST = {"fore": [_ang(FORE[i], FORE[i + 1]) for i in range(4)],
        "hind": [_ang(HIND[i], HIND[i + 1]) for i in range(4)]}
LEN = {"fore": [math.dist(FORE[i], FORE[i + 1]) for i in range(4)],
       "hind": [math.dist(HIND[i], HIND[i + 1]) for i in range(4)]}


def body_xf(P):
    """Horse root offset and pitch -> function mapping a rest point to its posed position."""
    dx, dz = P.get("h_root", (0.0, 0.0))
    pitch = math.radians(P.get("h_pitch", 0.0))

    def f(p, extra=0.0, piv=PIVOT):
        v = C.rot2((p[0] - PIVOT[0], p[1] - PIVOT[1]), pitch)
        return (PIVOT[0] + v[0] + dx, PIVOT[1] + v[1] + dz)
    return f, pitch


def apply(rig, P):
    """P: h_root (dx, dz), h_pitch (deg, + = nose up), h_neck, h_head, h_tail (deg),
    legs: fore_F / fore_B / hind_F / hind_B = (hoof x, hoof z, pastern angle abs deg, top swing deg)."""
    f, pitch = body_xf(P)
    dx, dz = P.get("h_root", (0.0, 0.0))
    rig.set("h_root", loc=(dx, 0.0, dz))
    rig.set("h_body", r=pitch)
    rig.set("h_pelvis", r=math.radians(P.get("h_hip", 0.0)))
    rig.set("h_neck", r=math.radians(P.get("h_neck", 0.0)))
    rig.set("h_head", r=math.radians(P.get("h_head", 0.0)))
    rig.set("h_tail", r=math.radians(P.get("h_tail", 0.0)))
    rig.set("h_tail2", r=math.radians(P.get("h_tail2", 0.0)))
    hip_r = math.radians(P.get("h_hip", 0.0))
    for kind, pts, bend, names in (("fore", FORE, 1.0, ("foreS", "foreU", "foreC", "foreP")),
                                   ("hind", HIND, -1.0, ("hindT", "hindG", "hindC", "hindP"))):
        for s in ("F", "B"):
            key = f"{kind}_{s}"
            if key not in P:
                continue
            hx, hz, pa, top = P[key]
            parent_cum = pitch + (hip_r if kind == "hind" else 0.0)
            top_r = math.radians(top)
            # top bone (FK): its end point is the IK root
            a0 = pts[0]
            v = C.rot2((pts[1][0] - a0[0], pts[1][1] - a0[1]), parent_cum + top_r)
            if kind == "hind":
                base = f(a0) if not hip_r else _hip_point(f, a0, hip_r)
            else:
                base = f(a0)
            j1 = (base[0] + v[0], base[1] + v[1])
            L = LEN[kind]
            # IK target is the fetlock: hoof toe minus the pastern vector
            pr = math.radians(pa)
            fet = (hx - L[3] * math.sin(pr), hz + L[3] * math.cos(pr))
            up, lo = C.ik2(j1, fet, L[1], L[2], bend=bend)
            R = REST[kind]
            cum0 = parent_cum + top_r
            rig.set(f"h_{names[0]}_{s}", r=top_r)
            r1 = (up - R[1]) - cum0
            rig.set(f"h_{names[1]}_{s}", r=r1)
            cum1 = cum0 + r1
            r2 = (lo - R[2]) - cum1
            rig.set(f"h_{names[2]}_{s}", r=r2)
            cum2 = cum1 + r2
            rig.set(f"h_{names[3]}_{s}", r=(pr - R[3]) - cum2)


def _hip_point(f, p, hip_r):
    q = C.rot2((p[0] - PIVOT[0], p[1] - PIVOT[1]), hip_r)
    return f((PIVOT[0] + q[0], PIVOT[1] + q[1]))


def stand():
    return {"fore_F": (21.0 + 2, 0.6, _deg(REST["fore"][3]), 0.0),
            "fore_B": (21.0 - 1.5, 0.6, _deg(REST["fore"][3]), 0.0),
            "hind_F": (-18.8 - 1.5, 0.6, _deg(REST["hind"][3]), 0.0),
            "hind_B": (-18.8 + 1.5, 0.6, _deg(REST["hind"][3]), 0.0)}


def _deg(r):
    return math.degrees(r)


PASTERN_F = _deg(REST["fore"][3])
PASTERN_H = _deg(REST["hind"][3])


def gallop_leg(phase, kind, stride=30.0, lift=14.0, duty=0.42):
    """Hoof (x, z, pastern) for a leg at `phase` (0 = hoof strike)."""
    home = 21.0 if kind == "fore" else -18.8
    pa0 = PASTERN_F if kind == "fore" else PASTERN_H
    p = phase % 1.0
    if p < duty:
        t = p / duty
        x = home + stride / 2 - stride * t
        z = 0.6
        pa = pa0 + (18 * t if kind == "fore" else 14 * t)     # fetlock sinks under load
        return x, z, pa
    t = (p - duty) / (1 - duty)
    x = home - stride / 2 + stride * (0.5 - 0.5 * math.cos(math.pi * t))
    if kind == "fore":
        # fold: hoof tucks up and back under the forearm, then reaches forward
        x += -6.0 * math.sin(math.pi * min(1, t * 1.6)) * (1 - t)
        z = 0.6 + lift * math.sin(math.pi * t) ** 0.8
        pa = pa0 - 95 * math.sin(math.pi * min(1.0, t * 1.4))
    else:
        z = 0.6 + lift * 0.8 * math.sin(math.pi * t) ** 0.9
        pa = pa0 - 70 * math.sin(math.pi * min(1.0, t * 1.3))
    return x, z, pa
