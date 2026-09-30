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
