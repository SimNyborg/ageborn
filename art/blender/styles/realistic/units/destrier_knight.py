"""Destrier Knight: Medieval heavy cavalry, realistic-miniature style.

A knight in polished plate with a team surcoat, great helm with a team plume, team kite
shield and a couched lance with a team pennon, on a dark bay destrier under a team
caparison with a steel chanfron.
"""
import math

from lib import biped as B
from lib import core as C
from lib import horse as Hs
from lib import pipe as P
from lib import props

SLUG = "destrier_knight"
HR = 60.0                      # rider height
CANVAS = (176, 128)
FEET = (70, 8)
YAW = -14.0

BODY = B.Biped(H=HR, bulk=1.05)
BODY.root = "rider"
BODY.offset = (-3.0, 0.0, 62.0 - B.PELV * HR)
FIST = (0.36, -2.4)
SHIELD_FORE = 100.0            # forearm angle the shield is modelled for


def build():
    k = BODY.k
    steel = C.mat("steel", "#9aa0a8", rough=0.26, metal=1.0, noise=0.1, nscale=0.9, bump=0.08)
    dsteel = C.mat("dsteel", "#5d636b", rough=0.35, metal=1.0, noise=0.12, nscale=0.9, bump=0.1)
    gold = C.mat("gold", "#b89a55", rough=0.3, metal=1.0, noise=0.08, nscale=1.0, bump=0.05)
    leather = C.mat("leather", "#4f3e33", rough=0.55, noise=0.14, nscale=0.9, bump=0.3)
    coat = C.mat("coat", "#4a3a31", rough=0.5, noise=0.1, nscale=0.35, bump=0.2, sheen=0.5, ramp2="#3c2f28")
    mane = C.mat("mane", "#1d1a19", rough=0.6, noise=0.25, nscale=1.4, bump=0.8, sheen=0.4)
    sock = C.mat("sock", "#2a2522", rough=0.6, noise=0.12, nscale=1.0, bump=0.3)
    hoof = C.mat("hoof", "#2b2826", rough=0.4, noise=0.1, nscale=1.0, bump=0.1)
    cloth = C.mat("team_cloth", "#999999", rough=0.85, noise=0.1, nscale=0.8, bump=0.35, team=True, sheen=0.6)
    paint = C.mat("team_paint", "#999999", rough=0.4, noise=0.06, nscale=0.5, bump=0.06, team=True, coat=0.3)
    wood = C.mat("lwood", "#7a6a58", rough=0.6, noise=0.14, nscale=0.6, bump=0.3, stripes=2.0)
    dark = C.mat("slit", "#0e0d0d", rough=0.8, noise=0.0, bump=0)
    eye = C.mat("heye", "#141110", rough=0.2, noise=0.0, bump=0)

    bones = Hs.bones()
    bones.update(BODY.bones(root_parent="h_body"))
    rig = C.Rig("knight_rig", bones, yaw_deg=YAW)

    # ---------------- horse
    Hs.body(rig, coat, sock, hoof, mane)
    # hack: eyes use the dark eye material
    cap = C.blobs("caparison", [
        ((0, 0, 47.5), (20.8, 10.3, 11.6)),
        ((16, 0, 47.0), (9.4, 10.0, 12.0)),
        ((-15.5, 0, 49.0), (11.8, 10.9, 12.6)),
        ((-18.5, 0, 55.0), (8.2, 9.4, 6.4)),
        ((11, 0, 56.0), (8.6, 6.8, 6.2)),
        ((2, 0, 36.0), (22.0, 10.4, 4.8)),
        ((-15, 0, 35.5), (12.8, 11.2, 5.2)),
        ((17, 0, 35.5), (9.8, 10.4, 5.2)),
    ], cloth, res=0.7)
    C.displace(cap, 0.9, 0.9)
    C.team(cap)
    rig.skin(cap, ["h_body", "h_pelvis", "h_foreS_F", "h_foreS_B", "h_hindT_F", "h_hindT_B"], soft=4.0,
             bias={"h_foreS_F": 5.0, "h_foreS_B": 5.0, "h_hindT_F": 5.0, "h_hindT_B": 5.0})
    trim = C.blobs("cap_trim", [((0, 0, 32.2), (22.4, 10.6, 1.0)), ((-15, 0, 31.8), (13.1, 11.4, 1.0)),
                                ((17, 0, 31.8), (10.1, 10.6, 1.0))], gold, res=0.5)
    rig.skin(trim, ["h_body", "h_pelvis"], soft=4.0)
    saddle = C.blobs("saddle", [((-2.5, 0, 59.2), (8.0, 6.2, 2.0)), ((-9.5, 0, 61.2), (1.8, 5.2, 3.2)),
                                ((4.5, 0, 61.0), (1.8, 4.2, 2.8))], leather, res=0.45)
    rig.skin(saddle, ["h_body", "h_pelvis"], soft=3.0)
    chan = C.blobs("chanfron", [((36.9, 0, 64.8), (2.2, 3.35, 6.4), (0, -0.62, 0)),
                                ((33.8, 0, 70.4), (3.2, 3.9, 2.4))], steel, res=0.4)
    rig.rigid(chan, "h_head")
    crin = C.blobs("crinet", [((20 + 10 * u, 0, 58.8 + 13.5 * u), (3.2, 4.2, 2.6), (0, 0.6, 0))
                              for u in (0.1, 0.45, 0.8)], dsteel, res=0.5)
    rig.skin(crin, ["h_body", "h_neck"], soft=2.0)
    rein = C.tube("rein", [(39.5, -2.6, 60.0), (30, -3.6, 62), (18, -5.0, 64.5), (9.5, -5.2, 66.0)],
                  [0.35] * 4, leather, seg=6)
    rig.skin(rein, ["h_head", "h_neck", "h_body"], soft=3.0)

    # ---------------- rider: plate armour body
    BODY.body(rig, steel, parts=("torso", "arms", "legs"))
    S = lambda x, y, z: (x * k + BODY.offset[0], y * k, z * k + BODY.offset[2])
    sw = BODY.sw / k
    # great helm
    helm = C.lathe("helm", [(0.0, 57.6 * k), (4.0 * k, 57.6 * k), (4.6 * k, 59.0 * k), (4.8 * k, 64.0 * k),
                            (4.5 * k, 67.4 * k), (3.6 * k, 68.6 * k), (0.0, 69.0 * k)], steel, seg=24,
                   scale=(1.12, 0.95, 1.0))
    C.xform(helm, loc=(BODY.offset[0] + 0.8 * k, 0, BODY.offset[2]))
    rig.rigid(helm, "head")
    slit = C.box("slit", 1.2 * k, 8.4 * k, 0.7 * k, dark, bevel=0.15 * k, loc=S(5.2, 0, 64.2))
    rig.rigid(slit, "head")
    cross = C.box("helmcross", 0.9 * k, 1.2 * k, 7.0 * k, gold, bevel=0.2 * k, loc=S(5.8, 0, 61.4))
    rig.rigid(cross, "head")
    plume = C.blobs("plume", [(S(-0.5 - 2.2 * u, 0, 70.4 + 2.2 * math.sin(u * 2.4)),
                               (3.0 - 0.9 * u, 1.9 - 0.5 * u, 2.2 - 0.4 * u)) for u in (0, 0.35, 0.7, 1.0, 1.35)],
                    cloth, res=0.4)
    C.displace(plume, 0.6, 0.5)
    C.team(plume)
    rig.rigid(plume, "head")
    # surcoat: tabard over the torso, skirt over the thighs
    sur = C.blobs("surcoat", [
        (S(0.3, 0, 41.2), (4.4, 6.1, 6.0)),
        (S(-0.2, 0, 47.8), (5.1, 7.1, 6.8)),
        (S(2.0, 0, 50.0), (3.2, 6.6, 3.0)),
        (S(-2.0, 0, 49.0), (3.2, 6.7, 5.6)),
    ], cloth, res=0.45)
    C.team(sur)
    rig.skin(sur, ["hips", "spine", "chest"], soft=2.0 * k)
    skirt = C.blobs("skirt", [(S(0, 0, 36.2), (5.4, 7.0, 3.0)), (S(3.0, -3.8, 30.5), (6.0, 3.2, 3.2)),
                              (S(3.0, 3.8, 30.5), (6.0, 3.2, 3.2))], cloth, res=0.45)
    C.displace(skirt, 0.5, 0.8)
    C.team(skirt)
    rig.skin(skirt, ["hips", "thigh_F", "thigh_B"], soft=2.5 * k)
    belt = C.blobs("kbelt", [(S(-0.1, 0, 38.2), (5.0, 6.7, 0.9))], leather, res=0.4)
    rig.skin(belt, ["hips", "spine"], soft=2 * k)
    for s, y in (("F", -sw), ("B", sw)):
        sg = -1 if s == "F" else 1
        pa = C.blobs("pauldron_" + s, [(S(0, y + sg * 0.5, 54.8), (3.7, 3.5, 3.0)),
                                       (S(0, y + sg * 0.8, 52.4), (3.3, 3.1, 1.7))], steel, res=0.4)
        rig.skin(pa, ["upperarm_" + s], soft=2 * k)
        cou = C.blobs("couter_" + s, [(S(-0.6, y, 43.4), (2.2, 2.3, 2.2))], dsteel, res=0.35)
        rig.skin(cou, ["upperarm_" + s, "forearm_" + s], soft=1 * k)
        hy = sg * BODY.hw / k
        pol = C.blobs("poleyn_" + s, [(S(1.4, hy, 19.4), (2.3, 2.6, 2.3))], dsteel, res=0.35)
        rig.skin(pol, ["thigh_" + s, "shin_" + s], soft=1 * k)
        sab = C.blobs("sabaton_" + s, [(S(0.2, hy, 4.0), (2.2, 2.2, 2.6)), (S(3.4, hy, 1.6), (4.7, 2.2, 1.6))],
                      dsteel, res=0.4)
        rig.skin(sab, ["shin_" + s, "foot_" + s], soft=1.0 * k, bias={"shin_" + s: 1.0 * k})

    # kite shield on the near forearm, modelled for a forearm at SHIELD_FORE degrees
    elbow = (BODY.offset[0], BODY.offset[2] + B.ELBOW * HR)
    sh_parts = kite_shield(k, paint, steel, gold)
    for o in sh_parts:
        C.xform(o, loc=(elbow[0] + 8.0 * k, -BODY.sw - 3.2 * k, elbow[1] - 1.0 * k))
        # rotate about the elbow by -SHIELD_FORE (CCW) so the posed forearm brings it upright
        o.data.transform(__import__("mathutils").Matrix.Translation((elbow[0], 0, elbow[1]))
                         @ __import__("mathutils").Matrix.Rotation(math.radians(SHIELD_FORE), 4, "Y")
                         @ __import__("mathutils").Matrix.Translation((-elbow[0], 0, -elbow[1])))
        rig.rigid(o, "forearm_F")

    # lance in the far fist, along +X
    fist = (FIST[0] * k + BODY.offset[0], BODY.sw, (B.WRIST * 68 + FIST[1]) * k + BODY.offset[2])
    lp = []
    lp.append(C.lathe("lance", [(0.0, -14 * k), (1.3 * k, -14 * k), (1.35 * k, -4 * k), (1.1 * k, 0),
                                (1.25 * k, 4 * k), (0.85 * k, 40 * k), (0.55 * k, 68 * k), (0.0, 69 * k)],
                      wood, seg=12, rot=(0, math.pi / 2, 0)))
    lp.append(C.lathe("vamplate", [(1.0 * k, 3.0 * k), (4.2 * k, 6.5 * k), (3.8 * k, 7.2 * k), (1.0 * k, 5.5 * k)],
                      steel, seg=20, rot=(0, math.pi / 2, 0)))
    lp.append(C.lathe("ltip", [(0.7 * k, 67 * k), (0.9 * k, 68 * k), (0.0, 74 * k)], steel, seg=10,
                      rot=(0, math.pi / 2, 0)))
    # swallow-tailed pennon hanging behind the tip
    pen = pennon(k, cloth)
    C.team(pen)
    lp.append(pen)
    for o in lp:
        C.xform(o, loc=fist)
        rig.rigid(o, "hand_B")
    return dict(rig=rig)


