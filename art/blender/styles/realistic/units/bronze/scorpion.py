"""Scorpion: Bronze Age artillery (a bolt that pierces 3 targets), realistic style. heightLu 76.

A wheeled torsion bolt-thrower: a cedar carriage on two six-spoked wheels with bronze hubs and a
studded rim, a long trail with push handles and a prop leg, and on a pivot the weapon itself: a
long grooved stock, a torsion frame up front with team-painted side plates, two twisted sinew
skeins capped with bronze washers, two swept bow arms (team), a taut string, a heavy bolt with a
bronze head and pale fletching, and a windlass with a crank at the back. A crewman in a leather cap
and a team tunic works it; a team pennant flies from a pole on the trail.

Walk: he leans into the handles and pushes it along (the wheels roll at the ground speed).
Attack: crank, crank (the string winds back), aim (held), release (the arms whip forward, the frame
kicks and the bolt leaves at the per-frame `muzzle`), a recoil bounce, a new bolt and cranking.
Die: the carriage tips back, the near wheel comes off, the crewman is thrown on his back.
"""
import math

import bpy

from lib import biped as B
from lib import bronze as BZ
from lib import core as C
from lib import game as G
from lib import mats as M
from lib import motion as MO

SLUG = "scorpion"
NAME = "Scorpion"
AGE = "bronze"
KIND = "unit"
HEIGHT_LU = 76
PX1 = 1.23
SCALE1 = 1.5
CANVAS = (184, 100)
FEET = (92, 10)
YAW = -12.0
ANCHORS = {"head": (-20, 74), "hitCenter": (0, 32)}

WR = 14.0                      # wheel radius
TRACK = 11.5                   # wheel half-track
AX = 0.0                       # axle x
PIV = (2.0, 0.0, 33.0)         # the weapon's pivot on the carriage
SZ = 37.0                      # stock top (the bolt groove)
HOUSE_X = 26.0                 # torsion frame
SPRING_Y = 6.5
ARM_L = 15.0
REST_DRAW, FULL_DRAW = 20.0, -6.0     # nock x at rest (string forward) and fully drawn
BOLT_L = 34.0
WINCH = (-23.0, 35.0)          # windlass axle (x, z)
CRANK_R = 4.2
CREW_X = -44.0

CREW = B.Biped(H=64.0, bulk=1.0)
CREW.root = "crew"
CREW.offset = (CREW_X, 0.0, 0.0)
CK = CREW.k
G0 = B.ANKLE * CREW.H

TRACKERS = {"muzzle": ("nock", (REST_DRAW + BOLT_L + 1.0, 0.0, SZ + 1.4))}
STANCE = 0.62
STRIDE = 24.0
WALK = {"strideLu": STRIDE * math.cos(math.radians(YAW)) / STANCE}
WALK_CYCLE = 800.0
ROLL_PER_MS = STRIDE / STANCE / WALK_CYCLE          # char-space lu the cart travels per ms of the walk

BONES = {"root": ((0, 0, 0), (0, 0, 4), None),
         "cart": ((AX, 0, WR), (AX + 10, 0, WR), "root"),
         "wheel_F": ((AX, -TRACK, WR), (AX, -TRACK, WR + 6), "cart"),
         "wheel_B": ((AX, TRACK, WR), (AX, TRACK, WR + 6), "cart"),
         "gun": (PIV, (PIV[0] + 10, 0, PIV[2]), "cart"),
         "spring_F": ((HOUSE_X, -SPRING_Y, SZ - 6), (HOUSE_X, -SPRING_Y, SZ + 8), "gun"),
         "spring_B": ((HOUSE_X, SPRING_Y, SZ - 6), (HOUSE_X, SPRING_Y, SZ + 8), "gun"),
         "nock": ((REST_DRAW, 0, SZ + 1.4), (REST_DRAW - 6, 0, SZ + 1.4), "gun"),
         "crank": ((WINCH[0], 0, WINCH[1]), (WINCH[0], 0, WINCH[1] + 4), "gun"),
         "pole": ((-30, 5, 24), (-30, 5, 60), "cart"),
         "flag": ((-30.5, 5, 72), (-44, 5, 70), "pole")}


