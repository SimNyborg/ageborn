"""Shared rig helpers for the Bronze Age units (docs/design-lane-ages.md A17.9, A17.12).

The biped is the Medieval biped (rigs_medieval: 68 lu, head about a third of the height,
feet at the origin, facing +X, `_r` the near side at -Y); this module re-exports its skeleton
and pose helpers and adds the antiquity kit: an open-faced bronze helmet with cheek guards and
a horsehair team crest (a follow-through joint), a round aspis shield with a team face, a linen
cuirass, a pteruges skirt, greaves and sandals.

Palette (A17.12 Bronze): sandstone, verdigris and dusk plum for large areas; polished bronze
is an accent only (it sits in the orange team band, so <= 10% of a silhouette). Helmets,
greaves, shield rims, bosses and blades are polished bronze #B8863B with the `bronze` finish
(a warm, clearly visible specular); larger metal (the Colossus body, frames) uses the aged,
desaturated bronze below (< 40% saturation). Verdigris and dusk plum go on cloth trim, belts
and shield backs so the age has its own colours next to the Stone Age browns.
"""
import math

from .anim import merge, squash
from .geometry import Geo
from .rigs_medieval import (ARM_Y, ELBOW_Z, HAND_Z, HIP_Z, KNEE_Z, LEG_Y, LOWER, SHOULDER_Z, SIDE_Y, UPPER,
                            arm, arm_parts, face, fk_hand, hit_body, idle_body, idle_wave, ik2, skeleton,
                            walk_legs, yell)

__all__ = ["ARM_Y", "ELBOW_Z", "HAND_Z", "HIP_Z", "KNEE_Z", "LEG_Y", "LOWER", "SHOULDER_Z", "SIDE_Y", "UPPER",
           "arm", "arm_parts", "face", "fk_hand", "hit_body", "idle_body", "idle_wave", "ik2", "skeleton",
           "walk_legs", "yell", "merge", "squash"]

# -- palette -----------------------------------------------------------------------------------
SAND = "#CDBE9E"         # sandstone (large areas)
SAND_LT = "#E3D8BE"
SAND_DK = "#A99A7A"
VERD = "#4F8F7F"         # verdigris (large areas)
VERD_DK = "#3E7266"
VERD_LT = "#78AE9F"
PLUM = "#6A5566"         # dusk plum (large areas)
PLUM_DK = "#54434F"
BRONZE = "#B8863B"       # polished bronze: ACCENT only (helmets, greaves, rims, bosses, blades)
POLISH = "bronze"        # the finish for polished bronze (config.FINISHES)
BRONZE_HI = "#D8B26A"
AGED = "#A08C66"         # aged bronze for large metal areas (sat ~36%, outside the rule)
AGED_DK = "#7E6D50"
LINEN = "#EAE1CB"
SKIN = "#DDB592"
SKIN_DK = "#B98E6C"
HAIR = "#3A2C24"
LEATHER = "#7A6450"
LEATHER_DK = "#5C4C3E"
WOOD = "#9C8468"
WOOD_DK = "#6E5A45"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
TOOTH = "#F4EEDC"
FIRE = "#FFE3B0"
FIRE_CORE = "#FFF6E0"
DUST = "#E6DCC6"


# -- body kit ------------------------------------------------------------------------------------
def sandal_legs(rig, skin=SKIN, sandal=LEATHER, greave=BRONZE, thigh_r=4.6, hip_z=HIP_Z, greaves=True):
    """Bare legs with laced sandals and (optionally) aged-bronze greaves over the shins."""
    for s in ("r", "l"):
        y = LEG_Y * SIDE_Y[s]
        g = Geo().capsule((0, y, hip_z), (0.5, y, KNEE_Z), thigh_r, thigh_r - 0.7)
        rig.part(f"thigh_{s}", g, skin)
        g = Geo().capsule((0.5, y, KNEE_Z), (1.0, y, 4.0), thigh_r - 0.7, 3.4)
        rig.part(f"shin_{s}", g, skin)
        g = Geo().blob((3.1, y, 2.4), (6.6, 4.2, 2.5), p=2.6, taper=(1.02, 0.86))
        rig.part(f"shin_{s}", g, skin)
        g = Geo().blob((3.1, y, 1.0), (7.0, 4.6, 1.2), p=3.2)          # sole
        g.capsule((1.0, y - 3.8 * (1 if s == "r" else -1), 4.2), (4.0, y - 4.2 * (1 if s == "r" else -1), 2.0), 0.7)
        rig.part(f"shin_{s}", g, sandal, outline=0.6)
        if greaves:
            g = Geo().blob((1.4, y - 0.6 * (1 if s == "r" else -1), 7.4), (4.3, 4.3, 5.4), p=2.4,
                           taper=(0.86, 1.08))
            rig.part(f"shin_{s}", g, greave, finish=POLISH if greave == BRONZE else "metal")
            g = Geo().blob((1.4, y - 0.6 * (1 if s == "r" else -1), 12.2), (4.5, 4.5, 0.9), p=3.0)
            rig.part(f"shin_{s}", g, VERD_DK, outline=0.5)          # verdigris garter strap


