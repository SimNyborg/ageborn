"""Standard Bearer: Bronze Age support (A17.9). Damage aura (+15%), throws darts, ~70 lu.

Look (A17.12): a veteran in a conical polished-bronze pilos helmet with a verdigris rim, big
eyes, a bushy moustache, a linen tunic with a plum belt sash and a team cloak clasped on the
shoulders that streams behind him, greaves and sandals, a plum-and-sandstone frame drum at
the hip and a leather bandolier of darts across the chest. In the far hand a tall eagle
standard: a pole with a crossbar and a big team banner (sandstone fringe, a lambda emblem)
that swings with follow-through, crowned by a polished-bronze eagle with its wings spread
wide in the camera plane (the aura reads from far away). The near hand throws darts.

Animation (cartoon kit v2; a viewer expects a standard bearer to rally with the banner and
chip in with a thrown dart):
  idle    the banner ripples, he plants the pole with a little bounce, blink
  walk    walk v3 brisk walk at ground speed (ANIM_SPEC G2): the standard held high and tipped
          forward, bobbing a frame late with the banner trailing, the dart arm pumping, planted feet
  attack_b  PLANT AND THROW: he stamps the standard upright beside him and hurls a dart overhand
          from behind his head (A and B twirl the dart while the sim wind-up lasts: holdLoop)
  attack  RALLY SWING AND DART FLICK: he rocks back with the standard tilted far back and the
          dart hand cocked low behind the hip (the held extreme), then sweeps the standard
          forward (banner smear) while flicking the dart underhand (it leaves at the per-frame
          `muzzle` on the impact frame), shouting (rings); pulls a new dart from the bandolier
  hit     light: head snaps back, the standard wobbles
  die     D3 dizzy sit: he spins, sits down hard with spiral eyes and the standard topples
          back over him
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import colors as CL
from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import kit_bronze_detail as KD
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "standard_bearer"
GAIT_NAME = "biped"
NAME = "Standard Bearer"
HEIGHT_LU = 70
CANVAS = (420, 322)
FEET = (196, 292)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32)}
NO_RETIME = True

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand: darts (modelled along +X)
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand: the standard (modelled pointing up)
POLE_UP, POLE_DOWN = 78.0, 18.0
WING_TILT = -26.0             # wings tipped back so their faces catch the highlight
DART_F, DART_B = 26.0, 7.0
EAGLE_BODY = "#DCC69C"        # the eagle's body and head (a paler polished bronze)
WING = "#CBB083"              # its wings: a warm polished bronze under the A11 rule's saturation (W1: the
                              # shipped BRONZE wings and their outline were ~6% of the colour rule on their own)

# the detail standard (art round W1, ageborn_art/look.py, kit_bronze_detail.py): the lifts and the model detail
# of audit 5.1 / 5.2: the banner hangs in vertical folds with team-dark woven bands across it (a vexillum's
# stripes: the big team field in two tones that shades as cloth), two folds and a team-dark hem on the cloak, a
# verdigris band round the linen skirt, a painted plum ring on the drum's face, a tooled band, a row of punched
# dots and a pair of incised scrolls on the pilos; darts thrown at flyers aimed up 45 and 70 degrees (item 44)
DETAIL_STANDARD = True
LOOK_SHADE = {"shadow": 0.84, "core": 0.18, "core_width": 0.30, "gradient": 2.0, "cavity": 0.6, "rim_mix": 0.5,
              "top": 0.08, "top_t": 0.62, "team_core": 0.4}
_FAR = lambda c: CL.scale(c, B.V3_FAR)        # noqa: E731 (sandal_legs_v3 darkens the far leg)
MATERIAL_KINDS = {B.SKIN: "skin", _FAR(B.SKIN): "skin", B.HAIR: "fur", B.LINEN: "cloth", B.PLUM: "cloth",
                  B.LEATHER: "leather", _FAR(B.LEATHER): "leather", B.LEATHER_DK: "leather",
                  _FAR(B.LEATHER_DK): "leather", B.BRONZE: "bronze", _FAR(B.BRONZE): "bronze", B.BRONZE_HI: "bronze",
                  EAGLE_BODY: "bronze", WING: "bronze", B.AGED_DK: "bronze", B.VERD: "bronze", B.VERD_DK: "cloth",
                  _FAR(B.VERD_DK): "cloth", B.SAND_LT: "cloth", B.SAND: "cloth", B.AGED: "bronze", B.WOOD: "wood",
                  B.WOOD_DK: "wood", "team": "cloth"}


def build(rig):
    global RIG
    RIG = rig
    B.skeleton_v3(rig)           # walk v3: longer legs, planted feet (ANIM_SPEC 2.0 rule 5)
    B.sandal_legs_v3(rig)

    # the standard in the far hand (built first: it sits behind the body)
    hx, hy, hz = HL
    py = hy + 0.6
    rig.joint("standard", "hand_l", HL)
    g = Geo().capsule((hx, py, hz - POLE_DOWN), (hx, py, hz + POLE_UP), 1.3, 1.2, segs=12)
    rig.part("standard", g, B.WOOD_DK, outline=0.8)
    top = hz + POLE_UP
    g = Geo().capsule((hx - 13.0, py, top - 8.0), (hx + 13.0, py, top - 8.0), 1.1)
    g.lathe([(1.8, 0), (1.9, 2.2), (0, 3.0)], (hx, py, hz - POLE_DOWN + 0.5), (hx, py, hz - POLE_DOWN - 2.5), segs=10)
    rig.part("standard", g, B.AGED_DK, finish="metal", outline=0.6)
    g = Geo()                                   # aged bronze ferrules on the pole (under the banner, over the fist)
    for z in (top - 40.0, hz + 7.0):
        g.blob((hx, py, z), (1.75, 1.65, 1.0), p=2.8)
    rig.part("standard", g, B.AGED, finish="metal", outline=0.4)
    # the banner hangs from the crossbar and swings (follow-through)
    rig.secondary("banner", "standard", (hx, py - 1.2, top - 8.0), (hx, py - 1.2, top - 34.0), max_deg=12,
                  gain=1.0)
    bz = top - 9.0
    tail = [(hx - 12.0, bz - 24.0), (hx - 6.0, bz - 29.0), (hx, bz - 25.0), (hx + 6.0, bz - 29.0),
            (hx + 12.0, bz - 24.0)]                 # the swallowtail's bottom edge

    def bottom(x):
        for (xa, za), (xb, zb) in zip(tail, tail[1:]):
            if x <= xb + 1e-6:
                return za + (zb - za) * (x - xa) / (xb - xa)
        return tail[-1][1]

    def folds(x, z):
        """The banner's front: vertical folds, deeper toward its free bottom edge (a flat slab is one value)."""
        amp = 0.42 + 0.5 * min(1.0, max(0.0, (bz - z) / 29.0))
        u = 2 * math.pi * (x - hx)
        return py - 2.2 + amp * (0.75 * math.sin(u / 6.5 + 0.6) + 0.25 * math.sin(u / 3.9 + 2.0))
    g = KD.sheet(hx - 12.0, hx + 12.0, lambda x: bz, bottom, folds, 1.6)
    rig.part("banner", g, team=True, outline=0.8)
    g = Geo()
    for i in range(7):
        x = hx - 11.0 + i * 22.0 / 6
        g.blob((x, py - 2.4, bz - 0.8), (1.6, 0.8, 1.5), p=2.2)
    rig.part("banner", g, B.SAND, outline=0.5)                 # the fringe (W1: sandstone, it was 7 highlights)
    g = Geo().capsule((hx - 5.0, py - 2.5, bz - 20.0), (hx, py - 2.6, bz - 8.0), 1.4)
    g.capsule((hx, py - 2.6, bz - 8.0), (hx + 5.0, py - 2.5, bz - 20.0), 1.4)
    rig.part("banner", g, B.SAND_LT, outline=0.5)
    for z0, z1 in ((bz - 1.6, bz - 4.4), (bz - 21.2, bz - 23.6)):   # team-dark woven bands (2.8 and 2.4 lu)
        g = KD.sheet(hx - 11.95, hx + 11.95, lambda x, z0=z0: z0, lambda x, z1=z1: z1,
                     lambda x, z: folds(x, z) - 0.25, 0.5, ny=3)
        look.team_part(rig, "banner", g, outline=0)
    # the eagle on top (the aquila): polished bronze, wings spread wide in the camera plane so the
    # shape reads at 1x, the body and head in profile facing the enemy, on a verdigris plinth
    ex, ez = hx, top + 3.0
    fy = py - 1.6
    g = Geo().blob((ex, py, ez - 1.4), (4.2, 3.6, 2.2), p=3.0)
    g.blob((ex, py, ez - 3.4), (2.6, 2.4, 1.4), p=3.0)
    rig.part("standard", g, B.VERD, finish="metal", outline=0.6)
    g = Geo()
    for sgn in (-1, 1):   # one wing each side of the body, feathered tips raised
        g.slab([(ex + 1.5 * sgn, ez + 3.0), (ex + 9.0 * sgn, ez + 7.0), (ex + 16.5 * sgn, ez + 15.0),
                (ex + 20.0 * sgn, ez + 21.0), (ex + 17.0 * sgn, ez + 20.0), (ex + 18.0 * sgn, ez + 16.0),
                (ex + 14.0 * sgn, ez + 15.5), (ex + 14.5 * sgn, ez + 12.0), (ex + 10.0 * sgn, ez + 11.5),
                (ex + 9.5 * sgn, ez + 8.8), (ex + 1.5 * sgn, ez + 9.0)], fy + 1.2, 2.0,
               rot=(WING_TILT, 0, 0), origin=(ex, fy + 1.2, ez + 6.0))
    rig.part("standard", g, WING, finish=B.POLISH, outline=0.8)
    g = Geo().blob((ex + 0.6, fy - 0.6, ez + 5.0), (3.6, 3.0, 6.0), p=2.2, rot=(0, 14, 0))   # body
    g.sphere((ex + 2.6, fy - 0.8, ez + 12.8), 3.2, cuts=3)                                  # head
    g.slab([(ex - 2.0, ez + 0.5), (ex - 5.5, ez - 3.0), (ex + 1.0, ez - 3.0), (ex + 2.4, ez + 0.5)], fy - 0.6, 2.2)
    rig.part("standard", g, EAGLE_BODY, finish=B.POLISH, outline=0.7, outline_hex=B.AGED_DK)
    g = Geo().lathe([(1.4, 0), (0.8, 1.8), (0, 3.4)], (ex + 5.2, fy - 0.8, ez + 12.6), (ex + 8.6, fy - 0.8, ez + 11.4),
                    segs=8)
    rig.part("standard", g, B.AGED_DK, finish="metal", outline=0.5)
    g = Geo().sphere((ex + 4.0, fy - 3.6, ez + 13.6), 0.9, cuts=2)
    rig.part("standard", g, B.PUPIL, outline=0)

    # team cloak clasped on the shoulders, streaming back (follow-through)
    rig.secondary("cloak", "torso", (-6.0, 0, 38.0), (-14.0, 0, 12.0), max_deg=10, gain=0.9)
    cloak, cloak_kw = ((-8.4, 0, 27.0), (4.4, 12.4, 12.8)), {"p": 2.4, "taper": (1.3, 0.8), "shift": (0.2, 0)}
    g = Geo().blob(*cloak, **cloak_kw)
    g.blob((-2.0, 0, 37.8), (8.6, 12.8, 3.2), p=2.6)
    rig.part("cloak", g, team=True)
    g = KD.band_z(*cloak, 14.0, 17.2, **cloak_kw)                        # a team-dark hem
    look.team_part(rig, "cloak", g, outline=0)
    # two folds falling from the clasp and fanning out (the cloak's team field shades as cloth)
    g = KD.ridge(*cloak, [(-8.6, 34.5), (-9.4, 29.0), (-9.9, 23.5), (-10.2, 18.6)], [0.7, 1.1, 1.25, 1.0],
                 bulge=0.65, **cloak_kw)
    KD.ridge(*cloak, [(-6.0, 34.0), (-6.5, 28.5), (-6.9, 23.0), (-7.3, 18.6)], [0.65, 1.0, 1.2, 0.95], geo=g,
             bulge=0.65, **cloak_kw)
    rig.part("cloak", g, team=True, outline=0)
    # linen tunic with a plum sash, bronze clasp
    g = Geo().blob((0.2, 0, 27.5), (10.4, 9.6, 11.6), p=2.4, taper=(1.1, 0.92))
    rig.part("torso", g, B.LINEN)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=9, gain=0.8)
    rig.rest_offset["hem"] = (0, 0, B.V3_LIFT + 1.4)        # hem >= 9 lu above the soles
    g = Geo().blob((0.6, 0, 14.8), (11.4, 10.4, 5.4), p=2.4, taper=(1.14, 0.92))
    rig.part("hem", g, B.LINEN)
    g = Geo().blob((0.6, 0, 10.2), (11.6, 10.6, 1.1), p=3.0)
    rig.part("hem", g, B.PLUM, outline=0.6)
    g = KD.band_z((0.6, 0, 14.8), (11.4, 10.4, 5.4), 12.0, 14.8, taper=(1.14, 0.92))   # a verdigris band (2.8 lu)
    rig.part("hem", g, B.VERD_DK, outline=0)
    g = Geo().blob((0.4, 0, 20.6), (11.2, 10.3, 2.2), p=3.2)
    g.capsule((10.0, -6.0, 36.0), (-2.0, 9.0, 22.0), 1.6)
    rig.part("torso", g, B.PLUM)
    g = Geo().sphere((7.6, -8.6, 37.2), 1.7, cuts=3)
    rig.part("torso", g, B.BRONZE_HI, finish=B.POLISH, outline=0.5)
    # frame drum at the near hip, face to the camera: plum shell, sandstone skin, polished rim,
    # a leather strap across the chest
    rig.joint("drum", "hips", (5.0, -14.0, 14.0))
    rig.rest_offset["drum"] = (0, 0, B.V3_LIFT + 1.5)       # rides on the hip, clear of the knee
    g = Geo().lathe([(0, -2.6), (8.0, -2.6), (8.5, 0), (8.0, 2.6), (0, 2.6)], (5.0, -13.0, 13.5), (5.0, -14.0, 13.5),
                    segs=28)
    rig.part("drum", g, B.PLUM)
    g = Geo().lathe([(0, 0), (6.9, 0), (6.7, 0.7), (0, 0.9)], (5.0, -15.9, 13.5), (5.0, -16.9, 13.5), segs=28)
    rig.part("drum", g, B.SAND_LT, outline=0.5)
    g = Geo()
    for i in range(8):
        a_ = 2 * math.pi * i / 8
        g.sphere((5.0 + 7.8 * math.cos(a_), -15.8, 13.5 + 7.8 * math.sin(a_)), 0.9, cuts=2)
    rig.part("drum", g, B.AGED, finish="metal", outline=0.4)    # aged bronze tacks
    g = KD.ring_y((5.0, 13.5), 2.6, 5.2, -16.5, -17.0)     # a painted plum ring on the drum's face (2.6 lu)
    rig.part("drum", g, B.PLUM, outline=0)
    g = Geo().capsule((7.0, -10.0, 36.5), (6.0, -14.0, 22.0), 1.1).capsule((-7.0, 9.0, 36.0), (7.0, -10.0, 36.5), 1.1)
    rig.part("torso", g, B.LEATHER_DK, outline=0.5)

    # head: face kit, bushy moustache, pilos helmet with a polished rim and a knob
    mst = Geo().blob((13.4, -3.4, 44.2), (2.8, 3.8, 1.9), p=2.2, rot=(16, 0, 0))
    mst.blob((13.4, 2.4, 44.2), (2.8, 3.8, 1.9), p=2.2, rot=(-16, 0, 0))
    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), extra=[mst], mouth_z=42.0, mouth_w=4.6,
               brow_tilt=0.5)
    rig.part("head", mst, B.HAIR, finish="hair")
    g = Geo().blob((-6.0, 0, 46.4), (5.4, 9.2, 6.0), p=2.2)
    rig.part("head", g, B.HAIR, finish="hair")
    pilos = [(0, 0), (12.6, 0), (12.0, 3.0), (8.6, 10.0), (3.6, 15.0), (0, 16.0)]
    p0, p1 = (1.0, 0, 53.6), (0.0, 0, 69.6)
    g = Geo().lathe(pilos, p0, p1, segs=28, squash=(1.0, 0.95))
    rig.part("head", g, B.BRONZE, finish=B.POLISH, outline_hex=B.AGED_DK)
    # a tooled band over the rim, a row of punched dots above it and an incised scroll: the polished dome was the
    # biggest flat field (its broad highlight is one value)
    g = Geo().lathe([(12.57, 1.2), (12.25, 3.0), (12.15, 3.2)], p0, p1, segs=28, squash=(1.0, 0.95))
    rig.part("head", g, B.AGED_DK, finish="metal", outline=0)
    g = Geo()
    for pt in KD.lathe_points(p0, p1, 11.47, 4.2, 22, squash=(1.0, 0.95)):
        g.sphere(pt, 0.55, cuts=2)
    rig.part("head", g, B.AGED_DK, finish="metal", outline=0)
    ref = Geo().lathe(pilos, p0, p1, segs=28, squash=(1.0, 0.95))
    KD.surface_line(rig, "head", ref, KD.volute((4.6, 61.6), 0.8, 3.0, a0=200.0, tail=(1.0, -1.6)), 1.2, B.AGED_DK)
    ref = Geo().lathe(pilos, p0, p1, segs=28, squash=(1.0, 0.95))       # its mirror image: a pair of scrolls
    KD.surface_line(rig, "head", ref, [(-3.3 - x, z) for x, z in KD.volute((0.0, 62.0), 0.8, 2.8, a0=200.0,
                                                                            tail=(1.0, -1.6))], 1.2, B.AGED_DK)
    g = Geo().blob((1.0, 0, 53.8), (13.2, 12.6, 1.3), p=2.8)
    g.sphere((0.0, 0, 70.4), 1.8, cuts=3)
    rig.part("head", g, B.VERD, finish="metal", outline=0.6)
    # dart bandolier: three spare darts in loops across the chest (heads up by the shoulder)
    g = Geo()
    for k in range(3):
        x0, z0 = 5.0 - 3.4 * k, 26.0 + 3.2 * k
        g.capsule((x0, -10.2, z0), (x0 + 4.0, -10.4, z0 + 9.0), 0.7)
    rig.part("torso", g, B.WOOD, outline=0.5)
    g = Geo()
    for k in range(3):
        x0, z0 = 5.0 - 3.4 * k, 26.0 + 3.2 * k
        g.lathe([(0, 0), (1.0, 0.6), (1.3, 1.8), (0, 3.6)], (x0 + 4.0, -10.4, z0 + 9.0), (x0 + 5.4, -10.5, z0 + 12.3),
                segs=8, squash=(1.0, 0.5))
    rig.part("torso", g, B.BRONZE, finish=B.POLISH, outline=0.4)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.0, r1=3.6)
    # the dart in the near fist, modelled level along +X; hidden once thrown
    hx, hy, hz = HR
    rig.joint("dart", "hand_r", (hx, hy - 1.0, hz))
    g = Geo().capsule((hx - DART_B, hy - 1.0, hz), (hx + DART_F - 5.0, hy - 1.0, hz), 0.85, 0.8, segs=10)
    rig.part("dart", g, B.WOOD, outline=0.6)
    g = Geo().lathe([(0, 0), (1.1, 0.6), (1.7, 2.2), (1.0, 4.4), (0, 6.2)], (hx + DART_F - 6.0, hy - 1.0, hz),
                    (hx + DART_F, hy - 1.0, hz), segs=10, squash=(1.0, 0.5))
    rig.part("dart", g, B.BRONZE, finish=B.POLISH, outline=0.5)
    rig.track("muzzle", "hand_r", (hx + DART_F * 0.6, hy - 1.0, hz))
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry (COMMON C1)
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, Bronze soldier; never on the face or skin): the team cloak
    behind him and the team banner (the largest team surfaces; the banner tears like a cloak), the drum's face;
    a strip torn from the cloak's hem. (No linen spot: the throwing arm, the bandolier and the drum cover the
    tunic in every pose, 0-18% visible.)"""
    rig.damage_spot_at("cloak", "cloak", -11.0, 26.0, 7.0, "cloth", team=True)
    rig.damage_spot_at("banner", "banner", -6.0, 76.0, 7.0, "cloth", team=True)
    rig.damage_spot_at("drum", "drum", 1.5, 11.0, 5.0, "hide", fill=B.SAND_LT)
    rig.damage_spot_at("hem", "cloak", -12.0, 17.0, 9.0, "cloth", kind="strip", team=True)


# -- poses ---------------------------------------------------------------------------------
def throw(a, f, w):
    return B.arm("r", a, f, w, w_rest=0.0)


def standard(a, f, w):
    return B.arm("l", a, f, w, w_rest=90.0)


STANCE = merge(throw(-80, -20, 20), standard(-40, 20, 86), {"torso": {"r": -2}})
NO_STD = {k: v for k, v in STANCE.items() if k not in ("arm_l", "fore_l", "hand_l")}


def _idle(f):
    # plants the pole with a little bounce on the beat (lifted on 1-2, planted on 3)
    lift = [0.0, 0.6, 1.0, -0.5, 0.0, 0.2][f]

    def extra(ctx):
        return merge(standard(-40 + 6 * lift, 20 + 6 * lift, 86 - 1.5 * ctx["lag"]), {
            "arm_r": {"r": 2 * ctx["lag"]}, "hand_r": {"r": -3 * ctx["lag"]},
            "body": {"sz": 1.0 - 0.02 * max(0.0, -lift)},
        })
    return M.idle_v2(f, NO_STD, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


# -- walk v3: G2 brisk walk at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 70 ms --------------
RIG = None
SPEED = 81.25
LEGS = B.walk_legs_v3()
GAIT = G.Gait(8, 560, SPEED, G.biped_feet(LEGS["l"], LEGS["r"], x_mid=1.4), 0.40,
              lift=6.0, kick=2.0, reach=0.0, toe_off=20.0, early_lift=1.4, drag=0.3, lift_peak=0.38)
for _k, (_leg, _ph, _x, _gz) in list(GAIT.feet.items()):
    GAIT.feet[_k] = (_leg, _ph - 0.03, _x, _gz)


class _Dart:
    @staticmethod
    def pose(a, b):
        return throw(a, b, 20)


def _walk(f, report=None):
    # carry: the standard raised high and tipped forward (the idle plants it upright), bobbing a frame
    # late so the banner trails; the dart arm pumps
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(standard(-18 + 3 * lag, 58 - 3 * lag, 74 - 4 * lag), {"cloak": {"r": 5 * lag}})
    return M.walk_v3(RIG, f, NO_STD, GAIT, legs=LEGS, bob=M.BRISK_BOB, sq=M.BRISK_SQ, lean=-7.0,
                     twist=5.0, nod=3.0, arms={"r": _Dart}, arm=32.0, elbow=(40.0, 75.0), extra=extra,
                     report=report)


def _feet(pose, fr, fl, lr=0.0, ll=0.0, ar=0.0, al=0.0):
    return B.plant(RIG, pose, LEGS, r=(fr, lr, ar), l=(fl, ll, al))


# 12 steps: read, dip, wind, HOLD, twirl (holdLoop with the hold while the sim wind-up lasts), smear,
# lead | IMPACT, over, reach, draw, settle. Pre-impact 290 of 680 ms (impactAt 0.4265, as shipped).
ATK_MS = [30, 40, 40, 102, 30, 30, 18, 120, 60, 50, 70, 90]
ATK_IMPACT = 7
# 11 base poses (the shipped A). Angles in WORLD degrees (the torso lean is subtracted).
#          read  dip  wind  HOLD smear lead  IMP  over reach draw settle
D_A = [-82, -110, -145, -160, -90, -45, -10, 6, -40, -70, -82]
D_F = [-22, -100, -150, -168, -60, -10, 22, 36, -20, -16, -22]
D_W = [18, -10, -30, -36, -5, 10, 22, 28, 60, 16, 18]
S_A = [-42, -32, -10, 0, -30, -40, -46, -48, -44, -42, -42]
S_F = [18, 30, 50, 60, 20, 10, 8, 6, 12, 16, 18]
S_W = [84, 96, 116, 126, 92, 62, 40, 32, 56, 76, 84]
A_T = [-2, -6, 10, 18, 2, -8, -16, -18, -8, -4, -2]
A_H = [0, 2, -6, -10, -2, 4, 8, 8, 4, 0, 0]
A_Q = [-0.02, -0.1, 0.04, 0.08, 0.05, 0.0, -0.13, -0.08, -0.03, 0.01, 0.0]
A_X = [-0.5, -1.5, -3.0, -4.0, 0.5, 3.5, 6.0, 6.5, 4.0, 1.5, 0.5]
A_Z = [0.0, -2.4, 0.4, 1.2, 0.4, -0.4, -2.0, -1.4, -0.6, 0.0, 0.0]
A_FR = [2.0, 2.0, 1.0, 0.0, 4.0, 7.0, 9.0, 9.0, 7.0, 4.0, 2.0]
A_FL = [-2.0, -3.0, -6.0, -8.0, -6.0, -4.0, -2.5, -2.5, -2.5, -2.0, -2.0]
A_LR = [0, 0, 0, 0, 2.5, 1.5, 0, 0, 0, 0, 0]


# aimed darts at flyers (queue item 44, ageborn_art/aimed.py on the dart's own axis): a turn of `turn` degrees up
# turns the dart fully and the throwing arm partly with it, leans him back into the throw and tips the head and
# the eyes up; the standard keeps its angle in the world and the feet stay planted. The wind-up and the hold
# stay the base clip's frames; the throw rises into the aim through the whip and falls out in the follow-through.
AIM_LEAN = 0.18           # torso r per degree of turn (positive leans back)
AIM_ARM = (0.65, 0.85)    # upper arm and forearm: their share of the turn (world degrees)
AIM_HEAD = 0.30           # head r per degree, on top of the lean
AIM_EYES = 0.010          # pupils z per degree
#        read dip wind HOLD twirl smear lead|IMP over reach draw settle   (release: the lead, the step before)
AIM_W = [0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 0.9, 0.5, 0.15, 0.0, 0.0]
#        read stamp draw HOLD twirl whip lead|IMP over reach draw settle
AIM_W_B = [0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 0.9, 0.5, 0.15, 0.0, 0.0]
AIM_LIFT_B = (0.02, 0.006)  # B's overhand arm past a 40 degree turn: the arm lifts over the head (shares + per
#                             degree), so a steep throw clears the face instead of crossing it


def _aimed(pose, turn):
    """The eyes follow the aim."""
    if not turn:
        return pose
    p = dict(pose.get("pupils", {}))
    p["z"] = p.get("z", 0.0) + AIM_EYES * turn
    return merge(pose, {"pupils": p})


def _base(f, turn=0.0):
    t = A_T[f] + AIM_LEAN * turn
    ka, kf = AIM_ARM
    pose = merge(throw(D_A[f] + ka * turn - t, D_F[f] + kf * turn - t, D_W[f] + turn - t),
                 standard(S_A[f] - t, S_F[f] - t, S_W[f] - t), {
        "torso": {"r": t}, "head": {"r": A_H[f] + AIM_HEAD * turn},
        "dart": {"hide": f in (6, 7, 8)},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    pose = _feet(pose, A_FR[f], A_FL[f], lr=A_LR[f])
    if f in (4, 5):
        pose["dart"]["sx"] = 1.2
    if f in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f == 3:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 0.6}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return _aimed(pose, turn)


def _twirl(pose):
    """The hold-loop partner of a hold: the dart twirls in the fingers, the banner sways."""
    return merge(pose, {"hand_r": {"r": 24}, "fore_r": {"r": 5}, "hand_l": {"r": -4}, "head": {"r": 2},
                        "torso": {"r": 2}, "pupils": {"x": 0.4}})


def _attack_pose(u, turn=0.0):
    if u <= 3:
        return _base(u, turn)
    if u == 4:
        return _twirl(_base(3, turn))
    return _base(u - 1, turn)


EAGLE = (HL[0], HL[1] + 0.6, HL[2] + POLE_UP + 6.0)
BANNER_LOW = (HL[0], HL[1] + 0.6, HL[2] + POLE_UP - 30.0)
BANNER = {"kind": "arc", "joint": "standard", "inner": BANNER_LOW, "outer": EAGLE, "color": B.SAND_LT,
          "white": 0.35, "taper": 0.25, "lines": 3, "line_gap_lu": 3.0}
HAND = {"kind": "arc", "joint": "hand_r", "inner": (HR[0], HR[1], HR[2] + 1.0),
        "outer": (HR[0] + 3.5, HR[1], HR[2] - 1.0), "color": B.SKIN, "white": 0.4, "taper": 0.1, "lines": 2}
SHOUT = {"kind": "rings", "joint": "head", "point": (18.0, 0.0, 43.0), "radii_lu": (6.0, 10.5),
         "a0": -40.0, "a1": 40.0}


def _attack_clip():
    ov = {
        5: [dict(BANNER, **{"from": 3, "t1": 0.95}), dict(HAND, **{"from": 3, "t1": 0.95})],
        6: [dict(BANNER, **{"from": 3, "t0": 0.35, "t1": 0.95})],
        7: [dict(HAND, **{"from": 6, "t1": 0.95}), SHOUT,
            {"kind": "dust", "ground": (10.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 4, "spread": 0.8}],
        8: [dict(SHOUT, radii_lu=(8.0, 13.0))],
    }
    return M.clip("attack", [_attack_pose(u) for u in range(12)], ATK_MS, impact=ATK_IMPACT, smear=5,
                  overlays=ov, extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: the standard planted upright, an overhand dart throw (ANIM_SPEC appendix B) ---------
# 0 = A read, 1 the standard stamped down, 2 the dart drawn up, 3 HOLD (the standard planted
# upright beside him, the dart cocked high behind his head, the far shoulder pointing), 4 twirl,
# 5 overhand whip, 6 lead, 7 IMPACT (released forward from shoulder height), 8-11 = A's
#      stamp draw  HOLD  whip  lead  IMP
B_DA = [-60, 60, 110, 70, 20, -6]             # dart arm, world deg
B_DF = [-20, 120, 160, 60, 10, -10]
B_DW = [20, 30, 24, 14, 8, 2]
B_SA = [-50, -56, -60, -60, -56, -54]         # the planted standard (world deg)
B_SF = [-40, -60, -70, -70, -62, -58]
B_SW = [90, 90, 92, 92, 90, 88]
B_T = [-6, 6, 12, -4, -12, -16]
B_H = [4, -4, -8, 2, 6, 8]
B_X = [0.0, -1.5, -3.0, 1.5, 4.0, 5.5]
B_Z = [-2.5, 0.5, 1.0, -0.5, -1.5, -2.0]
B_Q = [-0.10, 0.05, 0.08, 0.04, 0.0, -0.12]
B_FR = [2.0, 1.0, 0.0, 4.0, 7.0, 8.0]
B_FL = [-3.0, -5.0, -7.0, -5.0, -3.0, -2.5]
B_LR = [0.0, 0.0, 0.0, 2.5, 1.0, 0.0]


def _b_base(k, turn=0.0):
    t = B_T[k] + AIM_LEAN * turn
    over = max(0.0, turn - 40.0)
    ka, kf = AIM_ARM[0] + AIM_LIFT_B[0] * over, AIM_ARM[1] + AIM_LIFT_B[1] * over
    pose = merge(throw(B_DA[k] + ka * turn - t, B_DF[k] + kf * turn - t, B_DW[k] + turn - t),
                 standard(B_SA[k] - t, B_SF[k] - t, B_SW[k] - t), {
        "torso": {"r": t}, "head": {"r": B_H[k] + AIM_HEAD * turn},
        "dart": {"hide": k == 5},
    }, M.body_about((0, 0, 22), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    pose = _feet(pose, B_FR[k], B_FL[k], lr=B_LR[k])
    if k == 3:
        pose["dart"]["sx"] = 1.2
    if k in (0, 1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    else:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return _aimed(pose, turn)


def _b_pose(u, turn=0.0):
    if u == 0 or u >= 8:
        return _attack_pose(u, turn)
    if u == 4:
        return _twirl(_b_base(2, turn))
    return _b_base(u - 1 if u < 4 else u - 2, turn)


def _attack_b():
    ov = {
        1: [{"kind": "dust", "ground": (-2.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 31, "spread": 0.7}],
        5: [dict(HAND, **{"from": 3, "t1": 0.95})],
        7: [dict(HAND, **{"from": 6, "t1": 0.95}), SHOUT,
            {"kind": "dust", "ground": (9.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 32, "spread": 0.7}],
        8: [dict(SHOUT, radii_lu=(8.0, 13.0))],
    }
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10), 11: ("attack", 11)}
    return M.clip("attack_b", [_b_pose(u) for u in range(12)], ATK_MS, impact=ATK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 30 * a}, "fore_r": {"r": 14 * a},
                "arm_l": {"r": 10 * a}, "hand_l": {"r": 8 * a},
                "brow": {"z": 1.4 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"))


def _die(k):
    sit = [0.0, 0.0, 0.0, 0.2, 1.0, 0.9, 1.0, 1.0, 1.0, 1.0][k]
    flail = [0.3, 0.8, 1.0, 0.8, 0.3, 0.2, 0.1, 0.0, 0.0, 0.0][k]
    # the standard wobbles, then topples back over him (torso-space pole angle)
    pole = [90, 100, 80, 110, 150, 165, 158, 162, 162, 162][k]
    pose = merge(STANCE, M.die_d3(k, center_z=27.0, height=HEIGHT_LU), standard(-30 + 60 * sit, 30 + 40 * sit, pole), {
        "hips": {"z": -13.0 * sit},
        "thigh_r": {"r": 85 * sit}, "shin_r": {"r": -35 * sit},
        "thigh_l": {"r": 80 * sit}, "shin_l": {"r": -30 * sit},
        "torso": {"r": 28 * sit + 8 * flail}, "head": {"r": 10 * flail - 16 * sit, "rx": 14 * sit},
        "arm_r": {"r": 70 * flail + 40 * sit},
        "dart": {"hide": k >= 2},
    })
    # the standard() term above replaces the stance's standard arm: remove the stance part
    for j in ("arm_l", "fore_l", "hand_l"):
        for ch, v in STANCE[j].items():
            pose[j][ch] -= v
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    else:
        pose = merge(pose, F.expr("spiral", "tongue" if k >= 4 else "o"))
    return pose


def clips():
    attack, attack_b = _attack_clip(), _attack_b()
    # aimed up about 45 and 70 degrees at flyers (both variants; they go to the extras sheet)
    aimed_a = AIMED.variants(RIG, attack, _attack_pose, AIM_W, aims=("up45", "up70"))
    aimed_b = AIMED.variants(RIG, attack_b, _b_pose, AIM_W_B, aims=("up45", "up70"))
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack,
        attack_b,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ] + aimed_a + aimed_b
    for v in aimed_a:
        AIMED.check_timing(attack, v)
    for v in aimed_b:
        AIMED.check_timing(attack_b, v)
    return M.check_variants(M.check_contract(cl))
