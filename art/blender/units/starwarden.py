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
  walk    walk v3 brisk waddle at ground speed (ANIM_SPEC G2, 81.25 lu/s): the shortened robe hem
          kicks with the knees so the boots show, a side sway, the staff carried upright and bobbing
          a frame late, the free arm pumping, the lantern swinging
  attack  STAFF SLAM BEACON: lifts the staff, rises on his toes and holds it high overhead while
          the beacon swells and the halo spins (the held extreme), slams the butt into the ground
          (dust and a ground ring), the beacon surges and the bolt leaves it with a star flash
          (`muzzle`), the beacon recoils, the halo spins down
  attack_b  STAFF POINT CAST: cocks the staff back level behind his shoulder, leaning back on the rear
          leg while the beacon swells behind him (the held extreme), then whips it over and thrusts it
          forward and up at the target in a lunge; the bolt leaves the beacon with a star flash
  hit     light: the head snaps back, the beacon jolts, eyes > <
  die     D3 dizzy sit: spins, sits down hard with the legs out, spiral eyes, the staff in his lap

W4 (the detail standard): the robe's team-dark pleats, the mantle's and the cape's folds, the hood's folds, the
staff's seams, the legs' creases and seams; soldier damage spots; the bolt aimed up about 45 and 70 degrees on both
casts (item 44: he hits air; `aimdata` measures the staff from the fist to the beacon).
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as FC
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_future as KF
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as KM
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import futcos_w4 as FW

SLUG = "starwarden"
GAIT_NAME = "biped"
NAME = "Starwarden"
HEIGHT_LU = 70
CANVAS = (300, 300)
FEET = (124, 262)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 30), "muzzle": (40, 48)}
NO_RETIME = True

# W4 detail standard (look.py)
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.5
LOOK_SHADE = dict(FW.SHADE_SOLDIER, gradient=2.7, cavity=0.78)     # (r34: r28 sat at micro 4.20 / 3.92)
LOOK_RIM = dict(FW.RIM_SOLDIER, lift=0.42)
SURGE_1, SURGE_2 = "#A4F2D6", "#C2F8E4"     # (r34) the surge's outer and middle heat (under MINT_CORE)
FACE_LINE = "#3A2E58"                        # (r34) the faceplate's seams, a step over the visor black
MATERIAL_KINDS = FW.kinds_cosmic()

HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
STAFF_UP = 34.0                    # staff top above the fist
STAFF_DN = 18.0                    # staff foot below the fist
BEACON = (HR[0], HR[1] - 1.0, HR[2] + STAFF_UP + 8.0)
FOOT = (HR[0], HR[1], HR[2] - STAFF_DN)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KC.skeleton_v3(rig, head=(1, 0, 39))
    # legs (walk v3): void undersuit, violet boots with star toe caps under the shortened robe
    KC.legs_v3(rig, boot=K.VIOLET_DK, knee=None, thigh_r=4.4, team_shin=True)
    rig.joint("staff", "hand_r", HR)
    K.arm_parts(rig, "l", sleeve=K.VIOLET, bracer=None, glove=K.STAR)

    # robe: a flared team skirt on the hips with a hem that swings, a violet front panel
    # (shortened for walk v3: the hem 10 lu above the soles, ANIM_SPEC G2; it kicks with the knees)
    rig.secondary("hem", "hips", (0, 0, 16.0), (2.0, 0, 9.0), max_deg=16, gain=1.1)
    g = Geo().blob((0.5, 0, 14.6), (12.4, 11.2, 6.2), p=2.6, taper=(1.25, 0.9))
    g.clip((0, 0, 10.2), (0, 0, -1))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.5, 0, 11.0), (14.6, 13.2, 1.5), p=2.8)
    rig.part("hem", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((0, 0, 20.0), (11.0, 10.6, 7.4), p=2.6, taper=(1.12, 0.95))
    rig.part("hips", g, team=True)
    g = Geo().blob((10.6, -1.0, 15.6), (1.8, 4.2, 5.8), p=3.0, taper=(1.3, 0.8))
    rig.part("hem", g, K.VIOLET, finish="matte", outline=0.8)
    KC.specks(rig, "hem", [(12.4, 18.0, 0.9), (12.8, 14.6, 1.1), (13.2, 11.8, 0.8)], -3.4)
    # the lantern at the belt (a pendulum; it ends 11 lu above the soles so it never bridges the feet)
    rig.secondary("lantern", "hips", (6.0, -11.0, 20.0), (6.0, -11.0, 11.0), max_deg=22, gain=1.4)
    g = Geo().capsule((6.0, -11.0, 20.0), (6.0, -11.0, 16.6), 0.6)
    rig.part("lantern", g, K.STAR_TRIM, finish="metal", outline=0.5)
    g = Geo().blob((6.0, -11.0, 14.0), (2.4, 2.4, 3.0), p=2.4)
    rig.part("lantern", g, glow=K.MINT, outline=0.8, outline_hex="#1C8A6A")
    g = Geo().blob((6.0, -11.0, 16.8), (2.6, 2.6, 0.9), p=2.6).blob((6.0, -11.0, 11.4), (2.4, 2.4, 0.8), p=2.6)
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
    # (r34: the surge in three steps of heat toward a white heart on the camera's side: one pale disc was the
    # flattest field of the attack frames)
    g = Geo().sphere((bx, by - 1.0, bz), 5.4, cuts=4)
    rig.part("surge", g, glow=SURGE_1, outline=1.2, outline_hex=K.MINT)
    g = Geo().blob((bx - 0.6, by - 6.0, bz + 0.6), (3.6, 1.2, 3.6), p=2.2)
    rig.part("surge", g, glow=SURGE_2, outline=0)
    g = Geo().blob((bx - 1.0, by - 7.4, bz + 1.0), (1.8, 0.7, 1.8), p=2.2)
    rig.part("surge", g, glow=K.MINT_CORE, outline=0)
    rig.track("muzzle", "beacon", (bx + 5.0, by, bz))
    K.star_burst(rig, "beacon", (bx + 4.0, by, bz), size=1.2, name="flash")
    FW.cosmic_helmet(rig, "hood")
    FW.cosmic_legs(rig, team_shin=True, boot_line=FW.LINE_ON_VIOLET)
    _detail(rig)
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _detail(rig):
    """W4: the robe's team-dark pleats (hem and hips), the robe top's fold, the mantle's and the cape's folds, seams
    round the staff (char space; decals cast)."""
    hem = FC.Face(rig, "hem", [Geo().blob((0.5, 0, 14.6), (12.4, 11.2, 6.2), p=2.6, taper=(1.25, 0.9))])
    FW.folds(rig, "hem", hem, [[FW.sc(hem, x, 18.4, -10.2), FW.sc(hem, x - 0.6, 14.0, -12.0), FW.sc(hem, x - 1.2, 10.8, -12.6)]
                               for x in (-6.0, 0.0, 5.6)], w=0.8, team=True)
    hips = FC.Face(rig, "hips", [Geo().blob((0, 0, 20.0), (11.0, 10.6, 7.4), p=2.6, taper=(1.12, 0.95))])
    FW.folds(rig, "hips", hips, [[FW.sc(hips, x, 25.0, -9.0), FW.sc(hips, x - 0.4, 19.0, -10.6)] for x in (-5.0, 2.0)],
             w=0.8, team=True)
    top = FC.Face(rig, "torso", [Geo().blob((0, 0, 28), (9.8, 9.6, 11.2), p=2.4, taper=(0.95, 1.05))])
    FW.folds(rig, "torso", top, [[FW.sc(top, -4.6, 31.0, -8.6), FW.sc(top, -5.4, 27.0, -9.2), FW.sc(top, -4.8, 23.6, -9.0)]],
             w=0.8, team=True)
    man = FC.Face(rig, "torso", [Geo().blob((-1.0, 0, 36.0), (11.4, 12.6, 5.6), p=2.4, taper=(1.2, 0.8))])
    FW.panel_lines(rig, "torso", man, [[FW.sc(man, x, 39.6, -10.4), FW.sc(man, x + 1.0, 33.0, -12.6)] for x in (-6.0, 1.0)],
                   fill=FW.LINE_ON_VIOLET, w=0.75)
    cape = FC.Face(rig, "cape", [Geo().blob((-10.6, 0.5, 29.0), (2.8, 11.4, 10.4), p=3.0, taper=(1.2, 0.9))])
    FW.panel_lines(rig, "cape", cape, [[FW.sc(cape, -11.4, 36.0, -9.6), FW.sc(cape, -12.0, 27.0, -10.6),
                                        FW.sc(cape, -12.6, 20.0, -10.6)]], fill=FW.LINE_ON_VIOLET, w=0.75)
    hx, hy, hz = HR
    g = Geo()
    for z in (hz - 6.0, hz + 18.0):
        g.lathe([(0, -0.35), (1.62, -0.3), (1.62, 0.3), (0, 0.35)], (hx, hy, z), (hx, hy, z + 1), segs=12)
    rig.part("staff", g, FW.LINE_ON_STAR, outline=0, highlight=False)
    # (r34) the dark faceplate in the hood: a brow seam over the eyes and a cheek seam under them, a step over the
    # visor's black (the face was one flat dark field in every frame)
    fp = FC.Face(rig, "head", [Geo().blob((3.0, 0, 49.0), (9.6, 9.0, 9.6), p=2.4)])

    def on_plate(x, z):
        t_ = 1.0 - abs((x - 3.0) / 9.6) ** 2.4 - abs((z - 49.0) / 9.6) ** 2.4
        return FW.sc(fp, x, z, -9.0 * max(t_, 0.0) ** (1 / 2.4))
    FW.panel_lines(rig, "head", fp, [[on_plate(x, z) for x, z in ((6.0, 54.4), (9.0, 55.0), (11.6, 54.0))],
                                     [on_plate(x, z) for x, z in ((6.4, 46.0), (9.0, 44.6), (11.4, 45.4))],
                                     [on_plate(x, z) for x, z in ((11.2, 53.0), (11.8, 49.6), (11.0, 46.6))]],
                   fill=FACE_LINE, w=0.8)
    # (r34b) more of the hood's folds: over its crown, down its back and across the trailing tip (the deep violet hood
    # was the largest flat field after the face)
    hf = FC.Face(rig, "head", [Geo().blob((0.5, 0, 50.0), (12.4, 11.6, 12.6), p=2.4, shift=(-0.15, 0))])

    def on_hood(x, z):
        t_ = 1.0 - abs((x - 0.5) / 12.4) ** 2.4 - abs((z - 50.0) / 12.6) ** 2.4
        return FW.sc(hf, x, z, -11.6 * max(t_, 0.0) ** (1 / 2.4))
    FW.folds(rig, "head", hf, [[on_hood(x, z) for x, z in ((2.0, 60.6), (-2.4, 59.4), (-6.0, 56.6))],
                               [on_hood(x, z) for x, z in ((-1.6, 56.0), (-3.6, 50.0), (-2.8, 43.6))],
                               [on_hood(x, z) for x, z in ((-8.6, 58.0), (-10.4, 51.6))]],
             w=0.8, team=False, fill=FW.LINE_ON_VIOLET)
    tf = FC.Face(rig, "hood_tip", [Geo().blob((-6.0, 0, 58.0), (6.0, 6.0, 7.0), p=2.2, rot=(0, 30, 0))])
    FW.folds(rig, "hood_tip", tf, [[FW.sc(tf, -3.0, 61.4, -5.2), FW.sc(tf, -7.6, 59.0, -5.4), FW.sc(tf, -10.4, 55.6, -4.8)]],
             w=0.8, team=False, fill=FW.LINE_ON_VIOLET)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, soldier: scorches and a torn robe): the hood, the mantle, the team
    robe (a strip on the hem), the near team greave."""
    rig.damage_spot_at("hood", "head", -6.0, 50.0, 5.0, "cloth", fill=K.VIOLET)
    rig.damage_spot_at("mantle", "torso", -6.0, 35.0, 5.0, "cloth", fill=K.VIOLET)
    rig.damage_spot("robe", "hem", (-2.0, -12.2, 13.6), 5.0, "cloth", kind="strip", team=True, normal=(0, -1, 0))
    rig.damage_spot("greave", "shin_r", (1.9, -K.LEG_Y - 4.2, 8.8), 5.0, "metal", team=True, normal=(0, -1, 0))


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


# -- walk v3: G2 brisk waddle at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 70 ms ------------
SPEED = 81.25
LEGS = KC.legs_ik()
GAIT = KC.jog_gait(LEGS, SPEED, cycle_ms=560, stance=0.44, lift=6.0, kick=2.0, toe_off=20.0, early_lift=1.4)
WADDLE_BOB = [-3.2, -3.8, 0.0, 1.4]
# walk carry: the staff upright in front of the shoulder, the beacon riding high
CARRY = merge(staff_at((9.0, 30.0), 84.0), {"torso": {"r": -1}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = math.cos(ctx["lag_p"])
        return merge(staff_at((9.0 + 1.2 * c, 30.0 + 0.8 * lag), 86.0 - 4.0 * c + 3.0 * lag), {
            "beacon": {"z": -1.2 * lag}, "halo": {"rz": 45 * f},
            "hem": {"r": 0.0}, "lantern": {"r": 0.0},
            "body": {"rx": 3 * math.sin(ctx["p"])}, "head": {"rx": -3 * math.sin(ctx["p"])}})
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, bob=WADDLE_BOB, sq=M.BRISK_SQ, lean=-4.0, twist=5.0,
                     nod=3.0, sway=5.0, arms={"l": KC.ArmChain("l")}, arm=28.0, elbow=(30.0, 60.0),
                     extra=extra, report=report)


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


# aimed shots (queue item 44, ageborn_art/aimed.py; W4): the staff turns `turn` degrees in the fist (the bolt leaves
# the beacon along it), the body leans back a fifth of the turn and the hand rises a little with it
AIM_LEAN = 0.2
AIM_RISE = 0.06
AIM_W = [0.0, 0.0, 0.3, 0.6, 1.0, 1.0, 0.6, 0.2, 0.0, 0.0]


def _attack_pose(f, turn=0.0):
    if HAND[f] is not None:
        hx_, hz_ = HAND[f]
        arm = staff_at((hx_, hz_ + AIM_RISE * max(turn, 0.0)), WW[f] + turn - (TR[f] + AIM_LEAN * turn))
    else:
        arm = STANCE
    rz, hs = HALO[f]
    pose = merge(arm, K.arm("l", LA[f], LF[f]), {
        "torso": {"r": TR[f] + AIM_LEAN * turn}, "head": {"r": HD[f] + 0.2 * turn},
        "beacon": {"s": BEACON_S[f], "x": -2.5 if f == 6 else 0.0},
        "halo": {"rz": rz, "s": hs},
        "surge": {"show": f == 4},
        "staff": {"z": SLIDE[f]},
        "flash": {"show": f == 5},
    }, M.body_about((0, 0, 24), x=BX[f], z=BZ[f], q=BQ[f]))
    if HAND[f] is None:
        pose = merge(pose, {"torso": {"r": 0}})
    return KI.ground_feet(RIG, merge(pose, KF.glyph(EYES[f])), LEGS)


def _attack_clip():
    ov = {
        2: [{"kind": "rings", "joint": "beacon", "point": BEACON, "radii_lu": (8.0, 11.5), "a0": -180.0,
             "a1": 180.0, "color": K.MINT_CORE}],
        3: FW.smear_soft({"kind": "arc", "joint": "staff", "inner": (HR[0], HR[1], HR[2] + STAFF_UP - 6.0),
                          "outer": BEACON, "color": K.MINT, "white": 0.35, "taper": 0.3, "lines": 2, "t0": 0.0,
                          "t1": 1.0}, band=0.5),
        4: [{"kind": "dust", "joint": "staff", "point": FOOT, "ground_snap": True, "size_lu": 5.5, "puffs": 4,
             "seed": 3, "spread": 1.1, "color": "#DCD6E8"},
            {"kind": "burst", "joint": "staff", "point": FOOT, "r0_lu": 4.0, "r1_lu": 9.0, "n": 5, "a0": 20.0,
             "arc": 140.0, "color": K.MINT_CORE}],
        5: [{"kind": "burst", "joint": "beacon", "point": (BEACON[0] + 4.0, BEACON[1], BEACON[2]), "r0_lu": 8.0,
             "r1_lu": 14.0, "n": 6, "a0": -70.0, "arc": 140.0, "color": K.MINT_CORE}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


# -- attack B: staff point cast (A's steps: 832 ms, the bolt at 416 ms) -----------------------------
# 0 read, 1 draw back, 2 HOLD (the staff cocked back level behind the shoulder, the beacon swelling
# behind him, leaning back on the rear leg, the free hand aiming), 3 over-the-top smear, 4 thrust, 5 FIRE (arm out,
# the staff 32 deg up at the target, star flash), 6 recoil, 7-9 = A spin and settle
#        hand          staff  tr   bx    bz    bq     thr  shr  thl  shl  beacon free arm (a, f)  eyes
B_T = [((5.0, 32.0), 70.0, 2, -0.5, 0.0, -0.03, 2, -4, -2, -6, 1.05, -60, -20, "eyes"),
       ((-2.0, 33.0), 132.0, 8, -2.0, -0.6, -0.05, -6, -8, 10, -16, 1.2, -30, 0, "g_wide"),
       ((-6.0, 31.0), 166.0, 12, -3.5, -1.4, -0.07, -10, -10, 16, -22, 1.4, -10, 10, "g_angry"),
       ((5.0, 38.0), 80.0, -2, 2.5, -1.0, 0.05, 16, -14, -12, -12, 1.3, -40, -10, "g_angry"),
       ((12.0, 36.0), 33.0, -10, 6.0, -2.0, 0.04, 28, -22, -22, -16, 1.45, -60, -20, "g_angry"),
       ((14.0, 36.0), 32.0, -12, 7.0, -2.2, -0.12, 30, -24, -24, -16, 0.85, -70, -30, "g_squint"),
       ((11.0, 34.0), 44.0, -6, 5.0, -1.0, 0.02, 22, -16, -18, -10, 0.9, -74, -34, "g_happy")]


def _b_pose(i, turn=0.0):
    if i >= 7:
        return _attack_pose(i)
    hand, staff, tr, bx, bz, bq, thr, shr, thl, shl, bs, la, lf, eyes = B_T[i]
    hand = (hand[0], hand[1] + AIM_RISE * max(turn, 0.0))
    staff, tr = staff + turn, tr + AIM_LEAN * turn
    rz, hs = [(20, 1.0), (80, 1.1), (160, 1.25), (220, 1.2), (260, 1.3), (300, 1.3), (330, 1.1)][i]
    pose = merge(staff_at(hand, staff - tr), K.arm("l", la, lf), {
        "torso": {"r": tr}, "head": {"r": -0.5 * tr},
        "thigh_r": {"r": thr}, "shin_r": {"r": shr},
        "thigh_l": {"r": thl}, "shin_l": {"r": shl},
        "beacon": {"s": bs}, "halo": {"rz": rz, "s": hs},
        "surge": {"show": i == 4},
        "flash": {"show": i == 5},
    }, M.body_about((0, 0, 24), x=bx, z=bz, q=bq))
    return KI.ground_feet(RIG, merge(pose, KF.glyph(eyes)), LEGS)


def _attack_b():
    ov = {
        2: [{"kind": "rings", "joint": "beacon", "point": BEACON, "radii_lu": (8.0, 11.5), "a0": -180.0,
             "a1": 180.0, "color": K.MINT_CORE},
            {"kind": "dust", "ground": (-9.0, 0.0), "size_lu": 4.0, "puffs": 3, "seed": 41, "spread": 0.7,
             "color": "#DCD6E8", "dir": -1.0}],
        # (r34: two-tone soft arcs: the full flat mint crescents held B's smear frames at flat 0.29, micro 3.1)
        3: FW.smear_soft({"kind": "arc", "joint": "staff", "inner": (HR[0], HR[1], HR[2] + STAFF_UP - 6.0),
                          "outer": BEACON, "color": K.MINT, "white": 0.35, "taper": 0.3, "lines": 2, "from": 2,
                          "t0": 0.0, "t1": 1.0}, band=0.5),
        4: FW.smear_soft({"kind": "arc", "joint": "staff", "inner": (HR[0], HR[1], HR[2] + STAFF_UP - 6.0),
                          "outer": BEACON, "color": K.MINT, "white": 0.35, "taper": 0.3, "lines": 2, "from": 3,
                          "t0": 0.3, "t1": 1.0}, band=0.5),
        5: [{"kind": "burst", "joint": "beacon", "point": (BEACON[0] + 4.0, BEACON[1], BEACON[2]), "r0_lu": 8.0,
             "r1_lu": 14.0, "n": 6, "a0": -70.0, "arc": 140.0, "color": K.MINT_CORE},
            {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 42, "spread": 0.9,
             "color": "#DCD6E8"}],
    }
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse={7: ("attack", 7), 8: ("attack", 8), 9: ("attack", 9)}, extra={"holdStep": 2})


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
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    attack, attack_b = cl[2], cl[3]
    # aimed up about 45 and 70 degrees at flyers (he hits air): both casts
    aimed = (AIMED.variants(RIG, attack, _attack_pose, AIM_W, aims=("up45", "up70")) +
             AIMED.variants(RIG, attack_b, _b_pose, AIM_W, aims=("up45", "up70")))
    for v in aimed:
        AIMED.check_timing(attack_b if v.name.startswith("attack_b_") else attack, v)
    return M.check_variants(M.check_contract(cl + aimed, attack_ms=832, attack_impact_at=0.5))
