"""Drum Shaman: Stone Age support (war drum aura, rock projectile), realistic style. heightLu 66.

A hunched old shaman: weathered skin, a long grey beard, an aurochs skull with curved horns worn
as a headdress, a team-dyed hide cloak over his back and shoulders with a ragged hem, a bone bead
necklace, and a big frame drum slung at his belly (a team-painted rim, a pale stretched hide head,
sinew lacing). A bone drumstick in his near hand. Idle: a slow swaying rhythm. Attack: the stick
rises high and holds, smears down and strikes the drum (the drum jolts, a puff of dust off the
hide; the projectile leaves from the drum head, the per-frame `muzzle`).
"""
import math

from lib import biped as B
from lib import core as C
from lib import mats as M
from lib import motion as MO

SLUG = "drum_shaman"
NAME = "Drum Shaman"
AGE = "stone"
KIND = "unit"
HEIGHT_LU = 66
PX1 = 1.23
SCALE1 = 1.5
H = 60.0
CANVAS = (166, 108)
FEET = (100, 9)
YAW = -24.0
ANCHORS = {"head": (0, 64), "hitCenter": (0, 30)}

BODY = B.Biped(H=H, bulk=0.96)
K = BODY.k
FIST = (0.35 * K, -BODY.sw, 31.0 * K)
DRUM_C = (9.0 * K, -1.0 * K, 38.0 * K)       # drum centre (rest, character space), on the spine bone
DRUM_TILT = math.radians(52)                  # face normal tilted from vertical toward +X
DRUM_R = 8.2 * K
_n = (math.sin(DRUM_TILT), 0.0, math.cos(DRUM_TILT))
DRUM_FACE = (DRUM_C[0] + _n[0] * 2.4 * K, DRUM_C[1], DRUM_C[2] + _n[2] * 2.4 * K)
TRACKERS = {"muzzle": ("drum", DRUM_FACE)}
EXTRA_BONES = {"drum": (DRUM_C, (DRUM_C[0], DRUM_C[1], DRUM_C[2] + 4 * K), "spine"),
               "cloak": ((-4.5 * K, 0, 50.0 * K), (-7.0 * K, 0, 30.0 * K), "chest")}

STANCE = 0.64
STRIDE = 19.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H
SMEAR_COLOR = "#c8bfae"
SMEAR_ALPHA = 0.55
SMEAR_N = 30


