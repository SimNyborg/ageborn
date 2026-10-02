"""Modern Age cartoon kit v2 (art director plan 2026-09-30): helpers the Modern units and turrets
share on top of `moves.py`, `face.py`, `smear2.py`, `kit_medieval.py` and `kit_industrial.py`
(whose `head_face`, `loose`, `hat_pop` and `aim_arm` work unchanged on the Modern skeleton). Kept
in its own module so the older `rigs_modern.py` API (also re-exported by the Industrial rigs) stays
unchanged.

  chevron()      the Modern emblem as a decal: cream rank chevrons laid on a team slab (a sleeve,
                 a hull side, a pod) so the slab is broken up (A11 detail bible 3.4)
  stripes()      diagonal hazard bands as decals (re-exported from kit_industrial)
  brodie()       the Brodie "soup bowl" helmet with a team band, khaki netting and rim rivets
  round_helmet() the round steel helmet with a team band, netting and a chin strap
  grenade()      a round olive "pineapple" grenade with a steel lever and a ring (1x readable)
  canteen()      a felt-covered canteen with a cap, hung at the hip
  pouches()      a row of khaki webbing pouches with flaps
  mud()          flat mud patches on boots, spades and treads (cel weathering)
  two_hand()     near arm (a, f) holding a prop pointing w; the far hand grips the prop d lu
                 further along (IK), all in WORLD angles (the torso lean is subtracted)
  hand_at()      the near hand's torso-space position for arm angles (a, f)
  crew_head()    a small round crew head (tankers, pilots) with big eyes, brow, mouth and the
                 face kit, on its own joint
  skeleton_v3()  the Modern biped with walk-v3 legs (ANIM_SPEC 2.0 rule 5, G1): thighs at 19.5 lu,
                 knees at 11.5, `foot_r/l` joints, the upper body lifted 2 lu (kit_industrial's)
  legs_v3()      olive trousers, khaki puttees and chunky ankle boots on the foot joints, the far
                 leg 20% darker, the `_foot` / `_foot_l` sole trackers
"""
import math

from . import face as F
from . import kit_industrial as KI
from . import kit_medieval as K
from . import rigs_modern as M
from .anim import merge
from .geometry import Geo

CREAM = "#E8DFC8"
MUD = "#6E5C4A"
MUD_LT = "#86705A"
NET = "#A39468"
FELT = "#7E7458"
STRIPE_DK = "#2F2E33"
STRIPE_LT = "#D9CFA8"
BRASS = "#B8A776"

stripes = KI.stripes


def chevron(face, g, center_xz, s=1.0, n=2, w=1.9, depth=0.4, gap=2.6, up=True):
    """n stacked chevrons (point up if `up`) centred at screen (x, z); about 6 x s lu wide."""
    c = face.hit(*center_xz)
    for k in range(n):
        dz = (k - (n - 1) / 2) * gap * s
        tip = 1.3 * s if up else -1.3 * s
        face.stroke(g, c, [(-3.0 * s, dz - tip), (0.0, dz + tip), (3.0 * s, dz - tip)], w * s, depth)
    return g


def brodie(rig, joint, c=(1.5, 0, 59.6), color=M.OLIVE, k=1.0, net=True, rivets=True):
    """Brodie helmet: M.helmet_brodie (dome, flat brim, team band) plus netting and rim rivets."""
    M.helmet_brodie(rig, c=c, color=color, band=True, k=k, joint=joint)
    x, y, z = c
    if net:
        g = Geo()
        for a in (-60, -25, 10, 45):
            g.capsule((x + (a / 50) * 8.5 * k, y - 11.6 * k, z + 1.6 * k),
                      (x + (a / 50) * 4.0 * k, y - 5.0 * k, z + 8.8 * k), 0.6 * k, segs=6, rings=2)
        g.capsule((x - 9.0 * k, y - 9.5 * k, z + 6.0 * k), (x + 8.0 * k, y - 9.0 * k, z + 6.4 * k), 0.55 * k,
                  segs=6, rings=2)
        rig.part(joint, g, NET, outline=0)
    if rivets:
        g = Geo()
        for a in range(200, 341, 28):
            t = math.radians(a)
            g.sphere((x + 0.8 * k + 16.4 * k * math.cos(t), y + 15.2 * k * math.sin(t), z - 0.1 * k), 0.8 * k, cuts=2)
        rig.part(joint, g, M.STEEL, finish="metal", outline=0)