def _wheel(m, y, name):
    parts = []
    felloe = C.lathe(name + "felloe", [(WR - 2.2, -1.3), (WR, -1.4), (WR + 0.3, 0.0), (WR, 1.4), (WR - 2.2, 1.3), (WR - 2.2, -1.3)],
                     m["cedar"], seg=48)
    C.xform(felloe, rot=(math.pi / 2, 0, 0), loc=(AX, y, WR))
    parts.append(felloe)
    for i in range(12):
        a = 2 * math.pi * i / 12
        stud = C.sphere(name + "stud", 0.6, m["bronze"], seg=8, ring=6, loc=(AX + (WR + 0.25) * math.cos(a), y, WR + (WR + 0.25) * math.sin(a)))
        parts.append(stud)
    for i in range(6):
        a = 2 * math.pi * i / 6 + 0.26
        parts.append(C.tube(name + "spoke", [(AX + 2.0 * math.cos(a), y, WR + 2.0 * math.sin(a)),
                                             (AX + (WR - 1.8) * math.cos(a), y, WR + (WR - 1.8) * math.sin(a))], [0.95, 0.7], m["cedar"], seg=8))
    hub = C.lathe(name + "hub", [(0.0, -3.2), (1.6, -3.2), (2.6, -1.6), (2.8, 0.0), (2.6, 1.6), (1.6, 3.2), (0.0, 3.2)], m["bronze"], seg=20)
    C.xform(hub, rot=(math.pi / 2, 0, 0), loc=(AX, y, WR))
    parts.append(hub)
    return parts


