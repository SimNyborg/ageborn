"""Realistic human: skeleton, anatomical metaball body and a 2D pose solver (FK + leg/arm IK).

Proportions are for a real adult (head ~1/7.4 of height). All positions are authored for a
68 lu figure and scaled by `k = H / 68`; `bulk` widens the body (1.0 = athletic).
Near-side limbs (toward the camera, -Y) end in F, far-side limbs in B.
"""
import math

from . import core as C

# joint heights as fractions of H
ANKLE, KNEE, HIP, PELV, SPINE, CHEST, NECK, CHIN = 0.045, 0.28, 0.505, 0.515, 0.60, 0.70, 0.83, 0.87
SHOULDER, ELBOW, WRIST, HANDEND = 0.815, 0.635, 0.49, 0.40


class Biped:
    def __init__(self, H=68.0, bulk=1.0, shoulder_w=None):
        self.H = H
        self.k = H / 68.0
        self.bulk = bulk
        k = self.k
        self.sw = (shoulder_w or 7.8) * k * (0.94 + 0.06 * bulk)   # shoulder joint half-width
        self.hw = 3.8 * k * (0.95 + 0.05 * bulk)                   # hip joint half-width
        H_ = H
        self.L_thigh = (HIP - KNEE) * H_
        self.L_shin = (KNEE - ANKLE) * H_
        self.L_upper = (SHOULDER - ELBOW) * H_
        self.L_fore = (ELBOW - WRIST) * H_

    # ------------------------------------------------------------------ skeleton
    def bones(self, extra=None):
        H, sw, hw = self.H, self.sw, self.hw
        z = lambda f: f * H
        b = {
            "root": ((0, 0, 0), (0, 0, 4 * self.k), None),
            "hips": ((0, 0, z(PELV)), (0, 0, z(SPINE)), "root"),
            "spine": ((0, 0, z(SPINE)), (0, 0, z(CHEST)), "hips"),
            "chest": ((0, 0, z(CHEST)), (0, 0, z(NECK)), "spine"),
            "neck": ((0.4 * self.k, 0, z(NECK)), (0.8 * self.k, 0, z(CHIN)), "chest"),
            "head": ((0.8 * self.k, 0, z(CHIN)), (0.8 * self.k, 0, H), "neck"),
        }
        for s, y in (("F", -1), ("B", 1)):
            b["upperarm_" + s] = ((0, y * sw, z(SHOULDER)), (0, y * sw, z(ELBOW)), "chest")
            b["forearm_" + s] = ((0, y * sw, z(ELBOW)), (0, y * sw, z(WRIST)), "upperarm_" + s)
            b["hand_" + s] = ((0, y * sw, z(WRIST)), (0, y * sw, z(HANDEND)), "forearm_" + s)
            b["thigh_" + s] = ((0, y * hw, z(HIP)), (0, y * hw, z(KNEE)), "hips")
            b["shin_" + s] = ((0, y * hw, z(KNEE)), (0, y * hw, z(ANKLE)), "thigh_" + s)
            b["foot_" + s] = ((0, y * hw, z(ANKLE)), (0.11 * H, y * hw, 0.012 * H), "shin_" + s)
        if extra:
            b.update(extra)
        return b

    # ------------------------------------------------------------------ body
    def body(self, rig, skin_mat, parts=("torso", "head", "arms", "legs"), hands=True,
             res=None):
        """Anatomical body meshes, skinned to the rig. Returns {part: obj}."""
        k, bw = self.k, self.bulk
        sw, hw = self.sw / k, self.hw / k   # back to 68-lu units

        def S(p):   # scale a 68-lu position
            return (p[0] * k, p[1] * k, p[2] * k)

        def A(a, wide=True):
            return (a[0] * k * (bw if wide else 1), a[1] * k * bw, a[2] * k)

        out = {}
        if "torso" in parts:
            els = [
                ((-0.3, 0, 35.8), (4.6, 6.4, 5.0)),           # pelvis
                ((-2.3, -2.9, 34.4), (3.3, 3.3, 4.0)),        # glutes
                ((-2.3, 2.9, 34.4), (3.3, 3.3, 4.0)),
                ((0.3, 0, 41.0), (3.9, 5.6, 5.4)),            # abdomen
                ((-0.2, 0, 48.0), (4.6, 6.6, 6.6)),           # ribcage
                ((1.9, -3.2, 50.4), (2.8, 3.4, 2.8)),         # pecs
                ((1.9, 3.2, 50.4), (2.8, 3.4, 2.8)),
                ((-1.2, -5.2, 54.0), (3.0, 3.6, 2.4)),        # trapezius / shoulder mass
                ((-1.2, 5.2, 54.0), (3.0, 3.6, 2.4)),
                ((-2.0, 0, 49.5), (2.8, 6.2, 5.6)),           # lats / back
                ((0.7, 0, 57.4), (2.3, 2.3, 3.4)),            # neck
            ]
            els = [(S(c), A(a)) for c, a in els]
            o = C.blobs("torso", els, skin_mat, res=res)
            rig.skin(o, ["hips", "spine", "chest", "neck", "thigh_F", "thigh_B"],
                     soft=1.8 * k, bias={"thigh_F": 2.5 * k, "thigh_B": 2.5 * k})
            out["torso"] = o
        if "head" in parts:
            els = [
                ((0.6, 0, 64.0), (4.5, 3.8, 4.3)),            # cranium
                ((2.5, 0, 61.4), (2.7, 2.9, 2.8)),            # face / jaw
                ((1.6, 0, 60.6), (2.4, 2.5, 1.8)),            # chin / jaw line
                ((4.8, 0, 62.4), (0.9, 0.6, 1.1)),            # nose
                ((4.0, 0, 63.9), (1.0, 2.6, 0.75)),           # brow ridge
                ((0.3, -3.6, 62.6), (1.0, 0.5, 1.4)),         # ears
                ((0.3, 3.6, 62.6), (1.0, 0.5, 1.4)),
            ]
            els = [(S(c), A(a, False)) for c, a in els]
            o = C.blobs("head", els, skin_mat, res=(res or C._MB_RES) * 0.8)
            rig.rigid(o, "head")
            out["head"] = o
        if "arms" in parts:
            for s, y in (("F", -sw), ("B", sw)):
                els = [
                    ((0, y, 54.2), (3.2, 3.1, 3.5)),          # deltoid
                    ((0, y, 49.8), (2.6, 2.5, 5.0)),          # upper arm
                    ((0.9, y, 48.6), (2.1, 2.1, 3.1)),        # biceps
                    ((-0.8, y, 48.9), (2.0, 2.0, 3.4)),       # triceps
                    ((-0.2, y, 43.2), (2.0, 2.0, 2.1)),       # elbow
                    ((0.3, y, 39.8), (2.4, 2.25, 4.0)),       # forearm
                    ((0.1, y, 34.4), (1.45, 1.55, 1.9)),      # wrist
                ]
                if hands:
                    els += [((0.35, y, 31.0), (1.7, 1.35, 2.6))]   # fist
                els = [(S(c), A(a)) for c, a in els]
                o = C.blobs("arm_" + s, els, skin_mat, res=res)
                rig.skin(o, ["chest", "upperarm_" + s, "forearm_" + s, "hand_" + s],
                         soft=1.2 * k, bias={"chest": 3.0 * k})
                out["arm_" + s] = o
        if "legs" in parts:
            for s, y in (("F", -hw), ("B", hw)):
                els = [
                    ((0.2, y * 1.05, 31.2), (4.4, 4.1, 6.4)),     # upper thigh
                    ((1.3, y, 26.4), (3.4, 3.3, 5.0)),            # quads
                    ((-0.6, y, 26.8), (3.0, 3.1, 4.8)),           # hamstrings
                    ((0.7, y, 19.4), (2.5, 2.5, 2.5)),            # knee
                    ((-1.0, y, 14.6), (3.0, 2.7, 4.5)),           # calf
                    ((0.2, y, 10.4), (2.2, 2.2, 5.8)),            # shin
                    ((0.0, y, 3.4), (1.6, 1.6, 1.9)),             # ankle
                    ((3.3, y, 1.35), (4.3, 1.85, 1.45)),          # foot
                ]
                els = [(S(c), A(a)) for c, a in els]
                o = C.blobs("leg_" + s, els, skin_mat, res=res)
                rig.skin(o, ["hips", "thigh_" + s, "shin_" + s, "foot_" + s], soft=1.3 * k,
                         bias={"hips": 2.0 * k, "foot_" + s: 0.8 * k})
                out["leg_" + s] = o
        return out

    # ------------------------------------------------------------------ pose
    def fk(self, P):
        """Side-plane positions of the torso chain for pose P. Returns dict of points and
        cumulative angles (radians)."""
        H = self.H
        rr = math.radians(P.get("root_r", 0.0))
        if "pel" in P:
            off = C.rot2((0, PELV * H), rr)
            P["root"] = (P["pel"][0] - off[0], P["pel"][1] - off[1])
        rx, rz = P.get("root", (0.0, 0.0))
        rh = rr + math.radians(P.get("hips", 0.0))
        rs = rh + math.radians(P.get("spine", 0.0))
        rc = rs + math.radians(P.get("chest", 0.0))
        o = (rx, rz)
        pel = C.rot2((0, PELV * H), rr)
        pel = (o[0] + pel[0], o[1] + pel[1])
        hip = C.rot2((0, (HIP - PELV) * H), rh)
        hip = (pel[0] + hip[0], pel[1] + hip[1])
        sp = C.rot2((0, (SPINE - PELV) * H), rh)
        sp = (pel[0] + sp[0], pel[1] + sp[1])
        ch = C.rot2((0, (CHEST - SPINE) * H), rs)
        ch = (sp[0] + ch[0], sp[1] + ch[1])
        sh = C.rot2((0, (SHOULDER - CHEST) * H), rc)
        sh = (ch[0] + sh[0], ch[1] + sh[1])
        return dict(pel=pel, hip=hip, shoulder=sh, rr=rr, rh=rh, rs=rs, rc=rc)

    def hand_pos(self, P, side):
        """Wrist position from the FK arm angles in P."""
        f = self.fk(P)
        a = P.get("arm" + side, (0, 0, 0))
        up = f["rc"] + math.radians(a[0])
        lo = up + math.radians(a[1])
        s = f["shoulder"]
        e = (s[0] + self.L_upper * math.sin(up), s[1] - self.L_upper * math.cos(up))
        w = (e[0] + self.L_fore * math.sin(lo), e[1] - self.L_fore * math.cos(lo))
        return w, lo

    def apply(self, rig, P):
        """Pose the rig. P keys (degrees, lu):
        root (dx, dz), root_r, root_dy, hips, spine, chest, neck, head,
        footF/footB (ankle x, ankle z, foot angle) solved with IK, or legF/legB FK (thigh, shin, foot),
        armF/armB FK (shoulder, elbow, wrist[, abduct]) or handF/handB IK ((x, z), wrist_abs),
        twist (hips yaw), bones {name: r or (r, rz)} for extra bones."""
        rig.rest()
        f = self.fk(P)
        rx, rz = P.get("root", (0.0, 0.0))
        rig.set("root", r=f["rr"], loc=(rx, P.get("root_dy", 0.0), rz))
        rig.set("hips", r=math.radians(P.get("hips", 0.0)), ry=math.radians(P.get("twist", 0.0)))
        rig.set("spine", r=math.radians(P.get("spine", 0.0)),
                ry=math.radians(-0.5 * P.get("twist", 0.0)))
        rig.set("chest", r=math.radians(P.get("chest", 0.0)),
                ry=math.radians(-0.4 * P.get("twist", 0.0)))
        rig.set("neck", r=math.radians(P.get("neck", 0.0)))
        rig.set("head", r=math.radians(P.get("head", 0.0)))
        for s in ("F", "B"):
            if "foot" + s in P:
                x, z, fa = P["foot" + s]
                up, lo = C.ik2(f["hip"], (x, z), self.L_thigh, self.L_shin, bend=1.0)
                rig.set("thigh_" + s, r=up - f["rh"])
                rig.set("shin_" + s, r=lo - up)
                rig.set("foot_" + s, r=math.radians(fa) - lo)
            elif "leg" + s in P:
                t, sh, ft = P["leg" + s]
                rig.set("thigh_" + s, r=math.radians(t))
                rig.set("shin_" + s, r=math.radians(sh))
                rig.set("foot_" + s, r=math.radians(ft))
            if "hand" + s in P:
                (x, z), wa = P["hand" + s]
                up, lo = C.ik2(f["shoulder"], (x, z), self.L_upper, self.L_fore, bend=-1.0)
                ab = math.radians(P.get("abduct" + s, 0.0))
                rig.set("upperarm_" + s, r=up - f["rc"], rz=ab)
                rig.set("forearm_" + s, r=lo - up)
                rig.set("hand_" + s, r=math.radians(wa) - lo)
            elif "abs" + s in P:
                # absolute angles: upper arm and forearm from straight down, hand (held-prop
                # axis) from +X, all CCW; converted to local rotations
                a = P["abs" + s]
                ab = math.radians(a[3]) if len(a) > 3 else 0.0
                ua, fa, ha = (math.radians(x) for x in a[:3])
                rig.set("upperarm_" + s, r=ua - f["rc"], rz=ab)
                rig.set("forearm_" + s, r=fa - ua)
                rig.set("hand_" + s, r=ha - fa)
            elif "arm" + s in P:
                a = P["arm" + s]
                ab = math.radians(a[3]) if len(a) > 3 else 0.0
                rig.set("upperarm_" + s, r=math.radians(a[0]), rz=ab)
                rig.set("forearm_" + s, r=math.radians(a[1]))
                rig.set("hand_" + s, r=math.radians(a[2]))
        for bn, v in P.get("bones", {}).items():
            if isinstance(v, tuple):
                rig.set(bn, r=math.radians(v[0]), rz=math.radians(v[1]))
            else:
                rig.set(bn, r=math.radians(v))