def kite_shield(k, face_mat, rim_mat, boss_mat):
    """Curved kite shield, point down, facing -Y, centred at the origin."""
    import bmesh
    Hh, W = 26.0 * k, 8.2 * k
    rows, cols = 18, 10

    def half_w(v):   # v: 0 top .. 1 point
        if v < 0.12:
            return W * (0.86 + 0.14 * math.sin(v / 0.12 * math.pi / 2))
        return W * (1 - ((v - 0.12) / 0.88) ** 1.25)

    def pt(u, v, off):
        x = u * half_w(v)
        z = Hh * 0.42 - v * Hh + (0.9 * k * (1 - u * u) if v < 0.02 else 0)
        y = 2.6 * k * (x / W) ** 2 + off - 0.9 * k * math.sin(math.pi * min(v, 1))
        return (x, y, z)

    bm = bmesh.new()
    grid = {}
    for side, off in ((0, 0.0), (1, 0.9 * k)):
        for j in range(rows + 1):
            v = j / rows
            for i in range(cols + 1):
                u = -1 + 2 * i / cols
                grid[(side, i, j)] = bm.verts.new(pt(u, v, off))
    for side in (0, 1):
        for j in range(rows):
            for i in range(cols):
                q = [grid[(side, i, j)], grid[(side, i + 1, j)], grid[(side, i + 1, j + 1)], grid[(side, i, j + 1)]]
                bm.faces.new(q if side else list(reversed(q)))
    ring = [(i, 0) for i in range(cols + 1)] + [(cols, j) for j in range(1, rows + 1)] + \
           [(i, rows) for i in range(cols - 1, -1, -1)] + [(0, j) for j in range(rows - 1, 0, -1)]
    for a, b in zip(ring, ring[1:] + ring[:1]):
        try:
            bm.faces.new([grid[(0, *a)], grid[(0, *b)], grid[(1, *b)], grid[(1, *a)]])
        except ValueError:
            pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    face = C.from_bm("shield", bm, face_mat, sharp_deg=60)
    C.team(face)
    # steel rim along the outline
    pts = []
    for j in range(rows + 1):
        pts.append(pt(1, j / rows, -0.2 * k))
    for j in range(rows, -1, -1):
        pts.append(pt(-1, j / rows, -0.2 * k))
    pts += [pt(u, 0, -0.2 * k) for u in (-0.5, 0.0, 0.5, 1.0)]
    rim = C.tube("shield_rim", pts, [0.55 * k] * len(pts), rim_mat, seg=6, caps=False)
    boss = C.sphere("boss", 1.6 * k, boss_mat, loc=(0, -1.3 * k, Hh * 0.05), scale=(1, 0.5, 1))
    return [face, rim, boss]


