"""W6 Modern wave helpers (CONTENT_PLAN 5.6): the shared trooper body and a few props.

Every Modern wave biped is built on the walk-v3 Modern body (`kit_modern.skeleton_v3` / `legs_v3`, the
`rigs_modern` tunic, `kit_industrial.head_face`) so the nine new troopers share proportions, palette and
the face kit with the Rifleman and the Trench Raider; each unit then adds its own hat, gear and weapon.
`kit_modern.py` keeps its API (the Industrial rigs import it).
"""
import math

from . import face as F
from . import kit_industrial as KI
from . import kit_modern as KM
from . import rigs_modern as R
from .anim import merge
from .geometry import Geo

SAND = "#C9B48A"
SAND_DK = "#A8946C"
LEAF = "#6F7A4E"
LEAF_DK = "#55603C"
LEAF_LT = "#8C9461"
CLOTH_DK = "#4F5340"


def beret(rig, joint, c=(0.0, 0.0, 58.0), badge=True):
    """A floppy team beret pulled down over the near side, a cream badge above the near eye."""
    x, y, z = c
    g = Geo().blob((x + 1.0, y - 1.5, z + 0.6), (12.6, 12.4, 4.6), p=2.2, rot=(10, -6, 0))
    g.blob((x + 4.0, y - 7.5, z - 1.6), (8.0, 4.0, 3.6), p=2.2)     # the droop over the near side
    rig.part(joint, g, team=True)
    g = Geo().lathe([(11.4, 0), (11.8, 0.6), (11.6, 1.8), (11.0, 2.2)], (x, y, z - 3.6), (x, y, z - 1.6), segs=24)
    rig.part(joint, g, R.LEATHER, outline=0.5)                        # leather band
    if badge:
        g = Geo().blob((x + 9.0, y - 7.6, z - 0.6), (1.6, 1.0, 2.0), p=2.3)
        rig.part(joint, g, KM.CREAM, finish="metal", outline=0.4)


def peaked_cap(rig, joint, c=(1.0, 0.0, 58.0), color=R.OLIVE):
    """A stiff peaked service cap: an olive crown, a team band and a glossy black peak."""
    x, y, z = c
    g = Geo().blob((x - 0.4, y, z + 2.6), (12.8, 12.2, 4.8), p=2.6)
    g.clip((x, y, z), (0, 0, -1))
    rig.part(joint, g, color)
    g = Geo().lathe([(11.6, 0), (11.9, 1.4), (11.7, 3.2)], (x, y, z - 1.2), (x, y, z + 1.6), segs=24)
    rig.part(joint, g, team=True, outline=0.6)
    g = Geo().blob((x + 11.6, y, z - 1.6), (6.4, 9.0, 1.1), p=2.6, rot=(0, -14, 0))
    rig.part(joint, g, "#2A2A2E", finish="gloss", outline=0.5)
    g = Geo().blob((x + 11.0, y, z + 1.8), (1.4, 2.2, 1.8), p=2.3)
    rig.part(joint, g, KM.CREAM, finish="metal", outline=0.4)


