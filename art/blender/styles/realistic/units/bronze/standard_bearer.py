"""Standard Bearer: Bronze Age support (damage aura, throws darts), realistic style. heightLu 70.

A grey-bearded veteran in a conical bronze pilos helmet, a linen cuirass over a team chiton, bronze
greaves and sandals, and a big team cloak pinned at the shoulders that streams behind him. In the
far hand he carries the army's standard: a cedar pole with a crossbar, a long team banner with a
dark fringe and a painted device, crowned by a cast bronze eagle with its wings spread (the aura
reads from far away). The near hand throws darts from a bundle at his belt. Idle: the banner
stirs in the wind. Walk: the standard sways with his stride, the banner and cloak lag. Attack: he
plants and dips the standard forward (the banner waves) while the near arm throws a dart (it leaves
at the per-frame `muzzle`). Die: he falls, the standard topples with him.
"""
import math

from lib import biped as B
from lib import bronze as BZ
from lib import core as C
from lib import mats as M
from lib import motion as MO

SLUG = "standard_bearer"
NAME = "Standard Bearer"
AGE = "bronze"
KIND = "unit"
HEIGHT_LU = 70
PX1 = 1.23
SCALE1 = 1.5
H = 66.5
CANVAS = (186, 156)
FEET = (104, 9)
YAW = -24.0
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32)}

BODY = B.Biped(H=H, bulk=1.0)
K = BODY.k
FIST = (0.35 * K, -BODY.sw, 31.0 * K)
FIST_B = (0.35 * K, BODY.sw, 31.0 * K)
POLE_UP, POLE_DOWN = 70.0, 16.0
DART_F, DART_B = 16.0 * K, 7.0 * K
TRACKERS = {"muzzle": ("hand_F", (FIST[0] + DART_F + 2.5 * K, FIST[1], FIST[2]))}
BX, BY, BZZ = FIST_B
BAN_TOP = BZZ + POLE_UP - 12.0
EXTRA_BONES = {"cloak": ((-4.5 * K, 0, 54.0 * K), (-8.0 * K, 0, 34.0 * K), "chest"),
               "ban0": ((BX, BY, BAN_TOP), (BX, BY, BAN_TOP - 12.0), "hand_B"),
               "ban1": ((BX, BY, BAN_TOP - 12.0), (BX, BY, BAN_TOP - 26.0), "ban0"),
               "ban2": ((BX, BY, BAN_TOP - 26.0), (BX, BY, BAN_TOP - 38.0), "ban1")}

STANCE = 0.62
STRIDE = 24.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
G0 = B.ANKLE * H
SMEAR_COLOR = "#bdb09a"
SMEAR_ALPHA = 0.5
SMEAR_N = 36


