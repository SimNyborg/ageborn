"""Longbowman: Medieval Age ranged (longbow, arrow projectile), realistic style. heightLu 68.

A wiry English-style archer: a brown wool hood with a long liripipe tail over his shoulders, a
team-dyed quilted livery jack with full sleeves, a leather belt with a hanging arrow bag of
goose-fletched shafts at the near hip, a leather bracer on the bow arm, wool hose and ankle boots.
The yew longbow is as tall as he is (pale sapwood back, darker heartwood belly, horn nocks) and is
held in the far hand. Attack: reach for an arrow, nock and raise, a full draw to the cheek (held;
the limbs bend), release (the string snaps back, the arrow is gone: the projectile leaves from the
arrow rest, the per-frame `muzzle`), the draw hand flies back past the ear, the bow arm kicks and
settles. Hit: knocked back. Die: a heavy fall on his back; the bow falls with him.
"""
import math

from lib import biped as B
from lib import core as C
from lib import mats as M
from lib import medieval as MD
from lib import motion as MO

SLUG = "longbowman"
NAME = "Longbowman"
AGE = "medieval"
KIND = "unit"
HEIGHT_LU = 68
PX1 = 1.23
SCALE1 = 1.5
H = 66.0
CANVAS = (176, 124)
FEET = (84, 10)
YAW = -24.0
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32), "muzzle": (33, 34)}

BODY = B.Biped(H=H, bulk=0.95)
K = BODY.k
FIST_B = (0.35 * K, BODY.sw, 31.0 * K)
FIST_LOCAL = (0.35 * K, 31.0 * K - B.WRIST * H)     # fist from the wrist, rest pose
BOW = 31.0 * K                 # half length of the bow
BRACE = 7.0 * K                # brace height (grip to string)
ARROW = 30.0 * K
REST = (FIST_B[0] + 1.2 * K, FIST_B[1], FIST_B[2] + 1.0 * K)     # arrow rest on the grip
NOCK0 = (FIST_B[0] - BRACE, FIST_B[1], FIST_B[2] + 1.0 * K)
TRACKERS = {"muzzle": ("hand_B", REST)}
EXTRA_BONES = {
    "bow_top": ((FIST_B[0], FIST_B[1], FIST_B[2] + 4.0 * K), (FIST_B[0] - 4.0 * K, FIST_B[1], FIST_B[2] + BOW), "hand_B"),
    "bow_bot": ((FIST_B[0], FIST_B[1], FIST_B[2] - 4.0 * K), (FIST_B[0] - 4.0 * K, FIST_B[1], FIST_B[2] - BOW), "hand_B"),
    "nock": (NOCK0, (NOCK0[0] - 3.0 * K, NOCK0[1], NOCK0[2]), "hand_B"),
    "liripipe": ((-4.2 * K, 0, 60.0 * K), (-6.0 * K, 0, 48.0 * K), "head"),
}

STANCE = 0.62
STRIDE = 25.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H