def pennon(k, mat):
    import bmesh
    bm = bmesh.new()
    L, Hh = 14 * k, 6 * k
    n, m = 10, 4
    vs = {}
    for i in range(n + 1):
        for j in range(m + 1):
            u, v = i / n, j / m
            tail = 0.35 * Hh * (1 - abs(2 * v - 1)) * u      # swallow-tail notch
            x = 60 * k - u * L + (tail if u > 0.6 else 0)
            z = -v * Hh * (1 - 0.35 * u) - 0.8 * k
            y = 1.2 * k * math.sin(u * 5.0 + v)
            vs[(i, j)] = bm.verts.new((x, y, z))
    for i in range(n):
        for j in range(m):
            bm.faces.new([vs[(i, j)], vs[(i + 1, j)], vs[(i + 1, j + 1)], vs[(i, j + 1)]])
    o = C.from_bm("pennon", bm, mat)
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.4 * k
    return o


# ------------------------------------------------------------------------------ poses
def rider_base(lean=0.0, b=0.0):
    return dict(root=(0.0, 0.0), hips=-4 + lean * 0.5, spine=4 + lean + 0.8 * b, chest=2 + lean * 0.5 - 0.5 * b,
                neck=-4 - lean, head=-2 - lean * 0.5,
                footF=(5.0, 7.5, 18.0), footB=(5.0, 7.5, 18.0))


