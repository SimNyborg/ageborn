"""Sabertooth: Stone Age epic skirmisher (bite, pounce), realistic style. heightLu 60.

A heavily built sabre-toothed cat (Smilodon): massive shoulders and forelimbs, a short bobtail, a
broad head with a pale muzzle and two long ivory sabres. A tawny coat with faint darker stripes. It
wears a team-dyed war pelt strapped over its back and a leather collar hung with bone teeth. It
runs in a bounding gallop with a flexing spine. Attack: a pounce-bite (crouch, rear back with the
jaws wide and hold, a smeared lunge down, a held clamping bite, a shake, recovery). Hit: a flinch
with a snarl. Die: the legs buckle and it crashes onto its side in a cloud of dust.
"""
import math

from lib import core as C
from lib import mats as M
from lib import motion as MO
from lib import game as G
from lib.quad import Quad
from lib import biped as B

SLUG = "sabertooth"
NAME = "Sabertooth"
AGE = "stone"
KIND = "unit"
HEIGHT_LU = 60
PX1 = 1.23
SCALE1 = 1.5
CANVAS = (172, 92)
FEET = (92, 8)
YAW = -12.0
ANCHORS = {"head": (8, 58), "hitCenter": (0, 28)}

S_ = 1.12      # model scale (authored at shoulder ~44 lu)
FORE = [(14, 52), (17, 31), (18.5, 12), (19.5, 3.8), (23.5, 0.9)]
HIND = [(-20, 45), (-12, 29), (-23.5, 15), (-21.5, 3.8), (-18.0, 0.9)]
Q = Quad([(x * S_, z * S_) for x, z in FORE], [(x * S_, z * S_) for x, z in HIND], (0, 40 * S_), 5.8 * S_,
         neck=((18 * S_, 47 * S_), (27 * S_, 51 * S_)), head=((27 * S_, 51 * S_), (40 * S_, 46 * S_)),
         tail=((-27 * S_, 45 * S_), (-32 * S_, 40 * S_), (-34 * S_, 34 * S_)),
         jaw=((30 * S_, 45 * S_), (40 * S_, 41.5 * S_)), prefix="c_")
TRACKERS = {"fangTip": ("c_head", (39.0 * S_, -1.5 * S_, 37.0 * S_))}
BLUR_BONES = None

DUTY = 0.36
STRIDE = 21.0 * S_
WALK = {"strideLu": STRIDE / DUTY * math.cos(math.radians(YAW))}
SMEAR_COLOR = "#cbbca4"


