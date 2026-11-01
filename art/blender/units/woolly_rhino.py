"""Woolly Rhino: Stone Age common heavy brute (CONTENT_PLAN 5.1). Horn sweep, cleave 2, ~100 lu.

Look (A11, PLAN.md): a massive, shaggy ice-age rhino, front-heavy with a tall shoulder hump, a long
low head carrying a huge curved front horn and a short second horn (the silhouette), small angry
eyes, a thick shaggy coat that hangs in tufts along the belly line (ending above the knees so the
legs read), stumpy pillar legs with three-toed feet. It wears a team war blanket with a fringe and
bone toggles under two hide pads, team girth bands, and a team pennant on a pole (every Heavy
carries a pennant, A11). Fur stays a low-saturation grey-brown (A11 colour rule).

"A viewer expects it to attack with its horn (a low sweep that knocks two foes aside) and to move
by a heavy trot."

Animation (ANIM_SPEC G4 trot, appendix B tusks and horns; distinct from the Tuskback's gore toss,
ram and rearing hook):
  idle      heavy breathing, ears twitch, the head swings low and snorts dust
  walk      walk v3 trot at ground speed (card 50 x 1.25 = 62.5 lu/s), 8 frames in 800 ms, the coat
            fringe and the pennant following
  attack    LOW HORN SWEEP: plants the forelegs wide, drops the head to the ground on the far side
            (the held extreme: chin on the ground, horn pointing back under the body), then sweeps it
            across and up toward the viewer (ivory arc smear over two frames), dust thrown, the head
            ends high and tossed, then settles
  attack_b  DOUBLE STOMP: rears its forehand a little, then slams both front feet down (dust ring,
            shock lines), the horn jabbing forward on the landing
  attack_c  SHOULDER BARGE: swings its rump away, then slams its flank sideways into the foe
            (a body hip-check), the head turning in
  hit       beast: head shake, a hind hop;  die  D4 heavy topple onto its back, X eyes
"""
import math

from ageborn_art import colors as CC
from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import Quad
from units import stone_w1 as W1

SLUG = "woolly_rhino"
GAIT_NAME = "quad"
NAME = "Woolly Rhino"
HEIGHT_LU = 100
YAW_DEG = -10.0
CANVAS = (400, 288)
FEET = (190, 268)
ANCHORS = {"head": (30, 74), "hitCenter": (0, 42)}
NO_RETIME = True

FUR = "#7E7062"
FUR_DK = "#5F5449"
SHAG = "#6A5D51"
BELLY = "#95887A"
SKIN = "#8C8378"
HORN = "#E6DCC4"
HORN_DK = "#B8AC92"
TOE = "#4A433D"
STRAP = "#6B5646"
BONE = "#EDE3C8"
HIDE = "#A89880"
WOOD = "#8A7560"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2A2A"
STEAM = "#F4F1EA"

HORN_TIP = (70.0, -1.0, 62.0)
BODY_SCALE = 1.12
# W1 (the detail standard)
SHAG_LT = "#94857A"       # lighter, frosted locks over the dark shag (two-tone coat, 30 levels over the shag)
HORN_HI = "#F8F3E6"       # the polished horn tips (lighter tip, 17 levels over the horn)
TOE_HI = "#7A7068"        # the toenails' worn fronts (two-tone feet)
SKIN_DK = "#6C645B"       # skin folds on the snout and the lower legs (a 25-level step under the skin)
SCAR = "#ABA195"          # an old pale scar across the snout (a marking, 5 lu)
PAD = "#8B7461"           # the hide pads' tanned leather

DETAIL_STANDARD = True
LOOK_HIGHLIGHT = W1.HIGHLIGHT_BEAST
LOOK_SHADE = W1.SHADE_BEAST
LOOK_RIM = W1.RIM_BEAST