def rider_apply(rig, R):
    BODY.apply(rig, R, rest=False)
    # splay the thighs around the horse (abduct about the forward axis)
    for s, sg in (("F", -1), ("B", 1)):
        pb = rig.obj.pose.bones["thigh_" + s]
        e = pb.rotation_euler
        pb.rotation_euler = (e[0], e[1], math.radians(34 * sg * -1))


def horse_to_rider(HP, pw):
    """World side-plane point -> rider-local coordinates (the rider rides on h_body)."""
    dx, dz = HP.get("h_root", (0.0, 0.0))
    pitch = math.radians(HP.get("h_pitch", 0.0))
    v = (pw[0] - Hs.PIVOT[0] - dx, pw[1] - Hs.PIVOT[1] - dz)
    v = C.rot2(v, -pitch)
    return (v[0] + Hs.PIVOT[0] - BODY.offset[0], v[1] + Hs.PIVOT[1] - BODY.offset[2])


def pose(ctx, clip, t):
    rig = ctx["rig"]
    rig.rest()
    if clip == "idle":
        a = 2 * math.pi * t / 8.0
        HP = Hs.stand()
        HP.update(h_root=(0, 0.3 * math.sin(a)), h_pitch=0.6 * math.sin(a), h_neck=-4 + 4 * math.sin(a - 0.7),
                  h_head=6 + 3 * math.sin(a - 1.4), h_tail=6 * math.sin(a * 2 + 0.3), h_tail2=8 * math.sin(a * 2 - 0.5))
        R = rider_base(0, math.sin(a))
        R.update(absF=(28, SHIELD_FORE, 60), absB=(8, 70 + 2 * math.sin(a), 74 + 2 * math.sin(a - 0.5), 6))
    elif clip == "walk":
        HP, R = gallop(t / 10.0)
    elif clip == "attack":
        HP, R = attack(t)
    elif clip == "hit":
        HP, R = hit(t)
    else:
        HP, R = die(t)
    Hs.apply(rig, HP)
    rider_apply(rig, R)