def build():
    k = K
    m = BZ.kit()
    skin = M.skin("#8f6b57")
    rig = C.Rig("bearer_rig", BODY.bones(extra=EXTRA_BONES), yaw_deg=YAW)
    BODY.body(rig, skin)
    S = lambda x, y, z: (x * k, y * k, z * k)
    bw = BODY.bulk
    BZ.linothorax(rig, BODY, m, pteruges="linen", skirt="linen_dk", skirt_len=1.15)
    BZ.helmet(rig, k, m, "pilos")
    grey = M.hair("#8a847a", name="greyhair")
    BZ.hair_beard(rig, k, m, hair=grey, beard=True, nape=True)
    BZ.eyes(rig, k, m)
    BZ.greaves(rig, BODY, m)
    BZ.sandals(rig, BODY, m)

    # the team cloak: over both shoulders, falling down the back to the calves, with a dark hem
    els = [(S(-1.2, 0, 54.6), (4.4, 9.4 * bw, 2.4)), (S(-3.8, 0, 49.0), (2.4, 9.0 * bw, 6.0)),
           (S(-5.0, 0, 40.0), (2.0, 8.8 * bw, 6.2)), (S(-6.0, 0, 30.0), (1.8, 8.6 * bw, 6.0)), (S(-6.8, 0, 21.0), (1.6, 8.2 * bw, 4.4)),
           (S(1.0, -6.6, 55.0), (3.0, 3.0, 2.0)), (S(1.0, 6.6, 55.0), (3.0, 3.0, 2.0))]
    cloak = C.blobs("cloak", els, m["team_cloth"], res=0.4)
    C.displace(cloak, 0.5 * k, 0.9)
    C.team(cloak)
    rig.skin(cloak, ["spine", "chest", "cloak"], soft=2.4 * k, bias={"cloak": 1.2 * k, "spine": 1.0 * k})
    hem = C.blobs("cloakhem", [(S(-6.9, 0, 18.4), (1.5, 8.5 * bw, 1.4))], m["leather"], res=0.35)
    rig.skin(hem, ["cloak"], soft=2 * k)
    for y in (-6.2, 6.2):
        rig.rigid(C.sphere("brooch", 1.0 * k, m["polished"], loc=S(2.6, y, 55.2)), "chest")
    # a bundle of darts at the belt
    for i in range(3):
        rig.rigid(C.tube("beltdart", [S(-2.0 + i * 0.8, -7.2, 34.0), S(-4.5 + i * 0.8, -7.4, 48.0)], [0.4 * k] * 2, m["ash"], seg=6), "hips")

    # the standard in the far hand (modelled pointing up from the far fist)
    wood = m["cedar"]
    pole = C.tube("pole", [(BX, BY, BZZ - POLE_DOWN), (BX, BY, BZZ + POLE_UP)], [0.95, 0.85], wood, seg=10)
    rig.rigid(pole, "hand_B")
    rig.rigid(C.tube("ferrule", [(BX, BY, BZZ - POLE_DOWN - 2.5), (BX, BY, BZZ - POLE_DOWN + 1.0)], [0.3, 1.05], m["bronze"], seg=8), "hand_B")
    bar = C.tube("crossbar", [(BX + 1.0, BY, BAN_TOP + 1.5), (BX - 19.5, BY, BAN_TOP + 1.5)], [0.65, 0.6], wood, seg=8)
    rig.rigid(bar, "hand_B")
    for x in (BX + 1.0, BX - 19.5):
        rig.rigid(C.sphere("barknob", 1.0, m["polished"], loc=(x, BY, BAN_TOP + 1.5)), "hand_B")
    # banner: hangs from the crossbar toward the back, skinned to three bones for follow-through
    xs = [BX - 0.6 - 18.0 * i / 6 for i in range(7)]
    rows = []
    import bmesh
    bm = bmesh.new()
    NZ = 10
    grid = []
    for iz in range(NZ + 1):
        v = iz / NZ
        row = []
        for ix, x in enumerate(xs):
            u = ix / 6
            z = BAN_TOP + 0.5 - v * 31.0
            # swallow-tail cut at the bottom edge
            z -= 4.0 * v * abs(u - 0.5) * 2 if v > 0.95 else 0.0
            y = BY + 1.6 * math.sin(u * 7.0 + v * 2.2) * (0.4 + 0.6 * u)
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for iz in range(NZ):
        for ix in range(6):
            bm.faces.new((grid[iz][ix], grid[iz][ix + 1], grid[iz + 1][ix + 1], grid[iz + 1][ix]))
    ban = C.from_bm("banner", bm, m["team_cloth"])
    so = ban.modifiers.new("so", "SOLIDIFY")
    so.thickness = 0.5
    C.apply_mods(ban)
    C.displace(ban, 0.35, 1.8)
    C.team(ban)
    rig.skin(ban, ["ban0", "ban1", "ban2"], soft=5.0)
    # a painted device (a dark sun disc and rays) and a leather fringe along the bottom
    # a painted moon-and-horns device (pale, non-team): a crescent over a disc
    cx_, cz_ = BX - 9.6, BAN_TOP - 13.0
    def on_banner(x, z, lift=0.75):
        u, v = (BX - 0.6 - x) / 18.0, (BAN_TOP + 0.5 - z) / 31.0
        return (x, BY + 1.6 * math.sin(u * 7.0 + v * 2.2) * (0.4 + 0.6 * u) - lift, z)
    arc = [on_banner(cx_ + 5.0 * math.cos(math.radians(a)), cz_ + 1.0 + 5.0 * math.sin(math.radians(a))) for a in range(200, 345, 12)]
    dev = C.tube("device", arc, [0.75] * len(arc), m["blazon"], seg=8)
    dev2 = C.blobs("device2", [(on_banner(cx_, cz_ - 1.2, 0.6), (2.1, 0.35, 2.1))], m["blazon"], res=0.2)
    rig.skin(dev2, ["ban0", "ban1", "ban2"], soft=5.0)
    rig.skin(dev, ["ban0", "ban1", "ban2"], soft=5.0)
    for i in range(9):
        x = BX - 1.5 - 16.5 * i / 8
        fr = C.tube("fringe", [(x, BY, BAN_TOP - 30.2), (x, BY, BAN_TOP - 33.8)], [0.4, 0.25], m["leather"], seg=5)
        rig.skin(fr, ["ban1", "ban2"], soft=5.0)
    # the cast bronze eagle, wings spread in the camera plane
    ex, ez = BX, BZZ + POLE_UP + 1.0
    eagle = [C.blobs("eaglebody", [((ex, BY, ez + 3.0), (2.0, 1.8, 3.4)), ((ex + 1.4, BY, ez + 7.0), (1.5, 1.4, 1.6)),
                                   ((ex + 3.0, BY, ez + 6.6), (1.1, 0.6, 0.5)), ((ex - 1.8, BY, ez + 0.2), (1.6, 1.0, 1.2))],
                     m["polished"], res=0.22)]
    for s in (-1, 1):
        pts = [(ex - 0.4, BY + 0.5 * s, ez + 4.5), (ex - 3.0, BY + 3.0 * s, ez + 8.5), (ex - 5.5, BY + 5.0 * s, ez + 12.5),
               (ex - 8.5, BY + 6.0 * s, ez + 14.0)]
        eagle.append(BZ.ribbon("wing", pts, [4.0, 5.0, 4.2, 1.5], m["polished"], thick=0.6, up=(1, 0, -0.4), center=0.7))
    eagle.append(C.lathe("eaglebase", [(0.0, -1.2), (2.2, -1.0), (1.6, 0.4), (1.9, 1.0), (0.0, 1.2)], m["bronze"], seg=16,
                         loc=(ex, BY, ez - 0.6)))
    for o in eagle:
        rig.rigid(o, "hand_B")

    dart = BZ.spear(m, FIST, DART_F, DART_B, r=0.42 * k, head=2.6 * k, name="dart")
    for o in dart:
        o["weapon"] = 1
        rig.rigid(o, "hand_F")
    return dict(rig=rig, dart=dart)


