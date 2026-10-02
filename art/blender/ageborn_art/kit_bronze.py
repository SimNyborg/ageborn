"""Bronze Age kit for the content-expansion wave (CONTENT_PLAN 5.2): props and parts that the
first seven Bronze units did not need. Its own module, so the `rigs_bronze` API (also used by
later ages) stays unchanged.

Palette and finishes come from `rigs_bronze` (sandstone, verdigris, dusk plum; polished bronze
as an accent only).
"""
import math

from . import rigs_bronze as B
from .geometry import Geo


def oval_shield(rig, joint, center, rx=10.0, rz=17.0, depth=2.6, rim=B.BRONZE, rim_w=1.3, spine=True,
                emblem=B.SAND_LT, face_team=True):
    """A tall oval shield (thureos) facing the camera (-Y): a team face, a polished rim, a
    sandstone spine (spina) with a boss and a small lambda over it."""
    cx, cy, cz = center
    g = Geo().blob((cx, cy + depth * 0.4, cz), (rx, depth, rz), p=2.0)
    g.clip((0, cy + depth * 0.3, 0), (0, 1, 0))
    rig.part(joint, g, rim, finish=B.POLISH if rim in (B.BRONZE, B.BRONZE_HI) else "metal")
    g = Geo().blob((cx, cy + depth * 1.1, cz), (rx * 0.97, depth * 0.8, rz * 0.97), p=2.0)
    g.clip((0, cy + depth * 1.0, 0), (0, -1, 0))
    rig.part(joint, g, B.PLUM_DK, outline=0.6)
    g = Geo().blob((cx, cy + 0.2, cz), (rx - rim_w, depth * 0.95, rz - rim_w), p=2.0)
    g.clip((0, cy + depth * 0.2, 0), (0, 1, 0))
    if face_team:
        rig.part(joint, g, team=True, outline=0.8)
    else:
        rig.part(joint, g, B.PLUM, outline=0.8)
    fy = cy - depth * 0.95 + 0.1
    if spine:
        g = Geo().blob((cx, fy, cz), (1.5, 0.9, rz - rim_w - 1.0), p=2.6)
        rig.part(joint, g, B.SAND, outline=0.5)
        g = Geo().blob((cx, fy - 0.6, cz), (3.6, 1.5, 4.6), p=2.4)
        rig.part(joint, g, B.BRONZE_HI, finish=B.POLISH, outline=0.5)
    if emblem:
        k = rx / 10.0
        g = Geo()
        ez = cz + rz * 0.52
        g.capsule((cx - 3.8 * k, fy - 0.2, ez - 3.6 * k), (cx, fy - 0.4, ez + 3.0 * k), 1.2 * k)
        g.capsule((cx, fy - 0.4, ez + 3.0 * k), (cx + 3.8 * k, fy - 0.2, ez - 3.6 * k), 1.2 * k)
        rig.part(joint, g, emblem, outline=0.5)


def kopis(rig, joint, grip, length=19.0, axis_deg=90.0, blade=B.BRONZE_HI, y_off=-0.6, width=1.0):
    """A kopis (forward-curved single-edged sword) through `grip`, modelled in the side plane
    pointing `axis_deg` (90 = up from the fist). The blade widens toward the tip and curves
    forward (toward +X of the blade's own frame). Returns the tip point."""
    gx, gy, gz = grip
    a = math.radians(axis_deg)
    ux, uz = math.cos(a), math.sin(a)        # along the blade
    nx, nz = -uz, ux                         # the edge side (forward of the blade)
    y = gy + y_off

    def at(d, n=0.0):
        return (gx + ux * d + nx * n, gz + uz * d + nz * n)
    # hilt: a curved bird-head pommel, a grip and a short guard
    g = Geo().capsule((*_xz(at(-4.5), y),), (*_xz(at(1.5), y),), 1.3)
    rig.part(joint, g, B.LEATHER_DK, outline=0.5)
    g = Geo().sphere(_xz(at(-5.2, -1.0), y), 1.6, cuts=3)
    rig.part(joint, g, B.AGED, finish="metal", outline=0.5)
    g = Geo().capsule(_xz(at(2.0, -2.2), y), _xz(at(2.0, 2.4), y), 1.0)
    rig.part(joint, g, B.AGED_DK, finish="metal", outline=0.5)
    # blade: a slab in the side plane, thin in Y; the edge bellies out near the tip
    pts = []
    n = 8
    for i in range(n + 1):
        t = i / n
        d = 2.6 + (length - 2.6) * t
        w = (1.4 + 2.6 * math.sin(math.pi * min(1.0, t * 1.15)) * (0.6 + 0.4 * t)) * width
        bend = 2.4 * t * t
        pts.append(at(d, w * 0.55 + bend))
    for i in range(n, -1, -1):
        t = i / n
        d = 2.6 + (length - 2.6) * t
        bend = 2.4 * t * t
        pts.append(at(d, -1.0 + bend * 0.6))
    g = Geo().slab(pts, y, 1.1)
    rig.part(joint, g, blade, finish=B.POLISH, outline=0.6)
    # a bright honed edge along the belly and a dark fuller along the back: reads as a blade
    edge = Geo()
    prev = None
    for i in range(n + 1):
        t = i / n
        d = 2.6 + (length - 2.6) * t
        w = (1.4 + 2.6 * math.sin(math.pi * min(1.0, t * 1.15)) * (0.6 + 0.4 * t)) * width
        bend = 2.4 * t * t
        p = _xz(at(d, w * 0.55 + bend - 0.7), y - 0.7)
        if prev is not None:
            edge.capsule(prev, p, 0.55)
        prev = p
    rig.part(joint, edge, "#F4ECD6", outline=0)
    g = Geo().capsule(_xz(at(3.0, 0.2), y - 0.7), _xz(at(length * 0.8, 1.2), y - 0.7), 0.45)
    rig.part(joint, g, B.AGED_DK, outline=0)
    tip = at(length, 2.4)
    return (tip[0], y, tip[1])