def _leg(rig, name, p0, p1, front):
    x0, y, z0 = p0
    x1, _, z1 = p1
    col = FUR if y < 0 else FUR_DK
    g = Geo().capsule(p0, p1, 9.8 if front else 10.4, 7.4)
    g.blob((x0 + (2.0 if front else -1.5), y, z0 - 5.0), (10.6, 8.2, 11.5), p=2.2)
    rig.part(f"leg_{name}", g, col, finish="hair")
    g = Geo().capsule(p1, (x1 + 0.5, y, 6.0), 7.4, 6.8)
    rig.part(f"leg_{name}2", g, SKIN if y < 0 else C_SKIN_FAR)
    if front:   # team leg cuffs above the knee tufts
        g = Geo().capsule((x1 + 0.3, y, z1 + 3.5), (x1 + 0.5, y, z1 - 1.0), 8.0, 7.6)
        rig.part(f"leg_{name}2", g, team=True, outline=0.6)
    # shaggy knee tufts (W1: the middle one frosted on the near legs, two tones)
    g, g2 = Geo(), Geo()
    for dx in (-3.5, 0.0, 3.5):
        (g2 if dx == 0.0 and y < 0 else g).lathe(
            [(2.6, 0), (0, 4.0)], (x1 + dx * 0.7, y - 5.6 if y < 0 else y + 5.6, z1 + 1.0),
            (x1 + dx * 0.9 - 1.0, y - 6.4 if y < 0 else y + 6.4, z1 - 3.4), segs=8)
    rig.part(f"leg_{name}2", g, SHAG, finish="hair", outline=0.6)
    if y < 0:
        rig.part(f"leg_{name}2", g2, SHAG_LT, finish="hair", outline=0.6)
        # W1: shaggy locks down the near thigh in two tones (the coat's clumps on the legs, 9 lu)
        xm = (x0 + x1) / 2
        g, g2 = Geo(), Geo()
        W1.fur_lock(g, (xm - 3.0, y - 8.2, 32.0), 9.0, -6, r=2.6, dy=-0.4)
        W1.fur_lock(g2, (xm + 2.8, y - 8.0, 31.0), 8.4, 6, r=2.5, dy=-0.4)
        rig.part(f"leg_{name}", g, SHAG_LT, finish="hair", outline=0.6)
        rig.part(f"leg_{name}", g2, SHAG, finish="hair", outline=0.6)
        # W1: two skin folds round the bare lower leg (1.2 lu lines, the pillar legs' wrinkles)
        for zf in (8.6, 12.4):
            t = (z1 - zf) / (z1 - 6.0)
            W1.ring(rig, f"leg_{name}2", (x1 + 0.5 * t, y, zf), 7.4 - 0.6 * t - 0.15, height=1.2, fill=SKIN_DK,
                    outline=0, bulge=0.35)
    # broad three-toed foot
    g = Geo().blob((x1 + 1.0, y, 3.6), (8.0, 7.6, 3.6), p=2.4)
    for dy in (-3.6, 0.0, 3.6):
        g.blob((x1 + 6.0, y + dy, 2.6), (2.6, 2.2, 2.4), p=2.2)
    rig.part(f"leg_{name}2", g, TOE, finish="gloss")   # W1: worn, polished nails
    if y < 0:   # W1: the toenails' worn, lighter fronts (claws and horns with a lighter tip)
        g = Geo()
        for dy in (-3.6, 0.0):
            g.blob((x1 + 7.6, y + dy - 0.6, 2.4), (1.4, 1.6, 1.8), p=2.2)
        rig.part(f"leg_{name}2", g, TOE_HI, finish="gloss", outline=0)


C_SKIN_FAR = "#706960"
MATERIAL_KINDS = W1.kinds({FUR: "fur", FUR_DK: "fur", SHAG: "fur", SHAG_LT: "fur", BELLY: "fur", SKIN: "hide",
                           C_SKIN_FAR: "hide", HORN: "bone", HORN_DK: "bone", HORN_HI: "bone", TOE: "bone",
                           TOE_HI: "bone", STRAP: "leather", BONE: "bone", HIDE: "hide", WOOD: "wood",
                           SKIN_DK: "hide", SCAR: "hide", PAD: "leather", "team": "hide"})