def build():
    k = K
    skin = M.skin("#8a6c5c")
    grey = M.hair("#8e867b", name="greyhair")
    beardm = M.hair("#d2cbbf", name="beard")
    leather = M.leather("#4e3f35")
    bone = M.bone("#d6cbb2")
    horn = M.horn("#3f362f")
    rawhide = M.rawhide("#cbbb9c", name="drumhead")
    sinew = M.rope("#8c7a60", name="sinew")
    fur = M.fur("#6d5e50", "#4a3f35")
    hide = M.team_hide()
    paint = M.team_paint()
    eye = M.eye()

    rig = C.Rig("shaman_rig", BODY.bones(extra=EXTRA_BONES), yaw_deg=YAW)
    BODY.body(rig, skin)
    S = lambda x, y, z: (x * k, y * k, z * k)
    bw = BODY.bulk

    # team hide cloak: shoulders and back, hanging to the knees with a ragged hem
    els = [(S(-1.0, 0, 54.0), (4.6, 9.6 * bw, 3.4)), (S(-3.4, 0, 49.0), (3.2, 8.8 * bw, 6.0)),
           (S(-4.6, 0, 41.0), (2.6, 8.4 * bw, 6.0)), (S(-5.4, 0, 33.0), (2.4, 8.2 * bw, 5.4)),
           (S(1.4, -6.2, 54.2), (3.2, 3.2, 2.6)), (S(1.4, 6.2, 54.2), (3.2, 3.2, 2.6))]
    for i in range(7):
        y = -7.5 + 2.5 * i
        els.append((S(-5.8 + 0.5 * (i % 2), y * bw, 26.5 - 1.6 * (i % 3)), (1.6, 1.5, 3.2)))
    cloak = C.blobs("cloak", els, hide, res=0.5)
    C.displace(cloak, 0.45, 0.9)
    C.team(cloak)
    rig.skin(cloak, ["spine", "chest", "neck", "cloak"], soft=2.4 * k, bias={"cloak": 1.0 * k})
    # a fur collar where the cloak ties
    collar = C.blobs("collar", [(S(0.6, 0, 55.4), (4.4, 7.0, 1.8))], fur, res=0.45)
    C.displace(collar, 0.6, 0.6)
    rig.skin(collar, ["chest", "neck"], soft=2 * k)
    # hide loincloth and belt
    loin = C.blobs("loin", [(S(-0.2, 0, 35.8), (5.2 * bw, 7.1 * bw, 2.8)), (S(0.5, 0, 31.8), (5.4 * bw, 7.2 * bw, 3.0))],
                   leather)
    C.displace(loin, 0.35, 1.0)
    rig.skin(loin, ["hips", "thigh_F", "thigh_B"], soft=2.5 * k, bias={"thigh_F": 1.2 * k, "thigh_B": 1.2 * k})
    # bone bead necklace
    for i in range(11):
        a = math.radians(-70 + 14 * i)
        p = S(3.0 + 1.4 * math.cos(a), 4.6 * math.sin(a), 54.6 - 2.6 * math.cos(a))
        rig.rigid(C.sphere("bead", 0.55 * k, bone, seg=8, ring=6, loc=p), "chest")

    # grey hair, a long beard, the aurochs skull headdress
    hair_o = C.blobs("hair", [(S(-1.0, 0, 64.2), (4.8, 4.3, 3.6)), (S(-3.4, 0, 60.4), (3.0, 4.2, 4.6)),
                              (S(-4.2, 0, 56.6), (2.2, 3.6, 3.4))], grey, res=0.4)
    C.displace(hair_o, 0.7, 0.4)
    rig.rigid(hair_o, "head")
    beard = C.blobs("beard", [(S(3.7, 0, 60.0), (2.3, 3.0, 2.4)), (S(4.3, 0, 57.0), (1.9, 2.5, 2.8)),
                              (S(4.6, 0, 53.8), (1.5, 2.0, 2.8)), (S(4.6, 0, 51.0), (1.0, 1.4, 1.8)),
                              (S(2.0, -2.2, 61.2), (1.8, 1.2, 2.2)), (S(2.0, 2.2, 61.2), (1.8, 1.2, 2.2))], beardm, res=0.35)
    C.displace(beard, 0.5, 0.35)
    rig.rigid(beard, "head")
    skull = C.blobs("skull", [(S(-0.2, 0, 69.4), (3.4, 3.0, 1.9)), (S(3.0, 0, 69.0), (2.4, 1.8, 1.3)),
                              (S(5.0, 0, 68.4), (1.4, 1.3, 0.9))], bone, res=0.3)
    C.displace(skull, 0.25, 0.8)
    rig.rigid(skull, "head")
    for y in (-1, 1):
        hn = C.tube("horn", [S(-0.8, 2.4 * y, 70.0), S(-1.8, 5.0 * y, 71.2), S(-1.4, 6.6 * y, 73.8), S(0.4, 6.4 * y, 75.8)],
                    [1.25 * k, 1.0 * k, 0.65 * k, 0.15 * k], horn, seg=10)
        rig.rigid(hn, "head")
        rig.rigid(C.sphere("socket", 0.55 * k, M.dark(), loc=S(2.8, 1.5 * y, 69.4), scale=(0.6, 1, 0.8)), "head")
    for y in (-1.5, 1.5):
        rig.rigid(C.sphere("eye", 0.5 * k, eye, loc=S(4.2, y, 62.8), scale=(0.5, 1, 0.6)), "head")

    for s, y in (("F", -BODY.sw / k), ("B", BODY.sw / k)):
        hy = (-1 if s == "F" else 1) * BODY.hw / k
        wrap = C.blobs("wrap_" + s, [(S(-0.2, hy, 9.8), (2.6, 2.6, 5.4))], fur, res=0.5)
        C.displace(wrap, 0.4, 0.6)
        rig.skin(wrap, ["shin_" + s], soft=2 * k)
        boot = C.blobs("boot_" + s, [(S(0.2, hy, 3.6), (2.1, 2.0, 2.2)), (S(3.0, hy, 1.6), (4.3, 2.1, 1.5))], leather)
        rig.skin(boot, ["shin_" + s, "foot_" + s], soft=1.0 * k, bias={"shin_" + s: 1.0 * k})

    # the drum: frame drum, team-painted rim, pale hide head, sinew lacing on the back, a strap
    drum = []
    rim = C.lathe("rim", [(DRUM_R - 0.9 * k, -2.2 * k), (DRUM_R, -2.2 * k), (DRUM_R + 0.25 * k, 0.0), (DRUM_R, 2.2 * k),
                          (DRUM_R - 0.9 * k, 2.2 * k), (DRUM_R - 0.9 * k, -2.2 * k)], paint, seg=40)
    C.team(rim)
    drum.append(rim)
    head = C.cyl("drumhead", DRUM_R - 0.25 * k, DRUM_R - 0.25 * k, 0.4 * k, rawhide, seg=40, loc=(0, 0, 2.0 * k))
    drum.append(head)
    for i in range(10):
        a = 2 * math.pi * i / 10
        p0 = (0.9 * DRUM_R * math.cos(a), 0.9 * DRUM_R * math.sin(a), -2.3 * k)
        p1 = (0.2 * DRUM_R * math.cos(a + 0.5), 0.2 * DRUM_R * math.sin(a + 0.5), -2.4 * k)
        drum.append(C.tube("lace", [p0, p1], [0.22 * k] * 2, sinew, seg=5))
    for o in drum:
        C.xform(o, rot=(0, DRUM_TILT, 0))
        C.xform(o, loc=DRUM_C)
        rig.rigid(o, "drum")
    strap = C.tube("strap", [S(DRUM_C[0] / k - 2, -4, DRUM_C[2] / k + 5), S(2.0, -5.4, 50.0), S(-1.0, -4.8, 55.6),
                             S(-3.4, 1.0, 55.0)], [0.8 * k] * 4, leather, seg=6, flat=0.4)
    rig.skin(strap, ["spine", "chest"], soft=2 * k)

    # bone drumstick along +X from the near fist, a knob of hide at the tip
    fx, fy, fz = FIST
    st = [C.tube("stick", [(fx - 2.5 * k, fy, fz), (fx + 8 * k, fy, fz + 0.3 * k), (fx + 15.5 * k, fy, fz)],
                 [0.75 * k, 0.6 * k, 0.7 * k], bone, seg=8),
          C.blobs("knob", [((fx + 16.5 * k, fy, fz), (2.0 * k, 1.6 * k, 1.6 * k))], leather, res=0.3)]
    for o in st:
        o["weapon"] = 1
        rig.rigid(o, "hand_F")
    return dict(rig=rig)