def gallop(ph):
    HP = {}
    phases = {"hind_B": 0.0, "hind_F": 0.1, "fore_B": 0.32, "fore_F": 0.42}
    for leg, off in phases.items():
        kind = leg.split("_")[0]
        HP[leg] = Hs.gallop_leg(ph - off, kind, stride=34.0, lift=16.0 if kind == "fore" else 12.0) + (0.0,)
    # body: rocking horse motion, highest in the gathered suspension
    rock = math.sin(2 * math.pi * (ph - 0.3))
    HP["h_root"] = (0.0, -1.2 + 2.6 * math.sin(2 * math.pi * (ph - 0.55)))
    HP["h_pitch"] = 5.0 * rock
    HP["h_neck"] = -8 - 9 * rock
    HP["h_head"] = 8 + 6 * math.sin(2 * math.pi * (ph - 0.1))
    HP["h_tail"] = 20 + 8 * math.sin(2 * math.pi * (ph + 0.2))
    HP["h_tail2"] = 12 + 10 * math.sin(2 * math.pi * (ph + 0.05))
    R = rider_base(lean=6)
    # the rider's seat absorbs the motion: counter-rotate the torso a little
    R["hips"] -= 2.5 * rock
    R["spine"] += 2.0 * rock
    R["root"] = (0.0, -0.8 * math.sin(2 * math.pi * (ph - 0.62)))
    R.update(absF=(30, SHIELD_FORE, 60), absB=(14, 88, 16 + 3 * rock, 6))
    return HP, R


