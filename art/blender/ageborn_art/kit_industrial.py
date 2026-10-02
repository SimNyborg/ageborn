"""Industrial Age cartoon kit v2 (art director plan 2026-09-30): helpers the Industrial units share
on top of `moves.py`, `face.py`, `smear2.py` and `kit_medieval.py`. Kept in its own module so the
older `rigs_industrial.py` API (re-exported from the Modern rigs) stays unchanged.

  head_face()   the round cartoon head plus the face kit (big eyes with a `pupils` joint, a `brow`
                joint, a default mouth, lids, squeeze, X, spiral, grit, yell, O, KO tongue); call
                it instead of `head_ball` + `face`
  cog()         the Industrial emblem as a decal: a cream cog (ring of teeth, a hub hole) laid on
                a team slab so the slab is broken up (A11 detail bible 3.4)
  stripes()     diagonal hazard stripes as decals (warning bands on crates, hulls and plinths)
  loose()       a hidden root-level copy of a prop (a hat, a wrench) that flies off in a death
  hat_pop()     the loose prop's path for a D1 death (up, spinning, landing behind)
  gauge()       a brass pressure gauge with a needle on its own joint (`<name>_needle`)
  aim_arm()     arm channels from WORLD angles (the torso lean is subtracted first)
"""
import math

from . import face as F
from . import kit_medieval as K
from . import rigs_industrial as I
from .geometry import Geo

CREAM = "#E8DFC8"
SOOT = "#3A3533"


def head_face(rig, skin=I.SKIN, brow=I.HAIR, brow_angry=True, center=(2.0, 0.0, 48.5),
              r=(11.8, 11.2, 11.6), nose=(13.8, -0.6, 47.2), nose_r=(3.6, 3.2, 3.4), cx=12.2, cz=50.4,
              eye_dy=(-4.8, 4.4), eye_r=(3.9, 3.6, 4.6), mouth_w=5.8, mouth_dz=-8.6, extra_geos=(),
              mouth_shape="grim", brow_w=1.1):
    """Head, jaw and nose (skin) plus face2 on `head`. Returns the Face (for more decals)."""
    head = Geo().blob(center, r, p=2.3)
    head.blob((center[0] + 4, 0, center[2] - 5.5), (8.6, 9.4, 6.2), p=2.2)
    head.blob(nose, nose_r, p=2.0)
    face = K.face2(rig, [head], skin, cx=cx, cz=cz, eye_dy=eye_dy, eye_r=eye_r, pupil_r=(1.6, 2.4, 2.7),
                   brow=brow, brow_angry=brow_angry, brow_w=brow_w, mouth_w=mouth_w, mouth_dz=mouth_dz,
                   extra_geos=extra_geos, eye_at=(cx + 1.9, cz), mark_r=eye_r[2] * 0.95,
                   mouth_shape=mouth_shape, mouth_x=cx + 1.4)
    rig.part("head", head, skin)
    return face


def cog(face, g, center_xz, s=1.0, teeth=8, depth=0.4):
    """Cog emblem decal centred at screen (x, z): a toothed ring about 7 x s lu across with a hole."""
    c = face.hit(*center_xz)
    ro, ri, rt = 2.7 * s, 1.35 * s, 3.55 * s
    ring = F.ellipse(0, 0, ro, ro, 20)
    hole = F.ellipse(0, 0, ri, ri, 12)
    # the ring as a thick stroke around the hole (decals are convex polygons; a stroke keeps the hole)
    mid = [((ro + ri) / 2 * math.cos(2 * math.pi * k / 20), (ro + ri) / 2 * math.sin(2 * math.pi * k / 20))
           for k in range(21)]
    face.stroke(g, c, mid, ro - ri, depth)
    for k in range(teeth):
        a = 2 * math.pi * (k + 0.5) / teeth
        ca, sa = math.cos(a), math.sin(a)
        w = 0.95 * s
        pts = [(ca * (ro - 0.3) - sa * w, sa * (ro - 0.3) + ca * w), (ca * rt - sa * w * 0.8, sa * rt + ca * w * 0.8),
               (ca * rt + sa * w * 0.8, sa * rt - ca * w * 0.8), (ca * (ro - 0.3) + sa * w, sa * (ro - 0.3) - ca * w)]
        face.decal(g, c, pts, depth)
    del ring, hole
    return g


def stripes(face, g, center_xz, w, h, n=4, band=1.0, slant=0.6, depth=0.4):
    """Diagonal hazard bands (every other band painted) in a w x h screen box at center."""
    c = face.hit(*center_xz)
    step = w / n
    for k in range(n):
        x0 = -w / 2 + k * step
        x1 = x0 + step * 0.5 * band
        pts = [(x0, -h / 2), (x1, -h / 2), (x1 + slant * h, h / 2), (x0 + slant * h, h / 2)]
        pts = [(max(-w / 2, min(w / 2, u)), v) for u, v in pts]
        face.decal(g, c, pts, depth)
    return g