# ---------------------------------------------------------------------- motion helpers
def ease_in_out(t):
    return t * t * (3 - 2 * t)


def ease_out(t):
    return 1 - (1 - t) ** 3


def ease_in(t):
    return t ** 3


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_pose(A, B, t):
    """Blend two pose dicts (numbers and tuples)."""
    out = {}
    for k in set(A) | set(B):
        a, b = A.get(k, B.get(k)), B.get(k, A.get(k))
        if isinstance(a, dict):
            out[k] = lerp_pose(a, b, t)
        elif isinstance(a, tuple):
            out[k] = tuple(_lerp_any(x, y, t) for x, y in zip(a, b))
        else:
            out[k] = _lerp_any(a, b, t)
    return out


def _lerp_any(a, b, t):
    if isinstance(a, tuple):
        return tuple(lerp(x, y, t) for x, y in zip(a, b))
    return lerp(a, b, t)


def walk_feet(phase, stride, lift, stance=0.62, ground=None):
    """Planted-foot walk: ankle (x, z, foot angle) for a foot at `phase` in [0, 1).
    Stance: heel strike at 0 (x = +stride/2, toe up), roll, toe-off at `stance` (heel up).
    Swing: an arc forward."""
    g = ground if ground is not None else 0.045 * 68
    p = phase % 1.0
    if p < stance:
        t = p / stance
        x = lerp(stride / 2, -stride / 2, t)
        if t < 0.12:
            ang = lerp(14, 0, t / 0.12)            # heel strike, toe comes down
            z = g + 0.6 * (1 - t / 0.12)
        elif t < 0.72:
            ang, z = 0.0, g
        else:
            u = (t - 0.72) / 0.28                  # heel rises: roll onto the toes
            ang = -32 * u
            z = g + 3.2 * u
        return x, z, ang
    t = (p - stance) / (1 - stance)
    x = lerp(-stride / 2, stride / 2, ease_in_out(t))
    z = g + 3.2 * (1 - t) ** 2 + lift * math.sin(math.pi * min(1.0, t * 1.15))
    ang = lerp(-40, 14, ease_in_out(t))
    return x, z, ang


