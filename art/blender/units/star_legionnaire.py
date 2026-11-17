"""Star Legionnaire: Cosmic Age infantry (docs/design-lane-ages.md A17.11). Energy blade, blunt,
laser damage, ~68 lu. Deflector: takes 20% less damage from ranged attacks (the disc is the cue).

Look (A17.12, Cosmic palette): a legionary of the star legions. A crested violet dome helmet
with a team brow band, a star-white chin guard and a dark visor slot whose violet robot eyes act
(angry on the wind-up, slits on the thrust, > < when hit, X on death), a tall violet crest fin
with a star-white edge and a glowing mint star at its root; a team chest plate with the pale
Cosmic star under a star-white gorget, big team shoulder pads with star-white rims, violet lorica
bands, a belt with pouches and a glowing buckle, a short team cape with a star-white hem that
trails on follow-through, violet boots with team greaves over a void undersuit. The far forearm
carries the deflector, big and turned to the camera: a mint energy disc with a hexagon rim and
three star glyphs. The near hand holds a broad violet energy gladius with a white core.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    guard behind the deflector, the disc flickers, weight shift, a blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1, 93.75 lu/s): the gladius sloped back over
          the near shoulder, the deflector swinging with the far arm, planted feet, the cape swinging
  attack  DEFLECTOR JABS AND LUNGE: two quick jabs past the rim of the disc (tak-tak), then the
          gladius is cocked back at the shoulder behind the shoulder-forward disc (the held
          extreme), and a deep lunge drives it straight through (streak smear, impact lines,
          dust at the front foot); he pulls back behind the disc
  attack_b  SHIELD BASH AND RISING SLASH: crouched low behind the deflector, punched forward at the
          target, the gladius cocked down and back behind the hip (the held extreme), then the bash
          lands and the blade rips up in a rising diagonal slash past the rim (crescent smear)
  attack_c  OVERHEAD CHOP: up on his toes with the gladius straight up over the helmet and the disc
          tucked (the held extreme), then a full over-the-top chop down in front into a deep lunge
  hit     armoured: a dip behind the flaring disc, the helmet clanks down, eyes > <
  die     D2 plank topple onto the back; the gladius powers down, the disc collapses, X eyes

Art round W4: the detail standard (below), damage spots, and B1' (item 38's tossed clips): B's impact step showed the
high finish (the blade up at 62 degrees, its tip over the foe's head), so the slash was never drawn on the target;
now the impact step shows the blade rising through the foe at 24 degrees and the high finish follows on the next
step. Steps, durations and impactAt unchanged.
"""
import math

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

SLUG = "star_legionnaire"
GAIT_NAME = "biped"
NAME = "Star Legionnaire"
HEIGHT_LU = 68
CANVAS = (300, 256)
FEET = (124, 222)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32)}
NO_RETIME = True

# the detail standard (art round W4): the soldiers' lifts on the Cosmic violet and star-white
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.36          # (r26: 0.5 held the Starlight skin's highlight share at 0.102 / 0.108)
# (r26: the extras sat at micro 4.23 against 4.3; a step more in-band gradient and cavity, as the titan's)
LOOK_SHADE = dict(FW.SHADE_SOLDIER, gradient=2.7, cavity=0.78)
# (r30: team_white 0, the Attack Drone's: the white overlay on the team rims was a third of the Starlight skin's
# highlight share; the team layer keeps its lit rim)
LOOK_RIM = dict(FW.RIM_SOLDIER, lift=0.42, team_white=0.0)
MATERIAL_KINDS = FW.kinds_cosmic()

# Starlight Legionnaire (rare skin, DESIGN A5.8; the puppet's recipe: constellation armour, a midnight-violet suit,
# silver-lilac plates and pale starlight trim, low saturation; the card: "armour patterned with constellations"). The
# silhouette sign: an eight-point compass star stands on the helmet in place of the violet fin. A constellation is
# engraved on the helmet (bright star studs joined by fine lines), the cape is starry, and the deflector and the
# gladius glow starlight lilac.
SL = "starlight_legionnaire"
# (r30: the plates a step down, #B2ACCE to #A8A2C6, r30b another and the suit a step up, #1E1834 to #2A2244: against
# the midnight suit the plates' edges counted as highlight; the skin sat at 0.102 / 0.109 against the 0.10 cap)
SL_PLATE, SL_PLATE_DK, SL_PLATE_LT, SL_SUIT, SL_SUIT_LT = "#A09ABE", "#7F799E", "#BCB7D3", "#2A2244", "#3A3258"
SL_TRIM, SL_TRIM_DK, SL_GLOW, SL_GLOW_DK = "#EEE8D6", "#BDB59C", "#C2B8EA", "#B2A8DE"
# (r25: pale glows ran the skin's highlight share to 0.113; r30 the blade and its smears a step down again, #C8BEEE
# to #B4A8E4, and r30b its core: the pale crescent's edge inside its dark outline counted as highlight on every swing)
SL_BLADE, SL_BLADE_CORE = "#B4A8E4", "#E8E2F8"
SL_LEAD_WHITE = 0.15     # the skin's smears' leading strip (the base's 0.4 on the pale lilac was a white line)
DISC_LINE = "#28A884"                               # the deflector's ring lines (a mint a step down)
FLASH_LINE = "#A6EED6"                              # the same lines on the flash (a soft step under MINT_CORE)
SL_STUD, SL_LINE = "#FFFDF4", "#E2DEF0"             # the constellation's star studs and its fine lines
SL_CREST = "#DDD6C2"    # the compass star (r30: in the trim's #EEE8D6 its facet ridges counted as highlight)
SKINS = {SL: {
    "palette": FW.skin_palette({K.VIOLET: SL_PLATE, K.VIOLET_DK: SL_PLATE_DK, K.VIOLET_LT: SL_PLATE_LT, K.VOID: SL_SUIT,
                                K.VOID_LT: SL_SUIT_LT, K.VOID_DK: "#140F22", K.STAR: SL_TRIM, K.STAR_TRIM: SL_TRIM_DK,
                                K.VIOLET_GLOW: SL_BLADE, K.VIOLET_CORE: SL_BLADE_CORE, K.MINT: SL_GLOW,
                                K.MINT_CORE: "#ECE8FF", "#8AF2D2": SL_GLOW_DK, KC.STAR_PALE: "#FFFDF4",
                                DISC_LINE: "#9C92CC", FLASH_LINE: "#CEC6EE",
                                FW.LINE_ON_VIOLET: "#7A7398", FW.WEAR_ON_VIOLET: "#DCD8EC", FW.FOLD_ON_VOID: "#40385E",
                                FW.LINE_ON_STAR: "#C9C1A8"}),
    "kinds": FW.kinds({SL_PLATE: "polymer", SL_PLATE_DK: "polymer", SL_PLATE_LT: "polymer", SL_SUIT: "cloth",
                       SL_SUIT_LT: "cloth", "#140F22": "cloth", SL_TRIM: "ceramic", SL_TRIM_DK: "ceramic",
                       "#7A7398": "polymer", "#DCD8EC": "polymer", "#40385E": "cloth", "#C9C1A8": "ceramic",
                       SL_STUD: "ceramic", SL_LINE: "polymer", SL_CREST: "ceramic"})}}