def pteruges(rig, joint, z_top, color, team=False, n=7, radius=(11.0, 10.2), length=8.0, y0=0.0):
    """A skirt of hanging leather strips around the hips (split into tabs)."""
    g = Geo()
    for k in range(n):
        a = math.pi * (0.55 + 1.9 * k / max(1, n - 1))
        x = radius[0] * math.cos(a) * 0.98
        y = radius[1] * math.sin(a) + y0
        g.blob((x, y, z_top - length / 2), (3.0, 2.6, length / 2), p=3.0, taper=(0.9, 1.0),
               rot=(0, 0, math.degrees(a) + 90))
    rig.part(joint, g, color, team=team, outline=0.8)


def cuirass(rig, color=LINEN, trim=VERD, team_band=True, bulk=1.0, z=28.0):
    """A linen cuirass (linothorax) over the torso with a team band across the belly."""
    k = bulk
    g = Geo().blob((0.2, 0, z), (10.8 * k, 9.8 * k, 11.6), p=2.4, taper=(1.08, 0.94))
    rig.part("torso", g, color)
    if team_band:
        g = Geo().blob((0.5, 0, z - 5.0), (11.3 * k, 10.3 * k, 4.4), p=3.0)
        rig.part("torso", g, team=True, outline=0.8)
    if trim:
        g = Geo().blob((0.6, 0, z - 9.4), (11.4 * k, 10.4 * k, 1.3), p=3.2)
        g.blob((0.6, 0, z - 0.6), (11.2 * k, 10.2 * k, 1.1), p=3.2)
        rig.part("torso", g, trim, finish=POLISH if trim == BRONZE else "matte", outline=0.6)


def head_ball(rig, skin=SKIN, center=(2, 0, 49.0), r=(11.4, 10.8, 11.2), nose=(13.4, -0.6, 48.0),
              nose_r=(3.0, 2.9, 3.1)):
    g = Geo().blob(center, r, p=2.3)
    g.blob(nose, nose_r, p=2.0)
    rig.part("head", g, skin)


def beard(rig, color=HAIR, cx=11.0, z=42.0, full=True):
    g = Geo().blob((cx - 2.0, 0, z), (6.6, 9.2, 4.6 if full else 3.2), p=2.2, taper=(0.7, 1.0))
    g.blob((cx + 1.0, -0.4, z + 2.6), (2.8, 4.8, 1.6), p=2.2)
    rig.part("head", g, color, finish="hair")