def _flat(P, prefix=""):
    out = {}
    for k, v in P.items():
        if isinstance(v, dict):
            out.update(_flat(v, prefix + k + "/"))
        elif isinstance(v, tuple):
            for i, x in enumerate(v):
                if isinstance(x, tuple):
                    for j, y in enumerate(x):
                        out[f"{prefix}{k}#{i}#{j}"] = y
                else:
                    out[f"{prefix}{k}#{i}"] = x
        else:
            out[prefix + k] = v
    return out


def _unflat(F):
    out = {}
    tup = {}
    for key, v in F.items():
        path, _, idx = key.partition("#")
        parts = path.split("/")
        d = out
        for p in parts[:-1]:
            d = d.setdefault(p, {})
        if idx:
            tup.setdefault(path, {})[idx] = v
        else:
            d[parts[-1]] = v
    for path, items in tup.items():
        parts = path.split("/")
        d = out
        for p in parts[:-1]:
            d = d.setdefault(p, {})
        top = {}
        for idx, v in items.items():
            ij = idx.split("#")
            if len(ij) == 1:
                top[int(ij[0])] = v
            else:
                top.setdefault(int(ij[0]), {})[int(ij[1])] = v
        vals = []
        for i in sorted(top):
            x = top[i]
            vals.append(tuple(x[j] for j in sorted(x)) if isinstance(x, dict) else x)
        d[parts[-1]] = tuple(vals)
    return out