def build():
    k = K
    skin = M.skin("#a88468")
    hair = M.hair("#4a3626")
    eye = M.eye()
    team = C.mat("team_jack", "#999999", rough=0.9, noise=0.1, nscale=1.0, bump=0.8, team=True, sheen=0.45, stripes=3.4)
    hood = MD.wool("#6a5846", name="hood", dark="#5c4c3c")
    hose = MD.wool("#5a5048", name="hose", dark="#4c443c")
    leather = M.leather("#4e3c30")
    bracer = M.leather("#3e3028", name="bracer")
    yew = C.mat("yew", "#9c7650", rough=0.45, noise=0.14, nscale=1.4, bump=0.2, stripes=4.0, ramp2="#7e5a3a", coat=0.3)
    horn = M.horn("#d9ccb0", name="nockhorn")
    string = M.rope("#cfc4a8", name="string")
    shaft = M.wood("#b8a078", "#a08a66", name="shaft", stripes=6)
    fletch = M.feather("#d6d0c2", name="fletch")
    ahead = MD.dark_steel(name="arrowhead")
    bag = M.leather("#5a4636", name="arrowbag")

    rig = C.Rig("longbow_rig", BODY.bones(extra=EXTRA_BONES), yaw_deg=YAW)
    parts = MD.dressed_body(rig, BODY, skin, team, hose, torso_mat=team, glove=skin)
    for nm in ("arm_F", "arm_B", "torso"):
        C.team(parts[nm])
    Sx = MD.S(k)
    bw = BODY.bulk
    # the quilted jack: a padded shell to the hips with a short skirt
    jack = C.blobs("jack", [(Sx(0.5, 0, 41.2), (4.9 * bw, 6.4 * bw, 6.4)), (Sx(-0.1, 0, 47.8), (5.4 * bw, 7.1 * bw, 7.0)),
                            (Sx(2.2, 0, 50.4), (3.2, 6.4 * bw, 3.2)), (Sx(-0.2, 0, 34.0), (5.6 * bw, 7.4 * bw, 3.6))],
                   team, res=0.35 * k)
    C.displace(jack, 0.25 * k, 1.2)
    C.team(jack)
    rig.skin(jack, ["hips", "spine", "chest", "thigh_F", "thigh_B"], soft=2.0 * k, bias={"thigh_F": 2.5 * k, "thigh_B": 2.5 * k})
    for s, y in (("F", -BODY.sw / k), ("B", BODY.sw / k)):
        sl = C.blobs("sleeve_" + s, [(Sx(0.0, y, 50.0), (3.2, 3.1, 4.8)), (Sx(0.2, y, 40.0), (2.7, 2.6, 4.0))], team, res=0.3 * k)
        C.team(sl)
        rig.skin(sl, ["upperarm_" + s, "forearm_" + s, "chest"], soft=1.4 * k, bias={"chest": 3.0 * k})
    br = C.blobs("bracer", [(Sx(0.3, BODY.sw / k, 36.4), (2.3, 2.3, 2.6))], bracer, res=0.25 * k)
    rig.skin(br, ["forearm_B"], soft=1.4 * k)
    MD.belt(rig, BODY, leather, z=36.2, bulk=1.14)
    MD.boots(rig, BODY, leather, high=False)
    MD.face(rig, BODY, hair, eye, beard=M.hair("#5a4432", name="stubble"), moustache=False, hair="short")
    # the hood: a cowl around the head and a shoulder cape; the liripipe tail follows through
    hd = C.blobs("hood", [(Sx(-0.4, 0, 65.0), (5.2, 4.6, 4.6)), (Sx(-1.4, 0, 60.6), (4.4, 4.9, 4.0)),
                          (Sx(4.8, 0, 62.0), (3.4, 3.4, 3.8), None, -1)], hood, res=0.3 * k)
    rig.skin(hd, ["head", "neck"], soft=1.2 * k, bias={"neck": 3.0 * k})
    cape = C.blobs("capelet", [(Sx(-0.6, 0, 55.4), (5.6, 8.6, 2.6)), (Sx(-2.2, 0, 52.8), (3.6, 7.8, 3.0)),
                               (Sx(2.0, -4.4, 54.4), (2.9, 3.4, 2.2)), (Sx(2.0, 4.4, 54.4), (2.9, 3.4, 2.2))], hood, res=0.3 * k)
    C.displace(cape, 0.35 * k, 1.2)
    rig.skin(cape, ["chest", "neck"], soft=1.8 * k, bias={"neck": 2.0 * k})
    lp = C.tube("liripipe", [Sx(-4.0, 0, 63.0), Sx(-5.6, 0, 58.0), Sx(-6.4, 0, 52.0), Sx(-6.6, 0, 46.0)],
                [1.5 * k, 1.1 * k, 0.8 * k, 0.5 * k], hood, seg=8)
    rig.skin(lp, ["head", "liripipe"], soft=1.5 * k, bias={"head": 2.5 * k})
    # arrow bag at the near hip with fletchings showing
    bx, by, bz = Sx(-2.6, -8.2, 31.0)
    bg = C.blobs("bag", [((bx, by, bz), (2.3 * k, 1.9 * k, 6.0 * k))], bag, res=0.3 * k)
    MD.rot_about(bg, (bx, by, bz), 18, "Y")
    rig.rigid(bg, "hips")
    for i in range(5):
        dx, dy = (i - 2) * 0.7 * k, (i % 2 - 0.5) * 1.0 * k
        f = C.blobs("bagfletch", [((bx + 2.4 * k + dx, by + dy, bz + 7.4 * k), (0.5 * k, 0.4 * k, 1.8 * k))], fletch, res=0.2 * k)
        MD.rot_about(f, (bx, by, bz), 18, "Y")
        rig.rigid(f, "hips")

    # the longbow in the far fist: a D-section yew stave, limbs on their own bones
    gx, gy, gz = FIST_B
    pts, radii = [], []
    for i in range(25):
        u = -1 + 2 * i / 24                     # -1 bottom tip .. 1 top tip
        z = gz + u * BOW
        x = gx - 0.9 * BRACE * u * u            # braced: the tips curve toward the archer
        pts.append((x, gy, z))
        radii.append(k * (1.05 - 0.6 * abs(u) ** 1.4))
    bow = C.tube("bow", pts, radii, yew, seg=10, flat=0.8)

    def bow_w(p):
        u = (p[2] - gz) / BOW
        if u > 0.12:
            return {"bow_top": 1.0}
        if u < -0.12:
            return {"bow_bot": 1.0}
        t = (u + 0.12) / 0.24
        return {"hand_B": 1.0 - abs(2 * t - 1), "bow_top": max(0.0, 2 * t - 1), "bow_bot": max(0.0, 1 - 2 * t)}
    MD.skin_fn(rig, bow, bow_w)
    for sgn, bn in ((1, "bow_top"), (-1, "bow_bot")):
        tip = (gx - 0.9 * BRACE, gy, gz + sgn * BOW)
        rig.rigid(C.sphere("hornnock", 0.55 * k, horn, loc=(tip[0], tip[1], tip[2] - sgn * 0.6 * k), scale=(1, 1, 1.6)), bn)
    rig.rigid(C.tube("bowgrip", [(gx, gy, gz - 2.4 * k), (gx, gy, gz + 2.4 * k)], [1.2 * k] * 2, leather, seg=10), "hand_B")
    # the string: tip - nock - tip, the middle carried by the nock bone
    tipx = gx - 0.9 * BRACE
    sp = [(tipx + (NOCK0[0] - tipx) * (1 - abs(u)), gy, gz + u * (BOW - 0.4 * k) + (1 - abs(u)) * 1.0 * k)
          for u in [x / 12 for x in range(-12, 13)]]
    st = C.tube("string", sp, [0.16 * k] * len(sp), string, seg=5)

    def str_w(p):
        u = (p[2] - gz - 1.0 * k) / BOW
        w = max(0.0, 1 - abs(u) / 0.98)
        return {"nock": w, "bow_top" if u > 0 else "bow_bot": 1 - w}
    MD.skin_fn(rig, st, str_w)
    # the nocked arrow, on the nock bone
    nx, ny, nz = NOCK0
    arrow = [C.tube("arrow", [(nx, ny, nz), (nx + ARROW, ny, nz)], [0.24 * k] * 2, shaft, seg=6),
             C.cyl("arrowhead", 0.55 * k, 0.02, 2.6 * k, ahead, seg=6, loc=(nx + ARROW, ny, nz), rot=(0, math.pi / 2, 0))]
    for sgn in (-1, 1, 0):
        f = C.blobs("fletch", [((nx + 3.0 * k, ny + 0.5 * k * sgn, nz + (0.6 * k if sgn == 0 else -0.3 * k)), (2.6 * k, 0.15 * k, 0.55 * k))],
                    fletch, res=0.15 * k)
        arrow.append(f)
    for o in arrow:
        rig.rigid(o, "nock")
    return dict(rig=rig, arrow=arrow)