def build():
    m = BZ.kit()
    k = CK
    bones = dict(BONES)
    bones.update(CREW.bones(root_parent="root"))
    rig = C.Rig("scorpion_rig", bones, yaw_deg=YAW)
    ctx = dict(rig=rig)
    wood, dark = m["cedar"], M.wood("#57402e", "#443224", name="darkwood")

    # ---- carriage: axle, two side cheeks rising to the pivot, the trail with handles and a prop leg
    rig.rigid(C.tube("axle", [(AX, -TRACK - 2, WR), (AX, TRACK + 2, WR)], [1.4, 1.4], dark, seg=10), "cart")
    for y in (-5.0, 5.0):
        rig.rigid(C.box("cheek", 14.0, 1.6, 20.0, wood, bevel=0.4, loc=(AX + 2.0, y, WR + 8.0), rot=(0, math.radians(-8), 0)), "cart")
        rig.rigid(C.tube("trail", [(AX + 6.0, y, WR + 2.0), (AX - 14.0, y * 0.9, 18.0), (-28.0, y * 0.7, 20.5), (-34.0, y * 0.6, 23.5)],
                         [1.5, 1.4, 1.3, 1.1], wood, seg=10), "cart")
        rig.rigid(C.tube("handle", [(-34.0, y * 0.6, 23.5), (-38.5, y * 0.6, 25.0)], [0.9, 0.8], m["leather"], seg=8), "cart")
        rig.rigid(C.tube("brace", [(AX - 2.0, y, WR + 14.0), (AX - 14.0, y * 0.9, 18.2)], [0.9, 0.9], wood, seg=8), "cart")
    for x in (-8.0, -22.0):
        rig.rigid(C.tube("rung", [(x, -4.5, 18.4 + (x + 8) * -0.1), (x, 4.5, 18.4 + (x + 8) * -0.1)], [0.8, 0.8], wood, seg=8), "cart")
    rig.rigid(C.tube("prop", [(-28.0, 0, 19.0), (-29.5, 0, 0.8)], [1.1, 0.9], dark, seg=8), "cart")
    rig.rigid(C.tube("propfoot", [(-29.5, -2.0, 0.8), (-29.5, 2.0, 0.8)], [0.9, 0.9], m["bronze"], seg=8), "cart")
    for y in (-TRACK, TRACK):
        for o in _wheel(m, y, "w" + ("F" if y < 0 else "B")):
            rig.rigid(o, "wheel_F" if y < 0 else "wheel_B")
    # the pennant on the trail
    rig.rigid(C.tube("pole", [(-30, 5, 19), (-30, 5, 76)], [0.7, 0.6], wood, seg=8), "pole")
    rig.rigid(C.sphere("finial", 1.1, m["polished"], loc=(-30, 5, 76.6)), "pole")
    fl = BZ.ribbon("pennant", [(-30.4, 5, 74.5), (-36, 5, 74.0), (-42, 5, 73.2), (-48.5, 5, 72.2)], [6.5, 5.6, 4.0, 1.2],
                   m["team_cloth"], thick=0.4, up=(0, 0, 1), center=1.0)
    C.displace(fl, 0.3, 1.5)
    C.team(fl)
    rig.rigid(fl, "flag")

    # ---- the weapon: stock with a groove, torsion frame, skeins, arms, string, windlass
    stock = C.box("stock", 50.0, 3.6, 3.2, wood, bevel=0.4, loc=(4.0, 0, SZ - 1.6))
    rig.rigid(stock, "gun")
    rig.rigid(C.box("groove", 46.0, 1.0, 0.6, dark, bevel=0.1, loc=(5.0, 0, SZ + 0.05)), "gun")
    rig.rigid(C.box("gunbase", 8.0, 6.0, 3.0, dark, bevel=0.5, loc=(PIV[0], 0, PIV[2] + 0.4)), "gun")
    # torsion frame: top and bottom beams, team side plates, bronze washers, skeins
    for z in (SZ - 6.5, SZ + 8.5):
        rig.rigid(C.box("beam", 5.0, 18.0, 2.2, wood, bevel=0.4, loc=(HOUSE_X, 0, z)), "gun")
    for y in (-9.8, 9.8):
        pl = C.box("plate", 5.0, 1.0, 13.0, m["team_paint"], bevel=0.35, loc=(HOUSE_X, y, SZ + 1.0))
        C.team(pl)
        rig.rigid(pl, "gun")
        for z in (SZ - 5.0, SZ + 7.0):
            rig.rigid(C.sphere("rivet", 0.55, m["polished"], loc=(HOUSE_X + 2.2, y - 0.8 * (1 if y < 0 else -1), z)), "gun")
    for s, y in (("F", -SPRING_Y), ("B", SPRING_Y)):
        sk = C.tube("skein", [(HOUSE_X, y, SZ - 5.6), (HOUSE_X, y, SZ + 1.0), (HOUSE_X, y, SZ + 7.6)], [2.0, 2.3, 2.0], M.rope("#b5a282", name="sinew"), seg=12)
        C.displace(sk, 0.25, 1.5)
        rig.rigid(sk, "spring_" + s)
        for z in (SZ - 7.9, SZ + 9.9):
            rig.rigid(C.cyl("washer", 2.8, 2.8, 1.0, m["bronze"], seg=20, loc=(HOUSE_X, y, z)), "gun")
        # the bow arm leaves the skein sideways and sweeps back
        sg = -1 if y < 0 else 1
        tip = (HOUSE_X - ARM_L * 0.75, y + sg * ARM_L * 0.75, SZ + 4.5)
        arm = C.tube("bowarm", [(HOUSE_X, y, SZ + 1.0), (HOUSE_X - 1.5, y + sg * 5.5, SZ + 2.2), (HOUSE_X - 5.5, y + sg * 9.0, SZ + 3.6), tip],
                     [1.7, 1.5, 1.2, 0.8], m["team_paint"], seg=10)
        C.team(arm)
        rig.rigid(arm, "spring_" + s)
        rig.rigid(C.sphere("armtip", 0.8, m["bronze"], loc=tip), "spring_" + s)
        ctx["tip_" + s] = tip
        # string half: from the arm tip to the nock (skinned between the arm and the nock)
        n0 = (REST_DRAW, 0.0, SZ + 1.4)
        pts = [(tip[0] + (n0[0] - tip[0]) * u, tip[1] + (n0[1] - tip[1]) * u, tip[2] + (n0[2] - tip[2]) * u) for u in (0, 0.25, 0.5, 0.75, 1.0)]
        st = C.tube("string" + s, pts, [0.32] * 5, M.rope("#8a7a5e", name="bowstring"), seg=6)
        vg1, vg2 = st.vertex_groups.new(name="spring_" + s), st.vertex_groups.new(name="nock")
        for v in st.data.vertices:
            u = max(0.0, min(1.0, math.dist((v.co.x, v.co.y), (tip[0], tip[1])) / max(1e-3, math.dist((n0[0], n0[1]), (tip[0], tip[1])))))
            vg1.add([v.index], 1 - u, "REPLACE")
            vg2.add([v.index], u, "REPLACE")
        rig._prep(st)
    # the bolt, riding on the nock slider
    bx0 = REST_DRAW
    bolt = [C.tube("boltshaft", [(bx0, 0, SZ + 1.4), (bx0 + BOLT_L, 0, SZ + 1.4)], [0.55, 0.55], m["ash"], seg=8),
            C.tube("bolthead", [(bx0 + BOLT_L - 0.5, 0, SZ + 1.4), (bx0 + BOLT_L + 4.5, 0, SZ + 1.4)], [1.1, 0.05], m["polished"], seg=8)]
    for i in range(3):
        a = 2 * math.pi * i / 3 + 0.5
        bolt.append(BZ.ribbon("fletch", [(bx0 + 0.6, 0, SZ + 1.4), (bx0 + 5.5, 0, SZ + 1.4)], [2.2, 1.2], m["linen"], thick=0.2,
                              up=(0, math.cos(a), math.sin(a)), center=0.0))
    for o in bolt:
        rig.rigid(o, "nock")
    ctx["bolt"] = bolt
    rig.rigid(C.box("slider", 7.0, 2.6, 1.2, dark, bevel=0.25, loc=(REST_DRAW - 2.0, 0, SZ + 0.3)), "nock")
    # windlass: a drum across the stock's tail with crank handles on both sides
    rig.rigid(C.tube("drum", [(WINCH[0], -5.0, WINCH[1]), (WINCH[0], 5.0, WINCH[1])], [1.9, 1.9], wood, seg=12), "crank")
    for y in (-5.8, 5.8):
        rig.rigid(C.box("crankarm", 1.0, 0.8, CRANK_R + 1.4, m["bronze"], bevel=0.2,
                        loc=(WINCH[0], y, WINCH[1] + CRANK_R * 0.5 * (1 if y < 0 else -1))), "crank")
        hz = WINCH[1] + CRANK_R * (1 if y < 0 else -1)
        rig.rigid(C.tube("crankgrip", [(WINCH[0], y, hz), (WINCH[0], y + (-3.0 if y < 0 else 3.0), hz)], [0.7, 0.7], m["leather"], seg=8), "crank")
    rig.rigid(C.tube("rope", [(WINCH[0], 0, WINCH[1] + 1.9), (REST_DRAW - 5.0, 0, SZ + 1.2)], [0.35, 0.35], m["rope"], seg=6), "gun")

    # ---- the crewman
    skin = M.skin("#8e6a55")
    CREW.body(rig, skin)
    S = lambda x, y, z: (x * k + CREW_X, y * k, z * k)
    bw = CREW.bulk
    tunic = C.blobs("tunic", [(S(0.3, 0, 40.8), (4.6 * bw, 6.3 * bw, 5.8)), (S(-0.3, 0, 47.2), (5.1 * bw, 7.0 * bw, 6.2)),
                              (S(1.8, -3.1, 50.2), (3.0, 3.6, 2.8)), (S(1.8, 3.1, 50.2), (3.0, 3.6, 2.8)),
                              (S(-1.8, 0, 50.0), (3.1, 6.6 * bw, 5.2)), (S(-0.2, 0, 35.8), (5.4 * bw, 7.3 * bw, 3.0)),
                              (S(0.2, 0, 31.6), (6.1 * bw, 8.0 * bw, 3.6))], m["team_cloth"], res=0.4)
    C.displace(tunic, 0.35, 1.1)
    C.team(tunic)
    rig.skin(tunic, ["hips", "spine", "chest", "thigh_F", "thigh_B"], soft=2.2 * k, bias={"thigh_F": 1.4 * k, "thigh_B": 1.4 * k})
    belt = C.blobs("belt", [(S(-0.1, 0, 38.6), (5.0 * bw, 6.9 * bw, 1.0))], m["leather"], res=0.3)
    rig.skin(belt, ["hips", "spine"], soft=2 * k)
    # CREW body parts carry the offset; the kit helpers expect a figure at the origin, so shift them
    before = set(bpy.data.objects)
    BZ.helmet(rig, k, m, "cap")
    BZ.hair_beard(rig, k, m, beard=True, nape=True)
    BZ.eyes(rig, k, m)
    BZ.sandals(rig, CREW, m)
    BZ.bracers(rig, CREW, m)
    for o in set(bpy.data.objects) - before:
        if o.type == "MESH":
            C.xform(o, loc=(CREW_X, 0, 0))
    return ctx