def loose(rig, name, at, build):
    """A hidden root-level joint `name` at `at` holding a copy of a prop built by build(joint)."""
    rig.joint(name, "root", at, hidden=True)
    build(name)


# a hat or helmet popping off in a D1 death: (x, z, r) per die step, None = still on the head. It
# flies up spinning and lands on the ground behind the head (z = -land, the hat's rest height).
def hat_pop(land=55.0, back=58.0):
    path = [None, (-2.0, 12.0, 40), (-7.0, 22.0, 120), (-13.0, 20.0, 210), (-20.0, 6.0, 290),
            (-27.0, -land * 0.45, 340), (-back + 4.0, -land + 3.0, 362), (-back, -land, 360),
            (-back, -land, 360), (-back, -land, 360)]
    return path


HAT_POP = hat_pop()


def gauge(rig, joint, at, r=3.2, name="gauge", normal=(1.0, -1.0), face_col=CREAM):
    """A brass pressure gauge (rim, cream face) facing `normal` (x, y) with a needle joint."""
    x, y, z = at
    nx, ny = normal
    L = math.hypot(nx, ny)
    nx, ny = nx / L, ny / L
    g = Geo().lathe([(0, 0), (r, 0), (r + 0.4, 1.0), (r, 1.6), (0, 1.8)], (x, y, z), (x + nx * 1.8, y + ny * 1.8, z),
                    segs=18)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.6)
    g = Geo().blob((x + nx * 1.9, y + ny * 1.9, z), (0.3 + abs(ny) * (r - 0.8), 0.3 + abs(nx) * (r - 0.8), r - 0.8),
                   p=2.2)
    rig.part(joint, g, face_col, highlight=False, outline=0)
    nd = f"{name}_needle"
    rig.joint(nd, joint, (x + nx * 2.3, y + ny * 2.3, z))
    g = Geo().capsule((x + nx * 2.3, y + ny * 2.3, z), (x + nx * 2.3, y + ny * 2.3, z + r * 0.8), 0.45, 0.3)
    rig.part(nd, g, "#8A3A2A", outline=0, highlight=False)
    return nd


def aim_arm(s, a_world, f_world, lean, w_world=None, w_rest=90.0):
    """I.arm with WORLD angles: arm and weapon angles are torso-space, so subtract the lean."""
    return I.arm(s, a_world - lean, f_world - lean, None if w_world is None else w_world - lean, w_rest=w_rest)


# -- walk v3 body (ANIM_SPEC 2.0 rule 5, G1): longer legs and planted feet ----------------------
# The Industrial bipeds keep the rigs_industrial (= rigs_modern) joint names and arm layout, which
# match the Medieval biped, so the skeleton, the IK legs, the jog gait and the arm chain are
# kit_medieval's: thighs pivot at 19.5 lu, knees at 11.5, a `foot_r/l` joint at the ankle carries a
# short boot (8.8 lu) that rolls on the toe-off, and the upper body is lifted 2 lu (`rest_offset`).
V3_THIGH_Z, V3_KNEE_Z, V3_ANKLE_Z, V3_LIFT = K.V3_THIGH_Z, K.V3_KNEE_Z, K.V3_ANKLE_Z, K.V3_LIFT
legs_ik = K.legs_ik
jog_gait = K.jog_gait
ArmChain = K.ArmChain


def skeleton_v3(rig, head=(1, 0, 38), arm_y=None):
    """`rigs_industrial.skeleton` with walk-v3 legs (thighs at 19.5 lu, foot joints, no parts)."""
    K.skeleton_v3(rig, head=head, arm_y=arm_y or I.ARM_Y)