def _xz(p, y):
    return (p[0], y, p[1])


def pilos(rig, joint, c=(1.5, 0, 55.0), color=B.BRONZE, band=B.VERD, plume=True, cone=13.0):
    """A conical bronze pilos helmet with a verdigris band and a short team plume tuft on top
    (on a follow-through joint `plume`). Returns the plume joint name or None."""
    cx, cy, cz = c
    g = Geo().lathe([(12.0, -1.2), (12.2, 0.6), (10.8, 4.6), (7.6, 8.6), (3.6, cone - 1.0), (0, cone)],
                    (cx, cy, cz - 1.0), segs=20, squash=(1.0, 0.96))
    rig.part(joint, g, color, finish=B.POLISH if color == B.BRONZE else "metal")
    g = Geo().blob((cx + 0.2, cy, cz - 0.8), (12.7, 12.2, 1.6), p=2.8)
    rig.part(joint, g, band, finish="metal", outline=0.6)
    if not plume:
        return None
    top = cz - 1.0 + cone
    rig.secondary("plume", joint, (cx, cy, top), (cx - 9.0, cy, top + 5.0), max_deg=14, gain=1.0)
    g = Geo()
    for i, (dx, dz, r) in enumerate(((0.0, 1.0, 3.0), (-3.0, 3.2, 3.4), (-6.4, 4.4, 3.0), (-9.0, 4.0, 2.4))):
        g.blob((cx + dx, cy, top + dz), (r * 1.1, 2.4, r), p=2.1)
    rig.part("plume", g, team=True)
    return "plume"


def boeotian(rig, joint, c=(1.5, 0, 55.0), color=B.BRONZE, band=B.VERD_DK, plume=True):
    """A Boeotian helmet: a round polished dome over a wide brim that folds down around the
    head (a hat-like silhouette that reads at 1x), a verdigris band and a team plume tuft on a
    follow-through joint `plume`. Returns the plume joint or None."""
    cx, cy, cz = c
    fin = B.POLISH if color == B.BRONZE else "metal"
    g = Geo().blob((cx - 0.5, cy, cz + 2.0), (11.6, 11.2, 10.4), p=2.3)
    g.clip((0, 0, cz - 0.5), (0, 0, -1))
    rig.part(joint, g, color, finish=fin)
    # the brim: a wide flared ring that dips at the sides and the back
    g = Geo().lathe([(10.8, 1.6), (13.8, 0.6), (15.8, -1.0), (16.2, -2.2), (15.0, -2.6), (11.6, -0.6),
                     (10.4, 0.4)], (cx - 3.0, cy, cz - 0.4), segs=24, squash=(0.92, 0.95))
    rig.part(joint, g, B.AGED if color == B.BRONZE else color, finish="metal", outline=0.8)
    g = Geo().blob((cx - 0.3, cy, cz + 0.8), (11.9, 11.5, 1.6), p=2.8)
    rig.part(joint, g, band, finish="metal", outline=0.6)
    if not plume:
        return None
    top = cz + 12.0
    rig.secondary("plume", joint, (cx, cy, top), (cx - 10.0, cy, top + 4.0), max_deg=14, gain=1.0)
    g = Geo()
    for dx, dz, r in ((1.0, 0.6, 3.2), (-2.6, 2.6, 3.8), (-6.6, 3.8, 3.4), (-10.0, 3.0, 2.6)):
        g.blob((cx + dx, cy, top + dz), (r * 1.1, 2.6, r), p=2.1)
    rig.part("plume", g, team=True)
    return "plume"