def helmet(rig, color=BRONZE, rim=VERD, crest=True, crest_len=26.0, crest_h=10.0, tall=0.0, cheek=True,
           crest_color=None, c=(1.5, 0, 55.0), crest_joint="crest", joint="head", crest_secondary=True):
    """An open-faced bronze helmet (Chalcidian cut): a dome, a neck guard, cheek guards that
    leave the eyes free, a polished rim and a tall horsehair crest (team) on a stilt that trails
    back and follows through. `tall` raises the dome (the Phalangite's high helmet)."""
    cx, cy, cz = c
    g = Geo().blob((cx, cy, cz + tall * 0.4), (12.4, 11.8, 10.2 + tall), p=2.4)
    g.clip((0, 0, cz - 1.6), (0, 0, -1))
    fin = POLISH if color == BRONZE else "metal"
    rig.part(joint, g, color, finish=fin)
    g = Geo().blob((cx - 7.5, cy, cz - 5.0), (6.2, 11.4, 6.4), p=2.4)       # neck guard
    g.clip((cx - 5.0, 0, 0), (1, 0, 0))
    rig.part(joint, g, AGED if color == BRONZE else color, finish="metal")
    if cheek:
        g = Geo()
        for y in (-10.2, 10.2):
            g.blob((cx + 3.2, y, cz - 6.6), (3.6, 1.6, 5.0), p=2.4, taper=(0.55, 1.0), rot=(0, -8, 0))
        rig.part(joint, g, AGED if color == BRONZE else color, finish="metal", outline=0.8)
    g = Geo().blob((cx + 0.4, cy, cz - 1.4), (12.9, 12.3, 1.3), p=2.8)       # polished rim
    g.capsule((cx + 12.0, -4.5, cz + 2.8), (cx + 12.4, 4.5, cz + 2.8), 1.0)   # brow ridge
    rig.part(joint, g, rim, finish=POLISH if rim in (BRONZE, BRONZE_HI) else "metal", outline=0.6)
    if not crest:
        return None
    top = cz + 10.0 + tall
    g = Geo().capsule((cx, cy, top - 1.0), (cx - 1.0, cy, top + 4.2), 1.5)   # crest stilt
    rig.part(joint, g, VERD_DK, finish="metal", outline=0.6)
    if crest_secondary:
        rig.secondary(crest_joint, joint, (cx + 6.0, cy, top + 4.0), (cx - crest_len, cy, top + 1.0),
                      max_deg=10, gain=0.9)
    else:
        crest_joint = joint
    g = Geo()
    n = 9
    for i in range(n):
        t = i / (n - 1)
        a = math.pi * (0.1 + 0.95 * t)
        x = cx + 4.0 + 7.0 * math.cos(a) - (crest_len - 6.0) * t
        z = top + 3.0 + crest_h * math.sin(a) * (1.0 - 0.25 * t)
        r = 3.6 + 1.6 * math.sin(math.pi * t) - 1.2 * t
        g.blob((x, cy, z), (r * 1.05, 2.6, r), p=2.1)
    if crest_color:
        rig.part(crest_joint, g, crest_color, finish="hair")
    else:
        rig.part(crest_joint, g, team=True)
    return crest_joint


def aspis(rig, joint, center, r=13.0, depth=2.4, face_team=True, emblem=SAND_LT, rim=BRONZE, rot=(0, 0, 0),
          boss=True, rim_w=1.8, rivets=0):
    """A round shield facing the camera (-Y): a team face, a polished rim and a sandstone
    emblem (a lambda chevron). `center` is the face centre; the grip sits behind it."""
    cx, cy, cz = center
    # back plate (rim colour) and the face in front of it, both bowed toward the camera
    g = Geo().blob((cx, cy + depth * 0.4, cz), (r, depth, r), p=2.0, rot=rot)
    g.clip((0, cy + depth * 0.3, 0), (0, 1, 0))
    rig.part(joint, g, rim, finish=POLISH if rim in (BRONZE, BRONZE_HI) else "metal")
    g = Geo().blob((cx, cy + depth * 1.1, cz), (r * 0.97, depth * 0.8, r * 0.97), p=2.0, rot=rot)
    g.clip((0, cy + depth * 1.0, 0), (0, -1, 0))
    rig.part(joint, g, PLUM_DK, outline=0.6)                                  # plum shield back
    g = Geo().blob((cx, cy + 0.2, cz), (r - rim_w, depth * 0.95, r - rim_w), p=2.0, rot=rot)
    g.clip((0, cy + depth * 0.2, 0), (0, 1, 0))
    if face_team:
        rig.part(joint, g, team=True, outline=0.8)
    else:
        rig.part(joint, g, PLUM, outline=0.8)
    if emblem:
        k = r / 13.0
        g = Geo()
        fy = cy - depth * 0.95 + 0.3
        g.capsule((cx - 5.6 * k, fy, cz - 6.2 * k), (cx, fy - 0.2, cz + 6.4 * k), 1.5 * k)
        g.capsule((cx, fy - 0.2, cz + 6.4 * k), (cx + 5.6 * k, fy, cz - 6.2 * k), 1.5 * k)
        rig.part(joint, g, emblem, outline=0.5)
    if boss:
        g = Geo().sphere((cx, cy - depth * 0.95 - 0.4, cz), 1.6 * r / 13.0, cuts=3)
        rig.part(joint, g, BRONZE_HI, finish=POLISH, outline=0.5)
    if rivets:
        # polished rivets just inside the rim (read as a dotted ring at game size)
        g = Geo()
        rr = r - rim_w - 1.4
        for k in range(rivets):
            a = 2 * math.pi * (k + 0.5) / rivets
            g.sphere((cx + rr * math.cos(a), cy - depth * 0.9, cz + rr * math.sin(a)), 1.05, cuts=2)
        rig.part(joint, g, SAND_LT, finish="metal", outline=0.4)


