"""Medieval Age cartoon kit v2 (art director plan 2026-09-30): the helpers the Medieval units
share on top of `moves.py`, `face.py` and `smear2.py`. Kept in its own module so the older
`rigs_medieval.py` API (also used by the Bronze Age rigs) stays unchanged.

  face2()        big cartoon eyes (whites on the head, pupils on their own `pupils` joint), a
                 `brow` joint, a default mouth decal on `mouth`, an optional moustache, and the
                 face kit (lids, squeeze, X, spiral, grit, yell, O, KO tongue)
  scr()          the rest-pose screen position (x, z) of a character-space point, for decals
  paw()          the Medieval bear-paw emblem as a decal (non-team, parchment)
  hit_armoured() armoured biped hit: a dip behind the shield, the helmet clanks down over the
                 eyes, then an overshoot forward
  die_d2()       D2 topple: a stagger, then a stiff plank fall face first about the toes, a
                 bounce, the helmet rolling off (the unit animates its own helmet)
  die_d3_sit()   D3 dizzy sit poses that change the silhouette (the Stone review rule)
"""
import math

from . import face as F
from . import moves as M
from .anim import merge, squash
from .geometry import Geo

EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
PARCH = "#E8DFC8"


def scr(face, p):
    """Screen position (x, z) of char-space point p, as Face.hit() expects it."""
    x, y, z = p
    v = face.view
    return (x - y * v.x / v.y, z - y * v.z / v.y)


def face2(rig, skin_geos, skin, cx, cz, eye_dy=(-4.6, 4.4), eye_r=(3.6, 3.4, 4.5),
          pupil_r=(1.5, 2.3, 2.6), brow=None, brow_angry=True, brow_w=1.0, mouth_w=5.6,
          mouth_dz=-7.4, head="head", mouth_shape="grim", extra_geos=(), eye_at=None,
          mouth_x=None, mark_r=None):
    """Eyes, pupils, brow, mouth and the face kit on joint `head`. Call before the skin geos
    are given to rig.part (the ray casts need their bmesh). Returns the Face."""
    eyes = Geo()
    for y in eye_dy:
        eyes.blob((cx - 1.2, y, cz), eye_r)
    pup = Geo()
    for y in eye_dy:
        pup.blob((cx + 1.7, y - 0.4, cz - 0.3), pupil_r)
    face = F.Face(rig, head, list(skin_geos) + list(extra_geos) + [eyes, pup])
    rig.part(head, eyes, EYE, highlight=False)
    rig.joint("pupils", head, (cx + 1.7, 0, cz - 0.3))
    rig.part("pupils", pup, PUPIL, outline=0)
    # the near eye's visible centre on screen (the lids and KO marks are laid over it)
    ex, ez = eye_at if eye_at else (cx + 1.4, cz)
    if brow:
        rig.joint("brow", head, (cx, 0, cz + 5.0))
        g = Geo()
        a = 2.2 if brow_angry else -0.8
        y0, y1 = eye_dy[0] - 3.4, eye_dy[1] + 3.2
        g.capsule((cx - 2.0, y0, cz + 5.6 + a * 0.45), (cx + 1.0, -0.4, cz + 4.2 - a * 0.5),
                  2.0 * brow_w, 1.8 * brow_w)
        g.capsule((cx + 1.0, -0.4, cz + 4.2 - a * 0.5), (cx - 2.0, y1, cz + 5.6 + a * 0.45),
                  1.8 * brow_w, 2.0 * brow_w)
        rig.part("brow", g, brow, finish="hair")
    mx, mz = (mouth_x if mouth_x is not None else cx + 1.2), cz + mouth_dz
    rig.joint("mouth", head, (mx, 0, mz))
    g = Geo()
    c = face.hit(mx + 0.6, mz)
    w = mouth_w
    if mouth_shape == "smile":
        pts = [(-w * 0.5, w * 0.1), (0.0, -w * 0.2), (w * 0.5, w * 0.12)]
    else:
        pts = [(-w * 0.5, -w * 0.02), (w * 0.45, w * 0.06)]
    face.stroke(g, c, pts, 1.5, 0.4)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    face.eye_marks([(ex, ez)], mark_r or eye_r[2] * 0.95, skin)
    face.mouths((mx + 0.6, mz - 0.4), w * 1.05)
    return face


def paw(face, g, center_xz, s=1.0, depth=0.4):
    """Bear-paw emblem (pad plus four toes) decal centred at screen (x, z)."""
    c = face.hit(*center_xz)
    face.decal(g, c, F.ellipse(0, -1.0 * s, 2.7 * s, 2.2 * s, 16), depth)
    for a, r in ((152, 0.95), (114, 1.08), (66, 1.08), (28, 0.95)):
        u, v = math.cos(math.radians(a)) * 3.0 * s, math.sin(math.radians(a)) * 2.4 * s + 0.9 * s
        face.decal(g, c, F.ellipse(u, v, 1.2 * s * r, 1.35 * s * r, 12), depth)
    return g