def headband(rig, joint="head", c=(1.6, 0, 55.2), r=(12.6, 12.0, 2.1), team=True, color=None, tilt=-6):
    g = Geo().blob(c, r, p=2.6, rot=(0, tilt, 0))
    if team:
        rig.part(joint, g, team=True, outline=0.7)
    else:
        rig.part(joint, g, color, outline=0.7)


def curly_hair(rig, joint="head", color=B.HAIR, z=0.0, back=0.0, scale=1.0):
    g = Geo()
    for x, y, zz, r in ((0.0, 0.0, 58.0, 6.4), (-5.0, -4.0, 56.0, 5.2), (-5.0, 5.0, 56.0, 5.2),
                        (4.6, -3.6, 58.4, 4.6), (5.0, 4.0, 58.0, 4.4), (-8.4, 0.0, 51.0, 5.4),
                        (-6.0, -7.4, 50.0, 3.8), (-6.0, 7.4, 50.0, 3.8), (8.4, 0.0, 58.2, 3.6),
                        (-9.0 - back, -4.0, 46.0, 3.4)):
        g.blob((x * scale, y * scale, zz + z), (r * scale, r * scale, r * 0.92 * scale), p=2.1)
    rig.part(joint, g, color, finish="hair")


def tunic(rig, color=None, team=True, hem_color=B.LINEN, belt=B.LEATHER, z=28.0, skirt=True, bulk=1.0):
    """A belted tunic with a flared skirt on a follow-through `hem` joint."""
    k = bulk
    g = Geo().blob((0.2, 0, z), (10.2 * k, 9.4 * k, 11.4), p=2.4, taper=(1.1, 0.92))
    if team:
        rig.part("torso", g, team=True)
    else:
        rig.part("torso", g, color)
    if skirt:
        rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=12, gain=1.0)
        g = Geo().blob((0.6, 0, 14.6), (11.6 * k, 10.6 * k, 5.6), p=2.4, taper=(1.16, 0.92))
        if team:
            rig.part("hem", g, team=True)
        else:
            rig.part("hem", g, color)
        if hem_color:
            g = Geo().blob((0.6, 0, 10.0), (11.8 * k, 10.8 * k, 1.2), p=3.0)
            rig.part("hem", g, hem_color, outline=0.6)
    if belt:
        g = Geo().blob((0.4, 0, 20.4), (11.0 * k, 10.1 * k, 1.9), p=3.2)
        rig.part("torso", g, belt)


def laces(rig, zs=(4.6, 7.4, 10.0)):
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo()
        for z in zs:
            g.blob((0.9, y, z), (3.8, 3.8, 0.7), p=3.0)
        rig.part(f"shin_{s}", g, B.LEATHER_DK, outline=0.4)


def lambda_mark(rig, joint, center, size=1.0, color=B.SAND_LT, y=None):
    """The Bronze age emblem: a lambda chevron decal facing the camera."""
    cx, cy, cz = center
    k = size
    g = Geo()
    g.capsule((cx - 3.0 * k, cy, cz - 3.4 * k), (cx, cy - 0.2, cz + 3.2 * k), 1.0 * k)
    g.capsule((cx, cy - 0.2, cz + 3.2 * k), (cx + 3.0 * k, cy, cz - 3.4 * k), 1.0 * k)
    rig.part(joint, g, color, outline=0.4)


def two_hand(a, f, w, d, lean=0.0, w_rest=90.0, near="r"):
    """Near arm (a, f, WORLD degrees) holding a prop that points w (WORLD); the other hand grips
    the prop d lu further along its axis, solved by IK in torso space. Returns the pose."""
    far = "l" if near == "r" else "r"
    ta, tf, tw = a - lean, f - lean, w - lean
    pose = B.arm(near, ta, tf, tw, w_rest=w_rest)
    sh = (0.0, B.SHOULDER_Z)
    hx, hz = B.fk_hand(sh, ta, tf)
    tx = hx + d * math.cos(math.radians(tw))
    tz = hz + d * math.sin(math.radians(tw))
    la, lf = B.ik2(sh, (tx, tz))
    pose.update(B.arm(far, la, lf))
    return pose