def attack(t):
    std = Hs.stand()
    ready_h = dict(std, h_neck=-4, h_head=6, h_tail=6)
    ready_r = dict(rider_base(3), absF=(28, SHIELD_FORE, 60), absB=(10, 80, 30, 6))
    rear_h = dict(h_root=(-3.0, 4.0), h_pitch=16, h_hip=-6, h_neck=-14, h_head=18, h_tail=26, h_tail2=18,
                  fore_F=(24.0, 22.0, -60.0, 20.0), fore_B=(20.0, 16.0, -50.0, 14.0),
                  hind_F=(-13.0, 0.6, Hs.PASTERN_H, 0.0), hind_B=(-15.0, 0.6, Hs.PASTERN_H, 0.0))
    rear_r = dict(rider_base(10), absF=(30, SHIELD_FORE, 60), absB=(-20, 50, 26, 8))
    lunge_h = dict(h_root=(8.0, -3.5), h_pitch=-7, h_hip=2, h_neck=6, h_head=-4, h_tail=14, h_tail2=10,
                   fore_F=(38.0, 0.6, Hs.PASTERN_F + 10, 0.0), fore_B=(33.0, 0.6, Hs.PASTERN_F + 6, 0.0),
                   hind_F=(-14.0, 0.6, Hs.PASTERN_H + 18, 0.0), hind_B=(-20.0, 1.6, Hs.PASTERN_H - 30, 0.0))
    lunge_r = dict(rider_base(16), absF=(34, SHIELD_FORE, 60), absB=(66, 88, -4, 6))
    hold_h = dict(lunge_h, h_root=(9.0, -4.2), h_pitch=-8)
    hold_r = dict(lunge_r, spine=4 + 18, absB=(72, 90, -3, 6))
    rec_h = dict(ready_h, h_root=(4.0, -1.0), h_pitch=-2,
                 fore_F=(28.0, 0.6, Hs.PASTERN_F, 0.0), fore_B=(25.0, 0.6, Hs.PASTERN_F, 0.0))
    rec_r = dict(rider_base(6), absF=(28, SHIELD_FORE, 60), absB=(30, 86, 10, 6))
    kh = [(0, ready_h), (1.5, rear_h), (3.0, dict(rear_h, h_pitch=18, h_root=(-3.5, 5.0))), (3.6, rear_h),
          (4.6, lunge_h), (5.2, hold_h), (6.4, hold_h), (8.5, rec_h), (13, ready_h)]
    kr = [(0, ready_r), (1.5, rear_r), (3.0, dict(rear_r, absB=(-26, 44, 30, 8))), (3.6, rear_r),
          (4.6, lunge_r), (5.2, hold_r), (6.4, hold_r), (8.5, rec_r), (13, ready_r)]
    return B.keyed(kh, t), B.keyed(kr, t)


def hit(t):
    std = dict(Hs.stand(), h_neck=-4, h_head=6)
    flinch = dict(std, h_root=(-4.0, 1.2), h_pitch=6, h_neck=-14, h_head=20, h_tail=20,
                  fore_F=(22.0, 3.0, -10.0, 6.0))
    r0 = dict(rider_base(3), absF=(28, SHIELD_FORE, 60), absB=(10, 80, 30, 6))
    r1 = dict(rider_base(-10), neck=10, head=16, absF=(20, SHIELD_FORE - 10, 60), absB=(-10, 60, 50, 6))
    kh = [(0, std), (1, flinch), (2.2, dict(flinch, h_root=(-3.0, 0.8), h_head=10)), (4, std)]
    kr = [(0, r0), (1, r1), (2.2, dict(r1, head=6)), (4, r0)]
    return B.keyed(kh, t), B.keyed(kr, t)