# ------------------------------------------------------------------------------------ poses
def aim(P, draw, bend=None, hand_wa=92.0, follow=None):
    """Bow arm from P['absB']; places the nock (draw lu behind the brace) and the draw hand on it.
    `follow` (dx, dz) replaces the draw hand target after the release."""
    (gx, gz), ha = MD.arm_fist(BODY, P, "B", FIST_LOCAL)
    a = math.radians(ha)
    nx = gx + (-BRACE - draw) * math.cos(a) - 1.0 * K * math.sin(a)
    nz = gz + (-BRACE - draw) * math.sin(a) + 1.0 * K * math.cos(a)
    b = bend if bend is not None else 12.0 * draw / (20.0 * K)
    bones = dict(P.get("bones", {}))
    bones.update({"bow_top": b, "bow_bot": -b})
    P["bones"] = bones
    P["_nock"] = (-draw, 0.0, 0.0)
    tx, tz = (nx, nz) if follow is None else (nx + follow[0], nz + follow[1])
    # the near hand is 2 x sw in front of the bow plane: same screen point
    tx, tz = B.far_grip(tx, tz, -2 * BODY.sw, YAW)
    wa = math.radians(hand_wa)
    fl = C.rot2(FIST_LOCAL, wa)
    P["handF"] = ((tx - fl[0], tz - fl[1]), hand_wa)
    return P