def keyed(keys, t, loop_len=None):
    """Catmull-Rom interpolation through [(time, pose)] (every pose has the same keys,
    missing ones fall back to the base = first pose). With loop_len the keys wrap."""
    base = _flat(keys[0][1])
    fl = [(tk, {**base, **_flat(p)}) for tk, p in keys]
    n = len(fl)
    if loop_len:
        t = t % loop_len
        ext = [(fl[-1][0] - loop_len, fl[-1][1])] + fl + [(fl[0][0] + loop_len, fl[0][1]),
                                                         (fl[1 % n][0] + loop_len, fl[1 % n][1])]
    else:
        t = min(max(t, fl[0][0]), fl[-1][0])
        ext = [fl[0]] + fl + [fl[-1]]
    for j in range(1, len(ext) - 2):
        t1, t2 = ext[j][0], ext[j + 1][0]
        if t1 <= t <= t2:
            u = 0.0 if t2 == t1 else (t - t1) / (t2 - t1)
            p0, p1, p2, p3 = ext[j - 1][1], ext[j][1], ext[j + 1][1], ext[j + 2][1]
            res = {}
            for k in p1:
                a, b, c, d = p0.get(k, p1[k]), p1[k], p2.get(k, p1[k]), p3.get(k, p2.get(k, p1[k]))
                res[k] = 0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u
                                + (-a + 3 * b - 3 * c + d) * u ** 3)
            return _unflat(res)
    return _unflat(fl[-1][1])