def build():
    s = S_
    # AD pass: a darker tawny coat with real countershading (pale throat, chest and belly) and dark
    # markings, so the cat reads as a big predator and not a plush toy
    coat = M.coat("#846a52", "#6c5642", name="coat", noise=0.14, nscale=2.6)
    coat_far = M.coat("#6a5644", "#584636", name="coat_far", noise=0.14, nscale=2.6)   # far legs sit in shadow
    belly = M.coat("#bba68c", "#a8927a", name="belly")
    dark = M.coat("#4e3e32", "#40342a", name="stripe")
    ivory = M.ivory()
    nose = C.mat("nose", "#2c2522", rough=0.4, noise=0.1, bump=0.1)
    gum = C.mat("gum", "#5a3a36", rough=0.5, noise=0.1, bump=0.1)
    claw = M.horn("#3a332e", name="claw")
    leather = M.leather("#4b3b30")
    bone = M.bone()
    hide = M.team_hide()
    eye = C.mat("cateye", "#8a7a3a", rough=0.15, noise=0.05, bump=0, coat=1.0)
    S = lambda x, y, z: (x * s, y * s, z * s)
    A = lambda a, b, c: (a * s, b * s, c * s)

    rig = C.Rig("cat_rig", Q.bones(), yaw_deg=YAW)
    p = Q.p
    body = C.blobs("cat_body", [
        (S(12, 0, 39), A(12.5, 10.0, 12.0)),        # shoulders / chest
        (S(13, 0, 47), A(8.5, 8.0, 5.5)),           # hump
        (S(0, 0, 39), A(17, 8.8, 9.5)),             # barrel
        (S(-16, 0, 39.5), A(10.5, 8.6, 9.2)),       # hips
        (S(-19, 0, 45), A(7.0, 7.6, 4.6)),          # croup
        (S(1, 0, 32), A(14, 7.8, 5.0)),             # belly
        (S(21, 0, 45.5), A(7.5, 7.0, 8.2), (0, -0.7, 0)),   # neck
        (S(17, 0, 30), A(6.5, 9.2, 7.0)),           # forelimb masses
        (S(-15, 0, 31), A(7.5, 9.0, 8.0)),          # thigh masses
    ], coat, res=0.7)
    C.displace(body, 0.35 * s, 0.6)
    rig.skin(body, [p + "body", p + "pelvis", p + "neck", p + "foreS_F", p + "foreS_B", p + "hindT_F", p + "hindT_B"],
             soft=3.0 * s, bias={p + "foreS_F": 3.0 * s, p + "foreS_B": 3.0 * s, p + "hindT_F": 3.0 * s,
                                  p + "hindT_B": 3.0 * s, p + "neck": 1.0 * s})
    # countershading: a pale throat, chest and belly just proud of the coat
    under = C.blobs("underside", [
        (S(21.5, 0, 41.5), A(6.2, 6.0, 5.8), (0, -0.7, 0)),     # throat
        (S(15.5, 0, 33.5), A(8.0, 8.0, 5.6)),                   # chest
        (S(1, 0, 30.4), A(14.2, 7.0, 3.6)),                     # belly
    ], belly, res=0.5)
    rig.skin(under, [p + "body", p + "neck", p + "pelvis"], soft=3.0 * s, bias={p + "neck": 1.0 * s})
    # dark stripes on the flanks below the pelt, the shoulder and the thigh (visible at game size)
    for i, (x, z, h) in enumerate(((-21, 38, 5.0), (-16.5, 36.5, 5.5), (-11.5, 35.5, 5.0), (8.5, 36, 4.8), (13, 38, 5.2))):
        st = C.blobs(f"stripe{i}", [(S(x, -8.6, z), A(1.0, 1.6, h), (0, 0.25, 0)),
                                    (S(x, 8.6, z), A(1.0, 1.6, h), (0, 0.25, 0))], dark, res=0.3)
        rig.skin(st, [p + "body", p + "pelvis"], soft=3 * s)
    head = C.blobs("cat_head", [
        (S(31.5, 0, 50.5), A(6.8, 5.9, 5.5)),       # cranium
        (S(29.5, 0, 47), A(6.4, 6.8, 5.4)),         # cheeks / jowls
        (S(37.8, 0, 47.8), A(5.2, 3.8, 3.5)),       # muzzle (long, deep)
        (S(33.5, 0, 45.4), A(5.6, 5.4, 3.6)),       # heavy lower jowls
        (S(41.3, 0, 48.5), A(1.6, 2.2, 1.6)),       # nose pad
        (S(34.5, 0, 52.2), A(3.5, 3.6, 1.6)),       # brow
        (S(27.0, -3.9, 54.6), A(1.2, 0.6, 1.3), (0, -0.5, 0)),    # small, swept-back ears
        (S(27.0, 3.9, 54.6), A(1.2, 0.6, 1.3), (0, -0.5, 0)),
    ], coat, res=0.45)
    rig.rigid(head, p + "head")
    muzzle = C.blobs("muzzle_pale", [(S(38.4, 0, 46.8), A(3.8, 3.7, 2.2)), (S(34, 0, 44.6), A(4.2, 4.6, 1.8))], belly, res=0.35)
    rig.rigid(muzzle, p + "head")
    rig.rigid(C.sphere("nosepad", 1.1 * s, nose, loc=S(42.4, 0, 49.0), scale=(0.8, 1.4, 0.8)), p + "head")
    for y in (-2.9, 2.9):
        rig.rigid(C.sphere("eye", 0.95 * s, eye, loc=S(36.4, y, 51.0), scale=(0.7, 0.5, 0.6)), p + "head")
        # sabres: long curved ivory canines from the upper jaw
        fang = C.tube("sabre", [S(37.0, y * 0.62, 45.5), S(38.0, y * 0.58, 42.0), S(38.6, y * 0.55, 38.6),
                                S(38.2, y * 0.52, 36.2)], [0.95 * s, 0.85 * s, 0.6 * s, 0.1 * s], ivory, seg=8, flat=0.6)
        rig.rigid(fang, p + "head")
    jaw = C.blobs("jaw", [(S(34.5, 0, 42.8), A(5.2, 3.4, 1.7)), (S(38.5, 0, 42.8), A(2.0, 2.4, 1.3))], belly, res=0.35)
    rig.rigid(jaw, p + "jaw")
    mouth = C.blobs("mouth", [(S(35.5, 0, 44.2), A(4.2, 2.6, 1.0))], gum, res=0.3)
    rig.rigid(mouth, p + "jaw")
    tail = C.blobs("tail", [(S(-26.5, 0, 44), A(2.8, 2.6, 3.0)), (S(-29.8, 0, 40.5), A(2.2, 2.0, 3.0)),
                            (S(-31.4, 0, 37.0), A(1.6, 1.5, 1.8))], coat, res=0.35)
    rig.skin(C.blobs("tailtip", [(S(-31.6, 0, 36.2), A(1.5, 1.4, 1.6))], dark, res=0.3), [p + "tail2"], soft=2 * s)
    rig.skin(tail, [p + "tail", p + "tail2"], soft=2 * s)

    for sd, y in Q.Y.items():
        yy = y / s
        fore = C.blobs("fore_" + sd, [
            (S(17.5, yy, 24.0), A(5.4, 4.4, 8.0)),
            (S(18.3, yy, 14.0), A(4.1, 3.8, 5.4)),
            (S(19.2, yy, 6.5), A(2.9, 2.9, 3.4)),
            (S(21.4, yy, 2.5), A(4.3, 3.5, 2.5)),
        ], coat if sd == "F" else coat_far, res=0.4)
        rig.skin(fore, Q.leg_bones("fore", sd), soft=1.2 * s, bias={p + "foreS_" + sd: 2.0 * s})
        hind = C.blobs("hind_" + sd, [
            (S(-15.5, yy, 30.5), A(5.8, 4.2, 8.5), (0, 0.4, 0)),
            (S(-18.5, yy, 20.0), A(4.0, 3.4, 6.0), (0, -0.6, 0)),
            (S(-22.5, yy, 9.5), A(2.4, 2.4, 5.6)),
            (S(-20.0, yy, 2.3), A(3.8, 3.0, 2.3)),
        ], coat if sd == "F" else coat_far, res=0.4)
        rig.skin(hind, Q.leg_bones("hind", sd), soft=1.2 * s, bias={p + "hindT_" + sd: 2.0 * s})
        for i in range(3):
            rig.rigid(C.sphere("claw", 0.5 * s, claw, loc=S(24.3, yy + (i - 1) * 1.3, 1.2), scale=(1.4, 0.7, 0.7)),
                      p + "foreP_" + sd)

    # team war pelt strapped over the back (ragged edges), strap under the belly; bone-tooth collar
    PELT = [(S(2, 0, 47.3), A(16, 10.2, 2.4)), (S(-6, 0, 46.6), A(11.5, 10.4, 2.3)),
            (S(4, -9.3, 40.5), A(11.5, 1.3, 6.2)), (S(4, 9.3, 40.5), A(11.5, 1.3, 6.2)),
            (S(-8, -9.1, 41.2), A(7.5, 1.3, 4.8)), (S(-8, 9.1, 41.2), A(7.5, 1.3, 4.8))]
    pelt = C.blobs("pelt", PELT, hide, res=0.45)
    C.displace(pelt, 0.45 * s, 0.9)
    # a dark leather hem just proud of the pelt edge, and a row of rawhide fringe tassels
    hem = C.blobs("pelt_hem", [(c, M.hem_axes(a, 0.9 * s)) for c, a in PELT], leather, res=0.45)
    rig.skin(hem, [p + "body", p + "pelvis"], soft=4 * s)
    fringe_m = M.rawhide("#6e5a46", name="fringe")
    for sd in (-1, 1):
        for k in range(9):
            x = -13 + 3.3 * k
            z0 = 34.6 if -11 < x < 17 else 36.0
            fr = C.tube("fringe", [S(x, sd * 10.0, z0 + 0.8), S(x - 0.4, sd * 10.2, z0 - 2.6)], [0.42 * s, 0.26 * s],
                        fringe_m, seg=5)
            rig.skin(fr, [p + "body", p + "pelvis"], soft=4 * s)
    C.team(pelt)
    rig.skin(pelt, [p + "body", p + "pelvis"], soft=4 * s)
    strap = C.blobs("girth", [(S(6, 0, 38.5), A(1.6, 10.2, 11.2))], leather, res=0.45)
    rig.skin(strap, [p + "body"], soft=3 * s)
    collar = C.blobs("collar", [(S(22, 0, 44.5), A(3.2, 7.0, 7.6), (0, -0.6, 0))], leather, res=0.4)
    rig.skin(collar, [p + "neck", p + "body"], soft=3 * s)
    for i in range(7):
        a = math.radians(-60 + 20 * i)
        pt = S(24.8 + 1.6 * math.cos(a), 6.8 * math.sin(a), 38.8 - 0.8 * math.cos(a))
        rig.rigid(C.cyl("tooth", 0.5 * s, 0.05 * s, 2.4 * s, bone, seg=6, loc=pt, rot=(0, math.pi * 0.95, 0)), p + "neck")
    return dict(rig=rig)