# ------------------------------------------------------------------------------------ poses
def banner(a, sway=0.0, drag=0.0):
    """Banner bone angles: `a` a phase for the ripple, sway/drag from the body's motion."""
    return {"ban0": (drag * 0.5 + 3 * math.sin(a), 10 * math.sin(a + 0.3) + sway),
            "ban1": (drag * 0.3 + 4 * math.sin(a - 1.0), 16 * math.sin(a - 0.9) + sway * 0.6),
            "ban2": (drag * 0.2 + 5 * math.sin(a - 2.0), 22 * math.sin(a - 1.9) + sway * 0.3)}


def stance(breath=0.0):
    return dict(root=(0.0, -1.4), hips=0, spine=-2, chest=-2 - 0.8 * breath, neck=1, head=-6 - 0.5 * breath,
                footF=(9.5, G0, 0.0), footB=(-10.0, G0, 0.0),
                absF=(18, 70, 60, 4), handB=((5.0, 37.0), 0), bones={"cloak": 0})


def idle(t):
    a = 2 * math.pi * t / 920.0
    b = math.sin(a)
    P = stance(breath=1.3 * b)
    P["root"] = (0.0, -1.4 - 0.35 * b)
    P["root_dy"] = 1.2 * math.sin(a + 0.8)
    P["hips"] += 1.0 * math.sin(a + 0.8)
    P["head"] += 2.0 * math.sin(a + 0.3)
    P["handB"] = ((5.0 + 0.4 * math.sin(a - 0.6), 37.0 + 0.4 * b), 1.5 * math.sin(a - 1.0))
    P["absF"] = (18 + 2 * math.sin(a - 0.5), 70 + 3 * math.sin(a - 0.9), 60, 4)
    P["bones"] = dict(banner(a), cloak=3 * math.sin(a - 1.3))
    return P


def walk(t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 4.2, STANCE, G0, lean=4.0)
    P["handB"] = ((6.0 + 1.0 * s1, 37.0 - 0.8 * c2), -2 - 2.5 * s1)
    P["armF"] = MO.arm_swing(s1, "F", amp=18)
    P["bones"] = dict(banner(2 * math.pi * ph * 2, sway=-6 - 3 * c2, drag=-6), cloak=-10 - 5 * c2)
    return P