def round_helmet(rig, joint, c=(1.0, 0, 57.4), color=M.OLIVE, k=1.0, net=True, strap=True, team_cover=False):
    """The round steel helmet (team band, netting, chin strap). team_cover=True: a team-painted
    helmet cover over the dome (a big team cue at the top of the silhouette), an olive rim, khaki
    netting over it."""
    if not team_cover:
        M.helmet_round(rig, c=c, color=color, band=True, net=net, strap=strap, k=k, joint=joint)
        return
    x, y, z = c
    g = Geo().blob((x, y, z + 1.5 * k), (12.6 * k, 12.2 * k, 10.4 * k), p=2.3)
    g.clip((x, y, z - 1.2 * k), (0, 0, -1))
    rig.part(joint, g, team=True)
    g = Geo().lathe([(12.6 * k, 0), (13.2 * k, 0.4 * k), (14.2 * k, -0.6 * k), (14.4 * k, -1.8 * k),
                     (12.4 * k, -2.2 * k)], (x, y, z - 0.9 * k), (x, y, z - 3.3 * k), segs=24)
    rig.part(joint, g, color, finish="gloss")
    if net:
        g = Geo()
        for a in (-55, -20, 15, 50):
            g.capsule((x + (a / 50) * 8.4 * k, y - 11.4 * k, z + 1.6 * k),
                      (x + (a / 50) * 4.0 * k, y - 5.2 * k, z + 11.2 * k), 0.6 * k, segs=6, rings=2)
        g.capsule((x - 10.0 * k, y - 9.6 * k, z + 6.2 * k), (x + 9.0 * k, y - 9.4 * k, z + 6.8 * k), 0.6 * k,
                  segs=6, rings=2)
        rig.part(joint, g, NET, outline=0)
    if strap:
        g = Geo().capsule((x + 3.0 * k, y - 11.2 * k, z - 2.4 * k), (x + 9.0 * k, y - 8.0 * k, z - 13.0 * k), 0.8 * k)
        rig.part(joint, g, M.LEATHER, outline=0.5)


def grenade(rig, joint, at, r=2.3, body=M.OLIVE, lever=M.STEEL):
    """A round grenade: a ridged olive egg, a steel fuse cap and lever, a ring."""
    x, y, z = at
    g = Geo().blob((x, y, z), (r, r * 0.95, r * 1.2), p=2.2)
    rig.part(joint, g, body, finish="gloss", outline=0.6)
    g = Geo()
    for dz in (-0.5, 0.5):
        g.blob((x, y, z + dz * r), (r * 1.04, r * 0.99, 0.35 * r), p=2.4)
    rig.part(joint, g, "#4E5238", outline=0)
    g = Geo().capsule((x, y, z + r * 1.1), (x, y, z + r * 1.6), r * 0.45)
    g.capsule((x + r * 0.3, y - r * 0.5, z + r * 1.4), (x + r * 0.9, y - r * 0.6, z - r * 0.2), r * 0.22)
    rig.part(joint, g, lever, finish="metal", outline=0.4)


def canteen(rig, joint, at, r=3.2):
    x, y, z = at
    g = Geo().blob((x, y, z), (r, r * 0.6, r * 1.2), p=2.4)
    rig.part(joint, g, FELT, outline=0.6)
    g = Geo().capsule((x + 0.4, y, z + r * 1.15), (x + 0.4, y, z + r * 1.55), r * 0.35)
    rig.part(joint, g, M.GUNMETAL, finish="metal", outline=0.4)


