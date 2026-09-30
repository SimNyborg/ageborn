"""Starwarden: Cosmic Age support Rare (docs/design-lane-ages.md A17.11). Ion bolt (proj.ion, range
150) and the Shield Beacon (every 8 s, the nearest 4 allies get a 200 shield; the game draws
fx.beacon_ring); follows the front. ~70 lu with the staff.

Look (A17.12, Cosmic palette): a robed star-priest. A long team robe that flares to the ankles
with a star-white hem band, a violet front panel with star specks and a pale Cosmic star on the
chest, a violet mantle over the shoulders with a star-white clasp, and a deep violet hood whose
shadowed opening shows a dark faceplate with two mint robot eyes that act (eyes closed and
happy while humming, wide on the charge, > < when hit, spirals when he sits down dizzy). A small
star-white lantern with a mint light swings at the belt. The near hand holds a tall star-white
staff topped by an open crescent fork; a mint beacon orb floats in the fork inside a star-white
halo ring (it bobs and turns on its own).

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    hums with the eyes closed, the head bobbing, the halo turning, the lantern swinging
  walk    waddle: short steps, a side sway, the robe hem and the lantern swinging
  attack  STAFF SLAM BEACON: lifts the staff, rises on his toes and holds it high overhead while
          the beacon swells and the halo spins (the held extreme), slams the butt into the ground
          (dust and a ground ring), the beacon surges and the bolt leaves it with a star flash
          (`muzzle`), the beacon recoils, the halo spins down
  hit     light: the head snaps back, the beacon jolts, eyes > <
  die     D3 dizzy sit: spins, sits down hard with the legs out, spiral eyes, the staff in his lap
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_future as KF
from ageborn_art import kit_medieval as KM
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "starwarden"
NAME = "Starwarden"
HEIGHT_LU = 70
CANVAS = (300, 300)
FEET = (124, 262)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 30), "muzzle": (40, 48)}
NO_RETIME = True

HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
STAFF_UP = 34.0                    # staff top above the fist
STAFF_DN = 18.0                    # staff foot below the fist
BEACON = (HR[0], HR[1] - 1.0, HR[2] + STAFF_UP + 8.0)
FOOT = (HR[0], HR[1], HR[2] - STAFF_DN)


def build(rig):
    K.skeleton(rig, head=(1, 0, 39))
    # legs: only the boots show under the robe
    for s in ("r", "l"):
        y = K.LEG_Y * K.SIDE_Y[s]
        g = Geo().capsule((0.5, y, K.KNEE_Z), (1.0, y, 4.6), 3.2, 3.4)
        rig.part(f"shin_{s}", g, K.VOID)
        g = Geo().blob((2.8, y, 2.8), (6.4, 4.4, 3.0), p=3.0, taper=(1.05, 0.85))
        rig.part(f"shin_{s}", g, K.VIOLET_DK, finish="gloss")
        g = Geo().blob((6.6, y, 2.2), (2.4, 4.0, 2.0), p=2.6)
        rig.part(f"shin_{s}", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    rig.joint("staff", "hand_r", HR)
    K.arm_parts(rig, "l", sleeve=K.VIOLET, bracer=None, glove=K.STAR)

    # robe: a flared team skirt on the hips with a hem that swings, a violet front panel
    rig.secondary("hem", "hips", (0, 0, 14.0), (2.0, 0, 1.0), max_deg=12, gain=1.0)
    g = Geo().blob((0.5, 0, 9.0), (12.4, 11.2, 9.6), p=2.6, taper=(1.25, 0.9))
    g.clip((0, 0, 1.6), (0, 0, -1))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.5, 0, 3.0), (15.6, 14.0, 1.6), p=2.8)
    rig.part("hem", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((0, 0, 20.0), (11.0, 10.6, 7.4), p=2.6, taper=(1.12, 0.95))
    rig.part("hips", g, team=True)
    g = Geo().blob((10.6, -1.0, 12.0), (1.8, 4.2, 10.4), p=3.0, taper=(1.3, 0.8))
    rig.part("hem", g, K.VIOLET, finish="matte", outline=0.8)
    KC.specks(rig, "hem", [(12.6, 14.0, 0.9), (12.9, 9.0, 1.1), (13.4, 5.0, 0.8)], -3.4)
    # the lantern at the belt (a pendulum)
    rig.secondary("lantern", "hips", (6.0, -11.0, 18.0), (6.0, -11.0, 8.0), max_deg=22, gain=1.4)
    g = Geo().capsule((6.0, -11.0, 18.0), (6.0, -11.0, 13.6), 0.6)
    rig.part("lantern", g, K.STAR_TRIM, finish="metal", outline=0.5)
    g = Geo().blob((6.0, -11.0, 10.8), (2.6, 2.6, 3.4), p=2.4)
    rig.part("lantern", g, glow=K.MINT, outline=0.8, outline_hex="#1C8A6A")
    g = Geo().blob((6.0, -11.0, 13.8), (2.8, 2.8, 0.9), p=2.6).blob((6.0, -11.0, 7.6), (2.6, 2.6, 0.8), p=2.6)
    rig.part("lantern", g, K.STAR, finish="gloss", outline=0.6, outline_hex=K.STAR_TRIM)

    # torso: team robe top with the pale star, star-white sash, violet mantle with a clasp
    g = Geo().blob((0, 0, 28), (9.8, 9.6, 11.2), p=2.4, taper=(0.95, 1.05))
    cf = FC.Face(rig, "torso", [g])
    star = KC.starmark(cf, Geo(), KM.scr(cf, (6.0, -8.0, 28.4)), s=0.95)
    rig.part("torso", star, KC.STAR_PALE, highlight=False, outline=0)
    rig.part("torso", g, team=True)
    g = Geo().blob((0.4, 0, 22.2), (10.4, 10.2, 2.2), p=3.4)
    rig.part("torso", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((10.5, -2.0, 22.2), (1.4, 2.2, 1.6), p=2.4)
    rig.part("torso", g, glow=K.MINT, outline=1.0, outline_hex=K.VOID)
    g = Geo().blob((-1.0, 0, 36.0), (11.4, 12.6, 5.6), p=2.4, taper=(1.2, 0.8))
    rig.part("torso", g, K.VIOLET, finish="matte")
    g = Geo().blob((9.6, -1.5, 35.0), (2.2, 2.8, 2.8), p=2.4)
    rig.part("torso", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # the back of the mantle hangs as a short cape
    rig.secondary("cape", "torso", (-8.0, 0, 38.0), (-13.0, 0, 18.0), max_deg=14, gain=1.0)
    g = Geo().blob((-10.6, 0.5, 29.0), (2.8, 11.4, 10.4), p=3.0, taper=(1.2, 0.9))
    rig.part("cape", g, K.VIOLET_DK)

    # hood: deep violet with a team rim; a shadowed opening with a dark faceplate and mint eyes
    # the opening is cut back on the near side so the face shows at the camera yaw
    cut_p, cut_n = (6.4, 0, 49.0), (1.0, -0.55, 0.25)
    g = Geo().blob((0.5, 0, 50.0), (12.4, 11.6, 12.6), p=2.4, shift=(-0.15, 0))
    g.clip(cut_p, cut_n)
    rig.part("head", g, K.VIOLET, finish="matte", outline_hex=K.VIOLET_DK)
    L = math.sqrt(sum(v * v for v in cut_n))
    nn = tuple(v / L for v in cut_n)
    g = Geo().blob((0.5, 0, 50.0), (13.0, 12.2, 13.2), p=2.4, shift=(-0.15, 0))
    g.clip(cut_p, cut_n, fill=False)
    g.clip(tuple(p - 2.2 * n for p, n in zip(cut_p, nn)), tuple(-n for n in nn), fill=False)
    rig.part("head", g, team=True, outline=0.6)                                # team hood rim
    rig.secondary("hood_tip", "head", (-4.0, 0, 57.0), (-10.0, 0, 64.0), max_deg=14, gain=1.1)
    g = Geo().blob((-6.0, 0, 58.0), (6.0, 6.0, 7.0), p=2.2, rot=(0, 30, 0))
    rig.part("hood_tip", g, K.VIOLET, finish="matte", outline_hex=K.VIOLET_DK)
    plate = Geo().blob((3.0, 0, 49.0), (9.6, 9.0, 9.6), p=2.4)
    KF.visor_face(rig, "head", [plate], (8.4, 50.4), eye_dx=(0.0, 3.4), eye_rx=2.1, eye_rz=2.7,
                  color=K.MINT, core=K.MINT_CORE)
    rig.part("head", plate, K.VISOR, finish="gloss", outline_hex=K.VOID)

    K.arm_parts(rig, "r", sleeve=K.VIOLET, bracer=None, glove=K.STAR)
    for s in ("r", "l"):                                                       # wide team cuffs
        y = K.ARM_Y[s]
        g = Geo().blob((0.2, y, K.HAND_Z + 3.6), (5.2, 5.0, 3.4), p=2.4, taper=(1.2, 0.9))
        rig.part(f"fore_{s}", g, team=True, outline=0.6)

    # staff with a crescent fork, a butt cap and the floating beacon in its halo
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy, hz - STAFF_DN), (hx, hy, hz + STAFF_UP), 1.5)
    rig.part("staff", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    for z in (hz + 8, hz + STAFF_UP - 2):
        g.lathe([(0, -1.2), (2.4, -1.0), (2.4, 1.0), (0, 1.2)], (hx, hy, z), (hx, hy, z + 1), segs=12)
    g.blob((hx, hy, hz - STAFF_DN + 0.6), (2.4, 2.4, 2.0), p=2.6)
    rig.part("staff", g, K.VIOLET, finish="gloss")
    g = Geo()
    top = hz + STAFF_UP
    for s in (1, -1):
        pts = [(hx, top)]
        for k in range(1, 7):
            a = math.radians(-90 + 30 * k)
            pts.append((hx + s * 8.0 * math.cos(a) * (1.0 if k < 6 else 0.7), top + 8.0 + 8.0 * math.sin(a)))
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule((p0[0], hy, p0[1]), (p1[0], hy, p1[1]), 1.4, 1.0)
    rig.part("staff", g, K.STAR_TRIM, finish="metal", outline=0.8)
    rig.joint("beacon", "staff", BEACON)
    K.orb(rig, "beacon", BEACON, 4.8, color=K.MINT, core=K.MINT_CORE, line="#1C8A6A")
    bx, by, bz = BEACON
    rig.joint("halo", "beacon", BEACON)
    g = Geo()
    for i in range(20):
        a0, a1 = 2 * math.pi * i / 20, 2 * math.pi * (i + 1) / 20
        g.capsule((bx + 6.8 * math.cos(a0), by - 1.0 + 2.0 * math.sin(a0), bz + 6.8 * math.sin(a0) * 0.45),
                  (bx + 6.8 * math.cos(a1), by - 1.0 + 2.0 * math.sin(a1), bz + 6.8 * math.sin(a1) * 0.45),
                  0.9, segs=6, rings=2)
    for a in (0, 120, 240):
        g.sphere((bx + 6.8 * math.cos(math.radians(a)), by - 1.0 + 2.0 * math.sin(math.radians(a)),
                  bz + 6.8 * math.sin(math.radians(a)) * 0.45), 1.5, cuts=2)
    rig.part("halo", g, glow=K.MINT, outline=0.6, outline_hex="#1C8A6A")
    rig.joint("surge", "beacon", BEACON, hidden=True)
    g = Geo().sphere((bx, by - 1.0, bz), 5.4, cuts=4)
    rig.part("surge", g, glow=K.MINT_CORE, outline=1.2, outline_hex=K.MINT)
    rig.track("muzzle", "beacon", (bx + 5.0, by, bz))
    rig.track("_foot", "shin_r", (2.8, -6.0, 0.5))
    K.star_burst(rig, "beacon", (bx + 4.0, by, bz), size=1.2, name="flash")


# -- poses -----------------------------------------------------------------------------------
def staff_arm(a, f, w=90.0):
    return K.arm("r", a, f, w, 90.0)


def staff_at(hand, w):
    a, f = K.ik2(K.SH, hand)
    return staff_arm(a, f, w)


STANCE = merge(staff_arm(-40, 5, 80), K.arm("l", -80, -40), {"torso": {"r": -1}})


def _idle(f):
    def extra(ctx):
        return {"arm_r": {"r": 1.5 * ctx["lag"]}, "hand_r": {"r": -1.5 * ctx["lag"]},
                "beacon": {"z": 1.6 * ctx["c"]}, "halo": {"rz": 60 * f, "r": 6 * ctx["lag"]},
                "head": {"r": 3.0 * math.sin(4 * math.pi * f / 6)}}
    pose = M.idle_v2(f, STANCE, frames=6, bob=1.0, chest=0.035, extra=extra)
    # humming: eyes closed and happy on the beat
    pose = merge(pose, KF.glyph(["g_happy", "g_happy", "g_blink", "g_happy", "g_happy", "eyes"][f]))
    return pose


def _walk(f):
    def extra(ctx):
        return {"arm_r": {"r": -4 * math.cos(ctx["lag_p"])}, "hand_r": {"r": 3 * math.cos(ctx["lag_p"])},
                "arm_l": {"r": 8 * math.cos(ctx["lag_p"])},
                "beacon": {"z": -1.0 * ctx["bob_lag"] / max(ctx["amp"], 1e-3)}, "halo": {"rz": 45 * f}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=26.0, knee=40.0, lift_lu=5.5, bob_pct=0.05, lean=-3.0,
                     arms=(), twist=4.0, sway=5.0, extra=extra)


# -- attack: staff slam beacon (832 ms, impact at 416 ms = 0.5, as shipped) ------------------------
ATTACK_MS = [50, 70, 150, 50, 96, 100, 90, 80, 70, 76]
ATTACK_IMPACT = 5
#          lift   raise   HOLD    slam   planted  FIRE    recoil  spin   settle settle
HAND = [(8.0, 30.0), (4.0, 44.0), (3.0, 48.5), (10.5, 33.0), (13.0, 27.5), (11.5, 27.5), (10.0, 28.5),
        (4.0, 27.0), None, None]
WW = [84.0, 98.0, 100.0, 80.0, 64.0, 60.0, 72.0, 80.0, None, None]      # staff direction, WORLD degrees
SLIDE = [0.0, 0.0, 0.0, -2.0, -3.0, -1.0, 0.0, 0.0, 0.0, 0.0]   # the staff slides down through the fist
TR = [2, 4, 6, -6, -12, -12, -4, -2, -1, -1]
BX = [-0.5, -1.0, -1.5, 1.5, 3.0, 3.0, 1.0, 0.5, 0.0, 0.0]
BZ = [0.0, 2.0, 3.0, 0.0, -2.2, -1.8, 0.0, 0.0, 0.0, 0.0]
BQ = [-0.04, 0.06, 0.08, -0.02, -0.12, -0.08, 0.03, 0.0, 0.0, 0.0]
HD = [2, 6, 8, -2, -6, -6, 2, 1, 0, 0]
BEACON_S = [1.0, 1.1, 1.3, 1.25, 1.45, 0.85, 0.9, 1.0, 1.0, 1.0]
HALO = [(20, 1.0), (60, 1.1), (140, 1.25), (200, 1.2), (250, 1.35), (300, 1.3), (330, 1.1), (350, 1.0),
        (360, 1.0), (360, 1.0)]
LA = [-70, -40, 20, -30, -60, -55, -70, -78, -80, -80]
LF = [-20, 10, 60, -10, -25, -20, -30, -38, -40, -40]
EYES = ["eyes", "g_wide", "g_wide", "g_angry", "g_angry", "g_squint", "g_hurt", "eyes", "g_happy", "eyes"]


def _attack_pose(f):
    if HAND[f] is not None:
        arm = staff_at(HAND[f], WW[f] - TR[f])
    else:
        arm = STANCE
    rz, hs = HALO[f]
    pose = merge(arm, K.arm("l", LA[f], LF[f]), {
        "torso": {"r": TR[f]}, "head": {"r": HD[f]},
        "beacon": {"s": BEACON_S[f], "x": -2.5 if f == 6 else 0.0},
        "halo": {"rz": rz, "s": hs},
        "surge": {"show": f == 4},
        "staff": {"z": SLIDE[f]},
        "flash": {"show": f == 5},
    }, M.body_about((0, 0, 24), x=BX[f], z=BZ[f], q=BQ[f]))
    if HAND[f] is None:
        pose = merge(pose, {"torso": {"r": 0}})
    return merge(pose, KF.glyph(EYES[f]))


def _attack_clip():
    ov = {
        2: [{"kind": "rings", "joint": "beacon", "point": BEACON, "radii_lu": (8.0, 11.5), "a0": -180.0,
             "a1": 180.0, "color": K.MINT_CORE}],
        3: [{"kind": "arc", "joint": "staff", "inner": (HR[0], HR[1], HR[2] + STAFF_UP - 6.0), "outer": BEACON,
             "color": K.MINT, "white": 0.35, "taper": 0.3, "lines": 2, "t0": 0.0, "t1": 1.0}],
        4: [{"kind": "dust", "joint": "staff", "point": FOOT, "ground_snap": True, "size_lu": 5.5, "puffs": 4,
             "seed": 3, "spread": 1.1, "color": "#DCD6E8"},
            {"kind": "burst", "joint": "staff", "point": FOOT, "r0_lu": 4.0, "r1_lu": 9.0, "n": 5, "a0": 20.0,
             "arc": 140.0, "color": K.MINT_CORE}],
        5: [{"kind": "burst", "joint": "beacon", "point": (BEACON[0] + 4.0, BEACON[1], BEACON[2]), "r0_lu": 8.0,
             "r1_lu": 14.0, "n": 6, "a0": -70.0, "arc": 140.0, "color": K.MINT_CORE}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return {"arm_r": {"r": 12 * a}, "hand_r": {"r": 8 * a}, "arm_l": {"r": 20 * a},
                "beacon": {"z": 3 * a}, "head": {"r": 14 * a}, "torso": {"r": 10 * a},
                "shin_r": {"r": -16 * up}}
    return M.hit_light(k, STANCE, recoil, face_hurt=KF.glyph("g_hurt"),
                       face_back=KF.glyph("g_angry") if k == 2 else None)


def _die(k):
    # D3 dizzy sit: spins in place, sits down hard, legs out, the staff in his lap
    t = [0, 0, 0.1, 0.3, 1.0, 0.95, 1.0, 1.0, 1.0, 1.0][k]
    pose = merge(STANCE, M.die_d3(k, center_z=26.0, height=HEIGHT_LU), KM.d3_sit(k, amount=t), {
        "hem": {"sz": 1.0 - 0.6 * t, "sx": 1.0 + 0.15 * t, "r": -20 * t},
        "arm_r": {"r": 10 * t}, "fore_r": {"r": 30 * t}, "hand_r": {"r": -70 * t},
        "beacon": {"s": [1.0, 1.1, 1.0, 0.9, 0.7, 0.6, 0.55, 0.5, 0.5, 0.5][k], "z": -3.0 * t},
        "halo": {"rz": 90 * k, "r": 25 * t},
    })
    g = ["g_hurt", "g_wide", "g_spiral", "g_spiral", "g_spiral", "g_spiral", "g_spiral", "g_spiral",
         "g_spiral", "g_spiral"][k]
    return merge(pose, KF.glyph(g))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl, attack_ms=832, attack_impact_at=0.5)