def trooper(rig, *, hat="round", hat_c=None, team_cover=True, hem_z=13.0, brow_angry=True, mouth_w=5.8,
            mouth_shape="grim", stubble=False, mud=False, chevrons=2, fist=4.4, tunic=True, belt=R.KHAKI,
            pockets=True, sleeves=True, rolled=False, hair=R.HAIR, skin=R.SKIN, trousers="#767B5A",
            puttee=R.KHAKI, boot=R.BOOT, hair_back=True):
    """The Modern wave trooper: skeleton, legs, tunic, head and face, hat (`hat` joint plus `hat_loose`
    for the death), arms with thumbs, shoulders and rank chevrons on the near sleeve. Returns the face."""
    KM.skeleton_v3(rig)
    KM.legs_v3(rig, mud=mud, trousers=trousers, puttee=puttee, boot=boot)
    if tunic:
        R.tunic(rig, belt=belt, pockets=pockets, hem_z=hem_z)
    extra = []
    stub = None
    if stubble:
        stub = Geo().blob((7.0, 0, 41.2), (8.2, 9.6, 4.4), p=2.2)
        stub.clip((3.0, 0, 0), (-1, 0, 0))
        extra.append(stub)
    face = KI.head_face(rig, skin=skin, brow=hair, brow_angry=brow_angry, mouth_dz=-9.0, mouth_w=mouth_w,
                        extra_geos=extra, mouth_shape=mouth_shape)
    if stub is not None:
        rig.part("head", stub, "#C9A88E", outline=0.5)
    if hair_back:
        g = Geo().blob((-6.0, 0, 46.0), (5.6, 9.8, 6.0), p=2.2)
        rig.part("head", g, hair, finish="hair")
    g = Geo().blob((-2.0, -11.2, 49.0), (2.6, 1.6, 3.4), p=2.2)   # ear
    rig.part("head", g, skin)
    if hat is not None:
        builders = {
            "round": (lambda j, c, **kw: KM.round_helmet(rig, j, c=c, team_cover=team_cover, **kw), (1.0, 0.0, 57.4)),
            "brodie": (lambda j, c, **kw: KM.brodie(rig, j, c=c), (1.5, 0.0, 59.6)),
            "beret": (lambda j, c, **kw: beret(rig, j, c=c), (0.0, 0.0, 58.0)),
            "peaked": (lambda j, c, **kw: peaked_cap(rig, j, c=c), (1.0, 0.0, 58.0)),
        }
        fn, c0 = builders[hat]
        c = hat_c or c0
        rig.joint("hat", "head", c)
        fn("hat", c)
        KI.loose(rig, "hat_loose", c, lambda j: fn(j, c, strap=False) if hat == "round" else fn(j, c))
    for s in ("r", "l"):
        R.arm_parts(rig, s, fist=fist, team_sleeve=sleeves, rolled=rolled, sleeve=None if sleeves else R.OLIVE)
        y = R.ARM_Y[s]
        g = Geo().blob((2.4, y - 1.4 * (1 if s == "r" else -1), R.HAND_Z + 0.6), (1.6, 1.5, 2.2), p=2.2)
        rig.part(f"hand_{s}", g, skin)                     # thumb
    if sleeves:
        R.shoulders(rig)
    if chevrons:
        sleeve = Geo().capsule((0, R.ARM_Y["r"], R.SHOULDER_Z), (0, R.ARM_Y["r"], R.ELBOW_Z), 4.4, 4.1)
        sface = F.Face(rig, "arm_r", [sleeve])
        g = KM.chevron(sface, Geo(), (0.6, 32.6), s=0.95, n=chevrons, w=1.7, gap=2.9)
        rig.part("arm_r", g, KM.CREAM, highlight=False, outline=0)
    return face


def hit_pose(k, base, extra_fn=None):
    """`moves.hit_light`-style light hit: the head snaps back, the hat lifts, eyes squeezed."""
    from . import moves as M

    def recoil(a):
        p = {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
             "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
             "hat": {"z": 3.0 * max(a, 0), "r": 10 * a}, "brow": {"z": 1.6 * max(a, 0)}}
        if extra_fn is not None:
            p = merge(p, extra_fn(a))
        return p
    return M.hit_light(k, base, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


def die_d1_pose(k, stance, height, prop=None, prop_path=None, hat_land=57.0):
    """D1 fling and spin with the hat popping off; `prop` (joint name) flies along `prop_path`."""
    from . import moves as M
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(stance, M.die_d1(k, center_z=28.0, lie_z=11.0, height=height), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    hp = KI.hat_pop(land=hat_land, back=58.0)[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if prop is not None and prop_path is not None and prop_path[k] is not None:
        x, z, r = prop_path[k]
        pose[prop] = {"hide": True}
        pose[f"{prop}_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


PROP_PATH = [None, (6, 20, 70), (10, 38, 190), (14, 42, 320), (18, 32, 440), (22, 14, 540),
             (24, 0, 600), (25, -6, 624), (25, -6, 624), (25, -6, 624)]


def leaf_tufts(rig, joint, pts, colors=(LEAF, LEAF_DK, LEAF_LT), size=3.2, seed=1):
    """Ghillie-suit leaf tufts: little drooping blobs at pts [(x, y, z)], three greens in turn."""
    gs = [Geo(), Geo(), Geo()]
    for i, (x, y, z) in enumerate(pts):
        a = (i * 47 + seed * 13) % 360
        r = size * (0.8 + 0.4 * ((i * 7 + seed) % 5) / 4)
        gs[i % 3].blob((x, y, z), (r, r * 0.8, r * 0.6), p=2.0, rot=(0, (a % 60) - 30, 0))
    for g, c in zip(gs, colors):
        rig.part(joint, g, c, finish="hair", outline=0.4)


def ring_pts(cx, cz, rx, rz, y, n, a0=0.0, a1=360.0):
    out = []
    for i in range(n):
        a = math.radians(a0 + (a1 - a0) * i / max(1, n - 1 if a1 - a0 < 360 else n))
        out.append((cx + rx * math.cos(a), y, cz + rz * math.sin(a)))
    return out