def stance(breath=0.0):
    return dict(root=(0.0, -1.2), hips=0, spine=-1 + breath, chest=-1 - 0.6 * breath, neck=0, head=-5,
                footF=(8.5, G0, 0.0), footB=(-9.5, G0, 0.0),
                absB=(14 + breath, 44, 64, -4), armF=(-6, 18, 6, 4), bones={"liripipe": 0})


def idle(t):
    a = 2 * math.pi * t / 920.0
    P = MO.breathe(stance(), t, amp=1.0, arms=False)
    P["absB"] = (14 + 2 * math.sin(a - 0.6), 44 + 3 * math.sin(a - 1.0), 64 + 3 * math.sin(a - 1.3), -4)
    P["armF"] = (-6 + 2 * math.sin(a - 0.5), 18 + 3 * math.sin(a - 0.9), 6, 4)
    P["bones"] = {"liripipe": 5 * math.sin(a - 1.6), "bow_top": 0, "bow_bot": 0}
    return P


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 4.2, STANCE, G0, lean=4.0)
    P["absB"] = (16 + 2 * c2, 48 - 3 * c2, 64 + 3 * s1, -4)
    P["armF"] = MO.arm_swing(s1, "F", amp=22)
    P["bones"] = {"liripipe": -8 - 6 * c2, "bow_top": 0, "bow_bot": 0}
    return P


ATK_T = [0, 83, 166, 266, 433, 516, 599, 699]


