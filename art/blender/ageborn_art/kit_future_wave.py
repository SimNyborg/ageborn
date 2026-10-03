"""W7 Future wave helpers (CONTENT_PLAN 5.7): the shared trooper body, helmets and clip helpers.

Every Future wave biped is built on the walk-v3 Future body (`kit_future.skeleton_v3` / `legs_v3`, the
`rigs_future` torso armour and arms) so the new troopers share proportions, palette and the visor face kit
(`kit_future.visor_face`, mint robot-eye glyphs) with the Pulse Trooper and the Photon Knight; each unit then
adds its own helmet, gear and weapon. `kit_future.py` and `rigs_future.py` keep their APIs (the Cosmic rigs
and the Bronze Colossus import them).

  trooper()     skeleton, v3 legs, torso armour with a team chest plate and the pale hex, a helmet with a
                visor face (`dome`, `android`, `hardhat`, `hood` or `none`), arms and team shoulder pads
  helmet()      just the helmet and its visor face on joint `head`
  hit_pose()    light hit with the visor glyphs (> < then angry)
  hit_heavy()   armoured mech jolt (no squash) with the glyphs
  die_d1()      D1 fling and spin, X eyes, an optional prop flung along a path
  die_d2()      D2 plank topple onto the back (armoured bipeds), the visor up so the X eyes show
  melee_clip()  a SMALL_MELEE_MS attack clip from 10 poses with smear overlays and impact accents
"""
import math

from . import face as FC
from . import kit_future as KF
from . import kit_medieval as K
from . import moves as M
from . import rigs_future as F
from .anim import merge
from .geometry import Geo

MINT, MINT_CORE, MAGENTA, MAGENTA_CORE = F.MINT, F.MINT_CORE, F.MAGENTA, F.MAGENTA_CORE
DUST = "#DDE3E8"
HOLO = "#9FF5D8"
HOLO_DK = "#5FCFB0"
FROST = "#E6FFF7"