# ------------------------------------------------------------------------------------ poses
def stance():
    return dict(root=(0.0, -1.6), hips=-3, spine=-9, chest=-7, neck=10, head=8, footF=(8.0, G0, 0.0),
                footB=(-9.0, G0, 0.0), absF=(28, 70, 40), armB=(28, 64, 10, -6), bones={"drum": 0, "cloak": 0})


def idle(t):
    a = 2 * math.pi * t / 920.0
    P = MO.breathe(stance(), t, amp=1.2, arms=False)
    P["root_dy"] = 2.2 * math.sin(a)                      # a slow sway
    P["twist"] = 4 * math.sin(a)
    P["absF"] = (28 + 8 * math.sin(a + 0.6), 70 + 16 * math.sin(a + 0.4), 40 + 22 * math.sin(a + 0.2))
    P["bones"] = {"drum": 2 * math.sin(a - 0.5), "cloak": 3 * math.sin(a - 1.4)}
    return P


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 3.4, STANCE, G0, lean=10.0, bob=1.2, twist=5.0)
    P.update(chest=-6 - 1.2 * c2, neck=12, head=8 + 1.5 * c2)
    P["absF"] = (20 - 14 * s1, 60 - 10 * s1, 30)
    P["armB"] = (28, 64, 10, -6)
    P["bones"] = {"drum": 3 * c2, "cloak": 6 + 4 * s1}
    return P