def build(rig):
    global RIG, LEGS
    RIG = rig
    q = Quad(rig, trunk=(0, 40), front_x=18.0, back_x=-18.0, leg_y=10.0, shoulder_z=42.0,
             hip_z=41.0, knee_z=18.0, hock_z=18.0, knee_dx=1.5, hock_dx=-1.5, far_dx=-3.0)
    rig.rest_scale["body"] = BODY_SCALE
    LEGS = {}
    for name in ("fl", "bl", "fr", "br"):
        p0, p1, _ = q.legs[name]
        _leg(rig, name, p0, p1, name[0] == "f")
        LEGS[name] = G.Leg(f"leg_{name}", f"leg_{name}2", (p1[0] + 1.5, p1[1], 0.8),
                           bend=1.0 if name[0] == "f" else -1.0)
        rig.track(f"_foot_{name}", f"leg_{name}2", (p1[0] + 1.5, p1[1], 0.6))

    # barrel, tall shoulder hump, haunch; pale belly; a shaggy fringe hanging along the belly line
    trunk = Geo().blob((0, 0, 46), (27, 17.5, 18), p=2.3)
    trunk.blob((12, 0, 60), (16, 15.5, 15), p=2.2)
    trunk.blob((-17, 0, 47), (13, 16, 15), p=2.2)
    rig.part("trunk", trunk, FUR, finish="hair")
    g = Geo().blob((2, 0, 34), (20, 13, 7), p=2.4)
    rig.part("trunk", g, BELLY, finish="hair")
    rig.secondary("fringe", "trunk", (0, 0, 34), (-2, 0, 27), max_deg=8, gain=1.2)
    g = Geo()
    for i in range(9):
        x = -22 + i * 5.2
        g.lathe([(3.0, 0), (2.2, -3.0), (0, -6.2)], (x, -14.0, 34.5), (x - 1.2, -14.6, 28.6), segs=8,
                squash=(1.0, 0.7))
    rig.part("fringe", g, SHAG, finish="hair", outline=0.7)
    # W1: lighter locks between the dark tufts (the fringe in two tones, 4-5 lu)
    g = Geo()
    for i in range(8):
        x = -19.4 + i * 5.2
        g.lathe([(2.4, 0), (1.6, -2.6), (0, -5.0)], (x, -14.8, 33.8), (x - 1.0, -15.4, 29.0), segs=8,
                squash=(1.0, 0.7))
    rig.part("fringe", g, SHAG_LT, finish="hair", outline=0.5)
    # shaggy mane over the hump (a bouncing crest of tufts)
    rig.secondary("mane", "trunk", (10.0, 0, 72.0), (-4.0, 0, 76.0), max_deg=6, gain=1.3)
    g = Geo()
    for i in range(6):
        t = i / 5
        x = 24 - 30 * t
        z = 73 - 8 * t
        g.lathe([(5.0, 0), (3.2, 4.0), (0, 9.0)], (x, 0, z - 3), (x - 5.5, 0, z + 5.0), segs=10,
                squash=(1.0, 0.7))
    rig.part("mane", g, SHAG, finish="hair")
    # W1: frosted tips on every other tuft of the crest (a two-tone top line, 3 lu cones)
    g = Geo()
    for i in range(0, 6, 2):
        t = i / 5
        x = 24 - 30 * t
        z = 73 - 8 * t
        g.lathe([(2.4, 0), (0, 4.4)], (x - 3.0, -1.0, z + 1.4), (x - 5.5, -1.0, z + 5.0), segs=8, squash=(1.0, 0.7))
    rig.part("mane", g, SHAG_LT, finish="hair", outline=0)
    # team war blanket (fringed hem above the elbows), two hide pads, team girth bands, toggles
    g = Geo().blob((-3, 0, 50), (24.5, 18.6, 18.0), p=3.0, taper=(1.02, 0.96))
    g.clip((0, 0, 36.5), (0, 0, -1))
    g.clip((16.0, 0, 0), (1, 0, 0))
    g.clip((-26.0, 0, 0), (-1, 0, 0))
    for x in (-22.0, -15.0, -8.0, -1.0, 6.0, 12.0):
        g.lathe([(2.6, 0), (0, -4.0)], (x, -17.0, 38.4), segs=8)
    blanket_face = F.Face(rig, "trunk", [g])
    rig.part("trunk", g, team=True)
    # W1: a team-dark band along the blanket's hem (laid in pieces round the barrel: two tones, still team)
    hem = [(-24.0, 40.6), (-17.0, 40.3), (-10.0, 40.2), (-3.0, 40.2), (4.0, 40.3), (11.0, 40.5), (15.0, 40.7)]
    W1.stripes(rig, "trunk", blanket_face, [[a, b] for a, b in zip(hem, hem[1:])], w=2.8)
    # W1: a team-dark zigzag woven above the hem band (the blanket's big blue field in two tones, 1.4 lu)
    zig = [(-24.0 + 2.6 * i, 43.2 if i % 2 == 0 else 46.6) for i in range(16)]
    W1.seam(rig, "trunk", blanket_face, zig, w=1.4, team=True, depth=1.0)
    # W1: a team-dark stripe along the blanket's top (its big lit field over the pads, 2.2 lu)
    W1.seam(rig, "trunk", blanket_face, [(-22.0, 63.6), (-16.0, 65.6), (-9.0, 66.4), (-2.0, 66.6), (5.0, 66.0),
                                         (11.0, 64.6)], w=2.2, team=True, depth=1.0)
    g = Geo()
    for x in (-15.0, 10.0):
        g.lathe([(0, -6.5), (20.4, -6.3), (21.0, 6.3), (0, 6.5)], (x, 0, 46), (x + 1.0, 0, 46),
                segs=24, squash=(1.12, 1.1))
    g.clip((0, 0, 36.0), (0, 0, 1))
    rig.part("trunk", g, team=True, outline=0.8)
    # W1: the two hide pads in tanned leather over the team blanket (a third material on the barrel; team-painted
    # they were two more blue bumps; bone studs on them read as eyes)
    pads = ((-14.0, -15.0, 57.0, 9.6, 3.2, 8.0, -28), (4.0, -16.5, 54.0, 8.0, 3.0, 7.0, -30))
    g = Geo()
    for x, y, z, rx, ry, rz, rot in pads:
        g.blob((x, y, z), (rx, ry, rz), p=3.0, rot=(rot, 0, 0))
    rig.part("trunk", g, PAD, finish="gloss")
    g = Geo()
    for x in (-15.0, 10.0):
        g.capsule((x - 2.6, -20.2, 39.5), (x + 3.2, -20.2, 40.5), 1.5)
    rig.part("trunk", g, BONE, finish="gloss", outline=0.6)
    # the pennant pole and a team pennant
    rig.joint("pole", "trunk", (-9, 4.0, 62))
    g = Geo().capsule((-9, 4.0, 62), (-13, 4.0, 102), 1.4, 1.2)
    g.sphere((-13.2, 4.0, 103.0), 2.0, cuts=3)
    rig.part("pole", g, WOOD)
    rig.secondary("pennant", "pole", (-12.6, 4.0, 99), (-32, 4.0, 94), max_deg=14, gain=1.3)
    pts = [(-12.6, 101.0), (-36.0, 98.0), (-28.0, 91.5), (-35.5, 84.0), (-12.2, 83.5)]
    rig.part("pennant", Geo().slab(pts, 4.0, 1.4), team=True, outline=0.8)
    # W1: a team-dark band at the hoist (the pennant in two tones)
    look.team_part(rig, "pennant", Geo().slab([(-12.6, 101.0), (-17.4, 100.4), (-17.2, 84.0), (-12.2, 83.5)],
                                              3.15, 0.5), outline=0)

    # neck and long low head: a big curved front horn and a short second horn
    rig.joint("neck", "trunk", (24, 0, 50))
    rig.joint("head", "neck", (32, 0, 47))
    g = Geo().blob((26, 0, 50), (11, 14.5, 15), p=2.3)
    rig.part("neck", g, FUR, finish="hair")
    head = Geo().blob((38, 0, 46), (13, 12.0, 12.0), p=2.3, taper=(1.0, 0.9))
    head.lathe([(10.5, 0), (9.6, 6.0), (8.4, 12.0), (7.6, 16.0), (0, 17.5)], (40, 0, 44),
               (58.0, 0, 38.0), segs=20)
    eye = Geo().blob((42.6, -10.0, 49.4), (2.6, 1.6, 2.4))
    pup = Geo().blob((44.0, -10.6, 49.2), (1.1, 1.0, 1.6))
    face = F.Face(rig, "head", [head, eye, pup])
    rig.part("head", head, SKIN)
    g = Geo().blob((36.0, 0, 55.0), (10.0, 12.6, 6.0), p=2.3)   # shaggy forelock and cheeks
    for y in (-1, 1):
        g.lathe([(4.0, 0), (2.6, 3.6), (0, 7.6)], (36.0, 10.0 * y, 42.0), (30.0, 13.0 * y, 37.0), segs=10,
                squash=(1.0, 0.6))
    rig.part("head", g, SHAG, finish="hair")
    rig.part("head", eye, EYE, highlight=False)
    rig.joint("pupils", "head", (44.0, -10.6, 49.2))
    rig.part("pupils", pup, PUPIL, outline=0)
    face.eye_marks([(44.0, 49.4)], 2.4, SKIN)
    rig.joint("brow", "head", (43.0, -10.0, 52.0))
    rig.part("brow", Geo().capsule((39.8, -11.6, 53.2), (46.0, -10.4, 51.0), 2.0, 1.4), SHAG,
             finish="hair", outline=0.6)
    g = Geo()   # nostril and mouth line
    c = face.hit(56.5, 40.0)
    face.stroke(g, c, [(-1.0, 1.2), (0.6, 0.0)], 1.2, 0.4)
    rig.part("head", g, MOUTH, highlight=False, outline=0)
    # W1: two skin folds across the snout behind the horn and an old pale scar over the cheek (markings, 5-6 lu)
    g = Geo()
    for pts in (((46.8, 45.6), (46.2, 42.6), (46.6, 39.6)), ((50.4, 44.6), (49.9, 42.2), (50.3, 39.8))):
        face.stroke(g, face.hit(*pts[0]), [(x - pts[0][0], z - pts[0][1]) for x, z in pts], 1.2, 0.35)
    rig.part("head", g, SKIN_DK, highlight=False, outline=0)
    g = Geo()
    face.stroke(g, face.hit(39.8, 44.4), [(0, 0), (2.2, -1.4), (4.6, -2.4)], 1.3, 0.35)
    rig.part("head", g, SCAR, highlight=False, outline=0)
    # horns: the big front horn curving up and forward-back, a short second horn
    g = Geo()
    a, b, m = (53.0, 0, 46.0), (60.0, 0, 52.0), (66.0, -0.5, 57.5)
    g.capsule(a, b, 5.4, 4.2).capsule(b, m, 4.2, 2.6)
    g.lathe([(3.6, 0), (2.6, 3.4), (0, 4.6)], (44.0, 0, 52.0), (45.0, 0, 60.5), segs=12)
    rig.part("head", g, HORN, finish="gloss")
    # W1: the polished, lighter tips of both horns (the weapon's business end reads brightest)
    g = Geo().capsule(m, HORN_TIP, 2.6, 0.6)
    g.lathe([(2.6, 0), (0, 3.6)], (44.53, 0, 56.6), (45.0, 0, 60.5), segs=12)
    rig.part("head", g, HORN_HI, finish="gloss", outline=0.5)
    g = Geo()
    for t in (0.25, 0.55):
        p = tuple(aa + (bb - aa) * t for aa, bb in zip(a, b))
        g.capsule(p, tuple(v + d for v, d in zip(p, (0.6, 0, 0.6))), 4.9 - 1.2 * t)
    rig.part("head", g, HORN_DK, outline=0.4)
    rig.track("hornTip", "head", HORN_TIP)
    rig.joint("ears", "head", (32.0, 0, 56.0))
    g = Geo()
    for y in (-1, 1):
        g.blob((31.0, 9.0 * y, 59.0), (3.6, 1.8, 6.0), p=2.2, rot=(-22 * y, -30, 0), taper=(1.1, 0.35))
    rig.part("ears", g, FUR_DK, finish="hair")
    rig.joint("jaw", "head", (42, 0, 38))
    jaw = Geo().blob((48.0, 0, 35.6), (9.4, 8.0, 3.8), p=2.3)
    jface = F.Face(rig, "jaw", [jaw])
    rig.part("jaw", jaw, SKIN)
    jaw.bm.free()
    jface.mouths((53.0, 35.6), 6.0)
    # tail with a tuft
    rig.secondary("tail", "trunk", (-29, 0, 54), (-35, 0, 44), max_deg=20, gain=1.3)
    g = Geo().capsule((-29, 0, 54), (-33, 0, 48), 1.9, 1.5)
    g.blob((-34.0, 0, 45.0), (3.0, 2.6, 3.8), p=2.2)
    rig.part("tail", g, SHAG, finish="hair")
    rig.part("tail", Geo().blob((-34.6, -0.8, 42.4), (2.1, 1.9, 2.3), p=2.2), SHAG_LT, finish="hair", outline=0)
    _shag(rig)
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _shag(rig):
    """W1: the woolly coat in clumps and two tones where the blanket leaves it free (beasts: breakers in the fur at
    3-6 lu, fur in clumps): long locks down the front of the hump and round the haunch, and a ruff under the neck
    that swings a frame late (a secondary joint), the dark shag alternating with the frosted locks."""
    g, g2 = Geo(), Geo()
    for k, (x, y, z, tilt) in enumerate(((19.5, -12.6, 69.0, 16), (23.6, -12.2, 63.0, 12),
                                         (-26.6, -10.4, 54.0, -32), (-28.4, -9.6, 47.0, -28),
                                         (-28.6, -9.4, 40.0, -24))):
        W1.fur_lock(g if k % 2 else g2, (x, y, z), 10.0, tilt, r=2.8)
    # locks lying over the hump's near flank from under the crest (they break its big dome)
    for k, (x, y, z, L, tilt, dy) in enumerate(((10.2, -7.0, 73.6, 9.2, 4, -8.2), (16.0, -7.5, 73.0, 9.1, 9.5, -8.0),
                                                (21.8, -7.2, 70.4, 8.6, 14, -3.8))):
        W1.fur_lock(g2 if k % 2 == 0 else g, (x, y, z), L, tilt, r=2.7, dy=dy)
    rig.part("trunk", g, SHAG, finish="hair", outline=0.6)
    rig.part("trunk", g2, SHAG_LT, finish="hair", outline=0.6)
    rig.secondary("ruff", "neck", (27.0, 0, 42.0), (27.0, 0, 33.0), max_deg=8, gain=1.2)
    g, g2 = Geo(), Geo()
    for i, (x, z) in enumerate(((21.5, 44.0), (25.0, 41.0), (28.6, 39.6), (32.0, 40.0))):
        W1.fur_lock(g if i % 2 else g2, (x, -11.6, z), 9.0, 12 - 5 * i, r=2.7)
    rig.part("ruff", g, SHAG, finish="hair", outline=0.6)
    rig.part("ruff", g2, SHAG_LT, finish="hair", outline=0.6)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, beast): the team blanket tears (its free field between the pads)
    and a strip hangs from its hem; scuffs on the near shoulder and haunch below the blanket; a crack in the big
    horn; breath puffs from the nostril at the last stage. As the rest pose is drawn (the body x 1.12)."""
    rig.damage_spot_at("blanket", "trunk", -6.0, 47.0, 8.0, "hide", team=True)
    rig.damage_spot_at("shoulder", "leg_fr", 22.0, 30.0, 6.0, "hide")
    rig.damage_spot_at("haunch", "leg_br", -22.0, 30.0, 6.0, "hide")
    rig.damage_spot_at("horn", "head", 68.0, 54.0, 5.0, "stone", fill=HORN)
    rig.damage_spot_at("hem", "trunk", -10.0, 43.0, 10.0, "hide", kind="strip", team=True)
    rig.damage_spot("breath", "head", (63.0, -3.0, 44.0), 4.5, "breath", kind="emit", normal=(1, 0, 0))


CENTER = (0, 0, 48.0)
RIG = None
LEGS = None
SPEED = 62.5
GAIT = None


def _gait():
    global GAIT
    if GAIT is None:
        GAIT = G.Gait(8, 800, SPEED, G.quad_feet(LEGS, G.TROT, scale=BODY_SCALE,
                                                 x_off={"fr": 2.0, "fl": 2.0, "br": -1.0, "bl": -1.0}),
                      0.48, lift=8.5, kick=2.0, reach=2.5, toe_off=0.0, heel_strike=0.0)
    return GAIT


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    snort = [0.0, 0.0, 0.5, 1.0, 0.4, 0.0][f]
    pose = {
        "trunk": {"z": -1.4 * c, "r": 0.6 * c},
        "body": squash(-0.025 * c),
        "neck": {"r": 2.5 * lag - 8 * snort}, "head": {"r": -3.0 * lag - 6 * snort},
        "ears": {"r": [0, 12, -6, 0, 0, 0][f]},
        "leg_fr": {"r": -1.0 * c}, "leg_br": {"r": 1.0 * c},
        "tail": {"r": 8 * math.sin(2 * math.pi * f / n)},
    }
    if f == 5:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f, report=None):
    g = _gait()

    def extra(ctx):
        p = ctx["p"]
        return {"neck": {"r": -5.0 * math.cos(2 * p - 0.6)}, "head": {"r": 4.0 * math.cos(2 * p - 1.2)},
                "ears": {"r": 8 * math.cos(2 * p - 1.4)}}
    return G.quad_walk(RIG, f, g, {}, base_z=-3.8, bob=2.2, beats=2, pitch=2.0, roll=2.2,
                       extra=extra, report=report)


def _rh(x, z, q, r, n, h, j, fr, fl, br, bl, nrz=0.0, hrz=0.0, rz=0.0, ears=0.0):
    return merge(M.body_about(CENTER, x=x, z=z, q=q), {
        "trunk": {"r": r, "rz": rz},
        "neck": {"r": n, "rz": nrz}, "head": {"r": h, "rz": hrz}, "jaw": {"r": j},
        "leg_fr": {"r": fr[0]}, "leg_fr2": {"r": fr[1]},
        "leg_fl": {"r": fl[0]}, "leg_fl2": {"r": fl[1]},
        "leg_br": {"r": br[0]}, "leg_br2": {"r": br[1]},
        "leg_bl": {"r": bl[0]}, "leg_bl2": {"r": bl[1]},
        "ears": {"r": ears},
    })


# attack A: 10 unique poses in the 12 heavy steps
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10]   # W1 (B1'): 11 unique poses, same 12 steps
#        x     z     q      r    n    h    j   fr         fl         br        bl       nrz  hrz  rz  ears
A_TAB = [
    (-1.0, 0.0, -0.02, -2, -4, -2, 0, (-6, 4), (-4, 2), (2, 2), (2, 2), 0, 0, 0, 0),
    (-2.0, -1.0, -0.04, -4, -12, -8, -2, (-12, 6), (-6, 4), (6, 8), (4, 6), 14, 6, 4, -10),
    (-3.0, -2.5, -0.06, -6, -24, -16, -4, (-20, 10), (-8, 6), (10, 14), (8, 12), 16, 8, 8, -18),
    (-4.0, -4.0, -0.09, -8, -34, -26, -6, (-26, 14), (-10, 8), (14, 20), (12, 18), 22, 10, 10, -24),
    (0.0, -2.5, 0.0, -6, -20, -14, -8, (-18, 8), (-6, 4), (6, 10), (4, 8), 10, 4, 2, -24),
    # W1 (item 38 B1'): the sweep rises through the profile (5) to the contact at the impact step (6): the horn
    # thrust level at the foe's chest, the tip 9 lu past its idle reach (88 lu, at 42 lu; it used to be the toss,
    # the tip at 27 lu, high and behind the head), the body lunged onto the planted forelegs with a squash. The toss
    # follows (7), then the old settle (8-10). Step durations, the impact step and impactAt are unchanged.
    (3.0, -2.0, 0.02, -4, -10, -8, -10, (-14, 6), (-4, 3), (2, 6), (2, 6), -2, -1, -2, -24),
    (8.0, -1.5, -0.08, -3, -2, -10, -12, (-10, 2), (-2, 0), (-6, 4), (-4, 3), -8, -4, -4, -16),
    (5.0, 1.5, 0.07, 4, 16, 18, -14, (-4, 0), (2, 0), (-6, 4), (-4, 2), -44, -22, -10, -10),
    (4.0, 0.0, -0.06, 1, 8, 10, -6, (-2, 0), (0, 0), (-4, 2), (-2, 2), -24, -12, -6, 6),
    (2.0, 0.0, 0.02, 0, 2, 2, -2, (0, 0), (0, 0), (-2, 0), (-1, 0), -8, -4, -2, 0),
    (0.5, 0.0, 0.0, 0, 0, 0, 0, (0, 0), (0, 0), (0, 0), (0, 0), 0, 0, 0, 0),
]


def _attack_pose(f):
    x, z, q, r, n, h, j, fr, fl, br, bl, nrz, hrz, rz, ears = A_TAB[f]
    pose = _rh(x, z, q, r, n, h, j, fr, fl, br, bl, nrz, hrz, rz, ears)
    if f in (2, 3):
        pose = merge(pose, {"brow": {"z": -1.2}})
    return pose


def _sweep(t0=0.0, t1=0.9, lines=3, frm=None):
    s = {"kind": "arc", "joint": "head", "inner": (HORN_TIP[0] - 14, HORN_TIP[1], HORN_TIP[2] - 14),
         "outer": HORN_TIP, "color": HORN, "taper": 0.15, "t0": t0, "t1": t1, "lines": lines,
         "white": 0.35, "samples": 18}
    if frm is not None:
        s["from"] = frm
    return s


def _attack_clip():
    ov = {
        3: [{"kind": "dust", "joint": "head", "point": (58.0, 0.0, 38.0), "ground_snap": True,
             "size_lu": 6.0, "puffs": 3, "seed": 41, "spread": 0.8}],
        4: [_sweep(0.0, 0.9, 3, 3)],
        5: [_sweep(0.2, 0.95, 3, 4),
            {"kind": "dust", "ground": (34.0, 0.0), "size_lu": 9.0, "puffs": 5, "seed": 42, "spread": 1.2}],
        6: [{"kind": "burst", "joint": "head", "point": HORN_TIP, "r0_lu": 10.0, "r1_lu": 18.0, "n": 6,
             "a0": -20.0, "arc": 150.0},
            {"kind": "dust", "ground": (40.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 43, "spread": 1.4}],
        7: [_sweep(0.1, 0.85, 2, 6)],   # W1: the toss after the contact (the horn flung up toward the viewer)
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)


# attack B: double stomp. 0 = A, 1 shift back, 2 HOLD (forehand reared, both forelegs tucked high),
# 3 drop (smear), 4 IMPACT (both front feet slammed down, horn jabbing forward), 5 rebound,
# 6-7 = A settle
B_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 6, 6, 7, 7]


def _b_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 3)     # A's settle (W1: A has one more pose before it)
    tab = [
        (-2.0, 1.0, 0.02, 6, 6, 4, -2, (24, -40), (20, -36), (-4, 8), (-2, 6)),
        (-4.0, 5.0, 0.06, 16, 12, 8, -6, (56, -96), (50, -92), (-12, 16), (-10, 14)),
        (2.0, 2.0, 0.04, 6, -6, -4, -8, (30, -50), (26, -46), (-8, 10), (-6, 8)),
        (5.0, -3.0, -0.12, -4, -14, -10, -12, (4, 0), (2, 0), (-10, 6), (-8, 4)),
        (4.0, -1.0, 0.04, -1, -6, -4, -4, (2, 0), (0, 0), (-6, 4), (-4, 2)),
    ][i - 1]
    x, z, q, r, n, h, j, fr, fl, br, bl = tab
    return merge(_rh(x, z, q, r, n, h, j, fr, fl, br, bl, ears=-16 if i in (2, 3, 4) else 0),
                 {"brow": {"z": -1.2}} if i in (1, 2) else {})


def _attack_b():
    ov = {
        3: [{"kind": "streak", "joint": "leg_fr2", "point": (21.0, -10.0, 3.0), "color": FUR, "width_lu": 9.0,
             "white": 0.4, "from": 2}],
        4: [{"kind": "rings", "joint": "leg_fr2", "point": (21.0, -10.0, 2.0), "radii_lu": (12.0, 20.0),
             "a0": 15.0, "a1": 165.0, "color": "#E6D8BE"},
            {"kind": "dust", "ground": (24.0, 0.0), "size_lu": 12.0, "puffs": 6, "seed": 44, "spread": 1.6},
            {"kind": "burst", "joint": "head", "point": HORN_TIP, "r0_lu": 8.0, "r1_lu": 15.0, "n": 5,
             "a0": -40.0, "arc": 120.0}],
    }
    reuse = {0: ("attack", 0), 6: ("attack", 9), 7: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(8)], M.HEAVY_MELEE_MS, impact=4,
                  sequence=B_SEQ, overlays=ov, reuse=reuse)


# attack C: shoulder barge. 0 = A, 1 rump swings away (yaw), 2 HOLD (coiled, body turned away, low),
# 3 smear (the flank swings in), 4 IMPACT (side slam toward the viewer, squash), 5 follow, 6-7 = A
C_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 6, 6, 7, 7]


def _c_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 3)     # A's settle (W1: A has one more pose before it)
    tab = [  # x, z, q, r, n, h, rz (body yaw), nrz, legs
        (-2.0, -1.0, -0.03, -2, -6, -4, 18, -10, (-8, 8), (-6, 6), (10, 10), (8, 8)),
        (-4.0, -3.0, -0.07, -3, -10, -6, 30, -18, (-14, 14), (-10, 10), (18, 18), (14, 14)),
        (4.0, -1.0, 0.04, 2, -4, -2, -6, 6, (12, -10), (8, -8), (-10, 6), (-8, 4)),
        (8.0, -2.0, -0.12, 0, 2, 4, -28, 22, (18, -4), (14, -2), (-16, 6), (-12, 4)),
        (6.0, -0.5, 0.03, 0, 0, 2, -18, 14, (8, 0), (6, 0), (-8, 2), (-6, 2)),
    ][i - 1]
    x, z, q, r, n, h, rz, nrz, fr, fl, br, bl = tab
    return _rh(x, z, q, r, n, h, -6, fr, fl, br, bl, nrz=nrz, hrz=nrz * 0.5, rz=rz,
               ears=-14 if i in (2, 3, 4) else 0)


def _attack_c():
    ov = {
        3: [{"kind": "arc", "joint": "trunk", "inner": (6.0, -18.0, 44.0), "outer": (14.0, -20.0, 58.0),
             "color": FUR, "taper": 0.2, "t0": 0.0, "t1": 0.9, "lines": 3, "white": 0.35, "from": 2}],
        4: [{"kind": "burst", "joint": "trunk", "point": (16.0, -20.0, 50.0), "r0_lu": 10.0, "r1_lu": 18.0,
             "n": 6, "a0": -60.0, "arc": 140.0},
            {"kind": "dust", "ground": (20.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 45, "spread": 1.2}],
    }
    reuse = {0: ("attack", 0), 6: ("attack", 9), 7: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(8)], M.HEAVY_MELEE_MS, impact=4,
                  sequence=C_SEQ, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a, shake):
        return {"body": dict(squash(-0.06 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                "trunk": {"r": 5 * a},
                "neck": {"r": 10 * a}, "head": {"r": 6 * a + 8 * shake, "rx": 14 * shake},
                "jaw": {"r": -8 * max(a, 0)}, "ears": {"r": -26 * max(a, 0)},
                "leg_br": {"r": -12 * max(a, 0)}, "leg_bl": {"r": -10 * max(a, 0)},
                "leg_br2": {"r": 18 * max(a, 0)}, "leg_bl2": {"r": 16 * max(a, 0)},
                "leg_fr": {"r": -8 * a}, "leg_fl": {"r": -6 * a}}
    return M.hit_beast(k, {}, recoil, face_hurt=F.expr("squeeze"))


def _die_pose(k):
    kick = [0.0, 0.3, 0.7, 1.0, 0.6, 1.0, 0.4, 0.2, 0.1, 0.0][k]
    pose = merge(M.die_d4(k, center_z=48.0, back_z=36.0, height=HEIGHT_LU, heavy=True), {
        "neck": {"r": [10, 16, 12, 6, 2, 0, 0, 0, 0, 0][k]},
        "head": {"r": [8, -6, -10, -14, -12, -10, -8, -8, -8, -8][k]},
        "jaw": {"r": -14},
        "leg_fr": {"r": 30 * kick - 10}, "leg_fr2": {"r": -30 * kick},
        "leg_fl": {"r": -20 * kick + 10}, "leg_fl2": {"r": -20 * kick},
        "leg_br": {"r": -26 * kick}, "leg_br2": {"r": 26 * kick},
        "leg_bl": {"r": 20 * kick}, "leg_bl2": {"r": 20 * kick},
        "tail": {"r": 20 * kick}, "ears": {"r": -20},
        "pole": {"hide": k >= 3, "r": 25 * min(1.0, k)},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", mouth=None))
    elif k >= 3:
        pose = merge(pose, F.expr("x"), F.expr("tongue", mouth=None))
    return pose


def clips():
    keep = M.HEAVY_DIE_KEEP
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True,
               overlays={3: [{"kind": "dust", "joint": "head", "point": (59.0, -3.0, 39.0), "size_lu": 3.6,
                              "puffs": 3, "seed": 9, "color": STEAM, "spread": 0.6, "dir": 1.0}]}),
        M.walk_clip("walk", RIG, _walk, _gait(), "quad"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die_pose(keep[i]) for i in range(len(keep))], M.DIE_MS_HEAVY,
               sequence=M.DIE_SEQ_HEAVY, extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