# -- hit: armoured biped ----------------------------------------------------------------------
def hit_armoured(k, stance, recoil, face_hurt=None, face_back=None, helm="helm", clank=2.6, push=3.5):
    """A dip behind the shield (squash), the helmet clanking down over the eyes on the
    held recoil frame, a small hop back, then an overshoot forward and a settle."""
    a = M.HIT_AMT[k]
    q = [-0.12, -0.08, 0.03, -0.02, 0.0][k]
    out = merge(stance, {"body": dict(squash(q), x=-push * max(a, 0) + 0.3 * push * min(a, 0)),
                         "hips": {"z": -2.0 * max(a, 0)}}, recoil(a))
    if helm:
        out = merge(out, {helm: {"z": [-1.2, -clank, -0.8, 0.4, 0.0][k],
                                 "r": [3, -4, 2, -1, 0][k]}})
    if k <= 1 and face_hurt:
        out = merge(out, face_hurt)
    elif k == 2 and face_back:
        out = merge(out, face_back)
    return out


# -- die D2: plank topple, face first ---------------------------------------------------------
# x forward, z up, r pitch (negative = falling forward), q squash; pivot at the toes
D2_PATH = [
    dict(x=-3.0, z=0.0, r=8.0, q=-0.12),     # struck: rocks back
    dict(x=-4.0, z=1.5, r=12.0, q=0.06),     # teeters on the heels
    dict(x=-2.5, z=0.5, r=2.0, q=0.02),      # stiffens (the "uh-oh" beat)
    dict(x=0.0, z=0.0, r=-22.0, q=0.0),      # tips over like a plank
    dict(x=1.0, z=0.0, r=-58.0, q=0.0),
    dict(x=1.0, z=0.0, r=-92.0, q=-0.16),    # SLAM (squash)
    dict(x=1.0, z=3.0, r=-84.0, q=0.06),     # bounce
    dict(x=1.0, z=0.0, r=-90.0, q=-0.06),
    dict(x=1.0, z=0.0, r=-90.0, q=-0.04, s=0.97),
    dict(x=1.0, z=0.0, r=-90.0, q=-0.08, s=0.92),
]


def die_d2(k, toe_x=6.0, heel_x=-4.0, lie_lift=6.0, back=False):
    """Body channels of the D2 path, step k of 10. Forward tips pivot about the toes, the
    rock back about the heels; the lying body is lifted `lie_lift` so its front rests on the
    ground instead of sinking into it. back=True mirrors it: a lurch forward, then a stiff
    fall onto the back about the heels ("timber")."""
    b = D2_PATH[k]
    r = -b["r"] if back else b["r"]
    x = -b["x"] if back else b["x"]
    fwd = r < 0
    piv = toe_x if fwd else heel_x
    lift = lie_lift * min(1.0, abs(r) / 90.0) if (k >= 3) else 0.0
    return M.body_about((piv, 0, 0), x=x, z=b["z"] + lift, r=r, q=b["q"],
                        s=b.get("s", 1.0))


# -- die D3: dizzy sit ------------------------------------------------------------------------
def d3_sit(k, amount=None):
    """Leg, torso and arm channels for the dizzy sit, blended in by `amount` (0..1, default
    from the step): hips down 12.5, thighs 82 forward, shins 30 bent, torso back 28, arms
    wide, head lolling."""
    t = amount if amount is not None else [0, 0, 0.1, 0.3, 1.0, 0.95, 1.0, 1.0, 1.0, 1.0][k]
    return {
        "hips": {"z": -12.5 * t},
        "thigh_r": {"r": 82 * t}, "shin_r": {"r": -30 * t},
        "thigh_l": {"r": 78 * t}, "shin_l": {"r": -26 * t},
        "torso": {"r": 28 * t},
        "head": {"r": -10 * t, "rx": 14 * t},
        "arm_r": {"r": 40 * t}, "arm_l": {"r": -36 * t},
    }


# -- walk v3 body (ANIM_SPEC 2.0 rule 5, G1/G2): longer legs, planted feet --------------------
# The Medieval bipeds keep `rigs_medieval.skeleton`'s joint names and arm layout; the thigh
# pivots sit higher (19.5 lu instead of 15), the knee at 11.5, a `foot_r/l` joint at the ankle
# carries a short boot (8.8 lu) that rolls on the toe-off, and the upper body is lifted 2 lu
# (`rest_offset`) so the longer legs show without rebuilding every torso part.
V3_THIGH_Z, V3_KNEE_Z, V3_ANKLE_Z, V3_LIFT = 19.5, 11.5, 4.0, 2.0
V3_TOE, V3_HEEL = 6.4, -1.4