def spear(rig, joint, grip, fwd=30.0, back=18.0, r=1.4, shaft=WOOD, head=BRONZE, head_len=9.0, butt=True,
          axis=(0, 0, 1)):
    """A spear through `grip` along `axis` (default +Z, i.e. modelled pointing up from the fist):
    a wooden shaft, a leaf-shaped polished head at +fwd and a bronze butt spike (sauroter)."""
    gx, gy, gz = grip
    ax = axis

    def at(d):
        return (gx + ax[0] * d, gy + ax[1] * d, gz + ax[2] * d)
    g = Geo().capsule(at(-back), at(fwd - head_len + 1.0), r, r * 0.85, segs=12, rings=3)
    rig.part(joint, g, shaft, outline=0.8)
    g = Geo().lathe([(0, 0), (r * 1.15, 0.6), (r * 1.9, head_len * 0.32), (r * 1.3, head_len * 0.7), (0, head_len)],
                    at(fwd - head_len), at(fwd), segs=12, squash=(1.0, 0.5))
    rig.part(joint, g, head, finish=POLISH if head in (BRONZE, BRONZE_HI) else "metal", outline=0.6)
    if butt:
        g = Geo().lathe([(r * 1.1, 0), (r * 1.0, 3.0), (0, 5.0)], at(-back + 0.5), at(-back - 4.5), segs=10)
        rig.part(joint, g, AGED_DK, finish="metal", outline=0.5)
    return at(fwd)


def dust_puff(rig, joint, at, size=1.0, name="dust", color=DUST, hidden=True):
    """Hidden puff of dust (a stomp, a skid, a shove), shown by pose."""
    x, y, z = at
    k = size
    rig.joint(name, joint, at, hidden=hidden)
    g = Geo()
    for dx, dz, rr in ((0, 0, 4.4), (5.2, 1.0, 3.6), (-4.8, 1.2, 3.4), (2.4, 4.2, 3.0), (-1.8, 4.6, 2.6),
                       (8.4, -0.4, 2.4), (-8.0, 0.0, 2.4)):
        g.sphere((x + dx * k, y - 4, z + dz * k), rr * k, cuts=3)
    rig.part(name, g, color, finish="dust", outline=0.8)
    return name


def sparks(rig, joint, at, size=1.0, name="sparks", color=FIRE, core=FIRE_CORE, rays=6, seed=0, hidden=True):
    """A small star-burst of white-hot sparks (low saturation, A17.12)."""
    x, y, z = at
    rig.joint(name, joint, at, hidden=hidden)
    g = Geo()
    for i in range(rays):
        a = 2 * math.pi * (i + 0.37 * seed) / rays
        L = (5.0 + 2.5 * ((i * 7 + seed) % 3)) * size
        g.capsule((x + math.cos(a) * 1.5 * size, y - 3, z + math.sin(a) * 1.5 * size),
                  (x + math.cos(a) * L, y - 3, z + math.sin(a) * L), 0.9 * size, 0.4 * size, segs=6, rings=2)
    rig.part(name, g, glow=color, outline=0)
    g = Geo().sphere((x, y - 4, z), 2.2 * size, cuts=3)
    rig.part(name, g, glow=core, outline=0)
    return name