# ------------------------------------------------------------------------------------ poses
def stand():
    P = dict(root=(0.0, 0.0), pitch=0.0, hip=0.0, neck=0.0, head=0.0, jaw=0.0, tail=0.0, tail2=0.0, roll=0.0)
    P.update(Q.stand(1.8))
    return P


def idle(t):
    a = 2 * math.pi * t / 920.0
    P = stand()
    P["root"] = (0.3 * math.sin(a), -0.5 + 0.5 * math.sin(a))
    P["pitch"] = 0.8 * math.sin(a + 0.4)
    P["neck"] = 3 * math.sin(a - 0.6)
    P["head"] = -2 + 3 * math.sin(a - 1.2)
    P["jaw"] = -2 - 2 * max(0.0, math.sin(a - 2.0))
    P["tail"] = 10 * math.sin(a - 1.0)
    P["tail2"] = 12 * math.sin(a - 1.8)
    return P


def walk(t):
    ph = (t / 576.0) % 1.0
    P = stand()
    offs = {"hind_B": 0.0, "hind_F": 0.1, "fore_B": 0.5, "fore_F": 0.6}
    for key, o in offs.items():
        kind = key.split("_")[0]
        x, z, pa = Q.step(ph - o, kind, STRIDE, 11.0 * S_, duty=DUTY, fold=85 if kind == "fore" else 70, reach=5,
                          sink=12)
        P[key] = (x, z, pa, 0.0)
    w = 2 * math.pi * ph
    P["root"] = (1.5 * math.sin(w), 2.4 + 2.6 * math.sin(w - 0.9))       # bound: up in the flight phase
    P["pitch"] = 5.5 * math.sin(w + 0.7)                                  # spine rock
    P["hip"] = -7 * math.sin(w + 0.2)                                     # spine flex
    P["neck"] = -3 - 4 * math.sin(w + 1.6)
    P["head"] = -3 + 5 * math.sin(w + 1.2)
    P["tail"] = 18 + 10 * math.sin(w - 0.6)
    P["tail2"] = 10 * math.sin(w - 1.4)
    return P