def skeleton_v3(rig, head=(1, 0, 38), arm_y=None, lift=V3_LIFT):
    """`rigs_medieval.skeleton` with longer legs and foot joints (no parts)."""
    from . import rigs_medieval as B
    arm_y = arm_y or B.ARM_Y
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, B.HIP_Z))
    rig.joint("torso", "hips", (0, 0, B.HIP_Z + 1))
    rig.rest_offset["torso"] = (0, 0, lift)
    rig.joint("head", "torso", head)
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        rig.joint(f"thigh_{s}", "hips", (0, y, V3_THIGH_Z))
        rig.joint(f"shin_{s}", f"thigh_{s}", (0.5, y, V3_KNEE_Z))
        rig.joint(f"foot_{s}", f"shin_{s}", (1.0, y, V3_ANKLE_Z))
        y = arm_y[s]
        rig.joint(f"arm_{s}", "torso", (0, y, B.SHOULDER_Z))
        rig.joint(f"fore_{s}", f"arm_{s}", (0, y, B.ELBOW_Z))
        rig.joint(f"hand_{s}", f"fore_{s}", (0, y, B.HAND_Z))


def legs_v3(rig, hose, boot, cuff=None, thigh_r=4.7, far=0.8, boot_finish="matte", hose_far=None,
            skin_shin=None):
    """Stocky legs in hose with short chunky boots on the foot joints; the far leg is `far`
    darker (near and far feet read apart, ANIM_SPEC G1). Adds the `_foot` / `_foot_l` sole
    trackers the pipeline measures the walk with. `skin_shin` (a colour) draws bare shins
    instead of hose below the knee (sandals)."""
    from . import colors as C
    from . import rigs_medieval as B
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        k = 1.0 if s == "r" else far
        h = hose if s == "r" else (hose_far or C.scale(hose, k))
        bt = C.scale(boot, k)
        g = Geo().capsule((0, y, V3_THIGH_Z), (0.5, y, V3_KNEE_Z), thigh_r, thigh_r - 0.6)
        rig.part(f"thigh_{s}", g, h)
        g = Geo().capsule((0.5, y, V3_KNEE_Z), (1.0, y, V3_ANKLE_Z + 0.4), thigh_r - 0.6, 3.7)
        rig.part(f"shin_{s}", g, h if skin_shin is None else C.scale(skin_shin, k))
        g = Geo().blob((0.9, y, 6.0), (4.3, 4.3, 2.6), p=2.6)              # boot shaft
        rig.part(f"shin_{s}", g, bt, finish=boot_finish)
        g = Geo().blob((2.6, y, 2.5), (4.4, 4.5, 2.6), p=2.8, taper=(1.02, 0.86))   # 8.8 lu foot
        rig.part(f"foot_{s}", g, bt, finish=boot_finish)
        if cuff:
            g = Geo().blob((0.9, y, 8.5), (4.8, 4.7, 1.4), p=2.8)
            rig.part(f"shin_{s}", g, C.scale(cuff, k))
    rig.track("_foot", "foot_r", (2.6, -B.LEG_Y, 0.0))
    rig.track("_foot_l", "foot_l", (2.6, B.LEG_Y, 0.0))


def legs_ik():
    """The gait kit's legs for a `skeleton_v3` biped (toe and heel roll pivots)."""
    from . import gait as G
    from . import rigs_medieval as B
    out = {}
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        out[s] = G.Leg(f"thigh_{s}", f"shin_{s}", (1.0, y, V3_ANKLE_Z), foot=f"foot_{s}",
                       toe=(V3_TOE, y, 0.3), heel=(V3_HEEL, y, 0.3))
    return out


def jog_gait(legs, speed, cycle_ms=616, stance=0.38, lift=6.5, x_mid=1.6, **kw):
    """G1 bounce jog (or, with stance 0.4-0.5 and BRISK bob, a G2 brisk walk) at ground speed;
    the right foot touches down a little before frame 0, so frame 3 is in the flight."""
    from . import gait as G
    opts = dict(kick=3.0, reach=0.0, toe_off=24.0, early_lift=1.6, drag=0.3, lift_peak=0.38)
    opts.update(kw)
    g = G.Gait(8, cycle_ms, speed, G.biped_feet(legs["l"], legs["r"], x_mid=x_mid, shift=0.5), stance,
               lift=lift, **opts)
    for k, (leg, ph, x, gz) in list(g.feet.items()):
        g.feet[k] = (leg, ph - 0.03, x, gz)
    return g


class ArmChain:
    """An arm for `moves.walk_v3(arms=...)`: pose(a, f) = upper arm and forearm directions."""

    def __init__(self, side):
        self.side = side

    def pose(self, a, f):
        from . import rigs_medieval as B
        return B.arm(self.side, a, f)