# -- cartoon kit v2 (art director plan 2026-09-30) ------------------------------------------------
def face_kit(rig, cx=12.0, cz=50.0, skin=SKIN, brow=HAIR, eye_r=(3.4, 3.2, 4.2), eye_dy=(-4.6, 4.4),
             center=(2, 0, 49.0), r=(11.4, 10.8, 11.2), nose=(13.4, -0.6, 48.0), nose_r=(3.0, 2.9, 3.1),
             extra=(), mouth_z=None, mouth_w=5.2, brow_tilt=2.2, head="head"):
    """Head ball, big eyes (pupils on their own joint), an angry brow on a `brow` joint, a
    default mouth decal (`mouth`) and the face kit (face.py): lids, squeeze, X and spiral eyes,
    grit, yell, O and KO tongue. `extra` are Geo objects that sit on the face (a beard) so
    the decals land on them. Returns the Face."""
    from . import face as FK
    g = Geo().blob(center, r, p=2.3)
    g.blob(nose, nose_r, p=2.0)
    eyes, pup = Geo(), Geo()
    for y in eye_dy:
        eyes.blob((cx - 1.4, y, cz), eye_r)
        pup.blob((cx + 1.5, y - 0.4, cz - 0.3), (1.4, 2.1, 2.2))
    face = FK.Face(rig, head, [g, eyes, pup] + list(extra))
    rig.part(head, g, skin)
    rig.part(head, eyes, EYE, highlight=False)
    rig.joint("pupils", head, (cx + 1.5, 0, cz))
    rig.part("pupils", pup, PUPIL, outline=0)
    if brow:
        rig.joint("brow", head, (cx, 0, cz + 4.6))
        a = brow_tilt
        gb = Geo().capsule((cx - 1.8, eye_dy[0] - 3.4, cz + 5.4 + a * 0.4), (cx + 1.0, -0.4, cz + 4.0 - a * 0.5), 2.0, 1.8)
        gb.capsule((cx + 1.0, -0.4, cz + 4.0 - a * 0.5), (cx - 1.8, eye_dy[1] + 3.2, cz + 5.4 + a * 0.4), 1.8, 2.0)
        rig.part("brow", gb, brow, finish="hair", outline=0.7)
    mz = cz - 7.0 if mouth_z is None else mouth_z
    mx = cx - 0.4
    rig.joint("mouth", head, (mx, 0, mz))
    c = face.hit(mx, mz)
    gm = Geo()
    face.decal(gm, c, [(-2.2, 0.5), (2.0, 0.8), (2.1, -0.3), (-2.0, -0.6)], 0.4)
    rig.part("mouth", gm, MOUTH, outline=0, highlight=False)
    ex = cx - 1.4 + eye_r[0] * 0.62
    face.eye_marks([(ex, cz)], eye_r[2] * 0.95, skin)
    face.mouths((mx, mz - 0.4), mouth_w)
    return face


# D2 stiff topple (armoured and shield infantry): struck, a wobble forward to hold the line,
# then he goes over backwards stiff as a plank, slams flat, bounces once and lies still.
# (x back, z up, r pitch about the belly, q squash). The helmet pops off on the fall (unit side).
D2_PATH = [
    dict(x=-2.0, z=0.0, r=7.0, q=-0.12),
    dict(x=-1.0, z=0.0, r=-7.0, q=0.05),
    dict(x=-3.0, z=1.0, r=16.0, q=0.03),
    dict(x=-7.0, z=2.0, r=48.0, q=0.02),
    dict(x=-11.0, z=0.0, r=90.0, q=-0.2),
    dict(x=-11.5, z=3.0, r=84.0, q=0.07),
    dict(x=-12.0, z=0.0, r=90.0, q=-0.08),
    dict(x=-12.0, z=0.0, r=90.0, q=-0.03),
    dict(x=-12.0, z=0.0, r=90.0, q=-0.06, s=0.96),
    dict(x=-12.0, z=0.0, r=90.0, q=-0.1, s=0.9),
]


def die_d2(k, center_z, lie_z, height):
    """Body channels of the D2 path, step k of 10 (moves.DIE_MS). Pivots about the belly;
    once tipped past 30 degrees the centre is lowered to lying height `lie_z`."""
    from . import moves as M
    b = D2_PATH[k]
    sc = max(0.7, min(1.4, height / 68.0))
    land = -(center_z - lie_z) * max(0.0, min(1.0, (b["r"] - 20.0) / 68.0)) ** 1.3
    return M.body_about((0, 0, center_z), x=b["x"] * sc, z=b["z"] * sc + land, r=b["r"], q=b["q"],
                        s=b.get("s", 1.0))


HIT_ARM_AMT = [0.8, 1.0, 0.55, -0.15, 0.05]


def hit_armoured(k, stance, recoil, face_hurt=None, helm="helm"):
    """Armoured biped: a dip behind the shield (knees bend, shield up), the helmet clanks down
    over the eyes on frame 1, then a small push back up and a settle. `recoil(a)` adds the
    unit's shield and weapon motion at amount a (a < 0 the push back)."""
    a = HIT_ARM_AMT[k]
    q = [-0.12, -0.08, 0.03, 0.02, 0.0][k]
    out = merge(stance, {"body": dict(squash(q), x=-2.5 * max(a, 0) + 0.8 * min(a, 0)),
                         "hips": {"z": -2.2 * max(a, 0)},
                         "thigh_r": {"r": 10 * max(a, 0)}, "shin_r": {"r": -16 * max(a, 0)},
                         "thigh_l": {"r": 6 * max(a, 0)}, "shin_l": {"r": -14 * max(a, 0)},
                         "torso": {"r": 6 * a}, "head": {"r": 8 * a}}, recoil(a))
    if helm and k in (1, 2):
        out = merge(out, {helm: {"z": -3.2 if k == 1 else -1.2, "r": -4 if k == 1 else 2}})
    if k <= 1 and face_hurt:
        out = merge(out, face_hurt)
    return out