def _atk_keys():
    ready = stand()
    crouch = dict(stand(), root=(-2.0, -4.0), pitch=-3, hip=6, neck=-6, head=-4, jaw=-6, tail=12)
    crouch.update({k: (v[0] - 1.5, v[1], v[2] + 6, 0) for k, v in Q.stand(1.8).items()})
    rear = dict(stand(), root=(-6.0, 1.0), pitch=16, hip=-8, neck=10, head=14, jaw=-38, tail=24, tail2=10)
    rear.update({"fore_F": (Q.HOME["fore"] + 2, 9.0 * S_, Q.LAST["fore"] - 60, 12),
                 "fore_B": (Q.HOME["fore"] - 2, 5.0 * S_, Q.LAST["fore"] - 40, 6),
                 "hind_F": (Q.HOME["hind"] - 3, Q.TOE_Z["hind"], Q.LAST["hind"] + 14, 0),
                 "hind_B": (Q.HOME["hind"] - 1, Q.TOE_Z["hind"], Q.LAST["hind"] + 14, 0)})
    rear2 = dict(rear, root=(-6.5, 1.6), pitch=18, jaw=-42)
    lunge = dict(stand(), root=(6.0, -2.0), pitch=-8, hip=4, neck=-8, head=-18, jaw=-30, tail=14)
    lunge.update({"fore_F": (Q.HOME["fore"] + 10, 3.0, Q.LAST["fore"] - 30, -10),
                  "fore_B": (Q.HOME["fore"] + 6, 1.5, Q.LAST["fore"] - 20, -6),
                  "hind_F": (Q.HOME["hind"] - 6, Q.TOE_Z["hind"], Q.LAST["hind"] - 20, 0),
                  "hind_B": (Q.HOME["hind"] - 4, Q.TOE_Z["hind"], Q.LAST["hind"] - 20, 0)})
    bite = dict(stand(), root=(9.0, -6.5), pitch=-13, hip=6, neck=-12, head=-24, jaw=-4, tail=8)
    bite.update({"fore_F": (Q.HOME["fore"] + 12, Q.TOE_Z["fore"], Q.LAST["fore"] + 16, 0),
                 "fore_B": (Q.HOME["fore"] + 8, Q.TOE_Z["fore"], Q.LAST["fore"] + 16, 0),
                 "hind_F": (Q.HOME["hind"] - 5, Q.TOE_Z["hind"], Q.LAST["hind"] - 12, 0),
                 "hind_B": (Q.HOME["hind"] - 3, Q.TOE_Z["hind"], Q.LAST["hind"] - 12, 0)})
    shake = dict(bite, root=(8.4, -6.0), neck=-6, head=-30, jaw=-2, roll=5, tail=-4)
    shake2 = dict(bite, root=(8.8, -6.6), neck=-14, head=-20, jaw=-3, roll=-4, tail=12)
    rec = dict(stand(), root=(3.0, -2.0), pitch=-4, neck=-4, head=-6, jaw=-8, tail=6)
    return [(0, ready), (65, crouch), (135, rear), (250, rear2), (268, lunge), (290, bite), (400, shake),
            (470, shake2), (580, rec), (680, ready)]