def attack(t):
    ready = stance()
    reach = dict(root=(-0.5, -1.6), hips=-2, spine=-3, chest=-2, neck=1, head=-4, footF=(9.0, G0, 0.0),
                 footB=(-10.0, G0, 0.0), absB=(40, 70, 30, -4), armF=(-24, 40, 30, 8), bones={"liripipe": 3})
    nock = dict(root=(-1.0, -1.8), hips=-3, spine=-3, chest=-4, neck=2, head=-3, footF=(10.0, G0, 0.0),
                footB=(-10.5, G0, 0.0), absB=(72, 86, 6, -4), bones={"liripipe": 6})
    full = dict(root=(-2.0, -2.0), hips=-4, spine=-5, chest=-6, neck=3, head=-2, footF=(10.5, G0, 0.0),
                footB=(-11.0, G0, 0.0), absB=(84, 90, 4, -4), bones={"liripipe": 8})
    rel = dict(full, root=(-2.6, -2.0), spine=-6, chest=-8, neck=4, head=0, absB=(86, 94, 12, -4), bones={"liripipe": 14})
    fol = dict(full, root=(-2.2, -2.0), spine=-5, chest=-6, absB=(80, 90, 10, -4), bones={"liripipe": 4})
    low = dict(ready, root=(-1.0, -1.6), absB=(46, 70, 34, -4), armF=(-10, 30, 10, 4), bones={"liripipe": -4})
    back = dict(ready, absB=(20, 50, 58, -4), bones={"liripipe": 2})
    keys = [(0, ready), (83, reach), (166, nock), (266, full), (400, dict(full, root=(-2.1, -2.0))), (433, rel),
            (516, fol), (599, low), (699, back), (799, ready)]
    P = B.keyed([(tk, {kk: v for kk, v in p.items() if kk not in ("armF",)}) for tk, p in keys], t)
    # the draw hand: FK arm before the nock is on the string, on the nock after
    if t < 150:
        P["armF"] = B.keyed([(0, {"a": (-6, 18, 6, 4)}), (83, {"a": (-24, 40, 30, 8)}), (150, {"a": (20, 110, 90, 8)})], t)["a"]
        P["bones"] = dict(P["bones"], bow_top=0, bow_bot=0)
        P["_nock"] = (0.0, 0.0, 0.0)
        P["_arrow"] = False
        return P
    if t < 433:
        d = B.keyed([(150, {"d": 0.0}), (166, {"d": 3.0 * K}), (266, {"d": 21.0 * K}), (433, {"d": 21.5 * K})], t)["d"]
        P = aim(P, d)
        P["_arrow"] = True
        return P
    # released: the string is back at brace (a small overshoot vibration), the hand flies back past the ear
    vib = B.keyed([(433, {"v": -1.6}), (480, {"v": 1.0}), (516, {"v": -0.4}), (600, {"v": 0.0})], t)["v"]
    fo = B.keyed([(433, {"x": -6.0, "z": 2.0}), (516, {"x": -9.0, "z": 1.0}), (599, {"x": -2.0, "z": -12.0}),
                  (699, {"x": 0.0, "z": -16.0})], t)
    P = aim(P, 0.0, bend=vib, follow=None)
    if t < 600:
        fist = P["handF"]
        (wx, wz), wa = fist
        P["handF"] = ((wx - 21.5 * K + fo["x"], wz + fo["z"]), wa)
    else:
        P.pop("handF")
        P["armF"] = B.keyed([(599, {"a": (4, 60, 40, 6)}), (699, {"a": (-4, 26, 10, 4)}), (799, {"a": (-6, 18, 6, 4)})], t)["a"]
    P["_nock"] = (vib * 0.4, 0.0, 0.0)
    P["_arrow"] = False
    return P


def hit(t):
    P = MO.knock_hit(stance(), t, dict(absB=(-4, 30, 70, -4), armF=(-30, 30, 10, 14)))
    P["bones"] = dict(P.get("bones", {}), liripipe=B.keyed([(0, {"l": 0}), (55, {"l": 18}), (140, {"l": -6}), (310, {"l": 0})], t)["l"])
    return P


def die(t):
    base = stance()
    base["pel"] = (0.0, B.PELV * H + base.pop("root")[1])
    base.pop("absB")
    base["armB"] = (14, 30, 40, -4)
    P = MO.fall_back(base, t, H, G0)
    P["bones"] = {"liripipe": B.keyed([(0, {"l": 0}), (185, {"l": 30}), (238, {"l": 60}), (290, {"l": 40}), (360, {"l": 70}), (695, {"l": 70})], t)["l"]}
    return P


def pose(ctx, clip, t):
    P = {"idle": idle, "walk": walk, "attack": attack, "hit": hit, "die": die}[clip](t)
    nock = P.pop("_nock", (0.0, 0.0, 0.0))
    show_arrow = P.pop("_arrow", False)
    BODY.apply(ctx["rig"], P)
    ctx["rig"].set("nock", loc=nock)
    for o in ctx["arrow"]:
        o.hide_render = not show_arrow


def clips():
    from lib import game as G
    die_c = G.Clip("die", MO.DIE_MS, extra={"fx": [{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-22, 8], "scale": 0.7}],
                                             "hideUnitAtMs": 695})
    die_c.fx = MO.dust_frames(die_c, 236, origin=(-24, 0), spread=22, size=9.5)
    return [
        G.Clip("idle", MO.IDLE_MS, loop=True),
        G.Clip("walk", MO.WALK_MS, loop=True),
        G.Clip("attack", [83, 83, 100, 167, 83, 83, 100, 100], impact=4, times=ATK_T),
        G.Clip("hit", MO.HIT_MS, times=MO.HIT_TIMES),
        die_c,
    ]