def _atk_keys():
    ready = stance()
    b0 = banner(0.0)
    plant = dict(root=(-1.5, -2.0), hips=-3, spine=-5, chest=-4, neck=2, head=-2, footF=(11.0, G0, 4.0), footB=(-10.5, G0, 0.0),
                 absF=(-30, 60, 40, 4), handB=((3.0, 38.0), 6), bones=dict(banner(0.6, sway=6), cloak=4))
    cock = dict(root=(-3.4, -1.4), hips=-7, spine=-11, chest=-8, neck=4, head=0, footF=(12.0, G0 + 1.0, 12.0),
                footB=(-11.0, G0, 0.0), absF=(-120, -150, -148, 4), handB=((1.0, 39.0), 10), bones=dict(banner(1.2, sway=12, drag=8), cloak=10))
    cock2 = dict(cock, root=(-3.6, -1.3), absF=(-124, -154, -150, 4))
    whip = dict(root=(1.5, -2.8), hips=6, spine=5, chest=2, neck=-3, head=-5, footF=(13.0, G0, 2.0),
                footB=(-10.5, G0 + 0.4, -10.0), absF=(160, 175, 178, 4), handB=((8.0, 38.0), -12), bones=dict(banner(2.0, sway=-8, drag=-6), cloak=-6))
    release = dict(root=(4.0, -4.2), hips=12, spine=9, chest=4, neck=-6, head=-8, footF=(14.5, G0, 0.0),
                   footB=(-10.5, G0 + 0.8, -16.0), absF=(98, 94, 90, 4), handB=((13.0, 38.0), -26), bones=dict(banner(2.6, sway=-18, drag=-12), cloak=-14))
    follow = dict(root=(4.6, -5.2), hips=16, spine=12, chest=5, neck=-7, head=-8, footF=(14.5, G0, 0.0),
                  footB=(-10.0, G0 + 1.0, -18.0), absF=(30, 20, 10, 4), handB=((14.0, 38.0), -30), bones=dict(banner(3.4, sway=-10, drag=-6), cloak=-10))
    rec = dict(root=(2.0, -2.6), hips=7, spine=5, chest=2, neck=-4, head=-6, footF=(11.0, G0, 0.0),
               footB=(-10.0, G0, -4.0), absF=(20, 70, 60, 4), handB=((8.0, 37.5), -10), bones=dict(banner(4.2, sway=4), cloak=2))
    keys = MO.flip_torso([(65, plant), (135, cock), (250, cock2), (268, whip), (290, release), (430, follow), (560, rec)])
    return [(0, dict(ready, bones=dict(b0, cloak=0)))] + keys + [(680, dict(ready, bones=dict(banner(0.0), cloak=0)))]


_ATK = _atk_keys()


def hit(t):
    P = MO.knock_hit(stance(), t, dict(absF=(40, 100, 90, 4), bones=dict(banner(1.0, sway=14, drag=10), cloak=12)))
    h = B.keyed([(0, {"h": (5.0, 37.0, 0.0)}), (55, {"h": (0.0, 39.0, 14.0)}), (140, {"h": (1.0, 38.0, 8.0)}),
                 (310, {"h": (5.0, 37.0, 0.0)})], t)["h"]
    P["handB"] = ((h[0] + P["root"][0], h[1]), h[2])
    return P


def die(t):
    base = stance()
    base["pel"] = (0.0, B.PELV * H + base.pop("root")[1])
    base.pop("absF")
    base.pop("handB")
    base["armF"] = (24, 60, 50)
    base["armB"] = (10, 60, 0, -4)
    P = MO.fall_back(base, t, H, G0)
    # the standard is still gripped: the pole tips back with him and lies along the ground
    w = B.keyed([(0, {"f": (10.0, 60.0, -70.0)}), (120, {"f": (0.0, 40.0, -30.0)}), (238, {"f": (-22.0, 28.0, 0.0)}),
                 (290, {"f": (-18.0, 30.0, 0.0)}), (360, {"f": (-24.0, 26.0, 0.0)}), (695, {"f": (-24.0, 26.0, 0.0)})], t)["f"]
    P["armB"] = (w[0], w[1], w[2], -4)
    P["bones"] = dict(banner(0.0, sway=B.keyed([(0, {"s": 0.0}), (238, {"s": 30.0}), (695, {"s": 40.0})], t)["s"]), cloak=20)
    return P


def pose(ctx, clip, t):
    gone = (clip == "attack" and 280 <= t < 560) or (clip == "die" and t >= 100)
    for o in ctx["dart"]:
        o.hide_render = gone
    if clip == "die" and t <= 0.0:
        clip = "idle"          # the first death frame matches the idle pose (no pop)
    P = {"idle": idle, "walk": walk, "hit": hit, "die": die}.get(clip)
    BODY.apply(ctx["rig"], P(t) if P else B.keyed(_ATK, t))


def clips():
    return MO.biped_clips(attack_blur={3: 24},
                          die_fx=[{"id": "fx.dust_poof", "atMs": 595, "offsetLu": [-22, 8], "scale": 0.8}],
                          dust=dict(t0=236, origin=(-24, 0), spread=24, size=9.5))