# -- walk v3 (ANIM_SPEC 2.0 rule 5, G1/G2): longer legs and planted feet ---------------------------
# The thigh pivots sit higher than the hips joint (the legs grow from 11 to 15.5 lu), `foot_r/l`
# joints carry the sandals (planted feet, toe-off roll), and the upper body sits LIFT higher
# (rig.rest_offset) so the legs show without moving every part. heightLu grows by LIFT (<= 2 lu).
V3_THIGH_Z, V3_KNEE_Z, V3_ANKLE_Z = 19.5, 11.5, 4.0
V3_LIFT = 2.0
V3_FAR = 0.8          # the far leg is 20% darker (near and far feet read apart)


def skeleton_v3(rig, head=(1, 0, 38), arm_y=None, lift=V3_LIFT):
    """The Bronze biped skeleton with walk-v3 legs (thigh, shin, foot per side)."""
    from .rigs_medieval import ELBOW_Z as _EZ
    arm_y = arm_y or ARM_Y
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, HIP_Z))
    rig.joint("torso", "hips", (0, 0, HIP_Z + 1))
    rig.rest_offset["torso"] = (0, 0, lift)
    rig.joint("head", "torso", head)
    for s in ("r", "l"):
        y = LEG_Y * SIDE_Y[s]
        rig.joint(f"thigh_{s}", "hips", (0, y, V3_THIGH_Z))
        rig.joint(f"shin_{s}", f"thigh_{s}", (0.5, y, V3_KNEE_Z))
        rig.joint(f"foot_{s}", f"shin_{s}", (1.0, y, V3_ANKLE_Z))
        y = arm_y[s]
        rig.joint(f"arm_{s}", "torso", (0, y, SHOULDER_Z))
        rig.joint(f"fore_{s}", f"arm_{s}", (0, y, _EZ))
        rig.joint(f"hand_{s}", f"fore_{s}", (0, y, HAND_Z))
    rig.track("_foot", "foot_r", (2.6, -LEG_Y, 0.0))
    rig.track("_foot_l", "foot_l", (2.6, LEG_Y, 0.0))


def sandal_legs_v3(rig, skin=SKIN, sandal=LEATHER, greave=BRONZE, greaves=True, thigh_r=4.4,
                   laces=LEATHER_DK, far=V3_FAR, wraps=None):
    """Bare legs for skeleton_v3: thighs, shins, short sandalled feet (8.8 lu long) on the foot
    joints with laces up the calf, optional polished greaves; the far leg `far` darker.
    `wraps` (a colour or "team") adds a wrap below the knee (team wraps help the 18% rule)."""
    from .colors import scale as _sc
    for s in ("r", "l"):
        y = LEG_Y * SIDE_Y[s]
        sg = 1 if s == "r" else -1
        k = 1.0 if s == "r" else far
        sk, sa, gr, la = (_sc(c, k) if k != 1.0 else c for c in (skin, sandal, greave, laces))
        g = Geo().capsule((0, y, V3_THIGH_Z), (0.5, y, V3_KNEE_Z), thigh_r, thigh_r - 0.7)
        rig.part(f"thigh_{s}", g, sk)
        g = Geo().capsule((0.5, y, V3_KNEE_Z), (1.0, y, V3_ANKLE_Z + 0.4), thigh_r - 0.7, 3.2)
        rig.part(f"shin_{s}", g, sk)
        g = Geo().blob((2.2, y, 2.6), (3.8, 3.7, 2.1), p=2.5, taper=(1.0, 0.85))      # foot (skin)
        rig.part(f"foot_{s}", g, sk)
        g = Geo().blob((2.6, y, 0.9), (4.4, 4.3, 1.0), p=3.2)                          # sole
        g.capsule((2.4, y - 3.6 * sg, 3.6), (3.4, y - 3.9 * sg, 1.4), 0.7)            # instep strap
        rig.part(f"foot_{s}", g, sa, outline=0.6)
        if laces:
            g = Geo()
            for z in (5.4, 7.6):
                g.blob((1.0, y, z), (3.6, 3.6, 0.7), p=3.0)
            rig.part(f"shin_{s}", g, la, outline=0.4)
        if wraps:
            g = Geo().capsule((0.6, y, 10.6), (0.85, y, 8.4), 3.9, 3.7)
            if wraps == "team":
                rig.part(f"shin_{s}", g, team=True, outline=0.6)
            else:
                rig.part(f"shin_{s}", g, _sc(wraps, k) if k != 1.0 else wraps, outline=0.6)
        if greaves:
            g = Geo().blob((1.4, y - 0.6 * sg, 8.0), (4.0, 4.0, 3.9), p=2.4, taper=(0.86, 1.08))
            rig.part(f"shin_{s}", g, gr, finish=POLISH if greave == BRONZE else "metal")
            g = Geo().blob((1.2, y - 0.6 * sg, 11.4), (4.1, 4.1, 0.8), p=3.0)
            rig.part(f"shin_{s}", g, _sc(VERD_DK, k) if k != 1.0 else VERD_DK, outline=0.5)