def pouches(rig, joint, pts, color=M.KHAKI, flap=M.KHAKI_LT, size=(2.4, 1.8, 3.0)):
    """Webbing pouches at pts [(x, y, z)], each with a lighter flap on top."""
    g = Geo()
    gf = Geo()
    sx, sy, sz = size
    for x, y, z in pts:
        g.blob((x, y, z), (sx, sy, sz), p=3.2)
        gf.blob((x, y - 0.3 * (1 if y < 0 else -1), z + sz * 0.62), (sx * 1.05, sy * 1.05, sz * 0.42), p=3.2)
    rig.part(joint, g, color, outline=0.6)
    rig.part(joint, gf, flap, outline=0.4)


def mud(face, g, spots, depth=0.4):
    """Flat irregular mud patches (screen (x, z), rx, rz) as decals."""
    for (x, z), rx, rz in spots:
        c = face.hit(x, z)
        pts = [(rx * (1.0 + 0.18 * math.sin(3.1 * i)) * math.cos(2 * math.pi * i / 9),
                rz * (1.0 + 0.2 * math.cos(2.3 * i)) * math.sin(2 * math.pi * i / 9)) for i in range(9)]
        face.decal(g, c, pts, depth)
    return g


# -- posing helpers ------------------------------------------------------------------------------
def hand_at(a, f):
    """Torso-space near-hand position (x, z) for torso-space arm angles (a, f)."""
    ex = M.SH[0] + M.UPPER * math.cos(math.radians(a))
    ez = M.SH[1] + M.UPPER * math.sin(math.radians(a))
    return ex + M.LOWER * math.cos(math.radians(f)), ez + M.LOWER * math.sin(math.radians(f))


def two_hand(a, f, w, d, lean=0.0, w_rest=90.0, off=(0.0, 0.0), far=True):
    """Near arm (a, f) holding a prop that points w (WORLD angles); the far hand grips the prop
    d lu further along its axis (solved by IK in torso space). Returns the pose."""
    ta, tf, tw = a - lean, f - lean, w - lean
    pose = M.arm("r", ta, tf, w=tw, w_rest=w_rest)
    if far:
        hx, hz = hand_at(ta, tf)
        tx = hx + d * math.cos(math.radians(tw)) + off[0]
        tz = hz + d * math.sin(math.radians(tw)) + off[1]
        la, lf = M.ik2(M.SH, (tx, tz))
        pose = merge(pose, M.arm("l", la, lf))
    return pose


def crew_head(rig, name, parent, at, k=1.0, skin=M.SKIN, brow=M.HAIR, brow_angry=True, mouth_w=4.6,
              extra_geos=()):
    """A crew member's head (joint `name`, round skull, nose, jaw) with face2 on it. `at` is the
    head centre. Returns the Face."""
    x, y, z = at
    rig.joint(name, parent, at)
    head = Geo().blob((x, y, z), (7.6 * k, 7.2 * k, 7.4 * k), p=2.3)
    head.blob((x + 2.6 * k, y, z - 3.6 * k), (5.6 * k, 6.0 * k, 4.2 * k), p=2.2)
    head.blob((x + 8.4 * k, y - 0.4, z - 1.2 * k), (2.4 * k, 2.1 * k, 2.2 * k), p=2.0)
    cx, cz = x + 6.6 * k, z + 1.2 * k
    face = K.face2(rig, [head], skin, cx=cx, cz=cz, eye_dy=(-3.2 * k, 3.0 * k),
                   eye_r=(2.6 * k, 2.4 * k, 3.1 * k), pupil_r=(1.0 * k, 1.6 * k, 1.8 * k), brow=brow,
                   brow_angry=brow_angry, brow_w=0.8 * k, mouth_w=mouth_w * k, mouth_dz=-6.2 * k,
                   head=name, extra_geos=extra_geos, eye_at=(cx + 1.3 * k, cz), mark_r=2.9 * k,
                   mouth_x=cx + 1.0 * k)
    rig.part(name, head, skin)
    return face


def ref_face(rig, joint, geos):
    """A Face for laying decals (emblems, stripes) on arbitrary geometry of `joint`."""
    return F.Face(rig, joint, list(geos))