def legs_v3(rig, trousers=I.DENIM, boot=I.BOOT, team=False, thigh_r=4.6, cuff=None, gaiter=None, far=0.8,
            spur=None):
    """`rigs_industrial.legs` for skeleton_v3: work trousers (team for overalls), optional gaiters
    and turned-up cuffs, chunky hobnail boots on the foot joints (8.8 lu long, a thick coal sole).
    The far leg is `far` darker (team trousers stay team; their boots darken), so the near and far
    feet read apart (ANIM_SPEC G1). Adds the `_foot` / `_foot_l` sole trackers."""
    from . import colors as CO
    for s in ("r", "l"):
        y = I.LEG_Y * I.SIDE_Y[s]
        k = 1.0 if s == "r" else far
        sh = (lambda c: c) if k == 1.0 else (lambda c: CO.scale(c, k))
        g = Geo().capsule((0, y, V3_THIGH_Z), (0.5, y, V3_KNEE_Z), thigh_r, thigh_r - 0.4)
        if team:
            rig.part(f"thigh_{s}", g, team=True)
        else:
            rig.part(f"thigh_{s}", g, sh(trousers))
        # the shins taper to a slim ankle, so the two legs stay apart down to the boots at 62 px
        g = Geo().capsule((0.5, y, V3_KNEE_Z), (1.0, y, V3_ANKLE_Z + 0.6), thigh_r - 0.7, 3.3)
        if gaiter:
            rig.part(f"shin_{s}", g, sh(gaiter))
        elif team:
            rig.part(f"shin_{s}", g, team=True)
        else:
            rig.part(f"shin_{s}", g, sh(trousers))
        if cuff:
            g = Geo().blob((0.9, y, 7.8), (4.0, 4.2, 1.2), p=2.6)
            rig.part(f"shin_{s}", g, sh(cuff), outline=0.5)
        g = Geo().blob((1.0, y, 5.4), (3.7, 4.0, 2.2), p=2.6)                 # boot shaft
        rig.part(f"shin_{s}", g, sh(boot), finish="gloss")
        g = Geo().blob((2.8, y, 2.4), (4.4, 4.6, 2.4), p=2.9, taper=(1.02, 0.84))   # 8.8 lu boot
        rig.part(f"foot_{s}", g, sh(boot), finish="gloss")
        g = Geo().blob((3.0, y, 0.6), (4.4, 4.7, 0.8), p=3.0)                 # thick sole
        rig.part(f"foot_{s}", g, sh(I.COAL), outline=0.4)
        if spur:
            g = Geo().capsule((-1.2, y, 3.0), (-3.8, y, 2.8), 0.7)
            g.star((-4.4, y, 2.8), 2.0, 0.8, 1.0, points=5, rot=(90, 0, 0))
            rig.part(f"foot_{s}", g, sh(spur), finish="metal", outline=0.4)
    rig.track("_foot", "foot_r", (2.6, -I.LEG_Y, 0.0))
    rig.track("_foot_l", "foot_l", (2.6, I.LEG_Y, 0.0))


def ground_feet(rig, pose, legs, keep_lift=2.5, toes=None, max_drop=4.0, report=None):
    """Puts the feet of an FK attack or hit pose (thigh/shin angle tables authored for the old short
    legs) back on the ground by IK: a foot whose ankle is within `keep_lift` lu of its planted height
    is planted where it is (x kept, flat, or toe-down by `toes[side]` degrees: up on the toes);
    a higher foot (a kick, a hop) keeps its FK pose. A foot the legs cannot reach lowers the body
    by at most `max_drop` (a wide stance is a low stance), then drags toward the hip
    (rigs_bronze.plant, with the targets taken from the pose itself)."""
    import bpy

    from . import gait as GT
    from .anim import merge as _merge
    toes = toes or {}
    rig.apply(pose)
    bpy.context.view_layer.update()
    tg = {}
    for s, leg in legs.items():
        ml = rig.char_matrix(rig.joints[leg.lower])
        e = ml @ (leg.end - rig.rest[leg.lower])
        if e.z - V3_ANKLE_Z > keep_lift:
            continue
        ang = toes.get(s, 0.0)
        lift = 5.6 * math.sin(math.radians(-ang)) if ang < 0 else 0.0
        tg[s] = (leg, e.x, V3_ANKLE_Z + lift, ang)
    if not tg:
        return pose
    keep = {s for s in legs if s not in tg}
    clean = {j: {k: v for k, v in ch.items()
                 if not (k == "r" and j.startswith(("thigh_", "shin_", "foot_")) and j[-1] not in keep)}
             for j, ch in pose.items()}
    dropped, out, rep = 0.0, pose, []
    for _ in range(10):
        rep = []
        out = GT.solve(rig, clean, tg, report=rep)
        if not rep or max(d for _, d in rep) <= 0.05:
            break
        short = max(d for _, d in rep)
        if dropped < max_drop:
            d = min(short + 0.3, max_drop - dropped)
            dropped += d
            clean = _merge(clean, {"body": {"z": -d}})
            continue
        for name, d in rep:
            leg, x, z, a = tg[name]
            hx = rig.char_pos(rig.joints[leg.upper]).x
            tg[name] = (leg, x + (d + 0.3) * (1 if hx > x else -1), z, a)
    if report is not None:
        report.extend(rep)
    return out


def kneel(rig, pose, legs, drop=14.0, front=12.0, back=-9.0, back_toe=-62.0):
    """A one-knee kneel (a kneeling shot) by IK, blended by `drop` (0 standing .. 14 the far knee
    on the ground): the body drops, the near foot is planted ahead at x `front`, the far leg folds
    back with its knee near the ground and the boot toe-down behind it (`back`, `back_toe`)."""
    from . import gait as GT
    from .anim import merge as _merge
    t = max(0.0, min(1.0, drop / 14.0))
    clean = {j: {k: v for k, v in ch.items() if not (k == "r" and j.startswith(("thigh_", "shin_", "foot_")))}
             for j, ch in pose.items()}
    clean = _merge(clean, {"body": {"z": -drop}})
    bx = back * t + 2.0 * (1 - t)
    lift = 3.6 * t
    tg = {"r": (legs["r"], front * t + 2.0 * (1 - t), V3_ANKLE_Z, 0.0),
          "l": (legs["l"], bx, V3_ANKLE_Z + lift, back_toe * t)}
    return GT.solve(rig, clean, tg)