def walk_legs_v3():
    """gait.Leg per side for skeleton_v3 (the end point is the ankle; toe and heel pivots)."""
    from . import gait as GT
    return {s: GT.Leg(f"thigh_{s}", f"shin_{s}", (1.0, LEG_Y * SIDE_Y[s], V3_ANKLE_Z), foot=f"foot_{s}",
                      toe=(6.0, LEG_Y * SIDE_Y[s], 0.3), heel=(-1.4, LEG_Y * SIDE_Y[s], 0.3))
            for s in ("r", "l")}


def jog_gait(speed, legs, cycle_ms=616, stance=0.38, lift=6.5, kick=3.0, x_mid=1.6, drag=0.3,
             early_lift=1.6, toe_off=24.0, shift=-0.03):
    """The G1 bounce jog of the Stone pilot (8 frames, flight on UP), for skeleton_v3 legs."""
    from . import gait as GT
    g = GT.Gait(8, cycle_ms, speed, GT.biped_feet(legs["l"], legs["r"], x_mid=x_mid), stance,
                lift=lift, kick=kick, reach=0.0, toe_off=toe_off, early_lift=early_lift, drag=drag,
                lift_peak=0.38)
    for k, (leg, ph, x, gz) in list(g.feet.items()):
        g.feet[k] = (leg, ph + shift, x, gz)
    return g


def plant(rig, pose, legs, r=(2.0, 0.0, 0.0), l=(-2.0, 0.0, 0.0), report=None, drop=True, max_drop=4.0):
    """Feet placed by IK in an attack or hit pose: r/l = (x, lift, foot angle) of each ankle in
    character space (x forward of the unit origin, lift above the planted height, angle 0 flat,
    negative toe down). Keeps planted feet on the ground whatever the body does. With `drop`, a
    foot the legs cannot reach lowers the body (a wider stance is a lower stance) instead of
    hanging short, by at most `max_drop`; beyond that the foot drags toward the hip."""
    from . import gait as GT
    from .anim import merge as _merge
    tg = {"r": (legs["r"], r[0], V3_ANKLE_Z + r[1], r[2]), "l": (legs["l"], l[0], V3_ANKLE_Z + l[1], l[2])}
    clean = {j: {k: v for k, v in ch.items() if not (j.startswith(("thigh_", "shin_", "foot_")) and k == "r")}
             for j, ch in pose.items()}
    dropped = 0.0
    for _ in range(10):
        rep = []
        out = GT.solve(rig, clean, tg, report=rep)
        if not rep or max(d for _, d in rep) <= 0.05:
            break
        short = max(d for _, d in rep)
        if drop and dropped < max_drop:
            d = min(short + 0.3, max_drop - dropped)
            dropped += d
            clean = _merge(clean, {"body": {"z": -d}})
            continue
        # still out of reach: the foot drags toward the hip (a lunge pulls the back foot along)
        for name, d in rep:
            leg, x, z, a = tg[name]
            hx = rig.char_pos(rig.joints[leg.upper]).x
            tg[name] = (leg, x + (d + 0.3) * (1 if hx > x else -1), z, a)
    if report is not None:
        report.extend(rep)
    return out