BLADE_LEN = 34.0
HILT = 7.0
HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
HL = (0.0, K.ARM_Y["l"], K.HAND_Z)
B0 = HR[2] + HILT
TIP = (HR[0], HR[1] - 1.0, B0 + BLADE_LEN + 1.0)
MID = (HR[0], HR[1] - 1.0, B0 + BLADE_LEN * 0.45)
ARC_IN = (HR[0], HR[1] - 1.0, B0 + BLADE_LEN * 0.66)   # (W4: the crescents' inner edge; MID made a flat field)


RIG = None


def _lw():
    """The smears' leading-strip white for the skin being rendered (the clips are built after build(rig))."""
    return SL_LEAD_WHITE if getattr(RIG, "skin", None) == SL else 0.4


def build(rig):
    global RIG
    RIG = rig
    KC.skeleton_v3(rig)
    KC.legs_v3(rig, team_shin=True, knee=None)
    rig.joint("blade", "hand_r", HR)
    rig.joint("disc", "fore_l", (HL[0], HL[1], HL[2] + 4.0))

    # deflector disc on the far forearm, facing forward and turned toward the camera
    n = (math.cos(math.radians(-72)), math.sin(math.radians(-72)), 0.0)
    bx, by, bz = HL[0] + 3.0, HL[1] - 6.0, HL[2] + 5.0
    g = Geo().blob((HL[0] + 1.6, HL[1] - 1.0, HL[2] + 4.5), (3.0, 3.2, 3.6), p=3.0)
    rig.part("disc", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)

    def along(d):
        return (bx + n[0] * d, by + n[1] * d, bz)

    def on_disc(d, u, v):
        # a point on the disc plane: u along the disc's in-plane horizontal, v up
        p = along(d)
        return (p[0] - n[1] * u, p[1] + n[0] * u, p[2] + v)

    g = Geo().lathe([(0, -0.3), (17.6, -0.2), (18.6, 0.8), (17.4, 1.6), (0, 1.4)], along(0), along(1), segs=6)
    rig.part("disc", g, glow=K.MINT, outline=1.0, outline_hex=K.VOID)
    g = Geo().lathe([(0, 0), (13.6, 0.1), (13.6, 0.9), (0, 1.0)], along(1.2), along(2.2), segs=24)
    rig.part("disc", g, glow="#8AF2D2", outline=0)
    g = Geo().lathe([(0, 0), (5.0, 0.2), (4.5, 1.2), (0, 1.8)], along(2.0), along(3.6), segs=16)
    rig.part("disc", g, glow=K.MINT_CORE, outline=0)
    # (W4: a hex lattice over the inner field and a ring line inside the rim: the disc, which the bash turns full to
    # the camera, was one flat glow field at game scale)
    g = Geo().lathe([(15.2, 0), (15.9, 0), (15.9, 0.4), (15.2, 0.4)], along(1.6), along(2.6), segs=24)
    cell = 4.6
    for k in range(6):
        a0 = math.radians(30 + 60 * k)
        cu, cv = math.sqrt(3) * cell * math.cos(a0), math.sqrt(3) * cell * math.sin(a0)
        for e in range(6):
            p0 = on_disc(2.35, cu + cell * math.cos(math.radians(60 * e)), cv + cell * math.sin(math.radians(60 * e)))
            p1 = on_disc(2.35, cu + cell * math.cos(math.radians(60 * e + 60)),
                         cv + cell * math.sin(math.radians(60 * e + 60)))
            g.capsule(p0, p1, 0.32, segs=6, rings=1)
    rig.part("disc", g, glow=DISC_LINE, outline=0)
    # three star glyphs on the disc face
    g = Geo()
    for a in (90, 210, 330):
        p = on_disc(2.6, 9.4 * math.cos(math.radians(a)), 9.4 * math.sin(math.radians(a)))
        g.star(p, 2.6, 1.0, 0.6, points=4, rot=(0, 0, 18))
    rig.part("disc", g, glow=K.WHITE, outline=0)
    # the flicker: a bright ring shown on some idle frames and when the disc takes a blow
    rig.joint("disc_hi", "disc", along(2.4), hidden=True)
    g = Geo().lathe([(15.4, 0), (18.2, 0.1), (18.2, 1.0), (15.4, 1.1)], along(2.2), along(3.4), segs=6)
    rig.part("disc_hi", g, glow=K.MINT_CORE, outline=0.8, outline_hex=K.MINT)
    # (r30) the flash keeps the lattice and the ring line, in soft lines a step under it (the lathe caps its ring, so
    # the flash was one pale hexagon: the flattest field of B's held bash, micro 3.5 on that frame)
    g = Geo()
    for k in range(6):
        a0 = math.radians(30 + 60 * k)
        cu, cv = math.sqrt(3) * cell * math.cos(a0), math.sqrt(3) * cell * math.sin(a0)
        for e in range(6):
            p0 = on_disc(3.55, cu + cell * math.cos(math.radians(60 * e)), cv + cell * math.sin(math.radians(60 * e)))
            p1 = on_disc(3.55, cu + cell * math.cos(math.radians(60 * e + 60)),
                         cv + cell * math.sin(math.radians(60 * e + 60)))
            g.capsule(p0, p1, 0.36, segs=6, rings=1)
    for e in range(24):
        a0, a1 = math.radians(15 * e), math.radians(15 * e + 15)
        g.capsule(on_disc(3.55, 15.0 * math.cos(a0), 15.0 * math.sin(a0)),
                  on_disc(3.55, 15.0 * math.cos(a1), 15.0 * math.sin(a1)), 0.42, segs=6, rings=1)
    rig.part("disc_hi", g, glow=FLASH_LINE, outline=0)
    K.sparks(rig, "disc", along(3.0), color=K.MINT, size=1.1, name="flare", seed=2)

    K.arm_parts(rig, "l")

    # short team cape behind the shoulders with a star-white hem (drawn first)
    rig.secondary("cape", "torso", (-8.0, 0, 38.0), (-14.0, 0, 14.0), max_deg=16, gain=1.1)
    g = Geo().blob((-11.5, 0.5, 26.5), (3.4, 12.0, 13.0), p=3.0, taper=(1.3, 0.9), shift=(0.2, 0))
    rig.part("cape", g, team=True)
    g = Geo().blob((-12.8, 0.5, 15.6), (2.4, 12.6, 1.6), p=3.0)
    rig.part("cape", g, K.STAR, outline=0.6, outline_hex=K.STAR_TRIM)

    K.torso(rig, pack=False)
    # segmented violet ab bands (the legion's lorica) under the team plate
    g = Geo()
    for z in (24.4, 27.2):
        g.blob((1.2, 0, z), (9.9, 9.9, 1.2), p=3.0)
    rig.part("torso", g, K.VIOLET, finish="gloss")
    g = Geo().blob((0.6, 0, 16.6), (10.6, 10.4, 4.2), p=2.8, taper=(1.12, 1.0))
    g.clip((0, 0, 12.8), (0, 0, -1))
    rig.part("hips", g, K.VIOLET_DK, finish="gloss")
    # star-white pteruges strips over the hips (ending 11 lu above the soles, ANIM_SPEC G1)
    g = Geo()
    for y in (-7.5, -2.5, 2.5):
        g.blob((7.6, y, 14.6), (2.2, 2.0, 3.2), p=2.8)
    rig.part("hips", g, K.STAR, finish="gloss", outline=0.6, outline_hex=K.STAR_TRIM)
    # belt pouches and a star-white gorget
    g = Geo().blob((4.0, -9.4, 20.4), (2.6, 1.8, 2.6), p=3.2).blob((-4.0, -9.2, 20.6), (2.4, 1.8, 2.6), p=3.2)
    rig.part("torso", g, K.VOID_LT, outline=0.6)
    g = Geo().blob((1.0, 0, 39.2), (7.4, 7.6, 1.8), p=2.6)
    rig.part("torso", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # the Cosmic star on the team chest plate
    chest = Geo().blob((1.8, 0, 31.4), (9.8, 10.5, 8.0), p=3.0, taper=(0.88, 1.0))
    cf = FC.Face(rig, "torso", [chest])
    g = KC.starmark(cf, Geo(), KM.scr(cf, (6.2, -9.0, 31.6)), s=1.0)
    rig.part("torso", g, KC.STAR_PALE, highlight=False, outline=0)

    # helmet: a crested violet dome, a star-white chin guard, a dark visor slot with the eyes
    g = Geo().blob((2.0, 0, 51.0), (12.0, 11.4, 12.2), p=2.4, shift=(0.1, 0))
    g.blob((-5.0, 0, 44.0), (7.0, 9.6, 5.4), p=2.4)                  # neck guard
    rig.part("head", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().lathe([(12.3, 0), (12.6, 1.4), (12.2, 2.8)], (2.0, 0, 54.6), (2.0, 0, 57.4), segs=26)
    rig.part("head", g, team=True, outline=0.6)
    g = Geo().blob((2.0, 0, 51.0), (12.7, 12.1, 12.9), p=2.4)
    g.clip((4.0, 0, 0), (-1, 0, 0)).clip((0, 0, 48.0), (0, 0, 1)).clip((0, 0, 40.5), (0, 0, -1))
    g.blob((10.0, 0, 42.0), (5.4, 7.6, 3.2), p=2.4)                # chin guard
    rig.part("head", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    KC.visor(rig, "head", (2.0, 0, 51.0), (12.0, 11.4, 12.2), x0=5.0, z_top=54.2, z_bot=47.6,
             eye_at=(9.6, 51.0), eye_dx=(0.0, 3.6), eye_rx=2.3, eye_rz=2.8, grow=1.2)
    if getattr(rig, "skin", None) == SL:
        _star_crest(rig)
    else:
        fin = [(6.0, 60.0), (3.0, 67.0), (-2.0, 74.0), (-6.0, 77.0), (-8.0, 73.0), (-12.0, 66.0), (-16.0, 61.0),
               (-11.0, 56.0), (0.0, 58.0)]
        g = Geo().slab(fin, 0.0, 3.2)
        rig.part("head", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
        g = Geo().capsule((6.4, 0.0, 60.2), (2.6, 0.0, 68.0), 1.3).capsule((2.6, 0.0, 68.0), (-5.6, 0.0, 77.0), 1.3,
                                                                          0.8)
        rig.part("head", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
        g = Geo().star((-3.0, -2.4, 68.0), 3.6, 1.5, 1.4, points=5)
        rig.part("head", g, glow=K.MINT, outline=0.6, outline_hex=K.VOID)
    # crest tail plume (follow-through)
    rig.secondary("plume", "head", (-12.0, 0, 62.0), (-19.0, 0, 54.0), max_deg=18, gain=1.2)
    g = Geo().blob((-15.0, 0, 58.5), (4.2, 2.4, 6.2), p=2.4, rot=(0, 34, 0))
    rig.part("plume", g, team=True)

    K.arm_parts(rig, "r")
    K.shoulders(rig, r=(8.2, 7.0, 6.6))

    # the energy gladius, along +Z from the near fist: wrapped grip, pommel, a wide guard with
    # mint emitters, a broad leaf blade with a white core
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy, hz - 4.2), (hx, hy, hz + 4.6), 1.7)
    rig.part("blade", g, K.VOID_LT, outline=0.8)
    g = Geo()
    for z in (hz - 2.4, hz + 0.2, hz + 2.8):
        g.lathe([(0, -0.5), (2.1, -0.4), (2.1, 0.4), (0, 0.5)], (hx, hy, z), (hx, hy, z + 1), segs=12)
    rig.part("blade", g, K.STAR_TRIM, finish="metal", outline=0)
    g = Geo().blob((hx, hy, hz - 5.6), (2.4, 2.4, 2.0), p=2.4)
    g.blob((hx, hy, hz + 5.8), (6.6, 2.8, 2.0), p=2.6)
    rig.part("blade", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((hx + 5.2, hy - 1.0, hz + 5.8), (1.3, 1.2, 1.2), p=2.2)
    g.blob((hx - 5.2, hy - 1.0, hz + 5.8), (1.3, 1.2, 1.2), p=2.2)
    rig.part("blade", g, glow=K.MINT, outline=0)
    g = Geo().blob((hx, hy - 0.4, B0 + BLADE_LEN / 2), (5.0, 1.6, BLADE_LEN / 2 + 1.0), p=2.2,
                   taper=(0.85, 0.5))
    rig.part("blade", g, glow=K.VIOLET_GLOW, outline=1.0, outline_hex=K.VIOLET)
    g = Geo().blob((hx + 0.2, hy - 1.4, B0 + BLADE_LEN / 2 - 0.5), (2.0, 0.9, BLADE_LEN / 2 - 1.5),
                   p=2.2, taper=(0.9, 0.45))
    rig.part("blade", g, glow=K.VIOLET_CORE, outline=0)
    rig.track("bladeTip", "blade", TIP)
    FW.cosmic_body(rig, team_shin=True, pad_r=(8.2, 7.0, 6.6))
    _detail(rig)
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _star_crest(rig):
    """The Starlight Legionnaire's crest (the skin's silhouette sign): an eight-point compass star in the starlight
    trim, standing on the helmet where the fin was and leaning back as the fin did; cut in facets (each point's two
    faces meet in a ridge) with a glowing heart."""
    from mathutils import Matrix, Vector
    from ageborn_art.geometry import _euler
    cx, cz, depth, bulge, lean = -3.0, 66.5, 3.0, 3.4, -12.0
    n = 16
    radii = [3.6 if i % 2 else (11.0 if i % 4 == 0 else 6.8) for i in range(n)]   # long, inner, short, inner, ...
    verts = []
    for y in (-depth / 2, depth / 2):
        for i, r in enumerate(radii):
            a = math.pi / 2 + math.pi * i / 8
            verts.append((r * math.cos(a), y, r * math.sin(a)))
    cf = len(verts)
    verts.append((0.0, -depth / 2 - bulge, 0.0))
    cb = len(verts)
    verts.append((0.0, depth / 2, 0.0))
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces += [[cf, j, i], [cb, n + i, n + j], [i, j, n + j, n + i]]
    g = Geo()
    g._add(verts, faces, Matrix.Translation(Vector((cx, 0.0, cz))) @ _euler((0, lean, 0)), smooth=False)
    rig.part("head", g, SL_CREST, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((cx, -depth / 2 - bulge + 0.2, cz), (1.7, 0.9, 1.7), p=2.2)
    rig.part("head", g, glow=K.MINT, outline=0.6, outline_hex=K.STAR_TRIM)


def _dome_y(x, z):
    """The camera's side of the helmet dome (blob (2, 0, 51), radii (12, 11.4, 12.2), p 2.4) at (x, z)."""
    t = 1.0 - abs((x - 2.0) / 12.0) ** 2.4 - abs((z - 51.0) / 12.2) ** 2.4
    return -11.4 * max(t, 0.0) ** (1.0 / 2.4)


def _constellation(rig):
    """The skin's engraved constellation on the helmet above its team band: four bright star studs joined by fine
    lines (the card's "armour patterned with constellations"), and three star specks on the cape."""
    hf = FC.Face(rig, "head", [Geo().blob((2.0, 0, 51.0), (12.0, 11.4, 12.2), p=2.4)])
    stars = [(-5.6, 58.6), (-3.0, 60.8), (-0.2, 59.4), (2.6, 61.4)]
    pts = [FW.sc(hf, x, z, _dome_y(x, z) + 0.3) for x, z in stars]
    FW.panel_lines(rig, "head", hf, [pts], fill=SL_LINE, w=0.42)
    FW.wear(rig, "head", hf, [(*p, r, r) for p, r in zip(pts, (0.8, 0.95, 0.8, 0.9))], fill=SL_STUD)
    KC.specks(rig, "cape", [(-12.2, 32.0, 1.0), (-12.0, 25.0, 1.2), (-12.4, 19.4, 0.9)], -11.8, color=SL_STUD)


def _detail(rig):
    """W4: the helmet's seam behind the visor with chipped edges, a seam along the crest fin, the lorica bands'
    seams (char space; decals cast)."""
    hf = FC.Face(rig, "head", [Geo().blob((2.0, 0, 51.0), (12.0, 11.4, 12.2), p=2.4)])
    FW.panel_lines(rig, "head", hf, [[FW.sc(hf, -5.6, 60.6, -7.8), FW.sc(hf, -8.8, 53.0, -9.2),
                                      FW.sc(hf, -7.0, 46.4, -8.8)]], fill=FW.LINE_ON_VIOLET, w=0.8)
    FW.wear(rig, "head", hf, [(*FW.sc(hf, -9.8, 47.6, -7.6), 1.3, 0.6), (*FW.sc(hf, -1.6, 62.0, -6.6), 1.1, 0.5)],
            fill=FW.WEAR_ON_VIOLET)
    # (r30b) the near pad in three lames (team-dark, inside its face, as the titan's pauldron): its broad top was the
    # flattest field of B's and C's lunge frames
    y = K.ARM_Y["r"]
    pc, pr = (0.5, y - 0.3 * K.SIDE_Y["r"], 37.6), (8.2, 7.0, 6.6)
    pf = FC.Face(rig, "arm_r", [Geo().blob(pc, pr, p=2.6)])
    yy = pc[1] - (pr[1] - 0.8)
    FW.folds(rig, "arm_r", pf, [[FW.sc(pf, -5.6, 37.4, yy), FW.sc(pf, 0.5, 38.8, yy), FW.sc(pf, 6.0, 37.4, yy)]],
             w=0.75, team=True)
    if getattr(rig, "skin", None) != SL:
        # (r30b) a seam over the dome's crown in front of the fin (the skin's constellation sits there)
        FW.panel_lines(rig, "head", hf, [[FW.sc(hf, x, z, _dome_y(x, z)) for x, z in ((7.4, 59.8), (2.4, 61.6),
                                                                                   (-3.0, 61.0))]],
                       fill=FW.LINE_ON_VIOLET, w=0.7)
        fin = FC.Face(rig, "head", [Geo().slab([(6.0, 60.0), (3.0, 67.0), (-2.0, 74.0), (-6.0, 77.0), (-8.0, 73.0),
                                                (-12.0, 66.0), (-16.0, 61.0), (-11.0, 56.0), (0.0, 58.0)], 0.0, 3.2)])
        FW.panel_lines(rig, "head", fin, [[FW.sc(fin, 0.6, 61.4, -1.7), FW.sc(fin, -3.0, 67.0, -1.7),
                                           FW.sc(fin, -6.6, 71.4, -1.7)],
                                          [FW.sc(fin, -4.0, 59.0, -1.7), FW.sc(fin, -7.4, 64.4, -1.7),
                                           FW.sc(fin, -10.0, 67.8, -1.7)]], fill=FW.LINE_ON_VIOLET, w=0.75)
    else:
        _constellation(rig)
    for z in (24.4, 27.2):
        FW.band(rig, "torso", (1.2, 0, z), (9.9, 9.9, 1.2), 3.0, z - 0.25, z + 0.25, fill=FW.LINE_ON_VIOLET)
    # the cape's pleats (team-dark; the cape was one flat team strip behind the body)
    cc, cr, ct, cs = (-11.5, 0.5, 26.5), (3.4, 12.0, 13.0), (1.3, 0.9), 0.2
    capef = FC.Face(rig, "cape", [Geo().blob(cc, cr, p=3.0, taper=ct, shift=(cs, 0))])

    def on_cape(x, z):
        zu = (z - cc[2]) / cr[2]
        t = (zu + 1) / 2
        k = ct[0] + (ct[1] - ct[0]) * t
        xu = (x - cc[0] - cs * cr[0] * t) / (cr[0] * k)
        return FW.sc(capef, x, z, cc[1] - cr[1] * k * max(1 - abs(xu) ** 3 - abs(zu) ** 3, 0.0) ** (1 / 3))
    FW.folds(rig, "cape", capef, [[on_cape(x0 + 0.4, 36.0), on_cape(x0, 27.0), on_cape(x0 - 0.6, 17.6)]
                                  for x0 in (-13.6, -10.9)], w=0.8, team=True)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, armoured: dents, cracks and a chipped plate; never on the face): the
    near team pad, the violet helmet, the violet hip skirt, the near team greave."""
    rig.damage_spot_at("pauldron", "arm_r", 0.5, 39.0, 5.0, "metal", team=True)
    rig.damage_spot_at("helmet", "head", -6.0, 48.0, 5.0, "metal", fill=K.VIOLET)
    rig.damage_spot_at("skirt", "hips", -4.0, 15.6, 5.0, "metal", fill=K.VIOLET_DK)
    rig.damage_spot("greave", "shin_r", (1.9, -K.LEG_Y - 4.2, 8.8), 5.0, "metal", team=True, normal=(0, -1, 0))


# -- poses -----------------------------------------------------------------------------------
def guard(sa, sf, sw, da=-62.0, df=-2.0):
    """Blade arm (upper, fore, blade directions); disc arm (upper, fore)."""
    return merge(K.arm("r", sa, sf, sw, 90.0), K.arm("l", da, df))


def reach(hand, sw, da=-62.0, df=-2.0):
    """Blade hand at `hand` (torso space x, z) with the blade pointing `sw` (torso degrees)."""
    a, f = K.ik2(K.SH, hand)
    return guard(a, f, sw, da, df)


STANCE = merge(guard(-75, -20, 40), {"torso": {"r": -2}})


def _idle(f):
    def extra(ctx):
        return {"arm_r": {"r": 2.5 * ctx["lag"]}, "hand_r": {"r": -3.5 * ctx["lag"]},
                "arm_l": {"r": 2.0 * ctx["lag"]}, "disc": {"s": 1.0 + 0.03 * ctx["c"]}}
    pose = M.idle_v2(f, STANCE, frames=6, bob=1.2, chest=0.035, extra=extra, blink=4,
                     face_blink=KF.glyph("g_blink"))
    if f in (1, 2):
        pose["disc_hi"] = {"show": True, "s": 1.0 if f == 1 else 1.03}
    return pose


# -- walk v3: G1 bounce jog at ground speed (card 75 x 1.25 = 93.75 lu/s), 8 x 77 ms -------------
SPEED = 93.75
LEGS = KC.legs_ik()
GAIT = KC.jog_gait(LEGS, SPEED, cycle_ms=616)
# walk carry: the gladius sloped back over the near shoulder, the deflector arm pumping
CARRY = merge(guard(-40, 75, 128), {"torso": {"r": -3}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"arm_r": {"r": 3 * lag}, "hand_r": {"r": -7 * lag}, "plume": {"r": 0.0}, "cape": {"r": 0.0}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-8.0, twist=6.0, nod=3.0,
                     arms={"l": KC.ArmChain("l")}, arm=26.0, extra=extra, report=report)


# -- attack: deflector jabs and lunge (680 ms, impact at 290 ms) ------------------------------------
#        jab1  pull  jab2  HOLD  smear lead  IMPACT over  recoil settle settle
TR = [-6, 2, -8, 14, -10, -16, -20, -20, -8, -4, -2]
# blade hand target (torso x, z) and blade direction in WORLD degrees (0 = level forward)
HAND = [(11.0, 30.0), (1.0, 25.0), (12.5, 30.5), (-10.0, 34.0), (8.0, 31.0), (12.0, 31.0), (14.2, 32.0),
        (14.6, 32.2), (8.0, 28.0), None, None]
WW = [4.0, 12.0, 2.0, 14.0, 3.0, 1.0, 0.0, -2.0, 18.0, None, None]
SA = [0, 0, 0, 0, 0, 0, 0, 0, 0, -60, -74]
SF = [0, 0, 0, 0, 0, 0, 0, 0, 0, -12, -20]
SW = [0, 0, 0, 0, 0, 0, 0, 0, 0, 36, 40]
# disc arm: pushed forward on the jabs and the hold (the shoulder leads), tucked on the lunge
DA = [-40, -55, -38, -14, -35, -50, -62, -62, -58, -60, -62]
DF = [4, 0, 6, 16, 2, -4, -8, -8, -4, -2, -2]
BX = [1.5, -1.0, 2.5, -5.0, 2.0, 6.0, 10.0, 10.5, 7.0, 3.0, 0.5]
BZ = [0.0, -1.2, 0.0, -0.8, 1.2, 0.2, -1.6, -1.2, -0.4, 0.0, 0.0]
BQ = [0.02, -0.07, 0.03, -0.08, 0.08, 0.06, -0.14, -0.08, 0.0, 0.02, 0.0]
THR = [6, -2, 8, -10, 14, 26, 36, 36, 22, 8, 2]
SHR = [-2, -2, -4, -2, -12, -18, -24, -22, -10, -4, 0]
THL = [-4, 6, -6, 14, -10, -18, -24, -22, -14, -6, -1]
SHL = [0, -6, -2, -10, -8, -6, -4, -4, -4, -2, 0]
HD = [-2, 2, -3, 3, -4, -6, -8, -6, -2, 0, 0]
EYES = ["g_angry", "g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_angry", "g_angry", "eyes",
        "eyes", "eyes"]


def _attack_pose(f):
    if HAND[f] is not None:
        arms = reach(HAND[f], WW[f] - TR[f], DA[f], DF[f])
    else:
        arms = guard(SA[f], SF[f], SW[f], DA[f], DF[f])
    pose = merge(arms, {
        "torso": {"r": TR[f]}, "head": {"r": HD[f]},
        "thigh_r": {"r": THR[f]}, "shin_r": {"r": SHR[f]},
        "thigh_l": {"r": THL[f]}, "shin_l": {"r": SHL[f]},
    }, M.body_about((0, 0, 26), x=BX[f], z=BZ[f], q=BQ[f]))
    if f in (4, 5):
        pose.setdefault("blade", {})["sz"] = 1.12
    if f in (0, 2):
        pose["disc_hi"] = {"show": True}
    return KI.ground_feet(RIG, merge(pose, KF.glyph(EYES[f])), LEGS)


def _attack_clip():
    jab = {"kind": "streak", "joint": "blade", "point": TIP, "color": FW.fx(RIG, SKINS, K.VIOLET_GLOW), "width_lu": 7.0,
           "white": 0.5}
    ov = {
        0: [dict(jab, **{"pose_from": _attack_pose(1), "t0": 0.25})],
        2: [dict(jab, **{"from": 1, "t0": 0.2})],
        3: [{"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 4.0, "puffs": 3, "seed": 2, "spread": 0.7,
             "color": "#DCD6E8"}],
        4: [dict(jab, **{"from": 3, "t0": 0.05, "t1": 1.0, "width_lu": 5.5})],
        6: [{"kind": "burst", "joint": "blade", "point": TIP, "r0_lu": 5.0, "r1_lu": 11.0, "n": 5,
             "a0": -70.0, "arc": 140.0, "color": FW.fx(RIG, SKINS, K.VIOLET_CORE)},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 4, "spread": 0.9,
             "color": "#DCD6E8"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov)


# -- variants: A's 680 ms, impact at 290 ms, in 10 steps (pre-impact 40+60+115+45+30 = 290) --------
V_MS = [40, 60, 115, 45, 30, 120, 60, 50, 70, 90]
V_IMPACT = 5


def _v_pose(k, hand, ww, ta, tf, tr, bx, bz, bq, thr, shr, thl, shl, eyes, toes=None):
    """A variant frame: blade hand at `hand` (torso x, z) with the blade at `ww` WORLD degrees, the
    disc arm (upper, fore), torso lean, body offset and squash, FK legs (then grounded)."""
    pose = merge(reach(hand, ww - tr, ta, tf), {
        "torso": {"r": tr}, "head": {"r": -0.4 * tr},
        "thigh_r": {"r": thr}, "shin_r": {"r": shr},
        "thigh_l": {"r": thl}, "shin_l": {"r": shl},
    }, M.body_about((0, 0, 26), x=bx, z=bz, q=bq))
    return KI.ground_feet(RIG, merge(pose, KF.glyph(eyes)), LEGS, toes=toes)


# attack B: shield bash and rising slash. 0 sink, 1 coil, 2 HOLD (crouched low behind the deflector
# punched out at the target, the gladius cocked down and back behind the hip), 3 smear (the blade
# sweeps up from below), 4 lead, 5 IMPACT (the bash lands, the blade rips up past the rim at 60 deg,
# up on the toes), 6 overshoot, 7 recoil, 8-9 = A settle
#        hand          ww    disc(a, f)  tr   bx    bz    bq     thr  shr  thl  shl
B_T = [((2.0, 25.0), -110, -34, 0, -6, 0.5, -1.5, -0.04, 12, -16, -10, -12, "g_angry"),
       ((-5.0, 22.0), -145, -12, 8, -12, 1.5, -4.0, -0.08, 22, -30, -18, -22, "g_angry"),
       ((-9.0, 20.0), -165, 2, 6, -16, 2.5, -6.0, -0.10, 28, -38, -22, -28, "g_angry"),
       ((5.0, 25.0), -40, 8, 4, -10, 6.0, -3.0, 0.04, 26, -26, -22, -18, "g_squint"),
       ((10.0, 29.0), -6, 4, 2, -6, 8.0, -1.5, 0.05, 26, -22, -22, -14, "g_squint"),
       ((12.0, 35.0), 24, -30, -6, 0, 10.0, 0.0, -0.10, 30, -20, -26, -12, "g_angry"),
       ((11.0, 44.0), 62, -42, -12, 6, 10.0, 1.0, -0.06, 30, -18, -26, -10, "g_angry"),
       ((7.0, 38.0), 48, -52, -12, 3, 7.5, 0.6, 0.0, 20, -12, -18, -7, "eyes")]
# (B1': the lead was (11, 33) at 18 degrees, the impact the high finish (11, 44) at 62, then (8, 47) at 78 and the
# recoil (6, 33) at 42)


def _b_pose(i):
    if i in (8, 9):
        return _attack_pose(i + 1)
    k = i
    hand, ww, ta, tf, tr, bx, bz, bq, thr, shr, thl, shl, eyes = B_T[k]
    pose = _v_pose(k, hand, ww, ta, tf, tr, bx, bz, bq, thr, shr, thl, shl, eyes,
                   toes={"r": -14} if k in (5, 6) else None)
    if k in (2, 5):
        pose["disc_hi"] = {"show": True, "s": 1.04}
    if k == 5:
        pose["flare"] = {"show": True}
    if k in (3, 4):
        pose.setdefault("blade", {})["sz"] = 1.12
    return pose


def _attack_b():
    rise = {"kind": "arc", "joint": "blade", "inner": ARC_IN, "outer": TIP, "color": FW.fx(RIG, SKINS, K.VIOLET_GLOW),
            "white": 0.35, "taper": 0.2, "lines": 3}
    ov = {
        2: [{"kind": "dust", "ground": (-9.0, 0.0), "size_lu": 4.0, "puffs": 3, "seed": 21, "spread": 0.7,
             "color": "#DCD6E8"}],
        # (W4: two-tone soft arcs, as Photon Knight's: one flat lilac crescent held B 3-4 at flat 0.42; r30 a fifth
        # narrower: at 0.4 / 0.45 the crescents still held the extras' micro at 4.23)
        3: FW.smear_soft(dict(rise, **{"from": 2, "t0": 0.0, "t1": 1.0}), band=0.32, lead_white=_lw()),
        4: FW.smear_soft(dict(rise, **{"from": 2, "t0": 0.35, "t1": 1.0}), band=0.32, lead_white=_lw()),
        5: FW.smear_soft(dict(rise, **{"from": 3, "t0": 0.3, "t1": 1.0, "lines": 2}), band=0.36, lead_white=_lw()) + [
            {"kind": "burst", "joint": "blade", "point": TIP, "r0_lu": 5.0, "r1_lu": 11.0, "n": 5,
             "a0": -10.0, "arc": 140.0, "color": FW.fx(RIG, SKINS, K.VIOLET_CORE)},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 22, "spread": 0.9,
             "color": "#DCD6E8"}],
    }
    reuse = {8: ("attack", 9), 9: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], V_MS, impact=V_IMPACT, smear=3, overlays=ov,
                  reuse=reuse, extra={"holdStep": 2})


# attack C: overhead chop. 0 lift, 1 raise, 2 HOLD (up on his toes, the gladius straight up and back
# over the helmet, the disc low in front), 3-4 smears over the top, 5 IMPACT (blade down in front at
# -35 deg, deep lunge, dust), 6 overshoot, 7 recoil, 8-9 = A settle
C_T = [((5.0, 40.0), 100, -48, 0, 4, -0.5, 0.5, 0.03, -2, -4, 4, -6, "g_angry"),
       ((-2.0, 49.0), 118, -52, 4, 8, -1.5, 2.0, 0.06, -4, -6, 6, -8, "g_angry"),
       ((-5.0, 52.0), 128, -56, 8, 10, -2.0, 2.6, 0.08, -6, -8, 8, -10, "g_angry"),
       ((9.0, 48.0), 58, -60, 0, -4, 3.0, 1.0, 0.02, 14, -14, -10, -8, "g_squint"),
       ((14.0, 37.0), 4, -64, -6, -14, 6.0, -1.5, -0.04, 24, -22, -18, -14, "g_squint"),
       ((13.0, 25.0), -36, -66, -10, -22, 9.0, -4.5, -0.15, 34, -30, -26, -22, "g_angry"),
       ((12.5, 23.0), -46, -64, -8, -20, 9.0, -3.5, -0.06, 32, -26, -24, -18, "g_angry"),
       ((9.0, 28.0), -12, -60, -4, -10, 6.0, -1.5, 0.02, 18, -12, -14, -8, "eyes")]


def _c_pose(i):
    if i in (8, 9):
        return _attack_pose(i + 1)
    k = i
    hand, ww, ta, tf, tr, bx, bz, bq, thr, shr, thl, shl, eyes = C_T[k]
    pose = _v_pose(k, hand, ww, ta, tf, tr, bx, bz, bq, thr, shr, thl, shl, eyes,
                   toes={"r": -16, "l": -20} if k in (1, 2) else None)
    if k in (3, 4):
        pose.setdefault("blade", {})["sz"] = 1.15
    return pose


def _attack_c():
    chop = {"kind": "arc", "joint": "blade", "inner": ARC_IN, "outer": TIP, "color": FW.fx(RIG, SKINS, K.VIOLET_GLOW),
            "white": 0.35, "taper": 0.15, "lines": 3}
    ov = {
        3: FW.smear_soft(dict(chop, **{"from": 2, "t0": 0.0, "t1": 1.0}), band=0.32, lead_white=_lw()),
        4: FW.smear_soft(dict(chop, **{"from": 2, "t0": 0.35, "t1": 1.0}), band=0.32, lead_white=_lw()),
        5: FW.smear_soft(dict(chop, **{"from": 4, "t0": 0.2, "t1": 1.0, "lines": 2}), band=0.36, lead_white=_lw()) + [
            {"kind": "burst", "joint": "blade", "point": TIP, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6,
             "a0": 10.0, "arc": 160.0, "color": FW.fx(RIG, SKINS, K.VIOLET_CORE)},
            {"kind": "dust", "joint": "blade", "point": TIP, "ground_snap": True, "size_lu": 6.5, "puffs": 4,
             "seed": 23, "spread": 1.1, "color": "#DCD6E8"}],
    }
    reuse = {8: ("attack", 9), 9: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(10)], V_MS, impact=V_IMPACT, smear=3, overlays=ov,
                  reuse=reuse, extra={"holdStep": 2})


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return merge(guard(-75 + 18 * up, -20 + 20 * up, 40 + 20 * up, -62 + 40 * up, -2 + 30 * up),
                     {"torso": {"r": 10 * a}, "head": {"r": 8 * a}})
    pose = KM.hit_armoured(k, {"torso": {"r": -2}}, recoil, face_hurt=KF.glyph("g_hurt"),
                           face_back=KF.glyph("g_angry"), helm="head", clank=1.6)
    if k in (0, 1):
        pose["disc_hi"] = {"show": True, "s": 1.04}
        pose["flare"] = {"show": k == 0}
    return pose


def _die(k):
    flail = [0.4, 0.3, 0.9, 1.0, 0.3, 0.6, 0.1, 0.0, 0.0, 0.0][k]
    stiff = min(1.0, k / 3.0)
    pose = merge(STANCE, KM.die_d2(k, toe_x=7.0, heel_x=-6.0, lie_lift=8.0, back=True), {
        "torso": {"r": -4 * stiff}, "head": {"r": 10 * flail - 4},
        "arm_r": {"r": 38 * stiff - 30 * flail}, "fore_r": {"r": 20 * flail - 10 * stiff}, "hand_r": {"r": -40 * stiff},
        "arm_l": {"r": 30 * flail + 12 * stiff}, "fore_l": {"r": 30 * flail - 20 * stiff},
        "thigh_r": {"r": 6 * flail + 24 * stiff}, "shin_r": {"r": -4 * flail - 20 * stiff},
        "thigh_l": {"r": -6 * flail - 8 * stiff}, "shin_l": {"r": -4 * flail},
        "blade": {"sz": [1.0, 1.0, 0.8, 0.55, 0.35, 0.3, 0.3, 0.3, 0.3, 0.3][k]},
        "disc": {"s": [1.0, 0.9, 0.7, 0.5, 0.3, 0.12, 0.05, 0.05, 0.05, 0.05][k]},
    })
    if k == 1:
        pose["disc_hi"] = {"show": True}
    g = "g_hurt" if k == 0 else ("g_wide" if k < 4 else "eyes_x")
    return merge(pose, KF.glyph(g))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