def _atk_keys():
    ready = stance()
    raise1 = dict(ready, root=(-1.0, -1.2), spine=-6, chest=-3, neck=8, head=10, absF=(120, 150, 120))
    raise2 = dict(ready, root=(-2.0, -0.6), hips=0, spine=-3, chest=0, neck=6, head=12, absF=(165, 190, 150),
                  footF=(8.5, G0 + 0.8, 8.0), bones={"drum": 0, "cloak": -3})
    raise3 = dict(raise2, absF=(170, 196, 156))
    down = dict(ready, root=(1.0, -2.6), hips=-6, spine=-12, chest=-9, neck=12, head=8, absF=(118, 110, 40),
                bones={"drum": 0, "cloak": 4})
    rec = dict(ready, absF=(40, 80, 50), bones={"drum": -1, "cloak": 2})
    keys = [(0, ready), (65, raise1), (135, raise2), (250, raise3), (270, down), (590, rec), (680, ready)]
    keys = [(tk, B.abs_to_hand(BODY, P)) for tk, P in keys]
    strike = dict(ready, root=(2.0, -3.4), hips=-8, spine=-14, chest=-10, neck=13, head=8,
                  bones={"drum": -6, "cloak": 8})
    strike.pop("absF")
    strike["handF"] = ((5.5, 45.0), -40)
    held = dict(strike, root=(2.1, -3.6), bones={"drum": -4, "cloak": 9}, handF=((5.6, 44.6), -41))
    reb = dict(strike, bones={"drum": 3, "cloak": 5}, handF=((5.0, 48.0), -20))
    keys += [(290, strike), (410, held), (480, reb)]
    return sorted(keys, key=lambda kv: kv[0])


_ATK = _atk_keys()


def pose(ctx, clip, t):
    if clip == "idle":
        P = idle(t)
    elif clip == "walk":
        P = walk(t)
    elif clip == "attack":
        P = B.keyed(_ATK, t)
    elif clip == "hit":
        P = MO.knock_hit(stance(), t, dict(absF=(60, 120, 100), armB=(10, 60, 10, -6), bones={"drum": 8, "cloak": -8}))
    else:
        base = stance()
        base["pel"] = (0.0, B.PELV * H + base.pop("root")[1])
        base.pop("absF")
        base["armF"] = (28, 42, -30)
        P = MO.fall_back(base, t, H, G0)
    BODY.apply(ctx["rig"], P)


def clips():
    cl = MO.biped_clips(attack_blur={3: 20},
                        die_fx=[{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-20, 8], "scale": 0.62}],
                        dust=dict(t0=236, origin=(-20, 0), spread=20, size=8.5))
    atk = cl[2]
    # a puff of dust off the drum hide on the strike
    for i, s in ((4, 0.05), (5, 0.35)):
        atk.fx[i] = {"s": s, "origin": (9, 19), "spread": 5, "n": 7, "size": 3.4, "seed": 9,
                     "color": (0.80, 0.76, 0.68)}
    return cl