def rhomphaia(rig, joint, grip, handle=20.0, blade=26.0, y_off=-0.8):
    """A Thracian rhomphaia modelled pointing up (+Z) from the fist at `grip`: a long wrapped
    handle and a long, slightly forward-curved single-edged blade. Returns the tip point."""
    gx, gy, gz = grip
    y = gy + y_off
    g = Geo().capsule((gx, y, gz - 5.0), (gx, y, gz + handle), 1.3, 1.2)
    rig.part(joint, g, B.WOOD_DK, outline=0.6)
    g = Geo()
    for z in (gz - 2.0, gz + 3.0, gz + 8.0, gz + 13.0):
        g.blob((gx, y, z), (1.7, 1.7, 0.6), p=3.0)
    rig.part(joint, g, B.LEATHER, outline=0.4)
    g = Geo().capsule((gx - 2.2, y, gz + handle), (gx + 2.4, y, gz + handle), 1.0)
    rig.part(joint, g, B.AGED_DK, finish="metal", outline=0.5)
    pts_f, pts_b = [], []
    n = 9
    for i in range(n + 1):
        t = i / n
        z = gz + handle + 1.0 + blade * t
        bend = 7.0 * t * t                       # curves forward (toward +X)
        w = 1.5 + 0.9 * math.sin(math.pi * t) - 1.2 * t * t
        pts_f.append((gx + bend + w, z))
        pts_b.append((gx + bend - 0.9, z))
    tip = (gx + 7.0 + 0.6, gz + handle + 1.0 + blade + 1.6)
    g = Geo().slab(pts_f + [tip] + list(reversed(pts_b)), y, 1.1)
    rig.part(joint, g, B.BRONZE, finish=B.POLISH, outline=0.6)
    edge = Geo()
    for a, b in zip(pts_f, pts_f[1:] + [tip]):
        edge.capsule((a[0] - 0.6, y - 0.7, a[1]), (b[0] - 0.6, y - 0.7, b[1]), 0.5)
    rig.part(joint, edge, "#F4ECD6", outline=0)
    return (tip[0], y, tip[1])


def boots(rig, color=B.LEATHER, cuff=B.SAND_LT, top=11.5):
    """Soft fawn-skin boots with a turned-down cuff over the shins (Thrace)."""
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo().capsule((0.8, y, 3.5), (0.6, y, top), 4.0, 4.3)
        g.blob((3.4, y, 2.4), (6.9, 4.5, 2.7), p=2.6, taper=(1.02, 0.86))
        rig.part(f"shin_{s}", g, color)
        g = Geo().blob((0.6, y, top + 0.4), (4.9, 4.9, 1.6), p=2.6)
        rig.part(f"shin_{s}", g, cuff, outline=0.6)


def petasos(rig, joint, c=(1.0, 0, 57.0), color=B.SAND, band=None, brim=16.5, team_brim=False):
    """A petasos: a low felt dome over a wide flat brim (the traveller's hat), a team (or
    `band`) ribbon round the crown."""
    cx, cy, cz = c
    g = Geo().blob((cx - 0.5, cy, cz + 2.4), (10.2, 9.8, 7.4), p=2.3)
    g.clip((0, 0, cz - 0.4), (0, 0, -1))
    rig.part(joint, g, color, finish="hair")
    g = Geo().lathe([(9.6, 1.0), (brim - 1.0, 0.2), (brim, -0.6), (brim - 0.4, -1.4), (9.4, -0.6)],
                    (cx - 1.5, cy, cz - 0.6), segs=26, squash=(1.0, 0.94))
    if team_brim:
        rig.part(joint, g, team=True, outline=0.8)
    else:
        rig.part(joint, g, B.SAND_DK if color == B.SAND else color, finish="hair", outline=0.8)
    g = Geo().blob((cx - 0.4, cy, cz + 0.9), (10.5, 10.1, 1.9), p=2.8)
    if band:
        rig.part(joint, g, band, outline=0.6)
    else:
        rig.part(joint, g, team=True, outline=0.6)