_ATK = _atk_keys()


def hit(t):
    base = stand()
    k = dict(base, root=(-5.0, -2.0), pitch=6, hip=-4, neck=8, head=12, jaw=-26, tail=30)
    k2 = dict(k, root=(-4.2, -2.4), neck=0, head=4, jaw=-20)
    return B.keyed([(0, base), (55, k), (140, k2), (310, base)], t)


def die(t):
    """Legs give way: the cat drops onto its chest, sprawls and the head hits the ground."""
    base = stand()
    buck = dict(stand(), root=(-3.0, -9.0), pitch=8, hip=-4, neck=12, head=18, jaw=-30, tail=24, roll=-4)
    buck.update({k: (v[0], v[1], v[2] + 35, 0) for k, v in Q.stand(1.8).items()})
    sprawl = {"fore_F": (Q.HOME["fore"] + 16, 3.0, Q.LAST["fore"] - 70, -20), "fore_B": (Q.HOME["fore"] + 11, 3.0, Q.LAST["fore"] - 60, -16),
              "hind_F": (Q.HOME["hind"] - 18, 3.0, Q.LAST["hind"] + 70, 20), "hind_B": (Q.HOME["hind"] - 13, 3.0, Q.LAST["hind"] + 60, 16)}
    fall = dict(buck, root=(-5.0, -20.0), pitch=2, roll=-12, neck=0, head=-2, jaw=-24, tail=10)
    fall.update(sprawl)
    down = dict(fall, root=(-6.0, -29.0), pitch=-4, roll=-20, neck=-20, head=-12, jaw=-14, tail=-6)
    bounce = dict(down, root=(-6.0, -27.5), neck=-14, head=-6)
    rest = dict(down, root=(-6.2, -29.4), neck=-22, head=-14, jaw=-10, tail=-10)
    return B.keyed([(0, base), (50, buck), (140, fall), (238, down), (290, bounce), (360, rest), (695, rest)], t)


def pose(ctx, clip, t):
    P = {"idle": idle, "walk": walk, "hit": hit, "die": die}.get(clip)
    Q.apply(ctx["rig"], P(t) if P else B.keyed(_ATK, t))


def clips():
    die_c = G.Clip("die", MO.DIE_MS, extra={
        "fx": [{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-6, 8], "scale": 0.9}], "hideUnitAtMs": 695})
    die_c.fx = MO.dust_frames(die_c, 236, origin=(-4, 0), spread=34, size=11.0, seed=7)
    return [
        G.Clip("idle", MO.IDLE_MS, loop=True),
        G.Clip("walk", [72] * 8, loop=True),
        G.Clip("attack", MO.ATTACK_MS, impact=4, smear=3, times=MO.ATTACK_TIMES),
        G.Clip("hit", MO.HIT_MS, times=MO.HIT_TIMES),
        die_c,
    ]