# ------------------------------------------------------------------------------------ poses
def crank_handles(theta):
    """Side-plane crank handle positions (near, far) for crank angle theta (deg)."""
    a = math.radians(theta)
    n = (WINCH[0] + CRANK_R * math.sin(-a) * 0.0 - CRANK_R * math.sin(a), WINCH[1] + CRANK_R * math.cos(a))
    f = (WINCH[0] + CRANK_R * math.sin(a), WINCH[1] - CRANK_R * math.cos(a))
    return n, f


def crew_stance():
    return dict(root=(3.0, -2.0), hips=0, spine=-10, chest=-6, neck=6, head=2, footF=(11.0, G0, 0.0), footB=(-6.0, G0, 0.0))


def crew_crank(P, theta, rx=0.0, rz=0.0):
    n, f = crank_handles(theta)
    # hands are in the crewman's space (his offset is baked into the bones)
    P["handF"] = ((n[0] - CREW_X + rx, n[1] + rz), 0)
    P["handB"] = (B.far_grip(f[0] - CREW_X + rx, f[1] + rz, 2 * CREW.sw, YAW), 0)
    return P


def weapon(draw, theta, elev=0.0, arms=None, loaded=True):
    """Weapon state: draw 0 (string forward) .. 1 (fully drawn), crank angle, elevation (deg)."""
    nock_dx = (FULL_DRAW - REST_DRAW) * draw
    arm = arms if arms is not None else 38.0 * draw
    return dict(nock=nock_dx, crank=theta, elev=elev, arm=arm, loaded=1.0 if loaded else 0.0)