def crew_runner(rig, name, parent="root", at=(0.0, 0.0, 0.0), k=1.0, jacket=None, cap=M.LEATHER,
                trousers=M.OLIVE, goggles=True):
    """A small, standalone crewman (feet at `at`, facing +x) for bail-outs: legs on joints
    `<name>_leg_r/l` (hip pivots), a waving arm on `<name>_arm` (modelled pointing up), a round head
    with wide eyes and an open yell mouth, a leather cap with goggles. Hidden by default."""
    x, y, z = at
    rig.joint(name, parent, at, hidden=True)
    hip = z + 11.0 * k
    for s, dy in (("r", -3.0), ("l", 3.0)):
        j = f"{name}_leg_{s}"
        rig.joint(j, name, (x, y + dy * k, hip))
        g = Geo().capsule((x, y + dy * k, hip), (x + 0.6 * k, y + dy * k, z + 3.0 * k), 2.6 * k, 2.3 * k)
        rig.part(j, g, trousers)
        g = Geo().blob((x + 2.0 * k, y + dy * k, z + 1.8 * k), (3.8 * k, 2.6 * k, 1.9 * k), p=2.6)
        rig.part(j, g, M.BOOT, finish="gloss")
    g = Geo().blob((x, y, z + 17.5 * k), (5.6 * k, 5.6 * k, 7.0 * k), p=2.4, taper=(1.1, 0.95))
    if jacket:
        rig.part(name, g, jacket)
    else:
        rig.part(name, g, team=True)
    hz = z + 29.0 * k
    g = Geo().blob((x + 0.8 * k, y, hz), (6.4 * k, 6.0 * k, 6.2 * k), p=2.3)
    g.blob((x + 7.2 * k, y - 0.4, hz - 1.0 * k), (2.0 * k, 1.8 * k, 1.9 * k), p=2.0)
    rig.part(name, g, M.SKIN)
    g = Geo()
    for yy in (-2.6 * k, 2.4 * k):
        g.blob((x + 5.2 * k, y + yy, hz + 1.0 * k), (1.8 * k, 1.8 * k, 2.4 * k))
    rig.part(name, g, M.EYE, highlight=False, outline=0.4)
    g = Geo()
    for yy in (-2.6 * k, 2.4 * k):
        g.blob((x + 6.6 * k, y + yy - 0.3, hz + 1.0 * k), (0.7 * k, 1.0 * k, 1.1 * k))
    rig.part(name, g, M.PUPIL, outline=0)
    g = Geo().blob((x + 6.2 * k, y - 0.6, hz - 3.6 * k), (1.2 * k, 2.2 * k, 1.8 * k), p=2.2)
    rig.part(name, g, M.MOUTH, outline=0, highlight=False)
    g = Geo().blob((x - 0.2 * k, y, hz + 2.6 * k), (7.0 * k, 6.6 * k, 5.0 * k), p=2.3)
    g.clip((x, y, hz + 0.8 * k), (0, 0, -1))
    g.blob((x - 1.4 * k, y - 6.0 * k, hz - 0.6 * k), (2.4 * k, 1.2 * k, 3.4 * k), p=2.3)
    rig.part(name, g, cap)
    if goggles:
        g = Geo()
        for yy in (-2.8 * k, 2.6 * k):
            g.lathe([(0, 0), (1.9 * k, 0.2), (2.0 * k, 1.4 * k), (0, 1.6 * k)], (x + 4.6 * k, y + yy, hz + 4.2 * k),
                    (x + 6.2 * k, y + yy, hz + 4.8 * k), segs=12)
        rig.part(name, g, M.GUNMETAL, finish="metal", outline=0.4)
    j = f"{name}_arm"
    rig.joint(j, name, (x + 0.6 * k, y - 5.4 * k, z + 21.5 * k))
    g = Geo().capsule((x + 0.6 * k, y - 5.4 * k, z + 21.5 * k), (x + 1.0 * k, y - 5.8 * k, z + 28.5 * k), 1.8 * k, 1.6 * k)
    if jacket:
        rig.part(j, g, jacket, outline=0.5)
    else:
        rig.part(j, g, team=True, outline=0.5)
    g = Geo().blob((x + 1.1 * k, y - 5.9 * k, z + 30.0 * k), (2.2 * k, 1.7 * k, 2.2 * k), p=2.3)
    rig.part(j, g, M.LEATHER, outline=0.5)
    return name