def die(t):
    std = dict(Hs.stand(), h_neck=-4, h_head=6)
    k1 = dict(std, h_root=(-3.0, 1.0), h_pitch=8, h_neck=-16, h_head=22, h_tail=24)
    kneel = dict(h_root=(2.0, -16.0), h_pitch=-14, h_hip=6, h_neck=-2, h_head=4, h_tail=10, h_tail2=6,
                 fore_F=(14.0, 0.6, -70.0, -10.0), fore_B=(12.0, 0.6, -75.0, -10.0),
                 hind_F=(-18.0, 0.6, Hs.PASTERN_H, 0.0), hind_B=(-20.0, 0.6, Hs.PASTERN_H, 0.0))
    down = dict(h_root=(2.0, -27.0), h_pitch=-3, h_hip=4, h_neck=16, h_head=30, h_tail=-10, h_tail2=-6,
                fore_F=(22.0, 0.6, -80.0, -24.0), fore_B=(20.0, 0.6, -84.0, -24.0),
                hind_F=(-6.0, 0.6, -60.0, 20.0), hind_B=(-8.0, 0.6, -64.0, 20.0))
    bounce = dict(down, h_root=(2.0, -25.5), h_pitch=-1, h_neck=8, h_head=20)
    rest = dict(down, h_root=(2.0, -27.4), h_neck=24, h_head=38)
    kh = [(0, std), (1, k1), (2.6, kneel), (4.0, down), (4.8, bounce), (6.0, rest), (11, rest)]
    HP = B.keyed(kh, t)
    # rider: jolts, pitches back and falls off behind the horse onto the ground
    pz = B.PELV * HR
    seat = (0.0, pz)
    r0 = dict(rider_base(3), absF=(28, SHIELD_FORE, 60), absB=(10, 80, 30, 6))
    r0["pel"] = seat
    r1 = dict(r0, pel=(-1.0, pz + 1.0), spine=-8, neck=10, head=16, absB=(-20, 50, 60, 6))
    world = lambda p: horse_to_rider(HP, p)
    r2 = dict(r1, root_r=38, pel=world((-22.0, 50.0)), spine=-4, absB=(120, 140, 120, 10), absF=(120, 150, 60))
    r3 = dict(r2, root_r=78, pel=world((-40.0, 16.0)), footF=world((-12.0, 26.0)) + (40.0,),
              footB=world((-14.0, 24.0)) + (40.0,))
    r4 = dict(r3, root_r=88, pel=world((-44.0, 5.0)), footF=world((-24.0, 12.0)) + (60.0,),
              footB=world((-26.0, 8.0)) + (60.0,), absB=(200, 230, 160, 10), absF=(200, 230, 60))
    r5 = dict(r4, root_r=84, pel=world((-44.5, 6.8)), head=-12)
    r6 = dict(r4, pel=world((-45.0, 5.0)), footF=world((-22.0, 4.0)) + (70.0,), footB=world((-24.0, 3.0)) + (70.0,))
    for r in (r1, r2):
        r.pop("footF", None), r.pop("footB", None)
    kr = [(0, r0), (1, r1), (2.4, r2), (3.4, r3), (4.2, r4), (5.0, r5), (6.2, r6), (11, r6)]
    R = B.keyed(kr, t)
    if t < 2.4:
        R["footF"] = rider_base()["footF"]
        R["footB"] = rider_base()["footB"]
    return HP, R


DIE_FX = {5: {'s': 0.027, 'origin': (-8, 0), 'spread': 34, 'size': 11.0}, 6: {'s': 0.133, 'origin': (-8, 0), 'spread': 34, 'size': 11.0}, 7: {'s': 0.213, 'origin': (-8, 0), 'spread': 34, 'size': 11.0}, 8: {'s': 0.293, 'origin': (-8, 0), 'spread': 34, 'size': 11.0}, 9: {'s': 0.493, 'origin': (-8, 0), 'spread': 34, 'size': 11.0}, 10: {'s': 0.693, 'origin': (-8, 0), 'spread': 34, 'size': 11.0}, 11: {'s': 0.96, 'origin': (-8, 0), 'spread': 34, 'size': 11.0}}


def clips():
    return [
        P.Clip("idle", range(8), [160] * 8),
        P.Clip("walk", range(10), [60] * 10),
        P.Clip("attack", [0, 0.8, 1.5, 2.3, 3.0, 3.6, 4.2, 4.6, 5.2, 6.4, 7.5, 8.5, 10.5, 13],
               [70, 70, 80, 90, 120, 60, 40, 40, 110, 90, 80, 80, 90, 100], loop=False,
               blur={6: 0.3, 7: 0.25}, impact=8),
        P.Clip("hit", [0, 0.8, 1.6, 2.6, 3.6], [60, 80, 80, 90, 90], loop=False),
        P.Clip("die", [0, 1, 1.8, 2.6, 3.4, 4.0, 4.8, 5.4, 6.0, 7.5, 9, 11],
               [80, 80, 80, 80, 80, 80, 90, 100, 110, 120, 140, 220], loop=False,
               blur={2: 0.2, 3: 0.2}, fx=DIE_FX),
    ]