def helmet(rig, kind="dome", crest=True, eye_center=None, antenna=False):
    """The helmet on joint `head` with a visor face (mint glyph eyes). Returns the visor Face."""
    face = None
    if kind == "dome":
        # the Pulse Trooper helmet: a white dome and faceplate, a team cap with a crest, a dark visor
        g = Geo().blob((2, 0, 52), (11.4, 11.0, 11.6), p=2.5)
        g.blob((0, 0, 43.2), (7.5, 7.5, 3.2), p=2.4)
        rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        g = Geo().blob((2, 0, 52.1), (11.75, 11.35, 11.95), p=2.5, cuts=8)
        g.clip((0, 0, 48.6), (0, 0, -1))
        g.clip((8.4, 0, 51.0), (1, 0, -0.3))
        if crest:
            g.blob((-0.5, 0, 63.6), (10.4, 2.8, 2.6), p=2.8, rot=(0, -8, 0))
        rig.part("head", g, team=True)
        visor = Geo().blob((10.2, -0.6, 50.8), (4.8, 10.0, 5.4), p=3.2)
        face = KF.visor_face(rig, "head", [visor], eye_center or (11.0, 51.0), eye_dx=(0.0, 3.5), eye_rx=1.7, eye_rz=2.5)
        rig.part("head", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
        g = Geo().blob((-3.5, -10.4, 51.0), (4.4, 2.0, 4.4), p=2.4)       # ear pod
        rig.part("head", g, F.SUIT)
        g = Geo().blob((-3.5, -12.2, 51.0), (1.8, 0.8, 1.8), p=2.2)
        rig.part("head", g, glow=MINT, outline=0)
    elif kind == "android":
        # a smooth white egg head with a wide wrap-around visor band and a team stripe over the crown
        g = Geo().blob((2.0, 0, 50.5), (11.0, 10.4, 12.4), p=2.3)
        g.blob((3.0, 0, 41.5), (6.0, 6.4, 3.4), p=2.4)                    # neck collar
        rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        g = Geo().blob((1.5, 0, 50.6), (11.3, 3.6, 12.7), p=2.3)
        g.clip((0, 0, 50.0), (0, 0, -1))
        rig.part("head", g, team=True)
        visor = Geo().blob((2.0, 0, 50.5), (11.6, 10.9, 12.9), p=2.3)
        visor.clip((5.0, 0, 0), (-1, 0, 0)).clip((0, 0, 54.0), (0, 0, 1)).clip((0, 0, 46.2), (0, 0, -1))
        face = KF.visor_face(rig, "head", [visor], eye_center or (11.6, 50.2), eye_dx=(0.0, 3.6), eye_rx=1.8, eye_rz=2.3)
        rig.part("head", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
        g = Geo().lathe([(0, 0), (3.0, 0.1), (2.8, 1.4), (0, 1.8)], (-1.0, -10.2, 50.0), (-1.0, -12.0, 50.0), segs=16)
        rig.part("head", g, F.TRIM, finish="metal", outline=0.6)            # ear disc
        g = Geo().sphere((-1.0, -12.2, 50.0), 1.2, cuts=2)
        rig.part("head", g, glow=MINT, outline=0)
    elif kind == "hardhat":
        # an engineer's team hard hat with a brim over a dark half-visor faceplate
        g = Geo().blob((2, 0, 49.5), (10.6, 10.2, 10.6), p=2.4)
        g.blob((1, 0, 42.6), (7.2, 7.2, 3.0), p=2.4)
        rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
        g = Geo().blob((1.0, 0, 55.4), (11.6, 11.2, 7.6), p=2.4)
        g.clip((0, 0, 54.0), (0, 0, -1))
        g.blob((3.0, 0, 54.4), (15.2, 13.4, 1.3), p=3.0)                  # brim
        if crest:
            g.blob((1.0, 0, 62.0), (8.4, 2.2, 1.8), p=2.6)
        rig.part("head", g, team=True)
        visor = Geo().blob((9.6, -0.6, 49.0), (4.4, 9.4, 4.4), p=3.2)
        face = KF.visor_face(rig, "head", [visor], eye_center or (10.4, 49.2), eye_dx=(0.0, 3.4), eye_rx=1.6, eye_rz=2.2)
        rig.part("head", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
        g = Geo().blob((-3.0, -10.0, 49.0), (3.8, 1.8, 3.8), p=2.4)
        rig.part("head", g, F.SUIT)
    elif kind == "hood":
        # a soft charcoal cowl over a round dark visor (pilots, projector operators)
        g = Geo().blob((1.5, 0, 50.0), (11.2, 10.8, 11.4), p=2.2)
        rig.part("head", g, F.SUIT_LT)
        g = Geo().blob((1.0, 0, 50.2), (11.5, 11.1, 11.7), p=2.2)
        g.clip((-2.0, 0, 0), (1, 0, 0)).clip((0, 0, 53.0), (0, 0, -1))
        rig.part("head", g, team=True)
        visor = Geo().blob((9.4, -0.4, 50.0), (4.4, 9.0, 5.6), p=3.0)
        face = KF.visor_face(rig, "head", [visor], eye_center or (10.4, 50.2), eye_dx=(0.0, 3.4), eye_rx=1.7, eye_rz=2.4)
        rig.part("head", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    if antenna:
        rig.secondary("antenna", "head", (-6.5, 6.6, 56.0), (-11.0, 8.0, 68.0), max_deg=18, gain=1.4)
        g = Geo().capsule((-6.5, 6.6, 56.0), (-10.8, 8.0, 67.0), 0.9)
        rig.part("antenna", g, F.SUIT, outline=1.0)
        g = Geo().sphere((-11.0, 8.1, 68.0), 2.0, cuts=3)
        rig.part("antenna", g, glow=MAGENTA, outline=1.0, outline_hex=MAGENTA)
    return face


def trooper(rig, *, helmet_kind="dome", crest=True, team_greave=False, team_thigh=False, pack=True, bulk=1.0,
            shoulders=True, far_shoulder=True, hexmark=True, antenna=False, eye_center=None, head=(1, 0, 39),
            strip=True, hips=True, team_sleeve=False):
    """The W7 Future trooper: walk-v3 skeleton and legs, torso armour with a team chest plate, the hex, a
    helmet with a visor face, arms with white gauntlets and team shoulder pads."""
    KF.skeleton_v3(rig, head=head)
    KF.legs_v3(rig, team_greave=team_greave, team_thigh=team_thigh)
    F.arm_parts(rig, "l", team_sleeve=team_sleeve)
    F.torso_armor(rig, pack=pack, bulk=bulk)
    if pack:
        g = Geo().blob((-11.4 * bulk, 0, 36.6), (4.8, 8.8, 2.2), p=3.4)      # team band on the pack
        rig.part("torso", g, team=True, outline=0.6)
    g = Geo().blob((1.0, 0, 39.0), (7.6, 7.8, 1.8), p=2.6)                 # white gorget
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    if hips:
        g = Geo().blob((0.6, 0, 16.6), (10.4, 10.2, 4.0), p=2.8, taper=(1.1, 1.0))
        g.clip((0, 0, 13.0), (0, 0, -1))
        rig.part("hips", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    if hexmark:
        chest = Geo().blob((1.8, 0, 32.0), (9.8 * bulk, 10.6 * bulk, 7.6), p=3.0, taper=(0.9, 1.0))
        cf = FC.Face(rig, "torso", [chest])
        g = KF.hexmark(cf, Geo(), K.scr(cf, (6.0 * bulk, -9.0 * bulk, 32.0)), s=0.9, w=1.3)
        rig.part("torso", g, KF.HEX_PALE, highlight=False, outline=0)
    face = helmet(rig, helmet_kind, crest=crest, eye_center=eye_center, antenna=antenna)
    F.arm_parts(rig, "r", team_sleeve=team_sleeve)
    if shoulders:
        F.shoulders(rig, far=far_shoulder)
        if strip:
            KF.strip(rig, "arm_r", [(-4.0, -18.0, 38.0), (0.6, -18.4, 39.4), (5.2, -17.8, 38.0)], r=0.8)
    return face


# -- hits and deaths -----------------------------------------------------------------------------
def hit_pose(k, base, extra_fn=None):
    """`moves.hit_light`: the head snaps back, the antenna whips, eyes > < then angry."""
    def recoil(a):
        p = {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
             "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)}}
        if extra_fn is not None:
            p = merge(p, extra_fn(a))
        return p
    return M.hit_light(k, base, recoil, face_hurt=KF.glyph("g_hurt"),
                       face_back=KF.glyph("g_angry") if k == 2 else None)


def hit_heavy(k, base, center=(0, 0, 30), scale=1.0):
    """A mech hit: a hard jolt with no body squash; eyes > < on the contact steps."""
    pose = merge(base, KF.hit_mech(k, center, scale))
    return merge(pose, KF.glyph("g_hurt" if k in (0, 1) else ("g_angry" if k == 2 else "eyes")))


def die_d1(k, stance, height, prop=None, prop_path=None, center_z=28.0, lie_z=11.0):
    """D1 fling and spin, X eyes; `prop` (a joint with a `<prop>_loose` copy) flies along `prop_path`."""
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(stance, M.die_d1(k, center_z=center_z, lie_z=lie_z, height=height), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    if prop is not None and prop_path is not None and prop_path[k] is not None:
        x, z, r = prop_path[k]
        pose[prop] = {"hide": True}
        pose[f"{prop}_loose"] = {"show": True, "x": x, "z": z, "r": r}
    g = "g_hurt" if k == 0 else ("g_wide" if k < 4 else "eyes_x")
    return merge(pose, KF.glyph(g))


PROP_PATH = [None, (6, 20, 70), (10, 38, 190), (14, 42, 320), (18, 32, 440), (22, 14, 540),
             (24, 0, 600), (25, -6, 624), (25, -6, 624), (25, -6, 624)]


def die_d2(k, stance, extra=None, toe_x=7.0, heel_x=-6.0, lie_lift=8.0):
    """D2 plank topple onto the back (the visor faces up so the X eyes show), arms toward the feet."""
    flail = [0.4, 0.3, 0.9, 1.0, 0.3, 0.6, 0.1, 0.0, 0.0, 0.0][k]
    stiff = min(1.0, k / 3.0)
    pose = merge(stance, K.die_d2(k, toe_x=toe_x, heel_x=heel_x, lie_lift=lie_lift, back=True), {
        "torso": {"r": -4 * stiff}, "head": {"r": 10 * flail - 4},
        "arm_r": {"r": 38 * stiff - 30 * flail}, "fore_r": {"r": 20 * flail - 10 * stiff},
        "arm_l": {"r": 30 * flail + 12 * stiff}, "fore_l": {"r": 30 * flail - 20 * stiff},
        "thigh_r": {"r": 6 * flail + 24 * stiff}, "shin_r": {"r": -4 * flail - 20 * stiff},
        "thigh_l": {"r": -6 * flail - 8 * stiff}, "shin_l": {"r": -4 * flail},
    })
    if extra is not None:
        pose = merge(pose, extra(k, flail, stiff))
    g = "g_hurt" if k == 0 else ("g_wide" if k < 4 else "eyes_x")
    return merge(pose, KF.glyph(g))


# -- attack clip helper ---------------------------------------------------------------------------
def impact_fx(joint, point, seed, a0=-70.0, ground_x=18.0, color=MINT_CORE, dust=True):
    out = [{"kind": "burst", "joint": joint, "point": point, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6, "a0": a0,
            "arc": 150.0, "color": color}]
    if dust:
        out.append({"kind": "dust", "ground": (ground_x, 0.0), "size_lu": 4.5, "puffs": 3, "seed": seed,
                    "spread": 0.9, "color": DUST})
    return out


def melee_clip(name, fn, smear, fx, reuse=None, hold_step=3):
    """A SMALL_MELEE_MS attack (impact on step 6 at 290 of 680 ms) from 10 unique poses played 0-9 then 0.
    `smear` is a smear2 spec (arc or streak) drawn on frames 4-6; `fx` the impact-frame accents."""
    ov = {4: [dict(smear, **{"from": 3})], 5: [dict(smear, **{"from": 4})], 6: [dict(smear, **{"from": 5})] + fx}
    return M.clip(name, [fn(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT, smear=4,
                  overlays=ov, sequence=list(range(10)) + [0], reuse=reuse, extra={"holdStep": hold_step})


def ring_pts(cx, cz, rx, rz, y, n, a0=0.0, a1=360.0):
    out = []
    for i in range(n):
        a = math.radians(a0 + (a1 - a0) * i / max(1, n - 1 if a1 - a0 < 360 else n))
        out.append((cx + rx * math.cos(a), y, cz + rz * math.sin(a)))
    return out