def apply(ctx, crew, wp, cart=(0.0, 0.0, 0.0), wheel=0.0, wheel_off=None, pole=0.0, flag=(0.0, 0.0)):
    rig = ctx["rig"]
    CREW.apply(rig, crew)
    cx, cz, cp = cart
    rig.set("root", loc=(0, 0, 0))
    rig.set("cart", r=math.radians(cp), loc=(cx, 0, cz))
    rig.set("wheel_F", r=math.radians(wheel), loc=wheel_off)
    rig.set("wheel_B", r=math.radians(wheel))
    rig.set("gun", r=math.radians(wp["elev"]))
    rig.set("nock", loc=(wp["nock"], 0, 0))
    rig.set("crank", r=math.radians(wp["crank"]))
    rig.set("spring_F", ry=math.radians(-wp["arm"]))
    rig.set("spring_B", ry=math.radians(wp["arm"]))
    rig.set("pole", r=math.radians(pole))
    rig.set("flag", r=math.radians(flag[0]), rz=math.radians(flag[1]))
    for o in ctx["bolt"]:
        o.hide_render = wp["loaded"] < 0.5


def idle(ctx, t):
    a = 2 * math.pi * t / 920.0
    P = MO.breathe(crew_stance(), t, amp=1.0, arms=False)
    P = crew_crank(P, 20 + 3 * math.sin(a - 0.8))
    apply(ctx, P, weapon(0.6, 20 + 3 * math.sin(a - 0.8)), pole=1.0 * math.sin(a - 0.6), flag=(4 * math.sin(a - 1.4), 12 * math.sin(a - 1.0)))