def run_pose(name, phase, arm=40.0):
    """Channels for a running crew_runner: legs scissor by `phase` (-1..1), the arm waves."""
    return {f"{name}_leg_r": {"r": 34.0 * phase}, f"{name}_leg_l": {"r": -34.0 * phase},
            f"{name}_arm": {"r": arm}}


# -- walk v3 body (ANIM_SPEC 2.0 rule 5, G1): longer legs and planted feet ----------------------
# The Modern bipeds share the rigs_modern (= rigs_industrial) joint names and arm layout, so the
# skeleton, the IK legs, the jog gait and the arm chain are kit_industrial's (kit_medieval's).
V3_THIGH_Z, V3_KNEE_Z, V3_ANKLE_Z, V3_LIFT = KI.V3_THIGH_Z, KI.V3_KNEE_Z, KI.V3_ANKLE_Z, KI.V3_LIFT
skeleton_v3 = KI.skeleton_v3
legs_ik = KI.legs_ik
jog_gait = KI.jog_gait
ground_feet = KI.ground_feet
kneel = KI.kneel


def legs_v3(rig, trousers="#767B5A", boot=M.BOOT, puttee=M.KHAKI, thigh_r=4.7, far=0.8, mud=False):
    """`rigs_modern.legs` for skeleton_v3: baggy olive trousers, khaki puttees with slanted wraps on
    slim shins (the two legs stay apart at 62 px), chunky 8.8 lu ankle boots with a thick sole on
    the foot joints. The far leg is `far` darker, so the near and far feet read apart (ANIM_SPEC
    G1). `mud` cakes the boot toes. Adds the `_foot` / `_foot_l` sole trackers."""
    from . import colors as CO
    for s in ("r", "l"):
        y = M.LEG_Y * M.SIDE_Y[s]
        k = 1.0 if s == "r" else far
        sh = (lambda c: c) if k == 1.0 else (lambda c, k=k: CO.scale(c, k))
        g = Geo().capsule((0, y, V3_THIGH_Z + 0.5), (0.5, y, V3_KNEE_Z), thigh_r, thigh_r - 0.4)
        rig.part(f"thigh_{s}", g, sh(trousers))
        g = Geo().capsule((0.5, y, V3_KNEE_Z), (1.0, y, V3_ANKLE_Z + 0.8), thigh_r - 0.9, 3.3)
        rig.part(f"shin_{s}", g, sh(puttee))
        g = Geo()
        for z in (6.8, 9.0):   # puttee wraps, slanted
            g.blob((0.8, y, z), (3.9, 3.9, 0.7), p=2.4, rot=(0, 12, 0))
        rig.part(f"shin_{s}", g, sh(M.KHAKI_LT), outline=0.5)
        g = Geo().blob((1.0, y, 5.2), (3.8, 4.0, 2.1), p=2.6)                  # boot shaft
        rig.part(f"shin_{s}", g, sh(boot), finish="gloss")
        g = Geo().blob((2.8, y, 2.4), (4.4, 4.6, 2.4), p=2.9, taper=(1.02, 0.84))   # 8.8 lu boot
        rig.part(f"foot_{s}", g, sh(boot), finish="gloss")
        g = Geo().blob((3.0, y, 0.6), (4.4, 4.7, 0.8), p=3.0)                  # thick sole
        rig.part(f"foot_{s}", g, sh("#2B2A2E"), outline=0.4)
        if mud:
            g = Geo().blob((5.0, y - 0.6 * M.SIDE_Y[s], 2.4), (2.6, 4.4, 1.9), p=2.6)
            rig.part(f"foot_{s}", g, sh(MUD), outline=0.4)
    rig.track("_foot", "foot_r", (2.6, -M.LEG_Y, 0.0))
    rig.track("_foot_l", "foot_l", (2.6, M.LEG_Y, 0.0))