def sling(rig, joint, hand, cord=13.0, name_pouch="pouch", stone=True):
    """A sling hanging from the fist at `hand` (modelled pointing down, -Z): two cords to a
    leather pouch with a lead glans in it (`<name_pouch>_stone` joint, hide it on release).
    Returns the pouch centre."""
    hx, hy, hz = hand
    y = hy - 1.2
    px, pz = hx, hz - cord
    g = Geo().capsule((hx + 0.5, y, hz - 1.0), (px + 1.8, y, pz + 1.2), 0.75)
    g.capsule((hx - 0.5, y, hz - 1.0), (px - 1.8, y, pz + 1.2), 0.75)
    rig.part(joint, g, B.SAND_LT, outline=0.5)
    g = Geo().blob((px, y, pz), (3.4, 1.8, 2.4), p=2.2)
    rig.part(joint, g, B.LEATHER, outline=0.5)
    if stone:
        rig.joint(f"{name_pouch}_stone", joint, (px, y, pz))
        g = Geo().blob((px, y - 1.2, pz + 0.4), (1.9, 1.4, 1.4), p=2.0)
        rig.part(f"{name_pouch}_stone", g, "#C9C3B4", finish="metal", outline=0.5)
    return (px, y, pz)


def gastraphetes(rig, joint, grip, length=30.0, back=10.0, y_off=-2.2, prod=13.0, strings=("rest", "spanned")):
    """A belly-bow modelled level along +X through the fist at `grip`: a wooden stock with a
    crescent belly rest at the back, a slider, and a composite prod at the front tilted toward
    the camera so its curve reads from the side. One string joint per state in `strings`
    (`<joint>_s_<state>`; the poses show one), and the bolt on `<joint>_bolt`. Returns
    (muzzle point, the nut x of the spanned string)."""
    gx, gy, gz = grip
    y = gy + y_off
    x0, x1 = gx - back, gx + length
    g = Geo().blob(((x0 + x1) / 2, y, gz + 1.5), ((x1 - x0) / 2, 1.6, 1.8), p=3.2)
    rig.part(joint, g, B.WOOD)
    g = Geo().blob(((x0 + x1) / 2 + 3.0, y - 1.7, gz + 2.6), ((x1 - x0) / 2 - 5.0, 0.6, 0.7), p=3.0)
    rig.part(joint, g, B.WOOD_DK, outline=0.4)                     # the slider groove
    # crescent belly rest (gaster) at the back
    g = Geo().lathe([(4.6, 0), (5.4, 0.8), (5.4, 2.0), (4.6, 2.8)], (x0 - 1.6, y, gz + 1.0),
                    (x0 + 1.2, y, gz + 1.0), segs=18, squash=(0.6, 1.0))
    g.clip((x0 + 0.2, y, gz + 1.0), (1, 0, 0))
    rig.part(joint, g, B.AGED, finish="metal", outline=0.6)
    # prod: two limbs out of a bronze housing at the front, tilted 55 degrees toward the camera
    hx = x1 - 3.0
    g = Geo().blob((hx, y, gz + 2.0), (3.2, 2.6, 2.8), p=2.6)
    rig.part(joint, g, B.BRONZE, finish=B.POLISH, outline=0.5)
    tips = []
    for sgn in (-1, 1):
        pts = []
        for i in range(7):
            t = i / 6
            d = prod * t
            back_curve = -4.5 * t * t + (2.4 * max(0.0, (t - 0.75) / 0.25) ** 2)
            pts.append((hx + back_curve, y - sgn * d * 0.55, gz + 2.0 + sgn * d * 0.8))
        for a, b in zip(pts, pts[1:]):
            g = Geo().capsule(a, b, 1.5 - 0.5 * (pts.index(a) / 6), 1.0)
            rig.part(joint, g, "#E2D6BC", finish="gloss", outline=0.6)
        tips.append(pts[-1])
    nut_x = gx + 2.0
    for st in strings:
        rig.joint(f"{joint}_s_{st}", joint, grip, hidden=st != strings[0])
        mx = (tips[0][0] - 1.0) if st == "rest" else nut_x
        mid = (mx, y - 0.4, gz + 2.6)
        g = Geo().capsule(tips[0], mid, 0.45).capsule(mid, tips[1], 0.45)
        rig.part(f"{joint}_s_{st}", g, B.LINEN, outline=0.4, outline_hex=B.LEATHER_DK)
    rig.joint(f"{joint}_bolt", joint, grip, hidden=True)
    g = Geo().capsule((nut_x, y - 1.8, gz + 3.2), (hx + 4.0, y - 1.8, gz + 3.2), 0.8)
    rig.part(f"{joint}_bolt", g, B.WOOD_DK, outline=0.4)
    g = Geo().lathe([(0, 0), (1.6, 0.6), (0, 4.2)], (hx + 3.6, y - 1.8, gz + 3.2), (hx + 7.8, y - 1.8, gz + 3.2), segs=8)
    rig.part(f"{joint}_bolt", g, B.BRONZE, finish=B.POLISH, outline=0.4)
    return (hx + 8.0, y - 1.8, gz + 3.2), nut_x