def walk(ctx, t):
    P, ph, s1, c2 = MO.walk_legs(t, STRIDE, 4.0, STANCE, G0, cycle=WALK_CYCLE, lean=10.0)
    P["spine"] -= 6
    P["neck"] = 8
    # hands on the push handles (they ride with the cart)
    lift = 3.0
    hx, hz = -37.5 - CREW_X, 25.0 + lift + 0.4 * c2
    P["handF"] = ((hx, hz), -10)
    P["handB"] = (B.far_grip(hx, hz, 2 * CREW.sw, YAW), -10)
    dist = t * ROLL_PER_MS
    wheel = -math.degrees(dist / WR)
    apply(ctx, P, weapon(0.6, 20), cart=(0.0, 0.3 * c2, -4.5 + 0.4 * c2), wheel=wheel, pole=-3 + 2 * math.sin(4 * math.pi * ph),
          flag=(-8 + 4 * math.sin(4 * math.pi * ph - 1.2), 14 * math.sin(2 * math.pi * ph)))


# attack: frames start at 0, 100, 200, 367 (release, impact 3), 450, 533, 633, 758 ms
ATK_MS = [100, 100, 167, 83, 83, 100, 125, 125]


def attack(ctx, t):
    k = B.keyed([(0, {"d": 0.6, "th": 20.0, "e": 0.0, "cx": 0.0, "cp": 0.0, "lean": 0.0}),
                 (100, {"d": 0.8, "th": 200.0, "e": 1.0, "cx": 0.0, "cp": 0.0, "lean": -2.0}),
                 (200, {"d": 1.0, "th": 380.0, "e": 2.5, "cx": 0.0, "cp": 0.0, "lean": -4.0}),
                 (350, {"d": 1.0, "th": 385.0, "e": 2.6, "cx": 0.0, "cp": 0.0, "lean": -4.5}),
                 (367, {"d": 0.0, "th": 385.0, "e": 5.0, "cx": -2.6, "cp": 3.0, "lean": 4.0}),
                 (450, {"d": -0.08, "th": 385.0, "e": -1.0, "cx": -1.2, "cp": -1.5, "lean": 6.0}),
                 (533, {"d": 0.0, "th": 385.0, "e": 0.0, "cx": 0.0, "cp": 0.5, "lean": 2.0}),
                 (633, {"d": 0.25, "th": 470.0, "e": 0.0, "cx": 0.0, "cp": 0.0, "lean": -1.0}),
                 (758, {"d": 0.45, "th": 560.0, "e": 0.0, "cx": 0.0, "cp": 0.0, "lean": -2.0}),
                 (883, {"d": 0.6, "th": 740.0, "e": 0.0, "cx": 0.0, "cp": 0.0, "lean": 0.0})], t)
    loaded = not (367 <= t < 520)
    arms = 38.0 * k["d"] if t < 367 else (-10.0 if t < 450 else 38.0 * max(0.0, k["d"]))
    P = crew_stance()
    P["spine"] += k["lean"]
    P["chest"] += k["lean"] * 0.5
    P["root"] = (P["root"][0] - 0.3 * k["lean"], P["root"][1])
    if 440 <= t < 560:
        # a new bolt from the rack: the near hand drops it into the groove
        P = crew_crank(P, k["th"])
        P["handF"] = ((8.0 + 0.0, 46.0), 0)
    else:
        P = crew_crank(P, k["th"])
    fl = (-6 * math.sin(t / 120.0), 14 * math.sin(t / 150.0))
    apply(ctx, P, weapon(max(0.0, k["d"]), k["th"], elev=k["e"], arms=arms, loaded=loaded), cart=(k["cx"], 0.0, k["cp"]),
          pole=-k["cp"] * 2, flag=fl)


def hit(ctx, t):
    P = MO.knock_hit(crew_stance(), t, {}, back=5.0)
    rx = P["root"][0]
    P = crew_crank(P, 20, rx=0.0)
    s = B.keyed([(0, {"c": 0.0}), (55, {"c": 1.0}), (140, {"c": -0.4}), (310, {"c": 0.0})], t)["c"]
    apply(ctx, P, weapon(0.6, 20), cart=(-1.5 * s, 0.4 * s, 2.5 * s), pole=6 * s, flag=(10 * s, 8 * s))


def die(ctx, t):
    base = crew_stance()
    base["pel"] = (0.0, B.PELV * CREW.H + base.pop("root")[1])
    base["armF"] = (40, 50, 0)
    base["armB"] = (30, 50, 0, -4)
    P = MO.fall_back(base, t, CREW.H, G0)
    c = B.keyed([(0, {"cx": 0.0, "cz": 0.0, "cp": 0.0, "wx": 0.0, "wz": 0.0, "wr": 0.0, "wy": 0.0, "pl": 0.0}),
                 (60, {"cx": -1.0, "cz": 0.0, "cp": 6.0, "wx": 0.0, "wz": 0.0, "wr": 0.0, "wy": 0.0, "pl": 6.0}),
                 (200, {"cx": -3.0, "cz": 0.0, "cp": 18.0, "wx": 2.0, "wz": 1.0, "wr": -30.0, "wy": -3.0, "pl": 14.0}),
                 (330, {"cx": -4.0, "cz": -3.0, "cp": 22.0, "wx": 7.0, "wz": -2.0, "wr": -70.0, "wy": -7.0, "pl": 22.0}),
                 (490, {"cx": -4.2, "cz": -3.6, "cp": 20.0, "wx": 10.0, "wz": -9.0, "wr": -80.0, "wy": -9.0, "pl": 26.0}),
                 (670, {"cx": -4.2, "cz": -3.6, "cp": 21.0, "wx": 10.5, "wz": -10.5, "wr": -82.0, "wy": -9.5, "pl": 28.0}),
                 (970, {"cx": -4.2, "cz": -3.6, "cp": 21.0, "wx": 10.5, "wz": -10.5, "wr": -82.0, "wy": -9.5, "pl": 28.0})], t)
    rig = ctx["rig"]
    apply(ctx, P, weapon(0.6, 20, loaded=t < 200), cart=(c["cx"], c["cz"], c["cp"]), wheel=0.0, wheel_off=None,
          pole=c["pl"], flag=(c["pl"], 0.0))
    # the near wheel breaks off: it falls flat toward the camera
    rig.set("wheel_F", r=math.radians(c["wr"] * 0.3), ry=0.0, rz=0.0, loc=(c["wx"], c["wy"], c["wz"]))
    pb = rig.obj.pose.bones["wheel_F"]
    pb.rotation_euler = (math.radians(c["wr"] * 0.3), 0.0, math.radians(c["wr"]))


def pose(ctx, clip, t):
    {"idle": idle, "walk": walk, "attack": attack, "hit": hit, "die": die}[clip](ctx, t)


def clips():
    die_c = G.Clip("die", [60, 70, 70, 60, 70, 80, 80, 90, 90, 100, 100, 100], sequence=[0, 1, 2, 3, 4, 5, 5, 6, 6, 7, 7, 7], extra={
        "fx": [{"id": "fx.dust_poof", "atMs": 870, "offsetLu": [-12, 10], "scale": 1.2}], "hideUnitAtMs": 970})
    die_c.fx = MO.dust_frames(die_c, 236, span=560, origin=(-16, 0), spread=34, size=9.0, seed=7)
    atk = G.Clip("attack", ATK_MS, impact=3)
    atk.fx[3] = {"s": 0.05, "origin": (-24, 0), "spread": 8, "n": 8, "size": 4.0, "seed": 17}
    atk.fx[4] = {"s": 0.35, "origin": (-24, 0), "spread": 10, "n": 8, "size": 4.0, "seed": 17}
    return [
        G.Clip("idle", MO.IDLE_MS, loop=True),
        G.Clip("walk", [100] * 8, loop=True),
        atk,
        G.Clip("hit", MO.HIT_MS, times=MO.HIT_TIMES),
        die_c,
    ]
